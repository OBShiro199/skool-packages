// Conversate marketing tasks: outbound, inbound, paid.
import type { Task } from '../../types'

export const outbound: Task[] = [
  {
    id: 'con-mk-out-list',
    title: 'Build a list of 300 companies drowning in support questions',
    outcome: 'A scored sheet of 300 SaaS companies, Shopify stores and agencies with a named owner, a verified email and one signal each.',
    minutes: 150,
    xp: 60,
    blocks: [
      { type: 'p', text: 'Your best buyers already show the pain in public: a "Contact us" form and no help centre, a stale FAQ page, an Intercom bubble on a 3-person team, or a job post for a "customer support specialist". That signal goes in your first line.' },
      { type: 'table', head: ['Segment', 'Where to find them', 'Signal to look for', 'Tier 1 if'], rows: [
        ['Bootstrapped SaaS (1 to 20 staff)', 'Product Hunt launches from the last 12 months, Indie Hackers products, G2 categories with under 20 reviews', 'No /help or /docs, or a help centre with under 10 articles', 'They also run Intercom or Crisp'],
        ['Shopify stores ($20k+ a month)', 'Store lists by niche (search "Powered by Shopify" + niche), Shopify app review pages for helpdesk apps', 'FAQ page with 20+ questions, "Where is my order" in reviews', 'They sell abroad (shipping questions)'],
        ['Web agencies (2 to 30 staff)', 'Webflow Experts directory, Clutch web design category, Framer Experts', 'Portfolio of 10+ client sites', 'They sell "care plans" or retainers'],
      ] },
      { type: 'steps', items: [
        'Make a Google Sheet with columns: company, website, segment, owner name, email, signal, signal source URL, current tool (Intercom/Crisp/Help Scout/none), pages (estimate), tier, status.',
        'Spend 45 minutes per segment filling 100 rows. Use the Wappalyzer browser extension to spot Intercom, Crisp, Zendesk or Help Scout on each site.',
        'Find the owner: the About page, LinkedIn, or Apollo free (small batches). Write emails only for named people, never info@.',
        'Verify every email with MillionVerifier. Delete anything not "good". Unknowns burn your domain.',
        'Score tier 1 (two signals), tier 2 (one), tier 3 (fits but no signal). Start with tier 1 only.',
      ] },
      { type: 'prompt', id: 'con-mk-out-list-prompt', title: 'Paste into Claude Code (with Firecrawl)', code: `I have a CSV leads.csv with columns company, website. For each row, use Firecrawl /v2/scrape (my FIRECRAWL_API_KEY in .env.local) on the homepage and on /help, /support, /faq and /docs (stop at the first 200).
Write leads-scored.csv with: company, website, has_help_centre (yes/no), help_article_count (estimate from links), support_tool (search the HTML for intercom, crisp, zendesk, helpscout, tidio, gorgias), faq_question_count, signal (one plain sentence, e.g. "FAQ page with 34 questions and no search"), tier (1 if no help centre AND a live chat tool or 20+ FAQ questions, 2 if one of those, else 3).
Rate limit to 2 requests a second, max 5 pages per company, and print the total credits used.` },
    ],
    checklist: [
      { id: 'con-mk-out-list-c1', label: 'Fill 100 rows per segment with a signal each' },
      { id: 'con-mk-out-list-c2', label: 'Run the scoring script', trigger: 'copy:con-mk-out-list-prompt' },
      { id: 'con-mk-out-list-c3', label: 'Verify every email and delete the unknowns' },
    ],
  },
  {
    id: 'con-mk-out-demo',
    title: 'Send "we built your help centre from your site" demos',
    outcome: 'Tier 1 prospects get a link to their own drafted help centre, built before you ever emailed them.',
    minutes: 180,
    xp: 75,
    blocks: [
      { type: 'callout', tone: 'eli5', title: 'Give the result first', text: 'Instead of asking for a call, you do the work for them. You crawl their site, let Conversate draft their help centre, and send them the link. People reply to something with their own name on it.' },
      { type: 'steps', items: [
        'Build the live demo from the inbound task "Ship the paste your site live demo" first. Add a DEMO_ADMIN_TOKEN env var that lets you (and only you) skip the daily cap, use a 30-page limit and keep the demo for 30 days instead of 48 hours. Run it once per tier 1 prospect and give each demo a slug like their company name.',
        'Crawl their site, publish the drafts, and open their help centre at yourdomain.com/<their-slug>/help. Fix any article that is wrong. You only send it if it is good.',
        'Record a 60-second Loom: open their help centre, search one of their real FAQ questions, then ask the widget the same thing and show the sources.',
        'Send email 1 by hand to the first 20. Then load the rest into Smartlead or Instantly with the sequence below. 15 to 25 sends per inbox per day.',
        'Reply within the hour. Book a 20-minute call where you hand the workspace over during the call.',
      ] },
      { type: 'code', id: 'con-mk-out-demo-seq', filename: 'sequence.txt', lang: 'txt', code: `E1 · day 0 · Subject: {company}'s help centre

{first_name}, your FAQ page has {faq_count} questions and no search, so customers email you instead.

I pointed Conversate at {website} this morning. It drafted {article_count} help articles from your own pages and an assistant that answers from them, with sources: {help_centre_link}

Want me to hand it over? It is yours either way.

{your_name}
Reply "no" and I won't email again.

E2 · day 3 · same thread

{first_name}, one number: on sites like yours the assistant answers about 6 in 10 questions without a human. The other 4 land in a shared inbox.

Here it is answering "{their_real_question}": {loom_link}

E3 · day 8 · new thread · Subject: close the loop?

Not sure support is on your list this quarter. Reply "later" and I'll check back in {month}. If it is, your help centre is still here: {help_centre_link}` },
      { type: 'callout', tone: 'tip', title: 'Numbers to track', text: 'Aim for a 15%+ reply rate on tier 1 because the asset is personal. If 100 sends get under 5 replies, the subject or the signal is wrong: change one thing and send the next 100. Budget: 30 demos at 30 pages is 900 Firecrawl credits and about $1 of Claude.' },
    ],
    checklist: [
      { id: 'con-mk-out-demo-c1', label: 'Build 20 demo help centres for tier 1 prospects' },
      { id: 'con-mk-out-demo-c2', label: 'Record a 60-second Loom for each' },
      { id: 'con-mk-out-demo-c3', label: 'Copy the 3-step sequence', trigger: 'copy:con-mk-out-demo-seq' },
      { id: 'con-mk-out-demo-c4', label: 'Hand-send the first 20 emails and reply within the hour' },
    ],
  },
  {
    id: 'con-mk-out-shopify',
    title: 'Pitch Shopify stores on "Where is my order?"',
    outcome: '100 Shopify store owners get a message about the question they answer 50 times a day.',
    minutes: 90,
    xp: 50,
    blocks: [
      { type: 'p', text: 'Shopify stores feel support pain as a list of the same five questions: order status, shipping times, returns, sizing, and discount codes. Lead with their exact FAQ, not with AI.' },
      { type: 'steps', items: [
        'Take the Shopify rows from your list. Open each store\'s FAQ and shipping policy pages and copy the 3 most-asked questions into the sheet.',
        'Crawl their FAQ, shipping and returns pages only (include paths /pages/faq*, /policies/*) into a demo workspace.',
        'Send the email below. For stores with an Instagram over 5,000 followers, also send the DM version.',
      ] },
      { type: 'code', id: 'con-mk-out-shopify-email', filename: 'shopify-email.txt', lang: 'txt', code: `Subject: shipping questions at {store}

{first_name}, your shipping page answers "do you ship to {country}?" but customers still have to find it.

I loaded your FAQ, shipping and returns pages into a chat assistant. It answers those questions on your store in one line, links the policy, and sends anything else (order problems, damaged items) to your inbox.

Here it is answering "{their_question}": {loom_link}

Want it on {store} this week? One line in theme.liquid.

{your_name}

---
DM version (Instagram):
Hey {first_name}, love the {product}. Quick one: I set up an assistant that answers your shipping and returns questions from your own policy pages. 40-second video of it on your store: {loom_link}. Want the link?` },
      { type: 'mistakes', items: [
        { mistake: 'Owners ask "can it look up my orders?"', fix: 'Be honest: not in v1. It answers from policies and hands order lookups to the inbox with the visitor\'s email, so a human replies fast. Note every ask in a sheet: it is your v2 roadmap.' },
      ] },
    ],
    checklist: [
      { id: 'con-mk-out-shopify-c1', label: 'Copy 3 real questions from 100 store FAQs' },
      { id: 'con-mk-out-shopify-c2', label: 'Copy the Shopify email and DM', trigger: 'copy:con-mk-out-shopify-email' },
      { id: 'con-mk-out-shopify-c3', label: 'Send 100 emails and 30 DMs' },
    ],
  },
  {
    id: 'con-mk-out-agencies',
    title: 'Sign up 3 agencies as resellers',
    outcome: 'Agencies install Conversate on client sites and earn 30% recurring, each bringing 5 to 20 workspaces.',
    minutes: 90,
    xp: 55,
    blocks: [
      { type: 'p', text: 'Agencies sell monthly care plans and every client asks for "an AI chatbot". Give them a product that makes them look good and pays them every month.' },
      { type: 'steps', items: [
        'Pick 40 agencies from Webflow Experts, Framer Experts and Clutch with 2 to 30 staff.',
        'For each, pick one client site from their portfolio and build a demo help centre for it.',
        'Create a Stripe promotion code per agency: Stripe > Product catalogue > Coupons > New (10% off forever for their clients), then Promotion codes > code AGENCYNAME. Track payouts in a sheet: 30% of each client\'s paid invoices, paid monthly.',
        'Send the email below. Offer a 20-minute call to set up the first client together.',
      ] },
      { type: 'code', id: 'con-mk-out-agencies-email', filename: 'agency-email.txt', lang: 'txt', code: `Subject: AI help desk for {client_name}

Hi {first_name},

I built a help centre and AI assistant for {client_name} from the site you made for them: {help_centre_link}. It answers from their own pages, shows sources, and hands anything tricky to their inbox.

Clients keep asking agencies for "an AI chatbot". If you add this to your care plans, your clients get 10% off and you get 30% of every month they stay.

Want me to hand {client_name}'s over to you so you can show them?

{your_name}` },
      { type: 'code', id: 'con-mk-out-agencies-maths', filename: 'agency-maths.txt', lang: 'txt', code: `One agency, 10 clients on Growth ($129, minus 10% = $116.10):
  Your revenue:   10 x $116.10 = $1,161 a month
  Agency payout:  30% = $348 a month
  You keep:       $813 a month before costs (about $12 per workspace)
Kill rule: if an agency has 0 paying clients 45 days after the call, stop chasing it.` },
    ],
    checklist: [
      { id: 'con-mk-out-agencies-c1', label: 'Build demo help centres for 40 agency client sites' },
      { id: 'con-mk-out-agencies-c2', label: 'Copy the agency email', trigger: 'copy:con-mk-out-agencies-email' },
      { id: 'con-mk-out-agencies-c3', label: 'Create a promotion code per interested agency' },
    ],
  },
  {
    id: 'con-mk-out-social',
    title: 'Answer support complaints on Reddit and X every day',
    outcome: '20 useful replies a day where founders complain about support load or Intercom prices, with 2 to 3 conversations a week.',
    minutes: 45,
    xp: 40,
    blocks: [
      { type: 'steps', items: [
        'Set up F5Bot (free) alerts for: "intercom pricing", "intercom alternative", "help centre", "support tickets", "chatbot made up", "customer support saas", "zendesk too expensive". Pick r/SaaS, r/startups, r/shopify, r/ecommerce, r/smallbusiness.',
        'On X, search the same phrases daily and filter by people with "founder" in bio.',
        'Reply with a real answer first (how to cut repeat questions, what to put in a help centre). Mention Conversate in under 1 in 10 replies, only when asked or obviously useful.',
        'DM founders who complain about Intercom bills with the script below.',
      ] },
      { type: 'code', id: 'con-mk-out-social-dm', filename: 'dm.txt', lang: 'txt', code: `Reddit reply (no link unless asked):
The fastest fix I've seen: export your last 200 support emails, group them, and write one help article per group. Usually 15 to 25 articles cover 70% of tickets. Then put a search box on every page. Happy to share the list of article titles that cover most SaaS questions if useful.

X DM:
Saw your post about the Intercom bill. I built a help desk that drafts your help centre from your site and answers with sources, flat monthly price (no per-resolution fee). Want me to run it on {website}? Takes me 5 minutes, you get the link either way.` },
    ],
    checklist: [
      { id: 'con-mk-out-social-c1', label: 'Set up F5Bot alerts for 7 phrases' },
      { id: 'con-mk-out-social-c2', label: 'Copy the reply and DM scripts', trigger: 'copy:con-mk-out-social-dm' },
      { id: 'con-mk-out-social-c3', label: 'Post 20 helpful replies a day for 10 days' },
    ],
  },
]

