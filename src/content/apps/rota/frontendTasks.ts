// Rota app-specific frontend tasks (appended to the Foundations phase).
import type { Task } from '../../types'

export const frontendTasks: Task[] = [
  {
    id: 'rta-fe-onboarding',
    title: 'Build onboarding, locations, job roles and the app shell',
    outcome: 'A new owner creates a business, a first location with opening hours and three job roles, and lands in an app with the 8 item sidebar.',
    minutes: 75,
    xp: 50,
    blocks: [
      { type: 'callout', tone: 'eli5', title: 'Why locations and roles come first', text: 'Every shift belongs to a place and a job. "Sam, Barista, Luna Shoreditch, Tuesday 6am." If Rota does not know the places and the jobs, it cannot check anything, cost anything or draft anything. So the first five minutes set those up.' },
      { type: 'prompt', id: 'rta-fe-onboarding-prompt', title: 'Paste into Claude Code', code: `Read @PRD.md sections 4, 7, 8 and 10, @DESIGN_SYSTEM.md, and @DESIGN.md sections 2, 6 and 7.3.

Build:
1. app/onboarding/page.tsx: the 4-step morphing card from DESIGN.md 7.3. Step 1 calls supabase.rpc('create_workspace', { p_name, p_country, p_currency }). Step 2 calls supabase.rpc('create_location', { p_ws, p_name, p_timezone }) then updates opening_hours and weekly_budget_cents on that location. Step 3 inserts job_roles (name, hue, default_rate_cents) with the industry suggestions. Step 4 is the quick invite table (wire it to POST /api/staff/invite later; for now save rows to local state and show "Invites send in the next step of the build").
2. lib/workspace.ts: getCurrentWorkspace() on the server: getClaims, then profiles.current_workspace_id, then the workspace, the user's role, and the locations they can manage (owner: all; manager: location_managers). Redirect owners with no workspace to /onboarding, and staff to /s.
3. lib/plans.ts mirroring plan_limits() from the migration (Starter 15 staff / 100 texts / 6 drafts per location, Team 40 / 180 / 10, Pro 100 / 400 / 12, US and Canada 4x texts, trial 30 texts and 2 drafts).
4. The manager app shell at app/app/layout.tsx exactly as DESIGN.md 6.1: sidebar 240px (56px under 1100px), logo, LocationSwitcher (stores the selected location id in a cookie), nav items Rota, Requests, Staff, Timesheets, then the UsageMeter (rpc usage_summary), then Documentation, Help, Billing (owner only, hidden for managers), Settings. Phosphor icons from DESIGN.md 5. No top bar, no page titles.
5. app/app/settings/page.tsx with the tabs from DESIGN.md 7.13. Build Business, Locations (list + side panel with opening hours, budget, geofence mode and radius, "Use my current position" via navigator.geolocation), and Job roles (name, hue picker of the 8 hues from DESIGN.md 2.1, default rate) now. Managers, Texting, Notifications and Profile can be placeholders.
Use only design tokens, no raw hex. Then run the app and screenshot onboarding steps 2 and 3 and the empty Rota page at 390px and 1440px.` },
      { type: 'steps', items: [
        'Open http://localhost:3000/signup and create an account.',
        'Onboarding: business "Cafe Luna", country United Kingdom, location "Luna Shoreditch", Europe/London, open 07:00 to 18:00 Monday to Saturday, closed Sunday.',
        'Pick the Cafe roles (Barista, Kitchen, Floor), give Barista a default rate of 12.50.',
        'You land on /app/rota with the sidebar. Count the items: 8, Billing only shows because you are the owner.',
        'Settings > Locations > Luna Shoreditch: try setting the geofence to Require. It must refuse on Starter with "geofenced clock-in is on Team and Pro".',
      ] },
      { type: 'code', id: 'rta-fe-onboarding-sql', filename: 'check-onboarding.sql', lang: 'sql', code: `-- Run in Supabase > SQL Editor. One business, you as owner, one location, three roles.
select w.name, w.country, w.overtime_hours_week, w.min_rest_hours, m.role,
       (select count(*) from public.locations l where l.workspace_id = w.id) as locations,
       (select string_agg(r.name || ' ' || r.hue, ', ') from public.job_roles r where r.workspace_id = w.id) as roles
from public.workspaces w
join public.workspace_members m on m.workspace_id = w.id;` },
      { type: 'mistakes', items: [
        { mistake: 'Step 1 errors with "new row violates row-level security policy for table workspaces".', fix: 'Claude Code inserted into workspaces directly. Tell it: "Create the business with supabase.rpc(\'create_workspace\'), never an insert. The function adds the owner row too."' },
        { mistake: 'create_location fails with "bad_timezone".', fix: 'The value must be an IANA name like Europe/London, not "GMT" or "BST". Ask Claude Code to fill the select from Intl.supportedValuesOf(\'timeZone\') and default to Intl.DateTimeFormat().resolvedOptions().timeZone.' },
        { mistake: 'A second location is refused with "location_limit".', fix: 'That is the paywall working: the first location is free during onboarding, more need a paid quantity. Add a location in Billing after checkout, or for testing insert a row in workspace_limit_overrides with locations = 3.' },
      ] },
    ],
    checklist: [
      { id: 'rta-fe-onboarding-c1', label: 'Copy the onboarding and shell prompt', trigger: 'copy:rta-fe-onboarding-prompt' },
      { id: 'rta-fe-onboarding-c2', label: 'Finish onboarding with a location and three roles' },
      { id: 'rta-fe-onboarding-c3', label: 'Check the sidebar has 8 items in the right order' },
      { id: 'rta-fe-onboarding-c4', label: 'Run the check SQL and see your business', trigger: 'copy:rta-fe-onboarding-sql' },
    ],
  },
  {
    id: 'rta-fe-staff',
    title: 'Build staff invites, the join page, availability and time off',
    outcome: 'Managers invite people by phone or email, staff join from the link, set their weekly availability and request time off.',
    minutes: 90,
    xp: 60,
    blocks: [
      { type: 'callout', tone: 'eli5', title: 'Two rows per person, on purpose', text: 'Everyone in the business can see the "staff" row: a name on the rota. The "staff_private" row holds the phone number, email and pay, and only managers and the person can see it. So a nosy colleague can see who is working Saturday, but never what anyone earns or their phone number.' },
      { type: 'prompt', id: 'rta-fe-staff-prompt', title: 'Paste into Claude Code', code: `Read @PRD.md sections 4, 7.2 to 7.4, 8 and 9.5, and @DESIGN.md sections 4, 7.2, 7.10, 7.16 and 8.5.

Build:
1. app/api/staff/invite/route.ts: getClaims; validate up to 10 rows { full_name, phone (E.164, must match the workspace country code), email, role_ids, location_ids, hourly_rate_cents } with zod; for each row call supabase.rpc('invite_staff', ...) with the user's session client (so the role and plan checks run as the user); then with the secret key client insert notifications rows { kind: 'invite', channel: 'sms' if phone, 'email' if email, staff_id, workspace_id, location_id: first location, dedupe_key: 'invite:' + staff_id + ':' + channel + ':' + Date.now(), payload: { token } }. Rate limit 30 invites per user per hour with try_rate_limit through an RPC wrapper. Return { invited, errors } with per-row messages (staff_limit gives the DESIGN.md copy).
2. app/api/staff/[id]/resend/route.ts: rpc('reissue_staff_invite') then new invite rows; 3 per staff per day.
3. app/app/staff/page.tsx: the table and Invite dialog from DESIGN.md 7.10, and components/staff/StaffPanel.tsx with the five tabs of DESIGN.md 7.16 (Profile, Availability, Contact, Pay, Activity). Pay and Contact read staff_private (RLS returns nothing for people you cannot manage).
4. app/join/[token]/page.tsx: DESIGN.md 7.2. Sign up or log in (email + password or magic link), then the phone and texting switch, then rpc('accept_staff_invite', { p_token, p_sms_opt_in }) and redirect to /s. Handle invite_invalid and already_member with the DESIGN.md copy.
5. components/availability/AvailabilityEditor.tsx: 7 days x 06:00 to 24:00 in 30 minute blocks, drag to paint available / preferred / unavailable, saved as availability_rules rows (merge adjacent blocks into one row per run). Desktop layout for the StaffPanel, one-day-at-a-time phone layout for /s/me/availability.
6. app/s/requests/time-off: date range + reason form inserting time_off (the guard trigger forces pending). Managers see time off in /app/requests (Time off tab) with Approve and Decline (update status; the trigger stamps decided_by).
Then invite yourself on a second email and your own phone, join from the email link in a private window, and screenshot /s/me/availability at 375px.` },
      { type: 'steps', items: [
        'In /app/staff click Invite people and add yourself on a second email address with your mobile number, role Barista.',
        'Invites are queued, not sent, until rt-notify exists (Backend phase). For now, copy the join link from the notifications row: select payload->>\'token\' from public.notifications where kind = \'invite\' order by created_at desc limit 1; and open http://localhost:3000/join/<token> in a private window.',
        'Join, switch texts on, then paint Monday to Friday 06:00 to 15:00 as available and Sunday as unavailable.',
        'Request time off for next Friday. Back in the manager window, approve it in Requests > Time off.',
      ] },
      { type: 'code', id: 'rta-fe-staff-sql', filename: 'check-staff.sql', lang: 'sql', code: `-- The person joined, is linked to a login, opted into texts, has availability and approved time off.
select s.full_name, s.status, s.user_id is not null as joined, p.sms_opt_in, p.phone_e164 is not null as has_phone,
       (select count(*) from public.availability_rules a where a.staff_id = s.id) as availability_rows,
       (select string_agg(t.status::text, ',') from public.time_off t where t.staff_id = s.id) as time_off
from public.staff s join public.staff_private p on p.staff_id = s.id
order by s.created_at desc limit 5;` },
      { type: 'mistakes', items: [
        { mistake: 'The invite route returns "forbidden" for the owner.', fix: 'The route used the secret key client for invite_staff, so auth.uid() was null. Tell Claude Code: "Call invite_staff with the user\'s server client from @supabase/ssr, and use the secret key client only for the notifications insert."' },
        { mistake: 'A staff member can see colleagues\' phone numbers in the network tab.', fix: 'Some query selected from staff_private through a join on staff with the secret key on the server. Only managers\' pages may read staff_private, and always with the user\'s client so RLS applies.' },
        { mistake: 'Availability painted on Sunday shows on Monday.', fix: 'weekday must be ISO: 1 = Monday, 7 = Sunday. JavaScript getDay() gives 0 for Sunday. Ask Claude Code to convert with (getDay() + 6) % 7 + 1 in one helper and use it everywhere.' },
      ] },
    ],
    checklist: [
      { id: 'rta-fe-staff-c1', label: 'Copy the staff and join prompt', trigger: 'copy:rta-fe-staff-prompt' },
      { id: 'rta-fe-staff-c2', label: 'Invite yourself and join from the link in a private window' },
      { id: 'rta-fe-staff-c3', label: 'Set availability and get a time off request approved' },
      { id: 'rta-fe-staff-c4', label: 'Run the staff check SQL', trigger: 'copy:rta-fe-staff-sql' },
    ],
  },
  {
    id: 'rta-fe-builder',
    title: 'Build the drag-and-drop rota builder with conflicts and cost per day',
    outcome: 'A week grid where managers drag shifts between people and days, see clashes and overtime instantly, and watch the wage bill per day update.',
    minutes: 150,
    xp: 80,
    blocks: [
      { type: 'callout', tone: 'eli5', title: 'Checks run twice, on purpose', text: 'When you drag a shift, the browser checks the rules instantly so the warning appears before you let go. When you save or publish, the database checks again with the same rules. The fast check is for you; the database check is the one nobody can skip.' },
      { type: 'prompt', id: 'rta-fe-builder-prompt', title: 'Paste into Claude Code', code: `Read @PRD.md sections 9.1, 9.2 and 11 (all of it), @DESIGN_SYSTEM.md section 08, and @DESIGN.md sections 4, 7.4, 7.5, 7.8, 7.17, 7.18 and 10.

Build:
1. lib/time.ts: zone helpers with Intl (no moment.js): weekStart(date, tz) (Monday), localToUtc(dateStr, 'HH:MM', tz), formatTime, formatRange with the "+1" suffix for overnight shifts, and tests across the last Sunday of March and October in Europe/London.
2. lib/conflicts.ts: the exact rules of PRD 11.3 in TypeScript (overlap, time_off, availability, rest, hours, role, open), pure functions with vitest tests. This file is copied into supabase/functions/_shared/conflicts.ts later, so no Next.js imports.
3. app/app/rota/[weekStart]/page.tsx (and /app/rota redirecting to next week): load the rota_weeks row (create it as draft on first visit with an insert), shifts, staff at the location with roles and availability, approved time off, job roles. Subscribe to Realtime postgres_changes on shifts with filter week_id=eq.<id> and merge without re-animating.
4. components/rota/WeekGrid.tsx with WeekToolbar, NameCell, GridCell, ShiftChip, CostFooter exactly as DESIGN.md 4 and 7.4: sticky header and name column, fixed row heights, Open shifts row on top, availability backgrounds, today marker, conflict icons, hours "32 / 40 h".
5. Drag and drop with @dnd-kit/core: move, Alt-drop to duplicate, drop on Open shifts to unassign, invalid targets (missing role) refuse. Optimistic update, then update shifts with .eq('updated_at', previous) and on zero rows reload and toast "Someone else changed this shift. Showing the latest". Undo stack of 20.
6. components/rota/ShiftPopover.tsx in a portal: start, end (15 minute steps), break, role, notes, pin, delete, make open, and the reserved live-check line ("8 h, $100" or the first warning).
7. CostFooter: hours and cost per day from staff_private.hourly_rate_cents or job_roles.default_rate_cents, compared with rpc('week_labour_cost') after each save (log a console warning if they differ).
8. Toolbar actions: Copy last week (rpc copy_week, only into an empty week), Apply template and Save as template (rpc apply_template; templates page /app/rota/templates from DESIGN.md 7.8), conflict count chip with the ConflictPopover (rpc rota_conflicts on save, local checks live). Leave "Draft with Claude" and "Publish" as disabled buttons with their final labels and widths; they are wired in a later task.
9. Under 1024px, the phone builder from DESIGN.md 7.17.
Keyboard: arrows move between cells, Enter opens the popover, Backspace deletes, Cmd/Ctrl+Z undoes. Then build a 6 person week by drag and drop and screenshot it at 1440px with one rest warning visible.` },
      { type: 'steps', items: [
        'Invite 5 fake staff (no phone, made-up emails) so the grid has 6 rows. Give two of them Kitchen only.',
        'Drag shifts until Monday to Saturday are covered. Alt-drag to duplicate a 07:00 to 15:00 shift across the week.',
        'Put the same person on 06:00 to 14:00 and 20:00 to 23:00 on Tuesday: a rest warning appears on the chip before you even save.',
        'Drag a Barista shift onto a Kitchen-only person: the drop is refused.',
        'Open the week in a second browser tab, move a shift in one tab, and watch it move in the other.',
        'Save the week as a template called "Normal week", go to the next week and apply it.',
      ] },
      { type: 'code', id: 'rta-fe-builder-sql', filename: 'check-builder.sql', lang: 'sql', code: `-- Replace <week> with the rota_weeks id from the URL or:
-- select id, week_start from public.rota_weeks order by week_start desc limit 3;
select kind, severity, detail from public.rota_conflicts('<week>');
select * from public.week_labour_cost('<week>');
select source, status, count(*) from public.shifts where week_id = '<week>' group by 1, 2;` },
      { type: 'mistakes', items: [
        { mistake: 'Shifts appear one day off, or an hour off, for some weeks.', fix: 'The code built dates with new Date(\'2026-10-20T06:00\'), which uses the laptop\'s zone. Every local time must go through localToUtc(date, time, location.timezone). Ask Claude Code to search for new Date( in components/rota and replace each one.' },
        { mistake: 'Dropping a chip makes the whole row jump taller.', fix: 'Rows must have a fixed height (--grid-row) with chips stacking inside and "+N" for overflow. Show Claude Code @DESIGN_SYSTEM.md section 08 and the GridCell spec in @DESIGN.md 4.' },
        { mistake: 'Inserting a shift returns "shift must start inside its rota week".', fix: 'The shift was saved against the wrong week_id (often the previous week for a Monday 00:30 shift). Pick the week from the shift\'s local start date in the location time zone, not UTC.' },
      ] },
    ],
    checklist: [
      { id: 'rta-fe-builder-c1', label: 'Copy the rota builder prompt', trigger: 'copy:rta-fe-builder-prompt' },
      { id: 'rta-fe-builder-c2', label: 'Build a full 6 person week by drag and drop' },
      { id: 'rta-fe-builder-c3', label: 'See a rest warning and a refused drop' },
      { id: 'rta-fe-builder-c4', label: 'Save and apply a template' },
      { id: 'rta-fe-builder-c5', label: 'Run the builder check SQL', trigger: 'copy:rta-fe-builder-sql' },
    ],
  },
  {
    id: 'rta-fe-publish-draft',
    title: 'Wire up Publish and Draft with Claude in the builder',
    outcome: 'The Publish dialog checks, warns and publishes in one morphing dialog, and the Draft panel shows Claude\'s draft as ghost shifts you can apply or discard.',
    minutes: 70,
    xp: 55,
    blocks: [
      { type: 'callout', tone: 'tip', title: 'Build this after the backend functions', text: 'This task needs rt-publish, rt-draft and rt-worker deployed (Backend phase). If you are going in order, skip it now and come back after the edge functions are live.' },
      { type: 'prompt', id: 'rta-fe-publish-draft-prompt', title: 'Paste into Claude Code', code: `Read @PRD.md sections 9.1, 9.7, 11.5, 16.1 and 16.3, and @DESIGN.md sections 4, 7.6, 7.7 and 10.

Build:
1. components/rota/PublishDialog.tsx: one 520px dialog that morphs height between Checking, Blocked, Warnings, Ready, Publishing and Done (DESIGN.md 7.7). It calls supabase.functions.invoke('rt-publish', { body: { week_id, accept_warnings } }), maps 422 conflicts / 409 warnings / 422 double_booked to the steps, shows the summary line with the number of people to be told (count distinct staff with changed shifts locally) and the texts-left meter. "Show" links close the dialog and pulse the cell outline once.
2. The toolbar Publish button: label "Publish" or "Publish changes" (week.status draft with publish_version > 0), fixed min width 148px, status tag Draft / Published / Changes not published.
3. components/rota/DraftPanel.tsx: the side panel from DESIGN.md 7.6 over the grid. Request with rt-draft { action: 'request', week_id, instructions, pinned_shift_ids } (pins live in localStorage per week, wrapped in try/catch). Subscribe to Realtime on ai_drafts by id; show the live dot while queued/running. When ready, render result.shifts as ghost chips (dashed accent edge, 60% opacity) layered over the grid, with the stats line, warnings (click scrolls to the cell) and notes. Apply calls rt-draft { action: 'apply' } (handle 409 week_changed with "Apply anyway" sending force: true). Discard calls { action: 'discard' }. When a draft turns ready while the panel is open, call { action: 'seen' } so no email is sent.
4. The "Draft with Claude (N left)" label reads usage_summary; at 0 the button is disabled with the cap tooltip.
Then publish a week and request a draft, and show me both in screenshots at 1440px.` },
      { type: 'steps', items: [
        'Publish the week you built. The dialog should go Checking, then Warnings (your rest warning), then Ready after "Publish anyway", then Done.',
        'Move one shift and confirm the button now reads "Publish changes" and the tag says "Changes not published".',
        'Go to an empty week, open Draft with Claude, type "Saturday is busy, add one more barista 10 to 4", and wait for the ghost shifts.',
        'Apply the draft, fix one warning by hand, and publish.',
      ] },
      { type: 'code', id: 'rta-fe-publish-draft-sql', filename: 'check-publish.sql', lang: 'sql', code: `-- The week is published at version 1 or more, and a draft was applied.
select week_start, status, publish_version, published_at from public.rota_weeks order by week_start desc limit 3;
select status, jsonb_array_length(result->'shifts') as shifts, jsonb_array_length(warnings) as warnings,
       cost_usd_micros / 1e6 as cost_usd
from public.ai_drafts order by created_at desc limit 3;` },
      { type: 'mistakes', items: [
        { mistake: 'The dialog flickers between two sizes and the button changes width while publishing.', fix: 'Keep one dialog and morph its height (300ms) with the width fixed, and overlay the spinner on the button label. Point Claude Code to @DESIGN_SYSTEM.md section 08: "Swap a confirm dialog for a second dialog; morph the first" is on the Don\'t list.' },
        { mistake: 'The draft stays on "Drafting" for ever.', fix: 'rt-worker is not being called. Run select * from cron.job_run_details order by start_time desc limit 5; and check the rt-worker schedule and the cron_secret in Vault. Then check Edge Functions > rt-worker > Logs.' },
        { mistake: 'Ghost shifts land on the wrong day.', fix: 'The worker returns local dates and times. The panel must convert with the same localToUtc helper as the grid, using the location time zone.' },
      ] },
    ],
    checklist: [
      { id: 'rta-fe-publish-draft-c1', label: 'Copy the publish and draft prompt', trigger: 'copy:rta-fe-publish-draft-prompt' },
      { id: 'rta-fe-publish-draft-c2', label: 'Publish a week through the morphing dialog' },
      { id: 'rta-fe-publish-draft-c3', label: 'Draft, apply and publish a week with Claude' },
      { id: 'rta-fe-publish-draft-c4', label: 'Run the publish check SQL', trigger: 'copy:rta-fe-publish-draft-sql' },
    ],
  },
  {
    id: 'rta-fe-staffapp',
    title: 'Build the staff phone app: shifts, open shifts, swaps and clock-in',
    outcome: 'Staff open one link on their phone and see their next shift, the team rota and open shifts, ask for swaps or cover, and clock in at the door.',
    minutes: 120,
    xp: 70,
    blocks: [
      { type: 'callout', tone: 'eli5', title: 'A website that behaves like an app', text: 'Staff will not download an app for their part-time job. So the staff side is a normal web page built for phones, with a manifest file that lets them "Add to Home Screen". It opens full screen with its own icon, and every text link opens it straight away.' },
      { type: 'prompt', id: 'rta-fe-staffapp-prompt', title: 'Paste into Claude Code', code: `Read @PRD.md sections 7.3, 8 (the published_snapshot note), 9.3, 9.4, 13 and 16.6 to 16.7, and @DESIGN.md sections 4, 6.2 and 8.

Build the staff app under app/s/ (phone first, checked at 320, 375 and 430px):
1. app/s/layout.tsx: the staff shell from DESIGN.md 6.2 with the 5 tab BottomTabBar (Shifts, Open, Clock, Requests, Me), safe-area padding, max width 560px. public/manifest.webmanifest (name Rota, display standalone, theme white, icons 192 and 512) and the install hint after the second visit (localStorage in try/catch).
2. lib/staffView.ts: given shift rows, return what staff should see: for status 'draft' rows with a published_snapshot use the snapshot values; hide rows whose snapshot has cancelled: true unless you want to show them struck through for 24 hours (do that). Use it for every /s query.
3. app/s/page.tsx: NextShiftCard (live dot "On shift 2 h 14 m" while clocked in), This week list, Mine / Team toggle (/s/team shows the location's published week: time, first name, role; never pay or contact).
4. app/s/open/page.tsx: open shifts the person is eligible for (role + location), with clash lines and Claim (rt-swap claim_open), Withdraw.
5. app/s/requests/page.tsx: Waiting for you (Accept / Decline: rt-swap respond), Your requests (Cancel), Time off; the three new-request sheets from DESIGN.md 8.4 (Swap a shift: pick yours, pick an eligible colleague's shift filtered by the local conflict check, note, send).
6. app/s/clock/page.tsx: the ClockButton. On press: make an Idempotency-Key with crypto.randomUUID(), call navigator.geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }), then rt-clock with the coordinates (or none if denied). Show the distance result or the DESIGN.md messages. While in: H2 timer (tabular), break select, Clock out.
7. app/s/me/page.tsx: business switcher, Availability (the phone layout of AvailabilityEditor), phone + texting switch and email + email switch through rpc('update_my_contact'), Help, Log out.
8. Realtime: subscribe to shifts for the staff member's locations and to swap_requests so the screens update without refresh.
Then open /s on your phone (use your laptop's local IP, e.g. http://192.168.1.20:3000/s, or a Vercel preview) and screenshot the home, open and clock screens.` },
      { type: 'steps', items: [
        'On your phone, log in as the staff account you created earlier. You see the shifts you were published on.',
        'Tap Share > Add to Home Screen (iPhone Safari) or the install banner (Android Chrome), then open Rota from the home screen.',
        'Ask a colleague (your second test account) to swap a shift. Accept it on the other account, approve it as the manager. The phone updates without refreshing.',
        'Go to the venue address you set (or set the location to your current position), then press Clock in. Walk 300 metres away and try again on a Require location to see the refusal.',
      ] },
      { type: 'code', id: 'rta-fe-staffapp-sql', filename: 'check-staffapp.sql', lang: 'sql', code: `-- Swaps, claims and clock-ins written by the staff app (through rt-swap and rt-clock).
select kind, status, created_at from public.swap_requests order by created_at desc limit 5;
select status, count(*) from public.open_shift_claims group by 1;
select clock_in_at, clock_out_at, round(in_distance_m) as metres, geofence_flag, status
from public.time_entries order by clock_in_at desc limit 5;` },
      { type: 'mistakes', items: [
        { mistake: 'navigator.geolocation does nothing on the phone.', fix: 'Browsers only allow location on https pages (localhost is the exception, but a phone hitting your laptop\'s IP is not localhost). Test on a Vercel preview URL, or with a tunnel like ngrok.' },
        { mistake: 'Staff see shift times that the manager has not published yet.', fix: 'A query read starts_at directly instead of going through lib/staffView.ts. Ask Claude Code to grep app/s for starts_at and make every read use the helper.' },
        { mistake: 'Clock in twice on a slow connection makes two entries.', fix: 'The Idempotency-Key must be created once when the button is pressed and reused on retries, not made inside the fetch call. The database also refuses a second open entry for the same person.' },
      ] },
    ],
    checklist: [
      { id: 'rta-fe-staffapp-c1', label: 'Copy the staff app prompt', trigger: 'copy:rta-fe-staffapp-prompt' },
      { id: 'rta-fe-staffapp-c2', label: 'Install the staff app on your phone home screen' },
      { id: 'rta-fe-staffapp-c3', label: 'Complete a swap between two test accounts' },
      { id: 'rta-fe-staffapp-c4', label: 'Clock in at the venue and get refused away from it', trigger: 'copy:rta-fe-staffapp-sql' },
    ],
  },
  {
    id: 'rta-fe-requests-timesheets',
    title: 'Build the Requests inbox, Timesheets, export and Billing per location',
    outcome: 'Managers approve swaps, claims and time off in one place, approve timesheets, download the payroll CSV, and owners add locations from Billing.',
    minutes: 90,
    xp: 55,
    blocks: [
      { type: 'prompt', id: 'rta-fe-requests-timesheets-prompt', title: 'Paste into Claude Code', code: `Read @PRD.md sections 7.2, 7.4, 10, 13.2, 14 and 16.6 to 16.8, and @DESIGN.md sections 4, 7.9, 7.11 and 7.12.

Build:
1. app/app/requests/page.tsx: segmented tabs Swaps and cover, Open shifts, Time off with fixed-width count badges; RequestRow table; Checks column runs lib/conflicts.ts on the proposed change; Approve / Decline call rt-swap decide / decide_claim (time off updates time_off.status directly); the floating selection bar for bulk approve. Show "Swap approved. Publish changes to send it with your other edits." when rt-swap returns needs_publish.
2. app/app/timesheets/page.tsx: period picker, On now strip, Not in yet list, the entries table with flags as coral tags, "Approve clean (N)" (update time_entries set status 'approved' where no flags), per-row Approve / Reject with an optional note, and the static map popover (OpenStreetMap tile image with the venue circle and the point; no API key).
3. Export dialog: calls rt-timesheet-export and opens the signed URL; toast "Timesheet exported".
4. app/app/billing/page.tsx (owner only, 404 for managers): plan, locations paid vs used, texts and drafts meters from rpc('usage_summary'), Change plan, Manage billing in Stripe (portal), Add a location dialog that calls app/api/billing/locations/route.ts: getClaims, owner check, read the subscription, stripe.subscriptions.update(subId, { items: [{ id: itemId, quantity }], proration_behavior: 'create_prorations' }), then wait for the webhook to update subscriptions.quantity (poll for 10 s) before enabling "Create location".
5. Make sure the shared Stripe webhook stores items.data[0].quantity into public.subscriptions.quantity, and Checkout passes quantity = number of active locations (min 1). Show me the code that does both.
Then approve a swap, approve a week of timesheets, export the CSV and open it in Google Sheets.` },
      { type: 'steps', items: [
        'Create a pending swap and a time off request from your staff accounts, then approve both from /app/requests.',
        'Clock in and out a few times on your staff account, then in /app/timesheets approve them.',
        'Export the CSV for this month and open it in Google Sheets: File > Import > Upload. Check accents in names and that the header row is first.',
        'In Billing, add a second location (test mode). Watch the quantity change in Stripe > Customers > your test customer > Subscription.',
      ] },
      { type: 'code', id: 'rta-fe-requests-timesheets-sql', filename: 'check-billing.sql', lang: 'sql', code: `-- Quantity from Stripe, plan limits and this month's usage.
select status, price_id, quantity, current_period_end from public.subscriptions;
select * from public.usage_summary((select id from public.workspaces limit 1));
select period_start, period_end, row_count, storage_path from public.timesheet_exports order by created_at desc limit 3;` },
      { type: 'mistakes', items: [
        { mistake: 'Adding a location charges the card but the app still says "You pay for 1 location".', fix: 'The webhook ignores quantity. In customer.subscription.updated, read subscription.items.data[0].quantity and write it to subscriptions.quantity. Re-send the event from Stripe > Developers > Events.' },
        { mistake: 'The CSV opens in Excel with Ã© instead of é.', fix: 'Excel needs a UTF-8 byte order mark. The export must start with \\uFEFF before the header row.' },
        { mistake: 'Approving a swap returns 422 even though it looks fine.', fix: 'The check found a block conflict in the other person\'s week, often a shift at another location. The response lists it: show it in the row, then fix that shift first.' },
      ] },
    ],
    checklist: [
      { id: 'rta-fe-requests-timesheets-c1', label: 'Copy the requests, timesheets and billing prompt', trigger: 'copy:rta-fe-requests-timesheets-prompt' },
      { id: 'rta-fe-requests-timesheets-c2', label: 'Approve a swap and a time off request' },
      { id: 'rta-fe-requests-timesheets-c3', label: 'Export a timesheet CSV and open it in Google Sheets' },
      { id: 'rta-fe-requests-timesheets-c4', label: 'Add a second location from Billing in test mode', trigger: 'copy:rta-fe-requests-timesheets-sql' },
    ],
  },
]
