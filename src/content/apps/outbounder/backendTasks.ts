import type { Task } from '../../types'
import { code, eli5, keys, links, mistakes, p, prompt, steps, table, task, tip, warn } from './helpers'
import { promptShared } from './edgePrompts'

export const backendTasks: Task[] = [
  task({
    id: 'out-be-shared',
    title: 'Build the shared edge function helpers',
    outcome: 'One _shared folder with auth, zod validation, metering, rate limits, retries and the AgentMail client that every Outbounder function reuses.',
    minutes: 40,
    xp: 40,
    blocks: [
      eli5('Why shared helpers first?', 'Seven functions all need to check who is calling, refuse bad input, count what they spend and retry politely. Writing that once means one place to get right and one place to fix.'),
      prompt('out-be-shared-prompt', 'Build supabase/functions/_shared', promptShared),
      steps(
        'Paste the prompt into Claude Code. Read the plan, then say OK.',
        'When it finishes, ask: "Show me _shared/usage.ts and explain what happens if two workers call reserve() at the same time." The answer should mention the advisory lock in reserve_usage.',
        'Run `npx supabase functions serve` once to check everything compiles, then press Ctrl + C.',
      ),
      mistakes([
        { mistake: 'Claude Code hard-codes plan limits in usage.ts.', fix: 'Limits live in the plans table and reserve_usage() checks them. usage.ts only holds unit costs. Ask it to remove the numbers.' },
        { mistake: 'requireCron uses === to compare the secret.', fix: 'Ask for a constant-time compare (timingSafeEqual on equal-length byte arrays). It stops timing attacks on the cron secret.' },
        { mistake: 'The AgentMail client sends camelCase JSON.', fix: 'The REST API uses snake_case (display_name, event_types, track_opens). The camelCase names are only in the official SDK. Ask it to match the API reference.' },
      ]),
    ],
    checklist: [['Run the shared helpers prompt', 'copy:out-be-shared-prompt'], 'Ask Claude to explain the metering lock', 'Check the functions compile with supabase functions serve'],
  }),
  task({
    id: 'out-be-prospeo',
    title: 'Set up Prospeo for lead search',
    outcome: 'Outbounder can search B2B people and reveal verified work emails with your platform key.',
    minutes: 20,
    xp: 30,
    blocks: [
      eli5('What does Prospeo do here?', 'Prospeo is a giant phone book of business people. You ask "founders of 11-50 person agencies in the UK" and it gives back 25 people per page. Then you pay one credit per person to see their checked work email. No email found, no charge.'),
      table(['Plan (checked Oct 2026)', 'Price', 'Credits a month', 'Covers about'], [
        ['Free', '$0', '100', 'Testing only, no API on some plans [verify]'],
        ['Starter', '$49', '2,000', '5 Starter customers'],
        ['Growth', '$99', '5,000', '14 Starter customers'],
        ['Pro', '$249', '15,000', '40 Starter customers'],
      ]),
      steps(
        'Go to https://app.prospeo.io/signup and sign up with your work email. Confirm the email.',
        'Billing (left sidebar, or your avatar > Billing) > pick **Starter** for now. Upgrade when the dashboard shows credits running low. Credits reset each billing month and do not roll over.',
        'Left sidebar > **API** (or Settings > API key) [verify]. Click **Copy** next to your API key.',
        'Paste it into your password manager first, then run the secrets command below in a normal terminal.',
        'Add the same key to `.env.local` as `PROSPEO_API_KEY=` (the onboarding sample route uses it).',
        'Run the test call. It costs nothing.',
      ),
      keys([
        { name: 'PROSPEO_API_KEY', where: 'Prospeo dashboard > API > API key', pasteInto: 'Supabase secrets', secret: true },
        { name: 'PROSPEO_API_KEY', where: 'Same key, for the onboarding sample route', pasteInto: '.env.local', secret: true },
      ]),
      code('out-be-prospeo-secrets', 'Terminal (outside Claude Code)', 'bash', `npx supabase secrets set PROSPEO_API_KEY=paste_value_here`),
      code('out-be-prospeo-test', 'Terminal: free test call (account info)', 'bash', `
curl -s -X POST https://api.prospeo.io/account-information \\
  -H "X-KEY: $PROSPEO_API_KEY" -H "Content-Type: application/json"
# Good: JSON with "error": false and your remaining credits.
# Bad: "INVALID_API_KEY" means the key was copied with a space or from the wrong account.
# The endpoint name comes from the Prospeo docs list; if it 404s, open https://prospeo.io/api-docs and use the "account information" endpoint shown there.`),
      tip('Search costs almost nothing', 'A search page is 1 credit for up to 25 people. The money goes on reveals: 1 credit per verified email. Outbounder meters both into usage_ledger so you can see your real cost per customer.'),
      mistakes([
        { mistake: 'Leads come back with no email.', fix: 'Search results never include emails. find-leads must call bulk-enrich-person with only_verified_email: true for the people it keeps.' },
        { mistake: 'Credits vanish in the first week.', fix: 'Check `select kind, sum(quantity) from usage_ledger group by kind;`. If lead_found is far above leads inserted, refunds for unrevealed people are missing.' },
        { mistake: '429 errors during Monday mornings.', fix: 'The worker must back off on 429 (next_attempt_at) and run one job at a time. Do not raise the cron frequency to "catch up".' },
      ]),
      links([
        { label: 'Prospeo sign up', url: 'https://app.prospeo.io/signup' },
        { label: 'Search Person docs', url: 'https://prospeo.io/api-docs/search-person' },
        { label: 'Bulk Enrich Person docs', url: 'https://prospeo.io/api-docs/bulk-enrich-person' },
      ]),
    ],
    checklist: ['Create a Prospeo account on the Starter plan', 'Copy your Prospeo API key', ['Set the Prospeo Supabase secret', 'copy:out-be-prospeo-secrets'], ['Run the free account test call', 'copy:out-be-prospeo-test']],
  }),
  task({
    id: 'out-be-millionverifier',
    title: 'Set up MillionVerifier for email checks',
    outcome: 'Every email gets a second check before it can be queued, so bounces stay under 2%.',
    minutes: 15,
    xp: 25,
    blocks: [
      eli5('Why check twice?', 'Prospeo already checks emails, but addresses go stale every week as people change jobs. A bounce tells Gmail you send to random addresses. A second check costs a third of a cent and protects the domain.'),
      steps(
        'Go to https://app.millionverifier.com/signup and create an account. Confirm the email.',
        'Top menu > **Buy credits** > pick 10,000 (about $37 to $39 [verify], credits never expire). New accounts get a few free credits to test.',
        'Top menu > **API** > copy your **API key** [verify the menu name].',
        'Run the secrets command, then the test call.',
      ),
      keys([{ name: 'MILLIONVERIFIER_API_KEY', where: 'MillionVerifier > API > API key', pasteInto: 'Supabase secrets', secret: true }]),
      code('out-be-mv-secrets', 'Terminal (outside Claude Code)', 'bash', `npx supabase secrets set MILLIONVERIFIER_API_KEY=paste_value_here`),
      code('out-be-mv-test', 'Terminal: verify one address (uses 1 credit)', 'bash', `
curl -s "https://api.millionverifier.com/api/v3/?api=$MILLIONVERIFIER_API_KEY&email=support@stripe.com&timeout=10"
# Good: JSON with "result": "ok" (or "catch_all") and "credits": <remaining>.
# "error": "Invalid API key" means the key is wrong.`),
      mistakes([
        { mistake: 'Every lead is rejected.', fix: 'Many B2B domains are catch_all. v1 rejects them on purpose. If more than 40% of a campaign is catch_all, tell the user to narrow the ICP to companies with stricter mail servers, or add the "allow catch-all" setting in v2.' },
        { mistake: 'The API key shows up in Supabase logs.', fix: 'The key is in the URL. The function must log only the host. Search the logs for your key and rotate it in MillionVerifier if it appears.' },
        { mistake: 'Verification stops with "insufficient credits".', fix: 'Buy credits, then the leads go back to found with backoff and continue on their own within 10 minutes.' },
      ]),
      links([{ label: 'MillionVerifier', url: 'https://www.millionverifier.com' }, { label: 'API docs', url: 'https://developer.millionverifier.com' }]),
    ],
    checklist: ['Create a MillionVerifier account and buy 10,000 credits', ['Set the MillionVerifier secret', 'copy:out-be-mv-secrets'], ['Run the verify test call', 'copy:out-be-mv-test']],
  }),
  task({
    id: 'out-be-firecrawl',
    title: 'Set up Firecrawl for website scraping',
    outcome: 'Outbounder can read each lead\'s homepage and about page as clean text for Claude.',
    minutes: 15,
    xp: 25,
    blocks: [
      eli5('What does Firecrawl return?', 'You give it a web address. It opens the page like a browser would, throws away menus and cookie banners, and hands back the words as tidy text. Claude reads that text to find one real fact about the company.'),
      table(['Plan (checked Oct 2026)', 'Price', 'Credits', 'Notes'], [
        ['Free', '$0', '500 one-off [verify]', 'Enough to build and test'],
        ['Hobby', '$16/mo', '3,000 a month [verify: some pages say 5,000 on annual]', 'About 1,500 leads'],
        ['Standard', '$83/mo', '100,000 a month', 'About 50,000 leads, move here around 4 customers'],
      ]),
      steps(
        'Go to https://www.firecrawl.dev/signin and sign up with GitHub or Google.',
        'Dashboard > **API Keys** > copy the key that starts with `fc-`.',
        'Run the secrets command. Also add `FIRECRAWL_API_KEY=` to `.env.local` (the onboarding sample and free tool use it).',
        'Run the test call.',
      ),
      keys([
        { name: 'FIRECRAWL_API_KEY', where: 'Firecrawl dashboard > API Keys (fc-...)', pasteInto: 'Supabase secrets', secret: true },
        { name: 'FIRECRAWL_API_KEY', where: 'Same key, for the sample route and free tool', pasteInto: '.env.local', secret: true },
      ]),
      code('out-be-fc-secrets', 'Terminal (outside Claude Code)', 'bash', `npx supabase secrets set FIRECRAWL_API_KEY=paste_value_here`),
      code('out-be-fc-test', 'Terminal: scrape one page (1 credit)', 'bash', `
curl -s -X POST https://api.firecrawl.dev/v2/scrape \\
  -H "Authorization: Bearer $FIRECRAWL_API_KEY" -H "Content-Type: application/json" \\
  -d '{"url":"https://stripe.com/about","formats":["markdown"],"onlyMainContent":true}' | head -c 600
# Good: {"success":true,"data":{"markdown":"..."}}`),
      mistakes([
        { mistake: 'Some sites return almost no text.', fix: 'Heavy JavaScript sites need a longer wait. Keep timeout at 20000 and accept that a few leads go to needs_review with "no website text".' },
        { mistake: 'The same company is scraped 20 times in one campaign.', fix: 'The 30-day cache by company_domain is missing. Check `select company_domain, count(*) from leads group by 1 order by 2 desc limit 5;` and the enrich-leads cache step.' },
        { mistake: 'Credits run out mid-week on Hobby.', fix: 'Upgrade to Standard once you have 4 paying customers. The cost per lead drops by about 80%.' },
      ]),
      links([{ label: 'Firecrawl', url: 'https://www.firecrawl.dev' }, { label: 'Scrape docs', url: 'https://docs.firecrawl.dev' }]),
    ],
    checklist: ['Create a Firecrawl account', ['Set the Firecrawl secret', 'copy:out-be-fc-secrets'], ['Run the scrape test call', 'copy:out-be-fc-test']],
  }),
  task({
    id: 'out-be-anthropic',
    title: 'Set up the Claude API with a spend limit',
    outcome: 'Outbounder can write emails with claude-sonnet-5-5 and label replies with claude-haiku-5-5, and one bad loop cannot spend more than your monthly limit.',
    minutes: 15,
    xp: 25,
    blocks: [
      eli5('Two models, two jobs', 'Sonnet is the careful writer: it reads a website and writes a first line, about a cent per email. Haiku is the fast sorter: it reads a reply and says "interested" or "out of office", a fiftieth of a cent each. Using the cheap one for sorting keeps your margin.'),
      table(['Model', 'Job', 'Price per million tokens (checked Oct 2026)', 'Per item'], [
        ['claude-sonnet-5-5', 'Write subject, first line, email', '$2 in, $10 out, cache reads $0.20', 'about $0.008 per lead'],
        ['claude-haiku-5-5', 'Label replies', '$0.10 in, $0.50 out', 'about $0.0002 per reply'],
      ]),
      steps(
        'Go to https://platform.claude.com and sign up or log in.',
        'Settings > **Billing** > add a card and buy $20 of credits.',
        'Settings > **Limits** > set a monthly spend limit (start with $50). Claude stops instead of surprising you.',
        'Settings > **API keys** > **Create key**, name it `outbounder-prod`, copy it (starts with `sk-ant-`).',
        'Run the secrets command and add `ANTHROPIC_API_KEY=` to `.env.local`.',
        'Run the test call.',
      ),
      keys([
        { name: 'ANTHROPIC_API_KEY', where: 'platform.claude.com > Settings > API keys (sk-ant-...)', pasteInto: 'Supabase secrets', secret: true },
        { name: 'ANTHROPIC_API_KEY', where: 'Same key, for the sample route and free tool', pasteInto: '.env.local', secret: true },
      ]),
      code('out-be-claude-secrets', 'Terminal (outside Claude Code)', 'bash', `npx supabase secrets set ANTHROPIC_API_KEY=paste_value_here`),
      code('out-be-claude-test', 'Terminal: one tiny Haiku call', 'bash', `
curl -s https://api.anthropic.com/v1/messages \\
  -H "x-api-key: $ANTHROPIC_API_KEY" -H "anthropic-version: 2023-06-01" -H "content-type: application/json" \\
  -d '{"model":"claude-haiku-5-5","max_tokens":50,"messages":[{"role":"user","content":"Reply with the word OK"}]}'
# Good: "type":"message" with a text block containing OK and a "usage" object.`),
      mistakes([
        { mistake: '400 error mentioning thinking on the Sonnet call.', fix: 'Sonnet 5.5 rejects thinking type "disabled". Use thinking: { type: "between_tools" } with effort low, as the personalise prompt says.' },
        { mistake: 'cache_read_input_tokens is always 0.', fix: 'Something in the system prompt changes per call (a date, the lead name). Keep the system prompt fixed per user and put lead details in the user message.' },
        { mistake: 'Spend jumps overnight.', fix: 'Check `select kind, used, cost_usd from usage_this_month;` per user. reserve_usage must run before every call, including retries.' },
      ]),
      links([{ label: 'Claude Console', url: 'https://platform.claude.com' }, { label: 'Structured outputs docs', url: 'https://platform.claude.com/docs/en/build-with-claude/structured-outputs' }]),
    ],
    checklist: ['Add credits and set a monthly spend limit', 'Create an API key named outbounder-prod', ['Set the Anthropic secret', 'copy:out-be-claude-secrets'], ['Run the Haiku test call', 'copy:out-be-claude-test']],
  }),
  task({
    id: 'out-be-agentmail',
    title: 'Set up AgentMail for inboxes, sending and replies',
    outcome: 'Outbounder can create a private pod per user, add outreach domains with DNS records, create inboxes, send and receive replies through one signed webhook.',
    minutes: 35,
    xp: 50,
    blocks: [
      eli5('What is a pod?', 'AgentMail is a building full of mailboxes. A pod is one locked floor of that building. Each Outbounder user gets their own floor, so their domains and inboxes can never get mixed up with someone else\'s.'),
      table(['AgentMail plan (checked Oct 2026)', 'Price', 'Inboxes', 'Emails a month', 'Custom domains'], [
        ['Free', '$0', '3', '3,000 (100 a day)', 'No'],
        ['Developer', '$20/mo', '10', '10,000', '10'],
        ['Startup', '$200/mo', '150', '150,000', '150'],
        ['Enterprise', 'Custom', 'Unlimited', 'Custom', 'Custom, dedicated IPs'],
      ]),
      p('Start on **Developer** (you need custom domains from day one). Move to **Startup** around your 3rd customer, and talk to AgentMail about Enterprise pricing before 35 customers. Extra inbox and domain add-ons are reported at about $2 each [verify].'),
      warn('Check the acceptable use policy first', 'Before you launch, email AgentMail support from the console: "I am building a B2B outreach tool: low volume (20 to 30 a day per inbox), verified recipients, unsubscribe link and List-Unsubscribe header on every email, separate domains per customer. Is that allowed on the Startup plan?" Keep their written answer. If the answer is no, the provider sits behind _shared/agentmail.ts, so you swap one file.'),
      steps(
        'Go to https://console.agentmail.to and sign up.',
        'Billing > choose **Developer** ($20/mo).',
        'Left sidebar > **API Keys** > **Create API key**, name `outbounder-prod`, organisation scope (it must create pods). Copy it.',
        'Run the secrets command, then the first test call (lists pods, empty for now).',
        'After the agentmail-webhook function is deployed (Backend phase), run the webhook curl below once. Copy the `secret` from the response (starts with `whsec_`) and set it as `AGENTMAIL_WEBHOOK_SECRET`.',
        'Console > Webhooks: check the webhook shows your URL and the 5 event types.',
      ),
      keys([
        { name: 'AGENTMAIL_API_KEY', where: 'console.agentmail.to > API Keys > Create API key', pasteInto: 'Supabase secrets', secret: true },
        { name: 'AGENTMAIL_WEBHOOK_SECRET', where: 'The "secret" field returned when you create the webhook (whsec_...)', pasteInto: 'Supabase secrets', secret: true },
      ]),
      code('out-be-am-secrets', 'Terminal (outside Claude Code)', 'bash', `npx supabase secrets set AGENTMAIL_API_KEY=paste_value_here`),
      code('out-be-am-test', 'Terminal: list pods (free)', 'bash', `
curl -s https://api.agentmail.to/v0/pods -H "Authorization: Bearer $AGENTMAIL_API_KEY"
# Good: {"count":0,"pods":[]} or a list. 401 means the key is wrong.`),
      code('out-be-am-webhook', 'Terminal: create the one webhook (after deploying agentmail-webhook)', 'bash', `
curl -s -X POST https://api.agentmail.to/v0/webhooks \\
  -H "Authorization: Bearer $AGENTMAIL_API_KEY" -H "Content-Type: application/json" \\
  -d '{"url":"https://YOUR_REF.supabase.co/functions/v1/agentmail-webhook","event_types":["message.received","message.bounced","message.complained","message.rejected","message.delivered"],"client_id":"outbounder-prod"}'
# The response includes "webhook_id" and "secret". Then:
npx supabase secrets set AGENTMAIL_WEBHOOK_SECRET=whsec_paste_value_here`),
      mistakes([
        { mistake: 'Inbox creation fails with "domain not verified".', fix: 'Inboxes can only be created on a VERIFIED domain. Run verify in the domain wizard until every record is VALID.' },
        { mistake: 'Webhook calls return 400 in the function logs.', fix: 'The signing secret is wrong or the function parsed JSON before verifying. Set the secret from the create response again and make sure the function reads req.text() first.' },
        { mistake: 'Two webhooks exist and every reply is processed twice.', fix: 'The client_id makes creation idempotent, but a webhook made in the console has none. Delete the extra one in Console > Webhooks. webhook_events also stops double processing.' },
      ]),
      links([
        { label: 'AgentMail console', url: 'https://console.agentmail.to' },
        { label: 'AgentMail docs', url: 'https://docs.agentmail.to' },
        { label: 'Multi-tenancy guide (pods)', url: 'https://docs.agentmail.to/multi-tenancy' },
      ]),
    ],
    checklist: ['Create an AgentMail account on Developer', 'Create an organisation API key', ['Set the AgentMail API key secret', 'copy:out-be-am-secrets'], ['Run the list pods test', 'copy:out-be-am-test'], ['Create the webhook and set its secret', 'copy:out-be-am-webhook'], 'Email AgentMail support about outreach use'],
  }),
  task({
    id: 'out-be-stripe-plans',
    title: 'Create the Starter and Growth prices in Stripe',
    outcome: 'Four prices (Starter and Growth, monthly and annual) with a 7-day trial, plan switching in the portal, and the webhook writing the plan to subscriptions.',
    minutes: 30,
    xp: 40,
    blocks: [
      p('The shared Stripe tasks build checkout with one `STRIPE_PRICE_ID`. Outbounder has two plans and annual billing, so you add three more prices and teach the routes to pick the right one.'),
      table(['Product', 'Price', 'Billing', 'Metadata'], [
        ['Outbounder Starter', '$79', 'Monthly', 'plan = starter, interval = month'],
        ['Outbounder Starter', '$790', 'Yearly', 'plan = starter, interval = year'],
        ['Outbounder Growth', '$179', 'Monthly', 'plan = growth, interval = month'],
        ['Outbounder Growth', '$1,790', 'Yearly', 'plan = growth, interval = year'],
      ]),
      steps(
        'Stripe Dashboard (test mode on) > **Product catalogue** > **+ Add product**. Name "Outbounder Starter". Pricing: Recurring, $79.00, Monthly. Click **Add product**.',
        'On the product page > **+ Add another price** > $790.00, Yearly > Save.',
        'Repeat for "Outbounder Growth" with $179 monthly and $1,790 yearly.',
        'Click each price > **Edit metadata** > add `plan` and `interval` as in the table.',
        'Copy the four `price_...` ids into `.env.local` and Vercel env with the names below. Set `STRIPE_PRICE_ID` to the Starter monthly id so the shared steps still work.',
        'Settings > **Billing** > **Customer portal** > Subscriptions > turn on **Customers can switch plans** and add both products and all four prices. Save.',
        'Paste the prompt below into Claude Code.',
      ),
      keys([
        { name: 'STRIPE_PRICE_STARTER_MONTHLY', where: 'Stripe > Product catalogue > Outbounder Starter > $79 price id', pasteInto: '.env.local', secret: false },
        { name: 'STRIPE_PRICE_STARTER_ANNUAL', where: 'Stripe > Outbounder Starter > $790 price id', pasteInto: '.env.local', secret: false },
        { name: 'STRIPE_PRICE_GROWTH_MONTHLY', where: 'Stripe > Outbounder Growth > $179 price id', pasteInto: '.env.local', secret: false },
        { name: 'STRIPE_PRICE_GROWTH_ANNUAL', where: 'Stripe > Outbounder Growth > $1,790 price id', pasteInto: '.env.local', secret: false },
        { name: 'STRIPE_PRICE_STARTER_MONTHLY (and the other 3)', where: 'Same values, after deploying', pasteInto: 'Vercel env', secret: false },
      ]),
      code('out-be-stripe-env', '.env.local (add these lines)', 'env', `
STRIPE_PRICE_STARTER_MONTHLY=price_
STRIPE_PRICE_STARTER_ANNUAL=price_
STRIPE_PRICE_GROWTH_MONTHLY=price_
STRIPE_PRICE_GROWTH_ANNUAL=price_`),
      prompt('out-be-stripe-prompt', 'Wire two plans and annual billing', `
Read @PRD.md sections 7.4, 15 and 23. Update the Stripe code:
1. lib/plans.ts: map the 4 env price ids to { plan: 'starter' | 'growth', interval: 'month' | 'year' } and back.
2. /api/stripe/checkout: zod body { plan, interval }, look up the price id, keep subscription_data.trial_period_days 7, client_reference_id from getClaims(). Reject anything not in the map.
3. Stripe webhook: on customer.subscription.created/updated/deleted, read the first item's price id, map it with lib/plans.ts (fall back to price metadata), and upsert subscriptions.plan and billing_interval with status, trial_end, current_period_end. Keep the raw-body signature check and stripe_events idempotency exactly as they are.
4. On a plan change from starter to growth, insert an events row 'plan_upgraded' and fire the PostHog event.
5. /pricing and the onboarding plan picker pass plan and interval.
Then show me how to test an upgrade with the Stripe CLI.`),
      code('out-be-stripe-sql', 'Supabase SQL Editor: check the plan landed', 'sql', `
select status, plan, billing_interval, price_id, trial_end from public.subscriptions;
select * from public.plan_limits((select user_id from public.subscriptions limit 1));`),
      mistakes([
        { mistake: 'Every user shows plan = starter even on Growth.', fix: 'The webhook is not mapping the price id. Log the price id it receives and compare it with the four env values in Vercel (they must be set for Production and Preview).' },
        { mistake: 'Annual customers get trial limits forever.', fix: 'current_plan() returns trial only while status is trialing. Check the status column; if it is stuck on trialing, the subscription.updated event is not handled.' },
        { mistake: 'The portal does not offer an upgrade.', fix: 'Plan switching is off or the Growth prices were not added to the portal configuration. Settings > Billing > Customer portal.' },
      ]),
    ],
    checklist: ['Create the four prices with metadata', ['Add the four price ids to .env.local', 'copy:out-be-stripe-env'], 'Turn on plan switching in the Customer portal', ['Run the two-plan wiring prompt', 'copy:out-be-stripe-prompt'], ['Check the plan in the database', 'copy:out-be-stripe-sql']],
  }),
  task({
    id: 'out-be-cron',
    title: 'Turn on the pipeline schedules',
    outcome: 'pg_cron calls find-leads every minute, the three pipeline stages every 2 minutes and send-due-emails every 5 minutes, all with the cron secret from Vault.',
    minutes: 15,
    xp: 30,
    blocks: [
      eli5('The alarm clocks', 'pg_cron is a set of alarm clocks inside your database. Each one rings on a schedule and pokes one edge function with a secret password. The function wakes up, does a small batch of work, and goes back to sleep.'),
      warn('Do this after deploying all seven functions', 'If a schedule calls a function that does not exist yet, you get a 404 every minute in the logs. Harmless, but noisy.'),
      steps(
        'Make a 32+ character random secret: run `openssl rand -base64 32` in a terminal. Copy it.',
        'Set it as an edge function secret with the first command below.',
        'Supabase > **SQL Editor** > New query. Paste the SQL block, replace YOUR_REF and PASTE_CRON_SECRET, click **Run**.',
        'Wait 3 minutes, then run the check query at the bottom of the block.',
      ),
      code('out-be-cron-secret', 'Terminal (outside Claude Code)', 'bash', `
npx supabase secrets set CRON_SECRET=paste_value_here
npx supabase secrets set APP_URL=http://localhost:3000 FOUNDER_EMAIL=you@yourdomain.com`),
      code('out-be-cron-sql', 'Supabase SQL Editor: vault secrets and schedules', 'sql', `
-- 1. The two secrets invoke_edge() reads (same value as the CRON_SECRET edge secret)
select vault.create_secret('https://YOUR_REF.supabase.co', 'project_url');
select vault.create_secret('PASTE_CRON_SECRET', 'cron_secret');

-- 2. Six schedules
select cron.schedule('ob-find-leads',      '* * * * *',   $$ select public.invoke_edge('find-leads') $$);
select cron.schedule('ob-verify-emails',   '*/2 * * * *', $$ select public.invoke_edge('verify-emails') $$);
select cron.schedule('ob-enrich-leads',    '*/2 * * * *', $$ select public.invoke_edge('enrich-leads') $$);
select cron.schedule('ob-personalise',     '*/2 * * * *', $$ select public.invoke_edge('personalise') $$);
select cron.schedule('ob-send-due-emails', '*/5 * * * *', $$ select public.invoke_edge('send-due-emails') $$);
select cron.schedule('ob-cleanup',         '17 3 * * *',  $$
  delete from public.webhook_events where received_at < now() - interval '30 days';
  delete from public.events where type like 'rl:%' and created_at < now() - interval '2 days';
$$);

-- 3. Check (after 3 minutes)
select jobname, schedule, active from cron.job order by jobname;
select status, return_message, start_time from cron.job_run_details order by start_time desc limit 10;
select status_code, left(content::text, 120) from net._http_response order by created desc limit 10;`),
      mistakes([
        { mistake: 'net._http_response shows 401 for every call.', fix: 'The Vault cron_secret and the CRON_SECRET edge secret differ. Update the Vault one with `select vault.update_secret((select id from vault.secrets where name = \'cron_secret\'), \'NEW_VALUE\');`.' },
        { mistake: 'cron.job_run_details says "function public.invoke_edge does not exist".', fix: 'The migration did not finish. Rerun only section 20 of the migration (the invoke_edge function).' },
        { mistake: 'You need to stop everything fast.', fix: 'Run `select cron.unschedule(\'ob-send-due-emails\');` to stop sending at once. Schedule it again with the same line when fixed.' },
      ]),
    ],
    checklist: [['Set CRON_SECRET, APP_URL and FOUNDER_EMAIL', 'copy:out-be-cron-secret'], ['Run the vault and schedule SQL', 'copy:out-be-cron-sql'], 'See status 200 rows in net._http_response'],
  }),
  task({
    id: 'out-be-e2e',
    title: 'End-to-end test: from ICP to a labelled reply',
    outcome: 'Proof that the whole pipeline works with real APIs: leads found, verified, scraped, written, approved, sent from your outreach inbox, replied to, labelled and alerted.',
    minutes: 60,
    xp: 70,
    blocks: [
      p('Do this once on your deployed app (Vercel URL) with test-mode Stripe. Use your own second email addresses as the "leads" you send to, so you never cold email strangers while testing.'),
      steps(
        'Sign up with a fresh account, finish the ICP wizard and start a Starter trial with card 4242 4242 4242 4242.',
        'Set up one outreach domain and 2 inboxes in the domain wizard. Wait for VERIFIED.',
        'Create a campaign and click Find 25 leads. Watch the job finish (2 to 5 minutes). Do NOT launch this campaign to real people yet.',
        'Create a second campaign "E2E test". Upload a CSV with 10 rows you own: your Outlook.com address plus 9 Gmail plus-addresses (yourname+t1@gmail.com to yourname+t9@gmail.com all land in your Gmail). Give each row a real company domain of your choice so Firecrawl has something to read.',
        'Wait for the rows to reach ready. Read the first lines. Approve all 10 (launch needs at least 10 approved).',
        'Set the campaign send window to the next hour in your time zone, every day. Launch.',
        'Within the window, check both mailboxes. Gmail: primary tab? Plain text? "Unsubscribe" link next to the sender name?',
        'Reply to the +t1 email from Gmail with "Sounds interesting, what does it cost?". From Outlook reply "please remove me".',
        'Within 2 minutes: Interested label and a Resend alert for the Gmail reply; Unsubscribe label and a suppression row for Outlook.',
        'Run every SQL check below and compare with the expected results.',
      ),
      code('out-be-e2e-sql', 'Supabase SQL Editor: end-to-end checks', 'sql', `
-- 1. Pipeline: expect no rows stuck in verifying/enriching/personalising
select status, count(*) from public.leads group by status order by 1;
-- 2. Sends: expect 'sent' or 'delivered' for step 1 everywhere, 'cancelled' for step 2 of the two leads that replied
select l.email, m.step_number, m.status from public.messages m join public.leads l on l.id = m.lead_id
where m.direction = 'outbound' and l.source = 'csv' order by l.email, m.step_number;
-- 3. Replies: expect interested and unsubscribe
select from_email, classification, classification_confidence from public.messages where direction = 'inbound';
-- 4. Suppression: expect the Outlook address
select email, reason, source from public.suppression_list;
-- 5. Metering: every paid call has a ledger line, cost in dollars
select kind, used, cost_usd from public.usage_this_month;
-- 6. App emails: expect welcome, domain verified, interested reply
select kind, status, created_at from public.email_log order by created_at;
-- 7. Webhooks: one row per AgentMail event, no duplicates
select type, count(*) from public.webhook_events group by type;`),
      mistakes([
        { mistake: 'The test email lands in Gmail spam.', fix: 'Open the email > three dots > Show original. SPF, DKIM and DMARC must all say PASS. If DKIM fails, a DNS record is wrong; recheck it in the domain wizard.' },
        { mistake: 'No reply ever shows up.', fix: 'Check Supabase > Edge Functions > agentmail-webhook > Logs. Nothing there means the webhook URL is wrong in AgentMail. 400 means the signing secret is wrong.' },
        { mistake: 'Step 2 still sent after the reply.', fix: 'The webhook did not match the reply to the thread. Compare agentmail_thread_id on the outbound row with the inbound row; send-due-emails must store the thread id from the send response.' },
      ]),
    ],
    checklist: ['Run a full campaign to your own two addresses', 'Reply from both addresses', 'Get the interested alert email', ['Run all seven SQL checks', 'copy:out-be-e2e-sql'], 'Confirm SPF, DKIM and DMARC pass in Gmail'],
  }),
]
