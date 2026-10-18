// Sparring landing page PRD (LANDING.md).

export const landingPrd = `# Sparring: landing page PRD

Save this file as \`LANDING.md\` in your project root. In Claude Code, say:
"Build the landing page exactly as described in @LANDING.md, using @DESIGN_SYSTEM.md and the Sparring accent in
@DESIGN.md."

## 0. Page goal

- One job: get an SDR manager, a sales bootcamp owner or a founder to click **Start free trial**.
- Secondary job: let them hear a real practice call and see the scorecard it produced, in under a minute.
- Audience: sales leaders who have tried manager roleplay and watched it fade, and founders about to make their
  first 50 dials. Sceptical of "AI coaching" claims. Reads on a laptop at their desk, sometimes on a phone between
  calls. Desktop-led, fully mobile.
- Route: \`/\` (marketing route group). \`/pricing\` reuses the pricing section full width.

## 1. Global rules

### 1.1 Base and tokens

The landing page uses \`@DESIGN_SYSTEM.md\` (Quiet Precision) and the corner blue accent from \`@DESIGN.md\`, with the
system's marketing rules: **square corners** (0 radius on boxes and frames; pills keep 4px), a 1180px rail with a
hairline left and right, and more expressive type than the app. Buttons stay white with a firm ink edge; there are no
filled or black buttons, even here. The landing page adds:

| Token | Value | Use |
|---|---|---|
| \`--hero-tint\` | #f6fafd | Hero and final CTA band (the accent at about 3%) |
| \`--band\` | #fafafb | Alternate section background (system row hover) |
| \`--chip\` | #eef6fb | Eyebrow pills (accent soft) with \`--accent-edge\` |
| \`--frame\` | 1px solid #e6e6e9 + system shadow-float | Product shots, pricing boxes, the audio card |

No dark full-width blocks. Contrast comes from large Geist display type, ink, and corner blue used sparingly.

### 1.2 Type scale

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
- Grid children get \`min-width: 0\`; the page clips sideways overflow.

### 1.4 Motion principles

- System curves: \`cubic-bezier(0.16, 1, 0.3, 1)\` for reveals, the morph curve for anything that changes size.
- Default scroll reveal: opacity 0 to 1 and translateY 12px to 0, 360ms, when 20% of the element is in view, once
  per session (IntersectionObserver).
- Stagger children 80ms, max 6 per group.
- \`prefers-reduced-motion: reduce\`: no translate, no auto-playing loops, fades 150ms only. The sample call never
  autoplays in any mode (it has sound).

## 2. Sticky nav

- 64px high, white at 90% opacity with \`backdrop-filter: blur(10px)\`, 1px hairline bottom border after 8px of scroll.
- Left: the mark (two interlocking rounded squares, corner blue and ink edge) + wordmark "Sparring".
- Centre (desktop): How it works, Features, For teams, Pricing, Compare, FAQ (anchor links, offset 72px).
- Right: "Log in" (light edge), "Start free trial" (firm ink edge).
- Mobile: logo, "Start free trial" (compact 32px), menu button opening a Sheet with the anchors.
- Motion: fades in 300ms on load. No reveal on scroll.

## 3. Hero

- Eyebrow chip: "AI cold call practice for SDR teams and founders"
- H1: "Practise the cold call before you make the real one."
- Subhead: "Pick a prospect, press Call, and a sceptical CFO picks up and pushes back. Hang up and get your score out
  of 100, the exact second you lost them, and the line you should have said."
- Primary button: "Start free trial" (to \`/signup\`)
- Secondary button: "Hear a 60 second sample call" (scrolls to section 6 and starts the audio on click)
- Trust line: "7 days free with 20 practice minutes. No dialler, no real prospects burned."
- **Visual (right on desktop, under the copy on mobile):** a layered product shot in square frames:
  1. Back layer: the live call screen with Margaret Okafor, CFO, the orb and "2:14 / 5:00".
  2. Front left card: the scorecard total "72 / 100 Solid" with the five rubric bars.
  3. Front right card: one coaching note: "1:52 Fix. 'So you'd want to...' Try: 'What does that cost you each
     month-end?'"
- Motion: copy reveals with stagger (eyebrow, H1, subhead, buttons, trust line). Layers slide up 24px at 0, 140 and
  280ms. The rubric bars fill once at 900ms (400ms each, 60ms stagger). The note card pops at 1.6s with a 1.03 scale
  settle. Reduced motion: final state, no fills or pops.

## 4. Logo strip

- Line above: "Built for people who have to pick up the phone"
- Six role badges until you have real logos: SDR teams, BDR managers, Sales bootcamps, Founders selling B2B,
  Agency new business, Recruitment desks. Muted ink, 60% opacity, full on hover.
- Replace with 6 real customer logos once you have permission.
- Motion: fade in as one group, 400ms.

## 5. Problem

- Eyebrow: "Why reps ramp slowly"
- H2: "Every rep learns to cold call on real prospects. That is the expensive way."
- Three columns (stacked on mobile), each with a small corner blue line icon (Lucide, 1.5 stroke):
  1. **"Burned the best accounts."** "New reps practise on the territory you spent months building. Each fumbled
     opener is a prospect who will not pick up again."
  2. **"Roleplay on Friday, maybe."** "Managers mean to roleplay every week. It happens twice a month, the manager
     plays nice, and the feedback comes from memory."
  3. **"Nobody hears the call."** "Without a recording and a score, nobody knows if the opener got better or the
     same objection killed ten calls this week."
- Closing line, centred, Geist 500 24px: "Skill on the phone comes from reps. Make the reps free."
- Motion: columns stagger 80ms.

## 6. Hear a practice call (demo)

- Eyebrow: "Hear it"
- H2: "A real practice call, and the scorecard it got."
- Left: an audio card (\`--frame\`): Margaret's avatar, "Cold call · Normal · 1:04", a waveform (static SVG generated
  at build time), play button (white, firm edge), and 3 note markers on the waveform. Clicking a marker seeks.
  Audio: a 60 second excerpt of a real Sparring call you recorded yourself (you as the rep), MP3 under 1 MB,
  \`preload="none"\`.
- Right: the scorecard for that call: total, five bars, the top fix, two coaching notes. As the audio passes each
  note's second, that note gets the accent-soft fill (same behaviour as the app).
- Under both: "Recorded on Sparring with the built-in Sceptical CFO persona. Your scores will vary."
- Optional, after launch (see the marketing tasks): a "Call Margaret yourself (2 minutes, no signup)" button.
- Motion: the two cards reveal together; the note highlight follows the audio (no motion with reduced motion, only
  the fill).

## 7. Feature sections

Alternate visual left and right on desktop. Each: eyebrow, H2 at 36px, body, 3 bullets, a visual.

### 7.1 Prospects that push back
- Eyebrow: "Realistic personas"
- Heading: "A sceptical CFO, a busy founder and a gatekeeper who has heard it all."
- Body: "Each persona has a personality, a way of talking, pains they will not volunteer and objections they will
  use. They interrupt. They go quiet. On Hard they hang up on a weak opener."
- Bullets: "Replies in about a second, in a natural voice" · "Cold call, discovery and objection drill
  scenarios" · "Easy, Normal and Hard for every persona"
- Visual: three PersonaCards with the difficulty pills under them.

### 7.2 Scored on what wins meetings
- Eyebrow: "The rubric"
- Heading: "Opener, permission, pain discovery, objection handling, next step."
- Body: "Every call is scored out of 100 against the five things that decide a cold call. Each score has a reason
  you can argue with, and one top fix for next time."
- Bullets: "Scored in about a minute after you hang up" · "Same rubric for every rep, every time" · "See the
  talk-listen ratio for each call"
- Visual: the rubric rows with reasons.

### 7.3 Coaching notes on the exact second
- Eyebrow: "Coaching notes"
- Heading: "Click the note, hear the moment, read the better line."
- Body: "Three to eight notes pinned to the recording: what to keep doing and what to fix, with your exact words and
  a line you could have said instead."
- Bullets: "Recording and transcript for every call" · "Notes jump the audio to that second" · "Run the same drill
  again in one click"
- Visual: the audio player with markers and two notes.

### 7.4 Build personas from your own ICP
- Eyebrow: "Custom personas"
- Heading: "Your buyer, your objections, ready in a minute."
- Body: "Paste who you sell to and the objections your team hears every day. Sparring drafts a prospect with hidden
  pains and the conditions that win the meeting. Edit anything, pick a voice, save."
- Bullets: "Uses your team's real objections word for word" · "Hidden pains reps have to dig out" · "Managers
  control what wins the call"
- Visual: the builder form on the left, the drafted persona on the right.

### 7.5 Drills, leaderboards and streaks for the team
- Eyebrow: "For teams" (anchor \`#teams\`)
- Heading: "Assign the drill on Monday. See who did it by Friday."
- Body: "Managers assign drills with a pass score and a due date. Reps get an email, practise, and the leaderboard
  updates. Streaks reward the daily 15 minutes that actually builds the skill."
- Bullets: "Assignments with pass scores and due dates" · "Weekly leaderboard and per-rep trends" · "Monday 8am
  team report by email"
- Visual: the leaderboard with streaks and a small trend chart.

### 7.6 Minutes you control
- Eyebrow: "No surprise bills"
- Heading: "Pooled practice minutes with a hard cap."
- Body: "Every plan includes a set number of voice minutes for the whole team. The meter is always on screen, and
  calls stop at the cap. No overage, ever."
- Bullets: "Meter in the sidebar for every rep" · "Email at 80% used" · "Upgrade any time from Billing"
- Visual: the sidebar meter at "212 of 360 min left" and the 80% email.

Motion for every feature section: text reveals first, the visual 120ms later; one subtle detail animates once on
reveal (7.1 cards fan 4px; 7.2 bars fill; 7.3 playhead moves 20%; 7.4 the draft fields fill top to bottom; 7.5
leaderboard rows rise; 7.6 meter eases from full to 59%).

## 8. How it works

- Eyebrow: "How it works"
- H2: "Three steps, about five minutes."
- Steps (numbers in corner blue, 48px tabular):
  1. **Pick who you are calling.** "Choose a persona, a scenario and a difficulty. Read the 3 line brief."
  2. **Make the call.** "Press Call, use your headphones, and talk like it is real. Hang up when you are done (or
     when they hang up on you)."
  3. **Read your scorecard.** "Score out of 100, coaching notes on the recording, and one thing to fix. Run it
     again."
- Visual: a thin horizontal line joins the three on desktop; it draws left to right over 600ms on reveal.

## 9. Comparison table

- Eyebrow: "Compare"
- H2: "Built for teams of 1 to 16, priced on the page"
- Table (horizontal scroll on mobile, first column sticky). Competitor prices are from third-party comparisons in Oct
  2026, because the vendors quote by demo. Confirm before launch.

| | Sparring | Hyperbound | Second Nature | PitchMonster | Manager roleplay |
|---|---|---|---|---|---|
| Starting price | $49/month, published | Free tier; paid is by quote (reported from about $40 to $250/user/mo) [verify] | By quote (reported about $30 to $40/user/mo, annual) [verify] | Reported $1,200/quarter for teams [verify] | Free, costs manager hours |
| Buy without a sales call | Yes | Free tier only [verify] | No [verify] | No [verify] | n/a |
| Live voice roleplay | Yes | Yes | Yes | Yes [verify] | Yes |
| Built-in cold call personas | Yes, 3 + custom | Yes | Yes | Yes [verify] | 1 (your manager) |
| Custom persona from your ICP and objections | Yes, in about a minute | Yes [verify] | Yes, with setup [verify] | [verify] | n/a |
| Score with timestamped coaching notes | Yes | Yes [verify] | Yes [verify] | Yes [verify] | From memory |
| Assignments and leaderboards | Team and Floor | Yes | Yes | Yes [verify] | Spreadsheet |
| Hard cap on usage, no overage | Yes | [verify] | [verify] | [verify] | n/a |

- Under the table: "Sparring is for teams that want to start today: pick a plan, invite the team, run the first
  drill this afternoon."
- Motion: rows fade in with 40ms stagger. The Sparring column has an \`--accent-soft\` tint and a top chip "Sparring".

## 10. Testimonials slot

- Eyebrow: "Early teams"
- H2: "What reps and managers say"
- Three quote cards. Until you have real quotes, the section is hidden in production (render only when
  \`TESTIMONIALS\` in \`lib/testimonials.ts\` has 3 items). In development it shows dashed placeholder cards with "Your
  first customer quote goes here".
- Card: quote (Geist 500 20px), name, role, company, avatar. One number per quote where possible ("Our two new SDRs
  booked their first meetings in week 2 instead of week 5.").

## 11. Pricing

- Eyebrow: "Pricing"
- H2: "Practice minutes for the whole team, on one card"
- Subhead: "Every plan starts with a 7 day free trial with 20 practice minutes. Cancel any time from Billing."
- **Toggle:** Monthly / Annual pill switch; Annual shows a chip "2 months free". Default Monthly. The price digits
  crossfade (200ms) and the Checkout price id swaps. Card heights do not change.
- Three cards, the middle one with a 1px \`--accent-edge\` border, accent soft fill and a "Most popular" chip:

| | Solo | Team | Floor |
|---|---|---|---|
| Monthly | $49 | $199 | $499 |
| Annual | $490/year ($40.83/mo) | $1,990/year ($165.83/mo) | $4,990/year ($415.83/mo) |
| For | Founders and individual reps | SDR teams up to 5 reps + a manager | Bigger floors and bootcamp cohorts |
| Seats | 1 | 6 | 16 |
| Practice minutes a month (pooled) | 90 | 360 | 900 |
| Longest call | 10 min | 15 min | 20 min |
| Custom personas | 3 | 25 | 500 |
| Persona drafts a month | 5 | 30 | 100 |
| Assignments, leaderboard, trends | | Yes | Yes |
| Monday team report email | | Yes | Yes |
| Button | Start free trial | Start free trial | Start free trial |

- Every card lists: "All built-in personas and scenarios", "Score and coaching notes on every call", "Recordings and
  transcripts for 90 days".
- Under the cards, Geist 500 24px: "If 15 minutes a day gets one rep to their first meeting a week sooner, Team has
  paid for itself."
- Risk line: "No setup fee, no contract, no overage. Calls stop at your minute cap."
- Buttons go to \`/signup?plan=team&interval=month\` (carried into Checkout after signup).
- Wire to \`STRIPE_PRICE_SOLO_MONTHLY\`, \`STRIPE_PRICE_SOLO_YEARLY\`, \`STRIPE_PRICE_TEAM_MONTHLY\`,
  \`STRIPE_PRICE_TEAM_YEARLY\`, \`STRIPE_PRICE_FLOOR_MONTHLY\`, \`STRIPE_PRICE_FLOOR_YEARLY\`.
- Motion: cards rise with 80ms stagger; the middle card ends 8px higher on desktop.

## 12. FAQ

Accordion, one open at a time, all closed at first. Answers 1 to 3 sentences.

1. **Is the prospect a real person?** "No. It is an AI persona with a realistic voice that answers in about a
   second. It is built to push back like a real buyer, so the practice feels like the real thing."
2. **Does Sparring call real people?** "Never. Every call is between you and a practice persona in your browser.
   Nothing is dialled."
3. **What do I need?** "A laptop or phone with a browser, a microphone and ideally headphones. Chrome, Edge,
   Safari and Firefox all work."
4. **How is the score worked out?** "Claude scores each call against five lines (opener, permission, pain
   discovery, objection handling, next step), 20 points each, and pins coaching notes to the moments that decided
   them. The rubric is in the docs."
5. **Can I use my own buyer and objections?** "Yes. Paste your ICP and the objections your team hears, and
   Sparring drafts a custom persona you can edit. Solo includes 3 custom personas, Team 25."
6. **What happens when we run out of minutes?** "Calls stop, nothing is charged extra, and the owner gets an email
   at 80% and 100%. Minutes reset on your renewal day, or you can upgrade."
7. **Who can see my calls?** "You, and the owner and managers of your workspace. Other reps see only scores on the
   leaderboard, not your recordings or notes."
8. **How long do you keep recordings?** "90 days, then they are deleted. Scores and notes stay."
9. **Is there a free trial?** "Yes, 7 days with 20 practice minutes and 3 persona drafts. You add a card at the
   start and can cancel from Billing before it ends."
10. **Can a bootcamp use it for a cohort?** "Yes. Floor gives 16 seats and 900 minutes a month. Assign drills as
    homework and watch the leaderboard."
11. **Do you support languages other than English?** "Not yet. English (US, UK, Australian and Indian accents in
    the voices) only for now."

FAQPage JSON-LD built from the same array (\`lib/faq.ts\`).

## 13. Final CTA

- Band with \`--hero-tint\`, centred.
- H2: "Make your next cold call your twentieth, not your first."
- Body: "Start a 7 day trial and run your first practice call in about two minutes."
- Button: "Start free trial". Under it: "Takes 2 minutes. Cancel any time."
- Motion: fade up 360ms; nothing loops.

## 14. Footer

- Four columns (stacked on mobile): Product (Features, Pricing, Compare, Changelog), Resources (Documentation, Cold
  call openers, Objection handling guide, Free practice call), Company (About, Contact), Legal (Privacy, Terms).
- Bottom row: "Sparring" wordmark, "Practice that hits back.", copyright year.
- Background \`--band\`, body ink, top hairline.

## 15. Responsive notes

- Under 640px: hero visual under the copy with only the scorecard and note cards. The sample call cards stack
  (audio first). Feature visuals under the text. The comparison table scrolls sideways with a "Swipe to compare"
  hint. Pricing cards stack with Team first.
- 640 to 1024px: two-column hero with a smaller visual; feature sections single column.
- Over 1024px: full layout.
- Test at 320, 375, 430, 768, 1280 and 1440. No horizontal page scroll at any width.

## 16. SEO

- Title: "Sparring: AI cold call practice with instant scoring"
- Meta description: "Practise cold calls with realistic AI prospects who push back. Get a score out of 100 and
  coaching notes on the exact second. Built for SDR teams and founders. 7 day free trial."
- Canonical \`https://sparring.app/\` [verify you own the domain you pick]. \`robots.ts\` allows all; \`sitemap.ts\`
  lists \`/\`, \`/pricing\`, \`/compare/*\`, \`/openers/*\`.
- JSON-LD: SoftwareApplication (name, applicationCategory BusinessApplication, offers with the three monthly
  prices) and FAQPage.
- One H1. Every image has alt text describing the product state ("Scorecard showing 72 out of 100 with five rubric
  scores").

## 17. OG image

- 1200 x 630 via \`next/og\` at \`app/opengraph-image.tsx\`.
- White with a hairline frame. Left: the mark and "Cold call practice that hits back." in Geist 500 64px ink.
  Right: a scorecard card "72 / 100 Solid" with five bars in corner blue and one note pill "1:52 Fix".
- Same image as the Twitter card (\`summary_large_image\`).

## 18. Performance

- LCP under 2.0 s on 4G: the hero product shot as optimised WebP through \`next/image\` with \`priority\`.
- The sample MP3 and waveform load only on interaction or when section 6 is near the viewport.
- Fonts via next/font, Latin subset, no layout shift.
- Landing JS under 120 KB gzipped (no audio library on the landing page: use a plain \`<audio>\` element).

## 19. Analytics events (PostHog)

| Event | When | Properties |
|---|---|---|
| \`lp_viewed\` | page load | referrer, utm_source, utm_campaign |
| \`lp_cta_clicked\` | any Start free trial button | location (nav, hero, pricing_solo, pricing_team, pricing_floor, final) |
| \`lp_sample_played\` | sample audio starts | trigger (hero_button, play_button, marker) |
| \`lp_sample_completed\` | sample reaches 90% | seconds |
| \`lp_pricing_toggle\` | toggle switched | interval |
| \`lp_compare_viewed\` | comparison table 50% in view | |
| \`lp_faq_opened\` | FAQ item opened | question index |
| \`signup_started\` | \`/signup\` loads with a plan param | plan, interval |

Capture UTM params on first visit into a cookie and save them to \`profiles\` on signup (add \`utm jsonb\` with a
migration through the Supabase MCP).
`
