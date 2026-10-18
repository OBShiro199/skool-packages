// Harvest edge functions: one Claude Code prompt per function.
import type { EdgeFunctionDef } from '../../types'

const shared = `First, if supabase/functions/_shared/ does not exist yet, create these helpers (read @PRD.md sections 12 and 13 intro):
1. admin.ts: adminClient() with Deno.env.get('SUPABASE_URL') and the secret key from JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS'))['default'] (fall back to SUPABASE_SERVICE_ROLE_KEY), auth: { persistSession: false }.
2. auth.ts: requireUser(req) reads the Bearer token and calls supabase.auth.getClaims(token), returns { userId, email, jwt } or throws HttpError(401). requireMember(jwt, ws, roles?) calls is_workspace_member / has_workspace_role through a client that carries the user's JWT (so auth.uid() works) and throws 403. requireAccess(ws) calls has_active_access with the admin client and throws 402 { code: 'paused' }. requireCron(req) compares x-cron-secret with CRON_SECRET in constant time and throws 401.
3. http.ts: HttpError(status, code, message), json(body, status), CORS headers for APP_URL and http://localhost:3000, OPTIONS handler. Error body: { error: { code, message } }.
4. log.ts: log(fn, data) prints one JSON line. Never log names, headlines, comments, emails, tokens or API keys. Ids and counts only.
5. retry.ts: withRetry(fn, { tries: 3, baseMs: 800 }) with exponential backoff + jitter, honours retry-after, retries only 429 and 5xx, 25 second timeout per attempt with AbortController.
6. clock.ts: deadline(ms = 45000) returns { left(), expired() } so cron workers stop at 45 seconds and leave the rest for the next tick.
7. jobs.ts: claim(kinds, n) = rpc('claim_jobs'), enqueue(ws, run, kind, payload, key, delaySec) = rpc('enqueue_job'), done(id) = rpc('finish_job'), fail(id, err) = rpc('fail_job'). Every worker loop: claim, try { work; done } catch { fail }, until the deadline.
8. meter.ts: meter({ ws, kind, quantity, costMicros, refId, key }) = rpc('meter'), returns false if the key was already used (then do not charge again).
9. limits.ts: limits(ws) = rpc('plan_limits'), remainingEngagements(ws), remainingEnrichments(ws).
10. claude.ts: callClaude({ system, cachedBlocks, userContent, schema, zodSchema, maxTokens }) using npm:@anthropic-ai/sdk with model 'claude-haiku-5-5', structured output with the JSON schema (check the current Anthropic docs for the exact parameter: output_config.format json_schema; if Haiku rejects it, use one forced tool call with the same schema and tell me). No tools are offered for the model to call. System and cachedBlocks get cache_control { type: 'ephemeral' }. stop_reason 'refusal' throws HttpError(422, 'ai_refused'); 'max_tokens' throws HttpError(502, 'ai_truncated'). Parse, validate with zod, retry once on invalid JSON. Return { data, usage, costMicros } where costMicros = round(input_tokens*0.1 + cache_read_input_tokens*0.01 + cache_creation_input_tokens*0.125 + output_tokens*0.5).
11. untrusted.ts: wrapUntrusted(obj) returns '<untrusted_data>' + JSON.stringify(obj) + '</untrusted_data>' after stripping the strings '<untrusted_data>' and '</untrusted_data>' from every value, and cutting each string to its field limit.
12. email.ts: sendEmail({ ws, userId, kind, to, subject, html, text, dedupeKey }) inserts email_log first (on conflict dedupe_key do nothing, and returns { skipped: true } if it already existed), then POST https://api.resend.com/emails with Authorization: Bearer RESEND_API_KEY and an Idempotency-Key header equal to dedupeKey, then updates resend_id and status.
13. linkedin.ts: parseLinkedInUrl(url) returns { kind: 'post' | 'creator', urlKey, canonicalUrl } or null for every format in @PRD.md 11.1, and personKey(profileUrl) per @PRD.md 8.1. Write 15 Deno tests with real-looking URLs (activity, share, ugcPost, feed/update, /in/ with trailing slash and query, URL-encoded ids, /company/, lnkd.in rejected).
14. providers/apify.ts, providers/apify-map.ts, providers/prospeo.ts, providers/millionverifier.ts, providers/crm.ts: thin typed clients as described in @PRD.md 12 and 17, every call through withRetry. Actor ids come from APIFY_REACTIONS_ACTOR, APIFY_COMMENTS_ACTOR and APIFY_POSTS_ACTOR (defaults harvestapi~linkedin-post-reactions, harvestapi~linkedin-post-comments, harvestapi~linkedin-profile-posts).
15. crypto.ts: encryptSecret(text) and decryptSecret(blob) with AES-GCM 256, key = base64 INTEGRATIONS_ENCRYPTION_KEY, 12 byte random IV, output base64(iv) + '.' + base64(ciphertext). hmacHex(secret, text) with SHA-256.
Then build the function below.`

