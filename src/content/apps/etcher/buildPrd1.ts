// Etcher build PRD, part 1: product, architecture, routes, data model, state machines, telephony.

export const buildPrd1 = `# Etcher: build PRD

Save this file as \`PRD.md\` in your project root. In Claude Code, refer to it as \`@PRD.md\`
(for example: "Read @PRD.md section 9 and build the import flow"). Keep \`@DESIGN.md\`,
\`@DESIGN_SYSTEM.md\` and \`@LANDING.md\` next to it. Build one milestone at a time (section 24),
in plan mode, and run that milestone's acceptance tests before you move on.

## 0. One paragraph summary
Etcher is a B2B CRM for sales teams of 2 to 20 people: agencies, recruiters and small B2B
sales teams. People, companies and deals live in one fast, clean workspace with custom fields,
CSV import, pipelines as a kanban board, an activity timeline and tasks. The thing that sets it
apart from Attio and Pipedrive at this price: calling is built in. A rep clicks a phone number,
the call rings from the browser through Twilio, the conversation is recorded (with a consent
announcement), and the call, its outcome and the recording land on the person's timeline
automatically. One flat price: $149 a month or $949 a year, unlimited seats, 1,000 call
minutes a month included.

## 1. Problem
- Small sales teams pay per seat for a CRM ($29 to $100 per user per month) and then pay again
  for a dialer (Aircall, JustCall, Kixie, about $30 to $50 per user per month). A 6 person team
  pays $500 to $900 a month before anyone makes a sale.
- The CRM and the dialer never agree. Calls are logged by hand, or not at all, so the manager
  cannot see who is calling, how often, and what happens next.
- HubSpot is free to start and then pushes teams onto $90+ per seat tiers for basic pipeline
  reporting. Attio is beautiful but has no native calling. Close has calling but is built and
  priced per seat for call-heavy inside sales teams.
- Recruiters and agencies live on the phone. They need "click, call, log, move the deal" in
  under 10 seconds, not a 40 tab enterprise suite.

## 2. Ideal customer (ICP)
| Segment | Team size | What they call about | Why they switch |
|---|---|---|---|
| Recruitment agencies | 2 to 15 consultants | Candidates and hiring managers, 40 to 80 dials a day each | Per seat CRM + dialer costs, calls not logged against candidates |
| Marketing, dev and design agencies | 3 to 20 | New business, discovery calls, renewals | HubSpot price jump, want pipeline value and forecast |
| B2B sales teams (SaaS, services, wholesale) | 2 to 20 reps | Outbound prospecting and follow-ups | Need a dialer that logs itself, and a manager view of calls per rep |

Buyer: the founder, MD or head of sales. They decide in one call, pay by card, and want the
team live this week. Common trigger: the HubSpot renewal email, a new hire (seat price goes
up again), or a manager saying "I have no idea who called whom".

## 3. The one core job
"Show me everyone I should talk to, let me call them from the browser in one click, and have
the call, the outcome and the next step recorded on the right person and deal without typing."

Everything in v1 serves this loop:
\`\`\`
import leads -> pipeline -> click to call -> wrap-up (disposition + note + task) -> move the deal -> forecast
\`\`\`

## 4. User stories
### Owner / admin
1. As an owner I create a workspace, pick my team size and start a 7-day trial with a card.
2. As an admin I import 5,000 leads from a CSV, map columns, skip duplicates by email and
   company domain, and watch a progress bar while it runs.
3. As an admin I create pipelines from templates (agency, recruiting, B2B sales, partnerships),
   rename, add, reorder and recolour stages and set each stage's win probability.
4. As an admin I add custom fields (text, number, currency, date, select, multi-select, URL,
   email, phone, checkbox, user) to people, companies and deals.
5. As an admin I buy a local US or UK phone number inside Etcher and assign it to a rep, or
   connect our own Twilio account or SIP trunk instead.
6. As an admin I invite teammates by email as admin or member, change roles and remove people.
7. As an admin I turn call recording on, choose whether a consent announcement plays, and edit
   its wording.
8. As an admin I export people, companies, deals or calls to CSV and get an email with a link
   that expires in 24 hours.
9. As an owner I see billing, change plan, update my card and cancel in the Stripe portal.
10. As an owner I delete the workspace, or my own account, and Etcher removes the data.

### Rep (member)
11. As a rep I click a phone number anywhere in Etcher and the call starts in my browser with
    the right caller ID.
12. As a rep, when a call ends, a wrap-up panel asks for a disposition (connected, voicemail,
    no answer, meeting booked...), a note and an optional follow-up task, in 3 clicks.
13. As a rep I receive inbound calls to my assigned number in the browser, with the caller's
    name if they are already in Etcher.
14. As a rep I drag deals between stages on the kanban board, and close them as won or lost
    with a reason.
15. As a rep I see a timeline per person, company and deal: notes, logged emails, calls (with
    a play button for the recording), stage changes and tasks.
16. As a rep I get my tasks for today on the Tasks page, and an email reminder when one is due.

### Manager
17. As a manager I see pipeline value and weighted forecast per stage and per month.
18. As a manager I see win rate, average cycle time, revenue closed by month and calls per rep
    (dials, connects, talk time, meetings booked).
19. As a manager I get a Monday morning digest email of last week's numbers.
20. As a manager I read the audit log to see who deleted or exported what.

## 5. Architecture
\`\`\`
                 Browser (Next.js App Router, React, shadcn/ui, Quiet Precision UI)
                 |  @supabase/ssr session   |  @twilio/voice-sdk Device (WebRTC audio)
                 v                          v
   +--------------------------+     +-------------------------------+
   | Next.js on Vercel        |     | Twilio (one subaccount per     |
   | - pages + server actions |     |   workspace, or the customer's |
   | - /api/stripe/webhook    |     |   own account / SIP trunk)     |
   | - /api/stripe/checkout   |     | - TwiML App  -> twilio-voice   |
   +------------+-------------+     | - Numbers    -> twilio-voice   |
                |                   | - status cb  -> twilio-status- |
                | supabase-js       |                callback        |
                v                   | - recording  -> twilio-        |
   +------------------------------------------+    recording-callback|
   | Supabase                                  |<---+-----------------+
   | Postgres + RLS (workspace_id everywhere)  |
   | Storage: recordings / imports / exports   |
   | Realtime: deals, calls, jobs, activities  |
   | Edge functions (Deno):                    |
   |   twilio-token        twilio-voice        |
   |   twilio-status-callback                  |
   |   twilio-recording-callback (+ worker)    |
   |   buy-number          invite-member       |
   |   import-leads        export-leads        |
   |   send-email (Resend, React Email)        |
   | pg_cron + pg_net: workers and sweeps      |
   +------------------------------------------+
                |
                v
           Resend (email)          Stripe (Checkout, Portal, webhooks)
\`\`\`

### 5.1 Why this shape (the trade-offs)
- **One Postgres, workspace_id on every row, RLS for isolation.** Simplest thing that works at
  1,000 workspaces. Every policy calls \`is_workspace_member()\` or \`has_workspace_role()\`
  (security definer, \`set search_path = ''\`). What breaks first at scale: the timeline and
  kanban queries on very large workspaces (500k+ activities). Fix: the composite indexes in the
  migration already lead with workspace_id; next step is partitioning \`activities\` by month.
- **One Twilio subaccount per workspace** (created on first number purchase). Usage, numbers and
  recordings are separated per customer, a noisy or abusive workspace can be suspended alone,
  and the Twilio bill per customer is readable. Trade-off: one more set of credentials per
  workspace (stored encrypted, server only). Twilio allows 1,000 subaccounts by default
  [verify the current limit in your console]: ask Twilio support to raise it at about 800 workspaces.
- **Edge functions for every Twilio webhook**, not Next.js routes. Twilio needs a fast, always-on
  public URL with no cold start from a sleeping serverless region. Supabase edge functions sit
  next to the database, so a TwiML answer is one query away.
- **Async jobs for everything slow.** CSV import, CSV export, recording download and email sweeps
  are job rows with a status enum, retries with backoff and idempotency keys. The browser only
  ever creates a job and watches it through Realtime. No request runs longer than a few seconds.
- **Custom field values in a jsonb column** on each record (plus a \`custom_field_values\` view).
  Reads stay one query; filters use a GIN index. Trade-off: no foreign keys inside jsonb, so the
  app validates values against \`custom_field_defs\` with zod before saving.
- **No LLM in v1.** Column mapping in the import uses a header dictionary, which is free,
  instant and predictable. Section 19 specifies an optional v2 call summary feature with its
  prompt, JSON schema and injection guard, so you can add it later without redesign.

## 6. Pages and routes
All app routes live under \`/app\` and need a signed-in user who is a member of the current
workspace. Routes marked (paid) also need \`has_active_access(workspace_id)\`; without it the user
is sent to \`/app/billing\` with a banner. A lapsed workspace is read-only, never locked out of
its own data: the user can still read and export.

| Route | Who | What it does |
|---|---|---|
| \`/\` | public | Landing page (see @LANDING.md) |
| \`/pricing\`, \`/vs/attio\`, \`/vs/hubspot\`, \`/vs/pipedrive\`, \`/vs/close\` | public | Pricing and comparison pages |
| \`/login\`, \`/signup\`, \`/forgot\`, \`/reset\` | public | Supabase auth (email + password, Google optional) |
| \`/invite/[token]\` | public, then signed in | Shows workspace name and inviter, sign up or log in, then calls \`accept_invitation\` |
| \`/onboarding\` | signed in, no workspace | Step 1 workspace name, step 2 team size, step 3 start trial (Stripe Checkout) |
| \`/app\` | member | Home: onboarding checklist until done, then today (tasks due, calls today, pipeline snapshot) |
| \`/app/people\` | member (paid for writes) | Table of people: search, filter chips, saved views, bulk select |
| \`/app/people/[id]\` | member | Person record: fields left, timeline centre, deals and tasks right |
| \`/app/companies\` | member | Table of companies |
| \`/app/companies/[id]\` | member | Company record with its people, deals and timeline |
| \`/app/deals\` | member | Kanban (default) or table view, pipeline switcher, stage totals, forecast strip |
| \`/app/deals/[id]\` | member | Deal record: value, stage, owner, close date, timeline |
| \`/app/tasks\` | member | My tasks: overdue, today, upcoming, done; filter by assignee for admins |
| \`/app/calls\` | member | Call log: direction, person, rep, duration, disposition, recording; filters |
| \`/app/reports\` | member | Pipeline by stage, forecast, win rate, cycle time, calls per rep, revenue by month |
| \`/app/import\` | admin | Upload CSV, map columns, choose dedupe rule, run, watch progress, history |
| \`/app/docs\` | member | Documentation: getting started, importing, calling, recording consent, FAQ |
| \`/app/help\` | member | Help: contact form (Resend to support inbox), status of calling, keyboard shortcuts |
| \`/app/billing\` | owner, admin read | Plan, trial days left, minutes used this month, buy minute pack, Stripe portal |
| \`/app/settings\` | member | Tabs: Profile, Workspace, Members, Pipelines, Fields, Calling, Numbers, Data, Audit log |
| \`/paused\` | signed in | Shown when the workspace was deleted or suspended |

### 6.1 Sidebar (app shell)
One level, no nested menus. 240px wide, collapses to 56px icons under 1100px.
\`\`\`
[workspace switcher: logo + "Acme Recruiting" v]
  Home
  People
  Companies
  Deals
  Tasks
  Calls
  Reports
  ------------------------------- (pushed to the bottom)
  Documentation
  Help
  Billing
  Settings
[me: avatar, name, softphone status dot]
\`\`\`
- Import lives as a button on People and Companies toolbars and as a tab in Settings > Data,
  not in the sidebar (keeps it at 11 items with the bottom group).
- The workspace switcher opens a menu: list of my workspaces (current ticked), "Create
  workspace", "Invite teammates". Switching calls \`switch_workspace()\` and reloads \`/app\`.
- The softphone is not a page. It is a floating dock bottom right (see DESIGN.md) that lives in
  the app layout so a call survives navigation between pages.

### 6.2 Settings tabs
| Tab | Who edits | Contents |
|---|---|---|
| Profile | self | Name, avatar, timezone, email preferences (weekly digest, deal celebrations), change password, delete my account |
| Workspace | admin | Name, default currency, logo, delete workspace (owner) |
| Members | admin | Members table (role select, remove), pending invites (resend, revoke), invite form |
| Pipelines | admin | Pipeline list, rename, archive, stages editor (name, colour, win %, drag to reorder, add, delete when empty) |
| Fields | admin | Custom fields per object, drag to reorder, archive |
| Calling | admin | Telephony mode, recording on/off, consent announcement on/off + text, ring timeout, inbound fallback, UK compliance form |
| Numbers | admin | Owned numbers, assign to user, set default, buy number, release |
| Data | admin | Import history, export (people, companies, deals, calls, everything) |
| Audit log | admin | Filterable list: who, what, when, before/after diff |

## 7. Data model
The migration (\`supabase/migrations/0001_init.sql\`) is the source of truth. Summary:

| Table | Key columns | Notes |
|---|---|---|
| profiles | id (auth user), email, full_name, timezone, current_workspace_id, last_seen_at, email prefs | Created by trigger on auth.users |
| workspaces | id, name, slug, team_size, default_currency, record_calls, play_consent_announcement, consent_announcement, onboarding jsonb, deleted_at | Trigger adds owner member, default "Sales" pipeline with 6 stages, telephony row |
| workspace_members | (workspace_id, user_id), role enum member < admin < owner | Guard: only owners touch owner roles, never zero owners |
| invitations | email, role (not owner), token_hash (sha256), expires_at (7 days), accepted_at, revoked_at | One open invite per email per workspace |
| subscriptions | workspace_id PK, stripe ids, status, price_id, plan_interval, trial_end, current_period_end | Written only by the Stripe webhook |
| stripe_events | id PK, type | Webhook de-duplication |
| companies | name, domain (lower, no protocol), industry, owner_id, custom jsonb, deleted_at | Unique domain per workspace among live rows |
| people | first/last name, email (lower), phone (E.164), company_id, owner_id, do_not_call, custom, deleted_at | Unique email per workspace among live rows |
| custom_field_defs | entity (person/company/deal), key, label, field_type, options, position | Values live in each record's custom jsonb |
| custom_field_values (view) | entity, record_id, field_id, key, value | Unfolds jsonb for reports and export |
| pipelines | name, currency, is_default, position, archived_at | Max 20 per workspace |
| stages | pipeline_id, name, colour, win_probability, position, kind (open/won/lost) | Position unique per pipeline, deferrable |
| deals | pipeline_id, stage_id, value_cents, currency, status, person_id, company_id, owner_id, expected_close_date, close_reason, lost_reason_category, position, closed_at | Trigger syncs status from stage kind and writes timeline |
| activities | type (note, email, call, meeting, stage_change, deal_created, deal_won, deal_lost, task_done, import), links to person/company/deal/call, body, meta | The timeline |
| tasks | title, due_at, remind_at, assignee_id, links, status, completed_at | Reminders by email |
| workspace_telephony | mode, twilio_account_sid (AC), twiml_app_sid (AP), api_key_sid (SK), byoc_trunk_sid (BY), bundle status, recording and routing settings | Non-secret ids, members read |
| workspace_secrets | encrypted auth token and API key secret | RLS on, zero policies: secret key only |
| phone_numbers | twilio_sid (PN), e164, country, number_type, status, assigned_user_id, is_default | Bought through buy-number only |
| calls | twilio_call_sid (CA), direction, status, from/to, user_id, person/company/deal, answered_at, ended_at, duration_seconds, billable_minutes, disposition, notes, recorded, consent_played, last_sequence | Upserted by webhooks, wrapped up by the rep |
| recordings | twilio_recording_sid (RE), call_id, storage_path, status, attempts, next_attempt_at, twilio_deleted_at | Download queue + archive |
| import_jobs | file_path, mapping, dedupe (skip/update/create), counters, errors, cursor_row, status | Progress through Realtime |
| export_jobs | entity, filters, row_count, file_path, expires_at, emailed_at, status | Signed link valid 24h |
| audit_log | actor_id, action, entity, entity_id, before, after | Written by triggers, admins read |
| email_log | template, to_email, dedupe_key unique, resend_id, status | One send per dedupe key |
| usage_ledger | metric (call_minutes, number_month, recording_minutes, minute_pack, export, import_rows), quantity, cost_micros, idempotency_key unique | Metering and caps |
| api_rate_limits | bucket, window_start, count | Used by \`try_rate_limit()\` |

Money is always integer cents (\`value_cents bigint\`) plus an ISO currency code. Never floats.
Phone numbers are always E.164 (\`+447700900123\`). Parse with \`libphonenumber-js\` using the
workspace's default country when the user types a national number.

## 8. State machines
### 8.1 Deal
\`\`\`
            create (stage kind = open)
                  |
                  v
   +--------->  open  ----- drag to a "won" stage ----->  won
   |              |                                       |
   |              +------ drag to a "lost" stage ---->  lost
   |                                                      |
   +----------- drag back to an open stage (reopen) ------+
\`\`\`
- Status is never set directly by the app: it follows the stage's \`kind\` (trigger
  \`deals_before_write\`). Moving to Won or Lost opens the close dialog first (reason, lost
  category, final value), then saves the stage move and the reason in one update.
- Reopening clears \`closed_at\`. Every move writes a timeline activity (\`stage_change\`,
  \`deal_won\`, \`deal_lost\`) with from/to stage names.
- Soft delete (\`deleted_at\`) hides the deal. Admins see a "Deleted" filter and can restore
  for 30 days; \`purge_expired()\` deletes it for good after that.

### 8.2 Call (one row per Twilio parent call)
\`\`\`
 initiated -> ringing -> in-progress -> completed
     |           |            \\
     |           +-> busy / no-answer / canceled / failed
     +--------------------------------------------^
 completed -> (rep fills wrap-up) -> wrapped_up_at set
\`\`\`
- Twilio status callbacks can arrive out of order and more than once. Each carries a
  \`SequenceNumber\`; the handler ignores any event whose sequence is not greater than
  \`calls.last_sequence\`, except a terminal status, which always wins over a non-terminal one.
- Outbound calls from the browser have a parent call (browser to Twilio) and a child call
  (Twilio to the phone). Etcher stores the parent \`CallSid\` as \`twilio_call_sid\` and the child
  as \`child_call_sid\`. Duration and outcome come from the child (\`DialCallStatus\`,
  \`DialCallDuration\` on the \`<Dial action>\` callback).

### 8.3 Recording
\`\`\`
 Twilio "completed" callback -> pending (attempts 0) -> worker downloads mp3 -> uploads to
 Storage -> stored -> DELETE on Twilio -> twilio_deleted_at set
 pending -> attempt fails -> attempts+1, next_attempt_at = now + 2^attempts minutes (max 6)
 attempts = 6 -> failed (shown with "Retry" for admins)
 stored -> 365 days old -> purge deletes the file -> deleted
\`\`\`

### 8.4 Import job
\`\`\`
 queued -> running -> completed
    |         |  \\-> failed (file unreadable, over 50,000 rows, or 3 crashed runs)
    +---------+-> cancelled (admin clicks Cancel; worker stops at the next chunk)
\`\`\`
The worker handles 500 rows per run, saves \`cursor_row\` and counters, and the next run (pg_cron
every minute, or a self re-invoke) carries on. A crash mid-chunk re-processes that chunk; the
dedupe rules make that safe.

### 8.5 Export job
\`queued -> running -> completed (file + signed URL emailed) | failed\`. Files expire after
24 hours: \`expires_at\` is set, the signed link is created with \`expiresIn: 86400\`, and the
daily purge deletes the file.

### 8.6 Phone number
\`pending -> active -> released\` or \`pending -> failed\`. UK numbers stay unavailable until the
workspace's regulatory bundle is \`twilio-approved\`.

### 8.7 Subscription (workspace level)
Stripe statuses mirrored as-is. Access = \`trialing\` or \`active\`. \`past_due\` shows a red
banner and sends the "payment failed" email but keeps access for Stripe's retry window
(Stripe's Smart Retries, about 2 weeks by default); \`canceled\`, \`unpaid\`,
\`incomplete_expired\` make the workspace read-only.

## 9. Import (CSV)
1. Admin opens Import, drops a \`.csv\` up to 25 MB and 50,000 rows. The browser parses only the
   first 20 rows with Papa Parse to show a preview and headers. It never uploads parsed rows.
2. The file goes to Storage \`imports/<workspace_id>/<import_job_id>.csv\` (RLS: admins of that
   workspace only).
3. Column mapping: each CSV header gets a select (Etcher field, custom field, or "Don't
   import"). Auto-suggest from the dictionary below (lowercase, trim, strip punctuation).
   Mapping is required for at least one of email, first name, last name or company.

| Header contains | Maps to |
|---|---|
| email, e-mail, email address, work email | person.email |
| first, first name, given name, forename | person.first_name |
| last, last name, surname, family name | person.last_name |
| name, full name, contact name | split into first/last on the first space |
| phone, mobile, tel, telephone, cell, direct dial | person.phone (normalised to E.164) |
| title, job title, position, role | person.job_title |
| company, company name, organisation, organization, account | company.name |
| website, domain, url, company website | company.domain (stripped to host) |
| linkedin | person.linkedin_url |
| city, town / country | person.city / person.country |
| source, lead source | person.lead_source |
| owner, owner email, rep | person.owner_id (matched to a member's email) |

4. Dedupe rule (radio): **Skip** (default: existing email = leave it alone), **Update** (fill
   empty fields on the existing person, never overwrite non-empty ones), **Create anyway**.
   Companies always dedupe by domain; if no domain column, by the email's domain unless it is a
   free mail domain (gmail.com, googlemail.com, outlook.com, hotmail.com, yahoo.com, icloud.com,
   aol.com, proton.me, protonmail.com, live.com, msn.com, me.com, gmx.com), then by exact
   company name, case-insensitive.
5. Options: "Create companies from email domains" (on), "Assign owner" (select member),
   "Add to pipeline as deals" (off; if on, pick pipeline + first stage + default value).
6. Click **Import 4,812 people**. The browser inserts the \`import_jobs\` row (status queued)
   and calls \`import-leads\` with the job id. The page shows a progress bar driven by Realtime
   on that row: processed / total, inserted, updated, skipped, errors.
7. When done: a summary card, "Download error rows" (CSV of rows that failed, with a reason
   column), and an \`import\` activity on the workspace.

## 10. Calling (Twilio) in detail
### 10.1 Telephony modes (Settings > Calling)
| Mode | Who pays Twilio | How it works | Cap |
|---|---|---|---|
| \`etcher_subaccount\` (default) | You (the Etcher founder), included in the plan | Etcher creates a Twilio subaccount under your main account for the workspace, plus an API key and a TwiML App in it | 1,000 minutes/month + packs |
| \`own_twilio\` | The customer | Admin pastes their own Account SID (AC...), an API key SID (SK...) and secret, and Etcher creates a TwiML App in their account. Works with a subaccount of their own account too | None (metered for reports only) |
| \`byoc_trunk\` | The customer's carrier (plus Twilio's BYOC per-minute fee to the account holder) | Admin enters their SIP carrier's termination details; Etcher creates a BYOC trunk in the workspace's subaccount so calls route over their carrier | None for PSTN; Twilio BYOC fee metered at cost [verify the current BYOC rate] |

Elastic SIP Trunking (a customer's own phone system routing through Twilio) is not the same as
BYOC: Elastic SIP Trunking connects a PBX to the phone network and bypasses Programmable Voice,
so Etcher could not see or record the calls. Etcher supports BYOC (carrier into Programmable
Voice) and says so on the Calling page.

### 10.2 Provisioning (first time an admin clicks "Set up calling")
Done by the \`buy-number\` function, action \`setup\`, idempotent (safe to click twice):
1. If \`workspace_telephony.twilio_account_sid\` is empty: \`POST https://api.twilio.com/2010-04-01/Accounts.json\`
   with \`FriendlyName=etcher:<workspace_id>\` using your main account credentials. Save the
   subaccount SID; encrypt its \`auth_token\` with AES-GCM (key \`TELEPHONY_ENC_KEY\`) into
   \`workspace_secrets\`.
2. Create an API key in the subaccount: \`POST /2010-04-01/Accounts/{SubSid}/Keys.json\`
   (\`FriendlyName=etcher-voice\`). Save the SK sid, encrypt the secret (shown once).
3. Create a TwiML App: \`POST /2010-04-01/Accounts/{SubSid}/Applications.json\` with
   \`VoiceUrl=<SUPABASE_URL>/functions/v1/twilio-voice\`, \`VoiceMethod=POST\`,
   \`StatusCallback=<SUPABASE_URL>/functions/v1/twilio-status-callback\`. Save the AP sid.
4. Set \`workspace_telephony.status = 'ready'\`.

### 10.3 Outbound call (click to call)
\`\`\`
rep clicks +1 415 555 0134 on a person
 -> browser has a registered Device (token from twilio-token, refreshed before expiry)
 -> device.connect({ params: { To: '+14155550134', personId, dealId, fromNumberId } })
 -> Twilio POSTs to the TwiML App VoiceUrl = twilio-voice (From = client:u_<user id>)
 -> twilio-voice validates X-Twilio-Signature, checks member + access + minutes left + do_not_call,
    inserts the calls row (initiated), answers with TwiML:
      <Response>
        <Dial callerId="+14155550100" answerOnBridge="true" timeLimit="7200"
              record="record-from-answer-dual"            (only if recording is on)
              recordingStatusCallback=".../twilio-recording-callback"
              recordingStatusCallbackEvent="completed"
              action=".../twilio-status-callback?kind=dial">
          <Number url=".../twilio-voice?kind=consent"      (only if consent announcement is on)
                  statusCallback=".../twilio-status-callback?kind=child"
                  statusCallbackEvent="initiated ringing answered completed">+14155550134</Number>
        </Dial>
      </Response>
 -> callee answers, hears "This call may be recorded for training and quality." (the <Number url>
    TwiML plays to the called party before they are connected), then talks to the rep
 -> status callbacks update calls; the Dial action callback gives DialCallStatus + DialCallDuration
 -> on completed: billable minutes metered into usage_ledger (idempotency key call:<CallSid>)
 -> browser shows the wrap-up panel (disposition, note, follow-up task)
\`\`\`
- **Caller ID**: the rep's assigned number, else the workspace default number. A rep cannot
  pass an arbitrary caller ID: \`fromNumberId\` must be an active number of that workspace.
- **Do not call**: if the person has \`do_not_call = true\`, twilio-voice answers
  \`<Say>This contact is marked do not call.</Say><Hangup/>\` and the browser shows the reason.
- **Calling hours**: the browser warns (not blocks) when the callee's local time (from the
  number's country/area code) is before 08:00 or after 21:00.
- **Minutes left**: if \`minutes_status().left\` is 0, twilio-voice answers with a short
  \`<Say>\` and \`<Hangup/>\` and the browser shows "You have used this month's 1,000 minutes. Buy
  1,000 more in Billing." The meter is visible on the Calls page and in the dock before this.
- **Max call length**: \`timeLimit="7200"\` (2 hours) so a forgotten open line cannot run all night.

### 10.4 Inbound call
\`\`\`
caller dials the workspace number
 -> Twilio POSTs the number's VoiceUrl = twilio-voice (To = the Etcher number)
 -> twilio-voice: find phone_numbers by To + AccountSid; find the person by From (E.164);
    insert calls (inbound, ringing)
 -> optional <Say> consent announcement to the caller
 -> <Dial timeout="20" action=".../twilio-status-callback?kind=dial" record=...>
      <Client><Identity>u_<assigned user id></Identity>
              <Parameter name="personName" value="Sarah Jones"/></Client>
    </Dial>
 -> no answer after ring_timeout_seconds: inbound_fallback
      voicemail: <Say>Please leave a message after the tone.</Say><Record maxLength="120"
                 recordingStatusCallback=...> (shows as a missed call with a recording)
      ring_all:  a second <Dial> to every member's client identity, then voicemail
      hangup:    <Hangup/>
\`\`\`
- If the number has no assigned user, it rings every member who has the softphone online.
- Missed inbound calls create a task for the assigned user: "Call back Sarah Jones" due now.

### 10.5 Recording and consent
- Recording is off by default. An admin turns it on in Settings > Calling. The page shows:
  "Recording laws differ by country and US state. Many require every party's consent. Keep the
  announcement on unless you are sure you do not need it." The announcement is on by default.
- Dual-channel recording (\`record-from-answer-dual\`) puts the rep and the other party on separate
  channels, which is better for playback and any later transcription.
- The recording callback queues a row; the worker downloads \`<RecordingUrl>.mp3\` with the
  subaccount credentials (basic auth), uploads to \`recordings/<ws>/<call_id>/<RE sid>.mp3\`, then
  deletes the recording from Twilio: \`DELETE /2010-04-01/Accounts/{Sid}/Recordings/{RE sid}.json\`.
  Etcher is the only copy after that, kept 365 days.
- Playback: the browser asks for a signed URL (60 seconds) from Storage. RLS lets only the rep
  on the call or an admin read it.

### 10.6 Buying numbers
- Search: \`GET /2010-04-01/Accounts/{Sub}/AvailablePhoneNumbers/{US|GB}/Local.json?VoiceEnabled=true&AreaCode=415\`
  (US) or \`&Contains=20\` (UK London). Also \`Mobile.json\` for GB mobile numbers.
- Buy: \`POST /2010-04-01/Accounts/{Sub}/IncomingPhoneNumbers.json\` with \`PhoneNumber\`,
  \`VoiceUrl\` (twilio-voice), \`VoiceMethod=POST\`, \`StatusCallback\` (twilio-status-callback),
  and for GB \`BundleSid\` + \`AddressSid\` from the approved bundle.
- Release: \`DELETE /2010-04-01/Accounts/{Sub}/IncomingPhoneNumbers/{PN sid}.json\`. The number is
  gone for good, so the dialog asks the admin to type the number to confirm.
- Max 3 active numbers per workspace on the Etcher subaccount. Each purchase writes a
  \`number_month\` usage line (and the monthly sweep writes one per active number per month).

### 10.7 Regulatory bundles
- **US**: local numbers need no bundle. For better answer rates, register the business in
  Twilio Trust Hub (a Business Profile and SHAKEN/STIR) so calls are signed and less likely to
  show "Spam likely". Do this once for your main account; subaccount numbers can be assigned to
  it [verify current Trust Hub steps for subaccounts].
- **UK**: every UK number (local, national, mobile, toll-free) needs an approved Regulatory
  Compliance bundle before purchase. Etcher's UK compliance form collects the business name,
  Companies House number (if registered), registered address, and a contact. The \`buy-number\`
  action \`uk_bundle\` first reads the live requirements with
  \`GET https://numbers.twilio.com/v2/RegulatoryCompliance/Regulations?IsoCountry=GB&NumberType=local&EndUserType=business&IncludeConstraints=true\`,
  then creates an Address (\`POST /2010-04-01/Accounts/{Sub}/Addresses.json\`), an End User, any
  Supporting Documents the regulation asks for, the Bundle, the Item Assignments, and submits
  it (\`Status=pending-review\`). A daily sweep polls the bundle and updates \`bundle_status\`.
  Approval usually takes 1 to 3 working days [verify]. Outbound callers must also set an
  emergency address on UK numbers (\`EmergencyAddressSid\`).
- The form, the requirement names and the field list must come from the Regulations response,
  not from this document, because Twilio changes them.

### 10.8 Signature validation (every Twilio webhook)
- Header \`X-Twilio-Signature\`. Algorithm: take the full URL Twilio called (scheme, host, path and
  query string exactly as configured), append each POST parameter name and value sorted by
  name, HMAC-SHA1 with the **auth token of the account that owns the call** (the subaccount's
  token, looked up by the \`AccountSid\` form field), base64, compare in constant time.
- Use the \`twilio\` npm package's \`validateRequest(authToken, signature, url, params)\` from
  Deno (\`npm:twilio\`) or a 20 line Web Crypto version. Reject with 403 on mismatch.
- Gotcha: Supabase forwards requests with an internal URL. Build the URL from
  \`SUPABASE_URL + '/functions/v1/' + fnName + search\` (the public URL Twilio used), never from
  \`req.url\`.
`
