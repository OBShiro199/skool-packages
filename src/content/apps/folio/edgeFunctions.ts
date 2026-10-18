// Folio edge functions: one full Claude Code prompt per function.
import type { EdgeFunctionDef } from '../../types'

const shared = `Shared helpers: if supabase/functions/_shared/ does not exist yet, build it first exactly as described in the fol-ingest prompt (supabase.ts, auth.ts, http.ts, log.ts, retry.ts, usage.ts, guard.ts, schemas.ts, prompts.ts) and reuse it here. Do not duplicate helpers inside the function.`

const promptIngest = `Read @PRD.md sections 6.2, 6.3, 11.1, 12 (shared rules) and 12.1. Then build two things.

PART A: shared helpers in supabase/functions/_shared/ (used by every Folio function)
1. supabase.ts: adminClient() using Deno.env.get('SUPABASE_URL') and the secret key. Read SUPABASE_SECRET_KEYS (a JSON object of named secret keys: use the "default" entry) and fall back to SUPABASE_SERVICE_ROLE_KEY [verify the env name in the Supabase edge function docs]. auth: { persistSession: false }.
2. auth.ts: requireUser(req) reads "Authorization: Bearer <jwt>", calls supabase.auth.getClaims(jwt) and returns { userId: claims.sub, email }. No or bad token: throw HttpError(401, 'unauthorised'). requireMember(userId, workspaceId, minRole = 'editor') selects workspace_members with the admin client and compares roles in the order editor < admin < owner; not a member: HttpError(404, 'not_found'); role too low: HttpError(403, 'forbidden'). requireAccess(workspaceId) calls the has_active_access RPC; false: HttpError(402, 'no_access'). requireCron(req) compares x-cron-secret with CRON_SECRET in constant time. requireRenderSecret(req) the same with x-render-secret and RENDER_WORKER_SECRET.
3. http.ts: HttpError class (status, code, message), json(body, status), cors headers allowing APP_URL and http://localhost:3000, handle OPTIONS, and serve(handler) that wraps Deno.serve, catches HttpError into { code, message } and anything else into 500 { code: 'internal', message: 'Something went wrong' } after logging it.
4. log.ts: log(fn, step, data) prints one JSON line { fn, step, ts, ...data }. Never pass source text, captions, signed URLs or keys to it.
5. retry.ts: withRetry(fn, { tries: 3, baseMs: 1000 }) with exponential backoff and jitter. Retry only on network errors, 408, 429 and 5xx. Honour a retry-after header (seconds) up to 30 s.
6. usage.ts: consume(workspaceId, userId, metric, qty, key, refId?) calls the try_consume_usage RPC and throws HttpError(402, 'limit_reached', with metric, used, limit in the body) when ok is false. refund(key) calls refund_usage. rateLimit(userId, kind, max, seconds) calls recent_job_count and throws HttpError(429, 'rate_limited') with retry_after.
7. guard.ts: cleanSource(text, maxChars) removes zero-width characters, strips any "<source_material" or "</source_material>" strings, collapses whitespace runs, and cuts to maxChars at a sentence boundary. estimateTokens(text) = ceil(chars / 4). safePublicUrl(raw) parses with URL, requires https, rejects IP literals (v4 and v6), localhost, *.local, *.internal, *.lan, and hostnames without a dot, max 2,048 chars. isYouTubeUrl(url) accepts youtube.com/watch?v=, youtu.be/, youtube.com/shorts/ and m.youtube.com.
8. schemas.ts: zod schemas for every slide layout in PRD 10.2 (a discriminated union on layout, with the max lengths), CarouselSchema (PRD 11.2), RewriteSchema (PRD 11.4), CondenseSchema (PRD 11.3), and a toJsonSchema() export of CarouselSchema for structured output. Also trimToLimits(slide) that trims text over the limit by up to 15% at a word boundary and returns warnings, and returns null if any field is more than 15% over.
9. prompts.ts: the exact system prompts from PRD 11.2, 11.3 and 11.4 as constants. They must stay byte-for-byte stable so prompt caching works.
Imports: npm:@supabase/supabase-js@2, npm:zod@3, npm:@anthropic-ai/sdk. No other dependencies without asking me.

PART B: supabase/functions/fol-ingest/index.ts
Contract (POST, browser, user JWT):
- Body (zod): { workspace_id: uuid, brand_id: uuid, kind: 'blog_url'|'youtube_url'|'idea'|'voice_note', url?: string, idea?: string (20..4000), audio_path?: string, idempotency_key: uuid }.
- requireUser, requireMember(editor), requireAccess. Check the brand belongs to the workspace and is not deleted (404 otherwise).
- rateLimit(userId, 'ingest', 10, 60).
- Idempotency: if a jobs row exists with this workspace_id + idempotency_key, return 200 { source_id, job_id } from it.
- Per kind validation: blog_url uses safePublicUrl (400 url_blocked with a friendly message); youtube_url must pass isYouTubeUrl; voice_note audio_path must start with "<workspace_id>/" and exist in the voice-notes bucket; idea needs idea text.
- Insert sources (status 'pending') and jobs (kind 'ingest', max_attempts 3, payload { kind }, source_id, created_by). Return 202 { source_id, job_id } straight away.
- Do the work inside EdgeRuntime.waitUntil(processIngest(jobId)). processIngest is exported so fol-sweeper can call the same code. It:
  1. sets job running (locked_at now, attempts + 1, step 'reading', progress 10) and source 'extracting'.
  2. blog_url: consume(scrape, 1, key = 'scrape:' + job id). withRetry POST https://api.firecrawl.dev/v2/scrape, headers Authorization: Bearer FIRECRAWL_API_KEY, body { url, formats: ['markdown'], onlyMainContent: true, timeout: 30000 }. Use data.markdown and data.metadata.title. Strip markdown images and link URLs, keep link text.
  3. youtube_url: consume(scrape, 1). withRetry GET https://api.supadata.ai/v1/transcript?url=<encoded>&text=true with header x-api-key: SUPADATA_API_KEY [verify path and params on docs.supadata.ai]. If the response has a jobId, poll GET https://api.supadata.ai/v1/transcript/<jobId> every 3 s for up to 120 s [verify]. If the provider says there are no captions and the video is over 30 minutes, fail with code no_transcript and refund. Title: from the response metadata if present, else "YouTube video".
  4. voice_note: create a 10 minute signed URL for the file. withRetry POST https://api.deepgram.com/v1/listen?model=nova-3&smart_format=true&paragraphs=true with headers Authorization: Token DEEPGRAM_API_KEY and Content-Type: application/json, body { url: signedUrl }. Transcript: results.channels[0].alternatives[0].transcript, duration: metadata.duration. consume('voice_minutes', ceil(duration / 60), key 'voice:' + job id). If the duration is over 600 seconds, fail with code too_long.
  5. idea: text = idea, title = first 8 words.
  6. text = cleanSource(text, 200000). If under 120 words: fail with code too_short ("We need at least 120 words to write a good carousel"). Save extracted_text, title (max 200), word_count, duration_seconds, source 'ready', job 'succeeded' with progress 100 and result { word_count }.
  7. On any error: log it (no text), set source error to a friendly message, call requeue_job(job_id, code). If the result is 'failed', set source 'failed' and refund the scrape or voice key.
- Never log the URL path query, transcript or idea text.

Deploy with verify_jwt on. Then give me a curl test:
curl -i -X POST "$SUPABASE_URL/functions/v1/fol-ingest" -H "Authorization: Bearer <a user access token>" -H "Content-Type: application/json" -d '{"workspace_id":"<ws>","brand_id":"<brand>","kind":"blog_url","url":"https://www.paulgraham.com/greatwork.html","idempotency_key":"<new uuid>"}'
Expected: 202 with source_id and job_id; within 20 s the sources row is 'ready' with a word_count. Send the same request again: 200 with the same ids and no new usage_ledger row.
Plan first, then wait for my OK.`

