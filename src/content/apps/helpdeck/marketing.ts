// Helpdeck marketing: outbound, inbound and paid tasks with scripts, numbers and kill rules.
import type { Task } from '../../types'
import { code, eli5, p, prompt, steps, table, task, tip, warn } from './helpers'

export const outbound: Task[] = [
  task({
    id: 'hd-mk-out-loom',
    title: 'Send 30 founders a bot already trained on their docs',
    outcome: '30 personalised demos that show each founder their own site answering questions.',
    minutes: 120,
    xp: 70,
    blocks: [
      p('Nothing sells Helpdeck like a founder seeing their own docs answer a question. You crawl their site before you email them.'),
      steps(
        'Find 30 small SaaS companies with a docs or help site: browse Product Hunt launches from the last 6 months, or search Google for `"help centre" OR "docs" site:*.io pricing` style queries.',
        'Create a bot in your own account for each, crawl their docs (limit 50 pages).',
        'Add your own app domain to allowed domains and record a 60 second Loom asking it 3 real questions from their docs.',
        'Email the founder with the template below.',
      ),
      code('hd-mk-out-loom-email', 'cold-email.txt', 'txt', `
Subject: I trained a support bot on {company}'s docs

Hi {first_name},

I pointed Helpdeck at {docs_url} this morning. Here it is answering three questions your customers probably ask every week: {loom_link}

It cites the page each answer came from, and when it is not sure it hands off to your inbox instead of guessing.

Want me to switch it on for your site? One script tag, 7 days free.

{your_name}
`),
      table(['Number to expect', 'Out of 30'], [
        ['Loom opened', '12 to 18'],
        ['Replies', '4 to 8'],
        ['Trials started', '2 to 4'],
        ['Paying after 7 days', '1 to 2 ($49 to $98 MRR)'],
      ]),
      tip('Watch your credits', '30 sites at 50 pages is 1,500 Firecrawl credits. Upgrade to the Hobby plan for the month you do this, it is cheaper than one customer.'),
      warn('Kill rule', 'If 30 Looms get fewer than 3 replies, the problem is the list, not the email. Switch to companies with a public "Contact support" email on their docs site (they clearly feel the pain) before sending more.'),
    ],
    checklist: [
      'List 30 SaaS companies with docs sites',
      'Crawl each and record a 60 second Loom',
      ['Copy the email template', 'copy:hd-mk-out-loom-email'],
      'Send all 30 emails',
    ],
  }),
  task({
    id: 'hd-mk-out-agencies',
    title: 'Pitch web agencies a resell deal',
    outcome: 'One or two agencies who install Helpdeck on many client sites.',
    minutes: 60,
    xp: 45,
    blocks: [
      p('Webflow and WordPress agencies build sites for clients who all want "a chatbot". Each agency can bring you 5 to 20 bots.'),
      steps(
        'Search the Webflow Experts directory and Clutch for agencies with 2 to 20 staff.',
        'Pick 20. Email the founder with the message below.',
        'Offer 30 percent recurring commission with a Stripe promotion code per agency (Stripe → Products → Coupons → create, then a promotion code).',
      ),
      code('hd-mk-out-agencies-email', 'agency-email.txt', 'txt', `
Subject: an AI chat add-on for your client sites

Hi {first_name},

Clients keep asking agencies for "an AI chatbot". Helpdeck is one script tag: it learns the client's site, answers with sources, and emails them when it is unsure.

I'll give your clients their own discount code and pay you 30% of every month they stay. Want a demo bot on one of your client sites to show them?

{your_name}
`),
      code('hd-mk-out-agencies-followup', 'agency-followup.txt', 'txt', `
Subject: re: an AI chat add-on for your client sites

Hi {first_name}, I set one up on {client_site} so you can see it: {demo_link}

It took 4 minutes. If a client says yes, you add one line in Webflow and send me the invoice details for your 30%.

{your_name}
`),
      warn('Kill rule', 'If 20 agencies give zero replies after the follow-up, stop. Agencies only move when one of their clients asks. Come back once you have 5 paying customers to quote.'),
    ],
    checklist: [
      'Find 20 small web agencies',
      ['Copy the agency email', 'copy:hd-mk-out-agencies-email'],
      'Send all 20 emails',
      ['Send the follow-up with a demo on a client site', 'copy:hd-mk-out-agencies-followup'],
    ],
  }),
  task({
    id: 'hd-mk-out-gaps',
    title: 'Email founders the questions their docs miss',
    outcome: '25 emails that open with three real customer questions the founder\'s docs do not answer.',
    minutes: 90,
    xp: 55,
    blocks: [
      eli5('Why this works', 'Founders ignore pitches but read anything about their own customers. If you show them three questions people asked in public that their docs cannot answer, you have proved you understand their support pain before you mention a product.'),
      steps(
        'Pick 25 SaaS products with a public community: a subreddit, a GitHub Issues page, a community forum or a Discord with a #help channel.',
        'For each, collect 3 questions from the last 60 days that got no answer, or an answer from staff that is not in the docs. Paste each into your own Helpdeck test bot trained on their docs.',
        'Keep the ones where the bot says "I\'m not sure". Those are their docs gaps.',
        'Send the email below. No Loom needed.',
      ),
      code('hd-mk-out-gaps-email', 'gaps-email.txt', 'txt', `
Subject: 3 questions your docs can't answer yet

Hi {first_name},

I read through {community} this week. These came up and your docs don't cover them:

1. "{question_1}"
2. "{question_2}"
3. "{question_3}"

I build Helpdeck, a chat widget that answers from your docs and keeps a list like this for you automatically, ranked by how often each one is asked.

Happy to send the full list (I found {n}). No pitch beyond that.

{your_name}
`),
      code('hd-mk-out-gaps-reply', 'when-they-reply.txt', 'txt', `
Thanks {first_name}. Full list attached.

If you want to see what your customers would get today, here is a bot trained on {docs_url}: {demo_link}
It says "not sure" on exactly these questions, then emails you. 7 days free if you want it on your site.
`),
      table(['Target', 'Number'], [
        ['Emails sent', '25'],
        ['Reply rate to expect', '20 to 30% (5 to 8)'],
        ['Trials', '2 to 3'],
        ['Time per email', 'about 3 minutes once you have a routine'],
      ]),
      warn('Kill rule', 'Under 3 replies from 25: your questions are too generic. Only use questions that mention a product feature by name.'),
    ],
    checklist: [
      'List 25 SaaS products with a public help community',
      'Collect 3 unanswered questions for each',
      ['Copy the gaps email', 'copy:hd-mk-out-gaps-email'],
      'Send all 25 emails',
      ['Reply with the full list and a demo link', 'copy:hd-mk-out-gaps-reply'],
    ],
  }),
  task({
    id: 'hd-mk-out-hiring',
    title: 'DM founders who are hiring a support person',
    outcome: '40 LinkedIn messages to companies that recently told the world they have a support problem.',
    minutes: 60,
    xp: 45,
    blocks: [
      p('A job post for "Customer Support Specialist" at a 5 to 30 person company means support volume is hurting right now. Helpdeck will not replace the hire, but it can halve the repeat questions that person would answer.'),
      steps(
        'LinkedIn → Jobs → search "customer support" → filters: Company size 2 to 50, Date posted past month.',
        'Open each company, check they have docs or a help centre, find the founder or head of ops.',
        'Send a connection request with the note below (300 characters max). After they accept, send the follow-up.',
        'Track each one in a simple sheet: name, company, sent date, accepted, replied, trial.',
      ),
      code('hd-mk-out-hiring-note', 'linkedin-note.txt', 'txt', `
Hi {first_name}, saw you're hiring for support at {company}. I built a tool that answers the repeat questions from your docs so your new hire starts on the hard ones. Happy to show it on your help centre, no strings.
`),
      code('hd-mk-out-hiring-followup', 'linkedin-followup.txt', 'txt', `
Thanks for connecting. I trained it on {docs_url} so you can try it: {demo_link}

Ask it the 3 questions you get most. When it doesn't know, it hands the chat to your inbox with reply-to set to the customer.

If it saves your new hire a few hours a week, it's $49/month.
`),
      warn('Kill rule', 'If fewer than 15 of 40 accept, your profile is the problem: add a headline "Building Helpdeck: AI support from your own docs" and a banner with a screenshot, then try 20 more.'),
    ],
    checklist: [
      'Find 40 small companies hiring for support',
      ['Copy the connection note', 'copy:hd-mk-out-hiring-note'],
      ['Send the follow-up with a demo link to everyone who accepts', 'copy:hd-mk-out-hiring-followup'],
      'Log every message in your tracking sheet',
    ],
  }),
  task({
    id: 'hd-mk-out-sequence',
    title: 'Run a 3-step follow-up on every cold email',
    outcome: 'A follow-up routine that roughly doubles replies from every outbound list you send.',
    minutes: 30,
    xp: 30,
    blocks: [
      eli5('Why follow up?', 'Most replies come from the second or third email, not the first. People are busy, not uninterested. A short, polite nudge on day 3 and day 7 is normal.'),
      code('hd-mk-out-sequence-emails', 'follow-ups.txt', 'txt', `
DAY 3
Subject: re: {original subject}
Hi {first_name}, quick nudge in case this got buried. The bot trained on your docs is still here: {demo_link}

DAY 7
Subject: re: {original subject}
Hi {first_name}, one number that might help: if a ticket takes 6 minutes and the bot handles 30 a month, that is 3 hours back for $49. Worth a 10 minute look?

DAY 14 (last one)
Subject: closing the loop
Hi {first_name}, I'll stop here. If support questions ever pile up, reply "bot" and I'll set it up for you in 10 minutes.
`),
      steps(
        'In Gmail, save each step as a template (Settings → Advanced → Templates → Enable).',
        'Every morning, filter your Sent folder for emails from 3, 7 and 14 days ago with no reply and send the right step.',
        'Stop the sequence the moment someone replies, even with "no thanks".',
      ),
      table(['Step', 'Share of all replies (typical)'], [
        ['First email', 'about 40%'],
        ['Day 3', 'about 25%'],
        ['Day 7', 'about 20%'],
        ['Day 14', 'about 15%'],
      ]),
      warn('Kill rule', 'Two "please stop" replies in one batch means your list is too broad. Narrow it before the next batch.'),
    ],
    checklist: [
      ['Copy the three follow-ups', 'copy:hd-mk-out-sequence-emails'],
      'Save them as Gmail templates',
      'Send today\'s follow-ups',
    ],
  }),
  task({
    id: 'hd-mk-out-shops',
    title: 'Pitch 30 online shops with a big FAQ page',
    outcome: '30 shop owners who get a bot that answers shipping, returns and sizing questions from their own FAQ.',
    minutes: 90,
    xp: 50,
    blocks: [
      p('Shops answer the same five questions all day: shipping time, returns, sizing, order changes, discount codes. A long FAQ page is a sign they already feel it.'),
      steps(
        'Search Google for `"shipping" "returns" "FAQ" site:myshopify.com` or browse Shopify stores in one niche you know (coffee, skincare, outdoor gear).',
        'Keep shops whose FAQ or help page has 15 or more questions.',
        'Crawl their FAQ, shipping and returns pages into a demo bot (limit 20 pages).',
        'Ask it "How long does shipping take to the UK?" and screenshot the answer with its source chip.',
        'Email the owner (often on the Contact page) with the screenshot.',
      ),
      code('hd-mk-out-shops-email', 'shop-email.txt', 'txt', `
Subject: your FAQ, answering customers at 2am

Hi {first_name},

I trained a chat bubble on {shop}'s FAQ and shipping pages. Screenshot below: it answered "How long does shipping take to the UK?" with a link to your shipping page.

Questions it can't answer (like "where is my order?") go straight to your inbox with the customer's email as reply-to.

It installs in Shopify in 2 minutes (Online Store, Themes, Edit code, one line). Want me to send you the line? 7 days free, then $49/month.

{your_name}
`),
      warn('Do not promise order lookups', 'Helpdeck v1 cannot see orders. Say so if asked: "It answers from your pages and hands order questions to you."'),
      warn('Kill rule', 'If shops reply "we use Shopify Inbox / Gorgias already" more than 5 times, drop shops over 20 staff and target owner-run stores only.'),
    ],
    checklist: [
      'Find 30 shops with a 15+ question FAQ',
      'Crawl each FAQ and screenshot one answer',
      ['Copy the shop email', 'copy:hd-mk-out-shops-email'],
      'Send all 30 emails',
    ],
  }),
]

