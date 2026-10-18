// Echo launch tasks, repo tree and starter files.
import type { Task } from '../../types'

export const launchTasks: Task[] = [
  {
    id: 'ech-launch-live',
    title: 'Switch AssemblyAI, Claude and AWS to production',
    outcome: 'Production uses its own keys, its own Remotion site, live Stripe prices mapped to plans, and alarms that catch a runaway bill.',
    minutes: 60,
    xp: 55,
    blocks: [
      { type: 'callout', tone: 'eli5', title: 'Separate keys for real customers', text: 'Everything so far ran on your test keys. Production gets its own keys so you can switch one off without breaking the other, see real costs on their own, and never test with a customer\'s data by accident.' },
      { type: 'steps', items: [
        'AssemblyAI: dashboard > API Keys > create a second key "echo-prod". Add a card under Billing so you never run dry mid-episode.',
        'Anthropic: Settings > API Keys > Create Key "echo-prod". Settings > Limits: set the monthly limit to 3 times your expected spend (number of customers x $10 is a safe start).',
        'AWS: Billing > Budgets: add a second budget at $50 with alerts at 50%, 80% and 100%. Confirm the Lambda concurrency increase to 1000 was approved (Service Quotas > AWS Lambda > Concurrent executions).',
        'Run scripts/remotion-redeploy.sh so the Lambda site has your final compositions, and put the new REMOTION_SERVE_URL in Supabase secrets.',
        'Supabase secrets: replace ASSEMBLYAI_API_KEY and ANTHROPIC_API_KEY with the prod keys, set APP_URL to https://your-domain. Redeploy every edge function (npx supabase functions deploy).',
        'Stripe live mode: create the 6 live prices (Creator, Studio, Agency, monthly and yearly), add them to Vercel env (Production) and run the SQL below with the live price ids. Redeploy Vercel.',
        'Run one real episode end to end on your own live account, pay with your own card, then refund it in Stripe.',
      ] },
      { type: 'code', id: 'ech-launch-live-sql', filename: 'go-live.sql', lang: 'sql', code: `-- Map your LIVE price ids to plans (replace with your live price_ ids).
insert into public.plan_prices (price_id, plan) values
  ('price_live_creator_m', 'creator'), ('price_live_creator_y', 'creator'),
  ('price_live_studio_m', 'studio'),   ('price_live_studio_y', 'studio'),
  ('price_live_agency_m', 'agency'),   ('price_live_agency_y', 'agency')
on conflict (price_id) do update set plan = excluded.plan;

-- After your live test episode: real cost per kind today, in dollars.
select kind, sum(quantity) as qty, round(sum(cost_micros) / 1e6, 4) as dollars
from public.usage_ledger where created_at > now() - interval '1 day'
group by kind order by kind;

-- Daily spend alarm you can run any morning: workspaces that cost over $5 yesterday.
select workspace_id, round(sum(cost_micros) / 1e6, 2) as dollars
from public.usage_ledger
where created_at >= date_trunc('day', now()) - interval '1 day' and created_at < date_trunc('day', now())
group by workspace_id having sum(cost_micros) > 5000000 order by dollars desc;` },
      { type: 'mistakes', items: [
        { mistake: 'Every live customer acts like Creator.', fix: 'plan_prices still holds the test price ids. Run the insert above with the live ids.' },
        { mistake: 'Audiograms fail in production but worked in test.', fix: 'The production REMOTION_SERVE_URL points at an old site, or the secret was not updated. Run scripts/remotion-redeploy.sh again and copy the printed Serve URL into Supabase secrets, then redeploy ech-render-audiogram and ech-remotion-webhook.' },
        { mistake: 'Episodes stall at Transcribing in production.', fix: 'The AssemblyAI webhook URL uses SUPABASE_URL, which is right, but ASSEMBLYAI_WEBHOOK_SECRET differs between the request and the webhook check. Set one value in Supabase secrets and redeploy both functions.' },
      ] },
    ],
    checklist: [
      { id: 'ech-launch-live-c1', label: 'Create production keys for AssemblyAI and Anthropic with limits' },
      { id: 'ech-launch-live-c2', label: 'Add the $50 AWS budget and confirm the Lambda quota' },
      { id: 'ech-launch-live-c3', label: 'Swap prod secrets in Supabase and redeploy every function' },
      { id: 'ech-launch-live-c4', label: 'Map live prices and run one paid episode end to end', trigger: 'copy:ech-launch-live-sql' },
    ],
  },
  {
    id: 'ech-launch-landing',
    title: 'Build the landing page and record the 70 second demo',
    outcome: 'getecho.app explains Echo in one scroll, lets a visitor try it on their own feed, and starts trials.',
    minutes: 120,
    xp: 60,
    blocks: [
      { type: 'steps', items: [
        'Record the demo with Screen Studio: upload an episode, show the progress row, the tabs filling in, one regenerate, make an audiogram from a quote, publish the page. Cut to 70 seconds, burn in captions.',
        'Render 3 audiograms of your demo episode (Bars, Line, Minimal) for the phone frames in LANDING.md 7.4, and export a 1440px still of the episode workspace for the hero.',
        'Save LANDING.md, DESIGN.md and DESIGN_SYSTEM.md in the project root, then paste the prompt below.',
      ] },
      { type: 'prompt', id: 'ech-launch-landing-prompt', title: 'Paste into Claude Code', code: `Build the marketing landing page at app/(marketing)/page.tsx exactly as specified in @LANDING.md, top to bottom:
every section, the exact copy, the motion specs with reduced-motion fallbacks, the responsive notes, SEO metadata,
SoftwareApplication and FAQPage JSON-LD, the OG image and every analytics event. Follow @DESIGN_SYSTEM.md for
type, buttons (white with a firm edge, never filled), stability and motion, with the Echo accent from @DESIGN.md
and square marketing corners. The hero RSS field calls the ech-free-tool function and renders the result in section 6.
Wire the pricing toggle to the six STRIPE_PRICE_* env vars and carry plan and interval into /signup.
Put the demo video at public/demo.mp4 with a poster and preload none, and the three audiograms at public/clips/*.mp4
(muted, playsInline, loop, playing only while in view). Add /privacy and /terms pages linked from the footer.
When done, screenshot at 320, 390, 768 and 1440 wide and fix any overflow or layout shift.` },
      { type: 'code', id: 'ech-launch-landing-check', filename: 'landing-check.txt', lang: 'txt', code: `[ ] Hero H1 reads: "Every episode, written up and clipped before lunch."
[ ] The hero RSS field returns titles and chapters for a real feed in under 3 minutes
[ ] Every "Start free trial" button fires lp_cta_clicked with its location
[ ] Pricing toggle swaps monthly/annual without moving the cards; prices are $29/$79/$199 and $290/$790/$1,990
[ ] Comparison table scrolls sideways on mobile with the first column sticky; every [verify] cell has been checked or removed
[ ] Phone-frame videos do not autoplay with reduced motion on
[ ] FAQ JSON-LD validates in Google's Rich Results Test
[ ] OG image renders when the URL is pasted into Slack or LinkedIn
[ ] Lighthouse mobile: LCP under 2.0 s, CLS under 0.05` },
    ],
    checklist: [
      { id: 'ech-launch-landing-c1', label: 'Record the demo and render three landing audiograms' },
      { id: 'ech-launch-landing-c2', label: 'Copy the landing page prompt', trigger: 'copy:ech-launch-landing-prompt' },
      { id: 'ech-launch-landing-c3', label: 'Tick every line of the landing check', trigger: 'copy:ech-launch-landing-check' },
    ],
  },
]

