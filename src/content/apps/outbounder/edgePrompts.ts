// Claude Code prompts for each Outbounder edge function. Backticks are escaped.

export const promptShared = `Before writing any edge function, create the shared helpers in supabase/functions/_shared/. Read @PRD.md sections 10 and 11 first.

Files:
1. _shared/supabase.ts: adminClient() using Deno.env.get('SUPABASE_URL') and the secret key (SUPABASE_SECRET_KEY if set, else SUPABASE_SERVICE_ROLE_KEY). auth: { persistSession: false }.
2. _shared/auth.ts:
   - requireUser(req): reads Authorization, creates a client with SUPABASE_URL + publishable key (SUPABASE_PUBLISHABLE_KEY, else SUPABASE_ANON_KEY) and that header, calls supabase.auth.getClaims(token). Returns { userId: claims.sub } or throws HttpError(401).
   - requireAccess(userId): rpc has_active_access with the admin client, HttpError(402, 'no_access') when false.
   - requireCron(req): constant-time compare of x-cron-secret with CRON_SECRET, HttpError(401) on mismatch.
3. _shared/http.ts: HttpError(status, code, message), json(body, status), CORS for APP_URL and http://localhost:3000, OPTIONS handler, and handle(fn) that wraps a handler, turns HttpError into JSON and anything else into 500 { code: 'internal' } without leaking the stack.
4. _shared/validate.ts: parse(schema, data) using zod (npm:zod@3) that throws HttpError(400, 'bad_input', first issue message).
5. _shared/usage.ts: reserve(userId, kind, qty, unitCost, key, refId?) calling rpc reserve_usage. Returns boolean. refund(userId, kind, qty, unitCost, key) inserts a negative line with key + ':refund'. Unit costs live in one exported const UNIT_COST = { lead_found: 0.0166, email_verified: 0.0037, page_scraped: 0.00083, ai_write: 0.008, ai_classify: 0.0002, email_sent: 0.0013 }.
6. _shared/ratelimit.ts: rateLimit(userId, fn, max = 20, windowSec = 60): counts events rows with type 'rl:' + fn for this user in the window, inserts one, throws HttpError(429, 'rate_limited') with retry_after when over.
7. _shared/log.ts: log(fn, data) prints one JSON line { fn, ts, ...data }. Never log email bodies, site text, API keys or full recipient addresses (log the domain only).
8. _shared/retry.ts: withRetry(fn, { tries: 3, baseMs: 1000 }) with exponential backoff and jitter; honour a retry-after header.
9. _shared/pool.ts: runPool(items, concurrency, worker) returning { ok, failed }.
10. _shared/budget.ts: startBudget(ms = 140000) returning { left(): number, done(): boolean } so workers stop claiming new work in time.
11. _shared/render.ts: renderTemplate(template, vars) replacing {{name}} tokens (unknown tokens stay so the UI can flag them) and wordCount(text). Must match lib/render.ts exactly.
12. _shared/rules.ts: isInsideWindow, nextWindowStart, rampCap. Must match lib/sending/rules.ts exactly.
13. _shared/crypto.ts: sha256Hex(text), randomToken(32 bytes, base64url), timingSafeEqual(a, b).
14. _shared/agentmail.ts: a tiny fetch client for https://api.agentmail.to with Authorization: Bearer AGENTMAIL_API_KEY. Methods: createPod({ name, client_id }), createDomain(podId, { domain, feedback_enabled }), getDomain(podId, domainId), verifyDomain(podId, domainId), createInbox(podId, { username, domain, display_name, client_id }), deleteInbox(podId, inboxId), send(inboxId, body, idempotencyKey), reply(inboxId, messageId, body, idempotencyKey). The idempotency key goes in the Idempotency-Key header. Use snake_case JSON on the wire. Check every path against the AgentMail API reference before writing (docs.agentmail.to/api-reference) and tell me what you confirmed.

Use Deno.serve in every function. Import supabase-js as npm:@supabase/supabase-js@2, zod as npm:zod@3, the Anthropic SDK as npm:@anthropic-ai/sdk and svix as npm:svix. No other dependencies unless I approve. Plan first, show me the files, then wait for my OK.
`

