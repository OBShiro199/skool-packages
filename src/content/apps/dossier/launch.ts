// Dossier launch tasks, repo tree and starter files.
import type { Task } from '../../types'

export const launchTasks: Task[] = [
  {
    id: 'dsr-launch-live',
    title: 'Go live: production keys, plans, schedules and the security page',
    outcome: 'Real customers can pay, every worker runs on production, and the /security page answers the buyer\'s first question before they ask it.',
    minutes: 75,
    xp: 55,
    blocks: [
      { type: 'callout', tone: 'eli5', title: 'Test and live are two worlds', text: 'Everything so far used test keys and test prices. Going live means creating live Stripe prices, swapping in production API keys, pointing the schedules at your real domain, and telling the database which live price is which plan. Nothing moves over by itself.' },
      { type: 'steps', items: [
        'Stripe (live mode) > Product catalog: create Dossier Team ($249/month and $2,490/year), Business ($599 and $5,990) and Scale ($1,299 and $12,990). Copy the six live price ids into Vercel env (STRIPE_PRICE_TEAM_MONTHLY and so on), then run the SQL below with the live ids.',
        'Create production keys: Anthropic "dossier-prod" (with its own spend limit, start at $300 a month), Voyage "dossier-prod", LlamaParse "dossier-prod". Put them in Supabase secrets and Vercel env, then redeploy Vercel and every edge function.',
        'Vercel: move to Pro ($20 a month) before the first customer. Hobby is for non-commercial use, and Pro lets /api/jobs/run use up to 800 s for very large files.',
        'Re-run the schedules block from the SQL migration with your production domain (cron.unschedule the old ones first: select cron.unschedule(\'ds-file-runner\');).',
        'Publish /security: hosting (Supabase region, Vercel), encryption at rest and in transit, RLS isolation per workspace, the no-training statement, the subprocessor table and a contact email for security questions. Keep it in sync with Settings > Data.',
        'Fill in Dossier\'s own security questionnaire with Dossier, from your own policies. Keep it ready: your first enterprise-minded customer will send you one.',
      ] },
      { type: 'code', id: 'dsr-launch-live-sql', filename: 'go-live.sql', lang: 'sql', code: `-- Map your LIVE price ids to plans (replace with your live price_ ids).
insert into public.plan_prices (price_id, plan) values
  ('price_live_team_m', 'team'), ('price_live_team_y', 'team'),
  ('price_live_business_m', 'business'), ('price_live_business_y', 'business'),
  ('price_live_scale_m', 'scale'), ('price_live_scale_y', 'scale')
on conflict (price_id) do update set plan = excluded.plan;

-- Schedules are pointing at production and running.
select jobname, schedule, active from cron.job order by jobname;
select jobname, status, start_time from cron.job_run_details d join cron.job j using (jobid)
order by start_time desc limit 10;

-- No test overrides left behind.
select * from public.workspace_limit_overrides;` },
      { type: 'mistakes', items: [
        { mistake: 'Every paying workspace acts like Team.', fix: 'plan_prices still holds your test price ids. Insert the live ids with the SQL above.' },
        { mistake: 'Files stop processing after launch.', fix: 'The ds-file-runner schedule still calls your preview URL or localhost tunnel. Unschedule it and schedule it again with the production domain.' },
        { mistake: 'Drafting fails with 401 in production only.', fix: 'The production key went into Vercel but not Supabase secrets. AI work runs in Supabase, file work on Vercel; each needs its own keys.' },
      ] },
    ],
    checklist: [
      { id: 'dsr-launch-live-c1', label: 'Create the six live prices and map them to plans', trigger: 'copy:dsr-launch-live-sql' },
      { id: 'dsr-launch-live-c2', label: 'Swap production API keys into Supabase and Vercel and redeploy' },
      { id: 'dsr-launch-live-c3', label: 'Move Vercel to Pro and repoint the schedules' },
      { id: 'dsr-launch-live-c4', label: 'Publish the /security page' },
    ],
  },
  {
    id: 'dsr-launch-landing',
    title: 'Build the landing page and record the 60 second demo',
    outcome: 'dossier.app explains the product in one scroll, shows a real spreadsheet being answered with sources, and starts trials.',
    minutes: 120,
    xp: 60,
    blocks: [
      { type: 'steps', items: [
        'Record the demo with Screen Studio on a public sample questionnaire (CAIQ works) and a sample policy set: upload, confirm columns, Draft all, open a Low answer and its evidence, redraft with an instruction, approve and save to library, export, open in Excel. Cut to 60 seconds and burn in captions.',
        'Export 1440px stills of the review workspace, an EvidenceCard and the mapping screen for the hero and feature visuals.',
        'Save LANDING.md, DESIGN.md and DESIGN_SYSTEM.md in the project root, then paste the prompt below.',
      ] },
      { type: 'prompt', id: 'dsr-launch-landing-prompt', title: 'Paste into Claude Code', code: `Build the marketing landing page at app/(marketing)/page.tsx exactly as specified in @LANDING.md, top to bottom:
every section, the exact copy, the motion specs with reduced-motion fallbacks, the responsive notes, SEO metadata,
SoftwareApplication and FAQPage JSON-LD, the OG image and every analytics event. Follow @DESIGN_SYSTEM.md for type,
buttons (white with a firm edge, never filled), stability and motion, with the Dossier teal accent from @DESIGN.md and
square marketing corners. Wire the pricing toggle to the six STRIPE_PRICE_* env vars and carry plan and interval into
/signup. Keep the testimonials section behind SHOW_TESTIMONIALS=false. Add /security, /privacy and /terms pages linked
from the footer. Put the demo video at public/demo.mp4 with a poster, preload none.
When done, screenshot at 320, 390, 768 and 1440 wide and fix any overflow or layout shift.` },
      { type: 'code', id: 'dsr-launch-landing-check', filename: 'landing-check.txt', lang: 'txt', code: `[ ] Hero H1 reads: "Security questionnaires, answered from your own documents."
[ ] Trust line says "Your documents are never used to train AI models." and links to /security
[ ] Every "Start free trial" fires lp_cta_clicked with its location
[ ] Pricing toggle swaps monthly/annual without moving the cards
[ ] Comparison table scrolls sideways on mobile with the first column sticky, every competitor price links to a source
[ ] FAQ JSON-LD validates in Google's Rich Results Test
[ ] OG image renders when the URL is pasted into Slack or LinkedIn
[ ] Lighthouse mobile: LCP under 2.0 s, CLS under 0.05` },
    ],
    checklist: [
      { id: 'dsr-launch-landing-c1', label: 'Record and cut the 60 second demo' },
      { id: 'dsr-launch-landing-c2', label: 'Copy the landing page prompt', trigger: 'copy:dsr-launch-landing-prompt' },
      { id: 'dsr-launch-landing-c3', label: 'Tick every line of the landing check', trigger: 'copy:dsr-launch-landing-check' },
    ],
  },
]

