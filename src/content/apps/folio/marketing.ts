// Folio marketing (outbound, inbound, paid) and launch tasks.
import type { Task } from '../../types'
import { code, eli5, p, prompt, steps, table, task, tip, warn } from './helpers'

export const outbound: Task[] = [
  task({
    id: 'fol-mk-out-list',
    title: 'Build a list of 150 people who post on LinkedIn but never post carousels',
    outcome: 'A sheet of 150 founders, coaches and agency owners with a signal and their best recent text post.',
    minutes: 120,
    xp: 60,
    blocks: [
      eli5('Why this list?', 'The best buyer already writes good posts but only as plain text. They have the ideas and the habit. Folio turns what they already wrote into a carousel, so the pitch is "here is your own post, as a carousel, in your colours".'),
      steps(
        'Open a Google Sheet with columns: name, role, segment (founder, coach, agency), LinkedIn URL, website, blog or YouTube URL, best recent post URL, signal, status.',
        'LinkedIn search: Posts tab, filter "Past week", search terms like "founder lessons", "coaching clients", "LinkedIn ghostwriting". Add people whose last 10 posts are text only and who post at least weekly.',
        'Agencies: search Google for "LinkedIn ghostwriting agency" and "LinkedIn content agency", then the founder on LinkedIn. Note how many clients their site shows.',
        'Coaches: YouTube search "business coach" or "career coach" filtered to channels with 1,000 to 50,000 subscribers that also post on LinkedIn.',
        'Signal column: one fact you can say in a line, e.g. "posted 4 text posts this week", "new YouTube video on pricing", "agency hiring a designer".',
        'Stop at 150 rows. Aim for 60 founders, 50 coaches, 40 agencies.',
      ),
      tip('Speed it up', 'Ask Claude Code to write a small script that takes a list of LinkedIn profile URLs you paste and returns each person\'s website and blog URL using Firecrawl on their site. Keep the LinkedIn part manual: scraping LinkedIn breaks their terms.'),
    ],
    checklist: [
      'Create the sheet with the 9 columns',
      'Add 150 people with a signal each',
      'Tag each row founder, coach or agency',
    ],
  }),
  task({
    id: 'fol-mk-out-gift',
    title: 'Make each prospect a free carousel from their own post',
    outcome: 'For your top 50 prospects, a real Folio carousel of their best post in their colours, ready to send.',
    minutes: 150,
    xp: 70,
    blocks: [
      p('Give the result first. A prospect who sees their own post as a finished carousel in their brand colours decides in seconds. It takes you about 3 minutes each.'),
      steps(
        'In your own Folio workspace (Agency plan in test mode or your own account), create a brand kit per prospect: their headshot from LinkedIn, colours from their website, their handle.',
        'Paste their best recent post text as an Idea (or their latest blog URL).',
        'Fix anything that reads wrong, export the PDF.',
        'Upload the PDF to a share link (Google Drive "anyone with the link") named "<Name> carousel by Folio.pdf".',
        'Log the link in the sheet. Delete their brand kit after 30 days if they do not reply.',
      ),
      warn('Only public material', 'Use posts and images they published themselves, and only send the carousel to them. Never post it publicly or tag them without their OK.'),
    ],
    checklist: [
      'Pick the top 50 prospects from the sheet',
      'Make a carousel for each from their own post',
      'Save each PDF link in the sheet',
    ],
  }),
  task({
    id: 'fol-mk-out-dm',
    title: 'Send 20 LinkedIn DMs a day with the free carousel',
    outcome: 'Fifty personal DMs that each carry a finished carousel, plus a same-day reply routine.',
    minutes: 45,
    xp: 45,
    blocks: [
      steps(
        'Send a connection request with no note (LinkedIn allows about 100 a week on a free account). 20 a weekday.',
        'When they accept, send DM 1 with their carousel link. Personalise the first line by hand.',
        'Check replies at 12:00 and 16:00. Reply within the hour.',
        'No reply in 4 days: send DM 2 once. Then stop.',
      ),
      code('fol-mk-out-dm-script', 'DM scripts', 'txt', `
DM 1 (after they accept)
Thanks for connecting, {first name}. Your post on {topic} this week was good, so I turned it into a 9 slide carousel in your colours: {link}
Free to use, post it as your own. Want me to do the next one too?

DM 2 (4 days later, same thread)
{first name}, the carousel format usually gets more saves than a text post for posts like yours. Happy to send another from your {latest blog or video} if useful.

Reply: "Yes, do the next one"
Great. Folio makes these in about 3 minutes from any post, blog or video. Here is a 7 day trial with your brand kit already set up: {signup link}. I will check in on Friday to see how the first one did.

Reply: "How much?"
$39 a month for 15 carousels, with a 7 day free trial. Agencies pay $249 for 10 brand kits.`),
      tip('Keep the DM short', 'Two lines and a link. No deck, no video, no calendar link in the first message.'),
    ],
    checklist: [
      'Send 20 connection requests today',
      ['Copy the DM scripts', 'copy:fol-mk-out-dm-script'],
      'Send DM 1 to everyone who accepted',
      'Reply to every answer within the hour',
    ],
  }),
  task({
    id: 'fol-mk-out-email',
    title: 'Email 40 agencies with a 3 step sequence',
    outcome: 'Forty LinkedIn agencies get a signal-led email offering a free carousel for one of their clients.',
    minutes: 90,
    xp: 55,
    blocks: [
      p('Agencies pay the most ($249) and churn the least because Folio sits in their weekly workflow. Email works well here: founders of small agencies read their own inbox.'),
      steps(
        'Find each agency founder\'s work email (Apollo free tier or the contact page). Verify with MillionVerifier before sending.',
        'Send from a separate lookalike domain (e.g. getfolio-mail.com), never your main domain, with a warmed inbox, 15 to 25 emails a day.',
        'Hand-send the first 20. Keep the email that gets replies.',
        'Day 0 email 1, day 3 email 2 in the same thread, day 8 email 3 as a new thread.',
      ),
      code('fol-mk-out-email-script', 'Three step sequence', 'txt', `
Email 1 · Subject: carousels for {agency}'s clients
{first name}, {agency} posts for {client count} clients on LinkedIn and most of them are text posts.
Making those into on-brand carousels usually takes a designer an hour each.
I made one for {client name} from their post on {topic} in their colours: {link}. Want two more for other clients?

Email 2 · day 3 · same thread
{first name}, one number: an agency doing 3 carousels a week per client for 8 clients spends about 100 hours a month in Canva.
Happy to make the next two either way.

Email 3 · day 8 · new thread · Subject: close the loop?
Not sure carousels are on your list this quarter. Reply "later" and I will check back in {month}. If they are, Folio keeps one brand kit per client and schedules to each client's LinkedIn.

{your name} · Folio · {postal address} · Reply "no" and I will not email again.`),
    ],
    checklist: [
      'Find and verify 40 agency founder emails',
      ['Copy the sequence', 'copy:fol-mk-out-email-script'],
      'Hand-send the first 20 and log replies',
    ],
  }),
  task({
    id: 'fol-mk-out-partners',
    title: 'Partner with 5 LinkedIn coaches and ghostwriting communities',
    outcome: 'Five people who teach LinkedIn content recommend Folio to their students with a tracked code.',
    minutes: 60,
    xp: 45,
    blocks: [
      p('People who teach LinkedIn writing (paid communities, cohort courses, Skool groups) have hundreds of students who all need carousels. One partner can bring 10 to 30 trials.'),
      steps(
        'List 15 LinkedIn growth coaches and community owners (Skool search "LinkedIn", course platforms, newsletters about LinkedIn writing).',
        'Make each of them a free carousel from their own post first (same as the gift task).',
        'Offer 30% of the first 12 months for every customer they refer, paid monthly. Track with a Stripe coupon per partner (e.g. MAYA20 for 20% off the first month) and a sheet until revenue justifies an affiliate tool.',
        'Give them a 60 second demo video and a ready post they can share.',
      ),
      code('fol-mk-out-partners-script', 'Partner DM', 'txt', `
Hi {name}, I am building Folio: it turns a post, blog or YouTube video into an on-brand LinkedIn carousel in about 3 minutes.
I turned your post on {topic} into one: {link}.
Your students would get 20% off their first month with code {CODE}, and you get 30% of what they pay for a year. Want a free Agency account to try it with a few of them?`),
    ],
    checklist: [
      'List 15 LinkedIn coaches and community owners',
      ['Copy the partner DM', 'copy:fol-mk-out-partners-script'],
      'Create a Stripe coupon per partner who says yes',
    ],
  }),
  task({
    id: 'fol-mk-out-calls',
    title: 'Run 15 minute demo calls and close on the call',
    outcome: 'Every interested reply becomes a short call where they leave with a trial and their brand kit set up.',
    minutes: 60,
    xp: 40,
    blocks: [
      code('fol-mk-out-calls-script', 'Call script (15 minutes)', 'txt', `
0:00 "What do you post now, and how long does one carousel take you?" (write down the number)
2:00 "Send me a link to a post or video you are proud of." Paste it into Folio while they watch.
4:00 Show the carousel in their colours. Rewrite the hook with "Punchier". Drag a slide.
7:00 Export the PDF and drop it in the chat.
8:00 "If you posted 3 of these a week, what would that be worth?" Let them answer.
10:00 "The trial is 7 days. I can set up your brand kit right now so your next one takes 3 minutes."
12:00 Send the signup link while you are still on the call. Agencies: offer to set up their first 3 client brand kits.
14:00 Book a 10 minute check-in for day 5 of the trial.`),
      tip('Track one number', 'Write down the minutes per carousel they tell you at minute 0. Use the real numbers on your landing page later (with permission).'),
    ],
    checklist: [
      ['Copy the call script', 'copy:fol-mk-out-calls-script'],
      'Run your first 5 demo calls',
      'Set up a brand kit live on every call',
    ],
  }),
]

