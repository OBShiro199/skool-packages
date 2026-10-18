// Folio build PRD, part 2: function contracts, rendering, scheduling, analytics, limits, emails, tests, milestones.

export const buildPrd2 = `
## 12. Edge function contracts
Shared rules for every function (put them in \`supabase/functions/_shared/\`):
- Browser-called functions read the \`Authorization\` header and call \`supabase.auth.getClaims(token)\`.
  No valid claims: 401. Then check membership with the admin client: not a member of the workspace in the
  body: 404 (never say the row exists). Then \`has_active_access(workspace_id)\`: false gives 402.
- Bodies are validated with zod. Bad input: 400 \`{ code: 'bad_request', issues }\`.
- Every create call takes an \`idempotency_key\` (uuid made in the browser when the button is pressed). A repeat
  with the same key returns the first result with 200, never a second job or a second charge.
- Metering goes through \`public.try_consume_usage(workspace_id, user_id, metric, quantity, idempotency_key, ref_id)\`.
  Over the limit: 402 \`{ code: 'limit_reached', metric, used, limit }\`. Failed jobs refund with a negative row.
- Rate limits (per user, counted from \`jobs\` rows in the window): ingest 10 per minute, generate 6 per minute,
  rewrite 20 per minute, render 10 per minute, schedule 20 per minute. Over: 429 with \`retry_after\` seconds.
- Retries on third-party calls: \`withRetry()\` 3 tries, exponential backoff 1 s, 2 s, 4 s with jitter,
  honour \`retry-after\`. Only retry 408, 429 and 5xx.
- Logs: one JSON line per step \`{ fn, step, job_id, workspace_id, ms, ok }\`. Never log keys, source text,
  captions or signed URLs.
- Errors return \`{ code, message }\`. \`message\` is safe to show in the UI.

### 12.1 fol-ingest (browser)
Input: \`{ workspace_id, brand_id, kind: 'blog_url'|'youtube_url'|'idea'|'voice_note', url?, idea?, audio_path?, idempotency_key }\`.
Output 202: \`{ source_id, job_id }\`. The browser watches the job row over Realtime.
Steps: validate (URL must be https, public hostname, not an IP literal, not localhost, max 2,048 chars;
YouTube URL must match youtube.com/watch, youtu.be or youtube.com/shorts; idea 20 to 4,000 chars; audio_path
must start with \`{workspace_id}/\`), insert \`sources\` (status \`pending\`) and \`jobs\` (kind \`ingest\`), then in
\`EdgeRuntime.waitUntil\`:
- blog_url: Firecrawl \`POST https://api.firecrawl.dev/v2/scrape\` with \`{ url, formats: ['markdown'], onlyMainContent: true, timeout: 30000 }\`. Meter \`scrape\` 1.
- youtube_url: Supadata \`GET https://api.supadata.ai/v1/transcript?url=...&text=true\` with header \`x-api-key\`
  [verify path and params on docs.supadata.ai]. If it returns a job id, poll every 3 s for up to 120 s.
  Meter \`scrape\` 1.
- voice_note: signed URL (10 minutes) for the file, Deepgram \`POST https://api.deepgram.com/v1/listen?model=nova-3&smart_format=true&paragraphs=true\`
  with \`Authorization: Token ...\` and body \`{ url }\`. Meter \`voice_minutes\` = ceil(duration).
- idea: no external call.
Then save \`extracted_text\` (cleaned: no nav, no cookie text, max 200,000 chars), \`title\`, \`word_count\`,
set source \`ready\`, job \`succeeded\`.
Errors: \`url_blocked\` 400, \`no_transcript\` 422 ("This video has no captions and is over 30 minutes"),
\`too_short\` 422 (under 120 words), \`provider_down\` (job retried by sweeper).

### 12.2 fol-generate (browser)
Input: \`{ workspace_id, source_id, brand_id, body_slides?: 6..9 (default 7), angle?: string(200), format?: 'portrait'|'square', idempotency_key }\`.
Output 202: \`{ carousel_id, job_id }\`.
Steps: source must be \`ready\` and in the same workspace. \`try_consume_usage(..., 'carousel', 1, key)\`.
Insert carousel (\`generating\`) and job. In \`waitUntil\`: condense if over 6,000 tokens (11.3), call 11.2,
validate, trim or repair, insert slides at positions 0..n-1 inside one transaction (RPC
\`replace_slides(carousel_id, slides jsonb)\`), save title, caption, hashtags, set carousel \`ready\`, job
\`succeeded\` with \`result: { slides: n, input_tokens, output_tokens }\`. Write \`cost_micros\` on the ledger row
from the real token usage.
Errors: \`refused\`, \`invalid_output\` (after one repair), \`limit_reached\`. Final failure refunds the carousel credit.

### 12.3 fol-rewrite-slide (browser, synchronous)
Input: \`{ workspace_id, slide_id, preset?: string, instruction?: string(300), idempotency_key }\`.
Output 200: \`{ slide: { id, layout, content, warnings }, revision_id, note }\`.
Steps: role at least \`editor\`. Consume \`rewrite\` 1. Save the old version to \`slide_revisions\` first, call
11.4 with a 25 s timeout, validate, update the slide. On failure refund and return 502 \`ai_failed\`.

### 12.4 fol-render-enqueue (browser)
Input: \`{ workspace_id, carousel_id, idempotency_key }\`. Output 202 \`{ render_id, job_id, reused: boolean }\`.
Steps: load slides and brand, compute \`content_hash = sha256(JSON of slides + brand colours + fonts + logo/headshot paths + format)\`.
If a \`done\` render with that hash exists for this carousel: return it with \`reused: true\` and no charge.
Otherwise consume \`render\` 1, insert \`renders\` (\`queued\`) and a \`render\` job, set carousel \`rendering\`,
then \`fetch(RENDER_WORKER_URL, { method: 'POST', headers: { 'x-render-secret': RENDER_WORKER_SECRET }, body: { job_id } })\`
with a 3 s timeout and ignore the result (the sweeper re-kicks queued renders every 2 minutes).

### 12.5 /api/render/run (Vercel Node route, not an edge function)
Auth: header \`x-render-secret\` must equal \`RENDER_WORKER_SECRET\` (constant-time compare), else 401.
\`export const runtime = 'nodejs'\`, \`export const maxDuration = 120\`.
Steps: call RPC \`claim_jobs('render', 4)\` with the secret-key client (skips locked rows). For each job:
download logo and headshot from Storage into data URLs, render each slide (section 13), upload PNGs to
\`renders/{workspace_id}/{carousel_id}/{render_id}/slide-01.png\`..., build \`carousel.pdf\`, upload it, set render
\`done\` with \`slide_paths\`, \`pdf_path\`, \`bytes\`, set carousel \`rendered\` and \`latest_render_id\`, job
\`succeeded\`, progress updates every slide (\`progress = round(i / total * 100)\`). On error: job back to
\`queued\` with backoff or \`failed\` and a refund.

### 12.6 fol-zernio-connect (browser)
Input: \`{ workspace_id, brand_id, action: 'start'|'sync'|'disconnect', platform?: 'linkedin'|'linkedin_page'|'instagram', social_account_id? }\`.
- start: role \`admin\`. Check the plan's \`social_accounts\` limit. If the brand has no \`zernio_profile_id\`,
  create a Zernio profile (\`POST https://zernio.com/api/v1/profiles\` with \`{ name: "{workspace short id} {brand name}" }\`)
  and save its id. Then \`GET /v1/connect/{platform}?profileId=...&redirect_url={APP_URL}/app/brand/{brand_id}/accounts?connected=1\`
  (platform is \`linkedin\` for both profile and page, \`instagram\` for Instagram) and return \`{ url: authUrl }\`.
  For company pages Zernio shows its own organisation picker after LinkedIn login.
- sync: \`GET /v1/accounts?profileId=...\`, upsert \`social_accounts\` (personal vs organisation decides
  \`linkedin\` or \`linkedin_page\`).
- disconnect: \`DELETE /v1/accounts/{accountId}\`, mark ours \`disconnected\`.

### 12.7 fol-schedule-post (browser)
Input: \`{ workspace_id, action: 'schedule'|'reschedule'|'cancel'|'retry', carousel_id?, render_id?, social_account_id?, caption?, scheduled_for?, publish_now?, scheduled_post_id?, idempotency_key }\`.
- schedule: render must be \`done\` and belong to the carousel; account must be \`connected\` and in the same
  workspace and brand; caption 1 to 3,000 chars for LinkedIn, 1 to 2,200 for Instagram; \`scheduled_for\` at
  least 5 minutes ahead and at most 90 days. Insert \`scheduled_posts\` (\`draft\`). Media: Zernio needs public
  HTTPS URLs, so copy our private files into Zernio's media store: for each file call
  \`POST /v1/media/presign\` with \`{ filename, contentType, size }\`, PUT the bytes to \`uploadUrl\` (expires in
  1 hour), keep \`publicUrl\`. LinkedIn gets one item \`{ type: 'document', url, title }\` (the PDF), Instagram
  gets the PNGs as \`{ type: 'image', url, altText }\`. Then \`POST /v1/posts\` with
  \`{ content: caption, mediaItems, platforms: [{ platform, accountId, platformSpecificData }], scheduledFor, timezone }\`
  or \`publishNow: true\`. LinkedIn \`platformSpecificData\`: \`{ documentTitle: carousel.title }\` (required by
  LinkedIn for document posts) plus \`organizationUrn\` for pages. Save \`zernio_post_id\`, status \`scheduled\`,
  carousel \`scheduled\`.
- reschedule: \`PUT /v1/posts/{postId}\` with the new \`scheduledFor\`, update ours.
- cancel: \`DELETE /v1/posts/{postId}\`, status \`canceled\`.
- retry: only from \`failed\`, re-runs schedule with \`publish_now: true\`.

### 12.8 fol-zernio-webhook (public, verify_jwt off)
Zernio sends \`X-Zernio-Event\` (e.g. \`post.published\`), \`X-Zernio-Event-Id\` (stable across retries) and
\`X-Zernio-Signature\` (HMAC SHA-256 with the webhook secret). Compute the HMAC of the raw body with
\`ZERNIO_WEBHOOK_SECRET\` and compare in constant time [verify hex vs base64 encoding with Zernio's "Send test"
button]. Insert \`X-Zernio-Event-Id\` into \`provider_events\`; if it exists, return 200 and stop. Handle
\`post.published\`, \`post.failed\`, \`post.partial\`, \`post.cancelled\` and \`account.disconnected\`; ignore the rest.
Treat the event as a poke: fetch \`GET /v1/posts/{postId}\` and update our row from that response.
This means even a forged event can never set a wrong status. On \`published\`: set \`platform_post_url\`,
\`published_at\`, carousel \`published\`, send "post published" email (once). On \`failed\`: save the error,
send "post failed" email with a Retry link. Return 200 within 2 seconds.

### 12.9 fol-analytics-sync (pg_cron every 6 hours, \`x-cron-secret\`)
For published posts from the last 30 days in workspaces whose plan has \`analytics = true\`: fetch metrics
with \`GET /v1/analytics?postId={zernio_post_id}\` (needs Zernio's Analytics add-on; a 202 means "sync pending",
try next run), upsert \`post_metrics\` for today. 20 posts per request
batch, stop at 300 posts per run, back off on 429.

### 12.10 fol-sweeper (pg_cron every 2 minutes, \`x-cron-secret\`)
1. Jobs \`running\` with \`locked_at\` older than 5 minutes: back to \`queued\` with backoff, or \`failed\` + refund.
2. Queued ingest and generate jobs with \`run_after <= now()\` and older than 1 minute: re-run them.
3. Queued render jobs: POST the render worker once.
4. Scheduled posts 15 minutes past \`scheduled_for\` still \`scheduled\`: poll Zernio and update.
5. Once an hour: delete renders older than the 3 newest per carousel (Storage objects first, then rows),
   and voice notes older than 30 days.
6. Usage alerts: workspaces that crossed 80% of a limit since the last run get one email per metric per month.

## 13. Rendering pipeline
1. \`lib/render/fonts.ts\`: load 12 TTF files from \`/fonts\` once at module scope:
   Inter, Manrope, DM Sans, Plus Jakarta Sans, Space Grotesk, Sora, Lora, Playfair Display, Fraunces,
   Bricolage Grotesque, IBM Plex Sans, Archivo (400 and 700 each). Custom fonts download from
   \`brand-assets\` once per job.
2. \`lib/render/renderSlide.tsx\`: \`satori(<Slide .../>, { width, height, fonts, loadAdditionalAsset })\` then
   \`new Resvg(svg, { fitTo: { mode: 'width', value: 1080 } }).render().asPng()\`.
3. \`lib/render/fitText.ts\`: measures with a character-width table per font and steps the headline size
   down (e.g. 88, 76, 64, 56 px) until it fits the box. Below the smallest size the slide gets a warning.
4. \`lib/render/pdf.ts\`: \`PDFDocument.create()\`, one page per PNG at 1080 x 1350 points, embed with
   \`embedPng\`, set title metadata to the carousel title. Target under 10 MB (LinkedIn documents allow up to
   100 MB and 300 pages).
5. Upload with \`upsert: false\` and \`contentType\` set. The browser gets signed URLs (1 hour) for downloads
   and a "Download all (ZIP)" built in the browser with \`fflate\`.
Performance budget: under 600 ms per slide, under 8 s for 11 slides plus PDF on a cold start.

## 14. Scheduling and the calendar
- Times are stored in UTC and shown in the workspace timezone (Settings). The schedule dialog shows
  "Tue 21 Oct, 08:30 (Europe/London)".
- Suggested slots: Tue, Wed, Thu at 08:30 and 12:00 local time, shown as faint chips on the calendar.
- Month view: one chip per post with brand colour dot, platform icon, status colour. Week view: time grid.
- Drag a chip to a new day: calls reschedule. Past days are not droppable. Published posts are locked.
- A post can only be scheduled from a render, never from live slides.
- Filter by brand and platform. Agency sees all brands, others see their one brand.

## 15. Library and analytics
- Grid of cards: cover slide thumbnail (slide 1 PNG of the latest render, or a live render), title, brand,
  status pill, created date, and for published posts impressions and reactions.
- Search by title (trigram index), filter by brand, status, source kind, date range. Sort by newest or most
  impressions.
- Card menu: Open, Duplicate (copies slides, new carousel \`ready\`), Archive, Download PDF.
- Analytics panel on a published carousel: impressions, reach, reactions, comments, shares, clicks over the
  last 30 days as a small line chart, plus the platform link. Plans without analytics show the panel locked
  with "Analytics is on Pro and Agency".
- "Top performers" strip at the top of the library: the 3 carousels with the most impressions in 30 days.

## 16. Plans, limits and metering
| | Creator $39/mo ($390/yr) | Pro $79/mo ($790/yr) | Agency $249/mo ($2,490/yr) | Trial (7 days) |
|---|---|---|---|---|
| Carousels generated / month | 15 | 50 | 150 | 5 |
| AI slide rewrites / month | 100 | 400 | 1,000 | 30 |
| Exports (renders) / month | 60 | 200 | 1,000 | 15 |
| Voice minutes / month | 30 | 120 | 400 | 10 |
| Brand kits | 1 | 3 | 10 | 1 |
| Connected social accounts | 1 | 3 | 10 | 1 |
| Team seats | 1 | 2 | 5 | 1 |
| Analytics | No | Yes | Yes | No |
| Custom font upload | No | Yes | Yes | No |
| "Made with Folio" footer | Removable | Off | Off | Always on |
- Periods are calendar months in UTC. \`usage_ledger.period_start\` is the first of the month.
- \`try_consume_usage\` takes a per-workspace advisory lock so 30 parallel requests cannot overspend.
- The sidebar meter and every action button show what is left: "Generate (12 left this month)". At 80% the
  meter turns amber and an email goes out once. At 100% buttons are disabled with an "Upgrade" link.
- Store the Stripe price ids in \`plan_prices\` (SQL in the backend task) and env vars
  \`STRIPE_PRICE_CREATOR_MONTHLY\`, \`STRIPE_PRICE_CREATOR_YEARLY\`, \`STRIPE_PRICE_PRO_MONTHLY\`,
  \`STRIPE_PRICE_PRO_YEARLY\`, \`STRIPE_PRICE_AGENCY_MONTHLY\`, \`STRIPE_PRICE_AGENCY_YEARLY\`.

## 17. Emails (Resend, from \`hello@yourdomain\`)
| Template | Trigger | Content |
|---|---|---|
| \`welcome\` | Profile created | "Your first carousel in 5 minutes": link to /onboarding |
| \`first_carousel\` | First carousel reaches \`ready\` | Link to editor, tip: rewrite the hook 3 ways |
| \`trial_ending\` | Stripe \`customer.subscription.trial_will_end\` | Days left, carousels made so far, plan picker link |
| \`usage_80\` | Sweeper sees 80% of a metric | Metric, used, limit, upgrade link |
| \`post_published\` | Webhook says published | Link to the post, "See analytics in 24 hours" |
| \`post_failed\` | Webhook or sweeper says failed | Error in plain words, Retry button link |
| \`invite\` | Admin invites a member | Workspace name, accept link (expires in 7 days) |
| \`inactive_7d\` | No carousel in 7 days during trial or paid | "Paste one link today" with a deep link to /app/create |
Every send writes \`email_log\` with an idempotency key like \`post_failed:{post_id}\` so retries never double send.

## 18. Analytics events (PostHog or DataFast, same names)
\`signup_complete\`, \`brand_kit_saved\` (fields_filled), \`source_submitted\` (kind), \`source_failed\` (kind, code),
\`carousel_generated\` (kind, slides, ms), \`slide_rewritten\` (preset), \`slides_reordered\`, \`layout_changed\`,
\`export_started\`, \`export_done\` (ms, reused), \`pdf_downloaded\`, \`account_connected\` (platform),
\`post_scheduled\` (platform, days_ahead), \`post_published\`, \`post_failed\` (code), \`limit_hit\` (metric),
\`upgrade_clicked\` (from_plan, location), \`checkout_started\` (plan, interval).
Activation event: \`export_done\` or \`post_scheduled\` within 24 hours of signup. Watch it weekly.

## 19. Failure matrix
| Failure | What the user sees | What the system does |
|---|---|---|
| Firecrawl times out or the site blocks bots | "We could not read that page. Paste the text as an Idea instead." with a button that opens Idea pre-filled with the URL | Retry twice with backoff, then fail, refund the scrape |
| YouTube video has no captions and is long | "This video has no captions and is over 30 minutes." | No charge |
| Claude returns invalid JSON or overlong text | Progress shows "Tidying up slides" | One repair call, then fail and refund |
| Render worker crashes | Export button shows "Retrying" | Sweeper re-queues, max 4 attempts |
| Zernio rejects the post (token expired) | Post chip turns red: "Reconnect LinkedIn" | Mark account \`expired\`, email the owner |
| Stripe webhook late after checkout | Onboarding shows "Confirming your trial" spinner | Poll subscriptions for 60 s, never grant from success_url |

## 20. Out of scope for v1
- Video carousels, GIFs, Reels, Stories, TikTok photo mode.
- X, Threads, Facebook, Pinterest (Zernio supports them, add after launch).
- Stock image search and AI image generation inside slides.
- Approval workflows for agency clients, client logins, white-label domains.
- Direct LinkedIn API posting (see 6.4).
- Translating carousels, multiple languages per brand.
- A free plan (trial only).

## 21. Acceptance tests
Run each by clicking, then run the SQL in Supabase SQL Editor to check the data.
1. **Signup creates a workspace.** Sign up as a new user. Expect \`/onboarding\`.
\`\`\`sql
select w.name, m.role from public.workspaces w
join public.workspace_members m on m.workspace_id = w.id
where m.user_id = (select id from auth.users order by created_at desc limit 1);
-- one row, role = owner
\`\`\`
2. **Brand kit saves and previews.** Upload a logo and headshot, pick #6D4AFF and Manrope, handle @you.
   The live preview slide updates within 300 ms of each change.
\`\`\`sql
select name, handle, colors->>'accent' as accent, font_heading, logo_path is not null as has_logo from public.brands order by created_at desc limit 1;
\`\`\`
3. **Blog URL to carousel.** Paste a real blog post URL. Progress goes Reading page, Writing slides, Ready in
   under 60 s. The carousel has 1 hook, 6 to 9 body slides, 1 CTA.
\`\`\`sql
select layout, position from public.slides where carousel_id = '<id>' order by position;
-- first row hook, last row cta, 8 to 11 rows
select metric, quantity from public.usage_ledger where ref_id = '<id>';
\`\`\`
4. **YouTube and voice.** Paste a 20 minute YouTube video with captions, then record a 1 minute voice note.
   Both produce carousels. \`voice_minutes\` shows 1 in the ledger.
5. **Rewrite and undo.** Click Punchier on slide 3. Text changes, a toast says what changed, Undo restores it.
\`\`\`sql
select reason, created_at from public.slide_revisions where slide_id = '<slide id>' order by created_at;
\`\`\`
6. **Reorder.** Drag slide 5 to position 2. Refresh. The order stays. Counter labels update.
7. **Export.** Click Export. Progress reaches 100% in under 15 s. PNG ZIP and PDF download. Open the PDF: 1080 x 1350
   pages, fonts correct. Click Export again with no changes: instant, "No changes since last export", no new ledger row.
8. **Schedule.** Connect your LinkedIn profile, schedule the PDF for 10 minutes from now. It appears on the
   calendar. After it posts, the chip turns green with a link to the live post.
\`\`\`sql
select status, scheduled_for, zernio_post_id, platform_post_url from public.scheduled_posts order by created_at desc limit 1;
\`\`\`
9. **Limits.** Set your trial usage to the cap:
\`\`\`sql
insert into public.usage_ledger (workspace_id, metric, quantity, idempotency_key, period_start)
values ('<workspace id>', 'carousel', 5, 'test-cap-' || gen_random_uuid(), date_trunc('month', now())::date);
\`\`\`
   The Generate button is disabled with "Upgrade to keep creating". Calling fol-generate returns 402.
10. **Isolation.** Second user in another workspace cannot see the first user's carousels, slides, renders or
    brand assets (security task runs this with curl).

## 22. Milestones (about 22 hours)
1. **M1 (2h):** auth, workspace trigger, app shell with sidebar, onboarding skeleton, SQL migration.
2. **M2 (3h):** brand kit page with uploads, colour pickers, fonts, live preview.
3. **M3 (3h):** the 8 slide templates and \`/templates\` gallery, Satori-safe.
4. **M4 (3h):** fol-ingest (blog, YouTube, idea, voice) with job progress over Realtime.
5. **M5 (3h):** fol-generate with structured output, validation, repair, metering.
6. **M6 (3h):** editor: slide rail, inline editing, AI rewrite with undo, drag reorder, layout switcher.
7. **M7 (2h):** render worker, PNG + PDF export, content hash reuse.
8. **M8 (2h):** Zernio connect, schedule dialog, calendar, webhook, sweeper.
9. **M9 (1h):** library with analytics sync, usage meter, emails, landing page.
`
