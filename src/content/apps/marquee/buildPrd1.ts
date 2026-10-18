// Marquee build PRD (PRD.md), part 1: product, architecture, routes, data model, state machines.

export const buildPrd1 = `# Marquee: build PRD

Version 1.0. Download this file, save it as \`PRD.md\` in the root of your project folder, and reference it
in Claude Code with \`@PRD.md\`. Claude Code reads it before every task. Where this file and your instinct
disagree, this file wins. The look and feel lives in \`@DESIGN_SYSTEM.md\` (the Quiet Precision base system) and
\`@DESIGN.md\` (Marquee's accent and screens), the marketing page in \`@LANDING.md\`. Your \`CLAUDE.md\` should
contain the line \`UI rules: @DESIGN_SYSTEM.md @DESIGN.md\`.

## 0. How to use this document

- Read sections 1 to 5 once so you know what you are building and for whom.
- Sections 6 to 18 are the spec. Claude Code builds from them.
- Section 21 lists the build milestones. Do them in order. Do not start a milestone before the one
  before it passes its acceptance tests (section 20).
- Every new Claude Code session, say: "Read @PRD.md, @DESIGN_SYSTEM.md and @DESIGN.md. We are on milestone N.
  Plan first, then wait for my OK."
- Use Opus at high effort (\`/model opus\`, \`/effort high\`) for anything that touches the database schema,
  RLS, OAuth tokens, the YouTube rotation code or Stripe. Medium is fine for UI copy and layout.
- Anything marked **[verify]** was not confirmed against the vendor's live docs when this PRD was written
  (Oct 2026). Before you build that part, tell Claude Code: "Check the current docs for this and tell me if
  anything differs before you write code."

## 1. Problem

A YouTube video lives or dies on its thumbnail. Two videos with the same content can get a 3% and a 9%
click-through rate on the same impressions, which is three times the views from the same work. Creators
know this, so they spend hours on every thumbnail, or pay a designer $50 to $150 per thumbnail, and then
guess which one to use.

What they do today:
- Open Photoshop or Canva, hunt for a photo of their own face that has the right expression, cut it out
  by hand, type a headline, nudge it for an hour.
- Pay a freelance thumbnail designer, wait two days, get two options, pick one on gut feel.
- Use a general AI image tool that cannot put their real face in the picture, or that bakes in a fake
  face that looks almost like them, which viewers notice.
- Try YouTube's own "Test & Compare" in Studio, which is free and good, but only tests thumbnails they
  already made. It does not make them. [verify which channels have it and the current limits]
- Swap the thumbnail by hand after a few days and squint at the CTR in Studio, with no idea if the
  difference is real or Tuesday being a slow day.

The cost: a creator posting 2 videos a week spends 6 to 10 hours a week on thumbnails, or $400 to $1,200
a month on a designer, and still does not know which design works.

## 2. Ideal customer (ICP)

- **Who:** YouTubers with 10,000 to 500,000 subscribers who appear on camera (education, business,
  finance, tech reviews, fitness, cooking, commentary), and small agencies or editors who run 3 to 15
  channels for clients.
- **Volume:** 4 to 12 long-form videos a month per channel.
- **Behaviour:** already care about CTR, already check YouTube Studio every day, already pay for at least
  one creator tool (TubeBuddy, vidIQ, Canva Pro, Epidemic Sound).
- **Pain trigger:** "This video is good and it is getting nothing. I think it is the thumbnail."
- **Will pay:** $29 to $149 a month if one better thumbnail a month adds a few thousand views. For a
  channel earning $5 to $10 RPM, 5,000 extra views a month is $25 to $50 in ad revenue alone, before
  sponsors.
- **Not for (v1):** Shorts (thumbnails barely matter there), faceless channels that want AI people,
  channels under 1,000 subs (not enough impressions for a test to say anything), anyone who wants an AI
  model trained to fake their face.

## 3. The one core job

"I upload my face once. For each video I type the title and what it is about. Two minutes later I have six
thumbnail ideas with my real face cut out and a bold headline. I tweak one in the editor, pick two or three,
and Marquee swaps them on my live video every day for a week and tells me which one people actually click."

Everything in v1 serves that sentence. If a feature does not shorten idea-to-proven-thumbnail, it waits.

## 4. User stories

### Creator (workspace owner)
1. As a creator, I sign up, name my workspace and upload 5 to 10 photos of my face in under 5 minutes.
2. As a creator, I see each photo cut out with a clean edge and tagged with an expression (smiling,
   shocked, serious, pointing, thinking), and I can change the tag.
3. As a creator, I set my brand colours (up to 6) and upload my brand fonts (WOFF2, TTF or OTF), or pick
   from the built-in thumbnail fonts.
4. As a creator, I connect my YouTube channel once with Google sign-in and see my latest 50 videos with
   their current thumbnails.
5. As a creator, I start a project with a title, a one or two sentence topic and an optional video from my
   channel, then click "Generate 6 concepts (6 credits)".
6. As a creator, I watch six cards fill in one by one with a progress line ("Writing ideas", "Painting 4 of 6"),
   and I can leave the page and come back.
7. As a creator, each concept already has my face cut-out, a headline and a layout, so it looks like a
   finished thumbnail, not a background.
8. As a creator, I regenerate a single concept I do not like for 1 credit.
9. As a creator, I open a concept in the editor, move and scale layers, swap the face for another expression,
   change the headline, apply a text preset, change colours from my brand kit, and undo/redo.
10. As a creator, I export at 1280x720 and the file is always under 2 MB, ready for YouTube.
11. As a creator, I pick 2 or 3 designs (optionally including my current thumbnail as the control) and start
    an A/B test on one of my videos.
12. As a creator, I see the test schedule ("Day 1 A, Day 2 B, ...") and which thumbnail is live today.
13. As a creator, I see impressions, CTR and views per variant fill in as YouTube reports them, with a
    plain-English status ("Too early to call", "B is ahead, 81% sure", "B wins, 97% sure").
14. As a creator, when a test ends, the winner is applied to the video automatically (or I choose), and I
    get an email.
15. As a creator, I can stop a test at any time and choose which thumbnail stays.
16. As a creator, I see my credits used this month and my plan's caps before I hit them.

### Agency (Pro and Agency plans)
17. As an agency owner, I invite team members by email and give them Admin or Editor roles.
18. As an agency owner, I connect several client channels and keep a face library per person
    ("Sam", "Priya") so concepts use the right face.
19. As an editor, I see only the workspaces I belong to.

### System
20. As the system, I never call fal.ai, Claude or YouTube for a workspace that is over its plan caps or
    whose trial or subscription has ended.
21. As the system, I rotate thumbnails once a day at a fixed time in YouTube's reporting day and never
    twice on the same day for the same test.
22. As the system, if a rotation fails (token revoked, channel not verified for custom thumbnails), I pause
    the test, put the original thumbnail back if I can, and tell the creator what to fix.

## 5. What we are not building in v1 (out of scope)

- Title A/B testing (YouTube Data API can change titles, but testing both at once ruins the maths; v2).
- Training a model on the creator's face (LoRA, "persona"). We only use real photos, cut out. This is a
  feature: the face in every thumbnail is really them.
- Shorts, TikTok, Instagram covers.
- Uploading videos or editing anything except the thumbnail.
- Predicting CTR with AI before the test. The live test is the truth; a fake score is noise.
- Pushing designs into YouTube Studio's Test & Compare (there is no public API for it [verify]).
- Mobile editor. The editor is desktop only (1100px and wider). Results pages work on a phone.
- Team comments, approvals, client portals.

## 6. Architecture

### 6.1 Diagram

\`\`\`
Browser (Next.js on Vercel)
  |  publishable key + user JWT, RLS applies
  v
Supabase
  Auth ---- Postgres (RLS on every table) ---- Storage (private buckets)
  |            |   jobs table + pg_cron + pg_net
  |            v
  |   Edge functions (Deno)
  |     mrq-face-ingest       <- browser after a face photo upload
  |     mrq-generate          <- browser "Generate 6 concepts"
  |     mrq-ai-worker         <- pg_cron every minute (x-cron-secret)
  |     mrq-fal-webhook       <- fal.ai when an image is done (ED25519 signature)
  |     mrq-youtube-connect   <- browser start + Google OAuth callback
  |     mrq-test-control      <- browser start / stop / apply / restore a test
  |     mrq-scheduler         <- pg_cron every 15 minutes (x-cron-secret)
  |     mrq-youtube-worker    <- pg_cron every minute (x-cron-secret)
  |
  +--> Claude API (claude-opus-5-5): concept briefs, expression tags
  +--> fal.ai queue: FLUX.2 [pro] backgrounds, Ideogram V3 title art, BiRefNet face cut-outs
  +--> YouTube Data API v3: list videos, thumbnails.set
  +--> YouTube Reporting API v1: daily reach report (thumbnail impressions + CTR)
  +--> YouTube Analytics API v2: daily views and watch time per video
  +--> Resend: emails      Stripe: Checkout, webhook, portal      PostHog: events
\`\`\`

### 6.2 Who does what

| Piece | Job | Why here |
|---|---|---|
| Next.js (Vercel) | All pages, the canvas editor, Stripe routes | One codebase, fast pages, Stripe webhook needs the raw body |
| Supabase Postgres | Every row, RLS, the job queue, plan maths | One place for truth; RLS stops cross-workspace reads |
| Supabase Storage | Face photos, cut-outs, fonts, concept images, exports, original thumbnail backups | Private buckets with per-workspace folder policies |
| Edge functions | Anything that holds a secret or spends money | Secrets never reach the browser |
| pg_cron + pg_net | Calls the worker and scheduler functions on a timer | No extra service to pay for or learn |
| fal.ai | Image generation and background removal behind one key | One account, per-image billing, webhooks, many models |
| Claude | Turns a title and topic into 6 different concept briefs; tags face expressions from photos | Best at varied creative angles and strict JSON |
| YouTube APIs | Set thumbnails, read the numbers | The only source of truth for real clicks |

### 6.3 The trade-offs we chose (and what breaks first)

1. **Daily rotation, not a true split test.** YouTube's own Test & Compare shows different thumbnails to
   different viewers at the same time. The public API cannot do that: \`thumbnails.set\` changes the
   thumbnail for everyone. So Marquee shows one thumbnail per day, in a balanced order (A B B A B A A B),
   and compares days. The balanced order cancels out most of the "weekends are different" effect. The cost:
   a test needs 8 days instead of 3, and a very spiky video (a news video in its first 48 hours) gives noisy
   answers. We block tests on videos younger than 3 days by default and say why.
2. **The reach report arrives a day or two late.** Thumbnail impressions and CTR come from the YouTube
   Reporting API's \`channel_reach_basic_a1\` report, which YouTube generates once a day per channel. [verify
   the delay; plan for up to 48 hours] So a test reads "Collecting" for up to 4 days after the last rotation
   before it decides. The UI says so plainly.
3. **Postgres as the job queue.** A \`jobs\` table with \`for update skip locked\`, claimed by a worker that
   pg_cron calls every minute. Good to about 50 jobs a minute, far past 1,000 customers for this app. When
   it is not enough: move the AI jobs to Trigger.dev or a queue; the job rows stay the same.
4. **The canvas runs in the browser.** Konva renders and exports thumbnails on the user's machine, so we pay
   nothing for rendering. The cost: the export must be checked on the server (size, dimensions, file type)
   because the browser can lie.
5. **What breaks first at scale: the YouTube quota.** Every Google Cloud project gets 10,000 Data API units a
   day. \`thumbnails.set\` costs about 50 units [verify]. One running test uses 50 units a day, plus 50 when it
   restores or applies the winner. So one project carries about 180 running tests a day. At about 100
   running tests (around 40 to 60 paying customers), fill in YouTube's quota extension form (it is free but
   needs an audit and takes weeks). Marquee tracks units in \`youtube_quota_days\` and, at 85% of the daily
   budget, stops starting new tests and emails you. Rotations for running tests always get priority.

### 6.4 What can go wrong, and what Marquee does

| Failure | What the user sees | What the system does |
|---|---|---|
| fal.ai is slow or down | Cards stay "Painting" with a live dot; after 10 minutes "Still working, we will email you" | Worker polls the fal status URL; 3 tries; failed concepts refund their credit |
| Claude returns bad JSON or refuses | "Could not write ideas for this title. Try rewording the topic." | zod rejects it, 5 retries with backoff, fallback model on refusal, then the generation fails and all 6 credits are refunded |
| Google refresh token revoked | Channel row shows "Reconnect needed"; running tests pause | Channel \`needs_reauth\`, one email a day at most, no YouTube calls until reconnected |
| Channel not allowed custom thumbnails | "YouTube says this channel cannot use custom thumbnails yet. Verify your phone number in YouTube Studio, then restart the test." | Test \`failed\`, nothing was changed on YouTube |
| Reach report missing for a small channel | "YouTube has not sent impressions for this video yet" then "Based on views, a weaker signal" | Falls back to the views method after 4 days |
| Daily quota nearly used | New tests show "Testing is full for today. It opens again at midnight Pacific." | Starts stop at 85%, rotations reserved first |
| The creator changes the thumbnail by hand in Studio mid-test | A banner: "The thumbnail on YouTube is not the one Marquee set. This day will not count." | The next rotation re-sets it; that day is marked \`skipped\` (checked by comparing the live thumbnail etag/URL after each set [verify an etag is exposed]) |

## 7. Routes and pages

### 7.1 Marketing (public)
| Route | Page |
|---|---|
| \`/\` | Landing page from @LANDING.md |
| \`/pricing\` | Pricing section full width, monthly/annual toggle |
| \`/login\`, \`/signup\`, \`/reset\` | Auth pages (DESIGN.md section 5) |
| \`/auth/callback\` | Supabase auth code exchange |
| \`/privacy\`, \`/terms\` | Plain pages. Privacy must explain the YouTube data use (Google requires it for verification) |

### 7.2 App (logged in, paywalled by \`has_active_access\`)
| Route | Page |
|---|---|
| \`/onboarding\` | 4 steps: workspace name, face photos, brand kit, connect YouTube (skippable) |
| \`/app\` | Redirects to \`/app/projects\` |
| \`/app/projects\` | Project list: title, video, concept count, best test result, updated |
| \`/app/projects/new\` | Title, topic, video picker, person picker, style chips, "Generate 6 concepts (6 credits)" |
| \`/app/projects/[id]\` | Concept gallery (6 cards, then more if regenerated), saved designs, start test |
| \`/app/projects/[id]/edit/[designId]\` | Canvas editor |
| \`/app/tests\` | Test list with live status dot, variant thumbnails, leader and confidence |
| \`/app/tests/new\` | Pick video, pick 2 or 3 designs (or the current thumbnail as control), length, auto-apply switch |
| \`/app/tests/[id]\` | Test detail: schedule strip, today's live variant, per-variant numbers, daily chart, decision |
| \`/app/channels\` | Connected channels, status, connect button |
| \`/app/channels/[id]\` | Latest 50 videos with current thumbnail, age, "Start a test" and "New project" per row |
| \`/app/faces\` | Face library: people, photos, cut-outs, expression tags, upload |
| \`/app/brand\` | Brand colours, fonts, default text presets |
| \`/app/docs\` | Documentation: how testing works, why 8 days, what CTR means, quota, fonts |
| \`/app/help\` | Help: contact form (Resend to you), status of the YouTube connection, FAQ |
| \`/app/billing\` | Plan, usage meters, invoices link, upgrade, Stripe portal |
| \`/app/settings\` | Profile, workspace, members and invites, notifications, delete data |

### 7.3 Sidebar (app shell)
One level, no nested menus. Top group (logo first): **Projects, Tests, Channels, Faces, Brand kit**.
Bottom group, always in this order: **Documentation, Help, Billing, Settings**. Billing is hidden from
non-owners. A small credits meter ("62 of 84 concepts left") sits above the bottom group. Under 1100px the
sidebar collapses to icons (DESIGN_SYSTEM.md section 10).

### 7.4 Next.js route handlers
| Route | Job |
|---|---|
| \`POST /api/stripe/checkout\` | Checkout session with the chosen price and a 7 day trial (shared task) |
| \`POST /api/stripe/webhook\` | Verifies the signature, de-dupes by event id, writes \`subscriptions\` (shared task) |
| \`POST /api/stripe/portal\` | Customer portal session (shared task) |
| \`POST /api/designs/[id]/export\` | Receives nothing secret: returns a signed upload URL for \`exports/<ws>/<design>/<version>.jpg\` |
| \`POST /api/help\` | Sends the help form to the founder through Resend (rate limited 5 an hour) |

## 8. Data model

All tables live in \`public\`, have \`id uuid primary key default gen_random_uuid()\`, \`created_at\`, and
\`updated_at\` where rows change. Every workspace-owned table has \`workspace_id\` with an index. The full SQL is
in the kit's migration (run once). Summary:

| Table | Key columns | Notes |
|---|---|---|
| profiles | id (= auth.users.id), email, full_name, current_workspace_id | Created by trigger on signup |
| workspaces | name, owner_id | Created only through \`create_workspace()\` |
| workspace_members | workspace_id, user_id, role (owner/admin/editor) | unique (workspace_id, user_id) |
| workspace_invites | workspace_id, email, role, token_hash, expires_at, accepted_at | Token shown once, stored as SHA-256 |
| people | workspace_id, name, consent_confirmed_at | One per face in the library ("Sam") |
| face_photos | person_id, original_path, cutout_path, status, expression, width, height, bbox jsonb, error | Private bucket \`faces\` |
| brand_kits | workspace_id (unique), colours jsonb, default_font, text_presets jsonb | Created with the workspace |
| brand_fonts | workspace_id, family, weight, style, storage_path, format | Private bucket \`brand-fonts\` |
| channels | workspace_id, youtube_channel_id, title, avatar_url, subscriber_count, status, reach_job_id, connected_by | unique (workspace_id, youtube_channel_id) |
| channel_tokens | channel_id (pk), refresh_token_enc, access_token_enc, access_expires_at, scopes | No client policies at all: only edge functions read it |
| videos | channel_id, youtube_video_id, title, published_at, duration_sec, thumbnail_url, privacy_status | Synced cache, refreshed daily |
| projects | workspace_id, title, topic, video_id, person_id, style_tags text[], status | |
| generations | project_id, workspace_id, status, brief jsonb, concept_count, cost_micros, error | One per "Generate" click |
| concepts | generation_id, project_id, workspace_id, idx, angle, headline, subline, layout, expression, image_model, prompt, status, fal_request_id, image_path, error | Private bucket \`concepts\` |
| designs | project_id, workspace_id, concept_id, name, doc jsonb, version, export_path, export_bytes, exported_at | doc = the editor layers (section 11) |
| tests | workspace_id, channel_id, video_id, status, days, start_day date, rotation_hour_pt, auto_apply, min_impressions, winner_variant_id, decision jsonb, original_backup_path, created_by | |
| test_variants | test_id, label (A/B/C), design_id null, is_original, image_path, impressions, clicks, views, watch_minutes | Totals refreshed after every report |
| test_rotations | test_id, day date, variant_id, status, set_at, attempts, error | unique (test_id, day) |
| reach_daily | channel_id, youtube_video_id, day, impressions, ctr | unique (channel_id, youtube_video_id, day) |
| video_daily | channel_id, youtube_video_id, day, views, watch_minutes, avg_view_duration_sec | unique (channel_id, youtube_video_id, day) |
| youtube_quota_days | day (pk, Pacific date), units_used | Shared across all workspaces (one Google project) |
| jobs | workspace_id, kind, status, ref_id, payload jsonb, idempotency_key unique, attempts, run_after, locked_at, last_error | The queue |
| usage_ledger | workspace_id, user_id, kind, quantity, cost_micros, ref_id, idempotency_key unique | The meter |
| subscriptions | user_id (pk), stripe ids, status, price_id, trial_end, current_period_end | Written only by the Stripe webhook |
| plan_prices | price_id (pk), plan | Maps Stripe prices to creator/pro/agency |
| stripe_events | id (pk), type | De-dupe for the webhook |
| fal_events | request_id (pk), received_at | De-dupe for the fal webhook |
| oauth_states | nonce (pk), workspace_id, user_id, expires_at | Single-use Google OAuth state, 10 minutes |
| workspace_limit_overrides | workspace_id (pk), concepts, live_tests, channels, seats | Only you, in the SQL editor, for testing and favours |
| email_log | workspace_id, kind, to_email, dedupe_key unique, resend_id, status | Every email once |
| rate_limits | key, window_start, hits | Fixed-window limiter |

Usage kinds (\`usage_kind\` enum): \`concepts\` (1 per image generated), \`face_cutouts\` (1 per photo processed),
\`ai_briefs\` (1 per Claude brief), \`yt_units\` (Data API units, for the founder's view only).

## 9. State machines

### 9.1 Face photo
\`\`\`
uploaded --(mrq-face-ingest)--> processing --(cut-out + tag ok)--> ready
                                   |                                 |
                                   +--(3 failed attempts)--> failed  +--(user deletes)--> row deleted, files deleted
\`\`\`
- \`failed\` shows the reason ("We could not find a face in this photo. Try one where your face fills a third of the frame.").

### 9.2 Generation and concepts
\`\`\`
generation: queued -> briefing -> rendering -> ready
                         |            |-> partial (1 to 5 concepts stored, rest failed after retries)
                         +------------+-> failed  (brief failed, or 0 concepts stored)
concept:    queued -> submitted (fal request id saved) -> rendered (webhook arrived) -> stored
                         |                                      |
                         +--------------------------------------+-> failed (after 3 tries; credit refunded)
\`\`\`
- Credits are reserved when the generation is created (6 rows in usage_ledger with quantity 1 each and
  idempotency keys \`concept:<concept_id>\`). A concept that ends \`failed\` writes a matching refund row
  (quantity -1, key \`refund:<concept_id>\`). The user is never charged for a failed image.
- A concept stuck in \`submitted\` for more than 10 minutes is polled through the fal queue status URL by the
  worker (the webhook may have been lost).

### 9.3 Test
\`\`\`
draft --(start)--> scheduled --(first rotation set)--> running --(last day passed)--> collecting
  |                   |                                   |                              |
  |                   +--(stop)--> cancelled               +--(stop)--> cancelled        +--(data complete or 5 days)--> decided | no_winner
  |                                                        +--(3 rotation failures)--> failed (original restored)
\`\`\`
- \`decided\`: a winner passed the rules in section 12.4. If \`auto_apply\`, the winner is set on the video.
- \`no_winner\`: the creator picks which thumbnail stays; default is the original.
- \`cancelled\` and \`failed\`: the original thumbnail is restored from \`original_backup_path\`.
- Only one test per video can be in \`scheduled\`, \`running\` or \`collecting\` (partial unique index).

### 9.4 Rotation (one per test per day)
\`\`\`
pending --(thumbnails.set 200)--> set
   |--(429/5xx: retry with backoff, up to 4 times within the same Pacific day)
   |--(403 forbidden / 401 after refresh)--> failed --(test paused, email)--
   +--(day passed without success)--> skipped (that day is dropped from the maths)
\`\`\`

### 9.5 Channel
\`\`\`
connected --(refresh token revoked or invalid_grant)--> needs_reauth --(user reconnects)--> connected
connected --(user disconnects)--> disconnected (token revoked at Google, token row deleted, running tests cancelled)
\`\`\`

## 10. Faces, brand kit and fonts

### 10.1 Face photos
- Accept JPEG, PNG, WebP, HEIC is converted in the browser to JPEG with \`heic2any\` [verify package]. Max 15 MB
  each, min 800px on the short side. 5 to 10 photos per person recommended, up to 30 stored per person.
- Upload straight from the browser to \`faces/<workspace_id>/<person_id>/<photo_id>.<ext>\` (RLS applies), then
  call \`mrq-face-ingest\` with the photo id.
- Cut-out: fal.ai BiRefNet returns a PNG with a transparent background. We store it as
  \`faces/<ws>/<person>/<photo_id>-cutout.png\`, trimmed to the bounding box plus 2% padding.
- Expression tag: Claude looks at the photo (downscaled to 768px) and returns one of
  \`smiling, laughing, shocked, serious, thinking, pointing, confused, excited\` plus where the face is
  (section 14.2). The user can change it.
- Consent: the first upload for a person shows a required checkbox: "These are photos of me, or of someone who
  agreed to appear in my thumbnails." It sets \`people.consent_confirmed_at\`.

### 10.2 Brand kit
- Up to 6 colours (hex), one marked "headline" and one "accent".
- Fonts: built-in list (Anton, Bebas Neue, Archivo Black, Montserrat 800, Inter 800, Poppins 800, all Google
  Fonts under the Open Font License, loaded with \`next/font/google\`), plus uploaded fonts.
- Uploaded fonts: WOFF2, WOFF, TTF or OTF, max 2 MB, stored in \`brand-fonts/<ws>/<font_id>.<ext>\`. The editor
  loads them with the \`FontFace\` API from a signed URL (1 hour). The user confirms they hold a licence that
  allows use in thumbnails (one checkbox, stored on the row).
- Text presets: 6 defaults (section 11.3) plus up to 12 saved per workspace.

## 11. The canvas editor

### 11.1 Document format (designs.doc)
\`\`\`json
{
  "version": 1,
  "width": 1280,
  "height": 720,
  "background": { "type": "image", "path": "concepts/<ws>/<concept>.png", "fit": "cover", "dim": 0 },
  "layers": [
    { "id": "face1", "type": "face", "photoId": "uuid", "x": 820, "y": 90, "scale": 1.1, "rotation": 0,
      "flipX": false, "outline": { "width": 8, "colour": "#ffffff" }, "shadow": true },
    { "id": "t1", "type": "text", "text": "I QUIT", "font": "Anton", "weight": 400, "size": 180,
      "fill": "#ffffff", "stroke": { "width": 10, "colour": "#08090a" }, "x": 60, "y": 380,
      "rotation": -3, "align": "left", "maxWidth": 640, "highlight": null, "preset": "big-stroke" },
    { "id": "s1", "type": "shape", "shape": "arrow", "x": 600, "y": 300, "w": 220, "h": 120,
      "fill": "#ff3b30", "rotation": 20 }
  ]
}
\`\`\`
- Layer types: \`face\`, \`text\`, \`shape\` (arrow, circle, rectangle, underline), \`image\` (an upload, e.g. a
  product shot, max 5 per design).
- Validate the doc with zod on every save, in the browser and in the export route. Max 20 layers. Text max 60
  characters per layer.

### 11.2 Editor features
- Konva via \`react-konva\`. Stage is 1280x720 scaled to fit the canvas area; all maths in 1280x720 units.
- Select, move, scale (corner handles keep aspect ratio), rotate, delete, duplicate, bring forward/back.
- Keyboard: arrows nudge 1px (Shift = 10px), Cmd/Ctrl+Z undo, Shift+Cmd/Ctrl+Z redo, Delete, Cmd/Ctrl+D duplicate.
- Snap guides to centre lines and a 40px safe margin. A toggle shows the bottom-right "duration badge"
  zone (about 150x60px) where YouTube covers the image with the video length; keep text out of it.
- Swap face: a strip of the person's cut-outs filtered by expression; clicking one swaps the image and
  keeps position and scale.
- Mobile preview: a small 246x138 preview (the size on a phone home feed) next to the stage, live.
- Autosave every 3 seconds after a change (debounced), with "Saved" in the toolbar. Version number goes up on
  export, not on autosave.

### 11.3 Text presets (built in)
| Id | Look |
|---|---|
| big-stroke | Anton, white fill, 10px black stroke |
| highlight-bar | Archivo Black, black text on a brand-colour bar behind it |
| two-tone | First word white, second word brand accent, both with a soft shadow |
| number-pop | Huge number (e.g. "$10K") in accent, a small word under it |
| outline-only | Transparent fill, thick white stroke, for dark busy backgrounds |
| quiet-caption | Inter 800, white, small, for the second line |

### 11.4 Export
- Render the stage at exactly 1280x720 (\`pixelRatio\` = 1280 / displayed width).
- Encode JPEG at quality 0.92. If the blob is over 1,950,000 bytes, step quality down by 0.06 until it fits
  (floor 0.6). If it still does not fit, downscale nothing; show "This design is too detailed to fit 2 MB.
  Remove the background texture or an image layer." (In practice 1280x720 JPEG is 150 to 600 KB.)
- Upload to the signed URL from \`POST /api/designs/[id]/export\`, then call
  \`supabase.rpc('mark_design_exported', { p_design: id, p_path: path })\`. That function reads the object's
  size from \`storage.objects.metadata\` and refuses anything over 2,000,000 bytes or outside the workspace
  folder. \`mrq-test-control\` checks again when the design is used in a test (dimensions read from the JPEG
  header, first bytes must be \`FF D8 FF\`).
- Also offer "Download" so the creator can upload by hand if they prefer.

YouTube's documented thumbnail limit has long been 2 MB; a Sept 2026 revision note mentions 50 MB [verify].
We stay under 2 MB either way, because it is always accepted.
`
