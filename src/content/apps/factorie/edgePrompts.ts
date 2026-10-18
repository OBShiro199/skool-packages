// Factorie: full Claude Code prompts for each edge function, plus the shared helpers prompt.
// Kept plain (no backticks) so nothing needs escaping.

export const promptShared = `
Read @PRD.md sections 9 to 18 and Appendix A. Build the shared helpers every Factorie edge
function uses, in supabase/functions/_shared/. Plan first and wait for my OK.

Files:
1. supabase.ts: adminClient() using SUPABASE_URL and
   JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS")!)["default"], falling back to
   SUPABASE_SERVICE_ROLE_KEY. userClient(token) using the publishable key and the caller's
   Authorization header, so RLS applies.
2. auth.ts:
   - requireUser(req): reads "Authorization: Bearer <jwt>", calls supabase.auth.getClaims(token),
     returns { userId, token } or throws HttpError(401).
   - requireCron(req): compares the x-cron-secret header with CRON_SECRET using a constant-time
     compare (crypto.subtle.timingSafeEqual is not in Deno, so compare equal-length Uint8Arrays
     with a loop that never exits early). Missing or wrong: HttpError(401).
   - requireAccess(userId): rpc has_active_access(p_user) with the admin client; false: HttpError(402,
     "no_access").
   - requireBrand(userId, brandId): selects the brand with the admin client and checks
     brand.user_id === userId, else HttpError(404). Never 403 (do not reveal that it exists).
3. http.ts: json(body, status), HttpError class with status, code, message, corsHeaders(req)
   allowing only http://localhost:3000 and SITE_URL, handleOptions(req), and wrap(handler) that
   catches errors and returns { ok: false, code, message } with the right status.
4. validate.ts: parseBody(req, zodSchema) using npm:zod, returns 400 with the first issue message.
5. retry.ts: withRetry(fn, { tries, baseMs }) with exponential backoff, full jitter, and respect
   for a retry-after header (seconds or HTTP date). Only retries 408, 429, 500 to 504 and network
   errors. backoffFor(attempts) = 30s x 2^attempts + random 0 to 10s (for re-queued jobs).
6. pool.ts: runPool(items, limit, worker) that runs at most limit workers at once and returns
   settled results.
7. ledger.ts:
   - recordCost({ userId, brandId, vendor, operation, units, costUsd, ref, meta }) inserts into
     usage_ledger with upsert on (ref, operation) ignoreDuplicates true.
   - monthSpend(userId) via rpc month_spend.
   - assertBudget(userId, estimateUsd): reads plan_limits(p_user) and monthSpend; if spend +
     estimate > monthly_cost_cap_usd throws HttpError(402, "budget").
8. openrouter.ts: askEngine(engine, promptText, userTag) builds the exact request from PRD 10.2:
   POST https://openrouter.ai/api/v1/chat/completions, headers Authorization Bearer
   OPENROUTER_API_KEY, Content-Type, HTTP-Referer SITE_URL, X-Title "Factorie". Body: model =
   engine.openrouter_model, one user message, max_tokens 1200, user = userTag, plus
   plugins [{ id: "web", engine: "native" }] for web_mode native, [{ id: "web", engine: "exa",
   max_results: engine.max_results }] for exa, nothing for builtin and none. No system prompt, no
   temperature. AbortSignal.timeout(60000). Returns { text, annotations, citations, searchResults,
   usage, cost, id, model } and throws a typed EngineError(status, body, retryAfter) on non-200.
9. anthropic.ts: structured<T>(system, user, schema, { model, maxTokens, effort }) using
   npm:@anthropic-ai/sdk messages.create with output_config: { format: { type: "json_schema",
   schema }, effort }. Parse the first text block with JSON.parse, then validate again with a zod
   schema. Returns { data, usage, costUsd } where cost uses these prices per million tokens:
   claude-sonnet-5-5 $2 in / $10 out, claude-haiku-5-5 $0.10 in / $0.50 out.
10. guard.ts: wrapUntrusted(tag, text, maxChars) that strips any closing tag of the same name from
    the text, truncates to maxChars, and returns "<tag>...</tag>". Every scraped page and every
    engine answer goes through it before reaching Claude.
11. parser.ts: pass 1 of PRD 11.1 exactly (normalise with index map, aliases with stoplist,
    boundary regex, list detection, citations, competitor mentions, other_brands, highlights) and
    mergeParse(pass1, claude) from 11.3. Pure functions, no network.
12. prompts.ts: PARSER_SYSTEM, SUMMARY_SYSTEM, PROMPTGEN_SYSTEM, RECS_SYSTEM copied word for
    word from PRD 11.2 and 14, and their JSON schemas.
13. email.ts: sendEmail({ userId, kind, ref, day, to, subject, html }): insert email_log first (on
    conflict do nothing, return { skipped: true } if it already exists), then POST
    https://api.resend.com/emails with Authorization Bearer RESEND_API_KEY and
    Idempotency-Key "kind-ref-day". On final failure delete the email_log row so the next run
    retries. Writes a usage_ledger row (vendor resend, cost 0, ref = the Resend id).
14. log.ts: logLine(obj) prints one JSON line. Never log keys, page markdown or answer text.

Then write unit tests in supabase/functions/_shared/parser.test.ts with Deno.test for: numbered
list positions, bulleted list, heading items, brand only in prose (position null), alias with a
dot (factorie.io), stoplist word ("Notion" as a common word), UTM stripping in citations, two
lists counted in reading order. Run them with: deno test supabase/functions/_shared/
`

