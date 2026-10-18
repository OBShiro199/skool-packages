import type { Task } from '../../types'
import { code, eli5, links, mistakes, p, prompt, steps, table, task, tip, warn } from './helpers'

// Rule for this kit: Outbounder is sold with Outbounder. Every outbound campaign
// below runs inside your own Outbounder account, and the results feed the marketing.

const outbound: Task[] = [
  task({
    id: 'out-mk-out-zero',
    title: 'Make yourself customer zero',
    outcome: 'Your own Outbounder account on Growth with 2 outreach domains and 4 inboxes, ageing from day 1, ready to sell Outbounder with Outbounder.',
    minutes: 60,
    xp: 50,
    blocks: [
      eli5('Why sell it with itself?', 'If your cold emails get replies, that is the best demo there is. Every prospect who replies has just felt the product working on them. And every problem you hit, your customers would have hit first.'),
      steps(
        'Stripe Dashboard > Product catalogue > Coupons > **+ New**: 100% off, duration Forever, name "Founder". Apply it to your own Growth subscription in Customers > you > Subscription > Add coupon.',
        'Buy 2 lookalike domains on Porkbun for the product, e.g. tryoutbounder.com and getoutbounder.com (use your real brand). About $22 for both.',
        'In your Outbounder account: Domains > Set up a domain, for both. Add every DNS record in Porkbun. Forward both roots to your main site with a 301.',
        'Create 2 inboxes per domain with your real name (olly@tryoutbounder.com, olly.r@getoutbounder.com ...). Add a real signature and your business address in Settings > Sender.',
        'Sign up for Google Postmaster Tools (postmaster.google.com) and add both outreach domains so you can watch spam rate (keep it under 0.3%).',
        'Do this on day 1 of the build, not launch week: inboxes start at 20 a day and reach 30 after 4 weeks.',
      ),
      table(['Week', 'Inboxes', 'Cap per inbox', 'Sends a week (Mon to Thu)'], [
        ['1 to 2', '4', '20', '320'],
        ['3 to 4', '4', '25', '400'],
        ['5 onwards', '4', '30', '480'],
      ]),
      mistakes([
        { mistake: 'Sending your first campaign from your main domain "just this once".', fix: 'Never. Outbounder blocks it for customers; do not bypass it for yourself. Your Stripe receipts and Resend emails live on that domain.' },
        { mistake: 'Using a fake persona so it feels less salesy.', fix: 'Send as yourself, the founder. "I built this" gets more replies from founders than any SDR name.' },
        { mistake: 'Waiting until launch to set up domains.', fix: 'Domains and inboxes take a day to verify and weeks to ramp. Set them up now so they are ready when the product is.' },
      ]),
    ],
    checklist: ['Put your own account on Growth with a 100% coupon', 'Buy 2 outreach domains for Outbounder', 'Verify both domains and create 4 inboxes', 'Add the domains to Google Postmaster Tools'],
  }),
  task({
    id: 'out-mk-out-agency',
    title: 'Campaign 1: agency owners, offer 10 free first lines',
    outcome: '100 agency owners a week emailed from Outbounder with a value-first offer, aiming for 3 to 5 replies and 1 to 2 trials a week.',
    minutes: 45,
    xp: 50,
    blocks: [
      p('Agency owners are the best first segment: they need pipeline every quarter, they understand cold email, and one agency can run several brands. The offer is something they can say yes to from their phone: 10 personalised first lines for their own ideal clients, made by the product.'),
      table(['ICP field', 'Value'], [
        ['Titles', 'Founder, Owner, Managing Director, CEO'],
        ['Countries', 'United Kingdom, United States, Canada, Australia, Ireland'],
        ['Headcount', '1-10, 11-50'],
        ['Industry keywords', 'marketing agency, web design agency, lead generation, SEO agency, recruitment agency'],
        ['Exclude', 'freelance, student, holding'],
        ['Leads per week', '100 (Find 100 every Monday)'],
      ]),
      code('out-mk-out-agency-seq', 'Sequence for Outbounder (paste into the sequence editor)', 'txt', `
STEP 1 · day 0 · new thread
Subject: {{ai_subject}}
Hi {{first_name}},

{{ai_first_line}} {{ai_pain}}

I built a tool that finds leads like your best clients, writes a first line for each from their own website and sends from safe inboxes. This email was written by it.

Want me to run 10 first lines for {{company}}'s ideal clients, free?

STEP 2 · day 3 · same thread
{{first_name}}, one number: writing a real first line takes most people 3 to 5 minutes. Outbounder does 25 in about 2, and you approve every one.

Happy to send the 10 for {{company}} either way. Just reply with who you sell to.

STEP 3 · day 8 · new thread
Subject: pipeline next quarter
Not sure outbound is on your list right now, {{first_name}}. Reply "later" and I'll check back in a couple of months. If it is, the 10 free first lines are still on offer.`),
      table(['Number to watch (weekly)', 'Good', 'Kill or change if'], [
        ['Bounce rate', 'Under 2%', 'Over 2%: narrow the ICP, check verification'],
        ['Reply rate', '3 to 5% (vendor average 3.43%)', 'Under 2% after 300 sends: change the offer or the signal'],
        ['Interested share of replies', '30%+', 'Under 20%: the offer is weak, test a different free asset'],
        ['Interested to trial', '40%+', 'Under 30%: the sample handoff is slow; reply within the hour'],
      ]),
      tip('Deliver the 10 lines fast', 'When someone says yes, create a campaign with their ICP in your account, find 25 leads, export the 10 best first lines into a Google Doc and send it within 24 hours with a trial link. The doc is the demo.'),
      mistakes([
        { mistake: 'Putting a link to outbounder.com in step 1.', fix: 'Outbounder lints links in step 1 for a reason: links in a first cold email hurt placement. Send the link only after they reply.' },
        { mistake: 'Approving every AI email without reading it.', fix: 'You are your own case study. Reject any first line you would not want a prospect to screenshot.' },
        { mistake: 'Changing three things at once when replies are low.', fix: 'Change one thing per 300 sends: the offer, or the ICP, or the subject. Otherwise you never learn which one worked.' },
      ]),
    ],
    checklist: ['Create the agency owner campaign in your Outbounder account', ['Paste the 3-step agency sequence', 'copy:out-mk-out-agency-seq'], 'Find 100 leads and review them', 'Launch and log the weekly numbers'],
  }),
  task({
    id: 'out-mk-out-saas',
    title: 'Campaign 2: B2B SaaS founders doing founder-led sales',
    outcome: 'A second segment running in parallel, so you learn which buyer converts best within 4 weeks.',
    minutes: 40,
    xp: 45,
    blocks: [
      table(['ICP field', 'Value'], [
        ['Titles', 'Founder, Co-founder, CEO'],
        ['Countries', 'United States, United Kingdom, Germany, Netherlands, Canada'],
        ['Headcount', '1-10, 11-50'],
        ['Industry keywords', 'SaaS, software, B2B software, developer tools, analytics'],
        ['Exclude', 'agency, consulting, ecommerce store'],
        ['Leads per week', '75'],
      ]),
      code('out-mk-out-saas-seq', 'Sequence for Outbounder', 'txt', `
STEP 1 · day 0 · new thread
Subject: {{ai_subject}}
Hi {{first_name}},

{{ai_first_line}} {{ai_pain}}

Outbounder finds your buyers, reads each company's site and writes the first line for you, then sends from a separate domain so your main one stays clean. This email came out of it.

Want 10 first lines for {{company}}'s buyers to judge it?

STEP 2 · day 3 · same thread
{{first_name}}, most founders I talk to stop outbound after a week because writing is slow, not because it fails. That is the part Outbounder does.

The 10 sample lines are yours if you reply with your ICP.

STEP 3 · day 8 · new thread
Subject: founder-led sales
If outbound is not a priority this quarter, reply "later" and I'll leave it. If it is, the sample is ready when you are.`),
      steps(
        'Create a second campaign "SaaS founders" with the ICP above and attach the 2 inboxes not used by campaign 1, so each campaign has its own sender reputation.',
        'Paste the sequence, find 75 leads, review and launch.',
        'After 4 weeks compare the two campaigns on the Analytics page: replies per 100 sends and trials per 100 sends. Put 70% of next month\'s volume on the winner.',
      ),
      mistakes([
        { mistake: 'Both campaigns share all 4 inboxes, so you cannot tell which segment hurt deliverability.', fix: 'Split inboxes per campaign while testing. Merge later.' },
        { mistake: 'Emailing big-name founders with thousands of cold emails a week in their inbox.', fix: 'Keep headcount at 1-50. Smaller founders read their own email and reply.' },
        { mistake: 'Judging after 50 sends.', fix: 'Wait for at least 300 sends per campaign before deciding. Below that, one reply moves the rate by 2 points.' },
      ]),
    ],
    checklist: ['Create the SaaS founder campaign on separate inboxes', ['Paste the SaaS sequence', 'copy:out-mk-out-saas-seq'], 'Compare both campaigns after 300 sends each'],
  }),
  task({
    id: 'out-mk-out-replies',
    title: 'Run the reply loop from the unified inbox',
    outcome: 'Every reply answered the same day, interested ones within the hour, with one template per label.',
    minutes: 30,
    xp: 40,
    blocks: [
      p('Outbounder labels your replies. Your job is speed. Check the Interested filter at 12:00 and 16:00 every working day, and turn on the interested alert email so you see hot ones on your phone.'),
      code('out-mk-out-reply-templates', 'Reply templates (save as text snippets)', 'txt', `
INTERESTED
Great. Who do you want to reach? Give me job titles and countries and I'll send 10 first lines for them within 24 hours. Or grab 15 minutes: {{calendar_link}}

NOT NOW
Understood. What would need to change for outbound to matter? I'll check back in {{month}}.

OBJECTION: "we already use Instantly / Smartlead"
Makes sense, keep it for volume. Outbounder is for the part before sending: finding verified people and writing the first line from their site. Happy to show it on 10 of your leads.

OBJECTION: "AI emails sound robotic"
Agreed, most do. Every Outbounder line cites a fact from the lead's own site and you approve each one. The email you got was one. Want 10 to judge?

NO / UNSUBSCRIBE
Understood, removed. Thanks for replying.`),
      steps(
        'Inbox > filter Interested. Answer with the template within the hour, edited for the person.',
        'Book the 15-minute call, or send the 10 sample lines in a Google Doc within 24 hours, with "Start your 7-day trial" at the bottom.',
        'Relabel anything the AI got wrong with the label menu. Count relabels each week: over 10% means the classifier prompt needs work.',
        'Log every objection word for word in objections.md. When the same one appears 3 times, answer it on the landing page FAQ.',
      ),
      mistakes([
        { mistake: 'Replying to interested leads the next morning.', fix: 'Interest cools within hours. Turn on the Resend alert and reply from your phone.' },
        { mistake: 'Arguing with "not interested".', fix: 'Outbounder already suppressed them. Send the one-line thanks, or nothing.' },
        { mistake: 'Sending the trial link without the sample.', fix: 'The sample is the proof. Lead with the 10 first lines, then the link.' },
      ]),
    ],
    checklist: ['Turn on the interested reply alert email', ['Save the reply templates', 'copy:out-mk-out-reply-templates'], 'Answer every reply the same day for one week', 'Start objections.md'],
  }),
  task({
    id: 'out-mk-out-partners',
    title: 'Campaign 3: agencies that run outbound for clients',
    outcome: 'A partner offer to lead generation agencies, where one yes can bring 3 to 10 client accounts.',
    minutes: 35,
    xp: 45,
    blocks: [
      p('Lead generation agencies manage outbound for many clients. Offer them 20% of revenue for 12 months for every client account they open, plus Growth free for their own brand while they have 3 paying client accounts.'),
      code('out-mk-out-partner-seq', 'Sequence for Outbounder', 'txt', `
STEP 1 · day 0 · new thread
Subject: {{ai_subject}}
Hi {{first_name}},

{{ai_first_line}} {{ai_pain}}

I run Outbounder: it finds verified leads, writes a first line from each company's site and sends from separate inboxes per brand. Agencies use one account per client.

Would a 20% revenue share for client accounts you open be worth a 15-minute look?

STEP 2 · day 4 · same thread
{{first_name}}, the short version: each client gets their own domains, inboxes and review queue, and you approve every email before it goes. Happy to set up the first client account with you on a call.

STEP 3 · day 9 · new thread
Subject: client outbound
If now is not the time, reply "later". If it is, I'll set up one client account for free so you can see it working.`),
      steps(
        'ICP: titles Founder, Owner, Head of Growth; industry keywords "lead generation", "outbound agency", "appointment setting"; headcount 1-50; 50 leads a week.',
        'Set up referral tracking: Stripe coupon codes per partner (e.g. PARTNER-ACME, 0% off, used only for attribution) and a sheet of partner, code, accounts, revenue.',
        'Pay partners monthly from the Stripe report filtered by coupon.',
      ),
      mistakes([
        { mistake: 'Agencies want white label on day one.', fix: 'Say it is on the roadmap. Offer one account per client now; that already works.' },
        { mistake: 'Paying commission on trials.', fix: 'Pay only on paid invoices, monthly in arrears.' },
        { mistake: 'One partner sends low-quality lists and hurts shared infrastructure.', fix: 'Each client account has its own pod, domains and suppression. The auto-pause rules protect everyone else.' },
      ]),
    ],
    checklist: ['Create the partner campaign', ['Paste the partner sequence', 'copy:out-mk-out-partner-seq'], 'Set up one attribution coupon per partner'],
  }),
  task({
    id: 'out-mk-out-review',
    title: 'Weekly outbound review with kill rules',
    outcome: 'A 20-minute Friday review of your own Outbounder numbers that decides what to keep, change or stop.',
    minutes: 20,
    xp: 30,
    blocks: [
      code('out-mk-out-review-sql', 'Supabase SQL Editor: your own outbound this week', 'sql', `
-- replace with your own user id
with mine as (select 'YOUR_USER_ID'::uuid as uid)
select c.name,
       count(*) filter (where m.direction = 'outbound' and m.sent_at > now() - interval '7 days') as sent,
       count(*) filter (where m.status = 'bounced' and m.sent_at > now() - interval '7 days') as bounced,
       count(*) filter (where m.direction = 'inbound' and m.received_at > now() - interval '7 days') as replies,
       count(*) filter (where m.classification = 'interested' and m.received_at > now() - interval '7 days') as interested
from public.campaigns c
join public.messages m on m.campaign_id = c.id
where c.user_id = (select uid from mine)
group by c.name order by sent desc;`),
      table(['Rule', 'Action'], [
        ['Bounce over 2% in a week', 'Pause the campaign, tighten the ICP, check verify results'],
        ['Any spam complaint', 'Outbounder pauses the inbox; rewrite step 1 to be more specific'],
        ['Reply rate under 2% after 300 sends', 'Change one thing: offer, ICP or subject'],
        ['Interested under 1 per 100 sends after 600', 'Kill the segment, move volume to the best one'],
        ['Trials from cold email under 1 a week for 4 weeks', 'Book 5 calls with non-converting interested leads and ask why'],
      ]),
      steps(
        'Every Friday run the query and paste the numbers into your tracker sheet.',
        'Apply the rules in the table. Write one line in your tracker: what you changed and why.',
        'Copy the totals into your /open page (Inbound task) so the public numbers stay current.',
      ),
      mistakes([
        { mistake: 'Judging by opens.', fix: 'Outbounder does not track opens on purpose. Replies are the only number that matters.' },
        { mistake: 'Raising volume to fix a low reply rate.', fix: 'More sends of a weak email burn the domain faster. Fix the email first.' },
        { mistake: 'Skipping the review when things look fine.', fix: 'Bounce creep is slow. A 0.5% weekly rise is a full domain problem in a month.' },
      ]),
    ],
    checklist: [['Save the weekly outbound query', 'copy:out-mk-out-review-sql'], 'Run the review every Friday for 4 weeks', 'Write one change per week in your tracker'],
  }),
]