export const promptFindLeads = `Build supabase/functions/find-leads/index.ts. Read @PRD.md sections 4.1, 10.2, 11.1, 13 and 15, then read the Prospeo docs for Search Person (https://prospeo.io/api-docs/search-person) and Bulk Enrich Person (https://prospeo.io/api-docs/bulk-enrich-person). Write the exact filter keys, response fields and error codes you found into lib/leads/prospeo.ts comments and show me before coding. Never guess a filter name.

One function, two modes, chosen by header:

A. Enqueue (browser, Authorization header):
- requireUser, requireAccess, rateLimit(userId, 'find-leads').
- zod body: { campaign_id: uuid, count: 25 | 50 | 100 | 250 }. Header Idempotency-Key required (uuid), 400 if missing.
- Load the campaign with user_id = userId, 404 if not found.
- 409 { code: 'already_running' } if a lead_jobs row for this campaign is queued or running.
- Remaining leads: plan_limits(userId).leads minus this month's lead_found sum from usage_this_month. If remaining < count, 402 { code: 'limit_reached', kind: 'lead_found', limit, used }.
- Insert lead_jobs (user_id, campaign_id, requested = count, idempotency_key). On unique violation (same key), return the existing job. Set campaign status 'building' if it was 'draft'.
- Return 202 { ok: true, job_id }. This must finish in under 2 seconds.

B. Worker (pg_cron every minute, x-cron-secret):
- requireCron. Budget 120 s. rpc claim_lead_job(); no job -> 200 { ok: true, idle: true }.
- Load the campaign ICP. Map it to Prospeo filters in lib/leads/prospeo.ts (titles, seniority, person location, company headcount, industry and keyword include/exclude; always exclude the user's own website domain).
- Loop pages while budget left, up to 4 pages per run:
  1. reserve(userId, 'lead_found', 0, UNIT_COST.lead_found, 'find:' + job.id + ':' + page + ':search') to record the search credit.
  2. POST https://api.prospeo.io/search-person with headers X-KEY: PROSPEO_API_KEY and Content-Type: application/json, body { page, filters }. 25 results per page.
  3. Drop people whose prospeo person id or email already exists in leads for this user, and companies whose domain is in suppression_list (domain rows).
  4. n = min(remaining people, job.requested - job.inserted). reserve(userId, 'lead_found', n, UNIT_COST.lead_found, 'find:' + job.id + ':' + page + ':reveal'). If false: finish the job as 'succeeded' with last_error 'limit_reached' and stop.
  5. POST https://api.prospeo.io/bulk-enrich-person with up to 50 people and only_verified_email: true.
  6. Insert leads (status 'found', source 'prospeo', job_id, prospeo_person_id, names, title, company_name, company_domain lowercased without www, linkedin_url, city, country, timezone from a small country/state to IANA lookup for the 20 most common countries, fallback campaign.fallback_timezone) with on conflict do nothing.
  7. refund(userId, 'lead_found', n - actuallyInserted, ...) for people with no verified email or duplicates.
  8. Update the job: inserted, skipped_duplicates, skipped_no_email, pages_done, next_page.
- Job finished when inserted >= requested, Prospeo returns no results, or 40 pages are done: status 'succeeded', finished_at. Otherwise status back to 'queued' so the next tick continues.
- Errors: 429 or 5xx from Prospeo -> status 'queued', attempts + 1, next_attempt_at now() + 2^attempts minutes; after 3 attempts 'failed' with last_error. 401/403 -> 'failed' with last_error 'provider_auth' and one Resend email to FOUNDER_EMAIL (dedupe key 'prospeo_auth:' + current hour in email_log).
- Insert an events row 'lead_job_finished' with counts when a job ends.
- Log { fn: 'find-leads', mode, job_id, pages, inserted, credits, ms }.

Deploy: npx supabase functions deploy find-leads --no-verify-jwt (the browser path still verifies with getClaims).

Curl tests:
1. Enqueue: curl -X POST "https://<ref>.supabase.co/functions/v1/find-leads" -H "Authorization: Bearer <USER_JWT>" -H "Idempotency-Key: 6f1c2f4e-8d3b-4a5e-9c7d-1b2a3c4d5e6f" -H "Content-Type: application/json" -d '{"campaign_id":"<uuid>","count":25}'
2. Run the same command again: same job_id back, still one row in lead_jobs.
3. No Authorization header and no cron secret: 401.
4. Worker: curl -X POST "https://<ref>.supabase.co/functions/v1/find-leads" -H "x-cron-secret: <CRON_SECRET>"
Check: select status, requested, inserted, pages_done, last_error from lead_jobs order by created_at desc limit 3;

Plan first, then wait for my OK.
`

