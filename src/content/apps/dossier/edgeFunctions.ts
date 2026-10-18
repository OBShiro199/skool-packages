// Dossier edge functions: one Claude Code prompt per function.
import type { EdgeFunctionDef } from '../../types'

const shared = `First, if supabase/functions/_shared/ does not exist yet, create these helpers (read @PRD.md section 13 intro):
1. admin.ts: adminClient() with Deno.env.get('SUPABASE_URL') and Deno.env.get('SUPABASE_SECRET_KEY') (fall back to SUPABASE_SERVICE_ROLE_KEY), auth: { persistSession: false }.
2. auth.ts: requireUser(req) reads the Bearer token, calls supabase.auth.getClaims(token) with a publishable-key client, returns { userId, email, jwt } or throws HttpError(401). userClient(jwt) returns a client that carries the user's JWT so auth.uid() works in RPCs. requireRole(ws, roles) calls has_workspace_role through userClient and throws 403. requireAccess(ws) calls has_active_access with the admin client and throws 402 { code: 'paused' }. requireCron(req) compares x-cron-secret with CRON_SECRET in constant time.
3. http.ts: HttpError(status, code, message), json(body, status), CORS headers for APP_URL and http://localhost:3000, OPTIONS handler. Error body: { error: { code, message } }.
4. log.ts: log(fn, data) prints one JSON line. Never log question text, answers, passages, file names, emails or keys.
5. retry.ts: withRetry(fn, { tries: 3, baseMs: 800 }) with exponential backoff + jitter, honours retry-after, retries only 429 and 5xx. Export isRateLimited(err) for 429.
6. limits.ts: checkLimit(ws, kind, qty) reads plan_limits(ws) and usage_this_month(ws, kind) and throws HttpError(402, 'limit_reached', "You have used X of Y ... this month.").
7. meter.ts: meter({ ws, userId, kind, quantity, costMicros, refId, idempotencyKey }) inserts usage_ledger with on conflict (idempotency_key) do nothing.
8. voyage.ts: embed(texts, inputType: 'document' | 'query') POSTs https://api.voyageai.com/v1/embeddings with Authorization: Bearer VOYAGE_API_KEY, body { model: 'voyage-4', input: texts (max 128), input_type, output_dimension: 1024 }, returns { vectors: number[][], tokens: usage.total_tokens }. rerank(query, documents, topK) POSTs https://api.voyageai.com/v1/rerank with { model: 'rerank-2.5', query, documents, top_k }, returns [{ index, relevance_score }] and tokens. Check both request shapes against docs.voyageai.com before writing and tell me if anything differs. toHalfvec(v) returns the '[0.1,0.2,...]' string Postgres accepts. Costs in micro-dollars: embed tokens x 0.06, rerank tokens x 0.05.
9. claude.ts: callClaude({ system, cachedBlocks, userContent, schema, zodSchema, effort, maxTokens }) using npm:@anthropic-ai/sdk, model 'claude-sonnet-5-5', output_config { effort, format: { type: 'json_schema', schema } }, system prompt and cached blocks marked cache_control { type: 'ephemeral' }. Use client.messages.stream(...).finalMessage() when maxTokens > 4000. Check stop_reason: 'refusal' throws HttpError(422, 'ai_refused'), 'max_tokens' throws HttpError(502, 'ai_truncated'). Parse the text block as JSON, validate with zodSchema. Return { data, usage, costMicros }. Price per token in micro-dollars equals the $ per million tokens: input 2, cache read 0.2, cache write 2.5, output 10 [verify on the Anthropic pricing page]. costMicros = round(input_tokens*2 + cache_read_input_tokens*0.2 + cache_creation_input_tokens*2.5 + output_tokens*10).
10. email.ts: sendEmail({ ws, kind, to, subject, html, text, dedupeKey }) inserts email_log first (on conflict dedupe_key do nothing, and returns without sending if it already existed), then POST https://api.resend.com/emails with Authorization: Bearer RESEND_API_KEY, then updates resend_id and status. Never put answer text or passages in an email.
11. jobs.ts: failJob(job, err) sets attempts + 1, last_error (no secrets), status 'queued' with run_after = now() + 2^attempts minutes + random 0 to 30 s, or 'dead' at attempts = 5. requeue(job, seconds) puts it back without counting an attempt.
Then build the function below.`

