// Echo marketing tasks: outbound, inbound, paid.
import type { Task } from '../../types'

export const outbound: Task[] = [
  {
    id: 'ech-mk-out-list',
    title: 'Build a list of 300 active shows straight from their RSS feeds',
    outcome: 'A scored sheet of 300 podcasts that published in the last 14 days, with the host\'s public email, the show\'s gap and a tier.',
    minutes: 150,
    xp: 60,
    blocks: [
      { type: 'p', text: 'Podcasters publish their own contact details: almost every RSS feed carries an `<itunes:owner>` block with a name and email, because Apple asks for it. The feed also tells you how often they publish and whether their show notes are thin or missing chapters. That is your signal: an active show doing the post-production badly.' },
      { type: 'steps', items: [
        'Sign up for a free Podcast Index API key at api.podcastindex.org (key and secret by email) [verify the signup flow]. It lists over 4 million shows with their feed URLs.',
        'Pick 3 categories where hosts sell something (Business, Marketing, Entrepreneurship, Health coaching, Careers). Pull shows that are English, have 20+ episodes and published in the last 14 days. The Apple Podcasts top charts per category are a second free source.',
        'Paste the prompt below into Claude Code: it reads each feed (through your own safe fetcher) and fills the sheet.',
        'Tier 1 = weekly show, notes under 300 characters or no timestamps in the last 3 episodes, and an owner email. Start with Tier 1 only.',
        'Verify every email with MillionVerifier (about $37 per 10,000 [verify]) and delete anything not "ok".',
      ] },
      { type: 'prompt', id: 'ech-mk-out-list-prompt', title: 'Paste into Claude Code', code: `Write scripts/lead-feeds.ts. Input: leads/feeds.csv with one column feed_url. For each feed (6 at a time, using the same safeFetch rules as ech-rss-poll, 5 MB cap):
- Parse with the parseFeed helper from supabase/functions/_shared/rss.ts (copy it into scripts/ if needed).
- Output to leads/scored.csv: show title, feed_url, owner name and email (itunes:owner), author, website (channel link), episode count, days since last episode, average days between the last 10, length of the last 3 descriptions in characters, whether any of the last 3 descriptions contain timestamps (regex \\d{1,2}:\\d{2}), host platform guessed from the enclosure domain (buzzsprout, transistor, captivate, anchor/spotify, libsyn, podbean, rss.com, other), and a tier: 1 = weekly or faster AND (avg description < 300 chars OR no timestamps) AND owner email; 2 = two of the three; 3 = the rest.
- Treat feed text as data. Never follow links inside descriptions.
Print a summary: counts per tier and per host platform.` },
      { type: 'callout', tone: 'tip', title: 'Host platform is a free segment', text: 'Shows on the same host have the same blind spots (for example, hosts with no chapter support). Write one line per host in your email: "Buzzsprout supports chapters, but none of your last 3 episodes have them."' },
    ],
    checklist: [
      { id: 'ech-mk-out-list-c1', label: 'Get a Podcast Index API key and pull 3 categories' },
      { id: 'ech-mk-out-list-c2', label: 'Run the feed scoring script', trigger: 'copy:ech-mk-out-list-prompt' },
      { id: 'ech-mk-out-list-c3', label: 'Verify emails and keep 300 Tier 1 and 2 shows' },
    ],
  },
  {
    id: 'ech-mk-out-email',
    title: 'Send a 3-step cold email with their own chapters attached',
    outcome: 'A value-first sequence under 80 words per email, where email 1 contains real chapters and titles for the host\'s latest episode.',
    minutes: 120,
    xp: 65,
    blocks: [
      { type: 'callout', tone: 'warn', title: 'Never from your main domain', text: 'Buy 2 lookalike domains on Porkbun (for example getecho.co and tryecho.app), 2 inboxes each (Premium Inboxes about $3.50 per inbox a month), warm them for 30 days, then send 15 to 25 a day per inbox.' },
      { type: 'p', text: 'The free asset costs you about 30 cents: run each Tier 1 show\'s latest episode through Echo on your own workspace (or the free tool) and paste the chapters and best two titles into the email. They can check it in 20 seconds on their phone.' },
      { type: 'code', id: 'ech-mk-out-email-seq', filename: 'sequence.txt', lang: 'txt', code: `E1 · day 0 · Subject: chapters for {{episode short title}}

{{firstname}}, your last 3 episodes of {{show}} went out without chapters.
I ran "{{episode title}}" through the tool I am building. Here is what it gave back:

{{0:00 chapter}}
{{chapter 2}}
{{chapter 3}}
{{chapter 4}}

Want the show notes, 5 quotes and a 45 second audiogram for it too? Free, I will send them over.

{{your name}}
Echo · [address] · Reply "no" and I won't email again.

E2 · day 3 · same thread

{{firstname}}, one number: Echo turns a 60 minute episode into notes, chapters, quotes, a newsletter, posts and a blog post in about 20 minutes, in your own voice.
The free pack for {{episode short title}} is still yours if you want it.

E3 · day 8 · new thread · Subject: {{show}} on Google?

Last one. Your episodes are about 9,000 words each, and none of them are on a page Google can read.
If that matters this year, reply "page" and I will publish one for your latest episode so you can see it.` },
      { type: 'steps', items: [
        'For each Tier 1 row: run the latest episode in Echo, copy 4 chapters and the best title into the sheet.',
        'Hand-send the first 20 from Gmail on a warmed inbox. Log every reply.',
        'Then load the rest into Smartlead (Base $39/month) or Instantly (Growth $47/month) with the 3 steps and gaps above.',
        'Reply within the hour. A yes gets the full pack as a published Echo page link plus a Google Doc, and in the same message: "If you want this for every episode, here is a 7 day trial: {{link}}".',
      ] },
      { type: 'table', head: ['Metric', 'Target', 'Kill rule'], rows: [
        ['Positive reply rate', '5% or more (the asset is personal)', 'Under 2% after 300 sends: change the subject line and the first line'],
        ['Free packs sent', '1 per 40 sends', 'Under 1 per 150: lead with the audiogram instead of chapters'],
        ['Trial from free pack', '30% or more', 'Under 15%: the pack quality is the problem; check voice and titles'],
        ['Cost per trial', 'Under $20 (inboxes + domains + AI)', 'Over $50 for 3 weeks: pause and rewrite'],
      ] },
    ],
    checklist: [
      { id: 'ech-mk-out-email-c1', label: 'Buy 2 lookalike domains and start a 30 day warm-up' },
      { id: 'ech-mk-out-email-c2', label: 'Copy the sequence', trigger: 'copy:ech-mk-out-email-seq' },
      { id: 'ech-mk-out-email-c3', label: 'Run 20 latest episodes through Echo for the free asset' },
      { id: 'ech-mk-out-email-c4', label: 'Hand-send the first 20 emails' },
    ],
  },
  {
    id: 'ech-mk-out-agencies',
    title: 'Sign 5 B2B podcast agencies as design partners',
    outcome: 'Five agencies running 5 to 40 client shows each test the Agency plan on real client episodes and tell you what is missing.',
    minutes: 120,
    xp: 60,
    blocks: [
      { type: 'p', text: 'One agency is worth 7 indie hosts in revenue ($199 vs $29) and churns less, because Echo becomes part of how they deliver to clients. They are easy to find: they sell "done-for-you podcasting" in public.' },
      { type: 'steps', items: [
        'Find 60 agencies: Clutch.co "podcast production" category, Google "B2B podcast agency" and "done for you podcast", LinkedIn search for "podcast agency" founders, and the credits on B2B company shows ("Produced by ...").',
        'For each: founder name, number of client shows (count the shows on their portfolio page), what they deliver per episode (look for "show notes", "audiograms", "blog posts" on their pricing page).',
        'Pick one client show per agency and run its latest episode through Echo on your own workspace. Publish the page.',
        'Send the email below from your warmed inbox, or the LinkedIn version as a connection note follow-up.',
        'Offer: 60 days of Agency free for the first 5, in return for a 20 minute call every two weeks and a quote you can use.',
      ] },
      { type: 'code', id: 'ech-mk-out-agencies-email', filename: 'agency-email.txt', lang: 'txt', code: `Subject: {{client show}} deliverables

{{firstname}}, your pricing page says every {{agency}} episode ships with show notes, clips and a blog post.
I ran {{client show}}'s latest episode through Echo, the tool I am building for podcast agencies: {{published page link}}
It wrote the notes, chapters, 5 quotes, a newsletter, posts and a blog post in about 20 minutes, and rendered the clips.

I am looking for 5 agencies to run it free for 60 days on real client shows and tell me what is missing. Worth a look?

{{your name}}

LinkedIn follow-up (after they accept):
Thanks {{firstname}}. I made this from {{client show}}'s last episode: {{link}}. If your team still writes deliverables by hand, I would love 20 minutes of feedback. 60 days free in return.` },
      { type: 'table', head: ['Metric', 'Target', 'Kill rule'], rows: [
        ['Reply rate', '10% or more', 'Under 4% after 60 agencies: lead with the clip (attach the MP4) instead of the page'],
        ['Design partners signed', '5 in 3 weeks', 'Under 2: ask the ones who said no what they use today, and fix that gap first'],
        ['Partners paying at day 60', '3 of 5', 'Under 2: interview both and do not scale agency outreach until fixed'],
      ] },
    ],
    checklist: [
      { id: 'ech-mk-out-agencies-c1', label: 'List 60 podcast agencies with founder and client shows' },
      { id: 'ech-mk-out-agencies-c2', label: 'Publish an Echo page for one client show per agency' },
      { id: 'ech-mk-out-agencies-c3', label: 'Copy the agency email', trigger: 'copy:ech-mk-out-agencies-email' },
      { id: 'ech-mk-out-agencies-c4', label: 'Sign your first design partner' },
    ],
  },
  {
    id: 'ech-mk-out-brands',
    title: 'Pitch marketing teams with a branded show an SEO blog post',
    outcome: 'Content and marketing managers at companies with a podcast get a ready blog post from their last episode, and a Studio trial.',
    minutes: 90,
    xp: 50,
    blocks: [
      { type: 'p', text: 'A company show is judged on pipeline and search traffic, not downloads. The marketing manager has a blog to fill every week and 9,000 words of expert talk sitting unused. Your hook is the blog post, not the show notes.' },
      { type: 'steps', items: [
        'Find 100 company shows: Apple Podcasts search "by <company>" in Business and Technology, the "podcast" link in the footer of SaaS websites, and LinkedIn posts with "new episode" from company pages.',
        'Find the owner: LinkedIn search "<company> content marketing manager" or "head of content". Work email with Apollo free credits, verified with MillionVerifier.',
        'Signal: the company blog has not published in 30 days, or the show page has no transcript.',
        'Run their latest episode through Echo and publish the blog asset as a Google Doc (Copy as Markdown, paste into a Doc).',
      ] },
      { type: 'code', id: 'ech-mk-out-brands-email', filename: 'brand-email.txt', lang: 'txt', code: `Subject: blog post from {{show}} ep {{number}}

{{firstname}}, {{company}}'s last episode with {{guest}} has about 9,000 words of expert material, and the blog's last post was {{date}}.
I turned that episode into a 1,500 word article aimed at "{{target keyword}}": {{doc link}}
Free to publish if you like it.

It is made by Echo, which does this for every episode, plus notes, posts and a transcript page.

{{your name}} · Reply "no" and I won't email again.` },
      { type: 'table', head: ['Metric', 'Target', 'Kill rule'], rows: [
        ['Reply rate', '6% or more', 'Under 2% after 100: switch the target to the host (often a founder) instead of marketing'],
        ['Article published by them', '1 in 10 replies', 'If none publish, the article is not good enough: improve the blog prompt before sending more'],
      ] },
    ],
    checklist: [
      { id: 'ech-mk-out-brands-c1', label: 'List 100 company shows and their content owner' },
      { id: 'ech-mk-out-brands-c2', label: 'Make 10 blog posts from their latest episodes' },
      { id: 'ech-mk-out-brands-c3', label: 'Copy the brand email and send 10', trigger: 'copy:ech-mk-out-brands-email' },
    ],
  },
  {
    id: 'ech-mk-out-social',
    title: 'Answer "show notes" and "chapters" questions in podcaster communities',
    outcome: 'A daily 30 minute routine of helpful replies and short DMs where podcasters ask about post-production.',
    minutes: 30,
    xp: 35,
    blocks: [
      { type: 'steps', items: [
        'Set up F5Bot (free) alerts for: "show notes", "podcast chapters", "audiogram", "castmagic", "headliner app", "podcast transcript". It emails you Reddit and Hacker News mentions within minutes.',
        'Join r/podcasting, r/podcast, the Podcasters\' Support Group on Facebook [verify name] and 2 podcast Discord or Slack groups. Read the rules on self-promotion first.',
        'Every day, 9:00 to 9:30: reply to 5 posts with a real answer (how to add chapters on their host, a free method first). Mention Echo only if they ask what you use.',
        'On LinkedIn and X: search "new episode" posts from hosts in your list, leave a specific comment on the episode, then send the DM below the next day.',
      ] },
      { type: 'code', id: 'ech-mk-out-social-dm', filename: 'dm.txt', lang: 'txt', code: `Hey {{name}}, enjoyed the bit in ep {{number}} about {{topic}}.
I made a 45 second clip of it with captions while testing a tool I am building: {{link to MP4}}
Yours to post if you want it. Happy to make one for every episode if it is useful.` },
      { type: 'table', head: ['Metric', 'Target', 'Kill rule'], rows: [
        ['Helpful replies a week', '25', 'Never skip a week; it compounds'],
        ['DM reply rate', '20% or more', 'Under 10% after 50 DMs: pick a better moment for the clip (the hook in the first 3 seconds)'],
        ['Trials from social a month', '5', 'Under 2 after 6 weeks: move the 30 minutes to cold email'],
      ] },
    ],
    checklist: [
      { id: 'ech-mk-out-social-c1', label: 'Set up 6 F5Bot keyword alerts' },
      { id: 'ech-mk-out-social-c2', label: 'Join 4 podcaster communities and read their rules' },
      { id: 'ech-mk-out-social-c3', label: 'Copy the DM and send 10 with real clips', trigger: 'copy:ech-mk-out-social-dm' },
    ],
  },
]

