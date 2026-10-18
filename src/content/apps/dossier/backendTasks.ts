// Dossier app-specific backend tasks: one account-setup task per service, plus the end-to-end test.
import type { Task } from '../../types'

export const backendTasks: Task[] = [
  {
    id: 'dsr-be-anthropic',
    title: 'Set up the Claude API for drafting answers',
    outcome: 'Dossier can call claude-sonnet-5-5 with structured JSON output, with a spend limit you control and no training on your data.',
    minutes: 20,
    xp: 35,
    blocks: [
      { type: 'callout', tone: 'eli5', title: 'Structured output in one sentence', text: 'You hand Claude a form (a JSON schema) and it fills in every box in exactly that shape: the answer, the citations, the confidence. So the code never has to dig the confidence out of a paragraph. It is always in the same field.' },
      { type: 'steps', items: [
        'Go to console.anthropic.com and sign up (this is separate from a Claude Pro login).',
        'Settings > Billing: add a card and buy $10 of credit. That drafts about 700 questions at the prices below.',
        'Settings > Limits: set a monthly spend limit (start with $50) so a bug cannot run up a bill.',
        'Settings > API Keys > Create Key. Name it "dossier-dev". Copy it now: it starts with sk-ant- and is shown once.',
        'Add it to Supabase secrets (Supabase > Edge Functions > Secrets > Add new secret) as ANTHROPIC_API_KEY. Later make a separate "dossier-prod" key.',
        'Write down today\'s date next to "Anthropic: commercial API, no training by default" for Settings > Data. If a large customer asks for zero data retention, that is arranged with Anthropic sales [verify eligibility].',
      ] },
      { type: 'keys', rows: [
        { name: 'ANTHROPIC_API_KEY', where: 'console.anthropic.com > Settings > API Keys > Create Key (sk-ant-...)', pasteInto: 'Supabase secrets', secret: true },
      ] },
      { type: 'code', id: 'dsr-be-anthropic-curl', filename: 'test-claude.sh', lang: 'bash', code: `curl -s https://api.anthropic.com/v1/messages \\
  -H "x-api-key: $ANTHROPIC_API_KEY" \\
  -H "anthropic-version: 2023-06-01" \\
  -H "content-type: application/json" \\
  -d '{
    "model": "claude-sonnet-5-5",
    "max_tokens": 800,
    "output_config": {
      "effort": "low",
      "format": { "type": "json_schema", "schema": {
        "type": "object", "additionalProperties": false,
        "required": ["answer_short", "answer_text", "citations", "confidence"],
        "properties": {
          "answer_short": { "type": "string", "enum": ["Yes", "No", "Partial", "N/A"] },
          "answer_text": { "type": "string" },
          "citations": { "type": "array", "items": { "type": "string" } },
          "confidence": { "type": "integer" } } } }
    },
    "messages": [{ "role": "user", "content": "<passage id=\\"P1\\">All customer data is encrypted at rest with AES-256 using AWS KMS managed keys.</passage> <question>Is customer data encrypted at rest?</question> Answer only from the passage and cite it." }]
  }'` },
      { type: 'p', text: 'A good answer has `"stop_reason": "end_turn"` and a text block whose text is JSON like `{"answer_short":"Yes","answer_text":"Yes. All customer data is encrypted at rest with AES-256 using AWS KMS managed keys.","citations":["P1"],"confidence":95}`. The `usage` object shows the tokens: at $2 per million in and $10 per million out, this test costs well under a cent.' },
      { type: 'links', items: [
        { label: 'Anthropic Console', url: 'https://console.anthropic.com' },
        { label: 'Structured outputs docs', url: 'https://docs.claude.com/en/docs/build-with-claude/structured-outputs' },
        { label: 'API data retention', url: 'https://platform.claude.com/docs/en/manage-claude/api-and-data-retention' },
        { label: 'Pricing', url: 'https://www.anthropic.com/pricing' },
      ] },
      { type: 'mistakes', items: [
        { mistake: '404 "model not found".', fix: 'Check the exact model id on the Anthropic models page. The PRD uses claude-sonnet-5-5; if the console lists a dated id, put that one in _shared/claude.ts and in this test.' },
        { mistake: '400 credit balance too low.', fix: 'Add credit under Settings > Billing. New keys work as soon as credit is added.' },
        { mistake: 'The JSON is cut off.', fix: 'stop_reason is "max_tokens". The worker uses 6,000 for a batch of 8 questions and splits the batch when this happens.' },
      ] },
    ],
    checklist: [
      { id: 'dsr-be-anthropic-c1', label: 'Create an Anthropic Console account and add $10 credit' },
      { id: 'dsr-be-anthropic-c2', label: 'Set a monthly spend limit' },
      { id: 'dsr-be-anthropic-c3', label: 'Create the API key and add it to Supabase secrets' },
      { id: 'dsr-be-anthropic-c4', label: 'Run the structured output test', trigger: 'copy:dsr-be-anthropic-curl' },
    ],
  },
  {
    id: 'dsr-be-voyage',
    title: 'Set up Voyage AI for search embeddings and reranking',
    outcome: 'Dossier can turn passages and questions into embeddings, rerank the best matches, and you have switched off training on your data.',
    minutes: 20,
    xp: 35,
    blocks: [
      { type: 'callout', tone: 'eli5', title: 'Embeddings and reranking', text: 'An embedding is a list of 1,024 numbers that captures what a passage means. Passages about "encryption at rest" end up with similar numbers even if one says "data is stored encrypted". Search finds the 40 closest passages; the reranker then reads each one against the question and puts the best 6 on top.' },
      { type: 'table', head: ['', 'Voyage voyage-4 + rerank-2.5', 'Supabase gte-small (built in)'], rows: [
        ['Price', '$0.06 per MTok embed, $0.05 per MTok rerank, 200M free tokens [verify]', 'Free, runs inside edge functions'],
        ['Dimensions', '1024 (can drop to 512 later)', '384'],
        ['Languages', 'Many', 'English only'],
        ['Quality on long policy text', 'Strong, plus a reranker', 'Weaker, no reranker'],
        ['Decision', 'Use this', 'Skip: citations are the product'],
      ] },
      { type: 'steps', items: [
        'Go to dash.voyageai.com and sign up (Google or email) [verify the dashboard address; docs are at docs.voyageai.com].',
        'Open API Keys > Create new secret key. Name it "dossier". Copy it now: it is shown once.',
        'Add a payment method under Billing so you are not stuck on the free-tier rate limits (the free tokens still apply).',
        'Find the organisation setting for data use and opt out of your data being used for model training [verify the exact menu name]. Write down the date for Settings > Data.',
        'Add the key to Supabase secrets as VOYAGE_API_KEY.',
      ] },
      { type: 'keys', rows: [
        { name: 'VOYAGE_API_KEY', where: 'Voyage dashboard > API Keys > Create new secret key', pasteInto: 'Supabase secrets', secret: true },
      ] },
      { type: 'code', id: 'dsr-be-voyage-curl', filename: 'test-voyage.sh', lang: 'bash', code: `# 1. Embed two passages as documents.
curl -s https://api.voyageai.com/v1/embeddings \\
  -H "Authorization: Bearer $VOYAGE_API_KEY" \\
  -H "content-type: application/json" \\
  -d '{"model":"voyage-4","input_type":"document","output_dimension":1024,
       "input":["All customer data is encrypted at rest with AES-256.","Backups run nightly and are kept for 35 days."]}' \\
  | head -c 300; echo

# 2. Rerank them against a question.
curl -s https://api.voyageai.com/v1/rerank \\
  -H "Authorization: Bearer $VOYAGE_API_KEY" \\
  -H "content-type: application/json" \\
  -d '{"model":"rerank-2.5","query":"How long do you keep backups?","top_k":2,
       "documents":["All customer data is encrypted at rest with AES-256.","Backups run nightly and are kept for 35 days."]}'` },
      { type: 'p', text: 'Good answers: the first returns `"data": [{"embedding": [ ... 1024 numbers ... ], "index": 0}, ...]` and a `usage.total_tokens` count. The second returns `data` with the backups passage (`"index": 1`) first and a higher `relevance_score`. If the field names differ from these, follow the Voyage docs and tell Claude Code.' },
      { type: 'links', items: [
        { label: 'Voyage docs', url: 'https://docs.voyageai.com' },
        { label: 'Voyage pricing', url: 'https://docs.voyageai.com/docs/pricing' },
        { label: 'Voyage model training data settings', url: 'https://www.mongodb.com/docs/voyageai/management/model-training-data/' },
      ] },
      { type: 'mistakes', items: [
        { mistake: '429 Too Many Requests during the first big upload.', fix: 'Free accounts have low rate limits. Add a payment method, and keep the worker at 128 texts per call with backoff on 429.' },
        { mistake: 'Postgres says "expected 1024 dimensions, not 2048".', fix: 'output_dimension was left out or set differently. Every embedding call, document and query, must send output_dimension 1024.' },
        { mistake: 'Search results are poor even though passages exist.', fix: 'Questions were embedded with input_type "document". Questions use "query", stored passages use "document".' },
      ] },
    ],
    checklist: [
      { id: 'dsr-be-voyage-c1', label: 'Create a Voyage account and a secret key' },
      { id: 'dsr-be-voyage-c2', label: 'Opt out of training and note the date' },
      { id: 'dsr-be-voyage-c3', label: 'Add VOYAGE_API_KEY to Supabase secrets' },
      { id: 'dsr-be-voyage-c4', label: 'Run the embed and rerank test', trigger: 'copy:dsr-be-voyage-curl' },
    ],
  },
  {
    id: 'dsr-be-llamaparse',
    title: 'Set up LlamaParse for scanned PDFs',
    outcome: 'Scanned pages in policies and questionnaires are read into text, with caching off, and only when the PDF has no text layer.',
    minutes: 20,
    xp: 30,
    blocks: [
      { type: 'callout', tone: 'tip', title: 'Most PDFs never touch this', text: 'A PDF exported from Word or Google Docs already contains its text, and unpdf reads it for free. LlamaParse is only for scanned pages (a signed policy scanned to PDF, a SOC 2 report saved as images). That keeps it cheap: $1.25 per 1,000 credits, 3 credits a page on the cost-effective tier, so a 40 page scan is $0.15 (checked Oct 2026).' },
      { type: 'steps', items: [
        'Go to cloud.llamaindex.ai and sign up. New accounts get free credits (the announcement says 10,000 [verify]).',
        'Left sidebar: API Keys > Generate New Key. Name it "dossier". Copy it (starts with llx-).',
        'Paste it into .env.local and Vercel env as LLAMA_CLOUD_API_KEY. It is used by /api/jobs/run on Vercel, not by Supabase.',
        'Check the organisation settings: data sharing for training is off by default. Leave it off. Dossier also sends do_not_cache so files are not kept in the 48 hour cache [verify the parameter name in the v2 docs].',
      ] },
      { type: 'keys', rows: [
        { name: 'LLAMA_CLOUD_API_KEY', where: 'cloud.llamaindex.ai > API Keys > Generate New Key (llx-...)', pasteInto: 'Vercel env', secret: true },
      ] },
      { type: 'code', id: 'dsr-be-llamaparse-curl', filename: 'test-llamaparse.sh', lang: 'bash', code: `# Upload a small scanned PDF (any phone scan of a printed page works).
curl -s -X POST https://api.cloud.llamaindex.ai/api/v2/parse/upload \\
  -H "Authorization: Bearer $LLAMA_CLOUD_API_KEY" \\
  -F "file=@scan.pdf" \\
  -F 'configuration={"tier":"cost_effective","version":"latest"}'
# Copy the job id from the answer, wait 20 seconds, then:
curl -s "https://api.cloud.llamaindex.ai/api/v2/parse/JOB_ID?expand=markdown" \\
  -H "Authorization: Bearer $LLAMA_CLOUD_API_KEY" | head -c 800
# Good: "status": "COMPLETED" and markdown text of your page. [verify field names against the v2 guide]` },
      { type: 'links', items: [
        { label: 'LlamaParse API v2 guide', url: 'https://developers.llamaindex.ai/python/cloud/llamaparse/api-v2-guide' },
        { label: 'LlamaParse pricing', url: 'https://developers.llamaindex.ai/llamaparse/general/pricing/' },
        { label: 'Data privacy and retention', url: 'https://developers.llamaindex.ai/llamaparse/general/enterprise-readiness/data-privacy-security/' },
      ] },
      { type: 'mistakes', items: [
        { mistake: '401 Unauthorized.', fix: 'The header must be Authorization: Bearer llx-... Copy the key again; keys are per organisation and project.' },
        { mistake: 'Status stays PENDING for minutes.', fix: 'Large scans queue. The runner re-checks every 20 seconds and gives up after 15 minutes with "This scan is taking too long. Try a smaller file."' },
        { mistake: 'The tier value is rejected.', fix: 'Tier names change between API versions. Open the v2 guide, copy the current name for the cost-effective tier, and update lib/llamaparse.ts.' },
      ] },
    ],
    checklist: [
      { id: 'dsr-be-llamaparse-c1', label: 'Create a LlamaCloud account and API key' },
      { id: 'dsr-be-llamaparse-c2', label: 'Add LLAMA_CLOUD_API_KEY to .env.local and Vercel env' },
      { id: 'dsr-be-llamaparse-c3', label: 'Parse a scanned page with the test', trigger: 'copy:dsr-be-llamaparse-curl' },
    ],
  },
  {
    id: 'dsr-be-e2e',
    title: 'Run the full upload-to-export test end to end',
    outcome: 'One real run proves every piece works together: sources, parsing, mapping, drafting, review, library reuse, caps, export and emails.',
    minutes: 75,
    xp: 70,
    blocks: [
      { type: 'callout', tone: 'eli5', title: 'Why one long test', text: 'Each piece can pass on its own and still break when joined up: a cron URL with a typo, a secret missing in Vercel. This test walks the exact path a real customer takes, so you find those gaps before they do.' },
      { type: 'steps', items: [
        'Use two browsers: Chrome as the owner, a private window as a reviewer.',
        'Upload 4 sources: an information security policy, a backup and DR policy, a SOC 2 summary and one past completed questionnaire (XLSX). Wait for all four to be Ready.',
        'On Library > Import, approve the past questionnaire\'s answers into the library.',
        'Upload a new 100+ question XLSX questionnaire, confirm the mapping, and click Draft all.',
        'While it drafts, assign the Access control section to the reviewer with tomorrow as due date. Check the reviewer gets one email.',
        'As the reviewer, fix and approve their questions. As the owner, approve everything else that is High confidence in bulk, and review the Low ones.',
        'Export as Original file (XLSX), open in Excel, and spot-check 10 answers against their cells.',
        'Run the SQL below. Every column must say true.',
      ] },
      { type: 'code', id: 'dsr-be-e2e-sql', filename: 'e2e-check.sql', lang: 'sql', code: `with q as (select * from public.questionnaires order by created_at desc limit 1)
select
  (select status in ('approved', 'exported') from q)                                                      as all_approved,
  (select bool_and(status = 'ready') from public.source_documents where status <> 'archived')             as sources_ready,
  (select count(*) = 0 from public.source_chunks where embedding is null)                                  as all_embedded,
  (select count(*) > 0 from public.questions x, q where x.questionnaire_id = q.id
     and x.library_answer_id is not null)                                                                   as library_reused,
  (select count(*) = 0 from public.questions x, q where x.questionnaire_id = q.id
     and x.status in ('drafted', 'needs_review', 'approved')
     and not exists (select 1 from public.answer_citations c where c.question_id = x.id)
     and not ('no_evidence' = any (x.flags)))                                                               as every_answer_cited,
  (select count(*) >= 1 from public.exports e, q where e.questionnaire_id = q.id and e.status = 'done')   as exported,
  (select sum(quantity) <= (select l.questions from public.plan_limits((select workspace_id from q)) l)
     from public.usage_ledger where kind = 'questions' and created_at >= date_trunc('month', now()))       as under_cap,
  (select count(*) >= 2 from public.email_log where created_at > now() - interval '1 day')                as emails_logged,
  (select count(*) >= 5 from public.audit_events where created_at > now() - interval '1 day')             as audited;` },
      { type: 'mistakes', items: [
        { mistake: 'all_embedded is false and sources sit at Embedding.', fix: 'ds-ai-worker is not running. Check Edge Functions > ds-ai-worker > Logs for 401 (CRON_SECRET mismatch) or a Voyage 401 (VOYAGE_API_KEY missing in Supabase secrets).' },
        { mistake: 'exported is false and the export row says failed.', fix: 'Read exports.error. "Object not found" means the original file path is wrong; a timeout means the Vercel function duration is too short for the file. Raise maxDuration or split by sheet.' },
        { mistake: 'emails_logged is true but nothing arrived.', fix: 'Resend only delivers to your own address until your domain is verified. Verify the sending domain in Resend > Domains.' },
      ] },
    ],
    checklist: [
      { id: 'dsr-be-e2e-c1', label: 'Load four real sources and import a past questionnaire' },
      { id: 'dsr-be-e2e-c2', label: 'Draft, assign, review and approve a 100+ question file' },
      { id: 'dsr-be-e2e-c3', label: 'Export and spot-check 10 answers in Excel' },
      { id: 'dsr-be-e2e-c4', label: 'Run the e2e SQL and see every column true', trigger: 'copy:dsr-be-e2e-sql' },
    ],
  },
]
