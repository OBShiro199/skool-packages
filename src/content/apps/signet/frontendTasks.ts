// Signet app-specific frontend tasks (appended to the Foundations phase).
import type { Task } from '../../types'

export const frontendTasks: Task[] = [
  {
    id: 'sgn-fe-workspace',
    title: 'Build onboarding, the brand kit and the service catalogue',
    outcome: 'A new user creates a workspace, uploads a logo, picks colours and adds the services the AI will price from.',
    minutes: 70,
    xp: 50,
    blocks: [
      { type: 'callout', tone: 'eli5', title: 'Why the catalogue comes first', text: 'Signet is only allowed to price proposals from your own price list. No list, no prices. So the very first thing a new user does is tell Signet what they sell and for how much. That is also what makes the drafts feel like theirs.' },
      { type: 'prompt', id: 'sgn-fe-workspace-prompt', title: 'Paste into Claude Code', code: `Read @PRD.md sections 4, 7, 8 and 10, @DESIGN_SYSTEM.md, and @DESIGN.md sections 6, 7.2 and 7.9.

Build:
1. app/onboarding/page.tsx: the 4-step card from DESIGN.md 7.2. Step 1 calls supabase.rpc('create_workspace', { p_name }). Step 2 uploads the logo to brand-assets/<workspace_id>/logo.<ext> (browser client, RLS applies), suggests 8 swatches from the logo using a small canvas k-means, saves brand_kits. Step 3 inserts services and updates pricing_rules.deposit_pct. Step 4 shows "Connect Stripe" (links to /api/stripe/connect/start, built later) and "Skip for now".
2. lib/workspace.ts: getCurrentWorkspace() on the server: getClaims, then profiles.current_workspace_id, then the workspace and the user's role. Redirect to /onboarding if none.
3. app/app/catalogue/page.tsx: Tabs Services and Pricing rules exactly as DESIGN.md 7.9. Members see read-only fields with the lock note (check the role from getCurrentWorkspace, and rely on RLS as the real guard).
4. app/app/brand/page.tsx: the brand form with a live mini share-page preview at 375px wide using the agency accent from lib/brand.ts.
5. The app shell sidebar from DESIGN.md section 6 with these items in this order: Proposals, Calls, Templates, Analytics, Catalogue, Brand, then the bottom group Documentation, Help, Billing, Settings. Billing hidden for non-owners. Mini usage meter above the bottom group (reads plan_limits and usage_this_month through an RPC call).
Use only design tokens, no raw hex. Then run the app and screenshot onboarding steps 2 and 3 at 390px and 1440px.` },
      { type: 'steps', items: [
        'Open http://localhost:3000/signup and create a new account.',
        'Finish onboarding: name the workspace "Test Studio", upload any PNG logo, pick a colour, add the service "Website build, project, $6,000".',
        'Open Catalogue and add two more services: "SEO retainer, month, $1,500" and "Strategy workshop, day, $1,200".',
        'Open Brand and change the primary colour. The preview on the right updates as you pick.',
      ] },
      { type: 'code', id: 'sgn-fe-workspace-sql', filename: 'check-workspace.sql', lang: 'sql', code: `-- Run in Supabase > SQL Editor. You should see your workspace, you as owner,
-- your brand colour and three services.
select w.name, m.role, b.primary_hex,
       (select count(*) from public.services s where s.workspace_id = w.id) as services
from public.workspaces w
join public.workspace_members m on m.workspace_id = w.id
join public.brand_kits b on b.workspace_id = w.id;` },
      { type: 'mistakes', items: [
        { mistake: 'Onboarding step 1 errors with "new row violates row-level security policy".', fix: 'Claude Code inserted into workspaces directly. Tell it: "Create the workspace with supabase.rpc(\'create_workspace\'), never with an insert. The function adds the owner, brand kit and pricing rules in one go."' },
        { mistake: 'The logo upload fails with a 403.', fix: 'The path must start with the workspace id folder: brand-assets/<workspace_id>/logo.png. Ask Claude Code to log the path it uploads to and compare it with the storage policy.' },
        { mistake: 'Colours look different on the preview and the real share page.', fix: 'Both must read the same brand_kits values through one helper. Ask Claude Code to create lib/brand.ts with brandToCssVars(brand) and use it in both places.' },
      ] },
    ],
    checklist: [
      { id: 'sgn-fe-workspace-c1', label: 'Copy the onboarding and catalogue prompt', trigger: 'copy:sgn-fe-workspace-prompt' },
      { id: 'sgn-fe-workspace-c2', label: 'Finish onboarding with a logo and a service' },
      { id: 'sgn-fe-workspace-c3', label: 'Add two more services in Catalogue' },
      { id: 'sgn-fe-workspace-c4', label: 'Run the check SQL and see your workspace', trigger: 'copy:sgn-fe-workspace-sql' },
    ],
  },
  {
    id: 'sgn-fe-calls',
    title: 'Build upload, the browser recorder and live job progress',
    outcome: 'Users can upload or record a call and watch it move from Uploading to Drafted without refreshing.',
    minutes: 90,
    xp: 60,
    blocks: [
      { type: 'callout', tone: 'eli5', title: 'Why the upload is "resumable"', text: 'A one hour video can be 500 MB. On café Wi-Fi a normal upload fails at 90% and starts again from zero. A resumable upload sends the file in small pieces and remembers which pieces arrived, so a dropped connection only costs you one piece.' },
      { type: 'prompt', id: 'sgn-fe-calls-prompt', title: 'Paste into Claude Code', code: `Read @PRD.md sections 9.1 and 11.1, @DESIGN_SYSTEM.md, and @DESIGN.md sections 7.4, 7.5 and 15.

Build:
1. app/app/proposals/new/page.tsx with the three option cards. "From a call" has Tabs: Upload, Record, Import (Import shows a Studio-plan chip on Solo and is built later).
2. components/calls/UploadDrop.tsx: insert a calls row first (status 'uploading', storage_path '<ws>/<call_id>.<ext>', title, client_name, client_company, auto_draft from the Switch), read duration with a hidden <audio>/<video> element (loadedmetadata) and save duration_sec through supabase.rpc or a server action using the secret key (the guard trigger blocks the browser from setting it, so do it server-side in app/api/calls/[id]/duration/route.ts after checking membership), then upload with tus-js-client to NEXT_PUBLIC_SUPABASE_URL/storage/v1/upload/resumable with headers authorization Bearer <session access_token>, x-upsert false, chunkSize 6 MB, metadata bucketName 'call-audio', objectName, contentType. Show percent and time left. On success call supabase.functions.invoke('sg-start-transcription', { body: { call_id } }).
3. components/calls/Recorder.tsx: MediaRecorder (audio/webm;codecs=opus, fall back to audio/mp4 on Safari), 64 kbps, timer, pause/resume, stop, a 5-bar level meter from an AnalyserNode, IndexedDB chunk backup every 10 s (idb-keyval), warning at the plan's max call length, consent line. On stop, hand the Blob to the same upload code with source 'browser'.
4. components/calls/JobProgress.tsx: 4 steps mapped from calls.status (uploading -> Upload; queued, transcribing -> Transcribe; transcribed, extracting, brief_ready -> Read the call; drafting, drafted -> Draft). Subscribe with Supabase Realtime to the calls row (postgres_changes, filter id=eq.<id>). Failed shows calls.error and a Retry button that calls sg-start-transcription again.
5. app/app/calls/page.tsx (list) and app/app/calls/[id]/page.tsx (transcript left with renamable speakers and search, Brief card right, editable inline, "Draft proposal" button that enqueues the draft through app/api/calls/[id]/draft/route.ts: getClaims, membership, then insert the draft_proposal job with idempotency key 'draft:' + call_id using the secret key client).
All copy from DESIGN.md section 15. Then upload a 2 minute test MP3 and show me the status changes in the UI.` },
      { type: 'steps', items: [
        'Record a 3 minute fake discovery call on your phone\'s voice memo app: you as the agency, a friend as the client with a budget and a deadline.',
        'AirDrop or email it to your laptop. Open http://localhost:3000/app/proposals/new, pick From a call, and drop the file.',
        'Watch the progress bar, then JobProgress. You can refresh the page halfway: it picks up where it was.',
        'Open the Record tab, record 20 seconds, stop, and check it uploads too.',
      ] },
      { type: 'code', id: 'sgn-fe-calls-sql', filename: 'check-calls.sql', lang: 'sql', code: `-- Latest calls and where each one is in the pipeline.
select title, source, status, duration_sec, assemblyai_id is not null as sent_to_assemblyai, error
from public.calls order by created_at desc limit 5;

-- The jobs the worker has been given for those calls.
select kind, status, attempts, last_error, run_after
from public.jobs order by created_at desc limit 10;` },
      { type: 'mistakes', items: [
        { mistake: 'Upload stops at 0% with a 413 or "Payload too large".', fix: 'Supabase Free caps uploads at 50 MB per file. Test with a short MP3, or upgrade to Pro and raise Storage > Settings > Upload file size limit to 1 GB.' },
        { mistake: 'Status stays on "Transcribing" for ever.', fix: 'The AssemblyAI webhook is not reaching Supabase. Check sg-assemblyai-webhook is deployed with --no-verify-jwt and the ASSEMBLYAI_WEBHOOK_SECRET secret matches. Then check Edge Functions > sg-assemblyai-webhook > Logs.' },
        { mistake: 'The recorder makes a 0 byte file on iPhone.', fix: 'Safari does not record webm. Ask Claude Code to pick the mimeType with MediaRecorder.isTypeSupported, trying audio/webm;codecs=opus then audio/mp4.' },
      ] },
    ],
    checklist: [
      { id: 'sgn-fe-calls-c1', label: 'Copy the upload and recorder prompt', trigger: 'copy:sgn-fe-calls-prompt' },
      { id: 'sgn-fe-calls-c2', label: 'Record a 3 minute fake discovery call on your phone' },
      { id: 'sgn-fe-calls-c3', label: 'Upload it and watch JobProgress reach Brief ready' },
      { id: 'sgn-fe-calls-c4', label: 'Run the check SQL', trigger: 'copy:sgn-fe-calls-sql' },
    ],
  },
  {
    id: 'sgn-fe-editor',
    title: 'Build the block editor, pricing options and AI rewrite',
    outcome: 'Users edit any section, reorder sections, adjust the three price options and rewrite a section with one click.',
    minutes: 110,
    xp: 70,
    blocks: [
      { type: 'callout', tone: 'eli5', title: 'Blocks, not HTML', text: 'Each section is saved as a list of simple blocks: a heading, a paragraph, some bullets. Never as raw HTML. That way nothing a client or the AI types can sneak a script onto the public page, and the same blocks render nicely on a phone, a laptop and in print.' },
      { type: 'prompt', id: 'sgn-fe-editor-prompt', title: 'Paste into Claude Code', code: `Read @PRD.md sections 8 (block format), 9.2, 13.4 and 14.4, @DESIGN_SYSTEM.md, and @DESIGN.md sections 7.6, 7.7 and 14.

Build app/app/proposals/[id]/page.tsx:
1. Three columns: section rail (dnd-kit reorder, pricing pinned after timeline with a lock icon), canvas (max 760px, brand colours via lib/brand.ts), right panel (status, Preview, Send, client fields, follow-up Switch, rewrite meter, last 5 activity events).
2. components/editor/BlockEditor.tsx: renders and edits blocks of type heading, paragraph, bullets, quote, table, image. "/" opens a shadcn Command menu to insert a block. Use plain contentEditable per block or TipTap restricted to these node types and serialise back to the JSON block format (never store HTML). Autosave each section 800 ms after typing stops with an update to proposal_sections; show "Saved".
3. components/editor/PricingEditor.tsx: three PricingOptionCards. Line items: service Select from the catalogue, quantity, unit price read-only from the catalogue (owners/admins get an override link), line total. Totals computed in integer cents. Recommended radio.
4. components/editor/RewritePopover.tsx: 6 tone chips + text field. Calls supabase.functions.invoke('sg-rewrite-section'). Shows a shimmer, then an inline word diff (diff-match-patch) with Keep and Discard and the model's note. Keep saves the blocks. Handle 402 (limit message with Upgrade link) and 429 (toast).
5. Unsent changes banner when has_unsent_changes is true. Signed banner and read-only mode when status is signed or paid, with the HashBadge and "View signature" (signed URL from a server route) and "Verify".
6. "Save as template" in the title menu: insert templates with the sections (kind, title, body) and pricing options without client details.
Then open a drafted proposal, rewrite the exec summary with "Shorter", keep it, and show me the updated row.` },
      { type: 'steps', items: [
        'Open the proposal that was drafted from your test call.',
        'Read the exec summary. Click Rewrite, pick "Shorter", and keep the result.',
        'Drag "Scope" above "Solution". Refresh: the order stays.',
        'Change the quantity on a "Better" line item and check the total updates.',
        'Save it as a template called "Website project".',
      ] },
      { type: 'code', id: 'sgn-fe-editor-sql', filename: 'check-editor.sql', lang: 'sql', code: `-- Sections in order, and the three options with totals.
select position, kind, title, jsonb_array_length(body) as blocks
from public.proposal_sections where proposal_id = '<proposal id>' order by position;

select tier, name, total_cents, recommended
from public.pricing_options where proposal_id = '<proposal id>' order by total_cents;

-- One rewrite metered:
select kind, quantity, cost_usd_micros from public.usage_ledger
where kind = 'rewrites' order by created_at desc limit 1;` },
      { type: 'mistakes', items: [
        { mistake: 'Typing in the editor lags or the cursor jumps to the start.', fix: 'The block is re-rendering from state on every keystroke. Ask Claude Code to keep each block uncontrolled while focused and only sync to state on blur or on the debounced save.' },
        { mistake: 'Saving a section fails with "signed proposals cannot be changed".', fix: 'That is the database protecting a signed proposal. The editor must switch to read-only when status is signed or paid. Ask Claude Code to check proposal.status before enabling editing.' },
        { mistake: 'Totals are off by a few cents.', fix: 'Money is being stored as decimals. Ask Claude Code to keep every amount in integer cents and only format with Intl.NumberFormat when displaying.' },
      ] },
    ],
    checklist: [
      { id: 'sgn-fe-editor-c1', label: 'Copy the editor prompt', trigger: 'copy:sgn-fe-editor-prompt' },
      { id: 'sgn-fe-editor-c2', label: 'Rewrite the exec summary and keep it' },
      { id: 'sgn-fe-editor-c3', label: 'Reorder two sections and refresh' },
      { id: 'sgn-fe-editor-c4', label: 'Save the proposal as a template' },
      { id: 'sgn-fe-editor-c5', label: 'Run the check SQL', trigger: 'copy:sgn-fe-editor-sql' },
    ],
  },
  {
    id: 'sgn-fe-share',
    title: 'Build Send, the public share page, signing and the verify page',
    outcome: 'A client opens an unguessable link on their phone, reads the proposal, signs it and pays the deposit.',
    minutes: 120,
    xp: 75,
    blocks: [
      { type: 'callout', tone: 'eli5', title: 'Why the link is a long random string', text: 'Clients never log in, so the link itself is the key. A 43 character random token has more possible values than there are atoms in a mountain, so nobody can guess one. We only keep a fingerprint (hash) of it in the database, so even a leaked database does not hand out working links.' },
      { type: 'prompt', id: 'sgn-fe-share-prompt', title: 'Paste into Claude Code', code: `Read @PRD.md sections 6 (flow), 12 and 13.5 to 13.7, @DESIGN_SYSTEM.md, and @DESIGN.md sections 7.7 and 8.

Build:
1. app/api/proposals/[id]/send/route.ts (server, secret key client after getClaims + membership + has_active_access): build the snapshot { title, client, agency, sections (kind, title, body in position order), options (tier, name, summary, line_items, total_cents, recommended), terms, currency, valid_until }, content_hash = sha256 of canonicalJson(snapshot) (same canonicalJson as supabase/functions/_shared/canonical.ts: copy it into lib/canonical.ts and add a test that both produce the same hash for the same object). Insert proposal_versions (version_no + 1). Create a token (32 random bytes, base64url), insert share_links with token_hash. Set status 'sent' if draft, first_sent_at if null, has_unsent_changes false. If "Email it for me", send proposal_sent via Resend from "<sender_name> via Signet" with reply-to the user. Return { url: APP_URL + '/p/' + token }.
   For "Send update" on an already sent proposal: same, and also update the existing active share links to the new version_id.
2. The Send dialog from DESIGN.md 7.7, with Copy link, expiry Select and Revoke (update share_links.revoked_at).
3. app/p/[token]/page.tsx: server component that fetches sg-public-proposal?t=token (no Supabase key in the browser at all for this page). Render cover, sticky section chips, sections, pricing cards with "Choose this option", sign block. Paused and not-found states. Set robots noindex.
4. components/share/ViewTracker.tsx: on load POST event 'open' with a session_id from sessionStorage; IntersectionObserver per section sends 'section' beacons every 15 s of visible time (navigator.sendBeacon on pagehide); 'heartbeat' every 30 s.
5. components/share/SignBlock.tsx: name, email, title, typed signature in a script font, SignaturePad (pointer events, 2x PNG export), agree checkbox, "I cannot draw a signature" fallback. POST to sg-sign-proposal with content_hash from the GET. On 409 changed, reload. If checkout_url comes back, redirect to it.
6. app/p/[token]/signed/page.tsx: "Signed" confirmation with HashBadge. With ?paid=1, poll the GET every 3 s for up to 60 s until deposit.paid is true; until then show "Confirming your payment with Stripe."
7. app/verify/[token]/page.tsx: calls sg-public-proposal?v=token and shows "Unchanged since signing" or the mismatch message.
8. The editor's Preview button sets a pv_owner=1 cookie on the share page origin before opening it, so your own views are not counted.
Test on a real phone at 375px.` },
      { type: 'steps', items: [
        'In the editor, click Send, choose Email it for me, and send to a second email address you own.',
        'Open that email on your phone and tap View proposal.',
        'Scroll to Pricing and wait 30 seconds, then pick Better.',
        'Type your name, draw a signature, tick the box and tap Sign proposal.',
        'Check both inboxes: the "Signed" email to you and the signed copy to the client show the same fingerprint.',
        'Open the verify link from the client email: it says Unchanged since signing.',
      ] },
      { type: 'code', id: 'sgn-fe-share-sql', filename: 'check-share.sql', lang: 'sql', code: `-- The frozen version and the link (only the hash of the token is stored).
select v.version_no, left(v.content_hash, 12) as hash, l.token_hash <> '' as hashed_token, l.expires_at
from public.proposal_versions v join public.share_links l on l.version_id = v.id
order by v.created_at desc limit 3;

-- The views and time per section the phone reported.
select section_kind, sum(seconds) as seconds
from public.section_view_events group by 1 order by 2 desc;

-- The signature evidence. The two hashes must match.
select s.signer_name, s.ip, s.signed_at, s.content_hash = v.content_hash as hash_matches
from public.signatures s join public.proposal_versions v on v.id = s.version_id;` },
      { type: 'mistakes', items: [
        { mistake: 'Signing always fails with 409 "This proposal was updated".', fix: 'The page is sending a different hash than the one stored. The Next.js send route and the edge function must use the exact same canonicalJson. Ask Claude Code to run the shared test that hashes the same object in both and fix whichever differs (usually key sorting inside nested arrays of objects).' },
        { mistake: 'Your own views show up as client views.', fix: 'The pv_owner cookie is not set on the share page. Ask Claude Code to open Preview through /p/[token]?preview=1, which sets the cookie server-side before rendering.' },
        { mistake: 'Section times are always 0 on iPhone.', fix: 'Safari drops fetch calls when the tab hides. Use navigator.sendBeacon for the last beacon on pagehide, with a JSON Blob body.' },
      ] },
    ],
    checklist: [
      { id: 'sgn-fe-share-c1', label: 'Copy the share page prompt', trigger: 'copy:sgn-fe-share-prompt' },
      { id: 'sgn-fe-share-c2', label: 'Send a proposal to your second email' },
      { id: 'sgn-fe-share-c3', label: 'Open it, read Pricing and sign on your phone' },
      { id: 'sgn-fe-share-c4', label: 'Open the verify link and see Unchanged since signing' },
      { id: 'sgn-fe-share-c5', label: 'Run the check SQL and see hash_matches true', trigger: 'copy:sgn-fe-share-sql' },
    ],
  },
  {
    id: 'sgn-fe-analytics-team',
    title: 'Build activity, analytics, team invites and billing meters',
    outcome: 'Owners see win rate, deal size and time to sign, invite their team within the seat limit, and see usage before they hit a cap.',
    minutes: 80,
    xp: 55,
    blocks: [
      { type: 'prompt', id: 'sgn-fe-analytics-prompt', title: 'Paste into Claude Code', code: `Read @PRD.md sections 10, 15 and 17, @DESIGN_SYSTEM.md, and @DESIGN.md sections 7.8, 7.10, 7.11 and 7.12.

Build:
1. app/app/proposals/[id]/activity/page.tsx: timeline (sent, opened with device, section time, follow-ups from email_log, signed, paid), section heatmap bars and option interest bars from section_view_events.
2. app/app/analytics/page.tsx: stat tiles and charts from the proposal_stats view (security_invoker, so RLS applies). Win rate excludes proposals sent in the last 7 days that are still open. Median time to sign and to first view. Period Select and member Select (Studio and Agency only, from plan_limits). Recharts with token colours and a "View as table" toggle.
3. Settings > Team: members table (owner can change roles between admin and member, owner/admin can remove, anyone can leave), invite form calling supabase.rpc('create_invite', { p_ws, p_email, p_role }) from a server action that then emails the token link APP_URL/invite/<token> with Resend, pending invites with Revoke, seat counter "2 of 3 seats". Map 'seat_limit_reached' to the DESIGN.md microcopy.
4. app/invite/[token]/page.tsx: if logged out, signup/login with the email locked; then supabase.rpc('accept_invite', { p_token }) and redirect to /app/proposals. Map invite_invalid and invite_wrong_email to friendly messages.
5. app/app/billing/page.tsx (owner only): plan card, four UsageMeters (drafts, call_minutes, rewrites from usage_this_month; seats from members count) with the reset date, plan cards with the Monthly/Annual toggle wired to the six STRIPE_PRICE_* env vars, Manage billing button (Stripe portal, shared step).
6. Settings > Notifications: Switches bound to notification_prefs.
Then invite a second email as member and show me what that member can and cannot do.` },
      { type: 'steps', items: [
        'Open Analytics. With one signed proposal you should see a win rate of 100% (1 of 1).',
        'Go to Settings > Team and invite your second email as a member.',
        'Open the invite email in a private window, accept, and try to open Billing and to edit a Catalogue price. Both must be blocked.',
        'Back as the owner, open Billing and check the meters show your test usage.',
      ] },
      { type: 'code', id: 'sgn-fe-analytics-sql', filename: 'check-team.sql', lang: 'sql', code: `-- Members and roles.
select u.email, m.role from public.workspace_members m join auth.users u on u.id = m.user_id;

-- This month's usage per kind for your workspace.
select kind, sum(quantity) as used, round(sum(cost_usd_micros) / 1e6, 2) as cost_usd
from public.usage_ledger
where created_at >= date_trunc('month', now())
group by kind;` },
      { type: 'mistakes', items: [
        { mistake: 'Accepting an invite says "invite_wrong_email".', fix: 'You accepted while logged in as a different account. Log out, open the invite link again and sign up with the exact invited email.' },
        { mistake: 'Analytics shows other workspaces\' numbers in development.', fix: 'The page queried with the secret key. Ask Claude Code to read proposal_stats with the logged-in user\'s client only, so RLS scopes it.' },
      ] },
    ],
    checklist: [
      { id: 'sgn-fe-analytics-c1', label: 'Copy the analytics and team prompt', trigger: 'copy:sgn-fe-analytics-prompt' },
      { id: 'sgn-fe-analytics-c2', label: 'Invite and accept a second user as member' },
      { id: 'sgn-fe-analytics-c3', label: 'Confirm the member cannot open Billing or change prices' },
      { id: 'sgn-fe-analytics-c4', label: 'Run the team and usage SQL', trigger: 'copy:sgn-fe-analytics-sql' },
    ],
  },
]
