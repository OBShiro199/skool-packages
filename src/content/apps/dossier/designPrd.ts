// Dossier design PRD (DESIGN.md). Builds on Quiet Precision (DESIGN_SYSTEM.md).

export const designPrd = `# Dossier: design PRD

Save this file as \`DESIGN.md\` in the project root. It builds on **DESIGN_SYSTEM.md** (Quiet Precision), the base
design system for every screen. Save that file next to it as \`DESIGN_SYSTEM.md\`, and put this line in
\`CLAUDE.md\`:

\`\`\`md
UI rules: @DESIGN_SYSTEM.md @DESIGN.md
\`\`\`

DESIGN_SYSTEM.md decides the neutrals, type, radii, sizes, motion, components and stability rules. This file only
adds what is different for Dossier: the brand accent, the product screens and the components those screens need.
Where the two disagree, this file wins only for the accent and the Dossier screens. Every stability, motion and
component rule in DESIGN_SYSTEM.md still applies: white surfaces, 1px hairlines, 6px boxes, 4px pills, 13px app
text, white buttons with a firm edge, no filled or black buttons, nothing moves under the cursor.

## 1. Brand

- **Name:** Dossier. A dossier is the folder of evidence you hand over when someone asks you to prove something.
  That is the product: every answer arrives with its evidence attached.
- **Tagline:** Security questionnaires, answered from your own documents.
- **Personality:** a calm, exact compliance lead. Never salesy, never vague, always shows its sources.
- **Feeling to aim for:** a well-kept audit binder. Ruled lines, clear labels, nothing decorative.
- **Logo:** a 20px square folder outline (1.5px stroke) with one short tab, the tab filled in the accent. Wordmark
  "Dossier" in Geist 600, 16px, tracking -0.02em.

## 2. Brand accent: archive teal

Dossier swaps the system's pastel blue for a pastel teal. It keeps the same three parts: a mid accent, a soft fill
and an edge. It marks "selected" and "in progress" only, exactly where the system uses blue.

| Token | Hex | Replaces | Use |
|---|---|---|---|
| \`--accent\` | #3f9a9c | \`--blue\` | Selected nav icon (duotone), progress bars, live dot, selected citation ring |
| \`--accent-soft\` | #eef7f7 | \`--blue-soft\` | Selected row, selected nav item, selected question, highlighted quote in a passage |
| \`--accent-edge\` | #bfe0e0 | \`--blue-edge\` | Selected borders, the focused pane edge, the mapped column outline |

Why teal and not blue or green: blue reads as a link inside dense answer text, and green is the system's success
colour, which Dossier uses for "Approved". Teal keeps "selected" apart from "approved" at a glance.

Everything else is the system palette unchanged: surface #ffffff, row hover #fafafb, hover #f5f5f6, hairline
#e6e6e9, divider #efeff1, button edge #dcdde0, ink #08090a, body #3c4149, muted #62666d, faint #6f747c, ghost
#b4b8bf, success #27a644, warning #d18b0f, danger #eb5757.

\`\`\`css
:root {
  /* Dossier accent (replaces the system blue) */
  --accent: #3f9a9c; --accent-soft: #eef7f7; --accent-edge: #bfe0e0;
  /* keep the system names pointing at the accent so shared components need no changes */
  --blue: var(--accent); --blue-soft: var(--accent-soft); --blue-edge: var(--accent-edge);
}
\`\`\`

### 2.1 Status tag hues

Status maps to fixed tag hues: pastel fill at 6 to 9% opacity, a darker edge, readable ink, 4px pill, 13px text.

**Questionnaire status**

| Status | Label | Fill | Edge | Ink |
|---|---|---|---|---|
| uploading, parsing | Reading file | #eef7f7 | #bfe0e0 | #24696b |
| mapping | Check columns | #fdf6e7 | #f0d9a8 | #8f5d05 |
| ready | Ready to draft | #f5f5f6 | #dcdde0 | #62666d |
| drafting | Drafting | #eef7f7 | #bfe0e0 | #24696b |
| in_review | In review | #f4f2fd | #d5cff5 | #5446b8 |
| approved | Approved | #eef8f1 | #bfe3c9 | #1d7a35 |
| exported | Exported | #eef8f1 | #bfe3c9 | #1d7a35 |
| failed | Failed | #fdf0f0 | #f6c9c9 | #b33a3a |

**Question status**

| Status | Label | Fill | Edge | Ink |
|---|---|---|---|---|
| new, queued | Not drafted | #f5f5f6 | #dcdde0 | #62666d |
| drafting | Drafting | #eef7f7 | #bfe0e0 | #24696b |
| drafted | Drafted | #f4f2fd | #d5cff5 | #5446b8 |
| needs_review | Needs review | #fdf6e7 | #f0d9a8 | #8f5d05 |
| approved | Approved | #eef8f1 | #bfe3c9 | #1d7a35 |
| skipped | Not applicable | #f5f5f6 | #dcdde0 | #6f747c |
| failed | Failed | #fdf0f0 | #f6c9c9 | #b33a3a |

**Confidence bands** (ConfidenceBadge, section 4)

| Band | Range | Fill | Edge | Ink |
|---|---|---|---|---|
| High | 85 to 100 | #eef8f1 | #bfe3c9 | #1d7a35 |
| Medium | 70 to 84 | #f1f5fd | #c4d4f5 | #3a5fb8 |
| Low | 0 to 69 | #fdf6e7 | #f0d9a8 | #8f5d05 |

Low is amber, not coral: a low score is a prompt to check, not an error. Coral is kept for failures.

Free labels (library tags, document kinds, sections) hash to the first seven of the system's eight tag hues.

## 3. Type in Dossier

Geist 400, 500, 600 as in the system. App UI text is 13/18 everywhere, including answer text in tables. Dossier adds
one reading style inside the system's size scale:

| Role | Size / line height | Weight | Where |
|---|---|---|---|
| Answer editor text | 14 / 22, max 72 characters wide | 400 | The centre pane of the review workspace |
| Question text in the editor | 16 / 24 | 500 | Above the answer, \`text-wrap: balance\` |
| Passage text in the evidence panel | 13 / 20 | 400 | Quotes highlighted with \`--accent-soft\` |
| Counts and confidence | 13 / 18, tabular-nums | 500 | Everywhere digits change |

No monospace anywhere, including cell references ("Sheet Security, D47"), which use tabular figures.

## 4. Components (Dossier-specific)

Build every component from DESIGN_SYSTEM.md section 07. Dossier adds:

- **ConfidenceBadge:** 4px pill, band hue from 2.1, label "High 92" with the number in tabular figures. Fixed width
  for "Medium 100" so a redraft never resizes the column. Tooltip: "Based on how closely the cited passages match
  the question and how sure the model was."
- **FlagChip:** small tag next to the badge: "No source", "Stale source", "Sources disagree", "Model unsure". Amber
  hue. At most two shown, then "+N" (always visible, per the system's chip rule).
- **CitationChip:** "[1] Information Security Policy, p. 7" in a 4px pill, white with a hairline edge. Hover: hover
  fill. Selected: \`--accent-soft\` fill and \`--accent-edge\` edge. Clicking scrolls the evidence panel to that passage.
  Library citations read "[L] Library: Encryption at rest (Priya Shah)".
- **EvidenceCard:** 6px box, hairline edge, 16px padding. Header: document title (500), page, effective date (faint).
  Body: the passage with the quoted part highlighted in \`--accent-soft\`. Footer: "Open source" text button and the
  rerank score as "Match 0.82" in faint tabular figures. Fixed min-height of 120px while loading.
- **AnswerEditor:** a plain textarea styled as the reading style in section 3 (not a rich text editor: answers are
  plain text and exported to cells). Above it, for yes/no questions, a 4-option segmented control (Yes, No,
  Partial, N/A) at 32px. Below it, a status line with reserved min-height (18px): "Saved", "Saving", or the error.
- **MappingGrid:** a read-only grid of the first 40 rows of a sheet, 32px rows, column letters in the 36px header.
  The question column has an \`--accent-edge\` outline and a "Questions" label; the answer column a dashed edge (an
  "add" affordance, allowed by the system) and an "Answers go here" label; the section column a faint "Section"
  label. Clicking a column header opens a menu: Questions, Answers, Detail, Section, Ignore.
- **RunProgress:** a 4px accent bar with "Drafting 142 of 388" in tabular figures to its left and a live dot.
  Width eases over 400ms with the morph curve. When done: "388 drafted, 41 need review" and the dot stops.
- **UsageMeter:** the system meter. Accent fill, amber under 20% left, coral under 5%. "612 of 1,000 questions".
  Fixed width for four-digit counts.
- **AssigneePicker:** a menu (portal, 160ms pop) listing members with avatar, name and role. Typing filters. "Due"
  date input underneath. Trigger shows a 20px avatar or a dashed "Assign" pill.
- **SelectionBar:** the system's floating bar: "12 selected", Approve, Assign, Redraft, Not applicable, Clear. Every
  action has a minimum width sized for "Approve (999)".
- **CommentThread:** stacked comments, 13px, author 500, time faint. Input at the bottom, 36px, grows to 4 lines.
  "@" opens the member menu. Plain text only.
- **LibraryReuseNote:** a single line above the answer: "From the library: Encryption at rest, owner Priya Shah,
  review by 10 Jan 2027". Stale: same line in warning ink, "Review date passed on 2 Oct 2026".
- **EmptyState:** a single-line illustration (1.5px stroke, accent and ink only: a folder with one page sticking
  out), one sentence, one primary button. Max 320px wide, centred in the content area.

## 5. Icons

Navigation uses Phosphor at 17px (regular at rest, duotone in the accent when selected); in-content icons use
Lucide 14 to 16px with a 1.5 stroke. Never mixed in a row.

Sidebar (Phosphor): ClipboardText (Questionnaires), Books (Library), Folders (Sources), UserCircleCheck (Assigned to
me), ClockCounterClockwise (Activity), BookOpen (Documentation), Lifebuoy (Help), CreditCard (Billing), Gear
(Settings).

In-content (Lucide): FileSpreadsheet (XLSX), FileText (DOCX), FileType (PDF), ClipboardPaste (paste), Quote
(citation), ShieldCheck (approved), AlertTriangle (flag), MessageSquare (comments), Download (export), RefreshCw
(redraft), UserPlus (assign).

## 6. App shell

Per the system: no top bar and no page titles. A white 240px sidebar with a right hairline, then each page starts
with its 48px page toolbar.

\`\`\`
+----------------------+-------------------------------------------------------------------+
| [folder] Dossier     | Toolbar 48px: [search]  14 questionnaires    [New questionnaire]  |
| Northwind Cloud  v   |-------------------------------------------------------------------|
|                      | Filter bar 44px: [Status: In review +1] [Owner: Me] [+ Add filter]|
| Questionnaires       |-------------------------------------------------------------------|
| Library              | Table header 36px                                                 |
| Sources              | Rows 48px ...                                                     |
| Assigned to me    3  |                                                                   |
| Activity             |                                                                   |
|                      |                                                                   |
| (spacer)             |                                                                   |
| [612 of 1,000 qs]    |                                                                   |
| Documentation        |                                                                   |
| Help                 |                                                                   |
| Billing              |-------------------------------------------------------------------|
| Settings             | Footer bar 48px: paging, totals                                   |
+----------------------+-------------------------------------------------------------------+
\`\`\`
- Top group: folder mark + "Dossier", the workspace switcher (only if the user belongs to more than one), then
  Questionnaires, Library, Sources, Assigned to me (with a count pill, fixed width for "99+"), Activity.
- Bottom group, always in this order: Documentation, Help, Billing, Settings. Above it, a compact UsageMeter ("612
  of 1,000 questions") that links to Billing.
- One level, no nested menus, 9 items. Nav items 32px high, 6px radius. Selected: \`--accent-soft\` fill, ink text,
  duotone accent icon. Hover: \`--hover\`.
- Only the owner sees Billing; everyone sees the usage meter, read-only.
- Under 1100px the sidebar collapses to 56px icons with tooltips. Under 768px it becomes a sheet from the left that
  floats over the page, opened from a 32px icon button at the left of the toolbar.
- Account menu: avatar at the bottom of the sidebar (Profile, Log out).
- Keyboard: \`n\` new questionnaire, \`g q\` questionnaires, \`g l\` library, \`g s\` sources, \`/\` search, \`?\` shortcuts.

## 7. Screens

All screens: 13px UI text, 36px controls, fixed column widths, single-line cells with ellipsis, white everywhere.

### 7.1 Auth (\`/login\`, \`/signup\`, \`/reset\`)
- Centred 400px column on white, the logo above, H2 "Log in to Dossier" / "Start your 7 day trial".
- Fields: work email, password (signup adds full name and company name). 36px inputs, labels above in faint ink.
- Primary "Create account" (white, firm edge, full width). "Continue with Google" secondary below a hairline with
  "or".
- Under the form, one faint line: "Your documents are never used to train AI models." linking to /security.
- Errors under the field with \`role=alert\`: "That email already has an account. Log in instead."
- Loading: the button keeps its label, spinner overlaid after 200ms, minimum 400ms.

### 7.2 Onboarding (\`/onboarding\`)
One 520px card that morphs height between steps (system step morph, width constant). A 3-dot step indicator at the
top in tabular figures ("Step 2 of 3").
1. **Your company:** workspace name, legal company name, website, HQ country, hosting provider (select: AWS, Google
   Cloud, Azure, Other), data regions (chips), SOC 2 status (None, In progress, Type I, Type II), ISO 27001 (Yes or
   No). Helper: "These facts are in every draft, so the AI never guesses them." Primary "Continue".
2. **Add your sources:** a dashed drop zone, 160px high: "Drop policies, your SOC 2 summary, past questionnaires and
   product docs. PDF, DOCX, XLSX, MD or TXT." Uploaded files list underneath with live status pills. "Continue" is
   enabled after one file; "Skip for now" text button.
3. **Your first questionnaire:** drop zone for XLSX, DOCX or PDF, or "Paste questions instead". "Finish" goes to the
   questionnaire; "Skip" goes to the list.

### 7.3 Questionnaires list (\`/app/questionnaires\`)
- Toolbar: search, count "14 questionnaires", primary "New questionnaire".
- Filter bar: Status, Owner, Buyer, Due (this week, overdue). "+ Add filter" dashed.
- Columns (fixed widths): file-type icon 32px, Name 280px, Buyer 180px, Questions 96px (tabular), Progress 160px
  (thin bar plus "212 / 388"), Low confidence 96px, Due 112px (overdue in danger ink), Status 132px, Owner 40px avatar.
- Row click opens the review workspace. Row menu: Rename, Change due date, Duplicate mapping, Delete (admin).
- Empty: illustration, "No questionnaires yet. Upload the next one a buyer sends you.", primary "Upload a
  questionnaire".

### 7.4 New questionnaire (\`/app/questionnaires/new\`)
- 640px centred column. Tabs: Upload file, Paste questions.
- Upload: drop zone 200px, accepted types listed, max 50 MB. Fields: Name (prefilled from the file name), Buyer,
  Due date, Owner (defaults to you).
- Paste: textarea 320px high, placeholder showing three example questions and a section line. Live count under it
  ("42 questions found") with reserved height.
- Primary "Upload and read" / "Create questionnaire". Then the RunProgress-style "Reading file" line in place.

### 7.5 Mapping (\`/app/questionnaires/[id]/mapping\`)
- Toolbar: back arrow, questionnaire name, "Step: check columns", primary "Confirm and create 388 questions".
- Left rail 240px (inside the content, not a page reflow): list of sheets (or DOCX tables) with a checkbox to
  include, the sheet name, and a guessed row count. Excluded sheets in faint ink with the reason ("Instructions").
- Main: MappingGrid of the selected sheet. Above the grid a 44px bar: "Header row 3", "Questions in column B",
  "Answers go in column D", "Detail in column E", "Section in column A", each a select at 32px.
- A warning callout when a guess was weak: "We were not sure which column holds the answers on this sheet. Check
  it before you continue."
- Merged answer cells show a small amber chip "Merged cell" in the grid.

### 7.6 Review workspace (\`/app/questionnaires/[id]\`)
The core screen. Three panes, all white, split by hairlines. Panes never reflow each other.

\`\`\`
+----------------------------------------------------------------------------------------------+
| Toolbar: < Questionnaires  Acme Corp vendor review   [RunProgress]   [Draft all (388)] [Export]|
| Filter bar: [Needs review] [Section: Encryption +2] [Assignee: Me] [+ Add filter]             |
+-------------------------+----------------------------------------------+---------------------+
| Question list 320px     | Editor                                       | Evidence 360px      |
| [ ] 4.1 Is data enc...  | Section 4: Encryption          Sheet D47     | Citations           |
|     High 92  Approved   | Is customer data encrypted at rest?          | [EvidenceCard 1]    |
| [ ] 4.2 Describe key... | Describe the algorithm.                      | [EvidenceCard 2]    |
|     Low 41  No source   | [Yes] [No] [Partial] [N/A]                   | [EvidenceCard L]    |
| [ ] 4.3 ...             | +------------------------------------------+ |                     |
|                         | | We encrypt all customer data at rest     | | Search sources and  |
|                         | | with AES-256 ... [1] [2]                 | | library [______]    |
|                         | +------------------------------------------+ |                     |
|                         | Saved                                        |                     |
|                         | [Approve] [Redraft v] [Assign] [Not appl.]   | Comments (2)        |
|                         | Confidence High 92 · From the library ...    | [CommentThread]     |
+-------------------------+----------------------------------------------+---------------------+
\`\`\`
- **Question list:** 56px rows (two lines: number + truncated question; badge + status). Checkbox for bulk
  select. Selected row: \`--accent-soft\`. Unread comments: a 6px accent dot right-aligned.
- **Editor:** question (16/24, 500), locator in faint ("Sheet Security, D47"), segmented control for yes/no, the
  AnswerEditor, the status line, then the action row: primary "Approve" (firm edge), "Redraft" with a menu (Shorter,
  More detail, Say yes and explain, Say no and explain, Custom instruction...), "Assign", "Not applicable". Below,
  ConfidenceBadge, FlagChips and the LibraryReuseNote. The model's note (reviewer only) in a faint box: "Note from
  the draft: two policies give different retention periods."
- **Evidence:** citations as EvidenceCards in citation order, then the search box (ds-library-search), then
  Comments. The pane scrolls on its own.
- **Approve with library:** the Approve button has a split menu: "Approve", "Approve and save to library" (default
  for reviewers, remembered per user), "Approve and update library answer".
- **Draft all:** opens a 520px dialog: "Draft 388 questions? You have 612 of 1,000 left this month." Primary "Draft
  388 questions". If over cap, the dialog morphs to the over-cap step (section 15). Never a second dialog.
- **Live:** drafts appear row by row as Realtime delivers them; each row's badge fades in (200ms) but rows do not
  re-animate on refetch.
- **Presence:** "Priya is editing" line in the status line slot, editor read-only for others.

### 7.7 Export (\`/app/questionnaires/[id]/export\`, also opened as a dialog from the toolbar)
- 520px dialog. Format radio list with icons: "Original file (XLSX)" (default for XLSX), "Original file (DOCX)",
  "Filled PDF form" (only when form fields exist), "Answers as XLSX", "Answers as DOCX", "CSV".
- Toggle "Only approved answers" (default on). Under it: "262 approved, 126 not yet. Unapproved answers are left
  blank." in faint ink, reserved height.
- Primary "Export (262 answers)". Then the dialog morphs to "Preparing your file" with a live dot, then "Ready" with
  "Download" (signed URL) and the file size.
- Export history table underneath on the full page: format, answers, by, when, Download.

### 7.8 Library (\`/app/library\`)
- Toolbar: search (semantic, through ds-library-search), count "486 answers", "Import from a past questionnaire",
  primary "New answer".
- Filter bar: Status (Approved, Draft, Archived), Owner, Tag, Review (Due in 30 days, Overdue).
- Columns: Question 360px, Short 72px, Owner 40px avatar, Review by 112px (overdue in warning ink), Used 64px
  (tabular), Last used 112px, Tags 160px, Status 112px.
- Row opens \`/app/library/[id]\` in a side panel from the right (200ms, overlays, never reflows).
- Empty: "Approved answers land here so you never write the same answer twice." primary "Import a past
  questionnaire".

### 7.9 Library answer (\`/app/library/[id]\`)
- Side panel 520px: question (16/24), short answer control, answer textarea, owner picker, review-by date, tags.
- "Other ways buyers ask this" list (library_variants) with remove buttons.
- "Used in" list: questionnaire, buyer, date. History: from audit events, "Edited by Sam, 3 Oct 2026".
- Actions: Save, Archive, Mark reviewed (sets review_by to today + default days).

### 7.10 Library import (\`/app/library/import\`)
- After uploading a past questionnaire as a source with kind "Past questionnaire": a table of found Q and A pairs
  with checkboxes, Question, Answer (2-line clamp), Duplicate of (if an approved answer matches), Owner select.
- SelectionBar: "Approve 120 into the library", "Discard".

### 7.11 Sources (\`/app/sources\`)
- Toolbar: search, count, primary "Upload sources".
- Filter bar: Kind (Policy, SOC 2, Past questionnaire, Product, Other), Status, Uploaded by.
- Columns: type icon 32px, Title 320px, Kind 140px tag, Pages 72px, Passages 88px, Effective 112px, Status 120px,
  Updated 112px. Status shows the live dot while extracting or embedding ("Reading 40%").
- Drag files anywhere on the page: a full-page dashed overlay (portal) "Drop to add to your sources".
- Empty: "Add the documents your answers should come from." primary "Upload sources".

### 7.12 Source detail (\`/app/sources/[id]\`)
- Two panes: page list (text by page, passages separated by divider hairlines) and the right pane "Cited in 34
  answers" with links. Edit title, kind and effective date in the toolbar. "Archive" (keeps old citations).

### 7.13 Assigned to me (\`/app/assigned\`)
- Grouped by due date (Overdue, Today, This week, Later), 48px rows: question, questionnaire, badge, due. Row opens
  the review workspace at that question.
- Empty: "Nothing assigned to you. Nice."

### 7.14 Activity (\`/app/activity\`)
- Table: time 140px, person 180px, action 200px ("Approved 12 answers"), item 320px, detail menu. Filters: Person,
  Action, Date. "Export CSV" (Business and Scale; on Team it shows a plan chip).

### 7.15 Billing (\`/app/billing\`, owner only)
- Plan card: name, price, renewal date, "Manage billing" (Stripe portal).
- Meters: Questions this month, Parsed pages, Seats, Storage. Each a UsageMeter with "Resets on 1 Nov".
- Plan comparison table for upgrade with the three plans and a monthly/annual toggle that never moves the cards.

### 7.16 Settings (\`/app/settings\`)
Tabs (36px, underline in the accent): Profile, Workspace, Team, Notifications, Data.
- **Workspace:** company facts form (same fields as onboarding plus "Other facts" key/value rows), confidence
  threshold slider (50 to 90, default 70, value in tabular figures), answer style (tone: Plain, Formal; length:
  Short, Standard, Detailed; person: We, The company), default review period (90, 180, 365 days).
- **Team:** members table (name, email, role select, last active, remove), invite form (email, role), open
  invites with Revoke. Seat meter on top: "4 of 5 seats".
- **Notifications:** toggles for assignment, mention, due reminders, review reminders, daily digest.
- **Data:** the data handling statement from PRD 12.2, the subprocessor table, "Delete workspace" (owner, type the
  name to confirm, danger text button with a firm danger edge, still white).

### 7.17 Documentation and Help
- **Documentation:** a two-column page: left a list of articles (Supported formats, How confidence works, How the
  library is reused, Data handling, Keyboard shortcuts), right the article at 65 characters wide.
- **Help:** a contact form (subject, message) and links to Documentation and the status page.

### 7.18 Paywall (\`/paywall\`)
- 520px card: "Your trial has ended" or "Your subscription is paused". The three plans in a compact table and a
  primary "Choose a plan" (Stripe Checkout). Data is kept: "Your sources, library and questionnaires are safe."

## 8. States

| Screen | Empty | Loading | Error |
|---|---|---|---|
| Questionnaires | Illustration + "Upload a questionnaire" | Skeleton rows, 48px, 8 rows | "Could not load questionnaires. Retry." inline above the table |
| Mapping | n/a | Grid skeleton with fixed 40 rows | "We could not read this file. It may be password protected. Remove the password and upload it again." |
| Review workspace | "No questions found in this file. Check the columns." with "Open mapping" | Question list skeleton; editor shows the question as soon as it loads | Per question: failed pill with "Retry"; whole page: inline banner |
| Evidence panel | "No passages found. Add a source that covers this, or answer by hand." | 3 EvidenceCard skeletons at 120px | "Search is not available right now. Try again in a minute." |
| Library | Illustration + "Import a past questionnaire" | Skeleton rows | Inline banner |
| Sources | Illustration + "Upload sources" | Skeleton rows | Per row: failed pill + error tooltip + "Retry" |
| Export | n/a | "Preparing your file" with live dot (dialog keeps its height) | "Could not build the file. We have been told and it will retry automatically." |

Skeletons are hairline boxes with a 1.4s opacity pulse between 0.5 and 1 (the live loop), shown after 200ms.

## 9. Motion (Dossier moments, within the system curves)

| Moment | Spec |
|---|---|
| A draft arrives in the list | Badge and status fade in over 200ms with the out curve; the row itself does not move |
| Approve | The status pill crossfades to Approved (160ms); a toast "Answer approved" rises 8px bottom left |
| Bulk approve | One toast "12 answers approved", never 12 toasts |
| Citation click | The evidence panel scrolls smoothly to the card (300ms) and the card's edge goes accent for 1.2s |
| RunProgress | Width eases 400ms with the morph curve per update |
| Dialog steps (Draft all, Export) | System step morph: height 300ms, content fades up 4px after 60ms, width fixed |
| Side panel (library answer, source) | Slides 24px from the right over the page in 200ms |
| Reduced motion | Everything appears in its end state instantly; the live dot is a static dot |

## 10. Accessibility

- Every control has a visible focus ring (2px outline, 2px offset). The three panes are landmarks
  (\`nav\` for the question list, \`main\` for the editor, \`complementary\` for evidence).
- Question list is a \`listbox\` with \`aria-activedescendant\`; \`j\`/\`k\` move the selection.
- ConfidenceBadge has text, not only colour ("Low 41"). FlagChips have text.
- RunProgress is a \`progressbar\` with \`aria-valuenow\` and \`aria-valuemax\`.
- Toasts are a polite live region. Escape closes dialogs, menus and panels.
- Contrast: all tag inks pass 4.5:1 on their fills. Faint text uses #6f747c.

## 11. Responsive

- The review workspace is a desktop tool. Under 1100px the evidence pane becomes a side panel opened from an
  "Evidence (3)" button. Under 768px the question list becomes a sheet and the editor fills the screen.
- Tables scroll sideways inside their container with the first column sticky; the page never scrolls sideways.
- Check every screen at 320, 375, 430, 768, 1280 and 1440px.

## 12. Emails (React Email)

- 560px white container, logo at the top, 14/22 body text in Geist with a system fallback, one white button with a
  1px #08090a edge (no fill), footer in faint ink with the workspace name and a notification settings link.
- Assignment email: "Sam assigned you 12 questions in Acme Corp vendor review, due Thursday 23 Oct." List of up to
  5 question numbers and sections, then "Open my questions".
- No answer text, passages or document names in any email.

## 13. Component states

| Component | Default | Hover | Active / selected | Disabled | Loading |
|---|---|---|---|---|---|
| Primary button | White, 1px #08090a edge | Hover fill | Press to 98% | Ghost ink, hairline edge | Label stays, spinner overlaid |
| Secondary button | White, #dcdde0 edge | Hover fill | Press to 98% | Ghost ink | Same |
| Question row | White | Row hover | \`--accent-soft\` | n/a | Skeleton |
| CitationChip | White, hairline | Hover fill | Accent soft + edge | n/a | n/a |
| Mapping column | Hairline | Hover fill on header | Accent edge (questions), dashed (answers) | Faint (ignored) | Skeleton |
| Segmented control | White | Hover fill | Accent soft + edge | Ghost | n/a |

## 14. Microcopy

| Place | Copy |
|---|---|
| Draft all button | Draft all (388) |
| Draft dialog | Draft 388 questions? You have 612 of 1,000 left this month. |
| Over cap | This questionnaire has 420 questions and you have 388 left this month. Draft the first 388, or upgrade to Business. |
| Cap reached | You have used all 1,000 questions this month. Drafting starts again on 1 Nov, or upgrade now. |
| Low confidence tooltip | We could not find strong evidence for this answer. Check it before you approve. |
| No source flag | No source found. Answer by hand or add a document that covers this. |
| Stale flag | The library answer used here passed its review date. |
| Conflict flag | Two sources say different things. The note explains which. |
| Approve toast | Answer approved |
| Saved to library toast | Saved to the library |
| Export ready | Your file is ready |
| Duplicate source | Already in your sources |
| File locked | We could not read this file. It may be password protected. Remove the password and upload it again. |
| Unsupported | Dossier reads XLSX, DOCX, PDF, Markdown and text files. |
| Assign toast | 12 questions assigned to Priya |
| Seat limit | Your plan has 5 seats and all are in use. Remove someone or upgrade. |
| Data statement (short) | Your documents and answers are never used to train AI models. |
| Paywall | Your trial has ended. Your sources, library and questionnaires are safe. |

## 15. Over-cap flow (one dialog, morphing)

1. Step 1: "Draft 420 questions?" with the meter. Primary "Draft 420 questions".
2. Server returns 409 \`over_cap\`: the dialog morphs (same width) to "You have 388 left this month." Two buttons:
   primary "Draft the first 388" (calls again with \`allow_partial: true\`), secondary "Upgrade to Business" (opens
   Billing in a new tab). Text button "Cancel".
3. Never stack a second dialog.

## 16. Hand-off checklist for Claude Code

- [ ] Accent tokens in \`globals.css\` and the system names pointed at them.
- [ ] Sidebar exactly as section 6, bottom group Documentation, Help, Billing, Settings.
- [ ] Every count uses tabular figures and every button with a count has a minimum width.
- [ ] The review workspace panes never reflow each other; panels overlay.
- [ ] Draft and Export flows are one morphing dialog each.
- [ ] Answers and comments render as text, never HTML.
- [ ] Reduced motion shows end states. Focus rings everywhere.
- [ ] Screenshots at 375 and 1440 for: questionnaires, mapping, review workspace, library, sources, billing.
`