const promptGenerate = `Read @PRD.md sections 6.6, 10, 11.1, 11.2, 11.3, 12 and 12.2. ${shared}

Build supabase/functions/fol-generate/index.ts.
Contract (POST, browser, user JWT):
- Body (zod): { workspace_id: uuid, source_id: uuid, brand_id: uuid, body_slides?: int 6..9 (default 7), angle?: string max 200, format?: 'portrait'|'square' (default portrait), idempotency_key: uuid }.
- requireUser, requireMember(editor), requireAccess. Source must be in the workspace and status 'ready' (409 source_not_ready otherwise). Brand must be in the workspace.
- rateLimit(userId, 'generate', 6, 60).
- Idempotency: existing job with the key returns 200 { carousel_id, job_id }.
- consume('carousel', 1, key 'carousel:' + idempotency_key). On 402 return the limit body so the UI can show "15 of 15 used".
- Insert carousels (status 'generating', title 'Writing...', format) and jobs (kind 'generate', max_attempts 3, carousel_id, source_id, payload { body_slides, angle }). Return 202 { carousel_id, job_id }.
- EdgeRuntime.waitUntil(processGenerate(jobId)) (exported for fol-sweeper). It:
  1. Job running, step 'writing', progress 15.
  2. Load source text and brand (voice_notes, cta_default). Source text through cleanSource again.
  3. If estimateTokens(text) > 6000: condense with model 'claude-haiku-5-5' using the PRD 11.3 prompt and CondenseSchema through output_config.format (json_schema). Use the points and best quotes as the source material. Progress 35.
  4. Call model 'claude-sonnet-5-5' with the Anthropic SDK: system = [{ type: 'text', text: GENERATE_SYSTEM, cache_control: { type: 'ephemeral' } }] with {body_min} and {body_max} replaced in the USER message, not the system prompt (keep the system prompt identical on every call). The user message is exactly the PRD 11.2 template with <brand_voice>, <brand_cta>, <angle>, <source_material>. Settings: max_tokens 8000, thinking { type: 'adaptive' }, output_config { effort: 'medium', format: { type: 'json_schema', schema: toJsonSchema() } }, plus the server-side fallback (betas ['server-side-fallback-2026-07-01'], fallbacks 'default') via client.beta.messages.create. Timeout 90 s.
  5. Check stop_reason first. 'refusal': fail with code refused (no retry). 'max_tokens': retry once with max_tokens 12000.
  6. Parse the JSON text block, validate with CarouselSchema. Then check: first slide hook, last slide cta, body count between body_slides - 1 and body_slides + 1 and inside 6..9, no layout more than 3 times in a row, trimToLimits on every slide. If anything fails, make ONE repair call: same system prompt, add the previous assistant JSON and a user message "These problems need fixing: <list>. Return the whole carousel again with them fixed." Validate again. Still bad: fail with code invalid_output.
  7. Progress 85, step 'saving'. Call RPC replace_slides(carousel_id, slides with warnings). Update the carousel: title, caption, hashtags (lowercase, no #, max 5), status 'ready'. Job succeeded with result { slides, input_tokens, output_tokens, cache_read_tokens }.
  8. Cost: (input_tokens * 2 + output_tokens * 10 + cache_read_tokens * 0.2) / 1e6 USD for Sonnet plus Haiku at 0.1 / 0.5. Save as micros with set_usage_cost('carousel:' + key, micros).
  9. Errors: requeue_job. If 'failed': carousel status 'failed' with a friendly error, refund('carousel:' + key). Retry only network, 429, 5xx and invalid_output (the latter only once).
- Never log source text, prompts or model output. Log token counts and ms.

Deploy with verify_jwt on. Curl test:
curl -i -X POST "$SUPABASE_URL/functions/v1/fol-generate" -H "Authorization: Bearer <user token>" -H "Content-Type: application/json" -d '{"workspace_id":"<ws>","source_id":"<ready source>","brand_id":"<brand>","idempotency_key":"<new uuid>"}'
Expected: 202. Within 60 s the carousel is 'ready' and has 8 to 11 slides, first hook, last cta:
select position, layout, content->>'headline' from public.slides where carousel_id = '<id>' order by position;
Plan first, then wait for my OK.`

