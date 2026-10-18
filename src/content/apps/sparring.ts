// Sparring: an AI prospect that picks up the phone so reps can practise cold calls and get scored.
import type { AppDef } from '../types'
import { buildPrd1 } from './sparring/buildPrd1'
import { buildPrd2 } from './sparring/buildPrd2'
import { buildPrd3 } from './sparring/buildPrd3'
import { designPrd } from './sparring/designPrd'
import { landingPrd } from './sparring/landingPrd'
import { sql } from './sparring/sql'
import { edgeFunctions } from './sparring/edgeFunctions'
import { frontendTasks } from './sparring/frontendTasks'
import { backendTasks } from './sparring/backendTasks'
import { securityTasks } from './sparring/securityTasks'
import { outbound, inbound, paid } from './sparring/marketing'
import { launchTasks, repoTree, starterFiles } from './sparring/launch'

export const sparring: AppDef = {
  slug: 'sparring',
  name: 'Sparring',
  tagline: 'Cold call practice that hits back',
  oneLiner: 'Reps cold call a realistic AI prospect in the browser, get scored out of 100 with coaching notes on the exact second, and managers assign drills and watch the leaderboard.',
  category: 'sales',
  art: { motif: 'chat', tone: 'blue' },
  price: { monthly: 49, trialDays: 7 },
  difficulty: 3,
  buildHours: 35,
  apis: [
    {
      name: 'ElevenLabs Agents Platform',
      job: 'runs the live voice call in the browser (speech to text, turn-taking, persona voices, recording and transcript) and asks Sparring\'s own Custom LLM endpoint what the persona says on every turn',
      signupUrl: 'https://elevenlabs.io/sign-up',
      docsUrl: 'https://elevenlabs.io/docs/eleven-agents/customization/llm/custom-llm',
      pricing: 'Checked Oct 2026 from third-party pricing summaries (the vendor page would not load): about $0.08 per call minute on every paid plan, with plan fees prepaying minutes (Pro about $99 for about 1,238 minutes, Business about $990 for about 12,375); burst minutes above the concurrency limit about $0.16. With a Custom LLM the LLM is not billed by ElevenLabs. Concurrency about 10 (Creator), 20 (Pro), 30 (Business) live calls [verify all on elevenlabs.io/pricing]. Picked over Vapi ($0.05 platform plus STT and TTS, about $0.08 to $0.12 all-in), Deepgram Voice Agent BYO LLM (about $0.065) and a DIY Deepgram Flux + Cartesia stack (about $0.04 but needs an always-on media server).',
      envVars: [
        { name: 'ELEVENLABS_API_KEY', where: 'ElevenLabs > profile > API Keys > Create API key (Agents read/write, Voices read)', pasteInto: 'Supabase secrets', secret: true },
        { name: 'ELEVENLABS_AGENT_ID', where: 'ElevenLabs > Agents > Sparring persona > agent id (agent_...)', pasteInto: 'Supabase secrets', secret: false },
        { name: 'ELEVENLABS_WEBHOOK_SECRET', where: 'ElevenLabs > Settings > Webhooks > post-call webhook > HMAC secret', pasteInto: 'Supabase secrets', secret: true },
        { name: 'PERSONA_LLM_SECRET', where: 'Make one: openssl rand -hex 32, and paste the same value as the agent\'s Custom LLM API key secret in ElevenLabs', pasteInto: 'Supabase secrets', secret: true },
        { name: 'SESSION_TOKEN_SECRET', where: 'Make one: openssl rand -hex 32 (signs the per-call token the persona endpoint checks)', pasteInto: 'Supabase secrets', secret: true },
      ],
    },
    {
      name: 'Claude API (Anthropic)',
      job: 'plays the persona on every turn with claude-haiku-5-5 (streamed, low effort), and scores each call and drafts custom personas with claude-sonnet-5-5 structured JSON output',
      signupUrl: 'https://console.anthropic.com',
      docsUrl: 'https://docs.claude.com/en/api/overview',
      pricing: 'Checked Oct 2026: claude-haiku-5-5 $0.10 per million input tokens and $0.50 per million output (prompts up to 100k tokens), about $0.002 per call minute. claude-sonnet-5-5 $2 in, $10 out, $0.20 cached input: about $0.04 to score a 6 minute call and $0.04 per persona draft. Prepaid credit; set a monthly spend limit in Settings > Limits.',
      envVars: [
        { name: 'ANTHROPIC_API_KEY', where: 'console.anthropic.com > Settings > API Keys > Create Key (sk-ant-...)', pasteInto: 'Supabase secrets', secret: true },
      ],
    },
  ],
  idealFor: 'People who want a first B2B SaaS sold to a buyer they can reach directly: SDR and BDR team leads, sales bootcamps and coaches, and founders who have to learn to cold call themselves.',
  whyItSells: 'A new SDR costs about $5,000 a month and takes about 3 months to ramp, practising on real prospects. Team is $199 a month for 5 reps: if 15 minutes a day gets one rep to their first meeting a week sooner, it has paid for itself several times over.',
  features: [
    'Built-in personas (sceptical CFO, busy founder, gatekeeper) and scenarios (cold call, discovery, objection drill) at three difficulties',
    'Live voice roleplay in the browser with about a one second reply, interruptions and hang-ups',
    'Score out of 100 on opener, permission, pain discovery, objection handling and next step',
    'Three to eight coaching notes pinned to the exact second, with the better line to say',
    'Recording and transcript for every call, with notes that jump the audio',
    'Custom personas drafted from your ICP and the real objections your team hears',
    'Assignments with pass scores and due dates, a weekly leaderboard, streaks and score trends per rep',
    'Pooled voice minutes with a hard cap, a live meter, and a Monday team report by email',
  ],
  status: 'full',
  costs: {
    usage: { label: 'Voice practice minutes per workspace per month', unit: 'minutes', default: 250, min: 20, max: 900, step: 10 },
    plans: [
      { id: 'solo-monthly', usageCap: 90, name: 'Solo', price: 49, interval: 'month', includes: '1 seat, 90 voice minutes a month, calls up to 10 minutes, 3 custom personas, 5 persona drafts, scorecards and recordings' },
      { id: 'solo-yearly', usageCap: 90, name: 'Solo (yearly)', price: 490, interval: 'year', includes: 'Same as Solo every month, 2 months free' },
      { id: 'team-monthly', usageCap: 360, name: 'Team', price: 199, interval: 'month', includes: '6 seats, 360 pooled voice minutes, calls up to 15 minutes, 25 custom personas, 30 drafts, assignments, leaderboard, trends, weekly report' },
      { id: 'team-yearly', usageCap: 360, name: 'Team (yearly)', price: 1990, interval: 'year', includes: 'Same as Team every month, 2 months free' },
      { id: 'floor-monthly', usageCap: 900, name: 'Floor', price: 499, interval: 'month', includes: '16 seats, 900 pooled voice minutes, calls up to 20 minutes, 500 custom personas, 100 drafts, everything in Team' },
      { id: 'floor-yearly', usageCap: 900, name: 'Floor (yearly)', price: 4990, interval: 'year', includes: 'Same as Floor every month, 2 months free' },
    ],
    lines: [
      { name: 'Live voice (STT, turn-taking, TTS, recording)', vendor: 'ElevenLabs Agents', kind: 'perUnit', amount: 0.08, freeTier: 'Free plan has a few test minutes; building needs a paid plan [verify].', note: 'About $0.08 per call minute on paid plans, with the plan fee prepaying minutes at that rate. Burst minutes (over the concurrency limit) about $0.16: keep burst off. Checked Oct 2026 from third-party summaries [verify on elevenlabs.io/pricing].', url: 'https://elevenlabs.io/pricing' },
      { name: 'Persona brain', vendor: 'Anthropic (claude-haiku-5-5)', kind: 'perUnit', amount: 0.002, note: 'About 30 turns per 6 minute call, each about 4k input + 60 output tokens at $0.10/$0.50 per MTok, uncached: about $0.013 a call, $0.002 a minute. Checked Oct 2026.', url: 'https://docs.claude.com/en/docs/about-claude/models/overview' },
      { name: 'Scoring', vendor: 'Anthropic (claude-sonnet-5-5)', kind: 'perUnit', amount: 0.007, note: 'About 5k input ($0.01) + 3k output with thinking ($0.03) = $0.04 per call. At an average call of about 6 minutes that is $0.007 a minute. Calls under 60 seconds are not scored. Checked Oct 2026.', url: 'https://docs.claude.com/en/docs/about-claude/models/overview' },
      { name: 'Persona builder drafts', vendor: 'Anthropic (claude-sonnet-5-5)', kind: 'perCustomer', amount: 0.4, note: 'About $0.04 per draft. Typical team drafts about 10 a month ($0.40); the caps are 5, 30 and 100 drafts ($0.20, $1.20, $4.00 at most).', url: 'https://docs.claude.com/en/docs/about-claude/models/overview' },
      { name: 'Supabase', vendor: 'Supabase', kind: 'fixed', amount: 25, steps: [{ fromCustomers: 0, amount: 0 }, { fromCustomers: 1, amount: 25 }, { fromCustomers: 300, amount: 45 }, { fromCustomers: 1000, amount: 100 }], freeTier: 'Free plan for building (pauses after a week idle).', note: 'Pro $25/month with 100 GB storage. Recordings are about 0.5 MB a minute and kept 90 days: about 0.4 GB per average team, so storage passes 100 GB around 250 teams ($0.021/GB over [verify]). Small compute ($15 more) from about 300 teams for the persona endpoint and cron, Medium from about 1,000. Checked Oct 2026.', url: 'https://supabase.com/pricing' },
      { name: 'Vercel Pro', vendor: 'Vercel', kind: 'fixed', amount: 20, steps: [{ fromCustomers: 0, amount: 0 }, { fromCustomers: 1, amount: 20 }], freeTier: 'Hobby is free for non-commercial use only.', note: '$20 per member per month with $20 of usage credit. One member is enough. Checked Oct 2026.', url: 'https://vercel.com/pricing' },
      { name: 'Transactional email', vendor: 'Resend', kind: 'fixed', amount: 0, steps: [{ fromCustomers: 0, amount: 0 }, { fromCustomers: 70, amount: 20 }, { fromCustomers: 1200, amount: 90 }], freeTier: '3,000 emails a month, 100 a day.', note: 'About 40 emails per team a month (invites, drills, due reminders, weekly reports to managers, usage warnings). Pro $20 for 50,000 from about 70 teams; the 100,000 tier (about $90 [verify]) from about 1,200. Checked Oct 2026.', url: 'https://resend.com/pricing' },
      { name: 'Product analytics', vendor: 'PostHog', kind: 'fixed', amount: 0, freeTier: '1 million events and 5,000 replays a month.', note: 'Free tier covers well past 1,000 teams at this event volume. Checked Oct 2026.', url: 'https://posthog.com/pricing' },
      { name: 'Domain', vendor: 'Porkbun', kind: 'fixed', amount: 1, note: 'A .app or .com domain is about $12 to $15 a year, shown as $1 a month [verify the price for the name you pick].', url: 'https://porkbun.com' },
    ],
    notes: [
      'All-in cost per voice minute: $0.08 ElevenLabs + $0.002 persona brain + $0.007 scoring = $0.089. At the default 250 minutes a month that is about $22.25.',
      'Solo at its cap (90 minutes, 5 drafts) costs $8.21 plus $2.06 Stripe fees on $49: 79% gross margin. Annual: $98.52 + $17.94 on $490 = 76%.',
      'Team at its cap (360 minutes, 30 drafts) costs $33.24 plus $7.46 Stripe fees on $199: 80%. Annual: $398.88 + $71.94 on $1,990 = 76%.',
      'Floor at its cap (900 minutes, 100 drafts) costs $84.10 plus $18.26 Stripe fees on $499: 79%. Annual: $1,009.20 + $179.94 on $4,990 = 76%.',
      'Annual plans get the monthly minutes every month, so the 2 free months are the reason annual margins sit at 76%, not 79%. Do not add a yearly minute pool.',
      'A 7 day trial is capped at 20 voice minutes and 3 drafts, so a trial that never converts costs about $1.90 at most.',
      'Caps are enforced server-side: minutes are reserved before each call (reserve_seconds) and settled from the ElevenLabs webhook, so parallel calls cannot overspend.',
      'Margins depend on ElevenLabs staying near $0.08 a minute. If it rises to $0.10, Team at its cap drops to about 77%; above $0.12, cut minutes or move to the DIY voice stack (PRD section 5.1).',
      'The optional public demo call (marketing task) is capped at 300 minutes a day, about $27 a day at most. Lower the cap if signups from it do not pay for it.',
      'Fixed costs (Supabase, Vercel, domain) are about $46 a month: covered by the first paying customer. Stripe fees are added by the calculator, not listed here.',
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
