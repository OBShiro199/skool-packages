// Helpdeck build PRD, part 3: limits, emails, analytics, security, tests, milestones.

export const buildPrd3 = `
## 12. Plans and limits
All limits live in one place: \`lib/plans.ts\` (Next.js) and the SQL function \`plan_limits(ws)\` (edge
functions and triggers). Keep both in sync; the SQL one is what actually enforces.

| Limit | Starter $49/mo ($490/yr) | Growth $129/mo ($1,290/yr) | Enforced in |
|---|---|---|---|
| Bots | 1 | 3 | \`enforce_bot_limit\` trigger on insert |
| Pages per bot | 200 | 1,000 | \`hd-crawl\` page limit sent to Firecrawl |
| Answers per month (all bots) | 2,000 | 10,000 | \`try_consume()\` in \`hd-answer\` |
| Crawled pages per month (fair use) | 1,000 | 6,000 | \`hd-crawl\` and \`hd-firecrawl-webhook\` |
| Re-crawls per bot per day | 3 | 3 | \`hd-crawl\` |
| Questions per visitor per hour | 20 | 20 | \`try_rate_limit()\` |
| Handoffs per visitor per day | 3 | 3 | \`try_rate_limit()\` |
| "Powered by Helpdeck" footer | shown | hidden | widget config |
| Weekly docs gaps email | no | yes | \`hd-digest\` |
| Conversation history | 12 months | 12 months | cleanup job |

**Trial (7 days):** limits of the plan picked at checkout, except answers are capped at 500 and crawled
pages at 400 for the whole trial, so a trial that never converts costs us under $0.50.

**Past the answer cap:** the widget switches to \`email_only\` (handoff form only) until the 1st of next
month (UTC) or an upgrade. The owner gets the \`cap_reached\` email and a banner. Handoffs stay free.

**Show the cap before they hit it:** Overview and Billing show meters ("1,240 of 2,000 answers used this
month · resets 1 Nov"). The meter turns amber under 20 percent left and coral under 5 percent
(DESIGN_SYSTEM.md meter rule). The bot switcher shows "1 of 1 bots" on Starter with an Upgrade link.

**Plan mapping:** \`plan_prices\` rows map each Stripe price id to \`starter\` or \`growth\`. Insert the four
rows after creating the prices (the Payments phase tells you when):
\`STRIPE_PRICE_STARTER_MONTHLY\`, \`STRIPE_PRICE_STARTER_YEARLY\`, \`STRIPE_PRICE_GROWTH_MONTHLY\`,
\`STRIPE_PRICE_GROWTH_YEARLY\`. Unknown price ids fall back to Starter limits.

**Downgrade from Growth to Starter:** extra bots are set to \`paused_by_plan = true\` (oldest kept active),
their widgets show \`paused\`. Nothing is deleted. The owner picks which bot stays active in Billing.

## 13. Emails (Resend)
Sent with \`_shared/email.ts\`: insert \`email_log\` first with a \`dedupe_key\` (on conflict do nothing, and
skip sending if the row already existed), skip suppressed addresses, then POST
\`https://api.resend.com/emails\`, then save \`resend_id\` and status. From \`Helpdeck <hello@YOURDOMAIN>\`
(\`EMAIL_FROM\`). Every email has a plain text part.

| Kind | To | Trigger | Dedupe key | Subject |
|---|---|---|---|---|
| \`welcome\` | owner | signup (shared Resend task) | \`welcome:<user>\` | Your Helpdeck bot can be live today |
| \`crawl_ready\` | owner | first successful crawl of a bot | \`crawl_ready:<bot>\` | {bot} has read {n} pages. Ask it something |
| \`crawl_failed\` | owner | crawl failed | \`crawl_failed:<crawl>\` | We could not read {host} |
| \`handoff\` | handoff_email | visitor leaves email | \`handoff:<conversation>\` | Customer question needs you: {first 60 chars} |
| \`usage_warning\` | owner | 80 percent of answers used | \`usage80:<ws>:<yyyy-mm>\` | You have used 80% of this month's answers |
| \`cap_reached\` | owner | 100 percent used | \`cap:<ws>:<yyyy-mm>\` | Your bot is in "email us" mode until {date} |
| \`gaps_digest\` | owner (Growth) | Monday 08:10 UTC | \`digest:<bot>:<iso-week>\` | 5 things your docs are missing this week |
| \`demo_link\` | prospect | landing demo started | \`demo:<demoId>\` | Your Helpdeck demo bot for {host} |
| \`trial_ending\` | owner | Stripe \`trial_will_end\` (shared Payments task) | shared | shared |
| \`help_request\` | founder | Help form | none | [Help] {subject} |

**Handoff email body:** visitor email, the page they were on, time, the full transcript (visitor and bot
messages, bot sources as links, low confidence marked), the visitor's optional note, and a button
"Open in Helpdeck" to \`APP_URL/bots/<botId>/conversations?c=<conversationId>\`. All visitor text is
HTML-escaped. \`reply_to\` is the visitor, so the owner replies from their own inbox.

## 14. Analytics events
DataFast or PostHog with one \`track(name, props)\` helper (browser) and \`trackServer\` (server). No visitor
PII and no message text in events. Landing page events are listed in @LANDING.md section 17.

| Event | Where | Props |
|---|---|---|
| \`signup_complete\` | server | from_demo |
| \`onboarding_complete\` | browser | seconds |
| \`bot_created\` | server | plan, bot_count |
| \`crawl_started\` | server | page_limit, is_recrawl |
| \`crawl_finished\` | server | status, pages_found, pages_changed, seconds |
| \`test_question_asked\` | browser | confident |
| \`snippet_copied\` | browser | platform_tab |
| \`widget_first_seen\` | server | days_since_signup |
| \`handoff_sent\` | server | reason |
| \`gap_status_changed\` | browser | status |
| \`plan_limit_hit\` | server | limit (answers, bots, pages, crawl_allowance) |
| \`upgrade_clicked\` | browser | from (meter, bot_switcher, banner, billing) |
| \`export_csv\` | browser | rows |

Answer volume is not an analytics event (it would be thousands a day). Read it from \`usage_ledger\`.
North-star metric: **answers served on live sites per week.** Activation: \`widget_first_seen\` within 3 days.

## 15. Security rules
1. RLS on every table. Owner data is reached only through \`is_workspace_member(workspace_id)\`.
2. Visitors never touch tables. The widget talks only to \`/api/widget/[botId]/config\`, \`hd-answer\` and
   \`hd-handoff\`. Config returns no ids except the bot id it was given.
3. \`match_chunks\`, \`try_consume\`, \`claim_jobs\`, \`try_rate_limit\` and \`claim_demo_bot\` are executable by
   \`service_role\` only.
4. The secret key (\`sb_secret_...\`) exists only in Supabase secrets and the Vercel server env.
5. Every webhook verifies a signature on the raw body and de-duplicates (Stripe, Firecrawl, Resend).
6. Every cron call carries \`x-cron-secret\`.
7. Visitor IPs are stored only as \`sha256(ip + IP_HASH_SALT)\`.
8. The crawler only accepts public https URLs (no IPs, no \`localhost\`, no \`.internal\`, no ports other than
   443) so nobody can point Firecrawl at private addresses through us.
9. The widget renders sanitised markdown only. The loader script never reads or writes the host page
   beyond its own bubble and iframe elements.
10. \`/widget/*\` is the only route that may be framed. Every other route sends \`frame-ancestors 'self'\`.

## 16. Out of scope (v1)
- Team invites and roles beyond owner (schema ready, UI in v2).
- Live human chat takeover inside the widget.
- PDF, Notion, Google Docs and file uploads (v2: same pipeline, a new source type).
- Scheduled automatic re-crawls (v2: weekly cron per bot).
- Streaming answers (section 5.2).
- Thumbs up and down on answers (v2).
- Per-bot similarity tuning, custom system prompts.
- Zapier, Slack or helpdesk integrations (handoff by email only).
- Answers that need account data or actions (refunds, order lookups).
- Multi-language owner UI (the bot already answers in the visitor's language).

## 17. Acceptance tests
Run these by clicking. Each has the SQL to check the data in Supabase SQL Editor.

**T1. Signup makes a workspace.** Sign up as a@test.dev. You land on /onboarding.
\`\`\`sql
select w.name, m.role from public.workspaces w join public.workspace_members m on m.workspace_id = w.id
join auth.users u on u.id = m.user_id where u.email = 'a@test.dev';  -- 1 row, role owner
\`\`\`

**T2. First crawl.** Paste a small docs site (10 to 30 pages). The progress card counts pages up and then
says Ready within 3 minutes.
\`\`\`sql
select status, pages_found, pages_embedded, finished_at - started_at as took
from public.crawl_jobs order by started_at desc limit 1;  -- ready, pages_embedded = pages_found
select count(*) from public.chunks c join public.bots b on b.id = c.bot_id where b.name = 'Support';
\`\`\`

**T3. Re-crawl skips unchanged pages.** Click Re-crawl without changing the site.
\`\`\`sql
select pages_found, pages_changed from public.crawl_jobs order by started_at desc limit 1;  -- pages_changed = 0
select kind, sum(quantity) from public.usage_ledger where created_at > now() - interval '10 minutes' group by kind;
-- crawl_page rows exist, no new embed_tokens rows
\`\`\`

**T4. Confident answer with sources.** In the test panel ask a question your docs answer. You get an
answer and at least one source chip that opens the right page.
\`\`\`sql
select content, confident, reason, top_similarity, sources from public.messages
where role = 'assistant' order by created_at desc limit 1;  -- confident true, reason answered
\`\`\`

**T5. Not sure, then handoff.** Ask "What is your refund policy for pizza?". You see the amber card. Enter
your own email. The owner inbox gets the transcript and Reply goes to the visitor address.
\`\`\`sql
select status, visitor_email, handed_off_at from public.conversations order by last_message_at desc limit 1;
select kind, status, to_email from public.email_log order by created_at desc limit 1;  -- handoff, sent
select question_key, times_asked from public.doc_gaps order by last_asked_at desc limit 1;
\`\`\`

**T6. Domain lock.** Add only \`localhost\` to allowed domains. Put the snippet on a page served from
\`127.0.0.1\`: the bubble shows but the iframe is refused (DevTools console shows a frame-ancestors error).

**T7. Answer cap.** Set the cap low for a test:
\`\`\`sql
insert into public.workspace_limit_overrides (workspace_id, answers_month) select id, 3 from public.workspaces limit 1;
\`\`\`
Ask 4 questions. The 4th shows the email form, and \`cap_reached\` is in \`email_log\`. Delete the override after.

**T8. Isolation.** Sign up as b@test.dev in a private window. B sees no bots, pages or conversations of A.
\`\`\`sql
-- run as B in the browser console or with the security script: every select returns 0 rows of A's data
\`\`\`

**T9. Paywall.** Set A's subscription to canceled. /app goes to /paywall and the live widget shows the
email form within 60 seconds.
\`\`\`sql
update public.subscriptions set status = 'canceled' where user_id = (select id from auth.users where email = 'a@test.dev');
\`\`\`

**T10. Demo and claim.** On the landing page, paste a docs URL and an email. Ready within about 60 seconds,
three suggested questions, ten questions maximum. Click Keep this bot, sign up: the bot is in Sources.
\`\`\`sql
select status, pages, questions_used, claimed_workspace_id from public.demo_sessions order by created_at desc limit 1;
\`\`\`

## 18. Build milestones
| # | Hours | Ship | Done when |
|---|---|---|---|
| M1 | 2 | Auth, onboarding, workspaces, app shell with sidebar and bot switcher, create bot | T1 passes |
| M2 | 4 | \`hd-crawl\`, \`hd-firecrawl-webhook\`, \`hd-embed-worker\`, Sources page with progress and pages table | T2, T3 pass |
| M3 | 3 | \`hd-answer\` with Voyage, \`match_chunks\`, Claude, test panel, Conversations page | T4 passes |
| M4 | 4 | Loader \`w.js\`, \`/widget/[botId]\` with CSP and token, Widget page (appearance, install, domains), \`hd-handoff\` | T5, T6 pass |
| M5 | 2 | Gaps page, CSV export, usage meters, \`try_consume\` caps, \`hd-digest\`, \`hd-resend-webhook\` | T7 passes |
| M6 | 2 | Stripe (shared phase), plan mapping, paywall, \`hd-demo\` and claim, landing page | T8, T9, T10 pass |
| M7 | 1 | Security script, Helpdeck installed on its own landing page | Security tasks all PASS |

## 19. Definition of done
- A stranger pastes a docs URL, has a bot ready in under 5 minutes, installs one line and gets a cited
  answer on their own site.
- A question not in the docs gets the handoff offer, never a made-up answer, and the owner gets the email.
- The widget refuses to load on a domain not in \`allowed_domains\`.
- Owner A cannot read owner B's data in any table, bucket or function.
- No workspace can pass its answer cap or crawl allowance, even with two tabs and a script.
- Every paid vendor call has a \`usage_ledger\` row with a cost.
`