const promptRewrite = `Read @PRD.md sections 11.1, 11.4, 12 and 12.3. ${shared}

Build supabase/functions/fol-rewrite-slide/index.ts. This one is synchronous (the user waits a few seconds).
Contract (POST, browser, user JWT):
- Body (zod): { workspace_id: uuid, slide_id: uuid, preset?: 'punchier'|'shorter'|'simpler'|'example'|'to_list'|'to_stat'|'my_voice', instruction?: string max 300, idempotency_key: uuid }. At least one of preset or instruction.
- requireUser, requireMember(editor), requireAccess. Load the slide with its carousel and check slide.workspace_id = workspace_id (404 otherwise).
- Rate limit: 20 rewrites per user per minute. Count usage_ledger rows with metric 'rewrite' for this user in the last 60 s (add a small helper if needed). 429 with retry_after.
- consume('rewrite', 1, 'rewrite:' + idempotency_key). If duplicate, return the slide as it is now with 200.
- Save the current slide into slide_revisions (reason 'ai_rewrite', instruction = preset or text, created_by) BEFORE changing anything.
- Build the user message from PRD 11.4: <instruction> (map presets to full sentences, e.g. punchier = "Make it punchier: stronger verbs, fewer words, keep the meaning"; my_voice = "Rewrite in the brand voice: <brand voice notes>"), <slide layout=...>, <neighbours> (headline or title of the slide before and after), <source_summary> (first 1,500 tokens of the source text, cleaned).
- Call 'claude-sonnet-5-5' with the REWRITE_SYSTEM prompt (cached), max_tokens 2000, output_config { effort: 'low', format json_schema RewriteSchema }, thinking adaptive, 25 s timeout, server-side fallback as in fol-generate.
- Validate with the slide union. Only presets to_list and to_stat may change layout; hook and cta slides can never change layout. trimToLimits; if null, return 422 too_long and refund.
- Update the slide (layout, content, warnings). Return 200 { slide: { id, layout, content, warnings }, revision_id, note }.
- Any model or network error after consuming: refund and return 502 { code: 'ai_failed', message: 'The rewrite did not work. You were not charged. Try again.' }.

Deploy with verify_jwt on. Curl test:
curl -i -X POST "$SUPABASE_URL/functions/v1/fol-rewrite-slide" -H "Authorization: Bearer <user token>" -H "Content-Type: application/json" -d '{"workspace_id":"<ws>","slide_id":"<slide>","preset":"shorter","idempotency_key":"<new uuid>"}'
Expected: 200 with the new content, and one new slide_revisions row holding the old content. Repeat with the same key: 200, no second ledger row.
Plan first, then wait for my OK.`

