// Retain launch tasks, repo tree and starter files.
import type { Task } from '../../types'

export const launchTasks: Task[] = [
  {
    id: 'rtn-launch-live',
    title: 'Switch the Stripe App, webhooks and schedules to live',
    outcome: 'Real founders can install Retain on their live Stripe, live events arrive, and every background job runs on its timer.',
    minutes: 75,
    xp: 60,
    blocks: [
      { type: 'callout', tone: 'eli5', title: 'Test and live are two separate worlds', text: 'Everything so far used test mode: fake customers, fake money. Live mode has its own install link, its own webhook secret and its own secret key. Nothing copies over by itself, so you set each one up again and swap the values.' },
      { type: 'steps', items: [
        'Stripe (live mode) > Apps > Retain: add https://yourdomain.com/api/stripe/callback to allowed_redirect_uris in stripe-app.json, bump the version, run stripe apps upload, then submit the app for review from the Publish tab (see the marketplace task). Until approved, use the External test live link for the founders you invite [verify].',
        'Copy the live install link into Vercel env (Production) as STRIPE_APP_INSTALL_URL_LIVE.',
        'Stripe (live mode) > Workbench > Event destinations > Add destination > Connected accounts, same events as PRD 6.3, URL rt-stripe-events. Copy its whsec_ into Supabase secrets as STRIPE_APP_WEBHOOK_SECRET_LIVE.',
        'Supabase secrets: add STRIPE_SECRET_KEY_LIVE (your sk_live_ key, used only for the token exchange) and set APP_URL to https://yourdomain.com. Redeploy every edge function (npx supabase functions deploy).',
        'Set CRON_SECRET in Supabase secrets if you have not, then open the migration, copy section 22 (SCHEDULES), replace <ref> and <CRON_SECRET>, remove the leading "-- " from each line and run it in the SQL editor.',
        'Install Retain on your own live Stripe (or a friend\'s small SaaS with permission), check the import, then make a real $1 failed payment test: a live customer with a card you then remove, and recover it with your own card.',
      ] },
      { type: 'code', id: 'rtn-launch-live-sql', filename: 'go-live-check.sql', lang: 'sql', code: `-- Schedules are in place (7 jobs).
select jobname, schedule, active from cron.job order by jobname;

-- The live connection is active and syncing.
select account_id, livemode, status, last_synced_at from public.stripe_connections where livemode;

-- Live events arrive and get processed.
select type, count(*), max(received_at) from public.stripe_events
where livemode and received_at > now() - interval '1 hour' group by type;

-- Map your LIVE price ids for Retain's own plans (replace with your live price_ ids):
insert into public.plan_prices (price_id, plan) values
  ('price_live_starter_m', 'starter'), ('price_live_starter_y', 'starter'),
  ('price_live_growth_m', 'growth'), ('price_live_growth_y', 'growth'),
  ('price_live_scale_m', 'scale'), ('price_live_scale_y', 'scale')
on conflict (price_id) do update set plan = excluded.plan;` },
      { type: 'mistakes', items: [
        { mistake: 'Live install fails at the token exchange with "No such application" or invalid_grant.', fix: 'The edge function used the test secret key for a live code. Check rt-stripe-connect picks STRIPE_SECRET_KEY_LIVE when livemode is true, and that the secret is set.' },
        { mistake: 'cron.job is empty after running section 22.', fix: 'The lines were still commented out. Every line of each select cron.schedule(...) must start without "-- ". Run them one at a time and read any error.' },
        { mistake: 'Plans all act like Starter in production.', fix: 'plan_prices still holds test price ids. Insert your live price ids with the SQL above.' },
      ] },
    ],
    checklist: [
      { id: 'rtn-launch-live-c1', label: 'Upload the live manifest and copy the live install link' },
      { id: 'rtn-launch-live-c2', label: 'Create the live connected-accounts event destination' },
      { id: 'rtn-launch-live-c3', label: 'Add the live secrets and redeploy every function' },
      { id: 'rtn-launch-live-c4', label: 'Turn on the schedules and run the go-live SQL', trigger: 'copy:rtn-launch-live-sql' },
    ],
  },
  {
    id: 'rtn-launch-first10',
    title: 'Onboard your first 10 founders by hand',
    outcome: 'Ten live workspaces with dunning on, a cancel flow installed and a 7 day check-in that shows each founder their saved MRR.',
    minutes: 180,
    xp: 70,
    blocks: [
      { type: 'p', text: 'Retain only proves itself once dunning and the cancel flow are switched on. Most founders stall at "add the cancel button to my app". Do that part with them on a call.' },
      { type: 'steps', items: [
        'Book a 30 minute setup call with each new trial. Share screens: install on live Stripe together, edit the day 0 dunning email, turn it on.',
        'Do the cancel flow install with them: generate the signing secret, paste the signing code into their backend, swap their Cancel button. Test it on a test customer before you hang up.',
        'Set up two offers with them: Pause 1 month for "Not using it enough" and 20% off for 3 months for "Too expensive".',
        'Day 3: email them their top 5 High-risk customers with one suggested action each (from the AI summaries).',
        'Day 7: send a screenshot of their dashboard: recovered payments, saves, MRR at risk. Ask: "Is this worth $X a month to you?"',
        'Write down every place they got stuck and fix the top one each week.',
      ] },
      { type: 'code', id: 'rtn-launch-first10-email', filename: 'day7-email.txt', lang: 'txt', code: `Subject: your first week on Retain

{{firstname}}, here is {{product}}'s first week:
- {{recovered}} recovered from {{n_cases}} failed payments
- {{saves}} of {{sessions}} people who clicked Cancel took an offer ({{saved_mrr}} of MRR kept)
- {{at_risk}} of MRR is at risk right now; the top 3 are {{names}}, all with cards expiring before renewal

Your trial ends on {{date}}. At your MRR it's the {{plan}} plan at {{price}}/month.
Anything that felt clunky this week? Reply and I'll fix it.` },
      { type: 'table', head: ['Metric', 'Target for the first 10', 'If you miss it'], rows: [
        ['Dunning switched on in week 1', '9 of 10', 'Make it a step in onboarding you do for them'],
        ['Cancel flow live in week 1', '6 of 10', 'Write a framework guide for their stack (Next.js, Rails, Laravel)'],
        ['Trial to paid', '6 of 10', 'Move the day 7 email to day 5 and lead with recovered money'],
        ['Saved + recovered in month 1 vs price', '3x or more', 'Check offer rules and dunning copy with them'],
      ] },
    ],
    checklist: [
      { id: 'rtn-launch-first10-c1', label: 'Run 10 setup calls with dunning on before you hang up' },
      { id: 'rtn-launch-first10-c2', label: 'Get the cancel flow live for at least 6 founders' },
      { id: 'rtn-launch-first10-c3', label: 'Copy and send the day 7 email', trigger: 'copy:rtn-launch-first10-email' },
    ],
  },
]

