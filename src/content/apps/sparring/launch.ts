// Sparring launch tasks, repo tree and starter files.
import type { Task } from '../../types'

export const launchTasks: Task[] = [
  {
    id: 'spr-launch-live',
    title: 'Switch ElevenLabs, Claude and plans to production',
    outcome: 'Real teams can practise on a production agent with enough concurrent lines, and every plan maps to its live Stripe price.',
    minutes: 60,
    xp: 55,
    blocks: [
      { type: 'callout', tone: 'eli5', title: 'Lines, like a phone system', text: 'ElevenLabs lets only a set number of calls run at the same moment on each plan, like a small office with 10 phone lines [verify the numbers on your plan]. If a team of 12 all press Call at 9am, the 11th waits. Pick a plan with enough lines for your busiest hour, and show a polite "lines busy" message instead of an error.' },
      { type: 'steps', items: [
        'ElevenLabs: move to the plan whose included minutes cover your expected month (Pro or Business) [verify plan names and included minutes]. Note its concurrency limit.',
        'Duplicate the dev agent as "Sparring persona (prod)". Point its Custom LLM to the production Supabase project URL and add a new production PERSONA_LLM_SECRET. Turn on authentication and overrides as before.',
        'Create a production API key ("sparring-prod") and a production post-call webhook to the production spr-elevenlabs-webhook. Set ELEVENLABS_API_KEY, ELEVENLABS_AGENT_ID, ELEVENLABS_WEBHOOK_SECRET, PERSONA_LLM_SECRET and SESSION_TOKEN_SECRET in the production Supabase secrets.',
        'Decide on burst: leave it off until you are on Business and watching margins (burst minutes cost about 2x [verify]). Ask Claude Code to map ElevenLabs "too many concurrent conversations" errors in spr-start-session to 503 { code: "lines_busy" } with "All practice lines are busy. You are next: trying again in 20 seconds." and an automatic retry.',
        'Anthropic: create a "sparring-prod" key, raise the monthly spend limit to about 3x your expected AI cost, and add it to production secrets.',
        'Stripe live mode: create the six live prices (Solo, Team, Floor x monthly, yearly), set the STRIPE_PRICE_* env vars in Vercel, and insert the live price ids into plan_prices with the SQL below.',
        'Schedules: run the pg_cron block (section 22 of the migration) on the production project with the production project ref and cron secret.',
        'Make one live call end to end on the production URL with a real card on Solo, then refund it in Stripe.',
      ] },
      { type: 'code', id: 'spr-launch-live-sql', filename: 'go-live.sql', lang: 'sql', code: `-- Map your LIVE price ids to plans (replace with your live price_ ids):
insert into public.plan_prices (price_id, plan) values
  ('price_live_solo_m', 'solo'),  ('price_live_solo_y', 'solo'),
  ('price_live_team_m', 'team'),  ('price_live_team_y', 'team'),
  ('price_live_floor_m', 'floor'), ('price_live_floor_y', 'floor')
on conflict (price_id) do update set plan = excluded.plan;

-- After your live test call: scored, metered once, no stale holds, cron running.
select status, duration_seconds, end_reason from public.sessions order by created_at desc limit 1;
select kind, count(*) from public.usage_ledger where created_at > now() - interval '1 hour' group by kind;
select jobname, schedule from cron.job;` },
      { type: 'mistakes', items: [
        { mistake: 'Production calls connect but the persona is silent.', fix: 'The prod agent still points at the dev Supabase URL, or its Custom LLM secret is the dev one. Open the prod agent > LLM and check both.' },
        { mistake: 'Every paying team acts like Solo.', fix: 'plan_prices still has only test price ids. Insert the live ones with the SQL above.' },
        { mistake: 'Scorecards never arrive in production.', fix: 'pg_cron was only set up on the dev project. Run the schedules block on production with the production project ref and the production cron secret in Vault.' },
      ] },
    ],
    checklist: [
      { id: 'spr-launch-live-c1', label: 'Create the production ElevenLabs agent, key and webhook' },
      { id: 'spr-launch-live-c2', label: 'Add the lines-busy handling and choose a plan with enough concurrency' },
      { id: 'spr-launch-live-c3', label: 'Insert the live Stripe price ids', trigger: 'copy:spr-launch-live-sql' },
      { id: 'spr-launch-live-c4', label: 'Run the cron schedules on production and make one live paid call' },
    ],
  },
  {
    id: 'spr-launch-landing',
    title: 'Build the landing page, record the sample call and the 60 second demo',
    outcome: 'sparring.app explains the product in one scroll, plays a real practice call with its scorecard, and starts trials.',
    minutes: 120,
    xp: 60,
    blocks: [
      { type: 'steps', items: [
        'Record a real 60 to 90 second practice call against Margaret on Normal where you book the meeting (2 or 3 tries). Download the recording from the scorecard menu. Trim it to about 60 seconds and export an MP3 under 1 MB to public/sample-call.mp3.',
        'Export the scorecard for that call as JSON (ask Claude Code for a small script) into lib/sample-scorecard.ts so the landing page shows the real notes.',
        'Record the 60 second product demo with Screen Studio: Practice > Call > 20 seconds of the call > hang up > scorecard > click a note > Team leaderboard. Burn in captions.',
        'Export 1440px stills of the live call screen, the scorecard and the leaderboard for the hero and feature visuals.',
        'Save LANDING.md, DESIGN.md and DESIGN_SYSTEM.md in the project root, then paste the prompt below.',
      ] },
      { type: 'prompt', id: 'spr-launch-landing-prompt', title: 'Paste into Claude Code', code: `Build the marketing landing page at app/(marketing)/page.tsx exactly as specified in @LANDING.md, top to bottom:
every section, the exact copy, the motion specs with reduced-motion fallbacks, the responsive notes, SEO metadata,
SoftwareApplication and FAQPage JSON-LD, the OG image and every analytics event. Follow @DESIGN_SYSTEM.md for
type, buttons (white with a firm edge, never filled), stability and motion, with the corner blue accent from
@DESIGN.md and square marketing corners. Section 6 uses public/sample-call.mp3 and lib/sample-scorecard.ts: as the
audio passes each note's second, highlight that note. Wire the pricing toggle to the six STRIPE_PRICE_* env vars
and carry plan and interval into /signup. Add /privacy and /terms pages linked from the footer.
When done, screenshot at 320, 390, 768 and 1440 wide and fix any overflow or layout shift.` },
      { type: 'code', id: 'spr-launch-landing-check', filename: 'landing-check.txt', lang: 'txt', code: `[ ] Hero H1 reads: "Practise the cold call before you make the real one."
[ ] Every "Start free trial" button fires lp_cta_clicked with its location
[ ] The sample call highlights each note as the audio reaches it, and never autoplays
[ ] Pricing toggle swaps monthly/annual without moving the cards
[ ] Comparison table scrolls sideways on mobile with the first column sticky
[ ] Every competitor price on the page is either confirmed this month or marked "by quote"
[ ] FAQ JSON-LD validates in Google's Rich Results Test
[ ] OG image renders when the URL is pasted into Slack or LinkedIn
[ ] Lighthouse mobile: LCP under 2.0 s, CLS under 0.05` },
    ],
    checklist: [
      { id: 'spr-launch-landing-c1', label: 'Record the sample call and the 60 second demo' },
      { id: 'spr-launch-landing-c2', label: 'Copy the landing page prompt', trigger: 'copy:spr-launch-landing-prompt' },
      { id: 'spr-launch-landing-c3', label: 'Tick every line of the landing check', trigger: 'copy:spr-launch-landing-check' },
    ],
  },
]

