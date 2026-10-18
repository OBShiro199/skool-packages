// Bookwell edge functions: one full Claude Code prompt per function.
import type { EdgeFunctionDef } from '../../types'

const shared = `Shared helpers: if supabase/functions/_shared/ does not exist yet, build it first exactly as described in the bw-public-slots prompt (supabase.ts, http.ts, auth.ts, log.ts, retry.ts, ratelimit.ts, slots.ts, google.ts, stripe.ts, sms.ts, email.ts, usage.ts, booking.ts) and reuse it. Do not copy helpers into the function.`

const publicNote = `This function is PUBLIC: customers never log in. It does NOT require a user token, so ignore the "reject anonymous requests with 401" rule in the general rules below. Instead it protects itself with rate limits, strict zod validation and whitelisted output fields.`

const promptSlots = `Read @PRD.md sections 5.2, 9 (shared rules), 9.1, 10 and 15. ${publicNote}

PART A: shared helpers in supabase/functions/_shared/ (every Bookwell function uses them)
1. supabase.ts: adminClient() from SUPABASE_URL and JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS')!)['default'] (fall back to SUPABASE_SERVICE_ROLE_KEY), auth { persistSession: false }.
2. http.ts: HttpError(status, code, message); json(body, status, extraHeaders); cors(req) allowing APP_URL and http://localhost:3000 with OPTIONS handling; serve(handler) wrapping Deno.serve that turns HttpError into { code, message } and anything else into 500 { code: 'internal', message: 'Something went wrong. Try again in a minute.' } after logging it. clientIp(req) = first value of x-forwarded-for.
3. auth.ts: requireUser(req) reads Authorization: Bearer <jwt>, calls supabase.auth.getClaims(jwt), returns { userId: claims.sub, email }; 401 otherwise. requireOwner(userId, businessId) checks businesses.owner_id (404 not_found if not theirs). requireAccess(userId) calls has_active_access (402 no_access). requireCron(req) compares x-cron-secret with CRON_SECRET in constant time (401).
4. log.ts: log(fn, step, data) prints one JSON line { fn, step, ts, ...data }. A denylist drops keys named phone, name, email, body, token, code before printing.
5. retry.ts: withRetry(fn, { tries: 3, baseMs: 500 }) with exponential backoff and jitter, retries only on network errors, 408, 429 and 5xx, honours retry-after up to 10 s.
6. ratelimit.ts: limit(key, max, seconds) calls the hit_rate_limit RPC and throws HttpError(429, 'rate_limited', 'Too many tries. Wait a minute and try again.').
7. slots.ts: computeSlots(input) exactly as PRD section 10, using npm:luxon@3. Pure: no database, no fetch, no Deno APIs, so vitest can import it from lib/slots.test.ts. Also export dayBoundsUtc(date, timezone) and toLocalLabel(iso, timezone, us: boolean).
8. google.ts: getAccessToken(businessId) reads google_tokens; if access_token_expires_at is more than 60 s away reuse it, else POST https://oauth2.googleapis.com/token (grant_type refresh_token, client_id GOOGLE_CLIENT_ID, client_secret GOOGLE_CLIENT_SECRET) and save the new token and expiry. On error invalid_grant: set businesses.google_status = 'error', queue the google_error email (email.ts) and throw GoogleDisconnected. freeBusy(businessId, timeMin, timeMax) POSTs https://www.googleapis.com/calendar/v3/freeBusy with items [{ id: google_calendar_id }] and returns busy blocks. getBusyCached(businessId, day, tz) reads busy_cache and only calls freeBusy if fetched_at is over 60 s old, then upserts. createEvent, patchEvent, deleteEvent use https://www.googleapis.com/calendar/v3/calendars/{calendarId}/events (summary "<service>: <customer name>", description with the phone and the manage link, start/end with timeZone = business timezone, reminders useDefault true). deleteEvent treats 404 and 410 as done.
9. stripe.ts: stripe = new Stripe(STRIPE_SECRET_KEY, { httpClient: Stripe.createFetchHttpClient() }) from npm:stripe, and cryptoProvider = Stripe.createSubtleCryptoProvider().
10. usage.ts: consume(businessId, metric, qty, key, refId) calls try_consume_usage and returns { ok, used, cap, duplicate }. refund(key) calls refund_usage.
11. sms.ts: buildBody(kind, vars) with the PRD section 12 templates; toGsm(text) replaces curly quotes, dashes and emoji with plain characters; segments(text) returns 1 for up to 160 GSM-7 characters, else ceil(len / 153). sendSms({ businessId, bookingId, kind, to, body }) does: skip if the phone is in sms_opt_outs (return 'opted_out'); consume('sms_segment', segments, 'sms:' + kind + ':' + bookingId) (return 'over_cap' if not ok, 'duplicate' if duplicate); insert sms_messages (queued); withRetry POST https://api.twilio.com/2010-04-01/Accounts/{TWILIO_ACCOUNT_SID}/Messages.json with basic auth SID:TOKEN and form fields To, MessagingServiceSid = TWILIO_MESSAGING_SERVICE_SID, Body, StatusCallback = TWILIO_WEBHOOK_URL + '?kind=status'; save twilio_sid and status. Twilio 4xx before sending (for example 21211 invalid number, 21610 opted out): refund the usage key, mark the row failed with error_code, upsert sms_opt_outs on 21610. Write a booking_events row sms_sent or sms_failed.
12. email.ts: sendEmail({ template, to, key, businessId, bookingId, userId, subject, html, text, replyTo }) inserts email_log first (unique key: duplicate means already sent, return 'duplicate'), POSTs https://api.resend.com/emails with Authorization: Bearer RESEND_API_KEY and header Idempotency-Key: key, from EMAIL_FROM, then saves resend_id and 'sent' or the error and 'failed'. Customer emails use the display name "<shop> via Bookwell" and reply_to the owner's email.
13. booking.ts: confirmSideEffects(bookingId) (Google event if connected and google_event_id is null, confirmation SMS if opted in, customer email if given, owner email if notify_owner_email) where every step is guarded so running it twice does nothing new; cancelSideEffects(bookingId, by, refund) (refund through Stripe on the connected account with idempotency key 'bw-refund-' + bookingId and refund_status pending, delete the Google event, cancellation SMS and email). Both write booking_events. Errors in one step are logged and do not stop the next.
Imports allowed: npm:@supabase/supabase-js@2, npm:zod@3, npm:luxon@3, npm:stripe, npm:libphonenumber-js. Ask me before adding any other.

PART B: supabase/functions/bw-public-slots/index.ts
Contract (GET, public):
- Query (zod): handle matches ^[a-z0-9-]{3,30}$, serviceId uuid, date YYYY-MM-DD.
- limit('slots:' + clientIp(req), 60, 60).
- Load the business by handle (404 not_found). If business_has_access is false return 200 { slots: [], paused: true, timezone }.
- Load the service (active, same business, 404 otherwise). If deposit_cents > 0 and stripe_charges_enabled is false: 404 not_found (the page hides it anyway).
- Load availability rows for the weekday of date in the business timezone, the days_off row, and bookings with status pending (hold not expired) or confirmed whose [starts_at, blocked_until) overlaps the day.
- If google_status is 'connected', getBusyCached. If Google throws, log it, set calendarStale true and carry on (fail open, PRD 5.2).
- computeSlots with the business rules (min_notice_minutes, max_days_ahead, slot_step_minutes) and service minutes and buffer.
- Return 200 { slots, timezone, calendarStale? } with Cache-Control: public, max-age=30. The response must never contain names, phones, emails or booking ids.

PART C: tests
Write lib/slots.test.ts (vitest) with the 8 cases in PRD section 10 and run npx vitest run. All must pass before you deploy.

Deploy: npx supabase functions deploy bw-public-slots --no-verify-jwt
Curl test (no token needed):
curl -i "$SUPABASE_URL/functions/v1/bw-public-slots?handle=faderoom&serviceId=<service uuid>&date=2026-11-03"
Expected: 200 with { "slots": ["2026-11-03T14:00:00.000Z", ...], "timezone": "America/Chicago" }. A bad date returns 400, an unknown handle 404, the 61st call in a minute 429.
Plan first, then wait for my OK.`

