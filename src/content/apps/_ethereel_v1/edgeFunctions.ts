import type { EdgeFunctionDef } from '../../types'

const sharedPrompt = `Before this function, create the shared modules in supabase/functions/_shared/ if they don't exist yet (read PRD.md section 11 "Shared modules"):
- cors.ts: corsHeaders allowing SITE_URL and http://localhost:3000, and a handleOptions(req) helper.
- admin.ts: createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SB_SECRET_KEY'), { auth: { persistSession: false } }).
- auth.ts: requireUser(req) reads "Authorization: Bearer <jwt>", calls supabase.auth.getClaims(jwt) and returns { userId: claims.sub }. Throws a 401 Response if missing or invalid.
- token.ts: sign(id) and verify(id, token) using HMAC-SHA256 with CALLBACK_SECRET via crypto.subtle, hex output, constant-time compare.
- internal.ts: invokeInternal(name, body) POSTs to SUPABASE_URL/functions/v1/<name> with header x-internal-secret = INTERNAL_FUNCTION_SECRET. requireInternal(req) throws 401 unless the header matches (constant-time compare).
- log.ts: log(fn, event, data) prints one JSON line. Strip any key containing "url", "token", "key" or "secret" before printing.
- json.ts: json(status, body) returns a Response with JSON and CORS headers.`