export const promptVerifyEmails = `Build supabase/functions/verify-emails/index.ts. Read @PRD.md section 11.2 and the MillionVerifier single API docs (https://developer.millionverifier.com) first.

Contract:
- pg_cron every 2 minutes, POST with x-cron-secret. requireCron. Deploy with --no-verify-jwt. Budget 110 s.
- rpc release_stuck_leads() first, then rpc claim_leads({ p_from: 'found', p_to: 'verifying', p_limit: 50 }).
- For each lead (runPool, concurrency 5):
  1. lower(email) or its domain in suppression_list for that user: status 'rejected', verify_result 'suppressed'. No API call.
  2. reserve(user_id, 'email_verified', 1, UNIT_COST.email_verified, 'verify:' + lead.id).
  3. GET https://api.millionverifier.com/api/v3/?api=<MILLIONVERIFIER_API_KEY>&email=<urlencoded>&timeout=10
  4. Map result: 'ok' -> 'verified'. 'catch_all', 'unknown', 'invalid', 'disposable', 'error' -> 'rejected'. Save verify_result, locked_at null.
  5. API error or credits exhausted: lead back to 'found', attempts + 1, next_attempt_at now() + 2^attempts minutes, last_error. If the error says credits are gone, stop the batch, put the rest back, and email FOUNDER_EMAIL once per hour (email_log dedupe key 'mv_credits:' + hour).
- The API key sits in the URL, so log only the host, never the URL.
- Response: { ok, processed, verified, rejected, failed, ms }.

Deploy: npx supabase functions deploy verify-emails --no-verify-jwt
Curl: curl -X POST "https://<ref>.supabase.co/functions/v1/verify-emails" -H "x-cron-secret: <CRON_SECRET>"
Wrong secret must return 401. Check: select status, verify_result, count(*) from leads group by 1, 2;

Plan first, then wait for my OK.
`

export const promptEnrichLeads = `Build supabase/functions/enrich-leads/index.ts. Read @PRD.md section 11.3 and the Firecrawl v2 scrape docs (https://docs.firecrawl.dev) first.

Contract:
- pg_cron every 2 minutes, requireCron, --no-verify-jwt. Budget 110 s.
- rpc claim_leads({ p_from: 'verified', p_to: 'enriching', p_limit: 20 }), runPool concurrency 3.
- Per lead:
  1. Cache: a lead_enrichment row of the same user whose lead has the same company_domain, scraped_at within 30 days and site_markdown not null. Copy site_markdown, source_urls, site_summary. No API call, no metering.
  2. Otherwise reserve(user_id, 'page_scraped', 1, UNIT_COST.page_scraped, 'scrape:' + lead.id + ':home') then POST https://api.firecrawl.dev/v2/scrape with Authorization: Bearer FIRECRAWL_API_KEY and { url: 'https://' + company_domain, formats: ['markdown'], onlyMainContent: true, timeout: 20000 }. Then try /about, /about-us, /company in order (reserve each with its own key) and keep the first that works.
  3. Clean: drop image markdown, lines under 3 words that look like nav, cookie banners, repeated blank lines. Cut to 8,000 characters total, homepage first.
  4. site_summary: first 3 headings + first 300 characters of body text (no AI call).
  5. Upsert lead_enrichment (lead_id, user_id, source_urls, site_markdown, site_summary, scraped_at). Lead status 'enriched', locked_at null.
  6. Every scrape failed after withRetry (2 tries): upsert with site_markdown null, status 'enriched', last_error 'scrape_failed'.
- SSRF guard: only fetch https://<company_domain>/<path>. Reject IPs, localhost, *.local, *.internal and anything without a dot. Never follow links found in the page.
- Response: { ok, processed, scraped, cached, empty, credits, ms }.

Deploy: npx supabase functions deploy enrich-leads --no-verify-jwt
Curl: curl -X POST "https://<ref>.supabase.co/functions/v1/enrich-leads" -H "x-cron-secret: <CRON_SECRET>"
Check: select count(*) filter (where site_markdown is not null) as scraped, count(*) as total from lead_enrichment;

Plan first, then wait for my OK.
`