const promptCreate = `Read @PRD.md sections 8.1, 9.2, 11, 15 and 16.1. ${shared} ${publicNote}

Build supabase/functions/bw-create-booking/index.ts.
Contract (POST, public, JSON):
- Body (zod): { handle, serviceId: uuid, startsAt: ISO datetime, name: 2..80 chars (trim, strip control characters), phone: string, email?: email max 254, smsOptIn: boolean, idempotencyKey: uuid }.
- Rate limits: limit('book:ip:' + ip, 10, 3600), limit('book:phone:' + phone, 3, 3600) after normalising, limit('book:day:' + businessId + ':' + phone, 5, 86400).
- Normalise the phone with parsePhoneNumberFromString from libphonenumber-js. Default country: US for America/* timezones except America/Toronto style Canadian zones (CA), GB for Europe/London, else require a + prefix. Invalid: 400 bad_input { field: 'phone', message: 'Check your mobile number, including the country code.' }.
- Load business and service (as bw-public-slots). No access: 402 paused. Deposit > 0 and charges not enabled: 409 payouts_not_ready.
- Idempotency: select bookings by (business_id, idempotency_key). If found and pending with stripe_checkout_id, retrieve the session on the connected account; if it is still open return { bookingId, url: session.url }. If found and confirmed return the done URL.
- expire_stale_holds(business_id), then re-run computeSlots for that day (same inputs as bw-public-slots) and check startsAt is in the list, else 409 slot_taken 'That slot was taken a moment ago.'
- Insert the booking: status pending, hold_expires_at now + 30 min, ends_at = startsAt + minutes, blocked_until = ends_at + buffer_minutes, service_name, deposit_cents, currency, customer fields, sms_opt_in, idempotency_key. Catch Postgres code 23P01 and return 409 slot_taken. Write booking_events 'created'.
- Deposit 0: update status confirmed, confirmed_at now, hold_expires_at null, return { bookingId, url: APP_URL/b/<handle>/done?b=<id>&t=<cancel_token> } and run confirmSideEffects in EdgeRuntime.waitUntil.
- Deposit > 0: stripe.checkout.sessions.create({ mode: 'payment', line_items: [{ quantity: 1, price_data: { currency, unit_amount: deposit_cents, product_data: { name: 'Deposit: ' + service name } } }], expires_at: now + 1800 seconds, metadata: { booking_id }, payment_intent_data: { metadata: { booking_id }, description: business name + ' deposit' }, customer_email: email if given, success_url, cancel_url } , { stripeAccount: business.stripe_account_id, idempotencyKey: 'bw-checkout-' + bookingId }). No application_fee_amount. Save stripe_checkout_id. Return { bookingId, url }.
- If Stripe fails: set the booking expired (frees the slot) and return 502 { code: 'payment_unavailable', message: 'Payments are not working right now. Try again in a minute.' }.
- Log fn, step, business_id, booking_id and ms only.

Deploy: npx supabase functions deploy bw-create-booking --no-verify-jwt
Curl test:
curl -i -X POST "$SUPABASE_URL/functions/v1/bw-create-booking" -H "Content-Type: application/json" -d '{"handle":"faderoom","serviceId":"<uuid>","startsAt":"<a slot from bw-public-slots>","name":"Test Customer","phone":"+15551234567","smsOptIn":true,"idempotencyKey":"<new uuid>"}'
Expected: 200 { bookingId, url: "https://checkout.stripe.com/..." }. Send it again with the same key: the same url. Send it with a new key for the same slot: 409 slot_taken.
Then check: select status, hold_expires_at, blocked_until from public.bookings order by created_at desc limit 1;
Plan first, then wait for my OK.`