export const repoTree = `retain/
├── app/
│   ├── (marketing)/page.tsx              # landing (LANDING.md)
│   ├── (marketing)/pricing/page.tsx
│   ├── (marketing)/churn-calculator/page.tsx
│   ├── (marketing)/vs/[competitor]/page.tsx
│   ├── (marketing)/guides/[slug]/page.tsx
│   ├── (marketing)/open/page.tsx         # public totals
│   ├── (auth)/login/page.tsx
│   ├── (auth)/signup/page.tsx
│   ├── invite/[token]/page.tsx
│   ├── onboarding/page.tsx
│   ├── paywall/page.tsx
│   ├── app/page.tsx                      # Dashboard
│   ├── app/customers/page.tsx
│   ├── app/customers/[id]/page.tsx       # side panel + full page
│   ├── app/recovery/page.tsx
│   ├── app/cancel-flow/page.tsx
│   ├── app/win-back/page.tsx
│   ├── app/usage/page.tsx
│   ├── app/docs/[[...slug]]/page.tsx
│   ├── app/help/page.tsx
│   ├── app/billing/page.tsx
│   ├── app/settings/page.tsx
│   ├── c/start/page.tsx                  # cancel page entry (public)
│   ├── c/[sessionId]/page.tsx            # cancel page (public, framed)
│   ├── u/[token]/page.tsx                # update-card page (public)
│   ├── u/[token]/done/page.tsx
│   ├── unsubscribe/[token]/page.tsx
│   └── api/
│       ├── stripe/install/route.ts       # OAuth state + redirect
│       ├── stripe/callback/route.ts      # state check -> rt-stripe-connect
│       ├── billing/checkout/route.ts     # Retain's own plans
│       ├── billing/portal/route.ts
│       ├── billing/webhook/route.ts
│       ├── keys/rotate/route.ts          # signing + ingest secrets
│       ├── resend/webhook/route.ts       # bounces, complaints, opens
│       └── customers/export/route.ts
├── components/
│   ├── shell/Sidebar.tsx
│   ├── risk/ScoreCell.tsx
│   ├── risk/RiskTag.tsx
│   ├── customers/CustomerTable.tsx
│   ├── customers/CustomerPanel.tsx
│   ├── cancel/OfferDialog.tsx
│   ├── meters/PlanMeter.tsx
│   └── ui/                               # shadcn/ui on Quiet Precision tokens
├── lib/
│   ├── supabase/{client,server}.ts
│   ├── brand.ts                          # brand colour -> accent, contrast fix
│   ├── emails/dunning.tsx
│   ├── money.ts
│   └── plans.ts
├── public/
│   ├── embed.v1.js                       # cancel flow embed
│   └── t.js                              # usage snippet
├── scripts/
│   ├── seed-stripe.ts                    # test-mode founder data
│   └── security-cancel.ts
├── stripe-app/
│   └── stripe-app.json                   # Stripe App manifest (OAuth)
├── supabase/
│   ├── migrations/0001_retain.sql
│   └── functions/
│       ├── _shared/                      # admin, auth, http, crypto, stripe, limits, meter, jobs, claude, email
│       ├── rt-stripe-connect/
│       ├── rt-stripe-events/
│       ├── rt-sync-worker/handlers/
│       ├── rt-score/
│       ├── rt-explain/
│       ├── rt-ingest/
│       ├── rt-cancel-flow/
│       ├── rt-update-card/
│       └── rt-email-worker/
├── CLAUDE.md
├── PRD.md                                # build PRD
├── DESIGN_SYSTEM.md                      # Quiet Precision
├── DESIGN.md                             # Retain design PRD
├── LANDING.md                            # landing page PRD
├── .env.example
└── README.md`

