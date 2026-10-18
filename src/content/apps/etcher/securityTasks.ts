// Etcher security tasks: app-specific attacks with exact curl, appended to the Security phase.
import type { Task } from '../../types'
import { code, eli5, mistakes, p, prompt, steps, task, tip } from './helpers'

export const securityTasks: Task[] = [
  task({
    id: 'etc-sec-tenant',
    title: 'Attack 1: read and write another company\'s CRM',
    outcome: 'Proof that a logged-in user of workspace B cannot read, change or download anything in workspace A: rows, recordings or exports.',
    minutes: 35,
    xp: 60,
    blocks: [
      eli5('The attack', 'Etcher keeps every customer in one database. A competitor signs up for a trial, copies their own login token, and asks the database directly for "all people where workspace is Acme". If one policy is wrong, they walk away with Acme\'s whole client list. You try it yourself first.'),
      steps(
        'Create two test users in two browsers: **A** owns workspace "Acme" (with a few people, a deal, and one recorded call), **B** owns workspace "Rival".',
        'As A, in Supabase Table Editor, copy Acme\'s workspace id, one person id and one recording storage_path.',
        'As B, open the browser dev tools > Application > Cookies or Local Storage, find the `sb-...-auth-token` value and copy the `access_token` (a long string starting `eyJ`). That is B_JWT.',
        'Run the curl commands below with your project ref, publishable key, B_JWT and A\'s ids.',
      ),
      code('etc-sec-tenant-curl', 'attack-tenant.sh', 'bash', `
REF=your-project-ref
KEY=sb_publishable_xxx
B_JWT=eyJ...            # user B's access token
A_WS=uuid-of-acme       # workspace A
A_PERSON=uuid-of-a-person-in-acme

# 1. Read A's people. Expect: []
curl "https://$REF.supabase.co/rest/v1/people?select=*&workspace_id=eq.$A_WS" \\
  -H "apikey: $KEY" -H "Authorization: Bearer $B_JWT"

# 2. Change one of A's people. Expect: [] (0 rows updated) or 403
curl -X PATCH "https://$REF.supabase.co/rest/v1/people?id=eq.$A_PERSON" \\
  -H "apikey: $KEY" -H "Authorization: Bearer $B_JWT" \\
  -H "Content-Type: application/json" -H "Prefer: return=representation" \\
  -d '{"email":"stolen@rival.com"}'

# 3. Insert a deal into A's workspace. Expect: 403 "new row violates row-level security policy"
curl -X POST "https://$REF.supabase.co/rest/v1/deals" \\
  -H "apikey: $KEY" -H "Authorization: Bearer $B_JWT" -H "Content-Type: application/json" \\
  -d '{"workspace_id":"'$A_WS'","pipeline_id":"'$A_WS'","stage_id":"'$A_WS'","name":"x","currency":"USD","created_by":"00000000-0000-0000-0000-000000000000"}'

# 4. Join A's workspace by inserting a membership. Expect: 403
curl -X POST "https://$REF.supabase.co/rest/v1/workspace_members" \\
  -H "apikey: $KEY" -H "Authorization: Bearer $B_JWT" -H "Content-Type: application/json" \\
  -d '{"workspace_id":"'$A_WS'","user_id":"B_USER_ID","role":"owner"}'

# 5. Read A's Twilio secrets. Expect: []
curl "https://$REF.supabase.co/rest/v1/workspace_secrets?select=*" \\
  -H "apikey: $KEY" -H "Authorization: Bearer $B_JWT"

# 6. Download A's recording and export. Expect: 400/404 "Object not found"
curl "https://$REF.supabase.co/storage/v1/object/recordings/A_RECORDING_PATH" \\
  -H "apikey: $KEY" -H "Authorization: Bearer $B_JWT" -o /dev/null -w "%{http_code}\\n"
curl -X POST "https://$REF.supabase.co/storage/v1/object/sign/exports/$A_WS/any.csv" \\
  -H "apikey: $KEY" -H "Authorization: Bearer $B_JWT" -H "Content-Type: application/json" -d '{"expiresIn":60}'

# 7. Ask the views for A's numbers. Expect: []
curl "https://$REF.supabase.co/rest/v1/pipeline_stage_totals?select=*&workspace_id=eq.$A_WS" \\
  -H "apikey: $KEY" -H "Authorization: Bearer $B_JWT"

# 8. Call an RPC on A's workspace. Expect: error "Not a member"
curl -X POST "https://$REF.supabase.co/rest/v1/rpc/minutes_status" \\
  -H "apikey: $KEY" -H "Authorization: Bearer $B_JWT" -H "Content-Type: application/json" \\
  -d '{"ws":"'$A_WS'"}'
`),
      p('Every command must come back empty or refused. Then check the database-level picture: every table has RLS on, and no policy uses `true`.'),
      code('etc-sec-tenant-sql', 'check-rls.sql', 'sql', `
select tablename, rowsecurity from pg_tables where schemaname = 'public' order by 1;
-- every row: true

select tablename, policyname, cmd, qual, with_check
from pg_policies
where schemaname = 'public' and (qual = 'true' or with_check = 'true');
-- expect 0 rows

select c.relname as view, c.reloptions
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'v';
-- every view shows {security_invoker=true}
`),
      tip('Ask the advisor too', 'Ask Claude Code: "Run the Supabase security advisor (get_advisors, type security) and list anything about RLS, security definer functions or exposed views." Fix every ERROR before launch.'),
      mistakes([
        { mistake: 'Command 1 returns A\'s people.', fix: 'A select policy is missing the is_workspace_member check, or a view was created without security_invoker. Run the check SQL above and fix the policy it shows.' },
        { mistake: 'Command 6 downloads the file.', fix: 'A storage policy does not read the first folder. Every policy on storage.objects must call path_segment_uuid(name, 1) and a workspace role check.' },
        { mistake: 'Command 8 returns numbers.', fix: 'The RPC is security definer but forgot its own membership check. Every security definer RPC must call is_workspace_member or has_workspace_role first.' },
      ]),
    ],
    checklist: [
      'Set up workspaces A and B in two browsers',
      ['Run all 8 attack commands as user B', 'copy:etc-sec-tenant-curl'],
      ['Run the RLS check SQL and see 0 open policies', 'copy:etc-sec-tenant-sql'],
      'Run the Supabase security advisor and fix any errors',
    ],
  }),

  task({
    id: 'etc-sec-twilio',
    title: 'Attack 2: fake Twilio webhooks and TwiML injection',
    outcome: 'Proof that forged or replayed Twilio callbacks change nothing, a fake AccountSid cannot touch another workspace, and contact names cannot inject TwiML.',
    minutes: 30,
    xp: 55,
    blocks: [
      eli5('The attack', 'Your Twilio webhook URLs are public. Anyone can post "call CA123 completed, 9,000 seconds" to them, or pretend to be Twilio asking "what should this call do?". The X-Twilio-Signature header is Twilio\'s wax seal: only Twilio knows the token that makes it, so a missing or wrong seal means "throw it away".'),
      code('etc-sec-twilio-curl', 'attack-twilio.sh', 'bash', `
REF=your-project-ref
FN="https://$REF.supabase.co/functions/v1"

# 1. No signature. Expect: 403
curl -s -o /dev/null -w "%{http_code}\\n" -X POST "$FN/twilio-status-callback" \\
  -d "AccountSid=AC00000000000000000000000000000000&CallSid=CA00000000000000000000000000000000&CallStatus=completed&CallDuration=9000"

# 2. Made-up signature. Expect: 403
curl -s -o /dev/null -w "%{http_code}\\n" -X POST "$FN/twilio-voice" \\
  -H "X-Twilio-Signature: dGhpcyBpcyBmYWtl" \\
  -d "AccountSid=AC00000000000000000000000000000000&CallSid=CA11111111111111111111111111111111&From=client:u_x&To=%2B19005550100"

# 3. Recording callback pointing at someone else's recording. Expect: 403
curl -s -o /dev/null -w "%{http_code}\\n" -X POST "$FN/twilio-recording-callback" \\
  -d "AccountSid=AC00000000000000000000000000000000&CallSid=CA00000000000000000000000000000000&RecordingSid=RE00000000000000000000000000000000&RecordingStatus=completed"

# 4. Worker mode without the cron secret. Expect: 401
curl -s -o /dev/null -w "%{http_code}\\n" -X POST "$FN/twilio-recording-callback" -H "x-cron-secret: guess"
`),
      steps(
        '**Replay:** make a real 30 second call. In the Twilio Console (switch to the workspace subaccount) > Monitor > Logs > Calls > the call > Request Inspector, find the completed status callback and use the replay option (or copy its exact request with its real signature and send it again with curl). The call row and usage_ledger must not change.',
        '**Cross-workspace signature:** take a real signed request from workspace A, change only `AccountSid` to workspace B\'s subaccount SID and resend. Expect 403: the signature was made with A\'s token, and Etcher checks it with B\'s.',
        '**TwiML injection:** rename a person to `Sam</Parameter><Dial>+19005550100</Dial>` and call your Etcher number from that person\'s phone. Inbound must still ring your browser normally and show the name as plain text.',
      ),
      code('etc-sec-twilio-sql', 'check-replay.sql', 'sql', `
-- One ledger row per call, never two.
select idempotency_key, count(*) from public.usage_ledger
where metric = 'call_minutes' group by 1 having count(*) > 1;
-- expect 0 rows

-- No call rows created by the fake requests above.
select twilio_call_sid from public.calls
where twilio_call_sid in ('CA00000000000000000000000000000000', 'CA11111111111111111111111111111111');
-- expect 0 rows
`),
      prompt('etc-sec-twilio-prompt', 'If anything got through, paste into Claude Code', `
One of my Twilio webhook attacks succeeded: <paste which one and the response>.
Check supabase/functions/_shared/twilio.ts validateTwilio:
1. It must build the URL from SUPABASE_URL + '/functions/v1/<fn>' + the query string, not req.url.
2. It must look up the auth token by the posted AccountSid and fail closed (403) when the account is unknown.
3. It must sort the POST params by key, append key + value, HMAC-SHA1, base64, and compare with timingSafeEqual.
4. It must run before any database read or write in every Twilio function.
Also check every TwiML builder escapes & < > " ' with escapeXml. Add deno tests for each case, run them, redeploy, and rerun my curl commands.
`),
      mistakes([
        { mistake: 'Real Twilio requests also get 403 after you add validation.', fix: 'The URL you sign differs from the one Twilio called (often http vs https, or a missing query string like ?kind=dial). Log the URL you built (not the signature) and compare it with the URL in Twilio\'s Request Inspector.' },
        { mistake: 'Replaying the completed callback adds minutes twice.', fix: 'The meter insert is missing the idempotency key or the unique index. The key must be call:<parent CallSid>, and usage_ledger.idempotency_key must be unique.' },
        { mistake: 'The injected name breaks the call.', fix: 'A TwiML value was concatenated without escaping. Route every dynamic value through escapeXml.' },
      ]),
    ],
    checklist: [
      ['Run the four forged webhook commands', 'copy:etc-sec-twilio-curl'],
      'Replay a real callback and see nothing change',
      'Try the TwiML injection name on an inbound call',
      ['Run the replay check SQL', 'copy:etc-sec-twilio-sql'],
    ],
  }),

  task({
    id: 'etc-sec-tollfraud',
    title: 'Attack 3: run up your phone bill',
    outcome: 'Proof that nobody can call premium or blocked destinations, bypass the minute cap, spoof another workspace\'s caller ID, or get a token for a workspace they are not in.',
    minutes: 30,
    xp: 55,
    blocks: [
      eli5('The attack', 'Every Etcher minute is paid by you. A bad trial user (or a stolen login) could call expensive premium numbers all night, or borrow another customer\'s number to hide. Geo permissions, the minute cap, rate limits and server-side checks stop that. Here you try to get past each one.'),
      code('etc-sec-tollfraud-curl', 'attack-billing.sh', 'bash', `
REF=your-project-ref
B_JWT=eyJ...              # a member of workspace B
A_WS=uuid-of-acme

# 1. Token for a workspace you are not in. Expect: 403
curl -X POST "https://$REF.supabase.co/functions/v1/twilio-token" \\
  -H "Authorization: Bearer $B_JWT" -H "Content-Type: application/json" \\
  -d '{"workspace_id":"'$A_WS'"}'

# 2. Hammer the token endpoint. Expect: 429 after 60 calls in an hour
for i in $(seq 1 65); do
  curl -s -o /dev/null -w "%{http_code} " -X POST "https://$REF.supabase.co/functions/v1/twilio-token" \\
    -H "Authorization: Bearer $B_JWT" -H "Content-Type: application/json" -d '{"workspace_id":"B_WS"}'
done; echo

# 3. Buy a number as a member (not admin). Expect: 403
curl -X POST "https://$REF.supabase.co/functions/v1/buy-number" \\
  -H "Authorization: Bearer $B_JWT" -H "Content-Type: application/json" \\
  -d '{"workspace_id":"B_WS","action":"buy","phone_number":"+14155550100","idempotency_key":"x"}'
`),
      steps(
        '**Premium and blocked destinations:** in the app, call `+19005550100` (US premium) and a number in a country you did not enable (for example `+882...` satellite). The call must fail at once; Twilio logs error 13227 or 21215 (geo permissions) [verify codes].',
        '**Caller ID spoofing:** in the browser console, run the softphone connect with a `fromNumberId` copied from workspace A. The call must use B\'s own number or be refused, never A\'s.',
        '**Minute cap:** insert a fake 1,000 minute line (SQL below) and try to call. The call is refused with the cap message before ringing. Delete the line afterwards.',
        '**Long call:** stay on a call to your own voicemail. Twilio ends it at 2 hours because of `timeLimit="7200"` (check the TwiML in the Request Inspector instead of waiting).',
      ),
      code('etc-sec-tollfraud-sql', 'cap-test.sql', 'sql', `
insert into public.usage_ledger (workspace_id, metric, quantity, idempotency_key)
values ('B_WS', 'call_minutes', 1000, 'security-cap-test');
select public.minutes_status('B_WS');  -- run as B in the app; left must be 0

-- afterwards
delete from public.usage_ledger where idempotency_key = 'security-cap-test';
`),
      tip('Set a Twilio spend alert', 'Twilio Console > Admin > Account billing > **Usage triggers** (or Monitor > Alerts): create a trigger at $50 a day on "Total price" that emails you. It is the last line of defence if everything else fails.'),
      mistakes([
        { mistake: 'A premium number rings.', fix: 'Geo permissions allow it, or the subaccount does not inherit them. Voice > Settings > Geo permissions: untick high-risk prefixes and check the subaccount settings.' },
        { mistake: 'The call goes out with workspace A\'s number.', fix: 'twilio-voice trusted fromNumberId. It must load the number with .eq(\'workspace_id\', callerWorkspace) and fall back to the caller\'s own default.' },
        { mistake: 'Calls still connect at the cap.', fix: 'The cap check runs in the browser only. It must run in twilio-voice, on the server, before the <Dial>.' },
      ]),
    ],
    checklist: [
      ['Run the token and purchase attacks', 'copy:etc-sec-tollfraud-curl'],
      'Try a premium number and a blocked country',
      ['Hit the minute cap with the test SQL', 'copy:etc-sec-tollfraud-sql'],
      'Create a $50 a day Twilio usage alert',
    ],
  }),

  task({
    id: 'etc-sec-roles',
    title: 'Attack 4: promote yourself, steal an invite, poison an export',
    outcome: 'Proof that members cannot make themselves admin or owner, invite links only work for the invited email and only once, and exported CSVs cannot run formulas.',
    minutes: 25,
    xp: 45,
    blocks: [
      eli5('The attack', 'A junior rep wants to be admin so they can export the whole client list. Or someone forwards an invite link to the wrong person. Or a lead\'s name is a spreadsheet formula that runs when the manager opens the export. Each one has a guard; you check each guard holds.'),
      code('etc-sec-roles-curl', 'attack-roles.sh', 'bash', `
REF=your-project-ref
KEY=sb_publishable_xxx
M_JWT=eyJ...       # a MEMBER of workspace A
A_WS=uuid-of-acme
M_ID=member-user-id

# 1. Member promotes themselves. Expect: [] (0 rows) or an error
curl -X PATCH "https://$REF.supabase.co/rest/v1/workspace_members?workspace_id=eq.$A_WS&user_id=eq.$M_ID" \\
  -H "apikey: $KEY" -H "Authorization: Bearer $M_JWT" -H "Content-Type: application/json" \\
  -H "Prefer: return=representation" -d '{"role":"owner"}'

# 2. Member reads the audit log and import jobs. Expect: []
curl "https://$REF.supabase.co/rest/v1/audit_log?select=*&workspace_id=eq.$A_WS" -H "apikey: $KEY" -H "Authorization: Bearer $M_JWT"
curl "https://$REF.supabase.co/rest/v1/import_jobs?select=*" -H "apikey: $KEY" -H "Authorization: Bearer $M_JWT"

# 3. Member starts an export. Expect: 403
curl -X POST "https://$REF.supabase.co/functions/v1/export-leads" \\
  -H "Authorization: Bearer $M_JWT" -H "Content-Type: application/json" \\
  -d '{"workspace_id":"'$A_WS'","entity":"people"}'

# 4. Member reads invitation token hashes. Expect: []
curl "https://$REF.supabase.co/rest/v1/invitations?select=email,token_hash" -H "apikey: $KEY" -H "Authorization: Bearer $M_JWT"
`),
      steps(
        '**Wrong email:** invite `test1@yourdomain.com`, then open the link logged in as `test2@yourdomain.com`. Expect "This invite was sent to t***@yourdomain.com".',
        '**Reuse:** accept the invite as test1, log out, open the link again as anyone. Expect "This invite has already been used".',
        '**Formula injection:** create a person with first name `=HYPERLINK("https://example.com","Click")` and company `+SUM(1,1)`. Export people and open the CSV in Excel or Google Sheets: both cells show as text starting with a single quote, nothing is clickable or calculated.',
        '**Last owner:** as the only owner, try to leave the workspace or change your own role to member. Expect "A workspace needs at least one owner".',
      ),
      code('etc-sec-roles-sql', 'check-roles.sql', 'sql', `
select m.user_id, m.role from public.workspace_members m where m.workspace_id = 'A_WS';
select actor_id, action, entity, created_at from public.audit_log
where entity = 'workspace_members' order by created_at desc limit 5;
`),
      mistakes([
        { mistake: 'Command 1 makes the member an owner.', fix: 'The members_update policy or the workspace_members_guard trigger is missing. Re-run that part of the migration; the guard blocks owner changes by non-owners.' },
        { mistake: 'The invite works for any logged-in email.', fix: 'accept_invitation must compare the invite email with auth.jwt() ->> \'email\'. Check you did not replace it with a version that skips the check.' },
        { mistake: 'Excel runs the formula.', fix: 'The CSV writer must prefix cells starting with =, +, - or @ with a single quote. Add a unit test with those four characters.' },
      ]),
    ],
    checklist: [
      ['Run the four role attacks as a member', 'copy:etc-sec-roles-curl'],
      'Try a forwarded and a reused invite link',
      'Export a formula-named person and open the CSV',
      ['Check roles and the audit log with SQL', 'copy:etc-sec-roles-sql'],
    ],
  }),
]