export const repoTree = `dossier/
├── app/
│   ├── (marketing)/page.tsx                  # landing (LANDING.md)
│   ├── (marketing)/pricing/page.tsx
│   ├── (marketing)/security/page.tsx
│   ├── (marketing)/compare/[competitor]/page.tsx
│   ├── (marketing)/guides/[slug]/page.tsx
│   ├── (marketing)/tools/questionnaire-cost/page.tsx
│   ├── (auth)/login/page.tsx
│   ├── (auth)/signup/page.tsx
│   ├── invite/[token]/page.tsx
│   ├── onboarding/page.tsx
│   ├── paywall/page.tsx
│   ├── app/questionnaires/page.tsx
│   ├── app/questionnaires/new/page.tsx
│   ├── app/questionnaires/[id]/page.tsx       # review workspace
│   ├── app/questionnaires/[id]/mapping/page.tsx
│   ├── app/questionnaires/[id]/export/page.tsx
│   ├── app/library/page.tsx
│   ├── app/library/[id]/page.tsx
│   ├── app/library/import/page.tsx
│   ├── app/sources/page.tsx
│   ├── app/sources/[id]/page.tsx
│   ├── app/assigned/page.tsx
│   ├── app/activity/page.tsx
│   ├── app/docs/page.tsx
│   ├── app/help/page.tsx
│   ├── app/billing/page.tsx
│   ├── app/settings/page.tsx
│   └── api/
│       ├── jobs/run/route.ts                  # file runner (Node, maxDuration 300)
│       ├── questionnaires/[id]/mapping/route.ts
│       ├── exports/[id]/download/route.ts
│       └── stripe/webhook/route.ts
├── components/
│   ├── review/{QuestionList,AnswerEditor,EvidencePanel,CommentThread,SelectionBar}.tsx
│   ├── mapping/MappingGrid.tsx
│   ├── sources/UploadSources.tsx
│   ├── shared/{ConfidenceBadge,CitationChip,UsageMeter,RunProgress,AssigneePicker}.tsx
│   └── ui/                                    # shadcn/ui themed to DESIGN_SYSTEM.md
├── lib/
│   ├── runner/{extract_source,parse_questionnaire,extract_questions,import_library,export_questionnaire}.ts
│   ├── xlsx-writeback.ts                      # surgical cell edits with JSZip + xmldom
│   ├── docx-writeback.ts
│   ├── chunk.ts
│   ├── llamaparse.ts
│   ├── plans.ts                               # mirrors plan_limits()
│   ├── workspace.ts
│   └── supabase/{client,server,admin}.ts
├── supabase/
│   ├── migrations/0001_dossier.sql
│   └── functions/
│       ├── _shared/                           # admin, auth, http, log, retry, limits, meter,
│       │                                      # voyage, claude, email, jobs
│       ├── ds-ingest-source/
│       ├── ds-start-questionnaire/
│       ├── ds-draft-run/
│       ├── ds-ai-worker/
│       ├── ds-library-search/
│       ├── ds-invite-member/
│       └── ds-notify/
├── tests/
│   ├── fixtures/{caiq-sample.xlsx,table-questionnaire.docx,form.pdf}
│   └── writeback.test.ts                      # round-trip: other zip entries byte-identical
├── CLAUDE.md                                  # UI rules: @DESIGN_SYSTEM.md @DESIGN.md
├── PRD.md                                     # build PRD (download, save here)
├── DESIGN_SYSTEM.md                           # Quiet Precision base system
├── DESIGN.md                                  # Dossier accent + screens
├── LANDING.md                                 # landing page PRD
├── .env.example
└── README.md`

