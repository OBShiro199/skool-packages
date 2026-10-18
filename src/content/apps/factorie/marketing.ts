import type { Task } from '../../types'
import { code, eli5, links, mistakes, p, prompt, steps, table, task, tip, warn } from './helpers'

/* ------------------------------------------------------------------ */
/* OUTBOUND                                                            */
/* ------------------------------------------------------------------ */

export const outbound: Task[] = [
  task({
    id: 'fac-out-buyer',
    title: 'Write buyer.md and build your first 300 leads',
    outcome: 'A one-page description of each Factorie buyer and a sheet of 300 people with a real reason to care this month.',
    minutes: 60,
    xp: 50,
    blocks: [
      eli5('Why a signal matters', 'A cold email that says "you might like this" gets ignored. One that says "you are hiring a content marketer, and ChatGPT never mentions you" gets read, because it is about them and it is true today. The signal is that true, timely fact.'),
      table(['Segment', 'Who to email', 'Signals that mean "now"', 'Where to find them'], [
        ['B2B SaaS, $1m to $20m ARR', 'Head of marketing, founder (under 50 staff)', 'Hiring a content or SEO marketer; a competitor is on G2 and they are not; organic traffic flat (they post about it)', 'LinkedIn jobs, G2 category pages, Apollo free'],
        ['SEO and content agencies, 2 to 30 staff', 'Founder, head of SEO', 'Blog post or LinkedIn post about "AI search", "GEO" or "AEO"; selling SEO retainers', 'Google "AI search optimisation agency", Clutch, LinkedIn search'],
        ['Ecommerce brands, $1m+ revenue', 'Head of growth, ecommerce manager', 'Rising ad spend (Meta Ads Library shows 50+ ads), a category where buyers ask AI ("best running shoes")', 'Meta Ads Library, Shopify store lists, Apify'],
      ]),
      prompt('fac-out-buyer-prompt', 'Paste into Claude Code', `
Write buyer.md for Factorie (read @PRD.md sections 1 to 3) with one section per segment:
who they are and what they own, what breaks in their world, the words they use (AEO, GEO,
"AI search", "ChatGPT mentions"), what they would Google the week before buying, and the 3
signals that mean they need it now. Then make leads.csv with these columns: segment, company,
domain, first_name, last_name, role, email, linkedin_url, signal (one fact, under 100 characters),
signal_source_url, competitor_1, competitor_2. Test buyer.md: invent 10 company descriptions,
rank them 1 to 10 against it and explain the top 3 and bottom 3 in one line each.
`),
      steps(
        'Run the prompt. Read buyer.md out loud and fix anything that sounds like marketing copy rather than how a buyer talks.',
        'Fill leads.csv with 100 people per segment. Use Apollo free for emails on your best 50, and Apify (about $5 of free credit) to scrape G2 category pages or LinkedIn job posts for signals.',
        'Verify every email with MillionVerifier (about $37 per 10,000 [verify]). Delete anything not "good".',
        'For each lead, fill competitor_1 and competitor_2: the two brands an AI engine would most likely name in their category. You need these for the audit in the next task.',
      ),
      mistakes([
        { mistake: 'The signal column says "uses SEO".', fix: 'That is not a signal, it is a guess. A signal is a dated fact with a link: "Posted a Content Marketing Manager role on 14 Oct".' },
        { mistake: 'You email the CEO of a 500-person company.', fix: 'They will never see it. Under 50 staff email the founder; above that, the head of marketing or SEO.' },
        { mistake: '30% of emails bounce.', fix: 'You skipped verification. Bounces above 2% damage your sending domain. Verify every list before it touches the sequencer.' },
      ]),
    ],
    checklist: [['Run the buyer.md prompt', 'copy:fac-out-buyer-prompt'], 'Fix buyer.md in the buyer\'s own words', 'Fill 300 leads with a signal each', 'Verify every email'],
  }),
  task({
    id: 'fac-out-audits',
    title: 'Run a free AI visibility audit for every prospect',
    outcome: 'Each lead gets a real audit link showing what ChatGPT, Perplexity and DeepSeek say about them, ready to drop into your first email.',
    minutes: 45,
    xp: 50,
    blocks: [
      eli5('The best cold email gift', 'Most cold emails ask for 15 minutes. Yours hands over something useful first: "I asked ChatGPT the 5 questions your buyers ask. You came up once; Otterly came up four times. Here is the page." It costs you about 11 cents per prospect and it is the exact thing Factorie sells.'),
      prompt('fac-out-audits-prompt', 'Paste into Claude Code', `
Build an internal page /app/admin/audits that only my user id (FOUNDER_USER_ID env var) can open.
It takes a CSV upload with columns domain, brand_name, category, email and, for each row, calls
the free-audit edge function from a server action with the cron secret and a new field
source: "outbound" that skips the per-domain and per-IP limits (but still counts toward the
global daily cap and is logged in usage_ledger with operation 'audit'). Do not email the prospect
for outbound audits (skip the audit email when source is outbound). Show a table with domain,
status, score, the top 3 brands named and the /audit/[token] link, and a "Download CSV" button
that adds score, top_brands and audit_url columns to my leads.csv.
`),
      steps(
        'Run the prompt and open /app/admin/audits.',
        'Upload your first 50 leads. Wait about 5 minutes. Each audit costs about $0.11, so 50 is about $5.50.',
        'Download the CSV. Sort by score: the leads scoring under 20 with a competitor named 3+ times are your hottest.',
        'Open three audit links yourself and check they read well before you email anyone.',
      ),
      tip('Daily rhythm', 'Run 50 audits each morning for the leads you will email that day. Audits older than two weeks are stale: AI answers move.'),
      mistakes([
        { mistake: 'Every audit scores 0.', fix: 'The brand name in your CSV does not match how the engines write it (e.g. "Acme Inc." vs "Acme"). Use the short name people say out loud.' },
        { mistake: 'You hit the global daily audit cap.', fix: 'Raise app_settings audit_daily_cap for outbound days, or split the batch across mornings.' },
      ]),
    ],
    checklist: [['Run the admin audits prompt', 'copy:fac-out-audits-prompt'], 'Upload your first 50 leads', 'Download the CSV with scores and links', 'Read three audit pages yourself'],
  }),
  task({
    id: 'fac-out-email-setup',
    title: 'Set up cold email that lands in the inbox',
    outcome: 'Three lookalike domains, six warmed inboxes and a sequencer, so outreach never touches your main domain.',
    minutes: 40,
    xp: 40,
    blocks: [
      eli5('Why not send from your main domain?', 'Cold email gets some spam complaints even when it is good. If those land on factorie.io, your password resets and digests start going to spam too. So you send from lookalike domains (getfactorie.com, tryfactorie.com) and keep the real one clean.'),
      table(['Item (checked Oct 2026)', 'Price', 'How many'], [
        ['Lookalike .com domains (Porkbun)', 'About $11 a year each', '3'],
        ['Premium Inboxes (Google inboxes with SPF, DKIM, DMARC set)', '$3.50 per inbox a month', '6 (2 per domain)'],
        ['Smartlead Base (sequences, warm-up)', '$39 a month', '1'],
        ['Total', 'About $60 a month + $33 a year', ''],
      ]),
      steps(
        'Porkbun: buy getfactorie.com, tryfactorie.com and factoriehq.com (or close variants). Point each to forward to your real site.',
        'Premium Inboxes: order 2 inboxes per domain with real first names (e.g. sam@getfactorie.com). They set up SPF, DKIM and DMARC and connect them to Smartlead for you.',
        'Smartlead: turn on warm-up for all six inboxes. Wait at least 14 days (30 is better) before the first campaign.',
        'After warm-up, send at most 20 emails per inbox per day: 6 inboxes x 20 = 120 a day.',
        'Add Google Postmaster Tools for each domain and keep the spam rate under 0.3%.',
      ),
      mistakes([
        { mistake: 'You start sending on day 2.', fix: 'New inboxes have no reputation. Sending early burns the domain. Wait for warm-up.' },
        { mistake: 'Links and images in email 1.', fix: 'Both hurt deliverability. Email 1 is plain text with no link. The audit link goes in the reply to anyone who says yes.' },
      ]),
      links([
        { label: 'Porkbun', url: 'https://porkbun.com' },
        { label: 'Premium Inboxes', url: 'https://premiuminboxes.com' },
        { label: 'Smartlead', url: 'https://www.smartlead.ai' },
        { label: 'Google Postmaster Tools', url: 'https://postmaster.google.com' },
      ]),
    ],
    checklist: ['Buy three lookalike domains', 'Order six inboxes', 'Turn on warm-up and wait 14+ days', 'Add Postmaster Tools'],
  }),
  task({
    id: 'fac-out-email-scripts',
    title: 'Send the audit sequence',
    outcome: 'A three-step, under-80-word sequence per segment that offers the audit, plus a same-day reply routine.',
    minutes: 40,
    xp: 50,
    blocks: [
      p('One campaign = one segment x one signal. Hand-send the first 20 from your own inbox, keep what gets replies, then load the rest into Smartlead. Day 0, day 3 (same thread), day 8 (new thread).'),
      code('fac-out-email-saas', 'B2B SaaS sequence', 'txt', `
E1 · day 0 · Subject: ChatGPT and {{company}}
{{firstname}}, {{signal: you posted a content marketing role last week}}.

I asked ChatGPT and Perplexity the 5 questions your buyers ask before they pick a
{{category}}. {{company}} came up in {{n}} of 15 answers. {{competitor_1}} came up in {{m}}.

I saved the answers on one page. Want the link?

Sam
Factorie · [address] · Reply "no" and I will not email again.

E2 · day 3 · same thread
{{firstname}}, one detail from it: when someone asks "{{weakest prompt}}", every engine lists
{{competitor_1}} first and none mention you. Happy to send the page either way.

E3 · day 8 · new thread · Subject: close the loop?
Not sure AI search is on your list this quarter. Reply "later" and I will check back in
{{month}}. If it is, the audit for {{company}} is ready.`),
      code('fac-out-email-agency', 'Agency sequence', 'txt', `
E1 · day 0 · Subject: AI search reports for your clients
{{firstname}}, {{signal: saw your post on GEO for B2B brands}}.

Clients are starting to ask agencies what ChatGPT says about them. I ran the free version of
that report for {{agency}}: you appear in {{n}} of 15 answers for "{{category}} agency".

Want it? It takes 2 minutes to read and you can run the same thing for 3 clients on one login.

Sam
Factorie · [address] · Reply "no" and I will not email again.

E2 · day 3 · same thread
{{firstname}}, the agencies using it send the weekly digest straight to clients as a
"what AI says about you" update. Happy to send yours either way.

E3 · day 8 · new thread · Subject: one for your next client call?
If a client asks about AI search this month, reply "audit" with their domain and I will send
you their report free.`),
      code('fac-out-email-ecom', 'Ecommerce sequence', 'txt', `
E1 · day 0 · Subject: "best {{product type}}" in ChatGPT
{{firstname}}, {{signal: you are running 60+ Meta ads this month}}.

I asked ChatGPT, Perplexity and DeepSeek "what is the best {{product type}} for {{use}}".
{{brand}} came up in {{n}} of 15 answers. {{competitor_1}} came up in {{m}}.

That traffic costs nothing per click. Want the page with the answers?

Sam
Factorie · [address] · Reply "no" and I will not email again.`),
      table(['Reply', 'What you do (same day)'], [
        ['"Yes" / "send it"', 'Send the /audit/[token] link plus one line: "Happy to show you how to track all 25 questions every week: [7-day trial link]"'],
        ['"How did you get this?"', 'Explain in two lines (APIs, 5 questions, 3 engines). Offer the trial.'],
        ['"Later"', 'Tag it in Smartlead, follow up on the date with a fresh audit'],
        ['A question or objection', 'Answer it, then add it to objections.md: it is what the whole segment is thinking'],
        ['"No" / unsubscribe', 'Remove everywhere the same day'],
      ]),
      table(['Number', 'Target', 'Kill rule'], [
        ['Positive reply rate', '8%+', 'Under 3% after 300 sends: change the signal, not the wording'],
        ['Yes to audit to trial', '25%+', 'Under 10%: the audit page is not convincing; improve the result page'],
        ['Trial to paid', '30%+', 'Under 15%: onboarding or first-run problem, not an outbound problem'],
      ]),
      mistakes([
        { mistake: 'You put the audit link in email 1.', fix: 'Links in cold email 1 hurt deliverability and get fewer replies. Ask first, send the link in the reply.' },
        { mistake: 'Every email says the same numbers.', fix: '{{n}} and {{m}} must come from each lead\'s real audit. A made-up number gets caught on the first reply.' },
      ]),
    ],
    checklist: [['Copy the SaaS sequence', 'copy:fac-out-email-saas'], ['Copy the agency sequence', 'copy:fac-out-email-agency'], 'Hand-send the first 20 emails', 'Answer every reply the same day'],
  }),
  task({
    id: 'fac-out-agencies',
    title: 'Sign five agencies as partners',
    outcome: 'Five SEO or content agencies on Growth, each tracking three client brands, with a 20% recurring referral for clients they send you.',
    minutes: 40,
    xp: 45,
    blocks: [
      eli5('Why agencies are worth five customers each', 'An agency already has the clients asking about AI search. If Factorie makes them look clever in a monthly client call, they keep paying, and when a client wants their own login, the agency sends them to you.'),
      steps(
        'Pick 30 agencies from your leads that post about AI search, GEO or AEO.',
        'Connect on LinkedIn (20 a day, no note). When they accept, send the DM below.',
        'For anyone who replies, run a free audit for one of their named clients and send it.',
        'Offer the partner deal: Growth at $199, plus 20% of every client they refer, every month, tracked with a Stripe coupon code per agency in a sheet.',
      ),
      code('fac-out-agencies-dm', 'LinkedIn DM after they accept', 'txt', `
Thanks for connecting, {{firstname}}. Quick one: are clients asking you what ChatGPT says
about them yet?

I built a tracker for exactly that. If you name one client, I will send you their AI visibility
report free so you have something to show on your next call.`),
      tip('Make them the hero', 'Never sell to the agency\'s client behind their back. Partners who trust you send more.'),
    ],
    checklist: ['List 30 agencies that talk about AI search', ['Copy the LinkedIn DM', 'copy:fac-out-agencies-dm'], 'Send 3 client audits to agencies who reply', 'Set up a coupon code per partner'],
  }),
  task({
    id: 'fac-out-social',
    title: 'Answer people already asking about AI search',
    outcome: 'Keyword alerts for "rank in ChatGPT" and "AI visibility" on Reddit and X, and a 15-minute daily reply habit.',
    minutes: 20,
    xp: 30,
    blocks: [
      steps(
        'Go to https://f5bot.com and add alerts for: "rank in ChatGPT", "show up in ChatGPT", "AI visibility", "AEO tool", "GEO tool", "Profound alternative", "Otterly alternative", "Peec AI".',
        'Every day at 9:45, open the alert email and reply to new threads in r/SEO, r/SaaS, r/bigseo, r/marketing and r/startups with real help first.',
        'Offer the audit only when it answers the question, and say you built it.',
        'On X, search the same phrases and reply to founders with a specific observation from a free audit of their brand.',
      ),
      code('fac-out-social-reply', 'Reddit reply that helps first', 'txt', `
What moved it for us: the engines with web search (ChatGPT search, Perplexity) mostly cite
3 kinds of pages for "best X" questions: comparison listicles, G2/Capterra pages and Reddit
threads. Being on 2 or 3 of the listicles they cite moved us from not mentioned to #3 in about
three weeks.

If you want to see which pages they cite for your category, I built a free audit (I am the
founder, so bias noted): factorie.io/audit`),
      mistakes([
        { mistake: 'Posting the link in every thread.', fix: 'Subreddits ban that fast. Help in 4 out of 5 replies with no link at all.' },
      ]),
    ],
    checklist: ['Set up the F5Bot alerts', ['Copy the reply template', 'copy:fac-out-social-reply'], 'Reply to 3 threads a day for a week'],
  }),
]

