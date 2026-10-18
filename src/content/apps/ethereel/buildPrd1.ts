// Ethereel: Build PRD part 1: problem, architecture, routes, pipeline.
// Generated from markdown source; plain text inside a template literal.

export const buildPrd1 = `# Ethereel: build PRD

Save this whole document as \`PRD.md\` in your project root (next to \`package.json\`). In Claude Code,
reference it with \`@PRD.md\`, for example: "Read @PRD.md section 9.4 and build the cut list module."
The design rules live in \`@DESIGN_SYSTEM.md\` (Quiet Precision) and \`@DESIGN.md\`. The landing page lives
in \`@LANDING.md\`. The database is \`supabase/migrations/0001_ethereel.sql\`.

Version 1.0, Oct 2026. Every number in this PRD marked **(exact)** comes from the owner's working local
tool, Rosewell Reels, and must be kept exactly as written. If you think one is wrong, ask before changing it.

## 1. Problem

Coaches, consultants, SaaS founders, agency owners and podcasters know short video works. They can
talk to a phone camera for 60 seconds. What they cannot face is the hour of editing per clip: cutting
pauses, fixing captions, adding a zoom, a diagram, music, a cover, then posting at a sensible time on
two platforms. So the clips sit in their camera roll.

Existing tools fall into two camps:
- **Clip finders** (Opus Clip, Submagic, Captions.ai) are built to chop long podcasts into many short
  clips. They caption well but every reel looks the same, and they post whatever the AI picked.
- **Editors** (CapCut, Descript) give full control but the creator still does the editing.

Nobody takes a raw talking-head clip and returns a reel that looks hand-edited in the creator's own
style, waits for a yes, then posts it in the next good slot.

## 2. Ideal customer (ICP)

- Solo experts who sell their time or a product: coaches, consultants, B2B SaaS founders, agency
  owners, podcast hosts.
- Already record on an iPhone, 30 to 120 seconds, straight to camera, one take or close to it.
- Want to post every day on TikTok and Instagram Reels and are failing because of editing time.
- Have a "voice": a series name, a handle, a fixed hashtag line, words Whisper always gets wrong
  (their product name, their surname).
- Will pay $89 a month if it gives back 20 hours a month. One recovered client pays for a year.

## 3. The one core job

"I drop in a raw clip. Ethereel sends back a finished reel that looks like my editor made it. I
watch it, press Pass, and it posts at my next slot. If something is off, I say what in plain words and
it fixes only that."

## 4. Principles (non-negotiable)

1. **Human in the loop.** Nothing posts without the creator pressing Pass. No auto-approve setting.
2. **edit.json is the single source of truth.** Every render is cooked from one versioned edit.json
   (\`edits.edit_json\`, with every version kept in \`edit_revisions\`). The renderer never makes a
   decision that is not in edit.json, so any version can be rendered again and look the same.
3. **Claude decides content, code decides layout.** Claude picks what a cutaway says and when. Code
   decides where things go on screen, snaps times to words, enforces every spacing rule and clips text.
   Claude never outputs pixel positions.
4. **Deterministic.** Same raw clip + same edit.json = same reel. Randomness (punch-in choice) is seeded
   from the video name.
5. **Async everything.** Upload, pipeline, render and posting all run as jobs with a status, retries
   with backoff, idempotency keys and a live progress view. No request waits more than 10 seconds.
6. **Every paid call is metered and capped.** Claude, transcription, render minutes and posts all write
   a \`usage_ledger\` line; plan limits are checked server-side before work starts.

## 5. User stories

1. As a creator, I sign up, set my series title, handles, hashtag line and posting times in under five
   minutes, so my first reel already looks like mine.
2. As a creator, I upload up to 5 clips at once from my phone or laptop, and if the Wi-Fi drops the
   upload carries on where it stopped.
3. As a creator, I tick "Motion graphics" and drop in screenshots named like
   \`monday-hero-project-management-for-teams.png\`, so a cutaway shows that screenshot when I say
   "Monday".
4. As a creator, I watch progress live ("Transcribing", "Cutting", "Planning cutaways", "Rendering 62%").
5. As a creator, I review the reel inside a TikTok or Instagram overlay so I can see if a caption hides
   under the like button.
6. As a creator, I edit the post caption and press Save, or press Rewrite to get a fresh one.
7. As a creator, I press Pass and the reel gets the next free slot in my timezone.
8. As a creator, I press Request revision, type "the word at 0:12 should be Supabase and drop the
   second diagram", and get a new version with a "what changed" list. If I do not like it, I press Undo.
9. As a creator, I press Reject and the reel never posts.
10. As a creator, I see my queue as a week of slots with covers, and I can move or remove a post.
11. As a creator, I see the live TikTok and Instagram links once a post goes out.
12. As a creator, I see "18 of 30 videos used this month" before I upload, not after.

## 6. Architecture

\`\`\`
 Browser (Next.js on Vercel)
   │  1. create-upload (edge fn) → signed TUS token, videos row
   │  2. TUS upload ───────────────────────────────► Supabase Storage  raw-videos/<uid>/<vid>/raw.mov
   │  3. start-pipeline (edge fn) → checks plan, meters, triggers task
   │                                   │
   │                                   ▼
   │                      Trigger.dev v4 (queue per creator, Gentle 1 / Fast 2)
   │                      ┌──────────────────────────────────────────────────────┐
   │                      │ process-video (orchestrator, small-1x)               │
   │                      │  ├ prepare      ffmpeg normalise, SDR, 16 kHz  (medium-2x)
   │                      │  ├ transcribe   Groq whisper-large-v3-turbo words
   │                      │  ├ cut          silence map, threshold, cut list
   │                      │  ├ faces        MediaPipe Face Landmarker (python)  (medium-1x)
   │                      │  ├ plan         Claude: cutaways + subtitle; rules engine
   │                      │  ├ render       Remotion Lambda (AWS) 1080x1920 30 fps
   │                      │  ├ mix          voice rebuild, -14 LUFS, music, SFX (medium-2x)
   │                      │  ├ export       H.264 High L4.1 ≤6 Mbps, faststart
   │                      │  ├ validate     ffprobe checklist
   │                      │  └ caption      Claude post caption + AI-tell check
   │                      └──────────────┬───────────────────────────────────────┘
   │                                     │ every step: trigger-callback (HMAC signed)
   │                                     ▼
   │                      Supabase Postgres  videos.status, job_events, renders,
   │  ◄── Realtime ───────  edits, post_captions, usage_ledger
   │
   │  4. Review: pass-video / request-revision / rewrite-caption (edge fns)
   │                                     │
   │                                     ▼
   │                      scheduled_posts  (slot assigned under a lock)
   │                                     │  pg_cron every 10 min → zernio-sync (edge fn)
   │                                     ▼
   │                      Zernio API  presign → upload final.mp4 → POST /v1/posts (scheduledFor)
   │                                     │
   │                                     ▼
   │                      TikTok + Instagram  (live links written back by zernio-sync)
\`\`\`

### 6.1 Why this shape (trade-offs)

- **Trigger.dev, not edge functions, for the pipeline.** Supabase edge functions stop after a few
  minutes of wall clock and cannot run ffmpeg. Trigger.dev tasks run in containers with ffmpeg baked in
  (build extension), retry per step, and have per-key concurrency for "Gentle 1 / Fast 2".
- **Remotion Lambda, not rendering inside Trigger.dev.** Remotion splits a render across many Lambda
  functions, so a 60 second 1080x1920 reel renders in about a minute instead of five, and we pay per
  second only while rendering. The trade-off is a second cloud account (AWS). Rendering inside a
  Trigger.dev large-2x machine is the fallback (section 9.12).
- **Groq Whisper, not Deepgram.** $0.04 per audio hour against about $0.26 for Deepgram nova-3 batch
  ($0.0043/min, checked Oct 2026 [verify]). Groq returns word timestamps via \`verbose_json\` with
  \`timestamp_granularities[]=word\`. Word edges from Whisper are fuzzy, but we snap every word to the
  audio envelope anyway (9.4), so the extra precision from Deepgram is not needed. Deepgram stays the
  documented fallback: nova-3 has keyterm prompting, which helps if a creator's vocabulary is unusual.
- **MediaPipe Face Landmarker in a Python step, not Google Cloud Vision.** Free, runs on our own
  machine, gives 478 landmarks including both eye centres at video frame rate. Cloud Vision charges
  $1.50 per 1,000 images per feature (checked Oct 2026) and needs one call per sampled frame plus a
  Google Cloud project. At 2 frames per second on a 60 s clip that is 120 images, so about $0.18 per
  video. MediaPipe costs a few seconds of CPU.
- **Zernio for posting, Ayrshare as fallback.** Zernio bills per connected account (first 2 free, then
  $6, $3, $1 per account as you grow, checked Oct 2026), so a creator with TikTok + Instagram costs
  $2 to $6 a month. Ayrshare Business starts at $599 a month [verify]. Zernio keeps uploaded media for 7
  days, which drives the 6-day handover rule (13.3).
- **Per-user tenancy, not workspaces.** A creator is one person and one brand. Every table carries
  \`user_id\` and RLS checks \`auth.uid() = user_id\`. If agencies ask for teams later, add \`workspaces\`
  and move the check to \`is_workspace_member()\` (out of scope, 23).

### 6.2 What breaks first at scale, and the fix

| Breaks at | What happens | Fix |
|---|---|---|
| ~50 active creators uploading at 9am | Trigger.dev environment concurrency fills; videos wait in \`queued\` | Raise the Trigger.dev plan concurrency; the UI already says "Waiting for a free slot, about N min". |
| ~200 creators | Remotion Lambda account concurrency (AWS default 1,000 concurrent Lambdas per region) | Ask AWS for a quota increase in Service Quotas, or set \`framesPerLambda\` higher so each render uses fewer Lambdas. |
| ~300 creators | Supabase egress: every raw clip is downloaded once by Trigger.dev and the proxy once by Lambda | Delete raw clips 14 days after Pass (cron), store the 720p proxy in S3 next to the Remotion bucket. |
| ~500 creators | Claude rate limits at peak (many plans at once) | Per-tenant queue already spreads load; add the Anthropic tier upgrade and prompt caching (system prompt is cached). |
| Any size | A creator's TikTok token expires | zernio-sync marks \`social_accounts.status = 'needs_reconnect'\`, emails them, and the Queue page shows a banner. |

## 7. Routes and pages

| Route | Who | What it does |
|---|---|---|
| \`/\` | public | Landing page (\`@LANDING.md\`) |
| \`/login\`, \`/signup\`, \`/reset\` | public | Supabase email + password auth, "Confirm email" off |
| \`/onboarding\` | signed in | 4 steps: Brand, Look, Socials, First upload. Skippable after step 1 |
| \`/app\` | paid or trialing | Redirects to \`/app/videos\` |
| \`/app/videos\` | paid | Library: every video with status, cover, length, created, actions. Upload button top right |
| \`/app/videos/new\` | paid | Upload sheet: drop up to 5 clips (10 on Pro), "Motion graphics" toggle, plan meter |
| \`/app/videos/[id]\` | paid | Processing view while running (step list + live log), then redirects to review |
| \`/app/videos/[id]/assets\` | paid | "Add assets?" page: drop screenshots or Skip (only if Motion graphics was on) |
| \`/app/review\` | paid | Review inbox: every video in \`ready_for_review\`, oldest first |
| \`/app/review/[id]\` | paid | Review: phone preview with platform overlay, caption editor, Pass / Reject / Request revision, version history, Undo |
| \`/app/queue\` | paid | Week view of slots with covers; list view; move, unschedule; live links |
| \`/app/assets\` | paid | Brand assets: avatar, music library + own tracks, screenshot library per video |
| \`/app/docs\` | paid | Documentation: how the pipeline works, naming screenshots, writing good revision notes |
| \`/app/help\` | paid | Help: FAQ, contact form (Resend to the owner), status of the last 5 jobs |
| \`/app/billing\` | paid | Plan, usage meter, invoices, Stripe Customer Portal button |
| \`/app/settings\` | paid | Tabs: Brand, Look, Captions, Posting, Socials, Processing, Account |
| \`/api/stripe/webhook\` | Stripe | Subscription webhook (shared phase) |
| \`/api/zernio/callback\` | Zernio | OAuth return page after connecting a social account; calls connect-social to finish |

**Sidebar (one level, top to bottom):** logo, **Videos**, **Review** (count badge), **Queue**,
**Assets**, then a spacer, then **Documentation**, **Help**, **Billing**, **Settings**. Under the
bottom group, the plan meter ("18 of 30 videos this month") and the account menu. Nothing else.

**Access rule:** every \`/app/*\` route calls \`has_active_access(auth.uid())\` in the server layout. If false,
redirect to \`/app/billing?reason=trial_over\`. \`/app/billing\` and \`/app/settings\` stay reachable without
access so people can pay or export.

## 8. Data model (summary)

The full SQL is in the migration. One line per table:

- \`profiles\`: one per user (made by trigger). \`onboarding_step\`, \`zernio_profile_id\`.
- \`creator_settings\`: the brand kit. Series title, follow card, handles, misheard handles, vocabulary,
  spelling fixes, filter preset, music level (default **-39 LUFS (exact)**), caption guidance, hashtag
  line, posting slots (default **09:00, 11:00, 14:00, 17:00, 19:00 (exact)**), timezone, queue mode,
  TikTok privacy/comment/duet/stitch, processing mode.
- \`filter_presets\`: five numbers (warmth, sharpness, brightness, contrast, saturation). Built-ins have
  \`user_id null\`.
- \`music_tracks\`: library (\`user_id null\`) and own tracks, with measured \`loudness_lufs\`.
- \`upload_batches\`: one upload of several clips, plus the Motion graphics decision.
- \`videos\`: the heart. \`status\` (enum, section 11.1), raw path, durations, seed, current edit version,
  current render, Trigger.dev run id, error code/message, review decision.
- \`video_assets\`: screenshots for Image cutaways, with \`match_tokens\` from the filename.
- \`transcripts\`: words jsonb \`[{i,w,s,e,raw}]\` (ms), silences, voice average dB, threshold dB.
- \`edits\` + \`edit_revisions\`: current edit.json and every version (reason: initial, revision, undo, caption_fix).
- \`revision_requests\`: the plain-language note, Claude's ops, impossible reason, what changed.
- \`cutaway_plans\`: Claude's raw plan, the validated plan, and what was dropped and why.
- \`renders\`: one per edit version. Remotion render id and cost, final and cover paths, validation result.
- \`post_captions\`: versioned, one current. Source claude, rewrite or user.
- \`social_accounts\`: Zernio account id per platform, status, TikTok creator info.
- \`scheduled_posts\`: slot, status, Zernio post id, which render Zernio holds, live links.
- \`job_events\`: the live log for the processing view (Realtime).
- \`usage_ledger\`: every billable thing, with an idempotency key.
- \`subscriptions\`, \`stripe_events\`, \`inbound_events\`, \`email_log\`, \`rate_limit_hits\`.

Storage buckets (all private, files under \`<user_id>/...\`): \`raw-videos\`, \`assets\`, \`renders\`, \`music\`.

## 9. The pipeline, step by step

The orchestrator task \`process-video\` runs these steps in order. Each step is its own Trigger.dev task
(\`triggerAndWait\`) so it retries on its own and can use a different machine size. Before and after each
step it calls \`trigger-callback\` with \`{ videoId, step, status, progress, message, meta }\`, which sets
\`videos.status\` and inserts a \`job_events\` row.

Every step reads inputs from Storage and writes outputs to \`renders/<uid>/<vid>/work/\` so a retry can
start from the last finished step. The orchestrator checks for an existing output (by path and
\`edit_version\`) and skips a step that already finished: this is the step-level idempotency key.

### 9.1 Upload (browser, TUS)

1. The browser calls \`create-upload\` with \`{ files: [{ name, size, type, durationMs }], motionGraphics }\`.
   \`durationMs\` comes from loading the file into a hidden \`<video>\` element first.
2. \`create-upload\` runs \`can_start_video\`, creates an \`upload_batches\` row and one \`videos\` row per
   file (status \`uploading\`, \`seed\` = slug of the filename without extension), and returns for each file
   \`{ videoId, bucket: 'raw-videos', objectName: '<uid>/<videoId>/raw.<ext>', token }\` where \`token\`
   comes from \`storage.from('raw-videos').createSignedUploadUrl(objectName)\`.
3. The browser uploads with \`tus-js-client\` to
   \`https://<project-ref>.storage.supabase.co/storage/v1/upload/resumable\` (the direct storage host,
   which Supabase recommends for big files), chunk size **6 MB** (Supabase requires exactly 6 MB chunks),
   headers \`x-signature: <token>\` and \`x-upsert: false\`, metadata \`bucketName\`, \`objectName\`,
   \`contentType\`, \`cacheControl: 3600\`. Retry delays \`[0, 3000, 5000, 10000, 20000]\`. The \`x-signature\`
   header follows Supabase's signed resumable upload example ([verify] against the current Storage docs).
   If it is rejected, send \`authorization: Bearer <user access token>\` plus \`apikey: <publishable key>\`
   instead: the storage RLS policies in the migration already allow the owner to write to their own folder.
4. \`tus-js-client\` stores the upload URL in localStorage keyed by file fingerprint, so a reload resumes.
5. On success the browser calls \`start-pipeline\` with \`{ videoId }\`.
6. Free Supabase projects cap a single upload at 50 MB. On Pro, set Storage > Settings > Upload file
   size limit to 2 GB. The \`raw-videos\` bucket has a 2 GB limit of its own.

### 9.2 Prepare (ffmpeg, medium-2x)

Goal: one clean, predictable file whatever the iPhone sent (HEVC, HDR Dolby Vision, variable frame rate,
rotation metadata).

1. \`ffprobe -v error -show_streams -show_format -of json raw.mov\` → duration, width, height, rotation,
   \`color_transfer\` (HDR if \`smpte2084\` or \`arib-std-b67\`), frame rate.
2. Fail with \`error_code = 'too_long'\` if duration > plan \`max_clip_seconds\`, \`no_audio\` if there is no
   audio stream, \`too_short\` under 3 s.
3. Normalise to \`source.mp4\`: constant **30 fps** (\`-vsync cfr -r 30\`), rotation applied, scaled and
   centre-cropped to 1080x1920, SDR. For HDR input use
   \`zscale=t=linear:npl=100,format=gbrpf32le,zscale=p=bt709,tonemap=hable:desat=0,zscale=t=bt709:m=bt709:r=tv,format=yuv420p\`.
   Encode \`libx264 -preset veryfast -crf 16 -pix_fmt yuv420p\` with BT.709 tags, audio AAC 48 kHz kept.
4. Make \`proxy.mp4\` (720x1280, crf 23) for the browser preview and for Remotion (faster to fetch).
5. Extract \`voice.wav\`: mono, **16 kHz (exact)**, 16-bit PCM: \`-ac 1 -ar 16000 -c:a pcm_s16le\`. Also
   \`voice48.wav\` (48 kHz mono) for the final mix.
6. Write \`videos.duration_ms\`, \`width\`, \`height\`, \`was_hdr\`.

### 9.3 Transcribe (Groq)

1. Encode \`voice.wav\` to FLAC (smaller upload) and POST to
   \`https://api.groq.com/openai/v1/audio/transcriptions\` with \`model=whisper-large-v3-turbo\`,
   \`response_format=verbose_json\`, \`timestamp_granularities[]=word\`, \`timestamp_granularities[]=segment\`,
   \`language=en\`, \`temperature=0\`.
2. **Vocabulary priming (exact behaviour):** \`prompt\` = a short natural sentence built from the creator's
   vocabulary and handles, for example "Rosewell Reels, Supabase, Claude Code, @rosewell.dev." Whisper
   reads at most 224 prompt tokens, so take vocabulary in order until about 200 tokens.
3. Convert to our word list: \`{ i, w, s, e, raw }\` in milliseconds, \`raw\` is what Whisper said.
4. **Spelling fixes (exact behaviour):** apply \`creator_settings.spelling_fixes\` (\`from\` → \`to\`, case
   insensitive, whole words, can span two words like "super base" → "Supabase") and
   \`misheard_handles\` (\`heard\` → \`fix\`). Record every change in \`transcripts.fixes_applied\`.
5. Meter: \`usage_ledger\` kind \`transcription\`, \`seconds\` = audio length, \`cost_usd\` = seconds / 3600 * 0.04
   (Groq bills a 10 s minimum per request).
6. Fallback: if Groq returns 5xx three times or 413, call Deepgram
   \`POST https://api.deepgram.com/v1/listen?model=nova-3&smart_format=true&punctuate=true&keyterm=<term>\`
   (one \`keyterm\` per vocabulary word) and map \`results.channels[0].alternatives[0].words\` the same way.

### 9.4 Silence map, threshold and cut list (pure TypeScript, unit tested)

This is the part that makes it feel hand-edited. All numbers are **exact**.

1. **Loudness envelope.** From \`voice.wav\`, compute RMS in 10 ms windows → dBFS per window.
2. **Voice average.** Mean dBFS of windows that fall inside a word (from the transcript).
3. **Adaptive threshold = voice average loudness minus 12 dB.** Store \`voice_avg_db\`, \`threshold_db\`.
4. **Silence map.** A window is quiet if below threshold. A run of loud windows **shorter than 60 ms
   does not break a pause** (clicks, lip smacks, a tapped desk). Merge accordingly.
5. **Snap words to sound.** Each word start moves to where sound begins (first loud window at or after
   \`s - 80 ms\`); each word end moves to where sound stops (last loud window at or before \`e + 80 ms\`).
   Never move a start past the end.
6. **Pauses to remove.** Only pauses **longer than 400 ms** between two words are cut.
7. **Padding.** For each removed pause keep **120 ms after the last word** and **100 ms before the next
   word**.
8. **Ends.** Keep a **200 ms lead-in before the first word** and **400 ms after the last word**.
9. Output \`segments: [{ id, srcStart, srcEnd }]\` (ms in the source) and \`edited_duration_ms\`. Also a
   \`wordMap\` from each word index to its time in the edited timeline (\`t = srcTime - removedBefore\`).
10. Unit tests (vitest): a 300 ms pause is kept; a 450 ms pause becomes 220 ms; a 40 ms click inside a
    pause does not split it; first word at 1.5 s gives a cut starting at 1.3 s; last word end + 400 ms.

### 9.5 Face and eye detection (MediaPipe, Python step, medium-1x)

1. \`python/faces.py proxy.mp4 out.json\`: MediaPipe Tasks \`FaceLandmarker\` in \`VIDEO\` running mode,
   model \`face_landmarker.task\` (float16, bundled in \`python/models/\`, downloaded once from the
   MediaPipe models page), \`num_faces=1\`. Sample **every 5th frame** (6 per second) with
   \`detect_for_video(image, timestamp_ms)\`.
2. For each sample: eye centre = mean of landmarks 468 and 473 (iris centres), normalised 0 to 1, plus
   face box from landmark min/max.
3. Smooth with a 0.5 s moving median and store per segment the median eye point
   (\`segments[].eye = { x, y }\`) and a confidence. If no face in a segment, use the previous segment's
   point, else frame centre (0.5, 0.42).
4. Runs with the Trigger.dev \`pythonExtension\` (\`requirementsFile: ./python/requirements.txt\` with
   \`mediapipe\` and \`opencv-python-headless\`).
5. Fallback (documented, not built): Google Cloud Vision \`FACE_DETECTION\` on 2 frames per second.

### 9.6 Zooms (code, seeded)

All rules **exact**:
- **About one cut in three** gets an instant **1.12x punch-in centred on the eyes**.
- Never the opening shot. Never two punch-ins in a row. Never on short segments (under 1.2 s).
- Choice is pseudo-random **seeded from the video name** (\`seed\`), using a small PRNG (mulberry32 of
  a 32-bit FNV-1a hash of \`seed\`), so a re-render picks the same segments.
- **Opening shot: slow push-in from 1.00 to 1.06** across the first segment, ease in-out.
- Punch-in transform: \`scale(1.12)\` with transform origin at the eye point, clamped so the frame edge
  never shows (origin x within [0.06, 0.94], y within [0.06, 0.94]).

### 9.7 Colour preset (same maths in browser and ffmpeg)

A preset has five sliders. The browser preview uses CSS filters on the \`<video>\`; ffmpeg uses filters
that match. Captions and the title are drawn after grading and are **never graded (exact)**.

| Slider | Range | Browser (CSS) | ffmpeg |
|---|---|---|---|
| warmth \`w\` | -1 to 1 | an SVG \`feColorMatrix\` with R gain \`1 + 0.10w\`, B gain \`1 - 0.10w\` | \`colorchannelmixer=rr=1+0.10w:bb=1-0.10w\` |
| sharpness \`k\` | 0 to 1.5 | an SVG \`feConvolveMatrix\` unsharp kernel with amount \`k\` | \`unsharp=5:5:k:5:5:0\` |
| brightness \`b\` | -0.2 to 0.2 | \`brightness(1 + b)\` | \`eq=brightness=b\` (see note) |
| contrast \`c\` | 0.5 to 1.5 | \`contrast(c)\` | \`eq=contrast=c\` |
| saturation \`s\` | 0 to 2 | \`saturate(s)\` | \`eq=saturation=s\` |

Note: CSS brightness multiplies while ffmpeg \`eq\` adds, so for an exact match apply brightness in
ffmpeg as \`lutrgb=r=val*(1+b):g=val*(1+b):b=val*(1+b)\` instead of \`eq=brightness\`. Order: warmth,
brightness, contrast, saturation, sharpness in both. Put this in \`lib/grade.ts\` with one function that
returns both the CSS filter chain and the ffmpeg filter string, plus a snapshot test that renders one
frame both ways and checks the mean pixel difference is under 2 (out of 255). The grade is applied in
the Remotion composition to the video layer only (CSS filters work in Remotion since it renders
Chromium).

### 9.8 Captions (on-video subtitles)

All rules **exact**:
- **Inter SemiBold (600), 56 px, tight tracking (-0.01em)**, white with a **thin black outline** (2 px
  \`paint-order: stroke\`) and a **soft shadow** (\`0 2px 8px rgba(0,0,0,.35)\`).
- Baseline block centred at **74% of frame height** (y = 1421 px of 1920).
- **Pages of 2 to 4 words, max 1.2 s per page.** Break at sentence ends (. ? !) and clauses (, ; :) first.
- **A single leftover word is folded into the next page** (never a 1-word page unless the video is one word).
- A page **appears on the frame its first word starts. No animation.** It stays until the next page or
  until 300 ms after its last word, whichever comes first.
- **Over a cutaway, captions turn dark ink (\`#1c1b19\`) with no outline and no shadow, on the exact frame
  the cutaway starts**, and back on the frame it ends.
- **Per-word \`captionOverrides\`:** \`{ [wordIndex]: "Supabase" }\` replaces the shown text for one word
  without touching the transcript. Revisions write here.
- Max line width 900 px; if a page overflows at 56 px, break it into two lines, never shrink the font.

### 9.9 Opening title

- If \`opening_title_enabled\`: the **series title near the top** (y = 300 px), Inter SemiBold 72 px white.
- An **orange hand-drawn marker scribble draws on in two strokes** under the title (SVG path, stroke
  \`#ff7a1a\`, width 14, \`stroke-dasharray\` animation): stroke 1 over 0 to 0.35 s, stroke 2 over 0.45 to
  0.8 s, with a **pen-scratch SFX** (\`sfx/pen-scratch.wav\`) starting at each stroke.
- Below it a **2 to 3 word lowercase subtitle from Claude** (low effort, section 17.2), 44 px.
- **Stop-motion jitter and grain**: the whole title group shifts by up to 2 px and rotates up to 0.4
  degrees on a 12 fps step (changes every 2.5 frames, seeded), plus a film grain overlay at 8% opacity.
- **Leaves on the first cut after about 3.5 s, or at 5 s**, whichever comes first (hard cut out).

### 9.10 Follow card

- If \`follow_card_enabled\`: find the cue line in the transcript (default **"still watching, follow me"**,
  fuzzy match: all cue words in order within 2.5 s, case and punctuation ignored).
- At the cue's first word the card slides up (240 ms ease-out) above the caption zone: **avatar**
  (circle, 96 px, from \`avatar_path\`), **handle** for the platform, and a **Follow button**.
- On the cue's last word the button **fills to "Following ✓" with a small burst** (8 dots radiating,
  300 ms) and a soft click SFX. Card leaves 1.2 s after the cue ends.
- If the cue is not found, no card (and no error). Cutaways may not overlap the card (9.11 rules).
- One render serves both platforms, so the card shows one handle: the TikTok handle, or the Instagram
  handle if TikTok is empty. Most creators use the same handle on both. (Per-platform renders would
  double render cost; out of scope for v1.)

### 9.11 Cutaways

A cutaway is a full-screen hand-drawn diagram on a maths exercise-book page while the voice continues.

**Claude plans them** (section 17.1, medium effort, structured output). Per cutaway Claude returns:
\`start\` and \`end\` (as word indexes), \`kind\`, \`title\` (≤ 4 words), \`items\` (≤ 3 words each), \`beats\`
(which word index reveals which item), and \`punch\` (\`circle | strike | underline | arrow\` + a 1 to 3 word
note).

**Kinds (exact):**
- **Flow**: 2 to 4 boxes joined by arrows.
- **Versus**: two columns, a "vs" in the middle.
- **Number**: one big number with a label.
- **List**: 2 to 4 dashed lines with short items.
- **Graph**: a hand-drawn axis with one line going up or down and 2 to 3 labelled points.
- **Image**: a creator screenshot as a **tilted print with a white mat** (rotation -4 to 4 degrees,
  seeded), matched to when its filename words are spoken.

**Rules applied by code after Claude (exact):**
1. Snap start and end to word boundaries (start of first word, end of last word, edited timeline).
2. **About one every 16 s, max 4.** Cap = \`min(4, floor(editedDuration / 16 s))\`, minimum 1 if the video
   is over 12 s.
3. **Each 3 to 6.5 s long.** Extend or trim by whole words to fit.
4. **Never in the first 3 s.**
5. **At least 6 s apart** (end of one to start of the next).
6. **No overlap with the follow card** window.
7. **Text clipped**: title to 4 words, items to 3 words, notes to 3 words, and every string to the box
   width at its font size (measured with the font metrics, ellipsis never used: drop the last word).
8. **Each asset used once.**
9. Anything dropped goes into \`cutaway_plans.dropped\` with a reason.

**Asset matching:** filename → tokens (\`monday-hero-project-management-for-teams.png\` → \`monday\`,
\`hero\`, \`project\`, \`management\`, \`teams\`; stop words removed). For each asset, find the transcript window
with the most token hits (stemmed, within 4 s); an Image cutaway starts at the first hit word. Claude
gets the asset list with its tokens and the matched time, and may place an Image cutaway only there.

**Layout rules engine (code, \`lib/layout.ts\`):** each kind has a template of slots on a 1080x1920 page
(title band at y 220 to 380, content area y 420 to 1280, nothing below y 1300 because the caption zone
starts at about 1360). The engine places boxes, measures text, shrinks font in steps (64, 56, 48 px)
before moving to two lines, checks every box against every other box for overlap (no collisions), keeps
a 72 px margin from every frame edge, and keeps the punch mark within the box it targets. Output is
absolute boxes in edit.json (\`layout\`), so the renderer only draws. If a layout cannot fit, the cutaway
is dropped with reason \`layout_overflow\`.

**Look (exact):** warm off-white paper (\`#f6f1e7\`), faint blue grid (\`#9db7d9\` at 35% opacity, 54 px
squares, with a red margin line), film grain, **boiling black felt-tip ink** (each stroke redrawn on a
12 fps step with a tiny seeded wobble, using an SVG \`feTurbulence\` + \`feDisplacementMap\`), **one
burnt-red accent** (\`#b5452b\`) for the punch mark only. Items draw on in order at their beat words
(stroke reveal 250 ms). **Hard cut in with a click SFX and a brief exposure flash** (white overlay from
60% to 0 over 4 frames). Hard cut out.

### 9.12 Render (Remotion Lambda)

- The Remotion project lives in \`remotion/\` in the same repo: composition \`Reel\`, 1080x1920, **30 fps**,
  \`durationInFrames = ceil(editedDurationMs / 1000 * 30)\`, input props = the whole edit.json plus signed
  URLs for \`proxy.mp4\` (or \`source.mp4\` for final quality), avatar, assets and fonts.
- Video layer: \`<OffthreadVideo>\` per segment inside \`<Sequence>\`s, \`startFrom\` = segment srcStart,
  graded with CSS filters, zoom transform per segment.
- The render is **video only** (\`muted: true\`); audio is rebuilt in 9.13 so we control loudness.
- Call \`renderMediaOnLambda({ region, functionName, serveUrl, composition: 'Reel', inputProps, codec:
  'h264', imageFormat: 'jpeg', jpegQuality: 90, crf: 16, framesPerLambda: 120, outName })\` from the
  render task, then poll \`getRenderProgress\` every 4 s (max 10 min) and write progress to job_events.
  Store \`renderId\` and \`costs.accruedSoFar\` in \`renders.remotion_cost_usd\`.
- Function: \`npx remotion lambda functions deploy --memory=3009 --timeout=240 --disk=4096\`, site:
  \`npx remotion lambda sites create remotion/index.ts --site-name=ethereel\`.
- Fallback when AWS is not set up yet: \`renderMedia()\` inside a Trigger.dev \`large-2x\` task with the
  same composition (slower, about 3 to 5 minutes for 60 s).

### 9.13 Audio rebuild (ffmpeg, medium-2x)

1. Cut \`voice48.wav\` with the same segment list. **10 ms fades** in and out at every cut (\`afade\`) so cuts
   never click.
2. Loudness: two-pass \`loudnorm\` to **-14 LUFS integrated (exact)**, true peak -1 dBTP, LRA 11.
3. Music: the chosen track, looped or trimmed to length, normalised so it sits **about 25 dB under the
   voice** (target = \`music_level_lufs\`, default **-39 LUFS (exact)**), 1.5 s fade out at the end,
   ducked another 4 dB while a cutaway plays (\`sidechaincompress\` is not needed; the plan has times).
4. SFX from edit.json: pen scratch (title strokes), click + flash (cutaway in), follow click and burst.
   Each SFX placed at its frame time, mixed at -18 LUFS.
5. Output \`mix.wav\` 48 kHz stereo.

### 9.14 Export and validation

1. Mux: \`ffmpeg -i video.mp4 -i mix.wav -map 0:v -map 1:a -c:v libx264 -profile:v high -level:v 4.1
   -pix_fmt yuv420p -b:v 5500k -maxrate 6000k -bufsize 12000k -r 30 -g 60
   -color_primaries bt709 -color_trc bt709 -colorspace bt709 -c:a aac -b:a 192k -ar 48000 -ac 2
   -map_metadata -1 -map_chapters -1 -use_editlist 0 -movflags +faststart final.mp4\`.
2. **Validation (all must pass before Review):** H.264 High, level 4.1, 1080x1920, 30 fps constant, bitrate
   ≤ 6 Mbps (from ffprobe \`bit_rate\`), BT.709 primaries/transfer/matrix tags present, 48 kHz stereo AAC,
   no metadata tags beyond encoder, no chapters, no edit list (\`elst\` atom count 0), \`moov\` before \`mdat\`
   (faststart), duration within 50 ms of the edit.json duration, integrated loudness between -15 and -13
   LUFS. Result stored in \`renders.validation\` as \`{ checks: [{ name, ok, value }] }\`.
3. Cover: \`ffmpeg -ss 3 -i final.mp4 -frames:v 1 -q:v 2 cover.jpg\` (**frame at 3 s (exact)**).
4. On any failed check: one automatic re-encode; if it still fails, status \`failed\` with
   \`error_code = 'export_invalid'\` and the failed checks in \`error_message\`.
`
