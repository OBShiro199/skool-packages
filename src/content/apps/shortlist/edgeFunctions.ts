// Shortlist edge functions: one Claude Code prompt per function.
import type { EdgeFunctionDef } from '../../types'

const shared = `First, if supabase/functions/_shared/ does not exist yet, create these helpers (read @PRD.md section 13 intro):
1. admin.ts: adminClient() with Deno.env.get('SUPABASE_URL') and Deno.env.get('SUPABASE_SECRET_KEY') (fall back to SUPABASE_SERVICE_ROLE_KEY), auth: { persistSession: false }. userClient(jwt) with the publishable key and the user's Authorization header, so auth.uid() works inside RPCs.
2. auth.ts: requireUser(req) reads the Bearer token, calls supabase.auth.getClaims(token), returns { userId, email, jwt } or throws HttpError(401). requireMember(jwt, ws, roles?) calls is_workspace_member / has_workspace_role through userClient(jwt) and throws 403. requireAccess(ws) calls has_active_access with the admin client and throws 402 { code: 'paused' }. requireCron(req) compares x-cron-secret with CRON_SECRET in constant time (timingSafeEqual on equal-length Uint8Arrays; different length = mismatch).
3. http.ts: HttpError(status, code, message), json(body, status), CORS headers for APP_URL and http://localhost:3000, an OPTIONS handler. Error body: { error: { code, message } }.
4. log.ts: log(fn, data) prints one JSON line. Ids, counts and timings only. Never CV text, answers, names, emails, tokens or API keys.
5. retry.ts: withRetry(fn, { tries: 3, baseMs: 800 }) with exponential backoff + jitter, honours retry-after, retries only 429 and 5xx.
6. limits.ts: checkLimit(ws, kind, qty) reads plan_limits(ws) and usage_this_month(ws, kind) and throws HttpError(402, 'limit_reached', "You have used X of Y ... this month.").
7. meter.ts: meter({ ws, userId, kind, quantity, costMicros, refId, idempotencyKey }) inserts usage_ledger with on conflict (idempotency_key) do nothing.
8. tokens.ts: newToken() = 32 random bytes, base64url, no padding (43 chars). sha256Hex(text|bytes). hmacSign(payload, secret) and hmacVerify with crypto.subtle (SHA-256), constant-time compare.
9. crypto.ts: encrypt(plain) and decrypt(cipher) with AES-256-GCM, key = base64-decoded TOKEN_ENCRYPTION_KEY (32 bytes), random 12 byte IV, output base64url(iv || ciphertext). 3 deno tests: round trip, tampered cipher throws, wrong key throws.
10. ip.ts: ipHash(req) = sha256Hex(first x-forwarded-for IP + IP_HASH_SALT + YYYY-MM-DD).
11. email.ts: enqueue({ ws, kind, to, applicationId?, userId?, data, sendAfter?, dedupeKey }) inserts email_outbox with on conflict (dedupe_key) do nothing.
Then build the function below.`

