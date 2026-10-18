// Bookwell marketing (outbound, inbound, paid) and launch tasks.
import type { Task } from '../../types'
import { ck, code, eli5, mistakes, p, prompt, steps, table, task, tip, warn } from './helpers'

export const outbound: Task[] = [
  task({
    id: 'bw-mk-out-list',
    title: 'Build a list of 200 local shops that book by DM',
    outcome: 'A sheet of 200 barbers, trainers, tutors and nail techs within driving distance, each with a booking signal.',
    minutes: 120,
    xp: 55,
    blocks: [
      eli5('Why a list first?', 'Every outbound task below pulls from this one sheet. A good row has a name, a trade, a way to reach them and one fact that shows they book by hand today. That fact is what makes your first message feel personal.'),
      steps(
        'Open a Google Sheet with columns: shop, owner first name, trade, area, Instagram, phone, Google Maps URL, booking signal, status, notes.',
        'Google Maps: search "barber near [your town]", "personal trainer [your town]", "nail salon [your town]", "tutor [your town]". Open each listing. Add it if there is no "Book online" button, or the button goes to a WhatsApp number.',
        'Instagram: open each shop\'s profile. Booking signal = the exact bio text, e.g. "DM to book", "WhatsApp 07... to book", "Link in bio" that goes to a Linktree with only a phone number.',
        'Skip chains and shops that already use Fresha, Booksy, Square or Vagaro (their booking button says so).',
        'Stop at 200 rows: about 80 barbers, 50 PTs, 40 nail and lash techs, 30 tutors.',
        'Status values: new, visited, DMed, called, trial, paying, not now.',
      ),
      tip('Speed it up', 'Ask Claude Code to write scripts/maps-to-sheet.ts that takes a list of Google Maps URLs you paste and pulls the name, phone and website for each with the Google Places API (Text Search, then Place Details). Keep the Instagram part manual: scraping Instagram breaks their terms.'),
    ],
    checklist: [
      ck('bw-mk-out-list-c1', 'Create the sheet with the 10 columns'),
      ck('bw-mk-out-list-c2', 'Add 200 shops with a booking signal each'),
      ck('bw-mk-out-list-c3', 'Remove shops already on another booking app'),
    ],
  }),
  task({
    id: 'bw-mk-out-walkin',
    title: 'Walk into 20 local barbers and gyms',
    outcome: '20 face to face pitches and at least 3 trials set up on the spot.',
    minutes: 180,
    xp: 70,
    blocks: [
      p('Local businesses buy from people they have met. Go at a quiet time (Tuesday to Thursday, 10am to 12pm) with your phone ready to set them up in 5 minutes.'),
      steps(
        'Pick 20 shops from your list within 2 miles of each other. Prefer ones whose Instagram bio says "DM to book".',
        'Print 20 small cards with a QR code to your landing page and your name and number on the back.',
        'Walk in, ask for the owner, use the script below. If they are busy, ask when is quiet and come back.',
        'If they say yes, sign them up on their phone, add one service and their hours there and then, and send yourself a test booking so they hear the text arrive.',
        'Log every answer in the sheet within the hour, including the objection word for word.',
      ),
      code('bw-mk-out-walkin-script', 'walk-in-script.txt', 'txt', `
"Hi, quick one, I will be 30 seconds. How many people a month book and do not turn up?
[wait]
I built Bookwell for shops like yours. People book from a link in your Instagram bio, pay a $10 deposit,
and get a text the day before. It goes straight into your Google Calendar.
It is free for 7 days. Can I set it up on your phone now? Takes 5 minutes."

If "I already use DMs and it is fine":
"Totally. How many no-shows last month? [wait] At $35 each that is $X. Bookwell is $19. If it saves one, it has paid for itself."

If "My customers will not pay a deposit":
"Set it to $0 for regulars and $10 for new people. The reminder text alone cuts most no-shows."

If "Send me something":
"Sure. What is your Instagram? I will make your page tonight and send you the link, so you can see it with your own services on it."`),
      tip('Bring proof', 'Have your own demo booking page open on your phone, with a fake barber shop, so they can tap through it. Better: make their page before you walk in (see the next task) and show them their own name.'),
      table(['Number to track', 'Good after 20 visits'], [
        ['Owner spoken to', '14+'],
        ['Set up on the spot', '3+'],
        ['Asked you to come back', '4+'],
        ['Paying after the trial', '2+'],
      ]),
    ],
    checklist: [
      ck('bw-mk-out-walkin-c1', 'List 20 local businesses on Google Maps'),
      ck('bw-mk-out-walkin-c2', 'Copy the walk-in script', 'copy:bw-mk-out-walkin-script'),
      ck('bw-mk-out-walkin-c3', 'Visit all 20 and log each answer'),
    ],
  }),
  task({
    id: 'bw-mk-out-instadm',
    title: 'DM 50 Instagram businesses that say "DM to book"',
    outcome: '50 targeted DMs to businesses that are booking by hand right now.',
    minutes: 75,
    xp: 45,
    blocks: [
      steps(
        'Search Instagram for "barber [your city]", "personal trainer [your city]", "tutor [your city]", or take rows from your sheet.',
        'Open profiles with "DM to book" or "WhatsApp to book" in the bio.',
        'Follow, like two recent posts, then send the DM below.',
        'Send 10 a day so the account is not flagged. Reply within an hour when someone answers.',
        'Follow up once after 3 days with the second message. Never a third.',
      ),
      code('bw-mk-out-instadm-dm', 'insta-dm.txt', 'txt', `
Message 1:
Hey! Love the {recent post detail}. Noticed you take bookings by DM. I made a booking link for barbers/PTs that takes a small deposit and texts people a reminder so they actually turn up. Want me to set one up for you free for a week? I can make it look like your brand.

Message 2 (3 days later, only if no reply):
Made you one anyway so you can see it: bookwell.app/b/{their-handle}. It has your {service} at {price}. If you like it, I will move it to your account and connect your calendar. If not, no worries, I will delete it.`),
      tip('Make it for them first', 'For the best 10 prospects, create their booking page yourself before you DM, then send them the live link. Seeing their own name and prices converts far better. Delete pages nobody claims after 14 days.'),
      table(['Number to track', 'Good after 50 DMs'], [
        ['Replies', '12+ (25%)'],
        ['Trials started', '5+'],
        ['Paying after the trial', '2+'],
      ]),
    ],
    checklist: [
      ck('bw-mk-out-instadm-c1', 'Find 50 "DM to book" profiles'),
      ck('bw-mk-out-instadm-c2', 'Copy the DM template', 'copy:bw-mk-out-instadm-dm'),
      ck('bw-mk-out-instadm-c3', 'Send 10 DMs today'),
    ],
  }),
  task({
    id: 'bw-mk-out-call',
    title: 'Call 40 shops in the quiet hour',
    outcome: '40 short phone calls to shops with a phone number on Google Maps and no online booking.',
    minutes: 120,
    xp: 50,
    blocks: [
      p('Many shops answer the phone between clients. A 60 second call with one question gets a yes or no faster than a DM. Call Tuesday to Thursday, 10:30 to 11:30 or 14:00 to 15:00.'),
      code('bw-mk-out-call-script', 'call-script.txt', 'txt', `
"Hi, is that {owner name}? I am {your name}, I am local, in {area}. Have you got 30 seconds?
[yes]
I noticed people book you by phone and Instagram. Do you get people who book and do not show up?
[wait, let them talk, write down the number they say]
I make a booking link for shops like yours. Customers pick a time, pay a small deposit, and get a text the day before.
Can I text you a page with your own services on it, so you can see it? It is free for 7 days."

If yes: "What is the best mobile for that?" Then make their page within 2 hours and text the link.
If no: "No problem. Can I check back in a month?" Log the date in the sheet.`),
      steps(
        'Take 40 rows from the sheet that have a phone number.',
        'Call with the script. Keep each call under 2 minutes.',
        'Make a page for every yes within 2 hours and text it from your own phone with: "Hi {name}, here is the page I mentioned: {link}. Tap a time and try it. {your name}"',
      ),
      warn('Calls, not texts', 'Only text a shop after they said yes on the call. Your Bookwell Twilio number is registered for booking texts only: one marketing text from it can get the campaign suspended, which stops every shop\'s reminders.'),
    ],
    checklist: [
      ck('bw-mk-out-call-c1', 'Copy the call script', 'copy:bw-mk-out-call-script'),
      ck('bw-mk-out-call-c2', 'Call 40 shops and log each answer'),
      ck('bw-mk-out-call-c3', 'Send a ready-made page to every yes within 2 hours'),
    ],
  }),
  task({
    id: 'bw-mk-out-partners',
    title: 'Pitch 5 local partners who talk to shop owners every week',
    outcome: 'Five partner conversations with barber suppliers, gym owners and training schools, each with a referral offer.',
    minutes: 90,
    xp: 45,
    blocks: [
      eli5('One partner, many shops', 'A barber supply shop sees 50 barbers a week. A gym rents space to 10 personal trainers. Convince the one person in the middle and they introduce you to all of them.'),
      table(['Partner', 'Why they care', 'Offer'], [
        ['Barber or beauty supply shop', 'Their customers are busier and buy more', 'Their QR poster at the till, 1 free month for every shop they send'],
        ['Gym that rents to freelance PTs', 'Fewer empty sessions in their space', 'A gym page listing every PT\'s Bookwell link'],
        ['Barber and beauty schools', 'Graduates need a way to get clients', 'Free first 2 months for every graduate'],
        ['Local business Facebook group admin', 'Useful content for members', 'A free no-show talk or the calculator post'],
        ['Accountant for sole traders', 'Clients with steadier income', 'A one-page "stop no-shows" guide with your link'],
      ]),
      code('bw-mk-out-partners-email', 'partner-email.txt', 'txt', `
Subject: Free tool for the {barbers / PTs} you work with

Hi {name},

I run Bookwell, a booking link for one-person shops: customers pick a time, pay a small deposit and get a text the day before, so far fewer people fail to turn up.

A lot of the {barbers / trainers} who come through {their business} still book by DM. Would you put a small poster with a QR code by your till / in the changing room? Every shop that signs up through it gets a free month, and so do you if you use it yourself.

I can drop the posters in this week. Does Thursday work?

{your name}
{your phone}`),
      steps(
        'Pick 5 partners from the table near you.',
        'Send the email, then visit in person 3 days later with 10 printed posters (download from your Booking page screen).',
        'Give each partner their own link with `?ref=partner-name` so you can count signups in profiles.referred_by.',
      ),
    ],
    checklist: [
      ck('bw-mk-out-partners-c1', 'Pick 5 partners and copy the email', 'copy:bw-mk-out-partners-email'),
      ck('bw-mk-out-partners-c2', 'Visit each partner with 10 posters'),
      ck('bw-mk-out-partners-c3', 'Give each partner a ref link and track signups'),
    ],
  }),
]