export const repoTree = `echo/
├── app/
│   ├── (marketing)/page.tsx                 # landing (LANDING.md)
│   ├── (marketing)/pricing/page.tsx
│   ├── (marketing)/compare/[competitor]/page.tsx
│   ├── (marketing)/tools/show-notes-generator/page.tsx
│   ├── (marketing)/tools/podcast-chapter-generator/page.tsx
│   ├── (marketing)/tools/podcast-title-generator/page.tsx
│   ├── (auth)/login/page.tsx
│   ├── (auth)/signup/page.tsx
│   ├── invite/[token]/page.tsx
│   ├── onboarding/page.tsx
│   ├── paywall/page.tsx
│   ├── app/episodes/page.tsx
│   ├── app/episodes/new/page.tsx
│   ├── app/episodes/[id]/page.tsx           # transcript + asset tabs + audiograms panel
│   ├── app/shows/page.tsx
│   ├── app/shows/[id]/page.tsx
│   ├── app/audiograms/page.tsx
│   ├── app/voice/page.tsx
│   ├── app/public/page.tsx
│   ├── app/docs/page.tsx
│   ├── app/help/page.tsx
│   ├── app/billing/page.tsx
│   ├── app/settings/page.tsx
│   ├── s/[show]/page.tsx                    # public show page (rpc get_public_show)
│   ├── s/[show]/[episode]/page.tsx          # public episode page (rpc get_public_episode)
│   ├── s/[show]/[episode]/chapters.json/route.ts
│   ├── s/[show]/[episode]/transcript.vtt/route.ts
│   ├── s/[show]/[episode]/transcript.srt/route.ts
│   ├── s/[show]/[episode]/opengraph-image.tsx
│   ├── embed/[episodeId]/page.tsx           # iframe player
│   ├── sitemap.ts
│   ├── robots.ts
│   └── api/
│       ├── episodes/import/route.ts
│       ├── episodes/[id]/process/route.ts
│       ├── episodes/[id]/publish/route.ts
│       ├── stripe/{checkout,portal,webhook}/route.ts
│       └── help/route.ts
├── components/
│   ├── episodes/{UploadDrop,FeedPicker,JobProgress,SpeechStrip,Player}.tsx
│   ├── transcript/{TranscriptView,SpeakerRename,SelectionBar}.tsx
│   ├── assets/{AssetCard,TitlePicker,ChapterList,QuoteCard,RegeneratePopover,HistoryPanel}.tsx
│   ├── audiograms/{AudiogramDialog,ClipWindow,AudiogramsPanel}.tsx
│   ├── public/{EpisodePlayer,PublicTranscript,EmbedPlayer}.tsx
│   └── ui/                                  # shadcn/ui themed to DESIGN_SYSTEM.md
├── remotion/
│   ├── index.ts                             # registerRoot
│   ├── Root.tsx                             # ClipAudio + Audiogram compositions
│   ├── ClipAudio.tsx
│   ├── Audiogram.tsx                        # bars | line | minimal
│   ├── schema.ts                            # zod props
│   └── sample-props.json
├── lib/
│   ├── plans.ts                             # display mirror of plan_limits()
│   ├── workspace.ts
│   ├── showAccent.ts                        # accent derivation + 3:1 contrast fix
│   ├── time.ts                              # m:ss / h:mm:ss, tabular helpers
│   └── supabase/{client,server,public}.ts
├── supabase/
│   ├── migrations/0001_echo.sql
│   └── functions/
│       ├── _shared/                         # admin, auth, http, log, retry, limits, meter, claude,
│       │                                    # schemas, transcriptBlock, email, safeFetch, rss, remotion, crypto
│       ├── ech-start-transcription/
│       ├── ech-assemblyai-webhook/
│       ├── ech-worker/
│       ├── ech-regenerate/
│       ├── ech-render-audiogram/
│       ├── ech-remotion-webhook/
│       ├── ech-rss-poll/
│       └── ech-free-tool/
├── scripts/
│   ├── test-audiogram.ts
│   ├── remotion-redeploy.sh
│   ├── security-tenant.ts
│   ├── security-injection.ts
│   └── lead-feeds.ts
├── CLAUDE.md                                # UI rules: @DESIGN_SYSTEM.md @DESIGN.md
├── PRD.md                                   # build PRD (download, save here)
├── DESIGN_SYSTEM.md                         # Quiet Precision base system
├── DESIGN.md                                # Echo accent + screens
├── LANDING.md                               # landing page PRD
├── .env.example
└── README.md`

