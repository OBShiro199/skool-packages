// Etcher landing page PRD.

export const landingPrd = `# Etcher: landing page PRD

Save this file as \`LANDING.md\` in your project root. In Claude Code, say:
"Build the landing page exactly as described in @LANDING.md, using @DESIGN_SYSTEM.md and
@DESIGN.md for every token."

## 0. Page goal
- One job: get the founder or head of sales of a 2 to 20 person team to click
  **Start free trial**.
- Second job: book a **free HubSpot migration** call (for teams with data to move).
- The reader is comparing CRMs in tabs, on a laptop, during the working day. They scan for
  price, calling, and "can my team switch this week". Design desktop first, check mobile.
- Route: \`/\` in the \`(marketing)\` route group. \`/pricing\` and \`/vs/*\` reuse the nav, the
  comparison table and the footer.

## 1. Global rules
### 1.1 Tokens and type
Use Quiet Precision marketing rules: white page, a 1180px rail with hairlines left and right,
sections 80px vertical padding desktop and 56px mobile, square marketing boxes (0 radius on
section frames; app screenshots inside keep their own 6px radius). Accent is Etcher sage
(\`--accent: #3f9a6e\`, \`--accent-soft: #eef7f2\`, \`--accent-edge: #bfe0cd\`).

| Style | Desktop | Mobile | Weight |
|---|---|---|---|
| Display (hero H1) | 52 / 1.04, -0.045em | 36 / 1.08 | 500 |
| H2 | 35 / 1.12, -0.035em | 28 / 1.15 | 500 |
| H3 | 20 / 26, -0.025em | 18 / 24 | 500 |
| Body | 16 / 26 | 16 / 26 | 400 |
| Small | 13 / 18 | 13 / 18 | 400 |

Headings get \`text-wrap: balance\`, body copy max 65ch. Geist via \`next/font\`, weights 400,
500, 600 only.

### 1.2 Buttons
- Primary: white fill, 1px \`#9aa0a8\` edge, ink text, 46px tall (large), 6px radius, 500 weight.
  Hover: \`--hover\` fill, 1px lift. Press: 98% scale. No filled buttons anywhere.
- Secondary: white, \`--btn-edge\` edge, body ink.
- Every **Start free trial** goes to \`/signup\` and fires \`cta_click\` with \`location\`.

### 1.3 Motion
- Easing \`cubic-bezier(0.16, 1, 0.3, 1)\` for reveals, \`cubic-bezier(0.2, 0, 0, 1)\` for morphs.
- Scroll reveal: opacity 0 to 1 and translateY 8px to 0, 360ms, once, when 20% is in view
  (\`motion\` package, \`whileInView\`, \`viewport={{ once: true, amount: 0.2 }}\`).
- Stagger children 40ms, max 6 per group.
- Only opacity and transform. Nothing loops except the live dot (1.4s) and the hero call timer.
- Reduced motion: every reveal shows its end state instantly, the hero timer shows a static
  "04:12", the demo video shows its poster with a play button.

## 2. Sticky nav
- 56px tall, white at 92% opacity with \`backdrop-filter: blur(8px)\`, bottom hairline after 8px
  of scroll.
- Left: Etcher mark + wordmark. Centre (desktop): **Product**, **Calling**, **Pricing**,
  **Compare**, **FAQ** (anchors; Compare opens a small menu: vs Attio, vs HubSpot, vs
  Pipedrive, vs Close). Right: **Log in** text link, primary **Start free trial** (36px).
- Mobile: wordmark, **Start free trial** (32px compact), menu button opening a full-width
  sheet (portal, slides down 8px, 200ms) with the links.
- Motion: fade in 200ms on load. Never hides on scroll (the CTA stays reachable).

## 3. Hero
### Copy
- Eyebrow pill (4px radius, accent-soft fill, accent-edge, accent-ink): **CRM with a phone built in**
- H1: **The CRM your team calls from.**
- Subhead: **People, companies and pipelines in one quiet, fast workspace. Click any number to
  call from the browser. Every call, recording and outcome lands on the right record by itself.**
- Primary: **Start free trial**. Secondary: **Watch the 90 second demo** (scrolls to section 6).
- Microcopy: **7 days free · Unlimited seats · $149/month for the whole team**

### Product visual
- Right on desktop (55/45 split, copy left), below the copy on mobile.
- A real screenshot-quality HTML/CSS mock (not an image) of the Deals board: 4 columns
  (Qualified, Proposal, Negotiation, Won) with stage pills and values, 2 to 3 cards each.
- Floating over the bottom right: the softphone dock in the "In call" state: "Sarah Jones ·
  Northwind Hiring", timer counting up from 04:07 (tabular), Mute / Keypad / Hang up, a
  "Recording" pill.
- Floating over the top left of the board: a timeline item card "Call · 4:12 · Meeting booked"
  with a small play button.

### Motion
- Copy rises in (eyebrow, H1, subhead, buttons) 40ms apart, 360ms each.
- Board fades and rises 8px, 420ms, 120ms delay. Cards rise once, 25ms stagger.
- Dock rises 8px after the board (220ms). Timer ticks every second while in view (pause when
  out of view with IntersectionObserver).
- After 2.4s, one card in Proposal slides to Negotiation (300ms transform) and the column
  totals count to the new values (400ms). Runs once.

### Responsive
- Mobile: the board shows 2 columns, clipped by the rail with a fade on the right edge; dock
  sits under the board at full width.

## 4. Logo strip
- Small faint heading: **Built for teams that sell by phone**
- Until you have customers: 6 segment labels in faint ink, separated by hairlines:
  **Recruitment agencies · Marketing agencies · Dev studios · B2B SaaS · Wholesale · Consultancies**
- With customers: swap for their wordmarks in greyscale at 24px height (with permission).
- Motion: staggered fade. Mobile: horizontal scroll with \`scroll-snap\`, no marquee.

## 5. Problem
- H2: **You pay for a CRM. Then you pay again to call.**
- Intro: **Most small sales teams run a per-seat CRM and a per-seat dialer that never agree.
  The calls happen in one app, the notes in another, and the manager sees neither.**
- Three columns (stack on mobile), each a hairline box with a Lucide icon, bold line, one sentence:
  1. **Per-seat maths that never stops.** A 6 person team on a mid-tier CRM plus a dialer
     pays $500 to $900 a month before anyone sells anything.
  2. **Calls that never get logged.** Reps dial from their mobiles and forget the notes, so the
     pipeline is a guess.
  3. **Twenty tabs to do one thing.** Big CRMs bury "call, note, next step" under menus your
     team does not need.
- Stat box (accent-soft fill, accent-edge): **A 6 person team on Etcher pays $149 a month,
  calling included.** Link: **See the maths** (scrolls to pricing).
- Motion: columns stagger; the $149 counts up from $0 over 600ms (reduced motion: static).

## 6. Product demo
- H2: **Watch a lead go from CSV to closed in 90 seconds.**
- Subhead: **Import, call, log, move, win. No extra apps.**
- Video: 90 seconds, silent with burned-in captions, 1280x800, MP4 H.264 under 6 MB + WebM,
  \`muted playsinline\`, poster = the hero board. Plays when 50% in view, pauses when out.
  Chapters as 5 chips under the video that seek on click: **Import · Call · Wrap-up · Move ·
  Forecast**.
- Record it with Screen Studio on your own demo workspace (fake data).

## 7. Feature sections
Five rows, visual and copy alternating sides on desktop, visual first on mobile. Each: eyebrow,
H3, body, 3 ticks. Visuals are HTML/CSS mocks of real screens, rendered at 0.9 scale inside a
hairline frame.

### 7.1 Calling
- Eyebrow: **Calling**
- H3: **Click a number. You are on the phone.**
- Body: **Etcher rings from the browser with your team's own local number. Buy US or UK numbers
  in two clicks, or bring your own Twilio account or SIP carrier. Inbound calls ring the right
  rep, with the caller's name on screen.**
- Ticks: **Browser calling, no hardware** · **Local US and UK numbers** · **Inbound routed to the owner**
- Visual: a person record with the phone field hovered and the dock dialling.
  Motion: dock morphs from idle (40px) to dialling (128px), 300ms, once.

### 7.2 Recording and wrap-up
- Eyebrow: **Every call logged**
- H3: **The call writes its own note.**
- Body: **When the call ends, pick an outcome, add a line and a follow-up task in three clicks.
  Recordings are saved to the timeline with an optional consent announcement.**
- Ticks: **Outcomes and talk time** · **Recordings with consent message** · **Follow-up tasks**
- Visual: the wrap-up panel with "Meeting booked" selected. Motion: chip selects, then a
  timeline item appears below (rise 6px).

### 7.3 Pipelines
- Eyebrow: **Pipelines**
- H3: **A board for every way you sell.**
- Body: **Start from an agency, recruiting or B2B sales template. Rename stages, recolour them,
  set win probabilities and drag deals across. Close as won or lost with a reason.**
- Ticks: **Multiple pipelines** · **Weighted forecast** · **Won and lost reasons**
- Visual: stage editor with drag handles beside a forecast strip. Motion: one stage row moves
  up a slot (300ms).

### 7.4 Import and records
- Eyebrow: **Your data, clean**
- H3: **Bring 5,000 leads over before lunch.**
- Body: **Drop in a CSV, match the columns and Etcher skips duplicates by email and company
  domain. Custom fields fit how you work: notice period, retainer size, tech stack.**
- Ticks: **Column mapping** · **Dedupe by email and domain** · **Custom fields**
- Visual: the import progress card at "Importing 2,000 of 4,812". Motion: bar eases to 100%,
  counters change in place (tabular).

### 7.5 Reports
- Eyebrow: **Reports**
- H3: **Know who called, and what it made.**
- Body: **Pipeline by stage, win rate, cycle time, revenue by month and calls per rep. A Monday
  email sends the week's numbers to every manager.**
- Ticks: **Calls per rep** · **Win rate and cycle time** · **Weekly digest email**
- Visual: calls-per-rep table and a revenue bar chart. Motion: bars grow with scaleY from the
  baseline, 400ms, staggered (reduced motion: drawn).

## 8. How it works
- H2: **Live this afternoon.**
- Three numbered steps in a row (vertical on mobile), hairline connectors:
  1. **Import your leads.** CSV from HubSpot, Pipedrive, a spreadsheet or LinkedIn exports.
  2. **Buy a number.** Pick a local US or UK number and assign it to each rep.
  3. **Invite the team and call.** Unlimited seats. Everyone dials from the browser today.
- Button: **Start free trial**. Text link: **Or let us move your HubSpot data for free**.
- Motion: step numbers fade in 80ms apart; connector draws with scaleX (scroll-linked off;
  plays once).

## 9. Comparison table
- Anchor \`#compare\`. H2: **Flat price. Calling included.**
- Subhead: **Etcher does the core of a CRM and the dialer, for one price, however many people
  join.**
- Columns: **Etcher**, **Attio**, **HubSpot Sales Hub**, **Pipedrive**, **Close**.

| | Etcher | Attio | HubSpot Sales Hub | Pipedrive | Close |
|---|---|---|---|---|---|
| Price model | Flat, unlimited seats | Per seat | Per seat | Per seat | Per seat |
| Price for a 6 person team | $149/month | Plus about $174 to $216/month [verify] | Professional about $540 to $600/month [verify] | Growth about $234 to $294/month [verify] | Essentials about $210 to $294/month [verify] |
| Browser calling built in | Yes | No (via integrations) | Yes, paid tiers [verify] | Add-on [verify] | Yes |
| Call minutes included | 1,000/month | n/a | Limited [verify] | Add-on | Add-on [verify] |
| Call recording to the timeline | Yes | No | Yes, paid tiers | Add-on | Yes |
| Buy local US and UK numbers in-app | Yes | No | Limited [verify] | Add-on | Yes |
| Multiple pipelines + weighted forecast | Yes | Yes | Yes | Yes | Yes |
| CSV import with dedupe | Yes | Yes | Yes | Yes | Yes |
| Custom fields | Yes | Yes | Yes | Yes | Yes |
| Free migration from HubSpot | Yes | No | n/a | No [verify] | No [verify] |

- Prices researched Oct 2026 from third-party summaries: Attio Plus $29/seat annual or
  $36 monthly; HubSpot Sales Hub Professional about $90 to $100/seat; Pipedrive Growth about
  $39 to $49/seat; Close Essentials $35 to $49/seat. Before you publish, check every [verify]
  cell on the vendor's own pricing page and add the footnote: **Prices checked {Month Year}
  from each vendor's pricing page, for 6 users. Tell us if anything is out of date.**
- Never claim a competitor lacks something unless their own site shows it. When unsure,
  write "Limited" or drop the row.
- Mobile: horizontal scroll, sticky first column, Etcher column on accent-soft, "Swipe to
  compare" hint that fades after the first scroll.
- Motion: rows reveal with 25ms stagger; Etcher header gets the accent edge after reveal.

## 10. Testimonials slot
- H2: **Teams that switched**
- Three cards: 48px photo, quote, name, role, company, one bold result line ("Calls logged went
  from about 30% to 100%").
- Hidden behind \`SHOW_TESTIMONIALS=false\` until you have real ones. Never invent quotes. Ask
  each of your first 5 customers: "What changed in your first month on Etcher?"

## 11. Pricing
- Anchor \`#pricing\`. H2: **One price for the whole team.**
- Subhead: **Every plan starts with a 7-day free trial. Add as many teammates as you like.**
- Toggle: segmented **Monthly** / **Annual · save $839**. Default Monthly. The pill slides
  220ms; prices cross-fade 180ms; card heights fixed so nothing jumps.

### Plan cards (two cards, equal width, Annual has the firmer edge)
**Monthly**
- **$149/month**
- **For teams that want to start today.**
- Includes: **Unlimited seats · 1,000 call minutes a month · Up to 3 phone numbers · Call
  recording with consent message · Unlimited pipelines (up to 20) · CSV import and export ·
  Reports and weekly digest · Free HubSpot migration**
- Button: **Start free trial**

**Annual** (pill: **Best value**)
- **$949/year** (shown as **$79/month billed yearly**)
- **For teams that are staying.**
- Includes: **Everything in Monthly · Save $839 a year compared with paying monthly**
- Button: **Start free trial**

- Under the cards: **Need more minutes? Add 1,000 for $39 in a click. Using your own Twilio
  account or SIP carrier? Minutes are on your carrier's bill and not capped.**
- Second line (small, muted): **Call minutes cover calls on Etcher numbers to and from the US
  and UK. Other countries: bring your own Twilio account.**
- Price IDs from env: \`STRIPE_PRICE_MONTHLY\`, \`STRIPE_PRICE_ANNUAL\`. The toggle passes the
  interval to \`/signup?plan=annual\`, stored in a cookie and used by Checkout in onboarding.

## 12. FAQ
- Anchor \`#faq\`. H2: **Questions sales teams ask**
- Accordion, one open at a time, first open. Chevron rotates 180deg in 160ms; content height
  morphs 240ms (reduced motion: instant).

1. **Is it really unlimited seats?**
   Yes. $149 a month or $949 a year covers your whole team. Invite as many people as you need.
2. **How does calling work?**
   Etcher rings from the browser over the internet. You buy a local number inside Etcher (or
   connect your own Twilio account) and click any phone number to call. A headset is all you need.
3. **What counts towards the 1,000 minutes?**
   Every minute of a connected call on an Etcher number, inbound or outbound, rounded up per
   call. Unanswered calls do not use minutes. You can buy 1,000 more for $39.
4. **Which countries can I call and buy numbers in?**
   Numbers in the US and the UK. Calls to the US and UK are included. For other countries,
   connect your own Twilio account and calls go on your Twilio bill.
5. **Can I record calls?**
   Yes, an admin turns recording on. By default an announcement tells the other person the
   call may be recorded. Recordings are kept for 12 months and only the rep on the call and
   admins can play them.
6. **Do I need a UK business to get a UK number?**
   UK numbers need a short compliance check that the phone regulator requires. Fill in your
   business details in Etcher and approval usually takes a few working days.
7. **Can you move our data from HubSpot?**
   Yes, free. Book a call and we move your contacts, companies and deals, and set up your
   pipeline, before your trial ends.
8. **Can I import from a spreadsheet?**
   Yes. Upload a CSV, match the columns, and Etcher skips duplicates by email and company domain.
9. **Can I use my own phone system?**
   Yes. Connect your own Twilio account, or bring your SIP carrier through Twilio, and calls go
   on your carrier's bill with no minute cap.
10. **Is my data safe?**
    Each workspace's data is isolated at the database level, Twilio keys never reach the
    browser, and you can export everything or delete your workspace at any time.
11. **What happens after the trial?**
    Your card is charged $149 (or $949 for annual). Cancel any time in Billing before then and
    you will not be charged.
12. **What if we stop paying?**
    Your workspace becomes read-only. You can still log in and export everything for 30 days.

Add FAQPage JSON-LD with these 12 questions.

## 13. Final CTA
- Centred, 80px padding, top and bottom hairlines.
- H2: **Your next call should log itself.**
- Subhead: **Start a 7-day trial, import your leads and make your first call today.**
- Primary **Start free trial**, secondary **Book a free HubSpot migration** (calendar link).
- Microcopy: **7 days free · Unlimited seats · Cancel any time**
- Visual: the dock in "Wrap-up" state with "Meeting booked" selected, static.

## 14. Footer
- Four columns (accordion on mobile):
  - **Product:** Features, Calling, Pricing, Changelog
  - **Compare:** vs Attio, vs HubSpot, vs Pipedrive, vs Close
  - **For:** Recruitment agencies, Marketing agencies, B2B sales teams
  - **Company:** Contact, Privacy, Terms, Status
- Bottom row: wordmark, **© 2026 Etcher**, line **The CRM your team calls from.**

## 15. SEO
- Title (max 60 chars): **Etcher: CRM with built-in calling for small sales teams**
- Meta description (max 155): **People, companies, pipelines and browser calling in one CRM.
  Calls and recordings log themselves. $149/month for your whole team. 7 days free.**
- Canonical \`https://YOURDOMAIN/\`. One H1. H2 per section.
- JSON-LD: \`SoftwareApplication\` (applicationCategory "BusinessApplication", offers for both
  plans in USD) and \`FAQPage\`.
- \`/vs/attio\`, \`/vs/hubspot\`, \`/vs/pipedrive\`, \`/vs/close\`: same template, H1
  "Etcher vs {Name}", the comparison table with that column highlighted, 3 honest differences,
  migration CTA. Each gets its own title and description.
- \`sitemap.xml\` and \`robots.txt\` via Next.js metadata routes.

### OG image
- 1200x630 from \`app/opengraph-image.tsx\` (\`next/og\`). White background, 1px hairline frame
  inset 24px. Left: **The CRM your team calls from.** 64px Geist 500, ink. Under it:
  **Pipelines · Browser calling · Recordings · $149/month, unlimited seats** 26px muted.
- Right: simplified dock card "In call · 04:12" with the sage live dot.
- Bottom left: Etcher mark + wordmark. Same image for Twitter \`summary_large_image\`.

## 16. Analytics events
| Event | When | Properties |
|---|---|---|
| \`page_view\` | automatic | path, referrer, utm_source, utm_campaign |
| \`cta_click\` | any Start free trial | location: nav, hero, how_it_works, pricing_monthly, pricing_annual, final_cta |
| \`migration_click\` | Book a free HubSpot migration | location |
| \`demo_play\` | video starts | chapter |
| \`pricing_toggle\` | toggle | interval |
| \`compare_open\` | a /vs page or the compare menu | competitor |
| \`faq_open\` | an FAQ opens | index |
| \`signup_completed\` | server, after signup | plan_interest (cookie), ref |
Funnel to watch weekly: page_view → cta_click → signup_completed → trial_started → first call.

## 17. Responsive and performance
- Check at 320, 375, 430, 768, 1024, 1440px. No sideways scroll except the comparison table.
  Grid children get \`min-width: 0\`; the rail clips overflow.
- Tap targets 44px on mobile; buttons full width under 420px.
- Hero visual is HTML/CSS, so it paints with the page. Lazy-load the video.
- Lighthouse mobile: Performance 90+, Accessibility 100, SEO 100. JS on \`/\` under 150 KB gzip.
- Every section has \`scroll-margin-top: 72px\` so anchors are not hidden by the nav.

## 18. Build order
1. Nav, section shells with anchors, footer.
2. Hero with the board mock and dock, then the logo strip and problem.
3. Demo video section and the five feature rows.
4. How it works, comparison table (with the [verify] cells filled), testimonials flag.
5. Pricing with the toggle wired to Checkout, FAQ with JSON-LD, final CTA.
6. SEO, OG image, analytics, \`/vs/*\` pages.
7. Screenshots at 375 and 1440px; fix anything that overflows or shifts.
`
