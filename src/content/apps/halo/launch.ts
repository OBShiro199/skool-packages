// Halo launch tasks, repo tree and starter files.
import type { Task } from '../../types'

export const launchTasks: Task[] = [
  {
    id: 'hlo-launch-live',
    title: 'Switch texting, Google and Claude to production',
    outcome: 'Real businesses can register their texting number, connect Google and get reply drafts, with production keys, live Stripe prices and the schedules running.',
    minutes: 75,
    xp: 60,
    blocks: [
      { type: 'callout', tone: 'eli5', title: 'Test and live are two worlds', text: 'Everything so far used test keys, test users and your own phone. Going live means checking each outside service is set up for strangers: Google must let any business connect, Twilio must have money and the right countries, Stripe must charge real cards. Nothing moves over by itself.' },
      { type: 'steps', items: [
        'Stripe: switch to live mode, create the Halo product with 6 prices (Solo $49/month and $490/year, Growth $99 and $990, Agency $299 and $2,990), then insert the live price ids into public.plan_prices (SQL below). Add the live webhook and update STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET in Vercel env. Redeploy.',
        'Google: check the Basic API Access approval email has arrived. Google Auth Platform > Branding: add usehalo.app, a privacy page and a home page. Audience > Publish app. If Google asks for verification of the business.manage scope, submit it with a short screen recording of connect, sync and approve-and-post [verify the current requirement]. Until verified, add each customer\'s Google email as a test user (up to 100).',
        'Twilio: add at least $50 of balance and turn on auto-recharge (Console > Billing > Auto-recharge at $20, recharge to $50). Confirm Geo permissions allow only the US. Your own business sender must show Approved.',
        'Anthropic: create a "halo-prod" key, set ANTHROPIC_API_KEY in Supabase secrets to it, and set a monthly limit of about 2x your expected spend (start with $50).',
        'Supabase: enable pg_cron and pg_net, store cron_secret in Vault, uncomment and run section 23 of the migration with your project ref. Check cron.job_run_details after 5 minutes.',
        'Upgrade Supabase to Pro ($25/month) and Vercel to Pro ($20/month) before the first paying customer.',
        'Run acceptance tests A1 to A20 from PRD.md section 21 on production with your own business and phone.',
      ] },
      { type: 'code', id: 'hlo-launch-live-sql', filename: 'go-live.sql', lang: 'sql', code: `-- 1. Live Stripe prices (replace with your live price ids):
insert into public.plan_prices (price_id, plan, interval) values
  ('price_live_solo_m', 'solo', 'month'), ('price_live_solo_y', 'solo', 'year'),
  ('price_live_growth_m', 'growth', 'month'), ('price_live_growth_y', 'growth', 'year'),
  ('price_live_agency_m', 'agency', 'month'), ('price_live_agency_y', 'agency', 'year')
on conflict (price_id) do nothing;

-- 2. Schedules are running (expect rows from the last 5 minutes):
select jobname, status, start_time from cron.job_run_details jd join cron.job j on j.jobid = jd.jobid
order by start_time desc limit 10;

-- 3. Your own sender is approved and linked:
select l.name, s.status, s.phone_number from public.locations l join public.sms_senders s on s.id = l.sms_sender_id;` },
      { type: 'mistakes', items: [
        { mistake: 'A paying customer shows the Solo limits on Agency.', fix: 'Their price id is not in plan_prices, so plan_limits() falls back to solo. Insert the live price ids (step 1 of the SQL).' },
        { mistake: 'Customers see "Access blocked" when connecting Google.', fix: 'The app is still in Testing. Either publish it (and complete verification if asked) or add their Google email as a test user while you wait.' },
        { mistake: 'Texts stop overnight with error 20003 or a balance warning.', fix: 'Twilio balance ran out. Turn on auto-recharge and set an email alert for low balance in Console > Billing.' },
      ] },
    ],
    checklist: [
      { id: 'hlo-launch-live-c1', label: 'Create the 6 live Stripe prices and insert them into plan_prices', trigger: 'copy:hlo-launch-live-sql' },
      { id: 'hlo-launch-live-c2', label: 'Publish the Google app (and submit verification if asked)' },
      { id: 'hlo-launch-live-c3', label: 'Fund Twilio with auto-recharge and US-only Geo permissions' },
      { id: 'hlo-launch-live-c4', label: 'Switch to the production Claude key with a spend limit' },
      { id: 'hlo-launch-live-c5', label: 'Turn on the schedules and re-run A1 to A20 on production' },
    ],
  },
  {
    id: 'hlo-launch-first10',
    title: 'Launch to your first 10 businesses with a founding offer',
    outcome: 'Ten local businesses live on Halo, each set up on a call, with their first reviews arriving and a testimonial asked for at review 10.',
    minutes: 120,
    xp: 70,
    blocks: [
      { type: 'p', text: 'Local businesses buy from people, not launch pages. Your launch is a founding cohort: 10 businesses get their first 2 paid months free (after the 7 day trial), set up with you on a 15 minute call, in exchange for honest feedback and a quote once it works. Prices stay at the normal plan price afterwards, so your margins hold.' },
      { type: 'steps', items: [
        'Stripe: create a coupon "Founding 10" (100% off, duration repeating, 2 months, max 10 redemptions) and a promotion code FOUNDING10.',
        'Send the founding email below to every report request, every "not now" from calls, and every agency contact.',
        'On each setup call: create their location, paste the review link, start the texting form together (approval takes days), create an intake key and build their Zap with them, then send the first request to the owner\'s phone.',
        'Day 3 and day 10: check their dashboard yourself. If fewer than 20 requests went out, call them: the Zap is broken or the front desk is not entering phones.',
        'At their 10th new Google review, ask for a one-line quote with a number in it and permission to use their logo.',
      ] },
      { type: 'code', id: 'hlo-launch-first10-email', filename: 'founding-email.txt', lang: 'txt', code: `Subject: 10 founding spots for Halo

{{firstname}}, I'm opening Halo to 10 local businesses this month.
Founding offer: your first 2 months free after the 7 day trial, and I set it up with you on a 15 minute call, including the connection to {{booking tool}}.
In return I ask for honest feedback in the first month and, if it works, a one-line quote.
Want one of the spots? Reply "yes" and I'll send two times for the call.

{{your name}} · Halo` },
      { type: 'table', head: ['Week', 'Goal', 'If not'], rows: [
        ['1', '5 setup calls booked', 'Call the Tier 1 list for 2 more blocks'],
        ['2', '5 live, first requests sent', 'Do the Zap for them on the call'],
        ['4', '10 live, 100+ requests sent in total', 'Ask the 5 live ones for one referral each'],
        ['6', '3 quotes with numbers', 'Ask on a call, not by email'],
      ] },
    ],
    checklist: [
      { id: 'hlo-launch-first10-c1', label: 'Create the Founding 10 coupon in Stripe' },
      { id: 'hlo-launch-first10-c2', label: 'Copy and send the founding email', trigger: 'copy:hlo-launch-first10-email' },
      { id: 'hlo-launch-first10-c3', label: 'Set up each founding business on a call' },
      { id: 'hlo-launch-first10-c4', label: 'Collect 3 quotes with numbers for the landing page' },
    ],
  },
]