/* ------------------------------------------------------------------ */
/* INBOUND                                                             */
/* ------------------------------------------------------------------ */

export const inbound: Task[] = [
  task({
    id: 'fac-in-leaderboards',
    title: 'Publish monthly "who AI recommends" leaderboards',
    outcome: 'One public page per category ("Which CRMs does ChatGPT recommend? October 2026") built from your own data, refreshed monthly.',
    minutes: 60,
    xp: 55,
    blocks: [
      eli5('Why this works', 'Every marketer wants to know where they rank. A leaderboard of "which tools AI recommends for X" gets shared by the winners, argued about by the losers, and linked by journalists. And you are the only one with the data, because you built the machine that collects it.'),
      prompt('fac-in-leaderboards-prompt', 'Paste into Claude Code', `
Build /leaderboards/[category] as static pages from content/leaderboards/*.json. Each JSON has
category, month, the 10 prompts used, and per brand: mentions per engine, average position,
share of voice. Write scripts/leaderboard.ts that, given a category name, 10 prompts and up to
20 brand names and domains, creates an internal brand under my account (FOUNDER_USER_ID),
runs one check on all 6 engines, waits for it to finish and writes the JSON. Page layout follows
@LANDING.md and @DESIGN.md: a ranked table (rank, brand, share of voice, mentions by engine as
PositionBadges), the method in plain words, the date, and the CTA "See where AI recommends you:
free audit". Add each page to the sitemap with Article JSON-LD.
`),
      steps(
        'Pick 5 categories your buyers live in: CRMs, email marketing tools, project management, AI visibility tools (yes, your own category), SEO agencies in London.',
        'Run the script per category. Each costs about $0.65 (10 prompts x 6 engines).',
        'Publish, then email or DM the top 3 brands in each: "You came first in our October ChatGPT leaderboard for CRMs. Here is the page." Many will share it.',
        'Refresh every month on the 1st. Movements are the story: "HubSpot dropped from #1 to #3 on Perplexity".',
      ),
      mistakes([
        { mistake: 'Leaderboards with 3 prompts.', fix: 'Too few to mean anything. Use 10 prompts and say so on the page.' },
        { mistake: 'Ranking your own product first in your own category.', fix: 'Publish what the data says. If you are not mentioned, that is a better story ("we built the tracker and AI does not know us yet").' },
      ]),
    ],
    checklist: [['Run the leaderboards prompt', 'copy:fac-in-leaderboards-prompt'], 'Publish 5 category leaderboards', 'Tell the top 3 brands in each', 'Set a monthly refresh reminder'],
  }),
  task({
    id: 'fac-in-vs-pages',
    title: 'Ship the comparison and alternatives pages',
    outcome: 'Fair, dated pages for "Profound alternative", "Otterly vs Peec", "Searchable pricing" and similar searches that send ready-to-buy visitors.',
    minutes: 45,
    xp: 40,
    blocks: [
      p('People searching "Profound alternative" or "Otterly pricing" have already decided to buy a tool like yours. These pages convert better than anything else you will write. The template is in LANDING.md section 21.'),
      steps(
        'Check every competitor\'s pricing page yourself today and write the date on each page. Replace every [verify] with the real number.',
        'Ship /vs/searchable, /vs/profound, /vs/otterly and /vs/peec.',
        'Add /alternatives/profound, /alternatives/otterly and /alternatives/peec: "5 Profound alternatives in 2026" with real pricing for each, Factorie included and not always first.',
        'Submit the sitemap in Google Search Console and ask for indexing on each URL.',
      ),
      code('fac-in-vs-prompt', 'Paste into Claude Code', 'md', `
Build /alternatives/[competitor] from content/alternatives.ts using the /vs template styles
in @LANDING.md section 21. Each page lists 5 tools with: who it suits, price (with the date I
checked it), engines included, one honest weakness. Factorie appears with the same format. Add
FAQPage JSON-LD with 4 questions per page and link each page from the footer "Compare" column.`),
      warn('Be fair or do not publish', 'Wrong competitor prices get screenshotted and posted. Date every price and fix it the day a vendor changes it.'),
    ],
    checklist: ['Check and date every competitor price', 'Ship the four /vs pages', ['Build the alternatives pages', 'copy:fac-in-vs-prompt'], 'Submit the sitemap in Search Console'],
  }),
  task({
    id: 'fac-in-youtube',
    title: 'Record six "how to show up in ChatGPT" videos',
    outcome: 'Six screen-recorded how-to videos that answer the exact questions your buyers search on YouTube, each ending with the free audit.',
    minutes: 120,
    xp: 60,
    blocks: [
      table(['Video title', 'What you show'], [
        ['How to see if ChatGPT recommends your brand (free)', 'Running the free audit live on a real brand'],
        ['Why ChatGPT recommends your competitor (and how to fix it)', 'Sources page: the 3 listicles the engines cite'],
        ['AEO vs SEO: what changed in 2026', 'Side by side: Google results vs ChatGPT answer for one query'],
        ['I tracked 25 buyer questions on 6 AI engines for 30 days', 'Your own Factorie dashboard and what moved'],
        ['How to get listed on the pages AI engines cite', 'Outreach to one cited listicle, start to finish'],
        ['Perplexity vs ChatGPT vs Gemini: who recommends what', 'Compare engines view on one prompt'],
      ]),
      steps(
        'Record with Screen Studio (or QuickTime plus a webcam). 6 to 10 minutes each. Show, do not slide.',
        'First 30 seconds: the question and the answer on screen. No intro.',
        'Description: the audit link with ?utm_source=youtube first, then chapters.',
        'Publish one a week. Post a 60-second cut of each on LinkedIn and X.',
      ),
      tip('Search intent beats views', 'A video with 400 views from marketers searching "how to rank in ChatGPT" can bring more trials than a 40,000-view video about AI in general.'),
    ],
    checklist: ['Pick the six titles', 'Record and publish the first video', 'Put the audit link first in every description', 'Schedule one video a week'],
  }),
  task({
    id: 'fac-in-linkedin',
    title: 'Post twice a week on LinkedIn from your data',
    outcome: 'A posting routine where every post is one real finding from Factorie\'s data, written for marketers.',
    minutes: 30,
    xp: 30,
    blocks: [
      code('fac-in-linkedin-posts', 'Five post templates', 'txt', `
1. The leaderboard
"I asked ChatGPT, Perplexity, Gemini, Claude, DeepSeek and Grok the 10 questions buyers ask
before choosing a CRM. Here is who they recommend (October 2026):" + the table as an image.

2. The surprise source
"62% of ChatGPT's answers about project management tools cited one of the same 4 pages.
None of them is a vendor's own site." + the 4 domains.

3. The before/after
"Our visibility on Perplexity went from 0 to 34 in 3 weeks. What we did:" + 3 bullet points.

4. The engine difference
"Same question, six engines, six different winners." + one screenshot of Compare engines.

5. The myth
"Adding llms.txt did not move our AI visibility at all in 30 days. Being on two cited listicles did."`),
      steps(
        'Post Tuesday and Thursday at 8:30am in your buyers\' time zone.',
        'Reply to every comment in the first hour.',
        'Each post ends with one line: "Free audit for your brand: link in the comments."',
      ),
    ],
    checklist: [['Copy the post templates', 'copy:fac-in-linkedin-posts'], 'Publish your first two posts', 'Reply to every comment within an hour'],
  }),
  task({
    id: 'fac-in-dogfood',
    title: 'Make Factorie the case study',
    outcome: 'Factorie tracks itself, you publish what moved its own AI visibility, and the landing page testimonials slot shows real numbers.',
    minutes: 30,
    xp: 35,
    blocks: [
      eli5('Eat your own cooking', 'The most believable proof is you using the product on yourself. If Factorie can get Factorie mentioned by ChatGPT, every marketer will want to know how.'),
      steps(
        'Add Factorie as a brand on your own account with 25 prompts like "best AI visibility tracking tool for startups".',
        'Every week, do the top recommendation it gives you. Log what you did and the score.',
        'After 6 weeks, write "How we took Factorie from 0 to N on ChatGPT" with the real chart.',
        'Put that chart in the landing page testimonials slot as the case study card until you have real customer quotes.',
      ),
      mistakes([
        { mistake: 'Publishing invented customer quotes.', fix: 'Never. Use your own numbers until a customer agrees to be quoted by name.' },
      ]),
    ],
    checklist: ['Track Factorie with 25 prompts', 'Act on one recommendation a week', 'Publish the six-week case study'],
  }),
]

