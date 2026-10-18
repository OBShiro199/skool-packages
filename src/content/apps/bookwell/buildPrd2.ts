// Bookwell build PRD, part 2: edge function contracts, slots, money, texts, email, limits.

export const buildPrd2 = `
## 9. Edge function contracts
Shared rules for every function (the kit prompts repeat them):
- Live in \`supabase/functions/<name>/index.ts\`, shared code in \`supabase/functions/_shared/\`.
- Deployed with \`--no-verify-jwt\`. Each function checks auth itself: user JWT with
  \`supabase.auth.getClaims(token)\`, a webhook signature on the raw body, a \`x-cron-secret\` header, or (public
  functions only) rate limits per IP and phone.
- Inputs validated with zod. Errors return \`{ code, message }\` with a correct status. Messages are friendly
  sentences the UI can show as they are.
- Admin client from \`SUPABASE_URL\` and the \`default\` entry of \`SUPABASE_SECRET_KEYS\`.
- Logs are one JSON line per step: \`{ fn, step, ms, business_id, booking_id }\`. Never log phone numbers,
  names, emails, tokens or message bodies.
- External calls go through \`withRetry\` (3 tries, exponential backoff with jitter, only on network errors,
  408, 429 and 5xx).

### 9.1 \`bw-public-slots\`
- **Trigger:** public booking page, when the customer picks a day. \`GET\`.
- **Auth:** none. Rate limit 60 calls per minute per IP (\`hit_rate_limit('slots:'||ip, 60, 60)\`).
- **Input (query):** \`handle\` (string, \`^[a-z0-9-]{3,30}$\`), \`serviceId\` (uuid), \`date\` (\`YYYY-MM-DD\` in
  the business timezone).
- **Output 200:** \`{ slots: string[], timezone: string, paused?: true, calendarStale?: true }\`. Slots are ISO
  UTC start times. \`paused: true\` with an empty list when the owner has no active subscription.
- **Errors:** 400 \`bad_input\`, 404 \`not_found\` (unknown handle or inactive service), 429 \`rate_limited\`.
- **Steps:** load business by handle, check \`business_has_access\`, load the service, availability for the
  weekday, the day off, live bookings overlapping the day, and busy blocks (from \`busy_cache\` if
  \`fetched_at\` is under 60 s old, else Google freeBusy, then upsert the cache). Run \`computeSlots()\` from
  \`_shared/slots.ts\`.
- **Cache:** \`Cache-Control: public, max-age=30\`.
- **Never returns:** customer names, phones, booking ids, or the reason a slot is busy.

### 9.2 \`bw-create-booking\`
- **Trigger:** "Pay $10 deposit and book" button. \`POST\`.
- **Auth:** none. Rate limits: 10 per hour per IP, 3 pending per phone per hour, 5 bookings per phone per
  business per day.
- **Input (JSON):** \`{ handle, serviceId, startsAt (ISO), name (2..80), phone, email? , smsOptIn (bool),
  idempotencyKey (uuid, made by the browser once per Details step) }\`.
- **Output 200:** \`{ bookingId, url }\`. \`url\` is the Stripe Checkout URL, or the done page when the deposit
  is $0.
- **Errors:** 400 \`bad_input\` (with the field), 402 \`paused\`, 409 \`slot_taken\` ("That slot was taken a moment
  ago."), 409 \`payouts_not_ready\` (deposit service while Connect is not ready), 429 \`rate_limited\`.
- **Steps:**
  1. Normalise the phone to E.164 with \`libphonenumber-js\`, default country from the business (US for
     America/* timezones, GB for Europe/London, else ask for the country code).
  2. Same \`idempotencyKey\` for this business already used: return the same \`{ bookingId, url }\`.
  3. Expire stale holds for the business (\`expire_stale_holds(business_id)\`).
  4. Re-run \`computeSlots()\` for that day and confirm \`startsAt\` is in the list (friendly 409 if not).
  5. Insert the booking: \`pending\`, \`hold_expires_at = now() + 30 min\`, \`ends_at = startsAt + minutes\`,
     \`blocked_until = ends_at + buffer\`, snapshots of service name, deposit and currency. Postgres error
     \`23P01\` (exclusion violation) becomes 409 \`slot_taken\`.
  6. Deposit $0: set \`confirmed\`, run the confirm side effects (9.6 step 4) with \`waitUntil\`, return the done
     URL.
  7. Else create a Checkout Session on the connected account (\`{ stripeAccount }\`, Stripe idempotency key
     \`bw-checkout-<bookingId>\`): \`mode: 'payment'\`, one line item "Deposit: <service name>",
     \`expires_at\` now + 30 min (Stripe's minimum), \`metadata.booking_id\`,
     \`payment_intent_data.metadata.booking_id\`, \`customer_email\` if given, \`success_url\`
     \`APP_URL/b/<handle>/done?b=<id>&t=<cancel_token>\`, \`cancel_url\` \`APP_URL/b/<handle>?held=<id>\`.
     Save \`stripe_checkout_id\`. Return \`{ bookingId, url }\`.

### 9.3 \`bw-manage-booking\`
- **Trigger:** the manage page \`/b/cancel/[token]\`. \`POST\`.
- **Auth:** none. The \`cancel_token\` (uuid, 122 random bits) is the key. Rate limit 30 per hour per IP.
- **Input:** \`{ token, action: 'get' | 'cancel' | 'reschedule', startsAt? }\`.
- **Output:** \`get\` returns \`{ business: { name, handle, phone, timezone }, booking: { serviceName, startsAt,
  endsAt, status, depositCents, currency, refundIfCancelled: boolean, canReschedule: boolean } }\`.
  \`cancel\` returns \`{ status: 'cancelled', refund: 'refunded' | 'pending' | 'none' }\`. \`reschedule\` returns
  \`{ startsAt, endsAt }\`.
- **Errors:** 404 \`not_found\`, 409 \`not_changeable\` (already cancelled, in the past, or inside the cancel
  window for reschedule), 409 \`slot_taken\`.
- **Rules:** reschedule only for \`confirmed\` bookings more than \`cancel_window_hours\` ahead, to a slot from
  \`computeSlots()\` for the same service, max 2 reschedules per booking. The update happens in place
  (\`update bookings set starts_at, ends_at, blocked_until\`), so the exclusion constraint checks it against
  every other booking. Then patch the Google event and send a \`reschedule\` text.
  Cancel refunds per \`refund_policy\`: \`refund_if_early\` (more than \`cancel_window_hours\` before start),
  \`always\`, or \`never\`.

### 9.4 \`bw-booking-action\`
- **Trigger:** owner row action "Cancel and refund" or "Cancel, keep deposit". \`POST\`.
- **Auth:** user JWT with \`getClaims\`, then \`owns_business\` on the booking's business. 404 if not theirs.
- **Input:** \`{ bookingId, action: 'cancel', refund: boolean, message?: string (max 140) }\`.
- **Output:** \`{ status: 'cancelled', refund: 'pending' | 'none' }\`.
- **Steps:** set \`cancelled\`, \`cancelled_by = 'owner'\`, refund through Stripe on the connected account when
  asked (Stripe idempotency key \`bw-refund-<bookingId>\`), delete the Google event, text the customer
  "<shop> had to cancel your <service> on <day time>. <refund line> <message>".

### 9.5 \`bw-google-oauth\`
- **Trigger:** two paths in one function. \`GET ?action=start\` from the Settings "Connect Google Calendar"
  button (JWT required, returns \`{ url }\`), and \`GET ?code=...&state=...\` from Google's redirect (no JWT,
  the signed state is the check). Also \`POST { action: 'disconnect' }\` with JWT.
- **Start:** builds \`https://accounts.google.com/o/oauth2/v2/auth\` with \`client_id\`, \`redirect_uri\`
  (\`GOOGLE_REDIRECT_URI\`, the function URL), \`response_type=code\`, \`access_type=offline\`,
  \`prompt=consent\`, \`include_granted_scopes=true\`, scopes \`https://www.googleapis.com/auth/calendar.events\`
  and \`https://www.googleapis.com/auth/calendar.freebusy\`, and \`state\` = base64url JSON
  \`{ businessId, nonce, exp }\` plus an HMAC-SHA256 signature with \`OAUTH_STATE_SECRET\`. Expires in 10 min.
- **Callback:** verify the signature and expiry, exchange the code at \`https://oauth2.googleapis.com/token\`,
  require a \`refresh_token\` (if missing, redirect to Settings with \`?google=missing_refresh\` and tell the
  owner to remove Bookwell at myaccount.google.com/permissions and try again), read the primary calendar
  email from \`GET https://www.googleapis.com/calendar/v3/calendars/primary\`, upsert \`google_tokens\`, set
  \`google_status = 'connected'\`, \`google_email\`, then 302 to \`APP_URL/app/settings?google=connected\`.
- **Disconnect:** POST the refresh token to \`https://oauth2.googleapis.com/revoke\`, delete the token row,
  set \`disconnected\`, clear \`busy_cache\`.
- **Errors:** user denied (\`error=access_denied\`) redirects to Settings with \`?google=denied\`. Bad state:
  400 page "This link expired. Go back to Settings and click Connect again."

### 9.6 \`bw-connect-webhook\`
- **Trigger:** Stripe Connect webhook endpoint ("Listen to events on Connected accounts").
- **Auth:** \`stripe.webhooks.constructEventAsync(rawBody, signature, STRIPE_CONNECT_WEBHOOK_SECRET)\` with
  \`Stripe.createSubtleCryptoProvider()\` (Deno). 400 on a bad signature.
- **Idempotency:** insert \`event.id\`, \`event.type\`, \`event.account\` into \`stripe_events\`. Duplicate (23505):
  return 200. If handling throws after the insert, delete the row and return 500 so Stripe retries.
- **Events:**
  1. \`checkout.session.completed\` with \`payment_status = 'paid'\` and \`metadata.booking_id\`: load the
     booking, check \`event.account\` equals the business's \`stripe_account_id\` (else log and 200).
  2. If \`pending\`: set \`confirmed\`, save \`stripe_payment_intent_id\`. If \`expired\` and the slot is still free,
     confirm it the same way. If the update fails with \`23P01\`, refund in full and text "Sorry, that slot
     was taken while you paid. Your deposit has been refunded in full."
  3. Return 200, then in \`waitUntil\`: create the Google event (if connected), send the confirmation text (if
     opted in and not opted out), email the customer if they gave an email, email the owner if
     \`notify_owner_email\`.
  4. Every side effect is guarded: Google only if \`google_event_id\` is null, texts by
     \`usage_ledger.idempotency_key = 'sms:confirmation:<bookingId>'\`, emails by
     \`email_log.idempotency_key\`.
  5. \`checkout.session.expired\`: booking \`pending\` becomes \`expired\`.
  6. \`charge.refunded\`: set \`refund_status = 'refunded'\` on the booking with that payment intent.
  7. \`account.updated\`: set \`stripe_charges_enabled\` from \`charges_enabled\`.
  8. \`account.application.deauthorized\`: clear \`stripe_account_id\`, set charges disabled, email the owner.
  9. \`charge.dispute.created\`: write a \`booking_events\` row and email the owner.

### 9.7 \`bw-twilio-inbound\`
- **Trigger:** Twilio Messaging Service "incoming message" webhook (\`?kind=inbound\`) and every message's
  \`StatusCallback\` (\`?kind=status\`). Form-encoded POST.
- **Auth:** verify \`X-Twilio-Signature\`: base64 HMAC-SHA1, key \`TWILIO_AUTH_TOKEN\`, over the full public URL
  (rebuild it from \`TWILIO_WEBHOOK_URL\` plus the query string, because the function sees an internal host)
  followed by every POST field name and value sorted by name. 403 if it does not match.
- **Inbound:** de-duplicate by \`MessageSid\` in \`inbound_sms\`. Body trimmed and upper-cased:
  - \`C\` (the single letter): find the soonest \`confirmed\` future booking for that phone (across all businesses,
    the one whose latest text went to this phone). Cancel it with \`cancelled_by = 'customer'\` and the
    business refund rule. Reply with TwiML: "Cancelled: <service> at <shop> <day time>. <refund line>".
  - \`STOP\`, \`STOPALL\`, \`UNSUBSCRIBE\`, \`CANCEL\`, \`END\`, \`QUIT\` (or \`OptOutType=STOP\`). \`CANCEL\` is a
    carrier opt-out word, which is why cancelling a booking uses the single letter C. Action: upsert \`sms_opt_outs\`. Twilio
    sends its own reply, so return empty TwiML.
  - \`START\`, \`UNSTOP\` (or \`OptOutType=START\`): delete from \`sms_opt_outs\`.
  - \`HELP\`: Twilio Advanced Opt-Out replies. Return empty TwiML.
  - Anything else: reply once per 24 h per phone: "This number only sends booking texts. To change a
    booking use the link in your text or call <shop phone>."
- **Status:** update \`sms_messages\` by \`MessageSid\` with \`MessageStatus\` and \`ErrorCode\`. Error \`21610\`
  (recipient replied STOP) also upserts \`sms_opt_outs\`.
- **Output:** \`200\` with \`Content-Type: text/xml\` and \`<Response/>\` or \`<Response><Message>..</Message></Response>\`.

### 9.8 \`bw-reminders\`
- **Trigger:** pg_cron every 15 minutes through pg_net, header \`x-cron-secret\`.
- **Auth:** constant-time compare with \`CRON_SECRET\`. 401 otherwise.
- **Steps, in order, each capped so one run finishes in under 60 s:**
  1. \`expire_stale_holds(null)\`: pending bookings past \`hold_expires_at\` become \`expired\`.
  2. Reminders: confirmed bookings where \`reminder_sent_at is null\`, \`reminder_attempts < 3\`,
     \`starts_at\` between \`now() + 1 hour\` and \`now() + reminder_hours\`, and \`created_at\` earlier than
     \`starts_at - reminder_hours\` (booked inside the window means the confirmation was enough). Claim each
     row with \`update ... set reminder_sent_at = now() where id = $1 and reminder_sent_at is null returning\`
     before sending, so two overlapping runs never double send. On a failed send, set it back to null and
     add 1 to \`reminder_attempts\`. Max 200 per run, 10 in parallel.
  3. Channel: SMS when opted in, not opted out and under the text cap. Otherwise email if
     \`customer_email\` exists. Otherwise skip and write \`booking_events\` \`reminder_skipped\`.
  4. Auto-complete: confirmed bookings that ended more than 48 h ago become \`completed\`.
  5. Text cap warnings: businesses that crossed 80% or 100% of their cap this month and have no
     \`email_log\` row for \`cap80:<business>:<YYYY-MM>\` or \`cap100:...\` get the owner email.
- **Output:** \`{ expired, reminders: { sms, email, skipped, failed }, completed, capEmails }\`.

### 9.9 \`bw-connect-onboard\`
- **Trigger:** Settings "Connect payouts" and "Finish setup" buttons. \`POST\`.
- **Auth:** user JWT, owner of the business, \`has_active_access\`.
- **Input:** \`{ action: 'link' | 'status' | 'dashboard' }\`.
- **link:** if there is no \`stripe_account_id\`, create the account with Standard-style controller settings:
  \`controller: { stripe_dashboard: { type: 'full' }, fees: { payer: 'account' }, losses: { payments:
  'stripe' } }\`, \`email\`, \`country\` (from timezone, owner can change), \`metadata.business_id\`. Save the id
  before anything else. Then \`stripe.accountLinks.create({ account, type: 'account_onboarding',
  refresh_url: APP_URL/app/settings?payouts=refresh, return_url: APP_URL/app/settings?payouts=return })\`.
  Return \`{ url }\`. Account Links expire within minutes, so create one on every click.
- **status:** retrieve the account, update \`stripe_charges_enabled\`, return \`{ state: 'not_started' |
  'onboarding' | 'ready', requirementsDue: string[] }\`.
- **dashboard:** return \`https://dashboard.stripe.com\` (Standard accounts log in to their own dashboard).

## 10. Slot rules (\`computeSlots\`)
A pure function in \`supabase/functions/_shared/slots.ts\`, imported by \`bw-public-slots\`,
\`bw-create-booking\` and \`bw-manage-booking\`, and unit tested with vitest from \`lib/slots.test.ts\`.

\`\`\`
computeSlots({
  date: '2026-11-03',            // in business timezone
  timezone: 'America/Chicago',
  hours: [{ start: '09:00', end: '12:30' }, { start: '13:30', end: '18:00' }],
  dayOff: false,
  minutes: 45, bufferMinutes: 15, stepMinutes: 15,
  minNoticeMinutes: 120, maxDaysAhead: 60,
  busy: [{ start: ISO, end: ISO }],   // live bookings (starts_at..blocked_until) + Google busy
  now: ISO
}) => string[]                      // ISO UTC starts
\`\`\`
Rules:
1. Build each range in the business timezone with Luxon (\`DateTime.fromISO(date + 'T' + start, { zone })\`),
   then convert to UTC. This handles the two daylight saving days correctly. A local time that does not
   exist (spring forward gap) is skipped; one that happens twice (fall back) is used once.
2. Candidate starts every \`stepMinutes\` from the range start. A candidate fits if \`start + minutes +
   bufferMinutes <= range end\`.
3. Drop candidates whose \`[start, start + minutes + buffer)\` overlaps any busy block.
4. Drop candidates earlier than \`now + minNoticeMinutes\`, and dates more than \`maxDaysAhead\` days ahead.
5. Day off or no hours for that weekday: empty list.
6. Sort ascending, no duplicates.
Unit tests (8): normal day, day off, split shift, booking overlap, buffer at the end of a range, Google busy
block, spring-forward day in America/New_York, past and min-notice slots.

## 11. Money rules
- Deposits are direct charges on the shop's connected account. Bookwell never sets
  \`application_fee_amount\` and never holds funds.
- Deposit must be between $0 and the service price. $0 means no Checkout (book straight away).
- Minimum non-zero deposit: $1 (Stripe needs at least $0.50 in USD; $1 avoids odd fees) [verify per currency].
- Refund rule per business: \`refund_if_early\` (default), \`always\`, \`never\`. It shows on the Details step:
  "Cancel more than 24 hours before for a full refund."
- Refunds are full refunds of the deposit only. Partial refunds are out of scope.
- Owner cancel always offers "Cancel and refund" first.
- The remaining price is paid at the appointment, outside Bookwell. The UI says so in one line.

## 12. Text messages (Twilio)
- One Messaging Service (\`TWILIO_MESSAGING_SERVICE_SID\`, starts with \`MG\`) with the Bookwell number(s)
  in its sender pool and the A2P 10DLC campaign attached. Send with \`MessagingServiceSid\`, not \`From\`.
- \`StatusCallback\` on every send: \`TWILIO_WEBHOOK_URL?kind=status\`.
- Every text is transactional, names the shop first, and stays inside one GSM-7 segment (160 chars).
  \`_shared/sms.ts\` builds bodies, replaces curly quotes and emoji with plain characters, cuts the shop name
  to 24 chars and the service to 24 chars, and counts segments. If a body still needs 2 segments it is sent
  and metered as 2.
- Templates (times in the business timezone, \`ddd HH:mm\` or \`ddd h:mma\` for US timezones):
  - confirmation: \`{shop}: booked {service} {day} {time}. Change or cancel: {APP_URL}/b/cancel/{token}\`
  - reminder: \`{shop}: reminder, {service} tomorrow {time}. Reply C to cancel or manage: {short_link}\`
  - reschedule: \`{shop}: moved to {day} {time}. Manage: {link}\`
  - cancellation (by owner): \`{shop} cancelled {service} {day} {time}. {refund line}\`
  - cancellation (by customer): \`{shop}: cancelled {service} {day} {time}. {refund line}\`
- Links use the full \`cancel_token\` path. Keep \`APP_URL\` short (your domain, no \`www\`).
- Before each send: check \`sms_opt_outs\`, then \`try_consume_usage(business, 'sms_segment', segments,
  'sms:<kind>:<bookingId>')\`. Over the cap: no text, fall back to email.
- Quiet hours: reminders are never sent between 21:00 and 08:00 in the business timezone. A reminder due in
  quiet hours goes out at 08:00 instead (it stays inside the window because the window is up to 24 h).
- Outside the US: UK and EU numbers can be sent from the same Twilio account at higher prices [verify per
  country]. v1 sells in the US first. Set the price or cap higher before selling elsewhere.

## 13. Email (Resend)
All sends go through \`_shared/email.ts\`: insert \`email_log\` with the idempotency key first (duplicate key
means "already sent", stop), call \`POST https://api.resend.com/emails\` with \`Authorization: Bearer
RESEND_API_KEY\` and an \`Idempotency-Key\` header with the same key, save \`resend_id\` or the error.

| Template | To | Trigger | Idempotency key |
|---|---|---|---|
| \`welcome\` | owner | signup (shared kit step) | \`welcome:<user>\` |
| \`trial_ending\` | owner | \`customer.subscription.trial_will_end\` (shared) | \`trial:<sub>:<trial_end>\` |
| \`new_booking\` | owner | booking confirmed, if \`notify_owner_email\` | \`newbooking:<booking>\` |
| \`booking_confirmed\` | customer | booking confirmed and email given | \`confirm:<booking>\` |
| \`reminder_email\` | customer | reminder fallback (cap reached, opted out of SMS) | \`remind:<booking>\` |
| \`booking_cancelled\` | customer | any cancel, if email given | \`cancel:<booking>\` |
| \`cap_80\` | owner | 80% of texts used this month | \`cap80:<business>:<YYYY-MM>\` |
| \`cap_100\` | owner | text cap reached | \`cap100:<business>:<YYYY-MM>\` |
| \`google_error\` | owner | Google token refresh fails (\`invalid_grant\`) | \`gerr:<business>:<YYYY-MM-DD>\` |
| \`payouts_incomplete\` | owner | 24 h after signup with a deposit service and no ready account | \`payouts:<business>\` |
| \`refund_failed\` | owner | refund API error | \`refundfail:<booking>\` |
| \`dispute_opened\` | owner | \`charge.dispute.created\` | \`dispute:<dispute id>\` |

Email copy rules: subject under 50 characters, plain text plus simple HTML, one button, the shop name in the
customer emails' "From" display name: \`"Fade Room via Bookwell" <bookings@yourdomain.com>\`, reply-to the
owner's email so customers reply to the shop, not to you.

## 14. Plans and limits

| | Solo | Studio |
|---|---|---|
| Price | $19/month or $190/year | $39/month or $390/year |
| Annual | 10 times the monthly price (2 months free) | same |
| Texts a month (segments) | 300 (about 150 bookings) | 600 (about 300 bookings) |
| Bookings | unlimited | unlimited |
| Services | unlimited | unlimited |
| Email reminders (fallback) | 2,000 a month | 2,000 a month |
| Brand colour and logo on booking page | no | yes |
| Remove "Booking by Bookwell" footer | no | yes |
| No-show report | no | yes |
| Trial | 7 days, full Studio features, Solo text cap | 7 days |

- Caps reset on the 1st of each calendar month in UTC (\`period_month = date_trunc('month', now())\`).
- \`subscriptions.plan\` is set by the shared subscription webhook from the price id using \`lib/plans.ts\`:
  \`STRIPE_PRICE_SOLO_MONTHLY\` and \`STRIPE_PRICE_SOLO_YEARLY\` map to \`solo\`, the Studio pair to \`studio\`.
- \`public.sms_cap(business_id)\` returns 300 or 600 from the plan. Enforcement is server side only, in
  \`try_consume_usage\`, which locks per business so two parallel sends cannot both take the last text.
- The UI shows the meter everywhere it matters: sidebar, Bookings toolbar, Billing. Meter colours follow
  DESIGN_SYSTEM.md (accent, amber under 20% left, coral under 5% left).
- Downgrade from Studio: branding and footer switch off at the end of the period; data stays.

## 15. Rate limits and abuse
| Where | Limit | Key |
|---|---|---|
| \`bw-public-slots\` | 60 per minute | IP |
| \`bw-create-booking\` | 10 per hour | IP |
| \`bw-create-booking\` | 3 pending per hour | phone |
| \`bw-create-booking\` | 5 per day per business | phone |
| \`bw-manage-booking\` | 30 per hour | IP |
| \`bw-twilio-inbound\` "other" replies | 1 per 24 h | phone |
| Help form | 5 per hour | user |
IP comes from the \`x-forwarded-for\` header's first value. \`hit_rate_limit(key, max, seconds)\` is a SQL
function on \`rate_limits\` with a fixed window. Old rows are deleted by \`bw-reminders\` once a day.
`
