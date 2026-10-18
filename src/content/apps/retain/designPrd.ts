// Retain design PRD (DESIGN.md). Builds on Quiet Precision (DESIGN_SYSTEM.md).

export const designPrd = `# Retain: design PRD

Save this file as \`DESIGN.md\` in the project root. It builds on **DESIGN_SYSTEM.md** (Quiet Precision), which is
the base design system for every screen. Save that file next to it as \`DESIGN_SYSTEM.md\`, and put this line in
\`CLAUDE.md\`:

\`\`\`md
UI rules: @DESIGN_SYSTEM.md @DESIGN.md
\`\`\`

DESIGN_SYSTEM.md decides the neutrals, type, radii, sizes, motion, components and stability rules. This file only
adds what is different for Retain: the brand accent, the product screens and the few components those screens need.
Where the two disagree, this file wins only for the accent and the Retain screens. Every stability, motion and
component rule in DESIGN_SYSTEM.md still applies: white surfaces, 1px hairlines, 6px boxes, 4px pills, 13px app
text, white buttons with a firm edge (never filled, never black), nothing moves under the cursor.

## 1. Brand

- **Name:** Retain. Plain, a verb, says the outcome.
- **Tagline:** Save customers before they cancel.
- **Personality:** a calm finance friend who reads your Stripe every morning. Exact numbers, no alarm bells, no
  guilt-tripping of your customers.
- **Three surfaces, three jobs:**
  1. **The app** (founder side): Quiet Precision as written, dense and keyboard friendly.
  2. **The cancel page** (end-customer side, inside an iframe on the founder's site): still Quiet Precision, but the
     accent comes from the founder's brand colour, so their customer sees their product, not Retain.
  3. **The update-card page and emails** (end-customer side): same rule as the cancel page.

## 2. Brand accent: lilac

Retain swaps the system's pastel blue for a pastel lilac. It keeps the same three-part shape (a mid accent, a soft
fill and an edge) and marks only "selected" and "in progress", exactly where the system uses blue.

| Token | Hex | Replaces | Use |
|---|---|---|---|
| \`--accent\` | #8b7fd6 | \`--blue\` | Selected nav icon (duotone), progress bars, live dot, chart line for "saved" |
| \`--accent-soft\` | #f5f3fd | \`--blue-soft\` | Selected row, selected nav item, selected option card |
| \`--accent-edge\` | #d9d3f6 | \`--blue-edge\` | Selected borders, the focused offer card, the drag line in reason ordering |

Why lilac: red, amber and green already mean High, Watch and Low risk in this product. A lilac accent keeps "this is
selected" visually apart from "this customer is at risk".

\`\`\`css
:root {
  /* Retain accent (replaces the system blue) */
  --accent: #8b7fd6; --accent-soft: #f5f3fd; --accent-edge: #d9d3f6;
  /* keep the system names pointing at the accent so shared components need no change */
  --blue: var(--accent); --blue-soft: var(--accent-soft); --blue-edge: var(--accent-edge);
}
\`\`\`

All other colours are the system palette unchanged (surface #ffffff, hairline #e6e6e9, divider #efeff1, button edge
#dcdde0, ink #08090a, body #3c4149, muted #62666d, faint #6f747c, ghost #b4b8bf, success #27a644, warning #d18b0f,
danger #eb5757).

### 2.1 Fixed tag hues

Tags are 4px pills, 13px text, pastel fill at 7% opacity, a darker edge of the same hue, readable ink.

| Meaning | Hue | Fill | Edge | Ink |
|---|---|---|---|---|
| Risk High | coral | rgba(235,87,87,.07) | #f2b8b8 | #b23b3b |
| Risk Watch | amber | rgba(209,139,15,.08) | #ecd2a0 | #8a5a06 |
| Risk Low | green | rgba(39,166,68,.07) | #b6e0c0 | #1d7a33 |
| Cancelled | grey | #f5f5f6 | #dcdde0 | #62666d |
| Saved | lilac | var(--accent-soft) | var(--accent-edge) | #5a4fb0 |
| Recovered | green | as Low | | |
| Open case | amber | as Watch | | |
| Lost | grey | as Cancelled | | |
| Test mode | amber, with the word "Test" | as Watch | | |

Never colour a whole row. Only the tag and, in the score cell, the number's ink.

### 2.2 Score cell

The score is a number, not a gauge. Tabular figures, 13px, 500 weight, in the band's ink, followed by a 40px wide,
4px high bar (hairline track, band-coloured fill, 2px radius). Width of the cell is fixed at 88px so "7" and "100"
never move the column. Hover shows a tooltip "78 of 100. High risk." The bar animates its width once, 400ms morph
curve, on first render of the table in a session.

## 3. Type, icons and numbers

- Geist 400/500/600 everywhere, sizes from the system scale only.
- Money is always formatted with the currency and two decimals in tables ("$149.00"), and rounded on dashboard tiles
  ("$1,240"). MRR is labelled "/mo" in muted ink after the number.
- Dates in tables: "3 Nov" this year, "3 Nov 2025" otherwise. Relative times ("2h ago") only in the live sync line.
- Nav icons (Phosphor 17px): Dashboard \`ChartLineUp\`, Customers \`UsersThree\`, Recovery \`CreditCard\`, Cancel flow
  \`HandPalm\`, Win-back \`ArrowUUpLeft\`, Usage \`Pulse\`, Documentation \`BookOpen\`, Help \`Lifebuoy\`, Billing
  \`Receipt\`, Settings \`GearSix\`. In-content icons are Lucide 14 to 16px, 1.5 stroke.

## 4. Illustration and imagery

No illustrations in the app. Empty states use one Lucide icon at 20px in faint ink, a 13px sentence and one button.
The landing page uses product screenshots only (see LANDING.md).

## 5. Auth pages

\`/login\`, \`/signup\`, \`/forgot\`, \`/reset\`. Centred column 360px wide, 120px from the top, on white. No card border.

- Logo (wordmark "Retain" in 500 weight, 20px, with a 14px lilac dot before it), then H2 heading.
- Signup: heading "Start your 7 day trial", subline "Connect Stripe in two clicks. No card for the trial." in muted.
  Fields: Full name, Work email, Password (with "8+ characters" helper in faint). Button (primary edge, full width,
  36px): "Create account". Under it: "Already have an account? Log in".
- Login: heading "Log in to Retain". Fields Email, Password, "Forgot password?" link right-aligned above the
  password field. Button "Log in".
- Google button (optional) sits above the fields as a white button "Continue with Google" with the G icon, then a
  hairline divider with "or" in faint text.
- Errors under the field in danger ink with \`role=alert\`: "That email and password don't match. Try again or reset
  your password." Button keeps its width while loading; spinner overlays after 200ms.

## 6. App shell

### 6.1 Sidebar (240px, 56px icon-only under 1100px)

- White, right hairline, full height, does not scroll with the page.
- Top: workspace switcher (32px row: 20px square logo or initials in a 4px box, workspace name, caret). Opens a menu
  in a portal: workspaces, "+ New workspace", "Test mode / Live mode" switch if both connections exist.
- Top group items in this order: Dashboard, Customers, Recovery, Cancel flow, Win-back, Usage.
- Recovery shows a count pill of open cases (amber tag style, min width 24px, tabular). Win-back shows a count of
  drafts waiting for approval (lilac tag).
- Spacer.
- Plan meter (section 7.14 component) above the bottom group: "1,204 / 2,000 customers" with a 4px bar.
- Bottom group in this exact order: Documentation, Help, Billing, Settings. Billing hidden for members. Settings shows
  a 6px danger dot when the Stripe connection is revoked or in error.
- User row at the very bottom: avatar initials, name, menu (Profile, Log out).
- Nav items 32px high, 6px radius, hover fill #f5f5f6, selected = accent-soft fill + accent-edge border + duotone icon.

### 6.2 Page toolbar (48px)

No page titles and no top bar, per the system. Each page starts with its toolbar: left the page's context (for
example a search field on Customers, the period picker on Dashboard), right the page's main action. A hairline under it.

### 6.3 Global banners

A 36px banner directly under the toolbar, full width of the content area, hairline bottom, 13px text, one action:
- Test mode: amber tag "Test" + "You're looking at test-mode Stripe data." + "Install on live Stripe".
- Revoked: danger text "Retain lost access to your Stripe account. Nothing is syncing." + "Reinstall".
- Over cap: "112 customers aren't scored because you're over your plan." + "Upgrade".
Only one banner at a time, in that priority order (revoked, over cap, test). Space is reserved: the content does not
jump when a banner appears because banners only appear on page load, never mid-session.

## 7. Screens

### 7.1 Onboarding (\`/onboarding\`)

A single 560px card (hairline, 6px radius, 24px padding) 10% from the top on white, with a 4-step indicator above
(four 13px labels with a 2px line under the current one in accent). The card morphs height between steps (300ms),
width never changes.

1. **Your product.** Heading H3 "What's your product called?". Fields: Product name, Product URL, Support email (helper
   "Customers reply here"), Timezone (select, defaults to the browser's). Button "Continue".
2. **Install on Stripe.** Heading "Install Retain on your Stripe account". A table of permissions (two columns: what,
   why) using the rows in PRD 6.1, each 13px, why in muted. A tip line in faint: "You can uninstall any time in
   Stripe > Settings > Installed apps." Two buttons: "Install in test mode" (primary edge) and "Install on live
   Stripe". Under them: "Not sure? Start with test mode. You can add live later."
3. **Importing.** Heading "Importing your Stripe data". Four rows, each 36px: label, a 160px meter, count right-aligned
   with tabular numbers in a fixed 120px box ("340 / 1,210"). Live dot pulses next to the active row. Under the rows:
   "You can close this tab. We'll email you when it's done." When done, rows show a green check icon and the button
   "Continue" enables (it is visible, disabled, from the start so nothing shifts).
4. **Turn things on.** Three option rows with a Switch on the right: "Failed-payment emails" (off), "Cancel flow" (off),
   "Win-back emails" (off). Each row has a one-line explanation. Button "Go to dashboard".

### 7.2 Dashboard (\`/app\`)

Toolbar: period chips (This month, Last month, Last 90 days) left; "Share weekly digest" button right.

- **Tiles row:** five equal tiles in a grid (min 180px each, wraps to 2 columns under 900px). Each tile: 13px label
  in faint, H2 number in tabular figures, a delta line in 12px muted ("+$320 vs last month"). Tiles: MRR at risk,
  Saved MRR, Recovered payments, Won back, Churned MRR. Each label has an info icon opening a popover with the exact
  definition from PRD section 19. Numbers reserve their width (min-width 7ch) so loading to loaded does not reflow.
- **Chart card:** "Saved vs churned MRR", weekly bars for the period (churned in #dcdde0, saved in accent), 220px
  high, hairline axis, no gridlines except the zero line. Tooltip on hover in a portal.
- **Two columns under it:**
  - Left: "Highest risk right now", top 8 customers: name, MRR, score cell, top reason (one line, ellipsis). Row click
    opens the customer side panel. Footer link "See all customers".
  - Right: "Why people cancel", horizontal bars by reason (count and MRR), with a toggle "By reason / By AI tag".
- **Score accuracy card** (full width, 48px high): "31 of 44 cancels last month were flagged High or Watch 14 days
  before (70%)." Muted, one line. Hidden until there are 10+ cancels.
- Loading: tiles show a 60% width grey bar (#f5f5f6) in place of the number, same height. Empty (no data yet): tiles
  show "No data yet" in ghost ink and the chart card shows "Your first numbers appear after a week of syncing."

### 7.3 Customers (\`/app/customers\`)

- Toolbar: search field (240px, "Search name or email"), count "1,204 customers" in a fixed-width box, right: "Export CSV".
- Filter bar (44px): chips Band, Plan, Signal, MRR, Status. "+ Add filter" dashed. Saved filters in the URL.
- Table header 36px, rows 48px, fixed column widths: Customer (name over email, 2 lines in 48px: name 13px ink,
  email 12px muted), Plan (140px), MRR (100px, right aligned), Score (88px score cell), Top reason (flex, ellipsis),
  Last seen (100px), Renewal (90px).
- Default sort: score desc, then MRR desc. Sortable headers show a 12px caret; the column width never changes.
- Footer bar 48px: paging "1 to 50 of 1,204", page size select.
- Over-cap customers appear at the end with a grey "Not scored" tag in the score cell.
- Row hover #fafafb, selected row (the one open in the panel) accent-soft.
- Rows rise once on first load per session, never on refetch.

### 7.4 Customer side panel (\`/app/customers/[id]\`)

Opens over the table from the right, 520px wide, slides 24px in 200ms, never reflows the table. Escape closes. On a hard
refresh the same content renders as a full page with the table hidden.

- Header (64px): name (H3), email muted, Stripe link icon button ("Open in Stripe"), close button.
- Summary strip: score cell large variant (20px number, 80px bar), band tag, MRR, plan, customer since, renewal date.
- **AI summary** box: hairline, 6px radius, 12px padding, text 13px in body ink, italic not used; a 12px faint line
  under it "Written by AI from the signals below · 2 days ago". If none: "No summary yet. Summaries are written
  overnight for Watch and High customers." Never a spinner here.
- **Signals list:** each row 40px: points in a fixed 40px box ("+35" in band ink, "-10" in green ink), plain-words
  sentence, a 12px faint code on the right (\`card_expiring\`). Total line at the bottom "Score 78 (capped at 100)".
- **Timeline:** vertical list, newest first, 13px: Stripe events ("Payment failed, $49.00, attempt 2"), plan changes,
  cancel sessions ("Saw offer: Pause 2 months. Accepted."), win-back emails, and usage days as a 30-day mini strip
  (30 small 8px squares, filled accent-soft with accent edge on active days).
- Actions footer (sticky inside panel, 56px): "Copy email", "Send card update link" (only if a case is open; label
  shows cost "(1 email)"), "Open in Stripe".

### 7.5 Recovery (\`/app/recovery\`)

Tabs (36px, underline style in accent): Cases, Emails, Retry checklist, Update-card page.

- **Cases:** filter chips Open, Recovered, Lost. Table: Customer, Amount, Attempts, Next retry, Step ("Email 2 of 3"),
  Status tag, Opened. Totals in the footer bar: "Open $1,240 · Recovered this month $3,180".
- **Emails:** a vertical list of steps, each a card: day offset select ("Day 0, 3, 7"), subject field, body textarea
  with variables shown as tags you can click to insert ({first_name}, {brand}, {amount}, {last4}, {plan}). Right side:
  live preview of the email at 375px in a phone-width frame, using the brand colour and logo. Buttons: "Send test to me",
  "Save". Master switch "Send failed-payment emails" at the top with the cap note "Uses your 2,000 emails a month".
- **Retry checklist:** four rows (PRD 11.1), each: checkbox (2px radius), title, exact click path in muted 13px, a
  "Open in Stripe" link. "Checked by you on 12 Oct" in faint after ticking.
- **Update-card page:** a preview of \`/u/[token]\` at 375px and 1024px side by side, plus the brand settings shortcut.

### 7.6 Cancel flow (\`/app/cancel-flow\`)

Tabs: Reasons, Offers, Rules, Install, Sessions, Preview.

- **Reasons:** a sortable list (drag handle, 40px rows), label field inline, "Ask a follow-up question" switch, and the
  Stripe feedback mapping as a select. "+ Add reason" dashed row.
- **Offers:** cards in a grid (min 260px). Each card: kind tag (Pause, Discount, Downgrade), headline as the customer
  will read it, the details (e.g. "30% off for 3 months"), "Shown for: Too expensive, Missing a feature", active switch.
  "+ New offer" opens a dialog (520px) that morphs between kind choice and the kind's fields. Discount dialog shows the
  maths: "On a $49 plan the customer pays $34.30 for 3 months."
- **Rules:** a two-column matrix: reasons as rows, a select per row for the offer (or "No offer"), and an optional
  per-plan override row under each. Plain sentence preview under the matrix: "Customers who say Too expensive see:
  30% off for 3 months."
- **Install:** three numbered blocks: 1 "Add the script" (code block with Copy), 2 "Sign the request on your server"
  (tabs Node, Python, Ruby, PHP, Go, each a code block), 3 "Call Retain.cancel from your cancel button" (code). A live
  status line at the bottom: "Waiting for your first cancel session..." with the live dot, which becomes "Installed.
  First session received 2 min ago" in success ink.
- **Sessions:** table: Customer, Reason, Follow-up (ellipsis, hover shows full text in a portal tooltip), AI tag,
  Offer, Result tag (Saved, Cancelled, Abandoned), MRR, When.
- **Preview:** the real cancel page in a 520px frame with a "Pretend customer" select (any of your Stripe test
  customers) and a note "Preview runs against test mode. Nothing changes in live Stripe."

### 7.7 Win-back (\`/app/win-back\`)

Tabs: Drafts, Scheduled, Sent, Settings.

- **Drafts:** list of runs waiting for approval: customer, cancelled date, reason, MRR. Clicking opens the side panel
  with the three emails as editable cards (subject, body, day). Panel footer: "Approve and schedule (3 emails)",
  "Stop this run". After approve the row leaves the list with a 240ms fade; the list does not jump because the
  removed row's height collapses with the morph curve over 300ms.
- **Scheduled / Sent:** tables with step, send date, status, opened, clicked. "Won back" lilac tag on runs where the
  customer resubscribed.
- **Settings:** master switch, "Send automatically without my approval" switch (off by default, with the warning line
  "Claude's drafts will go out without you reading them"), tone select, offer select, signature, step days (three
  number fields), and the cap note "Uses 1 of your 200 win-back drafts per cancelled customer".

### 7.8 Usage (\`/app/usage\`)

- Status card at the top: "Usage tracking is on · 82% of events matched to a Stripe customer · last event 3 min ago",
  or the off state "Usage tracking is off. Scores use Stripe signals only."
- Two cards side by side (stack under 900px): "JS snippet" with the code block, and "Server webhook" with the curl
  example and the HMAC code tabs.
- Keys: publishable key with Copy; ingest secret shown as dots with "Rotate" (the dialog explains that the old
  secret stops working straight away).
- Event names table: name, events in 30 days, last seen. Unmatched events table: email, events, "Will match when a
  Stripe customer with this email appears."
- Meter: "182,400 / 1,000,000 events this month".

### 7.9 Documentation (\`/app/docs\`) and Help (\`/app/help\`)

- Docs: left list of articles (200px, inside the content area, not a second sidebar: a simple list), article body
  max 680px. Articles: Install the Stripe App, How the score works (lists every signal and its points), Usage snippet,
  Server webhook, Cancel flow install, Offers and rules, Dunning and retries, Win-back, Plans and caps, Uninstalling.
- Help: three cards: "Email support" (mailto with the workspace id prefilled in the subject), "Status" (Stripe sync
  status, last worker run, link to status page), "Changelog". Keyboard shortcuts list (\`/\` search, \`j/k\` move rows,
  \`Enter\` open, \`Esc\` close).

### 7.10 Billing (\`/app/billing\`, owners and admins)

- Plan card: plan name, price, renewal date, trial days left (if trialing), "Manage billing" (opens Stripe Customer
  Portal for Retain's own subscription), "Change plan".
- MRR band line: "Your tracked MRR is $23,400. Growth covers up to $40,000."
- Meters list (7.14 component): tracked customers, AI risk summaries, win-back drafts, exit tags, emails, usage
  events, seats. Each shows used / cap, the reset date ("Resets 1 Nov") and turns amber at 80% and coral at 95%.
- Plan picker dialog: monthly/annual segmented control (annual shows "2 months free"), three option cards (Starter,
  Growth, Scale) with the caps from the PRD, current plan marked with accent-edge and "Current plan" tag.

### 7.11 Settings (\`/app/settings\`)

Tabs as listed in PRD 7.6: Workspace, Stripe, Brand, Team, Notifications, Keys, Danger zone. Forms are one column,
480px max, labels above fields, a sticky 56px save bar that appears only when something changed (it overlays the
bottom of the page, never pushes content).

- Stripe tab connection card: account id in a copyable code-free text field, mode tag, status dot + label ("Active",
  "Importing 64%", "Revoked"), last sync relative time, events in last 24h. Buttons: "Reinstall", "Disconnect" (danger
  text, white button, confirm dialog morphs into a "type DISCONNECT" step). Sync log table below.
- Brand tab: logo drop zone (dashed, 120px high), colour field with 8 swatches from the logo, preview tabs Email /
  Cancel page / Update-card page.
- Team: members table, invite dialog (email, role), seat count "3 of 5 seats".

### 7.12 Paywall (\`/paywall\`)

Same centred column as auth (480px). H2 "Your trial has ended" or "Your payment didn't go through". One paragraph:
"Retain kept syncing. Your scores, cases and settings are safe. Pick a plan to see them again." The plan picker
from 7.10 inline. Note in faint: "Your customers can still cancel normally. The cancel page skips offers while
your plan is paused."

### 7.13 End-customer pages (founder's brand)

All three use the founder's \`brand_color\` as \`--accent\` (soft and edge derived: soft = colour at 8% on white, edge
= colour at 30% on white) and their logo at 28px high. A 12px faint "Powered by Retain" line at the bottom (hidden on
Scale when the badge is removed).

- **Cancel page \`/c/[id]\`** (inside a 520px dialog iframe; full screen under 600px):
  - Step 1: H3 "Before you go, what's the main reason?" Reasons as 44px option rows (radio, label), selected row
    accent-soft with accent-edge. Optional textarea "Anything we could have done better?" with a 0/500 counter in a
    fixed box. Buttons: "Continue" (primary edge) and, always visible, "Skip and cancel" as a text button.
  - Step 2 (offer): H3 is the offer headline ("Pause for 2 months instead?"), one paragraph with the exact effect
    ("You won't be charged until 14 Jan. Everything stays as it is."). Buttons side by side, equal min-width 160px:
    "Pause my plan" (primary edge) and "No thanks, cancel" (secondary). Never hide or shrink the cancel button.
  - Step 3a: success icon, "Done. Your plan is paused until 14 Jan." Button "Close".
  - Step 3b: "Your plan ends on 30 Oct. You keep access until then." Button "Confirm cancel". After confirm: "Cancelled.
    Sorry to see you go." Button "Close".
  - The dialog morphs height between steps; width fixed. Loading after "Pause my plan": label stays, spinner overlays
    after 200ms, minimum 400ms.
  - Error (Stripe failed): "We couldn't apply the offer right now. You can try again or cancel." Buttons "Try again",
    "Cancel my plan".
- **Update-card page \`/u/[token]\`:** 440px centred column. Logo, H3 "{brand} couldn't charge your card", line "Card
  ending 4242 · {amount} due for {plan}". Button full width "Update card and pay {amount}". Under it a faint line
  "Secure payment by Stripe". Expired token: "This link has expired. Check your inbox for a newer email or contact
  {support_email}." Already paid: "This invoice is already paid. Nothing to do."
- **Done \`/u/[token]/done\`:** polls status for up to 20 seconds with a live dot "Confirming payment". Then "Paid. Thank
  you." (success icon) or "Card saved, but your bank declined the payment. Try another card." with the button again.
- **Unsubscribe \`/unsubscribe/[token]\`:** one line "You won't get more emails like this from {brand}." and an "Undo"
  text button for 10 seconds.

### 7.14 Components Retain adds

| Component | Spec |
|---|---|
| Score cell | Section 2.2 |
| Risk tag | 4px pill, band hues from 2.1, labels "High", "Watch", "Low", "Cancelled", "Not scored" |
| Signal row | 40px, fixed 40px points box, sentence, faint code |
| Plan meter | Label left, "used / cap" right in tabular numbers, 4px bar under. Accent, amber from 80%, coral from 95% |
| Money tile | Label, H2 number with min-width, delta line, info popover |
| Code block | White, hairline, 6px radius, 12px padding, 13px \`ui-monospace\` (the one exception, see the note below), horizontal scroll inside the block, and a Copy button that never changes width ("Copy" / "Copied") |
| Live status line | Pulsing dot + label, the only looping motion |
| Phone preview frame | 375px wide, hairline, 6px radius, used for email and page previews |

Note on code blocks: the system says "No monospace in the UI". Install snippets are content the founder copies, so
they may use \`ui-monospace\` inside the code block only. That is the one allowed exception in Retain.

## 8. States

| State | Rule |
|---|---|
| Loading | Skeleton bars in #f5f5f6 at the final size of the content. Spinners only in buttons, after 200ms, min 400ms |
| Empty | One faint icon, one sentence that says what will appear and when, one action. Examples below |
| Error | Inline in the region that failed: what went wrong, what happens next, a "Try again" button. Never a full-page error inside the app shell |
| Syncing | Live status line in the toolbar right: "Synced 2 min ago" or "Importing 64%" |
| Over cap | Meter coral, banner (6.3), affected rows tagged "Not scored", buttons that spend show the cost and are disabled with a reason tooltip |
| Test mode | Amber "Test" tag in the workspace switcher and the banner |

Empty state copy:
- Customers: "No customers yet. They appear here as soon as Stripe finishes importing." Button "View import progress".
- Recovery cases: "No failed payments right now. When a renewal fails, it shows up here within a minute."
- Cancel sessions: "No cancel sessions yet. Install the cancel flow to start saving customers." Button "Install".
- Win-back drafts: "Nothing to approve. Drafts appear the day after a customer cancels."
- Usage events: "No events yet. Paste the snippet or send one test event." Button "Send a test event".

## 9. Microcopy

| Moment | Copy |
|---|---|
| Install button | Install Retain on Stripe |
| Import done toast | Import finished · 1,210 customers |
| Offer saved toast | Offer saved |
| Approve drafts | Approve and schedule (3 emails) |
| Send link | Send card update link (1 email) |
| Cap reached error | You've used all 200 win-back drafts this month. They reset on 1 Nov, or upgrade to Scale for 400. |
| Revoked | Retain lost access to Stripe. Reinstall to keep tracking. |
| Disconnect confirm | Disconnect Stripe? Syncing stops and we delete our access keys. Your data stays until you delete the workspace. |
| Rotate secret | Rotate the signing secret? Your cancel button stops working until you deploy the new secret. |
| Score tooltip | 78 of 100. High risk. |

## 10. Motion (on top of the system)

- Score bars fill once per session (400ms morph curve). Dashboard tile numbers do not count up: they fade in (200ms).
- Side panel 200ms slide from the right, 24px, over the page.
- Cancel page dialog: 220ms rise 8px and scale from 98.5%, then step morphs (300ms height).
- Approved draft row: fade 240ms then height collapse 300ms.
- Live dot: 1.4s pulse. Nothing else loops.
- Reduced motion: all of the above show their end state instantly.

## 11. Responsive

- App: designed for 1280 to 1440px; works to 1024px; sidebar collapses to icons under 1100px. Under 768px the app shows
  the Dashboard and Customers read-only with a note "Editing works best on a larger screen."
- Customer side panel becomes full screen under 768px.
- End-customer pages are mobile first: check 320, 375 and 430px. Tap targets 44px minimum on these pages.
- Tables never scroll the page sideways: the table container scrolls horizontally with the first column sticky.

## 12. Accessibility

- All the system rules (focus ring 2px outline 2px offset, real roles, labelled icon buttons, polite toasts, Esc).
- Risk is never colour only: every band has its word ("High") and the number.
- Cancel page: the dialog has \`role=dialog\`, \`aria-modal\`, focus starts on the heading, Tab is trapped, Esc closes and
  posts \`closed\` to the parent page. The cancel button is reachable without passing the offer button.
- Contrast: band inks above pass 4.5:1 on their fills. Founder brand colours below 3:1 on white are darkened
  automatically for text and edges (keep the hue, lower lightness until 4.5:1), and the settings page says so.

## 13. Email layout (dunning, card expiry, win-back)

Built with React Email or plain table HTML, tested in Gmail, Outlook and Apple Mail.

- Width 560px, white background, no grey outer panel. 32px padding top, 24px sides.
- Founder logo 28px high, left aligned. No Retain logo.
- Body 15px/22px system font stack (email clients do not load Geist reliably), ink #08090a, body #3c4149.
- **Dunning:** one button: a white box with a 1px border in the founder's brand colour (darkened to 4.5:1 if needed),
  6px radius, 44px high, label "Update card" in the brand colour, 500 weight. No filled buttons, to match the system.
  A plain-text fallback link under it: "Or open this link: https://retain.app/u/..."
- **Win-back:** no button, no images except the logo. Plain text paragraphs, the founder's signature, then the
  unsubscribe line in 12px muted: "Don't want these? Unsubscribe in one click."
- Footer (all): 12px muted: "{brand} · {product_url}", and for win-back the postal address line if the founder set one.
- Every email has a plain-text part generated from the same content.
- Preview text (hidden preheader) is set for every email: dunning "Your card ending 4242 was declined", win-back the
  first sentence of the body.

## 14. Charts

- One chart library across the app (Recharts or visx). Lines 1.5px, bars with 2px top radius, no shadows, no
  gradients.
- Colours: saved/positive = accent, churned/negative = #dcdde0 with #b4b8bf edge, risk bands only in risk charts.
- Axis labels 12px faint, tabular numbers, money abbreviated ("$1.2k"). Zero line hairline, no other gridlines.
- Tooltips: white, hairline, float shadow from the system, rendered in a portal, 13px, show the exact value
  ("$1,240.00 saved, week of 6 Oct").
- Every chart has a text alternative: a visually hidden table with the same numbers.
- Chart height is fixed before data arrives (220px), so loading never shifts the page.

## 15. Tables and keyboard

- Click a row to open the side panel; Cmd/Ctrl-click opens the full page in a new tab.
- \`j\` / \`k\` move the highlighted row, \`Enter\` opens it, \`Esc\` closes the panel, \`/\` focuses search.
- Sorting and filtering keep the scroll position at the top and never re-animate rows.
- Exports run server-side and download a CSV; the button shows "Exporting" with the spinner overlay, same width.
- Column widths are fixed in CSS (\`table-layout: fixed\`). Long names truncate with ellipsis and show the full value
  in a tooltip on hover after 500ms.

## 16. Screen checklist for Claude Code

Before you call a screen finished, check each line at 1440px, 1024px and (end-customer pages) 375px:

1. Only tokens from DESIGN_SYSTEM.md and section 2 here. No raw hex in components.
2. No filled or black buttons anywhere, including the end-customer pages and emails.
3. Every count, money value and score uses tabular numbers and sits in a fixed-width box.
4. Loading, empty and error states exist and take the same space as the loaded state.
5. Overlays (panel, dialogs, menus, tooltips) are in a portal and do not reflow the page.
6. The sidebar order is Dashboard, Customers, Recovery, Cancel flow, Win-back, Usage, then Documentation, Help,
   Billing, Settings.
7. Sentence case everywhere, buttons start with a verb, toasts have no full stop.
8. Reduced motion shows end states instantly.
9. Focus is visible on every control and the tab order follows the visual order.
10. Risk is shown by word and number, never colour alone.
`
