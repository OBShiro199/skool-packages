// Tally launch tasks, repo tree and starter files.
import type { Task } from '../../types'

export const launchTasks: Task[] = [
  {
    id: 'tly-launch-live',
    title: 'Switch Connect, Resend and the schedules to production',
    outcome: 'Real freelancers can connect their live Stripe, send from their own domain, and their clients pay real money.',
    minutes: 60,
    xp: 55,
    blocks: [
      { type: 'callout', tone: 'eli5', title: 'Test keys and live keys are two worlds', text: 'Everything so far used test keys: fake money, fake accounts. Going live means making the same Stripe settings again on the live side and swapping the keys in Vercel and Supabase. Nothing moves over by itself. Resend has no test mode, so there you only change addresses.' },
      { type: 'steps', items: [
        'Stripe: switch the dashboard to live mode. Settings > Connect: finish the platform profile, turn on OAuth, add https://YOURDOMAIN/api/stripe/connect/callback, copy the LIVE client ID (ca_...). Add the live Connected accounts webhook destination to tl-connect-webhook with the same 8 events and copy its live whsec_.',
        'Update Vercel env (Production) STRIPE_CONNECT_CLIENT_ID and STRIPE_SECRET_KEY, and Supabase secrets STRIPE_SECRET_KEY and STRIPE_CONNECT_WEBHOOK_SECRET with the live values. Redeploy Vercel and every edge function.',
        'Supabase secrets: APP_URL=https://YOURDOMAIN. Make a new APP_ENCRYPTION_KEY only if this is a fresh production project (changing it breaks links in invoices already sent).',
        'Resend: make a separate production API key (Full access) and update RESEND_API_KEY. Check mail.YOURDOMAIN and reply.YOURDOMAIN are verified and the webhook points at the production project.',
        'Move to Resend Pro ($20) before your first paying customer verifies a domain, and to Scale (from $90 [verify]) when you pass about 8 customer domains.',
        'Run one real invoice end to end: connect your own live Stripe as a freelancer, send yourself a $1 invoice from your own domain, pay it with your own card, then refund it in your Stripe dashboard.',
      ] },
      { type: 'code', id: 'tly-launch-live-sql', filename: 'go-live-check.sql', lang: 'sql', code: `-- After your $1 live test: paid once, event recorded once, receipt sent.
select i.number, i.status, i.amount_paid_cents, p.status as payment, p.stripe_account_id
from public.invoices i join public.payments p on p.invoice_id = i.id
order by p.created_at desc limit 1;

select type, count(*) from public.connect_events
where received_at > now() - interval '1 hour' group by type;

-- Map your LIVE price ids to plans (replace with your live price_ ids):
insert into public.plan_prices (price_id, plan) values
  ('price_live_solo_m', 'solo'), ('price_live_solo_y', 'solo'),
  ('price_live_studio_m', 'studio'), ('price_live_studio_y', 'studio'),
  ('price_live_agency_m', 'agency'), ('price_live_agency_y', 'agency')
on conflict (price_id) do update set plan = excluded.plan;` },
      { type: 'mistakes', items: [
        { mistake: 'Live connect fails with "No such application".', fix: 'You are still using the test ca_ client ID. Copy the live one from Stripe in live mode and redeploy Vercel.' },
        { mistake: 'Plans all act like Solo in production.', fix: 'plan_prices still holds your test price ids. Insert the live ones with the SQL above.' },
        { mistake: 'Live payments never mark invoices as paid.', fix: 'The live Connect webhook has its own whsec_ secret. Update STRIPE_CONNECT_WEBHOOK_SECRET in Supabase secrets with the live value and redeploy tl-connect-webhook.' },
      ] },
    ],
    checklist: [
      { id: 'tly-launch-live-c1', label: 'Set up live Connect OAuth and the live Connect webhook' },
      { id: 'tly-launch-live-c2', label: 'Swap live keys into Vercel and Supabase and redeploy' },
      { id: 'tly-launch-live-c3', label: 'Upgrade Resend to Pro before the first customer domain' },
      { id: 'tly-launch-live-c4', label: 'Run a $1 live invoice and refund it', trigger: 'copy:tly-launch-live-sql' },
    ],
  },
  {
    id: 'tly-launch-landing',
    title: 'Build the landing page and record the 45 second demo',
    outcome: 'Your domain explains Tally in one scroll, shows an invoice being sent, reminded and paid, and starts trials.',
    minutes: 120,
    xp: 60,
    blocks: [
      { type: 'steps', items: [
        'Record the demo with Screen Studio: create an invoice, send it, open it on a phone, show the +3 reminder, reply "paying Friday", show "Paused until Saturday", pay by bank transfer, show the dashboard. Cut to 45 seconds and burn in captions.',
        'Export a 1440px still of the invoice detail screen, the reminder email and the phone pay page for the hero and feature visuals.',
        'Save LANDING.md, DESIGN.md and DESIGN_SYSTEM.md in the project root, then paste the prompt below.',
      ] },
      { type: 'prompt', id: 'tly-launch-landing-prompt', title: 'Paste into Claude Code', code: `Build the marketing landing page at app/(marketing)/page.tsx exactly as specified in @LANDING.md, top to bottom:
every section, the exact copy, the motion specs with reduced-motion fallbacks, the responsive notes, SEO metadata,
SoftwareApplication and FAQPage JSON-LD, the OG image and every analytics event. Follow @DESIGN_SYSTEM.md for
type, buttons (white with a firm edge, never filled), stability and motion, with the Tally teal accent from @DESIGN.md
and the square marketing corners. Wire the pricing toggle to the six STRIPE_PRICE_* env vars and carry plan and
interval into /signup. Before publishing the comparison table, list every [verify] cell for me to check by hand.
Add /privacy and /terms pages linked from the footer.
Put the demo video at public/demo.mp4 with a poster, preload none.
When done, screenshot at 320, 390, 768 and 1440 wide and fix any overflow or layout shift.` },
      { type: 'code', id: 'tly-launch-landing-check', filename: 'landing-check.txt', lang: 'txt', code: `[ ] Hero H1 reads: "Invoices that chase themselves."
[ ] No sentence promises a result like "get paid X days faster"
[ ] Every "Start free trial" button fires lp_cta_clicked with its location
[ ] Pricing toggle swaps monthly/annual without moving the cards
[ ] Comparison table: every [verify] cell checked on the competitor's own site
[ ] FAQ JSON-LD validates in Google's Rich Results Test
[ ] OG image renders when the URL is pasted into Slack or LinkedIn
[ ] Lighthouse mobile: LCP under 2.0 s, CLS under 0.05` },
    ],
    checklist: [
      { id: 'tly-launch-landing-c1', label: 'Record and cut the 45 second demo' },
      { id: 'tly-launch-landing-c2', label: 'Copy the landing page prompt', trigger: 'copy:tly-launch-landing-prompt' },
      { id: 'tly-launch-landing-c3', label: 'Tick every line of the landing check', trigger: 'copy:tly-launch-landing-check' },
    ],
  },
]

