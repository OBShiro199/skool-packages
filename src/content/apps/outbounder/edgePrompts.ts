// Claude Code prompts for each Outbounder edge function.

export const promptShared = `Before writing any edge function, create the shared helpers in supabase/functions/_shared/. Read PRD.md section 10 first.

Files:
1. _shared/supabase.ts: export adminClient() that creates a Supabase client with Deno.env.get('SUPABASE_URL') and Deno.env.get('SUPABASE_SECRET_KEY') (the sb_secret_ key; fall back to SUPABASE_SERVICE_ROLE_KEY if the new name is not set). auth: { persistSession: false }.
2. _shared/auth.ts: export async function requireUser(req): reads the Authorization header, creates a client with SUPABASE_URL and the publishable key (SUPABASE_PUBLISHABLE_KEY, fall back to SUPABASE_ANON_KEY) passing that header, calls supabase.auth.getClaims(token), returns { userId: claims.sub } or throws a 401 HttpError. Also export requireAccess(userId) that calls the has_active_access RPC with the admin client and throws a 402 HttpError when false. Export requireCron(req) that compares the x-cron-secret header with Deno.env.get('CRON_SECRET') in constant time and throws 401 on mismatch.
3. _shared/http.ts: HttpError class (status, code, message), json(body, status) helper, cors headers for browser-called functions (allow the site origin from APP_URL and http://localhost:3000), handle OPTIONS.
4. _shared/log.ts: log(fn, data) prints one JSON line with fn, ts and data. Never log email bodies, API keys or full site markdown.
5. _shared/retry.ts: withRetry(fn, { tries: 3, baseMs: 1000 }) with exponential backoff and jitter; if the error has a retry-after header, wait that long instead.
6. _shared/pool.ts: runPool(items, concurrency, worker) that runs at most N workers at once and returns { ok, failed } counts.
7. _shared/render.ts: renderTemplate(template, vars) replacing {{name}} tokens; unknown tokens stay as-is so the UI can flag them. Also wordCount(text).
8. _shared/crypto.ts: AES-GCM encrypt/decrypt with APP_ENCRYPTION_KEY (base64, 32 bytes), sha256Hex(text), randomToken(32 bytes base64url), timingSafeEqual.

Use Deno.serve in every function. Import supabase-js as npm:@supabase/supabase-js@2 and the Anthropic SDK as npm:@anthropic-ai/sdk. Do not add any other dependencies unless I approve. Plan first, show me the files, then wait for my OK.
`

