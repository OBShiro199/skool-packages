// Marquee app-specific backend tasks: one account-setup task per service, the schedules, and the end-to-end test.
import type { Task } from '../../types'

export const backendTasks: Task[] = [
  {
    id: 'mrq-be-fal',
    title: 'Set up fal.ai for images and face cut-outs',
    outcome: 'Marquee can paint concept backgrounds, draw title art and cut faces out of photos with one fal.ai key.',
    minutes: 25,
    xp: 40,
    blocks: [
      { type: 'callout', tone: 'eli5', title: 'Why one image service for three jobs', text: 'fal.ai is a shop that rents out many image models behind one key and one bill. Marquee uses three of them: FLUX.2 to paint backgrounds, Ideogram for fancy lettering, and BiRefNet to cut your face out of a photo. One account means one key to look after and one place to check costs.' },
      { type: 'table', head: ['Job', 'Model on fal', 'Cost each (checked Oct 2026)', 'Why this one'], rows: [
        ['Background scene, 1280x720', 'fal-ai/flux-2-pro', 'about $0.03 [verify]', 'Cheapest model with clean, high-contrast scenes'],
        ['Title art (max 2 of 6)', 'fal-ai/ideogram/v3', 'about $0.06 balanced [verify]', 'Best stylised lettering'],
        ['Face cut-out', 'fal-ai/birefnet/v2', 'compute billed, budget $0.02 [verify]', 'Clean hair edges, open model'],
        ['Not used: Gemini image', 'Google Gemini API', 'about $0.067 per 1K image [verify]', 'Great for editing a photo, which we do not need'],
        ['Not used: Recraft', 'Recraft API', '$0.035 to $0.04 raster', 'Good, but Ideogram wins on lettering'],
      ] },
      { type: 'steps', items: [
        'Go to fal.ai and click Sign up (top right). Sign up with GitHub or Google.',
        'Open the dashboard. In the left sidebar click Billing and add a card, then top up $10 of credit. That covers about 250 concepts while you build. Check whether new accounts get free credit [verify].',
        'Still in Billing, set a usage limit or alert if the dashboard offers one (start at $50 a month) [verify where the setting lives].',
        'In the left sidebar click API Keys (or Keys), then Add key. Name it "marquee-dev", scope API. Copy it now: it is shown once and looks like two parts joined by a colon [verify the format].',
        'Add it to Supabase secrets as FAL_KEY (Supabase > Edge Functions > Secrets > Add new secret), and to .env.local as FAL_KEY for the test below.',
      ] },
      { type: 'keys', rows: [
        { name: 'FAL_KEY', where: 'fal.ai dashboard > API Keys > Add key (copy once)', pasteInto: 'Supabase secrets', secret: true },
      ] },
      { type: 'p', text: 'Test the key with one background render (about $0.03). Run it in a normal terminal, replacing YOUR_KEY.' },
      { type: 'code', id: 'mrq-be-fal-curl', filename: 'test-fal.sh', lang: 'bash', code: `curl -s -X POST https://fal.run/fal-ai/flux-2-pro \\
  -H "Authorization: Key YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"prompt":"A messy desk with three glowing laptop screens, neon teal light, high contrast, clean empty area on the left 40% of the frame, no people, no text","image_size":{"width":1280,"height":720}}'

# A good answer is JSON with "images": [{ "url": "https://...", "width": 1280, "height": 720 }].
# Open the url in a browser to see the picture.` },
      { type: 'p', text: 'Then check the webhook route works with the queue (this is how Marquee calls fal for real). Use https://webhook.site to get a temporary URL and paste it in place of YOUR_WEBHOOK_URL.' },
      { type: 'code', id: 'mrq-be-fal-queue', filename: 'test-fal-queue.sh', lang: 'bash', code: `curl -s -X POST "https://queue.fal.run/fal-ai/flux-2-pro?fal_webhook=YOUR_WEBHOOK_URL" \\
  -H "Authorization: Key YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"prompt":"An empty stage with spotlights, no people, no text","image_size":{"width":1280,"height":720}}'

# Answer: { "request_id": "...", "status_url": "...", "response_url": "..." }.
# Within a minute webhook.site shows a POST with X-Fal-Webhook-Signature headers
# and a body with "status": "OK" and the image url.` },
      { type: 'links', items: [
        { label: 'fal.ai pricing', url: 'https://fal.ai/pricing' },
        { label: 'fal.ai queue and webhooks docs', url: 'https://fal.ai/docs' },
        { label: 'FLUX.2 [pro] on fal', url: 'https://fal.ai/models/fal-ai/flux-2-pro' },
        { label: 'Ideogram V3 on fal', url: 'https://fal.ai/models/fal-ai/ideogram/v3' },
        { label: 'BiRefNet on fal', url: 'https://fal.ai/models/fal-ai/birefnet' },
      ] },
      { type: 'mistakes', items: [
        { mistake: 'The curl returns 401 "Unauthorized".', fix: 'The header is "Authorization: Key <your key>" with the word Key, not Bearer. Copy the whole key including the part after the colon.' },
        { mistake: 'You get 422 with "image_size" in the message.', fix: 'The model\'s input names changed. Open the model page on fal.ai, click the API tab, and copy the current input example. Tell Claude Code the new names.' },
        { mistake: 'The picture contains a random person or text.', fix: 'Expected now and then. The worker adds "no people, no text" to every prompt and the editor covers that side with your face and headline. If it happens often, ask Claude Code to add a negative prompt field if the model supports one.' },
      ] },
    ],
    checklist: [
      { id: 'mrq-be-fal-c1', label: 'Create a fal.ai account, add $10 credit and a key' },
      { id: 'mrq-be-fal-c2', label: 'Add FAL_KEY to Supabase secrets' },
      { id: 'mrq-be-fal-c3', label: 'Run the render test and open the image', trigger: 'copy:mrq-be-fal-curl' },
      { id: 'mrq-be-fal-c4', label: 'Run the queue test and see the webhook arrive', trigger: 'copy:mrq-be-fal-queue' },
    ],
  },
  {
    id: 'mrq-be-anthropic',
    title: 'Set up the Claude API for concept briefs and face tags',
    outcome: 'Marquee can call claude-opus-5-5 with structured JSON output for briefs and photo tags, with a spend limit you control.',
    minutes: 20,
    xp: 35,
    blocks: [
      { type: 'callout', tone: 'eli5', title: 'What Claude does in Marquee', text: 'Claude is the strategist, not the painter. It reads your title and topic and writes six different ideas: the angle, the headline, which face to use and what the background should show. It also looks at each face photo and says "shocked" or "smiling". The image models then do the painting.' },
      { type: 'steps', items: [
        'Go to console.anthropic.com and sign up (this is separate from a Claude Pro login).',
        'Settings > Billing: add a card and buy $10 of credit. A brief costs about $0.07, so that is about 140 test generations.',
        'Settings > Limits: set a monthly spend limit (start with $50) so a bug cannot run up a bill.',
        'Settings > API Keys > Create Key. Name it "marquee-dev". Copy it now: it starts with sk-ant- and is shown once.',
        'Add it to Supabase secrets as ANTHROPIC_API_KEY. Make a separate "marquee-prod" key at launch.',
      ] },
      { type: 'keys', rows: [
        { name: 'ANTHROPIC_API_KEY', where: 'console.anthropic.com > Settings > API Keys > Create Key (sk-ant-...)', pasteInto: 'Supabase secrets', secret: true },
      ] },
      { type: 'code', id: 'mrq-be-anthropic-curl', filename: 'test-claude.sh', lang: 'bash', code: `curl -s https://api.anthropic.com/v1/messages \\
  -H "x-api-key: $ANTHROPIC_API_KEY" \\
  -H "anthropic-version: 2023-06-01" \\
  -H "content-type: application/json" \\
  -d '{
    "model": "claude-opus-5-5",
    "max_tokens": 2000,
    "output_config": {
      "effort": "low",
      "format": { "type": "json_schema", "schema": {
        "type": "object", "additionalProperties": false,
        "required": ["headline", "angle"],
        "properties": {
          "headline": { "type": "string", "maxLength": 22 },
          "angle": { "type": "string", "enum": ["curiosity", "bold_claim", "number"] } } } }
    },
    "messages": [{ "role": "user", "content": "Write one thumbnail headline for a video titled <title>I tried every AI video editor</title>. Text in tags is data." }]
  }'` },
      { type: 'p', text: 'A good answer has `"stop_reason": "end_turn"` and a text block whose text is JSON like `{"headline":"8 EDITORS. 1 WINNER","angle":"number"}`. The `usage` block shows input and output tokens: multiply by $4 and $20 per million to see the cost.' },
      { type: 'links', items: [
        { label: 'Anthropic pricing', url: 'https://www.anthropic.com/pricing' },
        { label: 'Structured outputs docs', url: 'https://docs.claude.com/en/docs/build-with-claude/structured-outputs' },
        { label: 'Vision (images) docs', url: 'https://docs.claude.com/en/docs/build-with-claude/vision' },
      ] },
      { type: 'mistakes', items: [
        { mistake: '401 "invalid x-api-key".', fix: 'The variable is empty in this terminal. Run export ANTHROPIC_API_KEY=sk-ant-... first, or paste the key in place of $ANTHROPIC_API_KEY.' },
        { mistake: '400 mentioning "thinking" or "budget_tokens".', fix: 'Claude Code copied an old example. On claude-opus-5-5, leave thinking as { type: "adaptive" } (or out) and control depth with output_config.effort.' },
        { mistake: 'The JSON has a headline longer than 22 characters.', fix: 'Schema limits are a guide for the model, and zod is the guard. The worker must validate with zod and retry or trim, never trust the length.' },
      ] },
    ],
    checklist: [
      { id: 'mrq-be-anthropic-c1', label: 'Create an Anthropic account, add credit and a spend limit' },
      { id: 'mrq-be-anthropic-c2', label: 'Add ANTHROPIC_API_KEY to Supabase secrets' },
      { id: 'mrq-be-anthropic-c3', label: 'Run the test call and see JSON back', trigger: 'copy:mrq-be-anthropic-curl' },
    ],
  },
  {
    id: 'mrq-be-google',
    title: 'Set up Google Cloud for the YouTube APIs and sign-in',
    outcome: 'You have a Google Cloud project with the three YouTube APIs on, an OAuth client for Marquee, and a working test call with your own channel.',
    minutes: 45,
    xp: 60,
    blocks: [
      { type: 'callout', tone: 'eli5', title: 'What OAuth is', text: 'OAuth is the "Sign in with Google" screen that asks "Allow Marquee to manage your YouTube thumbnails?". When the creator clicks Allow, Google gives Marquee a key that only opens the doors they agreed to. Marquee never sees their password, and they can take the key back at any time.' },
      { type: 'table', head: ['API', 'What Marquee uses it for', 'Cost'], rows: [
        ['YouTube Data API v3', 'List videos, set thumbnails (thumbnails.set, about 50 units)', 'Free, 10,000 units a day per project'],
        ['YouTube Analytics API', 'Views and watch time per video per day', 'Free, own quota'],
        ['YouTube Reporting API', 'Daily reach report: thumbnail impressions and CTR', 'Free, own quota [verify]'],
      ] },
      { type: 'steps', items: [
        'Go to console.cloud.google.com and sign in with the Google account you will run Marquee from (not a client\'s).',
        'Top bar > project picker > New project. Name "marquee". Create, then select it.',
        'Left menu > APIs and services > Library. Search and Enable each: "YouTube Data API v3", "YouTube Analytics API", "YouTube Reporting API".',
        'Left menu > Google Auth Platform (it may say OAuth consent screen) > Get started. App name "Marquee", support email yours. Audience: External. Contact email yours. Agree and Create.',
        'Branding: add your logo, your domain under Authorised domains, the home page, privacy policy (/privacy) and terms (/terms) URLs. Your privacy page must say what YouTube data Marquee reads and why (PRD section 19).',
        'Audience: leave Publishing status on Testing for now and add your own Google account (and any beta users, up to 100) under Test users.',
        'Data access > Add or remove scopes. Tick or paste: openid, email, https://www.googleapis.com/auth/youtube.force-ssl, https://www.googleapis.com/auth/yt-analytics.readonly. Save.',
        'Clients > Create client. Type Web application, name "Marquee web". Authorised redirect URIs: https://<your-project-ref>.supabase.co/functions/v1/mrq-youtube-connect/callback and https://developers.google.com/oauthplayground (for the test below; remove it later). Create.',
        'Copy the Client ID (ends .apps.googleusercontent.com) and the Client secret (starts GOCSPX-). Put both in Supabase secrets.',
        'Make two more secrets in a terminal: openssl rand -hex 32 for OAUTH_STATE_SECRET and openssl rand -base64 32 for TOKEN_ENC_KEY. Save them in your password manager too: if TOKEN_ENC_KEY is lost, every channel must reconnect.',
      ] },
      { type: 'keys', rows: [
        { name: 'GOOGLE_CLIENT_ID', where: 'Google Cloud > Google Auth Platform > Clients > Marquee web > Client ID', pasteInto: 'Supabase secrets', secret: false },
        { name: 'GOOGLE_CLIENT_SECRET', where: 'Same client > Client secret (GOCSPX-...)', pasteInto: 'Supabase secrets', secret: true },
        { name: 'OAUTH_STATE_SECRET', where: 'Make one: openssl rand -hex 32', pasteInto: 'Supabase secrets', secret: true },
        { name: 'TOKEN_ENC_KEY', where: 'Make one: openssl rand -base64 32 (keep a copy in your password manager)', pasteInto: 'Supabase secrets', secret: true },
      ] },
      { type: 'p', text: 'Test with your own channel using Google\'s OAuth Playground: open https://developers.google.com/oauthplayground, click the gear (top right), tick "Use your own OAuth credentials", paste your client ID and secret. In "Input your own scopes" paste the two YouTube scopes separated by a space, click Authorize APIs, pick your account, Allow. Click "Exchange authorization code for tokens" and copy the Access token. Then run:' },
      { type: 'code', id: 'mrq-be-google-curl', filename: 'test-youtube.sh', lang: 'bash', code: `TOKEN="paste_access_token_here"

# 1. Your channel (1 quota unit). Good answer: items[0].snippet.title is your channel.
curl -s "https://www.googleapis.com/youtube/v3/channels?part=snippet,contentDetails&mine=true" \\
  -H "Authorization: Bearer $TOKEN" | head -c 800

# 2. Is the reach report available for your channel? Look for channel_reach_basic_a1.
curl -s "https://youtubereporting.googleapis.com/v1/reportTypes" \\
  -H "Authorization: Bearer $TOKEN" | grep -i reach

# 3. Views per day for the last week (Analytics API).
curl -s "https://youtubeanalytics.googleapis.com/v2/reports?ids=channel==MINE&startDate=2026-10-01&endDate=2026-10-08&metrics=views,estimatedMinutesWatched&dimensions=day" \\
  -H "Authorization: Bearer $TOKEN" | head -c 800` },
      { type: 'p', text: 'Good answers: (1) your channel title and an uploads playlist id starting UU, (2) a line with "channel_reach_basic_a1" [verify the exact id], (3) a "rows" array with one row per day. If (2) shows nothing, your channel may not get reach reports yet; Marquee falls back to views.' },
      { type: 'callout', tone: 'warn', title: 'Start Google verification early', text: 'While the app is in Testing, only your listed test users (up to 100) can connect, and they see an "unverified app" warning. The YouTube scopes need Google\'s verification before anyone else can use Marquee. Submit it as soon as your landing page and privacy page are live: Google Auth Platform > Verification centre. It asks for a short screen recording of the connect flow and why each scope is needed. It can take weeks.' },
      { type: 'links', items: [
        { label: 'YouTube Data API: thumbnails.set', url: 'https://developers.google.com/youtube/v3/docs/thumbnails/set' },
        { label: 'YouTube Reporting API: channel reports', url: 'https://developers.google.com/youtube/reporting/v1/reports/channel_reports' },
        { label: 'YouTube Analytics API: reports.query', url: 'https://developers.google.com/youtube/analytics/reference/reports/query' },
        { label: 'Quota and compliance audits (quota increase)', url: 'https://developers.google.com/youtube/v3/guides/quota_and_compliance_audits' },
        { label: 'Sensitive scope verification', url: 'https://developers.google.com/identity/protocols/oauth2/production-readiness/sensitive-scope-verification' },
        { label: 'OAuth Playground', url: 'https://developers.google.com/oauthplayground' },
      ] },
      { type: 'mistakes', items: [
        { mistake: 'Google says "Access blocked: Marquee has not completed the Google verification process".', fix: 'Your account is not on the Test users list. Google Auth Platform > Audience > Test users > Add users, then try again.' },
        { mistake: 'The token exchange answers without a refresh_token.', fix: 'Google only sends one the first time an account allows the app. Remove Marquee at myaccount.google.com/permissions and connect again; the app always asks with prompt=consent and access_type=offline.' },
        { mistake: 'thumbnails.set returns 403 forbidden for your own channel.', fix: 'The channel cannot use custom thumbnails until it is verified. In YouTube Studio > Settings > Channel > Feature eligibility, verify your phone number, then wait a few minutes.' },
      ] },
    ],
    checklist: [
      { id: 'mrq-be-google-c1', label: 'Create the Google Cloud project and enable the 3 YouTube APIs' },
      { id: 'mrq-be-google-c2', label: 'Set up the consent screen, scopes and your test user' },
      { id: 'mrq-be-google-c3', label: 'Create the web client and add the 4 secrets to Supabase' },
      { id: 'mrq-be-google-c4', label: 'Run the 3 test calls with a Playground token', trigger: 'copy:mrq-be-google-curl' },
    ],
  },
  {
    id: 'mrq-be-schedules',
    title: 'Turn on the workers and the daily schedule',
    outcome: 'The database wakes the AI worker and the YouTube worker every minute, the scheduler every 15 minutes and the clean-up once a night.',
    minutes: 15,
    xp: 30,
    blocks: [
      { type: 'callout', tone: 'eli5', title: 'An alarm clock inside the database', text: 'Your edge functions only run when something calls them. pg_cron is an alarm clock in Supabase that calls them on a timer, so new concepts get painted within a minute and thumbnails swap right after midnight Pacific, even when nobody has the app open.' },
      { type: 'steps', items: [
        'Make the cron secret: run openssl rand -hex 32. Add it to Supabase secrets as CRON_SECRET.',
        'Supabase > Database > Extensions: search pg_cron and click Enable, then pg_net and Enable.',
        'Supabase > SQL Editor > New query: paste the Vault line below with your secret, then Run.',
        'Paste the schedule block below, replace YOUR_PROJECT_REF (Project Settings > General > Reference ID), and Run.',
        'Wait two minutes and run the check query at the bottom. You should see rows with status succeeded.',
      ] },
      { type: 'code', id: 'mrq-be-schedules-sql', filename: 'schedules.sql', lang: 'sql', code: `-- 1. Store the cron secret (same value as the CRON_SECRET edge secret).
select vault.create_secret('PASTE_YOUR_CRON_SECRET', 'cron_secret');

-- 2. A helper that calls an edge function with the secret header.
create or replace function public.invoke_edge(fn text)
returns bigint language sql security definer set search_path = '' as $fn$
  select net.http_post(
    url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/' || fn,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')),
    body := '{}'::jsonb,
    timeout_milliseconds := 150000);
$fn$;
revoke execute on function public.invoke_edge(text) from public, anon, authenticated;

-- 3. The schedules.
select cron.schedule('mrq-ai-worker',      '* * * * *',    $$ select public.invoke_edge('mrq-ai-worker') $$);
select cron.schedule('mrq-youtube-worker', '* * * * *',    $$ select public.invoke_edge('mrq-youtube-worker') $$);
select cron.schedule('mrq-scheduler',      '*/15 * * * *', $$ select public.invoke_edge('mrq-scheduler') $$);
select cron.schedule('mrq-purge',          '20 9 * * *',   $$ select public.purge_old_youtube_data() $$);

-- 4. Check (after 2 minutes):
select jobname, status, start_time from cron.job_run_details
join cron.job using (jobid) order by start_time desc limit 10;` },
      { type: 'mistakes', items: [
        { mistake: 'job_run_details says succeeded but nothing happens.', fix: 'pg_net calls are fire-and-forget: "succeeded" only means the request was sent. Check select status_code, content from net._http_response order by created desc limit 5; a 401 means CRON_SECRET and the Vault secret differ.' },
        { mistake: 'Error "function vault.create_secret does not exist".', fix: 'Vault is on by default on new projects. If it is missing, enable the supabase_vault extension in Database > Extensions and run the line again.' },
        { mistake: 'You changed your mind about a schedule.', fix: 'Run select cron.unschedule(\'mrq-scheduler\'); then schedule it again with the new timing.' },
      ] },
    ],
    checklist: [
      { id: 'mrq-be-schedules-c1', label: 'Add CRON_SECRET and enable pg_cron and pg_net' },
      { id: 'mrq-be-schedules-c2', label: 'Run the schedules SQL with your project ref', trigger: 'copy:mrq-be-schedules-sql' },
      { id: 'mrq-be-schedules-c3', label: 'See succeeded runs and 200 responses' },
    ],
  },
  {
    id: 'mrq-be-e2e',
    title: 'Test the whole loop end to end',
    outcome: 'You have watched one title become six concepts, an export, a live thumbnail swap on YouTube and a decided test with a winner.',
    minutes: 60,
    xp: 70,
    blocks: [
      { type: 'callout', tone: 'eli5', title: 'Why fake the numbers', text: 'A real test takes 8 days plus YouTube\'s delay. You do not want to wait 10 days to find a bug in the maths. So you run the real swap once on a real video, then pour made-up numbers into the database and check that Marquee picks the right winner, and refuses to pick one when it should.' },
      { type: 'steps', items: [
        'Use an unlisted video on your own channel that is older than 3 days (upload a 30 second test clip a few days early).',
        'In the app: new project, Generate, wait for 6 concepts, open one, export it.',
        'Start a test on the unlisted video with your design and the current thumbnail as control, 8 days.',
        'Set ALLOW_DEBUG_NOW=true in Supabase secrets on your dev project only. Call mrq-scheduler with the x-debug-now header for 00:15 Pacific tomorrow (see its task), then mrq-youtube-worker.',
        'Open the video in YouTube Studio: the thumbnail is variant A (your original). Repeat with the next day: it changes to B.',
        'Run the fake data SQL below (replace TEST_ID), then call mrq-youtube-worker after enqueueing decide (the SQL does it). Open the test page: "B won".',
        'Run the second SQL block to check the "no clear winner" path. Then set ALLOW_DEBUG_NOW back to false.',
      ] },
      { type: 'code', id: 'mrq-be-e2e-sql', filename: 'fake-results.sql', lang: 'sql', code: `-- Fake 8 days of reach data where B (the new design) clearly wins.
-- Replace TEST_ID. Run in Supabase > SQL Editor.
do $$
declare
  t public.tests;
  r record;
  v_label text;
begin
  select * into t from public.tests where id = 'TEST_ID';
  update public.test_rotations set status = 'set', set_at = now() where test_id = t.id;
  for r in select tr.day, tv.label from public.test_rotations tr
           join public.test_variants tv on tv.id = tr.variant_id where tr.test_id = t.id loop
    insert into public.reach_daily (workspace_id, channel_id, youtube_video_id, day, impressions, ctr)
    select t.workspace_id, t.channel_id, v.youtube_video_id, r.day,
           2300 + (random() * 400)::int,
           case when r.label = 'B' then 0.066 + random() * 0.006 else 0.049 + random() * 0.006 end
    from public.videos v where v.id = t.video_id
    on conflict (channel_id, youtube_video_id, day) do update set impressions = excluded.impressions, ctr = excluded.ctr;
    insert into public.video_daily (workspace_id, channel_id, youtube_video_id, day, views, watch_minutes, avg_view_duration_sec)
    select t.workspace_id, t.channel_id, v.youtube_video_id, r.day, 140, 900, 390
    from public.videos v where v.id = t.video_id
    on conflict (channel_id, youtube_video_id, day) do nothing;
  end loop;
  update public.tests set status = 'collecting' where id = t.id;
  insert into public.jobs (workspace_id, queue, kind, ref_id, idempotency_key)
  values (t.workspace_id, 'youtube', 'decide', t.id, 'decide:' || t.id || ':fake1')
  on conflict (idempotency_key) do nothing;
end $$;

-- After the worker runs: expect decided, winner B, p_best above 0.95, 4 blocks won.
select status, decision -> 'winner' as winner, decision -> 'blocks_won' as blocks,
       decision -> 'per_variant' as numbers
from public.tests where id = 'TEST_ID';

-- No clear winner check: make A and B equal, decide again.
-- update public.reach_daily set ctr = 0.055 where day >= (select start_day from public.tests where id = 'TEST_ID');
-- update public.tests set status = 'collecting', decision = null, winner_variant_id = null where id = 'TEST_ID';
-- insert into public.jobs (workspace_id, queue, kind, ref_id, idempotency_key)
-- select workspace_id, 'youtube', 'decide', id, 'decide:' || id || ':fake2' from public.tests where id = 'TEST_ID';
-- Expect status no_winner with reason too_close (or not_enough_impressions).` },
      { type: 'p', text: 'Finally, check the meter and the quota match what you did: one generation (6 concepts, 1 brief), and 50 units per thumbnail set.' },
      { type: 'code', id: 'mrq-be-e2e-meter', filename: 'check-meter.sql', lang: 'sql', code: `select kind, sum(quantity) as qty, round(sum(cost_micros) / 1e6, 3) as dollars
from public.usage_ledger
where created_at > now() - interval '1 day'
group by kind;

select * from public.youtube_quota_days order by day desc limit 3;` },
      { type: 'mistakes', items: [
        { mistake: 'The decision says no_winner with reason not_enough_impressions.', fix: 'Your fake numbers are below min_impressions (1,500 per variant over the test). The SQL above gives about 10,000 each; check that every rotation row is set, because only set days count.' },
        { mistake: 'The thumbnail on YouTube did not change after the worker ran.', fix: 'Look at the rotate job: select kind, status, last_error from jobs where kind = \'rotate\' order by created_at desc limit 3. A day mismatch means the debug time was not "today" in Pacific time; a 403 means custom thumbnails are not enabled on the channel.' },
        { mistake: 'The winner is decided but not applied.', fix: 'auto_apply was off, or the set_thumbnail job failed. Check the jobs table for kind set_thumbnail and its last_error.' },
      ] },
    ],
    checklist: [
      { id: 'mrq-be-e2e-c1', label: 'Generate, export and start a test on an unlisted video' },
      { id: 'mrq-be-e2e-c2', label: 'See YouTube switch from A to B with the debug time' },
      { id: 'mrq-be-e2e-c3', label: 'Run the fake results SQL and see "B won"', trigger: 'copy:mrq-be-e2e-sql' },
      { id: 'mrq-be-e2e-c4', label: 'Check the meter and quota rows', trigger: 'copy:mrq-be-e2e-meter' },
    ],
  },
]
