// Conversate launch tasks, repo tree and starter files.
import type { Task } from '../../types'

export const launchTasks: Task[] = [
  {
    id: 'con-launch-dogfood',
    title: 'Build the landing page and run Conversate on itself',
    outcome: 'Your landing page is live with your own Conversate widget answering questions about Conversate from your own help centre.',
    minutes: 90,
    xp: 60,
    blocks: [
      { type: 'p', text: 'The best demo is your own site. Prospects ask your widget "How much is it?" and "Does it work on Shopify?" and get sourced answers from your own help centre. Every question it cannot answer tells you what your docs are missing.' },
      { type: 'prompt', id: 'con-launch-dogfood-prompt', title: 'Paste into Claude Code', code: `1. Build the landing page at app/(marketing)/page.tsx exactly as specified in @LANDING.md, top to bottom: every section, the exact copy, the motion specs with reduced-motion fallbacks, SEO metadata, JSON-LD, the OG image, sitemap, robots, llms.txt and every analytics event. Use @DESIGN_SYSTEM.md and @DESIGN.md tokens and wire the pricing toggle to the six STRIPE_PRICE_* env vars (starter, growth, scale x monthly, yearly).
2. Build /docs with these pages (short, plain, one H1 each): Getting started, How crawling works, Install on Plain HTML, Webflow, WordPress, Shopify, Framer, Next.js (copy the steps from @PRD.md 11.5), Allowed domains, Confidence threshold, Inbox basics, Email replies, Team and roles, Plans and limits (from @PRD.md 16), Cancelling.
3. After deploy, create my own workspace "Conversate" with slug "conversate-help", crawl https://MYDOMAIN/docs and https://MYDOMAIN/pricing, publish the drafts, and add my widget snippet to app/(marketing)/layout.tsx and app/docs/layout.tsx (not to /app). Point the sidebar Help link to /conversate-help/help.
4. Add my live domain and www to my workspace's allowed domains.` },
      { type: 'steps', items: [
        'Deploy to Vercel and open the live landing page on your phone.',
        'Ask the widget "How much does it cost?" and "Does it work on Shopify?". Both answers cite your docs or pricing page.',
        'Ask "Can I import from Zendesk?". It says it is not sure and offers a human. Answer it yourself from the Inbox, then draft the missing article from Knowledge > Content gaps.',
      ] },
    ],
    checklist: [
      { id: 'con-launch-c1', label: 'Copy the landing and dogfood prompt', trigger: 'copy:con-launch-dogfood-prompt' },
      { id: 'con-launch-c2', label: 'Crawl your own docs and pricing pages' },
      { id: 'con-launch-c3', label: 'Ask your own widget two pricing and install questions' },
      { id: 'con-launch-c4', label: 'Draft one article from your first content gap' },
    ],
  },
  {
    id: 'con-launch-scale',
    title: 'Switch every service to production limits',
    outcome: 'Crawling, AI, email and the database are on plans that will not stall when your first 20 customers arrive.',
    minutes: 40,
    xp: 40,
    blocks: [
      { type: 'table', head: ['Service', 'Change', 'Where', 'Why'], rows: [
        ['Firecrawl', 'Hobby now, Standard ($83/mo yearly) at about 5 customers', 'firecrawl.dev > Billing', 'Each Starter customer can crawl 600 pages a month'],
        ['Claude API', 'Raise the monthly spend limit to 3x your expected bill', 'platform.claude.com > Settings > Limits', 'A hit limit makes every widget answer fail'],
        ['Voyage AI', 'Card on file (already done), check rate limits page', 'dashboard.voyageai.com > Rate limits', 'Big first crawls send thousands of chunks'],
        ['Resend', 'Pro ($20/mo) once you pass 100 emails a day', 'resend.com > Billing', 'Free stops at 100 a day, and alerts are time-sensitive'],
        ['Supabase', 'Pro ($25/mo), then Small compute at about 100 customers', 'Supabase > Project settings > Compute and disk', 'The HNSW index must fit in memory'],
        ['Vercel', 'Pro ($20/mo)', 'Vercel > Settings > Billing', 'Hobby does not allow commercial use'],
      ] },
      { type: 'code', id: 'con-launch-scale-sql', filename: 'capacity-check.sql', lang: 'sql', code: `-- How big is the vector index, and does it fit in memory? Compare with your compute size's RAM.
select pg_size_pretty(pg_relation_size('public.kb_chunks_embedding_hnsw')) as hnsw_index,
       pg_size_pretty(pg_total_relation_size('public.kb_chunks')) as chunks_total,
       (select count(*) from public.kb_chunks) as chunks;
-- Jobs that died in the last 7 days (should be close to 0).
select kind, count(*) from public.jobs where status = 'dead' and updated_at > now() - interval '7 days' group by kind;
-- Average AI answer cost this month in micro-dollars (expect 500 to 1,000).
select round(avg(cost_micros)) from public.usage_ledger where kind = 'ai_answer' and created_at > date_trunc('month', now());` },
      { type: 'mistakes', items: [
        { mistake: 'Answers get slow (over 6 seconds) as customers grow.', fix: 'Run the capacity SQL. If the HNSW index is bigger than about half your compute RAM, upgrade compute one size. Then check the edge function logs for the slowest step.' },
        { mistake: 'Crawls fail on the first of the month.', fix: 'Firecrawl credits reset monthly and do not roll over. Watch the Firecrawl usage page in the last week of the month and upgrade before you run out.' },
      ] },
    ],
    checklist: [
      { id: 'con-launch-scale-c1', label: 'Upgrade Firecrawl, Resend, Supabase and Vercel as listed' },
      { id: 'con-launch-scale-c2', label: 'Raise the Claude monthly spend limit' },
      { id: 'con-launch-scale-c3', label: 'Run the capacity check SQL', trigger: 'copy:con-launch-scale-sql' },
    ],
  },
]

