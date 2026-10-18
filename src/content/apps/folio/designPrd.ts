// Folio design PRD: builds on Quiet Precision (DESIGN_SYSTEM.md). Only brand accent, product screens and components.

export const designPrd = `# Folio: design PRD

## 0. How to use this file
- **Base design system: \`DESIGN_SYSTEM.md\` (Quiet Precision).** Copy it into your project root next to this
  file, saved as \`DESIGN.md\`. CLAUDE.md imports both: \`UI rules: @DESIGN_SYSTEM.md @DESIGN.md\`.
- Everything in DESIGN_SYSTEM.md applies unchanged: white surfaces split by 1px hairlines, the neutrals,
  Geist 400/500/600, 13px app text, the one size scale, 6px boxes and 4px pills, white buttons with a firm edge
  (no filled or black buttons), the 48px page toolbar with no page titles, the motion curves, and every
  stability rule in its section 08.
- This file only adds three things: **the Folio accent** (section 1), **the components Folio needs** (section 3)
  and **the Folio screens** (section 4 onwards). Where the two disagree, this file wins only for the accent and
  for Folio screens. If a screen here seems to need a new size, colour or shape, reuse one from
  DESIGN_SYSTEM.md instead.
- In Claude Code: "Use @DESIGN_SYSTEM.md and @DESIGN.md for every screen. Tokens first, then the app shell,
  then each page."

## 1. Brand accent
Folio swaps the base pastel blue for a pastel violet. Same role: it marks "selected" and "in progress",
nothing else. It is never a button fill.
| Token | Hex | Use |
|---|---|---|
| \`--accent\` | #8b74e3 | Selected text and icons, progress bars, live dots, focus inside the slide rail |
| \`--accent-soft\` | #f5f3fd | Selected fill: active nav item, selected slide row, selected calendar day |
| \`--accent-edge\` | #d8cff6 | Selected border: selected layout card, selected slide thumbnail, chosen preset |
Add them to the starter tokens and map the base names so shared components pick them up:
\`\`\`css
:root {
  --accent: #8b74e3; --accent-soft: #f5f3fd; --accent-edge: #d8cff6;
  --blue: var(--accent); --blue-soft: var(--accent-soft); --blue-edge: var(--accent-edge);
}
\`\`\`
- Light only, as in the base. No dark mode.
- Status tags use the base tag hues (pastel fill at 6 to 9%, darker edge, readable ink):
  draft grey, writing violet, ready blue, exporting violet with a live dot, exported teal, scheduled blue,
  published green, failed coral, archived grey.
- **The slides are the exception.** Slide canvases use the customer's brand kit colours and fonts, because they
  are the export. Everything around the slide (rail, inspector, dialogs) stays Quiet Precision.

## 2. Brand feel
- **A quiet studio for loud slides.** The app is white, hairlines and 13px text so the colourful slides are the
  only thing that stands out on screen.
- Words for every decision: **calm, exact, quick**.
- Marketing pages (\`LANDING.md\`) are square and more expressive; the app is not.

## 3. Components Folio adds
All built from base tokens: 36px controls, 6px radius, 1px hairlines, Geist 13px, white buttons.
| Component | Spec |
|---|---|
| \`BrandSwitcher\` | Sits under the logo in the sidebar. 32px row: 20px brand avatar (logo, or initials on the brand accent at 9% opacity with its edge), brand name in 500, chevron. Opens a menu (portal, 160ms pop) listing brands with a check on the active one and a dashed "+ Add brand kit" row when the plan allows |
| \`UsageMeter\` | Sidebar block above the bottom group. Label "Carousels this month" (faint), value "9 of 15" (tabular, ink), 4px bar. Accent fill, amber under 20% left, coral under 5% left, as the base meter. Width eases 400ms with the morph curve. Fixed height so it never shifts the nav |
| \`SourceTabs\` | Segmented control of four 36px tabs (Link, PlayCircle, Lightbulb, Mic icons in Lucide 16px): Blog URL, YouTube, Idea, Voice note. Selected tab: accent-soft fill and accent-edge border. The panel under it keeps a fixed min-height (240px) so switching tabs never resizes the card |
| \`VoiceRecorder\` | 46px large round-cornered (6px) white button with a red 8px dot and "Record". While recording: the dot pulses (the one allowed loop), a tabular timer "01:24 / 10:00" with a fixed width, and 32 bars of level meter in \`--faint\`. Stop, Play back, Re-record, Use this note as 36px buttons in a row with fixed min-widths |
| \`JobProgress\` | A vertical list of steps in one card: 20px circle per step (hairline ring idle, accent ring with live dot when running, success tick when done, danger mark when failed), label in 13px, live status on the right ("Reading the page 40%", tabular). Rows reserve their height before they start |
| \`SlideCanvas\` | A fixed 1080 wide box scaled with \`transform: scale()\` to fit the centre column. White page around it, 1px hairline frame, no shadow. Never resizes when text changes: the slide fits text inside itself |
| \`SlideRail\` | 48px rows: drag handle (visible on hover via \`visibility\`), position number (tabular, faint), 32 x 40px thumbnail, slide layout name in 13px, warning dot slot reserved. Selected row: accent-soft fill, accent-edge left border |
| \`LayoutPicker\` | Grid of 8 cards (4 x 2), each 6px radius, hairline border, a 64px line diagram of the layout and its name. Selected: accent-edge border and accent-soft fill |
| \`CharCounter\` | "62/70" in 12px tabular faint. Warning ink at 90%, danger ink over. Fixed width so it never pushes the field |
| \`AiRewriteMenu\` | Menu (portal) from the "Rewrite" button: 7 presets as 32px menu rows, a 3-line textarea "Or tell it what to change", a "Rewrite slide (1 rewrite)" button, and "86 rewrites left" in faint. The menu keeps its size while running; the button shows its spinner over the label |
| \`StatusTag\` | 4px pill, 20px high, base tag hue rules. Fixed min-width of 72px so a status change never moves the row |
| \`CalendarChip\` | 24px pill-shaped box (4px radius) inside a day cell: 6px brand dot, platform icon (14px Lucide), time (tabular), title with ellipsis. Status shown by the tag hue edge. Fixed height |
| \`PlanCard\` | White card, hairline, 6px radius. Name in 500, price in H3 with tabular figures, the includes list in 13px, one button. The recommended plan has an accent-edge border, never a fill |
| \`SelectionBar\` | Base selection bar for the library: "3 selected", Archive (3), Download PDFs (3), Duplicate. Fixed width, min-widths sized for three-digit counts |
| \`EmptyState\` | Inside the table or grid area, not a new page: a 48px line illustration in \`--ghost\` (three stacked cards), one 13px sentence in body ink, one button. Same height as 4 rows so the toolbar never jumps when content arrives |

### 3.1 Buttons in Folio
- Base rules only: every button is white with an edge. The primary action on a screen has the firmer ink edge
  (\`--ink\` at 1px) and 500 weight; secondary uses \`--btn-edge\`.
- Labels state the action and the cost in brackets: "Write my carousel (1 of 15)", "Export PNG and PDF (1 export)",
  "Rewrite slide (1 rewrite)", "Schedule post". Re-exporting unchanged slides: "Download export (free)".
- Loading keeps the label and width; the spinner overlays after 200ms and stays at least 400ms.

### 3.2 Icons
- Sidebar navigation: Phosphor 17px, regular at rest, duotone in the accent when selected.
- In-content: Lucide 14 to 16px, 1.5 stroke. Never mix both in one row.
- Platform marks for LinkedIn and Instagram: simple monochrome glyphs in \`--muted\`, never the official
  coloured logos inside the app.

## 4. App shell
- Base sidebar: 240px white with a right hairline, collapsing to 56px icons under 1100px. Nav items 32px high.
- Top to bottom:
  1. Folio wordmark (24px row, Geist 600, a small three-card mark in the accent).
  2. \`BrandSwitcher\`.
  3. **Create** (Sparkle), **Library** (SquaresFour), **Calendar** (CalendarBlank), **Brand kit** (Palette).
  4. Flexible space.
  5. \`UsageMeter\` with "Upgrade" text link on Trial and Creator.
  6. Bottom group, always this order: **Documentation** (BookOpen), **Help** (Lifebuoy), **Billing** (CreditCard),
     **Settings** (GearSix).
  7. User row: 20px avatar, name, workspace name in faint, menu (Log out).
- One level, 8 items, no nested menus.
- No top bar and no page titles. Each page starts with the base 48px page toolbar (search, counts, actions)
  with a bottom hairline. The trial notice is a 13px line inside that toolbar on the right
  ("4 days left in trial · Choose a plan"), not a banner that pushes content down.

## 5. Screens

### 5.1 Auth (\`/login\`, \`/signup\`, \`/reset\`)
- White page, a 400px column 10% from the top. Wordmark, H2 "Create your account" or "Welcome back",
  "Continue with Google" button, a hairline divider with "or", email and password inputs (36px), primary button
  full width.
- Line under the signup button in muted: "7 days free. Your first carousel in 5 minutes."
- Under 1100px nothing changes except the column goes full width with 16px sides.
- Errors sit under the field in danger ink with \`role=alert\`; the button keeps its width.

### 5.2 Onboarding (\`/onboarding\`)
- No sidebar. One centred 720px column. A 44px step bar with three steps "Brand", "Source", "Trial": done steps
  show a success tick, the current one the accent edge.
- **Brand:** two columns inside the column. Left: display name, handle (@ prefix), headshot drop zone (dashed,
  base "add" style), logo drop zone, 6 colour preset swatches as 32px boxes (selected gets the accent edge),
  font pair select. Right: a live hook slide at 300px wide in the customer's brand. Preview updates in place;
  the column never changes height.
- **Source:** \`SourceTabs\` with an example link per tab ("Try it with this post").
- **Trial:** three \`PlanCard\`s and a monthly / yearly segmented control ("Yearly · 2 months free").
- Return from Checkout: the same column shows \`JobProgress\` ("Confirming your trial", then "Reading the page",
  "Writing slides"). The step morphs height with the morph curve; width never changes.
- No confetti. When the first carousel is ready the editor opens and a toast says "First carousel ready".

### 5.3 Create (\`/app/create\`)
- Toolbar: "Create" breadcrumb text in muted, on the right the usage line "12 of 15 carousels left".
- One 760px card centred in the content area:
  - \`SourceTabs\`.
  - Blog URL: input with placeholder "https://yourblog.com/how-we-cut-churn", helper in faint "We read the main text only".
  - YouTube: input, helper "Videos with captions work best. Up to 30 minutes without captions."
  - Idea: 6-line textarea with \`CharCounter\` 4,000, placeholder "3 mistakes I made hiring my first salesperson".
  - Voice note: \`VoiceRecorder\`.
  - "More options" disclosure (morphs height): body slides stepper 6 to 9, angle input, format segmented control
    "Portrait 4:5" / "Square 1:1".
  - Primary button "Write my carousel (1 of 15)".
- After submit the card content morphs into \`JobProgress\`. On success the editor opens.
- Under the card: a 5-row table "Recent sources" (kind icon, title, status tag, created, "Use again").

### 5.4 Editor (\`/app/carousels/[id]\`)
- Toolbar (48px): back link "Library", editable title (13px 500, inline input on click, fixed width up to 420px
  with ellipsis), \`StatusTag\`, a "Saved" status slot with reserved width, and on the right "Export PNG and PDF"
  (primary edge) and "Schedule post".
- Three columns, divided by hairlines, no tinted panels:
  - Left 240px: \`SlideRail\` and a dashed "+ Add slide" row at the end.
  - Centre: \`SlideCanvas\` on white, with 24px padding around it.
  - Right 320px: inspector with three base tabs (Slide, AI, Post).
- Slide tab: \`LayoutPicker\`, then one field per content field with \`CharCounter\`, then warnings as 13px lines in
  warning ink ("Headline is 6 characters over and was shrunk to fit").
- AI tab: the presets as a list of 32px rows, the instruction box, "Rewrite slide (1 rewrite)", remaining count.
- Post tab: caption textarea with two counters (LinkedIn 3,000, Instagram 2,200), hashtag tags (4px pills,
  free-label hues), "Copy caption".
- Inline editing on the canvas: a 1px accent-edge outline around the text box being edited; text fits inside the
  slide, so nothing outside the canvas moves.
- Stale export line: a 13px warning line in the toolbar slot "Slides changed since the last export".
- Under 1100px: rail collapses to a 56px strip of numbers; inspector opens as the base side panel over the page.
- Under 768px: one slide full width, swipe between slides, a fixed 48px bottom bar (Edit, Rewrite, Reorder, Export).

### 5.5 Export dialog
- Base dialog (520px, 10% from top). Title "Export". A progress bar (accent, 4px) with "Rendering slide 4 of 9"
  in tabular figures; the label line reserves its height.
- Done: the same dialog morphs to three rows: "PDF for LinkedIn" (size), "PNGs for Instagram" (count, ZIP),
  "Schedule post". Each row is 48px with a button on the right.

### 5.6 Schedule dialog
- Base dialog with steps that morph height: Account, Time, Caption.
- Account: list of connected accounts as 48px rows (avatar, name, platform glyph, status tag). Expired rows show a
  "Reconnect" button and cannot be picked.
- Time: date picker, time select in 15 minute steps, suggested slots as 4px pills "Tue 08:30", "Wed 12:00",
  "Thu 08:30", timezone line in faint.
- Caption: textarea with the first 210 characters marked by a hairline underline (what LinkedIn shows before
  "see more").
- Footer: "Schedule post" (primary edge), "Post now", "Cancel".

### 5.7 Calendar (\`/app/calendar\`)
- Toolbar: month name, previous / next, Today, Month / Week segmented control, count "12 scheduled".
- Filter bar (44px): brand and platform chips, "+ Add filter" dashed.
- Month grid: hairline cells 112px high, date in 13px tabular; today's date in accent ink; a selected day gets
  accent-soft. \`CalendarChip\`s stack; "+3 more" opens a menu.
- Week view: 7 columns, 30 minute rows from 06:00 to 22:00, hairline dividers.
- Suggested slots: dashed 4px pills in \`--ghost\` that appear on hover only (visibility, no reflow).
- Drag to reschedule: the chip lifts with the float shadow; valid cells show accent-soft; drop morphs into place.
  Published chips cannot be dragged.
- Clicking a chip opens the base side panel (slides in 24px from the right over the page): slide 1 thumbnail,
  caption, status, Open, Reschedule, Cancel post, View on LinkedIn.

### 5.8 Library (\`/app/library\`)
- Toolbar: search, count "48 carousels", sort select, "Create" button.
- Filter bar: brand, status, source, date chips.
- Grid of cards (6px radius, hairline): 4:5 slide 1 thumbnail on white, title (2 lines, balance), brand dot and
  name, \`StatusTag\`, created date, and for published ones impressions and reactions in tabular figures with
  14px Lucide icons. Fixed card heights.
- A "Top performers" row of 3 cards above the grid only when analytics exist; space for it is not reserved when
  empty (it is part of the page on load, not inserted later).
- Selection: checkbox on hover (2px radius); \`SelectionBar\` floats 16px above the bottom.
- Table view toggle: base table (36px header, 48px rows, fixed columns).

### 5.9 Analytics panel
- In the editor's Post tab once published, and in the calendar side panel.
- Six stat boxes in a 3 x 2 grid (impressions, reach, reactions, comments, shares, clicks), label in faint, value
  in H3 tabular. A 7 day change line "+12%" in success ink or "-8%" in danger ink, always with a word or arrow.
- A 30 day line chart: one 1.5px accent line, hairline gridlines (3, horizontal), axis labels 12px faint,
  tooltip as a floating menu with the base float shadow.
- Locked on Creator: the boxes show "Not on Creator" in ghost ink and one "Upgrade to Pro" button.

### 5.10 Brand kit (\`/app/brand\`, \`/app/brand/[id]/accounts\`)
- List (Agency, Pro): base table of brands (avatar, name, handle, accounts connected, updated).
- Edit page: left form in hairline-divided sections (Identity, Colours, Fonts, Voice, CTA, Footer); right a sticky
  live slide preview with a segmented control to switch the preview layout (Hook, List, Stat, CTA).
- Colours: six rows, each a 24px swatch box, a hex input (tabular) and a contrast tag "AA" (green hue) or
  "Low contrast" (amber hue). Brand colours here can be anything: they only paint the slides.
- Fonts: heading and body selects; each option shows the font name in its own face at 13px.
  "Upload font (TTF or OTF)" on Pro and Agency.
- Voice: textarea, 600 counter, placeholder "Direct, no jargon, short sentences, British spelling".
- Accounts tab: three 48px rows (LinkedIn profile, LinkedIn page, Instagram), status tag, Connect / Reconnect /
  Disconnect, and "2 of 3 accounts used on Pro" in faint.

### 5.11 Billing, Settings, Help, Documentation, Paywall
- Billing: plan card (name, price, renewal or trial end, "Manage billing"), four \`UsageMeter\`s (carousels,
  rewrites, exports, voice minutes) with "Resets on 1 Nov", and plan cards with the monthly / yearly control.
- Settings: base tabs Profile, Workspace (name, timezone), Team (members table with role select, "Invite member",
  pending invites with "Revoke"), Danger zone (delete workspace: type the name to confirm, danger ink text,
  white button with danger edge).
- Help: search, 8 FAQ disclosures, "Contact us" form, a "Recent jobs" table (last 10, status, error text).
- Documentation (\`/docs\`): left list of 8 articles, content at 65 characters wide, H2 headings, screenshots
  with a hairline frame.
- Paywall: a 520px card 10% from the top: "Your trial has ended. Your carousels are safe.", what they keep,
  plan cards, "Manage billing".

### 5.12 Public templates gallery (\`/templates\`)
- Uses the marketing layout from LANDING.md (square, 1180px rail with hairlines).
- 8 layouts, each shown as 3 example slides in different brand kits, name, "Best for" line, "Use this layout".
- Each layout has its own page \`/templates/[layout]\` with 3 full example carousels.

## 6. Slide templates (the export, not the UI)
- Canvas 1080 x 1350 (portrait) or 1080 x 1080 (square). Safe padding 96px. Footer band 120px.
- Colours, fonts, logo and headshot all come from the brand kit. Slides keep their own rounded shapes and big
  type: the Quiet Precision rules govern the app around them, not the customer's design.
- Background: brand \`background\`. Optional accent shape on hook and cta only: a 640px circle of brand
  \`accent\` at 8% opacity, top right.
- Headline: heading font 700, 88px max on hook, 72px statement, 56px titles, line height 1.05. Body: body font 400,
  40px, line height 1.35, brand \`ink\`; secondary text brand \`muted\`.
- Bullets: 28px accent dot or check, 24px gap. Step: number 160px in accent at 90%. Stat: value 220px weight 800 in
  accent. Compare: two \`surface\` cards with 24px radius. Quote: 120px quote mark in accent, quote 56px.
- Footer: headshot 64px circle, display name 28px 600, handle 24px muted, counter "3/9" right, logo 48px on hook
  and cta only. Hook has a "Swipe" pill in accent with accentInk text. CTA centres a 160px headshot.
- "Made with Folio": 20px muted at 60% opacity, bottom centre, Trial only (Creator can remove it).

### 6.1 Wireframes (portrait)
\`\`\`
HOOK                         BULLETS                      STAT
+------------------------+   +------------------------+   +------------------------+
| [logo]          (o)    |   | Title over two lines   |   |                        |
| KICKER                 |   |                        |   |        87%             |
| Big headline over      |   | (o) bullet one         |   |  label under number    |
| three lines max        |   | (o) bullet two         |   |                        |
| subline in muted       |   | (o) bullet three       |   |  one line of context   |
|               [Swipe>] |   |                        |   |                        |
| (face) Name @handle 1/9|   | (face) Name @handle 3/9|   | (face) Name @handle 5/9|
+------------------------+   +------------------------+   +------------------------+
STEP                         COMPARE                      CTA
+------------------------+   +------------------------+   +------------------------+
| 03                     |   | BEFORE      | AFTER    |   | [logo]                 |
| Step title             |   | - point     | - point  |   |        (face)          |
| body text over three   |   | - point     | - point  |   |  Headline centred      |
| or four lines          |   | - point     | - point  |   |  [ action in a pill ]  |
|                        |   |             |          |   |  follow line muted     |
| (face) Name @handle 4/9|   | (face) Name @handle 6/9|   | (face) Name @handle 9/9|
+------------------------+   +------------------------+   +------------------------+
STATEMENT: one centred headline, optional body under it.  QUOTE: big quote mark, quote, attribution.
\`\`\`

### 6.2 Brand kit colour presets (background, surface, ink, muted, accent, accentInk)
| Preset | background | surface | ink | muted | accent | accentInk |
|---|---|---|---|---|---|---|
| Violet | #F7F4FF | #FFFFFF | #1E1838 | #5B5478 | #6D4AFF | #FFFFFF |
| Ocean | #F1F7FB | #FFFFFF | #0F2233 | #4A6275 | #1C6FD1 | #FFFFFF |
| Forest | #F3F7F2 | #FFFFFF | #142519 | #4E6352 | #23824D | #FFFFFF |
| Ember | #FFF6EF | #FFFFFF | #2A1608 | #6E5442 | #D9561B | #FFFFFF |
| Graphite | #F4F4F6 | #FFFFFF | #18181D | #5C5C66 | #2F2F3A | #FFFFFF |
| Rose | #FFF3F6 | #FFFFFF | #2B1119 | #6E4B57 | #D2386C | #FFFFFF |
Every preset passes 4.5:1 for ink on background and accentInk on accent. Slide backgrounds stay light by default.

### 6.3 Font pairs (heading / body)
| Pair | Heading | Body | Feel |
|---|---|---|---|
| Clean | Inter 700 | Inter 400 | Neutral SaaS |
| Friendly | Manrope 700 | Manrope 400 | Warm founder |
| Editorial | Fraunces 700 | Inter 400 | Coach, thought leader |
| Bold | Bricolage Grotesque 700 | DM Sans 400 | Agency, punchy |
| Technical | Space Grotesk 700 | IBM Plex Sans 400 | Dev tools |
| Classic | Playfair Display 700 | Lora 400 | Finance, consulting |
These fonts are for slides only. The app UI is always Geist.

## 7. Empty, loading and error states
| Place | Empty | Loading | Error |
|---|---|---|---|
| Library | \`EmptyState\` "No carousels yet. Paste your first link." with "Create a carousel" | 8 card skeletons at final size (hairline boxes, no shimmer loop) | 13px danger line in the toolbar "Could not load your library. Retry" |
| Calendar | Grid shows suggested slots; one line "Nothing scheduled. Export a carousel and pick a slot" | Chips reserve their 24px rows | Toast "Could not load the calendar" with Retry |
| Create progress | n/a | \`JobProgress\` steps with live status | Step gets the danger mark and the PRD 19 message with Retry or "Paste as Idea" |
| Editor | n/a | Rail rows and canvas frame at final size, faint | "This carousel could not be written. You were not charged." with Retry |
| Export | n/a | Progress bar with slide count | "Export failed. It will retry automatically." with "Retry now" |
| Accounts | Rows with "Connect" | Spinner over the button label | Amber tag "Needs reconnecting" |
| Analytics | "Numbers arrive about 24 hours after posting" | Boxes at final size with ghost dashes | "Analytics unavailable right now" |
| Usage at limit | Button keeps its width, disabled, tooltip "You have used 15 of 15 carousels this month", "Upgrade" link | n/a | n/a |

## 8. Motion (base curves and durations only)
- Job steps: tick fades and scales from 96% in 200ms; the live dot pulses at 1.4s (the only loop).
- Rail reorder: dnd-kit with a 200ms transform using the morph curve; the dragged row gets the float shadow.
- Rewrite: the slide dims to 60% opacity while waiting (no shimmer loop), then cross-fades 200ms to the new text.
- Export and schedule dialogs: step morph 300ms, content fades up 4px after 60ms.
- Calendar side panel: 200ms slide 24px from the right over the page.
- Library cards and table rows rise once per session (360ms, 6px, 25ms stagger capped at 270ms).
- Reduced motion: everything appears in its end state instantly.

## 9. Toasts and copy
| Event | Toast (bottom left, no full stop) |
|---|---|
| Rewrite done | Slide rewritten · Undo |
| Reorder saved | Order saved |
| Export done | Export ready · Download |
| Scheduled | Scheduled for Tue 21 Oct, 08:30 · View |
| Limit hit | All 100 rewrites used this month · Upgrade |
| Save conflict | Loaded the latest version of this slide |
| Failed save | Could not save. Retrying |
| Place | Copy |
|---|---|
| Create button | Write my carousel (1 of 15) |
| Generate steps | Reading the page · Writing your hook · Writing slides · Checking lengths · Ready |
| Rewrite presets | Punchier · Shorter · Simpler words · Add an example · Turn into a list · Turn into a stat · Match my voice |
| Expired account | LinkedIn disconnected. Reconnect to keep your scheduled posts. |
| Delete slide | Delete this slide? You can undo for 8 seconds. |
| Archive | Archive this carousel? Scheduled posts still go out. |

## 10. Accessibility
- Base rules (visible 2px focus outline with 2px offset, real roles, Escape closes overlays, polite toasts).
- Slide rail is a listbox; keyboard reordering with Space to lift, arrows to move, Space to drop, and a live region
  "Slide 5 moved to position 2".
- Voice recorder announces "Recording started" and the elapsed time every 30 seconds.
- Every status tag carries text, never colour alone. Contrast checker in the brand kit helps customers make
  readable slides.
- Exported PDFs carry the carousel title; Instagram images send \`altText\` per slide through Zernio.

## 11. Responsive
- Base: sidebar collapses to 56px icons under 1100px. Check every page at 320, 375 and 430px as well as 768,
  1024, 1440.
- Create, Library (one column grid), Calendar (agenda list grouped by day) and the voice recorder work fully on a
  phone. The editor supports text edits, rewrites, reorder and export on a phone.
- Under 768px the sidebar becomes a menu button in the page toolbar that opens the nav as a side panel over the page.

## 12. Email design (Resend + React Email)
- 600px, white card with a 1px hairline and 6px radius on white, Geist with system fallbacks, 13 to 16px text.
- Wordmark, one heading, 2 to 4 short paragraphs, one white button with a 1px ink edge, footer with the workspace
  name and "Email settings". Post published email shows the slide 1 thumbnail.
- Plain text version for every email.

## 13. Build order for Claude Code
1. Base tokens from DESIGN_SYSTEM.md plus the Folio accent (section 1), Geist via \`next/font\`.
2. App shell: sidebar, \`BrandSwitcher\`, \`UsageMeter\`, page toolbar, side panel and dialog primitives.
3. Auth and onboarding.
4. Slide templates and \`SlideCanvas\` (PRD 10.3), then \`/templates\`.
5. Create with \`SourceTabs\`, \`VoiceRecorder\` and \`JobProgress\`.
6. Editor with rail, inspector, rewrite menu, export and schedule dialogs.
7. Calendar, Library, analytics panel.
8. Billing, Settings, Help, Docs, Paywall.
9. Screenshot every page at 375px and 1440px. Check the stability rules: click every button, open every menu, and
   confirm nothing around it moved.

## 14. Component states
| Component | Rest | Hover | Selected or active | Busy | Disabled |
|---|---|---|---|---|---|
| Nav item | Muted ink, Phosphor regular | Hover fill | Accent-soft fill, ink text, duotone accent icon | n/a | n/a |
| \`SourceTabs\` tab | White, button edge | Hover fill | Accent-soft fill, accent-edge border, ink text | n/a | Ghost ink |
| Slide rail row | White, divider below | Row hover, drag handle visible | Accent-soft fill, accent-edge left border | Live dot in the warning slot while rewriting | n/a |
| Layout card | White, hairline | Hover fill | Accent-soft fill, accent-edge border | n/a | Ghost ink with tooltip "Hook stays first" |
| Preset row | White | Hover fill | Accent-edge border while chosen | Spinner over the label after 200ms | Ghost ink at 0 rewrites left |
| Calendar chip | Tag hue fill and edge | Float shadow, 98% press | Accent-edge ring | Live dot while publishing | Published chips show no drag handle |
| Plan card | White, hairline | n/a | Accent-edge border on current or recommended | n/a | n/a |
| Primary button | White, 1px ink edge, 500 | Hover fill | Press to 98% | Spinner overlay, label kept, width kept | Ghost ink, button edge |
| Secondary button | White, button edge | Hover fill | Press to 98% | As primary | As primary |

## 15. Stability checklist per screen
Run these by hand after each screen is built. Any item that moves is a bug.
| Screen | Must not move |
|---|---|
| Sidebar | Nav items when the usage meter value changes from "9 of 15" to "10 of 15" or turns amber |
| Create | The source card when switching tabs, opening "More options" (morphs height downwards only), or when the button starts loading |
| Create progress | Step rows when a status changes from "Reading the page 40%" to "Writing slides"; all rows exist from the start |
| Editor toolbar | Export and Schedule buttons when "Saved" appears or the status tag changes from Ready to Exported |
| Slide rail | Other rows while a row shows its warning dot or the rewrite live dot (slot reserved) |
| Inspector | Fields when a counter turns amber; the Rewrite button when it is busy |
| Canvas | The slide frame when text grows; text shrinks inside the slide instead |
| Export dialog | Dialog width between the progress step and the done step |
| Schedule dialog | Dialog width between Account, Time and Caption steps |
| Calendar | Day cells when chips load; "+3 more" is a fixed link, not more rows |
| Library | Card grid when thumbnails load (fixed 4:5 boxes) and when the selection bar appears (it floats) |
| Billing | Meter rows when values animate (tabular figures, fixed label widths) |

## 16. Screen inventory for Claude Code
| Route | Shell | Toolbar contents |
|---|---|---|
| \`/login\`, \`/signup\`, \`/reset\` | None | None |
| \`/onboarding\` | None | Step bar |
| \`/app/create\` | Sidebar | "Create" · usage line |
| \`/app/carousels/[id]\` | Sidebar | Back · title · status · Saved · Export · Schedule |
| \`/app/library\` | Sidebar | Search · count · sort · Create |
| \`/app/calendar\` | Sidebar | Month · arrows · Today · Month/Week · count |
| \`/app/brand\`, \`/app/brand/[id]\`, \`/app/brand/[id]/accounts\` | Sidebar | Brand name · Save state · Add brand kit |
| \`/app/billing\` | Sidebar | Plan name · Manage billing |
| \`/app/settings\` | Sidebar | Tabs |
| \`/app/help\` | Sidebar | Search |
| \`/docs\`, \`/docs/[slug]\` | Marketing nav | n/a |
| \`/paywall\` | None | None |
| \`/templates\`, \`/templates/[layout]\` | Marketing nav | n/a |
`
