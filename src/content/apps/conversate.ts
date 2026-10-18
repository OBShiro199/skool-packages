// Conversate: AI help desk (a Ferndesk-style help centre + AI agent + shared inbox).
import type { AppDef } from '../types'
import { buildPrd1 } from './conversate/buildPrd1'
import { buildPrd2 } from './conversate/buildPrd2'
import { buildPrd3 } from './conversate/buildPrd3'
import { designPrd } from './conversate/designPrd'
import { landingPrd } from './conversate/landingPrd'
import { sql1 } from './conversate/sql1'
import { sql2 } from './conversate/sql2'
import { edgeFunctions } from './conversate/edgeFunctions'
import { frontendTasks } from './conversate/frontendTasks'
import { backendTasks } from './conversate/backendTasks'
import { securityTasks } from './conversate/securityTasks'
import { outbound, inbound, paid } from './conversate/marketing'
import { launchTasks, repoTree, starterFiles } from './conversate/extras'

export const conversate: AppDef = {
  slug: 'conversate',
  name: 'Conversate',
  tagline: 'Your website, turned into support',
  oneLiner: 'An AI help desk that drafts a help centre from a company\'s website, answers visitors with sources and a confidence score, and hands the rest to a shared inbox.',
  category: 'ai-agents',
  art: { motif: 'chat', tone: 'blue' },
  price: { monthly: 49, trialDays: 7 },
  difficulty: 3,
  buildHours: 38,
  apis: [
    {
      name: 'Firecrawl',
      job: 'crawls the customer\'s website (v2 crawl API) and returns every page as clean markdown, then calls back with a signed webhook',
      signupUrl: 'https://www.firecrawl.dev/signin',
      docsUrl: 'https://docs.firecrawl.dev/features/crawl',
      pricing: 'Checked Oct 2026 (third-party summaries, confirm on firecrawl.dev/pricing): free allowance for testing (500 one-time or 1,000 a month, sources differ) [verify]. 1 credit per page for markdown scraping. Hobby about $16/month billed yearly for 3,000 credits [verify], Standard about $83/month yearly for 100,000, Growth about $333/month for 500,000, Scale about $599/month for 1,000,000. Credits do not roll over.',
      envVars: [
        { name: 'FIRECRAWL_API_KEY', where: 'firecrawl.dev > Dashboard > API Keys (starts with fc-)', pasteInto: 'Supabase secrets', secret: true },
        { name: 'FIRECRAWL_WEBHOOK_SECRET', where: 'firecrawl.dev > Settings > Webhook secret [verify exact location]', pasteInto: 'Supabase secrets', secret: true },
        { name: 'FIRECRAWL_API_KEY', where: 'Same key, for the onboarding scrape, demo and grader routes', pasteInto: 'Vercel env', secret: true },
      ],
    },
    {
      name: 'Voyage AI',
      job: 'turns page chunks and visitor questions into 1,024-number embeddings with voyage-3.5 so pgvector finds the closest help text',
      signupUrl: 'https://dashboard.voyageai.com',
      docsUrl: 'https://docs.voyageai.com/reference/embeddings-api',
      pricing: 'Checked Oct 2026 on docs.voyageai.com/docs/pricing: voyage-3.5 is $0.06 per million tokens and the first 200 million tokens are free per account (voyage-3.5-lite $0.02). Add a card to lift the low default rate limits. A whole 300-page site is about 450,000 tokens, about 3 cents.',
      envVars: [
        { name: 'VOYAGE_API_KEY', where: 'dashboard.voyageai.com > API Keys > Create new secret key (starts with pa-)', pasteInto: 'Supabase secrets', secret: true },
      ],
    },
    {
      name: 'Claude API',
      job: 'answers visitors from the matching chunks with claude-haiku-5-5 (structured JSON with sources and confidence), drafts suggested replies, and plans and writes help articles with claude-sonnet-5-5',
      signupUrl: 'https://platform.claude.com',
      docsUrl: 'https://platform.claude.com/docs',
      pricing: 'Checked Oct 2026: pay as you go. claude-haiku-5-5 is $0.10 per million input tokens and $0.50 per million output tokens (about $0.0007 per visitor answer). claude-sonnet-5-5 is $2 per million input and $10 per million output (about $0.021 per drafted article). Buy $10 of credit and set a monthly spend limit.',
      envVars: [
        { name: 'ANTHROPIC_API_KEY', where: 'platform.claude.com > Settings > API keys > Create key (starts with sk-ant-)', pasteInto: 'Supabase secrets', secret: true },
        { name: 'ANTHROPIC_API_KEY', where: 'Same key, for the onboarding question suggester route', pasteInto: 'Vercel env', secret: true },
      ],
    },
  ],
  idealFor: 'Builders who want a serious AI product with obvious value and a big market: bootstrapped SaaS founders, Shopify stores and web agencies who answer the same questions every day and have no proper help centre.',
  whyItSells: 'Intercom\'s AI agent costs about $0.99 per resolution on top of seats, so 1,000 AI resolutions is roughly $1,000 a month. Conversate includes 1,500 AI answers for $49 a month and drafts the help centre for you, while each answer costs you about $0.0007.',
  features: [
    'Paste a URL: Firecrawl and Claude draft a categorised, searchable help centre at /your-company/help in about 5 minutes',
    'One-line script tag widget for HTML, Webflow, WordPress, Shopify, Framer and Next.js, with allowed-domain checks',
    'AI answers with source links and a confidence score, and "Talk to a human" when it is not sure',
    'Shared inbox with assign, open/pending/snoozed/closed, notes, flags, tags and canned replies',
    'Agent replies stream to the widget live over Supabase Realtime, with email fallback and inbound email replies',
    'AI suggested replies for agents, built from your knowledge and canned replies',
    'Content gaps report that turns unanswered questions into one-click draft articles',
    'Analytics: volume, AI resolution rate, first response time and CSAT, plus team roles (owner, admin, agent)',
  ],
  status: 'full',
  costs: {
    usage: { label: 'AI answers per customer per month', unit: 'answers', default: 1500, min: 100, max: 15000, step: 100 },
    plans: [
      { id: 'starter-monthly', name: 'Starter', price: 49, interval: 'month', includes: '1,500 AI answers, 300 pages learned, 3 seats, 500 suggested replies, 40 AI-drafted articles a month, help centre, widget, inbox' },
      { id: 'starter-yearly', name: 'Starter (yearly)', price: 490, interval: 'year', includes: 'Same as Starter, 2 months free' },
      { id: 'growth-monthly', name: 'Growth', price: 129, interval: 'month', includes: '5,000 AI answers, 1,500 pages, 10 seats, 2,000 suggested replies, 150 drafts a month, no Conversate branding' },
      { id: 'growth-yearly', name: 'Growth (yearly)', price: 1290, interval: 'year', includes: 'Same as Growth, 2 months free' },
      { id: 'scale-monthly', name: 'Scale', price: 299, interval: 'month', includes: '15,000 AI answers, 5,000 pages, 25 seats, 6,000 suggested replies, 500 drafts a month, no branding' },
      { id: 'scale-yearly', name: 'Scale (yearly)', price: 2990, interval: 'year', includes: 'Same as Scale, 2 months free' },
    ],
    lines: [
      { name: 'Visitor answers (Claude Haiku 5.5)', vendor: 'Anthropic', kind: 'perUnit', amount: 0.0007, note: 'About 5,000 input tokens (system prompt, 6 chunks, 6 history turns) x $0.10 per million = $0.0005, plus about 350 output tokens x $0.50 per million = $0.000175, plus the query embedding (about 40 tokens on Voyage, negligible). $0.000675, rounded up. Checked Oct 2026.', url: 'https://platform.claude.com/docs/en/about-claude/pricing' },
      { name: 'Article drafting (Claude Sonnet 5.5)', vendor: 'Anthropic', kind: 'perCustomer', amount: 0.6, note: 'About 6,000 input + 900 output tokens per article at $2 / $10 per million = $0.021. Average customer drafts about 25 articles a month after onboarding (Starter cap 40 = $0.84 max), plus one planner call. Growth at its 150 cap is $3.15, Scale at 500 is $10.50. Checked Oct 2026.', url: 'https://platform.claude.com/docs/en/about-claude/pricing' },
      { name: 'Suggested replies (Claude Haiku 5.5)', vendor: 'Anthropic', kind: 'perCustomer', amount: 0.3, note: 'About 7,000 input + 400 output tokens = $0.0009 per suggestion. Average 300 a month. Starter cap 500 = $0.45, Growth cap 2,000 = $1.80, Scale cap 6,000 = $5.40.', url: 'https://platform.claude.com/docs/en/about-claude/pricing' },
      { name: 'Embeddings', vendor: 'Voyage AI', kind: 'perCustomer', amount: 0.06, freeTier: 'First 200 million tokens free per account, enough for about 200 customers for a year.', note: 'Budget 600 crawled pages a month (Starter cap) x about 1,500 tokens = 900,000 tokens at $0.06 per million = $0.054, plus published articles and query embeddings. Unchanged pages are skipped, so real use is lower. Checked Oct 2026.', url: 'https://docs.voyageai.com/docs/pricing' },
      { name: 'Crawling', vendor: 'Firecrawl', kind: 'fixed', amount: 16, steps: [{ fromCustomers: 0, amount: 0 }, { fromCustomers: 1, amount: 16 }, { fromCustomers: 5, amount: 83 }, { fromCustomers: 160, amount: 333 }, { fromCustomers: 800, amount: 599 }], freeTier: 'Small free allowance for building (500 to 1,000 credits, sources differ) [verify].', note: 'Budget 600 credits per customer per month (Starter crawl cap; Growth customers can use up to 3,000, Scale 10,000). Hobby ($16/mo yearly, 3,000 credits [verify]) covers about 5 customers, Standard ($83, 100,000) about 160, Growth ($333, 500,000) about 800, Scale ($599, 1,000,000) about 1,600. Effective rate on Standard is $0.00083 per page. Checked Oct 2026 via third-party summaries.', url: 'https://www.firecrawl.dev/pricing' },
      { name: 'Supabase (database, vectors, realtime, storage)', vendor: 'Supabase', kind: 'fixed', amount: 25, steps: [{ fromCustomers: 0, amount: 0 }, { fromCustomers: 1, amount: 25 }, { fromCustomers: 100, amount: 30 }, { fromCustomers: 300, amount: 75 }, { fromCustomers: 800, amount: 135 }, { fromCustomers: 1200, amount: 245 }], freeTier: 'Free plan for building (pauses after a week idle).', note: 'Pro $25/month with $10 compute credit, 8 GB disk, 100 GB storage, 250 GB egress, 5 million Realtime messages and 500 peak connections. Vector search needs RAM: Small (+$5 net) at about 100 customers, Medium (+$50 net) at about 300, Large at about 800, XL at about 1,200 (1,500 chunks per customer, about 7 GB at 1,000 customers with the HNSW index). Extra Realtime peak connections are $10 per 1,000. Checked Oct 2026.', url: 'https://supabase.com/pricing' },
      { name: 'Vercel Pro', vendor: 'Vercel', kind: 'fixed', amount: 20, steps: [{ fromCustomers: 0, amount: 0 }, { fromCustomers: 1, amount: 20 }, { fromCustomers: 800, amount: 70 }], freeTier: 'Hobby is non-commercial only.', note: '$20 per member per month. The /embed widget bundle is about 60 KB, so 1,000 customers x 20,000 widget opens is about 1.2 TB a month; budget about $50 of extra data transfer past the included amount [verify current included transfer]. Checked Oct 2026.', url: 'https://vercel.com/pricing' },
      { name: 'Alerts, email replies and inbound', vendor: 'Resend', kind: 'fixed', amount: 0, steps: [{ fromCustomers: 0, amount: 0 }, { fromCustomers: 15, amount: 20 }, { fromCustomers: 250, amount: 90 }, { fromCustomers: 500, amount: 160 }], freeTier: '3,000 emails a month, 100 a day.', note: 'Budget 200 emails per customer per month (alerts throttled to a digest, agent replies to visitors who left, welcome and trial emails). Pro $20 for 50,000 covers about 250 customers, Scale from about $90 for 100,000 about 500; the 200,000 tier price is an estimate [verify]. Checked Oct 2026 via third-party summaries.', url: 'https://resend.com/pricing' },
      { name: 'Domain', vendor: 'Porkbun', kind: 'fixed', amount: 1, note: 'A .com or .app domain is about $11 to $15 a year. The mail. and in. subdomains are free.', url: 'https://porkbun.com' },
    ],
    notes: [
      'Starter at its 1,500-answer cap: Claude answers $1.05, drafts $0.84, suggestions $0.45, Voyage $0.06, Firecrawl 600 pages x $0.00083 = $0.50, email about $0.08. About $3 of variable cost plus about $2.06 in Stripe fees on $49: roughly 90% gross margin.',
      'Growth at its 5,000-answer cap: answers $3.50, drafts $3.15, suggestions $1.80, Firecrawl 3,000 pages $2.49, Voyage $0.27, email $0.20. About $11.40 plus $4.94 Stripe fees on $129: roughly 87% gross margin.',
      'Scale at its 15,000-answer cap: answers $10.50, drafts $10.50, suggestions $5.40, Firecrawl 10,000 pages $8.30, Voyage $0.90, email $0.50. About $36 plus $11 Stripe fees on $299: roughly 84% gross margin. Every plan stays above 75% even when a customer uses every cap.',
      'Caps are hard and server-side: past the answer cap the widget switches to the email form, so Claude cost per customer can never exceed about $10.50 a month.',
      'Trials are capped at 300 answers and 150 pages, so a trial costs at most about $0.40 in AI and crawling.',
      'The landing page demo (10 pages, 3 drafts, capped at 60 a day) costs about $0.07 each, up to about $4 a day.',
      'Stripe subscription fees are added by the calculator, not listed here.',
    ],
  },
  content: {
    buildPrd: buildPrd1 + buildPrd2 + buildPrd3,
    designPrd,
    landingPrd,
    sql: sql1 + sql2,
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
