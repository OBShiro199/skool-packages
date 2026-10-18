// Rota: staff rotas built in minutes, with shift swaps and reminders by text.
import type { AppDef } from '../types'
import { buildPrd1 } from './rota/buildPrd1'
import { buildPrd2 } from './rota/buildPrd2'
import { designPrd } from './rota/designPrd'
import { landingPrd } from './rota/landingPrd'
import { sql } from './rota/sql'
import { edgeFunctions } from './rota/edgeFunctions'
import { frontendTasks } from './rota/frontendTasks'
import { backendTasks } from './rota/backendTasks'
import { securityTasks } from './rota/securityTasks'
import { outbound, inbound, paid } from './rota/marketing'
import { launchTasks, repoTree, starterFiles } from './rota/launch'

export const rota: AppDef = {
  slug: 'rota',
  name: 'Rota',
  tagline: 'Staff rotas built in minutes',
  oneLiner: 'Drag-and-drop weekly rotas with clash and overtime warnings, a Claude-drafted week, shift texts and reminders, swaps on staff phones, geofenced clock-in and a payroll CSV.',
  category: 'productivity',
  art: { motif: 'calendar', tone: 'amber' },
  price: { monthly: 39, trialDays: 7 },
  difficulty: 3,
  buildHours: 38,
  apis: [
    {
      name: 'Twilio Programmable Messaging',
      job: 'sends shift texts (publish, changes, swaps, 2 hour reminders) from a "Rota" sender name in the UK and a verified toll-free number in the US and Canada, and calls back with delivery status and STOP replies',
      signupUrl: 'https://www.twilio.com/try-twilio',
      docsUrl: 'https://www.twilio.com/docs/messaging/api/message-resource',
      pricing: 'Checked Oct 2026: UK outbound with an alphanumeric sender is listed at $0.0463 to $0.056 per segment depending on the Twilio page [verify], budgeted at $0.06 to cover carrier fees. US outbound $0.0083 per segment plus about $0.003 carrier fee; toll-free number about $2.15 a month [verify]; failed messages $0.001 each. Toll-free verification has no brand or campaign fee (10DLC would cost $4.50 to $46 per brand plus $15 vetting and $1.50 to $10 a month [verify]). Pay as you go after upgrading the trial.',
      envVars: [
        { name: 'TWILIO_ACCOUNT_SID', where: 'Twilio Console home > Account Info > Account SID (AC...)', pasteInto: 'Supabase secrets', secret: false },
        { name: 'TWILIO_AUTH_TOKEN', where: 'Twilio Console home > Account Info > Auth Token > Show (used to check X-Twilio-Signature)', pasteInto: 'Supabase secrets', secret: true },
        { name: 'TWILIO_API_KEY_SID', where: 'Account menu > API keys & tokens > Create API key > Standard (SK...)', pasteInto: 'Supabase secrets', secret: false },
        { name: 'TWILIO_API_KEY_SECRET', where: 'Shown once when you create the API key', pasteInto: 'Supabase secrets', secret: true },
        { name: 'TWILIO_MESSAGING_SERVICE_SID', where: 'Messaging > Services > Rota notifications (MG...)', pasteInto: 'Supabase secrets', secret: false },
      ],
    },
    {
      name: 'Claude API (Anthropic)',
      job: 'drafts a full rota week from availability, roles, time off, the default template and the last four weeks, using claude-opus-5-5 with structured JSON output that the server re-checks shift by shift',
      signupUrl: 'https://console.anthropic.com',
      docsUrl: 'https://docs.claude.com/en/api/overview',
      pricing: 'Checked Oct 2026: claude-opus-5-5 is $4 per million input tokens, $20 per million output tokens, $0.20 per million cached input tokens. A draft costs about $0.12 for a 15 person week, $0.22 for 40 people, $0.46 for 100. Prepaid credit; set a monthly spend limit in Settings > Limits.',
      envVars: [
        { name: 'ANTHROPIC_API_KEY', where: 'console.anthropic.com > Settings > API Keys > Create Key (sk-ant-...)', pasteInto: 'Supabase secrets', secret: true },
      ],
    },
  ],
  idealFor: 'People who want a first B2B SaaS in a local market they can walk into: managers and owners of cafes, restaurants, gyms, studios, salons and small clinics with 5 to 50 hourly staff who still build the rota in a spreadsheet and sort swaps in WhatsApp.',
  whyItSells: 'A manager of a 20 person cafe spends about 3 hours a week building the rota and chasing swaps, roughly $230 of their time a month at $18 an hour. Rota cuts that to about 30 minutes a week for $69 a site, so it pays for itself nearly 3 times over before counting a single covered no-show.',
  features: [
    'Locations, job roles with colours, staff with availability, contract hours, pay rates and time off',
    'Drag-and-drop weekly rota builder with templates and copy last week',
    'Live warnings for double booking, holidays, availability, 11 hour rest, overtime and untrained roles',
    'Wage cost per day and per week against a labour budget',
    'Draft with Claude: a full week from availability and the last four weeks, reviewed before anything is saved',
    'Publish texts and emails each person only their own shifts, plus reminders 2 hours before',
    'Staff phone app for swaps, cover, open shifts, availability and time off, with manager approval',
    'Clock-in from the phone with an optional geofence, timesheet approval and a payroll CSV',
  ],
  status: 'full',
  costs: {
    usage: { label: 'Texts (SMS segments) sent per business per month, at the UK rate', unit: 'texts', default: 120, min: 0, max: 800, step: 20 },
    plans: [
      { id: 'starter-monthly', usageCap: 100, name: 'Starter', price: 39, interval: 'month', includes: 'Per location: up to 15 staff, 100 texts (400 in the US and Canada), 6 Claude drafts a month, rota builder, swaps, open shifts, time off, clock-in, CSV export' },
      { id: 'starter-yearly', usageCap: 100, name: 'Starter (yearly)', price: 390, interval: 'year', includes: 'Same as Starter, 2 months free' },
      { id: 'team-monthly', usageCap: 180, name: 'Team', price: 69, interval: 'month', includes: 'Per location: up to 40 staff, 180 texts (720 in the US and Canada), 10 Claude drafts a month, geofenced clock-in, everything in Starter' },
      { id: 'team-yearly', usageCap: 180, name: 'Team (yearly)', price: 690, interval: 'year', includes: 'Same as Team, 2 months free' },
      { id: 'pro-monthly', usageCap: 400, name: 'Pro', price: 149, interval: 'month', includes: 'Per location: up to 100 staff, 400 texts (1,600 in the US and Canada), 12 Claude drafts a month, texts from your business name, everything in Team' },
      { id: 'pro-yearly', usageCap: 400, name: 'Pro (yearly)', price: 1490, interval: 'year', includes: 'Same as Pro, 2 months free' },
    ],
    lines: [
      { name: 'Shift texts (UK alphanumeric sender)', vendor: 'Twilio', kind: 'perUnit', amount: 0.06, freeTier: 'Trial credit only, and trial texts go to verified numbers with a prefix [verify].', note: 'UK outbound listed at $0.0463 to $0.056 per segment on Twilio pages checked Oct 2026 [verify], rounded up to $0.06 to cover carrier fees. Every template fits one segment. US/Canada texts are about $0.0113 ($0.0083 + about $0.003 carrier fee), so US plans get 4 times the allowance for less money.', url: 'https://www.twilio.com/en-us/sms/pricing/gb' },
      { name: 'Claude rota drafts', vendor: 'Anthropic', kind: 'perCustomer', amount: 1.0, note: 'claude-opus-5-5 at $4/$20 per MTok. A 15 person week is about 8k input + 4.5k output (with thinking) = $0.12; 25 people about $0.17. A typical business runs about 6 drafts a month: about $1.00. Checked Oct 2026.', url: 'https://www.anthropic.com/pricing' },
      { name: 'Supabase', vendor: 'Supabase', kind: 'fixed', amount: 25, steps: [{ fromCustomers: 0, amount: 0 }, { fromCustomers: 1, amount: 25 }, { fromCustomers: 300, amount: 40 }, { fromCustomers: 1000, amount: 85 }], freeTier: 'Free plan for building (pauses after a week idle). Upgrade before the first paying customer.', note: 'Pro $25/month with $10 compute credit. Shifts, notifications and time entries are small rows (a 20 person site writes about 2,000 rows a month). Small compute (+$15) from about 300 businesses as the minute workers and Realtime grow, Medium (+$60) from about 1,000. Checked Oct 2026.', url: 'https://supabase.com/pricing' },
      { name: 'Vercel Pro', vendor: 'Vercel', kind: 'fixed', amount: 20, steps: [{ fromCustomers: 0, amount: 0 }, { fromCustomers: 1, amount: 20 }], freeTier: 'Hobby is free for non-commercial use only.', note: '$20 per member per month with $20 of usage credit. One member is enough. Checked Oct 2026.', url: 'https://vercel.com/pricing' },
      { name: 'Transactional email', vendor: 'Resend', kind: 'fixed', amount: 0, steps: [{ fromCustomers: 0, amount: 0 }, { fromCustomers: 8, amount: 20 }, { fromCustomers: 120, amount: 35 }, { fromCustomers: 240, amount: 90 }, { fromCustomers: 600, amount: 250 }], freeTier: '3,000 emails a month, 100 a day.', note: 'About 400 emails per location a month (publish, changes, reminders, swaps for 20 staff). Pro $20 for 50,000 from about 8 businesses, the $35 tier for 100,000 from about 120 [verify], Scale from $90 at about 240 and roughly $250 for 500,000+ from about 600 [verify the Scale tiers on resend.com/pricing]. Checked Oct 2026.', url: 'https://resend.com/pricing' },
      { name: 'US toll-free number', vendor: 'Twilio', kind: 'fixed', amount: 0, steps: [{ fromCustomers: 0, amount: 0 }, { fromCustomers: 1, amount: 2.15 }], note: 'Only if you sell in the US or Canada: one verified toll-free number in the Messaging Service, about $2.15 a month [verify]. UK alphanumeric sending needs no number.', url: 'https://www.twilio.com/en-us/sms/pricing/us' },
      { name: 'Product analytics', vendor: 'PostHog', kind: 'fixed', amount: 0, freeTier: '1 million events and 5,000 replays a month.', note: 'Free tier covers well past 1,000 businesses at this event volume. Checked Oct 2026.', url: 'https://posthog.com/pricing' },
      { name: 'Domain', vendor: 'Porkbun', kind: 'fixed', amount: 1, note: 'A short .app or .co domain is about $12 to $15 a year, shown as $1 a month [verify]. Keep it short: it appears in every text.', url: 'https://porkbun.com' },
    ],
    notes: [
      'Plans are priced per location; the Stripe subscription quantity is the number of locations, and limits pool across them.',
      'Starter at every cap (100 UK texts x $0.06 = $6.00, 6 drafts x $0.12 = $0.72, 300 emails = $0.12) costs $6.84 plus $1.70 Stripe fees on $39: $8.54, about 78% gross margin.',
      'Team at every cap (180 texts = $10.80, 10 drafts x $0.22 = $2.20, 800 emails = $0.32) costs $13.32 plus $2.78 Stripe fees on $69: $16.10, about 77% margin.',
      'Pro at every cap (400 texts = $24.00, 12 drafts x $0.46 = $5.52, 2,000 emails = $0.80) costs $30.32 plus $5.66 Stripe fees on $149: $35.98, about 76% margin.',
      'US and Canada caps are 4 times larger because texts cost about $0.0113: Starter 400 US texts = $4.52, less than the UK allowance.',
      'Multi-location businesses pay one Stripe fixed fee per invoice, so margins rise with each extra location.',
      'A 7 day trial is capped at 30 texts (120 US) and 2 drafts, so a trial that never converts costs about $2 at most.',
      'Caps are enforced server-side from usage_ledger in rt-draft and rt-notify; at the cap texts are skipped and email carries on.',
      'Fixed costs (Supabase, Vercel, domain, a US number) are about $48 a month: covered by the first two paying locations.',
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
