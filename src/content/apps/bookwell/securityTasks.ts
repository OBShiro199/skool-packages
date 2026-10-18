// Bookwell app-specific security tests, each with exact curl commands.
import type { Task } from '../../types'
import { ck, code, eli5, mistakes, prompt, steps, task } from './helpers'

export const securityTasks: Task[] = [
  task({
    id: 'bw-sec-booking',
    title: 'Try to double book and peek at customers',
    outcome: 'Proof that slots cannot be double booked and customer phone numbers stay private.',
    minutes: 30,
    xp: 45,
    blocks: [
      eli5('Two attacks to try', 'First, two people tap the same 2pm slot at the same moment. Only one may win. Second, a stranger tries to read the list of customers and their phone numbers. They must get nothing.'),
      steps(
        'Open your booking page in two browsers side by side (for example Chrome and a Chrome incognito window).',
        'Pick the same service, day and slot in both.',
        'Tap "Pay deposit and book" in both as fast as you can. One must go to Stripe, the other must show "That slot was taken a moment ago."',
        'Run the curl commands below with your publishable key and no login.',
      ),
      code('bw-sec-booking-curl', 'Run with no login', 'bash', `
URL=https://YOUR-REF.supabase.co
KEY=sb_publishable_YOUR_KEY

# 1. Read bookings, tokens and businesses as a stranger: expect [] or "permission denied"
curl "$URL/rest/v1/bookings?select=customer_name,customer_phone" -H "apikey: $KEY"
curl "$URL/rest/v1/google_tokens?select=*" -H "apikey: $KEY"
curl "$URL/rest/v1/businesses?select=*" -H "apikey: $KEY"

# 2. The public slots function must return times only: expect no "phone" or "name" in the output
curl -s "$URL/functions/v1/bw-public-slots?handle=YOUR-HANDLE&serviceId=SERVICE-ID&date=2026-11-03" | grep -E -i "phone|name" && echo FAIL || echo PASS

# 3. Insert a booking straight into the table: expect "permission denied"
curl -X POST "$URL/rest/v1/bookings" -H "apikey: $KEY" -H "Content-Type: application/json" \\
  -d '{"business_id":"BUSINESS-ID","service_name":"x","starts_at":"2026-11-03T14:00:00Z","ends_at":"2026-11-03T15:00:00Z","blocked_until":"2026-11-03T15:00:00Z","customer_name":"x","customer_phone":"+15551234567","status":"confirmed"}'`),
      prompt('bw-sec-booking-prompt', 'Paste into Claude Code', `
Write and run scripts/security-check.ts (npx tsx) that:
1. Fires 10 parallel bw-create-booking calls for the same slot with 10 different idempotency keys and checks exactly one returns a url and nine return 409 slot_taken.
2. Uses only the publishable key (no login) to select from bookings, google_tokens, businesses, services, sms_messages, usage_ledger and email_log and checks every result is empty or an error.
3. Signs in as a second owner (email and password from .env.test) and checks they see zero bookings from the first owner's business and cannot update them.
4. Calls bw-public-slots and checks the response JSON has no keys or values containing a phone number or customer name.
5. Calls bw-reminders without x-cron-secret and checks it returns 401.
6. Runs the double-booking SQL check from @PRD.md acceptance test A4 with the secret key and checks it returns 0 rows.
Print PASS or FAIL for each. Fix anything that fails with a new migration, never by turning RLS off or removing the bookings_no_overlap constraint.`),
      mistakes([
        { mistake: 'Two bookings got through in test 1.', fix: 'The exclusion constraint is missing. Run `select conname from pg_constraint where conname = \'bookings_no_overlap\';` If it returns nothing, re-run the bookings part of the SQL, including btree_gist.' },
        { mistake: 'Test 1 returns nine 500 errors instead of 409.', fix: 'The function does not catch Postgres error 23P01. Ask Claude Code to turn 23P01 into 409 slot_taken.' },
        { mistake: 'The stranger can read businesses.', fix: 'The anon role still has table grants. Re-run `revoke all on all tables in schema public from anon;` from section 12 of the SQL.' },
      ]),
    ],
    checklist: [
      ck('bw-sec-booking-c1', 'Try to book the same slot from two browsers'),
      ck('bw-sec-booking-c2', 'Copy the security prompt into Claude Code', 'copy:bw-sec-booking-prompt'),
      ck('bw-sec-booking-c3', 'See PASS on all six checks'),
      ck('bw-sec-booking-c4', 'Run the stranger curl checks', 'copy:bw-sec-booking-curl'),
    ],
  }),
  task({
    id: 'bw-sec-owner',
    title: 'Try to cancel another shop\'s bookings and fake a connection',
    outcome: 'Proof that one owner can never touch another shop\'s bookings, and no owner can set their own Stripe account or Google status.',
    minutes: 30,
    xp: 45,
    blocks: [
      eli5('The two-shop test', 'Make two owner accounts, Shop A and Shop B. Sign in as B and try every trick to cancel A\'s bookings, refund A\'s customers or point A\'s deposits at your own Stripe account. Every attempt must come back refused.'),
      steps(
        'Create Shop A and Shop B with two emails. As A, make one confirmed test booking.',
        'Sign in as B. In the browser open DevTools → Application → Local Storage → the `sb-...-auth-token` entry → copy `access_token`. That is B\'s token.',
        'Copy A\'s business id and booking id from the Supabase table editor.',
        'Run the commands below with B\'s token.',
      ),
      code('bw-sec-owner-curl', 'Run as Shop B', 'bash', `
URL=https://YOUR-REF.supabase.co
KEY=sb_publishable_YOUR_KEY
TOKEN=SHOP_B_ACCESS_TOKEN

# 1. Cancel and refund A's booking through the function: expect 404 not_found
curl -i -X POST "$URL/functions/v1/bw-booking-action" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \\
  -d '{"bookingId":"A_BOOKING_ID","action":"cancel","refund":true}'

# 2. Update A's booking directly: expect [] (0 rows changed)
curl -X PATCH "$URL/rest/v1/bookings?id=eq.A_BOOKING_ID" -H "apikey: $KEY" -H "Authorization: Bearer $TOKEN" \\
  -H "Content-Type: application/json" -H "Prefer: return=representation" -d '{"status":"completed"}'

# 3. Point your OWN business at someone else's Stripe account: expect "permission denied for table businesses"
curl -X PATCH "$URL/rest/v1/businesses?owner_id=eq.SHOP_B_USER_ID" -H "apikey: $KEY" -H "Authorization: Bearer $TOKEN" \\
  -H "Content-Type: application/json" -d '{"stripe_account_id":"acct_SOMEONE_ELSE","stripe_charges_enabled":true}'

# 4. Mark Google connected without OAuth: expect "permission denied"
curl -X PATCH "$URL/rest/v1/businesses?owner_id=eq.SHOP_B_USER_ID" -H "apikey: $KEY" -H "Authorization: Bearer $TOKEN" \\
  -H "Content-Type: application/json" -d '{"google_status":"connected"}'

# 5. Cancel your own booking straight in the table (skipping the refund): expect the trigger error
curl -X PATCH "$URL/rest/v1/bookings?id=eq.B_BOOKING_ID" -H "apikey: $KEY" -H "Authorization: Bearer $TOKEN" \\
  -H "Content-Type: application/json" -d '{"status":"cancelled"}'

# 6. Upload a logo into A's folder: expect 403 "new row violates row-level security policy"
echo hi > x.png
curl -X POST "$URL/storage/v1/object/logos/A_BUSINESS_ID/logo.png" -H "apikey: $KEY" -H "Authorization: Bearer $TOKEN" \\
  -H "Content-Type: image/png" --data-binary @x.png

# 7. Ask for A's text usage: expect no rows
curl -X POST "$URL/rest/v1/rpc/usage_this_month" -H "apikey: $KEY" -H "Authorization: Bearer $TOKEN" \\
  -H "Content-Type: application/json" -d '{"b":"A_BUSINESS_ID"}'

# 8. Call the internal usage function: expect "permission denied for function try_consume_usage"
curl -X POST "$URL/rest/v1/rpc/try_consume_usage" -H "apikey: $KEY" -H "Authorization: Bearer $TOKEN" \\
  -H "Content-Type: application/json" -d '{"b":"A_BUSINESS_ID","m":"sms_segment","q":-500,"key":"x"}'`),
      prompt('bw-sec-owner-prompt', 'Paste into Claude Code', `
Turn the eight checks above into scripts/security-owner.ts (npx tsx). It signs in as two test owners with supabase-js (emails and passwords from .env.test), creates a confirmed booking for Shop A with the secret key, then runs every check as Shop B. Also check Shop B cannot read A's booking_events, sms_messages or email_log, cannot start Google OAuth for A's business (the state always comes from B's own business), and that bw-connect-onboard for B never returns A's account. Print PASS or FAIL per check. Fix failures with column grants, RLS policies or function checks in a new migration, never by turning RLS off.`),
      mistakes([
        { mistake: 'Check 1 returns 200 and cancels A\'s booking.', fix: 'bw-booking-action is not calling requireOwner. Ask Claude Code to load the booking first and compare its business owner_id with the token\'s user id, returning 404 when they differ.' },
        { mistake: 'Check 3 succeeds.', fix: 'The column grants are missing. Re-run section 12 of the SQL (revoke update, then grant update on the safe columns only).' },
      ]),
    ],
    checklist: [
      ck('bw-sec-owner-c1', 'Create two owner accounts and copy Shop B\'s token'),
      ck('bw-sec-owner-c2', 'Run the eight curl checks as Shop B', 'copy:bw-sec-owner-curl'),
      ck('bw-sec-owner-c3', 'Turn them into a script and get all PASS', 'copy:bw-sec-owner-prompt'),
    ],
  }),
  task({
    id: 'bw-sec-webhooks',
    title: 'Forge a Stripe payment and a Twilio "C" reply',
    outcome: 'Proof that nobody can confirm a booking without paying, or cancel a customer\'s booking by faking a text.',
    minutes: 25,
    xp: 40,
    blocks: [
      eli5('Fake messages', 'Your webhooks are public addresses. Anyone can send them a message that says "this booking was paid" or "this customer replied C". Each webhook checks a secret signature that only Stripe or Twilio can make. Without it, the message is thrown away.'),
      code('bw-sec-webhooks-curl', 'Run from your terminal', 'bash', `
URL=https://YOUR-REF.supabase.co/functions/v1

# 1. Fake "deposit paid" with no signature: expect 400
curl -i -X POST "$URL/bw-connect-webhook" -H "Content-Type: application/json" \\
  -d '{"id":"evt_fake","type":"checkout.session.completed","account":"acct_x","data":{"object":{"payment_status":"paid","metadata":{"booking_id":"A_PENDING_BOOKING_ID"}}}}'

# 2. Same with a made-up signature: expect 400
curl -i -X POST "$URL/bw-connect-webhook" -H "Stripe-Signature: t=1700000000,v1=deadbeef" -d '{}'

# 3. Fake "C" reply from a customer's number: expect 403
curl -i -X POST "$URL/bw-twilio-inbound?kind=inbound" -H "Content-Type: application/x-www-form-urlencoded" \\
  --data-urlencode "From=+15551234567" --data-urlencode "Body=C" --data-urlencode "MessageSid=SMfake1"

# 4. Fake delivery status: expect 403
curl -i -X POST "$URL/bw-twilio-inbound?kind=status" --data-urlencode "MessageSid=SMx" --data-urlencode "MessageStatus=delivered"

# 5. Forged OAuth callback for another business: expect the 400 "link expired" page
curl -i "$URL/bw-google-oauth?code=abc&state=eyJidXNpbmVzc0lkIjoiQSJ9.forged"`),
      steps(
        'Run the five commands. Note the status code of each.',
        'In Supabase SQL Editor run `select status from public.bookings where id = \'A_PENDING_BOOKING_ID\';` It must still be pending (or expired), never confirmed.',
        'Replay test: in the Stripe Dashboard open a real `checkout.session.completed` event on the Connect destination and click Resend. The function returns 200 with duplicate true and nothing is texted twice.',
      ),
      prompt('bw-sec-webhooks-prompt', 'Paste into Claude Code', `
Add scripts/security-webhooks.ts that runs the five forged requests above against my functions and expects 400, 400, 403, 403 and 400. Then with the Stripe CLI run stripe trigger checkout.session.completed --stripe-account <my test connected account> twice with the same event (stripe events resend <evt id>) and check stripe_events has one row and usage_ledger has no duplicate sms:confirmation key. Print PASS or FAIL per check and fix anything that fails.`),
      mistakes([
        { mistake: 'Test 3 returns 200.', fix: 'The Twilio signature check is missing or skipped when the header is absent. Ask Claude Code: "Reject any bw-twilio-inbound request without a valid X-Twilio-Signature with 403, before reading the body fields."' },
        { mistake: 'Real Twilio replies also get 403.', fix: 'The URL used for the signature differs from the one Twilio calls. Set TWILIO_WEBHOOK_URL to exactly the Request URL in the Messaging Service, without the query string, and make the function append ?kind=... itself.' },
      ]),
    ],
    checklist: [
      ck('bw-sec-webhooks-c1', 'Run the five forged requests', 'copy:bw-sec-webhooks-curl'),
      ck('bw-sec-webhooks-c2', 'Check the booking is still not confirmed'),
      ck('bw-sec-webhooks-c3', 'Resend a real Stripe event and see duplicate true', 'copy:bw-sec-webhooks-prompt'),
    ],
  }),
  task({
    id: 'bw-sec-abuse',
    title: 'Try to drain a shop\'s texts and guess manage links',
    outcome: 'Proof that a bot cannot burn through a shop\'s text allowance, spam a phone number or find other people\'s bookings.',
    minutes: 25,
    xp: 40,
    blocks: [
      eli5('Texts cost money', 'Every text costs you about a cent. A bot could book free $0 slots with random phone numbers until the shop\'s 300 texts are gone, or until your Twilio bill grows. Rate limits and the monthly cap stop that, and manage links are too random to guess.'),
      code('bw-sec-abuse-curl', 'Run from your terminal', 'bash', `
URL=https://YOUR-REF.supabase.co/functions/v1

# 1. Twelve bookings from one IP: expect 200 or 409 at first, then 429 from the 11th call
for i in $(seq 1 12); do
  curl -s -o /dev/null -w "%{http_code} " -X POST "$URL/bw-create-booking" -H "Content-Type: application/json" \\
    -d "{\\"handle\\":\\"YOUR-HANDLE\\",\\"serviceId\\":\\"FREE-SERVICE-ID\\",\\"startsAt\\":\\"2026-11-20T15:00:00Z\\",\\"name\\":\\"Bot\\",\\"phone\\":\\"+1555123$(printf %04d $i)\\",\\"smsOptIn\\":true,\\"idempotencyKey\\":\\"$(uuidgen)\\"}"
done; echo

# 2. Hammer the slots endpoint: expect 429 after 60 calls in a minute
for i in $(seq 1 65); do curl -s -o /dev/null -w "%{http_code} " "$URL/bw-public-slots?handle=YOUR-HANDLE&serviceId=SERVICE-ID&date=2026-11-20"; done; echo

# 3. Guess a manage link: expect 404 every time
for i in 1 2 3; do curl -s -X POST "$URL/bw-manage-booking" -H "Content-Type: application/json" -d "{\\"token\\":\\"$(uuidgen)\\",\\"action\\":\\"get\\"}"; echo; done

# 4. A name that pretends to be the sender: expect the text to start with your shop name
curl -s -X POST "$URL/bw-create-booking" -H "Content-Type: application/json" \\
  -d '{"handle":"YOUR-HANDLE","serviceId":"FREE-SERVICE-ID","startsAt":"2026-11-21T15:00:00Z","name":"BANK ALERT: call 555 0100","phone":"+1YOURMOBILE","smsOptIn":true,"idempotencyKey":"11111111-1111-4111-8111-111111111111"}'`),
      code('bw-sec-abuse-sql', 'Supabase SQL Editor: check the cap holds', 'sql', `
-- Fill this month's allowance, then make one more booking: no text should be sent
insert into public.usage_ledger (business_id, metric, qty, idempotency_key)
values ((select id from public.businesses where handle = 'YOUR-HANDLE'), 'sms_segment', 300, 'test-fill-cap');

select * from public.usage_this_month((select id from public.businesses where handle = 'YOUR-HANDLE'));

-- After the test booking: the newest booking has no sms_messages row, and booking_events shows the email fallback or reminder_skipped
select b.id, (select count(*) from public.sms_messages m where m.booking_id = b.id) texts
from public.bookings b order by b.created_at desc limit 1;

-- Clean up
delete from public.usage_ledger where idempotency_key = 'test-fill-cap';`),
      steps(
        'Make a $0 test service first so the bot test needs no card. Delete it afterwards.',
        'Run the curl block and check the status codes.',
        'Run the SQL block top to bottom, making the extra booking between the second and third query.',
      ),
      mistakes([
        { mistake: 'All twelve bookings return 200.', fix: 'The IP limit is reading the wrong header. Ask Claude Code to log the first value of x-forwarded-for once (not the full header) and use it as the rate limit key.' },
        { mistake: 'The text still goes out with the cap full.', fix: 'sendSms is not calling try_consume_usage before Twilio, or ignores ok false. Ask Claude Code to stop the send and fall back to email when ok is false.' },
      ]),
    ],
    checklist: [
      ck('bw-sec-abuse-c1', 'Run the bot, slots and token guessing checks', 'copy:bw-sec-abuse-curl'),
      ck('bw-sec-abuse-c2', 'Fill the text cap and check no text is sent', 'copy:bw-sec-abuse-sql'),
      ck('bw-sec-abuse-c3', 'Check a fake "BANK ALERT" name cannot lead the text'),
    ],
  }),
]