export const inbound: Task[] = [
  task({
    id: 'bw-mk-in-calculator',
    title: 'Publish a no-show cost calculator',
    outcome: 'A free tool page that ranks for "no show calculator" and starts trials.',
    minutes: 45,
    xp: 40,
    blocks: [
      prompt('bw-mk-in-calculator-prompt', 'Paste into Claude Code', `
Add app/(marketing)/no-show-calculator/page.tsx: "How much are no-shows costing you?"
Inputs: average appointment price, appointments per week, no-shows per month.
Output: money lost per month and per year in big numbers (tabular numbers, the boxes keep their size while typing), plus "With a $10 deposit and a reminder text, most shops cut no-shows by half. That is $X back a year."
Under it a Bookwell card with "Start 7-day free trial". Add SEO metadata (title "No-show cost calculator for barbers, trainers and salons"), FAQPage JSON-LD with 3 questions, and a share button that copies a link with the inputs in the URL. Mobile first, marketing tokens from @DESIGN.md section 12.`),
      steps('Deploy and open it live.', 'Post it in two local business Facebook groups as a free tool.', 'Add it to your walk-in cards as a second QR code.'),
      eli5('Why a calculator?', 'Owners rarely add up what no-shows cost. When they see "$1,680 a year" in big numbers, $19 a month suddenly looks small.'),
    ],
    checklist: [
      ck('bw-mk-in-calculator-c1', 'Copy the calculator prompt', 'copy:bw-mk-in-calculator-prompt'),
      ck('bw-mk-in-calculator-c2', 'Deploy the calculator page'),
      ck('bw-mk-in-calculator-c3', 'Share it in two local groups'),
    ],
  }),
  task({
    id: 'bw-mk-in-poweredby',
    title: 'Add a "Powered by Bookwell" link to every booking page',
    outcome: 'Every customer who books becomes a free ad for Bookwell.',
    minutes: 20,
    xp: 25,
    blocks: [
      p('Every booking page is seen by dozens of customers, and some of them run their own small business. A small footer link turns each page into a referral source. Studio shops can turn it off, which is one more reason to upgrade.'),
      prompt('bw-mk-in-poweredby-prompt', 'Paste into Claude Code', `
On app/b/[handle]/page.tsx and the done page add a small footer: "Booking by Bookwell. Run a business? Get your own booking page." linking to /?ref=<handle>. Hide it only when the shop is on Studio and hide_footer is true.
Store ref in a cookie on the landing page for 30 days and save it to profiles.referred_by on signup (the column already exists in the SQL).
Add a referred_by count to a simple admin query I can run: select referred_by, count(*) from public.profiles where referred_by is not null group by 1 order by 2 desc;`),
      steps('Deploy.', 'Make a test booking and click the footer link.', 'Sign up a test account and check referred_by is filled in the Supabase table editor.'),
    ],
    checklist: [
      ck('bw-mk-in-poweredby-c1', 'Copy the footer prompt', 'copy:bw-mk-in-poweredby-prompt'),
      ck('bw-mk-in-poweredby-c2', 'Check referred_by fills in after a test signup'),
    ],
  }),
  task({
    id: 'bw-mk-in-trades',
    title: 'Publish four trade landing pages',
    outcome: 'Pages for barbers, personal trainers, tutors and nail techs that each rank for "<trade> booking app".',
    minutes: 60,
    xp: 45,
    blocks: [
      p('Owners search for their own trade, not for "booking software". One page per trade with their words, their services and their prices ranks better and converts better than one general page.'),
      prompt('bw-mk-in-trades-prompt', 'Paste into Claude Code', `
Build app/(marketing)/for/[trade]/page.tsx reusing the landing page sections from @LANDING.md, with generateStaticParams for barbers, personal-trainers, tutors and nail-techs. Per trade, swap:
- H1: "Booking link for barbers with deposits and text reminders" (and the matching line for each trade).
- The hero phone mockup's services (barbers: Skin fade 45 min $35; PTs: 1:1 session 60 min $60; tutors: Maths GCSE 60 min $40; nail techs: Gel manicure 60 min $45).
- The problem section's example numbers.
- Three FAQs specific to the trade (e.g. PTs: "Can clients book a block of sessions?" Answer: not yet, each session is booked on its own).
- SEO title and description with the trade name, canonical URL, and the trade in the OG image text.
Link all four from the footer "For" column. Add them to sitemap.xml.`),
      table(['Page', 'Target search', 'Monthly searches'], [
        ['/for/barbers', 'barber booking app', '[verify in Google Keyword Planner]'],
        ['/for/personal-trainers', 'personal trainer booking app', '[verify]'],
        ['/for/tutors', 'tutor booking system', '[verify]'],
        ['/for/nail-techs', 'nail tech booking app', '[verify]'],
      ]),
      steps('Deploy.', 'Google Search Console → URL inspection → paste each URL → Request indexing.', 'Check back in 4 weeks under Performance → Pages.'),
    ],
    checklist: [
      ck('bw-mk-in-trades-c1', 'Copy the trade pages prompt', 'copy:bw-mk-in-trades-prompt'),
      ck('bw-mk-in-trades-c2', 'Deploy the four pages'),
      ck('bw-mk-in-trades-c3', 'Request indexing for each in Search Console'),
    ],
  }),
  task({
    id: 'bw-mk-in-poster',
    title: 'Give away a free "Book online" QR poster maker',
    outcome: 'A free tool any shop can use to print a window poster, which brings them into Bookwell.',
    minutes: 45,
    xp: 35,
    blocks: [
      eli5('A free gift with a hook', 'Many shops want a "scan to book" poster for the window even if they use WhatsApp. Let them make one for free. The poster says "Book online" and the QR code goes to a Bookwell page that is ready for them to claim.'),
      prompt('bw-mk-in-poster-prompt', 'Paste into Claude Code', `
Add app/(marketing)/qr-poster/page.tsx: "Free 'Book online' window poster".
Inputs: shop name, trade select, where bookings should go (a WhatsApp number, an Instagram handle or "Make me a Bookwell page").
Output: a live preview of the A4 poster from @DESIGN.md section 18 and a "Download PDF" button (reuse the poster route).
WhatsApp or Instagram: the QR goes to wa.me/<number> or instagram.com/<handle>, and the poster's small print says "Want deposits and reminder texts? bookwell.app".
"Make me a Bookwell page": ask for an email, send them to /signup with the shop name and trade prefilled.
SEO title "Free QR code booking poster for your shop window". Track poster_download with the choice.`),
      steps('Deploy.', 'Post it in r/Barber, r/personaltraining and two local Facebook groups as a free tool (read each group\'s rules first).', 'Count poster_download events per week in your analytics.'),
    ],
    checklist: [
      ck('bw-mk-in-poster-c1', 'Copy the poster maker prompt', 'copy:bw-mk-in-poster-prompt'),
      ck('bw-mk-in-poster-c2', 'Deploy and post it in 4 communities'),
    ],
  }),
  task({
    id: 'bw-mk-in-shorts',
    title: 'Post 10 short videos of real bookings',
    outcome: 'Ten 20 to 30 second videos on Instagram Reels, TikTok and YouTube Shorts that show the booking and the reminder text.',
    minutes: 120,
    xp: 45,
    blocks: [
      p('Shop owners watch other shop owners. A phone screen recording of a booking happening, with the text arriving, is the whole pitch in 20 seconds.'),
      code('bw-mk-in-shorts-ideas', 'video-ideas.txt', 'txt', `
1. "What a no-show costs a barber in a year" (calculator on screen, $1,680 counts up)
2. "Booking a skin fade in 15 seconds" (screen recording, sped up, ends on "Deposit paid")
3. "The text that stops no-shows" (lock screen, the reminder arrives)
4. "Reply C to cancel" (customer replies, slot opens on the booking page)
5. "Two people tap the same slot" (two phones, one gets "That slot was taken a moment ago")
6. "Setting up a booking page in 5 minutes" (owner app, time-lapse)
7. "Why I take a $10 deposit" (a real customer, with permission)
8. "DM to book vs a booking link" (split screen: 6 messages vs 3 taps)
9. "Print this for your window" (the QR poster)
10. "What happens when a customer cancels" (refund rule, slot reopens)

Caption formula: one line hook + "Booking link with deposits and text reminders, link in bio." + 3 trade hashtags.`),
      steps(
        'Record on your phone with your demo shop. Use the built-in screen recorder.',
        'Edit in CapCut: add captions, cut every pause, 20 to 30 seconds total.',
        'Post one a day for 10 days on all three platforms at the same time of day.',
        'After 10 days, make two more of whichever format got the most saves.',
      ),
    ],
    checklist: [
      ck('bw-mk-in-shorts-c1', 'Copy the 10 video ideas', 'copy:bw-mk-in-shorts-ideas'),
      ck('bw-mk-in-shorts-c2', 'Record and post the first 3 videos'),
      ck('bw-mk-in-shorts-c3', 'Post all 10 and note the best format'),
    ],
  }),
]