export const repoTree = `conversate/
├── CLAUDE.md                      # rules for Claude Code (UI rules: @DESIGN_SYSTEM.md @DESIGN.md)
├── PRD.md  DESIGN.md  DESIGN_SYSTEM.md  LANDING.md  DECISIONS.md
├── app/
│   ├── (marketing)/               # landing, pricing, compare/[competitor], tools/help-centre-grader
│   ├── docs/                      # your own product docs and install guides
│   ├── (auth)/                    # login, signup, forgot, reset
│   ├── invite/[token]/            # accept an invitation
│   ├── onboarding/                # six-step build flow
│   ├── paywall/
│   ├── app/                       # agent app (sidebar shell)
│   │   ├── inbox/  inbox/[conversationId]/
│   │   ├── help-centre/  help-centre/articles/[id]/  help-centre/categories/
│   │   ├── knowledge/  widget/  analytics/  team/  billing/  settings/
│   ├── [workspaceSlug]/help/      # public help centre: home, [categorySlug], a/[articleSlug], search
│   ├── embed/[key]/               # widget iframe panel
│   └── api/                       # stripe/*, help/search, help/feedback, onboarding/suggest-questions, demo, health
├── components/
│   ├── shell/  inbox/  help-centre/  knowledge/  widget/  analytics/  ui/
├── lib/
│   ├── supabase/ (client.ts, server.ts, admin.ts)
│   ├── workspace.ts  plans.ts  billing.ts  markdown.ts
├── public/
│   ├── w.js  w/v1.js              # widget loader (built by scripts/build-widget.mjs)
│   └── test-widget.html
├── scripts/
│   ├── build-widget.mjs  seed-inbox.ts
│   └── security-tenant.ts  security-injection.ts
├── supabase/
│   ├── config.toml                # verify_jwt = false for every function
│   ├── migrations/
│   │   ├── 0001_conversate.sql
│   │   ├── 0002_article_embed_trigger.sql
│   │   └── 0003_notify_prefs.sql
│   └── functions/
│       ├── _shared/               # admin, auth, http, log, retry, limits, meter, crypto, guard,
│       │                          # claude, voyage, email, origin, visitorJwt, jobs
│       ├── onboard-crawl/  build-knowledge/  draft-articles/
│       ├── widget-config/  widget-session/  widget-message/
│       └── agent-reply/  suggest-reply/  notify/  invite-member/
├── middleware.ts                  # session refresh, reserved slugs, /embed CSP
├── .env.example
└── package.json`

