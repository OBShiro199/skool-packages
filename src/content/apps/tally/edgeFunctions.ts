// Tally edge functions: one Claude Code prompt per function.
import type { EdgeFunctionDef } from '../../types'

const shared = `First, if supabase/functions/_shared/ does not exist yet, create these helpers (read @PRD.md section 13 intro):
1. admin.ts: adminClient() with Deno.env.get('SUPABASE_URL') and the secret key (Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'), or the default key from SUPABASE_SECRET_KEYS if that is what this project exposes), auth: { persistSession: false }.
2. auth.ts: requireUser(req) reads the Bearer token, calls supabase.auth.getClaims(token) with a publishable-key client, returns { userId, email } or throws HttpError(401). requireMember(ws, roles?) calls is_workspace_member / has_workspace_role through a client that carries the user's JWT (so auth.uid() works) and throws 403. requireAccess(ws) calls has_active_access with the admin client and throws 402 { code: 'paused' }. requireCron(req) compares x-cron-secret with CRON_SECRET in constant time.
3. http.ts: HttpError(status, code, message), json(body, status), CORS headers for APP_URL and http://localhost:3000, OPTIONS handler. Error body: { error: { code, message } }.
4. log.ts: log(fn, data) prints one JSON line. Never log tokens, email bodies, client emails, card data or API keys.
5. retry.ts: withRetry(fn, { tries: 3, baseMs: 800 }) with exponential backoff + jitter, honours retry-after, retries only 429 and 5xx.
6. limits.ts: checkLimit(ws, kind, qty) reads plan_limits(ws) and usage_this_month(ws, kind) and throws HttpError(402, 'limit_reached', "You have used X of Y ... this month.").
7. meter.ts: meter({ ws, userId, kind, quantity, costMicros, refId, idempotencyKey }) inserts usage_ledger with on conflict (idempotency_key) do nothing.
8. tokens.ts: newPayToken() = 32 random bytes from crypto.getRandomValues, base64url without padding (43 chars). newReplyToken() = 20 random bytes as lowercase RFC 4648 base32 without padding (32 chars). sha256Hex(text) with crypto.subtle. ipHash(req) = sha256Hex(first x-forwarded-for value + IP_HASH_SALT + UTC date). encryptToken(raw) / decryptToken(enc) with AES-GCM, a random 12 byte IV per value, key from APP_ENCRYPTION_KEY (base64 of 32 bytes), stored as base64(iv || ciphertext).
9. money.ts: the same maths as lib/money.ts (PRD section 8) plus formatMoney(cents, currency, locale) with the zero-decimal currency list. Write deno tests for 6 cases including JPY.
10. stripe.ts: new Stripe(STRIPE_SECRET_KEY, { apiVersion: '<pin the current version from the Stripe dashboard>', httpClient: Stripe.createFetchHttpClient() }) from npm:stripe. Export onAccount(acct) = { stripeAccount: acct } so every client-payment call passes it.
11. email.ts: sendEmail({ ws, invoiceId, kind, to, cc, from, replyTo, subject, html, text, attachments, dedupeKey, isClient }) inserts email_log first (on conflict dedupe_key do nothing and return { skipped: true } if it already existed), refuses client mail to addresses in email_suppressions, then POST https://api.resend.com/emails with Authorization: Bearer RESEND_API_KEY and header Idempotency-Key: dedupeKey, then saves resend_id and status. fromFor(ws) returns the verified default sending domain address, or the shared address "<Business> <slug@mail.<TALLY_MAIL_DOMAIN>>" when none is verified and allow_shared_sender is true.
12. render.ts: renderTemplate(text, vars) replaces {{name}} for the variables in PRD section 14.1, escapes HTML in every value, turns **bold** and line breaks into simple HTML, and returns { html, text, unknown: string[] }.
13. claude.ts: callClaude({ system, userContent, schema, zodSchema, maxTokens }) using npm:@anthropic-ai/sdk on client.beta.messages.create with model 'claude-opus-5-5', thinking { type: 'adaptive' }, output_config { effort: 'low', format: { type: 'json_schema', schema } }, system as one text block with cache_control { type: 'ephemeral' }, betas ['server-side-fallback-2026-07-01'] and fallbacks: 'default'. Check stop_reason first: 'refusal' throws HttpError(422, 'ai_refused'), 'max_tokens' throws HttpError(502, 'ai_truncated'). Parse the text block as JSON, validate with zodSchema. Return { data, usage, costMicros }. Micro-dollars per token equal dollars per million tokens: input 4, cache read 0.2, cache write 5, output 20. costMicros = round(input_tokens*4 + cache_read_input_tokens*0.2 + cache_creation_input_tokens*5 + output_tokens*20).
14. issue.ts: issueInvoice(admin, invoiceId, sendAt) shared by tl-send-invoice and the recurring runner: makes the two tokens, calls rpc issue_invoice(p_invoice, p_pay_hash, p_reply_hash, p_pay_enc, p_reply_enc, p_send_at) with the hashes and the encryptToken() copies, enqueues render_pdf and send_invoice_email jobs, meters invoices_sent, and returns { number, payToken }.
Then build the function below.`

