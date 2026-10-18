// Marquee launch tasks, repo tree and starter files.
import type { Task } from '../../types'

export const launchTasks: Task[] = [
  {
    id: 'mrq-launch-google',
    title: 'Get Google verification and the YouTube quota you need',
    outcome: 'Any creator can connect their channel without a warning screen, and you have a plan for when tests outgrow the daily quota.',
    minutes: 75,
    xp: 60,
    blocks: [
      { type: 'callout', tone: 'eli5', title: 'Two Google gates', text: 'Gate one is verification: Google checks that Marquee is a real app with a privacy page before letting strangers grant it YouTube access. Gate two is quota: every app gets 10,000 YouTube units a day for free, which is about 180 running tests. Both gates take weeks, so open them before you need them.' },
      { type: 'steps', items: [
        'Check your privacy page says, in plain words: which YouTube data Marquee reads (video list, thumbnails, impressions, CTR, views, watch time), why (to run tests the user starts), how long it is kept (deleted 120 days after a test, or at disconnect), and how to revoke access (Settings in Marquee, or myaccount.google.com/permissions). Link Google\'s privacy policy and the YouTube Terms of Service.',
        'Record a 2 to 3 minute unlisted screen recording: sign in, Connect YouTube, the consent screen with the scopes visible, start a test, show the thumbnail change on YouTube, then disconnect. Narrate why each scope is needed.',
        'Google Cloud > Google Auth Platform > Audience > Publish app (switch from Testing to In production). Then Verification centre > Prepare for verification: fill in the scope justifications (youtube.force-ssl: "set the thumbnail on videos the user puts in a test and list their videos"; yt-analytics.readonly: "read impressions, CTR, views and watch time to compare thumbnails"), paste the video link, submit.',
        'While you wait: keep beta users on the Test users list (up to 100). Reply to Google\'s emails the same day; most delays are unanswered questions.',
        'Quota: when you pass about 100 running tests a day (check select max(units_used) from youtube_quota_days;), fill in the YouTube API quota extension form linked from the Quota and compliance audits page. It asks how you use each endpoint and for the same demo video. Plan for a compliance audit.',
        'Swap to live keys: Stripe live secret key and webhook secret in Vercel env and Supabase secrets, a separate "marquee-prod" Anthropic key and fal key, then redeploy Vercel and every edge function. Set ALLOW_DEBUG_NOW to false (or delete it).',
        'Make one real paid signup with your own card on the Creator plan, run one real test on your own channel, then refund the payment in Stripe.',
      ] },
      { type: 'code', id: 'mrq-launch-google-sql', filename: 'go-live-check.sql', lang: 'sql', code: `-- Run on the production project after your live test.
-- 1. Debug time must be off: this should show no rotations set outside 00:10 to 02:00 Pacific.
select r.day, r.set_at at time zone 'America/Los_Angeles' as set_pacific
from public.test_rotations r where r.status = 'set' order by r.set_at desc limit 10;

-- 2. Quota headroom: units used per Pacific day (budget 9,500 of 10,000).
select day, units_used, round(units_used / 95.0) as pct_of_budget
from public.youtube_quota_days order by day desc limit 7;

-- 3. Your live subscription row exists and is active.
select status, price_id, current_period_end from public.subscriptions order by updated_at desc limit 3;` },
      { type: 'links', items: [
        { label: 'Sensitive scope verification', url: 'https://developers.google.com/identity/protocols/oauth2/production-readiness/sensitive-scope-verification' },
        { label: 'YouTube quota and compliance audits', url: 'https://developers.google.com/youtube/v3/guides/quota_and_compliance_audits' },
        { label: 'YouTube API Services Terms of Service', url: 'https://developers.google.com/youtube/terms/api-services-terms-of-service' },
        { label: 'YouTube API developer policies', url: 'https://developers.google.com/youtube/terms/developer-policies' },
      ] },
      { type: 'mistakes', items: [
        { mistake: 'Google rejects verification: "privacy policy does not disclose use of Google user data".', fix: 'Add a section titled "YouTube data" that lists each data type, the purpose, retention and deletion, and links Google\'s privacy policy. Resubmit with the exact URL.' },
        { mistake: 'Google asks why you need youtube.force-ssl and not a narrower scope.', fix: 'Explain that thumbnails.set needs a write scope on the channel. If youtube.upload is accepted for thumbnails.set when you check the docs, switch to it and say so in the reply [verify].' },
        { mistake: 'New tests start failing with "quota_full" in the evening.', fix: 'You are near 10,000 units a day. Short term: lower sync_videos to every 2 days for channels with no running test. Long term: the quota extension form.' },
      ] },
    ],
    checklist: [
      { id: 'mrq-launch-google-c1', label: 'Update the privacy page with the YouTube data section' },
      { id: 'mrq-launch-google-c2', label: 'Record the demo video and submit Google verification' },
      { id: 'mrq-launch-google-c3', label: 'Swap in live keys and turn off debug time' },
      { id: 'mrq-launch-google-c4', label: 'Run the go-live checks after a real paid test', trigger: 'copy:mrq-launch-google-sql' },
    ],
  },
  {
    id: 'mrq-launch-landing',
    title: 'Ship the landing page with real thumbnails and a real test',
    outcome: 'The Marquee landing page is live with your own thumbnails, a 45 second demo and a real test result, tracked end to end.',
    minutes: 120,
    xp: 60,
    blocks: [
      { type: 'callout', tone: 'eli5', title: 'Show, do not claim', text: 'Creators have seen a hundred "AI thumbnail" pages. What they have not seen is a real test with real numbers on a real video. Run one on your own channel before launch and put it in the hero. One honest +22% beats a made-up +300%.' },
      { type: 'steps', items: [
        'Run at least one real test on your own channel (or a friend\'s, with their written OK) and keep the result page open for screenshots.',
        'Make the 24 landing thumbnails with Marquee (LANDING.md section 1.5) and export 640x360 WebP copies into public/landing/thumbs.',
        'Record the 45 second demo with Screen Studio following LANDING.md section 6. Export 1080p H.264 under 8 MB plus a WebM.',
        'Check every competitor price in the comparison table on the day you publish and replace each [verify] with the real number and the date.',
        'Paste the prompt below into Claude Code.',
      ] },
      { type: 'prompt', id: 'mrq-launch-landing-prompt', title: 'Paste into Claude Code', code: `Build the marketing landing page at app/(marketing)/page.tsx exactly as specified in @LANDING.md, top to bottom: sticky nav, hero with the gallery visual and result card, tool strip, problem, demo video, the 6 feature sections, how it works, comparison table, testimonials slot (the single "collecting results" card until I add real ones), pricing with the monthly/annual toggle and the 3 real plans, FAQ (12 questions written out), final CTA and footer. Use @DESIGN_SYSTEM.md marketing rules and the Marquee accent from @DESIGN.md: square corners, white buttons with a firm ink edge, no filled buttons. Motion per section with the reduced-motion fallbacks. SEO title, meta description, JSON-LD and the next/og image from sections 16 and 17. PostHog events from section 19. Then check 320, 375, 430, 768, 1280 and 1440px and show me screenshots of the hero and pricing at 375 and 1440.` },
      { type: 'code', id: 'mrq-launch-landing-check', filename: 'landing-check.txt', lang: 'txt', code: `[ ] Hero H1 reads: "Thumbnails with your real face. Tested on your real views."
[ ] The hero result card shows a REAL test result from your channel
[ ] Every thumbnail on the page was made by you, with your own face or written consent
[ ] Pricing toggle switches $29 / $59 / $149 to $290 / $590 / $1,490 without anything shifting
[ ] Comparison table: no [verify] left, a "checked {month}" footnote, YouTube Test & Compare listed as free
[ ] No fake testimonials anywhere
[ ] FAQ has all 12 answers, one open at a time
[ ] Demo video does not autoplay and loads only on click
[ ] Nothing scrolls sideways at 320px except the comparison table inside its box
[ ] cta_clicked fires with the right location in PostHog for nav, hero, pricing and final CTA
[ ] Footer says Marquee is not affiliated with YouTube
[ ] Lighthouse mobile: LCP under 2.0 s, CLS under 0.05` },
      { type: 'mistakes', items: [
        { mistake: 'The hero gallery loads 6 images and the layout jumps.', fix: 'LANDING.md section 18: use one pre-composed WebP for the hero gallery and set aspect-ratio on every frame before images load.' },
        { mistake: 'Meta or Google rejects your ads because of the landing page.', fix: 'Remove any lift claim that is not backed by a real result on the page, and keep the "not affiliated with YouTube" line in the footer.' },
      ] },
    ],
    checklist: [
      { id: 'mrq-launch-landing-c1', label: 'Run a real test and record the 45 second demo' },
      { id: 'mrq-launch-landing-c2', label: 'Copy the landing page prompt', trigger: 'copy:mrq-launch-landing-prompt' },
      { id: 'mrq-launch-landing-c3', label: 'Tick every line of the landing check', trigger: 'copy:mrq-launch-landing-check' },
    ],
  },
]