export const starterFiles: { path: string; content: string }[] = [
  {
    path: 'README.md',
    content: `# Conversate

An AI help desk for small teams. Paste a website: Conversate crawls it with Firecrawl, drafts a help centre
with Claude, embeds everything with Voyage AI into Supabase pgvector, and answers visitors through a
one-line widget with sources and a confidence score. Low-confidence chats go to a shared inbox where agents
reply live (Supabase Realtime) or by email (Resend, including inbound replies).

## Stack
Next.js (App Router) + Tailwind + shadcn/ui, Supabase (auth, Postgres + RLS + pgvector, storage, realtime,
edge functions, pg_cron), Stripe (7-day trial; Starter $49, Growth $129, Scale $299, yearly = 10 months),
Firecrawl v2, Voyage AI (\`voyage-3.5\`, 1024 dims), Claude API (\`claude-haiku-5-5\` answers,
\`claude-sonnet-5-5\` drafting), Resend.

## Start
1. \`npm install\`
2. Copy \`.env.example\` to \`.env.local\` and fill it in.
3. Run \`supabase/migrations/0001_conversate.sql\` in the Supabase SQL editor (once, on a fresh project).
4. Set the edge function secrets (see .env.example) and deploy the functions with \`--no-verify-jwt\`.
5. Schedule the workers (see the "Schedule the workers" task).
6. \`npm run dev\`, sign up, and run onboarding against a small website.

## Install snippet (what customers paste in <head>)
\`\`\`html
<script src="https://YOURDOMAIN/w.js" data-key="cv_pub_xxxxxxxxxxxxxxxxxxxxxxxx" async></script>
\`\`\`
`,
  },
  {
    path: 'CLAUDE.md',
    content: `# Conversate

Read @PRD.md before every task. UI rules: @DESIGN_SYSTEM.md @DESIGN.md
Marketing page: @LANDING.md. Log every decision the PRD does not cover in DECISIONS.md.

## Stack
Next.js App Router (TypeScript), Tailwind, shadcn/ui restyled to the design tokens, Supabase cloud
(publishable key in the browser, secret key only on the server and in edge functions), Stripe, Resend.

## Rules
- Check the user on the server with supabase.auth.getClaims(). Never trust getSession() on the server.
- Every table has RLS. Never add a policy for the anon role. Visitors only use the widget edge functions.
- Never call Firecrawl, Voyage or Claude from the browser or from Next.js client code.
- Every paid API call: check the plan cap first, then call, then meter into usage_ledger with an idempotency key.
- Every text from visitors, crawled pages or emails that reaches Claude goes through _shared/guard.ts.
- Slow work goes into the jobs table. No request may wait on a crawl or a batch of drafts.
- Edge functions deploy with --no-verify-jwt and check auth themselves.
- No filled or black buttons anywhere, including the widget. Follow the stability rules.
- Never edit migration 0001 after it has run. Add a new numbered migration.
- Opus at high effort for schema, RLS, auth, Stripe and the widget's public functions.

## Commands
npm run dev · npm run build · npx supabase functions deploy <name> --no-verify-jwt · deno test supabase/functions/_shared
`,
  },
  {
    path: '.env.example',
    content: `# Browser-safe
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-REF.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxx
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Server only (.env.local and Vercel env)
SUPABASE_SECRET_KEY=sb_secret_xxx
ANTHROPIC_API_KEY=sk-ant-xxx            # onboarding question suggester route
FIRECRAWL_API_KEY=fc-xxx                # onboarding scrape + demo + grader routes
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
STRIPE_PRICE_STARTER_MONTHLY=price_xxx
STRIPE_PRICE_STARTER_YEARLY=price_xxx
STRIPE_PRICE_GROWTH_MONTHLY=price_xxx
STRIPE_PRICE_GROWTH_YEARLY=price_xxx
STRIPE_PRICE_SCALE_MONTHLY=price_xxx
STRIPE_PRICE_SCALE_YEARLY=price_xxx
DEMO_OWNER_ID=uuid-of-a-system-user
DEMO_ADMIN_TOKEN=random-hex

# Supabase secrets (npx supabase secrets set NAME=value)
# FIRECRAWL_API_KEY=fc-xxx
# FIRECRAWL_WEBHOOK_SECRET=xxx
# VOYAGE_API_KEY=pa-xxx
# ANTHROPIC_API_KEY=sk-ant-xxx
# RESEND_API_KEY=re_xxx
# RESEND_WEBHOOK_SECRET=whsec_xxx
# EMAIL_FROM_DOMAIN=mail.yourdomain.com
# INBOUND_DOMAIN=in.yourdomain.com
# WIDGET_JWT_SECRET=openssl rand -hex 32
# CRON_SECRET=openssl rand -hex 32
# APP_URL=https://yourdomain.com
`,
  },
  {
    path: 'supabase/config.toml',
    content: `# Add these blocks to the config.toml the Supabase CLI created.
# Every Conversate function checks auth itself (user token, visitor token, webhook signature or cron secret).
[functions.onboard-crawl]
verify_jwt = false
[functions.build-knowledge]
verify_jwt = false
[functions.draft-articles]
verify_jwt = false
[functions.widget-config]
verify_jwt = false
[functions.widget-session]
verify_jwt = false
[functions.widget-message]
verify_jwt = false
[functions.agent-reply]
verify_jwt = false
[functions.suggest-reply]
verify_jwt = false
[functions.notify]
verify_jwt = false
[functions.invite-member]
verify_jwt = false
`,
  },
  {
    path: 'DECISIONS.md',
    content: `# Decisions

One line per decision the PRD does not cover: date, decision, reason.

- 2026-10-18: Embeddings with Voyage voyage-3.5 at 1024 dims, not Supabase gte-small. Multilingual, longer chunks, better retrieval, about $0.03 per 300-page site.
- 2026-10-18: Visitor live replies over a Realtime broadcast topic per conversation (unguessable), agents over postgres_changes with RLS.
- 2026-10-18: AI answers returned whole (structured JSON), not streamed, so sources and confidence are reliable.
`,
  },
]
