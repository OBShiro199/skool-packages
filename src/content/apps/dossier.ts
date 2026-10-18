// Dossier: security questionnaires and RFPs answered from your own documents, with sources.
import type { AppDef } from '../types'
import { buildPrd1 } from './dossier/buildPrd1'
import { buildPrd2 } from './dossier/buildPrd2'
import { designPrd } from './dossier/designPrd'
import { landingPrd } from './dossier/landingPrd'
import { sql } from './dossier/sql'
import { edgeFunctions } from './dossier/edgeFunctions'
import { frontendTasks } from './dossier/frontendTasks'
import { backendTasks } from './dossier/backendTasks'
import { securityTasks } from './dossier/securityTasks'
import { outbound, inbound, paid } from './dossier/marketing'
import { launchTasks, repoTree, starterFiles } from './dossier/launch'

export const dossier: AppDef = {
  slug: 'dossier',
  name: 'Dossier',
  tagline: 'Security questionnaires answered with sources',
  oneLiner: 'Upload a buyer\'s security questionnaire or RFP and get every answer drafted from your own policies, with the source paragraph, a confidence score, a team review flow and the original file exported back filled in.',
  category: 'ai-agents',
  art: { motif: 'chat', tone: 'ink' },
  price: { monthly: 249, trialDays: 7 },
  difficulty: 3,
  buildHours: 45,
  apis: [
    {
      name: 'Claude API (Anthropic)',
      job: 'drafts every answer with citations, a confidence score and flags from retrieved passages, and detects questionnaire structure, using claude-sonnet-5-5 with structured JSON output',
      signupUrl: 'https://console.anthropic.com',
      docsUrl: 'https://docs.claude.com/en/api/overview',
      pricing: 'Checked Oct 2026: claude-sonnet-5-5 is $2 per million input tokens, $10 per million output tokens, $0.20 per million cached input tokens, Batch API half price (third-party listings; one source shows $3/$15 [verify on anthropic.com/pricing]). One drafted question costs about $0.0125 batched 8 per call. Prepaid credit; set a monthly spend limit in Settings > Limits. Commercial API data is not used for training by default.',
      envVars: [
        { name: 'ANTHROPIC_API_KEY', where: 'console.anthropic.com > Settings > API Keys > Create Key (sk-ant-...)', pasteInto: 'Supabase secrets', secret: true },
      ],
    },
    {
      name: 'Voyage AI',
      job: 'embeds source passages, library answers and questions (voyage-4, 1024 dimensions) and reranks the top 40 search hits (rerank-2.5) so the right paragraph is cited',
      signupUrl: 'https://dash.voyageai.com',
      docsUrl: 'https://docs.voyageai.com',
      pricing: 'Checked Oct 2026 (third-party listings [verify on docs.voyageai.com/docs/pricing]): voyage-4 $0.06 per million tokens, rerank-2.5 $0.05 per million tokens, first 200 million tokens free. About $0.0009 per drafted question. Opt out of training in the organisation settings [verify menu].',
      envVars: [
        { name: 'VOYAGE_API_KEY', where: 'Voyage dashboard > API Keys > Create new secret key', pasteInto: 'Supabase secrets', secret: true },
      ],
    },
    {
      name: 'LlamaParse (LlamaIndex)',
      job: 'reads scanned PDF pages (no text layer) in policies and questionnaires into text; text-layer PDFs are read free with unpdf',
      signupUrl: 'https://cloud.llamaindex.ai',
      docsUrl: 'https://developers.llamaindex.ai/python/cloud/llamaparse/api-v2-guide',
      pricing: 'Checked Oct 2026: $1.25 per 1,000 credits (North America and Europe), cost-effective tier 3 credits a page = $0.00375 a page. Free credits on signup (10,000 per the announcement [verify]). Training off by default; send do_not_cache to skip the 48 hour cache [verify parameter name in v2].',
      envVars: [
        { name: 'LLAMA_CLOUD_API_KEY', where: 'cloud.llamaindex.ai > API Keys > Generate New Key (llx-...)', pasteInto: 'Vercel env', secret: true },
      ],
    },
  ],
  idealFor: 'People who want a premium B2B SaaS sold to buyers with budget: founders who can reach B2B SaaS companies, sales engineers and security leads, and who are happy to build something with real depth (search, file round-trips, team review).',
  whyItSells: 'A 250-question security questionnaire takes 10 to 20 hours of senior time, and a SaaS selling upmarket gets several a month. At $599 a month, Dossier costs less than one day of a sales engineer, and Loopio-style tools cost $10,000 to $25,000 a year [verify].',
  features: [
    'Upload policies, a SOC 2 summary, past questionnaires and product docs; they are chunked and searchable by meaning and exact words',
    'Upload a questionnaire as XLSX, DOCX or PDF, or paste it; check the guessed question and answer columns per sheet',
    'Every answer drafted with citations to document, page and exact quote, plus a confidence score and flags',
    'Answer library with exact and meaning-based reuse, an owner and a review date on every answer, stale answers flagged',
    'Assign questions or sections with due dates, comment with @mentions, approve, two-step approval on Business',
    'Export back into the original XLSX or DOCX (answer cells only), filled PDF forms, or clean answers files',
    'Workspaces with roles, strict tenant isolation, an append-only audit log',
    'Your data is never used to train AI models, stated in the app with every subprocessor listed',
  ],
  status: 'full',
  costs: {
    usage: { label: 'Questions answered per workspace per month', unit: 'questions', default: 600, min: 50, max: 10000, step: 50 },
    plans: [
      { id: 'team-monthly', usageCap: 1000, name: 'Team', price: 249, interval: 'month', includes: '1,000 questions a month, 5 seats, 300 source documents, 3,000 parsed pages, 2 GB, unlimited library, all exports, 90 day audit log' },
      { id: 'team-yearly', usageCap: 1000, name: 'Team (yearly)', price: 2490, interval: 'year', includes: 'Same as Team, 2 months free' },
      { id: 'business-monthly', usageCap: 4000, name: 'Business', price: 599, interval: 'month', includes: '4,000 questions a month, 15 seats, 1,500 documents, 10,000 parsed pages, 10 GB, auto-assign by section, two-step approval, 1 year audit log with CSV export' },
      { id: 'business-yearly', usageCap: 4000, name: 'Business (yearly)', price: 5990, interval: 'year', includes: 'Same as Business, 2 months free' },
      { id: 'scale-monthly', usageCap: 10000, name: 'Scale', price: 1299, interval: 'month', includes: '10,000 questions a month, 40 seats, 5,000 documents, 30,000 parsed pages, 50 GB, everything in Business, 3 year audit log' },
      { id: 'scale-yearly', usageCap: 10000, name: 'Scale (yearly)', price: 12990, interval: 'year', includes: 'Same as Scale, 2 months free' },
    ],
    lines: [
      { name: 'Claude: drafting answers', vendor: 'Anthropic', kind: 'perUnit', amount: 0.0125, note: 'claude-sonnet-5-5 at $2/$10 per MTok, 8 questions per call. Per question: 3,200 input tokens (question, 6 passages, up to 3 library answers) = $0.0064, 500 output tokens (answer, citations, confidence, thinking) = $0.005, cached system prompt share $0.00005, structure detection spread over the file $0.001. Library exact matches cost $0 but still count. At $3/$15 it would be about $0.018. Checked Oct 2026 [verify].', url: 'https://www.anthropic.com/pricing' },
      { name: 'Voyage: query embedding and rerank', vendor: 'Voyage AI', kind: 'perUnit', amount: 0.0009, freeTier: 'First 200 million tokens free [verify].', note: 'Rerank 40 candidates x 400 tokens = 16,000 tokens at $0.05/MTok = $0.0008, query embedding 60 tokens at $0.06/MTok, rounded up. Checked Oct 2026 [verify].', url: 'https://docs.voyageai.com/docs/pricing' },
      { name: 'Source parsing and embedding', vendor: 'LlamaParse + Voyage', kind: 'perCustomer', amount: 1, freeTier: 'LlamaParse signup credits; Voyage free tokens.', note: 'Typical workspace adds about 500 pages a month: embedding 600 tokens a page ($0.02) plus LlamaParse for the scanned share at $0.00375 a page. $1 covers a normal month. Worst case at the Scale cap (30,000 pages, 20% scanned) is about $23.60, included in the margin notes.', url: 'https://developers.llamaindex.ai/llamaparse/general/pricing/' },
      { name: 'Supabase', vendor: 'Supabase', kind: 'fixed', amount: 25, steps: [{ fromCustomers: 0, amount: 0 }, { fromCustomers: 1, amount: 25 }, { fromCustomers: 150, amount: 40 }, { fromCustomers: 400, amount: 85 }, { fromCustomers: 800, amount: 135 }], freeTier: 'Free plan for building (pauses after a week idle). Upgrade before the first paying customer.', note: 'Pro $25/month with $10 compute credit, 8 GB disk and 100 GB storage. The HNSW index must fit in RAM: about 3,000 to 5,000 chunks per workspace at 2 KB each. Small compute (+$15) from about 150 workspaces, Medium (+$60) from about 400, Large (+$110) from about 800 [verify compute prices]. Storage past 100 GB is about $0.021 per GB.', url: 'https://supabase.com/pricing' },
      { name: 'Vercel Pro', vendor: 'Vercel', kind: 'fixed', amount: 20, steps: [{ fromCustomers: 0, amount: 0 }, { fromCustomers: 1, amount: 20 }], freeTier: 'Hobby is free for non-commercial use only.', note: '$20 per member per month with usage credit. Needed for commercial use and for up to 800 s function duration on the file runner. Checked Oct 2026.', url: 'https://vercel.com/pricing' },
      { name: 'Transactional email', vendor: 'Resend', kind: 'fixed', amount: 0, steps: [{ fromCustomers: 0, amount: 0 }, { fromCustomers: 20, amount: 20 }, { fromCustomers: 300, amount: 90 }], freeTier: '3,000 emails a month, 100 a day.', note: 'About 150 emails per workspace a month (assignments, mentions, due reminders, drafts ready, exports, review dates). Pro $20 for 50,000 from about 20 workspaces; the 100,000 tier (listed at $35 or $90, sources conflict [verify]) from about 300. Checked Oct 2026.', url: 'https://resend.com/pricing' },
      { name: 'Product analytics', vendor: 'PostHog', kind: 'fixed', amount: 0, freeTier: '1 million events a month.', note: 'No question or answer text is sent. The free tier covers well past 1,000 workspaces at this event volume.', url: 'https://posthog.com/pricing' },
      { name: 'Domain', vendor: 'Porkbun', kind: 'fixed', amount: 1, note: 'dossier.app style domain about $12 to $15 a year, shown as $1 a month [verify the .app price].', url: 'https://porkbun.com' },
    ],
    notes: [
      'Cost per question answered: $0.0125 Claude + $0.0009 Voyage = $0.0134, rounded to $0.014 in the cap maths below. Every draft and redraft counts against the cap, so redrafts are paid for.',
      'Team at its cap (1,000 questions): $14.00 AI + $2.36 parsing worst case + $9.26 Stripe fees = $25.62 on $249: about 89.7% gross margin.',
      'Business at its cap (4,000 questions): $56.00 AI + $7.86 parsing + $21.86 Stripe = $85.72 on $599: about 85.7% gross margin.',
      'Scale at its cap (10,000 questions): $140.00 AI + $23.60 parsing + $47.06 Stripe = $210.66 on $1,299: about 83.8% gross margin.',
      'If Claude Sonnet is $3/$15 rather than $2/$10, a question costs about $0.019 and Scale at its cap is still about 80%.',
      'Yearly plans are ten times the monthly price with the same monthly caps, so margin per month is about the same.',
      'A 7 day trial is capped at 150 questions and 300 pages, so a trial that never converts costs about $2.50 at most.',
      'Caps are enforced server-side: reserve_questions() takes questions off the allowance under a row lock before any AI call.',
      'Fixed costs (Supabase, Vercel, domain) are about $46 a month: covered by the first paying customer.',
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
