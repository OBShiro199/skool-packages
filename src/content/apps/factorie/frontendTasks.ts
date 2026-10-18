import type { Task } from '../../types'
import { code, eli5, mistakes, p, prompt, steps, task, tip, warn } from './helpers'

export const frontendTasks: Task[] = [
  task({
    id: 'fac-fe-shell',
    title: 'Apply the Factorie design system and app shell',
    outcome: 'Every page uses Quiet Precision with the violet accent, the sidebar has the brand switcher and usage meters, and each page has the 48px toolbar with the live run chip.',
    minutes: 45,
    xp: 45,
    blocks: [
      eli5('Why two design files?', 'DESIGN_SYSTEM.md is the rulebook every app in this course shares: white pages, thin lines, small calm text, nothing jumping around. DESIGN.md is Factorie\'s own page: the violet colour and what each screen looks like. Claude Code reads both, so it never invents its own style.'),
      steps(
        'Download DESIGN_SYSTEM.md (the Quiet Precision file from the Setup phase) and DESIGN.md (this kit\'s design PRD) into your project root next to PRD.md.',
        'Open CLAUDE.md in VS Code and add the line `UI rules: @DESIGN_SYSTEM.md @DESIGN.md` near the top. Save.',
        'Paste the prompt below into Claude Code. Press Shift + Tab once first so it plans before it edits.',
      ),
      prompt('fac-fe-shell-prompt', 'Paste into Claude Code', `
Read @DESIGN_SYSTEM.md and @DESIGN.md (sections 2, 3, 4, 12 and 13) and @PRD.md section 6.

1. Replace app/globals.css with the token file in DESIGN.md section 12 and map every
   token into the Tailwind theme. Install the geist font package and use it via next/font.
2. Restyle the shadcn components in components/ui (button, input, select, textarea, dialog,
   sheet, tabs, switch, slider, checkbox, tooltip, dropdown-menu, sonner) to the tokens:
   white buttons with a 1px edge (primary uses --btn-edge-strong), 6px radius, focus is a
   darker edge plus a 3px ink halo, no blue rings, no black fills. Dialogs open 10% from the
   top. Toasts bottom left.
3. Build the app shell in app/app/layout.tsx exactly as DESIGN.md section 3:
   - Sidebar 240px (56px icons only under 1100px, hidden behind a menu button under 640px):
     logo row, brand switcher (reads brands for the user, sets the fac_brand cookie through a
     server action that checks the brand belongs to the user), top group Overview, Prompts,
     Competitors, Sources, Recommendations, the two usage meters (prompts used, rechecks today)
     reading plan_limits via supabase.rpc('plan_limits'), then bottom group in this order:
     Documentation, Help, Billing, Settings, then the account row. Phosphor icons 17px,
     duotone violet when selected.
   - A reusable <Toolbar> (48px) with slots for search, count and actions, and a <RunStatusChip>
     fixed at 148px wide that subscribes over Supabase Realtime to check_runs for the current
     brand and shows the live dot plus "Checking 42%" while a run is queued or running, else
     "Last check 3h ago". Clicking it goes to /app/runs.
   - A reusable <FilterBar> (44px) with chips.
4. Build the components listed in DESIGN.md section 4 in components/fac/ (ScoreCard,
   DeltaTag, EngineMark, PositionBadge, StatusTag, LimitMeter, EmptyState, SliderField,
   SelectionBar, SidePanel) with a /app/dev/components page that shows every state. Delete
   that page before launch.
5. Every /app page calls supabase.auth.getClaims() on the server, redirects to /login with no
   claims and to /paywall when rpc has_active_access is false.
Run npm run build and fix every error. Then take screenshots at 1440px, 1024px and 375px of
/app/dev/components and show me.
`),
      steps(
        'Open http://localhost:3000/app/dev/components. Every button should be white with a thin edge. If you see a black button, the restyle missed one: tell Claude which.',
        'Drag your browser narrower than 1100px: the sidebar should shrink to icons only. Narrower than 640px: it hides behind a menu button.',
        'Hover each sidebar item: only the colour changes, nothing moves.',
      ),
      tip('The one-line test for "Quiet Precision"', 'Click around fast. If anything resizes, jumps or flickers when you click, load or count, it breaks the system. Copy the page name into Claude Code and say "This shifts when I click X. Fix it with reserved space or visibility: hidden per DESIGN_SYSTEM.md section 08."'),
      mistakes([
        { mistake: 'shadcn buttons are still black.', fix: 'Claude edited a copy, not components/ui/button.tsx. Ask: "Open components/ui/button.tsx and change the default variant to the white Quiet Precision button with --btn-edge-strong."' },
        { mistake: 'The run chip changes width as the percentage counts up.', fix: 'Ask Claude to give it a fixed width of var(--run-chip) and tabular-nums on the number.' },
        { mistake: 'The brand switcher shows another user\'s brand after switching accounts.', fix: 'The cookie was trusted. Ask: "Validate fac_brand against brands where user_id = the current user on every request and fall back to their first brand."' },
      ]),
    ],
    checklist: [
      'Save DESIGN_SYSTEM.md and DESIGN.md in the project root',
      'Add the UI rules line to CLAUDE.md',
      ['Run the shell prompt', 'copy:fac-fe-shell-prompt'],
      'Check the sidebar collapses at 1100px and hides at 640px',
      'Check no button is filled or black',
    ],
  }),
  task({
    id: 'fac-fe-onboarding',
    title: 'Build the six-step onboarding wizard',
    outcome: 'A new user pastes their URL, watches their site being read live, edits the brand summary, picks competitors and prompts, starts a trial and sees the first check run.',
    minutes: 90,
    xp: 70,
    blocks: [
      eli5('Why onboarding is the product here', 'Factorie is worth nothing until someone sees their first score. So the first 15 minutes do all the hard setup for them: read their site, write their questions, find their competitors. They only have to tick and edit. The aha moment is seeing ChatGPT\'s real answer with their name highlighted.'),
      p('This replaces the generic 3-step onboarding from Foundations with Factorie\'s 6 steps. It needs the scrape-site, generate-prompts and recheck edge functions from the Backend phase. Build the screens now with fake data, then wire them once those functions are deployed.'),
      prompt('fac-fe-onboarding-prompt', 'Paste into Claude Code', `
Read @PRD.md section 7 and @DESIGN.md section 6.2. Build /onboarding with the six steps:
Website, Brand, Market, Prompts, Plan, First check.

- One 560px fixed-width column. Each step morphs height (300ms, morph curve), content fades up
  4px after 60ms. Width never changes. Back and Continue in a 64px footer. Enter continues.
- Save progress to brands.onboarding_step and the brand row on every Continue, so a refresh
  resumes on the right step with answers filled in.
- Step 1: validate the URL with new URL(), force https, strip the path. Insert the brand row
  (status scraping), call supabase.functions.invoke('scrape-site', { body: { brand_id } }) and
  subscribe to site_pages inserts and updates for that brand over Realtime. Show the ScrapeStep
  rows in reserved space (6 rows x 32px). On failure show the amber note and let them continue.
- Step 2: brand fields filled from brands.summary with the "Filled from your site" tag that
  disappears once a field is edited.
- Step 3: regions as ISO code tags, language select, competitor rows from
  summary.suggested_competitors plus "+ Add competitor". Insert competitors on Continue; show the
  trigger's error message ("Competitor limit reached") as a toast.
- Step 4: invoke generate-prompts, show prompts grouped by intent as PromptCard rows with
  checkboxes (all ticked), inline edit, delete, "Add your own" and "Regenerate (N left today)".
  Approve sets is_active true and approved_at now() for ticked prompts in one update; show the
  limit trigger's error as a toast.
- Step 5: PlanCards with the monthly/annual toggle calling /api/stripe/checkout with plan and
  interval. On return (?checkout=success) poll subscriptions every 2s for up to 60s until
  trialing or active.
- Step 6: invoke recheck with { brand_id, scope: 'all' }, then show RunProgress fed by Realtime
  on check_results for the run, six engine rows filling as each finishes ("ChatGPT: mentioned in
  6 of 25"), the rotating status line, then the ScoreCard counting up once and "See my results".
Fire the analytics events from PRD section 19 for each step. Test at 375px and 1440px.
`),
      steps(
        'Sign up with a fresh email and go through all six steps with your own website.',
        'On step 1, watch at least three ScrapeStep rows tick. If none appear, Realtime is not on for site_pages (the SQL adds it: check Database > Publications > supabase_realtime).',
        'Refresh the browser on step 3. You should land back on step 3 with your answers still there.',
        'Try to approve 26 prompts. You should get the "Prompt limit reached (25 on your plan)" toast.',
      ),
      code('fac-fe-onboarding-sql', 'Check the data (Supabase > SQL Editor)', 'sql', `
-- Your brand, its step and status
select name, domain, status, onboarding_step, category from public.brands order by created_at desc limit 1;
-- Pages read during step 1
select page_type, status, left(title, 40) as title from public.site_pages
where brand_id = (select id from public.brands order by created_at desc limit 1);
-- Approved prompts (should be 20 to 25)
select count(*) filter (where is_active) as active, count(*) as total from public.tracked_prompts
where brand_id = (select id from public.brands order by created_at desc limit 1);
`),
      mistakes([
        { mistake: 'The scrape list stays empty but the function returns 200.', fix: 'Realtime only sends rows the user can SELECT. Check the site_pages rows have the right user_id (the function must set it), and that the browser subscribed before calling the function.' },
        { mistake: 'The column gets wider on the prompts step.', fix: 'Long prompts are stretching it. Ask Claude: "The onboarding column is 560px fixed; prompt text wraps inside it, min-width 0 on flex children."' },
        { mistake: 'Step 5 sends people to /app before Stripe confirms.', fix: 'Never trust success_url. Ask Claude to poll the subscriptions row (status trialing or active) and only then move to step 6.' },
      ]),
    ],
    checklist: [
      ['Run the onboarding prompt', 'copy:fac-fe-onboarding-prompt'],
      'Go through all six steps with your own website',
      'Refresh mid-way and check your answers are kept',
      ['Run the onboarding SQL checks', 'copy:fac-fe-onboarding-sql'],
    ],
  }),
  task({
    id: 'fac-fe-overview',
    title: 'Build the overview dashboard',
    outcome: '/app shows four score cards, visibility over time per engine, share of voice, the rank heatmap and the biggest moves for the current brand.',
    minutes: 75,
    xp: 60,
    blocks: [
      eli5('Where the numbers come from', 'The browser never does maths on raw answers. A database function (compute_daily_scores) turns answers into one row per engine per day. The dashboard only reads those rows, which is fast and always matches what the email digest says.'),
      prompt('fac-fe-overview-prompt', 'Paste into Claude Code', `
Read @PRD.md Appendix B.1 and section 12, and @DESIGN.md sections 5, 6.3 and 15.
Build app/app/page.tsx (Overview) for the brand in the fac_brand cookie:
- Toolbar: search, "25 prompts, 5 engines", RunStatusChip, "Recheck all" (Growth only; on
  Starter keep it with visibility: hidden).
- FilterBar: engine (All default) and date range (30, 90, 180 days) in the URL query.
- Alerts row from v_alerts (today only), dismissible for today (localStorage key per brand).
- Four ScoreCards from daily_scores where engine_key = 'all' for today and today minus 7:
  Visibility, Share of voice, Average position (lower is better, colours swap), Mention rate,
  each with a 7-point sparkline. Info tooltips use the copy in DESIGN.md section 14.
- Visibility over time: Recharts LineChart, one line per enabled engine plus All engines.
- Share of voice donut (all engines, latest day) and 100% stacked bars per engine from
  competitor_daily plus the brand row.
- Rank heatmap from v_latest_positions (CSS grid, sticky first column, worst first, click opens
  /app/prompts/[id]?engine=key) and Biggest moves from v_rank_changes (top 5 by places).
- Next best action (top open recommendation) and Top cited sources (5 rows of v_source_domains).
Read everything with the server Supabase client (RLS applies). Charts fade in once; reserve
every chart's 240px height. Empty state per DESIGN.md when no run has finished.
Seed demo data first so I can see it: write supabase/seed-demo.sql that inserts 14 days of
daily_scores and competitor_daily rows for my brand, and tell me how to run and remove it.
`),
      steps(
        'Run the demo seed in Supabase SQL Editor so the charts have something to draw.',
        'Open /app. Check the four cards, the line chart, the donut, the bars and the heatmap.',
        'Change the date range to 90 days. Only the chart content changes; no box changes height.',
        'Delete the demo rows with the cleanup SQL Claude gave you once your real first run is in.',
      ),
      warn('Do not compute scores in the browser', 'If Claude starts averaging check_results in a React component, stop it: "Read daily_scores only. All maths is in compute_daily_scores." Two places doing maths always disagree.'),
      mistakes([
        { mistake: 'Average position goes green when it gets worse.', fix: 'For position, lower is better. Ask Claude to invert the DeltaTag colour for that card only.' },
        { mistake: 'Charts flash and re-animate every time Realtime updates.', fix: 'Ask: "Disable Recharts animation (isAnimationActive false) and fade the card in once per session instead."' },
        { mistake: 'The heatmap makes the whole page scroll sideways on mobile.', fix: 'Wrap the grid in a container with overflow-x: auto and min-width: 0 on the grid parent.' },
      ]),
    ],
    checklist: [
      ['Run the overview prompt', 'copy:fac-fe-overview-prompt'],
      'Seed the demo data and see every chart',
      'Switch date ranges and check nothing changes height',
      'Remove the demo data after your first real run',
    ],
  }),
  task({
    id: 'fac-fe-prompts',
    title: 'Build the prompts list and the answer drilldown',
    outcome: 'Users see every prompt with a position per engine, open one to read each engine\'s real answer with their brand in green and competitors in red, and recheck it live.',
    minutes: 90,
    xp: 70,
    blocks: [
      eli5('Why show the raw answer?', 'A score is a claim. The answer is the proof. When a marketer reads "1. Profound, 2. Factorie" in ChatGPT\'s own words, they trust the number and they know exactly what to fix. That page is what they screenshot for their boss.'),
      prompt('fac-fe-prompts-prompt', 'Paste into Claude Code', `
Read @PRD.md Appendix B.2, B.3 and section 13, and @DESIGN.md sections 4, 6.4, 6.5 and 14.

1. app/app/prompts/page.tsx: table from v_prompt_scores (header 36px, rows 48px, fixed widths):
   checkbox, prompt, intent tag (fixed intent hue map), one PositionBadge per enabled engine,
   visibility 7d with sparkline, last checked, actions (recheck icon with "N left today" tooltip,
   pin, menu). Filters in the FilterBar. Selecting rows shows the SelectionBar (Activate,
   Deactivate, Pin, Delete). Database trigger errors ("Prompt limit reached") become toasts with
   an Upgrade action.
2. app/app/prompts/[id]/page.tsx: toolbar with back link, prompt text, intent, pin and
   "Recheck now (N left today)". Engine tabs (role tablist) with PositionBadges. Main column:
   history strip (last 12 results) and <HighlightedAnswer>. Right column: position, sentiment,
   recommended, descriptor, competitors mentioned, CitationList.
3. components/fac/HighlightedAnswer.tsx: render answer_text with react-markdown and
   rehype-sanitize (allow headings, lists, strong, em, a only; no raw HTML, no images). Apply
   check_results.highlights ({ start, end, kind, ref }) on the original text as spans: brand
   green tag hue, competitor coral tag hue with a 2px underline in that competitor's chart
   colour, URLs blue with a favicon. aria-label on each ("Your brand, position 2"). A
   "Show raw text" toggle. Links get rel="noopener noreferrer nofollow" target="_blank".
4. Recheck: call supabase.functions.invoke('recheck', { body: { prompt_id } }). Handle 429
   cooldown and 402 limit with the toasts in DESIGN.md section 14. Subscribe to check_results for
   the returned run_id over Realtime; each engine tab shows a spinner in its badge slot and the
   answer fades in when its row turns done. Nothing else moves.
5. "Compare engines" view: one 280px column per engine showing only list items, scrolling
   sideways inside the card.
`),
      steps(
        'Open /app/prompts and click any prompt.',
        'Switch between engine tabs. Your brand should be green, competitors red, links blue.',
        'Click "Recheck now". Each tab shows a spinner, then the fresh answer fades in within about a minute.',
        'Click it again straight away. You should see the cooldown toast, not a second run.',
      ),
      code('fac-fe-prompts-sql', 'Check the recheck worked (SQL Editor)', 'sql', `
select r.kind, r.status, r.done_jobs, r.total_jobs, r.created_at
from public.check_runs r order by r.created_at desc limit 3;

select engine_key, status, mentioned, position, parse_mode, left(last_error, 60) as error
from public.check_results
where run_id = (select id from public.check_runs where kind = 'recheck' order by created_at desc limit 1);
`),
      mistakes([
        { mistake: 'Highlights land a few characters off.', fix: 'They are being applied to the rendered markdown, not the original text. Ask Claude to split answer_text into segments by highlight offsets first, then render each segment as markdown.' },
        { mistake: 'A competitor\'s answer contains a script tag and it shows up as HTML.', fix: 'Raw HTML is getting through. Ask: "Use rehype-sanitize with the default schema minus images, and never use dangerouslySetInnerHTML."' },
        { mistake: 'The recheck button gets wider when it says "Recheck now (10 left today)".', fix: 'Give it a min-width sized for two digits and tabular-nums.' },
      ]),
    ],
    checklist: [
      ['Run the prompts and drilldown prompt', 'copy:fac-fe-prompts-prompt'],
      'Read one answer on every engine tab',
      'Recheck a prompt and watch the answers update live',
      ['Check the recheck run in SQL', 'copy:fac-fe-prompts-sql'],
    ],
  }),
  task({
    id: 'fac-fe-insights',
    title: 'Build competitors, sources and recommendations',
    outcome: 'Users see who AI recommends instead of them, which sites shape the answers, and the five pages to write next.',
    minutes: 75,
    xp: 60,
    blocks: [
      eli5('Three questions, three pages', 'Competitors answers "who is winning?". Sources answers "which websites do the AI engines read?". Recommendations answers "what do I do on Monday?". Together they turn a score into a to-do list.'),
      prompt('fac-fe-insights-prompt', 'Paste into Claude Code', `
Read @PRD.md Appendix B.4 to B.7 and @DESIGN.md sections 6.6 to 6.9.
1. app/app/competitors/page.tsx: donut + head-to-head table from competitor_daily (engine 'all',
   last 7 days), wins and losses lists from v_latest_positions joined with competitor_mentions,
   and "Brands we keep seeing" from check_results.other_brands (14 days, 3+ mentions) with a
   Track button that inserts a competitor (trigger enforces the limit). "Add competitor" opens a
   Dialog (name, domain, aliases).
2. app/app/sources/page.tsx: segmented control Domains / URLs / Your pages. Domains from
   v_source_domains with the citations bar, engine marks, competitor dots, you present, and the
   amber "Outreach target" tag when competitors_present is not empty and brand_mentioned is
   false and is_own is false. URLs by unnesting cited_urls (14 days). Your pages from site_pages
   with "Not cited yet".
3. app/app/recommendations/page.tsx: rows sorted by priority, status filter chips, SidePanel on
   click with why, target prompts, sources, outline and "Copy outline". Status select updates
   recommendations.status (RLS + trigger allow status only). Marking done opens the Dialog "Recheck
   the 3 target prompts now?". "Refresh recommendations" calls generate-recommendations (Growth);
   on Starter it is disabled with the next refresh date.
4. app/app/runs/page.tsx: check_runs table with StatusTag and the failed-jobs SidePanel.
No dollar amounts anywhere in the customer UI.
`),
      steps(
        'Open Competitors: the shares in the donut should add up to 100%.',
        'Open Sources and look for an amber "Outreach target" tag: that is a site that mentions a competitor but not you.',
        'Open Recommendations, open one, and change its status to In progress. Refresh: it stays.',
      ),
      mistakes([
        { mistake: 'Changing a recommendation\'s title in the browser works.', fix: 'It should not. The protect_recommendation_columns trigger resets everything but status. If it saved, the trigger is missing: re-run that part of the SQL.' },
        { mistake: 'Sources shows your own site as an outreach target.', fix: 'Use the is_own column from v_source_domains to exclude it.' },
        { mistake: 'Track button adds a competitor past the plan limit.', fix: 'Check the competitors_limit trigger exists: select tgname from pg_trigger where tgrelid = \'public.competitors\'::regclass;' },
      ]),
    ],
    checklist: [
      ['Run the insights prompt', 'copy:fac-fe-insights-prompt'],
      'Check competitor shares add up to 100%',
      'Find an outreach target on Sources',
      'Change a recommendation status and refresh',
    ],
  }),
  task({
    id: 'fac-fe-settings',
    title: 'Build settings, billing, docs and help',
    outcome: 'Users tune engines, schedule, alert sliders and the digest; see their plan and usage; and find answers without emailing you.',
    minutes: 60,
    xp: 50,
    blocks: [
      eli5('Why sliders?', 'A slider shows the whole range at once: "alert me if visibility drops by more than 5 points" is easier to feel on a line from 0 to 30 than in a number box. The server still checks every value, so a slider can never set something the plan does not allow.'),
      prompt('fac-fe-settings-prompt', 'Paste into Claude Code', `
Read @PRD.md Appendix C and @DESIGN.md sections 6.10 to 6.13.
1. app/app/settings/page.tsx with the section segmented control in the toolbar (hash in the
   URL): Brand, Competitors, Engines and schedule, Alerts, Digest, Danger zone. Each section is a
   card with "Save changes" disabled until something changes; navigating away with unsaved
   changes opens the "Discard your changes?" Dialog.
   - Engines and schedule: EngineToggle rows (locked with a Growth tag when the engine's
     min_plan is above the user's plan), frequency segmented control, day of week, check hour
     SliderField (0 to 23, shows 06:00 in the brand timezone), and the checks-per-month line.
     Never show dollars.
   - Alerts: SliderField 0 to 30 (0 shows Off) for alert_visibility_drop, switches for
     alert_competitor_overtake, alert_lost_top, alerts_email.
   - Digest: profiles.digest_enabled, digest_hour slider, recipients tags limited by
     plan_limits.digest_recipients, "Send me a test digest (N left today)" calling a server
     route that calls send-digest with { user_id, test: true } using the cron secret.
   - Danger zone: delete brand with type-to-confirm Dialog.
   After saving, re-read the brand row and show what the server kept (the protect trigger may
   drop an engine the plan does not allow).
2. app/app/billing/page.tsx: plan card, LimitMeters (prompts, brands, competitors, rechecks
   today, checks this month as a count), Manage billing (portal), Switch to annual, Upgrade.
3. app/app/docs: MDX articles in content/docs/ (the six in DESIGN.md 6.12), written in plain
   words from PRD sections 10 to 12. app/app/help: FAQ accordion (use the landing FAQ), contact
   form that emails FOUNDER_EMAIL through Resend from a server action, and a Last check card.
4. /paywall per DESIGN.md 6.13.
`),
      steps(
        'On a Starter account, try to switch on Grok. The toggle is locked with a Growth tag.',
        'Move the alert slider to 0. It shows "Off". Save, refresh, it stays at Off.',
        'Click "Send me a test digest". The email arrives within a minute.',
      ),
      mistakes([
        { mistake: 'Saving engines silently drops Gemini.', fix: 'Gemini may be auto-disabled in the engines table (is_enabled false after a model error). Check select key, is_enabled from engines; swap the slug and set it back to true.' },
        { mistake: 'The hour slider shows UTC hours.', fix: 'Ask Claude to format the value in the brand\'s timezone with Intl.DateTimeFormat and store the plain hour.' },
        { mistake: 'The test digest button can be clicked 20 times.', fix: 'The limit lives in send-digest (3 per day from email_log). Ask Claude to show the count from the response and disable the button at 0.' },
      ]),
    ],
    checklist: [
      ['Run the settings prompt', 'copy:fac-fe-settings-prompt'],
      'Check a locked engine on Starter',
      'Save an alert slider and refresh',
      'Send yourself a test digest',
    ],
  }),
]
