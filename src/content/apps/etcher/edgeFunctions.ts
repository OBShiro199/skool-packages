// Etcher edge functions: one full Claude Code prompt per function.
import type { EdgeFunctionDef } from '../../types'

const shared = `First, if supabase/functions/_shared/ does not exist yet, create the helpers in @PRD.md section 11:
1. admin.ts: adminClient() with SUPABASE_URL and JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS')!)['default'] (fall back to SUPABASE_SERVICE_ROLE_KEY), auth: { persistSession: false }.
2. auth.ts: requireUser(req) reads the Bearer token and calls supabase.auth.getClaims(token), returns { userId, email, jwt } or throws HttpError(401, 'unauthenticated'). requireMember(jwt, ws, minRole) calls rpc has_workspace_role(ws, minRole) through a client created with the user's JWT in the Authorization header (so auth.uid() works) and throws 403 'forbidden'. requireAccess(ws) calls rpc has_active_access(ws) with the admin client and throws HttpError(402, 'paused', 'Your plan has ended. Restart it in Billing.').
3. http.ts: HttpError(status, code, message), json(body, status), twiml(xml) with Content-Type text/xml, cors(req) for APP_URL and http://localhost:3000, OPTIONS handler, and handle(fn) that catches HttpError and returns { error: { code, message } }.
4. crypto.ts: AES-256-GCM encrypt/decrypt with TELEPHONY_ENC_KEY (base64, 32 bytes) via crypto.subtle, output base64(iv || ciphertext). sha256Hex(text). newToken() = 32 random bytes base64url. timingSafeEqual(a, b) on Uint8Arrays (different lengths = false).
5. twilio.ts: credsForWorkspace(ws) and credsForAccount(accountSid) load workspace_telephony + workspace_secrets with the admin client and decrypt; mainCreds() from TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN. twilioFetch(creds, path, { method, form }) to https://api.twilio.com with Basic auth (accountSid:authToken, or apiKeySid:apiKeySecret), form-encoded bodies, 3 tries on 429/5xx with exponential backoff + jitter, throws HttpError(502, 'twilio_error', twilioMessage). validateTwilio(req, params, fnName): url = SUPABASE_URL + '/functions/v1/' + fnName + new URL(req.url).search (never req.url itself), look up the auth token by params.AccountSid, compute base64(HMAC-SHA1(authToken, url + sorted keys each followed by its value)) and compare with the X-Twilio-Signature header using timingSafeEqual. Write 3 deno tests using Twilio's documented example (known URL, params, token and signature) plus one tampered param.
6. limits.ts: rateLimit(bucket, max, seconds) calls rpc try_rate_limit and throws 429 'rate_limited'. minutesLeft(ws) reads rpc plan_limits and usage_this_month(ws, 'call_minutes') with the admin client and returns null when byo is true.
7. meter.ts: meter({ ws, userId, metric, quantity, costMicros, refId, idempotencyKey }) inserts usage_ledger with upsert onConflict 'idempotency_key', ignoreDuplicates true.
8. email.ts: callSendEmail({ template, to, workspace_id, user_id, props, dedupe_key }) POSTs to SUPABASE_URL/functions/v1/send-email with header x-internal-secret: INTERNAL_FN_SECRET.
9. log.ts: log(fn, data) prints one JSON line with fn, ms and ids only. Mask phone numbers to the last 4 digits. Never log tokens, signatures, recording URLs or email bodies.
Use npm:zod for every input. Then build the function below.`

