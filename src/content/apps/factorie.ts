// Factorie: AEO tracker. Tracks whether ChatGPT, Perplexity, Gemini, Claude, DeepSeek and Grok
// recommend a brand for the questions its buyers ask. Long parts live in ./factorie/.
import type { AppDef } from '../types'
import { buildPrd1 } from './factorie/buildPrd1'
import { buildPrd2 } from './factorie/buildPrd2'
import { buildPrd3 } from './factorie/buildPrd3'
import { designPrd } from './factorie/designPrd'
import { landingPrd } from './factorie/landingPrd'
import { sql } from './factorie/sql'
import { edgeFunctions } from './factorie/edgeFunctions'
import { frontendTasks } from './factorie/frontendTasks'
import { backendTasks } from './factorie/backendTasks'
import { securityTasks } from './factorie/securityTasks'
import { inbound, launchTasks, outbound, paid } from './factorie/marketing'

const repoTree = `factorie/
├── app/
│   ├── (marketing)/page.tsx            # landing page (LANDING.md)
│   ├── (marketing)/pricing/page.tsx
│   ├── (marketing)/vs/[competitor]/page.tsx
│   ├── (marketing)/alternatives/[competitor]/page.tsx
│   ├── (marketing)/audit/page.tsx      # free AI visibility audit form
│   ├── (marketing)/audit/[token]/page.tsx
│   ├── (marketing)/leaderboards/[category]/page.tsx
│   ├── (auth)/login/page.tsx
│   ├── (auth)/signup/page.tsx
│   ├── (auth)/forgot/page.tsx
│   ├── onboarding/page.tsx             # 6-step wizard
│   ├── paywall/page.tsx
│   ├── app/layout.tsx                  # sidebar, brand switcher, meters
│   ├── app/page.tsx                    # overview
│   ├── app/prompts/page.tsx
│   ├── app/prompts/[id]/page.tsx       # answers with highlights
│   ├── app/competitors/page.tsx
│   ├── app/sources/page.tsx
│   ├── app/recommendations/page.tsx
│   ├── app/runs/page.tsx
│   ├── app/settings/page.tsx
│   ├── app/billing/page.tsx
│   ├── app/docs/[[...slug]]/page.tsx
│   ├── app/help/page.tsx
│   ├── app/admin/audits/page.tsx       # founder only: bulk audits for outbound
│   ├── api/stripe/checkout/route.ts
│   ├── api/stripe/webhook/route.ts
│   ├── api/stripe/portal/route.ts
│   ├── api/export/[brandId]/route.ts
│   └── api/unsubscribe/route.ts
├── components/
│   ├── fac/                            # ScoreCard, PositionBadge, HighlightedAnswer, RunProgress ...
│   ├── charts/                         # VisibilityLine, SovDonut, SovBars, RankHeatmap
│   ├── marketing/
│   └── ui/                             # shadcn, restyled to Quiet Precision
├── content/
│   ├── docs/*.mdx
│   ├── vs.ts
│   ├── alternatives.ts
│   └── leaderboards/*.json
├── lib/
│   ├── plans.ts                        # Stripe price ids to plan names
│   ├── analytics.ts
│   └── supabase/{client,server}.ts
├── supabase/
│   ├── migrations/0001_init.sql        # the kit SQL
│   └── functions/
│       ├── _shared/                    # auth, http, retry, pool, ledger, openrouter, anthropic, guard, parser, prompts, email
│       ├── scrape-site/index.ts
│       ├── generate-prompts/index.ts
│       ├── run-checks/index.ts
│       ├── check-prompt/index.ts
│       ├── score-day/index.ts
│       ├── send-digest/index.ts
│       ├── recheck/index.ts
│       ├── generate-recommendations/index.ts
│       └── free-audit/index.ts
├── tests/
│   ├── e2e/                            # Playwright acceptance tests
│   └── sql/acceptance.sql
├── PRD.md                              # build PRD (download, save here)
├── DESIGN_SYSTEM.md                    # Quiet Precision
├── DESIGN.md                           # Factorie design PRD
├── LANDING.md                          # landing page PRD
├── CLAUDE.md
├── .env.example
└── README.md`