const promptConnectWebhook = `Read @PRD.md sections 5.2, 8.1, 9.6, 11 and 13. ${shared}

Build supabase/functions/bw-connect-webhook/index.ts. This is the Stripe CONNECT endpoint (events from the shops' connected accounts). It is separate from the subscription webhook at app/api/stripe/webhook, which you must not touch.
- Called by Stripe, no user token. Read the raw body with await req.text(). Verify with await stripe.webhooks.constructEventAsync(body, req.headers.get('stripe-signature'), STRIPE_CONNECT_WEBHOOK_SECRET, undefined, cryptoProvider). Bad signature: 400.
- Idempotency: insert { id: event.id, type: event.type, account: event.account } into stripe_events. 23505 duplicate: return 200 { duplicate: true }. If any handler below throws, delete that stripe_events row and return 500 so Stripe retries.
- checkout.session.completed with payment_status 'paid' and metadata.booking_id:
  1. Load the booking with its business. If event.account is not the business's stripe_account_id, log 'account_mismatch' and return 200.
  2. pending: update to confirmed (confirmed_at now, hold_expires_at null, stripe_payment_intent_id = session.payment_intent).
  3. expired: try the same update. If Postgres returns 23P01 (someone else has the slot now), create a full refund on the connected account (idempotency key 'bw-refund-' + booking id), set refund_status pending, and send the "Sorry, that slot was taken while you paid" SMS with kind 'cancellation'.
  4. confirmed already: do nothing (a retry).
  5. Write booking_events confirmed, return 200, then EdgeRuntime.waitUntil(confirmSideEffects(bookingId)).
- checkout.session.expired: pending booking with that stripe_checkout_id becomes expired (booking_events expired).
- charge.refunded: booking by payment_intent gets refund_status refunded (booking_events refunded).
- account.updated: businesses where stripe_account_id = account.id get stripe_charges_enabled = account.charges_enabled.
- account.application.deauthorized: clear stripe_account_id, charges false, email the owner (template payouts_incomplete with key 'deauth:' + business id).
- charge.dispute.created: booking_events dispute_opened, owner email dispute_opened with key 'dispute:' + dispute id.
- Any other type: 200.
- Return within 3 s. Log event type, id and account only.

Deploy: npx supabase functions deploy bw-connect-webhook --no-verify-jwt
Test locally with the Stripe CLI (it forwards connected account events too):
stripe listen --forward-connect-to "$SUPABASE_URL/functions/v1/bw-connect-webhook"
Then make a real test deposit on your booking page with card 4242 4242 4242 4242 and check:
select status, stripe_payment_intent_id, google_event_id from public.bookings order by created_at desc limit 1;
select type, account from public.stripe_events order by received_at desc limit 3;
A curl without a signature must return 400:
curl -i -X POST "$SUPABASE_URL/functions/v1/bw-connect-webhook" -d '{}'
Plan first, then wait for my OK.`

