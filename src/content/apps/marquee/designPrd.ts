// Marquee design PRD (DESIGN.md). Builds on Quiet Precision (DESIGN_SYSTEM.md).

export const designPrd = `# Marquee: design PRD

Save this file as \`DESIGN.md\` in the project root. It builds on **DESIGN_SYSTEM.md** (Quiet Precision), which
is the base design system for every screen. Save that file next to it as \`DESIGN_SYSTEM.md\`, and put this line in
\`CLAUDE.md\`:

\`\`\`md
UI rules: @DESIGN_SYSTEM.md @DESIGN.md
\`\`\`

DESIGN_SYSTEM.md decides the neutrals, type, radii, sizes, motion, components and stability rules. This file only
adds what is different for Marquee: the brand accent, the product-specific screens and the components those
screens need. Where the two disagree, this file wins only for the accent and the Marquee screens. Every stability,
motion and component rule in DESIGN_SYSTEM.md still applies: white surfaces, 1px hairlines, 6px boxes, 4px pills,
13px app text, white buttons with a firm edge, no filled or black buttons, nothing moves under the cursor.

## 1. Brand

- **Name:** Marquee. The lit sign over a theatre door: the one thing that makes people walk in. A thumbnail is a
  video's marquee.
- **Tagline:** Thumbnails that prove themselves.
- **Personality:** a calm, data-literate art director. Confident about taste, honest about numbers. Never hypes
  a result that is not significant.
- **The quiet frame rule:** creators' thumbnails are loud (saturated, huge type, red arrows). The app around them
  must be quiet so the thumbnails are the only loud thing on screen. Marquee's UI never uses saturated colour,
  heavy shadows or bold display type inside the app. The thumbnails bring the colour.

## 2. Brand accent: lightbox teal

Marquee swaps the system's pastel blue for a pastel teal. It keeps the same three-part shape: a mid accent, a
soft fill and an edge. It marks "selected", "in progress" and "live now" only, exactly where the system uses blue.

| Token | Hex | Replaces | Use |
|---|---|---|---|
| \`--accent\` | #3e9e9a | \`--blue\` | Selected nav icon (duotone), progress bars, live dot, schedule strip "today" marker |
| \`--accent-soft\` | #eef7f6 | \`--blue-soft\` | Selected row, selected nav item, selected concept card fill, chosen variant |
| \`--accent-edge\` | #bfe1de | \`--blue-edge\` | Selected borders, the live variant's frame, drag target outline |

Why teal: the system's warning is amber and danger is coral, and both appear in meters and test errors. Creators'
thumbnails are mostly red, yellow and orange, so a warm accent would disappear next to them. Teal sits apart from
every status colour and from typical thumbnail palettes, so "selected" always reads.

### 2.1 Variant hues
Tests label variants A, B and C. Each gets a fixed tag hue from the system's eight pastel tag hues (never the
accent, so "selected" and "variant B" never look the same):

| Variant | Tag hue | Fill (8%) | Edge | Ink |
|---|---|---|---|---|
| A | Slate | #f2f3f5 | #d5d8dd | #3c4149 |
| B | Violet | #f4f2fd | #d5cff5 | #5a4fb3 |
| C | Rose | #fdf1f4 | #f2cbd6 | #a1405c |
| Original | Ghost outline only | #ffffff | #dcdde0 | #62666d |

Chart lines use the variant ink colours at 1.5px, never the accent.

### 2.2 Tokens to add
\`\`\`css
:root {
  --accent: #3e9e9a; --accent-soft: #eef7f6; --accent-edge: #bfe1de;
  --var-a-fill: #f2f3f5; --var-a-edge: #d5d8dd; --var-a-ink: #3c4149;
  --var-b-fill: #f4f2fd; --var-b-edge: #d5cff5; --var-b-ink: #5a4fb3;
  --var-c-fill: #fdf1f4; --var-c-edge: #f2cbd6; --var-c-ink: #a1405c;
  --canvas-well: #fafafb;        /* the area around the editor stage (system row hover) */
  --thumb-ratio: 16 / 9;
  --duration-badge: rgba(8,9,10,.72); /* only inside the editor's safe-zone overlay */
}
\`\`\`
Use tokens only. No raw hex in components.

## 3. Thumbnail frames (the one Marquee component everything uses)

Every thumbnail in the app (concepts, designs, variants, video rows) sits in a \`ThumbFrame\`:
- Aspect ratio 16:9 via \`aspect-ratio: var(--thumb-ratio)\`, set before the image loads, so nothing jumps.
- 6px radius, 1px hairline. The image is \`object-fit: cover\` inside.
- Loading: a white box with the hairline and a 1px inset grid pattern at 4% ink. No grey shimmer block.
- Sizes: \`xs\` 96x54 (table rows), \`sm\` 160x90 (strips), \`md\` 320x180 (gallery cards), \`lg\` 640x360 (results).
- States: selected (accent edge 1px + accent-soft 4px outer ring), live now (accent edge + a 6px live dot top
  left with the label "Live"), failed (white with a centred Lucide image-off icon and the reason below).
- Never put shadows on thumbnails.

## 4. App shell

### 4.1 Sidebar (240px, 56px under 1100px)
White, right hairline. Nav items 32px, Phosphor icons at 17px, regular at rest, duotone teal when selected.

\`\`\`
[M] Marquee            (logo mark: a 16px rounded rectangle with 3 dots on its top edge, ink)
  Workspace switcher   (only if the user has more than one)

  Projects             (Phosphor: Images)
  Tests                (Phosphor: ChartLineUp)
  Channels             (Phosphor: YoutubeLogo)
  Faces                (Phosphor: UserFocus)
  Brand kit            (Phosphor: Palette)

  ......... flexible space .........

  Credits meter        "62 of 84 concepts left", meter bar, 4px tall
  Documentation        (Phosphor: BookOpen)
  Help                 (Phosphor: Lifebuoy)
  Billing              (Phosphor: CreditCard)   hidden for non-owners
  Settings             (Phosphor: GearSix)
\`\`\`
- One level only, no nested menus. The order above is fixed.
- The credits meter is a fixed-height block (44px) so the bottom group never shifts. Meter is teal, amber under
  20% left, coral under 5% (system meter rule). The label uses tabular numbers.
- Under 1100px: icons only, labels in tooltips, the meter becomes a 32px ring with the number left inside.

### 4.2 Page toolbar (48px)
No page titles and no top bar (system rule). The toolbar holds the page's search, a count, filters and the one
primary action on the right. Examples: Projects: search, "24 projects", "New project". Tests: filter chips
(Running, Collecting, Decided, All), "Start a test".

## 5. Auth screens

Routes \`/login\`, \`/signup\`, \`/reset\`. White page, a single 400px column centred horizontally, 20% from the top.
- Logo mark and "Marquee" 20px/500 at the top.
- H2 24px: Log in / Create your account / Reset your password.
- Fields 36px: Email, Password (signup shows the rule under the field: "At least 8 characters").
- Primary button full width: "Log in", "Create account", "Send reset link". White with the firm edge.
- "Continue with Google" secondary button above the email field on login and signup (Supabase Google auth) with
  the Google G in its own colours at 16px (the only multi-colour icon in the app).
- Below: "New here? Create an account" / "Have an account? Log in". 13px muted.
- Errors under the field in danger ink with \`role=alert\`: "That email and password do not match. Try again or
  reset your password."
- Right of the column on 1280px and wider: nothing. No marketing image. Calm.

## 6. Onboarding (/onboarding)

One card, 560px wide, 10% from the top, with a 4-step indicator (four 4px pills, the current one accent). The
card morphs height between steps (300ms morph curve, content fades up 4px after 60ms). Width never changes.

### Step 1: Name your workspace
- Field: "Workspace name" placeholder "Sam's channel". Button "Continue".

### Step 2: Add your face
- Text: "Upload 5 to 10 photos of your face. Different expressions work best: smiling, shocked, serious,
  pointing. Good light, face filling about a third of the frame."
- Person name field (prefilled from the profile).
- Dashed drop zone 160px tall: "Drop photos here or choose files". JPEG, PNG, WebP, HEIC, up to 15 MB each.
- Consent checkbox (2px radius): "These are photos of me, or of someone who agreed to appear in my thumbnails."
  The drop zone is disabled until it is ticked.
- After drop: a grid of 5 columns of square 96px tiles. Each tile shows the original first, then the cut-out on
  a checkerboard (4% ink checks) when ready, with the expression tag under it (4px pill). A tile that is
  processing shows a live dot and "Cutting out". Tiles have fixed size; status text sits in a reserved 18px line.
- Button "Continue" is enabled when at least 3 photos are ready. Under it, muted: "You can add more later in Faces."

### Step 3: Brand kit
- 6 colour swatches (28px squares, 6px radius) with "+" dashed for empty slots. Click opens a popover colour
  picker (in a portal) with hex input.
- Font select with live preview text "THIS CHANGED EVERYTHING" in the chosen font at 32px.
- "Upload a font" secondary button. Licence checkbox appears after upload.
- Button "Continue". Link "Skip for now".

### Step 4: Connect YouTube
- Text: "Connect your channel so Marquee can test thumbnails on your real videos. You can do this later."
- What we ask for, as a list with Lucide check icons: "See your videos and their stats", "Change thumbnails on
  videos you choose to test". And: "We never upload, delete or edit anything else."
- Button "Connect YouTube" (YouTube logo in ink, not red). Link "Skip, I will make thumbnails first".
- Unverified-app note (only while the Google app is unverified): faint 12px "Google may show a warning screen
  while Marquee is in review. Click Advanced, then Continue."

## 7. Product screens

### 7.1 Projects (/app/projects)
- Toolbar: search, count "24 projects", button "New project".
- Table: 48px rows. Columns: thumbnail (xs ThumbFrame of the best design or first concept, 96px), Title (flex,
  ellipsis), Video (channel video title or "Not linked", 220px), Concepts (80px, tabular), Test (160px: a variant
  tag of the winner with "+34% CTR", or a live dot "Running day 3 of 8", or "None"), Updated (120px).
- Row hover \`--row-hover\`. Click opens the project.
- Empty state: centred block 420px wide, 20% from the top: Lucide sparkles 16px, H3 "Make your first thumbnail",
  text "Type a video title and Marquee drafts six concepts with your face in about two minutes.", button "New
  project". If no face photos yet, the button reads "Add your face first" and links to Faces.

### 7.2 New project (/app/projects/new)
A form page, 640px column, left aligned in the content area (not centred).
- Title field (required, 100 characters, counter on the right in tabular faint text).
- Topic textarea, 3 rows: placeholder "What happens in the video, who it is for, the one thing viewers learn."
- "Link a video (optional)": combobox searching the channel's videos, each option with an xs ThumbFrame.
- Person select (only when the library has more than one person).
- Style chips (multi, 4px pills): Bold and bright, Dark and moody, Clean and minimal, Meme, Cinematic, Documentary.
- Primary button: "Generate 6 concepts (6 credits)". Under it, faint, in a reserved line: "62 credits left this
  month". If fewer than 6 left: button disabled, line in warning ink "You have 4 credits left. Upgrade or wait
  until 1 Nov." with "Upgrade" link.

### 7.3 Concept gallery (/app/projects/[id])
- Toolbar: project title (13px/500, not a heading), video chip, "Regenerate all (6 credits)", "Start a test".
- Progress line under the toolbar (44px, reserved even when done): live dot + "Writing ideas", then
  "Painting 3 of 6", then "6 concepts ready" (no dot). A 2px progress bar in accent along the bottom edge,
  width eased with the morph curve.
- Grid: 3 columns at 1280px+, 2 under 1100px, 1 under 640px. Gap 16px. Each card:
  - md ThumbFrame showing the composed concept (background + face cut-out + headline rendered with Konva at
    320x180 using the same layout code as the editor).
  - Under it, 2 lines reserved (36px): angle pill (e.g. "Curiosity") and the "why" line in muted ellipsis.
  - Footer row (32px compact buttons): "Edit", "Regenerate (1 credit)", a "..." menu (Download, Delete).
  - Card states: queued (frame loading pattern, label "Waiting"), briefing (same, "Writing"), rendering (frame
    loading + live dot "Painting"), stored (image), failed (failed frame + "Credit refunded").
  - Cards appear in a 3x2 grid from the start, so nothing shifts when images arrive. Images fade in 200ms.
- Below: "Designs" section: saved designs as sm frames with name and version, click to edit.
- Rows rise once on first view only (system rule); refetches never re-animate.

### 7.4 Editor (/app/projects/[id]/edit/[designId])
Desktop only. Under 1100px show: "The editor needs a wider screen. Open Marquee on a laptop or desktop." with a
button "Back to project".

Layout (full height, no page scroll):
\`\`\`
+-----------------------------------------------------------------------------------+
| Toolbar 48px: < Back | Design name (inline edit) | Undo Redo | Saved | Download | Export |
+-----------+-----------------------------------------------------+-----------------+
| Layers    |                                                     | Properties      |
| 240px     |         canvas well (--canvas-well)                 | 280px           |
|           |         stage 1280x720 scaled to fit, hairline      |                 |
| Face      |         safe-zone toggle overlay                    | (selected layer)|
| Text      |                                                     |                 |
| Shape     |                                                     | Mobile preview  |
| Image     |                                                     | 246x138         |
+-----------+-----------------------------------------------------+-----------------+
| Face strip 88px: cut-outs filtered by expression chips                           |
+-----------------------------------------------------------------------------------+
\`\`\`
- **Layers panel:** list of 32px rows (icon, name, eye toggle, lock toggle). Drag to reorder; the drop target is a
  1px accent line. "+ Add" dashed button with a menu: Text, Face, Arrow, Circle, Underline, Image.
- **Stage:** white frame with 1px hairline, no shadow. Selected layer: 1px accent outline and 8px white square
  handles with a 1px ink edge (6px radius does not apply to handles; they are 2px radius like checkboxes).
  Snap guides are 1px accent lines that appear only while dragging.
- **Safe-zone overlay (toggle "Show YouTube overlays"):** a dark rounded rectangle in the bottom-right where the
  duration badge sits, labelled "12:34", and a 40px inner margin hairline. Off by default after the first session.
- **Properties panel:** sections separated by hairlines, 13px labels in faint ink.
  - Text: textarea, font select (brand fonts first, then built in), size (number input + slider), fill swatches
    from the brand kit, stroke width and colour, highlight bar on/off, rotation, presets grid (6 tiles 80x45 each
    showing the preset on "ABC").
  - Face: expression chips, outline width and colour, shadow on/off, flip, "Swap photo" opens the strip.
  - Shape: fill, rotation.
  - Background: concept image, "Replace with another concept", dim slider 0 to 60%.
- **Mobile preview:** live 246x138 render plus "Phone home feed size" faint caption. Updates on change with
  requestAnimationFrame.
- **Face strip:** 72px tall cut-outs on a checkerboard, expression chips on the left. Clicking swaps the selected
  face layer (or adds one if none is selected).
- **Saved state:** the toolbar status has a fixed 72px slot: "Saving" with a 12px spinner after 200ms, then
  "Saved". Width never changes.
- **Export button:** "Export 1280x720". While exporting, the label stays and a spinner overlays. Done: toast
  "Exported, 412 KB". Too big: dialog "This design is too detailed to fit 2 MB" with what to remove.

### 7.5 Tests (/app/tests)
- Toolbar: filter chips (Running, Collecting, Decided, No winner, All) with "+ Add filter" dashed for Channel.
  Count "7 tests". Button "Start a test".
- Table rows 64px (taller to fit the variant strip; still one line of text). Columns: Video (xs frame + title),
  Variants (a strip of xs frames with A/B/C tags, today's live one with the accent edge), Status (live dot +
  "Day 3 of 8", or "Collecting data", or a variant tag "B won +34%"), Confidence (tabular "81%"), Started.
- Empty state: Lucide chart-line 16px, H3 "No tests yet", text "Pick 2 or 3 designs and Marquee shows one on your
  video each day, then tells you which one people click.", button "Start a test".

### 7.6 Start a test (/app/tests/new, opened as a dialog over the current page)
One dialog, 520px, 10% from the top, with 3 steps that morph height (system rule: never a second dialog).
1. **Video:** search list of the channel's videos (xs frame, title, age "12 days old"). Videos under 3 days old
   are listed with a warning pill "Too new" and need a second click on "Test anyway".
2. **Variants:** grid of the project's designs (sm frames). Select 2 or 3. A toggle row "Include the current
   thumbnail as a control" (on by default) adds it as A. Selected frames get variant tags in order.
3. **Schedule:** length select (8 days, 16 days; or 9/18 with 3 variants), switch "Apply the winner
   automatically" (on), the schedule preview strip (section 10.1), and the line "Starts tonight at midnight
   Pacific (09:00 your time)". Uses the viewer's time zone for the second part.
Footer: "Back" and the primary "Start test". The primary keeps a minimum width of 120px.

### 7.7 Test detail (/app/tests/[id])
- Toolbar: video title, status pill, "Stop test" (opens a confirm step in a small dialog with "Keep which
  thumbnail?" radio list of variants), "View on YouTube".
- **Hero row:** the lg frame of today's live variant with "Live now: B" and on the right a decision panel 320px:
  - Running: "B is ahead, 81% sure" (H3), muted "Too early to call. Results firm up after day 8."
  - Collecting: live dot "Waiting for YouTube's numbers", muted "YouTube sends impressions 1 to 2 days late."
  - Decided: variant tag "B won", H2 "+34% CTR", muted "97% sure, won 4 of 4 day pairs. B is now live."
  - No winner: H3 "No clear winner", the reason in plain words, and buttons per variant "Keep A", "Keep B".
- **Schedule strip:** see section 10.1.
- **Numbers table:** one row per variant: tag, sm frame, Impressions, CTR, Views, Avg view duration, Chance of
  being best (a 64px meter in the variant ink). All tabular numbers. Missing data shows a faint "Not yet".
- **Daily chart:** CTR per day, one dot per day coloured by the variant live that day, connected per variant
  (not across variants). 240px tall, hairline axes, faint labels. Days without data are hollow dots.
- **Method note:** a callout box (hairline, white): "How this works: one thumbnail per day in a balanced order,
  then a statistical comparison. A day you changed the thumbnail by hand is left out."

### 7.8 Channels (/app/channels and /app/channels/[id])
- List: 48px rows: avatar 24px circle, channel name, subscribers (tabular), status pill (Connected green tag,
  Reconnect needed amber tag, Disconnected faint), Connected by, "..." menu (Reconnect, Disconnect).
- "Connect a channel" button. At the plan cap it reads "Channel limit reached" with an "Upgrade" link next to it.
- Channel detail: video table with xs frame of the current YouTube thumbnail, title, published, views
  (tabular), "Test running" tag if any, row actions "New project" and "Start a test".
- Disconnect confirm (dialog): "Disconnect Sam Builds? Running tests stop and their original thumbnails are put
  back. Marquee deletes this channel's stats." Buttons "Cancel" and "Disconnect" (the primary edge in danger ink,
  still a white button).

### 7.9 Faces (/app/faces)
- Left column 240px: people list (32px rows) with "+ Add person" dashed.
- Right: toolbar (person name, "12 photos", "Upload photos"), expression chips filter, grid of 120px square tiles
  (cut-out on checkerboard, expression pill under it, "..." menu: change expression, delete).
- Failed tile: white, Lucide alert-circle 14px in danger ink, the reason in 2 reserved lines.
- Monthly cut-out meter at the top right of the toolbar: "8 of 10 cut-outs left this month".

### 7.10 Brand kit (/app/brand)
- Sections stacked with hairlines in a 720px column: Colours (6 swatches, headline and accent markers), Fonts
  (table of uploaded fonts with a live sample, "Upload a font"), Text presets (grid of presets with "Save current
  as preset" coming from the editor).

### 7.11 Documentation (/app/docs)
- Two-column: 220px left list of articles (How tests work, Why 8 days, Reading CTR, Your face photos, Fonts and
  licences, YouTube permissions, Quota and limits), right a 65-character reading column with H2/H3 and 13px body.

### 7.12 Help (/app/help)
- YouTube connection status card per channel (green or amber tag and the last successful call time).
- Contact form: subject, message, "Send". Toast "Message sent". Under it: "We reply within one working day."
- FAQ list (disclosure rows, 48px).

### 7.13 Billing (/app/billing)
- Plan card: plan name, price, interval, renewal date, "Change plan" (opens a dialog with the 3 plans and a
  monthly/annual segmented control), "Manage payment and invoices" (Stripe portal).
- Usage meters (each a fixed 56px row): Concepts this month, Face cut-outs, Live tests, Channels, Seats. Meter
  colours per the system rule. Reset date under the table: "Resets 1 Nov".
- Trial banner (inline, hairline, not a coloured bar): "Trial: 5 days left. 12 concepts and 1 test included."

### 7.14 Settings (/app/settings)
- Tabs (36px): Profile, Workspace, Members, Notifications, Data.
- Members: table (name, email, role select, last active), "Invite" opens a dialog (email, role). Seat count
  "2 of 5 seats" in the toolbar.
- Notifications: switches for each email kind in PRD section 17 except billing ones.
- Data: "Export my data" (zip of designs and decisions), "Delete workspace" (type the name to confirm), and a
  link "Manage Marquee's access in your Google account".

### 7.15 Invite accept (/invite/[token])
- Same column as the auth pages. "Priya invited you to Sam's channel on Marquee as an Editor."
- If logged out: the signup form with the email prefilled and locked. If logged in with another email:
  "This invite is for priya@studio.com. Log out and use that email."
- Button "Join workspace". Expired: "This invite has expired. Ask Priya to send a new one."

### 7.16 Paywall (/paywall)
- Shown when \`has_active_access\` is false. Same column. H2 "Your trial has ended" or "Your plan is paused".
- The 3 plan cards side by side at 1100px+ (stacked under), monthly/annual segmented control above them,
  each with the caps from PRD section 16 and a "Choose Pro" button. Current designs and tests are kept:
  "Your designs and results are safe. Running tests are paused and your original thumbnails are back."

## 8. Status pills (fixed mapping)

Status maps to fixed tag hues (system rule). These are the only status pills in the app.

| Object | Status | Label | Hue |
|---|---|---|---|
| Test | scheduled | Starts tonight | Blue-grey (slate) |
| Test | running | Running (with live dot) | Accent soft + accent edge |
| Test | collecting | Collecting | Amber tag |
| Test | decided | Decided | Green tag |
| Test | no_winner | No clear winner | Slate |
| Test | cancelled | Stopped | Ghost outline |
| Test | failed | Needs attention | Coral tag |
| Channel | connected | Connected | Green tag |
| Channel | needs_reauth | Reconnect needed | Amber tag |
| Channel | disconnected | Disconnected | Ghost outline |
| Face photo | processing | Cutting out (live dot) | Accent soft |
| Face photo | failed | Could not use | Coral tag |
| Concept | failed | Credit refunded | Slate |

## 9. Component inventory (shadcn/ui mapping)

Build every component from the tokens; restyle shadcn primitives to the system, never use their defaults.

| Marquee component | Built from | Notes |
|---|---|---|
| Button, IconButton | shadcn Button | White, 1px \`--btn-edge\`, primary has a 1px ink edge. Sizes 32/36/46 |
| ThumbFrame | div + next/image | Section 3 |
| ScheduleStrip | ul of spans | Section 10.1 |
| ConfidenceMeter | progressbar role | Section 10.2 |
| StageEditor | react-konva Stage, Layer, Transformer | Section 7.4 |
| FaceTile | ThumbFrame square variant | Checkerboard background |
| PlanCard | Card | Square on marketing, 6px in app |
| Dialog | shadcn Dialog | 520px, 10% from top, morphs between steps |
| Menu | shadcn DropdownMenu | Portal, 160ms pop |
| Toast | sonner | Bottom left, 4 s, max 4, no full stop |
| Tabs | shadcn Tabs | 36px, underline in ink, not accent |
| Combobox | shadcn Command in Popover | Video picker with frames |
| Chart | Recharts LineChart | Hairline axes, variant inks, no gridlines except a 1px baseline |

## 10. Marquee components

### 10.1 Schedule strip
- One 28px cell per day, 4px gap, laid out across the full width (max 18 cells, they shrink to fit, min 24px).
- Each cell: 4px radius pill in the variant's fill and edge with the letter in its ink, 12px/500.
- Today: accent edge 1px and a 4px accent bar under the cell. Past days are full opacity; future days 60%.
- Skipped day: dashed edge and a faint "-" instead of the letter. Tooltip: "No data: the thumbnail was changed
  in Studio" or "YouTube refused this change".
- Under the strip, reserved 18px line: "Day 3 of 8 · B is live until midnight Pacific".

### 10.2 Confidence meter
- 64px wide, 4px tall, in the variant's ink colour, with the percent to the right (tabular, 13px). Animates
  width with the morph curve (300 to 500ms). Never shows 100%; caps the label at "99%".

### 10.3 Credits chip
- On every button that spends credits: "(6 credits)" inside the label, per the system voice rule. The button
  has a minimum width sized for "(12 credits)" so it never resizes.

### 10.4 Live dot
- 6px circle in the accent, pulsing 1.4s. Used for: generation in progress, test running (live variant), cut-out
  processing, waiting for YouTube. Nothing else loops.

## 11. Empty, loading and error states

| Place | Empty | Loading | Error |
|---|---|---|---|
| Projects | "Make your first thumbnail" block | 8 skeleton rows: hairline row with a frame box and two faint 8px bars | "Could not load projects. Retrying." toast; table keeps the last data |
| Gallery | Never empty (6 cards reserved) | Card loading pattern | Failed card with "Credit refunded" |
| Editor | Blank stage with "Add a face or text from the left" | Stage frame with a centred 16px spinner after 200ms | "Could not save. Your changes are kept here and will retry." (inline in the status slot) |
| Tests | "No tests yet" block | Skeleton rows | Banner on the row: "Paused: reconnect your channel" with a "Reconnect" link |
| Faces | Dashed upload zone filling the grid area | Tiles with live dots | Failed tile with reason |
| Channels | "Connect your channel to test thumbnails on real videos" | Skeleton rows | Reconnect pill and banner |
| Billing | Not applicable | Meter rows keep their height | "Could not reach Stripe. Try again in a minute." |

Spinners wait 200ms before showing and stay at least 400ms (system rule).

## 12. Microcopy

| Moment | Text |
|---|---|
| Generate button | Generate 6 concepts (6 credits) |
| Regenerate one | Regenerate (1 credit) |
| Not enough credits | You have 4 credits left. Generating needs 6. Upgrade or wait until 1 Nov. |
| No face found | We could not find a face in this photo. Try one where your face fills about a third of the frame. |
| Two faces | This photo has more than one face. Use a photo with only you in it. |
| Blurry | This photo is too blurry to cut out cleanly. Try a sharper one. |
| Concept failed | This concept did not render. Your credit is back. |
| Export too big | This design is too detailed to fit 2 MB. Remove the background texture or an image layer. |
| Video too new | This video is under 3 days old. Views change fast in the first days, so results can mislead. Test anyway? |
| Channel cannot set thumbnails | YouTube says this channel cannot use custom thumbnails yet. Verify your phone number in YouTube Studio, then restart the test. |
| Reconnect | YouTube stopped accepting Marquee's access for this channel. Reconnect to keep testing. |
| Quota full | Testing is full for today. It opens again at midnight Pacific. |
| Too early | Too early to call. Results firm up after day 8. |
| Collecting | Waiting for YouTube's numbers. YouTube sends impressions 1 to 2 days late. |
| Winner | B won with 34% more clicks per impression. It is now live on your video. |
| No winner (impressions) | Not enough impressions to be sure. Each version needs about 1,500. Keep the one you like best. |
| No winner (guardrail) | B got more clicks, but viewers left sooner. Marquee kept your original so your watch time is safe. |
| Toasts | Design saved · Exported, 412 KB · Test started · Thumbnail restored · Invite sent |

## 13. Emails

Plain, white, 560px, Geist with system fallbacks, the logo mark and "Marquee" at the top, 13 to 14px body. One
white button with an ink edge (the email version of the primary). For \`test_decided\`, include the winning
thumbnail (from a signed URL valid 7 days) at 480x270 with the variant tag, the lift and the confidence, and a
second line with the loser for comparison. No colour blocks.

## 14. Motion (Marquee additions)

- Concept image arrival: fade 200ms; no scale. Cards never reorder.
- Schedule strip "today" marker moves to the next cell with transform 300ms (morph curve) when the day changes
  while the page is open.
- Confidence meter width eases 400ms.
- Editor: no animation on layer moves (direct manipulation). Panels never animate in; they are always there.
- Reduced motion: images appear instantly, meters jump, the live dot stays still with the label.

## 15. Responsive

- Editor: 1100px and wider only (message under that).
- Gallery: 3, 2, 1 columns at 1280, 1100, 640.
- Test detail on a phone: hero frame full width, decision panel under it, schedule strip scrolls sideways inside
  its own container (never the page), table becomes stacked cards per variant.
- Check every page at 320, 375, 430, 1100, 1280 and 1440px.

## 16. Accessibility

- Every ThumbFrame has alt text: the headline plus "concept 3 of 6" or "variant B".
- Variant identity never relies on colour only: the letter is always shown.
- The editor stage has a hidden layer list mirror for screen readers with buttons to select layers; arrow keys
  move the selection.
- The schedule strip is a list with each day as "Day 3, variant B, today".
- Charts have a data table toggle ("Show as table").

## 17. What not to do

- No red YouTube-style buttons, no saturated colour anywhere in the chrome.
- No filled or black buttons, including "Export" and "Start test".
- No confetti or celebration motion on a winner. The number is the celebration.
- No "AI magic" sparkle animations. One static sparkles icon in the empty state is the limit.
- Never show "B wins" before the test is decided.
- Never resize a card, row or button when an image, a count or a status arrives.
`