export const edgeFunctions: EdgeFunctionDef[] = [
  {
    name: 'start-transcription',
    purpose: 'Checks the user, their access and their minutes, reserves the minutes, then sends the uploaded video to Deepgram with a callback URL.',
    trigger: 'Called by the browser right after the resumable upload finishes (and by the Try again button).',
    secrets: ['SB_SECRET_KEY', 'DEEPGRAM_API_KEY', 'CALLBACK_SECRET', 'INTERNAL_FUNCTION_SECRET', 'SITE_URL', 'RESEND_API_KEY', 'EMAIL_FROM'],
    prompt: `Read PRD.md sections 9, 10 and 11.1. Build the Supabase edge function supabase/functions/start-transcription/index.ts.

${sharedPrompt}

What it does, in order:
1. Handle OPTIONS for CORS. Only accept POST.
2. requireUser(req) to get userId (uses getClaims, never getSession).
3. Parse the body with zod: { project_id: uuid }. 400 { error: "bad_input" } if invalid.
4. Load the project with the admin client where id = project_id AND user_id = userId. 404 if not found.
5. Resume logic for Try again: if status is 'failed', look at what exists. Transcript exists and no clips: set status 'planning' and invokeInternal('plan-clips'). Clips exist: set status 'rendering', reset failed clips to 'planned' and invokeInternal('render-clips'). Otherwise continue below as a fresh start. Re-reserve minutes only if a refund line exists for this project.
6. If status is not 'uploading' (and not a fresh-start 'failed'), return 409 { error: "already_started" }.
7. Confirm the file exists: admin.storage.from('raw-videos').list('<uid>/<pid>') and look for the file name from raw_path. 400 { error: "file_missing" } if not there.
8. Call rpc('has_active_access', { uid: userId }). If false, 402 { error: "no_access" }.
9. Rate limits from PRD section 10: count this user's projects in ('transcribing','planning','rendering') and projects created in the last hour. Trial vs paid limits come from the subscriptions status. 429 { error: "too_many", message } if over.
10. minutes = Math.ceil(declared_duration_s / 60). Call rpc('reserve_minutes', { p_user, p_project, p_minutes: minutes, p_kind: 'upload' }). If false, read minutes_used_this_period for the user and return 402 { error: "over_limit", minutes_left }.
11. If the user just crossed 80% of their limit and has not had the 80% email this period, send it through Resend (PRD section 17).
12. Create a signed URL for raw_path valid for 7200 seconds.
13. Build the callback URL: SUPABASE_URL + '/functions/v1/deepgram-callback?project_id=' + id + '&token=' + sign(id).
14. POST to https://api.deepgram.com/v1/listen?model=nova-3&smart_format=true&punctuate=true&filler_words=true&utterances=true&language=en&callback=<encoded callback> with headers Authorization: "Token " + DEEPGRAM_API_KEY and Content-Type: application/json, body { url: signedUrl }. Timeout 20 s with AbortController.
15. If Deepgram returns non-2xx: insert a refund ledger line (negative minutes), set status 'failed' with error "We couldn't start transcription. Your minutes have been refunded.", return 502.
16. On success: conditional update projects set status = 'transcribing', deepgram_request_id = response.request_id, minutes_reserved = minutes where id = project_id and status in ('uploading','failed'). Return 200 { ok: true, status: "transcribing" }.

Logging: log('start-transcription', 'started', { project_id, minutes, request_id, ms }). Never log the signed URL or the callback token.

Then:
- Deploy with: supabase functions deploy start-transcription --no-verify-jwt (the function checks the user itself with getClaims, which works with the new sb_publishable / sb_secret keys)
- Give me a curl test using my access token from the browser (Application > Local storage > the sb-...-auth-token value, field access_token):
  curl -i -X POST "https://<ref>.supabase.co/functions/v1/start-transcription" -H "Authorization: Bearer <access_token>" -H "Content-Type: application/json" -d '{"project_id":"<id>"}'
- Also give me the curl that should fail with 401 (no header) and with 404 (someone else's project id).
Stop and wait for my OK.`,
  },
  {
    name: 'deepgram-callback',
    purpose: 'Receives the finished transcript from Deepgram, verifies it is genuine, saves every word with timestamps, then hands over to plan-clips.',
    trigger: 'Deepgram webhook (the callback URL set by start-transcription).',
    secrets: ['SB_SECRET_KEY', 'CALLBACK_SECRET', 'INTERNAL_FUNCTION_SECRET', 'RESEND_API_KEY', 'EMAIL_FROM', 'SITE_URL'],
    prompt: `Read PRD.md sections 8.1, 9 and 11.2. Build supabase/functions/deepgram-callback/index.ts. This function is called by Deepgram, not a logged-in user, so it must be deployed with --no-verify-jwt and must check its own token.

What it does, in order:
1. Only accept POST. Read project_id and token from the query string. verify(project_id, token) from _shared/token.ts. If it fails return 401 and log 'bad_token' with project_id only.
2. Load the project with the admin client. If status is not 'transcribing', return 200 { ok: true, skipped: true } (duplicate or late callback).
3. If a transcripts row already exists for this project, return 200 (idempotent).
4. Parse the body. Words are at results.channels[0].alternatives[0].words. Duration is metadata.duration. If the body has an err_code or no words array, fail the project (step 9) with "Transcription failed on Deepgram's side."
5. Map each word to { i, w, pw, s, e, c, filler } exactly as PRD 8.1. Filler rules: lower-cased word in ['um','uh','erm','er','ah','hmm','mm'] is always a filler. "like" and "so" only as described in 8.1. "you know" marks both words when followed by a pause over 0.3 s.
6. If fewer than 40 non-filler words, fail with "We could not hear enough speech in this video."
7. Duration re-check (PRD section 10): if metadata.duration is more than 5% over declared_duration_s, call reserve_minutes for the extra whole minutes. If that returns false, fail with "This video is longer than it first looked and goes over your minutes."
8. Insert the transcripts row (project_id, user_id, language, full_text from alternatives[0].transcript, words, duration_s). Conditional update projects set status = 'planning', verified_duration_s where id = project_id and status = 'transcribing'. If 0 rows updated, stop and return 200.
9. Failure helper (put it in _shared/fail.ts so every function uses it): set status 'failed' + error, insert a refund ledger line equal to minus the total minutes charged for this project unless a refund line already exists, send the "Processing failed" email (PRD 17).
10. Start plan-clips without waiting: EdgeRuntime.waitUntil(invokeInternal('plan-clips', { project_id })). Return 200 { ok: true } immediately. Deepgram only needs a fast 2xx.

Logging: project_id, word_count, filler_count, verified_duration_s, ms. Never log the words.

Then:
- Deploy: supabase functions deploy deepgram-callback --no-verify-jwt
- Save a real Deepgram response as supabase/functions/deepgram-callback/fixture.json (I'll paste one from a test run, or call Deepgram once with my test video and save it).
- Give me 3 curl tests: (a) correct token with the fixture body, expect 200 and a transcripts row; (b) same call again, expect 200 and no second row; (c) wrong token, expect 401. Print the exact commands with placeholders.
Stop and wait for my OK.`,
  },
  {
    name: 'plan-clips',
    purpose: 'Sends the transcript to Claude (claude-sonnet-5-5), gets back a validated JSON edit plan, computes the exact cuts and face offsets, and creates the clip rows.',
    trigger: 'Called internally by deepgram-callback (or by start-transcription on Try again) with the x-internal-secret header.',
    secrets: ['SB_SECRET_KEY', 'ANTHROPIC_API_KEY', 'INTERNAL_FUNCTION_SECRET', 'RESEND_API_KEY', 'EMAIL_FROM', 'SITE_URL'],
    prompt: `Read PRD.md sections 11.3, 12, 13.1 and 13.2. Build supabase/functions/plan-clips/index.ts plus supabase/functions/_shared/edit-plan.ts. Deploy with --no-verify-jwt (it checks the internal secret instead).

Part A: _shared/edit-plan.ts (pure functions, no network):
- sentences(words): split into sentences on . ? ! in pw or a gap over 0.8 s. Returns [{ startIdx, endIdx, s, e, text }].
- cutSegments(words, startIdx, endIdx): exactly PRD 13.1. Returns [{ in, out, at }] and totalLength.
- remapTime(t, segments): PRD 13.1.
- faceOffsets(faceTrack, segments, width, height): PRD 13.2. Returns segments with offsetX (and splits moving segments every 4 s).
- groupCaptions(words, segments, style): PRD section 14 grouping rules for 'punch', 'clean', 'karaoke'. Returns [{ start, end, words: [{ text, emphasis, active? }] }] in clip time.
- Write Deno tests in supabase/functions/_shared/edit-plan.test.ts using a small fixture of 60 words with fillers and a 1.2 s pause. Run: deno test supabase/functions/_shared/

Part B: plan-clips/index.ts:
1. requireInternal(req). Parse { project_id }.
2. Load project, transcript and profile with the admin client. If status is not 'planning' or clips already exist for this project, return 200 { skipped: true }.
3. Build the user message exactly like PRD 12.2 using sentences(). Wrap fillers as {um}. Include creator_niche from profile.niche and target_clips = clamp(project.clip_count_target, 1, trial ? 5 : 8).
4. Call Claude with npm:@anthropic-ai/sdk:
   - client.messages.create({ model: 'claude-sonnet-5-5', max_tokens: 16000, system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }], messages: [{ role: 'user', content: transcriptBlock }], output_config: { effort: 'medium', format: { type: 'json_schema', schema: CLIP_PLAN_SCHEMA } } })
   - SYSTEM_PROMPT is the text in PRD 12.3, copied exactly. CLIP_PLAN_SCHEMA is PRD 12.4.
   - Do not set thinking (adaptive is the default on this model). Do not set temperature.
   - If stop_reason is 'refusal' or 'max_tokens', treat as a failed attempt.
   - Read the first text block and JSON.parse it.
5. Validate with zod plus the extra rules in PRD 12.4 (sentence boundary snapping, 25 to 65 s after cuts, no overlap, indexes inside the clip, emoji allow-list, hashtag cleanup). Collect every problem as a short string.
6. If invalid: call Claude once more with the same request plus a second user turn: "Your previous answer had these problems: <list>. Return a corrected JSON." If still invalid, keep only the clips that pass. If none pass, use the fail helper with "We could not pick clips from this video. Your minutes have been refunded."
7. For each valid clip: segments = faceOffsets(face_track, cutSegments(...)). edit_plan = { claude: <the clip JSON>, segments, totalLength }. Insert into clips with rank, score, start_s = words[start].s, end_s = words[end].e, hook_title, reason, post_caption, hashtags, caption_style = profile.default_caption_style, status 'planned'.
8. Conditional update projects set status = 'rendering' where id and status = 'planning'.
9. EdgeRuntime.waitUntil(invokeInternal('render-clips', { project_id })). Return 200 { ok: true, clips: n }.

Error handling: wrap the Claude call with the SDK error classes (Anthropic.RateLimitError, Anthropic.APIError). The SDK already retries twice. Timeout 120000 ms on the client.
Logging: project_id, usage.input_tokens, usage.output_tokens, usage.cache_read_input_tokens, clip count, validation problems count, ms. Never log the transcript or Claude's text.

Testing:
- Give me a curl that calls plan-clips with the internal secret for a project I set back to 'planning' in the SQL editor:
  curl -i -X POST "https://<ref>.supabase.co/functions/v1/plan-clips" -H "x-internal-secret: <INTERNAL_FUNCTION_SECRET>" -H "Content-Type: application/json" -d '{"project_id":"<id>"}'
- And a SQL query that shows the clips it created: select rank, score, hook_title, start_s, end_s, (edit_plan->>'totalLength') from clips where project_id = '<id>' order by rank;
- And a curl without the header that must return 401.
Stop and wait for my OK.`,
  },
  {
    name: 'render-clips',
    purpose: 'Builds a Shotstack JSON timeline for each clip (cuts, 9:16 crop, captions, hook card, emojis, progress bar, b-roll) and submits the renders with a callback URL.',
    trigger: 'Called internally by plan-clips for all planned clips, or by the browser from the clip editor to re-render one clip.',
    secrets: ['SB_SECRET_KEY', 'SHOTSTACK_API_KEY', 'SHOTSTACK_ENV', 'PEXELS_API_KEY', 'CALLBACK_SECRET', 'INTERNAL_FUNCTION_SECRET', 'SITE_URL'],
    prompt: `Read PRD.md sections 11.4, 13 and 14. Build supabase/functions/_shared/shotstack.ts and supabase/functions/render-clips/index.ts.

Part A: _shared/shotstack.ts
- buildTimeline({ clip, transcript, project, profile, rawUrl, callbackUrl }) returns the Shotstack edit JSON shaped exactly like PRD 13.4.
- Recompute segments with cutSegments + faceOffsets from the stored transcript using clip.start_s / clip.end_s (find the nearest word indexes), so trims from the editor are honoured.
- Tracks top to bottom: hook card, emojis (if show_emojis), captions, progress bar (if show_progress_bar), b-roll, main video.
- Captions from groupCaptions(style). HTML-escape every word and the hook title before putting it in html. Use the preset CSS from PRD 14 with profile.brand_colour.
- Emoji images at SITE_URL/emoji/<codepoint>.png. B-roll from Pexels (PRD 13.4 notes), skip quietly on any error or when PEXELS_API_KEY is missing.
- Fonts from SITE_URL/fonts/*.ttf.
- Output 1080 x 1920, 30 fps, mp4, poster capture at 1 s.
- Export a helper estimateSize(json) and refuse to submit if the JSON is over 400 KB (log it).

Part B: render-clips/index.ts
1. Accept either x-internal-secret (body { project_id }) or a user JWT via requireUser (body { clip_id }). Handle CORS for the browser path.
2. Internal path: load all clips for the project with status 'planned'.
3. User path: load the clip where id = clip_id and user_id = userId (403 if not theirs). Check has_active_access (402). Call reserve_minutes(userId, project_id, 1, 'rerender') (402 over_limit if false). Bump version by 1 and set status 'rendering'.
4. Signed URL for the raw video valid 21600 seconds (6 hours).
5. For each clip, one at a time with a 300 ms gap:
   - callbackUrl = SUPABASE_URL/functions/v1/shotstack-callback?clip_id=<id>&v=<version>&token=<sign(clip_id)>
   - POST https://api.shotstack.io/edit/<SHOTSTACK_ENV>/render with headers x-api-key: SHOTSTACK_API_KEY, Content-Type: application/json, body = buildTimeline(...) plus callback.
   - On success insert render_jobs (clip_id, project_id, user_id, clip_version, shotstack_id = response.response.id, status 'submitted', attempt 1) and set the clip status 'rendering'.
   - On failure mark that clip 'failed', log the Shotstack message, and carry on with the next clip. If every clip failed, use the fail helper.
6. Return 200 { ok: true, submitted: n }.

Logging: clip_id, shotstack_id, number of timeline clips, payload KB, ms. Never log the signed URL.

Before writing render-clips, write scripts/shotstack-smoke.sh that POSTs the PRD 13.4 example (with a public test MP4 URL) to the stage endpoint and polls GET /edit/stage/render/<id> every 5 s until done, then prints the output URL. I will run it first to prove fonts, html captions and the crop all work.

Deploy with: supabase functions deploy render-clips --no-verify-jwt (the function checks either the internal secret or the user JWT with getClaims itself, so the gateway check is not needed). Give me curl tests for both paths and one that must return 403 (another user's clip).
Stop and wait for my OK.`,
  },
  {
    name: 'shotstack-callback',
    purpose: 'Receives the "render finished" ping from Shotstack, re-checks the real status, copies the MP4 and poster into the private renders bucket, marks clips ready and emails the user when the whole project is done.',
    trigger: 'Shotstack webhook (the callback URL set by render-clips).',
    secrets: ['SB_SECRET_KEY', 'SHOTSTACK_API_KEY', 'SHOTSTACK_ENV', 'CALLBACK_SECRET', 'RESEND_API_KEY', 'EMAIL_FROM', 'SITE_URL'],
    prompt: `Read PRD.md sections 9.2, 11.5 and 17. Build supabase/functions/shotstack-callback/index.ts and _shared/email.ts. Deploy with --no-verify-jwt.

_shared/email.ts: sendEmail({ to, subject, html }) POSTs to https://api.resend.com/emails with Authorization: Bearer RESEND_API_KEY and from = EMAIL_FROM. Plain HTML template with one violet button. Never throws (logs and returns false), so an email failure never breaks the pipeline.

shotstack-callback/index.ts, in order:
1. Only POST. Read clip_id, v and token from the query string. verify(clip_id, token) or 401.
2. Read the body only for its id field. Do not trust its status or url.
3. Find render_jobs where shotstack_id = id and clip_id = clip_id. Not found: 404. Already 'done' or 'failed': return 200 (duplicate).
4. GET https://api.shotstack.io/edit/<SHOTSTACK_ENV>/render/<id> with x-api-key. Use response.response.status, url and poster.
5. If status is 'failed':
   - attempt 1: insert a new render_jobs row (attempt 2), rebuild the timeline with buildTimeline and resubmit with a fresh callback. Mark the old job failed.
   - attempt 2: mark the job and clip 'failed'. Go to step 8.
6. If status is not 'done' (queued, rendering), return 200 and do nothing.
7. If 'done':
   - fetch(url) and fetch(poster) and upload the bytes with the admin client to renders/<user_id>/<project_id>/<clip_id>-v<version>.mp4 (contentType video/mp4) and .jpg (image/jpeg), upsert true. Shotstack hosted files expire after 24 hours, so this copy is required.
   - Update the clip: status 'ready', render_path, poster_path, duration_s from the edit plan total. Only if clips.version still equals v (a newer re-render may be on the way). Mark the job 'done', completed_at now().
8. Project completion check: count the project's clips by status. If none are 'planned' or 'rendering':
   - Conditional update projects set status = (any ready ? 'ready' : 'failed'), ready_at = now() where id and status = 'rendering'.
   - Only if that update changed 1 row: send the "Clips ready" email (PRD 17) with the top-ranked hook title and a link to SITE_URL/app/projects/<id>. If none ready, use the fail helper instead.
   - Re-renders of a single clip on a project that is already 'ready' send no email.
9. Return 200 { ok: true }.

Logging: clip_id, shotstack_id, status, mp4 size MB, ms. Never log URLs.

Testing:
- Give me a curl that replays a callback for a real finished render (I'll copy the id from render_jobs), expect 200 and files in the renders bucket.
- Run the same curl again: expect 200, no new email, no duplicate files.
- Wrong token: expect 401.
- A SQL check: select status, render_path, version from clips where project_id = '<id>';
Stop and wait for my OK.`,
  },
]