export const inbound: Task[] = [
  {
    id: 'con-mk-in-demo',
    title: 'Ship the "paste your site" live demo on the landing page',
    outcome: 'Visitors see their own drafted help centre and talk to it before signing up.',
    minutes: 90,
    xp: 60,
    blocks: [
      { type: 'callout', tone: 'eli5', title: 'Let them taste it', text: 'A visitor who watches their own website turn into a help centre does not need convincing. The demo costs you about 3 cents each, so cap it and let it run.' },
      { type: 'prompt', id: 'con-mk-in-demo-prompt', title: 'Paste into Claude Code', code: `Read @LANDING.md section 6. Build app/api/demo/route.ts (public) and the demo section:
1. Validate the URL with the same SSRF guard as onboard-crawl. Rate limit with try_rate_limit: 3 per IP per day ('demo:' + ip) and 60 per day in total ('demo:all').
2. Create a demo workspace owned by a system user (DEMO_OWNER_ID env var) with slug 'demo-' + 8 random chars, page_limit 10, then call onboard-crawl through the service role with an internal header so the planner drafts 3 articles only (mode 'demo').
3. Return { workspaceId, slug }. The section polls a public status route every 2 s (kb_sources status, article count) and renders the 5-line build list, 3 article cards and a chat box that calls widget-message with a demo token (key of the demo workspace, Origin = APP_URL).
4. "Keep this help centre" goes to /signup?demo=<workspaceId>; after signup, a server action transfers the demo workspace to the new owner (update owner_id and workspace_members with the secret key) if it is under 48 hours old.
5. Daily pg_cron: delete demo workspaces older than 48 hours that were not claimed.
Track demo_start, demo_ready, demo_to_signup.` },
      { type: 'steps', items: ['Deploy and run the demo with three different websites.', 'Lower the total cap to 2 and check the third attempt shows "Demos are busy today. Start a free trial instead."', 'Check the claim flow moves the demo into a new account.'] },
    ],
    checklist: [
      { id: 'con-mk-in-demo-c1', label: 'Copy the demo prompt', trigger: 'copy:con-mk-in-demo-prompt' },
      { id: 'con-mk-in-demo-c2', label: 'Test the demo with three websites' },
      { id: 'con-mk-in-demo-c3', label: 'Confirm the daily cap and the claim flow work' },
    ],
  },
  {
    id: 'con-mk-in-compare',
    title: 'Publish four honest comparison pages',
    outcome: 'Pages for "Intercom alternative", "Ferndesk alternative", "Crisp alternative" and "Help Scout alternative" that convert searchers already shopping.',
    minutes: 120,
    xp: 55,
    blocks: [
      { type: 'p', text: 'People who search "[competitor] alternative" are ready to switch. Alternative pages are usually a solo SaaS\'s best-converting pages, as long as they are honest and dated.' },
      { type: 'prompt', id: 'con-mk-in-compare-prompt', title: 'Paste into Claude Code', code: `Build app/(marketing)/compare/[competitor]/page.tsx from @LANDING.md section 21 with generateStaticParams for intercom, ferndesk, crisp and help-scout.
Data lives in content/compare.ts: for each competitor { name, verdict, pricing rows with checkedOn: '2026-10', features, chooseThemIf[], chooseUsIf[], switchingSteps[], faq[] }. Use the comparison table rows from @LANDING.md section 9 and keep every [verify] mark visible as a footnote until I confirm the price on the vendor's page.
Each page: unique H1 and meta, the dated table, honest "Choose them if", 3 switching steps, 4 FAQs with FAQPage JSON-LD, one CTA. Add them to sitemap.ts and llms.txt. Add a reminder comment to refresh prices every 13 weeks.` },
      { type: 'steps', items: [
        'Open each competitor\'s pricing page yourself and replace every [verify] with the real number and today\'s month.',
        'Submit the sitemap in Google Search Console (Sitemaps > add sitemap.xml).',
        'Post each page once in a relevant Reddit thread only where someone asked for alternatives.',
      ] },
    ],
    checklist: [
      { id: 'con-mk-in-compare-c1', label: 'Copy the comparison pages prompt', trigger: 'copy:con-mk-in-compare-prompt' },
      { id: 'con-mk-in-compare-c2', label: 'Confirm every competitor price on their own page' },
      { id: 'con-mk-in-compare-c3', label: 'Submit the sitemap in Search Console' },
    ],
  },
  {
    id: 'con-mk-in-tool',
    title: 'Launch a free "Help centre grader" tool',
    outcome: 'A free tool that scores any website\'s self-service support and collects emails from founders who need Conversate.',
    minutes: 120,
    xp: 55,
    blocks: [
      { type: 'p', text: 'Free tools rank for low-competition searches ("faq generator", "help center examples", "support page checker") and each result page sells the fix. The grader reuses your crawler, so it costs pennies per run.' },
      { type: 'prompt', id: 'con-mk-in-tool-prompt', title: 'Paste into Claude Code', code: `Build /tools/help-centre-grader: input a URL, crawl max 10 pages with Firecrawl (SSRF guard, 5 runs per IP per day, 100 per day total), then score out of 100 with plain rules and one Claude Haiku call:
- Has a help/docs/faq section (20), searchable (10), number of answerable questions found (20), contact options without email-only (10), answers to the 5 most common questions for its type (SaaS: pricing, cancel, password, integrations, refunds; store: shipping, returns, order status, sizing, payment) (30), last updated signals (10).
Show the score, the 5 questions they fail with "Missing" in warning ink, and a CTA "Fix all 5 with Conversate: we draft the articles from your site". Ask for an email to send the full PDF report (save to a leads table with RLS and no public policies). Add the page to the sitemap with a title like "Free help centre grader: score your support page in 30 seconds".` },
      { type: 'steps', items: ['Run the grader on 10 known sites and check the scores feel fair.', 'Post the tool on r/SaaS and r/shopify as "I built a free grader" with your own score first.', 'Email the leads table weekly with a link to start a trial from their report.'] },
    ],
    checklist: [
      { id: 'con-mk-in-tool-c1', label: 'Copy the grader prompt', trigger: 'copy:con-mk-in-tool-prompt' },
      { id: 'con-mk-in-tool-c2', label: 'Test the grader on 10 sites' },
      { id: 'con-mk-in-tool-c3', label: 'Post it in two communities' },
    ],
  },
  {
    id: 'con-mk-in-videos',
    title: 'Record six install videos, one per platform',
    outcome: 'Six short YouTube videos ("Add an AI help desk to Webflow in 5 minutes") that rank for platform searches and double as docs.',
    minutes: 150,
    xp: 50,
    blocks: [
      { type: 'steps', items: [
        'Record with Screen Studio (or any screen recorder) at 1080p. One video each for Plain HTML, Webflow, WordPress, Shopify, Framer and Next.js.',
        'Same structure every time (script below). Under 5 minutes. Show a real site, not a blank template.',
        'Title formula: "Add an AI help desk and help centre to {Platform} (5 minutes, no code)". Description: the steps as text, a link to your docs page for that platform, and the trial link with ?ref=yt-{platform}.',
        'Embed each video on its /docs install page.',
      ] },
      { type: 'code', id: 'con-mk-in-videos-script', filename: 'video-script.txt', lang: 'txt', code: `0:00  Hook: "This {platform} site gets the same 20 questions every week. In 5 minutes it will answer them by itself."
0:15  Paste the URL into Conversate, show the build list running.
1:00  Show the drafted help centre, fix one article, publish all.
1:45  Widget > Branding: icon, colour, greeting.
2:30  Widget > Install > {platform} tab, follow the steps live in {platform}.
3:30  Open the live site, ask a real question, show the sources.
4:00  Ask something it cannot answer, show the handoff and the inbox.
4:30  CTA: "7-day free trial, link below."` },
    ],
    checklist: [
      { id: 'con-mk-in-videos-c1', label: 'Copy the video script', trigger: 'copy:con-mk-in-videos-script' },
      { id: 'con-mk-in-videos-c2', label: 'Record and upload all six platform videos' },
      { id: 'con-mk-in-videos-c3', label: 'Embed each video on its docs page' },
    ],
  },
  {
    id: 'con-mk-in-public',
    title: 'Post your own resolution numbers every week',
    outcome: 'A weekly post on X or LinkedIn with real numbers from your own widget and customers that pulls founders in.',
    minutes: 30,
    xp: 30,
    blocks: [
      { type: 'prompt', id: 'con-mk-in-public-prompt', title: 'Paste into Claude Code', code: `Using the Supabase MCP, for the last 7 days across all workspaces (aggregate only, no names, no emails, no message text): total conversations, AI answers, AI resolution rate, median human first response, average CSAT, and the 5 most common content-gap questions rewritten generically ("How do I change my billing date?").
Write me a 6-line LinkedIn post in plain words with those numbers and one lesson. No hashtags, no emojis.` },
      { type: 'code', id: 'con-mk-in-public-example', filename: 'post-example.txt', lang: 'txt', code: `Conversate, week 9:
3,412 customer questions across 41 help desks.
63% answered by the AI with a source link, no human needed.
Median human reply on the rest: 7 minutes.
Most common gap: "Can I pay by invoice?" Nobody had written it down.
Lesson: your support inbox is your best list of missing docs.` },
    ],
    checklist: [
      { id: 'con-mk-in-public-c1', label: 'Copy the stats prompt', trigger: 'copy:con-mk-in-public-prompt' },
      { id: 'con-mk-in-public-c2', label: 'Post this week\'s numbers' },
    ],
  },
]

