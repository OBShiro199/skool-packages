// Rota build PRD (PRD.md), part 1: product, architecture, routes, data model, state machines, rules.

export const buildPrd1 = `# Rota: build PRD

Version 1.0. Download this file, save it as \`PRD.md\` in the root of your project folder, and reference it in
Claude Code with \`@PRD.md\`. Claude Code reads it before every task. Where this file and your instinct disagree,
this file wins. The look and feel lives in \`@DESIGN_SYSTEM.md\` (the Quiet Precision base system) and \`@DESIGN.md\`
(Rota's accent and screens), the marketing page in \`@LANDING.md\`. Your \`CLAUDE.md\` should contain the line
\`UI rules: @DESIGN_SYSTEM.md @DESIGN.md\`.

## 0. How to use this document

- Read sections 1 to 5 once so you know what you are building, for whom, and which trade-offs were made.
- Sections 6 to 19 are the spec. Claude Code builds from them.
- Section 23 lists the build milestones. Do them in order. Do not start a milestone until the one before it
  passes its acceptance tests (section 22).
- Every new Claude Code session, say: "Read @PRD.md, @DESIGN_SYSTEM.md and @DESIGN.md. We are on milestone N.
  Plan first, then wait for my OK."
- Use Opus at high effort (\`/model opus\`, \`/effort high\`) for anything that touches the schema, RLS, publishing,
  Twilio, clock-in or Stripe. Medium is fine for UI copy and layout.
- Money is always integer cents (or pence). Times are always \`timestamptz\` in the database and shown in the
  location's own time zone. Never store "09:00" without a date and a zone.

## 1. Problem

Managers of cafes, gyms, salons and small clinics build next week's rota on a Sunday night. They copy last
week's spreadsheet, try to remember who said they could not do Thursday, text three people to cover a sick
day, then screenshot the result into a WhatsApp group. By Tuesday the screenshot is wrong and nobody knows
which version is real.

What they do today:
- **Spreadsheet or paper on the staff room wall.** Free, but every change means a new photo in the group chat.
  No warnings when someone is double booked or has had 6 hours' rest between a close and an open.
- **WhatsApp for swaps.** "Can anyone do my Saturday?" gets three replies and the manager finds out who
  actually came in when they check the till.
- **Big rota tools** (Deputy, 7shifts, Homebase, When I Work, RotaCloud). They work, but they are built for
  payroll departments: per-user pricing that climbs fast, a week to set up, and staff texting that is
  either missing, an add-on, or capped [verify each vendor's current plans].

The cost: a manager of a 20 person cafe spends about 3 hours a week building and fixing the rota and chasing
swaps. Over a month that is 13 hours, about $230 of a manager's time at $18 an hour, before counting the
shifts that go uncovered because a message was missed.

## 2. Ideal customer (ICP)

- **Who:** owner-managers and general managers of hospitality and fitness businesses with **5 to 50 staff**
  per site: independent cafes and coffee chains (1 to 5 sites), restaurants and bars, gyms and boutique
  studios (front desk, coaches, cleaners), hair and beauty salons, small physio and dental clinics
  (reception and assistants).
- **Shape:** hourly, part-time staff, many under 25, who live on their phones and do not check email.
  Shifts change weekly. Someone calls in sick every week.
- **Where:** UK first (rota is the UK word, and UK texting is one way with a business name as the sender),
  then US and Canada (two way texting from a verified toll-free number), then Ireland, Australia and NZ.
- **Pain trigger:** "I spent my whole Sunday on the rota and then two people swapped without telling me."
- **Will pay:** $39 to $149 per location per month if it saves the Sunday evening, cuts no-shows and the
  staff actually read their shifts. One covered shift a month that would otherwise have closed a till pays
  for the Starter plan.
- **Not for (v1):** hospitals and care homes (complex compliance, agency staff), retail chains with 200+
  sites, anyone who needs payroll run inside the tool, unionised workplaces with bidding rules.

## 3. The one core job

"I open next week, click **Draft with Claude**, fix three shifts, and press **Publish**. Every person gets a
text with their own shifts. When someone wants to swap, they ask in the app, the other person accepts, and I
approve with one tap. Two hours before each shift they get a reminder, and they clock in from their phone at
the door. At the end of the month I download a CSV for payroll."

Everything in v1 serves that paragraph. If a feature does not make building, publishing, swapping, reminding
or paying for shifts faster, it waits.

## 4. User stories

### Owner and manager (the paying side)
1. As an owner, I sign up, name my business, pick my country, add my first location with its time zone and
   opening hours, and add my job roles (Barista, Kitchen, Front desk) with default hourly rates in under
   5 minutes.
2. As an owner, I add more locations (paid per location) and assign managers to each one. A manager only
   sees and edits the locations they run.
3. As a manager, I invite staff by name with a phone number and/or email, pick their roles, locations,
   contract hours and hourly rate. They get a text and an email with a join link.
4. As a manager, I see staff availability (weekly pattern) and approved time off right in the rota builder.
5. As a manager, I build a week by dragging shifts onto people, copying last week, or applying a saved
   template, and I see conflicts as I go: double booked, outside availability, on holiday, less than 11
   hours' rest, over weekly hours, not trained for this role.
6. As a manager, I see wage cost per day and for the week against my labour budget, updating as I drag.
7. As a manager, I click **Draft with Claude**, optionally type a note ("Saturday is the street market, add
   one barista 10 to 4"), and get a full draft built from availability, roles and the last four weeks. I see
   what it changed and why before I apply it. Nothing is published until I press Publish.
8. As a manager, I publish the week. Each person gets one text and one email with their own shifts, not one
   per shift. If I change a published week, I press **Publish changes** and only the people affected hear
   about it.
9. As a manager, I post open shifts. Eligible staff (right role, right location) are told and can claim
   them. I approve the claim I want.
10. As a manager, I approve or decline swaps and cover requests in one inbox, with the conflict check
    already run for me.
11. As a manager, I approve or decline time off.
12. As a manager, I see who has clocked in, who is late, and any clock-in that happened far from the venue.
13. As a manager, I approve timesheets for a pay period and download a CSV for payroll.
14. As an owner, I see texts used this month against my plan, and I am warned at 80% before the cap.

### Staff member (free, mobile web)
15. As a staff member, I open the join link, create a login with my email (or a one-time link), confirm my
    phone number and choose whether I want texts.
16. As a staff member, I see my next shift at the top of the screen, my week below it, and the team rota.
17. As a staff member, I set my weekly availability and request time off.
18. As a staff member, I ask to swap a shift with a named colleague, or ask for cover from anyone eligible.
19. As a staff member, I accept or decline a swap someone asked me for.
20. As a staff member, I see open shifts I can do and claim one.
21. As a staff member, I get a text 2 hours before my shift (or at 9pm the night before an early start).
22. As a staff member, I clock in and out from my phone at work. If I am not at the venue it tells me.
23. As a staff member, I stop texts at any time from Settings (and, in the US, by replying STOP).

## 5. Scope decisions and trade-offs (and what breaks first)

The simplest architecture that works at 1,000 paying businesses. Each choice names what breaks first and
the fix, so you know where to look when it happens.

| Decision | What we chose | Why | What breaks first, and the fix |
|---|---|---|---|
| Tenancy | One Postgres, \`workspace_id\` on every row, RLS with \`is_workspace_member\`, \`has_workspace_role\`, \`can_manage_location\` | One database is cheap and simple. RLS means a bug in a page cannot leak another cafe's rota | Policy functions run per row on big tables. Fix: they are \`stable\` and indexed; at 1M+ shifts add a covering index on \`(location_id, starts_at)\` (already there) and keep week queries bounded by date |
| Staff app | Same Next.js app, a separate \`/s\` area designed for phones, installable as a home screen app | No app store review, one codebase, staff open a link from a text | No native push. Fix: SMS + email cover v1; add Web Push (VAPID) later, free |
| Rota storage | Real shifts with \`starts_at\`/\`ends_at\` timestamptz, grouped into a \`rota_weeks\` row per location per week | Overnight shifts, daylight saving and multi-site staff all work. Weeks give publish a clear unit | A shift that crosses Sunday night belongs to the week it starts in. Fix: the builder shows it on its start day with a "+1" end |
| Conflicts | One SQL function \`rota_conflicts(week)\` used by the builder, the AI draft check and Publish | The same rules everywhere, so the AI cannot sneak past what a human would be warned about | Recomputing on every drag is slow at 100 staff. Fix: the builder runs the same checks in TypeScript on the loaded week for instant feedback, and calls the SQL on save and before publish |
| Double booking | Hard block in the database (exclusion constraint on published shifts) | Even a bug cannot publish one person into two places at once | Two managers at two sites rota the same person. Fix: Publish shows the clash with the other site's name |
| Messages | An outbox table (\`notifications\`) with a dedupe key, filled by SQL functions and sent by one worker every minute | Publishing 40 people is 40 rows, not 40 slow API calls in one request. Dedupe keys make reminders impossible to double send | One worker sends about 100 to 150 messages a minute. Fix: run \`rt-notify\` twice a minute (a second cron offset by 30 s) or raise the batch; Twilio queues the rest |
| SMS sender, UK | Alphanumeric sender ID ("Rota", or the business name on Pro) through Twilio | Staff see who it is from, no number to rent, no carrier registration for most names | One way only: staff cannot reply STOP. Fix: every first text says how to stop, and Settings has a switch. Protected brand names need a Letter of Authorisation [verify] |
| SMS sender, US/Canada | One toll-free number, verified once by you for "shift notifications for staff of businesses using Rota", in a Twilio Messaging Service | No per-customer 10DLC brand and campaign fees; one verification covers every customer | Verification can take weeks [verify]. Fix: start it on day one of building; US trials use email until it is approved |
| SMS cost control | Caps per plan in \`usage_ledger\`, set at the UK price; US/Canada get 4 times the allowance | UK texts cost about $0.05 each, US about $0.011 [verify], so a single cap would either bankrupt you in the UK or starve US users | A business that hits its cap stops getting texts. Fix: email and the app carry on, the meter warns at 80%, and reminders always go by email |
| AI drafting | One async job per draft: \`rt-draft\` queues, \`rt-worker\` calls Claude with structured JSON output, the server re-checks every assignment | A 40 person week takes 30 to 90 seconds to reason through. It must never sit in a browser request | Bad assignments. Fix: the server drops any assignment that breaks a hard rule (double booked, time off) and marks it open, and shows every warning before Apply |
| Clock-in | Browser geolocation, distance computed on the server, three modes per location: off, flag, require | No hardware, no app store. Flag mode never stops someone working | GPS can be faked on a rooted phone. Fix: we flag, never trust; managers approve timesheets. Selfie or QR clock-in is out of scope |
| Payroll | CSV export with a fixed column order, no payroll integration in v1 | Every payroll tool imports CSV. Integrations are a later milestone once customers name the tools | Column names differ by payroll tool. Fix: v1.1 adds saved column presets per tool |
| Billing | One Stripe subscription per business, quantity = number of locations | Matches how owners think ("$69 a site") and Stripe prorates when they add one | Owner adds a location in the app but not in Stripe. Fix: \`create_location\` refuses past the paid quantity and the dialog opens Billing |

## 6. Architecture

\`\`\`
  Manager (laptop)            Staff (phone, /s)                 Twilio            Resend
       |                            |                              ^  |              ^
       v                            v                              |  | status +     |
  +-------------------------- Next.js on Vercel ----------------+  |  | STOP/START   |
  |  /app/* manager shell     /s/* staff app      /join/[token]  |  |  v              |
  |  /api/staff/invite  /api/billing/*  /api/stripe/webhook      |  |                 |
  |  Server: supabase.auth.getClaims(), secret key only on server|  |                 |
  +------------------------------+------------------------------+  |                 |
                                 | supabase-js (publishable key + user JWT, RLS)      |
                                 v                                 |                 |
  +----------------------------- Supabase ----------------------------------------+
  |  Postgres + RLS: workspaces, locations, staff, staff_private, shifts,          |
  |  rota_weeks, swap_requests, time_entries, ai_drafts, notifications,            |
  |  usage_ledger, subscriptions ...                                               |
  |  SQL: rota_conflicts(), week_labour_cost(), publish_rota_week(),               |
  |       enqueue_shift_reminders(), plan_limits(), has_active_access()            |
  |  Realtime: shifts, ai_drafts, swap_requests, time_entries                      |
  |  Storage: exports/<workspace_id>/... (CSV, private)                            |
  |  pg_cron: rt-worker (1 min), rt-notify (1 min), reminders (5 min)              |
  |                                                                                |
  |  Edge functions:                                                               |
  |   rt-draft --> jobs --> rt-worker --> Claude API (structured JSON)             |
  |   rt-publish --> publish_rota_week() --> notifications (outbox)                |
  |   rt-notify  --> Twilio Messages API / Resend  ------------------------------->|
  |   rt-twilio-webhook <-- delivery status, inbound STOP/START (signature check)  |
  |   rt-swap, rt-clock, rt-timesheet-export                                       |
  +--------------------------------------------------------------------------------+
                                 ^
                                 | Stripe webhook (shared phase): subscriptions + quantity
\`\`\`

The flow for the core job:
1. Manager opens \`/app/rota\`, picks a location and next week. The builder loads shifts, availability, time
   off, roles and staff, and subscribes to Realtime on \`shifts\` filtered by \`week_id\`.
2. **Draft with Claude**: browser calls \`rt-draft\` (\`action: "request"\`). It checks the plan cap, writes an
   \`ai_drafts\` row and a \`jobs\` row, and returns at once. \`rt-worker\` picks the job within a minute, calls
   Claude, validates the JSON, re-checks every assignment against the rules and saves the result. The
   builder shows progress (live dot) through Realtime on \`ai_drafts\`.
3. Manager reviews the draft as a ghost layer over the grid, then **Apply** (\`rt-draft\`, \`action: "apply"\`)
   writes draft shifts.
4. **Publish**: \`rt-publish\` runs \`rota_conflicts\`, refuses "block" problems, then calls
   \`publish_rota_week\`, which flips shifts to published and writes one outbox row per person per channel.
5. \`rt-notify\` (every minute) claims due outbox rows, checks caps, opt-ins and quiet hours, renders the
   message, sends through Twilio or Resend, meters the cost and stores the provider id. Twilio posts delivery
   status to \`rt-twilio-webhook\`.
6. Every 5 minutes \`enqueue_shift_reminders()\` writes reminder rows for shifts in the next 26 hours, each
   with a dedupe key that includes the start time, so a moved shift gets a fresh reminder and the old one
   is skipped.
7. Staff swap through \`rt-swap\`, clock in through \`rt-clock\`. Managers export through \`rt-timesheet-export\`.

## 7. Routes and pages

### 7.1 Public and auth
| Route | What it is |
|---|---|
| \`/\` | Landing page (see \`@LANDING.md\`) |
| \`/pricing\` | Pricing section full width with the monthly/annual toggle |
| \`/login\`, \`/signup\`, \`/reset\` | Supabase email + password, plus "Email me a sign-in link". Confirm email is OFF for fast signup |
| \`/join/[token]\` | Staff invite. Shows business and location name, then sign up or log in, phone confirm and the texting opt-in, then calls \`accept_staff_invite\` |
| \`/onboarding\` | Owner: business name, country and currency, first location (name, time zone, opening hours), job roles, then "Invite your team" |
| \`/paywall\` | Shown when \`has_active_access\` is false: trial ended or payment failed. Owner sees Checkout; managers and staff see "Ask the owner to update billing" |
| \`/docs\` | Public help articles (also linked in-app) |

### 7.2 Manager app (\`/app\`, owners and managers)

Left sidebar, one level, in this exact order. Top group: logo, location switcher, then core pages. Bottom
group, always in this order: Documentation, Help, Billing, Settings.

| # | Sidebar item | Route | Who | What |
|---|---|---|---|---|
| 1 | Rota | \`/app/rota\` | owner, manager | Week builder for the selected location. Sub-routes: \`/app/rota/[weekStart]\`, \`/app/rota/templates\` |
| 2 | Requests | \`/app/requests\` | owner, manager | One inbox with tabs: Swaps and cover, Open shift claims, Time off. Badge with the pending count |
| 3 | Staff | \`/app/staff\` | owner, manager | Team list, invite, profile side panel (roles, locations, rate, contract hours, availability, contact, texting status) |
| 4 | Timesheets | \`/app/timesheets\` | owner, manager | Who is on now, clock-ins for a period, approve, export CSV |
| 5 | Documentation | \`/app/docs\` | all | Short how-to articles with GIFs |
| 6 | Help | \`/app/help\` | all | Contact form (writes to your support inbox through Resend), status, keyboard shortcuts |
| 7 | Billing | \`/app/billing\` | owner only (hidden for managers) | Plan, locations paid vs used, texts and AI drafts used this month, Manage in Stripe, Add a location |
| 8 | Settings | \`/app/settings\` | owner, manager (some tabs owner only) | Tabs: Business, Locations, Job roles, Managers, Texting, Notifications, Profile |

Above the bottom group sits a small usage meter: "Texts 62 of 100" with the system meter colours (accent,
amber under 20% left, coral under 5%).

### 7.3 Staff app (\`/s\`, staff role; managers can open it too to see what staff see)
Phone first. A bottom tab bar with five tabs, no sidebar.

| Tab | Route | What |
|---|---|---|
| Shifts | \`/s\` | Next shift card (with Clock in when it is within the window), my week, toggle to team rota \`/s/team\` |
| Open | \`/s/open\` | Open shifts I am eligible for, with Claim |
| Clock | \`/s/clock\` | Big Clock in / Clock out button, current entry timer, location check result |
| Requests | \`/s/requests\` | My swaps and cover requests, requests sent to me, time off. New request buttons |
| Me | \`/s/me\` | Availability (\`/s/me/availability\`), phone and texting switch, email, Help, log out, switch business |

### 7.4 Server routes (Next.js)
| Route | What |
|---|---|
| \`POST /api/staff/invite\` | getClaims, calls \`invite_staff\` with the user's JWT (RLS and role checks run), then with the secret key inserts the invite outbox rows (\`kind: invite\`, sms and/or email) whose payload carries the raw token. \`rt-notify\` blanks the token after sending |
| \`POST /api/staff/[id]/resend\` | \`reissue_staff_invite\`, then new invite outbox rows. Rate limit 3 per staff per day |
| \`POST /api/billing/checkout\`, \`/api/billing/portal\` | Shared phase. Checkout passes \`quantity\` = active locations (min 1) |
| \`POST /api/billing/locations\` | Owner only. \`stripe.subscriptions.update(id, { items: [{ id: itemId, quantity }], proration_behavior: 'create_prorations' })\`. The webhook then writes \`subscriptions.quantity\` |
| \`POST /api/stripe/webhook\` | Shared phase. Also stores \`items.data[0].quantity\` into \`subscriptions.quantity\` and \`price.id\` into \`price_id\` |

## 8. Data model

All tables are in the migration (\`sql\` block in this kit). Summary:

| Table | Key columns | Notes |
|---|---|---|
| \`profiles\` | id, full_name, current_workspace_id | One per login |
| \`workspaces\` | name, owner_id, country, currency, sms_sender_id, overtime_hours_week, min_rest_hours, clock_in_early_minutes | The business. Defaults: UK 48 h week and 11 h rest; US/CA 40 h and 8 h |
| \`workspace_members\` | workspace_id, user_id, role (owner, manager, staff) | One owner per workspace |
| \`locations\` | name, timezone, address, lat, lng, geofence_mode, geofence_radius_m, weekly_budget_cents, opening_hours | Paid per active location |
| \`location_managers\` | location_id, user_id | Which managers run which sites |
| \`job_roles\` | name, hue (one of 8 tag hues), default_rate_cents | Colour of shift chips |
| \`staff\` | full_name, user_id (null until joined), status, contract_hours_week, max_hours_week, invite_token_hash | Visible to everyone in the business (names only) |
| \`staff_private\` | email, phone_e164, sms_opt_in, sms_opted_out_at, email_opt_out, hourly_rate_cents, payroll_id, manager_notes | Managers and the person only |
| \`staff_locations\`, \`staff_roles\` | links | Eligibility for shifts |
| \`availability_rules\` | weekday (1 = Monday), start_time, end_time, kind (available, preferred, unavailable), effective_from/to | Weekly pattern |
| \`time_off\` | starts_on, ends_on, reason, status | Guard trigger: staff cannot approve their own |
| \`rota_templates\`, \`template_shifts\` | weekday, start_time, end_time (end before start = next day), role_id, staff_id, headcount | "A normal week" |
| \`rota_weeks\` | location_id, week_start (a Monday), status, publish_version | Unique per location per week |
| \`shifts\` | week_id, staff_id (null = open), role_id, starts_at, ends_at, break_minutes, notes, status, source, published_snapshot | Exclusion constraint: no overlapping published shifts per person |
| \`swap_requests\` | shift_id, from_staff_id, kind (swap, cover), to_staff_id, to_shift_id, status, expires_at | Written by \`rt-swap\` only |
| \`open_shift_claims\` | shift_id, staff_id, status | Written by \`rt-swap\` only |
| \`time_entries\` | clock_in_at, clock_out_at, in/out lat, lng, accuracy, distance, geofence_flag, status, idempotency_key | Written by \`rt-clock\`; managers approve. GPS evidence cannot be edited |
| \`timesheet_exports\` | period, storage_path, row_count | CSV in the \`exports\` bucket |
| \`ai_drafts\` | week_id, status, instructions, result, warnings, cost_usd_micros | Draft never touches shifts until Apply |
| \`jobs\` | kind, ref_id, status, attempts, run_after, idempotency_key | Background queue |
| \`notifications\` | kind, channel, dedupe_key, send_after, status, provider_id, segments, error_code | The outbox for every SMS and email |
| \`sms_opt_events\`, \`twilio_events\` | | STOP/START log, Twilio callback de-duplication |
| \`usage_ledger\` | kind (sms_segments, ai_drafts, emails), quantity, cost_usd_micros, idempotency_key | The meter |
| \`email_log\`, \`rate_limits\`, \`subscriptions\` (+ quantity), \`stripe_events\`, \`plan_prices\`, \`workspace_limit_overrides\` | | Same pattern as every kit |

**Staff screens read from \`published_snapshot\`.** When a manager edits a published shift it goes back to
\`draft\` until re-published, but staff can still read the row. The staff app must render the snapshot values
(\`staff_id\`, \`starts_at\`, \`ends_at\`, \`role_id\`, \`break_minutes\`, \`notes\`) for any row whose status is
\`draft\`, and hide rows whose snapshot has \`cancelled: true\`. Put this in one helper, \`lib/staffView.ts\`,
and use it everywhere in \`/s\`.

## 9. State machines

### 9.1 Rota week
\`\`\`
 (none) --create--> draft --rt-publish--> published --any shift edit--> draft (publish_version > 0:
                                                                        "Publish changes" button)
\`\`\`
- \`publish_version\` counts publishes. Version 1 sends \`rota_published\` to everyone with shifts. Later
  versions send \`shift_changed\` only to people whose shifts were added, moved, reassigned or cancelled.
- A week with \`publish_version > 0\` is visible to staff; a never-published week is not.

### 9.2 Shift
\`\`\`
 draft --publish--> published --edit--> draft (snapshot kept) --publish--> published
   |                   |
   | delete            | delete in builder (soft): cancelled --publish--> cancelled (snapshot.cancelled = true)
   v                   v
 (gone)            staff told "cancelled"
\`\`\`
- Browser inserts are always \`draft\` (guard trigger). Only \`publish_rota_week\` sets \`published\`.
- Deleting a shift that was ever published turns it into \`cancelled\` so the person is told.
- Shifts that ended more than a day ago are locked; corrections happen on the timesheet.

### 9.3 Swap and cover
\`\`\`
 swap:   pending_peer --peer accepts--> pending_manager --manager approves--> approved (shifts exchanged)
              |              |                 |
              | peer declines| from cancels    | manager declines
              v              v                 v
           declined      cancelled          declined
 cover to a named person:  same as swap, no second shift moves
 cover to anyone:          pending_manager immediately; eligible staff can "offer" (becomes to_staff_id)
 any pending + expires_at passed (shift start minus 2 h) --> expired
\`\`\`
- On approve, \`rt-swap\` re-runs the conflict checks for both people on the new arrangement. A "block"
  problem (double booked, time off) refuses the approval with the reason.
- An approved swap edits the shifts (so the week becomes "Publish changes") and \`rt-swap\` immediately calls
  \`publish_rota_week\` for that week so both people get a \`swap_decision\` and the rota is final. It only
  publishes when the week has no other unpublished edits; otherwise it tells the manager "Swap approved.
  Publish changes to send it with your other edits."

### 9.4 Open shift claim
\`pending --manager approves--> approved\` (shift.staff_id set, other claims for that shift declined,
week republished as in 9.3), \`pending --decline--> declined\`, \`pending --staff withdraws--> withdrawn\`.
A location setting "Auto-approve the first eligible claim" (\`locations.auto_approve_claims\`, default off) skips the manager step
when the claim has no conflicts.

### 9.5 Time off
\`pending --> approved | declined\`, \`pending --> cancelled\` (by the person). Approved time off that overlaps
published shifts shows those shifts as conflicts in the builder; it does not delete them.

### 9.6 Time entry
\`\`\`
 open (clocked in) --clock out--> submitted --manager--> approved | rejected
   | forgot to clock out: at shift end + 4 h, rt-worker closes it at the scheduled end, flags it
\`\`\`

### 9.7 AI draft
\`queued --worker claims--> running --> ready --Apply--> applied\`, \`ready --> discarded\`,
\`running --error x3--> failed\`. Only one \`queued\` or \`running\` draft per week at a time.

### 9.8 Notification (outbox row)
\`\`\`
 queued --claimed--> sending --provider accepted--> sent --Twilio callback--> delivered | failed
   |                    |
   |                    +--> skipped (opted out, cap reached for SMS, shift changed, no contact)
   +--> (send_after in the future: waits)
\`\`\`
- Emails go \`sent\` on Resend's 200 and stay there (bounce webhooks are optional, M10).
- SMS failures with a permanent Twilio error (unsubscribed, invalid number, landline) are \`failed\` and
  the person's \`sms_opt_in\` is switched off with a note in the Staff panel. Temporary errors retry 3 times
  with backoff (1, 4, 16 minutes).

### 9.9 Job
\`queued --claim_jobs--> running --> done\`, on error back to \`queued\` with \`run_after = now() + 2^attempts
minutes + jitter\`, \`dead\` after 3 attempts. \`release_stuck_work()\` re-queues anything running for 10+ minutes.

## 10. Plans and limits

Prices are per location per month. Annual is 10 times the monthly price (two months free). Every plan has a
7 day free trial with a card (Stripe Checkout, \`subscription_data.trial_period_days: 7\`). Limits are pooled
across the business: a 3 location Team plan has 3 x 180 texts.

| | Starter | Team | Pro |
|---|---|---|---|
| Price per location | $39 / month, $390 / year | $69 / month, $690 / year | $149 / month, $1,490 / year |
| Staff per location | 15 | 40 | 100 |
| Texts per location per month (UK and most countries) | 100 | 180 | 400 |
| Texts per location per month (US and Canada) | 400 | 720 | 1,600 |
| Claude drafts per location per month | 6 | 10 | 12 |
| Emails and in-app messages | Unlimited (fair use) | Unlimited | Unlimited |
| Rota builder, templates, conflicts, cost per day | Yes | Yes | Yes |
| Swaps, cover, open shifts, time off | Yes | Yes | Yes |
| Clock-in from phone | Yes (no location check) | Yes, with geofence | Yes, with geofence |
| Timesheet CSV export | Yes | Yes | Yes |
| Text sender name | "Rota" | "Rota" | Your business name (UK and countries that allow it) |
| Trial (7 days) | 30 texts (120 US), 2 drafts | same | same |

- \`plan_limits(ws)\` in the migration is the single source of truth. \`lib/plans.ts\` mirrors it for the UI.
- Every edge function that spends money calls \`checkLimit\` before and \`meter\` after.
- Texts: one SMS segment = one text. Templates are written to fit one segment (160 GSM characters). A name
  with an emoji forces UCS-2 (70 characters a segment), so names are transliterated to GSM before sending
  and the body is cut to fit, ending in the app link.
- When texts run out: SMS outbox rows become \`skipped\` with \`error = 'cap_reached'\`, email still goes, the
  manager sees a banner "Texts paused until 1 Nov. Staff still get email and see changes in the app." and the
  owner gets one email.

## 11. Rota builder rules

### 11.1 Grid
- Rows: staff assigned to this location (active and invited), grouped by their first role, then an
  **Open shifts** row at the top. Columns: Monday to Sunday in the location's time zone, plus a left column
  with name, role tags and "hours this week / contract" (e.g. "32 / 40 h").
- Each cell holds 0 to 3 shift chips (more shows "+1"). A chip shows \`06:00 to 14:00\`, the role hue, a small
  dot if it has notes, and a conflict icon if any check fails.
- Availability shows as a faint background per cell: preferred (accent soft), unavailable (hatched ghost),
  time off (a "Holiday" tag across the days). Draft shifts have a dashed edge until published.
- Footer row: hours and wage cost per day, the week total, and a budget meter if \`weekly_budget_cents\` is set
  (daily budget = weekly / 7, or weighted by opening hours when they are set).

### 11.2 Interactions
- Drag a chip to another cell: moves it (same times, new day/person). Hold Alt (Option) while dropping:
  duplicates it. Drag from the Open shifts row onto a person: assigns. Drag onto Open shifts: unassigns.
- Click an empty cell: the "Add shift" popover with start, end (15 minute steps), break, role (filtered to
  the person's roles first), notes. Enter saves.
- Click a chip: the same popover to edit, plus Delete and "Make open".
- Keyboard: arrow keys move focus between cells, Enter opens the popover, Backspace deletes, Cmd/Ctrl+C and V
  copy a chip, Cmd/Ctrl+Z undo (last 20 actions, in memory).
- Library: \`@dnd-kit/core\`. Optimistic update, then write to Supabase. Every update sends
  \`.eq('updated_at', previousUpdatedAt)\`; if no row comes back another manager changed it first: reload the
  shift and show the toast "Someone else changed this shift. Showing the latest".
- Realtime: subscribe to \`shifts\` with filter \`week_id=eq.<id>\` and merge changes without re-animating rows.

### 11.3 Conflict checks (run in TypeScript live, and in SQL on save and Publish)
| Kind | Severity | Rule |
|---|---|---|
| overlap | block | Overlaps another non-cancelled shift for the same person at any location |
| time_off | block | Falls on a day of approved time off |
| availability | warn | Inside an "unavailable" window, or outside every "available" window when the person has set any |
| rest | warn | Less than \`min_rest_hours\` since their previous shift ended |
| hours | warn | Week total over \`overtime_hours_week\` or the person's \`max_hours_week\` |
| role | warn | The person does not hold the shift's role |
| open | info | No one assigned |

Publish refuses while any **block** remains: "2 shifts clash with another shift or approved holiday. Fix them
to publish." Warnings are shown in the Publish dialog with a count and can be published anyway.

### 11.4 Labour cost
\`hours = (ends_at - starts_at) - break_minutes\`; \`cost = hours x (staff rate or role default rate)\`. Shown in
the business currency, rounded to whole units in the footer, exact in the tooltip. Pay rules (overtime
multipliers, holiday pay, tips) are out of scope; the export carries hours and rate so payroll does the rest.

### 11.5 Copy, templates and the AI draft
- **Copy last week**: \`copy_week(from, to)\`, only into a week with no shifts yet (else "This week already has
  shifts. Clear it first or add shifts by hand.").
- **Apply template**: \`apply_template(template, week)\`; headcount 3 makes 3 shifts, the first keeps the
  template's named person, the rest are open.
- **Save as template**: from any week, writes the shifts as template rows (weekday, times, role, person).
- **Draft with Claude**: see 13.1 and 17. Shown as a ghost layer: new shifts with a dashed accent edge, a
  side panel listing "12 shifts, 2 left open, est. cost $3,412, 3 warnings", each warning clickable.
  Apply replaces existing **draft** shifts in the week (published ones are never touched) and keeps any
  draft shift the manager pinned. Pins are a client-side list per week (a pin icon on the chip); the browser
  sends the pinned shift ids with the request, the worker passes them to Claude as fixed, and Apply skips them.

## 12. Messaging: SMS (Twilio) and email (Resend)

### 12.1 What is sent, when, on which channel
| Kind | Trigger | SMS | Email | Quiet hours |
|---|---|---|---|---|
| invite | Manager invites or resends | if phone given | if email given | Deferred to 08:00 |
| rota_published | First publish of a week | if opted in | yes | Deferred to 08:00 |
| shift_changed | Re-publish affecting this person | if opted in and the change is within the next 7 days | yes | Deferred to 08:00 unless the shift starts within 12 h |
| shift_cancelled | Covered by shift_changed in v1 (the message lists the cancelled shift) | | | |
| shift_reminder | 2 h before start, or 21:00 the evening before when 2 h before falls between 22:00 and 07:00 | if opted in | yes | Built into the timing |
| open_shift | New open shift on publish | no (email + app) | yes | Deferred to 08:00 |
| swap_request | Someone asks you to swap or cover | if opted in | yes | Deferred to 08:00 |
| swap_decision, claim_decision, time_off_decision | Manager decides | if opted in | yes | Deferred to 08:00 |
| cover_needed | A cover request with no named person | no | managers of the location | none |
| draft_ready | AI draft finished | no | the manager who asked (only if they left the page) | none |

Quiet hours are 22:00 to 08:00 in the location's time zone; "deferred" means \`rt-notify\` moves \`send_after\`
to 08:00 local and leaves the row queued.

### 12.2 SMS rules
- **UK, Ireland and most of Europe**: send with \`From\` set to the alphanumeric sender (\`workspaces.sms_sender_id\`,
  default "Rota"). 3 to 11 characters, letters, digits and spaces, at least one letter, no generic words like
  INFO or NOTIFY (networks may block them). One way: replies are not received. Brand names protected by the
  UK Mobile Ecosystem Forum need a Letter of Authorisation sent to Twilio before use [verify the current
  process in Twilio's UK guidelines].
- **US and Canada**: send with \`MessagingServiceSid\` (your Messaging Service, whose sender pool holds your
  verified toll-free number). Twilio's default opt-out handling replies to STOP, HELP and START for you;
  \`rt-twilio-webhook\` also records them in \`sms_opt_events\` and updates \`staff_private.sms_opt_in\`.
- **Other countries**: off in v1. The phone field accepts only the business's country code, and Twilio Geo
  Permissions are set to the countries you sell in, which also blocks SMS pumping to premium numbers.
- Every SMS body starts with the business name in the first words so staff recognise it, fits one segment,
  and ends with a short link to the app. The first text a person ever gets (the invite) includes how to stop.
- Template examples (all under 160 characters with a 20 character business name):
  - Invite: \`Cafe Luna: join your team rota: rota.app/join/<43 character token> Stop texts any time in the app.\`
  - Published: \`Cafe Luna rota w/c 20 Oct: Mon 06:00-14:00, Wed 09:00-17:00, Sat 10:00-18:00. See it: rota.app/s\`
  - Changed: \`Cafe Luna: your shifts for w/c 20 Oct changed. Now: Mon 06:00-14:00, Thu 12:00-20:00. rota.app/s\`
  - Reminder: \`Cafe Luna: you're on today 14:00-22:00 (Barista). Clock in: rota.app/s/clock\`
  - Reminder (night before): \`Cafe Luna: reminder, you're on tomorrow 06:00-14:00 (Barista). rota.app/s\`
  - Swap ask: \`Cafe Luna: Priya asks to swap her Sat 09:00-17:00 for your Sun 12:00-20:00. Reply in the app: rota.app/s/requests\`
- Links: \`/join/[token]\` and \`/s\` on your own short domain. The invite token is 43 characters, so with a
  domain under 12 characters the invite stays inside one segment. \`lib/sms.ts\` has a \`fitSegment(body)\` test
  for every template with a 30 character business name.
- Meter: \`usage_ledger\` kind \`sms_segments\`, quantity = Twilio's \`num_segments\` from the create response
  (fall back to your own count), cost from \`SMS_COST_MICROS_PER_SEGMENT\` per country (default 60,000 for GB,
  11,300 for US/CA) so the dashboard shows real money. Idempotency key \`sms:<notification_id>\`.

### 12.3 Email rules
- Resend, from \`EMAIL_FROM\` (e.g. \`Rota <shifts@rota.app>\`), \`reply_to\` the location manager's email.
  Plain, short, one button, React Email templates (see \`@DESIGN.md\` section 13).
- Every email has an unsubscribe link (one-click, signed token) that sets \`staff_private.email_opt_out\`.
  Invites and decisions about your own requests still send (they are what you asked for).
- Meter \`emails\` with cost 400 micro-dollars each (Resend Pro $20 for 50,000).

## 13. Clock-in and the geofence

### 13.1 Rules
- Clock in is allowed from \`clock_in_early_minutes\` (default 15) before a published shift's start until its end.
  Clocking in with no shift is allowed (marked "Unscheduled") so managers can approve it.
- The phone sends \`{ lat, lng, accuracy }\` from \`navigator.geolocation.getCurrentPosition\` with
  \`enableHighAccuracy: true, timeout: 10000, maximumAge: 0\`. If the person refuses location, send no
  coordinates.
- The server computes \`distance_m(location, phone)\` and decides:
  - \`off\`: always accept, store the coordinates if given, no flag.
  - \`flag\` (default when the location has coordinates): accept; \`geofence_flag = true\` when there are no
    coordinates, when \`distance - min(accuracy, 100) > radius\`, or when accuracy is worse than 500 m.
  - \`require\`: refuse with 403 \`outside_geofence\` when \`distance - min(accuracy, 100) > radius\` or there are
    no coordinates: "You're about 1.2 km from Luna Shoreditch. Clock in when you get there, or ask your
    manager." Accuracy worse than 500 m is accepted with a flag (indoor GPS is often poor).
- Setting the venue position: Settings > Locations > "Use my current position" (stand in the venue and
  tap it) or type the address and drag the pin on a static map (OpenStreetMap tiles, no API key needed in
  v1). Radius 50 to 2,000 m, default 150 m.
- Every clock request has an \`Idempotency-Key\` header (a UUID made when the button is pressed) stored as
  \`time_entries.idempotency_key\`, so a double tap or a retry on bad signal never makes two entries.

### 13.2 Timesheets
- Period picker (this week, last week, this month, custom up to 62 days), per location.
- Columns: person, date, role, scheduled, clocked in, clocked out, break, paid hours, flags (late more than
  5 min, early leave, unscheduled, away from venue, auto-closed), status.
- Approve all clean rows (no flags) in one click; flagged rows need one by one.

## 14. Timesheet CSV export

\`rt-timesheet-export\` writes \`exports/<workspace_id>/<location_id>/<period_start>_<period_end>_<timestamp>.csv\`
and returns a signed URL valid for 10 minutes.

Columns, in this order, UTF-8 with a BOM so Excel opens accents correctly:
\`\`\`
payroll_id,staff_name,location,date,role,scheduled_start,scheduled_end,clock_in,clock_out,break_minutes,paid_hours,hourly_rate,gross_pay,currency,status,flags
\`\`\`
- Times as \`YYYY-MM-DD HH:MM\` in the location time zone. \`paid_hours\` to 2 decimals from approved clock times
  (no-shows have no row; add them by hand on the timesheet if you pay them). \`gross_pay\` =
  paid_hours x hourly_rate, 2 decimals.
- Only \`approved\` entries by default; a checkbox includes submitted ones (status column says so).
- **CSV injection guard**: any cell that starts with \`=\`, \`+\`, \`-\`, \`@\`, tab or carriage return is prefixed
  with a single quote. Every cell is quoted and inner quotes doubled.
`