export const promptFindLeads = `Build the Supabase edge function supabase/functions/find-leads/index.ts. Read PRD.md section 10.1 and the Apollo API docs (People API Search and Bulk People Enrichment) before you write code. Use the _shared helpers.

Contract:
- POST, called from the browser with the user's JWT. Body: { campaign_id: string (uuid), count: 25 | 50 | 100 | 250 }. Validate with a small hand-written check; 400 on bad input.
- Auth: requireUser, then requireAccess. Load the campaign with the admin client where id = campaign_id AND user_id = userId. 404 if not found (never reveal that it exists for someone else).
- Lock: if campaigns.finding_locked_at is within the last 10 minutes, return 409 { code: 'already_running' }. Otherwise set it to now() and clear it in a finally block.
- Limits: call plan_limits(userId) and read usage_monthly for this month. If leads_found + count > limit, return 402 { code: 'limit_reached', limit, used }.
- Apollo key: read user_secrets.apollo_key_encrypted for this user and decrypt it. If missing, use Deno.env.get('APOLLO_API_KEY') only when Deno.env.get('ALLOW_SHARED_APOLLO') === 'true' (dev). Otherwise 400 { code: 'apollo_key_missing' }.
- Map campaign.icp to Apollo search params: person_titles[], person_seniorities[], person_locations[], organization_num_employees_ranges[] (format "11,50"), q_organization_keyword_tags[], plus q_keywords for free text. Send the key in the X-Api-Key header. per_page 100.
- Page through results. For each candidate, skip if the email (after enrichment) already exists in leads for this user (unique index handles it, but check first to save credits by apollo_person_id too) or the domain/email is in suppression_list.
- Reveal emails with Apollo bulk people enrichment, max 10 people per call. Keep only people with an email and email_status of verified or likely to engage. Count credits used in the log.
- Insert leads with status 'found' and on conflict do nothing. Fill first_name, last_name, title, company_name, company_domain (from organization primary domain or website url hostname, lowercased, no www), linkedin_url, city, country, apollo_person_id, and timezone (map country + state to an IANA zone with a small lookup table for the 15 most common countries; fallback to campaign.fallback_timezone).
- Stop when inserted = count or Apollo runs out of pages (max 10 pages).
- After insert: increment_usage(userId, 'leads_found', inserted), set campaign status = 'building', insert an events row type 'leads_found' with counts.
- Rate limits: one Apollo call at a time with a 300 ms gap. Wrap calls in withRetry; on 429 respect retry-after. On 401/403 from Apollo return 400 { code: 'apollo_key_invalid' }.
- Response: { ok: true, inserted, skipped_duplicates, skipped_no_email, pages }.
- Log one line at the end: { fn: 'find-leads', user_id, campaign_id, inserted, credits, ms }.

Deploy: supabase functions deploy find-leads (keep JWT verification on; we also verify inside).

Then give me a curl test I can run with my own JWT (copy it from the browser devtools: localStorage sb-...-auth-token access_token):
curl -X POST "https://<ref>.supabase.co/functions/v1/find-leads" -H "Authorization: Bearer <USER_JWT>" -H "Content-Type: application/json" -d '{"campaign_id":"<uuid>","count":25}'
And a second curl with no Authorization header that must return 401.

Plan first, then wait for my OK before writing code.
`

export const promptVerifyEmails = `Build supabase/functions/verify-emails/index.ts. Read PRD.md section 10.2 and the MillionVerifier single API docs first.

Contract:
- Called by pg_cron every 2 minutes with POST and header x-cron-secret. requireCron(req) first; 401 otherwise. Deploy with --no-verify-jwt.
- Call the RPC release_stuck_leads() first.
- Claim a batch: rpc('claim_leads', { p_from: 'found', p_to: 'verifying', p_limit: 50 }).
- For each lead (runPool, concurrency 5):
  1. If lower(email) or the email's domain is in suppression_list for that user: status 'rejected', verify_result 'suppressed'.
  2. GET https://api.millionverifier.com/api/v3/?api=<MILLIONVERIFIER_API_KEY>&email=<urlencoded>&timeout=10
  3. Map result: 'ok' -> status 'verified'. 'catch_all', 'unknown', 'invalid', 'disposable', 'error' -> status 'rejected'. Save verify_result = result. Set locked_at = null.
  4. If the API returns an error or credits are exhausted: put the lead back to 'found', attempts + 1, last_error = message. If the error says no credits, stop the batch early and log level 'error'.
- Never log the API key (it sits in the URL, so log only the host).
- Response: { ok: true, processed, verified, rejected, failed, ms }.
- Idempotent: running twice can't double-process because claim_leads uses for update skip locked and moves status first.

Deploy: supabase functions deploy verify-emails --no-verify-jwt

Curl test:
curl -X POST "https://<ref>.supabase.co/functions/v1/verify-emails" -H "x-cron-secret: <CRON_SECRET>"
And the same with a wrong secret, which must return 401.

Plan first, then wait for my OK.
`

