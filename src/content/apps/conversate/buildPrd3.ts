// Conversate build PRD, part 3: inbox, help centre, emails, analytics, security, tests, milestones.

export const buildPrd3 = `
## 17. Inbox behaviour

### 17.1 Views (left pane filter list, counts in tabular numbers)
| View | Query |
|---|---|
| Mine | assignee = me, status in (open, pending) |
| Unassigned | assignee is null, status = open, mode = human or handoff requested or low_confidence |
| All open | status = open |
| AI handling | mode = ai, status = open, no handoff |
| Pending | status = pending |
| Snoozed | status = snoozed (shows wake time) |
| Flagged | flagged = true, any status except closed |
| Low confidence | low_confidence = true, last 14 days |
| Closed | status = closed, last 30 days, then "Load older" |

Sort: newest \`last_message_at\` first; Unassigned sorts oldest waiting first. Page size 50, keyset
pagination on (last_message_at, id). Live updates: one Realtime channel per agent session subscribed to
\`postgres_changes\` on \`conversations\` and \`messages\` filtered \`workspace_id=eq.<ws>\`. New rows rise
into the list without moving the row under the cursor (DESIGN.md stability rules).

### 17.2 Thread pane
- Messages oldest to newest. AI messages show the confidence pill and source chips. System messages are
  centred, faint. Notes are shown inline on a pale amber edge (agents only).
- Composer tabs: Reply (to visitor) and Note (internal). \`/\` opens canned replies search.
  Cmd/Ctrl + Enter sends. "Suggest reply" fills the composer (never sends by itself).
- Actions bar: Assign (menu of members), Status (Open, Pending, Snooze 1h / tomorrow 9am / next week / pick),
  Close, Flag, Tags (multi-select, create inline), Hand back to AI.
- Typing indicator: the agent client sends \`typing\` broadcasts to the conversation topic at most once
  every 2 seconds while typing; the widget shows "Sam is typing".

### 17.3 Details pane
Visitor (name, email editable, last seen, current page, country, first seen), conversation facts
(created, channel, first response time, AI answers count), CSAT if given, previous conversations from
the same visitor (last 5), sources used in this thread.

### 17.4 Keyboard
\`j\`/\`k\` next/previous conversation, \`e\` close, \`a\` assign to me, \`r\` focus reply, \`n\` focus note,
\`s\` snooze menu, \`?\` shortcuts dialog. Shortcuts are disabled while typing in an input.

## 18. Help centre (public)

- Server rendered at \`/[workspaceSlug]/help\` with \`revalidate = 60\` (public data only, safe to cache).
  Read with the secret-key server client, always filtered \`status = 'published'\` and
  \`workspaces.help_centre_enabled = true\`. 404 for unknown or disabled workspaces.
- Home: workspace name + "How can we help?", search input, category cards (icon, name, description, count),
  "Popular articles" (top 6 by views), footer "Still stuck? Chat with us" (opens the widget, which is
  auto-injected on help pages with the workspace's key).
- Article: title, summary, last updated, body (Markdown rendered with \`react-markdown\` + \`rehype-sanitize\`,
  no raw HTML), "Was this helpful? Yes / No" (calls \`/api/help/feedback\`, one vote per article per browser),
  related articles in the same category.
- Search: Postgres full-text on \`kb_articles.search\` (\`websearch_to_tsquery('simple', q)\`). If fewer than 3
  hits, also embed the query and return article chunks from \`match_chunks\` (published articles only).
  Rate limit 30 searches per IP per minute.
- SEO: \`<title>{article} | {workspace} help\`, meta description from summary, canonical URL, JSON-LD
  \`FAQPage\` on articles that are question titles, sitemap per workspace at \`/[slug]/help/sitemap.xml\`.
- Branding: the workspace's \`brand_hex\` as accent (soft fill and edge only), the icon as logo.

## 19. Notifications

| Kind | Trigger | In-app | Email to |
|---|---|---|---|
| handoff | Visitor asked for a human | yes | assignee, else all members with email on |
| low_confidence | AI final confidence below threshold | yes | assignee, else team (throttled, digest after 20/h) |
| flagged | Visitor or AI flag | yes | team |
| assigned | Someone assigned you a conversation | yes | assignee |
| visitor_reply | Visitor wrote in a human-mode conversation | yes | assignee, else team (throttled) |
| crawl_done / crawl_failed | Source ready or failed | yes | owner and admins |
| cap_warning / cap_reached | 80% / 100% of AI answers | yes, banner | owner |
| invite_accepted | Invitee joined | yes | the inviter |

## 20. Emails (Resend)

From address: \`Conversate <notify@mail.yourdomain.com>\` for team emails, and
\`"{workspace name} Support" <support@mail.yourdomain.com>\` for visitor emails, with Reply-To set to the
conversation's \`reply+<token>@in.yourdomain.com\`. Every send goes through \`sendEmail()\`: insert
\`email_log\` with the dedupe key first, skip if it already existed, then call Resend, then save the id.

| Email | Trigger | Subject | Body (plain, one button) | Dedupe key |
|---|---|---|---|---|
| Welcome | First workspace created | Your help centre is building | "We are reading {site} now. You will see your draft articles in about 5 minutes." Button: Open Conversate | \`welcome:<userId>\` |
| Help centre ready | onboarding source ready + drafts done | Your help centre is ready: {n} articles | List of the first 5 titles. Button: Review and publish | \`ready:<ws>\` |
| Invite | invite-member | {inviter} invited you to {workspace} on Conversate | Role, expiry in 7 days. Button: Accept invite | \`invite:<invitationId>:<n>\` |
| Handoff / low confidence / flagged | notification | [{workspace}] {visitor} needs a human: "{first 60 chars}" | Last 3 messages, AI answer and confidence. Button: Open conversation | \`notif:<id>:<userId>\` |
| Assigned | notification | [{workspace}] Assigned to you: "{subject}" | Button: Open conversation | \`notif:<id>:<userId>\` |
| Hourly digest | over the throttle | [{workspace}] {n} conversations need attention | List with links | \`digest:<ws>:<hour>\` |
| Agent reply to visitor | email_fallback job | Re: {subject} | The agent's reply, then "Reply to this email to continue the conversation." Footer with workspace name | \`fallback:<messageId>\` |
| Cap warning | 80% of answers | You have used 80% of your AI answers | Used / cap, reset date. Button: See plans | \`cap80:<ws>:<yyyy-mm>\` |
| Cap reached | 100% | Your AI assistant is paused until {date} | What visitors see now. Button: Upgrade | \`cap100:<ws>:<yyyy-mm>\` |
| Crawl failed | source failed | We could not read {site} | Error in plain words + what to try. Button: Fix source | \`crawlfail:<sourceId>:<n>\` |
| Trial ending | Stripe \`customer.subscription.trial_will_end\` (shared Stripe phase) | Your trial ends in 3 days | Answers handled so far, AI resolution rate | \`trial3:<userId>\` |

Supabase Auth emails (confirm off, magic link, reset) go through Resend SMTP (shared phase).

## 21. Analytics

### 21.1 Analytics page (from \`workspace_stats\` and simple queries)
- Range: Last 7 days, 30 days, 90 days, custom (capped by plan history).
- Tiles: Conversations, AI resolution rate (AI-only conversations closed as resolved / conversations
  with an AI answer), Median first response (human), CSAT (average and count).
- Charts: conversations per day split by AI-resolved, handed off, human-only (stacked bars); AI resolution
  rate per week (line). Use the dataviz rules in DESIGN.md.
- Tables: top 10 questions (most frequent content gaps and most cited articles), lowest-rated
  conversations (CSAT 1 to 2), agents (replies, median first response, CSAT).

### 21.2 Product analytics events (PostHog or DataFast, from the app and landing page)
| Event | Properties | Where |
|---|---|---|
| \`signup_completed\` | method | /signup |
| \`onboarding_step_completed\` | step 1 to 6, seconds_on_step | /onboarding |
| \`crawl_started\` / \`crawl_ready\` | pages_found, seconds_to_ready | onboarding, Knowledge |
| \`articles_published\` | count, edited_before_publish | onboarding, Help Centre |
| \`widget_installed\` | platform (from tab used), first_domain | first visitor from allowed domain (server-side) |
| \`first_ai_answer\` | confidence | server-side, once per workspace |
| \`agent_reply_sent\` | via_suggestion, live_or_email | Inbox |
| \`suggest_reply_used\` | edited_chars_pct | Inbox |
| \`content_gap_drafted\` | times_asked | Knowledge |
| \`member_invited\` / \`invite_accepted\` | role | Team |
| \`checkout_started\` / \`trial_started\` / \`subscription_active\` | plan, interval | Billing, Stripe webhook |
| \`cap_warning_shown\` | kind, pct | sidebar |

Activation = \`widget_installed\` and \`first_ai_answer\` within 48 hours of signup. Put it on the dashboard.

## 22. Security rules (app-specific, on top of the shared sweep)

1. Visitors never touch tables. The anon role has no table grants. All widget traffic goes through
   widget-config, widget-session and widget-message.
2. Every public call checks the key, Origin, visitor JWT, plan access, caps and rate limits before any
   paid API call. Origin checks stop other websites in browsers; rate limits and caps stop scripts.
3. \`match_chunks\` and every job function are executable by \`service_role\` only.
4. Workspace isolation: every table has \`workspace_id\` and policies use \`is_workspace_member\` /
   \`has_workspace_role\` (security definer, \`search_path = ''\`).
5. Messages are written only by edge functions. Agents cannot insert a message that skips the visitor.
6. Webhooks verify signatures on the raw body: Stripe (\`stripe-signature\`), Firecrawl
   (\`X-Firecrawl-Signature\`), Resend (\`svix-*\`). Each dedupes by event id.
7. The \`realtime_topic\` and reply tokens are random, never logged, and only given to that visitor.
8. SSRF guard on every URL we crawl or fetch: https or http only, no IP literals, no localhost, no
   private ranges, no ports other than 80/443.
9. Markdown is rendered with sanitising (no raw HTML) on the help centre, the widget and the inbox.
10. The embed page sets \`frame-ancestors\` to allowed domains, so it cannot be framed elsewhere.

## 23. Out of scope (v1)

- Custom domains for help centres (\`help.acme.com\`). v1 uses \`yourdomain.com/acme/help\`. v2: Vercel domains API.
- Multiple widgets or brands per workspace, multiple workspaces owned by one user.
- WhatsApp, Instagram, SMS, Slack channels. Email is the only second channel, and only as replies.
- Visitor file uploads in the widget (agents can attach files). v1.1 with signed upload URLs.
- AI actions (refunds, order lookups, cancelling plans). The AI only answers from knowledge.
- Importing from Intercom, Zendesk or Help Scout. v2: import articles from their help centre URLs with the crawler.
- PDF, Notion and Google Docs as sources. v2.
- SSO, SCIM, audit logs, HIPAA.
- Multi-language help centres (Claude answers in the visitor's language, articles stay in one language).
- Ownership transfer in the app (do it in SQL if a customer asks).

## 24. Acceptance tests

Run each by clicking, then run the SQL in Supabase > SQL Editor. Replace the placeholders.

### M1 Auth, workspace, onboarding steps 1 to 5
1. Sign up with a new email. You land on /onboarding step 1. Enter "Acme Test", slug "acme-test". Finish steps 2 to 5.
\`\`\`sql
select w.slug, w.onboarding_step, m.role, (select count(*) from public.allowed_domains d where d.workspace_id = w.id) as domains
from public.workspaces w join public.workspace_members m on m.workspace_id = w.id
where w.slug = 'acme-test';
-- expect: acme-test | 5 | owner | 2
\`\`\`
2. Try slug "app": the field says "That address is reserved. Try acme-test-help."

### M2 Crawl and knowledge
3. Step 6 with a real small site (20 to 60 pages). Progress lines tick in order. Under 5 minutes.
\`\`\`sql
select s.status, s.pages_found, s.pages_done, s.chunks_count,
       (select count(*) from public.kb_chunks c where c.workspace_id = s.workspace_id) as chunks
from public.kb_sources s order by created_at desc limit 1;
-- expect: ready | n | n | > 0 | same as chunks_count
\`\`\`
4. Re-crawl the same source: pages with no changes are \`skipped\` and chunk count stays the same.
5. Re-crawl 4 times in a day: the 4th shows "You can re-crawl this source 3 times a day."

### M3 Drafting and help centre
6. After the crawl, 10 to 30 draft articles appear in Help Centre with categories. Publish all.
7. Open /acme-test/help: categories, search "refund" returns the right article, article page renders.
\`\`\`sql
select status, count(*), sum(case when ai_drafted then 1 else 0 end) as ai
from public.kb_articles a join public.workspaces w on w.id = a.workspace_id
where w.slug = 'acme-test' group by status;
select count(*) from public.kb_chunks where source_type = 'article';  -- expect > 0 after publish
\`\`\`

### M4 Widget and AI answers
8. Create \`test.html\` with the snippet, serve it on \`http://localhost:5500\`, add \`localhost\` to allowed
   domains. Ask a question the site answers: reply in under 4 seconds with 1 to 3 source chips.
9. Ask "What is your CEO's shoe size?": "I am not sure" card with "Talk to a human". A content gap appears.
10. Remove localhost from allowed domains, reload: the launcher does not appear, console shows the warning.
\`\`\`sql
select m.role, left(m.body, 60), m.confidence, m.needs_human, jsonb_array_length(m.sources) as sources
from public.messages m order by created_at desc limit 6;
select kind, quantity, cost_micros from public.usage_ledger order by created_at desc limit 5;
-- expect: ai_answer rows with cost_micros between 300 and 1500
select question, times_asked, status from public.content_gaps order by last_asked_at desc limit 3;
\`\`\`

### M5 Inbox, live replies, email fallback
11. In the widget click "Talk to a human". In the app, the conversation shows in Unassigned within 2 seconds.
12. Reply from the Inbox: the visitor sees it within 1 second without refreshing, with "Sam is typing" before it.
13. Close the visitor tab, wait 3 minutes, reply again: the visitor's email gets it. Reply to that email:
    the reply appears in the same conversation within a minute.
\`\`\`sql
select status, mode, first_response_at is not null as responded, handoff_requested_at is not null as handoff
from public.conversations order by created_at desc limit 1;
select kind, status, to_email from public.email_log order by created_at desc limit 5;
\`\`\`
14. Snooze until "in 5 minutes" (dev only): it returns to Open by itself.

### M6 Team
15. Invite a second email as agent. Accept from a private window. The agent sees the Inbox but not
    Billing, and Widget is hidden. Invite a 4th person on Starter: "You are using 3 of 3 seats."

### M7 Suggested replies, gaps, analytics
16. Suggest reply on a conversation about pricing: draft cites a pricing source.
17. Content gaps: "Draft article" creates a draft with the gap question as title.
18. Analytics shows non-zero conversations and an AI resolution rate after housekeeping runs.

### M8 Billing and caps
19. With \`plan_limits\` trial cap lowered to 3 in a dev copy, the 4th question shows the email form and
    an owner email "Your AI assistant is paused until ...".
20. Set the owner's subscription to \`canceled\`: /app redirects to /paywall and the widget shows the offline form.

### Security (run the security tasks too)
21. With only the publishable key, every table read returns \`[]\` or a permission error.
22. Owner B cannot read owner A's conversations, chunks or articles (signed in as B).
23. \`widget-message\` with a token from workspace A and a body for workspace B is refused (401).

## 25. Build milestones (about 38 hours)

| # | Milestone | Hours | Done when |
|---|---|---|---|
| M1 | Next.js app, Supabase migration, auth, app shell + sidebar, onboarding steps 1 to 5 | 4 | Tests 1 and 2 |
| M2 | \`_shared\` helpers, \`onboard-crawl\`, \`build-knowledge\`, pg_cron, Knowledge > Sources and Pages | 6 | Tests 3 to 5 |
| M3 | \`draft-articles\` (planner + writer), Help Centre editor, public help centre + search | 6 | Tests 6 and 7 |
| M4 | \`widget-config\`, \`widget-session\`, \`widget-message\`, \`w.js\`, \`/embed\`, Widget branding + install pages | 7 | Tests 8 to 10 |
| M5 | Inbox (three panes, Realtime), \`agent-reply\`, notes, tags, canned replies, \`notify\` with fallback + inbound | 7 | Tests 11 to 14 |
| M6 | Team page, \`invite-member\`, invite accept flow, roles in UI | 2 | Test 15 |
| M7 | \`suggest-reply\`, content gaps UI, Analytics page, CSAT | 3 | Tests 16 to 18 |
| M8 | Stripe plans + caps + meters, landing page, docs, security tests, launch | 3 | Tests 19 to 23 |

After each milestone: commit, push, check the Vercel preview, and write one line in \`DECISIONS.md\`.
`
