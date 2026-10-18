// Quotient edge functions: one Claude Code prompt per function.
import type { EdgeFunctionDef } from '../../types'

const shared = `First, if supabase/functions/_shared/ does not exist yet, create these helpers (read @PRD.md section 13 intro):
1. admin.ts: adminClient() with Deno.env.get('SUPABASE_URL') and Deno.env.get('SUPABASE_SECRET_KEY') (fall back to SUPABASE_SERVICE_ROLE_KEY), auth: { persistSession: false }.
2. auth.ts: requireUser(req) reads the Bearer token, calls supabase.auth.getClaims(token) with a publishable-key client, returns { userId, email } or throws HttpError(401). requireMember(ws, roles?) calls is_workspace_member / has_workspace_role through a client carrying the user's JWT (so auth.uid() works) and throws 403. requireAccess(ws) calls has_active_access with the admin client and throws 402 { code: 'paused' }. requireCron(req) compares x-cron-secret with CRON_SECRET in constant time.
3. http.ts: HttpError(status, code, message), json(body, status), CORS: public functions allow any origin with methods GET, POST, OPTIONS; app functions allow APP_URL and http://localhost:3000. Error body: { error: { code, message } }.
4. log.ts: log(fn, data) prints one JSON line. Never log tokens, phone numbers, emails, names, postcodes, photos, message bodies or API keys.
5. retry.ts: withRetry(fn, { tries: 3, baseMs: 800 }) with exponential backoff + jitter, honours retry-after, retries only 429 and 5xx.
6. meter.ts: meter(ws, kind, qty, costMicros, refId, key) calls rpc('meter_usage') with the admin client and throws HttpError(402, 'limit_reached', "You have used all your <kind> this month.") when it returns false. tryMeter(...) returns the boolean instead of throwing.
7. tokens.ts: newLeadToken() = 16 characters of base62 from crypto.getRandomValues with rejection sampling (no modulo bias). newToken() = 32 random bytes base64url (43 chars). sha256Hex(text) with crypto.subtle.
8. iphash.ts: ipHash(req) = sha256Hex(first x-forwarded-for value + IP_HASH_SALT).
9. pricing/: copy lib/pricing/schema.ts and lib/pricing/engine.ts exactly (run npm run sync:pricing, which copies them and rewrites the zod import to npm:zod). Never edit the copies by hand.
10. email.ts: sendEmail({ ws, leadId, kind, to, subject, html, text, dedupeKey, replyTo, fromName }) checks email_suppressions, inserts email_log first (on conflict dedupe_key do nothing; return early if it existed), POST https://api.resend.com/emails with Authorization: Bearer RESEND_API_KEY and from "<fromName> via Quotient <EMAIL_FROM_ADDRESS>", then updates resend_id and status.
11. sms.ts: segments(body) (GSM-7: 160 single / 153 per part; any non GSM-7 character: UCS-2 70 / 67). creditsFor(country, segments) = segments x (country === 'GB' ? 5 : 1). sendSms({ ws, leadId, kind, to, body, dedupeKey }): load sms_senders (status must be 'approved'), check sms_opt_outs, insert sms_log first (on conflict dedupe_key do nothing), tryMeter(ws, 'sms_credits', credits, credits * 11300, leadId, dedupeKey) and on false mark the log 'skipped_cap' and return { sent: false, reason: 'cap' }, then POST https://api.twilio.com/2010-04-01/Accounts/{subaccount_sid}/Messages.json (form-encoded MessagingServiceSid, To, Body, StatusCallback = SUPABASE_URL + '/functions/v1/qt-twilio-webhook') with Basic auth TWILIO_ACCOUNT_SID:TWILIO_AUTH_TOKEN wrapped in withRetry, save twilio_sid and status. Returns { sent, reason? } so callers can fall back to email.
12. claude.ts: reviewLead({ system, images, text, schema }) using npm:@anthropic-ai/sdk, model 'claude-haiku-5-5', max_tokens 2000, output_config { effort: 'low', format: { type: 'json_schema', schema } }, system as [{ type: 'text', text, cache_control: { type: 'ephemeral' } }]. Do not send temperature, top_p, top_k or a thinking budget. Check stop_reason: 'refusal' throws HttpError(422, 'ai_refused'); 'max_tokens' throws HttpError(502, 'ai_truncated'). Parse the text block as JSON and validate with zod. costMicros = input_tokens*0.10 + cache_read_input_tokens*0.01 + cache_creation_input_tokens*0.125 + output_tokens*0.50, rounded.
Then build the function below.`