export const promptScrapeSite = `
Create supabase/functions/scrape-site/index.ts as described in @PRD.md sections 7, 14.1 and
Appendix A. Use the helpers in supabase/functions/_shared/.

Auth: requireUser, then requireBrand(userId, brand_id). No paid plan needed (it runs during
onboarding), but rate limit: max 3 scrapes per brand per day, counted from usage_ledger rows
with operation 'map' and brand_id today. Over the limit: 429 { code: "scrape_limit" }.

Input (zod): { brand_id: uuid }.

Steps:
1. Load the brand. Validate website_url: https only, hostname must contain a dot, reject IP
   addresses, localhost, .local and .internal (SSRF guard). 400 if bad.
2. Map: POST https://api.firecrawl.dev/v2/map with Authorization Bearer FIRECRAWL_API_KEY,
   body { url: website_url, limit: 200, sitemap: "include" }. Timeout 45s, withRetry 2 tries.
   Response: { success, links: [{ url, title, description }] }. Record cost: vendor firecrawl,
   operation map, units 1, cost 0.00083 (Standard plan price per credit), ref "map-<brand_id>-<date>-<n>".
3. Pick up to 12 URLs on the same domain: the homepage, then by keyword in the path: pricing,
   product/features/solutions, about, compare/vs/alternatives, customers/case-studies, blog
   (index page only), docs (index only). Insert each into site_pages with status 'found' and a
   page_type, so the onboarding screen shows "Finding pages (42 found)" over Realtime.
4. Scrape with runPool(limit 4): POST https://api.firecrawl.dev/v2/scrape with body { url,
   formats: ["markdown"], onlyMainContent: true, timeout: 30000 }. Response data.markdown and
   data.metadata.title. Update each site_pages row to 'reading' then 'read' with markdown cut to
   20,000 characters, or 'failed'. Record 1 credit per page (ref "scrape-<site_page_id>-<date>").
5. If fewer than 1 page was read: set brands.scrape_error, status 'draft', return { ok: true,
   pages: 0, summary: null } (onboarding continues with empty fields, never a dead end).
6. Brand summary: structured() with claude-sonnet-5-5, max 2000 tokens, effort low, SUMMARY_SYSTEM
   and the user message from PRD 14.1. Every page goes through wrapUntrusted("page", markdown, 6000),
   max 8 pages (home, pricing, product first). Record cost (operation brand_summary).
7. Validate: suggested_competitors domains must look like domains and must not equal the brand's
   own domain; drop anything else. Save to brands: name (if empty), category, one_liner, icp,
   problem, key_features, pricing_model, regions (from regions_hint), aliases, summary (whole JSON),
   status 'draft', scrape_error null.
8. Return { ok: true, pages, summary }.

Errors: Firecrawl 402 (out of credits): email FOUNDER_EMAIL once a day and return 503
{ code: "scrape_unavailable" }. Firecrawl 403/blocked: treat as "page failed". Anthropic failure
after retries: keep the pages, return summary null.
Log one line: { fn: "scrape-site", user_id, brand_id, pages, ms, cost_usd, outcome }.

Test with curl (use a real access token from the browser's local storage, or ask me to log in
and copy it):
curl -i -X POST "$SUPABASE_URL/functions/v1/scrape-site" -H "Authorization: Bearer $TOKEN" \\
  -H "Content-Type: application/json" -d '{"brand_id":"<brand id>"}'
Expect 200 with pages > 0. Without the Authorization header expect 401.
`

