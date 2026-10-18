// Ethereel design PRD. Downloaded as DESIGN.md.

export const designPrd = `# Ethereel: Design PRD (DESIGN.md)

This file tells Claude Code how Ethereel looks, moves and feels. Build every screen from these tokens and components. Do not invent new colours, fonts or spacing values. Use shadcn/ui components, themed with the tokens below.

---

## 1. Brand feel

Ethereel should feel like a calm, premium studio that does the boring editing for you. Think "late-night edit suite": dark by default, a violet glow, crisp white type, and the user's own clips as the hero of every screen.

Three words: **calm, fast, cinematic**.

- Calm: lots of space, one primary action per screen, no clutter, no tiny grey text walls.
- Fast: everything responds in under 100 ms, progress is always visible, nothing feels stuck.
- Cinematic: video is shown big, in true 9:16, on near-black. Violet is the only loud colour.

Voice in the UI: short, friendly, plain English. "Drop your video." "Picking your best moments." "5 clips ready." Never "Processing job 3f2a".

Logo: the word "ethereel" in lowercase Space Grotesk 600, with a small waveform mark (5 rounded vertical bars of different heights) in violet to its left.

## 2. Design tokens

Define these as CSS variables in \`app/globals.css\` and map them in \`tailwind.config\` (or the Tailwind v4 \`@theme\` block). shadcn/ui variables (\`--background\`, \`--foreground\`, \`--primary\` and so on) point at these.

### 2.1 Colour (dark is the default theme)

| Token | Dark | Light | Use |
| --- | --- | --- | --- |
| \`--bg\` | #0B0A10 | #FAFAFC | Page background |
| \`--surface\` | #14121C | #FFFFFF | Cards, panels |
| \`--surface-2\` | #1C1927 | #F3F2F8 | Inputs, hover, nested panels |
| \`--border\` | #2A2638 | #E4E2EC | Hairlines, card borders |
| \`--text\` | #F5F3FF | #14121C | Main text |
| \`--text-muted\` | #A39FB8 | #5E5A70 | Secondary text, labels |
| \`--primary\` | #8B5CF6 | #7C3AED | Buttons, active states, progress |
| \`--primary-hover\` | #A78BFA | #6D28D9 | Button hover |
| \`--primary-soft\` | rgba(139,92,246,0.14) | rgba(124,58,237,0.10) | Selected tile backgrounds, glows |
| \`--accent\` | #FACC15 | #CA8A04 | Caption highlight preview, score badge for 90+ |
| \`--success\` | #22C55E | #16A34A | Ready, done ticks |
| \`--warning\` | #F59E0B | #D97706 | Minutes nearly used, slow steps |
| \`--danger\` | #F43F5E | #E11D48 | Errors, delete |
| \`--video-bg\` | #000000 | #000000 | Behind every video player, both themes |

Gradient (hero and empty states only): \`radial-gradient(60% 60% at 50% 0%, rgba(139,92,246,0.28) 0%, rgba(11,10,16,0) 70%)\`.

Contrast: \`--text\` on \`--bg\` and \`--text-muted\` on \`--surface\` both pass WCAG AA (4.5:1). White text on \`--primary\` passes AA for 16 px and up; button labels are 15 px semibold, so use \`--text\` #FFFFFF at 600 weight, which passes at large-text size, and keep button labels at least 15 px semibold.

Theme switching: respect \`prefers-color-scheme\` on first visit, then a toggle in Settings saves the choice in \`localStorage\`. The marketing site is always dark.

### 2.2 Typography

| Token | Font | Size / line height | Weight | Use |
| --- | --- | --- | --- | --- |
| \`display\` | Space Grotesk | 56 / 60 (mobile 38 / 42) | 600 | Landing hero |
| \`h1\` | Space Grotesk | 32 / 38 (mobile 26 / 32) | 600 | Page titles |
| \`h2\` | Space Grotesk | 22 / 28 | 600 | Section titles, card titles |
| \`h3\` | Inter | 17 / 24 | 600 | Sub-headings, clip hook titles |
| \`body\` | Inter | 15 / 24 | 400 | Default text |
| \`small\` | Inter | 13 / 20 | 500 | Labels, meta, helper text |
| \`mono\` | JetBrains Mono | 13 / 20 | 500 | Timecodes, durations, minutes counts |

Load with \`next/font/google\`. Tabular numbers (\`font-variant-numeric: tabular-nums\`) on every timecode, duration, percentage and minutes count so numbers do not jiggle as they change.

Caption preview fonts (only inside caption style tiles and the editor preview): Montserrat 800, Inter 600, Poppins 700. These match the render fonts in the build PRD.

### 2.3 Spacing, radius, shadow

- Spacing scale (px): 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 96. Nothing in between.
- Page gutters: 16 mobile, 24 tablet, 32 desktop. Max content width 1200, editor 1280.
- Radius: \`--r-sm\` 8 (inputs, chips), \`--r-md\` 12 (buttons, small cards), \`--r-lg\` 16 (cards, panels), \`--r-xl\` 24 (video players, modals), \`--r-full\` for pills and avatars.
- Shadow (dark): cards use a 1 px \`--border\` and no shadow. Floating things (menus, modals, toasts) use \`0 12px 40px rgba(0,0,0,0.5)\`. Primary buttons get a soft glow on hover: \`0 0 0 4px var(--primary-soft)\`.
- Shadow (light): cards \`0 1px 2px rgba(20,18,28,0.06)\`, floating \`0 12px 32px rgba(20,18,28,0.12)\`.

### 2.4 Icons

lucide-react, 18 px in buttons and lists, 20 px in nav, 1.75 stroke. Key icons: Upload, Sparkles (AI step), AudioLines (transcribing), Scissors (cutting), Clapperboard (rendering), Download, Pencil, Copy, Check, AlertTriangle, CreditCard, Settings.

## 3. Components

All built on shadcn/ui unless marked custom.

- **Button**: variants primary (violet fill, white text), secondary (\`--surface-2\` fill, \`--text\`), ghost (transparent, \`--text-muted\` to \`--text\` on hover), danger. Sizes sm 32 px, md 40 px, lg 48 px (landing and upload only). Loading state replaces the icon with a spinner and keeps the label.
- **Input / Textarea**: 40 px tall, \`--surface-2\` fill, \`--border\`, focus ring 2 px \`--primary\` with 2 px offset. Error state: \`--danger\` border and helper text below.
- **Card**: \`--surface\`, 1 px border, \`--r-lg\`, 20 px padding (16 on mobile).
- **Chip / ToggleChip** (onboarding): pill, 36 px tall, selected = \`--primary-soft\` fill + \`--primary\` border + check icon.
- **StyleTile** (custom): 9:16 mini preview (120 x 213) of a looping 3 s sample with the caption preset drawn in CSS over a still frame, label under it, selected ring 2 px \`--primary\`.
- **MinutesMeter** (custom): label "Minutes this period", mono "42 / 150", a 6 px bar (\`--primary\`, turns \`--warning\` at 80%, \`--danger\` at 100%), reset date in small muted text.
- **DropZone** (custom): dashed 2 px \`--border\` rounded \`--r-xl\`, 320 px tall desktop, 240 mobile, Upload icon, "Drop your video here" (h2), "MP4, MOV or WebM, up to 30 minutes and 1 GB" (small muted), "Choose file" secondary button. Drag-over: border becomes \`--primary\`, fill \`--primary-soft\`, icon bounces once.
- **UploadProgress** (custom): file name, size, a 10 px progress bar with percentage and "about 2 min left" estimate, and a second, thinner bar labelled "Finding your face".
- **PipelineSteps** (custom): vertical list of 5 steps. Each row: 28 px circle (pending = border only, active = violet spinner ring, done = green fill with check, failed = red with alert), label (h3), helper line (small muted, e.g. "About 1 minute per 10 minutes of video"), and a mono timer on the right for the active step.
- **ClipCard** (custom): 9:16 poster (\`--r-xl\`, \`--video-bg\`), rank badge top-left ("#1"), score pill top-right (90+ = \`--accent\` text on dark), duration pill bottom-right (mono), play button centre on hover. Under the poster: hook title (h3, 2 lines max), reason (small muted, 2 lines max), row of 3 icon buttons (Edit, Download, Copy caption).
- **VideoPlayer9x16** (custom): native \`<video>\` with \`playsinline\`, aspect-ratio 9 / 16, \`--video-bg\`, rounded \`--r-xl\`, custom controls: play/pause, scrub bar in violet, mono time, mute. Space toggles play when focused.
- **Stepper** (trim): minus button, mono value "00:12.5", plus button, small muted range hint.
- **Paywall** (custom): centred card with the waveform logo, "Start your 7-day free trial", 3 tick bullets, price line "$39/month after the trial, cancel anytime", primary button.
- **EmptyState** (custom): 64 px icon in a \`--primary-soft\` circle, h2, one line of body, one primary button.
- **Toast**: sonner, bottom-right desktop, top-centre mobile.
- **Dialog**: shadcn Dialog, \`--r-xl\`, max width 480 (confirm) or 640 (forms).

## 4. App shell

- Desktop (1024+): left sidebar 240 px: logo, "New video" primary button, nav (Projects, Billing, Settings), MinutesMeter pinned to the bottom, user menu (avatar, email, Log out).
- Tablet (640 to 1023): sidebar collapses to a 72 px icon rail.
- Mobile (under 640): top bar 56 px (logo, minutes pill "42/150", avatar). Bottom tab bar 64 px: Projects, New (violet circle button, raised), Settings. Safe-area padding at the bottom.

## 5. Screens

### 5.1 Landing page (/)

Order of sections:
1. **Nav** (sticky, 64 px, blurred \`--bg\` at 80%): logo, links (How it works, Styles, Pricing, FAQ), Log in (ghost), Start free trial (primary).
2. **Hero**: radial violet glow behind. Left: display headline, a sub line, primary "Start free trial" (lg) and ghost "Watch the demo", a small line "7 days free. Then $39/month." Right: a phone frame (9:16, \`--r-xl\` 32) auto-playing a muted Ethereel clip with Punch captions; behind it, slightly rotated and faded, a 16:9 "before" frame of the raw video. On mobile the phone sits under the copy, 280 px wide.
3. **Logo strip / proof**: "Built for coaches, consultants, agencies and podcasters" with 4 small niche icons (no fake logos).
4. **How it works**: 3 cards in a row (stack on mobile): 1 Upload your raw video, 2 Ethereel finds the best moments, 3 Download clips with captions. Each card has a small looping illustration (CSS or Lottie-free SVG animation).
5. **Before / after**: a slider component: left raw 16:9 with "um" captions struck through, right the vertical clip. Drag handle in violet.
6. **Caption styles**: 3 StyleTiles at large size (200 x 356) playing samples, names and one-line descriptions.
7. **What you get**: 6 feature rows with icons: Best moments picked by AI, Silences and "ums" removed, Face kept in frame, Word-by-word captions, Hook titles and emoji pop-ins, Ready for TikTok, Reels and Shorts.
8. **Pricing**: one card centred, 480 px wide, "$39/month", "150 minutes of video a month", ticks, "Start 7-day free trial".
9. **FAQ**: shadcn Accordion, 6 questions.
10. **Final CTA band**: glow background, headline, button.
11. **Footer**: logo, links (Pricing, Alternatives pages, Log in), small print "Made with care by <your name>".

### 5.2 Auth screens (/signup, /login, /forgot-password, /reset-password)

- Layout: split screen on desktop. Left 45%: form on \`--bg\`, max width 380, centred vertically. Right 55%: \`--surface\` panel with the violet glow and a looping clip in a phone frame plus one quote line ("Raw video in. Five clips out.").
- Mobile: form only, logo at the top, 24 px gutters.
- Sign up: h1 "Create your account", Continue with Google (secondary, Google icon), divider "or", Full name, Email, Password (with show/hide eye and a 3-segment strength bar), primary "Create account", small line "Already have an account? Log in".
- Log in: h1 "Welcome back", Google, divider, Email, Password, "Forgot password?" link right-aligned above the password field, primary "Log in".
- Forgot password: h1 "Reset your password", Email, primary "Send reset link". Success state replaces the form with a mail icon and "Check your inbox. The link works for 1 hour."
- Reset password: New password, Confirm password, primary "Save new password", then redirect to /app with a toast "Password updated".
- Errors appear inline under the field, never as alerts. Wrong password: "That email and password don't match."
- Buttons show the loading state while the request is in flight. Enter submits.

### 5.3 Onboarding (/onboarding, 3 steps)

- Full-screen, no sidebar. Top: logo left, "Step 1 of 3" small muted right, a 3-segment progress bar under it (segments fill violet with a 300 ms ease).
- Centred column max 560.
- Step 1 "What do you do?": h1, sub "We'll tune clip picking to your kind of content.", chips in a wrap grid. Continue (primary, disabled until one is picked).
- Step 2 "Where will you post?": multi-select chips with platform icons. Continue. Back (ghost).
- Step 3 "Pick your caption style": 3 StyleTiles side by side (horizontal scroll with snap on mobile). "You can change this per clip later." Continue to trial.
- After step 3: the Paywall card ("Start your 7-day free trial"). Clicking goes to Stripe Checkout.
- Transition between steps: content slides 24 px left and fades out (200 ms), next slides in from 24 px right (240 ms).

### 5.4 Dashboard / projects list (/app)

- Header row: h1 "Projects", right side "New video" primary button (hidden on mobile, the tab bar has it).
- If \`?welcome=1\` or no projects: EmptyState with the Upload icon, "Drop your first video", "A 3 to 10 minute talking-head video works best.", primary "Upload a video". Under it, 3 small tips with icons: Look at the camera, Good light on your face, One idea per minute.
- Projects grid: cards 280 px min width, auto-fill. Each card: 16:9 thumbnail (first ready clip poster cropped, or a skeleton), title (h3, editable on click), status chip (Processing with spinner, Ready with clip count in green, Failed in red), created date, duration (mono). Overflow menu: Rename, Delete (danger, confirm dialog "Delete this project and its clips? This can't be undone.").
- Sort: newest first. Show 24, "Load more" button after.
- MinutesMeter also appears at the top on mobile as a slim banner when over 80%.

### 5.5 Upload (/app/new)

- Centred column max 720. h1 "New video".
- DropZone. Under it, the 3 tips row.
- After a file is chosen: DropZone shrinks into a file row (video icon, name, size, duration in mono, a small 16:9 thumbnail from the first frame, "Change" ghost button). Below: a "Clips to make" segmented control (3, 5, 8) defaulting to 5.
- Checks happen instantly: errors show as a red inline banner inside the drop area: "This video is 34 minutes. The limit is 30." / "That file type isn't supported. Use MP4, MOV or WebM." / "This needs 12 minutes and you have 8 left." with a "See billing" link.
- Primary "Start" (lg). On click: UploadProgress replaces the button. Main bar shows upload percent, speed and time left. Thin bar shows "Finding your face" percent. A muted line: "Keep this tab open until the upload finishes. You can leave once processing starts."
- Network drop: bar turns \`--warning\`, label "Connection lost. Retrying..." and resumes automatically.
- On success: brief green tick (400 ms), then navigate to the processing screen.

### 5.6 Processing (/app/projects/[id] while not ready)

- Two columns desktop (left 400 px steps, right preview area), stacked on mobile.
- Left: project title (h1), duration and "Started 2 min ago" (small muted), PipelineSteps: Uploaded, Transcribing, Picking the best moments, Rendering clips (shows "2 of 5" in mono), Done.
- Right: while no clips exist, a large 9:16 skeleton phone with a soft violet shimmer and a rotating set of one-line facts ("Cutting 47 pauses", "Found 1,204 words", taken from real data as soon as the transcript exists). As clips become ready, ClipCards slide in (stagger 80 ms) into a strip.
- Copy under steps: "We'll email you when your clips are ready. Feel free to close this tab."
- Slow state (over 20 minutes): the active step turns \`--warning\`, helper "Taking longer than usual." plus "Try again" secondary button.
- Failed state: failed step red, a Card with AlertTriangle, the plain-English error, "Your 7 minutes have been refunded.", primary "Try again", ghost "Back to projects".

### 5.7 Clip review grid (/app/projects/[id] when ready)

- Header: project title (h1, editable), meta line "5 clips from 12:14 of video", right side "Download all" primary and an overflow menu (Rename, Delete).
- Grid of ClipCards: 2 columns mobile, 3 tablet, 4 desktop, 16 px gap mobile, 24 desktop.
- Tapping a card plays it inline (only one plays at a time; starting one pauses the others).
- "Copy caption" copies \`post_caption\` + hashtags with a toast "Caption copied".
- Clip render failed: card shows the poster area in \`--surface-2\` with AlertTriangle, "This clip didn't render", and "Retry" (free, does not use minutes).

### 5.8 Clip editor (/app/projects/[id]/clips/[clipId])

- Desktop: two columns. Left (sticky) VideoPlayer9x16 at up to 70vh tall, version label "v2" in mono under it. Right: a controls panel (Card, 420 px).
- Mobile: player on top (full width, max 60vh), controls below in an accordion (Style, Title, Trim, Extras, Caption).
- Controls, top to bottom:
  1. **Caption style**: 3 StyleTiles in a row (small size 88 x 156).
  2. **Hook title**: Input with "24 / 60" counter.
  3. **Trim**: Start and End Steppers. Under them a mini timeline bar showing the original range in \`--surface-2\` and the new range in violet, plus total length in mono ("Total 00:41.5"). Out-of-range steps disable the button and show the reason on hover.
  4. **Extras**: two Switches: Emoji pop-ins, Progress bar.
  5. **Post caption**: Textarea (4 rows) with Copy.
  6. Sticky footer of the panel: "Re-render (uses 1 minute)" primary, "Download" secondary. If nothing changed, Re-render is disabled.
- While re-rendering: the player is dimmed with a centred spinner and "Rendering v3, about 2 minutes". The old version still plays if tapped. When ready, the overlay fades and a toast says "v3 is ready".
- Leaving with unsaved changes shows a confirm dialog.
- Breadcrumb at the top: Projects / <project title> / Clip #2.

### 5.9 Export

- Download buttons start the file download straight away (signed URL). The button shows a check for 2 s after.
- Download all: a toast with a progress line "Downloading 3 of 5" until done.
- Mobile Safari note in a small muted line under Download all: "On iPhone, each clip opens in a new tab. Tap Share, then Save Video."

### 5.10 Billing and paywall (/app/billing)

- Card 1 Plan: "Ethereel Creator", "$39/month", status chip (Trial ends 24 Oct, Active, Past due, Cancelled), next billing date, "Manage billing" secondary (Customer Portal).
- Card 2 Usage: MinutesMeter large, a small table of this period's ledger lines (date, project, kind, minutes in mono).
- No subscription: the Paywall card replaces both.
- Past due: a \`--warning\` banner at the top of every app page: "Your last payment failed. Update your card to keep uploading." with "Fix billing".
- Paywall on /app/new for users without access: the Paywall card centred, with the user's existing projects still reachable from the nav.

### 5.11 Settings (/app/settings)

- Sections as Cards: Profile (name, email read-only), Defaults (default caption style tiles, brand colour picker with 8 swatches + hex input, live preview of a caption line), Appearance (Dark, Light, System), Password (change), Danger zone (Delete account, typed confirmation "delete").

## 6. States

### 6.1 Empty states
- Projects: see 5.4.
- Clip grid with 0 ready clips (all failed): EmptyState with Scissors, "No clips this time", "We couldn't find clear 30 to 60 second moments. Try a video where you talk in full sentences to camera.", primary "Upload another video". Minutes are refunded.
- Billing ledger: "No usage yet this period."

### 6.2 Loading states
- Page loads: skeletons that match the final layout (cards, 9:16 posters, text lines) with a slow shimmer (1.6 s). Never a full-page spinner.
- Buttons: inline spinner, label stays.
- Player loading: \`--video-bg\` with a small spinner, poster shown underneath.

### 6.3 Error states
- Inline field errors in \`--danger\` small text.
- Network errors on actions: toast "Couldn't save. Check your connection and try again." with Retry.
- 404 project or clip: EmptyState "We can't find that video." with "Back to projects".
- Global error boundary: friendly card, "Something went wrong on our side." and "Reload".

## 7. Motion

- Durations: 120 ms (hover, press), 200 ms (small transitions), 240 to 320 ms (panels, page content), 600 ms max (celebration).
- Easing: \`cubic-bezier(0.2, 0.8, 0.2, 1)\` for enter, \`cubic-bezier(0.4, 0, 1, 1)\` for exit.
- Buttons: press scales to 0.98. Hover lifts the glow, no movement.
- Pipeline steps: when a step completes, its circle fills green with a 200 ms scale from 0.6 to 1 and the check draws in (stroke-dashoffset, 240 ms). The next step's spinner fades in.
- Clip cards arriving: fade + 12 px rise, 240 ms, staggered 80 ms.
- Clips ready: a single small burst of violet confetti (canvas-confetti, 60 particles) from the "Done" step, once per project. Never on later visits.
- Drop zone drag-over: border colour 120 ms, icon bounce once (translateY -6 px, 300 ms).
- Upload progress: the bar animates width with a 300 ms ease so it never jumps.
- Reduced motion: under \`prefers-reduced-motion: reduce\` remove confetti, slides, bounces and shimmer. Keep opacity fades at 120 ms. Hero and sample videos show a still poster with a play button instead of auto-playing.

## 8. Accessibility

- Every interactive element reachable by keyboard in a logical order, visible 2 px violet focus ring with 2 px offset.
- Video players: real \`<video>\` element, captions are burnt in, so also provide the transcript text of each clip in a collapsible "Transcript" under the player for screen readers.
- Buttons with only an icon have \`aria-label\` (Edit clip 2, Download clip 2, Copy caption for clip 2).
- PipelineSteps is an ordered list. The active step has \`aria-current="step"\`. Status changes announce through an \`aria-live="polite"\` region ("Transcribing done. Picking the best moments.").
- Upload progress uses \`role="progressbar"\` with \`aria-valuenow\`.
- Colour is never the only signal: status chips have icons and words.
- Hit areas at least 44 x 44 px on touch.
- Form labels always visible (no placeholder-only fields).
- Contrast at AA minimum in both themes.

## 9. Mobile

- Design mobile first at 375 px wide. Test at 360, 390, 430, 768, 1024, 1440.
- Upload works on mobile: the file input accepts \`video/*\` so users can pick from the camera roll. Face scan runs on mobile too; if the device is slow (scan rate under 2 frames per second), skip it and use centre crop with a small note.
- Players use \`playsinline\` and start muted with a tap-to-unmute pill.
- The clip editor controls use full-width inputs and 48 px tall steppers.
- No hover-only features: everything on hover also works on tap.
- Bottom tab bar respects \`env(safe-area-inset-bottom)\`.

## 10. Copy deck (UI strings)

- Upload button: "Start"
- Pipeline labels: "Uploaded", "Transcribing", "Picking the best moments", "Rendering clips", "Done"
- Ready toast: "Your clips are ready"
- Over limit: "This needs {n} minutes and you have {m} left this period."
- Failed generic: "Something went wrong while making your clips. Your minutes have been refunded."
- No speech: "We could not hear enough speech in this video."
- Paywall headline: "Start your 7-day free trial"
- Paywall bullets: "150 minutes of video a month", "Best moments picked for you", "Captions, hook titles and reframing included"
`
