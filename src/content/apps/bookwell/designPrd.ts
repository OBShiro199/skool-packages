// Bookwell design PRD: builds on Quiet Precision (DESIGN_SYSTEM.md). Accent, components and every screen.

export const designPrd = `# Bookwell: design PRD

## 0. How to use this file
- **Base design system: \`DESIGN_SYSTEM.md\` (Quiet Precision).** Save it in your project root. Save this
  file next to it as \`DESIGN.md\`. CLAUDE.md has the line \`UI rules: @DESIGN_SYSTEM.md @DESIGN.md\`.
- Everything in DESIGN_SYSTEM.md applies unchanged: white surfaces split by 1px hairlines, the neutrals,
  Geist 400/500/600, 13px app text, the one size scale (12, 13, 14, 16, 20, 24, 32, 48), 6px boxes and 4px
  pills, white buttons with a firm edge (no filled or black buttons), the 48px page toolbar with no page
  titles, the two motion curves, and every stability rule in its section 08.
- This file adds only: **the Bookwell accent** (section 1), **the components Bookwell needs** (section 3),
  **every Bookwell screen** (sections 4 to 10), and **the marketing tokens LANDING.md refers to**
  (section 12). Where the two files disagree, this file wins only for the accent, those screens and the
  marketing route group. If a screen seems to need a new size, colour or shape, reuse one from
  DESIGN_SYSTEM.md instead.
- In Claude Code: "Use @DESIGN_SYSTEM.md and @DESIGN.md for every screen. Tokens first, then the app
  shell, then each page in the order of section 13."

## 1. Brand accent
Bookwell swaps the base pastel blue for a warm pastel amber, the colour of a shop sign at dusk. It has the
same single job as the base blue: it marks "selected" and "in progress". It is never a button fill and never
a background behind text.

| Token | Hex | Use |
|---|---|---|
| \`--accent\` | #c98a2b | Selected text and icons, live dots, progress bars, the selected slot's tick |
| \`--accent-soft\` | #fdf6ea | Selected fill: active nav item, selected service card, selected day, selected slot |
| \`--accent-edge\` | #efd6a8 | Selected border: selected card, selected slot, focused day strip item |

Add them to the starter tokens and point the base names at them so shared components pick them up:
\`\`\`css
:root {
  --accent: #c98a2b; --accent-soft: #fdf6ea; --accent-edge: #efd6a8;
  --blue: var(--accent); --blue-soft: var(--accent-soft); --blue-edge: var(--accent-edge);
}
\`\`\`
- Light only, as in the base. No dark mode in the app or on public pages.
- Meters keep the base rule: accent, then \`--warning\` under 20% left, \`--danger\` under 5% left.

### 1.1 Status tags (base tag hues, pastel fill 6 to 9%, darker edge, readable ink)
| Status | Hue | Label |
|---|---|---|
| pending | amber (accent) with a live dot | Awaiting payment |
| confirmed | blue | Confirmed |
| completed | green | Completed |
| no_show | coral | No-show |
| cancelled | grey | Cancelled |
| expired | grey | Expired |
| Deposit: paid | green | Paid $10 |
| Deposit: refunded | violet | Refunded |
| Deposit: refund failed | coral | Refund failed |
| Deposit: none | grey | No deposit |
| Connection: connected / ready | green | Connected |
| Connection: onboarding | amber | Finish setup |
| Connection: error | coral | Needs reconnecting |
| Connection: off | grey | Not connected |

### 1.2 Studio shop colour
A Studio shop can pick its own colour. It replaces the accent **only on that shop's public pages**
(\`/b/[handle]\`, done, manage). It goes through the same three roles: the picked hex is the accent, the
soft fill is the hex at 8% on white, and the edge is the hex at 32% on white. Computed on the server and
written as CSS variables on the page wrapper. If the picked colour has contrast under 3:1 against white,
use the edge colour for text and icons instead and keep the hex for the selected border only.
The shop colour never fills a button.

## 2. Brand feel
- **A tidy front desk.** The owner app is calm and quick to scan between clients. The public page is
  the shop's front desk: friendly, clear, and fast on a cheap Android phone with one bar of signal.
- Three words for every decision: **calm, local, certain.** "Certain" matters most: a customer must
  never wonder whether they are booked, and an owner must never wonder whether a slot is taken.
- Voice: short, warm, plain. "You're booked." "That slot was taken a moment ago." "Bookings are paused
  for this business." Sentence case everywhere.
- Illustrations: none in the app. The empty states use one Lucide icon at 16px and a sentence.

## 3. Components Bookwell adds
All built from base tokens: 36px controls (46px on public pages, section 4.1), 6px radius, 1px
hairlines, Geist, white buttons with a firm edge.

| Component | Spec |
|---|---|
| \`ServiceCard\` | Public page. Full-width box, 6px radius, hairline border, 16px padding. Line 1: service name 16px 500 ink. Line 2: "45 min · $35" in 13px muted, tabular numbers. Right side: "Deposit $10" pill (4px, accent soft fill, accent edge, ink text) or nothing when $0. Selected: accent-soft fill and accent-edge border. Min height 72px whether or not there is a description, so cards never jump |
| \`DayStrip\` | Public page. Horizontal scroll of 52 x 64px boxes: weekday (12px faint), date number (20px 500, tabular), month on the 1st only. Disabled days: ghost ink, no border, not focusable. Selected: accent-soft fill, accent-edge border. Snap scrolling, the selected day scrolls into view. Left and right fade masks 24px wide |
| \`SlotGrid\` | Public page. Grid of time boxes, 3 per row under 420px, 4 above. Each box 46px high, 6px radius, hairline border, time in 16px 500 tabular ("14:30" or "2:30pm" for US timezones). Selected: accent-soft fill, accent-edge border and a 14px tick on the left that is always reserved (visibility hidden when not selected) so the label never moves. Grouped under "Morning", "Afternoon", "Evening" labels (13px faint, 28px rows) |
| \`SlotSkeleton\` | 9 grey hairline boxes the same size as slots, shown after 200ms and for at least 400ms. The grid's min-height is reserved at 3 rows so the sticky bar never moves when slots load |
| \`StickyPayBar\` | Public page. Fixed to the bottom, white, top hairline, 16px padding plus the safe area inset. One large (46px) white button with the firm edge, full width: "Pay $10 deposit and book". Under it a 12px muted line: "The rest ($25) is paid at the appointment." The line keeps its height even when empty. Loading: spinner over the label, width fixed |
| \`StepHeader\` | Public page. 48px bar: back chevron button (36px, labelled "Back"), step label "2 of 4 · Pick a day" in 13px muted, and four 6px dots (accent for done and current, ghost for later). The header never changes height |
| \`BookingRow\` | App. 48px row: time range "09:00 to 09:45" (tabular, fixed 120px column), customer name (500, ellipsis), service (muted, ellipsis), deposit tag (fixed 96px column), status tag (fixed 112px column), phone icon button, row menu button. Hover \`--row-hover\`. Tags have a min width so "Paid $10" and "Refunded" do not change the column |
| \`DayHeader\` | App. 28px label row inside the Bookings list: "Tuesday 4 November" in 13px 500 ink and "6 bookings" right aligned in faint, tabular |
| \`TextMeter\` | App sidebar and Bookings toolbar. Label "Texts this month" (faint), value "212 of 300" (tabular, ink), 4px bar with the base meter colours. Width eases 400ms with the morph curve. Fixed 56px block height in the sidebar. Collapsed sidebar: a 4px vertical bar with a tooltip |
| \`SetupChecklist\` | App. Card with 5 rows (32px each): 16px circle (hairline ring, or success tick when done), label, and a right-aligned compact button ("Add service", "Set hours", "Connect", "Connect", "Copy link"). Done rows keep their height and switch the button to \`visibility: hidden\`. Progress "3 of 5" in the card header, tabular |
| \`ConnectionCard\` | Settings. Box with 16px padding: Lucide icon 16px, title (500), status tag, one line of detail ("Connected as sam@gmail.com"), and the action buttons on the right with min widths of 120px so "Connect" and "Reconnect" are the same width |
| \`QrCard\` | Booking page screen. 240px QR (qrcode.react, ink on white, quiet zone 4 modules), the link under it in 13px with Copy, and two buttons: "Download PNG", "Download poster (PDF)" |
| \`PhonePreview\` | Booking page screen. 320 x 640px frame drawn with a 1px hairline and 24px radius exception (it represents a phone, not a box), containing an iframe of the public page at 100% scale. Fixed size, never reflows the column |
| \`HoursRow\` | Hours screen. 48px row: weekday (fixed 120px), switch, then ranges as pairs of 32px compact selects "09:00" to "17:00", a remove icon button per range, and a dashed "+ Add range" compact button. Closed days show "Closed" in faint in the same space |
| \`PolicyLine\` | Public and manage pages. One 13px muted line with a Lucide \`info\` icon: "Cancel more than 24 hours before for a full refund." Reserved height |

## 4. Public booking page \`/b/[handle]\`

### 4.1 Rules that differ for public pages (and why)
- **Controls are 46px** (the base "large" size) and the minimum tap target is 44px. Customers use thumbs.
- **Inputs use 16px text.** iOS zooms the page into any input under 16px. 16 is on the base size scale.
- Body copy on public pages is 14px; labels stay 13px. Headings use H3 (20px) at most on mobile.
- Everything else is the base: white, hairlines, Geist, 6px boxes, no filled buttons, motion curves.
- Total JavaScript for the page under 90kb gzipped. Geist is self-hosted with \`next/font\` and preloaded
  at 400 and 500 only.

### 4.2 Layout
- Single column, max width 480px, centred on larger screens with hairlines left and right.
- Shop header (64px): logo (Studio, 32px box with 6px radius) or initials in a 32px box on accent soft
  with accent edge, shop name (16px 500), address in 13px muted on one line with ellipsis, a phone icon
  button (\`tel:\`).
- Then \`StepHeader\`, then the step body, then \`StickyPayBar\` on step 4.
- Footer (Solo, or Studio with the footer on): "Booking by Bookwell" 12px faint link, 48px tall.

### 4.3 Step 1: Service
- List of \`ServiceCard\`s with 8px gap. Tapping a card selects it and moves to step 2 after 120ms (the
  selected state shows first so the tap feels received).
- One service only: skip this step and start on Day, with the service shown as a summary line.

### 4.4 Step 2: Day
- Summary line of the chosen service (13px muted) with "Change".
- \`DayStrip\` with the next 14 days, scrolls to \`max_days_ahead\`.
- Under it, a 13px line reserved for "Closed on Sundays" style notes.

### 4.5 Step 3: Time
- \`SlotGrid\` with Morning, Afternoon, Evening groups. Empty groups are hidden.
- No slots: "Fully booked. Try another day." and a compact button "Next free day" which jumps the strip.
- Calendar stale flag: nothing shown to the customer.

### 4.6 Step 4: Details
- Summary card: service, day and time (16px 500), length, deposit.
- Fields (16px text, 46px high): Name, Mobile number (country select 96px wide plus the number), Email
  (optional, labelled "Email (optional, for a receipt)").
- Switch row: "Text me a reminder" on by default, with a 12px muted line "One confirmation and one
  reminder. Reply STOP to opt out."
- \`PolicyLine\` for the refund rule.
- \`StickyPayBar\`. Errors under each field in danger ink with \`role=alert\`; the bar does not move.

### 4.7 States
| State | What shows |
|---|---|
| Loading slots | \`SlotSkeleton\` after 200ms, min 400ms |
| Slot taken (409) | Toast "That slot was taken a moment ago", the grid reloads, the taken slot fades out in 200ms |
| Held (\`?held=\`) | Info box at the top of Details: "Your slot is held for 30 minutes. Pay to keep it." with a live dot |
| Paused | Card: "Bookings are paused for this business. Call {phone} to book." and a phone button |
| Payouts not ready | Card: "Online booking opens soon. Call {phone} to book." |
| Not found | "We could not find that booking page. Check the link with the shop." |
| Offline | Toast "You are offline. We will try again when you are back" and the button keeps its label |

## 5. Done page \`/b/[handle]/done\`
- Pending (polling): a 20px circle with a live dot and "Confirming your payment" (live status, tabular
  seconds hidden). Reserved height equal to the confirmed layout so nothing jumps when it switches.
- Confirmed: success tick in a 32px circle (success at 8% fill, success edge), H3 "You're booked", then a
  summary card: service, day and time in the shop timezone, address, deposit paid. Buttons: "Add to
  calendar" (downloads \`.ics\`) and "Get directions" (maps link from the address). 13px muted line: "Need
  to change it? Use the link in your text message."
- Late (30 s and still pending): "Payment received? It can take a minute. We will text you as soon as it
  is confirmed."
- Motion: the tick scales from 0.9 to 1 and fades in over 220ms with the out curve. Reduced motion: shown.

## 6. Manage page \`/b/cancel/[token]\`
- Shop header as on the booking page.
- Summary card with the status tag.
- \`PolicyLine\` worded for now: "Cancel now and your $10 deposit is refunded" or "Cancelling now keeps
  the $10 deposit with Fade Room".
- Two buttons in a row, each min 160px: "Reschedule" and "Cancel booking". The primary (firmer edge) is
  Reschedule.
- Cancel opens a 520px dialog at 10% from the top: "Cancel Skin fade on Tue 4 Nov at 14:30?", the policy
  line, buttons "Keep booking" and "Cancel booking". On confirm the same dialog morphs (300ms height) to the
  result: "Cancelled. Your deposit refund is on its way (5 to 10 days)."
- Reschedule replaces the summary with the Day and Time steps (same components), confirm button "Move to
  Tue 14:30". Result: summary with the new time and a toast "Booking moved".
- Already cancelled, past, or expired: summary with the tag and "Book again" (link to \`/b/handle\`).

## 7. Auth and onboarding

### 7.1 Login and signup
- Centred column 360px wide, 80px from the top, white page. Logo (20px calendar mark in accent plus
  "Bookwell" 16px 600) above the form.
- Signup fields: Name, Email, Password (with show toggle). Button "Start free trial" (36px, firm edge,
  full width). Under it 12px muted: "7 days free. Set up your booking page in 10 minutes."
- Login: Email, Password, "Log in", link "Forgot password?" (Supabase reset), link "New here? Start a
  free trial".
- Errors under the field or under the button in danger ink: "That email and password do not match. Try
  again or reset your password."

### 7.2 Onboarding \`/onboarding\`
- One card, 520px wide, at 10% from the top. A step morph flow (height 300ms, width fixed) with 3 steps:
  1. "What is your business called?" Name field, and a trade select (Barber, Personal trainer, Tutor,
     Nail tech, Massage, Dog groomer, Other).
  2. "Pick your booking link." \`bookwell.app/b/\` prefix in faint then the handle input. Live check after
     400ms debounce with a reserved 18px status line: "Available" (success ink) or "Taken, try
     faderoom-leeds" (danger ink). Lower case, letters, numbers, hyphens.
  3. "Where are you?" Timezone select (detected from the browser, editable), shop phone, address
     (optional).
- Button row: "Back" and "Continue" (min width 120px). Last step: "Create my page".
- After create: land on \`/app\` with the \`SetupChecklist\` card at the top.

## 8. App shell
- Sidebar 240px (56px icons only under 1100px), white, right hairline, per the base.
- Top: logo row (48px) with the shop name under the logo in 13px muted.
- Nav (Phosphor 17px, regular at rest, duotone in accent when selected, 32px rows):
  Bookings (CalendarCheck), Services (Scissors), Hours (Clock), Booking page (Link).
- Spacer, then \`TextMeter\` (fixed 56px block).
- Bottom group, always in this order: Documentation (BookOpen), Help (Lifebuoy), Billing (CreditCard),
  Settings (Gear).
- Selected item: accent-soft fill, accent-edge border, ink text.
- Trial banner (from the shared paywall step) sits as a 36px hairline-bottom strip at the top of the main
  column, never over the sidebar: "5 days left in your trial. Choose a plan" with a compact button.
- Mobile owner app (under 640px): the sidebar becomes a 56px bottom tab bar with Bookings, Services, Hours,
  Booking page and "More" (sheet with Documentation, Help, Billing, Settings). The meter moves into More.

## 9. Owner screens

### 9.1 Bookings \`/app\`
- Toolbar (48px): search input (240px), count "12 upcoming" (tabular, fixed 120px), \`TextMeter\` compact
  (160px), then buttons "No-show report" and "Copy booking link" (min 140px each).
- Filter bar (44px): chips "Status: Upcoming" (default), "Service", "+ Add filter" dashed.
- List: sections Today, Upcoming, Past 30 days. \`DayHeader\` then \`BookingRow\`s.
- Row menu (portal, 160ms pop): Mark completed, Mark no-show (disabled before start with a tooltip "After
  the start time"), Cancel and refund, Cancel and keep deposit, Copy manage link, Open in Google Calendar.
- Cancel dialog: "Cancel Jordan's Skin fade on Tue 14:30?", optional message field (140 chars, counter
  fixed width), switch "Refund the $10 deposit" (on), buttons "Keep booking" and "Cancel booking". Morphs
  to "Cancelled. Jordan has been texted." then closes after 1.2 s.
- New booking via Realtime: row rises once (360ms, 6px). The count updates with tabular numbers.
- Empty (setup done, no bookings): Lucide \`calendar\` 16px, "No bookings yet. Share your link to get your
  first one." and a "Copy booking link" button.
- Empty (setup not done): the \`SetupChecklist\` card only.
- Loading: 6 skeleton rows of 48px with hairline dividers, after 200ms.
- Error: inline box "Could not load bookings. It will retry automatically." with a "Retry" button.

### 9.2 Services \`/app/services\`
- Toolbar: count "3 services", button "Add service".
- Table: 36px header, 48px rows. Columns: drag handle (24px, visible on hover via visibility), Name, Length
  (80px), Price (80px), Deposit (96px), Buffer (80px), Active switch (72px), row menu.
- Service dialog (520px): Name, Description (counter), Length select, Price input with currency prefix,
  Deposit slider plus input (they stay in sync, max = price, 0 shows "No deposit"), Buffer select, Active
  switch. Buttons "Cancel" and "Save service".
- Warning inside the dialog when payouts are not ready and deposit > 0: "This service is hidden on your page
  until payouts are connected." with a compact "Connect payouts" button.
- Empty: "Add your first service, for example Skin fade, 45 min, $35, $10 deposit." with "Add service".

### 9.3 Hours \`/app/availability\`
- Toolbar: button "Save hours" (disabled until something changes; a 13px faint "Unsaved changes" reserved
  next to it).
- Card "Weekly hours": seven \`HoursRow\`s.
- Card "Days off": list rows (date, reason, remove) and "+ Add day off" dashed, opening a date popover.
- Card "Booking rules": four selects in a 2 x 2 grid with 13px labels: Minimum notice, Book up to,
  Time slots every, Reminder text.
- Validation: overlapping ranges show a danger line under the row: "These hours overlap. Fix them before
  saving."

### 9.4 Booking page \`/app/page\`
- Two columns: left 360px (link, \`QrCard\`, Studio branding card), right \`PhonePreview\`.
- Branding card: Logo upload (dashed drop box 96px, "Upload logo (PNG or JPG, up to 1 MB)"), Colour
  (8 pastel swatches 24px each plus a hex input), switch "Show Booking by Bookwell". Solo: the card shows
  the controls disabled and a note "Included in Studio" with "Upgrade" compact button.
- Changing branding reloads the preview iframe with a fade (200ms); the frame size never changes.

### 9.5 No-show report \`/app/reports\`
- Toolbar: month select, button "Download CSV".
- Four stat boxes in a row (each fixed width, tabular): Bookings, Completed, No-shows, No-show rate.
- Table "Repeat no-shows": masked phone, last name used, count, last no-show date.
- Solo: the same layout with numbers replaced by ghost blocks and a centred box "See who keeps missing
  appointments. Included in Studio." with "Upgrade to Studio".

### 9.6 Settings \`/app/settings\`
- One column, 640px, cards with 24px gaps: Business, Connections, Cancellation policy, Notifications,
  Danger zone.
- Connections: three \`ConnectionCard\`s (Google Calendar, Payouts, Text messages).
- Query flags turn into toasts on load: \`?google=connected\` "Google Calendar connected",
  \`?google=denied\` "Google access was not given", \`?payouts=return\` "Payouts updated".
- Danger zone: hairline box with danger ink title, "Delete business" button (white, danger ink text, firm
  edge). The confirm dialog asks to type the handle.

### 9.7 Billing \`/app/billing\`
- Plan box: current plan name, price, renewal date, status tag.
- Texts box: \`TextMeter\` full width with "Resets on 1 December".
- Plan picker: two plan boxes side by side (Solo, Studio) with a Monthly / Yearly segmented control (the
  yearly label "2 months free"). Prices crossfade 180ms; box sizes never change.
- Buttons: "Switch to Studio" or "Manage billing" (Customer Portal).
- Past due: danger box "Your last payment failed. Update your card to keep bookings open." with "Update card".

### 9.8 Documentation and Help
- Docs: left list of 8 articles (32px rows) and the article on the right at 65 characters wide, 14px body.
- Help: form (Topic select, Message textarea, "Send message" button) and a status list of the three
  connections with their tags. Sent: the form morphs to "Thanks. We reply within one working day."

## 10. Toasts, errors and copy
- Toasts bottom left, 4 s, no full stop: "Service saved", "Hours saved", "Link copied", "Booking
  cancelled", "QR code downloaded".
- Error lines say what went wrong and what to do: "Could not connect Google. Try again, and tick both
  boxes on Google's screen."
- Counts: "1 booking", "12 bookings", "1 text left".
- Buttons verb first: "Connect Google Calendar", "Connect payouts", "Pay $10 deposit and book".

## 11. Motion
- Base curves and durations only.
- Public step change: the outgoing step fades out over 120ms, the new one fades up 4px over 200ms. The
  container height morphs 300ms. Width never changes.
- Slot press: 98% scale for 100ms.
- Bookings rows rise once per session.
- Reduced motion: every change is instant, the pending live dot does not pulse.

## 12. Marketing tokens (for LANDING.md only)
LANDING.md says "use the tokens from @DESIGN.md". These apply only inside the \`(marketing)\` route group
(\`/\`, \`/no-show-calculator\`, \`/for/*\`) and the OG image. The app and the public booking pages use sections 1
to 11.

| Token | Value | Use |
|---|---|---|
| \`--bg\` | #FBF8F3 | Marketing background |
| \`--surface\` | #FFFFFF | Marketing cards |
| \`--ink\` | #221C14 | Marketing text |
| \`--muted\` | #6E6355 | Marketing secondary text |
| \`--line\` | #EAE2D6 | Marketing borders |
| \`--brand\` | #C7801A | Marketing primary buttons and highlights |
| \`--brand-ink\` | #3A2608 | Text on \`--brand\` |
| \`--brand-soft\` | #FBEBD2 | Marketing hover, highlighted table column |
| \`--ok\` | #2F7D4F | Ticks in marketing visuals |
| \`--radius\` | 14px | Marketing cards and buttons |
Font for marketing: DM Sans (400, 500, 600, 700) as LANDING.md specifies. Scope these variables to a
\`.marketing\` class on the marketing layout so they never leak into the app (the app's \`--ink\`, \`--muted\`
and \`--surface\` are the Quiet Precision values).

## 13. Build order for Claude Code
1. Tokens (base plus section 1) in \`app/globals.css\`, Geist with \`next/font\`.
2. App shell with the sidebar, \`TextMeter\` and the mobile tab bar.
3. Auth pages and onboarding.
4. Services, Hours, Bookings (with skeleton, empty and error states).
5. Public booking page components, then the done and manage pages.
6. Settings with the connection cards, Booking page screen, Billing, Reports, Docs and Help.
7. Marketing layout with the section 12 tokens (built from LANDING.md).
8. Check every screen at 320, 375, 430, 1024 and 1440px. Check nothing moves when slots load, a meter
   changes, or a button shows its spinner.

## 14. Accessibility checklist
- Visible focus on every control (2px outline, 2px offset, ink).
- Day strip and slot grid are radio groups (\`role=radiogroup\`, arrow keys move, Space selects).
- The step header announces "Step 2 of 4, pick a day" in a polite live region.
- Every status tag has text, not colour alone.
- Price and time strings use tabular numbers and are readable by screen readers ("2:30 PM", not "14:30" read
  as a number).
- Contrast 4.5:1 for text. Accent text on white uses \`--accent\` only at 14px 500 or larger; smaller accent
  labels use ink.

## 15. Button and control states
Every Bookwell button uses the base button. This table lists the Bookwell-specific labels per state so
Claude Code never invents copy or changes widths.

| Button | Idle | Loading (spinner over label) | Done | Min width |
|---|---|---|---|---|
| Pay deposit (public) | Pay $10 deposit and book | Pay $10 deposit and book | (redirects) | full width |
| Book with no deposit | Book Skin fade | Book Skin fade | (redirects) | full width |
| Connect Google | Connect Google Calendar | Connect Google Calendar | Reconnect | 200px |
| Connect payouts | Connect payouts | Connect payouts | Open Stripe dashboard | 200px |
| Finish payouts | Finish setup (2 items) | Finish setup (2 items) | Open Stripe dashboard | 200px |
| Save service | Save service | Save service | toast "Service saved" | 120px |
| Save hours | Save hours | Save hours | toast "Hours saved" | 120px |
| Copy link | Copy booking link | none | label stays, toast "Link copied" | 140px |
| Download QR | Download PNG | Download PNG | toast "QR code downloaded" | 140px |
| Cancel booking (owner) | Cancel booking | Cancel booking | dialog morphs to the result | 140px |
| Reschedule (customer) | Move to Tue 14:30 | Move to Tue 14:30 | summary updates | full width |
Rules: a button never changes width between states; the "done" label only replaces the idle label when
both fit in the min width; disabled buttons use ghost ink and keep their edge.

## 16. Responsive notes per screen
| Screen | 320 to 430px | 640 to 1099px | 1100px and up |
|---|---|---|---|
| Public booking | single column, 16px side padding, 3 slots per row | 480px column centred | same |
| Done and manage | single column | 480px column | same |
| Bookings | rows become 2-line cards (time and status on line 1, name and service on line 2), 64px high, fixed | table, sidebar 56px | table, sidebar 240px |
| Services | 2-line cards, dialog becomes a full-height sheet from the bottom | table | table |
| Hours | ranges wrap under the weekday name, selects 32px | one row per day | one row per day |
| Booking page | preview moves under the QR card, scaled to 80% | two columns | two columns |
| Settings, Billing | single column | 640px column | 640px column |
| Reports | stat boxes 2 x 2 | 4 in a row | 4 in a row |
- The public sticky bar respects \`env(safe-area-inset-bottom)\`.
- Long shop names wrap to 2 lines at most in the shop header, then ellipsis. The header height grows only
  on first render, never after.
- Check horizontal overflow at 320px on every public page: the day strip scrolls inside itself only.

## 17. Email design (Resend)
- Built with React Email in \`emails/\`. Width 560px, white, 1px hairline box, 24px padding, Geist with
  system fallbacks (most mail apps ignore web fonts).
- Header: shop name for customer emails ("Fade Room"), the Bookwell mark for owner emails.
- One heading (20px 500), 2 to 4 lines of 14px body, one white button with a 1px \`#08090a\` edge and 6px
  radius ("Manage booking", "Reconnect Google Calendar", "Upgrade to Studio").
- Booking summary block: hairline box with service, day and time, address, deposit.
- Footer 12px faint: "Sent by Bookwell for Fade Room. Reply to this email to reach the shop."
- No images except the shop logo (Studio) at 32px. Dark mode: let the mail app invert; no forced colours.

## 18. QR poster (PDF)
- A4 portrait, white, generated with \`pdf-lib\` in a route handler.
- Top: shop name in 48px 500 (Geist), "Book online" in 24px muted.
- Centre: QR code 120mm square with a 4-module quiet zone.
- Under it: the link in 20px, and three short lines: "Pick a time", "Pay a small deposit", "Get a text
  reminder".
- Bottom (Solo, or Studio with footer on): "Booking by Bookwell" 12px faint.
- Studio: the shop logo 24mm above the name and a 2mm frame in the shop colour around the QR.

## 19. Icon map
| Place | Family | Icon |
|---|---|---|
| Sidebar nav | Phosphor 17px | CalendarCheck, Scissors, Clock, Link, BookOpen, Lifebuoy, CreditCard, Gear |
| Row actions | Lucide 16px | phone, more-horizontal, check, x, rotate-ccw |
| Connection cards | Lucide 16px | calendar, wallet, message-square |
| Public page | Lucide 16px | chevron-left, phone, map-pin, info, check |
| Empty states | Lucide 16px | calendar, scissors, clock |
One family per region, never mixed in a row.

## 20. Stability checklist for Bookwell
- Slot grid min-height reserved at 3 rows before slots arrive.
- The sticky pay bar is in the layout from step 4's first frame; its helper line keeps its height.
- Deposit and status tags have fixed column widths in tables.
- \`TextMeter\` value uses tabular numbers; "9 of 300" and "299 of 300" take the same width.
- The handle availability line in onboarding reserves 18px.
- Toolbar counts ("1 upcoming", "128 upcoming") sit in a fixed 120px box.
- Dialogs morph height for confirm then result, never swap for a second dialog.
- Realtime inserts animate once; refetches never re-animate rows.
- Hidden controls (drag handles, "Mark no-show" before start) use \`visibility: hidden\`, not removal.

## 21. Screen inventory and states
Use this as the checklist when you review the build. Every cell must exist.

| Screen | Empty | Loading | Error | Special |
|---|---|---|---|---|
| Login, Signup | n/a | button spinner | field and form errors | password show toggle |
| Onboarding | n/a | handle check line | "Could not create your page. Try again." | handle taken suggestion |
| Bookings | setup checklist, or "No bookings yet" | 6 skeleton rows | inline retry box | Realtime row rise |
| Services | "Add your first service" | 3 skeleton rows | inline retry box | hidden-until-payouts warning |
| Hours | all days closed shows "Open at least one day" | skeleton rows | overlap error per row | unsaved changes line |
| Booking page | n/a | QR placeholder box 240px | "Could not load the preview" in the frame | Studio lock |
| Reports | "No bookings this month" | stat boxes with ghost numbers | inline retry box | Solo blurred preview |
| Settings | n/a | connection tags show "Checking" with a live dot | per-card error line | query flag toasts |
| Billing | n/a | plan box skeleton | "Could not load billing. Try again." | past due box |
| Docs, Help | n/a | article skeleton | "Could not send. Try again." | sent morph |
| Public booking | no services: call the shop | slot skeleton | 409 toast, offline toast | paused, payouts not ready |
| Done | n/a | confirming live status | late message | \`.ics\` |
| Manage | n/a | summary skeleton | "This link is not valid" | already cancelled |

## 22. How texts look on the customer's phone
Design the copy, not only the screens. Each text fits in one 160-character segment.
\`\`\`
Fade Room: booked Skin fade Tue 4 Nov 14:30. Change or cancel: bookwell.app/b/cancel/7f3c...

Fade Room: reminder, Skin fade tomorrow 14:30. Reply C to cancel or manage: bookwell.app/b/cancel/7f3c...

Cancelled: Skin fade at Fade Room Tue 14:30. Your $10 deposit is being refunded.
\`\`\`
- The shop name always comes first so the customer knows who it is from.
- No emoji, no curly quotes, no links other than the manage link.

## 23. Setup checklist copy
| Row | Label | Button | Done when |
|---|---|---|---|
| 1 | Add a service | Add service | one active service |
| 2 | Set your hours | Set hours | one open weekday |
| 3 | Connect Google Calendar | Connect | \`google_status = 'connected'\` |
| 4 | Connect payouts | Connect | \`stripe_charges_enabled\` true (skippable if every deposit is $0) |
| 5 | Share your link | Copy link | link copied or QR downloaded once |
When all five are done the card morphs into the share card (link, Copy, QR) for one session, then hides.
No confetti: a success tick and the toast "Your booking page is live".
`
