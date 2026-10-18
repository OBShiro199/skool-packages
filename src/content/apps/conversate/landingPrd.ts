// Conversate landing page PRD (LANDING.md).

export const landingPrd = `# Conversate: landing page PRD

Save this file as \`LANDING.md\` in your project root. In Claude Code, say:
"Build the landing page exactly as described in @LANDING.md, using @DESIGN_SYSTEM.md and @DESIGN.md."

## 0. Page goal

- One job: get a SaaS founder, Shopify store owner or agency to click **Build my help centre**.
- Second job: let them paste their website into the live demo and watch their own help centre appear.
- Audience: busy, has tried a chatbot that made things up, pays for Intercom or answers from Gmail.
  Reads on a laptop, often arrives from a cold email or a Reddit reply on a phone. Desktop-led, mobile-perfect.
- Route: \`/\` (marketing route group). \`/pricing\` reuses the pricing and comparison sections full width.
- The Conversate widget is installed on this page with your own workspace key (dogfooding).

## 1. Global rules

### 1.1 Base and tokens
Uses Quiet Precision with the Lagoon accent from DESIGN.md and the system's marketing rules: square corners
on boxes and frames (pills keep 4px), a 1180px rail with hairlines left and right, white buttons with a firm
ink edge (no filled or black buttons, even here). Adds:

| Token | Value | Use |
|---|---|---|
| \`--hero-tint\` | #f6fafc | Hero and final CTA band (Lagoon at about 3%) |
| \`--band\` | #fafafb | Alternate section background |
| \`--chip\` | #eef6f9 | Eyebrow pills with \`--accent-edge\` |
| \`--frame\` | 1px solid #e6e6e9 + shadow-float | Product shots, pricing boxes, the demo |

### 1.2 Type
| Style | Mobile | Desktop | Weight | Tracking |
|---|---|---|---|---|
| Display (hero H1) | 40px / 1.04 | 64px / 1.02 | 500 | -0.045em |
| H2 | 32px / 1.1 | 48px / 1.06 | 500 | -0.04em |
| H3 | 20px / 26px | 24px / 32px | 500 | -0.025em |
| Body | 16px / 26px | 16px / 26px | 400 | -0.011em |
| Eyebrow | 13px pill | same | 500 | -0.014em |

Headings use \`text-wrap: balance\`. Body max 62ch.

### 1.3 Layout
- Rail 1180px, side padding 16 / 24 / 32px. Sections 56px mobile, 80px desktop vertical padding, split by
  full-width hairlines, alternating white and \`--band\`.
- Grid children get \`min-width: 0\`; the page clips sideways overflow. Check at 320, 375, 430, 768, 1280px.

### 1.4 Motion
- Reveal: opacity 0 to 1, translateY 12px to 0, 360ms, \`cubic-bezier(0.16, 1, 0.3, 1)\`, when 20% in view,
  once per session (IntersectionObserver). Children stagger 80ms, max 6.
- \`prefers-reduced-motion: reduce\`: no translate, no auto-playing loops, fades 150ms, demo video shows poster.

## 2. Sticky nav

- 64px, white at 90% with backdrop blur 10px, hairline bottom once scrolled past 8px.
- Left: mark + "conversate". Centre links (desktop): Product, How it works, Pricing, Compare, Docs.
- Right: "Log in" (ghost) and **"Start free trial"** (primary). Mobile: menu button opens a full-width
  sheet with the links and both buttons; the sheet slides down 8px over the page (no reflow).
- Event: \`nav_cta_click\` { location: 'nav' }.

## 3. Hero

- Background \`--hero-tint\`. Two columns desktop (copy 5/12, visual 7/12), stacked on mobile (copy first).
- Eyebrow pill: "AI help desk for small teams"
- H1: **"Your website, turned into a help centre and an AI agent in 5 minutes."**
- Subhead: "Paste your URL. Conversate reads your site, writes your help articles, and answers your
  customers with sources. When it is not sure, it hands the chat to your team."
- Primary input row (one line desktop, stacked mobile): URL input 46px "https://yourwebsite.com" +
  **"Build my help centre"** (primary, 46px). Under it 13px muted: "7-day free trial · No card to start ·
  Plans from $49 a month".
- Secondary link: "Watch the 90 second demo" (opens section 6 video in a dialog).
- Submitting the URL goes to \`/signup?site=<url>\`; signup pre-fills onboarding step 2 with it.
- **Visual:** a framed product shot (square, hairline + shadow-float) of the widget panel over a faded
  example store page. The panel shows: visitor "Do you ship to Canada?", AI "Yes. We ship to Canada in 4
  to 7 working days. Orders over $80 ship free." with two source pills "Shipping" and "Delivery times",
  and a confidence pill "High 0.86" in a small agent-side tooltip overlay. Behind it, offset 24px, a
  framed slice of the Inbox list.
- Motion: copy reveals first, the visual 120ms later. The AI message types in once (letters appear over
  900ms) after the panel lands. Reduced motion: final frame.
- Events: \`hero_url_submit\` { has_url }, \`hero_demo_open\`.

## 4. Logo strip

- Band, 96px. Label 13px faint centred: "Built for teams on" then platform logos in faint grey at 24px:
  Shopify, Webflow, WordPress, Framer, Next.js, Squarespace. These are platforms you install on, not
  customers (be honest until you have customer logos).
- Swap to customer logos with "Trusted by 120 support teams" once you have 10+ who agree.

## 5. Problem

- Eyebrow: "The problem"
- H2: "You answer the same 40 questions every week."
- Three columns (one on mobile), each a hairline box with a 16px Lucide icon:
  1. **"The answers are already on your site."** "Buried in your pricing page, your FAQ and three blog
     posts. Customers will not dig. They email you."
  2. **"Chatbots make things up."** "A bot that invents a refund policy costs you more than it saves.
     Most tools do not show where an answer came from."
  3. **"AI help desks charge per answer."** "Intercom's AI agent is about $0.99 per resolution on top of
     seats. 1,000 resolutions is a $1,000 surprise. *"
- Footnote 12px faint: "* Intercom Fin pricing as listed in Oct 2026. Check intercom.com/pricing."

## 6. Live demo

- Eyebrow: "Try it on your own site"
- H2: "Watch your help centre write itself."
- A framed 16:9 area with two modes (segmented control): **"Paste your site"** and **"Watch the video"**.
  - Paste your site: URL input + "Build a preview" (primary). Calls \`/api/demo\` (rate limited: 3 per IP per
    day, 60 per day total), which crawls 10 pages and drafts 3 articles. Shows the same 5-line build list as
    onboarding (DESIGN.md section 5), then a mini help centre (3 article cards) and a chat box that answers
    from those 10 pages. Below: "Keep this help centre: start your trial" (primary) carries the demo
    workspace over after signup.
  - Watch the video: 90 second screen recording, poster frame is the build list at "Writing 18 articles".
    Chapters under it: 0:00 Paste the URL, 0:20 Articles appear, 0:45 Install the widget, 1:05 A visitor
    asks, 1:20 Hand to a human.
- Demo limits text 12px faint: "Previews read up to 10 public pages and are deleted after 48 hours."
- Events: \`demo_start\` { mode }, \`demo_ready\` { seconds }, \`demo_to_signup\`.

## 7. Feature sections (5)

Each: two columns alternating sides (visual left on even), eyebrow, H3, body, 3 bullet facts, framed visual.

### 7.1 Help centre from your website
- Eyebrow: "Help centre". H3: "Real articles, written from your own pages."
- Body: "Conversate reads up to 5,000 pages, groups them into categories and drafts clear, sourced
  articles. You review, edit and publish. Your help centre lives at yourdomain/acme/help with search."
- Bullets: "Drafts cite the pages they came from" · "Placeholders where a fact is missing, never guesses" ·
  "Search and SEO-friendly article pages".
- Visual: Help Centre admin table with 6 rows (AI tag on each) and a public article page behind it.

### 7.2 AI answers with sources and a confidence score
- Eyebrow: "AI agent". H3: "It answers from your knowledge, or says it is not sure."
- Body: "Every answer shows its sources. Every answer gets a confidence score. Below your threshold, the
  visitor sees 'Talk to a human' instead of a guess."
- Bullets: "Answers in the visitor's language" · "Ignores 'ignore your instructions' tricks" · "You set how
  cautious it is".
- Visual: two widget messages: one confident with sources, one "I am not sure about this one" card.

### 7.3 One shared inbox
- Eyebrow: "Inbox". H3: "Every conversation lands in one place."
- Body: "Assign, snooze, tag, add notes and canned replies. Replies reach the visitor live, or by email if
  they have left. Their email reply comes back into the same thread."
- Bullets: "Open, pending, snoozed, closed" · "Suggested replies from your knowledge" · "Email alerts for
  handoffs and low-confidence answers".
- Visual: the three-pane inbox with a note and a suggested reply.

### 7.4 Content gaps
- Eyebrow: "Gets better weekly". H3: "Unanswered questions become articles in one click."
- Body: "When visitors ask something your help centre does not cover, Conversate groups the questions and
  drafts the missing article for you."
- Visual: content gaps table: "Can I pay by invoice? · asked 14 times · Draft article".

### 7.5 Install anywhere
- Eyebrow: "Install". H3: "One line in your head tag."
- Body: "Copy the snippet, follow the steps for Webflow, WordPress, Shopify, Framer or Next.js. Brand it with
  your icon, colour, greeting and office hours."
- Visual: the snippet code box and the branding panel with a live preview.

Motion: each section's visual reveals 120ms after its copy. Events: \`feature_view\` { id } once each.

## 8. How it works (3 steps)

- H2: "Live before lunch."
- Three numbered columns with a hairline connector line between them on desktop:
  1. **"Paste your website."** "We read your public pages. About 3 minutes for 100 pages."
  2. **"Review your help centre."** "Edit the drafts you want, then publish them all."
  3. **"Add one script tag."** "The widget answers visitors and hands off to your team."
- Under it: "Start free trial" (primary).
- Motion: steps reveal with 80ms stagger; the connector line draws left to right over 500ms (morph curve).

## 9. Comparison

- Eyebrow: "Compare". H2: "Everything in one tool, priced per month, not per answer."
- Table (horizontal scroll inside its frame on mobile, first column sticky):

| | Conversate Starter | Ferndesk Startup | Intercom (Essential + Fin) | Help Scout (Standard + AI Answers) | Crisp (Essentials) |
|---|---|---|---|---|---|
| Starting price | $49 / month | $49 / month [verify] | $29 / seat / month annual, $39 monthly [verify] | $25 / user / month [verify] | $95 / workspace / month [verify] |
| AI answers included | 1,500 / month | 250 / month [verify] | none, $0.99 per resolution [verify] | none, $0.75 per resolution [verify] | $25 of AI credits [verify] |
| Help centre drafted from your website | Yes, in about 5 minutes | Drafts from code, tickets and changelogs [verify] | Write it yourself | Write it yourself | Write it yourself |
| Answers show sources + confidence | Yes, both | Sources [verify] | Sources | Sources [verify] | [verify] |
| Shared inbox with live chat | Yes | No (help centre + widget) [verify] | Yes | Yes | Yes |
| Content gaps to one-click article | Yes | Yes [verify] | Partly (reports) [verify] | No [verify] | No [verify] |
| Seats included | 3 | 5 editors [verify] | per seat | per user | 10 |
| Example: 3 people, 1,000 AI resolutions | $49 | about $144 (Scale $119 + 500 answers $25) [verify] | about $1,077 (3 x $29 + 1,000 x $0.99) [verify] | about $825 (3 x $25 + 1,000 x $0.75) [verify] | depends on credits [verify] |

- Footnote 12px: "Competitor prices from their public pages and third-party summaries, checked October 2026.
  Prices change: confirm on each vendor's pricing page. [verify] marks figures we could not confirm on the
  vendor's own page."
- Below: "Choose them if" line, honest: "Choose Intercom if you need phone, WhatsApp and a large team today.
  Choose Ferndesk if your docs live in a codebase. Choose Conversate if you want a help centre, an AI agent and
  an inbox running this afternoon."
- Event: \`compare_view\`.

## 10. Testimonials slot

- H2: "What support teams say"
- Three quote cards (hairline boxes), each: quote (16px), name, role, company, small avatar, and a metric pill
  ("62% answered by AI in week one"). **Ship with this section hidden** (\`SHOW_TESTIMONIALS=false\`) until
  you have three real quotes with permission. Never invent them.
- Temporary replacement while hidden: a single stats row from your own widget on this page: "This page's
  assistant answered 214 questions this month, 81% without a human." (live from \`workspace_stats\`, updated daily).

## 11. Pricing

- Eyebrow: "Pricing". H2: "Simple plans. Every plan includes the help centre, widget and inbox."
- Toggle (segmented): "Monthly" / "Annual · 2 months free". Default Monthly. The card heights never change:
  the annual sub-line is always reserved.

| | Starter | Growth (Most popular) | Scale |
|---|---|---|---|
| Monthly | $49 / month | $129 / month | $299 / month |
| Annual | $490 / year ($40.83 / month) | $1,290 / year ($107.50 / month) | $2,990 / year ($249.17 / month) |
| AI answers | 1,500 / month | 5,000 / month | 15,000 / month |
| Pages learned | 300 | 1,500 | 5,000 |
| Seats | 3 | 10 | 25 |
| Suggested replies | 500 / month | 2,000 / month | 6,000 / month |
| AI-drafted articles | 40 / month | 150 / month | 500 / month |
| Remove "Powered by Conversate" | | Yes | Yes |
| Button | Start free trial | Start free trial | Start free trial |

- Growth card: accent-edge border and "Most popular" pill. All three buttons are primary (white, firm edge).
- Under the cards: "7-day free trial on every plan. Cancel in two clicks. Over your AI answer limit? The
  assistant pauses and visitors can still message you. No surprise bills."
- Buttons go to \`/signup?plan=growth&interval=year\`. After onboarding, Checkout uses the matching
  \`STRIPE_PRICE_*\` env var (six prices: three plans x month/year).
- Events: \`pricing_toggle\` { interval }, \`pricing_cta_click\` { plan, interval }.

## 12. FAQ (11)

Accordion, one open at a time, height morphs 300ms. Each answer written out:

1. **How long does setup take?** About 5 minutes for a 100-page site: paste your URL, review the drafted
   articles, publish, then paste one script tag.
2. **What if the AI does not know the answer?** It says so. Below your confidence threshold the visitor sees
   "I am not sure" and a "Talk to a human" button, and your team gets an email.
3. **Will it make up prices or policies?** It is told to answer only from your published knowledge and to
   cite its sources. Answers without sources get a low score and are not shown.
4. **Which websites does the widget work on?** Any site where you can add a script tag to the head: plain
   HTML, Webflow, WordPress, Shopify, Framer, Squarespace, Next.js and more. It only runs on domains you allow.
5. **Can my team reply live?** Yes. Replies appear in the visitor's chat instantly. If they have left, the
   reply goes by email and their answer comes back into the same conversation.
6. **What happens when I hit my AI answer limit?** The assistant pauses until your next month or until you
   upgrade. Visitors can still leave a message and your inbox keeps working. We email you at 80%.
7. **Which AI do you use?** Claude by Anthropic for answers and drafting, and Voyage AI to find the right
   parts of your knowledge. Your data is not used to train models.
8. **Can I edit the articles?** Yes. Every article is yours: edit, unpublish, write new ones by hand or
   draft one from a content gap.
9. **Do you support languages other than English?** The assistant answers in the visitor's language. Your
   articles stay in the language you write them in.
10. **Can I cancel any time?** Yes, from Billing in two clicks. Your help centre and data stay until you
    delete your workspace.
11. **Do you offer agency pricing?** Agencies manage each client as its own workspace. Email us for a
    partner code with 30% recurring commission.

Event: \`faq_open\` { index }. Add \`FAQPage\` JSON-LD with these questions.

## 13. Final CTA

- Background \`--hero-tint\`. H2: "Stop answering the same question twice."
- Subhead: "Paste your website and see your help centre in five minutes."
- The same URL input row as the hero + "Build my help centre". Under it: "7-day free trial · From $49 a month".
- Event: \`final_cta_submit\`.

## 14. Footer

- Four columns (two on mobile): Product (Features, Pricing, Compare, Docs, Changelog), Install guides
  (Webflow, WordPress, Shopify, Framer, Next.js), Compare (vs Intercom, vs Ferndesk, vs Crisp, vs Help Scout),
  Company (Contact, Privacy, Terms, Status).
- Bottom row: "© 2026 Conversate" and a small "Made for small support teams" line. Hairline above.
- The "vs" links go to \`/compare/[competitor]\` pages built later (marketing inbound task).

## 15. SEO and meta

- Title (58 chars): "Conversate: AI help desk and help centre from your website"
- Meta description (152 chars): "Turn your website into a help centre and an AI agent in 5 minutes. Answers
  with sources, hands off to your team. 7-day free trial, from $49 a month."
- Canonical \`https://yourdomain.com/\`. Open Graph and Twitter card with the OG image below.
- JSON-LD: \`SoftwareApplication\` (name, applicationCategory "BusinessApplication", offers with the three
  monthly prices), \`FAQPage\`, \`Organization\`.
- \`/sitemap.xml\` lists landing, pricing, docs, install guides and compare pages. \`/robots.txt\` allows all
  except \`/app\`, \`/embed\`, \`/api\`.
- \`/llms.txt\` listing product, pricing, install guides and compare pages.

## 16. OG image

- 1200 x 630, white with the \`--hero-tint\` band on the right half, hairline rail lines.
- Left: wordmark top left, H1 in Geist 500 at 64px "Your website, turned into a help centre in 5 minutes."
- Right: the widget panel crop with the confident answer and two source pills.
- Generate with \`app/opengraph-image.tsx\` (next/og) so it stays in sync with copy.

## 17. Analytics events (summary)

\`nav_cta_click\`, \`hero_url_submit\`, \`hero_demo_open\`, \`demo_start\`, \`demo_ready\`, \`demo_to_signup\`,
\`feature_view\`, \`compare_view\`, \`pricing_toggle\`, \`pricing_cta_click\`, \`faq_open\`, \`final_cta_submit\`,
\`signup_completed\` (on the app side). Send with DataFast or PostHog. Mark \`demo_to_signup\` and
\`pricing_cta_click\` as goals. UTM parameters carry into signup and are saved on the profile for attribution.

## 18. Performance and accessibility

- LCP under 2.0 s on 4G: hero visual is a static WebP with \`priority\`, fonts preloaded (Geist 400, 500).
- The demo section loads its JavaScript only when scrolled near (dynamic import).
- Every interactive element has a visible focus ring (2px, 2px offset). The comparison table has a caption
  and \`scope\` on header cells. Accordion buttons use \`aria-expanded\`.
- Lighthouse targets: Performance 90+, Accessibility 100, SEO 100.

## 19. Responsive notes (per section)

| Section | 320 to 767px | 768 to 1099px | 1100px and up |
|---|---|---|---|
| Nav | Mark + menu button + "Start free trial" (compact 32px) | Links hidden, both buttons | Full |
| Hero | Copy, then URL input stacked over a full-width button, then visual cropped to the widget panel only | Copy over visual, input on one line | Two columns |
| Logo strip | 3 logos per row, 2 rows | One row, 6 logos | One row |
| Problem | One column | Three columns | Three columns |
| Demo | Segmented control full width; build list then chat stacked; video 16:9 | Same, wider | Build list left, preview right |
| Features | Copy then visual, no alternating | Alternating two columns | Alternating two columns |
| How it works | Vertical list, connector line vertical on the left | Three columns | Three columns |
| Comparison | Table scrolls sideways inside its frame, first column sticky 132px, a faint "Scroll" hint that hides after the first scroll | Full table, 13px | Full table |
| Pricing | Cards stacked, Growth first | Three columns, smaller padding | Three columns |
| FAQ | Full width | 720px centred | 720px centred |
| Footer | Two columns | Four columns | Four columns |

## 20. Motion table

| Section | Element | Motion | Duration | Reduced motion |
|---|---|---|---|---|
| Hero | Copy block | fade + rise 12px | 360ms | fade 150ms |
| Hero | Visual frame | fade + rise 12px, 120ms after copy | 360ms | fade 150ms |
| Hero | AI message text | letters appear | 900ms once | final text |
| Demo | Build list ticks | icon crossfade, meter width morph | 160ms / 400ms | instant |
| Features | Copy then visual | fade + rise, visual 120ms later | 360ms | fade |
| How it works | Connector line | scaleX 0 to 1 from left | 500ms morph curve | shown |
| Pricing | Toggle | price text crossfade, numbers keep width (tabular) | 160ms | instant |
| FAQ | Answer | height morph + fade up 4px after 60ms | 300ms | instant |
| Final CTA | Band | fade | 200ms | fade |

Nothing loops on the landing page except the live dot in the testimonial stats row (1.5s).

## 21. Compare pages (\`/compare/[competitor]\`)

One template, four pages at launch: intercom, ferndesk, crisp, help-scout.
- H1: "Conversate vs {Competitor}: {one-line verdict}" (for example "Conversate vs Intercom: an AI help
  desk without per-resolution pricing").
- Two-line verdict, then the comparison table column for that competitor next to Conversate, with the
  date the prices were checked.
- "Choose {Competitor} if" and "Choose Conversate if" boxes, honest and specific.
- "Switching in 3 steps": crawl your existing help centre URL, review drafts, swap the script tag.
- FAQ of 4 from real objections, last-updated date, one CTA "Build my help centre".
- Refresh the prices every 13 weeks; the page shows "Prices checked {month year}".

## 22. Build order for Claude Code

1. Marketing layout (nav, footer, rail) and tokens.
2. Hero with the URL row and static visual.
3. Pricing with the toggle wired to six \`STRIPE_PRICE_*\` env vars and the comparison table.
4. Features, how it works, problem, logo strip, FAQ with JSON-LD.
5. Demo section with \`/api/demo\` (built in the inbound marketing task) behind a feature flag.
6. SEO metadata, OG image, sitemap, robots, llms.txt, analytics events.
7. Screenshot every section at 375px and 1440px and compare against this file.
`
