// Outbounder design PRD (DESIGN.md). Builds on Quiet Precision (DESIGN_SYSTEM.md). Backticks escaped.

export const designPrd = `# Outbounder: Design PRD

Save this file as \`DESIGN.md\` in the repo root, next to \`DESIGN_SYSTEM.md\` (the Quiet Precision design system from the vault) and \`PRD.md\`. Your \`CLAUDE.md\` must contain the line:

\`\`\`
UI rules: @DESIGN_SYSTEM.md @DESIGN.md
\`\`\`

## 0. How this file relates to DESIGN_SYSTEM.md

- **DESIGN_SYSTEM.md is the base.** Neutrals, type scale, Geist 400/500/600, 13px app text, 6px boxes and 4px pills, white surfaces split by hairlines, white buttons with a firm edge (no filled or black buttons), 48px rows, the 48px page toolbar, the 44px filter bar, filter chips, the floating selection bar, motion curves, overlays in portals and the stability rules all come from there. Do not restate or change them here.
- **This file adds only three things:** the Outbounder brand accent (section 1), the product components (section 3) and the product screens (sections 4 to 6).
- Where the two disagree, this file wins only for the accent hue and Outbounder-specific screens. Every stability, motion and component rule in DESIGN_SYSTEM.md still applies.
- Light only. No dark mode in v1.
- Build tokens and components first, then screens. Never write a raw hex in a component; use the variables.

## 1. Brand

- **Name:** Outbounder. **Tagline:** Cold email that reads like you wrote it.
- **Personality:** calm operator. A sharp, quiet tool for people who send email for a living. Specific, never hypey.
- **Voice in UI copy:** follows DESIGN_SYSTEM.md section 09. Numbers before words: "25 emails ready to review", not "Your personalised emails are ready". British spelling.
- **Logo:** wordmark "outbounder" in Geist 600, sentence case would read "Outbounder" in running text; the mark is a small paper-plane glyph of two triangles in the accent colour, 16px in the sidebar.
- **Imagery:** product screenshots and real email previews only. No stock photos, no 3D, no robots.

### 1.1 Brand accent (replaces the base blue)

A pastel periwinkle, a touch more violet than the base blue, so Outbounder screenshots are recognisable next to other kits. It keeps the base rule: pastel, with a soft fill and an edge, used only for "selected" and "in progress".

| Token | Hex | Use |
| --- | --- | --- |
| \`--accent\` | \`#6a7ee6\` | Selected nav icon (duotone), progress bars, live dots, focus of "in progress" |
| \`--accent-soft\` | \`#f2f4fe\` | Selected row, selected nav item, selected chip fill |
| \`--accent-edge\` | \`#c9d1f7\` | Border of anything selected; the edge of the primary button |
| \`--accent-ink\` | \`#3d4fae\` | Text on \`--accent-soft\` (passes AA at 13px) |

In \`app/globals.css\`, set \`--blue: var(--accent); --blue-soft: var(--accent-soft); --blue-edge: var(--accent-edge);\` so every base component picks up the brand without edits.

### 1.2 Tag hues used by Outbounder

Pastel fill at 7% opacity, a 1px edge of the same hue at 35%, ink at full strength. Pills are 4px radius, 20px high, 12px text.

| Hue | Ink | Used for |
| --- | --- | --- |
| Grey | \`#62666d\` | found, queued, draft, other, ooo |
| Periwinkle (accent) | \`#3d4fae\` | verifying, enriching, personalising, sending, building (with a pulsing dot) |
| Blue | \`#2f6fbf\` | ready, reviewing |
| Green | \`#1f8a3a\` | verified, approved, sent, delivered, interested, domain verified |
| Amber | \`#9a6508\` | needs_review, not_now, pending DNS, paused |
| Coral | \`#c43c3c\` | rejected, bounced, failed, unsubscribe, complaint |
| Violet | \`#7a4fc9\` | AI-written content markers |
| Teal | \`#1d7f7a\` | replied |

Free labels (campaign names in filters) hash to the first seven hues, as the base says.

### 1.3 The primary button

Base rule: no filled buttons. Outbounder's primary action on a screen (Launch campaign, Find leads, Approve) uses the standard white button with a **firm 1px \`--accent-edge\` border and \`--accent-ink\` label**. Secondary buttons use the base \`--btn-edge\`. Destructive actions use a coral edge and coral label. One primary per toolbar.

## 2. App shell

- **Sidebar** (base: 240px, 56px icons under 1100px, white, right hairline, 32px items, 28px section labels).
  - Top: logo row (48px, aligned with the page toolbar).
  - Group 1, no label: Dashboard, Campaigns, Inbox (unread count as a grey pill, tabular), Domains, Analytics.
  - Spacer.
  - Plan card: 6px box, hairline border, 12px padding. "Starter" (500) and a Meter for leads: "212 of 350 leads". Trial: "Trial · 4 days left" and the trial lead meter.
  - Group 2, always this order: **Documentation, Help, Billing, Settings.**
  - One level only, no nested menus, 9 items.
  - Icons: Phosphor 17px regular at rest, duotone in \`--accent\` when selected. Dashboard \`SquaresFour\`, Campaigns \`PaperPlaneTilt\`, Inbox \`Tray\`, Domains \`Globe\`, Analytics \`ChartBar\`, Documentation \`BookOpen\`, Help \`Lifebuoy\`, Billing \`CreditCard\`, Settings \`GearSix\`.
  - Selected item: \`--accent-soft\` fill, \`--accent-edge\` 1px border, \`--ink\` label at 500.
- **No top bar and no page titles** (base rule). Each page starts with the 48px page toolbar: on the left a short context label in faint ink ("Campaigns", "Inbox") followed by search and the count; on the right the page actions. The usage pill ("612 / 1,000 sends") sits at the right end of the Dashboard and Campaigns toolbars only.
- **Banners** sit under the toolbar, one at a time, 40px, white with a 1px hued edge and a hued dot, never a filled strip. Priority: paywall, campaign auto-paused, usage over 80%, domain not verified after 24 hours.
- **Under 640px:** the sidebar becomes an overlay drawer opened from a menu button at the left of the toolbar. It floats over the page; the page never reflows.
- **Command menu** (cmd+k): base menu styling, 560px wide, opens 10% from the top. Groups: Go to, Campaigns, Leads (by email or company), Actions (New campaign, Add domain).

## 3. Product components

All built from base components and tokens. Heights and widths below are fixed so nothing shifts (base section 08).

| Component | Spec |
| --- | --- |
| \`StatusPill\` | Tag pill from 1.2. Working states (verifying, enriching, personalising, sending) add a 6px pulsing \`--accent\` dot before the label: this is the only looping motion. Fixed min-width 92px so a status change never resizes a cell. Tooltip shows the time of the last change. |
| \`PipelineBar\` | 8px tall, 4px radius, hairline border, segments in hue order found, verified, enriched, ready, approved, sent. Counts below in 12px tabular faint ink, in fixed-width slots. Width changes ease 400ms on the morph curve. |
| \`JobProgress\` | A 48px row above the leads table: live dot + "Finding leads · 64 of 100" (tabular, fixed width), a 4px progress bar (\`role=progressbar\` with values), "Pages 3" faint, and "You can leave this page". Failed: coral edge row, the error in plain words, a "Retry" button. Space is reserved even when idle (the row shows "Last search: 25 leads, 2 hours ago") so the table never jumps. |
| \`UsageMeter\` | Base Meter: label left ("Leads"), "212 / 350" right in tabular, 4px bar. Colour by what is left: accent, amber under 20% left, coral under 5% left. Caption "Resets 1 Nov" in faint, height reserved. |
| \`EmailPreview\` | A 6px box with hairline border. From line (initials avatar 24px, sender name 500, inbox email muted), To line, subject 500, body at 14/22 in Geist (the one place app text goes above 13px, because it is an email), footer and unsubscribe line in faint. Unresolved variables render as coral tag pills \`{{missing}}\`. Edit mode: subject and body become borderless inputs with a dashed hairline on hover. |
| \`AiMark\` | Violet tag pill "AI" 18px high with a Lucide \`Sparkles\` 12px. The first line written by Claude gets a violet 7% underlay. Tooltip: "Written by Claude from northpeak.studio/about". |
| \`ConfidenceMeter\` | 5 bars, 3px wide, 12px tall, 2px gaps. Filled bars in green above 0.8, accent 0.5 to 0.8, amber below 0.5. Fixed width 23px. |
| \`ClassificationBadge\` | Tag pill: interested (green), not now (amber), unsubscribe (coral), out of office (grey), other (grey). Fixed min-width 96px. |
| \`CapacityMeter\` | "12 / 20 today" tabular, 4px bar, next send time in faint ("next 09:14 local"). |
| \`DnsRecordRow\` | 48px row: type tag (TXT, MX, CNAME), host and value in 13px Geist (no monospace, base rule) with ellipsis and a copy icon button each, priority for MX, status pill (Waiting grey, Checking accent with dot, Valid green, Invalid coral, Missing amber). Copy buttons keep their width when they swap to a tick for 1.5 s. |
| \`VariableChip\` | Grey tag pill with the variable name in braces. Click inserts at the cursor. Dashed "+ Variable" chip opens a menu with all of them. |
| \`KeyboardHint\` | 20px boxes with hairline border, 12px faint text: A approve, E edit, R regenerate, X reject, J/K next/previous. |
| \`StepWizard\` | One dialog (or one page card) that morphs height between steps; width never changes. Step labels across the top in 13px: done steps muted with a tick, current in ink 500, future in ghost. Footer: Back (secondary), Continue (primary edge). Continue disabled until valid, never hidden. |
| \`EmptyState\` | Inside the table area, centred, 13px: one line in ink 500, one line muted, one button. No illustrations. |
| \`LintRow\` | Under the sequence body: word count tag ("62 words"), then warning tags in amber ("Link in step 1", "Over 120 words", "Spam word: guarantee"). Height reserved for one row of tags. |

Loading: base rules. Spinners appear after 200ms, stay at least 400ms, and overlay labels in place. Skeleton rows are 48px with two grey bars (\`--hover\`), never shimmering.

## 4. Onboarding, auth and billing screens

### 4.1 Auth (\`/login\`, \`/signup\`, \`/forgot-password\`)

- A single centred column (360px) on white, no split screen. Logo, H2 "Create your account" (or "Log in"), fields at 36px, "Continue with Google" secondary button above a hairline divider with "or".
- Primary button "Create account" with the accent edge. While loading the label stays and the spinner overlays it.
- Under the button in muted 13px: "7 days free. See a real first line in 4 minutes."
- Errors below the field in danger ink with \`role=alert\`. After signup go straight to onboarding (confirm email is off).

### 4.2 Onboarding: ICP wizard (\`/app/onboarding\`)

- No sidebar. A 640px column centred, 48px toolbar with the logo left and "Save and exit" right.
- StepWizard with 5 steps: Who, Where, Company, Offer, Plan. One card that morphs height.
- **Who:** H3 "Who do you sell to?" Title chips input with suggestion chips below (Founder, CEO, Managing Director, Head of Marketing, VP Sales, Head of Talent). Seniority as toggle chips. Checkbox "I run an agency". Faint helper: "2 to 5 titles work best."
- **Where:** country multi-select, optional city chips, toggle "Company HQ in these countries".
- **Company:** headcount as 4 toggle boxes (1-10, 11-50, 51-200, 201-500) in a 4-column grid, industry keyword chips, exclude keyword chips.
- **Offer:** website URL, "What do you sell, in one sentence?" (counter 0/140), proof line (optional), sender name, company, physical address. Right of the fields on desktop (below on mobile): the **live sample** box, 6px hairline box with a reserved min-height of 220px. Loading uses a live status line that steps in place: "Finding a company that matches" > "Reading northpeak.studio" > "Writing a first line". Then an EmailPreview with the AI first line underlaid in violet and "Try another company" (3 a day).
- **Plan:** two plan boxes side by side, Starter and Growth (Growth preselected if "I run an agency"). Monthly / Annual segmented control above them, annual shows a green tag "2 months free". Each box: plan name 500, price at H2 size tabular ("$79" then "/mo" muted; annual "$790 /yr" with "= $66/mo" faint), 4 lines of limits, selected box gets the accent soft fill and edge. Under them: "Nothing is charged for 7 days. Trial limits: 50 leads, 100 sends." Button "Start 7-day free trial".
- **Return from Stripe** (\`?step=domain\`): live status "Checking your trial" while polling. After 60 seconds: "Stripe is taking a while. Refresh in a minute; you have not been charged twice."
- **Domain prompt:** three short lines on why a separate domain, buttons "Set up my sending domain" (primary) and "Do this later".

### 4.3 Billing (\`/app/billing\`)

- Toolbar: "Billing", right: "Manage billing" secondary button (opens Stripe Portal).
- Plan box: "Starter · $79/mo · renews 22 Nov" or "Growth · $1,790/yr". Three UsageMeters below it (Leads, AI emails, Sends) in a 3-column grid with fixed heights.
- Starter users: a hairline box with an accent edge: "Growth: 900 leads, 2,700 sends and 6 inboxes for $179/mo." Button "Upgrade to Growth".
- Trialing: banner "Trial · 4 days left. Your card is charged $79 on 22 Oct."
- Paywall (no access): the page shows a single 520px box: H2 "Your campaigns are paused", what is waiting ("3 campaigns · 412 leads · 18 replies", tabular), buttons "Restart Starter ($79/mo)" (primary) and "Choose Growth".

### 4.4 Settings (\`/app/settings\`)

- Toolbar tabs (36px segmented, left): Profile, Sender, Sending defaults, Suppression.
- Sender: sender name, company, physical address, signature, with an EmailPreview footer that updates live.
- Sending defaults: send-day chips, window start and end selects, follow-up delays, and a locked switch "Stop on any reply" with the tooltip "Outbounder always stops a sequence when someone replies".
- Suppression: base table (48px rows): email or domain, reason pill, source, date. Toolbar actions "Add", "Import CSV". Filter chips for reason. Selection bar with "Remove (n)" for manual entries only.

### 4.5 Documentation (\`/app/docs\`) and Help (\`/app/help\`)

- Docs: two columns inside the page: a 220px article list (hairline right, 32px items, grouped: Getting started, Deliverability, Domains and DNS, Campaigns, Billing) and the article at 65 characters wide, 14/22 body, H2/H3 from the base scale. First five articles: "How Outbounder works in 5 steps", "Why a separate domain", "Adding DNS records in Porkbun", "The 20-a-day ramp", "Reading the AI labels". Each ends with "Was this helpful?" Yes / No buttons.
- Help: three boxes stacked. Pipeline status (four 48px rows: Finding, Verifying, Writing, Sending, each with a status pill from the last cron run). Contact form (topic select, message, "Send message"). "Book a 15-minute setup call" for trial users. Success toast: "Message sent".

## 5. Product screens

### 5.1 Dashboard (\`/app\`)

- Toolbar: "Dashboard", usage pill, "New campaign" primary.
- Row of 4 stat boxes (6px, hairline): Sent this week, Reply rate (7 days), Interested (7 days), Sends left today. Big number at H2 size tabular, label in faint 13px, delta in 12px muted. Fixed heights.
- Next steps checklist (until done): 7 rows of 36px with checkboxes that tick themselves: ICP set, domain verified, 2 inboxes, 25 leads ready, 10 reviewed, campaign launched, first reply.
- Campaigns table (top 5): name, StatusPill, PipelineBar, sent, reply rate.
- Interested replies table (last 5): lead, company, snippet (ellipsis), time.
- Domain health: one 48px row per domain with a health dot, bounce rate, inboxes with CapacityMeters.
- Empty: "Your first campaign starts with your buyer" and "Create campaign".

### 5.2 Campaigns list (\`/app/campaigns\`)

- Toolbar: "Campaigns", search, count ("8 campaigns"), "New campaign" primary.
- Filter bar (44px): chips for Status, Inbox, Created. "+ Add filter" dashed.
- Table (36px header, 48px rows, fixed columns): Name (ellipsis), Status, Leads, Approved, Sent, Reply rate, Interested, Last activity. Numbers right-aligned, tabular.
- Row click opens the campaign. Row actions menu (in a portal): Pause, Resume, Duplicate, Archive.
- Selection bar: "Pause (n)", "Archive (n)", fixed widths sized for 3 digits.

### 5.3 Campaign builder (\`/app/campaigns/new\`)

StepWizard on a page card (sidebar visible), 5 steps: ICP, Leads, Sequence, Inboxes and schedule, Review and launch.

1. **ICP:** the onboarding fields, prefilled, plus the campaign name. Right: "About 4,300 matching people" from the Prospeo total for page 1 [verify the field name], updated 600ms after the last change, number in a fixed-width tabular slot.
2. **Leads:** count segmented control (25, 50, 100, 250) with the leads UsageMeter under it and "286 leads left this month". Options larger than what is left are disabled with a tooltip, never hidden. "Find leads" primary. Then JobProgress and the live leads table (5.4) inline. Users can continue while it runs.
3. **Sequence:** the editor from 5.5 inline.
4. **Inboxes and schedule:** inbox checkboxes as 48px rows with CapacityMeter and domain health; send-day chips; window selects; fallback time zone. A fixed-height summary line: "3 inboxes × 20 a day × 4 days = 240 sends a week. 100 leads × 3 steps finishes in about 2 weeks."
5. **Review and launch:** counts (ready, approved, needs review) and a 4-row checklist (domain verified, an inbox attached, at least 10 approved, sender name and address set). "Launch campaign" primary, disabled until all pass. The confirm step morphs inside the same dialog: "Start sending to 64 approved leads? First emails go out at 08:00 in each lead's time zone." No second dialog.

### 5.4 Leads table (\`/app/campaigns/[id]/leads\`)

- Toolbar: "Leads", search (name, company, email), count ("100 leads", tabular, fixed width), right: "Import CSV", "Export", "Find leads" primary.
- JobProgress row (always present, see section 3).
- Filter bar: Status chip (first value then "+N"), "Needs review" chip, Source chip (Prospeo, CSV), "+ Add filter".
- PipelineBar under the filter bar, 32px row.
- Table columns (fixed widths): checkbox 40, Name + title 220 (two lines are not allowed: title goes in muted after the name, ellipsis), Company 180, Email 220 with a green tick if verified, Local time 96 ("09:14"), Website 72 (icon states: none, scraping with dot, scraped tick, empty warning), AI 96 (ConfidenceMeter + AiMark), Status 120, Step 56 ("1/3"), Next send 120.
- Realtime row changes: the cell content cross-fades 160ms; the row does not flash, move or resize. Rows rise once on first load only.
- Row click opens the side panel (base: slides 24px from the right over the page, 480px): lead details, scraped summary with source links, AI fields, message history, and buttons Approve, Reject, Regenerate, Remove, Suppress.
- Selection bar: "Approve (n)", "Reject (n)", "Remove (n)", fixed widths. A toast after: "12 approved, 3 skipped".
- Virtualised over 200 rows. Loading: 8 skeleton rows. Empty: "No leads yet. Find 25 to start."

### 5.5 Sequence editor (\`/app/campaigns/[id]/sequence\`)

- Toolbar: "Sequence", "Saved" status in faint (reserved width so "Saving" and "Saved" never shift it), "Add step" (disabled at 3, never hidden).
- Two columns at 55/45 on desktop. Left: step boxes stacked with 12px gaps. Each box: header row "Step 2 · after 3 days · same thread" with a delay input (64px) and a Same / New thread segmented control (hidden with \`visibility: hidden\` on step 1 so the row keeps its height), subject input, body textarea (auto-grows, 14/22, variables shown as grey tag pills inline), VariableChip row, LintRow.
- Right: sticky EmailPreview with a lead picker above it ("Preview as Sarah Lee, Northpeak Studio" with prev/next icon buttons) and step tabs. Footer and unsubscribe line rendered in faint so users see the full email.
- Variables: \`{{first_name}}\`, \`{{company}}\`, \`{{title}}\`, \`{{city}}\`, \`{{ai_first_line}}\`, \`{{ai_pain}}\`, \`{{ai_subject}}\`, \`{{sender_name}}\`.
- Autosave 1 second after typing stops.
- Under 900px: an Edit / Preview segmented control in the toolbar swaps the columns in place.

### 5.6 Review queue (\`/app/campaigns/[id]/review\`)

- Toolbar: "Review", progress "14 of 64 reviewed" (tabular, fixed width), filter segmented control (Ready, Needs review, All), "Approve all above 0.8" secondary (disabled with tooltip until 10 manual reviews; the confirm morphs in place and shows the exact count).
- Two columns 60/40, max width 1440. Left: EmailPreview in edit mode; "Edited" grey tag appears in reserved space after a change. Right: "Why this line" box: signal quote (body ink, violet underlay), source URL link, scraped summary as 3 lines, lead fields, ConfidenceMeter, skip reason in an amber-edged box.
- Regenerate opens a menu-style popover from the button with a hint input and "Regenerate (1 of 3 left)". While running, the body area keeps its height and shows the live status "Writing".
- Footer bar (48px): KeyboardHint on the left; Reject (coral edge), Edit, Regenerate, Approve (primary) on the right with fixed widths.
- After approve or reject the next email fades in place (200ms). Nothing slides sideways.
- Done: "All 64 reviewed · 58 approved" and "Back to launch".

### 5.7 Unified inbox (\`/app/inbox\`)

- Toolbar: "Inbox", search, unread count, right: "Mark all read".
- Filter bar: Label chip (Interested, Not now, Unsubscribe, Out of office, Other), Unread chip, Campaign chip, Inbox chip. No side rail (base rule).
- Two panes under the bars: thread list 380px (hairline right) and thread view.
- Thread rows 48px: unread dot (reserved space when read), lead name 500, company muted, ClassificationBadge, snippet ellipsis, time. Selected row \`--accent-soft\` with the accent edge.
- Thread view: a 48px header (lead, company, campaign, inbox) with a label select and actions (Mark done, Suppress, Open lead). Messages as stacked boxes: outbound boxes have a hairline edge and "You · olly@tryacme.com" header; inbound have the accent edge. The composer is pinned at the bottom: textarea, "Send from olly@tryacme.com" in faint, "Send reply" primary, cmd+enter.
- Low-confidence unsubscribe: amber-edged box at the top of the thread: "Looks like an unsubscribe. Confirm?" with "Confirm" and "Not an unsubscribe".
- Sent manual reply shows the live status "Sending within 5 minutes" until it is sent.
- Under 900px: list, then thread full width with a back button; the list keeps its scroll position.
- Empty: "No replies yet. Replies show up here within a minute."

### 5.8 Domains (\`/app/domains\`, \`/app/domains/new\`, \`/app/domains/[id]\`)

- List: toolbar "Domains", count, "Set up a domain" primary (disabled with tooltip at the plan limit: "Starter includes 2 domains. Upgrade for 3."). Table: domain, status pill, health dot, inboxes ("3 of 3"), sends left today, verified date.
- Setup wizard, StepWizard with 4 steps in one card:
  1. **Buy:** three lines on why a separate domain. Suggested names from the main domain (try, get, use, hey, with prefixes) as 36px rows with "Check on Porkbun" links. Input "Domain you bought". Amber-edged warning if it matches the main domain.
  2. **DNS:** DnsRecordRows for every record. Above them a segmented control "Porkbun" (default) / "Other DNS". The Porkbun view shows the Host already stripped of the domain, with the line "Porkbun > Domain Management > Details > DNS Records. Leave Host blank for the root." "Copy all as text" secondary.
  3. **Verify:** the same rows with live status. Auto check every 30 seconds for 10 minutes, then "Check again". A fixed-height status line: "DNS can take 5 to 30 minutes. You can leave this page; we will email you when it is verified." Invalid records show their reason in a tooltip ("The value is different from ours. Paste it again.").
  4. **Inboxes:** 2 suggested inbox rows from the sender name (olly@, olly.rosewell@) with display name inputs, "Create 2 inboxes" primary. Each created inbox row shows "Active", the ramp as a 3-segment bar labelled "20/day · 2 weeks", "25/day · 2 weeks", "up to 30", and today's cap.
- Domain detail: header row (domain, status, health), DNS table (read-only with "Check again"), inboxes table with CapacityMeter, a daily cap slider (5 to 30) whose caption explains "Today's cap is 20 while this inbox is new", and a pause switch.

### 5.9 Analytics (\`/app/analytics\`)

- Toolbar: "Analytics", date range segmented control (7, 30, 90 days), campaign select.
- 5 stat boxes: Sent, Delivered %, Bounce %, Reply %, Interested %. Percentages under 10% with one decimal ("3.4%"), above 10% none.
- Line chart (sends in accent, replies in green), bar chart of reply rate by step, two tables (per campaign, per inbox). Charts: 1px lines, no gridlines except 3 hairlines, axis text 12px faint, tooltips are floating boxes with the base shadow and tabular numbers. Empty: "Charts appear after your first 20 sends."

### 5.10 Recipient unsubscribe page (\`/u/[token]\`)

- No app chrome. A 420px centred box: "You're unsubscribed. {{sender_company}} won't email you again." A small undo link for 24 hours. No Outbounder marketing. Invalid token: "This link is not valid any more. You will not get further emails from this sender if you reply 'no'."

### 5.11 Free first-line generator (\`/tools/first-line-generator\`)

- Marketing layout (square, see LANDING.md). H1 "Free cold email first-line generator". Sub: "Paste a company website. Get 3 first lines based on what is on it."
- 46px URL input + "Generate first lines" button. Under it in faint: "3 free a day. No signup."
- Results: 3 boxes in reserved space (min-height set before results arrive), each with the first line in 14/22, the quoted source fact in muted, a copy icon button.
- After results: a hairline box with the accent edge: "Want this for 100 leads, sent for you? Try Outbounder free for 7 days."
- Limit reached: the input disables in place and shows "You have used today's 3. Enter your email to get 10 more."

## 6. States

Every data view designs four states: loading (48px skeleton rows or reserved boxes), empty (EmptyState), error (a coral-edged row with what went wrong and "Retry"), and success.

| Situation | Treatment |
| --- | --- |
| 402 limit reached | Dialog (520px, 10% from top): "You have used 350 of 350 leads this month. They reset on 1 Nov." Buttons "Upgrade to Growth" (primary) and "OK". |
| Lead failed in the pipeline | Coral status pill; the side panel shows the error in plain words and "Retry". |
| AgentMail down | Toast "Sending paused, retrying in 5 minutes"; banner after 15 minutes. |
| Domain not verified after 24 hours | Amber banner with a link to the DNS guide in Documentation. |
| Campaign auto-paused | Coral banner: "Paused: 6 of your last 100 emails bounced. Clean your list or check the domain." "Resume" disabled until the user confirms they fixed it. |
| Offline | Banner "You're offline. Changes will save when you reconnect." |

Toasts: base rules (bottom left, 4 seconds, at most four, no full stop): "Approved", "Copied", "Inbox created", "12 approved, 3 skipped".

| Screen | Empty copy | Error copy |
| --- | --- | --- |
| Dashboard | "Your first campaign starts with your buyer." | "Could not load your dashboard. Retry." |
| Campaigns | "No campaigns yet. Most people launch their first in 20 minutes." | "Could not load campaigns. Retry." |
| Leads | "No leads yet. Find 25 to start." | Failed job row with "Retry". |
| Review | "Nothing to review. Leads appear here as Claude writes them." | "Claude could not write this one. Edit it by hand or skip it." |
| Inbox | "No replies yet. Replies show up here within a minute." | "Could not load replies. Retry." |
| Domains | "Cold email needs its own domain. It takes about 20 minutes." | AgentMail's message in plain words and "Try again". |
| Analytics | "Charts appear after your first 20 sends." | "Could not load analytics. Retry." |

## 7. Motion (Outbounder additions only)

Base curves and durations apply. Additions:

- Live dots on working StatusPills, JobProgress and "Checking" DNS rows pulse at 1.4s. Nothing else loops.
- JobProgress and PipelineBar widths ease 400ms on the morph curve on each Realtime update.
- DNS rows: status pill cross-fades 160ms when it changes; the row never moves.
- Review queue: the next email fades in place, 200ms. No sideways slides.
- The landing page hero is the only place where text "types" in; inside the app AI text fades in over 200ms.
- Reduced motion: dots are static, bars jump to their value, everything else appears instantly.

## 8. Accessibility

- Base rules (visible focus, real roles, polite toasts, Escape closes overlays) apply.
- Every status uses a text label plus colour, never colour alone. Tag inks in 1.2 pass AA on their 7% fills at 12px.
- The review queue works fully by keyboard; shortcuts are ignored while typing in an input.
- PipelineBar and JobProgress expose \`role=progressbar\` with \`aria-valuenow\`; pipeline counts update an \`aria-live=polite\` region at most every 5 seconds.
- Copy buttons announce "Copied". Icon-only buttons have labels ("Copy host", "Copy value").
- Charts include a visually hidden table and a one-line summary ("Replies rose from 3 to 9 this week").

## 9. Responsive

- 1440: review queue reaches its 1440 max width; everything else fills the page.
- 1100: sidebar collapses to 56px icons (base).
- 900: two-column screens (sequence editor, inbox, review) switch to one column with an in-place toggle in the toolbar.
- 640: sidebar becomes the overlay drawer; tables keep fixed columns and scroll sideways inside their own container with the first column sticky; the selection bar spans the width minus 16px.
- Check every screen at 320, 375 and 430px with no page-level sideways scroll. The domain wizard shows a tip on phones: "Easier on a laptop: you'll copy records into Porkbun."

## 10. App emails (Resend)

- React Email, 560px white card, hairline border, 24px padding, Geist with Arial fallback, 14/22 text.
- Header: glyph and wordmark. One H2-size heading, one or two short paragraphs, one button styled like the app primary (white, accent edge, 40px, 6px radius) with a plain link under it.
- Interested reply alert: the reply snippet in a box with a 1px green edge; lead name and company in 500 above it.
- Footer: 12px faint: "You're getting this because you have an Outbounder account." and a settings link.

## 11. Page titles and meta

| Route | \`<title>\` | Meta description |
| --- | --- | --- |
| \`/\` | Outbounder: cold email that reads like you wrote it | Find verified B2B leads, write a first line from each company's website and send from safe inboxes on your own domain. 7-day free trial. |
| \`/pricing\` | Pricing: Outbounder | Starter $79 a month or Growth $179 a month. Leads, AI first lines and safe sending included. |
| \`/tools/first-line-generator\` | Free cold email first-line generator | Paste a company website and get 3 personalised first lines. Free, no signup. |
| \`/vs/instantly\` | Outbounder vs Instantly | An honest comparison for founders and small agencies. |
| \`/app/*\` | \`{{Page}}: Outbounder\` | noindex |

## 12. Screen inventory checklist

Tick each one in a Chrome DevTools MCP screenshot pass at 1440px and 375px:

- [ ] Login, signup, forgot password
- [ ] Onboarding: all 5 steps, live sample loading and loaded, Stripe return
- [ ] Dashboard empty and with data
- [ ] Campaigns list with filter chips and the selection bar
- [ ] Campaign builder steps 1 to 5, including the launch confirm morph
- [ ] Leads table: loading, empty, job running, job failed, side panel open, selection bar
- [ ] Sequence editor with lint warnings and a missing variable
- [ ] Review queue: ready, needs review, regenerate popover, done
- [ ] Domains list, wizard steps 1 to 4 with DNS rows in every status, domain detail
- [ ] Inbox: list, thread, low-confidence unsubscribe, composer sending, phone layout
- [ ] Analytics with data and empty
- [ ] Billing: trialing, Starter with upgrade box, Growth, paywall
- [ ] Settings tabs including Suppression; Documentation; Help; unsubscribe page
- [ ] 402 limit dialog, auto-pause banner, offline banner

## 13. Handoff rules for Claude Code

- Milestone 1: add the base tokens from DESIGN_SYSTEM.md section 11, then the accent overrides from section 1.1 of this file, then the components in section 3. Build a \`/dev/ui\` page with every component in every state and screenshot it before any screen. Delete it before launch.
- Never invent a size, radius or colour. If something is missing, reuse an existing token and add a line under "Decisions made during build" at the end of this file.
- Before marking a screen done, click every button that loads or counts and check nothing moved (base section 08).

## Decisions made during build

(Claude Code appends one line per decision: date, decision, reason.)
`
