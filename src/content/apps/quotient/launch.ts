// Quotient launch tasks, repo tree and starter files.
import type { Task } from '../../types'

export const launchTasks: Task[] = [
  {
    id: 'quo-launch-live',
    title: 'Switch Stripe Connect, Twilio and Claude to production',
    outcome: 'Real businesses connect their live Stripe, text from verified numbers, and every cap and alert is set for real money.',
    minutes: 60,
    xp: 55,
    blocks: [
      { type: 'callout', tone: 'eli5', title: 'Test keys and live keys are two worlds', text: 'Everything so far used test keys: fake money and fake accounts. Going live means making the same Stripe settings again on the live side, swapping keys in Vercel and Supabase, and redeploying. Nothing moves over by itself. Twilio has no test mode for real texts, so you set its limits before anyone signs up.' },
      { type: 'steps', items: [
        'Stripe: switch the dashboard to live mode. Connect > Get started again for live (platform profile, branding). Developers > Webhooks > Add destination > Connected accounts > qt-connect-webhook with the same 5 events. Copy the live whsec_.',
        'Update Supabase secrets STRIPE_SECRET_KEY (sk_live_) and STRIPE_CONNECT_WEBHOOK_SECRET (live whsec_), and Vercel env (Production) STRIPE_SECRET_KEY and the six live STRIPE_PRICE_* ids. Redeploy Vercel and every edge function (npx supabase functions deploy).',
        'Run the plan_prices SQL below with your LIVE price ids.',
        'Twilio: check the spend alert ($50 to start), Geo permissions (US, CA, GB only) and that TWILIO_NOTIFICATION_EMAIL is an inbox you read daily. Raise the alert as customers grow.',
        'Anthropic: create a "quotient-prod" key, put it in Supabase secrets, delete the dev key from production, and set the monthly limit to 3x your expected spend (1,000 businesses at the cap is under $2,000 a month).',
        'Make one real deposit end to end: connect your own live Stripe as a business, book a £1 or $1 deposit from your phone, pay with your own card, then refund it in your Stripe dashboard. Check the deposit shows refunded in Quotient.',
        'Set up texting for one real business (yours or a friendly first customer) and wait for toll-free approval before you promise texting to anyone else in the US.',
      ] },
      { type: 'code', id: 'quo-launch-live-sql', filename: 'go-live-check.sql', lang: 'sql', code: `-- Map your LIVE price ids to plans (replace with your live price_ ids):
insert into public.plan_prices (price_id, plan) values
  ('price_live_solo_m', 'solo'), ('price_live_solo_y', 'solo'),
  ('price_live_crew_m', 'crew'), ('price_live_crew_y', 'crew'),
  ('price_live_agency_m', 'agency'), ('price_live_agency_y', 'agency')
on conflict (price_id) do update set plan = excluded.plan;

-- After your $1 live test: the deposit was paid, then refunded, and each event recorded once.
select d.status, d.amount_cents, d.stripe_account_id, d.paid_at, d.refunded_at
from public.deposits d order by d.created_at desc limit 1;
select type, count(*) from public.connect_events
where received_at > now() - interval '1 hour' group by type;

-- No test overrides left behind:
select * from public.limit_overrides;   -- expect no rows` },
      { type: 'mistakes', items: [
        { mistake: 'Every business acts like Solo in production.', fix: 'plan_prices still holds your test price ids. Insert the live ids with the SQL above.' },
        { mistake: 'Live deposits never mark as paid.', fix: 'The live Connected accounts destination has its own whsec_. Update STRIPE_CONNECT_WEBHOOK_SECRET in Supabase secrets and redeploy qt-connect-webhook.' },
        { mistake: 'A customer in France got a text attempt.', fix: 'It will fail (and cost $0.001) if Geo permissions are right. Check Messaging > Settings > Geo permissions on the master account; subaccounts inherit it [verify].' },
      ] },
    ],
    checklist: [
      { id: 'quo-launch-live-c1', label: 'Set up live Connect and the live Connected accounts webhook' },
      { id: 'quo-launch-live-c2', label: 'Swap live keys into Vercel and Supabase and redeploy' },
      { id: 'quo-launch-live-c3', label: 'Check Twilio alerts, Geo permissions and the Anthropic limit' },
      { id: 'quo-launch-live-c4', label: 'Run a $1 live deposit, refund it, and run the check SQL', trigger: 'copy:quo-launch-live-sql' },
    ],
  },
  {
    id: 'quo-launch-landing',
    title: 'Build the landing page with the live demo widget',
    outcome: 'Your homepage explains Quotient in one scroll, lets visitors try a real calculator, and starts trials.',
    minutes: 120,
    xp: 60,
    blocks: [
      { type: 'steps', items: [
        'Create the demo business "Sparkle Cleaning" in its own workspace with the cleaning template, and publish it. Note its calculator id for /embed/demo.',
        'Record the 60 second owner tour with Screen Studio or QuickTime: builder, publish, a quote arriving, the photo check, a booking on the calendar. Add captions.',
        'Export 2x stills of the builder, the inbox, the AI note and the slot picker for the feature sections.',
        'Save LANDING.md, DESIGN.md and DESIGN_SYSTEM.md in the project root, then paste the prompt below.',
      ] },
      { type: 'prompt', id: 'quo-launch-landing-prompt', title: 'Paste into Claude Code', code: `Build the marketing landing page at app/(marketing)/page.tsx and the agency variant at app/(marketing)/agencies/page.tsx exactly as specified in @LANDING.md, top to bottom: every section, the exact copy, the scripted hero phone sequence with its reduced-motion still, the live demo widget (/embed/demo maps to the demo calculator id from DEMO_CALCULATOR_ID; submit is replaced by the demo message), motion specs with reduced-motion fallbacks, responsive notes, SEO metadata, SoftwareApplication and FAQPage JSON-LD, the OG image and every analytics event. Follow @DESIGN_SYSTEM.md for type, buttons (white with a firm edge, never filled), stability and motion, with the level teal accent from @DESIGN.md and square marketing corners. Wire the pricing toggle to the six STRIPE_PRICE_* env vars and carry plan and interval into /signup. Add /privacy and /terms pages linked from the footer.
Put the tour video at public/tour.mp4 with a poster, preload none.
When done, screenshot at 320, 375, 768 and 1440 wide and fix any overflow or layout shift.` },
      { type: 'code', id: 'quo-launch-landing-check', filename: 'landing-check.txt', lang: 'txt', code: `[ ] Hero H1 reads: "Customers get a price in 60 seconds. You get the booking."
[ ] The demo widget prices as you change answers and never creates a lead
[ ] Every "Start free trial" button fires lp_cta_clicked with its location
[ ] Pricing toggle swaps monthly/annual without moving the cards
[ ] Comparison table scrolls sideways on mobile with the first column sticky; every competitor price has its footnote
[ ] /agencies shows the agency hero and the "Book a 15 minute call" button
[ ] FAQ JSON-LD validates in Google's Rich Results Test
[ ] OG image renders when the URL is pasted into WhatsApp or Facebook
[ ] Lighthouse mobile: LCP under 2.0 s, CLS under 0.05` },
    ],
    checklist: [
      { id: 'quo-launch-landing-c1', label: 'Publish the Sparkle Cleaning demo calculator' },
      { id: 'quo-launch-landing-c2', label: 'Copy the landing page prompt', trigger: 'copy:quo-launch-landing-prompt' },
      { id: 'quo-launch-landing-c3', label: 'Tick every line of the landing check', trigger: 'copy:quo-launch-landing-check' },
    ],
  },
]