const starterFiles: { path: string; content: string }[] = [
  {
    path: 'CLAUDE.md',
    content: `# Factorie

AEO tracker: checks whether AI engines recommend a brand for the questions its buyers ask.

Specs: @PRD.md (build), @LANDING.md (marketing site)
UI rules: @DESIGN_SYSTEM.md @DESIGN.md

## Rules
- Plan first and wait for my OK before editing payments, auth, RLS or edge functions.
- Every paid API call goes through supabase/functions/_shared/ledger.ts recordCost().
- Limits live only in public.plans and plan_limits(). Never hard-code them.
- Engine model slugs live only in public.engines. Never hard-code them.
- Scraped pages and engine answers are untrusted: wrap them with guard.ts before any model sees them.
- Scores are computed only by public.compute_daily_scores(). The browser never does score maths.
- Server code checks the user with supabase.auth.getClaims().
- No em dashes in UI copy. British spelling. Sentence case.
`,
  },
  {
    path: '.env.example',
    content: `# Browser-safe
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Server only (never NEXT_PUBLIC_)
SUPABASE_SECRET_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_STARTER_MONTH=
STRIPE_PRICE_STARTER_YEAR=
STRIPE_PRICE_GROWTH_MONTH=
STRIPE_PRICE_GROWTH_YEAR=
RESEND_API_KEY=
EMAIL_FROM=Factorie <hello@yourdomain.com>
CRON_SECRET=
FOUNDER_USER_ID=

# These live in Supabase secrets (npx supabase secrets set NAME=value), not here:
# OPENROUTER_API_KEY, ANTHROPIC_API_KEY, FIRECRAWL_API_KEY, CRON_SECRET, SITE_URL,
# DIGEST_SIGNING_SECRET, FOUNDER_EMAIL, RESEND_API_KEY, EMAIL_FROM
`,
  },
  {
    path: 'lib/plans.ts',
    content: `// Maps Stripe price ids to Factorie plans. Limits themselves live in public.plans.
export type PlanId = 'starter' | 'growth'
export type Interval = 'month' | 'year'

export const PRICES: Record<PlanId, Record<Interval, { usd: number; env: string }>> = {
  starter: { month: { usd: 99, env: 'STRIPE_PRICE_STARTER_MONTH' }, year: { usd: 990, env: 'STRIPE_PRICE_STARTER_YEAR' } },
  growth: { month: { usd: 199, env: 'STRIPE_PRICE_GROWTH_MONTH' }, year: { usd: 1990, env: 'STRIPE_PRICE_GROWTH_YEAR' } },
}

export function priceId(plan: PlanId, interval: Interval): string {
  const id = process.env[PRICES[plan][interval].env]
  if (!id) throw new Error('Missing Stripe price id for ' + plan + ' ' + interval)
  return id
}

export function planFromPriceId(id: string): { plan: PlanId; interval: Interval } | null {
  for (const plan of Object.keys(PRICES) as PlanId[]) {
    for (const interval of ['month', 'year'] as Interval[]) {
      if (process.env[PRICES[plan][interval].env] === id) return { plan, interval }
    }
  }
  return null
}
`,
  },
  {
    path: 'supabase/functions/_shared/guard.ts',
    content: `// Wraps untrusted text (scraped pages, engine answers) before it reaches a model.
export function wrapUntrusted(tag: string, text: string, maxChars: number): string {
  const closing = new RegExp('</\\\\s*' + tag + '\\\\s*>', 'gi')
  const clean = (text ?? '').replace(closing, '').slice(0, maxChars)
  return '<' + tag + '>\\n' + clean + '\\n</' + tag + '>'
}
`,
  },
  {
    path: 'README.md',
    content: `# Factorie

1. Save PRD.md, DESIGN_SYSTEM.md, DESIGN.md and LANDING.md in this folder.
2. Open Claude Code here and follow the playbook phase by phase.
3. Run the SQL in supabase/migrations/0001_init.sql once in the Supabase SQL Editor.
4. Set the Supabase secrets listed in .env.example.
5. Deploy the nine edge functions with npx supabase functions deploy <name> --no-verify-jwt.
6. Schedule the cron jobs (Backend phase task "Schedule the checks").
`,
  },
]