export const repoTree = `tally/
├── app/
│   ├── (marketing)/page.tsx            # landing (LANDING.md)
│   ├── (marketing)/pricing/page.tsx
│   ├── (marketing)/templates/[slug]/page.tsx
│   ├── (marketing)/compare/[competitor]/page.tsx
│   ├── (marketing)/tools/{late-payment-calculator,invoice-generator}/page.tsx
│   ├── (auth)/login/page.tsx
│   ├── (auth)/signup/page.tsx
│   ├── invite/[token]/page.tsx
│   ├── onboarding/page.tsx
│   ├── paywall/page.tsx
│   ├── app/dashboard/page.tsx
│   ├── app/invoices/page.tsx
│   ├── app/invoices/new/page.tsx
│   ├── app/invoices/[id]/page.tsx      # editor (draft) or detail + timeline (sent)
│   ├── app/clients/page.tsx
│   ├── app/clients/[id]/page.tsx
│   ├── app/clients/import/page.tsx
│   ├── app/recurring/page.tsx
│   ├── app/recurring/[id]/page.tsx
│   ├── app/reminders/page.tsx
│   ├── app/docs/page.tsx
│   ├── app/help/page.tsx
│   ├── app/billing/page.tsx
│   ├── app/settings/page.tsx
│   ├── i/[token]/page.tsx              # hosted pay page (reads only via tl-public-invoice)
│   ├── i/[token]/paid/page.tsx
│   └── api/
│       ├── stripe/webhook/route.ts     # platform subscription (shared step)
│       ├── stripe/connect/{start,callback,refresh}/route.ts
│       ├── reminders/test/route.ts
│       └── files/[kind]/[id]/route.ts  # signed URLs for PDFs and exports
├── components/
│   ├── invoices/{LineItemRow,TotalsBlock,SendDialog,RecordPaymentDialog,SequenceTimeline}.tsx
│   ├── pay/{PayBox,AmountInput,PayMethodChoice}.tsx
│   ├── dashboard/{StatBox,ForecastBars,NeedsYou}.tsx
│   ├── reminders/{StepEditor,VoiceDialog,EmailPreview}.tsx
│   └── ui/                             # shadcn/ui themed to DESIGN_SYSTEM.md
├── lib/
│   ├── money.ts                        # invoice maths (mirrors the database triggers)
│   ├── money.test.ts
│   ├── currency.ts                     # currencies, zero-decimal list, formatMoney
│   ├── brand.ts                        # brandToCssVars()
│   ├── template.ts                     # renderTemplate (same as _shared/render.ts)
│   ├── recurring.ts                    # nextRuns()
│   ├── dashboard.ts
│   ├── plans.ts                        # price id -> plan, limits mirror plan_limits()
│   ├── workspace.ts
│   └── supabase/{client,server}.ts
├── supabase/
│   ├── migrations/0001_tally.sql
│   └── functions/
│       ├── _shared/                    # admin, auth, http, log, retry, limits, meter, tokens, money,
│       │                               # stripe, methods, email, render, claude, issue, pdf, fonts/
│       ├── tl-send-invoice/
│       ├── tl-worker/                  # jobs/ one file per job kind
│       ├── tl-scheduler/
│       ├── tl-public-invoice/
│       ├── tl-create-checkout/
│       ├── tl-connect-webhook/
│       ├── tl-resend-webhook/
│       ├── tl-domains/
│       ├── tl-tone-rewrite/
│       └── tl-start-job/
├── CLAUDE.md                           # UI rules: @DESIGN_SYSTEM.md @DESIGN.md
├── PRD.md                              # build PRD (download, save here)
├── DESIGN_SYSTEM.md                    # Quiet Precision base system
├── DESIGN.md                           # Tally accent + screens
├── LANDING.md                          # landing page PRD
├── .env.example
└── README.md`

