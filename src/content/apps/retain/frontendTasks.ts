// Retain app-specific frontend tasks (appended to the Foundations phase).
import type { Task } from '../../types'

export const frontendTasks: Task[] = [
  {
    id: 'rtn-fe-onboarding',
    title: 'Build onboarding with the Stripe App install and live import',
    outcome: 'A new founder names their product, installs Retain on test-mode Stripe and watches the import finish.',
    minutes: 80,
    xp: 55,
    blocks: [
      { type: 'callout', tone: 'eli5', title: 'Why "install an app" and not "paste your key"', text: 'A Stripe secret key is a master key to someone\'s whole business. A Stripe App is more like a hotel key card: Stripe shows the founder exactly which doors it opens, it stops working after an hour unless Retain renews it, and the founder can cancel it from Stripe at any time.' },
      { type: 'prompt', id: 'rtn-fe-onboarding-prompt', title: 'Paste into Claude Code', code: `Read @PRD.md sections 6, 6.2, 7.3, 7.4, 7.5 and 7.6, @DESIGN_SYSTEM.md, and @DESIGN.md sections 6 and 7.1.

Build:
1. app/onboarding/page.tsx: the 4-step morphing card from DESIGN.md 7.1. Step 1 calls supabase.rpc('create_workspace', { p_name, p_url, p_support_email, p_timezone }).
2. app/api/stripe/install/route.ts: getClaims, check the user is owner/admin of the current workspace, make a 32-byte random state, insert its SHA-256 into oauth_states with the server Supabase client using SUPABASE_SECRET_KEY (the table has no policies), then redirect to STRIPE_APP_INSTALL_URL (test) or STRIPE_APP_INSTALL_URL_LIVE (live, from ?mode=live) with &state= appended (use URL and searchParams.set so an existing query string is kept).
3. app/api/stripe/callback/route.ts: read code and state, look up the hashed state (must exist, unused, under 10 minutes old, same user), mark used, then call the rt-stripe-connect edge function with the user's access token and { action: 'exchange', workspace_id, code, livemode }. On success redirect to /onboarding?step=3, on error to /onboarding?step=2&error=<code> and show the message from DESIGN.md microcopy.
4. Step 3: subscribe with Supabase Realtime to stripe_connections for this workspace and render import_progress as the four meter rows. Use supabase.rpc('get_stripe_connections', { ws }) for the first load. Reserve every number's width.
5. Step 4: three Switch rows saving dunning_settings.enabled, a local "show install code" flag, and winback_settings.enabled.
6. The app shell sidebar exactly as @PRD.md 7.3 (Dashboard, Customers, Recovery, Cancel flow, Win-back, Usage, then Documentation, Help, Billing, Settings) with the plan meter fed by supabase.rpc('workspace_meters', { ws }). Billing hidden for members. Banners from DESIGN.md 6.3.
7. app/app/settings/page.tsx with the Stripe tab (connection card, Reinstall, Disconnect calling rt-stripe-connect with action 'disconnect', sync log of the last 50 jobs read through a small server route that uses the secret key and filters by workspace after a membership check).
Use only design tokens. Run the app and screenshot each onboarding step at 1440px and 390px.` },
      { type: 'steps', items: [
        'Make a second Stripe account to play the founder: in Stripe, top left account menu > New account (or create a sandbox), name it "Test SaaS". Note its acct_ id.',
        'Run the seed script from PRD 14.3 against that account so it has 30 customers.',
        'In your app, sign up, finish step 1, then click "Install in test mode". Pick "Test SaaS" on the Stripe page and accept.',
        'Watch step 3 count up. Then open Settings > Stripe and check the status says Active.',
      ] },
      { type: 'code', id: 'rtn-fe-onboarding-sql', filename: 'check-install.sql', lang: 'sql', code: `-- Run in Supabase > SQL Editor.
-- Expect: one active test-mode oauth connection, tokens stored encrypted (v1.),
-- 30 customers, and no dead jobs.
select c.account_id, c.livemode, c.method, c.status, c.import_progress,
       left(t.refresh_token_enc, 3) as enc_prefix
from public.stripe_connections c
join public.stripe_tokens t on t.connection_id = c.id;

select count(*) as customers from public.customers;
select kind, status, count(*) from public.jobs group by kind, status order by kind;` },
      { type: 'mistakes', items: [
        { mistake: 'Stripe shows "This app is not available" when you click Install.', fix: 'You used the public install link before the app is published. Use the Test mode link from Stripe > Apps > Retain > External test, and install it into an account you own.' },
        { mistake: 'The callback says "state not found".', fix: 'The install started on localhost and Stripe redirected to your Vercel URL (or the reverse), so the session is different. Add both callback URLs to allowed_redirect_uris in the manifest and start and finish on the same host.' },
        { mistake: 'Step 3 never moves past 0.', fix: 'The worker cron is not scheduled yet or CRON_SECRET does not match. Call rt-sync-worker by hand with curl and read its logs in Supabase > Edge Functions > rt-sync-worker > Logs.' },
      ] },
    ],
    checklist: [
      { id: 'rtn-fe-onboarding-c1', label: 'Copy the onboarding and install prompt', trigger: 'copy:rtn-fe-onboarding-prompt' },
      { id: 'rtn-fe-onboarding-c2', label: 'Create the "Test SaaS" Stripe account and seed it' },
      { id: 'rtn-fe-onboarding-c3', label: 'Install Retain in test mode and finish the import' },
      { id: 'rtn-fe-onboarding-c4', label: 'Run the check SQL and see an active connection', trigger: 'copy:rtn-fe-onboarding-sql' },
    ],
  },
  {
    id: 'rtn-fe-customers',
    title: 'Build the Customers table and the risk side panel',
    outcome: 'Customers sorted by risk with fixed-width score cells, and a panel that shows every signal in plain words.',
    minutes: 90,
    xp: 60,
    blocks: [
      { type: 'callout', tone: 'eli5', title: 'A score you can argue with', text: 'Every score is just points added up, like a school report. A failed payment is 35 points, a card running out is 15. Because the panel lists every line, the founder can say "that one is wrong" and know exactly why the number is what it is.' },
      { type: 'prompt', id: 'rtn-fe-customers-prompt', title: 'Paste into Claude Code', code: `Read @PRD.md sections 8, 10 and 16, @DESIGN.md sections 2.1, 2.2, 7.3, 7.4, 8 and 15.

Build:
1. app/app/customers/page.tsx: server component that reads risk_scores joined to customers and subscriptions_mirror (RLS applies, use the user's client) with filters from the URL (band, plan, signal, mrr_min, q) and paging (50). Sort by score desc then mrr_cents desc by default.
2. components/customers/CustomerTable.tsx with the columns, fixed widths and footer from DESIGN.md 7.3. Over-cap customers (no risk_scores row) at the end with the "Not scored" tag.
3. components/risk/ScoreCell.tsx (88px, tabular number in band ink, 40px bar, tooltip) and components/risk/RiskTag.tsx.
4. app/app/customers/[id]/page.tsx plus an intercepting route so a row click opens components/customers/CustomerPanel.tsx as a 520px side panel over the table (portal, 200ms slide, Esc closes), and a hard refresh renders the full page.
5. The panel: summary strip, AI summary box (or the "No summary yet" line), signals list from risk_signals ordered by points desc with the total line, timeline merged from subscription_changes, invoices_mirror, cancel_sessions, winback_emails and a 30-day usage strip from usage_daily.
6. Keyboard: j/k/Enter/Esc and / for search, per DESIGN.md 15.
7. Export CSV through app/api/customers/export/route.ts (server, streams rows the user can see).
Use only design tokens. Screenshot the table and an open panel at 1440px and 1024px.` },
      { type: 'steps', items: [
        'Open Customers. The top rows should be the seeded customers with failed payments and the scheduled cancel.',
        'Click the top row. Check the points in the signals list add up to the score (capped at 100).',
        'Press j and k to move, Enter to open, Esc to close. The table must not move when the panel opens.',
        'Filter by Band: High. Copy the URL into a new tab: the same filter loads.',
      ] },
      { type: 'code', id: 'rtn-fe-customers-sql', filename: 'check-scores.sql', lang: 'sql', code: `-- Each customer's points should add up to their score (between 0 and 100).
select c.email, r.score, r.band,
       least(100, greatest(0, sum(s.points))) as points_total,
       string_agg(s.code || ' ' || s.points, ', ' order by s.points desc) as signals
from public.risk_scores r
join public.customers c on c.id = r.customer_id
left join public.risk_signals s on s.customer_id = r.customer_id
group by c.email, r.score, r.band
order by r.score desc
limit 20;` },
      { type: 'mistakes', items: [
        { mistake: 'Scores are all 0 after the import.', fix: 'score_workspace did not run. Check jobs for a score_workspace row. If it is dead, read last_error; if missing, the backfill_invoices handler did not enqueue it. Run select public.compute_risk(\'<ws>\') in the SQL editor to test the function on its own.' },
        { mistake: 'The table jumps sideways when scores load.', fix: 'The score column is sized by its content. Tell Claude Code: "Use table-layout: fixed and the exact widths in DESIGN.md 7.3, and give ScoreCell a fixed 88px width with tabular-nums."' },
        { mistake: 'The panel shows another workspace\'s customer after switching workspace.', fix: 'The page cached the query by customer id only. Include workspace_id in every query key and read data with the user\'s client so RLS filters it.' },
      ] },
    ],
    checklist: [
      { id: 'rtn-fe-customers-c1', label: 'Copy the customers prompt', trigger: 'copy:rtn-fe-customers-prompt' },
      { id: 'rtn-fe-customers-c2', label: 'Open a High customer and read every signal' },
      { id: 'rtn-fe-customers-c3', label: 'Check j, k, Enter and Esc work without layout shift' },
      { id: 'rtn-fe-customers-c4', label: 'Run the points-add-up SQL', trigger: 'copy:rtn-fe-customers-sql' },
    ],
  },
  {
    id: 'rtn-fe-recovery',
    title: 'Build Recovery: dunning emails, the retry checklist and the update-card page',
    outcome: 'Founders edit branded failed-payment emails, and end customers can fix their card on a clean page in your founder\'s brand.',
    minutes: 90,
    xp: 60,
    blocks: [
      { type: 'callout', tone: 'eli5', title: 'Why most failed payments come back', text: 'Most failed renewals are not people leaving: the card expired or the bank said "not today". If you ask nicely, in the product\'s own name, with one button that fixes it, many of them pay. Stripe retries the card too, so the two together catch most of it.' },
      { type: 'prompt', id: 'rtn-fe-recovery-prompt', title: 'Paste into Claude Code', code: `Read @PRD.md sections 9.4, 11 and 17, @DESIGN.md sections 7.5, 7.13 and 13.

Build:
1. app/app/recovery/page.tsx with the tabs Cases, Emails, Retry checklist, Update-card page (DESIGN.md 7.5).
2. Cases table from dunning_cases joined to customers and invoices_mirror, chips Open/Recovered/Lost, footer totals.
3. Emails editor: dunning_settings.steps as cards with day, subject, body and clickable variable tags; live 375px preview rendered by the same lib/emails/dunning.tsx template the email worker uses (put the template in a shared folder the edge function can import, or duplicate it in supabase/functions/_shared/templates and keep one source of truth with a copy script). "Send test to me" calls a small server route that sends the rendered step to the signed-in user's email through Resend.
4. Retry checklist: four rows with exact click paths from PRD 11.1 and "Open in Stripe" links (https://dashboard.stripe.com/settings/billing/automatic and https://dashboard.stripe.com/revenue_recovery/retries [check both links still work and fix them if not]). Ticks save to dunning_settings.checklist with a date.
5. app/u/[token]/page.tsx (public): calls rt-update-card with action 'view' on the server, renders DESIGN.md 7.13 in the founder's brand (derive accent soft and edge from brand_color, darken for contrast). Button calls action 'checkout' and redirects to the returned url.
6. app/u/[token]/done/page.tsx: polls view every 2 seconds for up to 20 seconds and shows Paid / declined.
7. Under 600px everything is one column with 44px tap targets.
Use only design tokens. Screenshot /u/<token> at 375px and the email preview.` },
      { type: 'steps', items: [
        'In Recovery > Emails, switch on "Send failed-payment emails" and change the day 0 subject. Click "Send test to me" and open it on your phone.',
        'Make a payment fail: in the Test SaaS Stripe account, advance the test clock for a customer with the failing card past their renewal.',
        'Within a minute a case appears under Cases. Run the email worker (or wait a minute) and open the email that arrives at the seeded test address (use your own email for one seeded customer).',
        'Click "Update card", pay with 4242 4242 4242 4242, and watch the done page turn to "Paid".',
      ] },
      { type: 'code', id: 'rtn-fe-recovery-sql', filename: 'check-recovery.sql', lang: 'sql', code: `-- The case you just fixed should be recovered by card_update, with one email per step.
select d.status, d.recovered_by, d.recovered_cents, d.step, i.attempt_count
from public.dunning_cases d
join public.invoices_mirror i on i.id = d.invoice_id
order by d.opened_at desc limit 5;

select kind, dedupe_key, status from public.email_log
where kind = 'dunning' order by created_at desc limit 10;` },
      { type: 'mistakes', items: [
        { mistake: 'The case stays open after paying on the update-card page.', fix: 'checkout.session.completed is not in your webhook destination\'s event list, or the worker skipped it because metadata.retain_case_id was missing. Add the event in Stripe > Workbench > Event destinations and check the session was created with the metadata.' },
        { mistake: 'Customers get two failed-payment emails.', fix: 'Stripe\'s own emails are still on. Do item 3 of the Retry checklist: turn off Stripe\'s failed payment customer emails in the founder\'s Stripe settings.' },
        { mistake: 'The update-card button is unreadable on a pale brand colour.', fix: 'The contrast helper is not applied. Ask Claude Code to run brand_color through lib/brand.ts ensureContrast(hex, 4.5) for text and edges on every end-customer page.' },
      ] },
    ],
    checklist: [
      { id: 'rtn-fe-recovery-c1', label: 'Copy the recovery prompt', trigger: 'copy:rtn-fe-recovery-prompt' },
      { id: 'rtn-fe-recovery-c2', label: 'Send a test dunning email to yourself' },
      { id: 'rtn-fe-recovery-c3', label: 'Fail a payment with a test clock and recover it on the update-card page' },
      { id: 'rtn-fe-recovery-c4', label: 'Run the recovery SQL', trigger: 'copy:rtn-fe-recovery-sql' },
    ],
  },
  {
    id: 'rtn-fe-cancel',
    title: 'Build the cancel flow: builder, embed script and the public cancel page',
    outcome: 'Founders set reasons and offers, copy one script tag, and their customers see a fair offer before they cancel.',
    minutes: 120,
    xp: 75,
    blocks: [
      { type: 'callout', tone: 'eli5', title: 'Why the founder\'s server has to sign the request', text: 'The script tag is public, so anyone can read the key in it. If that key were enough, a stranger could open a cancel page for someone else\'s account and grab a 50% discount. The signature is a secret stamp only the founder\'s server can make, saying "yes, this really is customer cus_123".' },
      { type: 'prompt', id: 'rtn-fe-cancel-prompt', title: 'Paste into Claude Code', code: `Read @PRD.md sections 9.5 and 12, @DESIGN.md sections 7.6 and 7.13.

Build:
1. app/app/cancel-flow/page.tsx with tabs Reasons, Offers, Rules, Install, Sessions, Preview (DESIGN.md 7.6). Reasons are drag-sortable (save position). Offers use one dialog that morphs by kind and shows the discount maths. Saving a discount offer leaves coupon_id empty (the database guard enforces this) and calls a server route that enqueues ensure_coupon. The downgrade target price select lists prices from subscriptions_mirror price ids and product names.
2. Rules matrix writing offer_rules, with the plain-sentence preview.
3. Install tab: the three code blocks with Copy, server signing code in Node, Python, Ruby, PHP and Go (HMAC-SHA256 of customer + '.' + subscription + '.' + ts, hex), and the live "Waiting for your first cancel session" line using Realtime on cancel_sessions. The signing secret is shown once after "Generate signing secret", which calls app/api/keys/rotate/route.ts (owner/admin check, newToken, encrypt with RETAIN_TOKEN_KEY using the same AES-GCM format as the edge functions, upsert workspace_secrets with the secret key, return the plain secret once).
4. public/embed.v1.js (plain JS, no build step, under 4 KB): window.Retain.cancel({ customer, subscription, ts, sig }) reads data-key from its own script tag, injects a full-screen overlay with an iframe to APP_URL/c/start?k=...&customer=...&subscription=...&ts=...&sig=..., listens for postMessage results only from APP_URL's origin, re-posts { type: 'retain:result', result } to its own window, and removes the overlay. Escape closes. Set Cache-Control: public, max-age=3600 in next.config headers for /embed.v1.js.
5. app/c/start/page.tsx calls rt-cancel-flow 'start' server-side and redirects to /c/[sessionId] keeping session_secret only in the client's memory (pass it in the URL fragment #s=..., read it in the client, then history.replaceState to remove it).
6. app/c/[sessionId]/page.tsx: the three-step dialog from DESIGN.md 7.13 calling 'reason', 'accept' and 'cancel'. Send postMessage to the parent on finish. Set the frame-ancestors CSP for /c/* to * (it must work on any founder site) and X-Frame-Options must NOT be DENY on that path only.
7. Sessions tab and the Preview tab (iframe of the real page against a test customer, with the "Preview runs against test mode" note).
Use only design tokens. Screenshot the cancel page at 375px and at 520px inside the dialog.` },
      { type: 'steps', items: [
        'Open Cancel flow > Offers and create "Pause 2 months" and "30% off for 3 months". Wait a minute, refresh: the discount shows a coupon id (made in the Test SaaS Stripe).',
        'Rules: Too expensive -> 30% off; Not using it enough -> Pause 2 months.',
        'Install: click "Generate signing secret" and copy it into a scratch file for the next task.',
        'Preview: pick a test customer, choose "Too expensive", accept the offer. Open that subscription in the Test SaaS Stripe dashboard: the discount is on it.',
        'Preview again with another customer: decline and confirm. Stripe shows the subscription set to cancel at period end with the feedback "too_expensive".',
      ] },
      { type: 'code', id: 'rtn-fe-cancel-sql', filename: 'check-cancel.sql', lang: 'sql', code: `-- One saved and one cancelled session, with MRR counted on the saved one.
select cs.status, cr.label as reason, o.label as offer, cs.offer_result,
       cs.mrr_cents, cs.saved_mrr_cents, cs.ai_tag
from public.cancel_sessions cs
left join public.cancel_reasons cr on cr.id = cs.reason_id
left join public.offers o on o.id = cs.offer_id
order by cs.created_at desc limit 5;` },
      { type: 'mistakes', items: [
        { mistake: 'The iframe is blank and the console says "refused to frame".', fix: 'Your app sends X-Frame-Options: DENY or frame-ancestors \'self\' on every route. Ask Claude Code to set frame-ancestors * only for /c/* in next.config.ts headers and leave every other route locked.' },
        { mistake: 'Start always returns 401 bad_signature.', fix: 'The two sides sign different strings. Both must sign exactly customer + "." + subscription + "." + ts with ts in seconds, and output lowercase hex. Print both strings and compare them character by character.' },
        { mistake: 'The discount offer never shows.', fix: 'coupon_id is still empty because ensure_coupon failed (often missing coupon_write permission in the app manifest). Check jobs where kind = \'ensure_coupon\' for last_error and fix the manifest permissions, then reinstall the app.' },
      ] },
    ],
    checklist: [
      { id: 'rtn-fe-cancel-c1', label: 'Copy the cancel flow prompt', trigger: 'copy:rtn-fe-cancel-prompt' },
      { id: 'rtn-fe-cancel-c2', label: 'Create a pause and a discount offer and two rules' },
      { id: 'rtn-fe-cancel-c3', label: 'Save one customer and cancel another in Preview' },
      { id: 'rtn-fe-cancel-c4', label: 'Check both in Stripe and run the SQL', trigger: 'copy:rtn-fe-cancel-sql' },
    ],
  },
  {
    id: 'rtn-fe-dashboard',
    title: 'Build the Dashboard, Win-back, Usage and Billing meters',
    outcome: 'The founder sees MRR at risk and saved MRR, approves Claude\'s win-back drafts, and watches usage events and plan caps.',
    minutes: 100,
    xp: 65,
    blocks: [
      { type: 'callout', tone: 'eli5', title: 'The dashboard is the sales page', text: 'Founders keep paying for Retain if one number is clearly bigger than the price: saved MRR. So every number must be honest and explain how it was counted. A footnote you can click beats a big green arrow nobody trusts.' },
      { type: 'prompt', id: 'rtn-fe-dashboard-prompt', title: 'Paste into Claude Code', code: `Read @PRD.md sections 13, 15.3, 16 and 19, @DESIGN.md sections 7.2, 7.7, 7.8, 7.10, 7.14 and 14.

Build:
1. app/app/page.tsx (Dashboard): tiles from supabase.rpc('dashboard_metrics', { ws, p_from }) with the period chips; each tile's info popover shows the definition from PRD 19. Weekly saved vs churned chart (Recharts) computed by a second SQL function you add to a new migration file supabase/migrations/<timestamp>_weekly.sql: weekly_saved_churned(ws, p_from) returning week, saved_cents, churned_cents, security invoker. Highest-risk list (top 8), churn reasons bars with the By reason / By AI tag toggle, and the score accuracy card (hidden under 10 cancels).
2. app/app/win-back/page.tsx: tabs Drafts, Scheduled, Sent, Settings (DESIGN.md 7.7). Approve sets winback_runs.status to 'scheduled' and each winback_emails row to 'scheduled' with send_at (do both through one server route using the secret key after an owner/admin check, because the emails' status change is not allowed from the browser). Editing a draft updates winback_emails directly (RLS allows drafts only). Settings save winback_settings and the workspace's product_oneliner and recent_changes.
3. app/app/usage/page.tsx (DESIGN.md 7.8): status card, snippet and webhook cards with code, publishable key, rotate ingest secret (same rotate route with kind 'ingest'), event names and unmatched emails tables, events meter.
4. public/t.js (under 1 KB gzipped, plain JS): window.retain queue, identify, track, auto 'session' event every 30 minutes per tab, batches of 20 every 10 seconds, sendBeacon on pagehide to rt-ingest with ?k=<data-key>, backs off for an hour after a 402 or 429. No cookies; store a random anonymous id in sessionStorage only.
5. app/app/billing/page.tsx: plan card, MRR band line (sum of mrr_cents of tracked customers vs plan_limits mrr_band_cents), all meters from workspace_meters with reset dates and the amber/coral thresholds, plan picker dialog with monthly/annual.
Use only design tokens. Screenshot the dashboard with seeded data at 1440px.` },
      { type: 'steps', items: [
        'Open the Dashboard. Click each info icon and read the definition. Switch to Last 90 days: tiles keep their width.',
        'Cancel a seeded subscription in the Test SaaS Stripe. Next day (or after running rt-explain submit and collect by hand), approve the 3 drafts in Win-back.',
        'Paste the t.js snippet into a plain HTML file, open it, and check Usage shows the first event within a minute.',
        'Open Billing and compare each meter with the numbers in the SQL below.',
      ] },
      { type: 'code', id: 'rtn-fe-dashboard-sql', filename: 'check-meters.sql', lang: 'sql', code: `-- What the meters should show this month, straight from the ledger.
select kind, sum(quantity) as used, sum(cost_usd_micros) / 1e6 as cost_usd
from public.usage_ledger
where created_at >= date_trunc('month', now())
group by kind order by kind;

-- Win-back runs and their emails.
select r.status, e.step, e.status as email_status, e.send_at
from public.winback_runs r
left join public.winback_emails e on e.run_id = r.id
order by r.created_at desc, e.step limit 12;` },
      { type: 'mistakes', items: [
        { mistake: 'Saved MRR looks far too high.', fix: 'Sessions are being counted twice when a customer is saved, then cancels again. dashboard_metrics already subtracts those; check your page is not adding cancel_sessions on top in the client. Every money number should come from the SQL function only.' },
        { mistake: 'Approve does nothing and the console shows a policy error.', fix: 'The browser tried to change winback_emails.status, which RLS does not allow. Move approval into the server route as the prompt says, with an owner/admin check first.' },
        { mistake: 't.js events never arrive from your real app.', fix: 'Your app\'s Content-Security-Policy blocks connect-src to <ref>.supabase.co. Add https://<ref>.supabase.co to connect-src and script-src for retain.app, or proxy rt-ingest through your own domain.' },
      ] },
    ],
    checklist: [
      { id: 'rtn-fe-dashboard-c1', label: 'Copy the dashboard, win-back and usage prompt', trigger: 'copy:rtn-fe-dashboard-prompt' },
      { id: 'rtn-fe-dashboard-c2', label: 'Read every tile definition on the Dashboard' },
      { id: 'rtn-fe-dashboard-c3', label: 'Approve one set of win-back drafts' },
      { id: 'rtn-fe-dashboard-c4', label: 'Send a usage event from the snippet and compare meters with the SQL', trigger: 'copy:rtn-fe-dashboard-sql' },
    ],
  },
]