export const factorie: AppDef = {
  slug: 'factorie',
  name: 'Factorie',
  tagline: 'See where AI recommends you',
  oneLiner: 'Tracks whether ChatGPT, Perplexity, Gemini, Claude, DeepSeek and Grok recommend your brand for the questions buyers ask, who they name instead, and what to fix.',
  category: 'ai-agents',
  art: { motif: 'chart', tone: 'violet' },
  price: { monthly: 99, trialDays: 7 },
  difficulty: 3,
  buildHours: 30,
  apis: [
    {
      name: 'OpenRouter',
      job: 'sends each tracked prompt to ChatGPT, Perplexity, Gemini, Claude, DeepSeek and Grok through one API key, with web search on for the engines that have it',
      signupUrl: 'https://openrouter.ai',
      docsUrl: 'https://openrouter.ai/docs/quickstart',
      pricing: 'Checked Oct 2026: pay as you go credits, model prices passed through at each provider\'s rate plus about a 5.5% fee on card top-ups [verify]. Per Factorie check: gpt-5-mini with web search about $0.012, perplexity/sonar about $0.006, Gemini Flash with 3 Exa results about $0.015, Claude Haiku with web search about $0.011, DeepSeek about $0.001, Grok fast with search about $0.015. Set a credit limit on the key.',
      envVars: [
        { name: 'OPENROUTER_API_KEY', where: 'openrouter.ai > avatar > Keys > Create API key (sk-or-v1-...), with a credit limit', pasteInto: 'Supabase secrets', secret: true },
      ],
    },
    {
      name: 'Claude API',
      job: 'writes the brand summary and 20 buyer prompts, reads every engine answer for mentions and sentiment, and drafts weekly page recommendations, all as strict JSON',
      signupUrl: 'https://platform.claude.com',
      docsUrl: 'https://platform.claude.com/docs/en/build-with-claude/structured-outputs',
      pricing: 'Checked Oct 2026: claude-sonnet-5-5 $2 in / $10 out per million tokens (summary, prompts, recommendations); claude-haiku-5-5 $0.10 in / $0.50 out (answer parsing). About $0.30 per Starter customer a month in total. Prepaid credits.',
      envVars: [
        { name: 'ANTHROPIC_API_KEY', where: 'platform.claude.com > API keys > Create key (sk-ant-...)', pasteInto: 'Supabase secrets', secret: true },
      ],
    },
    {
      name: 'Firecrawl',
      job: 'maps a customer\'s website and reads up to 12 key pages as clean markdown during onboarding and the weekly recommendation refresh',
      signupUrl: 'https://www.firecrawl.dev',
      docsUrl: 'https://docs.firecrawl.dev/features/scrape',
      pricing: 'Checked Oct 2026: 1 credit per /v2/map call and 1 per scraped page. Free 500 one-off credits [verify]; Hobby about $16/month for about 3,000 credits [verify]; Standard $83/month for 100,000. About 35 credits per customer a month.',
      envVars: [
        { name: 'FIRECRAWL_API_KEY', where: 'firecrawl.dev dashboard > API Keys (fc-...)', pasteInto: 'Supabase secrets', secret: true },
      ],
    },
  ],
  idealFor: 'Founders who want a B2B product with a clear, urgent buyer: marketers, SEO agencies and ecommerce brands who have heard "AI search" and suspect ChatGPT never mentions them.',
  whyItSells: 'Buyers now ask ChatGPT "what is the best X for Y" and the answer names 3 to 7 brands. Factorie shows a marketer, in 10 minutes, that a competitor is named in 11 of 15 answers and they are named in 2, which is a $99 problem their boss already asked about. Each Starter customer costs about $7 a month to serve.',
  features: [
    'Onboarding reads your site and writes 20 buyer-style prompts you approve',
    'Weekly checks on ChatGPT, Perplexity, Gemini, Claude and DeepSeek (Grok on Growth)',
    'Visibility score, share of voice, average position and mention rate per engine',
    'Raw answers with your brand in green, competitors in red and every cited source',
    'Sources page that finds the sites mentioning competitors but not you',
    'Weekly page recommendations with outlines, from your own data',
    'Daily digest email and on-demand rechecks with live progress',
    'Free AI visibility audit page that doubles as your lead magnet',
  ],
  status: 'full',
  costs: {
    usage: { label: 'Tracked prompts per customer', unit: 'prompts', default: 25, min: 5, max: 60, step: 5 },
    plans: [
      { id: 'starter-monthly', name: 'Starter', price: 99, interval: 'month', includes: '1 brand, 25 tracked prompts, 5 engines (ChatGPT, Perplexity, Gemini, Claude, DeepSeek), weekly checks, 5 competitors, 5 rechecks a day, weekly recommendations, daily digest, CSV export' },
      { id: 'starter-yearly', name: 'Starter (yearly)', price: 990, interval: 'year', includes: 'Same as Starter, 2 months free' },
      { id: 'growth-monthly', name: 'Growth', price: 199, interval: 'month', includes: '3 brands, 60 tracked prompts, all 6 engines (adds Grok), weekly checks plus daily checks on 10 pinned prompts, 50 competitors per brand, 10 rechecks a day, on-demand recommendations, digest to 5 recipients' },
      { id: 'growth-yearly', name: 'Growth (yearly)', price: 1990, interval: 'year', includes: 'Same as Growth, 2 months free' },
    ],
    lines: [
      { name: 'Engine checks (5 engines, weekly)', vendor: 'OpenRouter', kind: 'perUnit', amount: 0.21, note: 'One prompt on the 5 Starter engines is $0.012 + $0.006 + $0.015 + $0.011 + $0.001 = $0.045. Weekly is 4.33 runs a month = $0.195, plus about 5.5% OpenRouter top-up fee = about $0.21 per prompt a month. Growth adds Grok ($0.015) and daily checks on pinned prompts: a pinned prompt costs about $1.95 a month. Re-check model prices on openrouter.ai every quarter. Checked Oct 2026.', url: 'https://openrouter.ai/models' },
      { name: 'Answer parsing (Claude Haiku 5.5)', vendor: 'Anthropic', kind: 'perUnit', amount: 0.007, note: 'About 1,800 input and 250 output tokens per answer at $0.10 / $0.50 per million = $0.0003, x 5 engines x 4.33 runs = $0.0065 per prompt a month. Refusals and off-topic answers skip this step. Checked Oct 2026.', url: 'https://platform.claude.com/docs/en/about-claude/pricing' },
      { name: 'On-demand rechecks', vendor: 'OpenRouter', kind: 'perCustomer', amount: 1.5, note: 'A recheck is one prompt on every enabled engine, about $0.049. Typical use is about 1 a day (30 a month = $1.47). The Starter worst case is 5 a day = $7.35, still inside the $15 monthly cap.' },
      { name: 'Summaries, prompt writing, recommendations (Claude Sonnet 5.5)', vendor: 'Anthropic', kind: 'perCustomer', amount: 0.3, note: 'Weekly recommendations about $0.06 x 4.33 = $0.26, plus the one-off brand summary ($0.026) and prompt generation ($0.023) spread over the first months. Checked Oct 2026.', url: 'https://platform.claude.com/docs/en/about-claude/pricing' },
      { name: 'Website reading', vendor: 'Firecrawl', kind: 'fixed', amount: 16, steps: [{ fromCustomers: 0, amount: 0 }, { fromCustomers: 1, amount: 16 }, { fromCustomers: 80, amount: 83 }], freeTier: '500 one-off credits for building [verify].', note: 'About 35 credits per customer a month (13 at onboarding, about 20 for weekly recommendation refreshes). Hobby (about 3,000 credits [verify]) covers about 80 customers, Standard ($83, 100,000 credits) covers about 2,800. Checked Oct 2026.', url: 'https://www.firecrawl.dev/pricing' },
      { name: 'Free AI visibility audits (lead magnet)', vendor: 'OpenRouter + Anthropic', kind: 'fixed', amount: 15, steps: [{ fromCustomers: 0, amount: 0 }, { fromCustomers: 1, amount: 15 }, { fromCustomers: 100, amount: 35 }, { fromCustomers: 500, amount: 65 }], note: 'Each audit is 15 checks plus one prompt-writing call, about $0.11. Budgeted at about 4 a day early on, rising with traffic. The hard cap of 40 a day (app_settings) limits the worst case to about $132 a month. Outbound audits you run yourself (50 a day = $5.50) are a sales cost on top of this.' },
      { name: 'Supabase', vendor: 'Supabase', kind: 'fixed', amount: 25, steps: [{ fromCustomers: 0, amount: 0 }, { fromCustomers: 1, amount: 25 }, { fromCustomers: 300, amount: 40 }, { fromCustomers: 1000, amount: 90 }], freeTier: 'Free plan for building (pauses after a week of no use, which also stops pg_cron).', note: 'Pro $25/month includes $10 compute credit (Micro). check_results grows about 2 MB per customer a month, trimmed after 180 days: Small compute (+$15) from about 300 customers, Medium (+$60) plus extra disk from about 1,000. Checked Oct 2026.', url: 'https://supabase.com/pricing' },
      { name: 'Vercel Pro', vendor: 'Vercel', kind: 'fixed', amount: 20, steps: [{ fromCustomers: 0, amount: 0 }, { fromCustomers: 1, amount: 20 }], freeTier: 'Hobby is free for non-commercial use only; move to Pro before charging.', note: '$20 per member per month including $20 of usage. One member is enough. Checked Oct 2026.', url: 'https://vercel.com/pricing' },
      { name: 'Transactional email', vendor: 'Resend', kind: 'fixed', amount: 0, steps: [{ fromCustomers: 0, amount: 0 }, { fromCustomers: 80, amount: 20 }, { fromCustomers: 1500, amount: 90 }], freeTier: '3,000 emails a month, 100 a day.', note: 'The daily digest is about 30 emails per customer a month, so the 100-a-day free limit runs out at about 80 customers. Pro is $20/month for 50,000 emails (about 1,500 customers); Scale is about $90 for 100,000. Checked Oct 2026.', url: 'https://resend.com/pricing' },
      { name: 'Domain', vendor: 'Porkbun', kind: 'fixed', amount: 1, note: 'A .com is about $11 a year, shown as $1 a month.', url: 'https://porkbun.com' },
    ],
    notes: [
      'Usage driver: tracked prompts per customer. Starter is 25; Growth is up to 60 with 10 checked daily.',
      'Starter at 25 prompts: 25 x ($0.21 + $0.007) = $5.43 for checks and parsing, plus $1.50 rechecks and $0.30 Claude Sonnet = about $7.20 a month of variable cost against $99 (about 89% margin after Stripe fees, before fixed costs).',
      'Starter is hard-capped at $15 of API spend a month in the database (plans.monthly_cost_cap_usd). At the cap, margin is still about 81% after Stripe fees.',
      'Growth at full use: 50 weekly prompts x $0.065 x 4.33 = $14.10, plus 10 daily pinned prompts x $0.065 x 30 = $19.50, about $33.60 plus rechecks, capped at $40 a month. At the cap, margin is about 76% after Stripe fees.',
      'The spec\'s "Unlimited" plan (unlimited prompts, daily checks) was renamed Growth with 60 prompts because one prompt checked daily on 6 engines costs about $1.95 a month: 100 daily prompts would cost more than the $199 price.',
      'The OpenRouter key has its own credit limit, and app_settings.global_daily_cap_usd ($50) stops all checks for the day if something goes wrong.',
      'Model slugs and prices change often. Re-check openrouter.ai/models and each vendor\'s pricing page every quarter and update the engines table.',
      'Stripe subscription fees are added by the calculator, not listed here.',
    ],
  },
  content: {
    buildPrd: buildPrd1 + buildPrd2 + buildPrd3,
    designPrd,
    landingPrd,
    sql,
    edgeFunctions,
    frontendTasks,
    backendTasks,
    securityTasks,
    marketing: { outbound, inbound, paid },
    launchTasks,
    repoTree,
    starterFiles,
  },
}
