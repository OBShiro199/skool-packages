// Quotient design PRD (DESIGN.md). Builds on Quiet Precision (DESIGN_SYSTEM.md).

export const designPrd = `# Quotient: design PRD

Save this file as \`DESIGN.md\` in the project root. It builds on **DESIGN_SYSTEM.md** (Quiet Precision), the base
design system for every screen. Save that file next to it as \`DESIGN_SYSTEM.md\`, and put this line in \`CLAUDE.md\`:

\`\`\`md
UI rules: @DESIGN_SYSTEM.md @DESIGN.md
\`\`\`

DESIGN_SYSTEM.md decides the neutrals, type, radii, sizes, motion, components and stability rules. This file only
adds what is different for Quotient: the brand accent, the product-specific screens and the components those screens
need. Where the two disagree, this file wins only for the accent and the Quotient screens. Every stability, motion and
component rule in DESIGN_SYSTEM.md still applies: white surfaces, 1px hairlines, 6px boxes, 4px pills, 13px app text,
white buttons with a firm edge, no filled or black buttons, nothing moves under the cursor.

## 1. Brand

- **Name:** Quotient. In maths, the quotient is the answer you get when you divide: a clear number from a few
  inputs. That is the product: four answers in, one honest price out.
- **Tagline:** Instant quotes that book the job.
- **Personality:** a reliable office manager for a small trades business. Plain, quick, never pushy. Talks like a
  tradesperson, not a software company ("Price", "Job", "Survey", not "Estimate object" or "Pipeline").
- **Three surfaces, three jobs:**
  1. **The app** (owner side): Quiet Precision as written. Dense, calm, light only.
  2. **The widget** (customer side, inside an iframe on the business's site): Quiet Precision shapes and type, but
     the accent is the business's \`brand_hex\`, so the customer sees the business, not Quotient. Large touch
     targets, one question per step on phones.
  3. **Customer pages** (\`/q\`, \`/l\`, \`/b\`, \`/o\`): the same as the widget, full page, with the business's logo.

## 2. Brand accent: level teal

Quotient swaps the system's pastel blue for a pastel teal, the colour of the bubble in a spirit level: the thing
every tradesperson trusts to say "this is right". Same three-part shape: a mid accent, a soft fill and an edge. It
marks "selected" and "in progress" only, exactly where the system uses blue.

| Token | Hex | Replaces | Use |
|---|---|---|---|
| \`--accent\` | #3fa6a0 | \`--blue\` | Selected nav icon (duotone), progress bars, live dot, meter fill, selected chip text |
| \`--accent-soft\` | #eef8f7 | \`--blue-soft\` | Selected row, selected nav item, selected answer card, selected slot |
| \`--accent-edge\` | #bfe3e0 | \`--blue-edge\` | Selected borders, focus ring of selected cards, the drop target line in the builder |
| \`--accent-ink\` | #23756f | (new) | Accent text on white (passes 4.5:1); links in customer pages |

Why teal, not green: the system's success colour is green (#27a644) and "Won" uses it. Teal keeps "selected" and
"won" apart at a glance, while still reading as fresh and outdoor for gardeners, cleaners and window cleaners.

Everything else is the system palette unchanged: white surfaces, \`--hairline\` #e6e6e9, \`--divider\` #efeff1,
\`--btn-edge\` #dcdde0, ink #08090a, body #3c4149, muted #62666d, faint #6f747c, ghost #b4b8bf, success #27a644,
warning #d18b0f, danger #eb5757.

\`\`\`css
:root {
  /* Quotient accent (replaces the system blue) */
  --accent: #3fa6a0; --accent-soft: #eef8f7; --accent-edge: #bfe3e0; --accent-ink: #23756f;
  /* keep the system names pointing at the accent so shared components need no changes */
  --blue: var(--accent); --blue-soft: var(--accent-soft); --blue-edge: var(--accent-edge);
}
\`\`\`

### 2.1 Lead status tag hues

Status maps to fixed tag hues (pastel fill at 6 to 9% opacity, darker edge, readable ink, 4px pill, 13px text).

| Status | Hue | Fill | Edge | Ink |
|---|---|---|---|---|
| New | Amber | #fdf6e7 | #f0d9a8 | #8f5d05 |
| Quoted | Teal | #eef8f7 | #bfe3e0 | #23756f |
| Booked | Blue | #f1f5fd | #c4d4f5 | #3a5fb8 |
| Won | Green | #eef8f1 | #bfe3c9 | #1d7a35 |
| Lost | Grey | #f5f5f6 | #dcdde0 | #62666d |

Other fixed tags: **Survey suggested** (coral fill #fdf0f0, edge #f6c9c9, ink #b33a3a, with a Lucide ScanSearch
14px icon), **Held** booking (amber), **Deposit paid** (green with a Lucide BadgeCheck icon), **Out of area** (grey).
Free labels (lead source, calculator name) hash to the first seven of the eight system tag hues.

### 2.2 The business's accent in the widget and customer pages

\`workspaces.brand_hex\` is one colour the owner picks. \`lib/brand.ts\` exports \`brandToCssVars(hex)\` used by the
widget, the customer pages and the brand preview in Settings:
- \`--accent\` = the colour as chosen (progress line, selected answer edge, slot selection).
- \`--accent-soft\` = the colour at 7% over white. \`--accent-edge\` = the colour at 35% over white.
- \`--accent-ink\` = the colour darkened in 5% lightness steps until it reaches 4.5:1 on white (used for text).
- Buttons stay white with a firm edge even in the widget. The primary button gets a 1px \`--accent-ink\` edge and
  \`--accent-ink\` label instead of a fill. This is the one place the system allows an accent-coloured edge.

## 3. Type in Quotient

Geist 400, 500, 600 as in the system. App UI text is 13/18 everywhere. Quotient adds three roles, all inside the
system's size scale:

| Role | Size / line height | Weight | Where |
|---|---|---|---|
| Widget question | 20 / 26 (system H3) | 500 | One question per step on phones |
| Widget body and answers | 16 / 24 | 400 | Answer cards, inputs (16px stops iOS zooming on focus) |
| Price range | 32 / 40, tabular-nums | 500 | The result card ("$180 to $230") |
| Lead panel price | 24 / 32, tabular-nums | 500 | Lead panel header |

Money always uses tabular figures and the business currency via \`Intl.NumberFormat\`. Ranges use "to" in the
widget and pages ("£180 to £230") and a hyphen only inside SMS. Never show pence or cents in a range.

## 4. Components (Quotient-specific)

Build every component from DESIGN_SYSTEM.md section 07. Quotient adds:

- **StatusPill:** hues in 2.1. Width fixed to the longest label ("Quoted") so a status change never resizes the
  column. Clicking it in the inbox opens a menu (portal, 160ms pop) with the five statuses; Won and Lost open the
  small inline form described in 7.4.
- **PriceRange:** the two numbers with "to" between them, 32/40 tabular. Below it a 13px muted line: "Final price
  confirmed on the day" (or the survey label). While a new price loads, the old numbers stay and fade to 60% (no
  spinner, no width change). Reserve the width of the longest plausible value ("$12,500 to $14,000").
- **AnswerCard:** a 6px white box with a hairline, 56px tall in the widget, label left, optional muted hint right.
  Selected: \`--accent-soft\` fill and \`--accent-edge\` border (no size change, no bold). Number answers use a
  stepper: white minus and plus buttons (44px square in the widget) around a tabular value with a fixed width.
- **StepProgress (widget):** a 2px line at the top of the card, accent fill easing with the morph curve over 300ms.
  Step count "2 of 5" in faint 13px text, fixed width.
- **PhotoTile:** 96px square thumbnails, 6px radius, hairline. Uploading: the thumbnail shows at 50% with a thin
  accent progress bar along the bottom edge. Failed: danger edge and "Retry" text button below (space reserved).
  Remove: an icon button (Lucide X 14px, labelled "Remove photo") visible on hover and always on touch.
- **AiNote:** a hairline box with a 13px header row "Photo check" and a status: live dot "Checking photos" while
  queued or running (the only loop), "Survey suggested" coral tag or "Looks as described" green tag when done,
  "Skipped: limit reached" grey. Body: Claude's summary, then flags as a list (icon by kind), then mismatches as a
  two-column mini table (Customer said / Photos suggest), then "Questions to ask". A footer line in faint text:
  "Checked by AI from the photos. It never changes your price." Min-height reserved for 3 lines while loading.
- **SlotPicker:** a 7-day strip of day buttons (Mon 3, Tue 4...) 56px wide, then a grid of time buttons 40px tall,
  4 per row on phones. Unavailable days are ghost text, still in place. Selected time: accent soft fill + edge. The
  "Next week" button keeps its position whatever the number of slots. Loading: skeleton blocks in exactly the grid
  size.
- **UsageMeter:** the system meter. Accent fill, amber under 20% left, coral under 5%. Label "84 of 120 quotes" in
  tabular figures, fixed width for four-digit counts.
- **SegmentCounter:** under every SMS template textarea: "142 / 160 · 1 segment · 1 credit" (UK: "5 credits"),
  turning warning ink above 1 segment. Shows "Uses special characters (70 per segment)" when not GSM-7.
- **RuleRow (builder):** one row per pricing rule: kind chip (fixed 96px wide), question select, value input with
  currency prefix, label input, and a drag handle shown with \`visibility\` on hover. 48px tall like table rows.
- **ZoneRow:** label input, prefixes as removable 4px chips in a wrapping cell, adjustment select (Surcharge,
  Multiplier, Not covered), value. "Not covered" rows get a grey Out of area tag.
- **SnippetBox:** a hairline box with the code in Geist 13px (no monospace, per the system), a "Copy snippet" button
  that changes its label to "Copied" for 2 s without changing width (min-width set for the longer label).
- **EmptyState:** a single-line illustration (1.5px stroke, accent and ink only: a clipboard with a tick and a
  small spirit level), one sentence, one button.

## 5. Icons

- Navigation (Phosphor, 17px, regular at rest, duotone in the accent when selected): Leads = Tray, Calendar =
  CalendarBlank, Calculators = Calculator, Messages = ChatCircleText, Analytics = ChartLineUp, Documentation =
  BookOpen, Help = Lifebuoy, Billing = CreditCard, Settings = GearSix.
- In-content (Lucide, 14 to 16px, 1.5 stroke): Camera (photos), ScanSearch (AI note), MapPin (postcode),
  MessageSquare (SMS), Mail (email), BadgeCheck (deposit), Clock (held), Link (share), QrCode, Copy, ExternalLink.
- Never mix families in one row.

## 6. App shell

- Left sidebar 240px (56px icons-only under 1100px), white with a right hairline. No top bar, no page titles: the
  48px page toolbar carries search, counts and actions.
- **Top of sidebar:** logo (24px mark + "Quotient" 14/20 500). On Agency, a business switcher directly under it: a
  32px button with the business logo (16px), name (ellipsis) and a CaretUpDown icon; it opens a menu (portal) with
  the businesses, a search field when there are more than 5, and "+ Add business" (dashed, as an add affordance).
- **Top group (32px items):** Leads (with a count of New leads, tabular, fixed width, faint), Calendar, Calculators,
  Messages, Analytics.
- **Spacer, then usage:** a mini UsageMeter "Quotes 84 / 120" above the bottom group, linking to Billing.
- **Bottom group, always this order:** Documentation, Help, Billing (owners only; hidden, not disabled, for
  others), Settings.
- **Footer row:** avatar 24px, name, a menu with Profile and Log out.
- Selected item: \`--accent-soft\` fill, ink text, duotone accent icon. Hover: \`--hover\` fill. No nesting.

## 7. Screens

All app screens: toolbar 48px, content scrolls, tables with 36px header and 48px rows, side panels overlay from the
right (200ms, 24px slide) and never reflow the page.

### 7.1 Auth (\`/login\`, \`/signup\`, \`/reset\`)
- A centred 400px card on white with the logo above it. Fields 36px: Full name (signup), Email, Password. Primary:
  "Create account" / "Log in" (white, firm edge). Below: "Start your 7 day free trial. No card needed to try the
  builder." (signup only). Errors in danger ink under the field, \`role=alert\`.
- Right side on desktop (over 1100px): a static product still of the widget on a phone with a price range, inside
  a hairline frame. Hidden under 1100px.

### 7.2 Onboarding (\`/onboarding\`)
One 560px card that morphs height between 5 steps (width never changes, step label "Step 2 of 5" fixed width):
1. **Your business:** name, web address slug (live check, "quotient.app/q/sparkle"), country (US, Canada, UK,
   Other), currency (prefilled from country), timezone (prefilled from the browser), logo upload (optional).
2. **What do you do?** Six AnswerCards with Lucide icons: Cleaning, Window cleaning, Gardening and landscaping,
   Painting and decorating, Removals, Something else (blank).
3. **Check your prices:** the template's main rates in a compact form (e.g. "Per bedroom £18", "Minimum charge
   £60") with a live PriceRange preview on the right for a sample job. "You can change everything later."
4. **When can customers book?** Working days as day chips, start and end time selects, "What can they book?"
   AnswerCards: A free survey, The job, Both, Nothing yet (just collect quotes).
5. **Go live:** the SnippetBox, the hosted link with Copy, a QR code (SVG, 160px) with "Download PNG", and three
   buttons: "Open my quote page", "Send me a test quote", "Go to my leads". A note: "Deposits and texting are in
   Settings when you are ready."

### 7.3 Leads inbox (\`/app/leads\`)
- Toolbar: search (name, email, phone, postcode), count "64 leads", "+ Add lead" (manual), "Export CSV".
- Filter bar (44px): status tabs as chips with counts (All, New, Quoted, Booked, Won, Lost), then chips for
  Calculator, Source, Survey suggested, Date; "+ Add filter" dashed.
- Columns (fixed widths, single line, ellipsis): Customer (name + muted postcode), Service, Price (range, tabular),
  Status (StatusPill), Photos (Camera icon + count, or em-space), AI (tag or blank), Next step ("Follow-up in 3h",
  "Survey Thu 10:00"), Source, Created (relative, tooltip exact).
- Rows rise once on first load (360ms, 25ms stagger, cap 270ms). New leads arriving by Realtime insert at the top
  with a 2s accent-soft row highlight that fades; the list never jumps while the user is scrolled down: a pill "1
  new lead" floats under the toolbar instead, and clicking it scrolls up.
- Selection checkboxes (2px radius) and a floating selection bar: "Mark lost", "Pause follow-ups", "Export", each
  with a minimum width for three-digit counts.
- Empty state: "No quotes yet. Put your calculator on your website and they will land here." Buttons: "Copy embed
  snippet", "Send me a test quote".

### 7.4 Lead panel (\`/app/leads/[id]\`, a 560px side panel over the inbox)
- Header: customer name (H3), StatusPill menu, PriceRange (24/32), service and calculator in muted text,
  contact row (phone and email as text buttons that copy, plus "Call" on phones), consent line ("Agreed to texts
  on 3 Nov, 21:14").
- Actions row: "Text", "Email", "Book a slot", "Mark won", "Mark lost". Mark won opens an inline row (no new
  dialog): "Final job value" currency input, prefilled with the high end, and "Save". Mark lost opens a reason
  select. Both morph in place.
- Tabs: **Overview** (answers as a two-column list, extras, postcode and zone, price breakdown lines with a total
  rule, photos grid of PhotoTiles opening a lightbox, AiNote), **Timeline** (events with icons and relative times,
  note composer at the bottom), **Messages** (SMS and emails sent, with delivery status tags), **Bookings**.
- Composer (Text/Email): a 520px dialog opening at 10% from the top; template picker, textarea, SegmentCounter,
  "Send text (1 credit)" / "Send email". Disabled with a reason line when there is no consent, an opt-out or no
  approved sender.

### 7.5 Calendar (\`/app/calendar\`)
- Toolbar: calendar select (Crew and Agency), week navigation, "Today", "Availability", "Add time off".
- Week grid: 7 columns, hours 06:00 to 21:00 (30 minute rows at 24px), availability shaded with \`--row-hover\`,
  bookings as 6px boxes with a left 2px bar in the status hue: survey (teal), job (blue), held (amber, dashed bar
  because it is temporary, with a countdown "Holds 22m" in tabular figures). Clicking opens a side panel with the
  lead summary, deposit state and actions: "Mark completed", "No-show", "Cancel booking".
- Availability dialog: one row per weekday with an on/off checkbox, start and end selects, and kinds (Survey, Job)
  as chips; plus survey length, job length, buffer, notice period and how far ahead. Calendar feed: "Copy calendar
  link" with a help line "Paste into Google Calendar > Other calendars > From URL".
- Phones: day view only, swipe between days.

### 7.6 Calculators list and builder (\`/app/calculators\`, \`/app/calculators/[id]\`)
- List table: Name, Trade, Status (Draft grey, Published teal, Archived grey), Version, Quotes this month, Booking
  rate, Updated. "+ New calculator" opens template cards in a dialog.
- Builder: two columns. Left 60%: tabs Questions, Pricing, Zones, Photos and AI, Booking, Share. Right 40%: a sticky
  phone-width preview (375px frame with a hairline) of the real widget using the draft, plus a "Breakdown" toggle
  that shows the price lines under the preview. A toolbar shows "Draft saved" (toast-free, a faint inline status
  with fixed width), "Preview as customer", and "Publish" (primary, firm edge). Publishing shows "Version 4
  published" as a toast.
- **Questions:** a list of question cards (type chip, label, options or min/max/step) with drag to reorder.
  "+ Add question" dashed. Types: Number, Choice, Yes or no.
- **Pricing:** service cards, each with base price and RuleRows; extras table; minimum charge; range (low %, high %,
  round to) with an example line: "A $200 job shows as $180 to $230."
- **Zones:** ZoneRows; "Everywhere else" row at the bottom with Served / Not served.
- **Photos and AI:** toggles for photos, required or optional, the prompt text; "When the photo check suggests a
  survey" AnswerCards: Just tell me, Offer a survey instead of the job, Ignore it; a confidence slider (0.5 to 0.9)
  shown only for the middle option; "Always survey jobs above" currency input.
- **Booking:** mode AnswerCards, calendar select, job deposit (None, Fixed, % of the low price) and survey deposit.
  If Stripe is not connected: an inline note with "Connect Stripe" (link to Settings > Payments).
- **Share:** SnippetBox (script), the iframe fallback snippet, hosted link, QR code, allowed websites (optional chip
  input of domains), and guides per builder (Wix, Squarespace, WordPress, Webflow) as links to Documentation.

### 7.7 Messages (\`/app/messages\`)
- Section 1, Follow-ups: an on/off switch, then up to 4 steps as rows: "After [2] [hours] send a [Text] using
  [Follow-up 1]". Quiet hours row. Booking reminder hours. Each step shows a muted note when it will fall back to
  email.
- Section 2, Templates: one card per template with a textarea, variable chips that insert at the cursor
  ({first}, {business}, {service}, {range}, {link}), SegmentCounter, and "Send me a test".
- Section 3, Texting sender: status card (Draft, In review with live dot "Carrier review, usually a few days",
  Approved green, Rejected coral with the reason and "Fix and resubmit"). Number or sender name shown in tabular
  text.
- Section 4, Sent log: table of the last 200 messages (time, customer, channel, template, status tag, credits).

### 7.8 Analytics (\`/app/analytics\`)
- Toolbar: period chips (7, 30, 90 days), calculator select, business switcher on Agency.
- Four stat tiles (fixed height): Quote-to-booking rate ("28%" with "18 of 64" under it), Average job value,
  Leads, Median time to book. Numbers count up once per session (300ms), tabular.
- A line chart of leads and bookings per day (two series: ink for leads, accent for bookings; hairline grid, no
  fill). A table of Lead sources: Source, Leads, Booked, Booking rate, Won value. A funnel row per calculator:
  Priced, With photos, Booked, Won as four bars with counts.
- Empty: "Analytics fill in after your first 10 quotes."

### 7.9 Billing (\`/app/billing\`, owner only)
- Plan card: plan name, price, renewal date, "Change plan" and "Manage billing" (Stripe portal). Three UsageMeters:
  Quotes, SMS credits, AI photo checks, with "Resets on 1 Dec". A plan comparison table (Solo, Crew, Agency) with
  the current plan column on \`--accent-soft\`.
- Trial: a hairline banner "Trial: 4 days left. 12 of 25 trial quotes used." with "Choose a plan".

### 7.10 Settings (\`/app/settings\`)
Tabs: **Business** (name, slug, logo, brand colour picker with 8 swatches + hex input and a live mini widget
preview, contact email and phone, "Show Quotes by Quotient badge" switch, locked on Solo with a plan note),
**Team** (members table with role selects, invite dialog), **Payments** (Stripe card: Not connected / Finishing
setup / Connected with the account name, "Connect Stripe", "Open Stripe dashboard", "Disconnect"), **Texting**
(country, legal name, registration number, website, sender name for UK, "Start texting setup", then the status
card from 7.7), **Notifications** (per member: new lead email, text me new leads with phone input, survey
suggestions, bookings, daily digest), **Businesses** (Agency only: list with Add, rename, open).

### 7.11 Documentation and Help (\`/app/docs\`, \`/app/help\`)
- Docs: a 240px article list on the left inside the content area (not a second sidebar: a simple list), article on
  the right at 65 characters wide. Articles: Put the widget on Wix, Squarespace, WordPress, Webflow, any site;
  How pricing rules work; Postcode zones; Photo checks and what the AI can and cannot do; Deposits; Texting rules by
  country; Follow-ups; Analytics definitions.
- Help: a contact form (subject, message, "Include my last 5 leads' ids" checkbox off by default) and links.

### 7.12 Paywall (\`/paywall\`)
- One card: "Your quote widget is paused." "Customers see your phone number instead of prices until you choose a
  plan." Three plan cards and "Manage billing". Leads stay readable from the "View my leads" link (read-only).

## 8. The widget (\`/embed/[calcId]\`) and hosted page (\`/q/...\`)

- Max width 560px, white card, hairline, 6px radius, 24px padding (16px under 400px). Business logo 32px high and
  name at the top; StepProgress under it.
- **Steps on phones:** one question per step (AnswerCards or a stepper), "Back" (text button, left) and "Next"
  (primary, right, 46px large). Desktop over 640px: all questions on one step in a two-column grid.
- **Price step:** PriceRange, the service name, a muted line ("Includes all rooms, kitchen and bathrooms"), extras
  as checkable rows that update the range live, and the survey label when \`survey_only\`. If
  \`show_price_before_contact\` is false, the contact step comes first with "See my price".
- **Contact step:** name, email, mobile (with country flag select defaulting to the business country), postcode if
  not asked yet, notes (optional, 3 rows), the SMS consent checkbox with the business's exact consent text (never
  pre-ticked), and "Get my quote". Small print: "We'll email you a copy. {business} will only use your details for
  this quote."
- **After submit:** "Your quote is on its way" with the range, then two cards: "Add photos (optional)" with the
  photo prompt and an "Add photos" button (camera on phones), and "Book a time" with the SlotPicker. When photos
  were added and the check is \`require\`, a live dot "Checking your photos" shows for up to 30 s before the
  booking options appear; after 30 s the options show anyway.
- **Deposit:** "Pay deposit and book (£40)" opens Stripe Checkout in the top window (\`target=_top\` link, never
  inside the iframe). Back from Stripe: "Booked. See you Thursday 6 Nov at 10:00." with "Add to calendar" (.ics).
- **Out of area:** "We don't usually cover {postcode}. Leave your details and {business} will let you know." The
  lead is still submitted.
- **Paused or over the cap:** "Thanks. {business} will send your price shortly." Never an error.
- Badge: a 13px faint "Quotes by Quotient" link at the bottom (when \`show_badge\`).
- The iframe posts its height after every step change; height changes animate inside the card with the morph
  curve while the iframe resizes in one step (so the parent page never shows an inner scrollbar).

## 9. Customer pages

- \`/l/[token]\`: the business header, "Your quote" with PriceRange and answers, status line ("Booked for Thu 6 Nov,
  10:00" or "Not booked yet"), Add photos card, Book card. Closed leads: "This quote is closed. Call {phone} for a
  new one."
- \`/b/[token]\`: booking summary, "Change time" (SlotPicker in the same card, morphing), "Cancel booking" (a confirm
  that morphs the card, not a second dialog). Within the notice period: "Call {phone} to change this booking."
- \`/o/[token]\`: "You won't get any more texts from {business}." One line, no buttons.

## 10. States

| State | Rule |
|---|---|
| Loading tables | Skeleton rows at 48px for the first load only; refetches keep the old rows |
| Loading buttons | Label stays, spinner overlays after 200ms, minimum 400ms, width fixed |
| Saving builder | Inline "Saving" then "Draft saved" in a fixed-width slot; errors become "Not saved. Retrying" in danger ink |
| Realtime | New rows highlight once; counts update in place with tabular figures |
| Errors | Inline under the field or as a hairline banner at the top of the content area: what happened, what to do |
| Offline (widget) | "No connection. Your answers are saved. Try again." Answers live in sessionStorage per calculator |
| Empty | EmptyState with one action, never a blank table |

## 11. Motion (Quotient moments, within the system curves)

| Moment | Duration | Movement |
|---|---|---|
| Widget step change | 300ms morph | Card height animates; new step fades up 4px after 60ms; width fixed |
| Price update | 160ms | Old numbers fade to 60%, new numbers fade in; no counting animation |
| Lead panel | 200ms | Slides 24px from the right over the inbox |
| New lead row | 2s | Accent-soft background fades out once |
| Photo upload progress | 300 to 500ms | Bar width eases with the morph curve |
| Checking photos | 1.4s loop | The live dot pulses; nothing else moves |
| Stat tiles | 300ms | Count up once per session |

Reduced motion: every one of these shows the end state instantly.

## 12. Accessibility

- Widget: every step is a \`fieldset\` with a \`legend\` (the question). AnswerCards are radio or checkbox inputs with
  visible labels. Steppers are \`role=spinbutton\` with \`aria-valuenow\`. The price result is announced in a polite
  live region ("Your price is £180 to £230").
- Focus is moved to the step heading on each step change. Escape never closes the widget (it is not an overlay).
- Touch targets at least 44px in the widget and customer pages.
- The SlotPicker is a grid of buttons with full labels ("Thursday 6 November, 10:00").
- Colour is never the only signal: status pills have text, the AI note has a text status, meters have numbers.

## 13. Mobile

- The app: under 1100px the sidebar collapses to icons; under 760px the lead panel becomes full screen and the
  inbox shows Customer, Price and Status only. Calendar shows a day view.
- The widget and customer pages are designed phone-first at 375px and checked at 320, 375 and 430px.
- The photo button opens the camera on phones (\`accept="image/*"\` with \`capture\` omitted so the gallery is allowed).

## 13.1 Component states

| Component | Rest | Hover / focus | Active / selected | Disabled | Loading | Error |
|---|---|---|---|---|---|---|
| Button (primary) | White, 1px ink edge, ink label | \`--hover\` fill, 2px focus outline | Presses to 98% | Ghost label, \`--btn-edge\` | Spinner over label after 200ms | n/a |
| AnswerCard | White, hairline | \`--row-hover\` | \`--accent-soft\` fill, \`--accent-edge\` | Ghost text, no hover | n/a | Danger edge + message below |
| Stepper | Value centred, fixed width | Buttons get \`--hover\` | n/a | Minus disabled at min, plus at max | n/a | Clamped value + "Max 8" note |
| PriceRange | Numbers in ink | n/a | n/a | "Price on request" in muted | Old numbers at 60% | "We couldn't work out a price. Leave your details." |
| PhotoTile | Thumbnail, hairline | Remove button visible | Lightbox opens | n/a | 50% + progress bar | Danger edge + Retry |
| SlotPicker time | White, hairline | \`--hover\` | \`--accent-soft\` + edge | Ghost text, no border | Skeleton block | "That time was just taken" above the grid |
| StatusPill | Hue fill | Menu caret visible | Menu open | Read-only for viewers | n/a | n/a |
| RuleRow | 48px row | Drag handle visible | Drop line in \`--accent-edge\` | n/a | n/a | Danger edge on the bad field |
| UsageMeter | Accent fill | Tooltip with reset date | n/a | n/a | Skeleton bar | Amber under 20%, coral under 5% |
| SegmentCounter | Faint text | n/a | n/a | n/a | n/a | Warning ink above 1 segment |

## 13.2 Widget theming examples

Every business colour still reads as Quiet Precision because only the three accent parts change:

| Business colour | --accent | --accent-soft (7%) | --accent-edge (35%) | --accent-ink (4.5:1) |
|---|---|---|---|---|
| Teal default | #3fa6a0 | #eef8f7 | #bfe3e0 | #23756f |
| Bright yellow #f5c400 | #f5c400 | #fefaeb | #fbe8a6 | #7a6200 |
| Navy #1f3a68 | #1f3a68 | #eef1f5 | #b6bfcf | #1f3a68 |
| Red #d62828 | #d62828 | #fcefef | #f0b3b3 | #b42121 |

- Very light colours (yellow, pastel pink) use the darkened \`--accent-ink\` for every piece of text and the
  primary button edge; the bright colour appears only in fills and progress.
- Never tint the card background or the page. The widget is always a white card on whatever the site has.
- A "Transparent background" option removes only the outer card border and padding, for sites that already sit
  the widget inside their own box.

## 13.3 Builder layout details

- Builder tabs sit in the 48px toolbar row under the page toolbar (system tabs, 13px, accent underline 2px).
- The preview column is sticky at the top of the viewport and never scrolls with the form. Its phone frame is
  375 x 720 with an internal scroll. A "Desktop" toggle widens the frame to 560px.
- Validation errors in the config (a rule pointing at a deleted question, a zone with no prefixes) show as a
  danger count chip on the tab ("Pricing 2") and an inline message on the row. Publish is disabled with a reason
  line until the count is 0.
- Unsaved changes never block navigation: drafts save automatically. Publishing is the only step that affects
  customers, and the toolbar shows "Unpublished changes" in warning ink when the draft differs from the live
  version.

## 14. Emails (React Email)

- 560px white container, business logo on customer emails (Quotient logo on owner emails), Geist with system font
  fallback, 16/24 body, one primary button (white with a 1px ink edge, never filled), muted footer.
- Customer quote email: range large and tabular, answers table, "Book a time" button, "Add photos" text link.
- Owner new lead email: range, service, three answers, source, photo count, AI status, "Open lead".

## 15. Microcopy

| Place | Copy |
|---|---|
| Widget title default | Get your price in under a minute |
| Price label | Your price |
| Price footnote | Final price confirmed on the day. |
| Survey label | Estimate. We'll confirm after a quick survey. |
| Consent default | Text me my quote and reminders. Reply STOP to opt out. |
| Submit | Get my quote |
| After submit | Your quote is on its way |
| Photos card | Add photos so {business} can check the details |
| Checking | Checking your photos |
| Slot taken | That time was just taken. Pick another. |
| Deposit button | Pay deposit and book ({amount}) |
| Booked | Booked. See you {day} at {time}. |
| Out of area | We don't usually cover {postcode}. Leave your details and {business} will let you know. |
| Cap or paused | Thanks. {business} will send your price shortly. |
| AI footer | Checked by AI from the photos. It never changes your price. |
| Publish toast | Version {n} published |
| Copy snippet | Copy snippet / Copied |
| Limit banner | You've used {used} of {cap} quotes this month. New customers still get through, but without an instant price. |
| Sender in review | Carrier review in progress. Texts go by email until it is approved. |
| No consent | This customer did not agree to texts. Send an email instead. |
| Mark won | Final job value |
| Lost reasons | Too expensive, Went elsewhere, No reply, Not a fit, Other |

## 16. Hand-off checklist for Claude Code

- [ ] Tokens from DESIGN_SYSTEM.md section 11 plus the accent block in section 2, no raw hex in components.
- [ ] \`lib/brand.ts\` with \`brandToCssVars\`, used by the widget, customer pages and the Settings preview.
- [ ] Sidebar exactly as section 6 (Leads, Calendar, Calculators, Messages, Analytics; then Documentation, Help,
      Billing, Settings).
- [ ] StatusPill, PriceRange, AnswerCard, PhotoTile, AiNote, SlotPicker, SegmentCounter, RuleRow, ZoneRow built once
      in \`components/\` and reused.
- [ ] No filled or black buttons anywhere, including the widget.
- [ ] Every count and money value uses tabular figures and fixed widths.
- [ ] Widget checked at 320, 375 and 430px inside a real iframe on a plain HTML page.
- [ ] Reduced motion shows end states. Focus visible on every control.
`
