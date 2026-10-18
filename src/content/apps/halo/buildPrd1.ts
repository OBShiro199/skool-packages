// Halo build PRD (PRD.md), part 1: product, review policy, architecture, routes, data model, state machines.

export const buildPrd1 = `# Halo: build PRD

Version 1.0. Download this file, save it as \`PRD.md\` in the root of your project folder, and reference it
in Claude Code with \`@PRD.md\`. Claude Code reads it before every task. Where this file and your instinct
disagree, this file wins. The look and feel lives in \`@DESIGN_SYSTEM.md\` (the Quiet Precision base system) and
\`@DESIGN.md\` (Halo's accent and screens), the marketing page in \`@LANDING.md\`. Your \`CLAUDE.md\` should
contain the line \`UI rules: @DESIGN_SYSTEM.md @DESIGN.md\`.

## 0. How to use this document

- Read sections 1 to 6 once so you know what you are building, for whom, and the one rule that shapes
  the whole product (section 4, Google's review policy).
- Sections 7 to 19 are the spec. Claude Code builds from them.
- Section 22 lists the build milestones. Do them in order. Do not start a milestone before the one before
  it passes its acceptance tests (section 21).
- Every new Claude Code session, say: "Read @PRD.md, @DESIGN_SYSTEM.md and @DESIGN.md. We are on milestone N.
  Plan first, then wait for my OK."
- Use Opus at high effort (\`/model opus\`, \`/effort high\`) for anything that touches the database schema,
  RLS, the public rating page, Twilio, Google OAuth or Stripe. Medium is fine for UI copy and layout.
- Facts marked [verify] were not confirmed on the vendor's own page when this was written (Oct 2026).
  Ask Claude Code to check the current docs before it writes code that depends on them.

## 1. Problem

Local businesses live and die by their Google rating. A dental practice at 4.8 stars with 400 reviews
gets the call; the one at 4.1 with 37 reviews does not. Most of their customers are happy, but happy
customers rarely write reviews unprompted. Unhappy ones do, often from the car park.

What they do today:
- Ask at the front desk ("would you leave us a review?") and forget by the third patient of the day.
- Print a QR code on the counter that nobody scans.
- Pay Birdeye ($299+ per location a month [verify]) or Podium ($399+ a month on a 12 month contract
  [verify]) for an all-in-one suite they use 10% of.
- Use a cheap "review funnel" tool that only sends happy customers to Google and hides unhappy ones.
  That is called review gating, Google bans it, and it can get reviews removed or a profile penalised.
- Never reply to reviews, or reply three weeks later with "Thanks!" to a five star essay.

The cost: a salon doing 400 appointments a month that turns 5% of them into Google reviews gets 20
reviews a month instead of 2. A one star review that sat unanswered for a month costs more bookings
than any ad can win back.

## 2. Ideal customer (ICP)

- **Who:** owners and practice managers of appointment or job based local businesses: dental and
  medical clinics, physios, vets, hair and beauty salons, barbers, spas, trades (plumbers, electricians,
  HVAC, roofers, cleaners), auto repair, and the small marketing agencies that serve them.
- **Volume:** 50 to 1,500 completed visits or jobs a month per location. 1 to 10 locations.
- **Behaviour:** they already use a booking, practice management or job tool (Square Appointments,
  Fresha, Vagaro, Jobber, Housecall Pro, ServiceTitan, Dentrix, Cliniko) that knows when a visit is done
  and has the customer's mobile number.
- **Pain trigger:** "A competitor down the road has three times our reviews" or "We got a one star
  review and I only saw it a week later."
- **Will pay:** $49 to $299 a month if it reliably adds 10+ Google reviews a month and catches unhappy
  customers while they can still fix things. One extra patient a month pays for the top plan.
- **Not for (v1):** enterprise chains with 50+ locations, ecommerce stores (product reviews, not Google),
  businesses outside the US that need SMS (v1 texts US numbers only; email works everywhere), and
  anyone who wants to filter which customers get asked for a Google review.

## 3. The one core job

"When a visit is done, Halo texts my customer a short thank you with a link. They tap a star rating
and can post a Google review in one more tap. If something went wrong they can also tell us privately,
and I get an alert straight away. When a new Google review lands, Halo drafts a reply in my voice and
I approve it from my phone."

Everything in v1 serves that sentence. If a feature does not add Google reviews, surface an unhappy
customer sooner, or get a review answered faster, it waits.

## 4. Google's review policy, and how Halo complies (read this before anything else)

### 4.1 What the rules say

Google's Maps user contributed content policy (support.google.com/contributionpolicy/answer/7400114,
"Prohibited and restricted content") says businesses must not **discourage or prohibit negative reviews,
or selectively solicit positive reviews from customers**. It also bans offering incentives (discounts,
gifts, prize draws, money) in exchange for a review, or for removing or changing a negative one.
Reviews that break these rules can be removed, and Google can restrict the business profile [verify the
exact current wording on that page before launch].

In the US, the FTC rule on consumer reviews (16 CFR Part 465, in force since 21 October 2024) bans fake
reviews, buying reviews, and certain review suppression practices, such as showing only positive reviews
on your own site while claiming they are all your reviews [verify the section text].

### 4.2 ELI5

> Imagine a school asking parents "how was the play?" and then only giving the "write to the newspaper"
> envelope to parents who smiled. The newspaper would only ever print nice letters, which is not fair to
> anyone reading it. Google is the newspaper. Halo has to hand the same envelope to every parent, smile
> or not. What Halo is allowed to do is also offer a private note to the head teacher, so a parent who
> was upset can be heard and helped first, if they want that.

### 4.3 What "review gating" looks like (Halo must never do any of these)

1. Showing the Google review link only to people who rated 4 or 5 stars.
2. Showing the Google link to unhappy customers but smaller, greyed out, hidden behind "other options",
   below the fold, or after they submit a private form.
3. Changing the wording so happy customers are asked "Would you share this on Google?" and unhappy
   customers are not asked at all.
4. Sending the review request (or a reminder) only to customers predicted or known to be happy:
   by rating, by sentiment, by spend, by "VIP" tags, or by an owner hand-picking names.
5. Offering anything in return for a review, a rating, or for changing or removing a review.
6. Asking an unhappy customer to "please don't post this online".

### 4.4 Halo's compliant design (these are product rules, enforced in code)

| Rule | How Halo enforces it | Where |
|---|---|---|
| R1. Everyone gets the same Google link, with the same prominence | The rating page renders the "Post a review on Google" button in the same position, size and style on every screen state, before and after any rating. The rating is optional: a customer can tap Google without rating | \`/r/[token]\`, DESIGN.md 7.3 |
| R2. The rating never decides who sees Google | The rating only changes (a) the thank-you sentence above the buttons and (b) whether the owner gets an alert. There is no branch in \`hl-public\` that hides or delays the Google link | \`hl-public\` contract 13.4, acceptance test A4 |
| R3. The private feedback box is offered to everyone | Every rating (1 to 5) shows the same optional "Tell the team privately" text box. Low ratings make it open by default; high ratings keep it collapsed but visible | \`/r/[token]\` |
| R4. Every completed visit gets asked, not a hand-picked list | Requests come from the visit source (webhook, CSV, manual). There is no filter by rating, spend, sentiment or tag. The only skips are factual: no consent, opted out, asked in the last 90 days, invalid number, over plan cap. Each skip is logged with its reason | \`enqueue_review_request()\` in SQL, 10.2 |
| R5. Reminders do not depend on the rating | A single reminder goes out only if the customer never opened the link. Anyone who opened it (whatever they rated, or if they did not rate) gets no reminder | \`hl-send-worker\`, 10.2 |
| R6. No incentives | Message templates are checked on save for incentive words (discount, % off, free, gift, voucher, coupon, prize, draw, raffle, win, reward, cash, credit) and rejected. AI reply drafts are told never to offer anything in exchange for a review, an edit or a removal, and the output is checked for the same words | \`check_template()\` trigger, prompt 14.1 |
| R7. No suppression | Replies to negative reviews never ask the reviewer to delete or change it. The dashboard shows every Google review, including 1 star ones, and Halo has no "show only good reviews" widget | prompt 14.1, out of scope 20 |
| R8. Honest copy | The landing page and app never say "stop bad reviews", "keep negative reviews off Google" or "only send happy customers to Google". They say "hear from unhappy customers first" and "reply to every review" | LANDING.md, DESIGN.md 9 |

If any later feature request conflicts with R1 to R8, the answer is no. Write it into CLAUDE.md:
"Never add a feature that changes who sees the Google review link, or how prominently, based on a
rating, sentiment, or customer attribute."

### 4.5 SMS consent (a product rule too)

Halo only texts a customer when the business has marked that customer as having agreed to receive a text
(\`sms_consent = true\` on the contact, set by the CSV column, the webhook field, or a checkbox on manual
send that reads "This customer agreed to receive a text from us"). Every SMS names the business, and the
initial text ends with "Reply STOP to opt out". STOP, UNSUBSCRIBE, CANCEL, END and QUIT opt the
number out immediately for that business until they text START. Without SMS consent, Halo sends email only.

## 5. User stories

### Business owner or practice manager (workspace owner)
1. As an owner, I sign up, add my business and first location, and paste my Google review link (or
   connect my Google Business Profile) in under 5 minutes.
2. As an owner, I send my first review request by hand to my own phone and see exactly what customers see.
3. As an owner, I upload a CSV of yesterday's visits (name, mobile, email, visit time, consent) and Halo
   schedules a request for each one, 2 hours after the visit, inside my sending hours.
4. As an owner, I copy a webhook URL into Zapier (or my booking tool) so every completed appointment
   creates a request automatically.
5. As an owner, I register my business for texting (a toll-free number verified in my business name) from
   a form in Halo, and see its status until it is approved.
6. As an owner, I edit the text and email wording within limits Halo enforces (my business name, the
   link, opt-out line, no incentives, one SMS segment).
7. As an owner, I get an email (and see a badge) within a minute when a customer leaves private feedback
   with 3 stars or fewer, with their name and number so I can call them.
8. As an owner, I mark feedback "Contacted" or "Resolved" and add a note.
9. As an owner, I connect Google once and every new review appears in Halo within an hour, with a reply
   already drafted in my tone.
10. As an owner, I edit or approve the draft and it posts to Google. If Google is not connected, I copy the
    draft and paste it into Google myself.
11. As an owner, I teach Halo my tone: a few past replies I liked, my sign-off, words to avoid.
12. As an owner, I see a dashboard per location and across all locations: requests sent, opened, clicked
    to Google, private feedback, new Google reviews, and my average rating over time.
13. As an owner, I invite my front desk manager. Members can send requests, read feedback and approve
    replies. Only owners and admins change billing, templates, integrations and locations.

### Agency (workspace owner who serves several local businesses)
14. As an agency, each client business is a location with its own name, review link, SMS number and tone.
15. As an agency, I switch between client locations from the dashboard filter and see a combined view.
16. As an agency on the Agency plan, emails carry the client's name only, with no Halo footer.

### Customer of the business (never logs in)
17. As a customer, I get one short text after my visit, tap the link, see the business name and logo,
    and can tap a star, post on Google, or send a private note, in any order.
18. As a customer, I reply STOP and never hear from that business through Halo again.

## 6. Scope decisions (and why)

| Decision | Choice | Why | What breaks first at scale, and the fix |
|---|---|---|---|
| Google connection | Two modes per location: **Link mode** (paste the review link, works on day 1) and **Connected mode** (Google Business Profile API: read reviews, post replies, read the review link) | GBP API access needs Google's approval for your Cloud project, which takes days to weeks and needs a verified profile you manage that is 60+ days old with a website [verify]. Link mode means you can sell before approval | Polling reviews hourly for every location. At ~2,000 locations that is ~33 calls a minute, far under the 300 QPM default [verify]. Past ~5,000 locations switch to Pub/Sub NEW_REVIEW notifications |
| Review data without the API | Not shown. In Link mode the dashboard shows Halo's own numbers (sent, opened, clicked, feedback) and a "Paste a review to draft a reply" box | The Places API forbids storing ratings and reviews (only the place ID may be cached) and Enterprise fields cost $20 per 1,000 calls [verify], so a rating chart built on it would break the terms | Customers ask for a trend chart in Link mode. Fix: they connect Google |
| SMS sender | One Twilio subaccount and one **toll-free number** per business, verified in that business's name through Twilio's Toll-Free Verification API | Twilio's preferred ISV pattern is a subaccount per customer. Toll-free verification has no brand or campaign fees (10DLC charges a $4.50 to $46 brand fee, $15 campaign vetting and $1.50 to $10 a month per campaign [verify]). One number costs about $2.15 a month [verify] | Verification takes 5 to 15 business days [verify], so SMS is off during most trials. Fix: trials send email, and the setup form is step 3 of onboarding so approval often lands by the time they pay |
| SMS countries | US numbers only in v1 (E.164 starting +1 and a US area code). Everyone else gets email | US rates are $0.0083 per segment plus carrier fees [verify]. UK and EU rates are several times higher and sender rules differ | UK demand. Fix: an alphanumeric sender ID per business and a higher priced UK plan, later |
| Message length | Every SMS is GSM-7 and one segment (160 characters or fewer) after the link and business name are filled in | Cost is per segment. An emoji or curly quote switches to UCS-2 and halves the limit to 70 | Long business names. Fix: \`sms_name\` field (max 24 characters) used in texts |
| Links in SMS | Halo's own short link \`https://usehalo.app/r/<10 char token>\`, not a third-party shortener | Public shorteners hurt carrier deliverability and leak data. Our link also measures opens | Token guessing. Fix: 10 base62 chars (about 59 bits), sha256 stored, rate limit per IP, tokens expire after 60 days |
| Visit sources | Manual send, CSV upload, and a signed intake webhook (Zapier "Webhooks by Zapier", Make, or the booking tool's own webhooks) | Covers every booking tool on day 1 without building 20 integrations. Zapier webhooks need the customer's paid Zapier plan (Professional, about $19.99 a month billed yearly [verify]) | Customers without Zapier. Fix: native integrations for the top 3 tools later (Square, Jobber, Housecall Pro) |
| Sending | Every request is a scheduled row. A pg_cron worker sends due rows every minute, in batches, inside each location's sending hours | A CSV of 2,000 rows must not be 2,000 requests in one HTTP call. Quiet hours and the visit delay need a scheduler anyway | Worker throughput. One run sends up to 200 messages (Twilio default throughput for a toll-free number is about 3 messages per second [verify]). Fix: per-sender pacing and a second schedule offset by 30 s |
| AI replies | \`claude-opus-5-5\` at low effort with structured output, drafted on new review, approved by a human | Replies are short and public. A human approves every one (no auto-post in v1) | Cost per draft creeps with long tone samples. Fix: cache the tone block, cap samples at 5 x 600 characters |
| Multi-location | Workspace > locations. Members see all locations of their workspace | Agencies and multi-site clinics need one login | Agencies want client-only logins. Fix: location-scoped roles, later |
| Billing owner | The workspace owner's subscription decides access for the whole workspace | One card per business or agency | Ownership transfer needs a support action in v1 |

## 7. Architecture

\`\`\`
  Booking / POS tool        Owner + team (browser)                Customer (phone, no login)
  (Zapier, webhook, CSV)            |                                        |
          |                         v                                        v
          |        +-----------------------------------+      +------------------------------+
          |        |  Next.js on Vercel                |      |  /r/[token]  rating page     |
          |        |  /app/* (getClaims on the server)  |      |  talks only to hl-public     |
          |        |  /api/google/oauth/{start,callback}|      +---------------+--------------+
          |        +----------------+------------------+                      |
          |                         | publishable key + JWT (RLS)             | token only
          v                         v                                         v
  +------------------------------------------------------------------------------------------+
  |  Supabase                                                                                 |
  |  Postgres + RLS (workspace_id)   Storage: csv-imports (private), location-logos (public)  |
  |  Edge functions:                                                                          |
  |   hl-intake  hl-csv-import  hl-send-worker  hl-public  hl-twilio-webhook                  |
  |   hl-resend-webhook  hl-sms-setup  hl-google-sync  hl-draft-reply  hl-post-reply          |
  |  pg_cron: send worker every minute, google sync every 15 min, sms setup poll every 30 min |
  |  Vault: Twilio subaccount auth tokens, Google refresh tokens, cron secret                 |
  +------+----------------------+----------------------+--------------------+---------------+
         |                      |                      |                    |
         v                      v                      v                    v
     Twilio                 Resend                Google Business      Anthropic API
     subaccount per         review emails,        Profile APIs         claude-opus-5-5
     business, toll-free    owner alerts,         (accounts, locations, reply drafts
     number, status + STOP  bounces by webhook    reviews, replies)    in the owner's tone
     webhooks
\`\`\`

### 7.1 Flow of one review request
1. A visit arrives: \`hl-intake\` (webhook with \`x-halo-key\`), \`hl-csv-import\` (one row of a CSV), or the
   "Send a request" dialog (which calls \`hl-intake\` with the user's JWT).
2. \`enqueue_review_request()\` upserts the contact, applies the factual skip rules (R4), and inserts a
   \`review_requests\` row with \`status = 'scheduled'\` and \`send_at = visit_at + delay\`, moved forward
   into the location's sending hours. The idempotency key stops duplicates from webhook retries.
3. \`hl-send-worker\` (every minute) claims due rows with \`for update skip locked\`, checks the plan cap,
   creates a link token, renders the template, sends the SMS through the business's Twilio subaccount
   and/or the email through Resend, meters usage, and sets \`status = 'sent'\`.
4. Twilio posts delivery status to \`hl-twilio-webhook\` (signature checked). Resend posts bounces to
   \`hl-resend-webhook\` (Svix signature checked).
5. The customer opens \`/r/<token>\`. The page calls \`hl-public\` (\`view\`), which records \`opened_at\`.
   Tapping a star calls \`rate\`. Tapping Google calls \`click\` and then opens the review URL. Sending a
   private note calls \`feedback\`, which inserts \`feedback\` and, if the rating is at or below the
   location's alert threshold (or there is no rating), queues an owner alert.
6. 48 hours after sending, if \`opened_at\` is still null, the worker sends one reminder with a fresh link.
   Nothing else is ever sent for that request.

### 7.2 Flow of one Google review
1. \`hl-google-sync\` (every 15 minutes, each location at most once an hour) refreshes the Google access
   token, lists the newest reviews, upserts \`google_reviews\`, and stores today's rating snapshot.
2. Each new review without a reply queues a \`draft_reply\` job (if the plan has drafts left).
3. \`hl-draft-reply\` builds the prompt (tone profile + the review as data), calls Claude, checks the output,
   and saves a \`reply_drafts\` row with \`status = 'ready'\`. The owner gets the daily digest or an instant
   email for 1 and 2 star reviews.
4. The owner edits and clicks "Approve and post". \`hl-post-reply\` PUTs the reply to Google and marks it
   \`posted\`. If the review was deleted or changed in the meantime, it says so and does not post.

## 8. Routes and pages

The app shell has a left sidebar (DESIGN.md section 6). One level, no nested menus.

**Sidebar, top group:** logo, Dashboard, Requests, Feedback, Reviews, Locations.
**Sidebar, bottom group (always this order):** Documentation, Help, Billing, Settings.

| Route | Who | What it does |
|---|---|---|
| \`/\` | public | Landing page (LANDING.md) |
| \`/pricing\` | public | Pricing section, full width, with the monthly/yearly toggle |
| \`/compare/[competitor]\` | public | Halo vs Birdeye, Podium, NiceJob, GatherUp (static, from LANDING.md data) |
| \`/google-review-policy\` | public | Plain English guide to review gating and how Halo complies (SEO page, section 4 rewritten for owners) |
| \`/login\`, \`/signup\`, \`/reset\` | public | Supabase auth. "Confirm email" off |
| \`/invite/[token]\` | public, then auth | Accept a team invite |
| \`/onboarding\` | auth | 5 steps: business, first location, Google (paste link or connect), texting setup (skippable), send a test to yourself |
| \`/paywall\` | auth | Shown when the owner's subscription is not trialing or active |
| \`/app\` | member | Dashboard: KPI row, funnel, rating trend, latest feedback, reviews awaiting reply. Location filter |
| \`/app/requests\` | member | Tabs: Requests (table with status and funnel ticks), People (contacts), Imports (CSV history). "Send a request" and "Import CSV" buttons |
| \`/app/requests/[id]\` | member | Side panel over the table: timeline (scheduled, sent, delivered, opened, rated, clicked, feedback), messages sent |
| \`/app/feedback\` | member | Private feedback inbox: rating, note, customer, location, status. Side panel with call/email buttons and notes |
| \`/app/reviews\` | member | Google reviews table (Connected mode) with reply status. Side panel with the draft editor. In Link mode: "Paste a review" drafter |
| \`/app/locations\` | member (edit: owner/admin) | Locations list with Google mode, SMS status and plan usage |
| \`/app/locations/[id]\` | member (edit: owner/admin) | Tabs: Details, Google, Texting, Messages (templates), Intake (webhook keys and Zapier guide), Tone |
| \`/app/docs\` | member | Documentation: getting visits into Halo, the review policy, SMS rules, Zapier recipes, FAQ |
| \`/app/help\` | member | Contact form (Resend to the founder), status of the user's open tickets, links |
| \`/app/billing\` | owner | Plan, usage meters (requests, AI drafts, locations, seats), Stripe portal button |
| \`/app/settings\` | member | Tabs: Profile, Workspace, Team, Notifications. (Integrations live per location) |
| \`/r/[token]\` | public | The customer rating page. Rate, post on Google, send private feedback |
| \`/u/[token]\` | public | Email unsubscribe for that business (one click, then a confirmation) |
| \`/sms-consent/[senderId]\` | public | Static page for the carrier review: how this business collects text consent at booking, with the sample message |
| \`/join/[slug]\` | public | Optional opt-in form per location (name, mobile, "Text me after my visit" checkbox). Also the opt-in proof URL for toll-free verification |
| \`/api/google/oauth/start\` | owner/admin | Starts Google OAuth with scope \`https://www.googleapis.com/auth/business.manage\`, \`access_type=offline\`, \`prompt=consent\` |
| \`/api/google/oauth/callback\` | owner/admin | Exchanges the code, stores the refresh token in Vault through \`store_google_connection()\`, redirects to location picking |
| \`/api/locations/[id]/intake-keys\` | owner/admin | POST creates a key and returns it once; DELETE revokes |
| \`/api/stripe/webhook\` | Stripe | Platform subscription webhook (shared playbook step) |

Rules for every \`/app\` page:
- Server components check the user with \`supabase.auth.getClaims()\` and redirect to \`/login\` if missing.
- \`lib/workspace.ts#getCurrentWorkspace()\` loads the workspace and role; no workspace sends you to
  \`/onboarding\`; no active access sends you to \`/paywall\` (except \`/app/billing\` and \`/app/settings\`).
- All reads go through the user's RLS client. Only route handlers and edge functions use the secret key.
- The location filter is a URL param (\`?loc=<id>\` or \`?loc=all\`) so views can be shared and reloaded.

## 9. Data model

All tables live in \`public\`, have RLS on, and carry \`workspace_id\` (except \`profiles\`, \`subscriptions\`,
\`stripe_events\`, \`plan_prices\`, \`rate_limits\`, \`email_suppressions\`). Full SQL is in the kit's migration.

| Table | Key columns | Notes |
|---|---|---|
| \`profiles\` | id (= auth.users.id), email, full_name, current_workspace_id | Created by trigger on signup |
| \`workspaces\` | id, name, kind (business/agency), owner_id, created_at | The billing unit |
| \`workspace_members\` | workspace_id, user_id, role (owner/admin/member) | PK (workspace_id, user_id) |
| \`invites\` | id, workspace_id, email, role, token_hash, expires_at, accepted_at | Token shown once, sha256 stored |
| \`locations\` | id, workspace_id, name, sms_name (max 24), slug, timezone, address, logo_path, google_mode (link/connected), review_url, google_account, google_location, place_id, sms_sender_id, send_delay_minutes (default 120), send_window_start (09:00), send_window_end (20:00), reminder_enabled, alert_threshold (default 3), alert_emails[], archived_at | Count capped by plan in a trigger |
| \`sms_senders\` | id, workspace_id, legal_business_name, website, business address fields, contact name/email/phone, twilio_subaccount_sid, auth_token_secret_id (Vault), phone_number, phone_sid, verification_sid, status, rejection_reason, submitted_at, approved_at | One per business. Several locations of the same business can share one |
| \`google_connections\` | id, workspace_id, google_email, refresh_token_secret_id (Vault), status, last_error, connected_by | One per Google login. Locations point at the Google location name |
| \`intake_keys\` | id, workspace_id, location_id, label, key_prefix (first 8 chars), key_hash, last_used_at, revoked_at | Raw key shown once |
| \`contacts\` | id, workspace_id, location_id, full_name, first_name, phone_e164, email, sms_consent, consent_source, sms_opted_out_at, email_opted_out_at, external_ref, last_requested_at | Unique per location on phone and on email |
| \`csv_imports\` | id, workspace_id, location_id, storage_path, status, rows_total, rows_scheduled, rows_skipped, errors (jsonb, first 100), created_by | One row per upload |
| \`review_requests\` | id, workspace_id, location_id, contact_id, source, channel (sms/email/both), status, skip_reason, visit_at, send_at, sent_at, delivered_at, reminder_sent_at, opened_at, rated_at, rating (1 to 5), google_clicked_at, feedback_at, idempotency_key (unique), attempts, last_error, csv_import_id | The heart of the app. Funnel columns are timestamps |
| \`request_links\` | id, workspace_id, request_id, kind (initial/reminder), token_hash (unique), expires_at | One per message sent. Both resolve to the same request |
| \`message_events\` | id, workspace_id, request_id, channel, provider, provider_message_id, event, error_code, dedupe_key (unique), occurred_at | Twilio and Resend callbacks, de-duplicated |
| \`feedback\` | id, workspace_id, location_id, request_id (unique), rating, body, wants_reply, status (new/contacted/resolved), assigned_to, owner_note, resolved_at | Private, never shown publicly |
| \`google_reviews\` | id, workspace_id, location_id, review_name (unique), star_rating, comment, reviewer_name, reviewer_photo_url, is_anonymous, create_time, update_time, reply_comment, reply_update_time, first_seen_at, removed_at | From the GBP API only |
| \`reply_drafts\` | id, workspace_id, review_id, status, body, source (ai/manual/pasted), pasted_review (Link mode), input_tokens, output_tokens, cost_micros, approved_by, posted_at, error | Many per review (redrafts); one can be posted |
| \`tone_profiles\` | id, workspace_id, location_id (null = workspace default), voice_notes, sign_off, sample_replies[] (max 5), avoid_phrases[] | Feeds the reply prompt |
| \`message_templates\` | id, workspace_id, location_id (null = default), channel, kind (initial/reminder), subject, body | Checked by a trigger (R6, one segment, must contain \`{link}\`) |
| \`rating_snapshots\` | id, workspace_id, location_id, snapshot_date, average_rating, total_review_count | One per location per day from the reviews list response |
| \`notification_prefs\` | workspace_id, user_id, on_feedback, on_low_review, daily_digest, weekly_report | |
| \`jobs\` | id, workspace_id, kind, ref_id, status, attempts, run_after, locked_at, idempotency_key, payload, last_error | Background work other than sending |
| \`usage_ledger\` | id, workspace_id, kind (review_requests, sms_segments, emails, ai_drafts), quantity, cost_usd_micros, ref_id, idempotency_key | The meter |
| \`email_log\` | id, workspace_id, kind, dedupe_key, to_email, resend_id, status | Every email Halo sends |
| \`email_suppressions\` | email, reason | Hard bounces and complaints, never emailed again |
| \`subscriptions\`, \`stripe_events\`, \`plan_prices\` | | Written only by the Stripe webhook (secret key) |
| \`rate_limits\` | key, window_start, hits | Fixed window counters |

Views (security invoker, obey RLS): \`location_daily_stats\` (per location per day: scheduled, sent, delivered,
opened, rated, avg_private_rating, clicked, feedback_count, new_google_reviews) and \`request_funnel\`
(per request: the furthest stage reached).

## 10. State machines

### 10.1 Review request (\`review_requests.status\`)

\`\`\`
                 enqueue_review_request()
                          |
          factual skip?  yes ----------------------------> skipped (skip_reason)
                          | no
                          v
                     scheduled  --- owner cancels -------> cancelled
                          | send_at <= now and inside sending hours
                          v
                      sending   --- cap reached ---------> skipped ('limit_reached')
                          |     --- provider error x3 ---> failed (last_error)
                          v
                        sent  ---- delivered / opened / rated / clicked / feedback are
                                   timestamps on the row, not statuses
\`\`\`

Skip reasons (the only ones allowed, R4): \`no_channel\` (no consented US mobile and no email),
\`opted_out\`, \`asked_recently\` (same contact and location within 90 days), \`invalid_phone\`,
\`suppressed_email\`, \`limit_reached\`, \`sms_not_ready\` with no email fallback, \`duplicate\` (same
idempotency key, returned as the existing row, not a new skipped row).

Funnel stage (derived, used in tables and charts): sent > delivered > opened > rated > clicked_google.
\`feedback_at\` is shown as its own tick, never as a stage that replaces Google.

Reminder rule (R5): if \`sent_at <= now() - reminder_after\` (48 h) and \`opened_at is null\` and
\`reminder_sent_at is null\` and the location has reminders on and the contact has not opted out, send one
reminder on the same channel(s), with a new \`request_links\` row of kind \`reminder\`. Never more than one.

### 10.2 Sending window

\`send_at = visit_at + send_delay_minutes\`, then: if the local time at the location is before
\`send_window_start\`, move to \`send_window_start\` that day; if after \`send_window_end\`, move to
\`send_window_start\` the next day. Sundays are allowed unless the location turns them off. A visit older
than 7 days is skipped as \`stale_visit\` (add it to the allowed list above) so a CSV of last year's
customers cannot be blasted.

### 10.3 SMS sender (\`sms_senders.status\`)

\`\`\`
  draft --(owner submits the form)--> creating_subaccount --> number_bought --> verification_pending
     ^                                                                             |        |
     |                                                                 approved <--+        +--> rejected
     +---------------- owner edits and resubmits (rejected only) ------------------------------+
  any --(subscription ends + 30 days, or owner deletes)--> released (number released, subaccount closed)
\`\`\`

While not \`approved\`, requests for that location go by email only (if the contact has one) and the
location page shows "Texting starts when your number is approved (usually 5 to 15 business days)".

### 10.4 Google connection and location mode

\`link\` (review_url set by hand) <--> \`connected\` (google_location set, review_url read from the
location's \`metadata.newReviewUri\`). A connection goes \`active\` > \`error\` when a token refresh fails
with \`invalid_grant\`; the location falls back to its last known review URL (still works for requests)
and the owner gets one email "Reconnect Google to keep replies and review tracking working".

### 10.5 Reply draft (\`reply_drafts.status\`)

\`\`\`
  generating --> ready --(owner edits, any number of times)--> ready
      |            |--(Approve and post)--> posting --> posted
      v            |                           |
   failed          +--(Discard)--> discarded   +--> failed (Google error, shown with a retry button)
\`\`\`

Only one draft per review can be \`posting\` or \`posted\` (partial unique index). Editing a posted reply
creates a new draft and PUTs again (Google's updateReply replaces the reply).

### 10.6 Feedback (\`feedback.status\`)

\`new\` > \`contacted\` > \`resolved\`. Any member can move it. \`resolved_at\` is stamped on resolve. Feedback is
never deleted by members; owners can delete it on the customer's request.

### 10.7 CSV import (\`csv_imports.status\`)

\`uploaded\` > \`processing\` > \`done\` | \`failed\`. Rows are validated first; the summary shows scheduled,
skipped by reason, and the first 100 row errors with row numbers.
`
