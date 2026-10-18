// Harvest design PRD (DESIGN.md). Builds on Quiet Precision (DESIGN_SYSTEM.md).

export const designPrd = `# Harvest: design PRD

Save this file as \`DESIGN.md\` in the project root. It builds on **DESIGN_SYSTEM.md** (Quiet Precision), which
is the base design system for every screen. Save that file next to it as \`DESIGN_SYSTEM.md\`, and put this line in
\`CLAUDE.md\`:

\`\`\`md
UI rules: @DESIGN_SYSTEM.md @DESIGN.md
\`\`\`

DESIGN_SYSTEM.md decides the neutrals, type, radii, sizes, motion, components and stability rules. This file only
adds what is different for Harvest: the brand accent, the product-specific screens and the components those screens
need. Where the two disagree, this file wins only for the accent and the Harvest screens. Every stability, motion and
component rule in DESIGN_SYSTEM.md still applies: white surfaces, 1px hairlines, 6px boxes, 4px pills, 13px app
text, white buttons with a firm edge, no filled or black buttons, nothing moves under the cursor.

## 1. Brand

- **Name:** Harvest. Every post you and your competitors publish grows a crop of attention. Harvest gathers it
  every morning, sorts the good from the chaff, and hands you the basket.
- **Tagline:** Warm leads from LinkedIn posts, every morning.
- **Personality:** a quiet, early-rising research assistant. Exact numbers, plain words, never hypey. It never
  says "crush your pipeline". It says "14 people who fit your buyer reacted to yesterday's posts".
- **Feeling:** opening the app should feel like opening a well-kept ledger at 7am: calm, already sorted, one
  obvious next action (copy an opener, push to CRM).

## 2. Brand accent: field sage

Harvest swaps the system's pastel blue for a pastel sage green. It keeps the same three-part shape: a mid accent,
a soft fill and an edge. It marks "selected" and "in progress" only, exactly where the system uses blue.

| Token | Hex | Replaces | Use |
|---|---|---|---|
| \`--accent\` | #4f9d8a | \`--blue\` | Selected nav icon (duotone), progress bars, live dot, selected chip edge |
| \`--accent-soft\` | #eff7f4 | \`--blue-soft\` | Selected row, selected nav item, selected tab fill |
| \`--accent-edge\` | #c3e2d8 | \`--blue-edge\` | Selected borders, focus ring tint on selected cards |

Why a blue-leaning sage and not a leaf green: the system's success colour is #27a644. A teal-sage accent keeps
"in progress" (accent) and "done, good" (success) apart at a glance, and it never reads as a status.

Everything else is the system palette unchanged: white surfaces, \`--hairline\` #e6e6e9, \`--divider\` #efeff1,
\`--btn-edge\` #dcdde0, ink #08090a, body #3c4149, muted #62666d, faint #8a8f98, ghost #b4b8bf, success #27a644,
warning #d18b0f, danger #eb5757.

\`\`\`css
:root {
  /* Harvest accent (replaces the system blue) */
  --accent: #4f9d8a; --accent-soft: #eff7f4; --accent-edge: #c3e2d8;
  /* keep the system names pointing at the accent so shared components need no changes */
  --blue: var(--accent); --blue-soft: var(--accent-soft); --blue-edge: var(--accent-edge);
}
\`\`\`

### 2.1 Tag hues (fixed mapping)

Pastel fill at 6 to 9% opacity, darker edge of the same hue, readable ink, 4px pill, 13px text, sentence case.

| Meaning | Hue | Fill | Edge | Ink |
|---|---|---|---|---|
| Tier: Hot | coral | #fdf0ef | #f4c7c3 | #b23b31 |
| Tier: Warm | amber | #fdf6ea | #f0d9a8 | #8a5a06 |
| Tier: Cold | slate | #f3f4f6 | #dcdde0 | #62666d |
| Relation: Mine | sage (accent) | #eff7f4 | #c3e2d8 | #2f6e5f |
| Relation: Competitor | violet | #f4f2fd | #d5cff5 | #5a4bb8 |
| Relation: Influencer | sky | #eef6fc | #c6e0f3 | #2d6a99 |
| Status: Saved | sage | #eff7f4 | #c3e2d8 | #2f6e5f |
| Status: Pushed | green | #eef8f0 | #c4e6cc | #1e7a34 |
| Status: Dismissed / Customer | slate | #f3f4f6 | #dcdde0 | #62666d |
| Email: Verified | green | #eef8f0 | #c4e6cc | #1e7a34 |
| Email: Catch-all | amber | #fdf6ea | #f0d9a8 | #8a5a06 |
| Email: None | ghost text only, no pill | | | #b4b8bf |
| Source: Error | coral | #fdf0ef | #f4c7c3 | #b23b31 |

Free labels (list names, ICP names) hash to the first seven of the system's eight hues. Never invent a new pill.

### 2.2 Illustration and imagery
- No stock photos and no people illustrations in the app. Empty states use a single 48px line icon (Lucide, 1.5
  stroke, faint ink) and one sentence.
- Brand mark: a 20px square with 6px radius, white fill, 1px accent edge, containing three short vertical strokes
  of rising height in accent ink (a stylised row of crops / a bar chart). Used in the sidebar and the digest email.
- Avatars: initials in a 24px circle (the only circle in the app besides the live dot), slate tag hue. Never load
  LinkedIn profile photos (no hotlinking, no stored images).

## 3. Type and numbers

System scale, Geist 400/500/600. Numbers that change (counts, scores, meters) always use tabular numbers.
- The score is shown as a plain number (e.g. \`82\`) in a fixed 28px wide right-aligned cell, 500 weight, ink.
- Counts in the toolbar use locale formatting with singular/plural: "1 lead", "1,204 engagers".
- Dates: "Today 07:00", "Yesterday", "Tue 14 Oct". Times in the workspace timezone, never UTC in the UI.

## 4. Layout rules specific to Harvest
- Every table page follows the system: 48px toolbar (no page title), optional 44px filter bar, 36px header,
  48px rows, 48px footer bar.
- The lead side panel is 480px wide, slides 24px from the right over the page in 200ms, never reflows the table.
  Under 900px it becomes a full-height sheet.
- Dialogs: 520px max, open at 10% from the top. Add source and Connect integration are single dialogs that morph
  height between steps, width constant.

## 5. Auth screens

### 5.1 Sign up (\`/signup\`)
- Centred 400px column on white, brand mark and "Harvest" (H3) at the top, 48px from the top of the viewport.
- H2 "Start your 7 day trial". Sub (muted): "Card needed. Cancel in two clicks before day 7 and pay nothing."
- Buttons stacked, 36px, full width: **Continue with Google** (Google G icon left), hairline divider with "or"
  label, then Email, Password (show/hide icon button inside), **Create account** (primary: white with ink edge).
- Below: "Already have an account? Log in" (link, ink, underline on hover).
- Footer note (faint, 12px): "Harvest reads public engagement on posts you choose. It never logs in to LinkedIn as you."
- Errors under the field in danger ink with \`role=alert\`: "That email already has an account. Log in instead."
- Loading: the Create account label stays, a 14px spinner overlays at the right after 200ms. Width never changes.

### 5.2 Log in (\`/login\`) and reset (\`/reset\`)
- Same column. H2 "Log in to Harvest". Forgot password link right-aligned under the password field.
- Reset: H2 "Reset your password", one email field, **Send reset link**. Success replaces the form in place (step
  morph): check icon, "Check your inbox. The link works for 1 hour."

## 6. App shell and sidebar

- 240px white sidebar with a right hairline, 56px icon rail under 1100px (tooltips on hover, 300ms delay).
- Top: workspace switcher (32px, brand mark + workspace name + chevron) opens a menu: workspaces list with check,
  "Create workspace", "Workspace settings".
- Nav items (32px, Phosphor 17px, regular at rest, duotone sage when selected, selected fill \`--accent-soft\`):
  1. Today (Sun icon)
  2. Leads (UsersThree)
  3. Sources (Rss)
  4. Lists (ListBullets)
  5. Targeting (Crosshair)
- Spacer, then the usage block (see 6.1), then the bottom group with a hairline above:
  6. Documentation (BookOpen)
  7. Help (Lifebuoy)
  8. Billing (CreditCard), hidden for non-owners
  9. Settings (GearSix)
- Bottom: user row (24px initials avatar, name, menu with Log out).
- Badges: Today shows the count of new hot and warm leads as a 4px pill on the right (fixed min width 24px,
  tabular numbers), cleared when Today is opened. No other nav badges.

### 6.1 Sidebar usage block
- Two compact meters, 12px labels faint: "Engagers 1,120 / 1,500" and "Enriched 210 / 300". Meter 4px high,
  6px radius track \`--divider\`, fill accent, amber under 20% remaining, coral under 5% (system rule).
- Under the meters: "Resets 1 Nov" (faint). Click opens Billing.
- In the 56px rail the block collapses to a single 4px vertical meter (enrichments) with a tooltip.

## 7. Screens

### 7.1 Today (\`/app/today\`), the home screen
**Toolbar (48px):** left: run status component (7.10) e.g. live dot + "Processing 64%"; date selector (compact
32px button "Today, Tue 14 Oct" with chevron, menu of the last 14 runs). Right: **Collect now** (secondary button,
shows "(used today)" in faint text and is disabled with a tooltip when not available), **Open digest preview**.

**Count strip (64px, below the toolbar, hairline under):** six fixed-width cells, each with a 12px faint label
over a 20px tabular number: Engagers collected, New people, Filtered by ICP, Enriched, Hot, Warm. Numbers count up
once (300ms, morph curve) the first time per session; afterwards they update in place without animation. Clicking
"Filtered by ICP" opens Targeting > ICP with the filtered sample.

**Lead table:** columns (fixed widths): checkbox 36, Person 260 (name 500 ink, title muted on one line with
ellipsis), Company 200 (name + "51 to 200" size muted), Tier 72 (pill), Score 56 (right-aligned), Engaged with 240
(icon for reaction or comment + "Priya Shah's post" + relation pill), Email 64 (green check, amber "catch-all" dot or
ghost dash), Actions 132 (icon buttons: Copy opener, Save, Dismiss; visible on row hover and focus, using
\`visibility: hidden\` otherwise so nothing shifts).
- Row click opens the lead side panel (7.3). Rows rise once per session (system motion).
- Selection bar (floating, 16px above bottom, fixed width 560px): "3 selected" (fixed width for 3 digits),
  **Add to list**, **Push**, **Export CSV**, **Dismiss**.

**States:**
- No sources yet: centred empty state, Rss icon, "Add a post or a creator and your first harvest arrives tomorrow
  at 07:00.", button **Add source**, secondary link "See how Harvest works".
- Run scheduled: "Tonight's harvest starts at 03:00. Your digest arrives at 07:00." plus a list of the sources it
  will check (max 5, "+N more").
- Running: the table area shows skeleton rows (8 rows, 48px, \`--divider\` bars, no shimmer loop) under the live
  status. Leads appear as they are scored (realtime), each rising once.
- Quiet morning: "No new warm leads today. 214 engagers were filtered by your ICP." Buttons **Review filtered
  people** and **Add source**.
- Capped: amber callout above the table (6px box, amber edge, white fill): "You have used all 300 enrichments
  this month. New engagers are still collected and scored on their headline." **Upgrade** (primary) on the right.
- Error (some steps dead): coral text line under the count strip: "2 steps failed. We will retry tonight." with a
  **Details** link that opens a dialog listing source names and the plain-English error.

### 7.2 Onboarding (\`/onboarding\`)
One 560px card on white, opens at 10% from the top, height morphs between steps (300ms), width constant. A
4-segment progress line at the top of the card (2px, accent fill for done segments). Step label "Step 2 of 4" faint.

1. **Your workspace.** Fields: Workspace name, Your company, "What do you sell? (one line)" with placeholder
   "Onboarding software for B2B SaaS teams", Timezone (select, detected). Button **Continue**.
2. **Your buyer.** H3 "Who buys from you?" Textarea (6 rows) with the placeholder from @PRD.md 10.1. Button
   **Build my ICP** (shows "Building..." with the spinner overlay, label stays). Result morphs in below: chips for
   titles, seniorities, size range (two number inputs), industries, countries, excluded keywords. Each chip has an
   x; "+ Add" chips are dashed. Buttons **Back**, **Save and continue**.
3. **Your first source.** Input "Paste a LinkedIn post or profile link". As the user pastes, a 48px preview row
   appears under the input (reserved min-height so nothing jumps): Post or Creator tag, the url key, relation
   selector (segmented control: Mine, Competitor, Influencer). Checkbox "Collect now so I can see results in about
   15 minutes" (checked). Button **Add source**. Link "Skip, I will add sources later".
4. **Your morning email.** Digest time select (default 07:00), Minimum tier (Hot only, Warm and hot), Recipients
   (owner email shown, "+ Add teammate" disabled with "Available on Growth" if Solo). Button **Finish**.
Finish lands on Today. If Collect now was ticked, Today shows the live run status at once.

### 7.3 Lead side panel (\`/app/leads?lead=<id>\` and from Today)
480px, white, left hairline, shadow-float, header 48px with close (Esc) and prev/next arrows (J/K keys).
Sections separated by hairlines, 16px padding:
1. **Header block:** name (H3), title at company, location (muted). Right: tier pill and the score (20px, 500).
   Under it a row of quiet links: LinkedIn profile (external icon), company website.
2. **Why they fit:** up to 3 reasons as lines with a small green check, disqualifiers with a muted minus.
3. **What they engaged with:** each engagement as a 6px box with hairline: relation pill + "Priya Shah's post",
   date, 2-line post excerpt (muted, ellipsis), and for comments the comment excerpt in body ink inside quotes.
   "Open post" link.
4. **Opener:** a 6px box with \`--accent-soft\` fill and \`--accent-edge\` edge (the one place the accent fills a
   box, because this is the product's main output). Editable textarea on click, character counter "180 / 240"
   (tabular, faint, fixed width). Buttons **Copy opener** (primary) and **Rewrite** is NOT in v1, do not add it.
   If the opener is null: faint text "No opener. We could not write a safe one for this person."
5. **Contact:** email with status pill and a Copy button, company domain, company size, industry.
6. **Actions row (sticky at the bottom of the panel, 56px):** **Save to list** (menu), **Push** (menu of
   integrations), **Mark customer**, overflow menu with **Dismiss** and **Forget this person** (danger ink).
Forget opens a confirm in the same panel area (morph): "Delete Sam's data from this workspace and never collect
them again?" **Forget person** (danger edge button) and **Cancel**.

### 7.4 Leads (\`/app/leads\`)
- Toolbar: search (240px, "Search name, company or domain"), count "1,204 leads" (fixed width), right: **Export CSV**.
- Filter bar chips: Tier, Status, ICP, Source, Relation, Email, Engaged (date range), Company size. "+ Add filter"
  dashed. Defaults: Status is New or Saved.
- Same columns as Today plus Status (pill) and Last engaged (date). Footer bar: paging (50 per page) and totals.
- Empty (no leads yet): "Leads appear here after your first harvest." Empty after filters: "No leads match these
  filters." with **Clear filters**.

### 7.5 Sources (\`/app/sources\`)
- Toolbar: count "12 of 15 sources" (fixed width; amber when 2 or fewer left), **Add source** (primary).
- Table columns: Source 280 (label or url key, kind icon: FileText for a post, User for a creator), Relation 112
  (pill), ICP 140, Status 96 (Active dot green, Paused slate, Error coral pill), Last checked 120, Engagers 96, Leads
  80, Yield 80 ("6.2 per 100", tabular). Row menu: Pause or Resume, Edit, Delete.
- Add source dialog (520px, morphs): step 1 URL input with live parse preview (same 48px reserved row as onboarding),
  relation segmented control, ICP select, label (optional), Collect now checkbox (disabled with reason when used).
  **Add source**. Step 2 (morph): success line "Added. We will check it tonight at 03:00." or "Collecting now..."
  with the live dot, **Add another** and **Done**.
- Errors inline under the input: "Paste a LinkedIn post link or a profile link. Shortened lnkd.in links are not
  supported yet." / "You already track this post." with a link to it / "Your plan tracks up to 15 sources."

### 7.6 Source detail (\`/app/sources/[id]\`)
- Toolbar: back link "Sources", source label, relation pill, status, right: **Pause**, **Collect now**.
- Two tabs (system tab style, 13px, accent underline 2px on selected): Posts, Runs.
- Posts table: Post (author + 1-line excerpt), Posted, Reactions, Comments, Collected, Passes ("2 of 3" with three
  4px dots), Next pass, Leads.
- Runs table: Started, Kind, Status (live dot when running), Items, Cost (in dollars, 4 decimals, faint), Duration.
- Error banner when status is error: coral edge box with the last error and **Retry** (sets status active).

### 7.7 Lists (\`/app/lists\` and \`/app/lists/[id]\`)
- Lists index: cards are NOT used; a table with Name, Leads, Created by, Last export, menu (Rename, Delete).
  **New list** opens a small dialog with one field.
- List detail: toolbar with list name (editable inline on click), count, **Export CSV**, **Push to...** menu.
  The lead table as in 7.4 without the filter bar. Selection bar adds **Remove from list**.
- Export: clicking Export CSV downloads immediately; a toast "Exported 48 leads" (no full stop).

### 7.8 Targeting (\`/app/targeting\`)
Tabs: ICP, Suppression.
- **ICP tab:** left column 280px list of ICPs (name + "default" pill), **+ New ICP** dashed row (disabled with
  "Your plan includes 1 ICP" on Solo). Right: the selected ICP form: Name, Description (textarea), chip groups
  (Titles to include, Titles to exclude, Seniority as toggle chips, Company size two inputs, Industries, Countries,
  Excluded keywords). Threshold slider 0 to 100 with the value right (tabular) and a live hint under it:
  "About 34% of last week's engagers pass this threshold" (computed from prefilter_score, reserved line height).
  **Save** (primary) appears in a sticky 56px footer only when the form is dirty (footer space reserved).
  Below the form: "Recently filtered" table of 10 people: headline (muted), prefilter score, reason.
- **Suppression tab:** toolbar: count "1,032 suppressed", **Upload CSV**, **Add domains**. Upload dialog: drop zone
  (dashed, 120px high), accepted columns explained ("email, domain or linkedin_url"), progress morph to "Imported
  998 of 1,000 rows. 2 were not valid." Table: Value, Type pill (Email, Domain, LinkedIn), Source (CSV, Manual,
  Customer, Forget), Added, remove icon (admins only).

### 7.9 Settings (\`/app/settings\`)
Left tab list inside the page (not the sidebar): Profile, Workspace, Team, Digest, Integrations, Data. Each tab is a
640px column of grouped fields with hairline separators and a sticky Save footer when dirty.
- **Workspace:** name, timezone, collection time (select 01:00 to 05:00), digest time, your company, what you sell.
- **Team:** members table (name, email, role select, remove), **Invite** dialog (email, role). Seats line:
  "2 of 3 seats used". Disabled invite with "Available on Growth" on Solo.
- **Digest:** on/off switch, minimum tier, weekly summary switch, a preview button.
- **Integrations:** three rows (HubSpot, Pipedrive, Webhook) each with logo-free text label, status pill, last used,
  **Connect** or **Manage**. Connect dialog morphs: step 1 instructions with the exact click path (from @PRD.md 17)
  and a token input (password type, paste only), **Connect**; step 2 success with "Send test lead". For webhooks:
  URL input, then the signing secret shown once in a mono-free read-only field with **Copy** and the warning
  "Save this now. You will not see it again."
- **Data:** Import engagers CSV (fallback), Export everything (CSV zip), Delete workspace (danger zone box with
  coral edge, type the workspace name to confirm).

### 7.10 Billing (\`/app/billing\`)
- Plan card (6px box, hairline): plan name, price, interval, renewal or trial end date, **Manage billing** (opens
  Stripe Customer Portal) and **Change plan**.
- Usage: two full-width meters (Engagers, Enriched) with numbers "1,120 of 1,500", reset date, and a one-line ELI5:
  "Engagers are reactions and comments we collect. Enriched are people we looked up for a role, company and email."
- Plans table (3 columns, monthly/annual segmented toggle, the current plan has an accent edge and "Current"
  pill). Prices from lib/plans.ts.
- Paused (cancelled or past due): coral callout "Your harvest is paused. Collection and digests stop until you
  restart your plan." **Restart plan**.

### 7.11 Documentation (\`/app/docs\`) and Help (\`/app/help\`)
- Docs: a 720px reading column with a left table of contents (sticky). Sections: How Harvest works (with the
  pipeline diagram as a simple 5-step horizontal row of boxes), Sources and passes, Scores and tiers, Openers,
  Caps and usage, CSV columns, Webhook payload and signature check (code block, the only monospace allowed), CRM
  setup.
- Help: FAQ accordion (12 items), the data sources statement from @PRD.md section 5 in a hairline box, and a
  contact form (subject, message, **Send**) that emails the founder.

### 7.12 Paywall (\`/paywall\`)
- Same centred column as auth. H2 "Your harvest is paused". Body: "Your sources and leads are safe. Restart to
  collect again tomorrow morning." Buttons **Restart plan** (primary) and **Go to settings**.

### 7.13 Shared components
| Component | Spec |
|---|---|
| RunStatus | Live dot (8px circle, accent, pulses 1.4s) + label: "Scheduled 03:00", "Collecting 3 of 8 posts", "Processing 64%", "Ready", "Sent 07:00", "Failed". Fixed min width 180px. Only the dot loops. |
| CountCell | 12px faint label, 20px tabular number, fixed width per strip cell (120px). |
| TierPill | Tag hue per 2.1, text "Hot", "Warm", "Cold", 56px fixed width so the column never shifts. |
| ScoreCell | Right-aligned tabular number, 28px width. Tooltip lists the 3 reasons. |
| EngagementLine | 14px Lucide icon (ThumbsUp for reaction, MessageSquare for comment) + "Author's post" + relation pill; ellipsis on the author name, never on the pill. |
| OpenerBox | Accent-soft fill box, 13px body text, counter, Copy button (primary). |
| EmailStatus | Green check 14px (verified), amber dot + "catch-all" tooltip, ghost dash for none. |
| UsageMeter | System meter, accent fill, label left, numbers right (tabular), reset date under. |
| UrlPreviewRow | 48px reserved row; ghost text "Paste a link to preview" until valid, then kind tag + url key. |

### 7.14 Invite accept (\`/invite/[token]\`)
- Auth column layout. H2 "Join Acme Growth on Harvest". Sub: "Sam Lee invited you as a member."
- Logged out: the sign up form with the email pre-filled and locked, then accept runs after signup.
- Logged in with the right email: **Join workspace** (primary). Wrong email: coral text "This invite was sent to
  sam@acme.com. Log out and sign in with that email." **Log out**.
- Expired: "This invite has expired. Ask Sam for a new one."

### 7.15 Workspace switcher and create workspace
- Menu (portal, 240px, menu pop motion): each workspace row 32px with brand-mark initials square, name, check on
  the current one. Hairline, then **Create workspace** (opens a small dialog with one field and timezone).
- Switching keeps the current page (e.g. stays on Sources) and refetches; the sidebar never flickers: show the old
  data until the new data arrives, then swap in place.

### 7.16 State matrix (every screen must handle every column)

| Screen | Loading | Empty | Error | Paused / capped |
|---|---|---|---|---|
| Today | Skeleton count strip (bars at final width) + 8 skeleton rows | No sources / scheduled / quiet morning (7.1) | "Could not load today's harvest. Retry" inline under the toolbar | Amber capped callout; paused redirects to /paywall |
| Leads | 12 skeleton rows, toolbar count shows a ghost dash | "Leads appear here after your first harvest." | Inline error row in the table body with Retry | Read only when paused (no push) |
| Lead panel | Panel opens at once with skeleton blocks at final heights | n/a | "Could not load this lead." with Retry inside the panel | Push and Save disabled with tooltip when paused |
| Sources | Skeleton rows | "Add a post or a creator to start." with Add source | Inline row | Add source disabled at the cap, tooltip names the cap |
| Source detail | Skeleton tabs content | "No posts found yet. Creators are checked every night." | Coral banner with last error | Collect now disabled |
| Lists | Skeleton rows | "Save leads to a list to export or push them together." | Inline row | Push disabled when paused |
| Targeting | Form skeleton | n/a (a default ICP always exists) | Save error under the footer button | ICP add disabled above the plan count |
| Settings | Field skeletons | n/a | Field-level errors | Integrations connect disabled on Solo for CRMs, with "Available on Growth" |
| Billing | Plan card skeleton | n/a | "Could not reach Stripe. Try again in a minute." | Coral paused callout |

Skeleton rules: bars use \`--divider\` fill, 6px radius, the same height as the real content, no shimmer animation,
appear after 200ms and stay at least 400ms (system loading rule). Text in buttons never disappears while loading.

### 7.17 Keyboard shortcuts
| Key | Action | Where |
|---|---|---|
| J / K | Next / previous lead | Today, Leads, panel open |
| Enter | Open the focused lead | Tables |
| C | Copy opener | Panel open |
| S | Save to list (opens menu) | Panel open |
| D | Dismiss | Panel open (toast with Undo) |
| Esc | Close panel or dialog | Everywhere |
| / | Focus search | Leads, Sources |
| N | Add source | Sources |
Shortcuts are listed in Documentation and in a "?" menu in the user row. They never fire while typing in a field.

### 7.18 Buttons used in Harvest (all system buttons)
| Button | Style | Notes |
|---|---|---|
| Copy opener, Add source, Save, Connect, Restart plan | Primary: white, 1px ink edge (#08090a at 80%), 500 weight | One primary per view |
| Push, Export CSV, Collect now, Add to list | Secondary: white, \`--btn-edge\` | Push shows the count in brackets: "Push (12)", min width sized for "Push (200)" |
| Dismiss, Cancel, Back | Ghost: no edge until hover | |
| Forget person, Delete workspace | Danger: white, coral edge and coral ink | Always behind a morphing confirm |
No filled buttons anywhere, including Upgrade and the paywall.

## 8. Microcopy

| Moment | Copy |
|---|---|
| Copy opener toast | Opener copied |
| Save toast | Saved to Warm SaaS leads |
| Push toast | Pushed 12 leads to HubSpot |
| Push partial | Pushed 10 of 12. 2 had no email |
| Dismiss toast | Lead dismissed · Undo |
| Mark customer toast | Marked as customer. They will not appear again |
| Forget toast | Person forgotten |
| Collect now used | You can collect now once a day. Tonight's harvest runs at 03:00 |
| Source added | Source added |
| Cap 80% | You have used 80% of this month's enrichments. Harvest will keep the best candidates first |
| Source error | We could not read this post 3 times. It may be deleted or private. |
| Integration error | HubSpot did not accept the token. Create a new one with the scopes listed and paste it again. |
| Generic error | Could not load leads. Check your connection and try again. |

## 9. The digest email

- 600px single column, white, 1px #e6e6e9 hairlines, system font stack with Geist first, 14px body (email clients
  need 14px for legibility), no background colours except the opener box (#eff7f4 with #c3e2d8 edge, 6px radius).
- Header: brand mark (inline PNG 20px, hosted on your domain), "Harvest" 16px 600, date right-aligned muted.
- Line 1 (20px, 500): "12 warm leads from yesterday's posts". Line 2 (muted): "From 3 posts and 2 creators. 214
  engagers filtered by your ICP."
- One block per lead, 20px padding, hairline between: name (16px, 600) + tier text in tier ink ("Hot · 86");
  "Head of Customer Success at Acme (51 to 200)"; engagement line "Commented on Priya Shah's post about onboarding
  churn"; the opener box; two text buttons in a row with a 1px #dcdde0 edge and 6px radius: **Open in Harvest** and
  **Copy email** (opens the lead in the app; never a mailto).
- Footer: "8 more in Harvest" link, usage line "Enriched 210 of 300 this month", "Change digest settings",
  "Unsubscribe from digests". Muted, 12px.
- Plain text version mirrors it. Dark-mode safe: never rely on white text.

### 9.1 Other emails (same shell as the digest)

| Email | Subject | Body (short) | One button |
|---|---|---|---|
| Welcome | Your first harvest is tonight | "Add one post or creator and Harvest checks it at 03:00. Your first digest lands at 07:00." | Add a source |
| First harvest ready | Your first 9 warm leads are in | Count line, top 3 leads as in the digest, "6 more in Harvest" | Open Today |
| Quiet morning | No new warm leads today | "214 engagers were filtered by your ICP. Here are 3 of the reasons." (3 faint lines) | Review your ICP |
| Usage at 80% | You have used 80% of this month's enrichments | Meter drawn as two table cells (filled and empty, 8px high), reset date | See plans |
| Cap reached | Enrichment paused until 1 Nov | "New engagers are still collected and scored on their headline." | Upgrade |
| Source problem | We could not read one of your posts | Source label, last error in plain words, "We will stop checking it." | Open the source |
| Push failed | 3 leads did not reach HubSpot | Integration name, the error, "Reconnect with a new token" steps | Open integrations |
| Trial ending | Your trial ends on Friday | Leads found so far, hot count, what they keep on Solo vs Growth | Choose a plan |

Rules: one button per email, white with a 1px #08090a edge (no filled buttons in email either), subject lines in
sentence case with the number first where there is one, preheader text set explicitly (first 90 characters of the
body), and every email works with images off.

### 9.2 Documentation page outline (\`/app/docs\`)
1. How Harvest works: the five steps (Collect, Filter, Enrich, Score, Deliver) as five 6px boxes in a row with
   hairline arrows; under 768px they stack.
2. Sources and passes: a small table of when posts are collected (24 hours, 3 days, 7 days) and why.
3. Your ICP and the threshold: what each field does, with an example ICP for a SaaS founder, an agency and a recruiter.
4. Scores and tiers: the 40/35/25 weighting, what hot, warm and cold mean, why a comment beats a like.
5. Openers: the rules Harvest follows, and three examples (comment, reaction, competitor post).
6. Caps and usage: engagers vs enrichments, what happens at 80% and 100%, how pacing works.
7. CSV columns: the 23 columns in order with one line each.
8. Webhooks: payload example and the signature check in Node and Python (code blocks are the only monospace).
9. CRM setup: HubSpot and Pipedrive click paths with the scopes.
10. Data and privacy: the data sources statement, retention (90 and 180 days), Forget and suppression.

## 10. Motion
System motion only:
- Count strip numbers count up once per session (300ms morph curve), then update in place.
- New leads arriving by realtime rise once (360ms, 6px). Refetches never re-animate rows.
- Side panel 200ms slide over, overlay none (the table stays visible and clickable on the left above 1280px).
- Live dot is the only loop. Reduced motion: everything appears in its end state.

## 11. Responsive
- 1440px: full layout, side panel over the table.
- 1100 to 1280px: sidebar 240px, table hides Company size and Email columns (shown in the panel).
- Under 1100px: 56px icon rail.
- Under 768px: Today and Leads become a card list (one 6px box per lead: name, title, tier, score, engagement line,
  Copy opener). The selection bar becomes a bottom sheet with the same actions. Check 320, 375 and 430px.

## 12. Accessibility
- Tier is never colour alone: the pill always has the word.
- Table rows are buttons in the accessible tree with the name and tier read out ("Sam Lee, Head of CS at Acme, hot,
  score 86"). J/K and Enter for keyboard users; Esc closes the panel.
- Live run status is a polite live region; the count strip has \`aria-live="off"\` so counts do not chatter.
- Copy buttons announce "Copied" to screen readers.

## 13. Build checklist for Claude Code
1. Tokens: add the Harvest accent block to globals.css, map shadcn/ui variables to the system tokens.
2. Shell: sidebar exactly as section 6 with the usage block.
3. Components from 7.13 in components/harvest/ with stories or a /dev page showing every state.
4. Screens in the order Today, Lead panel, Leads, Sources, Add source, Targeting, Lists, Settings, Billing, Docs,
   Help, Paywall, Onboarding, auth.
5. Screenshot every screen at 1440 and 390px and compare with this file before moving on.
`
