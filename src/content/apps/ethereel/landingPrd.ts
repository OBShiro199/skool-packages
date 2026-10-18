// Ethereel: Landing page PRD (LANDING.md).
// Generated from markdown source; plain text inside a template literal.

export const landingPrd = `# Ethereel: landing page PRD

Save this file as \`LANDING.md\` in your project root. In Claude Code, say:
"Build the landing page at app/(marketing)/page.tsx exactly as described in @LANDING.md, using
@DESIGN_SYSTEM.md and @DESIGN.md for tokens and components."

## 0. Page goal

- One job: get a coach, consultant or founder to click **Start free trial**.
- Second job: let them watch a before/after (raw clip vs finished reel) in under 20 seconds.
- Audience: people who already film themselves and hate editing. Most arrive from a reel on their phone,
  so design mobile first and test at 375px.
- Route \`/\`. Nav and footer are shared with \`/pricing\`, \`/docs\` (public copy of Documentation) and \`/blog\`.

## 1. Global rules

### 1.1 Built on Quiet Precision
- White surfaces, hairlines, Geist, the marketing rail: **1180px max width with a hairline left and
  right**, sections separated by full-width hairlines, 56px vertical padding on mobile and 80px on
  desktop. Marketing stays square (0 radius on section boxes), app screenshots inside keep their 6px.
- Accent is Ethereel's pastel violet (\`--accent #7c6ad6\`, \`--accent-soft #f4f2fd\`, \`--accent-edge
  #d5cdf5\`). Use it for the eyebrow pills, the pricing toggle selection and one highlight per section.
- Buttons follow the system: white with a firm edge for primary (\`1px solid #08090a\` at 70%, 46px
  large), lighter edge for secondary. No filled or black buttons.

### 1.2 Type
| Style | Mobile | Desktop | Weight | Tracking |
|---|---|---|---|---|
| Display (H1) | 40 / 1.06 | 52 / 1.04 | 500 | -0.045em |
| H2 | 28 / 1.15 | 35 / 1.12 | 500 | -0.035em |
| H3 | 20 / 26 | 20 / 26 | 500 | -0.025em |
| Body | 16 / 1.55 | 16 / 1.6 | 400 | -0.011em |
| Small | 13 / 18 | 13 / 18 | 400 | -0.014em |

Headings use \`text-wrap: balance\`. Body copy max 60ch.

### 1.3 Motion
- One curve: \`cubic-bezier(0.16, 1, 0.3, 1)\`. Opacity and transform only.
- Default reveal: fade in and rise 8px, 360ms, when 20% in view, once per session per section.
  Children stagger 40ms, max 6.
- Videos play only while 50% in view (IntersectionObserver) and pause when out of view.
- **Reduced motion:** reveals show at once, videos show a poster with a play button, marquee stops.

### 1.4 Analytics
Every CTA fires \`cta_click\` with \`location\` (\`nav\`, \`hero\`, \`demo\`, \`features\`, \`pricing_creator\`,
\`pricing_pro\`, \`final\`). Also \`demo_played\`, \`pricing_toggle\` (\`interval\`), \`faq_opened\` (\`question\`),
\`comparison_viewed\`.

## 2. Sticky nav

- Height 56px, white, bottom hairline always.
- Left: logo (waveform mark + "Ethereel").
- Centre (desktop): **How it works**, **Features**, **Pricing**, **FAQ** (smooth scroll to anchors).
- Right: **Log in** (text link) and **Start free trial** (primary, compact 36px).
- Mobile: logo left, **Start free trial** compact right, menu icon button opens a full-width sheet with
  the four links and Log in.
- Motion: none on load. The nav never hides on scroll (stable chrome).

## 3. Hero

### Copy
- Eyebrow pill: **For coaches, consultants and founders who film themselves**
- H1: **Send a raw clip. Get back a reel that looks hand-edited.**
- Subhead: **Ethereel cuts your pauses, writes your captions, adds zooms and hand-drawn diagrams, mixes
  the sound and posts to TikTok and Instagram at your best times. You approve every reel first.**
- Primary: **Start free trial**
- Secondary: **Watch a 20 second before and after** (scrolls to section 6)
- Microcopy: **7 days free · 5 reels on the trial · From $89/month**

### Product visual
- Desktop: right side, two phone frames (PhoneFrame lg, 9:16) side by side, slightly overlapping:
  left labelled **Raw clip 1:04** (grey tag) showing the unedited take; right labelled **Ethereel reel
  0:47** (violet tag) playing the finished reel with captions, a punch-in and a diagram cutaway.
- Under the phones, a strip of five small step chips that light up in sync with the right video's
  timeline: **Pauses cut · Captions · Zoom · Diagram · Music**.
- Mobile: the finished reel phone only (88% width) with the raw clip as a small picture-in-picture
  thumbnail in its top left corner, tap to swap.

### Motion
- On load: eyebrow, H1, subhead, buttons fade up 8px with 40ms stagger (360ms each).
- Phones fade in after 120ms (360ms). Step chips light one by one as the reel reaches each moment.
- Reduced motion: posters only, chips all lit.

## 4. Logo strip ("who it is for" until you have logos)

- Small muted line: **Made for people whose face is the brand**
- Eight text badges in a row (wrap on mobile): **Coaches · Consultants · SaaS founders · Agency owners ·
  Podcasters · Course creators · Recruiters · Fractional execs**
- When you have customers, replace with their names as greyscale wordmarks (with permission).
- Motion: badges fade in with a 40ms stagger. No marquee.

## 5. Problem

- H2: **You can film a reel in 2 minutes. Editing it takes an hour.**
- Intro: **So the clips sit in your camera roll and the algorithm forgets you.**
- Three columns separated by hairlines (stack on mobile), each with a Lucide icon (16px), bold line and
  one sentence:
  1. **Every pause, every "um".** Cutting a 60 second take by hand is 20 minutes of scrubbing.
  2. **Captions that are almost right.** Auto captions spell your product wrong and cover your face.
  3. **Posting is a second job.** Two apps, two upload screens, cover frames, and picking a time.
- Stat line in an accent-soft box: **One reel a day, edited by hand, is about 25 hours a month.**
- Motion: columns stagger in. The "25 hours" number counts up from 0 over 600ms once (reduced motion:
  final number).

## 6. Product demo (before and after)

- H2: **Watch one clip go through Ethereel.**
- Subhead: **Real raw footage, no retakes. 64 seconds in, 47 seconds out.**
- A wide player (16:9 container on desktop holding the two 9:16 videos side by side, synced; on mobile a
  single 9:16 with a "Before / After" segmented control). Controls: play/pause, scrubber, mute.
- Chapter markers on the scrubber: **0:03 opening title**, **0:09 first punch-in**, **0:18 diagram**,
  **0:34 follow card**.
- Under it: **Every edit here was made by Ethereel and approved with one tap.**
- Motion: autoplay muted when 50% in view; \`demo_played\` fires on first play.

## 7. Features (seven rows, visual alternates sides)

Each row: eyebrow, H3, body (2 to 3 sentences), three ticks, and a visual (a real app screenshot in a
6px hairline box, or a reel still in a PhoneFrame). Rows reveal on scroll.

### 7.1 Cuts that feel human
- Eyebrow: **Silence cutting**
- H3: **Tight, but never choppy.**
- Body: **Ethereel measures how loud your voice is and cuts only the pauses longer than 400 ms, keeping
  a breath on either side. Clicks and lip smacks do not fool it.**
- Ticks: **Adaptive to your mic** · **Breath kept around every cut** · **Clicks ignored**
- Visual: a waveform with removed pauses shaded and the kept 120 ms / 100 ms padding marked.

### 7.2 Captions you do not have to fix
- Eyebrow: **Captions**
- H3: **Your words, spelled your way.**
- Body: **Add your product names and handles once. Ethereel primes the transcript with them and fixes
  the usual mishearings, then shows 2 to 4 words at a time, right where people look.**
- Ticks: **Your vocabulary list** · **Clean 2 to 4 word pages** · **Fix any word in one sentence**
- Visual: a reel still with a caption, next to the vocabulary chips from Settings.

### 7.3 Diagrams drawn for you
- Eyebrow: **Cutaways**
- H3: **A hand-drawn diagram when the point needs one.**
- Body: **When you explain a process, a comparison or a number, Ethereel draws it on an exercise-book
  page while you keep talking. Drop in screenshots and they appear when you mention them.**
- Ticks: **Flow, versus, number, list, graph** · **Your screenshots as prints** · **Never more than 4 a reel**
- Visual: three reel stills of different cutaway kinds on paper.

### 7.4 Review on a real phone frame
- Eyebrow: **Review**
- H3: **Nothing posts until you say so.**
- Body: **Watch every reel with the TikTok or Instagram buttons on top, so nothing hides under the like
  button. Pass it, reject it, or ask for a change in plain words.**
- Ticks: **Platform overlays** · **Plain-language revisions** · **Undo any change**
- Visual: the Review screen screenshot with the revision dialog open showing "The word at 0:12 should
  be Supabase".

### 7.5 A queue that posts for you
- Eyebrow: **Queue**
- H3: **Five good slots a day, in your time zone.**
- Body: **Pass a reel and it takes the next free slot: 9am, 11am, 2pm, 5pm or 7pm, or your own times.
  Ethereel posts to TikTok and Instagram with the cover frame set and sends you the live links.**
- Ticks: **Your posting times** · **TikTok and Instagram** · **Live links back in the app**
- Visual: the Queue week view screenshot.

### 7.6 Sound that sits right
- Eyebrow: **Sound**
- H3: **Loud enough for the feed. Music that stays out of the way.**
- Body: **Every reel is levelled to the loudness TikTok and Instagram expect. Music sits about 25 dB under
  your voice and dips again under a diagram. Cuts get tiny fades so they never click.**
- Ticks: **Levelled to -14 LUFS** · **Music under your voice** · **No clicks at cuts**
- Visual: a simple two-lane waveform (voice and music) with the music lane lower and a dip under a
  cutaway block.

### 7.7 Your brand on every reel
- Eyebrow: **Brand**
- H3: **Your series, your handle, your look.**
- Body: **An opening title with your series name and a hand-drawn underline, a follow card when you say
  "still watching, follow me", and your colour preset on the footage. Set it once.**
- Ticks: **Series title opener** · **Follow card on your cue** · **Five looks or your own**
- Visual: three reel stills: the opener, the follow card turning to "Following", a graded close-up.

## 8. How it works

- H2: **Three steps. About five minutes of your time.**
- Three numbered columns with a hairline between them:
  1. **Set your style once.** Series title, handles, hashtags, look and music.
  2. **Upload raw clips.** Straight from your phone. Big files are fine and resume if your Wi-Fi drops.
  3. **Review and pass.** Each reel lands in Review in about 4 minutes. Pass it and it posts at your next slot.
- Button: **Start free trial**
- Motion: numbers 1 to 3 fade in one after another (120ms apart).

## 9. Comparison table

- H2: **Built to finish your reel, not find clips.**
- Intro: **Most tools chop long videos into many clips or hand you an editor. Ethereel edits one take
  like a person would, then waits for your yes.**
- Table (horizontal scroll on mobile with the first column sticky; \`comparison_viewed\` fires at 50% in view):

| | **Ethereel** | Opus Clip | Submagic | CapCut | Captions.ai | Descript |
|---|---|---|---|---|---|---|
| Built for | Raw talking-head take to finished reel | Long video to many clips | Captions on short clips | Manual editing | Captions and AI edits | Editing by text |
| Silence cutting with breath padding | Yes | Partial | Yes | Manual | Yes | Yes |
| Your vocabulary and handle fixes | Yes | No | Partial | No | Partial | Yes |
| Hand-drawn diagram cutaways | Yes | No | No | Manual | No | No |
| Your screenshots placed when you say them | Yes | No | No | Manual | No | Manual |
| Review with TikTok/IG overlay | Yes | No | No | No | No | No |
| Plain-language revisions with undo | Yes | No | No | No | Partial | Partial |
| Posts at your slots, both platforms | Yes | Yes | Partial | No | No | No |
| Nothing posts without approval | Always | Optional | n/a | n/a | n/a | n/a |
| Price from (monthly) | $89 | $15 [verify] | $16 [verify] | $8 [verify] | $10 [verify] | $24 [verify] |

- Footnote (13px muted): **Competitor features and prices checked Oct 2026 from their public pages and
  may have changed. Partial means the feature exists with limits. [verify before publishing]**
- Motion: the Ethereel column has an accent-soft background and fades in first.

## 10. Testimonials slot

- H2: **What creators say after a month.**
- Three cards (hairline boxes): quote (2 to 3 lines), name, role, a small 9:16 cover of one of their
  reels, and a stat line ("posted 31 reels in October").
- Until you have real quotes, ship this section hidden (\`showTestimonials = false\`). Never invent quotes.
- When live: cards fade in with a 40ms stagger.

## 11. Pricing

- H2: **Pick how often you post.**
- Toggle (segmented control, 2 options): **Monthly** / **Annual (2 months free)**. Selected segment uses
  \`--accent-soft\` with \`--accent-edge\`. Fires \`pricing_toggle\`. Prices change in place (tabular numbers,
  fixed width) with a 160ms cross-fade; cards never resize.
- Two cards side by side (stack on mobile), equal height:

**Creator**
- Price: **$89/month** or **$74/month billed $890 yearly**
- Line: **One reel a day.**
- Includes: **30 videos a month** · **Clips up to 2 minutes** · **5 clips per upload** · **2 revisions per
  video** · **TikTok and Instagram posting** · **Diagrams and your screenshots** · **Your look, music and
  captions**
- Button: **Start free trial** (\`cta_click\` location \`pricing_creator\`)

**Pro** (tag "For daily posters on both platforms")
- Price: **$199/month** or **$166/month billed $1,990 yearly**
- Line: **Up to three reels a day.**
- Includes: **90 videos a month** · **Clips up to 3 minutes** · **10 clips per upload** · **4 revisions per
  video** · **Fast processing (two at a time)** · **Everything in Creator**
- Button: **Start free trial** (\`pricing_pro\`)

- Under both: **Every plan starts with a 7 day free trial with 5 reels. Cancel any time from Billing.**

## 12. FAQ (anchor \`#faq\`)

Accordion, one open at a time, rows 48px, chevron rotates 180 degrees in 200ms, answer fades in while the
height morphs (300ms). \`faq_opened\` fires with the question.

1. **What kind of video works best?** One person talking to camera, 30 seconds to 2 minutes (3 on Pro),
   filmed on a phone. One take is fine; Ethereel removes the pauses and restarts between sentences
   when you leave a gap.
2. **Does anything post without me?** No. Every reel waits in Review until you press Pass. There is no
   auto-approve setting.
3. **Can I change something after it is edited?** Yes. Press Request revision and say what you want in
   plain words, like "the word at 0:12 should be Supabase" or "remove the second diagram". You get a new
   version and a list of what changed, and you can undo it.
4. **Will captions spell my product name right?** Add it to your vocabulary once. Ethereel uses it when
   transcribing and fixes the usual mishearings. You can also fix any word from Review.
5. **What are the diagrams?** Short hand-drawn cutaways on a paper page: steps, comparisons, numbers,
   lists, simple graphs, or your own screenshots. They appear while your voice keeps going, at most 4
   per reel.
6. **Which platforms do you post to?** TikTok and Instagram Reels. You connect them once; we never see
   your passwords.
7. **When do reels post?** At your next free slot. The defaults are 9am, 11am, 2pm, 5pm and 7pm in your
   time zone, and you can set your own.
8. **How long does a reel take?** About 4 minutes for a 60 second clip. Several clips process one after
   another (two at a time on Pro).
9. **Can I use my own music?** Yes. Pick from the library or upload your own tracks. Ethereel keeps the
   music well under your voice.
10. **Can I download the reel?** Yes, every version is downloadable as an MP4 that meets the TikTok and
    Instagram specs.
11. **What happens to my raw clips?** They stay private in your account. Raw files are deleted 14 days
    after you pass or reject a reel; the finished reels stay.
12. **Can I cancel?** Yes, from Billing at any time. Your reels stay downloadable until the end of the
    period.

## 13. Final CTA

- Full-width section with an accent-soft background inside the rail hairlines.
- H2: **Your next 30 reels are already in your camera roll.**
- Subhead: **Upload one now. It is back in your Review inbox in about 4 minutes.**
- Primary: **Start free trial** · Microcopy: **7 days free · 5 reels · Cancel any time**
- Motion: H2 and button fade up once.

## 14. Footer

- Four columns over a top hairline: **Product** (Features, Pricing, How it works, Docs), **For**
  (Coaches, Consultants, Founders, Podcasters: each a landing variant at \`/for/<audience>\` later),
  **Company** (About, Blog, Contact), **Legal** (Terms, Privacy).
- Bottom row: "© 2026 Ethereel" and a small line "Made with Ethereel: follow @ethereel on TikTok".

## 15. Responsive notes

- 320 to 430px: single column, hero shows one phone at 88% width, comparison table scrolls sideways with
  the feature column sticky (\`min-width: 0\` on grid children, \`overflow-x: auto\` on the table only, never
  on the page).
- 768px: features become two columns (visual and copy), pricing cards side by side.
- 1180px: rail max width, hairlines visible left and right.
- Check every breakpoint for horizontal scroll with \`document.documentElement.scrollWidth\`.

## 16. SEO and sharing

- Title: **Ethereel: raw talking-head clips to edited, scheduled reels**
- Meta description: **Upload a raw clip. Ethereel cuts the pauses, adds captions, zooms, hand-drawn
  diagrams and music, then posts to TikTok and Instagram at your best times after you approve it.**
- Canonical \`https://ethereel.com/\` (your domain). \`lang="en-GB"\`.
- OG image 1200x630: white background with a 1px hairline frame, left: H1 "Raw clip in. Edited reel
  out." in Geist 500 52px; right: two 9:16 phone frames (raw and edited still) with a violet "0:47" tag;
  small logo bottom left. Generate with \`next/og\` at \`app/opengraph-image.tsx\`.
- JSON-LD \`SoftwareApplication\` with \`offers\` for both plans.
- Every video has \`preload="metadata"\`, a poster, and WebM + MP4 sources under 3 MB each.

## 17. Performance budget

- LCP under 2.0 s on 4G: the hero poster is a 40 KB AVIF, fonts are Geist via \`next/font\` with
  \`display: swap\`.
- No video downloads until in view (except the hero poster).
- Total JS for the landing route under 120 KB gzipped (no animation library needed; use CSS and a tiny
  IntersectionObserver hook).

## 18. Build checklist for Claude Code

1. Build \`app/(marketing)/layout.tsx\` with the nav and footer.
2. Build each section as its own component in \`components/marketing/\` in the order above.
3. Add \`lib/analytics.ts\` with \`track(event, props)\` and wire every CTA.
4. Add the reveal hook \`useRevealOnce(regionId)\` that stores seen regions in sessionStorage.
5. Run Lighthouse mobile: performance and accessibility both 95 or higher.

## 19. Assets to make before you build

| Asset | How to make it | Where it is used |
|---|---|---|
| Raw demo clip (64 s) | Film yourself on a phone explaining one idea, with natural pauses | Hero left phone, demo "Before" |
| Edited demo reel (47 s) | Run the raw clip through your own Ethereel | Hero right phone, demo "After", OG image |
| Three cutaway stills | Export frames at each cutaway from the demo reel | Feature 7.3 |
| Review, Queue and Settings screenshots | Screenshot your running app at 2x on a 1440px wide window | Features 7.2, 7.4, 7.5 |
| Waveform diagrams | Draw in Figma with hairlines and the accent, export SVG | Features 7.1, 7.6 |
| Posters | First frame of each video as AVIF, under 40 KB | Every video element |

Film the demo yourself. A real raw clip with real pauses sells better than a polished stock actor.

## 20. Audience variants (later)

The same page with three swapped strings, at \`/for/coaches\`, \`/for/founders\`, \`/for/podcasters\`:

| Variant | Eyebrow | H1 | Demo topic |
|---|---|---|---|
| Coaches | For coaches who teach on camera | Turn one client insight into a reel a day. | "The one question I ask every new client" |
| Founders | For founders building in public | Ship a build-in-public reel every day without editing. | "Day 47: what broke in our onboarding" |
| Podcasters | For hosts who record a solo intro | Your episode teaser, edited and posted before lunch. | "This week on the show" |

Everything else stays the same. Track \`variant\` on every event.

## 21. Accessibility

- Every video has captions burned in (the product does that) plus an \`aria-label\` describing it.
- The comparison table is a real \`<table>\` with \`<th scope>\`; yes/no cells say "Yes" or "No" in text, not
  only an icon.
- The pricing toggle is a \`radiogroup\` with two \`radio\` buttons; arrow keys switch.
- FAQ buttons use \`aria-expanded\` and \`aria-controls\`.
- Colour contrast 4.5:1 for all text, including muted footnotes on the accent-soft background.
`
