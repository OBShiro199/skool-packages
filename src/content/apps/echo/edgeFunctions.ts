// Echo edge functions: one Claude Code prompt per function.
import type { EdgeFunctionDef } from '../../types'

const shared = `First, if supabase/functions/_shared/ does not exist yet, create these helpers (read @PRD.md section 13 intro):
1. admin.ts: adminClient() with Deno.env.get('SUPABASE_URL') and Deno.env.get('SUPABASE_SECRET_KEY') (fall back to SUPABASE_SERVICE_ROLE_KEY), auth: { persistSession: false }.
2. auth.ts: requireUser(req) reads the Bearer token, calls supabase.auth.getClaims(token) with a publishable-key client, returns { userId, email } or throws HttpError(401). requireMember(ws, roles?) calls is_workspace_member / has_workspace_role through a client that carries the user's JWT (so auth.uid() works) and throws 403. requireAccess(ws) calls has_active_access with the admin client and throws 402 { code: 'paused' }. requireCron(req) compares x-cron-secret with CRON_SECRET in constant time. requireInternal(req) does the same with the x-internal header (used when one function calls another).
3. http.ts: HttpError(status, code, message), json(body, status), CORS headers for APP_URL and http://localhost:3000, OPTIONS handler. Error body: { error: { code, message } }.
4. log.ts: log(fn, data) prints one JSON line. Never log tokens, transcripts, voice samples, emails or API keys.
5. retry.ts: withRetry(fn, { tries: 3, baseMs: 800 }) with exponential backoff + jitter, honours retry-after, retries only 429 and 5xx.
6. limits.ts: checkLimit(ws, kind, qty) reads plan_limits(ws) and usage_this_month(ws, kind) with the admin client and throws HttpError(402, 'limit_reached', "You have used X of Y <thing> this month. Upgrade for more, or wait until <1st of next month>."). kind 'audio_minutes' shows hours with one decimal.
7. meter.ts: meter({ ws, userId, kind, quantity, costMicros, refId, idempotencyKey }) inserts usage_ledger with upsert ignoreDuplicates on idempotency_key. After inserting, if usage for that kind has now crossed 80% of the limit, send the usage_80 email (dedupe key u80:<ws>:<yyyy-mm>:<kind>).
8. claude.ts: callClaude({ system, cachedBlocks, userContent, schema, zodSchema, maxTokens, stream }) using npm:@anthropic-ai/sdk, model 'claude-sonnet-5-5', structured output via output_config.format { type: 'json_schema', schema } (check the current structured outputs docs for the exact field names before writing this and tell me if they differ). System prompt and every cached block marked cache_control { type: 'ephemeral' }. stop_reason 'refusal' throws HttpError(422, 'ai_refused'), 'max_tokens' throws HttpError(502, 'ai_truncated'). Parse the text block as JSON and validate with zodSchema. Return { data, usage, costMicros }. Prices in micro-dollars per token equal $ per million tokens: input 2, cache read 0.2, cache write 2.5, output 10. costMicros = round(input_tokens*2 + cache_read_input_tokens*0.2 + cache_creation_input_tokens*2.5 + output_tokens*10).
9. transcriptBlock.ts: formatTranscript(utterances, speakers) returns "[mm:ss] Name: text" lines (h:mm:ss over an hour) wrapped in <transcript duration_ms="...">...</transcript>. voiceBlock(card) returns <voice_card>JSON</voice_card> or an empty string.
10. email.ts: sendEmail({ ws, kind, to, subject, html, text, dedupeKey }) checks email_suppressions and profiles.email_prefs, inserts email_log first (on conflict dedupe_key do nothing, return if it existed), then POST https://api.resend.com/emails with Authorization: Bearer RESEND_API_KEY and from EMAIL_FROM, then updates resend_id and status.
11. safeFetch.ts: safeFetch(url, { method, headers, maxBytes, timeoutMs }) exactly as @PRD.md 12.6: http/https only, ports 80/443, block localhost, .local, .internal and private, loopback, link-local and unique-local IP literals, resolve DNS with Deno.resolveDns where allowed and check every answer, redirect 'manual' with max 3 hops re-checked, 10 s timeout, stop reading after maxBytes. Write 8 deno tests (169.254.169.254, 127.0.0.1, [::1], 10.0.0.5, localhost, http://x.internal, a redirect to a private IP, a good https URL).
12. remotion.ts: re-exports renderMediaOnLambda, getRenderProgress and presignUrl from npm:@remotion/lambda-client@<same version as remotion in package.json> (see Remotion's "Supabase Edge Functions" guide; if presignUrl is not in that package, tell me and use an AWS S3 presigner from npm:@aws-sdk/s3-request-presigner). Reads REMOTION_AWS_ACCESS_KEY_ID, REMOTION_AWS_SECRET_ACCESS_KEY, REMOTION_AWS_REGION, REMOTION_FUNCTION_NAME, REMOTION_SERVE_URL.
13. crypto.ts: timingSafeEqual(a, b) for strings (encode both, different length = false), hmacSha512Hex(secret, body) with crypto.subtle.
Then build the function below.`