const promptRenderEnqueue = `Read @PRD.md sections 6.1, 12, 12.4, 12.5 and 13. ${shared}

Build supabase/functions/fol-render-enqueue/index.ts. It queues an export and pokes the Vercel render worker. It does NOT render anything itself.
Contract (POST, browser, user JWT):
- Body (zod): { workspace_id: uuid, carousel_id: uuid, idempotency_key: uuid }.
- requireUser, requireMember(editor), requireAccess. Carousel in workspace (404). Status must not be 'generating' or 'failed' (409 not_ready). At least 3 slides.
- rateLimit(userId, 'render', 10, 60).
- Idempotency: existing job with the key returns 200 { render_id, job_id, reused: false }.
- content_hash = sha256 hex (crypto.subtle) of a stable JSON string: slides ordered by position (layout, content), brand colors, font_heading, font_body, custom_font_path, logo_path, headshot_path, display_name, handle, show_counter, the plan's remove_mark flag, and the carousel format. Use a stable stringify that sorts object keys.
- If renders has a row with this carousel_id, content_hash and status 'done': set carousel latest_render_id to it and status 'rendered', return 200 { render_id, job_id: null, reused: true }. No usage.
- If a render with this hash is already 'queued' or 'rendering', return it (202, reused: true). No usage.
- Otherwise consume('render', 1, 'render:' + idempotency_key). Insert jobs (kind 'render', max_attempts 4, carousel_id) and renders (status 'queued', content_hash, format, job_id). Set carousel status 'rendering'.
- Poke the worker: fetch(RENDER_WORKER_URL, { method: 'POST', headers: { 'x-render-secret': RENDER_WORKER_SECRET, 'content-type': 'application/json' }, body: JSON.stringify({ job_id }) }) with an AbortController timeout of 3 s. Ignore errors (log them): fol-sweeper re-pokes queued renders every 2 minutes.
- Return 202 { render_id, job_id, reused: false }.

Deploy with verify_jwt on. Curl test:
curl -i -X POST "$SUPABASE_URL/functions/v1/fol-render-enqueue" -H "Authorization: Bearer <user token>" -H "Content-Type: application/json" -d '{"workspace_id":"<ws>","carousel_id":"<carousel>","idempotency_key":"<new uuid>"}'
Expected: 202, then (once the worker from the frontend task exists) the renders row becomes 'done' with slide_paths and pdf_path. Call again with a NEW key and no slide changes: 200 with reused: true and no new ledger row.
Plan first, then wait for my OK.`

