// Sparring design PRD (DESIGN.md). Builds on Quiet Precision (DESIGN_SYSTEM.md).

export const designPrd = `# Sparring: design PRD

Save this file as \`DESIGN.md\` in the project root. It builds on **DESIGN_SYSTEM.md** (Quiet Precision), which is the
base design system for every screen. Save that file next to it as \`DESIGN_SYSTEM.md\`, and put this line in
\`CLAUDE.md\`:

\`\`\`md
UI rules: @DESIGN_SYSTEM.md @DESIGN.md
\`\`\`

DESIGN_SYSTEM.md decides the neutrals, type, radii, sizes, motion, components and stability rules. This file only adds
what is different for Sparring: the brand accent, the product-specific screens and the components those screens need.
Where the two disagree, this file wins only for the accent and the Sparring screens. Every stability, motion and
component rule in DESIGN_SYSTEM.md still applies: white surfaces, 1px hairlines, 6px boxes, 4px pills, 13px app text,
white buttons with a firm edge, no filled or black buttons, nothing moves under the cursor.

## 1. Brand

- **Name:** Sparring. A sparring partner is the person you train with before the real fight: they hit back, but
  nobody gets hurt. That is the product: a prospect who pushes back, so the real call goes better.
- **Tagline:** Cold call practice that hits back.
- **Personality:** a calm, honest coach. Direct, specific, never cheesy. No boxing gloves, no fire emojis, no
  "crush your quota". The boxing idea lives in the name and one word ("corner"), nowhere else.
- **Two moods, one system:**
  1. **Practice and review** (most screens): Quiet Precision as written. Dense, calm, keyboard friendly, light only.
  2. **The live call:** the same white surface with almost everything removed. One persona, one timer, one big
     End button. Calm under pressure is the whole point.

## 2. Brand accent: corner blue

Sparring swaps the system's pastel blue for a slightly greener "corner blue" (the blue corner of a ring). It keeps the
three-part shape: a mid accent, a soft fill and an edge. It marks "selected", "in progress" and "live" only, exactly
where the system uses blue.

| Token | Hex | Replaces | Use |
|---|---|---|---|
| \`--accent\` | #3f95c9 | \`--blue\` | Selected nav icon (duotone), live dot, progress and meter fill, audio playhead |
| \`--accent-soft\` | #eef6fb | \`--blue-soft\` | Selected row, selected nav item, selected persona card, active transcript line |
| \`--accent-edge\` | #c2dff0 | \`--blue-edge\` | Selected borders, the focused persona card edge, note markers on the waveform |

Everything else comes from DESIGN_SYSTEM.md unchanged: surface #ffffff, row hover #fafafb, hover fill #f5f5f6,
hairline #e6e6e9, divider #efeff1, button edge #dcdde0, ink #08090a, body #3c4149, muted #62666d, faint #8a8f98,
ghost #b4b8bf, success #27a644, warning #d18b0f, danger #eb5757.

Why not red (the other corner): danger is coral (#eb5757) and the meter turns coral under 5%. A red accent would make
every selected item look like an error.

### 2.1 Score bands (fixed hues, used everywhere a score appears)

| Band | Range | Tag fill (8%) | Edge | Ink | Label |
|---|---|---|---|---|---|
| Strong | 75 to 100 | green #27a644 at 8% | #b9e3c3 | #1d7a33 | "Strong" |
| Solid | 50 to 74 | amber #d18b0f at 8% | #f0d9a8 | #8a5c08 | "Solid" |
| Needs work | 0 to 49 | coral #eb5757 at 8% | #f5c2c2 | #b23c3c | "Needs work" |

Rubric scores (0 to 20) use the same bands at 15 / 10. Scores are always shown as a number first, the band tag second:
"72 Solid". Never colour alone.

### 2.2 Persona hues

Each persona has a \`hue\` (0 to 7) mapping to the system's eight pastel tag hues. The hue tints only the persona's
initials avatar (pastel fill, darker edge, readable ink). Built-in: Margaret 0, Dev 3, Priya 5. Custom personas get
the next free hue in the workspace.

### 2.3 Status tags

| Status | Hue | Label |
|---|---|---|
| created / live | accent | "Live" with the pulsing dot |
| ended | grey | "Ended" |
| scoring | accent | "Scoring" with the pulsing dot |
| scored | (score band) | the score, e.g. "72 Solid" |
| failed | coral | "Not scored" |
| abandoned | grey | "Did not connect" |
| too short | grey | "Too short to score" |

## 3. Type in Sparring

Geist 400, 500 and 600, the system's scale (12, 13, 14, 16, 20, 24, 32, 48). App text 13px.

- **The call timer:** 48px, weight 500, tabular numbers, -0.045em. The only 48px text inside the app.
- **Scorecard total:** 48px, weight 500, tabular. "/ 100" next to it in 20px faint.
- **Rubric numbers:** 13px tabular, right aligned in a fixed 40px column.
- **Transcript timestamps:** 12px faint, tabular, fixed 40px column, never monospace.
- **Persona name on cards:** 14px 500. Title and company 13px muted, one line, ellipsis.

## 4. Components (Sparring-specific)

All built from shadcn/ui primitives themed to the tokens. No raw hex in components.

- **PersonaCard** (160 x 196px, 6px radius, hairline): initials avatar 40px (persona hue), name, title, company
  (ellipsis), one line summary (2 lines max, reserved height). Selected: accent-soft fill + accent-edge border. Custom
  personas show a 4px pill "Custom". Fixed size so the grid never jumps.
- **ScenarioTabs:** a segmented control of three: Cold call, Discovery, Objection drill. 32px, sentence case.
- **DifficultyPicker:** three pills Easy, Normal, Hard with a one line hint below in reserved space.
- **BriefCard:** 3 lines: who they are, your goal, time limit ("You have 5 minutes"). Hairline box, 16px padding.
- **CallButton:** large 46px white button with the firm edge, label "Call Margaret", a phone icon (Lucide 16px).
  Disabled state keeps the width and shows the reason underneath in muted text, not a tooltip.
- **LiveTimer:** "2:14" counting up, "/ 5:00" faint. Under 30 s left: the remaining part turns warning ink, nothing
  else changes.
- **MinutesMeter:** sidebar meter (system meter rules: accent, amber under 20%, coral under 5%). Label "212 of 360
  min left", tabular, fixed width.
- **TalkMeter:** a thin two-part bar "You 46% / Margaret 54%" updated every 2 s on the call page (from the SDK's
  speaking state). Fixed width, width transitions 300ms with the morph curve.
- **VoiceOrb:** a 96px circle with a hairline edge; when the persona speaks, a soft accent-soft ring scales from 1.0 to
  1.06 at the SDK's output volume (transform only). When the rep speaks, the ring sits on the rep's mic level
  indicator instead. Reduced motion: a static "Speaking" label.
- **ScoreTotal:** number, "/ 100", band tag, outcome line below (reserved one line).
- **RubricRow:** label (Opener, Permission, Pain discovery, Objection handling, Next step), a 0 to 20 bar (accent fill,
  width animates once), the number, and the one line reason in muted text. 48px rows.
- **AudioPlayer:** play/pause, 1x/1.25x/1.5x speed, current time / duration (tabular), a waveform drawn from the MP3
  (wavesurfer.js) in faint ink with the played part in accent. Coaching notes are 2px accent-edge markers above the
  waveform; hovering shows the note in a popover.
- **CoachingNote:** timestamp button ("0:41"), criterion pill, kind pill ("Keep" green tag or "Fix" coral tag), the
  quote in body ink with quotation marks, the note, and "Try: <better line>" in a soft hairline box. Clicking the
  timestamp seeks the player and highlights the transcript line.
- **TranscriptLine:** timestamp, speaker ("You" / "Margaret"), text. Active line: accent-soft fill. Lines with notes
  show a small dot in the left gutter.
- **LeaderboardRow:** rank (tabular, fixed 32px), avatar, name, calls, best-5 average, streak ("6 days"), change vs last
  week (+4 in success ink, -3 in danger ink). Unranked reps sit below a divider with "2 of 3 calls to rank".
- **StreakBadge:** "6 day streak" pill. 0 days shows nothing (no "0 day streak").
- **TrendChart:** 12 week line chart per rubric line (Recharts), 5 series in five tag hues, a legend you can toggle.
  Fixed 240px height. Empty weeks are gaps, not zeros.
- **AssignmentCard / row:** title, persona + scenario + difficulty, due date ("Due Fri"), progress "2 of 3 passed" as a
  meter, pass score.

## 5. Icons

Navigation: Phosphor 17px, regular at rest, duotone in corner blue when selected. Practice (PhoneCall), Sessions
(ListBullets), Assignments (Target), Team (UsersThree), Personas (IdentificationCard), Documentation (BookOpen), Help
(Question), Billing (CreditCard), Settings (Gear). In-content: Lucide 14 to 16px, 1.5 stroke (Phone, PhoneOff, Mic,
MicOff, Play, Pause, RotateCcw, Sparkles for the builder, Lock for plan-gated items).

## 6. App shell

- Left sidebar 240px (56px icons-only under 1100px), white, right hairline. No top bar. Each page has the 48px page
  toolbar.
- Top: logo (wordmark "Sparring", 16px 600, plus a 16px mark: two interlocking rounded squares in accent and ink edge)
  and the workspace switcher (only if the user is in more than one workspace).
- Top group: **Practice, Sessions, Assignments, Team, Personas**. Assignments and Team are hidden on the Solo plan.
- Above the bottom group: MinutesMeter ("212 of 360 min left", period end on hover). Reps see it too.
- Bottom group, always in this order: **Documentation, Help, Billing, Settings**. Billing hidden for non-owners.
- Nav items 32px high, 6px radius. Selected: accent-soft fill, ink label, duotone accent icon.
- Account menu at the very bottom (avatar, name, "Sign out") opening upwards as a menu in a portal.
- During a live call the sidebar stays but every nav item asks "End the call first?" in a dialog, so nobody leaves a
  call by accident.

## 7. Screens

Every screen below follows the system: 48px toolbar, hairlines, no page titles in a top bar (the toolbar holds the
page name at 13px 500 on the left).

### 7.1 Auth (\`/login\`, \`/signup\`, \`/reset\`)

Centred 400px column on white, logo above. Fields 36px. "Continue with Google" (white button, firm edge) above a
hairline "or" divider, then email and password. Sign up asks for full name too. Primary button "Create account" with
the firm edge. Errors under the field in danger ink. Below: "Already have an account? Log in". Right side on desktop
(over 1100px): a quiet 2 line quote "15 minutes a day on Sparring took our new SDRs from 0.8% to 2.4% dial to
meeting." with a footnote "* Example. Replace with a real customer quote." until you have one.

### 7.2 Onboarding (\`/onboarding\`)

One 520px card, opens 10% from the top, 3 steps morphing height (system step morph), width constant. Step dots at
the top.
1. **Your team:** workspace name ("Acme Sales"), timezone (prefilled from the browser), "I am a" radio: Rep,
   Manager, Founder learning to sell. Button "Continue".
2. **Mic check:** "Say 'Hello, this is a practice call'." A 5 bar level meter, the browser permission prompt,
   then "We heard you" in success ink. If blocked: "Your browser blocked the mic. Click the lock icon in the address
   bar, allow Microphone, then try again." with a "Try again" button. Headphones tip: "Use headphones so the prospect
   does not hear itself."
3. **Your first call:** Margaret's PersonaCard pre-selected, Cold call, Normal, the brief, and "Call Margaret". A
   small "Skip, take me to the app" link.
Managers get one extra line on step 3: "You can invite your team after your first call."

### 7.3 Practice (\`/app/practice\`, home)

Toolbar: "Practice", right side: the rep's StreakBadge and "Today: 1 call".
Layout, desktop: two columns. Left (fluid): ScenarioTabs, then the persona grid (PersonaCards, 4 across at 1440,
wraps), "Built-in" and "Your team" groups split by a 28px section label. Right (360px, sticky): DifficultyPicker,
BriefCard (updates in place, reserved height), assignment picker ("Counts towards: Objection drill vs CFO (1 of 3)"
select, only if the rep has active assignments matching this persona and scenario), CallButton, and under it
"Uses up to 5 of your 212 minutes left".
- Empty custom group (managers): dashed "+ New persona" card in the grid.
- Assignment deep link: \`/app/practice?assignment=<id>\` preselects everything.
- Keyboard: arrow keys move between persona cards, Enter selects, C starts the call.

### 7.4 Live call (\`/app/call/[sessionId]\`)

The calmest screen in the app. Centred 560px column.
- Top: persona avatar 56px, name 20px 500, title and company muted, Live tag with the pulsing dot.
- Middle: VoiceOrb, then LiveTimer (48px), then TalkMeter.
- Controls row (fixed widths): Mute (toggle, 36px, MicOff when muted), End call (46px, white, danger ink label,
  firm edge, PhoneOff icon). End asks nothing; it ends.
- Below: "Show transcript" toggle (off by default: real calls have no transcript). When on, a 200px scroll box shows
  live lines from the SDK's message events; the box height is reserved so the controls never move.
- Connecting state (before the first audio): "Ringing Margaret..." with the dot pulsing; the timer shows 0:00 in
  ghost ink. After 10 s without connecting: "Still connecting. Check your mic and network." and a Cancel button.
- Ending state: "Call ended" replaces the Live tag, the orb stops, and the column morphs (height only) into the
  Scoring panel: "Scoring your call" with a live dot and 3 steps (Saving the recording, Reading the transcript,
  Writing your notes) that tick as the session status changes. Typical 30 to 60 s. At 120 s: "Taking longer than
  usual. We will email you when it is ready." and a link to Sessions.
- When scored: navigate to \`/app/sessions/[id]\`. Too short: "That call was under a minute, so there is nothing to
  score yet. Run it again?" with "Call again" and "Back to practice".
- Leaving mid-call (route change or tab close): confirm dialog "End the call? Your minutes stop counting when you
  hang up."

### 7.5 Scorecard (\`/app/sessions/[id]\`)

Toolbar: back arrow "Sessions", the persona and scenario ("Margaret Okafor · Cold call · Normal"), date, and right side
"Run it again" (primary edge) and a menu (Retry scoring, Download recording).
Layout, desktop: two columns.
- **Left (480px):** ScoreTotal; the outcome line; "Top fix" box (hairline, 16px padding, 14px body text); the five
  RubricRows; then the CoachingNotes list in time order.
- **Right (fluid):** AudioPlayer with note markers, then the transcript (TranscriptLines) in a scroll region that fills
  the viewport. Talk ratio pill above the transcript ("You talked 61%. Aim under 45% on discovery.").
- Clicking a note: seeks audio, scrolls the transcript to the line (smooth, or instant with reduced motion),
  highlights it with accent-soft for 1.5 s.
- Manager view of a rep's call: the same, plus the rep's name in the toolbar and "Open rep profile".
- Loading: skeleton blocks at final sizes. Scoring still running: the left column shows the Scoring panel from 7.4.
- Failed: "This call was not scored. Retry scoring" button; the transcript and audio still show.

### 7.6 Sessions (\`/app/sessions\`)

Toolbar: "Sessions", count ("48 calls"), search (persona or outcome text). Filter bar: chips Persona, Scenario,
Difficulty, Score band, and (managers) Rep. "+ Add filter" dashed.
Table: Date (tabular), Rep (managers only), Persona (avatar + name), Scenario, Difficulty, Length ("4:12"),
Score (tag), Outcome (ellipsis). 48px rows, rows rise once on first load. Click opens the scorecard. Footer bar:
paging and "Total practice: 3 h 12 min".
Empty: "No calls yet. Your first one takes about 5 minutes." with "Start practising".

### 7.7 Assignments (\`/app/assignments\`)

- **Rep view:** list of AssignmentCards: active first (due soonest), then done, then closed. Each has "Start drill"
  (deep link to Practice). Overdue shows "Overdue" coral tag. Empty: "No drills from your manager right now. Free
  practice still counts towards your streak."
- **Manager view:** table: Title, Persona, Scenario, Difficulty, Due, Pass score, Progress ("4 of 6 reps done"),
  Status. "New drill" opens a 520px dialog: title, persona select, scenario, difficulty, target calls (1 to 20),
  pass score (slider 0 to 100 in steps of 5, number shown), due date, reps (checkbox list with "All reps"), note to
  the team. Button "Assign to 6 reps" (count in the label, fixed min width). Row click opens a side panel (slides
  24px from the right, overlays the page) with per-rep progress and links to their calls.

### 7.8 Team (\`/app/team\`)

Tabs in the toolbar: Leaderboard, Trends (managers), Members (managers).
- **Leaderboard:** week picker ("This week", previous weeks), LeaderboardRows. A rep sees their own row highlighted
  with accent-soft. Note under the table: "Ranked by the average of your best 5 calls this week. 3 calls to rank."
- **Trends:** rep select (or "Whole team"), TrendChart, then a small table of the last 4 weeks per rubric line.
- **Members:** table: Name, Email, Role (select for the owner), Calls this week, Streak, Last practice, Joined.
  "Invite" opens a dialog: emails (comma separated), role (Rep / Manager, Manager only for the owner), seats line
  "4 of 6 seats used". Pending invites listed with "Revoke".

### 7.9 Rep profile (\`/app/team/[userId]\`)

Header block: avatar, name, role, StreakBadge, longest streak, total calls, total minutes, 30 day average. Then the
TrendChart for this rep, "Weakest line this month" with a tip, and the last 20 calls table.

### 7.10 Personas (\`/app/personas\`, \`/app/personas/new\`, \`/app/personas/[id]\`)

- **Library:** grid of PersonaCards with "Built-in" and "Your team" groups, plan count "3 of 25 custom personas".
  Managers: "New persona" button. Reps see a read-only detail panel (no hidden pains or win conditions; "Your
  manager can see what wins this call").
- **Builder (\`/new\`):** two columns. Left form: "What you sell" (one line), "Who you sell to" (textarea, ICP),
  "Real objections your team hears" (list of inputs, + Add, up to 10), "Their role" (e.g. Head of finance), Tone
  (Warm / Neutral / Cold). Button "Draft persona (1 of 30 builds)". Right: the draft appears in an editable form:
  name, title, company, summary, personality, speaking style, hidden pains (list), objections (list), win conditions
  (list), voice (select of curated voices, each with a play sample button). While drafting: shimmer blocks at final
  sizes for about 15 s, with the label "Drafting the persona". Save: "Save persona".
- **Edit (\`/[id]\`):** the same editor, plus "Test call" (starts a 2 minute call) and "Archive" (sets is_active
  false, dialog confirm).

### 7.11 Billing (\`/app/billing\`, owner only)

Plan card: plan name, price, interval, renewal date, "Manage billing" (Stripe Customer Portal). Usage card: minutes
used this period (meter), persona builds used, seats used, "Resets on 14 Nov". Plan comparison (the three plans,
monthly/annual toggle) with "Switch to Team". Invoices come from the portal, not rebuilt here.

### 7.12 Settings (\`/app/settings\`)

Tabs: Profile (name, timezone, password), Notifications (switches: new drills, drill due tomorrow, call scored,
weekly report), Workspace (owner/manager: name, timezone, weekly report on/off, "What we sell and who we sell to"
summary used as a default in the builder; owner only: danger zone "Delete workspace" with type-to-confirm).

### 7.13 Documentation and Help (\`/app/docs\`, \`/app/help\`)

- **Documentation:** a left index (How a practice call works, The rubric, Scoring bands, Persona tips, Assignments,
  Leaderboard rules, Minutes and plans, Privacy and recordings) and readable 65 character columns at 14px. Each
  rubric line has a "What a 20 sounds like" example.
- **Help:** 8 FAQs in an accordion, then a contact form (topic select, message, "Send to support"), and a status
  line for the voice line and AI scoring ("All systems normal", from a cached check of the last 50 sessions).

### 7.14 Paywall (\`/paywall\`)

Shown when \`has_active_access\` is false. Calm, not shouty: "Your trial has ended" or "Start your 7 day trial",
the three plan cards with the toggle, "Your calls and scores are saved." Owner only sees buttons; others see "Ask
<owner name> to choose a plan."

## 8. States

| State | Rule |
|---|---|
| Empty | One sentence that says what to do, one button. Never an illustration bigger than 64px |
| Loading | Skeletons at final size; spinners only inside buttons, after 200 ms, at least 400 ms |
| Error | What went wrong, then what to do, full stop. Retry button where it makes sense |
| Limit reached | Explains the limit, when it resets, and the next step (owner: "Upgrade"; others: "Ask <owner>") |
| Offline mid-call | "Connection lost. The call ended at 3:12. We will still score what we have." |
| Plan gated | Hidden on Solo (Assignments, Team). Inside pages: a Lock icon and "Team plan" pill with an Upgrade link |

## 9. Motion (Sparring moments, within the system curves)

| Moment | Duration | Movement |
|---|---|---|
| Persona card select | 120 ms | Fill and edge colour only |
| Brief card update | 300 ms | Step morph: height to new content, text fades up 4px after 60 ms |
| Call connecting dot | 1.4 s loop | Pulse (the only loop, with the live dot) |
| VoiceOrb ring | follows audio level, max 1.06 scale, eased 100 ms | Transform only |
| Call to scoring panel | 300 ms | Height morph, width constant |
| Scorecard reveal | 360 ms | Total fades up 6px, then rubric bars fill left to right (each 400 ms morph curve, 60 ms stagger), once per session |
| Note click | 200 ms | Transcript line fill fades in, holds 1.5 s, fades out 400 ms |
| Leaderboard rows | 360 ms | Rise once, 25 ms stagger capped at 270 ms |
| Reduced motion | 0 | End state shown instantly; orb shows a "Speaking" label |

## 10. Accessibility

- Every control reachable by keyboard; visible 2px focus outline with 2px offset.
- Live call: the timer has \`role="timer"\` and \`aria-live="off"\`; announce only "One minute left" and "30 seconds
  left" through a polite live region. End call is focused when the call connects, and Escape does NOT end the call
  (too easy to hit); Escape closes overlays only.
- Transcript lines are a list with the speaker as visible text. Audio player buttons are labelled ("Play", "Pause",
  "Speed 1.25 times").
- Scores always have text ("72 Solid"), never colour alone. Charts have a table alternative below.
- Mic permission errors use \`role="alert"\`.
- Captions: the live transcript toggle doubles as captions for reps who are hard of hearing.

## 11. Mobile

- Practice, live call, scorecard and sessions work at 375px. Sidebar becomes a bottom sheet menu behind a 44px
  button; the live call hides it entirely.
- Practice: persona cards scroll sideways in one row; the right column stacks below.
- Live call: the column is full width with 16px gutters; End call is 46px high and 100% wide, pinned 16px above the
  bottom safe area. A banner on first mobile call: "Use headphones for the best results."
- Scorecard: total, top fix, player, then notes; transcript behind a "Transcript" tab.
- Manager tables scroll sideways with the first column sticky. Check 320, 375 and 430px.

## 12. Marketing surfaces

The landing page follows LANDING.md and the system's marketing rules (1180px rail, square corners, hairlines). The
product visual is a real screenshot of the scorecard with three notes pinned on the waveform.

## 13. Emails (React Email)

600px, white, Geist with system fallbacks, 16px body, one white button with an ink edge (email clients cannot do
the firm edge exactly; use a 1px #08090a border). Logo top left. Footer: workspace name, "You get this because you
are on Acme Sales on Sparring", unsubscribe link (per kind). Weekly report: the four numbers in a 2 x 2 grid
(tabular), the top 5 table, then short sections from PRD section 16. No images except the logo.

## 14. Component states

| Component | Default | Hover | Active / selected | Disabled | Loading |
|---|---|---|---|---|---|
| CallButton | white, firm edge | hover fill | press 98% | ghost label, reason line below, same width | spinner over the label after 200 ms, label stays |
| PersonaCard | hairline | row hover fill | accent-soft + accent-edge | 60% opacity, "Archived" pill | skeleton at 160 x 196 |
| DifficultyPicker pill | hairline | hover fill | accent-soft + accent-edge | n/a | n/a |
| RubricRow bar | divider track | n/a | accent fill | n/a | track only |
| CoachingNote | hairline | row hover | accent-soft while its moment plays | n/a | skeleton 3 lines |
| Invite button | firm edge | hover | press | "6 of 6 seats used" below | spinner over label |

## 15. Microcopy

| Moment | Copy |
|---|---|
| Call button | Call Margaret |
| Call button, out of minutes (owner) | Out of practice minutes until 14 Nov. Upgrade for more. |
| Call button, out of minutes (rep) | Out of practice minutes until 14 Nov. Ask Sam to upgrade. |
| Call button, already on a call | You are already on a call. Open it |
| Connecting | Ringing Margaret... |
| Voice line busy (502) | The practice line is busy. Try again in a minute. |
| Mic blocked | Your browser blocked the mic. Click the lock icon in the address bar, allow Microphone, then try again. |
| Persona hung up | Margaret hung up at 0:41. |
| Time cap | Time is up. The call ended at 5:00. |
| Too short | That call was under a minute, so there is nothing to score yet. |
| Scoring | Scoring your call |
| Scoring slow | Taking longer than usual. We will email you when it is ready. |
| Scoring failed | This call was not scored. Retry scoring |
| 80% email subject | Acme Sales has used 80% of this month's practice minutes |
| 100% email subject | Acme Sales is out of practice minutes until 14 Nov |
| Builds exhausted | You have used all 30 persona drafts this month. They reset on 14 Nov. |
| Persona limit | You have 25 of 25 custom personas. Archive one or upgrade to Floor. |
| Seat limit | All 6 seats are in use. Remove someone or upgrade to Floor. |
| Toast: drill assigned | Drill assigned to 6 reps |
| Toast: invite sent | Invite sent |
| Toast: persona saved | Persona saved |
| Leaderboard unranked | 2 of 3 calls to rank |
| No access to a call | You do not have access to this call. |

## 16. Wireframes (desktop, 1440px)

Boxes are 6px radius hairline boxes; the left column in each is the 240px sidebar.

### 16.1 Practice

\`\`\`
+----------+-------------------------------------------------------------------------------+
| Sparring | Practice                                          6 day streak   Today: 1 call |
|          +-----------------------------------------------------+-------------------------+
| Practice | [ Cold call | Discovery | Objection drill ]          | Difficulty              |
| Sessions |                                                     | ( Easy )(Normal)( Hard ) |
| Assign.  | Built-in                                            | Busy and neutral. 3     |
| Team     | +--------+ +--------+ +--------+                     | objections.             |
| Personas | |  MO    | |  DM    | |  PS    |                     +-------------------------+
|          | |Margaret| |Dev     | |Priya   |                     | Brief                   |
|          | |CFO     | |Founder | |EA      |                     | Margaret Okafor, CFO at |
|          | +--------+ +--------+ +--------+                     | Northfield Logistics.   |
|          | Your team                                           | Goal: book a meeting.   |
|          | +--------+ +- - - - -+                              | You have 5 minutes.     |
|          | |  HF    | | + New   |                              +-------------------------+
|          | |Head fin| | persona |                              | Counts towards: [none v]|
|          | +--------+ +- - - - -+                              | [ Call Margaret       ] |
| 212/360  |                                                     | Uses up to 5 of your    |
| Docs     |                                                     | 212 minutes left        |
| Help     |                                                     |                         |
| Billing  |                                                     |                         |
| Settings |                                                     |                         |
+----------+-----------------------------------------------------+-------------------------+
\`\`\`

### 16.2 Live call

\`\`\`
+----------+-------------------------------------------------------------------------------+
| (nav)    | Call with Margaret Okafor                                                     |
|          +-------------------------------------------------------------------------------+
|          |                        (MO)  Margaret Okafor                                  |
|          |                        CFO, Northfield Logistics   * Live                     |
|          |                                                                               |
|          |                               (   orb   )                                     |
|          |                                                                               |
|          |                              2:14  / 5:00                                     |
|          |                   You 46% [=========|==========] Margaret 54%                 |
|          |                                                                               |
|          |                        [ Mute ]   [  End call  ]                              |
|          |                                                                               |
|          |                        Show transcript  ( )                                   |
|          |                   +-----------------------------------+  (reserved 200px)    |
|          |                   |                                   |                       |
|          |                   +-----------------------------------+                       |
+----------+-------------------------------------------------------------------------------+
\`\`\`

### 16.3 Scorecard

\`\`\`
+----------+-------------------------------------------------------------------------------+
| (nav)    | < Sessions  Margaret Okafor . Cold call . Normal  18 Oct   [Run it again] [..] |
|          +-------------------------------+-----------------------------------------------+
|          | 72 / 100   [Solid]            | [>] 0:41 / 4:12  1x   |~~^~~~~^~~~~~~^~~~~~~|  |
|          | Booked Thursday 10am          | You talked 61%. Aim under 45% on discovery.   |
|          | +---------------------------+ | 0:00 Margaret  Margaret Okafor.               |
|          | | Top fix: ask for a time,  | | 0:03 You       Hi Margaret, it's Sam from ... |
|          | | not "a quick chat".       | | 0:12 Margaret  Is this a sales call?          |
|          | +---------------------------+ | 0:14 You     * Yes, it's a cold call. Can I...|
|          | Opener          [=====  ] 16  | ...                                           |
|          | Permission      [====   ] 14  |                                               |
|          | Pain discovery  [===    ] 11  |                                               |
|          | Objections      [====   ] 13  |                                               |
|          | Next step       [====== ] 18  |                                               |
|          | 0:14 [Permission] [Keep] "Yes, it's a cold call..." Nice and honest.          |
|          | 1:52 [Discovery]  [Fix]  "So you'd want..."  Try: "What does that cost you?"  |
+----------+-------------------------------+-----------------------------------------------+
\`\`\`

### 16.4 Team leaderboard

\`\`\`
+----------+-------------------------------------------------------------------------------+
| (nav)    | Team   [Leaderboard] Trends  Members                         This week  v    |
|          +-------------------------------------------------------------------------------+
|          |  #  Rep              Calls   Best-5 avg   Streak     vs last week             |
|          |  1  (JL) Jo Lane        9       81.4      6 days        +4                    |
|          |  2  (RA) Ravi Anand     7       77.0      3 days        +9                    |
|          |  3  (SK) Sam Kerr       4       70.5      1 day         -2                    |
|          |  ---------------------------------------------------------------------------  |
|          |     (MB) Mia Brook      2       2 of 3 calls to rank                          |
|          |  Ranked by the average of your best 5 calls this week. 3 calls to rank.       |
+----------+-------------------------------------------------------------------------------+
\`\`\`

### 16.5 Invite accept (\`/invite/[token]\`)

Centred 400px card: team name (20px 500), "Sam Kerr invited you to practise cold calls with Acme Sales as a Rep.",
then "Join Acme Sales" (firm edge) if signed in with the invited email, or "Create an account to join" otherwise.
Wrong email signed in: "This invite is for jo@acme.com. Sign out and use that email." Expired: "This invite has
expired. Ask Sam for a new one."

## 17. Hand-off checklist for Claude Code

- [ ] Tokens from DESIGN_SYSTEM.md section 11 in \`app/globals.css\`, with \`--blue\`, \`--blue-soft\`, \`--blue-edge\` replaced by
      the corner blue values in section 2 (keep the variable names \`--accent*\` and alias the system names to them).
- [ ] shadcn/ui themed: white buttons with \`--btn-edge\`, primary with ink edge, 6px radius, 36px height, no fills.
- [ ] Phosphor for nav, Lucide in content. Never both in one row.
- [ ] Every number that changes uses \`tabular-nums\`: timer, meters, scores, counts.
- [ ] Live call screen: reserved heights for transcript box, status line and scoring panel; no element moves when
      the timer or talk meter updates.
- [ ] Scorecard reveal plays once per session (sessionStorage flag per scorecard id).
- [ ] Reduced motion tested on the orb, scorecard reveal and leaderboard.
- [ ] Screenshots at 320, 375, 430, 768, 1100 and 1440 for Practice, Live call, Scorecard and Team.
`