export const repoTree = `quotient/
├── app/
│   ├── (marketing)/page.tsx            # landing (LANDING.md)
│   ├── (marketing)/agencies/page.tsx
│   ├── (marketing)/pricing/page.tsx
│   ├── (marketing)/guides/[slug]/page.tsx
│   ├── (marketing)/compare/[competitor]/page.tsx
│   ├── (marketing)/tools/price-list/page.tsx
│   ├── (auth)/login/page.tsx
│   ├── (auth)/signup/page.tsx
│   ├── invite/[token]/page.tsx
│   ├── onboarding/page.tsx
│   ├── paywall/page.tsx
│   ├── app/leads/page.tsx              # inbox (+ lead panel overlay)
│   ├── app/leads/[id]/page.tsx
│   ├── app/calendar/page.tsx
│   ├── app/calculators/page.tsx
│   ├── app/calculators/[id]/page.tsx   # builder + live preview
│   ├── app/messages/page.tsx
│   ├── app/analytics/page.tsx
│   ├── app/docs/page.tsx
│   ├── app/help/page.tsx
│   ├── app/billing/page.tsx
│   ├── app/settings/page.tsx
│   ├── embed/[calcId]/page.tsx         # the widget inside the iframe (no Supabase client)
│   ├── q/[business]/[calc]/page.tsx    # hosted quote page
│   ├── l/[token]/page.tsx              # customer's quote: photos + booking
│   ├── b/[token]/page.tsx              # manage booking
│   ├── o/[token]/page.tsx              # SMS opt-out (UK)
│   └── api/
│       ├── stripe/webhook/route.ts     # Quotient's own subscriptions
│       ├── ics/[token]/route.ts
│       ├── slug-available/route.ts
│       └── leads/export/route.ts
├── components/
│   ├── widget/{Widget,PriceRange,AnswerCard,Stepper,PhotoUpload}.tsx
│   ├── booking/SlotPicker.tsx
│   ├── leads/{LeadPanel,AiNote,Composer,StatusPill}.tsx
│   ├── builder/{QuestionsTab,PricingTab,RuleRow,ZonesTab,ShareTab}.tsx
│   └── ui/                             # shadcn/ui themed to DESIGN_SYSTEM.md
├── lib/
│   ├── pricing/{schema,engine,engine.test}.ts   # synced into supabase/functions/_shared/pricing
│   ├── templates/{cleaning,windows,landscaping,painting,removals}.ts
│   ├── sms/segments.ts                 # synced into _shared
│   ├── brand.ts                        # brandToCssVars()
│   ├── plans.ts                        # mirrors plan_limits() for display
│   ├── workspace.ts
│   └── supabase/{client,server}.ts
├── public/
│   ├── widget.js                       # the embed loader (< 3 KB)
│   └── consent-example.png             # opt-in proof for toll-free verification
├── scripts/
│   ├── sync-pricing.mjs
│   ├── seed-leads.ts
│   └── security-{public,price,booking}.ts
├── supabase/
│   ├── migrations/0001_quotient.sql
│   └── functions/
│       ├── _shared/                    # admin, auth, http, log, retry, meter, tokens, iphash,
│       │                               # pricing, email, sms, claude, slots, review-schema
│       ├── qt-public-quote/
│       ├── qt-lead-photos/
│       ├── qt-triage-worker/
│       ├── qt-book/
│       ├── qt-connect-onboard/
│       ├── qt-connect-webhook/
│       ├── qt-sms-setup/
│       ├── qt-twilio-webhook/
│       ├── qt-send-message/
│       └── qt-reminders/
├── CLAUDE.md                           # UI rules: @DESIGN_SYSTEM.md @DESIGN.md
├── PRD.md                              # build PRD (download, save here)
├── DESIGN_SYSTEM.md                    # Quiet Precision base system
├── DESIGN.md                           # Quotient accent + screens
├── LANDING.md                          # landing page PRD
├── .env.example
└── README.md`

