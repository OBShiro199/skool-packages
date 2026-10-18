// Bookwell frontend tasks: the public booking flow and the owner screens.
import type { Task } from '../../types'
import { ck, code, eli5, mistakes, p, prompt, steps, task, tip } from './helpers'

export const frontendTasks: Task[] = [
  task({
    id: 'bw-fe-booking-page',
    title: 'Build the public booking page',
    outcome: 'A mobile-first page customers use to pick a service, a day and a slot, then pay the deposit.',
    minutes: 90,
    xp: 70,
    blocks: [
      eli5('Why is this page special?', 'Every other page needs a login. This one is for the barber\'s customers, who never sign up. So it cannot read the database directly. It asks an edge function "what is free on Tuesday?" and gets back only the times, never other people\'s names.'),
      prompt('bw-fe-booking-prompt', 'Paste into Claude Code', `
Read @PRD.md sections 6.1, 10 and 16.1, and @DESIGN_SYSTEM.md with @DESIGN.md sections 3, 4 and 15.

Build the public booking flow at app/b/[handle]/page.tsx with the step components in components/booking/:
ServiceStep.tsx, DayStep.tsx, SlotStep.tsx, DetailsStep.tsx, StepHeader.tsx, StickyPayBar.tsx, ShopHeader.tsx.
- The page is a server component. It loads the business and active services through lib/supabase/admin.ts (SUPABASE_SECRET_KEY, server only) and selects ONLY the public fields listed in PRD 16.1. Branding fields only when business_plan is studio. Hide deposit services while stripe_charges_enabled is false.
- One client component holds the step state. Keep ?s=<serviceId>&d=<date> in the URL with router.replace so back and refresh work.
- Day strip: next 14 days, scrolls to max_days_ahead. Disable closed weekdays and days off without calling the function.
- Slots: supabase.functions.invoke('bw-public-slots', { method: 'GET' }) is awkward for query strings, so call fetch(SUPABASE_URL + '/functions/v1/bw-public-slots?' + params) with the publishable key in the apikey header. SlotSkeleton after 200ms, at least 400ms, grid min-height reserved for 3 rows.
- Details: name, mobile with a country select (default from the business timezone), optional email, "Text me a reminder" switch on, PolicyLine with the refund rule. Inputs use 16px text (iOS zoom).
- Make one idempotencyKey with crypto.randomUUID() when Details opens and reuse it for every retry.
- StickyPayBar "Pay $10 deposit and book" (or "Book" when $0) POSTs to bw-create-booking and sets window.location to the returned url. 409 slot_taken: toast "That slot was taken a moment ago", reload slots, go back to the Time step. 402 paused or 409 payouts_not_ready: show the matching card.
- ?held=<id>: info box "Your slot is held for 30 minutes. Pay to keep it."
- Paused, not found and offline states from @DESIGN.md 4.7. Add noindex metadata to every /b route.
- Footer "Booking by Bookwell" linking to /?ref=<handle>, hidden only for Studio shops with hide_footer.
Test at 360px wide in Chrome DevTools device mode, then show me a screenshot.`),
      steps(
        'Make sure you have one service and some weekly hours, then run `npm run dev`.',
        'Find your computer\'s local IP (Mac: System Settings → Wi-Fi → Details → IP address. Windows: run `ipconfig`). On your phone, on the same Wi-Fi, open http://YOUR-IP:3000/b/your-handle.',
        'Pick a service and a day. Check the slots match your hours and that the bar at the bottom never jumps.',
        'Tap a slot, fill in your details and tap the pay button. You should land on Stripe Checkout (test mode).',
      ),
      code('bw-fe-booking-sql', 'Supabase SQL Editor: check the hold', 'sql', `
-- The booking you just started should be pending with a hold 30 minutes ahead
select service_name, status, starts_at, hold_expires_at, blocked_until
from public.bookings order by created_at desc limit 3;`),
      mistakes([
        { mistake: 'All slots show an hour off.', fix: 'Times are being shown in your laptop\'s timezone. Ask Claude Code: "Format every slot with Intl.DateTimeFormat using the business timezone, not the browser timezone."' },
        { mistake: 'Page shows other customers\' names in the network tab.', fix: 'The edge function is returning whole booking rows. Ask Claude Code to return only an array of ISO start times.' },
        { mistake: 'The phone opens localhost and nothing loads.', fix: 'localhost on a phone means the phone itself. Use your computer\'s IP address, and run `npm run dev -- -H 0.0.0.0` so Next.js listens on the network.' },
      ]),
    ],
    checklist: [
      ck('bw-fe-booking-c1', 'Copy the booking page prompt into Claude Code', 'copy:bw-fe-booking-prompt'),
      ck('bw-fe-booking-c2', 'Open your booking page on a real phone'),
      ck('bw-fe-booking-c3', 'Check the slots match your hours'),
      ck('bw-fe-booking-c4', 'Check a pending hold with the SQL', 'copy:bw-fe-booking-sql'),
    ],
  }),
  task({
    id: 'bw-fe-owner',
    title: 'Build services, hours and the Bookings view',
    outcome: 'Owners can set up their business and see the day\'s bookings update live.',
    minutes: 70,
    xp: 55,
    blocks: [
      prompt('bw-fe-owner-prompt', 'Paste into Claude Code', `
Read @PRD.md sections 6.2, 6.3, 16.4, 16.5 and 16.6, and @DESIGN.md sections 3, 8, 9.1, 9.2, 9.3 and 23.
Build the owner pages inside the app shell (sidebar: Bookings, Services, Hours, Booking page, then the TextMeter, then Documentation, Help, Billing, Settings):
- app/app/services/page.tsx: table + Dialog (name, description, length, price, deposit Slider from 0 to price kept in sync with an input, buffer select, active Switch), drag to reorder (position), archive instead of delete when bookings exist.
- app/app/availability/page.tsx: seven HoursRows Monday to Sunday (weekday 0 is Sunday in the database) with several ranges per day, overlap validation, Days off with a date popover, and the Booking rules card (min notice, book up to, slot step, reminder hours).
- app/app/page.tsx: SetupChecklist until done, then Today, Upcoming grouped by DayHeader, and Past 30 days. BookingRow with the deposit and status tags in fixed columns.
  Row menu: Mark completed, Mark no-show (visibility hidden until the start time), Cancel and refund, Cancel and keep deposit (both call bw-booking-action), Copy manage link, Open in Google Calendar.
  Mark completed and no-show are direct updates through the browser Supabase client (RLS and the guard trigger allow only these).
- Supabase Realtime: subscribe to postgres_changes on bookings filtered by business_id; new rows rise once.
- When all five checklist rows are done, the card morphs into the share card: booking link, Copy, and a QR code from qrcode.react with a Download PNG button.
- TextMeter in the sidebar and the Bookings toolbar from the usage_this_month RPC.
All reads and writes go through the browser Supabase client. RLS scopes them to the owner's business.`),
      steps(
        'Add one service: "Skin fade", 45 min, $35, $10 deposit, 15 min buffer.',
        'Set Monday to Friday 09:00 to 17:00, and add a day off next week.',
        'Download the QR code from the share card and scan it with your phone camera.',
        'Open your booking page in another tab and book a $0 test service (make one with deposit $0). Watch it appear on the Bookings page without refreshing.',
      ),
      tip('Seed a fake booking', 'Ask Claude Code: "Insert two confirmed test bookings for tomorrow for my business using the Supabase MCP, with blocked_until set" so you can see the Today view without paying a deposit.'),
      code('bw-fe-owner-sql', 'Supabase SQL Editor: check your setup', 'sql', `
select s.name, s.minutes, s.price_cents, s.deposit_cents, s.buffer_minutes, s.active
from public.services s order by s.position;

select weekday, start_time, end_time from public.availability order by weekday, start_time;`),
      mistakes([
        { mistake: 'Mark no-show fails with "A booking can only be marked no-show after it starts".', fix: 'That is the database protecting you. The button should be hidden until the start time; ask Claude Code to hide it with visibility: hidden before starts_at.' },
        { mistake: 'Saving hours says "permission denied".', fix: 'The insert is missing business_id, so the RLS check fails. Ask Claude Code to include the owner\'s business id on every availability row.' },
        { mistake: 'Sunday hours show on Monday.', fix: 'The database uses 0 for Sunday. Ask Claude Code to map Monday to 1 and Sunday to 0 in one helper and use it everywhere.' },
      ]),
    ],
    checklist: [
      ck('bw-fe-owner-c1', 'Copy the owner pages prompt', 'copy:bw-fe-owner-prompt'),
      ck('bw-fe-owner-c2', 'Add a service and weekly hours'),
      ck('bw-fe-owner-c3', 'Scan your QR code with your phone'),
      ck('bw-fe-owner-c4', 'See a test booking appear live on the Bookings page'),
    ],
  }),
  task({
    id: 'bw-fe-done-manage',
    title: 'Build the confirmation and manage pages',
    outcome: 'Customers see "You\'re booked" only after Stripe confirms, and can cancel or reschedule from their text.',
    minutes: 50,
    xp: 45,
    blocks: [
      eli5('Why wait on the done page?', 'When Stripe sends the customer back, the payment may not be recorded yet. Stripe tells your webhook a second later. So the done page asks "is it confirmed yet?" every 2 seconds instead of believing the address bar. A fake success link can never confirm a booking.'),
      prompt('bw-fe-done-manage-prompt', 'Paste into Claude Code', `
Read @PRD.md sections 9.3, 16.2 and 16.3 and @DESIGN.md sections 5 and 6.
1. app/b/[handle]/done/page.tsx: reads b and t from the URL, calls bw-manage-booking { token: t, action: 'get' }. While pending, poll every 2 s for 30 s with the "Confirming your payment" live status (reserve the final layout's height). Confirmed: the tick, "You're booked", the summary in the shop timezone, "Add to calendar" and "Get directions". Late: the late message from @DESIGN.md 5.
2. app/b/[handle]/done/ics/route.ts: GET with b and t, checks the token matches the booking, returns text/calendar with one VEVENT (UID booking id @ your domain, DTSTART and DTEND in UTC, SUMMARY "<service> at <shop>", LOCATION address, URL manage link).
3. app/b/cancel/[token]/page.tsx: calls get, shows the summary, the PolicyLine for now, and Reschedule plus Cancel booking. Cancel uses one dialog that morphs to the result. Reschedule reuses DayStep and SlotStep for the same service and calls action 'reschedule'. 409 slot_taken: toast and reload slots.
4. Past, cancelled or expired: summary with the tag and "Book again".
No customer phone or email ever appears on these pages.`),
      steps(
        'Make a test booking with card 4242 4242 4242 4242. Watch the done page switch from "Confirming" to "You\'re booked".',
        'Tap "Add to calendar" on your phone and check the time is right.',
        'Open the manage link from the confirmation text, move the booking to another slot, then cancel it.',
      ),
      mistakes([
        { mistake: 'The done page says "You\'re booked" even with the webhook turned off.', fix: 'It is trusting the URL. Ask Claude Code: "The done page must only show confirmed when bw-manage-booking returns status confirmed."' },
        { mistake: 'The .ics file opens an hour off on iPhone.', fix: 'DTSTART must be UTC with a Z at the end (20261103T143000Z). Ask Claude Code to format both times in UTC.' },
        { mistake: 'Rescheduling by 15 minutes says the slot is taken.', fix: 'The booking is clashing with itself. Ask Claude Code to leave the current booking out of the busy list when computing reschedule slots.' },
      ]),
    ],
    checklist: [
      ck('bw-fe-done-manage-c1', 'Copy the done and manage prompt', 'copy:bw-fe-done-manage-prompt'),
      ck('bw-fe-done-manage-c2', 'See the done page switch to "You\'re booked" after paying'),
      ck('bw-fe-done-manage-c3', 'Add a booking to your phone calendar from the .ics'),
      ck('bw-fe-done-manage-c4', 'Reschedule and cancel a test booking from the manage link'),
    ],
  }),
  task({
    id: 'bw-fe-settings',
    title: 'Build Settings, the Booking page screen and branding',
    outcome: 'Owners connect Google and payouts in one place, copy their link and QR code, and Studio shops add their logo.',
    minutes: 60,
    xp: 50,
    blocks: [
      prompt('bw-fe-settings-prompt', 'Paste into Claude Code', `
Read @PRD.md sections 8.3, 8.4, 16.7 and 16.8 and @DESIGN.md sections 3, 9.4 and 9.6.
1. app/app/settings/page.tsx with the Business, Connections, Cancellation policy, Notifications and Danger zone cards.
   - Google card: Connect calls bw-google-oauth ?action=start and redirects to the returned url. Disconnect POSTs { action: 'disconnect' }. Status tag from businesses.google_status.
   - Payouts card: Connect payouts and Finish setup call bw-connect-onboard { action: 'link' }. On ?payouts=return or ?payouts=refresh call { action: 'status' } (and 'link' again for refresh). Show requirementsDue as "2 items left".
   - Text messages card: the TextMeter and "Texts are sent by Bookwell for you."
   - Turn the ?google= and ?payouts= query flags into toasts, then clean the URL with router.replace.
   - Danger zone: type the handle to delete. Cancel future bookings with refunds first (loop bw-booking-action), then delete the business.
2. app/app/page/page.tsx (Booking page): link with Copy, QrCard (qrcode.react) with Download PNG (1024 px canvas) and Download poster (app/api/qr/poster/route.ts with pdf-lib, A4, @DESIGN.md 18), and a PhonePreview iframe of /b/<handle>?preview=1.
3. Studio branding: logo upload to the logos bucket at <business_id>/logo.png (resize to 256 px in the browser, max 1 MB, PNG or JPG, upsert true), colour swatches plus a hex input, the "Show Booking by Bookwell" switch. Solo sees them disabled with "Included in Studio".
4. Handle change: warn that the old link and QR stop working, then update businesses.handle (the unique index rejects taken handles: show "That link is taken").`),
      steps(
        'Open Settings and click Connect Google Calendar. Tick both boxes on Google\'s screen.',
        'Click Connect payouts and finish Stripe test onboarding (use the test data Stripe offers on each screen).',
        'Open Booking page, download the QR code and scan it with your phone camera.',
      ),
      code('bw-fe-settings-sql', 'Supabase SQL Editor: check the connections', 'sql', `
select handle, google_status, google_email, stripe_account_id, stripe_charges_enabled, logo_path, brand_hex
from public.businesses;`),
      mistakes([
        { mistake: 'Uploading a logo says "new row violates row-level security policy".', fix: 'The path must start with your business id: <business_id>/logo.png. Ask Claude Code to build the path from the loaded business id, not the user id.' },
        { mistake: 'Payouts stay on "Finish setup" after finishing Stripe onboarding.', fix: 'The account.updated event did not reach bw-connect-webhook. Check the Connect webhook endpoint in Stripe has "Listen to events on Connected accounts" on, then press "Finish setup" once to run the status check.' },
        { mistake: 'Owners can still edit stripe_account_id in the browser console.', fix: 'They cannot: the column grants in the SQL block it. Try it and you get "permission denied". If it works, re-run section 12 of the SQL.' },
      ]),
    ],
    checklist: [
      ck('bw-fe-settings-c1', 'Copy the settings prompt', 'copy:bw-fe-settings-prompt'),
      ck('bw-fe-settings-c2', 'Connect Google Calendar and payouts from Settings'),
      ck('bw-fe-settings-c3', 'Download the QR poster PDF'),
      ck('bw-fe-settings-c4', 'Check both connections with the SQL', 'copy:bw-fe-settings-sql'),
    ],
  }),
  task({
    id: 'bw-fe-plans',
    title: 'Add the Solo and Studio plans, the text meter and the no-show report',
    outcome: 'Each plan gets its own text cap and features, owners see their usage, and Studio shops get the no-show report.',
    minutes: 45,
    xp: 45,
    blocks: [
      p('The shared Payments phase builds one Checkout and one webhook. Bookwell has two plans with monthly and yearly prices, so you add four price ids and teach the webhook which plan each one is.'),
      prompt('bw-fe-plans-prompt', 'Paste into Claude Code', `
Read @PRD.md sections 14, 16.9 and 18 and @DESIGN.md sections 9.5 and 9.7.
1. lib/plans.ts (server only): PLANS = { solo: { name: 'Solo', monthly: 19, yearly: 190, texts: 300 }, studio: { name: 'Studio', monthly: 39, yearly: 390, texts: 600 } } and planForPrice(priceId) using STRIPE_PRICE_SOLO_MONTHLY, STRIPE_PRICE_SOLO_YEARLY, STRIPE_PRICE_STUDIO_MONTHLY, STRIPE_PRICE_STUDIO_YEARLY.
2. app/api/stripe/checkout/route.ts: accept { plan: 'solo' | 'studio', interval: 'month' | 'year' } and pick the matching price id. Keep the 7-day trial.
3. app/api/stripe/webhook/route.ts: wherever it upserts subscriptions, also set plan = planForPrice(price_id) and cancel_at_period_end.
4. app/app/billing/page.tsx: the plan box, the TextMeter with "Resets on 1 <next month>", the two plan boxes with the Monthly / Yearly toggle ("2 months free"), "Switch to Studio" (Customer Portal or Checkout) and "Manage billing".
5. app/app/reports/page.tsx: Studio only (check business_plan server side). Month picker, four stat boxes, the no_show_report RPC table, Download CSV. Solo: the blurred preview and "Upgrade to Studio".
6. Fire upgrade_clicked with a location property from the meter, the reports page and the branding card.`),
      steps(
        'In Stripe (test mode) → Product catalogue → your Bookwell product → add prices: Solo $19 monthly and $190 yearly, Studio $39 monthly and $390 yearly. Copy each price id (starts with `price_`).',
        'Paste the four ids into `.env.local` and Vercel env with the names in the prompt.',
        'Start a Studio trial with a second test account and open Reports.',
      ),
      code('bw-fe-plans-env', '.env.local (add these lines)', 'env', `
STRIPE_PRICE_SOLO_MONTHLY=price_xxx
STRIPE_PRICE_SOLO_YEARLY=price_xxx
STRIPE_PRICE_STUDIO_MONTHLY=price_xxx
STRIPE_PRICE_STUDIO_YEARLY=price_xxx`),
      code('bw-fe-plans-sql', 'Supabase SQL Editor: check plan and usage', 'sql', `
select user_id, status, plan, price_id from public.subscriptions order by updated_at desc limit 3;
select * from public.usage_this_month((select id from public.businesses limit 1));`),
      mistakes([
        { mistake: 'Everyone shows as Solo after upgrading.', fix: 'The webhook is not setting plan. Ask Claude Code to log planForPrice(price_id) in the webhook and check the four env names match exactly.' },
        { mistake: 'Yearly checkout charges $19.', fix: 'The toggle is not sent to the checkout route. Check the request body has interval: "year".' },
      ]),
    ],
    checklist: [
      ck('bw-fe-plans-c1', 'Create the four Stripe prices', 'copy:bw-fe-plans-env'),
      ck('bw-fe-plans-c2', 'Copy the plans prompt', 'copy:bw-fe-plans-prompt'),
      ck('bw-fe-plans-c3', 'Check plan and usage with the SQL', 'copy:bw-fe-plans-sql'),
      ck('bw-fe-plans-c4', 'Open the no-show report on a Studio test account'),
    ],
  }),
]