export const edgeFunctions: EdgeFunctionDef[] = [
  {
    name: 'qt-public-quote',
    purpose: 'Serves the published calculator to the widget, prices answers with the server-side engine, and turns a submit into a metered lead with a quote copy, owner alert and scheduled follow-ups.',
    trigger: 'Called by the widget, hosted page and lead page (no login, no key)',
    secrets: ['RESEND_API_KEY', 'EMAIL_FROM_ADDRESS', 'TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'IP_HASH_SALT', 'APP_URL'],
    prompt: `${shared}

Build supabase/functions/qt-public-quote/index.ts. Read @PRD.md sections 8.2, 8.3, 10, 12, 13.1 and 15 first.

Contract:
- Deploy with --no-verify-jwt. CORS open (the widget runs on customers' websites). Never import anything that needs a user session.
- GET ?calc=<uuid> or ?business=<slug>&calc=<slug>: load the calculator with status 'published' and its published version (admin client). 404 { code: 'not_found' } otherwise. Return exactly the public shape in PRD 13.1: strip rule internals (no rates, no zone prefixes, no min charge) unless config.show_breakdown is true, in which case still strip zone prefixes. logo_url = public URL of brand-assets/<logo_path>. paused = !has_active_access(ws). sms_available = sms_senders.status === 'approved'. Cache in memory 60 s keyed by version id.
- POST action 'price': zod-validate { calc, service_id, answers, extras, postcode }. try_rate_limit('price:' + ipHash, 120, 60) else 429. Run quote() from _shared/pricing/engine.ts on the published config. Return { priced, reason, low_cents, high_cents, survey_only, zone_label, lines (only if show_breakdown) }. No writes.
- POST action 'submit': follow PRD 13.1 steps 1 to 7 exactly:
  1. Validate (customer.email or customer.phone required; phone parsed to E.164 with npm:libphonenumber-js using the business country). hp non-empty or elapsed_ms < 3000: return 200 with a fake { lead_token: newLeadToken(), priced: false } and write nothing.
  2. try_rate_limit('submit:' + ipHash, 10, 3600), ('submit-ws:' + ws, 200, 3600). Daily cap: count leads for ws today, 300 max. paused businesses: 402 { code: 'paused' }.
  3. Re-price server-side. Ignore any price the browser sent. If priced: ok = tryMeter(ws, 'quotes', 1, 0, null, 'quote:' + calc + ':' + sha256Hex(lower(email or phone) + service_id + utc date)). Not ok: priced = false, status 'new', reason 'cap_reached', and send the owner the usage_100 email once a month (dedupe 'cap:quotes:' + ws + ':' + yyyy-mm).
  4. token = newLeadToken(). Insert leads (public_token_hash = sha256Hex(token), status quoted or new, source from the body: 'widget' or 'hosted', answers, prices, price_breakdown = lines, version_id, zone_label, sms_consent, email_consent, consent_text = config.consent_text exactly, consent_at = now() when sms_consent, utm fields, referrer_host, landing_url, ip_hash, needs_site_visit = survey_only). Insert a lead_events 'created' row. If quoted and follow_up_rules.enabled: insert one follow_ups row per step with due_at = now() + after_hours.
  5. Customer copy: sendEmail kind 'quote_copy' (or 'quote_pending' if not priced), replyTo = workspace contact_email, fromName = workspace name. If sms_consent and sms_available: sendSms kind 'quote_copy' with the PRD 15.1 template, dedupe 'qc:' + lead_id; on { sent: false } do nothing more (the email went). Owner alert: sendEmail 'owner_new_lead' to members whose notification_prefs.on_new_lead is true; sendSms 'owner_new_lead' to members with sms_to_me and my_phone.
  6. If photos are disabled and notes are over 40 characters: insert jobs { kind 'ai_review', ref_id lead_id, idempotency_key 'ai:' + lead_id + ':1' } on conflict do nothing, and set ai_status 'queued'.
  7. Return { lead_token: token, priced, low_cents, high_cents, survey_only, lead_url: APP_URL + '/l/' + token }.
- Log { fn, action, ws, priced, ms } only.

Curl tests (replace REF and CALC):
curl -s "https://REF.supabase.co/functions/v1/qt-public-quote?calc=CALC"
curl -s -X POST "https://REF.supabase.co/functions/v1/qt-public-quote" -H "Content-Type: application/json" -d '{"action":"price","calc":"CALC","service_id":"home_clean","answers":{"bedrooms":3,"bathrooms":1,"clean_type":"deep","pets":false},"extras":["oven"],"postcode":"SW15 2AA"}'
curl -s -X POST "https://REF.supabase.co/functions/v1/qt-public-quote" -H "Content-Type: application/json" -d '{"action":"submit","calc":"CALC","service_id":"home_clean","answers":{"bedrooms":3,"bathrooms":1,"clean_type":"deep","pets":false},"extras":[],"postcode":"SW15 2AA","customer":{"name":"Test Customer","email":"you+test@yourmail.com"},"consents":{"sms":false,"email":true},"hp":"","elapsed_ms":8000,"source":"widget","low_cents":1}'
Expected: GET returns the calculator without rates; price returns priced true with low < high; submit returns a lead_token and the stored price_low_cents is NOT 1. Run the submit 12 times in an hour from one IP: the 11th returns 429.

Plan first, then wait for my OK.`,
  },
  {
    name: 'qt-lead-photos',
    purpose: 'Gives the customer signed upload URLs for up to 6 resized photos on their lead, then confirms the uploads and queues one AI site visit check.',
    trigger: 'Called by the widget and the lead page with the lead token',
    secrets: ['IP_HASH_SALT'],
    prompt: `${shared}

Build supabase/functions/qt-lead-photos/index.ts. Read @PRD.md sections 9.3, 11.3 and 13.2.

Contract:
- Deploy with --no-verify-jwt. CORS open.
- All bodies carry token. Look the lead up by public_token_hash = sha256Hex(token). Unknown: 404 { code: 'not_found' } (same body as any other miss). Lead status won or lost: 409 { code: 'closed' }.
- try_rate_limit('photos:' + sha256Hex(token), 20, 3600) else 429.
- action 'urls', files: [{ mime, bytes, width, height }] (1 to 6). Load the version config: photos.enabled must be true. Existing photos + new must be <= 6. mime in image/jpeg, image/png, image/webp, image/heic; bytes <= 10 MB (the browser already resized to 1280 px). For each: n = next index, path = <workspace_id>/<lead_id>/<n>.jpg, insert lead_photos (uploaded false), storage.from('lead-photos').createSignedUploadUrl(path). Return { uploads: [{ path, signed_url, token }] }.
- action 'done': storage.from('lead-photos').list('<ws>/<lead>'). Mark rows whose file exists as uploaded = true with the real size; delete rows whose file is missing. If at least one uploaded photo: count ai_reviews for the lead; 0 -> key 'ai:<lead>:1', 1 -> key 'ai:<lead>:2', 2 or more -> no new job. Insert jobs { kind 'ai_review', ref_id lead_id, workspace_id, idempotency_key } on conflict do nothing; set leads.ai_status = 'queued'; add a lead_events row 'photos_added' with the count. Return { uploaded: n, review_queued: boolean }.
- Never return other leads' paths, signed read URLs, or the workspace id.

Curl tests:
curl -s -X POST "https://REF.supabase.co/functions/v1/qt-lead-photos" -H "Content-Type: application/json" -d '{"action":"urls","token":"LEAD_TOKEN","files":[{"mime":"image/jpeg","bytes":240000,"width":1280,"height":960}]}'
Then upload a JPEG: curl -s -X PUT "SIGNED_URL" -H "Content-Type: image/jpeg" --data-binary @room.jpg
curl -s -X POST "https://REF.supabase.co/functions/v1/qt-lead-photos" -H "Content-Type: application/json" -d '{"action":"done","token":"LEAD_TOKEN"}'
Expected: { "uploaded": 1, "review_queued": true }, and select idempotency_key, status from jobs; shows 'ai:<lead>:1' queued. A random token returns 404. A 7th photo request returns 400 { code: 'too_many_photos' }.

Plan first, then wait for my OK.`,
  },
  {
    name: 'qt-triage-worker',
    purpose: 'The background worker. Runs the Claude Haiku photo and notes check for queued leads, meters it, stores the result and applies the owner\'s site visit rule without ever touching the price.',
    trigger: 'pg_cron every minute (x-cron-secret header)',
    secrets: ['ANTHROPIC_API_KEY', 'CRON_SECRET', 'RESEND_API_KEY', 'EMAIL_FROM_ADDRESS', 'APP_URL'],
    prompt: `${shared}

Build supabase/functions/qt-triage-worker/index.ts. Read @PRD.md sections 9.3, 9.4, 11.4, 12, 13.3 and 14 first.

Contract:
- POST from pg_cron with x-cron-secret. requireCron. Deploy with --no-verify-jwt.
- rpc('release_stuck_jobs'), then rpc('claim_jobs', { p_limit: 10 }). Process up to 3 at a time with Promise.all over small batches. Stop starting new jobs after 50 seconds.
- Each ai_review job:
  1. Load the lead (admin client), its calculator_versions.config, the service and answers, and up to 6 lead_photos where uploaded = true ordered by created_at.
  2. ok = tryMeter(ws, 'ai_reviews', 1, 2000, lead_id, job.idempotency_key). If false: leads.ai_status = 'skipped', ai_summary = 'Photo check paused: monthly limit reached', job done.
  3. leads.ai_status = 'running'. Download each photo with storage.from('lead-photos').download(path), base64 it (use the std/encoding base64 encoder, not btoa on a big string).
  4. Build the user content exactly as PRD 14.2: for each photo a text block "Photo <n>" then { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data } }, then the tagged text block. Only the outward part of the postcode. Never the name, email, phone or address. Notes cut to 2,000 characters.
  5. reviewLead with the system prompt from PRD 14.1 and the JSON schema from 14.3 (write it once as a zod schema in _shared/review-schema.ts and convert with zod-to-json-schema, or hand-write the JSON schema next to it and keep both in sync).
  6. Post-process exactly as the end of PRD 14.3 (clamp, cut, drop unknown question ids, strip currency amounts).
  7. Insert ai_reviews { model: 'claude-haiku-5-5', result, needs_site_visit, confidence, photo_count, cost_usd_micros }. Update the usage_ledger row for this idempotency key with the real cost_usd_micros.
  8. Apply config.site_visit.ai_action: 'ignore' -> ai_status 'done', ai_summary = summary. 'suggest' -> same, and when needs_site_visit email members with on_site_visit_flag ('owner_site_visit', dedupe 'sv:' + lead_id). 'require' -> same, and when needs_site_visit and confidence >= ai_min_confidence, set needs_site_visit = true and site_visit_reason = summary. If the lead already has a confirmed job booking, never cancel it: email the owner "Booked before the photo check finished" instead.
  9. lead_events 'ai_review' with { needs_site_visit, confidence }. Job status 'done'.
- Errors: 'ai_refused' -> ai_status 'failed', summary 'Photo check unavailable for this lead', job done (no retry). Anything else: attempts + 1, run_after = now() + 2^attempts minutes + random 0 to 30 s, back to 'queued'; at 3 attempts 'dead' and ai_status 'failed'.
- The ONLY columns this function may write on leads are ai_status, ai_summary, needs_site_visit and site_visit_reason. Add a code comment saying so, and a unit test that greps the file for price_ to make sure it never appears in an update.
- Response { ok: true, processed, failed, ms }. Log one line per job { fn, job_id, ok, ms, cost_micros, photos }.

Curl test:
curl -s -X POST "https://REF.supabase.co/functions/v1/qt-triage-worker" -H "x-cron-secret: CRON_SECRET"
First submit a test lead with 3 photos of a large house and answers saying 1 bedroom. Expected within one run: select needs_site_visit, confidence, result->>'summary' from ai_reviews order by created_at desc limit 1; shows true with a reason mentioning rooms. With a wrong secret the function returns 401.

Plan first, then wait for my OK.`,
  },
  {
    name: 'qt-book',
    purpose: 'Lists open slots, holds one atomically against double booking, creates the deposit Checkout on the business\'s own Stripe account, and lets the customer reschedule or cancel.',
    trigger: 'Called by the lead page and the booking management page (lead or manage token)',
    secrets: ['STRIPE_SECRET_KEY', 'RESEND_API_KEY', 'EMAIL_FROM_ADDRESS', 'TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'IP_HASH_SALT', 'APP_URL'],
    prompt: `${shared}

Build supabase/functions/qt-book/index.ts and supabase/functions/_shared/slots.ts. Read @PRD.md sections 9.2, 11.5, 11.6 and 13.4 first.

slots.ts: openSlots({ calendar, windows, blackouts, bookings, kind, durationMin, from, days, now }) returns [{ starts_at, ends_at }] in UTC. Work in the calendar timezone with npm:date-fns-tz. Rules from PRD 11.5: 30 minute steps inside windows that allow the kind, start >= now + min_notice_hours, end <= window end, no overlap with blackouts, and no overlap with held/confirmed bookings expanded by buffer_minutes on both sides. Handle daylight saving changes (test the last Sunday of March in Europe/London and the second Sunday of March in America/New_York). Write 10 Deno tests.

Contract:
- Deploy with --no-verify-jwt. CORS open. Rate limit 'book:' + ipHash at 30 holds an hour, 300 slot lookups an hour.
- GET ?token&kind&from: lead by token hash (404 if unknown, closed or paused business). Allowed kinds: config.booking.mode ('survey', 'job', 'both', 'none'); 'job' is not allowed when lead.needs_site_visit or the price was survey_only. Duration: survey = calendar.survey_minutes; job = per_hour rule hours (round up to 30 min) else calendar.job_minutes. Calendar = calculators.calendar_id or the workspace's first active calendar. Return { kind, timezone, deposit_cents, currency, slots } for 14 days from 'from'.
- POST hold { token, kind, starts_at, note }: recompute the slot list; starts_at must be in it (else 409 'slot_unavailable'). Deposit: job with job_deposit pct -> round(price_low_cents x pct / 100 / 100) x 100 (whole currency units); fixed -> value; survey -> survey_deposit_cents. Stripe minimum: if 0 < deposit < 50 cents, use 0. Deposit due but no integrations row with charges_enabled: deposit = 0 (book without one) and log 'deposit_skipped_no_stripe'.
  manage = newToken(). rpc('hold_slot', { ..., p_manage_token_hash: sha256Hex(manage) }). Error 'slot_taken' -> 409 "That time has gone. Pick another."; 'already_booked' -> 409 with the existing booking's manage link sent by email again.
  Deposit due: stripe.checkout.sessions.create on the connected account exactly as PRD 11.6 (npm:stripe, stripeAccount option, idempotencyKey 'dep:' + booking_id, expires_at = now + 30 minutes, customer_email when known, success_url = APP_URL + '/l/' + token + '?paid=1', cancel_url = APP_URL + '/l/' + token). Insert deposits { status 'pending', checkout_session_id, stripe_account_id }. Return { checkout_url }.
  No deposit: the booking is already confirmed by hold_slot. Send booking_confirmed (email + SMS if consented, dedupe 'bk:' + booking_id), add lead_events 'booked', return { confirmed: true, manage_url: APP_URL + '/b/' + manage }.
- POST cancel { manage_token } / reschedule { manage_token, starts_at }: booking by manage_token_hash, status confirmed, now < starts_at - min_notice_hours (else 409 'too_late' with the business phone). Cancel: status 'cancelled', cancelled_reason 'customer', lead back to 'quoted' if it was 'booked' and no other confirmed booking, booking_cancelled emails (owner email includes the Stripe dashboard link for the payment intent when a deposit was paid). Reschedule: in one RPC call, hold the new slot with the same deposit already paid (write a small SQL function reschedule_booking(p_booking, p_starts, p_ends) in a new migration file that inserts the new confirmed booking, moves the deposit row, and cancels the old one; revoke it from anon and authenticated). Send booking_confirmed again with the new time.
- Responses never include the lead id, workspace id, calendar id or other bookings.

Curl tests:
curl -s "https://REF.supabase.co/functions/v1/qt-book?token=LEAD_TOKEN&kind=survey&from=2026-11-02"
curl -s -X POST "https://REF.supabase.co/functions/v1/qt-book" -H "Content-Type: application/json" -d '{"action":"hold","token":"LEAD_TOKEN","kind":"survey","starts_at":"FIRST_SLOT_FROM_ABOVE"}'
Run the same hold twice at once (two terminals, or & in bash): exactly one succeeds and the other gets 409. With a job deposit set, the response has a checkout_url on checkout.stripe.com.

Plan first, then wait for my OK.`,
  },
  {
    name: 'qt-connect-onboard',
    purpose: 'Creates the business\'s Stripe connected account (Accounts v2, Standard-style: full dashboard, Stripe owns fees and losses) and returns the onboarding link, then keeps its status fresh.',
    trigger: 'Called by Settings > Payments (owner or admin JWT)',
    secrets: ['STRIPE_SECRET_KEY', 'APP_URL'],
    prompt: `${shared}

Build supabase/functions/qt-connect-onboard/index.ts. Read @PRD.md sections 11.6 and 13.5.

Before writing, open Stripe's current docs for Accounts v2 connected account configuration and Account Links (docs.stripe.com/connect/accounts-v2) and confirm the exact request fields. If anything below differs from the docs, follow the docs and tell me what changed.

Contract:
- POST with the user's JWT (deploy with JWT verification on). requireUser, body { workspace_id, action }. requireMember(ws, ['owner', 'admin']). requireAccess(ws).
- action 'start':
  1. If integrations has no stripe row for ws: create the account with Accounts v2 (POST https://api.stripe.com/v2/core/accounts with Authorization: Bearer STRIPE_SECRET_KEY and the Stripe-Version header the docs specify for v2), with: contact_email = workspace contact_email, display_name = workspace name, identity.country = workspace country, dashboard 'full', defaults.responsibilities { fees_collector: 'stripe', losses_collector: 'stripe' }, and the merchant configuration requesting card_payments. Idempotency-Key 'acct:' + ws. Insert integrations { provider 'stripe', external_account_id, display_name, status 'onboarding', connected_by }.
  2. Create an Account Link for that account (use case account onboarding, refresh_url = APP_URL + '/app/settings?tab=payments&refresh=1', return_url = APP_URL + '/app/settings?tab=payments&return=1'). Return { url }.
- action 'refresh': retrieve the account (v2 retrieve with the include parameters the docs list for requirements and capabilities, or v1 GET /v1/accounts/{id} if simpler and supported for v2 accounts [verify]); set charges_enabled (card payments capability active), details_submitted, status 'active' | 'restricted'. Return the row.
- action 'disconnect': owner only. Delete the integrations row. Return { ok: true }.
- Never store any Stripe secret for the connected account. Direct charges only need the platform key plus the Stripe-Account header.

Curl test (with a fresh user JWT from the app, Network tab > any supabase request > Authorization):
curl -s -X POST "https://REF.supabase.co/functions/v1/qt-connect-onboard" -H "Authorization: Bearer USER_JWT" -H "Content-Type: application/json" -d '{"workspace_id":"WS_ID","action":"start"}'
Expected: { "url": "https://connect.stripe.com/..." }. Open it, complete test onboarding with Stripe's test data, then call action 'refresh': charges_enabled true. A member (not admin) JWT returns 403.

Plan first, then wait for my OK.`,
  },
  {
    name: 'qt-connect-webhook',
    purpose: 'Receives Stripe events from connected accounts, verifies the signature, de-duplicates, and marks deposits paid, expired or refunded, confirming or releasing the booking.',
    trigger: 'Stripe webhook, Connected accounts event destination',
    secrets: ['STRIPE_SECRET_KEY', 'STRIPE_CONNECT_WEBHOOK_SECRET', 'RESEND_API_KEY', 'EMAIL_FROM_ADDRESS', 'TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'APP_URL'],
    prompt: `${shared}

Build supabase/functions/qt-connect-webhook/index.ts. Read @PRD.md sections 9.2, 11.6 and 13.6.

Contract:
- POST only. Deploy with --no-verify-jwt.
- Read the RAW body with await req.text() before anything else. stripe.webhooks.constructEventAsync(raw, req.headers.get('stripe-signature'), STRIPE_CONNECT_WEBHOOK_SECRET, undefined, Stripe.createSubtleCryptoProvider()). 400 on failure.
- De-dupe: insert into connect_events (id, account, type) on conflict do nothing returning id. Already seen: return 200 { duplicate: true }.
- checkout.session.completed and checkout.session.async_payment_succeeded (only when payment_status is 'paid'): find deposits by checkout_session_id where stripe_account_id = event.account (both must match, else log 'account_mismatch' and return 200). Set status 'paid', paid_at, payment_intent_id. rpc('confirm_booking', { p_booking }). If the booking is no longer 'held' or 'confirmed' (hold expired and the slot was taken), set it cancelled with cancelled_reason 'slot_lost' and email the owner "A deposit arrived after the slot was released. Call {name} on {phone} to rebook." Else: lead_events 'deposit_paid', booking_confirmed to customer (email + SMS) and members (email), dedupe 'bk:' + booking_id.
- checkout.session.expired: deposit 'expired'; booking cancelled (cancelled_reason 'deposit_not_paid') if still held.
- charge.refunded: find the deposit by payment_intent_id and account; status 'refunded', refunded_at.
- account.updated (and any v2 account event the docs list for requirement changes [verify]): update integrations.charges_enabled / details_submitted / status for that external_account_id.
- Every branch returns 200 quickly. Errors after verification: log and return 500 so Stripe retries.

Test with the Stripe CLI:
stripe listen --forward-connect-to https://REF.supabase.co/functions/v1/qt-connect-webhook
(copy the whsec_ it prints into Supabase secrets for local testing), then pay a test deposit through the app with 4242 4242 4242 4242.
Expected: select status from deposits order by created_at desc limit 1; is 'paid' and the booking is 'confirmed'. stripe events resend <evt_id> --webhook-endpoint <we_id> returns 200 with duplicate true and nothing changes. A POST with a wrong signature returns 400.

Plan first, then wait for my OK.`,
  },
  {
    name: 'qt-sms-setup',
    purpose: 'Creates the business\'s Twilio subaccount and Messaging Service, then a verified toll-free number (US, Canada) or an alphanumeric sender (UK), and polls the verification status.',
    trigger: 'Called by Settings > Texting (owner or admin JWT) and by qt-reminders hourly (cron secret)',
    secrets: ['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_NOTIFICATION_EMAIL', 'CRON_SECRET', 'APP_URL'],
    prompt: `${shared}

Build supabase/functions/qt-sms-setup/index.ts. Read @PRD.md sections 9.6, 11.7 and 13.7.

Before writing, check Twilio's current docs for: subaccounts (POST /2010-04-01/Accounts.json), Messaging Services (messaging.twilio.com/v1/Services and /PhoneNumbers, /AlphaSenders), toll-free number search and purchase (AvailablePhoneNumbers/{Country}/TollFree.json and IncomingPhoneNumbers.json), and Toll-Free Verification (messaging.twilio.com/v1/Tollfree/Verifications) including whether BusinessRegistrationNumber is required now. All calls use Basic auth with the MASTER TWILIO_ACCOUNT_SID:TWILIO_AUTH_TOKEN and the subaccount SID in the path where the resource lives in the subaccount. If the docs differ from this prompt, follow the docs and tell me.

Contract:
- POST with a user JWT (JWT verification on) or x-cron-secret for action 'status_all'.
- action 'start' { workspace_id, country ('US' | 'CA' | 'GB'), legal_name, business_registration_number?, website, alpha_id? }: requireMember(ws, ['owner', 'admin']), requireAccess(ws). Idempotent on the sms_senders row:
  1. No subaccount yet: create one (FriendlyName 'qt-' + ws). Save twilio_subaccount_sid.
  2. No messaging_service_sid: create a Messaging Service in the subaccount (FriendlyName = business name, StatusCallback = SUPABASE_URL + '/functions/v1/qt-twilio-webhook', inbound request URL the same). Save it.
  3. US or CA: if no phone_number, search toll-free numbers in the country, buy the first one in the subaccount, add it to the service. Then submit toll-free verification with the business fields, use case 'ACCOUNT_NOTIFICATIONS' (check the current enum), message volume '1,000', opt-in type 'WEB_FORM', opt-in image URL = APP_URL + '/consent-example.png' (a screenshot you add of the widget consent box), sample message = the quote_copy template from PRD 15.1 filled with sample values, NotificationEmail = TWILIO_NOTIFICATION_EMAIL. Save verification_sid, status 'in_review'.
  4. GB: alpha_id required (2 to 11 characters, letters, digits, space, & . - _, at least one letter, not SMS, INFO or NOTIFY). Add it as an alpha sender to the service. Status 'approved'.
- action 'status' { workspace_id }: fetch the verification, map TWILIO_APPROVED -> approved, TWILIO_REJECTED -> rejected (save rejection_reason), anything else -> in_review. When it changes, email the owner 'sender_status'.
- action 'status_all' (cron): same for every in_review sender, 50 per run.
- Twilio errors come back as JSON { code, message, more_info }. Show the owner a plain version, for example 21452 "No toll-free numbers available right now. Try again in an hour."

Curl test:
curl -s -X POST "https://REF.supabase.co/functions/v1/qt-sms-setup" -H "Authorization: Bearer USER_JWT" -H "Content-Type: application/json" -d '{"workspace_id":"WS_ID","action":"start","country":"GB","legal_name":"Sparkle Cleaning Ltd","website":"https://example.com","alpha_id":"SparkleCln"}'
Expected: { "status": "approved", "kind": "alpha" } and a new subaccount in the Twilio console (Account > Subaccounts). For US, expect status in_review and a verification SID starting HH.

Plan first, then wait for my OK.`,
  },
  {
    name: 'qt-twilio-webhook',
    purpose: 'Verifies Twilio\'s signature, records delivery status once per message and status, and handles STOP, START and customer replies.',
    trigger: 'Twilio status callbacks and inbound messages (POST, form-encoded, X-Twilio-Signature)',
    secrets: ['TWILIO_AUTH_TOKEN', 'RESEND_API_KEY', 'EMAIL_FROM_ADDRESS', 'APP_URL'],
    prompt: `${shared}

Build supabase/functions/qt-twilio-webhook/index.ts. Read @PRD.md sections 11.7 and 13.8.

Contract:
- POST, Content-Type application/x-www-form-urlencoded. Deploy with --no-verify-jwt.
- Signature: url = SUPABASE_URL + '/functions/v1/qt-twilio-webhook' (the exact public URL Twilio called, including any query string). Sort the POST params by key, append key + value for each to the url, HMAC-SHA1 with TWILIO_AUTH_TOKEN, base64, constant-time compare with X-Twilio-Signature. 403 on mismatch. Write a Deno test using Twilio's documented example values.
- If the request has MessageStatus (status callback): de-dupe insert twilio_events (id = MessageSid + ':' + MessageStatus) on conflict do nothing; if new, update sms_log set status, error_code where twilio_sid = MessageSid. ErrorCode 21610: insert sms_opt_outs (workspace from sms_log, To number).
- Else (inbound message): find the sender by AccountSid = sms_senders.twilio_subaccount_sid. Normalise From to E.164 and the Body to uppercase trimmed.
  STOP, STOPALL, UNSUBSCRIBE, CANCEL, END, QUIT: insert sms_opt_outs, cancel scheduled sms follow_ups for leads in that workspace with that phone.
  START, UNSTOP, YES: delete the opt-out.
  HELP, INFO: nothing (Twilio's default reply handles it [verify]).
  Anything else: find the newest lead in the workspace with that customer_phone; add lead_events 'customer_reply' { text (first 1,000 characters) }; set follow_ups_paused = true; email members 'customer_reply' with the text and the lead link.
- Always return 200 with Content-Type text/xml and body <Response/>.

Test:
Use the Twilio console's webhook debugger, or sign a fake request yourself with a small script (scripts/twilio-sign.ts that prints the signature for a URL and params). Send a status callback twice: twilio_events has one row. Send an inbound "STOP": sms_opt_outs has the number. A request with a bad signature returns 403.

Plan first, then wait for my OK.`,
  },
  {
    name: 'qt-send-message',
    purpose: 'Lets a team member text or email a customer from the lead panel, with consent, opt-out and credit checks.',
    trigger: 'Called by the lead panel (member JWT)',
    secrets: ['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'RESEND_API_KEY', 'EMAIL_FROM_ADDRESS', 'APP_URL'],
    prompt: `${shared}

Build supabase/functions/qt-send-message/index.ts. Read @PRD.md sections 13.9 and 15.

Contract:
- POST with the user's JWT (JWT verification on). Body { lead_id, channel: 'sms' | 'email', body } validated with zod (body 1 to 480 characters, trimmed).
- requireUser, load the lead with the admin client, requireMember(lead.workspace_id), requireAccess.
- try_rate_limit('msg:' + userId, 60, 3600) else 429.
- sms: lead.sms_consent must be true (409 'no_consent' "This customer did not agree to texts. Send an email instead."), no opt-out (409 'opted_out'), sender approved (409 'sender_not_ready'). Append the opt-out text for the sender kind. sendSms with dedupe 'msg:' + lead_id + ':' + sha256Hex(body + minute). On cap: 402 'limit_reached' with "You have used all your SMS credits this month. Send an email or upgrade."
- email: lead.customer_email required. sendEmail kind 'manual' with replyTo = the member's email, fromName = workspace name, the body as plain text and simple HTML (escape it).
- Add lead_events 'sms_sent' or 'email_sent' { by: userId, chars }. Return { ok: true, credits_used }.

Curl test:
curl -s -X POST "https://REF.supabase.co/functions/v1/qt-send-message" -H "Authorization: Bearer USER_JWT" -H "Content-Type: application/json" -d '{"lead_id":"LEAD_ID","channel":"email","body":"Hi, we can do Thursday morning. Does 9am work?"}'
Expected: { "ok": true, "credits_used": 0 } and an email_log row. The same call with another workspace's member JWT returns 403.

Plan first, then wait for my OK.`,
  },
  {
    name: 'qt-reminders',
    purpose: 'The every-5-minutes worker: expires unpaid holds, sends due follow-ups inside quiet hours with email fallback, sends booking reminders, polls SMS sender reviews, sends digests and cleans up old photos.',
    trigger: 'pg_cron every 5 minutes (x-cron-secret header)',
    secrets: ['CRON_SECRET', 'TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'RESEND_API_KEY', 'EMAIL_FROM_ADDRESS', 'APP_URL'],
    prompt: `${shared}

Build supabase/functions/qt-reminders/index.ts. Read @PRD.md sections 9.5, 13.10 and 15 first.

Contract:
- POST with x-cron-secret. requireCron. Deploy with --no-verify-jwt. Stop starting new work after 50 seconds and leave the rest for the next run.
1. rpc('expire_holds'). For each booking it cancelled in the last 5 minutes (select by cancelled_reason 'deposit_not_paid' and updated_at), send booking_cancelled to the customer (dedupe 'bx:' + booking_id).
2. Follow-ups: select scheduled follow_ups with due_at <= now() ordered by due_at, limit 200, joined with leads and workspaces. For each:
   - lead.status <> 'quoted' or follow_ups_paused or !has_active_access(ws): status 'skipped' with the reason.
   - Quiet hours (follow_up_rules.quiet_start / quiet_end in the workspace timezone): move due_at to the next quiet_end and continue.
   - channel 'sms': if sms_consent and sender approved and no opt-out, sendSms with the template (follow_up_rules.templates[key] or the PRD 15.1 default), dedupe 'fu:' + lead + ':' + step. If it returns sent false, or the SMS is not allowed, fall back to email if customer_email exists. Neither possible: 'skipped'.
   - channel 'email': sendEmail kind 'follow_up_' + step with the next 3 open slots (use _shared/slots.ts) and the lead link.
   - Mark 'sent' with sent_at, or 'skipped' with skip_reason. Add lead_events.
3. Booking reminders: confirmed bookings with starts_at between now + booking_reminder_hours - 5 minutes and now + booking_reminder_hours, reminder_sent_at null. SMS if allowed, else email. Set reminder_sent_at.
4. If the current minute is 0 to 4: call the qt-sms-setup logic for status_all (import the shared function rather than an HTTP call).
5. Digest: for each workspace where the local time is 08:00 to 08:04 and digest not sent today (email_log dedupe 'digest:' + ws + ':' + local date), email members with daily_digest on: new leads since yesterday 08:00, bookings today, quoted leads older than 24 hours with no booking.
6. If the UTC time is 03:00 to 03:04: leads with status quoted or new and no activity (max of created_at, last_customer_activity_at, latest lead_events) for 30 days -> status 'lost', lost_reason 'No reply'. Leads won or lost more than 180 days ago: delete their lead-photos files and rows.
- Response { ok: true, holds_expired, follow_ups_sent, follow_ups_skipped, reminders, ms }.

Curl test:
curl -s -X POST "https://REF.supabase.co/functions/v1/qt-reminders" -H "x-cron-secret: CRON_SECRET"
Make a follow-up due (update follow_ups set due_at = now() - interval '1 minute' where id = 'ID';), run it: the follow-up is 'sent' and one sms_log or email_log row exists. Run again: still one row. With a wrong secret: 401.

Plan first, then wait for my OK.`,
  },
]