export const repoTree = `sparring/
├── app/
│   ├── (marketing)/page.tsx            # landing (LANDING.md)
│   ├── (marketing)/pricing/page.tsx
│   ├── (marketing)/compare/[competitor]/page.tsx
│   ├── (marketing)/objections/[slug]/page.tsx
│   ├── (marketing)/openers/[industry]/page.tsx
│   ├── (auth)/login/page.tsx
│   ├── (auth)/signup/page.tsx
│   ├── invite/[token]/page.tsx
│   ├── onboarding/page.tsx             # workspace, role, mic check
│   ├── paywall/page.tsx
│   ├── app/practice/page.tsx           # persona grid + brief + Call
│   ├── app/call/[sessionId]/page.tsx   # live call (ElevenLabs React SDK)
│   ├── app/sessions/page.tsx
│   ├── app/sessions/[id]/page.tsx      # scorecard + audio + transcript
│   ├── app/assignments/page.tsx
│   ├── app/team/page.tsx               # leaderboard, trends, members
│   ├── app/team/[userId]/page.tsx
│   ├── app/personas/page.tsx
│   ├── app/personas/new/page.tsx       # persona builder
│   ├── app/personas/[id]/page.tsx
│   ├── app/docs/page.tsx
│   ├── app/help/page.tsx
│   ├── app/billing/page.tsx
│   ├── app/settings/page.tsx
│   └── api/
│       ├── stripe/{checkout,portal,webhook}/route.ts
│       ├── invites/send/route.ts
│       ├── sessions/[id]/rescore/route.ts
│       └── unsubscribe/route.ts
├── components/
│   ├── call/{MicCheck,VoiceOrb,LiveTimer,TalkMeter,ScoringPanel}.tsx
│   ├── practice/{PersonaCard,ScenarioTabs,DifficultyPicker,BriefCard,CallButton}.tsx
│   ├── scorecard/{ScoreTotal,RubricRow,TopFix,CoachingNote,AudioPlayer,Transcript}.tsx
│   ├── team/{LeaderboardRow,TrendChart,InviteDialog,AssignmentDialog}.tsx
│   ├── MinutesMeter.tsx
│   └── ui/                             # shadcn/ui themed to DESIGN_SYSTEM.md
├── emails/                             # React Email: Welcome, Invite, NewDrill, DueTomorrow, WeeklyReport, Usage
├── fixtures/                           # strong.json, average.json, pitchy.json, post_call.json
├── lib/
│   ├── plans.ts                        # price id -> plan, limits mirror plan_limits()
│   ├── voices.ts                       # curated ElevenLabs voices for the builder
│   ├── tips.ts                         # one tip per rubric line
│   ├── workspace.ts
│   └── supabase/{client,server}.ts
├── scripts/                            # calibrate.ts, sign-elevenlabs.ts, security-*.ts
├── supabase/
│   ├── migrations/0001_sparring.sql
│   └── functions/
│       ├── _shared/                    # admin, auth, http, log, retry, limits, meter, claude,
│       │                               # elevenlabs, sessionToken, webhookSig, persona, finalise, email
│       ├── spr-start-session/
│       ├── spr-persona-llm/            # ElevenLabs Custom LLM (OpenAI-compatible SSE)
│       ├── spr-elevenlabs-webhook/
│       ├── spr-worker/
│       ├── spr-reconcile/
│       ├── spr-build-persona/
│       └── spr-notify/
├── CLAUDE.md                           # UI rules: @DESIGN_SYSTEM.md @DESIGN.md
├── PRD.md                              # build PRD (download, save here)
├── DESIGN_SYSTEM.md                    # Quiet Precision base system
├── DESIGN.md                           # Sparring accent + screens
├── LANDING.md                          # landing page PRD
├── .env.example
└── README.md`