export const starterFiles: { path: string; content: string }[] = [
  {
    path: 'README.md',
    content: `# Quotient

Instant online quotes for tradespeople, turned into booked jobs. Owners build a quote calculator (per room, per
m2, per hour, extras, minimum charge, postcode zones), embed it on their site or share a hosted page, and customers
get an instant price range, add photos and book a survey or the job with an optional deposit to the business's own
Stripe. Claude (claude-haiku-5-5) reads the photos and notes to flag jobs that need a site visit; it never changes
a price. Leads move through New, Quoted, Booked, Won and Lost with SMS (Twilio) and email (Resend) follow-ups.

## Stack
Next.js (App Router) + Tailwind + shadcn/ui, Supabase (auth, Postgres + RLS, storage, edge functions, pg_cron),
Claude API claude-haiku-5-5 (photo check), Twilio (subaccount per business, toll-free or alpha sender), Stripe
(Quotient subscriptions + Connect direct charges for deposits), Resend, Vercel.

## Start
1. \`npm install\`
2. Copy \`.env.example\` to \`.env.local\` and fill it in.
3. Run \`supabase/migrations/0001_quotient.sql\` in the Supabase SQL editor once.
4. Set the edge function secrets listed at the bottom of \`.env.example\`.
5. \`npm test\` (pricing engine), then \`npm run dev\`, sign up, pick a trade template, publish, open /dev/embed-test.

## Rules that keep it safe
- Public pages (/embed, /q, /l, /b, /o) never read tables. They only call edge functions.
- The server re-prices every quote with the published version. Price columns are locked by a trigger.
- Lead, booking and calendar tokens are random; only their SHA-256 is stored.
- Every quote, SMS credit and AI check is metered with meter_usage() and capped by plan_limits() on the server.
- Bookings cannot overlap: a Postgres exclusion constraint is the referee.
`,
  },
  {
    path: 'CLAUDE.md',
    content: `# Quotient

Read @PRD.md before planning any task. Build milestones in order (PRD section 21).
UI rules: @DESIGN_SYSTEM.md @DESIGN.md

## Stack
Next.js App Router, TypeScript, Tailwind, shadcn/ui. Supabase cloud (publishable key in the browser, secret key
server-only, getClaims() on the server). Edge functions in supabase/functions with shared helpers in _shared/.

## Commands
- npm run dev / npm run build / npm run lint / npm test
- npm run sync:pricing (after ANY change in lib/pricing or lib/sms)
- npx supabase functions deploy <name>
- npx supabase functions deploy <name> --no-verify-jwt (public, webhook and cron functions only)

## Security rules
- Never import the Supabase client under app/embed, app/q, app/l, app/b or app/o. Use fetch to edge functions.
- Never trust a price from the browser. Always call quote() from lib/pricing on the server with the published version.
- AI output may only set ai_status, ai_summary, needs_site_visit and site_visit_reason on leads. Never a price.
- Customer notes and photos reach Claude only as tagged data and images. No tools are given to the model.
- Every paid call (quotes, SMS, AI): meter_usage() before sending. Never insert into usage_ledger directly.
- Webhooks verify signatures (Stripe raw body, X-Twilio-Signature) and de-duplicate by event id.
- SMS only with recorded consent, never to an opted-out number, only from an approved sender.
- Money in integer cents. Dates in UTC in the database, calendar timezone in slot maths.

## Workflow
Plan mode first for schema, the price engine, bookings, Stripe and Twilio. Show me the plan, wait for OK.
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
STRIPE_PRICE_CREW_MONTHLY=price_xxx
STRIPE_PRICE_CREW_YEARLY=price_xxx
STRIPE_PRICE_AGENCY_MONTHLY=price_xxx
STRIPE_PRICE_AGENCY_YEARLY=price_xxx
RESEND_API_KEY=re_xxx
EMAIL_FROM=Quotient <hello@YOURDOMAIN>
DEMO_CALCULATOR_ID=uuid-of-the-sparkle-cleaning-demo

# Supabase secrets (Edge Functions > Secrets), never in the browser
# ANTHROPIC_API_KEY=sk-ant-xxx
# TWILIO_ACCOUNT_SID=ACxxx (master account)
# TWILIO_AUTH_TOKEN=xxx
# TWILIO_NOTIFICATION_EMAIL=you@yourmail.com
# STRIPE_SECRET_KEY=sk_test_xxx (same as above)
# STRIPE_CONNECT_WEBHOOK_SECRET=whsec_xxx (the Connected accounts destination)
# RESEND_API_KEY=re_xxx (same as above)
# EMAIL_FROM_ADDRESS=quotes@YOURDOMAIN
# CRON_SECRET=openssl rand -hex 32 (also stored in Vault as cron_secret)
# APP_URL=https://YOURDOMAIN
# IP_HASH_SALT=openssl rand -hex 16
`,
  },
  {
    path: 'lib/plans.ts',
    content: `// Display only. Keep in sync with public.plan_limits() in the migration. The server enforces.
export type PlanKey = 'solo' | 'crew' | 'agency'

export const PLAN_LIMITS: Record<PlanKey, {
  businesses: number; seats: number; calculators: number; calendars: number
  quotes: number; smsCredits: number; aiReviews: number; removeBadge: boolean
}> = {
  solo: { businesses: 1, seats: 1, calculators: 1, calendars: 1, quotes: 120, smsCredits: 240, aiReviews: 240, removeBadge: false },
  crew: { businesses: 1, seats: 3, calculators: 5, calendars: 3, quotes: 350, smsCredits: 700, aiReviews: 700, removeBadge: true },
  agency: { businesses: 10, seats: 10, calculators: 30, calendars: 20, quotes: 1000, smsCredits: 2000, aiReviews: 2000, removeBadge: true },
}

export const TRIAL_LIMITS = { quotes: 25, smsCredits: 30, aiReviews: 50 }

// 1 credit = 1 US or Canadian segment; a UK segment costs 5 credits.
export const creditsPerSegment = (country: string) => (country === 'GB' ? 5 : 1)

export function planForPrice(priceId: string | null | undefined): PlanKey {
  const env = process.env
  if (priceId === env.STRIPE_PRICE_AGENCY_MONTHLY || priceId === env.STRIPE_PRICE_AGENCY_YEARLY) return 'agency'
  if (priceId === env.STRIPE_PRICE_CREW_MONTHLY || priceId === env.STRIPE_PRICE_CREW_YEARLY) return 'crew'
  return 'solo'
}
`,
  },
  {
    path: 'public/widget.js',
    content: `// Quotient embed loader. Replace YOURDOMAIN at build time (or serve from your own origin).
(function () {
  var ORIGIN = 'https://YOURDOMAIN';
  var params = new URLSearchParams(window.location.search);
  var pass = new URLSearchParams();
  ['utm_source', 'utm_medium', 'utm_campaign'].forEach(function (k) { if (params.get(k)) pass.set(k, params.get(k)); });
  try { if (document.referrer) pass.set('ref', new URL(document.referrer).host); } catch (e) {}
  pass.set('host', window.location.host);

  document.querySelectorAll('[data-quotient]').forEach(function (el) {
    if (el.getAttribute('data-quotient-ready')) return;
    var f = document.createElement('iframe');
    f.src = ORIGIN + '/embed/' + encodeURIComponent(el.getAttribute('data-quotient')) + '?' + pass.toString();
    f.title = 'Instant quote';
    f.loading = 'lazy';
    f.style.cssText = 'width:100%;height:640px;border:0;display:block';
    el.appendChild(f);
    el.setAttribute('data-quotient-ready', '1');
  });

  window.addEventListener('message', function (e) {
    if (e.origin !== ORIGIN || !e.data) return;
    document.querySelectorAll('[data-quotient] iframe').forEach(function (f) {
      if (f.contentWindow !== e.source) return;
      if (e.data.type === 'quotient:height' && typeof e.data.height === 'number') f.style.height = Math.ceil(e.data.height) + 'px';
      if (e.data.type === 'quotient:navigate' && /^https:\\/\\/checkout\\.stripe\\.com\\//.test(e.data.url)) window.top.location.href = e.data.url;
    });
  });
})();
`,
  },
]
