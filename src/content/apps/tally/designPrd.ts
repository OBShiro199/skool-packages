// Tally design PRD (DESIGN.md). Builds on Quiet Precision (DESIGN_SYSTEM.md).

export const designPrd = `# Tally: design PRD

Save this file as \`DESIGN.md\` in the project root. It builds on **DESIGN_SYSTEM.md** (Quiet Precision), which is the
base design system for every screen. Save that file next to it as \`DESIGN_SYSTEM.md\`, and put this line in
\`CLAUDE.md\`:

\`\`\`md
UI rules: @DESIGN_SYSTEM.md @DESIGN.md
\`\`\`

DESIGN_SYSTEM.md decides the neutrals, type, radii, sizes, motion, components and stability rules. This file only adds
what is different for Tally: the brand accent, the product-specific screens and the components those screens need.
Where the two disagree, this file wins only for the accent and the Tally screens. Every stability, motion and component
rule in DESIGN_SYSTEM.md still applies: white surfaces, 1px hairlines, 6px boxes, 4px pills, 13px app text, white
buttons with a firm edge for the primary, no filled or black buttons, nothing moves under the cursor.

## 1. Brand

- **Name:** Tally. A tally is a running count, and a tally stick was how people recorded who owed whom: one notch per
  debt, split in two so both sides kept a matching half. That is the product: a calm, exact record of what is owed,
  that both sides can see.
- **Tagline:** Invoices that chase themselves.
- **Personality:** a polite, organised bookkeeper. Never nags, never shouts, always knows the number.
- **Three surfaces, three jobs:**
  1. **The app** (freelancer side): Quiet Precision as written. Dense, numeric, light only.
  2. **The pay page and the PDF** (client side): still Quiet Precision (white, hairlines, Geist, 6px boxes), but the
     accent comes from the business's brand colour, so the client sees the freelancer, not Tally.
  3. **Email** (client side): plain, short, from the freelancer's domain, one button.

## 2. Brand accent: ledger teal

Tally swaps the system's pastel blue for a pastel teal. It keeps the system's three-part shape: a mid accent, a soft fill
and an edge. It marks "selected" and "in progress" only, exactly where the system uses blue.

| Token | Hex | Replaces | Use |
|---|---|---|---|
| \`--accent\` | #3f9a90 | \`--blue\` | Selected nav icon (duotone), progress bars, live dot, forecast "Expected" bars |
| \`--accent-soft\` | #eff7f6 | \`--blue-soft\` | Selected row, selected nav item, selected option fill |
| \`--accent-edge\` | #c2e0dc | \`--blue-edge\` | Selected borders, focus of selected chips, drop target line |

Why teal and not green: in Tally, "Paid" is the most important status and it uses the system success green (#27a644).
If the accent were green, "selected" and "paid" would read the same at a glance. Teal is calm and money-like but stays
clearly apart from success green and from the amber the system uses for warnings and overdue.

Everything else is the system palette unchanged: white surfaces, \`--hairline\` #e6e6e9, \`--divider\` #efeff1,
\`--btn-edge\` #dcdde0, ink #08090a, body #3c4149, muted #62666d, faint #8a8f98, ghost #b4b8bf, success #27a644,
warning #d18b0f, danger #eb5757.

\`\`\`css
:root {
  /* Tally accent (replaces the system blue) */
  --accent: #3f9a90; --accent-soft: #eff7f6; --accent-edge: #c2e0dc;
  /* keep the system names pointing at the accent so shared components need no changes */
  --blue: var(--accent); --blue-soft: var(--accent-soft); --blue-edge: var(--accent-edge);
}
\`\`\`

### 2.1 Status tag hues

Status maps to fixed tag hues (pastel fill at 6 to 9% opacity, darker edge, readable ink, 4px pill, 13px text).

| Status | Hue | Fill | Edge | Ink |
|---|---|---|---|---|
| Draft | Grey | #f5f5f6 | #dcdde0 | #62666d |
| Scheduled | Teal | #eff7f6 | #c2e0dc | #2b6f68 |
| Sent | Blue | #f1f5fd | #c4d4f5 | #3a5fb8 |
| Viewed | Violet | #f4f2fd | #d5cff5 | #5446b8 |
| Part paid | Green, half dot | #eef8f1 | #bfe3c9 | #1d7a35 |
| Paid | Green | #eef8f1 | #bfe3c9 | #1d7a35 |
| Overdue (added beside the status) | Amber | #fdf6e7 | #f0d9a8 | #8f5d05 |
| Void | Grey, number struck through | #f5f5f6 | #dcdde0 | #8a8f98 |
| Uncollectible | Coral | #fdf0f0 | #f6c9c9 | #b33a3a |

Reminder sequence states use a smaller set: Active (teal with the live dot), Paused (amber, with the reason as a
tooltip: "Client replied", "Promised to pay on 20 Nov", "Bank payment processing", "Paused by you"), Disputed (coral),
Bounced (coral), Completed (grey), Stopped (grey).

"Overdue" is not a status, so it is a second pill after the status pill ("Sent" + "12 days overdue"). The status
column has a fixed width that fits "Part paid" plus "60+ days overdue", so a pill appearing never shifts the row.

### 2.2 Business accent on the pay page, PDF and email

The business profile stores one \`accent_hex\`. The client surfaces derive three parts from it so any colour still
reads as Quiet Precision:
- \`--brand\` = the colour as chosen (pay button edge, links, the total underline, the PDF header rule).
- \`--brand-soft\` = the colour at 7% over white. \`--brand-edge\` = the colour at 35% over white.
- If the colour has less than 3:1 contrast on white, darken it 5% lightness at a time until it passes and use that
  for text and edges. One helper, \`lib/brand.ts\` \`brandToCssVars(hex)\`, used by the pay page, the brand preview in
  Settings, and the PDF renderer (which reads the same three values).

## 3. Type in Tally

Geist 400, 500, 600 as in the system, app text 13/18 everywhere. Tally is a numbers product, so:
- Every amount, date, invoice number, count and percentage uses \`font-variant-numeric: tabular-nums\`.
- Amounts align right in tables, with the currency code in faint ink after the number only when the table mixes
  currencies ("2,400.00 EUR"). Single-currency tables show the symbol ("$2,400.00").
- Negative amounts (deposit credits, refunds) use a minus sign and body ink, never red. Red means "something is wrong",
  not "money going the other way".

| Role | Size / line height | Weight | Where |
|---|---|---|---|
| Stat number | 32 / 40, tabular | 500 | Dashboard stat boxes |
| Invoice total (editor, pay page) | 24 / 32 (system H2), tabular | 500 | Totals block |
| Pay page amount due | 48 / 1.04 (system scale), tabular | 500 | Pay page hero only |
| Invoice body on the pay page | 16 / 26 | 400 | Notes and terms |

No monospace anywhere, including invoice numbers and DNS records (the system rule). DNS values use Geist with
\`word-break: break-all\` inside a copy row.

## 4. Components (Tally-specific)

Build every component from DESIGN_SYSTEM.md section 07. Tally adds:

- **StatusPill / OverduePill:** section 2.1 hues. Widths fixed per column as described there.
- **Money:** \`<Money cents currency />\` formats with \`Intl.NumberFormat\` and the zero-decimal list, tabular, right
  aligned. Changing a value never changes the column width (the column is sized for "999,999.99").
- **LineItemRow:** description (flexible), quantity (88px), unit price (120px), tax select (120px), line total
  (120px, read-only), row menu (32px, visibility-toggled). 48px high. Tab moves across, Enter adds a row below.
  "+ Add line" is a dashed 40px row. Drag handle on hover (visibility, never inserted).
- **TotalsBlock:** right aligned, 320px wide: Subtotal, Discount (editable inline), Tax (per rate), Late fees, Deposit
  paid, Total (H2), Paid, Amount due (H2, accent underline 2px when partially paid). Each row 32px, fixed.
- **SequenceTimeline:** a horizontal line from "Sent" to "+14 days" with one 8px dot per step. Sent dots: success. Next:
  accent dot with the system pulse. Skipped: hollow ghost dot with a tooltip. Paused section: amber dashed line between
  the pause and resume points. Labels under each dot in 13px faint with the date in tabular figures. Fixed height 64px.
- **ReplyCard:** hairline box: from, received time, intent tag (Promise to pay teal, Paid already green, Dispute coral,
  Question blue, Out of office grey, Other grey, Unread amber), the AI summary in body ink, "Show full reply" (expands
  with the step morph), actions: "Resume reminders", "Record payment", "Reply in Gmail" (mailto).
- **ForecastBars:** 8 weekly bars, 200px tall area, bar width fixed. Expected in accent, "Overdue, date unknown" in the
  amber tag fill with amber edge on top. Week labels "18 Nov" under each bar. Hover shows a menu-style tooltip in a
  portal with the invoices in that week. "View as table" toggle under the chart.
- **StatBox:** hairline, 6px, 20px padding, label (13px faint), number (32/40 tabular), sub-line (13px muted, reserved
  18px min-height). Four in a row, two by two under 900px.
- **DnsRecordRow:** type (60px), name (flexible, break-all), value (flexible, break-all, max 2 lines then "Show all"),
  status pill (Verified green, Pending amber, Failed coral), Copy icon button (Lucide Copy 14px, labelled "Copy value").
  Copy turns into Check for 2 s with no width change.
- **PayMethodChoice:** radio boxes for "Card" and "Bank transfer (US)" / "SEPA Direct Debit" / "Bacs Direct Debit", with
  the client-facing note under each ("Clears in up to 4 working days"). Selected: \`--brand-soft\` fill, \`--brand-edge\`.
- **AmountInput (partial payment):** currency prefix, tabular, min and max hint under it ("Between $500.00 and
  $2,400.00"), error below in danger ink with \`role=alert\`, reserved 18px.
- **UsageMeter:** the system meter. Accent fill, amber under 20% remaining, coral under 5%. Label "12 of 50", width
  fixed for three-digit counts.
- **EmptyState:** a single-line illustration (1.5px stroke, accent and ink only: a tally mark of four strokes and one
  diagonal), one sentence, one primary button. Max 320px wide, centred in the content area.

## 5. Icons

Navigation uses Phosphor at 17px (regular at rest, duotone in the accent when selected); in-content icons use Lucide 14
to 16px with a 1.5 stroke.

Sidebar (Phosphor): SquaresFour (Dashboard), Receipt (Invoices), UsersThree (Clients), ArrowsClockwise (Recurring),
BellRinging (Reminders), BookOpen (Documentation), Lifebuoy (Help), CreditCard (Billing), Gear (Settings).

## 6. App shell

Per the system: no top bar and no page titles. A white 240px sidebar with a right hairline, then each page starts with
its 48px page toolbar.

\`\`\`
+----------------------+-------------------------------------------------------------------+
| [mark] Tally         | Toolbar 48px: [search]  38 invoices      [Export]  [New invoice]  |
| Moss Studio      v   |-------------------------------------------------------------------|
|                      | Filter bar 44px: [Status: Overdue +1] [Client: Any] [+ Add filter]|
| Dashboard            |-------------------------------------------------------------------|
| Invoices             | Table header 36px                                                 |
| Clients              | Rows 48px ...                                                     |
| Recurring            |                                                                   |
| Reminders            |                                                                   |
|                      |                                                                   |
| (spacer)             |                                                                   |
| [Invoices 12 of 50]  |                                                                   |
| Documentation        |                                                                   |
| Help                 |                                                                   |
| Billing              |-------------------------------------------------------------------|
| Settings             | Footer bar 48px: paging, totals in base currency                  |
+----------------------+-------------------------------------------------------------------+
\`\`\`
- Top group: tally mark + "Tally", the workspace switcher (only for people in more than one workspace), then Dashboard,
  Invoices, Clients, Recurring, Reminders.
- Bottom group, always in this order: Documentation, Help, Billing, Settings. Above it, a compact UsageMeter
  ("Invoices 12 of 50") linking to Billing.
- One level, no nested menus, 9 items. Nav items 32px high, 6px radius. Selected: \`--accent-soft\` fill, ink text,
  duotone accent icon. Hover: \`--hover\`.
- A small count badge (4px pill, amber tag hues, tabular) beside Dashboard shows "Needs you" items (fixed 28px slot,
  \`visibility: hidden\` at 0 so the label never shifts).
- Members (not owner) do not see Billing; the usage meter stays, read-only.
- Under 1100px the sidebar collapses to 56px icons with tooltips. Under 768px it becomes a sheet from the left that floats
  over the page (never reflows it), opened from a 32px icon button at the left of the toolbar.
- Account menu: avatar at the bottom of the sidebar (Profile, Log out).
- Keyboard: \`n\` new invoice, \`c\` new client, \`g d\` dashboard, \`g i\` invoices, \`g c\` clients, \`/\` search, \`?\` shortcuts.

## 7. Screens

All screens: 13px UI text, 36px controls, fixed column widths, single-line cells with ellipsis, white everywhere.

### 7.1 Auth (\`/login\`, \`/signup\`, \`/reset\`)
- One 400px box at 20% from the top, 1px hairline, 6px radius, 32px padding. Tally mark and "Tally" above.
- Fields: Full name (signup only), Work email, Password with a show toggle. Primary button full width.
- Line under the button (muted): "7 days free. Your first invoice takes about 2 minutes."
- Errors under the field in danger ink with \`role=alert\`, never as a toast. 18px reserved min-height.
- Invite (\`/invite/[token]\`): heading "Join Moss Studio on Tally", email pre-filled and read-only.

### 7.2 Onboarding (\`/onboarding\`)
One 520px box that morphs height between steps (system step morph), width constant. A 5-dot step indicator at the top.
Back as a text button.
1. **Business:** "What is your business called?", legal name (optional), country, timezone (detected, editable).
2. **Brand:** logo drop zone (dashed), colour picker with 8 swatches pulled from the logo, and a live mini pay page
   preview at a fixed 300px height.
3. **Money:** base currency, default payment terms (segmented: 7, 14, 30, 60 days, Custom), default tax rate (name and
   %, optional), invoice number prefix with a live example ("INV-0001").
4. **Get paid (optional):** "Let clients pay by card or bank transfer" with two option boxes: "I already use Stripe"
   (primary) and "Create a Stripe account". "Skip for now" text button. Under it, muted: "Money goes straight to your
   Stripe account. Tally never holds it."
5. **Send from your domain (optional):** domain input with the helper "We suggest a subdomain like billing.moss.studio",
   then the DnsRecordRow table in place (height morph) and "I will add these later".
- Finish lands on \`/app/dashboard\` with the first-run checklist.

### 7.3 Dashboard (\`/app/dashboard\`)
- Toolbar: period note "Amounts in USD · rates from 17 Oct" (faint), "New invoice" (primary).
- Row 1: four StatBoxes: Outstanding ("$18,240.00", "14 invoices"), Overdue ("$6,100.00", "5 invoices, oldest 23
  days"), Average days to pay ("21.4", "median 18 · last 90 days"), Paid this month ("$9,800.00", "11 payments").
- Row 2 left (2/3): ForecastBars "Expected in the next 8 weeks". Right (1/3): "Needs you" list (48px rows: icon,
  one line, one action button with a fixed min-width).
- Row 3: "Overdue" table (client, number, amount due, days overdue, sequence state, next reminder) with 1 to 7, 8 to
  30, 31 to 60, 60+ chips as filters.
- Before and after card (only when both sides have 5+ invoices): "Average days to pay: 34.2 before Tally, 21.4 with
  Tally (your invoices)". Otherwise the card is not rendered at all (it is below the fold, nothing shifts).
- First-run checklist (until done), a hairline box above row 1 with reserved height: Add a client, Send your first
  invoice, Connect Stripe, Verify your domain, Check your reminder emails. Each ticks itself.
- Empty (no invoices): EmptyState "Send your first invoice. Tally will take care of the reminders." + "New invoice".

### 7.4 Invoices list (\`/app/invoices\`)
- Toolbar: search (number, client, amount), count ("38 invoices", fixed width), "Export", "New invoice" (primary).
- Filter bar: Status, Overdue, Client, Currency, Issue date chips; "+ Add filter" dashed.
- Columns (fixed widths): Number (96px), Client (name, company muted after a dot), Status (StatusPill + OverduePill),
  Issued (96px), Due (96px), Total (120px right), Due now (120px right), Reminders (SequenceState pill + "Next 21 Nov"),
  Last activity ("Viewed 2h ago").
- Footer bar: "Outstanding $18,240.00 · Overdue $6,100.00" in base currency, tabular, fixed slots.
- Row click opens the invoice. Row menu (portal): Open, Copy pay link, Download PDF, Duplicate, Record payment, Pause
  reminders, Void.
- Multi-select: checkboxes (2px radius) and the floating selection bar: "Send reminder now", "Pause reminders",
  "Export CSV". Each action has a min-width that fits "Pause reminders (128)".
- Loading: 10 skeleton rows at 48px. Empty with filters: "No invoices match these filters." + "Clear filters".

### 7.5 Invoice editor (\`/app/invoices/new\`, drafts)
\`\`\`
+---------------------------------------------------------------------------------------------+
| Toolbar 48px: [<] Draft · INV number on send   Saved        [Preview PDF] [Schedule] [Send] |
+--------------------------------------------------------------+------------------------------+
| Client [Northwind Coffee  v]   Currency [USD v]               | Payment                      |
| Issue date [18 Nov 2026]  Terms [14 days v]  Due [2 Dec 2026] |  Card            (on)        |
|--------------------------------------------------------------|  Bank transfer   (on)        |
| Description              Qty    Unit price   Tax     Total    |  Partial payments (off)      |
| Website design sprint    1      4,000.00     20%     4,000.00 |  Deposit          [Request]  |
| Extra revisions          2.5    120.00       20%       300.00 |------------------------------|
| + Add line                                                    | Reminders                    |
|--------------------------------------------------------------|  Sequence [Default v]        |
| Notes to client  [ ...                                   ]    |  SequenceTimeline preview    |
| Terms            [ ...                                   ]    |  Late fee  "After 15 days"   |
|                                          TotalsBlock          |                              |
+--------------------------------------------------------------+------------------------------+
\`\`\`
- Left canvas max 760px. Right panel 300px with a left hairline.
- Client select: search, "+ New client" opens a side panel (200ms slide over the page, never reflows it). Picking a
  client fills currency, terms and tax.
- Totals update as you type (\`lib/money.ts\`), in fixed-width slots. The server recalculates on save; if the two ever
  disagree, the server value wins and a faint "Recalculated" note shows for 2 s.
- Autosave 800ms after typing stops. "Saving" and "Saved" share a fixed-width slot.
- Deposit: "Request a deposit" opens a small dialog: percentage or amount, "Send the deposit invoice now". Result: a
  linked deposit invoice and a "Deposit paid" line that appears on this invoice when it is paid.
- Preview PDF opens a 720px side panel with the rendered PDF (iframe of a 60 s signed URL), over the page.
- Send dialog (7.7). Schedule opens the same dialog on the Schedule tab.

### 7.6 Invoice detail (\`/app/invoices/[id]\`, sent and later)
- Toolbar: back, "INV-0042 · Northwind Coffee", StatusPill + OverduePill, actions: "Record payment", "Copy pay link",
  "More" (Edit and resend, Download PDF, Pause reminders, Mark uncollectible, Void).
- Left (60%): the invoice as the client sees it (same component as the pay page, with the business accent), read-only.
- Right (40%), in this order: Amount due (H2) with Paid and Total under it; SequenceTimeline with state and "Pause" /
  "Resume"; Replies (ReplyCards); Payments table (date, method, amount, status); Timeline (invoice_events, 36px rows:
  icon, sentence, time).
- Paused notice: a 36px hairline-boxed bar at the top of the right column with an amber tag: "Reminders paused: client
  promised to pay on 20 Nov. They resume on 21 Nov." and "Resume now". Space reserved with \`visibility\`.
- Overpaid notice (coral tag): "Overpaid by $40.00. Refund the difference in your Stripe dashboard."

### 7.7 Send dialog
- 520px dialog at 10% from the top. Segmented control: "Send now" and "Schedule"; height morphs, width fixed.
- To (client email, CC chips), Subject (prefilled), Message (3 lines, editable), "Attach PDF" checkbox (on), "Send me a
  copy" checkbox.
- Sender line in muted: "From accounts@billing.moss.studio" or, without a domain, an amber tag "From
  moss-studio@mail.usetally.app until your domain is verified" with "Verify domain" text button.
- Primary "Send invoice ($4,300.00)". Loading overlays a spinner on the label after 200ms, same width.
- Success morphs in place: success tick, "Sent. We will remind Northwind 3 days before it is due." and "Done".
- At the plan cap the primary is disabled (same width) with the limit sentence under it and "Upgrade" text button.

### 7.8 Record payment dialog
- Amount (AmountInput, defaults to amount due), Date (today), Method (Bank transfer, Cheque, Cash, Other), Note.
- Primary "Record $2,400.00". Morphs to "Payment recorded. Reminders stopped." when it pays the invoice in full.

### 7.9 Clients (\`/app/clients\`, \`/app/clients/[id]\`, \`/app/clients/import\`)
- **List:** toolbar search, count, "Import CSV", "New client" (primary). Columns: Name, Company, Email, Currency (64px),
  Outstanding (right), Avg days to pay (right), Reminders (on/off switch read-only, "Custom" teal pill when the client
  has an override).
- **Detail:** toolbar: client name, "New invoice" (primary). Left: contact and defaults form (name, company, email, CC
  emails as chips, currency, terms, tax rate, address, notes). Right: stat boxes (Outstanding, Avg days to pay, Paid all
  time), "Reminders for this client" box (Use default sequence / Use another sequence / Do not send reminders, "Never
  charge late fees" switch), invoices table, replies.
- **Import:** a 3-step box that morphs height: 1 Upload (dashed drop zone, "Download template"), 2 Map columns (two
  columns: CSV header with 3 sample values in muted, select of Tally fields; required ones marked), 3 Import (progress
  bar with "Imported 120 of 200", then "197 imported, 3 need fixing" and an errors table: row, field, problem, with
  "Download errors CSV").

### 7.10 Recurring (\`/app/recurring\`, \`/app/recurring/[id]\`)
- List columns: Client, Amount, Frequency ("Monthly on the 1st"), Next run (date), Auto-send (pill: "Sends" teal or
  "Drafts" grey), Status, Runs ("4 of 12").
- Editor: the LineItemRow table and TotalsBlock from 7.5, plus a schedule box: frequency (weekly, monthly, quarterly,
  yearly), every N, anchor day, start date, end (never, after N, on date), auto-send switch. A preview line in muted:
  "Next 3 invoices: 1 Dec, 1 Jan, 1 Feb". History table of generated invoices.

### 7.11 Reminders (\`/app/reminders\`)
\`\`\`
+--------------------------+-------------------------------------------------+------------------------+
| Sequences                | Step 3 · 3 days after due · Polite nudge        | Preview                |
|  Default          (5)    | Subject [Quick reminder: {{invoice_number}}...]  | Using INV-0038         |
|  Big clients      (4)    | Body                                             | From accounts@...      |
|  + New sequence          | [ textarea with variable chips ]                 | Subject rendered       |
|--------------------------| Insert variable [v]                              | Body rendered          |
| Steps                    | Enabled (on)                                     | [View and pay]         |
|  -3  Heads-up       on   |                                                  |                        |
|   0  Due today      on   |                                                  |                        |
|  +3  Polite nudge   on   |                                                  |                        |
|  +7  Firm           on   |                                                  |                        |
| +14  Final          on   |                                                  |                        |
|  + Add step              |                                                  |                        |
+--------------------------+-------------------------------------------------+------------------------+
\`\`\`
- Left rail 240px: sequences, then steps of the selected sequence with offset (tabular, fixed 40px), tone, switch.
- Middle: the step editor. Variables render as 4px pills inside the body (teal tag hues). Unknown variables get an amber
  tag and the tooltip "Tally does not know this variable".
- Right 320px: live preview with a real recent invoice (select), rendered exactly like the email.
- Toolbar: "Write in my voice" (opens a 520px dialog: paste an email you wrote, firmness 1 to 3, notes, primary
  "Rewrite 5 steps (1 of 10 left this month)"), "Apply to open invoices", "Send me a test".
- Voice result: each step shows the inline word diff (removed words danger ink struck through on the coral tag fill,
  added words success ink on the green tag fill), "Keep" and "Discard" per step, "Keep all" in the toolbar. Height
  morphs 300ms; width never changes.
- Members see the editor read-only with "Only owners and admins can change reminders".

### 7.12 Settings (\`/app/settings\`)
Segmented tabs (scrolls sideways under 768px): Profile, Business, Payments, Email sending, Taxes, Late fees, Team,
Notifications, Data.
- **Business:** legal name, address, tax id, logo, brand colour with the 8 swatches, footer text, payment instructions
  ("Bank details for clients who prefer to wire you"), reply-to email for forwarded replies, paper size (A4, Letter),
  invoice prefix. Live pay page preview at 375px on the right.
- **Payments:** Stripe box with status pill (Not connected, Onboarding incomplete amber, Active green, Disconnected
  coral), the account name and country, a table of payment methods per currency with Live / Not activated pills, "Open
  Stripe dashboard" and "Disconnect" (danger text button). Copy under it: "Clients pay into your Stripe account. Stripe
  charges you its normal fees. Tally takes nothing."
- **Email sending:** domain box with status, the DnsRecordRow table, "Check now" (fixed width; shows "Checking" with the
  live dot), "From name" and "From address" fields with the live example "Moss Studio <accounts@billing.moss.studio>".
  Agency shows up to 3 domains. Help link: "Where do I add DNS records?" with tabs Porkbun, Cloudflare, GoDaddy,
  Namecheap, Google Domains moved to Squarespace.
- **Taxes:** table of rates (name, %, active, default). "Add tax rate" dialog.
- **Late fees:** off by default. Form: kind (fixed / percent), amount, after N days, once or monthly, max times, cap as %.
  A worked example in muted: "A $2,000 invoice 15 days late gets a $50 fee. Max 3 fees, never more than $200."
- **Team:** members table with role select for the owner, Remove; invite form (email + role); pending invites with
  Revoke; "2 of 3 seats" in tabular figures.
- **Notifications:** switches: payment received, client replied, invoice overdue, weekly digest.
- **Data:** "Import clients" link, Exports box: kind (Accountant CSV, Xero CSV, QuickBooks CSV), date range, "Create
  export", and a table of past exports with status and Download. Xero account code and tax type defaults.

### 7.13 Billing (\`/app/billing\`, owner only)
- Plan box: plan, price, interval, renewal or trial end, "Manage billing" (Stripe portal) and "Change plan".
- Usage box: UsageMeters for Invoices sent, Replies read, Voice rewrites, Seats, Sending domains, and "Resets on 1 Dec".
- Plans: three plan boxes with a Monthly / Annual segmented control ("2 months free" pill). Prices in fixed-width slots so
  the toggle never shifts the layout. Current plan marked with a teal "Current" pill.

### 7.14 Documentation and Help
- **Documentation:** two columns split by a hairline: article list (Getting paid with Stripe, Sending from your domain,
  How reminders work, What happens when a client replies, Partial payments and deposits, Late fees, Recurring invoices,
  Multi-currency, Exports for your accountant, Team roles) and the article (16/26, 65 characters wide).
- **Help:** subject, message, optional screenshot, "Send message" (primary). "We reply within one working day."

### 7.15 Paywall (\`/paywall\`)
One 520px box at 20% from the top: "Your trial has ended" or "Your plan is paused", the line "Reminders are paused until
you choose a plan. Your clients can still see their invoices.", the three plans, "Choose a plan". Members see "Ask
{owner name} to restart the plan" and no buttons.

## 8. The pay page (\`/i/[token]\`)

Quiet Precision with the business accent (section 2.2). Designed at 375px first.
\`\`\`
+--------------------------------------------+
| [logo]                         Moss Studio |
|--------------------------------------------|
| Invoice INV-0042                           |
| $2,400.00                  (48px tabular)  |
| Due 2 Dec 2026 · [Overdue 3 days]          |
|                                            |
| ( ) Pay in full  $2,400.00                 |
| ( ) Pay part     [ $        ]              |
| [Card] [Bank transfer (US)]                |
| [        Pay $2,400.00        ]  46px      |
| Secure payment by Stripe to Moss Studio    |
|--------------------------------------------|
| Line items table                           |
| TotalsBlock                                |
| Payments so far                            |
| Notes and terms                            |
| [Download PDF]                             |
|--------------------------------------------|
| Moss Studio · address · tax id             |
| Sent with Tally (Solo plan)                |
+--------------------------------------------+
\`\`\`
- Above 900px: two columns, the invoice on the left (max 680px), the pay box sticky on the right (360px).
- The pay button is white with a 1px \`--brand\` edge (firm, 2px on focus) and ink text, 46px, full width. No fills.
- Loading after click: the label stays, a spinner overlays after 200ms, the button keeps its width, then the browser
  goes to Stripe Checkout.
- Paid: the pay box morphs (height only) into a success box: tick, "Paid in full on 18 Nov 2026. Thank you." and
  "Download receipt". Part paid: "You have paid $1,000.00. $1,400.00 left." above the pay controls.
- \`/i/[token]/paid\`: "Confirming your payment with Stripe" with the live dot, polls every 3 s for up to 60 s, then "Thank
  you. A receipt is on its way." Bank payments: "Your bank payment has started. It can take up to 4 working days to
  clear. You do not need to do anything else." Shown only from webhook data, never from the URL.
- Payments not set up: the pay box shows the business's payment instructions (bank details) as text with Copy buttons.
- Not found: one box: "This invoice link is not valid. Contact the business that sent it." Same for unknown, deleted and
  rotated tokens. Paused: "This invoice is temporarily unavailable. Contact Moss Studio."
- Print: hide the pay box, keep the invoice.

## 9. The PDF

Rendered by pdf-lib in the worker, A4 or US Letter, 48pt margins, Geist embedded (400 and 500 subsets).
- Header: logo (max 40pt high) left, business name, address, tax id right. A 1pt rule in \`--brand\` under it.
- Block: "Invoice" (20pt), number, issue date, due date, and "Bill to" with client name, company, address.
- Lines table: hairline rules (#e6e6e9), right-aligned tabular amounts, header in faint ink.
- Totals block right aligned like TotalsBlock. "Amount due" 16pt 500.
- Pay box: "Pay online: <short pay URL>" plus the payment instructions text.
- Footer: footer text, page "1 of 2" in faint. Long tables break across pages with a repeated header.
- Paid PDFs (receipt download) add a green "Paid 18 Nov 2026" pill next to the number.

## 10. States

- **Loading:** skeletons at final size (48px rows, stat boxes, the totals block). Spinners follow system timing (after
  200ms, at least 400ms).
- **Empty:** EmptyState with one action; copy in section 15.
- **Errors:** inline hairline box with a coral tag: what happened and the fix ("Stripe has not activated bank payments
  on your account yet. Turn them on in your Stripe dashboard, then refresh."). Toasts only for background events
  ("Northwind paid $2,400.00"), bottom left, no full stop.
- **Limits:** amber tag notice at 80%; at 100% the action keeps its width, disabled, with a tooltip and an "Upgrade" text
  button beside it.
- **Offline:** a 36px notice above the toolbar content: "You are offline. Changes will save when you reconnect."
- **Live:** payments and replies arrive by Realtime. A new row rises once (360ms) and the stat numbers count up once in
  fixed-width slots.

## 11. Motion (Tally moments, within the system curves)

| Moment | Duration | Movement |
|---|---|---|
| Totals recalculate while typing | none | Digits change in place, tabular, no animation (numbers must feel exact) |
| Stat numbers on first load | 500ms | Count up once per session, fixed width |
| Forecast bars on first load | 400ms | Height grows with the morph curve, once per session |
| SequenceTimeline next dot | 1.4s loop | The system live pulse, the only loop on the page |
| Send dialog tab switch and success | 300ms | Height morph, width fixed |
| Voice rewrite diff | 300ms | Step box height morphs, diff fades up 4px after 60ms |
| Pay box to paid state | 300ms | Height morph, content fades up 4px |
| Side panels (new client, PDF preview) | 200ms | Slide 24px from the right over the page |
| Invoice rows | 360ms | Rise once per session, 25ms stagger, capped at 270ms |

Reduced motion: everything shows its end state instantly; the live dot stays solid.

## 12. Accessibility

- System rules apply (2px focus outline with 2px offset, real roles, labelled icon buttons, Escape closes overlays,
  polite toasts).
- Status is never colour alone: pills always show the word. Overdue always shows the number of days.
- Amounts have screen reader text with the currency name ("2,400 US dollars").
- The line items table is a real table with column headers; keyboard entry works without a mouse.
- Charts have "View as table". The forecast table lists week, expected, overdue.
- The pay page passes at 200% zoom and with the business colour forced to the 3:1 rule (2.2).

## 13. Emails (React Email)

- 600px, white, a 1px hairline box, Geist with system fallbacks, 14px body for email clients.
- Client emails: business logo, the amount and due date in a small table, one button "View and pay" (white with a 1px
  \`--brand\` edge, 44px), the body text, then the footer. Plain text version of every email. No tracking pixels.
- Owner emails carry the Tally mark and an ink-edged button.
- Reminder emails keep the same layout as the invoice email so clients recognise them. The step body sits above the
  amount table.

## 14. Component states

| Component | Rest | Hover | Focus | Selected / active | Disabled |
|---|---|---|---|---|---|
| Primary button | White, firm ink edge, ink 500 text | \`--hover\` fill | 2px outline, 2px offset | Press to 98% | Ghost ink, \`--btn-edge\`, tooltip says why |
| Secondary button | White, \`--btn-edge\`, body ink | \`--hover\` fill | Same | Press to 98% | Ghost ink |
| Danger text button | Danger ink, no edge | Coral tag fill | Same | Press to 98% | Ghost ink |
| Input / AmountInput | White, \`--btn-edge\` | \`--faint\` edge | Darker edge + 3px ink halo | n/a | \`--hover\` fill, ghost ink |
| Table row | White | \`--row-hover\` | Inset 2px accent edge | \`--accent-soft\` | n/a |
| Nav item | White | \`--hover\` | Outline | \`--accent-soft\` + duotone icon | n/a |
| LineItemRow | White | Handle and menu visible | Cell edge darkens | n/a | Locked after payment: read-only, Lucide Lock 14px in the toolbar |
| PayMethodChoice | Hairline | Body unchanged | Brand outline | \`--brand-soft\` fill + \`--brand-edge\` | Ghost ink, "Not available for EUR" |

## 15. Microcopy

| Place | Copy |
|---|---|
| Empty invoices | "Send your first invoice. Tally will take care of the reminders." |
| Empty clients | "Add a client or import a CSV. You only do this once." |
| Empty recurring | "Bill a retainer every month without lifting a finger." |
| Send button | "Send invoice ($4,300.00)" |
| Send success | "Sent. We will remind Northwind 3 days before it is due." |
| Shared sender note | "Sending from moss-studio@mail.usetally.app until your domain is verified." |
| Paused by reply | "Reminders paused: Northwind replied. Read it, then resume." |
| Paused by promise | "Reminders paused: client promised to pay on 20 Nov. They resume on 21 Nov." |
| Bank processing | "Bank payment processing. Reminders paused until it clears." |
| Bounced | "We could not deliver INV-0042 to jane@northwind.co. Check the address, then resume." |
| Overpaid | "Overpaid by $40.00. Refund the difference in your Stripe dashboard." |
| Invoice limit | "You have sent all 50 invoices this month. Upgrade or wait until 1 Dec." |
| Domain pending | "Waiting for DNS. This usually takes 15 minutes and can take up to 72 hours." |
| Domain verified | "billing.moss.studio is verified. Invoices now come from your domain." |
| Stripe not connected | "Connect Stripe so clients can pay by card or bank transfer." |
| Late fee example | "A $2,000 invoice 15 days late gets a $50 fee. Max 3 fees, never more than $200." |
| Voice dialog helper | "Paste an email you wrote to a client. We copy the tone, not the content." |
| Before and after card | "Average days to pay: 34.2 before Tally, 21.4 with Tally (your invoices)" |
| Pay page partial hint | "Between $500.00 and $2,400.00" |
| Pay page bank note | "Clears in up to 4 working days. You will get an email when it does." |
| Pay page paid | "Paid in full on 18 Nov 2026. Thank you." |
| Pay page not found | "This invoice link is not valid. Contact the business that sent it." |
| Import result | "197 imported, 3 need fixing" |
| Seat limit | "All 3 seats are in use. Remove someone or move to Agency for 10 seats." |

## 16. Hand-off checklist for Claude Code

1. \`DESIGN_SYSTEM.md\` and \`DESIGN.md\` in the repo root; CLAUDE.md has \`UI rules: @DESIGN_SYSTEM.md @DESIGN.md\`.
2. System starter tokens in \`app/globals.css\`, plus the Tally accent block from section 2. No raw hex in components
   (grep \`components/\` for \`#\`), except \`lib/brand.ts\`.
3. Geist via \`next/font\` (400, 500, 600). The PDF embeds its own Geist subset.
4. shadcn/ui themed to the system: white buttons only, firm-edged primary, 6px boxes, 4px pills, 36px controls.
5. Sidebar matches section 6, bottom group order: Documentation, Help, Billing, Settings. No top bar.
6. Every screen in section 7 has its empty, loading and error state from section 10.
7. Stability check: type a long quantity into a line, toggle loading on Send, switch the billing toggle, add an overdue
   pill to a row, open the voice diff. Nothing else on the screen may move.
8. Screenshots at 375px and 1440px: dashboard, invoice editor, invoice detail, reminders editor, pay page, PDF.
`
