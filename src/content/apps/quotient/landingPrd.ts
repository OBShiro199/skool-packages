// Quotient landing page PRD (LANDING.md).

export const landingPrd = `# Quotient: landing page PRD

Save this file as \`LANDING.md\` in your project root. In Claude Code, say:
"Build the landing page exactly as described in @LANDING.md, using @DESIGN_SYSTEM.md and the accent in @DESIGN.md."

## 0. Page goal

- One job: get a trades business owner (cleaner, window cleaner, gardener, painter, removals) to click
  **Start free trial**.
- Second job: let a web agency that builds sites for trades see the Agency plan and book a call.
- Audience: busy, on a phone between jobs, sceptical of software, has been burned by "all-in-one" tools that took
  a weekend to set up. Design phone-first; most trades owners will read this on a phone.
- The page itself carries a live demo widget (a cleaning calculator), because trying it beats any screenshot.
- Route: \`/\` (marketing route group). \`/pricing\` reuses the pricing section full width. \`/agencies\` reuses the
  page with the agency hero variant (section 3.1).

## 1. Global rules

### 1.1 Base and tokens
The landing page uses \`@DESIGN_SYSTEM.md\` (Quiet Precision) and the level teal accent from \`@DESIGN.md\`, with the
system's marketing rules: **square corners** on boxes and frames (pills keep 4px), a 1180px rail with a hairline
left and right, and larger type than the app. Buttons stay white with a firm ink edge; there are no filled or black
buttons, even here. Extra tokens:

| Token | Value | Use |
|---|---|---|
| \`--hero-tint\` | #f6fbfb | Hero and final CTA band (the accent at about 3%) |
| \`--band\` | #fafafb | Alternate section background (system row hover) |
| \`--chip\` | #eef8f7 | Eyebrow pills (accent soft) with \`--accent-edge\` |
| \`--frame\` | 1px solid #e6e6e9 + system shadow-float | Phone frames, product shots, pricing boxes |

No dark full-width blocks, no stock photos of smiling builders. Visuals are real product states inside thin
phone and browser frames.

### 1.2 Type scale
Geist only (400, 500, 600), tracking from the system table.

| Style | Mobile | Desktop | Weight | Tracking |
|---|---|---|---|---|
| Display (hero H1) | 40px / 1.04 | 64px / 1.02 | 500 | -0.045em |
| H2 | 32px / 1.1 | 48px / 1.06 | 500 | -0.04em |
| H3 | 20px / 26px | 24px / 32px | 500 | -0.025em |
| Body | 16px / 26px | 16px / 26px | 400 | -0.011em |
| Eyebrow | 13px / 18px pill, sentence case | same | 500 | -0.014em |
| Price figures | 32px / 40px tabular | 48px / 52px tabular | 500 | -0.03em |

### 1.3 Layout
- 1180px rail with hairlines left and right; side padding 16px mobile, 24px tablet, 32px desktop.
- Section padding 56px mobile, 80px desktop. Sections split by full-width hairlines. Backgrounds alternate white
  and \`--band\`; hero and final CTA use \`--hero-tint\`.
- Grid children get \`min-width: 0\`; the page clips sideways overflow.

### 1.4 Motion principles
- System curves: \`cubic-bezier(0.16, 1, 0.3, 1)\` for reveals, the morph curve for anything that changes size.
- Default scroll reveal: opacity 0 to 1 and translateY 12px to 0, 360ms, at 20% in view, once per session.
- Stagger children 80ms, max 6 per group.
- \`prefers-reduced-motion: reduce\`: no translate, no auto-playing sequences, fades 150ms only; the hero phone
  shows its final state (price shown, slot booked) as a still.

## 2. Sticky nav

- 64px high, white at 90% opacity with \`backdrop-filter: blur(10px)\`, hairline bottom border after 8px of scroll.
- Left: the mark (a teal spirit-level bubble inside a rounded rectangle, 24px) + wordmark "Quotient".
- Centre (desktop): How it works, Features, Pricing, Compare, Agencies, FAQ (anchor links, offset 72px; Agencies
  goes to \`/agencies\`).
- Right: "Log in" (light edge), "Start free trial" (primary, firm ink edge).
- Mobile: logo + "Start free trial" (small) + menu button opening a Sheet with the links.
- Motion: fades in 300ms on load. No reveal on scroll.

## 3. Hero

- Eyebrow chip: "For cleaners, gardeners, painters, window cleaners and removals"
- H1: "Customers get a price in 60 seconds. You get the booking."
- Subhead (max 560px): "Put an instant quote calculator on your website. Customers answer a few questions, see a
  price range, add photos and book a slot with a deposit. Quotient texts them if they go quiet."
- Buttons: "Start free trial" (primary) and "Try the demo below" (secondary, scrolls to section 6).
- Under the buttons, muted 13px: "7 day free trial · Set up in 20 minutes · Works on Wix, Squarespace and WordPress"
- **Visual (right on desktop, under the copy on mobile):** a 320px phone frame running a scripted sequence of the
  real widget: tap "3 bedrooms", tap "Deep clean", type postcode "SW15", the PriceRange appears ("£180 to £230"),
  a photo tile uploads, the live dot "Checking your photos" pulses once, then a slot "Thu 10:00" is picked and
  "Booked. See you Thursday at 10:00." shows. Behind it, offset 40px, a browser frame of the Leads inbox with the
  new row highlighting in accent soft.
- Motion: the sequence plays once (about 9 s), then holds on the booked state with a "Replay" text button. Each
  step uses the widget's own step morph (300ms). Respect reduced motion (show the final state).

### 3.1 Agency variant (\`/agencies\`)
- Eyebrow: "For web agencies that build sites for trades"
- H1: "Add instant quotes to every trades site you build."
- Subhead: "One subscription covers up to 10 client businesses. Each gets its own calculator, calendar, texting
  number and deposits to their own Stripe. You set it up once and charge a monthly fee."
- Buttons: "Start free trial" and "Book a 15 minute call" (Cal.com link in an env var).

## 4. Logo strip

- Muted line: "Built for the jobs people book online"
- A row of 6 trade icons with labels in faint ink (not customer logos until you have them): Domestic cleaning,
  Window cleaning, Gardening, Painting and decorating, Removals, Pressure washing.
- Swap to real customer logos (greyscale, 24px high) once 6 businesses agree. Section height stays fixed (64px).
- Motion: fade in 300ms as a group.

## 5. Problem

- Eyebrow: "The problem"
- H2: "The first business to send a price usually gets the job"
- Three columns (stack on mobile), each with a Lucide icon, a bold line and one sentence:
  1. Clock: **"Quote requests arrive at 9pm."** "You see them tomorrow on a ladder, and ring back at 6pm."
  2. Car: **"Surveys for small jobs."** "A 40 minute drive to look at three bedrooms you could have priced from a photo."
  3. MessageSquareOff: **"Quotes go quiet."** "Nobody chases, because you are doing the work you already booked."
- A line under the columns in Geist 500 20px: "Quotient answers in seconds, checks the photos, books the slot and
  chases for you."
- Motion: columns rise with 80ms stagger.

## 6. Live demo

- Eyebrow: "Try it"
- H2: "This is what your customers see"
- Body: "A demo cleaning calculator. Change the answers and watch the price. Nothing is sent anywhere."
- Embed the real widget in demo mode (\`/embed/demo\`): the cleaning template, a fake business "Sparkle Cleaning",
  submit replaced with "This is a demo. Start a free trial to get your own." Booking shows example slots only.
- Beside it on desktop (below on mobile): a 60 second screen recording of the owner side, poster image of the
  calculator builder, "Watch the 60 second tour" button; preload none.
- Motion: the widget card fades up once; no other animation (the widget animates itself).

## 7. Feature sections

Six features, alternating text left / visual right. Each: eyebrow, H3, 2 sentences, 3 bullet points, a visual in
a frame. Visuals are real UI states at 2x.

### 7.1 Your prices, your rules
- Eyebrow: "Calculator builder"
- H3: "Price it the way you already do"
- Body: "Per room, per square metre, per hour, fixed prices, extras and minimum charges. Start from a template for
  your trade and change the numbers."
- Bullets: "Postcode zones with surcharges or 'we don't cover this'" · "A price range, rounded the way you like" ·
  "See exactly how every price was worked out"
- Visual: the builder Pricing tab with RuleRows and the phone preview beside it.

### 7.2 On your website in one paste
- Eyebrow: "Embed anywhere"
- H3: "One snippet. Works on the site you already have."
- Body: "Paste one line into Wix, Squarespace, WordPress or Webflow. Or share your quote page link on Google,
  Facebook and the side of your van."
- Bullets: "Matches your brand colour and logo" · "Hosted quote page and QR code included" · "Tracks which
  source each lead came from"
- Visual: the SnippetBox with "Copied", over a blurred trades website.

### 7.3 Photos checked before you drive out
- Eyebrow: "Photo check"
- H3: "Know when a job needs a survey"
- Body: "Customers add photos with their quote. AI compares them with the answers and tells you when the job looks
  bigger or trickier than they said. It never changes your price."
- Bullets: "'Photos show 4 bedrooms, customer said 2'" · "You decide what a flag does" · "No more surveys for
  simple jobs"
- Visual: the AiNote with "Survey suggested" and two flags.

### 7.4 Booked, with a deposit
- Eyebrow: "Booking"
- H3: "From price to booked slot in one go"
- Body: "Customers pick a survey or job slot from your hours. Take a deposit straight into your own Stripe account
  if you want one."
- Bullets: "No double bookings, ever" · "Customers reschedule themselves" · "Bookings appear in your phone's
  calendar"
- Visual: the SlotPicker with Thursday selected, and a "Deposit paid" tag.

### 7.5 Follow-ups that stop at the right time
- Eyebrow: "Follow-ups"
- H3: "Quotient chases. You stay on the job."
- Body: "A text after 2 hours, an email after 2 days, a last nudge after 5. They stop the moment the customer books,
  replies or opts out."
- Bullets: "Texts from your own verified number or business name" · "Quiet hours respected" · "Replies forwarded
  to your email"
- Visual: Messages page follow-up steps and a phone showing the text.

### 7.6 Know what works
- Eyebrow: "Leads and analytics"
- H3: "Every quote in one inbox"
- Body: "New, quoted, booked, won, lost. See your quote-to-booking rate, average job value and which sources bring
  booked jobs, not clicks."
- Bullets: "Text or email from the lead" · "Mark won with the final value" · "Team access on Crew"
- Visual: the inbox with status pills and the analytics stat tiles.

- Motion per section: text fades up, visual fades up 80ms later and drifts 8px (desktop only).

## 8. How it works

- Eyebrow: "How it works"
- H2: "Live in an afternoon"
- Three numbered steps in a row (stack on mobile), each with a small visual:
  1. **"Pick your trade and set your prices"**: "Start from a template. Change the rates, add your postcodes."
  2. **"Paste the snippet on your website"**: "Or share your quote page link and QR code."
  3. **"Get booked jobs, not phone tag"**: "Prices go out instantly. You get a text when someone books."
- Motion: steps rise with 80ms stagger; a 1px hairline connector draws left to right (400ms, morph curve) on
  desktop only.

## 9. Comparison table

- Eyebrow: "Compare"
- H2: "Quotes first. Not another job management system."
- Table (horizontal scroll on mobile, first column sticky). Entry prices per month checked Oct 2026 from review and
  comparison sites; confirm on each vendor's pricing page before launch.

| | Quotient | Jobber | Housecall Pro | BookingKoala | Tradify |
|---|---|---|---|---|---|
| Starting price | $39/month | $49 Core; online booking from Connect, $129 to $139 [verify] | $59 to $79 Basic [verify] | $27 Starter [verify] | $47 per user Lite [verify] |
| Instant price range on your website | Yes | No (booking requests) [verify] | Limited [verify] | Yes (cleaning-style forms) [verify] | No [verify] |
| Per room, per m2, per hour and postcode zones | Yes | No [verify] | No [verify] | Partly [verify] | No [verify] |
| AI photo check for site visits | Yes | No | No | No | No |
| Book survey or job with a deposit | Yes | Yes [verify] | Yes [verify] | Yes [verify] | No [verify] |
| Automatic text and email follow-ups | Yes | Yes, on higher plans [verify] | Yes [verify] | Yes [verify] | Reminders [verify] |
| Works on any website with one snippet | Yes | Yes [verify] | Yes [verify] | Booking page [verify] | No [verify] |
| Job management, invoicing, payroll | No (hands off at booked) | Yes | Yes | Partly | Yes |

- Under the table: "Already use Jobber or Tradify for the work itself? Keep it. Quotient wins the job; your job
  software runs it."
- Motion: rows fade in with 40ms stagger. The Quotient column has an \`--accent-soft\` tint and a top chip "Quotient".

## 10. Testimonials slot

- Eyebrow: "Early users"
- H2: "From people who'd rather be on the tools"
- Three quote cards. Until you have real quotes, the section is hidden in production; in development it shows
  dashed placeholder cards with "Your first customer quote goes here". It appears when \`TESTIMONIALS\` in
  \`lib/testimonials.ts\` has 3 items.
- Card: quote (Geist 500 20px), name, trade, town, small avatar. One number per quote where possible ("Booked 9 end
  of tenancy cleans in the first month without a single phone call.").

## 11. Pricing

- Eyebrow: "Pricing"
- H2: "Pay for quotes, not seats"
- Subhead: "Every plan starts with a 7 day free trial. Cancel any time from Billing."
- **Toggle:** Monthly / Annual pill switch, Annual shows a chip "2 months free". Default Monthly. Digits crossfade
  (200ms), card heights never change.
- Three cards, the middle one highlighted with a 1px \`--accent-edge\` border, accent soft fill and "Most popular" chip:

| | Solo | Crew | Agency |
|---|---|---|---|
| Monthly | $39 | $79 | $299 |
| Annual | $390/year ($32.50/mo) | $790/year ($65.83/mo) | $2,990/year ($249.17/mo) |
| For | One-person businesses | Small teams | Web agencies with trades clients |
| Businesses | 1 | 1 | Up to 10 |
| Seats | 1 | 3 | 10 |
| Instant quotes a month | 120 | 350 | 1,000 shared |
| SMS credits a month | 240 | 700 | 2,000 shared |
| AI photo checks a month | 240 | 700 | 2,000 shared |
| Calculators | 1 | 5 | 30 |
| Calendars | 1 | 3 | 20 |
| Deposits to your Stripe | Yes | Yes | Yes |
| Remove "Quotes by Quotient" | | Yes | Yes |
| Button | Start free trial | Start free trial | Start free trial |

- Small print under the cards: "1 SMS credit = 1 text to a US or Canadian mobile. UK texts use 5 credits. When you
  reach your quote limit, customers still get through; they get their price from you instead of instantly."
- ROI line in Geist 500 24px: "Book one extra $300 job a month and Crew pays for itself almost four times over."
- Risk reversal line: "No setup fee. No contract. Deposits go straight to your own Stripe."
- Buttons go to \`/signup?plan=crew&interval=month\` (carried into Checkout after signup).
- Wire prices to \`STRIPE_PRICE_SOLO_MONTHLY\`, \`STRIPE_PRICE_SOLO_YEARLY\`, \`STRIPE_PRICE_CREW_MONTHLY\`,
  \`STRIPE_PRICE_CREW_YEARLY\`, \`STRIPE_PRICE_AGENCY_MONTHLY\`, \`STRIPE_PRICE_AGENCY_YEARLY\`.
- Motion: cards rise with 80ms stagger; the middle card ends 8px higher on desktop.

## 12. FAQ

Accordion, one open at a time, 200ms height morph, chevron rotates 180deg. Questions and answers:

1. **Do I need a website?** No. You get a hosted quote page (quotient.app/q/your-name) and a QR code. Share the
   link on Google, Facebook, Nextdoor and your van.
2. **Will it work on my Wix / Squarespace / WordPress site?** Yes. Paste one snippet into an embed or HTML block.
   If your builder blocks scripts, use the plain iframe snippet we give you.
3. **What if a job is more complicated than the questions?** Customers can add photos and notes. The photo check
   flags jobs that look bigger or trickier, and you can choose to offer a survey instead of booking the job.
4. **Does the AI change my prices?** Never. Prices come only from your rules. The AI can only add a note and a
   "survey suggested" flag, and you decide what that flag does.
5. **Can I show a range instead of an exact price?** Yes. That's the default. You choose how wide the range is and
   how it's rounded, for example £180 to £230.
6. **How do deposits work?** You connect your own Stripe account. Customers pay the deposit on a Stripe page in
   your business name and the money goes to you. Quotient takes no cut.
7. **Who do the texts come from?** In the US and Canada, from a toll-free number registered in your business name
   (carrier review takes a few days; emails go out in the meantime). In the UK, from your business name, like
   "SparkleCln".
8. **What happens when I run out of quotes or texts?** Customers still reach you. They get "we'll send your price
   shortly" and you get an alert. Texts switch to email. You can upgrade any time.
9. **Can customers book straight into my calendar?** They book into the hours you set in Quotient. Bookings show
   up in Google or Apple Calendar through a calendar link.
10. **Does it replace Jobber or my job software?** No. Quotient wins the job and stops at "booked". Keep your job
    software for scheduling crews, invoicing and payments after that.
11. **I build websites for trades businesses. Can I use this for clients?** Yes. The Agency plan covers up to 10
    client businesses under one login, each with its own calculator, number and Stripe.
12. **Can I cancel?** Yes, any time from Billing. Your leads stay exportable as CSV.

- Motion: items fade in with 40ms stagger once. FAQPage JSON-LD from the same array.

## 13. Final CTA

- Band \`--hero-tint\`, centred.
- H2: "Your next customer is looking for a price tonight"
- Subhead: "Set up your calculator in 20 minutes. Free for 7 days."
- Buttons: "Start free trial" (primary), "See pricing" (secondary).
- Motion: H2 fades up; buttons 80ms later.

## 14. Footer

- Four columns (stack on mobile): Product (Features, Pricing, Compare, Agencies, Changelog), Resources
  (Documentation, Pricing guides for cleaners, Pricing guides for painters, Quote calculator templates), Company
  (About, Contact), Legal (Privacy, Terms).
- Bottom row: "Quotient" wordmark, "Made for people who work with their hands.", copyright year.
- Background \`--band\`, body ink, top hairline.

## 15. Responsive notes

- < 640px: hero phone under the copy, browser frame hidden. Feature visuals under the text. Comparison table
  scrolls sideways with a "Swipe to compare" hint and the first column sticky. Pricing cards stack with Crew first.
- 640 to 1024px: two-column hero with a smaller phone, feature sections single column, demo widget full width.
- > 1024px: full layout.
- Test at 320, 375, 430, 768, 1280 and 1440 wide. No horizontal page scroll at any width.

## 16. SEO

- Title: "Quotient: instant online quotes for cleaners, gardeners and painters"
- Meta description: "Put an instant quote calculator on your website. Customers see a price, add photos and book
  a slot with a deposit. Automatic text follow-ups. 7 day free trial."
- Canonical \`https://YOURDOMAIN/\`. \`robots.ts\` allow all, \`sitemap.ts\` with \`/\`, \`/pricing\`, \`/agencies\`,
  \`/guides/*\`, \`/compare/*\`.
- JSON-LD: SoftwareApplication (name, applicationCategory BusinessApplication, offers with the three monthly prices)
  and FAQPage.
- H1 used once. Every image has alt text describing the product state ("Quote widget showing a price of £180 to
  £230 for a three bedroom deep clean").

## 17. OG image

- 1200 x 630, generated with \`next/og\` at \`app/opengraph-image.tsx\`.
- White with a hairline frame. Left: the mark + "Instant quotes that book the job." in Geist 500 64px, ink. Right:
  a phone frame with the PriceRange "£180 to £230" and a teal "Booked" pill.
- Twitter card: same image, \`summary_large_image\`.

## 18. Performance

- LCP under 2.0 s on 4G: the hero phone is an optimised WebP still (\`next/image\`, \`priority\`); the scripted
  sequence hydrates after load. The demo widget iframe uses \`loading="lazy"\`. The tour video loads on demand.
- Fonts subset to Latin, \`next/font\` with size-adjust (no layout shift).
- Total JS on the landing page under 120 KB gzipped (the widget runs in its own iframe).

## 19. Analytics events (PostHog)

| Event | When | Properties |
|---|---|---|
| \`lp_viewed\` | page load | referrer, utm_source, utm_campaign, variant (main, agencies) |
| \`lp_cta_clicked\` | any Start free trial button | location (nav, hero, pricing_solo, pricing_crew, pricing_agency, final) |
| \`lp_demo_interacted\` | first answer changed in the demo widget | |
| \`lp_demo_priced\` | demo widget shows a price | |
| \`lp_tour_played\` | tour video starts | |
| \`lp_pricing_toggle\` | toggle switched | interval |
| \`lp_compare_viewed\` | comparison table 50% in view | |
| \`lp_faq_opened\` | FAQ item opened | question index |
| \`lp_agency_call_clicked\` | Book a 15 minute call | |
| \`signup_started\` | \`/signup\` loads with a plan param | plan, interval |

Capture UTM params on first visit into a cookie and save them to \`profiles\` on signup (add \`utm jsonb\` with a
migration through the Supabase MCP). The demo widget posts its events to the parent page with postMessage; the
landing page forwards them to PostHog.
`