export const edgeFunctions: EdgeFunctionDef[] = [
  {
    name: 'ds-ingest-source',
    purpose: 'Accepts an uploaded source document, checks type, size, plan limits and duplicates, and queues text extraction.',
    trigger: 'Called by the browser when a source upload finishes (user JWT)',
    secrets: ['APP_URL'],
    prompt: `${shared}

Build supabase/functions/ds-ingest-source/index.ts. Read @PRD.md sections 9.1, 13.1 and 14.1.

Contract:
- POST, JSON { document_id: uuid }. Validate with zod (npm:zod). 400 on bad input.
- requireUser, load the document with adminClient, requireRole(doc.workspace_id, ['owner','admin']), requireAccess.
- Rate limit: rpc try_rate_limit('ingest:' + userId, 200, 3600), 429 if false.
- State: status must be 'uploading' or 'failed', else 409 { code: 'wrong_state' }.
- Storage: download the first 64 KB of sources/<path> with a signed URL and a Range header. Check magic bytes: PDF starts with %PDF, DOCX and XLSX start with PK. md and txt must decode as UTF-8. Mismatch: 415 { code: 'unsupported_type', message: 'Dossier reads XLSX, DOCX, PDF, Markdown and text files.' }.
- Size: from the storage object metadata. Over 50 MB: 413. Check plan_limits: documents (count of non-archived documents) and storage_mb (sum of size_bytes). Over: 402 limit_reached with the human sentence.
- sha256: stream the whole file through crypto.subtle.digest in chunks (or use std/crypto's streaming digest). If another non-archived document in the workspace has the same sha256: delete this new row and its storage object, return 200 { ok: true, document_id: <existing id>, status: <existing status>, duplicate: true }.
- Else update the row (admin client): sha256, size_bytes, status 'queued', error null. Insert jobs { workspace_id, kind: 'extract_source', ref_id: document_id, idempotency_key: 'extract:' + document_id, requested_by: userId } with on conflict do nothing.
- Return 200 { ok: true, document_id, status: 'queued', duplicate: false }.
- Log { fn, document_id, ws, bytes, ms } only.

Deploy with JWT verification on.
Curl tests:
curl -X POST "https://<ref>.supabase.co/functions/v1/ds-ingest-source" -H "Authorization: Bearer <USER_JWT>" -H "Content-Type: application/json" -d '{"document_id":"<uuid>"}'
Expected: {"ok":true,"status":"queued","duplicate":false}. Again with the same file uploaded under a new row: duplicate true. No Authorization header: 401. A contributor's JWT: 403.

Plan first, then wait for my OK.`,
  },
  {
    name: 'ds-start-questionnaire',
    purpose: 'Starts reading an uploaded questionnaire file, or turns pasted text into question rows straight away.',
    trigger: 'Called by the browser after a questionnaire upload, or with pasted text (user JWT)',
    secrets: ['APP_URL'],
    prompt: `${shared}

Build supabase/functions/ds-start-questionnaire/index.ts. Read @PRD.md sections 9.2, 11.3 and 13.2.

Contract:
- POST. Body is either { questionnaire_id: uuid } (file already uploaded to questionnaires/<ws>/<id>.<ext>) or { workspace_id, name, buyer_name?, due_at?, paste_text } (max 200,000 characters). zod discriminated by which keys exist.
- requireUser, requireRole(ws, ['owner','admin','reviewer']), requireAccess. Rate limit 'startq:' + userId, 30 per hour.
- File path: questionnaire status must be 'uploading' (409 otherwise). Check magic bytes as in ds-ingest-source (PDF or PK). Update status 'parsing', size_bytes. Insert job { kind: 'parse_questionnaire', ref_id, idempotency_key: 'parse:' + id, requested_by }. Return { ok: true, questionnaire_id, status: 'parsing' }.
- Paste path: insert the questionnaire with file_type 'paste' through userClient (so the guard trigger and RLS apply; it starts as 'uploading'), then with the admin client split the text: normalise line endings; a line ending in ":" or a line in Title Case under 60 characters with no "?" is a section heading; numbered items ("1.", "1.2", "Q3", "a)") start a new question and following lines without a number join it; otherwise one question per non-empty line. Skip lines under 8 characters. Max 2,000 questions (413 too_long). answer_kind 'yes_no' when the text starts with Do, Does, Is, Are, Has, Have, Can, Will (case-insensitive) and is under 200 characters, else 'text'. locator { type: 'paste', line }.
- Bulk insert questions (ordinal from 1), apply assign_rules if plan_limits.auto_assign (section ilike '%' || pattern || '%'), then set status 'ready' with the admin client and call rpc refresh_questionnaire(id) (server-only, so the admin client) to fill the counts.
- Return { ok: true, questionnaire_id, status: 'ready', question_count }.
- Errors: 400, 401, 403, 409 wrong_state, 413 too_long, 415 unsupported_type, 402 paused.

Curl tests:
curl -X POST "https://<ref>.supabase.co/functions/v1/ds-start-questionnaire" -H "Authorization: Bearer <USER_JWT>" -H "Content-Type: application/json" -d '{"workspace_id":"<ws>","name":"Paste test","paste_text":"Encryption:\\n1. Do you encrypt data at rest?\\n2. Describe your key management.\\nAccess control:\\n3. Is MFA enforced for all staff?"}'
Expected: status ready, question_count 3, and the first two questions have section "Encryption".

Plan first, then wait for my OK.`,
  },
  {
    name: 'ds-draft-run',
    purpose: 'Checks and reserves the monthly question allowance, then queues draft batches of 8 questions.',
    trigger: 'Called by the browser from Draft all, Draft selected or Redraft (user JWT)',
    secrets: ['APP_URL'],
    prompt: `${shared}

Build supabase/functions/ds-draft-run/index.ts. Read @PRD.md sections 10, 13.3 and DESIGN.md section 15.

Contract:
- POST, JSON { questionnaire_id: uuid, question_ids?: uuid[] (max 1000), instruction?: string (max 300), only_undrafted?: boolean, allow_partial?: boolean }.
- requireUser, load the questionnaire, requireAccess. Role: owner/admin/reviewer may draft anything; a contributor may only redraft question_ids that are all assigned to them (403 otherwise); viewers 403.
- Questionnaire status must be one of ready, drafting, in_review, approved, exported (409 wrong_state, e.g. still mapping).
- Pick questions: question_ids if given, else all of the questionnaire; drop status queued or drafting (already running) and skipped; with only_undrafted keep only new and failed. Order by ordinal. n = count. If n = 0 return { ok: true, queued: 0 }.
- run_id = crypto.randomUUID(). granted = rpc reserve_questions(ws, run_id, userId, n, allow_partial ?? false) with the admin client.
  - granted = 0: 402 { code: 'limit_reached', message: 'You have used all X questions this month. Drafting starts again on <1st of next month>, or upgrade now.' }
  - granted < 0: 409 { code: 'over_cap', requested: n, remaining: -granted, message: 'This questionnaire has N questions and you have R left this month.' }
  - else take the first granted questions.
- Update those questions: status 'queued', draft_count = draft_count + 1, flags '{}' (admin client).
- Insert ceil(granted / 8) jobs { kind: 'draft_batch', ref_id: questionnaire_id, idempotency_key: 'draft:' + run_id + ':' + batchNo, payload: { run_id, question_ids: [8 ids], instruction }, requested_by: userId }.
- Update the questionnaire status to 'drafting' (admin client).
- Return { ok: true, run_id, queued: granted, remaining_after }.
- Never call Claude or Voyage here. Must answer in under a second.

Curl tests:
1. Normal: {"questionnaire_id":"<id>"} returns queued = number of questions, and jobs has ceil(n/8) rows for the run.
2. Cap: in SQL, insert into workspace_limit_overrides (workspace_id, questions) values ('<ws>', 20); then call on a 50-question questionnaire: 409 over_cap with remaining. Call again with "allow_partial": true: queued 20. Again: 402 limit_reached.
3. Race: run two curls at the same moment (&) on a fresh override of 30 with 25 questions each. Total usage for the month must be at most 30.

Plan first, then wait for my OK.`,
  },
  {
    name: 'ds-ai-worker',
    purpose: 'The AI background worker: embeds source chunks and library answers, detects questionnaire structure, and drafts answers with retrieval, reranking, Claude, citations and confidence.',
    trigger: 'pg_cron every minute (x-cron-secret header)',
    secrets: ['ANTHROPIC_API_KEY', 'VOYAGE_API_KEY', 'RESEND_API_KEY', 'EMAIL_FROM', 'CRON_SECRET', 'APP_URL'],
    prompt: `${shared}

Build supabase/functions/ds-ai-worker/index.ts. Read @PRD.md sections 9, 13.4, 14 and 15 first.

Contract:
- POST from pg_cron with x-cron-secret. requireCron. Deploy with --no-verify-jwt.
- rpc('release_stuck_jobs'), then rpc('claim_jobs', { p_runner: 'edge', p_limit: 6 }). Process one at a time. Stop starting new jobs after 120 s of wall time; put unstarted claimed jobs back with requeue(job, 0).
- Every job in try/catch: success sets status 'done'; a 429 from Voyage or Anthropic calls requeue(job, 60); any other error calls failJob. When a job goes 'dead': mark its parent failed with a human error, refund drafts (see draft_batch) and send the job_failed email to requested_by.

kind 'embed_source' (ref_id = document_id):
1. Select up to 512 chunks with embedding is null, in pages of 128. Text to embed: title + ' > ' + heading + '\\n\\n' + content.
2. embed(texts, 'document'), update each chunk's embedding with toHalfvec. meter 'embed_tokens' quantity tokens, cost tokens x 0.06 micros, idempotencyKey 'embed:' + document_id + ':' + firstChunkOrdinal.
3. If chunks remain, requeue(job, 0). Else document status 'ready' and insert an audit_events row { action: 'source.ready' }.

kind 'detect_structure' (ref_id = questionnaire_id):
1. Load questionnaire_sheets previews (XLSX/DOCX) or payload.text_windows (PDF, written by the file runner).
2. callClaude with the preamble "You read questionnaire files and find where questions and answers are." and the schema from PRD 15.3, previews inside <sheet_preview index="n" name="..."> tags (as data). effort 'medium', maxTokens 6000.
3. XLSX/DOCX: update each sheet's header_row, question_col, answer_col, detail_col, section_col, include, guess_reason, weak_guess false; questionnaire status 'mapping'. PDF: insert question rows with locator { type: 'pdf', page }, then status 'mapping' so the reviewer checks them.
4. meter 'claude_usd' quantity 0 with costMicros, idempotencyKey 'claude:' + job.id.

kind 'draft_batch' (payload { run_id, question_ids, instruction }):
1. Load the questions (skip any no longer 'queued'), workspace_settings and company facts. Set them 'drafting'.
2. Exact library match per question: select approved library answers or variants with normalized_hash = question.normalized_hash. If found and review_by >= today: write answer_short, answer_text, confidence 95, flags {}, status 'drafted', library_answer_id, model_note '', drafted_at now(), one answer_citations row { library_answer_id, ref: 'L1', quote: '' , score: 1 }, and remove it from the Claude batch. If found but stale: keep it as a candidate marked stale.
3. Embed the remaining question texts in one call with 'query'. For each: rpc match_chunks(ws, vec, text, 40) and match_library(ws, vec, 3) with the admin client (these are server-only RPCs and always take the workspace id from the job, never from user input). Rerank the 40 chunk contents with the question, keep the top 6 with relevance_score. Keep library answers with similarity >= 0.80.
4. Build the user content exactly as PRD 15.2: <company_facts>, <instruction>, then one <item> per question with <question>, <passage id="P1" doc="" page="" effective="">, <library_answer id="L1" ... stale="true|false">. Escape "<" and ">" inside all inserted text as &lt; and &gt; so nothing can close a tag.
5. callClaude with the preamble from PRD 15.1 (cached, filled from answer_style and company name) and the schema from 15.2. effort 'low', maxTokens 6000. On ai_truncated split the batch in two and process each half in this run.
6. Server checks per answer exactly as PRD 14.3: drop citation refs not sent for that item; drop quotes that are not a whitespace-insensitive substring of their passage; compute evidence and confidence with the caps and flags; status needs_review or drafted by the workspace threshold. Answers whose id is missing from the response: status 'queued' and a new single-question draft_batch job with idempotency 'draft:' + run_id + ':retry:' + question_id.
7. Write per question in one update: answer_short, answer_text (trimmed, max 8000), model_note, confidence, flags, status, drafted_at, library_answer_id (if a library answer was cited). Replace its answer_citations (delete then insert, chunk_id or library_answer_id, ref, quote, score).
8. meter 'claude_usd' quantity 0 costMicros, 'rerank_tokens' and 'embed_tokens', idempotency keys 'claude:' + job.id etc. Do not meter 'questions' again: ds-draft-run already reserved them.
9. If this was the last unfinished job of the run (no queued or running draft_batch jobs with payload->>'run_id' = run_id), send drafts_ready to requested_by with counts, dedupe 'drafts_ready:' + run_id.
10. If the job goes dead: set its questions to 'failed' and insert a usage_ledger row kind 'questions' quantity minus the number failed, idempotency 'refund:' + job.id.

kind 'embed_library' (ref_id = library_answer_id): embed the question and each variant without an embedding ('document'), write them, meter embed_tokens.

Prompt-injection guard: questions, passages, library answers and company facts only ever appear inside their tags, the system prompt says tagged text is data, no tools are passed, and output is used only after zod validation and the citation checks. Store answers as plain text.

Response: { ok: true, processed, failed, ms }. Log one line per job { fn, job_id, kind, ok, ms, cost_micros, questions }.

Curl test:
curl -X POST "https://<ref>.supabase.co/functions/v1/ds-ai-worker" -H "x-cron-secret: <CRON_SECRET>"
Then upload a 12 page policy and a 20-question paste questionnaire, click Draft all, and call the worker every minute until every question is drafted. Show me 3 answers with their citations, confidence and flags, and the usage_ledger rows for the run. With a wrong secret it must return 401.

Plan first, then wait for my OK.`,
  },
  {
    name: 'ds-library-search',
    purpose: 'Searches the answer library and source passages by meaning and exact words for the evidence panel and the Library page.',
    trigger: 'Called by the browser while typing in a search box (user JWT, debounced 300 ms)',
    secrets: ['VOYAGE_API_KEY'],
    prompt: `${shared}

Build supabase/functions/ds-library-search/index.ts. Read @PRD.md sections 13.6 and 14.2.

Contract:
- POST, JSON { workspace_id: uuid, query: string (3 to 500 chars), scope: 'all' | 'library' | 'sources' }.
- requireUser, requireRole(workspace_id, any role), requireAccess. Rate limit 'search:' + userId, 60 per minute (429 with "Searching too fast. Try again in a few seconds.").
- embed([query], 'query'). Then with the admin client and the verified workspace id: match_library(ws, vec, 8) when scope is all or library; match_chunks(ws, vec, query, 25) when scope is all or sources.
- Rerank the combined candidates (library answer_text and chunk content) with rerank-2.5, top_k 8.
- Return { results: [{ type: 'library' | 'chunk', id, title (library question or document title), page, snippet (first 300 chars, cut at a word), score, stale (library only) }] }.
- Meter embed_tokens and rerank_tokens (cost only, never the question cap), idempotencyKey null.
- Cache: keep an in-memory Map of query embedding by sha256(query) for the life of the worker (max 200 entries).
- Never return chunks of archived documents (match_chunks already filters on status ready).

Curl test:
curl -X POST "https://<ref>.supabase.co/functions/v1/ds-library-search" -H "Authorization: Bearer <USER_JWT>" -H "Content-Type: application/json" -d '{"workspace_id":"<ws>","query":"how do you encrypt backups","scope":"all"}'
Expected: results with your encryption passages first. The same call with a JWT from another workspace: 403. 61 calls inside a minute: the 61st is 429.

Plan first, then wait for my OK.`,
  },
  {
    name: 'ds-invite-member',
    purpose: 'Invites a teammate with a role, enforcing the seat limit, and emails the invite link.',
    trigger: 'Called by the browser from Settings > Team (user JWT)',
    secrets: ['RESEND_API_KEY', 'EMAIL_FROM', 'APP_URL'],
    prompt: `${shared}

Build supabase/functions/ds-invite-member/index.ts. Read @PRD.md sections 13.7 and 16.

Contract:
- POST, JSON { workspace_id: uuid, email: string (email), role: 'admin' | 'reviewer' | 'contributor' | 'viewer' }.
- requireUser, requireRole(ws, ['owner','admin']), requireAccess. Rate limit 'invite:' + ws, 20 per hour.
- token = rpc create_invite(p_ws, p_email, p_role, p_actor: userId) with the admin client (create_invite is server-only and checks the actor's role itself).
  - error 'seat_limit_reached' -> 402 { code: 'seat_limit', message: 'Your plan has N seats and all are in use. Remove someone or upgrade.' }
  - error 'already_member' -> 409 { code: 'already_member' }
- sendEmail kind 'invite' to the email: subject "<inviter name> invited you to <workspace> on Dossier", button "Accept invite" linking to APP_URL + '/invite/' + token, text "The link works for 7 days." dedupeKey 'invite:' + sha256(token).
- Return { ok: true }. Never return or log the token.

Curl test:
curl -X POST "https://<ref>.supabase.co/functions/v1/ds-invite-member" -H "Authorization: Bearer <OWNER_JWT>" -H "Content-Type: application/json" -d '{"workspace_id":"<ws>","email":"you+teammate@gmail.com","role":"reviewer"}'
Expected: {"ok":true}, an email arrives, and workspace_invites has a row whose token_hash is 64 hex characters. During the trial (3 seats) a fourth invite returns 402 seat_limit.

Plan first, then wait for my OK.`,
  },
  {
    name: 'ds-notify',
    purpose: 'Sends assignment digests, mention emails, due reminders, library review reminders and the 80% usage warning, each exactly once.',
    trigger: 'pg_cron every 15 minutes (x-cron-secret header)',
    secrets: ['RESEND_API_KEY', 'EMAIL_FROM', 'CRON_SECRET', 'APP_URL'],
    prompt: `${shared}

Build supabase/functions/ds-notify/index.ts. Read @PRD.md section 16 and DESIGN.md section 12.

Contract:
- POST with x-cron-secret. requireCron. Deploy with --no-verify-jwt.
- Window: the last 15 minutes rounded down (windowKey = floor(epoch / 900)).
- Assignments: questions whose assignee_id changed in the window. Read them from audit_events action 'questions.assigned' in the window, grouped by assignee and questionnaire. Respect notification_prefs.on_assign. One email per assignee per questionnaire per window, dedupe 'assigned:' + assignee + ':' + questionnaire + ':' + windowKey. List up to 5 question numbers and sections, link APP_URL/app/questionnaires/<id>?assignee=me.
- Mentions: question_comments created in the window with non-empty mentions; one email per mention, dedupe 'mention:' + comment_id + ':' + user_id, respecting on_mention. No comment text in the email, only author, questionnaire and a link to ?q=<question_id>.
- Due tomorrow: questions not approved or skipped, assignee set, due_at = tomorrow; one email per assignee per day, dedupe 'due:' + assignee + ':' + date.
- Library review: approved library answers with review_by = today + 14; one email per owner per day listing the count, dedupe 'review:' + owner + ':' + date, respecting on_review_due.
- Usage 80%: for workspaces with questions used >= 80% of plan_limits.questions this month, one email to the owner per month, dedupe 'usage80:' + ws + ':' + yyyy-mm.
- Look up emails from auth.users with the admin client (auth.admin.getUserById, cached per run). Skip users whose email bounced (email_log status 'bounced').
- Return { ok: true, sent, skipped, ms }.

Curl test:
curl -X POST "https://<ref>.supabase.co/functions/v1/ds-notify" -H "x-cron-secret: <CRON_SECRET>"
Assign 5 questions to a teammate, call it twice in a row: exactly one assignment email and one email_log row. Wrong secret: 401.

Plan first, then wait for my OK.`,
  },
]