export const paid: Task[] = [
  task({
    id: 'bw-mk-paid-meta',
    title: 'Run a $100 Meta ads test to local service owners',
    outcome: 'A clear answer on whether Facebook and Instagram ads bring trials under $20 each.',
    minutes: 45,
    xp: 40,
    blocks: [
      warn('Hard stop at $100', 'Set a lifetime budget. If you get zero trials, stop and put the time into walk-ins instead.'),
      steps(
        'Go to business.facebook.com → Ads Manager → Create → Objective: Leads or Traffic (use Traffic if you have no pixel events yet).',
        'Location: your city plus 25 miles. Detailed targeting: interests "Barber", "Personal trainer", "Nail technician", "Small business owner". Age 22 to 50.',
        'Placements: Instagram Feed, Instagram Reels and Stories, Facebook Feed.',
        'Creative: video 2 from the shorts task (a 15 second booking on a phone).',
        'Paste the copy below, set a $100 lifetime budget over 7 days, publish.',
      ),
      code('bw-mk-paid-meta-copy', 'meta-ad.txt', 'txt', `
Primary text: Tired of people not turning up? Bookwell gives you a booking link with a $10 deposit and a reminder text. Goes straight into your Google Calendar. 7 days free.
Headline: Stop losing money to no-shows
Button: Learn more`),
      table(['Metric after $100', 'Keep going', 'Kill'], [
        ['Cost per click', 'under $1.50', 'over $3'],
        ['Landing to signup', 'over 4%', 'under 1.5%'],
        ['Cost per trial', 'under $20', 'over $40'],
      ]),
    ],
    checklist: [
      ck('bw-mk-paid-meta-c1', 'Record a 10 second booking video'),
      ck('bw-mk-paid-meta-c2', 'Copy the ad copy', 'copy:bw-mk-paid-meta-copy'),
      ck('bw-mk-paid-meta-c3', 'Publish with a $100 lifetime budget'),
    ],
  }),
  task({
    id: 'bw-mk-paid-search',
    title: 'Run a $150 Google Search test on "booking app for barbers"',
    outcome: 'Search ads on high-intent trade keywords, with a clear cost per trial after two weeks.',
    minutes: 60,
    xp: 45,
    blocks: [
      eli5('Search catches people already looking', 'Someone typing "booking app for barbers" has already decided they want one. You pay only when they click. Small budgets work if the keywords are narrow.'),
      steps(
        'ads.google.com → New campaign → Goal: Website traffic (switch to Leads once signups are tracked as a conversion) → Search.',
        'Networks: untick Display and Search partners.',
        'Location: United States (or your country), "Presence: people in or regularly in". Language English.',
        'Budget: $10 a day, Maximise clicks with a max CPC of $2.50, for 15 days ($150).',
        'Create one ad group per trade with the keywords below in [exact] and "phrase" match. Send each to its /for/<trade> page.',
        'Add the negative keywords below at campaign level.',
        'Add signup_complete as a conversion (Goals → Conversions → New → Website, or import from GA4).',
      ),
      code('bw-mk-paid-search-keywords', 'google-search-ads.txt', 'txt', `
Ad group: Barbers  -> /for/barbers
  [booking app for barbers]  "barber booking app"  "barber booking system"  "barber appointment app"
Ad group: Personal trainers -> /for/personal-trainers
  [booking app for personal trainers]  "personal trainer booking app"  "pt booking system"
Ad group: Tutors -> /for/tutors
  "tutor booking system"  "tutoring scheduling app"
Ad group: No-shows -> /no-show-calculator
  "reduce no shows salon"  "deposit for appointments app"

Negative keywords: free, jobs, job, hiring, course, school, template, login, near me, cuts, haircut

Headlines (pick 10): Booking Link For Barbers | Deposits And Text Reminders | Stop Losing Money To No-Shows | Goes Into Google Calendar | 7 Days Free, From $19/Month | Set Up In 10 Minutes | No App For Customers | Deposits To Your Own Bank | Built For One-Person Shops | Reply C To Cancel Texts
Descriptions: Customers pick a time, pay a small deposit and get a text the day before. Every booking lands in your Google Calendar. | One link for your Instagram bio. Double booking is impossible. Try it free for 7 days.`),
      table(['Metric after $150', 'Keep going', 'Kill'], [
        ['Click-through rate', 'over 5%', 'under 2%'],
        ['Cost per trial', 'under $25', 'over $50'],
        ['Trial to paid', 'over 30%', 'under 10%'],
      ]),
    ],
    checklist: [
      ck('bw-mk-paid-search-c1', 'Copy the keywords and ads', 'copy:bw-mk-paid-search-keywords'),
      ck('bw-mk-paid-search-c2', 'Launch the campaign at $10 a day for 15 days'),
      ck('bw-mk-paid-search-c3', 'Add signup_complete as a conversion'),
    ],
  }),
  task({
    id: 'bw-mk-paid-creators',
    title: 'Sponsor 3 local barber or PT creators for $300',
    outcome: 'Three posts by creators your buyers already follow, each with a trackable link.',
    minutes: 90,
    xp: 45,
    blocks: [
      p('A barber with 5,000 local followers who says "I use this" beats any ad. Pay small creators a flat fee to set up Bookwell for real and post about it.'),
      steps(
        'Find 10 barbers or PTs on Instagram or TikTok with 2,000 to 20,000 followers, mostly other professionals (look for "education", "barber tips", "PT business" content).',
        'DM the offer below. Aim for 3 yeses at $100 each.',
        'Give each creator a free Studio account for 6 months and a link with ?ref=<creator>.',
        'Pay half up front, half when the post is live. Ask for a Reel and a Story with the link sticker.',
      ),
      code('bw-mk-paid-creators-dm', 'creator-offer.txt', 'txt', `
Hey {name}, love your {specific video}. I make Bookwell, a booking link for barbers with deposits and text reminders.
Would you try it for real for 2 weeks, then post one honest Reel and a Story about it? I pay $100 (half now, half when it is up), plus 6 months of Studio free.
If you hate it, say so in the post, or keep the $50 and do not post. Your call.`),
      table(['Metric per creator', 'Good', 'Kill'], [
        ['Link clicks (ref)', '100+', 'under 20'],
        ['Trials', '5+', '0'],
        ['Cost per trial', 'under $20', 'over $100'],
      ]),
      tip('Use the paid partnership label', 'Ask creators to add the platform\'s "Paid partnership" label. Other shop owners trust an open recommendation more, and it gives you the post\'s reach numbers.'),
    ],
    checklist: [
      ck('bw-mk-paid-creators-c1', 'List 10 creators with 2k to 20k followers'),
      ck('bw-mk-paid-creators-c2', 'Send the creator offer', 'copy:bw-mk-paid-creators-dm'),
      ck('bw-mk-paid-creators-c3', 'Track each creator\'s ref signups'),
    ],
  }),
]

