// Conversate design PRD (DESIGN.md). Builds on QUIET_PRECISION.md (DESIGN_SYSTEM.md).

export const designPrd = `# Conversate: design PRD

Version 1.0, October 2026. Save as \`DESIGN.md\` in the project root next to \`DESIGN_SYSTEM.md\`.

**This file builds on Quiet Precision (\`DESIGN_SYSTEM.md\`).** Every rule there still applies: white
surfaces, 1px hairlines, Geist 400/500/600, 13px app text, 6px boxes, 4px pills, white buttons with a
firm edge (no filled or black buttons, anywhere, including the widget's send button), one easing pair,
and the stability rules. This file only adds what is specific to Conversate: the brand accent, the
widget, and every product screen. Where the two disagree, this file wins only for the accent and
product-specific screens.

Add to CLAUDE.md:
\`\`\`
UI rules: @DESIGN_SYSTEM.md @DESIGN.md
\`\`\`

## 1. Brand

- **Name:** Conversate. **Wordmark:** "conversate" in Geist 600, 16px in the app, tracking -0.02em, ink.
  Mark: two overlapping 6px-radius speech boxes drawn in 1.5px strokes, the front one with a lagoon soft fill.
- **Personality:** calm, exact, a little warm. It is the help desk that never panics.
- **Voice:** sentence case, plain verbs, numbers over adjectives. "18 articles drafted" not "Your amazing
  help centre is ready!".
- **Illustration:** none in the app. On empty states use a single Lucide icon at 16px in faint ink inside
  a 32px hairline box. Marketing uses product screenshots only.

## 2. Brand accent: Lagoon

Conversate swaps Quiet Precision's blue for a slightly greener pastel blue, still soft fill plus edge.

| Token | Hex | Use |
|---|---|---|
| \`--accent\` | \`#3c8fb0\` | Selected nav icon (duotone), focus-adjacent marks, progress fill, live dot |
| \`--accent-soft\` | \`#eef6f9\` | Selected row and nav fill, active tab underline area, AI message edge tint |
| \`--accent-edge\` | \`#bcdce8\` | Selected borders, primary button edge on brand surfaces, chips |
| \`--accent-ink\` | \`#1f5d75\` | Text on accent-soft (selected nav label, accent pill text) |

Rules:
- The accent marks "selected" and "in progress" only. Never a big area, never a filled button.
- Status hues come from Quiet Precision (success, warning, danger) as tag pills: 6 to 9% fill, darker edge,
  readable ink.
- Conversation status pills (fixed hues): Open = accent, Pending = warning, Snoozed = violet tag hue,
  Closed = neutral grey. Mode pill: AI = accent outline, Human = success outline.
- Confidence pills: High (0.75+) success, Medium (0.55 to 0.74) warning, Low (under 0.55) danger. Text
  "High 0.82", tabular numbers.

Add to the Quiet Precision tokens:

\`\`\`css
:root {
  --accent: #3c8fb0; --accent-soft: #eef6f9; --accent-edge: #bcdce8; --accent-ink: #1f5d75;
  /* inbox-specific */
  --note-edge: #f0dcae;   /* internal note left edge, warning hue at low strength */
  --note-soft: #fdf9ef;   /* internal note fill */
  --pane-list: 340px;     /* inbox list pane */
  --pane-details: 300px;  /* inbox details pane */
  /* widget defaults (overridden per workspace by --cv-brand) */
  --cv-brand: #3c8fb0;
}
\`\`\`

## 3. App shell and sidebar

- Sidebar 240px (56px icon-only under 1100px), white, right hairline. No top bar. Each page has a 48px
  toolbar instead (search, counts, actions), bottom hairline.
- **Top:** 48px row with the mark + "conversate" wordmark, then the workspace switcher (workspace name,
  12px faint plan label "Growth", chevron, opens a menu in a portal with workspaces you belong to and
  "Create workspace" disabled with "* One workspace per account in v1").
- **Core group** (32px items, 17px Phosphor icons, regular at rest, duotone in accent when selected):
  Inbox (count badge), Help Centre, Knowledge (gap count badge), Widget (dot until installed),
  Analytics, Team.
- **Usage meter** above the bottom group: label "AI answers", value "1,204 / 1,500" in tabular numbers,
  a 4px meter (accent, amber under 20% left, coral under 5% left). Fixed height 44px. Hover: tooltip with
  suggested replies and pages too. Clicking opens Billing (owner) or does nothing (others).
- **Bottom group** (always this order): Documentation, Help, Billing (owner only, trial pill "4 days left"),
  Settings. Then the user row: avatar 24px, name, menu (Profile, Notifications, Log out).
- Counts in badges are fixed-width (min 24px, tabular) so 9 to 10 never shifts the label.
- Selected item: accent-soft fill, accent-ink label at 500, accent duotone icon. Hover: \`--hover\` fill.

## 4. Auth screens

Layout for \`/login\`, \`/signup\`, \`/forgot\`, \`/reset\`, \`/invite/[token]\`: white page, centred column
360px wide at 18% from the top, mark + wordmark, H2 (24px) title, 13px muted subtitle, form, footer link.

| Screen | Title | Subtitle | Fields | Primary button | Footer |
|---|---|---|---|---|---|
| Sign up | Start your 7-day trial | Your help centre can be live before lunch. | Name, Work email, Password (8+ chars, strength meter 3 segments) | Create account | Already have an account? Log in |
| Log in | Log in to Conversate | | Email, Password | Log in | Forgot password? · New here? Start a trial |
| Forgot | Reset your password | We will email you a link. | Email | Send reset link | Back to log in |
| Reset | Choose a new password | | Password, Confirm | Save password | |
| Invite | Join {workspace} | {inviter} invited you as {role}. | Sign up or log in tabs (email locked to the invited address) | Accept and join | Wrong account? Log out |

- "Continue with Google" is a secondary button above the form with a hairline divider "or".
- Errors sit under the field in danger ink with \`role=alert\`: "That email already has an account. Log in instead."
- Buttons keep their label while loading; the spinner overlays after 200ms and stays at least 400ms.
- Invite with an expired token: same layout, title "This invite has expired", text "Ask {inviter} to send a
  new one.", no form.

## 5. Onboarding (\`/onboarding\`)

One dialog-like card, 560px wide, opens at 10% from the top, on a white page with the wordmark top left
and "Step 3 of 6" top right (tabular). The card morphs height between steps (300ms morph curve), content
fades up 4px after 60ms. Width never changes. Back (secondary) bottom left, Continue (primary) bottom right.

| Step | Heading | Body |
|---|---|---|
| 1 | Tell us about your company | Company name. Help centre address: a 36px input with a fixed prefix "conversate.app/" in faint ink and the slug; live check line below reserved 18px high: "Available" (success) or "Taken. Try acme-help." |
| 2 | Where is your website? | Website URL (placeholder https://acme.com), Support email. Hint: "We will read up to 150 pages during your trial. Only public pages." |
| 3 | What do you sell? | Textarea (3 rows, 600 chars, counter "84 / 600"), segmented control: SaaS, Online store, Agency, Other |
| 4 | How should your assistant sound? | 2 x 2 cards (Friendly, Professional, Playful, Concise), each with a 2-line sample answer to "Can I get a refund?". Selected card: accent-soft fill + accent-edge |
| 5 | What do customers ask most? | 8 rows of inputs; first 5 pre-filled from suggestions with a faint "Suggested" tag; "+ Add question" dashed button |
| 6 | Build your help centre | Big status list (below) then results |

**Step 6 build view:**
- A list of 5 lines, each 36px: status icon (16px box: hollow ring = waiting, pulsing accent dot = live,
  check in success = done), label, and a right-aligned tabular count ("42 pages"). Lines never reorder.
- Under the list, a 4px progress meter across the card, width eased with the morph curve.
- Reserve 18px below for the sub-status ("Reading /pricing") so nothing jumps.
- Done state: the list collapses (height morph) into a result: "18 articles drafted in 6 categories",
  a 6-row preview table (title, category, words), buttons: "Review articles" (secondary) and
  "Publish all 18 articles" (primary). After publishing: "Install the widget" (primary) leads to
  /app/widget?tab=install with a one-time accent-soft banner "Your help centre is live at
  conversate.app/acme/help".
- Failure state: the failing line shows a danger dot and "We could not read acme.com". Below:
  "Paste up to 10 page links instead" textarea and buttons "Try these pages" and "Skip, I will write articles".

## 6. Inbox (\`/app/inbox\`)

Three panes inside the content area, split by hairlines. List 340px, thread flexible (min 480px),
details 300px (collapsible with a toolbar button; collapsing overlays, it does not reflow under 1280px).

### 6.1 Toolbar (48px)
Search input 240px (searches subject, visitor email and message text), view name and count
"Unassigned · 12", right side: "Assign to me" (compact), "Filters" menu (tags, assignee, channel, date).

### 6.2 List pane
- Views list at the top as a vertical list of 32px rows (Mine, Unassigned, All open, AI handling,
  Pending, Snoozed, Flagged, Low confidence, Closed), each with a fixed-width tabular count.
- Conversation rows 64px (two lines, an exception to the 48px table row because it is a list, keep it
  fixed): line 1 visitor name or email (500), right-aligned relative time ("4m", tabular); line 2 last
  message preview in muted, ellipsis. Right edge icons (14px Lucide, fixed slots so they never shift):
  flag, low-confidence triangle, assignee avatar 18px. Unread: 6px accent dot left of the name.
- Selected row: accent-soft fill and a 2px accent-edge left inset. Hover: \`--row-hover\`.
- New conversations rise into place once (360ms, 6px). Refetches never re-animate rows.
- Empty: "Nothing here. The AI is handling every chat right now." with a link "See AI conversations".

### 6.3 Thread pane
- Header 48px: subject (ellipsis), status pill, mode pill, then actions (Assign, Status menu, Snooze,
  Close, more: Flag, Hand back to AI, Delete for admins). Action buttons have fixed min widths.
- Messages, max width 640px, 16px gap:
  - Visitor: left, white box with hairline, 6px radius, body ink.
  - AI: left, white box with accent-edge border, a 12px "AI" tag pill, under it source chips (4px pills,
    hairline, 12px, max 3 then "+2") and the confidence pill. Low confidence: danger-tinted pill
    and the hidden draft answer shown faint with "Not shown to visitor".
  - Agent: right, white box with \`--btn-edge\` border, name and avatar above in faint.
  - Note: full width, \`--note-soft\` fill, 2px \`--note-edge\` left edge, "Note · only your team sees this".
  - System: centred 12px faint ("Visitor asked for a human · 14:02").
- Composer pinned at the bottom: tabs "Reply" and "Note" (underline tab style), textarea min 88px max
  240px, toolbar: attach (paperclip), canned replies (/), "Suggest reply" (secondary, sparkle icon),
  and Send (primary, white with firm edge, label "Send", shortcut hint "Cmd Enter" in faint).
  Note tab switches the composer background to \`--note-soft\` and the button label to "Add note".
- Suggest reply loading: the composer shows a 3-line skeleton in place (same height as the draft
  area), the button keeps its width with a spinner overlay. Result fills the textarea; a 12px line under
  it lists "Missing: order number" in warning ink when \`missing_info\` is not empty.
- Typing indicator for the visitor: a 13px faint line "Visitor is typing" reserved at 18px height above
  the composer (visibility hidden when not typing).

### 6.4 Details pane
Sections with 28px faint labels: Visitor (name, email inline-edit, last seen "2m ago", page, country),
Conversation (created, channel, first response, AI answers), Tags (pills + "+ Add tag" dashed), CSAT
(5 faces as numbers 1 to 5, the given one highlighted), Previous conversations (5 rows), Sources used.

### 6.5 Inbox states
| State | Look |
|---|---|
| Loading list | 8 skeleton rows at 64px, no shimmer loop (static faint blocks), after 200ms |
| Loading thread | header real, 4 message skeletons |
| Realtime disconnected | 32px warning strip under the toolbar "Live updates paused. Reconnecting." with a pulsing dot |
| Send failed | the message stays in the thread at 60% opacity with "Not sent. Retry" in danger ink |
| Visitor left | small faint line under the last agent message: "Visitor left the chat. We will email this reply in 2 minutes." |
| No access (paused) | thread read-only, composer replaced by "Your workspace is paused. Ask the owner to reactivate." |

## 7. Help Centre admin (\`/app/help-centre\`)

- Toolbar: search, "18 articles", status filter chips (All, Draft, Published, Archived), "New article" (primary).
- Filter bar 44px: category chips across the top ("Billing +2"), "+ Add filter" dashed.
- Table: 36px header, 48px rows, fixed columns: Title (flex, ellipsis), Category 160px, Status 96px pill,
  AI 48px (a 12px "AI" tag if drafted), Views 72px (tabular), Helpful 88px ("92%"), Updated 112px.
- Row selection checkboxes (2px radius). Selection bar floats 16px above the bottom: "3 selected" (fixed
  width), Publish, Unpublish, Move to category, Archive. Each action has a min width.
- Top banner after onboarding: accent-soft, "18 drafts are waiting. Review and publish them so the AI can
  use them." Button "Publish all".

**Article editor** (\`/app/help-centre/articles/[id]\`): two columns. Left: title input (20px, 500),
summary (2 rows), Markdown editor with a toolbar (H2, bold, list, numbered list, link, image upload to
attachments) and a Write / Preview tab. Right 300px: Status select, Category select, Slug input with the
full public URL below (copy button), "Sources" list (crawled pages it was written from, open in new tab),
"Gaps" list in warning ink if the writer left "[Fill in: ...]" placeholders, and Save (primary).
Autosave every 5 seconds into local state and save on blur; the toolbar shows "Saved" or "Saving" in a
fixed 64px slot.

**Categories** page: list of 48px rows with drag handles (reorder), icon picker (8 Lucide icons), name,
description, article count. "+ New category" dashed row at the bottom.

## 8. Knowledge (\`/app/knowledge\`)

Tabs: Sources, Pages, Content gaps, Test the AI.

- **Sources:** table (URL, Status pill with live dot when crawling, Pages "42 / 150", Chunks, Last crawled,
  actions Re-crawl and Delete). "Add source" dialog: URL, kind (Website, Sitemap, Single page), include
  and exclude paths as chip inputs ("/docs/*"), page limit (number, max shown "of 300 on Starter").
  Crawling rows show "Reading 42%" with a pulsing dot (the only loop on the page).
- **Pages:** table of crawled pages (title, URL, status, chunks, words, crawled), side panel on click
  (slides 24px from the right over the page) with the cleaned markdown and "Draft article from this page".
- **Content gaps:** table sorted by times asked: question, times asked (tabular), last asked, status,
  action "Draft article (1 draft)". Clicking a row opens a side panel with the example conversations.
  Empty: "No gaps yet. When visitors ask something your help centre does not cover, it shows up here."
- **Test the AI:** left: the real widget panel component at 380 x 600 in preview mode (calls
  widget-message with an in-app preview token, not counted as an AI answer up to 50 a day). Right:
  "Why this answer" panel showing the retrieved chunks with similarity bars (tabular 0.81), the model
  confidence, final confidence and the threshold line.

## 9. Widget settings (\`/app/widget\`)

Two columns: settings left (max 560px), live preview right (sticky, 380 x 640, on a faint checkerboard
of the customer's site screenshot replaced by a plain hairline frame labelled "Preview").

Tabs:
- **Branding:** Icon upload (drop zone 96px, dashed, PNG/JPG/WebP/SVG up to 1 MB, square crop dialog),
  Brand colour (hex input + 10 swatches + native picker; contrast line "Text on this colour: dark ink,
  contrast 7.1:1" reserved 18px), Greeting (240 chars), Bot name, Avatar upload (circle crop), Launcher
  label (24 chars), Position (segmented Bottom right / Bottom left), Office hours (timezone select, a
  7-row grid of day toggles with from/to time inputs), Offline message.
  Every change updates the preview within 100ms, no save needed for the preview; "Save changes"
  (primary) in a sticky 48px footer bar with "Unsaved changes" text in a fixed slot.
- **Install:** the snippet in a code box (the one place a monospace font is allowed is inside code boxes:
  use Geist Mono, 12px) with "Copy snippet" (secondary). Status pill: "Waiting for first visitor"
  (faint, pulsing dot) or "Live on acme.com · 2m ago" (success). Platform tabs (Plain HTML, Webflow,
  WordPress, Shopify, Framer, Next.js), each a numbered list of 3 to 5 steps with the exact click path
  in bold UI labels (copy from PRD section 11.5). "Send these steps to my developer" opens a mailto.
- **Domains:** table of allowed domains with delete, input "Add domain" (validates as you type, accepts
  \`acme.com\`, \`*.acme.com\`, \`localhost\`), helper text "Your widget only works on these sites."
  Public key row with "Rotate key" (danger, confirm dialog morphs: "Rotating breaks the widget until you
  update the snippet. Rotate key" then shows the new snippet).
- **Behaviour:** Confidence threshold slider 0.30 to 0.90 with marks (Cautious 0.70, Balanced 0.55,
  Bold 0.40) and live text "At 0.55, 82% of last week's answers would have been shown." Email capture
  (Never, When asking for a human, Before the first message), suggested questions (3 inputs), "Show
  Powered by Conversate" switch (disabled with "* Growth and Scale" footnote on Starter).

## 10. Analytics (\`/app/analytics\`)

- Toolbar: range chips (7d, 30d, 90d, Custom), "Export CSV" (secondary).
- 4 stat tiles in a row (each 112px high, fixed): label (faint), big number 32px 500 tabular, delta line
  12px ("+12% vs previous" in success or danger). Tiles: Conversations, AI resolution rate, Median first
  response ("4m 12s"), CSAT ("4.6 · 83 ratings").
- Charts (Recharts, hairline axes, no gridlines except a faint baseline, 13px labels): stacked bars per
  day (AI resolved = accent, Handed off = warning tag hue, Human only = neutral ink at 40%), line of AI
  resolution rate per week (accent, 1.5px). Tooltips in a floating menu style.
- Tables: Top questions, Lowest rated, Agents. Empty range: "No conversations in this range."

## 11. Team (\`/app/team\`)

- Toolbar: "5 of 10 seats" (tabular, fixed width), "Invite people" (primary, owner/admin only).
- Members table: avatar + name, email, role (select for owner/admin, read-only pill otherwise; owner
  row has no select), joined, last active, remove (icon button with confirm).
- Pending invites table: email, role, sent, expires, Resend, Revoke.
- Invite dialog (520px, 10% from top): emails (chip input, up to 10), role segmented (Agent, Admin; Admin
  disabled for admins), message preview. Seats line reserved: "This uses 2 of your 5 free seats."
  Over the limit: the line turns danger "You have 1 seat left. Upgrade to Scale for 25." and the button
  label changes to "Upgrade plan" (same width).

## 12. Billing (\`/app/billing\`, owner)

- Current plan card: plan name (20px), price "$129 / month" or "$1,290 / year", status pill (Trial ends
  Oct 24 / Active / Past due), renewal date, "Manage billing" (secondary, opens Stripe Customer Portal).
- Usage: 4 meters (AI answers, Suggested replies, Article drafts, Crawled pages) with "1,204 of 1,500 ·
  resets Nov 1".
- Plans: monthly/annual segmented toggle ("Annual · 2 months free"), three plan cards (Starter, Growth
  marked "Most popular" with an accent-edge border, Scale). Current plan button: "Current plan"
  (disabled). Others: "Switch to Growth" (primary). Prices tabular; toggling never changes card height
  (annual shows "$1,290 / year" and a faint "$107.50 / month" line that is always reserved).
- Members (not owner) visiting /app/billing see: "Only the owner can change billing."

## 13. Settings (\`/app/settings\`)

Tabs as a vertical list on the left (200px): Profile, Notifications, Workspace, Canned replies, Tags, Danger zone.
- Profile: name, avatar, email (read-only), change password.
- Notifications: email switches per kind (Handoff, Low confidence, Flagged, Assigned, Visitor replies,
  Digest), "Pause all email for 1 day".
- Workspace (owner/admin): name, help centre address (read-only after onboarding with "* Contact support
  to change"), website, support email, tone, help centre on/off switch.
- Canned replies: table (title, shortcut "/refund", updated, actions), editor dialog with variables
  helper \`{visitor_first_name}\`, \`{agent_first_name}\`, \`{workspace_name}\`.
- Tags: list with hue swatches (8 tag hues), rename, merge, delete.
- Danger zone (owner): "Delete workspace" with type-the-slug confirm in a morphing dialog.

## 14. Paywall (\`/paywall\`)

Centred 560px column: H2 "Your trial has ended" or "Your subscription is paused", a line with the
numbers ("Conversate answered 412 questions for Acme"), the three plan cards from Billing, "Your widget
shows the offline form until you choose a plan." Members see "Ask {owner name} to pick a plan." only.

## 15. Public help centre (\`/[slug]/help\`)

Customer-facing, so it uses the workspace brand (\`--cv-brand\`) as accent in place of Lagoon, with the same
neutrals and type. Marketing-style rules: content rail 960px max, square-ish (6px radius is fine, it is a
product surface), white.

- Header 56px: workspace icon + name + "Help centre", right "Back to {website host}" link and "Contact us"
  (opens the widget).
- Hero: H1 35px "How can we help?", search input 46px (large control), placeholder "Search articles".
  Suggest-as-you-type menu (portal) after 2 characters with the top 5 titles.
- Categories grid: 3 columns (2 under 900px, 1 under 560px), cards with hairline, 6px radius, 16px icon in
  a 32px box tinted with brand soft fill, name 16px 500, description, "12 articles".
- Popular articles: list of 6 rows with chevrons.
- Article page: breadcrumb (Help centre / Billing), H1, summary in muted, "Updated 3 days ago", body
  max 65ch, headings H2/H3 from the scale, code boxes, images 6px radius with hairline. Right rail (240px,
  hidden under 1100px): "On this page" heading links. Bottom: "Was this helpful?" with Yes / No buttons
  (secondary), after a vote: "Thanks for telling us" (same height). "Still need help? Chat with us" card.
- Search page: results list with title, category, snippet with the match in 500 weight.
- 404: "We could not find that article." with search.

## 16. The widget (visitor side)

The widget sits on customer sites, so it must look good on any page while keeping every Quiet Precision
rule. It takes the customer's brand colour as \`--cv-brand\` and derives:
- \`--cv-brand-soft\`: the brand colour at 8% over white.
- \`--cv-brand-edge\`: the brand colour at 35% over white.
- \`--cv-brand-ink\`: the brand colour darkened until contrast with white is 4.5:1 or more.
All widget buttons, including Send, are white with a firm edge (\`--btn-edge\`, or \`--cv-brand-edge\` for the
primary). No filled buttons, no solid brand blocks.

### 16.1 Launcher
- 52px tall pill (4px radius would look like a tag, so the launcher is a 6px box), white, 1px
  \`--cv-brand-edge\` border, shadow-float, 16px from the edges (bottom right or left). Contents: the
  workspace icon 24px (or a chat Lucide icon in \`--cv-brand-ink\`) and the launcher label ("Help") 13px 500.
- Unread: an 18px count badge (white, brand-edge, tabular) at the top corner. Hover: \`--cv-brand-soft\` fill.
- Open state: the label swaps to "Close" with an X icon; the box keeps its width (min-width set from the
  longer label).

### 16.2 Panel
- 380 x 640 desktop (max height: viewport minus 96px), full screen under 480px with a 48px header and a
  safe-area-aware composer. White, hairline border, 6px radius, shadow-float. Opens with the dialog
  motion (220ms, rise 8px, scale from 98.5%) from the launcher corner.
- **Header** (56px): avatar 28px, bot name 13px 500, status line 12px faint: "Usually replies in a few
  minutes" (office hours open) or "Back tomorrow at 9:00" (closed). Right: minimise button (icon, labelled).
- **Welcome state:** greeting as an assistant message, then up to 3 suggested questions as full-width
  secondary buttons (left aligned text, 36px), then a "Search the help centre" row linking to /help.
- **Messages:**
  - Visitor: right aligned, \`--cv-brand-soft\` fill, 1px \`--cv-brand-edge\`, ink text, 6px radius, max 80% width.
  - Assistant (AI): left, white with hairline, ink text, markdown (lists, bold, links underlined in
    \`--cv-brand-ink\`). Under it, source links as 4px pills (hairline, 12px, max 3): "Changing plans".
  - Agent: left, white with \`--btn-edge\`, the agent's avatar 20px and first name above in 12px faint.
  - System: centred 12px faint.
  - Time stamps on hover only (no layout change: they sit in reserved 16px space below each group).
- **Thinking:** a 3-dot indicator in an assistant-style box, dots fade in sequence (1.4s loop; the only
  loop in the widget), appears after 300ms so fast answers never flash it.
- **Not sure card:** replaces the answer when needs_human: white box with warning-tint edge, text "I am
  not sure about this one, and I would rather not guess.", buttons "Talk to a human" (primary) and "Ask
  another way" (secondary).
- **Handoff card:** if no email known and email capture is on: "Where should we reply if you leave?"
  email input + "Send to the team" (primary). After: "Done. The team usually replies within 10 minutes.
  We will also email you at sam@x.com." Height reserved from the start so the thread does not jump.
- **Live agent:** a 28px strip under the header "Sam from Acme joined" (success dot) when mode becomes
  human. Typing line "Sam is typing" reserved above the composer.
- **CSAT card** when the conversation closes: "How did we do?" 5 buttons 1 to 5 (36px squares, secondary),
  optional comment, "Send" (primary). After: "Thanks, that helps."
- **Cap reached / paused:** composer replaced by the offline message, email input and "Send message".
- **Composer** (56px min, grows to 120px): textarea "Ask a question", Send button (secondary-primary:
  white, \`--cv-brand-edge\` firm edge, arrow-up icon in \`--cv-brand-ink\`, 32px square, labelled
  "Send message"). Disabled while empty (ghost ink). Enter sends, Shift + Enter new line.
- **Footer:** 24px "Powered by Conversate" (12px faint, link) unless the plan removes it.
- **Errors:** "Could not send. Check your connection and try again." inline under the message with Retry.
- **Rate limited:** "You are sending messages quickly. Try again in 40 seconds." with a countdown in tabular numbers.

### 16.3 Widget accessibility
- Launcher is a \`button\` with \`aria-expanded\` and \`aria-controls\`. The panel is \`role=dialog\`
  \`aria-label="Chat with {workspace}"\`, focus moves to the composer on open and back to the launcher on
  close. Escape closes. The message list is \`role=log aria-live=polite\`.
- Respects \`prefers-reduced-motion\` (no rise, no dots animation: show "Thinking").
- Works at 320px wide. Text never under 12px. Contrast checked against the brand colour derivations.

## 17. Empty, loading and error states (catalogue)

| Screen | Empty | Loading | Error |
|---|---|---|---|
| Inbox list | "Nothing here. The AI is handling every chat right now." | 8 skeleton rows | "Could not load conversations. Retry" |
| Help Centre table | "No articles yet. Draft them from your website or write one." + "Add source" | 6 skeleton rows | same pattern |
| Knowledge sources | "Add your website and we will read it for you." | skeleton rows | Row-level: failed pill + error text + "Retry" |
| Content gaps | "No gaps yet." (see section 8) | skeleton | |
| Analytics | "No conversations in this range." | tiles show skeleton blocks of the same size | "Could not load analytics. Retry" |
| Team | Only you: "Invite your team so you can share the inbox." | skeleton | |
| Widget install | "Waiting for first visitor" pill | | "Your site loaded the widget but acme.co is not an allowed domain. Add it" |
| Public help centre | "This help centre is being set up. Check back soon." | server rendered | 404 page |

Loading rule for every screen: spinners and skeletons wait 200ms before showing and stay at least 400ms.
Skeletons are static faint blocks with the exact size of the real content.

## 18. Toasts and confirmations

Bottom left, 4 seconds, max four, no full stop. Examples: "Reply sent", "Note added", "Assigned to Sam",
"Snoozed until tomorrow 9:00", "Article published", "18 articles published", "Snippet copied",
"Invite sent to sam@acme.com", "Key rotated", "Settings saved". Undo where it is cheap: "Conversation
closed · Undo".

Destructive confirms morph inside one dialog (never a second dialog): "Delete source? This removes 42
pages and 380 chunks. The AI will stop using them." Buttons: "Cancel" and "Delete source" (danger edge).

## 19. Motion specifics

| Moment | Spec |
|---|---|
| New conversation in list | rise once 360ms, 6px, morph curve, only if the list is scrolled to top; otherwise a "3 new" pill appears at the top of the list (fixed slot) |
| New message in thread | fade + rise 4px, 200ms |
| Onboarding build lines | each tick crossfades icon 160ms; meter width 400ms morph |
| Widget panel open | 220ms rise 8px, scale 98.5% to 100%, from the launcher corner |
| Widget thinking dots | 1.4s loop, opacity only |
| Side panels (pages, gaps) | 200ms slide 24px from the right over the page |
| Live dot (crawling, waiting for visitor, realtime) | 1.5s pulse loop |
| Reduced motion | everything appears in its end state; the dots become the word "Thinking" |

## 20. Components (shadcn/ui, restyled to the tokens)

Button (primary = firm edge, secondary, ghost, danger edge; sizes 32/36/46), Input, Textarea, Select,
Combobox (assignee, tags), Tabs (underline), Segmented control, Switch, Checkbox (2px), Slider, Dialog
(520px, 10% from top), Sheet (side panel), DropdownMenu (portal), Tooltip, Toast (Sonner, bottom left),
Table, Skeleton (static), Badge/Pill (4px), Meter, Avatar, Command (canned replies and search), Popover.
The widget is a separate bundle (Preact or plain React with no shadcn), under 60 KB gzipped for
\`/embed\`, with its own copy of the tokens.

## 21. Copy deck (key strings)

| Where | String |
|---|---|
| Inbox empty | Nothing here. The AI is handling every chat right now. |
| Low confidence label | Low 0.41 · Not shown to visitor |
| Suggest reply missing info | Missing: order number |
| Usage meter tooltip | 1,204 of 1,500 AI answers used. Resets Nov 1. |
| Cap banner (80%) | You have used 80% of this month's AI answers. Upgrade to keep the assistant on. |
| Cap banner (100%) | Your AI assistant is paused until Nov 1. Visitors can still leave messages. |
| Domain warning (console) | Conversate: acme.com is not in your allowed domains. Add it under Widget > Domains. |
| Widget greeting default | Hi there. Ask me anything about us, I answer from our help centre. |
| Widget not sure | I am not sure about this one, and I would rather not guess. |
| Widget handoff done | Done. The team usually replies within 10 minutes. We will also email you at {email}. |
| Widget offline | We are offline right now. Leave your email and we will reply first thing. |
| Gap empty | No gaps yet. When visitors ask something your help centre does not cover, it shows up here. |
| Crawl failed | We could not read {host}. Some sites block crawlers. Paste up to 10 page links instead. |
| Seat limit | You are using 3 of 3 seats. Upgrade to Growth for 10. |

## 22. Notifications menu

- A bell icon button (labelled "Notifications") sits in the sidebar user row, with an unread count badge
  (fixed 24px, tabular). Opens a 360px menu in a portal from the bottom-left corner of the button.
- Rows 56px: kind icon (14px Lucide, hue from the kind: handoff = accent, low confidence = danger, flagged
  = warning, assigned = neutral), title (500), one-line context in muted, relative time right aligned.
  Unread rows carry a 6px accent dot. Clicking marks read and opens the conversation.
- Footer row: "Mark all as read" (ghost) and "Email settings" link. Empty: "You are all caught up".
- New notifications never reorder the open menu; a "2 new" pill appears at the top (fixed slot).

## 23. Responsive

| Width | App behaviour |
|---|---|
| 1280px and up | Inbox shows all three panes |
| 1100 to 1279px | Details pane becomes an overlay sheet opened from the thread header |
| 768 to 1099px | Sidebar collapses to 56px icons; inbox shows list or thread (thread has a Back button) |
| Under 768px | Agent app is usable for replying: list, then thread full screen, composer pinned, details as a sheet. Settings screens stack to one column |

The public help centre and the widget are checked at 320, 375 and 430px. The widget panel goes full
screen under 480px and respects \`env(safe-area-inset-bottom)\` for the composer.
`
