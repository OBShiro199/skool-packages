// Harvest landing page PRD (LANDING.md).

export const landingPrd = `# Harvest: landing page PRD

Save this file as \`LANDING.md\` in your project root. In Claude Code, say:
"Build the landing page exactly as described in @LANDING.md, using the tokens in @DESIGN_SYSTEM.md and @DESIGN.md."

## 0. Page goal

- One job: get a B2B founder, agency owner or recruiter who posts on LinkedIn to click **Start free trial**.
- Secondary job: show a real digest email so they can picture opening it tomorrow at 7am.
- Audience: posts on LinkedIn weekly, has watched a post get 400 reactions and zero calls, has maybe tried
  PhantomBuster and got nervous about their account. Sceptical of "AI lead gen". Reads on a phone between meetings
  as often as on a laptop. Design mobile-first, desktop-led for the product visuals.
- Routes: \`/\` (marketing route group), \`/pricing\` reuses section 11 full width, \`/compare/[competitor]\` reuses
  section 9 with one competitor expanded.

## 1. Global rules

### 1.1 Base and tokens
Quiet Precision marketing rules: **square corners** on boxes and frames (pills keep 4px), a 1180px rail with a
hairline left and right, white sections split by full-width hairlines, more expressive type. Buttons stay white with
a firm ink edge; no filled or black buttons on the landing page either. Extra tokens:

| Token | Value | Use |
|---|---|---|
| \`--hero-tint\` | #f6fbf9 | Hero and final CTA band (the sage accent at about 3%) |
| \`--band\` | #fafafb | Alternate section background (system row hover) |
| \`--chip\` | #eff7f4 | Eyebrow pills (accent soft) with \`--accent-edge\` |
| \`--frame\` | 1px solid #e6e6e9 + system shadow-float | Product shots, the digest mock, pricing boxes |

### 1.2 Type scale
| Style | Mobile | Desktop | Weight | Tracking |
|---|---|---|---|---|
| Display (hero H1) | 40px / 1.04 | 64px / 1.02 | 500 | -0.045em |
| H2 | 32px / 1.1 | 48px / 1.06 | 500 | -0.04em |
| H3 | 20px / 26px | 24px / 32px | 500 | -0.025em |
| Body | 16px / 26px | 17px / 28px | 400 | -0.011em |
| Eyebrow | 13px / 18px pill | same | 500 | -0.014em |
Headings use \`text-wrap: balance\`; body copy max 62 characters per line.

### 1.3 Layout
- 1180px rail, side padding 16px mobile, 24px tablet, 32px desktop. Sections 56px mobile, 80px desktop.
- Backgrounds alternate white and \`--band\`; hero and final CTA use \`--hero-tint\`.
- Grid children get \`min-width: 0\`; the page clips sideways overflow. Check 320, 375, 430, 768, 1024, 1440px.

### 1.4 Motion principles
- Scroll reveal: elements fade up 12px over 480ms with \`cubic-bezier(0.16, 1, 0.3, 1)\`, triggered once at 15%
  visibility (IntersectionObserver), staggered 60ms per item, max 4 items staggered.
- No parallax, no autoplaying carousels, no scroll-jacking.
- \`prefers-reduced-motion: reduce\`: all reveals show their end state at once; the hero sequence shows the final frame.

## 2. Sticky nav (64px desktop, 56px mobile)
- White, bottom hairline appears after 8px of scroll (opacity transition 160ms).
- Left: brand mark + "Harvest" (16px, 600).
- Centre links (13px, body ink, hover ink): How it works, Pricing, Compare, Docs.
- Right: "Log in" (ghost) and **Start free trial** (primary, 36px).
- Mobile: brand left, **Start free trial** (compact 32px) and a menu button right; the menu is a full-width sheet
  from the top (200ms fade) with the same links stacked at 48px each.

## 3. Hero (\`--hero-tint\`)
- Eyebrow pill: "For founders, agencies and recruiters who post on LinkedIn"
- H1: **"Everyone who liked your post, sorted into leads by 7am."**
- Sub (max 560px): "Harvest collects the people who react to and comment on the LinkedIn posts you choose (yours,
  your competitors', your niche's creators), finds their role, company and verified email, and emails you the 20
  who fit your buyer every morning, each with an opener that mentions what they engaged with."
- Buttons: **Start free trial** (primary, 46px large) and **See a real digest** (secondary, scrolls to section 5).
- Trust line under the buttons (13px, muted): "7-day trial · Never logs in to LinkedIn as you · Cancel in two clicks"
- Product visual (right on desktop, below on mobile): a framed (\`--frame\`) mock of the Today screen at 1:1 crop:
  count strip (1,204 engagers · 318 filtered · 61 enriched · 9 hot · 14 warm) and 5 lead rows with tier pills.
  Over its bottom-left corner, offset 24px, a smaller framed card of one lead's opener box.
- Hero sequence (plays once on load, 1.6s total): the count strip numbers count up (600ms), then the 5 rows rise
  one by one (360ms each, 60ms stagger), then the opener card fades up (300ms). Reduced motion: final frame.

## 4. Logo strip (white)
- Line (13px, faint, centred): "Built for people who sell on LinkedIn at"
- 6 greyscale wordmark slots (placeholder boxes until you have real customers: never fake logos). Until then
  replace the strip with three numbers in a row (tabular, 32px): "1,200 warm people a month on an average weekly
  poster's posts*", "3% fit a typical B2B buyer*", "7:00 your digest lands". Footnote: "* Example maths for a
  founder whose posts get 300 reactions a week. Your numbers will differ."

## 5. Problem (\`--band\`)
- Eyebrow: "The problem"
- H2: **"Your best leads already raised their hand. Nobody wrote it down."**
- Three columns (stack on mobile), each with a 16px Lucide icon, H3 and 2 lines:
  1. **Reactions vanish.** "A post peaks in 48 hours. By Friday the 340 people who reacted are buried under new posts."
  2. **Scrolling is slow.** "Opening 30 profiles to find 4 buyers takes 90 minutes and still gets you no emails."
  3. **Cookie tools are risky.** "Tools that run on your LinkedIn login can get your own account restricted."
- Closing line (H3, ink): "Harvest does the scroll, the lookups and the first line for you. You do the selling."

## 6. Product demo (white)
- Eyebrow: "See it"
- H2: **"This is tomorrow morning."**
- Left (5 columns): a framed, scrollable mock of the digest email exactly as DESIGN.md section 9, with 3 leads.
  Lead 1: "Sam Lee · Hot · 86. Head of Customer Success at Northbeam (51 to 200). Commented on Priya Shah's post
  about onboarding churn." Opener: "Your point about churn starting in week two matched what we see too: most teams
  lose people before the first report lands." (use fictional names only).
- Right (7 columns): a 60 second muted, captioned video (Screen Studio recording): paste a post URL, Collect now,
  Today fills in, open a lead, copy the opener, push to HubSpot. Poster frame = Today screen. Click to play with
  sound; never autoplay with sound. Mobile: video first, digest below.
- Caption under the video: "From post link to CRM in under a minute of your time."
- Motion: the digest frame fades up, then each lead block rises with 60ms stagger.

## 7. Feature sections (alternating white and \`--band\`, image left/right alternating)

### 7.1 Sources
- Eyebrow: "Sources"
- H3: **"Track your posts, your competitors' and your niche's creators."**
- Body: "Paste a post link or a profile link. Creators are checked every night, and every new post they publish is
  collected at 24 hours, 3 days and 7 days, when most of the engagement has happened."
- Visual: the Sources table mock with relation pills (Mine, Competitor, Influencer) and the yield column.

### 7.2 Filtering before spending
- Eyebrow: "Targeting"
- H3: **"Only the people who fit get looked up."**
- Body: "Describe your buyer in a sentence. Harvest turns it into titles, seniority, company size, industries and
  countries, filters every engager on their headline first, and only then finds a role, company and email for the
  ones that fit. Students, job seekers and other vendors never reach your inbox."
- Visual: the ICP form with chips and the threshold slider hint "About 34% of last week's engagers pass".

### 7.3 Enrichment and verification
- Eyebrow: "Contact data"
- H3: **"Role, company, size and an email that is checked twice."**
- Body: "Each lead gets a current title, company, headcount, industry and a work email from a commercial data
  provider, then a second check with an email verifier. Invalid addresses are removed, catch-all domains are marked."
- Visual: the lead panel's Contact block with the Verified pill.

### 7.4 Openers that mention the post
- Eyebrow: "Openers"
- H3: **"A first line that proves you are not spamming."**
- Body: "Every lead comes with a one or two sentence opener about the topic they engaged with or the point they made
  in their comment. No flattery, no links, no 'I saw your comment'. Edit it or copy it as is."
- Visual: two opener boxes side by side, one for a comment, one for a reaction.

### 7.5 Push anywhere
- Eyebrow: "Exports"
- H3: **"One click to HubSpot, Pipedrive, a CSV or any webhook."**
- Body: "Push a lead or a whole list to your CRM with a note about what they engaged with. Export a CSV with the
  opener column for Smartlead or Instantly, or send signed webhooks to Zapier, Make or Clay."
- Visual: the Push menu open over the selection bar.

### 7.6 Safe by design
- Eyebrow: "Your account"
- H3: **"Harvest never touches your LinkedIn login."**
- Body: "No cookies, no browser extension, no auto-connects, no DMs. Harvest reads public engagement on posts you
  choose using third-party data providers, keeps only what it needs, and forgets anyone you ask it to."
- Visual: a simple 3-row checklist card (Never logs in as you · Never messages anyone · Forget anyone in one click).

Motion for 7.x: text column fades up, visual fades up 80ms later. Visuals are static images (WebP, 2x) with a frame,
lazy loaded below the fold, explicit width and height to avoid layout shift.

## 8. How it works (white)
- Eyebrow: "How it works"
- H2: **"Three steps, then it runs every night."**
- Three numbered columns with a 1px hairline connector on desktop:
  1. **Add sources.** "Paste the posts and creators you want to mine. Mine, competitor or influencer."
  2. **Describe your buyer.** "One sentence becomes a scoring profile you can tune."
  3. **Open your digest.** "At 7am: the 20 warmest people, why they fit, an opener, and a push button."
- Under: **Start free trial** (secondary).

## 9. Comparison (\`--band\`)
- Eyebrow: "Compare"
- H2: **"Built for one job: turning post engagement into leads you can email."**
- Table (scrolls sideways inside its frame on mobile with the first column sticky; the page never scrolls sideways):

| | Harvest | PhantomBuster | Trigify | Teamfluence | Doing it by hand |
|---|---|---|---|---|---|
| Starting price | $59/mo | $69/mo [verify] | $149/mo [verify] | $99/mo [verify] | Free |
| Uses your LinkedIn login or cookie | No | Yes, session cookie | [verify] | Browser extension [verify] | Yes |
| Competitor and creator posts | Yes | Yes (one phantom per job) | Yes | Mainly your own and your team's [verify] | Yes |
| ICP filtering before enrichment | Yes | No | Yes | Basic | No |
| Verified work email included | Yes | Extra credits [verify] | Credits [verify] | Not on the entry plan [verify] | No |
| Opener that mentions the post | Yes | No | No [verify] | No [verify] | You write it |
| Morning digest email | Yes | No | Alerts [verify] | Slack updates [verify] | No |
| HubSpot / Pipedrive push | Growth and up | Via integrations | Yes | HubSpot [verify] | Copy and paste |

- Footnote (12px, faint): "Competitor prices and features checked Oct 2026 from public pages and listings. They change;
  check their sites."
- Each competitor name links to \`/compare/<competitor>\` (honest, specific pages: what they do better too).

## 10. Testimonials slot (white)
- Eyebrow: "Early users"
- H2: **"What happens when the reactions become a list."**
- Three quote cards (framed, square). Until you have real quotes, ship this section hidden behind a flag
  (\`SHOW_TESTIMONIALS=false\`). Never invent quotes. Each card when live: quote (17px), name, role, company, and one
  number ("4 calls booked in week one").

## 11. Pricing (\`--band\`)
- Eyebrow: "Pricing"
- H2: **"Priced by how many people we gather, not by seats."**
- Toggle: segmented control "Monthly" / "Annual (2 months free)", 36px, the selected half gets \`--accent-soft\` fill
  and \`--accent-edge\` edge. Prices change in place with a 160ms crossfade; card heights never change (reserve
  the "billed $590 a year" line on monthly too, as \`visibility: hidden\`).
- Three framed cards, Growth marked "Most popular" with an accent-edge frame and pill:

| | Solo | Growth | Agency |
|---|---|---|---|
| Monthly | $59 | $129 | $249 |
| Annual | $590 a year ($49.17 a month) | $1,290 a year ($107.50 a month) | $2,490 a year ($207.50 a month) |
| For | One founder or recruiter | Small teams and busy posters | Agencies running clients |
| Sources tracked | 15 | 50 | 150 |
| Engagers gathered a month | 1,500 | 4,000 | 10,000 |
| Leads enriched a month | 300 | 600 | 950 |
| Seats | 1 | 3 | 10 |
| ICPs | 1 | 3 | 10 |
| HubSpot and Pipedrive | | Yes | Yes |
| CSV and signed webhooks | Yes | Yes | Yes |

- Buttons on every card: **Start 7-day trial** (primary on Growth, secondary on the others).
- Under the cards (13px, muted): "Trials include 5 sources, 300 engagers and 40 enriched leads. Engagers are
  reactions and comments we collect. Enriched leads are the ones we look up for role, company and email."
- Analytics: \`pricing_toggle\` { interval }, \`pricing_cta_clicked\` { plan, interval }.

## 12. FAQ (white)
- H2: **"Questions"**. Accordion, one open at a time, 200ms height morph, chevron rotates 180 degrees.

1. **Will this get my LinkedIn account restricted?** Harvest never logs in to LinkedIn as you, never asks for your
   password or cookies and never sends connection requests or messages. Collection runs on third-party data providers
   that read public engagement.
2. **Where does the data come from?** Public reactions and comments on the posts you choose, collected through
   Apify actors, and work details and emails from a commercial enrichment provider, checked by an email verifier.
3. **Can I track competitors' posts?** Yes. Paste any public post link or creator profile and tag it Competitor.
   People engaging with a competitor's post about the problem you solve are often the warmest leads you will find.
4. **How many leads will I get?** It depends on how many people engage and how narrow your buyer is. A founder
   whose posts get 300 reactions a week typically sees 5 to 20 leads that fit each morning. The Today page shows
   how many were filtered and why.
5. **Does Harvest send emails to my leads?** No. Harvest gives you the list, the opener and the push button. You
   send from your own inbox or sequencer.
6. **What counts as an engager?** Every reaction or comment we collect counts once against your monthly number,
   even if the same person engages again. Duplicates never become duplicate leads.
7. **What happens when I hit my limit?** We email you at 80%. At 100% collection or enrichment pauses until your
   next billing date, or you upgrade. We never charge overage.
8. **How do you keep existing customers out?** Upload a CSV of customer emails or domains, or click Mark customer on
   any lead. Suppressed people never appear again.
9. **Can someone ask to be removed?** Yes. Forget this person deletes their data from your workspace and blocks them
   from being collected again.
10. **Which CRMs do you support?** HubSpot and Pipedrive on Growth and Agency, plus CSV export and signed webhooks
    (Zapier, Make, n8n, Clay) on every plan.
11. **Is the 7-day trial free?** Yes. A card is needed to start, you are not charged if you cancel before day 7, and
    cancelling takes two clicks in Billing.
12. **Can agencies run this for clients?** Yes. Agency includes 10 ICPs and 150 sources, so you can keep a separate
    buyer profile per client.

Each Q/A is also emitted as FAQPage JSON-LD.

## 13. Final CTA (\`--hero-tint\`)
- H2: **"Tomorrow at 7am, your first harvest."**
- Sub: "Add one post tonight. Wake up to the people who engaged with it, sorted."
- **Start free trial** (primary, large) and **Talk to the founder** (secondary, links to a booking page).
- Small line: "7-day trial · Cancel in two clicks".

## 14. Footer (white, top hairline)
- Four columns: Product (How it works, Pricing, Docs, Changelog), Compare (vs PhantomBuster, vs Trigify, vs
  Teamfluence), Free tools (Post lead estimator), Company (About, Contact, Privacy, Terms).
- Bottom row: "© 2026 Harvest" and "Harvest is not affiliated with LinkedIn." (13px, faint).

## 15. Free tool: Post lead estimator (\`/tools/post-lead-estimator\`)
- H1: "How many warm leads is your last post hiding?"
- Inputs: reactions (number), comments (number), "How narrow is your buyer?" (segmented: Broad 6%, Typical 3%,
  Narrow 1%). Output (tabular, 48px): "About 11 people who fit your buyer engaged." Sub-line: "Harvest would find,
  verify and write an opener for each of them by tomorrow morning."
- No scraping, no signup. CTA **Start free trial**. Event: \`estimator_used\` { reactions, comments, band }.
- Purpose: SEO page for "linkedin post engagement leads" and a shareable link for social posts.

## 16. Pricing page (\`/pricing\`)
- Same section 11 at the top, full width, with H1 "Pricing" (visually the H2 style) and the toggle.
- Below the cards, a full feature table (sticky header row with plan names and prices, 48px rows, hairlines):

| Feature | Solo | Growth | Agency |
|---|---|---|---|
| Tracked sources (posts + creators) | 15 | 50 | 150 |
| Engagers gathered a month | 1,500 | 4,000 | 10,000 |
| Leads enriched a month | 300 | 600 | 950 |
| Seats | 1 | 3 | 10 |
| ICPs | 1 | 3 | 10 |
| Digest recipients | 1 | 3 | 10 |
| Competitor and creator tracking | Yes | Yes | Yes |
| Email verification | Yes | Yes | Yes |
| Openers | Yes | Yes | Yes |
| CSV export and signed webhooks | Yes | Yes | Yes |
| Engager CSV import | Yes | Yes | Yes |
| HubSpot and Pipedrive push | | Yes | Yes |
| Support | Email | Email, 1 business day | Email, same day, onboarding call |

- Billing FAQ (4 items, same accordion): "Can I change plans later?" (Yes, any time in Billing; upgrades apply at
  once, downgrades at the next renewal), "Do unused enrichments roll over?" (No, they reset each billing period),
  "Do you charge overage?" (Never; we pause and tell you), "Can I pay yearly?" (Yes, 2 months free).
- Motion: the feature table rows fade in as one block (no per-row stagger, it is reference content).

## 17. Compare page template (\`/compare/[competitor]\`)
- Hero: H1 "Harvest vs PhantomBuster for LinkedIn post engagers", sub (2 lines, honest summary), **Start free trial**.
- "At a glance" table: the competitor's column and Harvest's column only, 8 rows from section 9, each with a short
  note column ("PhantomBuster runs on your LinkedIn session cookie; Harvest uses no-login data providers").
- "Where PhantomBuster is better": 2 to 3 honest points in plain boxes (for example: "Hundreds of automations
  beyond LinkedIn posts", "Lower entry price if you only need a raw export").
- "Where Harvest is better": 3 points with a small product visual each.
- "Pricing side by side": two framed boxes with prices and "checked Oct 2026" under each.
- FAQ (4) and final CTA band. Content from \`content/compare/<competitor>.ts\`.
- SEO: unique title and description per competitor, canonical, FAQPage JSON-LD, no index if the page has fewer than
  400 words of unique copy.

## 18. Section motion summary

| Section | Entry motion | Duration | Reduced motion |
|---|---|---|---|
| Nav | Hairline fades in after 8px scroll | 160ms | Instant |
| Hero | Count-up, rows rise, opener card fades up | 1.6s total | Final frame |
| Logo strip / numbers | Fade up as one | 480ms | Instant |
| Problem | 3 columns fade up, 60ms stagger | 480ms each | Instant |
| Demo | Digest frame, then lead blocks rise | 480ms + 60ms stagger | Instant |
| Features | Text then visual, 80ms apart | 480ms | Instant |
| How it works | 3 steps, 60ms stagger, connector line draws left to right | 480ms, line 600ms | Static line |
| Comparison | Table fades up as one block | 480ms | Instant |
| Pricing | Cards fade up, 60ms stagger; toggle crossfades prices | 480ms / 160ms | Instant swap |
| FAQ | Height morph on open | 200ms | Instant |
| Final CTA | Fade up | 480ms | Instant |

All motion uses opacity and transform only; nothing animates width, height (except the FAQ morph) or layout.

## 19. Accessibility
- One H1 per page; sections use H2, features H3. Landmarks: header, main, footer, nav.
- The pricing toggle is a radiogroup with two radios; prices update in a polite live region.
- The demo video has captions and a text transcript link; the hero mock images have alt text describing the numbers.
- Comparison table uses real table markup with th scope; the sticky first column keeps its header association.
- Colour contrast at least 4.5:1 for body text; tier and relation pills always include the word.

## 20. Responsive notes
- 320px: hero H1 40px, buttons full width stacked, product visual cropped to the count strip + 3 rows.
- 768px: features become single column with the visual first; comparison table scrolls inside its frame.
- 1024px+: two-column hero, features alternate.
- Tap targets at least 44px on mobile. The sticky nav never covers anchor targets (\`scroll-margin-top: 80px\`).

## 21. SEO
- Title (58 chars): "Harvest: LinkedIn post engagers into warm leads every day"
- Meta description (152 chars): "Harvest turns the people who like and comment on LinkedIn posts into enriched,
  scored leads with verified emails and an opener, in your inbox by 7am."
- Canonical \`https://harvest.<yourdomain>/\`. H1 once per page. Alt text on every visual.
- JSON-LD: SoftwareApplication (name, applicationCategory BusinessApplication, offers with the three monthly
  prices in USD) and FAQPage.
- Compare pages: title "Harvest vs PhantomBuster for LinkedIn post engagers", unique copy, no thin pages.

## 22. OG image
- 1200 x 630 PNG, white with a \`--hero-tint\` band, 1px hairline frame inset 40px. Left: brand mark + "Harvest"
  and the H1 in two lines at 64px Geist 500. Right: a cropped digest card with one lead and its opener box.
  Generated with \`next/og\` at \`/opengraph-image\`. Same for compare pages with the competitor name in the H1.

## 23. Analytics (PostHog or DataFast)
| Event | Properties |
|---|---|
| landing_viewed | referrer, utm_source, utm_campaign |
| hero_cta_clicked | button (trial, digest) |
| demo_video_played | seconds_watched (sent at end or unload) |
| pricing_toggle | interval |
| pricing_cta_clicked | plan, interval |
| compare_link_clicked | competitor |
| faq_opened | question_index |
| estimator_used | reactions, comments, band |
| signup_started | from (nav, hero, pricing, final) |

## 24. Build checklist
1. Marketing layout with the rail and hairlines, nav, footer.
2. Sections 3 to 14 in order, each as its own component in \`components/marketing/\`.
3. Pricing reads plans from \`lib/plans.ts\` so app and landing never disagree.
4. Run Lighthouse on mobile: LCP under 2.5s, CLS under 0.05, all images sized.
5. Check every page at 320, 375, 430, 768, 1024 and 1440px with reduced motion on and off.
`
