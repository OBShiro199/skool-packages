// Ethereel build PRD, sections 13 onwards.

export const buildPrdPart2 = `
## 13. Shotstack timeline mapping

The edit plan from Claude says WHAT to keep. Our own code (\`_shared/edit-plan.ts\` and \`_shared/shotstack.ts\`) turns that into exact times and a Shotstack timeline. Claude never writes timestamps or Shotstack JSON directly, which keeps renders predictable.

### 13.1 Cutting silences and fillers (cutSegments)

Input: the transcript words from \`start_word_index\` to \`end_word_index\`.
1. Drop words where \`filler = true\`.
2. Walk the remaining words in order. Start a segment at \`word.s - 0.08\`. Keep adding words while the gap \`next.s - prev.e\` is 0.5 s or less.
3. When a gap is over 0.5 s, close the segment at \`prev.e + 0.12\` and start a new one at the next word.
4. Merge any segment shorter than 0.4 s into its neighbour.
5. Each segment has \`in\` (source seconds), \`out\` (source seconds), \`at\` (where it starts on the clip timeline, the running total of previous lengths).

\`remapTime(t)\` converts a source time to clip time: find the segment with \`in <= t < out\`, return \`at + (t - in)\`. Words inside removed gaps are never shown.

### 13.2 Face-tracked 9:16 reframe (faceOffsets)

- If the source is already vertical (height > width), use \`fit: "cover"\` and no offset.
- For a landscape source cropped to 9:16 with \`fit: "crop"\`, the scaled source is \`1920 * (width / height)\` pixels wide against a 1080 pixel viewport.
- For each segment, take the median face \`x\` of face_track samples inside \`[in, out]\`. No samples: use the last known x, else 0.5.
- \`offset.x = clamp((0.5 - faceX) * scaledWidth / 1080, -maxShift, maxShift)\` where \`maxShift = (scaledWidth - 1080) / 2 / 1080\`. For a 16:9 source that is about \`(0.5 - faceX) * 3.16\`, clamped to plus or minus 1.08.
- If the face moves more than 0.08 (in x) within a segment, split the segment every 4 seconds and compute an offset for each piece.
- Verify the sign and scale of \`offset.x\` against the Shotstack docs with one stage render of a test video where you stand on the left of frame. Your face must end up centred.

### 13.3 Layers (tracks, top to bottom)

Shotstack draws \`tracks[0]\` on top.
1. Hook title card (first 2.2 s)
2. Emoji pop-ins
3. Captions
4. Progress bar
5. B-roll pop-ins (optional)
6. Main video (the cut segments)

### 13.4 Example timeline (one 42 second clip, Punch style)

\`\`\`json
{
  "timeline": {
    "background": "#000000",
    "fonts": [
      { "src": "https://ethereel.com/fonts/Montserrat-ExtraBold.ttf" }
    ],
    "tracks": [
      {
        "clips": [
          {
            "asset": {
              "type": "html",
              "html": "<div class='card'>Stop pricing by the hour</div>",
              "css": ".card { font-family: 'Montserrat'; font-weight: 800; font-size: 64px; color: #111111; background: #FFFFFF; padding: 28px 36px; border-radius: 28px; text-align: center; }",
              "width": 900,
              "height": 320
            },
            "start": 0,
            "length": 2.2,
            "position": "top",
            "offset": { "y": -0.12 },
            "transition": { "in": "slideDown", "out": "fade" }
          }
        ]
      },
      {
        "clips": [
          {
            "asset": { "type": "image", "src": "https://ethereel.com/emoji/1f4b0.png" },
            "start": 8.1,
            "length": 1.2,
            "scale": 0.22,
            "position": "center",
            "offset": { "x": 0.28, "y": 0.05 },
            "transition": { "in": "zoom", "out": "fade" }
          }
        ]
      },
      {
        "clips": [
          {
            "asset": {
              "type": "html",
              "html": "<p>THE <span class='hi'>BIGGEST</span></p>",
              "css": "p { font-family: 'Montserrat'; font-weight: 800; font-size: 78px; color: #FFFFFF; text-align: center; text-shadow: 0 0 6px #000, 0 4px 0 #000; } .hi { color: #FACC15; }",
              "width": 980,
              "height": 260
            },
            "start": 2.24,
            "length": 0.46,
            "position": "center",
            "offset": { "y": -0.2 }
          }
        ]
      },
      {
        "clips": [
          {
            "asset": {
              "type": "html",
              "html": "<div class='bar'></div>",
              "css": ".bar { width: 2.4%; height: 12px; background: #8B5CF6; }",
              "width": 1080,
              "height": 12
            },
            "start": 0,
            "length": 1,
            "position": "bottom"
          }
        ]
      },
      {
        "clips": [
          {
            "asset": { "type": "video", "src": "https://videos.pexels.com/video-files/.../city.mp4", "volume": 0 },
            "start": 20.3,
            "length": 2,
            "fit": "cover",
            "transition": { "in": "fade", "out": "fade" }
          }
        ]
      },
      {
        "clips": [
          {
            "asset": { "type": "video", "src": "<signed raw-videos URL>", "trim": 61.2, "volume": 1 },
            "start": 0,
            "length": 12.4,
            "fit": "crop",
            "offset": { "x": 0.06, "y": 0 }
          },
          {
            "asset": { "type": "video", "src": "<signed raw-videos URL>", "trim": 74.9, "volume": 1 },
            "start": 12.4,
            "length": 9.8,
            "fit": "crop",
            "offset": { "x": 0.04, "y": 0 }
          }
        ]
      }
    ]
  },
  "output": {
    "format": "mp4",
    "size": { "width": 1080, "height": 1920 },
    "fps": 30,
    "poster": { "capture": 1 }
  },
  "callback": "https://<ref>.supabase.co/functions/v1/shotstack-callback?clip_id=...&v=1&token=..."
}
\`\`\`

Notes for the builder:
- Each caption group is its own html clip. Each progress bar step is its own html clip (one per second, width = elapsed / total).
- Emoji PNGs (512 px, from Google Noto Emoji, Apache 2.0) are copied into \`public/emoji/<codepoint>.png\` for the allow-list and served from the site URL so Shotstack can fetch them.
- Fonts are TTF files in \`public/fonts/\` and listed in \`timeline.fonts\`.
- B-roll: search Pexels \`GET https://api.pexels.com/videos/search?query=<q>&orientation=portrait&per_page=3\` with header \`Authorization: PEXELS_API_KEY\`. Pick the first HD file 1080 wide or more. If Pexels fails or the key is missing, skip b-roll silently.
- If the Shotstack docs show \`html\` assets as deprecated in favour of \`text\` or \`rich-text\` assets, use the replacement with the same fonts, colours and positions.
- Before building the full renderer, send the example above to the stage environment by hand (curl) to prove fonts, html captions and crop all work.

## 14. Caption style presets

All three use the user's \`brand_colour\` for highlights (default violet #8B5CF6; Punch uses yellow #FACC15 unless the brand colour is set).

| Preset | Look | Words per group | Highlight | Position | Entry |
| --- | --- | --- | --- | --- | --- |
| **Punch** (default) | Montserrat ExtraBold 78 px, UPPERCASE, white with black outline shadow | 1 to 3 words, break on punctuation, max 18 characters | Emphasis words in highlight colour and 115% size | Centre, offset y -0.20 (just below the chin) | Each group pops in with \`zoom\` transition, 0.1 s |
| **Clean** | Inter SemiBold 54 px, sentence case, white on a rounded black box at 55% opacity | 4 to 7 words, up to 2 lines of 32 characters | Emphasis words bold in brand colour | Lower third, offset y -0.32 | Fade in |
| **Karaoke** | Poppins Bold 64 px, sentence case | 4 words visible at once | The word being spoken gets a brand-colour pill behind it; others at 85% white | Centre, offset y -0.22 | One html clip per word so the pill moves word by word |

Caption timing: a group starts at \`remapTime(firstWord.s)\` and lasts until the next group starts (or the last word ends + 0.2 s). Never show a caption during the hook title card overlap for more than 0.2 s: captions start once the card begins to fade out.

Hook title card: white rounded card, black text, 64 px, top of frame, 2.2 s, slides down then fades. On Clean style the card is black at 80% opacity with white text.

Progress bar: 12 px tall, brand colour, bottom edge, grows from 0 to 100% across the clip. Toggle per clip.

## 15. Frontend behaviour (app-specific)

### 15.1 Upload (/app/new)

1. Drop zone accepts .mp4, .mov, .webm. Reject other types and files over 1 GB with an inline error before anything uploads.
2. Read duration, width and height from a hidden \`<video>\` element (\`loadedmetadata\`). Reject over 30 minutes.
3. Fetch the user's minutes left from \`minutes_used_this_period\`. If the video needs more minutes than are left, show the "Not enough minutes" card with the numbers and a link to billing. Do not upload.
4. Insert the \`projects\` row (status uploading, raw_path \`<uid>/<newId>/source.<ext>\`, size_bytes, declared_duration_s, width, height, title from the file name).
5. In parallel:
   - Face scan: load MediaPipe FaceDetector (\`@mediapipe/tasks-vision\`, BlazeFace short range model). Seek the hidden video once per second, run detection on the frame, push \`{t, x, y, w}\` for the largest face. Show "Finding your face" with its own progress. Save to \`projects.face_track\` when done.
   - Upload: \`tus-js-client\` to \`https://<project-ref>.storage.supabase.co/storage/v1/upload/resumable\` with \`chunkSize: 6 * 1024 * 1024\` (Supabase requires exactly 6 MB), headers \`authorization: Bearer <access token>\` and \`x-upsert: true\`, metadata \`bucketName: raw-videos\`, \`objectName\`, \`contentType\`, \`cacheControl: 3600\`. \`retryDelays: [0, 3000, 5000, 10000, 20000]\`. Use \`findPreviousUploads()\` and \`resumeFromPreviousUpload()\` so a refresh resumes.
6. When both are done, call \`start-transcription\` with the user's access token. On success, route to \`/app/projects/[id]\`.
7. Leaving the page during upload shows the browser "Leave site?" prompt.

### 15.2 Processing screen (/app/projects/[id] while not ready)

- Subscribe with Supabase Realtime (\`postgres_changes\`, table \`projects\`, filter \`id=eq.<id>\`) and (\`clips\`, filter \`project_id=eq.<id>\`).
- Also poll the project row every 15 seconds as a backup (Realtime can drop on sleepy laptops).
- Steps shown: Uploaded, Transcribing, Picking the best moments, Rendering clips (n of m ready), Done. The active step has a spinner and an honest time estimate (transcribing about 1 minute per 10 minutes of video; rendering about 1 to 3 minutes per clip).
- As each clip becomes ready, its card appears in a preview strip below the steps.
- On \`failed\`: show \`projects.error\`, the minutes refunded line, and a Try again button (calls start-transcription, which resumes from the last good step).

### 15.3 Clip grid (/app/projects/[id] when ready)

- Grid of 9:16 cards (2 columns on mobile, 3 on tablet, 4 on desktop), ordered by rank.
- Each card: poster image, play on hover (desktop) or tap (mobile) with a signed URL fetched on demand, rank badge, score, duration, hook title, the reason line, buttons Edit, Download, Copy caption.
- Signed URLs for players are fetched from \`/api/clips/[clipId]/download?inline=1\` (1 hour) only when a card is played, never for the whole grid at once.

### 15.4 Clip editor (/app/projects/[id]/clips/[clipId])

- Left: 9:16 player of the current render. Right: controls.
- Caption style: 3 preset tiles with a live CSS preview of a sample line.
- Hook title: text input, 60 character counter.
- Trim: two number steppers (start, end) in 0.5 s steps, each limited to plus or minus 5 s from Claude's original choice, and the total kept between 20 and 70 s.
- Toggles: Emojis, Progress bar.
- Post caption: textarea with Copy.
- "Re-render (uses 1 minute)" button: saves the editable columns with the publishable-key client (RLS + column grants allow only these), then calls \`render-clips\` with \`{ clip_id }\`. The player shows a "Rendering v2" overlay until Realtime reports ready.
- Changing start or end re-runs \`cutSegments\` inside render-clips from the stored transcript, so the browser never sends timestamps for words.

### 15.5 Export

- Download one: \`/api/clips/[clipId]/download\` returns a signed URL with \`download: "<project-title>-clip-<rank>.mp4"\`. The browser navigates to it.
- Download all: fetch the list and trigger each download 400 ms apart. No server-side zipping in v1.

## 16. Onboarding (3 steps, then trial)

1. "What do you do?" Single select chips: Coach, Consultant, Agency founder, Podcaster, Creator, Other (with text). Saves \`profiles.niche\`.
2. "Where will you post?" Multi select: TikTok, Instagram Reels, YouTube Shorts, LinkedIn. Saves \`profiles.platforms\`.
3. "Pick your caption style." The 3 preset tiles, each with a looping 3 second sample. Saves \`profiles.default_caption_style\` and sets \`onboarded_at\`.
Then: "Start your 7-day free trial" button creates the Checkout Session. Return to \`/app/new?welcome=1\`, which shows "Drop your first video. A 3 to 10 minute talking-head video works best."

## 17. Emails (Resend)

From: \`Ethereel <clips@yourdomain.com>\`. Plain, short, one button.

1. **Clips ready** (shotstack-callback)
   - Subject: \`Your 5 clips from "<title>" are ready\`
   - Body: "Ethereel found 5 moments worth posting. The top pick is '<hook title>'. Review and download them here." Button: Review clips (link to the project).
2. **Processing failed** (any function that sets failed)
   - Subject: \`We hit a problem with "<title>"\`
   - Body: the plain-English error, "Your <n> minutes have been refunded." Button: Try again.
3. **80% of minutes used** (start-transcription, once per period)
   - Subject: \`You've used 120 of your 150 minutes\`
   - Body: minutes left and the reset date.
4. **Welcome** and **Trial ending** come from the shared playbook steps.

## 18. Analytics events

| Event | When | Properties |
| --- | --- | --- |
| \`signup_completed\` | Account created | method (email, google) |
| \`onboarding_completed\` | Step 3 saved | niche, platforms, caption_style |
| \`checkout_started\` | Checkout session created | none |
| \`upload_started\` | Drop accepted | size_mb, duration_s |
| \`upload_completed\` | TUS success | size_mb, seconds_taken |
| \`processing_failed\` | Project failed | step, error_code |
| \`clips_ready\` | Project ready (server) | clip_count, total_seconds |
| \`clip_played\` | First play of a clip | rank |
| \`clip_edited\` | Re-render requested | changed_fields |
| \`clip_downloaded\` | Download clicked | rank, style (activation event) |
| \`download_all\` | Download all clicked | clip_count |
| \`limit_hit\` | Over limit message shown | minutes_used |
| \`portal_opened\` | Manage billing clicked | status |

## 19. Security requirements

- RLS on every table, per-operation policies with \`(select auth.uid())\`. Column grants stop the browser from setting status, paths or minutes.
- Both buckets private. Every video URL the browser sees is a signed URL that expires within 1 hour. Shotstack and Deepgram get signed URLs that expire within 6 hours.
- Webhooks: Deepgram and Shotstack callbacks carry an HMAC token in the URL. Shotstack status is re-fetched from the API, never trusted from the body. Stripe uses signature verification on the raw body.
- Internal function calls carry \`x-internal-secret\`.
- Never log signed URLs, tokens, API keys or transcripts.
- The transcript goes to Claude inside \`<transcript>\` tags and the system prompt says to ignore instructions in it. Claude's output is validated before use. Claude output is only ever used as data, never as HTML: hook titles and captions are HTML-escaped before going into Shotstack html assets.
- Limits from section 10 are enforced in edge functions with the secret key, not in the browser.
- \`.env*\` in \`.gitignore\`. \`.env.example\` has names only.

## 20. Environment variables

| Name | Where it lives | Secret |
| --- | --- | --- |
| \`NEXT_PUBLIC_SUPABASE_URL\` | .env.local + Vercel | No |
| \`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY\` | .env.local + Vercel | No |
| \`NEXT_PUBLIC_SITE_URL\` | .env.local + Vercel | No |
| \`SUPABASE_SECRET_KEY\` | .env.local + Vercel (server only) | Yes |
| \`STRIPE_SECRET_KEY\`, \`STRIPE_WEBHOOK_SECRET\`, \`STRIPE_PRICE_ID\` | .env.local + Vercel | Yes (price id no) |
| \`SB_SECRET_KEY\` | Supabase edge function secrets (same value as SUPABASE_SECRET_KEY) | Yes |
| \`DEEPGRAM_API_KEY\` | Supabase secrets | Yes |
| \`ANTHROPIC_API_KEY\` | Supabase secrets | Yes |
| \`SHOTSTACK_API_KEY\` | Supabase secrets (stage key while building, production key at launch) | Yes |
| \`SHOTSTACK_ENV\` | Supabase secrets: \`stage\` or \`v1\` | No |
| \`PEXELS_API_KEY\` | Supabase secrets (optional) | Yes |
| \`RESEND_API_KEY\` | Supabase secrets + Vercel | Yes |
| \`EMAIL_FROM\` | Supabase secrets | No |
| \`CALLBACK_SECRET\` | Supabase secrets (random 32+ characters) | Yes |
| \`INTERNAL_FUNCTION_SECRET\` | Supabase secrets (random 32+ characters) | Yes |
| \`SITE_URL\` | Supabase secrets (for email links, fonts and emoji URLs) | No |

\`SUPABASE_URL\` is provided to edge functions automatically.

## 21. Out of scope for v1

- Posting directly to TikTok, Instagram or YouTube (users download and post).
- Multi-speaker reframing (two faces on screen), screen recordings.
- Languages other than English.
- Background music.
- A timeline editor with drag handles. Trim is number steppers only.
- Team accounts, agencies managing client workspaces.
- Brand kits beyond one colour.
- Uploading from a YouTube or Google Drive link.
- Annual plans and multiple tiers (one plan at $39/mo).

## 22. Acceptance tests

Run each by hand before launch. Every one must pass.

1. Sign up with email, no confirmation email needed, land on onboarding.
2. Finish onboarding, Stripe Checkout in test mode with 4242 4242 4242 4242, return to /app/new, \`subscriptions.status = trialing\`.
3. Visiting /app/new without a subscription row shows the paywall, not the drop zone.
4. Upload a 5 minute MP4 (around 300 MB). Progress bar moves. Turn Wi-Fi off for 10 seconds mid-upload, turn it on: the upload resumes and finishes.
5. Refresh the page mid-upload: it resumes from the last chunk.
6. A .txt renamed to .mp4 is rejected by the bucket (mime check) and the UI shows an error.
7. A 35 minute video is rejected before upload.
8. The processing screen updates through every step without a refresh.
9. Within 10 minutes of upload finishing, 3 to 5 clips are ready and the email arrives.
10. Each clip is 1080 x 1920, between 25 and 65 seconds, starts on the hook title card, has no "um" or "uh" audible, and the face stays in frame.
11. Captions match the speech within about 0.1 s and use the chosen preset.
12. Change a clip to Karaoke, edit the hook title, trim 2 s off the end, re-render: v2 appears, minutes used goes up by 1.
13. Download one clip: file name is \`<title>-clip-1.mp4\` and it plays in QuickTime and VLC.
14. Logged in as user B, paste user A's \`raw_path\` into a storage download call: error, no file.
15. Calling \`deepgram-callback\` with a wrong token returns 401 and changes nothing.
16. Calling \`shotstack-callback\` twice with the same id creates one set of files and sends one email.
17. Setting a user's ledger to 149 minutes, then uploading a 3 minute video, shows "Not enough minutes" and nothing uploads. Calling start-transcription directly with curl returns 402.
18. Forcing Claude to fail twice (bad API key) sets the project to failed, shows the error, and writes a refund line. Try again after fixing the key completes the project.
19. Anonymous curl with the publishable key to /rest/v1/projects, /clips, /transcripts, /usage_ledger returns [].
20. Supabase Security Advisor shows no errors.

## 23. Build order (milestones)

Stop after each milestone, show me how to test it, and wait for my OK.

1. **Scaffold.** Next.js App Router + TypeScript + Tailwind + shadcn/ui. Design tokens from DESIGN.md. CLAUDE.md with the stack and security rules. \`.env.example\`. Git init.
2. **Auth.** Supabase clients (\`lib/supabase/client.ts\`, \`server.ts\`), \`proxy.ts\` or \`middleware.ts\` session refresh with getClaims, sign up, log in, forgot and reset password, Google, \`/auth/callback\`, route guards.
3. **Database.** I run the SQL migration. You generate types into \`lib/supabase/types.ts\` and check the advisors.
4. **Billing.** Stripe Checkout with a 7-day trial, webhook into \`subscriptions\`, Customer Portal, \`has_active_access\` gate, paywall component.
5. **Onboarding.** The 3 steps and the hand-off to Checkout.
6. **Upload.** /app/new with type, size and duration checks, minutes check, projects insert, MediaPipe face scan, TUS resumable upload, resume after refresh.
7. **Transcription.** \`_shared\` modules, \`start-transcription\`, \`deepgram-callback\`. Test with a real 2 minute video and check the transcripts row.
8. **Edit plan library.** \`_shared/edit-plan.ts\` with Deno unit tests (\`deno test\`) for cutSegments, remapTime, groupCaptions, faceOffsets using a saved transcript fixture.
9. **Clip picking.** \`plan-clips\` with the system prompt, schema, validation and one retry. Test on the fixture transcript and print the clips.
10. **Rendering.** \`_shared/shotstack.ts\`, \`render-clips\`, \`shotstack-callback\`, copy to the renders bucket, Resend email. First prove the section 13.4 example renders on stage by curl.
11. **Processing screen.** Realtime + polling fallback, step list, failure state with Try again.
12. **Clip grid, editor and export.** Section 15.3 to 15.5.
13. **Dashboard, billing page, settings.** Minutes meter, projects list, delete project (deletes storage files too, via an edge function or API route with the secret key).
14. **Landing page and SEO pages.** From DESIGN.md and the landing copy.
15. **Hardening.** Run section 22 end to end, the security advisor, a /code-review of the whole diff, then deploy to Vercel.
`
