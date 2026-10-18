// Helpdeck launch tasks, repo tree and starter files.
import type { Task } from '../../types'
import { code, eli5, mistakes, p, prompt, steps, task, tip } from './helpers'

export const launchTasks: Task[] = [
  {
    id: 'hd-launch-dogfood',
    title: 'Install Helpdeck on its own landing page',
    outcome: 'Your landing page has a live bot that answers questions about Helpdeck, trained on your own docs.',
    minutes: 50,
    xp: 45,
    blocks: [
      p('The best demo is your own site. Write a short docs page about Helpdeck, crawl it, and install the widget on the landing page. Every visitor question about Helpdeck then shows you what your own docs are missing.'),
      prompt('hd-launch-dogfood-prompt', 'Paste into Claude Code', `
1. Create app/(marketing)/docs/page.tsx (and reuse the articles in the in-app /docs) with 12 short sections:
   What is Helpdeck, How crawling works, What counts as an answer, Installing on Webflow, WordPress, Shopify,
   Framer and HTML, Allowed domains, Handoff emails, Docs gaps, Pricing (Starter $49/month or $490/year,
   Growth $129/month or $1,290/year, 7-day trial), Limits (from @PRD.md section 12), Cancelling.
2. Check the landing page at app/(marketing)/page.tsx matches @LANDING.md top to bottom: every section, the
   exact copy, the motion specs with reduced-motion fallbacks, the live demo section, SEO metadata, JSON-LD,
   OG image and every analytics event. Wire the pricing toggle to the four STRIPE_PRICE_* env vars.
3. After deploy, create a bot in my own workspace called "Helpdeck", crawl https://<my domain>/docs, add my
   domain to its allowed domains, and add the script tag for that bot to the marketing layout only (not the
   app, not /widget).
4. Add the DataFast (or PostHog) script to the marketing layout. Check metadata and the OG image render.`),
      steps(
        'Deploy to Vercel.',
        'Add your live domain to your own bot\'s allowed domains.',
        'Open the landing page on your phone and ask "How much does it cost?".',
        'Ask "Can it read PDFs?". It should say it is not sure (PDF is v2) and offer the handoff. Check the gap appears in your Gaps page.',
      ),
      code('hd-launch-dogfood-sql', 'Supabase SQL Editor: is your own bot live?', 'sql', `
select name, status, page_count, first_seen_at, last_seen_host from public.bots where name = 'Helpdeck';
`),
      mistakes([
        { mistake: 'The bubble appears inside the app too.', fix: 'The script tag was added to the root layout. Move it to app/(marketing)/layout.tsx only.' },
        { mistake: 'Your own bot says "not set up for this website" on the live domain.', fix: 'Allowed domains has yourdomain.com but you are on www.yourdomain.com with a different host, or the reverse. Add the bare domain (it covers www).' },
        { mistake: 'The bot quotes old prices after you change them.', fix: 'Click Re-crawl on your Helpdeck bot after every docs change. Only changed pages are re-learned.' },
      ]),
    ],
    checklist: [
      { id: 'hd-launch-c1', label: 'Copy the launch prompt', trigger: 'copy:hd-launch-dogfood-prompt' },
      { id: 'hd-launch-c2', label: 'Crawl your own docs page' },
      { id: 'hd-launch-c3', label: 'Ask your landing page bot a pricing question' },
      { id: 'hd-launch-c4', label: 'Check your own bot shows as live', trigger: 'copy:hd-launch-dogfood-sql' },
    ],
  },
  task({
    id: 'hd-launch-first-ten',
    title: 'Watch your first 10 customers activate',
    outcome: 'A 10 minute daily check that tells you who is stuck before they cancel, and what to fix first.',
    minutes: 30,
    xp: 40,
    blocks: [
      eli5('What activation means here', 'A trial user who installs the widget and gets a real answer on their own site in the first 3 days usually pays. Someone who crawled but never installed usually does not. This query shows you who is where, so you can email the stuck ones by hand.'),
      code('hd-launch-first-ten-sql', 'Supabase SQL Editor: the activation board', 'sql', `
select
  u.email,
  s.status as plan_status,
  s.trial_end::date as trial_ends,
  b.name as bot,
  b.status as bot_status,
  b.page_count,
  (select count(*) from public.messages m where m.bot_id = b.id and m.role = 'assistant') as answers,
  b.first_seen_at is not null as live,
  (select count(*) from public.conversations c where c.bot_id = b.id and c.status = 'handed_off') as handoffs
from auth.users u
join public.workspaces w on w.owner_id = u.id
left join public.subscriptions s on s.user_id = u.id
left join public.bots b on b.workspace_id = w.id and not b.is_demo
where u.created_at > now() - interval '30 days'
order by u.created_at desc;
`),
      p('Email anyone stuck at a step. One line, from you, no template feel:'),
      code('hd-launch-first-ten-emails', 'nudges.txt', 'txt', `
CRAWLED, NOT INSTALLED (day 2):
Hi {first_name}, your bot has read {pages} pages of {host}. Want me to add the line to your site for you? Reply with your Webflow/WordPress/Shopify and I'll send the exact click path.

NO CRAWL (day 1):
Hi {first_name}, did the crawl give you trouble? Reply with your docs URL and I'll run it and check the answers for you.

LIVE BUT MANY HANDOFFS (day 5):
Hi {first_name}, the bot handed off {handoffs} chats this week. The Gaps page shows the top questions your docs don't cover. Two short pages would probably halve that. Want me to suggest the titles?
`),
      tip('Fix the product, not only the user', 'If 3 people get stuck at the same step, that step is broken. Change the screen, then tell those 3 people it is fixed.'),
    ],
    checklist: [
      ['Run the activation board query', 'copy:hd-launch-first-ten-sql'],
      ['Copy the three nudge emails', 'copy:hd-launch-first-ten-emails'],
      'Email every stuck trial user today',
    ],
  }),
]

