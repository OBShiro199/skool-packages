// Harvest build PRD (PRD.md), part 1: product, risk, architecture, routes, data model, state machines.

export const buildPrd1 = `# Harvest: build PRD

Version 1.0. Download this file, save it as \`PRD.md\` in the root of your project folder, and reference it
in Claude Code with \`@PRD.md\`. Claude Code reads it before every task. Where this file and your instinct
disagree, this file wins. The look and feel lives in \`@DESIGN_SYSTEM.md\` (the Quiet Precision base system) and
\`@DESIGN.md\` (Harvest's accent and screens), the marketing page in \`@LANDING.md\`. Your \`CLAUDE.md\` should
contain the line \`UI rules: @DESIGN_SYSTEM.md @DESIGN.md\`.

## 0. How to use this document

- Read sections 1 to 6 once so you know what you are building, for whom, and which risks you are carrying.
- Sections 7 to 18 are the spec. Claude Code builds from them.
- Section 21 lists the build milestones. Do them in order. Do not start a milestone before the one
  before it passes its acceptance tests (section 20).
- Every new Claude Code session, say: "Read @PRD.md, @DESIGN_SYSTEM.md and @DESIGN.md. We are on milestone N.
  Plan first, then wait for my OK."
- Use Opus at high effort (\`/model opus\`, \`/effort high\`) for anything that touches the database schema,
  RLS, the job queue, metering, webhooks or Stripe. Medium is fine for UI copy and layout.

## 1. Problem

People who post on LinkedIn get a steady stream of warm attention they never use. A founder posts about
onboarding churn on Tuesday. By Thursday 340 people have reacted and 41 have commented. Some of them are
heads of customer success at 50 to 200 person SaaS companies: the exact buyer. Nobody follows up, because
working out who those 381 people are, which ones fit, and how to reach them takes an afternoon per post.

The same is true one step removed. A competitor's post about "our new AI SDR" collects 900 reactions from
people actively shopping for an AI SDR. An influencer in your niche posts a poll and 2,000 people in your
market raise their hand. That is the warmest list on the internet and it refreshes every day.

What people do today:
- Scroll the reactions list by hand, open 30 profiles, copy names into a sheet. One post costs about
  90 minutes and gets them no emails.
- Use PhantomBuster's LinkedIn phantoms ($69 a month and up [verify]), which run on the user's own LinkedIn
  session cookie. That puts their personal LinkedIn account at risk of restriction, and they still have to
  enrich, score and write openers themselves.
- Pay for signal tools such as Trigify (from $149 a month [verify]) or Teamfluence (from $99 a month,
  no email enrichment on the entry plan [verify]) built for sales teams, with dashboards they never open.

The cost: a founder whose posts get 300 reactions a week is ignoring about 1,200 warm people a month. If 3%
fit the buyer profile and 10% of those reply to a relevant email, that is 3 to 4 conversations a month left
on the table.

## 2. Ideal customer (ICP)

- **Who:** B2B founders who post on LinkedIn 1 to 5 times a week (SaaS, services, dev tools), small agencies
  (2 to 20 people: lead gen, paid ads, design, dev shops) and recruiters who build talent pools from posts.
- **Volume:** they or the creators they follow get 100 to 3,000 engagements a week.
- **Behaviour:** already use LinkedIn as their main channel. Many already run a cold email or CRM tool
  (Smartlead, Instantly, HubSpot free, Pipedrive). They want the list, not another inbox.
- **Pain trigger:** "That post did 600 reactions and I got zero calls out of it."
- **Will pay:** $59 to $249 a month if they get 20 named, emailable, relevant people every morning and one
  extra deal a quarter. One closed $3,000 deal pays for Solo for four years.
- **Not for (v1):** enterprise sales teams wanting intent data across 50 reps, anyone who wants automated
  LinkedIn connection requests or DMs (Harvest never acts on LinkedIn), people outside B2B.

## 3. The one core job

"I paste the posts and creators I care about once. Every morning at 7am an email lists the 20 warmest people
who engaged yesterday who fit my buyer, with their role, company, verified email, why they fit, and an
opener that mentions what they reacted to. I click one button to push them to my CRM."

Everything in v1 serves that sentence. If a feature does not shorten "engaged with a post" to "in my CRM with
an email", it waits.

## 4. User stories

### Founder or agency owner (workspace owner)
1. As an owner, I sign up, name my workspace and describe my ideal buyer in plain words in under 5 minutes.
2. As an owner, Harvest turns my description into a structured ICP (titles, seniority, company size, industries,
   countries, exclusions) that I can edit.
3. As an owner, I add sources: a LinkedIn post URL (mine, a competitor's, an influencer's) or a creator's profile
   URL so every new post they publish is mined automatically.
4. As an owner, I tag each source as Mine, Competitor or Influencer, and pick which ICP it scores against.
5. As an owner, I see each source's last check, posts found, engagers collected and leads produced.
6. As an owner, every morning I get a digest email with the top 20 new warm leads (or fewer if there are fewer).
7. As an owner, I open Today and see the same leads with score, tier, reasons, the post they engaged with,
   their comment if any, and a suggested opener I can copy or edit.
8. As an owner, I save a lead to a list, dismiss it, or mark it "Customer" (which suppresses them forever).
9. As an owner, I upload a CSV of current customers and paste domains to suppress, so they never appear.
10. As an owner, I export a list as CSV (with the opener column) for Smartlead, Instantly or Outbounder.
11. As an owner, I connect HubSpot or Pipedrive by pasting a token and push a lead or a whole list as contacts
    with a note that says what they engaged with.
12. As an owner, I add a generic webhook URL (Zapier, Make, n8n, Clay) and every pushed lead is POSTed there,
    signed so the receiver can check it came from Harvest.
13. As an owner, I see my usage this month (engagers collected, leads enriched) against my plan caps before I
    hit them, and I can pause a noisy source.
14. As an owner, I click "Forget this person" and their data is deleted and they are suppressed in my workspace.
15. As an owner, I invite teammates (Growth and Agency) and they share sources, lists and leads.

### Teammate (member)
16. As a member, I see Today, Leads, Sources and Lists, save and push leads, but cannot change billing,
    integrations tokens or delete the workspace.

### Harvest (the system)
17. As the system, every night per workspace I discover new posts from tracked creators, collect reactions and
    comments for posts that are due, enrich only the people who look like a fit, score them and send the digest.
18. As the system, I never spend more on a workspace than its plan allows, and I never contact anyone.

## 5. Compliance and risk (read this before you build)

Be honest with yourself about what this product does. It reads public engagement on LinkedIn posts using a
third-party scraping service and enriches those people with a commercial data provider. LinkedIn's User
Agreement prohibits scraping and automated access, and LinkedIn enforces it:

- **hiQ v. LinkedIn:** the US courts said scraping public pages is not a federal computer crime (2022), but hiQ
  was still found to have breached LinkedIn's user agreement and settled with a permanent injunction and
  $500,000 in damages (December 2022).
- **Proxycurl:** sued by LinkedIn in January 2025, shut down by July 2025. It had been the default LinkedIn
  data API for thousands of products, which broke overnight.

So the risk is real and it sits mostly on the supply side: the data source can disappear. The safest workable
route, and the one this PRD builds:

1. **Harvest never touches the customer's LinkedIn account.** No cookies, no passwords, no browser extension,
   no auto-connect, no DMs. The customer's account cannot be restricted because of Harvest.
2. **User-supplied targets only.** Harvest only reads posts the customer names (a post URL) or posts by
   creators they name. It never crawls LinkedIn broadly or builds a global people database.
3. **A scraping provider that runs its own infrastructure.** Collection runs on Apify actors that state they need
   no cookies or LinkedIn account (HarvestAPI's post reactions and post comments actors [verify their current
   claims on the actor pages]). Under Apify's Standard Actor Contract the actor developer acts as processor on
   your instructions. They carry the operational scraping risk; you carry the product risk.
4. **One adapter, swappable.** Every call to a data vendor goes through \`_shared/providers/\`. Actor ids live in
   secrets (\`APIFY_REACTIONS_ACTOR\`, \`APIFY_COMMENTS_ACTOR\`, \`APIFY_POSTS_ACTOR\`), so switching to another
   actor is one secret change plus a field mapper. Each dataset item is validated with zod; a schema change
   fails loudly instead of filling the database with blanks.
5. **A manual fallback that keeps the product alive.** If collection stops working, customers can upload a CSV
   of engagers (name, LinkedIn URL, optional headline and comment). Enrichment, scoring, digest and push all
   keep working. Build this in milestone M4, not as an afterthought.
6. **Data minimisation.** Store only what the job needs: name, public profile URL, headline, location, the
   engagement (kind, reaction type, comment excerpt up to 500 characters), and the enriched work fields.
   Engagements are deleted after 90 days and people who never became a lead after 180 days (nightly purge).
7. **Forget and suppress.** One click deletes a person's data in a workspace and adds them to suppression so
   they are never collected into that workspace again. An unsubscribe link at the bottom of the digest is for
   the customer, not the leads; Harvest never emails leads.
8. **Monitoring.** A run that returns zero items for a post that showed engagement, or a sudden fall in items
   across all workspaces, raises an alert to the founder (email to ADMIN_EMAIL) the same morning.

Say this plainly on the Help page: "Harvest reads public engagement on posts you choose, using third-party data
providers. It never logs in to LinkedIn as you." Do not claim Harvest is "LinkedIn approved" or "100% compliant".

## 6. Architecture

### 6.1 The shape

\`\`\`
 Browser (Next.js on Vercel)                         Supabase
 ┌──────────────────────────┐   supabase-js (RLS)   ┌──────────────────────────────────────┐
 │ /app/today  /app/leads   │ ────────────────────▶ │ Postgres: workspaces, sources, posts,│
 │ /app/sources /app/lists  │                       │ people, engagements, leads, lists,   │
 │ /app/targeting  settings │ ◀──── realtime ─────  │ jobs, usage_ledger, suppressions ... │
 └────────────┬─────────────┘                       └───────▲───────────────┬──────────────┘
              │ fetch + user JWT                            │ secret key    │ pg_cron + pg_net
              ▼                                             │               ▼ every 1 to 15 min
 ┌────────────────────────────────────────────────────────────────────────────────────────┐
 │ Supabase Edge Functions (Deno)                                                         │
 │ hv-add-source  hv-push   (browser, JWT)                                                │
 │ hv-scheduler   hv-collect   hv-ingest   hv-enrich   hv-score   hv-digest  (cron secret) │
 │ hv-apify-webhook  (Apify, shared secret header)                                        │
 └───────┬───────────────┬─────────────────┬───────────────┬───────────────┬──────────────┘
         ▼               ▼                 ▼               ▼               ▼
   Apify actors     Prospeo           MillionVerifier   Claude API      Resend
   (posts,          enrich-person     (verify email)    claude-haiku-   (digest +
   reactions,       (role, company,                     5-5 (prefilter, transactional)
   comments)        size, email)                        score, opener)
         │
         └── ACTOR.RUN.SUCCEEDED / FAILED webhook ──▶ hv-apify-webhook ──▶ jobs (ingest_run)

 Stripe ── checkout, portal, webhook ──▶ /api/stripe/webhook (Next.js) ──▶ public.subscriptions
 HubSpot / Pipedrive / customer webhook ◀── hv-push (customer's own token, encrypted at rest)
\`\`\`

### 6.2 The nightly pipeline, step by step

\`\`\`
 03:00 local  hv-scheduler: create daily_runs row (one per workspace per date, idempotent)
              ├─ enqueue discover_posts   (one job per workspace with active creator sources)
              └─ enqueue collect_post     (one job per workspace, all posts whose next_pass_at is due)
 03:01        hv-collect: start Apify runs (batches of up to 25 post URLs per run) with an ad-hoc webhook
              and maxTotalChargeUsd set from the remaining budget. Store apify_runs rows.
 03:05-04:30  Apify finishes ──▶ hv-apify-webhook ──▶ enqueue ingest_run (deduped by run id)
              hv-ingest: page the dataset, upsert people + engagements, meter engagements, apply suppression,
              enqueue prefilter for new people
              hv-enrich (prefilter): Claude scores headlines in batches of 50, cheap
              hv-enrich (enrich): top candidates by prefilter score, inside today's enrichment budget:
              Prospeo enrich-person, then MillionVerifier on the email
              hv-score: Claude full score + tier + reasons + opener, upsert leads
 06:45        daily_runs.status = ready when no jobs for that run are queued or running
 07:00 local  hv-digest: top 20 new leads (tier hot or warm, not yet surfaced) ──▶ Resend
              If the run is not ready by 07:00, send at 07:00 with what is ready and say "N still processing".
\`\`\`

### 6.3 Decisions and trade-offs

| Decision | Why | What breaks first at scale | The fix |
|---|---|---|---|
| Postgres job queue (\`jobs\` + \`claim_jobs\` with skip locked) driven by pg_cron, not Trigger.dev or a queue service | One system to run, every step visible in SQL, free | At about 1,000 workspaces the 03:00 spike creates 2,000+ jobs at once and workers that run once a minute fall behind | Spread workspaces across 01:00 to 05:00 by hashing workspace id into a start offset (already in the scheduler); then move workers to Trigger.dev |
| Apify runs are async with ad-hoc webhooks, never the 300 second sync endpoint | A 2,000 reaction post can take minutes; sync calls time out (408) and lose the run | Webhooks can be lost | hv-scheduler polls any apify_runs row still \`running\` after 20 minutes with GET /v2/actor-runs/{id} |
| Batch up to 25 posts per Apify run | Fewer runs, fewer webhooks, less per-run start-up cost | Very large posts in one batch delay the rest | Posts with more than 1,500 reactions get their own run |
| Prefilter on headline before paying for enrichment | Enrichment is about 10 times the cost of collection; most engagers are not buyers | A bad ICP filters everyone out | Today shows "N filtered by your ICP"; user can lower the threshold or edit the ICP; a weekly sample of 10 filtered people shows on the Targeting page |
| Daily enrichment budget pacing | Spreads the monthly cap over the month so day 3 cannot use it all | A quiet first half of the month leaves budget unused | Budget per day = remaining enrichments / days left in period, minimum 5, so unused budget rolls forward |
| One lead row per person per workspace | Dedupe across days for free; a person who engages again moves up rather than duplicating | Re-scoring the same person daily costs money | Re-score only if new engagement and last score older than 7 days |
| Customer CRM tokens stored encrypted with AES-GCM in Postgres | No OAuth app reviews in v1; customers paste a token | Token leaks if the encryption key leaks | Key only in Supabase secrets; rotate by re-encrypting (script in Help for the founder) |

### 6.4 Limits of Supabase you design around
- Edge functions: keep each invocation under 50 seconds of work. Workers loop "claim 5 jobs, do them, check the
  clock" and exit at 45 seconds; the next cron tick continues. The platform wall clock limit is higher
  (150 to 400 seconds depending on plan [verify]) but do not rely on it.
- pg_net requests are fire and forget; workers must be idempotent because a tick can overlap the previous one.
- Realtime: subscribe only to \`daily_runs\` and \`leads\` for the current workspace, never \`people\`.

## 7. Routes and pages

Next.js App Router. Marketing pages are public. Everything under \`/app\` requires a session and an active
subscription (\`has_active_access\`), except \`/app/billing\` and \`/app/settings\` which stay reachable when paused.

### 7.1 Public
| Route | What it is |
|---|---|
| \`/\` | Landing page (LANDING.md) |
| \`/pricing\` | Pricing section full width with monthly/annual toggle |
| \`/compare/[competitor]\` | phantombuster, trigify, teamfluence: honest comparison pages |
| \`/tools/post-lead-estimator\` | Free tool: paste reaction and comment counts, get "warm leads you are ignoring" estimate (no scraping) |
| \`/login\`, \`/signup\`, \`/reset\` | Supabase auth, email + password and Google |
| \`/invite/[token]\` | Accept a workspace invite |
| \`/onboarding\` | 4 steps: workspace, ICP, first source, digest time |
| \`/paywall\` | Shown when access is paused; links to Billing |
| \`/api/unsubscribe\` | One-click digest unsubscribe (signed token) |

### 7.2 App (sidebar, one level, in this order)
Top group (logo, then):
1. **Today** \`/app/today\`: this morning's harvest. Run status, counts, the top leads, filtered count.
2. **Leads** \`/app/leads\`: every lead, table with filter chips, side panel for one lead (\`?lead=<id>\`).
3. **Sources** \`/app/sources\`: posts and creators; \`/app/sources/[id]\` shows posts, runs and yield.
4. **Lists** \`/app/lists\`: saved lists; \`/app/lists/[id]\` table with Export CSV and Push.
5. **Targeting** \`/app/targeting\`: tabs ICP (one per ICP, editable), Suppression (CSV upload, domains, people).

Bottom group, always in this order:
6. **Documentation** \`/app/docs\`: how Harvest works, what each score means, CSV columns, webhook payload.
7. **Help** \`/app/help\`: FAQ, data sources statement (section 5), contact form (Resend to the founder).
8. **Billing** \`/app/billing\`: plan, usage meters, Stripe Customer Portal button. Owner only.
9. **Settings** \`/app/settings\`: tabs Profile, Workspace, Team, Digest, Integrations, Data.

A mini usage meter (engagers and enrichments this month) sits above the bottom group.

### 7.3 Next.js API routes (thin, server only)
| Route | Job |
|---|---|
| \`/api/stripe/webhook\` | Shared Stripe webhook (built in the payments phase) |
| \`/api/stripe/checkout\`, \`/api/stripe/portal\` | Shared payments routes |
| \`/api/export/[listId]\` | Streams a CSV for a list (session checked, RLS applies, meter nothing) |
| \`/api/unsubscribe\` | Verifies HMAC token, turns digest off |
| \`/api/icp/draft\` | Calls Claude to turn a buyer description into ICP fields (prompt 14.1) |

### 7.4 What each app page does

**Today** (\`/app/today\`)
- Toolbar: run status with live dot ("Processing 64%" from \`daily_runs.counters\`), date picker (last 14 runs),
  **Collect now** (disabled with the reason when already used today).
- Count strip (fixed widths, tabular numbers): Engagers collected, New people, Filtered by ICP, Enriched, Hot, Warm.
- Lead table: the run's leads ordered by score. Columns: person (name + title), company (name + size), tier pill,
  score, engaged with (post author + kind), email status icon, actions (Copy opener, Save, Dismiss).
- Empty states: no sources yet (button to add one), run scheduled (shows the time), quiet morning (shows filtered
  count and a link to the ICP), capped (shows which cap and the Upgrade button).

**Leads** (\`/app/leads\`)
- All leads, newest score first. Filter chips: Tier, Status, ICP, Source, Relation, Email status, Date engaged,
  Company size. Search by name, company or domain.
- Row click opens the side panel: person, company facts, score with reasons and disqualifiers, every engagement
  (post excerpt, reaction or comment excerpt, date, link to the post), the opener (editable, Copy), actions
  Save to list, Push, Mark customer, Dismiss, Forget this person.
- Selection bar for bulk actions: Add to list, Push, Export CSV, Dismiss.

**Sources** (\`/app/sources\`)
- Table: label, kind (Post or Creator), relation tag, ICP, status, last checked, posts found, engagers, leads,
  yield (leads per 100 engagers). **Add source** opens a dialog (URL, relation, ICP, Collect now).
- \`/app/sources/[id]\`: the source header, its posts with reaction and comment counts, passes done and next pass,
  and the last 20 Apify runs with status and items.

**Lists** (\`/app/lists\`)
- Lists with counts and last export. \`/app/lists/[id]\`: the lead table scoped to the list with **Export CSV** and
  **Push to...** (integrations dropdown).

**Targeting** (\`/app/targeting\`)
- ICP tab: one card per ICP with all fields as chips, threshold slider (shows "About N% of last week's engagers pass"),
  and a sample of 10 recently filtered people with their prefilter reason so the user can see what is being cut.
- Suppression tab: upload CSV (email, domain or linkedin_url column), paste domains, table of suppressions with
  source and remove action.

**Settings** (\`/app/settings\`)
- Profile (name, email), Workspace (name, timezone, collect and digest hours, sender company and offer), Team (invite,
  roles), Digest (on/off, min tier, recipients), Integrations (HubSpot, Pipedrive, webhooks: connect, test, disconnect),
  Data (import engagers CSV, export all data as CSV, delete workspace).

## 8. Data model

All tables in \`public\`, all with RLS. Every workspace-owned table has \`workspace_id\` and is readable by members via
\`is_workspace_member(workspace_id)\`. Tables written only by edge functions have no insert/update policies.

| Table | Key columns | Notes |
|---|---|---|
| profiles | id (auth.users), email, full_name, current_workspace_id | Created by trigger on signup |
| workspaces | id, name, owner_id, timezone, collect_hour (3), digest_hour (7), sender_company, sender_offer | sender_* feed the opener prompt |
| workspace_members | workspace_id, user_id, role (owner, admin, member) | |
| workspace_invites | workspace_id, email, role, token_hash, expires_at, accepted_at | |
| icps | id, workspace_id, name, description, titles_include[], titles_exclude[], seniorities[], company_size_min, company_size_max, industries[], countries[], keywords_exclude[], prefilter_threshold (55), is_default | Plan caps the count |
| sources | id, workspace_id, icp_id, kind (post, creator), relation (mine, competitor, influencer), url, url_key (unique per workspace), label, status (active, paused, error), last_error, last_checked_at, posts_found, engagers_collected, leads_produced | |
| posts | id, workspace_id, source_id, post_url, url_key, author_name, author_url, posted_at, text_excerpt (500), reaction_count, comment_count, collected_reactions, collected_comments, passes_done, next_pass_at, status (tracking, done, unavailable) | One row per post per workspace |
| daily_runs | id, workspace_id, run_date, status (scheduled, collecting, processing, ready, sent, skipped, failed), counters jsonb, started_at, ready_at, digest_sent_at | unique (workspace_id, run_date) |
| apify_runs | id (Apify run id, text), workspace_id, daily_run_id, kind (posts, reactions, comments), post_ids uuid[], status, dataset_id, items_count, charged_usd, webhook_at, ingested_at | |
| people | id, workspace_id, person_key, linkedin_url, full_name, headline, location, first_seen_at, last_engaged_at, engagement_count, prefilter_score, prefilter_reason, enrich_status, enriched_at, title, seniority, company_name, company_domain, company_linkedin, company_size, company_industry, company_country, email, email_status, email_verified_at, suppressed | unique (workspace_id, person_key) |
| engagements | id, workspace_id, person_id, post_id, kind (reaction, comment), reaction_type, comment_id, comment_excerpt (500), engaged_at, collected_at | unique (post_id, person_id, kind, coalesce(comment_id,'')) |
| leads | id, workspace_id, person_id, icp_id, score (0 to 100), tier (hot, warm, cold), reasons jsonb, disqualifiers jsonb, opener, opener_basis, status (new, saved, dismissed, customer, pushed), first_scored_at, scored_at, surfaced_at, last_engagement_id | unique (workspace_id, person_id) |
| lists, list_items | list: id, workspace_id, name; item: list_id, lead_id | |
| suppressions | id, workspace_id, kind (email, domain, linkedin), value, source (csv, manual, customer, forget, crm), created_by | unique (workspace_id, kind, value) |
| integrations | id, workspace_id, provider (hubspot, pipedrive, webhook), status, config jsonb, secret_ciphertext, secret_last4, last_error, last_used_at | Secret never readable by the browser (column privileges) |
| pushes | id, workspace_id, lead_id, integration_id, status (queued, done, failed), external_id, error, idempotency_key | unique idempotency_key |
| imports | id, workspace_id, kind (suppression_csv, engagers_csv), storage_path, status, rows_total, rows_ok, error | |
| jobs | id, workspace_id, daily_run_id, kind, payload jsonb, status (queued, running, done, dead), attempts, max_attempts, run_after, locked_at, last_error, idempotency_key | unique idempotency_key |
| usage_ledger | id, workspace_id, kind (engagements, enrichments, verifications, ai_prefilter, ai_score), quantity, cost_micros, ref_id, idempotency_key, created_at | unique idempotency_key |
| webhook_events | id (provider + event id), provider, received_at | Dedupe for Apify and Resend |
| email_log | id, workspace_id, user_id, kind, to_email, subject, dedupe_key, resend_id, status | unique dedupe_key |
| notification_prefs | user_id, workspace_id, digest_enabled, digest_min_tier, weekly_summary | |
| rate_limits | key, window_start, count | |
| subscriptions, stripe_events, plan_prices, workspace_limit_overrides | Billing (section 15) | Written only by the server |

### 8.1 person_key
\`person_key\` is the lower-case public identifier from the profile URL (\`linkedin.com/in/<id>\`), URL-decoded, with
trailing slashes and query strings removed. If an actor only returns an internal profile id (an \`ACoAA...\` style
urn), use \`urn:<id>\` and merge later when the public id is seen. Same rule in the CSV import.

## 9. State machines

### 9.1 Source
\`\`\`
 active ──(pause)──▶ paused ──(resume)──▶ active
 active ──(3 failed runs in a row, or post deleted)──▶ error ──(user clicks Retry)──▶ active
\`\`\`
A post source is \`done\` for collection after its last pass but stays visible with its yield.

### 9.2 Post collection passes
\`\`\`
 tracking: pass 1 when the post is 24 h old (or at once if older), pass 2 at 72 h, pass 3 at 7 days
           (only if reaction_count grew by 20% or more since the last pass), then done.
 Each pass collects reactions and comments. Max items per pass = (current count - already collected) + 10%,
 capped by the workspace's remaining engagement budget and 2,000 per post.
 unavailable: actor returns "post not found" twice ──▶ status unavailable, source error message.
\`\`\`
Why passes and not daily: LinkedIn posts get most engagement in the first 48 to 72 hours. Re-collecting a 600
reaction post every day for a week would pay for 4,200 results to learn about 650 people.

The "max items = delta" trick only saves money if the actor returns the newest reactions first. Check this in
milestone M3 with a real post [verify]. If the order is not newest first, set passes to 48 h and 7 days only and
collect the full list each time.

### 9.3 Person enrichment
\`\`\`
 new ──▶ prefiltered_out (score below threshold, or suppressed)
 new ──▶ queued ──▶ enriched (match, email found or not)
                ├─▶ no_match (Prospeo found nothing, never retried for 90 days)
                └─▶ failed (provider error after retries, retried next night up to 3 times)
 enriched ──▶ email_status: ok | catch_all | unknown | invalid | none
\`\`\`
A person suppressed at any point skips straight to \`prefiltered_out\` and their lead (if any) goes to \`customer\`.

### 9.4 Lead
\`\`\`
 new ──▶ saved ──▶ pushed
  │        └────▶ dismissed
  ├──▶ dismissed            (hidden from Today and digests; kept for dedupe)
  ├──▶ customer             (suppresses the person by email, LinkedIn URL)
  └──▶ pushed               (sent to CRM or webhook at least once)
 Any status ──(new engagement + re-score)──▶ same status, score updated, surfaced again only if it was new or saved
\`\`\`

### 9.5 Daily run
\`\`\`
 scheduled ──▶ collecting ──▶ processing ──▶ ready ──▶ sent
     │                                        │
     └──▶ skipped (no access, no sources, or nothing due)
     any ──▶ failed (the scheduler marks it if nothing moved for 3 hours; digest still sends what exists)
\`\`\`

### 9.6 Job
\`\`\`
 queued ──(claim_jobs)──▶ running ──▶ done
                            ├──▶ queued (retry: attempts + 1, run_after = now + 2^attempts minutes + jitter)
                            └──▶ dead (attempts = max_attempts, last_error kept, shows on Today as "N steps failed")
 running for 10+ minutes ──(release_stuck_jobs)──▶ queued
\`\`\`
`
