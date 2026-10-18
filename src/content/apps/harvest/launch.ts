// Harvest launch tasks, repo tree and starter files.
import type { Task } from '../../types'

export const launchTasks: Task[] = [
  {
    id: 'hrv-launch-live',
    title: 'Switch the data vendors and Stripe to production',
    outcome: 'Paid vendor plans, live Stripe prices mapped to Harvest plans, a sending domain for digests and alerts that reach you before customers notice.',
    minutes: 60,
    xp: 55,
    blocks: [
      { type: 'callout', tone: 'eli5', title: 'Free tiers are for building', text: 'Apify\'s free $5 a month and test Stripe keys were fine while you built. A real customer\'s 3am harvest must never stop because a free credit ran out, so every vendor moves to a paid plan with a spend limit, and every alert goes to your inbox.' },
      { type: 'steps', items: [
        'Apify: upgrade to Starter (Console > Settings > Plan) and set a monthly usage limit at about 1.5 times your expected spend [verify menu names].',
        'Prospeo: confirm the plan has enough credits for your customers\' enrichment caps this month (sum of plan caps x 1.1). Turn on any auto top-up only if it has a ceiling.',
        'MillionVerifier: keep at least 5,000 credits; the Monday check emails you under 2,000.',
        'Anthropic: raise the monthly spend limit to about $0.05 per customer per month plus a buffer (Haiku costs are tiny here).',
        'Resend: verify a subdomain for digests (Resend > Domains > Add domain > mail.yourdomain.com, add the DNS records at Porkbun). Send digests from digest@mail.yourdomain.com.',
        'Stripe live mode: create the 6 prices (Solo, Growth, Agency, monthly and yearly), copy their price ids, and map them with the SQL below. Redeploy Vercel after updating the price env vars.',
        'Re-open each Apify actor page and check the input fields and price are unchanged since you built. Update @PRD.md 12.1 if not.',
      ] },
      { type: 'code', id: 'hrv-launch-live-sql', filename: 'go-live.sql', lang: 'sql', code: `-- Map your LIVE Stripe price ids to plans (replace with your live price_ ids):
insert into public.plan_prices (price_id, plan, interval) values
  ('price_live_solo_m', 'solo', 'month'),     ('price_live_solo_y', 'solo', 'year'),
  ('price_live_growth_m', 'growth', 'month'), ('price_live_growth_y', 'growth', 'year'),
  ('price_live_agency_m', 'agency', 'month'), ('price_live_agency_y', 'agency', 'year')
on conflict (price_id) do update set plan = excluded.plan, interval = excluded.interval;

-- Check your own live subscription resolves to the right plan:
select l.* from public.workspaces w, lateral public.plan_limits(w.id) l
where w.owner_id = (select id from auth.users where email = 'you@yourdomain.com');` },
      { type: 'mistakes', items: [
        { mistake: 'Every customer acts like Solo in production.', fix: 'plan_prices still holds your test price ids. Run the SQL above with the live ids.' },
        { mistake: 'Digests land in spam.', fix: 'The sending subdomain is not verified, or DMARC is missing. Resend > Domains must show Verified for SPF and DKIM; add a DMARC TXT record (v=DMARC1; p=none) at Porkbun.' },
        { mistake: 'A 3am harvest fails with Apify 402.', fix: 'The usage limit was hit. Raise it in the Apify Console and run hv-collect by hand; the posts are still due and collect on the next tick.' },
      ] },
    ],
    checklist: [
      { id: 'hrv-launch-live-c1', label: 'Upgrade Apify and set a usage limit' },
      { id: 'hrv-launch-live-c2', label: 'Check Prospeo, MillionVerifier and Anthropic balances and limits' },
      { id: 'hrv-launch-live-c3', label: 'Verify the digest sending subdomain in Resend' },
      { id: 'hrv-launch-live-c4', label: 'Map live Stripe prices to plans', trigger: 'copy:hrv-launch-live-sql' },
    ],
  },
  {
    id: 'hrv-launch-margin',
    title: 'Set up the morning health and margin check',
    outcome: 'One SQL query you run each morning in the first month that shows failed steps, empty runs and each workspace\'s cost against its plan price.',
    minutes: 30,
    xp: 35,
    blocks: [
      { type: 'callout', tone: 'eli5', title: 'Know your margin per customer', text: 'Harvest\'s costs grow with usage, so check that no workspace costs more than a quarter of what it pays. The ledger already records every cent spent, so one query shows it.' },
      { type: 'code', id: 'hrv-launch-margin-sql', filename: 'morning-check.sql', lang: 'sql', code: `-- 1. Last night's runs: anything failed, skipped for no reason, or not sent?
select w.name, r.run_date, r.status, r.counters ->> 'collected' as collected,
       r.counters ->> 'enriched' as enriched, r.digest_sent_at
from public.daily_runs r join public.workspaces w on w.id = r.workspace_id
where r.run_date >= current_date - 1 order by r.status, w.name;

-- 2. Dead jobs in the last day, by kind and error
select kind, left(last_error, 80) as error, count(*) from public.jobs
where status = 'dead' and finished_at > now() - interval '1 day' group by 1, 2 order by 3 desc;

-- 3. Cost this period per workspace vs plan price (target: cost under 25% of price)
with cost as (
  select workspace_id, sum(cost_micros) / 1e6 as dollars from public.usage_ledger
  where created_at >= date_trunc('month', now()) group by 1)
select w.name, l.plan, round(c.dollars, 2) as cost_usd,
       case l.plan when 'agency' then 249 when 'growth' then 129 else 59 end as price_usd,
       round(100 * c.dollars / case l.plan when 'agency' then 249 when 'growth' then 129 else 59 end, 1) as cost_pct
from cost c join public.workspaces w on w.id = c.workspace_id, lateral public.plan_limits(w.id) l
order by cost_pct desc;` },
      { type: 'steps', items: [
        'Save the query in Supabase > SQL Editor as "Morning check" (star it).',
        'Run it every morning before 9am for the first month.',
        'Any workspace above 25% cost: check its sources (one giant influencer post can eat a month of engagers) and its threshold (too low means paying to enrich poor fits).',
        'Any run failed or not sent: open the jobs errors, fix, and email the customer before they notice: "Your digest was late today because X. It is fixed."',
      ] },
      { type: 'mistakes', items: [
        { mistake: 'Cost looks far higher than the Apify bill.', fix: 'Metering counts at list price ($2 per 1,000 and $0.02 per enrichment). Compare with the vendor dashboards weekly; if you are on a cheaper Prospeo plan, real cost is lower than the ledger, which is the safe direction.' },
        { mistake: 'Runs show skipped for paying customers.', fix: 'has_active_access is false: their subscriptions row is missing or the status is past_due. Check the Stripe webhook logs.' },
        { mistake: 'Every run fails at once.', fix: 'Usually a vendor: Apify actor changed its output, or credits ran out. The anomaly alert should have emailed you; check the actor page and the alert email.' },
      ] },
    ],
    checklist: [
      { id: 'hrv-launch-margin-c1', label: 'Save the morning check query', trigger: 'copy:hrv-launch-margin-sql' },
      { id: 'hrv-launch-margin-c2', label: 'Run it every morning for the first month' },
    ],
  },
]

