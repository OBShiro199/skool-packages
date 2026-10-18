// Harvest app-specific frontend tasks (appended to the Foundations phase).
import type { Task } from '../../types'

export const frontendTasks: Task[] = [
  {
    id: 'hrv-fe-onboarding',
    title: 'Build onboarding, the ICP builder and the Targeting page',
    outcome: 'A new user creates a workspace, describes their buyer in one sentence and gets an editable ICP that every score is based on.',
    minutes: 75,
    xp: 55,
    blocks: [
      { type: 'callout', tone: 'eli5', title: 'Why the ICP comes first', text: 'An ICP (ideal customer profile) is a description of the people you want to sell to. Harvest checks every person who liked a post against it. With no ICP, Harvest cannot tell a head of sales from a student, so it would spend money looking up the wrong people.' },
      { type: 'prompt', id: 'hrv-fe-onboarding-prompt', title: 'Paste into Claude Code', code: `Read @PRD.md sections 4, 7, 10 and 14.1, @DESIGN_SYSTEM.md, and @DESIGN.md sections 6, 7.2, 7.8 and 7.15.

Build:
1. lib/workspace.ts: getCurrentWorkspace() on the server: getClaims, then profiles.current_workspace_id, then the workspace and the user's role. Redirect to /onboarding if there is none.
2. app/onboarding/page.tsx: the 4-step morphing card from DESIGN.md 7.2. Step 1 calls supabase.rpc('create_workspace', { p_name, p_timezone }) then updates sender_company and sender_offer. Step 2 posts the description to /api/icp/draft and fills the chips; Save updates the default icps row. Step 3 calls the hv-add-source edge function (build the UI now; if the function is not deployed yet, show the error state). Step 4 updates workspaces.digest_hour and notification_prefs.
3. app/api/icp/draft/route.ts: server only. getClaims, rate limit 10 per hour per user (rpc try_rate_limit with the secret key client), call Claude claude-haiku-5-5 with the system prompt and JSON schema from PRD 14.1, wrap the description in <untrusted_data>, validate with zod, return the fields. ANTHROPIC_API_KEY from .env.local.
4. The app shell sidebar from DESIGN.md section 6, in this order: Today, Leads, Sources, Lists, Targeting, then the bottom group Documentation, Help, Billing, Settings. Billing hidden for non-owners. Usage block above the bottom group reads rpc('usage_summary', { ws }).
5. app/app/targeting/page.tsx with the ICP tab from DESIGN.md 7.8 (the Suppression tab comes in a later task). Threshold hint: count people in the workspace from the last 7 days with prefilter_score >= the slider value, divided by all with a prefilter_score.
Use only design tokens, no raw hex. Then run the app and screenshot onboarding steps 2 and 3 at 390px and 1440px.` },
      { type: 'steps', items: [
        'Open http://localhost:3000/signup and create a new account.',
        'Step 1: name the workspace "Test Co", company "Test Co", what you sell "Onboarding software for B2B SaaS".',
        'Step 2: paste "Heads of customer success or VP CS at B2B SaaS companies with 50 to 500 staff in the UK and US. Not agencies." and click Build my ICP. Check the chips look sensible, remove one, add one.',
        'Skip step 3 for now (the edge function comes later), finish step 4.',
        'Open Targeting and move the threshold slider. The hint line stays the same height while it updates.',
      ] },
      { type: 'code', id: 'hrv-fe-onboarding-sql', filename: 'check-onboarding.sql', lang: 'sql', code: `-- Run in Supabase > SQL Editor. You should see your workspace, you as owner,
-- and a default ICP with titles filled in.
select w.name, w.timezone, w.sender_offer, m.role,
       i.name as icp, i.titles_include, i.company_size_min, i.company_size_max
from public.workspaces w
join public.workspace_members m on m.workspace_id = w.id
join public.icps i on i.workspace_id = w.id and i.is_default;` },
      { type: 'mistakes', items: [
        { mistake: 'Step 1 fails with "new row violates row-level security policy".', fix: 'Claude Code inserted into workspaces directly. Say: "Create the workspace with supabase.rpc(\'create_workspace\'), never with an insert. The function adds the owner, the default ICP and notification prefs in one go."' },
        { mistake: 'Build my ICP returns a 500.', fix: 'ANTHROPIC_API_KEY is missing from .env.local, or the dev server was started before you added it. Add it and restart npm run dev. Check the terminal for the real error.' },
        { mistake: 'Saving the ICP returns 0 rows updated.', fix: 'Only owners and admins can update ICPs (RLS). Check you are the owner: run the SQL above. If you are, check the update filters by id and workspace_id, not by name.' },
      ] },
    ],
    checklist: [
      { id: 'hrv-fe-onboarding-c1', label: 'Copy the onboarding and ICP prompt', trigger: 'copy:hrv-fe-onboarding-prompt' },
      { id: 'hrv-fe-onboarding-c2', label: 'Sign up and finish onboarding with a real buyer description' },
      { id: 'hrv-fe-onboarding-c3', label: 'Edit the ICP chips and threshold on Targeting' },
      { id: 'hrv-fe-onboarding-c4', label: 'Run the check SQL and see your default ICP', trigger: 'copy:hrv-fe-onboarding-sql' },
    ],
  },
  {
    id: 'hrv-fe-sources',
    title: 'Build Sources, Add source and the source detail page',
    outcome: 'Users paste LinkedIn post and creator links, see them parsed live, and watch each source\'s posts, runs and yield.',
    minutes: 60,
    xp: 45,
    blocks: [
      { type: 'callout', tone: 'eli5', title: 'Posts versus creators', text: 'A post source is one post: Harvest collects who reacted at 1, 3 and 7 days old, then stops. A creator source is a person: every night Harvest checks for their new posts and adds each one. Competitors and niche influencers are usually creators.' },
      { type: 'prompt', id: 'hrv-fe-sources-prompt', title: 'Paste into Claude Code', code: `Read @PRD.md sections 7.4 (Sources), 9.1, 9.2, 11 and 13.1, and @DESIGN.md sections 7.5 and 7.6.

Build:
1. lib/linkedin.ts: the same parseLinkedInUrl(url) as supabase/functions/_shared/linkedin.ts (copy the file so the browser preview and the server agree). Add a vitest file with the same 15 cases.
2. components/harvest/UrlPreviewRow.tsx (48px reserved row) and the Add source dialog (morphs between the form and the success step, width constant). It calls supabase.functions.invoke('hv-add-source', { body }) and maps error codes to the copy in DESIGN.md 7.5 and 8.
3. app/app/sources/page.tsx: toolbar with "12 of 15 sources" (from usage_summary), the table with fixed column widths from DESIGN.md 7.5, row menu Pause/Resume (update sources.status, RLS and the guard trigger allow it), Edit (label, relation, ICP), Delete (confirm morph).
4. app/app/sources/[id]/page.tsx: Posts and Runs tabs. Runs reads apify_runs for the posts of this source. Show cost as charged_usd with 4 decimals.
5. Keyboard: N opens Add source, / focuses search.
Screenshot Sources with 3 rows and the dialog in both steps at 1440px and 390px.` },
      { type: 'steps', items: [
        'Deploy hv-add-source first (Backend phase, edge functions task) if you have not yet.',
        'Open Sources and click Add source. Paste a real LinkedIn post link from your own feed (Share > Copy link on any post).',
        'Watch the preview row show "Post" and the activity number before you click anything.',
        'Add it as Competitor without Collect now. Then paste the same link again: you should see "You already track this post."',
        'Add a creator: paste a profile link like https://www.linkedin.com/in/someone/ and tag it Influencer.',
      ] },
      { type: 'code', id: 'hrv-fe-sources-sql', filename: 'check-sources.sql', lang: 'sql', code: `-- One row per source, and one posts row for the post source.
select s.kind, s.relation, s.url_key, s.status, count(p.id) as posts
from public.sources s
left join public.posts p on p.source_id = s.id
group by s.id order by s.created_at;` },
      { type: 'mistakes', items: [
        { mistake: 'Every pasted link says it is not a LinkedIn link.', fix: 'Links copied from the LinkedIn app often carry ?utm_source=share and a different slug. Ask Claude Code to log the URL it receives, add that exact URL as a test case in lib/linkedin.ts and the edge function copy, and fix the parser until it passes.' },
        { mistake: 'The dialog jumps in width when the preview appears.', fix: 'The preview row needs a reserved min-height of 48px from the start and the dialog a fixed width of 520px. Say: "Follow DESIGN_SYSTEM.md stability rules: reserve the preview row and keep the dialog width constant."' },
        { mistake: 'Pausing a source fails with "only label, relation, ICP and status can be changed".', fix: 'The update sends every column back, including counters. Update only { status } or { label, relation, icp_id }.' },
      ] },
    ],
    checklist: [
      { id: 'hrv-fe-sources-c1', label: 'Copy the Sources prompt', trigger: 'copy:hrv-fe-sources-prompt' },
      { id: 'hrv-fe-sources-c2', label: 'Add a real post as a Competitor source' },
      { id: 'hrv-fe-sources-c3', label: 'Add a creator profile as an Influencer source' },
      { id: 'hrv-fe-sources-c4', label: 'Run the SQL and see both sources', trigger: 'copy:hrv-fe-sources-sql' },
    ],
  },
  {
    id: 'hrv-fe-today',
    title: 'Build Today, Leads and the lead side panel',
    outcome: 'This morning\'s harvest shows live as it runs, and every lead opens in a side panel with reasons, engagements, the opener and actions.',
    minutes: 110,
    xp: 70,
    blocks: [
      { type: 'callout', tone: 'eli5', title: 'Live updates without refreshing', text: 'While Harvest works through the night, the daily_runs row keeps a running count. Supabase Realtime pushes every change to the open page, so the status line moves from "Collecting" to "Processing 64%" and leads pop in as they are scored, with no refresh button.' },
      { type: 'prompt', id: 'hrv-fe-today-prompt', title: 'Paste into Claude Code', code: `Read @PRD.md sections 7.4 (Today, Leads), 9.4 and 17.1, and @DESIGN.md sections 7.1, 7.3, 7.4, 7.13, 7.16, 7.17 and 10.

Build:
1. components/harvest/: RunStatus, CountCell, TierPill, ScoreCell, EngagementLine, OpenerBox, EmailStatus exactly as DESIGN.md 7.13, plus a /dev/components page that shows every state.
2. app/app/today/page.tsx: toolbar with RunStatus, run date menu (last 14 daily_runs), Collect now (disabled with reason if workspaces.collect_now_used_at is today). Count strip from daily_runs.counters. Lead table from the lead_rows view filtered by daily_run_id, ordered by score. Subscribe with supabase.channel to postgres_changes on daily_runs and leads for this workspace_id; new leads rise once, updates change in place.
3. app/app/leads/page.tsx: filter chips and search from DESIGN.md 7.4 as URL search params, 50 rows a page, server-side query on lead_rows.
4. The side panel (?lead=<id>): reads lead_rows plus all engagements for the person (engagements joined to posts and sources). Opener edits update leads.opener (the guard trigger sets opener_edited). Actions: Save to list (menu of lists, insert list_items), Push (opens the push menu, wired in a later task), Mark customer = rpc('mark_customer'), Dismiss = update status 'dismissed' with an Undo toast, Forget = confirm morph then rpc('forget_person').
5. Selection bar with fixed width and minimum action widths for 3-digit counts.
6. J/K/Enter/C/S/D/Esc shortcuts, never while typing.
Every empty, loading, error and capped state from DESIGN.md 7.1 and 7.16. Screenshot Today with 5 leads and the panel open at 1440px, and the card list at 390px.` },
      { type: 'p', text: 'You need some data to look at before the pipeline exists. Paste this into the SQL editor to create 5 fake leads in your workspace (it uses your first workspace). Delete them later with the second query.' },
      { type: 'code', id: 'hrv-fe-today-seed', filename: 'seed-fake-leads.sql', lang: 'sql', code: `with ws as (select id from public.workspaces order by created_at limit 1),
src as (insert into public.sources (workspace_id, kind, relation, url, url_key, label)
        select id, 'post', 'competitor', 'https://www.linkedin.com/feed/update/urn:li:activity:1', 'activity:seed', 'Seed post' from ws returning id, workspace_id),
pst as (insert into public.posts (workspace_id, source_id, post_url, url_key, author_name, text_excerpt, reaction_count)
        select workspace_id, id, 'https://www.linkedin.com/feed/update/urn:li:activity:1', 'activity:seed', 'Priya Shah',
               'Churn starts in week two, not month six. Here is what we changed in onboarding...', 340 from src returning id, workspace_id),
ppl as (insert into public.people (workspace_id, person_key, linkedin_url, full_name, headline, title, company_name, company_size, email, email_status, enrich_status)
        select pst.workspace_id, 'seed-' || g, 'https://www.linkedin.com/in/seed-' || g, 'Test Person ' || g, 'Head of CS at Example ' || g,
               'Head of Customer Success', 'Example ' || g, 120, 'test' || g || '@example.com', 'ok', 'enriched'
        from pst, generate_series(1, 5) g returning id, workspace_id),
eng as (insert into public.engagements (workspace_id, person_id, post_id, kind, comment_excerpt)
        select ppl.workspace_id, ppl.id, pst.id, 'comment', 'We saw the same thing with our onboarding emails.' from ppl, pst returning id, person_id, workspace_id)
insert into public.leads (workspace_id, person_id, score, tier, reasons, opener, last_engagement_id)
select workspace_id, person_id, 60 + (random() * 35)::int, 'warm', '["Head of CS", "120 staff SaaS"]',
       'Your point about onboarding emails matched what Priya described: the drop starts in week two.', id from eng;
update public.leads set tier = 'hot' where score >= 80;

-- Clean up later:
-- delete from public.sources where url_key = 'activity:seed';` },
      { type: 'mistakes', items: [
        { mistake: 'Today shows no leads but the SQL shows 5.', fix: 'The page filters by daily_run_id and the seed leads have none. Ask Claude Code to show leads with a null daily_run_id under the most recent run while developing, or open Leads instead, which shows all.' },
        { mistake: 'Rows re-animate every time realtime fires.', fix: 'Say: "Rows rise once per session per region (DESIGN_SYSTEM.md motion). Keep a Set of seen lead ids in a ref and only animate ids not in it."' },
        { mistake: 'Realtime never fires.', fix: 'The SQL added daily_runs and leads to the supabase_realtime publication; check Database > Publications. The channel filter must be workspace_id=eq.<id> and the user must pass RLS for those rows.' },
      ] },
    ],
    checklist: [
      { id: 'hrv-fe-today-c1', label: 'Copy the Today and Leads prompt', trigger: 'copy:hrv-fe-today-prompt' },
      { id: 'hrv-fe-today-c2', label: 'Seed 5 fake leads with the SQL', trigger: 'copy:hrv-fe-today-seed' },
      { id: 'hrv-fe-today-c3', label: 'Open a lead, edit and copy its opener' },
      { id: 'hrv-fe-today-c4', label: 'Mark one lead as customer and forget another' },
    ],
  },
  {
    id: 'hrv-fe-lists',
    title: 'Build Lists, CSV export, Suppression and Integrations settings',
    outcome: 'Users save leads to lists, export a clean CSV for their sequencer, upload customer lists to suppress, and connect HubSpot, Pipedrive or a webhook.',
    minutes: 90,
    xp: 60,
    blocks: [
      { type: 'callout', tone: 'eli5', title: 'Suppression is a do-not-show list', text: 'Your existing customers like your posts too. Without a suppression list, Harvest would hand them back to you as "new leads" every morning. Upload their emails or company domains once and Harvest skips them before it spends anything.' },
      { type: 'prompt', id: 'hrv-fe-lists-prompt', title: 'Paste into Claude Code', code: `Read @PRD.md sections 7.3, 7.4 (Lists, Targeting, Settings), 13.9 and 17, and @DESIGN.md sections 7.7, 7.8 (Suppression tab) and 7.9.

Build:
1. app/app/lists/page.tsx and app/app/lists/[id]/page.tsx per DESIGN.md 7.7. New list inserts lists with created_by = the user.
2. app/api/export/[listId]/route.ts: getClaims, load the list and its leads through lead_rows with the user's session (RLS applies), stream CSV with the exact columns and rules from PRD 17.1 (BOM, CRLF, every field quoted, neutralise cells starting with = + - @). Set lists.last_exported_at. Also support /api/export/leads?ids=... for the selection bar (max 1,000).
3. Targeting > Suppression tab: upload CSV to storage bucket imports at <workspace_id>/<uuid>.csv, then insert an imports row (kind suppression_csv). The SQL trigger queues the import job; show progress from the imports row (realtime or a 3 second poll while status is uploaded or processing). Add domains dialog inserts suppressions (kind domain, source manual, lower-case, strip http and www). Table with remove for admins.
4. Settings > Integrations: Connect dialogs for HubSpot, Pipedrive and Webhook that call supabase.functions.invoke('hv-push', { body: { action: 'connect', ... } }). Show the click paths from PRD 17.3 and 17.4 inside the dialog. Webhook signing secret is shown once with Copy. Manage shows status, last used, Send test lead, Disconnect.
5. Wire the Push menu in the selection bar and lead panel to hv-push action 'push'. Toasts from DESIGN.md 8.
6. Settings > Data: Import engagers CSV (imports kind engagers_csv) with the column help from PRD 11.3.
Screenshot the Suppression upload in progress and the webhook secret step.` },
      { type: 'steps', items: [
        'Create a list called "Test list" and add 3 of your seed leads from the Leads page selection bar.',
        'Open the list and click Export CSV. Open the file in Google Sheets: 23 columns, the opener column filled, no broken characters.',
        'Make a CSV with one column named email and one of your seed lead emails (for example test1@example.com). Upload it in Targeting > Suppression.',
        'Go back to Leads: that lead now shows as Customer and is gone from the default view.',
        'In Settings > Integrations add a webhook to a free https://webhook.site URL and click Send test lead.',
      ] },
      { type: 'code', id: 'hrv-fe-lists-sql', filename: 'check-lists.sql', lang: 'sql', code: `-- Your list, the suppression from the CSV, and the import status.
select l.name, count(i.lead_id) as leads, l.last_exported_at
from public.lists l left join public.list_items i on i.list_id = l.id group by l.id;

select kind, value, source from public.suppressions order by created_at desc limit 5;

select kind, status, rows_total, rows_ok, error from public.imports order by created_at desc limit 3;` },
      { type: 'mistakes', items: [
        { mistake: 'The CSV opens in Excel with odd characters in names.', fix: 'The file needs a UTF-8 byte order mark at the very start. Say: "Prefix the CSV with \\uFEFF and use \\r\\n line endings, per PRD 17.1."' },
        { mistake: 'The import stays on "uploaded" forever.', fix: 'The import job is worked by hv-ingest, which runs from pg_cron. Until you schedule it, run it by hand with the curl from the hv-ingest edge function task.' },
        { mistake: 'Upload fails with 403 from storage.', fix: 'The path must start with the workspace id folder: imports/<workspace_id>/file.csv. Ask Claude Code to log the path and compare it with the storage policy in the SQL.' },
      ] },
    ],
    checklist: [
      { id: 'hrv-fe-lists-c1', label: 'Copy the Lists and integrations prompt', trigger: 'copy:hrv-fe-lists-prompt' },
      { id: 'hrv-fe-lists-c2', label: 'Export a list and open the CSV in Sheets' },
      { id: 'hrv-fe-lists-c3', label: 'Upload a suppression CSV and see the lead disappear' },
      { id: 'hrv-fe-lists-c4', label: 'Connect a webhook and send a test lead' },
      { id: 'hrv-fe-lists-c5', label: 'Run the check SQL', trigger: 'copy:hrv-fe-lists-sql' },
    ],
  },
  {
    id: 'hrv-fe-billing',
    title: 'Build Billing meters, the paused state, Docs and Help',
    outcome: 'Users always see how much of this month\'s engagers and enrichments they have used, paused accounts land on a clear paywall, and Docs and Help answer the obvious questions.',
    minutes: 60,
    xp: 40,
    blocks: [
      { type: 'callout', tone: 'eli5', title: 'Show the cap before they hit it', text: 'Every engager costs you a fraction of a cent and every enrichment about 2 cents. The plan caps protect your margin. Showing the meter everywhere means customers upgrade because they can see they are close, not because they hit a wall at 7am.' },
      { type: 'prompt', id: 'hrv-fe-billing-prompt', title: 'Paste into Claude Code', code: `Read @PRD.md sections 5, 15 and 18, and @DESIGN.md sections 6.1, 7.10, 7.11 and 7.12.

Build:
1. lib/plans.ts: the three plans with monthly and annual prices, caps and features exactly as PRD 15, plus priceIdToPlan from env NEXT_PUBLIC_STRIPE_PRICE_* values. Used by Billing, the landing page and the Upgrade buttons.
2. components/harvest/UsageMeter.tsx and the sidebar usage block, both reading rpc('usage_summary', { ws }). Amber under 20% left, coral under 5% (system meter rule). Tooltip copy from PRD 15.
3. app/app/billing/page.tsx per DESIGN.md 7.10: plan card, two meters, plans table with monthly/annual toggle, Manage billing (Customer Portal route from the payments phase), Change plan (Checkout with the new price).
4. Paused handling: middleware or the /app layout checks has_active_access via rpc; when false, redirect to /paywall except for /app/billing and /app/settings.
5. app/app/docs/page.tsx and app/app/help/page.tsx per DESIGN.md 7.11. Help includes the data sources statement from PRD section 5 word for word and a contact form that posts to app/api/contact/route.ts (Resend to ADMIN_EMAIL, rate limit 5 per hour).
6. PostHog: capture the events in PRD 18 that happen in the browser.
Screenshot Billing at 85% usage and the paywall.` },
      { type: 'code', id: 'hrv-fe-billing-sql', filename: 'fake-usage.sql', lang: 'sql', code: `-- Pretend you used 255 of 300 enrichments this month (85%), to see the amber meter.
insert into public.usage_ledger (workspace_id, kind, quantity, cost_micros, idempotency_key)
select id, 'enrichments', 255, 255 * 20000, 'fake-usage-' || id from public.workspaces order by created_at limit 1;

-- Remove it again:
-- delete from public.usage_ledger where idempotency_key like 'fake-usage-%';` },
      { type: 'mistakes', items: [
        { mistake: 'The meter shows 0 used even after the fake usage insert.', fix: 'usage_summary counts from the Stripe period start. If your test subscription has a current_period_start in the future or the row is missing, it falls back to the start of the month. Check select public.period_start(\'<ws>\'); in the SQL editor.' },
        { mistake: 'Billing loops back to /paywall.', fix: '/app/billing and /app/settings must be excluded from the paused redirect, otherwise paused users can never restart. Ask Claude Code to show you the matcher.' },
        { mistake: 'Landing page and Billing show different prices.', fix: 'Both must import lib/plans.ts. Search the code for "59" and "129" and replace hard-coded prices.' },
      ] },
    ],
    checklist: [
      { id: 'hrv-fe-billing-c1', label: 'Copy the Billing and Docs prompt', trigger: 'copy:hrv-fe-billing-prompt' },
      { id: 'hrv-fe-billing-c2', label: 'Insert fake usage and see the amber meter', trigger: 'copy:hrv-fe-billing-sql' },
      { id: 'hrv-fe-billing-c3', label: 'Cancel your test subscription and land on the paywall' },
    ],
  },
]