export const starterFiles: { path: string; content: string }[] = [
  {
    path: 'README.md',
    content: `# Retain

Save customers before they cancel. SaaS founders install the Retain Stripe App; Retain mirrors their customers,
subscriptions and invoices, scores every customer for churn risk with plain-words reasons, chases failed payments in
their brand with a one-click update-card page, runs an embeddable cancel flow with save offers applied in Stripe, and
sends Claude-drafted win-back emails to cancelled customers.

## Stack
Next.js (App Router) + Tailwind + shadcn/ui, Supabase (auth, Postgres + RLS, edge functions, pg_cron), a Stripe App
with OAuth install (founders' accounts), Stripe Billing (Retain's own plans), Claude API claude-opus-5-5 (Batches for
summaries and drafts), Resend, Vercel.

## Start
1. \`npm install\`
2. Copy \`.env.example\` to \`.env.local\` and fill it in.
3. Run \`supabase/migrations/0001_retain.sql\` in the Supabase SQL editor once.
4. Set the edge function secrets listed at the bottom of \`.env.example\`.
5. Create the Stripe App (\`stripe-app/\`), upload it, and copy the test install link.
6. \`npm run dev\`, sign up, install on a test-mode Stripe account seeded with \`npx tsx scripts/seed-stripe.ts\`.

## Rules that keep it safe
- Stripe tokens and signing secrets live in tables with no RLS policies, encrypted with AES-GCM. Never select them in app code.
- Every founder-side Stripe call goes through getStripeFor(ws). Never call a founder's account with your own secret key.
- The cancel flow only starts with a valid HMAC from the founder's server. Offers are applied once (status guard + Stripe idempotency key).
- Every Claude call and email is metered in \`usage_ledger\` and capped by \`plan_limits()\` on the server.
- End-customer text reaches Claude only inside <data> tags; outputs are checked before anything is sent.
`,
  },
  {
    path: 'CLAUDE.md',
    content: `# Retain

Read @PRD.md before planning any task. Build milestones in order (PRD section 22).
UI rules: @DESIGN_SYSTEM.md @DESIGN.md

## Stack
Next.js App Router, TypeScript, Tailwind, shadcn/ui. Supabase cloud (publishable key in the browser, secret key
server-only, getClaims() on the server). Edge functions in supabase/functions with shared helpers in _shared/.

## Commands
- npm run dev / npm run build / npm run lint
- npx supabase functions deploy <name>
- npx supabase functions deploy <name> --no-verify-jwt (rt-stripe-events, rt-sync-worker, rt-score, rt-explain, rt-ingest, rt-cancel-flow, rt-update-card, rt-email-worker)
- stripe apps upload (from stripe-app/)

## Two Stripe accounts, never mixed
- YOUR account: bills founders for Retain (Checkout, Portal, billing webhook, public.subscriptions).
- FOUNDERS' accounts: reached only through the Retain Stripe App tokens via getStripeFor(ws).

## Security rules
- Never read stripe_tokens or workspace_secrets from Next.js pages. Only edge functions and the key-rotate route.
- Never store raw tokens (update-card, unsubscribe, invite, OAuth state). Store sha256 only.
- Webhooks verify signatures on the raw body and de-duplicate by event id before any work.
- Every paid call: checkLimit() before, meter() after, with an idempotency key.
- Long work goes into the jobs table. No request does more than a few seconds of work.
- Scores are computed in SQL (compute_risk). AI never changes a score or a price.
- Never block an end customer from cancelling: AI errors, caps and a paused Retain plan all fall back to a plain cancel.

## Workflow
Plan mode first for schema, RLS, Stripe tokens, the cancel flow and the offer engine. Show me the plan, wait for OK.
`,
  },
  {
    path: '.env.example',
    content: `# Browser-safe
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-REF.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxx
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_POSTHOG_KEY=phc_xxx

# Server only (also add to Vercel env)
SUPABASE_SECRET_KEY=sb_secret_xxx
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
STRIPE_PRICE_STARTER_MONTHLY=price_xxx
STRIPE_PRICE_STARTER_YEARLY=price_xxx
STRIPE_PRICE_GROWTH_MONTHLY=price_xxx
STRIPE_PRICE_GROWTH_YEARLY=price_xxx
STRIPE_PRICE_SCALE_MONTHLY=price_xxx
STRIPE_PRICE_SCALE_YEARLY=price_xxx
STRIPE_APP_INSTALL_URL=https://marketplace.stripe.com/oauth/v2/...   # test mode link
STRIPE_APP_INSTALL_URL_LIVE=                                          # live link, at launch
RETAIN_TOKEN_KEY=base64-of-32-random-bytes                           # same value as in Supabase secrets
RESEND_API_KEY=re_xxx
RESEND_WEBHOOK_SECRET=whsec_xxx
EMAIL_FROM=Retain <hello@retain.app>

# Seed script only (a TEST-mode key of your "Test SaaS" founder account, never live)
SEED_STRIPE_KEY=sk_test_xxx

# Supabase secrets (Edge Functions > Secrets), never in the browser
# STRIPE_SECRET_KEY=sk_test_xxx (your platform key, same as above)
# STRIPE_SECRET_KEY_LIVE=sk_live_xxx (at launch)
# STRIPE_APP_WEBHOOK_SECRET=whsec_xxx (connected-accounts destination, test)
# STRIPE_APP_WEBHOOK_SECRET_LIVE=whsec_xxx (at launch)
# RETAIN_TOKEN_KEY=same as above
# ANTHROPIC_API_KEY=sk-ant-xxx
# RESEND_API_KEY=re_xxx
# EMAIL_DOMAIN=mail.retain.app
# CRON_SECRET=openssl rand -hex 32
# APP_URL=https://retain.app
`,
  },
  {
    path: 'lib/plans.ts',
    content: `// Keep in sync with public.plan_limits() in the migration.
export type PlanKey = 'starter' | 'growth' | 'scale'

export const PLAN_LIMITS: Record<PlanKey, {
  mrrBandCents: number; trackedCustomers: number; riskSummaries: number; winbackDrafts: number
  exitTags: number; emails: number; usageEvents: number; seats: number; offers: number; abTests: boolean; removeBadge: boolean
}> = {
  starter: { mrrBandCents: 1_000_000, trackedCustomers: 500, riskSummaries: 500, winbackDrafts: 50, exitTags: 100, emails: 500, usageEvents: 250_000, seats: 2, offers: 3, abTests: false, removeBadge: false },
  growth: { mrrBandCents: 4_000_000, trackedCustomers: 2000, riskSummaries: 2000, winbackDrafts: 200, exitTags: 400, emails: 2000, usageEvents: 1_000_000, seats: 5, offers: 10, abTests: true, removeBadge: false },
  scale: { mrrBandCents: 10_000_000, trackedCustomers: 6000, riskSummaries: 6000, winbackDrafts: 400, exitTags: 800, emails: 6000, usageEvents: 3_000_000, seats: 10, offers: 1000, abTests: true, removeBadge: true },
}

export function planForPrice(priceId: string | null | undefined): PlanKey {
  const env = process.env
  if (priceId === env.STRIPE_PRICE_SCALE_MONTHLY || priceId === env.STRIPE_PRICE_SCALE_YEARLY) return 'scale'
  if (priceId === env.STRIPE_PRICE_GROWTH_MONTHLY || priceId === env.STRIPE_PRICE_GROWTH_YEARLY) return 'growth'
  return 'starter'
}
`,
  },
  {
    path: 'lib/money.ts',
    content: `// Monthly recurring revenue for one Stripe subscription, in integer cents.
// See PRD section 8. Discounts: percent_off applies to the total, amount_off is spread per month.
type Price = { unit_amount: number | null; recurring: { interval: 'day' | 'week' | 'month' | 'year'; interval_count: number } | null }
type Item = { price: Price; quantity?: number | null }
type Discount = { coupon: { percent_off: number | null; amount_off: number | null; duration: string } } | null

const PER_MONTH = { day: 365 / 12, week: 52 / 12, month: 1, year: 1 / 12 } as const

export function mrrCents(items: Item[], discount: Discount = null): number {
  let total = 0
  for (const it of items) {
    const p = it.price
    if (!p.recurring || p.unit_amount == null) continue
    const perInterval = p.unit_amount * (it.quantity ?? 1)
    total += (perInterval * PER_MONTH[p.recurring.interval]) / p.recurring.interval_count
  }
  if (discount?.coupon.percent_off) total *= 1 - discount.coupon.percent_off / 100
  if (discount?.coupon.amount_off) total = Math.max(0, total - discount.coupon.amount_off)
  return Math.round(total)
}

export function formatMoney(cents: number, currency = 'usd'): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency.toUpperCase() }).format(cents / 100)
}
`,
  },
  {
    path: 'stripe-app/stripe-app.json',
    content: `{
  "id": "com.example.retain",
  "version": "0.0.1",
  "name": "Retain",
  "icon": "./retain-icon.png",
  "stripe_api_access_type": "oauth",
  "distribution_type": "public",
  "allowed_redirect_uris": [
    "http://localhost:3000/api/stripe/callback"
  ],
  "permissions": [
    { "permission": "customer_read", "purpose": "Mirror customers, card expiry and email for churn scores and failed-payment emails" },
    { "permission": "subscription_read", "purpose": "Read plan, seats, status, trial end and scheduled cancels to compute MRR and risk" },
    { "permission": "subscription_write", "purpose": "Apply a save offer the customer accepted: pause, discount, downgrade or scheduled cancel" },
    { "permission": "invoice_read", "purpose": "Find failed payments and retry dates" },
    { "permission": "invoice_write", "purpose": "Pay the open invoice right after the customer updates their card" },
    { "permission": "coupon_read", "purpose": "Check the discount offers Retain created" },
    { "permission": "coupon_write", "purpose": "Create one coupon per discount offer the founder sets up" },
    { "permission": "payment_method_read", "purpose": "Show card brand, last 4 and expiry on the update-card page" },
    { "permission": "checkout_session_write", "purpose": "Let a customer add a new card on a Stripe Checkout setup page" },
    { "permission": "product_read", "purpose": "Show plan names" },
    { "permission": "plan_read", "purpose": "Find the cheaper price for downgrade offers" },
    { "permission": "event_read", "purpose": "Catch up on any missed webhook events" }
  ]
}
`,
  },
]
