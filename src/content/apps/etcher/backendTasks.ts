// Etcher backend tasks, appended to the Backend phase (after the shared API key and edge function tasks).
import type { Task } from '../../types'
import { code, eli5, keys, links, mistakes, p, prompt, steps, table, task, tip, warn } from './helpers'

export const backendTasks: Task[] = [
  task({
    id: 'etc-be-twilio',
    title: 'Set up your Twilio account for Voice',
    outcome: 'An upgraded Twilio account with US and UK calling switched on, your main credentials in Supabase secrets, and a first API call that proves it works.',
    minutes: 40,
    xp: 55,
    blocks: [
      eli5('Your account and one mini-account per customer', 'You open one Twilio account and put money on it. When a customer sets up calling, Etcher makes a "subaccount" for them inside yours: a mini Twilio account with its own numbers and its own call log. Every bill still comes to you, and Etcher charges your customer $149 that includes their minutes.'),
      steps(
        'Go to twilio.com/try-twilio. Sign up with your work email, verify the email, then verify your own mobile number by SMS.',
        'On the welcome questions pick: Product **Voice**, "What do you plan to build?" **Calling from a web app**, language **Node.js**. These only change the console home page.',
        'Console home (console.twilio.com) > the **Account Info** box: copy the **Account SID** (starts with `AC`, 34 characters) and click **Show** next to **Auth Token** and copy it (32 characters).',
        'Upgrade the account (trial accounts can only call numbers you verified and play a trial message on every call): top bar **Upgrade** (or Admin > Account billing > Upgrade account). Enter your business details and card, add $20 of credit. Turn on **Auto-recharge** at $10 to $20 so calls never stop.',
        'Turn on the countries you call: left menu **Voice** > **Settings** > **Geo permissions**. Tick **United States & Canada** and **United Kingdom** (low-risk numbers only). Leave expensive regions off: this stops toll fraud if a key ever leaks. Subaccounts inherit the parent\'s geo permissions by default [verify in the console: there is an "inherit" setting].',
        'Optional now, needed before launch in the US: **Trust Hub** > **Customer profiles** > create a **Secondary Business Profile**, then **SHAKEN/STIR** so your calls show as verified and are less likely to be labelled spam. Approval takes a few days.',
      ),
      keys([
        { name: 'TWILIO_ACCOUNT_SID', where: 'console.twilio.com > Account Info > Account SID (AC...)', pasteInto: 'Supabase secrets', secret: false },
        { name: 'TWILIO_AUTH_TOKEN', where: 'console.twilio.com > Account Info > Auth Token (click Show)', pasteInto: 'Supabase secrets', secret: true },
      ]),
      code('etc-be-twilio-secrets', 'Terminal (outside Claude Code)', 'bash', `
npx supabase secrets set TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
npx supabase secrets set TWILIO_AUTH_TOKEN=paste_auth_token_here
npx supabase secrets list
`),
      p('First test call to the Twilio API: list numbers you could buy in San Francisco (415). Replace the two values in capitals. Nothing is bought.'),
      code('etc-be-twilio-curl', 'test-twilio.sh', 'bash', `
curl -G "https://api.twilio.com/2010-04-01/Accounts/YOUR_ACCOUNT_SID/AvailablePhoneNumbers/US/Local.json" \\
  --data-urlencode "AreaCode=415" \\
  --data-urlencode "VoiceEnabled=true" \\
  --data-urlencode "PageSize=3" \\
  -u "YOUR_ACCOUNT_SID:YOUR_AUTH_TOKEN"
`),
      p('A good response is JSON with an `available_phone_numbers` array of 3 items, each with a `phone_number` like `+14155550123` and `"capabilities": { "voice": true, ... }`. A `401` means the SID or token is wrong.'),
      table(['Twilio price (US, checked Oct 2026)', 'Amount', 'Notes'], [
        ['Outbound call to a US number', 'about $0.014 per minute', 'Third-party summaries; check twilio.com/en-us/voice/pricing/us'],
        ['Inbound call to a US local number', 'about $0.0085 per minute', 'Rounded up to the next minute per call leg'],
        ['Browser (Voice SDK) leg', 'about $0.004 per minute', 'Charged on top of the phone leg, both directions'],
        ['Call recording', 'about $0.0025 per minute', 'Storage at Twilio $0.0005/min/month, which Etcher avoids by deleting after download'],
        ['US local number', 'about $1.15 per month', ''],
        ['UK local number', '$1.15 to $3.50 per month [verify]', 'Sources disagree. Check twilio.com/en-us/voice/pricing/gb'],
        ['UK outbound', 'about $0.016/min landline, about $0.03/min mobile [verify]', 'UK mobiles cost about double'],
      ]),
      links([
        { label: 'Twilio sign up', url: 'https://www.twilio.com/try-twilio' },
        { label: 'Voice pricing (US)', url: 'https://www.twilio.com/en-us/voice/pricing/us' },
        { label: 'Voice pricing (UK)', url: 'https://www.twilio.com/en-us/voice/pricing/gb' },
        { label: 'Subaccounts API', url: 'https://www.twilio.com/docs/iam/api/subaccounts' },
        { label: 'Voice JavaScript SDK', url: 'https://www.twilio.com/docs/voice/sdks/javascript' },
        { label: 'Access Tokens', url: 'https://www.twilio.com/docs/iam/access-tokens' },
        { label: 'Webhook security (X-Twilio-Signature)', url: 'https://www.twilio.com/docs/usage/webhooks/webhooks-security' },
      ]),
      mistakes([
        { mistake: 'Calls play "You have a trial account" and only reach your own mobile.', fix: 'The account is still on trial. Upgrade it (Admin > Account billing) and add credit.' },
        { mistake: 'Calls to the UK fail with error 13227 or "No International Permission".', fix: 'Geo permissions for the United Kingdom are off. Voice > Settings > Geo permissions > tick United Kingdom > Save. Wait 2 minutes and retry.' },
        { mistake: 'The curl returns 20003 Authenticate.', fix: 'The Auth Token was copied with a space or is the test credentials token. Copy it again from Account Info (the live one, not Test credentials).' },
      ]),
    ],
    checklist: [
      'Sign up and upgrade your Twilio account with $20 credit',
      'Turn on US and UK geo permissions',
      ['Set the two Twilio secrets in Supabase', 'copy:etc-be-twilio-secrets'],
      ['Run the test curl and see 3 available numbers', 'copy:etc-be-twilio-curl'],
    ],
  }),

  task({
    id: 'etc-be-secrets',
    title: 'Create the encryption key and internal secrets',
    outcome: 'Subaccount tokens are encrypted at rest, functions can call each other safely, and cron jobs prove who they are.',
    minutes: 15,
    xp: 25,
    blocks: [
      eli5('Three passwords only your servers know', 'TELEPHONY_ENC_KEY locks each customer\'s Twilio keys in the database, so even someone with a database copy cannot use them. INTERNAL_FN_SECRET lets one of your functions say "it is me" to send-email. CRON_SECRET lets the scheduler prove it is the scheduler. None of them ever go in the browser.'),
      code('etc-be-secrets-gen', 'Terminal (outside Claude Code)', 'bash', `
# 32 random bytes, base64: the AES-256 key
npx supabase secrets set TELEPHONY_ENC_KEY=$(openssl rand -base64 32)
npx supabase secrets set INTERNAL_FN_SECRET=$(openssl rand -hex 32)
npx supabase secrets set CRON_SECRET=$(openssl rand -hex 32)
npx supabase secrets set APP_URL=http://localhost:3000
npx supabase secrets list
`),
      keys([
        { name: 'TELEPHONY_ENC_KEY', where: 'Generated with openssl rand -base64 32', pasteInto: 'Supabase secrets', secret: true },
        { name: 'INTERNAL_FN_SECRET', where: 'Generated with openssl rand -hex 32. Also put the same value in .env.local and Vercel env (the Stripe webhook calls send-email)', pasteInto: 'Supabase secrets', secret: true },
        { name: 'CRON_SECRET', where: 'Generated with openssl rand -hex 32. Also saved into Supabase Vault in the cron task', pasteInto: 'Supabase secrets', secret: true },
        { name: 'APP_URL', where: 'http://localhost:3000 now, your live https URL after deploy', pasteInto: 'Supabase secrets', secret: false },
      ]),
      warn('Never rotate TELEPHONY_ENC_KEY casually', 'Every stored subaccount token is encrypted with it. If you change it, those tokens become unreadable. Save it in your password manager now. To rotate later, ask Claude Code for a re-encrypt script that reads with the old key and writes with the new one.'),
      mistakes([
        { mistake: '`openssl` is not recognised (Windows).', fix: 'Run the commands in Git Bash, or ask Claude Code: "Generate a 32 byte base64 key and two 32 byte hex secrets with node -e and print them".' },
        { mistake: 'Functions say a secret is undefined.', fix: 'Names are case sensitive. Run npx supabase secrets list and compare letter by letter.' },
        { mistake: 'send-email returns 401 when called by the Stripe webhook.', fix: 'INTERNAL_FN_SECRET in Vercel env does not match the Supabase secret. Set both to the same value and redeploy Vercel.' },
      ]),
    ],
    checklist: [
      ['Generate and set the four secrets', 'copy:etc-be-secrets-gen'],
      'Save TELEPHONY_ENC_KEY in your password manager',
      'Add INTERNAL_FN_SECRET to .env.local',
    ],
  }),

  task({
    id: 'etc-be-billing',
    title: 'Make billing workspace-level (Monthly, Annual, minute packs)',
    outcome: 'One subscription per workspace covers the whole team, Annual and Monthly both work, and admins can buy 1,000 extra minutes.',
    minutes: 45,
    xp: 55,
    blocks: [
      eli5('Why the workspace pays, not the person', 'In most apps each person has their own plan. In Etcher the company pays once and everyone in the workspace gets in, however many people join. So the Stripe subscription is stored against the workspace, and the "can I use this?" check asks about the workspace, not the user.'),
      p('The shared Payments steps earlier in this playbook stored subscriptions by user. Etcher\'s SQL already has `subscriptions.workspace_id` as the key. This task adapts the checkout and webhook to match.'),
      steps(
        'Stripe Dashboard (test mode) > **Product catalogue** > **Add product**: name "Etcher", add price **$149.00 USD Recurring Monthly**. Save. Click the product > **Add another price**: **$949.00 USD Recurring Yearly**. Copy both price ids (`price_...`).',
        'Add product "Etcher minute pack": price **$39.00 USD One-off**. Copy the price id.',
        'Product catalogue > **Coupons** > **Create coupon**: name WINBACK50, **Fixed amount off** $50 USD, **Once**. ID: `WINBACK50`.',
        'Developers > Webhooks > your endpoint: make sure these events are selected: checkout.session.completed, customer.subscription.created, customer.subscription.updated, customer.subscription.deleted, invoice.paid, invoice.payment_failed.',
      ),
      keys([
        { name: 'STRIPE_PRICE_MONTHLY', where: 'Stripe > Product catalogue > Etcher > $149 monthly price id', pasteInto: '.env.local', secret: false },
        { name: 'STRIPE_PRICE_ANNUAL', where: 'Stripe > Product catalogue > Etcher > $949 yearly price id', pasteInto: '.env.local', secret: false },
        { name: 'STRIPE_PRICE_MINUTE_PACK', where: 'Stripe > Product catalogue > Etcher minute pack > $39 price id', pasteInto: '.env.local', secret: false },
      ]),
      prompt('etc-be-billing-prompt', 'Paste into Claude Code (plan mode first)', `
Read @PRD.md section 14. Our subscriptions table is keyed by workspace_id (see the migration), not user_id. Change the existing Stripe code:
1. /api/stripe/checkout: body { workspace_id, interval: 'month' | 'year' }. getClaims, then check the user is owner or admin of that workspace with rpc has_workspace_role(workspace_id, 'admin'). Price = STRIPE_PRICE_MONTHLY or STRIPE_PRICE_ANNUAL. Reuse subscriptions.stripe_customer_id for the workspace or create a customer (idempotency key 'customer-' + workspace_id, metadata workspace_id, name = workspace name, email = the user's email). Checkout: mode subscription, subscription_data { trial_period_days: 7, metadata: { workspace_id } }, metadata { workspace_id }, client_reference_id workspace_id, allow_promotion_codes true, success_url APP_URL/app/billing?checkout=success, cancel_url APP_URL/onboarding.
2. /api/stripe/minute-pack: admin only, mode payment, line item STRIPE_PRICE_MINUTE_PACK, metadata { workspace_id, kind: 'minute_pack' }, customer = the workspace customer.
3. /api/stripe/webhook: keep the raw-body signature check and the stripe_events dedupe. Upsert subscriptions by workspace_id from subscription.metadata.workspace_id (or the checkout session's metadata), with status, price_id, plan_interval (from the price's recurring.interval), trial_end, current_period_end, cancel_at_period_end, canceled_at. checkout.session.completed with metadata.kind = 'minute_pack' and payment_status paid: insert usage_ledger { workspace_id, metric 'minute_pack', quantity 1000, cost_micros 0, idempotency_key 'pack:' + session.id }. invoice.payment_failed: POST SUPABASE_URL/functions/v1/send-email with x-internal-secret INTERNAL_FN_SECRET, template payment_failed, to every owner and admin, dedupe_key 'payment_failed:' + invoice.id + ':' + email.
4. /api/stripe/portal: admin only, the workspace's customer.
5. lib/billing.ts: hasAccess(workspaceId) via rpc has_active_access. Replace any user-level paywall check with this.
6. Billing page: wire "Start trial", "Manage billing", "Switch to annual" (portal), "Buy 1,000 minutes ($39)". On ?checkout=success poll subscriptions for 20 seconds before showing the plan. Handle ?coupon=WINBACK50 by passing discounts: [{ coupon: 'WINBACK50' }] to Checkout.
Then run stripe listen --forward-to localhost:3000/api/stripe/webhook and do a test checkout.
`),
      code('etc-be-billing-sql', 'check-billing.sql', 'sql', `
select w.name, s.status, s.plan_interval, s.trial_end, s.price_id
from public.subscriptions s join public.workspaces w on w.id = s.workspace_id;
select public.minutes_status(workspace_id) from public.subscriptions limit 1;
`),
      mistakes([
        { mistake: 'Webhook logs "no workspace_id" and the row never appears.', fix: 'The Checkout session was created without subscription_data.metadata.workspace_id. Stripe copies subscription_data.metadata onto the subscription; plain metadata stays on the session only. Set both.' },
        { mistake: 'A teammate who joined later is sent to the paywall.', fix: 'Something still checks access by user. Search the code for subscriptions with user_id and switch it to has_active_access(workspace_id).' },
        { mistake: 'The minute pack paid but the meter did not change.', fix: 'The webhook ignored the session because mode was payment. Handle checkout.session.completed with metadata.kind = minute_pack before the subscription branch.' },
      ]),
    ],
    checklist: [
      'Create the monthly, yearly and minute pack prices',
      'Create the WINBACK50 coupon',
      ['Run the workspace billing prompt', 'copy:etc-be-billing-prompt'],
      ['Check the subscription row with SQL', 'copy:etc-be-billing-sql'],
      'Buy a test minute pack and see the cap rise to 2,000',
    ],
  }),

  task({
    id: 'etc-be-resend-fn',
    title: 'Give Resend to the edge functions and build the 9 emails',
    outcome: 'send-email can send every Etcher email from Supabase, each one exactly once, in the Quiet Precision look.',
    minutes: 30,
    xp: 40,
    blocks: [
      eli5('Why the key goes in two places', 'Your Next.js app already has the Resend key in .env.local for the welcome email. Etcher also sends emails from Supabase (digests, exports, invites), and edge functions cannot read .env.local. So you hand the same key to Supabase as a secret.'),
      code('etc-be-resend-fn-secrets', 'Terminal (outside Claude Code)', 'bash', `
npx supabase secrets set RESEND_API_KEY=re_paste_your_key
npx supabase secrets set EMAIL_FROM="Etcher <onboarding@resend.dev>"
`),
      keys([
        { name: 'RESEND_API_KEY', where: 'Resend > API Keys > Create API Key, Sending access (re_...). Same key as .env.local', pasteInto: 'Supabase secrets', secret: true },
        { name: 'EMAIL_FROM', where: 'onboarding@resend.dev while testing, then Etcher <hello@yourdomain.com> after you verify your domain in Resend', pasteInto: 'Supabase secrets', secret: false },
      ]),
      p('Resend pricing checked Oct 2026: Free plan 3,000 emails a month (100 a day), Pro $20/month for 50,000. Requests carry an `Idempotency-Key` header (kept 24 hours) so a retried send is not delivered twice. Etcher also dedupes in `email_log`, so a resend weeks later is blocked too.'),
      code('etc-be-resend-fn-curl', 'test-resend.sh', 'bash', `
curl -X POST "https://api.resend.com/emails" \\
  -H "Authorization: Bearer re_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -H "Idempotency-Key: etcher-test-1" \\
  -d '{"from":"Etcher <onboarding@resend.dev>","to":["YOUR_RESEND_LOGIN_EMAIL"],"subject":"Etcher test","text":"It works."}'
`),
      p('A good response is `{"id":"..."}`. Run the exact same command again: Resend returns the same id and does not send a second email.'),
      tip('Preview every template', 'Ask Claude Code: "Add an npm script email:dev that runs the React Email preview server on supabase/functions/_shared/emails so I can see all 11 templates in the browser with sample props."'),
      mistakes([
        { mistake: '"You can only send testing emails to your own email address".', fix: 'onboarding@resend.dev only delivers to your Resend login email. Verify your domain (Deployment phase) to send to anyone.' },
        { mistake: 'Emails land in spam.', fix: 'Verify the domain with SPF and DKIM in Resend, add a DMARC record (v=DMARC1; p=none), and send from a real name like hello@ rather than noreply@.' },
        { mistake: 'React Email import fails in Deno.', fix: 'Use npm: specifiers (npm:@react-email/components, npm:@react-email/render) and set "jsx": "react-jsx" with "jsxImportSource": "npm:react" in supabase/functions/deno.json.' },
      ]),
    ],
    checklist: [
      ['Set the Resend secrets in Supabase', 'copy:etc-be-resend-fn-secrets'],
      ['Send the test email twice and see one delivery', 'copy:etc-be-resend-fn-curl'],
      'Preview all templates in the React Email preview',
    ],
  }),

  task({
    id: 'etc-be-cron',
    title: 'Schedule the workers and email sweeps with pg_cron',
    outcome: 'Recordings, imports and exports process themselves every minute, and the trial, digest, win-back and cleanup jobs run on time.',
    minutes: 25,
    xp: 40,
    blocks: [
      eli5('An alarm clock inside your database', 'pg_cron is a timer that lives in Postgres. Every minute it can "ring" one of your edge functions with pg_net (a web request from the database). The function checks the secret header, does a small batch of work, and goes back to sleep.'),
      steps(
        'Supabase > **Integrations** (or Database > Extensions) > enable **pg_cron** and **pg_net**.',
        'Supabase > **Project Settings** > **Vault** (or Integrations > Vault) > **Add new secret**: name `cron_secret`, value = the same CRON_SECRET you set. Add a second: name `project_url`, value `https://<ref>.supabase.co`.',
        'Paste the SQL below into the SQL Editor and run it.',
      ),
      code('etc-be-cron-sql', 'schedule-etcher.sql', 'sql', `
-- Helper: call an Etcher edge function with the cron secret from Vault.
create or replace function public.call_fn(p_fn text, p_body jsonb default '{}'::jsonb)
returns bigint
language sql
security definer
set search_path = ''
as $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/' || p_fn,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
    ),
    body := p_body
  );
$$;
revoke execute on function public.call_fn(text, jsonb) from public, anon, authenticated;

select cron.schedule('etc-recordings', '* * * * *', $$ select public.call_fn('twilio-recording-callback') $$);
select cron.schedule('etc-imports',    '* * * * *', $$ select public.call_fn('import-leads') $$);
select cron.schedule('etc-exports',    '* * * * *', $$ select public.call_fn('export-leads') $$);
select cron.schedule('etc-deal-won',   '*/5 * * * *', $$ select public.call_fn('send-email', '{"sweep":"deal_won"}') $$);
select cron.schedule('etc-tasks',      '*/5 * * * *', $$ select public.call_fn('send-email', '{"sweep":"task_reminders"}') $$);
select cron.schedule('etc-trial',      '7 * * * *',  $$ select public.call_fn('send-email', '{"sweep":"trial_ending"}') $$);
select cron.schedule('etc-digest',     '11 * * * 1', $$ select public.call_fn('send-email', '{"sweep":"weekly_digest"}') $$);
select cron.schedule('etc-winback',    '10 6 * * *', $$ select public.call_fn('send-email', '{"sweep":"winback"}') $$);
select cron.schedule('etc-reactivate', '15 6 * * *', $$ select public.call_fn('send-email', '{"sweep":"reactivation"}') $$);
select cron.schedule('etc-retry-mail', '20 6 * * *', $$ select public.call_fn('send-email', '{"sweep":"retry_failed"}') $$);
select cron.schedule('etc-bundles',    '25 6 * * *', $$ select public.call_fn('buy-number', '{"action":"bundle_sweep"}') $$);
select cron.schedule('etc-purge',      '20 3 * * *', $$ select public.call_fn('export-leads', '{"mode":"purge"}') $$);

select jobname, schedule, active from cron.job order by jobname;
`),
      p('The purge job calls export-leads in `purge` mode: ask Claude Code to add that mode, which runs `select public.purge_expired()` with the admin client and deletes every returned Storage path (expired exports and recordings older than 365 days).'),
      code('etc-be-cron-check', 'check-cron.sql', 'sql', `
select jobid, status, return_message, start_time
from cron.job_run_details order by start_time desc limit 10;
select id, status_code, left(content::text, 120) from net._http_response order by created desc limit 10;
`),
      mistakes([
        { mistake: 'job_run_details says succeeded but nothing happens.', fix: 'pg_cron only proves the SQL ran. Check net._http_response: a 401 means the Vault cron_secret differs from the CRON_SECRET function secret.' },
        { mistake: 'relation "vault.decrypted_secrets" does not exist.', fix: 'Vault is not enabled. Enable the supabase_vault extension in Database > Extensions, then add the two secrets again.' },
        { mistake: 'The digest goes out at the wrong hour.', fix: 'Cron runs in UTC. The sweep itself checks each user\'s local 08:00 from profiles.timezone, so run it hourly on Mondays (as above), not once.' },
      ]),
    ],
    checklist: [
      'Enable pg_cron and pg_net',
      'Add cron_secret and project_url to Vault',
      ['Run the schedule SQL', 'copy:etc-be-cron-sql'],
      ['Check the last runs and HTTP responses', 'copy:etc-be-cron-check'],
    ],
  }),

  task({
    id: 'etc-be-uk',
    title: 'Get UK numbers working (regulatory bundle)',
    outcome: 'Your own workspace has an approved UK bundle and a London number, so you know exactly what your UK customers go through.',
    minutes: 40,
    xp: 45,
    blocks: [
      eli5('Why the UK asks who you are', 'The UK phone regulator wants every phone number linked to a real person or business, to stop scam calls. Twilio collects your details once in a "bundle", checks them, and only then lets you buy UK numbers. US local numbers do not need this.'),
      steps(
        'In your Etcher app: Settings > Calling > **UK compliance**. The form fields come from Twilio\'s live requirements (the buy-number `uk_regulations` action), so they match what Twilio asks for today.',
        'Fill in your business name, Companies House number (if registered), registered address and contact details. If the form asks for a document, upload a PDF (a recent utility bill or the Companies House certificate).',
        'Click **Submit for review**. The status pill shows **In review**.',
        'Check the bundle in Twilio too: switch to the subaccount (top-left account menu > the "etcher:<workspace id>" subaccount) > **Phone Numbers** > **Regulatory Compliance** > **Bundles**.',
        'Approval usually takes 1 to 3 working days [verify]. The daily bundle sweep updates the pill to **Approved** or **Rejected** with Twilio\'s reason.',
        'When approved: Settings > Numbers > **Buy number** > UK > Local > contains `20` (London) > Buy.',
        'Outbound UK calling also needs an emergency address on the number: the buy action attaches the bundle\'s address. Check it in Twilio: the number\'s page > **Emergency Calling** [verify the exact label].',
      ),
      code('etc-be-uk-curl', 'check-uk-regulation.sh', 'bash', `
curl -G "https://numbers.twilio.com/v2/RegulatoryCompliance/Regulations" \\
  --data-urlencode "IsoCountry=GB" \\
  --data-urlencode "NumberType=local" \\
  --data-urlencode "EndUserType=business" \\
  --data-urlencode "IncludeConstraints=true" \\
  -u "YOUR_ACCOUNT_SID:YOUR_AUTH_TOKEN"
`),
      p('A good response lists `results` with one regulation (`sid` starting `RN`) and a `requirements` object naming the end-user fields and supporting documents Twilio needs. That is what the Etcher form renders.'),
      code('etc-be-uk-sql', 'check-bundle.sql', 'sql', `
select workspace_id, bundle_status, regulatory_bundle_sid, address_sid, bundle_rejection_reason
from public.workspace_telephony where bundle_status <> 'none';
`),
      mistakes([
        { mistake: 'Buying a UK number returns 409 bundle_required.', fix: 'The bundle is not approved yet. Wait for the daily sweep or run the bundle_status action from Settings > Calling > Refresh status.' },
        { mistake: 'The bundle is rejected for "address mismatch".', fix: 'The address must match the business registration exactly (same postcode format and building name). Edit it in the form and resubmit.' },
        { mistake: 'Outbound UK calls fail with an emergency address error.', fix: 'Attach the address SID as the number\'s emergency address (EmergencyAddressSid) through the buy-number function and retry.' },
      ]),
    ],
    checklist: [
      ['Check the live UK requirements with curl', 'copy:etc-be-uk-curl'],
      'Submit a UK bundle for your own workspace',
      'Buy a London number once approved',
      ['Check the bundle status with SQL', 'copy:etc-be-uk-sql'],
    ],
  }),

  task({
    id: 'etc-be-e2e',
    title: 'Run the full end-to-end test',
    outcome: 'Proof that signup, trial, import, pipeline, calling, recording, emails, invites and exports all work together on a clean workspace.',
    minutes: 60,
    xp: 70,
    blocks: [
      eli5('Why test the whole journey', 'Each part worked on its own when you built it. This checks the parts still talk to each other, in the order a real customer uses them. If a step fails, you fix it now instead of on a sales demo.'),
      prompt('etc-be-e2e-prompt', 'Paste into Claude Code', `
Read @PRD.md section 21 (acceptance tests 1 to 12). Walk me through them one at a time on my local app with Stripe in test mode and Twilio live:
- Before each test, tell me exactly what to click.
- After I say "done", run the SQL for that test with the Supabase MCP (read only) and tell me PASS or FAIL with the reason.
- For FAIL, find the cause (edge function logs via the Supabase MCP, Twilio Request Inspector hints, browser console) and propose the smallest fix. Wait for my OK before changing code.
At the end print a table: test, result, notes. Also write scripts/e2e-reset.sql that deletes the test workspace and its Storage files.
`),
      table(['Test', 'What proves it'], [
        ['1 Signup to trial', 'owner, trialing, 6 stages'],
        ['2 Import', '187 inserted, 10 skipped, 3 errors, no duplicate emails'],
        ['3 Forecast', 'weighted value follows the stage %'],
        ['4 Close won', 'status won, deal_won email once'],
        ['5 Call', 'completed, billable minutes, one ledger row'],
        ['6 Recording', 'stored, deleted on Twilio'],
        ['7 Inbound', 'rings browser, voicemail, call-back task'],
        ['8 Roles', 'member cannot reach admin actions'],
        ['9 Isolation', 'zero rows across workspaces'],
        ['10 Export', 'email link works, expires after 24h'],
        ['11 Cap', 'call refused at 1,000 minutes'],
        ['12 Lapsed', 'read-only, export still works'],
      ]),
      mistakes([
        { mistake: 'Test 5 passes but no wrap-up panel shows.', fix: 'The Device "disconnect" event is not wired to the wrap-up state. Ask Claude Code to open wrap-up on disconnect for any call that reached ringing.' },
        { mistake: 'Test 6 stays pending for ever.', fix: 'The recordings cron is not running or TELEPHONY_ENC_KEY changed. Check cron.job_run_details and the worker logs.' },
        { mistake: 'Test 10 email never arrives.', fix: 'export-leads could not call send-email: INTERNAL_FN_SECRET mismatch or EMAIL_FROM still onboarding@resend.dev while sending to another address.' },
      ]),
    ],
    checklist: [
      ['Run the end-to-end prompt', 'copy:etc-be-e2e-prompt'],
      'Pass all 12 acceptance tests',
      'Save the results table in your notes',
    ],
  }),
]