export const inbound: Task[] = [
  task({
    id: 'fol-mk-in-dogfood',
    title: 'Post your own carousels made with Folio, 3 a week',
    outcome: 'Your LinkedIn becomes the live demo: every post is a Folio carousel about building Folio or LinkedIn growth.',
    minutes: 60,
    xp: 40,
    blocks: [
      steps(
        'Set your own brand kit in Folio. Turn on the "Made with Folio" mark on your own carousels only.',
        'Every Tuesday, Wednesday and Thursday at 08:30, schedule one carousel from the calendar.',
        'Topics from your calls: the questions prospects ask ("How long should a carousel be?", "Hook formulas that work", "PDF vs images on LinkedIn").',
        'End each with a CTA: "Comment CAROUSEL and I will turn your best post into one for free." Every comment is a warm lead for the gift task.',
      ),
      prompt('fol-mk-in-dogfood-prompt', 'Paste into Claude Code (content plan)', `
Read every note in /calls and /replies. List the 15 questions and objections prospects raised about LinkedIn carousels, ranked by count, with one exact quote each.
For the top 12, write a one-line carousel idea (hook plus the 7 body points) that I can paste into Folio as an Idea. Save to /content/carousels.md.`),
    ],
    checklist: [
      'Set up your own brand kit with the Folio mark on',
      ['Generate the 12 week content plan', 'copy:fol-mk-in-dogfood-prompt'],
      'Schedule this week\'s 3 carousels',
    ],
  }),
  task({
    id: 'fol-mk-in-hook-tool',
    title: 'Publish a free carousel hook generator',
    outcome: 'A free tool page at /tools/carousel-hook-generator that ranks in search and collects emails.',
    minutes: 60,
    xp: 45,
    blocks: [
      eli5('Free tools as marketing', 'People search "carousel hook generator" and "LinkedIn hook ideas". A free tool that answers that search brings in the exact people who make carousels. Each result ends with "Want the other 8 slides? Try Folio."'),
      prompt('fol-mk-in-hook-tool-prompt', 'Paste into Claude Code', `
Build app/(marketing)/tools/carousel-hook-generator/page.tsx: input "What is your post about?" (300 chars) and an audience select (founders, coaches, marketers, job seekers).
A route /api/tools/hooks verifies a Cloudflare Turnstile token, rate limits 5 per IP per day and 500 per day in total (demo_requests table, secret key), and asks claude-haiku-5-5 for 10 hooks as JSON { hooks: string[] } using the prompt-injection guard from PRD 11.1. Show the hooks as a list with Copy buttons and one rendered as a real Folio hook slide in the Violet preset.
Under the results: email capture "Send me 50 more hooks" (saves to a leads table) and a "Write the whole carousel free for 7 days" button to /signup?ref=hook-tool.
SEO: title "Free LinkedIn carousel hook generator", meta description, H1, 3 FAQs with FAQPage JSON-LD. Add it to sitemap.ts.`),
      steps('Deploy and test 3 topics.', 'Submit the page in Google Search Console (URL inspection, Request indexing).', 'Link to it from your LinkedIn featured section.'),
    ],
    checklist: [
      ['Copy the hook generator prompt', 'copy:fol-mk-in-hook-tool-prompt'],
      'Deploy and request indexing in Search Console',
      'Add it to your LinkedIn featured section',
    ],
  }),
  task({
    id: 'fol-mk-in-alternatives',
    title: 'Write 4 honest alternative pages',
    outcome: 'Pages for "Taplio alternative", "Contentdrips alternative", "PostNitro alternative" and "aiCarousels alternative" that convert searchers comparing tools.',
    minutes: 90,
    xp: 50,
    blocks: [
      p('People searching "X alternative" are ready to switch. An honest page that says when to choose the other tool earns trust and gets cited by AI search engines.'),
      prompt('fol-mk-in-alternatives-prompt', 'Paste into Claude Code', `
Create app/(marketing)/compare/[slug]/page.tsx with generateStaticParams for taplio, contentdrips, postnitro and aicarousels.
Each page: H1 "<Competitor> alternative for LinkedIn carousels", a 2 line verdict, a comparison table (price, sources supported, brand kit, AI rewrite per slide, scheduling, analytics) with "Prices checked <Month Year>" under it, "Choose <Competitor> if..." with 3 honest reasons, "Choose Folio if..." with 3 reasons, "Switch in 3 steps", 4 FAQs from real objections, and a last-updated date.
Every competitor fact goes in lib/competitors.ts with a source URL and the date checked. Leave any fact I have not confirmed as "[verify]" so the build fails until I fill it in (add a check script).`),
      steps(
        'Visit each competitor\'s pricing and feature pages yourself and fill lib/competitors.ts with what you see, with the date.',
        'Never claim a competitor lacks a feature unless their site shows it.',
        'Refresh each page every 3 months (add a calendar reminder).',
      ),
    ],
    checklist: [
      ['Copy the alternative pages prompt', 'copy:fol-mk-in-alternatives-prompt'],
      'Fill every competitor fact from their own site with the date',
      'Publish the 4 pages',
    ],
  }),
  task({
    id: 'fol-mk-in-youtube',
    title: 'Record 10 search-intent YouTube videos',
    outcome: 'Ten how-to videos that answer what your buyers search, each with Folio doing one step on screen.',
    minutes: 300,
    xp: 70,
    blocks: [
      table(['Video title', 'Search it answers'], [
        ['How to turn a blog post into a LinkedIn carousel (in 3 minutes)', 'blog to linkedin carousel'],
        ['How to make a LinkedIn PDF carousel that people swipe', 'linkedin pdf carousel'],
        ['Turn one YouTube video into 5 LinkedIn carousels', 'youtube to linkedin post'],
        ['LinkedIn carousel size and format in 2026', 'linkedin carousel size'],
        ['10 carousel hooks that get the swipe', 'linkedin carousel hooks'],
        ['How agencies make carousels for 10 clients a week', 'linkedin agency workflow'],
        ['Canva vs AI for LinkedIn carousels', 'canva linkedin carousel'],
        ['How to schedule a LinkedIn carousel (PDF) post', 'schedule linkedin carousel'],
        ['Voice note to LinkedIn post: my walking content system', 'voice notes to content'],
        ['Instagram carousel from a blog post', 'instagram carousel from blog'],
      ]),
      code('fol-mk-in-youtube-beats', '10 minute video beats', 'txt', `
0:00 Say the search in the first sentence ("Here is how to turn a blog post into a LinkedIn carousel in 3 minutes")
0:30 The problem in the buyer's words (Canva, 90 minutes, fonts break)
1:30 The method step by step, on screen
6:00 Folio doing one step (paste link, rewrite hook, export PDF)
8:30 One objection answered ("Will it sound like AI?")
9:30 CTA: link in the first line of the description with ?utm_source=youtube&utm_campaign=<video-slug>`),
      tip('Judge at video 20', 'Most channels look dead for the first 10 to 20 videos. Commit to one a week and only judge after 20.'),
    ],
    checklist: [
      'Record and publish the first video',
      ['Copy the video beats', 'copy:fol-mk-in-youtube-beats'],
      'Add a UTM link to every description',
    ],
  }),
  task({
    id: 'fol-mk-in-templates-seo',
    title: 'Turn the 8 layouts into template pages',
    outcome: 'Eight /templates/[layout] pages with real example carousels that rank for "LinkedIn carousel template".',
    minutes: 60,
    xp: 40,
    blocks: [
      p('The template gallery (PRD 7.2) is already built. Give each layout its own page with 3 complete example carousels made in Folio, a "best for" section, and a "Use this template" button that opens signup with that layout pre-selected.'),
      prompt('fol-mk-in-templates-seo-prompt', 'Paste into Claude Code', `
Build app/(marketing)/templates/[layout]/page.tsx with generateStaticParams for the 8 layouts. Each page: H1 "<Layout name> LinkedIn carousel template", 3 example carousels rendered with the real slide components from seeded JSON in content/examples/<layout>.json (I will write them in Folio and export the JSON), "Best for" bullets, "How to write one" in 5 steps, and a CTA to /signup?template=<layout>. Unique title and meta description per page, canonical, and sitemap entries. Noindex any page with fewer than 3 examples.`),
    ],
    checklist: [
      'Make 3 example carousels per layout in Folio',
      ['Copy the template pages prompt', 'copy:fol-mk-in-templates-seo-prompt'],
      'Publish and add them to the sitemap',
    ],
  }),
  task({
    id: 'fol-mk-in-referral',
    title: 'Turn the "Made with Folio" mark into a referral loop',
    outcome: 'Every trial carousel posted on LinkedIn carries a small mark, and every referral that converts gives both sides a free month.',
    minutes: 45,
    xp: 35,
    blocks: [
      p('Trial carousels show a small "Made with Folio" line on the last slide. Readers who make carousels themselves ask "what did you use?". Make that easy to answer.'),
      prompt('fol-mk-in-referral-prompt', 'Paste into Claude Code', `
1. The "Made with Folio" mark on the CTA slide reads "Made with Folio · getfolio.app/r/<handle>" for trial users only.
2. app/r/[handle]/page.tsx stores ref=<handle> in a 30 day cookie and redirects to / with ?ref.
3. On signup, save profiles.referred_by. When the referred user's first invoice is paid (Stripe webhook invoice.paid, billing_reason subscription_create), apply a 100% off one-month coupon to both the referrer's and the new customer's next invoice (Stripe coupon "REFER1MONTH", duration once) and email both.
4. Settings > Referrals shows the link, a copy button, and the list of referred people with status.`),
    ],
    checklist: [
      ['Copy the referral prompt', 'copy:fol-mk-in-referral-prompt'],
      'Create the REFER1MONTH coupon in Stripe',
      'Test a referral end to end in test mode',
    ],
  }),
]

