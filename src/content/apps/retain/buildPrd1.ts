// Retain build PRD (PRD.md), part 1: product, architecture, Stripe access, routes, data model.

export const buildPrd1 = `# Retain: build PRD

Version 1.0. Download this file, save it as \`PRD.md\` in the root of your project folder, and reference it
in Claude Code with \`@PRD.md\`. Claude Code reads it before every task. Where this file and your instinct
disagree, this file wins. The look and feel lives in \`@DESIGN_SYSTEM.md\` (the Quiet Precision base system) and
\`@DESIGN.md\` (Retain's accent and screens), the marketing page in \`@LANDING.md\`. Your \`CLAUDE.md\` should
contain the line \`UI rules: @DESIGN_SYSTEM.md @DESIGN.md\`.

## 0. How to use this document

- Read sections 1 to 6 once so you know what you are building, for whom, and why Stripe access works the way it does.
- Sections 7 to 19 are the spec. Claude Code builds from them.
- Section 22 lists the build milestones. Do them in order. Do not start a milestone before the one before it
  passes its acceptance tests (section 21).
- Every new Claude Code session, say: "Read @PRD.md, @DESIGN_SYSTEM.md and @DESIGN.md. We are on milestone N.
  Plan first, then wait for my OK."
- Use Opus at high effort (\`/model opus\`, \`/effort high\`) for anything that touches the database schema, RLS,
  Stripe tokens, the cancel-flow signature check or the offer engine. Medium is fine for UI copy and layout.
- Two Stripe accounts exist in this product. **Your** Stripe account bills founders for Retain (the shared
  Stripe steps in the course build that). **Each founder's** Stripe account is the one Retain reads and acts on,
  through the Retain Stripe App. Never mix the two keys up. Section 6 explains both.

## 1. Problem

SaaS founders between $5k and $100k MRR lose 3% to 8% of their MRR every month and most of it is preventable.
It leaves in two ways:

- **Involuntary churn** (failed payments): a card expires, a bank declines a renewal, Stripe retries a few times,
  sends a plain email nobody reads, and cancels the subscription. The customer never meant to leave. This is
  commonly 20% to 40% of all churn for small SaaS [verify against your own Stripe data].
- **Voluntary churn** (cancels): the customer clicks Cancel in the Stripe Customer Portal and is gone in one click.
  No question asked, no offer made, no reason recorded. The founder finds out from a Stripe email a day later.

What they do today:
- Nothing, mostly. Stripe's default dunning emails and Smart Retries, and a Customer Portal with a one-click cancel.
- Or pay Churnkey (from about $250 to $300 a month [verify]), Baremetrics plus its Cancellation Insights and Recover
  add-ons ($129 a month each on top of the plan [verify]) or Churn Buster (from about $249 a month [verify]). Those
  are priced for companies with a retention budget, and none of them tell you which customer is about to leave
  before they click Cancel.
- Stare at the Stripe dashboard on a Sunday trying to guess which accounts have gone quiet.

The cost: a $30k MRR SaaS at 5% churn loses $1,500 of MRR a month, $18,000 of ARR a year, compounding.
Saving even a fifth of that is worth more than any feature on the roadmap.

## 2. Ideal customer (ICP)

- **Who:** solo founders and small teams (1 to 10 people) running a B2B or prosumer SaaS billed on Stripe
  Billing subscriptions. Indie hackers, bootstrapped SaaS, small agencies with a productised SaaS.
- **Size:** $5k to $100k MRR. 100 to 6,000 paying customers. ARPU $15 to $300 a month.
- **Behaviour:** they use Stripe Checkout and the Customer Portal, they post their MRR on X or Indie Hackers,
  they already track something in PostHog, Mixpanel or their own database.
- **Pain trigger:** "My churn went from 4% to 7% last month and I have no idea why." Or: "I lost $800 of MRR to
  expired cards in one month."
- **Will pay:** $49 to $349 a month, priced on their MRR band, if the dashboard shows saved MRR that is a clear
  multiple of the price.
- **Not for (v1):** Paddle, Chargebee, Recurly or Lemon Squeezy billing; mobile app stores; usage-based
  billing with no fixed subscription; enterprise SaaS with account managers and annual contracts.

## 3. The one core job

"I install Retain on my Stripe account. By tomorrow morning I can see which 20 customers are most likely to
leave this month and why, failed payments get chased in my brand with a one-click card update, and anyone who
clicks Cancel sees a fair offer first. Every week I can see how much MRR Retain saved."

Everything in v1 serves that sentence. If a feature does not move MRR at risk into saved MRR, it waits.

## 4. User stories

### Founder (workspace owner)
1. As a founder, I sign up, name my workspace and install the Retain Stripe App in test mode first, then live.
2. As a founder, I watch the first import run ("Importing customers 340 of 1,210") and can leave the page.
3. As a founder, I see a Customers list sorted by risk with a score from 0 to 100, a band (Low, Watch, High),
   the MRR and the top reason in plain words ("Card expires in 9 days and logins fell 70% in 3 weeks").
4. As a founder, I open one customer and see every signal that made up the score, with points per signal, a
   timeline of Stripe events and usage, and a one-line summary written by Claude.
5. As a founder, I optionally paste a JS snippet into my app or send usage events from my server, so usage
   drops count towards the score.
6. As a founder, I turn on failed-payment emails, upload my logo, pick my colour and edit the copy of each step.
7. As a founder, I see a checklist of my Stripe retry settings (Smart Retries on, retry window, what happens
   after the last retry) with exact click paths to fix anything that is off.
8. As a founder, I copy one script tag and one server function into my app so my Cancel button opens the
   Retain cancel page instead of the Stripe portal.
9. As a founder, I build save offers (pause 1 to 3 months, a percentage off for N months, downgrade to a cheaper
   price) and choose which offer shows for which cancel reason and plan.
10. As a founder, I see the exit interview answers and Claude's tag for each free-text answer.
11. As a founder, I turn on a win-back sequence for cancelled customers. Claude drafts each email from that
    customer's usage history; I can approve drafts by hand or let them send automatically.
12. As a founder, I see a dashboard: MRR at risk, saved MRR this month, recovered payments, offers accepted,
    churn reasons over time.
13. As a founder, I invite a teammate, see my plan usage, and manage my Retain subscription in Billing.

### End customer (the founder's customer)
14. As a customer whose card failed, I get an email from the product I use (its name and logo), click one
    button, update my card on a clean page and my overdue invoice is paid straight away.
15. As a customer who clicks Cancel, I answer one question (why), see one offer that fits my reason, and can
    accept it or cancel in two clicks. I am never trapped.
16. As a cancelled customer, I get at most 3 short, personal emails over 30 days, each with an unsubscribe link.

### Workspace member
17. As a member, I see customers, scores, flows and the dashboard. Only owners and admins change offers,
    emails, Stripe connection and billing.

## 5. Architecture

\`\`\`
                         FOUNDER'S BROWSER                         END CUSTOMER'S BROWSER
                  Next.js app on Vercel (/app/*)          founder's app + <script src=retain.app/embed.js>
                         |  supabase-js (publishable key, RLS)           |  iframe /c/<session>   /u/<token>
                         v                                                v
 +-----------------------------------------------------------------------------------------------+
 |                                   SUPABASE (one project)                                      |
 |  Postgres + RLS            Edge functions (Deno)                       pg_cron schedules      |
 |  workspaces, members       rt-stripe-connect   (OAuth install + refresh)  every minute:       |
 |  stripe_connections        rt-stripe-events    (webhook from founders'     rt-sync-worker     |
 |  customers, subscriptions                       Stripe accounts)           rt-email-worker    |
 |  invoices, stripe_events   rt-sync-worker      (jobs: backfill, apply,  every 15 min:         |
 |  usage_events, usage_daily                      reconcile, refresh)        reconcile poll     |
 |  risk_scores, signals      rt-score            (nightly scoring in SQL) 02:00 UTC: rt-score   |
 |  dunning_cases, offers     rt-explain          (Claude Batches submit   every 10 min:         |
 |  cancel_sessions                                 + collect)                rt-explain collect |
 |  winback_runs, emails      rt-ingest           (usage events, JS + HMAC)                      |
 |  jobs, usage_ledger        rt-cancel-flow      (public, HMAC-signed)                          |
 |  email_log, subscriptions  rt-update-card      (public, token)                                |
 |                            rt-email-worker     (dunning + win-back, Claude drafts, Resend)    |
 +----------|-----------------------|--------------------------|----------------------|----------+
            | OAuth token per        | Stripe events             | Messages + Batches   | emails
            v founder account        | (connected accounts)      v                      v
      FOUNDER'S STRIPE  <------------+                     Anthropic API            Resend
      (via Retain Stripe App: customers, subscriptions, invoices, coupons, checkout setup sessions)

      YOUR STRIPE (Retain's own billing): Checkout + Portal + webhook -> public.subscriptions
\`\`\`

### 5.1 The trade-offs we chose (and what breaks first)

- **Scores are computed in Postgres, not by an LLM.** A fixed, explainable formula over signals (section 10).
  It costs nothing per customer, runs for 6,000 customers in under a minute, and every point can be shown to the
  founder. Claude only writes the one-line summary on top, overnight, in a batch at half price.
- **Stripe is mirrored, not queried live.** Webhooks keep a local copy of customers, subscriptions and invoices.
  Pages read the mirror, so the UI is fast and never hits Stripe rate limits. A 15 minute reconcile job reads
  \`GET /v1/events\` per account as a safety net for any missed webhook.
- **One jobs table, one worker.** Every slow thing (backfill, event apply, reconcile, token refresh, email send,
  batch collect) is a row in \`jobs\` with status, attempts, \`run_after\` backoff and a unique idempotency key.
  The worker claims rows with \`for update skip locked\`. No queues to run, no extra vendor.
- **Edge functions plus pg_cron, not a separate job runner.** Fine to 1,000 workspaces.
- **What breaks first at scale:** the backfill for a big new account (6,000 customers, 50,000 invoices) and the
  raw \`usage_events\` table. Fixes already in the design: backfill pages 100 objects per job and re-queues itself
  so no function runs longer than 50 seconds; usage events roll up nightly into \`usage_daily\` and raw rows older
  than 90 days are deleted. Next fix when you pass about 500 workspaces: partition \`usage_events\` by month and move
  the worker to Small compute (already in the cost model).

## 6. Stripe access: why a Stripe App with OAuth

Retain must read another company's Stripe account and, for save offers, change their subscriptions. There are
three supported ways to get that access. We researched all three (Oct 2026) and picked the first.

| | **Stripe App, OAuth install (chosen)** | Connect OAuth (Standard) | Restricted key pasted by the founder |
|---|---|---|---|
| What the founder does | Clicks "Install Retain", picks the account, accepts a list of permissions on a Stripe page | Clicks "Connect with Stripe" on a Stripe page | Creates an \`rk_live_\` key with the right boxes ticked and pastes it into Retain |
| Scope | Granular per object (e.g. \`customer_read\`, \`subscription_write\`), declared in the app manifest and shown on install | \`read_write\` gives full control of the account. \`read_only\` is only for Extensions | Granular, but the founder must tick the right boxes by hand |
| Stripe's position | The recommended way for third-party software to access a Stripe user's account | "OAuth isn't recommended for new Connect platforms" (Stripe docs) | Supported, but Stripe discourages sharing keys in most cases |
| Secret we store | A refresh token (encrypted) and a 1 hour access token | A long-lived token with full access | A long-lived key until the founder rolls it |
| Revocation | Founder uninstalls the app; Stripe sends an event and the token stops working | Founder disconnects the platform | Founder must remember to roll the key |
| Events | Webhook destination on your account for events on connected accounts | Same | None: you would have to poll |

Decision: **build a Stripe App with \`stripe_api_access_type: oauth\`**. It is the safest supported route: the
founder sees exactly which permissions Retain asks for, no long-lived full-access secret exists, every token is
short-lived, and uninstalling cuts access instantly. A restricted key is kept only as an escape hatch for a beta
customer while your public listing is in review (section 6.4). Connect OAuth is not used.

### 6.1 Permissions the Retain app asks for (manifest)

Ask for the least that works. Each line says why, because Stripe shows the purpose to the founder on install.

| Permission | Why Retain needs it |
|---|---|
| \`customer_read\` | Mirror customers, card expiry month and year, email for dunning |
| \`subscription_read\` | MRR, plan, quantity (seats), status, trial end, cancel_at_period_end |
| \`subscription_write\` | Apply an accepted save offer: pause collection, add a discount, change price, undo a scheduled cancel |
| \`invoice_read\` | Failed payments, attempt count, next_payment_attempt, hosted invoice link |
| \`invoice_write\` | Pay the open invoice right after the customer updates their card |
| \`coupon_read\`, \`coupon_write\` | Create one Retain coupon per discount offer (e.g. "Retain 30% x 3 months") |
| \`payment_method_read\` | Card brand, last 4 and expiry for the update-card page and the expiry signal |
| \`checkout_session_write\` | Create a Checkout Session in \`setup\` mode so the customer can add a new card |
| \`product_read\`, \`plan_read\` (prices) | Show plan names and find the downgrade target price |
| \`event_read\` | Reconcile missed webhooks with \`GET /v1/events\` |

Check the exact permission names in Stripe's permissions reference before you write the manifest
(https://docs.stripe.com/stripe-apps/reference/permissions) [verify each name]. If a name differs, use Stripe's
and tell me.

### 6.2 Install and token flow

1. Founder clicks "Install Retain on Stripe" in onboarding. The Next.js route \`/api/stripe/install\` stores a random
   \`state\` (32 bytes, hashed) in \`oauth_states\` with the workspace id and a 10 minute expiry, then redirects to
   \`STRIPE_APP_INSTALL_URL\` with \`&state=...\` added. Copy the install link from the dashboard rather than
   building it by hand: Stripe docs and third-party guides show two URL shapes [verify].
2. Stripe shows the permissions. The founder accepts and is sent to \`/api/stripe/callback?code=...&state=...\`.
3. The callback checks the state (exists, not expired, not used, belongs to the signed-in user's workspace), marks
   it used, and calls the edge function \`rt-stripe-connect\` with the code.
4. \`rt-stripe-connect\` exchanges the code at \`POST https://api.stripe.com/v1/oauth/token\` with
   \`grant_type=authorization_code\`, authenticated with **your** secret key for the matching mode (test install
   link: \`sk_test_\`, live: \`sk_live_\`). The code is single use and valid for 5 minutes.
5. Response: \`access_token\` (about 1 hour), \`refresh_token\` (about 1 year, rotates on every refresh),
   \`stripe_user_id\` (\`acct_...\`), \`livemode\`, \`scope\` [verify field names against the response]. Store the
   refresh token encrypted with AES-GCM using \`RETAIN_TOKEN_KEY\`, the access token encrypted with its expiry, and
   the account id in plain text.
6. Before any Stripe call, \`getStripeFor(ws)\` returns a client for that account: if the access token expires in
   under 5 minutes, refresh it first (\`grant_type=refresh_token\`), save the **new** refresh token in the same
   transaction (the old one stops working), and only then call Stripe. A Postgres advisory lock per connection
   stops two workers refreshing at once.
7. If a refresh fails with \`invalid_grant\`, set the connection to \`revoked\`, stop all jobs for it and email the
   owner "Retain lost access to Stripe. Reinstall to keep tracking." The app shows a banner.

How the access token is used on each call (as the API key, or as your key plus a \`Stripe-Account\` header) is
described on Stripe's Stripe Apps OAuth page. Follow that page exactly [verify]. Wrap it in one helper so the
rest of the code never knows.

### 6.3 Events from founders' accounts

Create one webhook destination on **your** Stripe account that listens to **events on connected accounts**
(Workbench > Event destinations > Connected accounts) and points at the \`rt-stripe-events\` edge function
[verify that installed Stripe App accounts deliver through this destination]. Each event carries \`account\`
(the founder's \`acct_...\`). Subscribe to:

\`customer.created\`, \`customer.updated\`, \`customer.deleted\`, \`customer.subscription.created\`,
\`customer.subscription.updated\`, \`customer.subscription.deleted\`, \`customer.subscription.paused\`,
\`customer.subscription.resumed\`, \`customer.subscription.trial_will_end\`, \`invoice.created\`, \`invoice.paid\`,
\`invoice.payment_failed\`, \`invoice.payment_action_required\`, \`invoice.updated\`, \`invoice.upcoming\`,
\`invoice.marked_uncollectible\`, \`payment_method.attached\`, \`payment_method.updated\`,
\`checkout.session.completed\`, \`account.application.deauthorized\`.

Test-mode installs send test events and live installs send live events. Make one destination per mode; they
have different signing secrets. Store both in Supabase secrets as \`STRIPE_APP_WEBHOOK_SECRET\` (test) and later
\`STRIPE_APP_WEBHOOK_SECRET_LIVE\`, and try both when verifying.

Safety net: every 15 minutes the worker calls \`GET /v1/events?created[gt]=<cursor>&limit=100\` for each active
connection and applies anything not already in \`stripe_events\` (events are kept by Stripe for 30 days).

### 6.4 Escape hatch: restricted key (beta only)

Until Stripe approves your public listing, live-mode installs only work through the external test link for
accounts you invite [verify]. If a beta founder cannot use that, Settings > Stripe has a hidden "Use a restricted
key" form (feature flag \`rak_beta\` per workspace). It shows the exact permission list from 6.1 to tick, accepts
only keys starting \`rk_live_\` or \`rk_test_\`, tests it with \`GET /v1/customers?limit=1\`, and stores it encrypted
like a refresh token. Never accept \`sk_\` keys. Remove the flag once the app is public.

## 7. Routes and pages

### 7.1 Public
| Route | What it is |
|---|---|
| \`/\` | Landing page (see @LANDING.md) |
| \`/pricing\` | Pricing with monthly/annual toggle |
| \`/login\`, \`/signup\`, \`/forgot\`, \`/reset\` | Auth (email + password, Google optional) |
| \`/docs\` and \`/docs/[slug]\` | Documentation: install the app, snippet, cancel embed, webhook, offers, FAQ |
| \`/c/[sessionId]\` | The cancel page, loaded inside the embed iframe (or full page on mobile) |
| \`/u/[token]\` | The update-card page linked from failed-payment emails |
| \`/u/[token]/done\` | "Card updated, invoice paid" confirmation |
| \`/unsubscribe/[token]\` | One-click unsubscribe from win-back emails |
| \`/embed.js\` | The cancel embed script (static, cached 1 hour, versioned \`/embed.v1.js\`) |
| \`/t.js\` | The usage snippet (static, under 1 KB gzipped) |

### 7.2 App (signed in, \`/app/*\`, paywalled by \`has_active_access\`)
| Route | Page | Notes |
|---|---|---|
| \`/onboarding\` | 4 steps: workspace, install Stripe App, first import, pick what to turn on | Not paywalled during the trial |
| \`/app\` | Dashboard: MRR at risk, saved MRR, recovered payments, offers accepted, reasons | Default page |
| \`/app/customers\` | Customers table sorted by risk, filters by band, plan, signal, MRR | Saved views in the URL |
| \`/app/customers/[id]\` | Customer detail side panel over the table (also a full page on refresh) | Signals, timeline, summary |
| \`/app/recovery\` | Failed payments: open cases, recovered, lost; dunning email steps; retry checklist | |
| \`/app/cancel-flow\` | Cancel flow builder: reasons, offers, rules, preview, install code, sessions log | |
| \`/app/win-back\` | Win-back sequence settings, drafts to approve, sent, replies, results | |
| \`/app/usage\` | Usage tracking: snippet, server webhook, keys, last events, event names | |
| \`/app/docs\` | Documentation (same content as /docs, inside the shell) | Bottom group |
| \`/app/help\` | Help: email support, status, keyboard shortcuts, changelog | Bottom group |
| \`/app/billing\` | Your Retain plan, MRR band, usage meters, upgrade, Customer Portal link | Owners only |
| \`/app/settings\` | Tabs: Workspace, Stripe, Brand, Team, Notifications, Keys, Danger zone | Bottom group |
| \`/paywall\` | Trial ended or payment failed: choose a plan | |

### 7.3 Sidebar (app shell)

One level, no nesting, in this exact order:

- Top group: logo + workspace switcher, **Dashboard**, **Customers**, **Recovery**, **Cancel flow**,
  **Win-back**, **Usage**.
- Bottom group, always in this order: **Documentation**, **Help**, **Billing**, **Settings**.
- Above the bottom group: a compact plan meter ("1,204 of 2,000 customers tracked").
- Billing is hidden for members (not owners or admins). A red dot on Settings when the Stripe connection is
  \`revoked\` or \`error\`.

### 7.4 Next.js API routes (server only)
| Route | Job |
|---|---|
| \`/api/stripe/install\` | Make the OAuth state and redirect to the install link |
| \`/api/stripe/callback\` | Check the state, call \`rt-stripe-connect\`, redirect to onboarding step 3 |
| \`/api/billing/checkout\`, \`/api/billing/portal\`, \`/api/billing/webhook\` | Retain's own billing (shared course steps) |
| \`/api/keys/rotate\` | Rotate the workspace ingest and cancel-flow signing secrets (owner/admin) |

### 7.5 Onboarding (4 steps, one card that morphs height)

1. **Name your workspace.** Product name (becomes the brand name in emails), product URL, support email,
   timezone. Calls \`create_workspace(p_name, p_url, p_support_email, p_timezone)\`.
2. **Install Retain on Stripe.** Explains the permissions in one table (from 6.1) with a "Why?" per row, then
   "Install in test mode" and "Install on live Stripe". Test mode is the default the first time. Returns here.
3. **Importing.** A live progress bar from the \`jobs\` rows of this connection: "Customers 340 of 1,210",
   "Subscriptions", "Invoices from the last 90 days", "First scores". The founder can leave; an email arrives when
   done. Typical time: 1,000 customers in about 3 minutes.
4. **Pick what to turn on.** Three switches with a one-line explanation each: failed-payment emails (off by
   default until they edit the copy), cancel flow (shows the install code), win-back (manual approval by default).
   Plus "Add usage tracking later" link. Finish lands on the Dashboard.

### 7.6 Settings tabs

| Tab | Contents |
|---|---|
| Workspace | Name, product URL, product one-liner (used in win-back drafts), "What changed recently" list (used in win-back step 2), support email, timezone, main currency |
| Stripe | Connection card (account id, mode, status dot, last sync, events in last 24h), Reinstall, Disconnect (stops jobs, deletes tokens), sync log of the last 50 jobs with errors, the beta restricted-key form when flagged |
| Brand | Logo upload (PNG/SVG, 1 MB, bucket \`brand\`), accent colour, preview of email and cancel page |
| Team | Members, roles, invites (seat limit from plan) |
| Notifications | Weekly digest, high-risk alert, saved notice, cap emails |
| Keys | Publishable key (copy), signing secret and ingest secret (rotate, shown once) |
| Danger zone | Delete workspace (types the name; deletes all mirrored data and tokens; tells the founder to uninstall the app in Stripe) |

## 8. Data model

All tables live in \`public\`, have RLS on, and carry \`workspace_id\` (except profiles and billing). The SQL
migration in the course is the source of truth; this is the map.

| Table | Key columns | Notes |
|---|---|---|
| \`profiles\` | id (= auth user), full_name, current_workspace_id | Created by trigger on signup |
| \`workspaces\` | id, name, owner_id, slug, brand_name, brand_color, logo_path, product_url, product_oneliner, recent_changes (text[]), support_email, timezone, main_currency | One per SaaS product |
| \`workspace_members\` | workspace_id, user_id, role (owner, admin, member) | PK on both |
| \`workspace_invites\` | email, role, token_hash, expires_at | 7 day invites |
| \`workspace_secrets\` | workspace_id, signing_secret_enc, ingest_secret_enc, rotated_at | No policies. The publishable key (rt_pub_...) lives on \`workspaces\`; these two secrets are encrypted and only server code decrypts them |
| \`oauth_states\` | state_hash, workspace_id, user_id, expires_at, used_at | 10 minute life |
| \`stripe_connections\` | workspace_id, account_id (acct_...), livemode, status, method (oauth, rak), scope, events_cursor, import_progress, last_synced_at, last_error | Members can read it: no secrets here |
| \`stripe_tokens\` | connection_id, access_token_enc, access_expires_at, refresh_token_enc, restricted_key_enc | No policies at all: only edge functions with the secret key can read it |
| \`customers\` | workspace_id, stripe_customer_id, email, name, created_at_stripe, card_brand, card_last4, card_exp_month, card_exp_year, external_user_id, deleted | Unique (workspace_id, stripe_customer_id) |
| \`subscriptions_mirror\` | workspace_id, customer_id, stripe_subscription_id, status, price_id, product_name, quantity, mrr_cents, currency, trial_end, current_period_end, cancel_at_period_end, cancel_at, paused, discount_coupon_id, canceled_at, cancellation_reason | The founder's customers' subscriptions (not Retain's own) |
| \`subscription_changes\` | workspace_id, subscription_id, kind (upgrade, downgrade, seat_up, seat_down, pause, resume, cancel_scheduled, cancel_undone, canceled), mrr_delta_cents, quantity_delta, at, stripe_event_id | Written by the event applier from previous_attributes |
| \`invoices_mirror\` | workspace_id, customer_id, subscription_id, stripe_invoice_id, status, amount_due_cents, attempt_count, next_payment_attempt, hosted_invoice_url, billing_reason, last_failure_code, paid_at | |
| \`stripe_events\` | id (evt_...), workspace_id, account_id, type, created_at_stripe, processed_at | Dedupe table for the webhook and the reconcile poll |
| \`usage_events\` | id, workspace_id, customer_id, external_user_id, name, occurred_at, props (jsonb, max 2 KB), idempotency_key | Raw, kept 90 days |
| \`usage_daily\` | workspace_id, customer_id, day, events, active_users, logins | Nightly roll-up, kept forever |
| \`risk_scores\` | workspace_id, customer_id, score (0 to 100), band (low, watch, high), previous_score, computed_at, summary, summary_at, summary_status | One current row per customer |
| \`risk_signals\` | workspace_id, customer_id, code, points, detail (jsonb), plain_text, computed_at | The breakdown behind each score |
| \`risk_score_history\` | workspace_id, customer_id, day, score, band | One row per customer per day, for charts |
| \`dunning_settings\` | workspace_id, enabled, from_name, reply_to, steps (jsonb: day offset, subject, body), card_expiry_enabled | |
| \`dunning_cases\` | workspace_id, customer_id, invoice_id, status, opened_at, step, next_step_at, recovered_at, recovered_cents, closed_reason | One per failed invoice |
| \`update_card_tokens\` | token_hash, workspace_id, customer_id, invoice_id, expires_at, used_at | 14 day links |
| \`offers\` | workspace_id, kind (pause, discount, downgrade), label, pause_months, percent_off, duration_months, target_price_id, coupon_id, active, variant | |
| \`offer_rules\` | workspace_id, reason_code, plan_price_id (nullable), offer_id, priority | Which offer shows for which reason |
| \`cancel_reasons\` | workspace_id, code, label, position, asks_followup | Default 6 reasons seeded |
| \`cancel_sessions\` | id, workspace_id, customer_id, subscription_id, status, reason_code, followup_text, ai_tag, offer_id, offer_result, mrr_cents, saved_mrr_cents, ip_hash, created_at, finished_at | |
| \`winback_settings\` | workspace_id, enabled, auto_send, steps (jsonb: day offsets 3, 10, 30), tone, offer_id, signature | |
| \`winback_runs\` | workspace_id, customer_id, subscription_id, status, canceled_at, drafted_at, approved_by | One per cancelled subscription |
| \`winback_emails\` | run_id, workspace_id, step, send_at, subject, body_text, status, resend_id, opened_at, clicked_at | |
| \`email_suppressions\` | workspace_id, email, reason | Unsubscribes, bounces, complaints |
| \`ai_batches\` | workspace_id (nullable), anthropic_batch_id, kind, status, request_count, submitted_at, ended_at | |
| \`jobs\` | workspace_id, kind, ref_id, status, attempts, run_after, locked_at, idempotency_key, payload, last_error | The worker queue |
| \`usage_ledger\` | workspace_id, kind, quantity, cost_usd_micros, ref_id, idempotency_key | The meter behind every cap |
| \`email_log\` | workspace_id, kind, to_email, dedupe_key, resend_id, status | Every email sent, deduped |
| \`subscriptions\` | user_id, stripe_customer_id, stripe_subscription_id, status, price_id, trial_end, current_period_end | **Retain's own** billing |
| \`stripe_billing_events\` | id | Dedupe for Retain's own billing webhook |
| \`plan_prices\` | price_id, plan (starter, growth, scale) | Maps your price ids to plans |
| \`rate_limits\` | key, window_start, hits | Fixed-window limiter |

Money is stored in integer cents with a \`currency\` column. MRR for a subscription = sum over items of
(unit_amount x quantity) normalised to a month (yearly / 12, weekly x 52 / 12, daily x 365 / 12), minus the active
discount, in the subscription's currency. Dashboards show the workspace's main currency only and list other
currencies separately (no FX in v1).
`
