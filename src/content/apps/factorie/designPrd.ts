// Factorie design PRD (DESIGN.md). Builds on Quiet Precision (DESIGN_SYSTEM.md). Backticks are escaped.

export const designPrd = `# Factorie: Design PRD

Save as \`DESIGN.md\` in the project root next to \`PRD.md\` and \`DESIGN_SYSTEM.md\`.

**This file builds on Quiet Precision.** \`DESIGN_SYSTEM.md\` (the Quiet Precision design system, shipped with this kit) holds the base rules: white surfaces, 1px hairlines, Geist at 13px app text, 6px boxes, 4px pills, white buttons with a firm edge, opacity and transform motion only, and the stability rules. This file only states what is different for Factorie: the violet accent, the tag hue map, the chart rules and every Factorie screen. Where the two disagree, this file wins only for the accent and product screens. Every stability, motion and component rule in DESIGN_SYSTEM.md still applies.

Put this line in \`CLAUDE.md\`:

\`\`\`
UI rules: @DESIGN_SYSTEM.md @DESIGN.md
\`\`\`

Build with Next.js, Tailwind and shadcn/ui. Restyle every shadcn component to the tokens below before using it (shadcn defaults have filled black buttons, 8px radii and blue focus rings, all of which are wrong here). Charts use Recharts. Light only: there is no dark mode.

## 1. Brand

- **Name:** Factorie. **Tagline:** See where AI recommends you.
- **Personality:** a calm analyst. Exact numbers, plain words, nothing shouting. The product is read by marketers who check it every Monday with a coffee: it must feel trustworthy and quiet, never like a toy.
- **Voice in UI copy:** numbers first, sentence case, no exclamation marks, British spelling. "Mentioned in 9 of 25 ChatGPT answers" beats "Great visibility". Errors say what went wrong, then what to do.
- **Logo:** wordmark "Factorie" in Geist 600, 16px, tracking -0.02em, ink. Glyph to its left: three vertical bars of rising height (a tiny bar chart) in \`--violet\`, the tallest topped with a 3px dot. Favicon: the glyph in \`--violet\` on white with a 1px \`--violet-edge\` square border.
- **Imagery:** real product UI and real answer snippets with highlights. No stock photos, robots, glowing brains or engine company logos.

## 2. Tokens

Start from the Quiet Precision starter tokens (DESIGN_SYSTEM.md section 11) in \`app/globals.css\`. Factorie swaps the accent from blue to violet and adds the tag hues, highlight and chart tokens. Map every token into Tailwind (\`theme.extend.colors\`) so components use \`bg-surface\`, \`text-ink\`, \`border-hairline\` and so on. Never write a raw hex inside a component.

### 2.1 Accent: pastel violet

| Token | Hex | Use |
| --- | --- | --- |
| \`--violet\` | \`#8a6fdf\` | Selected, in progress, your brand's chart series, live dot |
| \`--violet-soft\` | \`#f5f2fd\` | Selected fill (nav item, chosen row, selected chip) |
| \`--violet-edge\` | \`#d9cff7\` | Selected border |

The violet replaces Quiet Precision's \`--blue\`, \`--blue-soft\` and \`--blue-edge\` everywhere the system says "accent". Blue stays available as a tag hue (cited URLs, "mentioned in prose").

### 2.2 Neutrals, status and type (unchanged from the system)

Surface \`#ffffff\`, row hover \`#fafafb\`, hover fill \`#f5f5f6\`, hairline \`#e6e6e9\`, row divider \`#efeff1\`, button edge \`#dcdde0\`. Ink \`#08090a\`, body \`#3c4149\`, muted \`#62666d\`, faint \`#8a8f98\`, ghost \`#b4b8bf\`. Success \`#27a644\`, warning \`#d18b0f\`, danger \`#eb5757\`. Geist 400, 500, 600 via \`next/font\` (package \`geist\`). App text 13/18, tracking -0.014em. Tabular numbers on every figure that changes.

One extra token for the primary button's firmer edge: \`--btn-edge-strong: #62666d\` (the muted ink, so it is not a new colour).

### 2.3 Tag hues

Eight pastel hues. Fill is the base at 8% opacity, edge is a lighter tint of the same hue, ink is a darker shade that passes 4.5:1 on the fill. Tags and pills are 4px radius, 20px high, 12px text, 500 weight, 1px edge.

| Hue | Base | Fill | Edge | Ink |
| --- | --- | --- | --- | --- |
| green | \`#27a644\` | \`rgba(39,166,68,.08)\` | \`#b5e2c0\` | \`#1d7a33\` |
| coral | \`#eb5757\` | \`rgba(235,87,87,.08)\` | \`#f5c2c2\` | \`#b93c3c\` |
| blue | \`#5f86e0\` | \`rgba(95,134,224,.08)\` | \`#c4d4f5\` | \`#3d63b8\` |
| violet | \`#8a6fdf\` | \`rgba(138,111,223,.08)\` | \`#d9cff7\` | \`#6249b8\` |
| amber | \`#d18b0f\` | \`rgba(209,139,15,.08)\` | \`#f0d8a8\` | \`#95620a\` |
| teal | \`#1f9e9a\` | \`rgba(31,158,154,.08)\` | \`#b2e0de\` | \`#16736f\` |
| pink | \`#d45c9e\` | \`rgba(212,92,158,.08)\` | \`#f1c4dc\` | \`#a3417a\` |
| grey | \`#8a8f98\` | \`rgba(138,143,152,.08)\` | \`#dcdde0\` | \`#62666d\` |

**Fixed status map (never hashed):**

| Meaning | Hue |
| --- | --- |
| Your brand in an answer, positive delta, run complete, position 1 to 3 | green |
| A competitor in an answer, negative delta, failed | coral |
| Cited URL, mentioned in prose (no list) | blue |
| Running, in progress, selected | violet |
| Partial run, budget paused, near a limit | amber |
| Queued, cancelled, refused answer, position 4+ | grey |

**Free labels** (prompt intents, regions, recommendation kinds) hash to the first seven hues in this order: blue, violet, teal, amber, pink, green, coral. Intent map is fixed so it reads the same everywhere: Best-of blue, Alternatives violet, Problem teal, Comparison amber, Use-case pink, Custom grey.

### 2.4 Chart tokens

| Token | Hex | Used for |
| --- | --- | --- |
| \`--chart-brand\` | \`#8a6fdf\` | Your brand, always, on every chart |
| \`--chart-1\` | \`#5f86e0\` | Competitor 1 (in the order they were added) |
| \`--chart-2\` | \`#d18b0f\` | Competitor 2 |
| \`--chart-3\` | \`#1f9e9a\` | Competitor 3 |
| \`--chart-4\` | \`#d45c9e\` | Competitor 4 |
| \`--chart-5\` | \`#62666d\` | Competitor 5 |
| \`--chart-other\` | \`#dcdde0\` | "Others" (competitors 6+ grouped) |
| \`--chart-grid\` | \`#efeff1\` | Gridlines |

Engines get fixed series colours for the per-engine line chart: ChatGPT teal, Perplexity blue, Gemini amber, Claude pink, DeepSeek \`#62666d\`, Grok \`#b4b8bf\`. "All engines" is \`--chart-brand\` at 2px. Never show engine company logos: each engine has a 16px circle letter mark (C, P, G, Cl, D, X) with a 1px edge in its series colour on white, ink letter at 11px 600.

### 2.5 Shape, depth and size (from the system)

6px radius for every box (buttons, inputs, nav items, cards, dialogs). 4px for tags, pills and answer highlights. 2px for checkboxes. Borders always 1px. Only floating things cast a shadow (\`--shadow-float\`): menus, the selection bar, toasts, the side panel. Cards are white with a 1px hairline and no shadow. Spacing on the 4px base (4, 8, 12, 16, 20, 24, 32, 48), siblings laid out with \`gap\`. Controls 36px (compact 32px) so inputs, selects and buttons line up in a row.

## 3. App shell

\`\`\`
+------------------------+---------------------------------------------------------------+
| [glyph] Factorie       | [search prompts /]   25 prompts        [Checking 42%] [Recheck] |  toolbar 48px
| [F] factorie.io     v  +---------------------------------------------------------------+
|------------------------| [Engine: All v] [Intent v] [Last 30 days v]  + Add filter       |  filter bar 44px
| Overview               +---------------------------------------------------------------+
| Prompts                |                                                               |
| Competitors            |  content (scrolls; chrome does not)                           |
| Sources                |                                                               |
| Recommendations        |                                                               |
|                        |                                                               |
| Prompts  18 of 25 ==== |                                                               |
| Rechecks  2 of 5  ==   |                                                               |
|------------------------|                                                               |
| Documentation          |                                                               |
| Help                   |                                                               |
| Billing                |                                                               |
| Settings               |                                                               |
| [avatar] Sam  v        |                                                               |
+------------------------+---------------------------------------------------------------+
  sidebar 240px, white, right hairline; 56px icons only under 1100px
\`\`\`

### 3.1 Sidebar (one level, about 9 items, no nested menus)

- **Top:** logo row (48px, aligned with the toolbar), then the **brand switcher** (36px control: 20px letter avatar, brand name 500, domain in faint, chevron). It opens a menu (portal, 160ms pop) listing brands and "Add brand" (hidden with \`visibility: hidden\` on plans that allow only one brand, so the menu height never jumps).
- **Top group:** Overview, Prompts, Competitors, Sources, Recommendations. Nav items 32px high, 6px radius, Phosphor icon 17px regular plus label 13px. Hover: \`--hover\` fill. Selected: \`--violet-soft\` fill, \`--violet-edge\` 1px border, ink label 500, the Phosphor icon in duotone violet.
- **Usage meters** above the bottom group: two compact rows, label + "18 of 25" (tabular) + a 4px meter. The meter shows what is left: violet, then amber under 20% left, coral under 5% left. On Starter a text link "Upgrade" sits under them.
- **Bottom group, always in this order:** Documentation, Help, Billing, Settings. Section label rows are 28px. Then the account row (avatar, name, chevron) opening a menu with "Log out".
- **Under 1100px:** sidebar is 56px wide, icons only, labels in a tooltip, brand switcher becomes the 20px avatar, meters become a 3px vertical bar beside the avatar. Under 640px the sidebar is hidden and a menu button at the left of the toolbar opens it as a side panel over the page (200ms, slides 24px from the left, never reflows the page).
- Runs, the prompt drilldown and settings sections are reached from inside pages, never as extra sidebar items.

### 3.2 Page toolbar (48px, no page title, no top bar)

Every \`/app\` page starts with the toolbar: search (240px input, \`/\` focuses it), a count ("25 prompts", "14 domains"), then actions on the right. The **run status chip** is always the right-most item: while a run is active it shows the live dot (violet, 1.4s pulse, the only loop in the app) plus "Checking 42%"; otherwise a grey "Last check 3h ago". Clicking it opens \`/app/runs\`. The chip has a fixed width of 148px so "Checking 9%" to "Checking 100%" never resizes it.

### 3.3 Filter bar (44px)

Chips across the top, scrolling sideways, never a side rail. Each chip: label, first value cut at 150px, "+N" that always shows. "+ Add filter" has a dashed edge. Used on Overview (engine, date range), Prompts (engine, intent, status), Sources (engine, intent, days).

## 4. Components (build in \`components/fac/\`)

Every component has rest, hover, focus, loading, empty and error states. Focus is always a 2px ink outline with 2px offset.

| Component | Spec |
| --- | --- |
| \`Button\` | White, 1px \`--btn-edge\`, ink label 500, 36px (32 compact, 46 large), 6px radius. Primary: same white fill with a 1px \`--btn-edge-strong\` edge. Danger: white, coral edge, coral ink. Hover \`--hover\` fill; press scales to 98%. Loading keeps the label in place and overlays a 14px spinner after 200ms (min 400ms visible); width never changes. Label states the action and any cost: "Recheck now (2 left today)". |
| \`Input\`, \`Select\`, \`Textarea\` | 36px, 6px radius, 1px hairline. Focus: edge darkens to \`--muted\` plus a 3px \`rgba(8,9,10,.08)\` halo. Error text 12px coral below with \`role=alert\`; the space for it is reserved (min-height 16px) so the form never jumps. |
| \`ScoreCard\` | White card, hairline, 16px padding, fixed height 112px. Label 13px faint with an info icon (Lucide 14px) whose tooltip gives the formula in one sentence. Value 24px 500 tabular ink (the one non-heading use of the H2 size). Delta tag (green or coral hue, arrow and sign, "vs last week"); for average position lower is better, so the colours swap. 7-point sparkline 24px tall in \`--chart-brand\`. |
| \`DeltaTag\` | 20px tag, tabular figure with sign and Lucide arrow 12px. Flat: grey tag "0.0". |
| \`EngineMark\` | 16px circle letter mark (section 2.4) + label. Tag next to it: "Live web" (blue) or "Memory" (grey). |
| \`EngineToggle\` | Row 48px: EngineMark, tag, "about 108 checks a month" in faint, switch on the right. Locked engines show a Lucide lock 14px and a violet "Growth" tag; the switch is disabled but keeps its place. |
| \`PositionBadge\` | 24px square, 4px radius, tabular 12px 600. 1 to 3: green hue. 4+: grey hue with the number. Mentioned outside a list: blue hue "P" (prose) with tooltip "Mentioned, not in a list". Not mentioned: ghost dash, no box. Refused: grey "R". Fixed width so columns align. |
| \`HighlightedAnswer\` | Renders the answer as sanitised markdown (headings, lists, bold, links only; no HTML, no images). Max line length 72 characters, body 13/20. Your brand: green fill, green ink, 600 weight, 4px radius, 0 2px padding. Competitors: coral fill and ink, plus a 2px underline in that competitor's chart colour. Cited URLs: blue fill with a 12px favicon. Hover a highlight: tooltip "Factorie, position 2, positive". A "Show raw text" toggle switches to plain text (still Geist, no monospace). |
| \`CitationList\` | Rows 36px: favicon 14px (\`https://www.google.com/s2/favicons?domain=<host>&sz=32\`), domain 500, page title in muted with ellipsis, "Your site" green tag, competitor dots (6px, chart colours). Links open in a new tab with \`rel="noopener noreferrer nofollow"\`. |
| \`RunProgress\` | Fixed-height block (64px). A 4px violet bar whose width eases with the morph curve over 300 to 500ms. Under it one EngineMark per engine with a state icon (Lucide check green, spinner, alert amber) in a fixed 16px slot. Text below: "86 of 125 checks done" (tabular), reserved line height. Announces "Check complete" in a polite live region. |
| \`StatusTag\` | Run and job status from the status map. Running shows the live dot inside the tag. |
| \`LimitMeter\` | Label, "18 of 25" tabular, 4px meter showing what is left: violet, amber under 20% left, coral under 5%. |
| \`EmptyState\` | Inside the page area, left-aligned, max 480px: Lucide icon 16px in faint, 16px 500 title, one 13px muted line, one button. No illustrations. |
| \`SliderField\` | Label row (label left, live value right in a fixed-width tabular slot: "8 points", "Off"), shadcn Slider restyled: 4px hairline track, violet filled part, 16px white thumb with a 1px \`--btn-edge-strong\` edge. Min and max captions 12px faint under the track. Helper text 12px muted. |
| \`RecommendationRow\` | Table-style row 48px: kind tag, title (ellipsis), impact (5 dots, 6px, violet for filled), effort tag, target prompt count, status select. Clicking opens the side panel with the why line, outline and sources. |
| \`ScrapeStep\` | Row 32px: state icon in a fixed 16px slot (ghost circle, spinner, green check, coral cross), label, detail in faint ("42 pages found"), elapsed seconds right-aligned tabular. |
| \`PromptCard\` | Row (not a card) 48px min: checkbox (2px radius), text (inline edit, textarea grows downward only), intent tag, region tag, "why" info icon, delete icon button (labelled "Delete prompt"). |
| \`PlanCard\` | White box, hairline, 24px padding. Plan name 16px 500, price 24px 500 tabular, "/month" or "/year, 2 months free" muted, feature list 13px with Lucide check 14px green. Recommended plan: \`--violet-edge\` border and a violet "Most picked" tag; same fill. Button full width. |
| \`SelectionBar\` | Floats 16px above the bottom, centred, fixed 560px width, \`--shadow-float\`. "3 selected" (tabular, 96px min width), then actions each with a min width sized for three-digit counts: Activate, Deactivate, Pin, Delete. |
| \`SidePanel\` | 440px, white, left hairline, \`--shadow-float\`, slides 24px from the right over the page in 200ms. Header 48px with title and close (Escape closes). Never pushes the page. |
| \`Dialog\` | 520px max, 24px padding, opens 10% from the top, rises 8px and scales from 98.5% in 220ms, overlay fades 200ms. Multi-step dialogs morph height, never width. Confirming never opens a second dialog: the same dialog morphs. |
| \`Toast\` | Bottom left, 4 seconds, max four, rises 8px in 240ms. Short past tense, no full stop: "Prompt added", "Recheck queued". |

## 5. Charts (Recharts)

- White card, hairline, 16px padding. Chart area fixed at 240px tall (200px under 640px) so nothing moves when data arrives. Skeleton is the same box with a hairline baseline, no shimmer.
- Gridlines: horizontal only, \`--chart-grid\`, 1px solid. No vertical grid, no axis lines.
- Axis labels 12px faint, tabular. Scores always 0 to 100 with ticks at 0, 25, 50, 75, 100.
- Lines 1.5px, "All engines" and your brand 2px. Dots hidden except the hovered point (4px, white fill, series edge).
- Tooltip: floating card (\`--shadow-float\`), date in 12px faint, one row per series sorted by value, 6px colour dot, tabular value and delta. Rendered in a portal so no card clips it.
- Legend: custom chips above the chart, not Recharts' default. Clicking a chip hides or shows a series; hidden chips go grey but keep their width. Your brand's chip is first and cannot be hidden.
- Motion: the chart fades in once (200ms) the first time it appears in a session. No line drawing, no bar growing, nothing on refetch. Reduced motion: no fade.
- Every chart has "View as table" (a link under the card) and an \`aria-describedby\` sentence: "Visibility rose from 28 to 34 over 30 days. ChatGPT is highest at 41."
- At most 7 series on one chart; group the rest into "Others".

### 5.1 Visibility over time (line)
One line per enabled engine (engine colours) plus "All engines". Range in the filter bar: 30 days (default), 90, 180. A dashed vertical hairline marks days a recommendation was marked done; hovering its 12px flag shows the title.

### 5.2 Share of voice by engine (100% stacked horizontal bars)
One 20px bar per engine, engine label left (EngineMark). Segments: your brand first (\`--chart-brand\`), competitors in chart order, Others last, 1px white gap between segments. Labels inside segments only when wider than 10% (12px, white on brand, ink otherwise). Hovering a segment fades the same entity's segments in other bars to full and the rest to 40% opacity.

### 5.3 Share of voice donut
Inner radius 70%. Centre: your share of voice 24px 500 tabular and "your share of voice" 12px faint. Legend list to the right (below under 640px): dot, name, value, delta tag.

### 5.4 Rank heatmap (prompt x engine)
CSS grid, not Recharts. Rows 36px, prompt text 13px with ellipsis at the column width (full text in a tooltip), one 64px column per engine with a PositionBadge centred. Sticky first column and header row. Default sort: worst first. Click a cell to open the drilldown on that engine's tab. On narrow screens the grid scrolls sideways inside its card; the page never does.

### 5.5 Sparklines
80 x 24px, 1.5px, no axes, last point 3px dot. \`--chart-brand\`, or coral when the 7-day trend is down more than 3 points.

## 6. Screens

### 6.1 Auth (\`/login\`, \`/signup\`, \`/forgot\`, \`/reset\`)
- White page, a single 400px column starting 15% from the top, centred horizontally. No split screen, no illustration.
- Logo row, then H2 24px "Create your account" or "Log in to Factorie". Under it 13px muted: "7 days free. Your first visibility score in about 10 minutes."
- "Continue with Google" button (white, firm edge, Google "G" mark is allowed here as the provider's sign-in mark), a hairline with "or" in faint, email and password inputs (password has a "Show" text button inside the right edge), primary button "Create account" full width.
- Links 13px: "Forgot password?" and "Have an account? Log in". Errors reserved under each field; a form error ("That email and password do not match. Try again or reset your password.") sits above the button in coral.
- Loading: button label stays, spinner overlays after 200ms.
- \`/forgot\`: one email field, button "Send reset link", then the same box morphs to "Check your inbox for a link from Factorie" (height morph, width constant).

### 6.2 Onboarding (\`/onboarding\`)
- No sidebar. White page with the logo top left (48px row, bottom hairline) and a step list under it: six 13px labels (Website, Brand, Market, Prompts, Plan, First check). Done steps show a green check, the current one is ink 500 with a violet 2px underline, future ones faint. The list never wraps; under 640px it shows "Step 2 of 6" only.
- Content is one 560px fixed-width column, 48px from the top. Each step morphs height in 300ms; content fades up 4px after 60ms. Width never changes. Back and Continue sit in a 64px footer row at the bottom of the column (Back is a plain white button, Continue is primary). Enter continues.
- **Step 1, Website:** H2 "What is your website?", one 46px input with a fixed "https://" prefix inside, helper "We read your homepage and key pages to understand what you sell." On Continue the input locks and the ScrapeStep list appears below in space already reserved (6 rows x 32px): "Finding your pages", "Reading homepage", "Reading pricing page", "Reading 3 product pages", "Reading your blog", "Writing your brand summary". Rows fill from Realtime as \`site_pages\` arrive; rows rise once (360ms, 6px, 25ms stagger). Elapsed timer right-aligned. Success: auto-continue after 600ms. Failure: amber tag "Could not read your site" and the line "We could not read your site this time. Fill in the next screen and we will still track you." Continue stays enabled.
- **Step 2, Brand:** fields in one column: brand name, one-liner (140 counter), category, ideal customer, problem solved, key features (tags with an "Add" dashed tag), aliases (tags). Fields Claude filled show a small violet "Filled from your site" tag on the right of the label, which disappears once edited.
- **Step 3, Market:** regions multi-select (ISO code tags such as "GB", "US"; no flag emoji), language select, then competitors as 48px rows: favicon, name 500, domain faint, "why suggested" muted with ellipsis, remove icon button. "+ Add competitor" (dashed) opens an inline row with name and domain inputs in place. Counter "4 of 5 competitors" tabular.
- **Step 4, Prompts:** H2 "Pick the questions to track". LimitMeter "22 of 25 slots" right-aligned in the step header. Prompts grouped by intent with 28px group labels and counts. Each prompt is a PromptCard row. Buttons: "Add your own" and "Regenerate (2 left today)". While generating: 8 skeleton rows (hairline boxes, no shimmer) in the space the list will take. Approve button: "Track 22 prompts".
- **Step 5, Plan:** monthly/annual segmented control (annual shows a green "2 months free" tag), two PlanCards side by side (stacked under 640px, Growth first). Button "Start 7-day free trial". Under it 13px muted: "Card needed. Nothing is charged for 7 days. We email you 3 days before the trial ends." After returning from Stripe, the box shows "Confirming your trial" with the spinner while it polls (up to 60 seconds), then morphs to step 6.
- **Step 6, First check:** RunProgress at full column width, then a list of six engine rows (40px) that fill as each engine finishes: "ChatGPT: mentioned in 6 of 25". Under it one muted line that changes every 4 seconds with a fade ("Asking Perplexity 25 questions", "Reading the sources ChatGPT cited", "Counting competitor mentions"); its height is reserved. When done, the visibility score appears as a ScoreCard and counts up from 0 to the value over 500ms (once; reduced motion shows the value), then the button "See my results" appears in its reserved slot. No confetti.

### 6.3 Overview (\`/app\`)
- Toolbar: search, "25 prompts, 5 engines", run status chip, "Recheck all" (Growth only; hidden with \`visibility: hidden\` on Starter so the toolbar does not shift).
- Filter bar: engine (All by default), date range.
- Alerts row (only when an alert fires): a 44px white row with an amber tag, the message ("Peec AI passed you on ChatGPT"), "View" link and a dismiss icon. Space is not reserved for it because it appears on load, before anything else paints.
- Row 1: four ScoreCards in a 4-column grid (2 under 1100px, 1 under 640px): Visibility, Share of voice, Average position, Mention rate.
- Row 2: Visibility over time (2/3) and the share of voice donut (1/3).
- Row 3: Share of voice by engine (full width).
- Row 4: Rank heatmap (2/3) and "Biggest moves" (1/3): rows 48px with prompt text (ellipsis), EngineMark, "#5 to #2" tabular with a Lucide arrow, and "New" (green) or "Lost" (coral) tags.
- Row 5: "Next best action" (the top recommendation as a RecommendationRow with its why line under it) and "Top cited sources" (5 rows from Sources).
- Empty (no finished run yet): RunProgress in the first row's space, ScoreCards show a ghost dash, charts show their empty boxes with "Your first check is running. Scores appear here when it finishes."

### 6.4 Prompts (\`/app/prompts\`)
- Toolbar: search, "25 prompts" (tabular), "Add prompt" button, "Regenerate" button, run status chip.
- Filter bar: intent, engine, quick chips "Not mentioned anywhere", "Lost this week", "Pinned".
- Table: header 36px, rows 48px, fixed column widths, single-line cells with ellipsis. Columns: checkbox (40px), prompt (flex, min 280px), intent tag (112px), one PositionBadge column per enabled engine (56px each, header is the EngineMark), visibility 7d (96px: number + sparkline), last checked (104px, relative), actions (88px: recheck icon button with tooltip "Recheck now (2 left today)", pin icon, more menu).
- Row hover \`--row-hover\`; click opens the drilldown. Rows rise once the first time the table appears in a session, never on refetch.
- Selecting rows shows the SelectionBar. Limit errors from the database come back as a toast with an action: "Prompt limit reached (25 on Starter)" + "Upgrade".
- Empty: EmptyState "No prompts yet", "Factorie writes 20 buyer questions from your site.", button "Generate prompts".

### 6.5 Prompt drilldown (\`/app/prompts/[id]\`)
- Toolbar: back link "Prompts", the prompt text (13px 500, ellipsis), intent tag, pin toggle, "Recheck now (3 left today)" button, run status chip.
- Under it a 44px engine tab row (looks like the filter bar): one tab per engine with its EngineMark and PositionBadge; selected tab has the violet soft fill and edge.
- Main column (flex): a history strip of up to 12 compact tags (date + position, tabular) to switch result, then the HighlightedAnswer in a white card.
- Right column (320px, sticky): Position, Sentiment (tag), Recommended (Yes/No), descriptor in quotes (muted), competitors mentioned (rows with chart dot, name, PositionBadge), Citations (CitationList).
- "Compare engines" button switches the main area to a grid of engine columns (280px each, scrolls sideways inside the card) showing only the list items with highlights.
- While a recheck runs: each engine tab shows a spinner in its badge slot; answers fade in (200ms) as they land. Nothing else moves.
- Under 1100px the right column moves under the answer.

### 6.6 Competitors (\`/app/competitors\`)
- Toolbar: search, "5 competitors", "Add competitor" button (opens a Dialog: name, domain, aliases).
- Row 1: share of voice donut (1/3) and the head-to-head table (2/3): competitor (chart dot, favicon, name), share of voice, mention rate, average position, "Beats you on 7 prompts" link (filters Prompts), sparkline.
- Row 2: "Wins and losses": two columns of prompt rows, "You beat them" and "They beat you", with PositionBadges for both.
- Row 3: "Brands we keep seeing": tag list of other brands with counts ("Peec AI, 9 answers") and a "Track" button each (respects the limit; disabled with a lock tooltip when full).

### 6.7 Sources (\`/app/sources\`)
- Toolbar: search, "48 domains", tabs as a segmented control: Domains, URLs, Your pages.
- Filter bar: engine, intent, 7 / 14 / 30 days.
- Domains table: favicon + domain (240px), citations (number + a 4px violet bar in the cell, width proportional, 120px), engines (letter marks), competitors present (dots), you present (green check or ghost dash), and an amber "Outreach target" tag when competitors appear there and you do not.
- URLs table: title + URL with middle ellipsis, citations, prompts (count), last seen.
- Your pages: your own cited URLs first, then your scraped pages never cited (grey "Not cited yet" tag).

### 6.8 Recommendations (\`/app/recommendations\`)
- Toolbar: "5 open", "Refresh recommendations" (Growth; disabled with "Next refresh Mon 21 Oct" on Starter), run status chip.
- Filter bar: status chips (Open, In progress, Done, Dismissed) and kind.
- A table of RecommendationRows, sorted by priority. Clicking a row opens the SidePanel: title (16px 500), kind and effort tags, why line, target prompts (rows linking to drilldowns), source URLs (CitationList), outline as an ordered list with a "Copy outline" button. Status select at the top of the panel.
- Marking done opens a Dialog: "Recheck the 3 target prompts now? (uses 3 of 5 rechecks today)" with "Recheck now" and "Not now".
- Empty: "Recommendations appear after your first full week of checks."

### 6.9 Runs (\`/app/runs\`)
Table: started (relative), kind tag (Scheduled grey, Recheck violet, Onboarding blue), StatusTag, jobs done of total (tabular), failed, duration. Clicking a row opens the SidePanel listing failed jobs: EngineMark, prompt (ellipsis), error message in 13px body text. Never show dollar costs to customers.

### 6.10 Settings (\`/app/settings\`)
- Toolbar: a segmented control of sections: Brand, Competitors, Engines and schedule, Alerts, Digest, Danger zone (not in the sidebar). The selected section is in the URL hash.
- Each section is a white card with a 48px header row (section name 13px 500 and a "Save changes" primary button on the right that is disabled until something changes). Leaving with unsaved changes opens a Dialog: "Discard your changes?" "Keep editing" / "Discard".
- **Brand:** name, domain (read only), one-liner, category, ideal customer, problem, aliases (tags), timezone combobox.
- **Engines and schedule:** EngineToggles in one column. Frequency segmented control: "Weekly" and "Weekly + daily for pinned prompts" (Growth tag and lock on Starter). Day of week select. Check hour SliderField 0 to 23, value shows "06:00" in the brand timezone. A line under it in muted: "About 25 prompts x 5 engines x 4.3 runs = 538 checks a month." Counts only, never dollars.
- **Alerts:** SliderField "Alert me when visibility drops by more than" 0 to 30 points, step 1, 0 shows "Off". Switches: "A competitor passes me on any engine", "I lose #1 on a pinned prompt", "Email me alerts".
- **Digest:** switch "Send me a daily digest", SliderField hour 0 to 23 (value "08:00"), recipients as email tags with a counter "1 of 5", button "Send me a test digest (3 left today)".
- **Danger zone:** white card with a coral 1px edge. "Delete brand" danger button opens a Dialog that asks for the brand name typed exactly; the Delete button stays disabled until it matches.

### 6.11 Billing (\`/app/billing\`)
- Current plan card: plan name, price, interval, "Trial ends in 4 days" (amber tag) or "Renews 21 Nov", buttons "Manage billing" (Stripe portal), "Switch to annual (2 months free)", "Upgrade to Growth" (Starter only, primary).
- Usage: LimitMeters for prompts, brands, competitors per brand, rechecks today, and "Checks this month" (count, never dollars).
- Plan comparison table below with the current plan's column header in violet soft fill.

### 6.12 Documentation (\`/app/docs\`) and Help (\`/app/help\`)
- Docs: a 220px article list inside the page (not the sidebar) and the article at max 65 characters per line, 14/22 body, H2 and H3 from the type scale. Articles: "How the visibility score works", "Live web vs memory engines", "Writing prompts buyers really ask", "Reading share of voice", "Acting on recommendations", "Why answers differ from what I see in ChatGPT".
- Help: search over the FAQ, an accordion of 10 questions (height morph, chevron rotates 160ms), a contact form card (subject, message, "Send message") and a "Last check" card with its StatusTag.

### 6.13 Paywall (\`/paywall\`)
Same 560px column as onboarding. H2 "Start your 7-day free trial", the plan toggle and two PlanCards. A lapsed user sees "Your trial ended. Your data is kept for 30 days." above the cards. No blurred dashboard behind it.

### 6.14 Free audit result (\`/audit/[token]\`, public)
Marketing chrome (square, 1180px rail). While running: RunProgress and "Checking 5 questions on 3 engines". Done: the score (H1 35px tabular), a 15-cell grid (5 prompts x 3 engines) of PositionBadges, "Brands named most" list, and the primary button "Track all 25 prompts every week: start your free trial".

## 7. States

| State | Pattern |
| --- | --- |
| Loading a page | Skeletons with the final layout's exact sizes: hairline boxes, no shimmer, no pulse. Score cards keep 112px, tables keep 8 rows at 48px |
| Loading an action | Label stays, spinner overlays after 200ms and stays at least 400ms. Width fixed |
| Live run | The run status chip's pulsing dot and RunProgress. The only looping motion |
| Empty | EmptyState with one action (copy in each screen above) |
| Partial run | Amber tag row: "2 checks failed this run. Scores use the 123 that worked." + "See details" |
| Budget paused | Amber tag row: "Checks paused until 1 Nov: this month's check budget is used." + "Upgrade to Growth" |
| Engine paused | Grey tag on that engine's mark: "Gemini paused while we switch models" |
| Error in a field | Coral 12px text in the reserved line under the field, \`role=alert\` |
| Error in an action | Toast: "Could not start the recheck. Try again in a minute" |
| Whole page error | Inline box in the content area: what went wrong, "Try again" button, support email. Sidebar stays |
| Offline | Grey "Offline" tag in the toolbar's status slot; buttons disabled, nothing moves |
| Limit reached | Toast with action: "Prompt limit reached (25 on Starter)" + "Upgrade" |

## 8. Motion

Opacity and transform only. Curves: \`cubic-bezier(0.16, 1, 0.3, 1)\` (out) and \`cubic-bezier(0.2, 0, 0, 1)\` (morph). With \`prefers-reduced-motion: reduce\` everything shows its end state instantly.

| Element | Motion |
| --- | --- |
| Hover, press | Colour only, 100 to 160ms; buttons press to 98% |
| Page change | Content fades in 200ms |
| Dialog | Rises 8px, scales from 98.5%, 220ms; overlay 200ms fade |
| Side panel | Slides 24px from the right, 200ms, over the page |
| Menu | 160ms from the trigger corner, 4px and 98% scale, in a portal |
| Onboarding step | Height morphs 300ms, content fades up 4px after 60ms |
| Rows | Rise once per region per session: 360ms, 6px, 25ms stagger capped at 270ms |
| Meters and progress | Width eases 300 to 500ms with the morph curve |
| Live run dot | 1.4s pulse loop (opacity 1 to 0.35) |
| Score count-up | 500ms once, onboarding step 6 and the audit page only, tabular so width holds |
| New answer on recheck | Fades in 200ms in its reserved space |
| Toast | Rises 8px, 240ms |

## 9. Stability checklist for Factorie

- Run status chip 148px fixed; "Checking 9%" to "Checking 100%" never resizes it.
- SelectionBar actions have min widths sized for "999 selected".
- PositionBadge columns are fixed width; a "-" and a "12" take the same space.
- Recheck buttons that show "(N left today)" have a min width for two-digit counts.
- Hidden toolbar actions (Recheck all on Starter, Add brand) use \`visibility: hidden\`.
- Charts, ScoreCards, RunProgress and the onboarding scrape list reserve their full height before data arrives.
- Realtime updates never re-run row animations; they only fade new content in place.
- The onboarding column and every dialog keep a constant width while their height morphs.

## 10. Accessibility and responsive

- Visible 2px focus outline everywhere. Real roles: \`dialog\`, \`menu\`, \`tablist\` for engine tabs, \`progressbar\` with values for RunProgress, \`grid\` with arrow keys for the heatmap. Icon-only buttons have labels ("Recheck now", "Pin prompt", "Delete prompt").
- Never colour alone: deltas carry an arrow and a sign, PositionBadges show numbers or letters, highlights also use weight and an \`aria-label\` ("Your brand, position 2").
- Toasts are polite live regions. Escape closes overlays.
- Sidebar: 240px, 56px icons under 1100px, hidden behind a menu button under 640px. Check every page at 320, 375 and 430px wide: wide tables and the heatmap scroll inside their cards, the page never scrolls sideways. Grid children get \`min-width: 0\`.
- Touch targets at least 36px; rows are 48px.

## 11. Email design (digest and every other email)

- 600px single-column table layout, white background, inline styles only. Font stack: Geist, then -apple-system, Segoe UI, Helvetica, Arial.
- Text \`#3c4149\`, headings \`#08090a\`, hairlines \`#e6e6e9\`. Buttons are white with a 1px \`#62666d\` border, 6px radius, 13px 500 ink text (the same as the app's primary button).
- Header: wordmark image (hosted PNG, 2x), brand name and date in \`#8a8f98\`.
- Four metric tiles (2 x 2 table cells), each with the value 24px and a coloured delta (\`#1d7a33\` up, \`#b93c3c\` down).
- By engine: rows with the engine letter mark, visibility, delta and seven 10px squares coloured by band (green 50+, amber 20 to 49, coral under 20) using the tag fills and edges.
- The "one action" block has a 1px \`#d9cff7\` violet border and \`#f5f2fd\` fill.
- \`<meta name="color-scheme" content="light only">\` so mail apps do not invert it.

## 12. Token file (paste into \`app/globals.css\`)

\`\`\`css
@import "tailwindcss";

:root {
  /* surfaces and lines (Quiet Precision) */
  --surface: #ffffff;  --row-hover: #fafafb;  --hover: #f5f5f6;
  --hairline: #e6e6e9; --divider: #efeff1;   --btn-edge: #dcdde0;
  --btn-edge-strong: #62666d;
  /* ink */
  --ink: #08090a; --body: #3c4149; --muted: #62666d; --faint: #8a8f98; --ghost: #b4b8bf;
  /* accent: Factorie violet (replaces the system blue) */
  --violet: #8a6fdf; --violet-soft: #f5f2fd; --violet-edge: #d9cff7;
  /* status */
  --success: #27a644; --warning: #d18b0f; --danger: #eb5757;
  /* tag hues: fill / edge / ink */
  --tag-green-fill: rgba(39,166,68,.08);   --tag-green-edge: #b5e2c0;  --tag-green-ink: #1d7a33;
  --tag-coral-fill: rgba(235,87,87,.08);   --tag-coral-edge: #f5c2c2;  --tag-coral-ink: #b93c3c;
  --tag-blue-fill: rgba(95,134,224,.08);   --tag-blue-edge: #c4d4f5;   --tag-blue-ink: #3d63b8;
  --tag-violet-fill: rgba(138,111,223,.08); --tag-violet-edge: #d9cff7; --tag-violet-ink: #6249b8;
  --tag-amber-fill: rgba(209,139,15,.08);  --tag-amber-edge: #f0d8a8;  --tag-amber-ink: #95620a;
  --tag-teal-fill: rgba(31,158,154,.08);   --tag-teal-edge: #b2e0de;   --tag-teal-ink: #16736f;
  --tag-pink-fill: rgba(212,92,158,.08);   --tag-pink-edge: #f1c4dc;   --tag-pink-ink: #a3417a;
  --tag-grey-fill: rgba(138,143,152,.08);  --tag-grey-edge: #dcdde0;   --tag-grey-ink: #62666d;
  /* charts */
  --chart-brand: #8a6fdf; --chart-1: #5f86e0; --chart-2: #d18b0f; --chart-3: #1f9e9a;
  --chart-4: #d45c9e; --chart-5: #62666d; --chart-other: #dcdde0; --chart-grid: #efeff1;
  /* type */
  --font: "Geist", ui-sans-serif, system-ui, sans-serif;
  --text: 13px/18px; --tracking: -0.014em;
  --h3: 500 20px/26px; --h2: 500 24px/32px; --h1: 500 clamp(23px,2.8vw,35px)/1.12;
  /* shape */
  --radius-box: 6px; --radius-pill: 4px; --radius-check: 2px;
  --shadow-float: 0 4px 16px rgba(8,9,10,.08), 0 0 0 1px rgba(8,9,10,.04);
  /* size */
  --control: 36px; --control-compact: 32px; --bar: 48px; --filter-bar: 44px; --row: 48px;
  --sidebar: 240px; --sidebar-collapsed: 56px; --run-chip: 148px;
  /* motion */
  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
  --ease-morph: cubic-bezier(0.2, 0, 0, 1);
  --dur-fast: 120ms; --dur-base: 200ms; --dur-reveal: 320ms;
}

html, body { background: var(--surface); color: var(--body); font: var(--text) var(--font); letter-spacing: var(--tracking); }
h1, h2, h3 { color: var(--ink); text-wrap: balance; }
.tabular { font-variant-numeric: tabular-nums; }

@keyframes fac-live { 0%, 100% { opacity: 1 } 50% { opacity: .35 } }
.live-dot { width: 6px; height: 6px; border-radius: 3px; background: var(--violet); animation: fac-live 1.4s var(--ease-morph) infinite; }

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: 0ms !important; transition-duration: 0ms !important; }
}
\`\`\`

Then in Claude Code: "Map every variable in globals.css into the Tailwind theme (colors, borderRadius, boxShadow, fontFamily, spacing for the sizes) and restyle components/ui/button, input, select, dialog, sheet, tabs, switch, slider, checkbox, tooltip, dropdown-menu and sonner to these tokens. Remove every default black fill, 8px radius and blue focus ring."

## 13. Icon map

Navigation uses Phosphor (\`@phosphor-icons/react\`) at 17px, regular weight at rest, duotone violet when selected. In-content icons use Lucide (\`lucide-react\`) at 14 to 16px, stroke 1.5. Never mix the two in one row.

| Place | Icon |
| --- | --- |
| Overview | Phosphor \`ChartLine\` |
| Prompts | Phosphor \`ChatCircleText\` |
| Competitors | Phosphor \`UsersThree\` |
| Sources | Phosphor \`LinkSimple\` |
| Recommendations | Phosphor \`Lightbulb\` |
| Documentation | Phosphor \`BookOpen\` |
| Help | Phosphor \`Lifebuoy\` |
| Billing | Phosphor \`CreditCard\` |
| Settings | Phosphor \`GearSix\` |
| Recheck | Lucide \`RotateCw\` |
| Pin | Lucide \`Pin\` |
| Info tooltip | Lucide \`Info\` |
| Delta up / down | Lucide \`ArrowUpRight\` / \`ArrowDownRight\` |
| Lock (plan) | Lucide \`Lock\` |
| Recommendation kinds | Lucide \`FilePlus\` (new page), \`FilePen\` (improve), \`ExternalLink\` (third party), \`Wrench\` (technical) |
| Success, warning, failure | Lucide \`Check\`, \`TriangleAlert\`, \`X\` |

## 14. UI copy deck

Use these strings word for word so tone stays consistent. Toasts have no full stop; errors do.

| Moment | Copy |
| --- | --- |
| Recheck accepted | Toast: "Recheck queued" |
| Recheck cooldown | Toast: "Checked 4 minutes ago. Try again in 6 minutes" |
| Recheck limit | Toast: "No rechecks left today (5 on Starter). They reset at midnight" + "Upgrade" |
| Prompt limit | Toast: "Prompt limit reached (25 on Starter)" + "Upgrade" |
| Prompt saved | Toast: "Prompt saved" |
| Competitor added | Toast: "Competitor added. It is included from the next check" |
| Settings saved | Toast: "Settings saved" |
| Engine locked tooltip | "Grok is on the Growth plan." |
| Scrape failed | "We could not read your site this time. Fill in the next screen and we will still track you." |
| Budget paused | "Checks paused until 1 Nov: this month's check budget is used." |
| Partial run | "2 checks failed this run. Scores use the 123 that worked." |
| Refused answer tag | "Refused" with tooltip "This engine declined to recommend products for this question." |
| Memory engine tooltip | "Answers from what the model learned in training. It changes when the model is updated." |
| Live web tooltip | "Searches the web before answering. It can change within days." |
| Score info tooltip | "0 to 100. First place scores 100, lower places score less, a mention outside a list scores 60, no mention scores 0." |
| Share of voice tooltip | "Your slice of all mentions among you and your tracked competitors, weighted by position." |
| Delete brand dialog | Title "Delete Factorie?" Body "This deletes every prompt, answer and score for this brand. It cannot be undone. Type the brand name to confirm." Button "Delete brand" |

## 15. Layout sketches

Overview at 1440px:

\`\`\`
+--------+-------------------------------------------------------------------+
|sidebar | search            25 prompts, 5 engines       [Checking 42%]       | 48
|        +-------------------------------------------------------------------+
|        | [Engine: All] [Last 30 days] + Add filter                         | 44
|        +-------------------------------------------------------------------+
|        | +--------------+ +--------------+ +--------------+ +--------------+|
|        | | Visibility   | | Share of     | | Avg position | | Mention rate ||
|        | | 34.2  +3.1   | | voice 37.6%  | | #2.4  -0.3   | | 40%   +8     || 112
|        | +--------------+ +--------------+ +--------------+ +--------------+|
|        | +-------------------------------------------+ +-----------------+ |
|        | | Visibility over time (engine lines)       | | SOV donut       | | 240
|        | +-------------------------------------------+ +-----------------+ |
|        | +---------------------------------------------------------------+ |
|        | | Share of voice by engine (stacked bars)                       | |
|        | +---------------------------------------------------------------+ |
|        | +-------------------------------------------+ +-----------------+ |
|        | | Rank heatmap (prompt x engine)            | | Biggest moves   | |
|        | +-------------------------------------------+ +-----------------+ |
+--------+-------------------------------------------------------------------+
\`\`\`

Prompt drilldown at 1440px:

\`\`\`
+--------+-------------------------------------------------------------------+
|sidebar | < Prompts  best AEO tool for agencies  [Best-of] [pin] [Recheck]  | 48
|        +-------------------------------------------------------------------+
|        | (C) ChatGPT 2 | (P) Perplexity - | (G) Gemini 1 | (Cl) Claude P  | 44
|        +----------------------------------------------+--------------------+
|        | 12 Oct #3 | 5 Oct #4 | 28 Sep - | ...        | Position     2     |
|        | +------------------------------------------+ | Sentiment    pos   |
|        | | Here are the best tools for agencies:    | | Recommended  yes   |
|        | | 1. [Profound] ...                        | | "fast, cheap..."   |
|        | | 2. [Factorie] ...                        | | Competitors        |
|        | | 3. [Otterly] ...  [g2.com]               | | Citations          |
|        | +------------------------------------------+ |                    |
+--------+----------------------------------------------+--------------------+
\`\`\`

## 16. Do not

- No filled or black buttons, no gradients, no glows, no dark mode.
- No page titles, no top bar.
- No monospace anywhere in the UI (raw answers use Geist).
- No engine company logos; letter marks only.
- No pie charts other than the share of voice donut.
- No shimmer, bounce or confetti. The live dot is the only loop.
- No modal on top of a modal; morph the first one.
- No new sizes, radii or colours: if you need one, reuse a token.
`
