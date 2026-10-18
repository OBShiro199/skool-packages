// Sparring app-specific frontend tasks (appended to the Foundations phase).
import type { Task } from '../../types'

export const frontendTasks: Task[] = [
  {
    id: 'spr-fe-shell',
    title: 'Build onboarding, the mic check and the Practice page',
    outcome: 'A new user names their team, passes a mic check and lands on Practice with the three built-in personas.',
    minutes: 75,
    xp: 50,
    blocks: [
      { type: 'callout', tone: 'eli5', title: 'Why a mic check comes first', text: 'Every practice minute costs you real money. If the browser blocks the microphone, the call starts, the prospect talks to silence, and the minutes still tick. Checking the mic before anything else means a broken mic never costs a cent and never gives a new user a bad first call.' },
      { type: 'prompt', id: 'spr-fe-shell-prompt', title: 'Paste into Claude Code', code: `Read @PRD.md sections 4, 7 and 10, @DESIGN_SYSTEM.md, and @DESIGN.md sections 2, 4, 6, 7.2, 7.3 and 16.1.

Build:
1. app/onboarding/page.tsx: the 3-step card from DESIGN.md 7.2 (one dialog-style card that morphs height). Step 1 calls supabase.rpc('create_workspace', { p_name, p_timezone }) with the browser timezone from Intl. Step 2 is components/MicCheck.tsx: getUserMedia({ audio: true }), a 5-bar level meter from an AnalyserNode, "We heard you" once the level passes a threshold for 600 ms, the blocked-mic message from DESIGN.md microcopy, then stop all tracks. Save profiles.mic_checked_at. Step 3 shows Margaret preselected with a "Call Margaret" button (wired up in the next task; for now it links to /app/practice).
2. lib/workspace.ts: getCurrentWorkspace() on the server: getClaims, profiles.current_workspace_id, the workspace, the user's role, and minutes_left (rpc). Redirect to /onboarding when there is none.
3. The app shell from DESIGN.md section 6: sidebar items in this order: Practice, Sessions, Assignments, Team, Personas, then MinutesMeter, then the bottom group Documentation, Help, Billing, Settings. Hide Assignments and Team when minutes_left().plan is 'solo'. Hide Billing for non-owners. Collapse to icons under 1100px. Placeholder pages for every route in PRD section 7 so nothing 404s.
4. components/MinutesMeter.tsx: reads minutes_left(ws) (rpc), shows "212 of 360 min left" with tabular numbers, system meter colours (accent, amber under 20%, coral under 5%). Refetch on window focus and when a call ends.
5. app/app/practice/page.tsx exactly as DESIGN.md 7.3 and wireframe 16.1: ScenarioTabs, PersonaCard grid (select only id, name, title, company, summary, hue, voice_id from personas, never hidden_pains or win_conditions), DifficultyPicker, BriefCard (scenario.rep_brief + persona line + "You have N minutes"), assignment picker (only matching active assignments for this rep), CallButton with its disabled reasons. Keyboard: arrows move between cards, Enter selects, C starts the call.
Use only design tokens, no raw hex. Run the app and screenshot onboarding step 2 and the Practice page at 390px and 1440px.` },
      { type: 'steps', items: [
        'Open http://localhost:3000/signup and create an account.',
        'Name the workspace "Test Sales", choose "Manager", and pass the mic check by saying the test line.',
        'Block the mic once in the browser settings and check you see the exact blocked-mic message, then allow it again.',
        'On Practice, click each persona, switch scenarios and difficulty, and check the brief changes in place without the page jumping.',
      ] },
      { type: 'code', id: 'spr-fe-shell-sql', filename: 'check-onboarding.sql', lang: 'sql', code: `-- Your workspace, you as owner, the mic check time, and the built-in library.
select w.name, w.timezone, m.role, p.mic_checked_at is not null as mic_ok
from public.workspaces w
join public.workspace_members m on m.workspace_id = w.id
join public.profiles p on p.id = m.user_id;

select slug, name, title from public.personas where workspace_id is null;   -- 3 rows
select slug, kind, default_minutes from public.scenarios where workspace_id is null;   -- 3 rows` },
      { type: 'mistakes', items: [
        { mistake: 'Step 1 errors with "permission denied for function create_workspace".', fix: 'The function is only for signed-in users. Make sure the browser client has a session (log out and in again) and that Claude Code calls supabase.rpc, not a direct insert.' },
        { mistake: 'The level meter never moves on Safari.', fix: 'Safari needs the AudioContext to be created or resumed inside a click. Ask Claude Code to create it in the "Start mic check" button handler and call audioContext.resume().' },
        { mistake: 'Reps can see hidden pains in the browser Network tab.', fix: 'The Practice query selected * from personas. Ask Claude Code to select only the public columns listed in the prompt, and add a test that fails if hidden_pains appears in the response.' },
      ] },
    ],
    checklist: [
      { id: 'spr-fe-shell-c1', label: 'Copy the onboarding and Practice prompt', trigger: 'copy:spr-fe-shell-prompt' },
      { id: 'spr-fe-shell-c2', label: 'Finish onboarding with a passing mic check' },
      { id: 'spr-fe-shell-c3', label: 'Check the sidebar order and the minutes meter' },
      { id: 'spr-fe-shell-c4', label: 'Run the check SQL', trigger: 'copy:spr-fe-shell-sql' },
    ],
  },
  {
    id: 'spr-fe-call',
    title: 'Build the live call screen with ElevenLabs',
    outcome: 'Pressing Call connects you to Margaret in about 3 seconds, shows the timer and talk meter, and hands over to scoring when you hang up.',
    minutes: 120,
    xp: 75,
    blocks: [
      { type: 'callout', tone: 'eli5', title: 'Who does what during a call', text: 'Your browser streams your voice to ElevenLabs. ElevenLabs turns it into text, asks your own server what Margaret says next, turns the answer into Margaret\'s voice and plays it back, all in about a second. Your server never touches the audio. It only writes Margaret\'s lines.' },
      { type: 'ascii', code: `Browser                 ElevenLabs                     Supabase (spr-persona-llm)      Anthropic
  | mic audio  ------->   | speech to text                  |                               |
  |                       | rep stopped talking  ---------> | build persona prompt          |
  |                       |                                 | stream Claude  -------------> | claude-haiku-5-5
  |                       | <------- SSE text chunks ------ | <---------------------------- |
  | <------- voice ------ | text to speech (persona voice)  |                               |`, caption: 'One turn of a practice call. Target: under 1.5 seconds from the rep going quiet to hearing the reply.' },
      { type: 'prompt', id: 'spr-fe-call-prompt', title: 'Paste into Claude Code', code: `Read @PRD.md sections 6, 9.1, 11.2 and 13.1, @DESIGN_SYSTEM.md, and @DESIGN.md sections 4, 7.4, 9, 10 and 16.2.
Install @elevenlabs/react. Check its current README for the useConversation API (startSession options, onConnect, onDisconnect, onMessage, onModeChange, getInputVolume, getOutputVolume) before writing, and tell me if any name differs from the PRD.

Build:
1. On Practice, CallButton: first getUserMedia({ audio: true }) (stop the tracks after; this is only the permission check), then supabase.functions.invoke('spr-start-session', { body: { persona_id, scenario_id, difficulty, assignment_id } }). Handle 402 minutes_exhausted and paused, 409 already_on_a_call (link to that call), 429 and 502 with the DESIGN.md microcopy. On 200, store the response in sessionStorage under the session id and router.push('/app/call/' + session_id).
2. app/app/call/[sessionId]/page.tsx (client component): read the stored start response (if missing, show "This call link has expired. Start a new call." with a button). useConversation with onConnect, onDisconnect, onMessage, onError. startSession({ conversationToken, connectionType: 'webrtc', overrides: { agent: { firstMessage: first_line }, tts: { voiceId: voice_id } }, dynamicVariables: { session_id, first_line }, customLlmExtraBody: { sparring: { session_id, exp, sig } } }). When it resolves with the conversation id, call supabase.rpc('attach_conversation', { p_session: session_id, p_conversation: id }).
3. The screen exactly as DESIGN.md 7.4 and wireframe 16.2: persona header, VoiceOrb (scale from getOutputVolume() on requestAnimationFrame, max 1.06, reduced motion shows a "Speaking" label), LiveTimer (counts up from connect, shows "/ m:ss" of max_seconds, warning ink under 30 s left, polite live-region announcements at 60 and 30 s), TalkMeter (accumulate time while mode is 'speaking' for the agent vs while the input volume is above a threshold for the rep, update every 2 s), Mute, End call, Show transcript toggle with a reserved 200px box filled from onMessage.
4. Client-side safety: end the session automatically at max_seconds + 15 s. Warn with a confirm dialog on route change and on beforeunload while connected. Disable every sidebar link while connected (DESIGN.md section 6).
5. After disconnect: morph into the Scoring panel. Subscribe with Supabase Realtime to the sessions row (postgres_changes, filter id=eq.<id>). Tick the 3 steps from status (ended -> Saving the recording; scoring -> Reading the transcript, Writing your notes; scored -> go to /app/sessions/<id>). Ended with duration under 60: show the "too short" state. 120 s with no change: show the slow message.
6. Refetch the MinutesMeter after the call.
Then make a 2 minute call to Margaret and show me the sessions row going created -> live -> ended.` },
      { type: 'steps', items: [
        'Put headphones on. On Practice pick Margaret, Cold call, Normal, and press Call.',
        'Check you hear "Margaret Okafor." within about 3 seconds, and the timer starts at 0:00.',
        'Open with "Hi Margaret, it\'s [name] from [company]. This is a cold call, can I have 30 seconds to tell you why I rang?" and keep going for 2 minutes.',
        'Turn on Show transcript and check the controls do not move as lines arrive.',
        'Press End call and watch the Scoring panel (scoring itself is built in a later task, so it will wait on "Saving the recording" for now).',
      ] },
      { type: 'code', id: 'spr-fe-call-sql', filename: 'check-call.sql', lang: 'sql', code: `-- Your latest call and the minutes it is holding.
select s.status, s.elevenlabs_conversation_id is not null as attached, s.max_seconds,
       s.started_at, r.status as hold, r.seconds_held
from public.sessions s
left join public.usage_reservations r on r.session_id = s.id
order by s.created_at desc limit 3;` },
      { type: 'mistakes', items: [
        { mistake: 'The call connects but Margaret never speaks after the first line.', fix: 'ElevenLabs cannot reach your persona endpoint or gets a 401. Open ElevenLabs > your agent > Conversations > the call: the error is shown there. Usually the Custom LLM secret does not match PERSONA_LLM_SECRET, or the sparring extra body is missing (check customLlmExtraBody is passed and that overrides are enabled on the agent).' },
        { mistake: 'Margaret hears herself and keeps answering her own voice.', fix: 'Echo from laptop speakers. Use headphones. If it still happens, check getUserMedia is not called again during the call: the SDK handles the mic and echo cancellation itself.' },
        { mistake: 'attach_conversation fails with not_attachable.', fix: 'The session was already attached or is not in status created (for example you refreshed the page). Start a new call. Ask Claude Code to call attach only once per session id.' },
      ] },
    ],
    checklist: [
      { id: 'spr-fe-call-c1', label: 'Copy the live call prompt', trigger: 'copy:spr-fe-call-prompt' },
      { id: 'spr-fe-call-c2', label: 'Make a 2 minute call to Margaret with headphones on' },
      { id: 'spr-fe-call-c3', label: 'Check the transcript toggle does not shift the layout' },
      { id: 'spr-fe-call-c4', label: 'Run the check SQL and see a held reservation during the call', trigger: 'copy:spr-fe-call-sql' },
    ],
  },
  {
    id: 'spr-fe-scorecard',
    title: 'Build the scorecard with audio, note markers and transcript',
    outcome: 'After each call the rep sees a score out of 100, five rubric bars and coaching notes that jump the recording to the exact second.',
    minutes: 90,
    xp: 60,
    blocks: [
      { type: 'callout', tone: 'eli5', title: 'Why notes are pinned to seconds', text: '"Your discovery was weak" is easy to ignore. "At 1:52 you asked a yes/no question, here is a better one" is something a rep can hear, fix and try again in the next call. Every note carries the second it happened, so one click plays that exact moment.' },
      { type: 'prompt', id: 'spr-fe-scorecard-prompt', title: 'Paste into Claude Code', code: `Read @PRD.md sections 4 (stories 6 to 10), 13.4 and 14.2, @DESIGN_SYSTEM.md, and @DESIGN.md sections 2.1, 4, 7.5, 7.6, 9 and 16.3.

Build:
1. app/app/sessions/[id]/page.tsx exactly as DESIGN.md 7.5 and wireframe 16.3. Server component loads the session, persona, scenario, scorecard, coaching_notes and session_turns with the user's JWT (RLS decides access; show "You do not have access to this call." if the session row is not returned).
2. components/scorecard/ScoreTotal.tsx, RubricRow.tsx (labels: Opener, Permission, Pain discovery, Objection handling, Next step; bars fill once per session per scorecard using a sessionStorage flag), TopFix.tsx, CoachingNote.tsx.
3. components/scorecard/AudioPlayer.tsx with wavesurfer.js: create a signed URL in the browser with supabase.storage.from('recordings').createSignedUrl(recording_path, 3600). Speed 1x/1.25x/1.5x. Note markers above the waveform at t_seconds / duration. If recording_path is null, show "Recording is still being saved" and poll every 10 s for 2 minutes.
4. components/scorecard/Transcript.tsx: TranscriptLines (speaker "You" or the persona's first name), active line follows playback (the latest turn whose t_seconds <= currentTime), dot in the gutter for lines with notes. Clicking a note seeks the player, scrolls the line into view and highlights it for 1.5 s.
5. Talk ratio pill from sessions.rep_talk_pct with the hint for the scenario (discovery: aim under 45%; cold call: under 55%).
6. "Run it again": starts a new call with the same persona, scenario, difficulty and assignment (same code path as the Call button). Menu: Retry scoring (POST /api/sessions/[id]/rescore, built with the worker), Download recording (signed URL with download).
7. States: scoring (show the Scoring panel and subscribe to Realtime), failed, too short, loading skeletons at final sizes.
8. app/app/sessions/page.tsx: the table from DESIGN.md 7.6 with filter chips and paging (25 per page, server-side range).
Then open a scored call (use the calibration fixtures from the worker task if you have no real one yet) and screenshot it at 390px and 1440px.` },
      { type: 'steps', items: [
        'Open your most recent scored call from Sessions.',
        'Press play, then click the second coaching note: the audio jumps to that second and the transcript line highlights.',
        'Refresh the page: the rubric bars do not animate again in this browser session.',
        'Press Run it again and check it starts the same drill.',
      ] },
      { type: 'code', id: 'spr-fe-scorecard-sql', filename: 'check-scorecard.sql', lang: 'sql', code: `-- The five scores must add up to the total, and every note must sit inside the call.
select c.total = c.opener + c.permission + c.discovery + c.objections + c.next_step as total_adds_up,
       bool_and(n.t_seconds <= s.duration_seconds) as notes_inside_call,
       count(n.*) as notes
from public.scorecards c
join public.sessions s on s.id = c.session_id
left join public.coaching_notes n on n.session_id = c.session_id
group by c.session_id, c.total, c.opener, c.permission, c.discovery, c.objections, c.next_step
order by max(c.created_at) desc limit 5;` },
      { type: 'mistakes', items: [
        { mistake: 'The audio player shows "Object not found".', fix: 'The signed URL was made for the wrong path or the rep is not allowed. Check sessions.recording_path matches the file in Storage > recordings, and that you are the rep or a manager (the storage policy checks exactly that).' },
        { mistake: 'Clicking a note jumps to the wrong place.', fix: 'The waveform was not ready when you seeked. Ask Claude Code to queue the seek until wavesurfer fires "ready", and to seek with seekTo(t_seconds / duration).' },
        { mistake: 'The page jumps when the recording loads.', fix: 'Reserve the player height (96px) before the waveform draws, as DESIGN.md says. Never render the player only after the URL arrives.' },
      ] },
    ],
    checklist: [
      { id: 'spr-fe-scorecard-c1', label: 'Copy the scorecard prompt', trigger: 'copy:spr-fe-scorecard-prompt' },
      { id: 'spr-fe-scorecard-c2', label: 'Click a coaching note and hear that exact moment' },
      { id: 'spr-fe-scorecard-c3', label: 'Check the bars animate only once per session' },
      { id: 'spr-fe-scorecard-c4', label: 'Run the scorecard check SQL', trigger: 'copy:spr-fe-scorecard-sql' },
    ],
  },
  {
    id: 'spr-fe-personas',
    title: 'Build the persona library and the persona builder',
    outcome: 'Managers paste their ICP and real objections, get a drafted persona in about 15 seconds, edit it, pick a voice and save it for the team.',
    minutes: 80,
    xp: 55,
    blocks: [
      { type: 'callout', tone: 'eli5', title: 'Hidden pains and win conditions', text: 'A good practice prospect is like an escape room. The hidden pains are the clues the rep has to find with good questions. The win conditions are the lock: do these things and the prospect agrees to a meeting. Reps never see either before the call, otherwise it is a quiz, not practice.' },
      { type: 'prompt', id: 'spr-fe-personas-prompt', title: 'Paste into Claude Code', code: `Read @PRD.md sections 8, 10, 13.6 and 14.3, @DESIGN_SYSTEM.md, and @DESIGN.md section 7.10.

Build:
1. lib/voices.ts: a list of 8 curated voices { key, label, accent, gender, elevenlabs_voice_id, sample_url } with keys warm_female_uk, crisp_female_us, calm_female_in, dry_male_us, brisk_male_uk, friendly_male_au, measured_male_us, warm_female_au. Leave elevenlabs_voice_id as 'REPLACE_ME' and tell me to fill them in (backend task "Pick the persona voices").
2. app/app/personas/page.tsx: Built-in and Your team groups of PersonaCards, plan count ("3 of 25 custom personas" from plan limits), New persona button for owner/manager. Reps open a read-only panel without hidden pains and win conditions.
3. app/app/personas/new/page.tsx: the two-column builder from DESIGN.md 7.10. The button label shows builds left ("Draft persona (12 of 30 left)"). It calls supabase.functions.invoke('spr-build-persona'). Handle 402 builds_exhausted and persona_limit, 403 and 429 with the DESIGN.md microcopy. The draft fills an editable form (lists with add/remove, max 8 items, 200 chars each). Voice select plays the sample on click. Save inserts into personas with the browser client (RLS checks the role) with hue = next free hue in the workspace and voice_id from lib/voices.ts.
4. app/app/personas/[id]/page.tsx: the same editor for custom personas, Test call (starts a 2 minute Cold call on Easy), Archive (is_active false, confirm dialog). Built-in personas open read-only with "Duplicate to edit" (copies into a new custom persona).
5. Prefill the builder's "Who you sell to" from workspaces.icp_summary if set.
Then build a persona for a made-up product and save it, and show me the row.` },
      { type: 'steps', items: [
        'As the owner, open Personas > New persona.',
        'Paste: What you sell "Ledgerly automates carrier invoice reconciliation". Who you sell to "Freight forwarders with 100 to 1,000 staff and a slow month-end close". Objections: "We use spreadsheets", "Our ERP does this", "No budget this year", "Send me an email".',
        'Press Draft persona. Edit the name, pick a voice, play its sample, and Save.',
        'Press Test call and check the persona uses at least one of your objections.',
      ] },
      { type: 'code', id: 'spr-fe-personas-sql', filename: 'check-personas.sql', lang: 'sql', code: `-- Your custom persona and the metered build that drafted it.
select name, title, jsonb_array_length(objections) as objections, voice_id, hue, created_by is not null as has_author
from public.personas where workspace_id is not null order by created_at desc limit 3;

select kind, quantity, cost_usd_micros from public.usage_ledger
where kind = 'persona_builds' order by created_at desc limit 3;` },
      { type: 'mistakes', items: [
        { mistake: 'Saving a persona fails with a row-level security error.', fix: 'You are signed in as a rep, or the insert is missing workspace_id. Only owners and managers can create personas. Check your role in Settings > Workspace.' },
        { mistake: 'The draft ignores your objections.', fix: 'The objections were sent as one string instead of a list. Ask Claude Code to log the request body shape (not the content) and send objections as an array of separate strings.' },
        { mistake: 'Test call uses the default voice.', fix: 'voice_id is still REPLACE_ME. Fill in lib/voices.ts with real ElevenLabs voice ids from the backend voices task, then edit and save the persona again.' },
      ] },
    ],
    checklist: [
      { id: 'spr-fe-personas-c1', label: 'Copy the persona builder prompt', trigger: 'copy:spr-fe-personas-prompt' },
      { id: 'spr-fe-personas-c2', label: 'Draft, edit and save a custom persona' },
      { id: 'spr-fe-personas-c3', label: 'Make a test call to your new persona' },
      { id: 'spr-fe-personas-c4', label: 'Run the personas check SQL', trigger: 'copy:spr-fe-personas-sql' },
    ],
  },
  {
    id: 'spr-fe-team',
    title: 'Build invites, assignments, the leaderboard and trends',
    outcome: 'Managers invite reps, assign drills with a pass score and a due date, and watch the leaderboard, streaks and trends update.',
    minutes: 110,
    xp: 70,
    blocks: [
      { type: 'callout', tone: 'eli5', title: 'Why the leaderboard uses your best 5', text: 'If the leaderboard used every call, reps would stop trying hard drills because a bad score drags them down. Using the best 5 calls of the week rewards practising more and trying Hard mode, and the minimum of 3 calls stops someone topping the board with one lucky call.' },
      { type: 'prompt', id: 'spr-fe-team-prompt', title: 'Paste into Claude Code', code: `Read @PRD.md sections 4 (stories 12 to 18), 9.4, 10.3 and 15, @DESIGN_SYSTEM.md, and @DESIGN.md sections 7.7, 7.8, 7.9 and 16.4.

Build:
1. Invites: app/api/invites/send/route.ts: getClaims, then call rpc create_invite(p_ws, p_email, p_role) through a server client that carries the user's JWT (so the seat and role checks run as that user), then email the link APP_URL/invite/<token> with Resend (dedupe 'invite:' + invite id; log to email_log). Map errors seat_limit, plan_has_no_team, only_owner_invites_managers to the DESIGN.md microcopy. app/invite/[token]/page.tsx as DESIGN.md 16.5, calling rpc accept_invite.
2. app/app/team/page.tsx with tabs Leaderboard (everyone), Trends and Members (owner/manager). Leaderboard reads leaderboard_week for the selected week_start joined to profiles for names and rep_stats for streaks; ranked rows sorted by best5_avg desc, then calls desc; unranked below a divider with "N of 3 calls to rank". Change vs last week from the previous week_start. The current user's row has the accent-soft fill.
3. Trends: rep select or Whole team, components/TrendChart.tsx (Recharts, 12 weeks from rep_trend_weekly, 5 series, legend toggles, gaps for empty weeks, fixed 240px height) and a table alternative below.
4. Members: table, role select for the owner (update workspace_members; the guard trigger blocks owner changes), remove, invite dialog with "4 of 6 seats used", pending invites with Revoke.
5. app/app/team/[userId]/page.tsx: the rep profile from DESIGN.md 7.9.
6. app/app/assignments/page.tsx: rep view and manager view from DESIGN.md 7.7. The New drill dialog inserts assignments then assignment_reps rows (one per chosen rep) with the browser client, then calls a server action that emails each rep "New drill from <manager>: <title>" (dedupe 'assign:' + assignment + ':' + user, respect notification_prefs.on_assignment). Side panel with per-rep progress (passed_sessions of target_sessions, links to their calls). Start drill deep-links to /app/practice?assignment=<id>.
Then invite a second email as a rep, sign in as them in a private window, complete 3 calls, and show me the leaderboard as the manager.` },
      { type: 'steps', items: [
        'As the owner, go to Team > Members > Invite and invite a second email address you own as a Rep.',
        'Open the invite email in a private window, create the account and join.',
        'As the manager, create a drill: Gatekeeper, Objection drill, Normal, target 1, pass score 50, due tomorrow, for the new rep.',
        'As the rep, complete 3 calls including the drill. Check the drill shows Done and the rep is ranked on the leaderboard.',
        'As the rep, try to open one of the manager\'s calls by pasting its URL. You must see "You do not have access to this call."',
      ] },
      { type: 'code', id: 'spr-fe-team-sql', filename: 'check-team.sql', lang: 'sql', code: `-- Members and roles, this week's leaderboard, and drill progress.
select p.full_name, m.role from public.workspace_members m join public.profiles p on p.id = m.user_id;

select p.full_name, l.calls, l.best5_avg, l.ranked, r.current_streak
from public.leaderboard_week l
join public.profiles p on p.id = l.user_id
left join public.rep_stats r on r.user_id = l.user_id and r.workspace_id = l.workspace_id
where l.week_start = date_trunc('week', now())::date
order by l.ranked desc, l.best5_avg desc;

select a.title, p.full_name, ar.passed_sessions, a.target_sessions, ar.completed_at
from public.assignment_reps ar
join public.assignments a on a.id = ar.assignment_id
join public.profiles p on p.id = ar.user_id;` },
      { type: 'mistakes', items: [
        { mistake: 'Invites fail with "plan_has_no_team".', fix: 'Your test subscription is on the Solo price, or plan_prices does not list your Team price id. Insert it: insert into public.plan_prices values (\'price_...\', \'team\');' },
        { mistake: 'The leaderboard is empty even after calls.', fix: 'Scores only count once the worker has scored the call, and the week is in the workspace timezone. Check scorecards has rows and that week_start matches this Monday in your timezone.' },
        { mistake: 'Drill progress stays at 0.', fix: 'The call was not started from the drill, so sessions.assignment_id is null. Start it from Assignments > Start drill (or pick the drill in the "Counts towards" select on Practice).' },
      ] },
    ],
    checklist: [
      { id: 'spr-fe-team-c1', label: 'Copy the team prompt', trigger: 'copy:spr-fe-team-prompt' },
      { id: 'spr-fe-team-c2', label: 'Invite a rep and accept from a private window' },
      { id: 'spr-fe-team-c3', label: 'Assign a drill and complete it as the rep' },
      { id: 'spr-fe-team-c4', label: 'Check a rep cannot open the manager\'s call' },
      { id: 'spr-fe-team-c5', label: 'Run the team check SQL', trigger: 'copy:spr-fe-team-sql' },
    ],
  },
]
