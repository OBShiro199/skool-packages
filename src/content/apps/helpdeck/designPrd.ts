// Helpdeck design PRD (DESIGN.md). Builds on Quiet Precision, shipped as DESIGN_SYSTEM.md.

export const designPrd = `# Helpdeck: design PRD

Save this file as \`DESIGN.md\` in your project root, next to \`DESIGN_SYSTEM.md\` (the Quiet Precision
design system). Add this line to \`CLAUDE.md\`:

\`\`\`
UI rules: @DESIGN_SYSTEM.md @DESIGN.md
\`\`\`

**This document builds on DESIGN_SYSTEM.md and only states what is different for Helpdeck.** White
surfaces, 1px hairlines, 6px boxes, 4px pills, Geist at 13px app text, white buttons with a firm edge
(no filled or black buttons), one easing curve and every stability rule still apply. Where the two
disagree, this file wins only for the brand accent and the Helpdeck-specific screens below.

## 1. Brand

### 1.1 Feel
Calm and exact, like a good reference book. Helpdeck sits on other companies' websites, so the visitor
widget must look at home anywhere: neutral surfaces, the customer's colour in one or two places, never
ours. The owner app is a quiet workbench: pages, answers, gaps.

### 1.2 Accent: pastel indigo
Helpdeck swaps the system's pastel blue for a pastel indigo. Same job ("selected", "in progress"), same
soft fill plus edge pattern.

| Token | Hex | Use |
|---|---|---|
| \`--accent\` | \`#6f7fe0\` | Selected nav icon (duotone), progress bars, live dot, focus of selected rows |
| \`--accent-soft\` | \`#f2f4fd\` | Selected fill (nav item, chip, row) |
| \`--accent-edge\` | \`#c9d0f5\` | Selected border |
| \`--accent-ink\` | \`#3e4bb0\` | Text on accent-soft (selected chip label, links in the app) |

Everything else (surface, hairline, ink, body, muted, faint, ghost, success, warning, danger) is exactly
DESIGN_SYSTEM.md section 02.

### 1.3 Status hues (tag pills, 4px radius, pastel fill 6 to 9 percent, darker edge, readable ink)
| Status | Hue | Label examples |
|---|---|---|
| Ready, Confident, Live, Fixed | green (success) | "Ready", "Live on docs.acme.com" |
| Crawling, Embedding, Learning | indigo (accent) | "Crawling 42%" with live dot |
| Low confidence, Not sure, Email only, Open gap | amber (warning) | "Low confidence" |
| Handed off | violet | "Handed off" |
| Failed, Error, Bouncing | coral (danger) | "Failed" |
| Test, Excluded, Ignored, Not seen yet | grey | "Test" |

### 1.4 Logo and icons
- Wordmark: a 17px speech bubble outline (Phosphor \`ChatCircleText\`, regular) plus "Helpdeck" in Geist
  600, 14px, -0.014em, ink. No colour in the logo.
- Sidebar icons (Phosphor 17px, duotone in accent when selected): Overview \`House\`, Sources
  \`BookOpenText\`, Conversations \`ChatsCircle\`, Gaps \`Question\`, Widget \`ChatCircleDots\`,
  Documentation \`Book\`, Help \`Lifebuoy\`, Billing \`CreditCard\`, Settings \`Gear\`.
- In-content icons: Lucide 14 to 16px, 1.5 stroke (\`ExternalLink\`, \`Copy\`, \`RefreshCw\`, \`Trash2\`,
  \`EyeOff\`, \`Mail\`, \`Check\`, \`AlertTriangle\`).

### 1.5 Added tokens
\`\`\`css
:root {
  --accent: #6f7fe0; --accent-soft: #f2f4fd; --accent-edge: #c9d0f5; --accent-ink: #3e4bb0;
  --violet: #8b6fd6; --violet-soft: #f5f2fc; --violet-edge: #dcd2f4;
  --amber-soft: #fdf6e7; --amber-edge: #f1dcae; --amber-ink: #8a5a06;
  /* widget only, set per bot at runtime */
  --hd-brand: #111214;          /* bots.brand_colour */
  --hd-brand-soft: color-mix(in srgb, var(--hd-brand) 8%, white);
  --hd-brand-edge: color-mix(in srgb, var(--hd-brand) 28%, white);
  --hd-on-brand: #ffffff;       /* black or white, picked by contrast in code */
  --sidebar: 240px; --sidebar-collapsed: 56px; --test-panel: 380px;
}
\`\`\`

## 2. App shell

### 2.1 Layout
\`\`\`
┌──────────────┬───────────────────────────────────────────────────────────┐
│ Helpdeck     │ Toolbar 48px: search · count · actions            (hairline)│
│ [Acme Docs ▾]│───────────────────────────────────────────────────────────│
│ Overview     │                                                           │
│ Sources      │                 page content (scrolls)                     │
│ Conversations 3                                                          │
│ Gaps        12                                                           │
│ Widget       │                                                           │
│              │                                                           │
│ Documentation│                                                           │
│ Help         │                                                           │
│ Billing      │                                                           │
│ Settings     │                                                           │
└──────────────┴───────────────────────────────────────────────────────────┘
\`\`\`
- Sidebar 240px, white, right hairline. Under 1100px it collapses to 56px icons with tooltips; under 768px
  it becomes a 48px top row with a menu button that opens the nav as a left side panel over the page.
- No top bar and no page titles (system rule). Each page starts with its 48px toolbar. The page name lives
  in the selected nav item and the browser tab.
- Nav items 32px high, 6px radius, 8px icon gap, 13px. Hover fill \`#f5f5f6\`. Selected: \`--accent-soft\`
  fill, \`--accent-edge\` border, ink text, duotone accent icon.
- Count badges (Conversations: open handoffs; Gaps: open gaps) are 4px pills right aligned, tabular
  numbers, min width 20px so "9" to "12" never moves the label. Hidden with \`visibility: hidden\` at 0.
- Bottom group (Documentation, Help, Billing, Settings) pinned to the bottom with a hairline above it.
- Account: a 32px row under Settings with avatar initials, email truncated, menu (Log out). Menu pops in
  a portal from the bottom-left corner.

### 2.2 Bot switcher
- A 36px select under the logo: bot name, small status dot (green ready, pulsing indigo crawling, grey
  empty), chevron. Fixed width (sidebar width minus 24px), name ellipsised.
- Menu (portal, 160ms pop): one 32px row per bot with its status dot, a hairline, "+ New bot" (dashed
  edge row). At the plan cap: "+ New bot" shows "1 of 1 bots · Upgrade" in faint ink and links to
  /billing. Collapsed sidebar: shows the bot's first letter in a 28px box.

### 2.3 Banners
One banner slot above the toolbar, 40px, full width, hairline below, 13px. Only one shows at a time,
in this priority: past_due (coral edge: "Your last payment failed. Update card"), email_only (amber:
"Your bot is in email us mode until 1 Nov. Upgrade to answer more"), handoff email bouncing (coral),
trialing (neutral: "5 days left in your trial"). Space for the banner is part of the layout only when a
banner is shown; it appears on page load, never mid-session, so nothing jumps.

## 3. Auth screens (/login, /signup, /forgot-password, /reset-password)
- White page, a centred 400px column starting at 18 percent from the top (not vertically centred, so the
  error line can grow downwards). Wordmark above, 32px gap.
- H2 24px: "Log in to Helpdeck" / "Start your 7-day free trial" / "Reset your password" / "Choose a new password".
- Fields 36px: Email, Password (with a show/hide icon button labelled "Show password"). Signup adds Full
  name. Labels 13px faint above the input.
- Primary button full width, 36px, white with the firm \`#08090a\` 1px edge: "Log in" / "Create account" /
  "Send reset link" / "Save password". Loading keeps the label and overlays a spinner after 200ms.
- Under the signup button, faint 13px: "7 days free. Your bot can be live before lunch."
- Links row: "No account? Sign up" / "Forgot password?" in \`--accent-ink\`.
- Errors below the field, danger ink, \`role=alert\`, reserved 18px min-height so the button never moves:
  "That email and password do not match. Try again or reset your password."
- Arriving from the landing demo (\`?demo=<id>\`): a 6px box above the form with accent-soft fill and
  accent edge: "Your demo bot for docs.acme.com will be waiting in your account."

## 4. Onboarding (/onboarding)
One card, 520px wide, starts 10 percent from the top, morphs height between steps (300ms, morph curve,
content fades up 4px after 60ms). Width never changes. A 3-dot step indicator above (filled accent dot
for done, accent ring for current, ghost for next).

1. **Name your workspace.** H3 "What is your company called?" Input placeholder "Acme". Button "Continue".
2. **Paste your docs.** H3 "Where do your answers live?" Sub "Your docs site, help centre or FAQ. We read
   up to 200 pages." Input placeholder "https://docs.acme.com". Button "Start reading (uses up to 200 pages)".
   Helper text under the input: "Tip: a docs or help URL works better than your homepage."
   Claimed demo: this step shows "Your demo bot is ready. We will read the rest of docs.acme.com now."
3. **Reading.** Live status line with pulsing dot: "Reading docs.acme.com · 24 pages". Under it a meter.
   Button "Go to Sources" is enabled straight away (they do not have to wait here).

## 5. Overview (/app)
- Toolbar: bot name in 13px ink 500, status pill, right side "Open widget preview" (opens the side panel
  preview, 200ms slide from the right over the page).
- **Activation checklist** (until all 3 done): a 6px box with three 48px rows: Crawl your site, Ask a test
  question, Install the widget. Each row: 16px checkbox (2px radius, checked state green), label, faint
  hint, and a compact button "Open Sources" / "Ask a question" / "Copy snippet". Done rows keep their
  height and turn the label muted with a check. When all three are done the box is replaced on next
  load by the stats (never animated away in place).
- **Stats row:** four fixed-width tiles (hairline boxes, 16px padding): Answers this month (with meter and
  "of 2,000"), Deflection rate ("84.2%"), Handoffs ("12"), Open gaps ("7"). Tabular numbers. Each tile
  has a 13px faint label and a 24px number (H2 size, weight 500).
- **Latest conversations:** table of 5 rows (first question, badges, host, time), "View all" link.
- Empty (no crawl yet): illustration-free empty state: 16px icon, "Your bot has not read anything yet.",
  button "Paste your docs URL".

## 6. Sources (/bots/[botId]/sources)
\`\`\`
┌ toolbar: [https://docs.acme.com          ] [Re-crawl (uses up to 200 pages)] 84 pages ┐
├ progress card (only while crawling) ───────────────────────────────┬ Test your bot ───┤
│ ● Reading docs.acme.com · 84 pages found · Learning 40%            │ ChatPanel 380px   │
│ [████████░░░░░░░░] [Cancel]                                         │ (same component   │
├ filter bar: [All 84] [Learned 80] [Failed 2] [Excluded 2]  search  │  as the widget)   │
├ table ─────────────────────────────────────────────────────────────┤                   │
│ Title | URL | Chunks | Status | Crawled | ⋯                         │                   │
└────────────────────────────────────────────────────────────────────┴───────────────────┘
\`\`\`
- **Toolbar:** URL input (fixed 360px), primary button "Crawl" (first time) or "Re-crawl (uses up to N
  pages)", right side page count "84 pages" (tabular). While crawling the button becomes "Cancel crawl"
  with the same min width (170px) so the toolbar never shifts.
- **Progress card:** 6px box, 16px padding, min-height 72px reserved. Line 1: live dot + "Reading
  docs.acme.com · 84 pages found". Line 2: "Learning 40%" with an accent meter (width eases 400ms).
  Steps in faint text that turn ink as they pass: Reading, Splitting, Learning, Ready. Finished: the
  card shows a green check "Ready. 84 pages learned in 2 min 10 s" for this session, then disappears on
  next load. Failed: coral edge, the error message, button "Try again".
- **Filter chips:** All, Learned, Pending, Failed, Excluded, each with a count. 44px filter bar.
- **Pages table:** 36px header, 48px rows, fixed columns: Title (flex, ellipsis), URL (240px, muted,
  ellipsis from the start so the path end shows), Chunks (72px, tabular, right), Status (110px pill),
  Crawled (110px, relative time with full date in a tooltip), menu (32px). Row menu: Open page, Exclude
  from answers, Delete page. Exclude asks nothing (it is reversible), Delete opens a confirm dialog
  "Delete this page? The bot stops using it now. A re-crawl adds it back."
- **Test panel:** 380px column on the right with a left hairline, from 1280px. Below 1280px it becomes a
  "Test your bot" button that opens the same panel as a side sheet over the page. Above the panel: faint
  "Test answers count towards your monthly answers."
- **Empty:** "Paste your docs or help centre URL to teach your bot." with the URL input focused.
- **Loading:** table skeleton rows (48px, hairline, ghost bars) after 200ms.
- **Errors:** "Could not start the crawl. That URL did not respond. Check it opens in your browser." below
  the input in danger ink.

## 7. Conversations (/bots/[botId]/conversations)
- Two columns: list 360px (left hairline split) and transcript (flex).
- **Toolbar:** search ("Search questions"), count "248 conversations", right: "Export CSV".
- **Filter bar chips:** All, Handed off, Low confidence, Test. Date chip "Last 30 days".
- **List rows** 64px (exception to 48px because two lines): line 1 first question (ink, ellipsis), line
  2 faint host and relative time, right side up to two pills (Handed off violet, Low confidence amber).
  Selected row: accent-soft fill and edge. Unread handoffs show a 6px violet dot left of the question.
- **Transcript:** header 48px with visitor label ("Visitor 3f9a" or their email after handoff), page URL
  link, started time, "Reply by email" (mailto with the visitor email, only after handoff). Messages:
  visitor on the right in a hairline box with \`#fafafb\` fill; bot on the left on white with an avatar.
  Under each bot answer: source chips (4px pills, max width 220px, title ellipsis, \`ExternalLink\` icon),
  plus a faint line "Confident · 0.71" or an amber pill "Low confidence · 0.38".
- **Low confidence hint** under the message: amber-soft box "Your docs do not cover this yet. Add a page,
  then re-crawl." with a link "See in Gaps".
- **Empty:** "No conversations yet. Install the widget or ask a test question." Button "Open Widget".
- **Export:** button shows a spinner after 200ms with the label kept; on finish a toast "Export ready"
  with action "Download".

## 8. Gaps (/bots/[botId]/gaps)
- **Toolbar:** "Questions your docs could not answer", count, segmented filter (Open, Fixed, Ignored).
- **Table:** Question (flex, the sample question), Asked (80px, tabular, "x14"), Last asked (110px),
  Status pill (110px), actions (two compact buttons with fixed 96px width: "Mark fixed", "Ignore").
- Clicking a row opens a side panel (200ms, 420px) listing up to 10 conversations where it was asked,
  with links to each.
- Growth banner inside the page (top, accent-soft box) for Starter users: "Get these grouped into
  topics every Monday. Weekly docs gaps email is on Growth." with "See Growth".
- **Empty:** green check icon, "No gaps. Your docs answered everything this week."

## 9. Widget (/bots/[botId]/widget)
Tabs (36px, underline style with a 2px accent bar under the active tab, width fixed per tab): Appearance,
Install, Domains, Handoff. Left: the form (max 560px). Right (from 1100px): a live preview of the widget
in a 380 x 600 frame on a faint grid "fake website" background. Below 1100px the preview is a button that
opens it in a side panel.

### 9.1 Appearance
- Bot name (input, 40 chars), Greeting (textarea, 200 chars, counter in faint tabular "84/200"),
  Brand colour (swatch button + hex input; contrast warning in amber if text on it would be under
  4.5:1, "Text on this colour may be hard to read. We will use black text."), Avatar (64px dashed
  upload box, png/jpg/webp under 1 MB; "Remove" link), Suggested questions (three inputs, placeholder
  from page titles "How do I export invoices?").
- Saves on blur with a toast "Saved". The preview updates in place.

### 9.2 Install
- Status line at the top: grey pill "Not seen yet" or green pill "Live on docs.acme.com" with "Last
  answer 3 minutes ago".
- Code box (6px, hairline, Geist at 13px, not monospace per system rule; the snippet is one line and
  wraps): \`<script src="https://helpdeck.app/w.js" data-bot="BOT_ID" async></script>\`, with a "Copy
  snippet" button (fixed width, label changes to "Copied" for 2 seconds without changing width).
- Platform tabs as chips: HTML, Webflow, WordPress, Shopify, Framer. Each shows 3 numbered steps:
  - HTML: "Paste the snippet right before \`</body>\` on every page."
  - Webflow: "Site settings, Custom code, Footer code. Paste, Save, Publish."
  - WordPress: "Install a header and footer code plugin (for example WPCode). Footer, paste, Save."
  - Shopify: "Online Store, Themes, Edit code, theme.liquid. Paste before \`</body>\`. Save."
  - Framer: "Site settings, General, Custom code, End of body tag. Paste. Publish."
- "Open it from your own button" collapsible with \`Helpdeck.open()\` example.

### 9.3 Domains
- Tags input: each domain a 4px pill with a remove icon. Input placeholder "docs.acme.com". Helper:
  "The widget only runs on these sites. acme.com also covers www.acme.com. Use *.acme.com for all
  subdomains." Warning (amber box) if the list is empty: "Add at least one domain or the widget will not
  load on your site."

### 9.4 Handoff
- Handoff email (defaults to the login email), Handoff message shown on the card (default "I'm not sure
  about this one. Want a human to email you?"), and the toggle "Send a copy to my
  login email". Bouncing banner: coral box "Emails to x@y.com are bouncing. Change the address."

## 10. New bot (/bots/new) and the bot limit
- A 520px card like onboarding step 2: name, start URL, button "Create bot and start reading".
- At the cap the page shows instead: H3 "Starter includes 1 bot", body "Growth gives you 3 bots, 1,000
  pages each and 10,000 answers a month.", button "See Growth ($129/month)", link "Back to Overview".

## 11. Billing (/billing)
- Toolbar: "Billing".
- **Plan box:** plan name and price ("Starter · $49/month"), status pill (Trialing, Active, Past due,
  Canceled), trial end or renewal date, "Manage billing" button (Customer Portal).
- **Usage meters** (two rows, fixed width labels): "Answers 1,240 of 2,000 · resets 1 Nov",
  "Pages crawled 380 of 1,000 this month". Meter colours: accent, amber under 20 percent left, coral under 5.
- **Plans:** monthly/yearly toggle (segmented, pill slides 220ms), two plan boxes side by side with the
  same height, current plan marked with an accent-soft fill "Current plan". Buttons "Switch to Growth" /
  "Switch to Starter". Yearly shows "2 months free".
- **Downgrade with extra bots:** a box "Pick the bot to keep active" with radio rows.
- **Invoices:** link to the Customer Portal (we do not list invoices ourselves).

## 12. Settings (/settings)
Sections stacked in one column (max 640px), each a hairline box with an H3 and 16px padding:
Profile (full name), Workspace (company name, used in the bot prompt), Email (change, sends a confirm),
Password, Notifications (toggles: Usage alerts, Weekly docs gaps email (Growth), Copy of handoffs to my
login email), Danger zone (coral edge: "Delete account and all bots", confirm dialog that asks to type the
workspace name). Save buttons per section, compact, fixed width.

## 13. Documentation (/docs) and Help (/help)
- Documentation: search input at the top (toolbar), list of articles as 48px rows (title, one-line
  summary), article view at 65 characters wide with H2/H3 and the Helpdeck widget available.
- Help: 520px form (Subject, Message, "Send message"), success replaces the form in place with "Sent.
  We reply within one working day." Under it 5 FAQ rows (accordion, chevron rotates 200ms).

## 14. Paywall (/paywall)
- 520px card 10 percent from the top. H2 "Start your 7-day free trial", two plan boxes (Starter $49,
  Growth $129) with 4 bullets each, buttons "Start trial on Starter" / "Start trial on Growth".
- Past due: H2 "Your last payment failed", body "Your bot is in email us mode. Update your card to turn
  answers back on.", button "Update card".

## 15. The visitor widget (/widget/[botId])
This is what end customers see. It must look right on any website: light or dark, busy or plain.

### 15.1 Launcher (drawn by w.js on the customer's page)
- 56px circle, \`--hd-brand\` fill (the one filled shape in Helpdeck, because it must be found on a busy
  page), icon in \`--hd-on-brand\`, 1px ring \`rgba(8,9,10,.08)\`, float shadow from the system.
- Bottom right, 20px from edges (\`data-position="left"\` mirrors it). Hover scale 1.04, press 0.98, 120ms.
- Open state: icon cross-fades to an X (160ms). Unread dot: 10px coral dot top right with a white ring.
- Optional greeting teaser after \`data-greeting-delay\` seconds: a 260px white box with hairline and
  shadow above the launcher with the greeting text and a close X. Shown once per visitor per day.

### 15.2 Panel
- 380 x 600px desktop (max height \`calc(100vh - 120px)\`), 6px radius, white, hairline, float shadow,
  positioned 16px above the launcher. Under 640px: full screen, no radius, safe-area padding, and it
  resizes with \`visualViewport\` so the keyboard never covers the input.
- Opens with the system dialog motion: 220ms, rises 8px, scales from 98.5 percent. Reduced motion:
  instant.

### 15.3 Panel anatomy
\`\`\`
┌ header 48px: [avatar 24] Acme Support  · "Answers from our docs"   [X] ┐
├ messages (scroll) ─────────────────────────────────────────────────────┤
│ [avatar] Hi! Ask me anything about Acme.                                │
│ [How do I export invoices?] [Can I change my plan?] [Do you have an API?]│
│                                     ┌ visitor box ────────────────────┐ │
│                                     │ How do I export all my invoices?│ │
│                                     └─────────────────────────────────┘ │
│ [avatar] Go to **Invoices → Export**, pick a date range...              │
│ Sources: [Exporting invoices ↗] [Date ranges ↗]                         │
├ input 52px: [Ask a question...                              ] [Send]    ┤
├ footer 28px: Powered by Helpdeck (Starter only)                         ┘
\`\`\`
- **Header:** bot avatar (24px, 6px radius; default is the first letter on \`--hd-brand-soft\`), bot name
  13px 500 ink, faint subline "Answers from our docs". Close button 32px icon-only, labelled "Close chat".
- **Greeting:** a bot message. Suggested questions as chips under it: 4px pills, hairline, 13px, wrap to
  two lines max. Clicking sends the question. They hide after the first message (space collapses only
  before the first message is sent, so nothing moves under the cursor during a chat).
- **Visitor message:** right aligned, max 80 percent width, 6px box, \`--hd-brand-soft\` fill,
  \`--hd-brand-edge\` border, ink text, 14px/20px (message text is 14px for reading comfort on customer
  sites; all chrome stays 13px).
- **Bot message:** left aligned with the 24px avatar, white, no box, 14px/20px body ink, sanitised
  markdown: bold, lists, links in \`--accent-ink\` with underline on hover. Max 3 source chips under it,
  label "Sources" in faint 12px.
- **Typing:** three 6px dots in faint ink, sequential opacity pulse (the live state loop, 1.4s). Appears
  after the visitor message rises. The answer replaces the dots in the same row (the row reserves 20px).
- **Answer in:** opacity 0 to 1 and 4px rise, 240ms. No typing effect for real answers (it slows reading).
- **Input:** 52px bar with a top hairline, textarea auto-grows to 4 lines then scrolls, placeholder "Ask a
  question...". Send is a 32px white button with a firm edge and an arrow icon, labelled "Send message",
  disabled (ghost) when empty. While waiting: input stays editable, Send shows the spinner after 200ms.
- **Footer:** "Powered by Helpdeck" 12px faint, links to the landing page with \`?ref=widget\`. Hidden on
  Growth (the row is removed entirely on Growth, decided before render so nothing shifts).

### 15.4 Not sure and handoff
- When \`offerHandoff\` is true, under the bot message: an amber-soft box with amber edge, 12px padding:
  "I'm not sure about this one. Want a human to email you?" (or the owner's handoff message), an email
  input (36px, placeholder "you@company.com"), an optional "Add a note" link that reveals a textarea in
  place (height morphs 300ms), and a button "Send to a human".
- Sending: button spinner, label kept. Done: the box content morphs to a green check and "Done. Someone
  will reply to you at you@company.com." Error: danger line under the input "Could not send that. Check
  the email and try again."
- Validation: inline, on submit only ("Enter an email like name@company.com").

### 15.5 Widget modes and states
| State | What shows |
|---|---|
| Loading config | Panel skeleton: header bar and two ghost lines (only if over 200ms) |
| live | Normal chat |
| email_only / paused | Greeting replaced by "Leave your email and we will get back to you." plus the handoff box (no chat input) |
| not_ready | "This assistant is still learning. Leave your email instead." plus handoff box |
| Rate limited | Bot message in faint ink: "You are sending messages quickly. Try again in a few minutes." Input disabled for the retry-after time with a countdown in the placeholder |
| Network error | Inline under the visitor message: "Message not sent. Retry" (Retry is a text button) |
| Token expired | Silent iframe reload; the conversation continues (id in sessionStorage) |
| Wrong domain | "This assistant is not set up for this website." centred, faint, no input |

### 15.6 Colour rules for the widget
- Only three things use the customer's colour: the launcher fill, the visitor message soft fill and
  edge, and the focus edge of the input (\`--hd-brand-edge\`). Everything else is the Quiet Precision
  neutral palette, so even a neon brand colour looks calm.
- \`--hd-on-brand\` is black when the brand colour's relative luminance is over 0.5, else white.
- The widget is light only (system rule). On dark host sites the white panel with a 1px ring reads as a
  floating card, which is fine.

## 16. Demo page (/demo/[demoId]) and the landing demo panel
- Same ChatPanel in a 380 x 560 frame centred on a white page with the wordmark top left. Above it:
  "Your demo bot for docs.acme.com · 15 pages · 10 questions". Under it: primary button "Keep this bot:
  start free trial" and faint "This demo is deleted in 48 hours."
- After 10 questions the input is replaced with: "That is the demo limit. Start a free trial to keep
  this bot and train it on your whole site." plus the same button.
- Expired: "This demo has expired." with "Try it again" (to \`/#try\`).

## 16.1 Emails (Resend, built with React Email or plain HTML tables)
Same calm look as the app, readable in Gmail, Outlook and Apple Mail.
- 560px white body, 24px padding, 1px \`#e6e6e9\` border, 6px radius (Outlook shows square, fine).
- Wordmark top left in ink text (no image, so it shows with images off).
- Body 14px/22px, \`#3c4149\`, system font stack (Geist will not load in most mail apps).
- One action per email as a bordered link styled like the app's primary button: white fill, 1px ink
  edge, 6px radius, 40px tall, ink text. Never a filled colour button.
- Footer 12px faint: "You get this because you run a Helpdeck bot on {host}. Manage emails in Settings."

**Handoff email layout**
\`\`\`
Helpdeck
Customer question needs you
──────────────────────────────────────
From: visitor@company.com (reply to this email to answer them)
Page: https://docs.acme.com/billing
When: 18 Oct 2026, 14:02 UTC

Visitor: Can I get a refund for last month?
Bot:     I'm not sure about this one. (Low confidence)
Visitor note: I was charged twice.

[ Open in Helpdeck ]
──────────────────────────────────────
\`\`\`
- Visitor lines in ink 500, bot lines in muted, "Low confidence" in amber ink text (no fill).
- Gaps digest: a numbered list of 5 topics, each with "Asked 14 times", 3 sample questions in muted,
  and "Suggested page: Changing your billing date". Action "Open Gaps".

## 17. Empty, loading and error states (catalogue)
| Screen | Empty | Loading | Error |
|---|---|---|---|
| Overview | "Your bot has not read anything yet." + Paste your docs URL | tile skeletons with fixed heights | "Could not load your stats. Refresh to try again." |
| Sources | "Paste your docs or help centre URL to teach your bot." | 8 skeleton rows | Inline under the URL input; failed crawl in the progress card |
| Conversations | "No conversations yet. Install the widget or ask a test question." | list skeleton (64px rows) | "Could not load conversations. Retry" |
| Gaps | "No gaps. Your docs answered everything this week." | table skeleton | same pattern |
| Widget, Install | status "Not seen yet" with "Waiting for the first answer on your site" | n/a | snippet copy failure toast "Could not copy. Select the text and copy it" |
| Billing | n/a | meter skeleton | "Could not reach billing. Try again in a minute." |
| Any table | rows never re-animate on refetch | spinner waits 200ms, stays 400ms | errors replace the table body, toolbar stays |

## 18. Components (shadcn/ui, restyled to the system)
Button (white, edge \`#dcdde0\`; primary edge \`#08090a\`; sizes 32/36/46), Input, Textarea, Select, Tabs,
Table, Badge (as 4px pills), Dialog (520px, 10 percent from top), Sheet (side panel, 200ms from the right),
DropdownMenu (portal, 160ms), Tooltip, Toast via Sonner (bottom left, 4 seconds, max 4, no full stop),
Skeleton, Switch, Checkbox (2px radius), Progress (as the system meter), ScrollArea, Accordion.
Custom: \`ChatPanel\`, \`SourceChips\`, \`HandoffBox\`, \`TypingDots\`, \`BotSwitcher\`, \`UsageMeter\`,
\`CrawlProgress\`, \`DomainTags\`, \`SnippetBox\`, \`WidgetPreview\`, \`StatusPill\`.
The visitor widget ships as its own small bundle: no shadcn, no Radix, plain React plus CSS modules,
under 40 KB gzipped for the \`/widget\` route.

## 19. Motion (Helpdeck specifics on top of the system)
- Crawl page count ticks with tabular numbers, no count-up animation (it is live data).
- Progress meter width eases 400ms with the morph curve on each poll.
- New pages appear at the top of the table without row animation after the first load of the page.
- Chat messages rise 6px and fade 240ms, once each. Typing dots are the only loop in the widget.
- Launcher opens the panel with the dialog motion; closing reverses in 160ms.
- Reduced motion: no rise, no scale, dots static at 60 percent opacity with the text "Thinking" for
  screen readers in a polite live region.

## 20. Microcopy
| Where | Text |
|---|---|
| Crawl button | Crawl (uses up to 200 pages) / Re-crawl (uses up to 200 pages) |
| Crawl toast | Crawl started |
| Crawl done | Ready. 84 pages learned |
| Exclude toast | Page excluded |
| Snippet copied | Copied |
| Domain cleaned | Saved as docs.acme.com |
| Cap banner | Your bot is in email us mode until 1 Nov. Upgrade to answer more |
| Recrawl limit | You have re-crawled 3 times today. Try again tomorrow. |
| Crawl allowance | You have used this month's crawl pages. Upgrade or wait until 1 Nov. |
| Wrong URL | That URL did not respond. Check it opens in your browser. |
| Handoff done | Done. Someone will reply to you at you@company.com. |
| Test note | Test answers count towards your monthly answers. |

## 21. Accessibility and responsive
- Widget panel: \`role="dialog"\` with \`aria-label="Support chat"\`, focus trapped while open, Escape closes,
  messages list is a polite live region (\`aria-live="polite"\`) announcing new bot answers.
- Source chips are links with the full page title in \`aria-label\`.
- Every icon-only button is labelled. Focus ring 2px ink outline, 2px offset (system rule).
- Check the app at 1440, 1280, 1100, 768, 430, 375 and 320px. Check the widget at 320 and 375px with the
  keyboard open (iOS Safari and Android Chrome).

## 22. Build order for Claude Code
1. Tokens (section 1.5) on top of DESIGN_SYSTEM.md tokens, app shell with sidebar and bot switcher.
2. Auth screens and onboarding.
3. Sources with the progress card and pages table.
4. ChatPanel and its states (shared by test panel, widget and demo).
5. Conversations and Gaps.
6. Widget page with live preview, Install and Domains.
7. Billing, Settings, Docs, Help, Paywall.
8. Check every page at the widths in section 21 and fix anything that shifts.
`