export const promptPersonalise = `Build supabase/functions/personalise/index.ts. Read @PRD.md sections 11.4 and 12 first. Use the Anthropic TypeScript SDK (npm:@anthropic-ai/sdk), never raw fetch.

Two modes:
A. Batch (pg_cron every 2 minutes, x-cron-secret): rpc claim_leads({ p_from: 'enriched', p_to: 'personalising', p_limit: 10 }). Budget 120 s.
B. Regenerate (browser, Authorization): requireUser, requireAccess, rateLimit(userId, 'personalise'). zod body { lead_id: uuid, hint?: string max 200 }. Load the lead with user_id = userId (404 otherwise). regenerations < plan_limits(userId).regenerations_per_lead, else 429 { code: 'regen_limit' }.
Deploy with --no-verify-jwt; the browser path verifies with getClaims.

Per lead (runPool concurrency 2):
1. reserve(user_id, 'ai_write', 1, UNIT_COST.ai_write, 'write:' + lead.id + ':' + regenerations). False -> lead back to 'enriched', last_error 'limit_reached', next_attempt_at = first day of next month; regenerate mode returns 402 { code: 'limit_reached', kind: 'ai_write' }.
2. Load profile (sender_name, company_name, offer, proof), campaign ICP, step 1 template, lead_enrichment.site_markdown.
3. Prompt-injection guard: replace any "<website" or "</website" in site_markdown with "[tag removed]". If site_markdown is null use "(no website text available)".
4. Call Claude with client.beta.messages.create:
   - model: 'claude-sonnet-5-5', max_tokens: 1000
   - thinking: { type: 'between_tools' } (no thinking tokens on this single-shot call; allowed at effort low)
   - output_config: { effort: 'low', format: { type: 'json_schema', schema: <PRD 12.2 schema> } }
   - system: [{ type: 'text', text: <PRD 12.1 prompt with offer and ICP one-liners filled in>, cache_control: { type: 'ephemeral' } }]
   - messages: one user message from the PRD 12.1 template, site text inside <website></website>
   - betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default'
   - 45 second timeout.
   If stop_reason is 'refusal': status 'needs_review', ai_skip_reason 'model_refused'. Otherwise JSON.parse the first text block.
5. Validate: first_line <= 140 chars; body 30 to 120 words; no 'http', 'www.' or '@' in body; first_line does not start with I saw, I noticed, Congrats, Hope you're well, I came across. On failure retry once with the user note "Your last answer broke this rule: <rule>. Fix it." (metered with key suffix ':retry'). Still failing: needs_review.
6. final_body = renderTemplate(step1.body_template, { first_name, company, title, city, ai_first_line, ai_pain, sender_name }) if the template contains {{ai_first_line}}, else the AI body. final_subject = rendered subject_template or ai_subject.
7. Save ai_* fields, final_subject, final_body, model, prompt_version 'p2', personalised_at. Regenerate also sets edited false and regenerations + 1.
8. Status 'ready' if skip_reason is null and confidence >= 0.5, else 'needs_review'. locked_at null. First ready lead in a campaign sets campaign status 'reviewing'. When a campaign reaches 25 ready leads, send the "Leads ready" Resend email (email_log dedupe 'ready25:' + campaign_id).
Errors: Anthropic.RateLimitError -> back to 'enriched' with next_attempt_at from retry-after; Anthropic.APIError -> attempts + 1, back to 'enriched' with backoff, last_error. Never log site text or email bodies.
Log { fn, mode, processed, ready, needs_review, failed, input_tokens, output_tokens, cache_read_tokens, ms }. From the second call, cache_read_tokens must be above 0; if not, tell me what is breaking the cache.
Responses: batch { ok, processed, ready, needs_review, failed }; regenerate { ok, lead_id, subject, first_line, body, confidence, skip_reason }.

Deploy: npx supabase functions deploy personalise --no-verify-jwt
Curl tests:
1. curl -X POST "https://<ref>.supabase.co/functions/v1/personalise" -H "x-cron-secret: <CRON_SECRET>"
2. curl -X POST "https://<ref>.supabase.co/functions/v1/personalise" -H "Authorization: Bearer <USER_JWT>" -H "Content-Type: application/json" -d '{"lead_id":"<uuid>","hint":"mention their new pricing page"}'
3. The same with another user's lead id: 404.
Check: select status, count(*) from leads group by status; and select kind, used, cost_usd from usage_this_month;

Plan first, then wait for my OK.
`

