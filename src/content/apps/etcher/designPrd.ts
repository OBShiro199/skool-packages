// Etcher design PRD: builds on Quiet Precision (DESIGN_SYSTEM.md), adds the sage accent and every product screen.

export const designPrd = `# Etcher: design PRD

Save this file as \`DESIGN.md\` in your project root, next to \`DESIGN_SYSTEM.md\` (the Quiet
Precision design system, downloadable from this kit). Add this line to \`CLAUDE.md\`:

\`\`\`
UI rules: @DESIGN_SYSTEM.md @DESIGN.md
\`\`\`

**This document builds on Quiet Precision.** Everything in DESIGN_SYSTEM.md applies: white
surfaces, 1px hairlines, Geist 400/500/600, 13px app text, 6px boxes, 4px pills, white buttons
with a firmer edge for the primary (no filled or black buttons), one easing curve, and every
stability rule. DESIGN.md only adds what is different for Etcher: the brand accent, the
product screens, and the components a CRM with a softphone needs. Where the two disagree,
DESIGN.md wins only for the accent and the screens below.

## 1. Brand

### 1.1 Feel
A sharp pencil on good paper. Etcher should feel quieter and faster than the CRM the team is
leaving. Dense tables that stay calm, a kanban that never jumps, a phone that is always one
click away and never in the way.

### 1.2 Accent: sage
Quiet Precision's single accent is pastel blue. Etcher swaps it for a pastel sage green (the
kit art tone is green). The rule is unchanged: the accent marks "selected" and "in progress"
only. It is never a button fill, never body text, never a large area.

| Token | Hex | Replaces | Use |
|---|---|---|---|
| \`--accent\` | \`#3f9a6e\` | \`--blue\` | Selected nav icon (duotone), focus of the active column, progress bar fill, live dot |
| \`--accent-soft\` | \`#eef7f2\` | \`--blue-soft\` | Selected row fill, selected nav item fill, selected stage chip |
| \`--accent-edge\` | \`#bfe0cd\` | \`--blue-edge\` | Border of selected things, drag target outline |
| \`--accent-ink\` | \`#1f5a3e\` | (new) | Text that sits on \`--accent-soft\` (e.g. "Selected 12") |

Keep every neutral, status colour and tag hue from DESIGN_SYSTEM.md. Note the accent and
\`--success\` (\`#27a644\`) are both green: \`--success\` is only for status words like "Won" and
"Connected"; \`--accent\` only for selection and progress. Never put the two side by side as
equals.

\`\`\`css
:root {
  --accent: #3f9a6e; --accent-soft: #eef7f2; --accent-edge: #bfe0cd; --accent-ink: #1f5a3e;
  /* aliases so DESIGN_SYSTEM.md components pick up the brand without edits */
  --blue: var(--accent); --blue-soft: var(--accent-soft); --blue-edge: var(--accent-edge);
}
\`\`\`

### 1.3 Stage colours
Stage colours come from the eight pastel tag hues (DESIGN_SYSTEM.md section 2), mapped to the
nine names the database allows. Fill at 8% opacity, a 1px edge of the same hue, readable ink.

| DB colour | Fill | Edge | Ink |
|---|---|---|---|
| grey | \`#f3f4f6\` | \`#dcdde0\` | \`#3c4149\` |
| blue | \`#eef3fd\` | \`#c4d4f5\` | \`#2f4f9e\` |
| teal | \`#ecf7f7\` | \`#bfe3e3\` | \`#1f6262\` |
| green | \`#eef7f2\` | \`#bfe0cd\` | \`#1f5a3e\` |
| amber | \`#fdf6e7\` | \`#f1dba6\` | \`#7a5208\` |
| orange | \`#fdf0e8\` | \`#f2cdb4\` | \`#86431a\` |
| red | \`#fdeeee\` | \`#f3c4c4\` | \`#8f2a2a\` |
| pink | \`#fcedf4\` | \`#f0c3d8\` | \`#86294f\` |
| violet | \`#f3effd\` | \`#d5c9f3\` | \`#4d3a8f\` |

Stage pills are 4px radius, 20px tall, 12px text, never all caps.

### 1.4 Logo and illustration
- Wordmark "Etcher" in Geist 600, 16px in the sidebar, tracking -0.02em, ink. A 14px mark to
  its left: a square with one diagonal hairline stroke (an etched line), 1.5px stroke, ink.
- No illustrations inside the app. Empty states use one Lucide icon at 16px in faint ink, a
  line of text and one button.

## 2. Layout

### 2.1 App shell
\`\`\`
+------------+--------------------------------------------------------------+
| [E] Acme v |  toolbar 48px: search · count · view toggle · actions        |
|            +--------------------------------------------------------------+
| Home       |  filter bar 44px: chips + "+ Add filter" (dashed)            |
| People     +--------------------------------------------------------------+
| Companies  |                                                              |
| Deals      |  content (table / kanban / record)                           |
| Tasks      |                                                              |
| Calls      |                                                              |
| Reports    |                                                              |
|            |                                                              |
|            |                                                              |
| Docs       |                                                              |
| Help       |                                          +----------------+  |
| Billing    |                                          | softphone dock |  |
| Settings   |                                          +----------------+  |
| (o) Olly   +--------------------------------------------------------------+
+------------+
\`\`\`
- **Sidebar:** 240px, white, right hairline. Top: workspace switcher (32px row: 20px square
  logo or initials pill, workspace name 13px/500, chevron). Then Home, People, Companies,
  Deals, Tasks, Calls, Reports. Bottom group, always this order: Documentation, Help, Billing,
  Settings. Then a 48px "me" row: 24px avatar, name, and a 6px softphone status dot
  (accent = online, ghost = offline, warning = reconnecting) with a tooltip.
- Nav items 32px high, 6px radius, Phosphor 17px icons (House, User, Buildings, Kanban,
  CheckSquare, Phone, ChartBar; BookOpen, Lifebuoy, CreditCard, Gear). Selected: accent-soft
  fill, ink text, duotone icon in accent. Hover: \`--hover\`.
- Counts next to nav items: Tasks shows overdue count as a 4px pill (danger ink on red fill),
  Calls shows missed calls today. Fixed 28px min width so a count change never moves the label.
- Under 1100px the sidebar collapses to 56px icons with tooltips; the switcher becomes the
  logo square and opens the same menu.
- **No top bar, no page titles.** The toolbar names the view by its selected nav item and the
  view switcher.

### 2.2 Workspace switcher menu
Menu pop (160ms, portal), 280px wide:
- Section label "Workspaces" (faint). Rows: initials pill, name, role (faint, right), tick on
  the current one.
- Divider. "Create workspace" (Plus icon). "Invite teammates" (UserPlus). "Log out".
- Switching shows the spinner rules (after 200ms, min 400ms) on the clicked row only, then
  reloads \`/app\`.

### 2.3 Softphone dock
The dock is the one Etcher-specific floating component. It lives in the app layout (survives
navigation), bottom right, 16px from both edges, 320px fixed width, shadow-float, 6px radius,
white. Layer: 95 (above content, below dialogs).

States (the dock morphs height, never width):
| State | Height | Contents |
|---|---|---|
| Collapsed idle | 40px | Phone icon, "Ready" + accent live dot, caller ID number (tabular), minutes meter as a 40px mini bar |
| Offline | 40px | Ghost dot, "Softphone offline", "Retry" compact button |
| Dialling | 128px | Avatar initials, name (13/500), number, "Calling…" with pulsing dot, timer reserved (00:00 in ghost), Hang up button |
| In call | 168px | Name, company, timer (tabular, updates each second), buttons: Mute, Keypad, Hang up; "Recording" pill (red dot + 12px text) when recording |
| Incoming | 128px | "Incoming call" label, name or number, company, Answer and Decline buttons (equal 136px width) |
| Wrap-up | 300px | Outcome (disposition as 2-column chip grid), Note (textarea, 3 rows), "Add follow-up task" toggle + date chips (Tomorrow, In 3 days, Next week), Save button |

- Buttons are white with edges. "Hang up" and "Decline" use danger ink text and a danger edge,
  still white fill. "Answer" uses the primary firm edge with accent ink. No red or green fills.
- The keypad opens inside the dock (morph to 280px height): 3x4 grid of 44px keys.
- Incoming calls also ring with the browser's audio and show a system notification if the
  tab is hidden (ask permission in onboarding, step "Make a test call").
- Wrap-up is required to "close" the dock but has "Skip" (text button). Saving updates the
  call row and closes to idle with a toast "Call logged".
- Reduced motion: the dock appears and changes height instantly.

### 2.4 Record page
\`\`\`
toolbar: < Back · person name · [Call] [Email] [Add task] [...]
+-----------------------+-----------------------------------------+-------------------+
| Fields 320px          | Timeline (fluid, max 720px)             | Related 300px     |
| Name, email, phone    | composer: Note | Log email | Log call   | Company card      |
| (phone has Call icon) | --------------------------------------- | Deals (stage pill)|
| Company, owner, title | Today                                   | Tasks (checkbox)  |
| custom fields...      |  call · 4:12 · Connected · [play]       | Calls (last 5)    |
| + Add field (admin)   |  note · "Wants a proposal by Friday"    |                   |
|                       | Yesterday                               |                   |
|                       |  stage · Proposal -> Negotiation        |                   |
+-----------------------+-----------------------------------------+-------------------+
\`\`\`
- Fields are inline-editable: click the value, it becomes a 32px input in the same box (no
  shift, the row height is fixed at 36px), Enter saves, Escape cancels, toast "Saved".
- Timeline items: 13px, actor avatar 20px, type icon (Lucide 14px: StickyNote, Mail, Phone,
  ArrowRight, Trophy, XCircle, CheckSquare, Upload), relative time on hover shows exact time.
- Call items show direction arrow, duration (tabular), disposition pill, rep name, and a
  recording player (play button, 160px scrub bar, time; loads the signed URL on first play).
- Under 1280px the Related column moves into a tab next to Timeline.

## 3. Screens

### 3.1 Auth (\`/login\`, \`/signup\`, \`/forgot\`, \`/reset\`)
- White page, centred 380px column, opens 10% from the top (same rule as dialogs). Wordmark
  at the top, H3 heading ("Create your workspace" / "Log in to Etcher"), then fields.
- Signup: Full name, Work email, Password (with "8+ characters" helper in faint). Primary
  button "Start free trial" full width. Under it: "7 days free. Unlimited seats. $149/month
  after." in muted 13px. Link "Already have an account? Log in".
- Login: Email, Password, "Forgot password?" link right-aligned above the password field.
  Button "Log in".
- Optional "Continue with Google" as a secondary white button above the fields with a
  hairline "or" divider.
- Errors: under the field, danger ink, \`role=alert\`, e.g. "That email and password do not
  match. Try again or reset your password."
- Invite landing \`/invite/[token]\`: same column, "{inviter} invited you to {workspace}", role
  pill, then the signup or login form prefilled with the invited email (read-only).

### 3.2 Onboarding (\`/onboarding\`)
One dialog-style card, 520px, 10% from the top, morphing height between steps (300ms, width
never changes). Step dots at the top (3 dots, accent fill on done/current).
1. **Name your workspace.** Input "Workspace name" (placeholder "Acme Recruiting"), helper
   "Your team sees this. You can change it later." Button "Continue".
2. **How big is your team?** Six option tiles in a 3x2 grid (1, 2-5, 6-10, 11-20, 21-50, 50+),
   36px tall, selected = accent-soft + accent-edge. "What do you sell?" select (Recruitment,
   Agency services, B2B software, B2B services, Other) which picks the pipeline template.
   Button "Continue".
3. **Start your 7-day trial.** Monthly / Annual segmented control (Annual shows "Save $839"
   pill). Line "Unlimited seats · 1,000 call minutes a month · Cancel any time". Button
   "Start free trial" (goes to Stripe Checkout). Under it: "You will not be charged until
   {date}."
Return from Stripe shows "Confirming with Stripe…" with the live dot until the subscription
row exists, then goes to \`/app\`.

### 3.3 Home (\`/app\`) with the onboarding checklist
- Toolbar: "Home" view, today's date (muted).
- Until all steps are done: a checklist card (white, hairline, 6px, max 720px):
  heading "Get Etcher ready" (H3), progress meter "3 of 7" (accent bar, tabular), rows:
  1. Name your workspace (auto-done)
  2. Tell us your team size (auto-done)
  3. Import your leads → "Import CSV" button
  4. Pick your first pipeline → opens the template dialog (Agency, Recruiting, B2B sales,
     Partnerships, Blank) with stage previews as pills
  5. Buy a phone number → Settings > Numbers
  6. Invite your team → invite dialog
  7. Make a test call → calls the user's own mobile (asks for it once)
  Each row: 48px, checkbox (2px radius, accent when done), label, one compact button on the
  right with fixed 120px width. Done rows show the label in muted ink with the done time.
  "Hide checklist" text button bottom right (sets \`dismissed\`).
- Below (or instead, once done): three cards in a row (stack under 900px): **Today** (tasks due
  today with checkboxes, overdue in danger ink), **Calls today** (count, connects, talk time),
  **Pipeline** (open value, weighted, won this month, all tabular).

### 3.4 People and Companies tables
- Toolbar (48px): search input 280px ("Search people"), count "4,812 people" (tabular, fixed
  min width 120px), view menu (saved views), "Import" button, primary "Add person".
- Filter bar (44px): chips (Owner, Company, Lead source, Created, Last contacted, any custom
  field), "+ Add filter" dashed.
- Table: header 36px, rows 48px, fixed column widths, single-line cells with ellipsis. Columns
  (people): checkbox 36, Name 220 (avatar initials + name), Email 220, Phone 160 (click = call,
  hover shows Phone icon), Company 180, Title 160, Owner 140, Last contacted 140 (relative),
  custom fields 160 each. Columns can be hidden and reordered (saved per view).
- Row hover \`--row-hover\`. Click opens the record page. Rows rise once per session (360ms,
  25ms stagger, capped).
- Selection bar floats 16px above the bottom, fixed 560px width: "12 selected" (min 96px),
  Assign owner, Add to pipeline, Export, Delete (danger ink). Never shifts as the count changes.
- Footer bar (48px): "1 to 50 of 4,812", page size, prev/next.
- Companies: Name with favicon (from domain, 16px, ghost square fallback), Domain, Industry,
  People count, Open deals value, Owner.

### 3.5 Deals: kanban and table
- Toolbar: pipeline switcher (select, 220px), view toggle (Board | Table segmented),
  search, "Owner" quick filter, primary "Add deal".
- Forecast strip (44px, under the toolbar, replaces the filter bar on board view; filters move
  into a "Filter" menu): Open {value} · Weighted {value} · Won this month {value} · Win rate
  {pct} (90 days). All tabular, each segment fixed width.
- Board: columns 280px fixed width, horizontal scroll, 12px gap. Column header 44px: stage
  pill, count, value (tabular) and weighted value in faint. The header is sticky.
- Deal card: white, hairline, 6px radius, 12px padding, 76px min height: deal name (13/500,
  2 lines max), company (muted), value (tabular, right), owner avatar 20px, close date (danger
  ink when past). A 2px left edge in the stage hue.
- Drag (dnd-kit): the card lifts with shadow-float and 1deg tilt at most; a placeholder of the
  exact card height stays in place; the target column gets accent-edge outline. Drop updates
  optimistically, then saves \`stage_id\` + \`position\` (fractional between neighbours). If the
  save fails, the card animates back (200ms) and a toast "Could not move the deal. It is back
  where it was".
- Dropping into a Won or Lost column opens the close dialog before saving.
- Won and Lost columns sit at the end, narrower (220px), cards show only name and value.
- Table view: Name, Stage (pill), Value, Weighted, Owner, Company, Expected close, Days in
  stage, Last activity. Inline edit Stage via a select.
- Realtime: when a teammate moves a card, it moves with a 200ms transform, never a full
  re-render; rows do not re-animate.

### 3.6 Close deal dialog
520px, opens 10% from the top. Title "Mark as won" or "Mark as lost".
- Won: Final value (currency input, prefilled), Close date (today), Note (optional). Primary
  "Mark as won". A small confetti burst (canvas-confetti, 600ms, 40 particles, accent and
  stage hues) after save; none with reduced motion.
- Lost: Reason category (required, chip grid: Price, Timing, Competitor, No budget, No
  decision, Went silent, Bad fit, Other), Details (textarea). Primary "Mark as lost".

### 3.7 Tasks
- Toolbar: segmented Overdue | Today | Upcoming | Done (counts in tabular, fixed widths),
  assignee filter (admins), primary "Add task".
- List rows 48px: checkbox, title, linked record (person/deal pill), due (danger when overdue),
  assignee avatar. Checking a task strikes it through in place (no row removal until next
  load), toast "Task done" with Undo.
- Add task dialog: Title, Due (date + time), Remind me (none, at due time, 1 hour before, 1
  day before), Assignee, Linked to (record search).

### 3.8 Calls
- Toolbar: search, direction filter, rep filter, date range, minutes meter (right, 200px,
  "612 of 1,000 minutes", accent bar; amber under 20% left, coral under 5%).
- Table: Direction icon 36, Person 200, Number 160, Rep 140, Started 160, Duration 90
  (tabular), Outcome pill 160, Recording 120 (play button), Deal 180.
- Missed inbound rows show "Missed" in danger ink and a "Call back" compact button.
- Empty state: Phone icon, "No calls yet", "Buy a number to start calling from Etcher",
  button "Set up calling".

### 3.9 Reports
Grid of report cards (2 columns, 1 under 1000px), each a white card with hairline, H3 title,
a "Last 90 days" select, and a 280px chart area reserved before data loads.
1. **Pipeline by stage:** horizontal bars per stage (stage hue fill), value and count labels.
2. **Forecast by month:** bars for weighted value by expected close month, value line in ink.
3. **Win rate and cycle time:** two big numbers (32px/500, tabular) with deltas vs previous
   period (success or danger ink, arrow icon), plus a small trend.
4. **Calls per rep:** table: Rep, Dials, Connects, Connect rate, Talk time, Meetings booked,
   sortable, with an inline bar in the Dials cell.
5. **Revenue closed by month:** bars for 12 months, currency per pipeline.
Charts use Recharts with: no grid lines except a hairline baseline, 12px faint axis labels,
tooltips as menus (portal, shadow-float). Read the dataviz rules: one hue per series, stage
hues for stages, accent only for "this period".

### 3.10 Import
A 3 step flow in one page card (720px), morphing height:
1. **Upload:** dashed drop zone (180px tall), "Drop a CSV here or browse", helper "Up to 25 MB
   and 50,000 rows". After drop: file name, size, row estimate, first 5 rows preview table.
2. **Map columns:** two-column table: CSV column (with 2 sample values in faint) → Etcher field
   select (grouped: Person, Company, Custom fields, Don't import). Auto-mapped rows show a
   small "Matched" pill. Dedupe radio group (Skip, Update empty fields, Create anyway) with one
   line of help each. Options toggles. Primary "Import 4,812 people".
3. **Progress:** progress bar (accent, 8px tall, 300 to 500ms width easing), "Importing 2,000
   of 4,812" (tabular, fixed width), counters row Inserted · Updated · Skipped · Errors, live
   dot "Running". Cancel button. Done: success line, "View people", "Download 3 error rows".
- History table below: file, by, when, status pill, counts.

### 3.11 Settings
Settings is one page with a left tab list (200px, inside the content area, 32px items) and
the tab content (max 760px). Each tab has sections separated by hairlines, a section title
(16/500) and helper (muted), and a Save button per section that is disabled until a change.
- **Profile:** avatar upload, name, timezone select, email preferences (switches), password,
  danger zone "Delete my account" (danger-edge button, type DELETE to confirm, shows the
  blocker message if any).
- **Workspace:** name, default currency, logo, danger zone "Delete workspace" (owner; type the
  workspace name).
- **Members:** table (avatar, name, email, role select, joined, remove), pending invites
  (email, role, sent, Resend, Revoke). "Invite" opens a dialog: emails (comma or newline,
  chips), role select, "Send 3 invites".
- **Pipelines:** list on the left, stage editor on the right: rows with drag handle (6 dot
  icon), colour swatch (menu of the 9 colours), name input, win % input (0 to 100, tabular,
  suffix %), kind (Open/Won/Lost, read-only for Won/Lost), delete (only when 0 deals; else
  tooltip "Move the 4 deals first"). "+ Add stage" dashed row. Reorder calls
  \`reorder_stages\` on drop.
- **Fields:** per object tabs (People, Companies, Deals). Rows: drag handle, label, type pill,
  key (faint), archive. "+ Add field" dialog: label, type, options (for select types, chip
  input), required toggle.
- **Calling:** status card (Ready / Not set up / Suspended with live dot). Mode radio cards
  (Etcher numbers, Your own Twilio, Your SIP carrier). Recording switch, consent switch,
  consent text (200 chars, counter), ring timeout select, inbound fallback select. UK
  compliance section (form built from the Regulations response, status pill: Draft, In
  review, Approved, Rejected with reason).
- **Numbers:** table (number, a 2-letter country pill (no flag emoji), type, assigned to select, default radio, monthly cost, Release). "Buy number" dialog:
  country segmented (US, UK), type, area code / contains input, Search; results list (number,
  locality) with "Buy" per row ($1.15/month etc. shown, [verify] per country); UK shows a
  notice and disables Buy until the bundle is approved.
- **Data:** Import history link, Export cards (People, Companies, Deals, Calls, Everything),
  each with "Export CSV" and the last export time.
- **Audit log:** filter bar (actor, action, entity, date), table (when, who, action, entity,
  summary), row opens a side panel (slides 24px from the right over the page) with before /
  after as a two-column key diff.

### 3.12 Billing (\`/app/billing\`)
- Plan card: "Monthly · $149/month" or "Annual · $949/year", status pill (Trialing: 4 days
  left, Active, Past due in danger ink, Canceled), next charge date, "Manage billing" (opens
  Stripe portal), "Switch to annual (save $839)".
- Usage card: minutes meter (used of cap, resets date), numbers used "2 of 3", recordings
  storage. "Buy 1,000 minutes ($39)" button with the cost in brackets per the voice rules.
- Invoices are in the Stripe portal (link), not rebuilt.
- Read-only banner (lapsed): full-width 44px bar under the toolbar, warning ink: "Your plan has
  ended. You can view and export your data. Restart to add records and make calls."
  Button "Restart plan".

### 3.13 Documentation and Help
- **Documentation** (\`/app/docs\`): two-column docs layout inside the app: left list of
  articles (Getting started, Importing leads, Pipelines and forecasts, Calling from Etcher,
  Recording and consent, UK numbers, Bring your own Twilio or SIP, Exports and deleting data,
  Keyboard shortcuts), right article at 65ch. Articles are MDX files in \`content/docs\`.
- **Help** (\`/app/help\`): contact form (subject, message, attach screenshot) sent to your
  support inbox through Resend, calling status card, "Book a free HubSpot migration" card
  (link to your calendar).

## 4. Empty, loading and error states
| Where | Empty | Loading | Error |
|---|---|---|---|
| People | Users icon, "No people yet", "Import a CSV or add your first person", buttons Import CSV, Add person | Skeleton rows (8 rows, 48px, hairline dividers, shimmer off with reduced motion) | "Could not load people. Check your connection and retry." + Retry |
| Companies | "Companies appear here when you import people with work emails, or add one" | same | same |
| Deals board | Each empty column shows a dashed 76px "Drop a deal here" slot | Column skeletons with header widths reserved | Toast + board stays on last good data |
| Timeline | "Nothing here yet. Add a note or make a call." | 3 skeleton items | Inline error with Retry |
| Tasks | Today empty: "Nothing due today" (CheckCircle icon) | skeleton | same pattern |
| Calls | See 3.8 | skeleton | same |
| Reports | "Reports fill in after your first closed deal and first call" | Chart area keeps its 280px height with a centred spinner after 200ms | "Could not load this report" in the card |
| Softphone | Offline state | "Connecting" with live dot | "Microphone blocked. Allow it in your browser's site settings, then retry." with a link to Docs |
| Search | "No matches for 'acme'. Try a name, email or domain." | inline spinner in the input (right, 14px) | n/a |

Error copy always says what happened and what to do next, ends with a full stop. Toasts are
short, past tense, no full stop ("Person added", "Deal moved to Proposal", "Invite sent").

## 5. Components (shadcn/ui, restyled to the system)
Button, Input, Textarea, Select, Combobox (record search), Command (Cmd+K), Dialog, Sheet
(side panel), DropdownMenu, Popover, Tooltip, Tabs, Table, Checkbox, Switch, RadioGroup,
ToggleGroup (segmented), Badge (pills), Progress, Skeleton, Sonner (toasts bottom left, max 4),
Calendar. Plus Etcher components: SoftphoneDock, WrapUpForm, DealCard, KanbanColumn,
StagePill, Meter, Timeline, TimelineItem, RecordingPlayer, FieldValue (inline edit),
FilterChip, SelectionBar, ImportMapper, StageEditor, ReportCard.

Restyle rules for shadcn (tell Claude Code to apply these to \`components/ui\`): remove every
\`bg-primary\` and \`bg-destructive\` fill; buttons are \`bg-white border\` with \`--btn-edge\`,
the primary variant uses a 1px \`#9aa0a8\` edge and ink text; destructive is danger ink with a
danger edge; radius 6px; heights 36/32/46; focus ring 3px ink halo at 10% plus darker edge.

## 6. Keyboard
- Cmd/Ctrl+K: command menu (search people, companies, deals; actions "Add person", "Call…").
- C on a record page: call the primary phone. N: new note. T: new task.
- On the board: arrow keys move focus between cards, Space picks up a card, arrows move it,
  Space drops (dnd-kit keyboard sensor), Escape cancels.
- Shortcuts are listed in Docs and in a "?" dialog.

## 7. Motion (Etcher specifics; the system's curves and durations apply)
| Moment | Spec |
|---|---|
| Dock state change | Height morph 300ms ease-morph, content fades up 4px after 60ms |
| Incoming call | Dock rises 8px + fades in 220ms; live dot pulses 1.4s; no shaking |
| Card drag | Lift 120ms; drop settle 200ms transform; placeholder never collapses mid-drag |
| Close won | Confetti 600ms once; stage column header value counts up 400ms (tabular) |
| Import progress | Bar width eases 400ms per update; counters change in place |
| Side panel | Slides 24px from the right over the page, 200ms, overlay at 0% (no dimming) |
Reduced motion: no confetti, no count-up, every state appears at its end value instantly.

## 8. Responsive
- Desktop first (sales teams work on laptops). 1280px is the design width; must work at 1024.
- Under 1100px: sidebar icons only, record page Related column becomes a tab.
- Under 768px: read-only friendly. Tables become lists (name, one secondary line, chevron),
  the board becomes one column at a time with a stage select at the top, the dock becomes a
  full-width bar at the bottom (48px collapsed). Calling works on mobile Chrome and Safari.
- Check every screen at 375, 768, 1024, 1280 and 1440px.

## 9. Accessibility
- Every icon-only button has an \`aria-label\` ("Call Sarah Jones", "Hang up").
- The dock is \`role="region" aria-label="Softphone"\`; incoming calls announce through a polite
  live region ("Incoming call from Sarah Jones").
- The kanban supports keyboard dragging (section 6) and announces moves ("Deal moved to
  Proposal, position 2 of 5").
- Colour is never the only signal: stage pills have names, overdue has the word "Overdue",
  recording has the word "Recording".
- Focus visible on every control: 2px outline, 2px offset.

## 10. Microcopy
| Place | Copy |
|---|---|
| Call button | Call |
| Minutes cap reached | You have used this month's 1,000 minutes. Buy 1,000 more in Billing. |
| Calling not set up | Calling is not set up yet. An admin can set it up in Settings > Calling. |
| Recording consent helper | Recording laws differ by country and US state. Many need every party's consent. Keep the announcement on unless you are sure. |
| Do not call | This contact is marked do not call. |
| After-hours warning | It is 21:40 for this contact. Call anyway? |
| Import button | Import 4,812 people |
| Export confirm | We will email you a link. It expires in 24 hours. |
| Delete person | Move Sarah Jones to the bin? Admins can restore her for 30 days. |
| Buy number | Buy +1 415 555 0100 ($1.15/month) |
| Release number | Type the number to release it. You cannot get it back. |
| Trial banner | 4 days left in your trial. |
| Payment failed banner | Your last payment failed. Update your card to keep calling. |

## 11. Email visual spec (React Email)
All nine emails share one layout so they look like the product:
- Background white, container 560px, 32px padding top, 24px sides. No grey outer panel.
- Header: the Etcher mark + wordmark (16px/600), then a 1px \`#e6e6e9\` hairline.
- Heading 20px/500, ink \`#08090a\`, tracking -0.02em. Body 15px/24px \`#3c4149\`.
- Numbers (deal values, call counts) use tabular figures and sit in a two-column table with
  hairline row dividers, label left in \`#62666d\`, value right in ink.
- One button per email: white fill, 1px \`#2f7d58\` edge, ink text 14px/500, 6px radius, 40px
  tall, 20px side padding. Never a filled button, same rule as the app.
- Footer 12px \`#8a8f98\`: workspace name, "You get this because you are a member of {workspace}.",
  "Email preferences" link, postal address.
- Weekly digest table: Stage, Deals, Value, Weighted; then "Top callers" (rep, dials, connects).
  Stage names carry their pill colour as a 10px square, never coloured text.
- Dark mode in mail clients: set \`color-scheme: light\` meta and keep the white background.

## 12. Screen checklist for Claude Code
Before calling a screen done, check each item at 1280px and 375px:
1. No page title and no top bar; the 48px toolbar holds search, count and actions.
2. Every count sits in a fixed min-width box with tabular numbers.
3. Buttons are white with an edge; the primary has the firmer edge; nothing is filled.
4. Loading states reserve the final height; spinners wait 200ms and stay 400ms.
5. Empty state has one icon, one line, one action.
6. Errors say what happened and what to do, with a full stop.
7. Dialogs open 10% from the top, 520px max, and morph height between steps.
8. The softphone dock never overlaps a selection bar: when both show, the selection bar
   shifts left by the dock width plus 16px (set once, it does not animate on every change).
9. Stage, outcome and status pills use the 4px radius and the tag hues from section 1.3.
10. Reduced motion: every animation shows its end state instantly.
`
