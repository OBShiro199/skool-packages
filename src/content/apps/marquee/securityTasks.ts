// Marquee app-specific security tests.
import type { Task } from '../../types'

const getJwt = `REF=your-project-ref
PK=sb_publishable_xxx

# Log in as user B (a second test account in a DIFFERENT workspace) and keep the token.
JWT_B=$(curl -s "https://$REF.supabase.co/auth/v1/token?grant_type=password" \\
  -H "apikey: $PK" -H "Content-Type: application/json" \\
  -d '{"email":"userb@yourmail.com","password":"their-password"}' | sed -E 's/.*"access_token":"([^"]+)".*/\\1/')
echo "\${JWT_B:0:20}..."`

export const securityTasks: Task[] = [
  {
    id: 'mrq-sec-isolation',
    title: 'Try to see another creator\'s faces, concepts and tests',
    outcome: 'Proof that one workspace can never read another workspace\'s face photos, thumbnails, tests or YouTube numbers.',
    minutes: 35,
    xp: 50,
    blocks: [
      { type: 'callout', tone: 'eli5', title: 'Think like a rival channel', text: 'A competitor signs up for a trial. They have the public key (it is in every browser) and their own login. Could they see another creator\'s unreleased thumbnails, their face photos or their CTR? These tests prove the answer is no.' },
      { type: 'steps', items: [
        'Make two test accounts: user A (your main test workspace with faces, a project, a design and a test) and user B (a new signup with its own workspace).',
        'In Supabase > Table Editor, copy one id each from user A\'s face_photos, concepts, designs and tests, plus A\'s workspace id.',
        'Run the script below with those ids. Every line must print [] (an empty list) or an error. Any row with data is a fail.',
      ] },
      { type: 'code', id: 'mrq-sec-isolation-curl', filename: 'attack-isolation.sh', lang: 'bash', code: `${getJwt}
WS_A=user_a_workspace_id
DESIGN_A=user_a_design_id

# 1. Only the publishable key (no login): every table must return [] or a permission error.
for t in face_photos people concepts designs tests test_variants reach_daily video_daily channels channel_tokens jobs usage_ledger; do
  echo "anon $t:"; curl -s "https://$REF.supabase.co/rest/v1/$t?select=*&limit=1" -H "apikey: $PK"; echo
done

# 2. Logged in as user B, filtering on user A's workspace: every line must be [].
for t in face_photos concepts designs tests reach_daily channels videos projects; do
  echo "B reads A $t:"; curl -s "https://$REF.supabase.co/rest/v1/$t?select=id&workspace_id=eq.$WS_A" \\
    -H "apikey: $PK" -H "Authorization: Bearer $JWT_B"; echo
done

# 3. User B tries to overwrite user A's design. Must change 0 rows (returns []).
curl -s -X PATCH "https://$REF.supabase.co/rest/v1/designs?id=eq.$DESIGN_A" \\
  -H "apikey: $PK" -H "Authorization: Bearer $JWT_B" -H "Content-Type: application/json" \\
  -H "Prefer: return=representation" -d '{"name":"hacked"}'; echo

# 4. Storage: user B lists and downloads from user A's folders. Must be [] or 400/403/404.
for b in faces concepts exports tests originals; do
  echo "B lists A $b:"; curl -s -X POST "https://$REF.supabase.co/storage/v1/object/list/$b" \\
    -H "apikey: $PK" -H "Authorization: Bearer $JWT_B" -H "Content-Type: application/json" \\
    -d "{\\"prefix\\":\\"$WS_A/\\",\\"limit\\":5}"; echo
done

# 5. User B uploads into user A's faces folder. Must be 403 (row-level security).
curl -s -X POST "https://$REF.supabase.co/storage/v1/object/faces/$WS_A/x/evil.png" \\
  -H "apikey: $PK" -H "Authorization: Bearer $JWT_B" -H "Content-Type: image/png" --data-binary "fake"; echo` },
      { type: 'prompt', id: 'mrq-sec-isolation-prompt', title: 'Paste into Claude Code', code: `Write scripts/security-isolation.ts and run it against my dev project. Create two users and two workspaces with the secret key (via the admin API and create_workspace through each user's session), seed one person, face photo row, project, concept, design, test, variant, rotation and reach_daily row in workspace A, then check as user B, printing PASS or FAIL for each:
1. Selects on every public table filtered to workspace A return 0 rows.
2. Update and delete on A's projects, designs, people and face_photos change 0 rows.
3. Insert into A's people, projects and designs with workspace_id = A fails.
4. Storage list, download, upload and delete in A's folder fail for every bucket.
5. supabase.rpc('workspace_usage', { ws: A }) and rpc('mark_design_exported') on A's design both raise.
6. As user A, select on channel_tokens, oauth_states, rate_limits, fal_events and youtube_quota_days returns 0 rows (server-only tables).
Then run the Supabase security advisor (get_advisors through the Supabase MCP) and show me any warnings. Fix anything that fails, then re-run.` },
      { type: 'mistakes', items: [
        { mistake: 'Test 2 returns rows for videos or reach_daily.', fix: 'A policy uses (true) or checks the channel instead of the workspace. Every policy in the migration checks is_workspace_member(workspace_id); re-run that section of the SQL.' },
        { mistake: 'User B can list A\'s storage folder.', fix: 'A storage policy is missing the folder check. Each policy must include public.is_workspace_member_text((storage.foldername(name))[1]). Check Storage > Policies for the bucket.' },
        { mistake: 'channel_tokens returns rows for user A.', fix: 'Someone added a policy to it. It must have RLS on and no policies at all: drop policy "..." on public.channel_tokens;' },
      ] },
    ],
    checklist: [
      { id: 'mrq-sec-isolation-c1', label: 'Make user A and user B test accounts' },
      { id: 'mrq-sec-isolation-c2', label: 'Run the isolation attack script', trigger: 'copy:mrq-sec-isolation-curl' },
      { id: 'mrq-sec-isolation-c3', label: 'Run the isolation prompt and get 6 PASS', trigger: 'copy:mrq-sec-isolation-prompt' },
    ],
  },
  {
    id: 'mrq-sec-credits',
    title: 'Try to run up the image bill or skip the caps',
    outcome: 'Proof that no user can generate past their plan, spend another workspace\'s credits, or fake a "ready" face or a small export.',
    minutes: 30,
    xp: 50,
    blocks: [
      { type: 'callout', tone: 'eli5', title: 'Why this matters for your margin', text: 'Every concept costs you about 5 cents. Someone who calls your functions in a loop could cost you hundreds of dollars a night. The caps live on the server, so even a user who never opens your app and calls the functions directly hits the same wall.' },
      { type: 'code', id: 'mrq-sec-credits-curl', filename: 'attack-credits.sh', lang: 'bash', code: `${getJwt}
PROJECT_A=user_a_project_id     # a project in user A's workspace
PROJECT_B=user_b_project_id     # user B's own project (B has 5 ready face photos)
PHOTO_B=user_b_face_photo_id

# 1. B generates on A's project. Must be 403.
curl -s -X POST "https://$REF.supabase.co/functions/v1/mrq-generate" \\
  -H "Authorization: Bearer $JWT_B" -H "Content-Type: application/json" \\
  -d "{\\"project_id\\":\\"$PROJECT_A\\"}"; echo

# 2. B (on a trial: 12 concepts) fires 5 generations quickly on its own project.
#    Expect: 2 succeed, then 409 busy or 402 limit_reached. Never more than 12 credits used.
for i in 1 2 3 4 5; do
  curl -s -o /dev/null -w "%{http_code} " -X POST "https://$REF.supabase.co/functions/v1/mrq-generate" \\
    -H "Authorization: Bearer $JWT_B" -H "Content-Type: application/json" \\
    -d "{\\"project_id\\":\\"$PROJECT_B\\"}"
done; echo

# 3. B marks its own face photo "ready" without paying. Must fail with "only the expression can be changed here".
curl -s -X PATCH "https://$REF.supabase.co/rest/v1/face_photos?id=eq.$PHOTO_B" \\
  -H "apikey: $PK" -H "Authorization: Bearer $JWT_B" -H "Content-Type: application/json" \\
  -d '{"status":"ready","cutout_path":"x.png"}'; echo

# 4. B writes its own usage rows to get credits back. Must fail (no insert policy).
curl -s -X POST "https://$REF.supabase.co/rest/v1/usage_ledger" \\
  -H "apikey: $PK" -H "Authorization: Bearer $JWT_B" -H "Content-Type: application/json" \\
  -d '{"workspace_id":"x","kind":"concepts","quantity":-100,"idempotency_key":"free"}'; echo

# 5. B calls the cron workers directly. Both must be 401.
curl -s -o /dev/null -w "%{http_code}\\n" -X POST "https://$REF.supabase.co/functions/v1/mrq-ai-worker" -H "x-cron-secret: guess"
curl -s -o /dev/null -w "%{http_code}\\n" -X POST "https://$REF.supabase.co/functions/v1/mrq-youtube-worker"` },
      { type: 'code', id: 'mrq-sec-credits-sql', filename: 'check-credits.sql', lang: 'sql', code: `-- After the script: B's trial workspace has spent at most 12 concepts.
select w.name, public.usage_this_month(w.id, 'concepts') as concepts_used,
       (select concepts from public.plan_limits(w.id)) as cap
from public.workspaces w order by w.created_at desc limit 2;` },
      { type: 'steps', items: [
        'Make sure user B is on a trial (or set an override: insert into workspace_limit_overrides (workspace_id, concepts) values (\'<B ws>\', 12);).',
        'Run the script and compare every line with its comment.',
        'Run the check SQL. concepts_used must be 12 or less.',
        'In the editor as user B, upload a 3 MB JPEG to exports by hand with the browser console and call mark_design_exported on it: it must say too_big (the bucket limit may stop the upload first, which is also a pass).',
      ] },
      { type: 'mistakes', items: [
        { mistake: 'Five fast calls all succeed and usage goes to 30.', fix: 'The check and the insert are not atomic. Ask Claude Code to wrap the limit check and the 6 usage inserts in one SQL function (reserve_concepts(ws, n)) that locks the workspace row with select ... for update before counting.' },
        { mistake: 'The face_photos PATCH succeeds.', fix: 'The guard trigger is missing. Re-run the face_photos_guard section of the migration and check Database > Triggers lists it.' },
        { mistake: 'A worker returns 200 without the secret.', fix: 'It was deployed with JWT verification off and no requireCron call. Add requireCron as the first line and redeploy.' },
      ] },
    ],
    checklist: [
      { id: 'mrq-sec-credits-c1', label: 'Run the credits attack script', trigger: 'copy:mrq-sec-credits-curl' },
      { id: 'mrq-sec-credits-c2', label: 'Check usage stayed within the cap', trigger: 'copy:mrq-sec-credits-sql' },
      { id: 'mrq-sec-credits-c3', label: 'Try an oversized export and see it refused' },
    ],
  },
  {
    id: 'mrq-sec-webhooks',
    title: 'Forge fal.ai webhooks and Google OAuth callbacks',
    outcome: 'Proof that fake "image ready" calls are rejected, replays are ignored, and nobody can attach their YouTube channel to someone else\'s workspace.',
    minutes: 30,
    xp: 50,
    blocks: [
      { type: 'callout', tone: 'eli5', title: 'Why a forged callback is dangerous', text: 'If anyone could call the fal webhook, they could tell Marquee "your concept is ready, here is the picture" and point it at any image on the internet. If anyone could call the Google callback with a made-up state, they could plug their channel into your customer\'s workspace. Signatures and signed states stop both.' },
      { type: 'code', id: 'mrq-sec-webhooks-curl', filename: 'attack-webhooks.sh', lang: 'bash', code: `REF=your-project-ref
FN="https://$REF.supabase.co/functions/v1"

# 1. Fake fal webhook with no signature. Must be 401.
curl -s -o /dev/null -w "%{http_code}\\n" -X POST "$FN/mrq-fal-webhook" -H "Content-Type: application/json" \\
  -d '{"request_id":"REAL_REQUEST_ID","status":"OK","payload":{"images":[{"url":"https://evil.example/x.png"}]}}'

# 2. Fake fal webhook with made-up signature headers. Must be 401.
curl -s -o /dev/null -w "%{http_code}\\n" -X POST "$FN/mrq-fal-webhook" -H "Content-Type: application/json" \\
  -H "X-Fal-Webhook-Request-Id: REAL_REQUEST_ID" -H "X-Fal-Webhook-User-Id: someone" \\
  -H "X-Fal-Webhook-Timestamp: $(date +%s)" -H "X-Fal-Webhook-Signature: $(openssl rand -hex 64)" \\
  -d '{"request_id":"REAL_REQUEST_ID","status":"OK","payload":{"images":[{"url":"https://evil.example/x.png"}]}}'

# 3. Google callback with a made-up state. Must redirect (302) to /app/channels?error=state.
curl -s -o /dev/null -w "%{http_code} %{redirect_url}\\n" "$FN/mrq-youtube-connect/callback?code=fake&state=eyJ3cyI6ImEifQ.abc"

# 4. Replay: run one real connect in the app, copy the state from the function logs, then call
#    the callback again with it. Must redirect with error=state (the nonce was used).
curl -s -o /dev/null -w "%{http_code} %{redirect_url}\\n" "$FN/mrq-youtube-connect/callback?code=fake&state=PASTE_USED_STATE"` },
      { type: 'prompt', id: 'mrq-sec-webhooks-prompt', title: 'Paste into Claude Code', code: `Write scripts/security-webhooks.ts and run it. Print PASS or FAIL for each:
1. mrq-fal-webhook: no headers = 401; random signature = 401; a timestamp 10 minutes old with otherwise valid-looking headers = 401.
2. Generate an Ed25519 key pair locally, sign a body the correct way, and call the webhook: it must still be 401 (our key is not in fal's JWKS). This proves we do not trust keys sent by the caller.
3. Unit test the store_concept host check: https://evil.example/x.png, http://169.254.169.254/latest and file:///etc/passwd are all refused; a fal.media URL is allowed.
4. mrq-youtube-connect/callback: a state with a valid shape but a wrong HMAC, an expired state, and a state whose nonce was already used all redirect to error=state, and no channels row is created.
5. A state signed for workspace A cannot be used by user B to attach a channel to A: B's session is not involved in the callback, so check the callback uses only the ws and uid inside the verified state and that /start refused B for workspace A with 403.
6. mrq-test-control with a variant design_id from another workspace returns 403 or 422 and creates no test.
Fix anything that fails, then re-run.` },
      { type: 'mistakes', items: [
        { mistake: 'Test 1 or 2 returns 200.', fix: 'The function parses JSON before checking the signature, or skips the check when a header is missing. The signature check must be the first thing after reading the raw body, and a missing header is a 401.' },
        { mistake: 'Replaying a used state works.', fix: 'The nonce row is read but not deleted, or deleted after the token exchange. Delete it first with delete ... returning and continue only if a row came back.' },
        { mistake: 'The worker downloads from any URL in the webhook body.', fix: 'Add the host allow-list in store_concept (hosts fal returns, https only) and refuse everything else before fetching.' },
      ] },
    ],
    checklist: [
      { id: 'mrq-sec-webhooks-c1', label: 'Run the forged webhook and callback script', trigger: 'copy:mrq-sec-webhooks-curl' },
      { id: 'mrq-sec-webhooks-c2', label: 'Replay a used OAuth state and see error=state' },
      { id: 'mrq-sec-webhooks-c3', label: 'Run the webhook security prompt and get 6 PASS', trigger: 'copy:mrq-sec-webhooks-prompt' },
    ],
  },
  {
    id: 'mrq-sec-youtube',
    title: 'Make sure Marquee can never damage a creator\'s channel',
    outcome: 'Proof that tokens are unreadable, only tested videos are touched, and every stop, failure or disconnect puts the original thumbnail back.',
    minutes: 30,
    xp: 45,
    blocks: [
      { type: 'callout', tone: 'eli5', title: 'The worst bug this app can have', text: 'Marquee can change what millions of people see on a creator\'s video. The scariest bug is not a crash; it is a wrong thumbnail stuck on a big video, or a stolen token. These checks prove the keys are locked up and the original always comes back.' },
      { type: 'steps', items: [
        'In Supabase > SQL Editor run: select refresh_token_enc from channel_tokens limit 1; The value must be unreadable base64, never a string starting 1//.',
        'In the app, start a test on an unlisted video, run one rotation (debug time), then click Stop test and keep the original. Within 2 minutes YouTube Studio shows the original thumbnail.',
        'Start another test, run one rotation, then in Google Account > Security > Third-party apps remove Marquee. Run the YouTube worker: the channel shows "Reconnect needed", the test pauses, and you get one email.',
        'Reconnect, then disconnect from Channels. The test is cancelled, the original is restored before the token is revoked, and the channel\'s stats are gone.',
        'Search the code: run the prompt below.',
      ] },
      { type: 'prompt', id: 'mrq-sec-youtube-prompt', title: 'Paste into Claude Code', code: `Audit every place that calls a YouTube write endpoint. Report PASS or FAIL for each, then fix any FAIL:
1. thumbnails.set is the only YouTube write call in the codebase (search for googleapis.com/youtube and /upload/youtube). No videos.update, no playlist writes, no comment calls.
2. Every thumbnails.set call takes a video id that belongs to a test row in the same workspace as the channel token used (trace from job to test to video to channel).
3. A rotate job for a day that is not today in Pacific time never sets a thumbnail.
4. Every path that ends a test early (stop, failed, disconnect, workspace delete, subscription paused) restores the original or the chosen variant, and there is a test for each.
5. Decrypted tokens never appear in logs, error messages, job payloads or responses. grep for console.log and log( calls near getAccessToken.
6. The TOKEN_ENC_KEY is only read in supabase/functions/_shared/google.ts.
7. When has_active_access becomes false (trial ended without paying), running tests are paused and originals restored within one scheduler run. If this is not built yet, add it to mrq-scheduler.` },
      { type: 'code', id: 'mrq-sec-youtube-sql', filename: 'check-youtube-safety.sql', lang: 'sql', code: `-- No test should be left changed on YouTube without an original backup.
select t.id, t.status, t.original_backup_path is not null as has_backup,
       (select count(*) from public.test_rotations r where r.test_id = t.id and r.status = 'set') as days_set
from public.tests t
where t.status in ('cancelled', 'failed', 'running', 'collecting')
order by t.created_at desc;` },
      { type: 'mistakes', items: [
        { mistake: 'Stopping a test leaves variant B on YouTube.', fix: 'The stop action marked the test cancelled but no set_thumbnail job ran. Check the jobs table for kind set_thumbnail and its last_error; it needs the youtube worker schedule to be on.' },
        { mistake: 'Removing access in Google does not pause the test.', fix: 'getAccessToken must treat invalid_grant as needs_reauth (not a retryable error) and pause every test on that channel.' },
        { mistake: 'A refresh token is visible in plain text.', fix: 'The callback stored it before encrypting. Rotate: disconnect the channel, fix the code to encrypt before the upsert, reconnect.' },
      ] },
    ],
    checklist: [
      { id: 'mrq-sec-youtube-c1', label: 'Confirm tokens are stored encrypted' },
      { id: 'mrq-sec-youtube-c2', label: 'Stop a test and see the original restored on YouTube' },
      { id: 'mrq-sec-youtube-c3', label: 'Revoke access in Google and see the test pause' },
      { id: 'mrq-sec-youtube-c4', label: 'Run the YouTube write audit prompt', trigger: 'copy:mrq-sec-youtube-prompt' },
    ],
  },
]