export const paid: Task[] = [
  task({
    id: 'fol-mk-paid-meta',
    title: 'Run a $105 Meta creative test',
    outcome: 'Seven days of $15 a day across 5 different ad ideas tells you which message makes people start a trial.',
    minutes: 60,
    xp: 45,
    blocks: [
      warn('Kill rule', 'Lifetime budget $105. Turn off any ad that spends $30 with zero signups. If the whole test brings zero trials, stop and put the time into DMs.'),
      steps(
        'Install Meta Pixel and fire StartTrial when subscriptions turns trialing (server side from the Stripe webhook with the same event_id as the browser event).',
        'Ads Manager → Create → Sales or Leads objective, one campaign, one ad set, broad targeting (age 25 to 55, your countries), Advantage+ placements.',
        'Make 5 ads that differ by idea, not wording: time saved, before and after, voice note demo, agency client count, "your blog is 40 carousels".',
        'Creative: 15 second screen recordings of Folio doing the job, captions burned in.',
        'Judge on cost per trial, not clicks.',
      ),
      code('fol-mk-paid-meta-copy', 'Five ad ideas', 'txt', `
1 Time: "Your carousel took 90 minutes in Canva. This one took 3." Paste link → slides → PDF.
2 Before/after: a plain text post next to the same post as a 9 slide carousel in brand colours.
3 Voice note: "Recorded on a walk. Posted on LinkedIn." Phone recording → carousel.
4 Agency: "10 clients. 10 brand kits. One calendar." Brand switcher → calendar.
5 Blog: "You already wrote 40 carousels. They are in your blog." Blog URL → carousel.
Headline: On-brand LinkedIn carousels in 3 minutes · Button: Start free trial`),
    ],
    checklist: [
      'Install Pixel and the server side StartTrial event',
      ['Copy the five ad ideas', 'copy:fol-mk-paid-meta-copy'],
      'Launch with a $105 lifetime budget and the kill rule',
    ],
  }),
  task({
    id: 'fol-mk-paid-creators',
    title: 'Sponsor 3 LinkedIn creators for one carousel each',
    outcome: 'Three creators your buyers follow post a carousel made in Folio, with a code, for $150 to $300 each.',
    minutes: 60,
    xp: 40,
    blocks: [
      steps(
        'Find creators with 10,000 to 50,000 followers who post about founder life, coaching or LinkedIn growth, and get 50+ comments per post.',
        'Offer $150 to $300 [verify going rates by asking 5 creators] for one carousel made in Folio from their own post, plus a line "Made this in 3 minutes with Folio. Code <NAME> for 20% off".',
        'Total budget $600. Kill rule: if the first sponsored post brings fewer than 5 trials, do not book the other two.',
        'Track with a Stripe coupon per creator and ?ref= links.',
      ),
      code('fol-mk-paid-creators-brief', 'Creator brief', 'txt', `
Post: one carousel you make in Folio from a post or video of yours. Your words, your style.
One line we ask for: "Made this in 3 minutes with Folio. Code {CODE} gets 20% off the first month."
Link in the first comment: getfolio.app/r/{handle}
You get: $ {fee} on posting, a free Agency account for 6 months, and 30% of referred revenue for 12 months.`),
    ],
    checklist: [
      'Shortlist 10 creators and ask 5 for their rate',
      ['Copy the creator brief', 'copy:fol-mk-paid-creators-brief'],
      'Book one creator first and measure trials before booking more',
    ],
  }),
  task({
    id: 'fol-mk-paid-newsletter',
    title: 'Buy one newsletter placement read by LinkedIn creators',
    outcome: 'One $150 to $400 placement in a newsletter about LinkedIn writing or creator growth, with a tracked link.',
    minutes: 45,
    xp: 30,
    blocks: [
      steps(
        'Search for newsletters about LinkedIn growth, ghostwriting and creator businesses with 3,000 to 30,000 readers. Ask for their open rate and price.',
        'Pick one where the price is under $0.05 per open [verify by asking].',
        'Offer: free hook generator plus a 7 day trial. Link with ?utm_source=newsletter&utm_campaign=<name>.',
        'Kill rule: under 5 trials from the placement, do not buy a second one in that newsletter.',
      ),
      code('fol-mk-paid-newsletter-copy', 'Placement copy (70 words)', 'txt', `
Folio turns your blog posts, YouTube videos and voice notes into LinkedIn carousels in your own colours and fonts. Paste a link, get a hook, 7 slides and a CTA, edit any slide with AI, export the PDF and schedule it to LinkedIn. Readers get a free 7 day trial: getfolio.app/?utm_source=newsletter&utm_campaign={name}`),
    ],
    checklist: [
      'List 5 newsletters and ask for prices and open rates',
      ['Copy the placement copy', 'copy:fol-mk-paid-newsletter-copy'],
      'Buy one placement and track trials for 7 days',
    ],
  }),
]