export const starterFiles: { path: string; content: string }[] = [
  {
    path: 'README.md',
    content: `# Dossier

Security questionnaires and RFPs, answered from your own documents. Upload policies, a SOC 2 summary and past
questionnaires; upload the buyer's XLSX, DOCX or PDF; get every answer drafted with citations and a confidence
score; review, assign, approve into a reusable library; export the original file filled in.

## Stack
Next.js (App Router) + Tailwind + shadcn/ui, Supabase (auth, Postgres + RLS + pgvector, storage, edge functions,
pg_cron), Claude API claude-sonnet-5-5 (drafting), Voyage AI voyage-4 + rerank-2.5 (search), LlamaParse (scanned
PDFs only), exceljs / JSZip / xmldom / unpdf / mammoth / pdf-lib (files, on Vercel), Stripe, Resend, Vercel.

## Start
1. \`npm install\`
2. Copy \`.env.example\` to \`.env.local\` and fill it in.
3. Run \`supabase/migrations/0001_dossier.sql\` in the Supabase SQL editor once.
4. Set the edge function secrets listed at the bottom of \`.env.example\`.
5. \`npm run dev\`, sign up, finish onboarding, upload two policies and a questionnaire.

## Rules that keep it safe
- Every table is isolated by workspace_id with RLS. Search functions are server-only and take a verified workspace id.
- Questions, passages and library answers reach Claude only inside tags, escaped, as data. No tools.
- Citations are checked against what was sent; quotes must match the source.
- Every draft reserves questions from the plan with \`reserve_questions()\` before any AI call.
- Exports edit only the answer cells of the original file.
- Customer data is never used to train models (see Settings > Data).
`,
  },
  {
    path: 'CLAUDE.md',
    content: `# Dossier

Read @PRD.md before planning any task. Build milestones in order (PRD section 23).
UI rules: @DESIGN_SYSTEM.md @DESIGN.md

## Stack
Next.js App Router, TypeScript, Tailwind, shadcn/ui. Supabase cloud (publishable key in the browser, secret key
server-only, getClaims() on the server). AI work in Supabase edge functions (supabase/functions, shared helpers in
_shared/). File work in app/api/jobs/run (Node runtime) with lib/runner/*.

## Commands
- npm run dev / npm run build / npm run lint / npm test
- npx supabase functions deploy <name>
- npx supabase functions deploy <name> --no-verify-jwt (ds-ai-worker and ds-notify only)

## Security rules
- Never call match_chunks, match_library, claim_jobs or reserve_questions from the browser. Secret key only.
- Never trust a workspace_id from a request body without a membership check.
- Never render answers, passages or comments as HTML.
- Every paid API call: check the limit before, meter after, with an idempotency key.
- Untrusted text (questions, passages, library answers) reaches Claude only inside escaped tags. No tools.
- Webhooks verify signatures on the raw body and de-duplicate by event id.
- Never log question text, answers, passages, file names or keys.

## Workflow
Plan mode first for schema, RLS, retrieval, file write-back and Stripe. Show me the plan, wait for OK.
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
STRIPE_PRICE_TEAM_MONTHLY=price_xxx
STRIPE_PRICE_TEAM_YEARLY=price_xxx
STRIPE_PRICE_BUSINESS_MONTHLY=price_xxx
STRIPE_PRICE_BUSINESS_YEARLY=price_xxx
STRIPE_PRICE_SCALE_MONTHLY=price_xxx
STRIPE_PRICE_SCALE_YEARLY=price_xxx
RESEND_API_KEY=re_xxx
EMAIL_FROM=Dossier <hello@dossier.app>
CRON_SECRET=openssl-rand-hex-32
LLAMA_CLOUD_API_KEY=llx-xxx

# Supabase secrets (Edge Functions > Secrets), never in the browser
# ANTHROPIC_API_KEY=sk-ant-xxx
# VOYAGE_API_KEY=xxx
# RESEND_API_KEY / EMAIL_FROM (same as above)
# CRON_SECRET (same as above, also stored in Vault as cron_secret)
# APP_URL=https://dossier.app
`,
  },
  {
    path: 'lib/plans.ts',
    content: `// Keep in sync with public.plan_limits() in the migration.
export type PlanKey = 'team' | 'business' | 'scale'

export const PLAN_LIMITS: Record<PlanKey, {
  questions: number; pages: number; seats: number; documents: number; storageMb: number
  auditDays: number; autoAssign: boolean; twoStep: boolean; auditExport: boolean
}> = {
  team: { questions: 1000, pages: 3000, seats: 5, documents: 300, storageMb: 2048, auditDays: 90, autoAssign: false, twoStep: false, auditExport: false },
  business: { questions: 4000, pages: 10000, seats: 15, documents: 1500, storageMb: 10240, auditDays: 365, autoAssign: true, twoStep: true, auditExport: true },
  scale: { questions: 10000, pages: 30000, seats: 40, documents: 5000, storageMb: 51200, auditDays: 1095, autoAssign: true, twoStep: true, auditExport: true },
}

export const TRIAL_LIMITS = { questions: 150, pages: 300, seats: 3 }

export function planForPrice(priceId: string | null | undefined): PlanKey {
  const env = process.env
  if (priceId === env.STRIPE_PRICE_SCALE_MONTHLY || priceId === env.STRIPE_PRICE_SCALE_YEARLY) return 'scale'
  if (priceId === env.STRIPE_PRICE_BUSINESS_MONTHLY || priceId === env.STRIPE_PRICE_BUSINESS_YEARLY) return 'business'
  return 'team'
}
`,
  },
]
