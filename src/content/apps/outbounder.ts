// Outbounder: AI cold email for B2B founders and agencies.
import type { AppDef } from '../types'
import { backendTasks } from './outbounder/backendTasks'
import { buildPrd } from './outbounder/buildPrd'
import { designPrd } from './outbounder/designPrd'
import { edgeFunctions } from './outbounder/edgeFunctions'
import { frontendTasks } from './outbounder/frontendTasks'
import { landingPrd } from './outbounder/landingPrd'
import { launchTasks, marketing } from './outbounder/marketing'
import { repoTree, starterFiles } from './outbounder/misc'
import { securityTasks } from './outbounder/securityTasks'
import { sql } from './outbounder/sql'

export const outbounder: AppDef = {
  slug: 'outbounder',
  name: 'Outbounder',
  tagline: 'Cold email that reads human',
  oneLiner: 'Describe your buyer and Outbounder finds verified leads, writes a first line from each company\'s website and sends from safe inboxes on your own outreach domain.',
  category: 'sales',
  art: { motif: 'mail', tone: 'blue' },
  price: { monthly: 79, trialDays: 7 },
  difficulty: 3,
  buildHours: 30,
  apis: [
    {
      name: 'Prospeo',
      job: 'searches B2B people by title, location, company size and industry, and reveals verified work emails',
      signupUrl: 'https://app.prospeo.io/signup',
      docsUrl: 'https://prospeo.io/api-docs/search-person',
      pricing: 'Checked Oct 2026: Free 100 credits/month; Starter $49 (2,000 credits), Growth $99 (5,000), Pro $249 (15,000) per month [verify]. Search Person costs 1 credit per page of 25 results; a verified email costs 1 credit and nothing is charged when no email is found. About $0.017 per lead on Pro. Chosen over Apollo (advanced API filters depend on each customer\'s Apollo plan, so every user would need their own key) and LeadMagic (which plan includes search is unclear, $99 vs $499)',
      envVars: [
        { name: 'PROSPEO_API_KEY', where: 'Prospeo dashboard > API > API key', pasteInto: 'Supabase secrets', secret: true },
        { name: 'PROSPEO_API_KEY', where: 'Same key, used by the onboarding sample route', pasteInto: '.env.local', secret: true },
      ],
    },
    {
      name: 'MillionVerifier',
      job: 'double-checks every email before it can be queued, so bounces stay under 2%',
      signupUrl: 'https://app.millionverifier.com/signup',
      docsUrl: 'https://developer.millionverifier.com',
      pricing: 'Checked Oct 2026: pay as you go, credits never expire. About $37 to $39 per 10,000 checks and $99 to $149 per 100,000 [verify, third-party sources disagree]. About $0.0037 per lead',
      envVars: [
        { name: 'MILLIONVERIFIER_API_KEY', where: 'MillionVerifier > API > API key', pasteInto: 'Supabase secrets', secret: true },
      ],
    },
    {
      name: 'Firecrawl',
      job: 'scrapes each lead\'s company homepage and about page into clean markdown for Claude',
      signupUrl: 'https://www.firecrawl.dev/signin',
      docsUrl: 'https://docs.firecrawl.dev',
      pricing: 'Checked Oct 2026: free starter credits; Hobby $16/mo (3,000 credits, some pages say 5,000 on annual [verify]); Standard $83/mo (100,000 credits); Growth $333/mo (500,000). A scrape is 1 credit per page; Outbounder scrapes 2 pages per company with a 30-day cache, about $0.0017 per lead on Standard',
      envVars: [
        { name: 'FIRECRAWL_API_KEY', where: 'Firecrawl dashboard > API Keys (fc-...)', pasteInto: 'Supabase secrets', secret: true },
        { name: 'FIRECRAWL_API_KEY', where: 'Same key, for the onboarding sample and the free tool', pasteInto: '.env.local', secret: true },
      ],
    },
    {
      name: 'Anthropic Claude',
      job: 'writes the subject, first line and email for each lead with claude-sonnet-5-5 and labels replies with claude-haiku-5-5',
      signupUrl: 'https://platform.claude.com',
      docsUrl: 'https://platform.claude.com/docs/en/build-with-claude/structured-outputs',
      pricing: 'Checked Oct 2026: claude-sonnet-5-5 $2 per million input tokens and $10 per million output (cache reads $0.20); claude-haiku-5-5 $0.10 and $0.50. About $0.008 per personalised email and $0.0002 per labelled reply. Set a monthly spend limit in Settings > Limits',
      envVars: [
        { name: 'ANTHROPIC_API_KEY', where: 'platform.claude.com > Settings > API keys (sk-ant-...)', pasteInto: 'Supabase secrets', secret: true },
        { name: 'ANTHROPIC_API_KEY', where: 'Same key, for the onboarding sample and the free tool', pasteInto: '.env.local', secret: true },
      ],
    },
    {
      name: 'AgentMail',
      job: 'gives each user a private pod with outreach domains (with the DNS records to add), dedicated inboxes, sending, threaded replies and a signed message.received webhook',
      signupUrl: 'https://console.agentmail.to',
      docsUrl: 'https://docs.agentmail.to',
      pricing: 'Checked Oct 2026 (agentmail.to/pricing via search, page not fetchable): Free $0 (3 inboxes, 3,000 emails/month, 100/day, no custom domains); Developer $20/mo (10 inboxes, 10,000 emails, 10 custom domains); Startup $200/mo (150 inboxes, 150,000 emails, 150 domains); Enterprise custom with dedicated IPs. About $1.33 per inbox on Startup. Add-ons of about $2 per extra inbox or domain are reported [verify]. Confirm with AgentMail support that low-volume B2B outreach fits their acceptable use policy [verify]',
      envVars: [
        { name: 'AGENTMAIL_API_KEY', where: 'console.agentmail.to > API Keys > Create API key (organisation scope)', pasteInto: 'Supabase secrets', secret: true },
        { name: 'AGENTMAIL_WEBHOOK_SECRET', where: 'The "secret" returned by POST /v0/webhooks (whsec_...)', pasteInto: 'Supabase secrets', secret: true },
      ],
    },
  ],
  idealFor: 'Founders who want a technical but very sellable SaaS: B2B founders, agency owners and recruiters who already do their own cold email and hate gluing four tools together.',
  whyItSells: 'A personalised first line takes 3 to 5 minutes by hand, so 100 leads a week is a full working day. Outbounder does 25 in about 2 minutes and replaces a $150 to $300 a month stack (lead database, verifier, sequencer, inboxes) for $79.',
  features: [
    'Describe your ICP and get verified B2B leads from Prospeo, double-checked with MillionVerifier',
    'A first line for every lead written by Claude from facts on their own website, with the source shown',
    'Keyboard-first review queue: nothing sends until you approve it',
    'Separate outreach domains and inboxes set up through AgentMail, with every DNS record to copy into Porkbun',
    'Safe sending: 20 a day per new inbox ramping to 30, send windows in each lead\'s time zone, plain text, no tracking',
    'Unsubscribe link and one-click List-Unsubscribe header on every email, with bounces and opt-outs suppressed everywhere',
    'Unified inbox where Claude labels replies interested, not now, unsubscribe or out of office, and any reply stops the sequence',
    'Usage meters and hard plan caps on every paid API call, so no surprise bills',
  ],
  status: 'full',
  costs: {
    usage: { label: 'New leads per customer per month', unit: 'leads', default: 350, min: 50, max: 900, step: 50 },
    plans: [
      { id: 'starter', name: 'Starter', price: 79, interval: 'month', includes: '350 verified leads, 525 AI-written emails, 1,000 sends, 2 domains, 3 inboxes, 3 active campaigns' },
      { id: 'growth', name: 'Growth', price: 179, interval: 'month', includes: '900 verified leads, 1,350 AI-written emails, 2,700 sends, 3 domains, 6 inboxes, 10 active campaigns' },
      { id: 'starter-annual', name: 'Starter (annual)', price: 790, interval: 'year', includes: 'Starter limits every month, 2 months free' },
      { id: 'growth-annual', name: 'Growth (annual)', price: 1790, interval: 'year', includes: 'Growth limits every month, 2 months free' },
    ],
    lines: [
      {
        name: 'Lead search and email reveal',
        vendor: 'Prospeo',
        kind: 'perUnit',
        amount: 0.0173,
        freeTier: '100 credits a month on Free (API access may need a paid plan) [verify]',
        note: 'Pro $249 for 15,000 credits = $0.0166 per verified email, plus 1 search credit per 25 people (about $0.0007 per lead). Below ~12 customers you pay a plan floor ($49 Starter, $99 Growth) instead. Recheck quarterly.',
        url: 'https://prospeo.io',
      },
      {
        name: 'Email verification',
        vendor: 'MillionVerifier',
        kind: 'perUnit',
        amount: 0.0037,
        freeTier: 'A few free test credits on signup',
        note: '$37 per 10,000 credits pack = $0.0037 per lead. Bigger packs drop to about $0.0015. One check per lead.',
        url: 'https://www.millionverifier.com',
      },
      {
        name: 'Website scraping',
        vendor: 'Firecrawl',
        kind: 'perUnit',
        amount: 0.0017,
        freeTier: 'Free starter credits; Hobby $16/mo covers about 1,500 leads',
        note: '2 pages per company at the Standard rate ($83 for 100,000 credits = $0.00083 each). The 30-day company cache lowers this in practice. Start on Hobby, move to Standard around 4 customers.',
        url: 'https://www.firecrawl.dev/pricing',
      },
      {
        name: 'AI personalisation and reply labels',
        vendor: 'Anthropic',
        kind: 'perUnit',
        amount: 0.0082,
        note: 'Sonnet 5.5: about 2,500 input tokens (system prompt cached) and 350 output per lead = $0.008 including retries. Haiku 5.5 reply labels: about $0.0002 per reply, roughly 1 reply per 20 leads.',
        url: 'https://www.anthropic.com/pricing',
      },
      {
        name: 'Inboxes, domains and sending',
        vendor: 'AgentMail',
        kind: 'fixed',
        amount: 20,
        steps: [
          { fromCustomers: 3, amount: 200 },
          { fromCustomers: 35, amount: 400 },
          { fromCustomers: 100, amount: 900 },
          { fromCustomers: 300, amount: 2400 },
          { fromCustomers: 1000, amount: 6500 },
        ],
        freeTier: 'Free plan has no custom domains, so start on Developer ($20, 10 inboxes)',
        note: 'Developer $20 covers about 3 Starter customers (3 inboxes each). Startup $200 covers 150 inboxes (about 35 customers at ~4.5 inboxes average). Above that, Enterprise pricing modelled at about $1.30 per inbox [verify with AgentMail sales].',
        url: 'https://www.agentmail.to/pricing',
      },
      {
        name: 'Database, auth, edge functions, cron',
        vendor: 'Supabase',
        kind: 'fixed',
        amount: 25,
        steps: [
          { fromCustomers: 150, amount: 40 },
          { fromCustomers: 400, amount: 85 },
          { fromCustomers: 1000, amount: 135 },
        ],
        freeTier: 'Free plan for building (pauses after a week of inactivity)',
        note: 'Pro $25 from the first customer (includes Micro compute). Small compute (+$15) around 150 customers, Medium around 400, Large around 1,000 as messages and leads tables grow [verify compute prices].',
        url: 'https://supabase.com/pricing',
      },
      {
        name: 'Hosting',
        vendor: 'Vercel',
        kind: 'fixed',
        amount: 20,
        freeTier: 'Hobby is free but non-commercial only',
        note: 'Pro $20/mo includes $20 of usage. The heavy work runs in Supabase, so Vercel usage stays low.',
        url: 'https://vercel.com/pricing',
      },
      {
        name: 'App email (never cold email)',
        vendor: 'Resend',
        kind: 'fixed',
        amount: 0,
        steps: [
          { fromCustomers: 80, amount: 20 },
          { fromCustomers: 1000, amount: 90 },
        ],
        freeTier: '3,000 emails a month',
        note: 'About 35 app emails per customer per month (alerts, digests, receipts). Pro $20 (50,000 emails) from about 80 customers; Scale tier later [verify].',
        url: 'https://resend.com/pricing',
      },
      {
        name: 'Product domain',
        vendor: 'Porkbun',
        kind: 'fixed',
        amount: 1,
        note: 'About $11 a year for the .com. Customers buy their own outreach domains, so these are not your cost.',
        url: 'https://porkbun.com',
      },
    ],
    notes: [
      'Variable cost per lead is about $0.031: Prospeo $0.0173 + MillionVerifier $0.0037 + Firecrawl $0.0017 + Claude $0.0082.',
      'Starter at its 350-lead cap: 350 x $0.031 = $10.85, plus 3 inboxes at ~$1.33 = $4.00, plus ~$1 shared infrastructure = $15.85. Stripe fees on $79 are about $3.14, so gross margin is (79 - 15.85 - 3.14) / 79 = 76%.',
      'Growth at its 900-lead cap: 900 x $0.031 = $27.90, plus 6 inboxes = $8.00, plus $1 = $36.90. Stripe fees about $6.74, so gross margin is (179 - 36.90 - 6.74) / 179 = 76%.',
      'Send caps (1,000 and 2,700 a month) cost almost nothing extra: sending is priced per inbox, and the caps match what 3 or 6 ramped inboxes can safely send (20 to 30 a day, about 21 send days).',
      'Annual plans (2 months free) land at about 72% at full cap; average usage sits well under the cap, so blended margin stays above 75%.',
      'The original single $79 plan with 1,500 leads would have cost about $52 per customer at cap (34% margin). That is why the limits are 350 and 900 and Growth exists.',
      'Below about 12 customers, vendor plan minimums (Prospeo $49 to $99, Firecrawl $16, AgentMail $20 to $200, MillionVerifier $37 pack) dominate; budget about $150 a month of fixed spend before revenue.',
      'If a vendor raises prices, change the limits in the public.plans table, not the price.',
    ],
  },
  content: {
    buildPrd,
    designPrd,
    landingPrd,
    sql,
    edgeFunctions,
    frontendTasks,
    backendTasks,
    securityTasks,
    marketing,
    launchTasks,
    repoTree,
    starterFiles,
  },
}
