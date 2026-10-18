// Conversate app-specific frontend tasks (appended to the Foundations phase).
import type { Task } from '../../types'

export const frontendTasks: Task[] = [
  {
    id: 'con-fe-onboarding',
    title: 'Build the app shell, sidebar and six-step onboarding',
    outcome: 'A new user signs up, names their workspace, adds their website and lands on a live "Build my help centre" screen.',
    minutes: 80,
    xp: 55,
    blocks: [
      { type: 'callout', tone: 'eli5', title: 'Why onboarding is the product demo', text: 'Your best sales moment is the first five minutes. A founder pastes their website and watches their own help centre appear. If onboarding is slow or confusing, they never see the magic. So we build it first, and we build it carefully.' },
      { type: 'prompt', id: 'con-fe-onboarding-prompt', title: 'Paste into Claude Code', code: `Read @PRD.md sections 7 and 8 and @DESIGN.md sections 3, 4 and 5. Plan first, then wait for my OK.

Build:
1. lib/workspace.ts: requireWorkspace() on the server following PRD 7.3 exactly (getClaims, profiles.current_workspace_id, membership, onboarding_step, has_active_access). Returns { user, workspace, role, limits }. Use it in app/app/layout.tsx with export const dynamic = 'force-dynamic'.
2. The app shell sidebar from DESIGN.md section 3 with these items in this order: Inbox, Help Centre, Knowledge, Widget, Analytics, Team, then the bottom group Documentation, Help, Billing, Settings. Widget hidden for agents, Billing only for the owner. The usage meter reads supabase.rpc('usage_summary', { ws }). Badges: open+unassigned conversations count and open content gaps count (head: true, count: 'exact' queries). Collapses to 56px icons under 1100px.
3. app/onboarding/page.tsx: the morphing card with 6 steps from PRD section 8 and DESIGN.md section 5. Step 1 calls supabase.rpc('create_workspace', { p_name, p_slug, p_website_url: null, p_support_email: null }) and checks slug availability live with a debounced select on workspaces through a server route (reserved slugs list from PRD 7.2). Steps 2 to 5 update workspaces (and widget_settings.suggested_questions in step 5) and onboarding_step. Step 5 fetches 5 suggested questions from app/api/onboarding/suggest-questions/route.ts (PRD 14.5; build the route now, it calls Firecrawl scrape + Claude Haiku with the server-only keys and meters suggest_reply through the secret-key client).
4. Step 6 UI only for now: the 5-line build list with fixed rows, the meter and reserved sub-status line. Wire the button to supabase.functions.invoke('onboard-crawl', { body: { workspaceId, url } }) and subscribe with Realtime postgres_changes to kb_sources (filter id=eq.<sourceId>) and to jobs (filter workspace_id=eq.<ws>) to drive the lines. Show the failure state with the "Paste up to 10 page links" textarea.
5. After step 6 shows done, set onboarding_step = 6 and redirect to /app/help-centre?onboarding=1.
Use only DESIGN tokens. Then run the app and screenshot each onboarding step at 390px and 1440px.` },
      { type: 'steps', items: [
        'Open http://localhost:3000/signup and create an account with a new email.',
        'Step 1: type "Acme Test". The address field fills with acme-test and shows "Available". Try "app" and check it says the address is reserved.',
        'Steps 2 to 5: use your own website or https://example.com, write one sentence about what you sell, pick Friendly, keep the suggested questions.',
        'Stop at step 6 (the crawl function is built in the Backend phase). Refresh the page: you land back on step 6, not step 1.',
      ] },
      { type: 'code', id: 'con-fe-onboarding-sql', filename: 'check-onboarding.sql', lang: 'sql', code: `-- Run in Supabase > SQL Editor. Expect your workspace, you as owner,
-- onboarding_step 5 or 6, and two allowed domains from your website.
select w.name, w.slug, w.onboarding_step, w.tone, array_length(w.top_questions, 1) as questions,
       m.role,
       (select string_agg(domain, ', ') from public.allowed_domains d where d.workspace_id = w.id) as domains
from public.workspaces w
join public.workspace_members m on m.workspace_id = w.id
order by w.created_at desc limit 1;` },
      { type: 'mistakes', items: [
        { mistake: 'Step 1 fails with "new row violates row-level security policy for table workspaces".', fix: 'Claude Code inserted the workspace directly. Tell it: "Create workspaces only with supabase.rpc(\'create_workspace\'). There is no insert policy on purpose."' },
        { mistake: 'The domains column is empty after step 2.', fix: 'create_workspace adds domains only when it gets a website URL. Ask Claude Code to call a server action after step 2 that inserts acme.com and *.acme.com into allowed_domains (owner, so RLS allows it).' },
        { mistake: 'The sidebar meter shows "0 / 0".', fix: 'You have no trialing subscription yet, so plan_limits returns the none plan. Insert a test row: insert into public.subscriptions (user_id, status) values (\'<your user id>\', \'trialing\'); The Stripe phase replaces this later.' },
      ] },
    ],
    checklist: [
      { id: 'con-fe-onboarding-c1', label: 'Copy the shell and onboarding prompt', trigger: 'copy:con-fe-onboarding-prompt' },
      { id: 'con-fe-onboarding-c2', label: 'Finish onboarding steps 1 to 5 with a real website' },
      { id: 'con-fe-onboarding-c3', label: 'Check the reserved slug message for "app"' },
      { id: 'con-fe-onboarding-c4', label: 'Run the check SQL and see two allowed domains', trigger: 'copy:con-fe-onboarding-sql' },
    ],
  },
  {
    id: 'con-fe-inbox',
    title: 'Build the three-pane Inbox with live updates',
    outcome: 'Agents see every conversation, open a thread, reply, add notes, assign, tag and snooze, and new messages arrive without refreshing.',
    minutes: 120,
    xp: 70,
    blocks: [
      { type: 'callout', tone: 'eli5', title: 'Live updates in plain words', text: 'Supabase Realtime is a walkie-talkie between the database and the browser. When a new message row is saved, the database shouts "new message in Acme" and every agent\'s screen that is listening adds it. RLS still checks each agent is allowed to hear it.' },
      { type: 'prompt', id: 'con-fe-inbox-prompt', title: 'Paste into Claude Code', code: `Read @PRD.md sections 10.4 and 17 and @DESIGN.md section 6. Plan first.

Build app/app/inbox/page.tsx and app/app/inbox/[conversationId]/page.tsx (same component, thread open):
1. Left pane: the view list from PRD 17.1 with counts (one RPC or a few count queries, cached 10 s), then the conversation list (64px rows, fixed icon slots), keyset pagination on (last_message_at, id), search box (ilike on subject and visitor email, plus a server route that searches message bodies with the secret key after checking membership).
2. Thread pane: messages oldest to newest with the exact styles from DESIGN.md 6.3 (visitor, AI with source chips and confidence pill, agent, note inline, system). Low-confidence AI messages show the hidden draft from sources metadata, faint, labelled "Not shown to visitor".
3. Composer with Reply / Note tabs. Reply calls supabase.functions.invoke('agent-reply', { body: { conversationId, body, clientMsgId: crypto.randomUUID() } }) (the function is built later; until then show the call failing gracefully with the "Not sent. Retry" state). Note inserts into notes with author_id = current user. "/" opens a Command menu of canned_replies (insert body with {visitor_first_name}, {agent_first_name}, {workspace_name} filled in). Cmd/Ctrl + Enter sends.
4. Actions: Assign (rpc assign_conversation), Status menu (open, pending, snooze presets, closed) updating conversations through RLS, Flag (insert flags with source 'agent'), Tags (conversation_tags), Hand back to AI (mode = 'ai').
5. Details pane from DESIGN.md 6.4. Inline-edit visitor name and email.
6. Realtime: one channel per agent: postgres_changes on conversations and messages with filter workspace_id=eq.<ws>. New rows update the list in place without moving the row under the cursor; if the list is scrolled down show a fixed "3 new" pill. Show the "Live updates paused. Reconnecting." strip when the channel status is not SUBSCRIBED.
7. Typing: while the agent types in Reply, send a broadcast 'typing' { name } to the conversation's realtime_topic at most every 2 s (supabase.channel(topic).send). Listen on the same topic for the visitor's 'typing' events and show "Visitor is typing".
8. Keyboard shortcuts from PRD 17.4 with a ? dialog.
Seed data so I can see it: write scripts/seed-inbox.ts that, with the secret key, creates 3 visitors and 12 conversations with messages of every role, 2 notes, tags and one flag in my workspace. Run it, then screenshot the inbox at 1440px and 1100px.` },
      { type: 'steps', items: [
        'Run the seed script Claude Code wrote (it prints how), then open http://localhost:3000/app/inbox.',
        'Click through the views: Unassigned, Flagged and Low confidence each show the seeded rows.',
        'Open a conversation, add a note, assign it to yourself, add a tag, snooze it for 1 hour. It moves to Snoozed.',
        'Open a second browser window on the same conversation. In SQL Editor insert a visitor message (the SQL below). Both windows show it within 2 seconds.',
      ] },
      { type: 'code', id: 'con-fe-inbox-sql', filename: 'live-message.sql', lang: 'sql', code: `-- Pretend a visitor wrote in. Replace the conversation id with one from your inbox URL.
insert into public.messages (workspace_id, conversation_id, role, body)
select workspace_id, id, 'visitor', 'Hi, is anyone there? I still cannot log in.'
from public.conversations where id = 'PASTE-CONVERSATION-ID';

-- The trigger should have bumped the counters and reopened it:
select status, message_count, last_visitor_message_at from public.conversations where id = 'PASTE-CONVERSATION-ID';` },
      { type: 'mistakes', items: [
        { mistake: 'Live updates never arrive.', fix: 'Check Database > Publications > supabase_realtime lists conversations and messages (the migration adds them). Also check the channel filter is workspace_id=eq.<uuid> with no spaces.' },
        { mistake: 'Inserting a note fails with an RLS error.', fix: 'The insert must set author_id to the logged-in user id. Ask Claude Code to pass author_id: user.id from getClaims, not leave it empty.' },
        { mistake: 'The list jumps when a new conversation arrives while reading.', fix: 'Tell Claude Code: "Follow the stability rules: never insert above the visible rows while scrolled; show the fixed \'N new\' pill and only insert when the user clicks it or is at the top."' },
      ] },
    ],
    checklist: [
      { id: 'con-fe-inbox-c1', label: 'Copy the inbox prompt', trigger: 'copy:con-fe-inbox-prompt' },
      { id: 'con-fe-inbox-c2', label: 'Seed test conversations and click through every view' },
      { id: 'con-fe-inbox-c3', label: 'Add a note, assign, tag and snooze a conversation' },
      { id: 'con-fe-inbox-c4', label: 'Insert a visitor message in SQL and see it arrive live', trigger: 'copy:con-fe-inbox-sql' },
    ],
  },
  {
    id: 'con-fe-helpcentre',
    title: 'Build the Help Centre editor, Knowledge pages and the public help centre',
    outcome: 'Agents edit and publish articles, see sources and content gaps, and visitors browse and search /your-slug/help.',
    minutes: 100,
    xp: 60,
    blocks: [
      { type: 'callout', tone: 'eli5', title: 'Two sides of the same articles', text: 'The Help Centre page in your app is the kitchen: you write, edit and publish. The public help centre is the restaurant: customers only ever see the finished, published dishes. Both read the same kb_articles table, but the public side only shows rows marked published.' },
      { type: 'prompt', id: 'con-fe-helpcentre-prompt', title: 'Paste into Claude Code', code: `Read @PRD.md sections 10.3, 18 and @DESIGN.md sections 7, 8 and 15. Plan first.

Build:
1. app/app/help-centre/page.tsx: the articles table with status chips, category filter bar, selection bar (Publish, Unpublish, Move, Archive) and the onboarding banner with "Publish all" when ?onboarding=1 or drafts exist. Bulk updates go through RLS (members can update) and must set updated_by = current user.
2. app/app/help-centre/articles/[id]/page.tsx: the editor from DESIGN.md 7 (Markdown with Write/Preview using react-markdown + rehype-sanitize, sources panel listing kb_pages from source_page_ids, gaps list for "[Fill in: ...]" placeholders, slug with public URL copy, autosave with the fixed "Saved" slot). Image upload goes to attachments/<workspace_id>/articles/<uuid>.<ext>.
3. app/app/help-centre/categories/page.tsx with drag reorder (position) and the 8-icon picker.
4. app/app/knowledge/page.tsx with tabs Sources, Pages, Content gaps, Test the AI from DESIGN.md 8. Sources "Add source" calls onboard-crawl. Content gaps "Draft article" calls draft-articles with { workspaceId, gapId } and opens the new draft. Test the AI renders the widget panel component (built in the next task; leave a placeholder box if it does not exist yet).
5. Public help centre: app/[workspaceSlug]/help/page.tsx, [categorySlug]/page.tsx, a/[articleSlug]/page.tsx, search/page.tsx. Server components using lib/supabase/admin.ts (secret key, server only, import 'server-only') and ALWAYS filter status = 'published' and help_centre_enabled = true. revalidate = 60. Brand accent from widget_settings.brand_hex as --cv-brand. SEO from PRD 18 (title, description, canonical, FAQPage JSON-LD, per-workspace sitemap route).
6. app/api/help/search/route.ts (full-text with websearch_to_tsquery('simple', q), semantic fallback is added after the Voyage task) and app/api/help/feedback/route.ts (rpc article_counter with the secret key, try_rate_limit per IP: 30 per minute). Both public, validate input with zod.
7. Middleware: reserved slugs from PRD 7.2 must never be treated as workspace slugs.
Then publish two seeded articles and screenshot /<slug>/help and an article page at 375px and 1440px.` },
      { type: 'steps', items: [
        'Write one article by hand: Help Centre > New article, title "How do I reset my password?", a few steps, category "Account", Publish.',
        'Open http://localhost:3000/<your-slug>/help in a private window. You see the category and the article.',
        'Search "password" on the help centre: the article is the first result.',
        'Unpublish the article in the app, wait a minute, refresh the public page: it is gone (404 on the article URL).',
      ] },
      { type: 'code', id: 'con-fe-helpcentre-sql', filename: 'check-articles.sql', lang: 'sql', code: `-- Articles by status, and proof the search column is filled.
select status, count(*) from public.kb_articles group by status;

select title, ts_rank(search, websearch_to_tsquery('simple', 'password')) as rank
from public.kb_articles
where status = 'published' and search @@ websearch_to_tsquery('simple', 'password')
order by rank desc limit 5;` },
      { type: 'mistakes', items: [
        { mistake: 'The public help centre shows draft articles.', fix: 'The admin client bypasses RLS, so the filter is the only guard. Ask Claude Code to add .eq(\'status\', \'published\') in one helper, getPublishedArticles(), and use it on every public page.' },
        { mistake: 'Article Markdown shows raw HTML or scripts.', fix: 'Use react-markdown with rehype-sanitize and never dangerouslySetInnerHTML. Ask Claude Code to remove rehype-raw if it added it.' },
        { mistake: '/app/help or /docs/help shows a 404 workspace page.', fix: 'Reserved slugs are being routed to [workspaceSlug]. Add them to the reserved list in middleware and in create_workspace checks.' },
      ] },
    ],
    checklist: [
      { id: 'con-fe-helpcentre-c1', label: 'Copy the help centre prompt', trigger: 'copy:con-fe-helpcentre-prompt' },
      { id: 'con-fe-helpcentre-c2', label: 'Write and publish one article by hand' },
      { id: 'con-fe-helpcentre-c3', label: 'Search the public help centre in a private window' },
      { id: 'con-fe-helpcentre-c4', label: 'Run the article check SQL', trigger: 'copy:con-fe-helpcentre-sql' },
    ],
  },
  {
    id: 'con-fe-widget',
    title: 'Build the widget: w.js loader, /embed panel and the branding page',
    outcome: 'A one-line script tag shows a branded launcher on any site, opens the chat panel, and the Widget page previews every change live.',
    minutes: 130,
    xp: 75,
    blocks: [
      { type: 'callout', tone: 'eli5', title: 'Why a loader and an iframe?', text: 'The loader is a tiny script that lives on your customer\'s website. It draws the button and nothing else, so it loads instantly and their CSS cannot break it. The chat itself runs inside an iframe: a little window onto your own app, so your code and styles stay yours and their page cannot peek inside.' },
      { type: 'prompt', id: 'con-fe-widget-prompt', title: 'Paste into Claude Code', code: `Read @PRD.md section 11 and @DESIGN.md sections 9 and 16. Plan first, this touches security.

Build:
1. public/w.js: plain ES2018, no build step, under 5 KB gzipped, exactly following PRD 11.2 and 11.3 (currentScript, queue API, anon id in localStorage with try/catch, widget-config fetch with the customer Origin, closed shadow root launcher with inline styles from the config, iframe on first open, postMessage only with targetOrigin = APP_ORIGIN and origin + source checks on receive, SPA route patching, Conversate('open'|'close'|'toggle'|'identify'|'on')). Read SUPABASE_URL and APP_ORIGIN from constants that a small build script (scripts/build-widget.mjs) writes from env vars into public/w.js and public/w/v1.js. Cache headers in next.config: w.js max-age=300, w/v1.js immutable.
2. app/embed/[key]/page.tsx and components/widget/*: the panel from DESIGN.md 16 (welcome with suggested questions, messages, thinking dots after 300 ms, sources pills, not-sure card, handoff card, live agent strip, typing line, CSAT card, offline/cap state, composer with the white firm-edge Send button, Powered by footer). It waits for cv:init from window.parent, keeps the token in memory, calls widget-message for ask/handoff/csat/flag/email/ping, and on 401 posts cv:token-expired. Realtime: subscribe to the conversation's realtimeTopic with the publishable key only while mode is human or a handoff was requested; events agent_message, typing, status; unsubscribe after 10 minutes idle.
3. middleware.ts for /embed/*: Content-Security-Policy frame-ancestors from the workspace's allowed domains (fetched from widget-config with a 60 s in-memory cache; include APP_URL for the in-app preview), X-Content-Type-Options nosniff.
4. app/app/widget/page.tsx: tabs Branding, Install, Domains, Behaviour from DESIGN.md 9. Uploads go to widget-assets/<workspace_id>/icon.<ext> and avatar.<ext> (upsert). The live preview renders the same panel component with props, no network. Install shows the snippet with the real public key, the 6 platform tabs (copy from PRD 11.5) and the status pill (first visitor from an allowed domain). Domains add/delete through RLS and Rotate key via rpc rotate_public_key. Behaviour saves threshold, email capture, suggested questions and branding switch (disabled with the footnote on Starter).
5. public/test-widget.html: a plain page that loads the snippet from http://localhost:3000/w.js with my key, so I can test on http://localhost:5500 with npx serve.
Until the widget edge functions exist, the panel should show its error state cleanly.` },
      { type: 'steps', items: [
        'Open /app/widget. Upload a square PNG icon, pick a colour, change the greeting. The preview updates as you type.',
        'Click Save changes, then open the Install tab and copy the snippet.',
        'In a terminal run `npx serve public -l 5500` and open http://localhost:5500/test-widget.html. In Widget > Domains add `localhost`.',
        'You see your branded launcher bottom right. Open DevTools > Console: no errors except the expected "functions not deployed yet" if you are early.',
      ] },
      { type: 'code', id: 'con-fe-widget-test', filename: 'public/test-widget.html', lang: 'html', code: `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Widget test page</title>
    <!-- Replace the key with yours from Widget > Install -->
    <script src="http://localhost:3000/w.js" data-key="cv_pub_paste_your_key_here" async></script>
  </head>
  <body style="font-family: system-ui; padding: 40px">
    <h1>Pretend customer website</h1>
    <p>The Conversate launcher should appear in the corner.</p>
    <button onclick="Conversate('open')">Open chat from my own button</button>
  </body>
</html>` },
      { type: 'mistakes', items: [
        { mistake: 'The launcher never appears and the console says "not in your allowed domains".', fix: 'Add localhost in Widget > Domains. For a real site add both acme.com and *.acme.com, and for Shopify add yourstore.myshopify.com too.' },
        { mistake: 'The iframe is blank with "Refused to frame" in the console.', fix: 'The frame-ancestors header does not include the page you are testing on. Check the middleware builds it from allowed domains and includes http://localhost:* in development.' },
        { mistake: 'The customer site\'s CSS changes the launcher\'s font or size.', fix: 'The launcher must render inside the shadow root with inline styles and all: initial on the host. Ask Claude Code to check nothing is appended to document.body except the host div.' },
      ] },
    ],
    checklist: [
      { id: 'con-fe-widget-c1', label: 'Copy the widget prompt', trigger: 'copy:con-fe-widget-prompt' },
      { id: 'con-fe-widget-c2', label: 'Brand the widget and watch the live preview' },
      { id: 'con-fe-widget-c3', label: 'Copy the test page', trigger: 'copy:con-fe-widget-test' },
      { id: 'con-fe-widget-c4', label: 'See your launcher on localhost:5500' },
    ],
  },
  {
    id: 'con-fe-team-analytics',
    title: 'Build Team, Analytics, Billing and Settings',
    outcome: 'Owners invite agents within their seat limit, everyone sees the numbers that matter, and settings cover notifications, canned replies and tags.',
    minutes: 90,
    xp: 55,
    blocks: [
      { type: 'callout', tone: 'eli5', title: 'Why one number matters most', text: 'AI resolution rate is the share of chats the AI finished on its own. If it is 60%, the customer\'s team answers 60% fewer chats. That is the number that keeps customers paying, so it is the biggest tile on the page.' },
      { type: 'prompt', id: 'con-fe-team-analytics-prompt', title: 'Paste into Claude Code', code: `Read @PRD.md sections 16, 19, 21 and @DESIGN.md sections 10 to 14 and 22. Plan first.

Build:
1. app/app/team/page.tsx: members table (role select for owner/admin through RLS update, owner row locked), pending invites (Resend calls invite-member with resendInvitationId, Revoke sets status 'revoked'), Invite dialog with the reserved seats line (rpc seats_used and plan_limits). Invite calls supabase.functions.invoke('invite-member').
2. app/app/analytics/page.tsx: range chips, 4 stat tiles from rpc workspace_stats (previous period for deltas), stacked bars per day and the weekly AI resolution line with Recharts (styles from DESIGN.md 10), top questions (content_gaps by times_asked + most cited articles from messages.sources), lowest-rated (csat score <= 2), agents table. Cap the range by plan history (PRD 16). Export CSV of conversations in range through a server route.
3. app/app/billing/page.tsx (owner only): current plan card, 4 usage meters from rpc usage_summary, the monthly/annual toggle and three plan cards (prices from lib/plans.ts, Checkout through the shared /api/stripe/checkout with the right STRIPE_PRICE_* id), Manage billing (portal). app/paywall/page.tsx from DESIGN.md 14.
4. app/app/settings/page.tsx with tabs Profile, Notifications (profiles.notify_email + per-kind switches stored in a jsonb column you add with a small migration 0003_notify_prefs.sql: alter table profiles add column notify_prefs jsonb not null default '{}'), Workspace, Canned replies, Tags, Danger zone.
5. The notifications bell menu from DESIGN.md 22 with Realtime on notifications (filter workspace_id=eq.<ws>), mark read on click.
6. lib/plans.ts mirrors plan_limits for display only, with a comment that the database is the source of truth.
Screenshot Team, Analytics and Billing at 1440px.` },
      { type: 'steps', items: [
        'Open Team and invite a second email of yours as Agent (the email arrives once invite-member and Resend are set up in the Backend phase).',
        'Open Analytics with the seeded data: tiles show numbers, not errors. Switch between 7 and 30 days: the tiles keep their size.',
        'Open Settings > Canned replies and add "/refund" with a short refund answer. In the Inbox type / and pick it.',
        'Open Billing: the usage meters match the sidebar meter.',
      ] },
      { type: 'code', id: 'con-fe-team-analytics-sql', filename: 'check-stats.sql', lang: 'sql', code: `-- Same numbers as the Analytics tiles for the last 30 days.
select * from public.workspace_stats(
  (select id from public.workspaces order by created_at desc limit 1),
  now() - interval '30 days', now()
);
-- If this errors with "not a member", that is correct: the SQL editor is not logged in as you.
-- Run it as your user instead:
-- select set_config('request.jwt.claims', '{"sub":"YOUR-USER-ID","role":"authenticated"}', true);` },
      { type: 'mistakes', items: [
        { mistake: 'Analytics shows an empty page with a 42501 error in the console.', fix: 'workspace_stats checks membership. The page must call it with the logged-in browser or server client (user JWT), not the secret-key client.' },
        { mistake: 'An agent can see the Billing page.', fix: 'Hide the link for non-owners and also check the role in the page with requireWorkspace(); redirect agents to /app/inbox.' },
        { mistake: 'The annual toggle makes the cards jump in height.', fix: 'Reserve the "$107.50 / month" line on monthly too with visibility: hidden, as DESIGN.md 12 says.' },
      ] },
    ],
    checklist: [
      { id: 'con-fe-team-analytics-c1', label: 'Copy the team and analytics prompt', trigger: 'copy:con-fe-team-analytics-prompt' },
      { id: 'con-fe-team-analytics-c2', label: 'Invite a second email as an agent' },
      { id: 'con-fe-team-analytics-c3', label: 'Add a /refund canned reply and use it in the Inbox' },
      { id: 'con-fe-team-analytics-c4', label: 'Run the stats SQL', trigger: 'copy:con-fe-team-analytics-sql' },
    ],
  },
]
