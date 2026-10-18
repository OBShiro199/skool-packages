// Tally: invoices that chase themselves.
import type { AppDef } from '../types'
import { buildPrd1 } from './tally/buildPrd1'
import { buildPrd2 } from './tally/buildPrd2'
import { designPrd } from './tally/designPrd'
import { landingPrd } from './tally/landingPrd'
import { sql } from './tally/sql'
import { edgeFunctions } from './tally/edgeFunctions'
import { frontendTasks } from './tally/frontendTasks'
import { backendTasks } from './tally/backendTasks'
import { securityTasks } from './tally/securityTasks'
import { outbound, inbound, paid } from './tally/marketing'
import { launchTasks, repoTree, starterFiles } from './tally/launch'

export const tally: AppDef = {
  slug: 'tally',
  name: 'Tally',
  tagline: 'Invoices that chase themselves',
  oneLiner: 'Branded invoices sent from your own email domain, with polite, escalating reminders that stop the moment the client pays or replies, and payments straight into your own Stripe.',
  category: 'business',
  art: { motif: 'kanban', tone: 'green' },
  price: { monthly: 19, trialDays: 7 },
  difficulty: 3,
  buildHours: 30,
  apis: [
    {
      name: 'Stripe Connect',
      job: 'lets each freelancer connect or create their own Stripe account so client card and bank payments are charged directly on that account',
      signupUrl: 'https://dashboard.stripe.com/connect',
      docsUrl: 'https://docs.stripe.com/connect/direct-charges',
      pricing: 'Checked Oct 2026: when Stripe handles pricing for connected accounts with full dashboards (Standard-style), the platform pays no Connect fees [verify on stripe.com/connect/pricing]. The freelancer pays Stripe\'s normal fees on their own account (US cards 2.9% + $0.30, ACH Direct Debit 0.8% capped at $5 [verify]). Tally sets no application fee. (Accounts where the platform handles pricing cost $2 per active account a month plus 0.25% + $0.25 per payout.)',
      envVars: [
        { name: 'STRIPE_CONNECT_CLIENT_ID', where: 'Stripe > Settings > Connect > Onboarding options > OAuth > client ID (ca_...)', pasteInto: 'Vercel env', secret: false },
        { name: 'STRIPE_CONNECT_WEBHOOK_SECRET', where: 'Stripe > Developers > Webhooks > Connected accounts destination > Signing secret (whsec_...)', pasteInto: 'Supabase secrets', secret: true },
      ],
    },
    {
      name: 'Resend Domains and Inbound',
      job: 'verifies each freelancer\'s own sending domain through the Domains API, receives client replies on Tally\'s reply subdomain, and reports bounces and complaints by Svix-signed webhook',
      signupUrl: 'https://resend.com/signup',
      docsUrl: 'https://resend.com/docs/api-reference/domains/create-domain',
      pricing: 'Checked Oct 2026: Free 3,000 emails a month (100 a day, 1 domain [verify]); Pro $20 a month for 50,000 emails and 10 domains, about $0.90 per 1,000 extra; Scale from $90 a month for 100,000 emails and about 1,000 domains [verify]. Received emails count toward the monthly quota like sent ones [verify]. Idempotency keys are kept 24 hours.',
      envVars: [
        { name: 'RESEND_WEBHOOK_SECRET', where: 'Resend > Webhooks > your endpoint > Signing secret (whsec_...)', pasteInto: 'Supabase secrets', secret: true },
        { name: 'RESEND_INBOUND_DOMAIN', where: 'The receiving subdomain you set up in Resend, e.g. reply.usetally.app', pasteInto: 'Supabase secrets', secret: false },
        { name: 'TALLY_MAIL_DOMAIN', where: 'Your verified system sending subdomain in Resend > Domains, e.g. mail.usetally.app', pasteInto: 'Supabase secrets', secret: false },
      ],
    },
    {
      name: 'Claude API (Anthropic)',
      job: 'reads each client reply into a fixed intent (promise to pay with a date, paid already, dispute, question, out of office) and rewrites reminder sequences in the user\'s own voice, using claude-opus-5-5 with structured JSON output',
      signupUrl: 'https://console.anthropic.com',
      docsUrl: 'https://docs.claude.com/en/docs/build-with-claude/structured-outputs',
      pricing: 'Checked Oct 2026: claude-opus-5-5 is $4 per million input tokens, $20 per million output tokens, $0.20 per million cached input tokens. Reading one reply (about 1,600 in, 300 out at low effort) costs about $0.013; one "Write in my voice" rewrite about $0.05. Prepaid credit; set a monthly spend limit in Settings > Limits.',
      envVars: [
        { name: 'ANTHROPIC_API_KEY', where: 'console.anthropic.com > Settings > API Keys > Create Key (sk-ant-...)', pasteInto: 'Supabase secrets', secret: true },
      ],
    },
  ],
  idealFor: 'People who want a first B2B SaaS sold to a market they can reach directly: freelancers, consultants and small agencies who send invoices every month and hate chasing late payers.',
  whyItSells: 'A freelancer with $12,000 outstanding at any time spends an hour or two a week writing chase emails. Tally costs $19 a month, sends every polite, escalating reminder from their own email address, and shows their real average days to pay, so the value is measured on their own invoices rather than promised.',
  features: [
    'Branded invoices with line items, per-line tax, discounts and a PDF, sent from your own verified domain',
    'Hosted pay page with card and bank payments (ACH, SEPA, Bacs where available) straight into your own Stripe',
    'Five-step reminder sequence (before due, on the day, +3, +7, +14) that gets firmer each time, editable per client',
    'Reminders stop on payment and pause on reply; "I will pay Friday" pauses until Saturday',
    'Deposits, partial payments, optional capped late fees and recurring invoices',
    'Multi-currency invoicing with dashboard totals in your currency from daily ECB rates',
    'Dashboard with outstanding, overdue, average days to pay and an 8 week cash forecast',
    'Client CSV import and accountant exports in generic, Xero and QuickBooks layouts',
  ],
  status: 'full',
  costs: {
    usage: { label: 'Invoices sent per workspace per month', unit: 'invoices', default: 20, min: 1, max: 750, step: 1 },
    plans: [
      { id: 'solo-monthly', usageCap: 50, name: 'Solo', price: 19, interval: 'month', includes: '1 seat, 50 invoices sent a month, 1 reminder sequence, 1 sending domain, 100 replies read by AI, 10 voice rewrites, unlimited clients, card and bank payments, recurring, deposits, part payments, late fees, multi-currency, CSV exports' },
      { id: 'solo-yearly', usageCap: 50, name: 'Solo (yearly)', price: 190, interval: 'year', includes: 'Same as Solo, 2 months free' },
      { id: 'studio-monthly', usageCap: 250, name: 'Studio', price: 39, interval: 'month', includes: '3 seats, 250 invoices sent a month, 5 sequences, 1 sending domain, 500 replies read, 30 voice rewrites, remove the "Sent with Tally" line, Xero and QuickBooks sync when it ships' },
      { id: 'studio-yearly', usageCap: 250, name: 'Studio (yearly)', price: 390, interval: 'year', includes: 'Same as Studio, 2 months free' },
      { id: 'agency-monthly', usageCap: 750, name: 'Agency', price: 79, interval: 'month', includes: '10 seats, 750 invoices sent a month, unlimited sequences, 3 sending domains (one per brand), 1,500 replies read, 60 voice rewrites, everything in Studio' },
      { id: 'agency-yearly', usageCap: 750, name: 'Agency (yearly)', price: 790, interval: 'year', includes: 'Same as Agency, 2 months free' },
    ],
    lines: [
      { name: 'Reading client replies', vendor: 'Anthropic', kind: 'perUnit', amount: 0.0065, note: 'claude-opus-5-5 at $4/$20 per MTok, low effort. About 1,600 input and 300 output tokens (with thinking) per reply = $0.013, at a worst case of 0.5 replies per invoice = $0.0065 per invoice. Most invoices get no reply. Checked Oct 2026.', url: 'https://www.anthropic.com/pricing' },
      { name: 'Client email at the margin', vendor: 'Resend', kind: 'perUnit', amount: 0.008, note: 'About 9 emails per invoice at the cap (invoice, up to 5 reminders, receipt, owner notice, half an inbound reply) at the overage rate of about $0.90 per 1,000 = $0.008. Covered by the fixed plan below until the quota runs out; kept here so the per-invoice cost is honest. Checked Oct 2026 [verify].', url: 'https://resend.com/pricing' },
      { name: '"Write in my voice" rewrites', vendor: 'Anthropic', kind: 'perCustomer', amount: 0.15, note: 'About $0.05 per rewrite (2,000 input, 1,900 output tokens). Typical workspace uses 3 a month = $0.15. At the caps: Solo 10 ($0.50), Studio 30 ($1.50), Agency 60 ($3.00).', url: 'https://www.anthropic.com/pricing' },
      { name: 'Transactional email plan', vendor: 'Resend', kind: 'fixed', amount: 20, steps: [{ fromCustomers: 0, amount: 0 }, { fromCustomers: 1, amount: 20 }, { fromCustomers: 9, amount: 90 }, { fromCustomers: 550, amount: 160 }], freeTier: '3,000 emails a month, 100 a day, 1 domain [verify].', note: 'The number of domains runs out before the email quota does: Tally uses 2 (mail. and reply.) and each customer with their own domain adds 1. Pro ($20, 10 domains, 50,000 emails) covers about 8 customers; Scale ($90, about 1,000 domains, 100,000 emails) from about 9. A typical workspace sends about 180 emails a month, so 100,000 lasts to about 550 workspaces; the next Scale tier is about $160 [verify]. At about 1,000 customer domains talk to Resend about Enterprise. Checked Oct 2026.', url: 'https://resend.com/pricing' },
      { name: 'Supabase', vendor: 'Supabase', kind: 'fixed', amount: 25, steps: [{ fromCustomers: 0, amount: 0 }, { fromCustomers: 1, amount: 25 }, { fromCustomers: 400, amount: 40 }, { fromCustomers: 1200, amount: 85 }], freeTier: 'Free plan for building (pauses after a week idle). Upgrade before the first paying customer.', note: 'Pro $25/month with $10 compute credit, 8 GB database, 100 GB storage and 2 million edge function calls. PDFs are about 60 KB each, so 1,000 workspaces at 20 invoices a month add about 15 GB a year. The worker runs every minute; Small compute ($15 more) from about 400 workspaces, Medium ($60 more) from about 1,200. Checked Oct 2026.', url: 'https://supabase.com/pricing' },
      { name: 'Vercel Pro', vendor: 'Vercel', kind: 'fixed', amount: 20, steps: [{ fromCustomers: 0, amount: 0 }, { fromCustomers: 1, amount: 20 }], freeTier: 'Hobby is free for non-commercial use only.', note: '$20 per member per month with $20 of usage credit. One member is enough. Checked Oct 2026.', url: 'https://vercel.com/pricing' },
      { name: 'Stripe Connect (client payments)', vendor: 'Stripe', kind: 'perCustomer', amount: 0, note: 'Connected accounts with full dashboards and direct charges, Stripe handles pricing: the freelancer pays the fees on their own payments, Tally pays no Connect fee and takes no cut [verify].', url: 'https://stripe.com/connect/pricing' },
      { name: 'Exchange rates', vendor: 'Frankfurter (ECB)', kind: 'fixed', amount: 0, freeTier: 'Free, no key, ECB reference rates once per working day.', note: 'One call a day for all workspaces.', url: 'https://frankfurter.dev' },
      { name: 'Accounting sync (later milestone)', vendor: 'Xero', kind: 'fixed', amount: 0, note: 'Not in v1 (CSV exports instead). Xero developer pricing from March 2026: free up to 5 connections, Core A$35 a month (about $23) up to 50, Plus A$245 a month up to 1,000 [verify]. Studio and Agency only when built.', url: 'https://developer.xero.com/pricing' },
      { name: 'Product analytics', vendor: 'PostHog', kind: 'fixed', amount: 0, freeTier: '1 million events and 5,000 replays a month.', note: 'Free tier covers well past 1,000 workspaces at this event volume. Checked Oct 2026.', url: 'https://posthog.com/pricing' },
      { name: 'Domain', vendor: 'Porkbun', kind: 'fixed', amount: 1, note: 'A .app or .com domain is about $12 to $15 a year, shown as $1 a month [verify the price for the name you pick].', url: 'https://porkbun.com' },
    ],
    notes: [
      'Per invoice at the cap: $0.008 email + $0.0065 reply reading + under $0.0005 for the PDF and storage = about $0.015.',
      'Solo at every cap (50 invoices, 10 rewrites) costs 50 x $0.015 + 10 x $0.05 = $1.25, plus about $0.98 in Stripe fees on $19 (2.9% + $0.30 + 0.7% Billing): (19 - 1.25 - 0.98) / 19 = 88% gross margin.',
      'Studio at every cap (250 invoices, 30 rewrites) costs $3.75 + $1.50 = $5.25, plus about $1.70 in Stripe fees on $39: (39 - 5.25 - 1.70) / 39 = 82%.',
      'Agency at every cap (750 invoices, 60 rewrites) costs $11.25 + $3.00 = $14.25, plus about $3.14 in Stripe fees on $79: (79 - 14.25 - 3.14) / 79 = 78%.',
      'At the default 20 invoices a month a workspace costs about $0.30 in variable spend plus $0.15 in rewrites.',
      'A 7 day trial is capped at 10 invoices sent and 3 rewrites, so a trial that never converts costs about $0.30 at most.',
      'Caps are enforced server-side from usage_ledger (invoices sent, replies read, rewrites) and plan_limits (seats, domains, sequences), so no workspace can pass these numbers by calling functions directly.',
      'Fixed costs (Supabase, Vercel, Resend Pro, domain) are about $66 a month from the first customer, about $136 from 9 customers once Resend Scale is needed: covered by 4 Solo customers, then by 8.',
      'Annual plans are priced at 10 months (2 months free). Stripe subscription fees are added by the calculator, not listed here.',
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