export const promptGeneratePrompts = `
Create supabase/functions/generate-prompts/index.ts from @PRD.md section 14.2.

Auth: requireUser, requireBrand. Rate limit: 3 generations per brand per day (count usage_ledger
operation 'prompt_gen' for the brand today); 429 { code: "regen_limit", left: 0 }.

Input (zod): { brand_id: uuid, replace?: boolean }.

Steps:
1. Load the brand, its competitors (names) and existing approved prompts (texts).
2. remaining = plan_limits(user).prompts minus active prompts across the user's brands. If 0,
   return 402 { code: "prompt_limit" }.
3. structured() with claude-sonnet-5-5, max 3000 tokens, effort medium, PROMPTGEN_SYSTEM. Build
   the user message from PRD 14.2. Wrap the brand fields with wrapUntrusted("brand", ...) because
   they came from a scraped site. Schema: exactly 20 prompts with text, intent, region, why.
4. Server checks: drop prompts that contain the brand name or any alias (case-insensitive);
   drop exact and near duplicates (lower-case, strip punctuation, compare to each other and to
   existing prompts); drop anything over 300 or under 8 characters. If fewer than 15 remain,
   make one more call asking only for the missing number with the intents that are short.
5. If replace is true, delete this brand's prompts where approved_at is null.
6. Insert as tracked_prompts with is_active false, approved_at null (the user approves in the UI,
   which flips is_active and approved_at, and the limit trigger checks the count).
7. Record cost (operation prompt_gen, ref "promptgen-<brand_id>-<timestamp>").
8. Return { ok: true, prompts: [{ id, text, intent, region, why }], regenerations_left }.

Log one summary line. Test:
curl -i -X POST "$SUPABASE_URL/functions/v1/generate-prompts" -H "Authorization: Bearer $TOKEN" \\
  -H "Content-Type: application/json" -d '{"brand_id":"<brand id>"}'
Expect 20 (or close to 20) prompts and none containing the brand name. Run it 4 times: the
4th returns 429.
`

