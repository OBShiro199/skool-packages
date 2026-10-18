// Folio: LinkedIn and Instagram carousel generator for founders, coaches and agencies.
import type { AppDef } from '../types'
import { backendTasks } from './folio/backendTasks'
import { buildPrd1 } from './folio/buildPrd1'
import { buildPrd2 } from './folio/buildPrd2'
import { buildPrd3 } from './folio/buildPrd3'
import { designPrd } from './folio/designPrd'
import { edgeFunctions } from './folio/edgeFunctions'
import { frontendTasks } from './folio/frontendTasks'
import { landingPrd } from './folio/landingPrd'
import { inbound, launchTasks, outbound, paid } from './folio/marketing'
import { repoTree, starterFiles } from './folio/repo'
import { securityTasks } from './folio/securityTasks'
import { sql } from './folio/sql'

export const folio: AppDef = {
  slug: 'folio',
  name: 'Folio',
  tagline: 'On-brand carousels in minutes',
  oneLiner: 'Turns blog posts, YouTube videos, ideas and voice notes into on-brand LinkedIn and Instagram carousels, then schedules them.',
  category: 'content',
  art: { motif: 'kanban', tone: 'violet' },
  price: { monthly: 39, trialDays: 7 },
  difficulty: 2,
  buildHours: 22,
  apis: [
    {
      name: 'Claude API (Anthropic)',
      job: 'writes the hook, 6 to 9 body slides, the CTA and the LinkedIn caption as structured JSON with claude-sonnet-5-5, condenses long transcripts with claude-haiku-5-5, and rewrites single slides',
      signupUrl: 'https://console.anthropic.com',
      docsUrl: 'https://docs.claude.com/en/api/messages',
      pricing: 'Checked Oct 2026: claude-sonnet-5-5 $2 per million input tokens and $10 per million output tokens (cache reads $0.20), claude-haiku-5-5 $0.10 in and $0.50 out. A carousel costs about $0.06 and a slide rewrite about $0.008. Prepaid credits, set a monthly spend limit in Settings > Limits.',
      envVars: [
        { name: 'ANTHROPIC_API_KEY', where: 'console.anthropic.com → Settings → API keys → Create key (sk-ant-api03-...)', pasteInto: 'Supabase secrets', secret: true },
      ],
    },
    {
      name: 'Firecrawl',
      job: 'reads the main text of a blog post or article URL as clean markdown',
      signupUrl: 'https://www.firecrawl.dev/signin',
      docsUrl: 'https://docs.firecrawl.dev/features/scrape',
      pricing: 'Checked Oct 2026 [verify on firecrawl.dev/pricing]: free credits to build, Hobby about $19/month for 5,000 pages, Standard about $99/month ($83 yearly) for 100,000. One scrape = 1 credit.',
      envVars: [
        { name: 'FIRECRAWL_API_KEY', where: 'firecrawl.dev → Dashboard → API Keys (fc-...)', pasteInto: 'Supabase secrets', secret: true },
      ],
    },
    {
      name: 'Supadata',
      job: 'fetches YouTube video transcripts for any public video',
      signupUrl: 'https://supadata.ai',
      docsUrl: 'https://docs.supadata.ai',
      pricing: 'Checked Oct 2026 [verify on supadata.ai/pricing]: free 100 credits/month, Basic $5 for 300, Pro $17 for 3,000, Mega $47 for 30,000. 1 credit per video with captions, 2 credits per minute when it must generate a transcript.',
      envVars: [
        { name: 'SUPADATA_API_KEY', where: 'supadata.ai → Dashboard → API key', pasteInto: 'Supabase secrets', secret: true },
      ],
    },
    {
      name: 'Deepgram',
      job: 'transcribes voice notes recorded in the browser with Nova-3',
      signupUrl: 'https://console.deepgram.com/signup',
      docsUrl: 'https://developers.deepgram.com/docs/pre-recorded-audio',
      pricing: 'Checked Oct 2026 [verify on deepgram.com/pricing]: $200 free credit at signup, then about $0.0043 per minute for Nova-3 pre-recorded audio, pay as you go.',
      envVars: [
        { name: 'DEEPGRAM_API_KEY', where: 'console.deepgram.com → API Keys → Create a New API Key', pasteInto: 'Supabase secrets', secret: true },
      ],
    },
    {
      name: 'Zernio',
      job: 'connects customers\' LinkedIn profiles, LinkedIn pages and Instagram accounts, publishes PDF document posts and image carousels on schedule, and returns post analytics',
      signupUrl: 'https://zernio.com',
      docsUrl: 'https://docs.zernio.com',
      pricing: 'Checked Oct 2026 [verify on zernio.com/pricing]: billed per connected social account per month. First 2 accounts free, then about $6 each for accounts up to 10, $3 for 11 to 100, $1 for 101 to 2,000. Analytics is an add-on [verify price].',
      envVars: [
        { name: 'ZERNIO_API_KEY', where: 'zernio.com → Settings → API Keys → Create API key (sk_...)', pasteInto: 'Supabase secrets', secret: true },
        { name: 'ZERNIO_WEBHOOK_SECRET', where: 'zernio.com → Settings → Webhooks → your webhook → Secret', pasteInto: 'Supabase secrets', secret: true },
      ],
    },
  ],
  idealFor: 'Founders, coaches and LinkedIn agencies who already post every week and want each blog post, video or voice note to become a carousel in their own brand.',
  whyItSells: 'Three carousels a week at 90 minutes each in Canva is about 19 hours a month. Folio makes one in about 3 minutes for $39 a month, less than an hour of a designer\'s time, and agencies pay $249 to run 10 client brands.',
  features: [
    'Brand kit set once: logo, colours, fonts, headshot and handle on every slide',
    'Four sources: blog URL, YouTube video, a typed idea or a voice note',
    'Claude writes a hook, 6 to 9 body slides and a CTA, with a layout chosen per slide',
    '8 slide layouts: hook, statement, list, step, quote, stat, compare, CTA',
    'Per-slide editing with AI rewrite, undo and drag to reorder',
    'Export PNG slides and a LinkedIn PDF document in one click',
    'Content calendar that schedules to LinkedIn profiles, pages and Instagram',
    'Library of every carousel with impressions, reactions and clicks',
  ],
  status: 'full',
  costs: {
    usage: { label: 'Carousels per customer per month', unit: 'carousels', default: 12, min: 2, max: 150, step: 2 },
    plans: [
      { id: 'creator-monthly', name: 'Creator', price: 39, interval: 'month', includes: '15 carousels, 100 AI rewrites, 60 exports, 30 voice minutes, 1 brand kit, 1 connected account' },
      { id: 'creator-yearly', name: 'Creator (yearly)', price: 390, interval: 'year', includes: 'Same as Creator, 2 months free' },
      { id: 'pro-monthly', name: 'Pro', price: 79, interval: 'month', includes: '50 carousels, 400 rewrites, 200 exports, 120 voice minutes, 3 brand kits, 3 accounts, 2 seats, analytics, custom fonts' },
      { id: 'pro-yearly', name: 'Pro (yearly)', price: 790, interval: 'year', includes: 'Same as Pro, 2 months free' },
      { id: 'agency-monthly', name: 'Agency', price: 249, interval: 'month', includes: '150 carousels, 1,000 rewrites, 1,000 exports, 400 voice minutes, 10 brand kits, 10 accounts, 5 seats, analytics' },
      { id: 'agency-yearly', name: 'Agency (yearly)', price: 2490, interval: 'year', includes: 'Same as Agency, 2 months free' },
    ],
    lines: [
      { name: 'Carousel writing (claude-sonnet-5-5, plus claude-haiku-5-5 for long sources)', vendor: 'Anthropic', kind: 'perUnit', amount: 0.06, note: 'About 9,000 input tokens ($0.018, system prompt cached) and 3,800 output tokens including thinking ($0.038) per carousel, plus under $0.002 of Haiku when a transcript needs condensing. Checked Oct 2026: Sonnet 5.5 $2/$10 per million tokens.', url: 'https://www.anthropic.com/pricing' },
      { name: 'Slide rewrites (about 7 per carousel)', vendor: 'Anthropic', kind: 'perUnit', amount: 0.055, note: 'Each rewrite is about 2,000 input and 400 output tokens on Sonnet 5.5 = $0.008. Creator allows 100 rewrites for 15 carousels, so about 7 per carousel at most.', url: 'https://www.anthropic.com/pricing' },
      { name: 'Voice note transcription', vendor: 'Deepgram', kind: 'perUnit', amount: 0.003, freeTier: '$200 credit at signup', note: 'Assumes 1 in 4 carousels starts from a 3 minute voice note at $0.0043 per minute (Nova-3 pre-recorded, checked Oct 2026 [verify]).', url: 'https://deepgram.com/pricing' },
      { name: 'Rendering PNG + PDF', vendor: 'Vercel', kind: 'perUnit', amount: 0.001, note: 'About 5 s of active CPU per export at $0.128 per CPU-hour = $0.0002, times about 4 exports per carousel, plus memory. Identical re-exports are free (content hash).', url: 'https://vercel.com/docs/fluid-compute/pricing' },
      { name: 'Storage and downloads', vendor: 'Supabase', kind: 'perUnit', amount: 0.002, note: 'About 7 MB per export (PNGs + PDF), the newest 3 kept per carousel. Storage about $0.021 per GB-month and egress past the Pro quota about $0.09 per GB [verify].', url: 'https://supabase.com/pricing' },
      { name: 'Posting and analytics', vendor: 'Zernio', kind: 'fixed', amount: 0, steps: [{ fromCustomers: 0, amount: 0 }, { fromCustomers: 2, amount: 6 }, { fromCustomers: 5, amount: 30 }, { fromCustomers: 10, amount: 57 }, { fromCustomers: 50, amount: 213 }, { fromCustomers: 100, amount: 348 }, { fromCustomers: 300, amount: 608 }, { fromCustomers: 1000, amount: 1518 }], freeTier: 'First 2 connected accounts free.', note: 'Assumes 1.3 connected accounts per customer on graduated per-account pricing: $6 for accounts 3 to 10, $3 for 11 to 100, $1 for 101 to 2,000 (checked Oct 2026 [verify]). The Analytics add-on price is not included [verify].', url: 'https://zernio.com/pricing' },
      { name: 'Blog scraping', vendor: 'Firecrawl', kind: 'fixed', amount: 19, steps: [{ fromCustomers: 0, amount: 0 }, { fromCustomers: 1, amount: 19 }, { fromCustomers: 1000, amount: 99 }], freeTier: 'Free credits while building.', note: 'About 40% of carousels start from a blog URL: 1,000 customers x 12 x 0.4 = 4,800 pages a month fits Hobby (5,000). Standard (100,000 pages) after that. Checked Oct 2026 [verify].', url: 'https://www.firecrawl.dev/pricing' },
      { name: 'YouTube transcripts', vendor: 'Supadata', kind: 'fixed', amount: 5, steps: [{ fromCustomers: 0, amount: 0 }, { fromCustomers: 1, amount: 5 }, { fromCustomers: 60, amount: 17 }, { fromCustomers: 700, amount: 47 }], freeTier: '100 credits a month.', note: 'About 30% of carousels start from YouTube: 3.6 transcripts per customer a month. Basic covers 300, Pro 3,000, Mega 30,000. Checked Oct 2026 [verify].', url: 'https://supadata.ai/pricing' },
      { name: 'Supabase Pro', vendor: 'Supabase', kind: 'fixed', amount: 25, steps: [{ fromCustomers: 0, amount: 0 }, { fromCustomers: 1, amount: 25 }, { fromCustomers: 400, amount: 40 }, { fromCustomers: 1500, amount: 85 }], freeTier: 'Free plan for building (pauses after a week of no use).', note: 'Pro $25 includes $10 compute credit. Small compute ($15) from about 400 customers for the job queue and Realtime, Medium ($60) from about 1,500. Checked Oct 2026.', url: 'https://supabase.com/pricing' },
      { name: 'Vercel Pro', vendor: 'Vercel', kind: 'fixed', amount: 20, steps: [{ fromCustomers: 0, amount: 0 }, { fromCustomers: 1, amount: 20 }, { fromCustomers: 500, amount: 40 }], freeTier: 'Hobby is non-commercial only.', note: '$20 per month with $20 usage credit. Render CPU is counted per carousel above; budget about $20 extra for invocations and bandwidth from about 500 customers. Checked Oct 2026.', url: 'https://vercel.com/pricing' },
      { name: 'Transactional email', vendor: 'Resend', kind: 'fixed', amount: 0, steps: [{ fromCustomers: 0, amount: 0 }, { fromCustomers: 300, amount: 20 }], freeTier: '3,000 emails a month, 100 a day.', note: 'Welcome, trial ending, post published and failed, usage alerts. Pro $20/month for 50,000 emails. Checked Oct 2026.', url: 'https://resend.com/pricing' },
      { name: 'Domain', vendor: 'Porkbun', kind: 'fixed', amount: 1, note: 'A .app domain is about $12 to $15 a year [verify], shown as $1 a month.', url: 'https://porkbun.com' },
    ],
    notes: [
      'Unit costs: a carousel (writing, condensing, scrape or transcript) costs at most about $0.07; one slide rewrite $0.008; one export $0.0002; one voice minute $0.0043.',
      'Creator at its cap: 15 x $0.07 + 100 x $0.008 + 60 x $0.0002 + 30 x $0.0043 = $1.99, plus one Zernio account at $3 = $4.99 against $39 (Stripe about $1.70): 83% gross margin. Even at the $6 early account price it is 75%.',
      'Pro at its cap: 50 x $0.07 + 400 x $0.008 + 200 x $0.0002 + 120 x $0.0043 = $7.26, plus 3 accounts at $3 = $16.26 against $79 (Stripe about $3.14): 75% gross margin.',
      'Agency at its cap: 150 x $0.07 + 1,000 x $0.008 + 1,000 x $0.0002 + 400 x $0.0043 = $20.42, plus 10 accounts at $3 = $50.42 against $249 (Stripe about $9.26): 76% gross margin. Past 100 total accounts the Zernio rate drops to $1 and margin rises above 80%.',
      'A typical customer makes about 12 carousels a month and uses half the rewrites: about $1.20 of AI, so real margins sit near 85 to 90% on Creator.',
      'Limits are enforced in the database (try_consume_usage) per calendar month, so no customer can spend past their plan, and failed jobs are refunded.',
      'Zernio per-account pricing is the biggest cost driver. Plans cap connected accounts; once revenue allows, apply for LinkedIn\'s Community Management API and post to LinkedIn directly to cut it.',
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
