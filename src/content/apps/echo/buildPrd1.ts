// Echo build PRD (PRD.md), part 1: product, architecture, routes, data model, state machines, plans.

export const buildPrd1 = `# Echo: build PRD

Version 1.0. Download this file, save it as \`PRD.md\` in the root of your project folder, and reference it
in Claude Code with \`@PRD.md\`. Claude Code reads it before every task. Where this file and your instinct
disagree, this file wins. The look and feel lives in \`@DESIGN_SYSTEM.md\` (the Quiet Precision base system)
and \`@DESIGN.md\` (Echo's accent and screens), the marketing page in \`@LANDING.md\`. Your \`CLAUDE.md\` must
contain the line \`UI rules: @DESIGN_SYSTEM.md @DESIGN.md\`.

## 0. How to use this document

- Read sections 1 to 5 once so you know what you are building and for whom.
- Sections 6 to 17 are the spec. Claude Code builds from them.
- Section 21 lists the build milestones. Do them in order. Do not start a milestone until the one before
  it passes its acceptance tests (section 20).
- Every new Claude Code session, say: "Read @PRD.md, @DESIGN_SYSTEM.md and @DESIGN.md. We are on milestone N.
  Plan first, then wait for my OK."
- Use Opus at high effort (\`/model opus\`, \`/effort high\`) for anything that touches the database schema,
  RLS, webhooks, Stripe, the RSS fetcher or the public pages. Medium is fine for UI copy and layout.
- Prices and model names were checked in Oct 2026. Anything marked [verify] could not be confirmed on the
  vendor's own page: check it before you rely on it.

## 1. Problem

A podcast episode takes 1 to 2 hours to record and another 3 to 5 hours to "ship": write the title, the
show notes, the chapter timestamps, pull quotes for social, a newsletter for the email list, a blog post
for Google, and cut two or three audiograms for Instagram and LinkedIn. Most indie hosts skip half of it.
Agencies that produce shows for clients do all of it by hand, for every client, every week.

What they do today:
- Paste the transcript into ChatGPT, get generic copy that sounds nothing like them, rewrite it.
- Pay for one tool for show notes (Castmagic, Podsqueeze, Swell AI: about $29 to $99 a month [verify]),
  another for audiograms (Headliner [verify]), and a third for transcripts, then glue them together.
- Type chapter timestamps by scrubbing through the audio.
- Never publish a proper episode page, so Google never finds the 9,000 words they said out loud.

The cost: a weekly show spends about 16 hours a month on post-production writing and clipping. A small
agency with 8 client shows burns more than one full-time person on it.

## 2. Ideal customer (ICP)

Three buyers, one product:

1. **Indie podcasters** (Creator plan). Solo or two-host interview and expert shows, weekly or fortnightly,
   100 to 20,000 downloads an episode. Already on a host (Buzzsprout, Transistor, Captivate, Spotify for
   Creators, RSS.com) with a public RSS feed. Want growth from social and search, hate writing show notes.
2. **B2B podcast agencies** (Agency plan). 3 to 20 people producing 5 to 40 client shows. Sell
   "done-for-you podcasting" at $1,500 to $6,000 a month per client. Every hour saved on deliverables is margin.
3. **Companies with a branded show** (Studio plan). A marketing manager at a SaaS company or consultancy
   running 1 to 3 shows, judged on pipeline, needing a newsletter and blog post per episode for SEO.

- **Pain trigger:** "I recorded Tuesday. It is Friday and the episode still has no show notes."
- **Will pay:** $29 to $199 a month if every episode ships complete the same day it is uploaded.
- **Not for (v1):** video podcasts that need visual editing, live streams, audio editing (cutting ums,
  levelling), non-English shows (v1 prompts are English only; transcription detects language but the
  writing is English), podcast hosting itself.

## 3. The one core job

"I drop in my episode (or Echo pulls it from my RSS feed). Twenty minutes later I have titles, show notes,
chapters, five quotes, a newsletter, five social posts and a blog post, all in my voice, plus audiograms
ready to post, and a public episode page with the full transcript that Google can index."

Everything in v1 serves that sentence. If a feature does not shorten upload-to-everything-shipped, it waits.

## 4. User stories

### Host or producer (workspace member)
- As a host, I sign up, name my workspace, add my show (name, artwork, RSS URL) and paste a sample of my own
  writing, so Echo learns my voice before the first episode.
- As a host, I upload an MP3, M4A, WAV or MP4 up to 1 GB and see progress, and I can close the tab.
- As a host, I connect my RSS feed and new episodes appear in Echo within 15 minutes of going live on my host,
  and get processed automatically if I switch auto-process on.
- As a host, I see the transcript with speakers, rename "Speaker A" to "Sam" once and it updates everywhere.
- As a host, I get 5 title options, show notes, chapters, 5 pull quotes, a newsletter draft, 5 social posts and
  an SEO blog post, each with a Copy button and an inline editor.
- As a host, I can regenerate any one asset with an instruction ("shorter, more playful") and undo it.
- As a host, I pick a quote or highlight any 30 to 60 seconds of the transcript and make a vertical audiogram
  with a waveform and word-by-word captions in my show colours, then download the MP4.
- As a host, I publish a public episode page with notes, chapters, quotes, the transcript and a player, and I
  copy an embed code for my own website.
- As a host, I copy a \`chapters.json\` and a transcript \`.vtt\` URL into my podcast host so Apple and Spotify
  show chapters and transcripts.
- As a host, I see how many audio hours, audiograms and regenerations I have left this month before I run out.

### Agency or company (workspace with several shows and people)
- As a producer, I manage up to 25 client shows in one workspace, each with its own voice, artwork and colours.
- As an owner, I invite teammates as admin or member. Members can process episodes and edit assets; admins can
  also manage shows and members; only the owner sees Billing.
- As a producer who works with two agencies, I switch workspaces from the sidebar.

### Listener (never logs in)
- As a listener, I find an episode page on Google, read the notes, jump to a chapter, play the episode from the
  page and read along in the transcript.

## 5. Scope decisions (and why)

| Decision | Why | What breaks first at scale, and the fix |
|---|---|---|
| AssemblyAI for transcription, not Deepgram | Cheaper for recordings with speakers: about $0.23 an hour vs about $0.38 for Deepgram Nova-3 batch plus diarisation, and it calls us back by webhook | AssemblyAI concurrency limits on a burst of RSS imports. Fix: the worker caps transcriptions in flight per workspace (3) and globally (50) |
| One worker edge function on pg_cron, not a queue service | Zero extra vendors. A jobs table with status, attempts and backoff is enough at 1,000 customers | Minute-level latency and a 150 to 400 s wall clock per run. Fix at about 3,000 episodes a day: move the worker to Trigger.dev and keep the same jobs table |
| Three Claude calls per episode, transcript cached | Smaller calls fail less and can be retried alone. Prompt caching makes calls 2 and 3 read the transcript at a tenth of the price | If cache misses (calls more than 5 minutes apart), cost goes up about 15%. Fix: run the three calls back to back in one worker run |
| Remotion Lambda for audiograms | Cheapest reliable option: a few cents of AWS per 60 s render, and Remotion is free for companies of up to 3 people. Shotstack is $0.15 to $0.30 per rendered minute and Creatomate about $0.37 per 1080p minute [verify] | AWS Lambda concurrency on a new account can be as low as 10. Fix: request a quota increase to 1,000 in AWS Service Quotas before launch |
| Player streams from the host's own audio URL (the RSS enclosure) | The host keeps their download stats on their podcast host, and Echo pays no bandwidth | Upload-only episodes have no public audio. Fix: the page shows "Listen on" links, and the host can paste their public audio URL later |
| Uploaded audio deleted 30 days after processing | Keeps storage near flat as customers grow | Audiograms for old uploaded episodes need the file again. Fix: the UI asks for a re-upload or the RSS link |
| Public pages read through one security definer function | One narrow door for anonymous visitors, no table is ever readable with the publishable key | Function per page view can get heavy. Fix: Next.js caches each page (revalidate 300 s) and revalidates on publish |
| English writing only in v1 | Prompts and voice cards are tuned for English | Non-English shows. Fix later: pass the detected language into every prompt |

## 6. Architecture

\`\`\`
 Browser (Next.js on Vercel)                         Supabase
 +-----------------------------+    TUS upload     +--------------------------------------+
 | /app/episodes/new           |------------------>| Storage: episode-audio (private)     |
 |  UploadDrop / RSS picker    |                   |          show-art (public)           |
 +-------------+---------------+                   |          audiograms (private)        |
               | invoke                            +------------------+-------------------+
               v                                                      | signed URL
 +-----------------------------+   POST /v2/transcript                v
 | ech-start-transcription     |------------------------------> AssemblyAI
 +-----------------------------+   (speaker labels, webhook)          |
                                                                      | webhook (secret header)
 +-----------------------------+   insert job (idempotent)            v
 | ech-assemblyai-webhook      |<-----------------------------------------
 +-------------+---------------+
               v
 +--------------------------------------------------------------------------+
 | jobs table  (queued > running > done | dead, attempts, run_after)          |
 +-------------+------------------------------------------------------------+
               | pg_cron every minute
               v
 +-----------------------------+  fetch transcript    AssemblyAI
 | ech-worker                  |--------------------> (GET /v2/transcript/:id)
 |  fetch_transcript           |
 |  gen_core / gen_distribution|  3 calls, cached     Claude API (claude-sonnet-5-5)
 |  gen_blog / voice_card      |--------------------> structured JSON output
 |  cleanup (hourly)           |
 +-----------------------------+
               | writes episode_assets, usage_ledger, email_log -> Resend
               v
 +-----------------------------+  renderMediaOnLambda  AWS Lambda (Remotion)
 | ech-render-audiogram        |--------------------> step 1: clip audio (wav)
 +-----------------------------+                      step 2: 1080x1920 MP4
 +-----------------------------+  webhook (HMAC-SHA512)         |
 | ech-remotion-webhook        |<--------------------------------
 +-----------------------------+  copies MP4 into Storage: audiograms

 +-----------------------------+  every 15 min        Podcast hosts (RSS)
 | ech-rss-poll                |--------------------> ETag / If-Modified-Since, SSRF guard
 +-----------------------------+  new items -> episodes (source rss)

 Listener -> /s/[show]/[episode] (Next.js, ISR) -> rpc get_public_episode() -> JSON
          -> audio plays from the host's enclosure URL, not from Echo
 Stripe -> /api/stripe/webhook (Next.js route, raw body) -> subscriptions
\`\`\`

Rules that come out of this picture:
- The browser never calls AssemblyAI, Claude, AWS or Resend. Only edge functions do, with secrets in
  Supabase secrets.
- Every slow thing is a job row or a render row with a status the UI subscribes to with Realtime.
- Every paid call checks the plan limit first and writes \`usage_ledger\` after.
- Anonymous visitors only ever call \`get_public_show\` and \`get_public_episode\`.

## 7. Routes and pages

### 7.1 Marketing and auth
| Route | What it is |
|---|---|
| \`/\` | Landing page (LANDING.md) |
| \`/pricing\` | Pricing with monthly/annual toggle |
| \`/compare/[competitor]\` | castmagic, podsqueeze, headliner, swell (SEO pages) |
| \`/tools/show-notes-generator\` | Free tool: paste an RSS URL, get show notes for the latest episode (1 per IP per day) |
| \`/login\`, \`/signup\`, \`/reset\` | Auth (email + password, Google optional) |
| \`/invite/[token]\` | Accept a workspace invite |
| \`/onboarding\` | Workspace, first show, voice sample (4 steps) |
| \`/paywall\` | Trial ended or payment failed |

### 7.2 App (logged in, behind \`has_active_access\`)
The app shell is a left sidebar, one level, no nested menus. Top group: workspace switcher, then the core pages.
Bottom group, always in this order: Documentation, Help, Billing, Settings.

| Sidebar item | Route | What it is |
|---|---|---|
| Episodes | \`/app/episodes\` | Every episode across shows, filter chips by show and status, the default page |
| (no item) | \`/app/episodes/new\` | Upload a file or pick an episode from a connected feed |
| (no item) | \`/app/episodes/[id]\` | Episode workspace: transcript, assets tabs, audiograms panel, publish |
| Shows | \`/app/shows\` | Shows in this workspace |
| (no item) | \`/app/shows/[id]\` | Show settings: artwork, RSS, auto-process, colours, public page slug, links |
| Audiograms | \`/app/audiograms\` | Every render in the workspace with status and download |
| Voice | \`/app/voice\` | Voice sample and voice card per show |
| Public pages | \`/app/public\` | Published episodes, embed codes, chapters/transcript feed URLs |
| Documentation | \`/app/docs\` | How-to articles (static MDX) |
| Help | \`/app/help\` | Contact form (Resend to the founder) and status of the last failed jobs |
| Billing | \`/app/billing\` | Plan, usage meters, Customer Portal button (owner only) |
| Settings | \`/app/settings\` | Profile, workspace name, members and invites, notifications, delete workspace |

That is 8 items. Above the bottom group sits a compact usage meter (audio hours left this month).

### 7.3 Public (no login)
| Route | What it is |
|---|---|
| \`/s/[show]\` | Show page: artwork, description, published episodes newest first |
| \`/s/[show]/[episode]\` | Episode page: player, notes, chapters, quotes, transcript, JSON-LD PodcastEpisode |
| \`/s/[show]/[episode]/chapters.json\` | Podcasting 2.0 JSON chapters, served as \`application/json+chapters\` |
| \`/s/[show]/[episode]/transcript.vtt\` | WebVTT transcript with speaker names, \`text/vtt\` |
| \`/s/[show]/[episode]/transcript.srt\` | SRT transcript, \`application/x-subrip\` |
| \`/embed/[episodeId]\` | Compact embeddable player with chapters (iframe, 160 px high) |
| \`/sitemap.xml\` | Every published show and episode |

### 7.4 API routes (Next.js)
| Route | What it does |
|---|---|
| \`POST /api/stripe/webhook\` | Stripe events into \`subscriptions\` (built in the shared Stripe tasks) |
| \`POST /api/stripe/checkout\`, \`/api/stripe/portal\` | Checkout with the chosen plan and interval, Customer Portal |
| \`POST /api/episodes/[id]/publish\` | Member check, \`status = ready\` check, set \`is_published\`, \`revalidatePath\` |
| \`POST /api/episodes/import\` | Member check, insert picked feed items as \`imported\` episodes, then process each |
| \`POST /api/episodes/[id]/process\` | Start processing an imported RSS episode (calls ech-start-transcription server-side) |
| \`POST /api/help\` | Help form to the founder's inbox, rate limited |

## 8. Data model

All tables live in \`public\`, have RLS on, and are created by the one migration (\`sql\` in this kit). Money is
never stored here (Stripe owns it). Times are \`timestamptz\`. Every table with a \`workspace_id\` is isolated
with \`is_workspace_member(workspace_id)\`.

| Table | Key columns | Notes |
|---|---|---|
| \`profiles\` | id (= auth.users.id), full_name, current_workspace_id | Created by trigger on signup |
| \`workspaces\` | id, name, owner_id | The owner's subscription pays for the workspace |
| \`workspace_members\` | workspace_id, user_id, role (owner/admin/member) | PK (workspace_id, user_id) |
| \`workspace_invites\` | workspace_id, email, role, token_hash, expires_at, accepted_at | Raw token only in the email |
| \`shows\` | workspace_id, name, slug (global unique), description, artwork_path, rss_url, rss_etag, rss_last_modified, last_polled_at, poll_error, auto_process, accent_hex, voice_sample, voice_card (jsonb), links (jsonb) | One row per podcast |
| \`episodes\` | workspace_id, show_id, source (upload/rss), status, title, slug, episode_number, rss_guid, audio_path, enclosure_url, reported_duration_sec, duration_sec, file_size_bytes, assemblyai_id, error, is_published, published_at, processed_at, audio_deleted_at, created_by | Unique (show_id, rss_guid), unique (show_id, slug) |
| \`transcripts\` | episode_id (PK), workspace_id, text, utterances (jsonb), words (jsonb), density (int[] of 600 buckets), speakers (jsonb map), language, word_count | words never leave the server except a clip window; density draws the speech strip |
| \`episode_assets\` | episode_id, workspace_id, kind, status, content (jsonb), version, edited, model, cost_micros | Unique (episode_id, kind) |
| \`asset_history\` | asset_id, workspace_id, version, content, reason (generated/regenerated/edited), created_by | Last 10 kept per asset (trigger prunes) |
| \`audiograms\` | workspace_id, episode_id, show_id, status, style, start_ms, end_ms, caption_words (jsonb), audio_render_id, video_render_id, output_path, error, created_by | 30 to 60 s, check constraint |
| \`jobs\` | workspace_id, kind, ref_id, status, attempts, run_after, locked_at, last_error, idempotency_key (unique), payload | The worker's to-do list |
| \`usage_ledger\` | workspace_id, user_id, kind, quantity, cost_micros, ref_id, idempotency_key (unique) | The meter. Limits read from here |
| \`remotion_events\` | id (renderId + ':' + type), received_at | Webhook de-duplication |
| \`email_log\` | workspace_id, kind, to_email, dedupe_key (unique), resend_id, status | Every email Echo sends |
| \`email_suppressions\` | email | Unsubscribed addresses |
| \`rate_limits\` | key, window_start, hits | Fixed-window limiter |
| \`subscriptions\` | user_id (PK), stripe_customer_id, stripe_subscription_id, status, price_id, trial_end, current_period_end | Written only by the Stripe webhook |
| \`stripe_events\` | id, type | Webhook de-duplication |
| \`plan_prices\` | price_id, plan (creator/studio/agency) | Map your Stripe prices to plans |
| \`workspace_limit_overrides\` | workspace_id, audio_minutes, audiograms, regenerations | Test and support overrides (SQL editor only) |

### 8.1 Asset content shapes (jsonb)
\`\`\`json
{
  "titles":      { "options": [{ "title": "...", "angle": "curiosity" }] },
  "show_notes":  { "summary": "...", "key_points": ["..."], "resources": [{ "label": "...", "at_sec": 754 }], "guest": { "name": "...", "bio": "..." } },
  "chapters":    { "items": [{ "start_sec": 0, "title": "Cold open" }] },
  "quotes":      { "items": [{ "text": "...", "speaker": "B", "start_ms": 813200, "end_ms": 829900, "why": "..." }] },
  "clip_ideas":  { "items": [{ "start_ms": 812000, "end_ms": 858000, "hook": "..." }] },
  "newsletter":  { "subject_lines": ["..."], "preview_text": "...", "body_markdown": "..." },
  "social":      { "posts": [{ "platform": "linkedin", "text": "...", "quote_index": 2 }] },
  "blog":        { "seo_title": "...", "meta_description": "...", "slug": "...", "target_keyword": "...", "body_markdown": "...", "faq": [{ "q": "...", "a": "..." }] }
}
\`\`\`

## 9. State machines

### 9.1 Episode
\`\`\`
 (upload)  uploading --upload done--> queued --sent to AssemblyAI--> transcribing
 (rss)     imported --process (auto or click)--> queued

 transcribing --webhook + fetch ok--> transcribed --gen_core starts--> generating
 generating --all three asset groups ready--> ready
 any state --unrecoverable error--> failed --Retry--> queued
\`\`\`
- \`imported\`: found in the RSS feed, not processed yet (auto-process off, or the plan's hours are used up).
- \`ready\` is the only state that can be published. Unpublishing keeps the episode \`ready\`.
- An episode is \`ready\` when \`titles\`, \`show_notes\`, \`chapters\`, \`quotes\`, \`clip_ideas\`, \`newsletter\`,
  \`social\` and \`blog\` all have \`status = 'ready'\`. If one group fails after 5 attempts, the episode is still
  \`ready\` with that asset marked failed and a Retry button on its tab (partial success beats nothing).

### 9.2 Asset
\`pending\` (row created when the episode is transcribed) to \`ready\` or \`failed\`. Regenerate keeps it \`ready\`
and bumps \`version\`. Edit sets \`edited = true\` and writes history with reason \`edited\`.

### 9.3 Job
\`\`\`
 queued --claim_jobs--> running --ok--> done
                        running --error, attempts < 5--> queued (run_after = now + 2^attempts min + jitter)
                        running --error, attempts = 5--> dead (episode or asset marked failed, email sent)
                        running --locked > 10 min--> queued (release_stuck_jobs)
\`\`\`

### 9.4 Audiogram
\`\`\`
 queued --step 1 started--> rendering_audio --webhook success--> rendering_video --webhook success--> ready
 any --webhook error/timeout, or no webhook after 15 min--> failed --Retry--> queued
\`\`\`
- A render that gets no webhook within 15 minutes is checked by the worker with \`getRenderProgress\` and either
  completed or failed.

### 9.5 Show feed
\`last_polled_at\` and \`poll_error\` on \`shows\`. Three errors in a row: auto-import pauses, the owner gets an
email, the Shows page shows "Feed unreachable. Check the URL and click Try again".

## 10. Plans and limits

Usage driver: **audio hours processed per month** (transcribed and written up). Limits are enforced on the server
in every edge function that spends money, from \`plan_limits(ws)\` and \`usage_this_month(ws, kind)\`.

| | Creator | Studio | Agency |
|---|---|---|---|
| Price monthly | $29 | $79 | $199 |
| Price yearly (2 months free) | $290 | $790 | $1,990 |
| Audio hours a month | 6 (360 min) | 20 (1,200 min) | 50 (3,000 min) |
| Longest episode | 2 h | 3 h | 4 h |
| Shows | 1 | 5 | 25 |
| Seats | 1 | 3 | 10 |
| Audiograms a month | 20 | 50 | 150 |
| Regenerations a month | 25 | 50 | 100 |
| RSS auto-import | Yes | Yes | Yes |
| Public pages and embed | Yes, with "Made with Echo" badge | Yes, badge optional | Yes, badge optional |
| 7-day trial | 2 audio hours, 5 audiograms, 10 regenerations | same | same |

- Generating the full asset pack for an episode is included in its audio hours; it is not a separate count.
- Upgrades apply at once (Customer Portal, prorated). Downgrades apply at period end. Unused hours do not roll over.
- Over the limit: the server returns 402 \`limit_reached\` with a human message ("You have used 6 of 6 audio hours
  this month. Upgrade to Studio for 20, or wait until 1 Nov."). RSS imports still land as \`imported\`.
- The meter in the sidebar turns amber under 20% left and coral under 5% (DESIGN_SYSTEM.md meter rule). An email
  goes to the owner at 80% (once per month).
- Mirror the numbers in \`lib/plans.ts\` for display only. The SQL function is the source of truth.

## 11. Integrations, in the order you build them

### 11.1 Upload (M3)
- TUS resumable upload to \`episode-audio/<workspace_id>/<episode_id>.<ext>\`, 6 MB chunks, \`tus-js-client\`.
- Accept \`audio/mpeg\`, \`audio/mp4\`, \`audio/x-m4a\`, \`audio/wav\`, \`audio/x-wav\`, \`audio/aac\`, \`video/mp4\`,
  \`video/quicktime\`. 1 GB file limit (raise Storage > Settings > Upload file size limit on Pro).
- Before upload, the browser reads the duration with a hidden \`<audio>\` element and saves
  \`reported_duration_sec\`. The server does not trust it (section 12.4).

### 11.2 RSS feeds (M4)
- The host pastes a feed URL on the show. \`ech-rss-poll\` with \`mode: 'preview'\` fetches it once and returns
  the show title, artwork and the latest 20 items so the host can confirm. Saving sets \`rss_url\`.
- Every 15 minutes the poll runs for every show with \`rss_url\`, sending \`If-None-Match\` and \`If-Modified-Since\`.
  304 means nothing new. New \`<item>\` (by \`<guid>\`, fallback enclosure URL) with an audio \`<enclosure>\` becomes
  an episode with \`source = 'rss'\`, \`status = 'imported'\`, \`enclosure_url\`, title, episode number,
  \`reported_duration_sec\` from \`itunes:duration\`.
- On first connect, only the newest item is imported (so a 300 episode back catalogue does not burn the plan).
  The UI offers "Import older episodes" with a picker.
- If \`auto_process\` is on and the plan has hours left, the poll enqueues processing at once.
- Parsing: \`npm:fast-xml-parser\`, handle \`itunes:\` and \`podcast:\` namespaces, CDATA, HTML in descriptions
  (strip to text before it reaches Claude).

### 11.3 Transcription: AssemblyAI (M3)
- \`POST https://api.assemblyai.com/v2/transcript\` with header \`authorization: <key>\` (no "Bearer").
- Body: \`audio_url\` (a 6 hour signed Supabase URL for uploads, or the enclosure URL for RSS),
  \`speech_models: ["universal-3-pro", "universal-2"]\` [verify the current model ids, Universal-3.5 Pro may have its
  own id], \`speaker_labels: true\`, \`language_detection: true\`, \`keyterms_prompt\` (show name, host and guest
  names, up to 20 terms) [verify field name], \`webhook_url\`, \`webhook_auth_header_name: 'x-echo-webhook'\`,
  \`webhook_auth_header_value: <ASSEMBLYAI_WEBHOOK_SECRET>\`.
- Do not use AssemblyAI's own \`auto_chapters\` or summarisation: Claude does that, and some AssemblyAI pages warn
  that these features do not work with the newest model [verify].
- The webhook only says "done". The worker then calls \`GET /v2/transcript/{id}\` and stores \`text\`,
  \`utterances\` (speaker, start, end, text), \`words\` (text, start, end, speaker, confidence) and
  \`audio_duration\`.
- Price (Oct 2026): Universal-3.5 Pro async $0.21 per hour, speaker labels +$0.02 per hour, so $0.23 per hour.
  $50 free credit. Deepgram Nova-3 batch is $0.0043 to $0.0048 a minute plus diarisation [verify], about $0.38 an
  hour with speakers, so AssemblyAI wins for recordings.

### 11.4 Writing: Claude API (M4)
- Model \`claude-sonnet-5-5\` through \`npm:@anthropic-ai/sdk\`. $2 per million input tokens, $10 per million output,
  cache reads $0.20, 5-minute cache writes $2.50 [verify on platform.claude.com pricing].
- Structured output with \`output_config: { format: { type: 'json_schema', schema } }\` and a zod check after.
  Check the structured outputs docs for the exact field names before writing the helper [verify].
- The transcript goes in a cached block (\`cache_control: { type: 'ephemeral' }\`) so calls 2 and 3 read it cheaply.
- Prompts and schemas: section 14.

### 11.5 Audiograms: Remotion Lambda (M6)
- A \`remotion/\` folder in the repo holds two compositions: \`ClipAudio\` (audio only, the source trimmed to the
  clip) and \`Audiogram\` (1080x1920, 30 fps, waveform + captions + artwork + title). Start from the official
  \`remotion-dev/template-audiogram\` and adapt it.
- Deploy once with \`npx remotion lambda functions deploy\` and \`npx remotion lambda sites create\` [verify the exact
  commands in the Remotion Lambda setup docs]. Region \`us-east-1\`, 2048 MB memory.
- \`ech-render-audiogram\` calls \`renderMediaOnLambda\` from \`npm:@remotion/lambda-client\` (the package Remotion's
  Supabase guide uses; pin it to the same version as \`remotion\` in package.json).
- Step 1: \`ClipAudio\` with \`codec: 'wav'\`, input props \`{ src, startMs, endMs }\`. Output is a 30 to 60 s WAV
  (about 5 MB), because \`useWindowedAudioData\` and the waveform helpers need a WAV or a small file
  [verify audio-only codecs on Lambda].
- Step 2: \`Audiogram\` with \`codec: 'h264'\`, input props \`{ audioUrl (presigned step 1 output), captions,
  artworkUrl, title, showName, accentHex, style }\`, \`framesPerLambda: 300\` (6 Lambdas for 60 s).
- Both renders pass \`webhook: { url: <ech-remotion-webhook URL>, secret: REMOTION_WEBHOOK_SECRET,
  customData: { audiogram_id, step } }\`. Remotion signs the body with HMAC-SHA512 in \`X-Remotion-Signature:
  sha512=<hex>\`.
- Captions: AssemblyAI words inside the clip window, converted to the \`@remotion/captions\` Caption type
  (\`text\`, \`startMs\`, \`endMs\`, \`timestampMs\`, \`confidence\`), times relative to the clip start.
- Licence: Remotion is free for companies of up to 3 people. From the 4th person you need the Company Licence
  ("Automators" is $0.01 per render with a $100 a month minimum [verify]).
- AWS cost: Lambda arm64 is about $0.0000133 per GB-second [verify]. Measure one real render with
  \`estimatePrice()\` and the \`costs\` field Remotion returns, and update section 19. Budget $0.06 per audiogram
  (both steps, S3 and transfer) until you have measured it.

### 11.6 Email: Resend (M2)
Sent from \`episodes@getecho.app\` [use your own domain]. Templates in section 15.
`