const inbound: Task[] = [
  task({
    id: 'out-mk-in-tool',
    title: 'Launch the free first-line generator',
    outcome: 'A free tool that ranks for "cold email first line generator", collects emails and shows the product working on the visitor\'s own target.',
    minutes: 60,
    xp: 50,
    blocks: [
      prompt('out-mk-in-tool-prompt', 'Build the free first-line generator', `
Read @PRD.md section 7.2 and @DESIGN.md section 5.11 and @LANDING.md (square marketing style). Build /tools/first-line-generator and /api/tools/first-line.
- Route: zod body { url }, normalise to https://host, SSRF guard (no IPs, localhost, .local, .internal). Rate limit 3 per hashed IP per day and 300 per day globally (events table), 429 after.
- Firecrawl the homepage only (1 credit). Claude claude-sonnet-5-5 with the PRD 12.1 system prompt but asking for 3 first lines, JSON schema { lines: [{ first_line, signal }] }, effort low.
- After 3 uses, an email field unlocks 10 more: save to a tool_signups row via the secret key and send one Resend email with the results and a trial link (email_log dedupe tool:<email>).
- Add the page to the sitemap with the SEO title "Free cold email first-line generator".
Plan first, then wait for my OK.`),
      steps(
        'Build it with the prompt, test it on 3 real websites.',
        'Post a 60-second screen recording on LinkedIn and X: "I built a free tool that writes cold email first lines from any website. No signup." Link in the first comment.',
        'Submit it to 5 free tool directories (e.g. There\'s An AI For That, Futurepedia, Toolify, AI Tools Directory, SaaSHub) [verify each accepts free tools].',
        'Add a link to it in your cold email signature after step 1 replies ("Try it on your own site: ...").',
      ),
      table(['Metric', 'Target after 30 days'], [
        ['Tool uses', '500'],
        ['Emails captured', '60 (12%)'],
        ['Trials from tool emails', '6'],
      ]),
      mistakes([
        { mistake: 'No rate limit, a bot runs 10,000 scrapes overnight.', fix: 'The global 300 a day cap is the safety net. Check the events count each morning for the first week.' },
        { mistake: 'Results look generic.', fix: 'Show the quoted signal under each line. If the site has no usable text, say so instead of guessing.' },
        { mistake: 'The tool asks for signup first.', fix: 'Three free uses without signup. The email gate only unlocks more.' },
      ]),
    ],
    checklist: [['Build the free tool', 'copy:out-mk-in-tool-prompt'], 'Post the screen recording on LinkedIn and X', 'Submit to 5 tool directories'],
  }),
  task({
    id: 'out-mk-in-calculator',
    title: 'Publish the inbox capacity calculator',
    outcome: 'A free calculator page that answers "how many cold emails can I send per day" with the ramp maths and points to the right plan.',
    minutes: 40,
    xp: 35,
    blocks: [
      prompt('out-mk-in-calc-prompt', 'Build /tools/inbox-calculator', `
Read @LANDING.md section 6.7 and @PRD.md section 14.2. Build /tools/inbox-calculator using rampCap from lib/sending/rules.ts.
Inputs: inboxes (1 to 20), send days, weeks since inbox creation, target leads per month, steps per sequence.
Outputs (tabular, fixed width): safe sends per week now and after the ramp, weeks to reach the target, how many inboxes you need for the target, and "Starter covers ..." / "Growth covers ..." lines.
Under it, a 600-word article: "How many cold emails can you send per inbox per day?" with the 20 / 25 / 30 ramp, why 30 to 50 burns domains, and the 2% bounce and 0.3% complaint limits.
SEO title: "Cold email inbox calculator: how many emails per day is safe". JSON-LD HowTo. Plan first.`),
      steps('Build and publish it.', 'Link it from the landing page section 6.7 and from Documentation > Deliverability.', 'Answer 3 Reddit or Indie Hackers threads asking "how many cold emails per day" with the real numbers and a link at the end.'),
      mistakes([
        { mistake: 'The calculator and the product disagree.', fix: 'Both must import rampCap from lib/sending/rules.ts. Never copy the numbers.' },
        { mistake: 'Promising inbox placement.', fix: 'Say "safe volume", never "guaranteed inbox".' },
        { mistake: 'Thread replies that are only a link.', fix: 'Answer fully in the thread first. The link is the extra, not the answer.' },
      ]),
    ],
    checklist: [['Build the calculator page', 'copy:out-mk-in-calc-prompt'], 'Link it from the landing page and docs', 'Answer 3 community threads with real numbers'],
  }),
  task({
    id: 'out-mk-in-vs',
    title: 'Write four honest comparison pages',
    outcome: '/vs/instantly, /vs/smartlead, /vs/apollo and /vs/lemlist live, each ranking for "<competitor> alternative" searches.',
    minutes: 90,
    xp: 50,
    blocks: [
      prompt('out-mk-in-vs-prompt', 'Build the vs pages', `
Read @LANDING.md section 22.1. Build /vs/[competitor] for instantly, smartlead, apollo and lemlist from one MDX template.
For each, research the competitor's current pricing page with WebSearch, write prices with the date checked, and mark anything unconfirmed [verify].
Sections: honest verdict, two-column table, "Choose them if" and "Choose Outbounder if" (equal weight), 3-step switch guide, 4 FAQs. SEO title "Outbounder vs <Name>: honest comparison (2026)". Plan first.`),
      steps('Build, read every page out loud, delete any sentence that would embarrass you if the competitor read it.', 'Add the four pages to the sitemap and to the footer.', 'Set a calendar reminder every 3 months to recheck prices.'),
      mistakes([
        { mistake: 'Claiming a competitor lacks a feature it has.', fix: 'Only state what their pricing or docs page shows. If unsure, leave the cell out.' },
        { mistake: 'Stale prices.', fix: 'Show "Prices checked <date>" on every page and recheck quarterly.' },
        { mistake: 'Four near-identical pages.', fix: 'Each verdict and "choose them if" must be specific to that tool, or search engines treat them as duplicates.' },
      ]),
    ],
    checklist: [['Build the four vs pages', 'copy:out-mk-in-vs-prompt'], 'Add them to the sitemap and footer', 'Set a quarterly price recheck reminder'],
  }),
  task({
    id: 'out-mk-in-teardown',
    title: 'Post a weekly cold email teardown',
    outcome: 'One LinkedIn and X post every Tuesday that rewrites a bad cold email with Outbounder, building an audience of the exact buyer.',
    minutes: 45,
    xp: 40,
    blocks: [
      code('out-mk-in-teardown-post', 'Post template', 'txt', `
Cold email teardown #{{n}}

Got this today (names removed):
"{{original first two lines}}"

What is wrong:
1. {{problem 1, e.g. starts with "I hope this finds you well"}}
2. {{problem 2, e.g. nothing about my company}}
3. {{problem 3, e.g. calendar link in the first email}}

Rewrite, written by Outbounder from my own website:
"{{Outbounder first line}} {{one-line offer}} {{phone-answerable question}}"

52 words. No link. One fact they could only know by reading my site.

Free tool to try it on your prospects: {{link in comment}}`),
      steps(
        'Each Monday pick one cold email from your own inbox. Remove names and companies.',
        'Run the sender\'s target through Outbounder (or the free tool) on your own site to get the rewrite.',
        'Post on Tuesday 08:30 in your audience\'s time zone. Reply to every comment the same day.',
        'Track followers, profile visits and free tool uses from the post link (utm_source=linkedin, utm_campaign=teardown).',
      ),
      mistakes([
        { mistake: 'Mocking a real person who can be identified.', fix: 'Remove every name, company and detail that points to them.' },
        { mistake: 'Posting irregularly.', fix: 'Same day, same time, every week for 12 weeks before judging.' },
        { mistake: 'Hard-selling in the post.', fix: 'The rewrite is the pitch. The link goes in the first comment.' },
      ]),
    ],
    checklist: [['Save the teardown template', 'copy:out-mk-in-teardown-post'], 'Publish teardown #1 on a Tuesday', 'Track post visits with utm tags'],
  }),
  task({
    id: 'out-mk-in-open',
    title: 'Publish your own outbound numbers on /open',
    outcome: 'A public page with live sends, reply rate and trials from your own Outbounder account, plus a weekly build-in-public post.',
    minutes: 45,
    xp: 40,
    blocks: [
      eli5('Why show your numbers?', 'Anyone can say "our cold emails work". Showing the real count of emails you sent with the tool, and the replies you got, is proof nobody else in the market shows. It also keeps you honest.'),
      prompt('out-mk-in-open-prompt', 'Build /open', `
Read @LANDING.md section 22.2. Build /open as a server component that queries, with the secret key, only aggregates for FOUNDER_USER_ID (an env var): sends this month, reply rate, interested replies, trials started with utm_source=outbounder. Weekly line chart of sends and replies since launch. Cache for 1 hour (revalidate 3600). Never output names, emails or companies. Plan first.`),
      steps(
        'Add FOUNDER_USER_ID to Vercel env and deploy.',
        'Every Friday after the outbound review, post a screenshot of /open on X and LinkedIn: "Week 6 of selling Outbounder with Outbounder: 412 sent, 19 replies, 7 interested, 3 trials."',
        'Link /open from the landing page testimonials slot until you have real quotes.',
      ),
      mistakes([
        { mistake: 'The page leaks lead data.', fix: 'Only counts. Check the HTML source for any @ sign after deploying.' },
        { mistake: 'Hiding bad weeks.', fix: 'Post them too, with what you changed. Honesty is the point.' },
        { mistake: 'Counting test sends to yourself.', fix: 'Exclude campaigns whose name starts with "Test".' },
      ]),
    ],
    checklist: [['Build the /open page', 'copy:out-mk-in-open-prompt'], 'Post the first weekly numbers screenshot', 'Link /open from the landing page'],
  }),
  task({
    id: 'out-mk-in-docs',
    title: 'Turn the deliverability docs into search traffic',
    outcome: 'Six public guides from your Documentation section that answer the questions cold emailers search for.',
    minutes: 120,
    xp: 50,
    blocks: [
      table(['Guide', 'Target search'], [
        ['How many cold emails per inbox per day (2026)', 'cold emails per day per inbox'],
        ['SPF, DKIM and DMARC for cold email on Porkbun', 'porkbun dkim dmarc cold email'],
        ['Why you need a separate domain for cold email', 'separate domain for cold email'],
        ['List-Unsubscribe header: what it is and how to add it', 'list-unsubscribe header cold email'],
        ['Cold email first lines: 25 real examples', 'cold email first line examples'],
        ['What to do when your cold emails bounce', 'cold email bounce rate'],
      ]),
      prompt('out-mk-in-docs-prompt', 'Publish the public guides', `
Read @PRD.md section 14. Write the six guides in the table as MDX in content/guides/, 900 to 1,400 words each, British spelling, no em dashes, real numbers from PRD section 14 (20 a day start, 30 max, 2% bounce, 0.3% complaints). Each ends with a box linking to the free tool and the trial. Publish at /guides/<slug> with Article JSON-LD and add them to the sitemap. Plan first.`),
      steps('Publish one guide a week for 6 weeks.', 'Submit the sitemap in Google Search Console after each one.', 'Link each guide from the matching Documentation article inside the app.'),
      mistakes([
        { mistake: 'Thin AI-written guides.', fix: 'Add a real screenshot from your own account and one number from your /open page to each guide.' },
        { mistake: 'Guides that never link to the product.', fix: 'End each with the free tool box. Readers searching these terms are your buyers.' },
        { mistake: 'Publishing all six in one day.', fix: 'One a week gives each a chance to be indexed and shared.' },
      ]),
    ],
    checklist: [['Run the guides prompt', 'copy:out-mk-in-docs-prompt'], 'Publish guide 1 and submit the sitemap', 'Link each guide from the in-app docs'],
  }),
]

