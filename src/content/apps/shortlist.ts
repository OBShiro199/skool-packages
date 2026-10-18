// Shortlist: applicant tracking for small teams hiring fewer than ten people a year.
import type { AppDef } from '../types'
import { buildPrd1 } from './shortlist/buildPrd1'
import { buildPrd2 } from './shortlist/buildPrd2'
import { designPrd } from './shortlist/designPrd'
import { landingPrd } from './shortlist/landingPrd'
import { sql } from './shortlist/sql'
import { edgeFunctions } from './shortlist/edgeFunctions'
import { frontendTasks } from './shortlist/frontendTasks'
import { backendTasks } from './shortlist/backendTasks'
import { securityTasks } from './shortlist/securityTasks'
import { outbound, inbound, paid } from './shortlist/marketing'
import { launchTasks, repoTree, starterFiles } from './shortlist/launch'

export const shortlist: AppDef = {
  slug: 'shortlist',
  name: 'Shortlist',
  tagline: 'Hiring for teams of ten',
  oneLiner: 'A careers page, an applicant board and quoted AI summaries of every CV against your own criteria, with self-booked interviews and GDPR deletion on autopilot. A person makes every decision.',
  category: 'business',
  art: { motif: 'kanban', tone: 'blue' },
  price: { monthly: 29, trialDays: 7 },
  difficulty: 3,
  buildHours: 34,
  apis: [
    {
      name: 'Claude API (Anthropic)',
      job: 'summarises each redacted CV against the job\'s criteria with claude-haiku-5-5: a Meets, Partly, Not shown or Unclear label per criterion with quotes from the CV, never a score or a decision',
      signupUrl: 'https://console.anthropic.com',
      docsUrl: 'https://docs.claude.com/en/docs/build-with-claude/structured-outputs',
      pricing: 'Checked Oct 2026 from third-party coverage of Anthropic\'s pricing [verify on claude.com/pricing]: claude-haiku-5-5 is $0.10 per million input tokens and $0.50 per million output tokens for prompts up to 100k tokens ($0.50 / $2.50 above 100k), cache reads $0.01. One CV summary (about 7,000 tokens in, 900 out) costs about $0.0012. Pay as you go with prepaid credit; set a monthly spend limit in Settings > Limits.',
      envVars: [
        { name: 'ANTHROPIC_API_KEY', where: 'console.anthropic.com > Settings > API Keys > Create Key (sk-ant-...)', pasteInto: 'Supabase secrets', secret: true },
      ],
    },
    {
      name: 'Google Calendar API',
      job: 'reads each connected interviewer\'s free/busy times to offer interview slots, and creates the interview event with a Google Meet link on the organiser\'s calendar',
      signupUrl: 'https://console.cloud.google.com',
      docsUrl: 'https://developers.google.com/workspace/calendar/api/v3/reference/freebusy/query',
      pricing: 'Free (checked Oct 2026): no charge for Calendar API calls, only quotas. Scopes calendar.freebusy and calendar.events; calendar.events is a sensitive scope, so publishing the app needs Google OAuth verification (free, can take weeks). Up to 100 test users before that [verify].',
      envVars: [
        { name: 'GOOGLE_CLIENT_ID', where: 'Google Cloud > Google Auth Platform > Clients > Shortlist web > Client ID (...apps.googleusercontent.com)', pasteInto: 'Supabase secrets', secret: false },
        { name: 'GOOGLE_CLIENT_SECRET', where: 'Same client > Client secret (GOCSPX-...)', pasteInto: 'Supabase secrets', secret: true },
      ],
    },
  ],
  idealFor: 'People who want a first B2B SaaS sold to a market they can find every day: startup founders, operations leads and agency owners hiring their first 10 people, who post open roles publicly on LinkedIn and job boards.',
  whyItSells: 'A 10 person company hiring 3 roles a year reads about 400 CVs and sends 60+ scheduling emails, usually from a Gmail label. Shortlist does that job for $29 a month, about a tenth of Workable\'s entry price for new customers (around $299 a month [verify]), and every one of those founders announces they are hiring in public.',
  features: [
    'Hosted careers page and job pages with custom questions, Google for Jobs markup and a mobile apply form',
    'CV upload to private storage, opened only by the hiring team for that job',
    'Pipeline board per job (applied, screen, interview, offer, hired, rejected) with drag and drop and live updates',
    'Quoted AI summary of each CV against your criteria: per-criterion labels with evidence, no scores, no auto-reject',
    'Bias lint on job criteria, redaction before the AI, candidate opt-out and blind scorecards',
    'Candidates self-book interviews from every interviewer\'s Google Calendar, with a Meet link created for you',
    'Six editable candidate email templates through Resend, with a 2 hour undo on rejections',
    'GDPR on autopilot: retention timers, access and deletion requests in two clicks, and a deletion log',
  ],
  status: 'full',
  costs: {
    usage: { label: 'Applicants processed per workspace per month', unit: 'applicants', default: 60, min: 5, max: 4500, step: 5 },
    plans: [
      { id: 'starter-monthly', usageCap: 450, name: 'Starter', price: 29, interval: 'month', includes: '3 seats, 2 open jobs, 150 AI summaries and 450 applications a month, careers page, scorecards, Google Calendar booking, GDPR tools' },
      { id: 'starter-yearly', usageCap: 450, name: 'Starter (yearly)', price: 290, interval: 'year', includes: 'Same as Starter, 2 months free' },
      { id: 'team-monthly', usageCap: 1500, name: 'Team', price: 69, interval: 'month', includes: '10 seats, 8 open jobs, 500 AI summaries and 1,500 applications a month, no Shortlist branding, pass-through report' },
      { id: 'team-yearly', usageCap: 1500, name: 'Team (yearly)', price: 690, interval: 'year', includes: 'Same as Team, 2 months free' },
      { id: 'growth-monthly', usageCap: 4500, name: 'Growth', price: 149, interval: 'month', includes: '25 seats, 25 open jobs, 1,500 AI summaries and 4,500 applications a month, everything in Team' },
      { id: 'growth-yearly', usageCap: 4500, name: 'Growth (yearly)', price: 1490, interval: 'year', includes: 'Same as Growth, 2 months free' },
    ],
    lines: [
      { name: 'CV summaries', vendor: 'Anthropic', kind: 'perUnit', amount: 0.0025, note: 'claude-haiku-5-5 at $0.10 / $0.50 per MTok (under 100k input). One summary: 7,000 in ($0.0007) + 900 out ($0.00045) = $0.00115. Budgeted at $0.0025 per applicant to cover re-summaries after criteria changes, retries and scanned PDFs sent as documents (about 7,500 extra tokens). Input is capped at 60,000 tokens so the 5x price tier above 100k is never hit. Checked Oct 2026 [verify].', url: 'https://claude.com/pricing' },
      { name: 'Candidate and team email', vendor: 'Resend', kind: 'perUnit', amount: 0.0045, freeTier: '3,000 emails a month, 100 a day.', note: 'About 5 emails per applicant (received, invite or rejection, confirmed, reminder, team digest share). Priced at Resend\'s overage rate of $0.90 per 1,000 to stay conservative: Pro is $20 for 50,000 ($0.0004 each), so real cost is lower until the 100k tier (sources conflict on $35 or $90 [verify]). Checked Oct 2026.', url: 'https://resend.com/pricing' },
      { name: 'Supabase', vendor: 'Supabase', kind: 'fixed', amount: 25, steps: [{ fromCustomers: 0, amount: 0 }, { fromCustomers: 1, amount: 25 }, { fromCustomers: 300, amount: 40 }, { fromCustomers: 1000, amount: 85 }], freeTier: 'Free plan for building (pauses after a week idle). Upgrade before the first paying customer.', note: 'Pro $25/month with $10 compute credit, 8 GB database, 100 GB file storage. A CV is about 300 KB and is deleted after retention (180 days by default), so a workspace at 60 applicants a month holds about 110 MB: 1,000 workspaces fit in about 110 GB, a few dollars over the included 100 GB at $0.0213/GB. Small compute (+$15) from about 300 workspaces for the workers and Realtime, Medium (+$60) from about 1,000. Checked Oct 2026.', url: 'https://supabase.com/pricing' },
      { name: 'Vercel Pro', vendor: 'Vercel', kind: 'fixed', amount: 20, steps: [{ fromCustomers: 0, amount: 0 }, { fromCustomers: 1, amount: 20 }], freeTier: 'Hobby is free for non-commercial use only.', note: '$20 per member per month with $20 of usage credit. Careers pages are cached for 60 seconds, so traffic stays inside the credit for a long time. Checked Oct 2026.', url: 'https://vercel.com/pricing' },
      { name: 'Google Calendar API', vendor: 'Google', kind: 'fixed', amount: 0, freeTier: 'Free, quota limits only.', note: 'No per-call charge. OAuth verification for the sensitive calendar.events scope is free but slow; start it a few weeks before launch.', url: 'https://developers.google.com/workspace/calendar/api/guides/overview' },
      { name: 'Product analytics', vendor: 'PostHog', kind: 'fixed', amount: 0, freeTier: '1 million events and 5,000 replays a month.', note: 'Free tier covers well past 1,000 workspaces at this event volume (no candidate pages are tracked). Checked Oct 2026.', url: 'https://posthog.com/pricing' },
      { name: 'Domain', vendor: 'Porkbun', kind: 'fixed', amount: 1, note: 'A .com or .app domain is about $11 to $15 a year, shown as $1 a month [verify the price for your name].', url: 'https://porkbun.com' },
    ],
    notes: [
      'Per applicant: $0.0025 Claude + $0.0045 email = $0.007. At the default 60 applicants a month that is $0.42 on a $29 plan.',
      'Starter at its caps (450 applications, 150 AI summaries): 150 x $0.0025 + 450 x $0.0045 = $2.40, plus about $1.34 in Stripe fees on $29: about 87% gross margin.',
      'Team at its caps (1,500 applications, 500 summaries): $1.25 + $6.75 = $8.00, plus about $2.78 in Stripe fees on $69: about 84% margin.',
      'Growth at its caps (4,500 applications, 1,500 summaries): $3.75 + $20.25 = $24.00, plus about $5.66 in Stripe fees on $149: about 80% margin.',
      'The calculator multiplies $0.007 by every applicant, which over-counts AI above the summary cap (a third of the application cap). Even so, Growth at 4,500 applicants is $31.50 + $5.66 = $37.16 on $149: 75% margin.',
      'Annual plans are 10 months\' price for 12 months; Stripe\'s fixed $0.30 is charged once a year, so annual margins are slightly higher.',
      'A 7 day trial is capped at 2 open jobs, 25 AI summaries and 150 applications, so a trial that never converts costs at most about $0.74.',
      'Caps are enforced server-side (plan_limits, usage_ledger, the guard_job_status trigger and sl-apply), so no workspace can pass these numbers.',
      'Fixed costs (Supabase, Vercel, domain) are about $46 a month: covered by the second paying customer.',
      'Stripe subscription fees are added by the calculator, not listed here.',
    ],
  },
  content: {
    buildPrd: buildPrd1 + buildPrd2,
    designPrd,
    landingPrd,
    sql,
    edgeFunctions,
    frontendTasks,
    backendTasks,
    securityTasks,
    marketing: { outbound, inbound, paid },
    launchTasks,
    repoTree,
    starterFiles,
  },
}
