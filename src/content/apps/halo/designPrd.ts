// Halo design PRD (DESIGN.md). Builds on Quiet Precision (DESIGN_SYSTEM.md).

export const designPrd = `# Halo: design PRD

Save this file as \`DESIGN.md\` in the project root. It builds on **DESIGN_SYSTEM.md** (Quiet Precision), which
is the base design system for every screen. Save that file next to it as \`DESIGN_SYSTEM.md\`, and put this line in
\`CLAUDE.md\`:

\`\`\`md
UI rules: @DESIGN_SYSTEM.md @DESIGN.md
\`\`\`

DESIGN_SYSTEM.md decides the neutrals, type, radii, sizes, motion, components and stability rules. This file only
adds what is different for Halo: the brand accent, the star colour, the product screens (including the public
rating page customers see on their phones) and the components those screens need. Where the two disagree, this
file wins only for the accent and the Halo screens. Every stability, motion and component rule in
DESIGN_SYSTEM.md still applies: white surfaces, 1px hairlines, 6px boxes, 4px pills, 13px app text, white buttons
with a firm edge for the primary, no filled or black buttons, nothing moves under the cursor.

## 1. Brand

- **Name:** Halo. The soft ring of light around something good. The product makes a business's good work visible
  and keeps the owner close to every customer, happy or not.
- **Tagline:** More Google reviews, fewer surprises.
- **Personality:** a warm, organised practice manager. Polite, quick, never pushy. Speaks to customers like the
  front desk would on a good day.
- **Two surfaces, two jobs:**
  1. **The app** (owner side): Quiet Precision as written. Dense, calm, light only.
  2. **The rating page** (customer side, \`/r/[token]\`): still Quiet Precision (white, hairlines, Geist, 6px boxes),
     but sized for thumbs and branded with the business's name and logo, not Halo's.

## 2. Brand accent: halo sage

Halo swaps the system's pastel blue for a pastel sage green. It keeps the system's three-part shape (a mid accent,
a soft fill, an edge) and marks only "selected" and "in progress", exactly where the system uses blue.

| Token | Hex | Replaces | Use |
|---|---|---|---|
| \`--accent\` | #4a9e8c | \`--blue\` | Selected nav icon (duotone), progress bars, the live dot, meters, chart line |
| \`--accent-soft\` | #eff7f5 | \`--blue-soft\` | Selected row, selected nav item, selected chip fill, selected star chip |
| \`--accent-edge\` | #c2e1d9 | \`--blue-edge\` | Selected borders, focus of selected chips, the "Recommended" plan edge |
| \`--star\` | #e2a93b | (new) | Filled star glyphs only: rating page, review rows, feedback rows. Never a fill for buttons, pills or charts |
| \`--star-empty\` | #dcdde0 | (new) | Empty star outline (same as \`--btn-edge\`) |

Why sage and not the system success green (#27a644): success means "delivered" and "posted". The accent means
"selected" and "in progress". A bluer, softer green keeps them apart at a glance. Why a separate star colour:
people read gold stars as ratings everywhere; using amber for stars only (never for status) means a 2 star row
does not look like a warning, and the warning amber (#d18b0f) stays for meters and "Needs attention".

\`\`\`css
:root {
  /* Halo accent (replaces the system blue) */
  --accent: #4a9e8c; --accent-soft: #eff7f5; --accent-edge: #c2e1d9;
  --star: #e2a93b; --star-empty: #dcdde0;
  /* keep the system names pointing at the accent so shared components need no changes */
  --blue: var(--accent); --blue-soft: var(--accent-soft); --blue-edge: var(--accent-edge);
}
\`\`\`

Everything else is the system palette unchanged: white surfaces, \`--hairline\` #e6e6e9 structure, \`--divider\`
#efeff1 between rows, \`--btn-edge\` #dcdde0, ink #08090a, body #3c4149, muted #62666d, faint #8a8f98, ghost #b4b8bf,
success #27a644, warning #d18b0f, danger #eb5757.

### 2.1 Status tag hues

Status maps to fixed tag hues (pastel fill at 6 to 9% opacity, darker edge, readable ink, 4px pill, 13px text).
Every pill column has a fixed width set by its longest label, so a status change never resizes the column.

| Thing | Status | Hue | Fill | Edge | Ink |
|---|---|---|---|---|---|
| Request | Scheduled | Grey | #f5f5f6 | #dcdde0 | #62666d |
| Request | Sending | Sage + live dot | #eff7f5 | #c2e1d9 | #2f7565 |
| Request | Sent | Blue | #f1f5fd | #c4d4f5 | #3a5fb8 |
| Request | Skipped | Grey, reason in faint ink after the pill | #f5f5f6 | #dcdde0 | #8a8f98 |
| Request | Failed | Coral | #fdf0f0 | #f6c9c9 | #b33a3a |
| Request | Cancelled | Grey, struck through | #f5f5f6 | #dcdde0 | #8a8f98 |
| Feedback | New | Amber | #fdf6e7 | #f0d9a8 | #8f5d05 |
| Feedback | Contacted | Blue | #f1f5fd | #c4d4f5 | #3a5fb8 |
| Feedback | Resolved | Green | #eef8f1 | #bfe3c9 | #1d7a35 |
| Reply | Needs reply | Amber | #fdf6e7 | #f0d9a8 | #8f5d05 |
| Reply | Draft ready | Sage | #eff7f5 | #c2e1d9 | #2f7565 |
| Reply | Posted | Green | #eef8f1 | #bfe3c9 | #1d7a35 |
| Reply | Failed | Coral | #fdf0f0 | #f6c9c9 | #b33a3a |
| Texting | Not set up / Pending / Approved / Rejected | Grey / Amber / Green / Coral | as above | | |
| Google | Link mode / Connected / Reconnect | Grey / Green / Coral | as above | | |

Free labels (CSV source names, Zapier key labels) hash to the first seven of the eight system tag hues.

## 3. Type in Halo

Geist 400, 500, 600 as in the system. App UI text is 13/18 everywhere. Halo adds only:

| Role | Size / line height | Weight | Where |
|---|---|---|---|
| KPI figure | 24 / 32 (system H2), tabular-nums | 500 | Dashboard KPI tiles |
| Review and feedback body | 14 / 20, max 65 characters wide | 400 | Review rows expanded, feedback panel |
| Rating page heading | 24 / 32 | 500 | "How was your visit to Brightside Dental?" |
| Rating page body and inputs | 16 / 24 | 400 | Customer-facing text and the textarea (16px stops iOS zooming into the input) |

## 4. Components (Halo-specific)

Build every component from DESIGN_SYSTEM.md section 07. Halo adds:

- **StarRow (display):** 5 Lucide \`star\` icons at 14px, filled \`--star\` or outlined \`--star-empty\`, 2px gap,
  \`aria-label="4 out of 5 stars"\`. Never animates.
- **StarPicker (rating page):** 5 buttons, each 48 x 48px (44px minimum tap target plus spacing), star glyph 32px,
  8px gap, in a \`radiogroup\` with roving tab index, arrow keys move, Enter/Space selects. Hover and focus fill the
  stars up to that one in \`--star\` at 40% opacity; selected fills at 100%. Selection never changes the row's size.
  Below it, a 20px line reserved for the label ("Poor", "Fair", "Good", "Very good", "Excellent") so the page
  never jumps when it appears.
- **GoogleButton:** the system primary button (white, firm edge \`#08090a\` at 1px, 46px large size), full width on
  the rating page, label "Post a review on Google", Google "G" mark (official colours, 18px) on the left, external
  link icon on the right. **It is the same component, same size, same position, same label in every state of the
  rating page** (rule R1 in PRD.md). Do not add variants of it.
- **FunnelBar:** horizontal row of 5 fixed-width cells (Sent, Delivered, Opened, Rated, Clicked to Google), each with
  a tabular count, the % of sent below in faint ink, and a 4px accent bar whose width eases (morph curve, 400ms).
  Private feedback is a separate tile to the right, never a funnel step.
- **KpiTile:** label (faint 13px), figure (24/32 tabular), delta vs previous period (success/danger ink with an
  arrow, or "no change" faint). 96px tall fixed. Skeleton holds the same height.
- **RatingTrend:** line chart (Recharts), 1.5px \`--accent\` line, no area fill, y axis 1.0 to 5.0 fixed (so the line
  does not jump when data loads), hairline grid every 0.5, tooltip in a floating card (shadow-float). One line per
  location when "All locations" is selected, coloured with the tag hue inks.
- **RequestTicks:** 6 small 14px Lucide icons in a fixed 120px cell: send, check-check, eye, star, external-link,
  message-square. Reached = ink, not reached = ghost. Tooltip shows the time.
- **UsageMeter:** the system meter with accent fill, amber under 20% left, coral under 5%. "182 of 250 requests"
  in tabular figures, width fixed for four-digit counts.
- **PhonePreview:** a 280px wide rounded (6px) hairline card that renders the SMS bubble exactly as text will look,
  with a live character count "142 / 160" (tabular) and a segment warning in danger ink if over. Used in templates,
  onboarding and the send dialog.
- **DraftCard:** the reply editor. Review on top (StarRow, reviewer, date, text at 14/20). Under it a textarea
  (min-height 120px reserved before the draft arrives), a checks line (min-height 18px reserved: "Checks passed" in
  faint ink or "Check this draft: it mentions a phone number" in warning ink), and actions: "Approve and post"
  (primary, min-width 160px), "Redraft" (with an instruction input that opens in place), "Copy" and "Discard".
  While drafting: the live dot with "Drafting reply" in place of the text, height unchanged.
- **SetupChecklist:** the dashboard empty state for a new workspace. 5 rows (Add location, Google link,
  Texting, Send a test, Connect your booking tool), each 48px, check circle on the left, action button on the right
  with a fixed min-width.

## 5. Icons

Navigation: Phosphor at 17px, regular at rest, duotone in \`--accent\` when selected: Dashboard \`SquaresFour\`,
Requests \`PaperPlaneTilt\`, Feedback \`ChatCircleText\`, Reviews \`Star\`, Locations \`Storefront\`, Documentation
\`BookOpen\`, Help \`Lifebuoy\`, Billing \`CreditCard\`, Settings \`GearSix\`. In-content icons: Lucide 14 to 16px,
stroke 1.5. Never mix the two families in one row.

## 6. App shell

- Left sidebar, 240px wide (56px icon-only under 1100px), white with a right hairline. Top: Halo wordmark (16px,
  500) with a 14px sage ring mark. Under it the **location switcher**: a 32px select showing "All locations" or the
  location name, opening a menu (portal) of locations with their texting and Google status dots.
- **Top group:** Dashboard, Requests, Feedback, Reviews, Locations. Feedback shows a count pill of \`new\` items
  (4px pill, amber, fixed width for "99+"). Reviews shows a count of reviews needing a reply.
- **Bottom group, always this order:** Documentation, Help, Billing, Settings. Billing is hidden for non-owners.
- Above the bottom group: a compact UsageMeter for review requests this month ("182 of 250"), linking to Billing.
- Nav items 32px high, 6px radius, hover fill \`--hover\`, selected fill \`--accent-soft\` with the duotone icon. One
  level only. No nested menus.
- Every page has a 48px toolbar (no page title, no top bar): left the search or the filter chips, right the count
  and actions. Content scrolls under a fixed toolbar; the sidebar never scrolls with content.

## 7. Screens

### 7.1 Auth (\`/login\`, \`/signup\`, \`/reset\`)
Centred 400px column on white, Halo wordmark above, H2 "Create your Halo account" / "Log in to Halo". Email and
password inputs (36px), primary "Create account" full width, Google sign-in as a secondary button. Under signup:
"7 day free trial. No card needed to start." Errors under the field in danger ink with \`role=alert\`
("That password is too short. Use 8 or more characters."). Loading keeps the label and overlays the spinner.

### 7.2 Onboarding (\`/onboarding\`)
One 560px card, opened 10% from the top, that morphs height between 5 steps (width constant). Step dots on top
(8px, accent for current, success for done), "Step 2 of 5" in faint ink.
1. **Your business:** business name, type (select: Dental, Medical clinic, Physio, Vet, Salon or spa, Barber,
   Trades and home services, Auto, Other), "I am an agency serving local businesses" checkbox.
2. **First location:** location name, short name for texts (max 24, live count), timezone (prefilled from the
   browser), address (optional), logo upload (shows a 48px preview).
3. **Google review link:** two cards side by side (stack on mobile): "Paste your review link" (input with a
   "Where do I find this?" disclosure: Google Business Profile > Ask for reviews > Copy link; accepts
   \`g.page/r/...\`, \`search.google.com/local/writereview?placeid=...\`) and "Connect Google Business Profile"
   (button, note "Lets Halo read new reviews and post your replies"). Validation in place: green check and the
   detected business name for a valid link.
4. **Texting (optional):** explains in 2 lines why a number needs approval, shows PhonePreview with the default text,
   and "Set up texting now" (opens the Texting form inline, step height morphs) or "Skip, use email for now".
5. **Send a test:** your name, your email, your mobile (texting only if approved), "Send me a test". After sending:
   a live status line ("Sent to you 4 seconds ago. Open it on your phone.") and "Go to dashboard".

### 7.3 Dashboard (\`/app\`)
Toolbar: location switcher mirror (chip), date range chip (7, 30, 90 days, custom), "Send a request" primary.
- **Row 1, KPI tiles (4, equal width):** Requests sent, Open rate, Clicked to Google, New Google reviews (Connected)
  or Private feedback (Link mode).
- **Row 2:** FunnelBar (left, 2/3) and Private feedback tile (right, 1/3: count, share at 3 stars or fewer, "Open
  inbox").
- **Row 3:** RatingTrend (Connected) with the current average and total count above it. In Link mode the same box
  shows "Connect Google to see your rating over time" with the Connect button, same height.
- **Row 4, two tables (5 rows each, 48px rows):** "Needs a reply" (reviews with a ready draft or none) and "Latest
  feedback". Each row opens its side panel.
- New workspace: SetupChecklist replaces rows 2 to 4 until the first request is sent.

### 7.4 Requests (\`/app/requests\`)
Tabs in the toolbar: Requests, People, Imports. Filter bar (44px): Status, Channel, Source, Location, "+ Add filter"
(dashed).
- **Requests table:** columns Customer (name, faint phone last 4), Location, Channel (SMS/Email/Both icon),
  Status pill, Send time (relative, tabular), Ticks, Rating (StarRow or em-space placeholder), Source. Row click
  opens the side panel (slides 24px from the right over the page, 440px): timeline of every step with times, the
  exact messages sent (PhonePreview / email preview), skip reason in plain words, and actions: "Cancel" (scheduled
  only), "Resend" (failed only).
- **Send a request dialog** (520px, 10% from the top): location, first name, last name, mobile, email, visit time
  (default now), "This customer agreed to receive a text from us" checkbox (unchecked by default; the SMS option is
  disabled until ticked), channel segmented control (Auto, SMS, Email), PhonePreview. Primary "Schedule request"
  with the send time in brackets: "Schedule request (sends 14:30)".
- **Import CSV dialog:** step 1 drop zone (dashed, "Drop a CSV or click to choose", template download link), step 2
  column mapping with a 5 row preview, step 3 summary ("1,184 will be scheduled. 16 skipped: 9 without consent or
  email, 5 invalid numbers, 2 asked in the last 90 days."), primary "Schedule 1,184 requests". The dialog morphs
  height between steps; width constant. Processing shows the live dot and "Scheduling 640 of 1,184".
- **People tab:** contacts with opt-out state (SMS and email pills), last asked, total requests. No "VIP" or tags.
- **Imports tab:** file name, rows, scheduled, skipped, who, when, status.

### 7.5 Feedback (\`/app/feedback\`)
Inbox table: StarRow, first line of the note (ellipsis), customer, location, received (relative), status pill.
Filter chips: Status (default New + Contacted), Rating, Location. Side panel: full note (14/20), rating, the
customer's name, phone (tap to call link) and email (mailto), the visit and request timeline, owner notes
(textarea, autosave with "Saved" toast), status buttons "Mark contacted", "Mark resolved". A fixed line at the
bottom of the panel in faint ink: "Reach out to help. Halo never asks customers to skip a public review."

### 7.6 Reviews (\`/app/reviews\`)
- **Connected mode:** table of Google reviews: StarRow, reviewer (avatar 24px, name), first line, date, location,
  reply status pill. Filters: Needs reply, Stars, Location. Side panel holds the DraftCard. "Sync now" in the
  toolbar shows "Synced 4 minutes ago" (fixed width) and the live dot while syncing.
- **Link mode:** the same page shows a 560px card "Draft a reply to any review": star picker (compact 24px), review
  text area, "Draft reply (1 of 40 this month)". The result appears below in a DraftCard whose primary is "Copy
  reply" and a secondary "Open Google reviews" link. Above it, a hairline box: "Connect Google to see every new
  review here and post replies from Halo." with the Connect button.
- \`needs_attention\` drafts show a warning-ink line above the draft: "Needs your attention: mentions a safety
  incident. Consider calling the customer before replying."

### 7.7 Locations (\`/app/locations\`)
Table: name, Google (pill), Texting (pill), requests this month (tabular), average rating (Connected), intake keys
count. "Add location" primary shows the plan count in brackets "Add location (2 of 3)" and is disabled with a
tooltip at the limit.

### 7.8 Location detail (\`/app/locations/[id]\`)
Tabs in the toolbar: Details, Google, Texting, Messages, Intake, Tone. Forms are 640px wide, sections split by
hairlines, labels 13px faint above 36px inputs, a sticky footer bar (48px) with "Save changes" (disabled until
dirty) and "Discard".
- **Details:** name, short name, timezone, address, logo, sending window (two time selects), delay after visit
  (select: right away, 1 hour, 2 hours, 4 hours, next morning), reminders on/off, alert threshold (select 1 to 5,
  default 3 "Alert me for 3 stars or fewer"), alert emails (chips input), report email (Agency).
- **Google:** mode card. Link mode: review link input and "Test link" (opens it). Connected: the Google account,
  the chosen Google location, last sync, "Change location", "Disconnect". Reconnect state: coral pill and the
  Reconnect button.
- **Texting:** status card with the pill and the number once bought (tabular). Not set up: the sender form in
  sections (Business: legal name, website, EIN if required [verify]; Address; Contact person; How customers agree
  to texts: radio "At booking or check-in (they give their number to get a text after the visit)" or "On the Halo
  join page or QR code"; Expected volume select). A PhonePreview shows the sample message that goes to the
  carrier review. Primary "Submit for approval". Pending: a 4 step progress (Account, Number, Submitted, Approved)
  with the live dot on the current step and "Usually 5 to 15 business days". Rejected: the reason in danger ink and
  "Edit and resubmit".
- **Messages:** two cards, SMS and Email, each with Initial and Reminder tabs, a textarea with placeholder chips
  (\`{first_name}\`, \`{business}\`, \`{link}\` insert at the cursor), PhonePreview or email preview, live
  validation messages under the field (segment count, missing \`{link}\`, incentive words), and "Reset to default".
- **Intake:** keys table (label, prefix \`hk_live_ab12cd34\`, last used, created by, Revoke), "Create key" opens a
  dialog that shows the full key once with Copy and the warning "You will not see this key again". Below: the
  webhook URL with Copy, a JSON example, and the Zapier steps (numbered, with screenshots slots).
- **Tone:** voice notes textarea, sign-off input, words to avoid (chips), sample replies (up to 5, each 600 chars
  max with a live count), "Suggest from my past replies" (Connected only), and a preview: pick a sample review
  (5 star, 3 star, 1 star) and "Draft a sample reply" (counts as 1 draft).

### 7.9 Billing (\`/app/billing\`, owner only)
Current plan card (name, price, interval, renewal or trial end date), three UsageMeters (requests, AI drafts,
locations) and seats count, "Manage billing" (Stripe Customer Portal), and the plan table with the monthly/yearly
toggle. Trial banner: "Trial: 5 days left. 50 requests and 10 drafts included in the trial."

### 7.10 Settings (\`/app/settings\`)
Tabs: Profile (name, email, password), Workspace (name, kind, delete workspace in a danger zone with typed
confirmation), Team (members table with role select, invite dialog with the seat count in the button "Send invite
(3 of 5 seats)"), Notifications (feedback alerts, low review alerts, daily digest, weekly report toggles).

### 7.11 Documentation and Help
Documentation: left list of articles inside the content area (not the sidebar): Getting visits into Halo, CSV
format, Zapier recipe, Booking tool webhooks, Texting approval, Google review policy and Halo, Replying to reviews,
FAQ. Article body 14/20, 65 characters wide. Help: contact form (subject, message, optional screenshot), and links.

### 7.12 Paywall (\`/paywall\`)
Centred card: "Your trial has ended" or "Your subscription is paused", what still works ("Your data is kept for 30
days. Scheduled requests are paused."), the plan table, primary "Choose a plan".

## 8. The rating page (\`/r/[token]\`)

The page customers see. It must load fast on a cheap phone on 4G (under 1.5 s to content; no client analytics, no
web fonts other than Geist subset, server-rendered shell, data from \`hl-public\`).

**Layout (375px wide reference, 16px side padding, max content width 440px centred on larger screens):**
1. Business logo (48px, 6px radius, hairline) or the business initial in a 48px hairline circle. Business name
   under it (16px, 500).
2. Heading: "How was your visit to {business}?" (24/32, balance).
3. StarPicker with the reserved label line.
4. Thank-you line, 24px min-height reserved (16/24 body ink). Empty until a star is picked, then: 5 or 4 stars:
   "Thank you. We would love it if you shared that on Google."; 3, 2 or 1 star: "Thank you for telling us. We are
   sorry it was not right." No rating yet: empty.
5. **GoogleButton** "Post a review on Google". Always present, always here, always the same (R1).
6. Private note section: a text button "Tell the team privately" that expands a textarea (16px, 4 rows) with the
   helper "Only {business} sees this." and a "Send to the team" button (secondary, full width). For 1 to 3 stars it
   is expanded by default; for 4 and 5 it is collapsed but the text button stays visible in the same place. The
   textarea's space below the Google button is the same in both cases, so the Google button never moves.
7. Footer (13px faint): "{business} uses Halo to collect feedback." and, for SMS customers, "Reply STOP to the text
   to opt out." Agency plan: footer reads "{business}" only.

**States:**
- **Loading:** skeleton for the logo, heading line and stars (same sizes). Google button area reserved.
- **After a star:** the stars fill, the label appears in its reserved line, the thank-you line fades in (200ms).
  Nothing else moves.
- **After Google tap:** the button keeps its label, opens Google's review form in a new tab, and the line under it
  (reserved 18px) reads "Opened Google in a new tab."
- **After a private note:** the note area is replaced, in the same height, by "Sent. The team will read it today."
  with a success check. The Google button stays exactly where it was.
- **Link expired or unknown:** "This link has expired." and, if the business is known from a recent cookie, nothing
  else (no data is ever shown for an unknown token).
- **Business has no review link yet:** the Google button is replaced by a hairline box of the same height: "Thanks,
  your rating was sent to {business}." (This only happens in test sends before a link is added; real sends require
  a review link.)
- **Pre-selected rating from email (\`?r=4\`):** the star is filled on load and \`rate\` is called; the page is
  otherwise identical. \`?go=google\` opens Google straight away after recording the click.

**Not allowed on this page (R1 to R8):** any rating-based change to the Google button's presence, size, position,
label, colour or order; moving the Google button below the private note; wording such as "Only happy customers";
any discount, gift or prize; asking the customer not to post publicly.

## 9. Join and unsubscribe pages

- **\`/join/[slug]\`:** the business logo and name, "Get a text after your visit", first name, mobile, a checkbox
  (unchecked) "Text me once after each visit to ask how it went. Reply STOP to opt out. Msg and data rates may apply.",
  "Join". This page is also the opt-in proof URL for Twilio toll-free verification. Printable QR card: an A6 PDF
  with the QR, the business name and "Scan to get a quick text after your visit".
- **\`/u/[token]\`:** "You will not get more emails from {business} through Halo." One button "Undo" for 24 hours.

## 10. States (every screen)

| Screen | Empty | Loading | Error |
|---|---|---|---|
| Dashboard | SetupChecklist | KPI skeletons (96px), funnel skeleton bars, chart axis drawn with no line | "Could not load your numbers. Retrying in 10 seconds." with a Retry button |
| Requests | "No requests yet. Send one to yourself to see what customers get." + Send a request | 8 skeleton rows at 48px | Banner above the table, table keeps its header |
| Feedback | "No private feedback yet. When a customer writes to you, it lands here and in your inbox." | Skeleton rows | Banner |
| Reviews (Connected) | "No reviews yet for this location." | Skeleton rows | "Google did not answer. Halo will try again at the next sync." |
| Reviews (Link) | The paste drafter is the empty state | n/a | Inline under the drafter |
| Locations | Not possible after onboarding | Skeleton rows | Banner |
| Texting | Not set up form | Step progress | Rejection reason |
| CSV import | Drop zone | "Scheduling 640 of 1,184" with the live dot | Row errors listed with row numbers |

Spinners wait 200ms before showing and stay 400ms minimum. Toasts bottom left, 4 seconds, no full stop:
"Request scheduled", "Reply posted to Google", "Feedback marked resolved", "Key revoked".

## 11. Motion (Halo moments, within the system curves)

| Moment | Spec |
|---|---|
| Star pick (rating page) | Fill colour 120ms, no scale bounce; label fades in 160ms |
| Thank-you line | Fade up 4px, 200ms, out-curve |
| Private note expand | Height 300ms morph curve, content fades 4px after 60ms; the Google button above does not move |
| Funnel bars | Width 400ms morph curve on first load and on filter change |
| Rating trend line | Draws once per session (stroke-dashoffset 600ms); refetches update without redraw |
| Feedback count pill | Number changes in place (tabular), no pulse |
| New feedback row (Realtime) | Rises once 6px over 360ms; existing rows do not move until the user scrolls up to the top |
| Draft arriving | Text fades in 200ms inside the reserved textarea height |
| Live dot | 1.4s pulse: Sending, Drafting reply, Syncing, Scheduling, Texting pending. Nothing else loops |

Reduced motion: every item above shows its end state instantly.

## 12. Accessibility

- StarPicker is a radiogroup with labels "1 star, Poor" to "5 stars, Excellent". Contrast of \`--star\` on white is
  decorative; the selected state is also conveyed by the label line and aria-checked.
- GoogleButton has visible text (no icon-only), opens in a new tab with \`aria-describedby\` "Opens Google in a new tab".
- All tables have real headers; side panels are dialogs with focus trap and Escape to close; toasts are polite live
  regions; the feedback count pill has an aria-label "4 new feedback".
- Every form error is linked to its input with \`aria-describedby\`.

## 13. Mobile

- The app works on a phone for the two jobs owners do there: read feedback and approve replies. Under 768px the
  sidebar becomes a bottom bar with Dashboard, Feedback, Reviews, More (sheet with the rest, bottom group order kept).
  Tables collapse to stacked rows (48px min) and side panels become full-screen sheets.
- The rating page is mobile-first (section 8). Check at 320, 375 and 430px: no horizontal scroll, Google button and
  stars visible without scrolling on 375 x 667.

## 14. Emails (React Email)

White, 560px, Geist with system fallbacks, hairline dividers, one primary link styled as a white button with a 1px
ink border. Review request emails carry the **business's** name and logo, 5 linked stars (each a 40px tap target)
and a separate "Post a review on Google" button of the same weight under the stars, then the unsubscribe line.
Owner emails carry the Halo wordmark. No tracking pixels in customer emails (opens are measured by link clicks).

## 15. Component states

| Component | States |
|---|---|
| GoogleButton | rest, hover (\`--hover\` fill), pressed (98%), focus ring, after-click line. Never disabled, never hidden |
| StarPicker | none selected, hover preview, selected 1 to 5, disabled (after feedback sent, stays filled) |
| DraftCard | generating, ready, ready with failed checks, needs attention, posting (spinner over label), posted (success line "Posted 2 minutes ago"), failed (danger line + Retry), review changed (warning line + new text) |
| PhonePreview | ok, near limit (150+ chars in warning ink), over limit (danger ink + "2 segments: shorten the text") |
| Texting card | not set up, creating, pending, approved, rejected |
| UsageMeter | normal, under 20% left (amber), under 5% (coral), at limit (coral + "Limit reached" + Upgrade) |

## 16. Microcopy

| Place | Copy |
|---|---|
| Send dialog consent checkbox | "This customer agreed to receive a text from us" |
| Skip reason: asked_recently | "Asked in the last 90 days, so Halo did not ask again" |
| Skip reason: no_channel | "No mobile with text consent and no email" |
| Skip reason: opted_out | "Opted out of texts from this business" |
| Skip reason: limit_reached | "Your plan's 250 requests this month are used. Upgrade to send more." |
| Skip reason: stale_visit | "Visit was more than 7 days ago" |
| Template incentive error | "Templates cannot offer anything in exchange for a review. Google and the FTC do not allow it." |
| Template segment error | "This text is 2 SMS segments. Keep it to 160 characters so it sends as one." |
| Google link help | "In your Google Business Profile, click Ask for reviews, then Copy link." |
| Rejection | "Twilio did not approve the number: {reason}. Fix the details and resubmit." |
| Policy note (Locations > Messages) | "Halo asks every customer the same way and shows everyone the Google button. That keeps you inside Google's review rules." |
| Reply posted toast | "Reply posted to Google" |
| Draft check failed | "Check this draft: it mentions a phone number" |
| Paste drafter button | "Draft reply (1 of 40 this month)" |

Never write: "filter out bad reviews", "stop negative reviews", "only send happy customers to Google", "protect your
rating from unhappy customers". Write instead: "hear from unhappy customers first", "fix problems while you still
can", "reply to every review".

## 17. Charts and numbers

- One chart library (Recharts). Lines 1.5px, no area fills, no gradients, no 3D, no pie charts.
- Axis labels 12px faint, gridlines \`--divider\`, no chart borders. Tooltips are floating cards (shadow-float, 6px)
  in a portal, with the date in faint ink and the values in tabular ink.
- Multi-location lines use the tag hue inks in a fixed order by location creation date, so a location keeps its
  colour across pages. A legend row sits above the chart (13px, 8px dots), never inside it.
- Percentages: one decimal under 10% ("4.6%"), whole numbers above ("38%"). Ratings always two decimals ("4.72").
- Every metric shown has the same definition as PRD.md section 18; the estimate tile carries the footnote
  "Matched by name, so this is an estimate." in 12px faint ink.

## 18. Owner emails (layouts)

| Email | Layout |
|---|---|
| Feedback alert | StarRow as text stars, the note in a hairline box (14/20), customer name, phone and email as plain links, "Open in Halo" button, the line about not discouraging public reviews in faint ink |
| Low review alert | The review (stars, reviewer, text), "Your draft reply is ready" with the first 200 characters of the draft, "Review and post" button |
| Daily digest | Two short lists (max 5 each): New feedback, Reviews waiting for a reply, then "Open Halo". Not sent on days with nothing new |
| Weekly report (Agency) | Client business name and logo, 4 numbers in a 2 x 2 grid (requests sent, clicked to Google, new reviews, average rating with the change), a 7 day sparkline as a static PNG rendered server-side, no Halo branding |
| Texting approved | "Your number {number} is approved. Texts start with your next request." and "Send a test text" |

## 19. Layout grid per breakpoint

| Width | Sidebar | Content padding | Dashboard grid |
|---|---|---|---|
| 1440+ | 240px | 32px | 4 KPI columns, funnel 2/3 + feedback 1/3 |
| 1100 to 1439 | 240px | 24px | Same, tighter gaps (16px) |
| 768 to 1099 | 56px icons | 20px | 2 KPI columns, funnel full width, feedback under it |
| under 768 | bottom bar | 16px | 1 column, KPI tiles in a 2 x 2 grid at 96px height |

## 20. Hand-off checklist for Claude Code

1. Tokens from section 2 in \`app/globals.css\`; no raw hex anywhere else (lint rule).
2. shadcn/ui themed to DESIGN_SYSTEM.md: white buttons, firm-edged primary, 6px radius, 36px controls.
3. Sidebar items and order exactly as section 6.
4. GoogleButton is one component with no props that change size, colour, position or label.
5. Every count uses tabular-nums; every pill column and count button has a fixed min-width.
6. Rating page passes the 320/375/430 checks and the A2 to A4 acceptance tests in PRD.md.
7. Reduced motion respected everywhere.
`
