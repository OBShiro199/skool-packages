// Etcher frontend tasks, appended to the Foundations phase.
import type { Task } from '../../types'
import { code, eli5, mistakes, p, prompt, steps, task, tip, warn } from './helpers'

export const frontendTasks: Task[] = [
  task({
    id: 'etc-fe-workspaces',
    title: 'Build workspaces: onboarding, switcher and the checklist',
    outcome: 'A new user names a workspace, picks a team size, and lands on a Home page with a 7 step setup checklist. Teams can belong to several workspaces.',
    minutes: 60,
    xp: 55,
    blocks: [
      eli5('What is a workspace?', 'A workspace is one customer company inside Etcher, like "Acme Recruiting". Everyone in it shares the same people, deals and phone numbers. One person can be in two workspaces (say, their agency and a client), so every page asks "which workspace am I in right now?" and shows only that one.'),
      p('The SQL you ran already does the heavy lifting: `create_workspace()` makes you the owner and adds a "Sales" pipeline with 6 stages, and `switch_workspace()` remembers the one you have open. This task builds the screens on top.'),
      prompt('etc-fe-workspaces-prompt', 'Paste into Claude Code (plan mode first)', `
Read @PRD.md sections 4, 6 and 6.1 and @DESIGN.md sections 2.1, 2.2, 3.2 and 3.3. UI rules: @DESIGN_SYSTEM.md @DESIGN.md.

Build:
1. lib/workspace.ts (server only): getCurrentWorkspace() reads profiles.current_workspace_id for the signed-in user (getClaims), checks membership, and returns { workspace, role, access } where access = rpc has_active_access. If the user has no workspace, redirect to /onboarding. If current_workspace_id is null but memberships exist, call switch_workspace on the first one.
2. app/onboarding/page.tsx: the 3 step card from DESIGN.md 3.2 in one morphing dialog-style card. Step 1 name (min 2 chars), step 2 team size tiles + "What do you sell?" select, step 3 plan toggle and "Start free trial". On step 2 call supabase.rpc('create_workspace', { p_name, p_team_size }), then rpc('complete_onboarding_step') for 'workspace' and 'team_size'. The template choice is stored for the checklist's pipeline step. Step 3 posts to /api/stripe/checkout with { workspace_id, interval } (we make billing workspace-level in the Backend phase; until then, link to /app).
3. The sidebar workspace switcher (components/shell/WorkspaceSwitcher.tsx) exactly as DESIGN.md 2.2: list my workspaces with role, tick the current one, "Create workspace" (opens a small dialog that calls create_workspace), "Invite teammates", "Log out". Switching calls rpc('switch_workspace') then router.refresh() to /app.
4. Sidebar items in this order: Home, People, Companies, Deals, Tasks, Calls, Reports, then pushed to the bottom: Documentation, Help, Billing, Settings, then the "me" row with the softphone status dot (static grey for now). Phosphor icons at 17px, duotone in the accent when selected. Collapse to 56px under 1100px.
5. app/app/page.tsx (Home): the checklist card from DESIGN.md 3.3 driven by workspaces.onboarding (jsonb of step -> timestamp). Steps: workspace, team_size, import, pipeline, number, invite, first_call. Each row has a fixed-width compact button. "Hide checklist" calls complete_onboarding_step('dismissed'). Below it the Today, Calls today and Pipeline cards (use placeholders until those features exist, with reserved heights).
6. Read-only mode: if access is false, show the 44px banner from DESIGN.md 3.12 under every toolbar and disable every create button with the tooltip "Restart your plan to add records".
Add the sage accent tokens from DESIGN.md 1.2 to app/globals.css. Then screenshot /onboarding and /app at 1280px and 375px.
`),
      steps(
        'Run `npm run dev`, sign up with a fresh email, and go through the 3 steps (step 3 can link straight to /app for now).',
        'Open the switcher, click **Create workspace**, make a second one called "Test Two". The sidebar now shows Test Two.',
        'Switch back to the first workspace. The checklist shows 2 of 7 done.',
      ),
      p('Check the data in Supabase > SQL Editor:'),
      code('etc-fe-workspaces-sql', 'check-workspaces.sql', 'sql', `
select w.name, w.slug, m.role, w.onboarding,
       (select count(*) from public.pipelines p where p.workspace_id = w.id) as pipelines,
       (select count(*) from public.stages s where s.workspace_id = w.id) as stages
from public.workspaces w
join public.workspace_members m on m.workspace_id = w.id
order by w.created_at;
-- Expect: one row per workspace, role owner, 1 pipeline, 6 stages, onboarding with workspace + team_size times.
`),
      mistakes([
        { mistake: 'create_workspace fails with "Not signed in".', fix: 'The call ran on the server without the user session. Ask Claude Code: "Call create_workspace from a client component with the browser Supabase client, or from a server action that uses the @supabase/ssr server client with cookies."' },
        { mistake: 'After switching, the page still shows the old workspace\'s data.', fix: 'Next.js cached the server component. Ask Claude Code: "After switch_workspace, call router.refresh() and make the /app layout dynamic (export const dynamic = \'force-dynamic\')."' },
        { mistake: 'The checklist never ticks.', fix: 'complete_onboarding_step needs a step name from the allowed list (workspace, team_size, import, pipeline, number, invite, first_call, dismissed). Check the network tab for a 22023 "Unknown step" error.' },
      ]),
    ],
    checklist: [
      ['Copy the workspaces prompt into Claude Code', 'copy:etc-fe-workspaces-prompt'],
      'Create two workspaces and switch between them',
      ['Run the check SQL and see 6 stages per workspace', 'copy:etc-fe-workspaces-sql'],
      'Screenshot Home at 375px and check nothing overflows',
    ],
  }),

  task({
    id: 'etc-fe-records',
    title: 'Build people, companies, record pages and custom fields',
    outcome: 'Fast tables with search, filter chips and bulk actions, record pages with inline editing, a timeline, tasks, and admin-defined custom fields.',
    minutes: 120,
    xp: 75,
    blocks: [
      eli5('Why custom fields live in one "custom" box', 'A recruiter wants "Notice period", an agency wants "Retainer size". Instead of adding a database column for every customer, each person has one flexible box called `custom` that holds all their extra fields. A separate list (`custom_field_defs`) says which fields exist and what type they are, so the app knows to show a date picker or a dropdown.'),
      prompt('etc-fe-records-prompt', 'Paste into Claude Code (plan mode first)', `
Read @PRD.md sections 4, 6, 7 and 8.1 and @DESIGN.md sections 2.4, 3.4, 3.7 and 4.

Build, all scoped to the current workspace (every query filters workspace_id even though RLS also does):
1. app/app/people/page.tsx and app/app/companies/page.tsx: the toolbar, filter bar, table, selection bar and footer exactly as DESIGN.md 3.4. Server-side pagination (50 per page) with .range(), search with ilike on name/email (people) or name/domain (companies) using the trigram indexes, filter chips for owner, company, lead source, created and last contacted, plus any custom field (custom->>'key'). Saved views stored in localStorage for now.
2. Add person / Add company dialogs (520px, 10% from top). Email lower-cased, phone parsed to E.164 with libphonenumber-js (default country from the workspace currency: GBP -> GB, else US). Duplicate email shows "Someone with this email already exists" with a link to them (Postgres error 23505).
3. app/app/people/[id]/page.tsx and companies/[id]: three columns (Fields, Timeline, Related) as DESIGN.md 2.4. Inline edit with a FieldValue component that keeps the row at 36px. Phone values render a Call button (wire it to a no-op for now; the softphone task connects it).
4. Timeline: activities for the record ordered by occurred_at desc, grouped by day, infinite scroll 30 at a time. Composer tabs Note | Log email (subject, body, direction sent/received, date) | Log call (manual, for calls made outside Etcher). Notes insert type 'note' with actor_id = me.
5. Tasks: the Related column task list and app/app/tasks/page.tsx (Overdue, Today, Upcoming, Done), Add task dialog with due, remind (sets remind_at), assignee, linked record. Checking a task sets status done and completed_at, and inserts a task_done activity.
6. Settings > Fields (admins): per object list, add/edit/archive, drag to reorder (position). Values validated with a zod schema built from the definitions before saving into custom.
7. Soft delete: "Move to bin" sets deleted_at; admins get a "Bin" filter to restore for 30 days. Show the Postgres error text from records_guard if a member tries to bin someone else's record.
8. Realtime: subscribe to activities for the open record so a teammate's note appears without refresh (rise once, never re-animate existing rows).
Use the empty, loading and error states from DESIGN.md section 4.
`),
      steps(
        'Add 3 people by hand, one with a UK mobile typed as 07700 900123. Open them: the phone shows as +447700900123.',
        'Settings > Fields > People > Add field: "Notice period", type Select, options 1 week, 1 month, 3 months. Set it on one person.',
        'Add a note and a task due today on that person. Home shows the task under Today.',
        'Run the SQL below to check the phone, custom field and timeline rows.',
      ),
      code('etc-fe-records-sql', 'check-records.sql', 'sql', `
select first_name, last_name, email, phone, custom from public.people order by created_at desc limit 5;
select key, value from public.custom_field_values limit 10;
select type, body, occurred_at from public.activities order by occurred_at desc limit 5;
`),
      tip('Seed 500 fake people', 'Ask Claude Code: "Using the Supabase MCP, insert 500 realistic fake people and 120 companies into my current workspace with UK and US phone numbers, then delete them when I say clean up." Tables only show their speed with real-looking volume.'),
      mistakes([
        { mistake: 'The people table is empty but rows exist in Supabase.', fix: 'RLS hides them: either the workspace has no trialing/active subscription (fine for reads, check the select policy) or the query uses another workspace id. Ask Claude Code: "Print the workspace_id used by the people query and compare it with profiles.current_workspace_id."' },
        { mistake: 'Saving a person fails with "new row violates row-level security policy".', fix: 'Inserts need created_by = your user id and an active trial. Make sure the insert sends created_by and that the workspace has a subscriptions row (the Backend billing task adds it; for testing, insert one with status trialing using the SQL editor).' },
        { mistake: 'Typing in an inline field makes the row jump.', fix: 'The input is taller than the 36px row. Tell Claude Code: "FieldValue must render the input inside the same fixed-height box with no extra padding, per DESIGN.md stability rules."' },
      ]),
    ],
    checklist: [
      ['Copy the records prompt into Claude Code', 'copy:etc-fe-records-prompt'],
      'Add a person with a UK mobile and see it saved as +44',
      'Create a custom field and set it on a person',
      ['Run the check SQL', 'copy:etc-fe-records-sql'],
      'Add a note and a task and see them on the timeline',
    ],
  }),

  task({
    id: 'etc-fe-pipeline',
    title: 'Build the deals board, stage editor and forecast',
    outcome: 'Multiple pipelines from templates, a kanban you can drag deals across, a table view, a close won/lost dialog with reasons, and weighted forecast totals.',
    minutes: 120,
    xp: 75,
    blocks: [
      eli5('What is a weighted forecast?', 'Each stage has a chance of winning. A $10,000 deal in Proposal (50%) counts as $5,000 in the forecast. Add up every open deal that way and you get a realistic number for "how much will we probably close", instead of the hopeful total.'),
      prompt('etc-fe-pipeline-prompt', 'Paste into Claude Code (plan mode first)', `
Read @PRD.md sections 4, 8.1 and 21 tests 3 and 4, and @DESIGN.md sections 1.3, 3.5, 3.6 and 3.11 (Pipelines).

Build:
1. npm install @dnd-kit/core @dnd-kit/sortable canvas-confetti.
2. app/app/deals/page.tsx: pipeline switcher (non-archived pipelines by position), Board | Table toggle, forecast strip reading the views pipeline_stage_totals (per stage) and pipeline_win_rates. Columns 280px with sticky headers showing stage pill, count, value and weighted value (Intl.NumberFormat with the pipeline currency, value_cents / 100).
3. Drag and drop with dnd-kit (pointer + keyboard sensors). On drop compute position as the midpoint between the neighbours' position values (first = neighbour - 1024, empty column = 1024). Optimistic update, then supabase.from('deals').update({ stage_id, position }). On error, revert with a 200ms transform and toast "Could not move the deal. It is back where it was". Never let status be set from the client: the trigger derives it from the stage kind.
4. Dropping onto a Won or Lost stage opens the close dialog (DESIGN.md 3.6) first. Saving sends one update with stage_id, close_reason, lost_reason_category and value_cents. Won fires confetti once (skip if prefers-reduced-motion).
5. Add deal dialog: name, value + currency (default = pipeline currency), stage (default first open stage), person and company comboboxes (search within the workspace), owner, expected close date.
6. Table view with inline stage select, sortable columns, and the deal record page app/app/deals/[id] reusing the record layout and timeline.
7. "New pipeline" dialog (admins): template cards (Agency, Recruiting, B2B sales, Partnerships, Blank) showing their stages as pills, calling rpc('create_pipeline_from_template', { p_workspace_id, p_template, p_name, p_currency }), then complete_onboarding_step('pipeline').
8. Settings > Pipelines stage editor: rename, colour menu (9 names), win % 0 to 100, add stage (inserts at the end before Won/Lost), delete only when a stage has 0 deals, drag to reorder calling rpc('reorder_stages', { p_pipeline_id, p_stage_ids }).
9. Realtime on deals for the current pipeline: apply teammates' moves with a transform, no full re-render.
`),
      steps(
        'Create a Recruiting pipeline from the template.',
        'Add a $5,000 deal in "Screened" (25%). The forecast strip shows $1,250 weighted.',
        'Drag it to "Offer" (85%). Weighted becomes $4,250 without the page jumping.',
        'Drag it to Won, enter a reason, and see the confetti. Reopen it by dragging back to Offer.',
        'Open the board in two browser windows and move a card in one: it moves in the other.',
      ),
      code('etc-fe-pipeline-sql', 'check-pipeline.sql', 'sql', `
select stage_name, deal_count, value_cents, weighted_cents
from public.pipeline_stage_totals
where value_cents > 0;

select type, meta->>'from' as from_stage, meta->>'to' as to_stage, occurred_at
from public.activities
where type in ('stage_change', 'deal_won', 'deal_lost', 'deal_created')
order by occurred_at desc limit 6;
`),
      mistakes([
        { mistake: 'Error "That stage is not part of this pipeline" when moving a deal.', fix: 'The board sent a stage id from another pipeline (stale state after switching pipelines). Ask Claude Code: "Reset the board state when the pipeline changes and send pipeline_id with every update."' },
        { mistake: 'Cards jump around after a drop, or two cards swap places on refresh.', fix: 'Positions collide. Ask Claude Code: "Use fractional positions (double precision midpoints) and, when two neighbours are closer than 0.0001, renumber that column in one batch update."' },
        { mistake: 'Reordering stages fails with a duplicate key error.', fix: 'The reorder must go through rpc reorder_stages, which relies on the deferrable unique constraint. Do not update positions one by one from the browser.' },
      ]),
    ],
    checklist: [
      ['Copy the pipeline prompt into Claude Code', 'copy:etc-fe-pipeline-prompt'],
      'Create a pipeline from a template',
      'Drag a deal through stages and close it as won',
      ['Run the pipeline check SQL', 'copy:etc-fe-pipeline-sql'],
      'See a teammate\'s move appear live in a second window',
    ],
  }),

  task({
    id: 'etc-fe-softphone',
    title: 'Build the softphone dock and the call wrap-up',
    outcome: 'A floating dock that makes and receives calls in the browser, shows a timer and recording state, and asks for an outcome, a note and a follow-up task after every call.',
    minutes: 90,
    xp: 70,
    blocks: [
      eli5('How can a website make phone calls?', 'The browser sends your voice over the internet to Twilio (like a video call with no video). Twilio then rings a normal phone number and joins the two together. Your app only needs a short-lived "ticket" (an access token) that proves to Twilio you are allowed to use this workspace\'s phone line.'),
      warn('Do this after the Backend calling tasks', 'The dock needs the twilio-token and twilio-voice functions and a bought number. Build the UI now with a fake call state switcher, then wire it for real once Backend > "Set up Twilio Voice" is done.'),
      prompt('etc-fe-softphone-prompt', 'Paste into Claude Code (plan mode first)', `
Read @PRD.md sections 10.3, 10.4, 12.1 and @DESIGN.md sections 2.3, 7 and 9.

Build components/softphone/SoftphoneDock.tsx, mounted once in app/app/layout.tsx so it survives navigation, plus lib/softphone.ts (the Device wrapper from the twilio-token prompt) and a React context useSoftphone() exposing { status, call, connect(to, ctx), answer(), decline(), hangup(), mute(), sendDigits() }.
1. States and heights exactly as DESIGN.md 2.3: offline, idle, dialling, in call, incoming, wrap-up. Fixed 320px width; height morphs 300ms; reduced motion = instant.
2. On mount: POST twilio-token with the current workspace id; create the Device; register; listen to registered, unregistered, error, incoming, tokenWillExpire. Status dot in the sidebar "me" row mirrors the Device state.
3. Every phone number in the app (tables, record fields, deal related people) renders a CallButton that calls connect(person.phone, { personId, dealId }). Before connecting, warn if the callee's local time is before 08:00 or after 21:00 (derive the timezone from the country/area code with libphonenumber-js; if unknown, skip the warning).
4. In call: timer from the accept event (tabular, 1s), Mute, Keypad (3x4, sends DTMF with call.sendDigits), Hang up. Show the "Recording" pill when the workspace has record_calls on.
5. Incoming: show the personName custom parameter if present, else the number; Answer / Decline equal width; play a ring sound; a polite live region announces it; a browser Notification when the tab is hidden (ask permission in the onboarding "Make a test call" step).
6. Wrap-up after every call that connected or failed: disposition chip grid (the call_disposition enum with plain labels: Connected positive, Connected neutral, Connected negative, Meeting booked, Voicemail, No answer, Gatekeeper, Wrong number, Callback requested, Do not call), note, optional follow-up task (Tomorrow 09:00, In 3 days, Next week). Save updates calls (disposition, notes, wrapped_up_at) found by twilio_call_sid = call.parameters.CallSid, creates the task, and sets people.do_not_call when "Do not call" is picked. Toast "Call logged".
7. The minutes meter in the idle state reads rpc('minutes_status', { ws }) on mount and after each call.
8. Map Device errors to the DESIGN.md messages (microphone blocked, token invalid, network).
9. Mobile under 768px: the dock becomes a full-width bottom bar.
Also add the Calls page (app/app/calls/page.tsx) from DESIGN.md 3.8 with the recording player using a server action that returns a 60 second signed URL.
`),
      steps(
        'Use a headset. Open a person with your own mobile number and click **Call**.',
        'Your mobile rings with your Etcher number as caller ID. Answer, talk for a minute, hang up from the dock.',
        'Pick **Meeting booked**, add a note and a "Tomorrow" task, click **Save**.',
        'Call your Etcher number from your mobile and answer in the browser.',
      ),
      code('etc-fe-softphone-sql', 'check-calls.sql', 'sql', `
select direction, status, duration_seconds, billable_minutes, disposition, notes, wrapped_up_at is not null as wrapped
from public.calls order by started_at desc limit 3;
select public.minutes_status(workspace_id) from public.calls order by started_at desc limit 1;
`),
      mistakes([
        { mistake: 'The dock says "Microphone blocked".', fix: 'The browser denied mic access. Click the padlock in the address bar > Site settings > Microphone > Allow, then reload. On macOS also check System Settings > Privacy & Security > Microphone for your browser.' },
        { mistake: 'Calls connect but nobody hears anything.', fix: 'Usually a corporate network blocking WebRTC UDP. Test on another network. Twilio\'s network test page (networktest.twilio.com) shows which ports are blocked.' },
        { mistake: 'The wrap-up saves but nothing updates.', fix: 'The update used the wrong call sid. Ask Claude Code: "Log call.parameters.CallSid and compare it with calls.twilio_call_sid; the browser sees the parent call sid."' },
      ]),
    ],
    checklist: [
      ['Copy the softphone prompt into Claude Code', 'copy:etc-fe-softphone-prompt'],
      'Make an outbound call to your own mobile',
      'Save a wrap-up with a follow-up task',
      'Answer an inbound call in the browser',
      ['Run the calls check SQL', 'copy:etc-fe-softphone-sql'],
    ],
  }),

  task({
    id: 'etc-fe-import',
    title: 'Build the CSV import mapper and export buttons',
    outcome: 'Admins upload a CSV, map columns with auto-suggestions, choose a dedupe rule, and watch a live progress bar. Exports arrive by email.',
    minutes: 75,
    xp: 60,
    blocks: [
      eli5('Why the browser does not do the import', 'A 20,000 row file takes minutes to check and save. If the browser did it, closing the tab would stop it halfway. So the browser only uploads the file and says "please import this". A worker in Supabase does the rest in small batches and reports progress, and you can close the laptop.'),
      prompt('etc-fe-import-prompt', 'Paste into Claude Code (plan mode first)', `
Read @PRD.md sections 9 and 12.6 and @DESIGN.md section 3.10.

Build app/app/import/page.tsx (admins only; members get a friendly "Ask an admin to import" state):
1. Upload step: dashed drop zone, accept .csv only, max 25 MB. Parse ONLY the first 20 rows in the browser with papaparse (preview: 20) to get headers and samples, and estimate rows from the file size. Show the 5 row preview.
2. Create the import_jobs row first (status queued, file_name, file_path = '<ws>/<job id>.csv', entity people), then upload the file to the imports bucket at that path. If the upload fails, delete the job row.
3. Mapping step: for each header, a select grouped Person / Company / Custom fields / Don't import, auto-suggested from the dictionary in PRD section 9 (lowercase, trim, strip punctuation, match "contains"). "Matched" pill on suggestions. Require one of email, first name, last name or company. Dedupe radio (Skip, Update empty fields, Create anyway), toggles for create companies, assign owner, add as deals (pipeline + stage + default value).
4. Save mapping, dedupe and options on the job, then call supabase.functions.invoke('import-leads', { body: { job_id } }).
5. Progress step: subscribe with Realtime to that import_jobs row. Progress bar (accent, width eases 400ms), "Importing 2,000 of 4,812" in a fixed-width tabular box, counters, live dot, Cancel (update status cancelled). Done: summary, "View people", "Download N error rows" (build a CSV from job.errors in the browser).
6. History table under it.
7. Exports: Settings > Data cards and an "Export" action on the People, Companies, Deals and Calls toolbars (and in the selection bar for selected rows, passing ids in filters). Each calls export-leads and shows the toast "Export started. We will email you a link". The card shows the latest export's status from export_jobs via Realtime.
8. complete_onboarding_step('import') after the first completed import.
`),
      steps(
        'Download a CSV from a spreadsheet with 50 rows: First name, Last name, Email, Phone, Company, Website, Job title. Duplicate 5 emails on purpose.',
        'Import it. Check the auto-mapping picked every column, choose **Skip**, click **Import 50 people**.',
        'Watch the bar fill. The summary says 45 inserted and 5 skipped.',
        'Settings > Data > People > **Export CSV**. The email arrives with a working link.',
      ),
      code('etc-fe-import-sql', 'check-import.sql', 'sql', `
select file_name, status, total_rows, inserted_count, updated_count, skipped_count, error_count
from public.import_jobs order by created_at desc limit 3;
select name, storage_path is null as no_path from storage.objects where bucket_id = 'imports' order by created_at desc limit 3;
`),
      mistakes([
        { mistake: 'Upload fails with "new row violates row-level security policy" on storage.objects.', fix: 'The path must start with the workspace id and you must be an admin with an active trial. Check the path is "<workspace uuid>/<job id>.csv" with no leading slash.' },
        { mistake: 'Progress bar never moves.', fix: 'Realtime is not on for import_jobs, or the function was never called. In Supabase > Database > Publications check supabase_realtime includes import_jobs, then check Edge Functions > import-leads > Logs.' },
        { mistake: 'Accents look broken (JosÃ©) after import.', fix: 'The CSV was saved in a non-UTF-8 encoding. Re-save it as "CSV UTF-8" in Excel, or ask Claude Code to detect Windows-1252 and convert before parsing.' },
      ]),
    ],
    checklist: [
      ['Copy the import prompt into Claude Code', 'copy:etc-fe-import-prompt'],
      'Import a 50 row CSV with 5 duplicate emails',
      ['Run the import check SQL', 'copy:etc-fe-import-sql'],
      'Export people and open the emailed link',
    ],
  }),

  task({
    id: 'etc-fe-reports',
    title: 'Build reports, settings tabs and the audit log',
    outcome: 'Managers see pipeline by stage, forecast, win rate, cycle time, calls per rep and revenue by month, and admins manage members, calling, numbers and data in Settings.',
    minutes: 90,
    xp: 60,
    blocks: [
      eli5('Where the numbers come from', 'The SQL created "views": saved questions like "how much is in each stage?". They run as the person asking, so a manager only ever sees their own workspace\'s totals. The Reports page asks those views and draws the answers.'),
      prompt('etc-fe-reports-prompt', 'Paste into Claude Code (plan mode first)', `
Read @PRD.md sections 4 (manager stories), 6.2, 13, 17 and @DESIGN.md sections 3.9, 3.11 and 3.12.

1. npm install recharts. app/app/reports/page.tsx with the five cards from DESIGN.md 3.9 reading the views pipeline_stage_totals, pipeline_forecast, pipeline_win_rates, revenue_closed_monthly and rep_call_stats_daily (filtered by workspace_id and date range). Join rep stats to profiles for names. Every card reserves its 280px chart height before data arrives. Currency per pipeline; never add up different currencies (show one row per currency).
2. Settings page with the left tab list from DESIGN.md 3.11: Profile, Workspace, Members, Pipelines (already built), Fields (already built), Calling, Numbers, Data (already built), Audit log. Hide admin tabs for members.
3. Members: table with role select (owner/admin/member; owner options only visible to owners), remove, pending invites with Resend / Revoke, Invite dialog (chips input for emails, role). Wire buttons to invite-member actions (built in Backend). Show the trigger's error text ("A workspace needs at least one owner...") as an inline error.
4. Calling: the mode cards, recording and consent switches, consent text with a 200 character counter, ring timeout and inbound fallback selects, updating workspaces and workspace_telephony (admins). The UK compliance section renders fields from the buy-number uk_regulations action response.
5. Numbers: table + Buy number dialog wired to buy-number (search, buy with an idempotency key generated once per dialog open, release with type-to-confirm).
6. Audit log: filter bar and table reading audit_log, side panel with a before/after key diff (only keys that changed).
7. Profile: email preference switches, timezone, delete my account (calls rpc account_deletion_blocker first, then a server action that uses the secret key to run supabase.auth.admin.deleteUser after the user types DELETE). Workspace: delete workspace calls rpc delete_workspace after typing the name.
8. Billing page from DESIGN.md 3.12 with the minutes meter (rpc minutes_status), numbers used, plan card and "Manage billing" (portal). Wire the buttons in the Backend billing task.
9. Documentation (app/app/docs with MDX articles listed in DESIGN.md 3.13) and Help (contact form posting to a server action that sends through Resend to SUPPORT_EMAIL).
`),
      steps(
        'Close two deals as won and one as lost, make three calls, then open Reports.',
        'Check win rate shows 66.7% and calls per rep shows your three calls.',
        'Settings > Audit log: you see the stage changes and number purchase, with a diff when you click a row.',
      ),
      code('etc-fe-reports-sql', 'check-reports.sql', 'sql', `
select * from public.pipeline_win_rates;
select day, calls, connected, talk_seconds from public.rep_call_stats_daily order by day desc limit 7;
select action, entity, created_at from public.audit_log order by created_at desc limit 10;
`),
      mistakes([
        { mistake: 'Reports show totals from every workspace you belong to.', fix: 'The views return all workspaces you can see. Add .eq(\'workspace_id\', currentWorkspaceId) to every report query.' },
        { mistake: 'Charts flash and resize while loading.', fix: 'Tell Claude Code: "Give every ReportCard a fixed 280px chart area and render the skeleton inside it, per the stability rules."' },
        { mistake: 'Delete account fails with "User not allowed".', fix: 'auth.admin.deleteUser needs the secret key and must run on the server. Check the server action uses SUPABASE_SECRET_KEY, never the publishable key.' },
      ]),
    ],
    checklist: [
      ['Copy the reports and settings prompt', 'copy:etc-fe-reports-prompt'],
      'See win rate and calls per rep on Reports',
      'Open an audit log entry and read the diff',
      ['Run the reports check SQL', 'copy:etc-fe-reports-sql'],
    ],
  }),
]
