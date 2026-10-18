// Signet design PRD (DESIGN.md). Builds on Quiet Precision (DESIGN_SYSTEM.md).

export const designPrd = `# Signet: design PRD

Save this file as \`DESIGN.md\` in the project root. It builds on **DESIGN_SYSTEM.md** (Quiet Precision), which
is the base design system for every screen. Save that file next to it as \`DESIGN_SYSTEM.md\`, and put this line in
\`CLAUDE.md\`:

\`\`\`md
UI rules: @DESIGN_SYSTEM.md @DESIGN.md
\`\`\`

DESIGN_SYSTEM.md decides the neutrals, type, radii, sizes, motion, components and stability rules. This file only
adds what is different for Signet: the brand accent, the product-specific screens and the components those screens
need. Where the two disagree, this file wins only for the accent and the Signet screens. Every stability, motion and
component rule in DESIGN_SYSTEM.md still applies.

## 1. Brand

- **Name:** Signet. A signet is the ring a merchant pressed into wax to seal a letter: proof of who sent it and that
  nobody opened it. That is the product: a proposal sent fast, sealed when signed.
- **Tagline:** Proposals from a sales call.
- **Personality:** a calm senior account manager. Organised, exact, never salesy.
- **Two surfaces, two jobs:**
  1. **The app** (agency side): Quiet Precision as written. Dense, keyboard friendly, light only.
  2. **The share page** (client side): still Quiet Precision (white, hairlines, Geist, 6px boxes), but the accent
     comes from the agency's brand kit, so the client sees the agency, not Signet.

## 2. Brand accent: seal violet

Signet swaps the system's pastel blue for a pastel violet (wax-seal violet). It keeps the same three-part shape: a
mid accent, a soft fill and an edge. It marks "selected" and "in progress" only, exactly where the system uses blue.

| Token | Hex | Replaces | Use |
|---|---|---|---|
| \`--accent\` | #7f72d9 | \`--blue\` | Selected nav icon (duotone), progress bars, live dot, focus of selected chips |
| \`--accent-soft\` | #f4f2fd | \`--blue-soft\` | Selected row, selected nav item, selected pricing option fill |
| \`--accent-edge\` | #d5cff5 | \`--blue-edge\` | Selected borders, the recommended option edge, the drag target line |

Why violet, not amber: the system's warning is amber (#d18b0f), and meters turn amber under 20%. A violet accent
keeps "in progress" and "running low" apart at a glance.

Everything else is the system palette unchanged: white surfaces, \`--hairline\` #e6e6e9 structure, \`--divider\`
#efeff1 between rows, \`--btn-edge\` #dcdde0, ink #08090a, body #3c4149, muted #62666d, faint #8a8f98, ghost #b4b8bf,
success #27a644, warning #d18b0f, danger #eb5757.

\`\`\`css
:root {
  /* Signet accent (replaces the system blue) */
  --accent: #7f72d9; --accent-soft: #f4f2fd; --accent-edge: #d5cff5;
  /* keep the system names pointing at the accent so shared components need no changes */
  --blue: var(--accent); --blue-soft: var(--accent-soft); --blue-edge: var(--accent-edge);
}
\`\`\`

### 2.1 Status tag hues

Status maps to fixed tag hues (pastel fill at 6 to 9% opacity, darker edge, readable ink, 4px pill, 13px text).

| Status | Hue | Fill | Edge | Ink |
|---|---|---|---|---|
| Draft | Grey | #f5f5f6 | #dcdde0 | #62666d |
| Sent | Violet | #f4f2fd | #d5cff5 | #5446b8 |
| Viewed | Blue | #f1f5fd | #c4d4f5 | #3a5fb8 |
| Signed | Green | #eef8f1 | #bfe3c9 | #1d7a35 |
| Paid | Green + coin icon | #eef8f1 | #bfe3c9 | #1d7a35 |
| Lost | Grey, value struck through | #f5f5f6 | #dcdde0 | #8a8f98 |
| Expired | Amber | #fdf6e7 | #f0d9a8 | #8f5d05 |
| Failed (calls) | Coral | #fdf0f0 | #f6c9c9 | #b33a3a |

Free labels (template tags, service categories) hash to the first seven of the eight system tag hues.

### 2.2 Agency accent on the share page

The brand kit stores one \`primary_hex\` that the agency chooses. The share page derives the three accent parts from
it so any colour still reads as Quiet Precision:
- \`--accent\` = the agency colour as chosen (used for text links, the selected option edge, the progress line).
- \`--accent-soft\` = the agency colour at 7% opacity over white.
- \`--accent-edge\` = the agency colour at 35% opacity over white.
- If the chosen colour has less than 3:1 contrast on white, darken it in steps of 5% lightness until it passes and
  use that for text. Compute this once in \`lib/brand.ts\` (\`brandToCssVars(brand)\`), used by the share page and the
  brand preview.

## 3. Type in Signet

Geist 400, 500, 600 as in the system. App UI text is 13/18 everywhere. Signet only adds two reading styles for long
proposal copy, both inside the system's size scale:

| Role | Size / line height | Weight | Where |
|---|---|---|---|
| Proposal body (editor canvas and share page) | 16 / 26, max 65 characters wide | 400 | Section paragraphs |
| Proposal section heading | 24 / 32 (system H2) | 500 | Section titles |
| Proposal cover title | 35 / 1.12 (system H1) | 500 | Cover only |
| Pricing total | 24 / 32, tabular-nums | 500 | Option cards |
| Typed signature | 32 / 40, Geist 400 italic synthesis off: use the agreed script face "Caveat" for the signature line only | 400 | Sign block |

The typed signature is the one exception to "one family": it is a picture of a name, not UI text, and it is never
used anywhere else.

## 4. Components (Signet-specific)

Build every component from DESIGN_SYSTEM.md section 07 (white buttons with a firm-edged primary, 36px controls, 6px
boxes, 4px pills). Signet adds:

- **StatusPill:** the hues in 2.1. Width fixed to the longest label ("Expired") so a status change never resizes
  the column.
- **JobProgress:** 4 labelled steps in one row (Upload, Transcribe, Read the call, Draft), 13px labels, a 2px line
  between 8px dots. Done dots: success. Current: the accent dot pulses (the system's one looping motion, 1.4s).
  Failed: danger dot, the error on the line below (min-height reserved so the row never jumps), a "Retry" button.
  The bar width eases with the morph curve over 400ms when a step completes.
- **UsageMeter:** the system meter. Accent fill, amber when under 20% remains, coral under 5%. Label "7 of 100"
  in tabular figures, width fixed for three-digit counts.
- **SectionCard:** editor block wrapper. 1px hairline, 6px radius, 24px padding. Left: drag handle (visible on hover
  with \`visibility\`, never inserted, so text does not shift). Right toolbar (also visibility-toggled): Rewrite,
  Move up, Move down, More.
- **PricingOptionCard:** tier label (faint, 13px), name (H3), summary, line items table (36px header, 48px rows,
  tabular numbers), total. Recommended: \`--accent-edge\` border and a "Recommended" violet pill. Selected on the share
  page: \`--accent-soft\` fill plus \`--accent-edge\` border (no size change).
- **RewriteDiff:** inline word diff. Removed words: danger ink with a line-through on a coral tag fill. Added words:
  success ink on a green tag fill. Keep (primary, firm edge) and Discard. The card height morphs (300ms) from the
  original to the diff; width never changes.
- **SignaturePad:** white canvas, 1px hairline box, 6px radius, a dashed baseline (dashed is allowed here because it
  is an "add your mark here" affordance). 2px stroke in ink. "Clear" text button. Pointer events for mouse, pen and
  touch. Exports PNG at 2x.
- **HashBadge:** first 8 and last 4 characters of the hash ("3fa9c1e2...7b0d") in Geist tabular figures (no
  monospace, per the system), a copy icon button (Lucide Copy 14px, labelled "Copy fingerprint"), tooltip "SHA-256
  fingerprint of the signed content".
- **Recorder:** a large (46px) white button with a firm edge, a 10px danger dot and the label "Record" or "Stop".
  Timer in tabular figures with a fixed width (00:00:00). Five 3px level bars in the accent. No filled red button.
- **EmptyState:** a single-line illustration (1.5px stroke, accent and ink only: an envelope with a small wax seal),
  one sentence, one primary button. Max 320px wide, centred in the content area.

## 5. Icons

The system rule: navigation uses Phosphor at 17px (regular at rest, duotone in the accent when selected); in-content
icons use Lucide 14 to 16px with a 1.5 stroke.

Sidebar (Phosphor): FileText (Proposals), Microphone (Calls), Stack (Templates), ChartBar (Analytics), Tag
(Catalogue), Palette (Brand), BookOpen (Documentation), Lifebuoy (Help), CreditCard (Billing), Gear (Settings).

## 6. App shell

Per the system: no top bar and no page titles. A white 240px sidebar with a right hairline, then each page starts
with its 48px page toolbar.

\`\`\`
+----------------------+-------------------------------------------------------------------+
| [seal] Signet        | Toolbar 48px: [search]  31 proposals            [New proposal]    |
| Acme Studio      v   |-------------------------------------------------------------------|
|                      | Filter bar 44px: [Status: Sent +1] [Owner: Me] [+ Add filter]     |
| Proposals            |-------------------------------------------------------------------|
| Calls                | Table header 36px                                                 |
| Templates            | Rows 48px ...                                                     |
| Analytics            |                                                                   |
| Catalogue            |                                                                   |
| Brand                |                                                                   |
|                      |                                                                   |
| (spacer)             |                                                                   |
| [Drafts 4 of 10]     |                                                                   |
| Documentation        |                                                                   |
| Help                 |                                                                   |
| Billing              |-------------------------------------------------------------------|
| Settings             | Footer bar 48px: paging, totals                                   |
+----------------------+-------------------------------------------------------------------+
\`\`\`
- Top group: seal mark + "Signet", the workspace switcher (only if the user belongs to more than one), then
  Proposals, Calls, Templates, Analytics, Catalogue, Brand.
- Bottom group, always in this order: Documentation, Help, Billing, Settings. Above it, a compact UsageMeter
  ("Drafts 4 of 10") that links to Billing.
- One level, no nested menus, 10 items. Nav items 32px high, 6px radius. Selected: \`--accent-soft\` fill, ink text,
  duotone accent icon. Hover: \`--hover\`.
- Members (not owner) do not see Billing; the usage meter stays, read-only.
- Under 1100px the sidebar collapses to 56px icons with tooltips. Under 768px it becomes a sheet from the left that
  floats over the page (never reflows it), opened from a 32px icon button at the left of the toolbar.
- Account menu: avatar at the bottom of the sidebar (Profile, Log out).
- Keyboard: \`n\` new proposal, \`g p\` proposals, \`g c\` calls, \`/\` search, \`?\` shortcuts.

## 7. Screens

All screens: 13px UI text, 36px controls, fixed column widths, single-line cells with ellipsis, white everywhere.

### 7.1 Auth (\`/login\`, \`/signup\`, \`/reset\`)
- One 400px box centred at 20% from the top, 1px hairline, 6px radius, 32px padding. Seal mark and "Signet" above.
- Fields: Full name (signup only), Work email, Password with a show toggle. Primary button full width.
- Line under the button (muted): "7 days free. Your first proposal takes about 10 minutes."
- Errors under the field in danger ink with \`role=alert\`, never as a toast. The error line has a reserved
  18px min-height so the form does not jump.
- Invite link (\`/invite/[token]\`): heading "Join Acme Studio on Signet", email pre-filled and read-only.

### 7.2 Onboarding (\`/onboarding\`)
One dialog-like 520px box that morphs height between steps (system step morph), width constant. A 4-dot step
indicator at the top. Back as a text button.
1. **Workspace:** "What is your agency or business called?"
2. **Brand:** logo drop zone (dashed, "add" affordance), the agency colour picker with 8 swatches pulled from the logo,
   and a live mini share-page preview under it at a fixed 320px height.
3. **First service:** name, unit (project, month, hour, day), price, "Add another" (dashed row). Deposit % slider
   (default 30%). Helper: "Signet only prices from this list, so add the services you sell most."
4. **Get paid (optional):** "Take deposits when clients sign" with "Connect Stripe" (primary) and "Skip for now".
- Finish lands on \`/app/proposals\` with the first-run checklist.

### 7.3 Proposals list (\`/app/proposals\`)
- Toolbar: search, count ("31 proposals", fixed width), "New proposal" (primary).
- Filter bar: Status, Owner, Value, Sent date chips; "+ Add filter" dashed.
- First-run checklist (until done) as a 1px hairline box above the table: Upload your first call, Check the draft,
  Send it to yourself, Open it on your phone. Each ticks itself. Height reserved; dismiss fades it out and the table
  rises into place once.
- Columns (fixed widths): Client (name, company in muted after a dot), Title, Status (StatusPill), Value (right,
  tabular), Last activity ("Viewed 2h ago · 4 min on Pricing"), Owner (avatar 20px).
- Row hover \`--row-hover\`. Row click opens the editor. Row menu (portal): Open, Copy link, Duplicate, Save as
  template, Mark as lost, Delete (drafts only).
- Multi-select: checkboxes (2px radius) and the floating selection bar: "Mark as lost", "Export CSV".
- Empty: "No proposals yet. Upload a call and get your first draft in about 10 minutes." with "Upload a call"
  (primary) and "Start blank".
- Loading: 8 skeleton rows at 48px (no layout change when data arrives).

### 7.4 New proposal (\`/app/proposals/new\`)
- Toolbar: back arrow + "New proposal".
- Three option boxes in a row (stacked under 768px): **From a call** (violet "Recommended" pill), **From a
  template**, **Blank**.
- From a call has segmented tabs: Upload, Record, Import (Import shows an "On Studio" pill on Solo and stays
  clickable to an upgrade note).
- **Upload:** dashed drop zone 200px high, the formats line, Client name and Company inputs, a "Draft straight
  away" switch (on by default). After a drop the zone becomes the file row (name, size) with a progress bar
  (accent, eases), percent and time left in tabular figures, and Cancel. Then JobProgress replaces it in the same
  box, same height.
- **Record:** the Recorder component, timer, pause, five level bars, and the consent line underneath: "Tell everyone
  on the call you are recording." After stop: "Save and upload".
- **Import:** provider tabs (Zoom, Google Meet). Not connected: a connect box. Connected: a table of recordings
  (date, topic, duration) with "Import" per row (fixed width, shows a spinner in place after 200ms).

### 7.5 Call detail (\`/app/calls/[id]\`)
- Toolbar: call title (editable inline), JobProgress (compact), "Draft proposal" or "Open proposal".
- Two columns split by a hairline. Left 60%: transcript. Speaker tags (4px pills in two tag hues), rename by click
  ("Client", "Me"). Each utterance: timestamp (faint, tabular), speaker, text. Search highlights matches with
  \`--accent-soft\`.
- Right 40%, scrolls on its own: the **Brief** in hairline-separated groups: Goals, Pains, Budget signals (the quote
  in muted, an amount pill), Scope, Timeline, Decision makers, Objections, Open questions (amber tag pill per item:
  "Ask before you send"). Every item edits inline; "Add item" is a dashed row.
- Recommended services: toggleable tags from the catalogue.

### 7.6 Editor (\`/app/proposals/[id]\`)
\`\`\`
+--------------------+----------------------------------------------+-------------------+
| Toolbar 48px: [<] Northwind Coffee website   Saved       [Preview] [Send]             |
+--------------------+----------------------------------------------+-------------------+
| Sections           | Cover: logo, title, client, date             | Status  [Sent]    |
|  Exec summary      |                                              | Client  Jane Cole |
|  Problem           | [SectionCard: Exec summary]                  | Email   jane@...  |
|  Solution          | [SectionCard: Problem]                       | Follow-ups  (on)  |
|  Scope             | [SectionCard: Solution]                      | Rewrites  7/100   |
|  Timeline          | ...                                          | Activity          |
|  Pricing (locked)  | [Pricing: 3 PricingOptionCards]              |  Viewed 2h ago    |
|  Terms             | ...                                          |  Sent yesterday   |
|  Next steps        |                                              |                   |
|  + Add section     |                                              |                   |
+--------------------+----------------------------------------------+-------------------+
\`\`\`
- Left rail 220px with a right hairline: drag to reorder (dnd-kit; the drop target is a 2px \`--accent-edge\` line,
  nothing reflows until drop). Pricing is pinned after Timeline with a Lucide Lock 14px icon.
- Canvas: white, max 720px, proposal type styles from section 3, agency accent from the brand kit so the agency sees
  what the client sees.
- Blocks: paragraph, heading, bullets, quote, table, image. "/" opens a command menu (portal, 160ms pop).
- Autosave 800ms after typing stops. "Saved" sits in the toolbar in a fixed-width slot ("Saving" and "Saved" share
  the slot, so the toolbar never shifts).
- **Rewrite:** opens a popover from the section's Rewrite button: six tone tags (Shorter, Longer, More confident,
  Friendlier, More formal, Plainer) and a field "Tell it what to change". On submit the Rewrite button keeps its
  label and overlays a spinner (after 200ms); the section shows the live dot "Rewriting". Then RewriteDiff with Keep
  and Discard and the model's one-line note in muted.
- **Pricing:** three PricingOptionCards in a row (stacked under 900px). Line items: service select, quantity, unit
  price (read-only from the catalogue; owners/admins get an "Override" text button), line total. Totals in tabular
  figures with a fixed width so typing a bigger quantity never moves the column. Recommended radio.
- Right panel 300px, left hairline.
- **Unsent changes:** a 36px hairline-boxed notice at the top of the canvas with an amber tag: "You have changes the
  client cannot see yet." and "Send update" (primary). Space reserved: the notice uses \`visibility\` when hidden.
- **Signed:** canvas read-only; notice with a green tag: "Signed by Jane Cole on 14 Oct 2026, 15:42", the HashBadge,
  "View signature" and "Verify" text buttons.

### 7.7 Send dialog
- 520px dialog, opens at 10% from the top. Segmented control: "Email it for me" and "Copy link"; the dialog morphs
  height between them, width fixed.
- Email: To, Subject ("{title} from {agency}"), Message (3 lines, editable), "Send me a copy" checkbox. Primary "Send
  proposal".
- Copy link: read-only input with "Copy" (label becomes "Copied" in the same width for 2s), expiry select (30, 60,
  90 days), "Revoke link" danger text button.
- Success morphs in place: a success tick, "Sent. We will email you the moment they open it." and "Done".

### 7.8 Activity (\`/app/proposals/[id]/activity\`)
- Timeline table (48px rows): Sent, Opened (device, never IP), Section time, Follow-up sent, Signed, Deposit paid.
  Each with time in tabular figures.
- Section heatmap: one row per section with a bar (accent for the longest, \`--accent-edge\` for the rest) and the
  total and median per visit in fixed-width columns.
- Option interest: three bars for Good, Better, Best.

### 7.9 Templates, Catalogue, Brand
- **Templates:** table (name, sections, last used, created by) with "Use template" per row. Empty: "Save any
  proposal as a template from its menu."
- **Catalogue:** segmented tabs Services and Pricing rules. Services: table (name, unit, price, active switch) and
  "Add service" dialog. Pricing rules: a single-column form (currency, minimum project, deposit %, rush fee %,
  annual discount %, payment terms days, validity days, tax note, "Other rules for the AI" with a 2,000 character
  counter in tabular figures). Members see it read-only with the note "Only owners and admins can edit".
- **Brand:** left a form (logo, cover image, agency colour with the 8 suggested swatches, sender name, footer text,
  voice notes "How should proposals sound? For example: direct, warm, no jargon"). Right a live share-page preview
  at 375px wide, fixed height, scrolls inside.

### 7.10 Analytics (\`/app/analytics\`)
- Toolbar: period select (30, 90, 365 days), member select (Studio and Agency).
- Four stat boxes in a row (hairline, 6px): Win rate ("39%", "12 of 31" in muted), Average deal size, Median time to
  sign ("3.4 days"), Median time to first view ("2.1 hours"). Numbers count up once (system counter rules, tabular,
  fixed width).
- Below: proposals by status per month (stacked bars in the status hues), option mix (three bars), most read section.
- Every chart has a "View as table" toggle. Empty: "Send 5 proposals to see your win rate."

### 7.11 Billing (\`/app/billing\`, owner only)
- Plan box: plan, price, interval, renewal or trial end, "Manage billing" (Stripe portal) and "Change plan".
- Usage box: four UsageMeters (Drafts from calls, Call minutes, Rewrites, Seats) and "Resets on 1 Nov".
- Plans: three plan boxes with a Monthly/Annual segmented control ("2 months free" pill). Prices in tabular figures in
  a fixed-width slot so the toggle never shifts the layout. Current plan marked with a violet "Current" pill.

### 7.12 Settings (\`/app/settings\`)
Segmented tabs: Profile (name, avatar, timezone), Workspace (name, referrals, danger zone box to delete the
workspace), Team (members table with role select for the owner, Remove; invite form: email + role; pending invites
with Revoke; "2 of 3 seats" in tabular figures), Integrations (three boxes: Stripe payouts, Zoom, Google Meet, each
with a status pill and one button: Connect, Reconnect or Disconnect), Notifications (switches: viewed, signed, paid,
daily digest).

### 7.13 Documentation and Help
- **Documentation:** two columns split by a hairline: article list (Recording a call, Getting the best draft,
  Pricing rules, Sending and tracking, Signatures and the fingerprint, Deposits and Stripe, Team roles) and the article
  (16/26 reading style, 65 characters wide).
- **Help:** subject, message, optional screenshot, "Send message" (primary). Note: "We reply within one working day."

### 7.14 Paywall (\`/paywall\`)
One 520px box at 20% from the top: "Your trial has ended" or "Your plan is paused", the three plans, "Choose a plan".
Members see "Ask {owner name} to restart the plan" and no buttons.

## 8. The share page (\`/p/[token]\`)

Quiet Precision with the agency's accent (section 2.2). Light, white, hairlines, Geist, 6px boxes. Signet is a
small footer line, removable on Studio and Agency.
- **Cover:** white, a bottom hairline. Agency logo (max 32px high) top left, cover title (H1), "Prepared for Jane
  Cole, Northwind Coffee" in muted, date and "Valid until 13 Nov 2026" in faint. Optional cover image in a 6px box
  below, fixed 16:7 aspect ratio so it never shifts on load.
- **Section nav:** under 1100px a 44px chip bar under the cover (scrolls sideways, the active chip in the agency
  accent soft fill); above 1100px a right rail list. Active state follows scroll with no layout change.
- **Sections:** max 680px, 48px between sections, hairline between them. Quotes: a 2px left border in the agency
  accent, the speaker in muted after the quote.
- **Pricing:** three PricingOptionCards (stacked on mobile, recommended first on mobile). "Choose this option" is a
  radio row inside each card. Selected: accent soft fill and edge.
- **Sign block:** a hairline box: the chosen option summary, Full name, Email, Title (optional), "Type your
  signature" with a live preview in the signature face, SignaturePad, the agreement checkbox, and "Sign proposal"
  (primary: white with a firm ink edge, 46px large, full width on mobile). Evidence note under it in muted: "Your
  name, the time, your IP address and a fingerprint of this proposal are recorded."
- **After signing:** the box morphs (height only) into the confirmation: success tick, "Signed", the HashBadge and,
  when a deposit is due, "Pay $3,600 deposit" (primary). After Stripe: "Confirming your payment with Stripe" with the
  live dot (polls every 3 s for up to 60 s), then "Deposit received". Only shown once the webhook confirmed it.
- **Not available:** one box: "This proposal is no longer available. Contact {agency} for a new link." The same for
  revoked, expired and unknown links. Paused: "This proposal is paused. Contact {agency}."
- **Footer:** "Sent with Signet" (Solo plan) and the agency footer text, faint, 13px.
- **Print:** hide nav and buttons, keep the signature, the hash and the signed date.

## 9. States

- **Loading:** skeletons shaped like the content at final size (rows 48px, stat boxes, section boxes). Spinners
  follow the system timing (after 200ms, at least 400ms).
- **Empty:** EmptyState with one action; copy in section 15.
- **Errors:** inline hairline box with a coral tag: what happened and the fix ("The file is over 1 GB. Export audio
  only from Zoom and try again."). Toasts only for background events ("Draft ready"), bottom left, no full stop.
- **Limits:** amber tag notice at 80%; at 100% the action button stays the same width, disabled (ghost ink) with a
  tooltip and an "Upgrade" text button beside it.
- **Offline:** a 36px notice above the toolbar content area: "You are offline. Changes will save when you reconnect."
- **Job failed:** JobProgress danger dot, the human error, "Retry", "Contact us".

## 10. Motion (Signet moments, within the system curves)

| Moment | Duration | Movement |
|---|---|---|
| JobProgress step completes | 400ms | Line width eases (morph curve); next dot starts the 1.4s pulse |
| Rewrite diff appears | 300ms | Section height morphs, diff fades up 4px after 60ms |
| Send dialog tab switch and success | 300ms | Height morph, width fixed |
| Pricing option select (share page) | 120ms | Fill and edge colour only, no scale |
| Sign block to confirmation | 300ms | Height morph, content fades up 4px |
| Proposal rows | 360ms | Rise once per session, 25ms stagger, capped at 270ms |
| Signature stroke | live | No smoothing lag (pointer events + requestAnimationFrame) |

Reduced motion: everything shows its end state instantly; the live dot stays solid.

## 11. Accessibility

- System rules apply (visible 2px focus outline with 2px offset, real roles, labelled icon buttons, Escape closes
  overlays, polite toasts).
- Status is never colour alone: StatusPill always shows the word.
- JobProgress is a \`progressbar\` with values and an \`aria-live="polite"\` step label.
- SignaturePad has an alternative: "I cannot draw a signature" renders the typed name as the image and records
  \`drawn_method: typed_render\` in the evidence.
- Recorder: Space toggles record and pause when focused; timer and level have text equivalents.
- Charts have "View as table".
- Agency accent text is checked for 3:1 (2.2) and body text stays system ink.

## 12. Mobile

- App: sidebar sheet, editor rail becomes a "Sections" select at the top of the canvas, right panel becomes a 48px
  footer bar with Preview and Send. Tables become stacked rows (client, status, value).
- Share page designed at 375px first, checked at 320, 375 and 430px (system rule). After the reader passes Pricing,
  a 48px footer bar with "Review and sign" floats at the bottom (overlay, never reflows). SignaturePad full width,
  180px high.
- Recorder works on iOS Safari (MediaRecorder with audio/mp4 when webm is not supported).

## 13. Emails (React Email)

- 600px, white, a 1px hairline box, Geist with system fallbacks, 14px body for email clients.
- Client emails carry the agency logo and the agency accent on the one button (white with an accent edge).
  Owner emails carry the Signet seal and an ink-edged button.
- Plain text version of every email. Footer: agency name and address (client), notification settings (owner),
  unsubscribe (client reminders only).

## 14. Component states

| Component | Rest | Hover | Focus | Selected / active | Disabled |
|---|---|---|---|---|---|
| Primary button | White, firm ink edge, ink 500 text | \`--hover\` fill | 2px outline, 2px offset | Press to 98% | Ghost ink, \`--btn-edge\`, tooltip says why |
| Secondary button | White, \`--btn-edge\`, body ink | \`--hover\` fill | Same | Press to 98% | Ghost ink |
| Danger text button | Danger ink, no edge | Coral tag fill | Same | Press to 98% | Ghost ink |
| Input | White, \`--btn-edge\` | \`--faint\` edge | Darker edge + 3px ink halo | n/a | \`--hover\` fill, ghost ink |
| Table row | White | \`--row-hover\` | Inset 2px accent edge | \`--accent-soft\` | n/a |
| Nav item | White | \`--hover\` | Outline | \`--accent-soft\` + duotone icon | n/a |
| SectionCard | Hairline | Handle and toolbar visible | Accent edge | Shadow-float while dragging | Read-only: handle and toolbar hidden with visibility |
| PricingOptionCard | Hairline | Body unchanged | Accent outline | Accent soft fill + edge | n/a |

## 15. Microcopy

| Place | Copy |
|---|---|
| Upload drop zone | "Drop your call recording here, or choose a file. MP3, M4A, MP4, WAV or WebM, up to 1 GB." |
| Upload in progress | "Uploading 34 MB of 61 MB · about 40 seconds left. You can leave this page." |
| Transcribing | "Transcribing your call. A 45 minute call takes about 3 minutes." |
| Reading the call | "Reading the call for goals, pains, budget and timeline." |
| Brief ready | "Here is what we heard. Fix anything that is wrong, then draft." |
| Drafting | "Writing your proposal from your catalogue and pricing rules." |
| Draft ready toast | "Proposal for Northwind Coffee ready" |
| No speech found | "We could not hear a conversation in this file. Check it plays, then try again." |
| Call too long | "This call is 2 h 10 min. Your plan transcribes calls up to 90 minutes. Trim it or upgrade." |
| Rewrite placeholder | "For example: mention the Shopify migration, cut to 100 words" |
| Rewrite button | "Rewrite (1 of 100 left this month)" shown in the tooltip, label stays "Rewrite" |
| Rewrite limit | "You have used all 100 rewrites this month. Upgrade or wait until 1 Nov." |
| Unsent changes | "You have changes the client cannot see yet." |
| Send success | "Sent. We will email you the moment they open it." |
| Follow-up switch | "Send a friendly nudge if it is not signed after 3 days" |
| Viewed (activity) | "Opened on iPhone · read for 6 min · 2 min 40 s on Pricing" |
| Sign button | "Sign proposal" |
| Signed (client) | "Signed. A copy is on its way to jane@northwind.co." |
| Deposit button | "Pay $3,600 deposit" |
| Confirming payment | "Confirming your payment with Stripe" |
| Verify OK | "Unchanged since signing. The fingerprint matches." |
| Verify mismatch | "This content does not match what was signed. Contact the sender." |
| Not available | "This proposal is no longer available. Contact Acme Studio for a new link." |
| Seat limit | "All 3 seats are in use. Remove someone or move to Agency for 10 seats." |
| Paused page | "This proposal is paused. Contact Acme Studio." |

## 16. Hand-off checklist for Claude Code

1. \`DESIGN_SYSTEM.md\` and \`DESIGN.md\` in the repo root; CLAUDE.md has \`UI rules: @DESIGN_SYSTEM.md @DESIGN.md\`.
2. System starter tokens in \`app/globals.css\`, plus the Signet accent block from section 2. No raw hex in
   components (grep \`components/\` for \`#\`).
3. Geist via \`next/font\` (400, 500, 600). Caveat loaded only on \`/p/*\` for the signature line.
4. shadcn/ui themed to the system: white buttons only, firm-edged primary, 6px boxes, 4px pills, 36px controls.
5. Sidebar matches section 6, bottom group order: Documentation, Help, Billing, Settings. No top bar.
6. Every screen in section 7 has its empty, loading and error state from section 9.
7. Stability check: change a count from 1 to 100, toggle loading on every button, switch the pricing toggle, open the
   rewrite diff. Nothing else on the screen may move.
8. Screenshots at 375px and 1440px: proposals list, editor, share page, sign block.
`