const paid: Task[] = [
  task({
    id: 'out-mk-paid-search',
    title: 'Google Search ads on "alternative" and intent keywords',
    outcome: 'A $300 test that tells you whether search ads bring trials under $60 each.',
    minutes: 60,
    xp: 45,
    blocks: [
      table(['Ad group', 'Keywords (phrase match)', 'Max CPC'], [
        ['Alternatives', '"instantly alternative", "smartlead alternative", "lemlist alternative"', '$4'],
        ['Intent', '"cold email software with leads", "ai cold email personalization", "cold email tool for agencies"', '$5'],
        ['Problem', '"cold email first line generator", "personalized cold email at scale"', '$3'],
      ]),
      code('out-mk-paid-search-ads', 'Responsive search ad copy', 'txt', `
Headlines (30 characters max each):
Cold Email With Leads Included
First Lines From Their Website
Safe Inboxes On Your Domain
7-Day Free Trial, From $79/mo
An Honest Instantly Alternative

Descriptions (90 characters max each):
Find verified B2B leads, write a first line from each site and send from safe inboxes.
Approve every email. 20 a day per new inbox. Replies sorted by AI. Try it free for 7 days.`),
      steps(
        'Google Ads > New campaign > Search > goal Leads. Budget $10 a day for 30 days. Locations: US, UK, CA, AU, IE.',
        'Create the three ad groups and the ad above. Land the Alternatives group on the matching /vs/ page, the others on the homepage.',
        'Track trial_started as a conversion (import from PostHog or add the Google tag on the onboarding success step).',
        'Add negatives: free, jobs, course, template, gmail.',
      ),
      table(['Kill rule', 'Action'], [
        ['$100 spent, 0 trials', 'Pause the ad group'],
        ['Cost per trial over $60 after $300', 'Stop search ads for now'],
        ['Cost per trial under $40', 'Double the budget of that ad group'],
      ]),
      mistakes([
        { mistake: 'Broad match eats the budget on "free cold email templates".', fix: 'Phrase match only, plus the negative list.' },
        { mistake: 'Bidding on competitor brand names alone ("instantly").', fix: 'Only bid on "<name> alternative". Pure brand terms are expensive and convert badly.' },
        { mistake: 'No conversion tracking.', fix: 'Without trial_started as a conversion, Google optimises for clicks. Set it up before spending.' },
      ]),
    ],
    checklist: ['Create the search campaign with 3 ad groups', ['Paste the ad copy', 'copy:out-mk-paid-search-ads'], 'Set up trial_started as a conversion', 'Apply the kill rules after $300'],
  }),
  task({
    id: 'out-mk-paid-retarget',
    title: 'Retarget free tool users on LinkedIn',
    outcome: 'A $150 retargeting test that turns free tool visitors into trials.',
    minutes: 40,
    xp: 35,
    blocks: [
      steps(
        'LinkedIn Campaign Manager > Account assets > Insight Tag: install it on the marketing pages only (not /app).',
        'Matched audiences > Website: visitors of /tools/first-line-generator in the last 30 days. Wait until the audience shows 300+ members.',
        'New campaign > Website visits > the audience above > Single image ad > $5 a day for 30 days.',
        'Image: a real Outbounder review queue screenshot with one first line highlighted.',
      ),
      code('out-mk-paid-retarget-copy', 'Ad copy', 'txt', `
Intro text: You tried the free first-line generator. Outbounder does that for 100 leads at once, then sends from safe inboxes on your own domain. 7 days free.
Headline: 100 personalised cold emails this week
CTA button: Start free trial`),
      table(['Kill rule', 'Action'], [['$75 spent, under 0.5% CTR', 'Swap the image'], ['$150 spent, 0 trials', 'Stop'], ['Cost per trial under $50', 'Keep it running at $5 a day']]),
      mistakes([
        { mistake: 'Audience too small, ads never deliver.', fix: 'LinkedIn needs 300 matched members. Run the free tool posts first.' },
        { mistake: 'Tag on the app pages.', fix: 'Keep it off /app so logged-in users are not tracked inside the product.' },
        { mistake: 'Generic stock image.', fix: 'Use a real product screenshot; it is the strongest proof you have.' },
      ]),
    ],
    checklist: ['Install the Insight Tag on marketing pages', 'Build the free tool visitors audience', ['Launch the retargeting ad', 'copy:out-mk-paid-retarget-copy']],
  }),
  task({
    id: 'out-mk-paid-newsletter',
    title: 'Sponsor one cold email or agency newsletter',
    outcome: 'One $200 to $500 sponsored issue in front of agency owners, measured by trials with a utm tag.',
    minutes: 45,
    xp: 35,
    blocks: [
      steps(
        'Find 5 newsletters about cold email, outbound or running an agency with 5,000 to 30,000 subscribers (search "cold email newsletter sponsor", or check who sponsors posts you already read).',
        'Email each owner: ask for subscriber count, open rate, price and 2 past sponsors you can contact.',
        'Pick the one with the best price per real reader (price / (subscribers x open rate)). Aim for under $0.05 per opened email.',
        'Book one issue. Use the copy below and a link with utm_source=newsletter&utm_campaign=<name>.',
      ),
      code('out-mk-paid-newsletter-copy', 'Sponsor copy (about 80 words)', 'txt', `
Sponsored by Outbounder

Most cold email tools send. Outbounder also does the slow part: it finds verified leads that match your buyer, reads each company's website and writes a first line about something real. You approve every email, and it sends from safe inboxes on a separate domain, 20 a day per new inbox.

Readers get 10 free first lines for their own ideal clients: reply to this issue or try it free for 7 days at {{link}}.`),
      table(['Kill rule', 'Action'], [['Under 2 trials from the issue', 'Do not rebook'], ['3+ trials and 1 paid', 'Book 2 more issues'], ['Cost per paid customer under $150', 'Make it a monthly slot']]),
      mistakes([
        { mistake: 'Paying for a big general startup newsletter.', fix: 'Smaller, focused lists of agency owners convert better per dollar.' },
        { mistake: 'No unique link.', fix: 'Without utm tags you cannot tell the issue worked.' },
        { mistake: 'A feature list as the ad.', fix: 'Lead with the slow job it removes and the free offer.' },
      ]),
    ],
    checklist: ['Shortlist 5 newsletters and ask for stats', ['Write the sponsor copy', 'copy:out-mk-paid-newsletter-copy'], 'Book one issue with a utm link'],
  }),
]

