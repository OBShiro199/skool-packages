# Sparring: An AI prospect that picks up the phone so reps can practise cold calls and get scored.
slug `sparring`, category `sales`, art `{ motif: 'chat', tone: 'blue' }`, status `full`, difficulty 2 or 3 (your call), buildHours your estimate, 3-letter id prefix of your choice (unique, not used by another kit). No price given: compute per-customer cost from researched API prices and set 2 to 3 plans at 75%+ gross margin at each plan's cap, monthly + annual (10x), 7-day trial; maths in costs.notes.

- Reps pick a persona (sceptical CFO, busy founder, gatekeeper) and scenario (cold call, discovery, objection drill) or a manager builds custom ones from their ICP and real objections.
- Real-time voice roleplay in the browser: research and pick the stack (OpenAI Realtime is excluded; use Claude for the persona brain with a low-latency voice layer such as ElevenLabs Conversational AI, Vapi, or Deepgram STT + Claude + Cartesia/ElevenLabs TTS; compare latency and price per minute, mark [verify]).
- Transcript + recording saved; Claude (`claude-sonnet-5-5`) scores against a rubric (opener, permission, pain discovery, objection handling, next step) with timestamped coaching notes.
- Team workspaces: managers assign drills, see a leaderboard, streaks, and score trends per rep. Resend weekly team report.
- Metering per voice minute with hard caps per plan.
- Marketing: SDR teams, sales bootcamps, founders learning to cold call.
- Sidebar: core pages, then Documentation, Help, Billing, Settings.
- Everything else per KIT_BRIEF.md.
