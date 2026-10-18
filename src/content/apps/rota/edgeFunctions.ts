// Rota edge functions: one Claude Code prompt per function.
import type { EdgeFunctionDef } from '../../types'

const shared = `First, if supabase/functions/_shared/ does not exist yet, create these helpers (read @PRD.md section 16 intro):
1. admin.ts: adminClient() with Deno.env.get('SUPABASE_URL') and Deno.env.get('SUPABASE_SECRET_KEY') (fall back to SUPABASE_SERVICE_ROLE_KEY), auth: { persistSession: false }. userClient(token) with the publishable key and the user's Authorization header, so auth.uid() and RLS work in RPCs.
2. auth.ts: requireUser(req) reads the Bearer token, calls supabase.auth.getClaims(token), returns { userId, token } or throws HttpError(401). requireManager(locationId) calls rpc('can_manage_location') through userClient and throws 403. requireStaff(ws) calls rpc('my_staff_id') through userClient and throws 403 if null. requireAccess(ws) calls has_active_access with the admin client and throws HttpError(402, 'paused'). requireCron(req) compares x-cron-secret with CRON_SECRET in constant time.
3. http.ts: HttpError(status, code, message), json(body, status), CORS for APP_URL and http://localhost:3000, OPTIONS handler. Error body: { error: { code, message } }. Messages come from @DESIGN.md section 15.
4. log.ts: log(fn, data) prints one JSON line. Never log phone numbers, emails, tokens, message bodies, coordinates or API keys. Log ids and counts only.
5. retry.ts: withRetry(fn, { tries: 3, baseMs: 800 }) with exponential backoff + jitter, honours retry-after, retries only 429 and 5xx.
6. limits.ts: checkLimit(ws, kind, qty) reads plan_limits(ws) (sms_total, drafts_total) and usage_this_month(ws, kind), throws HttpError(402, 'limit_reached', "You've used X of Y ... this month.").
7. meter.ts: meter({ ws, locationId, userId, kind, quantity, costMicros, refId, idempotencyKey }) inserts usage_ledger with on conflict (idempotency_key) do nothing.
8. time.ts: helpers on top of Intl.DateTimeFormat with timeZone: localParts(date, tz), localTimeToUtc(dateStr, 'HH:MM', tz) (correct across daylight saving, write 6 deno tests incl. the last Sunday of March and October in Europe/London), isQuietHours(date, tz) for 22:00 to 08:00, nextLocal0800(date, tz), formatRange(start, end, tz, locale).
9. conflicts.ts: checkWeek({ shifts, staff, availability, timeOff, rules, tz }) returning [{ shift_id, staff_id, kind, severity, detail }] with exactly the rules of @PRD.md 11.3 (same as the SQL rota_conflicts). Write deno tests for every kind, including an overnight shift and two locations.
10. sms.ts: toGsm(text) transliterates to the GSM-7 alphabet (curly quotes, accents, emoji removed), segments(text) counts GSM-7 (160 single, 153 per part) or UCS-2 (70 / 67), fitSegment(body, link) cuts the middle of the body with "+N more" so the whole message is one segment and the link survives. Tests for every template in @PRD.md 12.2 with a 30 character business name.
11. twilio.ts: sendSms({ to, body, country, senderId, notificationId }) POSTs form-encoded to https://api.twilio.com/2010-04-01/Accounts/{TWILIO_ACCOUNT_SID}/Messages.json with Basic auth TWILIO_API_KEY_SID:TWILIO_API_KEY_SECRET. Body: To, Body, StatusCallback = SUPABASE_URL + '/functions/v1/rt-twilio-webhook?kind=status', and either From = senderId (countries using alphanumeric sender IDs) or MessagingServiceSid = TWILIO_MESSAGING_SERVICE_SID (US, CA). Returns { sid, status, numSegments, errorCode }. verifyTwilioSignature(url, params, signature) = base64(HMAC-SHA1(TWILIO_AUTH_TOKEN, url + sorted name+value pairs)) compared in constant time, with a deno test using Twilio's documented example values if you can find them in the docs, else a self-made vector.
12. email.ts: sendEmail({ ws, notificationId, kind, to, subject, html, text, dedupeKey, replyTo }) inserts email_log first (on conflict dedupe_key do nothing, and returns without sending if it existed), POST https://api.resend.com/emails with Authorization: Bearer RESEND_API_KEY and an Idempotency-Key header = dedupeKey, then updates resend_id and status.
13. claude.ts: callClaude({ system, cachedBlocks, userContent, schema, zodSchema, effort, maxTokens }) using npm:@anthropic-ai/sdk on client.beta.messages.stream(...).finalMessage(), model 'claude-opus-5-5', thinking { type: 'adaptive' }, output_config { effort, format: { type: 'json_schema', schema } }, system and cached blocks marked cache_control { type: 'ephemeral' }, betas ['server-side-fallback-2026-07-01'] with fallbacks: 'default'. Check stop_reason: 'refusal' throws HttpError(422, 'ai_refused'), 'max_tokens' throws HttpError(502, 'ai_truncated'). Parse the text block as JSON and validate with zodSchema. costMicros = input_tokens*4 + cache_read_input_tokens*0.2 + cache_creation_input_tokens*5 + output_tokens*20, rounded. Check the Anthropic docs for field names before writing; follow the docs if they differ and tell me.
Then build the function below.`