/* ------------------------------------------------------------------ */
/* PAID                                                                */
/* ------------------------------------------------------------------ */

export const paid: Task[] = [
  task({
    id: 'fac-paid-ready',
    title: 'Check you have earned ads, then install tracking',
    outcome: 'You know your maximum cost per customer and every signup, trial and payment is tracked before you spend a dollar.',
    minutes: 30,
    xp: 35,
    blocks: [
      table(['Check', 'Pass when'], [
        ['Paying customers', '10 or more'],
        ['A message that converts', 'One cold email or post with 8%+ positive replies, or a page converting 4%+ to trial'],
        ['Maximum cost per customer', 'LTV ÷ 3. At $99, about 80% margin and 5% monthly churn: $99 x 0.8 ÷ 0.05 ÷ 3 = about $528'],
        ['Budget', 'At least $20 a day for 14 days'],
      ]),
      p('Fail any check: only run the retargeting test (third task) or keep doing outbound. Ads pour fuel on a fire that is already burning.'),
      prompt('fac-paid-ready-prompt', 'Paste into Claude Code', `
Add Google Ads tag and Meta Pixel to the marketing site and app behind a cookie consent banner.
Fire: lead on /audit submit, sign_up on account created, start_trial when subscriptions turns
'trialing' (server side from the Stripe webhook, with an event_id), and purchase on the first
invoice.paid (server side via the Meta Conversions API and Google Ads offline conversions, with
value and currency). Mirror every event into PostHog. List the env vars, plan first, then wait.
`),
    ],
    checklist: ['Pass the four checks with real numbers', 'Work out your maximum cost per customer', ['Install tracking', 'copy:fac-paid-ready-prompt']],
  }),
  task({
    id: 'fac-paid-search',
    title: 'Run a $20 a day Google Ads test on competitor and category searches',
    outcome: 'A two-week search campaign on the highest-intent keywords, with clear kill rules.',
    minutes: 45,
    xp: 45,
    blocks: [
      eli5('Why search ads first', 'Someone typing "Profound alternative" into Google is already shopping. You only pay when they click. That is the closest thing to buying a warm lead.'),
      table(['Ad group', 'Keywords (phrase match)', 'Landing page'], [
        ['Competitors', '"profound alternative", "otterly alternative", "peec ai alternative", "searchable alternative", "profound pricing"', '/vs/[competitor]'],
        ['Category', '"ai visibility tool", "aeo tool", "geo tool", "track brand in chatgpt", "chatgpt brand mentions"', '/'],
        ['Problem', '"how to rank in chatgpt", "get mentioned by chatgpt", "show up in perplexity"', '/audit'],
      ]),
      code('fac-paid-search-ads', 'Responsive search ad copy', 'txt', `
Headlines (30 characters max each):
See Where AI Recommends You
ChatGPT, Perplexity, Gemini
6 AI Engines From $99/mo
Free AI Visibility Audit
Who AI Recommends Instead
Track 25 Buyer Questions

Descriptions (90 characters max each):
Your visibility score on 6 AI engines, every week. Real answers, sources and fixes.
Run a free audit in 3 minutes, then start a 7-day trial. All engines included.`),
      table(['Rule', 'Number'], [
        ['Budget', '$20 a day, 14 days = $280'],
        ['Kill a keyword', '$60 spent and no trial or audit'],
        ['Kill the campaign', 'Cost per trial over $150 after $280'],
        ['Scale', 'Cost per paid customer under $528 two weeks running: raise budget 20% a week'],
      ]),
      mistakes([
        { mistake: 'Broad match on "ai tools".', fix: 'You will pay for students and job seekers. Phrase match only, and add negatives: free, course, jobs, salary, chatgpt login.' },
        { mistake: 'Judging on clicks.', fix: 'Judge on trials and paid customers. A cheap click that never signs up is expensive.' },
      ]),
    ],
    checklist: ['Create the three ad groups', ['Copy the ad text', 'copy:fac-paid-search-ads'], 'Set $20 a day and the negative keywords', 'Review on day 7 and day 14 against the kill rules'],
  }),
  task({
    id: 'fac-paid-retarget',
    title: 'Retarget audit visitors on LinkedIn and Meta',
    outcome: 'People who ran a free audit but did not start a trial see one clear ad for 14 days.',
    minutes: 30,
    xp: 35,
    blocks: [
      p('The audit page is your warmest audience: they have seen their own score. A small retargeting campaign reminds them while it still stings.'),
      steps(
        'Meta: Events Manager > create a Custom Audience of people who visited /audit/ in the last 14 days, excluding /app visitors.',
        'LinkedIn: Campaign Manager > Matched audiences > Website > /audit/ visitors (needs 300 to build).',
        'One ad per platform, $10 a day each, for 14 days ($280 total).',
      ),
      code('fac-paid-retarget-ad', 'Retargeting ad', 'txt', `
Image: the audit result page with a score of 18 and "Otterly: 11 mentions" visible.
Headline: Your AI visibility score was 18. Here is how to move it.
Text: Factorie checks the questions your buyers ask on 6 AI engines every week, shows who gets
recommended instead, and tells you the next page to write. 7 days free.
Button: Start free trial`),
      table(['Rule', 'Number'], [
        ['Kill', 'No trial after $140 on a platform'],
        ['Keep', 'Cost per trial under $80'],
      ]),
    ],
    checklist: ['Build the audit visitor audiences', ['Copy the retargeting ad', 'copy:fac-paid-retarget-ad'], 'Run for 14 days at $10 a day per platform'],
  }),
]