const promptManage = `Read @PRD.md sections 8.1, 9.3, 11 and 16.3. ${shared} ${publicNote}

Build supabase/functions/bw-manage-booking/index.ts (POST, public). The cancel_token is the only key.
- Body (zod): { token: uuid, action: 'get' | 'cancel' | 'reschedule', startsAt?: ISO }. limit('manage:' + ip, 30, 3600).
- Load the booking by cancel_token with its business (secret key). Not found: 404 not_found 'This link is not valid any more.'
- get: return { business: { name, handle, phone, timezone, address }, booking: { serviceName, startsAt, endsAt, status, depositCents, currency, refundIfCancelled, canReschedule } }. refundIfCancelled follows refund_policy: always true, never false, refund_if_early true when starts_at - now > cancel_window_hours. canReschedule: status confirmed, starts_at - now > cancel_window_hours, reschedule_count < 2. Never return the phone, email or payment ids.
- cancel: only for confirmed bookings in the future (else 409 not_changeable). Update status cancelled, cancelled_by 'customer', then cancelSideEffects(bookingId, 'customer', refundIfCancelled). Return { status: 'cancelled', refund: 'pending' | 'none' }.
- reschedule: canReschedule must be true (409 not_changeable). startsAt must be in computeSlots for the same service and the new day, computed with THIS booking left out of the busy list (so moving by 15 minutes works). Update starts_at, ends_at, blocked_until and reschedule_count + 1 in one statement. 23P01: 409 slot_taken. Reset reminder_sent_at to null and reminder_attempts to 0 so the reminder fires for the new time. Patch the Google event, send the reschedule SMS (idempotency key 'sms:reschedule:' + bookingId + ':' + reschedule_count), booking_events rescheduled with the old and new times. Return { startsAt, endsAt }.

Deploy: npx supabase functions deploy bw-manage-booking --no-verify-jwt
Curl tests:
curl -i -X POST "$SUPABASE_URL/functions/v1/bw-manage-booking" -H "Content-Type: application/json" -d '{"token":"<cancel_token>","action":"get"}'
Expected 200 with no phone or email keys in the JSON. A random uuid token: 404.
Plan first, then wait for my OK.`

