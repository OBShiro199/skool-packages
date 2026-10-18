// Ethereel: raw talking-head footage to edited, captioned, scheduled shorts.
// Multi-tenant cloud version of the owner's local tool "Rosewell Reels". Long parts live in ./ethereel/.
import type { AppDef } from '../types'
import { buildPrd1 } from './ethereel/buildPrd1'
import { buildPrd2 } from './ethereel/buildPrd2'
import { buildPrd3 } from './ethereel/buildPrd3'
import { designPrd } from './ethereel/designPrd'
import { landingPrd } from './ethereel/landingPrd'
import { sql } from './ethereel/sql'
import { edgeFunctions } from './ethereel/edgeFunctions'
import { frontendTasks } from './ethereel/frontendTasks'
import { backendTasks } from './ethereel/backendTasks'
import { securityTasks } from './ethereel/securityTasks'
import { outbound, inbound, paid, launchTasks } from './ethereel/marketing'
import { repoTree } from './ethereel/repoTree'
import { starterText } from './ethereel/starter'

export const ethereel: AppDef = {
  slug: 'ethereel',
  name: 'Ethereel',
  tagline: 'Raw clips in, edited reels out',
  oneLiner: 'Upload a raw talking-head clip and get back a captioned reel with zooms, hand-drawn diagrams and music, posted to TikTok and Instagram after you press Pass.',
  category: 'content',
  art: { motif: 'waveform', tone: 'violet' },
  price: { monthly: 89, trialDays: 7 },
  difficulty: 3,
  buildHours: 45,
  apis: [
    {
      name: 'Trigger.dev',
      job: 'runs the video pipeline as queued, retried background jobs with ffmpeg and Python built in',
      signupUrl: 'https://cloud.trigger.dev',
      docsUrl: 'https://trigger.dev/docs',
      pricing: 'Checked 17 Oct 2026: Free $0 with $5 of compute a month, Hobby $10/month with $10 included, Pro $50/month with $50 included. Compute is per second by machine (small-1x 0.5 vCPU $0.0000338/s, medium-1x 1 vCPU 2 GB $0.0000850/s) plus $0.000025 per run. About $0.04 to $0.06 per Ethereel video',
      envVars: [
        { name: 'TRIGGER_SECRET_KEY', where: 'Trigger.dev > project ethereel > API keys > Development (tr_dev_...) locally, Production (tr_prod_...) live', pasteInto: '.env.local', secret: true },
        { name: 'TRIGGER_SECRET_KEY', where: 'Same key: start-pipeline and request-revision trigger tasks with it', pasteInto: 'Supabase secrets', secret: true },
        { name: 'TRIGGER_CALLBACK_SECRET', where: 'Make one: openssl rand -hex 32 (same value in Trigger.dev env)', pasteInto: 'Supabase secrets', secret: true },
      ],
    },
    {
      name: 'Remotion Lambda (AWS)',
      job: 'renders each 1080x1920 30 fps reel from edit.json on many AWS Lambda functions at once',
      signupUrl: 'https://aws.amazon.com',
      docsUrl: 'https://www.remotion.dev/docs/lambda/setup',
      pricing: 'Checked Oct 2026: AWS Lambda pay per use, about $0.03 to $0.06 per 45 s reel at 3 GB memory (Remotion\'s own example: about $0.021 for a 1 minute 720p video with a video inside it). Remotion licence: free for companies of up to 3 people; bigger companies need the Company licence (Automators $0.01 per render, $100/month minimum) [verify on remotion.pro]',
      envVars: [
        { name: 'REMOTION_AWS_ACCESS_KEY_ID', where: 'AWS IAM > Users > remotion-user > Security credentials > Create access key (AKIA...)', pasteInto: 'Trigger.dev env', secret: true },
        { name: 'REMOTION_AWS_SECRET_ACCESS_KEY', where: 'Shown once when you create that access key', pasteInto: 'Trigger.dev env', secret: true },
        { name: 'REMOTION_FUNCTION_NAME', where: 'Printed by npx remotion lambda functions deploy', pasteInto: 'Trigger.dev env', secret: false },
        { name: 'REMOTION_SERVE_URL', where: 'Printed by npx remotion lambda sites create', pasteInto: 'Trigger.dev env', secret: false },
      ],
    },
    {
      name: 'Groq',
      job: 'transcribes each clip with Whisper large-v3-turbo and returns every word with its start and end time',
      signupUrl: 'https://console.groq.com',
      docsUrl: 'https://console.groq.com/docs/speech-to-text',
      pricing: 'Checked Oct 2026: $0.04 per audio hour (10 s minimum per request), free tier with rate limits. A 60 s clip costs about $0.0007. Deepgram nova-3 is about $0.0043 per minute [verify] and is the optional fallback',
      envVars: [
        { name: 'GROQ_API_KEY', where: 'console.groq.com > API Keys > Create API Key (gsk_...)', pasteInto: 'Trigger.dev env', secret: true },
      ],
    },
    {
      name: 'Anthropic Claude',
      job: 'plans the cutaways, writes the opening subtitle and post caption, and turns revision notes into allowed edit operations',
      signupUrl: 'https://console.anthropic.com',
      docsUrl: 'https://platform.claude.com/docs/en/build-with-claude/structured-outputs',
      pricing: 'Checked Oct 2026: claude-opus-5-5 at $4 per million input tokens, $20 per million output tokens, $0.20 per million cached input. About $0.17 per video including an average of half a revision and half a caption rewrite',
      envVars: [
        { name: 'ANTHROPIC_API_KEY', where: 'console.anthropic.com > Settings > API Keys > Create Key (sk-ant-...)', pasteInto: 'Trigger.dev env', secret: true },
        { name: 'ANTHROPIC_API_KEY', where: 'Same key, used by the rewrite-caption edge function', pasteInto: 'Supabase secrets', secret: true },
      ],
    },
    {
      name: 'Zernio',
      job: 'connects each creator\'s TikTok and Instagram and schedules the approved reel to both at its slot',
      signupUrl: 'https://zernio.com',
      docsUrl: 'https://docs.zernio.com',
      pricing: 'Checked Oct 2026: per connected account per month: first 2 free, accounts 3 to 10 $6, 11 to 100 $3, 101 to 2,000 $1. A creator with TikTok + Instagram is 2 accounts (about $6 a month early on, about $2 past 100 accounts). Uploaded media is kept 7 days',
      envVars: [
        { name: 'ZERNIO_API_KEY', where: 'zernio.com dashboard > Settings > API Keys > Create API key [verify menu names]', pasteInto: 'Supabase secrets', secret: true },
      ],
    },
  ],
  idealFor: 'coaches, consultants, SaaS founders, agency owners and podcasters who film themselves talking to camera and want to post every day without editing',
  whyItSells: 'One reel a day edited by hand is about 25 hours a month. Ethereel does it for $89 (about $3 a reel) while costing about $0.35 a reel to run, and nothing posts until the creator presses Pass.',
  features: [
    'Silence cutting that keeps a breath around every cut (pauses over 400 ms, threshold 12 dB under your voice)',
    'Captions in 2 to 4 word pages, spelled your way with your vocabulary and misheard-handle fixes',
    'Seeded 1.12x punch-ins on your eyes and a slow opening push-in',
    'Hand-drawn diagram cutaways on an exercise-book page, plus your own screenshots when you mention them',
    'Opening series title, follow card on your cue line, colour presets and music levelled under your voice',
    'Review inside a TikTok or Instagram overlay, then Pass, Reject or ask for changes in plain words with Undo',
    'Queue with five daily slots in your time zone, posted to TikTok and Instagram with live links back',
    'Exports to the platform spec (H.264 High 4.1, BT.709, -14 LUFS) and validates every file before review',
  ],
  status: 'full',
  costs: {
    usage: { label: 'Videos per creator per month', unit: 'videos', default: 30, min: 5, max: 90, step: 5 },
    plans: [
      { id: 'creator-monthly', name: 'Creator', price: 89, interval: 'month', includes: '30 videos a month (one a day), clips up to 2 minutes, 2 revisions per video, TikTok + Instagram posting, diagrams and screenshots' },
      { id: 'creator-yearly', name: 'Creator (yearly)', price: 890, interval: 'year', includes: 'Same as Creator, 2 months free' },
      { id: 'pro-monthly', name: 'Pro', price: 199, interval: 'month', includes: '90 videos a month, clips up to 3 minutes, 10 clips per upload, 4 revisions per video, Fast processing (two at a time)' },
      { id: 'pro-yearly', name: 'Pro (yearly)', price: 1990, interval: 'year', includes: 'Same as Pro, 2 months free' },
    ],
    lines: [
      { name: 'Claude (cutaway plan, subtitle, caption, revisions)', vendor: 'Anthropic', kind: 'perUnit', amount: 0.17, note: 'claude-opus-5-5 at $4/$20 per million tokens. Plan 6k in / 3k out = $0.084, subtitle $0.014, caption $0.020 (plus a rewrite for AI tells 1 time in 5, $0.004), half a revision on average ($0.03), half a manual rewrite ($0.01). About $0.16, rounded up. Checked Oct 2026.', url: 'https://www.anthropic.com/pricing' },
      { name: 'Pipeline compute', vendor: 'Trigger.dev', kind: 'perUnit', amount: 0.06, note: 'Prepare 90 s and mix/export 120 s on medium-2x ($0.00017/s) = $0.036, faces 60 s on medium-1x = $0.005, the rest on small machines about $0.005, plus re-runs for half a revision. Checked 17 Oct 2026 [verify medium-2x rate].', url: 'https://trigger.dev/pricing' },
      { name: 'Rendering', vendor: 'AWS Lambda (Remotion)', kind: 'perUnit', amount: 0.06, note: 'About $0.04 per 45 s 1080x1920 render at 3 GB, times 1.5 renders per video (revisions), plus S3 pennies. Measure your own with costs.accruedSoFar in the renders table and update this number.', url: 'https://www.remotion.dev/docs/lambda/cost-example' },
      { name: 'Remotion licence', vendor: 'Remotion', kind: 'perUnit', amount: 0.014, note: 'Company licence Automators tier is $0.01 per render (1.4 renders per video), with a $100/month minimum. Free while your company has 3 people or fewer, so a solo founder can start at $0. Counted here anyway to keep margins honest [verify on remotion.pro].', url: 'https://www.remotion.dev/docs/license' },
      { name: 'Storage and egress', vendor: 'Supabase', kind: 'perUnit', amount: 0.04, note: 'Raw clip about 200 MB downloaded once by the pipeline, a 40 MB proxy fetched by Lambda, 3 preview plays of 25 MB: about 0.35 GB egress at $0.09/GB = $0.03, plus storage at $0.021/GB-month for raw (deleted after 14 days) and renders. Pro includes 250 GB egress and 100 GB storage first.', url: 'https://supabase.com/pricing' },
      { name: 'Transcription', vendor: 'Groq', kind: 'perUnit', amount: 0.001, note: '$0.04 per audio hour: a 60 s clip is $0.00067. Deepgram fallback would be about $0.004. Checked Oct 2026.', url: 'https://groq.com/pricing' },
      { name: 'Social posting (TikTok + Instagram)', vendor: 'Zernio', kind: 'perCustomer', amount: 6, note: 'Two connected accounts per creator. $6 each for accounts 3 to 10, $3 each for 11 to 100 (so $6 per creator), $1 each past 100 accounts (about $2 per creator from 50 creators). First 2 accounts free. Checked Oct 2026.', url: 'https://zernio.com/pricing' },
      { name: 'Supabase', vendor: 'Supabase', kind: 'fixed', amount: 25, steps: [{ fromCustomers: 0, amount: 0 }, { fromCustomers: 1, amount: 25 }, { fromCustomers: 150, amount: 40 }, { fromCustomers: 500, amount: 85 }], freeTier: 'Free for building, but uploads are capped at 50 MB and projects pause after a week of no use.', note: 'Pro $25/month includes $10 compute credit. Small compute (+$15) from about 150 creators because of Realtime and pipeline writes, Medium (+$60) from about 500. Checked Oct 2026.', url: 'https://supabase.com/pricing' },
      { name: 'Trigger.dev plan', vendor: 'Trigger.dev', kind: 'fixed', amount: 10, steps: [{ fromCustomers: 0, amount: 0 }, { fromCustomers: 1, amount: 10 }, { fromCustomers: 50, amount: 50 }], freeTier: '$5 of compute a month on Free.', note: 'Hobby $10/month for the first creators, Pro $50/month (more concurrency) from about 50. The included usage credit offsets part of the per-video compute line, which is left in full to stay conservative. Checked 17 Oct 2026.', url: 'https://trigger.dev/pricing' },
      { name: 'Vercel Pro', vendor: 'Vercel', kind: 'fixed', amount: 20, steps: [{ fromCustomers: 0, amount: 0 }, { fromCustomers: 1, amount: 20 }], freeTier: 'Hobby is free for non-commercial use only.', note: '$20 per member per month with $20 usage credit. One member is enough. Checked 17 Oct 2026.', url: 'https://vercel.com/pricing' },
      { name: 'Transactional email', vendor: 'Resend', kind: 'fixed', amount: 0, steps: [{ fromCustomers: 0, amount: 0 }, { fromCustomers: 250, amount: 20 }], freeTier: '3,000 emails a month, 100 a day.', note: 'About 10 emails per creator per month (ready, live, trial). Pro $20/month for 50,000 once past the free cap. Checked 17 Oct 2026.', url: 'https://resend.com/pricing' },
      { name: 'Domain', vendor: 'Porkbun', kind: 'fixed', amount: 1, note: 'A .com is about $11 a year, shown as $1 a month.', url: 'https://porkbun.com' },
    ],
    notes: [
      'Usage driver: videos per creator per month (default 30, one a day). A typical clip is 60 s raw and 45 s edited.',
      'Variable cost per video: Claude $0.17 + compute $0.06 + rendering $0.06 + Remotion licence $0.014 + storage/egress $0.04 + transcription $0.001 = about $0.35.',
      'Creator at its cap: 30 × $0.35 = $10.50 + $6 Zernio = $16.50. Stripe takes about $3.50 of $89 (2.9% + $0.30 + 0.7% Billing). Gross margin = (89 - 16.50 - 3.50) / 89 = 77.5%.',
      'Pro at its cap: 90 × $0.35 = $31.50 + $6 Zernio = $37.50. Stripe about $7.46 of $199. Gross margin = (199 - 37.50 - 7.46) / 199 = 77.4%.',
      'Trial: 5 videos at $0.35 = $1.75 per trial plus Zernio for one week. At a 20% trial-to-paid rate that is about $9 of trial cost per paying creator.',
      'What breaks first: Claude is half the variable cost. If margins slip, move the subtitle and caption calls to effort low with a cached system prompt (already planned) before touching the cutaway plan.',
      'Remotion licence: free for a company of up to 3 people; once you need the Company licence its $100/month minimum is covered by renders at about 220 creators (30 videos x 1.5 renders x $0.01 each).',
      'Stripe fees are added by the calculator, not listed as a line. Re-check every vendor price before launch and every quarter.',
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
    starterFiles: Object.entries(starterText).map(([path, content]) => ({ path, content: content + '\n' })),
  },
}