export const marketing = { outbound, inbound, paid }

export const launchTasks: Task[] = [
  task({
    id: 'out-launch-deliverability',
    title: 'Pre-launch deliverability check',
    outcome: 'Proof that emails from a fresh customer domain land in the inbox, score 9+ on mail-tester and show the unsubscribe link in Gmail.',
    minutes: 40,
    xp: 45,
    blocks: [
      steps(
        'Go to https://www.mail-tester.com, copy the test address it shows.',
        'In your Outbounder account, add that address as a lead in a "Test" campaign via CSV, approve and send step 1 now (window set to the current hour).',
        'Back on mail-tester click "Then check your score". Target 9/10 or more. Fix anything red (usually DMARC missing or a link in the body).',
        'Send the same email to your own Gmail and Outlook.com addresses. Check the primary inbox, "Unsubscribe" next to the sender in Gmail, and Show original: SPF, DKIM and DMARC all PASS.',
        'Click the unsubscribe link and check the suppression list in Settings.',
        'Add DMARC aggregate reports for your outreach domains to a free reader (e.g. dmarcian or Postmark DMARC) and check one report a week.',
      ),
      warn('Do not launch below 8/10', 'A low mail-tester score on your own product domain means every customer starts with the same problem. Fix it before the first customer connects a domain.'),
      mistakes([
        { mistake: 'mail-tester says "Your message is not signed with DKIM".', fix: 'The DKIM CNAME or TXT record is missing in Porkbun. Recheck it in the domain wizard.' },
        { mistake: 'Gmail shows no Unsubscribe link.', fix: 'Gmail only shows it for senders it trusts and when both List-Unsubscribe headers are present. Check Show original for List-Unsubscribe and List-Unsubscribe-Post.' },
        { mistake: 'Outlook puts it in Junk.', fix: 'Outlook is slower to trust new domains. Keep the 20-a-day start, plain text, no links, and recheck after a week.' },
      ]),
      links([{ label: 'mail-tester', url: 'https://www.mail-tester.com' }, { label: 'Google Postmaster Tools', url: 'https://postmaster.google.com' }]),
    ],
    checklist: ['Score 9/10 or more on mail-tester', 'Confirm primary inbox in Gmail and Outlook', 'Confirm SPF, DKIM and DMARC pass', 'Test the unsubscribe link end to end'],
  }),
  task({
    id: 'out-launch-week',
    title: 'Launch week: sell Outbounder with Outbounder',
    outcome: 'Launch week runs on your own outbound: 400 personalised emails, a public /open page and a launch post that shows the numbers.',
    minutes: 120,
    xp: 70,
    blocks: [
      p('Most launches are one post and a hope. This one starts with the product doing its job in public. By the end of the week you have a real reply rate to quote, and every reply is a warm conversation.'),
      steps(
        'Monday: Find 100 leads in each of campaigns 1 and 2. Review them all yourself. Launch.',
        'Tuesday: publish the launch post on LinkedIn and X with the template below. Post the free tool on Indie Hackers.',
        'Wednesday and Thursday: answer every reply within the hour. Send the 10-line samples within 24 hours.',
        'Friday: run the weekly review, update /open, post the numbers.',
        'Next Monday: switch on the Google Search test only if you have at least 1 trial from outbound, so you know the funnel converts.',
      ),
      code('out-launch-post', 'Launch post template', 'txt', `
I just launched Outbounder.

It finds verified B2B leads, reads each company's website, writes a first line about something real, and sends from safe inboxes on your own domain.

The test: I used it to sell itself.
This week: {{sent}} emails, {{replies}} replies ({{reply_rate}}%), {{interested}} interested, {{trials}} trials.
Every number is live at {{open_link}}.

If you got one of my emails: yes, Outbounder wrote that first line.

7 days free, from $79/mo. Free first-line tool in the comments.`),
      mistakes([
        { mistake: 'Blasting 1,000 emails in launch week from new inboxes.', fix: 'The ramp caps you at 20 per inbox per day. 4 inboxes, 4 days = 320 to 480. That is plenty for a real signal.' },
        { mistake: 'Launch post with made-up numbers.', fix: 'Only post what /open shows. If the numbers are small, say so; honest small numbers beat vague big claims.' },
        { mistake: 'No one ready to reply.', fix: 'Block 2 hours on Wednesday and Thursday for replies and samples. The launch is won in the replies.' },
      ]),
    ],
    checklist: ['Launch campaigns 1 and 2 with 100 leads each', ['Publish the launch post with real numbers', 'copy:out-launch-post'], 'Answer every reply within the hour', 'Update /open on Friday'],
  }),
]