export const promptRunChecks = `
Create supabase/functions/run-checks/index.ts from @PRD.md sections 9.2 to 9.7. It is the
scheduler and the queue drainer. pg_cron calls it every minute.

Auth: requireCron (x-cron-secret). 401 otherwise.

Input (zod): {} or { run_id?: uuid } (recheck calls it with a run id so the user does not wait).

Steps, all with the admin client:
1. If app_settings.checks_paused is true: log and return { ok: true, paused: true }.
2. Schedule: rpc schedule_due_runs(p_limit 50). For each result with code 'budget', send the
   budget_paused email (sendEmail kind budget_paused, ref brand_id, once a day).
3. Drain: rpc claim_check_jobs(p_limit 40). Then runPool(jobs, 8, job => POST
   SUPABASE_URL/functions/v1/check-prompt with header x-cron-secret and body { job_id }).
   Stop starting new jobs once 100 seconds of wall time have passed (leave headroom).
   If check-prompt answers { stop: true } (401 or 402 upstream), stop the pool immediately.
4. Also POST SUPABASE_URL/functions/v1/free-audit with { drain: true } (do not await more than
   2 seconds; it runs on its own).
5. Finish: rpc finish_runs(). For each finished run: rpc compute_daily_scores(p_brand, p_day
   today), set brands.last_checked_at = now(); for an onboarding run set brands.status 'active'
   and, if next_check_at is null, next_check_at = next_weekly_slot(...) (call the SQL function);
   for an onboarding run also send the first_run email.
6. Return { ok, scheduled, claimed, done, failed, ms }.

Idempotency: every step is safe to run twice (unique run index, skip locked claims, check-prompt
refuses jobs not in 'claimed'). Never throw away a job: if the pool is cut short, unclaimed jobs
stay queued and claimed ones are released by release_stuck_jobs after 10 minutes.
Log one line per invocation.

Then schedule the jobs with the Supabase MCP (PRD 9.7): store project_url and cron_secret in
Vault with vault.create_secret, and create fac-run-checks every minute with net.http_post reading
both from vault.decrypted_secrets. Show me select jobname, schedule, active from cron.job.

Test:
curl -i -X POST "$SUPABASE_URL/functions/v1/run-checks" -d '{}'                      # 401
curl -i -X POST "$SUPABASE_URL/functions/v1/run-checks" -H "x-cron-secret: wrong" -d '{}'   # 401
curl -i -X POST "$SUPABASE_URL/functions/v1/run-checks" -H "x-cron-secret: $CRON_SECRET" \\
  -H "Content-Type: application/json" -d '{}'                                       # 200
`

export const promptCheckPrompt = `
Create supabase/functions/check-prompt/index.ts from @PRD.md sections 9.4, 10 and 11. It runs
one job: one prompt asked to one engine, parsed and saved.

Auth: requireCron. Input (zod): { job_id: uuid }.

Steps:
1. Atomically move the job from 'claimed' to 'calling':
   update check_results set status 'calling' where id = job_id and status = 'claimed' returning *.
   No row: return 409 { code: "not_claimed" } (a double POST can never pay twice).
2. Load the engine row, the brand (name, domain, aliases), and its competitors (id, name, domain,
   aliases).
3. Budget: assertBudget(user_id, engine.est_cost_usd). On 402: rpc skip_budget_jobs(brand_id),
   set this job 'skipped_budget', return { ok: true, status: "skipped_budget" }.
4. askEngine(engine, job.prompt_text_snapshot, "brand_" + first 8 chars of sha256(brand_id)).
5. Handle errors exactly as PRD 10.4:
   - 408, 429, 5xx, timeout: attempts + 1; if attempts < 3 set status 'queued' and
     next_attempt_at = now + backoffFor(attempts) (or retry-after if larger), else 'failed'.
   - 400 mentioning the model: set engines.is_enabled = false, job 'failed', email FOUNDER_EMAIL
     (kind engine_paused, ref engine key, once a day).
   - 401 or 402: job back to 'queued' (no attempt used), set app_settings checks_paused = true for
     402, email FOUNDER_EMAIL (kind openrouter_topup), return { stop: true }.
   - Empty content: retry once like a 5xx, then 'failed' with last_error "empty answer".
6. Save the raw answer: answer_text, annotations, model_used, openrouter_id, prompt_tokens,
   completion_tokens, cost_usd = usage.cost (or computed from engine prices with cost_estimated
   true), status 'parsing'. recordCost(vendor openrouter, operation engine_check, ref job_id).
7. Parse pass 1 (parser.ts). If nothing tracked is mentioned and there is no list, skip pass 2
   (parse_mode regex_only). Otherwise pass 2: structured() with claude-haiku-5-5, max 800 tokens,
   effort low, PARSER_SYSTEM, the user message from PRD 11.2 with the answer wrapped by
   wrapUntrusted("answer", text, 12000). recordCost(vendor anthropic, operation parse, ref job_id).
   Two failures: regex only.
8. mergeParse, then save mentioned, in_list, position, list_length, sentiment, recommended,
   descriptor, answer_type, cited_urls, cited_domains, brand_cited, competitor_mentions (each with
   competitor_id), other_brands, highlights, parse_mode, checked_at now(), status 'done'.
9. Return { ok: true, status: "done", cost_usd }.

Never log answer text. Log { fn, job_id, engine, status, ms, cost_usd }.

Test: insert one queued job by running select public.create_run('<brand id>', 'recheck') in the
SQL editor, then select id from public.claim_check_jobs(1), then:
curl -i -X POST "$SUPABASE_URL/functions/v1/check-prompt" -H "x-cron-secret: $CRON_SECRET" \\
  -H "Content-Type: application/json" -d '{"job_id":"<id>"}'
Expect 200 and status done. Run the same curl again: expect 409, and
select count(*) from usage_ledger where ref = '<id>' and operation = 'engine_check' returns 1.
`

