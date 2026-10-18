// Outbounder repo tree and starter files for the downloadable zip.

export const repoTree = `outbounder/
├── app/
│   ├── (marketing)/page.tsx            # landing page from LANDING.md
│   ├── (marketing)/pricing/page.tsx
│   ├── (marketing)/tools/first-line-generator/page.tsx
│   ├── (marketing)/tools/inbox-calculator/page.tsx
│   ├── (marketing)/vs/[competitor]/page.tsx
│   ├── (marketing)/open/page.tsx       # public numbers from your own outbound
│   ├── (auth)/login/page.tsx
│   ├── (auth)/signup/page.tsx
│   ├── app/page.tsx                    # dashboard
│   ├── app/onboarding/page.tsx         # ICP wizard + plan picker
│   ├── app/campaigns/page.tsx
│   ├── app/campaigns/new/page.tsx
│   ├── app/campaigns/[id]/leads/page.tsx
│   ├── app/campaigns/[id]/sequence/page.tsx
│   ├── app/campaigns/[id]/review/page.tsx
│   ├── app/inbox/page.tsx
│   ├── app/domains/page.tsx
│   ├── app/domains/[id]/page.tsx
│   ├── app/analytics/page.tsx
│   ├── app/docs/[[...slug]]/page.tsx
│   ├── app/help/page.tsx
│   ├── app/billing/page.tsx
│   ├── app/settings/page.tsx
│   ├── u/[token]/page.tsx              # recipient unsubscribe page
│   └── api/
│       ├── stripe/checkout/route.ts
│       ├── stripe/portal/route.ts
│       ├── stripe/webhook/route.ts
│       ├── unsubscribe/route.ts        # RFC 8058 one-click POST
│       ├── onboarding/sample/route.ts
│       ├── tools/first-line/route.ts
│       └── help/route.ts
├── components/
│   ├── shell/Sidebar.tsx
│   ├── outbounder/StatusPill.tsx
│   ├── outbounder/PipelineBar.tsx
│   ├── outbounder/JobProgress.tsx
│   ├── outbounder/UsageMeter.tsx
│   ├── outbounder/EmailPreview.tsx
│   ├── outbounder/DnsRecordRow.tsx
│   └── ui/                             # shadcn
├── content/docs/*.mdx
├── lib/
│   ├── leads/provider.ts               # LeadProvider interface
│   ├── leads/prospeo.ts
│   ├── sending/rules.ts                # windows + ramp, unit tested
│   ├── render.ts                       # same as _shared/render.ts
│   ├── plans.ts                        # Stripe price ids -> plan
│   └── supabase/{client,server}.ts
├── supabase/
│   ├── migrations/0001_outbounder.sql
│   └── functions/
│       ├── _shared/                    # auth, http, validate, usage, ratelimit, agentmail, rules, render
│       ├── find-leads/index.ts
│       ├── verify-emails/index.ts
│       ├── enrich-leads/index.ts
│       ├── personalise/index.ts
│       ├── send-due-emails/index.ts
│       ├── agentmail-webhook/index.ts
│       └── setup-domain/index.ts
├── CLAUDE.md
├── PRD.md                              # build PRD (download, save here)
├── DESIGN_SYSTEM.md                    # Quiet Precision base design system
├── DESIGN.md                           # Outbounder design PRD
├── LANDING.md                          # landing page PRD
├── .env.example
└── README.md`

