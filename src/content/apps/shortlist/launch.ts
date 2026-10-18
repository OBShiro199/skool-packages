// Shortlist launch tasks, repo tree and starter files.
import type { Task } from '../../types'

export const launchTasks: Task[] = [
  {
    id: 'shl-launch-google',
    title: 'Publish the Google app and switch scheduling to production',
    outcome: 'Any customer\'s interviewers can connect Google Calendar (not only your test users), with Google\'s verification under way or done.',
    minutes: 60,
    xp: 55,
    blocks: [
      { type: 'callout', tone: 'eli5', title: 'Testing mode has a guest list', text: 'While your Google app is in Testing, only the 100 people you listed can connect, and their connection expires after about a week. Publishing the app and passing Google\'s review removes both limits. Start it early: reviews can take weeks.' },
      { type: 'steps', items: [
        'Google Cloud > Google Auth Platform > Branding: app name Shortlist, logo (120 x 120), support email, home page https://yourdomain.com, privacy policy https://yourdomain.com/legal/privacy, terms https://yourdomain.com/legal/terms. Authorised domains: yourdomain.com and supabase.co.',
        'Google Auth Platform > Clients > Shortlist web: add the production redirect URI if your Supabase project changed (https://<prod-ref>.supabase.co/functions/v1/sl-google-oauth).',
        'Google Auth Platform > Audience > Publish app. Because calendar.events is a sensitive scope, Google asks for verification: explain the use in plain words ("Shortlist reads free/busy times to offer interview slots and creates the interview event with a Meet link on the organiser\'s calendar. It never reads event details.") and upload a short screen recording of Settings > Calendar > Connect and a booking [verify the current submission steps].',
        'Until verification is done, keep adding each customer\'s interviewers as test users and tell them to reconnect if the bell says "Reconnect Google Calendar".',
        'Set Supabase secrets APP_URL=https://yourdomain.com and redeploy sl-google-oauth, sl-booking and sl-email-worker.',
        'Make one real booking end to end on production: your own Google account as interviewer, your phone as the candidate.',
      ] },
      { type: 'code', id: 'shl-launch-google-sql', filename: 'go-live-check.sql', lang: 'sql', code: `-- After your production booking test:
select c.google_email, c.status, c.connected_at from public.calendar_connections c;
select i.starts_at, i.status, i.meet_url is not null as meet from public.interviews i order by i.created_at desc limit 3;

-- Map your LIVE price ids (Stripe live mode) to plans:
insert into public.plan_prices (price_id, plan) values
  ('price_live_starter_m', 'starter'), ('price_live_starter_y', 'starter'),
  ('price_live_team_m', 'team'),       ('price_live_team_y', 'team'),
  ('price_live_growth_m', 'growth'),   ('price_live_growth_y', 'growth');` },
      { type: 'mistakes', items: [
        { mistake: 'Google rejects verification because the privacy policy does not mention calendar data.', fix: 'Add a short section to /legal/privacy: which Google data you access (free/busy, event creation), why, that you do not store event details, and how to disconnect. Resubmit.' },
        { mistake: 'Customers see "Google hasn\'t verified this app".', fix: 'That is the unverified warning while review is pending. Until it clears, customers can click Advanced > continue, but only listed test users get through in Testing mode.' },
        { mistake: 'Bookings fail on production but worked locally.', fix: 'APP_URL or the redirect URI still points to localhost or the dev project. Check Supabase secrets and the Google client, then redeploy the functions.' },
      ] },
    ],
    checklist: [
      { id: 'shl-launch-google-c1', label: 'Fill in Google branding and publish the app' },
      { id: 'shl-launch-google-c2', label: 'Submit the sensitive scope for verification' },
      { id: 'shl-launch-google-c3', label: 'Make a real production booking', trigger: 'copy:shl-launch-google-sql' },
    ],
  },
  {
    id: 'shl-launch-demo',
    title: 'Seed the public demo careers page and the docs before launch',
    outcome: 'A live /careers/demo page with three realistic jobs for the landing page button, and Documentation that answers the fairness and GDPR questions buyers ask.',
    minutes: 45,
    xp: 35,
    blocks: [
      { type: 'p', text: 'The landing page sends people to "See a live careers page". Make that page real: a fictional company with three good job posts and clean criteria. Prospects apply to it, see the confirmation email, and understand the product before signing up.' },
      { type: 'prompt', id: 'shl-launch-demo-prompt', title: 'Paste into Claude Code', code: `Write scripts/seed-demo.ts (secret key, idempotent): a workspace "Northwind Studio" with slug "demo", careers headline and about text, a logo from public/demo-logo.png, careers_published true, and three open jobs (Operations lead, Junior product designer, Customer support specialist), each with 2 custom questions and 4 clean criteria that pass lint_criterion with no warnings. Give the demo owner an active subscription row so has_active_access is true (status 'active', price id of the Starter plan). Set retention_days to 90 and add a note in careers_about: "This is a demo company. Applications are deleted within 24 hours." Add a daily job in sl-retention that erases every candidate in the demo workspace older than 24 hours.
Then check every Documentation article in /app/docs exists and matches @PRD.md sections 9 and 10.` },
      { type: 'steps', items: [
        'Run the seed script against production once. Open https://yourdomain.com/careers/demo on your phone.',
        'Apply to the demo with your own email: confirmation arrives, and the application is gone the next day.',
        'Read every Docs article as if you were a nervous founder: "Does the AI reject people?" and "Is this GDPR-safe?" must be answered in the first paragraph.',
      ] },
    ],
    checklist: [
      { id: 'shl-launch-demo-c1', label: 'Copy the demo seed prompt and run it', trigger: 'copy:shl-launch-demo-prompt' },
      { id: 'shl-launch-demo-c2', label: 'Apply to the demo from your phone' },
      { id: 'shl-launch-demo-c3', label: 'Proofread the AI and GDPR docs articles' },
    ],
  },
]