export const edgeFunctions: EdgeFunctionDef[] = [
  {
    name: 'hv-add-source',
    purpose: 'Validates and normalises a LinkedIn post or creator URL, checks the plan\'s source cap, saves the source (and post) and optionally queues an immediate collection.',
    trigger: 'Called by the browser from Add source and onboarding step 3 (user JWT)',
    secrets: ['APP_URL'],
    prompt: `${shared}

Build supabase/functions/hv-add-source/index.ts. Read @PRD.md sections 11, 13.1 and 15.

Contract:
- POST, JSON { workspace_id: uuid, url: string (max 600), relation: 'mine'|'competitor'|'influencer', icp_id?: uuid, label?: string (max 120), collect_now?: boolean }. Validate with zod (npm:zod). 400 bad_request on bad input.
- requireUser, requireMember(workspace_id), requireAccess(workspace_id).
- Rate limit: rpc try_rate_limit('src:' + userId, 30, 3600) with the admin client, 429 rate_limited if false.
- parseLinkedInUrl(url). null returns 400 invalid_url with the exact message from @PRD.md 11.1.
- Cap: count sources for the workspace; if >= plan_limits.sources return 402 limit_reached "Your plan tracks up to N sources. Pause or remove one, or upgrade."
- Duplicate url_key returns 409 duplicate { source_id }.
- icp_id defaults to the workspace's default ICP. Insert sources (created_by = userId). For kind post, also insert posts with post_url = canonicalUrl, url_key, next_pass_at = now() (the first pass decides if it is too young and reschedules).
- collect_now: allowed if workspaces.collect_now_used_at is null, or older than 24 hours and status is not trialing. Create (or reuse) a daily_runs row with is_manual = true for today, enqueue 'collect_post' (or 'discover_posts' for a creator) with key 'now:' + source_id, run_after now, then set collect_now_used_at = now() (admin client). If not allowed, return queued: false with reason 'used_today'.
- Response 200 { source: { id, kind, url_key, status }, queued: boolean, reason?: string }.
- Log { fn, ws, kind, queued, ms }.

Deploy with JWT verification on.
Curl tests:
curl -X POST "https://<ref>.supabase.co/functions/v1/hv-add-source" -H "Authorization: Bearer <USER_JWT>" -H "Content-Type: application/json" -d '{"workspace_id":"<ws>","url":"https://www.linkedin.com/posts/someone_topic-activity-7380000000000000000-AbCd","relation":"competitor"}'
Expected: 200 with source.kind "post" and url_key "activity:7380000000000000000". Sending it again returns 409 duplicate. A URL like https://lnkd.in/abc returns 400 invalid_url. With no Authorization header: 401.

Plan first, then wait for my OK.`,
  },
  {
    name: 'hv-scheduler',
    purpose: 'Every 15 minutes creates each workspace\'s daily run at its local collect time, queues discovery and collection, polls lost Apify runs, readies finished runs and purges old data once a day.',
    trigger: 'pg_cron every 15 minutes (x-cron-secret)',
    secrets: ['CRON_SECRET', 'APIFY_TOKEN', 'ADMIN_EMAIL', 'RESEND_API_KEY'],
    prompt: `${shared}

Build supabase/functions/hv-scheduler/index.ts. Read @PRD.md sections 6.2, 6.3, 9.5 and 13.2.

Contract:
- POST with x-cron-secret. requireCron. Body ignored.
- Step 1, create runs: select workspaces with their timezone and collect_hour. For each, compute local date and local minutes past midnight with Intl.DateTimeFormat (no extra libraries). Start offset = collect_hour*60 + (first 8 hex chars of sha256(workspace_id) as int mod 120). If local minutes >= start offset and no daily_runs row exists for (ws, local date, is_manual false): insert it (on conflict do nothing). If has_active_access is false or the workspace has no active sources: set status 'skipped'. Else status 'collecting', started_at now, and enqueue 'discover_posts' (key 'disc:' + ws + ':' + date) when it has active creator sources, plus 'collect_post' (key 'coll:' + ws + ':' + date) with delay 300 seconds so discovered posts are included.
- Step 2: rpc release_stuck_jobs().
- Step 3, lost webhooks: apify_runs with status 'running' and started_at older than 20 minutes: GET /v2/actor-runs/{id}. SUCCEEDED: set succeeded + dataset_id and enqueue 'ingest_run' (key 'ing:' + run id). FAILED, ABORTED, TIMED-OUT: mark failed (hv-apify-webhook logic, share the code in _shared/apifyRuns.ts). Max 30 per tick.
- Step 4: rpc ready_finished_runs().
- Step 5, anomaly alert: if in the last 24 hours at least 10 reactions runs succeeded and more than 60% returned 0 items while their posts had reaction_count > 20, send one email to ADMIN_EMAIL with dedupeKey 'alert:zero:' + date: "Collection looks broken: N of M runs returned nothing. Check the actor page and the Apify console."
- Step 6: between 02:00 and 02:14 UTC, rpc purge_old_data() once (dedupe with a webhook_events row id 'purge:' + date).
- Stop at the 45 second deadline. Response { created, skipped, polled, readied, purged }.

Deploy with --no-verify-jwt (it checks the cron secret itself).
Curl test:
curl -X POST "https://<ref>.supabase.co/functions/v1/hv-scheduler" -H "x-cron-secret: <CRON_SECRET>"
Expected: {"created":N,...}. Run it twice: created is 0 the second time. Without the header: 401.

Plan first, then wait for my OK.`,
  },
  {
    name: 'hv-collect',
    purpose: 'Starts Apify runs for creator discovery and for post reactions and comments, with an ad-hoc webhook and a hard spend cap per run inside the workspace\'s remaining budget.',
    trigger: 'pg_cron every minute (x-cron-secret), works the discover_posts and collect_post jobs',
    secrets: ['CRON_SECRET', 'APIFY_TOKEN', 'APIFY_WEBHOOK_SECRET', 'APIFY_REACTIONS_ACTOR', 'APIFY_COMMENTS_ACTOR', 'APIFY_POSTS_ACTOR', 'ADMIN_EMAIL', 'RESEND_API_KEY'],
    prompt: `${shared}

Build supabase/functions/hv-collect/index.ts. Read @PRD.md sections 9.2, 12.1 and 13.3.

Contract:
- POST with x-cron-secret. Loop: claim(['discover_posts','collect_post'], 5) until the deadline.
- Shared startRun(ws, dailyRunId, kind, actorId, input, maxItems, postIds, sourceIds): builds the ad-hoc webhook array from @PRD.md 12.1 (requestUrl SUPABASE_URL + '/functions/v1/hv-apify-webhook', headersTemplate with x-harvest-secret = APIFY_WEBHOOK_SECRET), base64 encodes it, POST https://api.apify.com/v2/acts/{actorId}/runs?webhooks=...&maxTotalChargeUsd=... with Authorization: Bearer APIFY_TOKEN. maxTotalChargeUsd = maxItems * 0.002 + 0.05. Insert apify_runs (id = data.id). Open the actor's input schema page on apify.com before writing the input mapping and tell me the exact field names you used.
- discover_posts: active creator sources of the workspace, chunks of 25 profile URLs, posted in the last 48 hours, max 10 posts each. One run per chunk with kind 'posts'. Update sources.last_checked_at.
- collect_post: posts of the workspace with status 'tracking' and next_pass_at <= now(), joined to active sources. For each post: passes_done = 0 and posted_at younger than 24 h: set next_pass_at = posted_at + 24h and skip. Pass 3 only if reaction_count >= reactions_at_last_pass * 1.2, else mark done. Max items = max(50, (reaction_count - collected_reactions) * 1.1) capped at 2000 (reactions) and the same for comments.
- Budget: remaining = remainingEngagements(ws). If remaining <= 0: set daily_runs.counters.capped = true, send the 'cap100' email (dedupe 'cap100:' + ws + ':engagements:' + period_start), finish the job without starting anything. Otherwise shrink max items in order (biggest posts last) so the sum never exceeds remaining.
- Batching: up to 25 posts per run; any post with more than 1500 reactions gets its own run. One reactions run and one comments run per batch.
- After starting: posts.passes_done + 1, reactions_at_last_pass = reaction_count, next_pass_at = posted_at + 72h after pass 1, + 7 days after pass 2, null and status 'done' after pass 3. daily_runs.last_progress_at = now().
- Errors: Apify 402 or 403 (account out of credit or token problem): fail the job with no retry (set attempts to max) and email ADMIN_EMAIL (dedupe 'alert:apify:' + date). 429 and 5xx: withRetry, then fail(job) so it backs off.
- Log { fn, ws, runs_started, items_requested, ms }.

Deploy with --no-verify-jwt.
Test: add a real post as a source in the app, then
curl -X POST "https://<ref>.supabase.co/functions/v1/hv-collect" -H "x-cron-secret: <CRON_SECRET>"
Expected: {"claimed":1,"runs_started":2}. In the Apify console under Runs you see two runs (reactions and comments). In SQL: select id, kind, status, max_items from public.apify_runs order by started_at desc limit 5;

Plan first, then wait for my OK.`,
  },
  {
    name: 'hv-apify-webhook',
    purpose: 'Receives Apify run events, checks the shared secret, drops duplicates, confirms the run with the Apify API and queues ingestion. Never ingests inside the request.',
    trigger: 'Apify ad-hoc webhook (ACTOR.RUN.SUCCEEDED, FAILED, TIMED_OUT, ABORTED)',
    secrets: ['APIFY_TOKEN', 'APIFY_WEBHOOK_SECRET'],
    prompt: `${shared}

Build supabase/functions/hv-apify-webhook/index.ts. Read @PRD.md sections 12.1 and 13.4.

Contract:
- POST only. Compare header x-harvest-secret with APIFY_WEBHOOK_SECRET in constant time; mismatch or missing returns 401 and logs { fn, reason: 'bad_secret' }.
- Body (zod, passthrough): { eventType: string, eventData: { actorRunId: string } }. 400 if missing.
- Dedupe: insert webhook_events { id: 'apify:' + actorRunId + ':' + eventType, provider: 'apify' }. On conflict return 200 { duplicate: true }.
- Look up apify_runs by id. Not found returns 200 { ignored: true } (someone else's run or a test).
- Do not trust the body: GET https://api.apify.com/v2/actor-runs/{actorRunId} with the token. Use data.status and data.defaultDatasetId from that answer.
- SUCCEEDED: update apify_runs set status 'succeeded', dataset_id, webhook_at now, charged_usd from the run's usage total if the field exists. Enqueue 'ingest_run' { run_id } with key 'ing:' + run id, daily_run_id from the row. Update daily_runs status 'processing' and last_progress_at.
- FAILED, TIMED-OUT, ABORTED: status 'failed'. If retry_of is null, enqueue one 'collect_post' retry for the same workspace with key 'retry:' + run id and delay 1800 seconds (the post rows still have their pass due). If retry_of is set, increment sources.failures_in_row for the affected sources; at 3 set status 'error' and last_error "We could not read this post 3 times. It may be deleted or private."
- Respond within 2 seconds. Always 200 after the secret check passes, except a 500 if the database is down (Apify retries webhooks on failure [verify retry policy]).

Deploy with --no-verify-jwt.
Curl tests:
curl -X POST "https://<ref>.supabase.co/functions/v1/hv-apify-webhook" -H "Content-Type: application/json" -d '{"eventType":"ACTOR.RUN.SUCCEEDED","eventData":{"actorRunId":"abc"}}'
Expected: 401 (no secret).
Same with -H "x-harvest-secret: <APIFY_WEBHOOK_SECRET>": 200 {"ignored":true}. With a real run id from apify_runs: first call 200 {"ok":true}, second identical call 200 {"duplicate":true}.

Plan first, then wait for my OK.`,
  },
  {
    name: 'hv-ingest',
    purpose: 'Pages an Apify dataset into people and engagements, meters every result Apify charged for, applies suppression and the free keyword pre-check, then queues the AI prefilter.',
    trigger: 'pg_cron every minute (x-cron-secret), works ingest_run and import_csv jobs',
    secrets: ['CRON_SECRET', 'APIFY_TOKEN'],
    prompt: `${shared}

Build supabase/functions/hv-ingest/index.ts. Read @PRD.md sections 8.1, 10.2, 11.3, 12.1 and 13.5.

Contract:
- POST with x-cron-secret. Loop: claim(['ingest_run','import_csv'], 3) until the deadline.
- ingest_run payload { run_id, offset?: number }. Load apify_runs. GET /v2/datasets/{dataset_id}/items?clean=true&format=json&offset={offset}&limit=500.
- Map each item with the zod schema for the run kind (apify-map.ts). Save the first real item of each kind as supabase/functions/_shared/providers/fixtures/<kind>.json the first time you run this against a real dataset, and write Deno tests against those fixtures.
- posts kind: upsert posts (workspace_id, url_key) with source_id from the creator source, author, posted_at, text_excerpt (first 500 chars), reaction_count, comment_count, next_pass_at = posted_at + 24h. Increment sources.posts_found for new rows.
- reactions/comments kinds: personKey(linkedinUrl). Skip if is_suppressed(ws, personKey, null, null). Upsert people on (workspace_id, person_key): set full_name, headline (400 chars), location, last_engaged_at = greatest(existing, engaged_at or now), engagement_count + 1. Insert engagements on conflict do nothing (comment_id from the item for comments, '' for reactions; comment_excerpt first 500 chars). Update posts.collected_reactions / collected_comments and sources.engagers_collected.
- Do the database writes in batches (one upsert of up to 500 rows per table), not row by row.
- Meter: meter({ kind: 'engagements', quantity: items on this page, costMicros: items * 2000, refId: run_id, key: 'eng:' + run_id + ':' + offset }).
- Free pre-check for people whose enrich_status is 'new': if the headline contains any keywords_exclude or titles_exclude term of the source's ICP (whole word, case-insensitive), set enrich_status 'prefiltered_out', prefilter_reason 'Excluded keyword: <term>'.
- If the page had 500 items and the deadline is near: enqueue the same job kind with offset + 500 (key 'ing:' + run_id + ':' + newOffset) and finish this one. Else mark apify_runs status 'ingested', items_count, ingested_at.
- After the last page: enqueue 'prefilter' jobs for this run's remaining new people in chunks of 50 person ids (key 'pre:' + run_id + ':' + n). Update daily_runs.counters (collected, new_people, filtered_keyword) and last_progress_at.
- import_csv payload { import_id }: download the file from bucket imports, parse CSV (npm:csv-parse/sync), max 5,000 rows. kind suppression_csv: insert suppressions (email, domain or linkedin column, lower-cased). kind engagers_csv: treat each row as a reaction or comment on a synthetic post 'csv:' + import_id (create the post and a hidden source of kind post), check remainingEngagements first, then the same path as above. Update imports rows_total, rows_ok, status.

Deploy with --no-verify-jwt.
Test after a real Apify run finished:
curl -X POST "https://<ref>.supabase.co/functions/v1/hv-ingest" -H "x-cron-secret: <CRON_SECRET>"
Then in SQL: select count(*) from public.engagements; select enrich_status, count(*) from public.people group by 1; select sum(quantity) from public.usage_ledger where kind = 'engagements';
Expected: engagements and the ledger sum match the dataset item count. Running the function again adds nothing.

Plan first, then wait for my OK.`,
  },
  {
    name: 'hv-enrich',
    purpose: 'Runs the cheap Claude headline prefilter in batches of 50, then enriches only the best candidates inside the day\'s paced budget with Prospeo and verifies emails with MillionVerifier.',
    trigger: 'pg_cron every minute (x-cron-secret), works prefilter and enrich jobs',
    secrets: ['CRON_SECRET', 'ANTHROPIC_API_KEY', 'PROSPEO_API_KEY', 'MILLIONVERIFIER_API_KEY', 'ADMIN_EMAIL', 'RESEND_API_KEY'],
    prompt: `${shared}

Build supabase/functions/hv-enrich/index.ts. Read @PRD.md sections 9.3, 12.2, 12.3, 13.6 and 14.2.

Contract:
- POST with x-cron-secret. Loop: claim(['prefilter','enrich'], 3) until the deadline.
- prefilter payload { person_ids: uuid[] (max 50) }: load people still 'new' and their ICP (through the engagement's post's source icp_id, else the workspace default). Group by ICP. One callClaude per group with prompt 14.2: ICP as a cached block, the list as wrapUntrusted([{ i, headline, location }]). Validate every index once; missing ones get fit 0. Update prefilter_score, prefilter_reason, enrich_status = 'queued' when fit >= icp.prefilter_threshold, else 'prefiltered_out'. meter({ kind: 'ai_prefilter', quantity: people count, costMicros, key: 'aipre:' + job id }). When the last prefilter job of a daily run finishes (no queued or running prefilter jobs left for it), enqueue 'enrich' { ws, run } with key 'enr:' + ws + ':' + run_date + ':' + n.
- enrich payload { ws, run }: budget = min(remainingEnrichments(ws), max(5, ceil(remainingEnrichments(ws) / days left in the period))). Days left from subscriptions.current_period_end, else end of month. Pick people with enrich_status 'queued' ordered by prefilter_score desc limit budget.
- For each person: if another row with the same person_key in any workspace of the same owner was enriched in the last 90 days, copy its fields (no charge, no API call). Else POST Prospeo enrich-person with { data: { linkedin_url } }. Match: map fields, enrich_status 'enriched', meter({ kind: 'enrichments', quantity: 1, costMicros: 20000, key: 'enr:' + person id }). No match: 'no_match', no meter. Insufficient credits or invalid key: stop the loop, fail the job with attempts set to max, email ADMIN_EMAIL (dedupe 'alert:prospeo:' + date). Other errors: enrich_attempts + 1, status 'failed'.
- If an email came back: GET MillionVerifier with timeout=10. Map result to email_status (ok, catch_all, unknown, invalid; disposable counts as invalid). Clear email when invalid. meter({ kind: 'verifications', quantity: 1, costMicros: 3900, key: 'ver:' + person id }) only for ok, invalid and disposable.
- After enrichment check domain and email suppression with is_suppressed; suppressed people go to 'prefiltered_out' with reason 'Suppressed'.
- Enqueue 'score' jobs in chunks of 10 enriched person ids (key 'sc:' + job id + ':' + n). Update daily_runs.counters (prefiltered, enriched, no_match) and last_progress_at.
- If the budget was 0 while candidates were queued: counters.enrich_capped = true and send the cap100 email for enrichments once per period. At 80% send cap80 once per period.

Deploy with --no-verify-jwt.
Test: after hv-ingest ran,
curl -X POST "https://<ref>.supabase.co/functions/v1/hv-enrich" -H "x-cron-secret: <CRON_SECRET>"  (run it 2 or 3 times)
SQL: select enrich_status, email_status, count(*) from public.people group by 1, 2; select kind, sum(quantity), sum(cost_micros) from public.usage_ledger group by 1;
Expected: only people above the threshold were enriched, enrichments never exceed the plan cap, and no ledger key appears twice.

Plan first, then wait for my OK.`,
  },
  {
    name: 'hv-score',
    purpose: 'Scores each enriched person against the ICP with claude-haiku-5-5, writes reasons and a guarded opener that mentions what they engaged with, and upserts one lead per person.',
    trigger: 'pg_cron every minute (x-cron-secret), works score jobs',
    secrets: ['CRON_SECRET', 'ANTHROPIC_API_KEY'],
    prompt: `${shared}

Build supabase/functions/hv-score/index.ts. Read @PRD.md sections 9.4, 13.7, 14.3 and 14.4.

Contract:
- POST with x-cron-secret. Loop: claim(['score'], 5) until the deadline.
- payload { person_ids: uuid[] (max 10) }. For each person: load the person, the workspace (sender_company, sender_offer), the ICP, and the 3 most recent engagements with their post (author_name, text_excerpt first 300 chars, source relation) and comment_excerpt (first 300 chars).
- Re-score rule: if a lead exists with scored_at within 7 days and no engagement newer than scored_at, skip.
- callClaude with prompt 14.3: system and ICP cached, user content = wrapUntrusted({ person, engagements }). maxTokens 400.
- Opener guard (14.4): reject if it contains http, www., @, a phone pattern (7+ digits with spaces or dashes), "I saw", "I noticed", "loved your", an emoji (regex \\p{Extended_Pictographic}), or 9+ consecutive words from the comment. Retry once with a note "Your opener broke rule X. Write it again." Second failure: opener null.
- Tier from score: hot >= 80, warm >= 60, else cold (override the model if it disagrees).
- Upsert leads on (workspace_id, person_id): insert with status 'new'; on conflict update score, tier, reasons, disqualifiers, opener (only if opener_edited is false), opener_basis, scored_at, last_engagement_id, daily_run_id. Never change status here, except: if the person is suppressed set status 'customer'.
- meter({ kind: 'ai_score', quantity: 1, costMicros, key: 'aisc:' + person id + ':' + scored date }).
- Increment sources.leads_produced for new leads, daily_runs.counters.hot / warm / cold, last_progress_at.
- Write a Deno test with the injection example from @PRD.md acceptance test 9 using a mocked Claude reply that contains a link: the guard must reject it.

Deploy with --no-verify-jwt.
Test:
curl -X POST "https://<ref>.supabase.co/functions/v1/hv-score" -H "x-cron-secret: <CRON_SECRET>"
SQL: select tier, count(*), round(avg(score)) from public.leads group by 1; select opener from public.leads where opener is not null limit 5;
Expected: hot, warm and cold leads with sensible openers that mention a post topic or comment, no links, under 240 characters.

Plan first, then wait for my OK.`,
  },
  {
    name: 'hv-digest',
    purpose: 'Sends each recipient the morning digest of the top 20 new warm leads at the workspace\'s local digest time, once, and marks those leads as surfaced.',
    trigger: 'pg_cron every 15 minutes (x-cron-secret)',
    secrets: ['CRON_SECRET', 'RESEND_API_KEY', 'APP_URL', 'UNSUBSCRIBE_SECRET'],
    prompt: `${shared}

Build supabase/functions/hv-digest/index.ts and supabase/functions/_shared/templates/digest.ts. Read @PRD.md sections 13.8 and 16, and @DESIGN.md section 9 (digest email).

Contract:
- POST with x-cron-secret.
- For each workspace whose local time is past digest_hour today and whose today daily_runs row (is_manual false) has digest_sent_at null and status in ('ready','processing','failed','collecting'): if local time is before digest_hour + 3 hours and status is not 'ready', wait for the next tick unless local time is past digest_hour + 15 minutes (then send what exists and say "N people still processing").
- Recipients: workspace members with notification_prefs.digest_enabled, up to plan_limits.recipients, owner first.
- Leads: status in ('new','saved'), surfaced_at is null, tier at or above the recipient's digest_min_tier, from lead_rows (use the admin client and filter by workspace_id), ordered by email present first, then score desc, limit 20.
- Zero leads: send the quiet morning email only if yesterday's run did not also send one (dedupe 'quiet:' + ws + ':' + date), else skip.
- Subject: "12 warm leads from yesterday's posts" with singular "1 warm lead from yesterday's post" handled; hot count first if any: "3 hot and 9 warm leads from yesterday's posts".
- Body: as @DESIGN.md section 9. Each lead links to APP_URL + '/app/leads?lead=' + id. Never put the lead's email address in a mailto link. Footer: usage this period from usage_summary logic, settings link, one-click unsubscribe link APP_URL + '/api/unsubscribe?u=' + userId + '&w=' + ws + '&t=' + hmacHex(UNSUBSCRIBE_SECRET, userId + ':' + ws). Add List-Unsubscribe and List-Unsubscribe-Post headers.
- sendEmail with dedupeKey 'digest:' + ws + ':' + date + ':' + userId. Then set surfaced_at = now() on the leads sent, digest_sent_at on the run, status 'sent'.
- Escape every lead-supplied string for HTML (names, titles, company, comment excerpt, opener).

Deploy with --no-verify-jwt.
Test: set your workspace digest_hour to the current hour in Settings, then
curl -X POST "https://<ref>.supabase.co/functions/v1/hv-digest" -H "x-cron-secret: <CRON_SECRET>"
Expected: one email in your inbox and in Resend > Emails. Run it again: no second email, and select count(*) from public.email_log where kind = 'digest'; is still 1.

Plan first, then wait for my OK.`,
  },
  {
    name: 'hv-push',
    purpose: 'Saves CRM and webhook connections with the token encrypted, pushes leads to HubSpot, Pipedrive or a signed webhook with per-lead idempotency, and works queued push jobs for big lists.',
    trigger: 'Browser (user JWT) for connect, test and push; pg_cron every minute (x-cron-secret) for queued pushes',
    secrets: ['INTEGRATIONS_ENCRYPTION_KEY', 'CRON_SECRET', 'APP_URL'],
    prompt: `${shared}

Build supabase/functions/hv-push/index.ts. Read @PRD.md sections 13.9 and 17.

Routes (one function, action in the body):
- { action: 'connect', workspace_id, provider: 'hubspot'|'pipedrive'|'webhook', name, token?: string, url?: string }: requireMember with roles owner/admin, plan check (HubSpot and Pipedrive need plan_limits.crm_push). For webhook: url must be https, resolve DNS with Deno.resolveDns and reject private and loopback ranges from @PRD.md 17.2; generate a signing secret (32 random bytes hex) and return it ONCE in the response. For HubSpot and Pipedrive: test the token with a cheap read call (HubSpot GET /crm/v3/objects/contacts?limit=1, Pipedrive GET /api/v2/persons?limit=1 [verify]) and return 400 bad_token "HubSpot did not accept that token. Check the scopes in @PRD.md 17.3." if it fails. Store encryptSecret(token or signing secret) and secret_last4.
- { action: 'test', workspace_id, integration_id }: sends a sample lead (clearly named "Harvest test lead") and returns the provider's status.
- { action: 'push', workspace_id, integration_id, lead_ids?: uuid[] (max 200), list_id?: uuid }: requireMember, requireAccess, rate limit 'push:' + userId 20 per hour. More than 25 leads: enqueue 'push' jobs of 25 (key 'push:' + integration_id + ':' + hash of ids + ':' + date) and return { queued: n }. Else push inline.
- Cron mode (x-cron-secret, no action): claim(['push'], 3) and push.
Push logic per lead: idempotency key 'push:' + integration_id + ':' + lead_id + ':' + date; insert pushes on conflict do nothing and skip if it already exists with status done. Skip leads without an email for CRMs ("No email"). HubSpot: search by email, create or update, add a note with the engagement line and opener. Pipedrive: find or create the organisation by name, create the person, add a note. Webhook: body from @PRD.md 17.2, headers x-harvest-timestamp and x-harvest-signature v1=hmacHex(secret, timestamp + '.' + body), 10 second timeout, 3 tries. Success: pushes status done, external_id, leads.status 'pushed' if it was new or saved. Failure: status failed, error (first 300 chars, never the token). 3+ failures in a day for one integration: integrations.status 'error' and the push failed email.
- Response for push: { pushed, failed, results: [{ lead_id, status, external_id?, error? }] }.

Deploy with JWT verification off (it accepts both a user JWT and the cron secret, and checks each itself).
Curl test (webhook to a test receiver such as https://webhook.site):
curl -X POST "https://<ref>.supabase.co/functions/v1/hv-push" -H "Authorization: Bearer <USER_JWT>" -H "Content-Type: application/json" -d '{"action":"connect","workspace_id":"<ws>","provider":"webhook","name":"Test","url":"https://webhook.site/<id>"}'
Expected: { integration_id, signing_secret }. Then push one lead and see the signed POST arrive. Connecting http://127.0.0.1 or https://10.0.0.5 returns 400 bad_url.

Plan first, then wait for my OK.`,
  },
]