const promptConnect = `Read @PRD.md sections 6.4, 6.5, 12 and 12.6. ${shared}

Build supabase/functions/fol-zernio-connect/index.ts. Zernio base URL: https://zernio.com/api/v1, header Authorization: Bearer ZERNIO_API_KEY (keys start with sk_). Use fetch with withRetry. Read the Zernio API reference (docs.zernio.com, or the @zernio/node package types) before writing code.
Contract (POST, browser, user JWT):
- Body (zod): { workspace_id: uuid, brand_id: uuid, action: 'start'|'sync'|'disconnect', platform?: 'linkedin'|'instagram', social_account_id?: uuid }.
- requireUser, requireAccess. start and disconnect need requireMember(admin); sync needs editor. Brand in workspace (404).
- start:
  1. Plan limit: count social_accounts with status 'connected' in the workspace; compare with plan_limits.social_accounts for workspace_plan(workspace_id) (call the RPCs with the admin client). At the limit: 402 { code: 'limit_reached', metric: 'social_accounts', used, limit }.
  2. If brands.zernio_profile_id is null: POST /profiles with { name: '<first 8 chars of workspace id> <brand name>' } and save the returned id.
  3. GET /connect/<platform>?profileId=<id>&redirect_url=<APP_URL>/app/brand/<brand_id>/accounts?connected=1 (URL-encode the redirect). Return 200 { url: authUrl }.
- sync: GET /accounts?profileId=<id>. For each account upsert social_accounts on (workspace_id, zernio_account_id): platform 'instagram' for Instagram; for LinkedIn use 'linkedin_page' when the account type is organisation, else 'linkedin'; display_name, avatar_url, status 'connected' (or 'expired' if Zernio reports the account unhealthy). Mark our rows whose Zernio account no longer exists as 'disconnected'. Return { accounts }.
- disconnect: social_account_id must belong to the workspace and brand. DELETE /accounts/<zernio_account_id>. Set status 'disconnected'. Cancel any of our scheduled_posts for that account that are still 'scheduled' (status 'canceled', error 'Account disconnected').
- Map Zernio errors to friendly messages: 401 -> 'Folio could not reach the posting service' (log it loudly, it means our key is wrong), 4xx -> pass Zernio's message, 5xx -> retry.

Deploy with verify_jwt on. Curl test:
curl -i -X POST "$SUPABASE_URL/functions/v1/fol-zernio-connect" -H "Authorization: Bearer <user token>" -H "Content-Type: application/json" -d '{"workspace_id":"<ws>","brand_id":"<brand>","action":"start","platform":"linkedin"}'
Expected: 200 with a url. Open it, approve LinkedIn, land back on /app/brand/<id>/accounts?connected=1. Then call action sync: one social_accounts row with status 'connected'.
Plan first, then wait for my OK.`

const promptSchedule = `Read @PRD.md sections 6.4, 6.5, 9.5, 12, 12.7 and 14. ${shared}

Build supabase/functions/fol-schedule-post/index.ts. Zernio base https://zernio.com/api/v1 with Bearer ZERNIO_API_KEY.
Contract (POST, browser, user JWT):
- Body (zod, discriminated on action):
  schedule: { workspace_id, action: 'schedule', carousel_id, render_id, social_account_id, caption (1..3000), scheduled_for?: ISO string, publish_now?: boolean, timezone: IANA string, idempotency_key: uuid }
  reschedule: { workspace_id, action: 'reschedule', scheduled_post_id, scheduled_for, timezone }
  cancel: { workspace_id, action: 'cancel', scheduled_post_id }
  retry: { workspace_id, action: 'retry', scheduled_post_id, idempotency_key }
- requireUser, requireMember(editor), requireAccess. Every id must belong to workspace_id (404). rateLimit(userId, 'publish', 20, 60) for schedule and retry.
- schedule:
  1. Idempotency: existing scheduled_posts row with the key returns 200 { scheduled_post_id }.
  2. render.status must be 'done' and render.carousel_id = carousel_id. Account status 'connected' and account.brand_id = carousel.brand_id. Instagram caption max 2,200. scheduled_for must be 5 minutes to 90 days ahead unless publish_now.
  3. Insert scheduled_posts (status 'draft', platform from the account, created_by) and a jobs row (kind 'publish', max_attempts 5).
  4. Media: for LinkedIn the PDF, for Instagram every PNG. For each file: download from the renders bucket with the admin client, POST /media/presign { filename, contentType, size }, PUT the bytes to uploadUrl with that Content-Type, keep publicUrl. LinkedIn: mediaItems [{ type: 'document', url, title: carousel title }]. Instagram: [{ type: 'image', url, altText: slide headline or title }] in slide order.
  5. POST /posts with { content: caption, mediaItems, timezone, scheduledFor or publishNow: true, platforms: [{ platform: 'linkedin' or 'instagram', accountId: zernio_account_id, platformSpecificData }] }. LinkedIn platformSpecificData: { documentTitle: carousel title (max 100) }. Send hashtags appended to the caption, not as a separate field.
  6. Save zernio_post_id, status 'scheduled' (or 'publishing' when publish_now). Set the carousel status 'scheduled'. Job succeeded.
  7. Zernio 4xx: status 'failed' with Zernio's message, job failed, return 422 with the message. Network or 5xx: requeue_job; the sweeper retries the publish job by calling the same exported function.
- reschedule: only 'scheduled' posts. PUT /posts/<zernio_post_id> with { scheduledFor, timezone }. Update ours.
- cancel: only 'scheduled' or 'draft'. DELETE /posts/<zernio_post_id> when set. Status 'canceled'. If the carousel has no other scheduled posts, set it back to 'rendered'.
- retry: only 'failed'. Re-run the schedule steps 4 to 6 with publish_now true on the same row (new idempotency key on the job).
- Return { scheduled_post_id, status }.

Deploy with verify_jwt on. Curl test (schedule 10 minutes ahead, replace the time):
curl -i -X POST "$SUPABASE_URL/functions/v1/fol-schedule-post" -H "Authorization: Bearer <user token>" -H "Content-Type: application/json" -d '{"workspace_id":"<ws>","action":"schedule","carousel_id":"<c>","render_id":"<r>","social_account_id":"<a>","caption":"Test post from Folio","scheduled_for":"2026-10-20T08:30:00Z","timezone":"Europe/London","idempotency_key":"<new uuid>"}'
Expected: 200 { status: 'scheduled' } and the post appears in the Zernio dashboard queue. Cancel it with action cancel before it goes out if you do not want it live.
Plan first, then wait for my OK.`

