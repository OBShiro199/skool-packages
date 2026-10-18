// Bookwell build PRD, part 1: problem, ICP, stories, architecture, routes, data model, state machines.

export const buildPrd1 = `# Bookwell: build PRD

Save this file as \`PRD.md\` in your project root. In Claude Code, refer to it as \`@PRD.md\`, for example:
"Read @PRD.md section 9.2 and build the bw-create-booking edge function." Build one milestone at a time
(section 21) and never paste the whole file with "build all of this".

## 0. How to read this PRD
- Sections 1 to 4 say who Bookwell is for and what it must do. Read them once.
- Sections 5 to 8 are the architecture: diagram, routes, data model and state machines.
- Section 9 is every edge function contract. Claude Code builds each one from its own prompt in the kit.
- Sections 10 to 19 are the rules that cut across everything: slots, money, texts, email, limits,
  security, analytics.
- Sections 20 to 22 are acceptance tests, milestones and what is out of scope.
- Words in \`code\` are exact names: tables, columns, routes, env vars, functions. Use them as written.

## 1. Problem
Barbers, personal trainers, tutors, nail techs and massage therapists take bookings over Instagram DMs,
WhatsApp and phone calls. Three things go wrong every week:
1. **No-shows.** Nothing is at stake for the customer, so 1 in 10 bookings does not turn up. A barber
   charging $35 who loses four slots a month is down $140, or $1,680 a year.
2. **Double booking.** The DMs, the paper diary and the Google Calendar on their phone never agree.
3. **Reminding by hand.** Ten texts every evening, sent from a personal phone, unpaid.

Calendly is built for sales calls between offices. Fresha, Booksy and Square Appointments are built for
salons with staff, marketplaces and point of sale. A one-person shop wants five things: a link, a deposit,
a reminder text, its own Google Calendar kept in charge, and no double bookings. Bookwell does those five
things and nothing else, for $19 a month.

## 2. Ideal customer profile (ICP)
- **Who:** solo or two-chair local service businesses. Barbers, personal trainers, tutors, nail techs,
  lash artists, massage therapists, dog groomers, driving instructors.
- **Where they live:** their phone. Instagram for marketing, WhatsApp for chat, Google Calendar for the day.
- **Volume:** 30 to 150 appointments a month, average price $25 to $80.
- **Pain signal:** an Instagram bio that says "DM to book" or "WhatsApp to book", or a Google Maps
  listing with a phone number and no booking link.
- **Budget test:** they pay $19 a month if it saves one no-show a month. They will not pay for features
  they do not understand.
- **Not for (v1):** salons with several staff calendars, gyms selling class packs, clinics needing
  intake forms, anyone on Outlook or Apple Calendar only.

## 3. The one core job
"Give me a link for my Instagram bio. People pick a slot, pay a deposit, get a text reminder, and it
lands in my Google Calendar."

Every screen either sets this up (services, hours, connections) or shows its result (bookings). If a
feature request does not serve this sentence, it goes in section 22 (out of scope).

## 4. User stories

### 4.1 Owner (the paying customer)
| # | As an owner I want to... | So that... | Done when |
|---|---|---|---|
| O1 | sign up and pick a handle like \`faderoom\` | I get \`bookwell.app/b/faderoom\` | handle is unique, 3 to 30 chars, lower case |
| O2 | add services with length, price, deposit and buffer | customers book the right amount of time | service list saves and shows on the public page |
| O3 | set weekly hours and days off | nobody books me on Sunday | slots never appear outside hours |
| O4 | connect Google Calendar once | my dentist appointment blocks slots | freeBusy busy blocks hide slots within 60 s |
| O5 | see each booking appear in my Google Calendar | I run my day from my phone's calendar | event created within 30 s of payment |
| O6 | connect Stripe payouts | deposits land in my bank, not Bookwell's | \`charges_enabled\` true on the connected account |
| O7 | see today's and upcoming bookings | I know who is next | Bookings page lists them in my timezone |
| O8 | mark a booking completed or no-show | I know who flakes | status changes, no-show count goes up |
| O9 | cancel a booking with an automatic refund | I can handle emergencies | refund created on my Stripe account, customer texted |
| O10 | download a QR code | I can print it for the shop window | PNG at 1024 x 1024 |
| O11 | see how many texts I have left this month | I am not surprised by the cap | meter on Bookings page and in the sidebar |
| O12 | (Studio) add my logo and brand colour | the page looks like my shop | logo and colour show on the public page |
| O13 | (Studio) see a no-show report | I can ask repeat flakers for a bigger deposit | report lists phone numbers with 2+ no-shows |
| O14 | set my cancellation window and refund rule | customers know the deal | rule shows on the booking page and in texts |

### 4.2 Customer (never logs in)
| # | As a customer I want to... | Done when |
|---|---|---|
| C1 | open the link on a cheap phone and see services | first paint under 2 s on 4G |
| C2 | pick a day and see only real free times | slots match hours minus bookings minus busy blocks |
| C3 | pay a small deposit with Apple Pay, Google Pay or card | Stripe Checkout on the shop's account |
| C4 | get a confirmation text straight away | text within 30 s of payment |
| C5 | get a reminder the day before | text 24 h before (or the shop's setting) |
| C6 | cancel or reschedule from the link in my text | manage page works without a login |
| C7 | reply C to cancel | booking cancelled, reply text confirms |
| C8 | reply STOP and never get another text | no further texts to that number from Bookwell |

## 5. Architecture

### 5.1 Diagram
\`\`\`
                         +----------------------------+
   Customer phone ------>|  Next.js on Vercel         |
   (no login)            |  /b/[handle]  /b/cancel/.. |
                         |  server reads public fields|
                         +-------------+--------------+
                                       | supabase.functions.invoke
                                       v
+------------------+     +----------------------------+      +-------------------+
| Owner browser    |---->|  Supabase Edge Functions   |----->| Google Calendar   |
| /app/* (login)   |     |  bw-public-slots           |      | freeBusy, events  |
| RLS-scoped reads |     |  bw-create-booking         |      +-------------------+
+--------+---------+     |  bw-manage-booking         |      +-------------------+
         |               |  bw-booking-action         |----->| Stripe (Connect)  |
         |               |  bw-google-oauth           |      | Checkout, refunds |
         |               |  bw-connect-onboard        |      +---------+---------+
         |               |  bw-connect-webhook  <-----+----------------+ webhooks
         |               |  bw-twilio-inbound   <-----+----------------+
         |               |  bw-reminders  <-- pg_cron every 15 min      |
         |               +-------------+--------------+      +---------+---------+
         |                             |                     | Twilio Messaging  |
         v                             v                     | Service (10DLC)   |
+----------------------------------------------------+       +-------------------+
| Supabase Postgres                                  |       +-------------------+
| businesses, services, availability, days_off,      |       | Resend (email)    |
| bookings (exclusion constraint), booking_events,   |------>| owner + fallback  |
| google_tokens, busy_cache, sms_messages,           |       +-------------------+
| sms_opt_outs, usage_ledger, email_log,             |
| subscriptions, stripe_events, rate_limits          |
| Storage: logos (public read, owner write)          |
+----------------------------------------------------+
          ^
          | app/api/stripe/webhook (Next.js, shared kit step)
   Stripe Billing (the $19 / $39 Bookwell subscription)
\`\`\`

### 5.2 Decisions and trade-offs
- **Two Stripe webhooks, two secrets.** The Bookwell subscription webhook is the shared Next.js route
  \`app/api/stripe/webhook\` from the Payments phase. Deposits happen on each shop's own Stripe account, so
  their events arrive on a separate Connect endpoint (\`bw-connect-webhook\`) with its own signing secret
  \`STRIPE_CONNECT_WEBHOOK_SECRET\`. Keeping them apart means a mistake in deposits can never touch billing.
- **Standard-style connected accounts with direct charges.** Each shop has a full Stripe account and
  dashboard, pays Stripe's card fee itself, and handles its own disputes. Bookwell pays no Connect fees and
  holds no money. Trade-off: less control over the onboarding look. Fine for v1.
- **One Twilio sender for every shop.** One Messaging Service with one or more local numbers, registered
  once for A2P 10DLC as Bookwell. Texts name the shop. Trade-off: one brand reputation for all shops, so
  marketing texts are banned (transactional only). What breaks first: daily throughput on a low-volume
  campaign, around 300 shops. Fix: move to a Standard campaign and add numbers to the sender pool.
- **The database is the referee for double booking.** A Postgres exclusion constraint makes two live
  bookings that overlap impossible, whatever the code does. Edge functions check first for a friendly
  message, but the constraint is the guarantee.
- **Google is cached, not trusted blindly.** freeBusy results are cached per business per day for 60 s in
  \`busy_cache\`. If Google fails, slots are computed without busy blocks (fail open) and the owner sees a
  "Calendar out of date" warning. Trade-off: a rare clash beats a booking page that shows nothing.
- **Everything slow runs off the request.** Text sends, calendar writes and emails after payment run inside
  the webhook with \`EdgeRuntime.waitUntil\` after the 200 is returned, and every step is idempotent so a
  Stripe retry repeats nothing. Reminders run from cron, never from a page view.
- **No LLM in v1.** Bookwell has no AI step, so there is no prompt and no prompt-injection surface. Customer
  names and notes are still treated as untrusted text: escaped in HTML, stripped of control characters in
  texts, and never put into SQL by hand.

### 5.3 What breaks first at 1,000 shops (and the fix)
| Load | At 1,000 shops | Breaks at | Fix |
|---|---|---|---|
| Texts | 60 bookings x 2 = 120,000 a month, about 4,000 a day | low-volume 10DLC daily cap | Standard campaign, 3 to 5 numbers in the Messaging Service pool |
| Google freeBusy | about 50,000 page views a day | per-minute project quota | \`busy_cache\` 60 s TTL, one call per business per day viewed |
| Reminder cron | about 45 reminders per 15 min run | none | batch of 200 per run, 10 at a time |
| Database | about 70,000 bookings a month | Micro compute at around 400 shops | Small compute, then Medium at 1,500 |
| Edge functions | slots calls are the hot path | cold starts | \`Cache-Control: max-age=30\` on slots, keep functions small |

## 6. Routes and pages

### 6.1 Public routes
| Route | Who | What it does |
|---|---|---|
| \`/\` | public | Landing page from \`@LANDING.md\` |
| \`/no-show-calculator\` | public | Free tool page (marketing) |
| \`/for/[trade]\` | public | Trade landing pages after launch (barbers, personal-trainers, tutors, nail-techs) |
| \`/login\`, \`/signup\` | public | Supabase auth (email + password, "Confirm email" off) |
| \`/b/[handle]\` | customer | Booking page: service, day, time, details, pay |
| \`/b/[handle]/done\` | customer | Confirmation, \`.ics\` download, polls until the webhook confirms |
| \`/b/cancel/[token]\` | customer | Manage page: see booking, cancel, reschedule (route name kept for SMS links) |
| \`/privacy\`, \`/terms\` | public | Plain pages linked from the footer and the Google consent screen |

### 6.2 Owner routes (logged in, paywalled except Billing and Settings)
| Route | Sidebar label | What it does |
|---|---|---|
| \`/onboarding\` | none | First run: business name, handle, timezone, phone, then the setup checklist |
| \`/app\` | Bookings | Today, Upcoming grouped by day, Past (last 30 days). Row actions. Text meter |
| \`/app/services\` | Services | List, add, edit, reorder, archive services |
| \`/app/availability\` | Hours | Weekly hours (several ranges per day), days off, booking rules |
| \`/app/page\` | Booking page | Link, Copy, QR code, preview, Studio branding (logo, colour, footer) |
| \`/app/reports\` | none (button on Bookings) | Studio: no-show report and monthly totals |
| \`/app/docs\` | Documentation | How-to articles: share your link, deposits, refunds, texts, Google |
| \`/app/help\` | Help | Contact form (writes to email via Resend), status of connections |
| \`/app/billing\` | Billing | Plan, texts used, upgrade, Customer Portal (shared kit step) |
| \`/app/settings\` | Settings | Business details, connections (Google, Stripe payouts, SMS), cancellation policy, notifications, danger zone |
| \`/paywall\` | none | Shared kit step: start or resume the subscription |

### 6.3 Sidebar (app shell)
One level, no nested menus, 8 items:
\`\`\`
[logo] Bookwell
  Bookings          /app
  Services          /app/services
  Hours             /app/availability
  Booking page      /app/page
  (spacer)
  [text meter: "212 of 300 texts this month"]
  Documentation     /app/docs
  Help              /app/help
  Billing           /app/billing
  Settings          /app/settings
\`\`\`
The bottom group is always Documentation, Help, Billing, Settings in that order. The text meter sits
above the bottom group with a fixed height so the nav never shifts.

### 6.4 Server routes in Next.js
| Route | Why it is in Next.js |
|---|---|
| \`app/api/stripe/checkout/route.ts\` | Shared kit step: Bookwell subscription Checkout, maps the 4 price ids |
| \`app/api/stripe/portal/route.ts\` | Shared kit step: Customer Portal |
| \`app/api/stripe/webhook/route.ts\` | Shared kit step: subscription events. Bookwell adds: set \`subscriptions.plan\` from the price id |
| \`app/b/[handle]/done/ics/route.ts\` | Builds the \`.ics\` file for "Add to calendar" from the booking id + token |
| \`app/api/qr/route.ts\` | Returns the QR code PNG for the owner's link (auth required) |

Everything that touches Google, Twilio or Connect lives in edge functions so the secrets sit in one place
(Supabase secrets).

## 7. Data model
All times are \`timestamptz\` in UTC. Each business has an IANA \`timezone\` and every display converts to it.
Money is integer cents in the business currency (\`currency\`, default \`usd\`).

### 7.1 Tables
| Table | Key columns | Notes |
|---|---|---|
| \`profiles\` | id (= auth user), full_name, referred_by | created by trigger on signup |
| \`businesses\` | id, owner_id (unique), name, handle (unique), timezone, currency, phone, address, logo_path, brand_hex, hide_footer, min_notice_minutes (120), max_days_ahead (60), slot_step_minutes (15), reminder_hours (24), cancel_window_hours (24), refund_policy, stripe_account_id, stripe_charges_enabled, google_status, google_email, google_calendar_id, notify_owner_email | one business per owner in v1 |
| \`google_tokens\` | business_id, refresh_token, access_token, access_token_expires_at, scope | secret key only, no policies |
| \`busy_cache\` | business_id, day, busy (jsonb), fetched_at | 60 s cache of Google freeBusy |
| \`services\` | id, business_id, name, description, minutes, price_cents, deposit_cents, buffer_minutes, position, active | deposit <= price |
| \`availability\` | id, business_id, weekday (0 Sunday to 6 Saturday), start_time, end_time | several rows per weekday allowed (split shifts) |
| \`days_off\` | id, business_id, day, reason | unique per business and day |
| \`bookings\` | id, business_id, service_id, service_name, starts_at, ends_at, blocked_until, customer_name, customer_phone, customer_email, sms_opt_in, status, hold_expires_at, deposit_cents, currency, stripe_checkout_id, stripe_payment_intent_id, refund_status, google_event_id, cancel_token, cancelled_by, cancel_reason, reminder_sent_at, reminder_attempts, idempotency_key, owner_note | the exclusion constraint lives here |
| \`booking_events\` | id, booking_id, business_id, type, data, created_at | audit trail of every state change |
| \`sms_messages\` | id, business_id, booking_id, kind, to_phone, body_chars, segments, twilio_sid, status, error_code | one row per text |
| \`sms_opt_outs\` | phone, opted_out_at, source | STOP replies, global for the Bookwell sender |
| \`inbound_sms\` | message_sid, from_phone, body, handled_as | de-duplicates Twilio inbound webhooks |
| \`usage_ledger\` | id, business_id, metric, qty, period_month, idempotency_key (unique), ref_id | every metered send |
| \`email_log\` | id, business_id, booking_id, template, to_email, resend_id, status, idempotency_key (unique), error | every email |
| \`rate_limits\` | key, window_start, hits | public endpoint throttling |
| \`subscriptions\` | user_id, status, price_id, plan, current_period_end, trial_end, cancel_at_period_end | shared billing table plus \`plan\` |
| \`stripe_events\` | id, type, account, received_at | de-duplicates both Stripe webhooks |

### 7.2 Why \`blocked_until\` exists
A 45 minute service with 15 minutes of buffer occupies 60 minutes. \`ends_at\` is what the customer sees
(14:30 to 15:15). \`blocked_until\` is \`ends_at + buffer\` (15:30). The exclusion constraint uses
\`tstzrange(starts_at, blocked_until, '[)')\`, so a booking can start exactly when the previous buffer ends.

### 7.3 Snapshot columns
\`bookings.service_name\`, \`deposit_cents\` and \`currency\` are copied at booking time. If the owner renames a
service or changes a price later, old bookings and texts still say what the customer bought.

### 7.4 What the browser can and cannot write
- Owners write \`services\`, \`availability\`, \`days_off\` directly through RLS.
- Owners update only safe columns of \`businesses\` (name, handle, timezone, phone, address, branding,
  booking rules, notifications). Column grants block \`stripe_account_id\`, \`stripe_charges_enabled\`,
  \`google_status\` and friends: only edge functions set those.
- Owners update only \`status\` (to \`completed\` or \`no_show\`) and \`owner_note\` on \`bookings\`. A trigger rejects
  any other transition. Cancelling goes through \`bw-booking-action\` because it must refund, delete the
  Google event and text the customer.
- Anonymous visitors cannot read or write any table. The public page goes through the server and edge
  functions with the secret key and returns only public fields.

## 8. State machines

### 8.1 Booking status
\`\`\`
                 deposit 0
   (insert) ------------------------------+
      |                                   v
      v        checkout.session.completed
   pending ------------------------------> confirmed ----> completed  (owner, or auto 48 h after end)
      |                                     |   |
      | hold_expires_at passed,             |   +--------> no_show    (owner, after starts_at)
      | or checkout.session.expired         |
      v                                     +------------> cancelled  (customer link, reply C, owner)
   expired
\`\`\`
| From | To | Who | Side effects |
|---|---|---|---|
| (new) | pending | bw-create-booking | hold 30 min, Checkout Session created |
| (new) | confirmed | bw-create-booking (deposit 0) | Google event, confirmation text |
| pending | confirmed | bw-connect-webhook | save payment intent, Google event, confirmation text, owner email |
| pending | expired | bw-reminders, bw-create-booking (stale holds), bw-connect-webhook (expired session) | slot frees |
| expired | confirmed | bw-connect-webhook (late payment, slot still free) | as confirmed |
| expired | (refund) | bw-connect-webhook (late payment, slot taken) | full refund, "slot was taken" text |
| confirmed | confirmed | bw-manage-booking (reschedule) | times change in place, Google event patched, text |
| confirmed | cancelled | bw-manage-booking, bw-twilio-inbound, bw-booking-action | refund per policy, Google event deleted, text |
| confirmed | completed | owner (browser), bw-reminders (auto) | none |
| confirmed | no_show | owner (browser), only after starts_at | counts in the no-show report |

Every transition writes a \`booking_events\` row (\`created\`, \`confirmed\`, \`expired\`, \`rescheduled\`,
\`cancelled\`, \`refund_requested\`, \`refunded\`, \`completed\`, \`no_show\`, \`sms_sent\`, \`sms_failed\`,
\`calendar_synced\`, \`calendar_failed\`).

### 8.2 Refund status
\`none\` -> \`pending\` -> \`refunded\` or \`failed\`. \`failed\` shows a red row badge and an email to the owner
with a link to the payment in their Stripe dashboard.

### 8.3 Google connection
\`disconnected\` -> (OAuth success) -> \`connected\` -> (invalid_grant on refresh, or revoked) -> \`error\`
-> (reconnect) -> \`connected\`. Owner disconnect -> \`disconnected\` and the token is revoked at Google.

### 8.4 Payouts (Stripe Connect)
\`not_started\` (no account) -> \`onboarding\` (account exists, \`charges_enabled\` false) -> \`ready\`
(\`charges_enabled\` true). \`account.application.deauthorized\` -> back to \`not_started\`. While not
\`ready\`, services with a deposit above $0 are hidden from the public page and the owner sees a banner.

### 8.5 Text message
\`queued\` (row inserted, usage consumed) -> \`sent\` -> \`delivered\`, or \`failed\` / \`undelivered\` with
\`error_code\`. Status comes from the Twilio status callback.

### 8.6 Subscription access
Owner app and the public page both need \`subscriptions.status in ('trialing','active')\`. When not, the
public page shows "Bookings are paused for this business" with the shop phone number, existing bookings
still get their reminder texts (the customer already paid), and no new bookings are accepted.
`