const promptAction = `Read @PRD.md sections 8.1, 9.4 and 16.4. ${shared}

Build supabase/functions/bw-booking-action/index.ts (POST, owner browser, user JWT).
- requireUser, then load the booking and requireOwner(userId, booking.business_id). Someone else's booking: 404 not_found (never 403, so ids cannot be probed).
- Body (zod): { bookingId: uuid, action: 'cancel', refund: boolean, message?: string max 140 (strip control characters and links) }.
- Only confirmed bookings can be cancelled (409 not_changeable otherwise). Past bookings: 409 with 'Mark it completed or no-show instead.'
- Update status cancelled, cancelled_by 'owner', cancel_reason = message. Then cancelSideEffects(bookingId, 'owner', refund && deposit_cents > 0), where the owner SMS template adds the message at the end if it fits in one segment (else leave it out of the text and put it in the email).
- Return { status: 'cancelled', refund: 'pending' | 'none' }.
- If the Stripe refund fails: refund_status failed, owner email refund_failed, still return 200 with refund 'failed' so the UI shows the red badge.

Also add the browser call in the Bookings row menu: supabase.functions.invoke('bw-booking-action', { body }).
Deploy: npx supabase functions deploy bw-booking-action --no-verify-jwt
Curl test (expect 401 without a token):
curl -i -X POST "$SUPABASE_URL/functions/v1/bw-booking-action" -H "Content-Type: application/json" -d '{"bookingId":"<uuid>","action":"cancel","refund":true}'
With a token from a second owner account: 404.
Plan first, then wait for my OK.`

const promptGoogle = `Read @PRD.md sections 8.3, 9.5 and 17 rule 7. ${shared}

Build supabase/functions/bw-google-oauth/index.ts. One function, three paths:
1. GET ?action=start with Authorization: Bearer <user jwt>: requireUser, load the user's business. Build state = base64url(JSON { businessId, nonce: crypto.randomUUID(), exp: now + 600 }) + '.' + base64url(HMAC-SHA256(OAUTH_STATE_SECRET, payload)) with crypto.subtle. Return { url } for https://accounts.google.com/o/oauth2/v2/auth with client_id GOOGLE_CLIENT_ID, redirect_uri GOOGLE_REDIRECT_URI, response_type code, access_type offline, prompt consent, include_granted_scopes true, scope "https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.freebusy", state. The browser then sets window.location to url.
2. GET ?code=...&state=... (Google's redirect, no JWT): verify the HMAC in constant time and exp. Bad or expired: 400 HTML page "This link expired. Go back to Settings and click Connect again." If ?error=access_denied: 302 to APP_URL/app/settings?google=denied. Exchange the code: POST https://oauth2.googleapis.com/token (code, client_id, client_secret, redirect_uri, grant_type authorization_code). No refresh_token in the response: 302 to APP_URL/app/settings?google=missing_refresh. Check the granted scope string contains calendar.events and calendar.freebusy, else 302 ?google=scopes. GET https://www.googleapis.com/calendar/v3/calendars/primary for the calendar id (the owner's email). Upsert google_tokens (refresh_token, access_token, access_token_expires_at, scope). Update businesses google_status connected, google_email, google_calendar_id 'primary'. Delete busy_cache rows for the business. 302 to APP_URL/app/settings?google=connected.
3. POST { action: 'disconnect' } with JWT: POST the refresh token to https://oauth2.googleapis.com/revoke?token=<token> (ignore 400 "already revoked"), delete google_tokens and busy_cache for the business, google_status disconnected, google_email null. Return { ok: true }.
- Never log the code, tokens or state.

In Google Cloud the redirect URI to register is exactly GOOGLE_REDIRECT_URI: https://<project-ref>.supabase.co/functions/v1/bw-google-oauth
Deploy: npx supabase functions deploy bw-google-oauth --no-verify-jwt
Tests:
curl -i "$SUPABASE_URL/functions/v1/bw-google-oauth?action=start"   (expect 401, no token)
curl -i "$SUPABASE_URL/functions/v1/bw-google-oauth?code=x&state=forged.sig"   (expect 400 expired page)
Then click Connect Google Calendar in Settings, allow both boxes, and check:
select google_status, google_email from public.businesses;
select business_id, scope, access_token_expires_at from public.google_tokens;
Plan first, then wait for my OK.`