export const edgeFunctions: EdgeFunctionDef[] = [
  {
    name: 'rt-draft',
    purpose: 'Queues a Claude draft of a rota week behind the plan cap, applies a finished draft as draft shifts, or discards it. Never calls Claude itself.',
    trigger: 'Called by the browser from the Draft with Claude panel (manager JWT)',
    secrets: ['APP_URL'],
    prompt: `${shared}

Build supabase/functions/rt-draft/index.ts. Read @PRD.md sections 9.7, 11.5 and 16.1.

Contract:
- POST JSON validated with a zod discriminated union on action:
  { action: 'request', week_id: uuid, instructions?: string max 500, pinned_shift_ids?: uuid[] max 200 }
  { action: 'apply', draft_id: uuid, force?: boolean }
  { action: 'discard', draft_id: uuid }
  { action: 'seen', draft_id: uuid }
- requireUser. Load the week (or the draft and its week) with the admin client. requireManager(week.location_id). requireAccess(week.workspace_id).

request:
- Rate limit: rpc try_rate_limit('draft:' + userId, 5, 600). 429 "One draft at a time. Try again in a few minutes."
- 409 { code: 'draft_running' } if ai_drafts has a queued or running row for this week.
- checkLimit(ws, 'ai_drafts', 1). Do NOT meter here: the worker meters when Claude actually ran.
- Insert ai_drafts { workspace_id, location_id, week_id, status 'queued', requested_by, instructions } and jobs { workspace_id, kind 'draft_rota', ref_id: draft.id, idempotency_key: 'draft:' + draft.id, payload: { pinned_shift_ids } }.
- Return 202 { draft_id, status: 'queued' }.

apply:
- Draft must be 'ready' (409 'not_ready'). Compare result.base_version with the current max(updated_at) of the week's shifts; if different and !force return 409 { code: 'week_changed' }.
- With the admin client: delete shifts in the week where status = 'draft' and published_snapshot is null and id not in result.pinned_shift_ids; insert every result.shifts item as { workspace_id, location_id, week_id, staff_id, role_id, starts_at, ends_at, break_minutes, notes: '', status: 'draft', source: 'ai', created_by: userId } (convert local date + HH:MM to UTC with time.ts; end before start means next day); then mark the week draft if it was published (the admin client bypasses the dirty trigger, so do it explicitly); set the draft status 'applied', applied_at now().
- If any insert fails, delete the rows you inserted in this call and return 500 with "Could not apply the draft. Your rota is unchanged."
- Return { inserted, removed }.

discard: set status 'discarded' (only from ready or failed). seen: update notifications set status 'skipped', error 'seen_in_app' where kind 'draft_ready' and payload->>'draft_id' = draft_id and status 'queued'.

Log { fn, action, week_id, ms }. Deploy with JWT verification on.
Curl test:
curl -X POST "https://<ref>.supabase.co/functions/v1/rt-draft" -H "Authorization: Bearer <MANAGER_JWT>" -H "Content-Type: application/json" -d '{"action":"request","week_id":"<uuid>"}'
Expected 202 {"draft_id":"...","status":"queued"}. The same call again returns 409 draft_running. A staff member's JWT returns 403. With workspace_limit_overrides.drafts_per_location = 0 it returns 402 limit_reached.

Plan first, then wait for my OK.`,
  },
  {
    name: 'rt-worker',
    purpose: 'The background worker. Drafts rotas with Claude using structured JSON output, re-checks every assignment against the rules, meters the cost, auto-closes forgotten clock-ins and expires stale swap requests.',
    trigger: 'pg_cron every minute (x-cron-secret header)',
    secrets: ['ANTHROPIC_API_KEY', 'CRON_SECRET', 'APP_URL'],
    prompt: `${shared}

Build supabase/functions/rt-worker/index.ts. Read @PRD.md sections 9.6, 9.9, 16.2 and 17 first.

Contract:
- POST from pg_cron with x-cron-secret. requireCron. Deploy with --no-verify-jwt.
- rpc('release_stuck_work'), then rpc('claim_jobs', { p_limit: 3 }). Process jobs one at a time. Stop starting new jobs after 110 seconds of wall time.
- Wrap every job in try/catch. Success: status 'done'. Error: last_error = message (no secrets, no personal data), status 'queued', run_after = now() + 2^attempts minutes + random 0 to 30 s. When attempts >= 3: 'dead', and set the draft 'failed' with error "Claude could not finish this draft. Your rota is unchanged. Try again."

kind 'draft_rota' (ref_id = ai_drafts.id):
1. Set the draft 'running'. Load in as few queries as you can: the week, location (timezone, opening_hours, weekly_budget_cents), workspace (min_rest_hours, overtime_hours_week, currency), job_roles, staff linked to this location (status active or invited) with staff_roles, contract_hours_week, max_hours_week, staff_private.hourly_rate_cents, availability_rules, approved time_off overlapping the week, the pinned shifts (payload.pinned_shift_ids), the location's default template (rota_templates.is_default, else the most recently updated one) and the last 4 published weeks' shifts for this location.
2. Build the demand: from the template (weekday, role, from, to, headcount) if any; else the median headcount per role per 2 hour block across the 4 weeks; else opening hours with headcount 1 per role.
3. Turn pay into a band: low / mid / high by the location's tertiles of hourly_rate_cents (or role default). Names as first name + last initial.
4. callClaude with the system preamble from @PRD.md 17.1 as the cached system block, and the user content of 17.2: each data block JSON.stringify'd inside its tag, the manager's instructions inside <manager_note> (strip any "<" and ">" from it first), then the task line. Schema from 17.3 plus the zod rules listed under it. effort 'medium', maxTokens 16000.
5. Validate every returned shift: role id known; staff id null or a staff id from the data with that role (if not, set null and warn "Not trained, left open"); date inside the week; times parse. Then run conflicts.checkWeek on the full proposed week (proposed shifts + pinned shifts + already published shifts in this week + shifts for the same people at other locations this week). For every 'block' result set that shift's staff_id to null and add a warning "Sam Lee was on holiday, left open" / "Sam Lee is already on at Luna Angel, left open". Keep 'warn' results as warnings.
6. Compute stats in code: shift count, open count, hours, cost_cents per day and total with each person's rate (or role default). Never use cost numbers from the model.
7. Update the draft: status 'ready', result { shifts, unfilled, notes, pinned_shift_ids, base_version: max(updated_at) of the week's shifts read at step 1, stats }, warnings, cost_usd_micros.
8. meter kind 'ai_drafts' quantity 1, costMicros, idempotencyKey 'draft:' + draft.id.
9. Insert a notifications row { kind: 'draft_ready', channel: 'email', to_user_id: requested_by, dedupe_key: 'draft_ready:' + draft.id, send_after: now() + 2 minutes, payload: { draft_id, week_start } }.

Housekeeping on every run (after jobs, each in its own try/catch):
- Auto-close: time_entries with clock_out_at null whose shift ended more than 4 hours ago: clock_out_at = shift.ends_at, status 'submitted', manager_note 'Auto-closed'. Entries with no shift and clock_in_at older than 16 hours: clock_out_at = clock_in_at + 8 hours, same note.
- Expire: swap_requests in pending_peer or pending_manager with expires_at < now() set to 'expired'.

Prompt-injection guard: staff names, notes and the manager's text only ever appear inside their tags, the system prompt says tagged text is data, no tools are passed, and output is used only after zod validation and the conflict re-check. Never render model text as HTML in the app.

Response: { ok: true, processed, failed, closed, expired, ms }. Log one line per job { fn, job_id, kind, ok, ms, cost_micros, shifts, open }.

Curl test:
curl -X POST "https://<ref>.supabase.co/functions/v1/rt-worker" -H "x-cron-secret: <CRON_SECRET>"
Then request a draft in the app for a week with 8 staff and a template, call the worker, and show me the ai_drafts row (status, warnings, stats) and the usage_ledger row. With a wrong secret it must return 401. Then put one of the staff on approved time off on Tuesday and draft again: no Tuesday shift may be assigned to them.

Plan first, then wait for my OK.`,
  },
  {
    name: 'rt-publish',
    purpose: 'Checks a rota week for conflicts, refuses hard clashes, then publishes it in one database transaction that queues one text and one email per affected person.',
    trigger: 'Called by the browser from the Publish dialog (manager JWT)',
    secrets: [],
    prompt: `${shared}

Build supabase/functions/rt-publish/index.ts. Read @PRD.md sections 9.1, 9.2, 11.3 and 16.3.

Contract:
- POST { week_id: uuid, accept_warnings: boolean }. zod.
- requireUser. Load the week with the admin client. requireManager(week.location_id). requireAccess(week.workspace_id).
- Rate limit: try_rate_limit('publish:' + userId, 10, 3600). 429 if false.
- Conflicts: call rpc('rota_conflicts', { p_week }) through userClient(token) (so the function's own can_manage_location check runs as the user). Also run conflicts.checkWeek for cross-location overlaps the manager may not be able to see in the UI.
  - Any severity 'block': 422 { code: 'conflicts', conflicts: [...] } with details (person, day, kind, detail).
  - Warnings and accept_warnings false: 409 { code: 'warnings', warnings: [...] }.
- Publish: adminClient().rpc('publish_rota_week', { p_week: week_id, p_user: userId }). If the Postgres error code is '23P01' (exclusion violation), find the clashing shifts and return 422 { code: 'double_booked' } with the message "Sam is already on at Luna Angel then. Move one of the shifts."
- Return { version, staff_notified, shifts_published, warnings: count }.
- Idempotent by design: publishing an unchanged week returns staff_notified 0 and sends nothing (dedupe keys include the version).

Log { fn, week_id, version, staff_notified, ms }. Deploy with JWT verification on.
Curl tests:
curl -X POST "https://<ref>.supabase.co/functions/v1/rt-publish" -H "Authorization: Bearer <MANAGER_JWT>" -H "Content-Type: application/json" -d '{"week_id":"<uuid>","accept_warnings":false}'
Expected: 409 warnings (if any) or 200 {"version":1,...}. Then run in SQL:
select kind, channel, count(*) from public.notifications where payload->>'week_id' = '<uuid>' group by 1, 2;
Every person with shifts has exactly one sms (if opted in) and one email. Publish again with no changes: staff_notified 0. A staff JWT returns 403.

Plan first, then wait for my OK.`,
  },
  {
    name: 'rt-notify',
    purpose: 'Sends every due text and email from the outbox: checks opt-ins, quiet hours, the paywall and the plan text cap, fits each SMS into one segment, sends through Twilio or Resend and meters the cost.',
    trigger: 'pg_cron every minute (x-cron-secret header)',
    secrets: ['TWILIO_ACCOUNT_SID', 'TWILIO_API_KEY_SID', 'TWILIO_API_KEY_SECRET', 'TWILIO_MESSAGING_SERVICE_SID', 'RESEND_API_KEY', 'EMAIL_FROM', 'CRON_SECRET', 'APP_URL'],
    prompt: `${shared}

Build supabase/functions/rt-notify/index.ts. Read @PRD.md sections 9.8, 12 and 16.4, and @DESIGN.md section 13.

Contract:
- POST from pg_cron with x-cron-secret. requireCron. Deploy with --no-verify-jwt.
- rows = rpc('claim_notifications', { p_limit: 150 }). Load everything the batch needs in bulk (staff, staff_private, locations, workspaces, shifts, plan limits per workspace, usage per workspace) to avoid one query per row.
- For each row, in this order (each outcome updates the row; never leave one in 'sending'):
  1. Contact check: sms needs staff_private.sms_opt_in, a phone, and no 'stop' in sms_opt_events newer than sms_opt_in_at; email needs an email and email_opt_out false (except kinds invite, swap_decision, claim_decision, time_off_decision, which always send). Else status 'skipped', error 'no_contact' or 'opted_out'.
  2. Reminders: the shift must be published, staff_id unchanged, starts_at equal to payload.starts_at. Else 'skipped', error 'shift_changed'.
  3. Paywall: has_active_access(workspace) false: 'skipped', error 'paused'.
  4. Quiet hours: if isQuietHours(now, location tz) and the kind is not shift_reminder (reminders are already timed) and not (shift_changed for a shift starting within 12 h): set send_after = nextLocal0800, status 'queued', attempts - 1, count as deferred.
  5. SMS: render the template for the kind (@PRD.md 12.2) with the business name first, toGsm, fitSegment with the link APP_URL + '/s' (or '/join/' + payload.token for invites). checkLimit(ws, 'sms_segments', segments(body)); on 402: 'skipped', error 'cap_reached', and insert one owner email notification with dedupe_key 'cap:' + ws + ':' + yyyy-mm. At 80% insert the 'texts running low' owner email once a month the same way. Country: GB/IE and other alphanumeric countries send From = workspaces.sms_sender_id (Pro) or 'Rota'; US/CA send MessagingServiceSid. Only send to numbers whose country code matches the workspace country (else 'skipped', 'wrong_country').
     On success: status 'sent', provider_id = sid, segments = numSegments, sent_at; meter kind 'sms_segments', quantity numSegments, costMicros = numSegments * (US/CA 11300, else 60000), idempotencyKey 'sms:' + row.id.
     Twilio 429/5xx: status 'queued', send_after = now() + [1, 4, 16][attempts - 1] minutes; after 3 attempts 'failed'. Twilio 21610, 21211, 21614 (check the current Twilio error docs for the codes meaning unsubscribed recipient, invalid To number and not a mobile number; use what the docs say): 'failed', error_code, and set staff_private.sms_opt_in = false.
  6. Email: render with React Email components from emails/ (shared with the Next.js app via a small build step, or plain HTML string templates in supabase/functions/_shared/templates.ts if that is simpler; tell me which you chose). sendEmail with dedupeKey 'notif:' + row.id, replyTo the first manager of the location. Status 'sent'. meter 'emails' quantity 1 costMicros 400.
  7. Invites: after a successful send, update payload = payload - 'token'.
- Never resend a row Twilio or Resend already accepted (status 'sent' rows are never claimed again).

Response: { ok, sent, skipped, deferred, failed, ms }. Log one line per batch, not per message.

Curl tests:
curl -X POST "https://<ref>.supabase.co/functions/v1/rt-notify" -H "x-cron-secret: <CRON_SECRET>"
Before it: publish a week with yourself as a staff member (your own phone, texts on). Expected: your phone gets one text that starts with the business name and fits one segment, your inbox one email, and in SQL:
select kind, channel, status, segments, error from public.notifications order by created_at desc limit 10;
select kind, quantity, cost_usd_micros from public.usage_ledger order by created_at desc limit 5;
Then set workspace_limit_overrides.sms_per_location = 0 and publish a change: the sms row is skipped with cap_reached and the email still arrives.

Plan first, then wait for my OK.`,
  },
  {
    name: 'rt-twilio-webhook',
    purpose: 'Receives Twilio delivery status callbacks and inbound STOP/START replies, verifies the X-Twilio-Signature, de-duplicates, and updates the outbox and opt-outs. Sends nothing.',
    trigger: 'Twilio status callback and inbound message webhook (POST, form-encoded)',
    secrets: ['TWILIO_AUTH_TOKEN'],
    prompt: `${shared}

Build supabase/functions/rt-twilio-webhook/index.ts. Read @PRD.md sections 12.2 and 16.5.

Contract:
- POST only, Content-Type application/x-www-form-urlencoded. Deploy with --no-verify-jwt (Twilio has no Supabase JWT).
- Build the public URL exactly as Twilio called it: 'https://' + <project ref> + '.supabase.co/functions/v1/rt-twilio-webhook' + the original query string (?kind=status or ?kind=inbound). Do not trust req.url's host. Read the form params with await req.formData().
- verifyTwilioSignature(publicUrl, params, req.headers.get('x-twilio-signature')). Mismatch or missing: 403, log 'bad_signature', change nothing.
- kind=status: params MessageSid, MessageStatus, ErrorCode (optional).
  - Insert twilio_events { id: MessageSid + ':' + MessageStatus }; on conflict return 200 (already handled).
  - Update notifications where provider_id = MessageSid: delivered sets status 'delivered', delivered_at now(); undelivered or failed sets status 'failed', error_code. For the permanent codes from rt-notify, set staff_private.sms_opt_in = false for that staff_id. Ignore queued/sent/accepted (no update).
- kind=inbound (US and Canada toll-free number): params From, Body, MessageSid.
  - keyword = Body.trim().toUpperCase(). STOP, STOPALL, UNSUBSCRIBE, CANCEL, END, QUIT: insert sms_opt_events { phone_e164: From, kind: 'stop', provider_id: MessageSid } (on conflict do nothing) and update staff_private set sms_opt_in = false, sms_opted_out_at = now() where phone_e164 = From. START, UNSTOP: event 'start' only (texting comes back when the person switches it on in the app). HELP, INFO: event 'help'. Anything else: ignore.
  - Twilio's default opt-out handling sends the STOP/HELP replies, so do not reply. Return '<Response></Response>' with Content-Type text/xml.
- Always answer within 1 second. Status 200 for everything that passed the signature check, even unknown sids (log 'unknown_sid').

Curl tests (signature):
1. Ask me for TWILIO_AUTH_TOKEN, then write scripts/sign-twilio.ts that prints the X-Twilio-Signature for a URL and params, so we can curl:
curl -X POST "https://<ref>.supabase.co/functions/v1/rt-twilio-webhook?kind=status" -H "X-Twilio-Signature: <sig>" --data-urlencode "MessageSid=SMtest123" --data-urlencode "MessageStatus=delivered"
Expected 200 and the notification with provider_id SMtest123 (create one first) becomes delivered. Same request again: 200, nothing changes, one twilio_events row.
2. The same request with a wrong signature: 403.
3. Real test: in the Twilio Console > Monitor > Logs > Messaging, open the last message you sent and check its status callback shows 200.

Plan first, then wait for my OK.`,
  },
  {
    name: 'rt-swap',
    purpose: 'Every swap, cover and open shift action from staff and managers, with eligibility and conflict checks, compare-and-set state changes, auto-publish on approval and the right notifications.',
    trigger: 'Called by the browser from the staff app and the Requests inbox (staff or manager JWT)',
    secrets: ['APP_URL'],
    prompt: `${shared}

Build supabase/functions/rt-swap/index.ts. Read @PRD.md sections 9.3, 9.4 and 16.6.

Contract:
- POST JSON, zod discriminated union on action: request_swap, request_cover, offer_cover, respond, decide, cancel, claim_open, withdraw_claim, decide_claim (fields as in @PRD.md 16.6).
- requireUser. Resolve the workspace from the shift or request. requireAccess. Rate limit try_rate_limit('swap:' + userId, 30, 3600).
- Staff actions: the caller's staff id = rpc('my_staff_id', { ws }) through userClient. Manager actions: requireManager(location_id).

Rules:
- Only published shifts (status 'published') that start more than 2 hours from now can be swapped, covered or claimed.
- Eligible = active staff, linked to the shift's location in staff_locations, holding the shift's role in staff_roles.
- request_swap: the caller owns shift_id; to_shift_id belongs to an eligible colleague at the same location; each holds the other's role. expires_at = least(both starts) - 2 hours. Insert pending_peer (the unique index refuses a second live request on the same shift: map 23505 to 409 'already_requested'). Notify the colleague: notifications kind 'swap_request' sms + email, dedupe 'swap_request:' + id + ':' + channel.
- request_cover: with to_staff_id: same as swap without to_shift_id. Without: status pending_manager, notify managers (kind 'cover_needed', email, to_user_id each manager) and eligible staff (kind 'open_shift', email).
- offer_cover: on a pending_manager cover with no to_staff_id, set to_staff_id where to_staff_id is null (compare-and-set; 409 'already_handled' if 0 rows).
- respond: caller is to_staff_id, status pending_peer. Accept: pending_manager (notify managers by email), or straight to the approve path of decide when locations.swaps_need_approval is false and the checks pass; decline: 'declined' (notify requester 'swap_decision').
- decide: manager. Approve: build the week(s) with the change applied in memory and run conflicts.checkWeek for both people; any 'block' returns 422 with the reason. Then with the admin client: update shifts (swap: exchange staff_id between shift_id and to_shift_id; cover: shift.staff_id = to_staff_id), update the request to approved with decided_by, decided_at (where status = 'pending_manager'). Then if the week has no other unpublished edits (no draft shift in the week other than the ones you changed, and none cancelled-unpublished), call rpc('publish_rota_week') so the change is final and both people hear about it; else return { needs_publish: true } and the UI shows "Swap approved. Publish changes to send it with your other edits." Queue 'swap_decision' to both people either way.
- cancel: requester, from pending_peer or pending_manager to cancelled.
- claim_open: eligible staff, shift has staff_id null, no clash with their own published shifts (conflicts.checkWeek). Insert open_shift_claims (unique per shift + staff: 409 if repeated). If locations.auto_approve_claims is true and the claim is the first, approve it immediately as decide_claim would.
- decide_claim: manager; approve sets shift.staff_id where staff_id is null (compare-and-set), claim approved, other pending claims declined, publish as above, and 'claim_decision' to every claimant.
- Every status change is update ... where id = $1 and status = $expected returning *; zero rows = 409 { code: 'already_handled' }.

Response: { ok: true, swap } | { ok: true, claim } | { ok: true, needs_publish: true }.
Log { fn, action, ok, ms }.

Curl tests (use two staff JWTs A and B and a manager JWT M, in the same location):
1. A: {"action":"request_swap","shift_id":"<A shift>","to_shift_id":"<B shift>"} -> pending_peer.
2. B: {"action":"respond","swap_id":"<id>","accept":true} -> pending_manager.
3. M: {"action":"decide","swap_id":"<id>","approve":true} -> approved; the shifts now show swapped staff ids, and two swap_decision notifications exist.
4. Repeat step 3: 409 already_handled.
5. A staff member from another workspace calling respond on this id: 403.

Plan first, then wait for my OK.`,
  },
  {
    name: 'rt-clock',
    purpose: 'Clocks staff in and out from their phone with an idempotency key, works out the distance to the venue on the server and applies the location geofence mode (off, flag or require).',
    trigger: 'Called by the browser from the staff Clock screen (staff JWT, Idempotency-Key header)',
    secrets: [],
    prompt: `${shared}

Build supabase/functions/rt-clock/index.ts. Read @PRD.md sections 9.6, 13 and 16.7.

Contract:
- POST { action: 'in' | 'out', location_id: uuid, lat?: number -90..90, lng?: number -180..180, accuracy?: number 0..100000, shift_id?: uuid, break_minutes?: int 0..240 }. zod. Header Idempotency-Key: a uuid (400 if missing).
- requireUser. Load the location (and its workspace) with the admin client. staffId = rpc('my_staff_id', { ws }) through userClient; 403 'not_staff_here' unless staff_locations has (staffId, location_id). requireAccess.
- Rate limit try_rate_limit('clock:' + userId, 10, 60).
- Idempotency: if time_entries has this idempotency_key, return that entry with 200 (for 'in'). For 'out', store the key in the response cache only: re-sending the same 'out' returns the closed entry.

in:
- 409 { code: 'already_in', entry } if the person has an open entry (the unique index also guarantees this; map 23505 to the same response).
- Shift: shift_id if given and it is the caller's published shift here; else the caller's published shift here with starts_at - clock_in_early_minutes <= now() <= ends_at; else null (unscheduled). If shift_id was given but now is earlier than the window: 409 { code: 'too_early', opens_at }.
- Geofence: if location.lat/lng are set and lat/lng were sent, distance = rpc('distance_m') or the same haversine in TS (test both agree within 1 m). effective = distance - min(accuracy ?? 0, 100).
  - mode 'off': accept, flag false.
  - mode 'flag': accept; flag = no coordinates OR effective > radius OR accuracy > 500.
  - mode 'require': no coordinates or effective > radius (and accuracy <= 500): 403 { code: 'outside_geofence', distance_m: round(distance) }. accuracy > 500: accept with flag true.
- Insert time_entries { workspace_id, location_id, staff_id, shift_id, clock_in_at: now(), in_lat, in_lng, in_accuracy_m, in_distance_m, geofence_flag, status 'open', idempotency_key }.

out:
- The caller's open entry (404 'not_clocked_in' if none). clock_out_at = now(); break_minutes = given or the shift's break_minutes or 0; out_* coordinates and distance; if out of range in 'flag' or 'require' mode set geofence_flag true (never refuse a clock-out); status 'submitted'.

Response: { entry, distance_m, flagged }. Never return the venue's exact coordinates to staff, only the distance.
Log { fn, action, flagged, ms } (no coordinates).

Curl tests:
curl -X POST "https://<ref>.supabase.co/functions/v1/rt-clock" -H "Authorization: Bearer <STAFF_JWT>" -H "Idempotency-Key: $(uuidgen)" -H "Content-Type: application/json" -d '{"action":"in","location_id":"<uuid>","lat":51.5246,"lng":-0.0786,"accuracy":20}'
1. With the location set to require and 150 m, coordinates 2 km away: 403 outside_geofence with distance_m about 2000.
2. Coordinates at the venue: 200, flagged false.
3. The same request with the same Idempotency-Key: 200 with the same entry id, and select count(*) from public.time_entries where staff_id = '<id>' and clock_out_at is null; is 1.
4. A staff member of another location: 403 not_staff_here.

Plan first, then wait for my OK.`,
  },
  {
    name: 'rt-timesheet-export',
    purpose: 'Builds a payroll CSV for a location and period with a CSV-injection guard, stores it in the private exports bucket and returns a 10 minute signed link.',
    trigger: 'Called by the browser from Timesheets > Export CSV (manager JWT)',
    secrets: [],
    prompt: `${shared}

Build supabase/functions/rt-timesheet-export/index.ts. Read @PRD.md sections 13.2, 14 and 16.8.

Contract:
- POST { location_id: uuid, period_start: 'YYYY-MM-DD', period_end: 'YYYY-MM-DD', include_submitted?: boolean }. zod; period_end >= period_start and at most 62 days apart (400 otherwise).
- requireUser, requireManager(location_id), requireAccess. Rate limit try_rate_limit('export:' + userId, 20, 3600).
- Query with the admin client in one SQL statement (an RPC or a view is fine): time_entries for the location where clock_in_at falls inside the period in the location's time zone and status = 'approved' (or also 'submitted' when include_submitted), joined to staff (full_name), staff_private (payroll_id, hourly_rate_cents), shifts (role, scheduled times, break), job_roles (name, default_rate_cents), locations (name, timezone), workspaces (currency).
- Build rows in the exact column order of @PRD.md 14. paid_hours = (clock_out - clock_in) - break_minutes, 2 decimals. gross_pay = paid_hours * rate / 100, 2 decimals. flags = semicolon-joined: late_<n>min (clock-in more than 5 minutes after scheduled start), early_leave_<n>min, unscheduled, away_from_venue, auto_closed.
- CSV writer: UTF-8 with BOM, CRLF line ends, every cell quoted, inner quotes doubled, and any cell starting with =, +, -, @, tab or carriage return prefixed with a single quote. Write deno tests for the guard (=HYPERLINK, +1, -2, @SUM, a name with a quote and a comma).
- More than 50,000 rows: 413 "That's more than 50,000 rows. Pick a shorter period."
- Upload to bucket 'exports' at <workspace_id>/<location_id>/<period_start>_<period_end>_<unix>.csv with contentType 'text/csv; charset=utf-8'. Insert timesheet_exports { workspace_id, location_id, period_start, period_end, storage_path, row_count, created_by }.
- createSignedUrl(path, 600). Return { url, rows }.

Log { fn, location_id, rows, ms }.
Curl test:
curl -X POST "https://<ref>.supabase.co/functions/v1/rt-timesheet-export" -H "Authorization: Bearer <MANAGER_JWT>" -H "Content-Type: application/json" -d '{"location_id":"<uuid>","period_start":"2026-10-01","period_end":"2026-10-31"}'
Expected { "url": "https://...", "rows": N }. Download it: it opens in Excel and Google Sheets with the header row first. A staff JWT returns 403. A 90 day period returns 400.

Plan first, then wait for my OK.`,
  },
]
