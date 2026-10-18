// Echo landing page PRD (LANDING.md).

export const landingPrd = `# Echo: landing page PRD

Save this file as \`LANDING.md\` in your project root. In Claude Code, say:
"Build the landing page exactly as described in @LANDING.md, following @DESIGN_SYSTEM.md and the Echo accent
in @DESIGN.md."

## 0. Page goal

- One job: get a podcaster, a podcast agency owner or a company running a branded show to click
  **Start free trial**.
- Secondary job: let them paste their RSS feed into the hero and see their own latest episode's title options
  and chapters in under a minute (the free tool, rate limited). Nothing sells a podcaster like their own show.
- Audience: busy, has tried pasting transcripts into ChatGPT, maybe pays for Castmagic or Headliner. Reads on a
  phone between recordings and on a laptop when publishing. Design mobile-first, desktop-polished.
- Route: \`/\` (marketing route group). \`/pricing\` reuses the pricing section full width. \`/compare/[competitor]\`
  reuses the comparison section with one column highlighted.

## 1. Global rules

### 1.1 Base and tokens
Uses \`@DESIGN_SYSTEM.md\` (Quiet Precision) and the Echo accent from \`@DESIGN.md\`, with the system's marketing
rules: **square corners** on boxes and frames (pills keep 4px), a 1180px rail with a hairline left and right,
more expressive type than the app. Buttons stay white with a firm ink edge; no filled or black buttons, even here.

| Token | Value | Use |
|---|---|---|
| \`--hero-tint\` | #faf8fe | Hero and final CTA band (the accent at about 3%) |
| \`--band\` | #fafafb | Alternate section background (system row hover) |
| \`--chip\` | #f5f1fd | Eyebrow pills (accent soft) with \`--accent-edge\` |
| \`--frame\` | 1px solid #e6e6e9 + system shadow-float | Product shots, phone frames, pricing boxes |
| \`--feed-dark\` | #0f0f12 | Only inside phone mockups that show an audiogram in a social feed |

No dark full-width blocks. The only dark pixels on the page are inside the phone frames, because that is what an
audiogram looks like in a feed.

### 1.2 Type scale
| Style | Mobile | Desktop | Weight | Tracking |
|---|---|---|---|---|
| Display (hero H1) | 40px / 1.04 | 64px / 1.02 | 500 | -0.045em |
| H2 | 32px / 1.1 | 48px / 1.06 | 500 | -0.04em |
| H3 | 20px / 26px | 24px / 32px | 500 | -0.025em |
| Body | 16px / 26px | 16px / 26px | 400 | -0.011em |
| Eyebrow | 13px / 18px pill, sentence case | same | 500 | -0.014em |
| Timestamp chips | 13px tabular | same | 500 | -0.014em |

### 1.3 Layout
- 1180px rail, side padding 16px mobile, 24px tablet, 32px desktop. Sections 56px / 80px vertical padding,
  split by full-width hairlines. Backgrounds alternate white and \`--band\`. Hero and final CTA use \`--hero-tint\`.
- Grid children get \`min-width: 0\`; the page clips sideways overflow. Check 320, 375, 430, 768, 1440.

### 1.4 Motion principles
- System curves: \`cubic-bezier(0.16, 1, 0.3, 1)\` for reveals, the morph curve for size changes.
- Default reveal: opacity 0 to 1, translateY 12px to 0, 360ms, at 20% in view, once per session
  (IntersectionObserver). Stagger children 80ms, max 6.
- Looping motion is allowed in exactly two places: the audiogram videos inside phone frames (muted, inline,
  play only while in view) and the live dot in the hero product shot.
- \`prefers-reduced-motion: reduce\`: no translate, no auto-playing video (poster + play button), fades 150ms only.

## 2. Sticky nav
- 64px, white at 90% with \`backdrop-filter: blur(10px)\`, hairline bottom once scrolled past 8px.
- Left: the Echo mark (three rounded bars of rising height in \`--accent\`, like a small waveform) + wordmark "Echo".
- Centre (desktop): How it works, Features, Pricing, Compare, FAQ (anchors, offset 72px).
- Right: "Log in" (secondary edge), "Start free trial" (primary, firm ink edge).
- Mobile: mark + "Start free trial" (compact) + menu button opening a Sheet with the anchors.
- Motion: fades in 300ms on load; no scroll reveal.

## 3. Hero
- Eyebrow chip: "For podcasters, podcast agencies and brands with a show"
- H1: "Every episode, written up and clipped before lunch."
- Subhead: "Drop in your episode or connect your RSS feed. Echo writes the show notes, chapters, pull quotes,
  newsletter, social posts and an SEO blog post in your voice, and renders vertical audiograms with captions."
- Primary button: "Start free trial" (\`/signup\`)
- Secondary: an inline RSS field with the button "Try it on my show" (placeholder "Paste your podcast RSS feed").
  Submitting runs the free tool (\`/tools/show-notes-generator?feed=...\`) and shows the result in section 6.
- Trust line: "7 days free. 2 audio hours in the trial. Your first episode is ready in about 20 minutes."
- **Visual (right on desktop, under the copy on mobile):** layered product shot:
  1. Back layer: the episode workspace with the transcript on the left (speaker names "Sam" and "Priya") and the
     Chapters tab on the right (9 chapters with timestamps).
  2. Front left: the job progress row at "Writing your notes" with the live dot.
  3. Front right: a phone frame playing a 6 second muted loop of a Bars-style audiogram (captions in violet).
  Frames square with \`--frame\`, the phone frame 24px radius (a device, not a box).
- Motion: copy staggers in (eyebrow, H1, subhead, buttons, trust). Product layers rise 24px at 0, 140 and 280ms.
  The chapter rows fill in one by one (40ms stagger) at 900ms. Reduced motion: all visible, video on poster.

## 4. Logo strip
- Line above: "Made for the shows people actually finish"
- Until there are real customers, six format badges instead of fake logos: Interview shows, Solo expert shows,
  B2B company podcasts, Agency-produced shows, Coaching podcasts, Local business shows. Muted ink, 60% opacity,
  hover to 100%. Replace with real show artwork (with permission) once you have 6 customers.
- Motion: fade in only.

## 5. Problem
- Eyebrow: "The other half of podcasting"
- H2: "Recording takes an hour. Shipping it takes the rest of your week."
- Three columns, each with a big number (Display size, tabular) and a line:
  1. "**4 hours**: writing show notes, chapters, a newsletter and posts for one episode by hand."
  2. "**9,000 words**: what you say in an hour. Without a transcript page, Google sees none of them."
  3. "**3 tools**: one for transcripts, one for show notes, one for audiograms. Three bills, three logins."
- Under them, one line: "Most hosts skip half of it. Agencies do all of it, for every client, every week."
- Motion: numbers count up once from 0 over 900ms (tabular so nothing shifts). Reduced motion: final values.

## 6. Product demo
- Eyebrow: "See it on your show"
- H2: "Paste your feed. Watch your latest episode turn into everything."
- Left: a 70 second screen recording (Screen Studio): upload, progress, tabs filling in, one regenerate
  ("more playful"), make an audiogram from a quote, publish the episode page. Poster frame shows the full
  workspace. Plays muted inline when 50% in view, captions burned in, controls on hover.
- Right (desktop) / below (mobile): the free tool result panel when someone used the hero field: show artwork,
  latest episode title, 5 title options and the chapter list, with "Get the full pack free for 7 days" button.
  Before use, it shows a sample from a fictional show "The Bootstrapped Hour".
- Free tool limits (server): 1 run per IP per day, episodes under 90 minutes, titles and chapters only, uses the
  same pipeline with a \`free_tool\` workspace capped at 40 audio hours a month in total. Over the cap, the panel
  says "The free tool is busy today. Start a trial to run it on your show now."
- Motion: video frame rises once. Result rows stagger in 40ms.

## 7. Feature sections
Six blocks, alternating image left and right on desktop, image first on mobile. Each: eyebrow, H3, 2 line body,
3 bullet facts, a square-framed visual.

### 7.1 Show notes and chapters you would have written
- Eyebrow: "Notes and chapters"
- H3: "Timestamps that land on the right second"
- Body: "Echo reads the whole conversation, not a summary of it. Chapters start where the topic changes, and you
  can drag one by a few seconds if you disagree."
- Bullets: "5 title options with different angles" · "Show notes with key points, resources and a guest bio" ·
  "Copy chapters in YouTube or podcast host format"
- Visual: the Chapters tab beside the speech strip with chapter ticks.

### 7.2 Quotes that are word for word
- Eyebrow: "Pull quotes"
- H3: "Five quotes. Every one checked against the transcript."
- Body: "AI loves to paraphrase. Echo checks each quote is exactly what was said, snaps it to the second, and drops
  it if it is not."
- Bullets: "Verified tick on every quote" · "Speaker names you set once" · "One click to make it an audiogram"
- Visual: three quote cards with the green Verified tick.

### 7.3 It sounds like you
- Eyebrow: "Your voice"
- H3: "Paste something you wrote. Echo writes like that."
- Body: "Echo builds a voice card from your own writing: the words you use, how long your sentences are, whether
  you ever use emojis. Every asset follows it."
- Bullets: "One voice per show, for agencies with many clients" · "Regenerate any asset with an instruction" ·
  "Undo to any of the last 10 versions"
- Visual: the voice card with tone pills and Do/Don't lists.

### 7.4 Audiograms without opening an editor
- Eyebrow: "Audiograms"
- H3: "Highlight 45 seconds. Get a vertical clip with captions."
- Body: "Pick a quote or one of the five suggested clips, choose a style in your show's colours, and Echo renders a
  1080x1920 MP4 with a moving waveform and word-by-word captions in about two minutes."
- Bullets: "Three styles: Bars, Line, Minimal" · "Captions from the transcript, no typing" · "Ready for Reels,
  Shorts, TikTok and LinkedIn"
- Visual: three phone frames side by side, one per style, playing muted loops when in view.

### 7.5 A page Google can read
- Eyebrow: "Episode pages"
- H3: "Every episode gets a page with the full transcript."
- Body: "Publish a clean episode page with notes, chapters, quotes and a player that streams from your own host,
  so your download stats stay where they are. Embed the player on your site in one paste."
- Bullets: "Full transcript as real text, split by chapter" · "chapters.json and transcript files for Apple and
  Spotify" · "SEO blog post written for one real search term"
- Visual: a public episode page in a browser frame with the sticky player.

### 7.6 Built for producers with many shows
- Eyebrow: "Agencies"
- H3: "Twenty-five client shows. One login."
- Body: "Each show has its own feed, voice, colours and public pages. Your team works in one workspace and new
  episodes arrive by themselves from every client's RSS feed."
- Bullets: "Auto-import new episodes every 15 minutes" · "Roles for owners, admins and producers" · "One bill,
  usage shared across shows"
- Visual: the Episodes table filtered by show, with hashed show colours.

Motion for every block: text reveals, then the visual rises 16px 120ms later.

## 8. How it works
- Eyebrow: "How it works"
- H2: "Three steps. About twenty minutes."
- Steps (numbers in violet tabular 48px, connected by a hairline on desktop):
  1. "**Add your episode.** Upload a file or connect your RSS feed once."
  2. "**Echo writes it up.** Transcript with speakers, then notes, chapters, quotes, a newsletter, posts and a
     blog post in your voice."
  3. "**Clip and publish.** Make audiograms from the best moments and publish the episode page."
- Button under the steps: "Start free trial"
- Motion: steps stagger 120ms; the connecting hairline draws left to right over 600ms (scaleX). Reduced motion:
  drawn.

## 9. Comparison table
- Eyebrow: "Compare"
- H2: "Notes, clips and an SEO page in one tool"
- Table (horizontal scroll on mobile, first column sticky). Prices are entry plans billed monthly, checked Oct 2026
  from comparison sites. Confirm on each vendor's own pricing page before launch.

| | Echo | Castmagic | Podsqueeze | Headliner | Swell AI |
|---|---|---|---|---|---|
| Starting price | $29/month (6 audio hours) | $29/mo for 5 hours [verify] | $8.99 to $15/mo, about 2 hours [verify] | Free plan, paid from about $15/mo [verify] | $39/mo [verify] |
| Show notes, titles, chapters | Yes | Yes | Yes | Limited [verify] | Yes |
| Quotes checked word for word | Yes | No [verify] | No [verify] | No | No [verify] |
| Writes in your voice from a sample | Yes | Custom prompts [verify] | [verify] | No | [verify] |
| Newsletter + SEO blog post | Yes | Yes | Yes [verify] | No | Yes [verify] |
| Vertical audiograms with captions | Yes | No [verify] | Video clips [verify] | Yes | Clips [verify] |
| RSS auto-import | Yes | [verify] | [verify] | Yes [verify] | [verify] |
| Public episode page with transcript | Yes | No [verify] | No [verify] | No | No [verify] |
| Many shows in one workspace | Up to 25 | Team seats [verify] | Agency plan [verify] | [verify] | [verify] |

- Under the table: "One price covers the writing and the clips. Most hosts replace two subscriptions."
- Motion: rows fade in with 40ms stagger. The Echo column has \`--accent-soft\` fill and a top chip "Echo".

## 10. Testimonials slot
- Eyebrow: "Early hosts"
- H2: "From the people shipping weekly"
- Three quote cards with show artwork, host name and show name. Until you have 3 real quotes (with permission),
  the section is hidden in production (\`lib/testimonials.ts\` exports an empty array; render only when length >= 3).
  In development, render dashed placeholder cards reading "Your first customer quote goes here".
- Prefer quotes with a number: "Ep 87 went out with chapters and three clips the same afternoon."

## 11. Pricing
- Eyebrow: "Pricing"
- H2: "Priced by audio hours, not seats"
- Subhead: "Every plan starts with a 7 day free trial with 2 audio hours. Cancel from Billing in two clicks."
- **Toggle:** Monthly / Annual pill switch, Annual shows a chip "2 months free". Default Monthly. Digits
  cross-fade 200ms (tabular, the card never changes size), and the Checkout price id swaps.
- Three cards, Studio highlighted with a 1px \`--accent-edge\` border, \`--accent-soft\` fill and a "Most popular" chip.

| | Creator | Studio | Agency |
|---|---|---|---|
| Monthly | $29 | $79 | $199 |
| Annual | $290/year ($24.17/mo) | $790/year ($65.83/mo) | $1,990/year ($165.83/mo) |
| For | Indie podcasters | Brands and serious shows | Podcast agencies |
| Audio hours a month | 6 | 20 | 50 |
| Longest episode | 2 hours | 3 hours | 4 hours |
| Shows | 1 | 5 | 25 |
| Seats | 1 | 3 | 10 |
| Audiograms a month | 20 | 50 | 150 |
| Regenerations a month | 25 | 50 | 100 |
| Hide "Made with Echo" badge | | Yes | Yes |
| Button | Start free trial | Start free trial | Start free trial |

- Every card also lists: "Show notes, titles, chapters, quotes, newsletter, social posts, blog post" ·
  "RSS auto-import" · "Public episode pages and embed player" · "chapters.json and transcript files".
- ROI line (Geist 500 24px): "At 4 hours saved per episode, Creator costs less than $2 an hour of your time."
- Risk line: "No setup fee. No contract. Your episode pages stay yours."
- Buttons go to \`/signup?plan=studio&interval=month\` (carried into Checkout after onboarding).
- Wire to \`STRIPE_PRICE_CREATOR_MONTHLY\`, \`STRIPE_PRICE_CREATOR_YEARLY\`, \`STRIPE_PRICE_STUDIO_MONTHLY\`,
  \`STRIPE_PRICE_STUDIO_YEARLY\`, \`STRIPE_PRICE_AGENCY_MONTHLY\`, \`STRIPE_PRICE_AGENCY_YEARLY\`.
- Motion: cards rise with 80ms stagger; Studio ends 8px higher on desktop.

## 12. FAQ
Accordion (one open at a time, height morph 300ms, chevron rotates 180 degrees). Exact copy:

1. **What is an audio hour?** One hour of episode audio that Echo transcribes and writes up. A 45 minute episode
   uses 0.75 hours. Regenerating an asset or making an audiogram does not use audio hours; they have their own
   monthly counts.
2. **Which files can I upload?** MP3, M4A, WAV, AAC, MP4 and MOV, up to 1 GB. Video files are fine: Echo uses
   the audio.
3. **How does RSS import work?** Paste your feed URL from your podcast host (Buzzsprout, Transistor, Captivate,
   Spotify for Creators, RSS.com and others). Echo checks it every 15 minutes. New episodes either process by
   themselves or wait for your click, your choice per show.
4. **Will it sound like me?** Paste 300 to 3,000 words you have written. Echo builds a voice card from it and
   every asset follows it. You can edit anything, and regenerate with an instruction.
5. **Are the quotes real?** Yes. Every quote is checked word for word against the transcript and timed to the
   second. If a quote does not match, Echo drops it.
6. **How long do audiograms take?** About two minutes for a 60 second clip. They are 1080x1920 MP4 files with
   captions burned in, ready for Reels, Shorts, TikTok and LinkedIn.
7. **Does the episode page affect my download numbers?** No. The player streams from your own podcast host, so
   every play counts on your host's stats as usual.
8. **Can I add chapters to Apple Podcasts and Spotify?** Echo gives you a chapters.json URL and a transcript
   file URL for each published episode. Paste them into your host's Podcasting 2.0 fields where supported.
9. **Which languages work?** Transcription detects most languages. The writing is English in this version.
10. **I run an agency. How do client shows work?** One workspace holds up to 25 shows, each with its own feed,
    voice, colours and public pages. Invite your producers as members; only you see billing.
11. **What happens to my audio?** Uploaded files are stored privately and deleted 30 days after processing.
    Audiogram files are kept for 90 days, so download the ones you post. Transcripts and written assets stay until you delete them.
12. **What if I run out of hours?** New RSS episodes still arrive and wait. Upgrade any time from Billing and
    they process straight away, or wait for your monthly reset.

- Add FAQPage JSON-LD from the same array.

## 13. Final CTA
- Band in \`--hero-tint\`. H2: "Your next episode, written up before you have finished editing it."
- Sub: "Start with your latest episode. It takes about twenty minutes."
- Button: "Start free trial". Under it: "7 days free. 2 audio hours included."
- Visual: a row of 5 small asset chips that appear one by one (Titles, Notes, Chapters, Quotes, Clips), 80ms stagger.

## 14. Footer
- Four columns: Product (Features, Pricing, Compare, Free show notes generator), Compare (vs Castmagic, vs
  Podsqueeze, vs Headliner, vs Swell AI), Resources (Docs, Podcast chapters guide, Show notes template), Company
  (Contact, Privacy, Terms).
- Bottom row: the Echo mark, "© 2026 Echo", and "Made for people who press record every week."

## 15. Responsive notes
- Under 768px: hero visual sits under the buttons, the RSS field goes full width with the button below it.
- Feature blocks stack image first. Phone frames scale to 240px wide, two per row in 7.4 (the third drops below).
- Comparison table scrolls sideways inside its frame with the first column sticky and a right-edge fade.
- Pricing cards stack, Studio first on mobile. The toggle stays sticky at the top of the pricing section.
- Tap targets at least 44px. No horizontal page scroll at 320px.

## 16. SEO
- Title (58 chars): "Echo: podcast show notes, chapters and audiograms in one"
- Meta description (152 chars): "Upload an episode or connect your RSS feed. Echo writes show notes, chapters, quotes,
  a newsletter and blog post in your voice, and renders audiograms."
- Canonical \`https://getecho.app/\`. Open Graph and Twitter card from section 17.
- JSON-LD: \`SoftwareApplication\` (name, applicationCategory "MultimediaApplication", offers for the three plans)
  and \`FAQPage\`.
- H1 used once. Every image has alt text describing what it shows ("Chapters tab with nine timestamps").
- Internal links to \`/compare/*\` and \`/tools/show-notes-generator\` from the footer and the comparison section.

## 17. OG image
1200x630, built with \`next/og\` at \`/opengraph-image\`: white background, 1px hairline frame inset 32px, the Echo
mark and wordmark top left, H1 text "Every episode, written up and clipped." in Geist 500 64px ink, and on the
right a phone frame with a still of a Bars audiogram. Under 300 KB.

## 18. Performance
- LCP under 2.0 s on mobile: hero product shot as AVIF with \`priority\`, phone videos \`preload="none"\` with
  posters, demo video lazy.
- CLS under 0.05: every image and video has width and height, fonts preloaded with \`next/font\`.
- No client JS for sections that do not need it; FAQ, toggle, RSS field and videos are the only client islands.

## 19. Motion summary (one table for Claude Code to check against)

| Section | Trigger | Animation | Duration / easing | Reduced motion |
|---|---|---|---|---|
| Nav | Page load | Fade in | 300ms ease-out | Visible at once |
| Hero copy | Page load | Stagger: eyebrow, H1, subhead, buttons, trust line; rise 12px | 360ms each, 80ms stagger, ease-out | Visible at once |
| Hero product layers | Page load | Rise 24px at 0, 140, 280ms | 420ms ease-out | Visible at once |
| Hero chapter rows | 900ms after load | Fill in one by one | 40ms stagger, 200ms fade | All rows shown |
| Hero phone loop | In view | Muted inline video, pauses out of view | Native | Poster only, play button |
| Problem numbers | 20% in view | Count up from 0, tabular | 900ms morph curve | Final values |
| Demo video | 50% in view | Frame rises 12px, video plays muted | 360ms ease-out | Poster, click to play |
| Feature blocks | 20% in view | Text reveals, visual rises 16px 120ms later | 360ms ease-out | Visible at once |
| Phone frames (7.4) | In view | Three muted loops | Native | Posters |
| How it works line | 20% in view | Hairline scales X from 0 to 1 | 600ms morph curve | Drawn |
| Comparison rows | 20% in view | Fade in | 40ms stagger, 200ms | Visible at once |
| Pricing toggle | Click | Digits cross-fade, card size fixed | 200ms | Instant swap |
| FAQ item | Click | Height morph, chevron rotates 180 degrees | 300ms morph curve | Instant open |
| Final CTA chips | 20% in view | Chips appear one by one | 80ms stagger | Visible at once |

## 20. Accessibility

- One H1, headings in order (H2 per section, H3 per feature). Landmarks: header, nav, main, footer.
- Every video has a text alternative in the caption below it and is muted; none autoplay with reduced motion.
- The hero RSS field has a visible label ("Your podcast RSS feed"), an error message in danger ink with
  \`role=alert\`, and the result panel is a polite live region.
- The pricing toggle is a real switch (\`role="switch"\`, \`aria-checked\`) and announces the new prices.
- The comparison table is a real \`<table>\` with \`<th scope>\` so screen readers read it row by row; the sticky
  first column does not break the reading order.
- Focus visible on every link and button (2px outline, 2px offset). Contrast 4.5:1 for body text, including the
  muted line under the hero buttons.

## 21. Analytics events (PostHog)
| Event | When | Properties |
|---|---|---|
| \`lp_viewed\` | Page load | referrer, utm_* |
| \`lp_cta_clicked\` | Any "Start free trial" | location (nav, hero, pricing_creator, pricing_studio, pricing_agency, final) |
| \`lp_feed_submitted\` | Hero RSS field submitted | valid (boolean) |
| \`lp_free_tool_result\` | Free tool returned | ms, chapters_count |
| \`lp_demo_played\` | Demo video plays | |
| \`lp_pricing_toggled\` | Monthly/Annual switched | to |
| \`lp_faq_opened\` | FAQ item opened | index |
| \`lp_compare_viewed\` | Comparison table 50% in view | |
`