const promptConnectOnboard = `Read @PRD.md sections 8.4, 9.9 and 16.8. ${shared}

Build supabase/functions/bw-connect-onboard/index.ts (POST, owner browser, user JWT).
- requireUser, requireAccess (402 no_access), load the user's business.
- Body (zod): { action: 'link' | 'status' | 'dashboard', country?: 2-letter code }.
- link: if stripe_account_id is empty, create the account: stripe.accounts.create({ controller: { stripe_dashboard: { type: 'full' }, fees: { payer: 'account' }, losses: { payments: 'stripe' } }, country: country or (US for America/* timezones, GB for Europe/London), email: the user's email, business_profile: { name: business name, url: APP_URL + '/b/' + handle }, metadata: { business_id } }, { idempotencyKey: 'bw-acct-' + business id }). These controller settings are the Standard account setup: the shop gets the full Stripe Dashboard, pays its own Stripe fees and Stripe covers losses, so Bookwell pays no Connect fees [verify the controller fields against docs.stripe.com/connect/migrate-to-controller-properties; type: 'standard' is the older equivalent]. Save stripe_account_id with the secret key BEFORE creating the link. Then stripe.accountLinks.create({ account, type: 'account_onboarding', refresh_url: APP_URL + '/app/settings?payouts=refresh', return_url: APP_URL + '/app/settings?payouts=return' }) and return { url }. Create a fresh link on every click (they expire after a few minutes and work once).
- status: stripe.accounts.retrieve(account). Update stripe_charges_enabled. Return { state: not_started | onboarding | ready, requirementsDue: account.requirements.currently_due }.
- dashboard: return { url: 'https://dashboard.stripe.com' }.
- On the Settings page: ?payouts=return or ?payouts=refresh calls status (refresh then calls link again automatically).

Deploy: npx supabase functions deploy bw-connect-onboard --no-verify-jwt
Test: curl -i -X POST "$SUPABASE_URL/functions/v1/bw-connect-onboard" -H "Content-Type: application/json" -d '{"action":"link"}'   (expect 401)
Then click Connect payouts in Settings (test mode), use Stripe's test data on every screen, and check:
select stripe_account_id, stripe_charges_enabled from public.businesses;
Plan first, then wait for my OK.`

const promptTwilio = `Read @PRD.md sections 8.5, 9.7 and 12. ${shared}

Build supabase/functions/bw-twilio-inbound/index.ts. Twilio calls it with form-encoded POSTs for two things: incoming texts (?kind=inbound) and delivery updates (?kind=status).
- Signature: read the raw body with await req.text(), parse it with URLSearchParams. Rebuild the URL Twilio signed as TWILIO_WEBHOOK_URL + the request's query string (for example ?kind=status), because inside Supabase req.url can show an internal host [verify by logging new URL(req.url).host once]. Signature = base64(HMAC-SHA1(TWILIO_AUTH_TOKEN, url + every POST param name and value concatenated, sorted by name)). Compare with X-Twilio-Signature in constant time. Mismatch: 403.
- kind=status: update sms_messages set status = MessageStatus, error_code = ErrorCode where twilio_sid = MessageSid. ErrorCode 21610: upsert sms_opt_outs (phone To, source 'error_21610'). Return 200 empty.
- kind=inbound: insert into inbound_sms (message_sid MessageSid, from_phone From, body Body). Duplicate (23505): return the empty TwiML <Response/> straight away.
  Body trimmed, upper case, punctuation removed:
  - OptOutType STOP, or STOP, STOPALL, UNSUBSCRIBE, CANCEL, END, QUIT, OPTOUT, REVOKE: upsert sms_opt_outs, handled_as 'stop', return <Response/> (Twilio blocks the number and sends its own reply). CANCEL is a carrier opt-out word, which is why the booking cancel keyword is the single letter C [verify the current keyword list in Twilio's Advanced Opt-Out docs].
  - OptOutType START, or START, UNSTOP: delete from sms_opt_outs, handled_as 'start', <Response/>.
  - HELP or INFO: handled_as 'help', <Response/> (Advanced Opt-Out replies).
  - C (the single letter only): find the soonest confirmed booking with starts_at > now() for this phone whose latest sms_messages row went to this phone. None: reply "We could not find an upcoming booking for this number. Use the link in your text to manage it." Found: update status cancelled, cancelled_by 'customer', compute the refund like bw-manage-booking, run cancelSideEffects with the SMS step turned off, and reply with TwiML <Response><Message>Cancelled: {service} at {shop} {day time}. {refund line}</Message></Response>. Meter the reply with consume('sms_segment', 1, 'sms:reply:' + MessageSid). handled_as 'cancel', booking_id set.
  - Anything else: reply at most once per 24 h per phone (check inbound_sms for an earlier 'other' row with a reply), text "This number only sends booking texts. To change a booking use the link in your text or call {shop phone}." handled_as 'other'.
- Escape XML in every reply. Content-Type text/xml. Never log the body or the phone.

Deploy: npx supabase functions deploy bw-twilio-inbound --no-verify-jwt
Test: curl -i -X POST "$SUPABASE_URL/functions/v1/bw-twilio-inbound?kind=inbound" -d "From=%2B15551234567&Body=C&MessageSid=SMtest"   (expect 403, no signature)
Then reply C to a real confirmation text from your phone and check:
select handled_as, booking_id from public.inbound_sms order by created_at desc limit 1;
select status, cancelled_by, refund_status from public.bookings order by updated_at desc limit 1;
Plan first, then wait for my OK.`