export const promptEnrichLeads = `Build supabase/functions/enrich-leads/index.ts. Read PRD.md section 10.3 and the Firecrawl scrape endpoint docs (v2 /scrape) first.

Contract:
- pg_cron every 2 minutes, x-cron-secret required (requireCron). Deploy with --no-verify-jwt.
- Claim: rpc('claim_leads', { p_from: 'verified', p_to: 'enriching', p_limit: 20 }).
- For each lead (runPool, concurrency 3):
  1. Cache check: find any lead_enrichment row for the same user where the lead's company_domain matches and scraped_at > now() - 30 days and site_markdown is not null. If found, copy site_markdown, source_urls, site_summary.
  2. Otherwise POST https://api.firecrawl.dev/v2/scrape with Authorization: Bearer <FIRECRAWL_API_KEY>, body { url: 'https://' + company_domain, formats: ['markdown'], onlyMainContent: true, timeout: 20000 }. Then try /about, /about-us, /company in order and keep the first that succeeds.
  3. Clean the markdown: remove image links, nav-like lines under 3 words, cookie banners, repeated blank lines. Cut to 12,000 characters total (homepage first, then about).
  4. Build site_summary: the first 3 headings plus the first 400 characters of body text (no AI call here, keep it cheap).
  5. Upsert lead_enrichment (lead_id, user_id, source_urls, site_markdown, site_summary, scraped_at). Set lead status 'enriched', locked_at null.
  6. If every scrape fails after withRetry (2 tries): upsert lead_enrichment with site_markdown null, set status 'enriched' anyway and last_error = 'scrape_failed'. Personalise handles the empty case.
- Treat scraped text as untrusted. Do not follow links found in it, do not fetch any URL other than the lead's own company_domain paths.
- Block private addresses: reject company_domain values that are IPs, localhost, or end in .local or .internal.
- Response: { ok: true, processed, scraped, cached, empty, ms }. Log credits used (1 per page) without page content.

Deploy: supabase functions deploy enrich-leads --no-verify-jwt
Curl test: curl -X POST "https://<ref>.supabase.co/functions/v1/enrich-leads" -H "x-cron-secret: <CRON_SECRET>"

Plan first, then wait for my OK.
`

export const promptPersonalise = `Build supabase/functions/personalise/index.ts. Read PRD.md sections 10.4, 11.1, 11.2 and 11.4 first. Use the Anthropic TypeScript SDK (npm:@anthropic-ai/sdk). Do not use fetch for Claude calls.

Two modes in one function:
A. Batch (pg_cron every 2 minutes): header x-cron-secret (requireCron). Claim rpc('claim_leads', { p_from: 'enriched', p_to: 'personalising', p_limit: 10 }).
B. Regenerate (browser): Authorization header with user JWT, body { lead_id, hint?: string (max 200 chars) }. requireUser + requireAccess; load the lead with user_id = userId (404 otherwise). Check lead_enrichment.regenerations < plan limit (3 trial, 5 paid), else 429 { code: 'regen_limit' }.
Pick the mode by which header is present. Deploy with --no-verify-jwt because cron calls it without a JWT; requireUser still verifies the browser path with getClaims.

For each lead (runPool, concurrency 2):
1. Load profile (sender_name, company_name, icp offer, proof), campaign icp, step 1 template, lead_enrichment.site_markdown.
2. Call Claude:
   - model: 'claude-sonnet-5-5'
   - max_tokens: 1500
   - output_config: { effort: 'low', format: { type: 'json_schema', schema: <PRD 11.2 schema> } }
   - system: the PRD 11.1 system prompt as a text block with cache_control: { type: 'ephemeral' } (fill offer and ICP one-liners from the profile)
   - messages: one user message built from the PRD 11.1 user template. Wrap site text in <website></website>. If site_markdown is null, put "(no website text available)".
   - Use client.beta.messages.create with betas: ['server-side-fallback-2026-07-01'] and fallbacks: 'default' so a refusal falls back automatically. If stop_reason is still 'refusal', mark the lead needs_review with ai_skip_reason 'model_refused'.
   - Read the first text block, JSON.parse it.
3. Validate in code: first_line <= 140 chars; body word count 30 to 120; body has no 'http' or 'www.'; first_line does not start with I saw, I noticed, Congrats, Hope you're well, I came across (case-insensitive). On failure, retry once adding a user note "Your last answer broke this rule: <rule>. Fix it." Still failing: needs_review.
4. Render final_body: renderTemplate(step1.body_template, { first_name, company, title, ai_first_line, ai_pain, sender_name, city }) if the template contains {{ai_first_line}}, otherwise use the AI body as-is. final_subject = rendered subject_template or ai_subject.
5. Save ai_* fields, final_subject, final_body, model, prompt_version 'p1', personalised_at. Regenerate mode also sets edited = false and regenerations + 1.
6. Status: 'ready' if skip_reason is null and confidence >= 0.5, else 'needs_review'. locked_at null.
7. increment_usage(user_id, 'emails_personalised', 1). If this is the campaign's first ready lead, set campaign status 'reviewing'.

Errors: catch Anthropic.RateLimitError (wait retry-after, put the lead back to 'enriched' if out of time), Anthropic.APIError (attempts + 1, back to 'enriched', last_error). Use a 45 second per-call timeout and stop claiming new work after 120 seconds of wall time.
Logging: { fn, mode, processed, ready, needs_review, failed, input_tokens, output_tokens, cache_read_tokens, ms }. Never log site text or email bodies.
Response batch: { ok, processed, ready, needs_review, failed }. Response regenerate: { ok, lead_id, subject, first_line, body, confidence, skip_reason }.

Deploy: supabase functions deploy personalise --no-verify-jwt
Curl tests:
1. Batch: curl -X POST "https://<ref>.supabase.co/functions/v1/personalise" -H "x-cron-secret: <CRON_SECRET>"
2. Regenerate: curl -X POST "https://<ref>.supabase.co/functions/v1/personalise" -H "Authorization: Bearer <USER_JWT>" -H "Content-Type: application/json" -d '{"lead_id":"<uuid>","hint":"mention their new pricing page"}'
3. Regenerate with another user's lead id: must return 404.

Plan first, then wait for my OK.
`

