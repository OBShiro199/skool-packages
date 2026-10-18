// Halo app-specific frontend tasks (appended to the Foundations phase).
import type { Task } from '../../types'

export const frontendTasks: Task[] = [
  {
    id: 'hlo-fe-onboarding',
    title: 'Build onboarding, locations and the message templates',
    outcome: 'A new owner names the business, adds a location with its Google review link, and edits the text and email wording inside Halo\'s rules.',
    minutes: 75,
    xp: 55,
    blocks: [
      { type: 'callout', tone: 'eli5', title: 'Why the review link comes first', text: 'Halo\'s whole job is to put one button in front of a happy customer: "Post a review on Google". That button needs the business\'s review link. No link, nothing to send. So onboarding asks for it on step 3, and Halo refuses to send real requests to a location without one.' },
      { type: 'prompt', id: 'hlo-fe-onboarding-prompt', title: 'Paste into Claude Code', code: `Read @PRD.md sections 4, 5, 8, 9 and 12, @DESIGN_SYSTEM.md, and @DESIGN.md sections 2, 4, 6, 7.2, 7.7 and 7.8.

Build:
1. app/onboarding/page.tsx: the 5-step morphing card from DESIGN.md 7.2.
   Step 1 calls supabase.rpc('create_workspace', { p_name, p_kind, p_business_type }).
   Step 2 inserts a locations row (browser client, RLS applies) with a slug made from the name plus 4 random characters; uploads the logo to location-logos/<workspace_id>/<location_id>.png (resize to 256px on a canvas first).
   Step 3: paste link (validate it starts with one of the Google prefixes in the SQL check_review_url trigger; show the trigger's hint on error) or a "Connect Google Business Profile" button that links to /api/google/oauth/start (built in a later task; show it disabled with "Coming next" until then).
   Step 4: texting explainer + PhonePreview + "Skip, use email for now" (the form itself comes in the texting task).
   Step 5: send a test to yourself via hl-intake with { test: true, channel: 'email' } and show the live status line from Realtime on review_requests.
2. lib/workspace.ts: getCurrentWorkspace() on the server: getClaims, profiles.current_workspace_id, workspace, role, my_usage. Redirect to /onboarding if none, /paywall if no access (except /app/billing and /app/settings).
3. The app shell from DESIGN.md section 6: sidebar items in this order: Dashboard, Requests, Feedback, Reviews, Locations, then the bottom group Documentation, Help, Billing, Settings. Billing hidden for non-owners. The location switcher writes ?loc= to the URL. The usage meter reads rpc('my_usage').
4. app/app/locations/page.tsx and app/app/locations/[id]/page.tsx with the Details and Messages tabs (Google, Texting, Intake and Tone tabs render a placeholder for now). Messages: SMS and Email cards, Initial and Reminder tabs, placeholder chips, PhonePreview with live character count (render with a 24 char business name, 12 char first name and the 24 char link to show the worst case), and the database trigger's hint shown under the field when a save fails (template_incentive, template_too_long, template_missing_link, template_missing_stop, template_characters).
5. components/PhonePreview.tsx, components/UsageMeter.tsx, components/StatusPill.tsx with the hues from DESIGN.md 2.1 (fixed column widths).
Use only design tokens, no raw hex. Then run the app and screenshot onboarding steps 2, 3 and 5 at 390px and 1440px.` },
      { type: 'steps', items: [
        'Open http://localhost:3000/signup and create a new account.',
        'Onboarding: business "Brightside Dental", type Dental. Location "Brightside Main", short name "Brightside Dental", your timezone.',
        'Step 3: paste a real review link. Find yours (or any business you manage) in Google Business Profile > Ask for reviews > Copy link. It looks like https://g.page/r/XXXXXXXX/review.',
        'Skip texting. Send the test to your own email and open it on your phone.',
        'Open Locations > Brightside Main > Messages. Try saving "Leave us 5 stars for 10% off {link}" as the SMS reminder. You should see the incentive error.',
      ] },
      { type: 'code', id: 'hlo-fe-onboarding-sql', filename: 'check-onboarding.sql', lang: 'sql', code: `-- Run in Supabase > SQL Editor. You should see your workspace, you as owner,
-- one location with a review link, and 4 default templates.
select w.name, m.role, l.name as location, l.review_url is not null as has_link,
  (select count(*) from public.message_templates t where t.workspace_id = w.id) as templates
from public.workspaces w
join public.workspace_members m on m.workspace_id = w.id
join public.locations l on l.workspace_id = w.id
order by w.created_at desc limit 1;` },
      { type: 'mistakes', items: [
        { mistake: 'Saving the location fails with "location_limit".', fix: 'The trial uses the Solo limits (1 location). That is the plan trigger working. For testing more locations, insert a row in workspace_limit_overrides with locations = 3.' },
        { mistake: 'The review link is rejected even though it works in the browser.', fix: 'The trigger only accepts Google links (g.page, search.google.com/local/writereview, www.google.com, maps.app.goo.gl, g.co/kgs). If Google gave you a different short domain, add its prefix to check_review_url in a new migration.' },
        { mistake: 'The logo shows a broken image on the rating page.', fix: 'The file must be in the public location-logos bucket under <workspace_id>/<location_id>.png. Check the path in Storage and that the upload used an owner or admin login.' },
      ] },
    ],
    checklist: [
      { id: 'hlo-fe-onboarding-c1', label: 'Copy the onboarding prompt into Claude Code', trigger: 'copy:hlo-fe-onboarding-prompt' },
      { id: 'hlo-fe-onboarding-c2', label: 'Finish onboarding with a real Google review link' },
      { id: 'hlo-fe-onboarding-c3', label: 'Send a test request to your own email' },
      { id: 'hlo-fe-onboarding-c4', label: 'Confirm the incentive template is rejected' },
      { id: 'hlo-fe-onboarding-c5', label: 'Run the check SQL', trigger: 'copy:hlo-fe-onboarding-sql' },
    ],
  },
  {
    id: 'hlo-fe-rating-page',
    title: 'Build the customer rating page (the policy-safe one)',
    outcome: 'Customers rate, post on Google or send private feedback from a fast mobile page where the Google button is identical for every rating.',
    minutes: 80,
    xp: 70,
    blocks: [
      { type: 'callout', tone: 'eli5', title: 'Same button for everyone', text: 'Google says a business must not pick and choose who it asks for reviews, and must not discourage unhappy customers from posting. So the "Post a review on Google" button on this page never moves, shrinks, hides or changes based on the stars someone taps. The stars only change the thank-you sentence and whether the owner gets an alert.' },
      { type: 'table', head: ['Customer taps', 'Thank-you line', 'Google button', 'Private note box', 'Owner alerted'], rows: [
        ['Nothing yet', 'Empty (space reserved)', 'Shown, same place', 'Collapsed, visible', 'No'],
        ['5 or 4 stars', '"We would love it if you shared that on Google."', 'Shown, same place', 'Collapsed, visible', 'Only if they write a note at or under the threshold'],
        ['3, 2 or 1 stars', '"We are sorry it was not right."', 'Shown, same place', 'Open by default', 'Yes, when they send the note'],
      ] },
      { type: 'prompt', id: 'hlo-fe-rating-page-prompt', title: 'Paste into Claude Code', code: `Read @PRD.md section 4 (all), 13.4 and 21 (A2 to A5), and @DESIGN.md sections 4 (StarPicker, GoogleButton), 8, 9, 11 and 12.

Build:
1. app/r/[token]/page.tsx: server component that renders the shell (logo, heading, StarPicker, reserved lines, GoogleButton, private note section, footer) and a small client component that calls the hl-public edge function (view on load, rate, click, feedback). No Supabase client and no table reads on this page. No PostHog or any other analytics script on /r, /u or /join.
2. components/rating/GoogleButton.tsx: ONE component, no props that change size, colour, label, position or visibility. It calls hl-public 'click' and opens the returned review_url in a new tab (open a blank tab synchronously on tap, then set its location, so iOS Safari does not block the popup).
3. components/rating/StarPicker.tsx as a radiogroup (DESIGN.md 4), 48px buttons, reserved label line.
4. The private note: a text button "Tell the team privately" that expands a 4-row textarea (16px), open by default when rating <= 3, collapsed otherwise. Reserve its height so the Google button above never moves. After sending, replace it in place with "Sent. The team will read it today."
5. Query params: ?r=1..5 preselects and calls rate on load; ?go=google records the click and redirects to the review URL.
6. Expired or unknown token: "This link has expired." only.
7. app/u/[token]/page.tsx (email unsubscribe through hl-public with a new action 'unsubscribe' that sets contacts.email_opted_out_at, and an Undo for 24 hours) and app/join/[slug]/page.tsx (opt-in form posting to hl-intake with a per-location public key you create for the join page, sms_consent from the checkbox, unchecked by default).
8. app/sms-consent/[senderId]/page.tsx: static explanation of how the business collects consent at booking, with the sample message.
9. Lighthouse mobile run on /r/<a real test token>: performance 90+, accessibility 100. Screenshot the page after tapping 1, 3 and 5 stars at 375 x 667 and put them side by side so I can check the Google button is in the same place in all three.` },
      { type: 'steps', items: [
        'Send yourself a test request by email from the Send a request dialog (or the onboarding test).',
        'Open the link on your phone. Tap Post a review on Google without rating: Google\'s review form opens.',
        'Send two more tests. On one tap 5 stars, on the other tap 2 stars. Compare the screenshots: the Google button must sit in exactly the same place.',
        'On the 2 star one, write a private note and send it. Check your inbox for the feedback alert (it arrives once the send worker is built; for now check the jobs table).',
        'Run npm run test:no-gating once the hl-public function is deployed.',
      ] },
      { type: 'code', id: 'hlo-fe-rating-page-sql', filename: 'check-rating.sql', lang: 'sql', code: `-- Your last three test requests: rating, opened, clicked to Google, feedback.
select r.rating, r.opened_at is not null as opened, r.google_clicked_at is not null as clicked,
  r.feedback_at is not null as feedback, f.body
from public.review_requests r
left join public.feedback f on f.request_id = r.id
order by r.created_at desc limit 3;
-- The 2 star feedback must have queued an alert job:
select kind, status from public.jobs where kind = 'feedback_alert' order by created_at desc limit 1;` },
      { type: 'mistakes', items: [
        { mistake: 'iOS opens nothing when you tap the Google button.', fix: 'Safari blocks window.open after an await. Open the tab first (const w = window.open("", "_blank")) on the tap, then set w.location after hl-public answers. Fall back to location.href if w is null.' },
        { mistake: 'The page jumps when the thank-you line appears.', fix: 'Reserve the line height with min-height (24px) from the first render, as DESIGN.md 8 says. Same for the star label and the note area.' },
        { mistake: 'Someone suggests hiding the Google button for 1 to 3 stars "to protect the rating".', fix: 'No. That is review gating (PRD rule R1 to R2). Google can remove reviews or restrict the profile. The private note sits under the same button instead.' },
      ] },
    ],
    checklist: [
      { id: 'hlo-fe-rating-c1', label: 'Copy the rating page prompt into Claude Code', trigger: 'copy:hlo-fe-rating-page-prompt' },
      { id: 'hlo-fe-rating-c2', label: 'Open a test link on your phone and post to Google without rating' },
      { id: 'hlo-fe-rating-c3', label: 'Compare 1, 3 and 5 star screenshots: the Google button has not moved' },
      { id: 'hlo-fe-rating-c4', label: 'Send a private note and see the alert job', trigger: 'copy:hlo-fe-rating-page-sql' },
    ],
  },
  {
    id: 'hlo-fe-requests',
    title: 'Build Requests: send, CSV import, intake keys and the timeline',
    outcome: 'Owners send one request by hand, import yesterday\'s visits from a CSV, create a webhook key for Zapier, and see every step of every request.',
    minutes: 90,
    xp: 65,
    blocks: [
      { type: 'callout', tone: 'eli5', title: 'Three doors, one queue', text: 'Visits arrive through three doors: a person typing in the Send dialog, a CSV file, or a booking tool knocking on the webhook. All three go through the same database function, which writes one "scheduled" row. The send worker then works through the queue every minute, so nothing waits on a slow web request.' },
      { type: 'prompt', id: 'hlo-fe-requests-prompt', title: 'Paste into Claude Code', code: `Read @PRD.md sections 7.1, 10.1, 11.4, 11.5 and 13.1 to 13.2, and @DESIGN.md sections 4 (RequestTicks), 7.4, 7.8 (Intake tab) and 16.

Build:
1. app/app/requests/page.tsx with the tabs Requests, People, Imports (toolbar tabs, filter bar with chips: Status, Channel, Source, Location).
   - Requests table with fixed widths, StatusPill, RequestTicks, StarRow, relative send time in tabular figures. Realtime subscription on review_requests for the workspace (update rows in place, never re-animate).
   - Side panel (portal, 440px, slides 24px over the page): timeline of every timestamp, skip reason in plain words (DESIGN.md 16), message_events list, "Cancel" (rpc cancel_request) for scheduled rows.
2. Send a request dialog: fields from DESIGN.md 7.4, the consent checkbox unchecked by default and the SMS option disabled until it is ticked AND the location's sender is approved, PhonePreview, primary "Schedule request (sends HH:MM)" using the same window logic as compute_send_at (show the server's send_at after saving). Calls hl-intake with the user JWT and an Idempotency-Key header (crypto.randomUUID() made when the dialog opens, so a double click cannot create two).
3. Import CSV dialog (3 steps, morphing height): upload to csv-imports/<workspace_id>/<import_id>.csv after inserting the csv_imports row; column mapping with a 5 row preview (papaparse in the browser, first 50 rows only); summary; then call hl-csv-import and show the live progress from Realtime on csv_imports. Link to /halo-import-template.csv.
4. People tab: contacts with SMS and email opt-out pills, last asked, request count. No tags, no VIP, no rating filters.
5. Imports tab: csv_imports table.
6. Location > Intake tab: keys table, "Create key" calls POST /api/locations/[id]/intake-keys (route handler: getClaims, owner/admin check, newIntakeKey(), insert with the secret key client storing sha256 and the first 16 characters as key_prefix, return the raw key once). Revoke sets revoked_at. Show the webhook URL, a JSON example and the Zapier steps from PRD 11.4.
Then create a 20 row sample CSV in fixtures/sample-visits.csv with 3 bad phone numbers and 2 rows without consent and without email, import it, and show me the summary.` },
      { type: 'code', id: 'hlo-fe-requests-csv', filename: 'fixtures/sample-visits-head.csv', lang: 'txt', code: `first_name,last_name,phone,email,visit_at,sms_consent,external_id
Maria,Lopez,+14155550123,maria@example.com,2026-10-18 10:30,yes,appt_1001
Tom,Reed,(415) 555-0144,,2026-10-18 11:00,yes,appt_1002
Ana,Silva,,ana@example.com,2026-10-18 11:15,no,appt_1003
Lee,Park,555-01,,2026-10-18 11:40,yes,appt_1004` },
      { type: 'steps', items: [
        'Send one request by hand to yourself by email. Watch its row go Scheduled > Sent in the table (after the send worker task, or call the worker with curl).',
        'Import fixtures/sample-visits.csv. The summary should read 15 scheduled and 5 skipped, with reasons.',
        'Create an intake key on your location. Copy it now: you will not see it again.',
        'Post the same webhook body three times with curl (see the hl-intake test). Only one row appears.',
      ] },
      { type: 'code', id: 'hlo-fe-requests-sql', filename: 'check-requests.sql', lang: 'sql', code: `-- Skip reasons from your CSV import, and no duplicates from the webhook test.
select skip_reason, count(*) from public.review_requests
where csv_import_id = (select id from public.csv_imports order by created_at desc limit 1)
group by skip_reason order by 2 desc;

select idempotency_key, count(*) from public.review_requests
where idempotency_key like 'wh:%' group by idempotency_key having count(*) > 1;  -- must return no rows` },
      { type: 'mistakes', items: [
        { mistake: 'Every CSV row is skipped as no_channel.', fix: 'The sms_consent column was not mapped or says something other than yes/no/true/false/1/0, and the rows have no email. Fix the mapping in step 2 of the dialog.' },
        { mistake: 'Times in the CSV are off by hours.', fix: 'Local times without a zone are read in the location\'s timezone. Check the location timezone in Details, or send ISO times with a Z or offset.' },
        { mistake: 'The table flickers on every Realtime update.', fix: 'Update the row in place by id instead of refetching the whole list, and keep the row-rise animation for the first render only.' },
      ] },
    ],
    checklist: [
      { id: 'hlo-fe-requests-c1', label: 'Copy the Requests prompt into Claude Code', trigger: 'copy:hlo-fe-requests-prompt' },
      { id: 'hlo-fe-requests-c2', label: 'Import the sample CSV and check 15 scheduled, 5 skipped', trigger: 'copy:hlo-fe-requests-csv' },
      { id: 'hlo-fe-requests-c3', label: 'Create an intake key and save it in your password manager' },
      { id: 'hlo-fe-requests-c4', label: 'Run the duplicate check SQL', trigger: 'copy:hlo-fe-requests-sql' },
    ],
  },
  {
    id: 'hlo-fe-feedback-reviews',
    title: 'Build the Feedback inbox, Reviews page and reply editor',
    outcome: 'Owners work private feedback to Resolved, and approve AI reply drafts (or copy them in Link mode) from a phone.',
    minutes: 85,
    xp: 65,
    blocks: [
      { type: 'callout', tone: 'eli5', title: 'Two inboxes, two jobs', text: 'Feedback is private: a customer telling the business something went wrong, so the owner can call them. Reviews are public: what everyone sees on Google, where a quick, kind reply matters. Halo keeps them apart, so a private complaint never ends up in a public reply.' },
      { type: 'prompt', id: 'hlo-fe-feedback-reviews-prompt', title: 'Paste into Claude Code', code: `Read @PRD.md sections 10.5, 10.6, 13.9, 13.10 and 14, and @DESIGN.md sections 4 (DraftCard), 7.5, 7.6, 7.8 (Tone tab), 13 and 15.

Build:
1. app/app/feedback/page.tsx: inbox table, filter chips (Status default New + Contacted, Rating, Location), side panel with the full note, rating, customer name, tap-to-call phone, mailto email, request timeline, owner notes (autosave, "Saved" toast), Mark contacted / Mark resolved (browser update on feedback.status; the trigger stamps resolved_at). Realtime inserts rise once at the top. Sidebar count pill for status 'new'.
2. app/app/reviews/page.tsx:
   - Connected mode: google_reviews table with StarRow, reviewer, first line, date, location, reply status pill (Needs reply / Draft ready / Posted / Failed from the latest reply_drafts row). Side panel with components/reviews/DraftCard.tsx.
   - DraftCard: review on top, textarea with the draft (reserved 120px), checks line (run the same checks as _shared/replyChecks.ts in the browser: copy them to lib/replyChecks.ts and keep them identical), needs_attention line, "Approve and post" (disabled while checks fail; calls hl-post-reply; handles 409 review_changed by showing the new review text and "Redraft" / "Post anyway"), "Redraft" with an instruction input (hl-draft-reply action redraft), "Copy", "Discard" (update status 'discarded').
   - Link mode (no connected location in the filter): the "Draft a reply to any review" card calling hl-draft-reply action 'paste', result in a DraftCard whose primary is "Copy reply".
   - "Sync now" (hl-google-sync with location_id) with "Synced N minutes ago" in a fixed-width label.
3. Location > Tone tab: voice notes, sign-off, contact line, words to avoid (chips), sample replies (max 5, 600 chars each with live counts), "Suggest from my past replies" (hl-draft-reply suggest_tone, Connected only), and "Draft a sample reply" for a 5, 3 or 1 star sample review.
4. Mobile under 768px: bottom bar (Dashboard, Feedback, Reviews, More), side panels as full-screen sheets.
Screenshot the Feedback panel and a DraftCard at 390px.` },
      { type: 'steps', items: [
        'Open a test rating link, rate 2 stars and send a note. It appears at the top of Feedback without a refresh.',
        'Mark it Contacted, add a note, then Resolved. The status pill changes without the column changing width.',
        'In Reviews (Link mode), paste a real 3 star review from any business on Google Maps and draft a reply. Check it offers no discount and confirms no private details.',
        'Fill in the Tone tab with two of your own past replies and a sign-off, then draft again. The voice should match.',
      ] },
      { type: 'code', id: 'hlo-fe-feedback-reviews-sql', filename: 'check-feedback-drafts.sql', lang: 'sql', code: `select status, resolved_at is not null as resolved_stamped from public.feedback order by updated_at desc limit 3;
select source, status, char_length(body) as chars, check_warnings, needs_attention, cost_micros
from public.reply_drafts order by created_at desc limit 3;` },
      { type: 'mistakes', items: [
        { mistake: 'Approve and post is enabled for a draft that mentions a phone number.', fix: 'The browser checks and the edge function checks drifted apart. Keep one source (lib/replyChecks.ts) and import the same file into supabase/functions/_shared, or copy it with a script on build.' },
        { mistake: 'Drafts sound generic.', fix: 'Add 2 to 5 sample replies and a contact line in the Tone tab. The prompt quotes them as examples; with none, Claude falls back to plain and polite.' },
        { mistake: 'Feedback panel shows another location\'s note.', fix: 'You filtered by ?loc in the UI but read the wrong id. RLS keeps data inside the workspace; the location filter is a UI filter, so pass the location id into the query, not only into the URL.' },
      ] },
    ],
    checklist: [
      { id: 'hlo-fe-fr-c1', label: 'Copy the Feedback and Reviews prompt into Claude Code', trigger: 'copy:hlo-fe-feedback-reviews-prompt' },
      { id: 'hlo-fe-fr-c2', label: 'Work one feedback item from New to Resolved' },
      { id: 'hlo-fe-fr-c3', label: 'Draft a reply to a pasted 3 star review and check it' },
      { id: 'hlo-fe-fr-c4', label: 'Run the check SQL', trigger: 'copy:hlo-fe-feedback-reviews-sql' },
    ],
  },
  {
    id: 'hlo-fe-dashboard',
    title: 'Build the dashboard, texting setup screen and billing meters',
    outcome: 'Owners see sent, opened, clicked to Google, feedback, new reviews and the rating trend per location, register for texting, and watch their plan usage.',
    minutes: 80,
    xp: 60,
    blocks: [
      { type: 'callout', tone: 'eli5', title: 'Clicks are not reviews', text: 'Halo can see that a customer tapped "Post a review on Google". It cannot see whether they finished writing it, because that happens on Google. So the dashboard calls it "clicked to Google". New reviews come from Google itself (once connected), counted separately. Mixing the two would flatter the numbers.' },
      { type: 'prompt', id: 'hlo-fe-dashboard-prompt', title: 'Paste into Claude Code', code: `Read @PRD.md sections 10.3, 15 and 18, and @DESIGN.md sections 4 (KpiTile, FunnelBar, RatingTrend, SetupChecklist, UsageMeter), 7.3, 7.8 (Texting tab), 7.9, 10, 17 and 19.

Build:
1. app/app/page.tsx (Dashboard): date range chip (7, 30, 90 days) and the location filter from the URL. Data from the views location_daily_stats and review_daily_stats plus rating_snapshots, through the user's RLS client, in one server action that returns all tiles at once (no waterfall). Metric definitions exactly as PRD section 18. KPI tiles with deltas vs the previous period. FunnelBar. Private feedback tile. RatingTrend (Recharts) with the fixed 1.0 to 5.0 axis and one line per location for "All locations". Link mode shows the Connect Google box in the chart's place at the same height. Two short tables: Needs a reply, Latest feedback. New workspace (no sent requests): SetupChecklist instead.
2. Location > Texting tab: the sender form from DESIGN.md 7.8 writing to sms_senders through the browser client (RLS + column grants allow only the form fields), "Submit for approval" calling hl-sms-setup { action: 'submit' }, the 4-step progress for pending (Realtime on sms_senders), rejection reason with "Edit and resubmit". One sender can be shared by several locations of the same business: a select "Use the number from: <other location>" sets locations.sms_sender_id.
3. app/app/billing/page.tsx (owner only): plan card, UsageMeters for requests, AI drafts, locations, seats (rpc my_usage), "Manage billing" (Stripe portal), the plan table with the monthly/yearly toggle. Trial banner with the trial caps.
4. A banner on every app page when requests_used >= requests_limit: "Your plan's N requests this month are used. New requests wait as limit reached." with "Upgrade".
Check the dashboard numbers against the SQL in the task and show me both side by side for the last 30 days.` },
      { type: 'code', id: 'hlo-fe-dashboard-sql', filename: 'check-dashboard.sql', lang: 'sql', code: `-- Last 30 days, all locations. The dashboard tiles must show the same numbers.
select
  count(*) filter (where sent_at is not null) as sent,
  round(100.0 * count(*) filter (where opened_at is not null) / nullif(count(*) filter (where sent_at is not null), 0), 1) as open_rate_pct,
  round(100.0 * count(*) filter (where google_clicked_at is not null) / nullif(count(*) filter (where sent_at is not null), 0), 1) as clicked_google_pct,
  count(*) filter (where feedback_at is not null) as feedback
from public.review_requests
where sent_at >= now() - interval '30 days';

select count(*) as new_google_reviews from public.google_reviews
where create_time >= now() - interval '30 days' and removed_at is null;` },
      { type: 'steps', items: [
        'Open the dashboard with your test data. Compare each tile with the SQL output.',
        'Switch the location filter and the date range. Nothing on the page jumps or resizes.',
        'Fill in the Texting form for your own business (or a friend\'s you are allowed to register) and save it as a draft. Submitting comes in the Twilio backend task.',
        'Open Billing and check the meters show the trial caps (50 requests, 10 drafts).',
      ] },
      { type: 'mistakes', items: [
        { mistake: 'The open rate is over 100%.', fix: 'You divided by requests created, not requests sent, or counted reminders as extra sends. Count on sent_at in range, one row per request.' },
        { mistake: 'The rating chart jumps when data loads.', fix: 'Fix the y axis domain to [1, 5] and render the axis before data arrives, as DESIGN.md 4 says.' },
        { mistake: 'Saving the Texting form fails with "permission denied for table sms_senders".', fix: 'You are trying to write a column the browser is not granted (for example status). Only the form fields are granted for update; status and Twilio ids are written by hl-sms-setup.' },
      ] },
    ],
    checklist: [
      { id: 'hlo-fe-dash-c1', label: 'Copy the dashboard prompt into Claude Code', trigger: 'copy:hlo-fe-dashboard-prompt' },
      { id: 'hlo-fe-dash-c2', label: 'Match every dashboard tile with the SQL', trigger: 'copy:hlo-fe-dashboard-sql' },
      { id: 'hlo-fe-dash-c3', label: 'Save your business details in the Texting form' },
      { id: 'hlo-fe-dash-c4', label: 'Check the Billing meters show the trial caps' },
    ],
  },
]
