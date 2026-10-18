// Helpdeck backend tasks: one account-setup task per service, the app secrets, cron, plans and an end-to-end test.
import type { Task } from '../../types'
import { code, eli5, keys, links, mistakes, p, prompt, steps, task, tip, warn } from './helpers'

export const backendTasks: Task[] = [
  task({
    id: 'hd-be-firecrawl',
    title: 'Set up Firecrawl (crawling and webhooks)',
    outcome: 'Your app can turn any website into clean markdown pages, and Firecrawl can call you back for every page.',
    minutes: 20,
    xp: 35,
    blocks: [
      eli5('What Firecrawl does', 'Firecrawl is a robot reader. You give it a website address, it visits every page, throws away menus and cookie banners, and hands back the words as tidy text. Each page costs one credit. Instead of making you wait, it phones your app (a webhook) as each page is ready.'),
      steps(
        'Go to firecrawl.dev → Sign up (Google or email).',
        'You land on the dashboard. Left menu → API Keys → copy the key. It starts with `fc-`.',
        'Supabase → Edge Functions → Secrets → Add new secret → name `FIRECRAWL_API_KEY`, paste, Save.',
        'Paste it into `.env.local` too as `FIRECRAWL_API_KEY=` so the curl test below and local scripts work.',
        'Back in Firecrawl: Settings → Advanced → Webhook secret → copy it (create one if the box is empty). [verify the exact menu name]',
        'Supabase → Edge Functions → Secrets → add `FIRECRAWL_WEBHOOK_SECRET` with that value.',
      ),
      keys([
        { name: 'FIRECRAWL_API_KEY', where: 'firecrawl.dev → Dashboard → API Keys (fc-...)', pasteInto: 'Supabase secrets', secret: true },
        { name: 'FIRECRAWL_WEBHOOK_SECRET', where: 'firecrawl.dev → Settings → Advanced → Webhook secret [verify]', pasteInto: 'Supabase secrets', secret: true },
      ]),
      code('hd-be-firecrawl-curl', 'test-crawl.sh', 'bash', `
curl -X POST https://api.firecrawl.dev/v2/crawl \\
  -H "Authorization: Bearer fc-YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"url": "https://docs.firecrawl.dev", "limit": 5, "scrapeOptions": {"formats": ["markdown"], "onlyMainContent": true}}'
`),
      p('A good response is `{"success": true, "id": "...", "url": "https://api.firecrawl.dev/v2/crawl/..."}`. Open that url with the same Authorization header after 30 seconds and you will see `"status": "completed"` and 5 pages of markdown in `data`.'),
      code('hd-be-firecrawl-status', 'check-crawl.sh', 'bash', `
curl -s https://api.firecrawl.dev/v2/crawl/PASTE_THE_ID \\
  -H "Authorization: Bearer fc-YOUR_KEY" | head -c 600
`),
      tip('Credits', 'Free credits are a one-time allowance (about 500 [verify]). Building and testing Helpdeck uses about 200. Move to Hobby or Standard before your first paying customer (see the Costs tab).'),
      mistakes([
        { mistake: '402 Payment Required.', fix: 'Your free credits are used up. Dashboard → Billing → pick the Hobby plan.' },
        { mistake: '401 Unauthorized.', fix: 'The key was pasted with a space or a missing `fc-` prefix. Copy it again from API Keys.' },
        { mistake: 'Status stays "scraping" for minutes.', fix: 'Big sites take time, and some block crawlers. Test with a small docs site first (10 to 30 pages).' },
      ]),
      links([
        { label: 'Firecrawl dashboard', url: 'https://www.firecrawl.dev/app' },
        { label: 'Crawl docs (v2)', url: 'https://docs.firecrawl.dev/features/crawl' },
        { label: 'Firecrawl pricing', url: 'https://www.firecrawl.dev/pricing' },
      ]),
    ],
    checklist: [
      'Sign up for Firecrawl and copy the fc- key',
      'Add FIRECRAWL_API_KEY to Supabase secrets and .env.local',
      ['Copy the test crawl and run it', 'copy:hd-be-firecrawl-curl'],
      'Add FIRECRAWL_WEBHOOK_SECRET to Supabase secrets',
    ],
  }),
  task({
    id: 'hd-be-voyage',
    title: 'Set up Voyage AI embeddings',
    outcome: 'Your app can turn text into vectors that pgvector can search.',
    minutes: 15,
    xp: 30,
    blocks: [
      eli5('What an embedding is', 'An embedding turns a sentence into a long list of numbers. Sentences that mean similar things get similar numbers. So "How do I get a refund?" lands right next to your "Refunds" docs page, even if the words differ.'),
      steps(
        'Go to dashboard.voyageai.com → Sign up. (Voyage is now part of MongoDB, so you may be sent to a MongoDB sign-in. Use it, the key works the same.) [verify]',
        'Left menu → API Keys → Create new secret key → name "helpdeck" → copy it. It starts with `pa-`.',
        'Left menu → Billing → add a card. The first 200 million tokens of voyage-3.5 are still free, the card lifts the low starter rate limits.',
        'Supabase → Edge Functions → Secrets → add `VOYAGE_API_KEY`. Also add it to `.env.local`.',
      ),
      code('hd-be-voyage-curl', 'test-embed.sh', 'bash', `
curl -X POST https://api.voyageai.com/v1/embeddings \\
  -H "Authorization: Bearer pa-YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"model": "voyage-3.5", "input": ["How do I export my invoices?"], "input_type": "query", "output_dimension": 1024}'
`),
      p('A good response has `"object": "list"`, one item in `data` with an `embedding` array of 1024 numbers, and `usage.total_tokens` around 8.'),
      warn('Keep the number 1024 everywhere', 'The chunks table uses vector(1024). If you ever change output_dimension, every chunk must be re-embedded and the column changed. Pick 1024 and never touch it.'),
      mistakes([
        { mistake: '429 Too Many Requests on the first big crawl.', fix: 'Accounts without a card have very low limits. Add a card in Billing; the worker backs off and retries meanwhile.' },
        { mistake: 'The embedding has 2048 numbers.', fix: 'output_dimension is missing, so the default size came back. Always send "output_dimension": 1024.' },
        { mistake: '401 with a brand new key.', fix: 'Voyage keys start with pa-. If yours does not, you copied the key id, not the secret. Create a new key.' },
      ]),
      links([
        { label: 'Voyage dashboard', url: 'https://dashboard.voyageai.com' },
        { label: 'Embeddings API', url: 'https://docs.voyageai.com/reference/embeddings-api' },
        { label: 'Voyage pricing', url: 'https://docs.voyageai.com/docs/pricing' },
      ]),
    ],
    checklist: [
      'Create a Voyage key and add a card',
      'Add VOYAGE_API_KEY to Supabase secrets and .env.local',
      ['Copy the test embed and run it', 'copy:hd-be-voyage-curl'],
    ],
  }),
  task({
    id: 'hd-be-claude',
    title: 'Set up the Claude API',
    outcome: 'Your app can write answers with claude-haiku-5-5 and get back strict JSON every time.',
    minutes: 15,
    xp: 30,
    blocks: [
      steps(
        'Go to platform.claude.com → sign up with your email.',
        'Settings → Billing → add $5 of credit. At Haiku prices that covers about 7,000 answers.',
        'Settings → Limits → set a monthly spend limit of $50 so a bug can never run up a big bill.',
        'Settings → API keys → Create key → name "helpdeck-prod" → copy it now (starts with `sk-ant-`). You only see it once.',
        'Supabase → Edge Functions → Secrets → add `ANTHROPIC_API_KEY`. Also add it to `.env.local`.',
      ),
      code('hd-be-claude-curl', 'test-claude.sh', 'bash', `
curl https://api.anthropic.com/v1/messages \\
  -H "x-api-key: sk-ant-YOUR_KEY" \\
  -H "anthropic-version: 2023-06-01" \\
  -H "content-type: application/json" \\
  -d '{"model": "claude-haiku-5-5", "max_tokens": 200, "messages": [{"role": "user", "content": "Say hello in five words."}]}'
`),
      p('A good response has `"type": "message"`, a `content` array with a text block, and `"stop_reason": "end_turn"`.'),
      p('Now check structured output, the feature hd-answer relies on. The reply text must be valid JSON that matches the schema.'),
      code('hd-be-claude-json', 'test-claude-json.sh', 'bash', `
curl https://api.anthropic.com/v1/messages \\
  -H "x-api-key: sk-ant-YOUR_KEY" \\
  -H "anthropic-version: 2023-06-01" \\
  -H "content-type: application/json" \\
  -d '{"model": "claude-haiku-5-5", "max_tokens": 300,
       "output_config": {"effort": "low", "format": {"type": "json_schema", "schema": {"type": "object", "additionalProperties": false, "required": ["answer", "confident"], "properties": {"answer": {"type": "string"}, "confident": {"type": "boolean"}}}}},
       "messages": [{"role": "user", "content": "<docs></docs><question>What is your refund policy?</question> Answer only from docs."}]}'
`),
      p('A good response has one text block whose text is JSON like `{"answer": "I am not sure...", "confident": false}`.'),
      mistakes([
        { mistake: '400 "output_format is deprecated" or unknown parameter.', fix: 'Use output_config.format, not output_format. Check the request matches the curl above.' },
        { mistake: '400 credit balance too low.', fix: 'Settings → Billing → add credit. New accounts start at $0.' },
        { mistake: 'The JSON has extra fields or is wrapped in ```json.', fix: 'The format block is missing, so Claude answered in free text. Send output_config.format with the schema every time.' },
      ]),
      links([
        { label: 'Claude Console', url: 'https://platform.claude.com' },
        { label: 'Claude API docs', url: 'https://platform.claude.com/docs' },
        { label: 'Structured outputs', url: 'https://platform.claude.com/docs/en/build-with-claude/structured-outputs' },
      ]),
    ],
    checklist: [
      'Create a Claude API key and add $5 credit',
      'Add ANTHROPIC_API_KEY to Supabase secrets and .env.local',
      ['Copy the test call and run it', 'copy:hd-be-claude-curl'],
      ['Run the structured output test', 'copy:hd-be-claude-json'],
    ],
  }),
  task({
    id: 'hd-be-resend-webhook',
    title: 'Set up Resend for handoffs and the bounce webhook',
    outcome: 'Handoff emails come from your domain with reply-to set to the visitor, and bounced addresses are blocked automatically.',
    minutes: 20,
    xp: 30,
    blocks: [
      eli5('Why track bounces?', 'If an owner types their handoff email wrong, every customer question vanishes into a dead inbox. Resend tells us when an email bounces. We stop sending to that address and show the owner a red banner, so no question is lost quietly.'),
      p('The shared Resend task already verified your domain and created `RESEND_API_KEY`. This adds the sender name and the webhook.'),
      steps(
        'Supabase → Edge Functions → Secrets → add `EMAIL_FROM` = `Helpdeck <hello@yourdomain.com>` (the domain you verified in Resend).',
        'Deploy hd-resend-webhook first (its task is in this phase), then come back.',
        'resend.com → Webhooks → Add webhook → Endpoint URL `https://<ref>.supabase.co/functions/v1/hd-resend-webhook` → events `email.delivered`, `email.bounced`, `email.complained` → Add.',
        'Open the new webhook → copy the Signing secret (starts with `whsec_`).',
        'Supabase → Edge Functions → Secrets → add `RESEND_WEBHOOK_SECRET`.',
        'In Resend, click "Send test event". Then run the SQL below and see the event id.',
      ),
      keys([
        { name: 'EMAIL_FROM', where: 'Your verified Resend domain, e.g. Helpdeck <hello@yourdomain.com>', pasteInto: 'Supabase secrets', secret: false },
        { name: 'RESEND_WEBHOOK_SECRET', where: 'resend.com → Webhooks → your endpoint → Signing secret (whsec_...)', pasteInto: 'Supabase secrets', secret: true },
      ]),
      code('hd-be-resend-webhook-sql', 'Supabase SQL Editor', 'sql', `
select provider, event_id, received_at from public.webhook_events order by received_at desc limit 5;
select kind, to_email, status, created_at from public.email_log order by created_at desc limit 5;
`),
      mistakes([
        { mistake: 'Handoff emails land in spam.', fix: 'The from address is not on your verified domain. EMAIL_FROM must use exactly the domain Resend shows as Verified.' },
        { mistake: 'The test event returns 401.', fix: 'RESEND_WEBHOOK_SECRET is missing or from another endpoint. Copy the signing secret of this endpoint again.' },
        { mistake: 'Replies go to hello@ instead of the visitor.', fix: 'reply_to was not sent. Ask Claude Code to pass reply_to: visitor email in hd-handoff\'s Resend call.' },
      ]),
    ],
    checklist: [
      'Add EMAIL_FROM to Supabase secrets',
      'Create the Resend webhook for delivered, bounced and complained',
      'Add RESEND_WEBHOOK_SECRET to Supabase secrets',
      ['See the test event in webhook_events', 'copy:hd-be-resend-webhook-sql'],
    ],
  }),
  task({
    id: 'hd-be-secrets',
    title: 'Create the Helpdeck app secrets',
    outcome: 'The widget token, IP hashing and cron calls all have strong secrets, set in the right places.',
    minutes: 10,
    xp: 20,
    blocks: [
      eli5('What these four secrets do', 'They are long random passwords only your servers know. One signs the tickets the chat widget uses. One scrambles visitor IP addresses so you never store the real ones. One proves a timer call really came from your database.'),
      code('hd-be-secrets-gen', 'Terminal (outside Claude Code)', 'bash', `
openssl rand -hex 32   # WIDGET_TOKEN_SECRET
openssl rand -hex 32   # IP_HASH_SALT
openssl rand -hex 32   # CRON_SECRET
`),
      steps(
        'Run the three lines. Each prints a 64-character value. Keep the terminal open.',
        'Supabase → Edge Functions → Secrets → add `WIDGET_TOKEN_SECRET`, `IP_HASH_SALT`, `CRON_SECRET`, plus `APP_URL` (http://localhost:3000 for now, your real domain after deploy).',
        'Add `WIDGET_TOKEN_SECRET` to `.env.local` with the SAME value (the Next.js widget page mints tokens with it).',
        'When you deploy to Vercel, add `WIDGET_TOKEN_SECRET` to Vercel env too, and change `APP_URL` in Supabase secrets to your live URL.',
      ),
      keys([
        { name: 'WIDGET_TOKEN_SECRET', where: 'openssl rand -hex 32 (same value in all three places)', pasteInto: 'Supabase secrets', secret: true },
        { name: 'WIDGET_TOKEN_SECRET', where: 'Same value as above', pasteInto: '.env.local', secret: true },
        { name: 'WIDGET_TOKEN_SECRET', where: 'Same value as above', pasteInto: 'Vercel env', secret: true },
        { name: 'IP_HASH_SALT', where: 'openssl rand -hex 32', pasteInto: 'Supabase secrets', secret: true },
        { name: 'CRON_SECRET', where: 'openssl rand -hex 32 (also stored in Supabase Vault by the cron task)', pasteInto: 'Supabase secrets', secret: true },
        { name: 'APP_URL', where: 'http://localhost:3000 now, https://yourdomain.com after deploy', pasteInto: 'Supabase secrets', secret: false },
      ]),
      mistakes([
        { mistake: 'Every widget answer is 401 bad_token.', fix: 'WIDGET_TOKEN_SECRET differs between .env.local and Supabase. Paste the same value in both, restart npm run dev.' },
        { mistake: 'hd-answer is blocked by CORS on the live site.', fix: 'APP_URL in Supabase secrets still says localhost. Change it to https://yourdomain.com.' },
        { mistake: 'You pasted a secret into chat or a commit.', fix: 'Generate a new one and replace it everywhere. Old widget tokens stop working within 2 hours, which is fine.' },
      ]),
    ],
    checklist: [
      ['Generate the three secrets', 'copy:hd-be-secrets-gen'],
      'Add all four values to Supabase secrets',
      'Add WIDGET_TOKEN_SECRET to .env.local with the same value',
    ],
  }),
  task({
    id: 'hd-be-cron',
    title: 'Schedule the worker and the daily emails with pg_cron',
    outcome: 'Pages get learned within a minute of arriving, and usage warnings, cleanup and the weekly digest run by themselves.',
    minutes: 15,
    xp: 30,
    blocks: [
      eli5('What pg_cron does', 'pg_cron is an alarm clock inside your database. Every minute it rings and calls hd-embed-worker, which learns any pages waiting in the queue. Once a day it calls hd-digest for warnings and tidying up.'),
      p('Do this after hd-embed-worker and hd-digest are deployed. Replace `<ref>` and paste your `CRON_SECRET` value where shown. Vault keeps both values encrypted inside the database.'),
      code('hd-be-cron-sql', 'Supabase SQL Editor: schedule the jobs', 'sql', `
-- 1. Store the project URL and cron secret in Vault (run once).
select vault.create_secret('https://<ref>.supabase.co', 'hd_project_url');
select vault.create_secret('<CRON_SECRET>', 'hd_cron_secret');

-- 2. A helper that calls one of our edge functions.
create or replace function public.hd_call_function(fn text, body jsonb default '{}')
returns bigint language sql security definer set search_path = '' as $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'hd_project_url') || '/functions/v1/' || fn,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'hd_cron_secret')
    ),
    body := body,
    timeout_milliseconds := 5000
  );
$$;
revoke execute on function public.hd_call_function(text, jsonb) from public, anon, authenticated;

-- 3. The schedules (times are UTC).
select cron.schedule('hd-embed-worker', '* * * * *', $$ select public.hd_call_function('hd-embed-worker') $$);
select cron.schedule('hd-digest-daily', '10 8 * * *', $$ select public.hd_call_function('hd-digest', '{"kind":"daily"}') $$);
select cron.schedule('hd-digest-weekly', '20 8 * * 1', $$ select public.hd_call_function('hd-digest', '{"kind":"weekly"}') $$);
`),
      code('hd-be-cron-check', 'Supabase SQL Editor: check it runs', 'sql', `
select jobname, schedule, active from cron.job;
select jobid, status, return_message, start_time from cron.job_run_details order by start_time desc limit 5;
select id, status_code, left(content::text, 120) from net._http_response order by created desc limit 5;
`),
      p('**Check it worked:** after 2 minutes, `cron.job_run_details` shows `succeeded` and `net._http_response` shows status 200 from hd-embed-worker.'),
      mistakes([
        { mistake: 'net._http_response shows 401.', fix: 'The Vault cron secret does not match CRON_SECRET in Supabase secrets. Run select vault.update_secret((select id from vault.secrets where name = \'hd_cron_secret\'), \'<right value>\');' },
        { mistake: 'function vault.create_secret does not exist.', fix: 'Database → Extensions → enable "supabase_vault", then run the SQL again.' },
        { mistake: 'You see 404 in the responses.', fix: 'The function is not deployed yet or the name is misspelt. Run npx supabase functions list.' },
      ]),
    ],
    checklist: [
      ['Copy the schedule SQL and run it with your values', 'copy:hd-be-cron-sql'],
      ['Run the check SQL after 2 minutes', 'copy:hd-be-cron-check'],
      'See status 200 from hd-embed-worker',
    ],
  }),
  task({
    id: 'hd-be-plans',
    title: 'Map Stripe prices to plans and create the demo workspace',
    outcome: 'Growth customers get Growth limits, and the landing page demo has a hidden home for its bots.',
    minutes: 15,
    xp: 25,
    blocks: [
      eli5('Why a price map?', 'Stripe only tells us a price id like price_1Q.... The database needs to know that id means "Growth: 3 bots, 10,000 answers". This little table is the dictionary.'),
      warn('Do part 1 after the Payments phase', 'You create the four Stripe prices in the Payments phase ("Create the product"). Come back here afterwards. Part 2 you can do now.'),
      code('hd-be-plans-sql', 'Supabase SQL Editor: 1. map the four prices', 'sql', `
insert into public.plan_prices (price_id, plan, billing_interval) values
  ('price_STARTER_MONTHLY', 'starter', 'month'),
  ('price_STARTER_YEARLY',  'starter', 'year'),
  ('price_GROWTH_MONTHLY',  'growth',  'month'),
  ('price_GROWTH_YEARLY',   'growth',  'year')
on conflict (price_id) do update set plan = excluded.plan, billing_interval = excluded.billing_interval;
`),
      code('hd-be-demo-sql', 'Supabase SQL Editor: 2. the demo workspace', 'sql', `
-- Your own login owns it, but you are not a member, so it never shows in your app.
insert into public.workspaces (name, owner_id)
select 'Helpdeck demos', id from auth.users where email = 'YOUR_LOGIN_EMAIL'
returning id;  -- copy this id

insert into public.workspace_limit_overrides (workspace_id, bots, pages_per_bot, answers_month, crawl_pages_month, note)
values ('PASTE_THE_ID', 1000, 15, 5000, 750 * 30, 'landing demo');
`),
      steps(
        'Run part 2 now. Copy the id it returns.',
        'Supabase → Edge Functions → Secrets → add `DEMO_WORKSPACE_ID` (that id) and `DEMO_DAILY_CAP` = `50`.',
        'After the Payments phase: replace the four price ids in part 1 with your real ones (Stripe → Product catalogue → Helpdeck → each price → copy the id) and run it.',
      ),
      keys([
        { name: 'DEMO_WORKSPACE_ID', where: 'The id returned by the demo workspace SQL', pasteInto: 'Supabase secrets', secret: false },
        { name: 'DEMO_DAILY_CAP', where: 'Type 50 (lower it if Firecrawl costs climb)', pasteInto: 'Supabase secrets', secret: false },
      ]),
      mistakes([
        { mistake: 'A Growth customer still sees "1 of 1 bots".', fix: 'Their price id is not in plan_prices (unknown ids fall back to Starter). Check select price_id from subscriptions and add the missing row.' },
        { mistake: 'The demo workspace shows up in your own bot switcher.', fix: 'You added yourself to workspace_members for it. Delete that membership row.' },
        { mistake: 'Demo bots are refused with bot_limit.', fix: 'hd-demo must insert bots with is_demo = true, which skips the bot limit trigger.' },
      ]),
    ],
    checklist: [
      ['Create the demo workspace', 'copy:hd-be-demo-sql'],
      'Add DEMO_WORKSPACE_ID and DEMO_DAILY_CAP to Supabase secrets',
      ['Map the four Stripe prices after Payments', 'copy:hd-be-plans-sql'],
    ],
  }),
  task({
    id: 'hd-be-keys',
    title: 'Test the whole pipeline end to end',
    outcome: 'Proof that a crawl, the worker, an answer, a handoff and the meter all work together on real data.',
    minutes: 40,
    xp: 60,
    blocks: [
      eli5('Three helpers, three jobs', 'Firecrawl reads the website for you. Voyage turns each paragraph into a list of numbers so similar meanings sit close together, like books on the same shelf. Claude reads the closest paragraphs and writes the answer.'),
      steps(
        'Supabase: Database → Extensions → search "vector" → check it is enabled (the SQL migration enables it too).',
        'Check every secret is set: run `npx supabase secrets list` and compare with the list in the prompt below.',
        'Paste the prompt below into Claude Code. It runs every step and prints PASS or FAIL.',
      ),
      prompt('hd-be-keys-prompt', 'Paste into Claude Code', `
Write and run scripts/e2e.ts (run with npx tsx) that tests Helpdeck end to end against my Supabase project,
using .env.local and the Supabase MCP for SQL checks. Print PASS or FAIL per step and stop at the first FAIL
with the likely cause.
0. npx supabase secrets list contains FIRECRAWL_API_KEY, FIRECRAWL_WEBHOOK_SECRET, VOYAGE_API_KEY,
   ANTHROPIC_API_KEY, RESEND_API_KEY, EMAIL_FROM, WIDGET_TOKEN_SECRET, IP_HASH_SALT, CRON_SECRET, APP_URL.
1. Sign in as my test user (TEST_EMAIL / TEST_PASSWORD in .env.local). Make sure they have a bot (create
   "E2E bot" if none) with allowed_domains ['localhost'].
2. Call hd-crawl { action: 'start', botId, url: 'https://docs.firecrawl.dev' } but first set a temporary
   workspace_limit_overrides row with pages_per_bot 20 so it reads 20 pages. Expect 202.
3. Poll crawl_jobs every 5 s (max 5 minutes) until status is 'ready'. Print pages_found, pages_embedded and
   the chunk count. FAIL if pages_embedded is 0.
4. Mint a widget token with host 'app' (lib/widget-token.ts). Ask hd-answer "How do I crawl a website?".
   PASS if confident is true and sources has at least 1 url from docs.firecrawl.dev.
5. Ask hd-answer "What is your refund policy for pizza?". PASS if confident is false and offerHandoff true.
6. Call hd-handoff for that conversation with my own email. PASS if 200, then a second call returns
   already: true, and email_log has exactly one 'handoff' row for it.
7. SQL: usage_ledger has 'crawl_page' rows (about 20), 'embed_tokens' rows with cost_micros > 0, and 2
   'answer' rows with cost_micros > 0. doc_gaps has the pizza question.
8. Re-crawl the same site. PASS if the new crawl has pages_changed = 0 and no new embed_tokens rows.
9. Clean up: delete the override row. Print a table of every step.`),
      code('hd-be-keys-sql', 'Supabase SQL Editor: the money trail', 'sql', `
select kind, count(*) as rows, sum(quantity) as qty, round(sum(cost_micros) / 1e6, 4) as dollars
from public.usage_ledger
where created_at > now() - interval '1 hour'
group by kind order by kind;
`),
      p('**Check it worked:** every step prints PASS, and the money trail shows a few cents at most for the whole test.'),
      mistakes([
        { mistake: 'Step 3 never reaches ready.', fix: 'Pages arrive (pages_found > 0) but are not learned: the cron worker is not running. Finish "Schedule the worker" or run the worker curl by hand.' },
        { mistake: 'Step 2 passes but pages_found stays 0.', fix: 'Firecrawl cannot reach the webhook or the signature check fails. Look at Edge Functions → hd-firecrawl-webhook → Logs for 401s and re-check FIRECRAWL_WEBHOOK_SECRET.' },
        { mistake: 'Step 4 is confident false for a question the docs clearly answer.', fix: 'Compare top_similarity on the message. Under 0.45 means retrieval missed: check the chunks have the "Page: ... Section: ..." prefix and that questions use input_type query.' },
      ]),
      links([
        { label: 'Supabase AI and vectors guide', url: 'https://supabase.com/docs/guides/ai' },
      ]),
    ],
    checklist: [
      'Check the vector extension is enabled',
      ['Copy the end-to-end test prompt into Claude Code', 'copy:hd-be-keys-prompt'],
      'See a confident answer and a not-sure answer',
      ['Run the money trail SQL', 'copy:hd-be-keys-sql'],
    ],
  }),
]
