// Rota landing page PRD (LANDING.md).

export const landingPrd = `# Rota: landing page PRD

Save this file as \`LANDING.md\` in your project root. In Claude Code, say:
"Build the landing page exactly as described in @LANDING.md, using @DESIGN_SYSTEM.md and the Rota accent in @DESIGN.md."

## 0. Page goal

- One job: get a cafe, gym, salon or clinic manager to click **Start free trial**.
- Secondary job: let them watch a 60 second demo of a week being drafted, published and texted to phones.
- Audience: owner-managers with 5 to 50 hourly staff. Busy, practical, sceptical of software that "takes a week to
  set up". Many read on a phone between shifts, so design mobile-first and check it at 375px before 1440px.
- Route: \`/\` (marketing route group). \`/pricing\` reuses the pricing section full width. \`/vs/deputy\`,
  \`/vs/7shifts\`, \`/vs/homebase\` reuse the comparison section with one competitor highlighted (SEO pages).

## 1. Global rules

### 1.1 Base and tokens
The landing page uses \`@DESIGN_SYSTEM.md\` (Quiet Precision) and the Rota accent from \`@DESIGN.md\`, with the
system's marketing rules: **square corners** on boxes and frames (pills keep 4px), a 1180px rail with a hairline
left and right, sections at 56px (mobile) and 80px (desktop) vertical padding. Buttons stay white with a firm 1px
ink edge; there are no filled or black buttons, even here.

| Token | Value | Use |
|---|---|---|
| \`--hero-tint\` | #f6fbfa | Hero and final CTA band (the accent at about 3%) |
| \`--band\` | #fafafb | Alternate section background (system row hover) |
| \`--chip\` | #eef7f6 | Eyebrow pills (accent soft) with \`--accent-edge\` |
| \`--frame\` | 1px solid #e6e6e9 + system shadow-float | Product shots, phone frames, pricing boxes |

No dark full-width blocks. Contrast comes from large Geist display type, ink, real product screenshots and the teal
accent used sparingly.

### 1.2 Type scale
| Style | Mobile | Desktop | Weight | Tracking |
|---|---|---|---|---|
| Display (hero H1) | 40px / 1.04 | 64px / 1.02 | 500 | -0.045em |
| H2 | 32px / 1.1 | 48px / 1.06 | 500 | -0.04em |
| H3 | 20px / 26px | 24px / 32px | 500 | -0.025em |
| Body large | 16px / 26px | 18px / 28px | 400 | -0.011em |
| Body | 14px / 22px | 16px / 26px | 400 | -0.011em |
| Eyebrow | 13px / 18px | 13px / 18px | 500 | -0.014em, sentence case |

Headings use \`text-wrap: balance\`; body copy stays under 65 characters wide. Every time, price and count uses
tabular figures.

### 1.3 Layout
- 12 column grid inside the 1180px rail, 24px gutters desktop, 16px mobile side padding.
- Grid children get \`min-width: 0\`; the page clips sideways overflow (\`overflow-x: clip\` on the body wrapper).
- Product visuals are real screenshots exported at 2x (WebP + AVIF), never mock illustrations.

### 1.4 Motion principles
- Opacity and transform only, system curves: \`cubic-bezier(0.16, 1, 0.3, 1)\` for reveals.
- Scroll reveals: elements rise 12px and fade in over 480ms when 20% visible, staggered 60ms, once per session.
- \`prefers-reduced-motion: reduce\`: everything renders in its final state, the hero animation shows its last
  frame, the video does not autoplay.

## 2. Sticky nav

- 64px, white with a bottom hairline that appears after 8px of scroll (opacity transition 160ms).
- Left: Rota wordmark (Geist 600, 18px) with a small teal square glyph. Centre (desktop): Features, How it works,
  Pricing, Compare, Help. Right: "Log in" (text button) and "Start free trial" (firm edge button, 36px).
- Mobile: wordmark, "Start free trial" (compact 32px) and a menu button that opens a full-width sheet from the top
  (200ms fade + 8px drop) with the same links at 44px each.
- Event: \`lp_nav_click\` with \`{ item }\`.

## 3. Hero

- Band: \`--hero-tint\`, 80px top padding desktop.
- Eyebrow pill: "For cafes, gyms, salons and clinics"
- H1: **"Next week's rota, done before your coffee goes cold."**
- Subhead: "Rota drafts your week from everyone's availability, warns you about clashes and overtime, then texts
  each person their own shifts. Swaps, cover and clock-in happen on their phones. You just approve."
- Buttons: "Start free trial" (primary, 46px large) and "Watch the 60 second demo" (secondary, opens the video in a
  dialog). Under them, faint: "7 days free. From $39 a location a month. Staff use it free."
- Visual (right on desktop, below on mobile): the rota builder screenshot in a frame, with a phone frame
  overlapping its bottom right corner showing the SMS "Cafe Luna rota w/c 20 Oct: Mon 06:00-14:00, Wed
  09:00-17:00 ..." and the staff app's next shift card.
- Hero animation (desktop only, plays once, 2.4 s total): ghost shift chips fade into the grid column by column
  (25ms stagger), the Publish button tag changes from Draft to Published, then the SMS bubble rises 8px into the
  phone. Reduced motion: final frame only.
- Events: \`lp_cta_clicked\` \`{ location: "hero" }\`, \`lp_demo_opened\` \`{ location: "hero" }\`.

## 4. Logo strip

- One line, faint text: "Built for teams like" followed by six category marks drawn as simple monochrome
  wordmarks in ghost ink: "Independent cafes", "Boutique gyms", "Hair salons", "Physio clinics", "Bars and
  kitchens", "Yoga studios".
- Replace with real customer logos (with permission) once you have five paying customers. Never fake logos.
- Mobile: two rows of three, no marquee.

## 5. Problem

- Eyebrow: "Sunday night, every week"
- H2: "The rota is the job nobody gets paid for."
- Three columns (stack on mobile), each with a small Lucide icon, a bold line and a sentence:
  1. **"Three hours in a spreadsheet."** "Copy last week, remember who can't do Thursdays, recount the hours,
     screenshot it into the group chat."
  2. **"Swaps you hear about too late."** "Two people trade a Saturday in WhatsApp and you find out when the
     opener doesn't show."
  3. **"No idea what the week costs."** "You see the wage bill when payroll runs, not while you're building the
     rota."
- Under the columns, one number in H3: "A 20 person cafe loses about 13 manager hours a month to the rota."
  with a faint footnote "* Based on 3 hours a week, our customer interviews."
- Motion: columns reveal with the standard stagger.

## 6. Product demo

- Band: \`--band\`.
- H2: "Watch a week go from blank to published in 60 seconds."
- A 16:9 video frame (square corners, frame token) with a poster image of the builder and a play button (white
  64px circle with a 1px ink edge and a teal play glyph). Click plays inline with captions on.
- Under it, three timestamp chips that jump the video: "0:05 Draft with Claude", "0:24 Fix a clash", "0:41
  Publish and texts".
- Video: \`public/demo.mp4\` (H.264, 1920x1080, under 8 MB) plus \`demo.webm\`, \`preload="none"\`, burnt-in
  captions and a VTT track.
- Events: \`lp_demo_played\`, \`lp_demo_chapter\` \`{ chapter }\`, \`lp_demo_completed\` at 90%.

## 7. Feature sections

Six alternating rows: text on one side (5 columns), visual on the other (7 columns). On mobile, text first then
the visual. Each visual is a cropped real screenshot in a frame. Each row reveals as a unit.

### 7.1 A draft in under a minute
- Eyebrow: "Draft with Claude"
- H3: "Start from a sensible week, not a blank grid."
- Body: "Rota reads everyone's availability, holidays, roles and the last four weeks, then drafts the whole week.
  You see every change and every warning before anything is saved. Nothing goes out until you press Publish."
- Bullets: "Keeps the patterns that work", "Leaves a shift open rather than breaking a rule", "Stays inside your
  labour budget"
- Visual: the builder with ghost chips and the draft panel ("24 shifts, 2 left open, $3,412").

### 7.2 Clashes caught as you drag
- Eyebrow: "Conflict warnings"
- H3: "Double bookings can't be published. Everything else gets flagged."
- Body: "Drag a shift and Rota checks it on the spot: holidays, availability, 11 hours' rest, weekly hours and
  whether they're trained for the role. Staff who work at two of your sites can't be booked in both at once."
- Visual: a cell with the coral edge and the conflict popover open.

### 7.3 Know the wage bill before you publish
- Eyebrow: "Cost per day"
- H3: "Hours and cost for every day, against your budget."
- Body: "Each person's rate, or the role's default, adds up live along the bottom of the rota. Go over budget and
  the day turns amber before it turns into a payroll surprise."
- Visual: the cost footer with one amber day.

### 7.4 Their shifts, by text
- Eyebrow: "SMS and email"
- H3: "Everyone gets their own shifts. Not a screenshot."
- Body: "Publish sends each person one text and one email with only their shifts. Change something and only the
  people affected hear about it. A reminder lands two hours before every shift, or the evening before an early
  start."
- Visual: three phone lock screens with the published, changed and reminder texts.

### 7.5 Swaps and cover without the group chat
- Eyebrow: "Staff app"
- H3: "They sort it out. You tap approve."
- Body: "Staff ask a colleague to swap, ask anyone eligible for cover, or claim an open shift from their phone.
  Rota checks the swap against the rules before it reaches you."
- Visual: the staff app swap sheet and the manager Requests inbox side by side.

### 7.6 Clock-in at the door, CSV for payroll
- Eyebrow: "Timesheets"
- H3: "Clock in from their phone. Export a clean timesheet."
- Body: "Staff clock in when they arrive. Turn on the location check and Rota flags anyone clocking in from the
  bus. Approve the week and download a CSV your payroll tool can import."
- Visual: the clock screen on a phone and the timesheets table with one flagged row.
- Footnote under the section: "* Location check on Team and Pro."

### 7.7 Made for your kind of team
- A row of four small boxes (2 x 2 on mobile), frame token, 20px padding, each with a Lucide icon (Coffee,
  Dumbbell, Scissors, Stethoscope), a title and one line:
  - **Cafes and kitchens:** "Openers, closers and the Saturday rush, with rest rules built in."
  - **Gyms and studios:** "Front desk, coaches and cleaners on one rota across your sites."
  - **Salons:** "Stylists' days and assistants' hours, with time off approved in one tap."
  - **Clinics:** "Reception and assistants covered, and a clean timesheet for payroll."
- Each box links to \`/for/<industry>\` (later SEO pages; until then, anchor to pricing).
- Event: \`lp_industry_click\` \`{ industry }\`.

## 8. How it works

- H2: "Set up in an afternoon. Publish this week."
- Three steps in a row (stack on mobile), each with a big tabular number (48px, ghost ink), a title and a line:
  1. **"Add your team."** "Paste names and numbers. Everyone gets a text with a join link."
  2. **"Draft the week."** "Copy last week, use a template, or let Claude draft it. Fix the warnings."
  3. **"Publish."** "Everyone gets their shifts by text and email. Swaps and reminders run themselves."
- Button under the steps: "Start free trial".
- Motion: the three numbers count up from 0 once (300ms each), reduced motion shows the number.

## 9. Comparison table

- Band: \`--band\`. Eyebrow "Compare". H2: "Priced per location, not per person."
- Subhead: "A 20 person team, one site, monthly prices checked Oct 2026. Check each vendor's site for current
  prices."
- Table (first column sticky on mobile, the table scrolls sideways inside its frame; Rota column outlined with the
  accent edge):

| | **Rota Team** | Deputy | 7shifts | Homebase | When I Work | RotaCloud |
|---|---|---|---|---|---|---|
| How you pay | Per location | Per user | Per location | Per location | Per user | Per employee |
| 20 staff, 1 site, per month | **$69** | $100 to $180 ($5 to $9 a user) [verify] | $44.99 to $89.99 (30 to 60 staff tiers) [verify] | $30 to $70 [verify] | $50 to $160 ($2.50 to $8 a user) [verify] | about £20 to £46 plus add-ons [verify] |
| AI draft of the week | Yes, every plan | Auto-scheduling on higher plans [verify] | Auto-scheduling on higher plans [verify] | Not listed [verify] | Not listed [verify] | Not listed [verify] |
| Shift texts included | 180 a month per site | Add-on or app [verify] | App and SMS [verify] | App [verify] | App and SMS [verify] | SMS add-on £0.40 per employee [verify] |
| Swaps and cover with approval | Yes | Yes | Yes | Yes | Yes | Yes |
| Clock-in from phone with location check | Yes | Yes | Yes | Yes | Yes | Add-on [verify] |
| CSV timesheet export | Yes | Yes | Yes | Yes | Yes | Yes |
| Free for staff | Yes | Yes | Yes | Yes | Yes | Yes |
| Setup | An afternoon | Days [verify] | Days [verify] | Hours [verify] | Hours [verify] | Hours [verify] |

- Under the table, faint: "Prices from each vendor's public pricing page or listings, October 2026. Plans change
  often; we update this table monthly." Remove every [verify] once you have checked each one yourself; if a claim
  cannot be checked, delete the cell content and write "See their site".
- Event: \`lp_compare_viewed\` when 50% visible.

## 10. Testimonials slot

- H2: "From the people who used to do it on Sunday night."
- Three quote cards (frame token, 24px padding): quote (16px), name, role, business, city, and a small photo.
- Until you have real quotes, ship this section **hidden** behind a flag (\`NEXT_PUBLIC_SHOW_TESTIMONIALS\`). Never
  invent a quote. Collect them from design partners after their fourth published week.

## 11. Pricing

- Eyebrow "Pricing". H2: "One price per location. Your staff are free."
- Toggle: a segmented control "Monthly / Annual (2 months free)". Switching swaps the numbers with a 160ms
  cross-fade; card heights and widths never change (reserve the "billed $690 a year" line on monthly too, as
  "billed monthly").
- Three cards in a row (stack on mobile, Team first on mobile). Team has the accent edge and a pill "Most popular".

| | Starter | Team | Pro |
|---|---|---|---|
| Monthly | $39 per location / month | $69 per location / month | $149 per location / month |
| Annual | $390 per location / year | $690 per location / year | $1,490 per location / year |
| Line | "For one small team" | "For busy sites and small groups" | "For big teams and multi-site groups" |
| Staff per location | Up to 15 | Up to 40 | Up to 100 |
| Texts per location a month | 100 (400 in the US and Canada) | 180 (720 in the US and Canada) | 400 (1,600 in the US and Canada) |
| Claude drafts a month | 6 | 10 | 12 |
| Clock-in with location check | Clock-in only | Yes | Yes |
| Texts from your business name | No | No | Yes* |
| Everything else | Rota builder, templates, conflicts, cost per day, swaps, cover, open shifts, time off, email and app notifications, CSV export | Same | Same |
| Button | "Start free trial" | "Start free trial" | "Start free trial" |

- Under the cards: "7 day free trial on every plan. Cancel in two clicks from Billing. * Where the country allows
  sender names (UK, Ireland and most of Europe)."
- Each button links to \`/signup?plan=<plan>&interval=<month|year>\`; the choice carries through to Checkout.
- Events: \`lp_pricing_toggle\` \`{ interval }\`, \`lp_cta_clicked\` \`{ location: "pricing", plan, interval }\`.

## 12. FAQ

Accordion, one open at a time, 160ms height morph, the + rotates to x. Each answer under 70 words.

1. **Do my staff have to pay or download an app?**
   No. Staff are free and use Rota in their phone's browser. They can add it to their home screen like an app.
   No app store, no password reset emails for a forgotten app login: they can always sign in with a link.
2. **How do texts work?**
   When you publish, each person gets one text with their shifts and one email. They get a reminder 2 hours
   before each shift, or at 9pm the evening before an early start. Staff choose whether they want texts.
3. **What happens if we run out of texts?**
   Rota warns you at 80%. After the limit, reminders and updates go by email and in the app until the month
   resets. Nothing breaks, nobody misses a shift change in the app.
4. **Is the AI going to publish a rota without me?**
   Never. Claude drafts, you review every shift and warning, and nothing goes to staff until you press Publish.
   It never puts someone on approved holiday or in two places at once.
5. **Can I run more than one site?**
   Yes. You pay per location. Managers only see the sites they run, and staff who work at two sites can't be
   booked in both at the same time.
6. **How does the location check on clock-in work?**
   You set where the venue is and a radius. When someone clocks in, their phone shares its location once. You
   choose whether being too far away is flagged for you to review or blocks the clock-in.
7. **Can I export to my payroll?**
   Yes. Approve the period and download a CSV with hours, rates and pay per shift. Every payroll tool we know of
   imports CSV. Direct payroll connections are on the roadmap.
8. **How long does setup take?**
   Most teams publish their first week the same afternoon: add locations and roles, paste in your team, copy
   your current week in, publish.
9. **Does it work in the US?**
   Yes. Texts come from a verified US number and staff can reply STOP. US plans get four times the texts because
   US texts cost less to send.
10. **What about overtime and rest rules?**
    You set the weekly hours line and minimum rest for your business (UK defaults are 48 hours and 11 hours'
    rest). Rota warns you when a rota crosses them.
11. **Can I cancel any time?**
    Yes, from Billing in two clicks. You keep access until the end of the period you've paid for, and you can
    export your timesheets first.

- FAQPage JSON-LD with these exact questions and answers.
- Event: \`lp_faq_opened\` \`{ question }\`.

## 13. Final CTA

- Band: \`--hero-tint\`. H2: "Get your Sundays back."
- Line: "Draft, publish and text next week's rota in ten minutes. Free for 7 days."
- Button: "Start free trial" (large). Faint line: "From $39 a location a month."
- Motion: H2 and button rise once.

## 14. Footer

- Four columns (two on mobile): Product (Features, Pricing, Compare, Changelog), Compare (Rota vs Deputy, Rota vs
  7shifts, Rota vs Homebase, Rota vs When I Work), Help (Documentation, Contact, Status), Company (About, Privacy,
  Terms).
- Bottom row: "© 2026 Rota" and a line "Made for people who run shifts." Hairline above.

## 15. Responsive notes

- Check at 320, 375, 390, 430, 768, 1024, 1440px. No horizontal scroll anywhere; only the comparison table scrolls
  sideways inside its own frame with the first column sticky.
- Hero: stacked on mobile, H1 at 40px, the phone frame sits below the builder screenshot, overlapping by 24px.
- Feature rows: text then visual on mobile; visuals full width with 16px side padding.
- Pricing: cards stack with Team first; the toggle stays sticky under the nav while the pricing section is in view
  on mobile.
- Touch targets 44px; the FAQ rows 56px.

## 16. SEO

- Title: "Rota: staff rota software with AI drafts and shift texts"
- Meta description: "Build next week's staff rota in minutes. Claude drafts it from availability, Rota catches
  clashes and texts every person their shifts. Swaps, clock-in, CSV for payroll. From $39 a location."
- H1 is the hero line; one H1 per page. Canonical \`https://<domain>/\`.
- JSON-LD: \`SoftwareApplication\` (name Rota, applicationCategory BusinessApplication, operatingSystem Web, offers
  for the three plans with prices in USD) and \`FAQPage\`.
- Comparison pages \`/vs/<competitor>\` each with their own title ("Rota vs Deputy: per-location pricing, AI
  drafts and shift texts"), unique intro paragraph and the highlighted comparison column.
- Sitemap and robots.txt from Next.js metadata routes.

## 17. OG image

- 1200 x 630, white background, 1px hairline frame inset 24px. Left: wordmark and the line "Next week's rota,
  done before your coffee goes cold." in Geist 500 56px. Right: a cropped builder grid with teal ghost chips and a
  phone showing the published SMS.
- Built with \`next/og\` at \`app/opengraph-image.tsx\` so it always matches the copy. Twitter card
  \`summary_large_image\`.

## 18. Performance

- LCP under 2.0 s on mobile 4G: the hero screenshot is the LCP element, served as AVIF with \`priority\`, exact width
  and height, and a low-quality placeholder.
- CLS under 0.05: every image and video has dimensions; fonts use \`next/font\` with \`display: swap\` and size-adjust.
- The demo video loads only on click. No third-party scripts except analytics.

## 19. Analytics events (PostHog or DataFast)

| Event | When | Properties |
|---|---|---|
| \`lp_view\` | Page load | referrer, utm_* |
| \`lp_nav_click\` | Nav link | item |
| \`lp_cta_clicked\` | Any Start free trial | location (hero, how, pricing, final, nav), plan, interval |
| \`lp_demo_opened\` / \`lp_demo_played\` / \`lp_demo_chapter\` / \`lp_demo_completed\` | Video | chapter |
| \`lp_pricing_toggle\` | Toggle | interval |
| \`lp_compare_viewed\` | Table 50% visible | page |
| \`lp_faq_opened\` | Accordion | question |
| \`lp_scroll_depth\` | 25, 50, 75, 100% | depth |

Funnel to watch: \`lp_view\` to \`lp_cta_clicked\` to \`signup_completed\` to \`rota_published\` (activation).
`