export const starterFiles: { path: string; content: string }[] = [
  {
    path: 'README.md',
    content: `# Tally

Invoices that chase themselves. Freelancers and small agencies create clients and invoices, send them from their own
verified email domain with a PDF and a hosted pay page, and Tally sends polite, escalating reminders (3 days before
due, on the day, +3, +7, +14) until the client pays. Reminders stop on payment and pause when the client replies.
Clients pay by card or bank transfer into the freelancer's own Stripe account (Stripe Connect, direct charges).

## Stack
Next.js (App Router) + Tailwind + shadcn/ui, Supabase (auth, Postgres + RLS, storage, edge functions, pg_cron),
Stripe (Tally subscriptions + Connect direct charges for client payments), Resend (sending from customer domains,
inbound replies, bounces), Claude API claude-opus-5-5 (reading replies, writing reminders in the user's voice),
Frankfurter (ECB exchange rates), pdf-lib (PDFs), Vercel.

## Start
1. \`npm install\`
2. Copy \`.env.example\` to \`.env.local\` and fill it in.
3. Run \`supabase/migrations/0001_tally.sql\` in the Supabase SQL editor once.
4. Set the edge function secrets listed at the bottom of \`.env.example\`.
5. \`npm run dev\`, sign up, finish onboarding, create a client and an invoice.

## Rules that keep it safe
- Money is integer cents. Totals are calculated by database triggers; the browser never sets a total or a status.
- The pay page never reads tables. It only calls the \`tl-public-invoice\` edge function.
- Pay and reply tokens are random; lookups use SHA-256 hashes, and the raw tokens are stored only AES-GCM encrypted.
- Every client payment is created on the freelancer's connected Stripe account. Tally takes no fee.
- Every webhook verifies its signature and de-duplicates by event id.
- Client replies reach Claude only inside tags, as data, with no tools. The model can only pause reminders.
`,
  },
  {
    path: 'CLAUDE.md',
    content: `# Tally

Read @PRD.md before planning any task. Build milestones in order (PRD section 23).
UI rules: @DESIGN_SYSTEM.md @DESIGN.md

## Stack
Next.js App Router, TypeScript, Tailwind, shadcn/ui. Supabase cloud (publishable key in the browser, secret key
server-only, getClaims() on the server). Edge functions in supabase/functions with shared helpers in _shared/.

## Commands
- npm run dev / npm run build / npm run lint / npm test
- npx supabase functions deploy <name>
- npx supabase functions deploy <name> --no-verify-jwt (webhooks, cron and public functions only)

## Money rules
- Integer minor units only (\`_cents\` columns) plus a 3-letter lowercase currency. Zero-decimal currencies are whole units.
- lib/money.ts must match compute_line() and refresh_invoice() in the migration. Add a test for every bug.
- Never send totals, status, number, sent_at, paid_at or token fields from the browser. Guard triggers reject them.

## Security rules
- Never read invoice tables from the pay page. Use tl-public-invoice.
- Never log tokens, email bodies, client emails or keys. Never store a raw token unencrypted.
- Every client-payment Stripe call passes { stripeAccount: acct }. Never set application_fee_amount.
- Every paid API call: checkLimit() before, meter() after.
- Client replies reach Claude only inside <reply> tags. No tools. Code, not the model, decides what happens.
- Webhooks verify signatures on the raw body (Stripe, Resend/Svix) and de-duplicate by event id.

## Workflow
Plan mode first for schema, money, Stripe, webhooks, email sending and the pay page. Show me the plan, wait for OK.
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
STRIPE_CONNECT_CLIENT_ID=ca_xxx
STRIPE_PRICE_SOLO_MONTHLY=price_xxx
STRIPE_PRICE_SOLO_YEARLY=price_xxx
STRIPE_PRICE_STUDIO_MONTHLY=price_xxx
STRIPE_PRICE_STUDIO_YEARLY=price_xxx
STRIPE_PRICE_AGENCY_MONTHLY=price_xxx
STRIPE_PRICE_AGENCY_YEARLY=price_xxx
RESEND_API_KEY=re_xxx
EMAIL_FROM=Tally <hello@mail.usetally.app>
OAUTH_STATE_SECRET=make-a-long-random-string

# Supabase secrets (Edge Functions > Secrets), never in the browser
# STRIPE_SECRET_KEY=sk_test_xxx (same as above)
# STRIPE_CONNECT_WEBHOOK_SECRET=whsec_xxx (the Connected accounts destination)
# RESEND_API_KEY=re_xxx (Full access, for the Domains API)
# RESEND_WEBHOOK_SECRET=whsec_xxx (Resend > Webhooks)
# RESEND_INBOUND_DOMAIN=reply.usetally.app
# TALLY_MAIL_DOMAIN=mail.usetally.app
# ANTHROPIC_API_KEY=sk-ant-xxx
# CRON_SECRET=openssl rand -hex 32 (also stored in Vault as cron_secret)
# APP_ENCRYPTION_KEY=openssl rand -base64 32
# IP_HASH_SALT=openssl rand -hex 16
# APP_URL=https://usetally.app
# FOUNDER_EMAIL=you@yourdomain.com
`,
  },
  {
    path: 'lib/plans.ts',
    content: `// Keep in sync with public.plan_limits() in the migration.
export type PlanKey = 'solo' | 'studio' | 'agency'

export const PLAN_LIMITS: Record<PlanKey, {
  seats: number; invoicesSent: number; repliesRead: number; rewrites: number; domains: number; sequences: number
}> = {
  solo: { seats: 1, invoicesSent: 50, repliesRead: 100, rewrites: 10, domains: 1, sequences: 1 },
  studio: { seats: 3, invoicesSent: 250, repliesRead: 500, rewrites: 30, domains: 1, sequences: 5 },
  agency: { seats: 10, invoicesSent: 750, repliesRead: 1500, rewrites: 60, domains: 3, sequences: 1000 },
}

export const TRIAL_CAPS = { invoicesSent: 10, rewrites: 3 }

export function planForPrice(priceId: string | null | undefined): PlanKey {
  const env = process.env
  if (priceId === env.STRIPE_PRICE_AGENCY_MONTHLY || priceId === env.STRIPE_PRICE_AGENCY_YEARLY) return 'agency'
  if (priceId === env.STRIPE_PRICE_STUDIO_MONTHLY || priceId === env.STRIPE_PRICE_STUDIO_YEARLY) return 'studio'
  return 'solo'
}
`,
  },
  {
    path: 'lib/money.ts',
    content: `// Invoice maths. Must match compute_line() and refresh_invoice() in the migration.
// All amounts are integer minor units (cents; whole units for zero-decimal currencies).

export type LineKind = 'item' | 'late_fee' | 'deposit_credit'
export interface LineInput { kind: LineKind; quantity: number; unitPriceCents: number; taxPct: number }

// Postgres round() on numeric rounds half away from zero. Math.round rounds -0.5 up, so handle the sign.
export function roundHalfAway(n: number): number {
  return n < 0 ? -Math.round(-n) : Math.round(n)
}

export function lineSubtotal(l: LineInput): number {
  return roundHalfAway(l.quantity * l.unitPriceCents)
}

export function lineTax(l: LineInput): number {
  if (l.kind !== 'item') return 0
  return roundHalfAway((lineSubtotal(l) * l.taxPct) / 100)
}

export function invoiceTotals(lines: LineInput[], discountCents: number, amountPaidCents = 0) {
  const items = lines.filter((l) => l.kind === 'item')
  const subtotal = items.reduce((s, l) => s + lineSubtotal(l), 0)
  let tax = items.reduce((s, l) => s + lineTax(l), 0)
  const discount = Math.min(Math.max(discountCents, 0), subtotal)
  if (subtotal > 0 && discount > 0) tax = roundHalfAway((tax * (subtotal - discount)) / subtotal)
  const lateFee = lines.filter((l) => l.kind === 'late_fee').reduce((s, l) => s + lineSubtotal(l), 0)
  const depositCredit = lines.filter((l) => l.kind === 'deposit_credit').reduce((s, l) => s + lineSubtotal(l), 0)
  const total = Math.max(subtotal - discount + tax + lateFee + depositCredit, 0)
  return { subtotal, discount, tax, lateFee, depositCredit, total, amountDue: Math.max(total - amountPaidCents, 0) }
}
`,
  },
]
