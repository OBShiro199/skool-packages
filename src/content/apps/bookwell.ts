// Bookwell: booking pages for local service businesses.
import type { AppDef } from '../types'
import { backendTasks } from './bookwell/backendTasks'
import { buildPrd1 } from './bookwell/buildPrd1'
import { buildPrd2 } from './bookwell/buildPrd2'
import { buildPrd3 } from './bookwell/buildPrd3'
import { designPrd } from './bookwell/designPrd'
import { edgeFunctions } from './bookwell/edgeFunctions'
import { frontendTasks } from './bookwell/frontendTasks'
import { inbound, launchTasks, outbound, paid } from './bookwell/marketing'
import { repoTree, starterFiles } from './bookwell/repo'
import { securityTasks } from './bookwell/securityTasks'
import { sql } from './bookwell/sql'

/* ------------------------------------------------------------------ */
/* BOOKWELL                                                            */
/* ------------------------------------------------------------------ */

// Landing page PRD. A finished landing page is built from this text: do not edit it.
const bwLandingPrd = `# Bookwell: landing page PRD

Save this file as \`LANDING.md\` in your project root. In Claude Code, say:
"Build the landing page exactly as described in @LANDING.md, using the tokens in @DESIGN.md."

## 0. Page goal
- One job: get a barber, trainer or tutor to click **Start free trial**.
- Secondary job: let them tap through a live demo booking page on their phone.
- Audience reads on a phone, between clients, with one thumb. Design mobile first.
- Route: \`/\` (marketing route group). Every other marketing page reuses the nav and footer.

## 1. Global rules

### 1.1 Tokens
Use the tokens from \`@DESIGN.md\`. The landing page adds:

| Token | Value | Use |
|---|---|---|
| \`--hero-bg\` | #FBF3E6 | Hero and final CTA background |
| \`--ink-soft\` | #4A3F31 | Body copy on light backgrounds |
| \`--chip\` | #F3E4CC | Small pills and labels |
| \`--shadow-card\` | 0 12px 32px rgba(58, 38, 8, 0.10) | Phone mockup, pricing cards |

### 1.2 Type scale
| Style | Mobile | Desktop | Weight |
|---|---|---|---|
| Display (hero H1) | 40px / 1.05 | 64px / 1.02 | 700 |
| H2 | 30px / 1.15 | 44px / 1.1 | 700 |
| H3 | 20px / 1.3 | 24px / 1.3 | 600 |
| Body | 17px / 1.55 | 18px / 1.6 | 400 |
| Small | 14px / 1.5 | 14px / 1.5 | 500 |

Font: DM Sans from Google Fonts (400, 500, 600, 700), \`font-display: swap\`.

### 1.3 Layout
- Container: max width 1160px, side padding 16px mobile, 24px tablet, 32px desktop.
- Section padding: 72px top and bottom on mobile, 112px on desktop.
- Alternate section backgrounds: \`--bg\`, \`--surface\`, \`--bg\`. Hero and final CTA use \`--hero-bg\`.

### 1.4 Motion principles
- Easing for everything: \`cubic-bezier(0.22, 1, 0.36, 1)\` (a soft ease-out).
- Default scroll reveal: fade from 0 to 1 and move up 16px, 520ms, triggered when 20% of the element is in view, runs once.
- Stagger children by 70ms, max 6 children per stagger group.
- Use Framer Motion (\`motion\` package) with \`whileInView\` and \`viewport={{ once: true, amount: 0.2 }}\`.
- Reduced motion: if \`prefers-reduced-motion: reduce\`, every reveal becomes an instant opacity change (no movement), loops stop, the demo video shows its poster frame with a play button.
- Never animate layout properties (width, height, top). Only \`transform\` and \`opacity\`.

### 1.5 Buttons
- Primary: \`--brand\` background, \`--brand-ink\` text, 52px tall on mobile, 48px desktop, 14px radius, 600 weight.
- Secondary: transparent with 1.5px \`--line\` border, \`--ink\` text.
- Hover: lift 2px with \`--shadow-card\`, 160ms. Press: scale 0.98.
- Every primary button goes to \`/signup\` and fires \`cta_click\` with a \`location\` property (see section 16).

## 2. Sticky nav
- Height 64px. Background \`--bg\` at 85% opacity with \`backdrop-filter: blur(12px)\`. Bottom border \`--line\` appears only after scrolling 8px.
- Left: Bookwell wordmark (calendar icon in \`--brand\` plus "Bookwell" in 700).
- Centre (desktop only): links **How it works**, **Features**, **Pricing**, **FAQ**. Each scrolls smoothly to its section anchor.
- Right: text link **Log in** (to \`/login\`) and primary button **Start free trial**.
- Mobile: wordmark left, **Start free trial** small button right (40px tall), hamburger opens a full-width sheet with the four links and **Log in**.
- Motion: nav slides down 100% → 0 on first load, 400ms. Hides on scroll down after 400px, shows on scroll up (translateY, 240ms).

## 3. Hero

### Copy
- Eyebrow pill (\`--chip\`): **For barbers, trainers, tutors and every one-person shop**
- H1: **Stop losing money to no-shows.**
- Subhead: **Put one link in your Instagram bio. Customers pick a time, pay a small deposit and get a text the day before. Every booking lands in your Google Calendar.**
- Primary button: **Start free trial**
- Secondary button: **Try a demo booking** (opens \`/b/demo-fade-room\` in a new tab)
- Microcopy under buttons: **7 days free · Set up in 10 minutes · From $19/month**

### Product visual
- Right side on desktop, below the copy on mobile: a phone mockup (iPhone-style frame drawn in CSS, no image of a real device brand) showing the booking page for "Fade Room" with the Time step open and the 14:30 slot selected.
- Floating card 1 (top left of the phone): green tick, **Deposit paid · $10**.
- Floating card 2 (bottom right): SMS bubble, **Reminder: Skin fade at Fade Room tomorrow 14:30.**
- Floating card 3 (desktop only, top right): Google Calendar-style event block **Skin fade: Jordan · 14:30 to 15:15** (draw it, do not use Google's logo).

### Motion
- On load: copy staggers in (eyebrow, H1, subhead, buttons) at 70ms intervals, 520ms each.
- Phone rises 24px and fades in, 700ms, 150ms delay.
- Floating cards pop in one by one after the phone: scale 0.92 → 1 and fade, 360ms each, 120ms apart.
- Idle loop: floating cards bob 4px up and down over 5s, each offset by 1.2s. Stops with reduced motion.

### Responsive
- Mobile: copy first, then phone at 88% width, floating cards 1 and 2 only.
- Tablet: same as mobile with phone at 60% width, centred.
- Desktop: 55/45 split, copy left.

## 4. Trade strip (logo strip)
- Heading (small, \`--muted\`, centred): **Built for shops that run on appointments**
- Row of 8 trade badges with simple line icons: **Barbers · Personal trainers · Tutors · Nail techs · Massage · Dog groomers · Lash artists · Driving instructors**
- When you have real customers, swap these for their shop names in the same style (text wordmarks, greyscale). Ask permission first.
- Motion: on mobile the row auto-scrolls horizontally as a marquee at 30px per second, pauses on touch. Desktop shows all 8 in a wrapped row with a staggered fade. Reduced motion: no marquee, wrap the row.

## 5. Problem
- H2: **DMs are not a booking system.**
- Intro: **Most small shops still take bookings by Instagram DM, WhatsApp and memory. It works until it does not.**
- Three pain cards in a row (stack on mobile), each with an icon, a bold line and one sentence:
  1. **"See you Tuesday" and then nothing.** No deposit means no reason to turn up. One no-show a week is a whole day's takings gone each month.
  2. **Double booked again.** Your calendar, your DMs and your head never agree.
  3. **Reminding people by hand.** Ten texts every evening that you are not paid for.
- Stat line under the cards in a \`--chip\` box: **A $35 appointment missed four times a month is $1,680 a year.** Link: **Work out your number** (to \`/no-show-calculator\`).
- Motion: cards stagger in. The stat number counts up from $0 to $1,680 over 900ms when in view (reduced motion: show final number).

## 6. Product demo
- H2: **See a booking happen in 20 seconds.**
- Subhead: **This is what your customers see. No app, no account, works on any phone.**
- Video: 20 second silent screen recording of the booking flow on a phone (service, day, time, details, pay, confirmation), MP4 H.264 under 2MB plus WebM, \`autoplay muted loop playsinline\`, poster frame = the Time step.
- Captions burned into the video at each step: "Pick a service", "Pick a time", "Pay a $10 deposit", "Booked. Text reminder on its way."
- Next to it (desktop) or under it (mobile): button **Try the demo yourself** (opens \`/b/demo-fade-room\`).
- Motion: the video only plays when 50% in view (IntersectionObserver) and pauses when out of view. Reduced motion: poster with a play button, no autoplay.

## 7. Feature sections
Five alternating rows: visual on one side, copy on the other, swapping sides each row on desktop. On mobile, the visual sits above the copy. Each row has an eyebrow, H3, body and 3 bullet ticks.

### 7.1 Deposits
- Eyebrow: **Deposits**
- H3: **People turn up when they have paid.**
- Body: **Set a deposit per service, from $0 to the full price. Customers pay by card when they book. The money goes straight to your own Stripe account and your bank.**
- Bullets: **Deposit per service** · **Apple Pay and Google Pay** · **Paid out to your bank by Stripe**
- Visual: the service editor with the deposit slider at $10 of $35. Motion: slider thumb slides from $0 to $10 when in view, 800ms.

### 7.2 Text reminders
- Eyebrow: **Reminders**
- H3: **A text the day before. Sent for you.**
- Body: **Every customer gets a confirmation text and a reminder 24 hours before, with a link to change or cancel. Cancelled slots open up again on your page.**
- Bullets: **Confirmation and reminder texts** · **One-tap cancel link** · **Freed slots go back on sale**
- Visual: two SMS bubbles on a phone lock screen. Motion: bubbles slide in from the right 24px, 120ms apart.

### 7.3 Google Calendar sync
- Eyebrow: **Calendar**
- H3: **Your Google Calendar stays the boss.**
- Body: **Connect Google Calendar once. Anything already in it blocks those times on your booking page, and every new booking appears in it with the customer's name and number.**
- Bullets: **Busy times block slots** · **Bookings added automatically** · **Works on your phone's calendar app**
- Visual: a week view with grey busy blocks and amber Bookwell bookings. Motion: amber blocks drop in from 8px above, staggered.

### 7.4 Your booking link
- Eyebrow: **Your page**
- H3: **One link for your bio, your window and your WhatsApp.**
- Body: **You get bookwell.app/b/yourname plus a QR code to print for the shop window or the mirror.**
- Bullets: **Custom link** · **Printable QR code** · **Looks good on cheap phones**
- Visual: a QR code poster on a shop window. Motion: QR code draws in square by square over 600ms (reduced motion: shown at once).

### 7.5 No double bookings
- Eyebrow: **Peace of mind**
- H3: **Two people can never grab the same slot.**
- Body: **If two customers tap 14:30 at the same moment, only one gets it. The other is offered the next free time. No awkward phone calls.**
- Bullets: **Live availability** · **Buffer time between clients** · **Days off in two taps**
- Visual: two phones side by side, one showing "Booked", the other "That slot was taken a moment ago". Motion: the second phone gives a small 6px shake once.

## 8. How it works
- H2: **Live in 10 minutes.**
- Three numbered steps in a row (vertical timeline on mobile with a 2px \`--line\` connector):
  1. **Add your services.** Name, length, price and deposit. "Skin fade, 45 min, $35, $10 deposit."
  2. **Set your hours and connect your calendar.** Pick your working days, connect Google Calendar and Stripe.
  3. **Share your link.** Put it in your Instagram bio, print the QR code, send it on WhatsApp.
- Button under the steps: **Start free trial**
- Motion: the connector line draws from 0 to 100% as the section scrolls (scroll-linked, \`scaleX\` on desktop, \`scaleY\` on mobile). Step numbers pop in when the line reaches them. Reduced motion: line fully drawn.

## 9. Comparison table
- H2: **Made for one-person shops, priced like it.**
- Subhead: **Big booking apps are built for salons with ten chairs or for sales calls. Bookwell does the five things you need.**
- Table columns: **Bookwell**, **Calendly**, **Square Appointments**, **Fresha**, **Booksy**.
- Rows:

| | Bookwell | Calendly | Square Appointments | Fresha | Booksy |
|---|---|---|---|---|---|
| Built for local service shops | Yes | No, built for meetings | Yes | Yes | Yes |
| Card deposits to your own account | Yes | Paid plans, via Stripe | Yes | Yes | Yes |
| SMS reminders included | Yes | Paid plans | Yes | Paid per message | Yes |
| Google Calendar two-way | Yes | Yes | Limited | Limited | Limited |
| Customer needs an app or account | No | No | No | Often | Often |
| Price for one person | $19/month | [verify] | [verify] | [verify] | [verify] |

- Before you publish, fill every [verify] cell from each competitor's current pricing page and add the month you checked in a footnote: **Prices checked [Month Year]. Competitor features change, tell us if we are out of date.**
- Never claim a competitor lacks a feature unless their own site shows it. When unsure, write "Limited" or leave it out.
- Mobile: the table becomes a horizontal scroll with the first column sticky and Bookwell's column highlighted in \`--brand-soft\`. Show a small "Swipe to compare →" hint that fades after the first scroll.
- Motion: Bookwell column header gets a soft amber glow pulse once when in view (reduced motion: no pulse).

## 10. Testimonials slot
- H2: **Shops that stopped chasing no-shows**
- Three cards: photo (circle, 56px), quote, name, trade and town, and one result line in bold (e.g. **No-shows down from 6 to 1 a month**).
- Until you have real quotes, hide this section with a feature flag \`SHOW_TESTIMONIALS=false\`. Never publish invented quotes. Collect real ones from your first 5 users with the question: "What changed in your first month with Bookwell?"
- Motion: cards stagger in. On mobile they become a swipeable carousel with dots.

## 11. Pricing
- Section anchor: \`#pricing\`
- H2: **Simple pricing. Cancel any time.**
- Subhead: **Every plan starts with a 7-day free trial.**
- Toggle: **Monthly** / **Yearly · 2 months free**. Default Monthly. Toggle animates a pill sliding between the options (220ms). Prices cross-fade (180ms).

### Plan cards
**Solo**
- Price: **$19/month** or **$190/year**
- Line: **For one person with one calendar.**
- Includes: **Unlimited bookings · Up to 300 reminder texts a month (150 bookings) · Card deposits · Google Calendar sync · Booking link and QR code**
- Button: **Start free trial**

**Studio** (badge: **Most room to grow**)
- Price: **$39/month** or **$390/year**
- Line: **For busy shops that book every day.**
- Includes: **Everything in Solo · Up to 600 reminder texts a month (300 bookings) · Your brand colour and logo on the booking page · Remove "Booking by Bookwell" · No-show report**
- Button: **Start free trial**

- Under the cards: **Card fees on deposits are paid to Stripe from the deposit, at Stripe's standard rate. Bookwell never takes a cut of your deposits.**
- Text limits: when a shop passes its monthly texts, reminders switch to email for the rest of the month and the owner gets an in-app notice with an upgrade button.
- Motion: cards rise in with stagger. Studio card sits 8px higher on desktop with \`--shadow-card\`.
- The yearly toggle must create Checkout with the yearly Stripe price ID. Store all four price IDs in env: \`STRIPE_PRICE_SOLO_MONTHLY\`, \`STRIPE_PRICE_SOLO_YEARLY\`, \`STRIPE_PRICE_STUDIO_MONTHLY\`, \`STRIPE_PRICE_STUDIO_YEARLY\`.

## 12. FAQ
- Section anchor: \`#faq\`
- H2: **Questions shops ask us**
- shadcn Accordion, one open at a time, first one open by default. Chevron rotates 180 degrees in 200ms.

1. **Do my customers need to download an app or make an account?**
   No. They open your link, pick a time, enter their name and mobile, and pay the deposit. That is it.
2. **Where does the deposit money go?**
   Straight to your own Stripe account, then to your bank on Stripe's normal payout schedule. Bookwell never holds your money.
3. **What if a customer cancels?**
   They tap the link in their text. If they cancel more than 24 hours before, you choose whether the deposit is refunded. The slot opens up again on your page straight away.
4. **Does it work with my Google Calendar?**
   Yes. Anything already in your Google Calendar blocks those times, and every booking is added to it with the customer's name and number.
5. **I use Apple Calendar or Outlook. Will it work?**
   Not yet. Google Calendar is the only calendar we sync with today. You can still use Bookwell without a connected calendar.
6. **Do the text messages cost extra?**
   No. Solo includes up to 300 texts a month and Studio up to 600. That is two texts per booking: a confirmation and a reminder.
7. **Can I take the full payment up front?**
   Set the deposit to the full price of the service and customers pay it all when they book.
8. **How long does setup take?**
   About 10 minutes: add a service, set your hours, connect Google Calendar and Stripe, share your link.
9. **What happens after the 7-day trial?**
   You pick Solo or Studio at checkout. If you do not, your booking page pauses and shows your phone number instead. Your bookings and settings stay safe.
10. **Can I have more than one staff member?**
    Not yet. Bookwell is built for one person with one calendar. Team accounts are on the roadmap.
11. **Can I cancel any time?**
    Yes. Cancel from Settings → Billing in two clicks. You keep access until the end of the period you paid for.

- Motion: accordion content expands with height auto animation (Framer Motion \`layout\`), 240ms. Reduced motion: instant.
- Add FAQPage JSON-LD with these 11 questions (see section 15).

## 13. Final CTA
- Background \`--hero-bg\`, centred.
- H2: **Your next no-show is already booked. Stop it.**
- Subhead: **Set up Bookwell in 10 minutes and send your link today.**
- Primary button: **Start free trial**
- Microcopy: **7 days free · Cancel any time**
- Visual: small row of three floating chips: **Deposit paid**, **Reminder sent**, **Added to calendar**.
- Motion: chips float in from below with stagger, then bob gently (same as hero). Reduced motion: static.

## 14. Footer
- Four columns on desktop, accordion groups on mobile:
  - **Product**: Features, Pricing, Demo booking page, No-show calculator
  - **For**: Barbers, Personal trainers, Tutors, Nail techs
  - **Company**: About, Contact (mailto), Changelog
  - **Legal**: Privacy, Terms
- Bottom row: wordmark, **© 2026 Bookwell**, small line **Made for shops that run on appointments.**
- Trade landing pages (\`/for/barbers\`, \`/for/personal-trainers\`, \`/for/tutors\`, \`/for/nail-techs\`) reuse this page with a swapped H1 and hero image. Build them after launch.

## 15. SEO
- Title (max 60 characters): **Bookwell: booking link with deposits and SMS reminders**
- Meta description (max 155 characters): **One booking link for barbers, trainers and tutors. Customers pay a deposit, get a text reminder, and every booking lands in Google Calendar. $19/month.**
- Canonical: \`https://bookwell.app/\`
- H1 appears once (the hero). H2 per section.
- JSON-LD: \`SoftwareApplication\` (name, applicationCategory "BusinessApplication", offers with both plans in USD) and \`FAQPage\` from section 12.
- Images: every image has descriptive alt text, e.g. "Bookwell booking page on a phone with the 14:30 slot selected".
- \`sitemap.xml\` and \`robots.txt\` generated with Next.js metadata routes.

### OG image
- 1200 x 630 PNG generated with \`next/og\` at \`app/opengraph-image.tsx\`.
- Background \`--hero-bg\`. Left: H1 text **Stop losing money to no-shows.** in 64px DM Sans 700, \`--ink\`. Under it: **Booking link · Deposits · SMS reminders · $19/month** in 28px \`--ink-soft\`.
- Right: simplified phone with the amber 14:30 slot and the "Deposit paid · $10" card.
- Bottom left: Bookwell wordmark.
- Same image used for Twitter \`summary_large_image\`.

## 16. Analytics events
Use DataFast (or PostHog, same event names). Fire with a small \`track(name, props)\` helper.

| Event | When | Properties |
|---|---|---|
| \`page_view\` | Automatic | path, referrer, utm_source, utm_campaign |
| \`cta_click\` | Any Start free trial button | location: nav, hero, how_it_works, pricing_solo, pricing_studio, final_cta |
| \`demo_open\` | Try a demo booking clicked | location |
| \`video_play\` | Demo video starts playing in view | autoplay: true or false |
| \`pricing_toggle\` | Monthly/Yearly toggled | interval |
| \`faq_open\` | An FAQ item opened | question_index |
| \`compare_scroll\` | Comparison table scrolled on mobile | none |
| \`calculator_click\` | Work out your number clicked | none |
| \`signup_complete\` | Fired on the server after signup | plan_interest (from the last pricing card clicked, stored in a cookie) |

- Funnel to watch weekly: page_view → cta_click → signup_complete → trial started (Stripe) → first booking received.
- Keep a \`ref\` query parameter in a cookie for 30 days and save it on signup (used by the "Booking by Bookwell" footer referral).

## 17. Responsive checklist
- Test at 360, 390, 768, 1024, 1440 px wide.
- No horizontal scroll on any width (except the comparison table's own scroll area).
- Tap targets at least 44px. Buttons full width on mobile under 420px.
- Hero H1 must fit in 3 lines at 360px.
- The sticky nav must never cover a section heading when jumping to an anchor: add \`scroll-margin-top: 80px\` to every section.

## 18. Performance and accessibility
- Lighthouse mobile: Performance 90+, Accessibility 100, SEO 100.
- Hero visual is HTML and CSS, not an image, so it paints instantly. Load the demo video lazily.
- Fonts: preload DM Sans 700 and 400 only.
- Total JavaScript on \`/\` under 120kb gzipped.
- Colour contrast 4.5:1 for text. Focus rings visible (2px \`--brand\` outline with 2px offset).
- Every animation respects \`prefers-reduced-motion\`.

## 19. Build order for Claude Code
1. Section shells with anchors and the sticky nav.
2. Hero with the CSS phone mockup and floating cards.
3. Problem, features and how it works with scroll reveals.
4. Comparison table and pricing with the toggle and Checkout wiring.
5. FAQ with JSON-LD, final CTA, footer.
6. SEO metadata, OG image, analytics helper and events.
7. Screenshot at 390px and 1440px, fix anything that overflows.
`

