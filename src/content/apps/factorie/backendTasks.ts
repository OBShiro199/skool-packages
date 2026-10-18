import type { Task } from '../../types'
import { code, eli5, keys, links, mistakes, p, prompt, steps, table, task, tip, warn } from './helpers'
import { promptShared } from './edgePrompts'

export const backendTasks: Task[] = [
  task({
    id: 'fac-be-shared',
    title: 'Build the shared edge function helpers',
    outcome: 'One _shared folder with auth, validation, retries, metering, the OpenRouter and Claude clients, the injection guard and the answer parser that all nine Factorie functions reuse.',
    minutes: 45,
    xp: 45,
    blocks: [
      eli5('Why build helpers first?', 'Nine functions all need to check who is calling, refuse bad input, retry politely, count what they spend and read AI answers the same way. Writing that once means one place to get right. The answer parser is the heart of Factorie, so it gets its own tests.'),
      prompt('fac-be-shared-prompt', 'Build supabase/functions/_shared', promptShared),
      steps(
        'Paste the prompt into Claude Code in plan mode (Shift + Tab). Read the plan, then reply "OK".',
        'When it finishes, check the parser tests pass: you should see "ok | 8 passed" from deno test.',
        'Ask: "Show me requireCron and explain why it does not use ===." The answer should mention timing attacks.',
      ),
      mistakes([
        { mistake: 'deno: command not found.', fix: 'Install Deno once: `curl -fsSL https://deno.land/install.sh | sh` (Mac/Linux) or `irm https://deno.land/install.ps1 | iex` (Windows PowerShell), then open a new terminal.' },
        { mistake: 'The parser finds "Notion" in "a notion of quality".', fix: 'Common-word brand names must go to Claude for confirmation. Ask Claude to add the word to the stoplist in parser.ts and add a test for it.' },
        { mistake: 'Claude puts plan limits as numbers in ledger.ts.', fix: 'Limits live only in the plans table and plan_limits(). Ask it to read them from the database.' },
      ]),
    ],
    checklist: [['Run the shared helpers prompt', 'copy:fac-be-shared-prompt'], 'See the 8 parser tests pass', 'Ask Claude to explain requireCron'],
  }),
  task({
    id: 'fac-be-openrouter',
    title: 'Set up OpenRouter (the six AI engines)',
    outcome: 'One OpenRouter key with a spend limit reaches ChatGPT, Perplexity, Gemini, Claude, DeepSeek and Grok, and every model slug in the engines table is checked.',
    minutes: 25,
    xp: 40,
    blocks: [
      eli5('What is OpenRouter?', 'OpenRouter is one front door to hundreds of AI models. Instead of six accounts with six bills, you get one key and one balance, and you pick the model by name in each request. Factorie asks the same question through that one door six times, once per engine.'),
      table(['Item (checked Oct 2026)', 'Price', 'Notes'], [
        ['Account', 'Free', 'Pay as you go with credits'],
        ['Buying credits', 'About 5.5% fee on card top-ups [verify]', 'Model prices are passed through at the provider\'s rate'],
        ['openai/gpt-5-mini', '$0.25 in / $2 out per million tokens', '+ OpenAI web search, about $10 per 1,000 searches'],
        ['perplexity/sonar', '$1 / $1 per million', '+ about $5 per 1,000 requests'],
        ['google/gemini-2.5-flash', '$0.30 / $2.50 per million', '+ Exa web results, about $4 per 1,000 results [verify]'],
        ['anthropic/claude-haiku-5.5', '$0.10 / $0.50 per million [verify slug]', '+ Anthropic web search, about $10 per 1,000'],
        ['deepseek/deepseek-v4.1-flash', 'About $0.15 / $0.60 per million [verify]', 'No web search (memory engine)'],
        ['x-ai/grok-4.1-fast', 'About $0.20 / $0.50 per million [verify]', '+ xAI search at xAI\'s rate'],
      ]),
      steps(
        'Go to https://openrouter.ai and click **Sign in** (top right). Sign up with Google or email.',
        'Top right avatar > **Credits** (or open https://openrouter.ai/settings/credits) > **Add credits** > buy $20. Turn auto top-up **off** for now.',
        'Avatar > **Keys** (https://openrouter.ai/settings/keys) > **Create API key**. Name: `factorie-prod`. **Credit limit: 20** (dollars). Click **Create**.',
        'Copy the key (starts with `sk-or-v1-`). OpenRouter shows it once. Paste it into your password manager first.',
        'Run the secrets command below in a normal terminal (not inside Claude Code).',
        'Run the two test calls. The first is free; the second costs about $0.01.',
        'Check every slug: open each link in the table below. If a page says the model was removed, search openrouter.ai/models for the newest model from that company and update the engines row with the SQL below.',
      ),
      keys([
        { name: 'OPENROUTER_API_KEY', where: 'openrouter.ai > avatar > Keys > Create API key (sk-or-v1-...)', pasteInto: 'Supabase secrets', secret: true },
      ]),
      code('fac-be-openrouter-secret', 'Terminal (outside Claude Code)', 'bash', `npx supabase secrets set OPENROUTER_API_KEY=paste_value_here`),
      code('fac-be-openrouter-test', 'Terminal: two test calls', 'bash', `
# 1. Free: shows your key's limit and usage
curl -s https://openrouter.ai/api/v1/key -H "Authorization: Bearer $OPENROUTER_API_KEY"
# Good: {"data":{"label":"factorie-prod", "limit":20, "usage":0, ...}}

# 2. About $0.01: ask ChatGPT (gpt-5-mini) a buyer question with web search on
curl -s https://openrouter.ai/api/v1/chat/completions \\
  -H "Authorization: Bearer $OPENROUTER_API_KEY" \\
  -H "Content-Type: application/json" \\
  -H "HTTP-Referer: http://localhost:3000" -H "X-Title: Factorie" \\
  -d '{"model":"openai/gpt-5-mini","max_tokens":600,
       "plugins":[{"id":"web","engine":"native"}],
       "messages":[{"role":"user","content":"What are the best AI visibility tracking tools for a B2B SaaS startup?"}]}'
# Good: choices[0].message.content has a list of tools, annotations has url_citation items,
# and usage.cost is a small number like 0.011.
# 401 = key copied wrong. 402 = no credits. 400 "plugin" = drop "engine" and add :online to the model.`),
      code('fac-be-openrouter-slugs', 'SQL Editor: see and swap engine slugs', 'sql', `
select key, openrouter_model, web_mode, is_enabled from public.engines order by sort;
-- Example swap if a slug was retired:
-- update public.engines set openrouter_model = 'google/gemini-NEW-flash', is_enabled = true where key = 'gemini';`),
      links([
        { label: 'OpenRouter keys', url: 'https://openrouter.ai/settings/keys' },
        { label: 'Chat completions docs', url: 'https://openrouter.ai/docs/api/reference/overview' },
        { label: 'Web search docs', url: 'https://openrouter.ai/docs/guides/features/plugins/web-search' },
        { label: 'openai/gpt-5-mini', url: 'https://openrouter.ai/openai/gpt-5-mini' },
        { label: 'perplexity/sonar', url: 'https://openrouter.ai/perplexity/sonar' },
        { label: 'All models', url: 'https://openrouter.ai/models' },
      ]),
      warn('Keep the credit limit on the key', 'The key\'s $20 limit is your last line of defence. Even if every guard in the code failed, OpenRouter stops at $20. Raise it by $20 at a time as customers grow (about $6 per Starter customer a month).'),
      mistakes([
        { mistake: 'Perplexity answers have no citations in annotations.', fix: 'Sonar returns sources in a top-level citations or search_results array. The parser reads those too (PRD 10.3). Check Claude\'s askEngine returns them.' },
        { mistake: 'Every Gemini call fails with 400.', fix: 'The slug was retired. Find the newest Flash model on openrouter.ai/models, update the engines row, and set is_enabled back to true.' },
        { mistake: 'Costs look double what the PRD says.', fix: 'Check max_tokens is 1200 and Exa max_results is 3. Bigger web results add input tokens fast.' },
      ]),
    ],
    checklist: [
      'Create the OpenRouter account and add $20 credit',
      'Create the factorie-prod key with a $20 limit',
      ['Set the OpenRouter Supabase secret', 'copy:fac-be-openrouter-secret'],
      ['Run both test calls', 'copy:fac-be-openrouter-test'],
      ['Check every engine slug', 'copy:fac-be-openrouter-slugs'],
    ],
  }),
  task({
    id: 'fac-be-anthropic',
    title: 'Set up the Claude API (summaries, prompts, parsing, recommendations)',
    outcome: 'Factorie can call Claude Sonnet 5.5 for brand summaries, prompt writing and recommendations, and Claude Haiku 5.5 to read every answer.',
    minutes: 15,
    xp: 25,
    blocks: [
      eli5('Why Claude as well as OpenRouter?', 'OpenRouter is how Factorie asks the six engines questions, exactly like a buyer would. Claude is Factorie\'s own analyst: it reads your site, writes the questions and reads every answer to check sentiment and spot mentions regex cannot. Using the Claude API directly gives strict JSON output, so the data is always the right shape.'),
      table(['Model (checked Oct 2026)', 'Price per million tokens', 'Used for', 'About'], [
        ['claude-sonnet-5-5', '$2 in / $10 out', 'Brand summary, prompt writing, recommendations', '$0.11 per customer a month'],
        ['claude-haiku-5-5', '$0.10 in / $0.50 out', 'Parsing each answer (pass 2)', '$0.007 per prompt a month'],
      ]),
      steps(
        'Go to https://platform.claude.com and sign up (or log in).',
        'Left menu > **Billing** > **Buy credits** > $10. Turn on **Auto reload** at $5 if you like.',
        'Left menu > **API keys** > **Create key**. Name: `factorie-prod`. Copy the key (starts with `sk-ant-`).',
        'Run the secrets command below, then the test call.',
      ),
      keys([
        { name: 'ANTHROPIC_API_KEY', where: 'platform.claude.com > API keys > Create key (sk-ant-...)', pasteInto: 'Supabase secrets', secret: true },
      ]),
      code('fac-be-anthropic-secret', 'Terminal (outside Claude Code)', 'bash', `npx supabase secrets set ANTHROPIC_API_KEY=paste_value_here`),
      code('fac-be-anthropic-test', 'Terminal: structured output test (costs under $0.001)', 'bash', `
curl -s https://api.anthropic.com/v1/messages \\
  -H "x-api-key: $ANTHROPIC_API_KEY" -H "anthropic-version: 2023-06-01" \\
  -H "content-type: application/json" \\
  -d '{"model":"claude-haiku-5-5","max_tokens":300,
       "output_config":{"effort":"low","format":{"type":"json_schema","schema":{
         "type":"object","additionalProperties":false,"required":["mentioned","sentiment"],
         "properties":{"mentioned":{"type":"boolean"},"sentiment":{"type":"string","enum":["positive","neutral","negative"]}}}}},
       "messages":[{"role":"user","content":"<answer>1. Profound is pricey. 2. Factorie is great value.</answer> Is Factorie mentioned, and how?"}]}'
# Good: content[0].text is JSON like {"mentioned":true,"sentiment":"positive"}`),
      mistakes([
        { mistake: '400 "output_config" not recognised.', fix: 'You copied an old example with output_format. Use output_config.format exactly as above.' },
        { mistake: '401 invalid x-api-key.', fix: 'The key has a space or a line break. Copy it again and re-run the secrets command.' },
        { mistake: 'Recommendations cost more than expected.', fix: 'Check generate-recommendations caps own pages at 10 x 1,500 characters and the cron only refreshes weekly.' },
      ]),
    ],
    checklist: [
      'Buy $10 of Claude API credit',
      'Create the factorie-prod key',
      ['Set the Anthropic Supabase secret', 'copy:fac-be-anthropic-secret'],
      ['Run the structured output test', 'copy:fac-be-anthropic-test'],
    ],
  }),
  task({
    id: 'fac-be-firecrawl',
    title: 'Set up Firecrawl (reading customer websites)',
    outcome: 'Factorie can list a customer\'s pages with /v2/map and read up to 12 of them as clean markdown with /v2/scrape.',
    minutes: 15,
    xp: 25,
    blocks: [
      eli5('What does Firecrawl do?', 'Websites are messy: menus, cookie banners, scripts. Firecrawl visits a page like a browser would and hands back only the words as tidy text. Factorie gives that text to Claude to understand what the customer sells. Map finds the pages; scrape reads them.'),
      table(['Plan (checked Oct 2026)', 'Price', 'Credits', 'Covers about'], [
        ['Free', '$0', '500 one-off [verify]', 'Building and testing'],
        ['Hobby', 'About $16/mo [verify]', 'About 3,000 a month [verify]', '85 customers'],
        ['Standard', '$83/mo', '100,000 a month', '2,800 customers'],
      ]),
      p('Credits: /v2/map costs 1 credit per call, /v2/scrape costs 1 credit per page. A new customer uses about 13 (1 map + up to 12 pages), then about 20 a month for the weekly recommendation refresh. Credits do not roll over.'),
      steps(
        'Go to https://www.firecrawl.dev and click **Sign up**. Use Google or email.',
        'In the dashboard, open **API Keys** (left menu). Copy the default key (starts with `fc-`), or click **Create** and name it `factorie-prod`.',
        'Stay on Free while you build. Before launch: **Billing** > pick Hobby.',
        'Run the secrets command and the test call.',
      ),
      keys([
        { name: 'FIRECRAWL_API_KEY', where: 'firecrawl.dev dashboard > API Keys (fc-...)', pasteInto: 'Supabase secrets', secret: true },
      ]),
      code('fac-be-firecrawl-secret', 'Terminal (outside Claude Code)', 'bash', `npx supabase secrets set FIRECRAWL_API_KEY=paste_value_here`),
      code('fac-be-firecrawl-test', 'Terminal: map then scrape (2 credits)', 'bash', `
curl -s -X POST https://api.firecrawl.dev/v2/map \\
  -H "Authorization: Bearer $FIRECRAWL_API_KEY" -H "Content-Type: application/json" \\
  -d '{"url":"https://example.com","limit":20}'
# Good: {"success":true,"links":[{"url":"https://example.com", ...}]}

curl -s -X POST https://api.firecrawl.dev/v2/scrape \\
  -H "Authorization: Bearer $FIRECRAWL_API_KEY" -H "Content-Type: application/json" \\
  -d '{"url":"https://example.com","formats":["markdown"],"onlyMainContent":true}'
# Good: {"success":true,"data":{"markdown":"# Example Domain ...","metadata":{"title":"Example Domain", ...}}}`),
      links([
        { label: 'Firecrawl dashboard', url: 'https://www.firecrawl.dev/app' },
        { label: 'Scrape docs', url: 'https://docs.firecrawl.dev/features/scrape' },
        { label: 'Map docs', url: 'https://docs.firecrawl.dev/features/map' },
        { label: 'Pricing', url: 'https://www.firecrawl.dev/pricing' },
      ]),
      mistakes([
        { mistake: 'Map returns only the homepage.', fix: 'Some sites have no sitemap and few links. That is fine: scrape-site still reads the homepage and onboarding continues.' },
        { mistake: '402 Payment required.', fix: 'Free credits are used up. Upgrade to Hobby in Billing, or wait if you are only testing.' },
        { mistake: 'Scrape returns a cookie banner instead of content.', fix: 'Keep onlyMainContent true. If a site still blocks it, onboarding falls back to empty fields the user fills in.' },
      ]),
    ],
    checklist: [
      'Sign up for Firecrawl and copy the fc- key',
      ['Set the Firecrawl Supabase secret', 'copy:fac-be-firecrawl-secret'],
      ['Run the map and scrape test', 'copy:fac-be-firecrawl-test'],
    ],
  }),
  task({
    id: 'fac-be-cron',
    title: 'Schedule the checks with pg_cron and pg_net',
    outcome: 'Six database schedules wake run-checks every minute, score hourly, send digests hourly, refresh recommendations nightly and tidy old answers, all with the cron secret read from Vault.',
    minutes: 20,
    xp: 40,
    blocks: [
      eli5('The alarm clock in the database', 'pg_cron is an alarm clock inside Postgres. Every minute it rings and pg_net makes a web request to your edge function, carrying a secret password in a header. The password lives in Supabase Vault (an encrypted safe), so it never sits in plain text.'),
      steps(
        'Make the cron secret in a terminal: `openssl rand -hex 32`. Copy the long string.',
        'Set it as a function secret: `npx supabase secrets set CRON_SECRET=paste_value_here`.',
        'In Supabase > **Project Settings** > **General**, copy your **Project ID** (the ref). Your project URL is `https://<ref>.supabase.co`.',
        'Open Supabase > **SQL Editor** > **+ New query**. Paste the SQL below, replace the two placeholders, and click **Run**.',
        'Check it: Supabase > **Integrations** > **Cron** (or run the last select) shows six jobs, all active.',
      ),
      code('fac-be-cron-sql', 'SQL Editor: store secrets in Vault and schedule six jobs', 'sql', `
-- 1. Put the project URL and cron secret in Vault (run once)
select vault.create_secret('https://YOUR-REF.supabase.co', 'project_url');
select vault.create_secret('PASTE-YOUR-CRON-SECRET', 'cron_secret');

-- 2. A small helper that calls an edge function with the secret header
create or replace function public.fac_call(p_fn text, p_body jsonb default '{}'::jsonb)
returns bigint language sql security definer set search_path = '' as $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/' || p_fn,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')),
    body := p_body,
    timeout_milliseconds := 5000
  );
$$;
revoke execute on function public.fac_call(text, jsonb) from public, anon, authenticated;

-- 3. The schedules (UTC). cron.schedule with the same name updates the job.
select cron.schedule('fac-run-checks',      '* * * * *',   $$ select public.fac_call('run-checks') $$);
select cron.schedule('fac-release-stuck',   '*/5 * * * *', $$ select public.release_stuck_jobs() $$);
select cron.schedule('fac-score-day',       '15 * * * *',  $$ select public.fac_call('score-day') $$);
select cron.schedule('fac-send-digest',     '5 * * * *',   $$ select public.fac_call('send-digest') $$);
select cron.schedule('fac-recommendations', '30 3 * * *',  $$ select public.fac_call('generate-recommendations') $$);
select cron.schedule('fac-trim',            '0 4 * * *',   $$ select public.trim_old_answers() $$);

-- 4. Check
select jobname, schedule, active from cron.job order by jobname;`),
      code('fac-be-cron-debug', 'SQL Editor: is it firing?', 'sql', `
-- Last 10 runs of any job (status and errors)
select j.jobname, d.status, d.return_message, d.start_time
from cron.job_run_details d join cron.job j on j.jobid = d.jobid
order by d.start_time desc limit 10;

-- Last 10 HTTP responses from pg_net (kept about 6 hours)
select id, status_code, left(content::text, 120) as body, created
from net._http_response order by created desc limit 10;

-- Pause everything instantly (and resume with false)
update public.app_settings set value = 'true'::jsonb where key = 'checks_paused';`),
      tip('The free plan pauses', 'Supabase free projects pause after a week with no traffic, and the alarm clock stops with them. Move to Pro ($25/month) before your first paying customer.'),
      mistakes([
        { mistake: 'net._http_response shows 401 for every call.', fix: 'The Vault cron_secret and the CRON_SECRET function secret do not match. Update one: select vault.update_secret((select id from vault.secrets where name = \'cron_secret\'), \'NEW-VALUE\');' },
        { mistake: 'The job runs but nothing happens.', fix: 'Check checks_paused is false in app_settings and that brands have status active and a next_check_at in the past.' },
        { mistake: '"schema net does not exist".', fix: 'pg_net is not on. Run create extension if not exists pg_net with schema extensions; and try again.' },
      ]),
    ],
    checklist: [
      'Make the cron secret and set it as a Supabase secret',
      ['Run the Vault and schedule SQL', 'copy:fac-be-cron-sql'],
      'See six active jobs',
      ['Check the jobs are firing with the debug SQL', 'copy:fac-be-cron-debug'],
    ],
  }),
  task({
    id: 'fac-be-e2e',
    title: 'Test the whole pipeline end to end',
    outcome: 'A brand-new account goes from URL to first score to digest email, with every number checked in SQL and every cost recorded once.',
    minutes: 40,
    xp: 60,
    blocks: [
      eli5('Why test it all in one go?', 'Each function can pass on its own and the chain still break: the scrape works but the prompts never get approved, or the checks finish but nothing scores. This task walks one fake customer through the whole journey and checks the database at every step.'),
      steps(
        'Open a private browser window and sign up with a new email (use a + alias, e.g. you+test1@gmail.com).',
        'Onboarding step 1: paste a real SaaS website you know well. Wait for "Writing your brand summary" to tick.',
        'Steps 2 to 4: accept the summary, keep 3 competitors, approve 20 prompts.',
        'Step 5: start the trial with Stripe test card 4242 4242 4242 4242, any future date, any CVC.',
        'Step 6: watch the run finish (about 2 to 4 minutes for 100 checks).',
        'Open /app: the four score cards show numbers. Open one prompt and read the ChatGPT answer.',
        'Run the SQL checks below and compare with the notes in each comment.',
        'In Settings > Digest, set the hour to the current hour and click "Send me a test digest". The email arrives.',
      ),
      code('fac-be-e2e-sql', 'SQL Editor: end-to-end checks', 'sql', `
-- 1. The run finished and every job is accounted for (failed should be 0 or close)
select kind, status, total_jobs, done_jobs, failed_jobs, skipped_jobs, round(cost_usd, 4) as cost
from public.check_runs order by created_at desc limit 1;

-- 2. Answers were parsed (parse_mode full on most, regex_only on refusals)
select engine_key, count(*) as answers, count(*) filter (where mentioned) as mentioned,
       count(*) filter (where parse_mode = 'regex_only') as regex_only
from public.check_results where run_id = (select id from public.check_runs order by created_at desc limit 1)
group by engine_key order by engine_key;

-- 3. Scores exist for each engine plus 'all'
select engine_key, visibility, share_of_voice, avg_position, mention_rate
from public.daily_scores where day = current_date order by engine_key;

-- 4. Money: no job charged twice, and the total looks right (about $1.20 for 20 prompts x 5 engines)
select vendor, operation, count(*), round(sum(cost_usd), 4) as usd
from public.usage_ledger where created_at > now() - interval '1 hour' group by 1, 2 order by 1, 2;
select ref, operation, count(*) from public.usage_ledger group by 1, 2 having count(*) > 1; -- expect 0 rows

-- 5. Emails sent once each
select kind, ref, day, resend_id is not null as sent from public.email_log order by created_at desc limit 5;`),
      prompt('fac-be-e2e-prompt', 'Ask Claude Code to write the automated version', `
Write Playwright tests for @PRD.md acceptance tests 1, 3, 5, 12 and 18 in tests/e2e/.
Use a test user created with the Supabase admin API in a beforeAll and deleted in afterAll.
Stub nothing: these run against my dev Supabase project with real functions, so mark them
with test.slow() and run them only with npm run test:e2e. Then write tests/sql/acceptance.sql
with tests 4, 6, 7 and 13 as SQL that raises an exception when a check fails, so I can paste it
into the SQL editor and see "Success" or the failing check.
`),
      mistakes([
        { mistake: 'The run stays "running" forever.', fix: 'A job is stuck. Wait 10 minutes for release_stuck_jobs, or run select public.release_stuck_jobs(); and check Edge Functions > check-prompt > Logs for the error.' },
        { mistake: 'Scores are empty after the run.', fix: 'score-day did not run. Call select public.compute_daily_scores(\'<brand id>\'); and check the prompts\' text matches prompt_text_snapshot (editing a prompt mid-run resets its history).' },
        { mistake: 'Cost per check is 3x the PRD.', fix: 'Look at prompt_tokens on check_results. If web engines send 10,000+ input tokens, lower Exa max_results to 2 or switch that engine to builtin search.' },
      ]),
    ],
    checklist: [
      'Sign up a fresh test account and finish onboarding',
      'Watch the first run complete',
      ['Run the end-to-end SQL checks', 'copy:fac-be-e2e-sql'],
      'Receive the test digest email',
      ['Ask Claude for the automated tests', 'copy:fac-be-e2e-prompt'],
    ],
  }),
]
