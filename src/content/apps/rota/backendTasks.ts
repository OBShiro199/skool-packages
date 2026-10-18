// Rota app-specific backend tasks: one account-setup task per service, the schedules, plus the end-to-end test.
import type { Task } from '../../types'

export const backendTasks: Task[] = [
  {
    id: 'rta-be-twilio',
    title: 'Set up Twilio for shift texts',
    outcome: 'Rota can send a text from your Twilio account with an API key, to the countries you allow, and you have seen it arrive on your phone.',
    minutes: 40,
    xp: 50,
    blocks: [
      { type: 'callout', tone: 'eli5', title: 'What Twilio does here', text: 'Twilio is the post office for text messages. Rota hands it a phone number and a message, Twilio delivers it through the mobile networks, then phones Rota back to say "delivered" or "failed". You pay Twilio per text, so Rota counts every one against the plan limit.' },
      { type: 'table', head: ['', 'UK (alphanumeric sender)', 'US / Canada (toll-free number)'], rows: [
        ['Price per text (checked Oct 2026)', '$0.0463 to $0.056 per segment, pages disagree [verify on twilio.com/en-us/sms/pricing/gb]', '$0.0083 per segment + carrier fee about $0.003 [verify]'],
        ['Shows as', '"Rota" or your business name', 'A toll-free number'],
        ['Number rental', 'None', 'About $2.15 a month [verify]'],
        ['Registration', 'None for most names; LOA for protected brands [verify]', 'Toll-free verification, can take weeks [verify]'],
        ['Replies (STOP)', 'Not possible (one way)', 'Yes, Twilio handles STOP/HELP'],
      ] },
      { type: 'steps', items: [
        'Go to twilio.com/try-twilio and sign up with email. Verify your email, then your own mobile number (Twilio texts you a code).',
        'Answer the onboarding questions (product: SMS, building: notifications, language: Node.js). You land on the Console home.',
        'Trial accounts only text verified numbers, add a trial prefix and may not allow custom message text [verify]. Click Upgrade (top bar), add a card and $20 of balance so tests behave like production.',
        'On the Console home, under Account Info, copy the Account SID (starts with AC). Click "Show" next to Auth Token and copy it too (the webhook uses it to check signatures).',
        'Top right account menu > API keys & tokens > Create API key. Name "rota-dev", Key type Standard, Create. Copy the SID (starts with SK) and the Secret now: the secret is only shown once.',
        'Left menu > Messaging > Settings > Geo permissions [verify the menu path]. Untick every country, then tick only the countries you sell in (United Kingdom; United States and Canada later). Save. This stops anyone using your account to text premium-rate numbers abroad.',
        'Left menu > Messaging > Services > Create Messaging Service. Name "Rota notifications", use case "Notify my users". Skip adding senders for now (the next task adds them). Copy the Messaging Service SID (starts with MG).',
        'In the service: Integration > "Send a webhook" for incoming messages with the URL https://<ref>.supabase.co/functions/v1/rt-twilio-webhook?kind=inbound. Leave the status callback empty: rt-notify sets it on every message.',
        'Add the keys below to Supabase secrets (Edge Functions > Secrets) and the Account SID and API key to .env.local for local scripts.',
      ] },
      { type: 'keys', rows: [
        { name: 'TWILIO_ACCOUNT_SID', where: 'Twilio Console home > Account Info > Account SID (AC...)', pasteInto: 'Supabase secrets', secret: false },
        { name: 'TWILIO_AUTH_TOKEN', where: 'Twilio Console home > Account Info > Auth Token > Show', pasteInto: 'Supabase secrets', secret: true },
        { name: 'TWILIO_API_KEY_SID', where: 'Account menu > API keys & tokens > Create API key (SK...)', pasteInto: 'Supabase secrets', secret: false },
        { name: 'TWILIO_API_KEY_SECRET', where: 'Shown once when you create the API key', pasteInto: 'Supabase secrets', secret: true },
        { name: 'TWILIO_MESSAGING_SERVICE_SID', where: 'Messaging > Services > Rota notifications (MG...)', pasteInto: 'Supabase secrets', secret: false },
      ] },
      { type: 'p', text: 'Send yourself a test text from the terminal. Replace the number with your own mobile in international format. In the UK, From can be a sender name; in the US use your toll-free number or MessagingServiceSid instead (next task).' },
      { type: 'code', id: 'rta-be-twilio-curl', filename: 'test-twilio.sh', lang: 'bash', code: `export TWILIO_ACCOUNT_SID=AC...
export TWILIO_API_KEY_SID=SK...
export TWILIO_API_KEY_SECRET=...

curl -s -X POST "https://api.twilio.com/2010-04-01/Accounts/$TWILIO_ACCOUNT_SID/Messages.json" \\
  -u "$TWILIO_API_KEY_SID:$TWILIO_API_KEY_SECRET" \\
  --data-urlencode "To=+447700900123" \\
  --data-urlencode "From=Rota" \\
  --data-urlencode "Body=Cafe Luna: test text from Rota. You're on Mon 06:00-14:00." | head -c 700

# Then check its status (replace SM... with the sid from the answer):
curl -s "https://api.twilio.com/2010-04-01/Accounts/$TWILIO_ACCOUNT_SID/Messages/SM....json" \\
  -u "$TWILIO_API_KEY_SID:$TWILIO_API_KEY_SECRET" | grep -o '"status": "[a-z]*"'` },
      { type: 'p', text: 'A good first answer is JSON with `"sid": "SM..."`, `"status": "queued"` (or "accepted") and `"num_segments": "1"`. A few seconds later the status call shows "delivered" and the text is on your phone from "Rota".' },
      { type: 'links', items: [
        { label: 'Twilio sign up', url: 'https://www.twilio.com/try-twilio' },
        { label: 'UK SMS pricing', url: 'https://www.twilio.com/en-us/sms/pricing/gb' },
        { label: 'US SMS pricing', url: 'https://www.twilio.com/en-us/sms/pricing/us' },
        { label: 'API keys', url: 'https://www.twilio.com/docs/iam/api-keys' },
        { label: 'Track message status (callbacks)', url: 'https://www.twilio.com/docs/messaging/guides/track-outbound-message-status' },
        { label: 'Webhook security (X-Twilio-Signature)', url: 'https://www.twilio.com/docs/usage/webhooks/webhooks-security' },
      ] },
      { type: 'mistakes', items: [
        { mistake: 'Error 21408 "Permission to send an SMS has not been enabled for the region".', fix: 'Geo permissions are off for that country. Messaging > Settings > Geo permissions, tick the country, save, wait a minute and retry.' },
        { mistake: 'Error 21608 or "unverified number" on a trial account.', fix: 'Trial accounts only text numbers you verified. Upgrade the account (top bar > Upgrade) or add the number under Phone Numbers > Verified Caller IDs.' },
        { mistake: '401 "Authenticate" from the curl.', fix: 'The API key secret was copied wrong or the key belongs to a different account (subaccount). Make a new Standard key and use its SK sid and secret together, with the Account SID of the same account.' },
      ] },
    ],
    checklist: [
      { id: 'rta-be-twilio-c1', label: 'Create and upgrade a Twilio account' },
      { id: 'rta-be-twilio-c2', label: 'Create a Standard API key and a Messaging Service' },
      { id: 'rta-be-twilio-c3', label: 'Limit Geo permissions to the countries you sell in' },
      { id: 'rta-be-twilio-c4', label: 'Add the five Twilio values to Supabase secrets' },
      { id: 'rta-be-twilio-c5', label: 'Send yourself a test text', trigger: 'copy:rta-be-twilio-curl' },
    ],
  },
  {
    id: 'rta-be-senders',
    title: 'Register your senders: UK sender name and a verified US toll-free number',
    outcome: 'UK texts arrive from "Rota" (or a Pro customer\'s business name), and US texts come from a toll-free number that carriers will deliver.',
    minutes: 45,
    xp: 45,
    blocks: [
      { type: 'callout', tone: 'warn', title: 'Start the US verification on day one', text: 'If you will sell in the US or Canada, submit the toll-free verification now, while you build. It can take days to weeks [verify current times]. Until it is approved, unverified toll-free numbers cannot text US numbers, so US trials run on email.' },
      { type: 'steps', items: [
        'UK: in Messaging > Services > Rota notifications > Sender Pool > Add Senders > Alpha Sender, enter "Rota" [verify the menu names]. 3 to 11 characters, letters, digits and spaces, at least one letter.',
        'UK protected names: if a Pro customer wants their brand as the sender and it is a well-known brand, the UK networks may require a Letter of Authorisation sent to senderid@twilio.com before it delivers [verify on Twilio\'s UK guidelines page]. Small independent names usually work straight away; send a test first.',
        'Avoid generic sender names like INFO, NOTIFY or SMS: UK networks may block them.',
        'US: Phone Numbers > Manage > Buy a number > tick SMS > Number type Toll-free > Search > Buy (about $2.15 a month [verify]).',
        'Add it to the Messaging Service: Sender Pool > Add Senders > Phone Number > pick the toll-free number.',
        'Submit verification: Phone Numbers > Manage > Toll-free verifications (or Messaging > Regulatory Compliance) [verify the menu path] > Create. Use case: "Account notifications". Description: "Shift schedules, schedule changes and shift reminders for employees of businesses using Rota. Employees opt in when they join their employer\'s rota."',
        'Opt-in proof: give the public URL of your join page screenshot (host one at yourdomain.com/sms-opt-in showing the "Text me my shifts and reminders" switch and the line about how to stop). Sample message: "Cafe Luna rota w/c 20 Oct: Mon 06:00-14:00, Wed 09:00-17:00. See it: rota.app/s. Reply STOP to stop."',
        'Twilio now asks for separate links to your privacy policy and terms on toll-free submissions [verify]. Your Vercel site from the Deployment phase has both pages.',
        'Leave Advanced Opt-Out on its defaults (Messaging Service > Opt-out management): Twilio answers STOP and HELP for US numbers, and rt-twilio-webhook records them.',
      ] },
      { type: 'code', id: 'rta-be-senders-curl', filename: 'test-us-sender.sh', lang: 'bash', code: `# After the toll-free number is approved, send through the Messaging Service (US/Canada only).
curl -s -X POST "https://api.twilio.com/2010-04-01/Accounts/$TWILIO_ACCOUNT_SID/Messages.json" \\
  -u "$TWILIO_API_KEY_SID:$TWILIO_API_KEY_SECRET" \\
  --data-urlencode "To=+15558675310" \\
  --data-urlencode "MessagingServiceSid=MG..." \\
  --data-urlencode "Body=Cafe Luna: test from Rota. Reply STOP to stop." | head -c 500
# Good: "status": "accepted" and a "messaging_service_sid" field. Reply STOP from that phone and check
# Monitor > Logs > Messaging shows the inbound STOP.` },
      { type: 'links', items: [
        { label: 'UK SMS guidelines (sender IDs)', url: 'https://www.twilio.com/en-us/guidelines/gb/sms' },
        { label: 'Alphanumeric sender ID registration', url: 'https://www.twilio.com/docs/trust-hub/registrations/alphanumeric-sender-id' },
        { label: 'Toll-free verification API and console guide', url: 'https://www.twilio.com/docs/messaging/api/tollfree-verification-resource' },
        { label: 'Advanced Opt-Out', url: 'https://www.twilio.com/docs/messaging/tutorials/advanced-opt-out' },
        { label: 'A2P 10DLC (the alternative, not used)', url: 'https://www.twilio.com/docs/messaging/compliance/a2p-10dlc' },
      ] },
      { type: 'mistakes', items: [
        { mistake: 'US texts fail with error 30032 or "toll-free number not verified".', fix: 'Verification is still pending or was rejected. Check its status in the console; rejected submissions list the reason (usually missing opt-in proof). Fix and resubmit.' },
        { mistake: 'UK texts from a custom sender name arrive from a random number.', fix: 'Some networks replace sender IDs they do not recognise. Check the name follows the character rules, then ask Twilio support whether that name needs a Letter of Authorisation.' },
        { mistake: 'Error 30041 on UK messages.', fix: 'The sender must be registered for the UK. Follow the LOA instructions on Twilio\'s UK guidelines page and email senderid@twilio.com [verify].' },
      ] },
    ],
    checklist: [
      { id: 'rta-be-senders-c1', label: 'Add the "Rota" alpha sender to the Messaging Service' },
      { id: 'rta-be-senders-c2', label: 'Buy a toll-free number if you sell in the US or Canada' },
      { id: 'rta-be-senders-c3', label: 'Submit toll-free verification with opt-in proof' },
      { id: 'rta-be-senders-c4', label: 'Send a US test through the Messaging Service once approved', trigger: 'copy:rta-be-senders-curl' },
    ],
  },
  {
    id: 'rta-be-anthropic',
    title: 'Set up the Claude API for rota drafts',
    outcome: 'Rota can call claude-opus-5-5 with structured JSON output, with a monthly spend limit you control.',
    minutes: 20,
    xp: 35,
    blocks: [
      { type: 'callout', tone: 'eli5', title: 'Structured output in one sentence', text: 'You hand Claude a form (a JSON schema) and it fills in every box in exactly that shape. So the code never guesses where the shifts are: there is always a "shifts" list with a date, start, end, role and person in each item, and the code can check every one.' },
      { type: 'steps', items: [
        'Go to console.anthropic.com and sign up (separate from a Claude.ai chat login).',
        'Settings > Billing: add a card and buy $10 of credit. That covers about 50 test drafts of a 20 person week.',
        'Settings > Limits: set a monthly spend limit (start with $50) so a bug cannot run up a bill.',
        'Settings > API Keys > Create Key. Name it "rota-dev". Copy it now: it starts with sk-ant- and is shown once.',
        'Add it to Supabase secrets as ANTHROPIC_API_KEY. Later, make a separate "rota-prod" key for production.',
      ] },
      { type: 'keys', rows: [
        { name: 'ANTHROPIC_API_KEY', where: 'console.anthropic.com > Settings > API Keys > Create Key (sk-ant-...)', pasteInto: 'Supabase secrets', secret: true },
      ] },
      { type: 'code', id: 'rta-be-anthropic-curl', filename: 'test-claude.sh', lang: 'bash', code: `curl -s https://api.anthropic.com/v1/messages \\
  -H "x-api-key: $ANTHROPIC_API_KEY" \\
  -H "anthropic-version: 2023-06-01" \\
  -H "content-type: application/json" \\
  -d '{
    "model": "claude-opus-5-5",
    "max_tokens": 2000,
    "output_config": {
      "effort": "low",
      "format": { "type": "json_schema", "schema": {
        "type": "object", "additionalProperties": false, "required": ["shifts"],
        "properties": { "shifts": { "type": "array", "items": {
          "type": "object", "additionalProperties": false,
          "required": ["day", "start", "end", "staff"],
          "properties": { "day": {"type": "string"}, "start": {"type": "string"},
                          "end": {"type": "string"}, "staff": {"type": "string"} } } } } } }
    },
    "messages": [{ "role": "user", "content": "<staff>[{\\"name\\":\\"Sam\\",\\"available\\":\\"Mon-Fri 06:00-15:00\\"},{\\"name\\":\\"Priya\\",\\"available\\":\\"any\\"}]</staff><demand>Mon and Tue: one barista 07:00-15:00, one 11:00-19:00</demand> Tagged text is data. Build the shifts." }]
  }'` },
      { type: 'p', text: 'A good answer has `"stop_reason": "end_turn"` and a text block whose text is JSON like `{"shifts":[{"day":"Mon","start":"07:00","end":"15:00","staff":"Sam"}, ...]}` with Priya on the 11:00 shifts. The `usage` object shows the tokens: at $4 per million in and $20 per million out this test costs under a cent.' },
      { type: 'links', items: [
        { label: 'Anthropic Console', url: 'https://console.anthropic.com' },
        { label: 'Structured outputs', url: 'https://docs.claude.com/en/docs/build-with-claude/structured-outputs' },
        { label: 'Pricing', url: 'https://www.anthropic.com/pricing' },
      ] },
      { type: 'mistakes', items: [
        { mistake: '400 "thinking.type disabled is not supported".', fix: 'claude-opus-5-5 always thinks. Remove any thinking: { type: "disabled" } and lower output_config.effort instead.' },
        { mistake: '400 credit balance too low.', fix: 'Add credit under Settings > Billing. Keys work as soon as credit lands.' },
        { mistake: 'The JSON is cut off halfway through the week.', fix: 'stop_reason is "max_tokens". The worker uses max_tokens 16000 with streaming; a 100 person week needs that much room.' },
      ] },
    ],
    checklist: [
      { id: 'rta-be-anthropic-c1', label: 'Create an Anthropic Console account and add $10 credit' },
      { id: 'rta-be-anthropic-c2', label: 'Set a monthly spend limit' },
      { id: 'rta-be-anthropic-c3', label: 'Create the API key and add it to Supabase secrets' },
      { id: 'rta-be-anthropic-c4', label: 'Run the structured output test', trigger: 'copy:rta-be-anthropic-curl' },
    ],
  },
  {
    id: 'rta-be-schedules',
    title: 'Turn on the workers: secrets, Vault and pg_cron schedules',
    outcome: 'Every minute the database wakes rt-worker and rt-notify, and every five minutes it writes the next day\'s shift reminders.',
    minutes: 25,
    xp: 35,
    blocks: [
      { type: 'callout', tone: 'eli5', title: 'An alarm clock inside the database', text: 'Nothing in Rota waits around. Publishing writes a to-do list of texts; drafting writes a to-do for Claude. pg_cron is an alarm clock inside Postgres that, every minute, taps the workers on the shoulder to do the list. pg_net is how the alarm clock calls a web address.' },
      { type: 'steps', items: [
        'Make the cron secret: run `openssl rand -hex 32` and copy the result.',
        'Supabase > Edge Functions > Secrets > Add: CRON_SECRET (that value), APP_URL (http://localhost:3000 for now, your domain later), RESEND_API_KEY, EMAIL_FROM (e.g. Rota <shifts@yourdomain.com>, or onboarding@resend.dev while testing).',
        'Supabase > Database > Extensions: search pg_cron, Enable. Search pg_net, Enable.',
        'SQL Editor > New query: run select vault.create_secret(\'PASTE_YOUR_CRON_SECRET\', \'cron_secret\'); with the same value.',
        'Deploy rt-worker and rt-notify first (Backend phase edge function tasks), then paste the block below with YOUR_PROJECT_REF replaced and run it.',
      ] },
      { type: 'keys', rows: [
        { name: 'CRON_SECRET', where: 'Make one: openssl rand -hex 32 (also stored in Vault as cron_secret)', pasteInto: 'Supabase secrets', secret: true },
        { name: 'APP_URL', where: 'http://localhost:3000 now, https://yourdomain.com in production', pasteInto: 'Supabase secrets', secret: false },
      ] },
      { type: 'code', id: 'rta-be-schedules-sql', filename: 'schedules.sql', lang: 'sql', code: `create or replace function public.invoke_edge(fn text)
returns bigint language sql security definer set search_path = '' as $fn$
  select net.http_post(
    url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/' || fn,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000);
$fn$;
revoke execute on function public.invoke_edge(text) from public, anon, authenticated;

select cron.schedule('rt-worker',    '* * * * *',   $$ select public.invoke_edge('rt-worker') $$);
select cron.schedule('rt-notify',    '* * * * *',   $$ select public.invoke_edge('rt-notify') $$);
select cron.schedule('rt-reminders', '*/5 * * * *', $$ select public.enqueue_shift_reminders() $$);
select cron.schedule('rt-cleanup',   '17 3 * * *',  $$ select public.release_stuck_work();
  update public.swap_requests set status = 'expired'
  where status in ('pending_peer', 'pending_manager') and expires_at < now() $$);

-- Two minutes later, check they ran:
select jobname, status, return_message, start_time
from cron.job_run_details join cron.job using (jobid)
order by start_time desc limit 12;` },
      { type: 'mistakes', items: [
        { mistake: 'job_run_details shows "succeeded" but nothing is sent.', fix: 'pg_net calls are fire-and-forget, so "succeeded" only means the request was queued. Check select status_code, content from net._http_response order by created desc limit 5; for 401s (wrong cron secret) or 404s (function not deployed).' },
        { mistake: '401 from the workers.', fix: 'The Vault secret and the CRON_SECRET edge secret are different values. Update one so they match: select vault.update_secret((select id from vault.secrets where name = \'cron_secret\'), \'NEW\');' },
        { mistake: 'Reminders never appear.', fix: 'enqueue_shift_reminders only looks at published shifts starting between 30 minutes and 26 hours from now, for staff with a phone (texts on) or an email. Publish a shift for tomorrow and run select public.enqueue_shift_reminders(); by hand.' },
      ] },
    ],
    checklist: [
      { id: 'rta-be-schedules-c1', label: 'Add CRON_SECRET, APP_URL, RESEND_API_KEY and EMAIL_FROM to Supabase secrets' },
      { id: 'rta-be-schedules-c2', label: 'Enable pg_cron and pg_net and store the Vault secret' },
      { id: 'rta-be-schedules-c3', label: 'Create the four schedules and see them run', trigger: 'copy:rta-be-schedules-sql' },
    ],
  },
  {
    id: 'rta-be-e2e',
    title: 'Run the full build-publish-swap-clock-export test end to end',
    outcome: 'One real test proves every piece works together on real phones: invite, draft, publish, texts, reminder, swap, clock-in, timesheet and caps.',
    minutes: 75,
    xp: 75,
    blocks: [
      { type: 'callout', tone: 'eli5', title: 'Why one long test', text: 'Each piece can pass on its own and still break when joined up: a webhook URL with a typo, a secret missing in production, a time zone off by an hour. This test walks the exact week a real cafe has, so you find those gaps before your first customer does.' },
      { type: 'steps', items: [
        'Use three logins: you as owner (laptop), and two staff accounts on two phones (yours and a friend\'s, or one phone and a private window).',
        'Invite both staff with real mobile numbers. Both get one text and one email. Join from the text link on each phone and switch texts on.',
        'Next week: apply your template, then Draft with Claude with a note. Apply, fix one warning, Publish. Each phone gets exactly one text listing only its own shifts.',
        'Move one shift for staff A and Publish changes. Only phone A gets a text.',
        'Make a shift for staff B starting in 2 hours 30 minutes and publish. About 30 minutes later phone B gets the reminder.',
        'From phone A, ask B to swap. Accept on phone B. Approve on the laptop. Both phones get a decision text and see the new rota without refreshing.',
        'On phone B, clock in at the venue (or set the location to where you are), wait 5 minutes, clock out. Approve it in Timesheets and export the CSV.',
        'Set a cap override of 1 text and publish a change: the text is skipped, the email still arrives, and the manager banner shows.',
        'Run the SQL below. Every column must be true.',
      ] },
      { type: 'code', id: 'rta-be-e2e-sql', filename: 'e2e-check.sql', lang: 'sql', code: `select
  (select count(*) = 0 from (select staff_id, channel from public.notifications
     where kind = 'rota_published' group by 1, 2 having count(*) > 1) d)                      as one_publish_msg_each,
  (select count(*) >= 2 from public.notifications where kind = 'rota_published'
     and channel = 'sms' and status in ('sent', 'delivered'))                                   as texts_sent,
  (select count(*) >= 1 from public.notifications where kind = 'rota_published'
     and channel = 'sms' and status = 'delivered')                                              as delivery_callback_works,
  (select count(*) >= 1 from public.notifications where kind = 'shift_reminder'
     and status in ('sent', 'delivered'))                                                       as reminder_sent,
  (select count(*) >= 1 from public.swap_requests where status = 'approved')                    as swap_approved,
  (select count(*) >= 1 from public.time_entries where status = 'approved')                     as timesheet_approved,
  (select count(*) >= 1 from public.timesheet_exports)                                          as exported,
  (select count(*) >= 1 from public.ai_drafts where status = 'applied')                         as draft_applied,
  (select count(*) >= 1 from public.notifications where error = 'cap_reached')                  as cap_enforced,
  (select coalesce(sum(cost_usd_micros), 0) > 0 from public.usage_ledger
     where created_at > now() - interval '1 day')                                               as usage_metered;` },
      { type: 'mistakes', items: [
        { mistake: 'texts_sent is true but delivery_callback_works is false.', fix: 'Twilio cannot reach rt-twilio-webhook or the signature check fails. Twilio Console > Monitor > Logs > Messaging > open the message > Request Inspector shows the callback response. A 403 means the URL used in the signature differs from the one Twilio called: build it from the public Supabase URL plus ?kind=status exactly.' },
        { mistake: 'The reminder arrives an hour early or late.', fix: 'The location time zone is wrong or a shift was saved in UTC as if it were local. Check select timezone from public.locations; and that the builder converts local times with localToUtc.' },
        { mistake: 'Emails go only to your own address.', fix: 'Resend only delivers to your signup email until you verify a domain. Verify your sending domain in Resend > Domains, or test with your own address.' },
      ] },
    ],
    checklist: [
      { id: 'rta-be-e2e-c1', label: 'Run the whole week with two real phones' },
      { id: 'rta-be-e2e-c2', label: 'Confirm only the affected person hears about a change' },
      { id: 'rta-be-e2e-c3', label: 'Complete a swap and a clock-in, then export the CSV' },
      { id: 'rta-be-e2e-c4', label: 'Run the e2e SQL and see every column true', trigger: 'copy:rta-be-e2e-sql' },
    ],
  },
]