export const starterFiles: { path: string; content: string }[] = [
  {
    path: 'README.md',
    content: `# Echo

Every episode, written up and clipped. Upload a podcast episode or connect an RSS feed. Echo transcribes it with
speakers (AssemblyAI), writes titles, show notes, chapters, 5 word-for-word quotes, a newsletter, 5 social posts and
an SEO blog post in the host's voice (Claude claude-sonnet-5-5), renders vertical audiograms with captions (Remotion
Lambda), and publishes an SEO episode page with the full transcript and an embeddable player.

## Stack
Next.js (App Router) + Tailwind + shadcn/ui, Supabase (auth, Postgres + RLS, storage, edge functions, pg_cron),
AssemblyAI, Claude API, Remotion Lambda on AWS, Stripe Billing, Resend, Vercel, PostHog.

## Start
1. \`npm install\`
2. Copy \`.env.example\` to \`.env.local\` and fill it in.
3. Run \`supabase/migrations/0001_echo.sql\` in the Supabase SQL editor once.
4. Set the edge function secrets listed at the bottom of \`.env.example\`.
5. \`npx remotion studio\` to see the audiogram compositions.
6. \`npm run dev\`, sign up, finish onboarding, upload a short episode.

## Rules that keep it safe
- Anonymous visitors never read tables. Public pages call get_public_show / get_public_episode only.
- Duration is never trusted from the browser: the server estimates from the file size and meters the real length.
- Every AssemblyAI, Claude and Remotion call is capped by plan_limits() and metered in usage_ledger.
- Webhooks verify their secret or signature and de-duplicate (jobs idempotency key, remotion_events).
- Transcripts, feeds and voice samples reach Claude only inside tags, as data. No tools are given to the model.
`,
  },
  {
    path: 'CLAUDE.md',
    content: `# Echo

Read @PRD.md before planning any task. Build milestones in order (PRD section 21).
UI rules: @DESIGN_SYSTEM.md @DESIGN.md

## Stack
Next.js App Router, TypeScript, Tailwind, shadcn/ui. Supabase cloud (publishable key in the browser, secret key
server-only, getClaims() on the server). Edge functions in supabase/functions with shared helpers in _shared/.
Remotion compositions in remotion/, deployed to AWS Lambda (us-east-1). All @remotion/* packages on one exact version.

## Commands
- npm run dev / npm run build / npm run lint
- npx remotion studio
- npx supabase functions deploy <name>
- npx supabase functions deploy <name> --no-verify-jwt (webhooks, cron, ech-start-transcription, ech-rss-poll, ech-free-tool)
- bash scripts/remotion-redeploy.sh (after any change in remotion/)

## Security rules
- Never let the browser set episode status, duration, assemblyai_id or audio paths after insert (guard triggers enforce it).
- Never return transcripts.words, workspace ids, costs or emails from a public function or page.
- Never render model output as HTML. Markdown without rehype-raw only.
- Every paid API call: checkLimit() before, meter() after, with an idempotency key.
- Every user-supplied URL goes through safeFetch (SSRF guard). Echo never downloads enclosures itself.
- Transcripts, feed text, voice samples and instructions reach Claude only inside tags. No tools.
- Webhooks: AssemblyAI header compare, Remotion HMAC-SHA512 on the raw body, Stripe constructEvent; all de-duplicated.

## Workflow
Plan mode first for schema, RLS, webhooks, Stripe, the RSS fetcher and public pages. Show me the plan, wait for OK.
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
STRIPE_PRICE_CREATOR_MONTHLY=price_xxx
STRIPE_PRICE_CREATOR_YEARLY=price_xxx
STRIPE_PRICE_STUDIO_MONTHLY=price_xxx
STRIPE_PRICE_STUDIO_YEARLY=price_xxx
STRIPE_PRICE_AGENCY_MONTHLY=price_xxx
STRIPE_PRICE_AGENCY_YEARLY=price_xxx
RESEND_API_KEY=re_xxx
EMAIL_FROM=Echo <episodes@getecho.app>
CRON_SECRET=same-as-supabase-secret
ADMIN_USER_ID=your-auth-user-id

# Local only (Remotion CLI deploys from your laptop)
REMOTION_AWS_ACCESS_KEY_ID=AKIAxxx
REMOTION_AWS_SECRET_ACCESS_KEY=xxx
REMOTION_AWS_REGION=us-east-1

# Supabase secrets (Edge Functions > Secrets), never in the browser
# ASSEMBLYAI_API_KEY=xxx
# ASSEMBLYAI_WEBHOOK_SECRET=openssl rand -hex 32
# ANTHROPIC_API_KEY=sk-ant-xxx
# REMOTION_AWS_ACCESS_KEY_ID / REMOTION_AWS_SECRET_ACCESS_KEY / REMOTION_AWS_REGION (same as above)
# REMOTION_FUNCTION_NAME=remotion-render-xxx
# REMOTION_SERVE_URL=https://remotionlambda-xxx.s3.us-east-1.amazonaws.com/sites/echo-audiograms/index.html
# REMOTION_WEBHOOK_SECRET=openssl rand -hex 32
# RESEND_API_KEY / EMAIL_FROM (same as above)
# CRON_SECRET=openssl rand -hex 32 (also stored in Vault as cron_secret)
# APP_URL=https://getecho.app
# IP_HASH_SALT=openssl rand -hex 16
# FREE_TOOL_WORKSPACE_ID=uuid of your "Free tool" workspace
`,
  },
  {
    path: 'lib/plans.ts',
    content: `// Display only. The source of truth is public.plan_limits() in the migration: keep these in sync.
export type PlanKey = 'creator' | 'studio' | 'agency'

export const PLAN_LIMITS: Record<PlanKey, {
  priceMonthly: number; priceYearly: number; audioMinutes: number; maxEpisodeMinutes: number
  shows: number; seats: number; audiograms: number; regenerations: number; removeBadge: boolean
}> = {
  creator: { priceMonthly: 29, priceYearly: 290, audioMinutes: 360, maxEpisodeMinutes: 120, shows: 1, seats: 1, audiograms: 20, regenerations: 25, removeBadge: false },
  studio: { priceMonthly: 79, priceYearly: 790, audioMinutes: 1200, maxEpisodeMinutes: 180, shows: 5, seats: 3, audiograms: 50, regenerations: 50, removeBadge: true },
  agency: { priceMonthly: 199, priceYearly: 1990, audioMinutes: 3000, maxEpisodeMinutes: 240, shows: 25, seats: 10, audiograms: 150, regenerations: 100, removeBadge: true },
}

export const TRIAL_LIMITS = { audioMinutes: 120, audiograms: 5, regenerations: 10 }

export function planForPrice(priceId: string | null | undefined): PlanKey {
  const env = process.env
  if (priceId === env.STRIPE_PRICE_AGENCY_MONTHLY || priceId === env.STRIPE_PRICE_AGENCY_YEARLY) return 'agency'
  if (priceId === env.STRIPE_PRICE_STUDIO_MONTHLY || priceId === env.STRIPE_PRICE_STUDIO_YEARLY) return 'studio'
  return 'creator'
}

export function formatHours(minutes: number): string {
  const h = minutes / 60
  return Number.isInteger(h) ? String(h) : h.toFixed(1)
}
`,
  },
  {
    path: 'remotion/schema.ts',
    content: `// Props for the two compositions. ech-render-audiogram and ech-remotion-webhook send exactly these.
import { z } from 'zod'

export const clipAudioSchema = z.object({
  src: z.string().url(),
  startMs: z.number().int().min(0),
  endMs: z.number().int().min(1),
})

export const captionSchema = z.object({
  text: z.string(),
  startMs: z.number(),
  endMs: z.number(),
  timestampMs: z.number().nullable(),
  confidence: z.number().nullable(),
})

export const audiogramSchema = z.object({
  audioUrl: z.string().url(),
  captions: z.array(captionSchema),
  artworkUrl: z.string().url(),
  title: z.string().max(80),
  showName: z.string().max(120),
  accentHex: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  style: z.enum(['bars', 'line', 'minimal']),
  durationMs: z.number().int().min(30000).max(60000),
})

export type AudiogramProps = z.infer<typeof audiogramSchema>
`,
  },
]
