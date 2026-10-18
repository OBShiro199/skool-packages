// Helpdeck edge functions: one Claude Code prompt per function.
import type { EdgeFunctionDef } from '../../types'

const shared = `First, if supabase/functions/_shared/ does not exist yet, create these helpers (read @PRD.md section 9.0):
1. admin.ts: adminClient() with SUPABASE_URL and JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS')!).default (fall back to SUPABASE_SERVICE_ROLE_KEY), auth: { persistSession: false }.
2. auth.ts: requireUser(req) reads the Bearer token, calls supabase.auth.getClaims(token) on a publishable-key client and returns { userId, email, jwt } or throws HttpError(401). userClient(jwt) returns a client that sends the user's JWT so auth.uid() works in RPCs. requireMember(jwt, ws) calls rpc('has_workspace_role', { ws, roles: ['owner','admin'] }) through userClient and throws 403. requireAccess(ws) calls rpc('has_active_access') with the admin client and throws HttpError(402, 'paused'). requireCron(req) compares x-cron-secret with CRON_SECRET in constant time.
3. http.ts: HttpError(status, code, message), json(body, status, headers), cors(origin) allowing only APP_URL and http://localhost:3000, an OPTIONS handler. Error body { error: { code, message } }.
4. log.ts: log(fn, data) prints one JSON line. Never log keys, tokens, page text, visitor messages or emails.
5. retry.ts: withRetry(fn, { tries: 3, baseMs: 800 }), exponential backoff plus jitter, honours retry-after, retries only 429 and 5xx and network errors.
6. limits.ts: getLimits(ws) = rpc('plan_limits', { ws }) first row. consume(ws, kind, qty, cap, key, botId?, refId?) = rpc('try_consume'). meter(ws, kind, qty, costMicros, key, botId?, refId?) = rpc('meter'). Cost rules in micro-dollars: Claude Haiku input tokens x 0.10 + output tokens x 0.50; Voyage tokens x 0.06; Firecrawl page = 830 (Standard plan, $83 per 100,000 credits).
7. ratelimit.ts: allow(key, limit, windowSeconds) = rpc('try_rate_limit'). ipHash(req) = sha256Hex((x-forwarded-for first value or cf-connecting-ip) + IP_HASH_SALT).
8. widget-token.ts: mint({ b, h, v }, ttlSeconds) and verify(token) for tokens "hdw_<base64url payload>.<base64url HMAC-SHA256>" signed with WIDGET_TOKEN_SECRET using crypto.subtle. verify uses a constant-time compare and throws HttpError(401, 'token_expired' or 'bad_token'). Write 3 deno tests (valid, tampered, expired).
9. hosts.ts: normaliseHost(input) strips scheme, path, port and "www." for comparison; hostAllowed(host, allowed[]) supports exact, bare domain covering www, and "*.domain". "evilacme.com" must not match "acme.com". isPublicHttpsUrl(url) rejects IPs, localhost, .local, .internal and non-443 ports. Write 6 deno tests.
10. voyage.ts: embed(texts, inputType) POSTs https://api.voyageai.com/v1/embeddings with Bearer VOYAGE_API_KEY, body { model: 'voyage-3.5', input: texts, input_type: inputType, output_dimension: 1024 } inside withRetry. Returns { vectors, tokens } from data[].embedding and usage.total_tokens. Throws if any vector length is not 1024.
11. claude.ts: answerJson({ system, user, schema, maxTokens }) with npm:@anthropic-ai/sdk, model 'claude-haiku-5-5', max_tokens maxTokens, output_config { effort: 'low', format: { type: 'json_schema', schema } }, system as one text block with cache_control { type: 'ephemeral' }, no tools, no thinking param. If stop_reason is 'refusal' return { refused: true }. If 'max_tokens' or the JSON does not parse or fails zod, retry once, then throw HttpError(502, 'ai_invalid'). Return { data, usage, costMicros }.
12. email.ts: sendEmail({ ws, kind, to, subject, html, text, dedupeKey, replyTo }) skips addresses in email_suppressions (logs status 'suppressed'), inserts email_log first (on conflict dedupe_key do nothing; if nothing was inserted, return { skipped: true }), then POST https://api.resend.com/emails with Bearer RESEND_API_KEY and from EMAIL_FROM, then saves resend_id and status 'sent' (or 'failed' with the error).
13. chunk.ts: chunkMarkdown(markdown, title) per @PRD.md section 11, returning [{ ord, heading, content, tokenCount }]. Write 4 deno tests (headings split, overlap present, tiny sections merged, code block kept whole).
Then build the function below.`

