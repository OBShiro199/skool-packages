// Quotient: instant online quotes for tradespeople, turned into booked jobs.
import type { AppDef } from '../types'
import { buildPrd1 } from './quotient/buildPrd1'
import { buildPrd2 } from './quotient/buildPrd2'
import { designPrd } from './quotient/designPrd'
import { landingPrd } from './quotient/landingPrd'
import { sql } from './quotient/sql'
import { edgeFunctions } from './quotient/edgeFunctions'
import { frontendTasks } from './quotient/frontendTasks'
import { backendTasks } from './quotient/backendTasks'
import { securityTasks } from './quotient/securityTasks'
import { outbound, inbound, paid } from './quotient/marketing'
import { launchTasks, repoTree, starterFiles } from './quotient/launch'

export const quotient: AppDef = {
  slug: 'quotient',
  name: 'Quotient',
  tagline: 'Instant quotes that book the job',
  oneLiner: 'Trades businesses build a quote calculator for their website; customers see an instant price range, add photos and book a survey or the job with a deposit, while Quotient follows up by text and email.',
  category: 'productivity',
  art: { motif: 'calendar', tone: 'green' },
  price: { monthly: 39, trialDays: 7 },
  difficulty: 3,
  buildHours: 30,
  apis: [
    {
      name: 'Claude API (Anthropic)',
      job: 'reads customer photos and notes with claude-haiku-5-5 and returns a structured "site visit needed?" flag with reasons; it never sees or sets a price',
      signupUrl: 'https://console.anthropic.com',
      docsUrl: 'https://docs.claude.com/en/api/overview',
      pricing: 'Checked Oct 2026: claude-haiku-5-5 is $0.10 per million input tokens and $0.50 per million output tokens for prompts up to 100K tokens ($0.50 / $2.50 above), cache reads 0.1x input. A 6 photo check at 1280 px (about 9,800 image tokens + 3,000 text in, about 800 out) costs about $0.0017. Prepaid credit; set a monthly spend limit in Settings > Limits.',
      envVars: [
        { name: 'ANTHROPIC_API_KEY', where: 'console.anthropic.com > Settings > API Keys > Create Key (sk-ant-...)', pasteInto: 'Supabase secrets', secret: true },
      ],
    },
    {
      name: 'Twilio (SMS)',
      job: 'sends quote copies, follow-ups and booking reminders from a subaccount per business, using a verified toll-free number (US, Canada) or an alphanumeric sender (UK), with delivery and STOP webhooks',
      signupUrl: 'https://www.twilio.com/try-twilio',
      docsUrl: 'https://www.twilio.com/docs/messaging',
      pricing: 'Checked Oct 2026: US SMS $0.0083 per segment plus carrier fees of about $0.003 [verify], so about $0.0113. Toll-free number about $2.15/month [verify]; toll-free verification has no separate fee [verify] and needs a business registration number on new submissions from Feb 2026 [verify]. UK alphanumeric sender about $0.046 to $0.056 per segment [verify], no number fee, no pre-registration unless protected [verify]. Failed messages $0.001.',
      envVars: [
        { name: 'TWILIO_ACCOUNT_SID', where: 'console.twilio.com > Account Info > Account SID (AC...), the master account', pasteInto: 'Supabase secrets', secret: false },
        { name: 'TWILIO_AUTH_TOKEN', where: 'console.twilio.com > Account Info > Auth Token > Show', pasteInto: 'Supabase secrets', secret: true },
        { name: 'TWILIO_NOTIFICATION_EMAIL', where: 'Your own founder inbox (Twilio sends toll-free verification updates here)', pasteInto: 'Supabase secrets', secret: false },
      ],
    },
    {
      name: 'Stripe Connect',
      job: 'gives each business its own Stripe account (Accounts v2, Standard-style) so customer deposits are direct charges on that account, confirmed by a Connected accounts webhook',
      signupUrl: 'https://dashboard.stripe.com/connect',
      docsUrl: 'https://docs.stripe.com/connect/accounts-v2/connected-account-configuration',
      pricing: 'Checked Oct 2026: with Stripe collecting fees from the connected account (fees_collector stripe) and direct charges, the platform pays no Connect fee; the business pays Stripe\'s normal card fee on each deposit. Quotient sets no application fee. Platform-priced accounts would cost $2 per active account a month plus payout fees [verify].',
      envVars: [
        { name: 'STRIPE_CONNECT_WEBHOOK_SECRET', where: 'Stripe > Developers > Webhooks > Connected accounts destination > Signing secret (whsec_...)', pasteInto: 'Supabase secrets', secret: true },
      ],
    },
  ],
  idealFor: 'People who want a first B2B SaaS sold to a market they can find on Google Maps today: owner-run cleaners, window cleaners, gardeners, painters and removals firms, and the small web agencies that build their websites.',
  whyItSells: 'A cleaner who gets 40 quote requests a month and replies a day late loses jobs to whoever answers first. Quotient answers in seconds, even at 9pm, and books the slot; one extra $300 clean a month pays for the $79 Crew plan almost four times over, while Jobber only adds online booking from about $129 a month [verify].',
  features: [
    'Quote calculator builder: per room, per m2, per hour, fixed prices, extras, minimum charge and postcode zones',
    'One-line embed for Wix, Squarespace, WordPress and Webflow, plus a hosted quote page and QR code',
    'Instant price range for customers, worked out on the server from your published prices',
    'Customer photos checked by Claude to flag jobs that need a site visit, without ever changing the price',
    'Book a survey or the job from your own hours, with an optional deposit paid to your own Stripe',
    'Leads inbox with New, Quoted, Booked, Won and Lost, notes, and text or email from the lead',
    'Automatic follow-ups by SMS and email that stop when the customer books, replies or opts out',
    'Analytics for quote-to-booking rate, average job value and lead sources, plus Agency workspaces for up to 10 businesses',
  ],
  status: 'full',
  costs: {
    usage: { label: 'Instant quotes per business per month', unit: 'quotes', default: 60, min: 10, max: 1000, step: 10 },
    plans: [
      { id: 'solo-monthly', usageCap: 120, name: 'Solo', price: 39, interval: 'month', includes: '1 business, 1 seat, 1 calculator, 1 calendar, 120 instant quotes, 240 SMS credits and 240 AI photo checks a month, deposits, follow-ups, Quotient badge' },
      { id: 'solo-yearly', usageCap: 120, name: 'Solo (yearly)', price: 390, interval: 'year', includes: 'Same as Solo, 2 months free' },
      { id: 'crew-monthly', usageCap: 350, name: 'Crew', price: 79, interval: 'month', includes: '1 business, 3 seats, 5 calculators, 3 calendars, 350 instant quotes, 700 SMS credits and 700 AI photo checks a month, badge optional' },
      { id: 'crew-yearly', usageCap: 350, name: 'Crew (yearly)', price: 790, interval: 'year', includes: 'Same as Crew, 2 months free' },
      { id: 'agency-monthly', usageCap: 1000, name: 'Agency', price: 299, interval: 'month', includes: 'Up to 10 client businesses, 10 seats, 30 calculators, 20 calendars, 1,000 quotes, 2,000 SMS credits and 2,000 AI checks a month pooled, badge optional' },
      { id: 'agency-yearly', usageCap: 1000, name: 'Agency (yearly)', price: 2990, interval: 'year', includes: 'Same as Agency, 2 months free' },
    ],
    lines: [
      { name: 'Texts (quote copy, follow-ups, reminders)', vendor: 'Twilio', kind: 'perUnit', amount: 0.0226, freeTier: 'Trial credit on signup only.', note: 'Every plan includes 2 SMS credits per quote at the cap. 1 credit = 1 US/CA segment at $0.0083 + about $0.003 carrier fee = $0.0113, so $0.0226 per quote. A UK segment costs 5 credits (about $0.056 [verify]), so cost per credit stays about the same. Checked Oct 2026 [verify carrier fees].', url: 'https://www.twilio.com/en-us/sms/pricing/us' },
      { name: 'AI photo check', vendor: 'Anthropic', kind: 'perUnit', amount: 0.004, note: 'Up to 2 checks per quote at the cap (AI check cap = 2 x quotes). Each check: 6 photos at 1280 px is about 9,800 image tokens + 3,000 text tokens in ($0.0013 at $0.10/MTok) and about 800 out ($0.0004 at $0.50/MTok) = $0.0017, rounded up to $0.002. Checked Oct 2026.', url: 'https://www.anthropic.com/pricing' },
      { name: 'Email (quote copy, alerts, follow-ups, bookings)', vendor: 'Resend', kind: 'perUnit', amount: 0.004, freeTier: '3,000 emails a month, 100 a day.', note: 'About 4 emails per quote, modelled at about $0.001 each (Pro is $20 for 50,000, Scale about $90 for 100,000 [verify]). This slightly overstates cost while you are inside the free tier. Checked Oct 2026.', url: 'https://resend.com/pricing' },
      { name: 'Photo storage', vendor: 'Supabase', kind: 'perUnit', amount: 0.0002, note: 'About 1.2 MB of resized photos per quote, kept up to 180 days after the lead closes. Inside Pro\'s 100 GB until several hundred businesses; $0.021 per GB after.', url: 'https://supabase.com/pricing' },
      { name: 'Toll-free number per business', vendor: 'Twilio', kind: 'perCustomer', amount: 2.15, note: 'One verified toll-free number per US or Canadian business (UK alpha senders have no fee). On Agency, up to 10 client numbers ($21.50), which this calculator shows as one: see the Agency margin note. About $2.15/month [verify].', url: 'https://www.twilio.com/en-us/sms/pricing/us' },
      { name: 'Supabase', vendor: 'Supabase', kind: 'fixed', amount: 25, steps: [{ fromCustomers: 0, amount: 0 }, { fromCustomers: 1, amount: 25 }, { fromCustomers: 400, amount: 40 }, { fromCustomers: 1000, amount: 85 }], freeTier: 'Free plan for building (pauses after a week idle). Upgrade before the first paying customer.', note: 'Pro $25/month with $10 compute credit, 8 GB database, 100 GB file storage. Small compute (+$15) from about 400 businesses as the every-minute workers and Realtime grow, Medium (+$60) from about 1,000. Checked Oct 2026 [verify compute prices].', url: 'https://supabase.com/pricing' },
      { name: 'Vercel Pro', vendor: 'Vercel', kind: 'fixed', amount: 20, steps: [{ fromCustomers: 0, amount: 0 }, { fromCustomers: 1, amount: 20 }], freeTier: 'Hobby is free for non-commercial use only.', note: '$20 per member per month with $20 of usage credit. The widget and customer pages are light; one member covers well past 1,000 businesses. Checked Oct 2026.', url: 'https://vercel.com/pricing' },
      { name: 'Stripe Connect (deposits)', vendor: 'Stripe', kind: 'perCustomer', amount: 0, note: 'Direct charges with Stripe collecting fees from the connected account: the business pays the card fee on its own deposits, Quotient pays no Connect fee and takes no cut.', url: 'https://stripe.com/connect/pricing' },
      { name: 'Product analytics', vendor: 'PostHog', kind: 'fixed', amount: 0, freeTier: '1 million events and 5,000 replays a month.', note: 'App and marketing pages only; the widget on customer sites sends nothing to PostHog. Free tier covers well past 1,000 businesses.', url: 'https://posthog.com/pricing' },
      { name: 'Domain', vendor: 'Porkbun', kind: 'fixed', amount: 1, note: 'A .app or .co domain is about $12 to $15 a year, shown as $1 a month [verify]. Cold email lookalike domains are a marketing cost, not counted here.', url: 'https://porkbun.com' },
    ],
    notes: [
      'Cost per quote at the cap: texts $0.0226 + AI checks $0.004 + email $0.004 + storage $0.0002 = $0.0308. At the default 60 quotes that is $1.85 plus the $2.15 number: about $4 a month on a $39 plan.',
      'Solo at the cap (120 quotes): 120 x $0.0308 = $3.70 + number $2.15 = $5.85. Stripe on $39 (2.9% + $0.30 + 0.7%) = $1.70. Gross margin (39 - 5.85 - 1.70) / 39 = 80.6%. Yearly ($32.50 a month, one $14.34 fee a year = $1.20 a month): 78.3%.',
      'Crew at the cap (350 quotes): $10.78 + $2.15 = $12.93. Stripe on $79 = $3.14. Margin 79.7%. Yearly ($65.83 a month, fees $2.40 a month): 76.7%.',
      'Agency at the cap (1,000 pooled quotes, 10 client toll-free numbers): $30.80 + $21.50 = $52.30. Stripe on $299 = $11.06. Margin 78.8%. Yearly ($249.17 a month, fees $9.00 a month): 75.4%. The calculator counts one number per customer, so it shows Agency about $19 a month better than this worst case.',
      'Fixed costs (Supabase, Vercel, domain) are about $46 a month: covered by the first two paying customers, and about $0.46 per customer at 100 customers, which leaves every plan above 75% at its cap.',
      'A 7 day trial is capped at 25 quotes, 30 SMS credits and 50 AI checks: under $1 in usage. The toll-free number is only bought when the owner starts texting setup, and released 30 days after an unpaid trial.',
      'Caps are enforced server-side by meter_usage() (locks the owner row, checks plan_limits(), writes usage_ledger) in qt-public-quote, qt-triage-worker, qt-send-message and every SMS send. At the quote cap the widget still captures the lead without a price, so no customer is lost and no cost is incurred.',
      'Twilio Geo permissions allow only the US, Canada and the UK, so no other destination can be texted. UK texts cost 5 credits per segment, which keeps UK cost per credit in line with US rates.',
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