const promptReminders = `Read @PRD.md sections 8.1, 9.8, 12 and 13. ${shared}

Build supabase/functions/bw-reminders/index.ts, called by pg_cron every 15 minutes.
- requireCron(req): header x-cron-secret must equal CRON_SECRET (constant time). Otherwise 401.
- Stop starting new work after 50 s (keep a deadline) so a run never overlaps the next.
1. expired = rpc expire_stale_holds(null).
2. Reminders: select confirmed bookings where reminder_sent_at is null and reminder_attempts < 3 and starts_at > now() + 1 hour and starts_at <= now() + (business.reminder_hours * interval '1 hour') and created_at < starts_at - (business.reminder_hours * interval '1 hour'), joined to businesses, ordered by starts_at, limit 200. Skip any where the local time in the business timezone is between 21:00 and 08:00 (quiet hours, they go out at 08:00).
   For each (10 at a time): claim with update bookings set reminder_sent_at = now() where id = $1 and reminder_sent_at is null returning id. Not claimed: skip.
   Channel: if sms_opt_in and the phone is not in sms_opt_outs, sendSms kind reminder. If that returns over_cap or opted_out, or SMS was off, and customer_email exists: sendEmail template reminder_email key 'remind:' + id. Neither: booking_events reminder_skipped.
   On a Twilio or Resend error: set reminder_sent_at back to null, reminder_attempts + 1.
3. Auto-complete: update bookings set status 'completed' where status 'confirmed' and ends_at < now() - interval '48 hours' (the update runs with the secret key, so the owner trigger allows it). booking_events completed for each.
4. Text cap emails: for each business with usage_this_month sms_segment used >= 80% of cap, send cap_80 (key 'cap80:' + business + ':' + YYYY-MM); at 100% send cap_100. email.ts makes repeats a no-op.
5. Once a day (first run after 03:00 UTC): delete rate_limits rows older than 2 days and busy_cache rows older than 1 day; send payouts_incomplete emails to businesses created more than 24 h ago that have an active service with a deposit and stripe_charges_enabled false.
- Return { expired, reminders: { sms, email, skipped, failed }, completed, capEmails }.

Then schedule it with the Supabase MCP (pg_cron and pg_net are enabled by the SQL):
select vault.create_secret('<the CRON_SECRET value>', 'bw_cron_secret');
select vault.create_secret('https://<project-ref>.supabase.co/functions/v1/bw-reminders', 'bw_reminders_url');
select cron.schedule('bw-reminders', '*/15 * * * *', $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'bw_reminders_url'),
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'bw_cron_secret')),
    body := '{}'::jsonb,
    timeout_milliseconds := 55000
  );
$$);

Deploy: npx supabase functions deploy bw-reminders --no-verify-jwt
Tests:
curl -i -X POST "$SUPABASE_URL/functions/v1/bw-reminders"   (expect 401)
curl -i -X POST "$SUPABASE_URL/functions/v1/bw-reminders" -H "x-cron-secret: <CRON_SECRET>"   (expect 200 with the counts)
select jobname, schedule, active from cron.job;
select status, return_message, start_time from cron.job_run_details order by start_time desc limit 5;
Plan first, then wait for my OK.`