export const promptSendDueEmails = `Build supabase/functions/send-due-emails/index.ts. Read PRD.md sections 10.5 and 12 (all of it) and the AgentMail docs for sending a message from an inbox and replying to a message in a thread. Confirm the exact request fields for custom headers in the AgentMail send API before writing code and tell me what you found.

Contract:
- pg_cron every 5 minutes. requireCron. Deploy with --no-verify-jwt.
- Wall-time budget 140 seconds. Stop starting new sends after that and return.
- Step 0: update inboxes set sent_today = 0, sent_today_date = current_date where sent_today_date < current_date. Re-activate inboxes whose paused_until has passed.
- Step 1: rpc('claim_due_messages', { p_limit: 200 }).
- Step 2: group by inbox (or by campaign for step 1 messages without an inbox yet). For every message:
  a. Load lead, campaign, profile, enrichment. Skip and set message 'cancelled' if: lead status is replied, bounced, unsubscribed, failed or rejected; campaign status is not 'active'; has_active_access(user_id) is false (set message back to 'queued' instead, so it resumes after payment); email or domain is in suppression_list.
  b. Send window (skip for is_manual): compute the lead's local time from lead.timezone (fallback campaign.fallback_timezone) with Intl.DateTimeFormat. If today is not in campaign.send_days or the time is outside send_window_start to send_window_end, set scheduled_for to the next window start (plus a random 0 to 40 minutes) and status back to 'queued'.
  c. Pick inbox: step 1 picks the active or warming inbox from campaign_inboxes with the lowest sent_today where sent_today < effective_cap; save it on lead.assigned_inbox_id. Later steps and manual replies use lead.assigned_inbox_id. effective_cap = least(daily_cap, ramp) where ramp is 10 for inbox age 0 to 6 days, 15 for 7 to 13, otherwise daily_cap. If no inbox has room, reschedule to the next window start tomorrow.
  d. Ownership check: message.user_id, lead.user_id and inbox.user_id must all match. If not, mark failed with error 'owner_mismatch' and log level 'error'.
  e. Unsubscribe: create a random token (randomToken), store sha256 in unsubscribe_tokens (one per lead, reuse if it exists by keeping the raw token only in this run; if a token exists already create a new one, that is fine). URL = APP_URL + '/u/' + token.
  f. Body: message.body_text, then a blank line, then the footer from PRD 12.4 with sender_name, company_name, physical_address and the unsubscribe URL. text = that; html = the same escaped with <br>.
  g. Headers: List-Unsubscribe: <APP_URL/u/token>, <mailto:inbox_email?subject=unsubscribe> and List-Unsubscribe-Post: List-Unsubscribe=One-Click.
  h. Send with AgentMail (Authorization: Bearer AGENTMAIL_API_KEY). Step 1, or a step whose sequence_step.new_thread is true: send a new message from the inbox to lead.email. Other steps and manual replies: reply to the last outbound or inbound message in the lead's thread (agentmail_message_id) so it stays in one thread.
  i. Success: message status 'sent', sent_at now(), agentmail_message_id, agentmail_thread_id. inboxes.sent_today + 1. increment_usage(user_id, 'emails_sent', 1). Lead status 'sending', current_step = step_number. If a next sequence step exists: insert a queued message for it with subject (new subject if new_thread, otherwise 'Re: ' + previous subject), body rendered from the step template, scheduled_for = sent_at + delay_days. If no next step: lead status 'completed'.
  j. Failure: message 'failed' with error text. 4xx from AgentMail other than 429 = permanent; 429 and 5xx = put back to 'queued' with scheduled_for = now() + 10 minutes. Lead attempts + 1; at 3, lead 'failed'.
  k. Jitter: after each non-manual send from an inbox, wait a random 20 to 90 seconds before the next send from that same inbox. Run different inboxes in parallel (one worker per inbox).
- Response: { ok, claimed, sent, rescheduled, cancelled, failed, ms }.
- Logging: one line per run plus one 'error' line per failure with message id and status code. Never log bodies or recipient emails in full (log the domain only).

Deploy: supabase functions deploy send-due-emails --no-verify-jwt
Curl test: curl -X POST "https://<ref>.supabase.co/functions/v1/send-due-emails" -H "x-cron-secret: <CRON_SECRET>"
Then show me a SQL query to check what happened: select status, count(*) from messages group by status;

Plan first, then wait for my OK.
`

