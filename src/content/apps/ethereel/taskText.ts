// Ethereel: Long prompts and code blocks used by Ethereel tasks, keyed by id.
// Generated from markdown source.

export const taskText: Record<string, string> = {
  'fe-shell': `Read @PRD.md sections 7, 8 and 21, and @DESIGN.md sections 3, 5, 16 and 25. UI rules: @DESIGN_SYSTEM.md @DESIGN.md.

Build the Ethereel app shell, onboarding and settings:
1. app/app/layout.tsx (server): load the user with supabase.auth.getClaims(); redirect to /login if none.
   Call has_active_access via rpc; if false and the path is not /app/billing or /app/settings, redirect to
   /app/billing?reason=trial_over. Render <AppShell>.
2. components/shell/AppShell.tsx and Sidebar.tsx exactly as @DESIGN.md section 3: logo, Videos, Review
   (count of videos in ready_for_review, via a small Realtime subscription on videos), Queue, Assets,
   spacer, Documentation, Help, Billing, Settings, then <PlanMeter> (rpc my_limits) and the account row.
   Phosphor icons 17px, duotone in the accent when selected. 56px icon-only sidebar under 1100px.
3. Add the accent tokens from @DESIGN.md section 1 to app/globals.css and map --blue tokens to them.
4. app/onboarding/page.tsx: the 4-step morphing card (Brand, Look, Socials, First upload). Step 1 writes
   creator_settings.series_title, handle_tiktok, handle_instagram, hashtag_line; step 2 filter_preset_id and
   music; step 3 uses the connect-social edge function; step 4 embeds the upload drop zone (built in the
   next task, leave a placeholder component). Save profiles.onboarding_step after each step.
5. app/app/settings/page.tsx with the 7 tabs from PRD section 21. Every tab reads and writes
   creator_settings with the browser Supabase client (RLS limits it to the user's own row). Validate with
   zod using the same limits as the SQL checks (series title 48, hashtag line 200, guidance 600, 1 to 8 slots
   in HH:MM). One Save per tab, disabled until dirty, "Saved" toast.
6. lib/grade.ts: gradeToCss(preset) returns the CSS filter string plus an inline SVG filter id for warmth and
   sharpness, and gradeToFfmpeg(preset) returns the ffmpeg filter chain, both following PRD 9.7 exactly
   (order: warmth, brightness, contrast, saturation, sharpness; brightness via lutrgb multiply). Write
   vitest tests for both outputs with the 5 built-in presets.
7. The Look tab: <GradePreview> applies gradeToCss to the latest cover (or /sample/still.jpg) live as the
   sliders move.
Check every page at 375px and 1280px. No layout shift when Save toggles or the meter updates.`,
  'fe-upload': `Read @PRD.md section 9.1 and @DESIGN.md sections 7 and 8.

Build the upload flow:
1. npm install tus-js-client.
2. components/upload/UploadSheet.tsx (side panel over /app/videos, also routed at /app/videos/new):
   drop zone for .mov/.mp4/.m4v, Motion graphics switch, plan line from rpc my_limits.
3. For each picked file, read its duration in the browser (hidden video element, loadedmetadata), then call
   supabase.functions.invoke('create-upload', { body: { files, motionGraphics } }). Show per-file errors
   from the response inside the matching UploadRow and skip those files.
4. lib/upload/tus.ts: startUpload({ file, endpoint, bucket, objectName, token, onProgress }) using
   new tus.Upload(file, { endpoint, retryDelays: [0, 3000, 5000, 10000, 20000], chunkSize: 6 * 1024 * 1024,
   uploadDataDuringCreation: true, removeFingerprintOnSuccess: true, headers: { 'x-signature': token,
   'x-upsert': 'false' }, metadata: { bucketName: bucket, objectName, contentType: file.type,
   cacheControl: '3600' } }). Before start, call upload.findPreviousUploads() and resumeFromPreviousUpload
   on the first match, so a reload continues. If the server answers 400/401 to x-signature, retry once with
   headers { authorization: 'Bearer ' + session.access_token, apikey: publishableKey } (PRD 9.1 step 3).
5. Run at most 2 uploads at a time; queue the rest. Each UploadRow shows percent (tabular, fixed width) and
   the states from @DESIGN.md section 21 UploadRow. Going offline shows "Paused, will resume" and
   tus retries by itself.
6. On success call start-pipeline { videoId }. If the response status is 'awaiting_assets', show the
   "Add assets" link in the row and, when the whole batch is uploaded, route to /app/videos/[id]/assets.
7. app/app/videos/[id]/assets/page.tsx: drop screenshots (png/jpg/webp, 20 MB), upload each with
   supabase.storage.from('assets').upload('<uid>/<videoId>/<safe filename>'), insert video_assets
   (filename, mime_type, size_bytes, storage_path), show matched tokens (split the filename on - _ and
   spaces, drop stop words, same function as the pipeline in lib/assets/tokens.ts). Buttons "Skip, no
   screenshots" and "Continue with N screenshots" call start-pipeline { videoId, assetsDone: true }.
8. A small sticky "Uploading 2 of 3" pill bottom left keeps uploads alive when the sheet closes.
Test: upload a 200 MB clip, turn Wi-Fi off at 30% for 10 seconds, then on. It must continue, not restart.`,
  'fe-library': `Read @PRD.md sections 7 and 11.1 and @DESIGN.md sections 2, 6, 9 and 24.

Build the Videos library and the processing view:
1. app/app/videos/page.tsx: table from the video_cards view (select * order by created_at desc, 50 per page,
   search on title with ilike). Columns, filter chips and selection bar exactly as @DESIGN.md section 6.
   Covers come from renders cover_path through createSignedUrls (one call per page, 1 hour).
2. components/StatusTag.tsx: the fixed status-to-hue map and labels from @DESIGN.md section 2, with the
   live dot for running states. Reserve width for the longest label.
3. Realtime: subscribe to postgres_changes on videos filtered by user_id=eq.<uid> and patch rows in place.
   Never re-sort or re-animate on an update.
4. app/app/videos/[id]/page.tsx: processing view with <StepList> (12 rows, @DESIGN.md section 9 and 21).
   Initial state from job_events for the video (order by id), then Realtime inserts on job_events filtered by
   video_id. Map each event step to a row; detail text from meta (e.g. meta.cuts = 15 → "15 cuts").
5. Failed state: plain message, "Retry from this step" calls a small server route /api/videos/retry that
   checks ownership with getClaims and calls start-pipeline style logic via the trigger-callback-free path:
   it re-triggers process-video with { videoId, fromStep } (add fromStep support to the task later).
6. When status reaches ready_for_review: one toast "Ready to review" with "Open", and the primary button
   becomes "Review now". No automatic redirect.
7. Row menu: Download MP4 (signed URL of final_path with download param), Delete (calls /api/videos/delete:
   cancels the Trigger.dev run with runs.cancel if running, sets status 'cancelled', deletes storage folders).
8. Empty, loading and error states from @DESIGN.md section 24.`,
  'fe-review': `Read @PRD.md sections 12, 13 and 18 and @DESIGN.md sections 11, 21 and 22.

Build Review:
1. app/app/review/page.tsx: grid of cards for videos in ready_for_review, oldest first.
2. app/app/review/[id]/page.tsx: three columns. <PhoneFrame size="lg" overlay=...> plays a signed URL of
   the current render's final_path. Segmented control TikTok / Instagram / Clean swaps <PlatformOverlay>
   (two transparent PNGs in public/overlays/, draw simple placeholders now: right-rail circles and a bottom
   text block, 1080x1920). "Show safe zone" toggles a dashed guide at 1360/1920 of the height.
3. Caption editor: current post_captions row (is_current). Hook counter /90, body textarea, read-only
   hashtag line, total counter /2,200 tabular. Save inserts a new post_captions row with source 'user'
   (RLS allows only source 'user' from the browser). Rewrite calls rewrite-caption and shows the remaining
   count from my_limits. Amber note if ai_tells_found is not empty.
4. Pass dialog: loads social_accounts; shows TikTok nickname, privacy select from creator_info, the three
   toggles defaulting from creator_settings, the required consent checkbox, Instagram line; calls pass-video.
   Morphs to the success state. Manual queue mode shows the slot picker (next 14 days x creator slots, taken
   slots disabled from scheduled_posts).
5. Request revision dialog: textarea, the helper text, revisions left; calls request-revision; morphs to
   planning (live dot), then subscribe to revision_requests for this id: 'impossible' → show the reason in
   the dialog; 'rendering' → close and show a Revising overlay on the phone with a compact step list; when the
   video returns to ready_for_review, reload the render and versions.
6. Reject popover: sets the decision through a server route /api/videos/reject (getClaims, ownership, sets
   status 'rejected' and review_decision 'reject' with the secret key).
7. Versions column: edit_revisions + revision_requests joined by revision_request_id, newest first, with
   what_changed lines. Undo on the newest applied revision calls /api/videos/undo, which triggers the
   revise-video task with { videoId, undo: true }.
8. Keyboard shortcuts from @DESIGN.md section 26. Stack the columns under 1100px with a sticky action bar.
Test by passing one video, rejecting one and requesting one revision.`,
  'fe-queue': `Read @PRD.md section 13 and @DESIGN.md sections 12 and 13.

Build Queue and Assets:
1. app/app/queue/page.tsx: Week view <SlotGrid> for the selected week in the creator's timezone (use
   date-fns-tz). Rows are creator_settings.posting_slots; cells filled from scheduled_posts joined to
   video_cards where status <> 'cancelled'. Past cells faded with live links (tiktok_url, instagram_url).
2. Drag a filled cell to an empty future cell → pass-video { videoId, slotAt } (which calls move_slot).
   Keyboard path: cell menu "Move to..." opens the same slot picker as Review. On 409 slot_taken, toast
   "Someone took that slot a moment ago" and refetch.
3. List view toggle with the table from @DESIGN.md section 12. Unschedule calls pass-video { unschedule: true }.
4. Banner when any social_accounts row has status needs_reconnect, linking to Settings > Socials.
5. Realtime on scheduled_posts filtered by user_id so a handover or a live link updates the cell in place.
6. app/app/assets/page.tsx: tabs Brand (avatar to assets/<uid>/brand/avatar.png, square crop to 512 px in
   the browser with a canvas, then update creator_settings.avatar_path), Music (library + own tracks; upload
   MP3/M4A/WAV to music/<uid>/<id>.<ext> then insert music_tracks with duration from an audio element;
   loudness is measured later by the pipeline), Screenshots (video_assets grouped by video).
7. Only one audio element plays at a time (a tiny global store).`,
  'be-trigger-config': `import { defineConfig } from "@trigger.dev/sdk";
import { ffmpeg } from "@trigger.dev/build/extensions/core";
import { pythonExtension } from "@trigger.dev/python/extension";

export default defineConfig({
  project: "proj_xxxxxxxxxxxxxxxxxxxx", // from the Trigger.dev dashboard
  runtime: "node",
  dirs: ["./trigger"],
  maxDuration: 1800, // seconds of compute per run, a hard stop for runaway jobs
  retries: {
    enabledInDev: true,
    default: { maxAttempts: 3, factor: 2, minTimeoutInMs: 2000, maxTimeoutInMs: 30000, randomize: true },
  },
  build: {
    external: ["fluent-ffmpeg"],
    extensions: [
      ffmpeg({ version: "7" }), // static ffmpeg 7.x, sets FFMPEG_PATH and FFPROBE_PATH
      pythonExtension({
        requirementsFile: "./python/requirements.txt",
        devPythonBinaryPath: ".venv/bin/python",
        scripts: ["./python/**/*.py"],
      }),
    ],
  },
});`,
  'be-trigger-init': `Set up Trigger.dev v4 for Ethereel. Read @PRD.md sections 9 and 16.
1. Run: npx trigger.dev@latest init (choose the existing project "ethereel", folder ./trigger, no example).
2. Replace trigger.config.ts with the version I paste below, then npm install -D @trigger.dev/build and
   npm install @trigger.dev/sdk @trigger.dev/python.
3. Create python/requirements.txt with mediapipe and opencv-python-headless (latest stable versions), and
   python/faces.py as a stub that prints {"ok": true}. Create .venv with python3 -m venv .venv and install the
   requirements into it for local dev.
4. Create trigger/queues.ts with pipelineQueue = queue({ name: 'pipeline', concurrencyLimit: 2 }) and
   gentleQueue = queue({ name: 'pipeline-gentle', concurrencyLimit: 1 }).
5. Create trigger/hello.ts: a task "ethereel-hello" on machine "small-1x" that runs ffmpeg -version and the
   python stub with python.runScript('./python/faces.py', []) and returns both outputs.
6. Create trigger/lib/supabase.ts (admin client from SUPABASE_URL + SUPABASE_SECRET_KEY) and
   trigger/lib/callback.ts (HMAC signer from the trigger-callback prompt).
7. Start npx trigger.dev@latest dev, trigger ethereel-hello from the dashboard Test page, and show me the output.
8. Deploy: npx trigger.dev@latest deploy. Confirm the run works in the Prod environment too.
Never print secret values.`,
  'be-remotion-setup': `# 1. In your project folder (once)
npm i remotion @remotion/cli @remotion/lambda @remotion/fonts

# 2. Print the policies, paste them into the AWS console (see steps above)
npx remotion lambda policies role
npx remotion lambda policies user

# 3. Check the user policy is right (needs REMOTION_AWS_* in .env)
npx remotion lambda policies validate

# 4. Deploy the render function (3 GB RAM, 240 s timeout, 4 GB disk)
npx remotion lambda functions deploy --memory=3009 --timeout=240 --disk=4096

# 5. Upload the Remotion project as a site
npx remotion lambda sites create remotion/index.ts --site-name=ethereel

# 6. Test render the sample composition
npx remotion lambda render ethereel Reel --props=./remotion/sample-props.json`,
  'be-groq-curl': `# Make a 10 second test file from any clip you have, then transcribe it
ffmpeg -i my-clip.mov -t 10 -ac 1 -ar 16000 test.flac

curl -s https://api.groq.com/openai/v1/audio/transcriptions \\
  -H "Authorization: Bearer $GROQ_API_KEY" \\
  -F "file=@test.flac" \\
  -F "model=whisper-large-v3-turbo" \\
  -F "response_format=verbose_json" \\
  -F "timestamp_granularities[]=word" \\
  -F "language=en" \\
  -F "prompt=Ethereel, Supabase, Claude Code." | head -c 900`,
  'be-anthropic-curl': `curl -s https://api.anthropic.com/v1/messages \\
  -H "x-api-key: $ANTHROPIC_API_KEY" \\
  -H "anthropic-version: 2023-06-01" \\
  -H "content-type: application/json" \\
  -d '{
    "model": "claude-opus-5-5",
    "max_tokens": 2000,
    "output_config": {
      "effort": "low",
      "format": { "type": "json_schema", "schema": {
        "type": "object", "additionalProperties": false,
        "required": ["subtitle"],
        "properties": { "subtitle": { "type": "string" } } } }
    },
    "system": "Write a 2 to 3 word lowercase subtitle for a short video. No punctuation.",
    "messages": [{ "role": "user", "content": "<transcript>Today I want to show you how I cut my editing time from an hour to five minutes.</transcript>" }]
  }'`,
  'be-zernio-curl': `# 1. Who am I? (lists profiles; a 200 means the key works)
curl -s https://zernio.com/api/v1/profiles -H "Authorization: Bearer $ZERNIO_API_KEY"

# 2. Make a test profile
curl -s -X POST https://zernio.com/api/v1/profiles \\
  -H "Authorization: Bearer $ZERNIO_API_KEY" -H "Content-Type: application/json" \\
  -d '{"name":"eth_test"}'

# 3. Get a connect link for TikTok (open the url it returns in your browser)
curl -s "https://zernio.com/api/v1/connect/tiktok?profileId=PROFILE_ID&redirect_url=http://localhost:3000/api/zernio/callback" \\
  -H "Authorization: Bearer $ZERNIO_API_KEY"

# 4. List connected accounts
curl -s "https://zernio.com/api/v1/accounts?profileId=PROFILE_ID" -H "Authorization: Bearer $ZERNIO_API_KEY"`,
  'be-mediapipe-test': `# python/faces_test.py: run with  .venv/bin/python python/faces_test.py my-clip.mp4
import sys, json
import cv2
import mediapipe as mp
from mediapipe.tasks import python as mp_python
from mediapipe.tasks.python import vision

options = vision.FaceLandmarkerOptions(
    base_options=mp_python.BaseOptions(model_asset_path="python/models/face_landmarker.task"),
    running_mode=vision.RunningMode.VIDEO,
    num_faces=1,
)
cap = cv2.VideoCapture(sys.argv[1])
fps = cap.get(cv2.CAP_PROP_FPS) or 30
points, frame_i = [], 0
with vision.FaceLandmarker.create_from_options(options) as lm:
    while True:
        ok, frame = cap.read()
        if not ok:
            break
        if frame_i % 5 == 0:
            image = mp.Image(image_format=mp.ImageFormat.SRGB, data=cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
            res = lm.detect_for_video(image, int(frame_i * 1000 / fps))
            if res.face_landmarks:
                f = res.face_landmarks[0]
                x = (f[468].x + f[473].x) / 2
                y = (f[468].y + f[473].y) / 2
                points.append({"t": int(frame_i * 1000 / fps), "x": round(x, 4), "y": round(y, 4)})
        frame_i += 1
print(json.dumps({"samples": len(points), "first": points[:3]}))`,
  'be-pipe-1': `Read @PRD.md sections 9.1 to 9.4, 11.1 and 16. Build the first half of the pipeline as Trigger.dev v4 tasks in
./trigger. Use the shared helpers trigger/lib/supabase.ts and trigger/lib/callback.ts.

1. trigger/process-video.ts: task "process-video" (machine small-1x, queue chosen by the caller). Input
   { videoId, fromStep? }. Steps in order: prepare-video, transcribe-video, cut-video, detect-faces,
   plan-video, render-video, mix-export, write-caption. Call each with triggerAndWait and unwrap the result.
   Before each step send a callback { step, status: 'started' } and after it { status: 'done', meta }. If a
   callback answers 409 cancelled, stop. Skip steps before fromStep and any step whose output already exists
   for this edit version (look in renders/<uid>/<vid>/work/). On a failed step send { status: 'failed',
   errorCode, message } and return.
2. trigger/prepare-video.ts (machine medium-2x): download raw from raw-videos with a signed URL into /tmp,
   ffprobe, the checks (too_long, too_short, no_audio), normalise to source.mp4 (30 fps CFR, rotation, 1080x1920
   cover crop, HDR tone-map when color_transfer is smpte2084 or arib-std-b67, BT.709 tags), proxy.mp4 at
   720x1280, voice.wav (mono 16 kHz pcm_s16le) and voice48.wav. Use the exact ffmpeg filters in PRD 9.2. Upload
   outputs to renders/<uid>/<vid>/work/. Update videos duration_ms, width, height, was_hdr.
   Use child_process spawn with process.env.FFMPEG_PATH; stream stderr progress (time=) into a callback
   every 10 seconds.
3. trigger/transcribe-video.ts (small-1x): FLAC encode, Groq request exactly as PRD 9.3 (verbose_json, word
   timestamps, temperature 0, prompt from vocabulary + handles, about 200 tokens max), 60 s timeout, retry 3
   with backoff; fallback to Deepgram nova-3 with keyterm per vocabulary word if DEEPGRAM_API_KEY is set.
   Apply spelling_fixes and misheard_handles (whole word, case insensitive, multi-word). Save transcripts.
   Meter kind 'transcription' with idempotencyKey 'transcribe:<videoId>'. No speech → errorCode 'no_speech'.
4. packages/shared/cut.ts: pure functions loudnessEnvelope(pcm, 10ms), voiceAverageDb(envelope, words),
   silenceMap(envelope, thresholdDb, minLoudMs = 60), snapWords(words, envelope), cutList(words, silences)
   with the exact numbers from PRD 9.4 (threshold = voice average minus 12 dB; clicks under 60 ms do not break
   a pause; remove pauses over 400 ms; keep 120 ms after the last word and 100 ms before the next; 200 ms
   lead-in; 400 ms tail). Export the numbers as named constants. Write the 5 vitest tests listed in 9.4 and
   make them pass.
5. trigger/cut-video.ts (small-2x): read voice.wav, run the functions, save segments and word map to
   work/cut.json, update transcripts voice_avg_db, threshold_db, silences and videos.edited_duration_ms.
   Callback meta { cuts, removedMs }.
Run the tests, then run process-video in dev on a real 60 s clip and show me the job_events rows.`,
  'be-pipe-2': `Read @PRD.md sections 9.5 to 9.11, 10 and 17. Build the middle of the pipeline.

1. python/faces.py: the MediaPipe script (VIDEO mode, face_landmarker.task in python/models/, every 5th
   frame, eye centre = mean of landmarks 468 and 473) writing JSON to the output path. Smooth with a 0.5 s
   moving median in TypeScript after it returns.
2. trigger/detect-faces.ts (machine medium-1x): download proxy.mp4, python.runScript('./python/faces.py',
   [input, output]), compute per-segment median eye point and confidence, fallbacks from PRD 9.5. Save
   work/faces.json. Callback meta { faceFrames: '98%' }.
3. packages/shared/zoom.ts: mulberry32(fnv1a(seed)) PRNG and chooseZooms(segments, seed) following PRD 9.6
   exactly (about one cut in three at 1.12x on the eyes, never the first segment, never two in a row, never
   segments under 1.2 s; opening push-in 1.00 to 1.06). Tests: same seed gives the same picks; no two in a row.
4. packages/shared/captions.ts: buildCaptionPages(words, overrides) with PRD 9.8 rules (2 to 4 words, max
   1.2 s, break at sentence ends then clauses, fold single leftovers into the next page, appear on the first
   word, end at next page or last word + 300 ms). Tests for each rule.
5. packages/shared/assets.ts: tokens(filename) and matchAssets(assets, words) (best transcript window within
   4 s with the most stemmed token hits; returns the first hit word index).
6. packages/shared/cutawayRules.ts: applyCutawayRules(plan, ctx) implementing every rule in PRD 9.11 (snap to
   words, max min(4, floor(duration/16 s)), 3 to 6.5 s, never first 3 s, at least 6 s apart, no overlap with
   the follow card, text clipped to 4 / 3 / 3 words, each asset once). Returns { kept, dropped: [{ id, reason }] }.
   Tests for every rule.
7. packages/shared/layout.ts: layoutCutaway(cutaway, measure) for the six kinds using the slot templates in PRD
   9.11 (title band y 220 to 380, content y 420 to 1280, 72 px margins, font steps 64/56/48 then two lines,
   no box overlaps, punch inside its target). Use @remotion/layout-utils measureText for the measure function.
   Returns boxes or throws LayoutOverflow. Tests: no overlaps for 4-item flow and list; long titles shrink.
8. trigger/plan-video.ts (small-1x): build the cutaway prompt and schema from PRD 17.1 (wrap transcript and
   assets with the data guard), call Claude (effort medium), validate with zod, run applyCutawayRules and
   layout, then the subtitle call (17.2, effort low). Find the follow card cue (9.10). Assemble edit.json v1 with
   EditSchema (10), validateEdit, insert edits + edit_revisions (reason 'initial') + cutaway_plans. Meter each
   Claude call (kind 'claude', idempotencyKey 'plan:<videoId>:v1' and 'subtitle:<videoId>:v1'). If Claude fails
   twice, continue with no cutaways and subtitle "" and note it in job_events (never fail the video for this).
Run all tests, then run the pipeline to plan-video on a real clip and print the edit.json summary.`,
  'be-remotion-comp': `Read @PRD.md sections 9.6 to 9.12 and 10, and @DESIGN.md section 27. Build the Remotion project in ./remotion.

1. remotion/index.ts registers <Root>; remotion/Root.tsx has one <Composition id="Reel"> 1080x1920 at 30 fps,
   calculateMetadata sets durationInFrames from props.durationMs, defaultProps from remotion/sample-props.json
   (a small but complete edit.json with 2 cutaways).
2. Props = EditSchema (import from packages/shared/edit.ts) plus urls { video, avatar, assets{}, music? }.
3. Layers, top to bottom of the file and bottom to top on screen:
   a. <VideoTrack>: one <Sequence> per segment with <OffthreadVideo src={urls.video} startFrom={msToFrame(srcStart)}
      muted>, transform for push_in (interpolate 1 to 1.06 over the first segment, ease in-out) and punch_in
      (scale 1.12 with origin at the clamped eye point, instant). CSS filter from gradeToCss.
   b. <Cutaway> per cutaway in a <Sequence>: paper page (#f6f1e7), blue grid (54 px, 35%), red margin line, grain
      overlay, the six kinds drawn as SVG from layout boxes, boiling ink (feTurbulence + feDisplacementMap with a
      seed that changes every 2.5 frames), items revealed at their beat frames (stroke-dashoffset 250 ms), punch
      mark in #b5452b, Image kind as a tilted print with a white mat. Hard cut in with a 4-frame white flash
      from 60% to 0.
   c. <Captions>: pages from props.captionPages, Inter 600 56 px, -0.01em, white, 2 px black stroke with
      paint-order stroke, soft shadow, centred at y 1421; inside a cutaway window: #1c1b19, no stroke, no shadow,
      switching on the exact frame. No animation. Apply captionOverrides.
   d. <OpeningTitle>: series title y 300, two-stroke orange marker scribble (0 to 0.35 s, 0.45 to 0.8 s), lowercase
      subtitle below, stop-motion jitter (2 px, 0.4 degrees, step every 2.5 frames, seeded), grain 8%, hard cut out
      at props.title.outAt.
   e. <FollowCard>: slides up 240 ms at followCard.start, avatar 96 px, handle, Follow button that fills to
      "Following ✓" with an 8-dot burst at followAt, leaves at end.
4. Load Inter SemiBold and the hand-lettering font with @remotion/fonts loadFont from remotion/public/fonts.
5. Everything deterministic: no Math.random, no Date. Use a seeded PRNG from packages/shared/zoom.ts.
6. Add npm scripts: "remotion:studio": "remotion studio remotion/index.ts" and "remotion:render":
   "remotion render remotion/index.ts Reel out/sample.mp4 --props=remotion/sample-props.json".
Open the studio, scrub through the sample, and fix anything that overlaps the caption zone.`,
  'be-pipe-3': `Read @PRD.md sections 9.12 to 9.14, 13.3 and 18. Build the end of the pipeline.

1. trigger/render-video.ts (small-1x): create or reuse the renders row for (videoId, editVersion) with status
   'rendering'. Signed URLs (6 hours) for proxy/source, avatar, assets, fonts. renderMediaOnLambda({ region:
   REMOTION_AWS_REGION, functionName: REMOTION_FUNCTION_NAME, serveUrl: REMOTION_SERVE_URL, composition: 'Reel',
   inputProps, codec: 'h264', imageFormat: 'jpeg', jpegQuality: 90, crf: 16, muted: true, framesPerLambda: 120,
   privacy: 'private', outName: 'eth-<videoId>-v<n>.mp4' }). Poll getRenderProgress every 4 s up to 10 minutes,
   sending overallProgress to the callback at most every 10%. On done, download the output from S3 with the
   returned outKey (use @aws-sdk/client-s3 GetObject with the same credentials), upload to
   renders/<uid>/<vid>/video-v<n>.mp4, save remotion_render_id and costs.accruedSoFar as remotion_cost_usd.
   Meter kind 'render' with idempotencyKey 'render:<renderId>' (cost = Lambda cost + 0.01 licence).
   If Lambda fails 3 times, fall back to renderMedia() locally on machine large-2x (separate task
   render-video-local) with the same props.
2. trigger/mix-export.ts (medium-2x): audio rebuild exactly as PRD 9.13 (segment cuts with 10 ms afade at every
   cut, two-pass loudnorm to -14 LUFS / -1 dBTP / LRA 11, music at music_level_lufs about 25 dB under the voice,
   1.5 s fade out, -4 dB under cutaways, SFX at their times at -18 LUFS). Then the export command from 9.14
   exactly (H.264 High L4.1, 5.5 Mbps target, 6 Mbps max, BT.709 tags, AAC 48 kHz stereo 192k, no metadata, no
   chapters, no edit list, faststart). Then validation (9.14 step 2: every check, using ffprobe JSON and a
   short mp4 atom scan for elst and moov order) and the cover at 3 s. Save final-v<n>.mp4 and cover-v<n>.jpg,
   renders.validation, status 'ready'. One re-encode on failure, then errorCode 'export_invalid'.
3. trigger/write-caption.ts (small-1x): if captions_auto, the post caption call from PRD 18 (effort low,
   schema hook/body), post-processing (strip hashtags, dashes to commas, AI-tell check with one rewrite,
   append the hashtag line as the last line), insert post_captions v1 with source 'claude'. If captions_auto
   is off, insert an empty caption with only the hashtag line. Meter kind 'claude'.
4. The last callback is { step: 'ready_for_review', status: 'done', renderId }.
Run the full pipeline on a real clip, download final.mp4, and run the ffprobe check from PRD test 7.`,
  'be-revise': `Read @PRD.md sections 12 and 17.4. Build trigger/revise-video.ts (small-1x).

Input { revisionId } or { videoId, undo: true }.
1. Revision: load the request, the current edit.json, words with indexes, cutaways, music tracks and presets
   visible to the user. Set status 'planning'.
2. Call Claude with the 17.4 prompt (effort medium, structured, the note wrapped with wrapData('note', ...)).
   The schema is a oneOf over the 8 ops in PRD 12.2, each with additionalProperties false.
3. possible false → status 'impossible', impossible_reason, video back to 'ready_for_review' through the
   callback, stop. Nothing else changes.
4. Apply ops to a deep copy with packages/shared/revise.ts applyOp(edit, op, ctx). Each op validates its own
   inputs (real word indexes, real cutaway ids, visible track and preset ids) and the result runs
   applyCutawayRules, layout, buildCaptionPages and validateEdit. cut_words must never remove more than half of
   all words in total. Any failure → 'impossible' with the plain rule ("That would remove more than half the
   video."). Write vitest tests for every op and every refusal.
5. Save: insert the current version into edit_revisions (reason 'revision', revision_request_id), update
   edits with version + 1 where version = old (retry once on a conflict), what_changed from
   packages/shared/diff.ts describeChanges(old, new) (code, not Claude, lines like "Caption at 0:12: 'super
   base' → 'Supabase'"). Set status 'rendering', to_version.
6. Re-run only the affected steps from PRD 12.2 step 5 by triggering process-video with fromStep.
7. Undo: copy the previous version's edit_json as a new version (reason 'undo'); if a ready render exists for
   that edit_json's content hash, point current_render_id at it instead of rendering; mark the last applied
   request 'undone'.
8. Meter Claude (kind 'claude', idempotencyKey 'revise:<revisionId>').`,
  'be-e2e': `Run a full end-to-end test of Ethereel against my dev Supabase project and Trigger.dev dev environment,
using the Supabase MCP for SQL checks. Do not change application code unless a step fails; if it fails, show
me the error and the fix before applying it.

1. Create a test user with the Supabase admin API (email e2e+<timestamp>@example.com) and a trialing
   subscriptions row.
2. As that user (sign in with password to get a token), call create-upload for tests/fixtures/clip-60s.mov,
   upload it with tus-js-client in a Node script, then call start-pipeline.
3. Poll videos.status every 10 s (max 10 minutes) and print each new job_events row.
4. When ready_for_review: run every SQL check from @PRD.md section 24 tests 4, 5, 6 and 7, and ffprobe the
   final file.
5. Call request-revision with "Change the first word to Hello and remove the last diagram". Wait for
   ready_for_review again and check what_changed has 2 lines and edit version is 2.
6. Call request-revision with "make me look taller" and check status 'impossible'.
7. Call pass-video (consent true). Check scheduled_posts has a slot at one of the creator's times.
8. Set that slot to now() + 1 day with SQL, call zernio-sync with the cron secret, check zernio_post_id is set.
   Then delete the Zernio post through the API so nothing really posts.
9. Print a table: step, expected, actual, pass/fail. Then delete the test user and its storage folders.`,
}