export const promptScoreDay = `
Create supabase/functions/score-day/index.ts from @PRD.md section 12.

Auth: requireCron. Input (zod): { brand_id?: uuid, day?: "YYYY-MM-DD", days_back?: 0 to 30 }.

Steps:
1. If brand_id is given: call rpc compute_daily_scores for that brand for day (default today)
   and, if days_back is set, for each earlier day too (used after a competitor is deleted).
2. Otherwise: rpc score_recent_brands() (every brand with answers in the last 2 hours).
3. Alerts: for each scored brand with alerts_email on, select from v_alerts for that brand (use
   the admin client and filter by brand_id), and send at most one alert email per brand per day
   (sendEmail kind alert, ref brand_id). Body lists the alerts and links to SITE_URL/app.
4. Return { ok, brands_scored, alerts_sent }.

No paid API calls. Then add the pg_cron job fac-score-day at minute 15 every hour (PRD 9.7)
with the Supabase MCP.

Test:
curl -i -X POST "$SUPABASE_URL/functions/v1/score-day" -H "x-cron-secret: $CRON_SECRET" \\
  -H "Content-Type: application/json" -d '{"brand_id":"<brand id>"}'
Then in the SQL editor: select engine_key, visibility, share_of_voice from daily_scores where
brand_id = '<brand id>' and day = current_date. Run the curl again: same rows, same numbers.
`

export const promptSendDigest = `
Create supabase/functions/send-digest/index.ts from @PRD.md section 16.

Auth: requireCron. Input (zod): { user_id?: uuid, test?: boolean }.

Steps:
1. Find users due now: profiles where digest_enabled, the hour in profiles.timezone equals
   digest_hour, has_active_access is true. With user_id: only that user (test mode ignores the
   hour but allows max 3 test sends per day, counted in email_log kind digest_test).
2. Skip a user if no brand has done results in the last 24 hours, unless today is Monday in
   their timezone (weekly summary).
3. For each brand of the user, gather with SQL (admin client): daily_scores 'all' today and 7
   days ago, per-engine rows with the last 7 days, the 5 biggest moves from v_rank_changes,
   new competitor mentions (competitors mentioned in the latest result but not the previous one,
   up to 5), other_brands seen 3+ times in 14 days, top 5 domains from v_source_domains, and the
   highest priority open recommendation (or the fallback sentence from PRD 14.4).
4. Render the HTML from PRD 16 and DESIGN.md section 11 (600px table layout, inline styles,
   7 small squares per engine coloured by band). Subject: "{Brand}: AI visibility {VS} ({delta}
   this week)". Add the unsubscribe link: SITE_URL/api/unsubscribe?token=<HMAC-SHA256 of user_id
   with DIGEST_SIGNING_SECRET> (also build that tiny Next.js route that verifies the HMAC and
   sets digest_enabled false).
5. Send with sendEmail (kind digest, ref user_id, day = the user's local date) to the user's email
   plus digest_recipients up to the plan's digest_recipients limit.
6. Return { ok, sent, skipped }.

Then add the pg_cron job fac-send-digest at minute 5 every hour.

Test:
curl -i -X POST "$SUPABASE_URL/functions/v1/send-digest" -H "x-cron-secret: $CRON_SECRET" \\
  -H "Content-Type: application/json" -d '{"user_id":"<your user id>","test":true}'
Expect the email in your inbox. A second identical curl the same day returns sent 0 for the
normal digest kind (idempotent).
`

