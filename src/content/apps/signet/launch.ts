// Signet launch tasks, repo tree and starter files.
import type { Task } from '../../types'

export const launchTasks: Task[] = [
  {
    id: 'sgn-launch-live',
    title: 'Switch Connect, Zoom and Google to production',
    outcome: 'Real agencies can connect their live Stripe, Zoom and Google accounts, and deposits are real money.',
    minutes: 60,
    xp: 55,
    blocks: [
      { type: 'callout', tone: 'eli5', title: 'Test keys and live keys are two worlds', text: 'Everything you built so far used test keys: fake money, fake accounts. Going live means making the same settings again on the live side and swapping the keys in Vercel and Supabase. Nothing moves over by itself.' },
      { type: 'steps', items: [
        'Stripe: switch the dashboard to live mode. Settings > Connect > Onboarding options > OAuth: turn on OAuth, add https://signet.app/api/stripe/connect/callback, copy the LIVE client ID (ca_...). Add the live Connected accounts webhook destination to sg-connect-webhook and copy its live whsec_.',
        'Update Vercel env (Production) STRIPE_CONNECT_CLIENT_ID and Supabase secrets STRIPE_CONNECT_WEBHOOK_SECRET and STRIPE_SECRET_KEY with the live values. Redeploy Vercel and the edge functions.',
        'Zoom Marketplace > your app > Production: add the production redirect URL, fill in the app listing (description, privacy and support URLs), and submit for review if you want any Zoom user to install it. Until approved, add customers by sharing the unlisted install link [verify the current Zoom publishing flow].',
        'Google Cloud > Google Auth Platform > Branding: add signet.app, a privacy page and a home page. Audience > Publish app. Because drive.meet.readonly is a sensitive scope, submit for verification with a short screen recording of the import flow. Until verified, add each customer\'s Workspace email as a test user (up to 100).',
        'Make one real deposit end to end: connect your own live Stripe as an agency, sign a $1 deposit proposal from your phone, pay with your own card, then refund it in your Stripe dashboard.',
      ] },
      { type: 'code', id: 'sgn-launch-live-sql', filename: 'go-live-check.sql', lang: 'sql', code: `-- After your $1 live test: the deposit is paid and the event was recorded once.
select d.status, d.amount_cents, d.stripe_account_id, d.paid_at
from public.deposits d order by d.created_at desc limit 1;

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
        { mistake: 'Plans all act like Solo in production.', fix: 'plan_prices still holds your test price ids. Insert the live price ids with the SQL above.' },
        { mistake: 'Live deposits never mark as paid.', fix: 'The live Connect webhook has its own whsec_ secret. Update STRIPE_CONNECT_WEBHOOK_SECRET in Supabase secrets with the live value.' },
      ] },
    ],
    checklist: [
      { id: 'sgn-launch-live-c1', label: 'Set up live Connect OAuth and the live Connect webhook' },
      { id: 'sgn-launch-live-c2', label: 'Swap live keys into Vercel and Supabase and redeploy' },
      { id: 'sgn-launch-live-c3', label: 'Submit the Zoom and Google apps for review' },
      { id: 'sgn-launch-live-c4', label: 'Run a $1 live deposit and refund it', trigger: 'copy:sgn-launch-live-sql' },
    ],
  },
  {
    id: 'sgn-launch-landing',
    title: 'Build the landing page and record the 60 second demo',
    outcome: 'signet.app explains the product in one scroll, shows a real call becoming a signed proposal, and starts trials.',
    minutes: 120,
    xp: 60,
    blocks: [
      { type: 'steps', items: [
        'Record the demo with Screen Studio: upload a 3 minute fake call, show the brief, the draft, one rewrite, Send, then the phone signing and paying. Cut it to 60 seconds and burn in captions.',
        'Export a 1440px still of the editor and one of the phone sign block for the hero and feature visuals.',
        'Save LANDING.md, DESIGN.md and DESIGN_SYSTEM.md in the project root, then paste the prompt below.',
      ] },
      { type: 'prompt', id: 'sgn-launch-landing-prompt', title: 'Paste into Claude Code', code: `Build the marketing landing page at app/(marketing)/page.tsx exactly as specified in @LANDING.md, top to bottom:
every section, the exact copy, the motion specs with reduced-motion fallbacks, the responsive notes, SEO metadata,
SoftwareApplication and FAQPage JSON-LD, the OG image and every analytics event. Follow @DESIGN_SYSTEM.md for
type, buttons (white with a firm edge, never filled), stability and motion, with the Signet accent from @DESIGN.md
and the square marketing corners. Wire the pricing toggle to the six STRIPE_PRICE_* env vars and carry plan and
interval into /signup. Add /privacy and /terms pages linked from the footer.
Put the demo video at public/demo.mp4 with a poster, preload none.
When done, screenshot at 320, 390, 768 and 1440 wide and fix any overflow or layout shift.` },
      { type: 'code', id: 'sgn-launch-landing-check', filename: 'landing-check.txt', lang: 'txt', code: `[ ] Hero H1 reads: "Your sales call, turned into a signed proposal by this afternoon."
[ ] Every "Start free trial" button fires lp_cta_clicked with its location
[ ] Pricing toggle swaps monthly/annual without moving the cards
[ ] Comparison table scrolls sideways on mobile with the first column sticky
[ ] FAQ JSON-LD validates in Google's Rich Results Test
[ ] OG image renders when the URL is pasted into Slack or LinkedIn
[ ] Lighthouse mobile: LCP under 2.0 s, CLS under 0.05` },
    ],
    checklist: [
      { id: 'sgn-launch-landing-c1', label: 'Record and cut the 60 second demo' },
      { id: 'sgn-launch-landing-c2', label: 'Copy the landing page prompt', trigger: 'copy:sgn-launch-landing-prompt' },
      { id: 'sgn-launch-landing-c3', label: 'Tick every line of the landing check', trigger: 'copy:sgn-launch-landing-check' },
    ],
  },
]

export const repoTree = `signet/
├── app/
│   ├── (marketing)/page.tsx            # landing (LANDING.md)
│   ├── (marketing)/pricing/page.tsx
│   ├── (marketing)/templates/[slug]/page.tsx
│   ├── (marketing)/compare/[competitor]/page.tsx
│   ├── (auth)/login/page.tsx
│   ├── (auth)/signup/page.tsx
│   ├── invite/[token]/page.tsx
│   ├── onboarding/page.tsx
│   ├── paywall/page.tsx
│   ├── app/proposals/page.tsx
│   ├── app/proposals/new/page.tsx
│   ├── app/proposals/[id]/page.tsx     # block editor
│   ├── app/proposals/[id]/activity/page.tsx
│   ├── app/calls/page.tsx
│   ├── app/calls/[id]/page.tsx         # transcript + brief
│   ├── app/templates/page.tsx
│   ├── app/analytics/page.tsx
│   ├── app/catalogue/page.tsx
│   ├── app/brand/page.tsx
│   ├── app/docs/page.tsx
│   ├── app/help/page.tsx
│   ├── app/billing/page.tsx
│   ├── app/settings/page.tsx
│   ├── p/[token]/page.tsx              # public share page (reads only via edge function)
│   ├── p/[token]/signed/page.tsx
│   ├── verify/[token]/page.tsx
│   └── api/
│       ├── proposals/[id]/send/route.ts
│       ├── calls/[id]/duration/route.ts
│       ├── calls/[id]/draft/route.ts
│       ├── stripe/webhook/route.ts
│       ├── stripe/connect/start/route.ts
│       ├── stripe/connect/callback/route.ts
│       ├── integrations/zoom/{start,callback}/route.ts
│       ├── integrations/google/{start,callback}/route.ts
│       └── unsubscribe/route.ts
├── components/
│   ├── calls/{UploadDrop,Recorder,JobProgress}.tsx
│   ├── editor/{BlockEditor,PricingEditor,RewritePopover,RewriteDiff}.tsx
│   ├── share/{ViewTracker,SignBlock,SignaturePad,HashBadge}.tsx
│   └── ui/                             # shadcn/ui themed to DESIGN_SYSTEM.md
├── lib/
│   ├── brand.ts                        # brandToCssVars()
│   ├── canonical.ts                    # canonicalJson + hashSnapshot (same as _shared)
│   ├── plans.ts                        # price id -> plan, limits mirror plan_limits()
│   ├── workspace.ts
│   └── supabase/{client,server}.ts
├── supabase/
│   ├── migrations/0001_signet.sql
│   └── functions/
│       ├── _shared/                    # admin, auth, http, log, retry, limits, meter, tokens,
│       │                               # canonical, claude, email, deposit, crypto, providers
│       ├── sg-start-transcription/
│       ├── sg-assemblyai-webhook/
│       ├── sg-draft-worker/
│       ├── sg-rewrite-section/
│       ├── sg-public-proposal/
│       ├── sg-sign-proposal/
│       ├── sg-deposit-checkout/
│       ├── sg-connect-webhook/
│       ├── sg-reminders/
│       └── sg-import-recording/
├── CLAUDE.md                           # UI rules: @DESIGN_SYSTEM.md @DESIGN.md
├── PRD.md                              # build PRD (download, save here)
├── DESIGN_SYSTEM.md                    # Quiet Precision base system
├── DESIGN.md                           # Signet accent + screens
├── LANDING.md                          # landing page PRD
├── .env.example
└── README.md`

export const starterFiles: { path: string; content: string }[] = [
  {
    path: 'README.md',
    content: `# Signet

Proposals from a sales call. Upload or record a discovery call (or import it from Zoom or Google Meet), get a
transcript and a brief, then a branded proposal with good/better/best pricing from your own catalogue. Share a link,
track views per section, collect a typed and drawn e-signature with a tamper-evident hash, and take the deposit on
the agency's own Stripe account.

## Stack
Next.js (App Router) + Tailwind + shadcn/ui, Supabase (auth, Postgres + RLS, storage, edge functions, pg_cron),
AssemblyAI (transcription), Claude API claude-opus-5-5 (extraction, drafting, rewrites), Stripe (Signet
subscriptions + Connect Standard direct charges for deposits), Resend, Vercel.

## Start
1. \`npm install\`
2. Copy \`.env.example\` to \`.env.local\` and fill it in.
3. Run \`supabase/migrations/0001_signet.sql\` in the Supabase SQL editor once.
4. Set the edge function secrets listed at the bottom of \`.env.example\`.
5. \`npm run dev\`, sign up, finish onboarding, upload a short call.

## Rules that keep it safe
- The public share page never reads tables. It only calls the \`sg-public-proposal\` edge function.
- Share tokens are 32 random bytes; only their SHA-256 is stored.
- Signatures and sent versions are immutable (database triggers). Do not remove them.
- Every AssemblyAI and Claude call is metered in \`usage_ledger\` and capped by \`plan_limits()\` on the server.
`,
  },
  {
    path: 'CLAUDE.md',
    content: `# Signet

Read @PRD.md before planning any task. Build milestones in order (PRD section 21).
UI rules: @DESIGN_SYSTEM.md @DESIGN.md

## Stack
Next.js App Router, TypeScript, Tailwind, shadcn/ui. Supabase cloud (publishable key in the browser, secret key
server-only, getClaims() on the server). Edge functions in supabase/functions with shared helpers in _shared/.

## Commands
- npm run dev / npm run build / npm run lint
- npx supabase functions deploy <name>
- npx supabase functions deploy <name> --no-verify-jwt (webhooks, cron and public functions only)

## Security rules
- Never read proposal, call, transcript or signature tables from the public share page. Use sg-public-proposal.
- Never store a raw share or verify token. Store sha256 only.
- Never render proposal blocks or model output as HTML.
- Every paid API call: checkLimit() before, meter() after.
- Transcripts and user text reach Claude only inside tags, as data. No tools are given to the model.
- Webhooks verify signatures (Stripe raw body, AssemblyAI header) and de-duplicate by event id.
- Money in integer cents. Prices always come from the catalogue, never from the model.

## Workflow
Plan mode first for schema, auth, Stripe, signatures and the share page. Show me the plan, wait for OK.
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
EMAIL_FROM=Signet <proposals@signet.app>
OAUTH_STATE_SECRET=make-a-long-random-string
APP_ENCRYPTION_KEY=base64-of-32-random-bytes
ZOOM_CLIENT_ID=xxx
ZOOM_CLIENT_SECRET=xxx
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxx

# Supabase secrets (Edge Functions > Secrets), never in the browser
# ASSEMBLYAI_API_KEY=xxx
# ASSEMBLYAI_WEBHOOK_SECRET=openssl rand -hex 32
# ANTHROPIC_API_KEY=sk-ant-xxx
# STRIPE_SECRET_KEY=sk_test_xxx (same as above)
# STRIPE_CONNECT_WEBHOOK_SECRET=whsec_xxx (the Connected accounts destination)
# RESEND_API_KEY / EMAIL_FROM (same as above)
# CRON_SECRET=openssl rand -hex 32 (also stored in Vault as cron_secret)
# APP_URL=https://signet.app
# IP_HASH_SALT=openssl rand -hex 16
# UNSUBSCRIBE_SECRET=openssl rand -hex 32
# APP_ENCRYPTION_KEY / ZOOM_* / GOOGLE_* (same as above)
`,
  },
  {
    path: 'lib/plans.ts',
    content: `// Keep in sync with public.plan_limits() in the migration.
export type PlanKey = 'solo' | 'studio' | 'agency'

export const PLAN_LIMITS: Record<PlanKey, {
  seats: number; drafts: number; callMinutes: number; maxCallMinutes: number; rewrites: number; imports: boolean
}> = {
  solo: { seats: 1, drafts: 10, callMinutes: 600, maxCallMinutes: 90, rewrites: 100, imports: false },
  studio: { seats: 3, drafts: 25, callMinutes: 1500, maxCallMinutes: 120, rewrites: 250, imports: true },
  agency: { seats: 10, drafts: 50, callMinutes: 3000, maxCallMinutes: 180, rewrites: 500, imports: true },
}

export function planForPrice(priceId: string | null | undefined): PlanKey {
  const env = process.env
  if (priceId === env.STRIPE_PRICE_AGENCY_MONTHLY || priceId === env.STRIPE_PRICE_AGENCY_YEARLY) return 'agency'
  if (priceId === env.STRIPE_PRICE_STUDIO_MONTHLY || priceId === env.STRIPE_PRICE_STUDIO_YEARLY) return 'studio'
  return 'solo'
}
`,
  },
]
