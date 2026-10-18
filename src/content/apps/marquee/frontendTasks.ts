// Marquee app-specific frontend tasks (appended to the Foundations phase).
import type { Task } from '../../types'

export const frontendTasks: Task[] = [
  {
    id: 'mrq-fe-faces',
    title: 'Build onboarding, the face library and the brand kit',
    outcome: 'A new user names a workspace, uploads face photos, picks colours and fonts, and sees the sidebar with every page.',
    minutes: 80,
    xp: 55,
    blocks: [
      { type: 'callout', tone: 'eli5', title: 'Why faces come first', text: 'Every concept Marquee makes has the creator\'s real face in it. No faces, no thumbnails. So the first thing a new user does is upload a few photos. The app cuts each one out (like scissors round a photo) and labels the expression, so a "shocked" idea gets a shocked face.' },
      { type: 'prompt', id: 'mrq-fe-faces-prompt', title: 'Paste into Claude Code', code: `Read @PRD.md sections 4, 7, 10 and 16, @DESIGN_SYSTEM.md, and @DESIGN.md sections 2, 3, 4, 6, 7.9 and 7.10.

Build:
1. The app shell sidebar from DESIGN.md section 4.1 with these items in this order: Projects, Tests, Channels, Faces, Brand kit, then the bottom group Documentation, Help, Billing, Settings. Billing hidden for non-owners. The credits meter above the bottom group reads supabase.rpc('workspace_usage', { ws }) and has a fixed 44px height.
2. lib/workspace.ts: getCurrentWorkspace() on the server: getClaims, then profiles.current_workspace_id, then the workspace and the user's role. Redirect to /onboarding if none.
3. app/onboarding/page.tsx: the 4-step card from DESIGN.md section 6 (one card, height morphs, width fixed). Step 1 calls supabase.rpc('create_workspace', { p_name }). Step 2 inserts a people row, then for each dropped file: convert HEIC to JPEG in the browser, insert face_photos (status 'uploaded', original_path '<ws>/<person>/<photo_id>.<ext>'), upload to bucket faces at that path, then supabase.functions.invoke('mrq-face-ingest', { body: { photo_id } }). Subscribe to face_photos changes with Realtime so tiles flip to the cut-out when ready. Step 3 saves brand_kits.colours and default_font. Step 4 has "Connect YouTube" (calls mrq-youtube-connect/start and redirects to the returned url) and "Skip".
4. app/app/faces/page.tsx exactly as DESIGN.md 7.9: people list, expression filter chips, tiles on a checkerboard with signed URLs (1 hour), change expression (update face_photos.expression, the guard trigger allows only that column), delete (row + both files), cut-out meter from workspace_usage.
5. app/app/brand/page.tsx as DESIGN.md 7.10: colours, fonts (upload to brand-fonts/<ws>/<font_id>.<ext>, insert brand_fonts with the licence checkbox), live font sample loaded with new FontFace(family, 'url(<signed url>)').
6. lib/fonts.ts: loadWorkspaceFonts(ws) that loads every brand font with FontFace and document.fonts.add, plus the built-in Google fonts from PRD 10.2 through next/font/google. The editor will use this.
Use only design tokens, no raw hex. Then run the app and screenshot onboarding step 2 at 390px and 1440px.` },
      { type: 'steps', items: [
        'Open http://localhost:3000/signup and create a new account.',
        'Name the workspace "Test Channel". On step 2, tick the consent box and drop 5 photos of your face with different expressions.',
        'Wait for each tile to show the cut-out on the checkerboard with an expression pill (this needs the fal.ai and Claude keys and the AI worker from the Backend phase; until then tiles stay on "Cutting out", which is correct).',
        'On step 3 add two colours and pick Anton. Skip step 4 for now.',
        'Open Faces in the sidebar, change one expression tag, and delete one photo.',
        'Open Brand kit and upload any WOFF2 font you hold a licence for. The sample text switches to it.',
      ] },
      { type: 'code', id: 'mrq-fe-faces-sql', filename: 'check-faces.sql', lang: 'sql', code: `-- Run in Supabase > SQL Editor. You should see your workspace, one person,
-- your photos with their status and tag, and your brand colours.
select w.name, p.name as person, f.status, f.expression, b.colours
from public.workspaces w
join public.people p on p.workspace_id = w.id
join public.face_photos f on f.person_id = p.id
join public.brand_kits b on b.workspace_id = w.id
order by f.created_at desc;` },
      { type: 'mistakes', items: [
        { mistake: 'The face_photos insert fails with "wrong_folder".', fix: 'The original_path must be exactly <workspace_id>/<person_id>/<photo_id>.<ext>. Ask Claude Code to log the path before inserting and compare it with the guard trigger in the migration.' },
        { mistake: 'Upload to the faces bucket returns 403.', fix: 'Storage policies check the first folder is a workspace you belong to. The path must start with the workspace id, not the user id.' },
        { mistake: 'Uploaded fonts do not show in the sample.', fix: 'FontFace needs a URL the browser can fetch. Use a signed URL from supabase.storage.from(\'brand-fonts\').createSignedUrl(path, 3600) and await font.load() before document.fonts.add(font).' },
      ] },
    ],
    checklist: [
      { id: 'mrq-fe-faces-c1', label: 'Copy the onboarding and face library prompt', trigger: 'copy:mrq-fe-faces-prompt' },
      { id: 'mrq-fe-faces-c2', label: 'Finish onboarding with 5 face photos and 2 colours' },
      { id: 'mrq-fe-faces-c3', label: 'Re-tag and delete a photo in Faces' },
      { id: 'mrq-fe-faces-c4', label: 'Run the check SQL and see your photos', trigger: 'copy:mrq-fe-faces-sql' },
    ],
  },
  {
    id: 'mrq-fe-gallery',
    title: 'Build projects and the live concept gallery',
    outcome: 'Users type a title, click Generate and watch six finished-looking concepts fill in with their face and headline.',
    minutes: 75,
    xp: 55,
    blocks: [
      { type: 'callout', tone: 'eli5', title: 'Why the cards are there before the pictures', text: 'If the six cards appeared one by one, the page would jump each time a picture arrived and the button you were about to click would move. So Marquee draws six empty frames straight away and fills each one in place. Nothing moves under your mouse.' },
      { type: 'prompt', id: 'mrq-fe-gallery-prompt', title: 'Paste into Claude Code', code: `Read @PRD.md sections 9.2, 11.1, 13.2 and 16, and @DESIGN.md sections 3, 7.1, 7.2, 7.3 and 11.

Build:
1. components/ThumbFrame.tsx exactly as DESIGN.md section 3 (aspect-ratio set before load, loading pattern, selected, live and failed states, xs/sm/md/lg sizes).
2. lib/editor/compose.ts: conceptToDoc(concept, facePhoto, brandKit) returns a designs.doc (PRD 11.1) from a concept's layout, headline, subline, expression and accent: face cut-out on the side the layout says, scaled to 85% of the frame height, headline with the "big-stroke" preset at a size that fits maxWidth (measure with canvas measureText after fonts load). Pick the face photo with the concept's expression (most recent first). Write 6 unit tests for the 4 layouts.
3. components/ConceptPreview.tsx: renders a doc with react-konva at 320x180 (read-only), using signed URLs for the background and the cut-out. The same render code the editor uses, so preview and editor always match.
4. app/app/projects/page.tsx (table and empty state, DESIGN.md 7.1) and app/app/projects/new/page.tsx (form, DESIGN.md 7.2). The Generate button reads workspace_usage, shows "Generate 6 concepts (6 credits)" and the credits line, is disabled under 6 credits, inserts the project, then supabase.functions.invoke('mrq-generate', { body: { project_id } }) and routes to the gallery.
5. app/app/projects/[id]/page.tsx: the gallery from DESIGN.md 7.3. Load the latest generation and its concepts; subscribe to Realtime changes on concepts and generations for this project; the progress line maps statuses to "Writing ideas", "Painting N of 6", "6 concepts ready". Six cards are rendered from the first paint. "Edit" creates a designs row from conceptToDoc (insert, created_by = user) and opens the editor route. "Regenerate (1 credit)" calls mrq-generate with regenerate_concept_id.
6. Errors from the function show the message from the error body in a toast; 402 shows the upgrade link.
Use only design tokens. Screenshot the gallery while it is filling and when finished.` },
      { type: 'steps', items: [
        'Click Projects, then New project. Title: "I tried every AI video editor". Topic: "Testing 8 AI editors on the same 10 minute vlog, which one saves the most time."',
        'Pick the style chip "Bold and bright" and click Generate 6 concepts (6 credits).',
        'Watch the progress line change from Writing ideas to Painting 1 of 6 and the cards fill in (needs the Backend phase; until then cards stay on Waiting).',
        'Click Regenerate on one card. The credits line drops by 1.',
        'Click Edit on your favourite. You land on the editor route (built in the next task).',
      ] },
      { type: 'code', id: 'mrq-fe-gallery-sql', filename: 'check-gallery.sql', lang: 'sql', code: `-- One generation with 6 or 7 concepts, and the credits spent this month.
select g.status, c.idx, c.angle, c.headline, c.status as concept_status
from public.generations g
join public.concepts c on c.generation_id = g.id
order by g.created_at desc, c.idx
limit 10;

select kind, sum(quantity) as used_this_month
from public.usage_ledger
where created_at >= date_trunc('month', now())
group by kind;` },
      { type: 'mistakes', items: [
        { mistake: 'The headline text renders in a fallback font in previews.', fix: 'Konva draws before the font has loaded. Ask Claude Code to await document.fonts.load(\'180px Anton\') (and each brand font) before the first draw, then call layer.batchDraw().' },
        { mistake: 'Cards stay on "Waiting" for ever.', fix: 'The AI worker is not running yet. Check the pg_cron schedule exists (Backend phase) and run the worker once by hand with the curl from its task.' },
        { mistake: 'The gallery re-animates every time a concept updates.', fix: 'Rows rise once per session (DESIGN_SYSTEM.md). Ask Claude Code to keep a sessionStorage flag per project and skip the rise animation after the first render.' },
      ] },
    ],
    checklist: [
      { id: 'mrq-fe-gallery-c1', label: 'Copy the gallery prompt', trigger: 'copy:mrq-fe-gallery-prompt' },
      { id: 'mrq-fe-gallery-c2', label: 'Create a project and click Generate' },
      { id: 'mrq-fe-gallery-c3', label: 'Regenerate one concept' },
      { id: 'mrq-fe-gallery-c4', label: 'Run the check SQL and see the concepts', trigger: 'copy:mrq-fe-gallery-sql' },
    ],
  },
  {
    id: 'mrq-fe-editor',
    title: 'Build the canvas editor and the 2 MB export',
    outcome: 'Users move and scale layers, swap expressions, apply text presets and export a 1280x720 JPEG that is always under 2 MB.',
    minutes: 120,
    xp: 75,
    blocks: [
      { type: 'callout', tone: 'eli5', title: 'What a canvas editor is', text: 'Think of a stack of see-through sheets. The bottom sheet is the background picture, then a sheet with your face, then one with the words. You can slide each sheet around without touching the others. The editor saves the position of every sheet as a list, so the design can be rebuilt at any size later.' },
      { type: 'prompt', id: 'mrq-fe-editor-prompt', title: 'Paste into Claude Code', code: `Read @PRD.md section 11 in full, and @DESIGN.md sections 7.4, 10 and 14.

Build app/app/projects/[id]/edit/[designId]/page.tsx with react-konva (client component, dynamic import with ssr: false):
1. lib/editor/schema.ts: zod schema for designs.doc exactly as PRD 11.1 (layer types face, text, shape, image; max 20 layers; text max 60 characters). Validate on load and before every save.
2. Layout from DESIGN.md 7.4: toolbar, layers panel, stage in the canvas well, properties panel, mobile preview (246x138, live), face strip. Under 1100px show the "needs a wider screen" message.
3. Stage maths in 1280x720 units, scaled to fit. Transformer with corner handles keeping aspect ratio, rotation, snap guides to centre lines and the 40px safe margin. Safe-zone overlay toggle with the duration badge box.
4. History: an undo/redo stack of docs (max 100). Keyboard shortcuts from PRD 11.2. Autosave 3 seconds after the last change: update designs.doc and name (RLS applies), status slot "Saving" / "Saved" with fixed width.
5. Text presets from PRD 11.3 as functions that return text layer props. Brand colours as fill swatches. Fonts from lib/fonts.ts.
6. Face strip: the person's ready cut-outs with expression chips; clicking swaps photoId on the selected face layer and keeps x, y and scale.
7. Export (lib/editor/export.ts): stage.toBlob at pixelRatio = 1280 / stage width, mimeType image/jpeg, quality 0.92, stepping down 0.06 until the blob is under 1,950,000 bytes (floor 0.6); if still too big show the "too detailed" dialog. Upload to bucket exports at <ws>/<designId>/<version + 1>.jpg, then supabase.rpc('mark_design_exported', { p_design, p_path }). Toast "Exported, 412 KB" with the real size. Also a Download button that saves the same JPEG.
8. Hidden screen-reader layer list (DESIGN.md 14).
Then test: export a design with a busy background and show me the file size and dimensions you measured.` },
      { type: 'steps', items: [
        'Open a concept in the editor. Drag the face to the other side, scale it up with a corner handle.',
        'Click the headline, change it to "I QUIT", apply the "highlight-bar" preset, and pick a brand colour.',
        'Click a "shocked" cut-out in the face strip. The face swaps and stays where it was.',
        'Press Cmd + Z (Ctrl + Z on Windows) three times, then Shift + Cmd + Z once. Watch the toolbar say Saving, then Saved.',
        'Turn on "Show YouTube overlays" and move the headline out of the bottom-right badge area.',
        'Click Export 1280x720. A toast shows the size in KB.',
      ] },
      { type: 'code', id: 'mrq-fe-editor-sql', filename: 'check-export.sql', lang: 'sql', code: `-- Your export: version 1, a path under exports, and under 2,000,000 bytes.
select d.name, d.version, d.export_path, d.export_bytes,
       d.export_bytes < 2000000 as under_2mb,
       jsonb_array_length(d.doc -> 'layers') as layers
from public.designs d
order by d.updated_at desc
limit 3;` },
      { type: 'mistakes', items: [
        { mistake: 'The export comes out at 640x360 or another size.', fix: 'pixelRatio must be 1280 divided by the stage\'s displayed width. Ask Claude Code to log the blob\'s width and height (load it into an Image) after every export and fail loudly if it is not 1280x720.' },
        { mistake: 'The export is blank or missing the face, with a "tainted canvas" error in the console.', fix: 'Images from signed URLs must load with crossOrigin = \'anonymous\'. Supabase Storage sends CORS headers for signed URLs, so set it on every Konva image before load.' },
        { mistake: 'mark_design_exported says "file_missing".', fix: 'The upload and the rpc raced, or the path differs. Await the upload, then call the rpc with exactly the same path string you uploaded to.' },
      ] },
    ],
    checklist: [
      { id: 'mrq-fe-editor-c1', label: 'Copy the editor prompt', trigger: 'copy:mrq-fe-editor-prompt' },
      { id: 'mrq-fe-editor-c2', label: 'Move, scale and swap the face, then change the headline' },
      { id: 'mrq-fe-editor-c3', label: 'Undo and redo, and see "Saved"' },
      { id: 'mrq-fe-editor-c4', label: 'Export and confirm the file is under 2 MB', trigger: 'copy:mrq-fe-editor-sql' },
    ],
  },
  {
    id: 'mrq-fe-tests',
    title: 'Build the channels pages and the A/B test screens',
    outcome: 'Users connect a channel, see their videos, start a test in one morphing dialog and follow it day by day with plain-English results.',
    minutes: 100,
    xp: 65,
    blocks: [
      { type: 'callout', tone: 'eli5', title: 'Why one thumbnail a day', text: 'YouTube lets an app change a video\'s thumbnail, but not show two thumbnails to different people at the same time. So Marquee takes turns: A on Monday, B on Tuesday, B on Wednesday, A on Thursday, and so on. The mixed-up order means one busy weekend cannot make one thumbnail look better than it is.' },
      { type: 'prompt', id: 'mrq-fe-tests-prompt', title: 'Paste into Claude Code', code: `Read @PRD.md sections 9.3, 12 and 13.6, and @DESIGN.md sections 2.1, 7.5 to 7.8, 8, 10 and 12.

Build:
1. app/app/channels/page.tsx and app/app/channels/[id]/page.tsx as DESIGN.md 7.8. Connect calls supabase.functions.invoke('mrq-youtube-connect/start', { body: { workspace_id } }) and sets window.location to the url. Show ?connected=1 as a toast "Channel connected" and ?error=<code> as the matching message (denied, no_channel, limit, state, no_refresh, scopes). Disconnect uses the confirm dialog and calls mrq-youtube-connect/disconnect.
2. components/tests/ScheduleStrip.tsx and components/tests/ConfidenceMeter.tsx exactly as DESIGN.md 10.1 and 10.2, with variant hues from DESIGN.md 2.1 (tokens only).
3. components/tests/StartTestDialog.tsx: the 3-step dialog from DESIGN.md 7.6 that morphs height and keeps its width. Step 2 lists exported designs only (others show "Export first" and link to the editor). Step 3 previews the schedule from the same pattern function the server uses (put it in lib/tests/schedule.ts and unit test it: 2 variants 8 days = A B B A B A A B, 3 variants 9 days = A B C B C A C A B). Submit calls mrq-test-control { action: 'start', ... } and maps error codes to DESIGN.md microcopy (too_new shows "Test anyway" which resubmits with force_young).
4. app/app/tests/page.tsx: filter chips and the 64px table from DESIGN.md 7.5.
5. app/app/tests/[id]/page.tsx: hero row, decision panel for each status, schedule strip, numbers table, the daily CTR chart with Recharts (one series per variant, dots coloured by the variant live that day, hollow dots where data is missing), method note, Stop test dialog with "Keep which thumbnail?". Subscribe to Realtime on tests and test_rotations for this test.
6. Never print "wins" before status is decided. Running text comes from tests.decision or the variants' p_best: "B is ahead, 81% sure" / "Too early to call".
Screenshot a running test and a decided test (insert fake numbers with the SQL I will give you in the Backend end-to-end task if you have none yet).` },
      { type: 'steps', items: [
        'Open Channels and click Connect a channel. Finish Google\'s screens (needs the Google Cloud task from the Backend phase). You come back with a "Channel connected" toast.',
        'Open the channel. Your latest videos are listed with their current thumbnails.',
        'Click Start a test on a video older than 3 days. Pick your exported design plus "Include the current thumbnail as a control".',
        'On step 3 keep 8 days and Apply the winner automatically. Check the schedule preview reads A B B A B A A B, then click Start test.',
        'Open the test. The status pill reads Starts tonight and the strip shows 8 days.',
      ] },
      { type: 'code', id: 'mrq-fe-tests-sql', filename: 'check-test.sql', lang: 'sql', code: `-- The test, its variants and the 8 day schedule.
select t.status, t.start_day, t.days, v.label, v.is_original, r.day, r.status as rotation
from public.tests t
join public.test_variants v on v.test_id = t.id
join public.test_rotations r on r.variant_id = v.id
order by t.created_at desc, r.day
limit 12;` },
      { type: 'mistakes', items: [
        { mistake: 'Google shows "Error 400: redirect_uri_mismatch".', fix: 'The redirect URI in Google Cloud must be exactly https://<ref>.supabase.co/functions/v1/mrq-youtube-connect/callback with no trailing slash. Copy it from the function code and paste it into the OAuth client again.' },
        { mistake: 'The dialog jumps sideways between steps.', fix: 'Only height may change. Ask Claude Code to fix the dialog width at 520px and animate height with a ResizeObserver on the content, per DESIGN_SYSTEM.md "Step morph".' },
        { mistake: 'Start test returns bad_export for a design you exported.', fix: 'You edited the design after exporting, and autosave does not re-export. Open it, click Export again, then start the test.' },
      ] },
    ],
    checklist: [
      { id: 'mrq-fe-tests-c1', label: 'Copy the channels and tests prompt', trigger: 'copy:mrq-fe-tests-prompt' },
      { id: 'mrq-fe-tests-c2', label: 'Connect a YouTube channel and see your videos' },
      { id: 'mrq-fe-tests-c3', label: 'Start an 8 day test with a control' },
      { id: 'mrq-fe-tests-c4', label: 'Run the check SQL and see 8 pending days', trigger: 'copy:mrq-fe-tests-sql' },
    ],
  },
  {
    id: 'mrq-fe-account',
    title: 'Build billing meters, settings, documentation and help',
    outcome: 'Users see every cap before they hit it, manage their team and data, and find answers without emailing you.',
    minutes: 60,
    xp: 40,
    blocks: [
      { type: 'callout', tone: 'eli5', title: 'Why show the limits so early', text: 'Nobody likes a surprise "you are out of credits" halfway through a job. Showing "62 of 84 concepts left" in the sidebar means people upgrade when they choose to, not when they are stuck. It also cuts support emails.' },
      { type: 'prompt', id: 'mrq-fe-account-prompt', title: 'Paste into Claude Code', code: `Read @PRD.md sections 7.2, 16, 17 and 19, and @DESIGN.md sections 7.11 to 7.16.

Build:
1. app/app/billing/page.tsx (owner only, redirect others): plan card from subscriptions + plan_prices, "Change plan" dialog with the 3 plans and a Monthly/Annual segmented control (calls the existing /api/stripe/checkout with the chosen price, or the portal if they already subscribe), usage meter rows from workspace_usage with fixed 56px heights and the reset date, trial banner when status is trialing.
2. app/app/settings/page.tsx with tabs Profile, Workspace, Members, Notifications, Data. Members: list with role select (owner only changes roles), Invite dialog calling supabase.rpc('create_invite') then a server action that emails the link with Resend (email kind 'invite'), seat count in the toolbar. Notifications: switches bound to notification_prefs. Data: "Delete workspace" (type the name; calls a server action that first disconnects every channel through mrq-youtube-connect/disconnect, then deletes storage folders, then the workspace), and a link to https://myaccount.google.com/permissions.
3. app/invite/[token]/page.tsx per DESIGN.md 7.15 calling supabase.rpc('accept_invite').
4. app/paywall/page.tsx per DESIGN.md 7.16.
5. app/app/docs/page.tsx with the 7 articles from DESIGN.md 7.11 written in plain English from PRD sections 10 to 12 and 16 (how tests work, why 8 days, reading CTR, face photos, fonts and licences, YouTube permissions, quota and limits). Content in content/docs/*.md rendered with react-markdown.
6. app/app/help/page.tsx: connection status per channel (status and last_synced_at), the contact form posting to /api/help (rate limited 5 an hour per user with try_rate_limit through a server route using the secret key, sends to SUPPORT_EMAIL with Resend), and the FAQ from @LANDING.md section 12.
Use only design tokens. Screenshot billing on a trial account.` },
      { type: 'steps', items: [
        'Open Billing. You see Trial, the meters (Concepts, Face cut-outs, Live tests, Channels, Seats) and the reset date.',
        'Open Settings > Members and invite a second email address of yours as Editor. Accept the invite in a private window.',
        'In the private window, check Billing is not in the sidebar for the editor.',
        'Open Documentation and read "How tests work". Open Help and send yourself a test message.',
      ] },
      { type: 'code', id: 'mrq-fe-account-sql', filename: 'check-account.sql', lang: 'sql', code: `-- Two members, the invite accepted, and the meters the billing page reads.
select m.role, p.email from public.workspace_members m join public.profiles p on p.id = m.user_id;
select email, accepted_at is not null as accepted from public.workspace_invites;
select public.workspace_usage(id) from public.workspaces limit 1;` },
      { type: 'mistakes', items: [
        { mistake: 'Inviting fails with "seat_limit_reached" on a trial.', fix: 'Correct: the trial and Creator plan have 1 seat. Test invites with an override: insert into workspace_limit_overrides (workspace_id, seats) values (\'<ws>\', 3); then delete the row afterwards.' },
        { mistake: 'workspace_usage returns "not a member".', fix: 'It is called with the wrong workspace id or from the server with the secret key (no auth.uid()). Call it from the browser client or from a server client that carries the user\'s session.' },
        { mistake: 'Deleting a workspace leaves thumbnails changed on YouTube.', fix: 'The delete must disconnect channels first (which restores originals and revokes tokens). Ask Claude Code to make the server action stop with an error if any disconnect fails.' },
      ] },
    ],
    checklist: [
      { id: 'mrq-fe-account-c1', label: 'Copy the billing and settings prompt', trigger: 'copy:mrq-fe-account-prompt' },
      { id: 'mrq-fe-account-c2', label: 'Invite and accept a second member as Editor' },
      { id: 'mrq-fe-account-c3', label: 'Send a test message from Help' },
      { id: 'mrq-fe-account-c4', label: 'Run the check SQL', trigger: 'copy:mrq-fe-account-sql' },
    ],
  },
]
