// Bookwell repo tree and starter files for the downloadable zip.

export const repoTree = `bookwell/
├── app/
│   ├── (marketing)/layout.tsx              # .marketing tokens from DESIGN.md section 12
│   ├── (marketing)/page.tsx                # landing page from LANDING.md
│   ├── (marketing)/no-show-calculator/page.tsx
│   ├── (marketing)/qr-poster/page.tsx
│   ├── (marketing)/for/[trade]/page.tsx
│   ├── (marketing)/privacy/page.tsx
│   ├── (auth)/login/page.tsx
│   ├── (auth)/signup/page.tsx
│   ├── onboarding/page.tsx
│   ├── paywall/page.tsx
│   ├── app/layout.tsx                      # sidebar: Bookings, Services, Hours, Booking page | Docs, Help, Billing, Settings
│   ├── app/page.tsx                        # Bookings: today, upcoming, past
│   ├── app/services/page.tsx
│   ├── app/availability/page.tsx           # Hours
│   ├── app/page/page.tsx                   # Booking page: link, QR, branding
│   ├── app/reports/page.tsx                # Studio no-show report
│   ├── app/docs/[[...slug]]/page.tsx
│   ├── app/help/page.tsx
│   ├── app/billing/page.tsx
│   ├── app/settings/page.tsx
│   ├── b/[handle]/page.tsx                 # public booking page
│   ├── b/[handle]/done/page.tsx
│   ├── b/[handle]/done/ics/route.ts
│   ├── b/cancel/[token]/page.tsx           # manage: cancel or reschedule
│   ├── api/qr/route.ts
│   ├── api/qr/poster/route.ts              # A4 PDF with pdf-lib
│   ├── api/stripe/checkout/route.ts        # 4 price ids, 7-day trial
│   ├── api/stripe/portal/route.ts
│   └── api/stripe/webhook/route.ts         # subscriptions only (sets plan)
├── components/
│   ├── booking/  ShopHeader.tsx StepHeader.tsx ServiceStep.tsx DayStep.tsx SlotStep.tsx DetailsStep.tsx StickyPayBar.tsx PolicyLine.tsx
│   ├── owner/    BookingRow.tsx DayHeader.tsx SetupChecklist.tsx HoursRow.tsx ServiceDialog.tsx CancelDialog.tsx
│   ├── settings/ ConnectionCard.tsx QrCard.tsx PhonePreview.tsx BrandingCard.tsx
│   ├── shell/    Sidebar.tsx TextMeter.tsx MobileTabBar.tsx
│   └── ui/                                 # shadcn/ui restyled to DESIGN_SYSTEM.md
├── content/docs/                           # 8 help articles in markdown
├── emails/                                 # React Email templates (PRD section 13)
├── lib/
│   ├── plans.ts                            # Solo / Studio, price id mapping
│   ├── slots.test.ts                       # vitest for supabase/functions/_shared/slots.ts
│   ├── track.ts                            # analytics helper
│   ├── supabase/client.ts
│   ├── supabase/server.ts
│   └── supabase/admin.ts                   # secret key, server only
├── scripts/
│   ├── security-check.ts
│   ├── security-owner.ts
│   ├── security-webhooks.ts
│   └── maps-to-sheet.ts
├── supabase/
│   ├── config.toml                         # verify_jwt = false for every bw- function
│   ├── migrations/0001_bookwell.sql
│   └── functions/
│       ├── _shared/  supabase.ts http.ts auth.ts log.ts retry.ts ratelimit.ts slots.ts google.ts stripe.ts sms.ts email.ts usage.ts booking.ts
│       ├── bw-public-slots/index.ts
│       ├── bw-create-booking/index.ts
│       ├── bw-connect-webhook/index.ts
│       ├── bw-manage-booking/index.ts
│       ├── bw-booking-action/index.ts
│       ├── bw-google-oauth/index.ts
│       ├── bw-connect-onboard/index.ts
│       ├── bw-twilio-inbound/index.ts
│       └── bw-reminders/index.ts
├── CLAUDE.md
├── PRD.md                                  # build PRD (download, save here)
├── DESIGN_SYSTEM.md                        # Quiet Precision base design system
├── DESIGN.md                               # Bookwell design PRD
├── LANDING.md                              # landing page PRD
├── .env.example
└── README.md`