export const edgeFunctions: EdgeFunctionDef[] = [
  {
    name: 'hd-crawl',
    purpose: 'Starts, re-starts or cancels a Firecrawl crawl for a bot, after checking access, plan page limits, the monthly crawl allowance and the re-crawl limit. Returns in under a second; the crawl runs async.',
    trigger: 'Called by the owner\'s browser from the Sources page (Crawl, Re-crawl, Cancel crawl buttons) and by onboarding',
    secrets: ['FIRECRAWL_API_KEY', 'APP_URL'],
    prompt: `${shared}

Build supabase/functions/hd-crawl/index.ts. Read @PRD.md sections 8.2, 9.1 and 12 first.

Contract:
- POST JSON { action: 'start' | 'cancel', botId: uuid, url?: string }. zod. 400 on bad input.
- requireUser. Load the bot with adminClient (404 if missing or is_demo). requireMember(jwt, bot.workspace_id). requireAccess(bot.workspace_id).
- action 'start':
  1. url = body.url ?? bot.start_url. 400 { code: 'url_required' } if none. isPublicHttpsUrl(url) or 400 { code: 'bad_url', message: 'Use a public https address like https://docs.acme.com.' }.
  2. 409 { code: 'crawl_running' } if this bot has a crawl_jobs row in queued, crawling or embedding.
  3. allow('recrawl:' + botId, 3, 86400) or 429 { code: 'recrawl_limit', message: 'You have re-crawled 3 times today. Try again tomorrow.' }.
  4. limits = getLimits(ws). allowanceLeft = limits.crawl_pages_month minus usage_used(ws, 'crawl_page') (call it through rpc). If allowanceLeft < 1: 402 { code: 'crawl_allowance' }. pageLimit = min(limits.pages_per_bot, allowanceLeft).
  5. Insert crawl_jobs { workspace_id, bot_id, start_url: url, page_limit: pageLimit, is_recrawl: bot.status !== 'empty', status: 'queued', created_by: userId }. Update bots set status 'crawling', start_url = url.
  6. POST https://api.firecrawl.dev/v2/crawl with Authorization: Bearer FIRECRAWL_API_KEY and body
     { url, limit: pageLimit, maxDiscoveryDepth: 5, sitemap: 'include', scrapeOptions: { formats: ['markdown'], onlyMainContent: true, removeBase64Images: true, blockAds: true }, webhook: { url: SUPABASE_URL + '/functions/v1/hd-firecrawl-webhook', metadata: { crawl_job_id, bot_id }, events: ['started', 'page', 'completed', 'failed'] } }.
     Before writing, check docs.firecrawl.dev for the current v2 crawl option names; if any differ, follow the docs and tell me which.
     Wrap in withRetry. On success save firecrawl_id = response.id, status 'crawling', last_event_at now().
  7. Firecrawl 402 or failure after retries: crawl_jobs status 'failed' with error, bot status back to the old value, email the founder (FOUNDER_EMAIL secret if set) with kind 'ops_alert' and dedupe key 'ops:firecrawl:' + today, return 502 { code: 'crawler_unavailable', message: 'Crawling is paused on our side. We have been alerted. Try again in an hour.' }.
  8. Return 202 { crawlJobId, status: 'crawling' }.
- action 'cancel': find the active crawl (404 if none). DELETE https://api.firecrawl.dev/v2/crawl/{firecrawl_id} (ignore 404). Set status 'cancelled', finished_at now(). Bot status 'ready' if chunk_count > 0 else 'empty'. Return 200 { status: 'cancelled' }.
- Log { fn, ws, bot, action, ms, status } only.

Curl tests (replace values):
curl -i -X POST "https://<ref>.supabase.co/functions/v1/hd-crawl" -H "Authorization: Bearer <USER_JWT>" -H "Content-Type: application/json" -d '{"action":"start","botId":"<bot uuid>","url":"https://docs.firecrawl.dev"}'
Expected: 202 {"crawlJobId":"...","status":"crawling"}. Run it again straight away: 409 crawl_running. No Authorization header: 401. url "http://10.0.0.1": 400 bad_url.

Plan first, then wait for my OK.`,
  },
  {
    name: 'hd-firecrawl-webhook',
    purpose: 'Receives Firecrawl crawl events, verifies the X-Firecrawl-Signature HMAC, saves each page with a content hash, queues embed jobs only for new or changed pages, meters crawl credits and queues the finish job.',
    trigger: 'Firecrawl webhook (crawl.started, crawl.page, crawl.completed, crawl.failed) signed with X-Firecrawl-Signature',
    secrets: ['FIRECRAWL_WEBHOOK_SECRET'],
    prompt: `${shared}

Build supabase/functions/hd-firecrawl-webhook/index.ts. Read @PRD.md sections 9.2 and 11 first.

Contract:
- POST only. Deploy with --no-verify-jwt (Firecrawl has no Supabase JWT).
- Read the raw body with await req.text() BEFORE parsing. Header X-Firecrawl-Signature looks like "sha256=<hex>". Compute HMAC-SHA256(raw body, FIRECRAWL_WEBHOOK_SECRET) as hex and compare in constant time. 401 on mismatch or missing header. If FIRECRAWL_WEBHOOK_SECRET is not set, return 500 and log 'secret_missing' (never accept unsigned calls).
- Parse JSON { success, type, id, data, metadata, error }. Validate with zod (passthrough for unknown fields). Invalid: return 200 and log (a bad body will never get better on retry).
- Find crawl_jobs by firecrawl_id = id (fallback metadata.crawl_job_id). Unknown or status cancelled: return 200, log 'ignored'.
- Always update crawl_jobs.last_event_at = now().
- type 'crawl.started': status 'crawling'.
- type 'crawl.page': for each doc in data (usually one):
  1. url = doc.metadata.sourceURL ?? doc.metadata.url. Skip if metadata.statusCode >= 400 or markdown missing or under 200 characters (increment nothing).
  2. Normalise the URL: lowercase host, drop the hash, drop utm_* params, drop a trailing slash (not on the root).
  3. Normalise markdown per @PRD.md section 11 and hash it with SHA-256 hex.
  4. meter(ws, 'crawl_page', 1, 830, 'crawlpage:' + crawl.id + ':' + sha256(url), bot_id, crawl.id).
  5. Select the existing page by (bot_id, url). If it exists and is excluded: update last_crawl_id and crawled_at only, stop.
  6. If it exists with the same content_hash: update last_crawl_id, crawled_at, title. Increment pages_found. Stop (no embedding, no Voyage cost).
  7. Else upsert pages { workspace_id, bot_id, url, title: doc.metadata.title ?? url, markdown, content_hash, status 'pending', last_crawl_id } on (bot_id, url). Insert jobs { workspace_id, kind 'embed_page', ref_id: page.id, payload: { crawl_id }, idempotency_key: 'embed:' + crawl.id + ':' + page.id } with on conflict do nothing. Increment pages_found and pages_changed (single UPDATE with column = column + 1).
- type 'crawl.completed': status 'embedding'. Insert jobs { kind 'finish_crawl', ref_id: crawl.id, idempotency_key: 'finish:' + crawl.id }, on conflict do nothing.
- type 'crawl.failed': status 'failed', error = body.error (max 500 chars), finished_at now(). Bot status 'ready' if chunk_count > 0 else 'error'. sendEmail kind 'crawl_failed' to the workspace owner, dedupe 'crawl_failed:' + crawl.id, subject "We could not read <host>", body with the error in plain words and a link to APP_URL/bots/<bot>/sources.
- Return 200 { ok: true } in under a second. Never call Voyage or Claude here.

Curl tests (make the signature with openssl):
BODY='{"success":true,"type":"crawl.started","id":"test-crawl-1","data":[],"metadata":{}}'
SIG=$(printf '%s' "$BODY" | openssl dgst -sha256 -hmac "<FIRECRAWL_WEBHOOK_SECRET>" | sed 's/^.* //')
curl -i -X POST "https://<ref>.supabase.co/functions/v1/hd-firecrawl-webhook" -H "Content-Type: application/json" -H "X-Firecrawl-Signature: sha256=$SIG" -d "$BODY"
Expected 200. Same body with -H "X-Firecrawl-Signature: sha256=abc": 401.
Then send the same crawl.page event twice for a real crawl id and show me (Supabase MCP) that jobs has one embed_page row for that page and usage_ledger has one crawl_page row.

Plan first, then wait for my OK.`,
  },
  {
    name: 'hd-embed-worker',
    purpose: 'Background worker on pg_cron. Claims queued jobs, chunks pages and embeds them with Voyage in batches of 64, swaps chunks page by page, finishes crawls, reconciles crawls whose webhooks went missing, and retries with backoff.',
    trigger: 'pg_cron every minute (x-cron-secret header)',
    secrets: ['VOYAGE_API_KEY', 'FIRECRAWL_API_KEY', 'RESEND_API_KEY', 'EMAIL_FROM', 'CRON_SECRET', 'APP_URL'],
    prompt: `${shared}

Build supabase/functions/hd-embed-worker/index.ts. Read @PRD.md sections 8, 9.3 and 11 first.

Contract:
- POST from pg_cron with x-cron-secret. requireCron. Deploy with --no-verify-jwt.
- Start: rpc('release_stuck_jobs'). Queue reconcile jobs: for crawl_jobs with status 'crawling' and last_event_at older than 15 minutes, insert jobs { kind 'reconcile_crawl', ref_id: crawl.id, idempotency_key: 'reconcile:' + crawl.id + ':' + floor(now / 15 min) } on conflict do nothing.
- rpc('claim_jobs', { p_limit: 20 }). Process one at a time. Stop starting new jobs after 100 seconds of wall time; leave the rest queued.
- Every job in try/catch. Success: status 'done'. Error: attempts + 1, last_error (no secrets, max 500 chars), status 'queued', run_after = now() + 2^attempts minutes + random 0 to 30 s. At attempts = 5: status 'dead'; for embed_page set the page 'failed' and crawl_jobs.pages_failed + 1. Voyage 429: wait retry-after (max 20 s) and retry inside withRetry; if it still fails, re-queue in 2 minutes WITHOUT counting an attempt.

kind 'embed_page':
1. Load the page (skip as done if deleted or excluded) and payload.crawl_id.
2. chunks = chunkMarkdown(page.markdown, page.title). If none: page 'embedded', chunk_count 0, done.
3. Embed chunk contents in batches of 64 with embed(texts, 'document'). Sum tokens.
4. Insert all new chunks { workspace_id, bot_id, page_id, crawl_id, ord, heading, content, token_count, embedding } (embedding as the JSON array string pgvector accepts).
5. Only after the insert succeeded: delete chunks where page_id = page.id and (crawl_id is null or crawl_id <> this crawl id). This keeps old chunks answering until the new ones exist.
6. Update the page: status 'embedded', chunk_count. Update crawl_jobs.pages_embedded + 1 (single UPDATE).
7. meter(ws, 'embed_tokens', tokens, round(tokens * 0.06), 'embed:' + job.id, bot_id, page.id).

kind 'finish_crawl':
1. If any jobs with kind 'embed_page', status in (queued, running) and payload->>crawl_id = this crawl exist: set this job queued with run_after now() + 30 s and attempts unchanged, return.
2. If crawl.pages_found < crawl.page_limit: delete pages where bot_id = crawl.bot_id and (last_crawl_id is distinct from crawl.id) and excluded = false. (A crawl that hit its limit never deletes pages.)
3. rpc('refresh_bot_counts', { p_bot }). Bot status 'ready' if chunk_count > 0 else 'error'. Crawl status 'ready' (or 'failed' with error "We found no readable pages. Try your docs or help centre URL." if zero pages), finished_at now().
4. If this is the bot's first crawl that reached 'ready': sendEmail kind 'crawl_ready', dedupe 'crawl_ready:' + bot.id, subject "<bot name> has read <n> pages. Ask it something", button to APP_URL/bots/<bot>/sources.
5. If the bot is a demo (is_demo), update demo_sessions set status 'ready' (or 'failed'), pages = page_count.

kind 'reconcile_crawl':
1. GET https://api.firecrawl.dev/v2/crawl/{firecrawl_id} with withRetry. Follow the next URL until it is absent, collecting data[].
2. status 'completed': for every page in data run the same save logic as hd-firecrawl-webhook crawl.page (move that logic into _shared/save-page.ts and use it in both). Then insert the finish_crawl job (idempotency 'finish:' + crawl.id).
3. status 'failed' or 'cancelled': mark the crawl failed. Still 'scraping': update last_event_at so we check again in 15 minutes.

Output: 200 { claimed, done, failed, requeued, ms }.

Curl test:
curl -i -X POST "https://<ref>.supabase.co/functions/v1/hd-embed-worker" -H "x-cron-secret: <CRON_SECRET>" -H "Content-Type: application/json" -d '{}'
Expected 200 with counts. Without the header: 401. After a real crawl, show me (Supabase MCP) select status, count(*) from jobs group by status, and the chunks count per page for the bot.

Plan first, then wait for my OK.`,
  },
  {
    name: 'hd-answer',
    purpose: 'Answers a visitor question from the bot\'s docs: verifies the widget token, rate limits, reserves an answer against the plan cap, embeds the question with Voyage, runs exact vector search and asks Claude Haiku for a JSON answer with sources and a confidence flag.',
    trigger: 'Called by the chat widget iframe, the owner test panel and the landing demo for every visitor message (widget token, no login)',
    secrets: ['ANTHROPIC_API_KEY', 'VOYAGE_API_KEY', 'WIDGET_TOKEN_SECRET', 'IP_HASH_SALT', 'RESEND_API_KEY', 'EMAIL_FROM', 'APP_URL'],
    prompt: `${shared}

Build supabase/functions/hd-answer/index.ts. Read @PRD.md sections 8.6, 9.4, 10.1, 10.3 and 12 first.

Contract:
- POST JSON { token: string, conversationId?: uuid, question: string (trimmed, 1 to 1000 chars), pageUrl?: string (max 2048) }. zod. 400 on bad input.
- CORS: allow only APP_URL and http://localhost:3000 (the widget iframe lives on our domain). Deploy with --no-verify-jwt.
- Order of checks (cheap ones first, so abuse costs us nothing):
  1. verify(token) gives { b: botId, h: host, v: visitorId }. Load the bot with adminClient (404 if missing).
  2. ip = ipHash(req). allow('q:v:' + botId + ':' + v, 20, 3600), allow('q:ip:' + ip, 60, 3600), allow('q:bot:' + botId, 600, 3600). Any false: 429 { code: 'slow_down', message: 'You are sending messages quickly. Try again in a few minutes.' } with retry-after.
  3. Demo bots (is_demo): load demo_sessions by bot_id; if questions_used >= 10 return 200 { mode: 'demo_limit' }; else increment questions_used. Demo bots skip steps 4 and 5 and meter kind 'demo_answer'.
  4. Mode: if !has_active_access(ws) or bot.paused_by_plan return 200 { mode: 'paused', answer: null }. If bot.chunk_count = 0 return { mode: 'not_ready', answer: null }.
  5. limits = getLimits(ws). requestId = crypto.randomUUID(). consume(ws, 'answer', 1, limits.answers_month, 'answer:' + requestId, botId). False: sendEmail kind 'cap_reached' to the owner (dedupe 'cap:' + ws + ':' + yyyy-mm), return 200 { mode: 'email_only', answer: null }.
- Conversation: if conversationId is given, load it and check bot_id = botId and visitor_id = v (else ignore it and start a new one). New: insert { workspace_id, bot_id, visitor_id: v, ip_hash, host: h, page_url, is_test: h === 'app', first_question: question }.
- History: last 6 messages of the conversation, each trimmed to 300 characters.
- Retrieval: embed([question], 'query'). rpc('match_chunks', { p_bot_id, p_embedding, p_count: 8 }). Keep similarity >= 0.30, top 6. topSimilarity = first similarity or 0.
- Claude: answerJson with the system prompt from @PRD.md section 10.1 (fill bot name and the workspace name as company), the user message built exactly as section 10.1 shows (escape < > & in every value; ids are "c_1".."c_6"), the schema from section 10.1, maxTokens 1024. If no chunks were kept, still call Claude with an empty <docs> so it can answer greetings, but force confident false.
- Refused: answer "I'm not able to answer that one. Want a human to email you?", confident false, reason 'error'.
- Validate the output: keep only source_ids we sent, map them to { title, url } (dedupe by url, max 3). Remove any markdown link or bare URL in the answer whose URL is not one of those source URLs. If topSimilarity < 0.45 force confident false.
- Writes (admin client): user message { role 'user', content: question }, assistant message { role 'assistant', content: answer, question, sources, confident, reason, top_similarity, input_tokens, output_tokens, latency_ms }. Conversation: message_count + 2, last_message_at now(), low_confidence_count + 1 if not confident, status 'open' if it was 'closed'.
- If not confident and reason is not 'off_topic': rpc('record_gap', { p_bot, p_question: question, p_conversation }).
- First live sighting: if h is not 'app' or 'demo' and bot.first_seen_at is null, set first_seen_at; always set last_seen_host = h and last_seen_at now() (at most once a minute).
- Metering: update the ledger row for 'answer:' + requestId with cost_micros = Claude cost + Voyage cost (meter() with the same key does this). If Voyage or Claude failed before spending, delete that ledger row so the visitor is not charged an answer.
- Output 200 { conversationId, mode: 'live', answer, sources, confident, offerHandoff: !confident || reason === 'needs_human' }.
- Voyage or Claude down after retries: 502 { code: 'assistant_unavailable', message: 'The assistant is unavailable right now. Leave your email and we will reply.' }.
- Log { fn, ws, bot, ms, confident, top: topSimilarity } only. Never log the question or answer.

Curl tests: mint a test token first with a small deno script that uses _shared/widget-token.ts and host 'app', then
curl -i -X POST "https://<ref>.supabase.co/functions/v1/hd-answer" -H "Origin: http://localhost:3000" -H "Content-Type: application/json" -d '{"token":"<TOKEN>","question":"How do I start a crawl?"}'
Expected 200 with confident true and at least one source. Ask "What is your refund policy for pizza?": confident false, offerHandoff true. A token with one changed character: 401. 21 questions from the same visitor in a loop: the 21st is 429.

Plan first, then wait for my OK.`,
  },
  {
    name: 'hd-handoff',
    purpose: 'Emails the bot owner the full transcript with reply-to set to the visitor when the visitor asks for a human, once per conversation, rate limited, never emailing the visitor.',
    trigger: 'Called by the chat widget when the visitor submits their email on the "not sure" card or in email-only mode (widget token, no login)',
    secrets: ['RESEND_API_KEY', 'EMAIL_FROM', 'WIDGET_TOKEN_SECRET', 'IP_HASH_SALT', 'APP_URL'],
    prompt: `${shared}

Build supabase/functions/hd-handoff/index.ts. Read @PRD.md sections 9.5 and 13 first.

Contract:
- POST JSON { token, conversationId?: uuid, email: string (valid email, max 254), note?: string (max 1000), pageUrl?: string }. zod. CORS as hd-answer. Deploy with --no-verify-jwt.
- verify(token) gives { b, h, v }. Load the bot (404).
- Rate limits: allow('ho:v:' + b + ':' + v, 3, 86400), allow('ho:bot:' + b, 30, 86400), allow('ho:ip:' + ipHash(req), 10, 86400). 429 with a friendly message.
- Conversation: if conversationId is given, it must belong to bot b AND visitor v, else 404 { code: 'not_found' }. If missing (email_only mode before any chat), create one with first_question = note or "(no question, left an email)".
- Already handed_off: return 200 { ok: true, already: true } and send nothing.
- To: bot.handoff_email, or the workspace owner's login email (auth.admin.getUserById). If the target is in email_suppressions, still mark the conversation handed off and set a flag so the owner sees the bouncing banner; return 200.
- Build the email from @PRD.md section 13 and @DESIGN.md section 16.1: all visitor and bot text HTML-escaped, bot sources as links, low confidence marked, the note, the page, the time in UTC, and a button to APP_URL/bots/<botId>/conversations?c=<conversationId>. Plain text part too.
- sendEmail({ ws, kind: 'handoff', to, subject: 'Customer question needs you: ' + first 60 chars of first_question, replyTo: email, dedupeKey: 'handoff:' + conversationId }).
- If the workspace has handoff_copy on and the target is not the owner's login email, also send a copy to the owner's login email (dedupe 'handoff-copy:' + conversationId).
- Update the conversation: status 'handed_off', visitor_email, handoff_note, handed_off_at now().
- Never send any email to the visitor's address.
- Output 200 { ok: true }.

Curl tests:
curl -i -X POST "https://<ref>.supabase.co/functions/v1/hd-handoff" -H "Origin: http://localhost:3000" -H "Content-Type: application/json" -d '{"token":"<TOKEN>","conversationId":"<id from hd-answer>","email":"me@example.com","note":"Test handoff"}'
Expected 200 {"ok":true} and one handoff email in the owner's inbox with Reply going to me@example.com. Send it again: {"ok":true,"already":true} and no second email. Use a token for a different visitor id with the same conversationId: 404.

Plan first, then wait for my OK.`,
  },
  {
    name: 'hd-demo',
    purpose: 'Runs the landing page "Try it on your site" demo: caps demos per IP, per email and per day, creates a demo bot in the hidden demo workspace, crawls up to 15 pages through the normal pipeline, emails the demo link and reports progress.',
    trigger: 'Called by the landing page demo form (public, no login) and polled by it for status every 2 seconds',
    secrets: ['FIRECRAWL_API_KEY', 'DEMO_WORKSPACE_ID', 'DEMO_DAILY_CAP', 'WIDGET_TOKEN_SECRET', 'IP_HASH_SALT', 'RESEND_API_KEY', 'EMAIL_FROM', 'APP_URL'],
    prompt: `${shared}

Build supabase/functions/hd-demo/index.ts. Read @PRD.md section 9.6 and @LANDING.md section 6 first.

Contract:
- POST JSON, discriminated union on action. CORS allows APP_URL and http://localhost:3000. Deploy with --no-verify-jwt.
- action 'start' { url, email }:
  1. zod: url is isPublicHttpsUrl, email valid. 400 { code: 'bad_url', message: 'We could not read that site. Try your docs or help centre URL instead of your homepage.' }.
  2. ip = ipHash(req). Caps: allow('demo:ip:' + ip, 3, 86400), allow('demo:email:' + lower(email), 1, 86400), allow('demo:all', Number(DEMO_DAILY_CAP ?? 50), 86400). Any false: 429 { code: 'demo_limit', message: 'Demo limit reached for today. Start a free trial to train it on your whole site.' }.
  3. Guess a brand colour: fetch the URL (5 s timeout, max 200 KB read) and look for <meta name="theme-color" content="#rrggbb">. Fallback '#111214'.
  4. Insert a bot { workspace_id: DEMO_WORKSPACE_ID, name: host + ' assistant', brand_colour, is_demo: true, start_url: url, status 'crawling' }.
  5. Insert crawl_jobs with page_limit 15 and start the Firecrawl crawl exactly like hd-crawl (move the Firecrawl start call into _shared/firecrawl.ts and use it in both).
  6. Insert demo_sessions { ip_hash, email, start_url: url, host, bot_id, crawl_job_id, status 'crawling' }.
  7. sendEmail({ ws: DEMO_WORKSPACE_ID, kind: 'demo_link', to: email, subject: 'Your Helpdeck demo bot for ' + host, dedupeKey: 'demo:' + demoId }) with one button to APP_URL/demo/<demoId>. Nothing else in the email.
  8. Return 202 { demoId }.
- action 'status' { demoId }:
  - Load the demo session and its crawl. Expired (expires_at < now()): { status: 'expired' }.
  - steps: read = pages_found > 0, split = pages_embedded > 0, learn = crawl status in (embedding, ready), ready = demo status 'ready'.
  - When ready: suggestedQuestions = 3 questions made from the first 3 page titles ("How do I <title lowercased>?" when the title starts with a verb, else "What is <title>?"), token = mint({ b: bot_id, h: 'demo', v: 'demo-' + demoId }, 7200), botId.
  - Return { status, pages: crawl.pages_found, steps, botId?, token?, suggestedQuestions?, brandColour }.
- Log { fn, action, demoId, ms } only.

Curl tests:
curl -i -X POST "https://<ref>.supabase.co/functions/v1/hd-demo" -H "Origin: http://localhost:3000" -H "Content-Type: application/json" -d '{"action":"start","url":"https://docs.firecrawl.dev","email":"me@example.com"}'
Expected 202 {"demoId":"..."}. Then every few seconds:
curl -s -X POST "https://<ref>.supabase.co/functions/v1/hd-demo" -H "Origin: http://localhost:3000" -H "Content-Type: application/json" -d '{"action":"status","demoId":"<id>"}'
until status is 'ready' with a token. Run the start call 4 times from the same machine: the 4th is 429 demo_limit.

Plan first, then wait for my OK.`,
  },
  {
    name: 'hd-digest',
    purpose: 'Daily: usage warnings at 80 percent, closes idle conversations and cleans up expired demos, old rate limit rows and old conversations. Weekly: groups each Growth bot\'s open docs gaps into topics with Claude Haiku and emails the owner.',
    trigger: 'pg_cron daily at 08:10 UTC with body {"kind":"daily"}, and Mondays 08:20 UTC with {"kind":"weekly"} (x-cron-secret header)',
    secrets: ['ANTHROPIC_API_KEY', 'RESEND_API_KEY', 'EMAIL_FROM', 'CRON_SECRET', 'APP_URL'],
    prompt: `${shared}

Build supabase/functions/hd-digest/index.ts. Read @PRD.md sections 9.7, 10.2 and 13 first.

Contract:
- POST JSON { kind: 'daily' | 'weekly' } with x-cron-secret. requireCron. Deploy with --no-verify-jwt.

kind 'daily':
1. Usage warnings: for each workspace with an active or trialing subscription and usage_alerts on, compare usage_used(ws, 'answer') with plan_limits(ws).answers_month. At 80 percent or more (and under 100), sendEmail kind 'usage_warning' to the owner, dedupe 'usage80:' + ws + ':' + yyyy-mm, subject "You have used 80% of this month's answers", body with the numbers, the reset date and a button to APP_URL/billing.
2. Close conversations: status 'open' and last_message_at older than 24 hours become 'closed'.
3. Demos: demo_sessions with expires_at < now() and status not 'claimed': delete their bots (cascades pages, chunks, conversations) and set status 'expired'.
4. Delete rate_limits rows with window_start older than 2 days. Delete conversations older than 12 months (in batches of 1,000). Delete jobs with status 'done' older than 7 days.
5. Return { warned, closed, demosExpired, ms }.

kind 'weekly':
1. Workspaces where plan_limits(ws).weekly_digest is true and workspaces.weekly_digest is on.
2. For each of their bots: open doc_gaps with last_asked_at in the last 7 days, ordered by times_asked desc, max 200. Skip bots with fewer than 3.
3. answerJson with the system prompt and schema from @PRD.md section 10.2, maxTokens 4096. User: <questions> with one line per gap "g_<n> | <times_asked> | <sample_question escaped>". Map gap ids back in code, ignore unknown ids.
4. meter(ws, 'digest', 1, costMicros, 'digest:' + bot.id + ':' + isoWeek, bot.id).
5. sendEmail kind 'gaps_digest', dedupe 'digest:' + bot.id + ':' + isoWeek, subject "<n> things your docs are missing this week", the top 5 topics as in @DESIGN.md section 16.1, button to APP_URL/bots/<bot>/gaps.
6. One workspace failing must not stop the others (try/catch per workspace, log the error).
7. Return { workspaces, emailsSent, ms }.

Curl tests:
curl -i -X POST "https://<ref>.supabase.co/functions/v1/hd-digest" -H "x-cron-secret: <CRON_SECRET>" -H "Content-Type: application/json" -d '{"kind":"daily"}'
Expected 200 with counts. Without the header: 401. To test weekly, temporarily map your test price to Growth (update plan_prices set plan = 'growth' where price_id = '<your test price id>'), ask 3 questions your docs do not cover, run {"kind":"weekly"} and check your inbox. Run it again: no second email (dedupe).

Plan first, then wait for my OK.`,
  },
  {
    name: 'hd-resend-webhook',
    purpose: 'Receives Resend delivery events, verifies the Svix signature, de-duplicates by svix-id, updates email_log and adds bounced or complaining addresses to email_suppressions.',
    trigger: 'Resend webhook (email.delivered, email.bounced, email.complained) signed with svix-id, svix-timestamp and svix-signature headers',
    secrets: ['RESEND_WEBHOOK_SECRET'],
    prompt: `${shared}

Build supabase/functions/hd-resend-webhook/index.ts. Read @PRD.md section 9.8 first.

Contract:
- POST only. Deploy with --no-verify-jwt.
- Raw body with await req.text(). Verify with npm:svix: new Webhook(RESEND_WEBHOOK_SECRET).verify(raw, { 'svix-id', 'svix-timestamp', 'svix-signature' } from the headers). Throws: 401. (Check the Resend webhook docs for the current header names first; if they differ, follow the docs and tell me.)
- De-dup: insert webhook_events { provider: 'resend', event_id: svix-id }. Duplicate key: return 200.
- Body { type, data: { email_id, to: string[] } }.
  - 'email.delivered': update email_log set status 'delivered' where resend_id = data.email_id.
  - 'email.bounced': status 'bounced'; insert each address into email_suppressions with reason 'bounced' (on conflict do nothing).
  - 'email.complained': status 'complained'; suppress with reason 'complained'.
  - Other types: 200, ignored.
- Return 200 { ok: true } quickly. If handling throws after the de-dup insert, delete that webhook_events row and return 500 so Resend retries.

Curl test: an unsigned call must fail:
curl -i -X POST "https://<ref>.supabase.co/functions/v1/hd-resend-webhook" -H "Content-Type: application/json" -d '{"type":"email.bounced","data":{"email_id":"x","to":["a@b.com"]}}'
Expected 401. Then in the Resend dashboard, Webhooks, your endpoint, send a test event and check webhook_events has its id.

Plan first, then wait for my OK.`,
  },
]
