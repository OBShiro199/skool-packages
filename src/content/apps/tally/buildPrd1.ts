// Tally build PRD (PRD.md), part 1: product, architecture, routes, data model, state machines, plans, integrations.

export const buildPrd1 = `# Tally: build PRD

Version 1.0. Download this file, save it as \`PRD.md\` in the root of your project folder, and reference it in
Claude Code with \`@PRD.md\`. Claude Code reads it before every task. Where this file and your instinct disagree,
this file wins. The look and feel lives in \`@DESIGN_SYSTEM.md\` (the Quiet Precision base system) and \`@DESIGN.md\`
(Tally's accent and screens), the marketing page in \`@LANDING.md\`. Your \`CLAUDE.md\` must contain the line
\`UI rules: @DESIGN_SYSTEM.md @DESIGN.md\`.

## 0. How to use this document

- Read sections 1 to 5 once so you know what you are building and for whom.
- Sections 6 to 19 are the spec. Claude Code builds from them.
- Section 23 lists the build milestones. Do them in order. Do not start a milestone before the one before it
  passes its acceptance tests (section 22).
- Every new Claude Code session, say: "Read @PRD.md, @DESIGN_SYSTEM.md and @DESIGN.md. We are on milestone N.
  Plan first, then wait for my OK."
- Use Opus at high effort (\`/model opus\`, \`/effort high\`) for anything that touches the schema, RLS, money
  maths, Stripe, webhooks or the public pay page. Medium is fine for UI copy and layout.
- Money is always integer minor units (cents, pence) in a column ending \`_cents\`, plus a 3-letter lowercase
  currency code. Never store money as a float. Never let the browser send a total the server trusts.

## 1. Problem

Freelancers and small agencies do the work, send the invoice, and then become unpaid debt collectors.
The invoice goes out on the 1st. Nothing happens. On the 20th they notice, feel awkward, write a careful
"just checking in" email at 11pm, and the client pays on the 34th. Next month the same thing happens with a
different client.

What they do today:
- Make the invoice in Google Docs, Word or Canva, export a PDF, attach it to an email, and keep a spreadsheet of
  who has paid. Reminders happen when they remember.
- Or use FreshBooks, Bonsai or Invoice Ninja (about $14 to $70 a month [verify]), which send invoices well but
  treat reminders as an afterthought: one generic "your invoice is overdue" email from a no-reply address that
  clients ignore.
- Or pay for a credit-control tool like Chaser (from about £199 a month [verify]), built for finance teams with
  an accounting system, not a designer with nine clients.
- Lose track of partial payments, deposits and which client prefers bank transfer.

The cost: a freelancer with $12,000 outstanding at any time, and an average of 30+ days to get paid, is lending
their clients a month of income for free and spending an hour or two a week writing chase emails they hate
writing.

## 2. Ideal customer (ICP)

- **Who:** solo freelancers (designers, developers, copywriters, video editors, photographers), independent
  consultants (marketing, ops, fractional CFOs and CMOs), and small agencies of 2 to 15 people.
- **Volume:** 5 to 150 invoices a month. Invoice size $300 to $25,000. Clients in more than one country is common.
- **Behaviour:** invoices from a template or an old accounting tool, takes card or bank transfer, chases late
  payers by hand, has a business domain (studio.com) and a Google Workspace or Microsoft 365 inbox.
- **Pain trigger:** "I have $9k outstanding and I have to email three clients today and I hate it."
- **Will pay:** $19 to $79 a month if invoices get paid without them writing a single chase email, and they can
  see their real "average days to pay" number move.
- **Not for (v1):** companies that need full double-entry accounting, payroll, purchase orders, multi-entity
  consolidation, or dunning for subscription billing (that is Stripe Billing's job).

## 3. The one core job

"I create an invoice, hit Send, and forget about it. Tally emails it from my own domain with a pay link, then
reminds the client politely and a little more firmly each time until they pay. The moment they pay or reply,
the reminders stop. I see who owes what, and when the money will land."

Everything in v1 serves that sentence. If a feature does not shorten send-to-paid or remove a chase email, it
waits.

## 4. User stories

### Owner (workspace owner)
1. As an owner, I sign up, name my business, upload my logo, pick a brand colour, set my base currency and
   default payment terms in under 5 minutes.
2. As an owner, I connect my Stripe account (or create one) so clients pay straight into my Stripe, by card or
   bank transfer where my country supports it.
3. As an owner, I verify my sending domain (or a subdomain like \`billing.studio.com\`) so invoices come from
   \`accounts@billing.studio.com\`, not from Tally.
4. As an owner, I add a client with name, company, billing email, extra CC emails, currency, terms and tax rate.
5. As an owner, I import 200 clients from a CSV, map the columns, and see which rows failed and why.
6. As an owner, I create an invoice with line items, quantities, unit prices, per-line tax, a discount and notes,
   and preview the PDF before sending.
7. As an owner, I send it now or schedule it, and the client gets an email with the PDF attached and a link to a
   hosted pay page in my branding.
8. As an owner, I can ask for a deposit (for example 30%) as its own invoice, and the final invoice deducts it.
9. As an owner, I can allow partial payments with a minimum, so a client can pay $2,000 now and the rest later.
10. As an owner, I get a reminder sequence by default: 3 days before due, on the due date, 3, 7 and 14 days after.
    The tone escalates from friendly to firm. I can edit every step and preview it with real data.
11. As an owner, I can turn reminders off, or use a different sequence, for one client or one invoice.
12. As an owner, reminders stop on their own when the client pays in full, and pause when the client replies to
    any Tally email. I get the reply forwarded to my inbox.
13. As an owner, if the client replies "I will pay on Friday", Tally pauses until Saturday and then carries on,
    and tells me it did that.
14. As an owner, I can add an optional late fee (fixed or percentage, once or monthly, capped) that is applied
    automatically after a number of days overdue. Off by default.
15. As an owner, I create recurring invoices (weekly, monthly, quarterly, yearly) that draft or send themselves.
16. As an owner, I invoice in USD, EUR, GBP, CAD, AUD and more, and the dashboard converts everything to my base
    currency with daily ECB rates.
17. As an owner, my dashboard shows outstanding, overdue, average days to pay, and a cash forecast for the next
    8 weeks.
18. As an owner, I record a payment that arrived outside Stripe (cheque, wire to my bank) so reminders stop.
19. As an owner, I export invoices and payments for a date range as CSV for my accountant, and in a
    Xero-friendly or QuickBooks-friendly CSV layout.
20. As an owner, I invite a teammate. Members can create and send invoices. Only owners and admins change billing,
    Stripe, domains, reminder sequences and late fees.

### Client (never logs in)
21. As a client, I open the email, see the amount and due date, click "View and pay", and pay by card or bank
    transfer on my phone in under a minute.
22. As a client, I download the PDF, see what I have already paid, and get a receipt by email.
23. As a client, I can reply to any reminder and a human reads it.

## 5. Scope decisions (and why)

| Decision | Choice | Why | What breaks first at scale, and the fix |
|---|---|---|---|
| Who holds the money | Stripe Connect, connected accounts with a full Stripe Dashboard (Standard-style), direct charges | Money goes straight to the freelancer, they are the merchant, Stripe handles their onboarding, payouts and disputes. Tally takes no cut and pays no Connect fees [verify on stripe.com/connect/pricing] | Some users have no Stripe account. Fix: create one for them with an Account Link (section 11.1) |
| Pay link | A Tally-hosted pay page \`/i/<token>\` that creates a Stripe Checkout Session on demand | Stripe Payment Links have a fixed amount. Partial payments, late fees and deposits change the amount due, so the session is created at click time for exactly what is owed | Many open sessions per invoice. Fix: expire the previous open session before creating a new one |
| Invoices themselves | Tally's own tables and PDF, not Stripe Invoicing | Stripe Invoicing adds 0.4% per paid invoice on the user's account and owns the reminder emails. We want our own reminder engine and branding | You must build tax, numbering and PDFs yourself (this PRD covers them) |
| Bank transfer | Offer what the connected account has activated: ACH Direct Debit (USD), SEPA Direct Debit (EUR), Bacs Direct Debit (GBP), and Stripe bank transfers (\`customer_balance\`) where available | Cheaper for big invoices (ACH is 0.8% capped at $5 [verify]) and clients in many countries prefer it | Bank methods confirm in 1 to 5 days. Fix: \`processing\` state on the payment and the \`checkout.session.async_payment_succeeded\` webhook |
| Sending email | Resend, from the user's own verified domain through the Resend Domains API | Clients open email from the freelancer's domain. A shared "no-reply" sender gets ignored | Resend caps domains per plan (Pro 10, Scale about 1,000 [verify]). Fix: Scale from about 9 customers; at 1,000 workspaces ask Resend for Enterprise or let unverified users send from a shared Tally subdomain |
| Detecting replies | Reply-To on every client email is a per-invoice address on Tally's inbound domain, received by Resend Inbound | We cannot read the user's inbox. A unique Reply-To tells us exactly which invoice the reply is about | Inbound volume counts toward the Resend quota (each received email counts as one [verify]). Fix: covered in the cost model |
| Reading replies | One Claude call per reply (\`claude-opus-5-5\`, low effort, structured output) classifies it: promise to pay, paid already, dispute, question, out of office, other | "I will pay Friday" and "I am out until Monday" need different handling. A keyword match gets this wrong | Cost per reply is about $0.013. Caps per plan stop abuse. You can test \`claude-haiku-5-5\` ($0.10/$0.50 per MTok) later if you want it cheaper |
| PDFs | Rendered in the worker with \`pdf-lib\` (pure JS, runs in Deno) and stored in Storage | No headless browser, no extra vendor, about 200 ms per invoice | Fonts make the bundle big. Fix: embed one subset Geist TTF, not the family |
| Long and flaky jobs | \`jobs\` table + pg_cron worker every minute (PDFs, emails, CSV import and export, reply reading, recurring runs) | Nothing in the browser waits on a vendor. Every job retries with backoff and has an idempotency key | One worker handles about 40 jobs a minute. At 1,000 customers, raise the batch and add a second schedule offset by 30 s |
| Reminder timing | Daily send window 09:00 to 11:00 in the workspace timezone, checked every 15 minutes | Reminders at 3am look like spam and get ignored | Thousands due at 09:00. Fix: the scheduler spreads them with a random 0 to 90 minute \`run_after\` |
| FX | Frankfurter (ECB reference rates, free, no key), stored daily in \`fx_rates\` | Dashboard totals only. The client always pays in the invoice currency | ECB has about 30 currencies. Others show "not converted" in the dashboard |
| Multi-user | Workspaces, members with roles, RLS through \`is_workspace_member()\` and \`has_workspace_role()\` | Agencies share clients and invoices | Seat limits enforced in \`create_invite\` and \`accept_invite\`, not only in the UI |
| Billing owner | The workspace owner's subscription decides access for the whole workspace | One card per business | Ownership transfer is a support action in v1 |
| Accounting sync | CSV exports in v1 (generic, Xero layout, QuickBooks layout). API sync is milestone M10 | CSV covers every accountant on day one and costs nothing. Xero's developer tiers charge above 5 connections [verify] | Accountants want live sync. Fix: M10 after 20 paying customers ask |

## 6. Architecture

\`\`\`
         Browser (owner, team)                                 Browser (client, no login)
                 |                                                        |
                 v                                                        v
  +--------------------------------+                 +------------------------------------+
  | Next.js on Vercel              |                 | /i/[token]  hosted pay page        |
  | /app/* (getClaims on server)   |                 | renders what tl-public-invoice     |
  | /api/stripe/* (platform)       |                 | returns, never reads tables        |
  +---------------+----------------+                 +------------------+-----------------+
                  | publishable key + JWT (RLS)                         | token only
                  v                                                     v
  +------------------------------------------------------------------------------------------+
  | Supabase                                                                                 |
  | Postgres + RLS (workspace_id)   Storage: brand-assets, invoice-pdfs, imports, exports    |
  | Edge functions:                                                                          |
  |  tl-send-invoice   tl-worker   tl-scheduler   tl-public-invoice   tl-create-checkout     |
  |  tl-connect-webhook   tl-resend-webhook   tl-domains   tl-tone-rewrite   tl-start-job     |
  | pg_cron: tl-worker every minute, tl-scheduler every 15 minutes, FX at 16:30 UTC          |
  +------+-------------------+--------------------+---------------------+--------------------+
         |                   |                    |                     |
         v                   v                    v                     v
   Stripe (platform    Resend                Anthropic API         Frankfurter
   subscription +      send from user's      claude-opus-5-5       ECB daily rates
   Connect direct      domain, inbound       (read replies,        (dashboard totals)
   charges on the      replies, bounces      write reminder copy)
   user's account)     (Svix-signed)
\`\`\`

Flow of one invoice:
1. The owner builds a draft in \`/app/invoices/new\` (browser writes \`invoices\` and \`invoice_lines\` through RLS;
   a trigger recalculates totals in the database, so the browser never sets a total).
2. "Send" calls \`tl-send-invoice\`. It checks the plan cap, assigns the next invoice number in a locked
   transaction, creates the public token (only its hash is stored), freezes the revision, computes the reminder
   schedule, and enqueues \`render_pdf\` then \`send_invoice_email\` jobs.
3. \`tl-worker\` (every minute) renders the PDF with pdf-lib into \`invoice-pdfs/<ws>/<invoice>/r<rev>.pdf\` and sends
   the email through Resend from the workspace's verified domain with the PDF attached, a "View and pay" button,
   and \`Reply-To: r-<reply_token>@<RESEND_INBOUND_DOMAIN>\`.
4. The client opens \`/i/<token>\`. The page calls \`tl-public-invoice\`, which hashes the token, returns only that
   invoice's public view, and records a view (first view sets \`viewed\`).
5. "Pay" calls \`tl-create-checkout\` with the amount (full, or a partial amount within bounds). It creates a
   Checkout Session on the connected account (\`stripeAccount: acct_...\`) and returns its URL.
6. Stripe sends \`checkout.session.completed\` (card) or \`checkout.session.async_payment_succeeded\` (bank) from
   the connected account to \`tl-connect-webhook\`. It verifies the signature, de-duplicates by event id,
   records the payment, updates \`amount_paid_cents\`, sets \`partially_paid\` or \`paid\`, cancels pending
   reminders when paid, and enqueues receipt emails.
7. \`tl-scheduler\` (every 15 minutes) finds reminders due in each workspace's send window, checks the invoice is
   still unpaid and its sequence is active, and enqueues \`send_reminder\` jobs. It also applies late fees, runs
   recurring profiles, and sends the Monday digest.
8. If the client replies, Resend posts \`email.received\` to \`tl-resend-webhook\`. It verifies the Svix signature,
   finds the invoice by reply token, pauses the sequence at once, and enqueues \`classify_reply\` and
   \`forward_reply\`. The worker reads the reply with Claude and may set a "pause until" date.

## 7. Routes and pages

The app shell has a left sidebar (DESIGN.md section 6). One level, no nested menus.

**Sidebar, top group:** logo, Dashboard, Invoices, Clients, Recurring, Reminders.
**Sidebar, bottom group (always this order):** Documentation, Help, Billing, Settings.

| Route | Who | What it does |
|---|---|---|
| \`/\` | public | Landing page (LANDING.md) |
| \`/pricing\` | public | Same pricing section as the landing page, full width |
| \`/login\`, \`/signup\`, \`/reset\` | public | Supabase auth. "Confirm email" off |
| \`/invite/[token]\` | public, then auth | Accept a team invite. Signs up or logs in, then joins the workspace |
| \`/onboarding\` | auth | 5 steps: business, brand, money (base currency, terms, tax), get paid (Stripe, skippable), sending domain (skippable) |
| \`/paywall\` | auth | Shown when the owner's subscription is not trialing or active |
| \`/app\` | member | Redirects to \`/app/dashboard\` |
| \`/app/dashboard\` | member | Outstanding, overdue, average days to pay, 8 week cash forecast, "Needs you" list (replies, disputes, bounces) |
| \`/app/invoices\` | member | Table: number, client, status pill, issue date, due date, total, due, last activity. Filters by status, client, currency, date. Export button |
| \`/app/invoices/new\` | member | Invoice editor (draft). Query \`?client=<id>\` pre-fills the client |
| \`/app/invoices/[id]\` | member | Draft: the editor. Sent: read-only invoice, payments, reminder timeline, replies, actions (record payment, pause reminders, edit and resend, void) |
| \`/app/clients\` | member | Table: name, company, email, currency, outstanding, average days to pay, reminders on/off |
| \`/app/clients/[id]\` | member | Client detail: contact, defaults, reminder override, invoices, payments, replies |
| \`/app/clients/import\` | member | CSV upload, column mapping, progress, error rows |
| \`/app/recurring\` | member | Recurring profiles: client, frequency, next run, amount, auto-send on/off, status |
| \`/app/recurring/[id]\` | member | Profile editor with lines, schedule and history |
| \`/app/reminders\` | member (edit: owner/admin) | Sequences: steps with day offset, tone, subject, body, preview with a real invoice, "Write in my voice" |
| \`/app/docs\` | member | Documentation: getting paid, domains, reminders, partial payments, late fees, exports, FAQ |
| \`/app/help\` | member | Contact form (Resend to the founder) and links |
| \`/app/billing\` | owner | Plan, usage meters (invoices sent, seats, sending domains, AI rewrites), Stripe portal button |
| \`/app/settings\` | member | Tabs: Profile, Business, Payments (Stripe), Email sending (domains), Taxes, Late fees, Team, Notifications, Data (import, exports) |
| \`/i/[token]\` | public | Hosted pay page: invoice view, pay full or partial, download PDF, payment history |
| \`/i/[token]/paid\` | public | Thank-you page after Checkout (shows "Confirming" until the webhook lands) |
| \`/api/stripe/webhook\` | Stripe | Platform subscription webhook (shared playbook step) |
| \`/api/stripe/connect/start\` | owner | Starts Connect: OAuth for an existing Stripe account, or create an account + Account Link |
| \`/api/stripe/connect/callback\` | owner | OAuth return: saves the connected account id |
| \`/api/stripe/connect/refresh\` | owner | Account Link \`refresh_url\`: makes a fresh onboarding link |
| \`/api/files/[kind]/[id]\` | member | Returns a 60 s signed URL for an invoice PDF or an export after checking membership |

Rules for every \`/app\` page:
- Server components check the user with \`supabase.auth.getClaims()\` and redirect to \`/login\` if missing.
- Then call \`has_active_access(workspace_id)\`. If false, redirect to \`/paywall\`.
- Never cache authenticated pages.

## 8. Data model

All tables live in \`public\`, have RLS on, and carry \`workspace_id\` unless noted. The full migration is in the SQL
step of the playbook. Summary:

| Table | Key columns | Notes |
|---|---|---|
| \`profiles\` | id (= auth.users.id), full_name, timezone, current_workspace_id | Trigger on signup |
| \`workspaces\` | id, name, owner_id, base_currency, timezone, default_terms_days, invoice_prefix | Owner's subscription decides access |
| \`workspace_members\` | workspace_id, user_id, role (owner, admin, member) | PK (workspace_id, user_id) |
| \`workspace_invites\` | id, workspace_id, email, role, token_hash, invited_by, expires_at, accepted_at | Token emailed, hash stored |
| \`business_profiles\` | workspace_id (PK), legal_name, address, tax_id, logo_path, accent_hex, footer_text, payment_instructions, reply_to_email, sender_name | What prints on the invoice |
| \`sending_domains\` | id, workspace_id, domain (unique), resend_domain_id, status, records (jsonb), from_local, from_name, verified_at, last_checked_at | One active per workspace (3 on Agency) |
| \`tax_rates\` | id, workspace_id, name, pct, active | Exclusive tax only in v1 |
| \`saved_items\` | id, workspace_id, description, unit_price_cents, currency, tax_rate_id | Quick-add line items |
| \`clients\` | id, workspace_id, name, company, email, cc_emails[], currency, terms_days, tax_rate_id, address, notes, reminders_enabled, reminder_sequence_id, archived_at | Unique (workspace_id, lower(email)) for live clients |
| \`client_stripe_customers\` | client_id, stripe_account_id, stripe_customer_id | Customer on the CONNECTED account, made lazily |
| \`invoices\` | id, workspace_id, client_id, number, kind (standard, deposit, recurring), status, currency, issue_date, due_date, subtotal_cents, discount_cents, tax_cents, late_fee_cents, deposit_credit_cents, total_cents, amount_paid_cents, amount_due_cents, allow_partial, min_partial_cents, allow_card, allow_bank, reminders_enabled, reminder_sequence_id, sequence_state, paused_until, pause_reason, revision, pdf_path, public_token_hash, reply_token_hash, deposit_for_invoice_id, recurring_profile_id, scheduled_send_at, sent_at, first_viewed_at, paid_at, voided_at, notes, terms, fx_rate_to_base, created_by | Totals are written only by triggers and edge functions |
| \`invoice_lines\` | id, invoice_id, workspace_id, position, kind (item, late_fee, deposit_credit), description, quantity, unit_price_cents, tax_rate_id, tax_pct, line_subtotal_cents, line_tax_cents | Locked once any payment exists |
| \`invoice_events\` | id, workspace_id, invoice_id, kind, data (jsonb), actor, created_at | The timeline. Append only |
| \`payments\` | id, workspace_id, invoice_id, amount_cents, currency, method, status, source (stripe, manual), stripe_account_id, checkout_session_id, payment_intent_id, received_at, note, recorded_by | Manual payments by members, Stripe payments only by the webhook |
| \`reminder_sequences\` | id, workspace_id, name, is_default | One default per workspace |
| \`reminder_steps\` | id, sequence_id, workspace_id, offset_days (-30 to 90), tone, subject, body, enabled, position | Default 5 steps seeded |
| \`reminder_sends\` | id, workspace_id, invoice_id, step_id, offset_days, send_on (date), status, sent_at, email_log_id | Unique (invoice_id, step_id, revision) |
| \`inbound_messages\` | id, workspace_id, invoice_id, resend_email_id (unique), from_email, subject, text_excerpt, intent, promised_date, confidence, summary, received_at, classified_at, forwarded_at | Max 8,000 characters kept |
| \`recurring_profiles\` | id, workspace_id, client_id, currency, lines (jsonb), notes, terms, frequency, interval_count, anchor_day, next_run_on, ends_on, max_runs, run_count, auto_send, status | Runs at 06:00 workspace time |
| \`late_fee_policies\` | workspace_id (PK), enabled, kind (fixed, percent), amount_cents, pct, after_days, repeat (once, monthly), max_applications, max_total_pct | Off by default |
| \`invoice_counters\` | workspace_id (PK), next_value | Gapless numbering with a row lock |
| \`imports\` | id, workspace_id, kind (clients_csv), file_path, mapping (jsonb), status, total_rows, ok_rows, error_rows, errors (jsonb), created_by | Async job |
| \`exports\` | id, workspace_id, kind (accountant_csv, xero_csv, quickbooks_csv), from_date, to_date, status, file_path, created_by | Async job |
| \`fx_rates\` | rate_date, quote, rate (per 1 EUR) | No workspace_id: shared reference data |
| \`integrations\` | id, workspace_id, provider (stripe), external_account_id, charges_enabled, capabilities (jsonb), country, default_currency, status, connected_by | Public status only, no tokens |
| \`jobs\` | id, workspace_id, kind, ref_id, status, attempts, run_after, locked_at, idempotency_key (unique), payload, last_error | The async queue |
| \`usage_ledger\` | id, workspace_id, user_id, kind, quantity, cost_usd_micros, ref_id, idempotency_key, created_at | Every metered action |
| \`email_log\` | id, workspace_id, invoice_id, kind, to_email, dedupe_key (unique), resend_id, status, created_at | Every Resend send |
| \`email_suppressions\` | workspace_id, email, reason | Bounced or complained client addresses, per workspace |
| \`notification_prefs\` | workspace_id + user_id (PK), on_paid, on_reply, on_overdue, weekly_digest | Per member |
| \`subscriptions\`, \`stripe_events\` | shared billing tables | Written only by the platform webhook |
| \`connect_events\` | id (evt_), account, type, received_at | De-dupe for the Connect webhook |
| \`webhook_receipts\` | id (svix-id), source, received_at | De-dupe for the Resend webhook |

Invoice maths (done by the database trigger \`recalc_invoice\` and repeated in \`lib/money.ts\` for the editor preview):
\`\`\`
line_subtotal = round(quantity x unit_price)                     (half away from zero, per line)
line_tax      = round(line_subtotal x tax_pct / 100)
subtotal      = sum(line_subtotal of kind 'item')
discount      = invoices.discount_cents (never more than subtotal)
tax           = sum(line_tax) scaled down pro rata when there is a discount
late_fee      = sum(line_subtotal of kind 'late_fee')            (never taxed in v1)
deposit_credit= sum(line_subtotal of kind 'deposit_credit')      (stored negative)
total         = subtotal - discount + tax + late_fee + deposit_credit
amount_due    = total - amount_paid                               (never below 0)
\`\`\`
A test file \`lib/money.test.ts\` must cover 12 cases, including a 3-decimal quantity, a 100% discount, a deposit
larger than the remaining balance, and JPY (zero-decimal currency: \`unit_price_cents\` is whole yen).

Zero-decimal currencies (JPY, KRW, VND and the rest of Stripe's list) are stored as whole units in the \`_cents\`
columns and passed to Stripe unchanged. \`lib/currency.ts\` holds the list and the display formatter
(\`Intl.NumberFormat\`). Never divide by 100 for a zero-decimal currency.

## 9. State machines

### 9.1 Invoice status
\`\`\`
draft --> scheduled --> sent --> viewed --> partially_paid --> paid
  |                      |         |              |
  |                      +---------+--------------+--> void (owner, only while amount_paid = 0)
  |                                               +--> uncollectible (owner marks it, reminders stop)
  +--> deleted (drafts only, never numbered)
paid --> partially_paid (a refund or chargeback lowers amount_paid)
\`\`\`
- \`draft\`: no number yet. Fully editable. Never visible to the client.
- \`scheduled\`: number assigned, \`scheduled_send_at\` set. The scheduler sends it in the next window after that time.
- \`sent\`: email accepted by Resend. \`sent_at\` set once. Reminder schedule written.
- \`viewed\`: first view of the pay page by someone who is not a workspace member. \`first_viewed_at\` set once.
- \`partially_paid\`: \`0 < amount_paid < total\`. Reminders continue for the balance with "Thanks for your payment
  of {amount_paid}" in the copy.
- \`paid\`: \`amount_paid >= total\`. \`paid_at\` set. All \`reminder_sends\` still \`scheduled\` become \`cancelled\`.
- Overdue is NOT a status. It is derived: \`due_date < today (workspace timezone) and status in (sent, viewed,
  partially_paid)\`. The \`invoice_overview\` view exposes \`is_overdue\` and \`days_overdue\`.
- Editing after send: allowed only while \`amount_paid = 0\`. "Edit and resend" bumps \`revision\`, re-renders the
  PDF, rewrites future reminders for the new due date, logs an event and (optionally) emails "Updated invoice".

### 9.2 Reminder sequence (per invoice, \`invoices.sequence_state\`)
\`\`\`
active --> paused_reply ------(owner clicks Resume)----------------> active
   |   --> paused_promise ----(paused_until passes, scheduler)-----> active
   |   --> paused_manual -----(owner clicks Resume)----------------> active
   |   --> paused_dispute ----(owner clicks Resume)----------------> active
   |   --> paused_bounce -----(owner fixes the email)--------------> active
   +--> completed (last step sent)      +--> stopped (paid, void, uncollectible, reminders off)
\`\`\`
- Any reply pauses at once (\`paused_reply\`) before Claude reads it. Classification can then change it:
  \`promise_to_pay\` with a date within 45 days sets \`paused_promise\` and \`paused_until = promised_date + 1 day\`;
  \`out_of_office\` returns it to \`active\` (no pause); \`dispute\` sets \`paused_dispute\` and flags it on the
  dashboard; \`paid_already\` stays \`paused_reply\` and asks the owner to record the payment.
- A reminder step that came due while paused is skipped (\`reminder_sends.status = 'skipped'\`), never sent late in
  a burst. On resume, the next future step is the next one sent. If none are left, a single "final reminder" step
  is sent on the next window.
- Steps never send on the same day as another Tally email to that client for that invoice.

### 9.3 Payment
\`\`\`
pending (Checkout created) --> processing (bank debit started) --> succeeded --> refunded | partially_refunded
       \\                                \\
        +--> expired (session expired)   +--> failed (bank debit failed: reminders resume, owner emailed)
manual payments are inserted as succeeded by a member
\`\`\`

### 9.4 Sending domain
\`not_started\` --> \`pending\` (records shown) --> \`verified\` | \`failed\` (72 hours without records [verify]) -->
\`pending\` (Re-check). While no domain is verified, the workspace sends from
\`<workspace-slug>@mail.<your Tally domain>\` with the business name as the From name. Show this clearly.

### 9.5 Job
\`\`\`
queued --> running --> done
   ^          |
   +- retry --+  (attempts < 5, run_after = now() + 2^attempts minutes + random 0 to 30 s)
              +--> dead (attempts = 5: owner email, "Needs you" item on the dashboard)
\`\`\`
Job kinds: \`render_pdf\`, \`send_invoice_email\`, \`send_reminder\`, \`send_receipt\`, \`forward_reply\`,
\`classify_reply\`, \`import_clients\`, \`build_export\`, \`run_recurring\`, \`refresh_fx\`, \`send_digest\`.
A job stuck in \`running\` for more than 10 minutes is released back to \`queued\`.

### 9.6 Recurring profile
\`active\` --> \`paused\` --> \`active\`; \`active\` --> \`ended\` (ends_on passed or max_runs reached). Each run creates one
invoice with idempotency key \`recur:<profile_id>:<run_date>\`, then moves \`next_run_on\` forward by the frequency.
A monthly profile anchored on the 31st runs on the last day of shorter months.

## 10. Plans and limits

| | Solo | Studio | Agency |
|---|---|---|---|
| Price | $19/month or $190/year | $39/month or $390/year | $79/month or $790/year |
| Seats | 1 | 3 | 10 |
| Invoices sent per month | 50 | 250 | 750 |
| Clients | Unlimited | Unlimited | Unlimited |
| Reminder sequences | 1 (editable) | 5 | Unlimited |
| Sending domains | 1 | 1 | 3 (one per brand) |
| Recurring invoices | Yes | Yes | Yes |
| Deposits, partial payments, multi-currency | Yes | Yes | Yes |
| Late fees | Yes | Yes | Yes |
| Replies read by AI | Up to 100 a month | Up to 500 a month | Up to 1,500 a month |
| "Write in my voice" rewrites | 10 a month | 30 a month | 60 a month |
| "Sent with Tally" line on the pay page | Yes | Removable | Removable |
| CSV export (generic, Xero, QuickBooks layouts) | Yes | Yes | Yes |
| Xero / QuickBooks sync (later milestone) | No | Yes | Yes |

- Trial: 7 days, card required through Stripe Checkout (\`subscription_data.trial_period_days = 7\`). During the
  trial the chosen plan's limits apply, but invoices sent are capped at 10 and rewrites at 3.
- "Invoices sent" counts each invoice the first time it is sent (deposit and recurring invoices count). Reminders,
  receipts and resends of the same invoice do not count.
- Limits are counted per workspace per calendar month (UTC) from \`usage_ledger\`.
- Enforcement is server-side: \`tl-send-invoice\` and the recurring runner (invoices), \`tl-worker\`
  classify_reply (replies: over the cap, the reply is still paused and forwarded, only the AI reading is skipped),
  \`tl-tone-rewrite\` (rewrites), \`tl-domains\` (domains), \`create_invite\` and \`accept_invite\` (seats).
- The UI shows meters on \`/app/billing\` and a compact meter in the sidebar ("Invoices 12 of 50"). At 80% the meter
  turns amber and the owner gets one email. At 100% "Send" stays the same width, disabled, with "You have sent
  all 50 invoices this month. Upgrade or wait until 1 Nov." Reminders for invoices already sent keep going.
- Plan lookup: \`lib/plans.ts\` maps Stripe price ids to a plan key. The SQL function \`plan_limits(ws)\` holds the
  same numbers for server checks. Keep them in sync (one test checks it).

## 11. Integrations, in the order you build them

### 11.1 Stripe Connect: getting the freelancer paid (M5)
Research summary (checked Oct 2026, re-check before building):
- **Account type.** Connected accounts with full Stripe Dashboard access where Stripe collects requirements and
  handles losses (what used to be called Standard). Stripe now describes accounts with controller properties
  instead of types; Standard-style is \`controller: { stripe_dashboard: { type: 'full' }, fees: { payer: 'account' },
  losses: { payments: 'stripe' }, requirement_collection: 'stripe' }\` [verify the exact shape in the Accounts
  API reference]. Platforms that use OAuth stay on the v1 Accounts API.
- **Cost to Tally.** When Stripe handles pricing for the connected account, the platform pays no Connect fees
  [verify on stripe.com/connect/pricing]. The freelancer pays Stripe's normal fees on their own account
  (cards 2.9% + $0.30 in the US, ACH Direct Debit 0.8% capped at $5 [verify]). Tally sets no
  \`application_fee_amount\`.
- **Two ways in.** (a) "I already use Stripe": OAuth, \`https://connect.stripe.com/oauth/authorize?response_type=code
  &client_id=ca_...&scope=read_write&state=...\`, then \`stripe.oauth.token({ grant_type: 'authorization_code', code })\`
  returns \`stripe_user_id\` (acct_...). (b) "Create a Stripe account": \`stripe.accounts.create({ controller: {...},
  country, email })\` then \`stripe.accountLinks.create({ account, type: 'account_onboarding', refresh_url,
  return_url })\`. Stripe may steer new platforms away from OAuth; if the dashboard says so, use (b) for everyone
  [verify].
- **Direct charges.** Every Stripe call for a client payment passes \`{ stripeAccount: acct_id }\` (header
  \`Stripe-Account\`). The Checkout Session, the PaymentIntent, the Customer, the fee and any refund all live on
  the freelancer's account.
- **Payment methods by currency** (offer only what \`account.capabilities\` shows as \`active\`):

| Invoice currency | Card | Bank option 1 | Bank option 2 |
|---|---|---|---|
| USD | \`card\` | \`us_bank_account\` (ACH Direct Debit, confirms in up to 4 business days [verify]) | \`customer_balance\` with \`us_bank_transfer\` |
| EUR | \`card\` | \`sepa_debit\` | \`customer_balance\` with \`eu_bank_transfer\` (needs a country, from the account) |
| GBP | \`card\` | \`bacs_debit\` [verify Checkout payment mode support] | \`customer_balance\` with \`gb_bank_transfer\` |
| CAD, AUD, others | \`card\` | none in v1 | none in v1 |

  \`customer_balance\` needs a Customer on the connected account, so \`tl-create-checkout\` creates one per client per
  connected account (\`client_stripe_customers\`) the first time. Stripe says connected accounts must activate bank
  transfers themselves for direct charges in live mode [verify]; the Payments tab in Settings shows which methods
  are live and links to the Stripe dashboard to turn more on.
- **Webhooks.** A separate destination in Stripe, Developers, Webhooks, "Connected accounts", with its own
  \`whsec_\` secret, pointed at \`tl-connect-webhook\`. Events: \`checkout.session.completed\`,
  \`checkout.session.async_payment_succeeded\`, \`checkout.session.async_payment_failed\`, \`checkout.session.expired\`,
  \`charge.refunded\`, \`charge.dispute.created\`, \`account.updated\`, \`account.application.deauthorized\`.

### 11.2 Resend: sending from the user's domain (M3)
- Tally's own system email (welcome, invites, owner notifications) sends from \`hello@mail.<your Tally domain>\`.
- Client email (invoices, reminders, receipts) sends from the workspace's verified domain:
  \`From: "{sender_name} at {business}" <{from_local}@{domain}>\`, default \`from_local = accounts\`.
- Add a domain: \`POST https://api.resend.com/domains\` \`{ "name": "billing.studio.com" }\` returns \`id\`, \`status\` and
  \`records\` (SPF TXT and MX on a \`send\` subdomain, DKIM TXT on \`resend._domainkey\`) [verify the record names in the
  response]. Show them in a copy table. "Check now" calls \`POST /domains/{id}/verify\` (starts a check, does not
  return the result) and then \`GET /domains/{id}\` until \`status\` is \`verified\`, \`failed\` or
  \`temporary_failure\`. DNS usually lands in 15 minutes and can take up to 72 hours.
- Recommend a subdomain (\`billing.studio.com\`) so Tally mail cannot hurt the user's normal inbox reputation, and
  so their existing SPF record on the root stays untouched.
- One domain can belong to one workspace only (unique index). Deleting the workspace deletes the Resend domain.
- Resend has a multi-tenant guide and a "domain claims" flow for domains on other Resend accounts; read it if a
  customer already uses Resend for that domain [verify].
- Idempotency: every send passes \`Idempotency-Key: <email_log.dedupe_key>\` (kept 24 hours by Resend), on top of
  Tally's own \`email_log\` unique key.
- Attach the PDF on the first send only (\`attachments: [{ filename: 'INV-0042.pdf', content: <base64> }]\`).
  Reminders link to the pay page instead.

### 11.3 Resend Inbound: catching replies (M6)
- Set up receiving on a domain you own, for example \`reply.<your Tally domain>\`, with the MX record Resend shows
  in Domains (receiving) [verify the record]. Every address on that domain is delivered to your webhook
  [verify catch-all behaviour on a custom receiving domain].
- Every client email carries \`Reply-To: r-<reply_token>@reply.<your Tally domain>\`. \`reply_token\` is 20 random
  bytes in lowercase base32 (32 characters). Only \`sha256(reply_token)\` is stored in \`invoices.reply_token_hash\`.
- Webhook: Resend, Webhooks, Add webhook, URL \`https://<ref>.supabase.co/functions/v1/tl-resend-webhook\`, events
  \`email.received\`, \`email.bounced\`, \`email.complained\`, \`email.delivered\`. Payload: \`type\`, \`created_at\`,
  \`data\` with \`email_id\`, \`from\`, \`to\`, \`subject\` and attachment metadata only. Fetch the text body with the
  Receiving API using \`email_id\` [verify the endpoint path, for example \`GET /emails/receiving/{id}\`].
- Signature: Svix headers \`svix-id\`, \`svix-timestamp\`, \`svix-signature\`, secret \`whsec_...\` from the webhook
  page. Verify on the raw body (Resend SDK \`webhooks.verify\` or the \`svix\` package), reject anything older than
  5 minutes, de-duplicate by \`svix-id\` in \`webhook_receipts\`.
- Received emails count toward the Resend monthly quota like sent ones [verify on the pricing page].
- Forward each reply to the invoice creator (and the business \`reply_to_email\` if set) as "Reply from {client}
  about INV-0042", with \`Reply-To\` set to the client's address so the owner can answer directly from their inbox.

### 11.4 Claude: reading replies and writing reminders (M6)
- Model \`claude-opus-5-5\` for both jobs, \`output_config.effort: "low"\`, structured JSON output, no tools.
  Prices (checked Oct 2026): $4 per million input tokens, $20 per million output, $0.20 per million cached input.
- Reply reading: about 1,600 input and 300 output tokens including thinking, about $0.013 per reply.
- "Write in my voice": about 2,000 input and 1,900 output tokens, about $0.05 per sequence rewrite.
- Opt into server-side refusal fallback (\`anthropic-beta: server-side-fallback-2026-07-01\`, \`fallbacks: "default"\`)
  and check \`stop_reason\` before reading the output. Prompts and schemas are in section 15.

### 11.5 Frankfurter: exchange rates (M7)
- \`GET https://api.frankfurter.dev/v1/latest\` returns ECB reference rates against EUR, updated once per working
  day around 16:00 CET. No key, no signup. History: \`/v1/2026-10-01\`. Older docs use \`api.frankfurter.app\`.
- \`refresh_fx\` job at 16:30 UTC upserts \`fx_rates (rate_date, quote, rate)\`. To convert X to base:
  \`amount x rate(base) / rate(X)\` using the latest rate on or before the invoice's issue date for history, and the
  latest rate for "outstanding". Store \`invoices.fx_rate_to_base\` at send time so old reports never move.
- If the call fails, keep yesterday's rates and log it. The dashboard shows "Rates from 17 Oct" in faint text.

### 11.6 Accounting exports (M8) and sync (M10, later)
- **Accountant CSV:** one row per invoice line plus one row per payment, columns in section 14.6.
- **Xero layout:** the columns of Xero's "Import sales invoices" template (\`*ContactName\`, \`EmailAddress\`,
  \`*InvoiceNumber\`, \`*InvoiceDate\`, \`*DueDate\`, \`Description\`, \`*Quantity\`, \`*UnitAmount\`, \`*AccountCode\`,
  \`*TaxType\`, \`Currency\`) [verify against the template downloaded from Xero]. Account code and tax type come
  from Settings, Data (defaults \`200\` and \`Tax on Sales\` [verify]).
- **QuickBooks Online layout:** the invoice import columns (\`InvoiceNo\`, \`Customer\`, \`InvoiceDate\`, \`DueDate\`,
  \`Item(Product/Service)\`, \`ItemDescription\`, \`ItemQuantity\`, \`ItemRate\`, \`ItemAmount\`, \`Currency\`) [verify
  against QuickBooks' sample file].
- **Sync later (M10):** Xero's developer pricing (from March 2026) is free for up to 5 connections, then Core is
  A$35 a month for up to 50 connections and Plus A$245 for up to 1,000 [verify on developer.xero.com/pricing].
  Build it only once 20 paying customers ask, and only on Studio and Agency.

## 12. Security model

1. **RLS everywhere.** Every table has RLS on with one policy per operation. Membership checks use
   \`public.is_workspace_member(ws)\` and \`public.has_workspace_role(ws, roles[])\`, both \`security definer\` with
   \`set search_path = ''\`.
2. **The browser never decides money.** Totals, \`amount_paid_cents\`, \`status\`, \`number\`, \`sent_at\`,
   \`paid_at\` and the token hashes are set by triggers or edge functions. A guard trigger rejects changes to those
   columns from the \`authenticated\` role. Stripe payments are inserted only by \`tl-connect-webhook\`. Members may
   insert \`manual\` payments only, and only for invoices in their workspace.
3. **Public pages never touch tables.** The anon role has zero grants on invoice tables. \`/i/[token]\` calls
   \`tl-public-invoice\`, which uses the secret key and returns only that invoice's public view.
4. **Unguessable links.** Pay tokens are 32 random bytes, base64url (43 characters). Reply tokens are 20 random
   bytes base32. Only SHA-256 hashes are stored. Unknown, voided and rotated tokens return the same 404.
5. **Brute force guard.** \`tl-public-invoice\` allows 60 requests a minute per IP hash and 20 unknown-token lookups
   an hour per IP hash, then 429. \`tl-create-checkout\` allows 10 sessions per invoice per hour.
6. **Amount bounds.** \`tl-create-checkout\` ignores any amount from the browser except a partial amount, which must
   be an integer between \`min_partial_cents\` and \`amount_due_cents\`. Currency always comes from the invoice.
7. **Webhooks.** Stripe (platform and Connect): verify the raw-body signature, de-duplicate by \`event.id\`, check
   \`event.account\` equals the workspace's connected account before touching an invoice. Resend: verify the Svix
   signature on the raw body, de-duplicate by \`svix-id\`. Cron calls: constant-time compare of \`x-cron-secret\`.
8. **Prompt-injection guard.** Client replies are wrapped in \`<reply>\` tags, the system prompt says tagged text is
   data and never instructions, no tools are given to the model, and the output is a fixed enum plus a date
   validated with zod. The worst a malicious reply can do is pause its own invoice's reminders. It can never mark an
   invoice paid, change an amount, or send an email.
9. **Email abuse.** A domain must pass DNS verification before it sends. Domains are unique across workspaces.
   Each workspace may send at most 200 client emails an hour (the scheduler spreads the rest). Bounces and spam
   complaints add the address to \`email_suppressions\`, pause that invoice (\`paused_bounce\`) and tell the owner.
   A complaint rate over 0.3% in 7 days pauses all reminders for that workspace and emails you, the founder.
10. **Files.** PDFs, imports and exports live in private buckets under \`<workspace_id>/\`. Members read them through
    a 60 second signed URL from \`/api/files\`. The pay page gets a 5 minute signed URL from \`tl-public-invoice\`.
11. **PII.** \`inbound_messages.text_excerpt\` keeps at most 8,000 characters and is deleted after 180 days by the
    scheduler. Logs never contain email bodies, tokens or keys.
`
