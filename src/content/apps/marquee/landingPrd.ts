// Marquee landing page PRD (LANDING.md).

export const landingPrd = `# Marquee: landing page PRD

Save this file as \`LANDING.md\` in your project root. In Claude Code, say:
"Build the landing page exactly as described in @LANDING.md, using @DESIGN_SYSTEM.md and @DESIGN.md."

## 0. Page goal

- One job: get a YouTuber with 10k to 500k subscribers (or an agency running channels) to click
  **Start free trial**.
- Secondary job: show, in 45 seconds of video, a title turning into six thumbnails with the creator's real face,
  then a test result with a real number.
- Audience: creators who check YouTube Studio every morning, have tried Canva and maybe a thumbnail designer,
  and distrust "AI thumbnail" tools that put a fake face on them. Mostly on a laptop; 40% on a phone.
- Route: \`/\` (marketing route group). \`/pricing\` reuses the pricing section full width.

## 1. Global rules

### 1.1 Base and tokens
The landing page uses \`@DESIGN_SYSTEM.md\` (Quiet Precision) and the Marquee accent from \`@DESIGN.md\` with the
system's marketing rules: **square corners** on boxes and frames (pills keep 4px), a 1180px rail with a hairline
left and right, and more expressive type and visuals than the app. Buttons stay white with a firm ink edge; there
are no filled or black buttons, even here. The thumbnails are the colour on this page. The page itself stays
white, ink and teal.

| Token | Value | Use |
|---|---|---|
| \`--hero-tint\` | #f6fbfb | Hero and final CTA band (the accent at about 3%) |
| \`--band\` | #fafafb | Alternate section background (system row hover) |
| \`--chip\` | #eef7f6 | Eyebrow pills (accent soft) with \`--accent-edge\` |
| \`--frame\` | 1px solid #e6e6e9 + system shadow-float | Product shots, the thumbnail wall, pricing boxes |

### 1.2 Type scale
Geist only (400, 500, 600).

| Style | Mobile | Desktop | Weight | Tracking |
|---|---|---|---|---|
| Display (hero H1) | 40px / 1.04 | 64px / 1.02 | 500 | -0.045em |
| H2 | 32px / 1.1 | 48px / 1.06 | 500 | -0.04em |
| H3 | 20px / 26px | 24px / 32px | 500 | -0.025em |
| Body | 16px / 26px | 16px / 26px | 400 | -0.011em |
| Eyebrow | 13px / 18px pill, sentence case | same | 500 | -0.014em |

### 1.3 Layout
- 1180px rail with hairlines left and right; side padding 16px mobile, 24px tablet, 32px desktop.
- Section padding 56px mobile, 80px desktop. Sections split by full-width hairlines.
- Backgrounds alternate white and \`--band\`. Hero and final CTA use \`--hero-tint\`.
- Grid children get \`min-width: 0\`; the page clips sideways overflow.

### 1.4 Motion principles
- System curves: \`cubic-bezier(0.16, 1, 0.3, 1)\` for reveals, the morph curve for size changes.
- Default scroll reveal: opacity 0 to 1 and translateY 12px to 0, 360ms, when 20% is in view, once per session.
- Stagger children 80ms, max 6 per group.
- \`prefers-reduced-motion: reduce\`: no translate, no auto-scrolling wall, no autoplay; fades 150ms only. The demo
  shows a poster with a play button.

### 1.5 Thumbnail assets
The page shows many thumbnails. Make 24 real ones with the app on your own face (or a friend who agreed) across
6 made-up videos. Export them as 640x360 WebP, about 40 KB each, into \`public/landing/thumbs/\`. Never use other
creators' thumbnails or faces.

## 2. Sticky nav

- 64px high, white at 90% opacity with \`backdrop-filter: blur(10px)\`, 1px hairline bottom border once the page
  has scrolled 8px (border fades in 160ms).
- Left: logo mark + "Marquee" 16px/500.
- Centre (desktop): How it works, Testing, Pricing, FAQ (anchor links, 14px muted, ink on hover).
- Right: "Log in" (text link), "Start free trial" (white button, ink edge, 36px).
- Mobile (under 768px): logo left, "Start free trial" compact (32px) and a menu icon right; the menu opens a full
  width sheet from the top (200ms fade + 8px drop) with the same links at 20px.

## 3. Hero

Background \`--hero-tint\`, 96px top padding desktop, 64px mobile.

- Eyebrow pill: "For creators with 10k to 500k subscribers"
- H1 (Display): **"Thumbnails with your real face. Tested on your real views."**
- Subhead (18px/28px muted, max 560px): "Type a title. Marquee drafts six thumbnail ideas with your face cut out and
  a bold headline in about two minutes. Pick your favourites and it tests them on your live video, then keeps the
  one people click."
- Buttons: "Start free trial" (46px, ink edge) and "Watch the 45 second demo" (46px, light edge, Lucide play icon).
- Small line under the buttons (13px faint): "7 days free · Cancel in two clicks · Works with any YouTube channel"
- **Product visual (right on desktop, under on mobile):** a 640x420 framed panel (\`--frame\`) showing the concept
  gallery: 6 thumbnails in a 3x2 grid with the toolbar "I tried 30 AI tools so you don't have to" and the progress
  line "6 concepts ready". Over the bottom-right corner, overlapping the frame by 32px, a smaller 300px card
  shows a test result: variant tags A and B, "B won · +34% CTR · 97% sure".
- Motion: H1 and subhead fade up (360ms, 80ms stagger). The gallery cards fill in one by one (6 x 120ms) after
  400ms, as in the app (loading pattern, then image fade). The result card rises 12px at 1.2s. Plays once.
- Reduced motion: everything visible at once.

## 4. Logo strip / proof

- Line (13px faint, centred): "Built for the way creators already work"
- Row of tool logos in grey (40% ink): YouTube Studio, Premiere Pro, Final Cut Pro, DaVinci Resolve, CapCut,
  Descript. This is a "works alongside" strip, not a client list. Do not show channel logos unless those creators
  agreed in writing to be shown.
- Motion: fade with a 40ms stagger. Mobile: wrap to 3 x 2. No marquee animation (yes, ironic).

## 5. Problem

Background white.
- Eyebrow: "The problem"
- H2: "Your best video can lose to a better thumbnail."
- Three columns (stacked on mobile), each with a Lucide icon at 16px, an H3 and 2 lines:
  1. Clock icon. **"Hours in Photoshop."** "Finding a photo with the right face, cutting it out, nudging text. Every
     video, every week."
  2. Dices icon. **"Picking on gut feel."** "You make two versions, choose one, and never know if the other one
     would have doubled your views."
  3. Line chart icon. **"Studio numbers that wobble."** "You swap the thumbnail on Wednesday and CTR goes up. Was it
     the thumbnail, or was it Wednesday?"
- Under the columns, a single stat line (H3, centred): "The same video at 4% CTR and 8% CTR is twice the views from
  the same impressions."
- Motion: columns stagger 80ms.

## 6. Product demo

Background \`--band\`.
- Eyebrow: "See it work"
- H2: "From title to a proven thumbnail."
- A 16:9 framed video (\`--frame\`), max 960px wide, poster image = the gallery screen. Click to play (no autoplay
  with sound). 45 seconds, captions burned in:
  0-5s type the title, 5-15s six concepts fill in, 15-25s editor: swap the face to "shocked", change the headline,
  export, 25-35s start a test with A/B, schedule strip, 35-45s results: "B won · +34% CTR", B now live on YouTube.
- Under it, 3 small captions in a row: "2 minutes to six ideas", "Your real face, cut out", "Tested on real views".
- Record with Screen Studio at 60fps, export 1080p H.264 under 8 MB plus a WebM, \`preload="none"\`.

## 7. Feature sections

Alternate image left/right on desktop; stacked on mobile (image first). Each: eyebrow, H3, 2 to 3 lines of body,
3 bullet points with Lucide check icons, and a framed visual 560x360. Reveal: visual fades in and rises 12px,
text 80ms later.

### 7.1 Your face, not a lookalike
- Eyebrow: "Face library"
- H3: "Upload your face once. Every thumbnail is really you."
- Body: "Add 5 to 10 photos. Marquee cuts each one out with a clean edge and tags the expression, so a 'shocked'
  concept gets your real shocked face. No face training, no uncanny AI version of you."
- Bullets: "Clean cut-outs in seconds" · "Tagged by expression, change any tag" · "Separate libraries for every
  person on your team"
- Visual: the Faces grid with 8 cut-outs on a checkerboard and expression pills.

### 7.2 Six different ideas, not six copies
- Eyebrow: "Concepts"
- H3: "Six angles on every title."
- Body: "Curiosity gap, bold claim, before and after, the big number, the reaction, the versus. Each concept takes a
  different angle, so you are choosing between ideas, not between shades of red."
- Bullets: "Backgrounds painted for your topic" · "Headlines written to be read on a phone" · "Regenerate one idea
  for 1 credit"
- Visual: 6 concept cards with their angle pills.

### 7.3 An editor built only for thumbnails
- Eyebrow: "Editor"
- H3: "Move it, swap it, export it under 2 MB."
- Body: "Drag the face, scale the headline, apply a text style, swap to another expression in one click. A live
  phone-size preview shows how it looks in the feed, and the export is always 1280x720 and under YouTube's limit."
- Bullets: "Your brand colours and fonts" · "Shows where YouTube's time badge covers the image" · "Undo, redo,
  autosave"
- Visual: the editor with the safe-zone overlay on and the mobile preview visible.

### 7.4 Tests on your real video
- Eyebrow: "A/B testing"
- H3: "Let your viewers pick the winner."
- Body: "Choose 2 or 3 thumbnails. Marquee shows one on your video each day in a balanced order, reads impressions
  and click-through rate from YouTube, and tells you when a winner is real, not when it is Tuesday."
- Bullets: "Balanced daily schedule that cancels out slow days" · "Shows how sure it is, in plain words" · "Puts the
  winner live automatically"
- Visual: the test detail page with the schedule strip and the numbers table.

### 7.5 It will not trade watch time for clicks
- Eyebrow: "Guardrail"
- H3: "Clickbait cannot win."
- Body: "If a thumbnail gets more clicks but viewers leave sooner, Marquee will not crown it. Your watch time is
  what YouTube rewards, so it is what Marquee protects."
- Bullets: "Checks average view duration for every variant" · "Keeps your original when results are unclear" ·
  "Your original thumbnail is always backed up"
- Visual: a "No clear winner" panel with the guardrail sentence.

### 7.6 For agencies running many channels
- Eyebrow: "Teams"
- H3: "Ten channels, one workspace."
- Body: "Connect every client channel, keep a face library per presenter, and give editors access without sharing
  anyone's Google password."
- Bullets: "Up to 10 channels and 5 seats on Agency" · "Roles for owners, admins and editors" · "Results per channel
  for your client reports"
- Visual: channels list with 4 channels and a tests table.

## 8. How it works

Background white. Eyebrow "How it works", H2 "Three steps. About ten minutes of your time."
Three numbered columns (numbers 48px/500 in faint ink, tabular):
1. **"Add your face and brand."** "Photos, colours, fonts. Once."
2. **"Type the title, pick your favourites."** "Six concepts in about two minutes. Tweak one in the editor."
3. **"Start a test and get back to filming."** "Marquee swaps the thumbnail daily and emails you the winner."
A thin 1px hairline connects the three numbers on desktop; it draws left to right (scaleX 0 to 1, 600ms, morph
curve) when the section enters. Reduced motion: shown at once.

## 9. Comparison table

Background \`--band\`. Eyebrow "Compare", H2 "Make them and prove them, in one place."
Prices checked Oct 2026 from public sources; competitor prices change often. Mark every one [verify] until you
check their pricing pages on the day you publish, and update the "checked" date in the footnote.

| | Marquee | Pikzels | ThumbnailTest | TubeBuddy | YouTube Test & Compare |
|---|---|---|---|---|---|
| Makes thumbnails for you | Yes, 6 concepts per title | Yes | No | Basic AI tools [verify] | No |
| Uses your real face | Yes, cut-outs of your photos | Trained persona (an AI version) [verify] | Not applicable | No [verify] | Not applicable |
| Editable layers after generating | Yes | Partly [verify] | Not applicable | Not applicable | Not applicable |
| A/B tests on your live video | Yes, daily rotation | No [verify] | Yes, rotation | Yes, on Legend tier [verify] | Yes, true split |
| Judges by | CTR, with a watch-time guardrail | Not applicable | CTR and views [verify] | CTR [verify] | Watch time share |
| Shows how sure the result is | Yes, plain words | Not applicable | [verify] | [verify] | Winner / Preferred / None |
| Agencies and multiple channels | Up to 10 channels, 5 seats | [verify] | Pro: 3 channels [verify] | Per channel licence [verify] | Per channel |
| Price per month | From $29 | From about $14 to $20 [verify] | From about $24 to $32 [verify] | About $31.50 [verify] | Free |

- Under the table (13px faint): "Competitor details from their public pages and reviews, checked Oct 2026. Tell us
  if something is out of date and we will fix it within a day."
- Honest note under it (14px muted): "YouTube's own Test & Compare is free and splits viewers at the same time. If
  your channel has it, use it for final tests. Marquee makes the thumbnails worth testing, works on videos where
  Test & Compare is not available, and adds a watch-time guardrail. [verify current availability]"
- Mobile: the table scrolls sideways inside its own container with the first column sticky; the page never scrolls
  sideways. Marquee's column has the accent-soft fill and accent edge.

## 10. Testimonials slot

Background white. Eyebrow "Creators", H2 "Results from real channels."
- 3 cards in a row (stacked on mobile), square corners, hairline. Each: a quote (16px), name, channel name,
  subscriber count (tabular), and a small A/B pair of thumbnails with "+X% CTR".
- **Until you have real quotes, do not ship fake ones.** Show one card instead: "We are collecting results from our
  first 50 creators. Start a trial and yours could be here." Replace with real quotes as they arrive, with each
  creator's written OK and their real thumbnails.
- Motion: cards stagger 80ms.

## 11. Pricing

Background \`--band\`. id \`pricing\`. Eyebrow "Pricing", H2 "Pick a plan. Try it free for 7 days."
- Segmented control (36px, 6px radius, white, hairline): "Monthly" | "Annual (2 months free)". Annual is not selected
  by default. Switching cross-fades the prices (160ms) with fixed-width price boxes so nothing shifts.
- Three boxes (square corners, \`--frame\` on Pro only, hairline on the others). Pro carries an eyebrow pill "Most
  popular". Each box: name, price (48px tabular), interval line, one-line summary, button, list.

| | Creator | Pro | Agency |
|---|---|---|---|
| Monthly | $29/month | $59/month | $149/month |
| Annual | $290/year ($24.17/month) | $590/year ($49.17/month) | $1,490/year ($124.17/month) |
| Summary | One channel, about 14 videos a month | Growing channels and duos | Agencies and networks |
| Button | Start free trial | Start free trial | Start free trial |
| Concepts per month | 84 (14 videos) | 168 (28 videos) | 420 (70 videos) |
| Channels | 1 | 3 | 10 |
| Seats | 1 | 2 | 5 |
| Live tests at once | 3 | 10 | 40 |
| Face library | 1 person | 3 people | 15 people |
| Brand fonts | 4 | 10 | 30 |
| Everything else | Editor, exports, guardrail, emails | Everything in Creator | Everything in Pro, roles |

- Under the boxes: "7 days free, then billed monthly or yearly. 12 concepts and 1 test included in the trial. Cancel
  any time from Billing."
- One concept = one thumbnail image. A title uses 6. Regenerating one idea uses 1.
- Buttons link to \`/signup?plan=pro&interval=year\`; the signup flow passes these to Checkout.

## 12. FAQ

Background white. id \`faq\`. H2 "Questions". Disclosure rows (48px closed), one open at a time, height morphs 300ms.

1. **Does Marquee make an AI version of my face?**
   No. You upload real photos and Marquee cuts them out. Every face in your thumbnails is a real photo of you. We do
   not train a model on your face.
2. **How does the A/B test work if YouTube shows one thumbnail at a time?**
   Marquee changes the thumbnail once a day at midnight Pacific in a balanced order (A, B, B, A, B, A, A, B), then
   compares impressions and clicks per day from YouTube's own reports. The order cancels out most of the effect of
   busy and slow days.
3. **How long does a test take?**
   8 days for two thumbnails, 9 for three, then 1 to 2 days while YouTube sends the last numbers. Bigger channels get
   clearer answers sooner; small channels may need the 16 day option.
4. **What if there is no clear winner?**
   Marquee tells you, in plain words, why (not enough impressions, too close, or clicks went up but watch time went
   down) and keeps your original unless you pick another.
5. **Can I test my old videos?**
   Yes. Older videos with steady traffic are often the best place to test, and a better thumbnail can bring an old
   video back into suggestions.
6. **What does Marquee do with my YouTube account?**
   It reads your video list and stats, and changes the thumbnail only on videos you put in a test. It cannot upload,
   delete or edit anything else. Disconnect at any time and we delete your YouTube data.
7. **What size are the exports?**
   1280x720 JPEG, always under 2 MB, which YouTube accepts on every channel. You can download any design too.
8. **Can I use my own fonts?**
   Yes. Upload WOFF2, TTF or OTF fonts you hold a licence for, or use the built-in thumbnail fonts.
9. **Do I need YouTube's custom thumbnail permission?**
   Yes. YouTube only lets verified channels set custom thumbnails. If yours is not verified yet, verify your phone
   number in YouTube Studio first. You can still make and download thumbnails without it.
10. **What happens when I run out of concepts?**
    Generating stops until next month or until you upgrade. Your designs, editor and tests keep working.
11. **Is this for Shorts?**
    Not yet. Marquee is for long-form videos, where the thumbnail decides most of the clicks.
12. **Can my editor or agency use it for me?**
    Yes. Invite them to your workspace with the Editor role. They never see your Google password.

## 13. Final CTA

Background \`--hero-tint\`, 96px vertical padding.
- H2: "Your next video deserves the thumbnail that wins."
- Subhead: "Six ideas with your face in two minutes. A tested winner in about ten days."
- Button: "Start free trial" (46px). Line under it: "7 days free. No thumbnail designer needed."
- Visual: a single row of 4 thumbnails from \`public/landing/thumbs\` with the third one in the accent edge and a
  small "Winner" pill.

## 14. Footer

White, top hairline, 48px padding. Four columns (2 x 2 on mobile):
- Marquee (logo, one line "Thumbnails that prove themselves", copyright).
- Product: How it works, Testing, Pricing, Documentation.
- Company: Contact, Privacy, Terms.
- Compare: Marquee vs Pikzels, Marquee vs ThumbnailTest, Marquee vs TubeBuddy (each a page you write later; until
  then link to the comparison anchor).
Line at the bottom (12px faint): "YouTube is a trademark of Google LLC. Marquee is not affiliated with YouTube."

## 15. Responsive notes

- 320, 375, 430, 768, 1024, 1280, 1440px all checked. Nothing scrolls sideways except the comparison table inside
  its container.
- Hero visual goes under the text below 1024px and the overlapping result card moves inside the frame bottom.
- Feature visuals scale to 100% width with \`aspect-ratio\` set so they never jump on load.
- Pricing boxes stack under 900px, with Pro first.
- Tap targets at least 44px.

## 16. SEO

- Title: "Marquee: YouTube thumbnails with your face, A/B tested on real views"
- Meta description (155 characters): "Type a title, get six thumbnail ideas with your real face cut out, edit them, then
  A/B test them on your live YouTube video. 7 days free."
- H1 used once. H2s per section. \`lang="en-GB"\`.
- Open Graph and Twitter card tags from section 17. Canonical URL. \`robots\` index, follow.
- JSON-LD \`SoftwareApplication\` with name, applicationCategory "MultimediaApplication", offers for the three
  monthly prices.
- Sitemap with \`/\`, \`/pricing\`, \`/privacy\`, \`/terms\`.

## 17. OG image

1200x630 PNG, white background with a 1px hairline frame inset 24px. Left: logo mark, "Marquee" 32px/500, and
"Thumbnails with your real face. Tested on your real views." 48px/500 ink, max 3 lines. Right: two thumbnails
stacked (A and B tags) with "+34% CTR" in a teal-edged pill between them. Generate it with \`next/og\` at
\`app/opengraph-image.tsx\` so it stays in sync with the copy.

## 18. Performance

- LCP under 2.0 s on 4G: the hero gallery is a single pre-composed WebP (about 120 KB) with the 6 cards animated by
  masking, not 6 network images.
- Thumbnails below the fold lazy-load with fixed aspect ratios.
- Fonts: Geist via \`next/font\`, \`display: swap\`. No other fonts on the landing page.
- The demo video loads only on click.

## 19. Analytics events (PostHog)

| Event | When | Properties |
|---|---|---|
| landing_viewed | Page load | referrer, utm_source, utm_campaign |
| cta_clicked | Any "Start free trial" | location (nav, hero, pricing, final), plan, interval |
| demo_played | Demo video starts | |
| demo_completed | Video reaches 90% | |
| pricing_toggled | Monthly/annual switch | to |
| faq_opened | A question opens | index |
| comparison_viewed | Table enters the viewport | |
| signup_started | /signup loads with plan params | plan, interval |

Funnel to watch: landing_viewed, cta_clicked, signup_started, signup_completed, test_started (activation),
subscription_active.
`