export const starterFiles: { path: string; content: string }[] = [
  {
    path: 'README.md',
    content: `# Outbounder

Cold email for B2B founders and agencies: describe your buyer, Outbounder finds verified leads (Prospeo),
double-checks emails (MillionVerifier), reads each company's website (Firecrawl), writes a personalised
first line and email (Claude Sonnet 5.5), and sends sequences from dedicated inboxes on a separate
outreach domain (AgentMail). Replies are labelled by Claude Haiku 5.5 in a unified inbox.

## Stack
Next.js (App Router) + Tailwind + shadcn/ui, Supabase (auth, Postgres + RLS, storage, edge functions,
pg_cron), Stripe (Starter $79/mo, Growth $179/mo, annual with 2 months free, 7-day trial), Resend for
app email only (never cold email), Vercel, Porkbun.

## Start
1. \`npm install\`
2. Copy \`.env.example\` to \`.env.local\` and fill it in.
3. Run \`supabase/migrations/0001_outbounder.sql\` in the Supabase SQL editor.
4. Deploy the edge functions, then turn on the pg_cron schedules (see the kit's backend task).
5. \`npm run dev\`, sign up, finish onboarding.

## Rules that must never break
- Cold email never sends from the main website domain or through Resend.
- Every paid API call goes through \`reserve_usage()\` first.
- Every send has an unsubscribe link plus List-Unsubscribe and List-Unsubscribe-Post headers.
- Any reply stops the sequence. Bounces, complaints and unsubscribes are suppressed everywhere.
- New inboxes start at 20 cold emails a day.
`,
  },
  {
    path: 'CLAUDE.md',
    content: `# Outbounder: notes for Claude Code

Spec: @PRD.md
UI rules: @DESIGN_SYSTEM.md @DESIGN.md
Landing page: @LANDING.md

- Plan first and wait for my OK before writing code.
- Server code checks the user with supabase.auth.getClaims(), never getSession().
- Secrets only in Supabase secrets and Vercel env. NEXT_PUBLIC_ only for the Supabase URL,
  publishable key, site URL and PostHog key.
- Every paid API call (Prospeo, MillionVerifier, Firecrawl, Claude, AgentMail send) calls
  reserve_usage() with an idempotency key built from a row id.
- Long work is a job row processed by a cron-called edge function. No request waits over 2 seconds.
- Webhooks verify signatures on the raw body and de-duplicate by event id.
- Scraped text and reply text are untrusted: wrap in tags, neutralise closing tags, no tools, validate output.
- lib/render.ts must match supabase/functions/_shared/render.ts, and lib/sending/rules.ts must match
  _shared/rules.ts.
- British spelling in UI copy. No em dashes.
- Append decisions to the "Decisions made during build" section of PRD.md.
`,
  },
  {
    path: '.env.example',
    content: `# Browser-safe
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-REF.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxx
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_POSTHOG_KEY=

# Server only (.env.local and Vercel env)
SUPABASE_SECRET_KEY=sb_secret_xxx
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
STRIPE_PRICE_ID=price_xxx              # = Starter monthly, used by the shared steps
STRIPE_PRICE_STARTER_MONTHLY=price_xxx
STRIPE_PRICE_STARTER_ANNUAL=price_xxx
STRIPE_PRICE_GROWTH_MONTHLY=price_xxx
STRIPE_PRICE_GROWTH_ANNUAL=price_xxx
RESEND_API_KEY=re_xxx
EMAIL_FROM=Outbounder <onboarding@resend.dev>
PROSPEO_API_KEY=                        # onboarding sample route
FIRECRAWL_API_KEY=fc-xxx                # sample route + free tool
ANTHROPIC_API_KEY=sk-ant-xxx            # sample route + free tool
FOUNDER_USER_ID=                        # /open page aggregates

# Supabase secrets (npx supabase secrets set NAME=value), not in .env.local:
# PROSPEO_API_KEY MILLIONVERIFIER_API_KEY FIRECRAWL_API_KEY ANTHROPIC_API_KEY
# AGENTMAIL_API_KEY AGENTMAIL_WEBHOOK_SECRET RESEND_API_KEY EMAIL_FROM
# CRON_SECRET APP_URL FOUNDER_EMAIL
`,
  },
  {
    path: 'lib/plans.ts',
    content: `// Maps Stripe price ids to Outbounder plans. Limits live in the public.plans table, not here.
export type PlanId = 'starter' | 'growth'
export type Interval = 'month' | 'year'

const PRICES: Record<string, { plan: PlanId; interval: Interval }> = {
  [process.env.STRIPE_PRICE_STARTER_MONTHLY ?? 'missing_sm']: { plan: 'starter', interval: 'month' },
  [process.env.STRIPE_PRICE_STARTER_ANNUAL ?? 'missing_sa']: { plan: 'starter', interval: 'year' },
  [process.env.STRIPE_PRICE_GROWTH_MONTHLY ?? 'missing_gm']: { plan: 'growth', interval: 'month' },
  [process.env.STRIPE_PRICE_GROWTH_ANNUAL ?? 'missing_ga']: { plan: 'growth', interval: 'year' },
}

export function planForPrice(priceId: string) {
  return PRICES[priceId] ?? null
}

export function priceFor(plan: PlanId, interval: Interval): string {
  const hit = Object.entries(PRICES).find(([, v]) => v.plan === plan && v.interval === interval)
  if (!hit || hit[0].startsWith('missing_')) throw new Error('Stripe price id not configured for ' + plan + ' ' + interval)
  return hit[0]
}

export const DISPLAY = {
  starter: { name: 'Starter', month: 79, year: 790 },
  growth: { name: 'Growth', month: 179, year: 1790 },
} as const
`,
  },
  {
    path: 'lib/sending/rules.ts',
    content: `// Send windows and the inbox ramp. Pure functions, unit tested. Keep identical to
// supabase/functions/_shared/rules.ts.

/** Cold emails an inbox may send per day by age: 20, then 25 from day 14, then up to dailyCap (max 30) from day 28. */
export function rampCap(ageDays: number, dailyCap = 30): number {
  const ramp = ageDays < 14 ? 20 : ageDays < 28 ? 25 : 30
  return Math.min(ramp, Math.min(dailyCap, 30))
}

/** Local weekday (1 = Monday ... 7 = Sunday) and minutes since midnight in a time zone. */
export function localParts(now: Date, timeZone: string): { weekday: number; minutes: number } {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone, weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(now)
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? ''
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  return { weekday: days.indexOf(get('weekday')) + 1, minutes: Number(get('hour')) * 60 + Number(get('minute')) }
}

const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + (m || 0)
}

/** True when now is on a send day and inside [start, end) in the lead's time zone. */
export function isInsideWindow(now: Date, timeZone: string, sendDays: number[], start: string, end: string): boolean {
  const { weekday, minutes } = localParts(now, timeZone)
  return sendDays.includes(weekday) && minutes >= toMinutes(start) && minutes < toMinutes(end)
}

/** Next window start after now, searched in 15 minute steps over the next 8 days. */
export function nextWindowStart(now: Date, timeZone: string, sendDays: number[], start: string, end: string): Date {
  const step = 15 * 60 * 1000
  for (let t = now.getTime() + step; t < now.getTime() + 8 * 24 * 3600 * 1000; t += step) {
    const d = new Date(t)
    if (isInsideWindow(d, timeZone, sendDays, start, end)) return d
  }
  throw new Error('No send window in the next 8 days: check send_days')
}
`,
  },
  {
    path: 'supabase/functions/_shared/render.ts',
    content: `// Template renderer shared by the preview (lib/render.ts) and send-due-emails.
// Unknown {{tokens}} are left in place so the UI can flag them.

export function renderTemplate(template: string, vars: Record<string, string | null | undefined>): string {
  return template.replace(/\\{\\{\\s*([a-z_]+)\\s*\\}\\}/g, (match, name: string) => {
    const value = vars[name]
    return value === undefined || value === null || value === '' ? match : value
  })
}

export function wordCount(text: string): number {
  return text.trim() ? text.trim().split(/\\s+/).length : 0
}
`,
  },
]