export const edgeFunctions: EdgeFunctionDef[] = [
  {
    name: 'tl-send-invoice',
    purpose: 'Checks the plan cap, gives a draft its number and tokens, books the reminder calendar and queues the PDF and the email. Also handles "Edit and resend".',
    trigger: 'Called by the browser from the Send dialog (user JWT)',
    secrets: ['APP_URL', 'TALLY_MAIL_DOMAIN', 'APP_ENCRYPTION_KEY'],
    prompt: `${shared}

Build supabase/functions/tl-send-invoice/index.ts. Read @PRD.md sections 9.1, 13.1, 14.2 and 21 first.

Contract:
- POST JSON { invoice_id: uuid, mode: 'now' | 'schedule' | 'resend', scheduled_send_at?: ISO string (must be in the future, max 90 days), attach_pdf?: boolean, message?: string max 1000 }. Validate with zod (npm:zod). 400 on bad input.
- requireUser, load the invoice with lines count and client using adminClient, requireMember(invoice.workspace_id), requireAccess.
- Rate limit: rpc try_rate_limit('send:' + userId, 60, 3600), 429 if false.
- Checks: client email present and not in email_suppressions (409 client_email_suppressed); at least one line and total_cents > 0 (400 empty_invoice); the workspace has a verified sending_domains row OR allow_shared_sender is true (409 no_sender).
- mode now / schedule: status must be 'draft' (409 wrong_state). checkLimit(ws, 'invoices_sent', 1). Call issueInvoice(admin, id, mode === 'schedule' ? scheduled_send_at : null). Save message and attach_pdf into the send_invoice_email job payload.
- mode resend: status in ('sent', 'viewed') and amount_paid_cents = 0 (409 has_payments). rpc bump_revision(p_invoice). Enqueue render_pdf (key 'pdf:' + id + ':r' + revision) and send_invoice_email with payload { kind: 'invoice_updated' } (key 'send:' + id + ':r' + revision). No metering.
- Return { ok: true, number, status: mode === 'schedule' ? 'scheduled' : 'sending', pay_url: APP_URL + '/i/' + payToken }. The raw pay token exists only in this response and in emails, never in the database or logs. On resend, return pay_url null (the old link still works).
- Log { fn, invoice_id, ws, mode, ms } only.

Deploy with JWT verification on.
Curl tests:
curl -X POST "https://<ref>.supabase.co/functions/v1/tl-send-invoice" -H "Authorization: Bearer <USER_JWT>" -H "Content-Type: application/json" -d '{"invoice_id":"<draft uuid>","mode":"now"}'
Expected: {"ok":true,"number":"INV-0001","status":"sending","pay_url":"https://.../i/..."}. Then with the Supabase MCP show me the invoices row (number, status scheduled, public_token_hash set), the reminder_sends rows and the two jobs. Send the same request again: 409 wrong_state. With no Authorization header: 401. With another user's JWT: 403.

Plan first, then wait for my OK.`,
  },
  {
    name: 'tl-worker',
    purpose: 'The background worker. Renders PDFs, sends invoices, reminders and receipts through Resend, forwards and reads client replies with Claude, imports clients, builds exports, runs recurring invoices and refreshes exchange rates, with retries and backoff.',
    trigger: 'pg_cron every minute (x-cron-secret header)',
    secrets: ['CRON_SECRET', 'RESEND_API_KEY', 'RESEND_INBOUND_DOMAIN', 'TALLY_MAIL_DOMAIN', 'ANTHROPIC_API_KEY', 'APP_URL', 'APP_ENCRYPTION_KEY'],
    prompt: `${shared}

Build supabase/functions/tl-worker/index.ts. Read @PRD.md sections 9, 11.2 to 11.5, 13.2, 14 and 15 first. Split each job kind into its own file in supabase/functions/tl-worker/jobs/.

Contract:
- POST from pg_cron with x-cron-secret. requireCron. Deploy with --no-verify-jwt.
- rpc('release_stuck_jobs'), then rpc('claim_jobs', { p_limit: 40 }). Run with a concurrency of 5. Stop starting new jobs after 100 seconds of wall time.
- Every job is wrapped in try/catch. Success: status 'done'. Failure: attempts + 1, last_error (no secrets), status 'queued', run_after = now() + 2^attempts minutes + random 0 to 30 s. At attempts = 5: 'dead', insert invoice_events 'needs_attention' when the job has an invoice, and email the owner at most once a day (email_log dedupe 'dead:' + ws + ':' + date).
- A "requeue without counting" helper sets status 'queued' and run_after = now() + N seconds without touching attempts.

Job kinds:
1. render_pdf: load invoice, lines, client, business_profiles and the logo (download from brand-assets). Render with pdf-lib (npm:pdf-lib, npm:@pdf-lib/fontkit) and an embedded Geist TTF subset stored in supabase/functions/_shared/fonts/. Layout from DESIGN.md section 9, A4 or Letter from workspaces.paper_size. Upload to invoice-pdfs/<ws>/<invoice_id>/r<revision>.pdf with upsert, set invoices.pdf_path.
2. send_invoice_email: if pdf_path is not the current revision, requeue in 30 s without counting. Build the email from DESIGN.md section 13 with render.ts: subject "Invoice {number} from {business}: {total} due {due_date}", the owner's message, the amount table, a "View and pay" button to APP_URL/i/<token>. Get the raw tokens with decryptToken(invoice.pay_token_enc) and decryptToken(invoice.reply_token_enc). Reply-To 'r-' + reply token + '@' + RESEND_INBOUND_DOMAIN. Attach the PDF on the first send when attach_pdf is true. CC the client's cc_emails. dedupeKey 'invoice:' + id + ':r' + revision. On the first send set status 'sent' and sent_at, event 'sent'.
3. send_reminder: re-check everything from PRD 13.2 at send time; if any check fails mark the reminder_sends row 'skipped' with skip_reason and stop. Render the step subject and body with the invoice variables (pay_link from decryptToken(pay_token_enc), Reply-To from reply_token_enc, late_fee_line, the partial payment sentence), send with dedupeKey 'rem:' + send_id, mark 'sent', event 'reminder_sent' { step, offset_days }. If no scheduled rows remain, sequence_state 'completed'. Never send two Tally emails for the same invoice on the same local day.
4. send_receipt: to the client "Receipt for {amount} to {business}" with the balance left, and payment_received to the creator and owner if their notification_prefs.on_paid is true. dedupeKey 'receipt:' + payment_id (+ ':owner').
5. forward_reply: fetch the received email from Resend's Receiving API by email_id (check the current Resend docs for the endpoint, for example GET https://api.resend.com/emails/receiving/{id}; follow the docs if they differ and tell me). Strip quoted history (lines after "On ... wrote:" and lines starting with ">"), keep max 8,000 characters in inbound_messages.text_excerpt. Forward to the creator (and business_profiles.reply_to_email) as "Reply from {client} about {number}" with Reply-To the client's address, from Tally's system address. If classify_reply already finished, include the summary at the top.
6. classify_reply: if usage_this_month(ws, 'replies_read') >= plan_limits.replies_read, set intent 'unread' and stop. Else call callClaude with the preamble from PRD 15.1, the user content from 15.2 (the reply ONLY inside <reply> tags, invoice facts inside <invoice> tags), the schema from 15.2, maxTokens 2000. Apply the rules after validation exactly as PRD 15.2 (code decides, never the model): update inbound_messages (intent, promised_date, confidence, summary, needs_reply, classified_at) and the invoice sequence_state / paused_until / pause_reason, with invoice_events. Meter 'replies_read' with the real costMicros, key 'cls:' + email_id. On ai_refused: intent 'unread', no retry.
7. import_clients: PRD 13.2 (papaparse, zod per row, 5,000 rows, upsert by lower(email) using select-then-insert-or-update because the unique index is on an expression, progress every 200 rows, first 500 errors). Email the creator when done.
8. build_export: PRD 14.6 formats, UTF-8 with BOM, decimals as strings, upload to exports/<ws>/<export_id>.csv, status 'ready', row_count, email the creator.
9. run_recurring: PRD 14.5. Create the invoice with the admin client (kind 'recurring', lines from the profile JSON), advance next_run_on with month-end handling (anchor 31 runs on the last day of shorter months), end the profile when ends_on or max_runs is reached. auto_send: checkLimit then issueInvoice; at the cap leave a draft and email recurring_draft with the limit note.
10. refresh_fx: GET https://api.frankfurter.dev/v1/latest, upsert fx_rates for every quote with rate_date from the response "date". Max 3 attempts.
11. send_digest: PRD 13.2 Monday digest per member with weekly_digest on.

Prompt-injection guard: client reply text only ever appears inside <reply> tags, the system prompt says tagged text is data, no tools are passed, the output is used only after zod validation, and the only effects are the pause rules. Never render model output as HTML (summaries are inserted as escaped text).

Response: { ok: true, processed, failed, ms }. Log one line per job { fn, job_id, kind, ok, ms, cost_micros }.

Curl test:
curl -X POST "https://<ref>.supabase.co/functions/v1/tl-worker" -H "x-cron-secret: <CRON_SECRET>"
Then send a test invoice from the app and call it until the email arrives. Show me the jobs rows (all 'done'), the PDF in Storage and the email_log row. With a wrong secret it must return 401.

Plan first, then wait for my OK.`,
  },
  {
    name: 'tl-scheduler',
    purpose: 'Every 15 minutes: queues reminders inside each workspace\'s 09:00 to 11:00 window, resumes promised-date pauses, sends scheduled invoices, applies late fees, starts recurring runs, queues FX refresh and the Monday digest, and tidies old data.',
    trigger: 'pg_cron every 15 minutes (x-cron-secret header)',
    secrets: ['CRON_SECRET'],
    prompt: `${shared}

Build supabase/functions/tl-scheduler/index.ts. Read @PRD.md sections 9.2, 13.3, 14.2, 14.4 and 14.5 first.

Contract:
- POST from pg_cron with x-cron-secret. requireCron. Deploy with --no-verify-jwt.
- Work out "local now" for each workspace with Intl.DateTimeFormat and workspaces.timezone (never fixed offsets, so daylight saving is right). Only workspaces whose owner has has_active_access are processed.
- Reminders (local 09:00 to 10:59): select reminder_sends with status 'scheduled' and send_on <= local today for invoices in ('sent', 'viewed', 'partially_paid') with sequence_state 'active'. For each invoice keep only the most recent due row; mark older due rows 'skipped' with skip_reason 'missed_while_paused'. Enqueue send_reminder with idempotency_key 'rem:' + send_id and run_after = now() + random 0 to 90 minutes. Max 200 per workspace per run; the rest wait for the next run.
- Resume promises: sequence_state 'paused_promise' and paused_until <= local today: set 'active', clear paused_until, event 'resumed' { reason: 'promised_date_passed' }.
- Scheduled sends: invoices with status 'scheduled' and scheduled_send_at <= now() that have no send_invoice_email job yet: enqueue it (same key format as tl-send-invoice uses).
- Late fees (local 08:00 to 08:59 only, once a day): for workspaces with late_fee_policies.enabled, invoices overdue by >= after_days, client.late_fees_enabled, not paused_dispute, no payment in 'processing'. Application number n = 1 for the first fee; for monthly, n = 1 + floor((days_overdue - after_days) / 30), capped at max_applications. Amount: fixed amount_cents, or round(amount_due_cents * pct / 100); never let the sum of late fees pass max_total_pct of the total before fees. Call rpc apply_late_fee(p_invoice, p_application_no, p_amount, p_label) with label "Late fee: {days} days overdue". If it returns true, enqueue render_pdf for the new revision.
- Recurring (local 06:00 onwards): recurring_profiles active with next_run_on <= local today: enqueue run_recurring with key 'recur:' + id + ':' + next_run_on.
- FX: once per UTC day after 16:30 UTC, enqueue refresh_fx with key 'fx:' + UTC date (workspace_id null).
- Digest: Mondays local 08:00 to 08:59: enqueue send_digest with key 'digest:' + ws + ':' + ISO week.
- Housekeeping (once per UTC day): set inbound_messages.text_excerpt = null where received_at < now() - 180 days; delete webhook_receipts and rate_limits older than 7 days; delete jobs with status 'done' older than 30 days.
- Response: { ok: true, reminders, resumed, scheduled_sends, late_fees, recurring, ms }.

Curl test:
curl -X POST "https://<ref>.supabase.co/functions/v1/tl-scheduler" -H "x-cron-secret: <CRON_SECRET>"
Then: set a test workspace's timezone so it is 09:30 there now (Supabase MCP), set one reminder_sends row to send_on = today, call the scheduler twice, and show me exactly one send_reminder job. With a wrong secret: 401.

Plan first, then wait for my OK.`,
  },
  {
    name: 'tl-public-invoice',
    purpose: 'Serves the hosted pay page: looks up an invoice by its hashed token and returns only its public view, records views, and rate limits guessing.',
    trigger: 'The /i/[token] page (server-side) and a view beacon from the browser',
    secrets: ['APP_URL', 'IP_HASH_SALT'],
    prompt: `${shared}

Build supabase/functions/tl-public-invoice/index.ts. Read @PRD.md sections 12 and 13.4 first.

Contract:
- Deploy with --no-verify-jwt. CORS: APP_URL only. Never use the caller's key; always the admin client.
- Every request: ip = ipHash(req). rpc try_rate_limit('pub:' + ip, 60, 60) else 429.
- GET ?t=<token>: validate the token shape (43 base64url chars) before any query; a bad shape counts as an unknown token. Hash it, select the invoice by public_token_hash with status not 'draft'. Unknown: rpc try_rate_limit('pub-miss:' + ip, 20, 3600) (429 if false) and return 404 { error: { code: 'not_found', message: 'This invoice link is not valid.' } }.
- If has_active_access(workspace) is false: return { paused: true, business: { name, logo_url } }.
- Build the response exactly as PRD 13.4: business (logo as a 10 minute signed URL from brand-assets), invoice fields and lines (no ids, no token hashes, no created_by, no internal fields), succeeded payments (amount, method, received_at only), pay { enabled, methods, allow_partial, min_partial_cents } where methods come from paymentMethodsFor(invoice.currency, integration.capabilities, invoice.allow_card, invoice.allow_bank) per PRD 11.1 and enabled requires an active integration with charges_enabled and amount_due_cents > 0, pdf_url as a 5 minute signed URL of pdf_path, client { name, company }, show_tally_footer (false when the plan allows removal and the owner switched it off).
- Put paymentMethodsFor in _shared/methods.ts; tl-create-checkout imports the same function.
- POST { t, event: 'view', session_id (uuid) }: same lookup. Skip if the request has the cookie tl_member=1 (set by the app's Preview button). Insert invoice_events 'viewed' at most once per session_id per day (check data->>'session_id'). If first_viewed_at is null: set it and set status 'viewed' when status is 'sent'.
- Response headers: Cache-Control private, max-age=0. Never echo the token back.

Curl tests:
curl "https://<ref>.supabase.co/functions/v1/tl-public-invoice?t=<pay token from tl-send-invoice>"
Expected: JSON with business, invoice, pay. Then show me that the JSON contains no keys named id, workspace_id, client_id, created_by, email, public_token_hash or reply_token_hash anywhere.
for i in $(seq 1 25); do curl -s -o /dev/null -w "%{http_code} " "https://<ref>.supabase.co/functions/v1/tl-public-invoice?t=$(openssl rand -base64 32 | tr '+/' '-_' | tr -d '=')"; done
Expected: 404s, then 429 after about 20.

Plan first, then wait for my OK.`,
  },
  {
    name: 'tl-create-checkout',
    purpose: 'Creates a Stripe Checkout Session on the freelancer\'s connected account for exactly what is owed (or a partial amount within bounds), with the card and bank methods that account has switched on.',
    trigger: 'The pay page "Pay" button (no login, token only)',
    secrets: ['STRIPE_SECRET_KEY', 'APP_URL', 'IP_HASH_SALT'],
    prompt: `${shared}

Build supabase/functions/tl-create-checkout/index.ts. Read @PRD.md sections 11.1, 12 and 13.5 first.

Contract:
- POST JSON { t: string, amount_cents?: integer, method_hint?: 'card' | 'bank' }. Deploy with --no-verify-jwt. CORS APP_URL only.
- Rate limits: try_rate_limit('co-ip:' + ipHash, 30, 3600) and, once the invoice is known, try_rate_limit('co-inv:' + invoice.id, 10, 3600). 429 if either fails.
- Look up the invoice by sha256(t) as in tl-public-invoice (404 not_found for unknown). Status must be in ('sent', 'viewed', 'partially_paid') and amount_due_cents > 0, else 409 not_payable. Owner has_active_access, else 409 not_payable.
- Integration: integrations row for the workspace with status 'active' and charges_enabled, else 503 payments_not_ready with the message from PRD 13.5.
- Amount: if amount_cents is absent use amount_due_cents. If present: invoice.allow_partial must be true, amount must be an integer with min_partial_cents <= amount <= amount_due_cents, else 400 bad_amount. Never accept a currency from the browser.
- methods = paymentMethodsFor(currency, capabilities, allow_card, allow_bank) from _shared/methods.ts. If method_hint is 'card' or 'bank', put that family first in the list.
- Customer: read client_stripe_customers for (client_id, acct). If missing, stripe.customers.create({ name, email, metadata: { tally_client_id } }, onAccount(acct)) and insert the row.
- Expire older sessions: for payments of this invoice with status 'pending' and a checkout_session_id, call stripe.checkout.sessions.expire(id, onAccount(acct)); ignore errors saying it is already expired or complete; mark them 'expired'.
- Insert payments { workspace_id, invoice_id, amount_cents, currency, source: 'stripe', status: 'pending', stripe_account_id: acct } with the admin client.
- Create the session exactly as the code block in PRD 13.5, with idempotencyKey 'checkout:' + payment_id and onAccount(acct). For customer_balance add payment_method_options.customer_balance { funding_type: 'bank_transfer', bank_transfer: { type: 'us_bank_transfer' | 'eu_bank_transfer' (with eu_bank_transfer.country from the account country) | 'gb_bank_transfer' } }. Check the current Stripe docs for Checkout with customer_balance on direct charges before writing; if the docs differ, follow them and tell me.
- Save checkout_session_id on the payment. Return { url: session.url }.
- Never set application_fee_amount. Never create anything on the platform account for a client payment.

Curl test (use a test invoice with allow_partial on and min_partial_cents 5000):
curl -X POST "https://<ref>.supabase.co/functions/v1/tl-create-checkout" -H "Content-Type: application/json" -d '{"t":"<pay token>","amount_cents":5000}'
Expected: {"url":"https://checkout.stripe.com/..."}. Then the same with amount_cents 1 (400 bad_amount), with amount_cents 99999999 (400 bad_amount), and with -100 (400). Open the URL: the business name of the CONNECTED test account is shown, not yours.

Plan first, then wait for my OK.`,
  },
  {
    name: 'tl-connect-webhook',
    purpose: 'Receives Stripe events from connected accounts, verifies the signature, de-duplicates, checks the account owns the invoice, and records card and bank payments, failures, refunds, disputes and account changes.',
    trigger: 'Stripe webhook destination for "Connected accounts" events',
    secrets: ['STRIPE_SECRET_KEY', 'STRIPE_CONNECT_WEBHOOK_SECRET'],
    prompt: `${shared}

Build supabase/functions/tl-connect-webhook/index.ts. Read @PRD.md sections 9.3, 11.1 and 13.6 first.

Contract:
- POST only. Deploy with --no-verify-jwt.
- Read the raw body with await req.text() (never req.json() first). Verify with await stripe.webhooks.constructEventAsync(rawBody, req.headers.get('stripe-signature'), STRIPE_CONNECT_WEBHOOK_SECRET). 400 on failure.
- De-dupe: insert { id: event.id, account: event.account, type } into connect_events; on conflict return 200 { duplicate: true }.
- For checkout.* and charge.* events: find the payment by metadata.payment_id (session metadata, or the PaymentIntent metadata for charge events via payment_intent_id). Load the workspace's integrations row and compare external_account_id with event.account. Mismatch or missing: log 'account_mismatch' and return 200 without changing anything.
- checkout.session.completed: retrieve the session with stripe.checkout.sessions.retrieve(id, { expand: ['payment_intent'] }, onAccount(event.account)). payment_status 'paid': method from payment_intent.payment_method_types[0] mapped to the payment_method enum, then rpc record_stripe_payment(p_payment, p_amount = session.amount_total, p_intent, p_method). payment_status 'unpaid' (bank started): payment status 'processing', invoice sequence_state 'paused_manual' with pause_reason 'Bank payment processing' (only if it was 'active'), event 'bank_payment_started', enqueue a bank_payment_started email to the client (dedupe 'bank:' + payment_id).
- checkout.session.async_payment_succeeded: record_stripe_payment, then if the invoice is still partially_paid and pause_reason is 'Bank payment processing', set sequence_state 'active'.
- checkout.session.async_payment_failed: payment 'failed', sequence back to 'active' if it was paused for the bank payment, event, payment_failed email to creator and owner.
- checkout.session.expired: payment 'expired' only if still 'pending'.
- charge.refunded: for each refund in charge.refunds (expand if needed), add to payments.refunded_cents once per refund id (keep processed refund ids in payments note or a small refunds jsonb column you add with a migration through the Supabase MCP), status 'refunded' or 'partially_refunded'. The payments trigger recalculates the invoice. Event 'refunded'.
- charge.dispute.created: event 'dispute_opened' and an owner email. No status change.
- account.updated: update integrations charges_enabled, capabilities (the account.capabilities object), country, default_currency, display_name (business_profile.name or settings.dashboard.display_name), status 'active' when charges_enabled.
- account.application.deauthorized: integrations status 'disconnected', owner email.
- After any succeeded payment enqueue send_receipt with key 'receipt:' + payment_id.
- Return 200 quickly for every verified event, including types you ignore. Return 500 only for real database errors so Stripe retries.

Test with the Stripe CLI:
stripe listen --forward-connect-to https://<ref>.supabase.co/functions/v1/tl-connect-webhook
(use the whsec_ it prints as STRIPE_CONNECT_WEBHOOK_SECRET while testing), then pay a test invoice from the pay page with 4242 4242 4242 4242.
Show me: connect_events has the event once, the payment is 'succeeded', the invoice amount_paid_cents and status changed, and replaying the same event (stripe events resend <evt_id> --account <acct_id>) changes nothing. A curl with a fake stripe-signature header must return 400.

Plan first, then wait for my OK.`,
  },
  {
    name: 'tl-resend-webhook',
    purpose: 'Receives Resend events: client replies (pauses reminders at once and queues forwarding and AI reading), bounces and spam complaints (suppresses the address and tells the owner), and deliveries. Verifies the Svix signature.',
    trigger: 'Resend webhook (email.received, email.bounced, email.complained, email.delivered)',
    secrets: ['RESEND_WEBHOOK_SECRET', 'RESEND_INBOUND_DOMAIN'],
    prompt: `${shared}

Build supabase/functions/tl-resend-webhook/index.ts. Read @PRD.md sections 11.3 and 13.7 first.

Contract:
- POST only. Deploy with --no-verify-jwt.
- Read the raw body with await req.text(). Verify the Svix signature with the svix-id, svix-timestamp and svix-signature headers and RESEND_WEBHOOK_SECRET (whsec_...), using npm:svix Webhook.verify or the Resend SDK's webhooks.verify; check the current Resend docs for the exact call. Reject timestamps older than 5 minutes. 400 on failure.
- De-dupe: insert svix-id into webhook_receipts (source 'resend'); on conflict return 200.
- email.received: for each address in data.to (lowercase) that ends with '@' + RESEND_INBOUND_DOMAIN and whose local part matches ^r-([a-z2-7]{32})$: hash the token, find the invoice by reply_token_hash. None: log 'unknown_reply_token' and continue. Ignore the message if data.from (parse the address out of "Name <addr>") belongs to a member of that workspace. Otherwise:
  1. insert inbound_messages { workspace_id, invoice_id, resend_email_id: data.email_id, from_email, subject } on conflict (resend_email_id) do nothing.
  2. If the invoice status is in ('sent', 'viewed', 'partially_paid') and sequence_state is 'active' or 'paused_promise', set sequence_state 'paused_reply', pause_reason 'Client replied'. Paid, void and stopped invoices are left alone.
  3. invoice_events 'reply_received'. Enqueue forward_reply (key 'fwd:' + email_id) and classify_reply (key 'cls:' + email_id, run_after now() + 5 s so forwarding goes first).
- email.bounced and email.complained: find email_log by resend_id = data.email_id. If it was client mail: upsert email_suppressions (workspace_id, lower(to_email), reason), set the invoice sequence_state 'paused_bounce' with pause_reason, event, and email the creator and owner ('bounced', dedupe 'bounce:' + email_id). Also count complaints per workspace over 7 days against client emails sent; above 0.3% pause every active sequence in that workspace (paused_manual, reason 'Paused: spam complaints') and email the founder at FOUNDER_EMAIL if set.
- email.delivered: email_log.status = 'delivered'.
- Always return 200 after a valid signature (Resend retries non-2xx).

Tests:
1. In Resend > Webhooks > your endpoint, use the "Send test event" option if it exists; otherwise send a real email to r-<a test invoice's reply token>@<RESEND_INBOUND_DOMAIN> from your phone.
2. Show me the inbound_messages row, the invoice sequence_state 'paused_reply', and the two jobs.
3. curl -X POST "https://<ref>.supabase.co/functions/v1/tl-resend-webhook" -H "svix-id: msg_fake" -H "svix-timestamp: $(date +%s)" -H "svix-signature: v1,fake" -d '{"type":"email.received"}' must return 400.

Plan first, then wait for my OK.`,
  },
  {
    name: 'tl-domains',
    purpose: 'Adds, checks and removes a workspace\'s sending domain in Resend and stores the DNS records to show the user.',
    trigger: 'Called by the browser from Settings, Email sending (user JWT, owner or admin)',
    secrets: ['RESEND_API_KEY'],
    prompt: `${shared}

Build supabase/functions/tl-domains/index.ts. Read @PRD.md sections 9.4, 11.2 and 13.8 first.

Contract:
- POST JSON, a zod discriminated union on action: { action: 'add', workspace_id, domain, from_local?, from_name? } | { action: 'check', id } | { action: 'remove', id, force?: boolean }.
- requireUser, requireMember(ws, ['owner', 'admin']), requireAccess.
- add: normalise (trim, lowercase, strip a trailing dot). Validate: max 253 chars, at least one dot, labels of a-z 0-9 and hyphens, not an IP, not a free mail provider (gmail.com, googlemail.com, outlook.com, hotmail.com, yahoo.com, icloud.com, proton.me, aol.com). Count existing domains against plan_limits(ws).domains (402 limit_reached). If another workspace has it (unique index), 409 domain_taken. POST https://api.resend.com/domains { name } with Authorization: Bearer RESEND_API_KEY. Save resend_domain_id, status 'pending', records (keep record, name, type, value, priority, status per record as Resend returns them), from_local (default 'accounts'), from_name (default the business sender name), is_default true if it is the first.
- check: max one per domain per minute (try_rate_limit('dom:' + id, 1, 60), 429). POST https://api.resend.com/domains/{id}/verify, then GET https://api.resend.com/domains/{id}. Save status (map Resend's values to the domain_status enum), the per-record statuses, last_checked_at. When it becomes 'verified' for the first time, set verified_at and email the owner 'domain_verified' (dedupe 'domain:' + id).
- remove: if it is the only verified domain and there are scheduled reminder_sends for the workspace, 409 in_use unless force is true. DELETE https://api.resend.com/domains/{id}, then delete the row.
- Wrap every Resend call in withRetry. Map Resend 4xx errors to a human message ("Resend says this domain is not valid: ...").
- Output: the saved sending_domains row (id, domain, status, records, from_local, from_name, verified_at).

Curl test:
curl -X POST "https://<ref>.supabase.co/functions/v1/tl-domains" -H "Authorization: Bearer <OWNER_JWT>" -H "Content-Type: application/json" -d '{"action":"add","workspace_id":"<ws>","domain":"billing.yourtestdomain.com"}'
Expected: status "pending" and 3 or more records. Add them at your DNS provider, then call { "action": "check", "id": "<row id>" } until "verified". The same add from a member (not admin) JWT returns 403; gmail.com returns 400.

Plan first, then wait for my OK.`,
  },
  {
    name: 'tl-tone-rewrite',
    purpose: 'Rewrites a reminder sequence in the user\'s own voice with Claude, keeping every variable and the pay link, and returns a diff to keep or discard. Metered and capped per plan.',
    trigger: 'Called by the browser from the Reminders page, "Write in my voice" (user JWT, owner or admin)',
    secrets: ['ANTHROPIC_API_KEY'],
    prompt: `${shared}

Build supabase/functions/tl-tone-rewrite/index.ts. Read @PRD.md sections 13.9, 14.1 and 15 first.

Contract:
- POST JSON { sequence_id: uuid, voice_sample: string 50 to 2000 chars, notes?: string max 300, firmness: 1 | 2 | 3 }. zod, 400 on bad input.
- requireUser, load the sequence, requireMember(ws, ['owner', 'admin']), requireAccess.
- Rate limit: try_rate_limit('rw:' + userId, 1, 15) and 20 per user per hour. checkLimit(ws, 'rewrites', 1).
- Load the enabled steps (step_id, offset_days, tone, subject, body), ordered by offset_days.
- callClaude with the system preamble from PRD 15.1 and the user content from 15.3: the sample inside <sample>, notes inside <notes>, the steps as JSON inside <steps>, then the task text with the firmness level. Schema from 15.3. maxTokens 6000.
- Validate after the model: drop unknown step_ids; for each step, find every {{variable}} in the new subject and body; reject the step (return the original text and note 'kept_original: lost the pay link' or 'kept_original: unknown variable') if {{pay_link}} is missing from the body or any variable is not in the PRD 14.1 list; strip any HTML tags; trim to the length limits.
- Meter 'rewrites' quantity 1 with the real costMicros, idempotency key 'rw:' + a request uuid.
- Do NOT save the steps. Return { steps: [{ step_id, subject, body, note? }], usage: { used, limit } }. The page shows the diff and saves with a normal RLS update when the user clicks Keep.

Curl test:
curl -X POST "https://<ref>.supabase.co/functions/v1/tl-tone-rewrite" -H "Authorization: Bearer <OWNER_JWT>" -H "Content-Type: application/json" -d '{"sequence_id":"<id>","voice_sample":"Hey Sam, hope the launch went well! Quick one: the invoice for March is still open, could you have a look? Cheers, Ollie","firmness":2}'
Expected: 5 steps, each body still containing {{pay_link}}. Then show me the usage_ledger row. Set workspace_limit_overrides.rewrites = 1 for the workspace and call twice: the second returns 402.

Plan first, then wait for my OK.`,
  },
  {
    name: 'tl-start-job',
    purpose: 'Starts a client CSV import or an accountant export as a background job after checking membership, the file and the limits.',
    trigger: 'Called by the browser after a CSV upload or from Settings, Data (user JWT)',
    secrets: [],
    prompt: `${shared}

Build supabase/functions/tl-start-job/index.ts. Read @PRD.md sections 13.10 and 14.6 first.

Contract:
- POST JSON, a zod discriminated union on kind: { kind: 'import_clients', import_id: uuid } | { kind: 'build_export', workspace_id: uuid, export_kind: 'accountant_csv' | 'xero_csv' | 'quickbooks_csv', from_date: 'YYYY-MM-DD', to_date: 'YYYY-MM-DD' }.
- requireUser, requireMember(ws), requireAccess.
- import_clients: the imports row must be 'uploaded' and belong to ws; its file_path must start with ws + '/' and exist in the imports bucket (list the folder); mapping must map both 'name' and 'email'. Set status 'queued'. Insert job { kind: 'import_clients', ref_id: import_id, idempotency_key: 'import:' + import_id }.
- build_export: from_date <= to_date, range at most 3 years, try_rate_limit('exp:' + ws, 5, 3600) else 429. Insert exports { workspace_id, kind, from_date, to_date, status 'queued', created_by } with the admin client, then the job { kind: 'build_export', ref_id: export_id, idempotency_key: 'export:' + export_id }.
- Return { ok: true, id }.

Curl tests:
curl -X POST "https://<ref>.supabase.co/functions/v1/tl-start-job" -H "Authorization: Bearer <USER_JWT>" -H "Content-Type: application/json" -d '{"kind":"build_export","workspace_id":"<ws>","export_kind":"xero_csv","from_date":"2026-10-01","to_date":"2026-10-31"}'
Expected { ok: true, id }. After the worker runs, the exports row is 'ready' with a file_path. An import_id from another workspace returns 403 or 404.

Plan first, then wait for my OK.`,
  },
]
