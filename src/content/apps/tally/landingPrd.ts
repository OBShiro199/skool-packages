// Tally landing page PRD (LANDING.md).

export const landingPrd = `# Tally: landing page PRD

Save this file as \`LANDING.md\` in your project root. In Claude Code, say:
"Build the landing page exactly as described in @LANDING.md, using @DESIGN_SYSTEM.md and the tokens in @DESIGN.md."

## 0. Page goal

- One job: get a freelancer, consultant or small agency owner to click **Start free trial**.
- Secondary job: let them see a 45 second demo of an invoice being sent, reminded and paid without them touching it.
- Audience: busy, slightly embarrassed about chasing money, has tried FreshBooks or a spreadsheet, has at least one
  invoice overdue right now. Reads on a phone between jobs as often as on a laptop. Design mobile-first.
- Route: \`/\` (marketing route group). \`/pricing\` reuses the pricing section full width.
- Claims rule: Tally never promises a result like "get paid X days faster". Improvement numbers appear only as goals
  ("Built to cut the time between sending and getting paid") or as the user's own measured data inside the app.

## 1. Global rules

### 1.1 Base and tokens
The landing page uses \`@DESIGN_SYSTEM.md\` (Quiet Precision) and the Tally accent from \`@DESIGN.md\`, with the system's
marketing rules: **square corners** (0 radius on boxes and frames; pills keep 4px), a 1180px rail with a hairline left
and right, and more expressive type than the app. Buttons stay white with a firm ink edge; there are no filled or black
buttons, even here. The landing page adds:

| Token | Value | Use |
|---|---|---|
| \`--hero-tint\` | #f6fbfa | Hero and final CTA band (the teal accent at about 3%) |
| \`--band\` | #fafafb | Alternate section background (system row hover) |
| \`--chip\` | #eff7f6 | Eyebrow pills (accent soft) with \`--accent-edge\` |
| \`--frame\` | 1px solid #e6e6e9 + system shadow-float | Product shots, pricing boxes, email mockups |

No dark full-width blocks. Contrast comes from large Geist display type, ink, tabular money and the teal accent used
sparingly. Green appears only on "Paid" pills, exactly as in the app.

### 1.2 Type scale
Geist only (400, 500, 600), tracking from the system table.

| Style | Mobile | Desktop | Weight | Tracking |
|---|---|---|---|---|
| Display (hero H1) | 40px / 1.04 | 64px / 1.02 | 500 | -0.045em |
| H2 | 32px / 1.1 | 48px / 1.06 | 500 | -0.04em |
| H3 | 20px / 26px | 24px / 32px | 500 | -0.025em |
| Body | 16px / 26px | 16px / 26px | 400 | -0.011em |
| Eyebrow | 13px / 18px pill, sentence case | same | 500 | -0.014em |
| Money in visuals | tabular-nums everywhere | | 500 | |

### 1.3 Layout
- The 1180px rail with 1px hairlines left and right; side padding 16px mobile, 24px tablet, 32px desktop.
- Section padding 56px mobile, 80px desktop. Sections split by full-width hairlines.
- Backgrounds alternate white and \`--band\`. Hero and final CTA use \`--hero-tint\`.
- Grid children get \`min-width: 0\` and the page clips sideways overflow (system rule).

### 1.4 Motion principles
- System curves: \`cubic-bezier(0.16, 1, 0.3, 1)\` for reveals, the morph curve for anything that changes size.
- Default scroll reveal: opacity 0 to 1 and translateY 12px to 0, 360ms, when 20% of the element is in view, once per
  session (IntersectionObserver).
- Stagger children 80ms, max 6 per group.
- \`prefers-reduced-motion: reduce\`: no translate, no auto-playing loops; 150ms fades only. The demo shows its poster
  with a play button instead of autoplaying, and every animated visual renders its final frame.

## 2. Sticky nav

- 64px high, white at 90% opacity with \`backdrop-filter: blur(10px)\`, 1px hairline bottom border once the page scrolls
  past 8px.
- Left: the tally mark (four teal strokes and one ink diagonal) + wordmark "Tally".
- Centre (desktop): How it works, Features, Pricing, Compare, FAQ (anchor links, smooth scroll, offset 72px).
- Right: "Log in" (secondary, light edge), "Start free trial" (primary, firm ink edge).
- Mobile: mark + "Start free trial" (small, 32px) + menu button opening a Sheet with the anchor links.
- Motion: fades in 300ms on load. No scroll-linked motion.

## 3. Hero

- Eyebrow chip: "For freelancers, consultants and small agencies"
- H1: "Invoices that chase themselves."
- Subhead: "Send a branded invoice from your own email domain. Tally reminds your client politely, then a little more
  firmly, until they pay. The moment they pay or reply, it stops."
- Primary button: "Start free trial" (goes to \`/signup\`)
- Secondary button: "See it in 45 seconds" (scrolls to section 6 and plays the demo)
- Trust line under the buttons: "7 days free. Clients pay into your own Stripe account. Tally never touches the money."
- **Visual (right on desktop, under the copy on mobile):** a layered composition, square frames with \`--frame\`:
  1. Back: the invoice detail screen for "INV-0042 · Northwind Coffee", $2,400.00 due, the SequenceTimeline with the
     first two dots sent.
  2. Front left: an email card from "Moss Studio <accounts@billing.moss.studio>", subject "Quick reminder: INV-0042 for
     $2,400.00", with the "View and pay" button.
  3. Front right: a phone with the pay page and a toast "Northwind paid $2,400.00" with a green Paid pill.
- Motion: copy reveals with stagger (eyebrow, H1, subhead, buttons, trust line). Layers slide in from 24px below at 0,
  140 and 280ms. The timeline dots fill one by one (300ms each) starting at 900ms. At 2.1s the toast rises 8px and the
  invoice StatusPill changes from "Sent" to "Paid" in place (colour only). Reduced motion: final state, no fills.

## 4. Logo strip

- Line above: "Made for people who invoice for their time"
- Six role badges instead of fake customer logos (until you have real ones): Designers, Developers, Copywriters, Video
  editors, Consultants, Small agencies. Muted ink, 60% opacity, full on hover.
- Replace with real customer logos once you have 6 with permission.
- Motion: one group fade, 400ms.

## 5. Problem

- Eyebrow: "The awkward part of freelancing"
- H2: "You did the work. Now you are the debt collector."
- Three columns (stacked on mobile), each with a small teal line icon (Lucide, 1.5 stroke):
  1. **"I'll chase it on Friday."** "Then Friday is busy, and the invoice is three weeks late before you notice."
  2. **"How do I say this nicely?"** "Writing the third reminder to a client you like takes longer than the work did."
  3. **"Did they pay half?"** "Deposits, part payments and bank transfers end up in a spreadsheet nobody trusts."
- Closing line, centred, Geist 500 24px: "Late payment is a system problem. Tally is the system."
- Motion: columns stagger 80ms.

## 6. Product demo

- Eyebrow: "See it work"
- H2: "Send once. Tally handles the rest."
- A 16:9 video frame (square, \`--frame\`) with a poster and a large white play button with a firm edge. 45 seconds,
  screen recording with captions burned in: create an invoice, send it from your domain, the client opens it on a
  phone, a reminder goes out at +3 days, the client replies "paying Friday", Tally pauses until Saturday, the client
  pays by bank transfer, everything stops and the dashboard updates.
- Three timestamp chips under it that seek the video: "0:04 Send", "0:18 The reminder", "0:33 Paid".
- Host the MP4 on Supabase public storage or Vercel Blob, \`preload="none"\`, \`playsinline\`, muted autoplay only when in
  view and reduced motion is off.

## 7. Feature sections

Alternate visual left and right on desktop. Each: eyebrow, heading (H2 tag at 36px), body, 3 bullets, a visual.

### 7.1 Reminders that sound like you
- Eyebrow: "Polite, then firm"
- Heading: "Five reminders, each a little clearer than the last."
- Body: "Three days before it is due, on the day, then 3, 7 and 14 days after. Edit every word, or paste one of your
  own emails and Tally rewrites the whole sequence in your voice."
- Bullets: "Sent in your client's working hours" / "Different rules for different clients" / "Optional late fees,
  capped and clearly stated"
- Visual: the reminders editor with the five steps and the live email preview.

### 7.2 Stops the moment they reply
- Eyebrow: "Never awkward"
- Heading: "A reply pauses everything. 'Paying Friday' pauses until Saturday."
- Body: "Every reminder goes out with a reply address Tally can read. When your client writes back, reminders stop at
  once and the reply lands in your inbox with a one-line summary. If they promise a date, Tally waits until then."
- Bullets: "Out-of-office replies do not stop the sequence" / "Disputes are flagged for you, never auto-answered" /
  "You decide when to resume"
- Visual: a ReplyCard "Promise to pay · 20 Nov" with "Paused until 21 Nov" in amber.

### 7.3 From your domain, with your brand
- Eyebrow: "Looks like you"
- Heading: "Your logo, your colours, your email address."
- Body: "Invoices and reminders come from accounts@yourstudio.com, not a no-reply address. The PDF and the pay page
  use your brand colour, so clients see your business, not ours."
- Bullets: "Step-by-step DNS help for Porkbun, Cloudflare and GoDaddy" / "PDF attached on the first send" / "Hosted pay
  page that works on any phone"
- Visual: the email mockup next to the pay page in the user's accent.

### 7.4 Paid by card or bank, straight to you
- Eyebrow: "Getting paid"
- Heading: "Clients pay in a minute. The money goes to your Stripe."
- Body: "Card everywhere, plus ACH, SEPA and Bacs Direct Debit or bank transfer where your Stripe account supports them.
  Take deposits, accept part payments, and record cheques or wires by hand."
- Bullets: "No cut taken by Tally" / "Part payments with a minimum you set" / "Deposits deducted from the final invoice"
- Visual: the pay page with Pay in full / Pay part and the method choice.

### 7.5 Recurring and multi-currency
- Eyebrow: "Set and forget"
- Heading: "Retainers bill themselves, in any currency."
- Body: "Weekly, monthly, quarterly or yearly invoices that send themselves or wait for your OK. Invoice in USD, EUR, GBP
  and more, and see everything in your own currency."
- Bullets: "Auto-send or draft for review" / "Daily ECB exchange rates" / "Per-client currency and terms"
- Visual: the recurring list with "Monthly on the 1st · Sends".

### 7.6 Know what is coming in
- Eyebrow: "Dashboard"
- Heading: "Outstanding, overdue and the next 8 weeks of cash."
- Body: "See who owes what, how long each client really takes to pay, and a cash forecast built from their actual
  history. Export everything for your accountant in one click, in Xero or QuickBooks layout."
- Bullets: "Average days to pay, per client" / "Cash forecast by week" / "CSV export for your accountant"
- Visual: the dashboard stat boxes and forecast bars.

Motion for all feature sections: text column reveals first, visual 120ms later with a 0.98 to 1 scale. Max 12px
parallax on visuals on desktop only, off for reduced motion.

## 8. How it works

- Eyebrow: "Three steps"
- H2: "Set it up once. Then send."
- Three numbered cards joined by a dotted teal line (horizontal desktop, vertical mobile):
  1. **"Connect"** "Connect Stripe and verify your email domain. About 10 minutes, once."
  2. **"Send"** "Create an invoice, add your client, hit Send."
  3. **"Get paid"** "Tally reminds them until they pay, then sends the receipt and tells you."
- Motion: the dotted line draws 0 to 100% (SVG stroke-dashoffset) over 900ms as the section enters; cards reveal as the
  line reaches them. Reduced motion: line fully drawn.

## 9. Comparison table

- Eyebrow: "Compare"
- H2: "Built around the follow-up, not just the invoice"
- Table (horizontal scroll on mobile with the first column sticky). Prices are entry plans, checked Oct 2026 from
  comparison sites; confirm on each vendor's own pricing page before launch and update the [verify] cells.

| | Tally | FreshBooks | Bonsai | Invoice Ninja | Chaser |
|---|---|---|---|---|---|
| Starting price | $19/month | $23/month Lite, 5 billable clients [verify] | $15/month Basic monthly, $9 annual [verify] | Free; Pro about $14/month [verify] | From about £199/month [verify] |
| Sends from your own email domain | Yes | [verify] | [verify] | Yes, with your own SMTP [verify] | Yes [verify] |
| 5-step escalating reminders, editable | Yes | Reminders [verify] | Reminders [verify] | Reminders [verify] | Yes |
| Pauses when the client replies | Yes | [verify] | [verify] | [verify] | [verify] |
| Understands "I'll pay Friday" | Yes | No [verify] | No [verify] | No [verify] | [verify] |
| Card and bank payments to your own Stripe | Yes | Own processor [verify] | Yes [verify] | Yes | Payment portal [verify] |
| Partial payments and deposits | Yes | Yes [verify] | [verify] | Yes | [verify] |
| Built for | Freelancers and small agencies | Small businesses, accounting | Freelancers, all-in-one | Freelancers, self-host option | Finance teams with an accounting system |

- Under the table: "Already use an accounting tool? Keep it. Tally exports clean CSVs for your accountant, in Xero and
  QuickBooks layouts."
- Motion: rows fade in with 40ms stagger. The Tally column has an \`--accent-soft\` tint and a top chip "Tally".

## 10. Testimonials slot

- Eyebrow: "Early users"
- H2: "What freelancers say"
- Three quote cards. Until you have real quotes, render the slot only in development with dashed placeholder cards
  saying "Your first customer quote goes here". In production the section is hidden until \`TESTIMONIALS\` in
  \`lib/testimonials.ts\` has 3 items.
- Card: quote (Geist 500 20px), name, role, business, small avatar. One number per quote where possible, from the
  customer's own experience ("I have not written a chase email since March.").

## 11. Pricing

- Eyebrow: "Pricing"
- H2: "Simple plans. No cut of your payments."
- Subhead: "Every plan starts with a 7 day free trial. Cancel any time from Billing."
- **Toggle:** Monthly / Annual pill switch, Annual shows a chip "2 months free". Default Monthly. Price digits crossfade
  200ms in fixed-width slots; the toggle swaps the Checkout price id.
- Three cards, middle highlighted with a 1px \`--accent-edge\` border, the accent soft fill and a "Most popular" chip:

| | Solo | Studio | Agency |
|---|---|---|---|
| Monthly | $19 | $39 | $79 |
| Annual | $190/year ($15.83/mo) | $390/year ($32.50/mo) | $790/year ($65.83/mo) |
| For | Freelancers | Small studios | Agencies with several brands |
| Seats | 1 | 3 | 10 |
| Invoices sent a month | 50 | 250 | 750 |
| Reminder sequences | 1 | 5 | Unlimited |
| Sending domains | 1 | 1 | 3 |
| Replies read by AI | 100 a month | 500 a month | 1,500 a month |
| "Write in my voice" | 10 a month | 30 a month | 60 a month |
| Remove "Sent with Tally" | | Yes | Yes |
| Button | Start free trial | Start free trial | Start free trial |

- Every card lists: "Unlimited clients", "Card and bank payments to your Stripe", "Recurring invoices, deposits and part
  payments", "Multi-currency", "CSV exports for your accountant".
- Under the cards in Geist 500 24px: "Tally takes 0% of your payments. Stripe charges its normal fee on your account."
- Risk line: "No setup fee. No contract. Your data exports to CSV any time."
- Buttons go to \`/signup?plan=studio&interval=month\` (plan and interval carried into Checkout after signup).
- Wire prices to \`STRIPE_PRICE_SOLO_MONTHLY\`, \`STRIPE_PRICE_SOLO_YEARLY\`, \`STRIPE_PRICE_STUDIO_MONTHLY\`,
  \`STRIPE_PRICE_STUDIO_YEARLY\`, \`STRIPE_PRICE_AGENCY_MONTHLY\`, \`STRIPE_PRICE_AGENCY_YEARLY\`.
- Motion: cards rise with 80ms stagger; the middle card ends 8px higher on desktop.

## 12. FAQ

Accordion, one open at a time, all closed at first. Each answer 1 to 3 sentences.

1. **Where does the money go?** "Straight into your own Stripe account. Tally never holds your money and takes no
   cut. Stripe charges its normal fee on each payment."
2. **Do I need a Stripe account?** "No. If you do not have one, Tally helps you create one in a few minutes. If you
   prefer bank transfers only, put your bank details on the invoice and record payments by hand."
3. **Will reminders annoy my clients?** "They are short, polite and sent in working hours. They stop the moment the
   client pays or replies, and you can turn them off for any client."
4. **What happens when a client replies?** "Reminders pause at once and the reply is forwarded to your inbox. If they
   promise a date, Tally waits until the day after before carrying on."
5. **Does Tally read my emails?** "Only replies to the invoices and reminders Tally sent. It never sees your inbox."
6. **Why do I need to verify a domain?** "So invoices come from your own address, which clients recognise and open.
   You add two or three DNS records once. Until then, Tally sends from a shared address with your business name."
7. **Can clients pay part of an invoice?** "Yes, if you allow it. You set a minimum, they choose the amount, and
   reminders carry on for what is left."
8. **Which currencies can I invoice in?** "Any currency your Stripe account accepts for cards. Bank payments depend on
   the currency and your country: ACH for USD, SEPA for EUR, Bacs for GBP, where Stripe supports them."
9. **Can I charge late fees?** "Yes, optionally. You choose a fixed amount or a percentage, when it applies, and a cap.
   It is off until you turn it on."
10. **Does it work with my accountant?** "Yes. Export invoices and payments as CSV, including layouts ready for Xero
    and QuickBooks imports. Direct sync is on the roadmap."
11. **Can my team use it?** "Studio includes 3 seats and Agency 10. Everyone shares clients, invoices and reminders."
12. **Can I cancel?** "Yes, in two clicks from Billing. Invoices already sent stay visible to your clients."

- Add FAQPage JSON-LD with the same questions and answers.

## 13. Final CTA

- Background \`--hero-tint\`, centred.
- H2: "Stop chasing. Start getting paid."
- Subhead: "Send your next invoice with Tally and let the reminders take care of themselves."
- Primary button: "Start free trial". Line under: "7 days free. No setup fee."
- Visual: a row of three pills animating Sent, Reminded, Paid in sequence (600ms apart, once). Reduced motion: static.

## 14. Footer

- Four columns (stacked on mobile): Product (Features, Pricing, Compare, Changelog), Resources (Documentation, Invoice
  template, Late payment email templates, Days-to-pay calculator), Company (About, Contact), Legal (Privacy, Terms).
- Bottom row: "Tally" wordmark, "Invoices that chase themselves.", copyright year.
- Background \`--band\`, body ink, top hairline.

## 15. Responsive notes

- Under 640px: hero visual under the copy, reduced to the email card and the phone. Feature visuals under text.
  Comparison table scrolls sideways with a "Swipe to compare" hint. Pricing cards stack with Studio first.
- 640 to 1024px: two-column hero with a smaller visual, feature sections single column.
- Over 1024px: full layout above.
- Test at 320, 375, 430, 768, 1280 and 1440 wide. No horizontal page scroll at any width. Tap targets 44px.

## 16. SEO

- Title: "Tally: invoices that chase themselves"
- Meta description: "Send branded invoices from your own domain. Tally sends polite, escalating reminders until your
  client pays, pauses when they reply, and pays you by card or bank. 7 day free trial."
- Canonical \`https://usetally.app/\` (your domain). \`robots.ts\` allow all, \`sitemap.ts\` with \`/\`, \`/pricing\`,
  \`/templates/*\`, \`/compare/*\`.
- JSON-LD: SoftwareApplication (name, applicationCategory BusinessApplication, offers with the three monthly prices)
  and FAQPage.
- H1 used once. Every image has alt text describing the product state ("Reminder email for invoice INV-0042 sent from
  the freelancer's own domain").

## 17. OG image

- 1200 x 630, generated with \`next/og\` at \`app/opengraph-image.tsx\`.
- White with a hairline frame. Left: tally mark + "Invoices that chase themselves." in Geist 500 64px, ink. Right: a
  stack of three small email cards (Due in 3 days, Due today, 3 days overdue) and a green "Paid" pill on top.
- Twitter card: same image, \`summary_large_image\`.

## 18. Performance

- LCP under 2.0 s on 4G: hero visual as an optimised WebP via \`next/image\` with \`priority\`, sized for 2x.
- Video loads only on demand. Fonts subset to Latin with \`next/font\` (no layout shift).
- Total JS on the landing page under 120 KB gzipped. CLS under 0.05.

## 19. Analytics events (PostHog)

| Event | When | Properties |
|---|---|---|
| \`lp_viewed\` | page load | referrer, utm_source, utm_campaign |
| \`lp_cta_clicked\` | any Start free trial button | location (nav, hero, pricing_solo, pricing_studio, pricing_agency, final) |
| \`lp_demo_played\` | video starts | trigger (button, chip, autoplay) |
| \`lp_demo_completed\` | video reaches 90% | seconds |
| \`lp_pricing_toggle\` | toggle switched | interval |
| \`lp_compare_viewed\` | comparison table 50% in view | |
| \`lp_faq_opened\` | FAQ item opened | question index |
| \`signup_started\` | \`/signup\` loads with a plan param | plan, interval |

Capture UTM params on the first visit into a cookie and save them to \`profiles.utm\` on signup (add the \`utm jsonb\`
column with a migration through the Supabase MCP).
`