export const repoTree = `halo/
├── app/
│   ├── (marketing)/page.tsx            # landing (LANDING.md)
│   ├── (marketing)/pricing/page.tsx
│   ├── (marketing)/google-review-policy/page.mdx
│   ├── (marketing)/compare/[competitor]/page.tsx
│   ├── (marketing)/for/[trade]/page.tsx
│   ├── (marketing)/tools/{review-link,review-reply}/page.tsx
│   ├── (auth)/login/page.tsx
│   ├── (auth)/signup/page.tsx
│   ├── invite/[token]/page.tsx
│   ├── onboarding/page.tsx
│   ├── paywall/page.tsx
│   ├── app/page.tsx                    # dashboard
│   ├── app/requests/page.tsx           # requests, people, imports
│   ├── app/feedback/page.tsx
│   ├── app/reviews/page.tsx
│   ├── app/locations/page.tsx
│   ├── app/locations/[id]/page.tsx     # details, google, texting, messages, intake, tone
│   ├── app/docs/page.tsx
│   ├── app/help/page.tsx
│   ├── app/billing/page.tsx
│   ├── app/settings/page.tsx
│   ├── r/[token]/page.tsx              # customer rating page (talks only to hl-public)
│   ├── u/[token]/page.tsx              # email unsubscribe
│   ├── join/[slug]/page.tsx            # SMS opt-in form + QR card
│   ├── sms-consent/[senderId]/page.tsx # opt-in proof for carrier review
│   └── api/
│       ├── google/oauth/{start,callback}/route.ts
│       ├── locations/[id]/intake-keys/route.ts
│       └── stripe/webhook/route.ts
├── components/
│   ├── rating/{StarPicker,GoogleButton,PrivateNote}.tsx
│   ├── requests/{SendDialog,ImportDialog,RequestPanel,RequestTicks}.tsx
│   ├── reviews/{DraftCard,PasteDrafter}.tsx
│   ├── dashboard/{KpiTile,FunnelBar,RatingTrend,SetupChecklist}.tsx
│   ├── PhonePreview.tsx
│   ├── UsageMeter.tsx
│   └── ui/                             # shadcn/ui themed to DESIGN_SYSTEM.md
├── emails/                             # React Email: ReviewRequest, FeedbackAlert, LowReview, Digest, WeeklyReport
├── lib/
│   ├── plans.ts                        # price id -> plan, limits mirror plan_limits()
│   ├── replyChecks.ts                  # same checks as _shared/replyChecks.ts
│   ├── workspace.ts
│   └── supabase/{client,server}.ts
├── public/halo-import-template.csv
├── fixtures/sample-visits.csv
├── tests/no-gating.test.ts             # npm run test:no-gating
├── supabase/
│   ├── migrations/0001_halo.sql
│   └── functions/
│       ├── _shared/                    # admin, auth, http, log, retry, limits, meter, tokens,
│       │                               # render, twilio, email, claude, google, replyChecks
│       ├── hl-intake/
│       ├── hl-csv-import/
│       ├── hl-send-worker/
│       ├── hl-public/
│       ├── hl-twilio-webhook/
│       ├── hl-resend-webhook/
│       ├── hl-sms-setup/
│       ├── hl-google-sync/
│       ├── hl-draft-reply/
│       └── hl-post-reply/
├── CLAUDE.md                           # UI rules: @DESIGN_SYSTEM.md @DESIGN.md
├── PRD.md                              # build PRD (download, save here)
├── DESIGN_SYSTEM.md                    # Quiet Precision base system
├── DESIGN.md                           # Halo accent + screens
├── LANDING.md                          # landing page PRD
├── .env.example
└── README.md`