export const edgeFunctions: EdgeFunctionDef[] = [
  {
    name: 'bw-public-slots',
    purpose: 'Returns free time slots for one service on one day for the public booking page, and builds the shared helpers every Bookwell function uses.',
    trigger: 'Called by the public booking page (no login) when the customer picks a day',
    secrets: ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'APP_URL'],
    prompt: promptSlots,
  },
  {
    name: 'bw-create-booking',
    purpose: 'Holds a slot for 30 minutes and returns a Stripe Checkout link for the deposit on the shop\'s own Stripe account.',
    trigger: 'Called by the public booking page when the customer taps "Pay deposit and book"',
    secrets: ['STRIPE_SECRET_KEY', 'APP_URL'],
    prompt: promptCreate,
  },
  {
    name: 'bw-connect-webhook',
    purpose: 'Confirms paid bookings, expires abandoned checkouts, records refunds and keeps each shop\'s payout status in sync.',
    trigger: 'Stripe Connect webhook (events on connected accounts)',
    secrets: ['STRIPE_SECRET_KEY', 'STRIPE_CONNECT_WEBHOOK_SECRET', 'TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_MESSAGING_SERVICE_SID', 'TWILIO_WEBHOOK_URL', 'RESEND_API_KEY', 'EMAIL_FROM'],
    prompt: promptConnectWebhook,
  },
  {
    name: 'bw-manage-booking',
    purpose: 'Lets a customer see, cancel or reschedule their booking from the link in their text, with no login.',
    trigger: 'Called by the manage page /b/cancel/[token]',
    secrets: ['STRIPE_SECRET_KEY', 'APP_URL'],
    prompt: promptManage,
  },
  {
    name: 'bw-booking-action',
    purpose: 'Owner cancels a booking: refunds the deposit on the shop\'s Stripe account, deletes the Google event and texts the customer.',
    trigger: 'Called by the owner\'s Bookings row menu (logged in)',
    secrets: ['STRIPE_SECRET_KEY'],
    prompt: promptAction,
  },
  {
    name: 'bw-google-oauth',
    purpose: 'Connects and disconnects an owner\'s Google Calendar with a signed OAuth state and stores the refresh token out of the browser\'s reach.',
    trigger: 'Settings "Connect Google Calendar" button, then Google\'s OAuth callback',
    secrets: ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_REDIRECT_URI', 'OAUTH_STATE_SECRET', 'APP_URL'],
    prompt: promptGoogle,
  },
  {
    name: 'bw-connect-onboard',
    purpose: 'Creates each shop\'s Standard-style Stripe connected account and returns a fresh onboarding link.',
    trigger: 'Settings "Connect payouts" and "Finish setup" buttons (logged in)',
    secrets: ['STRIPE_SECRET_KEY', 'APP_URL'],
    prompt: promptConnectOnboard,
  },
  {
    name: 'bw-twilio-inbound',
    purpose: 'Handles replies (C to cancel, STOP, START, HELP) and delivery status updates from Twilio.',
    trigger: 'Twilio Messaging Service incoming message webhook and status callback',
    secrets: ['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_MESSAGING_SERVICE_SID', 'TWILIO_WEBHOOK_URL'],
    prompt: promptTwilio,
  },
  {
    name: 'bw-reminders',
    purpose: 'Sends reminder texts (or emails over the cap), expires stale holds, auto-completes old bookings and sends text cap warnings.',
    trigger: 'Supabase Cron, every 15 minutes',
    secrets: ['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_MESSAGING_SERVICE_SID', 'TWILIO_WEBHOOK_URL', 'RESEND_API_KEY', 'EMAIL_FROM', 'CRON_SECRET', 'APP_URL'],
    prompt: promptReminders,
  },
]