const promptWebhook = `Read @PRD.md sections 9.5, 12, 12.8 and 17. ${shared}

Build supabase/functions/fol-zernio-webhook/index.ts. Public endpoint called by Zernio (deploy with verify_jwt false).
1. Read the raw body as text BEFORE parsing. Headers: X-Zernio-Event, X-Zernio-Event-Id, X-Zernio-Signature.
2. Compute HMAC-SHA256 of the raw body with ZERNIO_WEBHOOK_SECRET using crypto.subtle. Compare with the signature header in constant time. Accept hex or base64 (and a "sha256=" prefix) until we confirm which one Zernio sends with its "Send test" button [verify], then remove the unused branch. Mismatch: 401, log 'bad_signature' with the event type only.
3. Insert { id: event id, provider: 'zernio', type } into provider_events. Unique violation (23505): return 200 { duplicate: true }.
4. Events to handle: post.published, post.failed, post.partial, post.cancelled, post.platform.published, post.platform.failed, account.disconnected. Ignore anything else with 200.
5. Post events: read the Zernio post id from the payload, then GET https://zernio.com/api/v1/posts/<id> with Bearer ZERNIO_API_KEY and use THAT response as the truth (a forged or replayed event can never set a false status). Find our scheduled_posts by zernio_post_id (no row: 200, log 'unknown_post').
   - Published: status 'published', published_at, platform_post_url (the platform's post URL from the Zernio response), carousel status 'published'. Send the post_published email once (step 7).
   - Failed: status 'failed', error = the platform error in plain words (max 300 chars). If the error mentions an expired token or permissions, set the social account 'expired'. Send the post_failed email with a Retry link to APP_URL/app/calendar?post=<id>.
   - Cancelled: status 'canceled'.
6. account.disconnected: set the matching social_accounts row 'expired' and email workspace admins.
7. Emails via Resend (POST https://api.resend.com/emails, Bearer RESEND_API_KEY, from EMAIL_FROM). Before sending, insert into email_log with idempotency_key '<template>:<scheduled_post_id>'; on unique violation skip the send. Send to the post's created_by user (look up the email with the admin auth API). Plain, short copy from PRD 17.
8. Always answer within 2 seconds: do the Zernio GET and the email in EdgeRuntime.waitUntil after the signature check and dedupe, and return 200 { ok: true } immediately.

Then register the webhook: in the Zernio dashboard (or POST /v1/webhooks/settings) add URL <SUPABASE_URL>/functions/v1/fol-zernio-webhook with the post.* and account.disconnected events, copy the secret into Supabase secrets as ZERNIO_WEBHOOK_SECRET, and press "Send test".
Curl test (must fail with 401):
curl -i -X POST "$SUPABASE_URL/functions/v1/fol-zernio-webhook" -H "Content-Type: application/json" -H "X-Zernio-Event: post.published" -H "X-Zernio-Event-Id: fake-1" -H "X-Zernio-Signature: deadbeef" -d '{"id":"fake-1"}'
Expected: 401 bad_signature and no provider_events row. The dashboard test event returns 200 and adds one provider_events row; sending it again returns 200 { duplicate: true }.
Plan first, then wait for my OK.`