export const launchTasks: Task[] = [
  task({
    id: 'bw-launch-google-verify',
    title: 'Publish your Google OAuth app and write the landing page',
    outcome: 'Any barber can connect their calendar, and the landing page sells the trial.',
    minutes: 60,
    xp: 50,
    blocks: [
      eli5('Why "publish" the Google app?', 'While your Google app is in Testing mode, only people you list by email can connect. Publishing it lets anyone click "Allow". Calendar access is a sensitive scope, so Google checks your app first: it wants a privacy page, a short video of the app using the calendar, and your domain.'),
      steps(
        'Google Cloud → Google Auth Platform → Branding: add your live domain as an authorised domain, the home page URL, and the privacy page URL. Verify the domain in Google Search Console with the same Google account.',
        'Google Auth Platform → Audience → Publish app → Confirm.',
        'Google Auth Platform → Verification centre → Prepare for verification. For each scope, explain in one sentence: "calendar.freebusy: hide booking slots when the owner is busy. calendar.events: add each customer booking to the owner\'s calendar and remove it when cancelled."',
        'Record a 2 to 3 minute unlisted YouTube video: the consent screen with the client id visible in the URL, connecting a calendar, a booking appearing in Google Calendar, and busy time hiding a slot. Paste the link into the form and submit.',
        'Until approved (often a few days to a few weeks [verify]), add each new customer\'s Gmail as a test user (up to 100), or let them use Bookwell without a calendar.',
      ),
      prompt('bw-launch-landing-prompt', 'Paste into Claude Code', `
Build the marketing landing page at app/(marketing)/page.tsx exactly as specified in @LANDING.md, top to bottom: every section, the exact copy,
the motion specs with the reduced-motion fallbacks, the responsive notes, SEO metadata, JSON-LD, the OG image and every analytics event.
Use the marketing tokens from @DESIGN.md section 12, scoped to the marketing layout. Wire the pricing toggle to the four STRIPE_PRICE_* env vars. Add a /privacy page linked from the footer that says which Google data Bookwell reads (busy times) and writes (booking events), and that it is never shared or used for ads.
When done, take screenshots at 390px and 1440px wide and fix anything that overflows.`),
      mistakes([
        { mistake: 'Google rejects the video.', fix: 'It must show the OAuth consent screen with the browser URL bar visible (so the client id shows), and the app using each scope. Re-record in one take without cuts.' },
        { mistake: 'Google says the privacy policy does not mention Google data.', fix: 'Add a section "Google Calendar data" naming the two scopes, what you do with each, and that you follow the Google API Services User Data Policy, including the Limited Use rules.' },
      ]),
    ],
    checklist: [
      ck('bw-launch-c1', 'Add your domain and privacy page to the OAuth consent screen'),
      ck('bw-launch-c2', 'Click Publish app in Google Cloud'),
      ck('bw-launch-c3', 'Copy the landing page prompt', 'copy:bw-launch-landing-prompt'),
      ck('bw-launch-c4', 'Submit the verification form with the demo video'),
    ],
  }),
  task({
    id: 'bw-launch-live',
    title: 'Switch deposits and texts to live',
    outcome: 'Real deposits land in real shops\' banks and real customers get texts, with a $1 test you refund to yourself.',
    minutes: 45,
    xp: 45,
    blocks: [
      p('The Payments phase switches your own subscription billing to live. Bookwell has two more live switches: Stripe Connect and Twilio.'),
      steps(
        'Stripe → turn Test mode off → Connect → finish the platform profile Stripe asks for (business details, branding again in live mode).',
        'Live mode → Webhooks → Add destination → Connected accounts → the same six events → URL of bw-connect-webhook → copy the new live signing secret.',
        'Run `npx supabase secrets set STRIPE_SECRET_KEY=sk_live_... STRIPE_CONNECT_WEBHOOK_SECRET=whsec_...` in your terminal.',
        'Every shop that connected payouts in test mode must connect again: test connected accounts do not exist in live mode. Run `update public.businesses set stripe_account_id = null, stripe_charges_enabled = false;` once in the SQL Editor before your first real customer.',
        'Twilio: Messaging → Regulatory Compliance → check the A2P campaign status says Verified or Approved and is linked to the Bookwell Messaging Service.',
        'Make a real booking on your own shop page with a $1 deposit and your own card. Check the text arrives, then cancel from the manage link and check the $1 refund appears in Stripe.',
      ),
      code('bw-launch-live-sql', 'Supabase SQL Editor: live checks', 'sql', `
-- After step 4 every shop shows null and false until it connects payouts in live mode
select handle, stripe_account_id, stripe_charges_enabled from public.businesses;

-- Your $1 live booking: confirmed, then cancelled with a refund
select status, refund_status, deposit_cents, stripe_payment_intent_id from public.bookings order by created_at desc limit 1;

-- Texts delivered in the last hour
select kind, status, error_code from public.sms_messages where created_at > now() - interval '1 hour';`),
      mistakes([
        { mistake: 'Live deposits fail with "No such account".', fix: 'The business still has a test connected account id. Clear it (step 4) and connect payouts again in live mode.' },
        { mistake: 'Live texts fail with 30034.', fix: 'The campaign is not approved or not linked to the Messaging Service yet. Until it is, texts only reach numbers you verified in Twilio, and customers who gave an email get the email reminder instead.' },
      ]),
    ],
    checklist: [
      ck('bw-launch-live-c1', 'Create the live Connect webhook and set the live secrets'),
      ck('bw-launch-live-c2', 'Clear test connected accounts before the first real shop'),
      ck('bw-launch-live-c3', 'Make and refund a real $1 booking', 'copy:bw-launch-live-sql'),
    ],
  }),
]