export const bookwell: AppDef = {
  slug: 'bookwell',
  name: 'Bookwell',
  tagline: 'Bookings, deposits, no no-shows',
  oneLiner: 'Booking pages for barbers, trainers and tutors with Google Calendar sync, deposits and SMS reminders.',
  category: 'productivity',
  art: { motif: 'calendar', tone: 'amber' },
  price: { monthly: 19, trialDays: 7 },
  difficulty: 2,
  buildHours: 20,
  apis: [
    {
      name: 'Google Calendar API',
      job: 'reads the owner\'s busy times so slots never clash, and writes, moves and deletes each booking in their calendar',
      signupUrl: 'https://console.cloud.google.com',
      docsUrl: 'https://developers.google.com/workspace/calendar/api/guides/overview',
      pricing: 'Free (checked Oct 2026). Google does not charge for Calendar API calls; only per-minute quotas apply (APIs & Services → Google Calendar API → Quotas). The calendar.events and calendar.freebusy scopes are sensitive, so Google verifies the app before more than 100 test users can connect (no fee)',
      envVars: [
        { name: 'GOOGLE_CLIENT_ID', where: 'Google Cloud Console → Google Auth Platform → Clients → Create client (Web application)', pasteInto: 'Supabase secrets', secret: false },
        { name: 'GOOGLE_CLIENT_SECRET', where: 'Same OAuth client → Client secret (GOCSPX-...)', pasteInto: 'Supabase secrets', secret: true },
        { name: 'GOOGLE_REDIRECT_URI', where: 'https://YOUR-PROJECT-REF.supabase.co/functions/v1/bw-google-oauth, registered as an authorised redirect URI on the client', pasteInto: 'Supabase secrets', secret: false },
        { name: 'OAUTH_STATE_SECRET', where: 'Make one up: run openssl rand -hex 32', pasteInto: 'Supabase secrets', secret: true },
      ],
    },
    {
      name: 'Twilio (SMS)',
      job: 'sends the booking confirmation, the reminder and cancellation texts from one A2P 10DLC registered Messaging Service, and receives C and STOP replies',
      signupUrl: 'https://www.twilio.com/try-twilio',
      docsUrl: 'https://www.twilio.com/docs/messaging',
      pricing: 'Checked Oct 2026: free trial credit (texts only go to numbers you verify). Then pay as you go: $0.0083 per outbound US SMS segment plus carrier fees of about $0.003 to $0.005 per segment, a local number at about $1.15/month, and A2P 10DLC registration (about $4.50 one-off for the brand, $15 one-off campaign vetting, then $1.50 to $10 per campaign per month) [verify in the Twilio console]. UK and EU rates are higher, check twilio.com/en-us/sms/pricing for your country',
      envVars: [
        { name: 'TWILIO_ACCOUNT_SID', where: 'console.twilio.com → Account Info → Account SID (AC...)', pasteInto: 'Supabase secrets', secret: false },
        { name: 'TWILIO_AUTH_TOKEN', where: 'console.twilio.com → Account Info → Auth Token', pasteInto: 'Supabase secrets', secret: true },
        { name: 'TWILIO_MESSAGING_SERVICE_SID', where: 'console.twilio.com → Messaging → Services → Bookwell → Properties (MG...)', pasteInto: 'Supabase secrets', secret: false },
        { name: 'TWILIO_FROM_NUMBER', where: 'console.twilio.com → Phone Numbers → Active numbers (E.164, e.g. +15551234567)', pasteInto: 'Supabase secrets', secret: false },
        { name: 'TWILIO_WEBHOOK_URL', where: 'https://YOUR-PROJECT-REF.supabase.co/functions/v1/bw-twilio-inbound (the Messaging Service webhook URL without the query string)', pasteInto: 'Supabase secrets', secret: false },
      ],
    },
    {
      name: 'Stripe Connect',
      job: 'lets each shop connect its own Stripe account so customer deposits go straight to the shop as direct charges',
      signupUrl: 'https://dashboard.stripe.com/connect',
      docsUrl: 'https://docs.stripe.com/connect',
      pricing: 'Checked Oct 2026: with Standard-style accounts (full Stripe Dashboard, the shop pays Stripe fees) and direct charges, the shop pays Stripe\'s normal card fee on each deposit and Bookwell pays no Connect fees. (If you switch to accounts where you handle pricing, Stripe charges the platform $2 per monthly active account plus 0.25% + $0.25 per payout)',
      envVars: [
        { name: 'STRIPE_SECRET_KEY', where: 'Stripe Dashboard → Developers → API keys → Secret key (sk_test_ then sk_live_)', pasteInto: 'Supabase secrets', secret: true },
        { name: 'STRIPE_CONNECT_WEBHOOK_SECRET', where: 'Stripe Dashboard → Webhooks → the destination listening to Connected accounts → Signing secret (whsec_...)', pasteInto: 'Supabase secrets', secret: true },
      ],
    },
  ],
  idealFor: 'People who want a first SaaS with a clear local market: barbers, personal trainers, tutors and other one-person service businesses.',
  whyItSells: 'A barber charging $35 who loses 4 slots a month to no-shows is down $140. Bookwell costs $19 and the $10 deposit plus a reminder text cuts no-shows by more than half.',
  features: [
    'Public booking page at bookwell.app/b/yourname with a printable QR code',
    'Services with duration, price, deposit and buffer time',
    'Google Calendar two-way: busy times block slots, bookings appear in your calendar',
    'Deposits paid by card straight to the owner\'s bank via Stripe Connect',
    'SMS confirmation and reminder with a manage link, and "Reply C to cancel"',
    'Double booking is impossible, enforced by the database',
    'Mark completed or no-show, and a no-show report on Studio',
  ],
  status: 'full',
  costs: {
    usage: { label: 'Bookings per shop per month', unit: 'bookings', default: 60, min: 10, max: 300, step: 10 },
    plans: [
      { id: 'solo-monthly', name: 'Solo', price: 19, interval: 'month', includes: 'Unlimited bookings, up to 300 texts a month (150 bookings with confirmation + reminder), deposits, Google Calendar sync' },
      { id: 'solo-yearly', name: 'Solo (yearly)', price: 190, interval: 'year', includes: 'Same as Solo, 2 months free' },
      { id: 'studio-monthly', name: 'Studio', price: 39, interval: 'month', includes: 'Everything in Solo, up to 600 texts a month (300 bookings), brand colour and logo, no Bookwell footer, no-show report' },
      { id: 'studio-yearly', name: 'Studio (yearly)', price: 390, interval: 'year', includes: 'Same as Studio, 2 months free' },
    ],
    lines: [
      { name: 'SMS (confirmation + reminder)', vendor: 'Twilio', kind: 'perUnit', amount: 0.025, note: 'Two US SMS segments per booking at $0.0083 each plus about $0.004 carrier fee each = about $0.025 per booking. Every text is kept to one 160-character segment by the sms.ts helper. Checked Oct 2026. UK and EU texts cost 3 to 5 times more: re-check twilio.com/en-us/sms/pricing for your country before you set prices there.', url: 'https://www.twilio.com/en-us/sms/pricing/us' },
      { name: 'Phone number + A2P 10DLC campaign', vendor: 'Twilio', kind: 'fixed', amount: 2.65, steps: [{ fromCustomers: 0, amount: 0 }, { fromCustomers: 1, amount: 2.65 }, { fromCustomers: 300, amount: 15 }], note: 'One local number (about $1.15/month) plus one low-volume mixed 10DLC campaign (about $1.50/month). Past roughly 300 shops (about 4,000 texts a day at peak), move to a Standard campaign (about $10/month) and add 3 numbers to the Messaging Service pool: budget about $15/month. One-off registration of about $20 (brand $4.50 + campaign vetting $15) is not included [verify]. Checked Oct 2026.', url: 'https://www.twilio.com/docs/trust-hub/registrations/a2p-10dlc-campaign' },
      { name: 'Supabase', vendor: 'Supabase', kind: 'fixed', amount: 25, steps: [{ fromCustomers: 0, amount: 0 }, { fromCustomers: 1, amount: 25 }, { fromCustomers: 400, amount: 30 }, { fromCustomers: 1500, amount: 75 }], freeTier: 'Free plan for building (projects pause after a week of no use, so upgrade before your first paying customer).', note: 'Pro is $25/month and includes $10 of compute credit (covers Micro). Small compute ($15) from about 400 shops, Medium ($60) from about 1,500. Edge function calls (mostly bw-public-slots) stay inside the 2 million included on Pro at 1,000 shops. Checked Oct 2026.', url: 'https://supabase.com/pricing' },
      { name: 'Vercel Pro', vendor: 'Vercel', kind: 'fixed', amount: 20, steps: [{ fromCustomers: 0, amount: 0 }, { fromCustomers: 1, amount: 20 }], freeTier: 'Hobby is free but for non-commercial use only, so move to Pro when you charge.', note: '$20 per member per month. One member is enough. Checked Oct 2026.', url: 'https://vercel.com/pricing' },
      { name: 'Transactional email', vendor: 'Resend', kind: 'fixed', amount: 0, steps: [{ fromCustomers: 0, amount: 0 }, { fromCustomers: 150, amount: 20 }], freeTier: '3,000 emails a month, 100 a day.', note: 'Owner emails (new booking, text cap, Google errors) plus customer receipts when they give an email. About 15 emails per shop per month, so the free 3,000 runs out near 150 shops (the 100 a day cap can bite earlier). Pro is $20/month for 50,000 emails. Checked Oct 2026.', url: 'https://resend.com/pricing' },
      { name: 'Google Calendar API', vendor: 'Google', kind: 'fixed', amount: 0, freeTier: 'Free. Only per-minute quotas apply.', note: 'No charge for Calendar API calls or for OAuth verification. busy_cache keeps calls to about one per business per viewed day per minute. Checked Oct 2026.', url: 'https://developers.google.com/workspace/calendar/api/guides/quota' },
      { name: 'Stripe Connect (deposits)', vendor: 'Stripe', kind: 'perCustomer', amount: 0, note: 'Standard-style accounts with direct charges: the shop pays Stripe\'s card fee on each deposit and Bookwell pays no Connect fee. If you ever switch to accounts where the platform pays fees, add $2 per active account per month plus 0.25% + $0.25 per payout.', url: 'https://stripe.com/connect/pricing' },
      { name: 'Domain', vendor: 'Porkbun', kind: 'fixed', amount: 1, note: 'A .com is about $11 a year, shown as $1 a month.', url: 'https://porkbun.com' },
    ],
    notes: [
      'Each booking sends two texts: a confirmation and a reminder before the appointment. Bookings made inside the reminder window send only the confirmation.',
      'Solo at its 300-text cap costs about $3.75 in SMS plus about $1 in Stripe fees ($0.30 + 2.9% + 0.7% of $19), so gross margin stays at 75% or higher. Above the cap, reminders switch to email.',
      'Studio at its 600-text cap costs about $7.50 in SMS plus about $1.70 in Stripe fees ($0.30 + 3.6% of $39): about 76% margin.',
      'A typical shop does about 60 bookings a month, which is $1.50 of SMS against $19 of revenue (about 87% margin after Stripe fees).',
      'Yearly plans are 10 times the monthly price ($190 and $390): one Stripe charge a year saves eleven $0.30 fees, so yearly margin is slightly higher.',
      'The cap is enforced server side in try_consume_usage, so one shop (or a bot booking free slots) cannot run up your Twilio bill.',
      'Prices are US rates. Twilio prices outside the US are higher: set a higher price or a lower text cap before you sell in the UK or EU.',
      'Stripe subscription fees are added by the calculator, not listed here.',
    ],
  },
  content: {
    buildPrd: buildPrd1 + buildPrd2 + buildPrd3,
    designPrd,
    landingPrd: bwLandingPrd,
    sql,
    edgeFunctions,
    frontendTasks,
    backendTasks,
    securityTasks,
    marketing: { outbound, inbound, paid },
    launchTasks,
    repoTree,
    starterFiles,
  },
}
