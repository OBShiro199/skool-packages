// Signet: proposals from a sales call.
import type { AppDef } from '../types'
import { buildPrd1 } from './signet/buildPrd1'
import { buildPrd2 } from './signet/buildPrd2'
import { designPrd } from './signet/designPrd'
import { landingPrd } from './signet/landingPrd'
import { sql } from './signet/sql'
import { edgeFunctions } from './signet/edgeFunctions'
import { frontendTasks } from './signet/frontendTasks'
import { backendTasks } from './signet/backendTasks'
import { securityTasks } from './signet/securityTasks'
import { outbound, inbound, paid } from './signet/marketing'
import { launchTasks, repoTree, starterFiles } from './signet/launch'

export const signet: AppDef = {
  slug: 'signet',
  name: 'Signet',
  tagline: 'Proposals from a sales call',
  oneLiner: 'Upload a discovery call and get a branded proposal with three priced options, view tracking, e-signature and a deposit paid to your own Stripe.',
  category: 'business',
  art: { motif: 'mail', tone: 'amber' },
  price: { monthly: 49, trialDays: 7 },
  difficulty: 2,
  buildHours: 25,
  apis: [
    {
      name: 'AssemblyAI',
      job: 'transcribes uploaded and imported sales calls with speaker labels, then calls Signet back by webhook',
      signupUrl: 'https://www.assemblyai.com/dashboard/signup',
      docsUrl: 'https://www.assemblyai.com/docs',
      pricing: 'Checked Oct 2026: Universal-3.5 Pro async $0.21 per audio hour, speaker labels +$0.02 per hour, so about $0.23 for a one hour call. $50 free credit, no card. Picked over Deepgram Nova-3 pre-recorded ($0.0043 to $0.0077/min plus $0.002/min for diarisation, sources conflict [verify]), which costs about $0.38 to $0.58 for the same hour.',
      envVars: [
        { name: 'ASSEMBLYAI_API_KEY', where: 'AssemblyAI dashboard > API Keys > Copy', pasteInto: 'Supabase secrets', secret: true },
        { name: 'ASSEMBLYAI_WEBHOOK_SECRET', where: 'Make one: run openssl rand -hex 32 (sent as the x-signet-webhook header)', pasteInto: 'Supabase secrets', secret: true },
      ],
    },
    {
      name: 'Claude API (Anthropic)',
      job: 'extracts goals, pains, budget signals, scope and timeline from the transcript, drafts the proposal and rewrites sections, using claude-opus-5-5 with structured JSON output',
      signupUrl: 'https://console.anthropic.com',
      docsUrl: 'https://docs.claude.com/en/api/overview',
      pricing: 'Checked Oct 2026: claude-opus-5-5 is $4 per million input tokens, $20 per million output tokens, $0.20 per million cached input tokens. A typical proposal (extraction, draft, 5 rewrites) costs about $0.33. Pay as you go with prepaid credit; set a monthly spend limit in Settings > Limits.',
      envVars: [
        { name: 'ANTHROPIC_API_KEY', where: 'console.anthropic.com > Settings > API Keys > Create Key (sk-ant-...)', pasteInto: 'Supabase secrets', secret: true },
      ],
    },
    {
      name: 'Stripe Connect',
      job: 'lets each agency connect its own Stripe account so client deposits are charged directly on that account',
      signupUrl: 'https://dashboard.stripe.com/connect',
      docsUrl: 'https://docs.stripe.com/connect/direct-charges',
      pricing: 'Checked Oct 2026: Standard accounts with direct charges cost the platform nothing. The agency pays Stripe\'s normal card fee on each deposit and Signet sets no application fee. (Express or Custom accounts where the platform handles pricing cost $2 per active account a month plus 0.25% + $0.25 per payout.)',
      envVars: [
        { name: 'STRIPE_CONNECT_CLIENT_ID', where: 'Stripe > Settings > Connect > Onboarding options > OAuth > client ID (ca_...)', pasteInto: 'Vercel env', secret: false },
        { name: 'STRIPE_CONNECT_WEBHOOK_SECRET', where: 'Stripe > Developers > Webhooks > Connected accounts destination > Signing secret (whsec_...)', pasteInto: 'Supabase secrets', secret: true },
      ],
    },
    {
      name: 'Zoom API',
      job: 'lists a user\'s Zoom cloud recordings and downloads the one they pick into the call pipeline (milestone M8)',
      signupUrl: 'https://marketplace.zoom.us',
      docsUrl: 'https://developers.zoom.us/docs/api/meetings/#tag/cloud-recording',
      pricing: 'Free (checked Oct 2026). Zoom does not charge for API calls on a user-managed General App; users need a Zoom plan with cloud recording. Rate limits apply per account.',
      envVars: [
        { name: 'ZOOM_CLIENT_ID', where: 'Zoom Marketplace > your General App > App Credentials > Client ID (also add it to Supabase secrets)', pasteInto: 'Vercel env', secret: false },
        { name: 'ZOOM_CLIENT_SECRET', where: 'Zoom Marketplace > your General App > App Credentials > Client Secret (also add it to Supabase secrets)', pasteInto: 'Vercel env', secret: true },
      ],
    },
    {
      name: 'Google Meet and Drive APIs',
      job: 'lists Google Meet recordings and downloads them from the organiser\'s Drive with a read-only, Meet-files-only scope (milestone M8)',
      signupUrl: 'https://console.cloud.google.com',
      docsUrl: 'https://developers.google.com/meet/api/guides/artifacts',
      pricing: 'Free (checked Oct 2026). No charge for Meet REST API or Drive API calls, only quotas. Users need Google Workspace with Meet recording. The Drive scope is sensitive, so publishing the app needs Google verification.',
      envVars: [
        { name: 'GOOGLE_CLIENT_ID', where: 'Google Cloud > Google Auth Platform > Clients > Signet web (also add it to Supabase secrets)', pasteInto: 'Vercel env', secret: false },
        { name: 'GOOGLE_CLIENT_SECRET', where: 'Same client > Client secret, GOCSPX-... (also add it to Supabase secrets)', pasteInto: 'Vercel env', secret: true },
      ],
    },
  ],
  idealFor: 'People who want a first B2B SaaS sold to a market they can reach directly: agency owners, freelancers and consultants who run discovery calls and send proposals every week.',
  whyItSells: 'A freelancer sending 8 proposals a month spends about 24 hours writing them. Signet costs $49 and turns each 45 minute call into a priced draft in about 10 minutes, and one extra $5,000 project a quarter ($20,000 a year) pays for it more than 30 times over.',
  features: [
    'Upload, record in the browser, or import a Zoom or Google Meet recording',
    'Transcript with speakers, plus a brief of goals, pains, budget signals, scope and timeline',
    'Branded draft with exec summary, problem, solution, scope, timeline, terms and next steps',
    'Good, better and best pricing built only from your own service catalogue and rules',
    'Block editor with one-click AI rewrite per section and a diff before you keep it',
    'Share link with view tracking and time spent on each section',
    'Typed and drawn e-signature with a tamper-evident fingerprint, then a deposit paid to your own Stripe',
    'Automatic follow-up after 3 days, team workspaces, templates and win-rate analytics',
  ],
  status: 'full',
  costs: {
    usage: { label: 'Proposals drafted from calls per workspace per month', unit: 'proposals', default: 8, min: 1, max: 50, step: 1 },
    plans: [
      { id: 'solo-monthly', name: 'Solo', price: 49, interval: 'month', includes: '1 seat, 10 proposals from calls, 600 call minutes, 100 AI rewrites a month, e-signature, deposits, tracking, 5 templates' },
      { id: 'solo-yearly', name: 'Solo (yearly)', price: 490, interval: 'year', includes: 'Same as Solo, 2 months free' },
      { id: 'studio-monthly', name: 'Studio', price: 99, interval: 'month', includes: '3 seats, 25 proposals from calls, 1,500 call minutes, 250 rewrites, Zoom and Meet import, no Signet footer, per-person analytics' },
      { id: 'studio-yearly', name: 'Studio (yearly)', price: 990, interval: 'year', includes: 'Same as Studio, 2 months free' },
      { id: 'agency-monthly', name: 'Agency', price: 199, interval: 'month', includes: '10 seats, 50 proposals from calls, 3,000 call minutes, 500 rewrites, everything in Studio, meeting bot when it ships' },
      { id: 'agency-yearly', name: 'Agency (yearly)', price: 1990, interval: 'year', includes: 'Same as Agency, 2 months free' },
    ],
    lines: [
      { name: 'Call transcription', vendor: 'AssemblyAI', kind: 'perUnit', amount: 0.17, freeTier: '$50 free credit (about 215 hours).', note: 'A typical 45 minute call at $0.21/hr (Universal-3.5 Pro) + $0.02/hr speaker labels = $0.17. A 90 minute call is $0.35. Checked Oct 2026 [verify on assemblyai.com/pricing].', url: 'https://www.assemblyai.com/pricing' },
      { name: 'Claude: extraction, draft and rewrites', vendor: 'Anthropic', kind: 'perUnit', amount: 0.33, note: 'claude-opus-5-5 at $4/$20 per MTok. Extraction 15k in + 1.5k out = $0.09. Draft 6k in (half cached at $0.20) + 5k out = $0.12. Five rewrites at 3k in + 600 out = $0.12. Total about $0.33 per proposal. Checked Oct 2026.', url: 'https://www.anthropic.com/pricing' },
      { name: 'Supabase', vendor: 'Supabase', kind: 'fixed', amount: 25, steps: [{ fromCustomers: 0, amount: 0 }, { fromCustomers: 1, amount: 25 }, { fromCustomers: 300, amount: 40 }, { fromCustomers: 1000, amount: 85 }], freeTier: 'Free plan for building (pauses after a week idle, 50 MB upload cap). Upgrade before the first paying customer.', note: 'Pro $25/month with $10 compute credit and 100 GB storage. Audio is deleted 30 days after drafting, so each workspace holds about 0.3 GB. Small compute ($15 more) from about 300 workspaces as the worker and Realtime grow, Medium ($60 more) from about 1,000. Checked Oct 2026.', url: 'https://supabase.com/pricing' },
      { name: 'Vercel Pro', vendor: 'Vercel', kind: 'fixed', amount: 20, steps: [{ fromCustomers: 0, amount: 0 }, { fromCustomers: 1, amount: 20 }], freeTier: 'Hobby is free for non-commercial use only.', note: '$20 per member per month with $20 of usage credit. One member is enough. Checked Oct 2026.', url: 'https://vercel.com/pricing' },
      { name: 'Transactional email', vendor: 'Resend', kind: 'fixed', amount: 0, steps: [{ fromCustomers: 0, amount: 0 }, { fromCustomers: 40, amount: 20 }, { fromCustomers: 700, amount: 90 }], freeTier: '3,000 emails a month, 100 a day.', note: 'About 8 emails per proposal (sent, viewed, signed x2, paid, draft ready, follow-ups) x 8 proposals = about 65 per workspace a month. Pro $20 for 50,000 from about 40 workspaces; the 100,000 tier (about $90 [verify]) from about 700. Checked Oct 2026.', url: 'https://resend.com/pricing' },
      { name: 'Stripe Connect (deposits)', vendor: 'Stripe', kind: 'perCustomer', amount: 0, note: 'Standard accounts with direct charges: the agency pays the card fee on its own deposits, Signet pays no Connect fee and takes no cut.', url: 'https://stripe.com/connect/pricing' },
      { name: 'Zoom and Google Meet APIs', vendor: 'Zoom / Google', kind: 'fixed', amount: 0, freeTier: 'Free, quota limits only.', note: 'No per-call charge. Google app verification for the Drive scope is free but takes time.', url: 'https://developers.google.com/meet/api/guides/artifacts' },
      { name: 'Meeting bot (later milestone)', vendor: 'Recall.ai', kind: 'fixed', amount: 0, note: 'Not in v1. When built (Agency only, 600 bot minutes a month): $0.50 per recording hour (the pricing page showed $0.70 when checked) = up to $5 per Agency workspace. First 5 hours free. Re-check before building.', url: 'https://www.recall.ai/pricing' },
      { name: 'Product analytics', vendor: 'PostHog', kind: 'fixed', amount: 0, freeTier: '1 million events and 5,000 replays a month.', note: 'Free tier covers well past 1,000 workspaces at this event volume. Checked Oct 2026.', url: 'https://posthog.com/pricing' },
      { name: 'Domain', vendor: 'Porkbun', kind: 'fixed', amount: 1, note: 'signet.app style domain about $12 to $15 a year, shown as $1 a month [verify the .app price].', url: 'https://porkbun.com' },
    ],
    notes: [
      'Typical proposal cost: $0.17 transcription + $0.33 Claude = $0.50. At the default 8 proposals a month that is $4.00 on a $49 plan.',
      'Solo at every cap (600 call minutes, 10 drafts, 100 rewrites) costs about $7.70 in AI and transcription plus about $2.06 in Stripe fees: about 80% gross margin.',
      'Studio at every cap (1,500 minutes, 25 drafts, 250 rewrites) costs about $19.10 plus $3.86 in Stripe fees on $99: about 77% margin.',
      'Agency at every cap (3,000 minutes, 50 drafts, 500 rewrites) costs about $38.10 plus $7.46 in Stripe fees on $199: about 77% margin.',
      'A 7 day trial is capped at 3 drafts from calls, so a trial that never converts costs about $1.50 at most.',
      'Caps are enforced server-side from usage_ledger in every edge function that spends money, so no workspace can pass these numbers.',
      'Fixed costs (Supabase, Vercel, domain) are about $46 a month: covered by the first paying customer.',
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