export const repoTree = `harvest/
├── app/
│   ├── (marketing)/page.tsx                 # landing (LANDING.md)
│   ├── (marketing)/pricing/page.tsx
│   ├── (marketing)/compare/[competitor]/page.tsx
│   ├── (marketing)/alternatives/[competitor]/page.tsx
│   ├── (marketing)/tools/post-lead-estimator/page.tsx
│   ├── (auth)/login/page.tsx
│   ├── (auth)/signup/page.tsx
│   ├── (auth)/reset/page.tsx
│   ├── invite/[token]/page.tsx
│   ├── onboarding/page.tsx
│   ├── paywall/page.tsx
│   ├── app/today/page.tsx
│   ├── app/leads/page.tsx                   # + side panel (?lead=)
│   ├── app/sources/page.tsx
│   ├── app/sources/[id]/page.tsx
│   ├── app/lists/page.tsx
│   ├── app/lists/[id]/page.tsx
│   ├── app/targeting/page.tsx               # ICP + Suppression tabs
│   ├── app/docs/page.tsx
│   ├── app/help/page.tsx
│   ├── app/billing/page.tsx
│   ├── app/settings/page.tsx
│   └── api/
│       ├── icp/draft/route.ts
│       ├── export/[listId]/route.ts
│       ├── export/leads/route.ts
│       ├── contact/route.ts
│       ├── unsubscribe/route.ts
│       └── stripe/{webhook,checkout,portal}/route.ts
├── components/
│   ├── harvest/{RunStatus,CountCell,TierPill,ScoreCell,EngagementLine,OpenerBox,
│   │            EmailStatus,UsageMeter,UrlPreviewRow,LeadPanel,SelectionBar}.tsx
│   ├── marketing/                           # one component per landing section
│   └── ui/                                  # shadcn/ui themed to DESIGN_SYSTEM.md
├── lib/
│   ├── plans.ts                             # prices, caps, price id -> plan
│   ├── linkedin.ts                          # URL parser (copy of the _shared one)
│   ├── csv.ts                               # export with formula neutralising
│   ├── workspace.ts
│   └── supabase/{client,server,admin}.ts
├── supabase/
│   ├── migrations/0001_harvest.sql
│   └── functions/
│       ├── _shared/                         # admin, auth, http, log, retry, clock, jobs, meter,
│       │   │                                # limits, claude, untrusted, email, linkedin, crypto
│       │   ├── providers/{apify,apify-map,prospeo,millionverifier,crm}.ts
│       │   ├── providers/fixtures/{reactions,comments,posts}.json
│       │   └── templates/digest.ts
│       ├── hv-add-source/
│       ├── hv-scheduler/
│       ├── hv-collect/
│       ├── hv-apify-webhook/
│       ├── hv-ingest/
│       ├── hv-enrich/
│       ├── hv-score/
│       ├── hv-digest/
│       └── hv-push/
├── CLAUDE.md                                # UI rules: @DESIGN_SYSTEM.md @DESIGN.md
├── PRD.md                                   # build PRD (download, save here)
├── DESIGN_SYSTEM.md                         # Quiet Precision base system
├── DESIGN.md                                # Harvest accent + screens
├── LANDING.md                               # landing page PRD
├── .env.example
└── README.md`

