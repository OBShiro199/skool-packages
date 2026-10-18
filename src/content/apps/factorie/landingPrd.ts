// Factorie landing page PRD (LANDING.md). Backticks are escaped.

export const landingPrd = `# Factorie: Landing Page PRD

Save as \`LANDING.md\` in the project root. In Claude Code, refer to it as \`@LANDING.md\` together with \`@DESIGN.md\` (tokens, type, components). Build at \`app/(marketing)/page.tsx\` with sections as separate components in \`components/marketing/\`. Every heading, subhead and button below is final copy: use it word for word.

## 0. Goal and audience

- **Goal:** visitor starts the 7-day free trial, or requests a free AI visibility audit.
- **Audience:** B2B SaaS founders and heads of marketing, SEO and content agencies, ecommerce brand marketers. They have heard "AI search" and suspect they are invisible in it.
- **One idea the page must land:** "Your buyers ask AI which tool to buy. Factorie shows you whether it names you, who it names instead, and what to fix."
- **Primary CTA:** "Start free trial" to \`/signup\`. **Secondary CTA:** "Get a free AI visibility audit" to \`/audit\`.

## 1. Global

- Background \`--background\`, max width 1200px, section padding 112px top and bottom desktop, 72px mobile.
- One soft violet radial glow behind the hero only: \`radial-gradient(60% 50% at 50% 0%, hsl(258 90% 70% / 0.18), transparent)\`.
- Section headings: eyebrow (micro, \`--primary\`), h2 40/48 600 Inter Tight, subhead 18/28 \`--muted-foreground\` max width 640px.
- Scroll reveal default: children fade in and rise 16px, 500ms \`cubic-bezier(0.2, 0.8, 0.2, 1)\`, 60ms stagger, triggered once at 20% visibility (IntersectionObserver, no library needed; Framer Motion allowed if already installed).
- Reduced motion: no rises, no counters, no auto-playing loops; content shows immediately.

## 2. Sticky nav

- Height 64px, transparent at top, after 16px scroll becomes \`--surface\` at 85% with \`backdrop-filter: blur(12px)\` and a bottom border (200ms).
- Left: logo. Centre links: "Product" (#product), "How it works" (#how), "Compare" (#compare), "Pricing" (#pricing), "FAQ" (#faq). Right: "Log in" (ghost) and "Start free trial" (primary, small).
- Mobile: logo + "Start free trial" + menu icon opening a full-height sheet with the links and both CTAs.

## 3. Hero

- Eyebrow pill: "AI visibility tracking for ChatGPT, Perplexity, Gemini, Claude and more"
- H1 (56/60 desktop, 38/44 mobile): **"See where AI recommends you. And who it recommends instead."**
- Subhead: "Factorie asks ChatGPT, Perplexity, Gemini, Claude, DeepSeek and Grok the questions your buyers ask, every week. You see your visibility score, your rank in every answer, the sources they cite and the pages to write next."
- Buttons: "Start free trial" (primary, large) and "Get a free AI visibility audit" (outline, large).
- Microcopy under buttons: "7-day free trial · Set up in 10 minutes · Cancel in two clicks"
- **Product visual (right side on desktop, below on mobile):** a framed screenshot of the overview with three layered elements:
  1. Base: overview dashboard (score cards + visibility line chart).
  2. Floating card bottom-left: a ChatGPT answer snippet "1. **Profound** ... 2. **Factorie** ... 3. **Otterly**" with "Factorie" highlighted green and the others red; small label "ChatGPT · position 2".
  3. Floating card top-right: ScoreCard "Visibility 34.2 +3.1 vs last week".
- Motion: base fades in (400ms); floating cards rise 24px and fade with 150ms and 300ms delays; afterwards each floats 3px up and down on a 7s loop (paused under reduced motion). The score in card 3 counts from 0 to 34.2 over 900ms.

## 4. Logo strip

- Line above: "Track your brand across the engines your buyers use"
- Row of 7 engine letter-mark chips with names (ChatGPT, Perplexity, Gemini, Claude, DeepSeek, Grok, Meta Llama) in muted colour. No company logos (trademark).
- Second row (add once real): "Used by teams at" + customer logos greyscale. Hidden until you have 3 real customers.
- Motion: chips fade in with 40ms stagger.

## 5. Problem

- Eyebrow: "The problem"
- H2: **"Your buyers stopped Googling. They ask AI, and it names three brands."**
- Subhead: "If you're not one of them, you lose the deal before you know it existed. And there's no Search Console for AI answers."
- Three problem cards (icon, title, text):
  1. **"You can't see it."** "Every engine answers differently, changes week to week, and gives different answers in different countries."
  2. **"Checking by hand doesn't last."** "25 questions x 6 assistants is 150 copy-and-pastes a week. Nobody keeps that up."
  3. **"You don't know what to fix."** "Which pages do the engines read? Which competitor keeps getting cited? Where should you show up?"
- Visual under the cards: a muted chat bubble "What's the best AEO tool for a SaaS startup?" with an answer listing three competitors and no mention of "you", the word "You" with a dashed outline where your brand should be.
- Motion: cards stagger 80ms; the dashed "You" outline draws itself (stroke-dashoffset, 900ms) when in view.

## 6. Product demo

- id \`product\`. Eyebrow: "See it in action"
- H2: **"From website to visibility score in 10 minutes"**
- Subhead: "Paste your URL. Factorie reads your site, writes the questions your buyers ask, and runs the first check while you watch."
- 90-second product video (Screen Studio recording, MP4 + WebM, poster frame of the overview) in a 16:9 frame with rounded corners and a border. Play button 72px circle in \`--primary\`. Plays inline with sound off by default and captions on. Lazy-load (\`preload="none"\`).
- Chapters under the video as buttons that seek: "0:00 Paste your URL", "0:20 Approve 20 prompts", "0:40 Watch the first check", "1:05 Read the answers", "1:20 Your next page to write".
- Motion: frame scales from 0.96 to 1 and fades in on reveal (500ms).

## 7. Feature sections (alternating image left and right)

### 7.1 Visibility score
- Eyebrow: "Visibility"
- H3 (32/40): **"One number for how often AI recommends you"**
- Text: "A 0 to 100 score per engine that counts every mention and weights it by position. First place counts more than seventh. Watch it move week by week."
- Bullets: "Per engine and across all engines" · "Share of voice against your competitors" · "Average position and mention rate"
- Visual: line chart card with 7 engine lines and the "All engines" line thicker. Lines draw left to right on reveal (700ms).

### 7.2 Real answers, highlighted
- Eyebrow: "Answers"
- H3: **"Read exactly what each engine said"**
- Text: "Every answer is saved. Your brand is highlighted green, competitors red, sources blue. Click through history to see when you entered the list, or dropped out."
- Visual: HighlightedAnswer card with engine tabs. On reveal the highlights fade in one after another (100ms stagger).

### 7.3 Competitors
- Eyebrow: "Competitors"
- H3: **"See who AI recommends instead of you"**
- Text: "Share of voice by engine, head-to-head tables, and the prompts each competitor wins. Factorie also flags brands that keep appearing that you don't track yet."
- Visual: SOV donut + stacked bar card. Donut segments sweep in clockwise (800ms).

### 7.4 Sources
- Eyebrow: "Sources"
- H3: **"Find the pages that shape the answers"**
- Text: "Factorie counts every URL the engines cite. See which review sites, listicles and Reddit threads mention your competitors but not you. That's your outreach list."
- Visual: domains table with "Outreach target" tags. Rows slide in 40ms stagger.

### 7.5 Recommendations
- Eyebrow: "What to do next"
- H3: **"A weekly list of pages to write and places to appear"**
- Text: "Factorie looks at the prompts you're losing, the sources the engines trust and your own site, then suggests the five actions most likely to change the answer, with an outline for each page."
- Visual: two RecommendationCards, one expanded with an outline.

### 7.6 Daily digest
- Eyebrow: "Digest"
- H3: **"Your AI visibility in your inbox at 8am"**
- Text: "Scores by engine, rank changes, new competitor mentions, top sources and one action. Read it in a minute."
- Visual: phone frame with the digest email. Phone rises 24px on reveal.

## 8. How it works

- id \`how\`. Eyebrow: "How it works"
- H2: **"Three steps. Then it runs itself."**
- Steps in a row (stacked on mobile) with numbers in violet circles and a connecting dashed line that draws on reveal:
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
| Entry price | **$99/mo** | from about $100/mo | about $99/mo, most plans via sales | $29/mo | about EUR 89/mo |
| Prompts on entry plan | 25 | 50 | [check] | 15 | 50 |
| Engines on entry plan | **5** (ChatGPT, Perplexity, Gemini, Claude, DeepSeek) | ChatGPT on Starter | multiple | 4 (Claude and Gemini are add-ons) | 3 of your choice |
| Grok and Meta Llama | Growth plan | add-ons | some | no | no |
| Raw answers with highlights | Yes | Yes | Yes | Yes | Yes |
| Every cited source counted | Yes | Yes | Yes | Yes | Yes |
| Page recommendations with outlines | Yes, weekly | Yes | Yes | Limited | Limited |
| Daily email digest | Yes | [check] | [check] | Yes | [check] |
| Free trial | 7 days | 7 days | No self-serve trial [check] | Yes | Yes |
| Self-serve signup | Yes | Yes | Partly | Yes | Yes |

- Factorie column has \`--primary-soft\` background and a "You are here" style top label "Factorie". Yes cells use a check icon; text cells as written. Mark [check] cells as "Ask vendor" in the UI (do not show the word [check]).
- Under the table: links to \`/vs/searchable\`, \`/vs/profound\`, \`/vs/otterly\`, \`/vs/peec\` ("Factorie vs Searchable", etc.).
- Motion: table fades in; Factorie column background fades from transparent to \`--primary-soft\` 300ms after.

## 10. Testimonials slot

- Eyebrow: "Customers"
- H2: **"What teams found in their first week"**
- Three quote cards: quote, name, role, company, small metric line (e.g. "Visibility 12 to 31 in 6 weeks").
- Until you have real quotes: render this section only if \`testimonials.length >= 2\` in \`content/testimonials.ts\`. Never invent quotes. A good placeholder alternative is a "Case study: we tracked Factorie itself" card with your own real numbers.

## 11. Pricing

- id \`pricing\`. Eyebrow: "Pricing"
- H2: **"Simple pricing. Start free for 7 days."**
- Toggle: "Monthly" / "Annual" with pill "2 months free" next to Annual. Default Monthly. Switching animates prices with a 200ms vertical number roll (tabular nums).
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

**Growth** (pill "Most picked", 2px primary border): "For teams and agencies tracking more."
- Price: $199/month or $1,990/year ("$165.83/mo billed yearly")
- 3 brands
- 75 tracked prompts
- All 7 engines, including Grok and Meta Llama
- Weekly checks plus daily checks on 10 pinned prompts
- 20 competitors per brand
- 20 rechecks a day
- On-demand recommendations
- Digest to 5 recipients
- CSV export
- Button: "Start free trial"

- Under cards: "Prices in USD. Taxes may apply. Need more brands or prompts? Email hello@yourdomain.com."
- Checkout: each button goes to \`/signup?plan=starter&interval=month\` (or growth / year). The plan is carried through onboarding to Checkout.

## 12. FAQ

- id \`faq\`. Eyebrow: "FAQ". H2: **"Questions, answered"**
- Accordion (one open at a time, 200ms height animation, chevron rotates):

1. **What is AEO?** Answer engine optimisation means getting AI assistants like ChatGPT and Perplexity to mention and recommend your brand when buyers ask for advice. It is the AI version of SEO.
2. **How does Factorie check the engines?** We send your tracked questions to each engine through their APIs on a schedule, save the full answer, and read it for your brand, competitors, positions and sources. Engines with web search look things up live; others answer from what they learned in training. We label which is which.
3. **Will the answers match what I see in ChatGPT?** Closely, not exactly. AI answers vary by account, location and wording, even for the same person. That's why we track the same questions every week and look at the trend, not one answer.
4. **Which engines do you track?** ChatGPT, Perplexity, Gemini, Claude and DeepSeek on Starter. Growth adds Grok and Meta Llama.
5. **How are the questions chosen?** Factorie reads your website and writes 20 buyer-style questions like "best X for Y" and "X alternatives". You edit, delete and add your own before anything is tracked.
6. **How is the visibility score worked out?** Each answer scores 0 to 100: 100 if you're listed first, less the lower you appear, 60 if you're mentioned outside a list, 0 if you're not mentioned. Your score is the average across your prompts.
7. **Can I track my competitors?** Yes. Up to 5 per brand on Starter and 20 on Growth. You see their share of voice, positions and the prompts they win.
8. **How fast will my score change?** Engines with web search can change within days of new pages or mentions going live. Memory-only engines change when the model is updated, which can take months.
9. **Is this for agencies?** Yes. Growth includes 3 brands. Many agencies use Factorie to run a free AI visibility audit for prospects and a monthly report for clients.
10. **Do you need access to my website or analytics?** No. We only read your public pages. No code, no tracking script.
11. **What happens after the trial?** Your plan starts on day 8 unless you cancel. We email you 2 days before. Cancel in two clicks in billing.
12. **Can I change plans?** Any time from billing. Upgrades apply straight away; downgrades apply at the next renewal.

- Add FAQPage JSON-LD with the same Q&As.

## 13. Final CTA

- Full-width card on \`--primary\` with white text, radius 16px, the violet glow inside.
- H2: **"Find out what AI says about you this week."**
- Subhead: "Start your 7-day free trial. Your first visibility score is ready in about 10 minutes."
- Buttons: "Start free trial" (white button, violet text) and "Get a free audit" (outline white).
- Motion: card scales 0.98 to 1 on reveal.

## 14. Footer

- Four columns: Product (Features, Pricing, Changelog, Free audit), Compare (vs Searchable, vs Profound, vs Otterly, vs Peec), Resources (AEO guide, Blog, llms.txt), Company (About, Contact, Privacy, Terms).
- Bottom row: logo, "© 2026 Factorie", "Made for teams who want to be the answer."
- Ship \`/llms.txt\` listing the product, pricing and comparison pages (it is cheap to do, even though nobody has proven it moves citations).

## 15. Responsive notes

- Hero becomes single column under 1024px: text first, visual below at full width, floating cards scaled to 80%.
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
- Background \`--background\` with the violet glow top-centre. Left: logo, then "See where AI recommends you." in 64px Inter Tight 600, then "ChatGPT · Perplexity · Gemini · Claude · DeepSeek · Grok" in 26px muted.
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

- LCP under 2.0s on 4G: hero image as AVIF/WebP with \`priority\`, fonts via next/font with \`display: swap\`, video lazy.
- No client JS for static sections; only nav, toggle, accordion, video and counters are client components.
- Lighthouse mobile 90+ on Performance, Accessibility, Best Practices, SEO.
`