export const promptRecheck = `
Create supabase/functions/recheck/index.ts from @PRD.md section 13.

Auth: requireUser, requireAccess. Input (zod): { prompt_id: uuid } or { brand_id: uuid,
scope: "all" }.

Checks in this order (return the first that fails):
1. The prompt (or brand) belongs to the user: requireBrand. 404 otherwise.
2. scope all: allowed only for the onboarding first run (brand has no check_runs yet: kind
   onboarding, free of the daily limit) or on Growth (counts as one recheck per active prompt).
3. Cooldown: no recheck_log row for this prompt in the last 10 minutes, else 429
   { code: "cooldown", retry_in_s }.
4. Daily limit: count recheck_log rows for the user since local midnight (profiles.timezone)
   under plan_limits.rechecks_per_day, else 402 { code: "limit_reached", resets_at }.
5. Budget: create_run checks it; code 'budget' becomes 402 { code: "budget" }.

On pass: insert recheck_log row(s), call rpc create_run(p_brand, kind 'recheck' (or
'onboarding'), now(), p_prompt), then POST SUPABASE_URL/functions/v1/run-checks with the cron
secret and { run_id } without awaiting more than 1 second. Return 200 { ok: true, run_id, jobs,
rechecks_left }.

Rate limit the endpoint itself: max 30 calls per user per minute (count recheck_log + a small
in-memory map is not enough across instances, so count recheck_log rows in the last minute).

Test:
curl -i -X POST "$SUPABASE_URL/functions/v1/recheck" -H "Authorization: Bearer $TOKEN" \\
  -H "Content-Type: application/json" -d '{"prompt_id":"<prompt id>"}'
First: 200 with a run_id. Same curl again straight away: 429 cooldown.
`

export const promptRecommendations = `
Create supabase/functions/generate-recommendations/index.ts from @PRD.md section 14.3.

Two ways in:
- Browser (Growth only, 1 per brand per day): requireUser, requireAccess, requireBrand, check
  plan_limits.recs_on_demand_per_day > 0 and no usage_ledger 'recommendations' row for this brand
  today. Starter gets 402 { code: "plan", next_refresh: recs_refreshed_at + 7 days }.
- Cron (daily at 03:30): requireCron, body {}: every active brand with recs_refreshed_at null or
  older than 7 days that has at least 20 done results, max 25 brands per call.

Steps per brand:
1. assertBudget(user_id, 0.08).
2. inputs = rpc recommendation_inputs(p_brand). If weak_prompts is empty, skip ("not enough data").
3. Optional freshness: re-scrape up to 5 of the brand's own pages older than 14 days with
   Firecrawl /v2/scrape (record 1 credit each). Skip if Firecrawl fails.
4. structured() with claude-sonnet-5-5, max 6000 tokens, effort medium, RECS_SYSTEM. The whole
   inputs JSON goes in wrapUntrusted("data", JSON.stringify(inputs), 60000).
5. Validate every item: target_prompt_ids must all be in inputs.weak_prompts ids; every
   source_url must appear in the inputs (top_urls, top_domains or own_pages); drop items that fail.
   If none survive, retry once with "Use only these ids: ..." added to the user message.
6. Insert recommendations with priority = impact x 2 - effort score (small 1, medium 2, large 3).
   Skip any whose title matches an open title (case-insensitive).
7. Set brands.recs_refreshed_at = now(). recordCost(operation recommendations, ref
   "recs-<brand_id>-<date>").

Return { ok, created }. Then add the pg_cron job fac-recommendations at 03:30 UTC daily.

Test (browser path):
curl -i -X POST "$SUPABASE_URL/functions/v1/generate-recommendations" -H "Authorization: Bearer $TOKEN" \\
  -H "Content-Type: application/json" -d '{"brand_id":"<brand id>"}'
Expect up to 5 created on Growth, 402 on Starter. Then:
select title, kind, priority, target_prompt_ids from recommendations order by created_at desc limit 5;
`

