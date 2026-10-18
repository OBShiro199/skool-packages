// Retain landing page PRD (LANDING.md).

export const landingPrd = `# Retain: landing page PRD

Save this file as \`LANDING.md\` in the project root and reference it with \`@LANDING.md\`. The page is built in the same
Next.js app at \`/\` and \`/pricing\`, on top of \`@DESIGN_SYSTEM.md\` (Quiet Precision) and \`@DESIGN.md\` (lilac accent).
Marketing rules from the system apply: 1180px max rail with hairlines left and right, sections 80px vertical padding
(56px under 768px), square corners on marketing blocks, white buttons with a firm edge, no filled buttons.

## 0. Goal and audience

- **Visitor:** a SaaS founder at $5k to $100k MRR who just saw their churn number in Stripe and did not like it. Often
  arrives from X, Indie Hackers, a cold email, or a "Churnkey alternative" search.
- **One action:** start the 7 day trial ("Start free trial"). Secondary: "See how the score works" (scrolls to demo).
- **Promise in one line:** see who is about to cancel, and save them, for less than one saved customer a month.

## 1. SEO and meta

- Title (under 60 characters): \`Retain: churn prevention for Stripe SaaS | Save MRR\`
- Meta description (under 160 characters): \`Retain scores every Stripe customer for churn risk, recovers failed payments, and runs a cancel flow with save offers.
  From $49 a month. 7 day trial.\`
- Canonical \`https://retain.app/\`. Open Graph and Twitter card use the OG image below.
- **OG image (1200 x 630):** white background, hairline frame inset 40px. Left: wordmark "Retain" with lilac dot, H1
  "Save customers before they cancel" in 56px ink, line "Churn risk, failed payments and cancel flows for Stripe" in
  24px muted. Right: a cropped Customers table screenshot with three rows (High 82, Watch 54, Low 12) and the saved
  MRR tile "$1,240 saved this month". No gradients.
- JSON-LD \`SoftwareApplication\` with \`offers\` for the three monthly plans.
- \`/pricing\` has its own title "Retain pricing: plans by MRR from $49".

## 2. Sticky nav (64px)

- Left: wordmark "Retain".
- Centre links (13px): How it works, Features, Pricing, Compare, Docs.
- Right: "Log in" (text button), "Start free trial" (primary edge button, 36px).
- White with a hairline bottom once scrolled 8px (no shadow). Under 768px: wordmark, "Start free trial", menu button
  opening a full-width sheet from the top (200ms fade + 8px).

## 3. Hero

- Eyebrow tag (lilac pill): "For SaaS on Stripe Billing"
- H1 (Display 52px, balance): **Save customers before they cancel**
- Subhead (18px, muted, max 560px): "Retain reads your Stripe, scores every customer for churn risk in plain words,
  chases failed payments in your brand and shows a fair offer when someone clicks Cancel."
- Buttons: "Start free trial" (primary edge, 46px large) and "See how the score works" (secondary, 46px).
- Under buttons (13px faint): "7 day trial · No card needed · Installs on Stripe in two clicks"
- **Product visual:** a framed screenshot (hairline, square corners) of the Customers page with the side panel open on
  "Acme Ltd, score 78, High": the signals list ("Their card ends October 2026. Renewal is on 3 Nov." +25, "Used the
  product on 4 days in the last 2 weeks, down from 11 (-64%)." +25, "Cut seats from 8 to 5 on 12 Oct." +15) and the
  AI summary box. 1080px wide on desktop, cropped to the panel on mobile.
- Motion: H1, subhead and buttons fade up 8px, 320ms, staggered 60ms. Screenshot fades up 12px after 180ms, 360ms.
  Reduced motion: all visible at once.

## 4. Logo strip

- Line (13px faint, centred): "Built for founders who bill with"
- Logos in ghost grey, 24px high: Stripe Billing, Stripe Checkout, Customer Portal, Next.js, Supabase, Resend
  (these describe the stack it works with; do not show customer logos until you have permission).
- Swap to real customer logos once 5 customers agree. Static, no marquee.

## 5. Problem

- H2: **Churn is quiet until it's in your MRR chart**
- Three columns (stack under 900px), each with a 16px Lucide icon, H3 and a short paragraph:
  1. **Cards fail silently.** "Expired cards and bank declines cancel customers who never meant to leave. Stripe's
     default email is easy to miss."
  2. **Cancel is one click.** "The Customer Portal lets anyone leave without a question or an offer. You find out a
     day later from a Stripe email."
  3. **Warning signs are scattered.** "Seat cuts, downgrades, a card about to expire and a drop in logins all live in
     different places. Nobody adds them up."
- Callout row under the columns (hairline box): "A $30k MRR SaaS at 5% churn loses $1,500 of MRR every month.
  That's $18,000 of ARR a year, compounding."
- Motion: columns rise once 6px, 360ms, 25ms stagger.

## 6. Product demo

- H2: **See the score explain itself**
- Subhead: "Every score is a sum of plain-words signals. No black box, no guessing."
- A 16:9 video slot (autoplay muted, loop, no controls until hover) showing: Customers table sorted by risk, opening a
  customer, the signals adding up, then the cancel page with a pause offer being accepted. 45 seconds. Poster image is
  the first frame. Under 768px: a static poster with a play button that opens the video full screen.
- Under the video: three numbered captions in a row: "1. Install on Stripe", "2. Scores by morning", "3. Saves start
  the same day".
- Motion: video frame fades in on scroll into view (threshold 25%), 320ms. Video only loads when in view
  (\`preload="none"\`).

## 7. Feature sections (5)

Alternate text left / visual right, then visual left / text right. Each: eyebrow tag, H2, paragraph (max 65ch),
3 bullet lines, and a framed screenshot. Visuals fade up 12px on scroll, 360ms, once.

### 7.1 Churn risk score
- Eyebrow: "Risk score"
- H2: **Know who's leaving this month, and why**
- Copy: "Retain scores every customer from 0 to 100 using failed payments, expiring cards, downgrades, seat cuts,
  trials ending and drops in usage. Each point comes with a sentence you can read in two seconds."
- Bullets: "Updated every night and after every Stripe event" · "One-line AI summary with a suggested action" ·
  "Score accuracy shown every month"
- Visual: Customers table with the score cells and top reasons.

### 7.2 Failed payment recovery
- Eyebrow: "Recovery"
- H2: **Win back failed payments in your brand**
- Copy: "When a renewal fails, Retain sends short emails from your product name with one button. Your customer updates
  their card on a clean page and the invoice is paid straight away."
- Bullets: "Smart Retries checklist with exact Stripe settings" · "Card-expiring reminders before the charge fails" ·
  "Recovered revenue tracked per case"
- Visual: the update-card page on a phone next to the email.

### 7.3 Cancel flow
- Eyebrow: "Cancel flow"
- H2: **One fair offer before they go**
- Copy: "Swap the one-click cancel for a short page: why are you leaving, one offer that fits the reason, and a clear way
  out. Pauses, discounts and downgrades are applied in Stripe the moment they accept."
- Bullets: "Signed requests, so nobody can game your discounts" · "Exit interview tagged by AI" · "Never more than two
  clicks to cancel"
- Visual: the cancel page with "Pause for 2 months instead?".

### 7.4 Win-back emails
- Eyebrow: "Win-back"
- H2: **Personal win-back emails, written from what they used**
- Copy: "Claude drafts three short emails for each cancelled customer from their own usage and reason. Approve them in a
  click, or let them send. Stops the moment they come back or unsubscribe."
- Bullets: "Day 3, 10 and 30 by default" · "Your offer, your signature, your tone" · "Won-back MRR counted for you"
- Visual: the draft panel with three email cards.

### 7.5 Dashboard
- Eyebrow: "Dashboard"
- H2: **The numbers that pay for Retain**
- Copy: "MRR at risk, saved MRR, recovered payments, won-back MRR and churn reasons on one page, with the exact formula
  behind each number."
- Bullets: "Weekly digest email on Monday" · "Reasons by MRR, not just by count" · "Export to CSV"
- Visual: the dashboard tiles and the saved vs churned chart.

### 7.6 Trust: what Retain can and can't do in your Stripe

This block matters more than any feature for this audience: they are handing over their billing. Full width, white,
hairline box, two columns.

- Eyebrow: "Security"
- H2: **You see every permission before you install**
- Left column "Retain can": "Read customers, subscriptions, invoices and payment method expiry dates" · "Pause a
  subscription when a customer accepts a pause" · "Add a discount you set up when a customer accepts it" · "Switch a
  customer to a cheaper price you chose" · "Schedule a cancel at the end of the period when a customer confirms"
- Right column "Retain can't": "Create charges or refunds" · "Move money or change payouts" · "See full card numbers"
  · "Change your Stripe settings" · "Do anything after you uninstall"
- Line under (13px muted): "Access uses short-lived tokens from Stripe's own app install. Uninstall in Stripe >
  Settings > Installed apps and access stops at once."
- Link: "Read how Retain uses Stripe" (to /docs/stripe-permissions).
- Motion: fade up once, 320ms.

## 8. How it works (3 steps)

- H2: **Live in 15 minutes**
- Three cards in a row with a large step number (H2 size, faint ink):
  1. **Install on Stripe.** "Two clicks. You see every permission Retain asks for. Uninstall any time."
  2. **Add the cancel button.** "One script tag and five lines on your server. Copy them from the app."
  3. **Turn on recovery and win-back.** "Edit the emails, pick your offers, done. Scores arrive overnight."
- Under it (13px muted): "Optional: paste the usage snippet so drops in usage count towards the score."
- Motion: cards rise once, 25ms stagger.

## 9. Comparison table

- H2: **Retain vs the usual options**
- Subhead: "Prices as listed publicly in Oct 2026. Check each vendor for current pricing."
- Table (scrolls sideways in its own container under 768px, first column sticky):

| | **Retain** | Churnkey | Baremetrics (with Recover + Cancellation Insights) | Churn Buster | Stripe on its own |
|---|---|---|---|---|---|
| Starting price | **$49/mo** | from $250/mo billed yearly [verify] | from $49/mo plus $129/mo per add-on [verify] | from $249/mo [verify] | Free |
| Churn risk score per customer | **Yes, explained in plain words** | No [verify] | No | No | No |
| Uses product usage data | **Yes (snippet or webhook)** | Partly [verify] | No | No | No |
| Failed-payment emails | **Yes, your brand** | Yes | Yes (Recover) | Yes | Basic |
| Update-card page | **Yes** | Yes | Yes | Yes | Hosted invoice page |
| Cancel flow with offers | **Pause, discount, downgrade** | Yes | Yes (Cancellation Insights) | Yes [verify] | Basic reasons in the portal [verify] |
| AI-written win-back emails | **Yes, from usage history** | No [verify] | No | No | No |
| Priced by MRR band | **Yes** | By churn volume [verify] | By MRR | Custom [verify] | n/a |
| Setup | **Stripe App, 2 clicks** | Stripe connect | Stripe connect | Stripe connect | Built in |

- Footnote (12px faint): "Competitor features and prices from their public pages in Oct 2026. Some are marked to
  verify. Tell us if anything is out of date and we'll fix it within a day."
- Motion: none (tables do not animate).

## 10. Testimonials slot

- H2: **Founders who stopped losing MRR quietly**
- Three cards (quote, name, product, MRR band, small square avatar). Until real quotes exist, hide the section with
  a feature flag. Never ship placeholder quotes.
- Fallback while hidden: a single stat row from your own beta: "Beta founders saved $X of MRR in their first 30
  days" (only once measured; footnote with how it was counted).

## 11. Pricing

- H2: **Pick your plan by MRR**
- Subhead: "Every plan includes the risk score, recovery emails, cancel flow and win-back. Bigger plans track more
  customers."
- Toggle: segmented control "Monthly / Annual (2 months free)". Prices swap in place with a 200ms fade; card heights
  and widths never change (reserve space for "$3,490/yr").
- Three cards (min 300px, equal height, Growth marked "Most popular" with an accent-edge border, not a fill):

| | Starter | Growth | Scale |
|---|---|---|---|
| Monthly | $49/mo | $129/mo | $349/mo |
| Annual | $490/yr | $1,290/yr | $3,490/yr |
| Best for | Up to $10k MRR | Up to $40k MRR | Up to $100k MRR |
| Tracked customers | 500 | 2,000 | 6,000 |
| AI risk summaries / mo | 500 | 2,000 | 6,000 |
| Win-back drafts / mo | 50 | 200 | 400 |
| Exit-interview tags / mo | 100 | 400 | 800 |
| Emails / mo | 500 | 2,000 | 6,000 |
| Usage events / mo | 250k | 1M | 3M |
| Seats | 2 | 5 | 10 |
| Extras | | A/B test offers | Remove Retain badge |

- Button on each: "Start free trial". Under the cards (13px muted): "7 day free trial on every plan. Over $100k MRR?
  Email us."
- Analytics: \`pricing_toggle\` (monthly/annual), \`pricing_cta_clicked\` (plan, interval).

## 12. FAQ (10)

Accordion, one open at a time, 300ms height morph, plus/minus icon that rotates 45 degrees.

1. **How does Retain connect to Stripe?** You install the Retain app from Stripe. Stripe shows the exact permissions
   (read customers, subscriptions and invoices; change subscriptions to apply offers). We never see your secret key,
   and you can uninstall from Stripe at any time.
2. **Can Retain charge my customers or move money?** No. Retain can pause a subscription, add a discount you created,
   change the price to a cheaper one you chose, or schedule a cancel. It cannot create charges or payouts.
3. **How is the risk score worked out?** It's the sum of fixed points for warning signs like a failed payment (35), a
   scheduled cancel (60) or a 50% drop in usage (25). Every point is listed in plain words on the customer page. AI only
   writes the one-line summary on top.
4. **Do I need to add tracking code?** No. Stripe signals work on their own. Adding the usage snippet or server webhook
   makes the score better for customers who go quiet.
5. **Will customers feel trapped in the cancel flow?** No. They see one question, one offer and a clear cancel button.
   Two clicks after the reason and they're done. We think that's the only fair way to do it.
6. **Who sends the failed-payment emails?** Retain sends them with your product name and logo, and replies go to your
   support email. Turn off Stripe's own failed-payment emails so customers don't get two.
7. **Does Claude read my customers' data?** Only the signals and usage summary needed for one sentence or one draft,
   with names inside a data block. Nothing is used to train models.
8. **What happens if I go over my plan?** Nothing breaks. Extra customers are still synced but aren't scored or
   emailed until you upgrade or the month resets. You see the meter long before that.
9. **Do I need Stripe Billing?** Yes. Retain works with Stripe subscriptions (Checkout, Billing, Customer Portal). It
   doesn't support Paddle, Chargebee or app stores yet.
10. **Can I try it on test data first?** Yes. Install in test mode first. You can add your live account later in the
    same workspace.

## 13. Final CTA

- Full-width band (hairlines top and bottom, white, 80px padding).
- H2: **Your next cancel is already in Stripe. Find it today.**
- Subhead: "Install in two clicks. First scores by tomorrow morning."
- Buttons: "Start free trial" (primary edge, large), "Read the docs" (secondary).
- Motion: fade up 8px once.

## 14. Footer

- Four columns: Product (Features, Pricing, Compare, Changelog), Resources (Docs, How the score works, Churn
  calculator, Blog), Company (About, Contact, Status), Legal (Privacy, Terms, Data processing).
- Bottom row: "(c) 2026 Retain" and "Made for founders on Stripe". 12px muted.

## 15. Motion summary

| Section | Motion | Duration | Easing |
|---|---|---|---|
| Hero text | Fade up 8px, stagger 60ms | 320ms | out curve |
| Hero visual | Fade up 12px, delay 180ms | 360ms | out curve |
| Sections | Rise 6px once, stagger 25ms (cap 270ms) | 360ms | out curve |
| Pricing toggle | Price fade | 200ms | out curve |
| FAQ | Height morph | 300ms | morph curve |
| Nav border | Hairline appears | 160ms | out curve |

All reveals use IntersectionObserver at 20% threshold and run once per page load. With \`prefers-reduced-motion\`,
every element renders in its final state.

## 16. Responsive notes

- Check at 320, 375, 430, 768, 1024 and 1440px. No sideways scroll on the page (\`overflow-x: clip\` on the root,
  \`min-width: 0\` on grid children).
- Hero H1 uses the system clamp; under 430px it drops to 35px.
- Feature sections stack text above visual under 900px.
- Comparison table scrolls inside its own container with the first column sticky.
- Pricing cards stack under 900px, Growth first.

## 17. Analytics events

\`landing_view\`, \`hero_cta_clicked\` (primary/secondary), \`demo_video_played\`, \`compare_viewed\`,
\`pricing_toggle\`, \`pricing_cta_clicked\`, \`faq_opened\` (question number), \`final_cta_clicked\`,
\`signup_started\`. Send to DataFast or PostHog with UTM parameters kept on signup.

## 18. Build prompt for Claude Code

"Read @LANDING.md, @DESIGN_SYSTEM.md and @DESIGN.md. Build app/(marketing)/page.tsx and app/(marketing)/pricing/page.tsx
section by section in the order above with the exact copy. Use only design tokens. Put screenshots in /public/landing
as placeholders I will replace. Add the SEO meta, OG image route (app/opengraph-image.tsx) and JSON-LD. Then
screenshot the page at 375px and 1440px and fix anything that overflows."

## 19. Churn calculator page (\`/churn-calculator\`, also a lead magnet)

A free tool that ranks for "SaaS churn calculator" and links to the trial.

- H1: **How much MRR is churn costing you?**
- Inputs (36px controls, labels above): Current MRR ($), Monthly churn rate (%), Share of churn from failed payments
  (%, default 30), Average revenue per customer ($).
- Outputs (money tiles, tabular numbers, fixed widths): "MRR lost this month", "ARR lost over 12 months (compounding)",
  "Customers lost per month", "MRR Retain could save each month" (assumes recovering 50% of failed payments and saving
  20% of voluntary cancels, both shown as editable assumptions), "Retain plan for your MRR" with its price.
- Formula shown under the tiles in 13px muted, in plain words, so nobody feels tricked.
- Button: "Start free trial" and "Email me this breakdown" (email field, sends a Resend email with the numbers, adds
  to a "calculator" audience).
- Events: \`calculator_used\`, \`calculator_email_sent\`.

## 20. Comparison pages (\`/vs/churnkey\`, \`/vs/baremetrics\`, \`/vs/churn-buster\`)

One template, three pages, each with honest copy:
- H1: "Retain vs {competitor}". Subhead: one sentence on who should pick which ("Pick {competitor} if you need
  {their strength}. Pick Retain if you want a churn risk score and cancel flows at {price}.").
- The comparison table from section 9 reduced to the two columns.
- "What switching looks like": three steps (install Retain, copy your offers, swap the cancel button).
- FAQ (4 questions specific to that competitor), final CTA.
- Every competitor fact links to its public pricing page and carries the month checked.

## 21. Copy rules for this page

- Numbers beat adjectives: "$49", "2 clicks", "60 points", "two clicks to cancel".
- Never shame the founder's customers ("stop them leaving"). Say "save", "win back", "a fair offer".
- No fake urgency, no countdown timers, no "limited spots".
- Any claim not measured yet carries a footnote. Any competitor fact carries a month.
- British spelling, US dollar prices.

## 22. Performance

- Largest Contentful Paint under 2.0s on a mid phone over 4G: the hero screenshot is a 1080px AVIF/WebP with explicit
  width and height, \`priority\` in next/image, and a 2x variant only for 1440px+.
- Total JS on the landing page under 120 KB gzipped: no chart library, no animation library (CSS + one small
  IntersectionObserver hook).
- Fonts: Geist via \`next/font\` with \`display: swap\` and only weights 400, 500 and 600.
- The demo video is lazy, muted, under 4 MB (H.264 + WebM), with a poster.
- Lighthouse targets: Performance 95, Accessibility 100, Best practices 100, SEO 100.

## 23. Asset list (what you need to make)

| Asset | Size | Notes |
|---|---|---|
| Hero screenshot | 2160 x 1350 | Customers page with side panel open, test data only |
| Feature screenshots (5) | 1600 x 1000 | One per feature section, cropped to the part that matters |
| Update-card page on phone | 750 x 1500 | For section 7.2 |
| Demo video | 1920 x 1080, 45s | Screen recording, no voice, captions burned in |
| OG image | 1200 x 630 | Built with app/opengraph-image.tsx |
| Favicon | 32, 180, 512 | Lilac dot on white |

Use only fake customers from the seed script in every screenshot (names like "Acme Ltd", emails at example.com).
Never show a real founder's customer data.

## 24. Done when

- Every section above exists in order with the exact copy.
- The page passes the stability rules: nothing shifts when the pricing toggle changes, fonts load, or the video loads.
- 320px has no sideways scroll; the comparison table scrolls inside its container.
- All CTAs fire their analytics event and land on \`/signup\` with UTM parameters kept.
`
