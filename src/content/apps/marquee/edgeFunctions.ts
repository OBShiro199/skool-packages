// Marquee edge functions: one Claude Code prompt per function.
import type { EdgeFunctionDef } from '../../types'

const shared = `First, if supabase/functions/_shared/ does not exist yet, create these helpers (read @PRD.md section 13 intro):
1. admin.ts: adminClient() with Deno.env.get('SUPABASE_URL') and the secret key (read SUPABASE_SECRET_KEYS JSON and take "default", fall back to SUPABASE_SERVICE_ROLE_KEY), auth: { persistSession: false }.
2. auth.ts: requireUser(req) reads the Bearer token, calls supabase.auth.getClaims(token) with a publishable-key client, returns { userId, email } or throws HttpError(401). requireRole(ws, roles) calls has_workspace_role through a client that carries the user's JWT (so auth.uid() works) and throws 403. requireAccess(ws) calls has_active_access with the admin client and throws 402 { code: 'paused' }. requireCron(req) compares x-cron-secret with CRON_SECRET in constant time (timingSafeEqual on equal-length Uint8Arrays; different lengths = mismatch).
3. http.ts: HttpError(status, code, message), json(body, status), CORS headers for APP_URL and http://localhost:3000, OPTIONS handler. Error body: { error: { code, message } }.
4. log.ts: log(fn, data) prints one JSON line. Never log tokens, image URLs with signatures, face data, emails or API keys.
5. retry.ts: withRetry(fn, { tries: 3, baseMs: 800 }) with exponential backoff + jitter, honours retry-after, retries only 429 and 5xx.
6. limits.ts: checkLimit(ws, kind, qty) reads plan_limits(ws) and usage_this_month(ws, kind) and throws HttpError(402, 'limit_reached', "You have X credits left this month. This needs Y.").
7. meter.ts: meter({ ws, userId, kind, quantity, costMicros, refId, idempotencyKey }) inserts usage_ledger with on conflict (idempotency_key) do nothing. refund({ ws, kind, refId }) inserts quantity -1 with key 'refund:' + refId.
8. jobs.ts: enqueue({ ws, queue, kind, refId, payload, key, runAfter? }) upserts into jobs with ignoreDuplicates on idempotency_key. finish(job), retryLater(job, err, maxTries) sets status back to 'queued', attempts + 1, run_after = now + 2^attempts minutes + random 0 to 30 s, or 'dead' at maxTries.
9. claude.ts: callClaude({ system, userContent, schema, effort, maxTokens }) using npm:@anthropic-ai/sdk, model 'claude-opus-5-5', thinking { type: 'adaptive' }, output_config { effort, format: { type: 'json_schema', schema } }, system prompt marked cache_control { type: 'ephemeral' }, betas ['server-side-fallback-2026-07-01'] with fallbacks: 'default' on client.beta.messages. Check stop_reason: 'refusal' throws HttpError(422, 'ai_refused'), 'max_tokens' throws HttpError(502, 'ai_truncated'). Parse the text block as JSON, validate with the zod schema. Return { data, costMicros } where costMicros = input_tokens*4 + cache_read_input_tokens*0.2 + cache_creation_input_tokens*5 + output_tokens*20 (micro-dollars, rounded).
10. fal.ts: falSubmit(modelId, input, webhookUrl) POSTs https://queue.fal.run/<modelId>?fal_webhook=<encoded url> with Authorization: Key FAL_KEY and returns { request_id, status_url, response_url }. falRun(modelId, input) POSTs https://fal.run/<modelId> (synchronous). falGet(url) GETs a status or response URL with the same header. Check fal's docs for the current URL shapes before writing and tell me if they differ.
11. google.ts: decrypt/encrypt tokens with AES-GCM 256 using TOKEN_ENC_KEY (base64, 32 bytes), output base64(iv || ciphertext). getAccessToken(channelId): read channel_tokens with the admin client, return the access token if it expires in more than 2 minutes, else POST https://oauth2.googleapis.com/token with grant_type refresh_token, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET; store the new access token encrypted. On 400 invalid_grant: set channels.status 'needs_reauth', set every running or scheduled test on that channel to paused_reason 'reauth', throw HttpError(409, 'needs_reauth').
12. email.ts: sendEmail({ ws, kind, to, subject, html, text, dedupeKey }) inserts email_log first (on conflict dedupe_key do nothing, and returns without sending if it already existed), checks notification_prefs for the user when the kind is optional, then POST https://api.resend.com/emails with Authorization: Bearer RESEND_API_KEY, then updates resend_id and status.
13. pacific.ts: pacificNow(req?) returns { date: 'YYYY-MM-DD', hour, minute } for America/Los_Angeles using Intl.DateTimeFormat. If ALLOW_DEBUG_NOW is 'true' and the request has an x-debug-now ISO header, use that time instead (for acceptance test 8). Never allow it in production.
Then build the function below.`

