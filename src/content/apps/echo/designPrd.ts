// Echo design PRD (DESIGN.md). Builds on Quiet Precision (DESIGN_SYSTEM.md).

export const designPrd = `# Echo: design PRD

Save this file as \`DESIGN.md\` in the project root. It builds on **DESIGN_SYSTEM.md** (Quiet Precision), the base
design system for every screen. Save that file next to it as \`DESIGN_SYSTEM.md\`, and put this line in
\`CLAUDE.md\`:

\`\`\`md
UI rules: @DESIGN_SYSTEM.md @DESIGN.md
\`\`\`

DESIGN_SYSTEM.md decides the neutrals, type, radii, sizes, motion, components and stability rules. This file only
adds what is different for Echo: the brand accent, the product screens and the few components those screens need.
Where the two disagree, this file wins only for the accent and the Echo screens. Every stability, motion and
component rule in DESIGN_SYSTEM.md still applies: white surfaces, 1px hairlines, 6px boxes, 4px pills, 13px app
text, white buttons with a firm edge, no filled or black buttons, nothing moves under the cursor.

## 1. Brand

- **Name:** Echo. You say it once; it comes back as notes, chapters, quotes, a newsletter, posts, a blog post and
  clips. The product is the echo of the episode.
- **Tagline:** Every episode, written up and clipped.
- **Personality:** a calm producer who has done this a thousand times. Organised, warm, exact with timestamps,
  never hypes.
- **Three surfaces:**
  1. **The app** (host and producer side): Quiet Precision as written. Dense, keyboard friendly, light only.
  2. **Public episode pages** (listeners): still Quiet Precision (white, hairlines, Geist), wider reading column,
     the show's own accent instead of Echo's.
  3. **Audiograms** (social video): the only place colour is allowed to be loud, because it competes in a feed.
     Built in Remotion, not in the app CSS.

## 2. Brand accent: echo violet

Echo swaps the system's pastel blue for a pastel violet. Same three-part shape: a mid accent, a soft fill and an
edge. It marks "selected" and "in progress" only, exactly where the system uses blue.

| Token | Hex | Replaces | Use |
|---|---|---|---|
| \`--accent\` | #8a6be0 | \`--blue\` | Selected nav icon (duotone), progress bars, live dot, playhead, selected waveform region |
| \`--accent-soft\` | #f5f1fd | \`--blue-soft\` | Selected row, selected nav item, selected transcript range, current chapter |
| \`--accent-edge\` | #d9cdf6 | \`--blue-edge\` | Selected borders, clip window handles, focus of selected chips |

Why violet: the system's warning is amber and meters turn amber under 20%. Violet keeps "in progress" apart from
"running low". It also reads as sound without the cliché of a neon gradient.

Everything else is the system palette unchanged: \`--surface\` #ffffff, \`--hairline\` #e6e6e9, \`--divider\`
#efeff1, \`--btn-edge\` #dcdde0, ink #08090a, body #3c4149, muted #62666d, faint #8a8f98, ghost #b4b8bf, success
#27a644, warning #d18b0f, danger #eb5757.

\`\`\`css
:root {
  /* Echo accent (replaces the system blue) */
  --accent: #8a6be0; --accent-soft: #f5f1fd; --accent-edge: #d9cdf6;
  /* keep the system names pointing at the accent so shared components need no changes */
  --blue: var(--accent); --blue-soft: var(--accent-soft); --blue-edge: var(--accent-edge);
  /* Echo-only sizes */
  --waveform-h: 56px; --transcript-col: 680px; --asset-col: 720px; --side-panel: 400px;
}
\`\`\`

### 2.1 Status tag hues

Status maps to fixed tag hues (pastel fill at 6 to 9% opacity, darker edge, readable ink, 4px pill, 13px).

| Status | Label | Hue | Fill | Edge | Ink |
|---|---|---|---|---|---|
| uploading | Uploading 42% | Violet + live dot | #f5f1fd | #d9cdf6 | #5b3fc0 |
| imported | Imported | Grey | #f5f5f6 | #dcdde0 | #62666d |
| queued | Queued | Grey | #f5f5f6 | #dcdde0 | #62666d |
| transcribing | Transcribing + live dot | Violet | #f5f1fd | #d9cdf6 | #5b3fc0 |
| transcribed / generating | Writing + live dot | Violet | #f5f1fd | #d9cdf6 | #5b3fc0 |
| ready | Ready | Green | #eef8f1 | #bfe3c9 | #1d7a35 |
| published | Published | Blue | #f1f5fd | #c4d4f5 | #3a5fb8 |
| failed | Failed | Coral | #fdf0f0 | #f6c9c9 | #b33a3a |
| audio expired | Audio removed | Amber | #fdf6e7 | #f0d9a8 | #8f5d05 |

"Published" is shown as a second pill next to "Ready", never instead of it. Show names in tables hash to the first
seven of the eight system tag hues so a producer can scan 20 client shows by colour.

### 2.2 Show accent (public pages and audiograms)

Each show stores one \`accent_hex\`, picked on the show page (8 suggested swatches pulled from the artwork with a
small k-means, plus a hex field). Public pages derive three parts from it:
- \`--show-accent\` = the colour as chosen (links, playhead, current chapter edge).
- \`--show-accent-soft\` = 7% over white. \`--show-accent-edge\` = 35% over white.
- If the colour has less than 3:1 contrast on white, darken it in 5% lightness steps until it passes, and show
  "Adjusted for readability" under the swatch.

## 3. Type in Echo

Geist only, weights 400, 500, 600. App UI text is 13px. Larger sizes only for real headings.

| Where | Role |
|---|---|
| Episode workspace title | H3 20/26, 500, one line, ellipsis |
| Asset tab content (show notes, newsletter, blog) | 14/22 body, 400, max 680px wide, because people read it |
| Transcript lines | 14/22, speaker name 13px 500 in ink, timestamp 13px faint tabular |
| Timestamps everywhere | tabular-nums, format m:ss under an hour, h:mm:ss above |
| Public episode page title | H1 35/1.12 |
| Public transcript | 16/26 body, max 680px |

No monospace anywhere, timestamps included. Counts and meters use tabular numbers.

## 4. Components (Echo-specific)

All built from DESIGN_SYSTEM.md tokens. No new radii, shadows or sizes.

### 4.1 Speech strip (the episode "waveform")
- 56px high, full width of its column, white with a bottom hairline. Bars 2px wide, 2px gap, ink at 18%;
  played part in \`--accent\` at 60%.
- The bars are not decoded audio (decoding an hour of audio in the browser is too heavy). Each bar is the number
  of words spoken in one bucket of the episode (600 buckets), computed from \`transcripts.words\` by the worker and
  saved as \`transcripts.density\`. Bar height = words in bucket / busiest bucket. Hovering shows the speaker who
  talked most in that bucket. Silence shows as a gap, which is exactly what a host looks for when clipping.
- The real waveform only appears in the audiogram preview, drawn by Remotion from the 60 s clip.
- Chapter ticks: 1px \`--hairline\` lines at chapter starts, with a 13px label on hover in a portal tooltip.
- Clip window: a \`--accent-soft\` rectangle with 1px \`--accent-edge\` sides and two 8px wide handles. Drag to
  move, drag handles to resize, clamped to 30 to 60 s. Length label above the window ("0:42"), fixed width.

### 4.2 Transcript view
- One row per utterance: timestamp (fixed 56px column, faint, tabular), speaker name (fixed 120px column,
  ellipsis), text. Row min-height 36px. Rows never reflow when highlighted.
- Click a timestamp: seek the episode player. Select text: a floating selection bar (system selection bar rule)
  with "Make audiogram", "Copy quote" and "Add to quotes". Its width is fixed.
- Speaker rename: click the speaker name, a 240px menu opens in a portal with an input; Enter saves for every row.
- Search: a 36px input in the page toolbar; matches get \`--accent-soft\`, counter "3 of 12" fixed width.
- Virtualised (\`@tanstack/react-virtual\`) once over 300 rows. 60 minutes is about 700 utterances.

### 4.3 Asset card
- White box, 1px hairline, 6px radius, 24px padding, max 720px wide.
- Header row 48px: asset name (13px 500), version pill ("v3", 4px pill, grey), "Edited" pill if edited, and
  actions on the right: Copy, Regenerate, History. Buttons keep their width while loading.
- Body: Markdown rendered (no raw HTML) at 14/22. Click Edit to switch to a textarea of the same height (measure
  before swapping), Save and Cancel appear in place of Edit.
- Copy buttons: "Copy" becomes "Copied" for 1.6 s in the same width. Copy formats: show notes as Markdown and as
  HTML (dropdown on the button), chapters as "0:00 Title" lines, social posts one at a time.

### 4.4 Regenerate popover
- 320px popover from the Regenerate button (menu pop motion). 3 preset chips ("Shorter", "More playful",
  "More formal") and a 3-line textarea "Tell Echo what to change" with a 300 character counter.
- Button: "Regenerate (1 of 30 left)". While running, the asset body keeps its height, the text fades to 40% and a
  live dot with "Rewriting" sits in the header. Undo appears in the toast for 8 s.

### 4.5 Title picker
Five rows, 48px each, radio on the left, the title, the angle as a grey pill on the right. The selected row
gets \`--accent-soft\` and the episode title updates. Character count right-aligned, tabular, amber over 60.

### 4.6 Chapter list
Rows 40px: start time (tabular, link), title (inline editable), drag handle on hover only (visibility hidden at
rest so rows do not shift). "+ Add chapter" dashed row at the end. Copy menu: "YouTube format", "Podcast host
format", "chapters.json URL".

### 4.7 Quote card
White box, 6px radius, the quote at 14/22 in ink, speaker and time underneath in faint 13px. Actions on hover
(reserved space): Copy, Make audiogram. A small "Verified" tick (Lucide check, 14px, success ink) means it
passed the word-for-word check.

### 4.8 Audiogram dialog
One dialog (520px max, opens at 10% from the top) that morphs height between three steps; the width never
changes.
1. **Pick the moment:** speech strip zoomed to 3 minutes around the chosen point, clip window, transcript
   excerpt under it, length label. Start from a quote or a clip idea pre-selects the window.
2. **Style:** three style tiles (Bars, Line, Minimal) as 96x170 vertical thumbnails, title field (80 chars),
   show accent swatch (read only, change on the show page).
3. **Preview:** \`@remotion/player\` at 270x480 with the real composition and the clip audio from a signed URL,
   then "Render audiogram (1 of 20 left)".
After render starts, the dialog closes and a toast says "Audiogram rendering". The Audiograms panel shows a row
with a live dot and "Rendering video 64%" (fixed width label).

### 4.9 Usage meter
In the sidebar above the bottom group: label "Audio hours", value "4.5 of 6" (tabular), 4px high bar in
\`--accent\`, amber under 20% left, coral under 5%. Hover shows audiograms and regenerations left in a tooltip.

### 4.10 Job progress
Four steps in a single 44px row: Upload, Transcribe, Write, Ready. Done steps get a success check, the current
step a live dot and a short label ("Transcribing, about 3 min"), future steps ghost ink. Fixed width per step.

## 5. Icons

Navigation: Phosphor 17px, regular at rest, duotone in \`--accent\` when selected:
Episodes \`Microphone\`, Shows \`SquaresFour\`, Audiograms \`Waveform\`, Voice \`PenNib\`, Public pages \`Globe\`,
Documentation \`BookOpen\`, Help \`Lifebuoy\`, Billing \`CreditCard\`, Settings \`GearSix\`.
In-content: Lucide 14 to 16px, 1.5 stroke: \`Copy\`, \`RefreshCw\`, \`History\`, \`Play\`, \`Pause\`, \`Scissors\`
(make audiogram), \`Rss\`, \`Upload\`, \`Check\`, \`Download\`, \`Code\` (embed), \`ExternalLink\`. Never mix the two
families in one row.

## 6. App shell

- Left sidebar 240px (56px icons-only under 1100px), white, right hairline. No top bar. Each page has a 48px
  toolbar with search, count and actions, no page title.
- **Top group:** workspace switcher (32px row: workspace initial in a 20px 4px-radius square, name, chevron;
  opens a menu with every workspace and "+ New workspace"), then the core items:
  1. Episodes
  2. Shows
  3. Audiograms
  4. Voice
  5. Public pages
- **Bottom group, always in this order:** usage meter, then
  6. Documentation
  7. Help
  8. Billing (hidden for non-owners, the slot collapses because the group is bottom-anchored)
  9. Settings
- Nav items 32px high, 6px radius, hover \`--hover\`, selected \`--accent-soft\` with ink text and duotone icon.
- A primary action lives in the Episodes toolbar: "New episode" (white button, firm edge). Keyboard: \`N\` opens it,
  \`/\` focuses search, \`G E\` goes to Episodes, \`G A\` to Audiograms.

## 7. Screens

### 7.1 Auth (\`/login\`, \`/signup\`, \`/reset\`)
- Centred 400px column on white, Echo wordmark (Geist 500, 20px) with a 3-bar waveform mark in \`--accent\`.
- Signup: name, email, password (show/hide), "Create account". Under it: "7 days free. Card needed to start the
  trial." Google button below a hairline "or".
- Errors under fields in danger ink with \`role=alert\`: "That email already has an account. Log in instead."
- Loading: the button keeps its width, spinner overlays the label after 200 ms.

### 7.2 Onboarding (\`/onboarding\`)
One card, 560px wide, step dots on top, morphing height between steps. Width fixed.
1. **Workspace:** "What should we call your workspace?" placeholder "Sam's podcasts" or "Northwave Audio". Helper:
   "Agencies: one workspace, many client shows."
2. **Your show:** name, artwork upload (square, 1400 to 3000 px, preview 96px), and "Have an RSS feed?" input with
   a Check button. A good feed fills the name and artwork and shows the latest episode title with a green tick.
3. **Your voice:** large textarea "Paste 300 to 3,000 words you have written: a newsletter, a LinkedIn post, an old
   episode description." Live word count, tabular. "Skip for now" link (Echo writes plainly until a sample exists).
4. **First episode:** two option cards side by side: "Process my latest episode" (only if a feed was added,
   shows its title and length) and "Upload a file". Then Checkout opens (shared Stripe tasks).
Each step's primary button states the action: "Create workspace", "Save show", "Save my voice", "Start my trial".

### 7.3 Episodes (\`/app/episodes\`)
- Toolbar 48px: search, count "38 episodes", "New episode".
- Filter bar 44px: chips for Show, Status, Published, Date. "+ Add filter" dashed.
- Table: Episode (artwork 24px + title + "Ep 42", ellipsis), Show (hashed tag), Status (pill + Published pill),
  Length (tabular), Audiograms (count), Updated (relative). Header 36px, rows 48px.
- Row click opens the workspace. Multi-select shows the floating selection bar: "Publish", "Unpublish",
  "Process" (for imported), each with a min width for three-digit counts.
- **Empty:** illustration-free. A 520px box with "No episodes yet" (H3), "Upload a file or connect your RSS feed
  and Echo writes everything up." and two buttons "Upload an episode" and "Connect a feed".
- **Loading:** 8 static skeleton rows at 48px in \`--hover\` (no shimmer: the live dot is the only loop the
  system allows). The table rises once when data arrives.

### 7.4 New episode (\`/app/episodes/new\`)
- Tabs: Upload, From my feed.
- **Upload:** show select (required), dashed drop zone 200px high "Drop an audio or video file, up to 1 GB",
  title input (filled from the file name), episode number (optional). After drop: file name, size, length, a
  progress bar with percent and time left (tabular, fixed width), Cancel. The page can be left: "You can close
  this tab. We email you when it is ready."
- **From my feed:** per show with a feed, the last 20 items as rows: title, date, length, status (Imported,
  Ready, Not imported). Checkbox per row and "Process 3 episodes (3.2 audio hours)". If that is over the limit,
  the button reads "Over your limit by 1.2 hours" and is disabled, with "Upgrade" next to it.

### 7.5 Episode workspace (\`/app/episodes/[id]\`)
The main screen. Three regions, no reflow when panels open.
- **Toolbar 48px:** back arrow, artwork 24px, title (H3, ellipsis), status pills, then on the right "Publish"
  (or "Unpublish"), "View page" (when published), and a "..." menu (Rename, Reprocess, Delete).
- **Player bar 56px** under the toolbar: play/pause (32px), current time / length (tabular, fixed width), the
  speech strip with chapter ticks, playback speed menu (1x, 1.25x, 1.5x, 2x).
- **Left column (680px max): Transcript** (4.2).
- **Right column (720px max): Assets.** A 44px tab bar: Titles, Show notes, Chapters, Quotes, Newsletter, Social,
  Blog. Each tab is an asset card (4.3) or its special component (4.5 to 4.7). Clip ideas sit under Quotes as
  "Suggested clips" with a "Make audiogram" button each.
- **Audiograms panel:** a 400px side panel from the right over the page (button "Audiograms (3)" in the toolbar),
  listing renders with a 54x96 thumbnail, length, style, status, Download.
- **While processing:** the job progress row (4.10) replaces the tab bar, the transcript column shows "The
  transcript appears here in a few minutes" at full height, and asset tabs fill in as each group finishes (rows
  rise once).
- **Under 1100px:** the two columns become tabs (Transcript, Assets) in the same toolbar; the player bar stays.

### 7.6 Publish dialog
Morphing dialog, 520px.
1. "Publish this episode?" with the public URL (\`getecho.app/s/sams-show/ep-42-pricing\`), slug editable,
   "Show the Made with Echo badge" switch (locked on for Creator with "Studio plan" pill).
2. After publish: "Published" with three copy rows (fixed height): page URL, embed code
   (\`<iframe src=... height="160">\`), chapters.json URL, transcript.vtt URL, each with a Copy button, and a line:
   "Paste the chapters and transcript URLs into your podcast host so Apple and Spotify show them."

### 7.7 Shows (\`/app/shows\`, \`/app/shows/[id]\`)
- List: cards 240px wide in a grid (gap 16): artwork, name, feed status dot (green ok, amber paused), episode
  count, "Last import 2 h ago". "+ New show" dashed card. Count against the plan: "3 of 5 shows".
- Show page: sections split by hairlines with 24px gaps: Basics (name, slug, description, artwork), Feed (URL,
  Check, auto-process switch with "Uses your audio hours when a new episode arrives", last poll, error), Look
  (accent swatches, audiogram default style), Links (Apple, Spotify, YouTube, website), Public page (badge switch,
  view link). Save bar floats 16px above the bottom only when something changed (fixed width).

### 7.8 Audiograms (\`/app/audiograms\`)
Table: thumbnail (36x64), episode, show, length, style, status (live dot while rendering with percent), created
by, created. Row action: Download, Copy link (signed, 7 days). Empty: "No audiograms yet. Open an episode, pick a
quote and press Make audiogram."

### 7.9 Voice (\`/app/voice\`)
Show select in the toolbar. Left: the sample textarea (680px) with word count. Right: the voice card as a 400px
box: tone words as grey pills, rules as two short lists (Do, Don't), signature phrases in quotes, the sample
opening sentence. Button "Update my voice" re-runs the card (live dot "Reading your sample" while it runs).

### 7.10 Public pages (\`/app/public\`)
Table of published episodes with Views (last 30 days, from PostHog if connected, else hidden), URL, and a Copy
embed button. Toolbar shows the show's public URL with Copy.

### 7.11 Billing (\`/app/billing\`, owner only)
- Plan box: plan name, price, interval, renewal or trial end date, "Change plan" (Customer Portal) and the three
  plan cards when on trial.
- Usage: three meters (Audio hours, Audiograms, Regenerations) with "Resets on 1 Nov".
- Invoices link (Customer Portal). No card details in Echo.

### 7.12 Settings (\`/app/settings\`)
Sections: Profile (name, email, password), Workspace (name, delete workspace with type-the-name confirm),
Members (table: name, email, role select, remove; "Invite" opens a dialog with email + role; seats "2 of 3"),
Notifications (switches per email kind), Danger zone.

### 7.13 Documentation and Help
- Docs: left list of articles at 240px inside the page (not a second sidebar: a simple list), article at 680px.
  Articles: Connect your RSS feed, Add chapters to Apple and Spotify, Make an audiogram, Teach Echo your voice,
  Publish an episode page, Invite your team, Plans and limits.
- Help: a form (topic select, message, optional episode link) and "Recent problems": last 5 failed jobs with
  their human message and a Retry button.

### 7.14 Paywall (\`/paywall\`)
Centred 520px box: "Your trial has ended" or "Your last payment failed", the three plan cards, and "Your episodes
and pages are safe. Public pages stay live for 30 days."

## 8. Public episode page (\`/s/[show]/[episode]\`)

Marketing rules apply (square corners on large blocks, 1180px rail), but still white, hairlines, Geist.
- **Header (rail):** artwork 120px, show name (link to show page), episode title (H1), "Ep 42 · 14 Oct 2026 ·
  58 min" in muted, "Listen on" pills (Apple, Spotify, YouTube) from show links.
- **Player card:** 72px high, full rail width up to 720px, play button 40px in ink outline, scrubber with chapter
  ticks, time (tabular), speed. Sticky to the bottom of the viewport once scrolled past (rises 8px, 240ms).
- **Body (680px column):** Summary, Key points, Chapters (clickable times seek the player and scroll the
  transcript), Quotes (blockquotes with speaker), Resources, then Transcript in sections per chapter with H2
  chapter titles and speaker names in 500 weight.
- **Current position:** the playing utterance gets \`--show-accent-soft\`; auto-scroll only if the user has not
  scrolled in the last 5 s.
- **Footer:** "Made with Echo" badge (Creator) 13px faint with the waveform mark, links to Echo.
- **Embed (\`/embed/[id]\`):** 160px high: artwork 64px, title, show name, play, scrubber, chapters menu.

## 9. Audiogram compositions (Remotion)

1080x1920, 30 fps, 30 to 60 s. Safe zone: 120px top, 320px bottom (platform UI). Fonts: Geist loaded with
\`@remotion/google-fonts\` [verify Geist is available there, else load the local font file with \`staticFile\`].
| Style | Layout |
|---|---|
| Bars | Background = show accent at 14% over #0f0f12. Artwork 560px square, 6px radius, centred at y 420. Title 44px 500 white under it. 48 bars of frequency data (\`visualizeAudio\`, 2 x 24 mirrored), 8px wide, accent colour, centred at y 1180. Captions 64px 600 white, 3 words per page, active word in the accent with a soft 2px underline. Progress bar 6px at the bottom of the safe zone |
| Line | White background. Artwork 320px top left with show name. A smooth waveform line (\`visualizeAudioWaveform\`) 4px in the accent across the middle. Captions 72px 600 ink, centred. Most readable on LinkedIn |
| Minimal | Background = accent at 8% over white. Only captions (80px 600 ink), a small 4-bar waveform mark that pulses with volume, show name at the bottom |
- Captions never cover the waveform. Line breaks are fixed per page so text never jumps mid-word.
- First frame is a usable thumbnail (title and artwork visible at frame 0).

## 10. States

| State | Rule |
|---|---|
| Empty | One sentence of what to do, one or two buttons, no illustrations |
| Loading | Static skeletons the size of the real content. Spinners after 200 ms, at least 400 ms |
| Processing | Live dot + label, the only looping motion. Labels say what is happening and roughly how long |
| Partial | An asset that failed shows its card with "We could not write this one. Try again (free)" and a Retry button; others still work |
| Error | What went wrong, then what to do: "We could not reach your feed. Check the URL opens in a browser, then click Try again." |
| Limit | Inline above the action: "You have used 6 of 6 audio hours this month. Upgrade to Studio for 20." with Upgrade |
| Offline | Toast "You are offline. Changes will save when you reconnect" and Save buttons queue |

## 11. Motion (Echo moments, within the system curves)

| Moment | Spec |
|---|---|
| Asset tab fills in after generation | Content fades up 4px over 300 ms (ease-out), once per asset per session |
| Copy to Copied | Label cross-fades 120 ms, width fixed |
| Regenerate | Body opacity to 40% over 160 ms; new content fades up 4px over 300 ms |
| Clip window drag | Follows the pointer with no easing; the length label updates every frame (tabular) |
| Audiogram dialog step | Height morph 300 ms (morph curve), content fades up 4px after 60 ms |
| Public player stick | Rises 8px over 240 ms when it becomes sticky |
| Reduced motion | Every one of these shows the end state instantly. The live dot stops pulsing and stays solid |

## 12. Accessibility

- Transcript rows are buttons for seeking with \`aria-label="Play from 12:04"\`.
- The speech strip is a \`slider\` with \`aria-valuetext="12 minutes 4 seconds of 58 minutes"\`, arrow keys move 5 s,
  Shift+arrow 30 s. Clip handles are separate sliders.
- Audiogram captions are burned in; the download also offers an \`.srt\` of the clip.
- Every copy button announces "Copied" in a polite live region.
- Public pages: transcript is real text, headings in order, the player is keyboard operable, focus visible.
- Colour is never the only signal: status pills always carry a word.

## 13. Mobile

- App: usable down to 375px for reading and copying assets (hosts copy posts on their phone). The episode workspace
  becomes tabs (Transcript, Assets, Audiograms). Uploads and the audiogram editor work but show "Easier on a
  laptop" once.
- Public pages: designed mobile first. Player sticky at the bottom with 16px side gutters. Check 320, 375, 430.

## 14. Emails (React Email)

White, 560px, Geist with system fallback, Echo wordmark, one button (white with a 1px ink-60% edge, 6px radius,
matching the app), plain text version. "Ep 42 is ready" email lists what was made with counts ("5 titles, 9
chapters, 5 quotes, 5 posts, 1 newsletter, 1 blog post") and the top title option.

## 15. Microcopy

| Place | Copy |
|---|---|
| Upload drop zone | Drop an audio or video file, up to 1 GB |
| Upload done | Uploaded. Transcribing now, about 3 minutes for an hour of audio |
| Processing step labels | Uploading 42% · Transcribing · Writing your notes · Ready |
| Episode ready toast | Ep 42 is ready |
| Too long | This episode is 3 h 12 min. Your plan handles episodes up to 2 hours. Upgrade to Studio for 3 hours |
| Limit | You have used 6 of 6 audio hours this month. Upgrade to Studio for 20, or wait until 1 Nov |
| Quote verified tooltip | Word for word from the transcript |
| Regenerate button | Regenerate (12 of 30 left) |
| Regenerate placeholder | Tell Echo what to change, for example: shorter, and mention the book |
| Audiogram render button | Render audiogram (4 of 20 left) |
| Audio expired | We delete uploaded audio 30 days after processing. Upload the file again or add your RSS feed to make audiograms |
| Feed check ok | Found 214 episodes. We will import the newest one now and new ones as they go live |
| Feed error | We could not read this feed. Check the URL opens in a browser and ends in .xml or /feed |
| Publish done toast | Episode page published |
| Copy toast | Copied |
| Delete episode | Delete Ep 42? The transcript, notes and audiograms go too. The public page stops working |
| Voice empty | Paste something you have written so Echo sounds like you, not like a robot |
| Help success | Sent. We reply within one working day |

## 16. Component states

Every interactive component has these states designed before it is built. Sizes never change between states.

| Component | Rest | Hover | Pressed / active | Loading | Disabled | Error |
|---|---|---|---|---|---|---|
| Button (primary) | White, 1px \`--ink\` at 60% edge, ink label | \`--hover\` fill | 98% scale, 100 ms | Spinner over the label after 200 ms, width held | Ghost label, \`--divider\` edge | Not used (errors show under the form) |
| Button (secondary) | White, \`--btn-edge\` | \`--hover\` | 98% scale | Same as primary | Ghost label | Not used |
| Copy button | "Copy" with Lucide Copy 14px | \`--hover\` | "Copied" + Check 14px for 1.6 s | Not used | Ghost when the asset is empty | "Could not copy" toast |
| Tab (asset tabs) | Muted label | Ink label | Ink label, 2px \`--accent\` bottom line | Live dot after the label while generating | Ghost label with "Failed" pill | Coral dot after the label |
| Transcript row | White | \`--row-hover\` | Playing: \`--accent-soft\` | Not used | Not used | Not used |
| Selected text range | Not used | Not used | \`--accent-soft\` with the selection bar | Not used | Not used | "Pick 30 to 60 seconds" inline under the bar if outside the range |
| Chapter row | White | Drag handle visible, \`--row-hover\` | Dragging: 1px \`--accent-edge\` drop line | Not used | Not used | "Chapters must be at least a minute apart" under the row |
| Clip window | \`--accent-soft\` + edges | Handles darken to \`--accent\` | Dragging: label shows length every frame | Not used | Not used | Edges coral and label "Too short" or "Too long" while outside 30 to 60 s |
| Style tile | White, hairline | \`--hover\` | Selected: \`--accent-soft\`, \`--accent-edge\` | Not used | Not used | Not used |
| Feed input | White, \`--btn-edge\` | Darker edge | Focus: darker edge + 3px ink halo | "Checking" live dot inside the field, right side | Ghost | Danger text under the field |
| Usage meter | \`--accent\` bar | Tooltip with all three meters | Not used | Static \`--hover\` bar until loaded | Not used | Amber under 20%, coral under 5% |
| Audiogram row | Thumbnail + details | \`--row-hover\` | Not used | Live dot + "Rendering video 64%" fixed width | Not used | Coral pill "Failed" + Retry button |
| Publish switch (badge) | System switch | Not used | Accent track when on | Not used | Locked on with "Studio plan" pill for Creator | Not used |

## 17. Layout grid per screen

| Screen | Columns at 1440 | At 1100 | At 375 |
|---|---|---|---|
| Episodes | Full-width table, fixed column widths: 40% episode, 16% show, 14% status, 10% length, 10% audiograms, 10% updated | Same, Audiograms column hidden | Cards: title, show, status, one per row |
| Episode workspace | Transcript 680 + 24 gap + Assets 720 (centred, white outside) | Tabs: Transcript, Assets | Tabs: Transcript, Assets, Audiograms |
| Audiogram dialog | 520 dialog | 520 dialog | Full width with 16px gutters, steps scroll inside |
| Shows | Grid of 240px cards, gap 16 | Same | One column |
| Show settings | 680 form column | 680 | Full width |
| Voice | Sample 680 + card 400 | Stacked: card on top | Stacked |
| Public episode page | 1180 rail, 680 reading column | Same | 16px gutters, player sticky bottom |

## 18. Hand-off checklist for Claude Code

- [ ] Tokens from DESIGN_SYSTEM.md section 11 plus the Echo block in section 2, no raw hex in components.
- [ ] Sidebar exactly as section 6: Episodes, Shows, Audiograms, Voice, Public pages, then Documentation, Help,
      Billing, Settings.
- [ ] Every button white with a firm edge; no filled buttons, including "Publish".
- [ ] Copy, Regenerate, Publish and Render buttons keep their width in every state.
- [ ] Transcript and asset columns never reflow when the side panel opens or a tab loads.
- [ ] Live dot is the only looping animation; reduced motion shows end states.
- [ ] Status pills match section 2.1; show names hash to tag hues.
- [ ] Public page passes Lighthouse mobile: LCP under 2.0 s, CLS under 0.05.
- [ ] Screenshots at 375, 1100 and 1440 of Episodes, the workspace, the audiogram dialog and a public page.
`
