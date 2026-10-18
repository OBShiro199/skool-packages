// Shortlist design PRD (DESIGN.md). Builds on Quiet Precision (DESIGN_SYSTEM.md).

export const designPrd = `# Shortlist: design PRD

Save this file as \`DESIGN.md\` in the project root. It builds on **DESIGN_SYSTEM.md** (Quiet Precision), which
is the base design system for every screen. Save that file next to it as \`DESIGN_SYSTEM.md\`, and put this line
in \`CLAUDE.md\`:

\`\`\`md
UI rules: @DESIGN_SYSTEM.md @DESIGN.md
\`\`\`

DESIGN_SYSTEM.md decides the neutrals, type, radii, sizes, motion, components and stability rules. This file
only adds what is different for Shortlist: the brand accent, the product-specific screens and the components
those screens need. Where the two disagree, this file wins only for the accent and the Shortlist screens. Every
stability, motion and component rule in DESIGN_SYSTEM.md still applies: white surfaces, 1px hairlines, 6px
boxes, 4px pills, 13px app text, Geist 400/500/600, white buttons with a firm edge, no filled or black buttons,
nothing moves under the cursor.

## 1. Brand

- **Name:** Shortlist. The list you make when you have read every CV properly.
- **Tagline:** Hiring for teams of ten.
- **Personality:** a calm, fair hiring manager. Organised, exact, kind to candidates. Never "rockstar"
  energy, never HR jargon.
- **Two surfaces, two jobs:**
  1. **The app** (hiring team): Quiet Precision as written. Dense, keyboard friendly, light only.
  2. **The candidate pages** (careers, job, apply, booking, privacy): still Quiet Precision, more air
     (16px body text, 640px reading column), the company's logo at the top, Shortlist only in the footer.
- **Fairness is visible.** Anything AI-made carries a small "AI summary" label and a link to "How this
  works". AI never looks like a verdict: no scores, no red, no ticks that look like approval.

## 2. Brand accent: periwinkle

Shortlist swaps the system's pastel blue for a pastel periwinkle (the colour of a highlighter pen line
through a name). It keeps the same three-part shape and is used only where the system uses blue: selected
and in progress.

| Token | Hex | Replaces | Use |
| --- | --- | --- | --- |
| \`--accent\` | #6c7ae0 | \`--blue\` | Selected nav icon (duotone), progress bars, live dot, drop target line |
| \`--accent-soft\` | #f2f3fd | \`--blue-soft\` | Selected row, selected nav item, selected card, active filter chip fill |
| \`--accent-edge\` | #cdd2f6 | \`--blue-edge\` | Selected borders, drag-over column edge, focused card ring |

Everything else is the system palette: surface #ffffff, \`--row-hover\` #fafafb, \`--hover\` #f5f5f6, hairline
#e6e6e9, divider #efeff1, \`--btn-edge\` #dcdde0, ink #08090a, body #3c4149, muted #62666d, faint #8a8f98, ghost
#b4b8bf, success #27a644, warning #d18b0f, danger #eb5757.

Add to \`globals.css\` after the system tokens:

\`\`\`css
:root {
  --accent: #6c7ae0; --accent-soft: #f2f3fd; --accent-edge: #cdd2f6;
  --blue: var(--accent); --blue-soft: var(--accent-soft); --blue-edge: var(--accent-edge);
}
\`\`\`

### 2.1 Stage tag hues (fixed, never hashed)

Pastel fill at 7% opacity, a darker edge of the same hue, readable ink. 4px radius, 20px high, 12px text.

| Stage | Fill | Edge | Ink |
| --- | --- | --- | --- |
| Applied | #f3f4f6 | #dfe1e6 | #4a4f57 |
| Screen | #f2f3fd | #cdd2f6 | #4652b8 |
| Interview | #f5f0fd | #ddd0f6 | #6a46b8 |
| Offer | #fdf6ea | #f1dcb0 | #8a5a07 |
| Hired | #eef8f0 | #c4e6cb | #1d7a34 |
| Rejected | #fbf1f1 | #f0d2d2 | #9a4040 |

### 2.2 AI assessment pills

These must never read as pass or fail.

| Label | Fill | Edge | Ink | Icon (Lucide 14px) |
| --- | --- | --- | --- | --- |
| Meets | #eef8f0 | #c4e6cb | #1d7a34 | \`quote\` |
| Partly | #fdf6ea | #f1dcb0 | #8a5a07 | \`quote\` |
| Not shown | #f3f4f6 | #dfe1e6 | #4a4f57 | \`circle-dashed\` |
| Unclear | #ffffff | #dcdde0 dashed | #62666d | \`help-circle\` |

No red anywhere in AI output. No checkmarks or crosses. The quote icon means "there is evidence".

## 3. Type in Shortlist

- App: the system scale exactly. All UI text 13/18. Candidate names on cards 13/18 weight 500 ink. Job
  title in the page toolbar 14 weight 500 (it is the only page label; there is no page title).
- Candidate pages: job title H1 (35/1.12, -0.035em, 500), section heads H3 (20/26), body 16/26 body ink,
  max 65 characters a line (640px column).
- Numbers that change (counts per column, usage meter, unread bell, slot times) use tabular numbers.
- Quotes from a CV in the AI panel: 13/20, body ink, a 2px left rule in \`--divider\`, no italics.

## 4. Components (Shortlist-specific)

All built from shadcn/ui primitives restyled with system tokens. No raw hex in components.

1. **Pipeline column.** 280px fixed width, white, 1px hairline right border between columns, header 44px
   (stage tag + count in tabular numbers in a 32px fixed-width slot + a "..." menu). Body scrolls
   vertically on its own. Drop target: the column gets a 1px \`--accent-edge\` inset ring and a 2px
   \`--accent\` line where the card will land. No background tint.
2. **Candidate card.** 260px wide, 72px fixed height, 6px radius, hairline border, 12px padding. Line 1:
   name (500, ellipsis) + applied age right-aligned ("3d", faint, tabular). Line 2: a row of up to 4
   must-have dots (8px circles: filled success for Meets, half for Partly, hollow ghost for Not shown or
   Unclear) then icons for scorecards (count) and notes (count). States: hover (row hover fill), selected
   (\`--accent-soft\` fill + \`--accent-edge\` border), dragging (shadow-float, 2deg rotation off with reduced
   motion, original slot keeps a dashed placeholder of the same height), unread (6px accent dot before
   the name), opted out of AI (no dots, a small "No AI" text in faint).
3. **Candidate side panel.** 720px wide (100vw under 900px), slides 24px from the right over the board
   in 200ms, never reflows it, Escape closes, focus trapped. Header 56px: name, stage tag, stage
   dropdown button, "Reject" button, "Schedule" button, close. Tabs below (36px): Overview, CV, Answers,
   Scorecards, Notes, Emails. Content scrolls; header stays.
4. **AI summary card.** Inside Overview. Header row: "AI summary" label (12px faint, sparkle-free: use
   Lucide \`text-quote\`), criteria version, "How this works" link, "Report" button (compact). Then the
   summary paragraph, then one row per criterion: label (500), kind tag ("Must" / "Nice"), assessment
   pill, note (muted) and quotes (collapsed after the first, "+2 quotes" shows the count and never
   truncates). Footer line in faint: "Not shown means the CV does not mention it. Ask, do not assume."
   Reserved height while loading: 240px skeleton rows so the panel does not jump when it arrives.
5. **CV viewer.** PDF rendered with the browser's viewer in an iframe from the signed URL, white, full
   panel height minus header. DOCX shows extracted text in a 640px column with a "Download original"
   button. Opening this tab calls \`mark_cv_viewed\` (once).
6. **Scorecard form.** One row per criterion: label, four segmented buttons 1 to 4 (labels "No
   evidence", "Some", "Good", "Strong"), 32px compact, fixed width each. Recommendation: four segmented
   buttons ("Strong no", "No", "Yes", "Strong yes"), no colour until selected, then the selected one
   gets \`--accent-soft\` fill and \`--accent-edge\` border (never green/red). Notes textarea. "Submit
   scorecard" primary button. Hidden scorecards from others show as a dashed row: "2 scorecards hidden
   until you submit yours".
7. **Criteria editor row.** Drag handle, label input, description input (expands), Must/Nice segmented
   control, weight 1/2/3 segmented control, delete. Lint warnings render below the row in warning ink,
   13px, Lucide \`alert-triangle\` 14px, with "Rewrite" (focuses the input) and "Keep with a reason"
   (opens an inline 1-line input). The row reserves one line of height for warnings so typing does not
   make the list jump (min-height on the warning line, \`visibility: hidden\` when empty).
8. **Question builder row.** Type select (Short text, Long text, Single choice, Multiple choice, Yes or
   no, Link, Number), label, help text, options chips (for choices), Required switch.
9. **Slot picker (candidate).** Day tabs across the top (scroll sideways, "Mon 21 Oct"), then a grid of
   slot buttons 96px wide, 36px high, tabular times. Selected slot: \`--accent-soft\` fill, firm edge. A
   fixed 64px confirm bar at the bottom: "Book Tue 22 Oct, 14:00 (45 min)" button with a stable width.
10. **Booking link dialog.** 520px dialog, opens at 10% from the top. Fields: title, duration segmented
    (30/45/60/90), mode segmented (Google Meet, Phone, On site), interviewers multiselect (each shows a
    green 6px dot "Calendar connected" or a dashed "Not connected, invite to connect"), window (date
    range, max 21 days), minimum notice. The dialog morphs height to show the preview "Candidate gets
    this email" and the "Send booking link" button. Width never changes.
11. **Reject dialog.** 520px. Reason as a radio list (Skills mismatch, Experience level, Role filled,
    Withdrew, No response, Location, Other). "Send rejection email" checkbox (on). Preview of the
    template collapsed. Button "Reject and send in 2 hours". If the CV was not opened the dialog shows
    "Open the CV first. Shortlist does not let anyone reject an application nobody has read." with an
    "Open CV" button instead of the reason list.
12. **Undo toast.** Bottom left, 4 seconds is too short for rejections: rejection toasts stay 10 seconds,
    "Rejection email sends at 16:40 · Undo". Undo also lives on the card for the delay period as a
    faint clock icon with "Sends 16:40".
13. **Usage meter (sidebar).** Label "AI summaries", "112 of 150" tabular, a 4px bar. Accent, then amber
    under 20% left, coral under 5%. Fixed width; the number never shifts the label.
14. **Notification bell.** 32px icon button in the sidebar header, count pill 18px high with a fixed
    min-width of 22px. Popover 360px, max 8 items, "Mark all read".
15. **Privacy request row.** Email, type tag (Access, Delete), verified date, due pill ("Due in 21 days",
    amber under 7, coral under 2), actions "Send export" and "Delete everything" (danger ink text, white
    button, firm edge, confirm dialog that morphs to a 3 second countdown).

## 5. Icons

- Navigation (Phosphor 17px, regular at rest, duotone in \`--accent\` when selected): Jobs \`Briefcase\`,
  Candidates \`UsersThree\`, Interviews \`CalendarCheck\`, Careers page \`Globe\`, Documentation \`BookOpen\`,
  Help \`Lifebuoy\`, Billing \`CreditCard\`, Settings \`GearSix\`, bell \`Bell\`.
- In content (Lucide 14 to 16px, 1.5 stroke): \`quote\`, \`circle-dashed\`, \`help-circle\`, \`file-text\`,
  \`calendar-plus\`, \`message-square\`, \`clipboard-check\`, \`lock\`, \`clock\`, \`alert-triangle\`, \`external-link\`.
- One family per region. Never mix Phosphor and Lucide in one row.

## 6. App shell

- Left sidebar 240px (56px icon rail under 1100px), white, right hairline. Top: 48px header with logo
  mark (a 16px rounded square with two short horizontal lines, the second one shorter, in ink), workspace
  name (500, ellipsis) with a switcher menu, and the bell on the right.
- **Top group (core):** Jobs, Candidates, Interviews, Careers page. Interviewers do not see Careers page.
- **Bottom group, always in this order:** Documentation, Help, Billing, Settings. Billing hidden for
  non-owners. Above it: the usage meter (owners and admins) with 12px gap.
- Nav items 32px high, 6px radius, 8px icon gap, hover \`--hover\`, selected \`--accent-soft\` with the
  duotone icon. No section labels (the two groups are split by flexible space).
- Page toolbar 48px, bottom hairline: page context on the left (for a job: job title + status tag + "Copy
  link" button), search and actions on the right. No page titles, no top bar.
- Banners (trial days left, past due, AI cap reached) sit in a 36px strip above the toolbar, white with a
  hairline bottom border and a 6px status dot, never a coloured background.

## 7. Screens

### 7.1 Auth (\`/login\`, \`/signup\`, \`/reset\`)
- Centred 400px column, white, logo mark on top, H2 "Log in to Shortlist" / "Start your 7 day trial".
- Fields 36px: email, password (show/hide), "Continue with Google" button (white, firm edge, Google G
  icon in full colour is the only coloured icon allowed in the app). Errors under fields in danger ink.
- Signup subline: "No card needed to look around. Card needed to start the trial." (true for this flow:
  Stripe Checkout collects the card for the trial).
- Loading: the button keeps its label and width, spinner overlays after 200ms.

### 7.2 Onboarding (\`/onboarding\`)
One 520px card at 10% from the top that morphs height between 3 steps (step dots at the top, width
constant):
1. "Your company": company name, careers address (\`shortlist.app/careers/\` prefix + slug input with live
   availability: "Available" success ink / "Taken" danger ink, checked 300ms after typing stops), website.
2. "Your first job": job title, location, workplace (On site / Hybrid / Remote). Button "Create draft job".
3. "Your team" (skippable): up to 3 emails + role (Admin, Interviewer). Buttons "Send invites" and
   "Skip for now". Seat count "1 of 3 seats used" in faint.
Then land on the job editor, Criteria tab, with a tip callout: "Add 3 to 6 things a great hire shows on
their CV. The AI summarises against these and nothing else."

### 7.3 Jobs (\`/app/jobs\`)
- Toolbar: search, count ("4 jobs"), filter chips (Status), primary button "New job".
- Table (36px header, 48px rows): Title (500) + department (faint), Status tag, Applied, Screen,
  Interview, Offer (tabular counts in 56px fixed columns), New this week (accent dot + count), Hiring team
  (avatar stack, max 3 + "+N"), Updated. Row click opens the board.
- Empty: centred 400px block: H3 "No jobs yet", "Create a job, add your criteria and share one link.",
  button "Create your first job".

### 7.4 Job editor (\`/app/jobs/[id]\`, tabs Details, Form, Criteria, Team)
- Tabs sit in the toolbar's left after the job title. Each tab is a 720px centred column of sections
  split by hairlines, with a sticky 56px footer bar: "Saved" status (fixed width) + "Publish job" or
  "Pause" / "Close job".
- **Details:** title, department, location, workplace, employment type, salary min/max + currency +
  period + "Show salary on the job page" switch, description (markdown editor with a preview toggle,
  640px). Right-hand hint text in faint: "Jobs with a salary get more applicants."
- **Form:** standard fields shown as locked rows (Name, Email, CV, Privacy notice, AI opt-out) so the
  hirer sees exactly what candidates fill in; switches for Phone, LinkedIn, Cover letter (Off, Optional,
  Required); custom questions list with "+ Add question" (dashed). A live 375px phone preview on the right
  over 1280px, below the list under it.
- **Criteria:** the criteria editor (component 7), "+ Add criterion" dashed, a counter "4 criteria (3
  must, 1 nice)". Info block: "Candidates see these on the job page. Scorecards use them too."
  Version note when the job is open: "Changing criteria creates version 3. Existing summaries stay on
  version 2 until you summarise again."
- **Team:** members table (name, role, calendar status, remove), "Add to hiring team" combobox listing
  workspace members.
- **Publish dialog:** checklist that morphs: criteria present, no unresolved warnings, careers page
  published (link to fix), plan has an open job slot ("2 of 2 open jobs used. Close a job or upgrade.").
  Button "Publish job". On success the toolbar shows a "Copy link" button and a toast "Job published".

### 7.5 Pipeline board (\`/app/jobs/[id]\` default tab)
- Toolbar: job title + status tag, tabs, then right: search candidates, filter chips (Source, Has
  scorecard, AI status), sort menu (Applied date, Name, Must-haves shown), "Share job" button.
- Six columns side by side (Applied, Screen, Interview, Offer, Hired, Rejected). Board scrolls sideways
  inside its container only; columns scroll vertically on their own. Rejected column collapsed to a
  48px rail by default with the count; click expands it.
- Drag and drop with dnd-kit: keyboard support (space to lift, arrows to move, space to drop), screen
  reader announcements ("Moved Ana Silva to Interview"). Dropping on Rejected opens the reject dialog;
  cancelling it returns the card to its slot with a 200ms ease.
- Interviewers: cards are not draggable (cursor default, a \`lock\` icon in the column header tooltip
  "Only admins move candidates").
- Multi-select with shift-click: selection bar floats 16px above the bottom, fixed width 520px: "3
  selected", "Move to", "Send booking links", "Reject" (min widths for three-digit counts). Bulk reject
  skips cards whose CV nobody opened and says so: "2 rejected. 1 skipped: open the CV first."
- Empty column: dashed 72px placeholder "Drop here". Empty job (no applicants): centred message "No
  applicants yet. Share your job link." + "Copy link" + "Open job page".
- Loading: 6 columns with 3 skeleton cards each at fixed 72px height; rows rise once per session.

### 7.6 Candidate panel (\`?app=<id>\`)
- **Overview:** contact block (email with copy, phone, location, LinkedIn link), source and applied date,
  AI summary card (component 4) or its states: queued/running ("Summarising against 4 criteria" with
  the live dot), opted out ("AI not used (candidate's choice). Read the CV in full."), disabled ("AI
  summaries are off for this workspace."), paused cap ("AI summary paused: monthly limit reached.
  Read the CV, or upgrade for more." + "Upgrade"), failed ("Summary failed. Retry" button), scanned PDF
  notice, injection notice ("This CV contains text that tries to instruct the AI. Read the CV
  yourself." warning ink), older criteria notice with "Summarise again (1 summary)".
- Then "Timeline": stage changes with who and when, emails sent, interviews.
- **CV:** the viewer (component 5).
- **Answers:** question label (faint) and answer (body) pairs, cover letter at the end.
- **Scorecards:** your scorecard form (component 6) on top, others below (or the hidden notice).
- **Notes:** composer at the bottom (textarea 3 rows, "@" opens a mention menu of people on the hiring
  team), notes list newest last. Mentions render as accent-ink text with no background.
- **Emails:** list of emails sent to the candidate with status (Sent, Delivered, Bounced) and a
  "Pending: rejection sends 16:40 · Undo" row when one is queued.
- Header actions: stage dropdown (moves without drag), "Schedule" (booking dialog), "Reject" (dialog).

### 7.7 Candidates (\`/app/candidates\`)
- Toolbar: search (name, email), count, filter chips (Job, Stage, Talent pool, Retention due).
- Table: Name, Email, Applications (job tags, "+N"), Latest stage tag, Applied, Retention ("Deletes 12
  Mar" faint, amber within 7 days), row menu.
- \`/app/candidates/[id]\`: two columns over 1100px: left 720px (applications list, each opening the panel
  on its board), right 320px (contact, talent pool status, privacy actions "Export data", "Delete
  candidate" with confirm).

### 7.8 Interviews (\`/app/interviews\`)
- Tabs: Upcoming, Waiting for candidate (pending booking links with "Copy link", "Cancel"), Past, Scorecards
  to submit (count badge).
- Table rows: date and time (tabular, in the viewer's time zone), candidate, job, interviewers, mode
  (Meet link button "Join" when within 10 minutes of start), status tag.

### 7.9 Careers page editor (\`/app/careers\`)
- Left 520px form: logo upload (square crop preview, PNG/JPG/WebP up to 2 MB), headline, about (markdown,
  1,500 chars), website, "Publish careers page" switch, careers link with "Copy".
- Right: live preview of the careers page in a 375px or 1024px frame toggle.

### 7.10 Billing (\`/app/billing\`, owner only)
- Current plan block: plan name, price, status tag (Trial, Active, Past due, Cancels on date), renewal
  date, "Manage billing" (Stripe portal).
- Usage block: three meters (AI summaries, Applications, Open jobs) plus Seats, each "x of y" tabular,
  reset date "Resets 1 Nov".
- Plans block: three plan cards in a row (white, hairline, the current one with \`--accent-edge\`),
  monthly/annual toggle (annual shows "2 months free"), "Switch to Team" buttons.

### 7.11 Settings (\`/app/settings\`)
Vertical tab list 200px on the left inside the page, content 640px:
- **Profile:** name, avatar, time zone.
- **Company:** name, careers address (owner only, warning "Old links stop working"), sender name,
  reply-to email, privacy contact email, time zone.
- **Team:** members table (name, email, role select for owner, remove), pending invites (resend,
  revoke), "Invite" button with seat count.
- **Calendar:** your connection: "Connect Google Calendar" button or connected email + status + "Disconnect";
  working hours grid (7 rows: day switch + up to 2 time ranges), buffer, max interviews per day, time
  zone. Explains: "Shortlist sees only when you are busy, never what your meetings are."
- **Email templates:** list of 6 candidate templates; editor with subject, body (plain text with
  placeholder chips you can click to insert), live preview with sample data, "Reset to default".
- **AI screening:** "Use AI summaries" switch, link to how it works, summary of guardrails (no scores,
  redaction, opt-out, evidence check), the pass-through report entry (Team and Growth).
- **Privacy and retention:** retention period segmented (90, 180, 365 days), talent pool period, rejection
  delay (0, 30 min, 2 h, 24 h), data requests table (component 15), deletion log table (date, reason,
  counts; never emails), the privacy page link with "Copy".
- **Notifications:** switches per kind.

### 7.12 Pass-through report (Settings > AI screening, Team and Growth)
- One table per job: Stage, Entered, Moved on, Rejected, and "Decision differed from AI labels" (count +
  share, tabular). Rows 48px, numbers right-aligned.
- Under it, two plain lines in muted ink: "Rejected with every must-have shown: 3. Worth a second look."
  and "Moved on with no must-have shown: 1." Each opens the Candidates table filtered to those people.
- No charts with red or green. A 120px horizontal bar per stage in \`--accent\` shows volume only.
- Empty: "The report fills in once 20 candidates on a job have a decision."

### 7.13 First-run checklist (Jobs page, until done)
- A 360px white card pinned to the top right of the Jobs table area (not a modal), hairline border,
  5 rows with a 16px ring that fills in when done: "Publish your careers page", "Publish a job",
  "Connect Google Calendar", "Invite a teammate", "Review your first applicant".
- Each row is a link to the exact place. "Hide checklist" link at the bottom. The card keeps its height
  as items complete (completed rows switch to muted ink, they are not removed).

### 7.14 Documentation (\`/app/docs\`) and Help (\`/app/help\`)
- Docs: left 200px article list (Getting started, Writing fair criteria, How AI summaries work, Scorecards,
  Scheduling, Candidate privacy and GDPR, Plans and limits), article 640px column, H2/H3 and 14/22 body.
- Help: contact form (topic select, message, "Send"), 6 FAQ accordions, link to status page.

### 7.15 Paywall (\`/paywall\`)
- 520px card at 10% from the top: H2 "Start your 7 day free trial", three plan rows with radio selection,
  monthly/annual toggle, 4 bullets, "Start trial" button. Past due variant: "Your last payment failed"
  with "Update card".

## 8. Candidate pages

- **Careers page (\`/careers/[company]\`):** 720px column. Logo (48px), company name H1, headline (20px,
  muted), about (16px body). "Open roles" H3, list rows 64px: title (16px 500), department, location and
  workplace (faint), chevron. Footer: "Hiring with Shortlist" (Starter only) and "Your data" link.
- **Job page (\`/careers/[company]/[job]\`):** title H1, meta row (location, workplace, type, salary when
  visible) as faint text split by " · ", description, "What we look for" (the criteria as a plain list
  with "Must have" / "Nice to have" tags), then the form.
- **Apply form:** one column 560px, fields 44px high on mobile (thumb size), labels above inputs. CV
  dropzone 120px dashed ("Drop your CV here or choose a file · PDF or Word, up to 10 MB"), shows the file
  name and a remove button once chosen. Custom questions in order. Then the AI notice box (white,
  hairline, 16px padding) with the "Do not use AI on my application" checkbox, the talent pool checkbox,
  the required privacy checkbox and the "Submit application" button (46px large, full width on mobile).
  Upload progress: a 4px bar under the dropzone with "Uploading 62%" tabular; the button keeps its width
  and shows "Submitting" with the spinner overlay.
- **Applied page:** check-free confirmation: H2 "Application sent", "We have emailed you a copy.
  A person on the team reads every application. You will hear back within 10 working days." Link "See
  other roles".
- **Booking page (\`/book/[token]\`):** company logo, H2 "Pick a time for your interview", meta (title,
  duration, mode, interviewers' first names), time zone selector (detected, editable), slot picker
  (component 9). States: booked (date, time, "Add to calendar" .ics download, Meet link, "Move" and
  "Cancel" buttons), expired ("This link has expired. Reply to the email to get a new one."), no slots
  ("No times left in this window. Reply to the email and the team will send new times."), slot taken
  (inline under the confirm bar: "Someone just booked that time. Pick another.", grid refreshes in place).
- **Privacy page (\`/privacy/[company]\`):** H2 "Your data at <Company>", short explainer (what is held,
  for how long), email field, two radio options "See my data" / "Delete my data", "Send request". Success
  text replaces the form in place (same height reserved).

## 9. States

| State | Rule |
| --- | --- |
| Empty | Centred 400px block, H3 + one sentence + one button. Never an illustration bigger than 64px |
| Loading | Skeleton rows at final heights; spinners only inside buttons, after 200ms, min 400ms |
| Error (page) | "Could not load this job. Check your connection and try again." + "Try again" |
| Error (inline) | Under the field in danger ink with \`role=alert\` |
| Paused (no plan) | Banner + read-only board; actions show a lock and open the paywall |
| Offline | Toast "You are offline. Changes will retry" and the board keeps the optimistic move |
| Conflict | Someone else moved a card: it slides to its new column on the realtime event; no toast |

## 10. Motion (Shortlist moments, inside the system curves)

| Moment | Spec |
| --- | --- |
| Card lift | 120ms scale 1.02, shadow-float, no rotation with reduced motion |
| Card drop | 200ms ease-morph into place; neighbours shift with transform only |
| Realtime move from someone else | 300ms ease-morph, once |
| Side panel | 200ms, 24px from the right, overlay fades 200ms |
| AI summary arrives | rows fade up 4px, 25ms stagger, capped 200ms, once per application per session |
| Meter fill | 400ms ease-morph |
| Booking slot select | colour only, 120ms |
| Dialog morph (onboarding, booking, reject) | height 300ms, content fades up 4px after 60ms, width fixed |
Reduced motion: everything appears in its end state instantly; drag still works.

## 11. Accessibility

- Board: dnd-kit keyboard sensor and live-region announcements; every card is a button with an
  accessible name "Ana Silva, applied 3 days ago, 3 of 4 must-haves shown".
- Assessment pills have text labels, never colour alone. Must-have dots have an \`aria-label\` summary.
- Candidate form: labels tied to inputs, errors announced, the CV dropzone works with keyboard (Enter
  opens the file picker), 44px targets on mobile.
- Slot buttons are a radio group with arrow-key navigation; times read with the date ("Tuesday 22
  October, 2pm").
- Contrast: all tag ink colours above pass 4.5:1 on their fills.

## 12. Mobile

- App under 900px: sidebar becomes the 56px icon rail; the board shows one column at a time with a
  segmented stage switcher at the top (counts tabular) and cards full width; drag is replaced by the
  stage dropdown in the panel. The panel is full screen.
- Candidate pages are mobile first: check at 320, 375 and 430px. No horizontal scroll. The confirm bar on
  the booking page is fixed to the bottom with safe-area padding.

## 13. Emails

- Plain, white, 600px max, 14/22 Geist (falls back to system sans), company logo 32px on top when set.
  One link or button per email at most (white button, 1px #dcdde0 edge, 6px radius, ink text).
- Footer: privacy line, "Sent by <Company> using Shortlist" (Starter). No tracking pixels in candidate
  emails (open tracking off in Resend for the candidate stream).

## 14. Component states

| Component | States |
| --- | --- |
| Button | rest, hover (\`--hover\`), pressed (98%), focus (2px outline, 2px offset), loading (label kept, spinner overlay), disabled (ghost ink) |
| Card | rest, hover, selected, dragging, placeholder, unread, locked (interviewer) |
| Assessment pill | meets, partly, not shown, unclear; never interactive |
| Scorecard segment | empty, hover, selected (accent soft + edge), disabled (after lock) |
| Slot | available, hover, selected, taken (removed in place, grid keeps its size) |
| Meter | normal (accent), low (amber under 20% left), critical (coral under 5% left) |
| Calendar status | connected (success dot), revoked (warning dot "Reconnect"), not connected (dashed) |

## 15. Microcopy

| Place | Copy |
| --- | --- |
| Lint warning (age) | Age: describe the skill instead of the career stage or a maximum of years. |
| Publish blocked | Rewrite the flagged criterion or add a reason before publishing. |
| AI panel footer | Not shown means the CV does not mention it. Ask, do not assume. |
| Reject blocked | Open the CV first. Shortlist does not let anyone reject an application nobody has read. |
| Reject toast | Rejection email sends at 16:40 · Undo |
| Cap reached | AI summary paused: monthly limit reached. Read the CV, or upgrade for more. |
| Opted out | AI not used (candidate's choice). Read the CV in full. |
| Calendar explainer | Shortlist sees only when you are busy, never what your meetings are. |
| Booking taken | Someone just booked that time. Pick another. |
| Privacy success | If we hold data for this email, we have sent a link to confirm it is you. |
| Apply AI notice | We use AI to summarise CVs against the criteria above. A person reviews every application and makes every decision. |
| Retention line | Deletes 12 Mar |
| Toasts | Job published · Link copied · Scorecard submitted · Booking link sent · Template saved |
| Error (save) | Could not save the criterion yet. It will retry automatically. |

## 16. Hand-off checklist for Claude Code

- [ ] Tokens from DESIGN_SYSTEM.md section 11 plus the accent block in section 2 of this file. No raw hex
      in components; tag and pill colours live in one \`lib/tags.ts\` map.
- [ ] Sidebar exactly as section 6, bottom group order Documentation, Help, Billing, Settings.
- [ ] Card height fixed at 72px in every state; column count slots fixed width.
- [ ] Side panel overlays, never reflows the board.
- [ ] AI output never uses red, ticks, crosses, scores or the words hire/reject/recommend.
- [ ] Every dialog opens at 10% from the top and morphs height with constant width.
- [ ] Candidate pages checked at 320, 375, 430 and 1440px; app at 900, 1100 and 1440px.
- [ ] Reduced motion shows end states; keyboard drag works.
`
