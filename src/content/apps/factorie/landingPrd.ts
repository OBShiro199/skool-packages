// Factorie landing page PRD (LANDING.md). Backticks are escaped.

export const landingPrd = `# Factorie: Landing Page PRD

Save as \`LANDING.md\` in the project root. In Claude Code, refer to it as \`@LANDING.md\` together with \`@DESIGN_SYSTEM.md\` and \`@DESIGN.md\` (tokens, type, components). The marketing site follows Quiet Precision's marketing rules: white, square, hairlines, one violet accent. Build at \`app/(marketing)/page.tsx\` with sections as separate components in \`components/marketing/\`. Every heading, subhead and button below is final copy: use it word for word.

## 0. Goal and audience

- **Goal:** visitor starts the 7-day free trial, or requests a free AI visibility audit.
- **Audience:** B2B SaaS founders and heads of marketing, SEO and content agencies, ecommerce brand marketers. They have heard "AI search" and suspect they are invisible in it.
- **One idea the page must land:** "Your buyers ask AI which tool to buy. Factorie shows you whether it names you, who it names instead, and what to fix."
- **Primary CTA:** "Start free trial" to \`/signup\`. **Secondary CTA:** "Get a free AI visibility audit" to \`/audit\`.

## 1. Global

### 1.1 Layout
- White background everywhere (\`--surface\`). No tinted bands, no gradients, no glows.
- The marketing rail is 1180px max with a 1px \`--hairline\` on its left and right edges, running the full page height. Sections are split by full-width hairlines. Section padding 56px top and bottom on mobile, 80px on desktop. Side padding 16px mobile, 24px tablet, 32px desktop inside the rail.
- **Marketing stays square:** boxes, product frames, cards, the comparison table and the pricing cards have 0 radius. Buttons, inputs and tags keep the app's 6px and 4px radii.
- Grid children get \`min-width: 0\`; the page clips sideways overflow. Check at 320, 375 and 430px.

### 1.2 Type (Geist 400, 500, 600)
| Style | Mobile | Desktop | Weight, tracking |
| --- | --- | --- | --- |
| Display (hero H1) | 35 / 1.12 | 52 / 1.04 | 500, -0.045em |
| H2 | 24 / 32 | 35 / 1.12 | 500, -0.035em |
| H3 | 20 / 26 | 24 / 32 | 500, -0.03em |
| Body | 16 / 24 | 16 / 24 | 400, \`--body\` |
| Small | 13 / 18 | 13 / 18 | 400, \`--muted\` |
| Eyebrow | 13 / 18 | 13 / 18 | 500, \`--violet\` ink (\`--tag-violet-ink\`), sentence case |

Headings use \`text-wrap: balance\`. Body copy stays near 65 characters wide. Never all caps. Figures are tabular.

### 1.3 Buttons
- Every button is white with a 1px edge and ink label 500, 6px radius, 46px tall on the landing page (large size), 36px in the nav.
- Primary ("Start free trial") has the firmer \`--btn-edge-strong\` edge. Secondary ("Get a free AI visibility audit") has the light \`--btn-edge\`. No filled, black or violet buttons.
- Hover: \`--hover\` fill, 120ms. Press: 98% scale. Every primary button goes to \`/signup\` and fires \`lp_cta_click\` with \`location\` (section 18).

### 1.4 Motion
- Opacity and transform only, curve \`cubic-bezier(0.16, 1, 0.3, 1)\`.
- Default scroll reveal: fade in and rise 8px, 320ms, once, when 20% of the element is in view (IntersectionObserver, no animation library needed). Children stagger 40ms, capped at 6 children.
- Nothing loops on the page except the hero's live dot (1.4s pulse), matching the app.
- Reduced motion: everything shows its end state instantly; counters show the final number; the video shows its poster with a play button.

## 2. Sticky nav

- Height 56px, white, a bottom hairline that is always there (no change on scroll, so nothing shifts). Sticky at the top, z-index 90.
- Left: logo (glyph + "Factorie"). Centre links 13px muted, ink on hover: "Product" (#product), "How it works" (#how), "Compare" (#compare), "Pricing" (#pricing), "FAQ" (#faq). Right: "Log in" text link and "Start free trial" (primary button, 36px).
- Anchor links scroll smoothly with a 72px offset (instant under reduced motion).
- Mobile: logo + "Start free trial" + a menu icon button (labelled "Open menu") that opens a side panel from the right over the page (200ms, 24px slide) with the links and both buttons. Focus is trapped inside; Escape closes it.

## 3. Hero

- Eyebrow tag (violet tag hue, 4px radius, with the live dot): "AI visibility tracking for ChatGPT, Perplexity, Gemini, Claude and more"
- H1 (display): **"See where AI recommends you. And who it recommends instead."**
- Subhead: "Factorie asks ChatGPT, Perplexity, Gemini, Claude, DeepSeek and Grok the questions your buyers ask, every week. You see your visibility score, your rank in every answer, the sources they cite and the pages to write next."
- Buttons: "Start free trial" (primary, large) and "Get a free AI visibility audit" (outline, large).
- Microcopy under buttons: "7-day free trial · Set up in 10 minutes · Cancel in two clicks"
- **Product visual (right side on desktop, below on mobile):** a square-cornered frame with a 1px hairline (no shadow, no device mockup) containing the real overview UI built in HTML, with three layered elements. The two floating cards are the only things on the page with \`--shadow-float\`:
  1. Base: overview dashboard (score cards + visibility line chart).
  2. Floating card bottom-left: a ChatGPT answer snippet "1. **Profound** ... 2. **Factorie** ... 3. **Otterly**" with "Factorie" highlighted green and the others red; small label "ChatGPT · position 2".
  3. Floating card top-right: ScoreCard "Visibility 34.2 +3.1 vs last week".
- Motion: base fades in (320ms); floating cards rise 8px and fade with 120ms and 240ms delays. No floating loop. The score in card 3 counts from 0 to 34.2 over 500ms once, in a fixed-width tabular slot.

## 4. Logo strip

- Line above: "Track your brand across the engines your buyers use"
- Row of 6 engine letter marks with names (ChatGPT, Perplexity, Gemini, Claude, DeepSeek, Grok) in muted ink, split by hairlines. No company logos (trademark).
- Second row (add once real): "Used by teams at" + customer logos greyscale. Hidden until you have 3 real customers.
- Motion: marks fade in with a 40ms stagger. On mobile the row wraps to 3 x 2; no marquee.

## 5. Problem

- Eyebrow: "The problem"
- H2: **"Your buyers stopped Googling. They ask AI, and it names three brands."**
- Subhead: "If you're not one of them, you lose the deal before you know it existed. And there's no Search Console for AI answers."
- Three problem cards (icon, title, text):
  1. **"You can't see it."** "Every engine answers differently, changes week to week, and gives different answers in different countries."
  2. **"Checking by hand doesn't last."** "25 questions x 6 assistants is 150 copy-and-pastes a week. Nobody keeps that up."
  3. **"You don't know what to fix."** "Which pages do the engines read? Which competitor keeps getting cited? Where should you show up?"
- Visual under the cards: a muted chat bubble "What's the best AEO tool for a SaaS startup?" with an answer listing three competitors and no mention of "you", the word "You" with a dashed outline where your brand should be.
- Cards are square boxes split by hairlines (a 3-column grid with shared borders), not floating cards.
- Motion: cards stagger 40ms; the dashed "You" box fades in last (320ms).

## 6. Product demo

- id \`product\`. Eyebrow: "See it in action"
- H2: **"From website to visibility score in 10 minutes"**
- Subhead: "Paste your URL. Factorie reads your site, writes the questions your buyers ask, and runs the first check while you watch."
- 90-second product video (Screen Studio recording, MP4 + WebM, poster frame of the overview) in a square-cornered 16:9 frame with a 1px hairline. Play button: a 46px white button with the firm edge and a Lucide Play icon. Plays inline with sound off by default and captions on. Lazy-load (\`preload="none"\`).
- Chapters under the video as buttons that seek: "0:00 Paste your URL", "0:20 Approve 20 prompts", "0:40 Watch the first check", "1:05 Read the answers", "1:20 Your next page to write".
- Motion: frame fades in and rises 8px on reveal (320ms).

## 7. Feature sections (alternating image left and right)

### 7.1 Visibility score
- Eyebrow: "Visibility"
- H3 (32/40): **"One number for how often AI recommends you"**
- Text: "A 0 to 100 score per engine that counts every mention and weights it by position. First place counts more than seventh. Watch it move week by week."
- Bullets: "Per engine and across all engines" · "Share of voice against your competitors" · "Average position and mention rate"
- Visual: line chart card with 6 engine lines and the "All engines" line in violet at 2px. The chart fades in once (320ms); no line drawing.

### 7.2 Real answers, highlighted
- Eyebrow: "Answers"
- H3: **"Read exactly what each engine said"**
- Text: "Every answer is saved. Your brand is highlighted green, competitors red, sources blue. Click through history to see when you entered the list, or dropped out."
- Visual: HighlightedAnswer card with engine tabs. On reveal the highlights fade in one after another (40ms stagger).

### 7.3 Competitors
- Eyebrow: "Competitors"
- H3: **"See who AI recommends instead of you"**
- Text: "Share of voice by engine, head-to-head tables, and the prompts each competitor wins. Factorie also flags brands that keep appearing that you don't track yet."
- Visual: share of voice donut + stacked bars card. Fades in once (320ms).

### 7.4 Sources
- Eyebrow: "Sources"
- H3: **"Find the pages that shape the answers"**
- Text: "Factorie counts every URL the engines cite. See which review sites, listicles and Reddit threads mention your competitors but not you. That's your outreach list."
- Visual: domains table with amber "Outreach target" tags. Rows rise 6px with a 25ms stagger, once.

### 7.5 Recommendations
- Eyebrow: "What to do next"
- H3: **"A weekly list of pages to write and places to appear"**
- Text: "Factorie looks at the prompts you're losing, the sources the engines trust and your own site, then suggests the five actions most likely to change the answer, with an outline for each page."
- Visual: two RecommendationCards, one expanded with an outline.

### 7.6 Daily digest
- Eyebrow: "Digest"
- H3: **"Your AI visibility in your inbox at 8am"**
- Text: "Scores by engine, rank changes, new competitor mentions, top sources and one action. Read it in a minute."
- Visual: the digest email at 375px wide in a square hairline frame (no phone mockup). Rises 8px on reveal.

## 8. How it works

- id \`how\`. Eyebrow: "How it works"
- H2: **"Three steps. Then it runs itself."**
- Three square boxes in a row with shared hairlines (stacked on mobile). Each starts with a 24px violet tag holding the step number:
  1. **"Paste your website"** "Factorie reads your homepage and key pages and writes your brand summary and competitor list."
  2. **"Approve your prompts"** "Get 20 buyer-style questions to track. Edit, delete or add your own."
  3. **"Get your score every week"** "Factorie checks every prompt on every engine, scores the answers and emails you what changed."
- Button under: "Start free trial"

## 9. Comparison table

- id \`compare\`. Eyebrow: "Compare"
- H2: **"Everything you need, without the enterprise price tag"**
- Subhead: "Prices from each vendor's public pages and reviews, checked October 2026. They change often; check before you buy."
- Table (sticky first column on mobile, horizontal scroll inside the card):

| | **Factorie** | Searchable | Profound | Otterly.ai | Peec AI |
| --- | --- | --- | --- | --- | --- |
| Entry price | **$99/mo** | about $125/mo (Pro) [verify] | Not published, sales-led [verify] | $29/mo (Lite) | about $95/mo (Starter) [verify] |
| Prompts on entry plan | 25 | 100 per model [verify] | Ask vendor | 15 | 50 |
| Engines included on entry plan | **5** (ChatGPT, Perplexity, Gemini, Claude, DeepSeek) | ChatGPT, AI Overviews, Perplexity; others are add-ons [verify] | Ask vendor | Core engines; others are add-ons | A few models; others are add-ons [verify] |
| All engines with no add-ons | **Growth, $199/mo (6 engines)** | No | Ask vendor | No | No |
| Raw answers with highlights | Yes | Yes | Yes | Yes | Yes |
| Every cited source counted | Yes | Yes | Yes | Yes | Yes |
| Page recommendations with outlines | Yes, weekly | Yes | Yes | Limited | Limited |
| Daily email digest | Yes | Ask vendor | Ask vendor | Yes | Ask vendor |
| Free AI visibility audit | Yes, no signup | Ask vendor | No | Ask vendor | Ask vendor |
| Free trial | 7 days | 14 days [verify] | Ask vendor | Yes | Yes |

- Square table, hairlines between every cell, header row 36px, rows 48px. The Factorie column has \`--violet-soft\` fill and \`--violet-edge\` side borders. Yes cells use a Lucide Check 14px in green ink; text cells as written. Never show the word [verify] on the live page: before launch, check each vendor's pricing page and replace the cell, or write "Ask vendor".
- Under the table: links to \`/vs/searchable\`, \`/vs/profound\`, \`/vs/otterly\`, \`/vs/peec\` ("Factorie vs Searchable", etc.).
- Motion: the table fades in once (320ms). Under 640px the first column is sticky and the rest scrolls sideways inside the table box.

## 10. Testimonials slot

- Eyebrow: "Customers"
- H2: **"What teams found in their first week"**
- Three quote cards: quote, name, role, company, small metric line (e.g. "Visibility 12 to 31 in 6 weeks").
- Until you have real quotes: render this section only if \`testimonials.length >= 2\` in \`content/testimonials.ts\`. Never invent quotes. A good placeholder alternative is a "Case study: we tracked Factorie itself" card with your own real numbers.

## 11. Pricing

- id \`pricing\`. Eyebrow: "Pricing"
- H2: **"Simple pricing. Start free for 7 days."**
- Toggle: a segmented control "Monthly" / "Annual" with a green tag "2 months free" next to Annual. Default Monthly. Switching cross-fades the price (120ms) in a fixed-width tabular slot so the card never resizes.
- Cards:

**Starter**: "For one brand getting started with AI search."
- Price: $99/month or $990/year ("$82.50/mo billed yearly")
- 1 brand
- 25 tracked prompts
- 5 engines: ChatGPT, Perplexity, Gemini, Claude, DeepSeek
- Weekly checks
- 5 competitors
- 5 rechecks a day
- Weekly recommendations
- Daily digest email
- CSV export
- Button: "Start free trial"

**Growth** (violet "Most picked" tag, \`--violet-edge\` border): "For teams and agencies tracking more."
- Price: $199/month or $1,990/year ("$165.83/mo billed yearly")
- 3 brands
- 60 tracked prompts
- All 6 engines, including Grok
- Weekly checks plus daily checks on 10 pinned prompts
- 50 competitors per brand
- 10 rechecks a day
- On-demand recommendations
- Digest to 5 recipients
- CSV export
- Button: "Start free trial"

- Pricing cards are square boxes side by side with a shared hairline.
- Under cards: "Prices in USD. Need more brands or prompts? Email hello@yourdomain.com."
- Checkout: each button goes to \`/signup?plan=starter&interval=month\` (or growth / year). The plan is carried through onboarding to Checkout.

## 12. FAQ

- id \`faq\`. Eyebrow: "FAQ". H2: **"Questions, answered"**
- Accordion of square rows split by hairlines (one open at a time, height morphs 300ms, chevron rotates 160ms):

1. **What is AEO?** Answer engine optimisation means getting AI assistants like ChatGPT and Perplexity to mention and recommend your brand when buyers ask for advice. It is the AI version of SEO.
2. **How does Factorie check the engines?** We send your tracked questions to each engine through their APIs on a schedule, save the full answer, and read it for your brand, competitors, positions and sources. Engines with web search look things up live; others answer from what they learned in training. We label which is which.
3. **Will the answers match what I see in ChatGPT?** Closely, not exactly. AI answers vary by account, location and wording, even for the same person. That's why we track the same questions every week and look at the trend, not one answer.
4. **Which engines do you track?** ChatGPT, Perplexity, Gemini, Claude and DeepSeek on Starter. Growth adds Grok. Every engine is included in the price, with no add-ons.
5. **How are the questions chosen?** Factorie reads your website and writes 20 buyer-style questions like "best X for Y" and "X alternatives". You edit, delete and add your own before anything is tracked.
6. **How is the visibility score worked out?** Each answer scores 0 to 100: 100 if you're listed first, less the lower you appear, 60 if you're mentioned outside a list, 0 if you're not mentioned. Your score is the average across your prompts.
7. **Can I track my competitors?** Yes. Up to 5 per brand on Starter and 50 on Growth. You see their share of voice, positions and the prompts they win.
8. **How fast will my score change?** Engines with web search can change within days of new pages or mentions going live. Memory-only engines change when the model is updated, which can take months.
9. **Is this for agencies?** Yes. Growth includes 3 brands. Many agencies use Factorie to run a free AI visibility audit for prospects and a monthly report for clients.
10. **Do you need access to my website or analytics?** No. We only read your public pages. No code, no tracking script.
11. **What happens after the trial?** Your plan starts on day 8 unless you cancel. We email you 3 days before. Cancel in two clicks in billing.
12. **Can I change plans?** Any time from billing. Upgrades apply straight away; downgrades apply at the next renewal.

- Add FAQPage JSON-LD with the same Q&As.

## 13. Final CTA

- A full-width square box inside the rail with a \`--violet-edge\` 1px border and \`--violet-soft\` fill (the only tinted area on the page), 80px padding.
- H2: **"Find out what AI says about you this week."**
- Subhead: "Start your 7-day free trial. Your first visibility score is ready in about 10 minutes."
- Buttons: "Start free trial" (primary) and "Get a free audit" (secondary).
- Motion: fades in and rises 8px once.

## 14. Footer

- Four columns: Product (Features, Pricing, Changelog, Free audit), Compare (vs Searchable, vs Profound, vs Otterly, vs Peec), Resources (AEO guide, Blog, llms.txt), Company (About, Contact, Privacy, Terms).
- Bottom row: logo, "© 2026 Factorie", "Made for teams who want to be the answer."
- Ship \`/llms.txt\` listing the product, pricing and comparison pages (it is cheap to do, even though nobody has proven it moves citations).

## 15. Responsive notes

- Hero becomes single column under 1100px: text first, visual below at full width, floating cards scaled to 80% and kept inside the frame.
- Feature sections stack image under text under 768px; alternating order is removed on mobile (text always first).
- Comparison table: first column sticky, rest scroll inside the card. Never page-level horizontal scroll.
- Pricing cards stack; Growth card first on mobile (it is the one most people pick).
- Tap targets 44px. Nav sheet traps focus.

## 16. SEO

- **Title:** "Factorie: AI visibility tracker for ChatGPT, Perplexity and Gemini"
- **Meta description (155 chars max):** "See where ChatGPT, Perplexity, Gemini and Claude recommend your brand, who they name instead, and what to fix. 7-day free trial."
- Canonical \`https://yourdomain.com/\`. \`robots.ts\` allows all including GPTBot, PerplexityBot, ClaudeBot, Google-Extended (you want AI engines to read you). \`sitemap.ts\` lists all marketing and \`/vs/\` pages.
- JSON-LD: \`SoftwareApplication\` (name, applicationCategory "BusinessApplication", offers for both plans in USD), \`Organization\`, \`FAQPage\`.
- H1 used once. Every image has alt text describing what it shows.

## 17. OG image

- 1200 x 630, generated with \`app/opengraph-image.tsx\` (next/og).
- White background with a 1px hairline frame 40px inside the edges. Left: logo, then "See where AI recommends you." in 64px Geist 500 (tracking -0.045em), then "ChatGPT, Perplexity, Gemini, Claude, DeepSeek, Grok" in 26px muted.
- Right: a mini answer card with "Factorie" highlighted green at position 2 and a ScoreCard "Visibility 34.2".
- Twitter card \`summary_large_image\` with the same image.

## 18. Analytics events

| Event | Fires when | Properties |
| --- | --- | --- |
| \`lp_view\` | Page load | utm_source, utm_campaign, referrer |
| \`lp_cta_click\` | Any CTA click | location (nav, hero, how, pricing, final), cta (trial, audit) |
| \`lp_video_play\` | Video plays | |
| \`lp_video_chapter\` | Chapter clicked | chapter |
| \`lp_pricing_toggle\` | Monthly/annual switch | interval |
| \`lp_plan_click\` | Plan button | plan, interval |
| \`lp_compare_link\` | Click a /vs/ link | competitor |
| \`lp_faq_open\` | FAQ opened | question index |
| \`lp_scroll_depth\` | 25, 50, 75, 100% | depth |
| \`audit_requested\` | /audit form submitted | company_domain (hashed), source |

## 19. Performance

- LCP under 2.0s on 4G: the hero visual is HTML and CSS (no image), Geist via next/font with \`display: swap\`, video lazy.
- No client JS for static sections; only nav, toggle, accordion, video and counters are client components.
- Lighthouse mobile 90+ on Performance, Accessibility, Best Practices, SEO.

## 20. Free audit page (\`/audit\`)

The lead magnet. Same nav and footer as the landing page.

- Eyebrow: "Free audit"
- H1 (display): **"Does AI recommend you? Find out in 3 minutes."**
- Subhead: "We ask ChatGPT, Perplexity and DeepSeek 5 questions your buyers ask and show you who they recommend. Free, no signup."
- Form (one square box, 560px wide, hairline border, 24px padding):
  - "Work email" (placeholder "you@company.com"), helper "We send your result here."
  - "Website" (placeholder "company.com")
  - "Brand name"
  - "What do you sell, in a few words?" (placeholder "AI visibility tracker for SaaS")
  - Hidden honeypot field \\`company_fax\\` (visually hidden, \\`tabindex="-1"\\`, \\`autocomplete="off"\\`) and a hidden \\`rendered_at\\` timestamp.
  - Button (primary, full width): "Run my free audit"
  - Under it 13px muted: "One audit per company every 30 days. We do not sign you up for anything."
- Errors in the reserved line under each field: "Use your work email so we can match it to your domain." / "That does not look like a website address."
- On submit the box morphs (height only) to "Running your audit" with RunProgress, then the browser goes to \\`/audit/[token]\\`.
- Right of the form on desktop (below on mobile): "What you get" list with three Lucide checks: "Your AI visibility score out of 100", "Which competitors each engine names instead", "The sources the engines cite for your category".

### 20.1 Result page (\`/audit/[token]\`)
- While running: "Checking 5 questions on 3 engines" with RunProgress. Poll the \\`free-audit\\` GET every 3 seconds; stop after 5 minutes with "This is taking longer than usual. We will email you the result."
- Done: H1 shows the score ("Your AI visibility: 18 out of 100") in tabular figures. Below, a square grid: 5 rows (the questions) x 3 columns (engines), each cell a PositionBadge. Then "Brands named most" (top 5 with counts) and "Sources cited most" (top 5 domains).
- Closing box (violet soft fill, violet edge): H2 **"Track all 25 questions on 5 engines, every week."** Button "Start free trial" to \\`/signup?utm_source=audit\\`.
- \\`noindex\\` meta on result pages. The token is the only key; never show the email.

## 21. Comparison pages (\`/vs/[competitor]\`)

One template, four pages: searchable, profound, otterly, peec. Content lives in \\`content/vs.ts\\` so each page is data.

- H1: **"Factorie vs {Competitor}"**. Subhead: "{Competitor} is {one fair sentence about who it suits}. Factorie is for teams who want every major engine included from $99 a month."
- A two-column square table (Factorie, Competitor) with the rows from section 9 plus "Best for".
- "Where {Competitor} is stronger" (2 or 3 honest bullets, for example Profound's enterprise features or Searchable's Google AI Overviews coverage). Being fair is what makes these pages rank and convert.
- "Where Factorie is stronger" (3 bullets).
- "Switching takes 10 minutes": paste your URL, we write your prompts, your first score arrives the same day.
- Final CTA box and footer as on the landing page.
- SEO title "Factorie vs {Competitor}: AI visibility tracking compared (2026)", meta description under 155 characters, canonical, in the sitemap. Date the page ("Prices checked October 2026") and re-check every quarter.

## 22. Motion summary

| Section | On reveal | Duration | Reduced motion |
| --- | --- | --- | --- |
| Nav | None (always visible, hairline fixed) | | Same |
| Hero | Copy fades up 8px, staggered 40ms; frame fades; two floating cards rise 8px at 120ms and 240ms; score counts up once | 320ms, count 500ms | All shown, final score |
| Logo strip | Marks fade, 40ms stagger | 320ms | Shown |
| Problem | Boxes fade up, 40ms stagger | 320ms | Shown |
| Demo | Frame fades up 8px; video plays when 50% in view, pauses when out | 320ms | Poster + play button |
| Features | Each row fades up once; visuals fade | 320ms | Shown |
| How it works | Three boxes, 40ms stagger | 320ms | Shown |
| Comparison | Table fades | 320ms | Shown |
| Pricing | Cards fade; price cross-fade on toggle | 320ms, 120ms | Instant swap |
| FAQ | Height morph on open | 300ms | Instant |
| Final CTA | Box fades up 8px | 320ms | Shown |

## 23. Accessibility

- One H1 per page. Section headings in order (H2, then H3).
- Every interactive element has a visible 2px ink focus outline with 2px offset. Skip link "Skip to content" as the first focusable element.
- Colour contrast 4.5:1 for body text; the violet ink tag (\\`#6249b8\\` on \\`#f5f2fd\\`) passes.
- The video has captions and a text summary under it for screen readers.
- The pricing toggle is a real radio group; the FAQ uses buttons with \\`aria-expanded\\`.

## 24. Build order for Claude Code

1. Section shells with anchors, the sticky nav and the footer.
2. Hero with the HTML product visual and floating cards.
3. Problem, features and how it works with the reveal helper.
4. Comparison table and pricing with the toggle and the signup links.
5. FAQ with JSON-LD, final CTA.
6. \\`/audit\\`, \\`/audit/[token]\\` and the \\`/vs/[competitor]\\` template.
7. SEO metadata, OG image, analytics helper and events.
8. Screenshot at 375px and 1440px and fix anything that overflows or shifts.
`
