// Shortlist app-specific frontend tasks (appended to the Foundations phase).
import type { Task } from '../../types'

export const frontendTasks: Task[] = [
  {
    id: 'shl-fe-jobs',
    title: 'Build onboarding, the sidebar and the job editor with bias lint',
    outcome: 'A new user names the company, picks a careers address and writes a job with questions and criteria that Shortlist checks for biased wording.',
    minutes: 90,
    xp: 60,
    blocks: [
      { type: 'callout', tone: 'eli5', title: 'Why criteria come before anything else', text: 'Criteria are the short list of things a great hire shows on their CV, like "has run payroll for 20+ people". The AI summarises CVs against these and nothing else, and interviewers score against the same list. Write them well and everything downstream is fairer and faster.' },
      { type: 'prompt', id: 'shl-fe-jobs-prompt', title: 'Paste into Claude Code', code: `Read @PRD.md sections 4, 7, 8, 9.2 (rule 4) and 11.1, @DESIGN_SYSTEM.md, and @DESIGN.md sections 4 (components 7 and 8), 6, 7.2, 7.3, 7.4 and 7.13.

Build:
1. app/onboarding/page.tsx: the 3 step morphing card. Step 1 checks slug availability with a debounced select on workspaces (RLS hides other rows, so add a security definer RPC slug_available(p_slug text) returns boolean in a new migration supabase/migrations/0002_slug.sql and run it with the Supabase MCP), then supabase.rpc('create_workspace', { p_name, p_slug }). Step 2 inserts a draft job (created_by = my user id, slug from the title). Step 3 calls supabase.rpc('create_invite') per email; show "seat_limit_reached" as "Your plan has 3 seats."
2. lib/workspace.ts: getCurrentWorkspace() on the server: getClaims, profiles.current_workspace_id, the workspace and my role. Redirect to /onboarding if none.
3. The app shell sidebar from DESIGN.md section 6 with these items in this order: Jobs, Candidates, Interviews, Careers page, then the bottom group Documentation, Help, Billing, Settings. Billing hidden for non-owners, Careers page hidden for interviewers. Usage meter above the bottom group from supabase.rpc('usage_summary', { ws }). Bell in the header (wire it in the board task).
4. app/app/jobs/page.tsx: the jobs table (counts per stage from one grouped query), empty state, first-run checklist.
5. app/app/jobs/[id]/(editor tabs): Details, Form, Criteria, Team as DESIGN.md 7.4. Criteria rows save on blur; lint_warnings come back from the insert/update (select them after saving) and render under the row with "Rewrite" and "Keep with a reason" (writes override_reason). Publish dialog: update jobs set status = 'open' and map the trigger errors paused, open_job_limit_reached, add_criteria_first, fix_flagged_criteria to the DESIGN.md microcopy.
6. app/app/careers/page.tsx: the careers page editor with logo upload to careers-assets/<workspace_id>/logo.<ext> and a live preview.
Use only tokens, no raw hex. Run the app and screenshot onboarding step 1 and the Criteria tab with a lint warning at 390px and 1440px.` },
      { type: 'steps', items: [
        'Open http://localhost:3000/signup, create an account and finish onboarding: company "Acme Test", careers address "acme-test", first job "Operations lead".',
        'Open the job > Criteria. Add "Young, energetic digital native". A warning appears under it within a second.',
        'Click Publish. The dialog says "Rewrite the flagged criterion or add a reason before publishing."',
        'Rewrite it to "Has run day-to-day operations for a team of 10 or more" and add two more criteria. Publish works and "Copy link" appears.',
        'Open Careers page, upload a logo, write a headline and switch "Publish careers page" on.',
      ] },
      { type: 'code', id: 'shl-fe-jobs-sql', filename: 'check-jobs.sql', lang: 'sql', code: `-- Run in Supabase > SQL Editor.
-- 1. Your workspace, you as owner, and the six seeded email templates.
select w.name, w.slug, m.role,
       (select count(*) from public.email_templates t where t.workspace_id = w.id) as templates
from public.workspaces w join public.workspace_members m on m.workspace_id = w.id;

-- 2. The job is open with clean criteria (no warnings left, or a written override).
select j.title, j.status, j.criteria_version, c.label, c.lint_warnings, c.override_reason
from public.jobs j join public.job_criteria c on c.job_id = j.id
order by c.position;` },
      { type: 'mistakes', items: [
        { mistake: 'Onboarding fails with "new row violates row-level security policy for table workspaces".', fix: 'Claude Code inserted into workspaces directly. Say: "Create the workspace only with supabase.rpc(\'create_workspace\', { p_name, p_slug }). It adds the owner, the email templates and the profile link in one go."' },
        { mistake: 'Publishing shows a raw Postgres error like "fix_flagged_criteria".', fix: 'Ask Claude Code to map each trigger error code to the DESIGN.md microcopy in one lib/errors.ts and use it in the publish dialog.' },
        { mistake: 'Lint warnings do not appear after typing.', fix: 'The trigger fills lint_warnings on insert/update, so the UI must read the row back after saving (.select() after .update()). Ask Claude Code to show the warning from the returned row, not from a client copy.' },
      ] },
    ],
    checklist: [
      { id: 'shl-fe-jobs-c1', label: 'Copy the onboarding and job editor prompt', trigger: 'copy:shl-fe-jobs-prompt' },
      { id: 'shl-fe-jobs-c2', label: 'Finish onboarding and create a draft job' },
      { id: 'shl-fe-jobs-c3', label: 'See a bias warning, rewrite the criterion and publish' },
      { id: 'shl-fe-jobs-c4', label: 'Publish the careers page with a logo' },
      { id: 'shl-fe-jobs-c5', label: 'Run the check SQL', trigger: 'copy:shl-fe-jobs-sql' },
    ],
  },
  {
    id: 'shl-fe-careers',
    title: 'Build the careers page, job page and mobile apply form',
    outcome: 'Anyone can open your careers link on a phone, read the job and criteria, and apply with a CV in under three minutes.',
    minutes: 80,
    xp: 60,
    blocks: [
      { type: 'callout', tone: 'eli5', title: 'Why the form talks to an edge function', text: 'Candidates have no login, so the form cannot write to your database directly. It asks sl-apply to check everything and hand back a one-time upload link for the CV. The file goes into a locked folder that only your hiring team can open.' },
      { type: 'prompt', id: 'shl-fe-careers-prompt', title: 'Paste into Claude Code', code: `Read @PRD.md sections 7 (public routes), 10 (rules 1, 2, 7) and 19, @DESIGN.md section 8, and the sl-apply prompt you built.

Build:
1. app/careers/[company]/page.tsx: server component, publishable key client, supabase.rpc('get_careers_page', { p_slug }). Null = notFound(). Revalidate 60 s.
2. app/careers/[company]/[job]/page.tsx: rpc get_public_job. Render the job, the "What we look for" criteria list, and components/careers/ApplyForm.tsx (from the sl-apply task). Paused jobs show "Applications are paused for this role" instead of the form. Add JobPosting JSON-LD (PRD section 19) in a script tag type application/ld+json, generateMetadata with title, description and an OG image route app/careers/[company]/[job]/opengraph-image.tsx.
3. The form's AI notice box with the exact copy from PRD section 10 rule 1 (N from company.retention_days), the "Do not use AI on my application. A person will read it in full." checkbox, the talent pool checkbox (N months from talent_pool_days), the required privacy checkbox. Hide the AI sentence and the opt-out box if company.ai_enabled is false. A hidden honeypot input named company_website (tabIndex -1, aria-hidden, off-screen) mapped to hp, and elapsed_ms measured from first render.
4. app/careers/[company]/[job]/applied/page.tsx with the copy from DESIGN.md section 8.
5. Pass ?src= from the URL through to sl-apply as the source (so "linkedin" links can be tracked).
Mobile first: 44px fields, labels above inputs, dropzone keyboard accessible. Screenshot the job page and the filled form at 375px.` },
      { type: 'steps', items: [
        'Open http://localhost:3000/careers/acme-test on your phone (or DevTools device mode, iPhone 12). Your job is listed.',
        'Open the job, attach a 2 page PDF CV, answer the questions, tick the privacy box and submit.',
        'You land on "Application sent" and get the confirmation email within a minute (after the email worker task).',
        'Paste the job URL into Google\'s Rich Results Test (search.google.com/test/rich-results) after you deploy. It should detect a Job posting.',
      ] },
      { type: 'code', id: 'shl-fe-careers-sql', filename: 'check-application.sql', lang: 'sql', code: `-- The application is active, the CV path matches the folder rule,
-- and the privacy notice tick was recorded.
select a.state, a.stage, a.cv_path, a.cv_mime, a.privacy_ack_at is not null as notice_ack,
       a.ai_opt_out, c.email
from public.applications a join public.candidates c on c.id = a.candidate_id
order by a.created_at desc limit 3;

-- The file exists in the private cvs bucket.
select name, metadata ->> 'size' as bytes from storage.objects
where bucket_id = 'cvs' order by created_at desc limit 3;` },
      { type: 'mistakes', items: [
        { mistake: 'The CV upload fails with 400 "invalid signature" or 403.', fix: 'The upload must use uploadToSignedUrl(path, token, file) with the exact path and token sl-apply returned, within 2 hours. Ask Claude Code to log the path it uploads to and compare it with the one in the start response.' },
        { mistake: 'The careers page shows a 404 even though the job is open.', fix: 'get_careers_page returns null unless careers_published is true and the owner has an active trial. Switch on "Publish careers page" and check your subscriptions row says trialing.' },
        { mistake: 'Google\'s Rich Results Test says "missing field".', fix: 'Google changes JobPosting requirements. Ask Claude Code: "Check the current Google JobPosting structured data docs and fix the JSON-LD for the warnings shown." Remote jobs need jobLocationType TELECOMMUTE plus applicantLocationRequirements.' },
      ] },
    ],
    checklist: [
      { id: 'shl-fe-careers-c1', label: 'Copy the careers and apply form prompt', trigger: 'copy:shl-fe-careers-prompt' },
      { id: 'shl-fe-careers-c2', label: 'Apply to your own job from a phone-sized screen' },
      { id: 'shl-fe-careers-c3', label: 'Run the check SQL and see the CV in the cvs bucket', trigger: 'copy:shl-fe-careers-sql' },
    ],
  },
  {
    id: 'shl-fe-board',
    title: 'Build the pipeline board, the candidate panel and notes with @mentions',
    outcome: 'Your team drags candidates between stages live, opens a side panel with the CV and answers, and leaves notes that ping teammates.',
    minutes: 120,
    xp: 75,
    blocks: [
      { type: 'callout', tone: 'eli5', title: 'Why moves go through a function', text: 'Dragging a card looks simple, but behind it are rules: only admins move candidates, nobody is rejected unseen, and a rejection email waits two hours so you can undo. move_application() checks all of that inside the database, so the rules hold even if someone pokes the API by hand.' },
      { type: 'prompt', id: 'shl-fe-board-prompt', title: 'Paste into Claude Code', code: `Read @PRD.md sections 7, 11.2, 16 and 18, and @DESIGN.md sections 4 (components 1, 2, 3, 5, 11, 12, 14), 7.5, 7.6 and 10.

Build:
1. app/app/jobs/[id]/page.tsx (Pipeline tab): six fixed-width columns with @dnd-kit/core and @dnd-kit/sortable (keyboard sensor and screen reader announcements on). Cards are 72px in every state. Load applications (state active or closed) with candidate names and the latest ai_screens row per application. Position: when dropped between two cards, position = (above + below) / 2; at the end, last + 1000.
2. On drop call supabase.rpc('move_application', { p_app, p_stage, p_position, p_ai_seen }) optimistically; roll back with the toast "Could not move the candidate. Try again." on error. Dropping on Rejected opens the reject dialog instead. Interviewers get non-draggable cards.
3. Realtime: subscribe to postgres_changes on applications filtered by job_id=eq.<id>, and ai_screens filtered the same way. Animate remote moves once (300ms). Do not re-animate rows on refetch.
4. Candidate panel at ?app=<id> (side panel over the board, 720px, Escape closes): tabs Overview (contact, timeline from stage_events and email_log; leave a placeholder for the AI card, built next), CV (iframe from /api/cv/<id> which creates a 5 minute signed URL with the user's own Supabase client and calls rpc mark_cv_viewed), Answers, Scorecards (placeholder), Notes, Emails (shows queued rejections with Undo).
5. Reject dialog: if cv_viewed_at is null show the "Open the CV first" state. Otherwise reasons, the send email checkbox, and "Reject and send in 2 hours" (read reject_delay_minutes). After success, the 10 second toast with Undo that calls move_application back to the previous stage.
6. Notes: composer with an @ menu of people who can see the job (owners, admins, job_members), stored as plain text plus the mentions array; call supabase.rpc('add_note', { p_app, p_body, p_mentions }).
7. Bell: notifications for me, realtime on user_id, popover per DESIGN.md component 14, mark as read on open.
8. Multi-select and the selection bar with bulk Move and bulk Reject (skips unopened CVs and says how many).
Then open two browsers as two users and record a short screen capture of a live move.` },
      { type: 'steps', items: [
        'Apply to your job 3 times with different emails (use you+1@gmail.com style addresses).',
        'Drag one card from Applied to Screen. Open the same board in a private window logged in as a teammate: the card moves there within 2 seconds.',
        'Drop a card on Rejected without opening it: the dialog says "Open the CV first". Open the CV tab, then reject with "Skills mismatch".',
        'Click Undo on the toast. The card goes back and the Emails tab no longer shows a pending rejection.',
        'Write a note "@<teammate> can you check the portfolio?". The teammate\'s bell shows 1.',
      ] },
      { type: 'code', id: 'shl-fe-board-sql', filename: 'check-board.sql', lang: 'sql', code: `-- Every move is recorded with who did it.
select e.from_stage, e.to_stage, e.reason, e.ai_summary_seen, p.full_name, e.created_at
from public.stage_events e left join public.profiles p on p.id = e.actor_id
order by e.created_at desc limit 10;

-- The undone rejection was cancelled, never sent.
select kind, status, send_after from public.email_outbox
where kind = 'rejection' order by created_at desc limit 5;

-- Mentions created a notification.
select kind, body, read_at from public.notifications order by created_at desc limit 5;` },
      { type: 'mistakes', items: [
        { mistake: 'Cards jump in height or the board shifts while dragging.', fix: 'Tell Claude Code: "Cards are 72px fixed height in every state (DESIGN.md component 2). The original slot keeps a dashed placeholder of the same height. Use transform for movement, never margin."' },
        { mistake: 'Realtime does not fire for the second user.', fix: 'The migration adds applications to the supabase_realtime publication, and realtime obeys RLS. Check the second user is an owner/admin or on the job team (job_members). Ask Claude Code to log the channel status (SUBSCRIBED).' },
        { mistake: 'The CV tab is blank.', fix: 'Browsers block some PDFs in iframes when the response is a download. The /api/cv route must redirect to the signed URL without download=true. For DOCX show extracted text instead.' },
      ] },
    ],
    checklist: [
      { id: 'shl-fe-board-c1', label: 'Copy the board and panel prompt', trigger: 'copy:shl-fe-board-prompt' },
      { id: 'shl-fe-board-c2', label: 'See a live move in a second browser' },
      { id: 'shl-fe-board-c3', label: 'Reject after opening the CV, then undo it' },
      { id: 'shl-fe-board-c4', label: 'Mention a teammate and see their bell light up' },
      { id: 'shl-fe-board-c5', label: 'Run the check SQL', trigger: 'copy:shl-fe-board-sql' },
    ],
  },
  {
    id: 'shl-fe-ai',
    title: 'Build the AI summary card, opt-out states and blind scorecards',
    outcome: 'Reviewers see per-criterion labels with quotes from the CV (never a score), and interviewers score on the same criteria without seeing each other first.',
    minutes: 75,
    xp: 60,
    blocks: [
      { type: 'callout', tone: 'eli5', title: 'Assistive, not automatic', text: 'The AI is a fast reader that shows its working: for each thing you asked for, it says "shown", "partly", "not shown" or "unclear" and quotes the line from the CV. It never adds it all up into a score, because a single number tempts people to stop reading. A person always decides.' },
      { type: 'prompt', id: 'shl-fe-ai-prompt', title: 'Paste into Claude Code', code: `Read @PRD.md sections 9 (all) and 11.3, and @DESIGN.md sections 2.2, 4 (components 4 and 6), 7.6 and 15.

Build:
1. components/candidate/AiSummaryCard.tsx in the Overview tab: header (AI summary label, criteria version, How this works link to /app/docs#ai, Report button), summary, one row per criterion with the assessment pill from DESIGN.md 2.2 (no red, no ticks), the note, and quotes (first shown, "+N quotes" toggle). Footer line "Not shown means the CV does not mention it. Ask, do not assume." Reserve 240px while loading.
2. Every ai_status state from PRD 11.3 with the exact DESIGN.md copy: queued/running (live dot "Summarising against 4 criteria"), opted_out, disabled, paused_cap (with Upgrade), failed (Retry calls supabase.rpc('request_screen', { p_app })), plus flags: scanned_pdf, injection_suspected, summary_hidden, truncated, and the older criteria version notice with "Summarise again (1 summary)".
3. Report dialog: verdict radio (Accurate, Wrong, Missed evidence, Unfair) + comment, insert into ai_feedback (screen_id, verdict, comment; the trigger fills workspace and user).
4. Card dots: up to 4 must-have dots per card from the latest summary for the current criteria version (DESIGN.md component 2). Sort menu: Applied date (default), Name, Must-haves shown (with the tooltip "Counts Meets labels. Read the CV before deciding.").
5. Record ai_seen: if the AI card was visible in the panel when a move happens, pass p_ai_seen: true to move_application.
6. Scorecards tab: my scorecard form (ratings per current criterion 1 to 4, recommendation, notes, Save draft and Submit scorecard). Submitted is editable for 24 hours (the trigger locks it after). Others' scorecards: whatever RLS returns; if the count of hidden ones is needed, add a security definer RPC scorecard_counts(p_app uuid) returns jsonb { total, submitted } in a migration and show "N scorecards hidden until you submit yours".
7. Settings > AI screening tab: the "Use AI summaries" switch (workspaces.ai_enabled, owner/admin) and the guardrail list.
Never render a total, percentage or rank anywhere. Grep the code for "score" in UI strings when you finish and show me the results.` },
      { type: 'steps', items: [
        'Wait for your test applications to show "Summary ready" (after the screen worker task). Open one.',
        'Check every Meets and Partly has a quote, and use Ctrl+F in the CV tab to find each quote in the CV.',
        'Apply once more with "Do not use AI" ticked. The panel says "AI not used (candidate\'s choice)".',
        'As the owner, submit a scorecard. Log in as an interviewer on the job: you see "1 scorecard hidden until you submit yours". Submit yours: both appear.',
        'Click Report on a summary and send "Missed evidence" with a comment.',
      ] },
      { type: 'code', id: 'shl-fe-ai-sql', filename: 'check-ai.sql', lang: 'sql', code: `-- Summaries: model, prompt version, redaction count and flags.
select a.ai_status, s.model, s.prompt_version, s.redactions, s.flags,
       jsonb_array_length(s.results) as criteria_assessed
from public.applications a left join public.ai_screens s on s.application_id = a.id
order by a.created_at desc limit 5;

-- No summary may contain a stored overall score: this must return 0 rows.
select id from public.ai_screens
where results::text ~* '"(score|rank|rating)"' or summary ~* '(hire|reject|recommend)';

-- Feedback reports.
select verdict, comment from public.ai_feedback order by created_at desc limit 5;` },
      { type: 'mistakes', items: [
        { mistake: 'Claude Code adds a "match score" or a percentage to the card "to help".', fix: 'Say: "Remove it. PRD section 9.2 rule 1: no single number, anywhere, ever. Show the per-criterion pills and the must-have dots only."' },
        { mistake: 'Interviewers see other scorecards before submitting.', fix: 'The RLS policy "scorecards select blind" handles this. Check the interviewer is not an admin (admins see submitted ones) and that the UI reads scorecards with the user\'s own client, not the secret key.' },
        { mistake: 'The card shows dots from an old summary after criteria changed.', fix: 'Filter ai_screens to criteria_version = jobs.criteria_version for the dots, and show the "Based on older criteria" notice in the panel when only older ones exist.' },
      ] },
    ],
    checklist: [
      { id: 'shl-fe-ai-c1', label: 'Copy the AI card and scorecards prompt', trigger: 'copy:shl-fe-ai-prompt' },
      { id: 'shl-fe-ai-c2', label: 'Find every quoted piece of evidence in the CV' },
      { id: 'shl-fe-ai-c3', label: 'Apply with AI opted out and check the panel' },
      { id: 'shl-fe-ai-c4', label: 'Prove scorecards stay hidden until you submit yours' },
      { id: 'shl-fe-ai-c5', label: 'Run the check SQL and get 0 score rows', trigger: 'copy:shl-fe-ai-sql' },
    ],
  },
  {
    id: 'shl-fe-schedule',
    title: 'Build calendar settings, booking links and the candidate booking page',
    outcome: 'Interviewers connect Google Calendar, you send a booking link, and the candidate picks a free slot that turns into a Google Meet invite.',
    minutes: 90,
    xp: 65,
    blocks: [
      { type: 'callout', tone: 'eli5', title: 'Free/busy only', text: 'Shortlist asks Google one question per interviewer: "when are you busy?". Google answers with time blocks and no meeting names. Shortlist finds the gaps everyone shares inside their interview hours and shows those to the candidate.' },
      { type: 'prompt', id: 'shl-fe-schedule-prompt', title: 'Paste into Claude Code', code: `Read @PRD.md sections 11.4, 12 and 13.5, and @DESIGN.md sections 4 (components 9 and 10), 7.8, 7.11 (Calendar) and 8 (booking page).

Build:
1. Settings > Calendar tab: "Connect Google Calendar" calls sl-google-oauth ?action=start with my JWT and redirects to the returned url. Handle ?calendar=connected and ?calendar=error&reason=... with toasts in plain words. Connected state shows the email, status, Disconnect, and a working hours grid (7 days, up to 2 ranges each), buffer (0, 10, 15, 30), max interviews per day, time zone. Save with an update on calendar_connections (my row only).
2. components/candidate/BookingDialog.tsx from the panel's "Schedule" button and the selection bar: fields per DESIGN.md component 10, interviewers from the job team with calendar status, POST sl-booking { action: 'create' }. Map calendar_missing to "Connect Google Calendar first: <names>." with a "Copy invite to connect" link to /app/settings?tab=calendar.
3. app/book/[token]/page.tsx: client page calling sl-booking 'slots' with the detected time zone (editable select of common zones), the day tabs and slot grid, the fixed confirm bar, 'book', and every state in DESIGN.md section 8 (booked with .ics download built in the browser, expired, no slots, unavailable, slot taken refresh in place). Move and Cancel call 'cancel' with reschedule true or false.
4. app/app/interviews/page.tsx: tabs Upcoming, Waiting for candidate, Past, Scorecards to submit (interviews completed where I have no submitted scorecard).
Test the slot grid at 320px and 375px and send me screenshots.` },
      { type: 'steps', items: [
        'Settings > Calendar > Connect Google Calendar. Approve both permissions on Google\'s screen.',
        'Set Mon to Fri 09:00 to 17:00, buffer 15 minutes. In Google Calendar add a busy event tomorrow 10:00 to 11:00.',
        'Open a test candidate, click Schedule, pick 45 minutes, Google Meet, you as interviewer, and send.',
        'Open the booking link from the candidate email in a private window. No slot overlaps 09:45 to 11:15 tomorrow. Book 14:00.',
        'Google Calendar shows the event with a Meet link and the candidate as a guest. Move it from the confirmation link and check the old event disappears.',
      ] },
      { type: 'code', id: 'shl-fe-schedule-sql', filename: 'check-schedule.sql', lang: 'sql', code: `-- Calendar connected (the token itself stays encrypted and unreadable here).
select google_email, status, timezone, buffer_minutes, max_per_day from public.calendar_connections;

-- The request and the booked interview with its Meet link.
select r.status, r.reschedules, i.starts_at, i.status, i.meet_url is not null as has_meet, i.google_event_id
from public.interview_requests r left join public.interviews i on i.request_id = r.id
order by r.created_at desc limit 5;` },
      { type: 'mistakes', items: [
        { mistake: 'Google shows "Access blocked: this app has not completed verification".', fix: 'While the app is in Testing, only test users can connect. Google Cloud > Google Auth Platform > Audience > Test users > Add users, and add every interviewer\'s Google email (up to 100).' },
        { mistake: 'The event is created but has no Meet link.', fix: 'The insert URL must include conferenceDataVersion=1, and the body needs conferenceData.createRequest with a unique requestId and conferenceSolutionKey type hangoutsMeet. Without the URL parameter Google ignores it silently.' },
        { mistake: 'Slots appear an hour off for the candidate.', fix: 'Times must be computed in each interviewer\'s time zone and returned as UTC ISO strings; the page formats them in the candidate\'s zone with Intl.DateTimeFormat. Ask Claude Code to run the DST test in _shared/slots.ts.' },
      ] },
    ],
    checklist: [
      { id: 'shl-fe-schedule-c1', label: 'Copy the scheduling prompt', trigger: 'copy:shl-fe-schedule-prompt' },
      { id: 'shl-fe-schedule-c2', label: 'Connect Google Calendar and set working hours' },
      { id: 'shl-fe-schedule-c3', label: 'Book a slot as a candidate and see the Meet invite' },
      { id: 'shl-fe-schedule-c4', label: 'Run the check SQL', trigger: 'copy:shl-fe-schedule-sql' },
    ],
  },
  {
    id: 'shl-fe-privacy',
    title: 'Build the privacy page, retention settings and the candidates table',
    outcome: 'Candidates can ask for their data or its deletion, admins handle it in two clicks, and everyone can see when each candidate will be deleted.',
    minutes: 70,
    xp: 55,
    blocks: [
      { type: 'callout', tone: 'eli5', title: 'Deleting on time is a feature', text: 'Under GDPR you may only keep a rejected candidate\'s CV as long as you need it. Shortlist starts a timer when an application closes and deletes everything when it runs out. It also keeps a receipt that says "we deleted one person\'s data on this date" without keeping the data itself.' },
      { type: 'prompt', id: 'shl-fe-privacy-prompt', title: 'Paste into Claude Code', code: `Read @PRD.md sections 10, 11.6 and 13.7, and @DESIGN.md sections 4 (component 15), 7.7, 7.11 (Privacy and retention) and 8 (privacy page).

Build:
1. app/privacy/[company]/page.tsx: the request form posting to sl-privacy { action: 'request' }. The success text replaces the form in the same reserved height. app/privacy/verify/[token]/page.tsx calls { action: 'verify' } and shows "Request confirmed. <Company> will reply by <due date>." or the no-data text.
2. Settings > Privacy and retention: retention period (90, 180, 365), talent pool period, rejection delay (0, 30, 120, 1440 minutes) saved to workspaces; data requests table with the due pill and "Send export" / "Delete everything" calling sl-privacy { action: 'fulfil' } (the delete confirm dialog morphs to a 3 second countdown before the button enables); deletion log table (date, reason, applications, files). Show the privacy page link with Copy.
3. app/app/candidates/page.tsx: table per DESIGN.md 7.7 with a Retention column computed as the latest retention_until across the candidate's applications ("Active" if any application is still open), filter chip "Retention due" (next 7 days) used by the retention warning email link.
4. app/app/candidates/[id]/page.tsx with "Export data" (calls sl-privacy fulfil with a synthetic request: add an admin-only path { action: 'fulfil_direct', candidate_id, mode } to sl-privacy that creates a completed data_requests row) and "Delete candidate" (same with mode delete).
5. app/app/docs/page.tsx with the articles listed in DESIGN.md 7.14. The "How AI summaries work" and "Candidate privacy and GDPR" articles take their content from @PRD.md sections 9 and 10, rewritten for a hiring manager in plain words, including the sub-processor list.
Screenshot Settings > Privacy and retention with one open request.` },
      { type: 'steps', items: [
        'Open http://localhost:3000/privacy/acme-test, enter the email of a test candidate, choose "Delete my data" and send.',
        'Click the confirmation link in that inbox. The page shows the due date.',
        'As the owner open Settings > Privacy and retention. The request shows "Due in 30 days". Click "Delete everything" and confirm.',
        'The candidate disappears from the board and Candidates, the confirmation email arrives, and the deletion log shows one row with reason "request".',
      ] },
      { type: 'code', id: 'shl-fe-privacy-sql', filename: 'check-privacy.sql', lang: 'sql', code: `-- The request moved through its states.
select kind, status, verified_at, due_at, completed_at from public.data_requests order by created_at desc limit 3;

-- The receipt has a hash, never the email.
select reason, email_hash, applications_deleted, files_deleted, created_at
from public.deletion_log order by created_at desc limit 3;

-- Nothing left for that person (replace the email): must be 0.
select count(*) from public.candidates where lower(email) = lower('test@example.com');` },
      { type: 'mistakes', items: [
        { mistake: 'The privacy form tells people "no such company" for a wrong slug.', fix: 'That leaks which companies use Shortlist. sl-privacy must return the same message for every request. Ask Claude Code to make the success message identical in all branches.' },
        { mistake: 'Rows are deleted but the CV files stay in Storage.', fix: 'erase_candidate returns the file paths; the edge function must then call storage.from(\'cvs\').remove(paths). Check Storage > cvs for the application id folder and ask Claude Code to log the count removed.' },
        { mistake: 'Retention never starts for some candidates.', fix: 'retention_until is set when an application moves to hired or rejected, or when the job closes. Applications left in Screen on an open job have no timer by design. Close finished jobs.' },
      ] },
    ],
    checklist: [
      { id: 'shl-fe-privacy-c1', label: 'Copy the privacy and candidates prompt', trigger: 'copy:shl-fe-privacy-prompt' },
      { id: 'shl-fe-privacy-c2', label: 'Make and confirm a deletion request as a candidate' },
      { id: 'shl-fe-privacy-c3', label: 'Fulfil it from Settings and get the confirmation email' },
      { id: 'shl-fe-privacy-c4', label: 'Run the check SQL', trigger: 'copy:shl-fe-privacy-sql' },
    ],
  },
]
