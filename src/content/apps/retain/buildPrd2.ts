// Retain build PRD (PRD.md), part 2: state machines, scoring, dunning, cancel flow, usage, function contracts.

export const buildPrd2 = `
## 9. State machines

Every status lives in a Postgres enum. Only edge functions (secret key) move rows between states, and guard
triggers reject any move not listed here.

### 9.1 Stripe connection
\`\`\`
pending --(code exchanged)--> importing --(backfill done)--> active
active --(refresh fails invalid_grant | account.application.deauthorized)--> revoked
active --(5 failed calls in a row, not auth)--> error --(next good call)--> active
revoked --(founder reinstalls)--> importing
\`\`\`

### 9.2 Job
\`\`\`
queued --(worker claims, locked_at = now)--> running --(ok)--> done
running --(error, attempts < 6)--> queued (run_after = now + 2^attempts * 20s + jitter, max 1 hour)
running --(error, attempts = 6)--> dead (owner sees it in Settings > Stripe > Sync log)
running --(locked_at older than 5 minutes)--> queued (stale lock reclaimed by the worker)
\`\`\`
Job kinds: \`backfill_customers\`, \`backfill_subscriptions\`, \`backfill_invoices\`, \`apply_event\`, \`reconcile\`,
\`refresh_token\`, \`score_workspace\`, \`send_dunning_step\`, \`draft_winback\`, \`send_winback\`, \`collect_batch\`,
\`ensure_coupon\`. Every job has a unique \`idempotency_key\` (for example \`apply:evt_123\`, \`dun:<case>:<step>\`).

### 9.3 Risk band
Bands come from the score: \`low\` 0 to 39, \`watch\` 40 to 69, \`high\` 70 to 100. Band changes are recorded in
\`risk_score_history\`. A customer whose subscription is \`canceled\` has no band (shown as "Cancelled").

### 9.4 Dunning case
\`\`\`
open (invoice.payment_failed) --(step emails on schedule)--> open
open --(invoice.paid)--> recovered (recovered_cents = amount paid, recovered_by = retry | card_update | manual)
open --(invoice voided | marked_uncollectible | subscription canceled)--> lost
open --(customer deleted)--> closed
\`\`\`
At most one open case per invoice. A case opened while another is open for the same customer pauses the older
one's emails (one email stream per customer).

### 9.5 Cancel session
\`\`\`
started --(reason chosen)--> reason_given --(offer shown)--> offered
offered --(accept)--> applying --(Stripe ok)--> saved
applying --(Stripe error after retries)--> failed_offer --(customer still wants to leave)--> canceled
offered | reason_given --(confirm cancel)--> canceled
started | reason_given | offered --(no activity 30 min)--> abandoned
\`\`\`
\`saved\` and \`canceled\` are final. A customer can have at most one non-final session per subscription; a new
start reuses it.

### 9.6 Win-back run
\`\`\`
waiting (subscription canceled) --(day 1, cap ok)--> drafting --(Claude ok)--> ready
ready --(auto_send or founder approves)--> scheduled --(each email sent)--> sending --> done
any --(customer resubscribes)--> won (stop all unsent emails, record won_mrr_cents)
any --(unsubscribe | bounce | complaint)--> stopped
drafting --(cap reached)--> skipped_cap
\`\`\`

## 10. Churn risk score

A customer's score is the sum of signal points, capped at 100. Each signal has a code, fixed points, a plain
text sentence built from its detail, and a decay. Signals are recomputed nightly (and for one customer right after
any Stripe event for them). The weights are a sensible default, not science: section 10.3 shows how the founder
can see whether they work.

### 10.1 Signals
| Code | Rule | Points | Plain text template |
|---|---|---|---|
| \`payment_failed_open\` | An open dunning case | 35 | "Their last payment of {amount} failed {n} times. Next retry {date}." |
| \`payment_failed_recent\` | 2+ failed attempts in the last 90 days, now paid | 10 | "Payments failed {n} times in the last 90 days before going through." |
| \`card_expiring\` | Default card expires this month or next, no newer card on file | 15 (25 if renewal is before expiry + 7 days) | "Their card ends {month}. Renewal is on {date}." |
| \`cancel_scheduled\` | \`cancel_at_period_end\` is true | 60 | "They have already scheduled a cancel for {date}." |
| \`downgrade_recent\` | A downgrade in the last 60 days | 20 | "Downgraded from {old} to {new} on {date} ({delta} a month)." |
| \`seats_reduced\` | Quantity cut by 20%+ in the last 60 days | 15 | "Cut seats from {old} to {new} on {date}." |
| \`trial_ending_inactive\` | Trial ends in 7 days or less and under 3 active days in the trial | 25 | "Trial ends {date} and they used the product on {n} days." |
| \`paused\` | Collection paused | 10 | "Payments paused until {date}." |
| \`usage_drop\` | Active days in the last 14 vs the 28 before fell by 50%+ (needs usage data and 6+ weeks of history) | 25 (35 if 80%+) | "Used the product on {a} days in the last 2 weeks, down from {b} days before (-{pct}%)." |
| \`no_usage_14d\` | No events in 14 days for a customer who had events before | 30 | "No activity in {n} days. Last seen {date}." |
| \`seat_inactive\` | Fewer than half the paid seats active in 14 days | 10 | "{a} of {b} paid seats used the product in the last 2 weeks." |
| \`new_customer\` | First 60 days of a paid subscription | 5 | "Joined {n} days ago. New customers leave most often." |
| \`long_tenure\` | 12+ months paid with no other signal | -10 | "Customer for {n} months with no warning signs." |

Rules for the formula:
- \`score = clamp(sum(points), 0, 100)\`. \`cancel_scheduled\` alone makes the band High.
- Usage signals only fire when the workspace has usage tracking on **and** that customer has been seen at least
  once (matched by \`external_user_id\` or email). Otherwise the detail page says "Add usage tracking to see usage
  signals" instead of guessing.
- The function \`compute_risk(ws uuid, p_customer uuid default null)\` in SQL writes \`risk_signals\` and
  \`risk_scores\` in one transaction. It is \`security definer\`, called only by edge functions.
- Each signal's \`plain_text\` is built in SQL from the template above with \`format()\`. That is the explanation the
  spec asks for: it is exact, it is free, and it can never be invented.

### 10.2 The AI summary on top
For customers in Watch or High whose score moved by 10+ points since their last summary, or who never had one,
Claude writes one sentence that joins the top signals into advice. Example: "Likely to leave at renewal on 3 Nov:
the card ends this month and usage halved since they cut 3 seats. Ask if the team shrank and offer the Team plan."
The summary may only use facts from the signals passed in (section 15.1). It is shown in italics under the
signals with "Written by AI from the signals above".

### 10.3 Is the score any good?
The Dashboard has a small card "How the score did last month": of customers who cancelled last month, the share
that were High or Watch 14 days before. Target 60%+. Shown with the count ("31 of 44 cancels were flagged").

## 11. Dunning (failed payments)

### 11.1 Smart Retries checklist (guidance, read-only)
Retain cannot change the founder's retry settings through the API, so Recovery shows a checklist with exact
click paths in their Stripe dashboard and a link to each page:
1. Smart Retries on (Stripe > Settings > Billing > Revenue recovery > Retries [verify path]). Stripe recommends
   Smart Retries; the default policy is 8 tries within 2 weeks [verify].
2. After the last retry: "Cancel the subscription" or "Mark the subscription unpaid". Retain recommends
   "Mark unpaid" so the founder can still win them back with the same subscription [verify wording].
3. Stripe's own failed-payment customer emails: turn **off** if Retain's dunning emails are on, so customers do not
   get two emails. Stripe > Settings > Billing > Revenue recovery > Emails [verify].
4. Card-expiring emails: same rule.
Each row shows "Checked by you on {date}" once the founder ticks it. We do not claim to read these settings.

### 11.2 Retain's dunning emails
- Trigger: \`invoice.payment_failed\` for an invoice with a subscription, \`billing_reason\` in
  (\`subscription_cycle\`, \`subscription_update\`) and \`attempt_count\` 1 opens a case.
- Default steps (editable): day 0 "Your payment to {brand} didn't go through", day 3 "Your {brand} account is at
  risk", day 7 "Last reminder: update your card to keep {brand}", plus one on the day before the final retry if
  \`next_payment_attempt\` is known. Each email has one button: "Update card".
- Card expiring (optional): 30 and 7 days before the expiry month ends, if no newer card is on file and a renewal
  falls after expiry.
- Sent from \`{brand_name} <{workspace_slug}@mail.retain.app>\` with Reply-To the founder's support email.
  Custom sending domains are out of scope for v1.
- Every send: check \`email_suppressions\`, check the plan's email cap, write \`email_log\` with dedupe key
  \`dun:{case_id}:{step}\` before calling Resend.

### 11.3 Update-card page \`/u/[token]\`
- Token: 32 random bytes, base64url, stored as SHA-256 hash, valid 14 days, reusable until the invoice is paid.
- Page shows the founder's logo and colour, "{brand} couldn't charge your card ending {last4}", the amount due and
  one button "Update card and pay {amount}".
- The button calls \`rt-update-card\`, which creates a Checkout Session on the founder's account in \`mode: setup\`
  with \`customer\`, \`currency\`, \`success_url\` \`/u/[token]/done\` and metadata \`{ retain_case_id }\`.
- On \`checkout.session.completed\` (mode setup) from that account: read the SetupIntent's payment method, set it
  as \`invoice_settings.default_payment_method\` on the customer and \`default_payment_method\` on the subscription,
  then \`POST /v1/invoices/{id}/pay\` with an idempotency key \`pay:{invoice_id}:{setup_intent}\`. The done page
  polls the case status and shows "Paid. Thank you." or "Card saved. Your bank declined the payment: try another
  card." Fallback link: the invoice's \`hosted_invoice_url\`.

## 12. Cancel flow

### 12.1 How the founder installs it
In the founder's app, the Cancel button calls Retain instead of the Stripe portal:

\`\`\`html
<script src="https://retain.app/embed.v1.js" data-key="rt_pub_xxx" async></script>
<button onclick="Retain.cancel({ customer: 'cus_123', subscription: 'sub_456', ts: 1760000000, sig: 'hex...' })">
  Cancel plan
</button>
\`\`\`

\`sig\` proves the founder's server asked for this customer. Their server computes it (Retain gives the code in
Node, Python, Ruby, PHP and Go on the install page):

\`\`\`ts
// server side, in the founder's app
import crypto from 'node:crypto'
const ts = Math.floor(Date.now() / 1000)
const sig = crypto.createHmac('sha256', process.env.RETAIN_SIGNING_SECRET!)
  .update(customerId + '.' + subscriptionId + '.' + ts).digest('hex')
\`\`\`

Without a valid \`sig\` less than 10 minutes old, \`rt-cancel-flow\` returns 401. This is what stops anyone with the
public key from opening a cancel session (and accepting a discount) for someone else's subscription.

### 12.2 What the end customer sees
1. An overlay iframe (520px dialog, full screen under 600px) loads \`/c/[sessionId]\`.
2. Step 1: "Why are you cancelling?" with the founder's reasons (defaults: Too expensive, Not using it enough,
   Missing a feature, Switching to another tool, Technical problems, Other). Optional text box "Anything we could
   have done better?" (500 characters).
3. Step 2: one offer chosen by \`offer_rules\` for that reason and plan, for example "Pause for 2 months instead.
   You won't be charged until 14 Jan." Buttons: "Pause my plan" and "No thanks, cancel".
4. Step 3a (accepted): "Done. Your plan is paused until 14 Jan." Step 3b (declined): "Your plan ends on 30 Oct.
   You keep access until then." with a final "Confirm cancel" button. Two clicks from the offer to cancelled.
5. The founder's page gets \`window.postMessage({ type: 'retain:result', result: 'saved' | 'canceled' | 'closed' })\`
   so their UI can refresh.

Rules: never more than one offer per session; never hide the cancel button; an offer accepted in the last 6
months for the same subscription is not offered again (the customer goes straight to confirm).

### 12.3 Applying offers in the founder's Stripe
All calls go through \`getStripeFor(ws)\` with an \`Idempotency-Key\` of \`offer:{session_id}\`.
| Offer | Stripe call |
|---|---|
| Pause N months | \`POST /v1/subscriptions/{id}\` with \`pause_collection[behavior]=void\` and \`pause_collection[resumes_at]\` = now + N months |
| Discount X% for N months | Ensure the coupon exists (\`POST /v1/coupons\` with \`percent_off\`, \`duration=repeating\`, \`duration_in_months\`, id \`retain_{offer_id}\`), then \`POST /v1/subscriptions/{id}\` with \`discounts[0][coupon]\` [verify discounts vs coupon param for the API version] |
| Downgrade | \`POST /v1/subscriptions/{id}\` with \`items[0][id]\`, \`items[0][price]=target\`, \`proration_behavior=none\`, effective now; or a subscription schedule at period end if the founder chose "at renewal" |
| Confirm cancel | \`POST /v1/subscriptions/{id}\` with \`cancel_at_period_end=true\` and \`cancellation_details[comment]\` = reason label, \`cancellation_details[feedback]\` mapped from the reason (\`too_expensive\`, \`unused\`, \`missing_features\`, \`switched_service\`, \`other\`) |

\`saved_mrr_cents\` for a session = MRR before the offer (pause and discount count the full MRR as saved, since the
customer stays; downgrade counts the new MRR). The dashboard calls this "Saved MRR" and footnotes it: "Counted when
the offer is accepted. A customer who leaves later is subtracted that month."

## 13. Usage tracking (optional)

### 13.1 JS snippet
\`\`\`html
<script src="https://retain.app/t.js" data-key="rt_pub_xxx" async></script>
<script>
  window.retain = window.retain || function () { (window.retain.q = window.retain.q || []).push(arguments) }
  retain('identify', { userId: 'u_42', email: 'sam@acme.com', stripeCustomerId: 'cus_123' })
  retain('track', 'report_exported')
</script>
\`\`\`
- Sends batches of up to 20 events every 10 seconds (or on \`pagehide\` with \`navigator.sendBeacon\`) to
  \`rt-ingest\`. Automatic event: one \`session\` per tab per 30 minutes. No cookies, no IP stored.
- The publishable key only allows writing events. Anyone can send fake events with it, so browser events count
  for **activity days** only, never money. The server webhook is the trusted source.

### 13.2 Server webhook
\`POST https://<ref>.supabase.co/functions/v1/rt-ingest\` with header \`x-retain-signature: t=<unix>,v1=<hex>\`
where \`v1 = HMAC_SHA256(ingest_secret, t + '.' + rawBody)\`, body
\`{ "events": [{ "name": "login", "user_id": "u_42", "customer": "cus_123", "email": "sam@acme.com",
"occurred_at": "2026-10-18T09:00:00Z", "id": "evt-unique-1" }] }\`. Up to 500 events per call, 5 minute
timestamp tolerance, \`id\` is the idempotency key.

### 13.3 Matching events to customers
Match order: \`customer\` (Stripe id) > \`external_user_id\` already linked > \`email\` equal to a Stripe customer email.
Unmatched events are stored with \`customer_id = null\` and matched later when a customer with that email appears.
Usage page shows "82% of events matched to a Stripe customer".

## 14. Edge function contracts

Shared rules for every function: zod validation, JSON errors \`{ error: { code, message } }\`, one JSON log line per
request (never tokens, card data, emails of end customers or message bodies), \`withRetry\` (3 tries, exponential
backoff with jitter, honours \`retry-after\`, retries only 429 and 5xx), CORS only for the app origin except the
public functions noted below.

| Function | Trigger and auth | Input | Output | Errors | Retries / idempotency |
|---|---|---|---|---|---|
| \`rt-stripe-connect\` | Next.js callback with user JWT; also used by worker for refresh | \`{ action: 'exchange', code, workspace_id, mode }\` | \`{ ok, account_id, livemode }\` | 400 bad input, 401, 403 not owner/admin, 409 account already linked to another workspace, 502 Stripe | Code is single use: a repeat returns the existing connection if it matches |
| \`rt-stripe-events\` | Stripe webhook, \`Stripe-Signature\` checked on the raw body with both mode secrets | Stripe event | 200 \`{ ok }\` in under 1 s | 400 bad signature; unknown account = 200 and log | Insert into \`stripe_events\` on conflict do nothing, then queue \`apply:{evt}\` |
| \`rt-sync-worker\` | pg_cron every minute, \`x-cron-secret\` | none | \`{ claimed, done, failed }\` | 401 | Claims 25 jobs with skip locked; each job handler is idempotent |
| \`rt-score\` | pg_cron 02:00 UTC and worker after events, \`x-cron-secret\` | \`{ workspace_id?, customer_id? }\` | \`{ scored }\` | 401 | Pure SQL recompute, safe to repeat |
| \`rt-explain\` | pg_cron every 10 minutes, \`x-cron-secret\` | \`{ action: 'submit' \\| 'collect' }\` | \`{ submitted, collected }\` | 401, 402 cap (skips that workspace) | Batch request \`custom_id\` = \`sum:{customer}:{score_version}\`; results applied once |
| \`rt-ingest\` | Public. Browser: \`data-key\` publishable key + Origin allow-list. Server: HMAC header | events array | 202 \`{ accepted, duplicates }\` | 400, 401, 413 over 500 events or 256 KB, 429 rate, 402 monthly cap | \`unique (workspace_id, idempotency_key)\` |
| \`rt-cancel-flow\` | Public, CORS \`*\`. \`start\` needs the HMAC \`sig\`; later steps need the session id + a session secret returned by start | \`{ action: 'start' \\| 'reason' \\| 'accept' \\| 'cancel', ... }\` | session state for the UI | 401 bad sig, 404, 409 wrong state, 422 offer not allowed, 429, 502 Stripe | Stripe calls use \`offer:{session}\` and \`cancel:{session}\` idempotency keys |
| \`rt-update-card\` | Public, token in body | \`{ token }\` | \`{ url }\` (Checkout) | 404 bad or expired token, 409 already paid, 429, 502 | One open Checkout Session per token reused for 23 hours |
| \`rt-email-worker\` | pg_cron every minute, \`x-cron-secret\` | none | \`{ sent, skipped }\` | 401 | \`email_log.dedupe_key\` unique; Resend \`Idempotency-Key\` header [verify] |
### 14.1 Shared helpers (\`supabase/functions/_shared/\`)

| File | What it does |
|---|---|
| \`admin.ts\` | \`adminClient()\` with \`SUPABASE_URL\` and \`SUPABASE_SECRET_KEY\`, no session persistence |
| \`auth.ts\` | \`requireUser(req)\` with \`getClaims\`, \`requireMember(ws, roles?)\`, \`requireAccess(ws)\`, \`requireCron(req)\` (constant-time compare) |
| \`http.ts\` | \`HttpError\`, \`json()\`, CORS for the app origin, a separate \`publicCors\` for the three public functions |
| \`crypto.ts\` | \`encrypt(text)\` / \`decrypt(blob)\` with AES-GCM 256 from \`RETAIN_TOKEN_KEY\`, 12 byte random IV, output \`v1.<iv>.<cipher>\` base64url; \`hmacHex(secret, text)\`; \`sha256Hex\`; \`newToken()\` (32 bytes base64url); \`timingSafeEqualHex\` |
| \`stripe.ts\` | \`getStripeFor(ws)\` returns a thin fetch wrapper for the founder's account (refreshes the access token when needed, under \`pg_advisory_xact_lock\` on the connection id); \`platformStripe()\` uses your \`STRIPE_SECRET_KEY\` for token exchange only; \`verifyStripeSignature(raw, header, secrets[])\` |
| \`limits.ts\` | \`checkLimit(ws, kind, qty)\` throws 402 \`limit_reached\` with "You have used 480 of 500 emails this month." |
| \`meter.ts\` | \`meter({ ws, kind, quantity, costMicros, refId, idempotencyKey })\` |
| \`claude.ts\` | \`callClaude()\` real time and \`buildBatchRequest()\` for batches, both with the injection guard wrapper |
| \`email.ts\` | \`sendEmail()\`: suppression check, cap check, \`email_log\` insert first (dedupe), Resend call, update status |
| \`jobs.ts\` | \`enqueue(kind, refId, key, payload, runAfter?)\` with on conflict do nothing |

### 14.2 Security model in one table

| Thing | Who can read | Who can write |
|---|---|---|
| Customers, scores, signals, cases, sessions, runs | Members of the workspace (RLS) | Edge functions only (secret key) |
| Offers, reasons, rules, dunning and win-back settings | Members | Owners and admins (RLS), validated by check constraints |
| \`stripe_connections\` tokens | Nobody from the browser (no select policy; a view exposes status, account id, mode, last sync) | Edge functions only |
| \`workspace_keys\` secrets | Nobody from the browser. The publishable key is shown through a view. The signing and ingest secrets are shown once on rotate, by the API route, then never again | \`/api/keys/rotate\` with the secret key after an owner/admin check |
| Retain's own \`subscriptions\` | The user's own row | Billing webhook only |
| \`usage_ledger\`, \`jobs\`, \`email_log\`, \`stripe_events\` | Members can read their ledger (for meters); the rest nobody | Edge functions only |

### 14.3 Seed script for testing

\`scripts/seed-stripe.ts\` (run with \`npx tsx scripts/seed-stripe.ts\` against a **test-mode** Stripe account you
installed the app on, using that account's own test secret key in \`.env.local\` as \`SEED_STRIPE_KEY\`):
- Creates 3 products and 6 prices (Basic $19, Team $49, Pro $149, monthly and yearly).
- Creates 30 customers with test cards: 20 with \`pm_card_visa\`, 4 with \`pm_card_chargeCustomerFail\`
  (fails on renewal), 3 with a card expiring next month, 3 on trials ending in 5 days.
- Creates a subscription for each, cuts seats on 2, downgrades 2, sets \`cancel_at_period_end\` on 1.
- Uses Stripe test clocks for the failing ones so you can advance time and trigger \`invoice.payment_failed\`.
- Prints a table of what it made. Never runs if the key starts with \`sk_live_\` or \`rk_live_\`.
`
