// Echo: podcast episodes turned into show notes, chapters, quotes, a newsletter and audiograms.
import type { AppDef } from '../types'
import { buildPrd1 } from './echo/buildPrd1'
import { buildPrd2 } from './echo/buildPrd2'
import { designPrd } from './echo/designPrd'
import { landingPrd } from './echo/landingPrd'
import { sql } from './echo/sql'
import { edgeFunctions } from './echo/edgeFunctions'
import { frontendTasks } from './echo/frontendTasks'
import { backendTasks } from './echo/backendTasks'
import { securityTasks } from './echo/securityTasks'
import { outbound, inbound, paid } from './echo/marketing'
import { launchTasks, repoTree, starterFiles } from './echo/launch'

export const echo: AppDef = {
  slug: 'echo',
  name: 'Echo',
  tagline: 'Every episode, written up and clipped',
  oneLiner: 'Upload a podcast episode or connect an RSS feed and get show notes, chapters, quotes, a newsletter, social posts, an SEO blog post and captioned audiograms in the host\'s own voice.',
  category: 'content',
  art: { motif: 'waveform', tone: 'violet' },
  price: { monthly: 29, trialDays: 7 },
  difficulty: 3,
  buildHours: 28,
  apis: [
    {
      name: 'AssemblyAI',
      job: 'transcribes uploaded and RSS-imported episodes with speaker labels and word timestamps, then calls Echo back by webhook',
      signupUrl: 'https://www.assemblyai.com/dashboard/signup',
      docsUrl: 'https://www.assemblyai.com/docs',
      pricing: 'Checked Oct 2026: Universal-3.5 Pro async $0.21 per audio hour, speaker labels +$0.02 per hour, so $0.23 for a one hour episode. $50 free credit, no card. Picked over Deepgram Nova-3 pre-recorded ($0.0043 to $0.0048 a minute plus a diarisation add-on, sources conflict [verify]), which is about $0.38 for the same hour with speakers.',
      envVars: [
        { name: 'ASSEMBLYAI_API_KEY', where: 'AssemblyAI dashboard > API Keys > Copy', pasteInto: 'Supabase secrets', secret: true },
        { name: 'ASSEMBLYAI_WEBHOOK_SECRET', where: 'Make one: run openssl rand -hex 32 (sent back as the x-echo-webhook header)', pasteInto: 'Supabase secrets', secret: true },
      ],
    },
    {
      name: 'Claude API (Anthropic)',
      job: 'writes titles, show notes, chapters, pull quotes, clip ideas, the newsletter, social posts, the SEO blog post and the voice card with claude-sonnet-5-5 structured JSON output and a cached transcript',
      signupUrl: 'https://console.anthropic.com',
      docsUrl: 'https://docs.claude.com/en/api/overview',
      pricing: 'Checked Oct 2026 on third-party price trackers [verify on platform.claude.com]: claude-sonnet-5-5 is $2 per million input tokens, $10 per million output tokens, $0.20 per million cache reads and $2.50 per million 5-minute cache writes. The three writing calls for a one hour episode cost about $0.18. Prepaid credit; set a monthly limit in Settings > Limits.',
      envVars: [
        { name: 'ANTHROPIC_API_KEY', where: 'console.anthropic.com > Settings > API Keys > Create Key (sk-ant-...)', pasteInto: 'Supabase secrets', secret: true },
      ],
    },
    {
      name: 'Remotion Lambda (on AWS)',
      job: 'renders 30 to 60 second 1080x1920 audiograms with a waveform and word-by-word captions in two steps (clip audio to WAV, then the video), and calls Echo back with a signed webhook',
      signupUrl: 'https://aws.amazon.com',
      docsUrl: 'https://www.remotion.dev/docs/lambda',
      pricing: 'Checked Oct 2026: Remotion is free for companies of up to 3 people; from the 4th person the Company Licence "Automators" option is $0.01 per render with a $100 a month minimum [verify]. AWS Lambda arm64 is about $0.0000133 per GB-second [verify]; a 60 second vertical render plus the audio step, S3 and transfer is budgeted at $0.06 until you measure it with estimatePrice(). Shotstack ($0.15 to $0.30 per rendered minute) and Creatomate (about $0.37 per 1080p minute) were more expensive [verify].',
      envVars: [
        { name: 'REMOTION_AWS_ACCESS_KEY_ID', where: 'AWS IAM > Users > remotion-user > Security credentials > Create access key (AKIA...)', pasteInto: 'Supabase secrets', secret: true },
        { name: 'REMOTION_AWS_SECRET_ACCESS_KEY', where: 'Same screen, Secret access key (shown once)', pasteInto: 'Supabase secrets', secret: true },
        { name: 'REMOTION_AWS_REGION', where: 'us-east-1 (the region you deployed the function to)', pasteInto: 'Supabase secrets', secret: false },
        { name: 'REMOTION_FUNCTION_NAME', where: 'Printed by npx remotion lambda functions deploy (remotion-render-...)', pasteInto: 'Supabase secrets', secret: false },
        { name: 'REMOTION_SERVE_URL', where: 'Printed by npx remotion lambda sites create (an S3 URL ending in /index.html)', pasteInto: 'Supabase secrets', secret: false },
        { name: 'REMOTION_WEBHOOK_SECRET', where: 'Make one: openssl rand -hex 32 (Remotion signs each callback with it, HMAC-SHA512)', pasteInto: 'Supabase secrets', secret: true },
      ],
    },
  ],
  idealFor: 'People who want a first B2B SaaS in a market they can reach from public data: indie podcasters, B2B podcast agencies and marketing teams at companies with a branded show.',
  whyItSells: 'A weekly show spends about 16 hours a month writing show notes, posts and newsletters and cutting clips. Echo does all of it in about 20 minutes an episode for $29 a month, and an agency with 20 client shows replaces most of a $3,000 a month content role with a $199 plan.',
  features: [
    'Upload a file up to 1 GB, or connect an RSS feed and new episodes import themselves every 15 minutes',
    'Transcript with speaker names you set once, word timestamps and search',
    'Five title options, show notes, chapters and five pull quotes checked word for word against the transcript',
    'Newsletter draft, five social posts and an SEO blog post, all in the host\'s voice from a writing sample',
    'Regenerate any asset with an instruction, with 10 versions of history and Undo',
    'Vertical 1080x1920 audiograms with a moving waveform and word-by-word captions in three styles',
    'Public episode pages with the full transcript, chapters.json and transcript files, and an embeddable player that streams from your own host',
    'Workspaces with up to 25 shows and 10 people for agencies and companies, with usage caps shown before you hit them',
  ],
  status: 'full',
  costs: {
    usage: { label: 'Audio hours processed per workspace per month', unit: 'audio hours', default: 4, min: 1, max: 50, step: 1 },
    plans: [
      { id: 'creator-monthly', usageCap: 6, name: 'Creator', price: 29, interval: 'month', includes: '1 show, 1 seat, 6 audio hours, episodes up to 2 hours, 20 audiograms, 25 regenerations a month, RSS auto-import, public pages with a Made with Echo badge' },
      { id: 'creator-yearly', usageCap: 6, name: 'Creator (yearly)', price: 290, interval: 'year', includes: 'Same as Creator, 2 months free' },
      { id: 'studio-monthly', usageCap: 20, name: 'Studio', price: 79, interval: 'month', includes: '5 shows, 3 seats, 20 audio hours, episodes up to 3 hours, 50 audiograms, 50 regenerations a month, badge optional' },
      { id: 'studio-yearly', usageCap: 20, name: 'Studio (yearly)', price: 790, interval: 'year', includes: 'Same as Studio, 2 months free' },
      { id: 'agency-monthly', usageCap: 50, name: 'Agency', price: 199, interval: 'month', includes: '25 shows, 10 seats, 50 audio hours, episodes up to 4 hours, 150 audiograms, 100 regenerations a month, badge optional' },
      { id: 'agency-yearly', usageCap: 50, name: 'Agency (yearly)', price: 1990, interval: 'year', includes: 'Same as Agency, 2 months free' },
    ],
    lines: [
      { name: 'Transcription with speakers', vendor: 'AssemblyAI', kind: 'perUnit', amount: 0.23, freeTier: '$50 free credit (about 215 audio hours).', note: '$0.21 per hour (Universal-3.5 Pro async) + $0.02 per hour speaker labels. Billed on the real audio length AssemblyAI reports. Checked Oct 2026 [verify on assemblyai.com/pricing].', url: 'https://www.assemblyai.com/pricing' },
      { name: 'Claude: core pack, newsletter, posts and blog', vendor: 'Anthropic', kind: 'perUnit', amount: 0.18, note: 'claude-sonnet-5-5 at $2 in / $10 out per MTok. Per audio hour: call A 16k in (13k transcript written to cache at $2.50) + 4k out = $0.08; call B 3k in + 13k cache read at $0.20 + 3.5k out = $0.04; call C 3k in + 13k cache read + 5k out = $0.06. Total about $0.18. Prices from third-party trackers, Oct 2026 [verify].', url: 'https://www.anthropic.com/pricing' },
      { name: 'Claude: regenerations (typical 3 per audio hour)', vendor: 'Anthropic', kind: 'perUnit', amount: 0.15, note: 'One regeneration is about $0.05 (cache usually expired: 13k cache write + 3k in + 1.5k out). Typical use is about 3 per episode hour; plans cap it at 25, 50 and 100 a month.', url: 'https://www.anthropic.com/pricing' },
      { name: 'Audiograms (typical 4 per audio hour)', vendor: 'AWS (Remotion Lambda)', kind: 'perUnit', amount: 0.24, freeTier: 'AWS Lambda free tier covers some GB-seconds each month [verify]. Remotion licence free up to 3 people.', note: 'Budget $0.06 per 60 s audiogram (audio step + 6 Lambdas at 2048 MB for the video, S3 and transfer). Measure your real composition with estimatePrice() and replace this number. Typical use about 4 audiograms per audio hour.', url: 'https://www.remotion.dev/docs/lambda/cost-example' },
      { name: 'Supabase', vendor: 'Supabase', kind: 'fixed', amount: 25, steps: [{ fromCustomers: 0, amount: 0 }, { fromCustomers: 1, amount: 25 }, { fromCustomers: 300, amount: 45 }, { fromCustomers: 1000, amount: 100 }], freeTier: 'Free plan for building (pauses after a week idle, 50 MB upload cap). Upgrade before the first paying customer.', note: 'Pro $25/month with 100 GB storage. Uploaded audio (about 60 MB per hour) is deleted 30 days after processing and audiogram files after 90 days, so storage stays near 0.7 GB per workspace. Small compute plus extra storage from about 300 workspaces, Medium compute (about $60 more) and about 600 GB extra storage at $0.021/GB from about 1,000. Checked Oct 2026.', url: 'https://supabase.com/pricing' },
      { name: 'Vercel Pro', vendor: 'Vercel', kind: 'fixed', amount: 20, steps: [{ fromCustomers: 0, amount: 0 }, { fromCustomers: 1, amount: 20 }], freeTier: 'Hobby is free for non-commercial use only.', note: '$20 per member per month with $20 of usage credit. Public episode pages are cached (ISR) so traffic stays inside the credit for a long time. Checked Oct 2026.', url: 'https://vercel.com/pricing' },
      { name: 'Transactional email', vendor: 'Resend', kind: 'fixed', amount: 0, steps: [{ fromCustomers: 0, amount: 0 }, { fromCustomers: 150, amount: 20 }], freeTier: '3,000 emails a month, 100 a day.', note: 'About 15 emails per workspace a month (ready, new episode, audiograms ready, usage, invites). Pro $20 for 50,000 from about 150 workspaces covers past 1,000. Checked Oct 2026.', url: 'https://resend.com/pricing' },
      { name: 'Free show notes tool', vendor: 'AssemblyAI + Anthropic', kind: 'fixed', amount: 11, note: 'Marketing cost, capped in code at 40 audio hours a month: 40 x ($0.23 + about $0.03 for titles and chapters only) = about $10.40, shown as $11.' },
      { name: 'AWS storage and logs', vendor: 'AWS', kind: 'fixed', amount: 1, note: 'The Remotion site bundle in S3, temporary render outputs (deleted after copy) and CloudWatch logs. Well under $1 a month at launch [verify after month one].', url: 'https://aws.amazon.com/lambda/pricing/' },
      { name: 'Remotion licence', vendor: 'Remotion', kind: 'fixed', amount: 0, note: 'Free while your company has 3 people or fewer. At 4 or more, budget the Automators option: $0.01 per render with a $100 a month minimum [verify on remotion.dev/docs/license].', url: 'https://www.remotion.dev/docs/license' },
      { name: 'Product analytics', vendor: 'PostHog', kind: 'fixed', amount: 0, freeTier: '1 million events and 5,000 replays a month.', note: 'Free tier covers well past 1,000 workspaces at this event volume. Checked Oct 2026.', url: 'https://posthog.com/pricing' },
      { name: 'Domain', vendor: 'Porkbun', kind: 'fixed', amount: 1, note: 'A .app or .com domain is about $12 to $15 a year, shown as $1 a month [verify the exact price at checkout].', url: 'https://porkbun.com' },
    ],
    notes: [
      'Cost per audio hour: $0.23 transcription + $0.18 writing = $0.41, before regenerations and audiograms.',
      'Typical workspace (4 audio hours, 12 regenerations, 16 audiograms): $1.64 + $0.60 + $0.96 = $3.20 a month on a $29 plan.',
      'Creator at every cap (6 h, 20 audiograms, 25 regenerations): $2.46 + $1.20 + $1.25 = $4.91, plus about $1.34 in Stripe fees on $29 = $6.25. Gross margin about 78.4%. Yearly ($290): 12 x $4.91 + $10.74 Stripe = $69.66, margin about 76.0%.',
      'Studio at every cap (20 h, 50 audiograms, 50 regenerations): $8.20 + $3.00 + $2.50 = $13.70, plus about $3.14 in Stripe fees on $79 = $16.84. Gross margin about 78.7%. Yearly ($790): 12 x $13.70 + $28.74 = $193.14, margin about 75.6%.',
      'Agency at every cap (50 h, 150 audiograms, 100 regenerations): $20.50 + $9.00 + $5.00 = $34.50, plus about $7.46 in Stripe fees on $199 = $41.96. Gross margin about 78.9%. Yearly ($1,990): 12 x $34.50 + $71.94 = $485.94, margin about 75.6%.',
      'Yearly plans cost 10 months of the monthly price (2 months free). The caps were set so a yearly customer who maxes out every month still leaves 75%+; the audiogram and regeneration caps are the levers if prices change.',
      'A 7 day trial is capped at 2 audio hours, 5 audiograms and 10 regenerations: at most $1.62 for a trial that never converts.',
      'Caps are enforced server-side from usage_ledger in every edge function that spends money, duration is estimated from the file size, so no workspace can pass these numbers.',
      'Fixed costs at launch (Supabase, Vercel, free tool, AWS, domain) are about $58 a month: covered by two Creator customers.',
      'Stripe subscription fees are added by the calculator, not listed as a line.',
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