export const inbound: Task[] = [
  task({
    id: 'hd-mk-in-demo',
    title: 'Put a live "try it on your site" box on the landing page',
    outcome: 'Visitors paste their URL and talk to their own bot before signing up.',
    minutes: 60,
    xp: 50,
    blocks: [
      eli5('Why let strangers try it?', 'People believe what they see. If a visitor watches the bot answer a question about their own business, signing up feels obvious.'),
      prompt('hd-mk-in-demo-prompt', 'Paste into Claude Code', `
Wire the "Try it on your site" section of the landing page (@LANDING.md section 6) to the hd-demo edge
function (@PRD.md section 9.6):
1. Form: URL input + email input + "Train my demo bot". POST { action: 'start', url, email }.
2. Poll { action: 'status', demoId } every 2 seconds. Tick the four steps in order (Reading your pages,
   Splitting into sections, Learning them, Ready) and show "N pages read". Stop polling at ready, failed
   or after 3 minutes.
3. Ready: render ChatPanel inline with the returned token, brand colour and suggestedQuestions.
4. Errors and the limit message exactly as @LANDING.md section 6.
5. "Keep this bot: start free trial" goes to /signup?demo=<demoId>. After signup, onboarding calls a server
   action that runs rpc('claim_demo_bot', { p_demo, p_user }) with the admin client and opens Sources for
   that bot. If it returns null (expired or bot limit), continue normal onboarding.
6. Fire demo_submit, demo_ready (pages, seconds), demo_question and demo_keep_click.
7. Build /demo/[demoId] from @DESIGN.md section 16.
The 48 hour cleanup is already in hd-digest daily.`),
      steps(
        'Deploy.',
        'Test it with three different websites.',
        'Check the daily cap works by setting DEMO_DAILY_CAP to 2 in Supabase secrets and trying a third. Set it back to 50.',
        'Sign up from "Keep this bot" and check the bot is in your Sources.',
      ),
      code('hd-mk-in-demo-sql', 'Supabase SQL Editor: demo funnel', 'sql', `
select date_trunc('day', created_at) as day, count(*) as demos,
       count(*) filter (where status in ('ready', 'claimed', 'expired')) as ready,
       count(*) filter (where status = 'claimed') as claimed
from public.demo_sessions group by 1 order by 1 desc limit 14;
`),
      p('**Number to watch:** claimed / ready. Under 10 percent after 50 demos means the chat result is not convincing: change the suggested questions first.'),
    ],
    checklist: [
      ['Copy the demo box prompt', 'copy:hd-mk-in-demo-prompt'],
      'Test the demo with three sites',
      'Confirm the daily cap stops extra demos',
      ['Run the demo funnel SQL weekly', 'copy:hd-mk-in-demo-sql'],
    ],
  }),
  task({
    id: 'hd-mk-in-build-public',
    title: 'Post the deflection numbers every week',
    outcome: 'A weekly post on X or LinkedIn with real numbers that pulls in founders.',
    minutes: 30,
    xp: 30,
    blocks: [
      p('Founders love numbers. Each week, share how many questions Helpdeck answered and how many it handed off, across all customers or your own site.'),
      prompt('hd-mk-in-build-public-prompt', 'Paste into Claude Code', `
Using the Supabase MCP, run a query for the last 7 days: total assistant messages, percent confident, number of handoffs, and the 5 most common low-confidence questions (anonymised, no emails).
Write me a 6 line LinkedIn post in plain words with those numbers and one lesson. No hashtags, no emojis.`),
      code('hd-mk-in-build-public-example', 'post-example.txt', 'txt', `
Helpdeck, week 6:
1,912 customer questions answered by the bot.
84% answered from the docs with a source link.
112 handed to a human by email.
Most common gap: "Can I change my billing date?" Nobody had documented it.
Lesson: the bot's "I don't know" list is the best docs to-do list you will ever get.
`),
      tip('Same time every week', 'Post on the same day and hour (Tuesday 9am in your audience\'s time zone works well for B2B). Regular numbers build trust faster than one viral post.'),
    ],
    checklist: [
      ['Copy the stats prompt', 'copy:hd-mk-in-build-public-prompt'],
      'Post this week\'s numbers',
    ],
  }),
  task({
    id: 'hd-mk-in-install-guides',
    title: 'Publish install guides that rank on Google',
    outcome: 'Five short pages that catch people searching "add AI chatbot to Webflow" and similar.',
    minutes: 90,
    xp: 50,
    blocks: [
      eli5('Why install guides?', 'People search for exactly how to add a chatbot to their website builder. A short, honest page that shows the steps, with Helpdeck as the example, ranks well because it answers that exact question.'),
      prompt('hd-mk-in-install-guides-prompt', 'Paste into Claude Code', `
Build /install/[platform] for webflow, wordpress, shopify, framer and html (static generation).
Each page:
- Title (max 60 chars): "How to add an AI chatbot to <Platform> (trained on your docs)".
- Meta description (max 155 chars) naming the platform and "one line of code".
- H1, a 2 sentence intro, numbered steps with the exact menu names for that platform (from @DESIGN.md
  section 9.2), the snippet in a SnippetBox, 3 FAQ items specific to the platform with FAQPage JSON-LD,
  a "Try it on your site" box linking to /#try, and links to the other 4 guides.
- One screenshot placeholder per step with alt text. I will add real screenshots.
Add all five to sitemap.xml. Fire cta_click with location install_<platform>.`),
      steps(
        'Take real screenshots for each step on a free Webflow, WordPress.com or Shopify trial store, and replace the placeholders.',
        'Google Search Console → URL inspection → request indexing for each page.',
        'Check positions monthly in Search Console → Performance → filter by page.',
      ),
      table(['Search phrase to target', 'Page'], [
        ['add ai chatbot to webflow', '/install/webflow'],
        ['wordpress ai chatbot trained on my content', '/install/wordpress'],
        ['shopify faq chatbot', '/install/shopify'],
        ['framer chatbot widget', '/install/framer'],
        ['add chatbot to website html', '/install/html'],
      ]),
      warn('Kill rule', 'After 90 days, any guide with under 50 impressions a month gets rewritten around a different phrase from the Search Console queries list.'),
    ],
    checklist: [
      ['Copy the install guides prompt', 'copy:hd-mk-in-install-guides-prompt'],
      'Add real screenshots to all five guides',
      'Request indexing in Search Console',
    ],
  }),
  task({
    id: 'hd-mk-in-alternatives',
    title: 'Write honest "alternative to" pages',
    outcome: 'Pages that catch people already shopping for Intercom Fin, Chatbase or Zendesk AI and looking for something simpler.',
    minutes: 90,
    xp: 45,
    blocks: [
      p('"Intercom Fin alternative" and "Chatbase alternative" are searched by people who are ready to buy and have a budget. A fair comparison page wins their trust.'),
      prompt('hd-mk-in-alternatives-prompt', 'Paste into Claude Code', `
Build /alternatives/[slug] for intercom-fin, chatbase and zendesk-ai.
Each page: H1 "<Competitor> alternative for small teams", who the competitor is great for (be fair, 2
sentences), who Helpdeck is for, a comparison table using the same rows as @LANDING.md section 10, a
pricing section that says "Checked <Month Year>" and links to the competitor's pricing page, 3 FAQ items,
and a "Try it on your site" box. Every competitor fact I have not confirmed stays as [verify] in the
source so I fill it in by hand. No claims that a competitor "makes things up".`),
      steps(
        'Open each competitor\'s pricing page and fill in every [verify] cell yourself. Write the month you checked.',
        'Publish and request indexing in Search Console.',
        'Re-check competitor prices every 3 months and update the "Checked" date.',
      ),
      warn('Only claim what you can show', 'If you cannot find a fact on the competitor\'s own site, write "Varies" or drop the row. An unfair comparison page loses trust and invites complaints.'),
    ],
    checklist: [
      ['Copy the alternatives prompt', 'copy:hd-mk-in-alternatives-prompt'],
      'Fill every [verify] cell from the competitor sites',
      'Publish all three pages',
    ],
  }),
  task({
    id: 'hd-mk-in-footer-loop',
    title: 'Turn "Powered by Helpdeck" into a referral loop',
    outcome: 'Every Starter widget sends curious visitors to a page made for them, and customers earn a free month per referral.',
    minutes: 45,
    xp: 40,
    blocks: [
      eli5('The footer is free advertising', 'Every Starter customer\'s widget says "Powered by Helpdeck". The people who click it are often founders themselves, who watched the bot help them a moment ago. Send them to a page that says "you used it", not the generic homepage.'),
      prompt('hd-mk-in-footer-loop-prompt', 'Paste into Claude Code', `
1. The widget footer link goes to APP_URL/?ref=widget&b=<botId>. On the landing page, if ref=widget, swap
   the hero eyebrow to "You used Helpdeck on <host>" (look up last_seen_host for the bot through the
   public config route; never show other data) and scroll-highlight the demo box.
2. Store ref and b in a first-party cookie for 30 days and save them on the profile at signup
   (profiles.referred_by_bot uuid, add the column with a small migration and a read-only column grant).
3. When a referred user's first payment succeeds (invoice.paid in the Stripe webhook), give the referring
   workspace owner a one month credit: Stripe customer balance transaction of -4900 cents (Starter) or
   -12900 (Growth), once per referred user (dedupe in stripe_events style with key 'referral:<user>').
4. Settings → a "Refer a friend" box with the owner's referral link APP_URL/?ref=<workspace short id>.
5. Track signup_complete with ref.`),
      table(['Number to watch', 'Healthy'], [
        ['Footer clicks per 1,000 widget opens', '3 to 10'],
        ['Signups from ref=widget per month', '1 per 10 Starter customers'],
      ]),
    ],
    checklist: [
      ['Copy the referral loop prompt', 'copy:hd-mk-in-footer-loop-prompt'],
      'Click your own widget footer and see the custom hero',
      'Check a test referral gives a credit in Stripe test mode',
    ],
  }),
  task({
    id: 'hd-mk-in-launch',
    title: 'Launch on Product Hunt and list in AI directories',
    outcome: 'A launch day with a live demo front and centre, and listings that keep sending trials for months.',
    minutes: 120,
    xp: 55,
    blocks: [
      steps(
        'Product Hunt: create a maker account a week before. Prepare a 60 second video (the demo video from LANDING section 7), 4 screenshots and the first comment below.',
        'Launch on a Tuesday to Thursday at 00:01 Pacific. Install Helpdeck on the Product Hunt landing link with ?ref=producthunt.',
        'Reply to every comment within an hour on launch day.',
        'The week after, list Helpdeck on There\'s An AI For That, Futurepedia, SaaSHub and AlternativeTo (as an alternative to Intercom and Chatbase). Use the same 160 character description everywhere.',
      ),
      code('hd-mk-in-launch-comment', 'product-hunt-first-comment.txt', 'txt', `
Hi Product Hunt! I'm {your_name}, I built Helpdeck.

I kept answering the same 30 support questions by email, while the answers sat in our docs. Big support tools wanted weeks of setup and charge per AI answer.

Helpdeck: paste your docs URL, get a chat bubble that answers with a link to the page it used. When it's not sure, it says so and emails you the chat with reply-to set to the customer.

Try it on your own site without signing up: {url}/#try
Launch week: 7 days free on every plan, from $49/month.

What question would you ask it first?
`),
      code('hd-mk-in-launch-desc', 'directory-description.txt', 'txt', `
Helpdeck: an AI support chat widget trained on your docs. Answers with sources, says "not sure" instead of guessing, and hands off to your inbox. From $49/month.
`),
      warn('Kill rule', 'Directories that send zero signups in 60 days (check utm_source in DataFast or PostHog) are not worth updating. Keep the top two.'),
    ],
    checklist: [
      'Prepare the video, screenshots and first comment',
      ['Copy the first comment', 'copy:hd-mk-in-launch-comment'],
      'Launch and reply to every comment on the day',
      ['List on four directories with the same description', 'copy:hd-mk-in-launch-desc'],
    ],
  }),
]