export const edgeFunctions: EdgeFunctionDef[] = [
  {
    name: 'ech-start-transcription',
    purpose: 'Checks access, plan limits and in-flight caps, estimates the length safely, then sends the uploaded file or the RSS enclosure to AssemblyAI with a webhook and a secret header.',
    trigger: 'Called by the browser after upload (user JWT), or internally by ech-rss-poll and /api/episodes/[id]/process (x-internal header)',
    secrets: ['ASSEMBLYAI_API_KEY', 'ASSEMBLYAI_WEBHOOK_SECRET', 'CRON_SECRET', 'APP_URL'],
    prompt: `${shared}

Build supabase/functions/ech-start-transcription/index.ts. Read @PRD.md sections 9.1, 11.1 to 11.3, 12.4 and 13.1.

Contract:
- POST, JSON { episode_id: uuid }. Validate with zod (npm:zod). 400 on bad input.
- Auth: if the x-internal header is present, requireInternal and skip the user checks (userId = episode.created_by). Otherwise requireUser, load the episode with adminClient, requireMember(episode.workspace_id).
- requireAccess(ws). Rate limit: rpc try_rate_limit('start:' + userId, 20, 3600), 429 rate_limited if false.
- State: status must be 'uploading', 'imported' or 'failed', else 409 wrong_state. If assemblyai_id is set and status is 'transcribing', return 200 { ok: true, status: 'transcribing' } (idempotent).
- In flight: rpc transcriptions_in_flight(ws) >= 3 returns 429 too_many_in_flight with "Three episodes are already transcribing. This one will start when one finishes." (the UI retries after 60 s).
- Source URL:
  - upload: list the folder in bucket episode-audio and match the file at audio_path (404 file_missing if absent). Read its size from the object metadata and save file_size_bytes (admin client). createSignedUrl(audio_path, 21600).
  - rss: enclosure_url, checked with safeFetch HEAD (follow up to 3 safe redirects, use the final URL). Read Content-Length if present.
- Estimated minutes (never trust the browser): upload = ceil(max(reported_duration_sec, file_size_bytes / 8000) / 60). rss = ceil(max(reported_duration_sec, content_length / 16000) / 60). If neither exists for rss, use reported_duration_sec or 60 minutes.
- Limits: estimate > max_episode_minutes returns 402 episode_too_long with the DESIGN.md 15 "Too long" copy. checkLimit(ws, 'audio_minutes', estimate).
- Keyterms: up to 20 terms: the show name, speaker names already used on this show's past transcripts, and capitalised names in the episode title.
- POST https://api.assemblyai.com/v2/transcript with header authorization: ASSEMBLYAI_API_KEY (no Bearer) and body { audio_url, speech_models: ['universal-3-pro', 'universal-2'], speaker_labels: true, language_detection: true, keyterms_prompt, webhook_url: SUPABASE_URL + '/functions/v1/ech-assemblyai-webhook', webhook_auth_header_name: 'x-echo-webhook', webhook_auth_header_value: ASSEMBLYAI_WEBHOOK_SECRET }. Before writing this, check the AssemblyAI API reference for the current model ids (Universal-3.5 Pro may have its own id), the keyterms field name, and whether speech_models (plural) is current. If the docs differ, follow the docs and tell me. Wrap in withRetry.
- On success: update episodes set assemblyai_id, status 'transcribing', error null. Return { ok: true, status: 'transcribing' }.
- On AssemblyAI failure after retries: status 'failed', error "The transcription service did not accept the file. Try again in a minute.", return 502 transcriber_unavailable.
- Log { fn, episode_id, ws, estimate_min, ms } only.

Deploy with JWT verification off (it checks the JWT itself so the x-internal path works): npx supabase functions deploy ech-start-transcription --no-verify-jwt
Curl tests:
curl -X POST "https://<ref>.supabase.co/functions/v1/ech-start-transcription" -H "Authorization: Bearer <USER_JWT>" -H "Content-Type: application/json" -d '{"episode_id":"<uuid>"}'
Expected {"ok":true,"status":"transcribing"}. No Authorization header: 401. Another user's JWT: 403. Set a workspace_limit_overrides row with audio_minutes 1 and try again: 402 limit_reached and no AssemblyAI call in the logs.

Plan first, then wait for my OK.`,
  },
  {
    name: 'ech-assemblyai-webhook',
    purpose: 'Receives AssemblyAI "transcript ready" callbacks, checks the secret header and queues a fetch job. Does no heavy work.',
    trigger: 'AssemblyAI webhook (POST with x-echo-webhook header)',
    secrets: ['ASSEMBLYAI_WEBHOOK_SECRET'],
    prompt: `${shared}

Build supabase/functions/ech-assemblyai-webhook/index.ts. Read @PRD.md sections 12.3 and 13.2.

Contract:
- POST only. Deploy with --no-verify-jwt (AssemblyAI has no Supabase JWT).
- Auth: timingSafeEqual(header x-echo-webhook, ASSEMBLYAI_WEBHOOK_SECRET). 401 on mismatch, before reading the body.
- Body: { transcript_id: string, status: 'completed' | 'error' }. Validate with zod. On invalid body return 200 and log 'bad_body' (a bad body will never get better, and a 4xx makes AssemblyAI retry).
- Look up episodes by assemblyai_id = transcript_id with the admin client. Unknown: return 200 and log 'unknown_transcript'.
- Insert a jobs row { workspace_id, kind: 'fetch_transcript', ref_id: episode.id, idempotency_key: 'fetch:' + transcript_id, payload: { status } } with upsert ignoreDuplicates. This is the de-duplication: AssemblyAI may send the same webhook more than once.
- Return 200 { ok: true } in under 1 second. Never call AssemblyAI or Claude here.

Curl tests:
curl -X POST "https://<ref>.supabase.co/functions/v1/ech-assemblyai-webhook" -H "x-echo-webhook: <SECRET>" -H "Content-Type: application/json" -d '{"transcript_id":"test-123","status":"completed"}'
Expected 200. Same with a wrong header: 401. First set a test episode's assemblyai_id to test-123 with the Supabase MCP, send the good request twice, and show me jobs has exactly one row with idempotency_key 'fetch:test-123'.

Plan first, then wait for my OK.`,
  },
  {
    name: 'ech-worker',
    purpose: 'The background worker. Fetches transcripts, runs the three Claude calls with a cached transcript, checks quotes word for word, writes assets, builds voice cards, meters every call, retries with backoff and cleans up old audio.',
    trigger: 'pg_cron every minute (x-cron-secret header)',
    secrets: ['ASSEMBLYAI_API_KEY', 'ANTHROPIC_API_KEY', 'RESEND_API_KEY', 'EMAIL_FROM', 'CRON_SECRET', 'APP_URL', 'REMOTION_AWS_ACCESS_KEY_ID', 'REMOTION_AWS_SECRET_ACCESS_KEY', 'REMOTION_AWS_REGION', 'REMOTION_FUNCTION_NAME'],
    prompt: `${shared}

Build supabase/functions/ech-worker/index.ts. Read @PRD.md sections 9, 13.3, 14 and 19 first.

Contract:
- POST from pg_cron with x-cron-secret. requireCron. Deploy with --no-verify-jwt.
- rpc('release_stuck_jobs'), then rpc('claim_jobs', { p_limit: 5 }). Process one at a time. Stop starting new jobs after 110 seconds of wall time and leave the rest for the next run.
- Every job in try/catch. Success: status 'done'. Error: attempts + 1, last_error = message (no secrets, no transcript text), status 'queued', run_after = now() + 2^attempts minutes + random 0 to 30 s. At attempts = 5: status 'dead', mark the episode (fetch_transcript) or the asset(s) of that job failed with a human error, and send job_failed to the uploader. HttpError 402 limit_reached: mark failed with its message and do not retry.

kind 'fetch_transcript':
1. GET https://api.assemblyai.com/v2/transcript/{assemblyai_id}. 'queued' or 'processing': re-queue in 2 minutes without counting an attempt. 'error': episode failed with "Transcription failed: <AssemblyAI error>".
2. Build utterances [{ speaker, text, start, end }] and words [{ text, start, end, speaker }] (drop confidence to save space). word_count. Under 200 words: failed "We could not hear a conversation in this file."
3. density: split the duration into 600 equal buckets and count words per bucket (int array).
4. Upsert transcripts (speakers default { A: 'Speaker A', B: 'Speaker B', ... } unless the show has names saved on its last episode for the same letters; keep it simple: default letters). Update episodes duration_sec = round(audio_duration), status 'transcribed'.
5. meter 'audio_minutes' quantity ceil(audio_duration / 60), costMicros = round(audio_duration / 3600 * 0.23 * 1e6), idempotencyKey 'minutes:' + episode.id.
6. Insert the 8 episode_assets rows (titles, show_notes, chapters, quotes, clip_ideas, newsletter, social, blog) with status 'pending', on conflict do nothing. Enqueue gen_core with idempotency_key 'core:' + episode.id.

kind 'gen_core':
1. Episode status 'generating'. Load transcript, show (name, voice_card).
2. callClaude: system = PRD 14.1 preamble; cachedBlocks = [voiceBlock(card), formatTranscript(...)]; userContent = PRD 14.2 task with the show name inside <show_name>. Schema 14.2. maxTokens 12000, stream true (use finalMessage()).
3. Server fixes from 14.2: chapters sorted, first forced to 0, drop past duration or under 60 s apart, start_sec = round(start_ms/1000). Clip ideas clamped to 30 to 60 s inside the duration.
4. Quote check exactly as PRD 14.6 (normalise, substring or 90% token match within the window plus 5 s, snap times to word times). Fewer than 3 survivors: retry the call once with "Your quotes were not word for word. Copy them exactly." added; then keep what survives.
5. Update the 5 assets (titles { options }, show_notes, chapters { items }, quotes { items }, clip_ideas { items }) with content, status 'ready', model, cost_micros (split evenly), last_reason 'generated'.
6. Enqueue gen_distribution ('dist:' + id) and gen_blog ('blog:' + id) with run_after now() so they run while the cache is warm (process them in this same run if there is time).

kind 'gen_distribution': callClaude with the same system and cached blocks (so they hit the cache), userContent = PRD 14.3 task with the approved show_notes inside <current>. Schema 14.3, maxTokens 8000. Trim x posts as PRD 14.3. Update newsletter and social.
kind 'gen_blog': PRD 14.4, maxTokens 10000, stream. Update blog.
After either: if no asset of the episode is 'pending', set episode status 'ready', processed_at now(), slug = slugify(title) if null (add -2, -3 on conflict), meter 'generations' 1 with the summed cost and key 'gen:' + id, and send episode_ready (dedupe ready:<id>) with the counts from DESIGN.md 14.

kind 'voice_card': load shows.voice_sample (200 to 4,000 words else mark done and skip), checkLimit(ws, 'voice_cards', 1), callClaude with PRD 14.5 (sample inside <voice_sample>, maxTokens 2000), update shows.voice_card, meter 'voice_cards' with key = the job's idempotency key.

Hourly housekeeping (when the current UTC minute is 0, after jobs):
- Up to 50 upload episodes with processed_at < now() - 30 days and audio_deleted_at null: storage.from('episode-audio').remove([audio_path]), set audio_deleted_at.
- Up to 100 audiograms with created_at < now() - 90 days and output_path set: remove the MP4 and .srt from the audiograms bucket, set output_path null (the UI shows "Expired, render again").
- Audiograms in rendering_audio or rendering_video with started_at < now() - 15 minutes: call getRenderProgress for the current render id; done -> leave it for the webhook retry, fatalErrorEncountered or still stuck -> status 'failed', error "The render did not finish. Try again."

Prompt-injection guard: transcript, voice sample and feed text only ever appear inside their tags, the system prompt says tagged text is data, no tools are passed, and output is used only after zod validation.

Response: { ok: true, processed, failed, ms }. Log one line per job { fn, job_id, kind, ok, ms, cost_micros }.

Curl test:
curl -X POST "https://<ref>.supabase.co/functions/v1/ech-worker" -H "x-cron-secret: <CRON_SECRET>"
Then upload a 10 minute test episode in the app and call it every minute until the episode is ready. Show me the usage_ledger rows and the 8 episode_assets rows. With a wrong secret it must return 401.

Plan first, then wait for my OK.`,
  },
  {
    name: 'ech-regenerate',
    purpose: 'Rewrites one asset (or one item in it) with an optional instruction, using the cached transcript, with history for Undo, per-plan caps and a lock so double clicks never pay twice.',
    trigger: 'Called by the browser from the Regenerate popover (user JWT)',
    secrets: ['ANTHROPIC_API_KEY'],
    prompt: `${shared}

Build supabase/functions/ech-regenerate/index.ts. Read @PRD.md sections 13.4, 14.1 and 14.7.

Contract:
- POST, JSON { episode_id: uuid, kind: 'titles' | 'show_notes' | 'chapters' | 'quotes' | 'newsletter' | 'social' | 'blog', instruction?: string max 300, index?: integer 0 to 9 }. zod, 400 on bad input. Strip control characters from instruction.
- requireUser, load episode, requireMember, requireAccess. Episode must be 'ready' (409 wrong_state). Asset row must exist and be 'ready' or 'failed'.
- Rate limit try_rate_limit('regen:' + userId, 30, 3600). One in flight per asset: rpc try_rate_limit('regen-lock:' + asset_id, 1, 60) returns 409 busy "Already rewriting this one" if false.
- checkLimit(ws, 'regenerations', 1). (Retrying a failed asset is free: skip checkLimit and meter when the asset status is 'failed'.)
- callClaude: same system and cached blocks as the worker (voice card, transcript), userContent = PRD 14.7 with the current content as JSON in <current> and the instruction in <instruction>. The schema is the same one the worker uses for that kind (export the schemas from _shared/schemas.ts and reuse them in the worker). If index is set (titles or social only), ask for one item and merge it into the array at index on the server. For quotes, run the 14.6 quote check again.
- Update the asset: content, status 'ready', last_reason 'regenerated', model, cost_micros, updated_by userId (the trigger writes history and bumps version).
- meter 'regenerations' 1 with the real cost, idempotencyKey 'regen:' + asset_id + ':' + new version.
- Response: { ok: true, asset: { kind, version, content } }.
- Errors: 402 limit_reached, 409 busy, 422 ai_refused ("Echo could not rewrite this with that instruction. Try different wording."), 502 ai_unavailable after withRetry.

Deploy with JWT verification on (default).
Curl test:
curl -X POST "https://<ref>.supabase.co/functions/v1/ech-regenerate" -H "Authorization: Bearer <USER_JWT>" -H "Content-Type: application/json" -d '{"episode_id":"<uuid>","kind":"social","instruction":"more playful","index":0}'
Expected { ok: true, asset: { kind: "social", version: N+1, ... } } with only post 0 changed. Fire the same request 3 times at once: one succeeds, the others get 409 busy, and usage_ledger gets exactly one row. With an override of regenerations 0: 402.

Plan first, then wait for my OK.`,
  },
  {
    name: 'ech-render-audiogram',
    purpose: 'Validates a 30 to 60 second clip, checks the audiogram cap, builds word captions from the transcript and starts step 1 of the Remotion Lambda render (cut the clip audio to WAV).',
    trigger: 'Called by the browser from the audiogram dialog (user JWT)',
    secrets: ['REMOTION_AWS_ACCESS_KEY_ID', 'REMOTION_AWS_SECRET_ACCESS_KEY', 'REMOTION_AWS_REGION', 'REMOTION_FUNCTION_NAME', 'REMOTION_SERVE_URL', 'REMOTION_WEBHOOK_SECRET'],
    prompt: `${shared}

Build supabase/functions/ech-render-audiogram/index.ts. Read @PRD.md sections 9.4, 11.5 and 13.5 and @DESIGN.md section 9.

Contract:
- POST, JSON { episode_id: uuid, start_ms: integer, end_ms: integer, style: 'bars' | 'line' | 'minimal', title?: string max 80 }. zod, 400.
- requireUser, load episode + show, requireMember, requireAccess. Episode status 'ready'.
- Window: end_ms - start_ms between 30000 and 60000 and end_ms <= duration_sec * 1000, else 400 bad_window "Pick 30 to 60 seconds inside the episode."
- Audio source: upload with audio_deleted_at null -> createSignedUrl(audio_path, 7200); rss -> enclosure_url. Neither -> 410 audio_expired with the DESIGN.md 15 copy.
- Rate limit try_rate_limit('ag:' + userId, 20, 3600). In flight: count audiograms in queued/rendering_* for the workspace >= 5 -> 429 "Five audiograms are already rendering. Try again in a couple of minutes."
- checkLimit(ws, 'audiograms', 1).
- Captions: from transcripts.words, take words with start >= start_ms - 200 and end <= end_ms + 200, map to { text, startMs: start - start_ms, endMs: end - start_ms, timestampMs: null, confidence: null } (the @remotion/captions Caption type; check it in the Remotion docs). Clamp to 0 and the clip length. Prefix the first word of each new speaker turn with nothing (no names in captions).
- Insert audiograms { workspace_id, episode_id, show_id, style, title: title ?? episode.title, start_ms, end_ms, caption_words, status 'queued', created_by }.
- Step 1: renderMediaOnLambda({ region, functionName, serveUrl: REMOTION_SERVE_URL, composition: 'ClipAudio', codec: 'wav', inputProps: { src, startMs: start_ms, endMs: end_ms }, privacy: 'private', downloadBehavior: { type: 'play-in-browser' }, webhook: { url: SUPABASE_URL + '/functions/v1/ech-remotion-webhook', secret: REMOTION_WEBHOOK_SECRET, customData: { audiogram_id, step: 'audio' } } }). Check the renderMediaOnLambda docs for: audio-only codecs, the webhook option shape, customData size limits and a deleteAfter option for temporary outputs (use '1-day' if it exists). If anything differs, follow the docs and tell me.
- Save audio_render_id = renderId, render_bucket = bucketName, status 'rendering_audio', started_at now(). Return { ok: true, audiogram_id }.
- On Lambda failure (withRetry on throttling): status 'failed', error "The renderer is busy. Try again in a minute.", 502 renderer_unavailable. No meter row (we meter on success in the webhook).

Curl test:
curl -X POST "https://<ref>.supabase.co/functions/v1/ech-render-audiogram" -H "Authorization: Bearer <USER_JWT>" -H "Content-Type: application/json" -d '{"episode_id":"<uuid>","start_ms":60000,"end_ms":105000,"style":"bars"}'
Expected { ok: true, audiogram_id }. Then in the Remotion/AWS console (or with npx remotion lambda renders ls) see the render. A 20 second window returns 400 bad_window.

Plan first, then wait for my OK.`,
  },
  {
    name: 'ech-remotion-webhook',
    purpose: 'Receives Remotion Lambda render callbacks, verifies the HMAC-SHA512 signature, de-duplicates, starts step 2 after the audio step, and copies the finished MP4 into Supabase Storage.',
    trigger: 'Remotion Lambda webhook (POST with X-Remotion-Signature)',
    secrets: ['REMOTION_WEBHOOK_SECRET', 'REMOTION_AWS_ACCESS_KEY_ID', 'REMOTION_AWS_SECRET_ACCESS_KEY', 'REMOTION_AWS_REGION', 'REMOTION_FUNCTION_NAME', 'REMOTION_SERVE_URL', 'RESEND_API_KEY', 'EMAIL_FROM', 'APP_URL'],
    prompt: `${shared}

Build supabase/functions/ech-remotion-webhook/index.ts. Read @PRD.md sections 9.4, 12.3 and 13.6.

Contract:
- POST only, --no-verify-jwt.
- Read the raw body as text FIRST (await req.text()). Signature: header X-Remotion-Signature must equal 'sha512=' + hmacSha512Hex(REMOTION_WEBHOOK_SECRET, rawBody), compared with timingSafeEqual. 'NO_SECRET_PROVIDED' or mismatch -> 401. Check Remotion's webhooks docs for the exact header names (X-Remotion-Signature, X-Remotion-Status, X-Remotion-Mode) and the payload shape before writing; Remotion also ships validateWebhookSignature() but it takes a parsed object, so verify the raw string yourself.
- Then JSON.parse and validate with zod: { type: 'success' | 'error' | 'timeout', renderId: string, bucketName?: string, outputUrl?: string, outputFile?: string, customData: { audiogram_id: uuid, step: 'audio' | 'video' }, errors?: array, costs?: object }.
- De-dupe: insert remotion_events { id: renderId + ':' + type, audiogram_id, type }. Conflict -> return 200 { ok: true, duplicate: true }.
- Load the audiogram by id AND check its audio_render_id (step audio) or video_render_id (step video) equals renderId. Mismatch -> 200 and log 'render_mismatch' (never trust customData alone).
- type error/timeout: status 'failed', error "The render did not finish. Try again." Return 200.
- step audio + success: presign the WAV (presignUrl({ region, bucketName, objectKey: outputFile key, expiresInSeconds: 3600 }), or the S3 presigner fallback), load show (artwork public URL from show-art, accent_hex, name), then renderMediaOnLambda({ composition: 'Audiogram', codec: 'h264', framesPerLambda: 300, inputProps: { audioUrl, captions: caption_words, artworkUrl, title, showName, accentHex, style, durationMs: end_ms - start_ms }, privacy: 'private', webhook: { ..., customData: { audiogram_id, step: 'video' } } }). Save video_render_id, status 'rendering_video', progress 0.5.
- step video + success: fetch the MP4 through a presigned URL (reject over 50 MB), upload to audiograms/<ws>/<id>.mp4 with contentType video/mp4 (admin client), also upload a .srt of the captions next to it. Set output_path, status 'ready', progress 1, cost_micros from payload costs (accruedSoFar in dollars x 1e6 if present [verify], else 60000). meter 'audiograms' 1 with key 'ag:' + id. If no other audiogram for this episode is still rendering, send audiograms_ready (dedupe ags:<episode_id>:<yyyy-mm-dd-hh>).
- Always return 200 after a valid signature, even when our own processing fails (log it and set the audiogram failed), so Remotion does not hammer us. Log { fn, audiogram_id, step, type, ms }.

Curl tests (signature):
BODY='{"type":"success","renderId":"r1","customData":{"audiogram_id":"<uuid>","step":"audio"}}'
SIG=$(printf '%s' "$BODY" | openssl dgst -sha512 -hmac "<REMOTION_WEBHOOK_SECRET>" | sed 's/^.* //')
curl -X POST "https://<ref>.supabase.co/functions/v1/ech-remotion-webhook" -H "Content-Type: application/json" -H "X-Remotion-Signature: sha512=$SIG" -d "$BODY"
Expected 200 (render_mismatch logged, since r1 is not a real render). Same body with a wrong signature: 401. Send the good one twice: the second returns duplicate: true.

Plan first, then wait for my OK.`,
  },
  {
    name: 'ech-rss-poll',
    purpose: 'Previews a feed for the browser, and every 15 minutes checks every connected feed with conditional GETs, imports new episodes behind an SSRF guard, and auto-processes them when the show allows it.',
    trigger: 'pg_cron every 15 minutes (x-cron-secret), or the browser with { mode: "preview" } (user JWT)',
    secrets: ['CRON_SECRET', 'RESEND_API_KEY', 'EMAIL_FROM', 'APP_URL'],
    prompt: `${shared}

Build supabase/functions/ech-rss-poll/index.ts. Read @PRD.md sections 9.5, 11.2, 12.6 and 13.7.

Parsing helper _shared/rss.ts: parseFeed(xmlText) with npm:fast-xml-parser (ignoreAttributes false, attributeNamePrefix '@_', CDATA kept as text). Returns { title, description (HTML stripped to text, max 4,000 chars), artworkUrl (itunes:image @href, then image.url), author, items: [{ guid (guid #text or the enclosure URL), title, description (stripped), publishedAt (pubDate as ISO), durationSec (itunes:duration as seconds, mm:ss or hh:mm:ss), episodeNumber (itunes:episode), seasonNumber (itunes:season), enclosureUrl, enclosureType, enclosureLength }] } keeping only items whose enclosure type starts with audio/ or video/. Handle a single item (object, not array). Write deno tests with 3 fixture feeds (Buzzsprout-style, Transistor-style, one with CDATA and HTML).

Mode preview (browser):
- requireUser, rate limit try_rate_limit('rss-preview:' + userId, 20, 3600).
- Body { mode: 'preview', url } (zod, must be http/https, max 2,000 chars). safeFetch GET with maxBytes 5 MB. Not XML or no items -> 422 not_a_feed with DESIGN.md 15 "Feed error" copy.
- Return { title, artwork_url, author, item_count, items: latest 20 [{ guid, title, published_at, duration_sec, enclosure_url }] }.

Mode poll (cron, requireCron):
- Select up to 200 shows where rss_url is not null and poll_error_count < 3, order by last_polled_at nulls first. Process 6 at a time (Promise pool). Stop starting new shows after 110 s.
- For each: safeFetch GET with If-None-Match: rss_etag and If-Modified-Since: rss_last_modified. 304 -> update last_polled_at only.
- 200: parse. New items = guids not in episodes for this show. First poll ever (last_polled_at null): import only the newest item. Insert with the admin client: { workspace_id, show_id, source 'rss', status 'imported', title, feed_description, rss_guid, rss_published_at, enclosure_url, reported_duration_sec, episode_number, season_number } on conflict (show_id, rss_guid) do nothing. Save rss_etag, rss_last_modified, last_polled_at, poll_error null, poll_error_count 0.
- Auto-process: if show.auto_process and has_active_access(ws): for each new episode (oldest first) call ech-start-transcription internally (fetch with x-internal: CRON_SECRET). A 402 or 429 leaves it 'imported' and sends new_episode with "You are out of audio hours this month" in the body. Without auto-process: send new_episode to admins (dedupe new:<episode_id>).
- Errors (network, 4xx/5xx, parse): poll_error = short human reason, poll_error_count + 1. When it reaches 3: send feed_paused to admins.
- Never pass feed text to Claude here. Feed descriptions are stored as plain text and only reach Claude inside <feed_text> tags later (if ever).
- Response { ok, shows, new_episodes, errors, ms }.

Deploy with --no-verify-jwt (it checks the user JWT or the cron secret itself).
Curl tests:
curl -X POST "https://<ref>.supabase.co/functions/v1/ech-rss-poll" -H "Authorization: Bearer <USER_JWT>" -H "Content-Type: application/json" -d '{"mode":"preview","url":"https://feeds.transistor.fm/<any-public-show>"}'
Expected the show title and 20 items. Then:
curl -X POST "https://<ref>.supabase.co/functions/v1/ech-rss-poll" -H "Authorization: Bearer <USER_JWT>" -H "Content-Type: application/json" -d '{"mode":"preview","url":"http://169.254.169.254/latest/meta-data/"}'
Expected 400 or 422 with no request made (check the logs). Then call it with -H "x-cron-secret: <CRON_SECRET>" -d '{}' and show me the imported episode row.

Plan first, then wait for my OK.`,
  },
  {
    name: 'ech-free-tool',
    purpose: 'Powers the public show notes generator on the landing page: takes an RSS URL, runs titles and chapters for the latest episode under 90 minutes, with an IP limit and a global monthly cap.',
    trigger: 'Called by /tools/show-notes-generator and the landing hero (no login, publishable key + IP rate limit)',
    secrets: ['ASSEMBLYAI_API_KEY', 'ANTHROPIC_API_KEY', 'IP_HASH_SALT', 'FREE_TOOL_WORKSPACE_ID'],
    prompt: `${shared}

Build supabase/functions/ech-free-tool/index.ts. Read @LANDING.md section 6 and @PRD.md sections 12.5 and 12.6.

Contract:
- POST { url } from the browser (no user JWT; the anon key is fine). zod: http/https, max 2,000 chars.
- ipHash = sha256(IP_HASH_SALT + x-forwarded-for first value). try_rate_limit('free:' + ipHash, 1, 86400) -> 429 "One free run a day. Start a trial to run it on every episode."
- Global cap: usage_this_month(FREE_TOOL_WORKSPACE_ID, 'audio_minutes') + estimate > 2400 (40 hours) -> 503 "The free tool is busy today. Start a trial to run it on your show now."
- safeFetch the feed (5 MB), parseFeed, take the newest item. durationSec > 5400 -> 422 "Pick a show whose latest episode is under 90 minutes."
- Create a temporary episode row in the FREE_TOOL_WORKSPACE_ID workspace under its single show (create that show once by hand), source 'rss', enclosure_url. Start AssemblyAI as in ech-start-transcription (same body) but with no webhook: instead return { run_id } at once.
- GET with { run_id } polls: when AssemblyAI is completed, run ONE Claude call with only the titles and chapters parts of PRD 14.2 (maxTokens 3000, no voice card), meter both, cache the result on the episode (episode_assets titles + chapters) and return { status: 'ready', show_title, artwork_url, episode_title, titles, chapters }. Earlier: { status: 'working' }.
- Delete free-tool episodes older than 7 days in the worker's hourly housekeeping (add that to ech-worker).
- Never return the transcript. Never accept anything except the URL.

Deploy with --no-verify-jwt.
Curl test:
curl -X POST "https://<ref>.supabase.co/functions/v1/ech-free-tool" -H "apikey: <PUBLISHABLE_KEY>" -H "Content-Type: application/json" -d '{"url":"<a public feed>"}'
Expected { run_id }. Poll with GET ?run_id=... until ready (about 2 to 4 minutes). A second POST from the same IP the same day: 429.

Plan first, then wait for my OK.`,
  },
]