export const repoTree = `shortlist/
├── app/
│   ├── (marketing)/page.tsx                 # landing (LANDING.md)
│   ├── (marketing)/pricing/page.tsx
│   ├── (marketing)/tools/job-criteria-checker/page.tsx
│   ├── (marketing)/templates/[role]/page.tsx
│   ├── (marketing)/alternatives/[slug]/page.tsx
│   ├── (auth)/login/page.tsx
│   ├── (auth)/signup/page.tsx
│   ├── auth/callback/route.ts
│   ├── invite/[token]/page.tsx
│   ├── onboarding/page.tsx
│   ├── paywall/page.tsx
│   ├── careers/[company]/page.tsx           # public, RPC get_careers_page
│   ├── careers/[company]/[job]/page.tsx     # public, RPC get_public_job + ApplyForm + JSON-LD
│   ├── careers/[company]/[job]/applied/page.tsx
│   ├── book/[token]/page.tsx                # candidate slot picker (sl-booking)
│   ├── privacy/[company]/page.tsx           # data request form (sl-privacy)
│   ├── privacy/verify/[token]/page.tsx
│   ├── app/jobs/page.tsx
│   ├── app/jobs/new/page.tsx
│   ├── app/jobs/[id]/page.tsx               # pipeline board + editor tabs + ?app= panel
│   ├── app/candidates/page.tsx
│   ├── app/candidates/[id]/page.tsx
│   ├── app/interviews/page.tsx
│   ├── app/careers/page.tsx
│   ├── app/docs/page.tsx
│   ├── app/help/page.tsx
│   ├── app/billing/page.tsx
│   ├── app/settings/page.tsx                # profile, company, team, calendar, templates, AI, privacy
│   └── api/
│       ├── cv/[applicationId]/route.ts      # signed URL with the user's client + mark_cv_viewed
│       ├── stripe/checkout/route.ts
│       ├── stripe/portal/route.ts
│       └── stripe/webhook/route.ts
├── components/
│   ├── board/{Board,Column,CandidateCard,SelectionBar}.tsx
│   ├── candidate/{Panel,AiSummaryCard,CvViewer,ScorecardForm,Notes,RejectDialog,BookingDialog}.tsx
│   ├── jobs/{DetailsForm,QuestionBuilder,CriteriaEditor,PublishDialog}.tsx
│   ├── careers/{ApplyForm,CvDropzone,SlotPicker}.tsx
│   └── ui/                                  # shadcn/ui themed to DESIGN_SYSTEM.md
├── lib/
│   ├── workspace.ts                         # getCurrentWorkspace()
│   ├── plans.ts                             # mirrors plan_limits()
│   ├── tags.ts                              # stage and assessment colours
│   ├── errors.ts                            # RPC error code -> microcopy
│   ├── lint.ts                              # same rules as lint_criterion() (checker tool)
│   └── supabase/{client,server}.ts
├── supabase/
│   ├── migrations/0001_init.sql
│   └── functions/
│       ├── _shared/                         # admin, auth, http, log, retry, limits, meter, tokens,
│       │                                    # crypto, ip, email, render, claude, extract, redact,
│       │                                    # google, slots
│       ├── sl-apply/
│       ├── sl-screen-worker/
│       ├── sl-email-worker/
│       ├── sl-google-oauth/
│       ├── sl-booking/
│       ├── sl-scheduler/
│       ├── sl-privacy/
│       ├── sl-retention/
│       └── sl-resend-webhook/
├── scripts/{e2e,security-data,seed-demo}.ts
├── fixtures/cv-sample.pdf
├── CLAUDE.md                                # UI rules: @DESIGN_SYSTEM.md @DESIGN.md
├── PRD.md                                   # build PRD (download, save here)
├── DESIGN_SYSTEM.md                         # Quiet Precision base system
├── DESIGN.md                                # Shortlist accent + screens
├── LANDING.md                               # landing page PRD
├── .env.example
└── README.md`

