// Quotient app-specific frontend tasks (appended to the Foundations phase).
import type { Task } from '../../types'

export const frontendTasks: Task[] = [
  {
    id: 'quo-fe-onboarding',
    title: 'Build onboarding, the app shell and business settings',
    outcome: 'A new owner names their business, picks a trade and hours, and lands in an app with the right sidebar.',
    minutes: 70,
    xp: 50,
    blocks: [
      { type: 'callout', tone: 'eli5', title: 'One workspace = one business', text: 'Everything in Quotient belongs to a business: its prices, calendar, leads and texting number. The database creates the business, your owner seat, a default calendar with Monday to Friday hours, and your follow-up plan in one step, so nothing is ever half set up.' },
      { type: 'prompt', id: 'quo-fe-onboarding-prompt', title: 'Paste into Claude Code', code: `Read @PRD.md sections 4, 7 and 8, @DESIGN_SYSTEM.md, and @DESIGN.md sections 2, 6, 7.2 and 7.10.

Build:
1. app/onboarding/page.tsx: the 5-step card from DESIGN.md 7.2 in one dialog-style card that morphs height. Step 1 calls supabase.rpc('create_workspace', { p_name, p_slug, p_country, p_currency, p_timezone }) and handles 'duplicate key' on slug with "That web address is taken. Try another." (debounced live check with a select on workspaces is not possible for other businesses' rows, so check by calling a tiny route app/api/slug-available/route.ts that uses the secret key and returns only true or false). Logo upload goes to brand-assets/<workspace_id>/logo.<ext> with the browser client. Steps 2 to 5 can be stubs that only save the trade and hours for now (the calculator part is the next task).
2. lib/workspace.ts: getCurrentWorkspace() on the server: getClaims, then profiles.current_workspace_id, the workspace and the user's role. Redirect to /onboarding if none. switchWorkspace(id) server action for Agency.
3. The app shell from DESIGN.md section 6: sidebar items in this exact order: Leads, Calendar, Calculators, Messages, Analytics, then the bottom group Documentation, Help, Billing (owners only), Settings. Business switcher under the logo when the owner owns more than one workspace. Mini usage meter above the bottom group calling supabase.rpc('usage_summary', { ws }).
4. app/app/settings/page.tsx with the Business tab (name, slug, logo, brand colour with 8 swatches and hex input, contact email and phone, badge switch), Team tab (members table, invite dialog calling rpc('create_invite')), and empty Payments, Texting and Notifications tabs for later tasks.
5. lib/brand.ts: brandToCssVars(hex) exactly as DESIGN.md 2.2, with unit tests for the 4 rows in DESIGN.md 13.2.
Every /app page checks getClaims and has_active_access and redirects to /login or /paywall. Use only design tokens, no raw hex. Then screenshot onboarding steps 1 and 4 at 375px and 1440px.` },
      { type: 'steps', items: [
        'Open http://localhost:3000/signup and create an account.',
        'Onboarding step 1: name "Sparkle Cleaning", web address "sparkle", country United Kingdom, currency GBP. Upload any PNG logo.',
        'Finish the steps (stubs are fine) and check the sidebar shows Leads, Calendar, Calculators, Messages, Analytics, then Documentation, Help, Billing, Settings.',
        'Settings > Business: change the brand colour and watch the mini preview update.',
      ] },
      { type: 'code', id: 'quo-fe-onboarding-sql', filename: 'check-workspace.sql', lang: 'sql', code: `-- Your business, your owner role, the default calendar and its weekday hours.
select w.name, w.slug, w.country, w.currency, m.role,
       (select count(*) from public.calendars c where c.workspace_id = w.id) as calendars,
       (select count(*) from public.availability_windows a where a.workspace_id = w.id) as hour_rows,
       (select enabled from public.follow_up_rules f where f.workspace_id = w.id) as follow_ups_on
from public.workspaces w
join public.workspace_members m on m.workspace_id = w.id;
-- Expect: owner, 1 calendar, 5 hour rows, follow_ups_on true.` },
      { type: 'mistakes', items: [
        { mistake: 'Step 1 errors with "new row violates row-level security policy".', fix: 'Claude Code inserted into workspaces directly. Tell it: "Create the business with supabase.rpc(\'create_workspace\'). There is no insert policy on purpose."' },
        { mistake: 'The logo upload fails with 403.', fix: 'The path must start with the workspace id: brand-assets/<workspace_id>/logo.png, and only owners and admins can upload. Ask Claude Code to log the path it used.' },
        { mistake: 'Turning off the badge errors on a Solo trial.', fix: 'That is correct: removing the badge needs Crew. The switch should be disabled with "Available on Crew" instead of throwing.' },
      ] },
    ],
    checklist: [
      { id: 'quo-fe-onboarding-c1', label: 'Copy the onboarding and shell prompt', trigger: 'copy:quo-fe-onboarding-prompt' },
      { id: 'quo-fe-onboarding-c2', label: 'Sign up and finish onboarding with a logo' },
      { id: 'quo-fe-onboarding-c3', label: 'Check the sidebar order matches the PRD' },
      { id: 'quo-fe-onboarding-c4', label: 'Run the check SQL', trigger: 'copy:quo-fe-onboarding-sql' },
    ],
  },
  {
    id: 'quo-fe-builder',
    title: 'Build the price engine, trade templates and the calculator builder',
    outcome: 'Owners build a calculator from a template, see a live preview with a line-by-line breakdown, and publish a frozen version.',
    minutes: 120,
    xp: 75,
    blocks: [
      { type: 'callout', tone: 'eli5', title: 'Why the price engine is plain code, not AI', text: 'A price has to be the same every time for the same answers, and the owner has to be able to see how it was worked out. So the maths is a small, boring, tested function that only adds and multiplies whole pennies. The AI never touches it.' },
      { type: 'prompt', id: 'quo-fe-builder-prompt', title: 'Paste into Claude Code', code: `Read @PRD.md sections 8.2, 8.3 and 11.1, @DESIGN_SYSTEM.md, and @DESIGN.md sections 4, 7.6 and 13.3.

Build:
1. lib/pricing/schema.ts: the zod schema for the calculator config in PRD 8.2 (schema_version 1, every rule kind in the table). Export type CalculatorConfig. Refinements: every rule's question_id exists and has the right type; ids are unique; zones have at least one prefix unless blocked; low_pct and high_pct between 0 and 50; round_to_cents one of 100, 500, 1000, 2500, 5000.
2. lib/pricing/engine.ts: quote(config, serviceId, answers, extras, postcode) exactly as PRD 8.3, integer cents, Math.round after every multiplication, longest-prefix zone match on the normalised postcode. Pure function, no imports except the schema types.
3. lib/pricing/engine.test.ts with Vitest: 25 tests covering every rule kind, free_units, min_area, per_hour rounding to 0.5 h with people, multipliers after additions, extras, min charge, range rounding (low floors, high ceils, low never under the minimum), zone precedence (SW1 vs SW15), blocked zones, default_zone served false, clamping, survey_only. Add "test" to package.json scripts.
4. scripts/sync-pricing.mjs and npm run sync:pricing: copies schema.ts and engine.ts into supabase/functions/_shared/pricing/, rewriting "from 'zod'" to "from 'npm:zod'".
5. lib/templates/{cleaning,windows,landscaping,painting,removals}.ts: complete, realistic configs. Use the business currency: GBP and USD variants with sensible local prices. Each has 3 to 5 questions, 1 to 2 services, 2 to 4 extras, a minimum charge and an empty zones list.
6. app/app/calculators/page.tsx (list) and app/app/calculators/[id]/page.tsx (builder) exactly as DESIGN.md 7.6 and 13.3: tabs Questions, Pricing, Zones, Photos and AI, Booking, Share; draft autosave (debounced 800 ms, update calculators.draft_config); validation chips per tab from the zod errors; the sticky preview rendering components/widget/Widget.tsx (build a first version now: questions, price step with PriceRange, no contact step yet) with the local engine; Breakdown toggle; Publish button calling supabase.rpc('publish_calculator', { p_calculator }) and showing "Version N published".
7. Wire onboarding steps 2 and 3 to create the first calculator from the chosen template and edit its main rates.
Run npm test and show me the output. Then screenshot the builder Pricing tab at 1440px.` },
      { type: 'steps', items: [
        'Run npm test and check all 25 pricing tests pass.',
        'Open Calculators > your cleaning calculator. On Pricing, change the per-bedroom rate and watch the preview range change.',
        'On Zones, add "Outer" with prefixes SW15, SW19 and a £15 surcharge, and "Not covered" with prefix CR.',
        'In the preview, enter postcode SW15 2AA (surcharge appears in the breakdown), then CR0 1AA (out of area).',
        'Click Publish. Change a price again: the toolbar shows "Unpublished changes".',
      ] },
      { type: 'code', id: 'quo-fe-builder-sql', filename: 'check-versions.sql', lang: 'sql', code: `-- One published version per publish. Versions never change.
select c.name, c.status, v.version_no, v.published_at,
       jsonb_array_length(v.config -> 'questions') as questions,
       jsonb_array_length(v.config -> 'zones') as zones
from public.calculators c
join public.calculator_versions v on v.calculator_id = c.id
order by v.published_at desc;

-- This must fail with "published calculator versions are immutable" (run as postgres):
update public.calculator_versions set config = '{}' where version_no = 1;` },
      { type: 'mistakes', items: [
        { mistake: 'The preview and later the server show different prices for the same answers.', fix: 'The edge function is using an old copy. Run npm run sync:pricing and redeploy. Never edit supabase/functions/_shared/pricing by hand.' },
        { mistake: 'Prices come out as 17999.999 or show pennies in the range.', fix: 'A multiplication was not rounded, or the display divides by 100 without formatting. Ask Claude Code to round after every multiply in the engine and format with Intl.NumberFormat and maximumFractionDigits 0.' },
        { mistake: 'Publish errors with "calculator_limit_reached".', fix: 'Solo allows one published calculator. Archive the old one first, or test Crew limits with a limit override.' },
      ] },
    ],
    checklist: [
      { id: 'quo-fe-builder-c1', label: 'Copy the engine and builder prompt', trigger: 'copy:quo-fe-builder-prompt' },
      { id: 'quo-fe-builder-c2', label: 'Run npm test and see 25 passing pricing tests' },
      { id: 'quo-fe-builder-c3', label: 'Add two zones and check them in the preview' },
      { id: 'quo-fe-builder-c4', label: 'Publish and run the version check SQL', trigger: 'copy:quo-fe-builder-sql' },
    ],
  },
  {
    id: 'quo-fe-widget',
    title: 'Build the embeddable widget, hosted quote page and customer lead page',
    outcome: 'A snippet on any website shows your calculator, gives an instant price, takes photos and creates a lead.',
    minutes: 120,
    xp: 75,
    blocks: [
      { type: 'callout', tone: 'eli5', title: 'Why an iframe', text: 'A website builder like Wix has its own fonts, colours and scripts. If the calculator ran directly on that page, their styles would mess up yours and yours would mess up theirs. An iframe is a window in their page that shows your page, so both stay tidy. A tiny script makes the window grow to fit.' },
      { type: 'prompt', id: 'quo-fe-widget-prompt', title: 'Paste into Claude Code', code: `Read @PRD.md sections 6 (flow), 7 (public routes), 11.2, 11.3 and 12, @DESIGN_SYSTEM.md, and @DESIGN.md sections 8, 9, 11 and 12. The edge functions qt-public-quote and qt-lead-photos are already deployed.

Build:
1. public/widget.js (hand-written, no build step, under 3 KB): finds every [data-quotient], inserts an iframe to NEXT_PUBLIC_SITE_URL/embed/<id> with the parent page's utm_* params and document.referrer host, title "Instant quote", loading lazy, width 100%, height 640. Listens for message events where event.origin === the Quotient origin and data.type === 'quotient:height' and sets that iframe's height. Also handles 'quotient:navigate' to open Stripe Checkout with window.top.location (only https://checkout.stripe.com URLs).
2. components/widget/Widget.tsx (finish it): steps from DESIGN.md 8: questions (one per step under 640px, grid above), price step with extras, contact step with libphonenumber-js and the exact consent text (checkbox never pre-ticked), honeypot field (visually hidden, aria-hidden, tabindex -1), elapsed time since load, submit to qt-public-quote, then the after-submit cards (photos, booking placeholder for the next task). Answers are saved to sessionStorage per calculator. Price previews call qt-public-quote action 'price' debounced 300 ms, showing the local engine result first; the server result wins. Paused, out of area and cap states exactly as DESIGN.md 8.
3. Photo upload: browser-image-compression to 1280 px long edge, JPEG 0.82, heic2any for HEIC, EXIF stripped; ask qt-lead-photos for URLs, PUT each file to its signed URL with progress (XMLHttpRequest for upload progress), then call 'done'.
4. app/embed/[calcId]/page.tsx: renders Widget with brandToCssVars, posts its height with a ResizeObserver, sets the CSP header frame-ancestors * (or allowed_origins) in next.config or middleware. No Supabase client import anywhere under app/embed, app/q, app/l, app/b, app/o.
5. app/q/[business]/[calc]/page.tsx: the hosted page with the business header and contact details.
6. app/l/[token]/page.tsx: the customer's quote (fetches through a new GET mode of qt-public-quote: ?lead=<token> returning only the lead's public fields: first name, service, answers, range, status, photos count, booking summary, needs_site_visit). Add that mode to the edge function too.
7. A demo page app/dev/embed-test/page.tsx (development only) that is a plain HTML page with the snippet, so you can test the iframe like a real site.
Then open /dev/embed-test at 375px, submit a quote with 2 photos, and show me the lead row.` },
      { type: 'steps', items: [
        'Open http://localhost:3000/dev/embed-test on your phone-sized window (DevTools device toolbar, iPhone SE).',
        'Answer the questions. The range appears and updates as you change answers. The iframe has no inner scrollbar.',
        'Enter your own name, email and mobile, tick the text box, and press Get my quote. Check your inbox for the quote copy.',
        'Add two photos from your computer. Watch the upload bars.',
        'Paste the snippet into a free CodePen (codepen.io > Create > Pen > HTML panel) and check it loads there too.',
      ] },
      { type: 'code', id: 'quo-fe-widget-snippet', filename: 'embed-snippet.html', lang: 'html', code: `<!-- Paste into any website: Wix (Add > Embed code > Custom code), Squarespace (Code block),
     WordPress (Custom HTML block), Webflow (Embed element). Replace CALC_ID and YOURDOMAIN. -->
<div data-quotient="CALC_ID"></div>
<script src="https://YOURDOMAIN/widget.js" async></script>

<!-- Fallback for builders that strip scripts: -->
<iframe src="https://YOURDOMAIN/embed/CALC_ID" title="Instant quote"
        style="width:100%;height:900px;border:0" loading="lazy"></iframe>` },
      { type: 'code', id: 'quo-fe-widget-sql', filename: 'check-lead.sql', lang: 'sql', code: `-- The newest lead: priced on the server, consent recorded, photos uploaded, AI queued.
select l.status, l.priced, l.price_low_cents, l.price_high_cents, l.sms_consent, l.consent_at is not null as consent_time,
       l.utm_source, l.referrer_host, l.ai_status,
       (select count(*) from public.lead_photos p where p.lead_id = l.id and p.uploaded) as photos,
       (select count(*) from public.follow_ups f where f.lead_id = l.id) as follow_ups
from public.leads l order by l.created_at desc limit 1;` },
      { type: 'mistakes', items: [
        { mistake: 'The iframe shows a scrollbar or is cut off.', fix: 'The height message is not arriving. Check the embed page posts { type: "quotient:height" } to window.parent with "*" as target, and widget.js compares event.origin with your exact site URL (no trailing slash).' },
        { mistake: 'Stripe Checkout refuses to open inside the iframe.', fix: 'Checkout cannot run in an iframe. The widget must post quotient:navigate and widget.js sets window.top.location. On the hosted page, set window.location directly.' },
        { mistake: 'iPhone photos fail to upload.', fix: 'They are HEIC and large. Make sure heic2any converts first and browser-image-compression resizes before asking for upload URLs (the server rejects files over 10 MB).' },
      ] },
    ],
    checklist: [
      { id: 'quo-fe-widget-c1', label: 'Copy the widget prompt', trigger: 'copy:quo-fe-widget-prompt' },
      { id: 'quo-fe-widget-c2', label: 'Submit a quote on the test page with 2 photos' },
      { id: 'quo-fe-widget-c3', label: 'Copy the embed snippet and test it on CodePen', trigger: 'copy:quo-fe-widget-snippet' },
      { id: 'quo-fe-widget-c4', label: 'Run the lead check SQL', trigger: 'copy:quo-fe-widget-sql' },
    ],
  },
  {
    id: 'quo-fe-inbox',
    title: 'Build the leads inbox, lead panel and live updates',
    outcome: 'Owners see every quote arrive live, work it through New, Quoted, Booked, Won and Lost, and read the photo check.',
    minutes: 90,
    xp: 60,
    blocks: [
      { type: 'callout', tone: 'eli5', title: 'What "live" means here', text: 'Supabase Realtime tells the browser the moment a row changes. So when a customer submits a quote at 9pm, the inbox on your phone shows it without a refresh. The page is careful not to jump while you are reading: new rows wait behind a "1 new lead" pill.' },
      { type: 'prompt', id: 'quo-fe-inbox-prompt', title: 'Paste into Claude Code', code: `Read @PRD.md sections 9.1, 13.9 and 17, @DESIGN_SYSTEM.md, and @DESIGN.md sections 2.1, 4, 7.3 and 7.4.

Build:
1. app/app/leads/page.tsx: the inbox table from DESIGN.md 7.3 with status chips and counts, search, filters (calculator, source, survey suggested, date), server-side pagination (50 rows), CSV export (server route that checks membership). Realtime: subscribe to postgres_changes on leads filtered by workspace_id=eq.<ws>; inserts go behind the "N new leads" pill when the user has scrolled, updates patch rows in place.
2. components/leads/LeadPanel.tsx at /app/leads/[id] (parallel route or searchParam so it overlays the inbox): header, actions, tabs Overview, Timeline, Messages, Bookings exactly as DESIGN.md 7.4. Photos via 10 minute signed URLs (storage.from('lead-photos').createSignedUrl). AiNote from the latest ai_reviews row. StatusPill menu updates leads.status; Mark won asks for the final value (won_value_cents); Mark lost asks for a reason. Notes insert lead_events with kind 'note'.
3. components/leads/Composer.tsx: text or email dialog calling supabase.functions.invoke('qt-send-message'). Show the SegmentCounter and the disabled reasons from DESIGN.md 15.
4. "+ Add lead" dialog for phone enquiries: inserts a manual lead (source 'manual', priced false). Owners can then send a price by email from the composer.
Then submit 2 quotes from the test embed page in another window and record a short screen capture of them arriving live.` },
      { type: 'steps', items: [
        'Open /app/leads in one window and /dev/embed-test in another. Submit a quote and watch the row appear.',
        'Open the lead. Check the price breakdown, the photos and the photo check note.',
        'Mark the lead Won with a final value. The status pill turns green and the timeline shows the change.',
        'Open DevTools > Console and try: await supabase.from("leads").update({ price_low_cents: 1 }).eq("id", "<id>") (Claude Code can expose the client on window in development). It must fail.',
      ] },
      { type: 'code', id: 'quo-fe-inbox-sql', filename: 'check-inbox.sql', lang: 'sql', code: `-- Status timestamps are set by the database, and follow-ups were cancelled when the lead was won.
select l.customer_name, l.status, l.quoted_at, l.won_at, l.won_value_cents,
       (select string_agg(f.status::text, ', ' order by f.step_no) from public.follow_ups f where f.lead_id = l.id) as follow_ups
from public.leads l order by l.updated_at desc limit 5;

select kind, data, created_at from public.lead_events order by created_at desc limit 10;` },
      { type: 'mistakes', items: [
        { mistake: 'Realtime never fires.', fix: 'The migration added leads to supabase_realtime, but the channel filter must be workspace_id=eq.<uuid> and the user must pass RLS. Check Database > Publications shows leads, and log the subscribe status.' },
        { mistake: 'Photos show as broken images.', fix: 'The bucket is private, so you need signed URLs, and they expire. Generate them when the panel opens (10 minutes), not at page load for every row.' },
        { mistake: 'Marking a lead won errors with "these lead fields are set by Quotient".', fix: 'The update sends the whole row back, including price fields. Ask Claude Code to send only the changed columns: status, won_value_cents, lost_reason.' },
      ] },
    ],
    checklist: [
      { id: 'quo-fe-inbox-c1', label: 'Copy the inbox prompt', trigger: 'copy:quo-fe-inbox-prompt' },
      { id: 'quo-fe-inbox-c2', label: 'Watch a new quote arrive live' },
      { id: 'quo-fe-inbox-c3', label: 'Mark a lead won with a final value' },
      { id: 'quo-fe-inbox-c4', label: 'Run the inbox check SQL', trigger: 'copy:quo-fe-inbox-sql' },
    ],
  },
  {
    id: 'quo-fe-calendar',
    title: 'Build the calendar, availability and customer booking',
    outcome: 'Customers pick a survey or job slot from your hours, optionally pay a deposit, and can reschedule or cancel themselves.',
    minutes: 100,
    xp: 65,
    blocks: [
      { type: 'callout', tone: 'eli5', title: 'Why a held slot', text: 'Paying a deposit takes a customer a minute or two. If the slot stayed open during that time, someone else could book it too. So Quotient puts a 35 minute "held" sticker on it. If they pay, it becomes confirmed. If they wander off, the sticker falls off and the slot is free again.' },
      { type: 'prompt', id: 'quo-fe-calendar-prompt', title: 'Paste into Claude Code', code: `Read @PRD.md sections 9.2, 11.5 and 13.4, @DESIGN_SYSTEM.md, and @DESIGN.md sections 4 (SlotPicker), 7.5 and 9. qt-book is deployed.

Build:
1. app/app/calendar/page.tsx: week grid from DESIGN.md 7.5 with bookings (survey teal, job blue, held amber with a live countdown), availability shading, blackouts. Realtime on bookings for the workspace. Clicking a booking opens a side panel with Mark completed, No-show, Cancel booking (update bookings.status only).
2. The Availability dialog (owners and admins): availability_windows per weekday, survey and job lengths, buffer, notice, days ahead; "Add time off" for blackouts.
3. Calendar feed: app/api/ics/[token]/route.ts using the ics npm package. "Copy calendar link" creates a new token (crypto random 32 bytes), stores sha256 in calendars.ics_token_hash with the secret key client after checking the user is owner/admin, and shows the link once.
4. components/booking/SlotPicker.tsx and the Book card in the widget after-submit step and on /l/[token]: kind tabs (survey, job) from the response, 7-day strip, time grid, "Next week", note field, "Book survey" / "Pay deposit and book (£40)". Deposit: post quotient:navigate with the checkout_url (widget) or set window.location (pages). Back with ?paid=1: poll the lead page data every 2 s for up to 30 s until the booking shows confirmed, then show "Booked. See you ...".
5. app/b/[token]/page.tsx: manage booking (reschedule with the SlotPicker morphing inside the card, cancel with an in-card confirm), calling qt-book.
6. In Calculators > Booking tab: mode, calendar, deposits (disabled with "Connect Stripe" when not connected).
Then book a survey from the test page at 375px and show me the calendar week view with it.` },
      { type: 'steps', items: [
        'Calendar > Availability: set Monday to Friday 08:00 to 17:00, survey 30 minutes, notice 24 hours.',
        'From /dev/embed-test, submit a quote and book a survey for tomorrow. The Calendar shows it straight away.',
        'Open the manage link from the confirmation email and reschedule it to another day.',
        'Copy the calendar link and add it to Google Calendar (Other calendars > From URL). The survey appears within a few hours (Google refreshes feeds on its own schedule).',
      ] },
      { type: 'code', id: 'quo-fe-calendar-sql', filename: 'check-bookings.sql', lang: 'sql', code: `-- Bookings for your business, newest first. Rescheduled ones show a cancelled row and a new confirmed row.
select b.kind, b.status, b.starts_at, b.ends_at, b.hold_expires_at, b.deposit_cents, l.status as lead_status
from public.bookings b join public.leads l on l.id = b.lead_id
order by b.created_at desc limit 10;

-- Proof the database blocks overlaps (run as postgres; must fail with bookings_no_overlap):
insert into public.bookings (workspace_id, lead_id, calendar_id, kind, status, starts_at, ends_at, manage_token_hash)
select workspace_id, lead_id, calendar_id, kind, 'confirmed', starts_at, ends_at, repeat('0', 64)
from public.bookings where status = 'confirmed' limit 1;` },
      { type: 'mistakes', items: [
        { mistake: 'Slots are an hour off for half the year.', fix: 'Times are built in the server timezone instead of the calendar timezone. Tell Claude Code: "Build slots with date-fns-tz in calendars.timezone and add the daylight saving tests from the qt-book prompt."' },
        { mistake: 'No slots appear at all.', fix: 'Usually min_notice_hours plus no windows for that kind. Check availability_windows.kinds includes survey and that the date is within max_days_ahead.' },
        { mistake: 'The customer pays but the page still says "Not booked".', fix: 'The Connect webhook has not arrived yet or failed. Check Stripe > Developers > Webhooks > your Connected accounts destination > Event deliveries, then qt-connect-webhook logs.' },
      ] },
    ],
    checklist: [
      { id: 'quo-fe-calendar-c1', label: 'Copy the calendar and booking prompt', trigger: 'copy:quo-fe-calendar-prompt' },
      { id: 'quo-fe-calendar-c2', label: 'Set your availability' },
      { id: 'quo-fe-calendar-c3', label: 'Book and reschedule a survey as a customer' },
      { id: 'quo-fe-calendar-c4', label: 'Run the booking check SQL', trigger: 'copy:quo-fe-calendar-sql' },
    ],
  },
  {
    id: 'quo-fe-analytics',
    title: 'Build Messages, Analytics, Billing meters and the Agency switcher',
    outcome: 'Owners set their follow-ups and templates, see their quote-to-booking rate and sources, and watch their usage.',
    minutes: 90,
    xp: 60,
    blocks: [
      { type: 'callout', tone: 'eli5', title: 'Quote-to-booking rate', text: 'Out of every customer who saw a price, how many booked something? If 64 people got a price and 18 booked, that is 28%. It is the one number that tells an owner whether their prices and their follow-ups are working.' },
      { type: 'prompt', id: 'quo-fe-analytics-prompt', title: 'Paste into Claude Code', code: `Read @PRD.md sections 10, 15 and 17, @DESIGN_SYSTEM.md, and @DESIGN.md sections 7.7, 7.8, 7.9 and 7.10.

Build:
1. app/app/messages/page.tsx: Follow-ups (follow_up_rules steps editor, up to 4 steps, quiet hours, booking reminder hours), Templates (follow_up_rules.templates jsonb keyed by template name, with variable chips and SegmentCounter from lib/sms/segments.ts, which must match _shared/sms.ts segments() exactly; share the file through the same sync script as the pricing engine), Texting sender status card (reads sms_senders), Sent log (sms_log and email_log merged, newest 200).
2. app/app/analytics/page.tsx: every metric in PRD 17 from the lead_stats view, period chips, calculator filter, stat tiles, a leads vs bookings line chart (Recharts, two series, hairline grid, tabular axis labels), sources table, funnel per calculator.
3. app/app/billing/page.tsx (owner only): plan card, three UsageMeters from rpc('usage_summary'), plan comparison, Manage billing (Stripe portal), trial banner.
4. Agency: Settings > Businesses tab listing owned workspaces with "+ Add business" (rpc('create_workspace'), which raises business_limit_reached outside Agency: show "Add businesses on the Agency plan"). The sidebar switcher from the onboarding task switches profiles.current_workspace_id.
5. lib/plans.ts mirroring plan_limits() for display only, and usage emails at 80% and 100% triggered from _shared/meter.ts (dedupe per kind per month).
Then show me Analytics with at least 10 test leads (write scripts/seed-leads.ts that inserts realistic test leads with the secret key into MY workspace only, with statuses spread across the five).` },
      { type: 'steps', items: [
        'Run the seed script Claude Code wrote to add test leads to your own business.',
        'Open Analytics and check the quote-to-booking rate matches the SQL below.',
        'Open Messages, change follow-up step 1 to 3 hours, and edit the template until the counter says 2 segments. Shorten it back to 1.',
        'Open Billing and check the three meters show this month\'s usage.',
      ] },
      { type: 'code', id: 'quo-fe-analytics-sql', filename: 'check-analytics.sql', lang: 'sql', code: `-- The same numbers the Analytics page shows for the last 30 days.
select
  count(*) filter (where priced) as priced,
  count(*) filter (where priced and was_booked) as booked,
  round(100.0 * count(*) filter (where priced and was_booked) / nullif(count(*) filter (where priced), 0), 1) as booking_rate_pct,
  round(avg(won_value_cents) filter (where won) / 100.0, 2) as avg_job_value
from public.lead_stats
where created_at > now() - interval '30 days';

select lead_source, count(*) as leads, count(*) filter (where was_booked) as booked
from public.lead_stats group by 1 order by 2 desc;` },
      { type: 'mistakes', items: [
        { mistake: 'The booking rate on the page differs from the SQL.', fix: 'The page divided by all leads instead of priced leads. PRD 17 is the definition: booked over priced, for leads created in the period.' },
        { mistake: 'The segment counter says 1 segment but Twilio bills 2.', fix: 'A curly apostrophe or an emoji switched the message to UCS-2 (70 characters). The counter must check every character against the GSM-7 set, and templates should use straight quotes.' },
        { mistake: 'A team member sees Billing.', fix: 'Billing is owner only: hide the nav item for non-owners AND check the role in the page, then redirect.' },
      ] },
    ],
    checklist: [
      { id: 'quo-fe-analytics-c1', label: 'Copy the messages and analytics prompt', trigger: 'copy:quo-fe-analytics-prompt' },
      { id: 'quo-fe-analytics-c2', label: 'Seed test leads into your own business' },
      { id: 'quo-fe-analytics-c3', label: 'Edit a template and watch the segment counter' },
      { id: 'quo-fe-analytics-c4', label: 'Compare Analytics with the SQL', trigger: 'copy:quo-fe-analytics-sql' },
    ],
  },
]
