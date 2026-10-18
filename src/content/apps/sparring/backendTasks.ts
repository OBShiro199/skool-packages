// Sparring app-specific backend tasks: one account-setup task per service, plus the end-to-end test.
import type { Task } from '../../types'

export const backendTasks: Task[] = [
  {
    id: 'spr-be-elevenlabs',
    title: 'Set up ElevenLabs: the agent, the Custom LLM and the webhook',
    outcome: 'One ElevenLabs agent that speaks with any persona voice, asks your own endpoint what to say, and tells Sparring when each call ends.',
    minutes: 50,
    xp: 60,
    blocks: [
      { type: 'callout', tone: 'eli5', title: 'Why ElevenLabs and not a cheaper DIY stack', text: 'A live voice call needs four hard things at once: hearing the rep, knowing when they have stopped talking, thinking of a reply, and speaking it in a natural voice, all in about a second. ElevenLabs does three of those in one service and lets your own server do the thinking with Claude. Building it yourself from Deepgram, Cartesia and a media server is cheaper per minute but needs a server that never sleeps. Start here; revisit after 300 paying teams.' },
      { type: 'table', head: ['', 'ElevenLabs Agents', 'Vapi', 'Deepgram Voice Agent', 'DIY (Deepgram + Cartesia + LiveKit)'], rows: [
        ['Price per minute before Claude', 'about $0.08 [verify]', 'about $0.08 to $0.12 all-in [verify]', 'about $0.065 BYO LLM [verify]', 'about $0.04 [verify]'],
        ['Use Claude as the brain', 'Custom LLM endpoint', 'Built-in Anthropic', 'BYO LLM', 'You call Claude'],
        ['Voices for personas', 'Best range', 'Pick any provider', 'Fewer', 'Cartesia voices'],
        ['Servers you run', 'None (one edge function)', 'None', 'None', 'An always-on agent server'],
        ['Decision', 'Use this', 'Close second', 'Cheapest bundle', 'Later, at scale'],
      ] },
      { type: 'steps', items: [
        'Go to elevenlabs.io and click Sign up. Pick a paid plan that includes Agents minutes (Creator is enough to build; move to Pro before launch) [verify the plan names and included minutes on elevenlabs.io/pricing].',
        'API key: click your profile (bottom left) > API Keys (or Developers > API Keys) > Create API key. Name it "sparring-dev". Give it access to Agents (read and write) and Voices (read). Copy it now: it is shown once [verify the menu path and the key prefix].',
        'Make two secrets in a terminal: run `openssl rand -hex 32` twice. The first is PERSONA_LLM_SECRET, the second is SESSION_TOKEN_SECRET.',
        'Agents (left menu) > Create agent > Blank agent. Name it "Sparring persona". In Agent > System prompt type: Persona prompt is supplied by the server. First message: {{first_line}}.',
        'Agent > LLM: choose Custom LLM. Server URL: https://YOUR-REF.supabase.co/functions/v1/spr-persona-llm/v1 . Model ID: sparring-persona. API key: click Add secret, name it persona-llm-secret, paste PERSONA_LLM_SECRET [verify the field names].',
        'Agent > Voice: pick any default voice and the low-latency Flash TTS model if offered [verify model name].',
        'Agent > Advanced: max conversation duration 1200 seconds. Tools: enable the system tool End call.',
        'Agent > Security: turn on Enable authentication (no public agent). Under Overrides, enable First message and Voice.',
        'Copy the agent id from the agent page URL or the agent header (it starts with agent_ [verify]).',
        'Workspace settings > Webhooks > Add webhook (post-call). URL: https://YOUR-REF.supabase.co/functions/v1/spr-elevenlabs-webhook . Turn on transcription webhooks, leave audio webhooks off. Copy the webhook secret it shows (HMAC) [verify the menu path].',
        'Add all five values below to Supabase > Edge Functions > Secrets.',
      ] },
      { type: 'keys', rows: [
        { name: 'ELEVENLABS_API_KEY', where: 'ElevenLabs > profile > API Keys > Create API key', pasteInto: 'Supabase secrets', secret: true },
        { name: 'ELEVENLABS_AGENT_ID', where: 'ElevenLabs > Agents > Sparring persona > agent id', pasteInto: 'Supabase secrets', secret: false },
        { name: 'ELEVENLABS_WEBHOOK_SECRET', where: 'ElevenLabs > Settings > Webhooks > your post-call webhook > secret', pasteInto: 'Supabase secrets', secret: true },
        { name: 'PERSONA_LLM_SECRET', where: 'Make one: openssl rand -hex 32 (also pasted into the agent\'s Custom LLM API key secret)', pasteInto: 'Supabase secrets', secret: true },
        { name: 'SESSION_TOKEN_SECRET', where: 'Make one: openssl rand -hex 32', pasteInto: 'Supabase secrets', secret: true },
      ] },
      { type: 'p', text: 'Test the key and the agent. Replace YOUR_KEY and YOUR_AGENT_ID.' },
      { type: 'code', id: 'spr-be-elevenlabs-curl', filename: 'test-elevenlabs.sh', lang: 'bash', code: `# 1. The key works: list a few voices.
curl -s "https://api.elevenlabs.io/v1/voices" -H "xi-api-key: YOUR_KEY" | head -c 400; echo

# 2. The agent can hand out a private conversation token (what spr-start-session does).
curl -s "https://api.elevenlabs.io/v1/convai/conversation/token?agent_id=YOUR_AGENT_ID" \\
  -H "xi-api-key: YOUR_KEY"; echo

# 3. Or a signed WebSocket URL (fallback).
curl -s "https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=YOUR_AGENT_ID" \\
  -H "xi-api-key: YOUR_KEY"; echo` },
      { type: 'p', text: 'A good first answer is JSON with a `voices` array (each has a `voice_id` and a `name`). The second returns `{"token":"..."}` and the third `{"signed_url":"wss://..."}`. If the paths have changed, the ElevenLabs API reference under Agents Platform has the current ones: tell Claude Code.' },
      { type: 'links', items: [
        { label: 'ElevenLabs pricing', url: 'https://elevenlabs.io/pricing' },
        { label: 'Custom LLM docs', url: 'https://elevenlabs.io/docs/eleven-agents/customization/llm/custom-llm' },
        { label: 'Post-call webhooks', url: 'https://elevenlabs.io/docs/eleven-agents/workflows/post-call-webhooks' },
        { label: 'Overrides and dynamic variables', url: 'https://elevenlabs.io/docs/eleven-agents/customization/personalization' },
        { label: 'React SDK', url: 'https://elevenlabs.io/docs/agents-platform/libraries/react' },
        { label: 'Concurrency limits', url: 'https://elevenlabs.io/docs/help-center/product/eleven-agents/how-many-eleven-agents-requests-can-i-make-and-can-i-increase-it' },
      ] },
      { type: 'mistakes', items: [
        { mistake: 'The token call returns 401 or "invalid api key".', fix: 'The header is xi-api-key, not Authorization. If the key has limited permissions, edit it in ElevenLabs and allow Agents (read and write).' },
        { mistake: 'In the ElevenLabs "Test AI agent" button the agent says nothing.', fix: 'The test has no sparring session token, so your endpoint answers 401 by design. Test the endpoint with the curl in the spr-persona-llm task, and test the whole call from your own app.' },
        { mistake: 'The webhook never fires.', fix: 'Post-call webhooks are set at workspace level and must be attached to the agent [verify]. Check Settings > Webhooks shows it enabled and that the agent\'s Advanced or Workflow settings point to it. Then check Supabase > Edge Functions > spr-elevenlabs-webhook > Logs.' },
      ] },
    ],
    checklist: [
      { id: 'spr-be-elevenlabs-c1', label: 'Create the ElevenLabs account and an API key' },
      { id: 'spr-be-elevenlabs-c2', label: 'Create the agent with Custom LLM, overrides, End call and authentication on' },
      { id: 'spr-be-elevenlabs-c3', label: 'Add the post-call transcription webhook' },
      { id: 'spr-be-elevenlabs-c4', label: 'Add all five secrets to Supabase' },
      { id: 'spr-be-elevenlabs-c5', label: 'Run the three test calls', trigger: 'copy:spr-be-elevenlabs-curl' },
    ],
  },
  {
    id: 'spr-be-voices',
    title: 'Pick the persona voices',
    outcome: 'Margaret, Dev and Priya (and the 8 builder voices) have real ElevenLabs voices that fit their characters.',
    minutes: 25,
    xp: 25,
    blocks: [
      { type: 'callout', tone: 'tip', title: 'Voice matters more than you think', text: 'A sceptical CFO with a cheerful voice is not sceptical. Spend 20 minutes here. Pick voices with low expressiveness for cold personas and conversational (not narration) styles. Test each one on a phone speaker and on headphones.' },
      { type: 'steps', items: [
        'ElevenLabs > Voices > Voice Library. Filter by Use case: Conversational. Listen with headphones.',
        'For Margaret (CFO): a calm, dry, mid-age voice. For Dev (founder): fast, friendly, younger. For Priya (EA): warm, precise. Click Add to my voices for each.',
        'Pick 8 more for the builder list in lib/voices.ts (two UK, two US, one Indian English, one Australian, mixed genders).',
        'Copy each voice id (Voices > My voices > the voice > ID).',
        'Run the SQL below with your three ids, then paste the 8 builder ids into lib/voices.ts.',
      ] },
      { type: 'code', id: 'spr-be-voices-sql', filename: 'set-voices.sql', lang: 'sql', code: `update public.personas set voice_id = 'PASTE_CFO_VOICE_ID'        where slug = 'sceptical-cfo'  and workspace_id is null;
update public.personas set voice_id = 'PASTE_FOUNDER_VOICE_ID'    where slug = 'busy-founder'  and workspace_id is null;
update public.personas set voice_id = 'PASTE_GATEKEEPER_VOICE_ID' where slug = 'gatekeeper'    and workspace_id is null;
select slug, voice_id from public.personas where workspace_id is null;` },
      { type: 'mistakes', items: [
        { mistake: 'The call always uses the agent\'s default voice.', fix: 'Voice overrides are off on the agent. Agent > Security > Overrides > enable Voice, then start a new call.' },
        { mistake: 'A voice sounds robotic on short replies.', fix: 'Some library voices are trained for narration. Pick one tagged Conversational, and keep the Flash or Turbo model on the agent for speed.' },
      ] },
    ],
    checklist: [
      { id: 'spr-be-voices-c1', label: 'Add 3 persona voices and 8 builder voices to My voices' },
      { id: 'spr-be-voices-c2', label: 'Run the voice SQL with your ids', trigger: 'copy:spr-be-voices-sql' },
      { id: 'spr-be-voices-c3', label: 'Paste the 8 builder voice ids into lib/voices.ts' },
    ],
  },
  {
    id: 'spr-be-anthropic',
    title: 'Set up the Claude API for the persona brain and scoring',
    outcome: 'Sparring can stream claude-haiku-5-5 replies in character and score calls with claude-sonnet-5-5 structured output, under a spend limit you set.',
    minutes: 20,
    xp: 35,
    blocks: [
      { type: 'callout', tone: 'eli5', title: 'Two models, two jobs', text: 'During the call speed matters most, so the fast, cheap Haiku model plays the prospect: it costs about a fifth of a cent per minute. After the call, judgement matters most, so the smarter Sonnet model reads the transcript and scores it: about 4 cents a call. Neither one ever sees your API keys or your customers\' billing.' },
      { type: 'table', head: ['Job', 'Model', 'Price per million tokens (Oct 2026)', 'Cost'], rows: [
        ['Persona replies (every turn)', 'claude-haiku-5-5', '$0.10 in / $0.50 out', 'about $0.002 a minute'],
        ['Scoring (once per call)', 'claude-sonnet-5-5', '$2 in / $10 out, cache reads $0.20', 'about $0.04 a call'],
        ['Persona builder', 'claude-sonnet-5-5', 'same', 'about $0.04 a draft'],
      ] },
      { type: 'steps', items: [
        'Go to console.anthropic.com and sign up (separate from a Claude Pro login).',
        'Settings > Billing: add a card and buy $10 of credit. That covers about 200 scored test calls.',
        'Settings > Limits: set a monthly spend limit (start with $50).',
        'Settings > API Keys > Create Key, name "sparring-dev". Copy it (starts with sk-ant-, shown once).',
        'Add it to Supabase secrets as ANTHROPIC_API_KEY.',
      ] },
      { type: 'keys', rows: [
        { name: 'ANTHROPIC_API_KEY', where: 'console.anthropic.com > Settings > API Keys > Create Key (sk-ant-...)', pasteInto: 'Supabase secrets', secret: true },
      ] },
      { type: 'code', id: 'spr-be-anthropic-curl', filename: 'test-claude.sh', lang: 'bash', code: `# 1. Persona brain: fast streamed reply in character.
curl -sN https://api.anthropic.com/v1/messages \\
  -H "x-api-key: $ANTHROPIC_API_KEY" -H "anthropic-version: 2023-06-01" -H "content-type: application/json" \\
  -d '{
    "model": "claude-haiku-5-5", "max_tokens": 200, "stream": true,
    "thinking": { "type": "disabled" }, "output_config": { "effort": "low" },
    "system": "You are Margaret Okafor, a sceptical CFO, answering a cold call. Reply in 1 to 2 short spoken sentences.",
    "messages": [{ "role": "user", "content": "Hi Margaret, this is Sam from Ledgerly, can I have 30 seconds?" }]
  }' | grep -o '"text":"[^"]*"' | head

# 2. Scoring: structured JSON output.
curl -s https://api.anthropic.com/v1/messages \\
  -H "x-api-key: $ANTHROPIC_API_KEY" -H "anthropic-version: 2023-06-01" -H "content-type: application/json" \\
  -d '{
    "model": "claude-sonnet-5-5", "max_tokens": 2000,
    "output_config": { "effort": "low", "format": { "type": "json_schema", "schema": {
      "type": "object", "additionalProperties": false, "required": ["opener", "reason"],
      "properties": { "opener": { "type": "integer" }, "reason": { "type": "string" } } } } },
    "messages": [{ "role": "user", "content": "<transcript>[0:00] PROSPECT: Margaret Okafor. [0:02] REP: Hi, is this a bad time?</transcript> Score the opener 0 to 20." }]
  }'` },
      { type: 'p', text: 'Good answers: the first prints a few `"text":"..."` pieces of a short, cool reply ("Thirty seconds. Go."). The second has `"stop_reason": "end_turn"` and a text block with JSON like `{"opener":4,"reason":"Asked if it was a bad time..."}`. If the first returns a 400 about thinking, remove the thinking line and keep effort low.' },
      { type: 'links', items: [
        { label: 'Anthropic Console', url: 'https://console.anthropic.com' },
        { label: 'Models and pricing', url: 'https://docs.claude.com/en/docs/about-claude/models/overview' },
        { label: 'Structured outputs', url: 'https://docs.claude.com/en/docs/build-with-claude/structured-outputs' },
        { label: 'Streaming', url: 'https://docs.claude.com/en/docs/build-with-claude/streaming' },
      ] },
      { type: 'mistakes', items: [
        { mistake: '400 "thinking.type disabled is not supported".', fix: 'Some current models do not allow turning thinking off at every effort. For Haiku keep effort low; for Sonnet 5.5 never send disabled (omit thinking, or use adaptive).' },
        { mistake: '429 rate limit during a team blitz.', fix: 'New accounts start on a low rate tier. Buy a little more credit to move up a tier, and keep the 120 turn limit per call.' },
        { mistake: 'Scores come back as 25 out of 20.', fix: 'Structured outputs do not enforce number ranges. The worker clamps every score to 0 to 20 with zod. Check that clamp is there.' },
      ] },
    ],
    checklist: [
      { id: 'spr-be-anthropic-c1', label: 'Create the Anthropic Console account, add $10 and a spend limit' },
      { id: 'spr-be-anthropic-c2', label: 'Create the API key and add it to Supabase secrets' },
      { id: 'spr-be-anthropic-c3', label: 'Run both test calls', trigger: 'copy:spr-be-anthropic-curl' },
    ],
  },
  {
    id: 'spr-be-latency',
    title: 'Measure the voice latency and fix the slow hop',
    outcome: 'You know your real reply time per turn and have it under about 1.5 seconds.',
    minutes: 30,
    xp: 35,
    blocks: [
      { type: 'callout', tone: 'eli5', title: 'Where the second goes', text: 'After the rep stops talking, ElevenLabs waits a moment to be sure they are done, sends the words to your endpoint, your endpoint asks Claude, the first words come back, and ElevenLabs starts speaking them. If any step is slow the prospect feels laggy. Your logs show the part you control: ttft_ms, the time to Claude\'s first words.' },
      { type: 'steps', items: [
        'Make five 2 minute calls in the app.',
        'Supabase > Edge Functions > spr-persona-llm > Logs: filter on ttft_ms. Note the median and the slowest.',
        'In ElevenLabs > Agents > Conversations, open a call and look at the latency shown per turn (if available) [verify].',
        'Run the SQL below to see how many turns each call had (more turns per minute means a snappier call).',
      ] },
      { type: 'code', id: 'spr-be-latency-sql', filename: 'turns-per-minute.sql', lang: 'sql', code: `select s.id, s.duration_seconds,
       count(t.*) filter (where t.role = 'persona') as persona_turns,
       round(count(t.*) filter (where t.role = 'persona') / greatest(s.duration_seconds / 60.0, 1), 1) as turns_per_min
from public.sessions s join public.session_turns t on t.session_id = s.id
group by s.id order by s.created_at desc limit 5;` },
      { type: 'table', head: ['Median ttft_ms', 'What to do'], rows: [
        ['Under 600', 'Nothing. Move on.'],
        ['600 to 900', 'Check the persona query is one join, the Anthropic client is created at module top level, and the system prompt has cache_control.'],
        ['Over 900', 'Your Supabase region is far from ElevenLabs or Anthropic. Ask Claude Code to move spr-persona-llm to a Vercel Fluid function (app/api/persona-llm/v1/chat/completions/route.ts) in the US East region and point the agent there.'],
      ] },
      { type: 'mistakes', items: [
        { mistake: 'The first turn of every call is slow (2 to 3 seconds).', fix: 'Cold start. The spr-worker cron hits Supabase every minute, but not this function. Ask Claude Code to have spr-reconcile send one OPTIONS request to spr-persona-llm each run to keep it warm.' },
        { mistake: 'Margaret cuts the rep off mid-sentence.', fix: 'Turn eagerness is too high. In the agent\'s turn-taking settings pick a calmer setting (Normal or Patient) [verify the name].' },
      ] },
    ],
    checklist: [
      { id: 'spr-be-latency-c1', label: 'Make five test calls and read ttft_ms in the logs' },
      { id: 'spr-be-latency-c2', label: 'Run the turns-per-minute SQL', trigger: 'copy:spr-be-latency-sql' },
      { id: 'spr-be-latency-c3', label: 'Apply the fix from the table if the median is over 600 ms' },
    ],
  },
  {
    id: 'spr-be-e2e',
    title: 'Run the full practice-to-report test end to end',
    outcome: 'One real test proves every piece works together: call, persona, hang-up, webhook, minutes, scoring, notes, leaderboard and the weekly email.',
    minutes: 60,
    xp: 70,
    blocks: [
      { type: 'callout', tone: 'eli5', title: 'Why one long test', text: 'Each part can pass on its own and still fail when joined up: a webhook URL with a typo, a secret missing in production, a timezone that puts Monday on Sunday. This walks the exact path a real team takes, so you find the gaps before a customer does.' },
      { type: 'steps', items: [
        'Use two browsers: Chrome as the owner (manager), a private window as a rep you invited.',
        'As the rep: one Cold call to Margaret on Normal (2 to 3 minutes, try to book a meeting), one Objection drill to Dev, and one Hard call where you pitch for 60 seconds without a question (Margaret should hang up).',
        'Check each call shows Scoring, then a scorecard within 90 seconds, and that the Hard call says "Margaret hung up".',
        'As the manager: open Team > Leaderboard (the rep is ranked), Trends (a point this week), and one of the rep\'s calls with audio.',
        'Set an override of 4 voice minutes for the workspace (SQL below), start a call as the rep and check it ends itself before the cap and that the next Call button says Out of practice minutes. Then delete the override.',
        'Call spr-notify with force_workspace on localhost and check the weekly report email arrives once.',
        'Run the check SQL. Every column must say true.',
      ] },
      { type: 'code', id: 'spr-be-e2e-sql', filename: 'e2e-check.sql', lang: 'sql', code: `-- Cap test (run before step 5, delete after):
-- insert into public.workspace_limit_overrides (workspace_id, voice_minutes) values ('<ws id>', 4);
-- delete from public.workspace_limit_overrides where workspace_id = '<ws id>';

with s as (select * from public.sessions where created_at > now() - interval '1 day')
select
  (select count(*) >= 3 from s where status = 'scored')                                          as three_scored,
  (select bool_and(recording_path is not null) from s where status = 'scored')                   as all_have_audio,
  (select count(*) >= 1 from s where end_reason = 'persona_hung_up')                             as persona_hung_up_once,
  (select count(*) = 0 from public.usage_reservations where status = 'held' and expires_at < now()) as no_stale_holds,
  (select count(*) = count(distinct idempotency_key) from public.usage_ledger)                   as ledger_unique,
  (select sum(quantity) from public.usage_ledger u join s on s.id = u.ref_id where u.kind = 'voice_seconds')
    = (select sum(duration_seconds) from s where duration_seconds is not null)                   as seconds_match,
  (select count(*) >= 3 from public.coaching_notes n join s on s.id = n.session_id)              as notes_written,
  (select count(*) >= 1 from public.email_log where kind like 'weekly%' or dedupe_key like 'weekly:%') as weekly_sent;` },
      { type: 'mistakes', items: [
        { mistake: 'seconds_match is false.', fix: 'A webhook was processed twice or a session settled with a different number. Check elevenlabs_events has one row per conversation and that settle_reservation uses the idempotency key voice:<session id>.' },
        { mistake: 'Calls stay on "Saving the recording" for ever.', fix: 'pg_cron is not calling spr-worker. Run select * from cron.job_run_details order by start_time desc limit 5; and check the URL and the cron_secret in Vault.' },
        { mistake: 'The cap test lets the call run past 4 minutes.', fix: 'spr-persona-llm is not reading started_at (attach_conversation was not called) so elapsed is measured from created_at only. Check the session has started_at set and that the browser calls attach straight after startSession.' },
      ] },
    ],
    checklist: [
      { id: 'spr-be-e2e-c1', label: 'Make three calls as a rep, including one hang-up' },
      { id: 'spr-be-e2e-c2', label: 'Check the leaderboard, trends and audio as the manager' },
      { id: 'spr-be-e2e-c3', label: 'Run the 4 minute cap test and remove the override' },
      { id: 'spr-be-e2e-c4', label: 'Run the e2e SQL and see every column true', trigger: 'copy:spr-be-e2e-sql' },
    ],
  },
]
