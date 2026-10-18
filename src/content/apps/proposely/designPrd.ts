// Proposely design PRD (DESIGN.md).

export const designPrd = `# Proposely: design PRD

Save as \`DESIGN.md\` in the project root next to \`PRD.md\`. Reference it in Claude Code with \`@DESIGN.md\`.
This file decides how everything looks, moves and reads. Build with Tailwind and shadcn/ui. Every colour
comes from the tokens below, never a raw hex in a component.

## 1. Brand

- **Name:** Proposely
- **Tagline:** Proposals from a sales call.
- **Personality:** a calm senior account manager. Organised, warm, quick. Never salesy, never cute.
- **Feel:** warm paper and amber ink. Think a well-made letterpress invoice, not a crypto dashboard.
- **Voice in UI copy:** short sentences, verbs first, numbers over adjectives. "Draft ready in about
  4 minutes" beats "Hang tight, magic is happening!". No exclamation marks. British spelling.
- **Two surfaces, two jobs:**
  1. The app (agency side): dense, fast, keyboard friendly, light and dark mode.
  2. The share page (client side): the agency's brand, not ours. Calm, readable, mobile first, light only
     (clients screenshot and print it).

## 2. Design tokens

Define as CSS variables in \`app/globals.css\` and map them in \`tailwind.config.ts\` (\`bg-surface\`,
\`text-ink\`, \`border-line\` and so on). No solid black blocks anywhere: dark mode uses deep warm brown-grey,
and emphasis uses soft tints, not heavy fills.

### 2.1 Light

| Token | Value | Use |
|---|---|---|
| \`--bg\` | #FBF7F1 | App background (warm paper) |
| \`--surface\` | #FFFFFF | Cards, editor canvas |
| \`--surface-2\` | #F6EFE4 | Sidebar, table header, inset panels |
| \`--ink\` | #2A2118 | Main text |
| \`--ink-soft\` | #5B4E40 | Body copy, secondary text |
| \`--muted\` | #8A7B69 | Captions, placeholders |
| \`--line\` | #EADFCF | Borders, dividers |
| \`--brand\` | #B45309 | Primary buttons, active nav, focus ring |
| \`--brand-hover\` | #9A4507 | Button hover |
| \`--brand-soft\` | #FDECD3 | Selected rows, active nav background, highlights |
| \`--brand-ink\` | #3D1D02 | Text on \`--brand-soft\` |
| \`--ok\` | #2F7A4D | Signed, paid |
| \`--ok-soft\` | #E3F2E8 | Signed badge background |
| \`--info\` | #2B6CB0 | Viewed |
| \`--info-soft\` | #E4EEF8 | Viewed badge background |
| \`--warn\` | #B7791F | Limits at 80%, unsent changes |
| \`--warn-soft\` | #FBF0D9 | Warning banners |
| \`--danger\` | #B83A2E | Errors, failed calls, destructive actions |
| \`--danger-soft\` | #F9E3E0 | Error banners |
| \`--focus\` | 0 0 0 3px rgba(180, 83, 9, 0.35) | Focus ring |

### 2.2 Dark (app only)

| Token | Value |
|---|---|
| \`--bg\` | #1C1814 |
| \`--surface\` | #241F1A |
| \`--surface-2\` | #2C261F |
| \`--ink\` | #F4ECE1 |
| \`--ink-soft\` | #D3C6B6 |
| \`--muted\` | #A39482 |
| \`--line\` | #3A332B |
| \`--brand\` | #F0A04B |
| \`--brand-hover\` | #F5B36B |
| \`--brand-soft\` | #3B2A17 |
| \`--brand-ink\` | #FCE2C2 |
| \`--ok\` / \`--ok-soft\` | #6BC28F / #1F3327 |
| \`--info\` / \`--info-soft\` | #7FB0E6 / #1D2A3A |
| \`--warn\` / \`--warn-soft\` | #E8B45C / #3A2E18 |
| \`--danger\` / \`--danger-soft\` | #EE8A7F / #3D211E |

Dark mode follows the system setting, with a toggle in Settings, Profile (System, Light, Dark).

### 2.3 Radius, shadow, spacing

| Token | Value | Use |
|---|---|---|
| \`--radius-sm\` | 8px | Inputs, badges |
| \`--radius\` | 12px | Cards, dialogs |
| \`--radius-lg\` | 18px | Share page sections, pricing cards |
| \`--shadow-1\` | 0 1px 2px rgba(61, 29, 2, 0.06) | Cards at rest |
| \`--shadow-2\` | 0 8px 24px rgba(61, 29, 2, 0.10) | Popovers, dragged block |
| \`--shadow-3\` | 0 20px 48px rgba(61, 29, 2, 0.14) | Dialogs |

Spacing scale: 4, 8, 12, 16, 20, 24, 32, 40, 56, 72 px. Page padding 24px desktop, 16px mobile.

## 3. Typography

- **UI:** Inter (400, 500, 600) with \`font-feature-settings: "tnum"\` on numbers in tables and meters.
- **Display and proposal headings:** Fraunces (500, 600), optical size on. Used for page titles in the app
  and for every heading on the share page. It gives proposals a printed, considered feel.
- Load both with \`next/font/google\`, \`display: swap\`.

| Style | Size / line height | Weight | Font |
|---|---|---|---|
| Page title | 28 / 1.2 | 600 | Fraunces |
| Section title | 20 / 1.3 | 600 | Inter |
| Body | 15 / 1.55 | 400 | Inter |
| Small | 13 / 1.45 | 500 | Inter |
| Table | 14 / 1.4 | 400 | Inter, tabular figures |
| Share page H1 | 36 / 1.1 mobile, 52 / 1.05 desktop | 600 | Fraunces (or the brand kit font pair) |
| Share page body | 17 / 1.65 | 400 | Inter (or the brand kit pair) |

Brand kit font pairs (share page only): \`inter-fraunces\` (default), \`dmsans-dmserif\`,
\`manrope-playfair\`, \`ibmplex-ibmplexserif\`. Store the key, load the pair on the share page only.

## 4. Components (shadcn/ui)

Button, Card, Dialog, Sheet, DropdownMenu, Popover, Tooltip, Tabs, Table, Badge, Input, Textarea, Select,
Switch, Checkbox, RadioGroup, Slider, Progress, Skeleton, Sonner (toasts), Command (for the "/" block
menu), Avatar, Separator, ScrollArea, AlertDialog.

Custom components:
- **StatusPill:** Draft (surface-2 / muted), Sent (brand-soft / brand-ink), Viewed (info-soft / info),
  Signed (ok-soft / ok), Paid (ok-soft / ok with a small coin icon), Lost (surface-2 / muted, strike
  through value), Expired (warn-soft / warn). Pill: 22px high, 8px radius, 12px text, 500 weight.
- **JobProgress:** 4 labelled steps (Upload, Transcribe, Read the call, Draft) with a thin progress
  line between dots. Done steps use \`--ok\`. Current step pulses softly (opacity 0.6 to 1, 1.6s). Failed step
  turns \`--danger\` with the error text and a Retry button underneath.
- **UsageMeter:** label, "7 of 100", a 6px bar. Turns \`--warn\` at 80%, \`--danger\` at 100%.
- **SectionCard:** the editor block wrapper with drag handle (left), title (editable inline), body
  (blocks), and a right toolbar: Rewrite, Move up, Move down, More (duplicate, delete).
- **PricingOptionCard:** tier label, name, summary, line items table, total. The recommended card has a
  2px \`--brand\` border and a "Recommended" chip.
- **SignaturePad:** canvas with a soft dotted baseline, "Clear" link, pointer events for mouse, pen and
  touch, 2.5px stroke in \`--ink\`. Exports PNG at 2x.
- **HashBadge:** monospace first 8 and last 4 characters of the hash ("3fa9c1e2...7b0d") with a copy
  button and a tooltip "SHA-256 fingerprint of the signed content".
- **EmptyState:** soft illustration area (an amber line drawing of an envelope with a waveform), title,
  one sentence, one primary button.

## 5. Iconography

lucide-react only, 18px in the app, 1.75 stroke. Sidebar: FileText (Proposals), Mic (Calls), LayoutTemplate
(Templates), BarChart3 (Analytics), Tags (Catalogue), Palette (Brand), BookOpen (Documentation), LifeBuoy
(Help), CreditCard (Billing), Settings (Settings).

## 6. App shell

\`\`\`
+--------------------+-------------------------------------------------------------+
| [logo] Proposely   |  Top bar: page title (Fraunces)      [search] [+ New] [avatar]|
|  Acme Studio  v    |-------------------------------------------------------------|
|                    |                                                             |
|  Proposals         |                     page content                            |
|  Calls             |                                                             |
|  Templates         |                                                             |
|  Analytics         |                                                             |
|  Catalogue         |                                                             |
|  Brand             |                                                             |
|                    |                                                             |
|  (flex spacer)     |                                                             |
|  [UsageMeter mini] |                                                             |
|  Documentation     |                                                             |
|  Help              |                                                             |
|  Billing           |                                                             |
|  Settings          |                                                             |
+--------------------+-------------------------------------------------------------+
\`\`\`
- Sidebar 240px wide, \`--surface-2\` background, 1px \`--line\` right border. One level only, no nested menus.
- Top group: logo + wordmark, workspace name with a small chevron (switch workspace, if the user belongs
  to more than one), then Proposals, Calls, Templates, Analytics, Catalogue, Brand.
- Bottom group, always in this order: Documentation, Help, Billing, Settings. Above it, a mini usage
  meter ("Proposals 4 of 10") that links to Billing.
- Nav item: 36px high, 10px radius, icon + label. Active: \`--brand-soft\` background, \`--brand-ink\` text,
  3px \`--brand\` bar on the left. Hover: \`--surface\`.
- Members (not owner) do not see Billing in the sidebar; they see the usage meter read-only.
- Top bar: 56px, page title left, global "+ New proposal" button (primary) right, avatar menu
  (Profile, Theme, Log out).
- Mobile (< 768px): sidebar becomes a Sheet from the left behind a menu button. Top bar keeps "+ New".
- Keyboard: \`n\` new proposal, \`g p\` proposals, \`g c\` calls, \`/\` search, \`?\` shortcut sheet.

## 7. Screens

### 7.1 Auth (\`/login\`, \`/signup\`, \`/reset\`)
- Split layout on desktop: left 45% a warm panel (\`--surface-2\`) with a tilted mock proposal card and the
  line "Your discovery call, turned into a signed proposal by this afternoon."; right 55% the form card.
- Mobile: form only, logo on top.
- Fields: Full name (signup only), Work email, Password (show/hide). Primary button full width.
- Under the button: "7 days free. Your first proposal takes about 10 minutes."
- Errors inline under the field in \`--danger\`, never as a toast.
- Invite links (\`/invite/[token]\`): the card header says "Join Acme Studio on Proposely", email pre-filled
  and locked.

### 7.2 Onboarding (\`/onboarding\`)
Centred card 640px wide, 4 steps with a progress bar on top ("Step 2 of 4"). Back link on each step.
1. **Workspace:** "What is your agency or business called?" Input. Button "Continue".
2. **Brand:** logo drop zone (PNG, SVG, JPG, under 5 MB), primary colour picker with 8 suggested swatches
   pulled from the logo (use \`fast-average-color\` or a small k-means on the canvas), live preview of a mini
   proposal cover on the right.
3. **First service:** name, unit (project, month, hour, day), price. "Add another" link. Plus deposit %
   slider (default 30%). Copy: "Proposely only prices from this list, so add the services you sell most."
4. **Get paid (optional):** card "Take deposits when clients sign" with "Connect Stripe" and "Skip for now".
- Finish lands on \`/app/proposals\` with the first-run checklist (7.3).

### 7.3 Proposals list (\`/app/proposals\`)
- Header: title "Proposals", filter Tabs (All, Drafts, Sent, Viewed, Signed, Lost), search input.
- First-run checklist card (until done): Upload your first call, Check the draft, Send it to yourself,
  Open it on your phone. Each ticks itself. Dismissible after all four.
- Table columns: Client (name + company in muted below), Title, Status (StatusPill), Value (tabular, right
  aligned), Last activity ("Viewed 2h ago, 4 min on Pricing"), Owner (avatar). Row click opens the editor.
- Row actions menu: Open, Copy link, Duplicate, Save as template, Mark as lost, Delete (drafts only).
- Empty state: "No proposals yet. Upload a call and get your first draft in about 10 minutes."
  Primary button "Upload a call", secondary "Start blank".
- Loading: 6 Skeleton rows at 52px.

### 7.4 New proposal (\`/app/proposals/new\`)
Three large option cards in a row (stacked on mobile):
1. **From a call** (recommended chip): tabs inside: Upload, Record, Import (Zoom/Meet, greyed with
   "Studio plan" chip on Solo).
2. **From a template:** grid of template cards.
3. **Blank:** creates a draft with the 8 empty sections.

Upload tab: big drop zone (dashed \`--line\` border, \`--surface-2\` fill on hover), accepted formats line,
"Client name" and "Company" inputs (optional, helps the transcript), "Draft straight away" Switch (on by
default, off means stop at the brief). After drop: file name, size, a Progress bar with percent and
"About 40 seconds left", Cancel. Then JobProgress takes over the card.

Record tab: a 96px round record button in \`--danger\` with a white dot, timer in tabular figures, pause and
stop. Live input level meter (5 bars). Consent line underneath. After stop: "Save and upload".

Import tab: provider switcher (Zoom, Google Meet). If not connected: connect card. If connected: list of
recordings (date, topic, duration) with an "Import" button each.

### 7.5 Call detail (\`/app/calls/[id]\`)
- Left (60%): transcript. Speaker chips (Speaker A, Speaker B, rename by clicking: "Client", "Me").
  Each utterance: timestamp in muted, speaker colour dot, text. Search box on top highlights matches.
- Right (40%, sticky): the **Brief** card. Sections: Goals, Pains, Budget signals (with the quote in
  italic and an amount chip), Scope, Timeline, Decision makers, Objections, Open questions (amber tint
  card: "Ask these before you send"). Every item is editable inline and removable. "Add item" per section.
- Bottom of brief: recommended services as chips from the catalogue (toggle on/off), then primary button
  "Draft proposal". If already drafted: "Open proposal".
- Job states use JobProgress at the top of the page.

### 7.6 Editor (\`/app/proposals/[id]\`)
\`\`\`
+------------------+--------------------------------------------------+-----------------+
| Sections         |  [Cover: logo, title, client, date]              | Send panel      |
|  1 Exec summary  |                                                  |  Status pill    |
|  2 Problem       |  [SectionCard: Exec summary]   [Rewrite]          |  [Preview]      |
|  3 Solution      |  [SectionCard: Problem]                          |  [Send]         |
|  4 Scope         |  [SectionCard: Solution]                         |  Client email   |
|  5 Timeline      |  ...                                             |  Follow-ups on  |
|  6 Pricing       |  [Pricing: 3 PricingOptionCards]                 |  Rewrites 7/100 |
|  7 Terms         |  ...                                             |  Activity mini  |
|  8 Next steps    |                                                  |                 |
|  + Add section   |                                                  |                 |
+------------------+--------------------------------------------------+-----------------+
\`\`\`
- Left rail 220px: section list, drag to reorder (dnd-kit), Pricing locked in place after Timeline with a
  small lock icon. Clicking scrolls the canvas.
- Canvas max width 760px, \`--surface\`, generous 40px padding, Fraunces headings, renders in the brand
  kit colours so the agency sees what the client sees.
- Blocks: paragraph, heading, bullets, quote, table, image. Type "/" for the Command menu to insert.
  Autosave 800ms after typing stops, with "Saved" in muted next to the title.
- **Rewrite:** button on each SectionCard opens a Popover: 6 tone chips (Shorter, Longer, More confident,
  Friendlier, More formal, Plainer) and a free text field "Tell it what to change". Submit shows a shimmer
  over the section (Skeleton lines), then an inline diff: removed text struck through in
  \`--danger-soft\`, added text in \`--ok-soft\`. Buttons "Keep" (primary) and "Discard". The note line from
  the model sits under the diff in muted.
- **Pricing:** three PricingOptionCards side by side (stacked on mobile). Edit line items in a small table:
  service (Select from catalogue), quantity, unit price (read-only from catalogue, with an "override" link
  for owners/admins), line total. Total updates live. Radio for which card is recommended.
- Right panel 300px: status, Preview (opens \`/p/<token>?preview=1\` in a new tab with a "Preview" ribbon),
  Send (Dialog), client name/email, follow-up Switch, rewrite meter, last 5 activity events.
- **Unsent changes:** after sending, any edit shows a \`--warn-soft\` banner at the top of the canvas: "You
  have changes the client cannot see yet. Send update". The client keeps seeing the sent version.
- **Signed:** canvas becomes read-only, a \`--ok-soft\` banner: "Signed by Jane Cole on 14 Oct 2026, 15:42.
  Fingerprint 3fa9c1e2...7b0d." with links "View signature" and "Verify".

### 7.7 Send dialog
- Two tabs: "Email it for me" and "Copy link".
- Email: To (client email), Subject (pre-filled "{title} from {agency}"), Message (pre-filled 3 lines,
  editable), "Send me a copy" checkbox. Primary "Send proposal".
- Copy link: the URL in a read-only input with Copy, link expiry Select (30, 60, 90 days), "Revoke" link
  for an existing link.
- After send: confetti-free success state: a tick, "Sent. We will email you the moment they open it."

### 7.8 Activity (\`/app/proposals/[id]/activity\`)
- Timeline (newest first): Sent, Opened (device, city if available from the browser locale, never IP),
  Section time, Follow-up sent, Signed, Deposit paid.
- Heatmap list: each section with a horizontal bar of total seconds and median per visit, the longest in
  \`--brand\`, the rest in \`--brand-soft\`.
- Option interest: three small bars for Good, Better, Best (seconds spent on each card).

### 7.9 Templates, Catalogue, Brand
- **Templates:** grid of cards (name, section count, last used). "Use template" primary, kebab for rename
  and delete. Empty state: "Save any proposal as a template from its menu."
- **Catalogue:** two Tabs. Services: table (name, unit, price, active Switch) + "Add service" Dialog.
  Pricing rules: a form with currency, minimum project, deposit % slider, rush fee %, annual discount %,
  payment terms days, validity days, tax note, "Other rules for the AI" Textarea (max 2,000 chars with a
  counter). Members see everything read-only with a small lock note "Only owners and admins can edit".
- **Brand:** left the form (logo, cover image, primary and accent colour pickers, font pair Select,
  sender name, footer text, voice notes Textarea "How should proposals sound? e.g. direct, warm, no
  jargon"). Right a live mini share-page preview at phone width.

### 7.10 Analytics (\`/app/analytics\`)
- Top row: 4 stat tiles: Win rate (percentage + "12 of 31"), Average deal size, Median time to sign
  ("3.4 days"), Median time to first view ("2.1 hours"). Tiles use \`--surface\` with a 1px \`--line\` border.
- Below: proposals by status (stacked bar by month), option mix (three bars), most read section list.
- Period Select (30, 90, 365 days) and member Select (Studio and Agency).
- Charts with Recharts, colours from tokens only, tabular figures, tooltips on hover and focus.
- Empty: "Send 5 proposals to see your win rate."

### 7.11 Billing (\`/app/billing\`, owner only)
- Current plan card: plan name, price, interval, renewal or trial end date, "Manage billing" (Stripe
  portal) and "Change plan".
- Usage card: four UsageMeters (Proposals from calls, Call minutes, Rewrites, Seats), reset date line
  "Resets on 1 Nov".
- Plans: the three plan cards with a Monthly/Annual toggle ("2 months free"), current plan marked.

### 7.12 Settings (\`/app/settings\`)
Tabs: Profile (name, avatar, timezone, theme), Workspace (name, delete workspace in a danger zone card),
Team (member table with role Select for the owner, remove; invite form: email + role; pending invites with
Revoke; seat count "2 of 3 seats"), Integrations (three cards: Stripe payouts, Zoom, Google Meet, each with
a status pill and one button: Connect, Reconnect or Disconnect), Notifications (Switches: viewed, signed,
paid, daily digest).

### 7.13 Documentation and Help
- **Documentation:** a simple two-column page: left list of articles (Recording a call, Getting the best
  draft, Pricing rules, Sending and tracking, Signatures and the fingerprint, Deposits and Stripe, Team
  roles), right the article in MDX.
- **Help:** a short form (subject, message, optional screenshot), and "We reply within one working day".

### 7.14 Paywall (\`/paywall\`)
Centred card: "Your trial has ended" or "Your plan is paused", the three plans, primary "Choose a plan".
Members see "Ask {owner name} to restart the plan" and no buttons.

## 8. The share page (\`/p/[token]\`)

The agency's page. Proposely is a whisper in the footer (removable on Studio and Agency).
- Colours: brand kit primary for buttons and headings accent, brand kit accent as the soft tint for
  section bands. Background #FFFFFF, text #2A2118. Light only.
- **Cover:** full width band in the accent tint, agency logo top left (max 40px high), proposal title in
  the display font, "Prepared for Jane Cole, Northwind Coffee", date, and "Valid until 13 Nov 2026".
- **Sticky mini nav:** section names as a horizontal scroll of chips under the cover on mobile, a right
  rail on desktop (> 1100px). Active chip follows scroll.
- **Sections:** max width 720px, 56px between sections, display font headings, quotes styled with a 3px
  left border in the brand colour and the speaker in small caps.
- **Pricing:** three cards (stacked on mobile, recommended first on mobile), each with a "Choose this
  option" radio. Recommended card has the brand colour border and chip. Totals large, tabular figures.
- **Sign block (end of page):** selected option summary, Full name, Email, Title (optional), "Type your
  signature" input rendered live in a script font (e.g. "Caveat"), SignaturePad, a checkbox "I agree to
  this proposal and its terms", primary button "Sign proposal" (full width on mobile). Under it in small
  muted text: "Your name, the time, your IP address and a fingerprint of this proposal are recorded."
- **After signing:** the sign block becomes a confirmation card with the HashBadge, and, if a deposit is
  due, a primary button "Pay {amount} deposit" (Stripe Checkout). After payment, "Deposit received" with
  a tick (shown only once the webhook confirms; until then "Confirming your payment" with a spinner, polling
  every 3 seconds for up to 60 seconds).
- **Paused / not found:** a calm card: "This proposal is no longer available. Contact {agency} for a new
  link." Same design for revoked, expired and unknown links.
- **Footer:** "Sent with Proposely" small link (Solo plan), agency footer text.
- Print stylesheet: hide nav and buttons, show signature and hash.

## 9. States

- **Loading:** Skeletons shaped like the content (table rows, section cards, stat tiles). Never a full
  page spinner after first paint.
- **Empty:** EmptyState component with one clear action, copy in section 7.
- **Errors:** inline \`--danger-soft\` banner with what happened and one fix ("The file is over 1 GB.
  Export audio only from Zoom and try again."). Toasts only for background events ("Draft ready").
- **Limits:** amber banner at 80%, disabled buttons with a tooltip and an Upgrade link at 100%.
- **Offline:** a small top banner "You are offline. Changes will save when you reconnect."
- **Job failed:** JobProgress red step, the human error, Retry button, "Contact us" link.

## 10. Motion

- Easing: \`cubic-bezier(0.22, 1, 0.36, 1)\` for everything.
- Page content fade + 8px rise, 220ms, on route change.
- Dialogs and Sheets: 180ms scale from 0.98 + fade.
- JobProgress: the line between dots fills left to right over 400ms when a step completes; the next dot
  pulses.
- Rewrite: shimmer over the section while waiting (1.2s loop), diff fades in 200ms.
- Pricing card select on the share page: border colour transition 150ms, a 1.02 scale for 120ms.
- Signature: the stroke draws with no smoothing lag (use pointer events, \`requestAnimationFrame\`).
- \`prefers-reduced-motion: reduce\`: no scale, no rise, no shimmer; fades of 120ms only, pulsing replaced
  by a static dot.

## 11. Accessibility

- WCAG 2.2 AA. All token text pairs above meet 4.5:1 for body text (check \`--muted\` only for captions at
  13px+ and never for actionable text).
- Visible focus ring (\`--focus\`) on every interactive element. Tab order follows reading order.
- Status is never colour alone: StatusPill always has the word.
- SignaturePad has a keyboard-friendly alternative: the typed signature counts, and the drawn one can be
  skipped with "I cannot draw a signature" (stores a generated PNG of the typed name, flagged in the
  evidence as \`drawn_method: typed_render\`).
- Live regions: JobProgress announces step changes (\`aria-live="polite"\`).
- Recorder: the timer and level meter have text equivalents; Space toggles record/pause when focused.
- Charts have a "View as table" toggle.
- Hit targets 44px on mobile, 36px minimum on desktop.

## 12. Mobile

- App: sidebar as Sheet, editor left rail collapses into a "Sections" dropdown at the top, right panel
  becomes a bottom bar with "Preview" and "Send". Tables become stacked cards (client, status, value).
- Share page: designed at 375px first. Sticky bottom bar on mobile once the reader passes Pricing:
  "Review and sign" scrolls to the sign block. SignaturePad full width, 180px high, with a "Rotate your phone
  for more room" hint under 360px.
- Recorder works on iOS Safari (MediaRecorder with \`audio/mp4\` fallback when webm is not supported).

## 13. Emails (React Email)

- 600px max, \`--bg\` outer, white card, agency logo for client emails, Proposely logo for owner emails.
- One primary button per email in the agency brand colour (client) or \`--brand\` (owner).
- Plain text version for every email. Footer: agency name and address line (client), notification
  preferences link (owner), unsubscribe link (client reminders only).

## 14. Component states

| Component | Rest | Hover | Focus | Active / selected | Disabled |
|---|---|---|---|---|---|
| Primary button | \`--brand\` fill, white text | \`--brand-hover\` | \`--focus\` ring | 0.98 scale for 80ms | 45% opacity, no hover, tooltip explains why |
| Secondary button | \`--surface\`, 1px \`--line\`, \`--ink\` text | \`--surface-2\` | \`--focus\` ring | \`--brand-soft\` | 45% opacity |
| Ghost button | transparent, \`--ink-soft\` | \`--surface-2\` | \`--focus\` ring | \`--brand-soft\` | 45% opacity |
| Destructive | \`--danger\` text on \`--surface\` | \`--danger-soft\` | \`--focus\` ring | \`--danger\` fill, white | 45% opacity |
| Input | 1px \`--line\`, \`--surface\` | \`--muted\` border | \`--brand\` border + ring | n/a | \`--surface-2\` fill |
| Table row | \`--surface\` | \`--surface-2\` | inset 2px \`--brand\` | \`--brand-soft\` | n/a |
| Nav item | transparent | \`--surface\` | \`--focus\` ring | \`--brand-soft\` + left bar | n/a |
| SectionCard | 1px \`--line\` | handle and toolbar fade in | 2px \`--brand\` outline | \`--shadow-2\` while dragging | read-only: no toolbar, no handle |
| PricingOptionCard (share) | 1px line | \`--shadow-2\` | ring in brand colour | 2px brand border + tint | n/a |

## 15. Microcopy deck

| Place | Copy |
|---|---|
| Upload drop zone | "Drop your call recording here, or click to choose. MP3, M4A, MP4, WAV or WebM, up to 1 GB." |
| Upload in progress | "Uploading 34 MB of 61 MB. About 40 seconds left. You can leave this page." |
| Transcribing | "Transcribing your call. A 45 minute call takes about 3 minutes." |
| Reading the call | "Reading the call for goals, pains, budget and timeline." |
| Brief ready | "Here is what we heard. Fix anything that is wrong, then draft." |
| Drafting | "Writing your proposal from your catalogue and pricing rules." |
| Draft ready toast | "Proposal for Northwind Coffee is ready. Open it" |
| No speech found | "We could not hear a conversation in this file. Check it plays, then try again." |
| Call too long | "This call is 2 h 10 min. Your plan transcribes calls up to 90 minutes. Trim it or upgrade." |
| Rewrite placeholder | "e.g. mention the Shopify migration, cut to 100 words" |
| Rewrite limit | "You have used all 100 rewrites this month. Upgrade or wait until 1 Nov." |
| Unsent changes | "You have changes the client cannot see yet. Send update" |
| Send success | "Sent. We will email you the moment they open it." |
| Follow-up switch | "Send a friendly nudge if it is not signed after 3 days" |
| Viewed (activity) | "Opened on iPhone, read for 6 min, 2 min 40 s on Pricing" |
| Sign button | "Sign proposal" |
| Sign evidence note | "Your name, the time, your IP address and a fingerprint of this proposal are recorded." |
| Signed (client) | "Signed. A copy is on its way to jane@northwind.co." |
| Deposit button | "Pay $3,600 deposit" |
| Confirming payment | "Confirming your payment with Stripe." |
| Verify page OK | "Unchanged since signing. Fingerprint matches." |
| Verify page mismatch | "This content does not match what was signed. Contact the sender." |
| Not available | "This proposal is no longer available. Contact Acme Studio for a new link." |
| Seat limit | "All 3 seats are in use. Remove someone or move to Agency for 10 seats." |

## 16. Dark mode rules

- Never pure black (#000) or pure white text on dark: use the dark tokens above.
- Status pills keep their soft backgrounds (dark versions) so they read as tints, not blocks.
- The editor canvas in dark mode keeps a light "paper" preview toggle (default on), because the agency
  needs to see the client's light share page. A small Sun/Moon switch sits above the canvas.
- Charts swap to dark tokens; gridlines use \`--line\`.
- Images (logos) get a 4px \`--surface-2\` padded chip behind them in dark mode so dark logos stay visible.

## 17. Hand-off checklist for Claude Code

1. Tokens in \`globals.css\` for light and dark, mapped in Tailwind. No raw hex in components (grep for \`#\`
   in \`components/\` returns nothing but tokens files).
2. Fonts via \`next/font\`. Share page font pairs loaded only on \`/p/*\`.
3. shadcn/ui components installed and themed to the tokens.
4. App shell sidebar matches section 6 exactly, bottom group order: Documentation, Help, Billing, Settings.
5. Every screen in section 7 has its empty, loading and error state from section 9.
6. Reduced motion respected everywhere (one \`useReducedMotion\` hook).
7. Screenshots at 375px and 1440px for: proposals list, editor, share page, sign block.
`
