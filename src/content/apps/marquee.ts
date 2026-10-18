// Marquee: YouTube thumbnails generated from your face and title, then A/B tested on real views.
import type { AppDef } from '../types'
import { buildPrd1 } from './marquee/buildPrd1'
import { buildPrd2 } from './marquee/buildPrd2'
import { designPrd } from './marquee/designPrd'
import { landingPrd } from './marquee/landingPrd'
import { sql } from './marquee/sql'
import { edgeFunctions } from './marquee/edgeFunctions'
import { frontendTasks } from './marquee/frontendTasks'
import { backendTasks } from './marquee/backendTasks'
import { securityTasks } from './marquee/securityTasks'
import { outbound, inbound, paid } from './marquee/marketing'
import { launchTasks, repoTree, starterFiles } from './marquee/launch'

export const marquee: AppDef = {
  slug: 'marquee',
  name: 'Marquee',
  tagline: 'Thumbnails that prove themselves',
  oneLiner: 'Type a video title and get six YouTube thumbnail concepts with your real face cut out, polish one in a canvas editor, then A/B test them on your live video until a winner is proven.',
  category: 'content',
  art: { motif: 'chart', tone: 'amber' },
  price: { monthly: 29, trialDays: 7 },
  difficulty: 3,
  buildHours: 33,
  apis: [
    {
      name: 'fal.ai',
      job: 'paints concept backgrounds with FLUX.2 [pro], draws title-art concepts with Ideogram V3, and cuts faces out of photos with BiRefNet, through one queue API with signed webhooks',
      signupUrl: 'https://fal.ai',
      docsUrl: 'https://fal.ai/docs',
      pricing: 'Checked Oct 2026 from fal model pages and third-party trackers [verify on each model page]: FLUX.2 [pro] about $0.03 for the first megapixel (a 1280x720 image), Ideogram V3 $0.03 to $0.09 per image by speed ($0.06 balanced), BiRefNet billed by compute (budget $0.02 a photo). Prepaid credit, you pay only for successful outputs. Picked over Google Gemini 3.1 Flash Image (about $0.067 per 1K image [verify]) and Recraft V3/V4 ($0.035 to $0.04 raster) on price, and because Ideogram has the best stylised lettering for the two title-art concepts.',
      envVars: [
        { name: 'FAL_KEY', where: 'fal.ai dashboard > API Keys > Add key (shown once)', pasteInto: 'Supabase secrets', secret: true },
      ],
    },
    {
      name: 'Claude API (Anthropic)',
      job: 'writes six different concept briefs (angle, headline, layout, expression, background prompt) from a title and topic, and tags the expression on each face photo, using claude-opus-5-5 with structured JSON output',
      signupUrl: 'https://console.anthropic.com',
      docsUrl: 'https://docs.claude.com/en/api/overview',
      pricing: 'Checked Oct 2026: claude-opus-5-5 is $4 per million input tokens, $20 per million output tokens, $0.20 per million cached input tokens. A 6-concept brief (about 4k in, 2.5k out with thinking) costs about $0.07; an expression tag on a 768px photo about $0.01. Pay as you go with prepaid credit; set a monthly spend limit in Settings > Limits.',
      envVars: [
        { name: 'ANTHROPIC_API_KEY', where: 'console.anthropic.com > Settings > API Keys > Create Key (sk-ant-...)', pasteInto: 'Supabase secrets', secret: true },
      ],
    },
    {
      name: 'YouTube Data, Analytics and Reporting APIs (Google Cloud)',
      job: 'connects a creator\'s channel with Google OAuth, lists their videos, swaps the thumbnail once a day with thumbnails.set, and reads thumbnail impressions and CTR (Reporting API reach report) plus views and watch time (Analytics API)',
      signupUrl: 'https://console.cloud.google.com',
      docsUrl: 'https://developers.google.com/youtube/v3/docs/thumbnails/set',
      pricing: 'Free (checked Oct 2026). Data API default quota is 10,000 units a day per project; thumbnails.set costs about 50 units [verify], list calls 1 unit. More quota needs the free quota extension form and a compliance audit. The reach report (channel_reach_basic_a1 with video_thumbnail_impressions and video_thumbnail_impressions_ctr) was added to the Reporting API in Jan 2026 [verify availability per channel]. YouTube scopes are sensitive, so the app needs Google verification before more than 100 test users can connect.',
      envVars: [
        { name: 'GOOGLE_CLIENT_ID', where: 'Google Cloud > Google Auth Platform > Clients > Marquee web > Client ID', pasteInto: 'Supabase secrets', secret: false },
        { name: 'GOOGLE_CLIENT_SECRET', where: 'Same client > Client secret (GOCSPX-...)', pasteInto: 'Supabase secrets', secret: true },
        { name: 'OAUTH_STATE_SECRET', where: 'Make one: run openssl rand -hex 32 (signs the OAuth state)', pasteInto: 'Supabase secrets', secret: true },
        { name: 'TOKEN_ENC_KEY', where: 'Make one: run openssl rand -base64 32 (encrypts Google tokens; keep a copy in your password manager)', pasteInto: 'Supabase secrets', secret: true },
      ],
    },
  ],
  idealFor: 'People who want a first SaaS sold to a market they already watch every day: YouTubers with 10k to 500k subscribers who appear on camera, and small agencies or editors who run several channels.',
  whyItSells: 'A creator posting 8 videos a month spends 6 to 10 hours a week on thumbnails or $400+ a month on a designer, and still guesses. Moving one video from 4% to 6% CTR is 50% more views from the same impressions, and Marquee costs $29 a month and proves which thumbnail does it.',
  features: [
    'Face library: upload 5 to 10 photos once, each cut out cleanly and tagged by expression',
    'Six concepts per title, each a different angle, composed with your real face and a bold headline',
    'Canvas editor: move and scale layers, swap expressions, text presets, brand colours and fonts, phone preview',
    'Export at 1280x720 that is always under 2 MB, or push it straight into a test',
    'A/B tests on your live video: one thumbnail per day in a balanced order, via the YouTube API',
    'Impressions and CTR from YouTube\'s own reports, with a plain-English "how sure" and a watch-time guardrail',
    'Winner applied automatically, original always backed up and restored if you stop',
    'Agency plan: 10 channels, 5 seats, a face library per presenter',
  ],
  status: 'full',
  costs: {
    usage: { label: 'Thumbnail concepts generated per workspace per month (6 per video)', unit: 'concepts', default: 48, min: 6, max: 420, step: 6 },
    plans: [
      { id: 'creator-monthly', usageCap: 84, name: 'Creator', price: 29, interval: 'month', includes: '1 seat, 1 channel, 84 concepts (14 videos), 3 live tests, 10 face cut-outs a month, 4 brand fonts' },
      { id: 'creator-yearly', usageCap: 84, name: 'Creator (yearly)', price: 290, interval: 'year', includes: 'Same as Creator, 2 months free' },
      { id: 'pro-monthly', usageCap: 168, name: 'Pro', price: 59, interval: 'month', includes: '2 seats, 3 channels, 168 concepts (28 videos), 10 live tests, 20 face cut-outs, 3 people in the face library, 10 fonts' },
      { id: 'pro-yearly', usageCap: 168, name: 'Pro (yearly)', price: 590, interval: 'year', includes: 'Same as Pro, 2 months free' },
      { id: 'agency-monthly', usageCap: 420, name: 'Agency', price: 149, interval: 'month', includes: '5 seats, 10 channels, 420 concepts (70 videos), 40 live tests, 40 face cut-outs, 15 people, 30 fonts, roles' },
      { id: 'agency-yearly', usageCap: 420, name: 'Agency (yearly)', price: 1490, interval: 'year', includes: 'Same as Agency, 2 months free' },
    ],
    lines: [
      { name: 'Concept images', vendor: 'fal.ai', kind: 'perUnit', amount: 0.043, freeTier: 'None confirmed; prepaid credit [verify sign-up credit].', note: 'Each generation is 4 FLUX.2 [pro] images at about $0.03 (1280x720 is under 1 megapixel) and 2 Ideogram V3 balanced at about $0.06 = $0.24 for 6, or $0.04 per concept, plus about $0.003 for storage and signed-URL egress. Failed images are refunded to the user and fal does not bill failed outputs. Checked Oct 2026 [verify on fal model pages].', url: 'https://fal.ai/pricing' },
      { name: 'Concept briefs', vendor: 'Anthropic', kind: 'perUnit', amount: 0.012, note: 'One claude-opus-5-5 brief per 6 concepts: about 4k input (system prompt cached at $0.20/MTok after the first call) + 2.5k output with thinking at $20/MTok = about $0.07, so $0.012 per concept. Checked Oct 2026.', url: 'https://www.anthropic.com/pricing' },
      { name: 'Face cut-outs and tags', vendor: 'fal.ai + Anthropic', kind: 'perCustomer', amount: 0.3, note: 'BiRefNet cut-out budgeted at $0.02 a photo plus a Claude expression tag at about $0.01 = $0.03. At the Creator cap of 10 photos a month that is $0.30; most creators upload once and then rarely. [verify the BiRefNet compute price on fal]', url: 'https://fal.ai/models/fal-ai/birefnet' },
      { name: 'YouTube APIs', vendor: 'Google', kind: 'fixed', amount: 0, freeTier: '10,000 Data API units a day per project; Analytics and Reporting have their own quotas.', note: 'No per-call charge. A running test uses about 50 units a day, so the default quota carries about 180 running tests. Apply for the free quota extension at about 100 running tests (roughly 40 to 60 customers). [verify thumbnails.set unit cost]', url: 'https://developers.google.com/youtube/v3/guides/quota_and_compliance_audits' },
      { name: 'Supabase', vendor: 'Supabase', kind: 'fixed', amount: 25, steps: [{ fromCustomers: 0, amount: 0 }, { fromCustomers: 1, amount: 25 }, { fromCustomers: 250, amount: 45 }, { fromCustomers: 1000, amount: 110 }], freeTier: 'Free plan for building (pauses after a week idle, 2 projects).', note: 'Pro $25/month with 100 GB storage and $10 compute credit. Each workspace stores about 0.4 GB (faces, concepts at about 1.5 MB each, exports, test copies), so 250 workspaces pass 100 GB: about $0.021 per extra GB plus Small compute ($15) for the workers = about $45. At 1,000 workspaces: about 300 GB extra ($6), Medium compute ($60 more) and egress for signed image URLs = about $110. Checked Oct 2026 [verify storage and egress rates].', url: 'https://supabase.com/pricing' },
      { name: 'Vercel Pro', vendor: 'Vercel', kind: 'fixed', amount: 20, steps: [{ fromCustomers: 0, amount: 0 }, { fromCustomers: 1, amount: 20 }], freeTier: 'Hobby is free for non-commercial use only.', note: '$20 per member per month with $20 of usage credit. The editor renders in the browser, so Vercel only serves pages. Checked Oct 2026.', url: 'https://vercel.com/pricing' },
      { name: 'Transactional email', vendor: 'Resend', kind: 'fixed', amount: 0, steps: [{ fromCustomers: 0, amount: 0 }, { fromCustomers: 150, amount: 20 }, { fromCustomers: 2500, amount: 90 }], freeTier: '3,000 emails a month, 100 a day.', note: 'About 20 emails per workspace a month (concepts ready, test started, test decided, usage, invites). Free covers about 150 workspaces; Pro $20 for 50,000 covers about 2,500; the 100,000 tier is about $90 [verify]. Checked Oct 2026.', url: 'https://resend.com/pricing' },
      { name: 'Product analytics', vendor: 'PostHog', kind: 'fixed', amount: 0, freeTier: '1 million events and 5,000 replays a month.', note: 'About 300 events per workspace a month: free tier covers past 3,000 workspaces. Checked Oct 2026.', url: 'https://posthog.com/pricing' },
      { name: 'Domain', vendor: 'Porkbun', kind: 'fixed', amount: 1, note: 'A .com or .app domain is about $11 to $15 a year, shown as $1 a month [verify on porkbun.com].', url: 'https://porkbun.com' },
    ],
    notes: [
      'Cost per concept: $0.043 images + $0.012 brief = $0.055. One video (6 concepts) costs about $0.33. Face photos cost $0.03 each.',
      'Creator ($29) at every cap: 84 concepts x $0.055 = $4.62 + 10 photos x $0.03 = $0.30, so $4.92, plus $1.34 Stripe fees (2.9% + $0.30 + 0.7% Billing): 78.4% gross margin. Yearly ($290) at 12 months of caps: $59.04 + $10.74 Stripe = 75.9%.',
      'Pro ($59) at every cap: 168 x $0.055 = $9.24 + 20 photos = $0.60, so $9.84, plus $2.42 Stripe: 79.2%. Yearly ($590): $118.08 + $21.54 = 76.3%.',
      'Agency ($149) at every cap: 420 x $0.055 = $23.10 + 40 photos = $1.20, so $24.30, plus $5.66 Stripe: 79.9%. Yearly ($1,490): $291.60 + $53.94 = 76.8%.',
      'Yearly plans are 10 times the monthly price (2 months free) with the same monthly caps, which is why their margin is lower; every plan stays above 75% at its cap.',
      'The 7 day trial is capped at 12 concepts, 10 face photos and 1 live test, so a trial that never converts costs about $0.96 at most.',
      'YouTube API calls are free; the limit is quota, not money. Tests are capped per plan (3, 10, 40 live) so one Agency cannot use the whole daily quota.',
      'Caps are enforced server-side from usage_ledger in every edge function that spends money; failed images write refund rows so users only pay for what they get.',
      'Fixed costs (Supabase, Vercel, domain) are about $46 a month: covered by the second paying customer. Stripe subscription fees are added by the calculator, not listed as a line.',
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