/* ------------------------------------------------------------------ */
/* LAUNCH                                                              */
/* ------------------------------------------------------------------ */

export const launchTasks: Task[] = [
  task({
    id: 'fac-launch-sweep',
    title: 'Factorie pre-launch sweep',
    outcome: 'Every price, slug, limit and page is checked on production before real customers arrive.',
    minutes: 45,
    xp: 45,
    blocks: [
      code('fac-launch-sweep-sql', 'SQL Editor on production', 'sql', `
-- Engines: every slug checked this week, all enabled
select key, openrouter_model, is_enabled from public.engines order by sort;
-- Plans match the pricing page
select id, prompts, engines, rechecks_per_day, monthly_cost_cap_usd from public.plans;
-- Six cron jobs active
select jobname, schedule, active from cron.job order by jobname;
-- Kill switch is off and the global cap is set
select key, value from public.app_settings;`),
      steps(
        'Open each engine slug on openrouter.ai one last time. Swap any that were retired.',
        'Check every competitor price on the landing page and /vs pages against their live pricing pages. No [verify] text anywhere: search the codebase for "verify" and "Ask vendor".',
        'Delete /app/dev/components.',
        'Raise the OpenRouter key limit to your first month\'s budget (about $6 per expected customer plus $20).',
        'Switch Firecrawl to Hobby and Supabase to Pro.',
        'Run the end-to-end test (Backend phase) once on production with a real card, then refund yourself.',
        'Run Lighthouse on / and /audit at mobile size: 90+ on every score.',
      ),
      mistakes([
        { mistake: 'Production still uses test Stripe prices.', fix: 'Checkout uses price ids from env vars: set the live ones in Vercel env and redeploy.' },
        { mistake: 'The cron jobs point at your dev project.', fix: 'The Vault project_url on production must be the production ref. Check with select name from vault.decrypted_secrets.' },
      ]),
    ],
    checklist: [['Run the production SQL checks', 'copy:fac-launch-sweep-sql'], 'Recheck every slug and competitor price', 'Delete the dev components page', 'Run the end-to-end test on production'],
  }),
  task({
    id: 'fac-launch-day',
    title: 'Launch with the free audit as the hook',
    outcome: 'A Product Hunt launch and a LinkedIn post where everyone can run a free audit, with 100+ audits in the first week.',
    minutes: 60,
    xp: 50,
    blocks: [
      steps(
        'Launch on Product Hunt on a Sunday (less competition). Tagline: "See where ChatGPT and 5 other AI engines recommend you". First comment: why you built it plus your own case study chart.',
        'Make the launch offer the free audit, not a discount: "Run a free audit, no signup".',
        'Post on LinkedIn the same morning with your leaderboard for your own category.',
        'Email every outbound "later" reply: "We launched today. Your fresh audit: [link]".',
        'Watch app_settings audit_daily_cap: raise it to 150 for launch day (about $16 of API cost).',
      ),
      code('fac-launch-day-post', 'Launch post', 'txt', `
Today I launched Factorie.

Your buyers ask ChatGPT "what is the best X for Y" before they ever visit your site. The answer
names 3 to 7 brands. Factorie asks those questions on ChatGPT, Perplexity, Gemini, Claude,
DeepSeek and Grok every week and shows you whether you are named, who is named instead, and
the pages the engines read.

Run a free audit for your brand (no signup): factorie.io/audit

I will reply to every comment with what I see in your result.`),
    ],
    checklist: ['Schedule the Product Hunt launch for a Sunday', ['Copy the launch post', 'copy:fac-launch-day-post'], 'Raise the audit cap for launch day', 'Reply to every comment with their result'],
  }),
]