const promptAnalytics = `Read @PRD.md sections 12, 12.9 and 15. ${shared}

Build supabase/functions/fol-analytics-sync/index.ts, called by pg_cron every 6 hours with header x-cron-secret (requireCron, 401 otherwise). Deploy with verify_jwt false.
1. Select up to 300 scheduled_posts with status 'published', published_at in the last 30 days, whose workspace plan has analytics = true (join through workspace_plan(workspace_id) and plan_limits). Oldest last_synced first (add a post_metrics lookup: posts with no row for today first).
2. In batches of 20 (Promise.all with a pool of 5), call GET https://zernio.com/api/v1/analytics?postId=<zernio_post_id> with Bearer ZERNIO_API_KEY. This needs Zernio's Analytics add-on. 202 means "sync pending": skip until the next run. 424 means all platforms failed: log and skip. 429: stop the run and log 'rate_limited'.
3. Map the response to impressions, reach, reactions (likes plus reactions), comments, shares (shares or reposts), clicks, saves (0 when missing). Upsert post_metrics on (scheduled_post_id, captured_on = today UTC) with workspace_id.
4. Log one summary line { fn, synced, pending, failed, ms }. Return 200 with the same counts.
Then schedule it with the Supabase MCP (read CRON_SECRET from Vault, never inline it):
select cron.schedule('fol-analytics-sync', '17 */6 * * *', $$ select net.http_post(url := '<SUPABASE_URL>/functions/v1/fol-analytics-sync', headers := jsonb_build_object('x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret'), 'content-type', 'application/json'), body := '{}'::jsonb) $$);
Curl test:
curl -i -X POST "$SUPABASE_URL/functions/v1/fol-analytics-sync" -H "x-cron-secret: <CRON_SECRET>"
Expected: 200 { synced, pending, failed }. Without the header: 401.
Plan first, then wait for my OK.`

const promptSweeper = `Read @PRD.md sections 9, 12 and 12.10. ${shared}

Build supabase/functions/fol-sweeper/index.ts, called by pg_cron every 2 minutes with x-cron-secret (requireCron, 401 otherwise). Deploy with verify_jwt false. It must be safe to run twice at the same time (idempotent, uses claim_jobs and conditional updates).
1. Stuck jobs: for jobs with status 'running' and locked_at older than 5 minutes, call requeue_job(id, 'timeout'). For the ones that come back 'failed', refund their usage key (carousel:, render:, scrape:, voice: keys are stored in jobs.payload.usage_key: make sure fol-ingest, fol-generate and fol-render-enqueue write it there) and set the source, carousel or render to failed with a friendly message.
2. Due ingest and generate jobs: claim_jobs('ingest', 5) and claim_jobs('generate', 3), then call the exported processIngest / processGenerate from those functions' modules (import them from ../fol-ingest/process.ts and ../fol-generate/process.ts: refactor those functions so the processing code lives in process.ts). Run them inside EdgeRuntime.waitUntil so the sweeper returns fast.
3. Queued renders: if any render jobs are 'queued' with run_after <= now(), POST RENDER_WORKER_URL once with x-render-secret (3 s timeout).
4. Publish jobs: claim_jobs('publish', 5) and re-run the exported schedule step from fol-schedule-post/process.ts.
5. Late posts: scheduled_posts 'scheduled' with scheduled_for more than 15 minutes ago: GET /posts/<zernio_post_id> from Zernio and update status like the webhook does.
6. Once an hour (only when the current minute < 2): for each carousel keep the 3 newest renders that are not used by any scheduled_posts row; delete the rest (Storage objects in the renders bucket first, then rows). Delete voice-notes objects older than 30 days whose source is 'ready' or 'failed'.
7. Usage alerts: for workspaces with activity today, if usage_used / plan_limit >= 0.8 for carousel, rewrite or render, send the usage_80 email once per metric per month (email_log key 'usage_80:<workspace>:<metric>:<YYYY-MM>') to the workspace owner.
8. Return 200 with counts for each step and log one summary line.
Schedule with the Supabase MCP (Vault secret, never inline):
select cron.schedule('fol-sweeper', '*/2 * * * *', $$ select net.http_post(url := '<SUPABASE_URL>/functions/v1/fol-sweeper', headers := jsonb_build_object('x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret'), 'content-type', 'application/json'), body := '{}'::jsonb) $$);
Curl test:
curl -i -X POST "$SUPABASE_URL/functions/v1/fol-sweeper" -H "x-cron-secret: <CRON_SECRET>"
Expected: 200 with counts. Then set a job to running with locked_at = now() - interval '10 minutes' in the SQL editor, run the curl again, and check it is queued again with attempts + 1 and a later run_after.
Plan first, then wait for my OK.`