export const starterFiles: { path: string; content: string }[] = [
  {
    path: 'README.md',
    content: `# Shortlist

Applicant tracking for small teams hiring fewer than ten people a year. Create a job and get a hosted
careers page and application form (custom questions, CV upload to private storage), a pipeline board per
job with drag and drop, scorecards, notes and @mentions, quoted AI summaries of each CV against your own
criteria (assistive only: never scores, never rejects), candidate self-booking from interviewers' Google
Calendars, templated emails, and automatic GDPR retention with access and deletion requests.

## Stack
Next.js (App Router) + Tailwind + shadcn/ui, Supabase (auth, Postgres + RLS, storage, edge functions,
pg_cron), Claude API claude-haiku-5-5 (CV summaries), Google Calendar API (free/busy + events with Meet),
Resend (email), Stripe (subscriptions), Vercel.

## Start
1. \`npm install\`
2. Copy \`.env.example\` to \`.env.local\` and fill it in.
3. Run \`supabase/migrations/0001_init.sql\` in the Supabase SQL editor once.
4. Set the edge function secrets listed at the bottom of \`.env.example\` and deploy the nine functions.
5. \`npm run dev\`, sign up, finish onboarding, publish a job, apply to it from your phone.

## Rules that keep it fair and safe
- The AI never scores, ranks or rejects. Every stage change is a person, recorded in stage_events.
- Nobody can reject an application whose CV nobody opened (move_application enforces it).
- CV text is redacted before it reaches the model; every quote is checked against the CV.
- Candidates can opt out of AI. Interviewers see only their jobs. Scorecards are blind until you submit.
- CVs live in the private cvs bucket. Public pages read only through get_careers_page / get_public_job.
- Retention deletes closed candidates on time; deletion_log keeps a hash, never the email.
- Every AI summary and application is metered in usage_ledger and capped by plan_limits() on the server.
`,
  },
  {
    path: 'CLAUDE.md',
    content: `# Shortlist

Read @PRD.md before planning any task. Build milestones in order (PRD section 22).
UI rules: @DESIGN_SYSTEM.md @DESIGN.md

## Stack
Next.js App Router, TypeScript, Tailwind, shadcn/ui. Supabase cloud (publishable key in the browser, secret
key server-only, getClaims() on the server). Edge functions in supabase/functions with shared helpers in
_shared/. Model for CV summaries: claude-haiku-5-5.

## Commands
- npm run dev / npm run build / npm run lint
- npx supabase functions deploy <name> --no-verify-jwt (all nine sl-* functions check auth themselves)
- npx tsx scripts/e2e.ts (end-to-end test)

## Product rules (PRD sections 9 and 10, never break them)
- No AI score, rank, percentage or recommendation anywhere: not in the UI, not in the database, not in emails.
- The AI never moves, rejects or emails a candidate. Stage changes only through move_application().
- Redact names, contacts, links and personal-detail lines before any model call. Verify every quote.
- Respect ai_opt_out and workspaces.ai_enabled. Respect retention. Never log CV text, answers or emails.
- No date of birth, photo, gender, nationality or similar fields, ever.

## Security rules
- Public pages never read tables directly: RPCs get_careers_page / get_public_job, or edge functions.
- Never store raw tokens (invites, booking links, privacy links). Store sha256 only.
- Google refresh tokens: AES-GCM encrypted in calendar_tokens, readable only by edge functions.
- Every paid API call: checkLimit() before, meter() after, with an idempotency key.
- CV, answers and cover letter reach Claude only inside tags, as data. No tools are given to the model.
- Webhooks verify signatures (Stripe raw body, Resend Svix headers) and de-duplicate by event id.

## Workflow
Plan mode first for schema, RLS, the apply form, the AI worker, privacy deletion and Stripe. Show me the
plan, wait for OK.
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
RESEND_API_KEY=re_xxx
EMAIL_FROM=Shortlist <team@mail.yourdomain.com>

# Supabase secrets (Edge Functions > Secrets), never in the browser
# ANTHROPIC_API_KEY=sk-ant-xxx
# GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
# GOOGLE_CLIENT_SECRET=GOCSPX-xxx
# OAUTH_STATE_SECRET=openssl rand -hex 32
# TOKEN_ENCRYPTION_KEY=openssl rand -base64 32 (never change after go-live)
# IP_HASH_SALT=openssl rand -hex 32
# CRON_SECRET=openssl rand -hex 32 (also stored in Vault as cron_secret)
# RESEND_API_KEY=re_xxx (same as above)
# RESEND_WEBHOOK_SECRET=whsec_xxx (Resend > Webhooks > endpoint)
# EMAIL_FROM_DOMAIN=mail.yourdomain.com
# APP_URL=http://localhost:3000 (https://yourdomain.com in production)
`,
  },
  {
    path: 'lib/plans.ts',
    content: `// Keep in sync with public.plan_limits() in the migration.
export type PlanKey = 'starter' | 'team' | 'growth'

export const PLAN_LIMITS: Record<PlanKey, {
  seats: number; openJobs: number; aiScreens: number; applications: number; removeBranding: boolean; reports: boolean
}> = {
  starter: { seats: 3, openJobs: 2, aiScreens: 150, applications: 450, removeBranding: false, reports: false },
  team: { seats: 10, openJobs: 8, aiScreens: 500, applications: 1500, removeBranding: true, reports: true },
  growth: { seats: 25, openJobs: 25, aiScreens: 1500, applications: 4500, removeBranding: true, reports: true },
}

export const PRICES: Record<PlanKey, { month: number; year: number }> = {
  starter: { month: 29, year: 290 },
  team: { month: 69, year: 690 },
  growth: { month: 149, year: 1490 },
}

// Stripe lookup keys: starter_month, starter_year, team_month, team_year, growth_month, growth_year.
export const lookupKey = (plan: PlanKey, interval: 'month' | 'year') => plan + '_' + interval
`,
  },
  {
    path: 'lib/tags.ts',
    content: `// Stage and AI assessment colours from DESIGN.md sections 2.1 and 2.2. Use these, never raw hex.
export const STAGES = ['applied', 'screen', 'interview', 'offer', 'hired', 'rejected'] as const
export type Stage = (typeof STAGES)[number]

export const STAGE_LABEL: Record<Stage, string> = {
  applied: 'Applied', screen: 'Screen', interview: 'Interview', offer: 'Offer', hired: 'Hired', rejected: 'Rejected',
}

export const STAGE_TAG: Record<Stage, { fill: string; edge: string; ink: string }> = {
  applied: { fill: '#f3f4f6', edge: '#dfe1e6', ink: '#4a4f57' },
  screen: { fill: '#f2f3fd', edge: '#cdd2f6', ink: '#4652b8' },
  interview: { fill: '#f5f0fd', edge: '#ddd0f6', ink: '#6a46b8' },
  offer: { fill: '#fdf6ea', edge: '#f1dcb0', ink: '#8a5a07' },
  hired: { fill: '#eef8f0', edge: '#c4e6cb', ink: '#1d7a34' },
  rejected: { fill: '#fbf1f1', edge: '#f0d2d2', ink: '#9a4040' },
}

// No red, no ticks: an AI label is never a verdict.
export const ASSESSMENT = {
  meets: { label: 'Meets', fill: '#eef8f0', edge: '#c4e6cb', ink: '#1d7a34', dashed: false },
  partly: { label: 'Partly', fill: '#fdf6ea', edge: '#f1dcb0', ink: '#8a5a07', dashed: false },
  not_shown: { label: 'Not shown', fill: '#f3f4f6', edge: '#dfe1e6', ink: '#4a4f57', dashed: false },
  unclear: { label: 'Unclear', fill: '#ffffff', edge: '#dcdde0', ink: '#62666d', dashed: true },
} as const
`,
  },
]
