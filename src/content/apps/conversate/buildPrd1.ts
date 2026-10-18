// Conversate build PRD (PRD.md), part 1: product, architecture, routes, data model, state machines.

export const buildPrd1 = `# Conversate: build PRD

Version 1.0, October 2026. Download this file, save it as \`PRD.md\` in the root of your project folder,
and reference it in Claude Code with \`@PRD.md\`. Claude Code reads it before every task. Where this file
and your instinct disagree, this file wins. The look and feel lives in \`@DESIGN.md\` (which builds on
\`@DESIGN_SYSTEM.md\`), the marketing page in \`@LANDING.md\`.

## 0. How to use this document

- Read sections 1 to 6 once so you know what you are building, for whom, and why it is shaped this way.
- Sections 7 to 19 are the spec. Claude Code builds from them.
- Section 25 lists the build milestones. Do them in order. A milestone is done when its acceptance
  tests in section 24 pass. Do not start the next one before that.
- Every new Claude Code session, start with: "Read @PRD.md and @DESIGN.md. We are on milestone N.
  Plan first, then wait for my OK."
- Use Opus at high effort (\`/model opus\`, \`/effort high\`) for anything that touches the schema, RLS,
  the widget's public edge functions, Stripe, or prompt-injection rules. Medium is fine for UI layout.
- Keep a file called \`DECISIONS.md\`. Every time you or Claude Code choose something this PRD does not
  cover, write one line: date, decision, reason. Future you will thank you.

## 1. Problem

Small software companies and online shops answer the same 40 questions every week. "How do I reset my
password?" "Do you ship to Canada?" "Can I pay yearly?" The answers are already on their website, buried
across a pricing page, a FAQ and three blog posts. Nobody has written a proper help centre because it
takes a week, and nobody has set up an AI agent because Intercom charges about $0.99 per AI resolution
on top of seats, and the cheaper tools still need someone to write the articles first.

So the founder answers by hand, in a shared Gmail inbox, at 11pm.

Conversate fixes the whole chain in one sitting:

1. Paste your website. Conversate crawls it and drafts a real help centre (categories, articles,
   search) in about five minutes.
2. Paste one script tag. A chat widget answers visitors from that help centre, shows its sources, and
   says "I am not sure" instead of making things up.
3. Anything the AI cannot answer lands in a shared inbox where a human picks it up, replies live, or by
   email if the visitor has gone.
4. Every unanswered question becomes a "content gap" with a one-click draft article, so the AI gets
   better every week.

## 2. Ideal customer (ICP)

| Segment | Size | Why they buy | Where they are |
|---|---|---|---|
| Bootstrapped B2B SaaS | 1 to 20 staff, $5k to $200k MRR | Support eats the founder's evenings. No help centre yet, or a stale Notion page | Indie Hackers, X, r/SaaS, Product Hunt |
| Shopify and DTC stores | $20k to $500k a month in sales | "Where is my order?", sizing, shipping and returns, 50 times a day | Shopify app store reviews, r/shopify, Facebook groups |
| Web and marketing agencies | 2 to 30 staff | Resell "AI help desk" to clients, one workspace per client | Webflow Experts, Clutch, agency Slack groups |

Buyer: the founder or head of support. User: 1 to 10 agents. Budget line: whatever they pay Intercom,
Crisp, Help Scout or Zendesk today, or "the time I spend in Gmail".

What they say on calls (use these words in copy): "We get the same questions every day." "I don't have
time to write docs." "Intercom's bill doubled." "I tried a chatbot, it made up a refund policy."

## 3. The one core job

> "Turn my website into a help centre and an AI agent that answers my customers correctly, and hand
> me the ones it can't."

Everything in v1 serves this. If a feature does not make answers more correct, faster, or easier to
hand to a human, it is out of scope (section 23).

## 4. User stories

### Owner (founder)
- As an owner, I sign up, answer six onboarding questions and paste my website so that a draft help
  centre exists before I have finished my coffee.
- As an owner, I review the drafted articles, edit two, and click "Publish all" so that the public help
  centre at \`/acme/help\` goes live.
- As an owner, I brand the widget (icon, colour, greeting, position, launcher label, avatar, office
  hours message) and see a live preview so that it looks like part of my site.
- As an owner, I copy one \`<script>\` tag and follow the steps for my platform (plain HTML, Webflow,
  WordPress, Shopify, Framer, Next.js) so that the widget is live in under ten minutes.
- As an owner, I add allowed domains so that nobody can put my widget on their site and burn my answers.
- As an owner, I invite my two support people by email as agents so that we share one inbox.
- As an owner, I see my usage meter (AI answers this month out of my cap) before I reach the cap.
- As an owner, I open Analytics and see volume, AI resolution rate, first response time and CSAT.

### Agent (support person)
- As an agent, I see every conversation in one Inbox with filters: Mine, Unassigned, Open, Pending,
  Snoozed, Closed, Flagged, Low confidence.
- As an agent, I open a conversation and see the visitor's messages, the AI's answers with sources and
  confidence, internal notes, tags and the assignee.
- As an agent, I click "Suggest reply" and get a draft built from our knowledge and the thread, which I
  edit and send.
- As an agent, I type \`/refund\` to insert a canned reply.
- As an agent, my reply appears in the visitor's widget instantly. If they have left, it goes by email
  and their email reply comes back into the same conversation.
- As an agent, I get an email when a conversation is assigned to me, flagged, or the AI was not confident.

### Visitor (customer on the owner's website)
- As a visitor, I click the launcher, ask "Can I change my plan mid-month?" and get an answer in under
  four seconds with links to the articles it came from.
- As a visitor, when the AI is not sure, I see "Talk to a human" and can leave my email.
- As a visitor, I rate the conversation (1 to 5) when it closes.
- As a visitor, I can browse \`/acme/help\`, search it, and read articles without chatting.

## 5. Architecture

### 5.1 Diagram

\`\`\`
 CUSTOMER WEBSITE (acme.com)                       CONVERSATE (your Vercel app)
 +-------------------------------+                 +--------------------------------------+
 | <script src=".../w.js"        |  1 config,      | Next.js App Router                   |
 |   data-key="cv_pub_..." async>|    session ---->| /app/*      agent app (auth)         |
 |                               |    (Origin =    | /[ws]/help  public help centre (SSR) |
 |  w.js loader (vanilla, 5 KB)  |     acme.com)   | /embed/[key] widget iframe UI        |
 |   shadow DOM launcher button  |                 | /api/*      route handlers           |
 |   iframe --------------------------------------> +-----------------+--------------------+
 |   postMessage bridge          |                                   |
 +-------------------------------+                                   | supabase-js
          |  2 messages (visitor JWT, Origin = app domain)            v
          v                                         +--------------------------------------+
 +--------------------------------------------------| SUPABASE                             |
 | EDGE FUNCTIONS (Deno)                            |  Postgres + RLS + pgvector (HNSW)    |
 |  public:  widget-config  widget-session          |  Auth (owners, admins, agents)       |
 |           widget-message                         |  Storage: widget-assets, attachments |
 |  agents:  onboard-crawl  agent-reply             |  Realtime: inbox (postgres_changes)  |
 |           suggest-reply  invite-member           |            widget (broadcast topic)  |
 |           draft-articles (one-click)             |  pg_cron: workers every minute       |
 |  workers: build-knowledge  draft-articles  notify|                                      |
 |  webhooks: build-knowledge (Firecrawl)           +--------------------------------------+
 |            notify/inbound (Resend)               |
 +------+----------+-----------+-----------+--------+
        |          |           |           |
        v          v           v           v
   Firecrawl   Voyage AI   Claude API    Resend          Stripe (via /api/stripe/webhook)
   crawl v2    voyage-3.5  haiku-5-5     send + inbound  trials, plans, portal
               embeddings  sonnet-5-5
\`\`\`

### 5.2 Who does what

| Piece | Job | Never does |
|---|---|---|
| \`w.js\` loader | Draws the launcher in a shadow DOM, calls widget-config and widget-session from the customer page (so the browser sends the real Origin), opens the iframe, passes the visitor token in with postMessage | Hold secrets, call Claude, read tables |
| \`/embed/[key]\` iframe | The chat UI. Calls widget-message, listens on the conversation's broadcast topic | Trust messages from any window except its parent with the expected origin |
| Public edge functions | Check the public key, Origin, visitor JWT, plan cap and rate limits, then do the work with the secret key | Accept a user session, return other workspaces' data |
| Agent edge functions | Check the user with \`getClaims()\`, membership and role, then act | Trust a workspace id from the body without checking membership |
| Workers (pg_cron) | Drain the \`jobs\` table: crawl results, embeddings, drafts, emails | Run longer than 120 seconds per batch |
| Next.js | Agent app, public help centre (server rendered, read with the secret key, published rows only), Stripe | Call Firecrawl, Voyage or Claude directly |

### 5.3 Decisions and trade-offs (read these, they explain the build)

1. **Embeddings: Voyage \`voyage-3.5\` at 1024 dimensions, not Supabase \`gte-small\`.**
   \`gte-small\` runs inside edge functions for free and gives 384 numbers per chunk, but it is English
   only, reads at most 512 tokens per chunk, and embedding a 300 page site inside an edge function eats
   the CPU time limit and needs many worker runs. \`voyage-3.5\` is multilingual (a Shopify store in
   Germany gets German questions), takes long chunks, scores clearly better on retrieval, and costs
   $0.06 per million tokens with the first 200 million free per account. A whole 300 page site is about
   450,000 tokens: three cents. Confidence scores depend on retrieval quality, so this is the single
   best place to spend. Trade-off: one more API key and an outbound call per visitor question (about
   80 ms). Fallback: if Voyage is down, \`widget-message\` answers "I could not check our help centre
   right now" and offers a human. It never answers without sources.
2. **One shared \`kb_chunks\` table for every workspace, filtered by \`workspace_id\`, HNSW index.**
   Simplest thing that works at 1,000 customers (about 1,000 x 1,500 chunks = 1.5 million rows, about
   7 GB with the index). \`match_chunks\` turns on pgvector's iterative scan so a small workspace still
   gets 6 hits when the nearest neighbours belong to bigger tenants. **What breaks first:** RAM. When
   the HNSW index no longer fits in memory, search slows from 20 ms to 300 ms+. Fix: move to a bigger
   compute add-on (Small at about 100 customers, Medium at about 400), then halfvec (16-bit) vectors,
   then partition \`kb_chunks\` by workspace hash.
3. **The widget is a shadow DOM launcher plus an iframe panel.** The launcher must load instantly and
   never be broken by the customer's CSS, so it lives in a shadow root. The chat panel is an iframe on
   our domain so React, fonts and our CSP stay ours. Trade-off: two origins. The loader calls the
   public config and session functions from the customer page (real Origin header), and passes the
   visitor token to the iframe with \`postMessage\` (target origin pinned to our app URL).
4. **Visitor auth is our own short-lived JWT, not Supabase Auth.** Visitors never sign up. \`widget-session\`
   signs an HS256 token (24 hours) with \`WIDGET_JWT_SECRET\` that names the visitor, workspace and the
   origin it was issued for. Every widget call carries it.
5. **Live replies to visitors use a Realtime broadcast topic, not database changes.** The visitor has
   no Supabase login, so RLS-based \`postgres_changes\` cannot work for them. Each conversation has an
   unguessable \`realtime_topic\` (48 hex characters) that only that visitor receives. \`agent-reply\`
   sends to it with Realtime's REST broadcast endpoint. The widget only subscribes while a human is
   involved (mode \`human\` or a handoff was requested) and unsubscribes after 10 minutes idle. That keeps
   peak Realtime connections far below the 500 included on Pro. **What breaks first:** peak connections
   on a busy Black Friday. Fix: Realtime is $10 per 1,000 extra peak connections, or shorten the idle timeout.
6. **AI answers come back whole, not streamed.** Structured JSON (answer, sources, confidence) is what
   makes "show sources" and "not sure" reliable. Haiku 5.5 answers in about 1.5 to 3 seconds, and the
   widget shows a typing indicator. Agent replies are instant through Realtime.
7. **Every slow thing is a job.** Crawls, chunking, embeddings, drafting and emails are rows in \`jobs\`
   with a status, attempts, \`run_after\` and an idempotency key. pg_cron calls the workers every minute.
   Retries back off 30 s, 1 min, 2 min, 4 min, 8 min, then the job is marked \`dead\` and shown in the UI.
8. **Caps are enforced on the server before the paid call.** \`widget-message\` reads the plan cap and the
   meter, then calls Voyage and Claude, then writes the meter row with an idempotency key. At 80% of the
   cap the owner gets an email and a banner. At 100% the widget switches to "Leave us your email" mode.
9. **Email replies come back in through Resend Inbound.** Each conversation gets a reply address
   \`reply+<token>@in.<yourdomain>\`. Resend posts \`email.received\` to \`notify/inbound\`, which verifies
   the Svix signature, fetches the body from Resend's Receiving API, strips quoted text, and appends it
   as a visitor message. Resend marks receiving as newer than sending: test it early [verify].

## 6. Glossary

| Word | Meaning |
|---|---|
| Workspace | One customer company. Everything belongs to exactly one workspace |
| Member | A person in a workspace: owner, admin or agent |
| Source | A website to crawl (\`kb_sources\`) |
| Page | One crawled page (\`kb_pages\`) |
| Article | A help-centre article (\`kb_articles\`), drafted by Claude or written by hand |
| Chunk | About 500 tokens of a page or article plus its embedding (\`kb_chunks\`) |
| Visitor | A person on the customer's website, no login |
| Conversation | A thread between a visitor and the workspace |
| Mode | \`ai\` (the AI is answering) or \`human\` (a person has taken over) |
| Confidence | 0 to 1. How sure we are the AI answer is right. Below the threshold (default 0.55) we hand off |
| Content gap | A question the knowledge base could not answer. Shown on the Knowledge page with "Draft article" |
| Public key | \`cv_pub_...\`. Goes in the script tag. Identifies a workspace, grants nothing on its own |

## 7. Routes and pages

### 7.1 Sidebar (agent app)

One level, no nested menus. Top group: logo and workspace switcher, then the core pages. Bottom group,
always in this order: Documentation, Help, Billing, Settings.

| Order | Label | Route | Icon (Phosphor) | Who sees it | Badge |
|---|---|---|---|---|---|
| 1 | Inbox | \`/app/inbox\` | ChatsCircle | everyone | count of open + unassigned |
| 2 | Help Centre | \`/app/help-centre\` | BookOpenText | everyone | none |
| 3 | Knowledge | \`/app/knowledge\` | Brain | everyone | count of open content gaps |
| 4 | Widget | \`/app/widget\` | ChatTeardropDots | owner, admin | "Not installed" dot until first visitor |
| 5 | Analytics | \`/app/analytics\` | ChartLineUp | everyone | none |
| 6 | Team | \`/app/team\` | UsersThree | everyone (invite: owner, admin) | none |
| bottom | Documentation | \`/docs\` (opens in new tab) | BookBookmark | everyone | none |
| bottom | Help | \`/acme-conversate/help\` (your own help centre) | Lifebuoy | everyone | none |
| bottom | Billing | \`/app/billing\` | CreditCard | owner only | "Trial: 4 days" pill |
| bottom | Settings | \`/app/settings\` | GearSix | everyone (some tabs owner/admin) | none |

Above the bottom group sits the usage meter: "AI answers 1,204 / 1,500" (DESIGN.md section 6).

### 7.2 Every route

| Route | Access | Purpose |
|---|---|---|
| \`/\` | public | Landing page (\`@LANDING.md\`), with the Conversate widget installed on itself |
| \`/pricing\` | public | Same pricing section as the landing page, plus the full comparison table |
| \`/docs\`, \`/docs/[slug]\` | public | Your own product docs (install guides per platform, limits, FAQ) |
| \`/login\`, \`/signup\`, \`/forgot\`, \`/reset\` | public | Supabase Auth, email + password and Google. Confirm email off |
| \`/invite/[token]\` | public, then auth | Shows workspace name and role, signs in or up, calls \`accept_invitation\` |
| \`/onboarding\` | auth, no workspace or onboarding_step < 6 | Six-step flow (section 8) |
| \`/paywall\` | auth | Shown when \`has_active_access\` is false. Owner sees plans, members see "Ask your owner" |
| \`/app\` | member | Redirects to \`/app/inbox\` |
| \`/app/inbox\` | member, access | Three panes: filters + list, thread, details |
| \`/app/inbox/[conversationId]\` | member, access | Same page with the thread open (deep link from emails) |
| \`/app/help-centre\` | member | Articles table, categories, status filter, "New article" |
| \`/app/help-centre/articles/[id]\` | member | Article editor (Markdown with preview), category, slug, status, sources it came from |
| \`/app/help-centre/categories\` | member | Reorder, rename, icon |
| \`/app/knowledge\` | member | Tabs: Sources, Pages, Content gaps, Test the AI |
| \`/app/widget\` | owner, admin | Tabs: Branding (live preview), Install (script + platform steps), Domains, Behaviour (threshold, email capture, suggested questions, office hours) |
| \`/app/analytics\` | member | Range picker, 4 stat tiles, volume chart, AI resolution chart, top questions, CSAT list |
| \`/app/team\` | member | Members table, pending invites, Invite dialog (owner/admin) |
| \`/app/billing\` | owner | Current plan, usage meters, change plan (Checkout), manage (Customer Portal) |
| \`/app/settings\` | member | Tabs: Profile, Notifications, Workspace (owner/admin), Canned replies, Tags, Danger zone (owner) |
| \`/[workspaceSlug]/help\` | public | Help centre home: search box, categories grid, popular articles |
| \`/[workspaceSlug]/help/[categorySlug]\` | public | Category page |
| \`/[workspaceSlug]/help/a/[articleSlug]\` | public | Article page with "Was this helpful?" and "Still need help? Chat with us" |
| \`/[workspaceSlug]/help/search?q=\` | public | Search results (full-text, then semantic if under 3 hits) |
| \`/embed/[publicKey]\` | public, framed | Widget panel. CSP \`frame-ancestors\` set to the workspace's allowed domains |
| \`/w.js\` | public | The loader, served from \`public/w.js\`, cached 5 minutes, immutable versioned copy at \`/w/v1.js\` |
| \`/api/stripe/checkout\` | owner | Creates a Checkout session (shared Stripe phase) |
| \`/api/stripe/portal\` | owner | Customer Portal session |
| \`/api/stripe/webhook\` | Stripe | Signature-verified webhook, writes \`subscriptions\` |
| \`/api/help/feedback\` | public | Article helpful yes/no and view count, rate limited per IP |
| \`/api/help/search\` | public | Help centre search, rate limited per IP |
| \`/api/health\` | public | Returns \`{ ok: true }\` for uptime checks |

Reserved workspace slugs (refuse in onboarding): \`app\`, \`api\`, \`docs\`, \`embed\`, \`login\`, \`signup\`,
\`pricing\`, \`invite\`, \`onboarding\`, \`paywall\`, \`w\`, \`help\`, \`admin\`, \`static\`, \`_next\`.

### 7.3 Server-side access rule (every \`/app\` page)

\`\`\`
1. getClaims() -> no claims: redirect /login
2. profiles.current_workspace_id -> none: redirect /onboarding
3. workspace_members row for (workspace, user) -> none: pick another workspace or /onboarding
4. workspaces.onboarding_step < 6 -> redirect /onboarding
5. rpc has_active_access(workspace) -> false: redirect /paywall
6. render with { user, workspace, role, limits }
\`\`\`

Put this in \`lib/workspace.ts\` as \`requireWorkspace()\` and call it at the top of the \`/app\` layout.
Never cache authenticated pages (\`export const dynamic = 'force-dynamic'\` on the layout).

## 8. Onboarding (the five-minute demo)

Six steps in one morphing card (DESIGN.md section 7). State lives in \`workspaces.onboarding_step\`,
so a refresh resumes where you left off.

| Step | Asks | Writes | Notes |
|---|---|---|---|
| 1 Company | Company name, workspace URL slug (auto from name, editable, checked live), your name | \`create_workspace()\`, \`profiles.full_name\` | Slug rules: 3 to 40 chars, a to z, 0 to 9, hyphen; not reserved |
| 2 Website | Website URL, support email | \`workspaces.website_url, support_email\`, \`allowed_domains\` (done by \`create_workspace\`) | Show "We will read up to 150 pages during your trial" |
| 3 What you sell | One or two sentences, plus a select: SaaS, Online store, Agency, Other | \`workspaces.sells\` | Placeholder: "We sell scheduling software for dental clinics." |
| 4 Tone | Friendly, Professional, Playful, Concise (cards with a sample answer each) | \`workspaces.tone\` | Sample answers are static copy |
| 5 Top questions | Up to 8 questions your customers ask most (3 pre-filled suggestions from Claude after step 3, editable) | \`workspaces.top_questions\`, \`widget_settings.suggested_questions\` (first 3) | These shape the drafted articles |
| 6 Build | "Build my help centre" button, then live progress: Crawling 42 pages, Reading, Drafting 18 articles, Done | calls \`onboard-crawl\`, watches \`kb_sources\` and \`jobs\` | On done: show article list with "Publish all", then "Install the widget" |

Step 6 progress copy (in order, each line gets a tick):
1. "Reading acme.com" (Firecrawl crawl running, live count of pages found)
2. "Learning 42 pages" (chunks embedded / total)
3. "Planning your help centre" (Claude proposes categories)
4. "Writing 18 articles" (count up as drafts land)
5. "Your help centre is ready"

If the crawl fails (site blocks bots, 0 pages): show "We could not read acme.com. Paste up to 10 page
URLs instead, or skip and write articles yourself." with a textarea and a Skip button.

## 9. Data model

The full SQL is the migration in the kit (\`supabase/migrations/0001_conversate.sql\`). Summary:

| Table | Key columns | Notes |
|---|---|---|
| \`profiles\` | id (= auth user), full_name, avatar_path, current_workspace_id, notify_email | Created by trigger on signup |
| \`workspaces\` | owner_id, name, slug (unique), website_url, support_email, sells, tone, top_questions[], public_key, onboarding_step, help_centre_enabled | One owned workspace per user in v1 |
| \`workspace_members\` | (workspace_id, user_id) pk, role owner/admin/agent | Owner cannot be removed or demoted (trigger) |
| \`invitations\` | workspace_id, email, role, token_hash, status, expires_at (7 days) | Token only ever in the email link |
| \`widget_settings\` | workspace_id pk, brand_hex, greeting, launcher_label, position, icon_path, avatar_path, bot_name, suggested_questions[], email_capture, office_hours jsonb, offline_message, confidence_threshold, show_branding | Created with the workspace |
| \`allowed_domains\` | workspace_id, domain (\`acme.com\` or \`*.acme.com\` or \`localhost\`) | Checked on every widget call |
| \`kb_sources\` | workspace_id, kind, url, include/exclude paths, status, firecrawl_job_id, page_limit, pages_found, pages_done, chunks_count, error | One row per crawl target |
| \`kb_pages\` | source_id, url, title, markdown, content_hash, status | Unique (source_id, url). Unchanged hash = skip re-embedding |
| \`kb_categories\` | workspace_id, name, slug, description, icon, position | |
| \`kb_articles\` | category_id, title, slug, summary, body_md, status draft/published/archived, ai_drafted, source_page_ids[], gap_id, views, helpful_yes/no, embedded_hash, search tsvector | Published articles are chunked and embedded too |
| \`kb_chunks\` | workspace_id, source_type page/article, page_id or article_id, url, title, content, token_count, embedding vector(1024) | HNSW cosine index |
| \`content_gaps\` | workspace_id, question, question_hash, example_message_ids[], times_asked, status, article_id | Upserted by \`record_content_gap()\` |
| \`visitors\` | workspace_id, anon_id (from the loader), email, name, last_seen_at, last_page_url | Unique (workspace_id, anon_id) |
| \`conversations\` | visitor_id, status, mode, channel, assignee_id, realtime_topic, reply_token_hash, counters, low_confidence, flagged, handoff_requested_at, ai_resolved, first_response_at, snoozed_until | Counters kept by the messages trigger |
| \`messages\` | conversation_id, role visitor/ai/agent/system, author_id, body, sources jsonb, confidence, needs_human, attachments, delivered_via, client_msg_id | Written only by edge functions |
| \`notes\` | conversation_id, author_id, body | Internal, never sent to visitors |
| \`tags\`, \`conversation_tags\` | name, hue 0 to 7 | Free labels hash to the first seven hues |
| \`assignments\` | conversation_id, assignee_id, assigned_by | History. Current assignee is on conversations |
| \`canned_replies\` | title, shortcut, body | \`/shortcut\` in the composer |
| \`flags\` | conversation_id, message_id, source ai/visitor/agent, reason, resolved_at | |
| \`notifications\` | user_id (null = everyone), kind, conversation_id, title, body, read_at, emailed_at | Bell menu + emails |
| \`csat\` | conversation_id (unique), score 1 to 5, comment | |
| \`jobs\` | kind, status, payload, idempotency_key, attempts, max_attempts, run_after, locked_at, last_error | Claimed with \`claim_jobs()\`, finished with \`finish_job()\` |
| \`rate_limits\` | key, window_start, hits | Used by \`try_rate_limit()\` |
| \`usage_ledger\` | workspace_id, kind, quantity, cost_micros, ref_id, idempotency_key | The meter. Read by \`usage_this_month()\` |
| \`email_log\` | to_email, kind, subject, dedupe_key (unique), resend_id, status | Insert before sending, so a retry never double-sends |
| \`subscriptions\`, \`stripe_events\`, \`plan_prices\` | shared billing tables | The owner's subscription grants the whole workspace |

Database functions the app calls: \`create_workspace\`, \`accept_invitation\`, \`rotate_public_key\`,
\`assign_conversation\`, \`has_active_access\`, \`current_plan\`, \`plan_limits\`, \`usage_summary\`,
\`seats_used\`, \`workspace_stats\`. Edge functions only (service role): \`match_chunks\`, \`enqueue_job\`,
\`claim_jobs\`, \`finish_job\`, \`try_rate_limit\`, \`record_content_gap\`, \`article_counter\`, \`housekeeping\`.

## 10. State machines

### 10.1 Knowledge source (\`kb_sources.status\`)

\`\`\`
 queued --(onboard-crawl started Firecrawl)--> crawling
 crawling --(Firecrawl crawl.completed webhook, or poller sees completed)--> processing
 crawling --(crawl.failed, or 0 pages, or 30 min timeout)--> failed
 processing --(all pages chunked + embedded, build-knowledge done)--> ready
 processing --(job dead after 5 attempts)--> failed
 ready | failed --(Re-crawl button, max 3 per source per day)--> queued
\`\`\`

### 10.2 Page (\`kb_pages.status\`)

\`\`\`
 new --(split into chunks)--> chunked --(embeddings stored)--> embedded
 new --(content_hash same as last crawl)--> skipped
 new | chunked --(5 failed attempts)--> failed
\`\`\`

### 10.3 Article (\`kb_articles.status\`)

\`\`\`
 draft --(Publish)--> published --(Unpublish)--> draft
 draft | published --(Archive)--> archived --(Restore)--> draft
 on publish or edit while published: enqueue embed_article (idempotency key article:<id>:<hash>)
 on unpublish or archive: delete its chunks
\`\`\`

### 10.4 Conversation (\`status\` x \`mode\`)

\`\`\`
 STATUS
   open --(agent: Mark pending, waiting on visitor)--> pending
   open | pending --(agent: Snooze until T)--> snoozed --(housekeeping at T)--> open
   open | pending | snoozed --(agent or visitor: Close)--> closed
   closed | pending | snoozed --(new visitor message)--> open   (messages trigger)
   open, mode ai, quiet 24h, no handoff, not flagged --(housekeeping)--> closed, ai_resolved = true

 MODE
   ai --(visitor clicks "Talk to a human", or confidence < threshold and visitor accepts)--> ai + handoff_requested_at set
   ai --(any agent reply)--> human   (messages trigger)
   human --(agent: "Hand back to AI")--> ai
\`\`\`

While mode is \`human\`, \`widget-message\` stores visitor messages and notifies the assignee (or the team)
but does not call Claude.

### 10.5 Job (\`jobs.status\`)

\`\`\`
 queued --(claim_jobs, run_after <= now)--> running
 running --(finish_job ok)--> succeeded
 running --(finish_job error, attempts < max)--> queued, run_after = now + 30s x 2^(attempts-1), max 1h
 running --(finish_job error, attempts = max)--> dead
 running --(locked for 15 min, worker crashed)--> queued
\`\`\`

### 10.6 Invitation (\`invitations.status\`)

\`\`\`
 pending --(accept_invitation with matching email and a free seat)--> accepted
 pending --(admin: Revoke)--> revoked
 pending --(7 days, housekeeping)--> expired
\`\`\`

### 10.7 Subscription (from Stripe)

\`\`\`
 (none) --(Checkout with 7-day trial)--> trialing --(first invoice paid)--> active
 trialing | active --(payment fails)--> past_due --(retries fail)--> canceled | unpaid
 active --(cancel at period end)--> active (cancel_at_period_end) --(period ends)--> canceled
 Access = status in ('trialing', 'active'). Data is kept; the widget shows the offline form when access ends.
\`\`\`
`