export const starterFiles: { path: string; content: string }[] = [
  {
    path: 'README.md',
    content: `# Bookwell

Booking pages for local service businesses: services, weekly hours, Google Calendar sync,
deposits through Stripe Connect (Standard-style accounts, direct charges) and SMS reminders through Twilio.

## Stack
Next.js (App Router) + Tailwind + shadcn/ui, Supabase (auth, Postgres, edge functions, cron, storage),
Stripe (Bookwell subscription: Solo $19/month or $190/year, Studio $39/month or $390/year, 7-day trial),
Stripe Connect for deposits, Twilio Messaging Service (A2P 10DLC), Google Calendar API, Resend.

## Start
1. \`npm install\`
2. Copy \`.env.example\` to \`.env.local\` and fill it in.
3. Run \`supabase/migrations/0001_bookwell.sql\` in the Supabase SQL editor.
4. Set the Supabase secrets listed at the bottom of \`.env.example\`.
5. Deploy the edge functions: \`npx supabase functions deploy --no-verify-jwt\`.
6. \`npm run dev\`, sign up, create your business, open \`/b/your-handle\`.

## Important
- Customers never log in. Public pages use edge functions, never direct table reads.
- Double booking is blocked by the \`bookings_no_overlap\` constraint. Do not remove it.
- Two Stripe webhooks: \`app/api/stripe/webhook\` (your subscription) and \`bw-connect-webhook\` (shop deposits). They have different signing secrets.
- Every text goes through \`try_consume_usage\` first. Never call Twilio directly.
`,
  },
  {
    path: 'CLAUDE.md',
    content: `# Bookwell

Product spec: @PRD.md
UI rules: @DESIGN_SYSTEM.md @DESIGN.md
Landing page: @LANDING.md

## Rules
- Build one PRD milestone at a time (PRD section 21). Plan first, then wait for my OK.
- Never remove the bookings_no_overlap constraint or turn RLS off. Fix access problems with policies or grants in a new migration.
- Browser code uses the publishable key only. SUPABASE_SECRET_KEY, Stripe, Twilio and Google secrets never reach a "use client" file.
- Public functions (bw-public-slots, bw-create-booking, bw-manage-booking) return whitelisted fields only. Never return customer phone numbers, emails or names.
- Every text goes through sendSms in supabase/functions/_shared/sms.ts (opt-out check, usage cap, logging). Every email goes through sendEmail (email_log).
- All times are stored in UTC and shown in the business timezone with Luxon or Intl.DateTimeFormat.
- Never log phone numbers, names, emails, tokens or message bodies.
- After each change run npm run build and npx vitest run.
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
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
STRIPE_PRICE_SOLO_MONTHLY=price_xxx
STRIPE_PRICE_SOLO_YEARLY=price_xxx
STRIPE_PRICE_STUDIO_MONTHLY=price_xxx
STRIPE_PRICE_STUDIO_YEARLY=price_xxx
RESEND_API_KEY=re_xxx
EMAIL_FROM="Bookwell <bookings@yourdomain.com>"

# Supabase secrets (set with: npx supabase secrets set NAME=value)
# STRIPE_SECRET_KEY=sk_test_xxx
# STRIPE_CONNECT_WEBHOOK_SECRET=whsec_xxx            (the Connect destination, not the subscription one)
# GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
# GOOGLE_CLIENT_SECRET=GOCSPX-xxx
# GOOGLE_REDIRECT_URI=https://YOUR-REF.supabase.co/functions/v1/bw-google-oauth
# OAUTH_STATE_SECRET=make-a-long-random-string
# TWILIO_ACCOUNT_SID=ACxxx
# TWILIO_AUTH_TOKEN=xxx
# TWILIO_MESSAGING_SERVICE_SID=MGxxx
# TWILIO_FROM_NUMBER=+15551234567
# TWILIO_WEBHOOK_URL=https://YOUR-REF.supabase.co/functions/v1/bw-twilio-inbound
# RESEND_API_KEY=re_xxx
# EMAIL_FROM="Bookwell <bookings@yourdomain.com>"
# CRON_SECRET=make-a-long-random-string
# APP_URL=https://yourdomain.com
`,
  },
  {
    path: 'supabase/config.toml',
    content: `# Every Bookwell function checks auth itself (user JWT with getClaims, a webhook signature,
# the cron secret, or rate limits for public functions), so the platform check is off.
[functions.bw-public-slots]
verify_jwt = false

[functions.bw-create-booking]
verify_jwt = false

[functions.bw-connect-webhook]
verify_jwt = false

[functions.bw-manage-booking]
verify_jwt = false

[functions.bw-booking-action]
verify_jwt = false

[functions.bw-google-oauth]
verify_jwt = false

[functions.bw-connect-onboard]
verify_jwt = false

[functions.bw-twilio-inbound]
verify_jwt = false

[functions.bw-reminders]
verify_jwt = false
`,
  },
  {
    path: 'lib/plans.ts',
    content: `// Server only. Maps Stripe price ids to Bookwell plans. Prices: Solo $19/month or $190/year,
// Studio $39/month or $390/year (yearly = 10 times monthly). Text caps are enforced in SQL (usage_cap).
import 'server-only'

export type PlanId = 'solo' | 'studio'

export const PLANS: Record<PlanId, { name: string; monthly: number; yearly: number; texts: number }> = {
  solo: { name: 'Solo', monthly: 19, yearly: 190, texts: 300 },
  studio: { name: 'Studio', monthly: 39, yearly: 390, texts: 600 },
}

export function priceFor(plan: PlanId, interval: 'month' | 'year'): string {
  const env = {
    'solo:month': process.env.STRIPE_PRICE_SOLO_MONTHLY,
    'solo:year': process.env.STRIPE_PRICE_SOLO_YEARLY,
    'studio:month': process.env.STRIPE_PRICE_STUDIO_MONTHLY,
    'studio:year': process.env.STRIPE_PRICE_STUDIO_YEARLY,
  }[plan + ':' + interval]
  if (!env) throw new Error('Missing Stripe price id for ' + plan + ' ' + interval)
  return env
}

export function planForPrice(priceId: string | null | undefined): PlanId {
  if (!priceId) return 'solo'
  if (priceId === process.env.STRIPE_PRICE_STUDIO_MONTHLY || priceId === process.env.STRIPE_PRICE_STUDIO_YEARLY) return 'studio'
  return 'solo'
}
`,
  },
]