export const promptAgentmailWebhook = `Build supabase/functions/agentmail-webhook/index.ts. Read PRD.md sections 10.6, 11.3 and 12.5 and the AgentMail docs for webhooks (event types and payload for message.received, bounce and complaint events, and how deliveries are signed). AgentMail signs webhooks with Svix: verify with the svix npm package (npm:svix) using the raw body and the svix-id, svix-timestamp, svix-signature headers and AGENTMAIL_WEBHOOK_SECRET. Confirm the exact event names and payload fields from the docs and tell me before coding.

Contract:
- POST from AgentMail. Deploy with --no-verify-jwt. No CORS.
- Read the body with await req.text() (never req.json() before verifying). Verify the signature. Invalid or missing: 400 and stop. Do not write anything.
- Idempotency: insert into events (type 'agentmail_webhook', data { svix_id, event_type }). If the insert hits the unique index, return 200 { ok: true, duplicate: true }.
- message.received:
  1. Find the inbox by agentmail inbox id; unknown inbox: return 200 and log a warning.
  2. Find the original outbound message by agentmail_thread_id (then by in_reply_to). Get lead_id, campaign_id.
  3. Insert inbound messages row: direction 'inbound', status 'received', from_email, to_email, subject, body_text (prefer the extracted reply text without quoted history if AgentMail provides it, else the text part), agentmail ids, received_at.
  4. If matched: lead status 'replied'; update messages set status 'cancelled' where lead_id = lead and status = 'queued'.
  5. Classify with Claude: model 'claude-haiku-5-5', max_tokens 300, output_config { effort: 'low', format: { type: 'json_schema', schema: <PRD 11.3 schema> } }, system = PRD 11.3 prompt, user message = the reply text (strip quoted lines, cut to 4,000 chars) inside <reply></reply>. 10 second timeout. On timeout or error: classification 'other', confidence 0.
  6. Save classification, classification_confidence, classification_summary on the inbound row.
  7. label 'unsubscribe' with confidence >= 0.6: insert into suppression_list (reason 'unsubscribe', source 'reply') on conflict do nothing; lead status 'unsubscribed'.
  8. label 'interested': send a Resend email to the user's auth email (look it up with the admin auth API) from hello@<product domain> with lead name, company, the summary and a link to APP_URL/app/inbox?thread=<thread id>.
  9. Insert events row 'reply_received' with label.
- Bounce event: find the outbound message by agentmail_message_id; status 'bounced'; lead 'bounced'; suppression reason 'bounce'; cancel queued messages for the lead. Then count bounces in the campaign's last 100 sent messages; over 5: campaign status 'paused', paused_reason 'bounce_rate', email the user.
- Complaint event: same as bounce with reason 'complaint', plus set the inbox status 'paused' and paused_until now() + 48 hours.
- Delivered event (if enabled): status 'delivered'.
- Any other event type: return 200.
- Always respond within 10 seconds. Log { fn, event_type, matched, label, ms }.

Deploy: supabase functions deploy agentmail-webhook --no-verify-jwt
Then tell me how to create the webhook in AgentMail (console or API) pointing at https://<ref>.supabase.co/functions/v1/agentmail-webhook for message.received plus bounce and complaint events, and where to copy the signing secret.
Curl test for the forged case (must return 400 and write nothing):
curl -X POST "https://<ref>.supabase.co/functions/v1/agentmail-webhook" -H "Content-Type: application/json" -H "svix-id: msg_fake" -H "svix-timestamp: 1700000000" -H "svix-signature: v1,ZmFrZQ==" -d '{"type":"message.received"}'

Plan first, then wait for my OK.
`