export const repoTree = `marquee/
├── app/
│   ├── (marketing)/page.tsx            # landing (LANDING.md)
│   ├── (marketing)/pricing/page.tsx
│   ├── (marketing)/results/page.tsx    # public test library
│   ├── (marketing)/tools/thumbnail-preview/page.tsx
│   ├── (marketing)/tools/ctr-test-calculator/page.tsx
│   ├── (marketing)/compare/[slug]/page.tsx
│   ├── (marketing)/guides/[slug]/page.tsx
│   ├── (marketing)/privacy/page.tsx    # includes the YouTube data section
│   ├── (auth)/login/page.tsx
│   ├── (auth)/signup/page.tsx
│   ├── invite/[token]/page.tsx
│   ├── onboarding/page.tsx
│   ├── paywall/page.tsx
│   ├── app/projects/page.tsx
│   ├── app/projects/new/page.tsx
│   ├── app/projects/[id]/page.tsx      # concept gallery
│   ├── app/projects/[id]/edit/[designId]/page.tsx   # canvas editor
│   ├── app/tests/page.tsx
│   ├── app/tests/[id]/page.tsx
│   ├── app/channels/page.tsx
│   ├── app/channels/[id]/page.tsx
│   ├── app/faces/page.tsx
│   ├── app/brand/page.tsx
│   ├── app/docs/page.tsx
│   ├── app/help/page.tsx
│   ├── app/billing/page.tsx
│   ├── app/settings/page.tsx
│   └── api/
│       ├── stripe/{checkout,webhook,portal}/route.ts
│       ├── designs/[id]/export/route.ts
│       └── help/route.ts
├── components/
│   ├── ThumbFrame.tsx
│   ├── ConceptPreview.tsx
│   ├── editor/{Stage,LayersPanel,PropertiesPanel,FaceStrip,MobilePreview,SafeZone}.tsx
│   ├── tests/{ScheduleStrip,ConfidenceMeter,StartTestDialog,ResultsChart}.tsx
│   └── ui/                             # shadcn/ui themed to DESIGN_SYSTEM.md
├── content/
│   ├── docs/*.md                       # in-app documentation articles
│   ├── compare/*.mdx
│   └── guides/*.mdx
├── lib/
│   ├── editor/{schema,compose,presets,export}.ts
│   ├── tests/{schedule,stats}.ts       # same maths as the edge functions
│   ├── fonts.ts
│   ├── plans.ts                        # price id -> plan, limits mirror plan_limits()
│   ├── workspace.ts
│   └── supabase/{client,server}.ts
├── supabase/
│   ├── migrations/0001_marquee.sql
│   └── functions/
│       ├── _shared/                    # admin, auth, http, log, retry, limits, meter, jobs,
│       │                               # claude, fal, google, youtube, email, pacific
│       ├── mrq-face-ingest/
│       ├── mrq-generate/
│       ├── mrq-ai-worker/
│       ├── mrq-fal-webhook/
│       ├── mrq-youtube-connect/
│       ├── mrq-test-control/
│       ├── mrq-scheduler/
│       └── mrq-youtube-worker/
├── scripts/
│   ├── security-isolation.ts
│   └── security-webhooks.ts
├── public/landing/thumbs/              # your own 640x360 WebP thumbnails
├── CLAUDE.md                           # UI rules: @DESIGN_SYSTEM.md @DESIGN.md
├── PRD.md                              # build PRD (download, save here)
├── DESIGN_SYSTEM.md                    # Quiet Precision base system
├── DESIGN.md                           # Marquee accent + screens
├── LANDING.md                          # landing page PRD
├── .env.example
└── README.md`

