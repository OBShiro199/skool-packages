// Sparring build PRD (PRD.md), part 1: product, voice stack decision, architecture, routes, data, state machines, plans.

export const buildPrd1 = `# Sparring: build PRD

Version 1.0. Download this file, save it as \`PRD.md\` in the root of your project folder, and reference it in
Claude Code with \`@PRD.md\`. Claude Code reads it before every task. Where this file and your instinct disagree,
this file wins. The look and feel lives in \`@DESIGN_SYSTEM.md\` (the Quiet Precision base system) and \`@DESIGN.md\`
(Sparring's accent and screens), the marketing page in \`@LANDING.md\`. Your \`CLAUDE.md\` should contain the line
\`UI rules: @DESIGN_SYSTEM.md @DESIGN.md\`.

## 0. How to use this document

- Read sections 1 to 5 once so you know what you are building and for whom.
- Sections 6 to 18 are the spec. Claude Code builds from them.
- Section 23 lists the build milestones. Do them in order. Do not start a milestone before the one before it
  passes its acceptance tests (section 22).
- Every new Claude Code session, say: "Read @PRD.md, @DESIGN_SYSTEM.md and @DESIGN.md. We are on milestone N.
  Plan first, then wait for my OK."
- Use Opus at high effort (\`/model opus\`, \`/effort high\`) for anything that touches the database schema, RLS,
  metering, the ElevenLabs webhook, the persona LLM endpoint or Stripe. Medium is fine for UI copy and layout.
- Anything marked [verify] was not confirmed on the vendor's own page when this was written (Oct 2026). Ask
  Claude Code to check the current docs before it builds that part, and to tell you if anything changed.

## 1. Problem

Cold calling is a skill you only get better at by doing it, and doing it badly on real prospects is expensive.
A new SDR burns through the best accounts in their territory while they learn to open a call. A founder who
has never sold freezes on the first "send me an email" and hangs up. Sales managers know their reps need
reps (practice), but roleplay with a manager is awkward, rare and inconsistent: the manager is busy, plays
the buyer too nicely, and gives feedback from memory a day later.

What teams do today:
- Manager roleplays on Friday afternoons. Happens twice a month, then stops.
- Reps practise on live prospects. The cost is invisible: burned leads, lost meetings, a 3 to 6 month ramp.
- Big teams buy enterprise roleplay platforms (Hyperbound, Second Nature) that are sold by demo, priced by
  quote and built for 50+ seat orgs [verify their current pricing].
- Founders watch YouTube and read scripts, then never say the words out loud before the real call.

The cost: a new SDR who takes 3 months to ramp at a $5,000 monthly cost is $15,000 before they are useful.
Shave 3 weeks off that by practising 15 minutes a day and the tool has paid for a year.

## 2. Ideal customer (ICP)

- **Primary: SDR and BDR team leads** at B2B companies with 3 to 15 outbound reps (SaaS, agencies, IT services,
  recruitment, logistics). They own ramp time and connect-to-meeting rate. They buy on a card if it is under
  about $500 a month.
- **Secondary: sales bootcamps and coaches** who run cohorts of 10 to 40 students and need homework that marks
  itself. They buy one Floor plan per cohort.
- **Tertiary: founders learning to cold call** (the solo plan). Technical founders selling their first B2B
  product who need 20 practice calls before they ring a real buyer.
- **Pain trigger:** "My new reps are burning leads" or "I have my first 50 dials booked for Tuesday and I am
  scared".
- **Will pay:** $49 a month on their own; $199 to $499 a month for a team if it visibly lifts scores and the
  manager stops running roleplay by hand.
- **Not for (v1):** inbound support training, enterprise teams needing SSO and LMS exports, languages other
  than English, real phone dialling to real numbers (we never dial anyone).

## 3. The one core job

"I pick who I am calling, press Call, and a realistic prospect picks up and pushes back. Two minutes after I
hang up I see my score out of 100, exactly where I lost them, and the line I should have said. My manager sees
it too."

Everything in v1 serves that sentence. If a feature does not make practice calls more realistic, faster to
start or more useful to review, it waits.

## 4. User stories

### Rep (or solo founder)
1. As a rep, I sign up, pass a 10 second mic check and start my first practice call in under 2 minutes.
2. As a rep, I pick a persona (Sceptical CFO, Busy founder, Gatekeeper, or my team's custom ones), a scenario
   (Cold call, Discovery, Objection drill) and a difficulty (Easy, Normal, Hard).
3. As a rep, I read a 3 line brief before the call (who they are, what I am trying to get) and press Call.
4. As a rep, the persona answers within about a second of me speaking, interrupts like a real person,
   raises objections and may hang up on me if I waffle.
5. As a rep, I always see the call timer and how many practice minutes my team has left.
6. As a rep, after hanging up I see "Scoring your call" and the scorecard appears within about 60 seconds.
7. As a rep, my scorecard shows a total out of 100, five rubric scores (opener, permission, pain discovery,
   objection handling, next step), a one line outcome, my top fix, and 3 to 8 coaching notes pinned to
   moments in the call.
8. As a rep, I click a coaching note and the recording jumps to that second and the transcript highlights the
   line.
9. As a rep, I press "Run it again" to retry the same drill with one click.
10. As a rep, I see my streak (days in a row with a practice call of 2 minutes or more) and my score trend.
11. As a rep, I see my assignments with due dates and progress ("2 of 3 passed").

### Manager (and owner)
12. As a manager, I invite reps by email. They join my workspace and use my plan's minutes.
13. As a manager, I build a custom persona by pasting our ICP, our product one-liner and the real objections
    my team hears. Sparring drafts the persona; I edit and save it.
14. As a manager, I assign a drill (persona + scenario + difficulty, target count, pass score, due date) to
    some or all reps. They get an email.
15. As a manager, I see a leaderboard for this week, streaks, and each rep's score trend per rubric line.
16. As a manager, I open any rep's call, listen to it and read the coaching notes.
17. As a manager, every Monday at 8am I get a team report email: calls, minutes, average score, biggest
    improver, the weakest rubric line, who has not practised, and overdue assignments.
18. As the owner, I manage billing, see minute usage and upgrade when we run low. Reps never see billing.

## 5. Scope decisions (and why)

| Decision | Choice | Why | What breaks first at scale, and the fix |
|---|---|---|---|
| Voice layer | ElevenLabs Agents Platform (WebRTC/WebSocket in the browser) with a Custom LLM pointed at our own endpoint | Handles mic capture, echo, turn-taking, interruptions, speech-to-text, text-to-speech, recording and transcripts in one service. We keep the persona brain (Claude) and the prompt on our side | Concurrency: about 10 live calls on Creator, 20 on Pro, 30 on Business [verify]. A Monday 9am team blitz hits it first. Fix: burst pricing (3x the limit at 2x the price [verify]), a "lines busy" queue in the UI, then a higher plan or Enterprise |
| Persona brain | \`claude-haiku-5-5\` with thinking off and low effort, streamed through our OpenAI-compatible endpoint | Lowest time-to-first-token of the current Claude models and $0.10 / $0.50 per MTok, so the brain costs about $0.002 a minute | The extra hop (ElevenLabs to Supabase to Anthropic) adds latency if regions are far apart. Fix: put the Supabase project in us-east-1 [verify where ElevenLabs serves from], keep the function warm with the 1 minute cron, and move the endpoint to a Vercel Fluid function if p95 time-to-first-token goes over 900 ms |
| Scoring | \`claude-sonnet-5-5\`, adaptive thinking, medium effort, structured JSON output, in a background job | Scoring needs judgement and exact timestamps, not speed. About $0.04 a call | A burst of 200 calls ending at once queues scoring. Fix: the worker takes 5 jobs a minute; raise the batch to 20 and add a second cron offset by 30 s |
| Long jobs | Job rows + pg_cron worker every minute, never a long HTTP request | Fetching audio and scoring take 10 to 60 s; edge functions and browsers time out | See above |
| Minute caps | Reserve seconds before a call, settle the real seconds from the ElevenLabs webhook, release stale holds every 5 minutes | Two reps starting at the same moment can never both spend the last 5 minutes. Hard cap, enforced in the database | A webhook that never arrives leaves a hold. Fix: \`spr-reconcile\` fetches the conversation from the ElevenLabs API and settles it |
| Multi-user | Workspaces with owner, manager and rep roles. RLS through \`is_workspace_member()\` and \`has_workspace_role()\` | Teams share minutes, personas and drills; reps only see their own calls in detail | Seat limits are enforced in \`create_invite\` and \`accept_invite\`, not only in the UI |
| Scores | Written only by the worker (secret key); the browser can read but never write | A rep cannot give themselves 100 | n/a |
| Recordings | Copied from ElevenLabs into a private Supabase bucket, deleted after 90 days | We control access with RLS and retention | Storage grows about 0.5 MB per minute. At 1,000 teams that is a few hundred GB: about $0.021 per GB over the 100 GB in Pro [verify] |
| Billing owner | The workspace owner's subscription decides access and limits for the whole team | One card per team | Ownership transfer is a support action in v1 |

### 5.1 Voice stack comparison (the research behind the choice)

OpenAI Realtime is excluded by brief. Prices checked Oct 2026 from vendor pages and recent comparisons; most
were third-party summaries because the vendor pages would not load, so every number is [verify].

| Option | What you run | Price per minute (before Claude) | Latency (mouth to ear) | Claude as the brain | Verdict |
|---|---|---|---|---|---|
| **ElevenLabs Agents + Custom LLM** | Browser SDK + one OpenAI-compatible endpoint | About $0.08 on every paid plan; burst minutes about $0.16 [verify] | About 1 s typical, best-in-class voices [verify] | Yes: Custom LLM (Chat Completions format) or built-in Claude models | **Use this.** Fewest moving parts for a non-technical founder, best voices for believable personas, transcripts and recordings included |
| Vapi | Web SDK + assistant config | $0.05 platform + STT (about $0.0065 Deepgram) + TTS (about $0.02 to $0.05) = about $0.08 to $0.12 [verify] | About 1 s [verify] | Yes, Anthropic is a built-in provider | Close second. More knobs, more bills to reconcile, concurrency limits on the entry tier [verify] |
| Deepgram Voice Agent API (bring your own LLM) | WebSocket from the browser through a token | About $0.065 PAYG with your own LLM [verify] | About 1 s [verify] | Yes, BYO LLM | Cheapest bundle, but fewer persona-grade voices unless you also bring your own TTS (extra cost) |
| DIY: Deepgram Flux STT + Claude + Cartesia Sonic TTS on LiveKit or Pipecat | A long-running Python/Node agent server plus a media server | About $0.0065 STT + about $0.02 to $0.03 TTS + hosting = about $0.04 [verify] | Can be the fastest (under 800 ms) [verify] | Yes, you call Claude yourself | Cheapest at scale, but needs a server that never sleeps, WebRTC knowledge and ops. Revisit after 300 paying teams if voice cost is the margin problem |

Trade-off named: we pay about $0.04 a minute more than DIY to avoid running real-time media servers. At
1,000 teams using about 400 minutes a month that is about $16,000 a month of margin, which is the point at
which hiring someone to build the DIY stack pays for itself. Until then, ElevenLabs.

## 6. Architecture

\`\`\`
                       Browser (rep / manager)
                 Next.js on Vercel  /app/*  (getClaims on server)
                    |                                   |
     publishable key + JWT (RLS)              @elevenlabs/react  (mic + speaker, WebRTC)
                    |                                   |
                    v                                   v
 +--------------------------------------+     +---------------------------------------+
 | Supabase                             |     | ElevenLabs Agents Platform            |
 | Postgres + RLS (workspace_id)        |     |  STT -> turn-taking -> TTS (voice_id) |
 | Storage: recordings (private)        |     |  records audio + transcript           |
 | Edge functions:                      |     |                                       |
 |  spr-start-session  <-- browser      |     |  Custom LLM: POST {url}/chat/completions
 |  spr-persona-llm    <---------------------------+  (Bearer PERSONA_LLM_SECRET, SSE)   |
 |  spr-elevenlabs-webhook <---------------------- post-call webhook (HMAC signed)      |
 |  spr-worker         (cron, 1 min)    |     +---------------------------------------+
 |  spr-reconcile      (cron, 5 min)    |
 |  spr-build-persona  <-- browser      |
 |  spr-notify         (cron, hourly)   |
 +------+------------------+------------+
        |                  |
        v                  v
   Anthropic API         Resend
   claude-haiku-5-5      (invites, assignments,
   (persona, streamed)    weekly team report,
   claude-sonnet-5-5      usage warnings)
   (scoring, builder)
\`\`\`

Flow of one practice call:
1. The rep picks persona, scenario and difficulty and presses Call. The browser calls \`spr-start-session\`.
2. \`spr-start-session\` checks access and plan, creates a \`sessions\` row, reserves seconds with
   \`reserve_seconds()\` (hard cap), signs a short-lived session token, and asks ElevenLabs for a conversation
   token (WebRTC) or signed URL (WebSocket). It returns those plus the persona's voice id and first line.
3. The browser starts the ElevenLabs session with the token, the voice override, the first message override,
   \`dynamic_variables: { session_id }\` and \`custom_llm_extra_body: { sparring: { session_id, exp, sig } }\`.
   When \`startSession\` resolves with a conversation id, the browser calls \`attach_conversation()\`.
4. Every time the rep stops talking, ElevenLabs calls \`spr-persona-llm\` with the conversation so far. The
   function checks the Bearer secret and the session token, builds the persona prompt from the database (never
   from the request), streams \`claude-haiku-5-5\` back as OpenAI-style SSE chunks, and ends the call with an
   \`end_call\` tool call when the persona hangs up or the time cap is reached.
5. When the call ends, ElevenLabs sends \`post_call_transcription\` to \`spr-elevenlabs-webhook\`. It checks the
   HMAC signature, de-duplicates, saves the transcript turns, settles the reservation with the real seconds,
   and enqueues \`fetch_audio\` and \`score_session\` jobs. It returns 200 in under a second.
6. \`spr-worker\` (every minute) downloads the audio into Storage and scores the call with
   \`claude-sonnet-5-5\` (structured JSON), saves the scorecard and notes, refreshes streaks and assignment
   progress, and meters the cost.
7. The call page is subscribed to the session row through Realtime and flips to the scorecard.
8. \`spr-notify\` (hourly) sends Monday team reports and "due tomorrow" reminders. \`spr-reconcile\` (every 5
   minutes) settles calls whose webhook never arrived and releases holds for calls that never connected.

## 7. Routes and pages

| Route | Who | What |
|---|---|---|
| \`/\` | public | Landing page (LANDING.md) |
| \`/pricing\` | public | Same pricing block as the landing page, standalone |
| \`/login\`, \`/signup\`, \`/reset\` | public | Supabase email + password and Google. "Confirm email" off |
| \`/invite/[token]\` | public, then signed in | Shows team name and role, "Join Acme Sales" button calls \`accept_invite\` |
| \`/onboarding\` | signed in, no workspace | 3 steps: name the workspace and timezone, "I am a: rep / manager / founder", mic check |
| \`/paywall\` | signed in, no access | Plan cards and "Start 7 day trial" (Stripe Checkout) |
| \`/app/practice\` | all | Home. Persona grid, scenario tabs, difficulty, brief, big "Call Margaret" button |
| \`/app/call/[sessionId]\` | owner of the session | Live call screen, then "Scoring your call", then redirect to the scorecard |
| \`/app/sessions\` | all | Table of calls. Reps: their own. Managers: filter by rep |
| \`/app/sessions/[id]\` | the rep, owner, managers | Scorecard: total, rubric bars, outcome, top fix, audio player with note markers, transcript |
| \`/app/assignments\` | all (Team and Floor plans) | Reps: my drills with progress. Managers: create, edit, close, see completion per rep |
| \`/app/team\` | all (Team and Floor plans) | Tabs: Leaderboard (everyone), Trends (managers), Members (managers) |
| \`/app/team/[userId]\` | managers, and the rep themselves | Rep profile: streak, trend chart per rubric line, recent calls |
| \`/app/personas\` | all | Library (built-in + custom). Managers see "New persona" |
| \`/app/personas/new\` | owner, manager | Persona builder: paste ICP and objections, draft, edit, save |
| \`/app/personas/[id]\` | owner, manager (edit); all (view, minus hidden pains) | Edit a custom persona and pick its voice |
| \`/app/docs\` | all | Documentation: how scoring works, the rubric, tips per persona |
| \`/app/help\` | all | FAQ, contact form (emails you through Resend), status of ElevenLabs and Anthropic |
| \`/app/billing\` | owner | Plan, minutes used this period, invoices (Stripe Customer Portal) |
| \`/app/settings\` | all | Tabs: Profile, Notifications, Workspace (owner/manager: name, timezone, ICP summary, weekly report on/off) |

API routes (Next.js): \`/api/stripe/checkout\`, \`/api/stripe/portal\`, \`/api/stripe/webhook\`,
\`/api/invites/send\` (calls \`create_invite\` with the user's JWT, then emails the link), \`/api/unsubscribe\`.

### 7.1 Sidebar (the app shell)

One level, no nested menus. Top group: logo, then **Practice, Sessions, Assignments, Team, Personas**. Bottom
group, always in this order: **Documentation, Help, Billing, Settings**. Above the bottom group sits the minutes
meter ("212 of 360 min left"). Solo plan: Assignments and Team are hidden (not greyed out), so Solo users see
7 items. Billing is hidden for anyone who is not the owner. Under 1100px the sidebar collapses to icons.

## 8. Data model

All tables are in the migration (\`supabase/migrations/0001_sparring.sql\`). The important ones:

| Table | One row is | Written by | Read by |
|---|---|---|---|
| \`profiles\` | a person | signup trigger, the person | self, teammates (name only) |
| \`workspaces\` | a team | \`create_workspace()\`, owner/manager | members |
| \`workspace_members\` | a person in a team with a role | \`create_workspace()\`, \`accept_invite()\`, owner | members |
| \`workspace_invites\` | an open invite (token hash only) | \`create_invite()\` | owner, manager |
| \`personas\` | who picks up (built-in when \`workspace_id\` is null) | seed, owner/manager | everyone (library), members (custom) |
| \`scenarios\` | what kind of call | seed, owner/manager | same as personas |
| \`persona_builds\` | one AI draft of a persona | \`spr-build-persona\` | owner, manager |
| \`assignments\` + \`assignment_reps\` | a drill and who it is for | owner/manager; progress by the worker | members (own rows for reps) |
| \`sessions\` | one practice call | \`spr-start-session\`, \`attach_conversation()\`, webhook, worker | the rep, owner, managers |
| \`session_turns\` | one line of the transcript with \`t_seconds\` | webhook | the rep, owner, managers |
| \`scorecards\` | marks for one call (5 x 0 to 20 = 100) | worker via \`save_scorecard()\` | members (for the leaderboard) |
| \`coaching_notes\` | one timestamped comment | worker | the rep, owner, managers |
| \`rep_stats\` | streak and rolling numbers per rep | worker via \`refresh_rep_stats()\` | members |
| \`usage_ledger\` | one metered spend (voice seconds, builds, scorings, persona turns) | edge functions | owner, manager |
| \`usage_reservations\` | seconds held for a call in progress | \`reserve_seconds()\` / \`settle_reservation()\` | server only |
| \`jobs\` | one background to-do | webhook, worker | server only |
| \`elevenlabs_events\` | a webhook we already processed | webhook | server only |
| \`subscriptions\`, \`stripe_events\`, \`plan_prices\` | billing | Stripe webhook | self (subscription) |
| \`email_log\`, \`notification_prefs\` | emails and preferences | edge functions, the person | server, self |

Views: \`leaderboard_week\` and \`rep_trend_weekly\` (both \`security_invoker\`, so they obey RLS).

Persona JSON fields: \`hidden_pains\`, \`objections\`, \`win_conditions\` are arrays of short strings (max 8 each,
max 200 characters each, validated in the UI and the builder). Hidden pains and win conditions are never sent
to the browser of a rep before the call: the practice page selects only \`id, name, title, company, summary,
hue, voice_id\` and the builder screen (managers) is the only place they are shown in full.

## 9. State machines

### 9.1 Session

\`\`\`
 created --attach_conversation()--> live --webhook--> ended --(worker)--> scoring --> scored
    |                                 |                  |                    |
    | no connect in 10 min            | webhook missing   | under 60 s or      | 5 failed tries
    v                                 v                  | under 3 rep turns  v
 abandoned                       spr-reconcile           v                  failed
 (hold released)                 fetches + settles   ended ("Too short to score", no scorecard)
\`\`\`

- \`end_reason\`: \`rep_hung_up\` (rep pressed End), \`persona_hung_up\` (the persona's \`end_call\`), \`time_cap\`
  (max_seconds reached), \`minute_cap\` (workspace minutes ran out mid-call: only possible if the hold was
  shortened by an override), \`error\`, \`abandoned\`.
- The browser can only move \`created\` to \`live\` (through \`attach_conversation()\`). Everything else is
  server-side.

### 9.2 Job

\`queued -> running -> done\`, or \`running -> queued\` again with \`run_after = now() + attempts^2 minutes\`, and
\`failed\` after 5 attempts. \`release_stuck_jobs()\` puts \`running\` jobs older than 10 minutes back in the queue.
Idempotency keys: \`audio:<session_id>\`, \`score:<session_id>\`.

### 9.3 Reservation

\`held -> settled\` (webhook or reconcile with the real seconds) or \`held -> released\` (call never connected,
or hold expired). A held reservation counts against the minutes left until it is settled or released.

### 9.4 Assignment

\`active -> closed\` (manager closes it, or 7 days after \`due_at\` the notify job closes it). Per rep:
\`passed_sessions\` counts scored calls on that drill with \`total >= pass_score\`; \`completed_at\` is set when it
reaches \`target_sessions\`.

## 10. Plans, limits and the leaderboard rules

### 10.1 Plans

| | Solo | Team | Floor |
|---|---|---|---|
| Monthly | $49 | $199 | $499 |
| Annual (2 months free) | $490 | $1,990 | $4,990 |
| Seats (incl. managers) | 1 | 6 | 16 |
| Voice minutes a month (pooled) | 90 | 360 | 900 |
| Longest single call | 10 min | 15 min | 20 min |
| Persona builder runs a month | 5 | 30 | 100 |
| Custom personas | 3 | 25 | 500 |
| Assignments, leaderboard, trends, weekly report | no | yes | yes |
| 7 day free trial | 20 voice minutes, 3 builds | same | same |

Minutes reset on the owner's Stripe renewal day (\`usage_period_start()\`). Annual plans get the monthly
allowance every month, not a yearly pool. When minutes run out the Call button is disabled with "Out of
practice minutes until 14 Nov. Upgrade for more." for owners, and "Ask Sam (owner) to upgrade" for others.

### 10.2 Enforcement (server-side, every time)

- \`spr-start-session\`: \`has_active_access\`, then \`reserve_seconds()\` must grant at least 60 seconds, else 402
  \`minutes_exhausted\`. Granted seconds = min(scenario minutes x 60, plan longest call, minutes left).
- \`spr-persona-llm\`: refuses (polite in-character goodbye + \`end_call\`) once elapsed time passes the session's
  \`max_seconds\`. ElevenLabs agent max duration is set to 1,200 s as a final backstop [verify the setting name].
- \`spr-build-persona\`: \`usage_this_period('persona_builds') < plan persona_builds\`, else 402.
- Seats: \`create_invite()\` counts members plus open invites; \`accept_invite()\` re-checks.
- Rate limits: start-session 30 per user per hour; build-persona 10 per user per hour; persona-llm 120 turns per
  session.

### 10.3 Leaderboard, streaks and trends

- **Leaderboard (this week, workspace timezone, Monday start):** rank by the average of each rep's best 5
  scored calls this week. A rep needs 3 scored calls to be ranked; fewer shows "2 of 3 calls to rank".
  Tie-break: more calls, then earlier last call.
- **Streak:** consecutive days (workspace timezone) with at least one scored call of 2 minutes or more. Alive
  if the last such day is today or yesterday.
- **Trends:** weekly average per rubric line (scaled to 100) for the last 12 weeks, from \`rep_trend_weekly\`.
`