export const starterFiles: { path: string; content: string }[] = [
  {
    path: 'README.md',
    content: `# Sparring

Cold call practice that hits back. Reps pick a persona (sceptical CFO, busy founder, gatekeeper, or a custom one
built from the team's ICP) and a scenario (cold call, discovery, objection drill), then talk to it live in the
browser. After the call, Claude scores it out of 100 against five rubric lines with timestamped coaching notes.
Managers assign drills, see a leaderboard, streaks and trends, and get a Monday team report.

## Stack
Next.js (App Router) + Tailwind + shadcn/ui, Supabase (auth, Postgres + RLS, storage, edge functions, pg_cron),
ElevenLabs Agents Platform (voice, Custom LLM), Claude API (claude-haiku-5-5 persona brain, claude-sonnet-5-5
scoring and persona builder), Stripe (subscriptions), Resend, Vercel.

## Start
1. \`npm install\`
2. Copy \`.env.example\` to \`.env.local\` and fill it in.
3. Run \`supabase/migrations/0001_sparring.sql\` in the Supabase SQL editor once.
4. Set the edge function secrets listed at the bottom of \`.env.example\`.
5. \`npm run dev\`, sign up, pass the mic check, call Margaret.

## Rules that keep it safe
- The persona prompt is always built on the server from the database. Never trust the prompt ElevenLabs sends.
- spr-persona-llm needs both the Bearer secret and a valid session token.
- Voice seconds are reserved before every call and settled once from the webhook (idempotent).
- Scores, streaks and drill progress are written only by the worker with the secret key.
`,
  },
  {
    path: 'CLAUDE.md',
    content: `# Sparring

Read @PRD.md before planning any task. Build milestones in order (PRD section 23).
UI rules: @DESIGN_SYSTEM.md @DESIGN.md

## Stack
Next.js App Router, TypeScript, Tailwind, shadcn/ui. Supabase cloud (publishable key in the browser, secret key
server-only, getClaims() on the server). Edge functions in supabase/functions with shared helpers in _shared/.
Voice: ElevenLabs Agents with a Custom LLM pointing at spr-persona-llm. Models: claude-haiku-5-5 (persona, streamed,
low effort, thinking off), claude-sonnet-5-5 (scoring and builder, adaptive thinking, structured output).

## Commands
- npm run dev / npm run build / npm run lint
- npx supabase functions deploy <name>
- npx supabase functions deploy <name> --no-verify-jwt (spr-persona-llm, webhooks and cron functions only)

## Security rules
- Never send hidden_pains or win_conditions to a rep's browser.
- Never write sessions (except attach_conversation), turns, scorecards, notes, rep_stats, usage or jobs from the browser.
- Every paid call: check the limit before (reserve_seconds, builds left), meter after (usage_ledger with an idempotency key).
- The rep's words and manager-pasted text reach Claude only as dialogue or inside <source> tags, as data.
- Webhooks verify signatures (ElevenLabs HMAC with timestamp, Stripe raw body) and de-duplicate by event id.
- Never log transcripts, tokens, signatures or emails.

## Workflow
Plan mode first for schema, RLS, metering, the persona endpoint, webhooks and Stripe. Show me the plan, wait for OK.
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
STRIPE_PRICE_TEAM_MONTHLY=price_xxx
STRIPE_PRICE_TEAM_YEARLY=price_xxx
STRIPE_PRICE_FLOOR_MONTHLY=price_xxx
STRIPE_PRICE_FLOOR_YEARLY=price_xxx
RESEND_API_KEY=re_xxx
EMAIL_FROM=Sparring <coach@mail.sparring.app>

# Supabase secrets (Edge Functions > Secrets), never in the browser
# ELEVENLABS_API_KEY=xxx
# ELEVENLABS_AGENT_ID=agent_xxx
# ELEVENLABS_WEBHOOK_SECRET=xxx (from the post-call webhook)
# PERSONA_LLM_SECRET=openssl rand -hex 32 (also the agent's Custom LLM API key secret)
# SESSION_TOKEN_SECRET=openssl rand -hex 32
# ANTHROPIC_API_KEY=sk-ant-xxx
# RESEND_API_KEY / EMAIL_FROM (same as above)
# CRON_SECRET=openssl rand -hex 32 (also stored in Vault as cron_secret)
# APP_URL=https://sparring.app
`,
  },
  {
    path: 'lib/plans.ts',
    content: `// Keep in sync with public.plan_limits() in the migration.
export type PlanKey = 'solo' | 'team' | 'floor'

export const PLAN_LIMITS: Record<PlanKey, {
  seats: number; voiceMinutes: number; maxSessionMinutes: number; personaBuilds: number; customPersonas: number; teamFeatures: boolean
}> = {
  solo: { seats: 1, voiceMinutes: 90, maxSessionMinutes: 10, personaBuilds: 5, customPersonas: 3, teamFeatures: false },
  team: { seats: 6, voiceMinutes: 360, maxSessionMinutes: 15, personaBuilds: 30, customPersonas: 25, teamFeatures: true },
  floor: { seats: 16, voiceMinutes: 900, maxSessionMinutes: 20, personaBuilds: 100, customPersonas: 500, teamFeatures: true },
}

// A 7 day trial gets 20 voice minutes and 3 persona builds on any plan.
export const TRIAL_LIMITS = { voiceMinutes: 20, personaBuilds: 3 }

export function planForPrice(priceId: string | null | undefined): PlanKey {
  const env = process.env
  if (priceId === env.STRIPE_PRICE_FLOOR_MONTHLY || priceId === env.STRIPE_PRICE_FLOOR_YEARLY) return 'floor'
  if (priceId === env.STRIPE_PRICE_TEAM_MONTHLY || priceId === env.STRIPE_PRICE_TEAM_YEARLY) return 'team'
  return 'solo'
}
`,
  },
  {
    path: 'lib/tips.ts',
    content: `// One tip per rubric line, used on the scorecard, the rep profile and the weekly report.
export const RUBRIC_TIPS = {
  opener: 'Say who you are and why you rang in the first 20 seconds. Skip "how are you" and "is this a bad time".',
  permission: 'Ask for 30 seconds, then let them decide. "Can I tell you why I rang, then you decide?"',
  discovery: 'Ask one open question, then follow up on the answer twice before you pitch. Aim to talk under 45%.',
  objections: 'Acknowledge, ask a question to understand, answer in one sentence, check it landed. Never argue.',
  next_step: 'Ask for a time, not "a chat". "Thursday at 10 or 4?" Then read it back.',
} as const
`,
  },
]