export const paid: Task[] = [
  {
    id: 'con-mk-paid-google',
    title: 'Run a $300 Google Search test on competitor and category terms',
    outcome: 'A clear answer on whether high-intent search brings trials under $60 each.',
    minutes: 60,
    xp: 45,
    blocks: [
      { type: 'callout', tone: 'warn', title: 'Only after 10 paying customers', text: 'Ads pour fuel on a fire that is already burning. Run this once your landing page converts organic visitors to trials at 4% or better. Before that, ads are expensive research.' },
      { type: 'steps', items: [
        'ads.google.com > New campaign > Website traffic > Search. Switch to Expert mode to skip the Smart campaign.',
        'Ad group 1, competitor (phrase match): "intercom alternative", "crisp alternative", "help scout alternative", "cheaper than intercom". Send to the matching /compare page.',
        'Ad group 2, category (phrase match): "ai help desk", "ai customer support for small business", "help centre software", "shopify faq chatbot". Send to /.',
        'Negative keywords: free, open source, jobs, salary, course, tutorial, login.',
        'Budget $20 a day for 15 days ($300). Conversion: trial_started fired from the Stripe webhook as an offline conversion, or the /app first load after checkout.',
      ] },
      { type: 'code', id: 'con-mk-paid-google-ads', filename: 'search-ads.txt', lang: 'txt', code: `Competitor ad
Headline 1: Intercom Alternative, Flat Price
Headline 2: No $0.99 Per AI Resolution
Headline 3: Help Centre + AI + Inbox
Description 1: 1,500 AI answers a month for $49. Drafts your help centre from your site in 5 minutes.
Description 2: Sources on every answer. Hands off to your team when unsure. 7-day free trial.

Category ad
Headline 1: AI Help Desk For Small Teams
Headline 2: Your Site Becomes a Help Centre
Headline 3: Live In 10 Minutes. From $49
Description 1: Paste your URL. Get a help centre, an AI assistant that cites sources, and a shared inbox.
Description 2: Works on Webflow, WordPress, Shopify, Framer and Next.js. Start your free trial.` },
      { type: 'table', head: ['Metric after $150', 'Keep going', 'Kill'], rows: [
        ['Cost per trial', 'Under $60', 'Over $120 with 0 trials in an ad group'],
        ['Click-through rate', 'Over 4% on competitor terms', 'Under 1.5%'],
        ['Trial to paid (after 7 days)', '25% or better', 'Under 10%'],
      ] },
    ],
    checklist: [
      { id: 'con-mk-paid-google-c1', label: 'Create two ad groups in Expert mode' },
      { id: 'con-mk-paid-google-c2', label: 'Copy the ad text', trigger: 'copy:con-mk-paid-google-ads' },
      { id: 'con-mk-paid-google-c3', label: 'Set up the trial conversion before spending' },
      { id: 'con-mk-paid-google-c4', label: 'Review at $150 and apply the kill rules' },
    ],
  },
  {
    id: 'con-mk-paid-meta',
    title: 'Run a 7-day Meta creative test aimed at Shopify owners',
    outcome: 'You learn which of 6 angles makes store owners start a trial, for about $105.',
    minutes: 90,
    xp: 50,
    blocks: [
      { type: 'p', text: 'Meta picks who sees your ad from the creative itself, so test different angles, not tiny tweaks. Optimise for trial start, not clicks.' },
      { type: 'steps', items: [
        'Install the Meta Pixel with the prompt from the course module 4.5 (Lead on signup, StartTrial when the subscription is trialing, server-side from the Stripe webhook).',
        'Ads Manager > Create > Sales (or Leads) > one campaign, one ad set, broad audience in your target countries, Advantage+ placements, $15 a day for 7 days.',
        'Make 6 creatives, one per angle in the grid below: a 15-second screen recording of the build list and the widget answering on a real store, with the hook as on-screen text.',
        'After 7 days keep the 2 angles with the lowest cost per trial and make 3 new variations of each.',
      ] },
      { type: 'code', id: 'con-mk-paid-meta-angles', filename: 'angles.txt', lang: 'txt', code: `1 Loss:      "You answered 'where is my order?' 50 times this week."
2 Time:      "Your FAQ page, turned into a help centre in 5 minutes."
3 Proof:     "63% of questions answered with a source. Zero made-up policies."
4 Price:     "AI support without $0.99 per answer."
5 Objection: "Worried a chatbot will invent a refund policy? Ours says 'not sure'."
6 Founder:   "I built this because I was answering support at 11pm."

15-second structure:
0-3s hook text on screen, 3-8s the pain as a number, 8-12s the widget answering on a store with sources, 12-15s "7-day free trial" + link.` },
      { type: 'callout', tone: 'warn', title: 'Kill rules', text: 'Stop any creative that spends 2x your target cost per trial ($120) with no trial. Stop the whole test at $105 if there are zero trials, and go back to outbound: your message is not ready yet.' },
    ],
    checklist: [
      { id: 'con-mk-paid-meta-c1', label: 'Install the Pixel and server-side StartTrial event' },
      { id: 'con-mk-paid-meta-c2', label: 'Copy the angle grid', trigger: 'copy:con-mk-paid-meta-angles' },
      { id: 'con-mk-paid-meta-c3', label: 'Launch 6 creatives at $15 a day for 7 days' },
    ],
  },
  {
    id: 'con-mk-paid-newsletter',
    title: 'Sponsor one founder newsletter issue',
    outcome: 'One tested placement in front of 4,000+ SaaS founders, measured by trials with a unique code.',
    minutes: 45,
    xp: 35,
    blocks: [
      { type: 'steps', items: [
        'Pick one newsletter read by bootstrapped SaaS founders or Shopify owners with a public sponsor page. Budget $300 to $600 for one issue.',
        'Create a Stripe promotion code (for example NEWSLETTER20: 20% off the first 3 months) and a landing URL with ?ref=newsletter-name.',
        'Send them the copy below. Ask for the issue date and the open count afterwards.',
        'Judge after 14 days: trials with the code or ref, and paid conversions. Keep the newsletter if cost per paying customer is under 3 months of revenue ($150 on Starter).',
      ] },
      { type: 'code', id: 'con-mk-paid-newsletter-copy', filename: 'sponsor-copy.txt', lang: 'txt', code: `Conversate turns your website into a help centre and an AI agent in 5 minutes.

Paste your URL: it drafts your help articles from your own pages, answers customers with sources, and hands the tricky ones to a shared inbox. Flat price from $49 a month, no per-resolution fees.

Readers get 20% off for 3 months with code {CODE}: {link}` },
    ],
    checklist: [
      { id: 'con-mk-paid-newsletter-c1', label: 'Pick one newsletter and book an issue' },
      { id: 'con-mk-paid-newsletter-c2', label: 'Copy the sponsor text', trigger: 'copy:con-mk-paid-newsletter-copy' },
      { id: 'con-mk-paid-newsletter-c3', label: 'Measure trials and paid customers after 14 days' },
    ],
  },
]