export const promptFreeAudit = `
Create supabase/functions/free-audit/index.ts from @PRD.md section 9b (the lead magnet).

Three ways in:
- POST from the public /audit page (no login): { email, website, brand_name, category,
  company_fax, rendered_at }.
- GET ?token=... from /audit/[token]: returns { status, score, results, brand_name, domain }
  (only these fields, never the email).
- POST { drain: true } with x-cron-secret: processes up to 3 queued audits.

Submit path:
1. zod: email, website (URL), brand_name 1 to 80, category 3 to 80. company_fax must be empty and
   now - rendered_at must be at least 3000 ms, else return 200 { ok: true } and do nothing (do not
   tell bots they failed).
2. Reject free email domains (gmail.com, googlemail.com, outlook.com, hotmail.com, yahoo.com,
   icloud.com, proton.me, aol.com): 400 "Use your work email so we can match it to your domain".
3. Normalise domain (lower-case, strip www.). ip_hash = sha256(ip + DIGEST_SIGNING_SECRET), ip from
   x-forwarded-for first value.
4. Limits from the audits table: same domain in 30 days (return the existing token instead of a
   new audit), 3 per ip_hash per day, app_settings audit_daily_cap per day across the app. Over a
   limit: 429 with a friendly message.
5. Insert the audit (status queued), return { ok: true, token }.

Drain path (per audit, status running):
1. Check the global daily cap like claim_check_jobs does; stop if reached.
2. One structured() call to claude-sonnet-5-5 (max 800 tokens) with PROMPTGEN_SYSTEM but "exactly 5"
   and the category, brand name and domain wrapped with wrapUntrusted.
3. Ask perplexity, chatgpt and deepseek (load the engine rows) each prompt with askEngine and
   runPool(limit 3). Parse with parser.ts pass 1 only (no Haiku pass, keep it cheap) using the
   brand name and domain as aliases.
4. results = [{ prompt, engine, mentioned, position, top_brands }], score = mean of
   100 x position_weight. Save, status done, finished_at.
5. recordCost for each call with user_id null and operation 'audit', ref "audit-<id>-<engine>-<n>".
6. sendEmail kind audit, ref audit id, to the email: score, top 3 brands named, link
   SITE_URL/audit/<token>, button "Start free trial" to SITE_URL/signup?utm_source=audit.
7. Any engine failing twice: keep going; the page shows "2 of 3 engines answered".

Test:
curl -i -X POST "$SUPABASE_URL/functions/v1/free-audit" -H "Content-Type: application/json" \\
  -d '{"email":"me@yourdomain.com","website":"https://yourdomain.com","brand_name":"Factorie","category":"AI visibility tracker","company_fax":"","rendered_at":0}'
Expect { ok: true, token }. A gmail.com email returns 400. The same domain again returns the
same token.
`
