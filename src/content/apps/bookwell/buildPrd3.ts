// Bookwell build PRD, part 3: page behaviour, security, analytics, env, acceptance tests, milestones.

export const buildPrd3 = `
## 16. Page behaviour in detail

### 16.1 \`/b/[handle]\` booking page
- Server component. Loads with the secret key, selecting only: business \`name\`, \`handle\`, \`timezone\`,
  \`currency\`, \`phone\`, \`address\`, \`refund_policy\`, \`cancel_window_hours\`, branding fields (only when the
  owner's plan is Studio), and active services \`id, name, description, minutes, price_cents,
  deposit_cents\` ordered by \`position\`.
- Services with a deposit are hidden while payouts are not ready. If none are left: "Online booking opens
  soon. Call {phone} to book."
- Steps: Service, Day, Time, Details. One client component holds the state; the URL keeps \`?s=<service>&d=<date>\`
  so the back button and a refresh land on the same step.
- Day strip: the next 14 days (scrolls to 60). Days with no hours or a day off are shown disabled without
  calling the function. Picking a day calls \`bw-public-slots\`.
- Details: name, mobile (country select defaulted from the business), optional email, "Text me a
  reminder" switch on, the refund line, then the sticky bar "Pay $10 deposit and book" (or "Book" when $0).
- Idempotency key: \`crypto.randomUUID()\` made when the Details step opens, sent with every retry of the
  same submit.
- \`?held=<id>\`: "Your slot is held for 30 minutes. Pay to keep it." with a "Pay deposit" button that calls
  \`bw-create-booking\` again with the same key (returns the same Checkout URL).
- \`paused\`: the page shows the paused card instead of steps.
- \`noindex\` meta on every \`/b/*\` page. Shop pages are shared by link, not found by search.

### 16.2 \`/b/[handle]/done\`
- Reads \`b\` and \`t\` (booking id and token) and calls \`bw-manage-booking\` \`get\`. While the status is
  \`pending\`, poll every 2 s for up to 30 s ("Confirming your payment..."). Never show "You're booked"
  from the URL alone.
- Confirmed: tick, "You're booked", service, day and time in the business timezone, address,
  "Add to calendar" (\`/b/[handle]/done/ics?b=..&t=..\`), and "Need to change it? Use the link in your text."
- Still pending after 30 s: "Payment received? It can take a minute. We will text you as soon as it is
  confirmed." The webhook still confirms it.

### 16.3 \`/b/cancel/[token]\`
- Calls \`bw-manage-booking\` \`get\`. Shows the booking, the refund rule result in plain words ("Cancel now
  and your $10 deposit is refunded" or "Cancelling now keeps the $10 deposit with Fade Room"), and two
  buttons: "Reschedule" and "Cancel booking".
- Reschedule reuses the Day and Time steps for the same service. Confirm button "Move to Tue 14:30".
- Cancel asks once in the same dialog (the dialog morphs, it does not stack a second one).

### 16.4 \`/app\` Bookings
- Toolbar (48px): search by customer name, a count "12 upcoming", the text meter, buttons "No-show report"
  (Studio, else opens an upgrade dialog) and "Copy booking link".
- Sections: Today, Upcoming (grouped by day headers), Past 30 days (collapsed).
- Row: time range, customer name, service, deposit badge (Paid, Refunded, No deposit, Refund failed),
  status tag, phone as a \`tel:\` link, row menu.
- Row menu: Mark completed, Mark no-show (only after start time), Cancel and refund, Cancel and keep deposit,
  Copy manage link, View in Google Calendar (when \`google_event_id\`).
- Live updates: Supabase Realtime on \`bookings\` filtered by \`business_id\` so a new booking appears without a
  refresh (row rises once).
- Setup checklist card replaces the empty state until done: Add a service, Set your hours, Connect Google
  Calendar, Connect payouts, Share your link.

### 16.5 \`/app/services\`
- Table: drag handle, name, length, price, deposit, buffer, active switch. "+ Add service" dashed row.
- Dialog: name, description (140 chars), length select (15 to 240 in 15 min steps, plus custom), price,
  deposit (slider and input, max = price), buffer (0, 5, 10, 15, 30), active.
- Archive instead of delete when bookings exist (\`active = false\`).

### 16.6 \`/app/availability\` Hours
- Seven weekday rows Monday to Sunday (stored 0 = Sunday). Toggle, then one or more ranges with start and
  end selects in 15 minute steps, "+ Add range" for split shifts.
- Days off: list with a date picker popover and an optional reason. Past days hidden.
- Booking rules card: minimum notice (0, 1, 2, 4, 12, 24 h), how far ahead (14, 30, 60, 90 days), slot step
  (15 or 30 min), reminder time (2, 12, 24, 48 h before).

### 16.7 \`/app/page\` Booking page
- Link with Copy, QR code preview with "Download PNG" and "Download print poster (A4 PDF)".
- Live preview of the public page in a phone frame (an iframe of \`/b/<handle>?preview=1\`).
- Studio: logo upload to the \`logos\` bucket (\`<business_id>/logo.png\`, max 1 MB, PNG or JPG, resized in the
  browser to 256 px), brand colour picker limited to pastel choices plus custom hex, "Show Booking by
  Bookwell" switch. Solo sees these controls disabled with "Included in Studio".
- Handle change: warns "Your old link and QR code will stop working."

### 16.8 \`/app/settings\`
- Business: name, handle, timezone, phone, address, currency (locked after the first paid booking).
- Connections: three cards with status tags.
  - Google Calendar: Connected as \`name@gmail.com\`, Disconnected, or Needs reconnecting. Buttons Connect,
    Reconnect, Disconnect. Calendar id select (primary by default).
  - Payouts (Stripe): Not started, Finish setup (with the requirements due count), Ready. Buttons Connect
    payouts, Finish setup, Open Stripe dashboard.
  - Text messages: "Texts are sent by Bookwell for you. 212 of 300 used this month." No button.
- Cancellation policy: window (2, 12, 24, 48 h) and refund rule radio.
- Notifications: email me for each new booking (switch).
- Danger zone: delete business (typing the handle), which cancels future bookings with refunds first.

### 16.9 \`/app/reports\` (Studio)
- Month picker. Totals: bookings, completed, no-shows, no-show rate, deposits taken, refunds.
- Repeat no-shows table: masked phone (\`+1 ••• ••• 4821\`), name used last, no-show count, last no-show date.
- Solo: the page shows an example with blurred numbers and "Upgrade to Studio".

### 16.10 \`/app/docs\` and \`/app/help\`
- Docs: 8 short articles rendered from markdown files in \`content/docs/\`: Share your link, Deposits and
  payouts, Refunds and cancellations, Text messages and limits, Google Calendar, Days off and hours,
  Changing your handle, Cancelling Bookwell.
- Help: form (topic select, message) that emails you through Resend with the user id and business handle,
  plus a status list of the three connections.

## 17. Security rules
1. RLS on every table. Per-operation policies. Anonymous gets nothing.
2. Column grants on \`businesses\` and \`bookings\` (section 7.4).
3. \`google_tokens\`, \`busy_cache\`, \`stripe_events\`, \`inbound_sms\`, \`sms_opt_outs\`, \`rate_limits\` have RLS on
   and no policies: only the secret key reaches them.
4. Internal SQL functions (\`try_consume_usage\`, \`refund_usage\`, \`hit_rate_limit\`, \`expire_stale_holds\`) are
   revoked from \`anon\` and \`authenticated\` and granted to \`service_role\` only.
5. Public functions return whitelisted fields only. A test checks the response has no \`phone\` or \`name\`
   keys.
6. Webhooks verify signatures on the raw body before parsing and de-duplicate by event id or MessageSid.
7. OAuth \`state\` is signed and expires in 10 minutes. The callback never trusts a business id that is not
   inside the signed state.
8. \`cancel_token\` is a uuid v4 and is never shown in the owner app list (only behind "Copy manage link").
9. Logo uploads: bucket policy limits writes to the owner's own folder, file size 1 MB, MIME types
   \`image/png\` and \`image/jpeg\`.
10. Customer names are escaped everywhere, stripped of control characters, limited to 80 chars, and never
    used in a text before the shop name (so a name cannot pretend to be the sender).

## 18. Analytics events
DataFast or PostHog, one \`track(name, props)\` helper, server events from route handlers.

| Event | Where | Properties |
|---|---|---|
| \`signup_complete\` | server | plan_interest, ref |
| \`business_created\` | onboarding | timezone, trade (optional select) |
| \`service_added\` | services | minutes, has_deposit |
| \`hours_saved\` | availability | days_open |
| \`google_connected\` | settings | none |
| \`payouts_ready\` | webhook | none |
| \`link_copied\` | page, bookings | location |
| \`qr_downloaded\` | page | format: png or pdf |
| \`booking_page_view\` | public page (server) | handle hash, ref |
| \`slot_selected\` | public page | days_ahead |
| \`checkout_started\` | bw-create-booking | deposit_cents |
| \`booking_confirmed\` | webhook | deposit_cents, minutes_to_start |
| \`booking_cancelled\` | functions | by: customer, owner, reply |
| \`no_show_marked\` | bookings | none |
| \`text_cap_hit\` | bw-reminders | plan |
| \`upgrade_clicked\` | meter, reports, page | location |
Activation metric: first confirmed booking from a real customer within 7 days of signup. Watch it weekly.

## 19. Environment variables
| Name | Where it lives | Used by |
|---|---|---|
| \`NEXT_PUBLIC_SUPABASE_URL\`, \`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY\` | \`.env.local\`, Vercel env | browser and server |
| \`SUPABASE_SECRET_KEY\` | \`.env.local\`, Vercel env | server components for the public page |
| \`NEXT_PUBLIC_APP_URL\` | \`.env.local\`, Vercel env | links |
| \`STRIPE_SECRET_KEY\` | \`.env.local\`, Vercel env, Supabase secrets | billing routes, Connect functions |
| \`STRIPE_WEBHOOK_SECRET\` | \`.env.local\`, Vercel env | subscription webhook (shared) |
| \`STRIPE_CONNECT_WEBHOOK_SECRET\` | Supabase secrets | \`bw-connect-webhook\` |
| \`STRIPE_PRICE_SOLO_MONTHLY\`, \`..._SOLO_YEARLY\`, \`..._STUDIO_MONTHLY\`, \`..._STUDIO_YEARLY\` | \`.env.local\`, Vercel env | checkout, plans |
| \`GOOGLE_CLIENT_ID\`, \`GOOGLE_CLIENT_SECRET\`, \`GOOGLE_REDIRECT_URI\`, \`OAUTH_STATE_SECRET\` | Supabase secrets | \`bw-google-oauth\`, slots, events |
| \`TWILIO_ACCOUNT_SID\`, \`TWILIO_AUTH_TOKEN\`, \`TWILIO_MESSAGING_SERVICE_SID\`, \`TWILIO_FROM_NUMBER\`, \`TWILIO_WEBHOOK_URL\` | Supabase secrets | SMS |
| \`RESEND_API_KEY\`, \`EMAIL_FROM\` | \`.env.local\`, Vercel env, Supabase secrets | email |
| \`CRON_SECRET\`, \`APP_URL\` | Supabase secrets | cron, links in texts |

## 20. Acceptance tests
Each test has a click path and the SQL to prove it. Run the SQL in Supabase, SQL Editor.

**A1. Owner setup in under 10 minutes.** Sign up, onboarding, add "Skin fade 45 min $35 $10 deposit
15 min buffer", hours Mon to Fri 09:00 to 17:00, connect Google, connect payouts in test mode.
\`\`\`sql
select b.handle, b.google_status, b.stripe_charges_enabled, count(s.*) services
from public.businesses b left join public.services s on s.business_id = b.id
group by b.id order by b.created_at desc limit 1;
\`\`\`
Expect \`connected\`, \`true\`, 1.

**A2. Slots respect hours, buffer and Google.** Add a 10:00 to 11:00 event in your Google Calendar for
tomorrow. Open \`/b/<handle>\`, pick the service and tomorrow. Expect 09:00 then 11:00 (09:15 to 10:00 are gone
because 45 + 15 minutes would hit the event), and no slot after 16:00.

**A3. Deposit booking end to end.** Book 11:00 with card \`4242 4242 4242 4242\`. Expect the done page to show
"You're booked" within 10 s, a Google event "Skin fade: Jordan", and a text.
\`\`\`sql
select status, deposit_cents, stripe_payment_intent_id is not null paid, google_event_id is not null synced
from public.bookings order by created_at desc limit 1;
select kind, status, segments from public.sms_messages order by created_at desc limit 1;
select metric, qty, idempotency_key from public.usage_ledger order by created_at desc limit 1;
\`\`\`

**A4. No double booking.** Two browsers, same slot, tap pay together. One goes to Stripe, the other sees
"That slot was taken a moment ago."
\`\`\`sql
select starts_at, count(*) from public.bookings
where status in ('pending','confirmed') group by business_id, starts_at having count(*) > 1;
\`\`\`
Expect 0 rows.

**A5. Abandoned checkout frees the slot.** Start a booking, close the Stripe tab. After 30 minutes (or after
running \`select public.expire_stale_holds(null);\` once the hold time has passed) the slot is back.

**A6. Reminder.** Make a booking 25 hours ahead. Temporarily set \`reminder_hours = 26\` for your business and
call \`bw-reminders\` with the cron secret. Expect one reminder text and \`reminder_sent_at\` set. Call it again:
no second text.

**A7. Reply C.** Reply "C" to the reminder. Expect "Cancelled: ..." back, status \`cancelled\`, refund created
(policy \`refund_if_early\`), Google event gone.

**A8. STOP.** Reply STOP. Make a new booking with the same phone. Expect no text and an email reminder if an
email was given.
\`\`\`sql
select phone, source from public.sms_opt_outs order by opted_out_at desc limit 1;
\`\`\`

**A9. Text cap.** Set the business plan to solo and insert 300 segments of ledger usage for this month with
SQL (Claude Code can do it with the MCP). Make a booking. Expect no text, an email fallback, and the
\`cap_100\` owner email once.

**A10. Paused business.** Set the owner's subscription status to \`canceled\`. The public page shows "Bookings
are paused for this business." Set it back.

**A11. Reschedule.** From the manage link, move the booking to another free slot. Expect the Google event time
to change and a reschedule text. Try to move it into a taken slot (by calling the function with curl):
409 \`slot_taken\`.

**A12. Owner cancel and refund.** Row menu, Cancel and refund. Expect \`refund_status\` \`pending\` then
\`refunded\` after the \`charge.refunded\` webhook.

**A13. Security.** Run \`scripts/security-check.ts\` from the security tasks. All PASS.

## 21. Build milestones
| # | Milestone | Hours | Done when |
|---|---|---|---|
| M1 | Auth, profiles trigger, onboarding with handle, app shell sidebar | 2 | \`/app\` loads with the 8-item sidebar |
| M2 | Services, hours, days off, booking rules | 2.5 | A1 minus connections passes |
| M3 | \`computeSlots\` with 8 tests, \`bw-public-slots\`, public page steps without payment | 3 | A2 passes without Google |
| M4 | Google OAuth, freeBusy with cache, event create, patch, delete | 2.5 | A2 passes with Google |
| M5 | Stripe Connect onboarding, \`bw-create-booking\`, \`bw-connect-webhook\`, done page | 3 | A3, A4, A5 pass |
| M6 | Twilio sends, status callback, inbound C and STOP, reminders cron, usage cap | 2.5 | A6 to A9 pass |
| M7 | Manage page, owner actions, refunds, emails | 1.5 | A11, A12 pass |
| M8 | Bookwell billing (shared steps), plan mapping, Studio branding and reports, landing page | 2 | A10 passes, landing live |
| M9 | Security checks, analytics, launch sweep | 1 | A13 passes |

## 22. Out of scope (v1)
- Several staff calendars in one business, group classes, packages, memberships, gift cards.
- Outlook, Apple Calendar or iCal feed import.
- Two-way SMS chat (only C, STOP, START and HELP are understood).
- Taking the full price as a separate later charge, partial refunds, tips.
- Reviews, waitlists, intake forms, recurring bookings.
- Marketing texts of any kind (the 10DLC campaign is transactional only).
- Native mobile apps. The owner app is a responsive web app.
- Any AI feature.

## 23. Definition of done
- A barber can set up in under 10 minutes and share \`/b/handle\`.
- A customer can book and pay a deposit on a phone in under 60 seconds.
- The booking appears in Google Calendar within 30 seconds and a reminder text arrives before the
  appointment at the shop's chosen time.
- Two customers cannot book the same slot (A4 shows 0 rows after the two-browser test).
- Every text is metered in \`usage_ledger\`, every email in \`email_log\`, and the cap stops sends server side.
- Every acceptance test in section 20 passes on the live domain in Stripe test mode, then once in live mode
  with a real $1 deposit you refund to yourself.
`
