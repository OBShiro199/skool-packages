// Shortlist landing page PRD (LANDING.md).

export const landingPrd = `# Shortlist: landing page PRD

Save as \`LANDING.md\` in the project root and build it with \`@LANDING.md @DESIGN_SYSTEM.md @DESIGN.md\`. The page
lives at \`/\` (and the pricing block again at \`/pricing\`). Every heading, subhead and button below is final copy.

## 0. Page goal

- **One job:** a founder or ops lead who is about to hire (or drowning in a Gmail label of CVs) starts a
  7 day trial.
- **Primary CTA everywhere:** "Start free trial" -> \`/signup\`. Secondary: "See a live careers page" ->
  \`/careers/demo\` (a seeded demo workspace).
- **Visitor:** a startup founder, an agency owner, or an operations lead hiring 1 to 10 people this year.
  Arrives from cold email, LinkedIn posts, Google ("free applicant tracking system", "Workable
  alternative"), or the "Hiring with Shortlist" footer on a careers page.
- **Success:** 4% of visitors start a trial; 25% of trials publish a job in the first session.

## 1. Global rules

### 1.1 Base and tokens
- Quiet Precision tokens (DESIGN_SYSTEM.md section 11) plus the Shortlist accent (DESIGN.md section 2).
- White page, 1180px marketing rail with a hairline left and right, sections split by full-width
  hairlines, 56px vertical padding on mobile, 80px on desktop. Marketing stays square (0 radius on
  section frames); product screenshots sit in 6px frames with a hairline.
- Buttons: white with a firm edge (\`--ink\` 1px for primary, \`--btn-edge\` for secondary), 46px large in the
  hero and final CTA, 36px elsewhere. No filled or black buttons.

### 1.2 Type scale
| Role | Spec |
| --- | --- |
| Display (hero) | 52/1.04, -0.045em, 500 (36/1.08 under 640px) |
| H2 (section) | 35/1.12, -0.035em, 500 (28 under 640px) |
| H3 (feature) | 20/26, -0.025em, 500 |
| Body | 16/26, body ink, 60 to 65 characters wide |
| Small / labels | 13/18, faint ink |
All headings \`text-wrap: balance\`. Numbers tabular.

### 1.3 Layout
- 12-column grid inside the rail, 24px gutters. Text columns max 560px. Grid children \`min-width: 0\`.
- Section rhythm: eyebrow (13px faint, sentence case), H2, subhead (muted, 18/28 desktop, 16/26 mobile),
  then content.

### 1.4 Motion principles
- Opacity and transform only. Reveal on scroll once: 360ms, 6px rise, \`cubic-bezier(0.16, 1, 0.3, 1)\`,
  25ms stagger, capped at 270ms per group, triggered at 20% visibility with IntersectionObserver.
- Product animations are short loops only inside the demo frame (section 6), paused when off-screen.
- \`prefers-reduced-motion: reduce\`: no reveals, no loops, the end frame is shown.

## 2. Sticky nav

- 64px, white, bottom hairline appears after 8px of scroll (opacity 0 to 1, 200ms).
- Left: logo mark + "Shortlist". Centre links (13px, muted, ink on hover): "Product", "Fair hiring",
  "Pricing", "FAQ" (anchor links with smooth scroll, instant with reduced motion).
- Right: "Log in" (text link) and "Start free trial" (36px primary).
- Mobile under 768px: logo + "Start free trial" (32px compact) + menu button opening a full-width sheet
  (200ms fade) with the same links stacked at 48px each.

## 3. Hero

- **Eyebrow:** Applicant tracking for teams hiring their first 10 people
- **H1:** Every applicant on one board. Every candidate gets a reply.
- **Subhead:** Post a job in five minutes, share one link, and review every CV with a quoted summary
  against your own criteria. Candidates book their own interview slot. Their data deletes itself on time.
- **Buttons:** "Start free trial" (46px primary) and "See a live careers page" (46px secondary).
- **Small print under buttons:** "7 day free trial · From $29 a month · Cancel any time"
- **Visual:** the pipeline board screenshot (1180 x 700 frame, 6px radius, hairline, shadow-float) with
  6 columns and 14 realistic cards, the candidate panel open on the right showing the AI summary with
  two Meets pills, one Partly, one Not shown and quotes. Below 768px use a cropped panel-only screenshot.
- **Motion:** headline and subhead fade up 6px (360ms), buttons 60ms later, the screenshot rises 12px
  over 480ms after 120ms. One card in the frame slides from Applied to Screen once (600ms ease-morph)
  2 seconds after load. Reduced motion: static end frame.

## 4. Logo strip

- **Line above (13px faint, centred):** Share one link wherever you post jobs
- Grayscale wordmarks at 24px height, 40% opacity, of the places applicants come from: LinkedIn,
  Wellfound, Indeed, Otta, Google for Jobs [replace with customer logos once
  you have 5; never show a customer logo without permission].
- Static. On mobile, a 2-row wrap, never a marquee.

## 5. Problem

- **Eyebrow:** Hiring without a system
- **H2:** 140 applications in a Gmail label is not a process
- **Three columns (icon 16px Lucide, H3, 2 lines each):**
  1. \`inbox\` **CVs everywhere.** Email, LinkedIn, a Drive folder and a spreadsheet nobody updates.
  2. \`clock\` **Slow and unfair screening.** The first 20 CVs get read properly. The other 120 get four seconds each.
  3. \`calendar-x\` **Six emails per interview.** And the good candidate takes another offer while you find a time.
- **Stat line under (muted, centred):** Most small teams never reply to the majority of applicants.
  Shortlist sends every one of them a reply, automatically, on your words.
- Motion: columns reveal with the standard stagger.

## 6. Product demo

- **Eyebrow:** See it work
- **H2:** From job post to booked interview in one afternoon
- **Visual:** 16:9 frame, 90 second screen recording (Screen Studio export, H.264, muted autoplay loop,
  poster image, \`playsinline\`). Chapters as 4 clickable chips under the video that seek: "Create a job",
  "Apply on a phone", "Review with the AI summary", "Candidate books a slot".
- Captions burned in. A "Watch with sound" button unmutes and restarts.
- Lazy-load the video when the section is 50% from the viewport; poster only on slow connections
  (\`navigator.connection.saveData\`). Reduced motion: no autoplay, play button shown.

## 7. Feature sections

Alternating two-column rows (text 5 columns, visual 7 columns), visual left on even rows. Each visual is a
real product crop in a 6px frame. Reveal: text then visual, 60ms apart.

### 7.1 A careers page and form in five minutes
- **H3:** A careers page and form in five minutes
- **Body:** Write the job, add your own questions, and publish to a careers page with your logo. Candidates
  apply from their phone in under three minutes, with their CV going straight into private storage.
  Jobs show up in Google for Jobs automatically.
- **Bullets:** Custom questions · PDF and Word CVs up to 10 MB · Google for Jobs ready
- **Visual:** the job page on a 375px phone next to the form builder.

### 7.2 AI that explains, never decides
- **H3:** AI that explains, never decides
- **Body:** For every applicant, Shortlist reads the CV against the criteria you wrote and shows Meets,
  Partly, Not shown or Unclear for each one, with quotes from the CV as proof. No scores, no ranking,
  no auto-reject. Names and contact details are removed before the AI sees anything.
- **Bullets:** Quoted evidence for every claim · Names and contacts redacted · Candidates can opt out
- **Visual:** the AI summary card with quotes highlighted.
- **Link:** "How we keep it fair" -> anchor \`#fair\`.

### 7.3 A board your whole team can use
- **H3:** A board your whole team can use
- **Body:** Drag candidates through Applied, Screen, Interview, Offer and Hired. Leave notes with
  @mentions. Interviewers see only the jobs they are on and fill in a scorecard against the same
  criteria, without seeing anyone else's until they submit.
- **Bullets:** Owner, admin and interviewer roles · Blind scorecards · Live updates
- **Visual:** the board with two avatars on cards and a scorecard open.

### 7.4 Candidates book their own interview
- **H3:** Candidates book their own interview
- **Body:** Connect Google Calendar once. Send a booking link and the candidate picks a slot that works for
  every interviewer, in their own time zone. A Google Meet link and calendar invites go out
  automatically. Reminders and rescheduling are handled for you.
- **Bullets:** Reads free/busy only · Buffers and daily limits · Meet link created for you
- **Visual:** the candidate slot picker on a phone and the resulting calendar invite.

### 7.5 Every candidate hears back
- **H3:** Every candidate hears back
- **Body:** Six email templates in your words: received, interview invite, confirmed, reminder,
  cancelled and rejection. Rejections wait two hours before sending, so a slip of the mouse can be undone.
- **Bullets:** Your reply-to address · Undo for rejections · Bounces handled
- **Visual:** the template editor with placeholder chips and the preview.

### 7.6 GDPR on autopilot
- **H3:** GDPR on autopilot
- **Body:** Pick how long you keep candidate data. Shortlist deletes it on time, warns you a week before,
  and keeps a log that proves it. When a candidate asks what you hold, or asks you to delete it, it takes
  two clicks.
- **Bullets:** 90, 180 or 365 day retention · Access and deletion requests · Deletion log
- **Visual:** Settings > Privacy and retention with a "Due in 21 days" request row.

## 8. How it works

- **Eyebrow:** How it works
- **H2:** Three steps to your next hire
- Three numbered cards in a row (number in a 28px circle with a hairline, tabular):
  1. **Create the job.** Description, questions and 3 to 6 criteria. Shortlist flags wording that hides bias.
  2. **Share one link.** Post it on LinkedIn, job boards or your site. Every applicant lands on the board.
  3. **Review, interview, hire.** Read the quoted summaries, move the right people forward, and let them
     book a slot.
- **Button:** "Start free trial"
- Motion: cards reveal left to right, 60ms stagger; a 1px hairline connector draws between them (scaleX
  from 0 to 1, 400ms). Reduced motion: shown complete.

## 9. Fair hiring (\`#fair\`)

- **Eyebrow:** Fair by design
- **H2:** Built so a person makes every decision
- Two columns. Left: short paragraph "AI is good at reading. People are responsible for deciding.
  Shortlist keeps it that way." Right: a list of 7 rows with a Lucide 16px icon each:
  1. No scores, rankings or auto-reject. Ever.
  2. Every claim backed by a quote from the CV, checked by code.
  3. Names, contacts and personal details removed before the AI reads a CV.
  4. Criteria checked for wording that often hides bias.
  5. Nobody can reject an application nobody has opened.
  6. Candidates can choose a human-only review.
  7. Blind scorecards, so the loudest voice does not set the tone.
- Small print: "Shortlist is designed to support human decisions under UK and EU GDPR Article 22. You
  can switch AI off for your whole workspace at any time."

## 10. Comparison table

- **Eyebrow:** Compare
- **H2:** The hiring tool priced for your first 10 hires
- Table (13px, 48px rows, sticky first column on mobile with sideways scroll inside the table only):

| | Shortlist | Workable | Breezy HR | JazzHR | Manatal |
| --- | --- | --- | --- | --- | --- |
| Starting price | $29 / month | about $299 / month for new customers [verify] | Free (1 job), paid from $157 / month billed annually [verify] | from about $75 / month [verify] | about $15 / user / month [verify] |
| Monthly, cancel any time | Yes | Annual focus [verify] | Yes | Yes [verify] | Annual billing [verify] |
| Careers page and form | Yes | Yes | Yes | Yes | Yes |
| AI CV summaries with quotes | Yes, assistive only | AI features on higher plans [verify] | Limited [verify] | Limited [verify] | AI scoring [verify] |
| Never scores or auto-rejects | Yes | No [verify] | No [verify] | No [verify] | No [verify] |
| Candidate self-booking with Google Calendar | Yes | Yes | Yes | Yes | Yes [verify] |
| Blind scorecards | Yes | Yes [verify] | Yes [verify] | Yes [verify] | No [verify] |
| Automatic GDPR retention and deletion log | Yes | Yes [verify] | Partial [verify] | Partial [verify] | Yes [verify] |
| Setup time | 5 minutes | Hours | Under an hour | Under an hour | Under an hour |

- Footnote (13px faint): "Competitor prices from public pricing pages and third-party reviews, checked
  October 2026. Prices change; check each vendor before deciding." Re-check every [verify] cell before
  launch and remove any cell you cannot confirm.
- Shortlist column has \`--accent-soft\` fill and \`--accent-edge\` side borders.

## 11. Testimonials slot

- **Eyebrow:** From teams hiring now
- **H2:** What small teams say
- Three cards (quote 16/26, name, role, company, 32px avatar). Until you have real quotes, hide this
  section entirely. Never invent testimonials. When ready, use quotes from your first 10 customers with
  written permission, ideally with a number ("We hired our first designer in 19 days").

## 12. Pricing (\`#pricing\`)

- **Eyebrow:** Pricing
- **H2:** Simple plans. Cancel any time.
- **Toggle:** "Monthly" / "Annual · 2 months free" (segmented control, 36px, fixed width; the price
  numbers swap with a 160ms fade, no layout shift: each price sits in a fixed-width tabular box).
- Three cards in a row (stack under 900px), the middle one marked "Most popular" with \`--accent-edge\`:

| | Starter | Team | Growth |
| --- | --- | --- | --- |
| Monthly | $29 / month | $69 / month | $149 / month |
| Annual | $290 / year | $690 / year | $1,490 / year |
| Line | For a founder making the first hires | For a team hiring every quarter | For growing teams with several roles open |
| Seats | 3 | 10 | 25 |
| Open jobs | 2 | 8 | 25 |
| AI summaries / month | 150 | 500 | 1,500 |
| Applications / month | 450 | 1,500 | 4,500 |
| Extras | Careers page, scorecards, scheduling, GDPR tools | Everything in Starter, remove Shortlist branding, pass-through report | Everything in Team, more seats and jobs |
| Button | Start free trial | Start free trial | Start free trial |

- Under the cards: "Every plan: 7 day free trial · Unlimited candidates in your pipeline · Email
  templates · Google Calendar booking · Candidate data deletion on time."
- Small print: "Over your AI summary limit? Applications still arrive and get a reply; summaries pause
  until next month or until you upgrade."
- Buttons go to \`/signup?plan=team&interval=year\` etc. so Checkout opens on the chosen price.

## 13. FAQ (\`#faq\`)

- **H2:** Questions
- Accordion, one open at a time, 200ms height morph, chevron rotates 180deg (instant with reduced motion).

1. **Does the AI reject candidates?** No. Shortlist never rejects, ranks or scores anyone. The AI writes
   a summary against your criteria with quotes from the CV, and a person on your team makes every
   decision. Nobody can reject an application nobody has opened.
2. **What does the AI see?** The CV text with names, emails, phone numbers, addresses, links and
   personal-detail lines removed, the answers to your questions and your criteria. It never sees other
   candidates or your team's notes.
3. **Can candidates opt out of AI?** Yes. The application form has a "Do not use AI on my application"
   box. Those applications are never sent to the AI and are marked so your team reads them in full.
4. **Is it GDPR compliant?** Shortlist is built for UK and EU GDPR: a clear notice on the form, a
   retention period you choose, automatic deletion with a log, and two-click handling of access and
   deletion requests. You stay in control as the employer.
5. **Which calendars work?** Google Calendar today. Shortlist reads only free/busy times and creates the
   interview event with a Google Meet link. Outlook is on the roadmap.
6. **Where do applicants come from?** Anywhere you share your job link: LinkedIn, job boards, your
   website or a newsletter. Jobs are also marked up for Google for Jobs.
7. **What happens when I reach my monthly limit?** Applications keep arriving and candidates still get
   their emails. AI summaries pause until the 1st of the month or until you upgrade.
8. **Can my interviewers use it for free?** Interviewers take a seat on your plan: 3 on Starter, 10 on
   Team, 25 on Growth. They see only the jobs you add them to.
9. **Can I import candidates from another tool?** Not in the first version. Start fresh with your next
   role; most small teams hire one or two roles at a time.
10. **What if we pause hiring?** Cancel any time from Billing. Your careers page goes offline and data
    keeps deleting on schedule. Come back when the next role opens.
11. **Do you have a free plan?** No, but every plan starts with a 7 day free trial so you can publish a
    job and see real applicants first.

## 14. Final CTA

- Full-width section, white, top and bottom hairline, centred.
- **H2:** Your next hire is one link away
- **Subhead:** Publish a job today. See your first applicants on the board tonight.
- **Buttons:** "Start free trial" (46px primary), "See a live careers page" (46px secondary).
- Small print: "7 day free trial · From $29 a month"

## 15. Footer

- 4 columns on desktop (stack on mobile): Product (Features, Pricing, Fair hiring, Changelog), Resources
  (Documentation, Hiring guides, Job description templates, Workable alternative), Company (About,
  Contact, Status), Legal (Privacy, Terms, Sub-processors).
- Bottom row: logo mark, "© 2026 Shortlist", "Made for teams hiring their first 10 people".

## 16. Responsive notes

- Check at 320, 375, 430, 768, 1024 and 1440px. No sideways scroll on the page (only inside the
  comparison table).
- Hero visual swaps to the panel crop under 768px. Feature rows stack (text first, then visual).
- Tap targets 44px minimum. Sticky nav stays 64px; the mobile sheet locks body scroll.

## 17. SEO

- **Title:** Shortlist: simple applicant tracking for small teams
- **Meta description:** Post a job, review every CV with quoted AI summaries against your criteria, let
  candidates book interviews, and stay GDPR compliant. From $29 a month. 7 day free trial.
- H1 once (hero). Section H2s as above. Canonical \`https://YOURDOMAIN/\`.
- JSON-LD: \`SoftwareApplication\` (name, applicationCategory "BusinessApplication", offers with the three
  monthly prices) and \`FAQPage\` from section 13.
- Later pages for search (built from real content, not thin copies): "/alternatives/workable",
  "/alternatives/breezy-hr", "/guides/how-to-write-fair-job-criteria", "/templates/job-description/<role>".

## 18. OG image

- 1200 x 630, white, hairline frame inset 40px, logo mark + "Shortlist" top left (24px), H1 "Every
  applicant on one board" (64px, 500, -0.04em, ink), subline "Applicant tracking for small teams · from
  $29" (28px, muted), a cropped board screenshot bottom right in a 6px frame. Generated with \`next/og\`.

## 19. Performance

- LCP under 2.0s on 4G: hero screenshot as AVIF/WebP with explicit width and height, \`priority\`, fonts
  self-hosted Geist with \`font-display: swap\`, demo video lazy-loaded.
- CLS 0: every image and video has reserved size; the pricing toggle never changes layout.
- JS under 120 KB on the landing page (no animation library; IntersectionObserver + CSS classes).

## 20. Analytics events (PostHog)

| Event | When | Properties |
| --- | --- | --- |
| \`landing_viewed\` | page load | utm_source, utm_medium, utm_campaign, referrer |
| \`cta_clicked\` | any "Start free trial" | location (nav, hero, how, pricing, final), plan, interval |
| \`demo_careers_clicked\` | "See a live careers page" | location |
| \`demo_video_played\` | video starts with sound or chapter click | chapter |
| \`pricing_toggled\` | toggle change | interval |
| \`faq_opened\` | accordion opened | question index |
| \`comparison_viewed\` | table 50% visible | |
| \`fair_section_viewed\` | section 50% visible | |
Funnel: \`landing_viewed\` -> \`cta_clicked\` -> \`signup_completed\` -> \`checkout_started\` -> trial started (from
the Stripe webhook) -> \`job_published\`.

## 21. Accessibility

- One H1, logical H2/H3 order, landmarks (\`header\`, \`main\`, \`footer\`, \`nav\` with \`aria-label\`).
- The pricing toggle is a radio group; the selected price is announced ("$690 a year, Team").
- The FAQ accordion uses buttons with \`aria-expanded\` and \`aria-controls\`.
- The demo video has captions and a text transcript link under it.
- Visible focus (2px outline, 2px offset) on every link and button; skip link "Skip to content".
- Colour is never the only signal: the comparison table uses "Yes", "No" and "Partial" in words.

## 22. Copy tests (run one at a time, 1,000 visitors each)

| Test | Control | Variant |
| --- | --- | --- |
| Hero H1 | Every applicant on one board. Every candidate gets a reply. | Hire your first 10 people without the spreadsheet. |
| Hero subhead lead | Post a job in five minutes | Stop reading 140 CVs at midnight |
| Primary CTA | Start free trial | Post your first job free |
| Pricing default | Monthly selected | Annual selected |
Keep the winner when one variant beats the other on \`cta_clicked\` with at least 100 clicks per side.

## 23. Build prompt for Claude Code

\`\`\`text
Read @LANDING.md, @DESIGN_SYSTEM.md and @DESIGN.md. Build app/(marketing)/page.tsx and
app/(marketing)/pricing/page.tsx with sections 2 to 15 in order, components in components/marketing/.
Use real product screenshots from public/marketing/ (I will add them; use 6px framed placeholders
with the right sizes until then). No animation library: one useReveal() hook with
IntersectionObserver that adds a class once. Add the SEO meta, JSON-LD and OG image from sections 17
and 18, and the PostHog events from section 20. Check 320, 375, 430, 768 and 1440px with screenshots.
Plan first, then wait for my OK.
\`\`\`
`
