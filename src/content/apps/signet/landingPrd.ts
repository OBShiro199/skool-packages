// Signet landing page PRD (LANDING.md).

export const landingPrd = `# Signet: landing page PRD

Save this file as \`LANDING.md\` in your project root. In Claude Code, say:
"Build the landing page exactly as described in @LANDING.md, using the tokens in @DESIGN.md."

## 0. Page goal

- One job: get an agency owner, freelancer or consultant to click **Start free trial**.
- Secondary job: let them watch a 60 second demo of a real call turning into a signed proposal.
- Audience: busy, sceptical, has tried PandaDoc or Proposify, writes proposals at night. Reads on a laptop
  between calls, sometimes on a phone. Design for both, desktop-led.
- Route: \`/\` (marketing route group). \`/pricing\` reuses the pricing section full width.

## 1. Global rules

### 1.1 Tokens
Use the tokens from \`@DESIGN.md\` (light only on the landing page). The landing page adds:

| Token | Value | Use |
|---|---|---|
| \`--hero-bg\` | #FBF1E3 | Hero and final CTA background |
| \`--band\` | #F6EFE4 | Alternate section background |
| \`--chip\` | #FDECD3 | Eyebrow labels, small pills |
| \`--shadow-card\` | 0 18px 40px rgba(61, 29, 2, 0.12) | Product shots, pricing cards |

No solid black or dark full-width blocks. Contrast comes from Fraunces headings and amber accents.

### 1.2 Type scale
| Style | Mobile | Desktop | Weight | Font |
|---|---|---|---|---|
| Display (hero H1) | 40px / 1.05 | 66px / 1.02 | 600 | Fraunces |
| H2 | 30px / 1.15 | 46px / 1.1 | 600 | Fraunces |
| H3 | 20px / 1.3 | 24px / 1.3 | 600 | Inter |
| Body | 17px / 1.6 | 18px / 1.65 | 400 | Inter |
| Eyebrow | 13px / 1.4, uppercase, 0.08em tracking | same | 600 | Inter |

### 1.3 Layout
- Container max width 1180px, side padding 16px mobile, 24px tablet, 32px desktop.
- Section padding: 72px top and bottom mobile, 120px desktop.
- Section backgrounds alternate: \`--bg\`, \`--band\`, \`--bg\`. Hero and final CTA use \`--hero-bg\`.

### 1.4 Motion principles
- Easing \`cubic-bezier(0.22, 1, 0.36, 1)\`.
- Default scroll reveal: opacity 0 to 1 and translateY 18px to 0, 560ms, when 20% of the element is in
  view, once. Use IntersectionObserver (no heavy animation library needed; Framer Motion is fine if
  already installed).
- Stagger children 80ms, max 6 per group.
- \`prefers-reduced-motion: reduce\`: no translate, no parallax, no auto-playing loops; fades 150ms only.
  The demo video shows its poster with a play button instead of autoplaying.

## 2. Sticky nav

- 64px high, \`--bg\` at 85% opacity with \`backdrop-filter: blur(10px)\`, 1px \`--line\` bottom border once the
  page scrolls past 8px.
- Left: logo mark (amber envelope with a small waveform inside) + wordmark "Signet".
- Centre (desktop): How it works, Features, Pricing, Compare, FAQ (anchor links, smooth scroll, offset 72px).
- Right: "Log in" (ghost), "Start free trial" (primary).
- Mobile: logo + "Start free trial" (small) + menu button opening a Sheet with the anchor links.
- Motion: on load, nav fades in 300ms. No reveal on scroll.

## 3. Hero

- Eyebrow chip: "For agencies, freelancers and consultants"
- H1: "Your sales call, turned into a signed proposal by this afternoon."
- Subhead: "Upload the recording. Signet pulls out the client's goals, pains and budget, writes a branded
  proposal priced from your own rate card, and tells you the moment they open, sign and pay the deposit."
- Primary button: "Start free trial"  (goes to \`/signup\`)
- Secondary button: "Watch the 60 second demo" (scrolls to section 6 and plays the video)
- Trust line under buttons: "7 days free. Cancel in two clicks. Your first proposal takes about 10 minutes."
- **Visual (right on desktop, under the copy on mobile):** a layered product shot:
  1. Back layer: the editor with a proposal for "Northwind Coffee", exec summary visible.
  2. Front left card: a call card with a waveform and the JobProgress at "Drafting".
  3. Front right card: a toast "Jane Cole signed. Deposit $3,600 paid." with a green tick.
  All three in rounded 18px frames with \`--shadow-card\`.
- Motion: copy reveals with stagger (eyebrow, H1, subhead, buttons, trust line). The product layers slide in
  from 24px below at 0ms, 140ms and 280ms. The JobProgress dots fill once on load (1.6s). The toast pops at
  1.8s with a 1.03 scale settle. Reduced motion: everything visible, no fills or pops.

## 4. Logo strip

- Line above: "Built for the people who sell their time"
- Six role badges instead of fake customer logos (until you have real ones): Web design studios, SEO
  agencies, Paid ads agencies, Video production, Fractional CMOs, Freelance developers. Muted ink, 60%
  opacity, full opacity on hover.
- Replace with real customer logos once you have 6 with permission.
- Motion: fade in as one group, 400ms.

## 5. Problem

- Eyebrow: "The gap that loses deals"
- H2: "The call went great. The proposal went out five days later."
- Three columns (stacked on mobile), each with a small amber line icon:
  1. **"I will write it tonight."** "Three hours rebuilding last month's proposal, with the old client's name
     still in the footer."
  2. **"Did they even open it?"** "A PDF in an inbox tells you nothing. You find out it was a no when they
     stop replying."
  3. **"Now send the invoice."** "Signed by email, invoiced separately, deposit chased by hand. Every step
     is a chance to stall."
- Closing line, centred, in Fraunces 24px: "The first credible proposal in the inbox usually wins."
- Motion: columns stagger 80ms.

## 6. Product demo

- Eyebrow: "See it work"
- H2: "45 minute call in. Proposal out in four."
- A 16:9 video frame (rounded 18px, \`--shadow-card\`) with a poster image and a large amber play button.
  Video: 60 seconds, screen recording (Screen Studio), captions burned in: upload a call, the brief appears,
  draft appears, rewrite the summary "shorter", send, open on a phone, sign, pay deposit, owner gets the
  "Signed" email.
- Under the video, three timestamp chips that seek the video: "0:05 Upload", "0:22 The brief", "0:41 Sign
  and pay".
- Host the MP4 on Vercel Blob or Supabase public storage, \`preload="none"\`, \`playsinline\`, muted autoplay
  only when in view and reduced motion is off.

## 7. Feature sections

Alternate image left and right on desktop. Each section: eyebrow, H3-sized H2 (use H2 tag, 36px), body,
3 bullets, a visual.

### 7.1 Reads the call so you do not have to
- Eyebrow: "Call to brief"
- Heading: "Every goal, pain and budget hint, with the client's own words."
- Body: "Signet transcribes the call, tells the speakers apart and pulls out what matters. Fix anything
  it got wrong before a single word of the proposal is written."
- Bullets: "Upload MP3, M4A, MP4 or record in the browser" / "Import Zoom and Google Meet recordings" /
  "Open questions flagged so you can ask before you send"
- Visual: the brief card with a budget signal "We spent about $20k with our last agency" highlighted.

### 7.2 Drafts in your voice, from your prices
- Eyebrow: "Brief to proposal"
- Heading: "A full proposal with three options, priced from your rate card."
- Body: "Exec summary, problem, solution, scope, timeline, good/better/best pricing, terms and next steps.
  It only prices with the services and rules you set, so there are no made-up numbers."
- Bullets: "Your logo, colours and fonts" / "Rush fees and minimums applied for you" / "Start from a
  template that already wins"
- Visual: three pricing cards, the middle one marked "Recommended".

### 7.3 Edit like a doc, rewrite any section
- Eyebrow: "Make it yours"
- Heading: "Change a paragraph in one click."
- Body: "A clean block editor. Hit Rewrite on any section and say what you want: shorter, more confident,
  mention the Shopify migration. See the change before you keep it."
- Bullets: "Drag sections into any order" / "Inline diff before anything changes" / "Autosaves as you type"
- Visual: a section mid-rewrite with struck-through and added text.

### 7.4 Know when they read it
- Eyebrow: "Tracking"
- Heading: "See exactly when they opened it, and what they read twice."
- Body: "Get an email the first time they open it. See time spent on each section, and which pricing option
  they lingered on, before you pick up the phone."
- Bullets: "Opened, signed and paid alerts" / "Time per section" / "Polite follow-up after 3 days, on
  autopilot"
- Visual: the activity heatmap with "Pricing: 4 min 12 s" in amber.

### 7.5 Signed and paid on one page
- Eyebrow: "Close"
- Heading: "Signature and deposit, in under two minutes on a phone."
- Body: "Clients type and draw their signature, then pay the deposit by card. The money goes straight to
  your own Stripe account. Every signature is stored with a time, an IP address and a fingerprint of exactly
  what was signed."
- Bullets: "Deposit paid to your Stripe, not ours" / "Tamper-evident fingerprint on every signature" /
  "Signed copy emailed to both sides"
- Visual: phone mockup with the sign block and the "Pay $3,600 deposit" button.

### 7.6 Built for a team
- Eyebrow: "Workspaces"
- Heading: "One brand, one price list, the whole team."
- Body: "Invite your team, share templates and keep everyone on the same rates. See win rate, average deal
  size and time to sign for the business or for each person."
- Bullets: "Owner, admin and member roles" / "Shared templates and catalogue" / "Win rate and time to sign"
- Visual: the analytics stat tiles.

Motion for all feature sections: text column reveals first, visual 120ms later with a 0.98 to 1 scale.
Parallax on visuals of 12px max over the section height (desktop only, off for reduced motion).

## 8. How it works

- Eyebrow: "Three steps"
- H2: "From call to deposit"
- Three numbered cards connected by a dotted amber line (horizontal desktop, vertical mobile):
  1. **"Upload the call"** "Drop in the recording, record in the browser, or import from Zoom or Meet."
  2. **"Check and send"** "Fix the brief, tweak the draft, send a link. About 10 minutes."
  3. **"Get signed and paid"** "They read, sign and pay the deposit. You get an email at each step."
- Motion: the dotted line draws from 0 to 100% length (SVG stroke-dashoffset) over 900ms as the section
  enters view, cards reveal as the line reaches them. Reduced motion: line fully drawn.

## 9. Comparison table

- Eyebrow: "Compare"
- H2: "The only one that writes the first draft from your call"
- Table (horizontal scroll on mobile with the first column sticky). Prices are entry plans, per user per
  month, checked Oct 2026 from comparison sites; confirm on each vendor's pricing page before launch.

| | Signet | PandaDoc | Proposify | Qwilr | Better Proposals |
|---|---|---|---|---|---|
| Starting price | $49/month (1 seat) | $19/user/mo annual [verify] | $19/user/mo annual, $29 monthly [verify] | $35/user/mo annual [verify] | $13 to $19/user/mo [verify] |
| Drafts the proposal from a call recording | Yes | No | No | No | No |
| Pulls goals, pains and budget out of the call | Yes | No | No | No | No |
| Prices from your rate card, three options | Yes | Pricing tables | Pricing tables | Pricing tables | Pricing tables |
| AI rewrite per section | Yes | AI assistant [verify] | AI assistant [verify] | AI assistant [verify] | [verify] |
| View tracking with time per section | Yes | Yes | Yes | Yes | Yes |
| E-signature | Yes | Yes | Yes | Yes | Yes |
| Deposit to your own Stripe account | Yes | Yes (payments add-on) [verify] | Yes [verify] | Yes [verify] | Yes [verify] |
| Automatic follow-up after 3 days | Yes | Reminders [verify] | Reminders [verify] | [verify] | Reminders [verify] |

- Under the table: "Signet is cheaper for small teams because you pay per workspace, not per seat.
  Studio covers 3 people for $99."
- Motion: rows fade in with 40ms stagger. The Signet column has a \`--brand-soft\` tint and a "You are
  here" style top chip "Signet".

## 10. Testimonials slot

- Eyebrow: "Early users"
- H2: "What people are saying"
- Three quote cards. Until you have real quotes, render the slot with placeholder cards showing a soft
  dashed border and the text "Your first customer quote goes here", visible only in development. In
  production the section is hidden until \`TESTIMONIALS\` (a constant in \`lib/testimonials.ts\`) has 3 items.
- Card: quote (Fraunces 20px), name, role, company, small avatar. One number per quote where possible
  ("Sent the proposal 40 minutes after the call. Signed the next morning.").

## 11. Pricing

- Eyebrow: "Pricing"
- H2: "Pay per workspace, not per seat"
- Subhead: "Every plan starts with a 7 day free trial. Cancel any time from Billing."
- **Toggle:** Monthly / Annual, pill switch, Annual shows a chip "2 months free". Default Monthly. The toggle
  animates the price digits (crossfade 200ms) and swaps the Checkout price id.
- Three cards, middle highlighted with a 2px \`--brand\` border and "Most popular" chip:

| | Solo | Studio | Agency |
|---|---|---|---|
| Monthly | $49 | $99 | $199 |
| Annual | $490/year ($40.83/mo) | $990/year ($82.50/mo) | $1,990/year ($165.83/mo) |
| For | Freelancers and consultants | Small agencies | Growing agencies |
| Seats | 1 | 3 | 10 |
| Proposals from calls | 10 a month | 25 a month | 50 a month |
| Call minutes | 600 a month | 1,500 a month | 3,000 a month |
| AI rewrites | 100 a month | 250 a month | 500 a month |
| Zoom and Meet import | | Yes | Yes |
| Remove "Sent with Signet" | | Yes | Yes |
| Per-person analytics | | Yes | Yes |
| Button | Start free trial | Start free trial | Start free trial |

- Each card lists: "Unlimited blank and template proposals", "E-signature and deposits", "View tracking
  and follow-ups", "Brand kit" (Solo: "Logo and 1 colour").
- Under the cards: an ROI line in Fraunces 22px: "Win one extra $5,000 project a quarter and Studio pays for
  itself 15 times over."
- Risk reversal line: "No setup fee. No contract. Deposits go straight to your Stripe."
- Buttons go to \`/signup?plan=studio&interval=month\` (plan and interval carried into Checkout after signup).
- Wire prices to \`STRIPE_PRICE_SOLO_MONTHLY\`, \`STRIPE_PRICE_SOLO_YEARLY\`, \`STRIPE_PRICE_STUDIO_MONTHLY\`,
  \`STRIPE_PRICE_STUDIO_YEARLY\`, \`STRIPE_PRICE_AGENCY_MONTHLY\`, \`STRIPE_PRICE_AGENCY_YEARLY\`.
- Motion: cards rise with 80ms stagger; the middle card ends 8px higher on desktop.

## 12. FAQ

Accordion, one open at a time, first closed. Each answer 1 to 3 sentences.

1. **Do I need to record my calls?** "Yes, Signet works from a recording. Use Zoom or Google Meet cloud
   recording, a phone voice memo, or the recorder built into Signet. Always tell the other people on the
   call that you are recording."
2. **Which meeting tools work?** "Any. If you can get an audio or video file, you can upload it. Zoom and
   Google Meet recordings can also be imported directly on Studio and Agency."
3. **Will it make up prices?** "No. It only prices with the services and rules in your catalogue, and the
   totals are calculated by Signet, not the AI."
4. **How accurate is the transcript?** "Very good on clear audio, and it separates speakers. You review the
   brief before anything is drafted, so you can fix any detail it misheard."
5. **Where does the deposit money go?** "Straight into your own Stripe account. Signet never holds your
   money and takes no cut. Stripe charges its normal card fee."
6. **Is the e-signature legally binding?** "Typed and drawn e-signatures with a timestamp, IP address and a
   fingerprint of the signed content are widely accepted for service agreements. If your industry needs a
   specific signature standard, check before you rely on it."
7. **What does tamper-evident mean?** "When a client signs, we store a SHA-256 fingerprint of exactly what
   they saw. Both sides get it by email. Change one word and the fingerprint no longer matches."
8. **Can my team use it?** "Yes. Studio includes 3 seats and Agency 10. Everyone shares your brand,
   templates and price list."
9. **What happens when I hit a limit?** "You get a warning at 80%. At 100% you can still edit and send
   proposals; drafting from new calls and rewrites pause until next month or until you upgrade."
10. **Is my client's data safe?** "Recordings and proposals are private to your workspace. Share links use
    long random tokens, and public pages only ever show the version you sent."
11. **Can I cancel?** "Yes, in two clicks from Billing. You keep access until the end of the period you
    paid for."

- Add FAQPage JSON-LD with the same questions and answers.

## 13. Final CTA

- Background \`--hero-bg\`, centred.
- H2: "Send the next proposal before the client cools off."
- Subhead: "Upload your last discovery call and see the draft in about 10 minutes."
- Primary button: "Start free trial". Line under: "7 days free. No setup fee."
- Visual: a small row of three StatusPills animating Sent, Viewed, Signed in sequence (each 600ms apart,
  once). Reduced motion: show all three statically.

## 14. Footer

- Four columns (stack on mobile): Product (Features, Pricing, Compare, Changelog), Resources
  (Documentation, Proposal templates, Discovery call checklist), Company (About, Contact), Legal (Privacy,
  Terms).
- Bottom row: "Signet" wordmark, "Made for people who sell their time.", copyright year.
- Background \`--band\`, text \`--ink-soft\`.

## 15. Responsive notes

- < 640px: hero visual under the copy, reduce product layers to the editor + signed toast. Feature visuals
  under text. Comparison table scrolls horizontally with a "Swipe to compare" hint. Pricing cards stack with
  Studio first.
- 640 to 1024px: two-column hero with a smaller visual, feature sections single column.
- > 1024px: full layout above.
- Test at 360, 390, 768, 1280 and 1440 wide. No horizontal page scroll at any width.

## 16. SEO

- Title: "Signet: proposals from your sales call, signed and paid"
- Meta description: "Upload a discovery call. Signet writes a branded proposal priced from your rate
  card, tracks every view, and collects the signature and deposit. 7 day free trial."
- Canonical \`https://signet.app/\`. \`robots.ts\` allow all, \`sitemap.ts\` with \`/\`, \`/pricing\`, \`/compare/*\`.
- JSON-LD: SoftwareApplication (name, applicationCategory BusinessApplication, offers with the three
  monthly prices) and FAQPage.
- H1 used once. Every image has alt text describing the product state ("Proposal editor showing an exec
  summary for Northwind Coffee").

## 17. OG image

- 1200 x 630, generated with \`next/og\` at \`app/opengraph-image.tsx\`.
- Background \`--hero-bg\`, left: logo + "Proposals from a sales call." in Fraunces 64px, \`--ink\`.
  Right: a tilted proposal card with three pricing chips and a green "Signed" pill.
- Also a Twitter card (same image, \`summary_large_image\`).

## 18. Performance

- LCP under 2.0 s on 4G: hero product shot as an optimised WebP via \`next/image\` with \`priority\`, sized
  for 2x. Video loads only on demand.
- Fonts subset to Latin. No layout shift from fonts (\`size-adjust\` via next/font).
- Total JS on the landing page under 120 KB gzipped.

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

Capture UTM params on first visit into a cookie and save them to \`profiles\` on signup (add \`utm jsonb\`
with a migration through the Supabase MCP).
`