export const promptSetupDomain = `Build supabase/functions/setup-domain/index.ts. Read PRD.md sections 10.7 and 12.1 and the AgentMail docs for domains (create a domain, get a domain with its DNS records, verify a domain) and inboxes (create an inbox on a custom domain). Tell me the exact endpoints and response fields for DNS records before writing code.

Contract:
- POST from the browser with the user's JWT. requireUser + requireAccess. CORS for the app origin. Body { action: 'create' | 'verify' | 'create_inbox' | 'delete_inbox', ... }.
- action 'create', body { domain }:
  1. Normalise: trim, lowercase, strip protocol, path and leading www. Validate it is a hostname with a dot and no spaces.
  2. Block: if the registrable root equals the root of profiles.website_domain, return 400 { code: 'main_domain', message: 'Use a separate domain for cold email, like try<yourbrand>.com' }. Block gmail.com, outlook.com, yahoo.com, hotmail.com, icloud.com.
  3. Limit: count sending_domains for the user against plan_limits(userId).domains; 402 if over.
  4. Create the domain on AgentMail. If AgentMail says it already exists on this account, fetch it instead.
  5. Insert sending_domains (user_id, domain, agentmail_domain_id, status 'pending_dns', dns_records = an array of { type, name, value, priority?, status } normalised from AgentMail's response).
  6. Return { ok, domain_id, records }.
- action 'verify', body { domain_id }: load the row for this user (404 otherwise). Ask AgentMail to verify, then get the domain and map each record status. Update dns_records, last_checked_at, status ('verified' when AgentMail says verified, set verified_at; 'verifying' while some records pass; keep 'pending_dns' when none do). Rate limit: one verify per domain per 20 seconds (use last_checked_at), else 429. Return { ok, status, records }.
- action 'create_inbox', body { domain_id, username, display_name }: domain must belong to the user and be 'verified' (409 otherwise). username: lowercase letters, numbers, dots, 2 to 30 chars. Max 3 inboxes per domain and plan_limits(userId).inboxes overall. Create the AgentMail inbox with that username on that domain and the display name. Insert inboxes (daily_cap 20, status 'warming'). Return { ok, inbox }.
- action 'delete_inbox', body { inbox_id }: 409 if any queued messages use it or a lead has it as assigned_inbox_id with an unfinished sequence. Delete on AgentMail, then delete the row.
- Errors from AgentMail: return 502 { code: 'agentmail_error', message } with their message, never their raw stack.
- Log { fn, action, user_id, ok, ms }.

Deploy: supabase functions deploy setup-domain (JWT verification on).
Curl test:
curl -X POST "https://<ref>.supabase.co/functions/v1/setup-domain" -H "Authorization: Bearer <USER_JWT>" -H "Content-Type: application/json" -d '{"action":"create","domain":"tryyourbrand.com"}'
Then the same with your main website domain, which must return 400 main_domain.

Plan first, then wait for my OK.
`