export const edgeFunctions: EdgeFunctionDef[] = [
  {
    name: 'fol-ingest',
    purpose: 'Turns a blog URL (Firecrawl), a YouTube URL (Supadata transcript), a typed idea or a voice note (Deepgram) into clean source text, as a background job with progress. Also builds the shared helpers every other function uses.',
    trigger: 'Called by the browser when the user presses "Write my carousel" on the Create page',
    secrets: ['FIRECRAWL_API_KEY', 'SUPADATA_API_KEY', 'DEEPGRAM_API_KEY', 'APP_URL'],
    prompt: promptIngest,
  },
  {
    name: 'fol-generate',
    purpose: 'Meters one carousel, condenses long sources with claude-haiku-5-5, then has claude-sonnet-5-5 write the hook, 6 to 9 body slides, the CTA and the LinkedIn caption as validated JSON with a layout per slide.',
    trigger: 'Called by the browser as soon as the source job succeeds',
    secrets: ['ANTHROPIC_API_KEY'],
    prompt: promptGenerate,
  },
  {
    name: 'fol-rewrite-slide',
    purpose: 'Rewrites one slide with a preset (Punchier, Shorter, Add an example...) or a custom instruction, saves the old version for undo, and meters one rewrite.',
    trigger: 'Called by the browser from the AI tab or the sparkle button in the editor',
    secrets: ['ANTHROPIC_API_KEY'],
    prompt: promptRewrite,
  },
  {
    name: 'fol-render-enqueue',
    purpose: 'Hashes the slides and brand, reuses an identical export for free, otherwise meters one render, queues it and pokes the Vercel render worker.',
    trigger: 'Called by the browser when the user presses Export',
    secrets: ['RENDER_WORKER_URL', 'RENDER_WORKER_SECRET'],
    prompt: promptRenderEnqueue,
  },
  {
    name: 'fol-zernio-connect',
    purpose: 'Creates a Zernio profile per brand, returns the LinkedIn or Instagram connect link, syncs connected accounts and disconnects them, inside the plan\'s account limit.',
    trigger: 'Called by the browser from Brand kit > Accounts',
    secrets: ['ZERNIO_API_KEY', 'APP_URL'],
    prompt: promptConnect,
  },
  {
    name: 'fol-schedule-post',
    purpose: 'Copies the PDF or PNGs into Zernio\'s media store and schedules, reschedules, cancels or retries a LinkedIn document post or Instagram carousel.',
    trigger: 'Called by the browser from the Schedule dialog and the calendar',
    secrets: ['ZERNIO_API_KEY'],
    prompt: promptSchedule,
  },
  {
    name: 'fol-zernio-webhook',
    purpose: 'Receives Zernio post and account events, verifies X-Zernio-Signature, de-duplicates by event id, re-reads the post from Zernio as the source of truth and sends published or failed emails once.',
    trigger: 'Zernio webhook (post.published, post.failed, post.partial, post.cancelled, account.disconnected)',
    secrets: ['ZERNIO_WEBHOOK_SECRET', 'ZERNIO_API_KEY', 'RESEND_API_KEY', 'EMAIL_FROM', 'APP_URL'],
    prompt: promptWebhook,
  },
  {
    name: 'fol-analytics-sync',
    purpose: 'Pulls impressions, reach, reactions, comments, shares and clicks for published posts from the last 30 days into post_metrics for plans with analytics.',
    trigger: 'pg_cron every 6 hours (x-cron-secret header)',
    secrets: ['ZERNIO_API_KEY', 'CRON_SECRET'],
    prompt: promptAnalytics,
  },
  {
    name: 'fol-sweeper',
    purpose: 'Retries stuck and due jobs with backoff, refunds usage for jobs that finally fail, re-pokes the render worker, checks late posts, prunes old renders and voice notes, and sends 80% usage emails.',
    trigger: 'pg_cron every 2 minutes (x-cron-secret header)',
    secrets: ['CRON_SECRET', 'RENDER_WORKER_URL', 'RENDER_WORKER_SECRET', 'ZERNIO_API_KEY', 'RESEND_API_KEY', 'EMAIL_FROM'],
    prompt: promptSweeper,
  },
]