export const launchTasks: Task[] = [
  task({
    id: 'fol-launch-landing',
    title: 'Build the landing page and go live with Zernio in production',
    outcome: 'The landing page sells the trial and real customers can connect real LinkedIn and Instagram accounts.',
    minutes: 90,
    xp: 60,
    blocks: [
      prompt('fol-launch-landing-prompt', 'Paste into Claude Code', `
Build the marketing landing page at app/(marketing)/page.tsx exactly as specified in @LANDING.md, top to bottom: every section, the exact copy, the motion specs with reduced-motion fallbacks, the responsive notes, SEO metadata, JSON-LD, the OG image and every analytics event.
Use @DESIGN_SYSTEM.md as the base and the Folio accent from @DESIGN.md. Marketing is square. Wire the pricing toggle to the six STRIPE_PRICE_* env vars. Render the hero slide stack with the real slide components. Add /privacy and /terms pages linked from the footer.
When done, take screenshots at 375px and 1440px and fix anything that overflows.`),
      steps(
        'Create a production Zernio API key `folio-prod` and set it in the production Supabase project secrets. Point the Zernio webhook at the production function URL and set its secret.',
        'Turn on the Zernio Analytics add-on if you sell Pro or Agency with analytics.',
        'Raise the Anthropic monthly limit to cover your plan caps (about $1 per Creator customer at full use) and turn on auto reload.',
        'Move Firecrawl to Hobby and Supadata to Pro before your first 20 customers.',
        'Fill every [verify] cell in the comparison table from competitors\' live pages.',
      ),
    ],
    checklist: [
      ['Copy the landing page prompt', 'copy:fol-launch-landing-prompt'],
      'Switch Zernio, Anthropic, Firecrawl and Supadata to production keys and plans',
      'Fill every [verify] cell in the comparison table',
    ],
  }),
  task({
    id: 'fol-launch-ph',
    title: 'Launch on Product Hunt on a quiet day',
    outcome: 'A launch day that brings a spike of trials and backlinks, with a carousel of the launch itself made in Folio.',
    minutes: 120,
    xp: 50,
    blocks: [
      steps(
        'Pick a Sunday (top-3 rates are far higher on weekends than on Tuesdays).',
        'Gallery: 5 images made with Folio itself (yes, a carousel about Folio), plus the 45 second demo video.',
        'Tagline: "Blog, YouTube or voice note to on-brand LinkedIn carousels".',
        'First comment from you: the story (why you built it), what it does in 3 bullets, a launch offer (first month 50% off with code HUNT50, ends in 7 days).',
        'Tell your list, your partners and every trial user the night before. Ask for honest feedback, not upvotes.',
        'Post a carousel about the launch on LinkedIn at 08:30 your time.',
      ),
    ],
    checklist: [
      'Make the 5 gallery images in Folio',
      'Write the first comment and create the HUNT50 coupon',
      'Launch on a Sunday and post the LinkedIn carousel',
    ],
  }),
]
