// Halo: asks happy customers for Google reviews at the right moment, and catches unhappy ones first.
import type { AppDef } from '../types'
import { buildPrd1 } from './halo/buildPrd1'
import { buildPrd2 } from './halo/buildPrd2'
import { designPrd } from './halo/designPrd'
import { landingPrd } from './halo/landingPrd'
import { sql } from './halo/sql'
import { edgeFunctions } from './halo/edgeFunctions'
import { frontendTasks } from './halo/frontendTasks'
import { backendTasks } from './halo/backendTasks'
import { securityTasks } from './halo/securityTasks'
import { outbound, inbound, paid } from './halo/marketing'
import { launchTasks, repoTree, starterFiles } from './halo/launch'

export const halo: AppDef = {
  slug: 'halo',
  name: 'Halo',
  tagline: 'More Google reviews, fewer surprises',
  oneLiner: 'Texts every customer after their visit with a two-tap way to rate you and post a Google review, alerts you to unhappy customers privately, and drafts replies to new reviews in your voice.',
  category: 'ai-agents',
  art: { motif: 'chat', tone: 'green' },
  price: { monthly: 49, trialDays: 7 },
  difficulty: 3,
  buildHours: 32,
  apis: [
    {
      name: 'Twilio (SMS)',
      job: 'texts each review request from a toll-free number registered in the business\'s own name, one subaccount per business, with delivery and STOP webhooks',
      signupUrl: 'https://www.twilio.com/try-twilio',
      docsUrl: 'https://www.twilio.com/docs/messaging',
      pricing: 'Checked Oct 2026: US SMS $0.0083 per segment plus carrier pass-through fees of about $0.003 per segment [verify], so about $0.0113 a text. Toll-free number about $2.15/month [verify]. Toll-free verification has no fee [verify]; 10DLC would add a $4.50 to $46 brand fee, $15 campaign vetting and $1.50 to $10/month per campaign. Failed messages $0.001 each. Trial credit on signup; upgrade before subaccounts and verification.',
      envVars: [
        { name: 'TWILIO_ACCOUNT_SID', where: 'console.twilio.com > Account Info > Account SID (AC...), the master account', pasteInto: 'Supabase secrets', secret: false },
        { name: 'TWILIO_AUTH_TOKEN', where: 'console.twilio.com > Account Info > Auth Token > Show', pasteInto: 'Supabase secrets', secret: true },
        { name: 'TWILIO_NOTIFICATION_EMAIL', where: 'Your own founder inbox (Twilio sends toll-free verification updates here)', pasteInto: 'Supabase secrets', secret: false },
      ],
    },
    {
      name: 'Google Business Profile APIs',
      job: 'lets an owner connect their profile so Halo reads the review link and new reviews (v4 reviews.list) and posts approved replies (reviews.updateReply)',
      signupUrl: 'https://developers.google.com/my-business/content/prereqs',
      docsUrl: 'https://developers.google.com/my-business/reference/rest/v4/accounts.locations.reviews',
      pricing: 'Free (checked Oct 2026), quota only: 300 queries per minute by default for the v1 APIs [verify for v4 reviews]. Access is not automatic: quota is 0 until Google approves a Basic API Access request from a verified Business Profile active 60+ days with a website [verify]. OAuth scope business.manage may need app verification [verify].',
      envVars: [
        { name: 'GOOGLE_CLIENT_ID', where: 'Google Cloud > Google Auth Platform > Clients > Halo web (also add it to Supabase secrets)', pasteInto: 'Vercel env', secret: false },
        { name: 'GOOGLE_CLIENT_SECRET', where: 'Same client > Client secret, GOCSPX-... (also add it to Supabase secrets)', pasteInto: 'Vercel env', secret: true },
        { name: 'OAUTH_STATE_SECRET', where: 'Make one: run openssl rand -hex 32 (signs the OAuth state)', pasteInto: 'Vercel env', secret: true },
      ],
    },
    {
      name: 'Claude API (Anthropic)',
      job: 'drafts short replies to Google reviews in the owner\'s tone with structured JSON output, flags reviews that need the owner personally, and suggests a tone from past replies, using claude-opus-5-5 at low effort',
      signupUrl: 'https://console.anthropic.com',
      docsUrl: 'https://docs.claude.com/en/api/overview',
      pricing: 'Checked Oct 2026: claude-opus-5-5 is $4 per million input tokens, $20 per million output tokens, $0.20 per million cached input tokens. A reply draft (about 1,800 tokens in, half cached, plus about 400 out including thinking at low effort) costs $0.008 to $0.017. Prepaid credit; set a monthly spend limit in Settings > Limits.',
      envVars: [
        { name: 'ANTHROPIC_API_KEY', where: 'console.anthropic.com > Settings > API Keys > Create Key (sk-ant-...)', pasteInto: 'Supabase secrets', secret: true },
      ],
    },
  ],
  idealFor: 'People who want a first B2B SaaS sold to a market they can phone, walk into or email today: dental and medical practices, salons, trades and home services, and the local marketing agencies that serve them.',
  whyItSells: 'A dental practice with 600 visits a month that asks every patient turns about 5% into Google reviews: 30 new reviews a month instead of 2 or 3. Halo costs $49 and one extra new patient (often worth $500+ a year) pays for it many times over, while Birdeye and Podium start at $299 to $399 a month [verify].',
  features: [
    'Review requests by text and email two hours after each visit, inside your sending hours',
    'Same "Post a review on Google" button for every customer, whatever they rate, so you stay inside Google\'s rules',
    'Private feedback from any customer, with an instant alert for 3 stars or fewer',
    'Visits in by Zapier, webhook, CSV upload or one-tap manual send',
    'Texts from a toll-free number registered in your business name, with STOP handled for you',
    'AI reply drafts for new Google reviews in your tone, approved by you before they post',
    'Dashboard per location: sent, opened, clicked to Google, feedback, new reviews and rating trend',
    'Multi-location and agency workspaces with weekly client reports and no Halo branding',
  ],
  status: 'full',
  costs: {
    usage: { label: 'Review requests sent per business per month', unit: 'requests', default: 150, min: 25, max: 1000, step: 25 },
    plans: [
      { id: 'solo-monthly', usageCap: 200, name: 'Solo', price: 49, interval: 'month', includes: '1 location, 200 review requests and 30 AI reply drafts a month, SMS from your own verified number, email, private feedback alerts, Zapier and webhook intake, CSV import, 2 seats' },
      { id: 'solo-yearly', usageCap: 200, name: 'Solo (yearly)', price: 490, interval: 'year', includes: 'Same as Solo, 2 months free' },
      { id: 'growth-monthly', usageCap: 500, name: 'Growth', price: 99, interval: 'month', includes: 'Up to 3 locations, 500 requests and 120 AI drafts a month, location comparison, daily digest, 5 seats' },
      { id: 'growth-yearly', usageCap: 500, name: 'Growth (yearly)', price: 990, interval: 'year', includes: 'Same as Growth, 2 months free' },
      { id: 'agency-monthly', usageCap: 1000, name: 'Agency', price: 299, interval: 'month', includes: 'Up to 10 client locations, each with its own number, 1,000 requests and 300 AI drafts a month, weekly client reports, no Halo branding, 10 seats' },
      { id: 'agency-yearly', usageCap: 1000, name: 'Agency (yearly)', price: 2990, interval: 'year', includes: 'Same as Agency, 2 months free' },
    ],
    lines: [
      { name: 'Review texts (initial + reminder)', vendor: 'Twilio', kind: 'perUnit', amount: 0.017, freeTier: 'Trial credit on signup only.', note: 'One single-segment text per request at $0.0083 + about $0.003 carrier fee = $0.0113, plus one reminder for the roughly half who never open the link: about 1.5 segments x $0.0113 = $0.017 per request. Worst case at the cap (every request texted and reminded) is $0.0226. US rates, checked Oct 2026 [verify carrier fees on toll-free].', url: 'https://www.twilio.com/en-us/sms/pricing/us' },
      { name: 'AI reply drafts', vendor: 'Anthropic', kind: 'perUnit', amount: 0.0026, note: 'About 0.15 new Google reviews per request sent, each drafted once at up to $0.017 (claude-opus-5-5, $4/$20 per MTok, effort low, cached system prompt) = $0.0026 per request. Checked Oct 2026.', url: 'https://www.anthropic.com/pricing' },
      { name: 'Toll-free number per business', vendor: 'Twilio', kind: 'perCustomer', amount: 2.15, note: 'One verified toll-free number per business (per client business on Agency, up to 10, so up to $21.50 there). About $2.15/month [verify]. Verification itself has no fee [verify].', url: 'https://www.twilio.com/en-us/sms/pricing/us' },
      { name: 'Supabase', vendor: 'Supabase', kind: 'fixed', amount: 25, steps: [{ fromCustomers: 0, amount: 0 }, { fromCustomers: 1, amount: 25 }, { fromCustomers: 400, amount: 40 }, { fromCustomers: 1000, amount: 85 }], freeTier: 'Free plan for building (pauses after a week idle). Upgrade before the first paying customer.', note: 'Pro $25/month with $10 compute credit. Data is small (text rows only): about 5 MB per business a year. Small compute (+$15) from about 400 businesses as the every-minute worker and Realtime grow, Medium (+$60) from about 1,000. Checked Oct 2026.', url: 'https://supabase.com/pricing' },
      { name: 'Vercel Pro', vendor: 'Vercel', kind: 'fixed', amount: 20, steps: [{ fromCustomers: 0, amount: 0 }, { fromCustomers: 1, amount: 20 }], freeTier: 'Hobby is free for non-commercial use only.', note: '$20 per member per month with $20 of usage credit. The rating page is light, so one member covers well past 1,000 businesses. Checked Oct 2026.', url: 'https://vercel.com/pricing' },
      { name: 'Email (requests, alerts, digests)', vendor: 'Resend', kind: 'fixed', amount: 0, steps: [{ fromCustomers: 0, amount: 0 }, { fromCustomers: 20, amount: 20 }, { fromCustomers: 330, amount: 90 }, { fromCustomers: 660, amount: 180 }], freeTier: '3,000 emails a month, 100 a day.', note: 'About 150 emails per business a month (email requests and reminders for customers without text consent, owner alerts, digests). Pro $20 for 50,000 from about 20 businesses; Scale about $90 for 100,000 from about 330 [verify]; then roughly $0.90 per 1,000 extra, shown as $180 from about 660. Worst case at the cap is $0.0009 per email, included in the margin notes. Checked Oct 2026.', url: 'https://resend.com/pricing' },
      { name: 'Google Business Profile APIs', vendor: 'Google', kind: 'fixed', amount: 0, freeTier: 'Free, quota only.', note: 'No per-call charge. Access needs Google\'s approval; hourly polling of 2,000 locations is about 33 calls a minute, far under the 300 QPM default [verify].', url: 'https://developers.google.com/my-business/content/limits' },
      { name: 'Product analytics', vendor: 'PostHog', kind: 'fixed', amount: 0, freeTier: '1 million events and 5,000 replays a month.', note: 'App and marketing pages only (the rating page sends no analytics). Free tier covers well past 1,000 businesses. Checked Oct 2026.', url: 'https://posthog.com/pricing' },
      { name: 'Domain', vendor: 'Porkbun', kind: 'fixed', amount: 1, note: 'A .app domain is about $12 to $15 a year, shown as $1 a month [verify]. Cold email lookalike domains are a marketing cost, not counted here.', url: 'https://porkbun.com' },
    ],
    notes: [
      'Typical business: 150 requests a month x ($0.017 texts + $0.0026 AI) = $2.94, plus the $2.15 number = about $5.10 a month on a $49 plan.',
      'Worst case per request at the cap: text + reminder = 2 segments x $0.0113 = $0.0226, plus one email at $0.0009 = $0.0235. AI drafts at $0.017 each.',
      'Solo at the cap (200 requests, 30 drafts): 200 x $0.0235 = $4.70 + 30 x $0.017 = $0.51 + number $2.15 = $7.36. Stripe on $49 (2.9% + $0.30 + 0.7%) = $2.06. Gross margin (49 - 7.36 - 2.06) / 49 = 81%. Yearly ($40.83 a month, one $17.94 fee a year = $1.50 a month): 78%.',
      'Growth at the cap (500 requests, 120 drafts): $11.75 + $2.04 + $2.15 = $15.94. Stripe on $99 = $3.86. Margin 80%. Yearly ($82.50 a month, fees $3.00 a month): 77%.',
      'Agency at the cap (1,000 requests, 300 drafts, 10 client numbers): $23.50 + $5.10 + $21.50 = $50.10. Stripe on $299 = $11.06. Margin 80%. Yearly ($249.17 a month, fees $9.00 a month): 76%.',
      'A 7 day trial is capped at 50 requests and 10 drafts: about $1.35 in texts and AI, plus a $2.15 number if they start texting setup (released 30 days after an unpaid trial). Most trials send email only while the number is in carrier review.',
      'Caps are enforced server-side from usage_ledger in hl-send-worker and hl-draft-reply, so no business can pass these numbers. Twilio Geo permissions allow only the US, so no international texting cost is possible.',
      'Fixed costs (Supabase, Vercel, domain) are about $46 a month: covered by the first paying customer.',
      'Prices are US rates. UK and EU SMS cost several times more: set a higher price or a lower text cap before selling texting there (v1 sends email outside the US).',
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
