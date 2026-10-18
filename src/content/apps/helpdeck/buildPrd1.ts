// Helpdeck build PRD, part 1: product, architecture, routes, data model, state machines.

export const buildPrd1 = `# Helpdeck: build PRD

Save this file as \`PRD.md\` in the root of your project folder. In Claude Code, refer to it with
\`@PRD.md\` (for example: "Read @PRD.md section 9 and build hd-answer"). Save the design PRD next to
it as \`DESIGN.md\`, the base design system as \`DESIGN_SYSTEM.md\` and the landing PRD as \`LANDING.md\`.
Every section number below is stable, so later prompts in the playbook can point at them.

## 0. How to read this document
- Sections 1 to 4 say what we build and for whom. Read them once.
- Sections 5 to 8 are the skeleton: architecture, routes, data, states. Claude Code builds from these.
- Sections 9 to 13 are the contracts: every edge function, every prompt, every limit, every email.
- Sections 14 to 19 are how we check it: analytics, security, acceptance tests, milestones.
- Anything marked **[verify]** is a third-party fact that could not be confirmed when this was written
  (Oct 2026). Check it on the vendor's page before relying on it.

## 1. Problem
Small SaaS companies, agencies and online shops answer the same 30 questions every week by email:
"How do I export my invoices?", "Can I change my billing date?", "Do you have an API?". The answers are
already on their docs site or help centre. Customers do not read it, so the founder copies and pastes
the same paragraphs for hours every month.

The options today are poor for a team of one to five people:
- **Intercom Fin, Zendesk AI:** live inside a full helpdesk with per-seat pricing, plus a charge per AI
  resolution (Intercom lists about $0.99 per resolution [verify]). Setup takes days.
- **Generic chatbot builders:** quick to set up but often answer confidently from nothing, which is worse
  than no answer when the question is about refunds or pricing.
- **Doing nothing:** 300 tickets a month at 6 minutes each is 30 hours of the founder's month.

Helpdeck is a chat bubble that learns a company's public docs in minutes, answers with a link to the page
it used, says "I'm not sure" when the docs do not cover the question, and hands those chats to the
owner's inbox with reply-to set to the customer.

## 2. Ideal customer (ICP)
- **Who:** founders and the one support person at SaaS products, digital product shops and agencies.
- **Size:** 1 to 20 staff. 50 to 2,000 support questions a month. No dedicated support tool yet, or a
  shared inbox (Gmail, Help Scout) they are happy with.
- **Has:** a public docs site, help centre, FAQ or pricing page. 10 to 1,000 pages.
- **Pays:** $49/month without asking anyone if it deflects even 20 percent of repeat questions.
- **Not for (v1):** companies whose answers need the customer's account data ("where is my order?"),
  regulated support (medical, legal advice) or teams who need live agent chat.

## 3. The one core job
"Paste my website URL, get a chat widget that answers from my docs with sources, and email me the ones
it cannot answer."

Activation (the moment a trial user is likely to pay) is: **first answer served on their own live site
from an allowed domain.** Everything in onboarding pushes towards that moment.

Activation path, shown as the 3-item checklist on /app:
1. Crawl your site (status 'ready' with at least 5 pages).
2. Ask a test question (one answer in the test panel).
3. Install the widget (first answer from an allowed domain, \`bots.first_seen_at\` set).

## 4. User stories
### Owner (logged in)
1. As an owner I paste \`https://docs.acme.com\` and see pages being read with a live count, so I know it works.
2. As an owner I ask test questions in a panel next to my pages before installing anything.
3. As an owner I copy one script tag and get exact steps for Webflow, WordPress, Shopify, Framer and HTML.
4. As an owner I set the bot name, greeting, brand colour, avatar and three suggested questions, and see a live preview.
5. As an owner I list the domains the widget may run on, so nobody else can put my bot on their site.
6. As an owner I get an email with the full transcript when a visitor asks for a human, and I reply from my inbox.
7. As an owner I read every conversation, see which pages each answer used, and filter to handoffs and low confidence.
8. As an owner I see a "Gaps" list of questions my docs do not cover, ranked by how often they are asked, and mark them fixed.
9. As an owner I click Re-crawl after editing my docs and only changed pages are re-learned.
10. As an owner I exclude a page (for example an old changelog) so the bot never uses it.
11. As an owner I see "1,240 of 2,000 answers used this month" before I hit the cap, and get an email at 80 percent.
12. As a Growth owner I run up to 3 bots (one per product or language) and switch between them in the sidebar.
13. As a Growth owner I get a weekly email listing the top docs gaps, grouped into topics.
14. As an owner I export conversations as CSV.
15. As an owner I manage my plan, card and invoices in Billing, and cancel without talking to anyone.

### Visitor (on the customer's site, never logged in)
16. As a visitor I click the bubble, see a greeting and three suggested questions, and get an answer in about 2 seconds.
17. As a visitor I see source chips under the answer and can open the page it came from.
18. As a visitor, when the bot is not sure, I see "Want a human to email you?" and leave my email in one field.
19. As a visitor I can write in my own language and get the answer in that language.
20. As a visitor on a phone the chat opens full screen and the keyboard does not cover the input.

### Prospect (landing page)
21. As a prospect I paste my own docs URL on the landing page, wait under a minute and chat with a bot trained on 15 of my pages.
22. As a prospect I click "Keep this bot: start free trial" and find the same bot in my new account.

## 5. Architecture

### 5.1 Diagram
\`\`\`
                         OWNER (browser, logged in)
                                   │
                    Next.js app on Vercel (App Router)
        /app, /bots/[botId]/*, /billing, /settings, /docs, /help
        │ Supabase client (publishable key + user JWT, RLS)
        │ server routes: /api/stripe/*, /api/widget/*, /api/export
        ▼
 ┌───────────────────────────── Supabase ──────────────────────────────┐
 │ Postgres + pgvector        Edge functions (Deno)         Storage      │
 │  workspaces, bots,          hd-crawl  ──────────┐        bot-avatars  │
 │  pages, chunks (1024d),     hd-firecrawl-webhook │        conversation-│
 │  conversations, messages,   hd-embed-worker  ◄── pg_cron  exports     │
 │  jobs, usage_ledger,        hd-answer  ◄── widget                     │
 │  email_log, doc_gaps        hd-handoff ◄── widget                     │
 │                             hd-demo    ◄── landing page               │
 │                             hd-digest  ◄── pg_cron                    │
 │                             hd-resend-webhook ◄── Resend              │
 └──────────────────────────────────────────────────────────────────────┘
        │                 │                     │                 │
   Firecrawl API     Voyage AI API        Claude API         Resend API
   (crawl + page     (voyage-3.5,         (claude-haiku-5-5, (handoff +
    webhooks)         1024 dims)           JSON output)       alerts)

 VISITOR on customer site
   <script src="https://helpdeck.app/w.js" data-bot="BOT_ID" async>
        │ draws bubble, fetches /api/widget/BOT_ID/config
        ▼
   iframe https://helpdeck.app/widget/BOT_ID   (CSP frame-ancestors = allowed domains)
        │ server mints a widget token (HMAC, 2 hours, bound to bot + host)
        ▼
   hd-answer / hd-handoff  (token checked, rate limited, metered)
\`\`\`

### 5.2 Decisions and trade-offs (read this before changing anything)
1. **Crawling is async with webhooks.** \`hd-crawl\` starts a Firecrawl crawl with a webhook and returns
   in under a second. Firecrawl posts one \`crawl.page\` event per page to \`hd-firecrawl-webhook\`, which
   saves the page and queues an embed job. A pg_cron worker (\`hd-embed-worker\`) chunks and embeds.
   No request ever waits for a crawl. A 1,000 page site never hits an edge function time limit.
2. **One generic jobs table, claimed with \`for update skip locked\`.** Retries with exponential backoff,
   an idempotency key per job, a dead state after 5 attempts. Simpler than a queue service and fine for
   thousands of jobs a minute.
3. **Exact vector search, no HNSW index, on purpose.** Every query filters by \`bot_id\` first (b-tree
   index) and then computes cosine distance on that bot's chunks only. A Growth bot with 1,000 pages has
   about 4,000 chunks, which takes a few milliseconds and gives perfect recall. A global HNSW index
   filtered by bot would return too few rows for small bots and needs lots of RAM.
   **What breaks first:** a single bot over about 50,000 chunks gets slow (over 100 ms).
   **Fix:** a partial HNSW index for that bot, or pgvector iterative scans (\`hnsw.iterative_scan\`).
4. **The widget runs in an iframe on our domain.** The customer's CSS cannot break it, and our code never
   touches their page beyond a bubble. The domain lock is enforced two ways: the browser refuses to frame
   \`/widget/BOT_ID\` on any site not in \`allowed_domains\` (CSP \`frame-ancestors\` set per bot by
   \`proxy.ts\`), and \`hd-answer\` requires a short-lived token minted only after the Referer host matched.
   **Honest limit:** a script with curl can still call \`hd-answer\` with a fresh token. That is why every
   answer is rate limited per visitor and per IP, and capped per workspace per month server-side.
5. **No streaming in v1.** Claude returns structured JSON (answer, confident, source ids, reason) so we
   can flag low confidence and validate links. Haiku answers in 1 to 2 seconds, so typing dots then a
   fade is fine. **Upgrade path:** stream the \`answer\` field with partial JSON parsing in v2.
6. **Old chunks keep answering during a re-crawl.** We replace chunks page by page as each page is
   re-embedded, never "delete everything, then rebuild".
7. **Metering before spending.** Every paid call reserves its usage in \`usage_ledger\` through
   \`try_consume()\` (one advisory lock per workspace and kind) before calling the vendor, and writes the
   real cost after. Two tabs racing cannot pass the cap.
8. **Workspaces from day one.** v1 has one owner per workspace, but every row carries \`workspace_id\`
   and RLS uses \`is_workspace_member()\`. Team invites (v2) need no migration.
9. **Billing is per user, access is per workspace.** \`subscriptions\` is keyed by \`user_id\` (the
   shared Stripe webhook writes it). \`has_active_access(ws)\` checks the workspace owner's subscription.

### 5.3 What happens at 1,000 customers
| Thing | Size at 1,000 customers | Fine until | Fix |
|---|---|---|---|
| chunks rows | about 1.5 million (avg 1,500 per workspace) | about 5 million on Medium compute | Move embeddings to \`halfvec(1024)\` (half the size), then Large compute |
| messages rows | about 1 million a month at 500 answers each | many tens of millions | Monthly partition or archive older than 12 months (cleanup job does this) |
| hd-answer calls | about 20 a minute on average, 300 a minute at peak | Supabase edge function limits [verify] | Already stateless; nothing to change |
| Firecrawl webhooks | bursts of 1,000 per big crawl | fine, each call is one upsert | Batch inserts if Firecrawl adds batched events |
| Voyage rate limit | 64 chunks per request | Voyage tier limits after adding a card [verify] | Worker already backs off on 429 |

## 6. Routes and pages

### 6.1 Public
| Route | What it does |
|---|---|
| \`/\` | Landing page from @LANDING.md, with the live demo (\`#try\`) and our own Helpdeck widget installed |
| \`/pricing\` | Anchor on \`/\` (\`/#pricing\`); no separate page |
| \`/docs\` | Public help articles for Helpdeck itself (also what our own bot is trained on) |
| \`/install/[platform]\` | Short install guides: webflow, wordpress, shopify, framer, html (after launch, SEO) |
| \`/login\`, \`/signup\`, \`/forgot-password\`, \`/reset-password\` | Supabase auth, "Confirm email" off |
| \`/widget/[botId]\` | The chat UI the loader script opens in an iframe. No app chrome. Framed only by allowed domains |
| \`/w.js\` | The loader script (static file in \`public/\`, under 3 KB, cached 1 hour) |
| \`/demo/[demoId]\` | The page a demo email links back to: the prospect's demo bot plus "Keep this bot" |

### 6.2 Logged in (app shell with sidebar)
| Route | Sidebar item | What it does |
|---|---|---|
| \`/onboarding\` | none (full screen) | Step 1: company name. Step 2: paste a URL and start the first crawl. Step 3: go to Sources |
| \`/app\` | **Overview** | Activation checklist, answers used meter, this week's answers, deflection rate, handoffs, latest 5 conversations |
| \`/bots/new\` | from bot switcher | Create a bot (Growth: up to 3). Blocked with an upgrade card at the plan cap |
| \`/bots/[botId]/sources\` | **Sources** | URL input, Crawl / Re-crawl / Cancel, progress card, pages table (exclude, delete, open), test chat panel on the right |
| \`/bots/[botId]/conversations\` | **Conversations** | List with filters (All, Handed off, Low confidence, Test), transcript on the right, Export CSV |
| \`/bots/[botId]/gaps\` | **Gaps** | Unanswered questions grouped by normalised text, count, last asked, status (Open, Fixed, Ignored) |
| \`/bots/[botId]/widget\` | **Widget** | Tabs: Appearance (name, greeting, colour, avatar, suggested questions, live preview), Install (snippet + platform steps + live status), Domains, Handoff (email, message) |
| \`/docs\` (in app) | **Documentation** | Same articles as public \`/docs\`, inside the shell, with search |
| \`/help\` | **Help** | Contact form to the founder (Resend), 5 FAQ items |
| \`/billing\` | **Billing** | Plan, price, status, trial end, usage meters (answers, crawl pages), Manage billing (Customer Portal), plan cards to upgrade |
| \`/settings\` | **Settings** | Profile, workspace name, email, password, notification toggles (usage alerts, weekly digest, handoff copy), delete account |
| \`/paywall\` | none | Shown when \`has_active_access\` is false. Start trial or update card |

### 6.3 Sidebar (exact order)
\`\`\`
[Helpdeck logo]
[Bot switcher: "Acme Docs ▾"]   (lists bots, "+ New bot" at the bottom, upgrade badge at cap)
  Overview          /app
  Sources           /bots/[botId]/sources
  Conversations     /bots/[botId]/conversations     (count badge: open handoffs)
  Gaps              /bots/[botId]/gaps               (count badge: open gaps)
  Widget            /bots/[botId]/widget
──────── (spacer pushes the rest to the bottom)
  Documentation     /docs
  Help              /help
  Billing           /billing
  Settings          /settings
\`\`\`
- One level, no nested menus, 9 items. The bot switcher is a select, not a nav group.
- The current bot id is kept in a cookie \`hd_bot\` so \`/app\` and the sidebar links know which bot to use.
- Under 1100px the sidebar collapses to 56px icons (DESIGN_SYSTEM.md section 04).

### 6.4 Server routes (Next.js)
| Route | Auth | What it does |
|---|---|---|
| \`POST /api/stripe/checkout\` | user | Creates a Checkout session (shared Payments phase) with the plan's price id |
| \`POST /api/stripe/portal\` | user | Customer Portal session |
| \`POST /api/stripe/webhook\` | Stripe signature | Shared Payments phase. Writes \`subscriptions\` |
| \`GET /api/widget/[botId]/config\` | public, CORS * | Returns \`{ name, brandColour, greeting, avatarUrl, suggestedQuestions, showBranding, mode }\` only. Cached 60 s |
| \`POST /api/bots/[botId]/test-token\` | user, member of the bot's workspace | Mints a widget token with host \`app\` for the test panel |
| \`POST /api/bots/[botId]/export\` | user, member | Builds a CSV of conversations into bucket \`conversation-exports\`, returns a 10 minute signed URL |
| \`POST /api/help\` | user | Sends the Help form to the founder through Resend |

## 7. Data model
All tables live in \`public\`, carry \`workspace_id\` (except profile and billing tables) and have RLS on.
Full SQL is in the migration task. Summary:

| Table | Key columns | Notes |
|---|---|---|
| \`profiles\` | id (= auth.users.id), full_name, current_workspace_id | Made by the signup trigger |
| \`workspaces\` | id, name, owner_id | One made for every new user by the signup trigger |
| \`workspace_members\` | workspace_id, user_id, role (owner, admin, member) | v1: owner only |
| \`bots\` | id, workspace_id, name, brand_colour, greeting, avatar_path, suggested_questions text[], handoff_email, handoff_message, allowed_domains text[], start_url, status, page_count, chunk_count, first_seen_at, last_seen_host, is_demo | Bot count capped by trigger from the plan |
| \`crawl_jobs\` | id, bot_id, workspace_id, firecrawl_id (unique), start_url, page_limit, status, pages_found, pages_changed, pages_embedded, pages_failed, error, started_at, finished_at, last_event_at | One row per crawl |
| \`pages\` | id, bot_id, workspace_id, url, title, markdown, content_hash, status, excluded, chunk_count, last_crawl_id, crawled_at | Unique (bot_id, url) |
| \`chunks\` | id, bot_id, workspace_id, page_id, ord, heading, content, token_count, embedding vector(1024) | Replaced per page |
| \`jobs\` | id, workspace_id, kind, status, ref_id, payload, attempts, run_after, locked_at, last_error, idempotency_key (unique) | The work queue |
| \`conversations\` | id, bot_id, workspace_id, visitor_id, ip_hash, host, page_url, status, is_test, first_question, message_count, low_confidence_count, visitor_email, handed_off_at, last_message_at | |
| \`messages\` | id, conversation_id, bot_id, workspace_id, role, content, question, sources jsonb, confident, reason, top_similarity, input_tokens, output_tokens, latency_ms | Assistant rows keep the question they answer |
| \`doc_gaps\` | id, bot_id, workspace_id, question_key, sample_question, times_asked, last_asked_at, status (open, fixed, ignored) | Unique (bot_id, question_key) |
| \`usage_ledger\` | id, workspace_id, bot_id, kind, quantity, cost_micros, ref_id, idempotency_key (unique), created_at | The meter |
| \`email_log\` | id, workspace_id, kind, to_email, subject, dedupe_key (unique), resend_id, status, error | Every email |
| \`email_suppressions\` | email (pk), reason | Bounces and complaints from Resend |
| \`rate_limits\` | key, window_start, count | Fixed window counters |
| \`demo_sessions\` | id, ip_hash, email, start_url, bot_id, status, pages, questions_used, claimed_workspace_id, expires_at | Landing page demo |
| \`plan_prices\` | price_id (pk), plan ('starter','growth'), interval | Maps Stripe prices to plans |
| \`subscriptions\` | user_id (pk), stripe ids, status, price_id, trial_end, current_period_end, cancel_at_period_end | Shared billing |
| \`stripe_events\` | id (pk), type | Webhook de-duplication |

Views: \`workspace_usage_month\` (usage per workspace and kind since \`usage_period_start(ws)\`, security invoker).

Storage buckets:
- \`bot-avatars\` (public read, 1 MB, png/jpeg/webp): path \`{workspace_id}/{bot_id}/avatar.{ext}\`. Members write.
- \`conversation-exports\` (private, 20 MB, text/csv): path \`{workspace_id}/{export_id}.csv\`. Members read; only the server writes.

## 8. State machines

### 8.1 Bot status (\`bot_status\`)
\`\`\`
 empty ──crawl started──► crawling ──finish job──► ready
   ▲                         │                      │
   │                         └──all pages failed──► error ──re-crawl──► crawling
   └── all pages deleted ◄── ready ──re-crawl──► crawling (old chunks keep answering)
\`\`\`
- The widget answers in \`ready\` and in \`crawling\` when \`chunk_count > 0\`.

### 8.2 Crawl job (\`crawl_status\`)
\`\`\`
 queued ─► crawling ─(crawl.completed webhook)─► embedding ─(no embed jobs left)─► ready
             │  └──(crawl.failed)──► failed
             └──(owner clicks Cancel)──► cancelled
 crawling with no webhook for 15 min ─► reconcile job polls Firecrawl ─► embedding or failed
\`\`\`

### 8.3 Page (\`page_status\`)
- \`pending\` (saved, waiting for embedding) ► \`embedded\` or \`failed\` (after 5 attempts).
- \`excluded\` is a separate boolean so a re-crawl never un-excludes a page. Excluded pages keep no chunks.
- Pages not seen in a finished crawl are deleted (their chunks cascade), unless the crawl hit the page limit.

### 8.4 Job (\`job_status\`)
\`\`\`
 queued ─claim─► running ─ok─► done
   ▲               │
   └── error, attempts < 5, run_after = now() + 2^attempts minutes + jitter
                   └── attempts = 5 ─► dead (page marked failed, logged)
 running for more than 10 minutes ─► release_stuck_jobs() puts it back to queued
\`\`\`

### 8.5 Conversation (\`conversation_status\`)
- \`open\` ► \`handed_off\` (visitor left an email) ► stays there. \`open\` ► \`closed\` after 24 hours without
  a message (cleanup job). A closed conversation re-opens if the same visitor writes again within 7 days.

### 8.6 Widget mode (computed by \`/api/widget/[botId]/config\` and \`hd-answer\`)
| Mode | When | What the visitor sees |
|---|---|---|
| \`live\` | access active, answers left, bot has chunks | Normal chat |
| \`email_only\` | answer cap reached this month | Greeting plus the handoff form: "Leave your email and we will get back to you." |
| \`paused\` | owner has no active subscription | Same as email_only; the owner gets no new answers billed |
| \`not_ready\` | bot has no chunks yet | "This assistant is still learning. Leave your email instead." |

### 8.7 Demo session (\`demo_status\`)
- \`crawling\` ► \`ready\` or \`failed\`. \`ready\` ► \`claimed\` (signup with the demo id) or \`expired\` (48 hours).
`
