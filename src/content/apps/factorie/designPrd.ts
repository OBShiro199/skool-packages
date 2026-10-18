// Factorie design PRD (DESIGN.md). Backticks are escaped.

export const designPrd = `# Factorie: Design PRD

Save as \`DESIGN.md\` in the project root next to \`PRD.md\`. In Claude Code, refer to it as \`@DESIGN.md\`. This file decides how everything looks, moves and reads. Build with Tailwind and shadcn/ui. Every colour comes from the tokens below, never a raw hex inside a component. Charts use Recharts.

## 1. Brand

- **Name:** Factorie
- **Tagline:** See where AI recommends you.
- **Personality:** an analyst you trust. Dense where it matters, calm everywhere else. Feels like a serious analytics product (think Linear's restraint plus a Bloomberg-style data table), never like a toy.
- **Voice in UI copy:** short, specific, numbers first. "Mentioned in 9 of 25 ChatGPT answers" beats "Great visibility!". No exclamation marks in product UI. British spelling.
- **Logo:** wordmark "factorie" in lowercase, Inter Tight 600, letter-spacing -0.02em. Glyph to the left: three vertical bars of rising height (a tiny bar chart), the tallest topped with a dot, in \`--primary\`. Favicon: glyph in white on a \`--primary\` rounded square (radius 6 on 32px).
- **Imagery:** real product screenshots, real answer snippets with highlights. No stock photos, no robots, no glowing brains.

## 2. Design tokens

Define these as CSS variables in \`app/globals.css\`, map into Tailwind (\`theme.extend.colors\`) and the shadcn theme. HSL values so shadcn works as-is.

### 2.1 Colour, light

| Token | HSL | Use |
| --- | --- | --- |
| \`--background\` | \`240 20% 99%\` | App background |
| \`--surface\` | \`0 0% 100%\` | Cards, tables, panels |
| \`--surface-2\` | \`240 14% 97%\` | Sidebar, table header, insets |
| \`--surface-3\` | \`240 12% 94%\` | Hover rows, skeletons |
| \`--border\` | \`240 10% 90%\` | Hairlines |
| \`--border-strong\` | \`240 8% 82%\` | Inputs, focused card |
| \`--foreground\` | \`240 24% 10%\` | Body text |
| \`--muted-foreground\` | \`240 7% 44%\` | Labels, secondary text |
| \`--primary\` | \`258 78% 58%\` | Buttons, active nav, focus ring, brand series |
| \`--primary-foreground\` | \`0 0% 100%\` | Text on primary |
| \`--primary-soft\` | \`258 90% 96%\` | Selected rows, brand highlight background |
| \`--success\` | \`152 60% 36%\` | Positive delta, brand mention highlight text |
| \`--success-soft\` | \`150 60% 94%\` | Brand highlight background |
| \`--danger\` | \`0 72% 50%\` | Negative delta, errors, competitor highlight text |
| \`--danger-soft\` | \`0 86% 96%\` | Competitor highlight background |
| \`--warning\` | \`36 92% 46%\` | Budget, partial runs |
| \`--warning-soft\` | \`40 96% 93%\` | Warning banners |
| \`--info\` | \`210 80% 48%\` | Cited URL highlight text |
| \`--info-soft\` | \`210 90% 95%\` | URL highlight background |

### 2.2 Colour, dark

| Token | HSL |
| --- | --- |
| \`--background\` | \`240 18% 6%\` |
| \`--surface\` | \`240 14% 9%\` |
| \`--surface-2\` | \`240 12% 12%\` |
| \`--surface-3\` | \`240 10% 16%\` |
| \`--border\` | \`240 8% 18%\` |
| \`--border-strong\` | \`240 7% 26%\` |
| \`--foreground\` | \`240 10% 94%\` |
| \`--muted-foreground\` | \`240 6% 62%\` |
| \`--primary\` | \`258 85% 68%\` |
| \`--primary-foreground\` | \`240 24% 8%\` |
| \`--primary-soft\` | \`258 40% 18%\` |
| \`--success\` | \`152 55% 52%\` |
| \`--success-soft\` | \`152 40% 14%\` |
| \`--danger\` | \`0 75% 62%\` |
| \`--danger-soft\` | \`0 45% 16%\` |
| \`--warning\` | \`38 92% 58%\` |
| \`--warning-soft\` | \`38 50% 15%\` |
| \`--info\` | \`210 85% 64%\` |
| \`--info-soft\` | \`210 45% 16%\` |

Theme follows the system by default, with a toggle in the user menu (light, dark, system) stored in \`localStorage\` under \`fac-theme\`. Apply the class before paint (inline script in \`<head>\`) so there is no flash.

### 2.3 Chart palette

Charts use their own tokens so series colours stay stable across pages. The brand is always \`--chart-brand\` (the primary violet). Competitors take \`--chart-1\` to \`--chart-6\` in the order they were added. "Others" is always \`--chart-muted\`.

| Token | Light HSL | Dark HSL | Used for |
| --- | --- | --- | --- |
| \`--chart-brand\` | \`258 78% 58%\` | \`258 85% 68%\` | Your brand |
| \`--chart-1\` | \`199 80% 44%\` | \`199 80% 58%\` | Competitor 1 |
| \`--chart-2\` | \`24 88% 52%\` | \`24 90% 62%\` | Competitor 2 |
| \`--chart-3\` | \`168 64% 38%\` | \`168 55% 50%\` | Competitor 3 |
| \`--chart-4\` | \`330 70% 52%\` | \`330 70% 64%\` | Competitor 4 |
| \`--chart-5\` | \`45 90% 46%\` | \`45 90% 58%\` | Competitor 5 |
| \`--chart-6\` | \`220 14% 46%\` | \`220 12% 62%\` | Competitor 6+ (cycle with 70% opacity after 6) |
| \`--chart-muted\` | \`240 6% 80%\` | \`240 6% 32%\` | Others, gridlines fill |
| \`--chart-grid\` | \`240 10% 92%\` | \`240 8% 16%\` | Gridlines |

Engines have fixed colours too (for engine lines and legend chips): ChatGPT \`160 60% 38%\`, Perplexity \`190 70% 40%\`, Gemini \`217 85% 55%\`, Claude \`20 70% 52%\`, Grok \`240 6% 30%\` (light) / \`240 6% 80%\` (dark), DeepSeek \`230 70% 56%\`, Meta Llama \`210 90% 45%\`. These are UI colours only. Never use engine company logos (trademark). Use a neutral letter mark in a circle (C, P, G, Cl, X, D, L) in the engine colour.

### 2.4 Type

- **UI:** Inter (variable) via \`next/font/google\`. Headings Inter Tight 600.
- **Numbers:** Inter with \`font-variant-numeric: tabular-nums\` everywhere numbers sit in columns or animate.
- **Mono:** JetBrains Mono for raw answers toggle, ids, curl snippets.

| Style | Size / line height | Weight | Use |
| --- | --- | --- | --- |
| \`display\` | 36 / 40 | 600, -0.02em | Big score on overview |
| \`h1\` | 24 / 32 | 600 | Page titles |
| \`h2\` | 18 / 26 | 600 | Card titles |
| \`h3\` | 15 / 22 | 600 | Section labels inside cards |
| \`body\` | 14 / 22 | 400 | Default |
| \`small\` | 13 / 20 | 400 | Table cells |
| \`micro\` | 11 / 16 | 500, uppercase, 0.04em | Column headers, tags |
| \`metric\` | 28 / 32 | 600, tabular | Score card values |

### 2.5 Spacing, radius, elevation

- 4px grid. Page padding 24px desktop, 16px mobile. Card padding 20px. Gap between cards 16px.
- Radius: 8px cards and inputs, 6px buttons, 999px pills, 4px highlight marks.
- Elevation: cards have a 1px \`--border\` and no shadow. Popovers, dropdowns and sheets: \`0 8px 24px -8px hsl(240 30% 10% / 0.18)\`. Dark mode: same shadow at 0.5 alpha plus \`--border\`.
- Max content width 1440px. Tables can go full width.

## 3. Layout

### 3.1 App shell

\`\`\`
+--------------------------------------------------------------------------+
| [glyph] factorie   [Brand switcher v]        [Search /]  [Run status] [U] |  top bar 56px
+-----------+--------------------------------------------------------------+
| [logo]    |  Page title                       [Range 30d v] [Recheck all]|
| Overview  |  ----------------------------------------------------------- |
| Prompts   |  content                                                     |
| Competit. |                                                              |
| Sources   |                                                              |
| Recommend.|                                                              |
|           |                                                              |
| [usage]   |                                                              |
| Docs      |                                                              |
| Help      |                                                              |
| Billing   |                                                              |
| Settings  |                                                              |
+-----------+--------------------------------------------------------------+
  sidebar 232px (collapsible to 64px icons)
\`\`\`

- **Sidebar rule:** one level only, no nested menus, 9 items. Top group: logo, then Overview, Prompts, Competitors, Sources, Recommendations. Bottom group pinned to the bottom, always in this order: Documentation, Help, Billing, Settings. Runs opens from the run status chip; settings sub-sections are tabs inside Settings.
- Sidebar: \`--surface-2\`, nav items 36px tall, icon (lucide) + label, active item \`--primary-soft\` background with \`--primary\` text and a 2px left bar. Above the bottom group: usage meter "Prompts 18/25", "Rechecks today 2/5", plan badge, Upgrade link on Starter.
- Top bar: brand switcher (avatar letter + brand name + domain, dropdown lists brands and "Add brand" when the plan allows), command search (\`/\` focuses, searches prompts and competitors), run status chip ("Checking 42/125" with a small progress ring while a run is active, else "Last check 3h ago"), user menu (theme, log out).
- Mobile (< 768px): sidebar becomes a bottom sheet opened from a menu button; top bar keeps glyph, brand switcher (name only) and run status. Tables become stacked cards.

### 3.2 Page header pattern

Title (h1), one-line description in \`--muted-foreground\`, right-aligned actions. Under it an optional filter bar (engine chips, date range, intent) that sticks below the top bar on scroll.

## 4. Components

Build these in \`components/fac/\`. Each has light, dark, loading and empty states.

| Component | Spec |
| --- | --- |
| \`ScoreCard\` | Label (micro), value (metric), delta pill (green up / red down / grey flat, with sign and "vs last week"), 7-point sparkline 32px tall at the bottom in \`--chart-brand\`. Info icon with tooltip that explains the formula in one sentence. |
| \`DeltaPill\` | 20px tall, \`--success-soft\`/\`--danger-soft\` background, arrow icon 12px, tabular number. For average position, lower is better, so the colour logic inverts. |
| \`EngineChip\` | Letter mark circle in engine colour + label + "Live web" or "Memory" tag (micro). Toggle variant for settings, with lock icon and "Growth" badge when not on plan. |
| \`PositionBadge\` | Square 28px, number inside. 1: \`--success\` fill, white text. 2 to 3: \`--success-soft\`. 4 to 10: \`--surface-3\`. Mentioned not listed: "M" in \`--info-soft\`. Not mentioned: dash in \`--muted-foreground\`. Refused: "R" grey. |
| \`HighlightedAnswer\` | Renders answer text (sanitised markdown: headings, lists, bold, links only). Brand matches: \`--success-soft\` background, \`--success\` text, 600 weight, 4px radius. Competitor matches: \`--danger-soft\` / \`--danger\`, with the competitor's chart colour as a 2px underline. URLs: \`--info-soft\` with favicon. Hover a highlight shows a tooltip "Factorie · position 2 · positive". A toggle switches to raw mono text. |
| \`CitationList\` | Favicon (via \`https://www.google.com/s2/favicons?domain=...&sz=32\`), domain (600), page title (truncate), "Your site" tag if brand domain, competitor tags if that page mentions them. |
| \`RunProgress\` | Thin bar (6px) with per-engine segments that fill as jobs finish; under it a row of EngineChips with tick, spinner or warning icon. Text "86 of 125 checks done · about 1 min left". |
| \`StatusPill\` | Run and job statuses: queued (grey), running (violet with pulse dot), complete (green), partial (amber), failed (red), cancelled (grey), skipped_budget (amber, "Budget"). |
| \`LimitMeter\` | Label, "18 / 25", 4px bar, turns \`--warning\` at 80% and \`--danger\` at 100%. |
| \`EmptyState\` | 48px glyph in \`--primary-soft\` circle, title, one line, primary action. |
| \`SliderField\` | shadcn Slider with label, live value bubble above the thumb, min/max captions, helper text. Step snaps with a 60ms ease. |
| \`RecommendationCard\` | Kind icon (FilePlus, FilePen, ExternalLink, Wrench), title, why (2 lines clamp), impact dots (5), effort tag, prompt chips, status select. Expand shows outline and sources. |
| \`ScrapeStep\` | Row with icon state (pending circle, spinner, check, cross), label, detail ("42 pages found"), elapsed seconds. |
| \`PromptCard\` | Checkbox, editable text (textarea autosize), intent tag colour-coded, region tag, why tooltip, delete icon. Character count appears when editing. |
| \`PlanCard\` | Plan name, price (big, tabular), "/month" or "/year, 2 months free", feature list with checks, primary button. Recommended plan gets a 2px \`--primary\` border and "Most picked" pill. |

## 5. Charts (Recharts)

General rules for all charts:
- Height: 280px in cards on desktop, 220px on mobile. Responsive container.
- Gridlines: horizontal only, \`--chart-grid\`, 1px, dashed 3 3. No vertical grid.
- Axis text: micro style in \`--muted-foreground\`. Y axis on the left, no axis line, ticks at 0, 25, 50, 75, 100 for scores.
- Tooltip: card style (surface, border, shadow), date heading, one row per series sorted by value descending, colour dot, tabular value, delta vs previous point.
- Legend: custom chips above the chart (not Recharts' default), clicking a chip hides or shows the series. Brand chip is always first and cannot be hidden.
- Animations: 600ms ease-out on first render only, none on data updates (avoid jitter). Respect \`prefers-reduced-motion\`: no animation.
- Every chart has a "View as table" toggle for screen readers and exports.

### 5.1 Visibility over time (line)
- X: day. Y: visibility 0 to 100.
- Series: one line per enabled engine (engine colours, 1.5px), plus "All engines" in \`--chart-brand\` at 2.5px. Dots hidden except the hovered point (4px).
- Annotations: vertical dashed marker on days when a recommendation was marked done, labelled with a small flag icon; hover shows its title.
- Range toggle: 30d (default), 90d, 180d.

### 5.2 Share of voice by engine (stacked bar, 100%)
- One horizontal bar per engine (category axis on the left), stacked segments = brand (first, \`--chart-brand\`), competitors in chart order, Others last.
- Labels inside segments when wide enough (> 8%): percentage in white 11px.
- Hover a segment highlights the same entity across all bars (others fade to 30%).

### 5.3 Share of voice donut
- Inner radius 68%, outer 100%, 2px gap between segments (paddingAngle 1).
- Centre: brand SOV as display text, "your share of voice" under it in micro.
- Legend list to the right (below on mobile): entity, value, delta.

### 5.4 Rank heatmap (engine x prompt)
- Custom grid (CSS grid, not Recharts). Rows = prompts (truncate 60 chars, full text on hover), columns = engines.
- Cell = PositionBadge style: 1 deep green, 2 to 3 light green, 4 to 6 \`--surface-3\` with number, 7+ number in muted, M for prose mention, dash for not mentioned.
- Sticky first column and header row. Click a cell to open the drilldown on that engine tab.
- Sort: worst first by default; sort controls on the header (prompt A to Z, best first, worst first).
- Mobile: horizontal scroll inside the card with the first column sticky; no page-level horizontal scroll.

### 5.5 Sparklines
- 80 x 24px, 1.5px line, no axes, last point dot. Colour \`--chart-brand\`, or \`--danger\` if the 7-day trend is down by more than 3 points.

## 6. Screens

### 6.1 Auth (\`/login\`, \`/signup\`, \`/forgot\`, \`/reset\`)
- Split screen on desktop: left 45% form on \`--surface\`, right 55% \`--surface-2\` panel with a product visual: a stack of three answer cards (ChatGPT, Perplexity, Gemini) with "factorie" highlighted green inside each, floating with a slow 6s vertical drift (2px). Under the cards a quote line: "Know what AI says about you before your buyers do."
- Form: logo, h1 "Create your account" / "Welcome back", Google button (outline), divider "or", email, password (show/hide), primary button full width. Links: "Forgot password?", "Have an account? Log in".
- Errors inline under fields in \`--danger\` small. Button shows spinner and "Creating account..." while loading.
- Mobile: single column, visual hidden, form centred with 16px padding.

### 6.2 Onboarding wizard (\`/onboarding\`)
- Full screen, no sidebar. Top: glyph + step indicator (6 dots with labels on desktop: Website, Brand, Market, Prompts, Plan, First check). Content max width 720px centred. Bottom bar sticky: Back (ghost), Continue (primary).
- **Step 1 Website:** h1 "What's your website?", one big input (48px) with "https://" prefix inside, helper "We read your homepage and key pages to understand what you sell." On Continue the input locks and the scrape panel slides in below (300ms ease-out, 12px rise):
  - ScrapeStep rows appear one by one as Realtime events arrive: "Finding your pages", "Reading homepage", "Reading pricing page", "Reading 3 product pages", "Reading blog index", "Writing your brand summary".
  - A thin indeterminate bar under the heading until the summary arrives. Elapsed timer "18s".
  - On success auto-advance after 600ms. On failure: amber callout "We couldn't read your site this time. Fill in the next screen and we'll still track you." Continue enabled.
- **Step 2 Brand:** two-column form on desktop. Fields filled with a subtle \`--primary-soft\` background and a small "AI filled" tag that disappears once edited. Chips for features and aliases.
- **Step 3 Market:** regions multi-select (flags as emoji are not allowed; use ISO code badges), language select, competitors as cards (name, domain favicon, "why suggested" in muted small, remove x). "Add competitor" opens an inline row with name and domain inputs. Counter "4 of 5 competitors".
- **Step 4 Prompts:** h1 "Pick the questions to track". Group headers by intent with counts. PromptCards in a single column. Top right: "22 of 25 slots" LimitMeter. Buttons: "Add your own", "Regenerate" (shows remaining "2 left today"). While generating: 8 skeleton cards with shimmer.
- **Step 5 Plan:** two PlanCards side by side, monthly/annual toggle above (annual shows "2 months free" pill). Button "Start 7-day free trial". Under: "Cancel any time in two clicks. We remind you 2 days before the trial ends."
- **Step 6 First check:** big RunProgress, live counter, a rotating line under it every 4 seconds ("Asking ChatGPT 25 questions", "Reading Perplexity's sources", "Counting competitor mentions"). As each engine finishes, its chip ticks and a mini result appears: "ChatGPT: mentioned in 6 of 25". When done: confetti is not allowed; instead the score counts up from 0 to the real value over 800ms and the "See my results" button appears.

### 6.3 Overview (\`/app\`)
- Row 1: four ScoreCards (Visibility, Share of voice, Avg position, Mention rate). Desktop 4 columns, tablet 2, mobile 1 with horizontal snap scroll.
- Row 2: Visibility over time (2/3 width) + Share of voice donut (1/3).
- Row 3: Share of voice by engine (stacked bar, full width).
- Row 4: Rank heatmap (2/3) + Biggest moves list (1/3: prompt, engine chip, "#5 to #2" with arrow, New/Lost badges).
- Row 5: Top recommendation card (full width, \`--primary-soft\` left border 3px) + Top cited sources mini table.
- Alerts banner at the very top when any alert fires: \`--warning-soft\` with icon, message, "View" link, dismiss for today.
- Empty state (no runs yet): EmptyState "Your first check is running" with RunProgress inside.

### 6.4 Prompts list (\`/app/prompts\`)
- Filter bar: search, intent select, engine select, quick filters ("Not mentioned anywhere", "Lost this week", "Pinned").
- Table columns: checkbox, prompt (2 lines max), intent tag, one PositionBadge column per enabled engine (header = EngineChip letter mark), Visibility 7d (number + sparkline), Last checked (relative), actions (Recheck icon button with tooltip showing remaining, pin, menu).
- Row hover \`--surface-3\`; click opens drilldown. Sticky header. 25 rows per page with "Load more".
- Bulk action bar slides up from bottom when rows are selected.

### 6.5 Prompt drilldown (\`/app/prompts/[id]\`)
- Header card: prompt text (inline editable with pencil icon), intent and region tags, pin toggle, Recheck button ("Recheck now · 3 left today"), last checked time.
- Engine tabs (horizontal, scrollable on mobile) with a PositionBadge on each tab.
- Main area (2/3): HighlightedAnswer for the selected engine and result. Above it a History strip of up to 12 small chips (date + position) to switch result.
- Side panel (1/3): Position, Sentiment (pill), Recommended (yes/no), Descriptor quote, Competitors mentioned (list with chart-colour dots and positions), Citations (CitationList).
- "Compare engines" button switches to a grid: one column per engine (horizontal scroll on narrow screens), each showing only list items with highlights.
- While a recheck runs: each tab shows a spinner; answers fade in (200ms) as they land.

### 6.6 Competitors (\`/app/competitors\`)
- Top: SOV donut + head-to-head table (competitor with colour dot and favicon, SOV, mention rate, avg position, "beats you on N prompts" link, sparkline).
- Middle: "Wins and losses" two-column list: prompts where you beat each competitor vs where they beat you.
- Bottom: "Brands we keep seeing" chips with counts and a "Track" button.

### 6.7 Sources (\`/app/sources\`)
- Tabs: Domains, URLs, Your pages.
- Domains table: favicon + domain, citations (bar inside cell, proportional), engines (letter marks), competitors present (colour dots), you present (check or dash), tag "Outreach target".
- URLs table: title + URL (truncate middle), citations, prompts (chips), last seen.
- Filters: engine, intent, 7/14/30 days.

### 6.8 Recommendations (\`/app/recommendations\`)
- Kanban-like columns on desktop (Open, In progress, Done), list on mobile. RecommendationCards drag between columns (keyboard: status select).
- Header: "Refresh recommendations" with next-refresh date for Starter, button for Growth.
- Card expand shows the outline as an ordered list with a "Copy outline" button and the source URLs.

### 6.9 Runs (\`/app/runs\`)
- Table with StatusPill, kind tag (Scheduled, Recheck, Onboarding), jobs done/total, failed count, duration. Row click opens a Sheet listing failed jobs with engine chip and error message in mono.

### 6.10 Settings (\`/app/settings\`)
- Tabs across the top of the page (not in the sidebar): Brand, Competitors, Engines and schedule, Alerts, Digest, Danger zone. Each section is a card with a Save button that becomes active only when something changed. Unsaved changes prompt on navigation.
- **Engines and schedule:** EngineChip toggles in a 2-column grid with "Live web" or "Memory" and checks per month. Frequency segmented control. Day-of-week select. Hour SliderField (0 to 23, value bubble shows "08:00").
- **Alerts:** SliderField "Alert me when visibility drops by more than" 0 to 30 points (0 shows "Off"). Toggles for "A competitor overtakes me on any engine" and "I lose #1 on a pinned prompt".
- **Digest:** toggle, hour slider, recipients chips with counter, "Send me a test digest" button (rate limited, 3 per day).
- **Danger zone:** \`--danger\` outlined card, delete brand with type-to-confirm dialog.

### 6.11 Billing (\`/app/billing\`)
- Current plan card (name, price, interval, next renewal or trial end with days left), LimitMeters for prompts, brands, rechecks today, competitors. Buttons: "Manage billing" (Stripe portal), "Switch to annual (2 months free)", "Upgrade to Growth" (Starter only).
- Plan comparison table below with the current plan column highlighted.

### 6.12 Documentation (\`/app/docs\`) and Help (\`/app/help\`)
- Docs: left column list of articles inside the page (not the sidebar): "How the visibility score works", "Live web vs memory engines", "Writing prompts buyers really ask", "Reading share of voice", "Acting on recommendations". Article body max width 720px, body 15/26.
- Help: search box over the FAQ, accordion of 10 questions, a contact form card (subject, message, sends to your support inbox), and a "Last run" card with StatusPill.

### 6.13 Paywall (\`/paywall\`)
- Centred card, h1 "Start your 7-day free trial", PlanCards with monthly/annual toggle. If the user had a trial already: "Your trial ended. Your data is safe for 30 days." with a blurred preview of their overview behind the card.

## 7. States

| State | Pattern |
| --- | --- |
| Loading page | Skeletons that match final layout (score cards, chart boxes, 8 table rows). Shimmer 1.4s linear infinite, off with reduced motion |
| Loading action | Button spinner + verb in progress ("Rechecking...") and disabled |
| Empty | EmptyState with one action. Prompts: "No prompts yet" + "Generate prompts". Sources: "Sources appear after your first check" |
| Partial run | Amber banner "2 checks failed this run. Scores use the 123 that worked." + "See details" |
| Budget paused | Amber banner "Checks paused: monthly check budget reached. Resumes on {date}." + Upgrade button |
| Error | Inline red text under the failing element, or a toast for actions. Full page error: card with "Something went wrong" + Retry + support email |
| Offline | Top bar chip "Offline" in amber; actions disabled |
| Limit reached | Toast "Prompt limit reached (25 on Starter)" with "Upgrade" action |

## 8. Motion

| Element | Motion | Duration / easing |
| --- | --- | --- |
| Page enter | Content fades in and rises 8px | 200ms, cubic-bezier(0.2, 0.8, 0.2, 1) |
| Score count-up | Number tweens from previous to new value | 800ms ease-out, tabular nums |
| Chart first draw | Lines draw left to right, bars grow from 0 | 600ms ease-out |
| Highlight hover | Background deepens 1 step | 120ms |
| Sheet / dialog | Slide from right 24px + fade | 220ms |
| Toast | Slide up 12px + fade, auto dismiss 4s | 180ms |
| Run progress | Bar width transitions | 300ms linear |
| Scrape step appear | Row fades in + 6px rise, 80ms stagger | 200ms |
| Row flash on live update | Background \`--primary-soft\` then back | 600ms |

\`prefers-reduced-motion: reduce\`: no count-up (show final value), no chart draw, no shimmer, fades only (100ms).

## 9. Accessibility

- WCAG 2.2 AA. All text 4.5:1 minimum, large numbers 3:1. Check highlight colours in both themes.
- Never colour alone: deltas have arrows and signs; PositionBadge shows numbers; highlights also use font weight and an aria-label ("Your brand, position 2").
- Keyboard: every action reachable; heatmap cells are buttons in a grid with arrow-key navigation; tabs follow the WAI-ARIA tabs pattern; sliders have visible value text.
- Focus ring: 2px \`--primary\` with 2px offset, visible on all interactive elements.
- Charts: "View as table" toggle; \`aria-describedby\` summary sentence ("Visibility rose from 28 to 34 over 30 days. ChatGPT is highest at 41.").
- Live regions: RunProgress announces "Check complete" politely; toasts use role="status".
- Forms: labels always visible (no placeholder-only labels), errors linked with \`aria-describedby\`.

## 10. Mobile

- Breakpoints: sm 640, md 768, lg 1024, xl 1280.
- No horizontal page scroll anywhere. Wide tables and the heatmap scroll inside their card with a fade edge hint.
- Score cards: horizontal snap carousel with dots.
- Prompt drilldown: engine tabs scroll; side panel moves under the answer as collapsible sections.
- Touch targets 44px minimum. Bulk action bar sits above the iOS home indicator (safe-area inset).

## 11. Email (digest) design

- 600px table layout, white background, \`#1a1a2e\` text, violet \`#7c4ddb\` buttons (email cannot use CSS variables; these are the light token values converted).
- Header with wordmark image (hosted PNG 2x), date in grey.
- 4 metric tiles in a 2x2 table on mobile widths, 4 across on desktop clients.
- Engine rows with 7 small squares (green, amber, red by score band: 50+, 20 to 49, under 20).
- One action block with violet left border.
- Dark mode: add \`color-scheme: light only\` meta so clients do not invert brand colours badly.

## 12. Do not

- No gradients on data. One subtle violet radial glow is allowed on marketing pages only.
- No engine company logos. Letter marks only.
- No pie charts other than the share of voice donut.
- No more than 7 series on one chart: group the rest into "Others".
- No modal on top of a modal.
`