export const starterFiles: { path: string; content: string }[] = [
  {
    path: 'README.md',
    content: `# Harvest

Warm leads from LinkedIn posts, every morning. Track the posts and creators you choose (yours, competitors',
influencers in your niche). Every night Harvest collects who reacted and commented, filters them against your ICP,
enriches the fits with role, company, size and a verified email, scores them with Claude and emails you the top 20
with an opener that mentions what they engaged with. Export CSV, push to HubSpot or Pipedrive, or send signed webhooks.

Harvest never logs in to LinkedIn as the user and never contacts leads.

## Stack
Next.js (App Router) + Tailwind + shadcn/ui, Supabase (auth, Postgres + RLS, storage, edge functions, pg_cron,
pg_net, realtime), Apify actors (collection), Prospeo (enrichment), MillionVerifier (email verification),
Claude API claude-haiku-5-5 (prefilter, scoring, openers), Resend (digest + transactional), Stripe, Vercel.

## Start
1. \`npm install\`
2. Copy \`.env.example\` to \`.env.local\` and fill it in.
3. Run \`supabase/migrations/0001_harvest.sql\` in the Supabase SQL editor once.
4. Set the edge function secrets listed at the bottom of \`.env.example\`.
5. \`npm run dev\`, sign up, finish onboarding, add one post with Collect now.
`,
  },
  {
    path: '.env.example',
    content: `# Browser + server (Next.js). Copy to .env.local.
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_POSTHOG_KEY=
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
NEXT_PUBLIC_STRIPE_PRICE_SOLO_MONTH=
NEXT_PUBLIC_STRIPE_PRICE_SOLO_YEAR=
NEXT_PUBLIC_STRIPE_PRICE_GROWTH_MONTH=
NEXT_PUBLIC_STRIPE_PRICE_GROWTH_YEAR=
NEXT_PUBLIC_STRIPE_PRICE_AGENCY_MONTH=
NEXT_PUBLIC_STRIPE_PRICE_AGENCY_YEAR=

# Server only (Next.js, never NEXT_PUBLIC_)
SUPABASE_SECRET_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
ANTHROPIC_API_KEY=
RESEND_API_KEY=
UNSUBSCRIBE_SECRET=
ADMIN_EMAIL=

# Edge function secrets (set with: npx supabase secrets set NAME=value)
# APIFY_TOKEN, APIFY_WEBHOOK_SECRET, APIFY_REACTIONS_ACTOR, APIFY_COMMENTS_ACTOR, APIFY_POSTS_ACTOR,
# PROSPEO_API_KEY, MILLIONVERIFIER_API_KEY, ANTHROPIC_API_KEY, RESEND_API_KEY,
# INTEGRATIONS_ENCRYPTION_KEY, CRON_SECRET, UNSUBSCRIBE_SECRET, APP_URL, ADMIN_EMAIL
`,
  },
  {
    path: 'CLAUDE.md',
    content: `# Harvest

Read @PRD.md before every task. We build milestone by milestone (PRD section 21). Plan first, then wait for my OK.

UI rules: @DESIGN_SYSTEM.md @DESIGN.md

## Rules
- Supabase: publishable key in the browser, secret key only on the server. Check users with supabase.auth.getClaims().
- Every table has RLS. Never add an insert or update policy to people, engagements, usage_ledger, jobs, subscriptions.
- Every paid vendor call goes through supabase/functions/_shared/providers/ with withRetry and is metered with meter().
- Every headline, comment and post excerpt sent to Claude is wrapped with wrapUntrusted(). No tools for the model.
- Workers stop at 45 seconds (deadline()). Every job and webhook is idempotent.
- Harvest never logs in to LinkedIn and never contacts leads. Do not add features that do.
- British spelling in UI copy. Sentence case. No em dashes.
`,
  },
  {
    path: 'lib/plans.ts',
    content: `// Harvest plans. Display mirror of public.plan_limits(); the database is the real guard.
export type PlanId = 'solo' | 'growth' | 'agency'

export interface Plan {
  id: PlanId
  name: string
  monthly: number
  yearly: number
  seats: number
  sources: number
  engagements: number
  enrichments: number
  icps: number
  crmPush: boolean
}

export const PLANS: Plan[] = [
  { id: 'solo', name: 'Solo', monthly: 59, yearly: 590, seats: 1, sources: 15, engagements: 1500, enrichments: 300, icps: 1, crmPush: false },
  { id: 'growth', name: 'Growth', monthly: 129, yearly: 1290, seats: 3, sources: 50, engagements: 4000, enrichments: 600, icps: 3, crmPush: true },
  { id: 'agency', name: 'Agency', monthly: 249, yearly: 2490, seats: 10, sources: 150, engagements: 10000, enrichments: 950, icps: 10, crmPush: true },
]

export const TRIAL = { days: 7, sources: 5, engagements: 300, enrichments: 40 }

export function planFromPriceId(priceId: string | null | undefined): PlanId {
  const env = process.env
  const map: Record<string, PlanId> = {}
  for (const [key, plan] of [
    ['NEXT_PUBLIC_STRIPE_PRICE_SOLO_MONTH', 'solo'], ['NEXT_PUBLIC_STRIPE_PRICE_SOLO_YEAR', 'solo'],
    ['NEXT_PUBLIC_STRIPE_PRICE_GROWTH_MONTH', 'growth'], ['NEXT_PUBLIC_STRIPE_PRICE_GROWTH_YEAR', 'growth'],
    ['NEXT_PUBLIC_STRIPE_PRICE_AGENCY_MONTH', 'agency'], ['NEXT_PUBLIC_STRIPE_PRICE_AGENCY_YEAR', 'agency'],
  ] as const) {
    const id = env[key]
    if (id) map[id] = plan
  }
  return (priceId && map[priceId]) || 'solo'
}
`,
  },
  {
    path: 'supabase/functions/_shared/linkedin.ts',
    content: `// LinkedIn URL parsing shared by hv-add-source and lib/linkedin.ts. See PRD 8.1 and 11.1.
export type Parsed = { kind: 'post' | 'creator'; urlKey: string; canonicalUrl: string }

const POST_PATTERNS: [RegExp, string][] = [
  [/urn:li:activity:(\\d{19})/, 'activity'],
  [/activity-(\\d{19})/, 'activity'],
  [/urn:li:share:(\\d{19})/, 'share'],
  [/urn:li:ugcPost:(\\d{19})/, 'ugcPost'],
]

export function parseLinkedInUrl(input: string): Parsed | null {
  let url: URL
  try { url = new URL(input.trim()) } catch { return null }
  if (!/(^|\\.)linkedin\\.com$/i.test(url.hostname)) return null
  const raw = decodeURIComponent(url.pathname + url.search)
  for (const [re, type] of POST_PATTERNS) {
    const m = raw.match(re)
    if (m) {
      const key = type + ':' + m[1]
      return { kind: 'post', urlKey: key, canonicalUrl: 'https://www.linkedin.com/feed/update/urn:li:' + key + '/' }
    }
  }
  const profile = url.pathname.match(/^\\/(in|company)\\/([^/?#]+)/i)
  if (profile) {
    const type = profile[1].toLowerCase()
    const id = decodeURIComponent(profile[2]).toLowerCase()
    return { kind: 'creator', urlKey: type + ':' + id, canonicalUrl: 'https://www.linkedin.com/' + type + '/' + id + '/' }
  }
  return null
}

export function personKey(profileUrl: string): string | null {
  const m = profileUrl.match(/linkedin\\.com\\/in\\/([^/?#]+)/i)
  if (m) return decodeURIComponent(m[1]).toLowerCase()
  const urn = profileUrl.match(/(ACo[A-Za-z0-9_-]+)/)
  return urn ? 'urn:' + urn[1] : null
}
`,
  },
]
