// Bookwell backend tasks: one account-setup task per service, plus an end-to-end test.
import type { Task } from '../../types'
import { ck, code, eli5, keys, links, mistakes, p, prompt, steps, table, task, tip, warn } from './helpers'

export const backendTasks: Task[] = [
  task({
    id: 'bw-be-google',
    title: 'Set up the Google Calendar API',
    outcome: 'Owners can click "Connect Google Calendar" and their busy times block slots.',
    minutes: 40,
    xp: 50,
    blocks: [
      eli5('Why Google needs a "permission ticket"', 'Your Google keys say "this is the Bookwell app". They do not let you see anyone\'s calendar. Each barber clicks "Allow" once, and Google hands you a refresh token: a ticket that lets Bookwell read their busy times and add bookings. You keep that ticket locked in the database where the browser can never reach it.'),
      steps(
        'Go to console.cloud.google.com and sign in with your Google account. Top bar → project picker → New project → name "Bookwell" → Create. Make sure the new project is selected in the top bar.',
        'Left menu → APIs & Services → Library → search "Google Calendar API" → click it → Enable.',
        'Left menu → Google Auth Platform (older consoles call it "OAuth consent screen") → Get started. App name "Bookwell", user support email = yours → Audience: External → contact email → agree → Create.',
        'Google Auth Platform → Branding: add your home page (https://YOURDOMAIN), privacy policy (https://YOURDOMAIN/privacy) and authorised domain (YOURDOMAIN). You can fill these in after you buy the domain.',
        'Google Auth Platform → Data access → Add or remove scopes → tick `.../auth/calendar.events` and `.../auth/calendar.freebusy` → Update → Save. If calendar.freebusy is not in the list, paste `https://www.googleapis.com/auth/calendar.freebusy` into "Manually add scopes" [verify]. Both are sensitive scopes, which matters at launch.',
        'Google Auth Platform → Audience → Test users → Add users → add your own Gmail and any friend who will test. While the app is in Testing, only these people can connect (up to 100).',
        'Google Auth Platform → Clients → Create client → Application type: Web application → Name "Bookwell web". Authorised redirect URIs: `https://YOUR-PROJECT-REF.supabase.co/functions/v1/bw-google-oauth` (your project ref is in Supabase → Project Settings → General) → Create. Copy the Client ID (ends in `.apps.googleusercontent.com`) and the Client secret (starts with `GOCSPX-`).',
      ),
      keys([
        { name: 'GOOGLE_CLIENT_ID', where: 'Google Cloud → Google Auth Platform → Clients → Bookwell web', pasteInto: 'Supabase secrets', secret: false },
        { name: 'GOOGLE_CLIENT_SECRET', where: 'Same client → Client secret (GOCSPX-...)', pasteInto: 'Supabase secrets', secret: true },
        { name: 'GOOGLE_REDIRECT_URI', where: 'https://YOUR-PROJECT-REF.supabase.co/functions/v1/bw-google-oauth (exactly as registered)', pasteInto: 'Supabase secrets', secret: false },
        { name: 'OAUTH_STATE_SECRET', where: 'Make one up: run `openssl rand -hex 32` in a terminal', pasteInto: 'Supabase secrets', secret: true },
      ]),
      code('bw-be-google-secrets', 'Terminal (outside Claude Code)', 'bash', `
npx supabase secrets set GOOGLE_CLIENT_ID=paste_value_here
npx supabase secrets set GOOGLE_CLIENT_SECRET=paste_value_here
npx supabase secrets set GOOGLE_REDIRECT_URI=https://YOUR-PROJECT-REF.supabase.co/functions/v1/bw-google-oauth
npx supabase secrets set OAUTH_STATE_SECRET=$(openssl rand -hex 32)`),
      prompt('bw-be-google-prompt', 'Paste into Claude Code', `
Google Calendar is set up and the four secrets are in Supabase. Using @PRD.md sections 9.5 and the google.ts helper in 9.1:
1. Build and deploy bw-google-oauth (the edge function prompt in this kit) if it is not deployed yet.
2. Wire the Settings Google card: Connect calls bw-google-oauth ?action=start with my session token and redirects to the url.
3. After I connect my own Google account, call freeBusy for my business for tomorrow (00:00 to 24:00 in my business timezone) with a temporary script that uses the secret key, and print only the busy array. Then delete the script.
Never print the refresh token, access token or client secret.`),
      p('A good freeBusy result looks like this. Each item in `busy` is a block that will hide slots on the booking page.'),
      code('bw-be-google-good', 'freebusy-response.json', 'json', `
{
  "kind": "calendar#freeBusy",
  "timeMin": "2026-10-19T00:00:00.000Z",
  "timeMax": "2026-10-20T00:00:00.000Z",
  "calendars": {
    "primary": {
      "busy": [
        { "start": "2026-10-19T09:00:00Z", "end": "2026-10-19T10:00:00Z" }
      ]
    }
  }
}`),
      mistakes([
        { mistake: 'Google says "Error 400: redirect_uri_mismatch".', fix: 'The URI in Google Cloud and GOOGLE_REDIRECT_URI must match character for character: https, no trailing slash, the right project ref. Fix one of them and try again.' },
        { mistake: 'Google says "Access blocked: Bookwell has not completed the Google verification process".', fix: 'The Gmail you used is not a test user. Add it under Google Auth Platform → Audience → Test users.' },
        { mistake: 'Connect works but Settings shows "missing_refresh".', fix: 'Google only sends a refresh token the first time. Go to myaccount.google.com/permissions, remove Bookwell, then connect again (the prompt=consent setting makes this rare).' },
      ]),
      links([
        { label: 'Google Cloud Console', url: 'https://console.cloud.google.com' },
        { label: 'Calendar API overview', url: 'https://developers.google.com/workspace/calendar/api/guides/overview' },
        { label: 'Calendar API scopes', url: 'https://developers.google.com/workspace/calendar/api/auth' },
        { label: 'freeBusy reference', url: 'https://developers.google.com/workspace/calendar/api/v3/reference/freebusy/query' },
      ]),
    ],
    checklist: [
      ck('bw-be-google-c1', 'Create the Bookwell project and enable the Calendar API'),
      ck('bw-be-google-c2', 'Add the two calendar scopes and yourself as a test user'),
      ck('bw-be-google-c3', 'Create the web client and set the four Supabase secrets', 'copy:bw-be-google-secrets'),
      ck('bw-be-google-c4', 'Copy the Google connect prompt', 'copy:bw-be-google-prompt'),
      ck('bw-be-google-c5', 'See your own busy times in the freeBusy result'),
    ],
  }),
  task({
    id: 'bw-be-twilio',
    title: 'Set up Twilio and register for A2P 10DLC',
    outcome: 'Your app can send confirmation and reminder texts from a registered US number, and hears replies.',
    minutes: 45,
    xp: 55,
    blocks: [
      eli5('One number for every shop', 'Bookwell sends every text from one Twilio number that you own. The text starts with the shop\'s name, so customers know who it is from. US phone networks only deliver business texts from numbers that are registered (that is "A2P 10DLC"), so you register Bookwell once as the sender.'),
      warn('Start the registration today', 'US texts from an unregistered number are blocked. Approval of the brand and campaign often takes 1 to 3 weeks [verify current times in the Twilio console]. Do the steps below on day one, then keep building while you wait.'),
      steps(
        'Go to twilio.com/try-twilio → sign up with email → verify your email and your own mobile number.',
        'Console home → Account Info: copy the Account SID (starts with `AC`) and click to reveal the Auth Token.',
        'Upgrade the account: Admin (top right) → Account billing → Upgrade account, add $20. Trial accounts can only text numbers you verified and cannot register for 10DLC.',
        'Left menu → Phone Numbers → Manage → Buy a number → Country United States → tick SMS → pick a local number → Buy (about $1.15/month).',
        'Left menu → Messaging → Services → Create Messaging Service → name "Bookwell" → use case "Notify my users" → Add Senders → Phone Number → tick your number → Add.',
        'In the same service → Integration → "Send a webhook" → Request URL `https://YOUR-PROJECT-REF.supabase.co/functions/v1/bw-twilio-inbound?kind=inbound` (HTTP POST) → Save. Copy the Messaging Service SID (starts with `MG`) from the service\'s Properties page.',
        'Same service → Opt-Out Management → turn on Advanced Opt-Out and keep the default STOP, START and HELP replies. Edit the HELP reply to: "Bookwell booking texts. Use the link in your text to manage a booking. Reply STOP to opt out."',
        'Left menu → Messaging → Regulatory Compliance → A2P 10DLC (or Trust Hub) → register a Brand. Pick the "Low Volume Standard" brand if Bookwell will send under 6,000 texts a day (about $4.50 one-off) [verify]. You need your legal name or business details and an EIN if you have one; sole proprietors use the Sole Proprietor brand instead [verify].',
        'Then create a Campaign on that brand: use case "Account Notification" (or "Low Volume Mixed" with Customer Care and Account Notification). Description: "Appointment confirmations, reminders and cancellation notices for local service businesses that book through Bookwell." Paste the two sample messages from the code block below. Opt-in description: "Customers enter their mobile number and tick Text me a reminder on the booking page." Link the campaign to the Bookwell Messaging Service. Expect a $15 one-off vetting fee and $1.50 to $10 a month depending on the campaign type.',
      ),
      table(['Fee (checked Oct 2026)', 'Amount', 'When'], [
        ['Local number', 'about $1.15/month', 'monthly'],
        ['Outbound SMS', '$0.0083 per segment + about $0.003 to $0.005 carrier fee', 'per text'],
        ['Brand registration', 'about $4.50 (plus $41.50 secondary vetting for a Standard brand)', 'once'],
        ['Campaign vetting', '$15', 'once per campaign'],
        ['Campaign fee', '$1.50 (low volume mixed) to $10 (standard)', 'monthly'],
      ]),
      code('bw-be-twilio-samples', '10dlc-sample-messages.txt', 'txt', `
Sample 1: Fade Room: booked Skin fade Tue 4 Nov 14:30. Change or cancel: https://bookwell.app/b/cancel/7f3c2a
Sample 2: Fade Room: reminder, Skin fade tomorrow 14:30. Reply C to cancel or manage: https://bookwell.app/b/cancel/7f3c2a

Message flow / opt-in: Customers book on the business's Bookwell page, enter their mobile number and tick "Text me a reminder" (on by default, can be turned off). Texts are only about that booking. Reply STOP to opt out, HELP for help.`),
      keys([
        { name: 'TWILIO_ACCOUNT_SID', where: 'console.twilio.com → Account Info → Account SID (AC...)', pasteInto: 'Supabase secrets', secret: false },
        { name: 'TWILIO_AUTH_TOKEN', where: 'console.twilio.com → Account Info → Auth Token', pasteInto: 'Supabase secrets', secret: true },
        { name: 'TWILIO_MESSAGING_SERVICE_SID', where: 'Messaging → Services → Bookwell → Properties (MG...)', pasteInto: 'Supabase secrets', secret: false },
        { name: 'TWILIO_FROM_NUMBER', where: 'Phone Numbers → Active numbers, in +15551234567 format', pasteInto: 'Supabase secrets', secret: false },
        { name: 'TWILIO_WEBHOOK_URL', where: 'https://YOUR-PROJECT-REF.supabase.co/functions/v1/bw-twilio-inbound (no query string)', pasteInto: 'Supabase secrets', secret: false },
      ]),
      p('Send yourself a first test text from the terminal through the Messaging Service. Replace the values in capitals. Until the campaign is approved, only send to your own verified number.'),
      code('bw-be-twilio-curl', 'test-sms.sh', 'bash', `
curl -X POST "https://api.twilio.com/2010-04-01/Accounts/YOUR_ACCOUNT_SID/Messages.json" \\
  --data-urlencode "To=+15551234567" \\
  --data-urlencode "MessagingServiceSid=YOUR_MG_SID" \\
  --data-urlencode "Body=Fade Room: reminder, Skin fade tomorrow 14:30. Reply C to cancel or manage: https://bookwell.app/b/cancel/test" \\
  -u "YOUR_ACCOUNT_SID:YOUR_AUTH_TOKEN"`),
      p('A good response is JSON with `"status": "accepted"` or `"queued"`, a `sid` starting with `SM` and `"num_segments": "1"`. The text lands on your phone a few seconds later.'),
      mistakes([
        { mistake: 'Error 21608: "The number is unverified".', fix: 'The account is still a trial. Upgrade it under Admin → Account billing, or verify the number under Phone Numbers → Verified Caller IDs.' },
        { mistake: 'Error 30034 on US numbers.', fix: 'The A2P 10DLC campaign is not approved yet or not linked to the Messaging Service. Check Messaging → Regulatory Compliance and the campaign\'s linked service.' },
        { mistake: 'num_segments is 2.', fix: 'The body is over 160 characters or has an emoji or curly quote. Shorten the shop or service name. The sms.ts helper does this for real texts.' },
      ]),
      links([
        { label: 'Twilio sign up', url: 'https://www.twilio.com/try-twilio' },
        { label: 'US SMS pricing', url: 'https://www.twilio.com/en-us/sms/pricing/us' },
        { label: 'A2P 10DLC brand registration', url: 'https://www.twilio.com/docs/trust-hub/registrations/a2p-10dlc-brand' },
        { label: 'A2P 10DLC campaign registration', url: 'https://www.twilio.com/docs/trust-hub/registrations/a2p-10dlc-campaign' },
        { label: 'Advanced Opt-Out', url: 'https://www.twilio.com/docs/messaging/services/advanced-opt-out' },
        { label: 'Webhook security', url: 'https://www.twilio.com/docs/usage/webhooks/webhooks-security' },
      ]),
    ],
    checklist: [
      ck('bw-be-twilio-c1', 'Sign up for Twilio and buy an SMS number'),
      ck('bw-be-twilio-c2', 'Paste the five Twilio values into Supabase secrets'),
      ck('bw-be-twilio-c3', 'Copy the test curl and send yourself a text', 'copy:bw-be-twilio-curl'),
      ck('bw-be-twilio-c4', 'Start A2P 10DLC registration if you use a US number', 'copy:bw-be-twilio-samples'),
      ck('bw-be-twilio-c5', 'Create the Messaging Service with the inbound webhook and Advanced Opt-Out'),
    ],
  }),
  task({
    id: 'bw-be-connect',
    title: 'Turn on Stripe Connect for deposits',
    outcome: 'Each shop connects its own Stripe account and deposits land in its bank.',
    minutes: 40,
    xp: 50,
    blocks: [
      eli5('Two kinds of money', 'Your $19 subscription goes to you through normal Stripe. The $10 deposits belong to the barber, so they go into the barber\'s own Stripe account. Stripe Connect is the bridge: Bookwell creates the checkout, but the money and the card fee sit with the shop.'),
      steps(
        'Stripe Dashboard → make sure Test mode (or a sandbox) is on → search bar → type "Connect" → Get started.',
        'When Stripe asks how you will use Connect, choose "Platform" (software for businesses, they take payments from their own customers).',
        'When asked about the account setup, pick the options where connected accounts (the shops) get the full Stripe Dashboard, pay Stripe fees themselves and Stripe handles losses and disputes. This is the classic "Standard" setup with direct charges, so Bookwell pays no Connect fees [verify the wording in your dashboard].',
        'Connect → Settings → Branding: add the name Bookwell, your icon and the brand colour #C7801A. This shows on the onboarding screens.',
        'Developers → Webhooks (in newer dashboards: Workbench → Webhooks) → Add destination → choose events from "Connected accounts" → tick `checkout.session.completed`, `checkout.session.expired`, `charge.refunded`, `charge.dispute.created`, `account.updated`, `account.application.deauthorized` → Continue → Webhook endpoint → URL `https://YOUR-PROJECT-REF.supabase.co/functions/v1/bw-connect-webhook` → Create.',
        'Open the new destination → Signing secret → Reveal → copy it (starts with `whsec_`). This is a different secret from your subscription webhook.',
      ),
      keys([
        { name: 'STRIPE_SECRET_KEY', where: 'Stripe → Developers → API keys → Secret key (sk_test_ then sk_live_)', pasteInto: 'Supabase secrets', secret: true },
        { name: 'STRIPE_CONNECT_WEBHOOK_SECRET', where: 'Stripe → Webhooks → the Connect destination → Signing secret (whsec_...)', pasteInto: 'Supabase secrets', secret: true },
      ]),
      prompt('bw-be-connect-prompt', 'Paste into Claude Code', `
Stripe Connect is on and STRIPE_SECRET_KEY and STRIPE_CONNECT_WEBHOOK_SECRET are in Supabase secrets.
Build and deploy bw-connect-onboard and bw-connect-webhook from this kit's edge function prompts (@PRD.md 9.6 and 9.9) if they are not deployed yet.
- bw-connect-onboard creates the connected account with the Standard-style controller settings and returns an Account Link.
- bw-connect-webhook verifies the signature with STRIPE_CONNECT_WEBHOOK_SECRET and handles the six events.
- bw-create-booking creates the deposit Checkout Session as a direct charge with { stripeAccount: business.stripe_account_id } and no application fee.
Then walk me through onboarding with Stripe test data and make one $10 test deposit with card 4242 4242 4242 4242.
Show me the booking row and the stripe_events rows afterwards. Never print keys.`),
      code('bw-be-connect-curl', 'check-account.sh', 'bash', `
curl https://api.stripe.com/v1/accounts/acct_YOUR_CONNECTED_ID \\
  -u "sk_test_YOUR_KEY:"`),
      p('A good response shows `"charges_enabled": true` and a `controller` block with `"stripe_dashboard": { "type": "full" }` (older accounts show `"type": "standard"`). If `charges_enabled` is false, the shop has not finished onboarding.'),
      tip('Test the webhook on your laptop', 'Install the Stripe CLI (from the Payments phase) and run `stripe listen --forward-connect-to https://YOUR-PROJECT-REF.supabase.co/functions/v1/bw-connect-webhook`. Use the `whsec_` it prints as STRIPE_CONNECT_WEBHOOK_SECRET while testing, then switch back to the dashboard one.'),
      mistakes([
        { mistake: 'The deposit shows in your own Stripe balance, not the shop\'s.', fix: 'The Checkout Session was created without { stripeAccount }. Ask Claude Code to pass the shop\'s stripe_account_id as the request option, not inside the params.' },
        { mistake: 'Bookings stay pending after paying.', fix: 'The Connect destination is missing or listens to "Your account" instead of "Connected accounts". Recreate it as in step 5 and check the bw-connect-webhook logs in Supabase.' },
        { mistake: 'Webhook logs say "No signatures found matching the expected signature".', fix: 'STRIPE_CONNECT_WEBHOOK_SECRET is the subscription webhook\'s secret, or the code parsed the body as JSON first. Use the Connect destination\'s secret and await req.text().' },
      ]),
      links([
        { label: 'Stripe Connect overview', url: 'https://docs.stripe.com/connect' },
        { label: 'Controller properties (Standard setup)', url: 'https://docs.stripe.com/connect/migrate-to-controller-properties' },
        { label: 'Direct charges', url: 'https://docs.stripe.com/connect/direct-charges' },
        { label: 'Connect webhooks', url: 'https://docs.stripe.com/connect/webhooks' },
        { label: 'Connect pricing', url: 'https://stripe.com/connect/pricing' },
      ]),
    ],
    checklist: [
      ck('bw-be-connect-c1', 'Turn on Connect in test mode as a platform'),
      ck('bw-be-connect-c2', 'Add connected-account events to your webhook'),
      ck('bw-be-connect-c3', 'Copy the Connect prompt into Claude Code', 'copy:bw-be-connect-prompt'),
      ck('bw-be-connect-c4', 'Make a $10 test deposit and see it in the connected account'),
      ck('bw-be-connect-c5', 'Set STRIPE_CONNECT_WEBHOOK_SECRET in Supabase secrets'),
    ],
  }),
  task({
    id: 'bw-be-functions',
    title: 'Run a full booking end to end',
    outcome: 'One real test booking goes through slots, deposit, Google, texts, reminder, reply C and refund, with proof in the database.',
    minutes: 60,
    xp: 70,
    blocks: [
      p('With Google, Twilio and Stripe Connect set up and all nine edge functions deployed, you run the whole story once with your own phone as the customer. This is the test that proves Bookwell works.'),
      keys([
        { name: 'CRON_SECRET', where: 'Make one up: run `openssl rand -hex 24`', pasteInto: 'Supabase secrets', secret: true },
        { name: 'APP_URL', where: 'Your live URL, e.g. https://bookwell.app (use your Vercel URL until the domain is live)', pasteInto: 'Supabase secrets', secret: false },
        { name: 'STRIPE_SECRET_KEY', where: 'Stripe → Developers → API keys → Secret key', pasteInto: 'Supabase secrets', secret: true },
      ]),
      prompt('bw-be-functions-prompt', 'Paste into Claude Code', `
Use the Supabase MCP. Check that all nine Bookwell functions are deployed (bw-public-slots, bw-create-booking, bw-connect-webhook, bw-manage-booking, bw-booking-action, bw-google-oauth, bw-connect-onboard, bw-twilio-inbound, bw-reminders) with verify_jwt false, and that the bw-reminders cron job exists (select * from cron.job). Create anything missing from the kit prompts.
Then guide me through this run, one step at a time, and after each step show me the SQL result that proves it:
1. Book my $10 service 25 hours from now on my own booking page with my real mobile number and card 4242 4242 4242 4242.
   Proof: bookings row confirmed with stripe_payment_intent_id and google_event_id; sms_messages confirmation delivered; usage_ledger row sms:confirmation:<id>.
2. Set reminder_hours to 26 for my business, call bw-reminders once with the cron secret, then set it back to 24.
   Proof: reminder_sent_at set, sms_messages reminder row, a second call sends nothing.
3. I reply C to the reminder.
   Proof: inbound_sms handled_as cancel, booking cancelled by customer, refund_status pending then refunded, Google event gone.
4. Book again, then cancel from the Bookings page with "Cancel and refund".
   Proof: refund_status refunded and the cancellation text arrived.
5. Book a third time and close the Stripe tab without paying. Run select public.expire_stale_holds(null) after 30 minutes.
   Proof: that booking is expired and the slot shows again on the page.
Write the results into docs/e2e-results.md with the date.`),
      code('bw-be-functions-sql', 'Supabase SQL Editor: the full story of your last booking', 'sql', `
-- Replace the id with your booking id
select type, data, created_at
from public.booking_events
where booking_id = 'YOUR-BOOKING-ID'
order by created_at;

select kind, status, segments, error_code from public.sms_messages
where booking_id = 'YOUR-BOOKING-ID' order by created_at;

select metric, qty, idempotency_key from public.usage_ledger
where ref_id = 'YOUR-BOOKING-ID' or idempotency_key like '%YOUR-BOOKING-ID%';`),
      tip('Test the reminder without waiting a day', 'Raising reminder_hours to 26 for a booking 25 hours away makes it due straight away. Change it back to 24 afterwards so real customers get their text at the right time.'),
      mistakes([
        { mistake: 'Step 1 confirms but no text arrives.', fix: 'Check sms_messages.error_code. 30034 means the 10DLC campaign is not approved yet; until then, only your verified number works. No row at all: the TWILIO_ secrets are missing from Supabase.' },
        { mistake: 'Step 2 sends nothing.', fix: 'The booking was made inside the reminder window, so the confirmation counted as the reminder. Make the booking first, then raise reminder_hours, or check created_at against starts_at minus the window.' },
        { mistake: 'Step 3 gets no reply text.', fix: 'The Messaging Service webhook URL is wrong or the signature check fails. Look at bw-twilio-inbound logs: a 403 means TWILIO_WEBHOOK_URL does not match the URL in Twilio exactly.' },
      ]),
    ],
    checklist: [
      ck('bw-be-functions-c1', 'Add CRON_SECRET, APP_URL and STRIPE_SECRET_KEY to Supabase secrets'),
      ck('bw-be-functions-c2', 'Copy the deploy prompt into Claude Code', 'copy:bw-be-functions-prompt'),
      ck('bw-be-functions-c3', 'Get a reminder text for a test booking'),
      ck('bw-be-functions-c4', 'Cancel a booking by replying C and see the refund'),
      ck('bw-be-functions-c5', 'Check the booking story with the SQL', 'copy:bw-be-functions-sql'),
    ],
  }),
]