export const paid: Task[] = [
  task({
    id: 'hd-mk-paid-google',
    title: 'Run a $150 Google Search test on "AI support chatbot"',
    outcome: 'A clear answer on whether high-intent search brings trials under $40 each.',
    minutes: 50,
    xp: 45,
    blocks: [
      warn('Search ads can burn money fast', 'Use exact and phrase match only, set a $150 total budget, and stop if there are no trials after 300 clicks.'),
      steps(
        'Go to ads.google.com → New campaign → Website traffic → Search. Skip the Smart campaign offer by switching to Expert mode.',
        'Keywords (phrase match): "ai chatbot for website", "chatbot trained on docs", "intercom alternative", "ai customer support for small business".',
        'Negative keywords: free, open source, jobs, course, tutorial.',
        'Paste the ad below. Daily budget $15 for 10 days.',
        'Add your Stripe trial start as a conversion (Google Ads → Goals → Conversions → Website, fire it on /app after checkout).',
      ),
      code('hd-mk-paid-google-ad', 'search-ad.txt', 'txt', `
Headline 1: AI Support Trained On Your Docs
Headline 2: Live On Your Site In 10 Minutes
Headline 3: $49/mo. 7-Day Free Trial
Description 1: Paste your URL, get a chat widget that answers with sources and emails you when unsure.
Description 2: One script tag. Works on Webflow, WordPress, Shopify and any HTML site.
`),
      table(['Rule', 'Action'], [
        ['Cost per trial under $40', 'Keep going, raise to $25/day'],
        ['Cost per trial $40 to $80', 'Pause the worst keyword, test a new headline'],
        ['No trial after 300 clicks or $150', 'Stop. Search is not your channel yet'],
        ['A keyword with 50 clicks and 0 demo_submit', 'Add it as a negative'],
      ]),
    ],
    checklist: [
      'Create a Search campaign in Expert mode',
      ['Copy the ad text', 'copy:hd-mk-paid-google-ad'],
      'Set up the trial start conversion',
      'Launch with a $150 total budget',
    ],
  }),
  task({
    id: 'hd-mk-paid-retarget',
    title: 'Retarget demo users who did not sign up ($100)',
    outcome: 'A small LinkedIn or Meta campaign that brings back people who already trained a demo bot.',
    minutes: 45,
    xp: 40,
    blocks: [
      eli5('What retargeting is', 'Someone tried your demo, liked it, then got distracted. Retargeting shows them an ad later with a reminder. They already know you, so it costs far less per trial than ads to strangers.'),
      steps(
        'Meta: Events Manager → Connect data → Web → install the Meta Pixel (or LinkedIn: Campaign Manager → Analyze → Insight Tag).',
        'Fire a custom event DemoReady from the landing page when demo_ready fires.',
        'Create an audience: people who fired DemoReady in the last 14 days, excluding everyone who visited /app.',
        'Budget $10/day for 10 days. Use the ad below with a screenshot of a demo chat.',
      ),
      code('hd-mk-paid-retarget-ad', 'retargeting-ad.txt', 'txt', `
Primary text: Your demo bot is still here. It read your docs and answered with sources. Keep it: 7 days free, then $49/month.
Headline: Keep the bot you trained
Button: Sign up
Link: {url}/signup?ref=retarget
`),
      warn('Kill rule', 'If the audience is under 300 people, wait: the platform will not deliver. If $100 brings no trial, stop and spend on outbound instead.'),
    ],
    checklist: [
      'Install the pixel or insight tag',
      'Create the 14 day demo audience',
      ['Copy the retargeting ad', 'copy:hd-mk-paid-retarget-ad'],
      'Launch at $10 a day for 10 days',
    ],
  }),
  task({
    id: 'hd-mk-paid-newsletter',
    title: 'Sponsor one SaaS founder newsletter',
    outcome: 'One tested newsletter slot in front of thousands of founders, with a clear cost per trial.',
    minutes: 60,
    xp: 40,
    blocks: [
      p('Small founder newsletters (5,000 to 30,000 readers) are full of exactly your buyers. One slot usually costs $150 to $600 [verify with each newsletter\'s sponsor page].'),
      steps(
        'Find 5 newsletters for bootstrapped or indie SaaS founders. Look for a "Sponsor" or "Advertise" link in the footer.',
        'Ask each for: readers, open rate, past sponsor click numbers, and the price of one slot.',
        'Pick the one with the lowest price per 1,000 opens (price / (readers x open rate) x 1,000). Under $40 per 1,000 opens is good.',
        'Send them the copy below with a tracking link {url}/?utm_source=<newsletter>&utm_medium=sponsor.',
      ),
      code('hd-mk-paid-newsletter-copy', 'newsletter-ad.txt', 'txt', `
Helpdeck: support answers from your own docs.
Paste your docs URL and get a chat bubble that answers customers with a link to the page it used. Not sure? It emails you the chat. Try it on your own site in 60 seconds, no signup: {url}/#try
From $49/month, 7 days free.
`),
      table(['Result', 'Decision'], [
        ['Cost per trial under $50', 'Book 2 more issues'],
        ['Cost per trial $50 to $150', 'Try a different newsletter once'],
        ['Zero trials', 'Stop paid newsletters for now'],
      ]),
    ],
    checklist: [
      'Shortlist 5 founder newsletters and get their numbers',
      ['Copy the sponsor text', 'copy:hd-mk-paid-newsletter-copy'],
      'Book one slot with a tracking link',
      'Write down the cost per trial afterwards',
    ],
  }),
  task({
    id: 'hd-mk-paid-reddit',
    title: 'Test $100 of Reddit ads in founder communities',
    outcome: 'A cheap test of whether r/SaaS and r/startups style audiences start trials.',
    minutes: 40,
    xp: 35,
    blocks: [
      steps(
        'ads.reddit.com → Create campaign → Traffic objective.',
        'Targeting: communities r/SaaS, r/startups, r/Entrepreneur, r/shopify, r/webflow. Location: US, UK, Canada, Australia.',
        'Budget $10 a day for 10 days. Turn comments ON and answer every one (Reddit users ask, and answers build trust).',
        'Use the ad below with a GIF of the demo box answering a question.',
      ),
      code('hd-mk-paid-reddit-ad', 'reddit-ad.txt', 'txt', `
Headline: I got tired of answering the same 30 support emails, so I built a bot that answers from my docs (and admits when it doesn't know)
Body: Paste your docs URL, try it on your own site without signing up. Every answer links to its source page. $49/month after a 7 day trial.
Link: {url}/?utm_source=reddit#try
`),
      warn('Kill rule', 'Cost per click over $3 or no demo_submit after 100 clicks: stop. Reddit audiences either love a product on sight or ignore it.'),
    ],
    checklist: [
      'Create a Reddit traffic campaign with founder communities',
      ['Copy the Reddit ad', 'copy:hd-mk-paid-reddit-ad'],
      'Answer every comment during the test',
      'Stop or continue using the kill rule',
    ],
  }),
]