export const starterFiles: { path: string; content: string }[] = [
  {
    path: 'README.md',
    content: `# Marquee

YouTube thumbnails generated from your face and title, then A/B tested on real views. Upload face photos once
(cut out by fal.ai BiRefNet, tagged by Claude), type a title and topic, get 6 concepts (Claude briefs, FLUX.2 and
Ideogram backgrounds) composed with your face and headline in a canvas editor, export 1280x720 under 2 MB, then
rotate 2 or 3 thumbnails daily on a live video and read impressions and CTR from the YouTube Reporting API.

## Stack
Next.js (App Router) + Tailwind + shadcn/ui + react-konva, Supabase (auth, Postgres + RLS, storage, edge functions,
pg_cron), fal.ai, Claude API claude-opus-5-5, YouTube Data, Analytics and Reporting APIs, Stripe, Resend, Vercel.

## Start
1. \`npm install\`
2. Copy \`.env.example\` to \`.env.local\` and fill it in.
3. Run \`supabase/migrations/0001_marquee.sql\` in the Supabase SQL editor once.
4. Set the edge function secrets listed at the bottom of \`.env.example\`.
5. \`npm run dev\`, sign up, add your face, generate a project.

## Rules that keep it safe
- channel_tokens has no RLS policies on purpose. Only edge functions read it, and tokens are AES-GCM encrypted.
- thumbnails.set is the only YouTube write call. Every test backs up the original first.
- Every fal.ai and Claude call is metered in usage_ledger and capped by plan_limits() on the server.
- Rotations happen once per Pacific day; the quota table stops spending at 9,500 units.
`,
  },
  {
    path: 'CLAUDE.md',
    content: `# Marquee

Read @PRD.md before planning any task. Build milestones in order (PRD section 21).
UI rules: @DESIGN_SYSTEM.md @DESIGN.md

## Stack
Next.js App Router, TypeScript, Tailwind, shadcn/ui, react-konva. Supabase cloud (publishable key in the browser,
secret key server-only, getClaims() on the server). Edge functions in supabase/functions with helpers in _shared/.

## Commands
- npm run dev / npm run build / npm run lint / npm test
- npx supabase functions deploy <name>
- npx supabase functions deploy <name> --no-verify-jwt (mrq-fal-webhook, mrq-youtube-connect, the workers and the scheduler only)
- deno test supabase/functions/_shared

## Rules
- Plan first and wait for my OK on anything touching SQL, RLS, OAuth tokens, YouTube writes or Stripe.
- Never call fal.ai, Claude or YouTube from the browser. Edge functions only.
- Every money-spending call: checkLimit before, meter after, refund on failure.
- Every user or YouTube text sent to Claude goes inside tags; the system prompt says tagged text is data.
- Never show "wins" before a test is decided. Never change a running test's variant images.
- Design tokens only. No raw hex in components. No filled or black buttons.
- Mark anything from memory that is not in the docs as [verify] and ask me.
`,
  },
  {
    path: '.env.example',
    content: `# Next.js (.env.local and Vercel env)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SECRET_KEY=
NEXT_PUBLIC_SITE_URL=http://localhost:3000
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_CREATOR_MONTH=
STRIPE_PRICE_CREATOR_YEAR=
STRIPE_PRICE_PRO_MONTH=
STRIPE_PRICE_PRO_YEAR=
STRIPE_PRICE_AGENCY_MONTH=
STRIPE_PRICE_AGENCY_YEAR=
RESEND_API_KEY=
EMAIL_FROM=Marquee <hello@yourdomain.com>
SUPPORT_EMAIL=
NEXT_PUBLIC_POSTHOG_KEY=
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com

# Supabase edge function secrets (npx supabase secrets set NAME=value)
# APP_URL=https://yourdomain.com
# ANTHROPIC_API_KEY=
# FAL_KEY=
# GOOGLE_CLIENT_ID=
# GOOGLE_CLIENT_SECRET=
# OAUTH_STATE_SECRET=      openssl rand -hex 32
# TOKEN_ENC_KEY=           openssl rand -base64 32 (keep a copy)
# CRON_SECRET=             openssl rand -hex 32
# RESEND_API_KEY=
# EMAIL_FROM=
# ALLOW_DEBUG_NOW=false    true only on your dev project
`,
  },
  {
    path: 'lib/plans.ts',
    content: `// Mirrors public.plan_limits() in the migration. The database is the source of truth;
// this file is for showing caps in the UI before a request is made.
export type PlanKey = 'creator' | 'pro' | 'agency'

export const PLAN_LIMITS: Record<PlanKey, {
  price: { month: number; year: number }
  seats: number
  channels: number
  concepts: number
  liveTests: number
  faceCutouts: number
  people: number
  fonts: number
}> = {
  creator: { price: { month: 29, year: 290 }, seats: 1, channels: 1, concepts: 84, liveTests: 3, faceCutouts: 10, people: 1, fonts: 4 },
  pro: { price: { month: 59, year: 590 }, seats: 2, channels: 3, concepts: 168, liveTests: 10, faceCutouts: 20, people: 3, fonts: 10 },
  agency: { price: { month: 149, year: 1490 }, seats: 5, channels: 10, concepts: 420, liveTests: 40, faceCutouts: 40, people: 15, fonts: 30 },
}

export const TRIAL = { days: 7, concepts: 12, liveTests: 1, channels: 1 }
export const CONCEPTS_PER_GENERATION = 6
`,
  },
  {
    path: 'lib/tests/schedule.ts',
    content: `// The balanced daily rotation order (PRD 12.3). The edge function uses the same function.
export type Label = 'A' | 'B' | 'C'

const TWO: Label[] = ['A', 'B', 'B', 'A', 'B', 'A', 'A', 'B']
const THREE: Label[] = ['A', 'B', 'C', 'B', 'C', 'A', 'C', 'A', 'B']

export function rotationPattern(variants: 2 | 3, days: number): Label[] {
  const base = variants === 2 ? TWO : THREE
  if (days % base.length !== 0) throw new Error('days must be a multiple of ' + base.length)
  const out: Label[] = []
  while (out.length < days) out.push(...base)
  return out
}

// Blocks used by the pairs check (PRD 12.4): 2-day blocks for 2 variants, 3-day blocks for 3.
export function blocks(pattern: Label[], variants: 2 | 3): Label[][] {
  const size = variants
  const out: Label[][] = []
  for (let i = 0; i < pattern.length; i += size) out.push(pattern.slice(i, i + size))
  return out
}
`,
  },
]
