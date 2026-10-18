// Shortlist build PRD (PRD.md), part 2: edge function contracts, limits, emails, analytics, tests, milestones.

export const buildPrd2 = `
## 13. Edge function contracts

Shared helpers live in \`supabase/functions/_shared/\`: \`admin.ts\` (secret-key client), \`auth.ts\`
(\`requireUser\` with \`getClaims\`, \`requireMember(ws, roles?)\`, \`requireAccess(ws)\`, \`requireCron\`),
\`http.ts\` (HttpError, json, CORS for \`APP_URL\` and localhost), \`log.ts\` (one JSON line per call, ids only,
never CV text, answers, names, emails or tokens), \`retry.ts\` (exponential backoff with jitter, respects
\`retry-after\`, retries 429 and 5xx only), \`limits.ts\` (\`checkLimit(ws, kind, qty)\`), \`meter.ts\`
(\`meter(ws, user, kind, qty, costMicros, refId, idempotencyKey)\`), \`tokens.ts\` (\`newToken()\`, \`sha256Hex()\`,
\`hmacSign/hmacVerify\` for OAuth state), \`crypto.ts\` (AES-GCM \`encrypt/decrypt\` with \`TOKEN_ENCRYPTION_KEY\`),
\`ip.ts\` (\`ipHash(req)\` = sha256 of the first \`x-forwarded-for\` IP + \`IP_HASH_SALT\` + today's date),
\`claude.ts\` (one wrapper for Messages API calls with structured output, caching and metering), \`google.ts\`
(\`getAccessToken(ws, user)\`, \`freeBusy\`, \`insertEvent\`, \`deleteEvent\`), \`email.ts\` (\`enqueue()\` into
\`email_outbox\` with a dedupe key).

Error body for every function: \`{ "error": { "code": "limit_reached", "message": "Human text." } }\`.

### 13.1 sl-apply (public, no JWT)
- **Trigger:** the job page form. Deployed with \`--no-verify-jwt\`. CORS: \`APP_URL\` only.
- **POST \`{ action: "start", company, job, first_name, last_name, email, phone?, location?, linkedin_url?,
  cover_letter?, answers, ai_opt_out, talent_pool_consent, privacy_ack: true, cv: { name, size, type },
  hp: "", elapsed_ms }\`**
  - zod: names 1 to 80 chars, email valid and lower-cased, linkedin must be \`https://(www.)linkedin.com/\`,
    cover letter max 8,000, cv size 1 KB to 10 MB, type PDF or DOCX, \`privacy_ack === true\`.
  - Bot checks: \`hp\` (hidden honeypot) must be empty, \`elapsed_ms\` >= 3,000; both fail silently with a
    fake 200 so bots learn nothing.
  - Rate limits: \`try_rate_limit('apply:ip:'+ipHash, 8, 3600)\`, \`('apply:email:'+email, 5, 86400)\`. 429.
  - Load the job via workspace slug + job slug with the admin client; must be \`open\` and
    \`has_active_access\`, else 404 \`not_open\`. Validate answers against \`job_questions\` (required ones
    present, selects in options, numbers numeric, URLs https).
  - Hard cap: \`usage_this_month(ws,'applications') < plan_limits.applications\`, else 409 \`job_full\`
    ("This role is not taking more applications this month.") and notify owners once a day.
  - Upsert candidate on \`(workspace_id, lower(email))\` (update names, phone, location, linkedin). If an
    application exists for this job and candidate and is not \`uploading\`: 409 \`already_applied\`.
  - Insert application \`state='uploading'\`, \`ip_hash\`, \`privacy_ack_at=now()\`, \`submit_token_hash\`.
  - \`storage.from('cvs').createSignedUploadUrl('<ws>/<job>/<app>/cv.<pdf|docx>')\`.
  - **Output:** \`{ application_id, upload: { path, token }, submit_token }\`.
- **POST \`{ action: "finish", application_id, submit_token }\`**
  - Token hash must match and state must be \`uploading\` (idempotent: if already \`active\`, return 200).
  - Download the first 8 bytes (\`createSignedUrl\` + Range or \`download\` then slice). PDF must start with
    \`%PDF\`, DOCX with \`PK\`. Else delete the object and the application, 422 \`bad_file\`.
  - Compute sha256, set \`state='active'\`, \`applied_at\`, \`cv_*\`. Meter \`applications\` 1 with key
    \`apply:<app>\`. Call \`request_screen(app)\` through the admin client. Enqueue \`application_received\`
    (dedupe \`received:<app>\`). Insert \`new_applicant\` notifications for owners, admins and job members
    who have it on (in-app only; emails go in the daily digest).
  - Fire-and-forget POST to sl-screen-worker with \`x-cron-secret\` so the summary starts at once.
  - **Output:** \`{ ok: true }\`. The browser redirects to the applied page.
- **Errors:** 400 \`bad_input\`, 404 \`not_open\`, 409 \`already_applied\` / \`job_full\`, 422 \`bad_file\`, 429.
- **Curl test:** see Backend task "End-to-end test".

### 13.2 sl-screen-worker (cron + kick)
- **Trigger:** pg_cron every minute, and the kick from sl-apply. \`requireCron\`. \`--no-verify-jwt\`.
- \`release_stuck()\`, then \`claim_screen_jobs(5)\`. For each job (3 at a time with \`Promise.all\` chunks):
  1. Load application, job, criteria (not archived, ordered), workspace. Skip with \`done\` if the
     application is gone, opted out, or AI is disabled.
  2. \`checkLimit(ws, 'ai_screens', 1)\`; over cap: set \`ai_status='paused_cap'\`, job \`done\`, notify owners
     once (\`ai_cap\`). At 80% of cap enqueue \`ai_cap_warning\` once per month (dedupe \`aicap80:<ws>:<yyyymm>\`).
  3. Download the CV with the admin client, extract text (9.5), redact (9.3), build the prompt (9.4).
  4. Call Claude through \`claude.ts\` with \`withRetry\`. \`stop_reason\` \`refusal\` = failed with message
     "The AI declined to summarise this CV. Read it yourself."; \`max_tokens\` = retry once with 3,000.
  5. Validate with zod, run post-checks (9.4), upsert \`ai_screens\` on \`(application_id, criteria_version)\`.
  6. Meter \`ai_screens\` 1 with \`costMicros\` from usage and key \`screen:<app>:<criteria_version>\`
     (on conflict do nothing, so a retry never double-charges).
  7. Set \`ai_status='done'\`, job \`done\`.
- **Retries:** on error set \`queued\`, \`run_after = now() + [1, 5, 30] minutes\` by attempt; attempt 4 fails:
  job \`dead\`, \`ai_status='failed'\`.
- **Cost per call** (Haiku 5.5, under 100k input): micro-dollars = input_tokens * 0.10 + cache_read * 0.01
  + cache_write_5m * 0.125 + output_tokens * 0.50 [verify current prices].
- **Output:** \`{ processed, failed }\`. Logs: \`{ fn, app, ms, in_tokens, out_tokens, outcome }\`.

### 13.3 sl-email-worker (cron)
- \`requireCron\`. \`claim_outbox(25)\`. For each row:
  - Suppressed address (\`email_suppressions\`): status \`suppressed\`.
  - Candidate kinds: load the workspace template, render placeholders (HTML-escape every value), plain
    text and a simple HTML version (white, 14px, the company logo if set, an unsubscribe-free footer with
    the privacy line). From: \`"<sender_name> via Shortlist" <jobs@mail.YOURDOMAIN>\`, Reply-To: workspace
    \`reply_to_email\`.
  - Team kinds (invite, mention, digest, scorecard_due, calendar_disconnected, ai_cap_warning,
    retention_upcoming, privacy_request_new): fixed Shortlist templates in code.
  - \`POST https://api.resend.com/emails\` with \`Authorization: Bearer RESEND_API_KEY\` and
    \`Idempotency-Key: <outbox id>\` [verify header support in Resend's API reference]. Save \`email_log\`
    with \`resend_id\`, set \`sent\`.
  - Errors: 429 or 5xx re-queue with \`send_after = now() + 2^attempts minutes\`; 4xx or attempt 5: \`failed\`.
- **Output:** \`{ sent, failed, suppressed }\`.

### 13.4 sl-google-oauth
- **GET \`?action=start\`** (JWT in the Authorization header, called by the app with fetch, returns JSON):
  \`requireUser\`, \`requireMember(ws)\`. State = base64url(JSON \`{ ws, uid, nonce, exp: now+10min }\`) + "." +
  HMAC-SHA256 with \`OAUTH_STATE_SECRET\`. Output \`{ url }\` (the consent URL from section 12).
- **GET \`?code&state\`** (Google redirect, no JWT, \`--no-verify-jwt\`): verify HMAC and expiry, exchange
  the code, require a \`refresh_token\` (else redirect with \`?calendar=error&reason=no_refresh\`), check the
  granted scopes include both calendar scopes, read the email from the \`id_token\`. Upsert
  \`calendar_connections\` (status active) and \`calendar_tokens\` (encrypted). Redirect to
  \`APP_URL/app/settings?tab=calendar&calendar=connected\`.
- **POST \`{ action: "disconnect" }\`** (JWT): revoke the token at Google, delete both rows.
- Redirect URI registered in Google: \`https://<ref>.supabase.co/functions/v1/sl-google-oauth\`.

### 13.5 sl-booking
- **POST \`{ action: "create", application_id, title, duration_minutes, mode, location_text?,
  interviewer_ids, window_start, window_end, min_notice_hours }\`** (JWT, owner/admin of the job):
  every interviewer must be on the job team and have an active calendar connection (else 409
  \`calendar_missing\` with their names). Organiser = the caller if connected, else the first interviewer.
  Token = \`newToken()\`, store the hash, \`expires_at = window_end + 1 day\`. Move the application to
  \`interview\` if it is earlier in the pipeline (through \`move_application\` with the caller's JWT).
  Enqueue \`interview_invite\` with \`booking_link = APP_URL/book/<token>\`. Output \`{ request_id, link }\`.
- **POST \`{ action: "slots", token, tz }\`** (public): rate limit 30 per IP per 10 minutes. Request must be
  \`pending\` and not expired (404 \`link_invalid\` otherwise; \`booked\` returns the booked interview
  instead). Compute slots (section 12). Output \`{ job_title, company, duration, mode, slots: [{ start,
  end }], booked? }\`.
- **POST \`{ action: "book", token, start, tz }\`** (public): take the 30 second mutex with \`claim_booking(token_hash)\` (released in a finally block); the
  start must be in a fresh slot computation for that day; re-check freeBusy for that window; insert the
  event (section 12); insert \`interviews\`; request \`booked\`; enqueue \`interview_confirmed\`; notify
  interviewers (\`interview_booked\`). Same token and start twice returns the same interview (idempotent).
  Slot taken: 409 \`slot_taken\` and fresh slots.
- **POST \`{ action: "cancel", token, reason?, reschedule: boolean }\`** (public) or with JWT for admins:
  delete the Google event with \`sendUpdates=all\`, interview \`cancelled\`. Reschedule (candidate only,
  max 2): request back to \`pending\`, reschedules + 1. Otherwise request \`cancelled\`. Enqueue
  \`interview_cancelled\` to the other side.

### 13.6 sl-scheduler (cron every 15 minutes)
- Interview reminders: interviews starting in 23 to 25 hours, \`reminder_sent_at\` null: enqueue
  \`interview_reminder\` to the candidate.
- Mark interviews \`completed\` 30 minutes after \`ends_at\`. Two hours after the end, for each interviewer
  without a submitted scorecard: \`scorecard_due\` notification and email (once, \`scorecard_nudged_at\`).
- Expire \`pending\` interview requests past \`expires_at\`.
- Applicant digest: at 08:00 in each workspace's time zone (the run whose window contains 08:00), one
  email per member with new applicants on their jobs in the last 24 hours (dedupe \`digest:<user>:<date>\`).

### 13.7 sl-privacy
- **POST \`{ action: "request", company, email, kind }\`** (public): rate limit 3 per IP per hour and 3 per
  email per day. Always return the same 200 text ("If we hold data for this email, we have sent a link to
  confirm it is you.") whether or not data exists. Insert \`data_requests\` (unverified, token hash).
  Enqueue \`privacy_verify\` to the email.
- **POST \`{ action: "verify", token }\`** (public): set \`open\`, \`verified_at\`, \`due_at = +30 days\`; if no
  candidate matches set \`no_data\` and email "We hold no data for this email". Else notify owners/admins
  (\`privacy_request\` + \`privacy_request_new\` email).
- **POST \`{ action: "fulfil", request_id, mode: "export" | "delete" }\`** (JWT, owner/admin):
  - export: build JSON (candidate, applications with answers, stage history, notes, scorecards, AI
    summaries, interviews, emails sent), upload to \`exports/<ws>/<request_id>.json\`, 7 day signed URLs for
    the JSON and each CV, enqueue \`privacy_export\`, status \`completed\`.
  - delete: cancel future interviews (Google delete), \`erase_candidate(candidate, 'request', uid, request)\`,
    delete returned Storage paths, enqueue \`privacy_deleted\` (sent to the stored email before it is gone:
    the outbox row is created first and is exempt from the erase cancel), status \`completed\`.

### 13.8 sl-retention (cron daily 03:10 UTC)
- \`candidates_due_for_purge(200)\` in a loop: cancel future interviews, \`erase_candidate(id,'retention',null,null)\`,
  delete Storage paths. Max 2,000 per run; log counts only.
- \`stale_uploads(200)\`: delete object and application.
- 7 day warning: count candidates who will be due in exactly 7 days per workspace, enqueue
  \`retention_upcoming\` to owners and admins (dedupe \`ret:<ws>:<date>\`).
- Expire unverified data requests older than 7 days. Delete \`exports\` files older than 8 days.

### 13.9 sl-resend-webhook
- Resend signs with Svix headers \`svix-id\`, \`svix-timestamp\`, \`svix-signature\`. Verify the raw body with
  \`npm:svix\` \`new Webhook(RESEND_WEBHOOK_SECRET).verify(raw, headers)\`; reject timestamps older than
  5 minutes (the library does this). De-dupe by \`svix-id\` in \`resend_events\`.
- \`email.delivered\`: \`email_log.status='delivered'\`. \`email.bounced\` (hard): insert \`email_suppressions\`
  reason \`bounce\`, status \`bounced\`. \`email.complained\`: suppression reason \`complaint\`. Others: 200.

## 14. Limits per plan

| | Starter | Team | Growth |
| --- | --- | --- | --- |
| Price | $29 / month or $290 / year | $69 / month or $690 / year | $149 / month or $1,490 / year |
| Seats (owner, admins, interviewers) | 3 | 10 | 25 |
| Open jobs at once | 2 | 8 | 25 |
| AI summaries a month | 150 | 500 | 1,500 |
| Applications a month (hard cap) | 450 | 1,500 | 4,500 |
| Careers page, custom questions, criteria lint, scorecards, scheduling, GDPR tools | yes | yes | yes |
| Remove "Hiring with Shortlist" from careers page and emails | no | yes | yes |
| Pass-through report | no | yes | yes |
| Trial (7 days) | 2 open jobs, 25 AI summaries, 150 applications | | |

- Applications over the AI cap are still accepted (people deserve a reply) and show "AI summary paused:
  monthly limit reached. Read the CV, or upgrade for more." They are re-queued on the 1st or right after
  an upgrade (the Stripe webhook calls \`request_screen\` for every \`paused_cap\` application of that
  workspace, newest first, up to the new cap).
- Every cap is enforced in SQL or edge functions, never only in the UI. The sidebar meter turns amber at
  80% and coral at 95% (DESIGN_SYSTEM meter rule).

## 15. Paywall and billing

- Shared Stripe tasks build Checkout (subscription, \`trial_period_days: 7\`), the webhook and the portal.
  Create 6 prices with lookup keys \`starter_month\`, \`starter_year\`, \`team_month\`, \`team_year\`,
  \`growth_month\`, \`growth_year\`, then map them in \`plan_prices\`.
- Access = the owner's subscription status in (\`trialing\`, \`active\`) via \`has_active_access(ws)\`.
- No access: the app shows the paywall (except Billing and Settings), the careers page returns 404,
  booking links show "This link is not available right now", sl-apply returns 404. Existing data is kept;
  retention keeps running so deletion obligations are met even for lapsed customers.
- Downgrade over limits: nothing is deleted. Extra open jobs stay open but no new job can be opened;
  extra seats keep access but no new invites.

## 16. Emails (Resend)

| Kind | To | Trigger | Delay / dedupe |
| --- | --- | --- | --- |
| application_received | candidate | sl-apply finish | immediate, \`received:<app>\` |
| interview_invite | candidate | sl-booking create | immediate |
| interview_confirmed | candidate | sl-booking book | immediate |
| interview_reminder | candidate | sl-scheduler, 24 h before | once |
| interview_cancelled | candidate or interviewers | sl-booking cancel | immediate |
| rejection | candidate | move_application to rejected | reject_delay_minutes (default 120), cancelled on undo |
| privacy_verify / privacy_export / privacy_deleted | candidate | sl-privacy | immediate |
| team_invite | invitee | create_invite | immediate |
| mention | teammate | add_note | immediate |
| applicant_digest | member | sl-scheduler 08:00 local | daily |
| scorecard_due | interviewer | sl-scheduler, 2 h after end | once |
| calendar_disconnected | interviewer | token refresh fails | once per day |
| ai_cap_warning | owner | 80% of AI cap | once a month |
| retention_upcoming | owners, admins | sl-retention, 7 days before | daily if any |
| privacy_request_new | owners, admins | request verified | immediate |
| welcome, trial ending, card failed | owner | shared Stripe and Resend tasks | |

Candidate emails always include the privacy line and come from "<Company> via Shortlist" with the
company's reply-to address. Never include AI output, notes, scores or a rejection reason in an email.

## 17. Analytics events (PostHog)

Client: \`signup_completed\`, \`workspace_created\`, \`job_created\`, \`job_published\`, \`criteria_lint_shown\`
(\`{ category }\`), \`criteria_override_saved\`, \`careers_link_copied\`, \`candidate_opened\`,
\`ai_summary_viewed\`, \`ai_feedback_sent\` (\`{ verdict }\`), \`stage_moved\` (\`{ from, to, ai_seen }\`),
\`rejection_undone\`, \`scorecard_submitted\`, \`calendar_connected\`, \`booking_link_sent\`, \`template_edited\`,
\`privacy_request_fulfilled\` (\`{ mode }\`), \`checkout_started\`, \`upgrade_clicked\` (\`{ from_plan, reason }\`).
Server (from edge functions, with workspace id only, never candidate data): \`application_received\`,
\`ai_summary_completed\` (\`{ ms, scanned }\`), \`interview_booked\`, \`candidate_hired\`.
Activation event: first application received on a published job within 7 days of signup.
Never send candidate names, emails, CV text or AI output to analytics. Mask all inputs in session replay
and disable replay on \`/app/jobs/*\` and \`/app/candidates/*\`.

## 18. Notifications and realtime

- The bell (sidebar header) reads \`notifications\` for the current user, unread count with tabular
  numbers in a fixed-width pill (shows "99+" over 99). Opening the popover marks visible items read.
- Realtime channels: \`applications\` filtered by \`job_id\` on the board (cards move for everyone),
  \`ai_screens\` filtered by \`job_id\` ("Summary ready" without refresh), \`notifications\` filtered by
  \`user_id\`. RLS applies to realtime, so people only get rows they can read.
- Notification settings per user: new applicants (in-app, digest), mentions (in-app + email),
  scorecard reminders (email), interview booked (in-app).

## 19. Careers page and SEO

- \`/careers/[company]\` and \`/careers/[company]/[job]\` are server-rendered with the publishable key calling
  \`get_careers_page\` / \`get_public_job\`, revalidated every 60 seconds and on publish (\`revalidatePath\`).
- Each job page outputs JobPosting structured data (JSON-LD) for Google for Jobs: \`title\`, \`description\`
  (HTML from markdown), \`datePosted\`, \`validThrough\` (+60 days), \`employmentType\`, \`hiringOrganization\`
  (name, sameAs website, logo), \`jobLocation\` or \`jobLocationType: "TELECOMMUTE"\` with
  \`applicantLocationRequirements\` for remote, and \`baseSalary\` when visible [verify current Google field
  requirements in the JobPosting docs]. Closed jobs return 410 and drop the JSON-LD.
- Meta title "<Job title> at <Company>", description from the first 155 characters of the job.
  OG image generated with \`next/og\`: white card, company logo, job title, location, "Apply on Shortlist".
- "Hiring with Shortlist" footer link on Starter (UTM \`utm_source=careers&utm_medium=footer\`): free
  distribution to every applicant.

## 20. Out of scope for v1

Job board multiposting and paid job ads, custom pipeline stages, offer letters and e-signature, HRIS
sync, Outlook / Microsoft 365 calendars, SMS, video interviews in-app, candidate sourcing or browser
extensions, CV database search across workspaces, AI ranking or scoring of any kind, AI-written
rejection emails, demographic (equal opportunities) surveys, multi-language careers pages, custom
careers domains, SSO, public API. Write these on a "Later" list; do not build them.

## 21. Acceptance tests

Run each by clicking, then run the SQL in Supabase > SQL Editor.

1. **Workspace:** sign up, finish onboarding with "Acme Test" and \`acme-test\`.
   \`select name, slug from workspaces; select role from workspace_members;\` = 1 row, \`owner\`.
2. **Bias lint:** add the criterion "Young, energetic digital native". A warning appears under it and
   Publish is blocked with "Rewrite the flagged criterion or add a reason". Rewrite it to "Has run
   social media for a brand with 10k+ followers". Publish works.
   \`select label, lint_warnings from job_criteria;\` = empty warnings.
3. **Apply (desktop and 375px phone):** apply with a 2 page PDF, one custom question, AI not opted out.
   The applied page shows. The confirmation email arrives within a minute.
   \`select state, stage, ai_status, cv_mime from applications;\` = \`active\`, \`applied\`, then \`done\`
   within 2 minutes. \`select kind, quantity from usage_ledger;\` = one \`applications\`, one \`ai_screens\`.
4. **Redaction:** \`select redactions, flags from ai_screens;\` redactions >= 3 (name, email, phone).
   The summary does not contain the candidate's name.
5. **Evidence:** every Meets and Partly in the panel shows at least one quote you can find in the CV.
6. **Opt-out:** apply again with another email and tick "Do not use AI". The panel shows "AI not used
   (candidate's choice)". \`select ai_status from applications order by created_at desc limit 1;\` = \`opted_out\`.
7. **Human decision:** try to reject a candidate without opening the CV: the button is disabled with
   "Open the CV first". Open it, reject with "Skills mismatch". A toast "Rejection email sends in 2 hours.
   Undo" appears. Click Undo: \`select status from email_outbox where kind = 'rejection';\` = \`cancelled\`.
8. **Board:** drag a card from Applied to Screen in one browser; it moves in a second browser within
   2 seconds. Card heights never change while dragging.
9. **Interviewer isolation:** invite an interviewer, do not add them to the job. They see no jobs.
   Add them: they see that job only. They cannot drag cards (cards show a lock cursor and the RPC
   returns "only owners and admins move candidates").
10. **Blind scorecards:** owner submits a scorecard. The interviewer sees "1 scorecard hidden until you
    submit yours". After they submit, both show.
11. **Mentions:** write "@<interviewer> can you check the portfolio?" The interviewer's bell shows 1 and
    they get an email.
12. **Calendar:** connect Google Calendar as the owner, add a busy event tomorrow 10:00 to 11:00, send a
    booking link (45 min, Meet). The candidate page shows no slot overlapping 09:45 to 11:15 (15 min
    buffer). Book 14:00. A Google Calendar event with a Meet link appears for both.
    \`select status, meet_url is not null from interviews;\` = \`scheduled\`, \`true\`.
13. **Reschedule:** from the confirmation link move the slot; the old Google event is gone, the new one
    exists, \`interview_requests.reschedules\` = 1.
14. **Limits:** \`insert into workspace_limit_overrides (workspace_id, ai_screens) select id, 1 from workspaces;\`
    then apply twice: the second shows "AI summary paused: monthly limit reached".
15. **Privacy request:** from \`/privacy/acme-test\` request deletion for a candidate email, click the email
    link, then in Settings > Privacy click Delete everything.
    \`select count(*) from candidates where email = '<that email>';\` = 0 and
    \`select reason, applications_deleted from deletion_log;\` shows \`request\`.
16. **Retention:** \`update applications set retention_until = current_date - 1, state = 'closed';\` then run
    sl-retention by curl with the cron secret. Candidates and CV files are gone (check Storage > cvs).
17. **Paywall:** set your subscription to \`canceled\`: \`/careers/acme-test\` returns 404 and the app shows
    the paywall. Set it back to \`trialing\`.
18. **Security:** the curl tests in the Security phase all pass.

## 22. Build milestones

1. **M1 Foundations (shared steps):** Next.js, Supabase, auth, run the migration, app shell with the
   sidebar from section 7, Stripe trial and paywall.
2. **M2 Workspace and jobs:** onboarding, \`create_workspace\`, jobs table, job editor (Details, Form,
   Criteria with live lint, Team), publish rules, careers page editor. Tests 1, 2.
3. **M3 Apply:** public careers and job pages with JSON-LD, the form, sl-apply, Storage, confirmation
   email through sl-email-worker. Tests 3, 6.
4. **M4 Board and candidate panel:** pipeline board with drag and drop and realtime, candidate panel
   (CV viewer, answers, timeline), \`move_application\`, rejection with undo, notes with @mentions,
   notifications. Tests 7, 8, 9, 11.
5. **M5 AI summaries:** sl-screen-worker with extraction, redaction, the prompt, post-checks, metering,
   the AI panel, feedback, opt-out. Tests 4, 5, 14.
6. **M6 Scorecards and team:** invites, roles, job team, blind scorecards, pass-through report. Test 10.
7. **M7 Scheduling:** Google OAuth, working hours, sl-booking, booking page, reminders and nudges
   (sl-scheduler). Tests 12, 13.
8. **M8 Privacy:** privacy page, sl-privacy, Settings > Privacy and retention, sl-retention, deletion log,
   Docs page. Tests 15, 16.
9. **M9 Polish and launch:** email templates editor, digest, empty and error states, analytics, security
   pass, landing page. Tests 17, 18.
`