export const repoTree = `helpdeck/
├── app/
│   ├── (marketing)/
│   │   ├── layout.tsx              # our own Helpdeck widget is installed here
│   │   ├── page.tsx                # landing page from LANDING.md
│   │   ├── docs/page.tsx
│   │   ├── install/[platform]/page.tsx
│   │   └── alternatives/[slug]/page.tsx
│   ├── (auth)/login/page.tsx
│   ├── (auth)/signup/page.tsx
│   ├── (auth)/forgot-password/page.tsx
│   ├── (auth)/reset-password/page.tsx
│   ├── (app)/
│   │   ├── layout.tsx              # sidebar + bot switcher + banners
│   │   ├── app/page.tsx            # Overview
│   │   ├── bots/new/page.tsx
│   │   ├── bots/[botId]/sources/page.tsx
│   │   ├── bots/[botId]/conversations/page.tsx
│   │   ├── bots/[botId]/gaps/page.tsx
│   │   ├── bots/[botId]/widget/page.tsx
│   │   ├── docs/page.tsx
│   │   ├── help/page.tsx
│   │   ├── billing/page.tsx
│   │   └── settings/page.tsx
│   ├── onboarding/page.tsx
│   ├── paywall/page.tsx
│   ├── demo/[demoId]/page.tsx
│   ├── widget/[botId]/page.tsx     # iframe chat UI (framed only by allowed domains)
│   └── api/
│       ├── stripe/checkout/route.ts
│       ├── stripe/portal/route.ts
│       ├── stripe/webhook/route.ts
│       ├── widget/[botId]/config/route.ts
│       ├── bots/[botId]/test-token/route.ts
│       ├── bots/[botId]/export/route.ts
│       └── help/route.ts
├── components/
│   ├── chat/ChatPanel.tsx          # shared by widget, test panel and demo
│   ├── chat/SourceChips.tsx
│   ├── chat/HandoffBox.tsx
│   ├── chat/TypingDots.tsx
│   ├── BotSwitcher.tsx
│   ├── CrawlProgress.tsx
│   ├── UsageMeter.tsx
│   ├── DomainTags.tsx
│   ├── SnippetBox.tsx
│   ├── WidgetPreview.tsx
│   └── ui/                         # shadcn, restyled to DESIGN_SYSTEM.md
├── lib/
│   ├── plans.ts                    # plan limits (mirror of plan_limits() in SQL)
│   ├── hosts.ts                    # allowed-domain matching
│   ├── widget-token.ts             # HMAC widget tokens
│   ├── billing.ts
│   ├── track.ts
│   └── supabase/                   # browser, server and admin clients
├── public/
│   └── w.js                        # the loader script customers paste
├── proxy.ts                        # auth gate + per-bot frame-ancestors on /widget
├── scripts/
│   ├── e2e.ts
│   └── security-check.ts
├── supabase/
│   ├── config.toml
│   ├── migrations/0001_helpdeck.sql
│   └── functions/
│       ├── _shared/                # admin, auth, http, limits, voyage, claude, email, chunk...
│       ├── hd-crawl/index.ts
│       ├── hd-firecrawl-webhook/index.ts
│       ├── hd-embed-worker/index.ts
│       ├── hd-answer/index.ts
│       ├── hd-handoff/index.ts
│       ├── hd-demo/index.ts
│       ├── hd-digest/index.ts
│       └── hd-resend-webhook/index.ts
├── CLAUDE.md
├── PRD.md                          # build PRD (download, save here)
├── DESIGN_SYSTEM.md                # Quiet Precision base design system
├── DESIGN.md                       # Helpdeck design PRD
├── LANDING.md                      # landing page PRD
├── .env.example
└── README.md`

