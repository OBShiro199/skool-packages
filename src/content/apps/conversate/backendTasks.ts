// Conversate app-specific backend tasks: one account-setup task per service, workers, and the end-to-end test.
import type { Task } from '../../types'

export const backendTasks: Task[] = [
  {
    id: 'con-be-firecrawl',
    title: 'Set up Firecrawl to read customer websites',
    outcome: 'Conversate can start a crawl, Firecrawl calls you back when it is done, and you know what each page costs.',
    minutes: 25,
    xp: 40,
    blocks: [
      { type: 'callout', tone: 'eli5', title: 'What Firecrawl does', text: 'Firecrawl is a robot reader. You give it a website address and it visits every page, throws away menus and adverts, and hands back clean text. It phones you back (a webhook) when it has finished, so your app never sits and waits.' },
      { type: 'table', head: ['Plan (checked Oct 2026)', 'Price', 'Credits', 'Good for'], rows: [
        ['Free', '$0', 'Small allowance (500 one-time or 1,000 a month, sources differ) [verify]', 'Building and testing'],
        ['Hobby', 'about $16/month billed yearly', '3,000 a month [verify, some listings say 5,000]', 'Your first 5 customers'],
        ['Standard', 'about $83/month billed yearly', '100,000 a month', 'Up to about 160 customers at 600 pages each'],
        ['Growth', 'about $333/month billed yearly', '500,000 a month', 'Up to about 800 customers'],
      ] },
      { type: 'p', text: 'A basic crawled page in markdown costs **1 credit**. Conversate never asks for JSON extraction or screenshots, which cost more. Credits do not roll over, so the plan caps re-crawls to 3 per source per day.' },
      { type: 'steps', items: [
        'Go to firecrawl.dev and click **Sign up** (top right). Use Google or email.',
        'In the dashboard left sidebar click **API Keys**. Copy the default key. It starts with `fc-`.',
        'Find the webhook signing secret: dashboard **Settings** (or **Account settings > Advanced**) shows a **Webhook secret** [verify the exact place in your dashboard]. Copy it.',
        'In a normal terminal (not Claude Code) set both secrets with the commands below. The APP_URL secret is your Vercel URL for now, your real domain later.',
        'Run the test scrape below. A good response has `"success": true` and `data.markdown` with your homepage text.',
      ] },
      { type: 'keys', rows: [
        { name: 'FIRECRAWL_API_KEY', where: 'firecrawl.dev > Dashboard > API Keys', pasteInto: 'Supabase secrets', secret: true },
        { name: 'FIRECRAWL_WEBHOOK_SECRET', where: 'firecrawl.dev > Settings > Webhook secret [verify]', pasteInto: 'Supabase secrets', secret: true },
      ] },
      { type: 'code', id: 'con-be-firecrawl-secrets', filename: 'Terminal (outside Claude Code)', lang: 'bash', code: `npx supabase secrets set FIRECRAWL_API_KEY=fc-paste_here
npx supabase secrets set FIRECRAWL_WEBHOOK_SECRET=paste_here
npx supabase secrets set APP_URL=https://your-app.vercel.app` },
      { type: 'code', id: 'con-be-firecrawl-test', filename: 'Terminal: first test call', lang: 'bash', code: `# Scrape one page (1 credit). Expect "success": true and markdown in data.markdown.
curl -s https://api.firecrawl.dev/v2/scrape \\
  -H "Authorization: Bearer fc-paste_here" \\
  -H "Content-Type: application/json" \\
  -d '{ "url": "https://example.com", "formats": ["markdown"], "onlyMainContent": true }' | head -c 600

# Start a tiny crawl (up to 5 credits) and note the "id" it returns.
curl -s https://api.firecrawl.dev/v2/crawl \\
  -H "Authorization: Bearer fc-paste_here" \\
  -H "Content-Type: application/json" \\
  -d '{ "url": "https://example.com", "limit": 5, "scrapeOptions": { "formats": ["markdown"] } }'

# Check its status. Expect "status": "completed" and a data array within a minute.
curl -s https://api.firecrawl.dev/v2/crawl/PASTE_ID -H "Authorization: Bearer fc-paste_here" | head -c 400` },
      { type: 'mistakes', items: [
        { mistake: '401 "Unauthorized" on every call.', fix: 'The key must be sent as Authorization: Bearer fc-... with no quotes and no trailing space.' },
        { mistake: '402 "Payment required" or "Insufficient credits".', fix: 'The free allowance is used up. Upgrade to Hobby for the month you build and test.' },
        { mistake: 'Crawls finish but the webhook never arrives.', fix: 'Firecrawl must reach https://<ref>.supabase.co/functions/v1/build-knowledge, deployed with --no-verify-jwt. The pg_cron poller (crawl_site job) catches missed webhooks within a few minutes anyway.' },
      ] },
      { type: 'links', items: [
        { label: 'Firecrawl sign up', url: 'https://www.firecrawl.dev/signin' },
        { label: 'Firecrawl crawl docs', url: 'https://docs.firecrawl.dev/features/crawl' },
        { label: 'Firecrawl webhooks', url: 'https://docs.firecrawl.dev/webhooks/overview' },
        { label: 'Firecrawl pricing', url: 'https://www.firecrawl.dev/pricing' },
      ] },
    ],
    checklist: [
      { id: 'con-be-firecrawl-c1', label: 'Create a Firecrawl account and copy the fc- key' },
      { id: 'con-be-firecrawl-c2', label: 'Set the Firecrawl Supabase secrets', trigger: 'copy:con-be-firecrawl-secrets' },
      { id: 'con-be-firecrawl-c3', label: 'Run the test scrape and crawl', trigger: 'copy:con-be-firecrawl-test' },
    ],
  },
  {
    id: 'con-be-voyage',
    title: 'Set up Voyage AI for embeddings',
    outcome: 'Conversate can turn page text and visitor questions into 1,024 numbers each, so it finds the right help text in milliseconds.',
    minutes: 15,
    xp: 30,
    blocks: [
      { type: 'callout', tone: 'eli5', title: 'What an embedding is', text: 'An embedding turns a sentence into a long list of numbers that captures what it means. "Can I get my money back?" and "refund policy" end up with very similar numbers even though they share no words. That is how the AI finds the right help article for a question.' },
      { type: 'table', head: ['', 'Voyage voyage-3.5', 'Supabase gte-small'], rows: [
        ['Price (checked Oct 2026)', '$0.06 per million tokens, first 200 million free per account', 'Free, runs inside edge functions'],
        ['Numbers per chunk', '1,024 (also 256, 512, 2,048)', '384'],
        ['Languages', 'Multilingual', 'English only'],
        ['Longest text per input', 'Long chunks are fine', 'About 512 tokens'],
        ['Speed for a 300 page site', 'Seconds, in batches of 64', 'Many worker runs, edge CPU limits'],
        ['Whole 300 page site', 'About 450,000 tokens = $0.03', '$0'],
        ['Decision', 'Use this', 'Fallback idea only'],
      ] },
      { type: 'steps', items: [
        'Go to dashboard.voyageai.com and sign up (Google or email).',
        'Left sidebar: **API Keys** > **Create new secret key**. Name it conversate-dev. Copy it (it starts with `pa-`). You only see it once.',
        'Left sidebar: **Billing** > add a payment method. Your first 200 million tokens stay free, but without a card the rate limits are very low and crawls stall.',
        'Set the secret with the command below, then run the test call.',
      ] },
      { type: 'keys', rows: [
        { name: 'VOYAGE_API_KEY', where: 'dashboard.voyageai.com > API Keys > Create new secret key', pasteInto: 'Supabase secrets', secret: true },
      ] },
      { type: 'code', id: 'con-be-voyage-test', filename: 'Terminal: secret + first test call', lang: 'bash', code: `npx supabase secrets set VOYAGE_API_KEY=pa-paste_here

# Expect "object": "list", one embedding of 1024 numbers, and usage.total_tokens about 8.
curl -s https://api.voyageai.com/v1/embeddings \\
  -H "Authorization: Bearer pa-paste_here" \\
  -H "Content-Type: application/json" \\
  -d '{ "model": "voyage-3.5", "input": ["How do I get a refund?"], "input_type": "query", "output_dimension": 1024 }' \\
  | python3 -c "import sys,json; r=json.load(sys.stdin); print(len(r['data'][0]['embedding']), r['usage'])"` },
      { type: 'mistakes', items: [
        { mistake: 'It prints 1024 locally but inserts fail with "expected 1024 dimensions".', fix: 'Every call must pass output_dimension: 1024. Ask Claude Code to set it in _shared/voyage.ts only, so no call can forget it.' },
        { mistake: '429 "rate limit" during the first crawl.', fix: 'Add a payment method (limits rise straight away). The helper also retries 429 with backoff.' },
        { mistake: 'Answers are poor even though chunks exist.', fix: 'Questions must be embedded with input_type "query" and chunks with "document". Mixing them up lowers similarity scores.' },
      ] },
      { type: 'links', items: [
        { label: 'Voyage AI dashboard', url: 'https://dashboard.voyageai.com' },
        { label: 'Voyage embeddings API', url: 'https://docs.voyageai.com/reference/embeddings-api' },
        { label: 'Voyage pricing', url: 'https://docs.voyageai.com/docs/pricing' },
        { label: 'Supabase gte-small guide (for comparison)', url: 'https://supabase.com/docs/guides/ai/quickstarts/generate-text-embeddings' },
      ] },
    ],
    checklist: [
      { id: 'con-be-voyage-c1', label: 'Create a Voyage key named conversate-dev' },
      { id: 'con-be-voyage-c2', label: 'Add a payment method to lift rate limits' },
      { id: 'con-be-voyage-c3', label: 'Set the secret and see 1024 printed', trigger: 'copy:con-be-voyage-test' },
    ],
  },
  {
    id: 'con-be-claude',
    title: 'Set up the Claude API for answers and drafting',
    outcome: 'Conversate can call claude-haiku-5-5 for visitor answers and claude-sonnet-5-5 for drafting articles, with a monthly spend limit.',
    minutes: 15,
    xp: 30,
    blocks: [
      { type: 'callout', tone: 'eli5', title: 'Two models, two jobs', text: 'Haiku is the fast, cheap one: it answers visitors in a second or two for a fraction of a cent. Sonnet is slower and smarter: it writes your help articles once, where quality matters more than speed. You pay per word in and out, so the cheap one does the high-volume job.' },
      { type: 'table', head: ['Model (checked Oct 2026)', 'Input per million tokens', 'Output per million tokens', 'Used for', 'Typical cost'], rows: [
        ['claude-haiku-5-5', '$0.10', '$0.50', 'Visitor answers, suggested replies', 'About $0.0007 per answer'],
        ['claude-sonnet-5-5', '$2.00', '$10.00', 'Help-centre planning and article drafts', 'About $0.021 per article'],
      ] },
      { type: 'steps', items: [
        'Go to platform.claude.com and sign up or log in.',
        'Settings > **Billing**: add a card and buy $10 of credit.',
        'Settings > **Limits**: set a monthly spend limit of $50 while you build. Raise it as customers arrive.',
        'Settings > **API keys** > **Create key**, name it conversate-dev, copy it (starts with `sk-ant-`).',
        'Set the secret and run the test call below. It asks Haiku for structured JSON, exactly like the widget does.',
      ] },
      { type: 'keys', rows: [
        { name: 'ANTHROPIC_API_KEY', where: 'platform.claude.com > Settings > API keys > Create key', pasteInto: 'Supabase secrets', secret: true },
        { name: 'ANTHROPIC_API_KEY', where: 'Same key (onboarding question suggester route runs in Next.js)', pasteInto: 'Vercel env', secret: true },
      ] },
      { type: 'code', id: 'con-be-claude-test', filename: 'Terminal: secret + first test call', lang: 'bash', code: `npx supabase secrets set ANTHROPIC_API_KEY=sk-ant-paste_here

# Expect a JSON text block like {"answer":"...","confidence":0.9} and stop_reason "end_turn".
curl -s https://api.anthropic.com/v1/messages \\
  -H "x-api-key: sk-ant-paste_here" \\
  -H "anthropic-version: 2023-06-01" \\
  -H "content-type: application/json" \\
  -d '{
    "model": "claude-haiku-5-5",
    "max_tokens": 400,
    "output_config": {
      "effort": "low",
      "format": { "type": "json_schema", "schema": {
        "type": "object", "additionalProperties": false, "required": ["answer", "confidence"],
        "properties": { "answer": { "type": "string" }, "confidence": { "type": "number" } } } }
    },
    "system": "Answer only from <knowledge>. Return JSON.",
    "messages": [{ "role": "user", "content": "<knowledge>[1] Refunds are available within 30 days.</knowledge><question>Can I get a refund after 2 weeks?</question>" }]
  }' | head -c 800` },
      { type: 'mistakes', items: [
        { mistake: '400 "output_format is not supported" or similar.', fix: 'Use output_config.format (the old output_format parameter is deprecated). The prompt above already does.' },
        { mistake: '400 complaining about thinking or budget_tokens.', fix: 'Do not send budget_tokens to Haiku 5.5 or Sonnet 5.5. Control depth with output_config.effort only.' },
        { mistake: 'Answers cost more than expected.', fix: 'Check usage_ledger cost_micros per ai_answer. If it is over 1,500, the function is sending too many chunks or the whole history; cap history at 6 messages and chunks at 6.' },
      ] },
      { type: 'links', items: [
        { label: 'Claude Console', url: 'https://platform.claude.com' },
        { label: 'Structured outputs docs', url: 'https://platform.claude.com/docs/en/build-with-claude/structured-outputs' },
        { label: 'Claude pricing', url: 'https://platform.claude.com/docs/en/about-claude/pricing' },
      ] },
    ],
    checklist: [
      { id: 'con-be-claude-c1', label: 'Add $10 credit and a $50 monthly limit' },
      { id: 'con-be-claude-c2', label: 'Create the conversate-dev key' },
      { id: 'con-be-claude-c3', label: 'Run the structured JSON test call', trigger: 'copy:con-be-claude-test' },
    ],
  },
  {
    id: 'con-be-resend',
    title: 'Set up Resend for alerts, email replies and inbound email',
    outcome: 'Team alerts and agent replies go out from your domain, and visitors\' email replies come back into the Inbox.',
    minutes: 40,
    xp: 50,
    blocks: [
      { type: 'callout', tone: 'eli5', title: 'Sending and receiving', text: 'Sending is Conversate posting a letter. Receiving is giving Conversate its own letterbox. We use two sub-addresses: mail.yourdomain.com to send, and in.yourdomain.com to receive. When a visitor hits Reply, the email lands in that letterbox and Resend tells your app about it straight away.' },
      { type: 'p', text: 'Resend pricing (checked Oct 2026, third-party summaries, [verify] on resend.com/pricing): Free is 3,000 emails a month with 100 a day, Pro is $20/month for 50,000, Scale from about $90/month for 100,000. Receiving is a newer feature: check it is enabled on your account [verify].' },
      { type: 'steps', items: [
        'Sign in at resend.com (you set up the account and SMTP in the shared Resend task). Left sidebar **Domains** > **Add domain** > `mail.yourdomain.com` > Add.',
        'Copy the DNS records Resend shows (MX, TXT for SPF, TXT for DKIM). In Porkbun: Domain Management > your domain > DNS > Add each record, Host exactly as shown without the root domain part. Wait for Resend to show **Verified** (5 to 30 minutes).',
        'Receiving: in Resend open **Receiving** (or Domains > your domain > enable receiving) and add `in.yourdomain.com` [verify the exact menu name]. Add the MX record it shows in Porkbun for host `in`.',
        'Left sidebar **Webhooks** > **Add endpoint**. URL: `https://<ref>.supabase.co/functions/v1/notify/inbound`. Events: tick **email.received** only. Save, then open the endpoint and copy the **Signing secret** (starts with `whsec_`).',
        'Set the four secrets below.',
        'Send a real test email from your own inbox to `test@in.yourdomain.com`. In Resend > Receiving you see it arrive. In Webhooks > your endpoint > deliveries you see a POST (it will 200 once notify is deployed).',
      ] },
      { type: 'keys', rows: [
        { name: 'RESEND_API_KEY', where: 'resend.com > API Keys (from the shared Resend task)', pasteInto: 'Supabase secrets', secret: true },
        { name: 'RESEND_WEBHOOK_SECRET', where: 'resend.com > Webhooks > your endpoint > Signing secret', pasteInto: 'Supabase secrets', secret: true },
        { name: 'EMAIL_FROM_DOMAIN', where: 'The verified sending domain, e.g. mail.yourdomain.com', pasteInto: 'Supabase secrets', secret: false },
        { name: 'INBOUND_DOMAIN', where: 'The receiving domain, e.g. in.yourdomain.com', pasteInto: 'Supabase secrets', secret: false },
      ] },
      { type: 'code', id: 'con-be-resend-secrets', filename: 'Terminal (outside Claude Code)', lang: 'bash', code: `npx supabase secrets set RESEND_API_KEY=re_paste_here
npx supabase secrets set RESEND_WEBHOOK_SECRET=whsec_paste_here
npx supabase secrets set EMAIL_FROM_DOMAIN=mail.yourdomain.com
npx supabase secrets set INBOUND_DOMAIN=in.yourdomain.com

# First test send. Expect {"id":"..."} and the email in your inbox within seconds.
curl -s https://api.resend.com/emails \\
  -H "Authorization: Bearer re_paste_here" \\
  -H "Content-Type: application/json" \\
  -d '{ "from": "Conversate <notify@mail.yourdomain.com>", "to": ["you@yourpersonal.com"],
        "subject": "Conversate test", "text": "If you can read this, sending works.",
        "reply_to": "reply+testtoken123456@in.yourdomain.com" }'` },
      { type: 'mistakes', items: [
        { mistake: 'Resend says "domain is not verified".', fix: 'In Porkbun the Host field must be only the part before your domain (for example `resend._domainkey.mail`), not the full name. Delete and re-add it.' },
        { mistake: 'Inbound emails never reach the webhook.', fix: 'The MX record must be on the in subdomain and point to the value Resend gives. Do not touch the MX records of your main domain or your normal inbox stops working.' },
        { mistake: 'notify/inbound returns 401 for real emails.', fix: 'The signing secret is per endpoint. Copy it again from that endpoint, set RESEND_WEBHOOK_SECRET, and make sure the function verifies the raw body (await req.text()) before parsing.' },
      ] },
      { type: 'links', items: [
        { label: 'Resend domains', url: 'https://resend.com/domains' },
        { label: 'Resend receiving docs', url: 'https://resend.com/docs/dashboard/receiving/introduction' },
        { label: 'Retrieve received email API', url: 'https://resend.com/docs/api-reference/emails/retrieve-received-email' },
        { label: 'Resend pricing', url: 'https://resend.com/pricing' },
      ] },
    ],
    checklist: [
      { id: 'con-be-resend-c1', label: 'Verify mail.yourdomain.com in Resend' },
      { id: 'con-be-resend-c2', label: 'Enable receiving on in.yourdomain.com and add its MX record' },
      { id: 'con-be-resend-c3', label: 'Add the email.received webhook and copy its secret' },
      { id: 'con-be-resend-c4', label: 'Set the secrets and send the test email', trigger: 'copy:con-be-resend-secrets' },
    ],
  },
  {
    id: 'con-be-workers',
    title: 'Schedule the workers and set the widget secrets',
    outcome: 'pg_cron runs the knowledge, drafting and email workers every minute, housekeeping every 5 minutes, and the widget can sign visitor tokens.',
    minutes: 25,
    xp: 40,
    blocks: [
      { type: 'callout', tone: 'eli5', title: 'Why workers on a timer', text: 'Reading a website or writing 30 articles takes minutes. A web request that waits that long times out. So the slow work goes on a to-do list (the jobs table), and every minute an alarm clock (pg_cron) wakes the workers to tick off a few items. If one fails, it waits a bit longer and tries again.' },
      { type: 'steps', items: [
        'Make two random secrets in a terminal: run `openssl rand -hex 32` twice. The first is CRON_SECRET, the second WIDGET_JWT_SECRET.',
        'Set both with the commands below.',
        'In Supabase open **Integrations** (or Database > Extensions) and check **pg_cron** and **pg_net** are enabled (the migration enabled them).',
        'Open **SQL Editor > New query**, paste the schedule SQL below, replace the two placeholders, and Run. It stores the URL and secret in Supabase Vault (encrypted) and creates 4 schedules.',
        'Open **Integrations > Cron** (or run `select * from cron.job`). You see the four jobs. After two minutes `cron.job_run_details` shows succeeded runs.',
        'Realtime: open **Realtime > Settings** and leave public channel access on (the widget uses unguessable public broadcast topics; agents use RLS-checked database changes).',
      ] },
      { type: 'code', id: 'con-be-workers-secrets', filename: 'Terminal (outside Claude Code)', lang: 'bash', code: `npx supabase secrets set CRON_SECRET=paste_first_random_value
npx supabase secrets set WIDGET_JWT_SECRET=paste_second_random_value
npx supabase secrets list` },
      { type: 'code', id: 'con-be-workers-sql', filename: 'schedule-workers.sql', lang: 'sql', code: `-- 1. Store the project URL and the cron secret in Vault (encrypted at rest).
select vault.create_secret('https://YOUR-REF.supabase.co', 'conversate_project_url');
select vault.create_secret('PASTE_THE_SAME_CRON_SECRET', 'conversate_cron_secret');

-- 2. A helper that calls one edge function with the secret header.
create or replace function public.call_worker(fn text)
returns bigint language sql security definer set search_path = '' as $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'conversate_project_url') || '/functions/v1/' || fn,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'conversate_cron_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 5000
  );
$$;
revoke execute on function public.call_worker(text) from public, anon, authenticated;

-- 3. The schedules.
select cron.schedule('conversate-build-knowledge', '* * * * *', $$ select public.call_worker('build-knowledge') $$);
select cron.schedule('conversate-draft-articles', '* * * * *', $$ select public.call_worker('draft-articles') $$);
select cron.schedule('conversate-notify', '* * * * *', $$ select public.call_worker('notify') $$);
select cron.schedule('conversate-housekeeping', '*/5 * * * *', $$ select public.housekeeping() $$);

-- 4. Check runs after two minutes.
select jobname, schedule, active from cron.job;
select status, return_message, start_time from cron.job_run_details order by start_time desc limit 8;` },
      { type: 'mistakes', items: [
        { mistake: 'cron.job_run_details shows succeeded but the function logs show 401.', fix: 'pg_net only reports that the request was sent. The CRON_SECRET in Supabase secrets and the one in Vault must be identical. Recreate the Vault secret with vault.update_secret.' },
        { mistake: '"function vault.create_secret does not exist".', fix: 'Enable the Vault integration (Integrations > Vault) or create the extension supabase_vault, then run the SQL again.' },
        { mistake: 'Jobs stay queued for ever.', fix: 'The worker functions are not deployed yet, or were deployed without --no-verify-jwt. Deploy them and watch Edge Functions > Logs.' },
      ] },
    ],
    checklist: [
      { id: 'con-be-workers-c1', label: 'Set CRON_SECRET and WIDGET_JWT_SECRET', trigger: 'copy:con-be-workers-secrets' },
      { id: 'con-be-workers-c2', label: 'Run the schedule SQL with your project ref', trigger: 'copy:con-be-workers-sql' },
      { id: 'con-be-workers-c3', label: 'See four jobs in cron.job and succeeded runs' },
    ],
  },
  {
    id: 'con-be-e2e',
    title: 'Test the whole journey end to end',
    outcome: 'Proof that a brand new customer goes from signup to a live, answering widget, a human handoff and an email reply round trip.',
    minutes: 60,
    xp: 70,
    blocks: [
      { type: 'callout', tone: 'tip', title: 'Use a real small website', text: 'Pick a site with 20 to 60 pages and a FAQ, like a friend\'s business or a small open source project\'s docs. Tiny sites give the AI little to work with; huge ones burn crawl credits while testing.' },
      { type: 'steps', items: [
        'In a private window sign up with a new email and finish onboarding with the real site. Time it: the build list should reach "Your help centre is ready" in under 5 minutes.',
        'Publish all drafts. Open /<slug>/help and search for something the site covers.',
        'Add `localhost` to allowed domains, open your test page on http://localhost:5500 and ask 3 questions the site answers. Each reply shows source pills.',
        'Ask something the site does not cover. You get the "not sure" card. Click Talk to a human and leave a second email address of yours.',
        'In the app the conversation shows in Unassigned. Reply. It appears in the widget within a second.',
        'Close the widget tab. Wait 3 minutes. Reply again from the Inbox. The email arrives at your second address. Reply to that email. Within a minute the reply shows in the same conversation.',
        'Close the conversation. Reopen the test page: the CSAT card shows. Rate it 5.',
        'Open Analytics: 1 handoff, CSAT 5.0, and the AI answers count matches.',
      ] },
      { type: 'code', id: 'con-be-e2e-sql', filename: 'e2e-check.sql', lang: 'sql', code: `-- Run after the journey. Every line should match the comment.
select status, pages_found, chunks_count from public.kb_sources order by created_at desc limit 1;      -- ready, > 0, > 0
select status, count(*) from public.kb_articles group by status;                                        -- published > 0
select role, count(*) from public.messages group by role;                                               -- visitor, ai, agent, system all > 0
select count(*) filter (where needs_human) as low_conf, round(avg(confidence), 2) as avg_conf
from public.messages where role = 'ai';                                                                   -- low_conf >= 1
select kind, sum(quantity), sum(cost_micros) from public.usage_ledger group by kind;                    -- ai_answer cost about 700 each
select kind, status, count(*) from public.email_log group by kind, status;                              -- fallback sent, inbound present
select status, count(*) from public.jobs group by status;                                               -- no dead jobs
select score from public.csat order by created_at desc limit 1;                                         -- 5` },
      { type: 'prompt', id: 'con-be-e2e-prompt', title: 'Paste into Claude Code if anything failed', code: `I ran the end-to-end test in @PRD.md section 24. These steps failed: <paste the step numbers and what you saw>.
Use the Supabase MCP to read: the last 20 rows of jobs (kind, status, attempts, last_error), the edge function logs for the functions involved (get_logs), and the security and performance advisors. Explain the cause in plain words, fix it, redeploy only the affected functions, and tell me which step to re-run.` },
      { type: 'mistakes', items: [
        { mistake: 'The build list stops at "Learning 42 pages".', fix: 'build-knowledge is running but Voyage fails. Check jobs.last_error. Usually a missing VOYAGE_API_KEY secret or the low no-card rate limit.' },
        { mistake: 'Live replies work but email fallback never sends.', fix: 'The widget ping keeps last_seen_at fresh while the tab is open. Make sure you really closed the tab, and that notify is scheduled. Check jobs where kind = email_fallback.' },
        { mistake: 'The email reply does not come back.', fix: 'Check Resend > Webhooks deliveries. A 401 means the signing secret is wrong; a 200 with no message means the reply+ token did not match (send a fresh agent reply and reply to that newest email).' },
      ] },
    ],
    checklist: [
      { id: 'con-be-e2e-c1', label: 'Sign up fresh and reach a ready help centre in under 5 minutes' },
      { id: 'con-be-e2e-c2', label: 'Get three sourced answers in the widget' },
      { id: 'con-be-e2e-c3', label: 'Complete the live reply and email reply round trip' },
      { id: 'con-be-e2e-c4', label: 'Run the end-to-end check SQL', trigger: 'copy:con-be-e2e-sql' },
    ],
  },
]
