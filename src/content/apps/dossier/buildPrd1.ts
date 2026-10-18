// Dossier build PRD (PRD.md), part 1: product, architecture, routes, data model, state machines, plans.

export const buildPrd1 = `# Dossier: build PRD

Version 1.0. Download this file, save it as \`PRD.md\` in the root of your project folder, and reference it in
Claude Code with \`@PRD.md\`. Claude Code reads it before every task. Where this file and your instinct disagree,
this file wins. The look and feel lives in \`@DESIGN_SYSTEM.md\` (the Quiet Precision base system) and \`@DESIGN.md\`
(Dossier's accent and screens), the marketing page in \`@LANDING.md\`. Your \`CLAUDE.md\` should contain the line
\`UI rules: @DESIGN_SYSTEM.md @DESIGN.md\`.

## 0. How to use this document

- Read sections 1 to 5 once so you know what you are building and for whom.
- Sections 6 to 19 are the spec. Claude Code builds from them.
- Section 23 lists the build milestones. Do them in order. Do not start a milestone before the one before it
  passes its acceptance tests (section 22).
- Every new Claude Code session, say: "Read @PRD.md, @DESIGN_SYSTEM.md and @DESIGN.md. We are on milestone N.
  Plan first, then wait for my OK."
- Use Opus at high effort (\`/model opus\`, \`/effort high\`) for anything that touches the schema, RLS, the
  retrieval functions, file write-back or Stripe. Medium is fine for UI copy and layout.

## 1. Problem

Every B2B SaaS company that sells to mid-market and enterprise buyers gets the same homework: a security
questionnaire (SIG Lite, CAIQ, a 300-row custom spreadsheet from the buyer's procurement team) or an RFP. It
arrives as an XLSX, a DOCX or a PDF, it is due in 5 working days, and the deal is stuck until it is done.

What teams do today:
- The founder, the CTO or a sales engineer opens last quarter's questionnaire, searches it with Ctrl+F, and
  copies answers across one cell at a time. Half the answers are out of date (the old backup policy, a
  subprocessor you dropped).
- They paste questions into ChatGPT, which writes confident answers with no source, some of them wrong. Nobody
  can tell which ones were checked.
- Bigger companies buy Loopio, Responsive or Conveyor ($10,000 to $25,000 a year [verify]), which is a lot for a
  30 person SaaS that gets 3 questionnaires a month.

The cost: a 250-question security questionnaire takes 10 to 20 hours of senior time. At 3 a month that is a
sales engineer's whole week, every month, and every day of delay pushes the close date.

## 2. Ideal customer (ICP)

- **Who:** B2B SaaS companies with 10 to 300 staff selling to mid-market and enterprise. The person who feels
  the pain is the founder or CTO (early), then a sales engineer, a solutions consultant, a security or
  compliance lead, or a RevOps manager.
- **Volume:** 2 to 20 questionnaires or RFPs a month, 80 to 800 questions each.
- **Has already:** a SOC 2 report (or is getting one), a folder of security policies, a few past completed
  questionnaires, product docs and a trust page.
- **Pain trigger:** "Procurement sent a 400-row spreadsheet and the deal is stuck until we fill it in."
- **Will pay:** $249 to $1,299 a month. One enterprise deal closed a week earlier pays for a year.
- **Not for (v1):** public-sector bids that need formal bid management, companies that need a full trust
  centre with NDA gating, teams that want the AI to log into buyer portals (OneTrust, Whistic, Ariba) and type
  answers there.

## 3. The one core job

"I drop in the buyer's spreadsheet. Ten minutes later every question has a drafted answer, each with the
paragraph of our own policy it came from and a confidence score. I check the low-confidence ones, my CTO
approves the ones assigned to her, and I download the same spreadsheet with the answers filled in, ready to
send back."

Everything in v1 serves that sentence. If a feature does not shorten upload-to-approved-export, it waits.

## 4. User stories

### Workspace owner and admins
1. As an owner, I sign up, name my workspace and add my company facts (legal name, HQ, hosting provider, data
   regions, SOC 2 status) in under 5 minutes.
2. As an admin, I upload my source documents (PDF, DOCX, XLSX, Markdown, TXT): security policies, a SOC 2 report
   summary, past questionnaires, product docs. Each one shows "Reading", then "Ready" with a page and passage
   count.
3. As an admin, I upload a past completed questionnaire and import its question and answer pairs into the
   answer library as drafts that I approve in bulk.
4. As an admin, I set an owner and a review date on each library answer, so stale answers get flagged before
   they go out again.
5. As an admin, I invite my team with roles (admin, reviewer, contributor, viewer).

### Anyone answering a questionnaire (reviewer or contributor)
6. As a user, I upload a questionnaire as XLSX, DOCX or PDF, or paste questions as text.
7. For an XLSX, I see which column Dossier thinks holds the questions and which column the answers go into, per
   sheet, and I can change it before anything is drafted.
8. As a user, I click "Draft all" and watch progress per question. I can leave the page and come back.
9. As a user, every drafted answer shows its citations (document name, page, the exact passage) and a
   confidence score. Answers below the workspace threshold are marked "Needs review".
10. As a user, answers that came from an approved library answer say so, with its owner and review date.
11. As a user, I assign questions or whole sections to teammates with a due date. They get one email listing
    what is theirs.
12. As a user, I comment on a question and @mention a teammate.
13. As a reviewer, I edit, redraft with an instruction ("shorter", "say yes and mention SSO"), or approve each
    answer. Approving offers "Save to library" so next time it is reused.
14. As a user, I export back into the original file: the same XLSX with the answer cells filled in and nothing
    else changed, the same DOCX with answers in place, or for a PDF a clean DOCX and XLSX of questions and
    answers (and the PDF form filled if it has form fields).

### Everyone
15. As a member, I see an audit log of who changed, approved and exported what.
16. As a buyer-facing team, I can tell the buyer: "Our data is never used to train AI models" and point to the
    settings page that says how.

## 5. Scope decisions (and why)

| Decision | Choice | Why | What breaks first at scale, and the fix |
|---|---|---|---|
| Drafting model | \`claude-sonnet-5-5\` with structured JSON output, 8 questions per call, effort low | $2 in / $10 out per MTok (checked Oct 2026 [verify]) is cheap enough to draft every question; quality is high on policy-style writing | Cost creeps if users redraft endlessly. Fix: every draft and redraft counts against the plan's question cap, enforced server-side |
| Embeddings | Voyage \`voyage-4\`, 1024 dimensions, stored as \`halfvec(1024)\` | $0.06 per MTok with 200M free tokens [verify]; much better retrieval on long policy text than gte-small (384 dims, English only) | HNSW index memory grows with every chunk. At about 800 workspaces move to Large compute; beyond that re-embed at 512 dims (Matryoshka) and partition chunks by workspace |
| Reranking | Voyage \`rerank-2.5\` on the top 40 hybrid hits | $0.05 per MTok [verify]; lifts the right paragraph to the top, which drives citation quality and confidence | Latency on very large libraries. Fix: cut candidates to 25 and cache query embeddings per questionnaire |
| Search | Hybrid: pgvector cosine plus Postgres full-text, fused with reciprocal rank fusion, always filtered by \`workspace_id\` | Policy questions use exact terms ("AES-256", "RTO") that vectors miss | See embeddings |
| File parsing and write-back | Node.js route on Vercel (\`/api/jobs/run\`), not a Supabase edge function | exceljs, JSZip, xmldom and unpdf are Node-first, and a 2,000-row workbook can pass the edge runtime's 2 s CPU limit | Many big files at once. Fix: the runner claims 3 jobs per call and pg_cron calls it every minute; add a second schedule offset by 30 s |
| XLSX write-back | Read with exceljs, write by editing only the target cells inside the sheet XML (JSZip) | Re-saving a workbook with a library can drop charts, macros or odd formatting. Surgical edits keep every other byte | Shared formulas or merged answer cells. Fix: detect them at parse time and show "This answer cell is merged, we will write into the first cell" |
| PDF | Text layer with unpdf first; scanned pages go to LlamaParse (cost-effective tier, 3 credits a page) | Most policy PDFs have a text layer and cost nothing to read | LlamaParse cost on huge scanned reports. Fix: parsed pages are a metered, capped usage kind |
| Long jobs | One \`jobs\` table, two runners: \`ds-ai-worker\` (Supabase, AI work) and \`/api/jobs/run\` (Vercel, files). pg_cron pokes both every minute | Drafting 400 questions takes 3 to 8 minutes. Browsers and functions time out | One run handles about 40 questions. At 1,000 customers with bursts, raise the batch and add a second schedule |
| Tenancy | Workspaces, roles, RLS through \`is_workspace_member()\` and \`has_workspace_role()\` | Strict isolation is the product: buyers ask about it | Policy cost on big tables. Fix: \`workspace_id\` is the first column of every hot index |
| Training | No customer data is used to train models: Anthropic commercial API (no training by default), Voyage opt-out switched on, LlamaParse training off by default with \`do_not_cache\` | Buyers will ask. It is a selling point | Vendor terms change. Fix: re-check each quarter and keep the Settings > Data page in sync |

## 6. Architecture

\`\`\`
                         Browser (owner, reviewers, contributors)
                                         |
                                         v
   +---------------------------------------------------------------------------------+
   |  Next.js on Vercel                                                              |
   |  /app/*  server components, getClaims(), RLS through the user's JWT             |
   |  /api/jobs/run   Node runtime, maxDuration 300: parse XLSX/DOCX/PDF, extract    |
   |                  source text, write exports (exceljs, JSZip, xmldom, unpdf)     |
   +-----------------+---------------------------------------------+-----------------+
                     | publishable key + JWT                       | secret key (server only)
                     v                                             v
   +---------------------------------------------------------------------------------+
   |  Supabase                                                                       |
   |  Postgres + RLS (workspace_id) + pgvector (halfvec 1024, HNSW) + full-text      |
   |  Storage (private): sources, questionnaires, exports   folders = workspace id   |
   |  Edge functions:                                                                |
   |    ds-ingest-source   ds-start-questionnaire   ds-draft-run   ds-ai-worker      |
   |    ds-library-search  ds-invite-member         ds-notify                        |
   |  pg_cron: ds-ai-worker + /api/jobs/run every minute, ds-notify every 15 minutes |
   +------+------------------------+-----------------------+-------------------------+
          |                        |                       |
          v                        v                       v
     Anthropic API            Voyage AI               Resend
     claude-sonnet-5-5        voyage-4 embeddings     (assignments, mentions,
     (draft answers,          rerank-2.5              review-date reminders,
      detect structure)                                export ready, invites)
          ^
          |  LlamaParse (only for scanned PDF pages, called from /api/jobs/run)
\`\`\`

The flow for one questionnaire:

\`\`\`
upload XLSX -> ds-start-questionnaire -> job parse_questionnaire (node)
   -> sheets + guessed column mapping -> status 'mapping' (user confirms) -> questions rows
   -> "Draft all" -> ds-draft-run (cap check, reserve) -> jobs draft_batch x N (edge, 8 questions each)
   -> per question: library exact match? reuse : hybrid search -> rerank -> Claude -> citations + confidence
   -> review, assign, comment, approve (+ save to library)
   -> "Export" -> job export_questionnaire (node) -> exports bucket -> signed download link
\`\`\`

## 7. Routes and pages

The app shell has a left sidebar (DESIGN.md section 6). One level, no nested menus.

**Sidebar, top group:** logo, Questionnaires, Library, Sources, Assigned to me, Activity.
**Sidebar, bottom group (always this order):** Documentation, Help, Billing, Settings.

| Route | Who | What it does |
|---|---|---|
| \`/\` | public | Landing page (LANDING.md) |
| \`/pricing\` | public | Same pricing section as the landing page, full width |
| \`/security\` | public | Dossier's own security page: hosting, encryption, no-training statement, subprocessors |
| \`/login\`, \`/signup\`, \`/reset\` | public | Supabase auth. "Confirm email" off |
| \`/invite/[token]\` | public, then auth | Accept a team invite, then join the workspace |
| \`/onboarding\` | auth | 3 steps: workspace name and company facts, upload first sources, upload first questionnaire (skippable) |
| \`/paywall\` | auth | Shown when the owner's subscription is not trialing or active |
| \`/app\` | member | Redirects to \`/app/questionnaires\` |
| \`/app/questionnaires\` | member | Table: name, buyer, format, questions, progress bar (approved / total), due date, status pill, owner |
| \`/app/questionnaires/new\` | reviewer+ | Upload (XLSX, DOCX, PDF) or Paste text. Buyer name, due date |
| \`/app/questionnaires/[id]\` | member | The review workspace: question list left, answer editor centre, evidence panel right |
| \`/app/questionnaires/[id]/mapping\` | reviewer+ | XLSX/DOCX structure check: per sheet, question column, answer column, header row, section column |
| \`/app/questionnaires/[id]/export\` | reviewer+ | Export dialog page: format, "only approved" toggle, history of exports |
| \`/app/library\` | member (edit: reviewer+) | Approved answers: question, short answer, owner, review date, used count, status. Search, filters |
| \`/app/library/[id]\` | member | One library answer with alternate phrasings, history and where it was used |
| \`/app/library/import\` | admin+ | Review imported Q and A pairs from past questionnaires, approve in bulk |
| \`/app/sources\` | member (edit: admin+) | Source documents: name, type, pages, passages, status, uploaded by, updated |
| \`/app/sources/[id]\` | member | Document preview by page with its passages, and which answers cite it |
| \`/app/assigned\` | member | Questions assigned to me across questionnaires, grouped by due date |
| \`/app/activity\` | member | Audit log: who did what, filterable by person, action and date; CSV export (Business+) |
| \`/app/docs\` | member | Documentation: supported formats, how confidence works, how the library is reused, data handling |
| \`/app/help\` | member | Contact form (Resend to the founder) and links |
| \`/app/billing\` | owner | Plan, usage meters (questions this month, parsed pages, seats, storage), Stripe portal |
| \`/app/settings\` | member | Tabs: Profile, Workspace (company facts, confidence threshold, answer style), Team, Notifications, Data |
| \`/api/jobs/run\` | pg_cron | File runner (Node). x-cron-secret |
| \`/api/questionnaires/[id]/mapping\` | reviewer+ | Saves the confirmed mapping and enqueues \`extract_questions\` |
| \`/api/exports/[id]/download\` | member | Returns a 60 second signed URL for an export file |
| \`/api/stripe/webhook\` | Stripe | Platform subscription webhook (shared playbook step) |

Rules for every \`/app\` page:
- Server components check the user with \`supabase.auth.getClaims()\` and redirect to \`/login\` if missing.
- Then call \`has_active_access(workspace_id)\`. If false, redirect to \`/paywall\`.
- Never cache authenticated pages. Never pass the secret key to a client component.

## 8. Data model

All tables live in \`public\`, have RLS on, and carry \`workspace_id\` unless noted. The full migration is in the
SQL step of the playbook. Summary:

| Table | Key columns | Notes |
|---|---|---|
| \`profiles\` | id (= auth.users.id), full_name, job_title, current_workspace_id | Created by trigger on signup |
| \`workspaces\` | id, name, owner_id | The owner's subscription decides access |
| \`workspace_members\` | workspace_id, user_id, role (owner, admin, reviewer, contributor, viewer) | PK (workspace_id, user_id) |
| \`workspace_invites\` | id, workspace_id, email, role, token_hash, invited_by, expires_at, accepted_at | Raw token only in the email |
| \`workspace_settings\` | workspace_id (PK), company_facts (jsonb), confidence_threshold (default 70), default_review_days (default 180), answer_style (jsonb: tone, length, person) | One per workspace |
| \`source_documents\` | id, workspace_id, title, kind (policy, soc2, questionnaire, product, other), file_type, storage_path, sha256, pages, status, error, uploaded_by, effective_date | De-duplicated by (workspace_id, sha256) |
| \`source_chunks\` | id, workspace_id, document_id, ordinal, page, heading, content, token_count, embedding halfvec(1024), fts tsvector | HNSW on embedding, GIN on fts |
| \`questionnaires\` | id, workspace_id, name, buyer_name, file_type (xlsx, docx, pdf, paste), storage_path, status, due_at, owner_id, question_count, approved_count, error | Status enum below |
| \`questionnaire_sheets\` | id, questionnaire_id, workspace_id, sheet_name, sheet_index, header_row, question_col, answer_col, extra_answer_col, section_col, include, preview (jsonb) | XLSX and DOCX tables. Mapping lives here |
| \`questions\` | id, questionnaire_id, workspace_id, ordinal, section, text, answer_kind (text, yes_no, yes_no_detail), locator (jsonb), answer_short, answer_text, status, confidence, flags (text[]), assignee_id, due_at, library_answer_id, drafted_at, approved_by, approved_at, draft_count | locator says where to write back |
| \`answer_citations\` | id, question_id, workspace_id, chunk_id, library_answer_id, quote, score | 0 to 4 per answer |
| \`question_comments\` | id, question_id, workspace_id, author_id, body, mentions uuid[] | Plain text, never HTML |
| \`library_answers\` | id, workspace_id, question, answer_short, answer_text, owner_id, status (draft, approved, archived), review_by, tags text[], normalized_hash, embedding halfvec(1024), times_used, last_used_at, source_question_id, created_by | Exact match by hash, semantic by embedding |
| \`library_variants\` | id, library_answer_id, workspace_id, question, normalized_hash, embedding | Other phrasings of the same question |
| \`exports\` | id, questionnaire_id, workspace_id, format (xlsx, docx, csv, pdf_form), only_approved, status, storage_path, error, requested_by | Files in the exports bucket |
| \`jobs\` | id, workspace_id, kind, runner (edge, node), ref_id, status, attempts, run_after, locked_at, idempotency_key (unique), payload, last_error | The async queue |
| \`usage_ledger\` | id, workspace_id, user_id, kind, quantity, cost_usd_micros, ref_id, idempotency_key | Every paid API call and every question drafted |
| \`audit_events\` | id, workspace_id, actor_id, action, entity, entity_id, detail (jsonb), created_at | Append-only. Triggers block update and delete |
| \`email_log\` | id, workspace_id, kind, to_email, dedupe_key (unique), resend_id, status | Every Resend send |
| \`notification_prefs\` | workspace_id + user_id (PK), on_assign, on_mention, on_review_due, daily_digest | Per member |
| \`rate_limits\` | key, window_start, hits | Fixed window counters |
| \`subscriptions\`, \`stripe_events\`, \`plan_prices\` | shared billing tables | Written only by webhooks or you |
| \`workspace_limit_overrides\` | workspace_id, questions, pages, seats | Test overrides, no policies |

**The locator** (\`questions.locator\`) is how export finds the right cell again. It never depends on text matching:
\`\`\`json
{ "type": "xlsx", "sheet": "Security", "sheetIndex": 2, "row": 47, "answerCol": "D", "detailCol": "E" }
{ "type": "docx", "kind": "table_cell", "table": 3, "row": 12, "answerCell": 2 }
{ "type": "docx", "kind": "paragraph", "paragraphIndex": 214, "insertAfter": true }
{ "type": "pdf", "page": 4, "field": "q17_response" }
{ "type": "paste", "line": 23 }
\`\`\`

**Normalising a question** for exact match (\`normalized_hash\`): lower case, Unicode NFKC, strip numbering at the
start ("1.2.3", "Q14", "a)"), collapse whitespace, remove punctuation except \`%\` and \`/\`, trim, then SHA-256 hex.
The same function lives in \`lib/normalize.ts\` and \`supabase/functions/_shared/normalize.ts\` with shared tests.

## 9. State machines

### 9.1 Source document
\`\`\`
uploading -> queued -> extracting -> embedding -> ready
                \\            \\           \\
                 +-----------+-----------+--> failed (error shown, Retry re-queues)
ready -> archived (hidden from retrieval, chunks kept for old citations)
\`\`\`
- \`queued\`: ds-ingest-source has accepted it and created job \`extract_source\` (node).
- \`extracting\`: the file runner reads text by page (unpdf, mammoth, exceljs) and writes \`source_chunks\` without
  embeddings. Scanned pages go to LlamaParse and the job re-queues itself every 20 seconds until done.
- \`embedding\`: job \`embed_source\` (edge) embeds chunks in batches of 128 with \`input_type: "document"\`.
- A new upload with the same sha256 returns the existing document instead of a duplicate.

### 9.2 Questionnaire
\`\`\`
uploading -> parsing -> mapping -> ready -> drafting -> in_review -> approved -> exported
                \\          \\                 \\
                 +----------+-----------------+--> failed
in_review <- (any answer edited after approval moves it back)
\`\`\`
- \`mapping\`: XLSX and DOCX stop here until a reviewer confirms the structure. Paste and PDF skip it when the
  parser is confident (every question has a locator), otherwise they stop here too.
- \`ready\`: question rows exist. Nothing has been drafted or charged.
- \`drafting\`: at least one \`draft_batch\` job is queued or running.
- \`in_review\`: every question has a draft, some are not approved.
- \`approved\`: \`approved_count = question_count\` (skipped questions count as approved).
- \`exported\`: at least one export finished. Still editable; a new export makes a new file.

### 9.3 Question
\`\`\`
new -> queued -> drafting -> drafted ----> approved
                    \\           \\              |
                     \\           +-> needs_review -> approved
                      +-> failed (Retry)       ^
approved -> drafted (edited after approval, needs approving again)
new/drafted/needs_review -> skipped ("Not applicable", counts as done)
\`\`\`
- \`needs_review\` when confidence < workspace threshold, or flags contain \`no_evidence\`, \`stale_source\`,
  \`conflict\` or \`model_unsure\`.
- Only reviewer, admin or owner can approve. Contributors can edit answers assigned to them.

### 9.4 Job
\`\`\`
queued -> running -> done
   ^         |
   +---------+  (error: attempts + 1, run_after = now + 2^attempts minutes + jitter)
running -> dead (attempts = 5; the parent row is marked failed and the requester gets an email)
running for 10+ minutes -> queued again (release_stuck_jobs)
\`\`\`
Job kinds and runners:

| Kind | Runner | Idempotency key |
|---|---|---|
| \`extract_source\` | node | \`extract:<document_id>\` |
| \`embed_source\` | edge | \`embed:<document_id>\` |
| \`parse_questionnaire\` | node | \`parse:<questionnaire_id>\` |
| \`detect_structure\` | edge | \`detect:<questionnaire_id>\` |
| \`extract_questions\` | node | \`extractq:<questionnaire_id>:<mapping_version>\` |
| \`draft_batch\` | edge | \`draft:<run_id>:<batch_no>\` |
| \`embed_library\` | edge | \`embedlib:<library_answer_id>:<updated_at epoch>\` |
| \`import_library\` | node | \`importlib:<document_id>\` |
| \`export_questionnaire\` | node | \`export:<export_id>\` |

### 9.5 Library answer
\`\`\`
draft -> approved -> archived
            |
            +-> stale (computed: review_by < today; still approved, never auto-reused, flagged in drafts)
\`\`\`

## 10. Plans and limits

Usage unit: **questions answered per month** (every draft and every redraft of one question counts as one,
including answers reused from the library). Caps are enforced in \`ds-draft-run\` before any job is created and
again in the worker before each batch.

| Limit | Team ($249/mo) | Business ($599/mo) | Scale ($1,299/mo) |
|---|---|---|---|
| Questions answered a month | 1,000 | 4,000 | 10,000 |
| Parsed pages a month (sources + questionnaires) | 3,000 | 10,000 | 30,000 |
| Seats | 5 | 15 | 40 |
| Source documents | 300 | 1,500 | 5,000 |
| Storage | 2 GB | 10 GB | 50 GB |
| Library answers | Unlimited | Unlimited | Unlimited |
| Audit log kept | 90 days | 1 year | 3 years |
| Auto-assign rules by section | No | Yes | Yes |
| Two-step approval | No | Yes | Yes |
| Audit log CSV export | No | Yes | Yes |
| Trial (7 days, card at checkout) | 150 questions, 300 pages, 3 seats | | |

Annual plans cost ten times the monthly price ($2,490, $5,990, $12,990) with the same monthly caps.

Show the cap before people hit it:
- The sidebar meter shows "612 of 1,000 questions this month".
- "Draft all" shows the count in its label: "Draft 214 questions (214 of 388 left)".
- If a run would pass the cap, the dialog says "This questionnaire has 420 questions and you have 388 left this
  month. Draft the first 388, or upgrade to Business." and offers both.
- At 80% the owner gets one email. At 100% drafting stops; editing, approving, library reuse by hand and export
  keep working.

## 11. Integrations, in the order you build them

### 11.1 Claude API (M4)
- Package \`npm:@anthropic-ai/sdk\` in edge functions. Model \`claude-sonnet-5-5\`.
- Structured outputs: \`output_config: { effort: 'low', format: { type: 'json_schema', schema } }\`. Thinking is
  adaptive; keep effort low for drafting and medium for structure detection.
- The system prompt and the company facts block are marked \`cache_control: { type: 'ephemeral' }\`, so every
  batch in a run reads them from cache.
- Check \`stop_reason\`: \`refusal\` marks the batch's questions \`failed\` with "The model declined this question.
  Answer it by hand." \`max_tokens\` splits the batch in half and retries.
- Anthropic does not train on commercial API inputs or outputs by default (checked Oct 2026). Say so in
  Settings > Data and on /security. Zero data retention is available to eligible customers by request [verify].

### 11.2 Voyage AI (M3)
- REST: \`POST https://api.voyageai.com/v1/embeddings\` with \`{ model: 'voyage-4', input: [...], input_type:
  'document' | 'query', output_dimension: 1024 }\` and \`Authorization: Bearer VOYAGE_API_KEY\` [verify field
  names in the docs].
- Rerank: \`POST https://api.voyageai.com/v1/rerank\` with \`{ model: 'rerank-2.5', query, documents, top_k: 6 }\`.
  Response \`data[]\` has \`index\` and \`relevance_score\` [verify].
- Batch up to 128 texts per embeddings call. Retry 429 and 5xx with backoff.
- In the Voyage dashboard, opt out of data being used for model training (organisation settings) [verify the
  exact menu]. Record the date you did it in Settings > Data.

### 11.3 File parsing (M2, M3)
- **XLSX** (exceljs in Node): list sheets, read the first 40 rows of each into \`questionnaire_sheets.preview\`.
  Guess the header row (the first row with 2+ cells matching question, requirement, control, description,
  response, answer, comments, yes/no), the question column (longest average text ending in "?" or starting with
  a verb), the answer column (header matching response, answer, vendor response, or the first empty column
  right of the question column), and a section column (short repeated values). If any guess is weak, enqueue
  \`detect_structure\` (Claude reads the preview and returns the mapping as JSON). The reviewer confirms.
- **DOCX** (JSZip + @xmldom/xmldom): walk \`word/document.xml\`. Tables with a question-like column become
  "sheets" with the same mapping UI (table index instead of sheet name). Numbered or question-mark paragraphs
  outside tables become paragraph questions with \`insertAfter\` locators.
- **PDF**: unpdf \`extractText\` per page. Pages with fewer than 200 characters go to LlamaParse
  (\`POST https://api.cloud.llamaindex.ai/api/v2/parse/upload\`, tier cost-effective, then poll
  \`GET /api/v2/parse/{job_id}?expand=markdown\` [verify]). Questions are found by \`detect_structure\` reading
  the text in 20-page windows. If the PDF has AcroForm fields (pdf-lib \`getForm().getFields()\`), each question
  is matched to its nearest text field and the locator stores the field name.
- **Paste**: one question per line or per numbered item; blank lines separate sections; lines ending in ":" are
  section headings.
- **Source documents**: PDF as above, DOCX with mammoth (keeps headings), XLSX past questionnaires through the
  same mapping logic (question and answer columns become library candidates), Markdown and TXT read directly.

### 11.4 Export (M7)
- **XLSX**: open the original with JSZip. For each question, find \`xl/worksheets/sheetN.xml\` (via
  \`xl/workbook.xml\` and its rels) and set the answer cell to an inline string (\`t="inlineStr"\`), keeping the
  cell's style attribute \`s\`. If the cell does not exist, insert it in column order inside its row. Never touch
  other cells, formulas, styles, data validation or drawings. For yes/no columns write the short answer and put
  the detail in the detail column if mapped, otherwise "Yes. <detail>".
- **DOCX**: for table cells, replace the text runs in the answer cell with one run that copies the cell's first
  run properties. For paragraphs, insert a new paragraph after the question that copies the question's paragraph
  style and is prefixed "Answer: ". Re-zip with the same entry order.
- **PDF**: if form fields were found, fill them with pdf-lib and keep a flattened copy optional. Always also
  produce a DOCX and XLSX of question, answer, confidence and sources.
- **CSV**: question, answer, short answer, status, confidence, sources (always available).
- Exports go to \`exports/<workspace_id>/<questionnaire_id>/<export_id>.<ext>\`. Downloads use 60 second signed URLs.

## 12. Security model

- **Tenant isolation:** every table has \`workspace_id\`; every policy calls \`is_workspace_member(workspace_id)\` or
  \`has_workspace_role(workspace_id, roles)\` (security definer, \`set search_path = ''\`). Storage paths start with
  the workspace id and storage policies check it.
- **Retrieval isolation:** \`match_chunks()\` and \`match_library()\` take a workspace id and are only callable with
  the secret key (revoked from anon and authenticated). Edge functions pass the workspace id they verified, never
  one from the request body without a membership check.
- **Prompt injection:** buyer questions, source passages and library answers reach Claude only inside tagged
  blocks (\`<question>\`, \`<passage>\`, \`<library_answer>\`). The system prompt says tagged text is data, never
  instructions. No tools are passed. Output is used only after zod validation, citation ids are checked against
  the ids we sent, and answers are stored as plain text and rendered as text.
- **Roles:** owner (billing, delete workspace), admin (sources, members, settings), reviewer (create
  questionnaires, approve, export, manage library), contributor (edit and comment on assigned questions),
  viewer (read only).
- **Audit:** inserts into \`audit_events\` happen in triggers and security definer functions. Nobody, including the
  owner, can update or delete audit rows from the app.
- **Files:** three private buckets. No public URLs. Signed URLs live 60 seconds for downloads and 15 minutes for
  the file runner.
- **Secrets:** \`SUPABASE_SECRET_KEY\` and API keys only in Supabase secrets and Vercel env, never in a
  \`NEXT_PUBLIC_\` variable.
- **No training:** see section 5. Settings > Data shows the statement and the date each vendor setting was
  checked.

### 12.1 Database functions the app calls (RPC)

| Function | Called by | What it does |
|---|---|---|
| \`create_workspace(p_name)\` | Onboarding | Creates the workspace, owner membership, settings and notification prefs in one step |
| \`create_invite(p_ws, p_email, p_role)\` | ds-invite-member (secret key) | Seat check, returns the raw token once, stores the hash |
| \`accept_invite(p_token)\` | /invite/[token] | Checks hash, expiry and seats, adds the member, writes an audit event |
| \`set_member_role(p_ws, p_user, p_role)\` | Settings > Team | Owner only; cannot demote the owner |
| \`plan_limits(p_ws)\` | Meters, functions | Plan numbers from section 10 (trial numbers while trialing) |
| \`usage_summary(p_ws)\` | Sidebar meter, Billing | Questions, pages, seats and storage used this month against the limits |
| \`approve_questions(p_ids, p_save_to_library)\` | Review workspace | Role check, sets approved, creates or bumps library answers, audit events, counts |
| \`assign_questions(p_ids, p_assignee, p_due_at)\` | Review workspace | Role check, the assignee must be a member, queues the digest |
| \`skip_questions(p_ids, p_reason)\` | Review workspace | Marks "Not applicable" with a reason |
| \`set_library_owner(p_id, p_owner, p_review_by)\` | Library | Reviewer or above |
| \`reserve_questions(p_ws, p_run, p_n)\` | ds-draft-run (secret key) | Cap check under a row lock, writes the usage row |
| \`claim_jobs(p_runner, p_limit)\`, \`release_stuck_jobs()\` | Runners (secret key) | Queue mechanics with \`for update skip locked\` |
| \`match_chunks(...)\`, \`match_library(...)\` | ds-ai-worker, ds-library-search (secret key) | Hybrid search inside one workspace |

Every function that changes data is \`security definer\` with \`set search_path = ''\`, checks
\`is_workspace_member\` or \`has_workspace_role\` itself, and writes an \`audit_events\` row.

### 12.2 Data handling statement (Settings > Data and /security)

Show this text word for word, with the "checked on" dates filled in from \`workspace_settings.company_facts\`:

> Your documents, questionnaires and answers are stored in your own private workspace, encrypted at rest by our
> database provider, and isolated from every other customer by row-level security. They are never used to
> train AI models. Answers are drafted with Anthropic's Claude API, which does not train on API data by
> default. Search uses Voyage AI embeddings with model training opt-out switched on. Scanned PDFs are read by
> LlamaParse with caching switched off; LlamaParse does not train on customer data by default. You can delete a
> document, a questionnaire or your whole workspace at any time, and it is removed from search immediately.

List the subprocessors under it: Supabase (database, storage), Vercel (hosting), Anthropic (drafting), Voyage AI
(search), LlamaIndex (scanned PDF reading), Resend (email), Stripe (billing), PostHog (product analytics, no
content).
`