export const inbound: Task[] = [
  {
    id: 'ech-mk-in-badge',
    title: 'Turn every public episode page into a signup source',
    outcome: 'The "Made with Echo" badge on Creator pages is tracked, and you know how many trials each customer\'s pages bring in.',
    minutes: 45,
    xp: 45,
    blocks: [
      { type: 'callout', tone: 'eli5', title: 'A growth loop', text: 'Every Creator customer publishes episode pages. Every page has a small "Made with Echo" link. Listeners include other podcasters, who click it. More customers make more pages, which bring more customers. You build it once and it keeps running.' },
      { type: 'prompt', id: 'ech-mk-in-badge-prompt', title: 'Paste into Claude Code', code: `Read @PRD.md section 17.
1. The badge link is /?ref=<show slug>&utm_source=echo_badge&utm_medium=episode_page. On landing, store ref in a first-party cookie for 30 days and add it to the signup as user metadata (raw_user_meta_data.ref).
2. PostHog: capture badge_clicked on the public page (send with navigator.sendBeacon) and include ref on signup_completed.
3. Add an admin-only page /app/admin/referrals (only my user id from an env var ADMIN_USER_ID) listing ref, clicks, signups, trials, paid, for the last 90 days.
4. On the Studio and Agency upgrade card in Billing, add the line "Hide the Made with Echo badge" so the badge is also an upgrade reason.
5. Make sure every public page has a canonical URL, is in sitemap.xml, and that published pages are submitted in Google Search Console (I will verify the domain).` },
      { type: 'steps', items: [
        'Google Search Console > Add property > Domain > your domain. Add the TXT record in Porkbun DNS. Submit /sitemap.xml.',
        'Every Monday, open /app/admin/referrals and write the week\'s badge clicks and trials in your metrics sheet.',
        'When a customer\'s pages bring 3+ trials, email them a free month as thanks. It turns them into advocates.',
      ] },
    ],
    checklist: [
      { id: 'ech-mk-in-badge-c1', label: 'Copy the badge tracking prompt', trigger: 'copy:ech-mk-in-badge-prompt' },
      { id: 'ech-mk-in-badge-c2', label: 'Verify your domain in Google Search Console and submit the sitemap' },
      { id: 'ech-mk-in-badge-c3', label: 'Record badge clicks and trials every Monday' },
    ],
  },
  {
    id: 'ech-mk-in-tools',
    title: 'Publish three free tools that rank: show notes, chapters, titles',
    outcome: 'Three tool pages, each answering one search, all running on the capped free-tool function and ending in a trial.',
    minutes: 120,
    xp: 60,
    blocks: [
      { type: 'p', text: 'People search for "podcast show notes generator", "podcast chapter generator" and "podcast title generator" [verify volumes in Search Console or a keyword tool]. A page that does the job for free, with a real result in two minutes, ranks and converts better than a blog post about it.' },
      { type: 'prompt', id: 'ech-mk-in-tools-prompt', title: 'Paste into Claude Code', code: `Read @LANDING.md sections 6 and 16 and @PRD.md section 13.9.
Build three pages on the ech-free-tool function, all with the same component and different copy and output emphasis:
- /tools/show-notes-generator (H1 "Free podcast show notes generator")
- /tools/podcast-chapter-generator (H1 "Free podcast chapter generator", shows chapters first with a Copy button in YouTube and podcast-host formats)
- /tools/podcast-title-generator (H1 "Free podcast episode title generator")
Each page: RSS URL input, the working state with the live dot and "About 2 minutes for a 60 minute episode", the result, then a "Get the full pack for every episode" block with the trial button. Under the tool, 600 words of how-to copy for the search term (how to write good show notes / how to add chapters on Buzzsprout, Transistor, Captivate and Spotify / what makes a good title), an FAQ with FAQPage JSON-LD, and links to the other two tools.
Title and meta description per page under 60 and 155 characters. Add all three to the sitemap and the footer. PostHog events tool_used with tool name and tool_signup_clicked.` },
      { type: 'table', head: ['Metric', 'Target at 90 days', 'Kill rule'], rows: [
        ['Impressions in Search Console', '5,000 a month across the 3 pages', 'Under 500 at day 90: rewrite titles to match the queries Search Console shows'],
        ['Tool runs to trial', '8% or more', 'Under 3%: the result panel needs a stronger next step (show the audiogram preview)'],
        ['Free tool cost', 'Under $11 a month (40 hour cap)', 'Cap reached before the 20th: lower the per-IP limit or require an email'],
      ] },
    ],
    checklist: [
      { id: 'ech-mk-in-tools-c1', label: 'Copy the free tools prompt', trigger: 'copy:ech-mk-in-tools-prompt' },
      { id: 'ech-mk-in-tools-c2', label: 'Run each tool on your own feed and check the result' },
      { id: 'ech-mk-in-tools-c3', label: 'Submit the three URLs in Search Console' },
    ],
  },
  {
    id: 'ech-mk-in-compare',
    title: 'Write honest comparison pages for Castmagic, Podsqueeze, Headliner and Swell',
    outcome: 'Four /compare pages that rank for "<competitor> alternative" and show, with a real episode, what each tool produces.',
    minutes: 120,
    xp: 55,
    blocks: [
      { type: 'steps', items: [
        'Sign up for the free trial or free plan of each competitor [verify which offer one]. Run the same public 30 minute episode through each, and through Echo.',
        'Screenshot each output (notes, chapters, clips). Note price, hours included and what is missing, with the date checked.',
        'Paste the prompt below with your notes.',
        'Re-check every competitor price each quarter and update the "checked" date on the page.',
      ] },
      { type: 'prompt', id: 'ech-mk-in-compare-prompt', title: 'Paste into Claude Code', code: `Build app/(marketing)/compare/[competitor]/page.tsx with static params castmagic, podsqueeze, headliner, swell.
Content per page comes from content/compare/<competitor>.md which I will fill from my notes (create the four files with the headings below and placeholder text marked TODO):
- H1 "Echo vs <Competitor>: <one line honest summary>"
- "Who should pick <Competitor>" (be fair: list what they do better)
- "Who should pick Echo"
- Side by side: the same episode's chapters and 2 titles from both tools, as text, with "Checked <date>"
- The comparison table from @LANDING.md section 9 with this competitor's column highlighted and every unconfirmed cell marked [verify] until I check it
- Pricing at equal hours (6, 20, 50 audio hours a month)
- FAQ (3 questions) with FAQPage JSON-LD
- CTA "Try Echo free on your latest episode" linking to the free tool with the competitor in utm_content
Title "<Competitor> alternative for show notes and audiograms | Echo" (under 60 characters, shorten if needed). No claims we cannot show.` },
      { type: 'callout', tone: 'tip', title: 'Fair beats loud', text: 'Comparison pages that admit where the other tool wins get trusted, linked and quoted. Say plainly if Headliner has more audiogram templates; then show what Echo does that it cannot.' },
    ],
    checklist: [
      { id: 'ech-mk-in-compare-c1', label: 'Run the same episode through all four competitors and Echo' },
      { id: 'ech-mk-in-compare-c2', label: 'Copy the comparison pages prompt', trigger: 'copy:ech-mk-in-compare-prompt' },
      { id: 'ech-mk-in-compare-c3', label: 'Fill the four content files and publish' },
    ],
  },
  {
    id: 'ech-mk-in-youtube',
    title: 'Record 10 search-intent YouTube how-tos for podcasters',
    outcome: 'Ten short videos answering exact questions podcasters search, each showing the free way first and Echo second.',
    minutes: 300,
    xp: 70,
    blocks: [
      { type: 'p', text: 'Podcasters live on YouTube for how-tos. A 5 minute video that answers "how do I add chapters to my podcast on Spotify" keeps getting views for years, and the person watching is exactly your buyer.' },
      { type: 'code', id: 'ech-mk-in-youtube-list', filename: 'video-list.txt', lang: 'txt', code: `1. How to add chapters to your podcast (Apple, Spotify, YouTube)
2. How to write podcast show notes that get clicks (with a free template)
3. How to make an audiogram for free in 2026
4. How to get a transcript of your podcast on Apple Podcasts and Spotify
5. Podcast SEO: how to get your episodes on Google
6. How to turn one podcast episode into a week of LinkedIn posts
7. How to write a podcast newsletter from your episode in 10 minutes
8. Buzzsprout vs Transistor vs Captivate: chapters, transcripts and SEO compared
9. How podcast agencies deliver show notes, clips and blogs for 20 clients
10. Castmagic vs Echo vs ChatGPT: same episode, three results

Script shape for each (4 to 7 minutes):
0:00 The exact question, answered in one sentence
0:20 The free way, step by step on screen
3:00 Where the free way hurts (time, mistakes)
3:40 The same job in Echo, real episode, real timer on screen
5:00 One line: "Link to try it on your latest episode is below"` },
      { type: 'steps', items: [
        'Record with Screen Studio or OBS, face cam optional. One take, cut the pauses.',
        'Make the thumbnail with the question as 4 to 6 words. Title = the search phrase.',
        'Description: the answer in 2 lines, chapters (made with Echo from the video\'s own audio), and the free tool link with utm_source=youtube.',
        'Post one a week. Cut a 45 second vertical audiogram of the best moment with Echo and post it to Shorts and LinkedIn the same day.',
      ] },
      { type: 'table', head: ['Metric', 'Target', 'Kill rule'], rows: [
        ['Views per video at 60 days', '500+', 'Under 100 for the first 5: titles do not match searches; check YouTube search suggestions before naming'],
        ['Clicks to the free tool', '2% of views', 'Under 0.5%: move the link to the pinned comment and say it out loud at 0:20'],
      ] },
    ],
    checklist: [
      { id: 'ech-mk-in-youtube-c1', label: 'Copy the video list and script shape', trigger: 'copy:ech-mk-in-youtube-list' },
      { id: 'ech-mk-in-youtube-c2', label: 'Record and publish the first video' },
      { id: 'ech-mk-in-youtube-c3', label: 'Post its audiogram to Shorts and LinkedIn' },
    ],
  },
  {
    id: 'ech-mk-in-linkedin',
    title: 'Post a weekly "show notes teardown" on LinkedIn',
    outcome: 'A weekly post that reviews how one well-known show handles post-production, building an audience of hosts and agencies.',
    minutes: 60,
    xp: 40,
    blocks: [
      { type: 'p', text: 'Hosts and agency owners read LinkedIn. A teardown is useful, a bit spicy, and naturally shows what good looks like. Never trash the show; praise what works and suggest one fix.' },
      { type: 'code', id: 'ech-mk-in-linkedin-post', filename: 'teardown-post.txt', lang: 'txt', code: `I read the show notes of {{show}}'s last 5 episodes. Here is what they get right, and the one thing I would change.

What works:
→ {{specific thing 1, with a number}}
→ {{specific thing 2}}

What I would change:
→ {{one fix, e.g. "no chapters on a 70 minute episode, so Spotify shows a single long bar"}}

What that costs them: {{a plain estimate, e.g. "listeners who want the pricing section scrub for it, or leave"}}

I build Echo, which writes notes, chapters and clips from the episode. But you can fix this one by hand in 10 minutes: {{how}}.

Which show should I tear down next?` },
      { type: 'steps', items: [
        'Pick one show a week from the top 50 in Business or Marketing.',
        'Post Tuesday or Wednesday morning, reply to every comment in the first hour.',
        'Tag the host only if the post is positive overall.',
        'Every 4th week, post a teardown of your own show (or Echo\'s demo show) with the before and after.',
      ] },
    ],
    checklist: [
      { id: 'ech-mk-in-linkedin-c1', label: 'Copy the teardown template', trigger: 'copy:ech-mk-in-linkedin-post' },
      { id: 'ech-mk-in-linkedin-c2', label: 'Publish the first teardown and reply to every comment' },
      { id: 'ech-mk-in-linkedin-c3', label: 'Plan the next 4 shows to tear down' },
    ],
  },
  {
    id: 'ech-mk-in-template',
    title: 'Publish a show notes template and a podcast SEO checklist',
    outcome: 'Two lead magnet pages that collect emails from podcasters and send them a 5 day email course that ends in a trial.',
    minutes: 90,
    xp: 45,
    blocks: [
      { type: 'prompt', id: 'ech-mk-in-template-prompt', title: 'Paste into Claude Code', code: `Build two marketing pages:
1. /resources/podcast-show-notes-template: H1 "Podcast show notes template (copy and paste)". The template itself in a copyable block (summary, key points, chapters, resources, guest bio, links, call to action), 3 filled examples for an interview show, a solo show and a company show, and a "Get it as a Google Doc" email form.
2. /resources/podcast-seo-checklist: H1 "Podcast SEO checklist: 15 things to do for every episode". A checklist with checkboxes that remember state in localStorage, grouped Before, At publish, After. Email form "Send me the checklist and the 5 day course".
Email form: insert into a new table public.leads (email, source, created_at; RLS on, insert only via a Next.js route with a rate limit of 5 per IP per hour, no select policy) and send the first email through Resend.
Write a 5 day Resend sequence (days 0, 1, 2, 4, 6) in emails/course/*.tsx: day 0 the asset, day 1 chapters, day 2 transcripts and SEO, day 4 audiograms, day 6 "do all of this in 20 minutes" with the trial link. Send them from a daily cron route (Vercel cron) that checks email_log so nobody gets a day twice. Every email has an unsubscribe link that writes email_suppressions.` },
      { type: 'table', head: ['Metric', 'Target', 'Kill rule'], rows: [
        ['Email signups a month', '100 by month 3', 'Under 30: link the template from every YouTube description and the free tools'],
        ['Course to trial', '5%', 'Under 2%: move the trial offer to day 2 with the audiogram'],
      ] },
    ],
    checklist: [
      { id: 'ech-mk-in-template-c1', label: 'Copy the lead magnet prompt', trigger: 'copy:ech-mk-in-template-prompt' },
      { id: 'ech-mk-in-template-c2', label: 'Sign up yourself and receive all 5 emails' },
      { id: 'ech-mk-in-template-c3', label: 'Link both pages from the footer and the free tools' },
    ],
  },
]