export const edgeFunctions: EdgeFunctionDef[] = [
  {
    name: 'twilio-token',
    purpose: 'Gives a signed-in rep a short-lived Twilio Access Token with a Voice grant so the browser softphone can make and receive calls.',
    trigger: 'Called by the browser when the softphone dock mounts and when the Device fires tokenWillExpire',
    secrets: ['TELEPHONY_ENC_KEY', 'APP_URL'],
    prompt: `${shared}

Build supabase/functions/twilio-token/index.ts. Read @PRD.md sections 10.3 and 12.1.

Contract:
- POST JSON { workspace_id: uuid }. zod, 400 on bad input. OPTIONS handled with CORS.
- requireUser, requireMember(jwt, workspace_id, 'member'), requireAccess(workspace_id).
- rateLimit('token:' + userId, 60, 3600).
- Load workspace_telephony. If status is not 'ready' or twiml_app_sid or api_key_sid is missing, return 409 { code: 'calling_not_set_up', message: 'Calling is not set up yet. An admin can set it up in Settings > Calling.' }.
- credsForWorkspace(ws) to get the account SID, API key SID and decrypted API key secret.
- identity = 'u_' + userId.replaceAll('-', '') (Twilio identities should avoid special characters).
- Build the token with npm:twilio: const { AccessToken } = twilio.jwt; const VoiceGrant = AccessToken.VoiceGrant; new AccessToken(accountSid, apiKeySid, apiKeySecret, { identity, ttl: 3600 }); token.addGrant(new VoiceGrant({ outgoingApplicationSid: twimlAppSid, incomingAllow: true })). If npm:twilio fails to import in Deno, sign the JWT yourself with npm:jose: header { alg: 'HS256', typ: 'JWT', cty: 'twilio-fpa;v=1' }, payload { jti: apiKeySid + '-' + nowSeconds, iss: apiKeySid, sub: accountSid, exp: now + 3600, grants: { identity, voice: { incoming: { allow: true }, outgoing: { application_sid: twimlAppSid } } } }, secret = apiKeySecret. Tell me which path you used.
- Return 200 { token, identity, expires_at }. Never log the token.

Errors: 401 unauthenticated, 403 forbidden, 402 paused, 409 calling_not_set_up, 429 rate_limited, 500 with a generic message (log the real one).

Then the browser side (lib/softphone.ts, a client module used by the dock): npm install @twilio/voice-sdk. new Device(token, { codecPreferences: ['opus', 'pcmu'], closeProtection: true }); device.register(); on 'tokenWillExpire' fetch a new token and device.updateToken(token); on 'incoming' expose the call to the dock; on 'error' map common codes (31402/31208 microphone denied, 20101 invalid token) to the DESIGN.md messages. connect(to, { personId, dealId, fromNumberId }) calls device.connect({ params: { To: to, personId, dealId, fromNumberId } }). Retry token fetch with backoff 1s, 2s, 4s then show "Softphone offline. Retry".

Curl tests:
curl -X POST "https://<ref>.supabase.co/functions/v1/twilio-token" -H "Authorization: Bearer <USER_JWT>" -H "Content-Type: application/json" -d '{"workspace_id":"<ws uuid>"}'
Good: {"token":"eyJ...","identity":"u_...","expires_at":"..."}. Paste the token into jwt.io: header cty is twilio-fpa;v=1 and grants.voice.outgoing.application_sid starts with AP.
Without Authorization: 401. With a JWT of a user from another workspace: 403.

Plan first, then wait for my OK.`,
  },
  {
    name: 'twilio-voice',
    purpose: 'Answers Twilio with TwiML: routes outbound browser calls to the phone network with the right caller ID, recording and consent, and routes inbound calls to the assigned rep with a voicemail fallback.',
    trigger: 'Twilio webhook: the TwiML App Voice URL (outbound) and every purchased number\'s Voice URL (inbound)',
    secrets: ['TELEPHONY_ENC_KEY', 'TWILIO_AUTH_TOKEN'],
    prompt: `${shared}

Build supabase/functions/twilio-voice/index.ts. Read @PRD.md sections 10.3, 10.4, 10.5 and 12.2. Deploy with --no-verify-jwt (Twilio has no Supabase JWT).

Contract:
- POST application/x-www-form-urlencoded from Twilio. Parse with await req.formData() into a plain object.
- validateTwilio(req, params, 'twilio-voice') FIRST. On mismatch return 403 with no body.
- Query ?kind=consent: return <Response><Say voice="Polly.Amy">{workspace consent text}</Say></Response> (this TwiML plays to the called party before they are bridged). ?fallback=1: return <Response><Say>Sorry, we could not connect your call. Please try again.</Say><Hangup/></Response>.
- Load the workspace by AccountSid (workspace_telephony.twilio_account_sid) in ONE query that also returns record_calls, play_consent_announcement, consent_announcement, ring_timeout_seconds, inbound_fallback.
- Every refusal returns 200 with <Response><Say>reason</Say><Hangup/></Response> (Twilio plays an "application error" for non-200).

Outbound (params.From starts with 'client:'):
1. userId from the identity (u_ + uuid without dashes, re-insert dashes). Check membership with the admin client (workspace_members row exists) and has_active_access.
2. zod: To must be E.164 (/^\\+[1-9]\\d{6,14}$/). To must not be one of the workspace's own active numbers.
3. minutesLeft(ws): if 0, say "You have used this month's call minutes. Buy more in Billing." and hang up; fire analytics event minutes_cap_hit in the log line.
4. rateLimit('dial:' + userId, 120, 3600).
5. Person: if personId given, load it (same workspace). Else match people.phone = To in the workspace. If do_not_call, say "This contact is marked do not call." and hang up.
6. Caller ID: fromNumberId if it is an active number of this workspace, else the user's assigned number, else the default number. None: say "No phone number is set up for you yet." and hang up.
7. Upsert calls on twilio_call_sid = CallSid: direction outbound, status initiated, from_number = callerId, to_number = To, user_id, person_id, company_id (from the person), deal_id (if it belongs to the workspace), phone_number_id, recorded = record_calls, consent_played = record_calls and play_consent_announcement.
8. Return TwiML exactly as section 10.3: <Dial callerId answerOnBridge="true" timeLimit="7200" action=".../twilio-status-callback?kind=dial"> with record="record-from-answer-dual", recordingStatusCallback=".../twilio-recording-callback", recordingStatusCallbackEvent="completed" only when recording is on, and <Number url=".../twilio-voice?kind=consent" (only when the announcement is on) statusCallback=".../twilio-status-callback?kind=child" statusCallbackEvent="initiated ringing answered completed">To</Number>.

Inbound (params.To is one of the workspace's numbers):
1. Find the phone_numbers row (status active) by e164 = To. Match the caller: people.phone = From in the workspace.
2. Upsert calls: direction inbound, status ringing, from_number = From, to_number = To, user_id = assigned_user_id, person and company ids.
3. TwiML: optional <Say> consent first (when recording and announcement are on). Then <Dial timeout="{ring_timeout_seconds}" action=".../twilio-status-callback?kind=dial&inbound=1" record...> with <Client><Identity>u_{assigned user}</Identity><Parameter name="personName" value="{name}"/><Parameter name="callId" value="{calls.id}"/></Client>. No assigned user: one <Client> per member (max 10).
4. The voicemail / ring_all fallback is returned by twilio-status-callback when the Dial action reports no-answer (see that function).

Build the XML with a tiny escapeXml() helper (escape & < > " '), never string-concatenate user values unescaped. Must respond in under 2 seconds: no Twilio API calls in this function.

Log { fn, ws, call_sid, direction, outcome, ms }.

Tests:
1. Unit-test the TwiML builders with deno test (recording on/off, consent on/off, do-not-call, cap reached).
2. curl without a valid signature must return 403:
curl -X POST "https://<ref>.supabase.co/functions/v1/twilio-voice" -d "AccountSid=ACxxx&CallSid=CAxxx&From=client:u_x&To=%2B14155550134"
3. Real test: from the app, call your own mobile. Twilio Console > Monitor > Logs > Calls (in the subaccount) shows the call, and the Request Inspector shows a 200 with your TwiML.

Plan first, then wait for my OK.`,
  },
  {
    name: 'twilio-status-callback',
    purpose: 'Keeps every call row in sync with Twilio status events, meters billable minutes once, logs the call on the timeline, and returns the voicemail TwiML for unanswered inbound calls.',
    trigger: 'Twilio webhook: statusCallback on calls and the <Dial action> URL',
    secrets: ['TELEPHONY_ENC_KEY', 'TWILIO_AUTH_TOKEN'],
    prompt: `${shared}

Build supabase/functions/twilio-status-callback/index.ts. Read @PRD.md sections 8.2 and 12.3. Deploy with --no-verify-jwt.

Contract:
- POST form from Twilio. validateTwilio(req, params, 'twilio-status-callback') first: 403 on mismatch.
- Params: CallSid, ParentCallSid, CallStatus, CallDuration, SequenceNumber, Timestamp, DialCallStatus, DialCallDuration, DialCallSid, AccountSid. Query kind = child | dial | parent, inbound=1 on inbound dial actions.
- Find the call: calls.twilio_call_sid = ParentCallSid ?? CallSid (child legs carry ParentCallSid). Unknown call: log 'unknown_call', return 200.

Ordering and duplicates:
- Terminal statuses: completed, busy, no-answer, failed, canceled.
- If SequenceNumber is present and <= calls.last_sequence, ignore unless the new status is terminal and the stored one is not. Update last_sequence otherwise.
- Do the update in one SQL statement (rpc or a single update with a where clause on last_sequence) so two callbacks racing cannot both win.

Updates:
- ringing / in-progress / answered: status, answered_at = coalesce(answered_at, Timestamp) for in-progress/answered, child_call_sid = CallSid for child legs.
- kind=dial: DialCallStatus is the outcome of the bridged leg. duration_seconds = DialCallDuration. If DialCallStatus is completed: status completed. Else status = DialCallStatus.
- Terminal: ended_at = now, billable_minutes = duration > 0 ? ceil(duration / 60) : 0.
- When the call first becomes terminal (only then):
  1. meter({ metric: 'call_minutes', quantity: billable_minutes, idempotencyKey: 'call:' + parentCallSid, costMicros: billable_minutes * 18000 for outbound or 12500 for inbound (browser leg + PSTN leg, US rates checked Oct 2026, update when Twilio prices change), refId: calls.id }) unless the workspace mode is not etcher_subaccount (still meter with costMicros 0 for reports).
  2. people.last_contacted_at = now for the linked person.
  3. Insert ONE activity type 'call' with call_id, person/company/deal ids, actor_id = user_id, meta { direction, duration_seconds, status }. The unique index activities_one_per_call makes a repeat insert fail with 23505: treat that as already done.
  4. Missed inbound (direction inbound and no answered_at): insert a task "Call back {name or number}" due now, assignee = assigned user.

Response:
- kind=dial and inbound=1 and DialCallStatus in (no-answer, busy, failed): return the fallback TwiML from workspace_telephony.inbound_fallback: voicemail = <Say>Please leave a message after the tone.</Say><Record maxLength="120" playBeep="true" recordingStatusCallback=".../twilio-recording-callback" recordingStatusCallbackEvent="completed"/>; ring_all = a second <Dial timeout="20"> to every member's client identity with action pointing back here with &fallback=voicemail; hangup = <Hangup/>.
- Every other kind=dial request: <Response/> (Twilio expects TwiML from an action URL).
- Status callbacks: 200 with an empty body.

Log { fn, call_sid, status, seq, ms }.

Tests:
1. deno test for the ordering rule (in-progress after completed is ignored, completed after ringing wins, same event twice changes nothing).
2. Make a real call that you do not answer, then one that you answer for 70 seconds. Check with SQL:
select status, duration_seconds, billable_minutes, last_sequence from public.calls order by started_at desc limit 2;
select idempotency_key, quantity from public.usage_ledger where metric = 'call_minutes' order by occurred_at desc limit 2;
Expect billable 0 and 2, one ledger row per call.
3. In Twilio Console > Monitor > Logs > Calls > the call > Request Inspector, click "Replay" on the completed callback (or resend it with the Twilio CLI). The ledger still has one row for that call.
4. curl with no signature returns 403.

Plan first, then wait for my OK.`,
  },
  {
    name: 'twilio-recording-callback',
    purpose: 'Queues finished recordings from Twilio, then a worker downloads each MP3 into private Supabase Storage, deletes it from Twilio, and retries with backoff.',
    trigger: 'Twilio recordingStatusCallback webhook, plus pg_cron every minute (x-cron-secret) for the download worker',
    secrets: ['TELEPHONY_ENC_KEY', 'TWILIO_AUTH_TOKEN', 'CRON_SECRET'],
    prompt: `${shared}

Build supabase/functions/twilio-recording-callback/index.ts. Read @PRD.md sections 8.3, 10.5 and 12.4. Deploy with --no-verify-jwt.

Two modes in one function:

A) Webhook (POST form from Twilio, no x-cron-secret header):
- validateTwilio(req, params, 'twilio-recording-callback'), 403 on mismatch.
- Params: AccountSid, CallSid, RecordingSid (RE...), RecordingUrl, RecordingStatus, RecordingDuration, RecordingChannels.
- Only RecordingStatus = 'completed' is queued; others return 200.
- Find the call by twilio_call_sid = CallSid (or child_call_sid = CallSid). Unknown: log, return 200.
- Insert recordings { workspace_id, call_id, twilio_recording_sid, duration_seconds, channels, status 'pending', next_attempt_at now() } with upsert onConflict twilio_recording_sid, ignoreDuplicates true. Do not download here. Return 200 in under 1 second.
- Do not store RecordingUrl: the worker rebuilds it from the SIDs (https://api.twilio.com/2010-04-01/Accounts/{AccountSid}/Recordings/{RecordingSid}) so nothing secret-looking is stored.

B) Worker (header x-cron-secret equals CRON_SECRET, constant-time compare; 401 otherwise):
- Claim up to 10 rows atomically with rpc claim_recordings({ n: 10 }) (already in the migration: it bumps attempts and pushes next_attempt_at 5 minutes out using for update skip locked, so two runs never take the same row).
- For each row: creds = credsForWorkspace(workspace_id). GET {recording url}.mp3 with Basic auth (account SID + auth token for the subaccount, or API key for own_twilio). Stream into storage.from('recordings').upload('{ws}/{call_id}/{RE sid}.mp3', body, { contentType: 'audio/mpeg', upsert: true }).
- Only after the upload succeeded: update the row status 'stored', storage_path, size_bytes, error null. Then DELETE https://api.twilio.com/2010-04-01/Accounts/{AccountSid}/Recordings/{RE sid}.json (expect 204; 404 also counts as deleted). Set twilio_deleted_at.
- meter({ metric: 'recording_minutes', quantity: ceil(duration_seconds / 60), costMicros: minutes * 2500, idempotencyKey: 'rec:' + RE sid }).
- On any failure: set error (message only), next_attempt_at = now() + (2 ^ attempts) minutes. If attempts >= 6: status 'failed'. Continue with the next row (one bad recording never blocks the rest).
- Stop after 45 seconds of work. Return { processed, stored, failed }.

Then schedule the worker with pg_cron + pg_net every minute, reading CRON_SECRET from Supabase Vault (use the Supabase MCP; show me the cron.schedule SQL before running it).

Playback is not this function: add a server action getRecordingUrl(recordingId) in the Next.js app that uses the user's own Supabase client (RLS decides) and createSignedUrl(path, 60).

Tests:
1. Turn recording on, make a 30 second call. Within 2 minutes:
select status, attempts, storage_path, twilio_deleted_at from public.recordings order by created_at desc limit 1;
Expect stored, 1, a path, and a timestamp. The recording is gone from the subaccount's Twilio console.
2. Temporarily set TELEPHONY_ENC_KEY wrong in a branch, or point one row at a fake RE sid, and watch attempts climb with next_attempt_at backing off.
3. curl the worker without x-cron-secret: 401. curl the webhook without a signature: 403.

Plan first, then wait for my OK.`,
  },
  {
    name: 'buy-number',
    purpose: 'Admin-only telephony control: sets up the workspace Twilio subaccount, API key and TwiML App, connects a customer\'s own Twilio or SIP trunk, searches, buys and releases numbers, and submits UK regulatory bundles.',
    trigger: 'Called by the browser from Settings > Calling and Settings > Numbers (admin JWT), plus a daily pg_cron call for bundle status',
    secrets: ['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TELEPHONY_ENC_KEY', 'CRON_SECRET'],
    prompt: `${shared}

Build supabase/functions/buy-number/index.ts. Read @PRD.md sections 10.1, 10.2, 10.6, 10.7 and 12.5.

Input: POST JSON { workspace_id, action, ...payload } validated with a zod discriminated union on action. Every action except bundle_sweep needs requireUser + requireMember(jwt, ws, 'admin') + requireAccess(ws). rateLimit('numbers:' + ws, 30, 3600) for everything, plus rateLimit('buy:' + ws, 5, 3600) for buy.

Actions:
1. setup (idempotent): if twilio_account_sid is empty, POST /2010-04-01/Accounts.json with mainCreds(), FriendlyName 'etcher:' + ws. Save sid to workspace_telephony, encrypt auth_token into workspace_secrets. If api_key_sid is empty, POST /2010-04-01/Accounts/{sub}/Keys.json FriendlyName 'etcher-voice' with the subaccount creds; save sid, encrypt secret. If twiml_app_sid is empty, POST /2010-04-01/Accounts/{sub}/Applications.json with FriendlyName 'Etcher', VoiceUrl SUPABASE_URL/functions/v1/twilio-voice, VoiceMethod POST, VoiceFallbackUrl same + '?fallback=1', StatusCallback SUPABASE_URL/functions/v1/twilio-status-callback. Save. status 'ready'. Each step checks the column first so a retry after a half-finished run carries on. Write the audit log ('telephony_setup').
2. connect_own { account_sid (AC...), api_key_sid (SK...), api_key_secret }: GET /2010-04-01/Accounts/{account_sid}.json with Basic apiKeySid:apiKeySecret to validate (401 = "Those keys did not work."). Create the TwiML App in their account (same URLs). mode 'own_twilio', encrypt the secret. Note: validateTwilio needs that account's auth token for signatures, so also ask for the auth token in this action and encrypt it (explain this in the UI helper text).
3. search { country: 'US' | 'GB', type: 'local' | 'mobile', area_code?: string, contains?: string }: GET /2010-04-01/Accounts/{sub}/AvailablePhoneNumbers/{country}/{Local|Mobile}.json?VoiceEnabled=true&PageSize=20 plus AreaCode (US) or Contains. Return { numbers: [{ phone_number, friendly_name, locality, region }] }.
4. buy { phone_number, idempotency_key }: if a phone_numbers row already has this idempotency_key (phone_numbers.idempotency_key is unique in the migration), return it. checkNumbers: max 3 active, else 402 { code: 'number_limit' }. GB: require bundle_status 'twilio-approved', else 409 { code: 'bundle_required' }. POST /2010-04-01/Accounts/{sub}/IncomingPhoneNumbers.json with PhoneNumber, VoiceUrl, VoiceMethod POST, StatusCallback, and for GB BundleSid + AddressSid (+ EmergencyAddressSid when required). Insert phone_numbers active with twilio_sid (PN...), e164, country, number_type, monthly_cost_cents (from a PRICES map: US local 115, GB local 115, GB mobile 115, mark [verify] in a comment), purchased_by, is_default when it is the first. meter({ metric: 'number_month', quantity: 1, costMicros: monthly_cost_cents * 10000, idempotencyKey: 'num:' + PN + ':' + yyyy-mm }). If Twilio says the number is gone, return 409 { code: 'number_taken', message: 'Someone bought that number a moment ago. Pick another.' }. Audit log.
5. release { phone_number_id, confirm }: confirm must equal the e164. DELETE /2010-04-01/Accounts/{sub}/IncomingPhoneNumbers/{PN}.json. status 'released', released_at now. Audit log.
6. uk_regulations: GET https://numbers.twilio.com/v2/RegulatoryCompliance/Regulations?IsoCountry=GB&NumberType=local&EndUserType=business&IncludeConstraints=true with the subaccount creds. Return the requirements so the Settings form renders exactly those fields.
7. uk_bundle { fields, document_paths? }: create the Address (POST /2010-04-01/Accounts/{sub}/Addresses.json), the End User (POST https://numbers.twilio.com/v2/RegulatoryCompliance/EndUsers), any Supporting Documents the regulation requires (upload files the admin put in imports/<ws>/compliance/ to https://numbers-upload.twilio.com/v2/RegulatoryCompliance/SupportingDocuments), the Bundle (POST .../v2/RegulatoryCompliance/Bundles with RegulationSid, FriendlyName, Email, StatusCallback), Item Assignments for each object, then update the Bundle with Status=pending-review. Save regulatory_bundle_sid, address_sid, bundle_status. Check each endpoint against Twilio's current Regulatory Compliance docs before writing it and tell me anything that differs.
8. bundle_status: fetch the bundle and update bundle_status and bundle_rejection_reason.
9. bundle_sweep (x-cron-secret, no user): run bundle_status for every workspace in pending-review or in-review, and write a number_month ledger line for every active number on the 1st of the month (idempotency key handles reruns).
10. byoc { carrier_sip_uri }: create a Connection Policy (POST https://voice.twilio.com/v1/ConnectionPolicies) with one Target (the carrier SIP URI), then a BYOC trunk (POST https://voice.twilio.com/v1/ByocTrunks) with VoiceUrl twilio-voice and ConnectionPolicySid. Save byoc_trunk_sid, mode 'byoc_trunk'. Mark the exact Target fields [verify] against the BYOC docs.

Errors: map Twilio errors to { code: 'twilio_error', message: Twilio's message } with 502; never return credentials. Log { fn, ws, action, ms }.

Curl tests (admin JWT):
curl -X POST "https://<ref>.supabase.co/functions/v1/buy-number" -H "Authorization: Bearer <ADMIN_JWT>" -H "Content-Type: application/json" -d '{"workspace_id":"<ws>","action":"setup"}'
Good: {"status":"ready","account_sid":"AC..."}. Run it twice: same AC sid, no second subaccount (check Twilio Console > Admin > Subaccounts).
curl ... -d '{"workspace_id":"<ws>","action":"search","country":"US","type":"local","area_code":"415"}'
Good: up to 20 numbers. The same calls with a member (not admin) JWT: 403.

Plan first, then wait for my OK.`,
  },
  {
    name: 'import-leads',
    purpose: 'Runs CSV imports as resumable background jobs: parses in 500 row chunks, normalises, dedupes people by email and companies by domain, and streams progress to the browser.',
    trigger: 'Called by the browser after it creates an import_jobs row (admin JWT), plus pg_cron every minute (x-cron-secret) to continue running jobs',
    secrets: ['CRON_SECRET', 'APP_URL'],
    prompt: `${shared}

Build supabase/functions/import-leads/index.ts. Read @PRD.md sections 8.4, 9 and 12.6.

Input:
- Browser: POST { job_id } with the user's JWT. requireUser, load the job with the admin client, requireMember(jwt, job.workspace_id, 'admin'), requireAccess.
- Cron: header x-cron-secret (constant-time), no body. Pick up to 3 jobs: the oldest queued or running job per workspace (never two running jobs in one workspace).

Claiming: update import_jobs set status = 'running', started_at = coalesce(started_at, now()) where id = $1 and status in ('queued','running') and (updated_at < now() - interval '50 seconds' or status = 'queued') returning *. If nothing comes back, another run owns it: return 202.

Processing (stop after 40 seconds of wall time, leave the job running for the next cron tick):
1. Download imports/<ws>/<job id>.csv from Storage. Parse with npm:papaparse (header: true, skipEmptyLines: 'greedy'). On the first run set total_rows; if over 50,000 fail with "This file has more than 50,000 rows. Split it and import each part.". Also check usage_this_month(ws, 'import_rows') + total <= 200,000.
2. Skip to cursor_row. Take 500 rows. For each row apply job.mapping: trim, lower emails, validate email with zod, phone to E.164 with npm:libphonenumber-js (default country from workspaces.default_currency: USD -> US, GBP -> GB, else US), website/domain to a bare host (strip protocol, www., path), "name" split on the first space.
3. A row with none of email, first name, last name or company is an error: push { row, reason } to errors (keep the first 1,000).
4. Companies first: collect domains (from the domain column, else the email domain unless it is in the free-mail list from PRD section 9, only when create_companies is on). Select existing companies by (workspace_id, domain) and by lower(name) for rows with no domain. Insert the missing ones in one batch.
5. People: select existing by (workspace_id, email) for the chunk's emails. dedupe = skip: count as skipped. update: update only columns that are null/empty on the existing row (build the patch per row). create: insert anyway but without the email if it would break the unique index (put it in custom.import_email) and note that in errors as a warning. Insert new people in one batch with created_by = job.created_by, owner_id = job.owner_id, lead_source from the mapping or 'import'.
6. Optional deals (mapping.create_deals): one deal per new person in the chosen pipeline/first stage.
7. Update the job in one statement: processed_rows, inserted_count, updated_count, skipped_count, error_count, errors, cursor_row. meter({ metric: 'import_rows', quantity: chunk length, costMicros: 0, idempotencyKey: 'import:' + job.id + ':' + cursor_row }).
8. Check status is still 'running' before each chunk (an admin may have cancelled).
9. At the end: status completed, finished_at, write one 'import' activity with meta counts, and remove nothing from Storage (keep the file 30 days for support).
- If the same job fails 3 runs in a row with an exception (track in errors with reason 'crash'), set status failed with a plain message.

The Realtime subscription on import_jobs drives the progress bar; nothing to return to the browser except { status, processed_rows, total_rows } (202 while running).

Tests:
1. Make test.csv with 200 rows: 10 duplicate emails, 3 empty rows, 5 Gmail addresses, phone numbers in mixed formats. Import with dedupe skip.
select status, total_rows, inserted_count, skipped_count, error_count from public.import_jobs order by created_at desc limit 1;
select count(*) from public.companies where domain = 'gmail.com'; -- expect 0
2. Generate a 20,000 row CSV (ask Claude for a script) and watch it finish over several cron runs without duplicates:
select email, count(*) from public.people group by email having count(*) > 1;
3. Call the function with a member JWT: 403. Without auth: 401. Cron path without the secret: 401.

Plan first, then wait for my OK.`,
  },
  {
    name: 'export-leads',
    purpose: 'Builds CSV exports of people, companies, deals, calls or everything as a background job, stores them privately, and emails a signed link that expires in 24 hours.',
    trigger: 'Called by the browser from Settings > Data or a table\'s Export action (admin JWT), plus pg_cron every minute for queued jobs',
    secrets: ['CRON_SECRET', 'INTERNAL_FN_SECRET', 'APP_URL'],
    prompt: `${shared}

Build supabase/functions/export-leads/index.ts. Read @PRD.md sections 8.5 and 12.7.

Input (browser): POST { workspace_id, entity: 'people'|'companies'|'deals'|'calls'|'everything', filters?: object }. requireUser, requireMember(jwt, ws, 'admin'). Do NOT require access: a lapsed workspace may still export its data. Limit: count export_jobs for this workspace in the last 24 hours; 10 or more returns 402 { code: 'export_limit', message: 'You can run 10 exports a day. Try again tomorrow.' }. rateLimit('export:' + userId, 5, 600).
- Insert export_jobs { workspace_id, created_by, entity, filters, status 'queued' } and return 202 { job_id } at once. Then start processing in the background with EdgeRuntime.waitUntil(run(job)).
Cron mode (x-cron-secret): pick queued jobs older than 1 minute (the waitUntil run died) and run them.

run(job):
1. Claim: update status 'running' where status = 'queued' returning *. Nothing back: stop.
2. Page through rows with the admin client 1,000 at a time, ALWAYS .eq('workspace_id', job.workspace_id), deleted_at is null, plus the filters (owner_id, created_at range, pipeline_id). Load custom_field_defs and add one column per active field (label as header).
3. CSV writer: UTF-8 with a BOM, RFC 4180 quoting (wrap in quotes when a value has a comma, quote or newline; double inner quotes). Prefix any cell starting with =, +, -, @ with a single quote to stop spreadsheet formula injection.
   - people: first_name, last_name, email, phone, job_title, company name, owner email, lead_source, last_contacted_at, created_at, custom fields.
   - companies: name, domain, industry, employee_range, city, country, owner email, custom fields.
   - deals: name, pipeline, stage, status, value (decimal from cents), currency, person email, company, owner email, expected_close_date, closed_at, close_reason, custom.
   - calls: started_at, direction, from, to, rep email, person, duration_seconds, disposition, notes, recording yes/no.
   - everything: all four plus activities and tasks, zipped with npm:fflate.
4. Upload to exports/<ws>/<job id>.csv (or .zip) with contentType text/csv or application/zip.
5. createSignedUrl(path, 86400). Update job: status completed, row_count, file_path, expires_at = now() + 24h, finished_at.
6. callSendEmail({ template: 'export_ready', to: requester email, workspace_id, user_id, props: { entity, row_count, url }, dedupe_key: 'export:' + job.id }). Set emailed_at.
7. meter({ metric: 'export', quantity: 1, costMicros: 0, idempotencyKey: 'export:' + job.id }). The audit trigger already logs the insert.
8. On error: status failed, error message, and email nothing.

Purge mode (x-cron-secret, body { mode: 'purge' }, daily): call rpc purge_expired() with the admin client. It returns { expired_exports, old_recordings, purged_workspaces }. Remove each export path from the exports bucket and each recording path from the recordings bucket (in batches of 100 with storage.remove), set those export_jobs.file_path to null and those recordings to status 'deleted'. For each purged workspace id, list and remove every object under '<ws>/' in all three buckets. Log only counts.

Tests:
1. Export people from the app; within a minute the email arrives, the link downloads a CSV that opens in Excel with accents intact.
2. Put a person named =HYPERLINK("http://x","click") and check the CSV cell starts with a single quote.
3. As a member (not admin): 403. Run 11 exports: the 11th returns 402.
select status, row_count, expires_at, emailed_at from public.export_jobs order by created_at desc limit 3;

Plan first, then wait for my OK.`,
  },
  {
    name: 'send-email',
    purpose: 'The only place Etcher sends email: renders React Email templates, de-duplicates every send through email_log, sends with Resend using an Idempotency-Key, and runs the scheduled sweeps (trial ending, win-back, reactivation, deal won, weekly digest, task reminders).',
    trigger: 'Called by other functions and the Stripe webhook (x-internal-secret), and by pg_cron for sweeps (x-cron-secret)',
    secrets: ['RESEND_API_KEY', 'EMAIL_FROM', 'INTERNAL_FN_SECRET', 'CRON_SECRET', 'APP_URL'],
    prompt: `${shared}

Build supabase/functions/send-email/index.ts and the templates in supabase/functions/_shared/emails/. Read @PRD.md section 15 (every template, trigger, subject and dedupe key) and @DESIGN.md section 11 (the email look).

Auth: header x-internal-secret = INTERNAL_FN_SECRET (send mode) or x-cron-secret = CRON_SECRET (sweep mode), constant-time compare. Anything else 401. Never callable from the browser.

Send mode: POST { template, to, workspace_id?, user_id?, props, dedupe_key } validated with a zod schema per template (props differ per template).
1. Insert email_log { workspace_id, user_id, template, to_email, dedupe_key, status 'sent' } with onConflict dedupe_key ignoreDuplicates. If no row came back, return 200 { skipped: true } (already sent).
2. Preferences: if the user has weekly_digest false (digest), deal_celebrations false (deal_won) or marketing_emails false (winback, reactivation), update the row to status 'skipped' and return.
3. Render with npm:@react-email/components + npm:@react-email/render: html = await render(<Template {...props} />), text = await render(<Template {...props} />, { plainText: true }). Templates are .tsx files with one shared Layout (wordmark, hairline, 560px, white bordered button, footer with preferences link and postal address from a POSTAL_ADDRESS constant).
4. POST https://api.resend.com/emails with headers Authorization: Bearer RESEND_API_KEY, Content-Type application/json, Idempotency-Key: dedupe_key (max 256 chars). Body { from: EMAIL_FROM, to: [to], subject, html, text, reply_to: SUPPORT_EMAIL constant, tags: [{ name: 'template', value: template }] }.
5. Store resend_id from the response id. On 429 or 5xx retry 3 times with backoff (honour retry-after). On final failure set status 'failed' and error, return 502.

Templates (one file each): welcome, teammate_invite, trial_ending, payment_failed, winback, reactivation, export_ready, deal_won, weekly_digest, task_reminder, minutes_80. Each exports Subject(props) and the component. Copy every subject, preview line, key lines and CTA from PRD section 15 word for word.

Sweep mode: POST { sweep } where sweep is one of:
- trial_ending (hourly): subscriptions status trialing and trial_end between now()+44h and now()+52h. To every owner and admin. Props: people, calls and deals counts, charge date, amount by plan_interval. Dedupe 'trial_ending:' + ws.
- winback (daily): status canceled and canceled_at between now()-4 days and now()-3 days. To owners. Include the restart link APP_URL/app/billing?coupon=WINBACK50. Dedupe 'winback:' + ws.
- reactivation (daily): profiles with last_seen_at < now()-14 days who are members of a workspace with active access. Props: up to 5 overdue tasks and 5 deals with no activity in 14 days. Dedupe 'reactivation:' + user + ':' + yyyy-mm.
- deal_won (every 5 minutes): activities type 'deal_won' in the last 24 hours. To the deal owner and admins. Props: deal name, value formatted with Intl.NumberFormat in the deal currency, days in pipeline, calls on the deal, team total this month. Dedupe 'deal_won:' + deal id + ':' + recipient.
- weekly_digest (hourly on Mondays): members whose local time (profiles.timezone, Intl API) is between 08:00 and 08:59. Props from the views pipeline_stage_totals, pipeline_win_rates, revenue_closed_monthly, rep_call_stats_daily (last 7 days). Dedupe 'digest:' + user + ':' + iso week.
- task_reminders (every 5 minutes): tasks open, remind_at <= now(), reminded_at null. Set reminded_at in the same claim update so a task is only picked once. Dedupe 'task:' + task id.
- retry_failed (daily): email_log rows status failed in the last 24 hours: delete and resend once.
Process max 200 sends per sweep run (Resend's default limit is about 2 requests per second [verify on your plan], so pace with a 600ms gap or use POST /emails/batch with up to 100 emails, each still deduped through email_log first).

Then schedule every sweep with pg_cron + pg_net (secret from Vault), matching PRD section 16. Show me the SQL first.

Tests:
1. Call send mode twice with the same dedupe_key: the second returns { skipped: true } and Resend > Emails shows one email.
curl -X POST "https://<ref>.supabase.co/functions/v1/send-email" -H "x-internal-secret: <INTERNAL_FN_SECRET>" -H "Content-Type: application/json" -d '{"template":"welcome","to":"you@yourdomain.com","props":{"firstName":"Olly","workspaceName":"Acme"},"dedupe_key":"test-welcome-1"}'
2. Set a workspace's trial_end to now() + 48 hours and run the trial_ending sweep: one email per owner/admin, none on a second run.
3. Without either secret: 401.
select template, to_email, status, resend_id from public.email_log order by created_at desc limit 10;

Plan first, then wait for my OK.`,
  },
  {
    name: 'invite-member',
    purpose: 'Lets admins invite teammates by email with a role, resend or revoke invites, and stores only a hash of each invite token.',
    trigger: 'Called by the browser from Settings > Members and the onboarding checklist (admin JWT)',
    secrets: ['INTERNAL_FN_SECRET', 'APP_URL'],
    prompt: `${shared}

Build supabase/functions/invite-member/index.ts. Read @PRD.md section 12.9 and the accept_invitation function in the migration.

Input: POST { workspace_id, action: 'invite' | 'resend' | 'revoke', emails?: string[] (1 to 20), role?: 'member' | 'admin', invitation_id?: uuid }. zod. requireUser, requireMember(jwt, ws, 'admin'), requireAccess(ws).

invite:
1. Lower-case and de-duplicate the emails; validate each with zod.email().
2. rateLimit('invite:' + ws, 50, 86400) per email.
3. Skip emails that already belong to a member of this workspace (join workspace_members to profiles.email) and return them in skipped with reason 'already_member'.
4. For each email: token = newToken(); token_hash = sha256Hex(token). Upsert-like logic: if an open invitation exists for (ws, email) (accepted_at null, revoked_at null), update token_hash, role, expires_at = now() + 7 days, last_sent_at = now(); else insert a new one with invited_by = userId. The unique partial index invitations_one_open_per_email protects against races: on conflict, retry as an update once.
5. callSendEmail({ template: 'teammate_invite', to: email, workspace_id: ws, props: { inviterName, workspaceName, role, url: APP_URL + '/invite/' + token }, dedupe_key: 'invite:' + invitation.id + ':' + last_sent_at }).
6. Never log or return the token. Return { invited: [emails], skipped: [{ email, reason }] }.

resend { invitation_id }: must be open and in this workspace, last_sent_at older than 10 minutes (else 429 'Wait a few minutes before resending.'). New token (the old link stops working), new expiry, send again.

revoke { invitation_id }: set revoked_at = now(). Return { ok: true }.

The /invite/[token] page in Next.js: shows the workspace name and inviter (look them up in a server component with the secret key by hashing the token, show nothing else), then signup/login prefilled with the invited email, then calls supabase.rpc('accept_invitation', { p_token: token }) and redirects to /app. Map its errors to friendly messages: expired, used, different email ("This invite was sent to j***@acme.com. Log in with that email.").

Tests:
1. Invite yourself+test@yourdomain.com as member. The email arrives, the link works in a private window, you land in the workspace as member.
select email, role, accepted_at is not null as accepted, token_hash <> '' as hashed from public.invitations order by created_at desc limit 3;
2. Open the same link again: "This invite has already been used".
3. Call invite with a member JWT: 403. Invite 21 emails at once: 400. Try role 'owner': 400.

Plan first, then wait for my OK.`,
  },
]