export const edgeFunctions: EdgeFunctionDef[] = [
  {
    name: 'mrq-face-ingest',
    purpose: 'Checks the cut-out cap and queues a face photo for background removal and expression tagging.',
    trigger: 'Called by the browser after a face photo upload finishes (user JWT)',
    secrets: ['APP_URL'],
    prompt: `${shared}

Build supabase/functions/mrq-face-ingest/index.ts. Read @PRD.md sections 10.1, 13.1 and 9.1.

Contract:
- POST, JSON { photo_id: uuid }. Validate with zod (npm:zod). 400 on bad input.
- requireUser. Load face_photos with the admin client (404 if missing). requireRole(photo.workspace_id, ['owner','admin','editor']). requireAccess.
- Rate limit: rpc try_rate_limit('face:' + userId, 60, 3600), 429 if false.
- State: status must be 'uploaded' or 'failed', else 409 { code: 'wrong_state' }. If already 'processing', return 200 { ok: true, status: 'processing' } (idempotent double click).
- Check the object exists in bucket faces at original_path (list its folder, match the name). 404 { code: 'file_missing' } if not.
- checkLimit(ws, 'face_cutouts', 1). meter kind 'face_cutouts' quantity 1, costMicros 0 for now (the worker writes the real cost on the job), idempotencyKey 'cutout:' + photo_id + ':' + photo.attempts.
- Update status 'processing', error null. enqueue({ queue: 'ai', kind: 'cutout_face', refId: photo_id, key: 'cutout:' + photo_id + ':' + photo.attempts }).
- Return { ok: true, status: 'processing' }.
- Log { fn, photo_id, ws, ms }.

Deploy with JWT verification on.
Curl test:
curl -X POST "https://<ref>.supabase.co/functions/v1/mrq-face-ingest" -H "Authorization: Bearer <USER_JWT>" -H "Content-Type: application/json" -d '{"photo_id":"<uuid>"}'
Expected: {"ok":true,"status":"processing"} and one jobs row with kind cutout_face. With no Authorization header: 401. With another workspace's user: 403. Call it 11 times on a Creator trial with different photos: the 11th returns 402 limit_reached.

Plan first, then wait for my OK.`,
  },
  {
    name: 'mrq-generate',
    purpose: 'Reserves credits and creates a generation with 6 concept rows (or one regenerated concept), then queues the Claude brief.',
    trigger: 'Called by the browser from "Generate 6 concepts" or "Regenerate (1 credit)" (user JWT)',
    secrets: ['APP_URL'],
    prompt: `${shared}

Build supabase/functions/mrq-generate/index.ts. Read @PRD.md sections 9.2, 13.2 and 16.

Contract:
- POST, JSON { project_id: uuid, regenerate_concept_id?: uuid }. zod. 400 on bad input.
- requireUser, load the project (admin client), requireRole(ws, ['owner','admin','editor']), requireAccess.
- Rate limit try_rate_limit('gen:' + userId, 20, 3600). 429.
- Busy check: count generations in this workspace with status in ('queued','briefing','rendering') created in the last 30 minutes. If 2 or more: 409 { code: 'busy', message: 'Two generations are already running. Wait for one to finish.' }.
- Faces: the project's person_id (or the workspace's first person) must have at least 1 face_photos row with status 'ready'. Else 422 { code: 'no_faces' }.
- New generation (no regenerate_concept_id):
  1. checkLimit(ws, 'concepts', 6).
  2. Insert generations { status 'queued', concept_count 6, created_by }. Insert 6 concepts { idx 0..5, status 'queued' }.
  3. meter 6 rows: kind 'concepts', quantity 1, refId concept.id, idempotencyKey 'concept:' + concept.id, costMicros 0 (the worker records real cost on store).
  4. enqueue({ queue: 'ai', kind: 'concept_brief', refId: generation.id, key: 'brief:' + generation.id }).
- Regenerate one:
  1. Load the concept; it must belong to the project and its generation must be ready or partial. checkLimit(ws, 'concepts', 1).
  2. Insert a new concept in the same generation with idx = max(idx) + 1 (max 99), copying angle, layout, expression, image_model and accent from the parent, status 'queued', and payload { regenerate_of: parent.id }.
  3. meter 1 row with key 'concept:' + new.id. enqueue kind 'concept_brief' with key 'rebrief:' + new.id and payload { single_concept_id: new.id } (the worker asks Claude for one fresh concept with the same angle and a different idea).
- Return { ok: true, generation_id, concept_ids }.
- If any insert fails after metering, delete the rows you created and write refund rows, then return 500.

Deploy with JWT verification on.
Curl test:
curl -X POST "https://<ref>.supabase.co/functions/v1/mrq-generate" -H "Authorization: Bearer <USER_JWT>" -H "Content-Type: application/json" -d '{"project_id":"<uuid>"}'
Expected: {"ok":true,"generation_id":"...","concept_ids":[6 ids]}. Then run:
select kind, sum(quantity) from usage_ledger where workspace_id = '<ws>' group by 1;
and show me concepts = 6. A third call while two are running returns 409 busy.

Plan first, then wait for my OK.`,
  },
  {
    name: 'mrq-ai-worker',
    purpose: 'The AI background worker: Claude concept briefs, fal.ai renders, storing images, face cut-outs with expression tags, polling stuck fal jobs, with retries and refunds.',
    trigger: 'pg_cron every minute (x-cron-secret header)',
    secrets: ['ANTHROPIC_API_KEY', 'FAL_KEY', 'RESEND_API_KEY', 'EMAIL_FROM', 'CRON_SECRET', 'APP_URL'],
    prompt: `${shared}

Build supabase/functions/mrq-ai-worker/index.ts. Read @PRD.md sections 9.1, 9.2, 13.3, 14 and 15 first.

Contract:
- POST from pg_cron with x-cron-secret. requireCron. Deploy with --no-verify-jwt.
- rpc('release_stuck_jobs'), then rpc('claim_jobs', { p_queue: 'ai', p_limit: 8 }). Run jobs with at most 4 in parallel (Promise pool). Stop starting new jobs after 120 seconds.
- Also each run: find concepts with status 'submitted' and updated_at older than 10 minutes and enqueue poll_fal for each (key 'poll:' + concept.id + ':' + floor(epoch/600)).
- Every job in try/catch. Success: finish. Error: retryLater with maxTries 5 for concept_brief, 3 for the others. On the final failure run the job's onDead handler (below).

kind 'concept_brief':
1. Load the generation, project, the person's ready face_photos grouped by expression with counts, brand_kits colours, and (if the project has a video_id) the titles of up to 10 recent videos from the same channel.
2. Generation status 'briefing'.
3. callClaude with the system prompt from PRD 14.1 exactly (cached), user content with every user or YouTube text inside its tag (<title>, <topic>, <style>, <channel_titles>, <faces>), schema from 14.1 as zod + JSON schema, effort 'medium', maxTokens 8000.
4. Post-process exactly as PRD 14.1: unique angles (ask once more for any duplicates), max 2 ideogram, expressions limited to ones the person has (else pick the expression with most photos).
5. If payload.single_concept_id: ask for 1 concept with the given angle and "a different idea from: <previous headline>", fill only that concept row.
6. Else fill the 6 concept rows (angle, headline, subline, layout, expression, accent_hex, why, image_model, prompt built as PRD 15.2), save generations.brief, status 'rendering'.
7. meter kind 'ai_briefs' quantity 1 with the real costMicros, key 'brief:' + generation.id (or 'rebrief:' + concept.id).
8. Enqueue render_concept for each filled concept, key 'render:' + concept.id + ':' + concept.attempts.
onDead: generation 'failed' with error "Could not write ideas for this title. Try rewording the topic.", every queued concept 'failed', refund each concept credit.

kind 'render_concept':
1. Load the concept. If status is 'stored', finish (idempotent).
2. Model id from image_model: flux = 'fal-ai/flux-2-pro', ideogram = 'fal-ai/ideogram/v3'. Inputs exactly as PRD 15.2.
3. falSubmit(modelId, input, SUPABASE_URL + '/functions/v1/mrq-fal-webhook'). Save fal_request_id, status 'submitted', attempts + 1.
onDead: concept 'failed', error "This concept did not render. Your credit is back.", refund, then finishGeneration().

kind 'store_concept' (payload { request_id, image_url, content_type }):
1. Load the concept by fal_request_id. If stored, finish.
2. The image_url host must end with '.fal.media' or '.fal.ai' or 'fal.run' [verify the hosts fal returns]; otherwise fail the job (never fetch arbitrary URLs).
3. Download with a 30 s timeout. Check content-type starts with image/ and size under 10 MB.
4. Upload to bucket concepts at <ws>/<concept_id>.png (or .jpg/.webp from the content type), upsert true. Status 'stored', image_path set. Record cost: update the usage_ledger row with key 'concept:' + id to cost_micros (30000 for flux, 60000 for ideogram, from PRD 15.1; check fal's response for a real cost field and prefer it if present).
5. finishGeneration(generation_id): when no concept in the generation is queued, submitted or rendered: status 'ready' if all stored, 'partial' if some stored, 'failed' if none. Then, if ready or partial, sendEmail kind 'concepts_ready' to the creator (dedupe 'gen:' + generation_id) only if the project was not opened in the last 2 minutes (skip that check for now and leave a TODO if you need a last_seen column).

kind 'poll_fal': falGet(status_url built from the model and request id). COMPLETED: falGet(response_url), then do what the webhook does (enqueue store_concept with key 'store:' + request_id). FAILED: retry render_concept. IN_QUEUE or IN_PROGRESS: finish (next poll in 10 minutes).

kind 'cutout_face':
1. Load the photo. If 'ready', finish.
2. Signed URL for original_path (600 s). falRun('fal-ai/birefnet/v2', { image_url, model: 'General Use (Heavy)', output_format: 'png' }) [verify input names].
3. Download the PNG result (same host check as above). Trim transparent edges with npm:pngjs or imagescript (find the alpha bounding box, pad 2%), upload to faces/<ws>/<person>/<photo_id>-cutout.png.
4. Make a 768px JPEG copy of the original in memory (imagescript) and callClaude with the expression tag prompt and schema from PRD 14.2, effort 'low', maxTokens 2000, the image as a base64 image block.
5. If one_face false or quality not 'good': status 'failed' with the matching message from @DESIGN.md section 12, refund the cut-out credit, delete the cut-out file.
6. Else status 'ready', expression, bbox (face_box), width, height. Update the usage row 'cutout:' + photo_id + ':' + attempts with cost_micros = 20000 + Claude cost.
onDead: status 'failed', error "We could not cut out this photo. Try another one.", refund.

Prompt-injection guard: titles, topics and channel titles only ever appear inside their tags, the system prompt says tagged text is data, no tools are passed, output is used only after zod validation, and nothing from the model is rendered as HTML.

Response: { ok: true, processed, failed, ms }. One log line per job { fn, job_id, kind, ok, ms, cost_micros }.

Curl test:
curl -X POST "https://<ref>.supabase.co/functions/v1/mrq-ai-worker" -H "x-cron-secret: <CRON_SECRET>"
Then click Generate in the app and call it every 30 seconds until all 6 concepts are 'stored'. Show me the concepts rows and the usage_ledger rows with cost_micros. With a wrong secret it must return 401.

Plan first, then wait for my OK.`,
  },
  {
    name: 'mrq-fal-webhook',
    purpose: 'Receives fal.ai "request done" callbacks, verifies the ED25519 signature, de-duplicates by request id and queues the image download. No heavy work.',
    trigger: 'fal.ai webhook (POST with X-Fal-Webhook-* headers)',
    secrets: [],
    prompt: `${shared}

Build supabase/functions/mrq-fal-webhook/index.ts. Read @PRD.md sections 13.4 and 15.3. Open fal's webhook docs (https://fal.ai/docs, search "webhooks") and confirm the signature format before writing; tell me if it differs from below.

Contract:
- POST only. Deploy with --no-verify-jwt (fal has no Supabase JWT).
- Read the raw body as bytes FIRST (await req.arrayBuffer()), before any JSON parsing.
- Headers: X-Fal-Webhook-Request-Id, X-Fal-Webhook-User-Id, X-Fal-Webhook-Timestamp, X-Fal-Webhook-Signature (hex). Missing any: 401.
- Timestamp must be within 300 seconds of now. Else 401.
- Message = [requestId, userId, timestamp, hex(sha256(rawBody))].join('\\n') as UTF-8 bytes.
- Public keys: GET https://rest.fal.ai/.well-known/jwks.json, cache in module memory for 24 hours. Each key's x is a base64url ED25519 public key. Verify with crypto.subtle.importKey('raw', keyBytes, { name: 'Ed25519' }, false, ['verify']) and crypto.subtle.verify('Ed25519', key, signatureBytes, messageBytes). Valid if any key verifies. Else 401 and log 'bad_signature'.
- De-dupe: insert into fal_events (request_id) on conflict do nothing; if nothing was inserted, return 200 { ok: true, duplicate: true }.
- Parse the body: { request_id, gateway_request_id?, status: 'OK' | 'ERROR', payload, error? }. Validate with zod (passthrough for payload).
- Find the concept with fal_request_id = request_id (admin client). Unknown: return 200, log 'unknown_request'.
- status OK: take payload.images[0].url and content_type. enqueue({ queue: 'ai', kind: 'store_concept', refId: concept.id, payload: { request_id, image_url, content_type }, key: 'store:' + request_id }). Update the concept to 'rendered'.
- status ERROR: enqueue render_concept again with key 'render:' + concept.id + ':' + (concept.attempts) unless attempts >= 3, in which case mark the concept failed, refund and finishGeneration (import the helper from the worker's module or duplicate it in _shared/generation.ts).
- Return 200 { ok: true } in under 1 second. Never download images here.

Curl tests:
1. Without headers: curl -X POST "https://<ref>.supabase.co/functions/v1/mrq-fal-webhook" -d '{}' must return 401.
2. Real test: generate concepts in the app and watch the function logs (Supabase > Edge Functions > mrq-fal-webhook > Logs): each request logs ok with the request id, and a second delivery of the same id logs duplicate.
3. Show me select count(*) from fal_events; grows by 6 per generation.

Plan first, then wait for my OK.`,
  },
  {
    name: 'mrq-youtube-connect',
    purpose: 'Starts Google OAuth with a signed single-use state, handles the callback (tokens encrypted, channel saved, Reporting job created), and disconnects a channel (revoke and delete).',
    trigger: 'Browser POST /start and /disconnect (user JWT); Google redirect GET /callback',
    secrets: ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'OAUTH_STATE_SECRET', 'TOKEN_ENC_KEY', 'APP_URL'],
    prompt: `${shared}

Build supabase/functions/mrq-youtube-connect/index.ts with three routes on the URL path. Read @PRD.md sections 9.5, 12.2, 13.5 and 19.

Deploy with --no-verify-jwt (the Google callback has no JWT); the /start and /disconnect routes call requireUser themselves.

POST /mrq-youtube-connect/start  body { workspace_id }:
- requireUser, requireRole(ws, ['owner','admin']), requireAccess. Rate limit 'ytc:' + userId 10/hour.
- Count channels in the workspace with status <> 'disconnected'; if >= plan_limits.channels: 402 { code: 'limit_reached' }.
- nonce = newToken() (32 random bytes base64url). Insert oauth_states { nonce, workspace_id, user_id }.
- state = base64url(JSON { ws, uid, nonce, exp: now + 600 }) + '.' + base64url(HMAC-SHA256(OAUTH_STATE_SECRET, thatPayload)).
- Return { url } = https://accounts.google.com/o/oauth2/v2/auth with client_id, redirect_uri = SUPABASE_URL + '/functions/v1/mrq-youtube-connect/callback', response_type code, scope 'openid email https://www.googleapis.com/auth/youtube.force-ssl https://www.googleapis.com/auth/yt-analytics.readonly', access_type offline, prompt consent, include_granted_scopes true, state.

GET /mrq-youtube-connect/callback?code&state (or &error):
- Any problem redirects 302 to APP_URL + '/app/channels?error=<code>'. Never return JSON here.
- error=access_denied: error 'denied'.
- Verify the HMAC with a constant-time compare, exp not passed, then delete the oauth_states row by nonce and require that a row was deleted (single use). Else 'state'.
- POST https://oauth2.googleapis.com/token (code, client_id, client_secret, redirect_uri, grant_type authorization_code). No refresh_token in the answer: 'no_refresh' (tell the user to remove Marquee at myaccount.google.com/permissions and try again).
- Check the granted scope string contains youtube.force-ssl and yt-analytics.readonly, else 'scopes'.
- GET https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,contentDetails&mine=true with the access token. No items: 'no_channel'. spend_youtube_units(1).
- Upsert channels on (workspace_id, youtube_channel_id): title, avatar_url (snippet.thumbnails.default.url), subscriber_count, uploads_playlist_id (contentDetails.relatedPlaylists.uploads), google_email (from the id_token claims), status 'connected', connected_by.
- Upsert channel_tokens with refresh_token_enc and access_token_enc (AES-GCM), access_expires_at, scopes.
- Reporting job: GET https://youtubereporting.googleapis.com/v1/jobs (access token). If a job with reportTypeId 'channel_reach_basic_a1' exists, reuse its id; else POST https://youtubereporting.googleapis.com/v1/jobs { reportTypeId: 'channel_reach_basic_a1', name: 'marquee-reach' }. If the report type is not available for this channel (400/404), leave reach_job_id null and log 'no_reach_report' (the views fallback will be used). Save reach_job_id. [verify the report type id with GET /v1/reportTypes first]
- enqueue({ queue: 'youtube', kind: 'sync_videos', refId: channel.id, key: 'sync:' + channel.id + ':' + today }).
- Redirect 302 to APP_URL + '/app/channels?connected=1'.

POST /mrq-youtube-connect/disconnect body { channel_id }:
- requireUser, load the channel, requireRole(ws, ['owner','admin']).
- For every test on the channel in scheduled/running/collecting: set status 'cancelled', and if a rotation was ever set, restore the original now (call the same setThumbnail helper the YouTube worker uses, from _shared/youtube.ts) before revoking.
- POST https://oauth2.googleapis.com/revoke?token=<refresh token> (ignore 400 already revoked).
- Delete channel_tokens, reach_daily and video_daily rows for the channel and the channel's videos that no project or test uses. Set channel status 'disconnected', reach_job_id null.
- Return { ok: true }.

Tests:
1. In the app, click Connect YouTube and finish Google's screens with your test channel. You land on /app/channels?connected=1 and the channel shows Connected.
2. select status, reach_job_id is not null, uploads_playlist_id from channels; shows connected, true, UU...
3. select count(*) from channel_tokens; is 1, and select refresh_token_enc from channel_tokens; is not readable text.
4. Call the callback URL again with the same state (copy it from the logs): you are redirected with error=state.
5. Disconnect: Google's https://myaccount.google.com/permissions no longer lists Marquee.

Plan first, then wait for my OK.`,
  },
  {
    name: 'mrq-test-control',
    purpose: 'Starts, stops, applies and restores A/B tests: validates designs and plan caps, backs up the original thumbnail, freezes variant images and creates the balanced daily schedule.',
    trigger: 'Called by the browser from Start test, Stop test, Keep A/B and Restore (user JWT)',
    secrets: ['TOKEN_ENC_KEY', 'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'APP_URL'],
    prompt: `${shared}

Build supabase/functions/mrq-test-control/index.ts. Read @PRD.md sections 9.3, 12.3, 12.5, 13.6 and 16.

Contract: POST, JSON { action: 'start' | 'stop' | 'apply' | 'restore', ... } as a zod discriminated union. requireUser, then for every action requireRole(ws, ['owner','admin','editor']) and requireAccess. Rate limit 'test:' + userId 30/hour.

action 'start' { video_id, variants: array of 2 to 3 items, each { design_id } or { original: true } (at most one original), days: 8 | 9 | 16 | 18, auto_apply: boolean, min_impressions?: 200..100000, force_young?: boolean }:
1. Load the video and its channel (same workspace, channel status 'connected', else 409 { code: 'channel_not_ready' }).
2. days must match the count: 2 variants -> 8 or 16, 3 -> 9 or 18. Else 400.
3. Live tests: live_test_count(ws) < plan_limits.live_tests, else 402 { code: 'limit_reached' }.
4. No active test on this video (the partial unique index also enforces it; map a 23505 error to 409 { code: 'already_testing' }).
5. Video age: published_at older than 3 days unless force_young. Else 409 { code: 'too_new' } with the DESIGN.md microcopy.
6. Quota: read youtube_quota_days for today Pacific; if units_used > 85% of 9500, 409 { code: 'quota_full' }.
7. For each design: it belongs to the workspace and has export_path. Download the export from bucket exports, check the first bytes are FF D8 FF (JPEG) or 89 50 4E 47 (PNG), read width and height from the header (write a tiny SOF0/SOF2 parser for JPEG and the IHDR chunk for PNG), must be exactly 1280x720 and under 2,000,000 bytes. Else 422 { code: 'bad_export', message: 'Design <name> must be exported at 1280x720 under 2 MB. Open it and click Export.' }.
8. Backup: GET https://www.googleapis.com/youtube/v3/videos?part=snippet,status&id=<youtube_video_id> (spend_youtube_units(1)), check status.privacyStatus is public or unlisted, take snippet.thumbnails maxres, else standard, else high URL, download it, upload to originals/<ws>/<test_id>.jpg.
9. Insert tests (status 'scheduled', days, auto_apply, min_impressions, original_backup_path, created_by). Labels A, B, C in the order given (original first if present). For each variant copy the image to tests/<ws>/<test_id>/<label>.jpg (original uses the backup) and insert test_variants.
10. Schedule: start_day = tomorrow's Pacific date (pacificNow().date + 1). Pattern for 2 variants: A B B A B A A B (repeat for 16). For 3: A B C B C A C A B (repeat for 18). Insert one test_rotations row per day with the variant id, status 'pending'.
11. Return { ok: true, test_id, status: 'scheduled', start_day }.
If anything fails after step 8, delete the test (cascade) and the copied files, then return the error.

action 'stop' { test_id, keep: 'A' | 'B' | 'C' | 'original' }: test must be scheduled, running or collecting. Status 'cancelled'. If no rotation was ever set and keep is original, nothing to do. Else enqueue({ queue: 'youtube', kind: 'set_thumbnail', refId: test_id, payload: { image_path }, key: 'set:' + test_id + ':stop' }). Mark remaining pending rotations 'skipped'.
action 'apply' { test_id, label }: test must be decided or no_winner. Enqueue set_thumbnail with that variant's image (key 'set:' + test_id + ':apply:' + label). Set winner_variant_id if it was no_winner.
action 'restore' { test_id }: any finished test. Enqueue set_thumbnail with original_backup_path (key 'set:' + test_id + ':restore:' + epoch minute).

Deploy with JWT verification on.
Curl test (use ids from your database):
curl -X POST "https://<ref>.supabase.co/functions/v1/mrq-test-control" -H "Authorization: Bearer <USER_JWT>" -H "Content-Type: application/json" -d '{"action":"start","video_id":"<uuid>","variants":[{"original":true},{"design_id":"<uuid>"}],"days":8,"auto_apply":true}'
Expected: {"ok":true,"test_id":"...","status":"scheduled","start_day":"YYYY-MM-DD"}. Then:
select r.day, v.label, r.status from test_rotations r join test_variants v on v.id = r.variant_id where r.test_id = '<id>' order by r.day;
shows A B B A B A A B, all pending. The same call again returns 409 already_testing. A design that was never exported returns 422 bad_export.

Plan first, then wait for my OK.`,
  },
  {
    name: 'mrq-scheduler',
    purpose: 'Every 15 minutes works out the Pacific time and queues the day\'s thumbnail rotations, the daily YouTube data fetches, test state changes and decisions.',
    trigger: 'pg_cron every 15 minutes (x-cron-secret header)',
    secrets: ['CRON_SECRET'],
    prompt: `${shared}

Build supabase/functions/mrq-scheduler/index.ts. Read @PRD.md sections 12.1, 12.3, 13.7 and 6.3 point 5.

Contract:
- POST from pg_cron with x-cron-secret. requireCron. Deploy with --no-verify-jwt.
- const { date: today, hour, minute } = pacificNow(req).
- Rotations (when hour is 0 and minute >= 10): select test_rotations where day = today and status 'pending' and the test is scheduled or running and has no paused_reason. For each: enqueue({ queue: 'youtube', kind: 'rotate', refId: rotation.id, payload: { reserved: true }, key: 'rotate:' + test_id + ':' + today }). Set tests with start_day = today from 'scheduled' to 'running'. Before queuing, reserve their units: spend_youtube_units(50 * count, 10000) once (rotations may use the last 500 units the normal budget leaves free). If it returns false, queue them anyway and log 'quota_reserve_failed' loudly; the worker will retry.
- Missed days (any hour): rotations with day < today and status 'pending': set 'skipped' with error 'missed'.
- Daily data (when hour is 6): for each channel with a test in running or collecting: enqueue fetch_reach (key 'reach:' + channel_id + ':' + today) if reach_job_id is set, and fetch_video_daily per video (key 'vd:' + video_id + ':' + today). For every connected channel: sync_videos (key 'sync:' + channel_id + ':' + today).
- Collecting: tests in running whose last rotation day < today: status 'collecting'.
- Decide: tests in collecting: enqueue decide (key 'decide:' + test_id + ':' + today) when hour is 8 (after the 6 o'clock fetch has had time to run).
- Return { ok: true, today, hour, queued: { rotate, reach, video_daily, sync, decide } }.

Test with the debug header (only with ALLOW_DEBUG_NOW=true in Supabase secrets on your dev project):
curl -X POST "https://<ref>.supabase.co/functions/v1/mrq-scheduler" -H "x-cron-secret: <CRON_SECRET>" -H "x-debug-now: <tomorrow>T07:15:00Z"
(07:15 UTC is 00:15 Pacific in summer, 23:15 the day before in winter: pick 08:15Z in winter.) Expected: queued.rotate is 1 for your test, and select status from tests; shows running. Call it again: no second rotate job (same idempotency key).

Plan first, then wait for my OK.`,
  },
  {
    name: 'mrq-youtube-worker',
    purpose: 'The YouTube worker: sets thumbnails, downloads reach reports and Analytics numbers, syncs videos and decides winners with the balanced-day statistics, within the daily quota.',
    trigger: 'pg_cron every minute (x-cron-secret header)',
    secrets: ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'TOKEN_ENC_KEY', 'RESEND_API_KEY', 'EMAIL_FROM', 'CRON_SECRET', 'APP_URL'],
    prompt: `${shared}

Build supabase/functions/mrq-youtube-worker/index.ts and supabase/functions/_shared/youtube.ts. Read @PRD.md sections 9.3, 9.4, 12 and 13.8 first.

_shared/youtube.ts:
- setThumbnail(channelId, youtubeVideoId, bytes, contentType, { reserved }): unless reserved is true (rotations the scheduler already paid for), spend_youtube_units(50) (false: throw HttpError(429, 'quota')), getAccessToken, POST https://www.googleapis.com/upload/youtube/v3/thumbnails/set?videoId=<id>&uploadType=media with Authorization Bearer and Content-Type image/jpeg (or png), body = bytes. 200: return the new thumbnail URL from items[0]. 403 with reason forbidden: throw HttpError(403, 'thumbnails_not_allowed'). 401: refresh once and retry. Check the docs for the exact upload URL and error reasons before writing.
- decideTest(test, variants, rotations, reachRows, videoDaily): pure function, no I/O, with unit tests (deno test) covering: a clear winner, too few impressions, a winner on aggregate that loses the pairs check, the clickbait guardrail, and the views fallback. Maths exactly as PRD 12.4: Beta(1 + clicks, 1 + impressions - clicks) per variant, 20,000 draws with a seeded PRNG (mulberry32 seeded from the first 8 hex chars of the test id), Beta sampling via two Gamma draws (Marsaglia and Tsang), blocks of 2 days (2 variants) or 3 days (3 variants), guardrail at 90% of the runner-up's average view duration. Returns the decision JSON from PRD 12.4.

index.ts contract:
- POST from pg_cron with x-cron-secret. requireCron. Deploy with --no-verify-jwt.
- release_stuck_jobs, claim_jobs({ p_queue: 'youtube', p_limit: 20 }). Run jobs one channel at a time (group by channel), up to 4 channels in parallel. Stop after 120 s.
- Errors: HttpError 429 'quota' re-queues the job for 00:05 Pacific tomorrow without counting an attempt. 409 'needs_reauth' finishes the job (the channel is paused) and sends channel_reauth (dedupe 'reauth:' + channel + ':' + date). Others: retryLater, maxTries 4.

kind 'rotate' (refId = rotation id):
1. Load rotation, test, variant, video. If rotation status is 'set' or day <> today Pacific, finish (idempotent; a late job never sets yesterday's thumbnail).
2. Download the variant image from bucket tests. setThumbnail with { reserved: job.payload.reserved === true && job.attempts === 0 } (a retry pays again). Update rotation status 'set', set_at, attempts + 1.
3. If this is the test's first set rotation: sendEmail test_started to the creator (dedupe 'started:' + test_id).
4. 403 thumbnails_not_allowed: rotation 'failed', test 'failed' with paused_reason 'thumbnails_not_allowed', remaining rotations 'skipped', send test_failed. If any earlier rotation was set, enqueue set_thumbnail with the original.
5. After 4 failed attempts on the same rotation: rotation 'failed'. If a test has 3 failed rotations: test 'failed', restore the original, send test_failed.

kind 'set_thumbnail' (payload { image_path, bucket? }): download, setThumbnail, finish. Used by stop, apply, restore and auto-apply.

kind 'fetch_reach' (refId = channel id):
1. GET https://youtubereporting.googleapis.com/v1/jobs/<reach_job_id>/reports?createdAfter=<last_reach_report_at or 10 days ago> (the Reporting API has its own quota, it does not use Data API units [verify]).
2. For each report (oldest first), GET its downloadUrl with the Bearer token. Parse the CSV (header row names the columns: date, channel_id, video_id, video_thumbnail_impressions, video_thumbnail_impressions_ctr). Date format is YYYYMMDD.
3. Keep only rows whose video_id belongs to a video with a test in running, collecting or decided in the last 14 days. Normalise ctr: if any value in the file is above 1, divide all by 100 (and log 'ctr_percent' once). Upsert reach_daily on (channel_id, youtube_video_id, day): backfilled reports replace earlier numbers.
4. Update channels.last_reach_report_at to the newest report's createTime.
5. Recompute every affected test's variant totals: for days with a rotation in 'set', impressions = sum, clicks = sum(round(impressions * ctr)). Also compute the live estimate (decideTest with the running flag) and store p_best per variant so the UI can show "B is ahead, 81% sure".

kind 'fetch_video_daily' (refId = video id): GET https://youtubeanalytics.googleapis.com/v2/reports?ids=channel==MINE&startDate=<10 days ago>&endDate=<today>&metrics=views,estimatedMinutesWatched,averageViewDuration&dimensions=day&filters=video==<youtube_video_id>. Upsert video_daily. Update variant views, watch_minutes and avg_view_duration_sec (weighted by views) for set days.

kind 'decide' (refId = test id):
1. Test must be collecting. Data is complete when every 'set' rotation day has a reach_daily row, or 5 days have passed since the last day (then use what exists). If neither: finish (the scheduler asks again tomorrow).
2. method: 'reach_ctr' if reach rows exist for at least 75% of set days, else 'views'.
3. decision = decideTest(...). Save tests.decision, winner_variant_id, p_best per variant, status 'decided' or 'no_winner'.
4. decided and auto_apply: enqueue set_thumbnail with the winner image (key 'set:' + test_id + ':winner'). Send test_decided with the winner and loser thumbnails (signed URLs valid 7 days), lift and confidence. no_winner: send test_no_winner with the reason. If auto_apply and no winner, enqueue set_thumbnail with the original.

kind 'sync_videos' (refId = channel id): playlistItems.list?part=contentDetails&playlistId=<uploads>&maxResults=50 (1 unit), then videos.list?part=snippet,contentDetails,status,statistics&id=<up to 50 ids> (1 unit). Upsert videos (title, published_at, duration_sec from ISO 8601, privacy_status, thumbnail_url, view_count). Update channels.last_synced_at. For videos with a running test, compare the live thumbnail URL with the one returned when we set it today; if it differs, mark today's rotation 'skipped' with error 'changed_in_studio' [verify that the URL changes when a thumbnail changes].

Response: { ok: true, processed, failed, ms }. One log line per job { fn, job_id, kind, ok, ms, units }.

Tests:
1. deno test supabase/functions/_shared/youtube.test.ts: all 5 decideTest cases pass.
2. Start a test on a real (unlisted is fine) video, run the scheduler with the debug header, then this worker: curl -X POST "https://<ref>.supabase.co/functions/v1/mrq-youtube-worker" -H "x-cron-secret: <CRON_SECRET>". Open the video in YouTube Studio: the thumbnail is variant A within a few minutes. select status, set_at from test_rotations order by day limit 1; shows set.
3. select * from youtube_quota_days; shows 50 more units for today.

Plan first, then wait for my OK.`,
  },
]
