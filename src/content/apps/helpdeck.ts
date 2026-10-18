// Helpdeck: AI support widget trained on a company's docs.
import type { AppDef } from '../types'
import { buildPrd1 } from './helpdeck/buildPrd1'
import { buildPrd2 } from './helpdeck/buildPrd2'
import { buildPrd3 } from './helpdeck/buildPrd3'
import { designPrd } from './helpdeck/designPrd'
import { landingPrd } from './helpdeck/landingPrd'
import { sql } from './helpdeck/sql'
import { edgeFunctions } from './helpdeck/edgeFunctions'
import { frontendTasks } from './helpdeck/frontendTasks'
import { backendTasks } from './helpdeck/backendTasks'
import { securityTasks } from './helpdeck/securityTasks'
import { outbound, inbound, paid } from './helpdeck/marketing'
import { launchTasks, repoTree, starterFiles } from './helpdeck/launch'

export const helpdeck: AppDef = {
  slug: 'helpdeck',
  name: 'Helpdeck',
  tagline: 'AI support trained on your docs',
  oneLiner: 'A chat widget that learns a company\'s website, answers customers with sources, and emails a human when unsure.',
  category: 'ai-agents',
  art: { motif: 'chat', tone: 'ink' },
  price: { monthly: 49, trialDays: 7 },
  difficulty: 2,
  buildHours: 18,
  apis: [
    {
      name: 'Firecrawl',
      job: 'crawls the customer\'s website and posts every page back to Helpdeck as clean markdown through a signed webhook',
      signupUrl: 'https://www.firecrawl.dev/signin',
      docsUrl: 'https://docs.firecrawl.dev',
      pricing: 'Checked Oct 2026: free plan with a small one-time allowance (500 credits [verify]). 1 credit per page with plain markdown scraping (JSON mode and enhanced proxy cost extra, Helpdeck uses neither). Billed yearly: Hobby about $16/month (3,000 or 5,000 credits, sources differ [verify]), Standard $83/month for 100,000 credits, Growth $333/month for 500,000, Scale $599/month for 1,000,000 [verify]. Credits do not roll over. Webhooks are signed with X-Firecrawl-Signature (HMAC-SHA256 of the raw body).',
      envVars: [
        { name: 'FIRECRAWL_API_KEY', where: 'firecrawl.dev → Dashboard → API Keys (fc-...)', pasteInto: 'Supabase secrets', secret: true },
        { name: 'FIRECRAWL_WEBHOOK_SECRET', where: 'firecrawl.dev → Settings → Advanced → Webhook secret [verify the menu name]', pasteInto: 'Supabase secrets', secret: true },
      ],
    },
    {
      name: 'Claude API',
      job: 'answers visitor questions from the matching docs chunks with claude-haiku-5-5 as strict JSON (answer, confident, reason, sources), and groups docs gaps for the weekly email',
      signupUrl: 'https://platform.claude.com',
      docsUrl: 'https://platform.claude.com/docs',
      pricing: 'Checked Oct 2026: pay as you go. claude-haiku-5-5 is $0.10 per million input tokens and $0.50 per million output tokens (prompts up to 100K tokens), so a typical answer (about 5,000 in, 300 out) costs $0.00065. Add $5 of credit to start and set a monthly spend limit.',
      envVars: [
        { name: 'ANTHROPIC_API_KEY', where: 'platform.claude.com → Settings → API keys → Create key (sk-ant-...)', pasteInto: 'Supabase secrets', secret: true },
      ],
    },
    {
      name: 'Voyage AI',
      job: 'turns docs chunks and questions into 1024-number embeddings with voyage-3.5 so the closest chunks can be found',
      signupUrl: 'https://dashboard.voyageai.com',
      docsUrl: 'https://docs.voyageai.com',
      pricing: 'Checked Oct 2026: voyage-3.5 is $0.06 per million tokens and the first 200 million tokens are free, which covers thousands of crawled sites. Add a payment method to lift the low default rate limits.',
      envVars: [
        { name: 'VOYAGE_API_KEY', where: 'dashboard.voyageai.com → API Keys → Create new secret key (pa-...)', pasteInto: 'Supabase secrets', secret: true },
      ],
    },
  ],
  idealFor: 'Builders who want an AI product with obvious value: SaaS founders, agencies and online shops drowning in repeat support questions.',
  whyItSells: 'A support ticket costs a small company about $5 of someone\'s time. Deflect 30 of them a month and Helpdeck has paid for itself at $49, while Intercom\'s AI agent starts near $0.99 per resolution on top of seat fees.',
  features: [
    'Paste a URL and the whole site is crawled and learned in minutes',
    'One-line script tag install for any website',
    'Answers cite the exact docs pages they came from',
    'Says "I\'m not sure" instead of guessing, then offers email handoff',
    'Handoff emails include the full transcript with reply-to set to the visitor',
    'Conversations inbox and a ranked "docs gaps" list of questions your docs miss',
    'Widget only works on domains you allow',
    'Re-crawls only re-learn changed pages, with hard monthly caps so costs never run away',
  ],
  status: 'full',
  costs: {
    usage: { label: 'Bot answers per customer per month', unit: 'answers', default: 500, min: 50, max: 10000, step: 50 },
    plans: [
      { id: 'starter-monthly', name: 'Starter', price: 49, interval: 'month', includes: '1 bot, up to 200 pages, 2,000 answers a month, email handoff, conversations inbox' },
      { id: 'starter-yearly', name: 'Starter (yearly)', price: 490, interval: 'year', includes: 'Same as Starter, 2 months free' },
      { id: 'growth-monthly', name: 'Growth', price: 129, interval: 'month', includes: '3 bots, up to 1,000 pages per bot, 10,000 answers a month, no Helpdeck footer, weekly docs-gaps email' },
      { id: 'growth-yearly', name: 'Growth (yearly)', price: 1290, interval: 'year', includes: 'Same as Growth, 2 months free' },
    ],
    lines: [
      { name: 'Answers (Claude Haiku)', vendor: 'Anthropic', kind: 'perUnit', amount: 0.0007, note: 'About 5,000 input tokens (6 chunks + chat history + system prompt) at $0.10 per million plus 300 output tokens at $0.50 per million = $0.00065, rounded up. Question embeddings add about $0.000001. Checked Oct 2026.', url: 'https://platform.claude.com/docs/en/about-claude/pricing' },
      { name: 'Crawling', vendor: 'Firecrawl', kind: 'fixed', amount: 16, steps: [{ fromCustomers: 0, amount: 0 }, { fromCustomers: 1, amount: 16 }, { fromCustomers: 8, amount: 83 }, { fromCustomers: 250, amount: 333 }, { fromCustomers: 1250, amount: 599 }], freeTier: 'Small one-time free credit allowance (500 credits [verify]) for building and testing.', note: 'Budget 400 crawled pages per Starter customer per month (200 pages crawled twice; unchanged pages still cost a credit). Fair-use caps are 1,000 a month on Starter and 6,000 on Growth, enforced in hd-crawl. Hobby ($16/month yearly, 3,000 to 5,000 credits [verify]) covers about 7 customers, Standard ($83, 100,000 credits) about 250, Growth ($333, 500,000) about 1,250, Scale ($599, 1,000,000 [verify]) beyond. Checked Oct 2026.', url: 'https://www.firecrawl.dev/pricing' },
      { name: 'Embeddings', vendor: 'Voyage AI', kind: 'perCustomer', amount: 0.04, freeTier: 'First 200 million tokens free, which covers roughly 300 customers for a year.', note: '400 pages x about 1,500 tokens = 600,000 tokens a month at $0.06 per million (voyage-3.5) = $0.036. Only changed pages are re-embedded, so real cost is usually lower. Checked Oct 2026.', url: 'https://docs.voyageai.com/docs/pricing' },
      { name: 'Supabase', vendor: 'Supabase', kind: 'fixed', amount: 25, steps: [{ fromCustomers: 0, amount: 0 }, { fromCustomers: 1, amount: 25 }, { fromCustomers: 100, amount: 30 }, { fromCustomers: 400, amount: 75 }, { fromCustomers: 1200, amount: 135 }], freeTier: 'Free plan for building.', note: 'Pro $25/month with $10 compute credit. Exact per-bot vector search needs no HNSW index, but chunks and messages still grow: Small ($15) at about 100 customers, Medium ($60) at about 400, Large ($110) at about 1,200. Each customer stores about 1,500 chunks (about 8 MB with embeddings). Checked Oct 2026.', url: 'https://supabase.com/pricing' },
      { name: 'Vercel Pro', vendor: 'Vercel', kind: 'fixed', amount: 20, steps: [{ fromCustomers: 0, amount: 0 }, { fromCustomers: 1, amount: 20 }], freeTier: 'Hobby is non-commercial only.', note: '$20 per member per month. The widget iframe is light (under 40 KB) and the loader is cached, so bandwidth stays inside Pro limits for a long time. Checked Oct 2026.', url: 'https://vercel.com/pricing' },
      { name: 'Handoff and account email', vendor: 'Resend', kind: 'fixed', amount: 0, steps: [{ fromCustomers: 0, amount: 0 }, { fromCustomers: 100, amount: 20 }, { fromCustomers: 1500, amount: 90 }], freeTier: '3,000 emails a month, 100 a day.', note: 'Handoff transcripts, crawl and usage alerts, weekly digests, welcome and trial emails: about 25 per customer a month. Pro is $20/month for 50,000; the 100,000 tier is about $90 [verify]. Checked Oct 2026.', url: 'https://resend.com/pricing' },
      { name: 'Product analytics', vendor: 'PostHog', kind: 'fixed', amount: 0, freeTier: '1 million events a month.', note: 'Answers are not analytics events (they are read from usage_ledger), so the free tier lasts well past 1,000 customers. Checked Oct 2026.', url: 'https://posthog.com/pricing' },
      { name: 'Domain', vendor: 'Porkbun', kind: 'fixed', amount: 1, note: 'A .com or .app domain is about $11 to $15 a year.', url: 'https://porkbun.com' },
    ],
    notes: [
      'A typical Starter customer (500 answers, 400 crawled pages) costs about $0.33 in Claude, $0.33 in Firecrawl and $0.04 in Voyage: $0.70 a month on a $49 plan.',
      'Starter at every cap (2,000 answers, 1,000 crawled pages all changed) costs about $1.30 in Claude, $0.83 in Firecrawl and $0.09 in Voyage, plus about $2.06 in Stripe fees: about 91% gross margin.',
      'Growth at every cap (10,000 answers, 6,000 crawled pages all changed) costs about $6.50 in Claude, $5.00 in Firecrawl and $0.54 in Voyage, plus about $4.94 in Stripe fees on $129: about 87% margin.',
      'Firecrawl per-page cost above uses the Standard plan rate ($0.00083 per credit). On Hobby with few customers the fixed plan price dominates instead.',
      'A 7 day trial is capped at 500 answers and 400 crawled pages, so a trial that never converts costs under $0.70.',
      'The free landing demo (15 pages per site, capped at 50 demos a day, 10 questions each) can use up to 750 Firecrawl credits a day. Lower DEMO_DAILY_CAP if crawl costs climb.',
      'Answer limits are hard caps via try_consume() in the database: past the cap the bot switches to "email us" mode, so Claude cost can never run away.',
      'Fixed costs (Supabase, Vercel, Firecrawl Hobby, domain) are about $62 a month: covered by the second paying customer.',
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