export const promptSendDueEmails = `Build supabase/functions/send-due-emails/index.ts. Read @PRD.md sections 11.5 and 14 (all of it). Then read the AgentMail API reference for "Send Message" (POST /v0/inboxes/{inbox_id}/messages/send) and "Reply To Message" (POST /v0/inboxes/{inbox_id}/messages/{message_id}/reply) and confirm the body fields to, subject, text, html, headers, track_opens and the Idempotency-Key header. Tell me what you confirmed before coding.

Contract:
- pg_cron every 5 minutes. requireCron. --no-verify-jwt. Budget 140 s.
- Step 0: update inboxes set sent_today = 0, sent_today_date = current_date where sent_today_date < current_date. Inboxes with paused_until < now(): status 'active', paused_until null.
- Step 1: rpc claim_due_messages({ p_limit: 200 }).
- Step 2: group by inbox (step 1 messages without an inbox are grouped by campaign). One worker per inbox, inboxes in parallel. Per message:
  a. Load lead, campaign, profile, step. Lead status replied, bounced, unsubscribed, failed or rejected, or campaign not 'active': message 'cancelled'.
  b. has_active_access false: message back to 'queued', campaign 'paused' with paused_reason 'no_access'.
  c. lower(lead.email) or its domain in suppression_list: 'cancelled'.
  d. Send window (skip for is_manual): lead.timezone, fallback campaign.fallback_timezone. Use isInsideWindow and nextWindowStart from _shared/rules.ts. Outside: scheduled_for = next window start + random 0 to 40 minutes, status 'queued'.
  e. Inbox: step 1 picks the inbox in campaign_inboxes with status 'active' (and its domain 'verified') and the lowest sent_today where sent_today < rpc inbox_effective_cap(inbox_id); save lead.assigned_inbox_id. Later steps and manual replies use lead.assigned_inbox_id. No room: scheduled_for = next window start tomorrow.
  f. Ownership: message.user_id = lead.user_id = inbox.user_id or mark 'failed' with error 'owner_mismatch' and log level error. The recipient is always lead.email, never message.to_email.
  g. Metering: reserve(user_id, 'email_sent', is_manual ? 0 : 1, UNIT_COST.email_sent, 'send:' + message.id). False: status 'queued', scheduled_for = first day of next month 08:00 in the lead zone, and one Resend email to the user (dedupe 'cap_sends:' + user + ':' + month).
  h. Unsubscribe: token = randomToken(); insert unsubscribe_tokens (sha256Hex(token), user_id, lead_id, message_id, email). url = APP_URL + '/u/' + token.
  i. Body: message.body_text + blank line + footer from PRD 14.4 (sender_name, company_name, physical_address, url). text = that; html = escaped text with <br>.
  j. Headers: { 'List-Unsubscribe': '<' + APP_URL + '/api/unsubscribe?t=' + token + '>, <mailto:' + inbox.email + '?subject=unsubscribe>', 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' }.
  k. Send: step 1 or a step with new_thread -> agentmail.send(inbox.agentmail_inbox_id, { to: [lead.email], subject, text, html, headers, track_opens: false }, message.id). Other steps and manual replies -> agentmail.reply(inbox id, last agentmail_message_id in the lead's thread, { text, html, headers, track_opens: false }, message.id).
  l. Success: status 'sent', sent_at, agentmail_message_id, agentmail_thread_id, from_email = inbox.email, to_email = lead.email. inboxes.sent_today + 1 (single SQL increment). Lead status 'sending', current_step = step_number. Next step exists: insert a queued message (subject: new subject if new_thread else 'Re: ' + previous subject; body rendered from the step template; scheduled_for = sent_at + delay_days). No next step: lead 'completed'.
  m. Failure: 429 or 5xx -> 'queued', scheduled_for now() + 10 minutes, attempts + 1. Other 4xx -> 'failed' with error text. Lead 'failed' after 3 failed attempts.
  n. Jitter: after each non-manual send, wait 20 to 90 seconds before the next send from the same inbox. Stop when the budget runs out and put unsent claimed messages back to 'queued'.
- Daily digest: at the end of each run, for users whose local time is 08:00 to 08:04 and who had inbound replies yesterday, send the digest via Resend (email_log dedupe 'digest:' + user + ':' + date).
- Response: { ok, claimed, sent, rescheduled, cancelled, failed, ms }. One log line per run plus one error line per failure (message id, status code, recipient domain only).

Deploy: npx supabase functions deploy send-due-emails --no-verify-jwt
Curl: curl -X POST "https://<ref>.supabase.co/functions/v1/send-due-emails" -H "x-cron-secret: <CRON_SECRET>"
Check: select status, count(*) from messages where direction = 'outbound' group by status; and select email, sent_today, public.inbox_effective_cap(id) from inboxes;

Plan first, then wait for my OK.
`