export const starterFiles: { path: string; content: string }[] = [
  {
    path: 'README.md',
    content: `# Helpdeck

An AI support chat widget trained on a company's own website. Crawl with Firecrawl (webhooks),
embed with Voyage AI into Supabase pgvector, answer with Claude Haiku, hand off to email with Resend.

## Stack
Next.js (App Router) + Tailwind + shadcn/ui, Supabase (auth, Postgres + pgvector, edge functions, pg_cron),
Stripe (7-day trial, then Starter $49/month or Growth $129/month), Firecrawl, Voyage AI (\`voyage-3.5\`,
1024 dims), Claude API (\`claude-haiku-5-5\`), Resend.

## Start
1. \`npm install\`
2. Copy \`.env.example\` to \`.env.local\` and fill it in.
3. Run \`supabase/migrations/0001_helpdeck.sql\` in the Supabase SQL editor (once, on a fresh project).
4. Set the Supabase secrets listed at the bottom of \`.env.example\`.
5. Deploy the edge functions: \`npx supabase functions deploy <name> --no-verify-jwt\` for each one.
6. Schedule the worker with pg_cron (see the playbook task "Schedule the worker").
7. \`npm run dev\`, create a bot, crawl a small site, ask the test panel a question.

## Install snippet (what customers paste)
\`\`\`html
<script src="https://YOURDOMAIN/w.js" data-bot="BOT_ID" async></script>
\`\`\`

## Docs for Claude Code
\`@PRD.md\` (build), \`@DESIGN_SYSTEM.md\` + \`@DESIGN.md\` (UI), \`@LANDING.md\` (landing page).
`,
  },
  {
    path: '.env.example',
    content: `# Browser-safe
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-REF.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxx
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_MOCK_ANSWERS=false

# Server only (.env.local and Vercel env)
SUPABASE_SECRET_KEY=sb_secret_xxx
WIDGET_TOKEN_SECRET=same_value_as_in_supabase_secrets
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_PRICE_STARTER_MONTHLY=price_xxx
STRIPE_PRICE_STARTER_YEARLY=price_xxx
STRIPE_PRICE_GROWTH_MONTHLY=price_xxx
STRIPE_PRICE_GROWTH_YEARLY=price_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
RESEND_API_KEY=re_xxx

# Local scripts only (scripts/e2e.ts)
TEST_EMAIL=a@test.dev
TEST_PASSWORD=xxx
FIRECRAWL_API_KEY=fc-xxx
VOYAGE_API_KEY=pa-xxx
ANTHROPIC_API_KEY=sk-ant-xxx

# Supabase secrets (npx supabase secrets set NAME=value)
# FIRECRAWL_API_KEY=fc-xxx
# FIRECRAWL_WEBHOOK_SECRET=xxx
# VOYAGE_API_KEY=pa-xxx
# ANTHROPIC_API_KEY=sk-ant-xxx
# RESEND_API_KEY=re_xxx
# RESEND_WEBHOOK_SECRET=whsec_xxx
# EMAIL_FROM=Helpdeck <hello@yourdomain.com>
# WIDGET_TOKEN_SECRET=xxx
# IP_HASH_SALT=xxx
# CRON_SECRET=xxx
# APP_URL=https://yourdomain.com
# DEMO_WORKSPACE_ID=uuid
# DEMO_DAILY_CAP=50
`,
  },
  {
    path: 'lib/plans.ts',
    content: `// Plan limits. Mirror of public.plan_limits() in the SQL migration, which is what enforces them.
export type PlanId = 'starter' | 'growth'

export const PLANS = {
  starter: {
    name: 'Starter',
    monthly: 49,
    yearly: 490,
    bots: 1,
    pagesPerBot: 200,
    answersPerMonth: 2000,
    crawlPagesPerMonth: 1000,
    recrawlsPerBotPerDay: 3,
    showBranding: true,
    weeklyDigest: false,
  },
  growth: {
    name: 'Growth',
    monthly: 129,
    yearly: 1290,
    bots: 3,
    pagesPerBot: 1000,
    answersPerMonth: 10000,
    crawlPagesPerMonth: 6000,
    recrawlsPerBotPerDay: 3,
    showBranding: false,
    weeklyDigest: true,
  },
} as const

export const TRIAL = { answers: 500, crawlPages: 400, days: 7 } as const
export const VISITOR = { questionsPerHour: 20, handoffsPerDay: 3 } as const
export const LOW_SIMILARITY = 0.45
`,
  },
  {
    path: 'supabase/config.toml',
    content: `# Every Helpdeck function checks auth itself (user JWT, widget token, cron secret or webhook signature).
[functions.hd-crawl]
verify_jwt = false
[functions.hd-firecrawl-webhook]
verify_jwt = false
[functions.hd-embed-worker]
verify_jwt = false
[functions.hd-answer]
verify_jwt = false
[functions.hd-handoff]
verify_jwt = false
[functions.hd-demo]
verify_jwt = false
[functions.hd-digest]
verify_jwt = false
[functions.hd-resend-webhook]
verify_jwt = false
`,
  },
]