export const paid: Task[] = [
  {
    id: 'ech-mk-paid-meta',
    title: 'Run a $15 a day Meta test with audiograms as the ads',
    outcome: 'A 7 day creative test where the ads are Echo audiograms of your own demo episode, judged on cost per trial.',
    minutes: 90,
    xp: 50,
    blocks: [
      { type: 'callout', tone: 'warn', title: 'Earn it first', text: 'Run conversion ads only after 10 paying customers and a landing page that converts from outreach. Before that, this $105 test is message research: which angle makes a podcaster stop scrolling.' },
      { type: 'steps', items: [
        'Install the Meta Pixel with the prompt from the course (Lead on signup, StartTrial when the subscription is trialing, Purchase server-side from the Stripe webhook).',
        'Record a 20 minute demo episode about podcast growth with a friend. Run it through Echo and render 6 audiograms, each a different angle (see the grid below).',
        'Ads Manager > Create > Sales (or Leads) > one campaign, one ad set, broad targeting (English-speaking countries, 25 to 55), Advantage+ placements, $15 a day, optimise for StartTrial if you have 50 a week, otherwise Lead.',
        'Upload the 6 audiograms as 6 ads with the copy below. Run 7 days without touching it.',
      ] },
      { type: 'code', id: 'ech-mk-paid-meta-copy', filename: 'meta-ads.txt', lang: 'txt', code: `Angle grid (one audiogram each):
1. Time: "4 hours of show notes, done in 20 minutes"
2. Proof: the audiogram itself, caption "This clip was made automatically"
3. SEO: "Your episodes have 9,000 words. Google sees none of them"
4. Voice: "Show notes that sound like you, not like ChatGPT"
5. Agency: "25 client shows. One login. Every deliverable."
6. Contrarian: "Stop writing show notes. Nobody reads them. Publish a transcript page instead"

Primary text (under 125 characters):
Drop in your episode. Get notes, chapters, quotes, posts, a blog post and clips like this one. 7 days free.

Headline: Every episode, written up and clipped
Button: Sign up
URL: https://getecho.app/?utm_source=meta&utm_campaign=angle_test&utm_content={{angle number}}` },
      { type: 'table', head: ['Metric', 'Target', 'Kill rule'], rows: [
        ['Thumb-stop (3 s views / impressions)', '30% or more', 'Under 15% on an ad after 2,000 impressions: kill that ad'],
        ['Cost per trial', 'Under $40', 'Over $80 after 7 days: stop the campaign, keep the best angle for organic posts'],
        ['Trial to paid', '35% or more', 'Under 20%: ads attract the wrong people; narrow to podcasting interests'],
      ] },
    ],
    checklist: [
      { id: 'ech-mk-paid-meta-c1', label: 'Install the Pixel and test the three events' },
      { id: 'ech-mk-paid-meta-c2', label: 'Render 6 audiograms, one per angle' },
      { id: 'ech-mk-paid-meta-c3', label: 'Copy the ad copy and launch at $15 a day', trigger: 'copy:ech-mk-paid-meta-copy' },
      { id: 'ech-mk-paid-meta-c4', label: 'Judge on day 7 with the kill rules' },
    ],
  },
  {
    id: 'ech-mk-paid-search',
    title: 'Bid on "alternative" and "generator" searches in Google Ads',
    outcome: 'A tightly capped Google Search campaign on high-intent keywords, sending people to the matching compare page or free tool.',
    minutes: 75,
    xp: 45,
    blocks: [
      { type: 'steps', items: [
        'Google Ads > New campaign > Website traffic > Search. Turn off Display and Search partners. Budget $20 a day, Maximise clicks with a $3 max CPC to start.',
        'Make 2 ad groups (below), exact and phrase match only. Add negatives: free download, jobs, course, music, microphone, how to start a podcast.',
        'Each ad group sends people to its own page: the compare page for alternatives, the matching free tool for generators.',
        'Import conversions: StartTrial from your site (Google tag, or GA4 key events).',
      ] },
      { type: 'code', id: 'ech-mk-paid-search-keywords', filename: 'google-ads.txt', lang: 'txt', code: `Ad group 1: alternatives -> /compare/<competitor>
[castmagic alternative]  "castmagic alternative"  "castmagic vs"
[podsqueeze alternative] "podsqueeze alternative"
[headliner alternative]  "headliner app alternative" "audiogram maker"
[swell ai alternative]

Ad group 2: generators -> /tools/<tool>
[podcast show notes generator] "show notes generator"
[podcast chapter generator]    "podcast chapters"
[podcast title generator]
[podcast transcript generator]

Responsive search ad, headlines (30 chars max):
Notes, Chapters and Clips
Every Episode in 20 Minutes
Free on Your Latest Episode
Written in Your Own Voice
Quotes Checked Word for Word
Audiograms With Captions

Descriptions (90 chars max):
Drop in an episode or RSS feed. Get show notes, chapters, quotes, posts and audiograms.
Try it free on your latest episode. 7 day trial on every plan from $29 a month.` },
      { type: 'table', head: ['Metric', 'Target', 'Kill rule'], rows: [
        ['CPC', 'Under $3', 'Over $5 average after 100 clicks: pause that keyword'],
        ['Cost per trial', 'Under $50', 'Over $100 after $300 spent: stop and move the budget to newsletter sponsorships'],
        ['Click to trial', '6% or more', 'Under 2%: the landing page does not match the search; fix the page, not the bid'],
      ] },
    ],
    checklist: [
      { id: 'ech-mk-paid-search-c1', label: 'Create the Search campaign with $20 a day' },
      { id: 'ech-mk-paid-search-c2', label: 'Copy the keywords and ads', trigger: 'copy:ech-mk-paid-search-keywords' },
      { id: 'ech-mk-paid-search-c3', label: 'Set up the StartTrial conversion' },
      { id: 'ech-mk-paid-search-c4', label: 'Review after $300 with the kill rules' },
    ],
  },
  {
    id: 'ech-mk-paid-newsletter',
    title: 'Sponsor one podcasting newsletter issue',
    outcome: 'One sponsored slot in a newsletter read by podcasters, with a tracked offer, and a clear rule for whether to buy again.',
    minutes: 60,
    xp: 40,
    blocks: [
      { type: 'steps', items: [
        'Shortlist 3 newsletters read by podcasters and podcast agencies (Podnews is the best known; ask each for its rate card, subscriber count and click rate [verify current prices]).',
        'Prefer a "classified" or single text slot under $500 for the first test.',
        'Use the copy below with a unique URL (utm_source=<newsletter>) and a code that extends the trial to 14 days so you can count redemptions.',
        'Track for 14 days after the send.',
      ] },
      { type: 'code', id: 'ech-mk-paid-newsletter-copy', filename: 'newsletter-ad.txt', lang: 'txt', code: `Echo writes up every episode for you. Drop in your episode or connect your RSS feed and get show notes, chapters, 5 word-for-word quotes, a newsletter, social posts, an SEO blog post and vertical audiograms in about 20 minutes, in your own voice. Readers get a 14 day trial: getecho.app/?ref={{newsletter}}` },
      { type: 'table', head: ['Metric', 'Target', 'Kill rule'], rows: [
        ['Cost per trial', 'Under $40', 'Over $100: do not rebook this newsletter'],
        ['Paid customers within 30 days', 'Covers the slot within 3 months of their payments', 'If not, try one other newsletter, then stop the channel'],
      ] },
    ],
    checklist: [
      { id: 'ech-mk-paid-newsletter-c1', label: 'Get rate cards from 3 newsletters' },
      { id: 'ech-mk-paid-newsletter-c2', label: 'Copy the ad and book one slot under $500', trigger: 'copy:ech-mk-paid-newsletter-copy' },
      { id: 'ech-mk-paid-newsletter-c3', label: 'Measure trials and paid after 14 and 30 days' },
    ],
  },
  {
    id: 'ech-mk-paid-reddit',
    title: 'Test Reddit ads in podcasting subreddits for $10 a day',
    outcome: 'A 10 day Reddit test targeting podcasting communities, with a clip ad and a hard spend cap.',
    minutes: 45,
    xp: 30,
    blocks: [
      { type: 'steps', items: [
        'ads.reddit.com > Create campaign > Conversions (or Traffic if the pixel has no data yet), $10 a day, 10 days, $100 total cap.',
        'Targeting: communities r/podcasting, r/podcast, r/podcasters, r/NewTubers, r/Entrepreneur (check each still exists and its size). Interest: Podcasts.',
        'Ad: one audiogram (the "Proof" angle from the Meta test) with the title below, comments ON so you can answer questions.',
        'Answer every comment within 2 hours. Reddit users judge the founder, not the ad.',
      ] },
      { type: 'code', id: 'ech-mk-paid-reddit-copy', filename: 'reddit-ad.txt', lang: 'txt', code: `Title: I made this clip, the show notes and the chapters for my episode without opening an editor. Built a tool for it, free to try on your latest episode.

Landing: getecho.app/tools/podcast-chapter-generator?utm_source=reddit` },
      { type: 'table', head: ['Metric', 'Target', 'Kill rule'], rows: [
        ['CTR', '0.5% or more', 'Under 0.2% after 10,000 impressions: change the clip'],
        ['Cost per free tool run', 'Under $5', 'Over $10 at day 5: stop'],
      ] },
    ],
    checklist: [
      { id: 'ech-mk-paid-reddit-c1', label: 'Create the Reddit campaign with a $100 cap' },
      { id: 'ech-mk-paid-reddit-c2', label: 'Copy the ad title', trigger: 'copy:ech-mk-paid-reddit-copy' },
      { id: 'ech-mk-paid-reddit-c3', label: 'Answer every comment within 2 hours' },
    ],
  },
]
