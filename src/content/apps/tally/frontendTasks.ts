// Tally app-specific frontend tasks (appended to the Foundations phase).
import type { Task } from '../../types'

export const frontendTasks: Task[] = [
  {
    id: 'tly-fe-onboarding',
    title: 'Build onboarding, business settings and the app shell',
    outcome: 'A new user names their business, adds a logo and brand colour, sets currency, terms and tax, and lands in a sidebar app.',
    minutes: 70,
    xp: 50,
    blocks: [
      { type: 'callout', tone: 'eli5', title: 'Why the business details come first', text: 'An invoice is a legal-looking document with your name, address and tax number on it. If those are missing, the first invoice looks homemade. So the first five minutes collect exactly what prints on the invoice, and nothing else.' },
      { type: 'prompt', id: 'tly-fe-onboarding-prompt', title: 'Paste into Claude Code', code: `Read @PRD.md sections 4, 7, 8 and 10, @DESIGN_SYSTEM.md, and @DESIGN.md sections 2, 6, 7.2 and 7.12.

Build:
1. app/onboarding/page.tsx: the 5-step box from DESIGN.md 7.2 (one 520px box that morphs height, width fixed). Step 1 calls supabase.rpc('create_workspace', { p_name, p_base_currency, p_timezone, p_country }) with the timezone from Intl.DateTimeFormat().resolvedOptions().timeZone. Step 2 uploads the logo to brand-assets/<workspace_id>/logo.<ext> (browser client, RLS applies), suggests 8 swatches from the logo with a small canvas k-means, saves business_profiles.accent_hex. Step 3 updates workspaces (base_currency, default_terms_days, invoice_prefix) and inserts the first tax_rates row if given. Step 4 links to /api/stripe/connect/start (built later) with "Skip for now". Step 5 calls the tl-domains edge function with action 'add' (built later; show "Coming in the next step" until it exists) and "I will add these later".
2. lib/workspace.ts: getCurrentWorkspace() on the server: getClaims, then profiles.current_workspace_id, then the workspace and the user's role. Redirect to /onboarding if none.
3. lib/brand.ts: brandToCssVars(hex) returning --brand, --brand-soft, --brand-edge with the 3:1 contrast rule from DESIGN.md 2.2.
4. lib/currency.ts: the supported currency list, the zero-decimal list, formatMoney(cents, currency, locale) with Intl.NumberFormat.
5. The app shell from DESIGN.md section 6: sidebar items in this order: Dashboard, Invoices, Clients, Recurring, Reminders, then the bottom group Documentation, Help, Billing, Settings. Billing hidden for non-owners. The compact usage meter above the bottom group reads supabase.rpc('usage_summary', { ws }). The "Needs you" count badge beside Dashboard (fixed slot, visibility hidden at 0).
6. app/app/settings/page.tsx with the tabs from DESIGN.md 7.12. Build Profile, Business (with a live pay page preview at 375px using brandToCssVars), Taxes, Late fees and Notifications now. Payments, Email sending, Team and Data show "Set up in a later step" boxes for now.
Use only design tokens, no raw hex outside lib/brand.ts. Then run the app and screenshot onboarding steps 2 and 3 at 390px and 1440px.` },
      { type: 'steps', items: [
        'Open http://localhost:3000/signup and create a new account.',
        'Finish onboarding: business "Moss Studio", upload any PNG logo, pick a colour, base currency USD, terms 14 days, tax "Sales tax 8.875%". Skip Stripe and the domain.',
        'Open Settings > Business and change the brand colour. The pay page preview on the right updates as you pick.',
        'Shrink the browser under 1100px: the sidebar collapses to icons. Under 768px it becomes a sheet.',
      ] },
      { type: 'code', id: 'tly-fe-onboarding-sql', filename: 'check-onboarding.sql', lang: 'sql', code: `-- Run in Supabase > SQL Editor. You should see your business, you as owner,
-- your colour, one tax rate and the 5 default reminder steps.
select w.name, w.base_currency, w.timezone, m.role, b.accent_hex,
       (select count(*) from public.tax_rates t where t.workspace_id = w.id) as tax_rates,
       (select count(*) from public.reminder_steps s where s.workspace_id = w.id) as reminder_steps
from public.workspaces w
join public.workspace_members m on m.workspace_id = w.id
join public.business_profiles b on b.workspace_id = w.id;` },
      { type: 'mistakes', items: [
        { mistake: 'Step 1 errors with "new row violates row-level security policy".', fix: 'Claude Code inserted into workspaces directly. Tell it: "Create the workspace with supabase.rpc(\'create_workspace\'), never with an insert. The function adds the owner, business profile, counter, late fee policy and default reminders in one go."' },
        { mistake: 'The logo upload fails with a 403.', fix: 'The path must start with the workspace id folder: brand-assets/<workspace_id>/logo.png. Ask Claude Code to log the path it uploads to and compare it with the storage policy.' },
        { mistake: 'Amounts show as 1250 instead of $12.50, or yen show as ¥12.50.', fix: 'Something formatted money without lib/currency.ts. Ask Claude Code: "Find every place that formats money and make it use formatMoney(cents, currency) with the zero-decimal list."' },
      ] },
    ],
    checklist: [
      { id: 'tly-fe-onboarding-c1', label: 'Copy the onboarding and shell prompt', trigger: 'copy:tly-fe-onboarding-prompt' },
      { id: 'tly-fe-onboarding-c2', label: 'Finish onboarding with a logo, currency and tax rate' },
      { id: 'tly-fe-onboarding-c3', label: 'Check the sidebar order and the collapse below 1100px' },
      { id: 'tly-fe-onboarding-c4', label: 'Run the check SQL and see 5 reminder steps', trigger: 'copy:tly-fe-onboarding-sql' },
    ],
  },
  {
    id: 'tly-fe-editor',
    title: 'Build clients and the invoice editor with exact money maths',
    outcome: 'You can add a client and build an invoice whose live total always matches the database to the cent.',
    minutes: 100,
    xp: 70,
    blocks: [
      { type: 'callout', tone: 'eli5', title: 'Two calculators that must agree', text: 'The editor adds up the invoice in your browser so the total changes as you type. The database adds it up again when you save, and the database wins. If the two ever disagree by one cent, a client gets a confusing invoice. So both use the same rules, and a test checks 12 tricky cases.' },
      { type: 'prompt', id: 'tly-fe-editor-prompt', title: 'Paste into Claude Code', code: `Read @PRD.md sections 8 (invoice maths), 9.1 and 21, @DESIGN_SYSTEM.md, and @DESIGN.md sections 3, 4, 7.5 and 7.9.

Build:
1. lib/money.ts: lineSubtotal, lineTax, invoiceTotals exactly as the maths block in PRD section 8 (integer cents, Math.round half away from zero for positives and negatives, tax scaled pro rata for a discount). lib/money.test.ts with the 12 cases from PRD 8 (vitest). Run the tests and show me they pass.
2. app/app/clients/page.tsx and app/app/clients/[id]/page.tsx from DESIGN.md 7.9 (the "Reminders for this client" box can save the override fields now; the sequence list comes later).
3. app/app/invoices/new/page.tsx and the draft view of app/app/invoices/[id]/page.tsx from DESIGN.md 7.5: client select with "+ New client" side panel, currency, issue date, terms, due date, the LineItemRow table (Tab across, Enter adds a row, drag to reorder with dnd-kit), saved items quick add, discount, notes, terms, the TotalsBlock, and the right panel (payment options, reminders preview placeholder).
4. Saving: insert the invoice with only the editable fields (never totals, status or number; the guard trigger rejects them). Write lines with normal inserts and updates (RLS applies). Autosave 800ms after typing stops into a fixed-width "Saving / Saved" slot. After each save, read back subtotal_cents, tax_cents and total_cents and show the server values; if they differ from the preview, show "Recalculated" for 2 s.
5. Preview PDF: for now render the same invoice component in a 720px side panel (the real PDF arrives with the worker).
6. Zero-decimal currencies: JPY lines take whole yen. Switching currency on a draft reformats every amount.
Then create the invoice from acceptance test 2 in PRD section 22 and show me the editor total next to the SQL total.` },
      { type: 'steps', items: [
        'Add a client "Jane Cole, Northwind Coffee, jane@yourdomain.test", currency USD, terms 14 days.',
        'Create an invoice with 2.5 hours at $120, one item at $999.99 with your tax rate, and 3 x $0.33. Add a $50 discount.',
        'Run the SQL below. The total must match the editor exactly.',
        'Open the browser console on the invoice page and try the cheat in the code block. It must fail.',
      ] },
      { type: 'code', id: 'tly-fe-editor-sql', filename: 'check-totals.sql', lang: 'sql', code: `select number, status, subtotal_cents, discount_cents, tax_cents, total_cents, amount_due_cents
from public.invoices order by created_at desc limit 1;

select position, description, quantity, unit_price_cents, tax_pct, line_subtotal_cents, line_tax_cents
from public.invoice_lines
where invoice_id = (select id from public.invoices order by created_at desc limit 1)
order by position;` },
      { type: 'code', id: 'tly-fe-editor-cheat', filename: 'browser-console.js', lang: 'ts', code: `// Paste in the browser console while logged in (window.supabase exposed in dev only).
const { error } = await window.supabase
  .from('invoices')
  .update({ total_cents: 1, status: 'paid' })
  .eq('id', location.pathname.split('/').pop())
console.log(error?.message) // "these invoice fields are set by Tally"` },
      { type: 'mistakes', items: [
        { mistake: 'The editor shows $1,442.58 and the database $1,442.59.', fix: 'Rounding differs. Ask Claude Code: "Round each line before summing, exactly like compute_line() and refresh_invoice() in the migration. Add this invoice as a test case in lib/money.test.ts."' },
        { mistake: 'Saving a draft fails with "these invoice fields are set by Tally".', fix: 'The save sends the whole invoice object back, including totals. Ask Claude Code to send only the editable columns (client_id, currency, dates, discount_cents, notes, terms, payment and reminder options).' },
        { mistake: 'Typing a quantity makes the totals column jump sideways.', fix: 'The totals cells have no fixed width. Use tabular-nums and the fixed column widths from DESIGN.md section 4 (LineItemRow and TotalsBlock).' },
      ] },
    ],
    checklist: [
      { id: 'tly-fe-editor-c1', label: 'Copy the editor prompt', trigger: 'copy:tly-fe-editor-prompt' },
      { id: 'tly-fe-editor-c2', label: 'See all 12 money tests pass' },
      { id: 'tly-fe-editor-c3', label: 'Match the editor total with the SQL total', trigger: 'copy:tly-fe-editor-sql' },
      { id: 'tly-fe-editor-c4', label: 'Try the console cheat and see it rejected', trigger: 'copy:tly-fe-editor-cheat' },
    ],
  },
  {
    id: 'tly-fe-send-pay',
    title: 'Build the send dialog, the invoice timeline and the hosted pay page',
    outcome: 'You send an invoice, watch its timeline fill in, and your client sees a branded pay page on their phone.',
    minutes: 110,
    xp: 70,
    blocks: [
      { type: 'callout', tone: 'eli5', title: 'Why the pay page never reads the database', text: 'Your client is not logged in, so anything the pay page could read, a stranger could read too. Instead the page sends the long random code from the link to a small server function. The function looks up that one invoice and hands back only what the client should see. No code, no invoice.' },
      { type: 'prompt', id: 'tly-fe-send-pay-prompt', title: 'Paste into Claude Code', code: `Read @PRD.md sections 9.1, 13.1, 13.4 and 13.5, @DESIGN_SYSTEM.md, and @DESIGN.md sections 7.6, 7.7, 7.8 and 8.

Build:
1. components/invoices/SendDialog.tsx (DESIGN.md 7.7): Send now / Schedule tabs that morph height, recipients, subject, message, attach PDF, the sender line (verified domain or the shared address note), primary "Send invoice ($X)". Calls supabase.functions.invoke('tl-send-invoice', ...). Handle 402 limit_reached (disabled primary with the limit sentence), 409 errors with their messages. Success morphs in place.
2. The sent view of app/app/invoices/[id]/page.tsx (DESIGN.md 7.6): the invoice as the client sees it on the left; on the right Amount due, SequenceTimeline (from reminder_sends), Replies (inbound_messages), Payments, Timeline (invoice_events). Subscribe with Supabase Realtime to the invoices row and payments for this invoice so a payment appears without refresh. The paused notice bar with Resume (an RLS update of sequence_state to 'active'). "Pause reminders" sets 'paused_manual'.
3. components/invoices/RecordPaymentDialog.tsx (DESIGN.md 7.8): inserts a payments row with source 'manual', status 'succeeded', method, amount, received_at, note. The database recalculates; show the new amount due from the read-back.
4. app/i/[token]/page.tsx: server component that fetches tl-public-invoice?t=token (server-side fetch, no keys sent), renders DESIGN.md section 8 with brandToCssVars(accent_hex), pay box (full or part with AmountInput bounds, method choice), Download PDF, payments so far, notes and terms, footer. A small client component posts the view beacon with a session_id from sessionStorage. "Pay" posts to tl-create-checkout and redirects to the returned url. Not found, paused and "payments not set up" states exactly as DESIGN.md.
5. app/i/[token]/paid/page.tsx: "Confirming your payment with Stripe" with the live dot; poll tl-public-invoice every 3 s for up to 60 s until a new payment shows, then the thank-you or the bank-processing message. Never trust the URL.
6. The app's "Preview" button opens /i/<token> with a tl_member=1 cookie so your own views are not counted.
Then send an invoice to your second email (the worker may not exist yet: show the status "Sending" and the timeline event), open the pay link on your phone, and screenshot the pay page at 375px.` },
      { type: 'steps', items: [
        'Send the test invoice with "Send now". The status pill becomes "Sending" and the number INV-0001 appears.',
        'Copy the pay link from the toolbar and open it on your phone. Check the logo, colour, amount and due date.',
        'Record a $100 manual payment (Cheque). The status becomes Part paid and Amount due drops by $100.',
        'Open the pay link again on the phone: "You have paid $100.00" shows above the pay controls.',
      ] },
      { type: 'code', id: 'tly-fe-send-pay-sql', filename: 'check-send.sql', lang: 'sql', code: `select number, status, sequence_state, amount_paid_cents, amount_due_cents,
       public_token_hash is not null as has_token, pay_token_enc is not null as has_encrypted_token
from public.invoices order by created_at desc limit 1;

select kind, created_at from public.invoice_events
where invoice_id = (select id from public.invoices order by created_at desc limit 1)
order by created_at;` },
      { type: 'mistakes', items: [
        { mistake: 'The pay page shows "This invoice link is not valid" for a link you copied a minute ago.', fix: 'The token was URL-encoded twice or trimmed. Ask Claude Code to log the token length in tl-public-invoice (never the token itself). It must be 43 characters.' },
        { mistake: 'The pay page is blank on the phone but fine on the laptop.', fix: 'The fetch to the edge function ran in the browser and hit CORS. The page must fetch tl-public-invoice in the server component; only the view beacon and Pay run in the browser, and APP_URL must match your dev URL.' },
        { mistake: 'Recording a manual payment errors "payments can only be recorded on sent invoices".', fix: 'The invoice is still "scheduled" because the worker has not sent it yet. Build the worker (Backend phase) or test on an invoice that has been sent.' },
      ] },
    ],
    checklist: [
      { id: 'tly-fe-send-pay-c1', label: 'Copy the send and pay page prompt', trigger: 'copy:tly-fe-send-pay-prompt' },
      { id: 'tly-fe-send-pay-c2', label: 'Send a test invoice and see its number' },
      { id: 'tly-fe-send-pay-c3', label: 'Open the pay page on your phone' },
      { id: 'tly-fe-send-pay-c4', label: 'Record a manual payment and run the check SQL', trigger: 'copy:tly-fe-send-pay-sql' },
    ],
  },
  {
    id: 'tly-fe-reminders',
    title: 'Build the reminders editor with live preview and "Write in my voice"',
    outcome: 'You can edit every reminder step, preview it with a real invoice, and rewrite the whole sequence in your own tone.',
    minutes: 80,
    xp: 55,
    blocks: [
      { type: 'callout', tone: 'eli5', title: 'Polite, then firm', text: 'The first reminder sounds like a friend: "heads-up, this is due on Friday". The last sounds like a business: "this is my final reminder". Every step in between gets a little clearer. Clients respond to the change in tone, and you never have to write the awkward one yourself.' },
      { type: 'prompt', id: 'tly-fe-reminders-prompt', title: 'Paste into Claude Code', code: `Read @PRD.md sections 9.2, 13.9, 14.1 to 14.3 and 15.3, @DESIGN_SYSTEM.md, and @DESIGN.md sections 4 (SequenceTimeline) and 7.11.

Build:
1. lib/template.ts: the same renderTemplate as _shared/render.ts (one file copied into both places, with a test that both produce the same output for 5 fixtures). Unknown variables are returned in a list.
2. app/app/reminders/page.tsx with the three columns from DESIGN.md 7.11: sequences and steps on the left (offset, tone, enabled switch, "+ Add step"), the step editor in the middle (subject, body with variable pills, "Insert variable" menu, amber tag for unknown variables), and the live preview on the right using a real recent invoice chosen from a select and rendered exactly like the email.
3. "Send me a test": renders the step and calls a Next.js route app/api/reminders/test/route.ts that checks membership and sends it to the logged-in user through Resend from the system address (rate limit 10 an hour).
4. "Write in my voice" dialog: sample, firmness 1 to 3, notes, primary "Rewrite N steps (X of Y left this month)". Calls tl-tone-rewrite (built in the Backend phase; show a disabled button until it exists). Show the inline word diff per step (use the diff package), "Keep" and "Discard" per step and "Keep all". Keep is a normal RLS update of reminder_steps.
5. "Apply to open invoices": calls supabase.rpc('rewrite_open_schedules', { p_sequence }) (already in the migration; it checks owner/admin itself) and shows "Updated reminders for N open invoices".
6. The client detail "Reminders for this client" box now lists the sequences.
7. Members see everything read-only with "Only owners and admins can change reminders".
Then edit step 3, preview it with a real invoice, and send yourself a test.` },
      { type: 'steps', items: [
        'Open Reminders. Click step "+3 Polite nudge" and change one sentence.',
        'Pick a real invoice in the preview select. Check the amount, due date and pay link render correctly.',
        'Type {{invoice_numbr}} on purpose: the amber "Tally does not know this variable" tag appears.',
        'Click "Send me a test" and open the email on your phone.',
      ] },
      { type: 'code', id: 'tly-fe-reminders-sql', filename: 'check-steps.sql', lang: 'sql', code: `select s.name as sequence, st.offset_days, st.tone, st.enabled, left(st.subject, 60) as subject
from public.reminder_steps st
join public.reminder_sequences s on s.id = st.sequence_id
order by s.name, st.offset_days;` },
      { type: 'mistakes', items: [
        { mistake: 'The preview shows the text {{amount_due}} instead of the amount.', fix: 'The preview used a different template function from the worker. Both must call renderTemplate with the same variable names from PRD 14.1. Ask Claude Code to run the shared fixture test.' },
        { mistake: 'A member can change the steps.', fix: 'Hiding buttons is not enough, but RLS should already block it. Run the update as the member in the SQL editor: it must affect 0 rows. If it works, the steps policies are missing; re-run section 22 of the migration.' },
      ] },
    ],
    checklist: [
      { id: 'tly-fe-reminders-c1', label: 'Copy the reminders editor prompt', trigger: 'copy:tly-fe-reminders-prompt' },
      { id: 'tly-fe-reminders-c2', label: 'Edit a step and preview it with a real invoice' },
      { id: 'tly-fe-reminders-c3', label: 'Send yourself a test reminder' },
      { id: 'tly-fe-reminders-c4', label: 'Run the steps SQL', trigger: 'copy:tly-fe-reminders-sql' },
    ],
  },
  {
    id: 'tly-fe-dashboard',
    title: 'Build the dashboard, recurring invoices, CSV import and exports',
    outcome: 'You see outstanding, overdue, average days to pay and an 8 week cash forecast, and you can import clients, bill retainers and export for your accountant.',
    minutes: 120,
    xp: 70,
    blocks: [
      { type: 'callout', tone: 'eli5', title: 'A forecast built from real habits', text: 'If Northwind always pays 6 days late, an invoice due on the 1st will probably arrive on the 7th. The forecast moves each open invoice by that client\'s own habit and adds up the weeks. No guessing, no AI: only their own history.' },
      { type: 'prompt', id: 'tly-fe-dashboard-prompt', title: 'Paste into Claude Code', code: `Read @PRD.md sections 9.6, 13.10, 14.5, 14.6 and 18, @DESIGN_SYSTEM.md, and @DESIGN.md sections 4 (StatBox, ForecastBars), 7.3, 7.9 (import) and 7.10.

Build:
1. lib/dashboard.ts (server): reads invoice_overview, client_payment_stats and fx_rates for the current workspace and returns the numbers in PRD section 18, all converted to base_currency with the fx_rate formula from PRD 11.5. Unconverted currencies are returned separately. Write tests with 3 currencies, an overdue invoice, and a client with no history.
2. app/app/dashboard/page.tsx (DESIGN.md 7.3): four StatBoxes, ForecastBars with "View as table", Needs you list (inbound_messages with intent dispute, question, paid_already or unread and handled_at null; invoices with sequence_state paused_bounce; failed payments; dead jobs), the Overdue table with age chips, the before-and-after card only when both sides have 5+ invoices, and the first-run checklist. Every number has a "How is this worked out?" tooltip with the PRD 18 definition.
3. app/app/recurring/page.tsx and app/app/recurring/[id]/page.tsx (DESIGN.md 7.10) writing recurring_profiles through RLS. The "Next 3 invoices" preview line uses lib/recurring.ts nextRuns(profile, 3) with month-end handling and tests for an anchor of 31.
4. app/app/clients/import/page.tsx (DESIGN.md 7.9): upload the CSV to imports/<ws>/<import_id>.csv, insert the imports row with the mapping (papaparse in the browser for the header and 3 sample rows only), then call tl-start-job { kind: 'import_clients', import_id }. Follow progress with Realtime on the imports row. Show the error table and "Download errors CSV".
5. Settings > Data tab: the Exports box (kind, date range, "Create export") calling tl-start-job, and the past exports table with Download through /api/files/export/[id] (getClaims, membership, then a 60 s signed URL).
6. Invoices list toolbar "Export" opens the same export dialog with the current filters' date range.
Then seed 8 invoices across 3 clients and 2 currencies with the Supabase MCP (some paid with paid_at in the past, some overdue) and show me the dashboard next to the SQL below.` },
      { type: 'steps', items: [
        'Open the dashboard. Hover each number and read its definition.',
        'Click "View as table" under the forecast and check the weeks add up to Outstanding.',
        'Import a 20 row CSV of clients with 2 rows missing an email. 18 import, 2 show in the error table.',
        'Create a monthly recurring profile with auto-send off and check the "Next 3 invoices" dates.',
      ] },
      { type: 'code', id: 'tly-fe-dashboard-sql', filename: 'check-dashboard.sql', lang: 'sql', code: `-- Outstanding and overdue in each invoice currency (the dashboard converts these).
select currency,
       sum(amount_due_cents) filter (where status in ('sent', 'viewed', 'partially_paid')) as outstanding_cents,
       sum(amount_due_cents) filter (where is_overdue) as overdue_cents,
       round(avg(days_to_pay) filter (where status = 'paid' and paid_at > now() - interval '90 days'), 1) as avg_days_to_pay
from public.invoice_overview
group by currency;` },
      { type: 'mistakes', items: [
        { mistake: 'The dashboard total is far too big.', fix: 'Amounts in other currencies were added without converting. Every sum must go through the fx_rate helper; currencies with no rate are listed under the total, not added to it.' },
        { mistake: 'Overdue shows invoices due today.', fix: '"Today" was taken in UTC. invoice_overview uses the workspace timezone; make lib/dashboard.ts read is_overdue from the view instead of comparing dates itself.' },
        { mistake: 'The import sits on "Queued" for ever.', fix: 'tl-worker is not running yet or the job kind is not handled. Run select kind, status, last_error from jobs order by created_at desc limit 5; in the SQL editor.' },
      ] },
    ],
    checklist: [
      { id: 'tly-fe-dashboard-c1', label: 'Copy the dashboard prompt', trigger: 'copy:tly-fe-dashboard-prompt' },
      { id: 'tly-fe-dashboard-c2', label: 'Compare the dashboard with the SQL totals', trigger: 'copy:tly-fe-dashboard-sql' },
      { id: 'tly-fe-dashboard-c3', label: 'Import a CSV with 2 bad rows' },
      { id: 'tly-fe-dashboard-c4', label: 'Create a recurring profile and check the next 3 dates' },
    ],
  },
]