export const edgeFunctions: EdgeFunctionDef[] = [
  {
    name: 'sl-apply',
    purpose: 'Takes a public job application in two steps: validates the form and hands back a signed CV upload link, then checks the uploaded file, activates the application, queues the AI summary and the confirmation email.',
    trigger: 'Called by the public job page form (no login, --no-verify-jwt)',
    secrets: ['APP_URL', 'IP_HASH_SALT', 'CRON_SECRET'],
    prompt: `${shared}

Build supabase/functions/sl-apply/index.ts. Read @PRD.md sections 9.2 (rule 7), 10 and 13.1 first.

Contract:
- POST only, JSON body with action 'start' or 'finish'. CORS for APP_URL only. Deploy with --no-verify-jwt.
- action 'start': zod schema { company, job, first_name (1-80), last_name (1-80), email (email, lower-case, trim), phone? (max 30), location? (max 120), linkedin_url? (must start https://www.linkedin.com/ or https://linkedin.com/), cover_letter? (max 8000), answers (record), ai_opt_out (bool), talent_pool_consent (bool), privacy_ack (literal true), cv { name, size (1024 to 10485760), type ('application/pdf' | 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') }, hp (string), elapsed_ms (number) }.
  - Bot traps: if hp is not empty or elapsed_ms < 3000, return 200 { application_id: crypto.randomUUID(), upload: null, submit_token: 'x' } and do nothing else.
  - Rate limits with rpc try_rate_limit: 'apply:ip:'+ipHash 8 per 3600 s, 'apply:email:'+email 5 per 86400 s. 429 { code: 'rate_limited', message: 'Too many applications from here. Try again in an hour.' }.
  - Load the workspace by slug and the job by (workspace_id, slug) with the admin client. Job must be 'open' and has_active_access(ws) true, else 404 { code: 'not_open' }.
  - Validate answers against job_questions (not archived): required present and non-empty; single_select value in options; multi_select every value in options; yes_no boolean; number numeric; url starts https://; text max 2000 chars. Drop keys that are not question ids.
  - Hard cap: usage_this_month(ws,'applications') >= plan_limits(ws).applications: 409 { code: 'job_full', message: 'This role is not taking more applications this month.' } and enqueue one notification per day for owners (dedupe 'full:<ws>:<date>', kind 'ai_cap_warning' email is fine).
  - Upsert candidates on (workspace_id, lower(email)): use select then insert or update, updating names, phone, location, linkedin_url. If talent_pool_consent, set talent_pool_until = today + workspace.talent_pool_days.
  - If an application for (job, candidate) exists: if its state is 'uploading' reuse it (new submit token, new upload URL); otherwise 409 { code: 'already_applied', message: 'You have already applied for this role.' }.
  - Insert the application: state 'uploading', answers, cover_letter, ai_opt_out, talent_pool_consent, privacy_ack_at now, ip_hash, source from the query param ?src (max 60, default 'careers_page'), submit_token_hash = sha256Hex(token).
  - path = ws/job/app/cv.pdf or cv.docx. storage.from('cvs').createSignedUploadUrl(path). Save cv_path and cv_mime.
  - Return { application_id, upload: { path, token }, submit_token }.
- action 'finish': zod { application_id: uuid, submit_token: string }.
  - Load the application with the admin client; sha256Hex(submit_token) must equal submit_token_hash (constant-time) else 403. If state is already 'active' return 200 { ok: true } (idempotent).
  - Download the object (storage.from('cvs').download(path)). Missing: 404 { code: 'file_missing' }. Check magic bytes: PDF starts with %PDF (25 50 44 46), DOCX starts with PK (50 4B). Size under 10 MB. Wrong: remove the object and the application, 422 { code: 'bad_file', message: 'That file is not a PDF or Word document. Try exporting it again.' }.
  - Update: state 'active', applied_at now, cv_bytes, cv_sha256, submit_token_hash null.
  - meter({ ws, kind: 'applications', quantity: 1, refId: app, idempotencyKey: 'apply:'+app }).
  - rpc request_screen(app) with the admin client (it handles opt-out, workspace AI switch and the cap).
  - enqueue application_received to the candidate, dedupe 'received:'+app, data { job_title, candidate_first_name, company_name, reply_days: 10 }.
  - Insert notifications kind 'new_applicant' for owners, admins and job_members of the job (in-app only).
  - Fire and forget: fetch(SUPABASE_URL + '/functions/v1/sl-screen-worker', { method: 'POST', headers: { 'x-cron-secret': CRON_SECRET } }) without awaiting the body (catch and ignore errors).
  - Return { ok: true }.
- Log { fn, action, ws, job, app, ms, outcome } only.

Also build the browser side in components/careers/ApplyForm.tsx: call 'start', then supabase.storage.from('cvs').uploadToSignedUrl(upload.path, upload.token, file) with a progress bar (XHR or the SDK's progress if available), then 'finish', then router.push to the applied page. Keep the button width fixed while loading (DESIGN.md section 8).

Curl tests (replace values; the job must be open):
curl -s -X POST "https://<ref>.supabase.co/functions/v1/sl-apply" -H "Content-Type: application/json" -d '{"action":"start","company":"acme-test","job":"ops-lead","first_name":"Ana","last_name":"Silva","email":"ana@example.com","answers":{},"ai_opt_out":false,"talent_pool_consent":false,"privacy_ack":true,"cv":{"name":"cv.pdf","size":120000,"type":"application/pdf"},"hp":"","elapsed_ms":9000}'
Expected: {"application_id":"...","upload":{"path":"...","token":"..."},"submit_token":"..."}.
The same call again with "privacy_ack":false returns 400. With a closed job returns 404 not_open.

Plan first, then wait for my OK.`,
  },
  {
    name: 'sl-screen-worker',
    purpose: 'Claims queued AI summary jobs, extracts and redacts the CV text, calls claude-haiku-5-5 with the screening prompt and JSON schema, checks every quote against the CV, saves the summary and meters the cost. Never changes a stage.',
    trigger: 'pg_cron every minute, plus a kick from sl-apply (x-cron-secret)',
    secrets: ['ANTHROPIC_API_KEY', 'CRON_SECRET'],
    prompt: `${shared}

Build supabase/functions/sl-screen-worker/index.ts plus _shared/claude.ts, _shared/extract.ts and _shared/redact.ts. Read @PRD.md section 9 in full (every rule there is required) and 13.2.

_shared/claude.ts: callClaude({ system, userContent, schema, maxTokens }) using npm:@anthropic-ai/sdk, model 'claude-haiku-5-5', the system prompt as a text block with cache_control { type: 'ephemeral' }, output_config { format: { type: 'json_schema', schema } }, no tools. Check the current Claude docs for structured outputs on Haiku 5.5 before writing; if output_config.format is not supported for this model, use one tool 'record_summary' with the schema as input_schema and tool_choice { type: 'tool', name: 'record_summary' }, and tell me which you used. stop_reason 'refusal' throws HttpError(422, 'ai_refused'); 'max_tokens' throws HttpError(502, 'ai_truncated'). Return { data, usage, costMicros } where costMicros = round(input_tokens*0.10 + (cache_read_input_tokens||0)*0.01 + (cache_creation_input_tokens||0)*0.125 + output_tokens*0.50). Throw if input_tokens > 100000 (pricing tier changes there; we keep inputs under 60,000).

_shared/extract.ts: extractText(bytes, mime) returns { text, scanned }. PDF: npm:unpdf extractText(new Uint8Array(bytes), { mergePages: true }). DOCX: npm:mammoth extractRawText({ arrayBuffer }). If either import fails in Deno, tell me and suggest the closest Deno-compatible package; do not silently skip. scanned = PDF with under 200 characters of text. Normalise whitespace, cap at 24,000 characters (set truncated).

_shared/redact.ts: redact(text, { firstName, lastName }) returns { text, count } exactly per PRD 9.3 (names as whole words case-insensitive, emails, phones, URLs and linkedin/github handles to [link], UK postcodes, address lines, and whole lines starting with the listed personal-detail words). 8 deno tests including: name inside an email is redacted once, "Python" is not touched when the name is "Py", a line "Date of birth: 02/03/1990" disappears, a UK postcode "SW1A 1AA" is redacted.

Worker contract:
- POST, requireCron, deploy with --no-verify-jwt.
- rpc release_stuck(), then rpc claim_screen_jobs(5). Process in chunks of 3 with Promise.allSettled.
- For each job:
  1. Load application (with candidate first/last name), job, criteria (not archived, by position) and workspace with the admin client. If the application is gone or ai_opt_out or workspace.ai_enabled is false: mark the job done, set ai_status 'opted_out' or 'disabled', continue.
  2. checkLimit(ws, 'ai_screens', 1). On limit: ai_status 'paused_cap', job done, insert one 'ai_cap' notification for owners (skip if one exists this month). If usage is at or above 80% of the cap, enqueue ai_cap_warning to the owner with dedupe 'aicap80:'+ws+':'+YYYYMM.
  3. Set ai_status 'running'. Download the CV, extractText, redact the text, the cover letter and the free-text answers.
  4. Local injection pre-check on the raw text (regex from PRD 9.4). Build the system prompt and user message exactly as PRD 9.4, with criteria ids. If scanned, send the PDF as a document block (base64) instead of <cv> text and append the scanned-PDF instruction to the system prompt.
  5. callClaude inside withRetry. Validate with zod mirroring the JSON schema.
  6. Post-checks: add missing criterion ids as 'unclear' with note 'Not assessed'; drop unknown ids; verify each evidence quote is a substring of the normalised redacted CV text (lower case, collapsed spaces, curly quotes to straight); drop unverified quotes; a 'meets' or 'partly' with no quotes left becomes 'unclear'; count quotes_dropped. Scan summary, strengths and probe questions for the banned words list in PRD 9.4: if found, replace the summary with the hidden text and set flags.summary_hidden. Merge local injection flag into flags.injection_suspected. Add flags.scanned_pdf and flags.truncated.
  7. Upsert ai_screens on (application_id, criteria_version) with results (each item also carries the criterion label), summary, strengths, probe_questions, flags, redactions, model 'claude-haiku-5-5', prompt_version 'screen-v1', tokens and cost.
  8. meter({ ws, kind: 'ai_screens', quantity: 1, costMicros, refId: app, idempotencyKey: 'screen:'+app+':'+criteria_version }).
  9. ai_status 'done', job status 'done'.
- On error: if attempts < 4 set job 'queued' with run_after = now + [1, 5, 30] minutes by attempt and last_error = the error code only; else job 'dead' and application ai_status 'failed'. 'ai_refused' fails at once (no retry).
- Return { processed, failed }. Log { fn, app, ms, in_tokens, out_tokens, outcome } only. Never log CV text or AI output.

Curl test:
curl -s -X POST "https://<ref>.supabase.co/functions/v1/sl-screen-worker" -H "x-cron-secret: <CRON_SECRET>"
Expected: {"processed":1,"failed":0} after one application. Then in SQL: select summary, redactions, flags, cost_usd_micros from ai_screens order by created_at desc limit 1; The summary has no candidate name, redactions >= 3, cost under 3000 micro-dollars. Without the header the call returns 401.

Plan first, then wait for my OK.`,
  },
  {
    name: 'sl-email-worker',
    purpose: 'Sends due emails from email_outbox through Resend: renders the workspace templates for candidates and fixed templates for the team, skips suppressed addresses, retries with backoff and logs every send.',
    trigger: 'pg_cron every minute (x-cron-secret)',
    secrets: ['RESEND_API_KEY', 'EMAIL_FROM_DOMAIN', 'APP_URL', 'CRON_SECRET'],
    prompt: `${shared}

Build supabase/functions/sl-email-worker/index.ts and _shared/render.ts. Read @PRD.md sections 8 (placeholders), 13.3 and 16, and @DESIGN.md section 13.

Contract:
- POST, requireCron, --no-verify-jwt. rpc claim_outbox(25).
- For each row:
  - If lower(to_email) is in email_suppressions: status 'suppressed', continue.
  - Candidate kinds (application_received, interview_invite, interview_confirmed, interview_reminder, interview_cancelled, rejection): load the workspace's email_templates row for the kind, the workspace, and (if application_id) the application, candidate and job. Build the data map from the row's data plus: candidate_first_name, job_title, company_name, sender_name, privacy_line ("Your data is kept for N days after this process ends. To see or delete it: APP_URL/privacy/<slug>"). Render {{placeholders}}: HTML-escape every value in the HTML version, unknown placeholders become empty.
  - Privacy kinds (privacy_verify, privacy_export, privacy_deleted) and team kinds (team_invite with APP_URL/invite/<token>, mention with a link to APP_URL/app/jobs/<job>?app=<app>, applicant_digest, scorecard_due, calendar_disconnected, ai_cap_warning, retention_upcoming, privacy_request_new): fixed templates in _shared/render.ts, plain and kind, one button each.
  - Rejection safety: before sending a rejection, re-load the application; if its stage is no longer 'rejected', set status 'cancelled' and continue (undo race).
  - From: '"<sender_name> via Shortlist" <jobs@' + EMAIL_FROM_DOMAIN + '>' for candidate and privacy kinds, 'Shortlist <team@' + EMAIL_FROM_DOMAIN + '>' for team kinds. Reply-To: workspace.reply_to_email for candidate kinds.
  - POST https://api.resend.com/emails with headers Authorization: Bearer RESEND_API_KEY, Content-Type: application/json, Idempotency-Key: the outbox id. Body { from, to: [to_email], reply_to, subject, html, text, tags: [{ name: 'kind', value: kind }] }. Check Resend's API reference for the idempotency header name before writing; if it is not supported, rely on our own dedupe and tell me.
  - 200: insert email_log (workspace_id, outbox_id, application_id, kind, to_email, resend_id = response.id, status 'sent'), outbox status 'sent'.
  - 429 or 5xx: status 'queued', send_after = now + 2^attempts minutes, last_error = status code. 4xx (other) or attempts >= 5: status 'failed', last_error = the Resend error name only.
- Return { sent, failed, suppressed, cancelled }. Log counts only.

Curl test:
insert into email_outbox (kind, to_email, data, dedupe_key) values ('privacy_verify', 'YOUR_EMAIL', '{"link":"https://example.com"}', 'test-1');
curl -s -X POST "https://<ref>.supabase.co/functions/v1/sl-email-worker" -H "x-cron-secret: <CRON_SECRET>"
Expected: {"sent":1,...} and the email in your inbox. Run it again: {"sent":0} (no double send).

Plan first, then wait for my OK.`,
  },
  {
    name: 'sl-google-oauth',
    purpose: 'Connects an interviewer\'s Google Calendar: builds the consent URL with a signed state, handles Google\'s redirect, encrypts and stores the refresh token, and disconnects (revokes) on request.',
    trigger: 'Called by the app (user JWT) to start or disconnect; Google redirects back to it (signed state, --no-verify-jwt)',
    secrets: ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'OAUTH_STATE_SECRET', 'TOKEN_ENCRYPTION_KEY', 'APP_URL'],
    prompt: `${shared}

Build supabase/functions/sl-google-oauth/index.ts and _shared/google.ts. Read @PRD.md sections 12 and 13.4.

Contract (deploy with --no-verify-jwt; this function checks the JWT itself where needed):
- GET ?action=start with Authorization: Bearer <user JWT>: requireUser, read profiles.current_workspace_id, requireMember. state = base64url(JSON { ws, uid, nonce: newToken(), exp: now + 600 }) + '.' + hmacSign(that, OAUTH_STATE_SECRET). Return { url } where url = https://accounts.google.com/o/oauth2/v2/auth?client_id=GOOGLE_CLIENT_ID&redirect_uri=SUPABASE_URL/functions/v1/sl-google-oauth&response_type=code&scope=openid email https://www.googleapis.com/auth/calendar.freebusy https://www.googleapis.com/auth/calendar.events&access_type=offline&prompt=consent&include_granted_scopes=true&state=... (URL-encode every value).
- GET ?code=...&state=... (from Google): verify the HMAC (constant time) and exp. Errors redirect to APP_URL/app/settings?tab=calendar&calendar=error&reason=<code> (never show a JSON error to the user). POST https://oauth2.googleapis.com/token (application/x-www-form-urlencoded) with code, client_id, client_secret, redirect_uri, grant_type=authorization_code. Require refresh_token (missing: reason no_refresh, tell the user to remove Shortlist at myaccount.google.com/permissions and connect again). Check the returned scope string contains both calendar scopes (else reason missing_scope). Decode the id_token payload (base64url JSON, no need to verify the signature here because it came from Google over TLS on the token endpoint) for email.
- Upsert calendar_connections (workspace_id, user_id, google_email, status 'active', scopes, last_error null, connected_at now). Upsert calendar_tokens with refresh_token_cipher = encrypt(refresh_token), access_token_cipher = encrypt(access_token), access_expires_at = now + expires_in - 60 s. Redirect 302 to APP_URL/app/settings?tab=calendar&calendar=connected.
- POST { action: 'disconnect' } with user JWT: decrypt the refresh token, POST https://oauth2.googleapis.com/revoke?token=..., ignore a 400 (already revoked), delete calendar_connections (cascades tokens). Return { ok: true }.

_shared/google.ts:
- getAccessToken(ws, userId): read calendar_tokens; if access_expires_at is in the future return the decrypted access token; else POST the token endpoint with grant_type=refresh_token. On error 'invalid_grant': set calendar_connections.status 'revoked' with last_error 'invalid_grant', insert a 'calendar_disconnected' notification and enqueue calendar_disconnected email (dedupe 'caldis:'+user+':'+date), throw HttpError(409, 'calendar_revoked'). Save the new access token encrypted.
- freeBusy(token, timeMin, timeMax): POST https://www.googleapis.com/calendar/v3/freeBusy { timeMin, timeMax, items: [{ id: 'primary' }] }, return calendars.primary.busy (array of { start, end }); throw on errors[].
- insertEvent(token, body, requestId) and deleteEvent(token, eventId) as in @PRD.md section 12 (conferenceDataVersion=1 and sendUpdates=all on insert, sendUpdates=all on delete; a 410 on delete counts as done).
All Google calls use withRetry.

Test:
1. In the app, Settings > Calendar > Connect Google Calendar. You land back with "Connected as you@...".
2. SQL: select google_email, status, scopes from calendar_connections; select length(refresh_token_cipher) > 40 from calendar_tokens; The token is not readable as plain text.
3. curl -s "https://<ref>.supabase.co/functions/v1/sl-google-oauth?code=x&state=forged.sig" -i | grep -i location. Expected: a redirect with calendar=error&reason=bad_state.

Plan first, then wait for my OK.`,
  },
  {
    name: 'sl-booking',
    purpose: 'Creates interview booking links, computes free slots across every interviewer\'s Google Calendar, books the chosen slot with a Google Meet link, and handles moves and cancellations.',
    trigger: 'Admin app (user JWT) for create and cancel; public booking page (token) for slots, book, move and cancel',
    secrets: ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'TOKEN_ENCRYPTION_KEY', 'APP_URL', 'IP_HASH_SALT'],
    prompt: `${shared}

Build supabase/functions/sl-booking/index.ts and _shared/slots.ts. Read @PRD.md sections 11.4, 12 and 13.5, and @DESIGN.md section 8 (booking page states).

_shared/slots.ts (pure function, 10 deno tests): computeSlots({ windowStart, windowEnd, durationMin, minNoticeHours, now, interviewers: [{ timezone, workingHours, bufferMin, maxPerDay, busy: [{start,end}], bookedPerDay: { 'YYYY-MM-DD': n } }] }) returns [{ start, end }] in UTC ISO, 15 minute steps, max 60. Use Temporal if available in the Deno runtime, else npm:luxon for time zones. Tests must include: a DST change week in Europe/London, two interviewers in London and New York (only the overlap remains), a busy block padded by the buffer, max per day reached, min notice excludes today's morning.

Contract (deploy with --no-verify-jwt; JWT checked inside for admin actions):
- POST { action: 'create', application_id, title, duration_minutes, mode, location_text?, interviewer_ids (1-4), window_start, window_end, min_notice_hours } with user JWT: requireUser, load the application, rpc can_manage_job through userClient (403 if false), requireAccess. Each interviewer must be a job member or owner/admin and have calendar_connections.status 'active' (409 { code: 'calendar_missing', message: 'Connect Google Calendar first: Sam, Priya.' }). organiser = caller if connected else first interviewer. token = newToken(); insert interview_requests with token_hash, expires_at = window_end + 1 day. If the application stage is applied or screen, call rpc move_application(app, 'interview') through userClient. enqueue interview_invite (dedupe 'invite:'+request_id+':'+reschedules) with booking_link APP_URL/book/<token>, duration, interview_title, expires_on. Return { request_id, link }.
- POST { action: 'slots', token, tz }: rate limit 'book:'+ipHash 30 per 600 s. Find the request by sha256Hex(token). Not found or expired or cancelled: 404 { code: 'link_invalid' }. If booked: return { booked: { starts_at, ends_at, meet_url, mode, location_text } }. Else for each interviewer: getAccessToken, freeBusy over the window (in-memory cache per interviewer for 60 s), count their scheduled interviews per day; computeSlots. Return { company: { name, logo_path }, job_title, title, duration, mode, interviewer_first_names, slots }.
  If any interviewer's calendar is revoked: return 200 { slots: [], unavailable: true } (the page shows "Times are not available right now. The team has been told.").
- POST { action: 'book', token, start, tz }: take the booking mutex with rpc claim_booking(sha256Hex(token)) (it sets booking_lock_until = now + 30 s and returns the row only if nobody holds it; no row: 409 { code: 'busy_try_again' }), and always call rpc release_booking(request_id) in a finally block. The unique index interviews_one_live_per_request_idx is the last line of defence: on a 23505 return the existing interview. Same start as an existing scheduled interview for this request: return it (idempotent). Recompute slots for that day only and require start in them, else 409 { code: 'slot_taken', slots }. Re-check freeBusy for [start, end] for every interviewer. Insert the Google event on the organiser's calendar (summary "<title>: <candidate first name> <last initial> (<job title>)", description with the candidate's booking link, attendees all interviewers' google_email + candidate email, conferenceData createRequest with requestId request_id + '-' + reschedules for google_meet, location for onsite). Insert interviews (google_event_id, meet_url from hangoutLink), request status 'booked' and candidate_tz = tz. enqueue interview_confirmed (dedupe 'confirmed:'+interview_id), insert 'interview_booked' notifications for interviewers. Return { booked }.
- POST { action: 'cancel', token?, request_id?, reschedule: boolean, reason? }: with token (candidate) or JWT + can_manage_job (admin). deleteEvent on the organiser's calendar, interview 'cancelled'. Candidate reschedule and reschedules < 2: request 'pending', reschedules + 1, return { ok: true, slots_url }. Otherwise request 'cancelled'; enqueue interview_cancelled to the candidate (admin cancel) or notify interviewers (candidate cancel).
- Errors use the codes above. Log { fn, action, request, ms, outcome } only.

Curl tests:
1. Create (admin JWT): curl -s -X POST "https://<ref>.supabase.co/functions/v1/sl-booking" -H "Authorization: Bearer <ADMIN_JWT>" -H "Content-Type: application/json" -d '{"action":"create","application_id":"<uuid>","title":"First interview","duration_minutes":45,"mode":"google_meet","interviewer_ids":["<your user id>"],"window_start":"2026-10-20","window_end":"2026-10-31","min_notice_hours":24}'  Expected: {"request_id":"...","link":".../book/..."}.
2. Slots: curl -s -X POST ... -d '{"action":"slots","token":"<token from the link>","tz":"Europe/London"}'  Expected: a slots array with no slot inside your busy blocks.
3. Book twice with the same start: both return the same interview id, and only one Google event exists.
4. Slots with a random token: 404 link_invalid.

Plan first, then wait for my OK.`,
  },
  {
    name: 'sl-scheduler',
    purpose: 'Runs every 15 minutes: interview reminders 24 hours before, completes past interviews, nudges interviewers for missing scorecards, expires stale booking links and sends the 08:00 applicant digest.',
    trigger: 'pg_cron every 15 minutes (x-cron-secret)',
    secrets: ['CRON_SECRET', 'APP_URL'],
    prompt: `${shared}

Build supabase/functions/sl-scheduler/index.ts. Read @PRD.md sections 13.6 and 16.

Contract:
- POST, requireCron, --no-verify-jwt. Each step is independent: one failing step is logged and the others still run. Return { reminders, completed, nudges, expired, digests }.
1. Reminders: interviews with status 'scheduled', starts_at between now + 23 h and now + 25 h, reminder_sent_at null: enqueue interview_reminder (dedupe 'remind:'+id) with interview_time in the candidate's time zone (interview_requests.candidate_tz, which sl-booking sets on book), set reminder_sent_at.
2. Complete: status 'scheduled' and ends_at < now - 30 min: status 'completed'.
3. Scorecard nudges: interviews completed with ends_at < now - 2 h and scorecard_nudged_at null: for each interviewer id without a submitted scorecard on that application, insert a 'scorecard_due' notification and enqueue scorecard_due (dedupe 'nudge:'+interview+':'+user). Set scorecard_nudged_at.
4. Expire: interview_requests 'pending' with expires_at < now: status 'expired'.
5. Digest: for each workspace where the local time (workspaces.timezone) is between 08:00 and 08:14, for each member with new applicants in the last 24 h on jobs they can see (owners/admins: all jobs; interviewers: job_members), enqueue applicant_digest (dedupe 'digest:'+user+':'+local date) with per-job counts. No names of candidates in the email body beyond the first 5 first names per job.
- Log counts only.

Test:
1. Insert a test interview starting in 24 hours (SQL in the Backend end-to-end task), run:
curl -s -X POST "https://<ref>.supabase.co/functions/v1/sl-scheduler" -H "x-cron-secret: <CRON_SECRET>"
Expected: {"reminders":1,...}. Run again: {"reminders":0,...}.
2. Without the header: 401.

Plan first, then wait for my OK.`,
  },
  {
    name: 'sl-privacy',
    purpose: 'Handles candidate data requests: takes the public request, verifies the email by link, and lets an owner or admin send a full export or erase everything (files, interviews, rows) with a deletion log entry.',
    trigger: 'Public privacy page (request, verify) and the admin app (user JWT) for fulfil',
    secrets: ['APP_URL', 'IP_HASH_SALT', 'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'TOKEN_ENCRYPTION_KEY'],
    prompt: `${shared}

Build supabase/functions/sl-privacy/index.ts. Read @PRD.md sections 10 and 13.7.

Contract (deploy with --no-verify-jwt; JWT checked inside for fulfil):
- POST { action: 'request', company, email, kind: 'access' | 'delete' }: zod; rate limit 'priv:ip:'+ipHash 3 per 3600 s and 'priv:email:'+email 3 per 86400 s. Always return 200 { message: 'If we hold data for this email, we have sent a link to confirm it is you.' } including for unknown companies (no enumeration). For a real workspace: token = newToken(), insert data_requests (unverified, verify_token_hash, ip_hash), enqueue privacy_verify with link APP_URL/privacy/verify/<token> (dedupe 'privverify:'+request_id).
- POST { action: 'verify', token }: find by hash, status must be 'unverified' and created within 7 days (else 404 { code: 'link_invalid' }). Set verified_at, due_at = now + 30 days. If no candidate exists in that workspace with that email: status 'no_data', enqueue privacy_deleted-style "We hold no data" message (use kind privacy_export with data { none: true }). Else status 'open', insert 'privacy_request' notifications for owners and admins and enqueue privacy_request_new. Return { status }.
- POST { action: 'fulfil', request_id, mode: 'export' | 'delete' } with user JWT: requireUser, load the request, requireMember(ws, ['owner','admin']). Status must be 'open' (409 otherwise).
  - export: gather candidate, applications (answers, stage, dates), stage_events, notes, scorecards, ai_screens (summary and results), interviews, email_log (kind, date, status). Upload JSON to exports/<ws>/<request_id>.json with the admin client. Create 7 day signed URLs for it and for each CV. enqueue privacy_export with the links. status 'completed', completed_by, completed_at.
  - delete: first enqueue privacy_deleted to the email (dedupe 'privdel:'+request_id). For each future scheduled interview: getAccessToken(organiser) and deleteEvent (ignore revoked calendars, log the id). rpc erase_candidate(candidate_id, 'request', uid, request_id) with the admin client; then storage.from('cvs').remove(paths) in batches of 100. status 'completed'.
  - Return { ok: true, files_deleted? }.
- Log { fn, action, ws, request, outcome } only. Never log the email.

Tests:
1. curl -s -X POST "https://<ref>.supabase.co/functions/v1/sl-privacy" -H "Content-Type: application/json" -d '{"action":"request","company":"no-such-company","email":"a@b.com","kind":"delete"}'  Expected: the same 200 message as a real company.
2. Real flow in the browser (acceptance test 15 in @PRD.md), then: select count(*) from candidates where lower(email) = 'that@email'; = 0, and storage.objects has no file under that application id.

Plan first, then wait for my OK.`,
  },
  {
    name: 'sl-retention',
    purpose: 'Runs nightly: erases candidates whose retention period has passed (rows, CV files, future interviews), removes abandoned uploads and old exports, warns admins 7 days before deletions, and expires unverified data requests.',
    trigger: 'pg_cron daily at 03:10 UTC (x-cron-secret)',
    secrets: ['CRON_SECRET', 'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'TOKEN_ENCRYPTION_KEY'],
    prompt: `${shared}

Build supabase/functions/sl-retention/index.ts. Read @PRD.md sections 10 (rules 3 to 5) and 13.8.

Contract:
- POST, requireCron, --no-verify-jwt. Time budget 50 s: stop starting new work after 45 s and return what was done (the next night continues).
1. Purge: loop rpc candidates_due_for_purge(200) up to 10 times. For each: cancel future scheduled interviews in Google (best effort), rpc erase_candidate(id, 'retention', null, null), collect the returned paths, then storage.from('cvs').remove in batches of 100. Count candidates and files.
2. Stale uploads: rpc stale_uploads(200): remove the object if cv_path is set, delete the application row.
3. Warnings: per workspace, count candidates whose latest retention_until (across all their applications, all closed) equals current_date + 7 and who have no active talent pool consent. If > 0, enqueue retention_upcoming to each owner and admin with { count, link: APP_URL/app/candidates?filter=retention_due } (dedupe 'ret:'+ws+':'+date).
4. Exports: list exports/<ws>/ objects older than 8 days and remove them.
5. Data requests: update data_requests set status 'expired' where status 'unverified' and created_at < now - 7 days.
- Return { erased, files, stale, warned, exports_removed, requests_expired }. Log counts only (never emails or hashes).

Test:
1. In SQL: update applications set state = 'closed', retention_until = current_date - 1 where id = '<test app>';
2. curl -s -X POST "https://<ref>.supabase.co/functions/v1/sl-retention" -H "x-cron-secret: <CRON_SECRET>"
Expected: {"erased":1,"files":1,...}. select * from deletion_log order by created_at desc limit 1; shows reason 'retention' and an email_hash, no email.
3. Run again: {"erased":0,...}.

Plan first, then wait for my OK.`,
  },
  {
    name: 'sl-resend-webhook',
    purpose: 'Receives Resend delivery events, verifies the Svix signature on the raw body, de-dupes by svix-id, records delivery status and suppresses addresses that bounce or complain.',
    trigger: 'Resend webhook (POST with svix-id, svix-timestamp, svix-signature headers)',
    secrets: ['RESEND_WEBHOOK_SECRET'],
    prompt: `${shared}

Build supabase/functions/sl-resend-webhook/index.ts. Read @PRD.md section 13.9.

Contract:
- POST only, --no-verify-jwt.
- const raw = await req.text() (never req.json() first). Verify with npm:svix: new Webhook(RESEND_WEBHOOK_SECRET).verify(raw, { 'svix-id', 'svix-timestamp', 'svix-signature' } from the headers). Any failure: 400 { code: 'bad_signature' }. Check Resend's "verify webhooks" docs for the current method before writing.
- De-dupe: insert resend_events (id = svix-id, type). On unique violation (23505) return 200 { duplicate: true }.
- Parse the JSON. type 'email.delivered': update email_log set status 'delivered' where resend_id = data.email_id. 'email.bounced': status 'bounced'; if the bounce is permanent/hard (check data.bounce.type in the docs [verify field name]), insert email_suppressions (lower(email), 'bounce') on conflict do nothing. 'email.complained': status 'complained' and suppression 'complaint'. 'email.delivery_delayed': status 'delayed'. Anything else: 200.
- If handling throws after the de-dupe insert, delete that resend_events row and return 500 so Resend retries.
- Log { fn, type, ms } only.

Setup in Resend: Webhooks > Add Endpoint > https://<ref>.supabase.co/functions/v1/sl-resend-webhook, events email.delivered, email.bounced, email.complained, email.delivery_delayed. Copy the signing secret (whsec_...) into Supabase secrets as RESEND_WEBHOOK_SECRET.

Tests:
1. curl -s -X POST "https://<ref>.supabase.co/functions/v1/sl-resend-webhook" -H "Content-Type: application/json" -d '{"type":"email.bounced"}'  Expected: 400 bad_signature.
2. Resend dashboard > Webhooks > your endpoint > send a test event (or send an email to bounced@resend.dev). Expected: 200, a resend_events row, and for the bounce a row in email_suppressions.
3. Replay the same event from the dashboard: 200 {"duplicate":true}.

Plan first, then wait for my OK.`,
  },
]