export const starterFiles: { path: string; content: string }[] = [
  {
    path: 'README.md',
    content: `# Halo

More Google reviews, fewer surprises. Halo texts (or emails) every customer after a visit with a two-tap way to rate
the business and post a Google review. Anyone can also send private feedback, and low ratings alert the owner at
once. New Google reviews get a reply drafted in the owner's tone, which the owner approves before it posts.

## Stack
Next.js (App Router) + Tailwind + shadcn/ui, Supabase (auth, Postgres + RLS, storage, edge functions, pg_cron,
Vault), Twilio (one subaccount and toll-free number per business), Resend, Google Business Profile APIs, Claude API
claude-opus-5-5 (reply drafts), Stripe, Vercel.

## Start
1. \`npm install\`
2. Copy \`.env.example\` to \`.env.local\` and fill it in.
3. Run \`supabase/migrations/0001_halo.sql\` in the Supabase SQL editor once.
4. Set the edge function secrets listed at the bottom of \`.env.example\`.
5. \`npm run dev\`, sign up, finish onboarding, send a test request to yourself.

## Rules that keep it inside Google's review policy
- Every customer sees the same "Post a review on Google" button, in the same place, whatever they rate.
- The rating only changes the thank-you sentence and whether the owner is alerted.
- Requests go to every completed visit. The only skips are factual (no consent, opted out, asked in 90 days,
  bad number, old visit, plan cap). Never add a filter by rating, spend, tag or sentiment.
- One reminder, only if the link was never opened.
- No incentives in any template or reply (a database trigger enforces it).

## Rules that keep it safe
- The rating page never reads tables. It only calls \`hl-public\`. Link tokens are stored as sha256.
- Twilio subaccount tokens and Google refresh tokens live in Supabase Vault.
- Every text, email and AI draft is metered in \`usage_ledger\` and capped by \`plan_limits()\` on the server.
`,
  },
  {
    path: 'CLAUDE.md',
    content: `# Halo

Read @PRD.md before planning any task. Build milestones in order (PRD section 22).
UI rules: @DESIGN_SYSTEM.md @DESIGN.md

## Stack
Next.js App Router, TypeScript, Tailwind, shadcn/ui. Supabase cloud (publishable key in the browser, secret key
server-only, getClaims() on the server). Edge functions in supabase/functions with shared helpers in _shared/.

## Commands
- npm run dev / npm run build / npm run lint / npm run test:no-gating
- npx supabase functions deploy <name> --no-verify-jwt (every function checks auth itself)

## Review policy rules (never break these)
- Never add a feature that changes who sees the Google review link, or how prominently, based on a rating,
  sentiment, or customer attribute. GoogleButton has no props that change it.
- Never filter who gets a request by rating, spend, tags or predicted sentiment.
- Reminders depend only on "never opened", never on the rating.
- No incentives (discounts, gifts, prizes, credit) in templates, replies or marketing copy.
- Replies never ask a reviewer to remove or change a review, and never confirm someone is a patient.

## Security rules
- The public rating page only talks to hl-public. Never query tables from /r, /u or /join.
- Never store raw link tokens or intake keys. sha256 only.
- Secrets (Twilio subaccount tokens, Google refresh tokens) live in Vault; tables hold the Vault id.
- Every paid call (Twilio, Resend, Claude): checkLimit() before, meter() after.
- Review text reaches Claude only inside <review> tags, as data. No tools are given to the model.
- Webhooks verify signatures (Twilio X-Twilio-Signature, Resend Svix, Stripe raw body) and de-duplicate.
- Never log phone numbers, emails, names, feedback or review text.

## Workflow
Plan mode first for schema, RLS, the rating page, Twilio, Google OAuth and Stripe. Show me the plan, wait for OK.
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
STRIPE_PRICE_SOLO_MONTHLY=price_xxx
STRIPE_PRICE_SOLO_YEARLY=price_xxx
STRIPE_PRICE_GROWTH_MONTHLY=price_xxx
STRIPE_PRICE_GROWTH_YEARLY=price_xxx
STRIPE_PRICE_AGENCY_MONTHLY=price_xxx
STRIPE_PRICE_AGENCY_YEARLY=price_xxx
RESEND_API_KEY=re_xxx
EMAIL_FROM=Halo <hello@usehalo.app>
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxx
OAUTH_STATE_SECRET=openssl-rand-hex-32

# Supabase secrets (Edge Functions > Secrets), never in the browser
# TWILIO_ACCOUNT_SID=ACxxx (master account)
# TWILIO_AUTH_TOKEN=xxx (master account)
# TWILIO_NOTIFICATION_EMAIL=you@yourdomain.com
# ANTHROPIC_API_KEY=sk-ant-xxx
# RESEND_API_KEY / EMAIL_FROM (same as above)
# EMAIL_FROM_REQUESTS=reviews@mail.usehalo.app
# RESEND_WEBHOOK_SECRET=whsec_xxx
# GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET (same as above)
# CRON_SECRET=openssl rand -hex 32 (also stored in Vault as cron_secret)
# APP_URL=https://usehalo.app
# APP_LINK_HOST=usehalo.app
# IP_HASH_SALT=openssl rand -hex 16
`,
  },
  {
    path: 'lib/plans.ts',
    content: `// Keep in sync with public.plan_limits() in the migration.
export type PlanKey = 'solo' | 'growth' | 'agency'

export const PLAN_LIMITS: Record<PlanKey, {
  locations: number; requests: number; aiDrafts: number; seats: number; whiteLabel: boolean; weeklyReport: boolean
}> = {
  solo: { locations: 1, requests: 200, aiDrafts: 30, seats: 2, whiteLabel: false, weeklyReport: false },
  growth: { locations: 3, requests: 500, aiDrafts: 120, seats: 5, whiteLabel: false, weeklyReport: false },
  agency: { locations: 10, requests: 1000, aiDrafts: 300, seats: 10, whiteLabel: true, weeklyReport: true },
}

export const TRIAL_CAPS = { requests: 50, aiDrafts: 10 }

export function planForPrice(priceId: string | null | undefined): PlanKey {
  const env = process.env
  if (priceId === env.STRIPE_PRICE_AGENCY_MONTHLY || priceId === env.STRIPE_PRICE_AGENCY_YEARLY) return 'agency'
  if (priceId === env.STRIPE_PRICE_GROWTH_MONTHLY || priceId === env.STRIPE_PRICE_GROWTH_YEARLY) return 'growth'
  return 'solo'
}
`,
  },
  {
    path: 'lib/replyChecks.ts',
    content: `// Output checks for AI reply drafts. Keep identical to supabase/functions/_shared/replyChecks.ts.
const INCENTIVE = /\\b(discount|free|gift|voucher|coupon|prize|draw|raffle|win|reward|cash|credit|giveaway)s?\\b|[0-9] ?%|percent off/i
const SUPPRESSION = /\\b(remove|delete|take down|edit your review|change your review|update your review)\\b/i
const URL = /https?:\\/\\/|www\\./i
const PHONE = /(\\+?\\d[\\d\\s().-]{7,}\\d)/

export function replyWarnings(text: string, opts: { website?: string; contactLine?: string } = {}): string[] {
  const w: string[] = []
  const t = text.trim()
  if (t.length < 20) w.push('is very short')
  if (t.length > 1500) w.push('is over 1,500 characters')
  if (INCENTIVE.test(t)) w.push('offers something in exchange (not allowed)')
  if (SUPPRESSION.test(t)) w.push('asks the reviewer to remove or change a review')
  if (URL.test(t) && !(opts.website && t.includes(opts.website))) w.push('mentions a link')
  const phone = t.match(PHONE)?.[0]
  if (phone && !(opts.contactLine ?? '').includes(phone.trim())) w.push('mentions a phone number')
  return w
}
`,
  },
]
