// Halo landing page PRD (LANDING.md).

export const landingPrd = `# Halo: landing page PRD

Save this file as \`LANDING.md\` in your project root. In Claude Code, say:
"Build the landing page exactly as described in @LANDING.md, using the tokens in @DESIGN.md."

## 0. Page goal

- One job: get the owner or manager of a local business (or an agency that serves them) to click
  **Start free trial**.
- Secondary job: show the rating page on a real phone in under 10 seconds, so they see what their customers get.
- Audience: busy, practical, often on a phone between appointments. Has been cold-called by Birdeye or Podium,
  maybe uses a cheap review tool already. Worried about bad reviews and about breaking Google's rules.
  Design mobile-first, then desktop.
- Route: \`/\` (marketing route group). \`/pricing\` reuses the pricing section full width. \`/compare/[competitor]\`
  reuses the comparison table with one competitor. \`/google-review-policy\` is the long-form policy guide.

## 1. Global rules

### 1.1 Base and tokens
The landing page uses \`@DESIGN_SYSTEM.md\` (Quiet Precision) and the Halo accent from \`@DESIGN.md\`, with the
system's marketing rules: **square corners** (0 radius on boxes and frames; pills keep 4px), a 1180px rail with a
hairline left and right, and more expressive type than the app. Buttons stay white with a firm ink edge; there are
no filled or black buttons, even here. The landing page adds:

| Token | Value | Use |
|---|---|---|
| \`--hero-tint\` | #f6fbfa | Hero and final CTA band (the sage accent at about 3%) |
| \`--band\` | #fafafb | Alternate section background (system row hover) |
| \`--chip\` | #eff7f5 | Eyebrow pills (accent soft) with \`--accent-edge\` |
| \`--frame\` | 1px solid #e6e6e9 + system shadow-float | Product shots, phone frames, pricing boxes |

Stars use \`--star\` (#e2a93b) only as glyphs. No dark full-width blocks.

### 1.2 Type scale
Geist only (400, 500, 600), tracking from the system table.

| Style | Mobile | Desktop | Weight | Tracking |
|---|---|---|---|---|
| Display (hero H1) | 40px / 1.04 | 64px / 1.02 | 500 | -0.045em |
| H2 | 32px / 1.1 | 48px / 1.06 | 500 | -0.04em |
| H3 | 20px / 26px | 24px / 32px | 500 | -0.025em |
| Body | 16px / 26px | 16px / 26px | 400 | -0.011em |
| Eyebrow | 13px / 18px pill, sentence case | same | 500 | -0.014em |

### 1.3 Layout
- The 1180px rail with 1px hairlines left and right; side padding 16px mobile, 24px tablet, 32px desktop.
- Section padding 56px mobile, 80px desktop. Sections split by full-width hairlines.
- Backgrounds alternate white and \`--band\`. Hero and final CTA use \`--hero-tint\`.
- Grid children get \`min-width: 0\`; the page clips sideways overflow. Check 320, 375, 430, 768, 1280, 1440px.

### 1.4 Motion principles
- System curves: \`cubic-bezier(0.16, 1, 0.3, 1)\` for reveals, the morph curve for size changes.
- Default scroll reveal: opacity 0 to 1 and translateY 12px to 0, 360ms, when 20% of the element is in view,
  once per session (IntersectionObserver).
- Stagger children 80ms, max 6 per group.
- \`prefers-reduced-motion: reduce\`: no translate, no parallax, no loops; fades 150ms only. The hero phone shows
  its final frame; the demo video shows its poster with a play button instead of autoplaying.

## 2. Sticky nav

- 64px high, white at 90% opacity with \`backdrop-filter: blur(10px)\`, a hairline bottom once scrolled 8px.
- Left: the ring mark (a 20px sage ring with a small star cut into the top) + wordmark "Halo".
- Centre (desktop): How it works, Features, Pricing, Compare, FAQ (anchor links, smooth scroll, offset 72px).
- Right: "Log in" (secondary), "Start free trial" (primary, firm ink edge).
- Mobile: logo + "Start free trial" (small) + a menu button opening a Sheet with the anchor links.
- Motion: fades in 300ms on load. No hide-on-scroll.

## 3. Hero

- Eyebrow chip: "For dentists, clinics, salons, trades and the agencies that serve them"
- H1: "More Google reviews, without breaking Google's rules."
- Subhead: "Halo texts every customer after their visit with a two-tap way to rate you and post on Google.
  Unhappy customers can also tell you privately, so you hear about problems the same day. New reviews get a
  reply drafted in your voice, ready to approve."
- Primary button: "Start free trial" (to \`/signup\`)
- Secondary button: "See what customers get" (scrolls to section 6 and plays the phone demo)
- Trust line: "7 days free. No card to start. Set up in 5 minutes with a link you already have."
- **Visual (right on desktop, under the copy on mobile):** a phone frame (square outer frame with \`--frame\`, the
  screen inside at 6px radius) showing the rating page for "Brightside Dental": logo, "How was your visit to
  Brightside Dental?", 5 stars, the "Post a review on Google" button, "Tell the team privately". Behind it, offset
  up and left, a slice of the dashboard: KPI tiles "Requests sent 412", "Clicked to Google 31%", "New reviews 58",
  "Average 4.82". Front right, a small card: a text bubble "Hi Maria, thanks for visiting Brightside Dental today.
  How did we do? usehalo.app/r/x7Kp2..."
- Motion: copy staggers in. The text bubble slides up 16px at 200ms, the phone at 340ms, the dashboard slice at
  480ms. On the phone, a 4 second loop plays once (not looped): a thumb taps the 5th star (stars fill), the
  thank-you line fades in, the Google button presses to 98%. Then it rests. Reduced motion: final frame.

## 4. Logo strip

- Line above: "Built for businesses that run on appointments and jobs"
- Seven trade badges until you have real logos: Dental, Clinics, Physio, Salons and spas, Barbers, Home services,
  Auto repair. Muted ink at 60% opacity, full on hover. Each badge links to its \`/for/[trade]\` page later.
- Replace with 6 real customer logos (with permission) as soon as you have them.
- Motion: one group fade, 400ms.

## 5. Problem

- Eyebrow: "Why the reviews do not come"
- H2: "Happy customers go home. Unhappy ones go on Google."
- Three columns (stacked on mobile), each with a small sage Lucide icon:
  1. **"We ask at the desk."** "And forget by the third customer of the day. A QR code on the counter gets
     scanned twice a month."
  2. **"We found out a week later."** "A one star review sat unanswered while it put off every new customer who
     read it."
  3. **"The cheap tools cheat."** "Some review tools only send happy customers to Google. That is called review
     gating. Google bans it, and it can cost you reviews."
- Closing line, centred, Geist 500 24px: "Ask everyone, the same way, at the right moment. Then listen."
- Motion: columns stagger 80ms.

## 6. Product demo

- Eyebrow: "See it work"
- H2: "One text. Two taps. A Google review."
- Left: a 9:16 phone video frame (square outer frame, \`--frame\`) with a poster and a large white play button.
  Video: 40 seconds, screen recording on a real phone, captions burned in: the text arrives, tap the link, tap 5
  stars, tap "Post a review on Google", Google's review form opens with stars pre-selected by the customer, post.
  Then the same flow with 2 stars: the private note opens below the same Google button, the customer writes
  "Waited 40 minutes past my time", sends, and the owner's phone shows the alert email.
- Right: three timestamp chips that seek the video: "0:03 The text", "0:12 Post on Google", "0:26 Private note
  and alert". Under them, one sentence in faint ink: "Every customer sees the same Google button, whatever they
  rate. That is how Halo keeps you inside Google's rules."
- Host the MP4 on Vercel Blob or Supabase public storage, \`preload="none"\`, \`playsinline\`, muted autoplay only
  when in view and reduced motion is off.

## 7. Feature sections

Alternate image left and right on desktop. Each: eyebrow, H2 at 36px, body, 3 bullets, a visual.

### 7.1 Ask at the right moment, automatically
- Eyebrow: "Requests"
- Heading: "Every finished visit gets a friendly text two hours later."
- Body: "Connect your booking tool with Zapier or a webhook, upload yesterday's visits as a CSV, or send one by
  hand. Halo waits for your sending hours, sends one text, and one reminder only if they never opened it."
- Bullets: "Works with any booking or job tool through Zapier or webhooks" / "Texts from your own verified number,
  in your business name" / "Never asks the same person twice in 90 days"
- Visual: the Requests table with funnel ticks and a "Scheduled for 09:00" pill.

### 7.2 Hear from unhappy customers first
- Eyebrow: "Private feedback"
- Heading: "A problem in your inbox today, not on Google next week."
- Body: "Anyone can send a private note with their rating. Low ratings open the note box straight away, and you
  get an email with their name and number within a minute, so you can call and put it right."
- Bullets: "Alerts for 3 stars or fewer (you choose)" / "Inbox with Contacted and Resolved" / "Every customer
  still sees the Google button"
- Visual: the feedback alert email on a phone: "2 star feedback from Tom R. at Brightside Dental".

### 7.3 Reply to every review in your voice
- Eyebrow: "AI replies"
- Heading: "A reply drafted the moment a review lands. You approve it."
- Body: "Halo learns your tone from a few replies you like. Each new Google review gets a short, specific draft.
  Edit it or approve it, and it posts to Google. Nothing posts without you."
- Bullets: "Never confirms private details (safe for clinics)" / "Flags reviews you should handle personally" /
  "Works by copy and paste if you have not connected Google yet"
- Visual: the DraftCard with a 4 star review and its draft, "Approve and post" button.

### 7.4 See what is working
- Eyebrow: "Dashboard"
- Heading: "Requests, clicks, new reviews and your rating, per location."
- Body: "One dashboard for one shop or ten. See how many customers opened the text, how many went to Google, how
  many new reviews arrived, and where your average is heading."
- Bullets: "Rating trend over time" / "Compare locations side by side" / "Weekly report for each location"
- Visual: dashboard with the funnel and rating trend at 4.61 to 4.82.

### 7.5 Built to Google's rules
- Eyebrow: "Policy-safe"
- Heading: "No review gating. Ever."
- Body: "Google does not allow businesses to selectively ask happy customers for reviews or to discourage negative
  ones, or to offer anything in return for a review. Halo is designed around those rules: same message to every
  customer, same Google button for every rating, no incentives."
- Bullets: "Same Google button for every rating" / "No incentive wording allowed in templates" / "Read the plain
  English guide" (link to \`/google-review-policy\`)
- Visual: two phone screens side by side, 5 stars and 2 stars, with a thin sage line connecting the two
  identical Google buttons and a caption "Same button, same place".

### 7.6 Made for agencies too
- Eyebrow: "Agencies"
- Heading: "Run reviews for ten client businesses from one login."
- Body: "Each client gets its own number, review link, tone and report, with your clients' names on every email
  and no Halo branding."
- Bullets: "Up to 10 client locations" / "Weekly client reports by email" / "Switch clients in one click"
- Visual: the location switcher open with five client names and status dots.

Motion for all feature sections: text column first, visual 120ms later with a 0.98 to 1 scale. Parallax on
visuals 12px max (desktop only, off for reduced motion).

## 8. How it works

- Eyebrow: "Three steps"
- H2: "Live in an afternoon"
- Three numbered cards joined by a dotted sage line (horizontal desktop, vertical mobile):
  1. **"Add your review link"** "Paste the link from your Google Business Profile, or connect Google."
  2. **"Connect your visits"** "Zapier, a webhook, a CSV, or send by hand. Register your texting number in the
     same form."
  3. **"Watch reviews arrive"** "Customers rate, post on Google or tell you privately. You approve the replies."
- Motion: the dotted line draws over 900ms on entry (stroke-dashoffset), cards reveal as it reaches them.

## 9. Comparison table

- Eyebrow: "Compare"
- H2: "Everything a local business needs for reviews, without the suite price"
- Table (horizontal scroll on mobile, first column sticky). Prices are entry list prices from comparison sites,
  checked Oct 2026. They change often and some vendors only quote: confirm on each vendor's page before launch.

| | Halo | Birdeye | Podium | NiceJob | GatherUp |
|---|---|---|---|---|---|
| Starting price | $49/month | from $299/location/month [verify] | from $399/month, 12 month contract [verify] | from $75/month [verify] | from $99/month [verify] |
| Monthly, cancel any time | Yes | Quote, annual [verify] | Annual contract [verify] | Yes [verify] | Yes [verify] |
| Review requests by SMS and email | Yes | Yes | Yes | Yes | Yes |
| Same Google button for every rating (no gating) | Yes, by design | [verify] | [verify] | [verify] | [verify] |
| Private feedback with instant owner alert | Yes | Yes | Yes [verify] | [verify] | Yes |
| AI reply drafts in your tone, you approve | Yes | Yes [verify] | Yes [verify] | Pro plan [verify] | [verify] |
| Zapier and webhook intake | Yes | Integrations [verify] | Integrations [verify] | Integrations [verify] | Yes [verify] |
| Multi-location dashboard | Yes, up to 10 | Yes | Yes | [verify] | Yes |
| Agency white-label emails | Agency plan | Agency programme [verify] | [verify] | [verify] | Agency plan [verify] |

- Under the table: "Halo does one job well: more Google reviews and faster replies. If you also need chat, payments
  and listings management, a suite may suit you better."
- Motion: rows fade in with 40ms stagger. The Halo column has an \`--accent-soft\` tint and a top chip "Halo".

## 10. Testimonials slot

- Eyebrow: "Early users"
- H2: "What owners are saying"
- Three quote cards with one number each where possible ("From 41 to 118 Google reviews in four months.").
  Until you have real quotes, the section is hidden in production (\`lib/testimonials.ts\` must hold 3 items);
  in development it renders dashed placeholder cards "Your first customer quote goes here".
- Card: quote (Geist 500 20px), name, role, business, trade badge, small avatar.

## 11. Pricing

- Eyebrow: "Pricing"
- H2: "Simple plans. Cancel any time."
- Monthly / Yearly toggle (segmented control, 36px, fixed width so the label change never shifts the row). Yearly
  shows "2 months free" in a sage pill. Prices change in place with tabular figures (no width jump).
- Three cards, square frames, equal height:

| | Solo | Growth | Agency |
|---|---|---|---|
| Monthly | $49/month | $99/month | $299/month |
| Yearly | $490/year ($40.83/month) | $990/year ($82.50/month) | $2,990/year ($249.17/month) |
| For | One location | Up to 3 locations | Up to 10 client locations |
| Review requests a month | 250 | 600 | 1,200 |
| AI reply drafts a month | 40 | 150 | 400 |
| Team seats | 2 | 5 | 10 |
| Includes | SMS from your own verified number, email, private feedback alerts, Zapier and webhook intake, CSV import, dashboard | Everything in Solo, location comparison, daily digest | Everything in Growth, one number per client business, weekly client reports, no Halo branding on emails |
| Button | "Start free trial" | "Start free trial" | "Start free trial" |

- Growth carries a "Most popular" sage pill and the \`--accent-edge\` border.
- Under the cards: "7 day free trial with 50 requests and 10 AI drafts. Texting starts once your number is approved
  by the carriers (usually 5 to 15 business days); email works from day one. US texting only for now."
- Footnote: "A request is one customer asked once, plus one reminder if they never opened it."
- Motion: cards stagger 80ms; on toggle, numbers cross-fade 160ms.

## 12. FAQ

Accordion (one open at a time, height morph 300ms). Exact copy:

1. **Is this review gating?** No. Review gating means only sending happy customers to Google, or hiding the Google
   option from unhappy ones. Every Halo customer sees the same "Post a review on Google" button in the same place,
   whatever they rate, and can skip the rating altogether. The private note is offered to everyone too.
2. **Why offer a private note at all?** Because an unhappy customer who is heard and helped is worth more than one
   who is ignored. They can still post on Google if they want to. Halo never asks them not to.
3. **Do I need to connect my Google Business Profile?** No. Paste your review link and Halo works straight away.
   Connect Google when you want new reviews in Halo and replies posted from Halo.
4. **How do my visits get into Halo?** Three ways: Zapier (any booking or job tool Zapier supports, using Webhooks by
   Zapier, which needs a paid Zapier plan), your tool's own webhook pointed at Halo, or a CSV upload. You can also
   send one by hand from your phone.
5. **Why does texting need approval?** US carriers require every business that texts customers to be verified. Halo
   registers a toll-free number in your business name for you. It usually takes 5 to 15 business days. Email works
   while you wait.
6. **Can I text customers outside the US?** Not yet. Halo sends email to everyone else.
7. **Will customers get spammed?** No. One text after a visit, one reminder only if they never opened it, never more
   than once in 90 days, and STOP works instantly.
8. **Does the AI post replies by itself?** Never. It drafts, you approve. Drafts never mention private details like
   treatment, which matters for clinics and dentists.
9. **Can I offer a discount for reviews?** No, and Halo blocks it. Google and the FTC do not allow incentives for
   reviews. Halo templates reject words like "discount", "free" or "prize".
10. **What happens when I hit my monthly limit?** Halo emails you at 80%. At 100%, new requests wait as "limit
    reached" and you can upgrade any time. Nothing is charged automatically.
11. **I run an agency. Can my clients see their own numbers?** Yes, by a weekly email report per client location.
    Client logins are on the roadmap.
12. **Can I cancel any time?** Yes, from Billing in two clicks. You keep your data for 30 days.

## 13. Final CTA

- Band in \`--hero-tint\`. H2: "Your next happy customer is leaving right now."
- Body: "Start the trial, paste your review link, and send the first request to yourself in five minutes."
- Primary "Start free trial", secondary "Read the Google policy guide".
- Motion: H2 reveal 360ms, buttons 80ms later.

## 14. Footer

- Columns: Product (Features, Pricing, Compare, Google review policy), Trades (Dental, Clinics, Salons, Home
  services, Agencies), Company (About, Contact, Changelog), Legal (Privacy, Terms, SMS terms).
- Bottom row: "Halo is not affiliated with Google. Google is a trademark of Google LLC." and the copyright line.
- Hairline top border, 13px text, faint ink.

## 15. Responsive notes

- 320 to 430px: hero copy first, phone visual under it at 280px wide, dashboard slice hidden. Comparison table
  scrolls sideways with the first column sticky and a fade on the right edge. Pricing cards stack, Growth first.
- 768px: features become single column with visuals under text. How-it-works goes vertical.
- 1280px+: hero 6/6 split, features alternate.
- Tap targets 44px minimum. No hover-only information.

## 16. SEO

- Title (58 chars): "Halo: Google review requests by text, without review gating"
- Meta description (152 chars): "Text every customer after their visit, get more Google reviews, hear about unhappy
  customers first, and reply to reviews with AI drafts. 7 day free trial."
- H1 once per page. Canonical \`https://usehalo.app/\`.
- JSON-LD: \`SoftwareApplication\` with offers for the three plans, and \`FAQPage\` from section 12.
- Extra pages for search: \`/google-review-policy\` ("Is review gating allowed?"), \`/compare/birdeye\`,
  \`/compare/podium\`, \`/compare/nicejob\`, \`/compare/gatherup\`, \`/for/dentists\`, \`/for/salons\`,
  \`/for/home-services\`.

## 17. OG image

- 1200 x 630, white, a hairline frame inset 32px. Left: "More Google reviews, without breaking Google's rules."
  (Geist 500, 56px, ink, balanced). Right: the phone rating page at 40% scale with 5 gold stars and the Google
  button. Bottom left: ring mark + "Halo" and "usehalo.app" in faint ink.
- Generated with \`next/og\` at \`app/opengraph-image.tsx\`. Same layout for \`/compare/*\` with the competitor name.

## 18. Analytics events (PostHog, marketing pages)

\`lp_view\`, \`lp_cta_click {location: hero|nav|pricing|final}\`, \`lp_demo_play\`, \`lp_demo_seek {chip}\`,
\`lp_pricing_toggle {interval}\`, \`lp_plan_click {plan}\`, \`lp_faq_open {q}\`, \`lp_compare_scroll\`,
\`lp_policy_guide_click\`. UTM parameters are stored in a first-party cookie for 30 days and copied onto the profile at
signup. DataFast is a fine alternative for revenue attribution by channel.

## 19. Performance

- LCP under 2.0 s on 4G: hero visual as a static AVIF with the animated phone loaded after first paint.
- Fonts: Geist subset, \`font-display: swap\`. No third-party scripts above the fold except PostHog (deferred).
- Lighthouse: 95+ performance, 100 accessibility on mobile.
`