export const promptAgentmailWebhook = `Build supabase/functions/agentmail-webhook/index.ts. Read @PRD.md sections 11.6, 12.3 and 14.5. Then read the AgentMail docs: Webhook Events (docs.agentmail.to/events), Verifying Webhooks (docs.agentmail.to/webhook-verification) and Reply Extraction (docs.agentmail.to/reply-extraction). Confirm the payload fields (event_type, event_id, message.inbox_id, message.thread_id, message.message_id, message.from, message.extracted_text, bounce.recipients) and tell me before coding.

Contract:
- POST from AgentMail. --no-verify-jwt. No CORS.
- Read the raw body with await req.text(). Verify with new Webhook(AGENTMAIL_WEBHOOK_SECRET).verify(body, { 'svix-id', 'svix-timestamp', 'svix-signature' }) from npm:svix. Missing or invalid: 400, write nothing.
- Idempotency: insert into webhook_events (provider 'agentmail', event_id = payload.event_id, type). Unique violation: return 200 { ok: true, duplicate: true }.
- message.received:
  1. Inbox by agentmail_inbox_id = message.inbox_id. Unknown: 200 and a warning log.
  2. Original outbound message by agentmail_thread_id = message.thread_id (then by in_reply_to). Get lead_id, campaign_id.
  3. Insert inbound messages row: direction 'inbound', status 'received', from_email, to_email, subject, body_text = message.extracted_text (fallback message.text), agentmail ids, received_at.
  4. Matched: lead status 'replied' (use the admin client; the guard trigger only applies to browser users); messages set status 'cancelled' where lead_id = lead and status = 'queued'.
  5. reserve(user_id, 'ai_classify', 1, UNIT_COST.ai_classify, 'classify:' + event_id). Classify with Claude: model 'claude-haiku-5-5', max_tokens 300, output_config { effort: 'low', format: { type: 'json_schema', schema: <PRD 12.3 schema> } }, system = PRD 12.3 prompt, user message = '<reply>' + text with any '<reply' or '</reply' replaced by '[tag removed]', cut to 4,000 chars + '</reply>'. 8 second timeout. Timeout, error or refusal: label 'other', confidence 0. Only accept labels from the enum.
  6. Save classification, classification_confidence, classification_summary, follow_up_date.
  7. unsubscribe with confidence >= 0.6: suppression_list (reason 'unsubscribe', source 'reply') on conflict do nothing; lead 'unsubscribed'; cancel queued messages to that email in every campaign.
  8. interested: Resend email to the user's auth email (admin auth API) from EMAIL_FROM with lead name, company, summary and APP_URL + '/app/inbox?thread=' + thread id. email_log dedupe 'interested:' + inbound message id.
  9. events row 'reply_received' with label.
- message.bounced and message.rejected: outbound message by agentmail_message_id -> 'bounced' (rejected -> 'failed'); lead 'bounced'; suppression (reason 'bounce') for each recipient; cancel queued messages for the lead. Then count bounced in the campaign's last 100 sent messages; over 5: campaign 'paused', paused_reason 'bounce_rate', Resend email (dedupe 'paused:' + campaign + ':' + date).
- message.complained: as bounce with reason 'complaint'; inbox status 'paused', paused_until now() + 48 hours, paused_reason 'complaint'; campaign 'paused' with paused_reason 'complaint'; Resend email.
- message.delivered: 'delivered'.
- Anything else: 200.
- Respond within 10 seconds. Log { fn, event_type, matched, label, ms }.

Deploy: npx supabase functions deploy agentmail-webhook --no-verify-jwt
Then give me the exact curl to create the webhook once (POST https://api.agentmail.to/v0/webhooks with Authorization: Bearer AGENTMAIL_API_KEY and { "url": "https://<ref>.supabase.co/functions/v1/agentmail-webhook", "event_types": ["message.received", "message.bounced", "message.complained", "message.rejected", "message.delivered"], "client_id": "outbounder-prod" }) and show me where the secret is in the response.
Forged test (must return 400 and write nothing):
curl -X POST "https://<ref>.supabase.co/functions/v1/agentmail-webhook" -H "Content-Type: application/json" -H "svix-id: msg_fake" -H "svix-timestamp: 1700000000" -H "svix-signature: v1,ZmFrZQ==" -d '{"type":"event","event_type":"message.received","event_id":"evt_fake"}'
Check: select count(*) from webhook_events; (unchanged after the forged call)

Plan first, then wait for my OK.
`

