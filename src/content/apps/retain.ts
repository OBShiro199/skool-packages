// Retain: spots Stripe customers about to cancel and wins them back before they go.
import type { AppDef } from '../types'
import { buildPrd1 } from './retain/buildPrd1'
import { buildPrd2 } from './retain/buildPrd2'
import { buildPrd3 } from './retain/buildPrd3'
import { designPrd } from './retain/designPrd'
import { landingPrd } from './retain/landingPrd'
import { sql } from './retain/sql'
import { edgeFunctions } from './retain/edgeFunctions'
import { frontendTasks } from './retain/frontendTasks'
import { backendTasks } from './retain/backendTasks'
import { securityTasks } from './retain/securityTasks'
import { outbound, inbound, paid } from './retain/marketing'
import { launchTasks, repoTree, starterFiles } from './retain/launch'

export const retain: AppDef = {
  slug: 'retain',
  name: 'Retain',
  tagline: 'Save customers before they cancel',
  oneLiner: 'Connect Stripe and Retain scores every customer for churn risk in plain words, recovers failed payments, runs a cancel flow with save offers, and drafts win-back emails with Claude.',
  category: 'business',
  art: { motif: 'chart', tone: 'violet' },
  price: { monthly: 49, trialDays: 7 },
  difficulty: 3,
  buildHours: 32,
  apis: [
    {
      name: 'Stripe Apps (OAuth install)',
      job: 'lets each SaaS founder install the Retain app on their own Stripe account with only the permissions Retain needs (read customers, subscriptions, invoices and events; write subscription discounts, pauses and plan changes), and sends their account\'s events to Retain by webhook',
      signupUrl: 'https://dashboard.stripe.com/apps',
      docsUrl: 'https://docs.stripe.com/stripe-apps/api-authentication/oauth',
      pricing: 'Checked Oct 2026: free. Stripe charges nothing to build, publish or install a Stripe App, and nothing per API call. The founder keeps paying their normal Stripe fees on their own charges. Public listing in the Stripe App Marketplace needs a Stripe review (about a week [verify]); test-mode and external test installs work before review.',
      envVars: [
        { name: 'STRIPE_APP_INSTALL_URL', where: 'Stripe Dashboard > Apps > your Retain app > External test (or Settings > Install link once published) > copy the Test mode OAuth link (marketplace.stripe.com/oauth/v2/...)', pasteInto: 'Vercel env', secret: false },
        { name: 'STRIPE_APP_WEBHOOK_SECRET', where: 'Stripe > Developers > Webhooks (Workbench > Event destinations) > the destination for events on connected accounts pointing at rt-stripe-events > Signing secret (whsec_...)', pasteInto: 'Supabase secrets', secret: true },
        { name: 'RETAIN_TOKEN_KEY', where: 'Make one: run openssl rand -base64 32. Used to encrypt each founder\'s Stripe tokens and signing secrets at rest (AES-GCM). Also add the same value to Vercel env (server only) for the key-rotation route', pasteInto: 'Supabase secrets', secret: true },
      ],
    },
    {
      name: 'Claude API (Anthropic)',
      job: 'writes the one-line plain-words summary for each at-risk customer (overnight, through the Message Batches API at half price), tags free-text cancel reasons, and drafts personalised win-back emails from each cancelled customer\'s usage history, using claude-opus-5-5 with structured JSON output',
      signupUrl: 'https://console.anthropic.com',
      docsUrl: 'https://docs.claude.com/en/api/overview',
      pricing: 'Checked Oct 2026: claude-opus-5-5 is $4 per million input tokens and $20 per million output tokens ($0.20 cached input). The Message Batches API is 50% off ($2 / $10). A risk summary costs about $0.0066 in a batch, a 3-email win-back draft about $0.031, a cancel reason tag about $0.009. Prepaid credit; set a monthly spend limit in Settings > Limits.',
      envVars: [
        { name: 'ANTHROPIC_API_KEY', where: 'console.anthropic.com > Settings > API Keys > Create Key (sk-ant-...)', pasteInto: 'Supabase secrets', secret: true },
      ],
    },
  ],
  idealFor: 'Founders who want a first B2B SaaS sold to people they understand: other SaaS founders between $5k and $100k MRR who bill with Stripe and have no retention team.',
  whyItSells: 'A SaaS at $30k MRR with 5% monthly churn loses $1,500 of MRR every month. Recovering half the failed payments and saving one in five cancellers wins back about $450 of MRR a month, 3.5 times the $129 Growth plan, and every saved dollar keeps paying next month too.',
  features: [
    'Install the Retain Stripe App in two clicks: scoped permissions, no secret keys pasted anywhere',
    'A churn risk score for every customer from failed payments, downgrades, seat cuts, expiring cards, trials ending and usage drops, explained in plain words',
    'Optional usage tracking with a 1 KB JS snippet or a signed server webhook',
    'Failed-payment emails in your brand with a one-click update-card page, plus Smart Retries settings checked for you',
    'An embeddable cancel page with a reasons survey, tailored save offers (pause, discount, downgrade) applied in Stripe instantly, and an exit interview',
    'Win-back sequences for cancelled customers, drafted by Claude from their own usage history and sent through Resend',
    'A dashboard of MRR at risk, saved MRR, recovered payments and churn reasons over time',
    'Hard plan caps on every AI call and email, shown in the app before you reach them',
  ],
  status: 'full',
  costs: {
    usage: { label: 'Active Stripe customers tracked per workspace', unit: 'customers', default: 400, min: 50, max: 6000, step: 50 },
    plans: [
      { id: 'starter-monthly', usageCap: 500, name: 'Starter', price: 49, interval: 'month', includes: 'Up to $10k MRR, 500 tracked customers, 500 AI risk summaries, 50 win-back drafts, 100 exit-interview tags, 500 emails and 250,000 usage events a month, 2 seats' },
      { id: 'starter-yearly', usageCap: 500, name: 'Starter (yearly)', price: 490, interval: 'year', includes: 'Same as Starter, 2 months free' },
      { id: 'growth-monthly', usageCap: 2000, name: 'Growth', price: 129, interval: 'month', includes: 'Up to $40k MRR, 2,000 tracked customers, 2,000 risk summaries, 200 win-back drafts, 400 exit tags, 2,000 emails, 1M usage events, A/B test offers, 5 seats' },
      { id: 'growth-yearly', usageCap: 2000, name: 'Growth (yearly)', price: 1290, interval: 'year', includes: 'Same as Growth, 2 months free' },
      { id: 'scale-monthly', usageCap: 6000, name: 'Scale', price: 349, interval: 'month', includes: 'Up to $100k MRR, 6,000 tracked customers, 6,000 risk summaries, 400 win-back drafts, 800 exit tags, 6,000 emails, 3M usage events, no Retain badge on the cancel page, 10 seats' },
      { id: 'scale-yearly', usageCap: 6000, name: 'Scale (yearly)', price: 3490, interval: 'year', includes: 'Same as Scale, 2 months free' },
    ],
    lines: [
      { name: 'Claude: risk summaries (Batches API)', vendor: 'Anthropic', kind: 'perUnit', amount: 0.0066, note: 'At most 1 summary per tracked customer a month (the plan cap). Each: 1,200 input tokens at the batch price $2/MTok = $0.0024, 2,000 cached system tokens at $0.10/MTok = $0.0002, about 400 output tokens incl. low-effort thinking at $10/MTok = $0.004. Total $0.0066. Checked Oct 2026.', url: 'https://www.anthropic.com/pricing' },
      { name: 'Claude: win-back drafts', vendor: 'Anthropic', kind: 'perUnit', amount: 0.0025, note: 'A 3-email draft is about 3,000 input + 2,500 output tokens in a batch = $0.031. Caps are 0.1 drafts per tracked customer (Starter, Growth) and 0.067 (Scale); modelled at 0.08 per customer = $0.0025.', url: 'https://www.anthropic.com/pricing' },
      { name: 'Claude: exit-interview tags', vendor: 'Anthropic', kind: 'perUnit', amount: 0.0014, note: 'Real-time call, 800 input + 300 output tokens at $4/$20 per MTok = $0.0092. Caps are 0.2 tags per tracked customer (Starter, Growth) and 0.13 (Scale); modelled at 0.15 = $0.0014.', url: 'https://www.anthropic.com/pricing' },
      { name: 'Dunning and win-back email', vendor: 'Resend', kind: 'perUnit', amount: 0.0005, freeTier: '3,000 emails a month, 100 a day.', note: 'Cap is 1 email per tracked customer a month (real use is about 0.5: 8% failed payments x 4 emails + 4% cancels x 3 + card expiry). Pro is $20 for 50,000 ($0.0004 each), overage $0.90 per 1,000 [verify]; blended at $0.0005.', url: 'https://resend.com/pricing' },
      { name: 'Database rows and storage', vendor: 'Supabase', kind: 'perUnit', amount: 0.0005, note: 'Raw usage events are kept 90 days, then rolled up to one row per customer per day. About 0.6 MB per tracked customer, plus scores and Stripe snapshots. Disk at $0.125/GB plus a share of compute: $0.0005 is a generous ceiling.', url: 'https://supabase.com/pricing' },
      { name: 'Supabase', vendor: 'Supabase', kind: 'fixed', amount: 25, steps: [{ fromCustomers: 0, amount: 0 }, { fromCustomers: 1, amount: 25 }, { fromCustomers: 150, amount: 40 }, { fromCustomers: 600, amount: 85 }], freeTier: 'Free plan for building (pauses after a week idle). Upgrade before the first paying customer.', note: 'Pro $25/month with $10 compute credit (Micro). Event ingest and the nightly scorer are write-heavy, so Small compute (+$15) from about 150 workspaces and Medium (+$60) from about 600. Checked Oct 2026 [verify compute prices].', url: 'https://supabase.com/pricing' },
      { name: 'Vercel Pro', vendor: 'Vercel', kind: 'fixed', amount: 20, steps: [{ fromCustomers: 0, amount: 0 }, { fromCustomers: 1, amount: 20 }], freeTier: 'Hobby is free for non-commercial use only.', note: '$20 per member per month with $20 of usage credit. One member is enough. The embed script is served from Vercel\'s CDN with a long cache. Checked Oct 2026.', url: 'https://vercel.com/pricing' },
      { name: 'Stripe App', vendor: 'Stripe', kind: 'fixed', amount: 0, note: 'No fee to build, publish or install a Stripe App, and no per-call charge. Rate limits apply per connected account.', url: 'https://docs.stripe.com/stripe-apps' },
      { name: 'Product analytics', vendor: 'PostHog', kind: 'fixed', amount: 0, freeTier: '1 million events and 5,000 replays a month.', note: 'Only Retain\'s own app events go to PostHog. Founders\' usage events go to Supabase, not PostHog.', url: 'https://posthog.com/pricing' },
      { name: 'Domain', vendor: 'Porkbun', kind: 'fixed', amount: 1, note: 'A .app or .com domain is about $12 to $15 a year, shown as $1 a month [verify].', url: 'https://porkbun.com' },
    ],
    notes: [
      'Per tracked customer at the plan caps: $0.0066 summaries + $0.0025 win-back + $0.0014 exit tags + $0.0005 email + $0.0005 storage = $0.0115 a month.',
      'Starter at its cap (500 customers): $5.75 in API, email and storage costs plus $2.06 Stripe fees on $49 = $7.81. Gross margin about 84%.',
      'Growth at its cap (2,000 customers): $23.00 plus $4.94 Stripe fees on $129 = $27.94. Gross margin about 78%.',
      'Scale at its cap (6,000 customers): $69.00 plus $12.86 Stripe fees on $349 = $81.86. Gross margin about 76.5%.',
      'Typical use is well under the cap: most customers never get a summary because only medium and high risk customers whose score moved 10+ points are summarised, so real AI spend is about a third of the figures above.',
      'Risk scores themselves are computed in Postgres with fixed weights: no AI cost, no matter how many customers.',
      'The 7 day trial is capped at 100 summaries, 5 win-back drafts and 100 emails, so a trial that never converts costs under $1.',
      'MRR bands pick the plan; tracked customers, summaries, drafts, tags and emails are hard caps in usage_ledger, enforced in every edge function that spends money.',
      'Fixed costs (Supabase, Vercel, domain) are about $46 a month: covered by the first paying customer.',
      'Stripe subscription fees are added by the calculator, not listed here.',
    ],
  },
  content: {
    buildPrd: buildPrd1 + buildPrd2 + buildPrd3,
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
