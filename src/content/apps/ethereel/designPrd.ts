// Ethereel: Design PRD (DESIGN.md), built on QUIET_PRECISION.md.
// Generated from markdown source; plain text inside a template literal.

export const designPrd = `# Ethereel: design PRD

Save this file as \`DESIGN.md\` in your project root, next to \`DESIGN_SYSTEM.md\` (Quiet Precision).
Add this line to \`CLAUDE.md\`:

\`\`\`
UI rules: @DESIGN_SYSTEM.md @DESIGN.md
\`\`\`

**This document builds on Quiet Precision.** Everything in \`DESIGN_SYSTEM.md\` applies to every Ethereel
screen: white surfaces, 1px hairlines, Geist 400/500/600, 13px app text, 6px boxes, 4px pills, white
buttons with a firm edge (no filled or black buttons), one easing curve, nothing moves under the cursor.
This file only adds what is different for Ethereel: the brand accent, the status tags, and the
product-specific screens. Where the two disagree, this file wins only for the accent hue and Ethereel
screens. Every stability, motion and component rule in Quiet Precision still applies.

**Two looks, never mixed.** The web app follows Quiet Precision. The rendered reel (captions, title,
cutaways on paper, follow card) has its own style, defined in \`@PRD.md\` sections 9.8 to 9.11. The only
place the reel look appears inside the app is inside the phone preview frame. App chrome never uses the
reel fonts, paper texture or burnt-red accent.

## 1. Brand accent: pastel violet

Ethereel swaps Quiet Precision's pastel blue for a pastel violet. Same role: "selected" and "in
progress". Nothing else gets the accent.

| Token | Hex | Replaces | Use |
|---|---|---|---|
| \`--accent\` | \`#7c6ad6\` | \`--blue\` | Selected nav icon (duotone), progress bars, live dot, focus of the active step |
| \`--accent-soft\` | \`#f4f2fd\` | \`--blue-soft\` | Selected nav item fill, selected row, selected slot |
| \`--accent-edge\` | \`#d5cdf5\` | \`--blue-edge\` | Selected border, active tab underline, drop zone edge while dragging |
| \`--accent-ink\` | \`#4b3ca3\` | | Text on \`--accent-soft\` (meets 4.5:1) |

\`\`\`css
:root {
  --accent: #7c6ad6; --accent-soft: #f4f2fd; --accent-edge: #d5cdf5; --accent-ink: #4b3ca3;
  /* map Quiet Precision's blue tokens to the accent so shared components pick it up */
  --blue: var(--accent); --blue-soft: var(--accent-soft); --blue-edge: var(--accent-edge);
}
\`\`\`

Logo: the word "Ethereel" in Geist 600, 15px, ink, with a small waveform mark (five vertical bars of
2px width, 3px gap, heights 6/12/16/10/6, in \`--accent\`). Favicon: the mark alone on white.

## 2. Status tags (pastel, fixed hue per status)

Tags are 4px pills, 20px tall, 12px text, pastel fill at 8% of the hue, 1px edge of the darker hue,
readable ink. Fixed mapping, never hashed:

| Status | Label | Hue | Live dot |
|---|---|---|---|
| \`uploading\` | Uploading 42% | violet (accent) | yes |
| \`awaiting_assets\` | Waiting for assets | amber | no |
| \`queued\` | Waiting for a slot | grey | no |
| \`preparing\` to \`validating\` | the step name ("Rendering 62%") | violet | yes |
| \`ready_for_review\` | Ready to review | blue \`#5f86e0\` | no |
| \`revising\` | Revising | violet | yes |
| \`approved\` | In queue | teal \`#2f9e8f\` | no |
| \`scheduled\` | Scheduled | teal | no |
| \`posted\` | Posted | green \`#27a644\` | no |
| \`rejected\` | Rejected | grey | no |
| \`failed\` | Failed | coral \`#eb5757\` | no |
| \`cancelled\` | Cancelled | grey | no |

The live dot is the only looping motion: 6px circle, pulses opacity 1 to 0.35 over 1.4s. With reduced
motion it is static. Tags whose labels contain a number reserve width for "Rendering 100%" so the column
never jumps.

## 3. App shell

- **Sidebar 240px** (56px icons-only under 1100px), white, right hairline. Top: logo row 56px.
- **Top group:** Videos (Phosphor \`FilmStrip\`), Review (\`CheckSquare\`, with a count pill on the right,
  fixed min-width 24px), Queue (\`CalendarBlank\`), Assets (\`Images\`).
- Flexible spacer.
- **Bottom group, always in this order:** Documentation (\`BookOpen\`), Help (\`Lifebuoy\`), Billing
  (\`CreditCard\`), Settings (\`GearSix\`).
- Under the bottom group: the **plan meter** card (hairline box, 12px padding): "18 of 30 videos this
  month", a 4px meter (accent, amber under 20% left, coral under 5% left), and "Resets 1 Nov". Then the
  account row (avatar 24px, name, chevron opens a menu: Account settings, Log out).
- Nav items 32px, 6px radius, icon 17px regular at rest, duotone violet when selected, label 13px.
  Selected = \`--accent-soft\` fill + \`--accent-ink\` text. Hover = \`--hover\`.
- **No top bar.** Each page has a 48px page toolbar with its own controls.
- A trial banner sits at the top of the content column (not over the sidebar) when trialing: 36px,
  hairline bottom, "Trial: 4 days and 3 videos left. Choose a plan" with a firm-edge button. It never
  pushes the sidebar.

## 4. Auth pages (\`/login\`, \`/signup\`, \`/reset\`)

- Centred column 360px wide, 12% from the top, on white. Logo, then H2 "Create your account" /
  "Log in" / "Reset your password".
- Inputs 36px: Name (signup only), Email, Password (with show/hide icon button, labelled).
- Primary button full width 36px: "Start 7-day free trial" / "Log in" / "Send reset link". Loading keeps
  the label and overlays a spinner.
- Under it, 13px muted: "No card needed for the trial. Your first reel is about 3 minutes away."
- Links: "Already have an account? Log in", "Forgot password?".
- Errors under the field in danger ink with \`role=alert\`: "That email already has an account. Log in
  instead." Wrong password: "Email or password is wrong."
- Right of the form on screens over 1100px: a 9:16 phone frame (320px tall) playing a muted sample
  reel on loop (poster frame with reduced motion). This is the only autoplaying video outside the app.

## 5. Onboarding (\`/onboarding\`)

One dialog-style card, 560px wide, 10% from the top, that morphs height between steps (300ms morph
curve, width never changes). Step dots at the top (4 dots, 8px, accent when done). "Skip for now" text
button top right from step 2.

1. **Brand.** H3 "What should your reels say?" Fields: Series title ("Build in public, day 12"), TikTok
   handle, Instagram handle, hashtag line (placeholder "#buildinpublic #saas"). A small live preview on
   the right: a 9:16 thumbnail showing the series title in the reel title style (the reel look, inside
   the phone frame only) and the handle on a follow card.
2. **Look.** H3 "Pick a look." Five preset cards in a row (Natural, Warm film, Crisp, Moody, Bright),
   each a 9:16 still of the sample face with that grade applied via CSS filters. Selected card has the
   accent edge. Music: three library tracks with play buttons (one plays at a time), "No music" option.
3. **Socials.** H3 "Where should reels go?" Two cards: TikTok and Instagram, each with "Connect" (opens
   Zernio OAuth in the same tab, returns to this step). Connected cards show the handle and avatar with a
   green "Connected" tag. Note: "You still approve every reel before it posts."
4. **First upload.** H3 "Drop your first raw clip." The upload drop zone (section 7) inline. "Upload
   later" goes to \`/app/videos\`.

Each step saves on Continue. Errors show inline; the step never resets.

## 6. Videos library (\`/app/videos\`)

- **Toolbar 48px:** search input (240px, "Search videos"), status filter chips row below (44px filter
  bar: All, Processing, Ready to review, In queue, Posted, Failed; "+N" counts tabular), right side:
  count "48 videos" (fixed width) and primary button "Upload clips".
- **Table** (36px header, 48px rows, fixed columns):
  - Cover 40px (9:16 thumbnail 27x48, 4px radius, grey placeholder until the cover exists)
  - Title (flex, ellipsis; inline rename on double click, Enter saves, Esc cancels)
  - Status tag (180px)
  - Length (72px, tabular "0:47")
  - Created (120px, "Today 09:14", "Mon 12 Oct")
  - Slot (140px, "Thu 14:00" or "-")
  - Row menu (32px icon button, labelled "More actions"): Open, Review, Retry (failed only), Download
    MP4, Delete.
- Clicking a row: processing rows go to \`/app/videos/[id]\`, review rows to \`/app/review/[id]\`.
- Rows rise once on first load (360ms, 6px, 25ms stagger, capped). Realtime status changes update the
  tag in place; the row never re-animates or moves. New uploads appear at the top with a single rise.
- **Selection bar** (checkboxes in a 36px first column): floats 16px above the bottom, fixed width
  520px: "3 selected", "Review (3)", "Delete (3)", each action min-width 112px.
- **Empty state:** centred in the table area, 9:16 outline illustration of a phone with a waveform,
  H3 "No videos yet", body "Upload a raw talking-head clip. Ethereel cuts the pauses, adds captions,
  zooms and diagrams, and sends it back for you to review.", button "Upload clips".
- **Loading:** 8 skeleton rows (hairline boxes, no shimmer loop; a single 1.5s fade is allowed once).
- **Error:** inline row across the table: "Could not load your videos. Retrying in 5 seconds." with
  "Retry now".

## 7. Upload sheet (\`/app/videos/new\`, opens as a side panel over the library)

- Side panel 480px from the right, slides 24px over the page (200ms), never reflows the library.
- **Drop zone:** 6px radius, 1px dashed \`--btn-edge\` (dashed because it is an "add" affordance),
  200px tall, Lucide \`UploadCloud\` 16px, "Drop up to 5 clips here" / "or choose files". While dragging:
  edge becomes \`--accent-edge\`, fill \`--accent-soft\`. Accepts .mov, .mp4, .m4v.
- **Plan line above:** "You can upload 12 more videos this month. Clips up to 2:00." (tabular numbers).
- **Motion graphics** switch with helper text: "Add diagrams and your own screenshots as cutaways. You
  can drop screenshots after the upload."
- **File rows** (48px each): 9:16 thumbnail from the first frame, file name (ellipsis), size and length
  ("312 MB · 0:58"), a 4px progress meter (accent), and a fixed-width status label at the right
  ("Uploading 42%", "Paused, will resume", "Uploaded", "Too long for your plan"). A row's height never
  changes between states.
- Over-limit files show the reason in danger ink in the row and are skipped; the rest upload.
- Footer bar 48px: "Cancel" and primary "Upload 3 clips" (min-width fits "Upload 10 clips"). After
  start, the primary becomes "Close" and uploads continue in the background with a small sticky
  "Uploading 2 of 3" pill bottom left (toast layer).

## 8. "Add assets?" page (\`/app/videos/[id]/assets\`)

Shown only when Motion graphics was on, once all clips in the batch have uploaded.

- Centred column 640px. H2 "Add screenshots for your diagrams?" Body: "Name each file with the words you
  say when it should appear, like monday-hero-project-management.png. Each screenshot is used once."
- Drop zone (same as 7) for PNG, JPG, WebP up to 20 MB.
- Grid of added images (3 columns, 6px radius, 1px hairline), each with filename under it and the
  matched words as small grey tags ("monday", "project", "management"). Remove icon button on hover
  (always visible on touch).
- Actions: secondary "Skip, no screenshots", primary "Continue with 4 screenshots".
- If more than one clip in the batch: a tab strip of clip names at the top so assets go to the right clip.

## 9. Processing view (\`/app/videos/[id]\` while running)

- Two columns over 1100px (stacked under): left 360px, a 9:16 frame showing the raw clip's first
  frame (later the proxy) with a soft white overlay and the live status; right, the step list.
- **Step list:** 12 rows, 40px each, fixed: Upload, Prepare, Transcribe, Cut pauses, Find your face,
  Plan cutaways, Render, Mix audio, Export, Check the file, Write caption, Ready. Each row: a 16px state
  icon (circle outline for waiting, live dot for running, check in success green for done, cross in
  danger for failed), the name, and a right-aligned detail with fixed width 160px ("15 cuts",
  "2 cutaways", "62%", "0:47"). The running row gets \`--accent-soft\` fill.
- Under it, a collapsed **Live log** (button "Show details") listing job_events messages with times, in
  a 200px scroll box with a hairline. Opening it does not move the step list (it is below and the page
  scrolls).
- Time hint: "Usually about 4 minutes on Gentle" under the title. With a queue: "Waiting for your
  earlier video to finish (1 ahead)".
- Failed: the failed row shows the plain-language message in danger ink and a "Retry from this step"
  button (secondary), plus "Contact help" text link.
- When status becomes \`ready_for_review\`, show a one-time toast "Ready to review" with action "Open"
  and change the primary button "Review now". No automatic redirect (it would move the page under the
  cursor).

## 10. Review inbox (\`/app/review\`)

- Toolbar: "7 ready to review" (fixed width), "Review all" primary button opens the first.
- Grid of cards (auto-fill, min 200px): 9:16 cover, 6px radius, title (2 lines max), length, version
  ("v2"), an amber dot if \`ai_tells_found\` is not empty. Hover: hairline darkens to \`--btn-edge\`.
- Empty state: H3 "Nothing to review", body "New reels land here when they are ready. We will email you
  too.", link "Upload clips".

## 11. Review screen (\`/app/review/[id]\`)

The most important screen. Layout over 1100px: three columns inside the content area.

- **Left, 380px: the phone.** A 9:16 frame 360x640, 6px radius, 1px hairline, black inside. Plays
  \`final.mp4\` with native controls hidden; custom controls below the frame: play/pause (labelled),
  scrubber (4px, accent), time "0:12 / 0:47" tabular, mute. Above the frame, a segmented control:
  "TikTok", "Instagram", "Clean". TikTok and Instagram add a transparent overlay PNG (right rail icons,
  bottom caption area, tab bar) on top of the video so the creator sees what gets covered. The overlay
  never intercepts clicks.
- **Middle, flexible: caption and actions.**
  - H3 title (inline rename).
  - **Post caption** box: hook input (single line, counter "62/90"), body textarea (auto-grows up to 6
    lines, then scrolls), and the hashtag line shown read-only below in faint ink with "Edit in
    Settings". Total counter "214 / 2,200" (tabular, fixed width). Buttons: "Save" (disabled until
    changed) and "Rewrite" (with "(4 left)" in the label). While rewriting, the textareas stay in place
    and show a 1px accent edge; the label stays "Rewrite" with a spinner overlay.
  - Amber note if AI tells were found: "Contains 'game-changer'. Edit before you pass?"
  - **Actions row** (fixed heights, min widths): primary "Pass" (min 120px), secondary
    "Request revision", secondary "Reject". Keyboard hints in faint text under each (P, R, X).
- **Right, 280px: versions.** A list: "v3 · now", "v2 · 10:42", "v1 · 10:31". Each item opens to show
  its "what changed" lines (13px, muted). Latest revision has "Undo" (secondary compact). Selecting an
  older version plays its render in the phone (if it exists) with a grey "Viewing v1" pill above the
  phone; Pass always passes the current version.

**Pass dialog** (520px, 10% from top):
- H3 "Pass and schedule". Line: "Next slot: Thursday 14:00 (Europe/London)". If manual queue mode: a
  slot picker (next 14 days as rows, 5 slot chips each, taken ones disabled).
- TikTok block (required by TikTok for third-party posting): "Posting to @handle", privacy select
  limited to what TikTok allows for this account, three switches (Allow comments, Allow duet, Allow
  stitch) defaulting to Settings, and a checkbox "I agree to TikTok's Music Usage Confirmation" that
  must be ticked.
- Instagram block: "Posting to @handle as a Reel. Also shares to your feed."
- If a social is not connected: a row "Instagram not connected. Connect" and the post goes only to the
  connected one.
- Buttons: "Cancel", primary "Pass and schedule". After success the dialog morphs to "Scheduled for
  Thursday 14:00" with "Review next" and "Go to queue".

**Request revision dialog:**
- H3 "What should change?" Textarea (4 lines, 1,000 max) with placeholder "The word at 0:12 should be
  Supabase. Remove the second diagram. Use the Moody look."
- Helper list in muted text: "I can fix caption words, edit, add or remove diagrams, cut words, change
  the music, the look or the subtitle. I cannot reshoot or change what you said."
- "2 revisions left on this video".
- Buttons: "Cancel", primary "Request revision". On submit the dialog morphs to a planning state:
  live dot + "Planning your changes". If impossible, it morphs to the plain reason with "OK" and
  "Try different wording". If possible, it closes and the phone shows a "Revising" overlay with the step
  list in compact form until the new version is ready.

**Reject:** small confirm popover anchored to the button (not a dialog): "Reject this reel? It will never
post." with "Reject" and "Keep".

Under 1100px the three columns stack: phone, then caption and actions, then versions. The actions row
becomes sticky at the bottom (48px bar, white, top hairline).

## 12. Queue (\`/app/queue\`)

- Toolbar: segmented "Week" / "List", week switcher ("12 to 18 Oct" with previous/next icon buttons),
  timezone label "Europe/London", right: "Posting slots" text button (opens Settings > Posting).
- **Week view:** 7 columns (days), rows = the creator's slots (5 by default). Each cell 96px tall:
  empty cell shows the time in ghost ink; a filled cell shows the 9:16 cover (40x71), title (2 lines),
  platform icons (TikTok, Instagram, 14px Lucide-style monochrome) and a status tag (Queued, Handed
  over, Live, Failed). Past cells are slightly faded (opacity .6) and show live links.
- Drag a filled cell to an empty future cell to move it (drop target gets accent edge); a keyboard
  alternative: cell menu "Move to..." opens the slot picker. Moving never reflows other cells.
- **Banner** above the grid when a social needs reconnecting (amber, 36px): "TikTok needs reconnecting.
  Posts will fail until you do. Reconnect".
- **List view:** table: Slot, Title, Platforms, Status, Links, menu (Move, Unschedule, Open review).
- Empty state: H3 "Your queue is empty", body "Pass a reel and it takes the next free slot.", link
  "Review reels (3 ready)".

## 13. Assets (\`/app/assets\`)

Tabs: **Brand** (avatar uploader 96px circle with "Replace"), **Music** (library tracks and "Your
tracks" list with play, title, length, loudness "-18.4 LUFS", delete; upload button for MP3/M4A/WAV up
to 50 MB), **Screenshots** (grid grouped by video, filename, matched words, "Used in v2 cutaway 2" tag).
Playing one track stops any other. Play buttons keep their width between Play and Pause.

## 14. Documentation (\`/app/docs\`) and Help (\`/app/help\`)

- Docs: left list of articles (200px) and the article (max 65ch): "How Ethereel edits your clip",
  "Recording tips (light, framing, one take)", "Naming screenshots so they appear on time", "Writing
  revision notes that work", "Posting slots and time zones", "Why a post can fail". Rendered from MDX.
- Help: FAQ accordion (rows 48px, chevron rotates, content fades in, height morphs), "Recent jobs" table
  (last 5 videos with status and error code), contact form (topic select, message, "Send"), reply time
  line "Usually within one working day".

## 15. Billing (\`/app/billing\`)

- Current plan card: plan name, price, "Renews 1 Nov" or "Trial ends Thu 22 Oct", usage meter with
  "18 of 30 videos", revisions note, "Manage billing" (Stripe Customer Portal).
- Plan cards side by side (Creator, Pro) with a Monthly / Annual segmented control (annual shows "2
  months free" tag). The current plan card has the accent edge and "Current plan" tag; the other has
  "Switch to Pro" (firm edge).
- Invoices table from Stripe (date, amount, status, PDF link).
- Reached from a trial-over redirect: a top note "Your trial has ended. Choose a plan to keep
  reviewing and posting." Existing reels stay visible.

## 16. Settings (\`/app/settings\`)

Left tab list inside the content (200px): Brand, Look, Captions, Posting, Socials, Processing, Account.
Each tab is a form column (max 560px) with 24px gaps, labels in faint ink above controls, helper text
below in muted. One Save button per tab in a 48px footer bar (disabled until dirty; "Saved" toast).

- **Look tab:** two columns: sliders (warmth, sharpness, brightness, contrast, saturation; each with a
  tabular value box 56px) and a 9:16 live preview (240x427) of the creator's latest frame with the CSS
  filter chain applied in real time. "Reset" text button and "Save as new preset". Music level slider
  with value "-39 LUFS" and a play button that plays voice + music mixed at that level (Web Audio).
- **Posting tab:** timezone combobox, slot chips (time inputs 32px compact; "+ Add slot" dashed),
  queue mode radio cards, TikTok defaults.
- **Captions tab:** vocabulary as chips in an input (Enter adds, Backspace removes last), spelling fixes
  as a two-column editable table (From, To) with "+ Add fix" dashed row.
- **Socials tab:** platform cards with status tags and buttons.
- **Processing tab:** radio cards Gentle / Fast (Fast shows a "Pro" tag and is disabled on Creator,
  with "Upgrade" link), follow card switch + cue line input, opening title switch.
- **Account tab:** name, email, password change, danger zone box (hairline, not red fill) with "Delete
  account" (secondary with danger ink) and a type-to-confirm dialog.

## 17. Components (shadcn/ui, restyled to Quiet Precision)

Button (white, firm edge for primary), Input, Textarea, Select, Combobox, Switch, Checkbox, Slider,
Tabs, Dialog (520px, 10% from top, morphs), Sheet (side panel), Popover, DropdownMenu (portal), Tooltip,
Toast (Sonner restyled: bottom left, 4s, max 4, no full stop), Table, Skeleton, Progress (4px meter),
Badge (status tags). Custom: \`PhoneFrame\`, \`PlatformOverlay\`, \`StepList\`, \`PlanMeter\`, \`SlotGrid\`,
\`UploadRow\`, \`GradePreview\`, \`VersionList\`, \`LiveDot\`.

## 18. Motion (inside Quiet Precision's rules)

| Moment | Spec |
|---|---|
| Upload row progress | width eases with the morph curve, 300ms per update |
| Step list | a finished row's icon cross-fades (160ms); the row never changes height |
| Review version switch | phone video cross-fades 200ms |
| Dialog step morph | 300ms height, content fades up 4px after 60ms |
| Toast "Ready to review" | rises 8px, 240ms |
| Slot drag | dragged cover follows cursor at 98% scale with the float shadow; drop settles in 200ms |
| Reduced motion | all of the above appear instantly; the live dot is static; the auth sample reel shows its poster |

## 19. Copy rules (Ethereel specific)

- Say "reel" for the finished video and "clip" for the raw upload.
- Buttons: "Upload clips", "Pass and schedule", "Request revision", "Rewrite (4 left)", "Retry from this
  step", "Connect TikTok".
- Errors say what happened and what to do: "This clip is 3:10. Your plan takes clips up to 2:00. Trim it
  and upload again."
- Toasts past tense, no full stop: "Caption saved", "Reel scheduled for Thu 14:00", "Revision applied".
- Times always in the creator's timezone with the zone shown once per page.

## 20. Accessibility and responsive

- Every icon-only button has an \`aria-label\`. The phone player has keyboard controls (Space play/pause,
  arrow keys seek 1s). Step list is an ordered list with \`aria-current="step"\` on the running row and a
  polite live region announcing step changes.
- Contrast: tags meet 4.5:1 for their ink. Focus ring 2px outline 2px offset on everything.
- Check every screen at 320, 375 and 430px. Review stacks; the action bar is sticky. Queue week view
  becomes a day list under 760px (one day at a time with day chips to switch).

## 21. Custom component specs

### PhoneFrame
- Props: \`src\`, \`poster\`, \`overlay: 'tiktok' | 'instagram' | 'clean'\`, \`size: 'sm' | 'md' | 'lg'\`
  (sm 135x240 for cards, md 240x427 for settings, lg 360x640 for review).
- 6px radius, 1px hairline outside, black fill inside, no device bezel art (no real device brand).
- The video is \`object-fit: cover\`. The overlay is an absolutely positioned PNG with
  \`pointer-events: none\`.
- Loading: poster frame plus a centred spinner after 200ms (min 400ms). The frame size is fixed before
  the video loads, so nothing shifts.

### PlatformOverlay
- Two transparent PNGs at 1080x1920 drawn by you in Figma (do not copy platform screenshots): TikTok
  (right rail with five circles at x 960, y 1000 to 1600; bottom text block y 1560 to 1800; tab bar
  y 1800 to 1920) and Instagram Reels (right rail with four icons; bottom text block; no tab bar).
- A faint 1px dashed guide at y 1360 marks the top of the caption zone (toggle "Show safe zone").

### StepList
- An ordered list of fixed rows (40px). Row: 16px state icon, name (13px), detail (fixed 160px, right
  aligned, tabular). The running row has \`--accent-soft\` fill and a live dot.
- Detail examples per step: Prepare "HDR → SDR · 0:58", Transcribe "142 words", Cut pauses "15 cuts,
  -11 s", Find your face "98% of frames", Plan cutaways "2 diagrams", Render "62%", Mix audio "-14 LUFS",
  Export "5.4 Mbps", Check the file "12 of 12 checks", Write caption "Done".

### PlanMeter
- Text "18 of 30 videos this month" (tabular), 4px track in \`--divider\`, fill in \`--accent\`; amber
  \`--warning\` under 20% left, coral \`--danger\` under 5% left; "Resets 1 Nov" in faint ink. Fixed height
  56px in the sidebar; collapses to a 24px ring icon in the 56px sidebar with a tooltip.

### SlotGrid
- CSS grid, 7 columns min 120px, rows per slot, 96px cells, 1px dividers. Today's column header in ink
  600, other days muted. Past slots at opacity .6. Dragging uses pointer events with a keyboard path.

### UploadRow
- 48px row: thumbnail 27x48, name (ellipsis), meta, meter (4px, 120px), status label (fixed 150px).
  States: waiting, uploading N%, paused (amber label "Paused, will resume"), uploaded (green check),
  rejected (danger label with the reason). Cancel icon button while uploading.

### GradePreview
- A \`<canvas>\` or \`<img>\` with the CSS filter chain from \`lib/grade.ts\` (PRD 9.7). Updates on every
  slider input event with no debounce (CSS filters are cheap). Shows "Preview" tag top left.

### VersionList
- Rows 40px: "v3", time, reason tag (Initial, Revision, Undo, Caption fix). Expanded content is a list
  of what-changed lines. Undo button only on the newest revision row.

## 22. Dialogs and popovers

| Dialog | Trigger | Content | Buttons |
|---|---|---|---|
| Upgrade | Upload when at the limit, or a 402 | "You have used all 30 videos this month." Plan comparison mini table, Monthly/Annual toggle | "Not now", "Upgrade to Pro" |
| Pass and schedule | Pass | section 11 | "Cancel", "Pass and schedule" |
| Request revision | Request revision | section 11 | "Cancel", "Request revision" |
| Reject (popover) | Reject | "Reject this reel? It will never post." | "Keep", "Reject" |
| Unschedule | Queue menu | "Take this reel out of the queue? It goes back to Review." | "Keep", "Unschedule" |
| Delete video | Library menu | "Delete this video and all its versions? This cannot be undone." | "Cancel", "Delete video" |
| Disconnect social | Settings > Socials | "Disconnect TikTok? Scheduled posts to TikTok will not go out." | "Cancel", "Disconnect" |
| Delete account | Settings > Account | type DELETE to confirm | "Cancel", "Delete account" |

All dialogs: 520px max, 24px padding, open at 10% from the top, overlay fades 200ms, dialog rises 8px
from 98.5% scale in 220ms, Escape closes, focus goes to the first input or the safe button. A confirm
step inside a dialog morphs the same dialog; never stack a second dialog.

## 23. Toast catalogue

| When | Text | Action |
|---|---|---|
| Upload finished | Clip uploaded | |
| Pipeline finished | Ready to review | Open |
| Pipeline failed | Video failed at Render | View |
| Caption saved | Caption saved | |
| Caption rewritten | New caption written | Undo |
| Passed | Reel scheduled for Thu 14:00 | View queue |
| Revision applied | Revision applied | Undo |
| Revision impossible | (shown in the dialog, not a toast) | |
| Settings saved | Saved | |
| Post live | Live on TikTok | Open |

Bottom left, 4 seconds, at most four stacked, polite live region, no full stop.

## 24. Empty, loading and error states (every screen)

| Screen | Empty | Loading | Error |
|---|---|---|---|
| Videos | Illustration + "Upload clips" (section 6) | 8 skeleton rows | Inline row "Could not load your videos. Retrying in 5 seconds." |
| Upload sheet | Drop zone only | n/a | Row-level reason; whole-sheet error "Uploads are paused. Check your connection." |
| Assets page | Drop zone + Skip | Thumbnails show a grey box with spinner after 200ms | "This file is not an image we can use. Use PNG, JPG or WebP." |
| Processing | n/a | Step list with all rows waiting | Failed row message + Retry from this step |
| Review inbox | "Nothing to review" | 6 skeleton cards (9:16) | "Could not load reels. Retry" |
| Review | n/a | Phone poster + skeleton caption box (fixed heights) | "This version's file is missing. Re-render v3" |
| Queue | "Your queue is empty" | Grid with ghost times only | Banner "Could not reach the queue. Retry" |
| Assets | Per tab: "No tracks yet. Upload an MP3" | Skeleton rows | Row-level messages |
| Billing | n/a | Skeleton plan card | "Could not load billing. Open the Stripe portal instead." |
| Settings | n/a | Skeleton form (same heights as fields) | Field errors under fields; tab-level "Could not save. Your changes are still here." |

404 page: centred, H2 "This page does not exist", button "Go to videos". 500 page: "Something broke on our
side. It has been logged.", button "Reload".

## 25. Onboarding checklist on Videos

Until all four are done, a hairline card sits above the Videos table (not a modal): "Get your first reel
out" with four rows (Set your series title, Connect TikTok or Instagram, Upload a clip, Pass your first
reel), each with a check circle that ticks itself from real data and a text button to do it. When all
four are done the card shows "All set" for one session and then never appears again. The card has a
fixed height so ticking a row never moves the table.

## 26. Keyboard shortcuts

| Key | Where | Action |
|---|---|---|
| \`U\` | Videos | Open upload sheet |
| \`P\` | Review | Pass (opens the dialog) |
| \`R\` | Review | Request revision |
| \`X\` | Review | Reject (opens the popover) |
| \`J\` / \`K\` | Review | Next / previous reel in the inbox |
| \`Space\` | Review | Play / pause |
| \`←\` / \`→\` | Review | Seek 1 s |
| \`Esc\` | Anywhere | Close the open overlay |

Shortcuts are listed in Help and shown as faint hints under the Review buttons.

## 27. The reel look, as seen inside the app

These tokens are for the Remotion composition and the onboarding preview only. Never use them in app
chrome. Full rules in \`@PRD.md\` 9.8 to 9.11.

| Token | Value | Use |
|---|---|---|
| \`--reel-caption\` | Inter 600, 56px, -0.01em, white, 2px black stroke, shadow 0 2px 8px rgba(0,0,0,.35) | Subtitles at 74% height |
| \`--reel-caption-ink\` | \`#1c1b19\`, no stroke, no shadow | Subtitles over a cutaway |
| \`--reel-title\` | Inter 600, 72px, white | Series title |
| \`--reel-marker\` | \`#ff7a1a\`, 14px stroke | Hand-drawn scribble under the title |
| \`--paper\` | \`#f6f1e7\` | Cutaway page |
| \`--grid\` | \`#9db7d9\` at 35%, 54px squares | Exercise-book grid |
| \`--margin-line\` | \`#e08a8a\` at 60% | Red margin line on the page |
| \`--felt-ink\` | \`#141414\` | Boiling felt-tip strokes |
| \`--burnt-red\` | \`#b5452b\` | The one punch accent |
| \`--mat\` | \`#ffffff\` with 0 6px 18px rgba(0,0,0,.18) | White mat around Image prints |

Fonts for the reel are bundled with the Remotion site (Inter SemiBold woff2 plus a hand-lettering font
such as "Caveat" or "Patrick Hand" for diagram text, both open licence) and loaded with
\`@remotion/fonts\` before render.
`