export const promptSetupDomain = `Build supabase/functions/setup-domain/index.ts. Read @PRD.md sections 11.7 and 14.1 and the AgentMail docs: Pods (docs.agentmail.to/documentation/core-concepts/pods), Multi-tenancy guide (docs.agentmail.to/multi-tenancy), Custom domains (docs.agentmail.to/custom-domains) and the API reference for Pods > Domains and Pods > Inboxes. Confirm the endpoints and the domain response fields (domain_id, status, reason, records[].type/name/value/status/priority) before writing code.

Contract:
- POST from the browser with the user's JWT. requireUser, requireAccess, rateLimit(userId, 'setup-domain'). CORS for the app origin.
- zod discriminated union on action: 'create' | 'verify' | 'create_inbox' | 'delete_inbox'.
- ensurePod(userId): if profiles.agentmail_pod_id is null, agentmail.createPod({ name: 'user-' + userId, client_id: userId }) (client_id makes a retry return the same pod) and save it.
- create { domain }:
  1. Normalise: trim, lowercase, strip protocol, path and leading www. zod regex for a hostname with a dot.
  2. Block the registrable root of profiles.website_domain: 400 { code: 'main_domain', message: 'Use a separate domain for cold email, like try<yourbrand>.com' }. Block gmail.com, outlook.com, hotmail.com, yahoo.com, icloud.com, proton.me.
  3. Count sending_domains for the user against plan_limits(userId).domains: 402 { code: 'limit_reached', kind: 'domains' }.
  4. agentmail.createDomain(podId, { domain, feedback_enabled: true }). If AgentMail says it exists in this pod, fetch it.
  5. Insert sending_domains (agentmail_domain_id, status 'pending_dns', dns_records = records mapped to { type, name, value, priority, status }).
  6. Return { ok, domain_id, records }.
- verify { domain_id }: row must belong to the user (404). 429 if last_checked_at within 20 s. agentmail.verifyDomain, then getDomain. Map status: VERIFIED -> 'verified' (set verified_at, send the "Domain verified" Resend email with dedupe 'domain:' + id); VERIFYING or PENDING with some VALID records -> 'verifying'; INVALID or FAILED -> 'failed' with status_reason = reason; else 'pending_dns'. Update dns_records and last_checked_at. Return { ok, status, reason, records }.
- create_inbox { domain_id, username, display_name }: domain must be the user's and 'verified' (409 otherwise). username: zod /^[a-z0-9.]{2,30}$/. Max 3 per domain and plan_limits(userId).inboxes overall (402). agentmail.createInbox(podId, { username, domain, display_name, client_id: domain_id + ':' + username }). Insert inboxes (daily_cap 30, status 'active'). Return { ok, inbox, effective_cap: 20 }.
- delete_inbox { inbox_id }: 409 if queued messages use it or a lead with an unfinished sequence has it as assigned_inbox_id. agentmail.deleteInbox, then delete the row.
- AgentMail errors: 502 { code: 'agentmail_error', message: their message }, never their raw response.
- Log { fn, action, user_id, ok, ms }.

Deploy: npx supabase functions deploy setup-domain --no-verify-jwt
Curl tests:
curl -X POST "https://<ref>.supabase.co/functions/v1/setup-domain" -H "Authorization: Bearer <USER_JWT>" -H "Content-Type: application/json" -d '{"action":"create","domain":"tryyourbrand.com"}'
The same with your main website domain: 400 main_domain. With another user's domain_id on verify: 404.
Check: select domain, status, jsonb_array_length(dns_records) from sending_domains;

Plan first, then wait for my OK.
`
