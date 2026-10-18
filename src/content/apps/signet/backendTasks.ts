// Signet app-specific backend tasks: one account-setup task per service, plus the end-to-end test.
import type { Task } from '../../types'

export const backendTasks: Task[] = [
  {
    id: 'sgn-be-assemblyai',
    title: 'Set up AssemblyAI for call transcription',
    outcome: 'Signet can send a recording to AssemblyAI and get back a transcript with speakers.',
    minutes: 25,
    xp: 40,
    blocks: [
      { type: 'callout', tone: 'eli5', title: 'Why AssemblyAI and not Deepgram?', text: 'Both turn speech into text. For recordings (not live audio), AssemblyAI is cheaper once you add speaker labels: about $0.23 an hour versus roughly $0.38 to $0.58 for Deepgram (checked Oct 2026, re-check both). It also takes a private link to the file and phones you back when it is done, so your server never waits around.' },
      { type: 'table', head: ['', 'AssemblyAI Universal-3.5 Pro', 'Deepgram Nova-3 batch'], rows: [
        ['Per hour', '$0.21', '$0.26 to $0.46 [verify]'],
        ['Speaker labels', '+$0.02/hr', '+$0.12/hr'],
        ['60 min call total', 'about $0.23', 'about $0.38 to $0.58'],
        ['Free credit', '$50, no card', '$200 [verify]'],
        ['Webhook auth', 'Custom header you choose', 'Callback URL'],
        ['Decision', 'Use this', 'Skip for v1'],
      ] },
      { type: 'steps', items: [
        'Go to assemblyai.com and click Sign up (top right). Sign up with Google or email.',
        'You land on the dashboard. In the left sidebar click API Keys. Your default key is shown: click Copy. It is a long string of letters and numbers with no prefix.',
        'Paste it into .env.local as ASSEMBLYAI_API_KEY (for local scripts) and into Supabase secrets (Supabase > Edge Functions > Secrets > Add new secret).',
        'Make the webhook secret: run `openssl rand -hex 32` in a terminal. Save it in Supabase secrets as ASSEMBLYAI_WEBHOOK_SECRET.',
        'Check Billing in the left sidebar: you should see the free credit balance.',
      ] },
      { type: 'keys', rows: [
        { name: 'ASSEMBLYAI_API_KEY', where: 'AssemblyAI dashboard > API Keys > Copy', pasteInto: 'Supabase secrets', secret: true },
        { name: 'ASSEMBLYAI_WEBHOOK_SECRET', where: 'Make one: openssl rand -hex 32', pasteInto: 'Supabase secrets', secret: true },
      ] },
      { type: 'p', text: 'Test the key with AssemblyAI\'s own sample file. Replace YOUR_KEY.' },
      { type: 'code', id: 'sgn-be-assemblyai-curl', filename: 'test-assemblyai.sh', lang: 'bash', code: `curl -s -X POST https://api.assemblyai.com/v2/transcript \\
  -H "authorization: YOUR_KEY" \\
  -H "content-type: application/json" \\
  -d '{"audio_url":"https://assembly.ai/wildfires.mp3","speaker_labels":true}'

# Copy the "id" from the answer, wait 30 seconds, then:
curl -s https://api.assemblyai.com/v2/transcript/THE_ID -H "authorization: YOUR_KEY" | head -c 600` },
      { type: 'p', text: 'A good first answer has `"status": "queued"` and an `id`. The second call, once finished, has `"status": "completed"`, the full `text` and an `utterances` array where each item has a `speaker` letter.' },
      { type: 'links', items: [
        { label: 'AssemblyAI pricing', url: 'https://www.assemblyai.com/pricing' },
        { label: 'Pre-recorded audio docs', url: 'https://www.assemblyai.com/docs/pre-recorded-audio' },
        { label: 'Webhooks docs', url: 'https://www.assemblyai.com/docs/deployment/webhooks' },
        { label: 'Deepgram pricing (to compare)', url: 'https://deepgram.com/pricing' },
      ] },
      { type: 'mistakes', items: [
        { mistake: 'The curl returns 401 "Authentication error".', fix: 'The header is `authorization: KEY` with no "Bearer" in front. Copy the key again from the dashboard.' },
        { mistake: 'Status is "error" with "Download error".', fix: 'AssemblyAI could not fetch the file. For your own files, the signed Supabase URL must not have expired: the edge function makes it valid for 6 hours.' },
        { mistake: 'Everyone is "Speaker A".', fix: 'speaker_labels was not set to true, or the recording is one mixed mono track with heavy crosstalk. Ask users to use the Zoom/Meet recording, not a phone across the room.' },
      ] },
    ],
    checklist: [
      { id: 'sgn-be-assemblyai-c1', label: 'Create an AssemblyAI account and copy the API key' },
      { id: 'sgn-be-assemblyai-c2', label: 'Add ASSEMBLYAI_API_KEY and ASSEMBLYAI_WEBHOOK_SECRET to Supabase secrets' },
      { id: 'sgn-be-assemblyai-c3', label: 'Run the test curl and see a completed transcript', trigger: 'copy:sgn-be-assemblyai-curl' },
    ],
  },
  {
    id: 'sgn-be-anthropic',
    title: 'Set up the Claude API for extraction and drafting',
    outcome: 'Signet can call claude-opus-5-5 with structured JSON output, with a spend limit you control.',
    minutes: 20,
    xp: 35,
    blocks: [
      { type: 'callout', tone: 'eli5', title: 'Structured output in one sentence', text: 'You hand Claude a form (a JSON schema) and it fills in every box in exactly that shape. So the code never has to guess where the budget or the timeline is: it is always in the same field.' },
      { type: 'steps', items: [
        'Go to console.anthropic.com and sign up (this is separate from your Claude Pro login).',
        'Settings > Billing: add a card and buy $10 of credit. That covers about 30 full test proposals.',
        'Settings > Limits: set a monthly spend limit (start with $50) so a bug cannot run up a bill.',
        'Settings > API Keys > Create Key. Name it "signet-dev". Copy it now: it starts with sk-ant- and is only shown once.',
        'Add it to Supabase secrets as ANTHROPIC_API_KEY. Later, make a separate "signet-prod" key for production.',
      ] },
      { type: 'keys', rows: [
        { name: 'ANTHROPIC_API_KEY', where: 'console.anthropic.com > Settings > API Keys > Create Key (sk-ant-...)', pasteInto: 'Supabase secrets', secret: true },
      ] },
      { type: 'code', id: 'sgn-be-anthropic-curl', filename: 'test-claude.sh', lang: 'bash', code: `curl -s https://api.anthropic.com/v1/messages \\
  -H "x-api-key: $ANTHROPIC_API_KEY" \\
  -H "anthropic-version: 2023-06-01" \\
  -H "content-type: application/json" \\
  -d '{
    "model": "claude-opus-5-5",
    "max_tokens": 1000,
    "output_config": {
      "effort": "low",
      "format": { "type": "json_schema", "schema": {
        "type": "object", "additionalProperties": false,
        "required": ["goal", "budget"],
        "properties": { "goal": { "type": "string" }, "budget": { "type": "string" } } } }
    },
    "messages": [{ "role": "user", "content": "<transcript>Client: We need 40 more demo calls a month by March. We spent about 20k with our last agency.</transcript> Extract the goal and the budget signal." }]
  }'` },
      { type: 'p', text: 'A good answer has `"stop_reason": "end_turn"` and a text block whose text is JSON like `{"goal":"40 more demo calls a month by March","budget":"about $20k with the last agency"}`. The `usage` object shows the tokens you paid for: at $4 per million in and $20 per million out, this test costs well under a cent.' },
      { type: 'links', items: [
        { label: 'Anthropic Console', url: 'https://console.anthropic.com' },
        { label: 'Structured outputs docs', url: 'https://docs.claude.com/en/docs/build-with-claude/structured-outputs' },
        { label: 'Pricing', url: 'https://www.anthropic.com/pricing' },
      ] },
      { type: 'mistakes', items: [
        { mistake: '400 "thinking.type disabled is not supported".', fix: 'claude-opus-5-5 always thinks. Remove any thinking: { type: "disabled" } and lower output_config.effort instead.' },
        { mistake: '400 credit balance too low.', fix: 'Add credit under Settings > Billing. New keys work as soon as credit is added.' },
        { mistake: 'The JSON is cut off.', fix: 'stop_reason is "max_tokens". Raise max_tokens (drafts use 16,000 with streaming).' },
      ] },
    ],
    checklist: [
      { id: 'sgn-be-anthropic-c1', label: 'Create an Anthropic Console account and add $10 credit' },
      { id: 'sgn-be-anthropic-c2', label: 'Set a monthly spend limit' },
      { id: 'sgn-be-anthropic-c3', label: 'Create the API key and add it to Supabase secrets' },
      { id: 'sgn-be-anthropic-c4', label: 'Run the structured output test', trigger: 'copy:sgn-be-anthropic-curl' },
    ],
  },
  {
    id: 'sgn-be-connect',
    title: 'Set up Stripe Connect so deposits go to your customers\' own Stripe',
    outcome: 'An agency clicks Connect Stripe, and client deposits land in the agency\'s Stripe account, not yours.',
    minutes: 45,
    xp: 60,
    blocks: [
      { type: 'callout', tone: 'eli5', title: 'Two kinds of Stripe money in one app', text: 'Your customers pay YOU a monthly subscription: that is normal Stripe Billing. Their clients pay THEM a deposit: that is Stripe Connect. With Standard accounts and direct charges, the deposit is created inside the agency\'s own Stripe account. You never touch the money, you take no cut, and you pay no Connect fees.' },
      { type: 'table', head: ['Choice', 'What it means', 'Why'], rows: [
        ['Standard accounts', 'Each agency has its own full Stripe dashboard', 'Stripe handles their onboarding, payouts and disputes'],
        ['Direct charges', 'Checkout is created on the connected account', 'The agency is the merchant. Refunds and fees are theirs'],
        ['No application fee', 'Signet takes 0%', 'Simple, and no Connect fees for you'],
      ] },
      { type: 'steps', items: [
        'Stripe Dashboard (test mode on) > Connect in the left menu (or search "Connect") > Get started. Choose the option for a platform where your users already have or will create their own Stripe accounts.',
        'Settings (gear) > Connect > Onboarding options > OAuth. Turn on OAuth for Standard accounts. Under Redirects add http://localhost:3000/api/stripe/connect/callback and https://YOURDOMAIN/api/stripe/connect/callback. Copy the test client ID (starts with ca_) [verify the menu names in your dashboard].',
        'Settings > Connect > Branding: add the Signet name, icon and brand colour so agencies see who they are connecting to.',
        'Developers > Webhooks (Workbench) > Add destination > choose Connected accounts. Endpoint https://<ref>.supabase.co/functions/v1/sg-connect-webhook. Events: checkout.session.completed, checkout.session.async_payment_succeeded, checkout.session.expired, charge.refunded, account.application.deauthorized. Save and copy the signing secret (whsec_...).',
        'Paste STRIPE_CONNECT_CLIENT_ID into .env.local and Vercel env. Paste STRIPE_CONNECT_WEBHOOK_SECRET into Supabase secrets.',
      ] },
      { type: 'keys', rows: [
        { name: 'STRIPE_CONNECT_CLIENT_ID', where: 'Stripe > Settings > Connect > Onboarding options > OAuth > Test client ID (ca_...)', pasteInto: 'Vercel env', secret: false },
        { name: 'STRIPE_CONNECT_WEBHOOK_SECRET', where: 'Stripe > Developers > Webhooks > your Connected accounts destination > Signing secret (whsec_...)', pasteInto: 'Supabase secrets', secret: true },
      ] },
      { type: 'prompt', id: 'sgn-be-connect-prompt', title: 'Paste into Claude Code', code: `Read @PRD.md section 11.6. Build Stripe Connect Standard onboarding:
- app/api/stripe/connect/start/route.ts: getClaims, require role owner/admin for the current workspace, sign a state (HMAC with OAUTH_STATE_SECRET) containing workspace_id and a nonce, redirect to https://connect.stripe.com/oauth/authorize?response_type=code&client_id=STRIPE_CONNECT_CLIENT_ID&scope=read_write&state=...&redirect_uri=APP_URL/api/stripe/connect/callback. Add "stripe_landing=register" when the user says they do not have a Stripe account yet.
- app/api/stripe/connect/callback/route.ts: verify state, call stripe.oauth.token({ grant_type: 'authorization_code', code }), take stripe_user_id (acct_...), retrieve the account for its display name, upsert integrations { provider: 'stripe', external_account_id, display_name, status: 'active', connected_by } with the secret key client. Never store the returned access token: direct charges only need the platform key plus the Stripe-Account header. Redirect to /app/settings?tab=integrations&stripe=connected.
- Disconnect button: stripe.oauth.deauthorize({ client_id, stripe_user_id }) then delete the integrations row.
- Check the current Stripe docs for Standard account OAuth before writing. If Stripe now recommends Account Links with Accounts v2 for new platforms, build that instead for users without an account and tell me what changed.
Then connect a second Stripe test account (create one at dashboard.stripe.com/register with another email) and show me the integrations row.` },
      { type: 'code', id: 'sgn-be-connect-test', filename: 'test-connect.sh', lang: 'bash', code: `# After connecting, check you can act on the connected account from your platform key.
curl -s https://api.stripe.com/v1/balance \\
  -u "sk_test_YOUR_PLATFORM_KEY:" \\
  -H "Stripe-Account: acct_THE_CONNECTED_ID"
# Good: JSON with "object": "balance". An error saying the account does not exist means the OAuth step did not finish.` },
      { type: 'links', items: [
        { label: 'Connect overview', url: 'https://docs.stripe.com/connect' },
        { label: 'Direct charges', url: 'https://docs.stripe.com/connect/direct-charges' },
        { label: 'Standard OAuth', url: 'https://docs.stripe.com/connect/oauth-standard-accounts' },
        { label: 'Connect webhooks', url: 'https://docs.stripe.com/connect/webhooks' },
        { label: 'Connect pricing', url: 'https://stripe.com/connect/pricing' },
      ] },
      { type: 'mistakes', items: [
        { mistake: 'The deposit shows up in YOUR Stripe payments, not the agency\'s.', fix: 'Checkout was created without the connected account. Every deposit call must pass { stripeAccount: acct_id } as the second argument.' },
        { mistake: 'The Connect webhook never fires.', fix: 'You added the endpoint under "Your account" events. Make a second destination that listens to Connected accounts, with its own whsec_ secret.' },
        { mistake: 'OAuth says "Invalid redirect URI".', fix: 'The redirect must match one listed in Settings > Connect > Onboarding options exactly, including http vs https and no trailing slash.' },
      ] },
    ],
    checklist: [
      { id: 'sgn-be-connect-c1', label: 'Turn on Connect and OAuth in Stripe test mode, copy the ca_ client ID' },
      { id: 'sgn-be-connect-c2', label: 'Add the Connected accounts webhook destination' },
      { id: 'sgn-be-connect-c3', label: 'Copy the Connect onboarding prompt', trigger: 'copy:sgn-be-connect-prompt' },
      { id: 'sgn-be-connect-c4', label: 'Connect a second test Stripe account' },
      { id: 'sgn-be-connect-c5', label: 'Run the balance test with the Stripe-Account header', trigger: 'copy:sgn-be-connect-test' },
    ],
  },
  {
    id: 'sgn-be-zoom',
    title: 'Create the Zoom app for importing cloud recordings',
    outcome: 'Users on Studio and Agency can connect Zoom and import last week\'s call in one click.',
    minutes: 30,
    xp: 40,
    blocks: [
      { type: 'callout', tone: 'tip', title: 'Do this at milestone M8', text: 'Upload covers every meeting tool from day one. Build Zoom import once the core flow works and paying users ask for it.' },
      { type: 'steps', items: [
        'Go to marketplace.zoom.us and sign in with your Zoom account. Top right: Develop > Build App.',
        'Choose General App, then User-managed (each user connects their own account). Create.',
        'Basic Information: App name "Signet". OAuth Redirect URL: http://localhost:3000/api/integrations/zoom/callback. Add https://YOURDOMAIN/api/integrations/zoom/callback to the OAuth allow list.',
        'Scopes > Add Scopes > search "recording" and add the scopes to list a user\'s cloud recordings and read a recording (on new apps these look like cloud_recording:read:list_user_recordings and cloud_recording:read:recording) [verify].',
        'App Credentials (or Basic Information): copy Client ID and Client Secret for Development.',
        'Local Test > Add app now, and approve it on your own Zoom account.',
        'In Zoom (zoom.us > Settings > Recording) turn on Cloud recording, then record a 2 minute test meeting.',
      ] },
      { type: 'keys', rows: [
        { name: 'ZOOM_CLIENT_ID', where: 'Zoom Marketplace > your app > App Credentials > Client ID', pasteInto: 'Supabase secrets', secret: false },
        { name: 'ZOOM_CLIENT_SECRET', where: 'Zoom Marketplace > your app > App Credentials > Client Secret', pasteInto: 'Supabase secrets', secret: true },
        { name: 'ZOOM_CLIENT_ID / ZOOM_CLIENT_SECRET (again)', where: 'Same values, for the Next.js OAuth routes', pasteInto: 'Vercel env', secret: true },
      ] },
      { type: 'code', id: 'sgn-be-zoom-curl', filename: 'test-zoom.sh', lang: 'bash', code: `# After connecting in the app, copy a fresh access token from the integration (Claude Code can print one in dev).
curl -s "https://api.zoom.us/v2/users/me/recordings?from=2026-10-01&to=2026-10-18" \\
  -H "Authorization: Bearer ZOOM_ACCESS_TOKEN" | head -c 800
# Good: "meetings": [ { "topic": "...", "recording_files": [ { "file_type": "M4A", "download_url": "..." } ] } ]` },
      { type: 'links', items: [
        { label: 'Zoom App Marketplace', url: 'https://marketplace.zoom.us' },
        { label: 'Cloud recording API', url: 'https://developers.zoom.us/docs/api/meetings/#tag/cloud-recording' },
      ] },
      { type: 'mistakes', items: [
        { mistake: 'The list comes back empty.', fix: 'Only cloud recordings appear, not local recordings saved to a laptop. Turn on cloud recording in the Zoom web settings and record a new meeting.' },
        { mistake: 'Download returns 401.', fix: 'Send the access token as a Bearer header on the download_url request and refresh it first if it is older than an hour.' },
      ] },
    ],
    checklist: [
      { id: 'sgn-be-zoom-c1', label: 'Create a user-managed General App in the Zoom Marketplace' },
      { id: 'sgn-be-zoom-c2', label: 'Add the recording scopes and redirect URLs' },
      { id: 'sgn-be-zoom-c3', label: 'Paste the Zoom keys into Supabase secrets and Vercel env' },
      { id: 'sgn-be-zoom-c4', label: 'List your recordings with the test curl', trigger: 'copy:sgn-be-zoom-curl' },
    ],
  },
  {
    id: 'sgn-be-google',
    title: 'Set up Google Meet recording import',
    outcome: 'Users with Google Workspace can connect Google and import Meet recordings from their Drive.',
    minutes: 35,
    xp: 45,
    blocks: [
      { type: 'callout', tone: 'eli5', title: 'Where Meet keeps recordings', text: 'Google Meet saves recordings into the organiser\'s Google Drive. So we ask Meet "which recordings exist?" and then ask Drive "give me that file". We use the narrowest Drive permission, which only covers files Meet created, not the rest of their Drive.' },
      { type: 'steps', items: [
        'Go to console.cloud.google.com. Project picker (top bar) > New project > "Signet" > Create, and select it.',
        'APIs & Services > Library: search and Enable "Google Meet REST API", then "Google Drive API".',
        'Google Auth Platform (older consoles: OAuth consent screen) > Get started: app name Signet, support email, Audience External, contact email, Create.',
        'Data access > Add or remove scopes: add .../auth/meetings.space.readonly and .../auth/drive.meet.readonly [verify both names in the list] > Update > Save.',
        'Audience > Test users > Add your own Google Workspace email.',
        'Clients > Create client > Web application, name "Signet web". Authorised redirect URIs: http://localhost:3000/api/integrations/google/callback and https://YOURDOMAIN/api/integrations/google/callback. Create, then copy the Client ID (ends .apps.googleusercontent.com) and Client secret (starts GOCSPX-).',
        'Record a 2 minute Google Meet as the organiser (needs a Workspace plan with recording).',
      ] },
      { type: 'keys', rows: [
        { name: 'GOOGLE_CLIENT_ID', where: 'Google Cloud > Google Auth Platform > Clients > Signet web', pasteInto: 'Supabase secrets', secret: false },
        { name: 'GOOGLE_CLIENT_SECRET', where: 'Same client > Client secret (GOCSPX-...)', pasteInto: 'Supabase secrets', secret: true },
        { name: 'GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET (again)', where: 'Same values, for the Next.js OAuth routes', pasteInto: 'Vercel env', secret: true },
      ] },
      { type: 'code', id: 'sgn-be-google-curl', filename: 'test-meet.sh', lang: 'bash', code: `curl -s "https://meet.googleapis.com/v2/conferenceRecords?pageSize=5" \\
  -H "Authorization: Bearer GOOGLE_ACCESS_TOKEN"
# Then, for one record name:
curl -s "https://meet.googleapis.com/v2/conferenceRecords/RECORD_ID/recordings" \\
  -H "Authorization: Bearer GOOGLE_ACCESS_TOKEN"
# Good: "state": "FILE_GENERATED" and "driveDestination": { "file": "<drive file id>" }` },
      { type: 'links', items: [
        { label: 'Google Cloud Console', url: 'https://console.cloud.google.com' },
        { label: 'Meet API: work with artifacts', url: 'https://developers.google.com/meet/api/guides/artifacts' },
        { label: 'Drive files.get (download)', url: 'https://developers.google.com/workspace/drive/api/reference/rest/v3/files/get' },
      ] },
      { type: 'mistakes', items: [
        { mistake: 'conferenceRecords is empty.', fix: 'Only meetings the signed-in user organised show up, and only on Google Workspace accounts with recording. A free Gmail account cannot record Meet.' },
        { mistake: '"Access blocked: app has not completed verification".', fix: 'Add the user as a test user while you build. Before launch, publish the app and complete Google verification (the Drive scope is sensitive).' },
      ] },
    ],
    checklist: [
      { id: 'sgn-be-google-c1', label: 'Enable the Meet and Drive APIs in a new Google Cloud project' },
      { id: 'sgn-be-google-c2', label: 'Add the two read-only scopes and yourself as a test user' },
      { id: 'sgn-be-google-c3', label: 'Create the web client and paste the keys' },
      { id: 'sgn-be-google-c4', label: 'List your Meet recordings with the test curl', trigger: 'copy:sgn-be-google-curl' },
    ],
  },
  {
    id: 'sgn-be-recall-later',
    title: 'Later milestone: decide on the Recall.ai meeting bot',
    outcome: 'You know when a meeting bot is worth building, what it costs, and how it plugs into the pipeline you already have.',
    minutes: 15,
    xp: 20,
    blocks: [
      { type: 'callout', tone: 'tip', title: 'Do not build this yet', text: 'Build the bot (milestone M10) only after 10 paying customers have asked for it. Upload and Zoom/Meet import already work with every meeting tool.' },
      { type: 'table', head: ['', 'Upload / import (v1)', 'Recall.ai bot (later)'], rows: [
        ['Cost per hour', '$0 extra', '$0.50/hr recording (pricing page showed $0.70 when checked; 2026 blog says $0.50) [verify]'],
        ['Transcription', 'AssemblyAI $0.23/hr', 'Same AssemblyAI (skip Recall\'s $0.15/hr add-on)'],
        ['Storage', 'Supabase', 'Free 7 days at Recall, then $0.05/hr; copy to Supabase'],
        ['Setup for the user', 'None', 'Calendar connect, bot name, client sees "Signet Notetaker joined"'],
        ['Free tier', 'n/a', 'First 5 hours free'],
      ] },
      { type: 'steps', items: [
        'When you are ready: sign up at recall.ai, create an API key in the dashboard, and read the Meeting Bot API quickstart.',
        'Plan: POST /api/v1/bot with meeting_url, a Recall webhook for bot status, download the audio when done, then create a calls row with source "bot" and reuse sg-start-transcription.',
        'Meter bot minutes as usage kind bot_minutes (Agency only, 600 a month: about $5 of cost).',
      ] },
      { type: 'links', items: [
        { label: 'Recall.ai pricing', url: 'https://www.recall.ai/pricing' },
        { label: 'Recall.ai docs', url: 'https://docs.recall.ai' },
      ] },
    ],
    checklist: [
      { id: 'sgn-be-recall-c1', label: 'Read the bot vs upload table' },
      { id: 'sgn-be-recall-c2', label: 'Add "meeting bot" to your feature request log and count requests' },
    ],
  },
  {
    id: 'sgn-be-e2e',
    title: 'Run the full call-to-deposit test end to end',
    outcome: 'One real test proves every piece works together: upload, transcript, draft, send, view, sign, deposit, emails and follow-up.',
    minutes: 60,
    xp: 70,
    blocks: [
      { type: 'callout', tone: 'eli5', title: 'Why one long test', text: 'Each piece can pass on its own and still break when joined up: a webhook URL with a typo, a secret missing in production. This test walks the exact path a real customer takes, so you find those gaps before they do.' },
      { type: 'steps', items: [
        'Use two browsers: Chrome as the agency owner, a private window or your phone as the client.',
        'Upload your 3 minute fake discovery call. Wait for Brief ready (about 2 minutes).',
        'Correct one item in the brief, click Draft proposal, and wait for the draft email.',
        'Rewrite one section, then Send with "Email it for me" to your second address.',
        'On the phone: open the email, read the proposal, spend 30 seconds on Pricing, choose Better, sign.',
        'Pay the deposit with card 4242 4242 4242 4242, any future date, any CVC.',
        'Check the owner inbox has: Draft ready, Viewed, Signed, Deposit received. Check the client inbox has the proposal and the signed copy.',
        'Run the SQL below. Every line must say true.',
        'Then send a second proposal, push its first_sent_at back 3 days and call sg-reminders: the client gets one follow-up, never two.',
      ] },
      { type: 'code', id: 'sgn-be-e2e-sql', filename: 'e2e-check.sql', lang: 'sql', code: `with p as (select * from public.proposals order by created_at desc limit 1)
select
  (select status = 'paid' from p)                                                         as proposal_paid,
  (select count(*) = 8 from public.proposal_sections s, p where s.proposal_id = p.id)    as eight_sections,
  (select count(*) = 3 from public.pricing_options o, p where o.proposal_id = p.id)      as three_options,
  (select count(*) >= 1 from public.proposal_views v, p where v.proposal_id = p.id)      as viewed,
  (select s.content_hash = v.content_hash from public.signatures s
     join public.proposal_versions v on v.id = s.version_id, p where s.proposal_id = p.id) as hash_matches,
  (select d.status = 'paid' from public.deposits d, p where d.proposal_id = p.id)       as deposit_paid,
  (select count(*) >= 4 from public.email_log e, p where e.proposal_id = p.id)           as emails_logged,
  (select count(*) >= 3 from public.usage_ledger u where u.created_at > now() - interval '1 day') as usage_metered;` },
      { type: 'mistakes', items: [
        { mistake: 'proposal_paid is false but Stripe shows the payment.', fix: 'The Connect webhook did not land. Stripe > Developers > Webhooks > the Connected accounts destination > see the failed delivery and its response. Usually the STRIPE_CONNECT_WEBHOOK_SECRET secret is the platform one, not the Connect one.' },
        { mistake: 'emails_logged is true but nothing arrived.', fix: 'Resend only delivers to your own address until your domain is verified. Verify the sending domain in Resend > Domains, or test with the email you signed up to Resend with.' },
        { mistake: 'The draft never starts.', fix: 'pg_cron is not calling the worker. Run select * from cron.job_run_details order by start_time desc limit 5; and check the URL and the cron_secret in Vault.' },
      ] },
    ],
    checklist: [
      { id: 'sgn-be-e2e-c1', label: 'Run the whole flow from upload to paid deposit' },
      { id: 'sgn-be-e2e-c2', label: 'Confirm all eight emails arrived where expected' },
      { id: 'sgn-be-e2e-c3', label: 'Run the e2e SQL and see every column true', trigger: 'copy:sgn-be-e2e-sql' },
      { id: 'sgn-be-e2e-c4', label: 'Test the 3-day follow-up sends exactly once' },
    ],
  },
]
