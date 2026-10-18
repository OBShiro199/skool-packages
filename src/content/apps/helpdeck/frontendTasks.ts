// Helpdeck frontend tasks, appended to the Foundations phase after the shared app shell.
import type { Task } from '../../types'
import { ascii, code, eli5, mistakes, p, prompt, steps, task, tip, warn } from './helpers'

const mockNote = `If the edge functions are not deployed yet (they come in the Backend phase), add lib/mock-answer.ts
and use it when NEXT_PUBLIC_MOCK_ANSWERS=true, returning a fake answer with one source after 900 ms,
and a "not sure" answer when the question contains "refund". Remove the flag after Backend.`

export const frontendTasks: Task[] = [
  task({
    id: 'hd-fe-overview',
    title: 'Add the bot switcher, Overview stats and usage meters',
    outcome: 'The sidebar knows which bot you are on, and /app shows the activation checklist, answers used and deflection rate.',
    minutes: 45,
    xp: 45,
    blocks: [
      eli5('Why a bot switcher?', 'Growth customers can run up to 3 bots, for example one per product. Every page in the sidebar shows one bot at a time. The switcher at the top picks which one, and it remembers your choice in a cookie so the next page opens on the same bot.'),
      prompt('hd-fe-overview-prompt', 'Paste into Claude Code', `
Read @PRD.md sections 3, 6.2, 6.3 and 12, and @DESIGN.md sections 2 and 5.

1. Update the app shell sidebar to exactly the order in @PRD.md 6.3: logo, BotSwitcher, Overview, Sources,
   Conversations, Gaps, Widget, then the bottom group Documentation, Help, Billing, Settings.
   Phosphor icons from @DESIGN.md 1.4. Count badges for Conversations (open handoffs) and Gaps (open gaps)
   with min width 20px and visibility hidden at 0.
2. components/BotSwitcher.tsx: lists the workspace's bots (browser Supabase client, RLS scopes it), a status
   dot per bot, "+ New bot" at the bottom. At the plan cap (rpc('plan_limits') bots) show "1 of 1 bots ·
   Upgrade" linking to /billing. Store the chosen bot id in a cookie hd_bot (path /, 1 year). Sidebar links
   use that id. If the cookie points at a bot that no longer exists, fall back to the first bot.
3. app/(app)/bots/new/page.tsx from @DESIGN.md section 10. Insert into bots with the browser client.
   If the insert fails with message starting 'bot_limit', show the upgrade card instead of an error.
4. app/(app)/app/page.tsx (Overview) from @DESIGN.md section 5: activation checklist (crawl ready with 5+
   pages, one test answer, bots.first_seen_at set), four stat tiles (answers this month from
   workspace_usage_month with "of N" from plan_limits, deflection rate = confident assistant messages /
   all assistant messages this month for the bot, handoffs, open gaps), latest 5 conversations.
5. components/UsageMeter.tsx: label, "1,240 of 2,000", reset date, meter colour accent, amber under 20%
   left, coral under 5% left. Width eases 400ms. Tabular numbers. Reuse it on /billing later.
6. components/AppBanner.tsx with the priority order from @DESIGN.md 2.3, rendered above the toolbar.
${mockNote}
Run npm run build and show me the output.`),
      steps(
        'Paste the prompt and wait for the build to pass.',
        'Open http://localhost:3000/app. You see the sidebar in the exact order above and the 3-item checklist.',
        'Click the bot switcher. You see your bot and "+ New bot". On Starter it shows "1 of 1 bots · Upgrade".',
        'Shrink the window under 1100px. The sidebar turns into 56px icons and nothing else moves.',
      ),
      code('hd-fe-overview-sql', 'Supabase SQL Editor: what the Overview reads', 'sql', `
-- Your plan numbers
select * from public.plan_limits((select id from public.workspaces order by created_at limit 1));
-- Usage this period
select kind, quantity from public.workspace_usage_month;
`),
      mistakes([
        { mistake: 'The switcher shows no bots even though one exists.', fix: 'The bots query runs before the session loads. Ask Claude Code: "Read the session first, then query bots, and show a skeleton while loading."' },
        { mistake: 'Creating a 2nd bot on Starter shows a red database error.', fix: 'That is the bot limit trigger working. Ask Claude Code to catch errors whose message starts with "bot_limit" and show the upgrade card.' },
        { mistake: 'The meter shows 0 of 0.', fix: 'plan_limits returned nothing because the workspace has no subscription yet. Default to Starter numbers in the UI until Payments is wired.' },
      ]),
    ],
    checklist: [
      ['Copy the Overview prompt into Claude Code', 'copy:hd-fe-overview-prompt'],
      'See the sidebar in the exact order with the bot switcher',
      'See the activation checklist on /app',
      ['Run the plan limits SQL', 'copy:hd-fe-overview-sql'],
    ],
  }),
  task({
    id: 'hd-fe-sources',
    title: 'Build the Sources and Conversations pages',
    outcome: 'Owners can crawl their site, watch progress live, exclude pages, test the bot and read every chat.',
    minutes: 70,
    xp: 55,
    blocks: [
      eli5('What the Sources page does', 'It is the bot\'s library. You paste your docs address, Helpdeck reads every page, and the table shows what it learned. Next to it is a test chat, so you can ask questions before any customer sees the bot.'),
      prompt('hd-fe-sources-prompt', 'Paste into Claude Code', `
Read @PRD.md sections 8, 9.1 and 11.3, and @DESIGN.md sections 6 and 7.

1. app/(app)/bots/[botId]/sources/page.tsx:
   - Toolbar: URL input (360px), Crawl / Re-crawl (uses up to N pages) button calling
     supabase.functions.invoke('hd-crawl', { body: { action: 'start', botId, url } }). While a crawl is
     active the button becomes "Cancel crawl" with the same 170px min width (action 'cancel').
     Show the error message from the function's { error: { message } } under the input.
   - components/CrawlProgress.tsx: polls crawl_jobs (latest for the bot) and bots every 3 seconds while
     status is queued, crawling or embedding; stops otherwise. Live dot, "Reading <host> · N pages found",
     "Learning X%" (pages_embedded / max(pages_changed, 1)), steps Reading, Splitting, Learning, Ready.
     Reserve 72px min height. Failed state with "Try again".
   - Filter chips All, Learned, Pending, Failed, Excluded with counts.
   - Pages table, server paginated (50), search by title or url: Title, URL (ellipsis from the start),
     Chunks, Status pill, Crawled, row menu (Open page, Exclude from answers / Include again, Delete page
     with a confirm dialog). Exclude is a plain update of pages.excluded (the database trigger removes the
     chunks). Delete is a delete on pages.
   - Test panel: components/chat/ChatPanel.tsx in a 380px right column from 1280px, a side sheet below
     that. It gets a token from POST /api/bots/[botId]/test-token (build that route now: check the user
     with getClaims, check membership with rpc has_workspace_role, then mint a widget token with host 'app'
     using lib/widget-token.ts and WIDGET_TOKEN_SECRET).
2. app/(app)/bots/[botId]/conversations/page.tsx: 360px list (cursor pagination by last_message_at, 30 at
   a time), filter chips from URL params (?f=handoff | low | test), ?c=<id> selects a conversation.
   Transcript with SourceChips, "Confident · 0.71" or the amber "Low confidence · 0.38" pill, and the
   amber hint "Your docs do not cover this yet. Add a page, then re-crawl." with a link to Gaps.
   "Reply by email" mailto button only after a handoff.
All reads use the browser client. RLS scopes them to the workspace.
${mockNote}
Run npm run build.`),
      steps(
        'Paste your own website or a friend\'s docs URL and click Crawl.',
        'Watch the page count go up.',
        'Ask three questions in the test panel: two the docs answer, one they do not.',
        'Open Conversations and check the third one is flagged low confidence.',
        'Exclude one page from the row menu. Its Chunks number drops to 0 straight away.',
      ),
      code('hd-fe-sources-sql', 'Supabase SQL Editor: check the crawl and the chats', 'sql', `
select status, pages_found, pages_changed, pages_embedded, pages_failed from public.crawl_jobs order by started_at desc limit 3;
select title, status, excluded, chunk_count from public.pages order by crawled_at desc limit 10;
select c.first_question, c.status, c.low_confidence_count, c.is_test from public.conversations c order by last_message_at desc limit 5;
`),
      tip('Pick a small site first', 'Your first crawl should be a site with 10 to 30 pages so it finishes in a minute and uses few free Firecrawl credits.'),
      mistakes([
        { mistake: 'The progress card keeps polling forever.', fix: 'The crawl never reached ready because the worker is not scheduled yet. Finish the pg_cron task in Backend, or run the worker once by hand with its curl command.' },
        { mistake: 'Excluding a page gives "permission denied for table pages".', fix: 'The update sends more columns than excluded. Ask Claude Code: "Update only the excluded column of pages."' },
        { mistake: 'The test panel says token_expired after lunch.', fix: 'Tokens last 2 hours. Ask Claude Code to fetch a fresh test token when hd-answer returns 401 token_expired, then resend the question once.' },
      ]),
    ],
    checklist: [
      ['Copy the Sources prompt into Claude Code', 'copy:hd-fe-sources-prompt'],
      'Crawl a small site',
      'Find a low confidence chat in Conversations',
      'Exclude a page and see its chunks drop to 0',
      ['Run the check SQL', 'copy:hd-fe-sources-sql'],
    ],
  }),
  task({
    id: 'hd-fe-widget-page',
    title: 'Build the Widget page: appearance, install guides, domains and handoff',
    outcome: 'Owners style the bot with a live preview, copy the snippet with platform steps, lock domains and set the handoff email.',
    minutes: 60,
    xp: 50,
    blocks: [
      p('This is where an owner goes from "it works in the test panel" to "it is live on my site". The install status pill flips to Live the first time a real visitor gets an answer.'),
      prompt('hd-fe-widget-page-prompt', 'Paste into Claude Code', `
Read @PRD.md section 11.3 (Widget) and @DESIGN.md section 9.

Build app/(app)/bots/[botId]/widget/page.tsx with tabs Appearance, Install, Domains, Handoff (tab in the URL
as ?tab=install so the onboarding checklist can link to it) and a live WidgetPreview on the right (the real
ChatPanel in preview mode with a fake website background; side panel under 1100px).
1. Appearance: name, greeting with counter, brand colour (swatch + hex input, contrast warning), avatar upload
   to bucket bot-avatars at <workspace_id>/<bot_id>/avatar.<ext> (upsert, max 1 MB, png/jpeg/webp), three
   suggested questions with placeholders from the bot's first 3 page titles. Save each field on blur with a
   server action that updates only that column. Toast "Saved".
2. Install: status pill ("Not seen yet" or "Live on <last_seen_host>" plus "Last answer 3 minutes ago"),
   SnippetBox with the exact script tag and a fixed-width "Copy snippet" button that shows "Copied" for
   2 seconds, platform chips HTML, Webflow, WordPress, Shopify, Framer with the 3 steps from @DESIGN.md 9.2.
   Fire track('snippet_copied', { platform_tab }).
3. Domains: DomainTags input. Clean pasted values to bare hostnames (toast "Saved as docs.acme.com"), reject
   anything with spaces or no dot (except localhost), max 20. Amber warning when the list is empty.
4. Handoff: handoff email (defaults to the login email), handoff message, toggle "Send a copy to my login
   email" (workspaces.handoff_copy). Coral banner if email_log has a bounced handoff to that address.
Run npm run build.`),
      steps(
        'Change the brand colour to something bright. The preview bubble and visitor messages change at once.',
        'Paste `https://docs.acme.com/getting-started` into Domains. It is saved as `docs.acme.com`.',
        'Copy the snippet. The button says Copied without changing width.',
      ),
      code('hd-fe-widget-page-sql', 'Supabase SQL Editor: check the saved settings', 'sql', `
select name, brand_colour, greeting, suggested_questions, allowed_domains, handoff_email, first_seen_at, last_seen_host
from public.bots order by created_at desc limit 1;
`),
      mistakes([
        { mistake: 'Avatar upload fails with "new row violates row-level security policy".', fix: 'The path must start with the workspace id: <workspace_id>/<bot_id>/avatar.png. Ask Claude Code to build the path from bots.workspace_id.' },
        { mistake: 'Saving the name gives "permission denied for table bots".', fix: 'The update sends columns owners may not change (like status). Update only the edited column.' },
        { mistake: 'The status pill never says Live.', fix: 'first_seen_at is only set by answers from an allowed domain, never from the test panel. Ask one question on your real site.' },
      ]),
    ],
    checklist: [
      ['Copy the Widget page prompt into Claude Code', 'copy:hd-fe-widget-page-prompt'],
      'Change the brand colour and watch the preview',
      'Paste a full URL into Domains and see it cleaned',
      ['Run the settings check SQL', 'copy:hd-fe-widget-page-sql'],
    ],
  }),
  task({
    id: 'hd-fe-widget',
    title: 'Build the chat widget and the one-line installer',
    outcome: 'A chat bubble that works on any website with one script tag, and refuses to load on sites you did not allow.',
    minutes: 100,
    xp: 75,
    blocks: [
      eli5('How does one line of code add a chat bubble?', 'The script tag loads a tiny file, w.js, from your app. That file draws a round button on the customer\'s site. When clicked, it opens a little window (an iframe) that shows your chat page. The customer\'s site and your chat stay separate, so their styles cannot break your widget.'),
      ascii(`
customer site ── w.js ──> iframe /widget/BOT_ID   (browser checks frame-ancestors)
                                 │  server checks Referer host, mints token
                                 ▼
                       hd-answer (edge function, token checked)
                       │        │          │
                 Voyage embed  pgvector   Claude Haiku
                       └────────┴──────────┘
                                 │
                         answer + sources ──> widget`, 'What happens when a visitor asks a question'),
      eli5('Why two locks on the domain?', 'Lock one is the browser: our server tells it "only show this chat inside docs.acme.com", so a copycat site gets a blank box. Lock two is a short-lived ticket (token) the chat page only hands out when the visitor came from an allowed site. Every question needs a valid ticket.'),
      prompt('hd-fe-widget-prompt', 'Paste into Claude Code', `
Read @PRD.md sections 5.2 (point 4), 9.0, 11.1 and 11.2, and @DESIGN.md section 15.

1. public/w.js exactly as @PRD.md 11.1: plain JavaScript, no build step, under 3 KB, Shadow DOM bubble,
   one iframe created on first click, visitorId in localStorage (try/catch), postMessage only from
   NEXT_PUBLIC_APP_URL, window.Helpdeck = { open, close, ask }, exits if loaded twice.
2. app/api/widget/[botId]/config/route.ts: public GET, CORS *, Cache-Control 60 s. Reads the bot with the
   admin client and returns only { name, brandColour, greeting, avatarUrl, suggestedQuestions,
   showBranding, mode } (mode from @PRD.md 8.6, showBranding from plan_limits). 404 for unknown bots.
3. lib/hosts.ts and lib/widget-token.ts: same logic as the edge function helpers (host matching that does
   not let evilacme.com match acme.com; HMAC tokens with WIDGET_TOKEN_SECRET, 2 hours).
4. proxy.ts (Next 16) or middleware.ts (Next 15): for /widget/:botId set
   Content-Security-Policy: frame-ancestors <APP_URL> <each allowed domain as https://host> (and
   http://localhost:* only when localhost is in the list). Cache each bot's domains for 60 s in memory.
   Every other route keeps frame-ancestors 'self'. Remove any X-Frame-Options header on /widget only.
5. app/widget/[botId]/page.tsx: server component, no app chrome. Read the Referer host, check it with
   hostAllowed against allowed_domains. Match: mint a token { b, h: host, v: searchParams.v }. No match:
   render "This assistant is not set up for this website." Pass { token, config, visitorId, pageUrl }
   to ChatPanel.
6. components/chat/ChatPanel.tsx (shared with the test panel and demo): every state in @DESIGN.md 15.3
   to 15.5: greeting, suggested question chips, visitor and bot messages, sanitised markdown (no raw
   HTML; links http/https only, target _blank, rel noopener nofollow), TypingDots, SourceChips, HandoffBox
   (calls hd-handoff), email_only / paused / not_ready / rate limited / network error / wrong domain.
   conversationId kept in sessionStorage per bot. On 401 token_expired post hd:reload to the parent.
7. Keep the /widget route bundle under 40 KB gzipped: no shadcn or Radix inside it.
${mockNote}
Run npm run build and print the size of the /widget route.`),
      steps(
        'Create a file test.html on your desktop with `<script src="http://localhost:3000/w.js" data-bot="YOUR_BOT_ID" async></script>` inside the body.',
        'Add `localhost` to the bot\'s allowed domains (Widget page, Domains tab).',
        'Open test.html in your browser through a local server (run `npx serve ~/Desktop` and open the URL it prints).',
        'Click the bubble and ask a question about your docs.',
        'Now remove localhost from allowed domains, wait a minute (the domain list is cached for 60 seconds) and reload test.html. The bubble shows but the chat window stays blank (the browser refused to frame it). Put localhost back.',
      ),
      code('hd-fe-widget-test', 'test.html (on your desktop)', 'html', `
<!doctype html>
<html>
  <body>
    <h1>Pretend customer site</h1>
    <button onclick="Helpdeck.open()">Open support</button>
    <script src="http://localhost:3000/w.js" data-bot="YOUR_BOT_ID" async></script>
  </body>
</html>
`),
      mistakes([
        { mistake: 'The iframe is blank with a "refused to connect" error.', fix: 'Your frame-ancestors header blocks it. Ask Claude Code: "Allow /widget/* to be framed by the bot\'s allowed domains, keep all other routes self only."' },
        { mistake: 'Every answer comes back 401 bad_token.', fix: 'WIDGET_TOKEN_SECRET is different in .env.local (or Vercel env) and Supabase secrets. Set the exact same value in both places, then redeploy hd-answer.' },
        { mistake: 'The widget says "This assistant is not set up for this website." on localhost.', fix: 'Either localhost is missing from the Domains tab, or the browser sent no Referer. Some browsers send no Referer from file:// pages. Open test.html through npx serve (an http:// address), not by double-clicking it.' },
      ]),
    ],
    checklist: [
      ['Copy the widget prompt into Claude Code', 'copy:hd-fe-widget-prompt'],
      'Add localhost to allowed domains',
      'Open test.html and see the bubble',
      'Ask a question and get an answer with sources',
      ['Copy the test page', 'copy:hd-fe-widget-test'],
      'Remove localhost and see the chat refuse to load',
    ],
  }),
  task({
    id: 'hd-fe-gaps',
    title: 'Build the Gaps page and the CSV export',
    outcome: 'Owners see the questions their docs could not answer, ranked by how often they come up, and can export every chat.',
    minutes: 40,
    xp: 40,
    blocks: [
      eli5('Why a gaps list sells the product', 'Every "I\'m not sure" is a question a real customer asked that your docs do not answer. Ranked by count, that list tells the owner exactly which help page to write next. Owners who fix gaps see the bot get better every week, and they stay.'),
      prompt('hd-fe-gaps-prompt', 'Paste into Claude Code', `
Read @PRD.md sections 6.4, 7 and 11.3 (Gaps), and @DESIGN.md section 8.

1. app/(app)/bots/[botId]/gaps/page.tsx: segmented filter Open, Fixed, Ignored; table Question, Asked (x14),
   Last asked, Status, and two fixed-width compact buttons "Mark fixed" and "Ignore" (update doc_gaps.status
   only). Row click opens a side panel with up to 10 conversations where it was asked (conversations whose
   messages have question_key(question) equal to the gap's key; add an rpc or a server query with the
   admin client after a membership check). Starter users see the Growth upsell box from @DESIGN.md 8.
2. app/api/bots/[botId]/export/route.ts: POST, user checked with getClaims, membership with
   has_workspace_role. Stream conversations and messages for the bot (last 90 days) into a CSV with columns
   conversation_id, started_at, host, page_url, role, message, confident, sources, handed_off, visitor_email.
   Escape quotes and formulas (prefix cells starting with = + - @ with a single quote). Upload to bucket
   conversation-exports at <workspace_id>/<uuid>.csv with the admin client and return a 10 minute signed URL.
3. "Export CSV" button on Conversations: spinner after 200 ms with the label kept, toast "Export ready" with a
   Download action. track('export_csv', { rows }).
Run npm run build.`),
      steps(
        'Ask the test panel 3 questions your docs do not cover, one of them twice with different capitals.',
        'Open Gaps. The repeated one shows Asked x2 (capitals and punctuation do not matter).',
        'Click Mark fixed. Ask it again: it comes back to Open.',
        'Click Export CSV on Conversations and open the file.',
      ),
      code('hd-fe-gaps-sql', 'Supabase SQL Editor: the gaps behind the page', 'sql', `
select sample_question, question_key, times_asked, status, last_asked_at
from public.doc_gaps order by times_asked desc, last_asked_at desc limit 10;
`),
      warn('CSV files can attack spreadsheets', 'A visitor can type =HYPERLINK("http://evil") into the chat. If that lands in a CSV unchanged, Excel runs it. That is why the prompt prefixes risky cells with a single quote.'),
      mistakes([
        { mistake: 'Every gap shows Asked x1 even for repeats.', fix: 'The key is built in the browser instead of the database. Gaps must be written only by rpc record_gap in hd-answer, which normalises the text.' },
        { mistake: 'Export returns 403.', fix: 'The route checks the role but the user is a member, not owner or admin. In v1 everyone is owner; check the workspace_members row exists.' },
        { mistake: 'The signed URL downloads an empty file.', fix: 'The upload ran before the CSV stream finished. Ask Claude Code to build the whole CSV string (or a Blob) first, then upload.' },
      ]),
    ],
    checklist: [
      ['Copy the Gaps prompt into Claude Code', 'copy:hd-fe-gaps-prompt'],
      'See a repeated question counted as Asked x2',
      'Mark a gap fixed and watch it re-open',
      'Download a CSV export',
    ],
  }),
]
