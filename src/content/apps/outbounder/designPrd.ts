// Outbounder design PRD (DESIGN.md).

export const designPrd = `# Outbounder: Design PRD

Save as \`DESIGN.md\` in the repo root next to \`PRD.md\`. Claude Code reads both. This file decides how everything looks, moves and reads. Build with Tailwind and shadcn/ui; every colour comes from the tokens below, never a raw hex in a component.

## 1. Brand

- **Name:** Outbounder
- **Tagline:** Cold email that reads like you wrote it.
- **Personality:** calm operator. A sharp, quiet tool for people who send email for a living. Confident, specific, no hype.
- **Voice in UI copy:** short sentences, verbs first, numbers over adjectives. "25 emails ready to review" beats "Your personalised emails are ready!". No exclamation marks in product UI. British spelling.
- **Logo:** wordmark "outbounder" in lowercase, Inter Tight 600, with a small paper-plane glyph made of two triangles to the left. Glyph uses \`--primary\`. Favicon is the glyph alone on \`--primary\` with white glyph.
- **Imagery:** product screenshots and real email previews. No stock photos, no 3D blobs, no robots.

## 2. Design tokens

Define these as CSS variables in \`app/globals.css\` and map them into Tailwind (\`theme.extend.colors\`) and the shadcn theme. HSL values so shadcn works out of the box.

### 2.1 Colour, light

| Token | HSL | Use |
| --- | --- | --- |
| \`--background\` | \`220 20% 98%\` | App background |
| \`--surface\` | \`0 0% 100%\` | Cards, panels, tables |
| \`--surface-2\` | \`220 16% 96%\` | Table header, sidebar, inset areas |
| \`--border\` | \`220 13% 90%\` | Hairlines |
| \`--foreground\` | \`222 30% 12%\` | Body text |
| \`--muted-foreground\` | \`220 9% 44%\` | Secondary text, labels |
| \`--primary\` | \`221 83% 53%\` | Buttons, links, active nav, focus ring |
| \`--primary-foreground\` | \`0 0% 100%\` | Text on primary |
| \`--primary-soft\` | \`221 90% 96%\` | Selected rows, soft badges |
| \`--accent\` | \`199 89% 48%\` | Charts secondary series, info |
| \`--success\` | \`152 60% 38%\` | Verified, delivered, interested |
| \`--success-soft\` | \`152 60% 94%\` | |
| \`--warning\` | \`36 92% 48%\` | Pending DNS, not now, warming |
| \`--warning-soft\` | \`40 96% 93%\` | |
| \`--danger\` | \`0 72% 51%\` | Bounced, failed, unsubscribe |
| \`--danger-soft\` | \`0 86% 96%\` | |
| \`--violet\` | \`262 70% 58%\` | AI generated markers |
| \`--violet-soft\` | \`262 80% 96%\` | |
| \`--ring\` | \`221 83% 53%\` | Focus |

### 2.2 Colour, dark

| Token | HSL |
| --- | --- |
| \`--background\` | \`224 25% 7%\` |
| \`--surface\` | \`224 22% 10%\` |
| \`--surface-2\` | \`224 20% 13%\` |
| \`--border\` | \`224 15% 20%\` |
| \`--foreground\` | \`220 20% 94%\` |
| \`--muted-foreground\` | \`220 10% 62%\` |
| \`--primary\` | \`221 90% 62%\` |
| \`--primary-foreground\` | \`224 25% 7%\` |
| \`--primary-soft\` | \`221 50% 18%\` |
| \`--accent\` | \`199 85% 58%\` |
| \`--success\` | \`152 55% 48%\` |
| \`--success-soft\` | \`152 40% 15%\` |
| \`--warning\` | \`38 90% 56%\` |
| \`--warning-soft\` | \`38 50% 16%\` |
| \`--danger\` | \`0 75% 62%\` |
| \`--danger-soft\` | \`0 45% 17%\` |
| \`--violet\` | \`262 75% 70%\` |
| \`--violet-soft\` | \`262 35% 18%\` |

Dark mode follows the system by default with a toggle in settings (light, dark, system). Use \`next-themes\` with \`class\` strategy.

### 2.3 Type

- **UI and body:** Inter (variable), \`font-feature-settings: "cv11", "ss01"\`.
- **Headings:** Inter Tight 600.
- **Email previews:** the system font stack of a mail client so previews look like Gmail: \`-apple-system, "Segoe UI", Roboto, Arial, sans-serif\`, 14px, line-height 1.55.
- **Mono:** JetBrains Mono for DNS values, API ids, variables.

| Style | Size / line height | Weight | Use |
| --- | --- | --- | --- |
| Display | 56/60 (mobile 40/44) | 600 | Landing hero |
| H1 | 30/36 | 600 | Page titles |
| H2 | 22/28 | 600 | Section titles |
| H3 | 17/24 | 600 | Card titles |
| Body | 14/22 | 400 | Default UI |
| Body large | 16/26 | 400 | Landing paragraphs |
| Small | 12/16 | 500 | Labels, table meta, badges |
| Mono | 13/20 | 450 | DNS, variables |

Numbers in tables and stats use \`tabular-nums\`.

### 2.4 Space, radius, shadow

- Spacing scale: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64.
- Page padding: 24 desktop, 16 mobile. Max content width 1200, review queue 1440.
- Radius: \`--radius: 10px\`. Inputs and buttons 8, cards 12, dialogs 16, pills full.
- Shadow: cards \`0 1px 2px hsl(222 30% 12% / 0.06)\`. Popovers and dialogs \`0 12px 32px hsl(222 30% 12% / 0.14)\`. Dark mode drops shadows and uses borders.

## 3. Layout

- **App shell:** left sidebar 240px (collapsible to 64px icons), top bar 56px with page title, search (cmd+k), usage pill ("1,204 / 6,000 sends"), avatar menu.
- **Sidebar items:** Dashboard, Campaigns, Inbox (unread count badge), Domains, Analytics, Suppression, Settings. Bottom: trial pill ("Trial: 4 days left") or plan pill, Billing.
- **Mobile (<768px):** sidebar becomes a bottom tab bar with Dashboard, Campaigns, Inbox, Domains, More.

## 4. Components

Built on shadcn/ui. List of what to install: button, input, textarea, select, checkbox, switch, tabs, dialog, sheet, dropdown-menu, popover, tooltip, badge, card, table, toast (sonner), progress, skeleton, command, separator, scroll-area, slider, alert.

Custom components:

| Component | Description |
| --- | --- |
| \`StatusPill\` | Dot + label. Maps every \`lead_status\`, \`campaign_status\`, \`message_status\`, \`domain_status\`, \`inbox_status\` to a tone. found/verifying/enriching/personalising = muted with a pulsing dot. ready = primary. approved = success outline. sending = primary solid. replied = success solid. bounced/failed = danger. unsubscribed = danger outline. needs_review = warning. |
| \`PipelineBar\` | Horizontal stacked bar for a campaign: found, verified, enriched, ready, approved, sent. Labels with counts under it. Animates width on update. |
| \`StatCard\` | Label, big number (tabular), delta vs last 7 days, optional sparkline. |
| \`DnsRecordRow\` | Type badge (TXT, MX, CNAME), host in mono with copy button, value in mono truncated with expand and copy button, priority if MX, status chip (Waiting, Checking, Verified, Failed). |
| \`EmailPreview\` | Looks like a mail client message: from line (avatar initials, sender name, inbox email), to line, subject bold, body in mail font, footer greyed. Variables rendered; unresolved variables show as red pill \`{{missing}}\`. |
| \`VariableChip\` | Mono pill \`{{first_name}}\` in \`--primary-soft\`. Insert on click in editor. |
| \`AiMark\` | Small violet sparkle icon + "AI" label on any AI-generated field. Tooltip: "Written by Claude from {{source_url}}". |
| \`ConfidenceMeter\` | 5 small bars filled by confidence. Under 0.5 warning tone. |
| \`ClassificationBadge\` | interested (success), not_now (warning), unsubscribe (danger), ooo (muted), other (muted outline). |
| \`CapacityMeter\` | Per inbox: "12 / 20 today" with a bar and the next send time. |
| \`KeyboardHint\` | Small kbd tags shown in review queue footer: A approve, E edit, R regenerate, X reject, J/K next/prev. |
| \`EmptyState\` | Icon, title, one line, one primary button. |
| \`StepWizard\` | Numbered steps along the top, content card, Back / Continue footer. Continue disabled until valid. |

Buttons: primary (solid \`--primary\`), secondary (surface + border), ghost, destructive. Height 36 default, 32 small, 44 large on landing. Icons from \`lucide-react\` at 16px.

## 5. Screens

### 5.1 Landing page (\`/\`)

1. **Nav:** wordmark, links (How it works, Pricing, Free tool, Login), primary button "Start free trial".
2. **Hero:** left column: eyebrow "For founders and agencies who send their own outbound". H1 "Cold email that reads like you wrote it." Sub: "Describe who you sell to. Outbounder finds the leads, reads their websites, writes a first line for each one and sends from safe inboxes on your own domain." Primary CTA "Start 7-day free trial", secondary "Try the free first-line generator". Under CTAs: "$79/mo after trial. Cancel in two clicks."
   Right column: an animated product card. A lead row ("Sarah Lee, Founder, Northpeak Studio") expands into an EmailPreview where the first line types in with a violet AI mark, then the status pill turns from personalising to ready.
3. **Proof strip:** "Each email cites something real from the lead's site" with three small cards showing first lines and the source URL under each.
4. **How it works:** 4 numbered columns: Describe your buyer, Find and verify, Personalise and review, Send and reply. Each with a small screenshot.
5. **Deliverability section:** dark band. Headline "Safe by default." Four facts with icons: separate outreach domain, 20 a day per inbox to start, plain text with no tracking, unsubscribe on every email.
6. **Unified inbox section:** screenshot of inbox with classification badges. "Know who's interested in one glance."
7. **Comparison table:** Outbounder vs "4 tools stitched together" (lead database, verifier, sequencer, ChatGPT). Rows: price, setup time, personalisation, deliverability guardrails.
8. **Pricing card:** single plan, $79/mo, list of limits, CTA.
9. **FAQ:** 8 questions (Do I need my own domain? Which leads database? Will this land in spam? Can I edit every email? What happens after the trial?).
10. **Footer:** links, "Made with Outbounder: every customer came from a cold email sent with this tool."

### 5.2 Auth (\`/login\`, \`/signup\`)

- Split layout on desktop: form left (max 380px), right panel \`--surface-2\` with a single EmailPreview and a quote. Mobile: form only.
- Fields: full name (signup), email, password with show/hide. "Continue with Google" button above a divider "or".
- Errors inline under the field in \`--danger\`, small. Button shows spinner and "Creating account..." while loading.
- After signup go straight to onboarding. No "check your email" step (confirm email off).

### 5.3 Onboarding: ICP wizard (\`/app/onboarding\`)

- Full-screen focus layout without sidebar. Top: wordmark, step dots (1 Who, 2 Where, 3 Company, 4 Offer), "Save and exit".
- **Step 1, Who:** H1 "Who do you sell to?" Chip input for job titles with suggestions row. Seniority as toggle chips. Right side helper card: "Tip: 2 to 5 titles. Founders and heads of department reply most."
- **Step 2, Where:** country multi-select with flags, optional city/state chips.
- **Step 3, Company:** employee ranges as toggle cards (1-10, 11-50, 51-200, 201-500). Industry keywords chip input. Exclude keywords chip input.
- **Step 4, Offer:** website URL, "What do you sell, in one sentence?", "One line of proof (optional)", sender name, company, physical address. Character counters.
- **Live sample panel** (step 4, right side on desktop, below on mobile): skeleton while loading ("Finding a company that matches... Reading northpeak.studio..."), then an EmailPreview with the AI first line highlighted in \`--violet-soft\`. Button "Try another company".
- Continue on step 4 = "Start 7-day free trial" (to Stripe). Returning: "Checking your trial..." spinner card, then step 5.
- **Step 5, Domain:** card with three bullets explaining the separate domain, buttons "Set up my sending domain" and "Do this later".

### 5.4 Dashboard (\`/app\`)

- Row of 4 StatCards: Sent this week, Reply rate (7d), Interested (7d), Sends left today (sum of capacity).
- **Next steps checklist** card until onboarding is complete (ticks animate).
- **Campaigns** card: top 5 active with PipelineBar and status.
- **Interested replies** card: last 5 with lead, company, snippet, time, "Open".
- **Domain health** card: each domain with health dot and bounce rate; inboxes with CapacityMeter.
- Empty: EmptyState "Your first campaign starts with your buyer" + "Create campaign".

### 5.5 Campaign builder (\`/app/campaigns/new\`)

StepWizard with 5 steps across the top. Sidebar stays visible.

1. **ICP:** same fields as onboarding steps 1 to 3, prefilled from profile, plus campaign name. Right: "Estimated matches: about 4,300 people" (from Apollo total) updates on change with a 600ms debounce.
2. **Leads:** count selector (25, 50, 100, 250) as segmented control with plan usage under it. "Find leads" button. After click, a live table fills as leads arrive with StatusPill per row and a PipelineBar on top. User can continue while it runs.
3. **Sequence:** the sequence editor (5.7) embedded.
4. **Inboxes and schedule:** pick inboxes (checkbox cards showing CapacityMeter and domain health), send days chips (Mon to Sun), window start/end time selects, time zone fallback select. Capacity summary: "2 inboxes x 20 a day x 4 days = 160 sends a week. 100 leads x 3 steps finishes in about 3 weeks."
5. **Review and launch:** counts (ready, approved, needs review), link to review queue, checklist (domain verified, at least 1 inbox, at least 10 approved, signature and address set). "Launch campaign" primary button disabled until checklist passes. Confirmation dialog: "Start sending to 64 approved leads? First emails go out tomorrow 08:00 in each lead's time zone."

### 5.6 Leads table (\`/app/campaigns/[id]/leads\`)

- Toolbar: search, status filter (multi), "Needs review" quick filter, column toggle, "Upload CSV", "Export CSV".
- Columns: checkbox, Name + title (two lines), Company + domain link, Email (mono, verify icon), Location + local time ("09:14 local"), Enrichment (icon states: not started, scraping spinner, scraped tick with page count, empty warning), Personalisation (ConfidenceMeter + AiMark), Status (StatusPill), Step (1/3), Next send.
- Row click opens a right Sheet (480px) with: lead details, scraped summary with source links, AI fields, message history for this lead, actions (Approve, Reject, Regenerate, Remove, Suppress).
- Live updates: subscribe to Supabase Realtime on \`leads\` filtered by campaign. Row status changes flash \`--primary-soft\` for 600ms.
- Bulk actions bar slides up from the bottom when rows are selected: Approve, Reject, Re-run enrichment, Remove.
- Virtualised rows above 200 leads.
- Empty: "No leads yet. Find 25 to start." Loading: 8 skeleton rows.

### 5.7 Sequence editor with live preview (\`/app/campaigns/[id]/sequence\`)

- Two columns on desktop (55/45). Left: steps list as stacked cards (Step 1, Step 2 after 3 days, Step 3 after 5 days, "Add step" up to 3). Each card: delay input (days), "Same thread / New thread" toggle, subject input, body textarea (auto-grow, mono variables highlighted), variable chips row under the body.
- Variables: \`{{first_name}}\`, \`{{company}}\`, \`{{title}}\`, \`{{ai_first_line}}\`, \`{{ai_pain}}\`, \`{{sender_name}}\`, \`{{city}}\`.
- Lint row under each body: word count ("62 words"), warnings as small warning badges (Link in step 1, Over 120 words, Spam word: "guarantee", Missing variable in lead data).
- Right: sticky EmailPreview. Lead picker at top ("Preview as: Sarah Lee, Northpeak Studio" with prev/next arrows). Step tabs above preview. Unresolved variables show as red pills. Footer and unsubscribe line rendered greyed so the user sees the full email.
- Autosave every 1s after typing stops; "Saved" text in muted near the title.
- Mobile: preview becomes a toggle "Edit / Preview" segmented control at top.

### 5.8 Review queue (\`/app/campaigns/[id]/review\`)

- Focus layout. Top bar: progress "14 of 64 reviewed", filter (Ready, Needs review, All), "Approve all above 0.8" button (enabled after 10 manual reviews; confirmation dialog shows the count).
- Left 60%: EmailPreview in edit mode. Subject and body inline editable. First line shown with violet highlight and AiMark. Edited fields get a small "Edited" tag.
- Right 40%: **Why this line** panel: signal quote, source URL link, scraped summary (3 bullets), Apollo fields (title, company size, location), ConfidenceMeter, skip reason if any in a warning Alert.
- Regenerate opens a popover with a hint input ("Mention their new podcast") and "Regenerate" button. While running, the preview body shows a shimmer.
- Footer: Reject (X), Edit (E), Regenerate (R), Approve (A, primary). J/K to move. After approve, card slides left and the next slides in (200ms).
- Done state: "All 64 reviewed. 58 approved." Button "Back to launch".

### 5.9 Domain setup wizard (\`/app/domains\`, \`/app/domains/new\`)

StepWizard, 4 steps:

1. **Buy a domain:** explanation card ("Use a separate domain like tryacme.com. Your main domain stays safe."), suggested names generated from the main domain (try, get, use, hey, with prefixes) with a "Check on Porkbun" link each, input "Domain you bought". Warning Alert if it matches the main domain.
2. **Add DNS records:** list of DnsRecordRow for every record AgentMail returned (MX, SPF TXT, DKIM, DMARC TXT, any verification TXT). Above the list: "Open Porkbun > Domain Management > your domain > DNS. Add each record below. Host is the part before your domain." Tabs: "Porkbun" (default, with Porkbun-specific notes: leave host blank for root, Porkbun appends the domain) and "Other DNS". Each row has its own copy buttons; a "Copy all as text" button at the top.
3. **Verify:** live status per record. Auto check every 30 seconds for 10 minutes, then a "Check again" button. Each chip moves Waiting > Checking (spinner) > Verified (green tick, small scale animation) or Failed (with "Common fix" tooltip: "Remove the domain name from the Host field"). Overall banner: "DNS can take 5 to 30 minutes. You can leave this page; we'll email you when it's verified."
4. **Create inboxes:** 2 suggested inboxes prefilled from sender name (\`olly@\`, \`o.rosewell@\`), display name input. "Create 2 inboxes". Each card then shows the email, status warming, and the ramp schedule ("10/day this week, 15 next week, 20 after").

Domain detail page: header with domain and health dot, DNS table (same rows, read-only with recheck), inboxes table with CapacityMeter, daily cap slider (disabled with reason until rules pass), pause toggle.

### 5.10 Unified inbox (\`/app/inbox\`)

- Three panes on desktop: filters (180px), thread list (360px), thread view (rest).
- Filters: All, Interested, Not now, Unsubscribe, OOO, Other, Unread; then by campaign and by inbox.
- Thread list rows: unread dot, lead name bold, company, ClassificationBadge, snippet (1 line), time. Selected row \`--primary-soft\`.
- Thread view: header (lead, company, campaign, inbox), label dropdown to correct the classification, actions (Mark done, Suppress, Open lead). Messages as stacked cards, outbound ones aligned with a subtle \`--surface-2\` background, inbound plain. Reply composer at the bottom (plain textarea, "Send from olly@tryacme.com", cmd+enter).
- Low-confidence unsubscribe shows a warning Alert in the thread: "Looks like an unsubscribe. Confirm?" with Confirm / Not an unsubscribe.
- Mobile: list then thread as a full screen with back.
- Empty: "No replies yet. Replies show up here within a minute."

### 5.11 Analytics (\`/app/analytics\`)

- Date range picker (7d, 30d, 90d). Campaign filter.
- StatCards: Sent, Delivered %, Bounce %, Reply %, Interested %.
- Line chart: sends and replies per day (primary and success). Bar chart: reply rate by step. Table: per campaign (sent, replies, interested, bounce). Table: per inbox (sent, bounce, complaints, health).
- Charts use Recharts with token colours, no gridlines on Y except 3 light lines, tooltips with tabular numbers.

### 5.12 Billing and paywall (\`/app/billing\`)

- Active: plan card ($79/mo, renews on date), usage meters (leads, personalised, sends), "Manage billing" (Stripe Portal).
- Trialing: banner "Trial: 4 days left. Your card is charged $79 on 22 Oct." and the same meters.
- Inactive paywall: centred card over a blurred dashboard screenshot. H2 "Your campaigns are paused". List of what is waiting ("3 campaigns, 412 leads, 18 replies"). Primary "Restart for $79/mo". Secondary "Manage billing".

### 5.13 Settings (\`/app/settings\`)

- Tabs: Profile, Sender, Integrations, Appearance.
- Sender: sender name, company, physical address, signature preview, default send window, time zone.
- Integrations: Apollo API key input (password field, "Connected, ends in abcd" after save, "Test connection" button).
- Appearance: theme toggle.

### 5.14 Suppression (\`/app/suppression\`)

- Table: email or domain, reason badge, source, date. Add (email or domain), Import CSV, Remove (with confirm). Search.

### 5.15 Unsubscribe page (\`/u/[token]\`)

- Minimal, no app chrome, light only. Centred card: "You're unsubscribed. {{sender_company}} won't email you again." Small undo link valid 24h. No Outbounder marketing.

### 5.16 Pricing page (\`/pricing\`)

- H1 "One plan. Everything included." Sub: "7 days free, then $79 a month."
- Single plan card centred (max 480px): price in Display size with "/mo" in muted, limits list with check icons (1,500 leads found, 1,500 personalised emails, 6,000 sends, 3 sending domains, 9 inboxes, unified inbox with AI labels), primary "Start 7-day free trial".
- Under the card: "What you'd pay for the same stack" small table (lead database, verifier, sequencer, inboxes, AI writing) with a muted total. Numbers dated ("Prices checked Oct 2026").
- FAQ accordion, 6 items.

### 5.17 Free first-line generator (\`/tools/first-line-generator\`)

- Marketing layout (landing nav and footer).
- H1 "Free cold email first-line generator". Sub: "Paste a company website. Get 3 first lines based on what's on it."
- Input row: URL field (large, 48px) + "Generate" button. Under it: "3 free per day. No signup."
- Result: 3 cards, each with the first line in the mail font, the source fact quoted under it in muted small text, and a copy button. Cards stagger in 80ms apart.
- After the 3 cards: a soft CTA card in \`--primary-soft\`: "Want this for 100 leads, with the emails sent for you? Try Outbounder free for 7 days."
- Limit hit: the input disables and shows "You've used today's 3. Enter your email to get 10 more." with an email field.
- Loading: 3 skeleton cards and a step line: "Reading northpeak.studio... Writing..."

### 5.18 Comparison pages (\`/vs/[competitor]\`)

- H1 "Outbounder vs {{Competitor}}". 2-line honest verdict.
- Comparison table with columns Outbounder and Competitor, rows: price (with date), lead database included, email verification, AI personalisation from site, sending inboxes included, warm-up, unified inbox, setup time.
- Two cards side by side: "Choose {{Competitor}} if..." and "Choose Outbounder if...". Same visual weight; do not make the competitor card look worse.
- Migration in 3 steps, FAQ, last-updated date at the bottom.

## 5b. Transactional email design (Resend)

- Built with React Email. Width 560px, white card on \`#F6F7F9\`, 32px padding, Inter with Arial fallback.
- Header: glyph + wordmark, 24px tall. No hero images.
- One H1 (22px), one or two short paragraphs, one primary button (\`--primary\`, 8px radius, 44px tall), plain link fallback under the button.
- Interested reply alert: a quoted box with the reply snippet (left border 3px \`--success\`), lead name and company bold above it.
- Footer: muted 12px, "You're getting this because you have an Outbounder account." with a settings link.
- Dark mode: let mail clients invert; avoid transparent PNGs.

## 5c. Iconography and data viz

- Icons: \`lucide-react\` only. Mapping: Dashboard \`LayoutDashboard\`, Campaigns \`Send\`, Inbox \`Inbox\`, Domains \`Globe\`, Analytics \`BarChart3\`, Suppression \`ShieldOff\`, Settings \`Settings\`, AI \`Sparkles\`, verified \`BadgeCheck\`, scraping \`Globe2\`, bounce \`MailX\`.
- Charts: Recharts. Series colours in order: \`--primary\`, \`--success\`, \`--accent\`, \`--warning\`, \`--violet\`. Never more than 5 series. Axis text \`--muted-foreground\` 12px. Tooltips are surface cards with border and tabular numbers.
- Sparklines in StatCards: 64x24, 1.5px stroke, no axes, last point dot.
- Percentages always with one decimal under 10% ("3.4%") and none above ("42%").

## 5d. Command menu (cmd+k)

- shadcn \`command\`. Groups: Go to (every page), Campaigns (search by name), Leads (search by email or company across campaigns), Actions (New campaign, Add domain, Toggle theme).
- Opens at 640px wide, 60vh max, with recent items first.

## 5e. Screen inventory checklist

Tick each one in a Chrome DevTools MCP screenshot pass, light and dark, at 1440px and 375px:

- [ ] Landing, pricing, free tool, one vs page
- [ ] Login, signup, forgot password, reset password
- [ ] Onboarding steps 1 to 5, including the live sample loading and loaded
- [ ] Dashboard empty and with data
- [ ] Campaigns list empty and with data
- [ ] Campaign builder steps 1 to 5
- [ ] Leads table: loading, empty, live pipeline, row sheet open, bulk bar
- [ ] Sequence editor with lint warnings and missing variable
- [ ] Review queue: ready, needs review, regenerate popover, done state
- [ ] Domain wizard steps 1 to 4, DNS rows in each status
- [ ] Domain detail
- [ ] Unified inbox: list, thread, low-confidence unsubscribe alert, mobile thread
- [ ] Analytics with data and empty
- [ ] Billing: trialing, active, paywall
- [ ] Settings tabs, suppression page, unsubscribe page
- [ ] 402 limit dialog, auto pause banner, offline bar

## 6. States

Every data view has four states designed: loading (skeletons matching the layout), empty (EmptyState), error (Alert with retry), and success.

| Situation | Treatment |
| --- | --- |
| Edge function 402 limit reached | Dialog: "You've used 1,500 of 1,500 leads this month." Link to billing. |
| Pipeline failed lead | Row shows danger pill and the error in the Sheet with "Retry" |
| AgentMail API down | Toast "Sending paused, retrying in 5 minutes", banner on dashboard if over 15 minutes |
| Domain not verified after 24h | Amber banner on domain card with a link to the fix guide |
| Campaign auto paused | Red banner at the top of the campaign with reason and "Resume" (disabled until bounce rate check passes or user confirms) |
| Offline | Small top bar "You're offline. Changes will save when you reconnect." |

Toasts (sonner) bottom right, 4 seconds, one line, verb first: "Approved", "Copied", "Inbox created".

## 7. Motion

- Durations: 120ms for hovers and presses, 200ms for panels and cards, 300ms for page-level transitions. Easing \`cubic-bezier(0.2, 0.8, 0.2, 1)\`.
- Pipeline status changes: pill cross-fades, row flashes \`--primary-soft\`.
- Review queue: card slide left on approve, right on reject (translateX 24px + fade).
- DNS verify tick: scale 0.8 to 1 with a 150ms spring.
- AI text: first line types in on the landing page only (40ms per character). In the app, AI text fades in.
- Respect \`prefers-reduced-motion\`: replace all transforms with opacity fades and turn off typing.

## 8. Accessibility

- WCAG 2.2 AA contrast for text and status pills in both themes (check every soft background with its text colour).
- Every status uses icon or text plus colour, never colour alone.
- Keyboard: full review queue by keyboard, focus visible ring 2px \`--ring\` with 2px offset. Command menu on cmd+k. Skip link to main content.
- Tables have proper \`th\` scope, sortable headers announce sort state.
- Live regions: pipeline counts and toasts use \`aria-live="polite"\`.
- Forms: labels always visible (no placeholder-only), errors linked with \`aria-describedby\`.
- Copy buttons announce "Copied" to screen readers.
- Touch targets 44px on mobile.

## 9. Mobile

- Priority on mobile: inbox (reply to interested leads on the go), dashboard, review queue (approve/reject with large buttons and swipe).
- Leads table becomes a card list: name, company, status pill, step.
- Sequence editor uses Edit / Preview toggle.
- Domain wizard works on mobile but shows a tip: "Easier on a laptop: you'll copy records into Porkbun."
- No horizontal scroll at 360px width. Tables that cannot collapse become cards.

## 10. Content rules for the UI

- Numbers before words: "12 replies" not "Replies: 12".
- Times in the user's time zone with the lead's local time in brackets where it matters: "Sends 14:00 (09:00 local)".
- Never say "AI magic". Say "Written by Claude from northpeak.studio/about".
- Error copy says what happened and what to do: "Firecrawl couldn't read this site. Edit the first line by hand or skip this lead."

## 11. Component states

| Component | Default | Hover | Focus | Active / pressed | Disabled | Loading |
| --- | --- | --- | --- | --- | --- | --- |
| Primary button | \`--primary\` bg, white text | 6% darker | 2px ring + 2px offset | scale 0.98 | 40% opacity, no pointer | spinner left of label, label changes to verb + "ing..." |
| Secondary button | surface, border | \`--surface-2\` bg | ring | scale 0.98 | 40% opacity | spinner |
| Input | surface, border | border 20% darker | ring, border \`--primary\` | n/a | \`--surface-2\` bg | right-aligned spinner |
| Table row | surface | \`--surface-2\` | ring inset | \`--primary-soft\` when selected | 50% opacity text | skeleton bars per cell |
| DnsRecordRow chip | Waiting (muted) | n/a | n/a | Checking (spinner) | n/a | Verified (success) / Failed (danger) |
| Copy button | ghost icon \`Copy\` | \`--surface-2\` | ring | icon swaps to \`Check\` for 1.5s | n/a | n/a |
| StatusPill | tone dot + text | tooltip with timestamp of last change | n/a | n/a | n/a | pulsing dot for working states |
| EmailPreview | read-only | n/a | n/a | edit mode outlines editable fields with dashed \`--border\` | n/a | shimmer on body |

## 12. Page titles and meta

| Route | \`<title>\` | Meta description |
| --- | --- | --- |
| \`/\` | Outbounder: cold email that reads like you wrote it | Find B2B leads, personalise every first line from their website and send from safe inboxes on your own domain. 7-day free trial. |
| \`/pricing\` | Pricing: Outbounder | One plan, $79 a month, everything included. |
| \`/tools/first-line-generator\` | Free cold email first-line generator | Paste a company website and get 3 personalised first lines. Free, no signup. |
| \`/vs/instantly\` | Outbounder vs Instantly | An honest comparison for founders and small agencies. |
| \`/app/*\` | \`{{Page}}: Outbounder\` | noindex |

## 13. Handoff rules for Claude Code

- Build tokens and the component list first (milestone 1). Screenshot a "kitchen sink" page at \`/dev/ui\` with every component in every state before building screens. Delete the page before launch.
- Every screen is checked at 375px and 1440px in both themes with Chrome DevTools MCP screenshots before the milestone is marked done.
- If a design decision is missing here, pick the simplest option that matches these tokens and write it into this file under a new heading "Decisions made during build".
`
