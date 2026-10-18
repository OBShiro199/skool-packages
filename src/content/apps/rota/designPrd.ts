// Rota design PRD (DESIGN.md). Builds on Quiet Precision (DESIGN_SYSTEM.md).

export const designPrd = `# Rota: design PRD

Save this file as \`DESIGN.md\` in the project root. It builds on **DESIGN_SYSTEM.md** (Quiet Precision), which is
the base design system for every screen. Save that file next to it as \`DESIGN_SYSTEM.md\`, and put this line in
\`CLAUDE.md\`:

\`\`\`md
UI rules: @DESIGN_SYSTEM.md @DESIGN.md
\`\`\`

DESIGN_SYSTEM.md decides the neutrals, type, radii, sizes, motion, components and stability rules. This file only
adds what is different for Rota: the brand accent, the role colours, the product screens and the components those
screens need. Where the two disagree, this file wins only for the accent and the Rota screens. Every stability,
motion and component rule in DESIGN_SYSTEM.md still applies: white surfaces, 1px hairlines, 6px boxes, 4px pills,
13px app text, white buttons with a firm edge, no filled or black buttons, nothing moves under the cursor.

## 1. Brand

- **Name:** Rota. The plain British word for the staff schedule on the back-room wall. No pun, no mascot.
- **Tagline:** Staff rotas built in minutes.
- **Personality:** a calm, organised shift manager who has seen every Saturday disaster and fixes it without
  raising their voice. Short sentences, real times, no exclamation marks.
- **Two surfaces, two jobs:**
  1. **Manager app** (\`/app\`, laptop first): Quiet Precision as written. Dense, keyboard friendly, a week grid
     that reads like a well-kept spreadsheet.
  2. **Staff app** (\`/s\`, phone first): the same system at phone scale. Big touch targets (44px minimum), one
     thing per screen, the next shift always at the top.

## 2. Brand accent: shift teal

Rota swaps the system's pastel blue for a pastel teal. It keeps the system's three-part shape: a mid accent, a
soft fill and an edge. It marks "selected" and "in progress" only, exactly where the system uses blue.

| Token | Hex | Replaces | Use |
|---|---|---|---|
| \`--accent\` | #3f9c96 | \`--blue\` | Selected nav icon (duotone), progress bars, live dot, today column marker, focus of selected chips |
| \`--accent-soft\` | #eef7f6 | \`--blue-soft\` | Selected row, selected nav item, selected grid cell, "preferred" availability background |
| \`--accent-edge\` | #bfe1de | \`--blue-edge\` | Selected borders, AI draft ghost shifts (dashed), drop target outline |

Why teal, not amber: amber is the system's warning colour and the meter turns amber under 20%. A rota is full of
warnings (rest, hours, availability), so the accent must never be mistaken for one. Teal also stays clear of
success green (#27a644): the accent is lighter and bluer, and success only appears as a small dot or tick.

Everything else is the system palette unchanged: white surfaces, \`--hairline\` #e6e6e9, \`--divider\` #efeff1,
\`--btn-edge\` #dcdde0, ink #08090a, body #3c4149, muted #62666d, faint #8a8f98, ghost #b4b8bf, success #27a644,
warning #d18b0f, danger #eb5757.

\`\`\`css
:root {
  /* Rota accent (replaces the system blue) */
  --accent: #3f9c96; --accent-soft: #eef7f6; --accent-edge: #bfe1de;
  /* keep the system names pointing at the accent so shared components need no changes */
  --blue: var(--accent); --blue-soft: var(--accent-soft); --blue-edge: var(--accent-edge);
  /* grid sizes (Rota only) */
  --grid-name-col: 220px; --grid-day-min: 128px; --grid-row: 56px; --grid-row-compact: 44px;
  --chip-h: 22px; --footer-row: 48px;
}
\`\`\`

### 2.1 Role hues (the eight system tag hues)

Every job role picks one of the eight tag hues when it is created (\`job_roles.hue\`). Shift chips use the role hue:
pastel fill at 8% opacity, a 1px edge of the same hue at about 35%, and readable ink. If an owner does not pick, the
role name hashes to the first seven hues; grey is reserved for "Other" and archived roles.

| Hue | Fill | Edge | Ink | Example role |
|---|---|---|---|---|
| blue | #eef3fc | #c4d4f5 | #2f4f9a | Front desk |
| teal | #eef7f6 | #bfe1de | #1f5f5a | Barista |
| green | #eef8f0 | #c3e6cb | #1e6b33 | Kitchen |
| amber | #fdf6ea | #f0d9a8 | #7a520a | Floor |
| coral | #fdf0ee | #f4c7bf | #8f3426 | Bar |
| pink | #fcf0f5 | #efc6d8 | #8a2d57 | Stylist |
| violet | #f4f2fd | #d5cff5 | #4b3f9e | Coach |
| grey | #f5f5f6 | #dcdde0 | #3c4149 | Other |

Amber as a role hue is allowed because a role chip always carries text and sits inside a grid cell; the warning
state is an icon plus a coral or amber edge on the whole cell, never the chip fill.

### 2.2 Status tags

| Status | Hue | Label |
|---|---|---|
| Week: draft (never published) | grey | Draft |
| Week: published | green | Published |
| Week: changes not published | amber | Changes not published |
| Shift: open | teal (dashed edge) | Open |
| Shift: cancelled | grey, label struck through | Cancelled |
| Request: pending | amber | Waiting for you / Waiting for {name} |
| Request: approved | green | Approved |
| Request: declined, expired | grey | Declined / Expired |
| Time entry: flagged | coral | Away from venue / Late 12 min / Auto-closed |
| Draft: running | teal + live dot | Drafting |
| Message: skipped | grey | Not sent: texts paused |

## 3. Type in Rota

- Geist 400, 500, 600 only. All app UI text is 13px with -0.014em tracking. Real headings only where the system
  allows them (onboarding steps, empty states, dialogs titles at H3 20px).
- **Every time and number uses tabular figures** (\`font-variant-numeric: tabular-nums\`): shift times, hours, costs,
  counts, the clock timer. A rota is a column of numbers; ragged digits look broken.
- Times are 24 hour \`06:00\` in the UK and Ireland, and follow the browser's locale elsewhere (\`6:00 am\`). Ranges use
  "to" in sentences ("06:00 to 14:00") and a plain hyphen in chips and SMS where space is tight ("06:00-14:00").
- Staff app: body stays 13px for lists, but the next shift card uses H2 24px for the time and 16px for the place.

## 4. Components (Rota-specific)

All built from shadcn/ui primitives restyled with the system tokens. No new radii, sizes or shadows.

| Component | Anatomy | States |
|---|---|---|
| **WeekGrid** | Sticky header row (36px) with day name, date and the day's staff count; sticky name column (220px); body rows 56px (44px compact); sticky footer row 48px with hours and cost per day | loading skeleton (fixed rows), empty, read-only (staff view), compact |
| **GridCell** | 1px divider right and bottom. Holds up to 3 ShiftChips stacked with 4px gap, then "+N" | default, hover (row hover fill), drop target (accent edge 1px inset, accent soft fill), unavailable (hatched ghost lines at 6% ink), preferred (accent soft at 50%), time off (a full-width "Holiday" grey tag), conflict (coral 1px inset edge for block, amber for warn) |
| **ShiftChip** | 22px high, 4px radius (it is a pill), role hue fill and edge, text "06:00-14:00", optional notes dot, conflict icon (Lucide AlertTriangle 12px) on the right, pin icon when pinned | draft (dashed edge), published (solid), open (teal dashed, label "Open"), AI ghost (accent edge dashed, 60% opacity until applied), dragging (lifted with the float shadow, 98% scale), cancelled (struck through, grey) |
| **NameCell** | Avatar initials (24px circle, role hue soft), name (ink 500), roles as small tags, "32 / 40 h" in faint tabular | over hours (amber text), invited (ghost "Invited" tag), no phone (small "No texts" faint) |
| **CostFooter** | Per day: "38 h" and "$612"; week total at the left. Budget meter 4px under each day value | under budget (accent), within 10% (amber), over (coral). Numbers never change width (tabular, min-width 64px) |
| **WeekToolbar** | 48px bar: LocationSwitcher, WeekPicker (prev, "w/c 20 Oct", next, Today), status tag, conflict count chip, then right side: Copy last week, Templates menu, Draft with Claude, Publish | Publish label changes between "Publish" and "Publish changes" in a fixed-width button (min 148px) |
| **ConflictPopover** | Opens from the conflict chip or a chip icon: list of problems, each with person, day, rule and "Show" | block items first, then warnings |
| **ShiftPopover** | 320px card in a portal anchored to the cell: Start, End (selects with 15 minute steps, typeable), Break, Role, Notes, Pin, Delete, Make open | new, edit, saving (button keeps its label, spinner overlaid), error inline |
| **DraftPanel** | Side panel 400px sliding 24px from the right over the grid (never pushes it) | queued, running (live dot "Drafting with Claude"), ready (stats, warnings list, Apply / Discard), failed |
| **PublishDialog** | 520px dialog, one dialog that morphs height between steps: Checking, Warnings, Ready, Publishing, Done | see 7.7 |
| **RequestRow** | 48px table row: type tag, who, shift(s), when asked, status, actions (Approve, Decline) with fixed minimum widths | pending, deciding (spinner over label), done (row fades to muted, stays in place until refresh) |
| **StaffPanel** | Side panel 480px: header with name and status, tabs Profile, Availability, Contact, Pay, Activity | invited (Resend invite), active, archived |
| **AvailabilityEditor** | 7 rows (Mon to Sun) x a 06:00 to 24:00 track; drag to paint available, preferred or unavailable in 30 minute blocks; a legend; "Copy Monday to weekdays" | read-only for managers viewing, editable for the person |
| **UsageMeter** | Sidebar block above the bottom group: "Texts 62 of 100", 4px meter, "Resets 1 Nov" | system meter colours; hidden for staff |
| **NextShiftCard** (staff) | Full-width 6px box: day label, time in H2, location and role, "Clock in" button when in the window, "Can't make it?" link | upcoming, now (live dot "On shift 2 h 14 m"), none ("No more shifts this week") |
| **BottomTabBar** (staff) | 64px including safe area, 5 tabs, Phosphor icons 22px with 12px labels (the only 12px text in the product), selected icon duotone accent | badge dot on Requests |
| **ClockButton** (staff) | 160px square-ish 6px box, white, firm 1px ink edge, label "Clock in" / "Clock out", timer under it | locating ("Checking your location" with spinner, width fixed), allowed, outside (danger text below, button stays), done (tick, time) |
| **PhoneField** | Country prefix fixed to the business country, number input, inline format check | invalid shows the system error below with \`role=alert\` |

## 5. Icons

- Navigation: Phosphor 17px, regular at rest, duotone in accent when selected. Rota: CalendarDots. Requests:
  Tray. Staff: UsersThree. Timesheets: ClockCountdown. Documentation: BookOpenText. Help: Lifebuoy. Billing:
  CreditCard. Settings: GearSix.
- Staff tab bar: Phosphor 22px. Shifts: CalendarDots. Open: HandGrabbing. Clock: Clock. Requests: ArrowsLeftRight.
  Me: UserCircle.
- In content: Lucide 14 to 16px, 1.5 stroke: AlertTriangle (conflict), Pin, MessageSquare (notes), MapPin
  (geofence). The AI action uses Lucide Wand2 at 14px next to the label "Draft with Claude"; no sparkle icons.

## 6. App shell

### 6.1 Manager shell (\`/app\`)
- **Sidebar** 240px, white, right hairline. Collapses to 56px icons under 1100px (tooltips on hover and focus).
- Top group, in order: logo row (Rota wordmark, 48px high), **LocationSwitcher** (a 32px select showing the current
  location; "All locations" for owners only on Staff and Timesheets), then nav items 32px high:
  1. Rota
  2. Requests (badge: pending count, tabular, fixed 20px min width)
  3. Staff
  4. Timesheets
- Flexible space, then the **UsageMeter**, then the bottom group, always in this order:
  5. Documentation
  6. Help
  7. Billing (owner only; hidden, not disabled, for managers)
  8. Settings
- No nested menus. One level, 8 items. The account menu is the avatar at the very bottom (Profile, Switch business,
  Staff view, Log out).
- **No top bar and no page titles.** Each page starts with its 48px toolbar.
- Toasts bottom left, at most four, 4 seconds, no full stop.

### 6.2 Staff shell (\`/s\`)
- Top: 48px bar with business and location name (muted) and the avatar on the right. No sidebar.
- Bottom: BottomTabBar (Shifts, Open, Clock, Requests, Me). Content scrolls between them.
- Max content width 560px, centred on tablets and desktop with hairlines left and right.
- Install prompt: after the second visit, a dismissible 6px box "Add Rota to your home screen" with the platform
  instructions. Web app manifest with the Rota icon and \`display: standalone\`.

## 7. Manager screens

### 7.1 Auth (\`/login\`, \`/signup\`, \`/reset\`)
- One 400px column on white, the Rota wordmark above, H3 heading ("Log in to Rota", "Start your 7 day trial").
- Fields 36px: email, password; "Email me a sign-in link instead" text button. Primary button: "Log in" / "Create
  account" (firm edge). Errors under the field.
- Signup has name, business email, password and the line "7 days free, then from $39 a location a month. Cancel
  in two clicks." No card on this screen (card is at Checkout after onboarding).

### 7.2 Join (\`/join/[token]\`, staff)
- Phone first. Card with the business name (H3), location, and "Sam, Cafe Luna added you to their rota."
- Step 1: email and password, or "Email me a sign-in link". Already have a login: "Log in instead".
- Step 2: phone (pre-filled from the invite, editable) and a switch "Text me my shifts and reminders" with the
  line "About 3 to 6 texts a week. Turn off any time in Me." Then "See my shifts".
- Invalid or expired link: "This invite has expired. Ask your manager to send a new one." No form.

### 7.3 Onboarding (\`/onboarding\`, owner)
One card (560px) that morphs height between 4 steps, width fixed, a step counter "Step 2 of 4" in faint text.
1. **Business:** name, country (sets currency, overtime and rest defaults with a one-line explanation).
2. **First location:** name, time zone (pre-filled from the browser), opening hours per day (two time selects per
   row, "Closed" checkbox), optional weekly labour budget.
3. **Job roles:** three suggested chips by industry ("Cafe: Barista, Kitchen, Floor"; "Gym: Front desk, Coach,
   Cleaner"; "Salon: Stylist, Assistant, Reception"), editable names, a hue picker of the eight hues, default rate.
4. **Invite your team:** a 5 row quick table (name, phone, email, role); "Add more later". Primary button "Invite
   and open the rota". Secondary "Skip for now".
Then Stripe Checkout for the trial (shared phase), then \`/app/rota\` for next week.

### 7.4 Rota builder (\`/app/rota\`)
- Layout: WeekToolbar (48px), optional filter bar (44px: role chips, "Only conflicts", "Only open"), the WeekGrid
  filling the rest, CostFooter sticky at the bottom.
- Today's column gets a 2px accent line under its header. Weekend columns are not shaded (white is the material).
- Open shifts row is pinned at the top of the body with a dashed "+ Add open shift" in each cell on hover.
- Hovering a person's row shows their availability for the week as cell backgrounds; it is always shown for the
  row being dragged onto.
- Drag: the chip lifts (float shadow, 98% scale, 160ms), valid targets get the accent drop outline, invalid
  targets (the person lacks the role) show a not-allowed cursor and no outline. Dropping never reflows the row:
  rows have a fixed height and chips stack inside.
- Conflict count chip in the toolbar: "3 conflicts" (coral if any block, amber if only warnings), opens the
  ConflictPopover. The count has a fixed min width so 9 to 10 does not shift the toolbar.
- Keyboard focus ring is the system 2px outline with 2px offset, on cells and chips.
- Read-only for past weeks: chips are solid, popovers show details without inputs, a muted tag "Past week" in the
  toolbar.
- **Empty week:** in the grid body, a centred 400px box: H3 "Nothing on the rota for w/c 27 Oct yet", three
  buttons in a row: "Copy last week", "Apply a template", "Draft with Claude (2 left this month)". Under them,
  faint: "Or click any cell to add a shift."
- **Loading:** skeleton rows with the real row height and the real column widths, shown after 200ms, never
  shorter than 400ms.
- **Error:** an inline 6px box above the grid: "Could not load this week. Check your connection and try again."
  with Retry. The toolbar stays usable.

### 7.5 Shift popover
- Title row: "Tue 21 Oct, Sam Lee" (13px, 500). Fields in a 2 column grid: Start, End, Break (0, 15, 20, 30, 45,
  60), Role. Notes below (single line, 280 chars). Footer: Delete (text button, danger ink), Make open, Save.
- Under the fields, a reserved 36px line shows the live check: "8 h, $100" or a warning "Only 6 h rest after
  Monday's close". The line is reserved even when empty so the popover never jumps.

### 7.6 Draft with Claude
1. Toolbar button "Draft with Claude" (shows "(4 left)" in faint text inside a fixed-width label).
2. Clicking opens the DraftPanel: a textarea "Anything Claude should know this week?" (placeholder: "Saturday is
   the street market, add a barista 10 to 4") and checkboxes "Keep pinned shifts" (default on) and "Use the
   default template for cover" (default on when one exists). Button "Draft the week".
3. **Running:** live dot "Drafting with Claude", a line "Usually 30 to 90 seconds. You can keep working." The grid
   stays editable; a quiet note says edits made now may be replaced.
4. **Ready:** the grid shows ghost chips; the panel shows "24 shifts, 2 left open, $3,412 (budget $3,500)",
   then Warnings (each clickable: scrolls to and pulses the cell outline once) and Notes from Claude (max 5).
   Buttons: "Apply draft" (firm edge) and "Discard". Apply morphs the ghosts to draft chips (opacity 0.6 to 1,
   200ms), no movement.
5. **Failed:** "Claude could not finish this draft. Your rota is unchanged." with "Try again" (does not count
   another draft if the failure was ours).
6. At the cap: the button reads "Draft with Claude (0 left)", disabled with a tooltip "Resets on 1 Nov, or
   upgrade to Team for 10 a month".

### 7.7 Publish dialog (one dialog, morphing)
- **Checking:** spinner and "Checking 24 shifts" (count tabular).
- **Blocked:** H3 "2 problems to fix first", list of block conflicts with "Show" links that close the dialog and
  focus the cell. Button "Back to rota".
- **Warnings:** H3 "Publish with 3 warnings?", list, then "Publish anyway" and "Back to rota".
- **Ready:** H3 "Publish w/c 20 Oct", a summary: "12 people will get a text and an email. 2 open shifts will be
  offered to 6 eligible staff." On a re-publish: "3 people whose shifts changed will be told." Texts left this
  month line with a meter. Button "Publish".
- **Publishing:** button keeps its label with the spinner over it.
- **Done:** tick, "Published. 12 people told", button "Close". The toolbar tag animates from Draft to Published
  (colour only).

### 7.8 Templates (\`/app/rota/templates\`)
- 48px toolbar with "New template" and "Save this week as a template".
- A table of templates (name, shifts, last used). Opening one shows a WeekGrid with weekday columns (no dates)
  and rows by role, each chip showing headcount ("2 x 07:00-15:00"). The default template has a "Default" tag.

### 7.9 Requests (\`/app/requests\`)
- Toolbar with tabs as a segmented control: "Swaps and cover (3)", "Open shifts (2)", "Time off (1)". Counts in
  fixed-width badges.
- Table of RequestRows. Columns: Type, Who, Shift, Asked, Checks (a green tick "No conflicts" or the first warning),
  Status, Actions. Approve and Decline are compact 32px buttons with min width 88px.
- Swap row shows both shifts: "Sam Mon 06:00-14:00 for Priya Tue 12:00-20:00".
- Selecting rows shows the floating selection bar (16px above the bottom, fixed width): "3 selected · Approve all
  (3) · Decline".
- Empty: "No requests waiting. Staff can ask for swaps and time off from their phones."

### 7.10 Staff (\`/app/staff\`)
- Toolbar: search, role filter, location filter (owner), count "18 people", "Invite people" button.
- Table: name (avatar + name), roles (tags), locations, contract hours, this week's hours, texts (On / Off / No
  phone), status. Row click opens the StaffPanel over the page.
- Invite dialog: up to 10 rows (name, phone, email, roles, rate), "Invite 4 people". Shows texts it will use: "Uses
  4 texts".

### 7.11 Timesheets (\`/app/timesheets\`)
- Toolbar: period picker, location, "Approve clean (14)", "Export CSV".
- Top strip "On now": up to 8 people currently clocked in as small cards (name, role, "since 06:58", a coral MapPin
  if flagged). Late people (shift started 5+ minutes ago, no clock-in) as a muted list "Not in yet: Priya (12 min)".
- Table: person, date, scheduled, in, out, break, paid hours, flags, status. Flags are coral tags. Clicking a
  flagged MapPin opens a small static map (OpenStreetMap) with the venue circle and the phone's point.
- Export opens a dialog: period, include submitted, "Download CSV". The download starts and a toast says
  "Timesheet exported".

### 7.12 Billing (\`/app/billing\`, owner)
- A 6px box with plan, price per location, interval, locations paid vs used ("3 of 3"), next invoice date.
- Usage this month: Texts (meter), Claude drafts (meter), with reset date.
- Buttons: "Change plan", "Add a location" (opens a dialog showing the prorated price, then calls
  \`/api/billing/locations\`), "Manage billing in Stripe" (Customer Portal).
- A small plan comparison table (Starter, Team, Pro) with the current plan's column outlined in accent edge.

### 7.13 Settings (\`/app/settings\`)
Tabs as a segmented control: Business (name, country, currency, overtime line, minimum rest, early clock-in
window), Locations (list; each opens a panel: name, address, time zone, opening hours, budget, geofence mode and
radius with "Use my current position" and a static map preview), Job roles (name, hue, default rate), Managers
(owner: invite a manager by email, assign locations), Texting (sender name: "Rota" or your business name on Pro,
with a live preview of a text; per location: "Swaps need my approval" and "Auto-approve open shift
claims"), Notifications (manager emails on or off), Profile (name, email, password).

### 7.14 Documentation and Help
- \`/app/docs\`: left list of articles (Build your first rota, Draft with Claude, Publishing and texts, Swaps and
  cover, Clock-in and the geofence, Exporting timesheets, Billing per location), right the article at 65 characters
  wide. Search box in the toolbar.
- \`/app/help\`: a form (topic select, message, optional screenshot) and "We reply within one working day".

### 7.15 Paywall (\`/paywall\`)
- Owner: "Your trial has ended" or "Your last payment failed", the plan cards and "Continue to checkout" /
  "Update card". Staff and managers: "Rota is paused for Cafe Luna. Ask the owner to update billing. Your shifts
  are safe."

### 7.16 Staff panel detail
The StaffPanel (480px, slides 24px from the right over the page in 200ms, Escape closes) has five tabs. The tab
row has a fixed height and each tab a fixed min width so switching never moves the header.

| Tab | Contents | Who can edit |
|---|---|---|
| Profile | Name, status tag, roles (multi-select of role tags), locations, contract hours, max hours, payroll ID | Managers of their locations |
| Availability | The AvailabilityEditor read-only, plus "Last updated by Sam on 12 Oct". A faint note: "Staff set this themselves in the app" | The person (in the app); managers can override with a note |
| Contact | Phone with texting status ("Texts on since 3 Oct", "Texts off: replied STOP", "Number failed: not a mobile"), email with email status, "Resend invite" for invited people | Managers (phone and email); texting can only be switched on by the person |
| Pay | Hourly rate, rate history (date, old, new, changed by) | Owner and managers |
| Activity | Last 20 events: published shifts, swaps, clock-ins, messages sent with status (Delivered, Not sent: texts paused) | Read only |

Archive person: a text button at the bottom of Profile, confirm in the same panel (it morphs, it does not open a
second dialog): "Archive Sam? Their future shifts become open shifts. Past timesheets stay."

### 7.17 Phone builder (manager under 1024px)
- The toolbar collapses to: location, week label, a "..." menu (Copy last week, Templates, Draft with Claude) and
  Publish.
- A 44px day strip (Mon to Sun with dates, today marked) scrolls sideways; tapping a day shows that day's list:
  open shifts first, then each person with a shift, then "+ Add shift".
- Each shift is a 56px row: time, name, role chip, conflict icon. Tap opens the same ShiftPopover as a bottom
  sheet (full width, 6px top corners, drag handle). "Move to" is a person select inside the sheet.
- The day's cost and hours sit in a 48px sticky footer.

### 7.18 How time is shown everywhere
- All times are shown in the **location's** time zone, never the viewer's, with the zone name in the week label
  when it differs from the browser ("w/c 20 Oct · London time").
- Weeks start on Monday (ISO). The week label is "w/c 20 Oct" (week commencing), the British form.
- An overnight shift shows on its start day as "22:00-06:00 +1". Hours and cost are counted on the start day.
- Daylight saving weeks: a shift that crosses the change shows its real length ("8 h" not "9 h"), and the week
  header shows a faint note on the change day "Clocks go back".
- Durations: "8 h", "7.5 h", "45 min". Money: business currency with no decimals in the grid, two in tooltips
  and exports.

## 8. Staff screens (\`/s\`)

### 8.1 Shifts (home)
- NextShiftCard at the top. Under it "This week" as a list of days: each day row 56px with the day, date and either
  a shift chip with location and role or "Off" in faint text. Today has a 2px accent bar on the left.
- A segmented control "Mine / Team". Team shows the location's published week as a compact list per day (time,
  name, role), never phone numbers or pay.
- Pull to refresh is not built; the list updates through Realtime.
- Empty (no published week): "Your manager hasn't published next week yet. You'll get a text when they do."

### 8.2 Open
- Cards for open shifts the person can do: day, time, role, location, "Claim". Claimed shows "Requested · Withdraw".
- Shifts that clash with their own show a small amber line "Clashes with your Thu 12:00-20:00" and no Claim.

### 8.3 Clock
- One ClockButton in the middle of the screen, the shift it applies to above it ("Barista, 06:00 to 14:00"), the
  geofence result under it ("At Luna Shoreditch, 24 m away" in muted text, or the danger message).
- While clocked in: a running timer (H2, tabular), break selector, "Clock out".
- Location permission denied: "Rota needs your location to clock in here. Turn it on in your browser settings."
  with a link to the help article.

### 8.4 Requests
- Sections: "Waiting for you" (swap asks with Accept / Decline), "Your requests", "Time off". Buttons at the
  bottom: "Swap a shift", "Ask for cover", "Request time off".
- **Swap a shift** is a full-screen sheet with 3 steps in one morphing container: pick your shift, pick a
  colleague's shift (only eligible ones, conflicts already filtered), add a note, "Send request".
- **Ask for cover**: pick your shift, "Anyone who can" or a named person, note, send.
- **Time off**: date range, reason (optional), send.

### 8.5 Me
- Name, business switcher (if they work for two), Availability (opens the AvailabilityEditor in a phone layout:
  one day at a time with a 06:00 to 24:00 vertical track), Phone and texts switch, Email and email switch, Help,
  Log out.
- Turning texts off shows: "Texts off. You'll still get emails and see changes here."

## 9. States

| Screen | Empty | Loading | Error |
|---|---|---|---|
| Rota builder | Empty week box with 3 actions | Skeleton grid with real sizes | Inline box above the grid, Retry |
| Draft panel | n/a | Live dot "Drafting with Claude" | "Claude could not finish this draft. Your rota is unchanged." |
| Requests | "No requests waiting" | Skeleton 5 rows | Inline box, Retry |
| Staff | "Invite your team to start" + Invite button | Skeleton rows | Inline box |
| Timesheets | "No clock-ins in this period" | Skeleton rows | Inline box |
| Staff home | "No shifts published yet" | Skeleton card + 7 rows | "Could not load your shifts. Pull down or reopen the app." |
| Clock | "No shift to clock in to right now" + Clock in anyway (unscheduled) | "Checking your location" | Geofence or permission message |
| Billing | n/a | Skeleton boxes | "Could not reach Stripe. Try again in a minute." |

Every loading state follows the system: wait 200ms before showing, stay at least 400ms, reserve the final size.

## 10. Motion (Rota moments, within the system curves)

| Moment | Spec |
|---|---|
| Drag lift | 160ms out curve to the float shadow and 98% scale; drop settles 160ms, no bounce |
| Drop target | Outline appears instantly (colour only), never animates size |
| AI ghosts appear | Fade in 320ms, staggered 25ms per day column, capped at 175ms; once per draft |
| Apply draft | Ghost opacity 0.6 to 1 over 200ms, dashed edge becomes solid on publish only |
| Publish dialog steps | Height morph 300ms, content fades up 4px after 60ms, width constant |
| Week change | Grid body cross-fades 200ms; rows do not re-rise on refetch |
| Conflict "Show" | The target cell's outline pulses once (opacity 1 to 0.4 to 1, 600ms) |
| Clock in success | Tick draws 240ms, timer starts; no confetti |
| Live states | Drafting dot and "On shift" dot pulse 1.4s loop: the only loops |
| Reduced motion | Everything appears in its end state instantly, drag shows no lift animation |

## 11. Accessibility

- The WeekGrid is a \`role="grid"\` with row and column headers; each chip is a button with an accessible name
  "Sam Lee, Tuesday 21 October, 06:00 to 14:00, Barista, draft, 1 warning".
- Every drag action has a keyboard path (popover fields, "Move to" select in the popover). Drag is never the only way.
- Colour is never the only signal: conflicts carry an icon and text, role chips carry the time and the role in
  the accessible name, budget states carry the numbers.
- Staff app touch targets are 44px minimum; the ClockButton is 160px.
- Live regions: toasts are polite; the Publish result and clock-in result are announced.
- Contrast: role chip ink on fill is above 4.5:1 for every hue in 2.1.

## 12. Responsive

- **Manager app** works from 1024px up; under 1100px the sidebar is 56px. Under 1024px the builder switches to a
  day-by-day list (one day per screen, swipe or arrows) with the same popover, because a 7 column grid at 390px
  helps nobody. Managers on a phone mostly approve requests, which works at any width.
- **Staff app** is designed at 375px and checked at 320, 375 and 430px. No horizontal scroll anywhere; long names
  ellipsis; times never wrap.
- Grid columns: \`minmax(var(--grid-day-min), 1fr)\`; at 1280px wide every day fits; below that the body scrolls
  sideways with the name column sticky.

## 13. Emails and SMS

- **Emails** (React Email): white, 560px, Geist with system fallbacks, business name as the first line in ink 600,
  then one heading, the shift list as a simple table with tabular times, one white button with a 1px ink edge
  ("See my shifts"), footer in faint 12px with unsubscribe. No images except the optional business logo (64px).
- **SMS**: plain text from the templates in \`@PRD.md\` 12.2. Always the business name first, a time range, a short
  link last. No emoji (it forces UCS-2 and halves the length).

## 14. Component states

| Component | Default | Hover | Focus | Active | Disabled | Loading |
|---|---|---|---|---|---|---|
| Button | White, 1px edge | Hover fill | 2px outline, 2px offset | 98% scale | Ghost text, no shadow | Spinner over label, width fixed |
| Primary button | White, firm 1px ink edge | Hover fill | same | same | same | same |
| ShiftChip | Role hue | Edge darkens one step | Outline | Lifts when dragged | Past weeks: no hover | n/a |
| GridCell | White | Row hover fill | Outline inset | Drop outline | Past weeks | Skeleton |
| ClockButton | White, ink edge | Hover fill | Outline | 98% | "No shift now" ghost | "Checking your location" |
| Meter | Accent | n/a | n/a | n/a | n/a | Width eases 400ms with the morph curve |

## 15. Microcopy

| Moment | Copy |
|---|---|
| Publish button | "Publish" / "Publish changes" |
| Publish blocked | "2 shifts clash with another shift or approved holiday. Fix them to publish." |
| Double booked across sites | "Sam is already on at Luna Angel then. Move one of the shifts." |
| Rest warning | "Only 6 h rest after Monday's close" |
| Hours warning | "44 h this week (limit 40 h)" |
| Availability warning | "Outside Sam's availability" / "Sam is unavailable at this time" |
| Role warning | "Sam isn't trained for Kitchen" |
| Draft cap | "You've used all 6 drafts this month. They reset on 1 Nov." |
| Texts at 80% | "80 of 100 texts used this month. Reminders will go by email after that." |
| Texts paused | "Texts paused until 1 Nov. Staff still get email and see changes in the app." |
| Staff limit | "This location is at its 15 person limit on Starter. Upgrade to Team for 40." |
| Location limit | "You pay for 2 locations. Add one in Billing to create another." |
| Geofence refused | "You're about 1.2 km from Luna Shoreditch. Clock in when you get there, or ask your manager." |
| Location off | "Rota needs your location to clock in here. Turn it on in your browser settings." |
| Swap sent | "Request sent to Priya" |
| Swap expired | "This request expired 2 hours before the shift." |
| Already handled | "Someone already dealt with this request." |
| Concurrent edit | "Someone else changed this shift. Showing the latest" |
| Week changed during draft | "The week changed while Claude was drafting. Draft again, or apply anyway." |
| Invite expired | "This invite has expired. Ask your manager to send a new one." |
| Export too big | "That's more than 50,000 rows. Pick a shorter period." |
| Paused business | "Rota is paused for Cafe Luna. Ask the owner to update billing. Your shifts are safe." |
| Toasts | "Shift added", "Shift moved", "Published", "Swap approved", "Timesheet exported", "Invite sent" |

## 16. Hand-off checklist for Claude Code

- [ ] Tokens from DESIGN_SYSTEM.md plus section 2 of this file; no raw hex in components.
- [ ] Sidebar exactly as 6.1, 8 items, Billing hidden for managers, meter above the bottom group.
- [ ] WeekGrid rows fixed height; chips stack; nothing reflows on drop, on Realtime updates or on loading.
- [ ] Every number tabular; count-bearing buttons have min widths.
- [ ] Publish is one morphing dialog; DraftPanel and StaffPanel overlay, never push.
- [ ] Staff app at 320, 375, 430px with no horizontal scroll; 44px targets; tab bar respects the safe area.
- [ ] All copy from section 15; sentence case; no exclamation marks.
- [ ] Reduced motion shows end states; drag has a keyboard alternative.
`
