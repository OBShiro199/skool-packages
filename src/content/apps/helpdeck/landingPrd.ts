// Helpdeck landing page PRD. Kept exactly as written: the finished landing page in src/landings/helpdeck is built from it.

export const landingPrd = `# Helpdeck: landing page PRD

Save this file as \`LANDING.md\` in your project root. In Claude Code, say:
"Build the landing page exactly as described in @LANDING.md, using the tokens in @DESIGN.md."

## 0. Page goal
- One job: get a SaaS founder or shop owner to click **Start free trial**.
- Second job: let them paste their own URL into the live demo and talk to a bot trained on their site.
- Audience: founders and support leads on a laptop, often comparing three tools in three tabs. Desktop first, but every section must work on a phone.
- Route: \`/\`. The page itself has the Helpdeck widget installed (trained on \`/docs\`), so visitors can ask it anything.

## 1. Global rules

### 1.1 Tokens
Use the tokens from \`@DESIGN.md\`. The landing page adds:

| Token | Value | Use |
|---|---|---|
| \`--paper\` | #FAFAF7 | Page background |
| \`--ink-900\` | #0B0C0E | Hero background, final CTA background |
| \`--ink-700\` | #24262B | Cards on dark sections |
| \`--ink-200\` | #D9DAD5 | Lines on light sections |
| \`--glow\` | rgba(59, 91, 219, 0.35) | Soft accent glow behind the hero visual |
| \`--shadow-panel\` | 0 24px 60px rgba(11, 12, 14, 0.18) | Widget mockups |

### 1.2 Type scale
| Style | Mobile | Desktop | Weight | Font |
|---|---|---|---|---|
| Display (hero H1) | 40px / 1.05 | 68px / 1.0 | 600, letter-spacing -0.02em | Inter |
| H2 | 30px / 1.15 | 46px / 1.08 | 600, -0.015em | Inter |
| H3 | 20px / 1.3 | 24px / 1.3 | 600 | Inter |
| Body | 17px / 1.6 | 18px / 1.6 | 400 | Inter |
| Code | 14px / 1.6 | 15px / 1.6 | 500 | JetBrains Mono |

### 1.3 Layout
- Container: max width 1200px. Side padding 16px mobile, 24px tablet, 40px desktop.
- Section padding: 80px mobile, 128px desktop.
- Section rhythm: dark hero, light sections, one dark band (How it works), light, dark final CTA.

### 1.4 Motion principles
- Easing: \`cubic-bezier(0.16, 1, 0.3, 1)\` for reveals, \`cubic-bezier(0.4, 0, 0.2, 1)\` for UI toggles.
- Default reveal: opacity 0 → 1, translateY 20px → 0, 600ms, once, when 25% in view.
- Stagger: 80ms between siblings.
- Typing effects use a fixed 18ms per character and never block reading: full text is in the DOM for screen readers from the start (\`aria-label\` on the container).
- Reduced motion: reveals become opacity only (200ms), typing effects show the final text, loops stop, the demo video shows a poster frame with a play button.
- Library: Framer Motion (\`motion\`). Only animate \`transform\` and \`opacity\`.

### 1.5 Buttons
- Primary on dark: white background, \`--ink-900\` text. Primary on light: \`--ink-900\` background, white text. 48px tall, 8px radius, 600 weight.
- Secondary: 1px border (\`--ink-200\` on light, \`--ink-700\` on dark), transparent fill.
- Hover: background shifts 6% lighter or darker, arrow icon nudges 3px right, 160ms.
- Every **Start free trial** goes to \`/signup\` and fires \`cta_click\` with \`location\`.

## 2. Sticky nav
- Height 64px. On the dark hero: transparent with white text. After scrolling past the hero: \`--paper\` at 85% with \`backdrop-filter: blur(12px)\`, \`--ink\` text, 1px \`--ink-200\` bottom border. Colour change cross-fades in 200ms.
- Left: Helpdeck wordmark (speech bubble icon + "Helpdeck").
- Centre (desktop): **Product**, **How it works**, **Pricing**, **Docs** (to \`/docs\`), **FAQ**.
- Right: **Log in** text link and primary **Start free trial**.
- Mobile: wordmark, small **Start free trial**, hamburger sheet with all links.
- Motion: fades down on first load (300ms). Stays visible at all times (B2B readers jump between sections a lot).

## 3. Hero (dark)

### Copy
- Eyebrow pill (outlined, white 70%): **AI support for small teams**
- H1: **Support answers from your own docs. Live before lunch.**
- Subhead: **Paste your website. Helpdeck learns every page and answers customers in a chat bubble, with a link to the page it used. When it is not sure, it hands the chat to your inbox.**
- Primary button: **Start free trial**
- Secondary button: **Try it on your site ↓** (scrolls to the live demo, section 6)
- Microcopy: **7 days free · One script tag · From $49/month**

### Product visual
- Right side (desktop) or under the copy (mobile): a browser window mockup of a fictional SaaS docs site ("Acme Invoicing Docs") with the Helpdeck panel open in the bottom right.
- Inside the panel, a scripted conversation plays:
  1. Visitor: **How do I export all my invoices?**
  2. Bot (types out): **Go to Invoices → Export, pick a date range and choose CSV or PDF. Large exports are emailed to you within a few minutes.**
  3. Source chip appears: **Exporting invoices · docs.acme.com**
  4. Visitor: **Can I get a refund for last month?**
  5. Amber card: **I'm not sure about this one. Want a human to email you?** with an email field.
- Behind the browser: a blurred \`--glow\` circle, 520px, slightly off-centre.

### Motion
- Copy staggers in on load (eyebrow, H1, subhead, buttons), 600ms each, 80ms apart.
- Browser mockup rises 32px and fades, 800ms, 200ms delay.
- Conversation plays once: each visitor message slides in from the right (240ms), typing dots show for 700ms, bot text types at 18ms per character, source chip pops (scale 0.9 → 1, 200ms). Whole script runs about 9 seconds, then holds on the final state. A small **Replay** button appears in the panel corner.
- Glow drifts 20px in a slow circle over 12s, loops. Reduced motion: no drift, full conversation shown at once.

### Responsive
- Mobile: hide the browser chrome and show only the chat panel at full width, with the conversation above.
- Desktop: 50/50 split.

## 4. Logo strip
- Small caption (\`--muted\`, centred): **Works on any site you can paste a script tag into**
- Row of platform names as greyscale text wordmarks (not their logos): **Webflow · WordPress · Shopify · Framer · Squarespace · Ghost · Next.js · Plain HTML**
- When you have customers, add a second row: **Answering questions for** + customer names (with permission).
- Motion: gentle fade-in with stagger. No marquee on desktop. On mobile, a horizontal scroll row with fade masks at both ends.

## 5. Problem
- H2: **You answer the same 30 questions every week.**
- Intro: **The answers are already in your docs. Customers do not read them, and your inbox fills up anyway.**
- Three cards:
  1. **Your inbox is a FAQ.** "How do I reset my password?" for the 40th time this month.
  2. **Big support tools are big.** Weeks of setup, per-seat pricing, and AI add-ons billed per resolution.
  3. **Basic chatbots make things up.** A wrong answer about pricing or refunds costs more than no answer.
- Stat box under the cards: **If a ticket takes 6 minutes and you get 300 a month, that is 30 hours of copy and paste.** Link: **See how Helpdeck handles it** (scrolls to section 7).
- Motion: cards reveal with stagger. "30 hours" counts up from 0 over 900ms (reduced motion: static).

## 6. Live demo ("Try it on your site")
- Section anchor: \`#try\`
- H2: **Try it on your own website. Right now.**
- Subhead: **Paste your docs or help centre URL. We read up to 15 pages and you can ask it anything. No signup needed.**
- Form (one row on desktop, stacked on mobile):
  - Input placeholder: **https://docs.yourcompany.com**
  - Input placeholder: **you@company.com** (we email the demo link so they can come back)
  - Button: **Train my demo bot**
- States:
  - Loading: progress card with live steps that tick in order: **Reading your pages · Splitting into sections · Learning them · Ready**. Show the page count as it grows: **12 pages read**.
  - Ready: the ChatPanel appears inline with the visitor's brand colour guessed from their site's theme colour (fallback ink), and three suggested questions made from their page titles.
  - Error: **We could not read that site. Try your docs or help centre URL instead of your homepage.**
  - Limit hit: **Demo limit reached for today. Start a free trial to train it on your whole site.**
- Under the chat: primary button **Keep this bot: start free trial** (carries the demo bot over after signup).
- Motion: the loading steps tick one by one with a check icon draw (stroke-dashoffset, 300ms). The chat panel expands from the button position (scale 0.96 → 1, 300ms).
- Analytics: \`demo_submit\`, \`demo_ready\` (pages), \`demo_question\`, \`demo_keep_click\`.

## 7. Product demo video
- H2: **From URL to live widget in 3 minutes.**
- 45 second screen recording, no voice, captions burned in: "Paste your URL", "Helpdeck reads every page", "Test a question", "Copy one line", "Live on your site", "Unsure? It emails you".
- MP4 + WebM, under 4MB, \`muted loop playsinline\`, plays when 50% in view, pauses when out of view. Poster frame: the Sources page mid-crawl.
- Chapters under the video as clickable chips that seek to each caption time.
- Reduced motion: no autoplay, poster with play button.

## 8. Feature sections
Five rows, visual and copy alternating sides on desktop. On mobile: visual first, then copy.

### 8.1 Learns your site
- Eyebrow: **Training**
- H3: **Paste a URL. It reads everything.**
- Body: **Helpdeck crawls your docs, help centre and pricing pages, cleans out menus and footers, and learns every section. Re-crawl in one click when your docs change.**
- Bullets: **Up to 1,000 pages** · **Only changed pages are re-learned** · **Delete any page you do not want used**
- Visual: Sources page with the progress card at "84 pages read". Motion: page count ticks up from 0 to 84 over 1.2s.

### 8.2 Answers with sources
- Eyebrow: **Trust**
- H3: **Every answer shows where it came from.**
- Body: **Customers see a link to the exact page behind each answer. You can check any answer in seconds.**
- Bullets: **Source links on every answer** · **Never invents prices or policies** · **Answers in the customer's language**
- Visual: a bot answer with two source chips. Motion: chips slide up 8px with stagger after the answer types out.

### 8.3 Knows when to stop
- Eyebrow: **Handoff**
- H3: **"I'm not sure" beats a wrong answer.**
- Body: **When your docs do not cover a question, Helpdeck says so and offers to pass it to a human. You get an email with the whole chat, and replying goes straight to the customer.**
- Bullets: **Confidence check on every answer** · **Transcript emailed to you** · **Reply-to set to the customer**
- Visual: the amber handoff card, then an email preview in an inbox. Motion: the email preview slides in from the right 24px after the card.

### 8.4 One line to install
- Eyebrow: **Install**
- H3: **One script tag. Any website.**
- Body: **Copy one line into your site's footer. The widget picks up your brand colour and only works on the domains you allow.**
- Bullets: **Webflow, WordPress, Shopify, Framer** · **Under 40kb** · **Locked to your domains**
- Visual: a code block in JetBrains Mono:
  \`<script src="https://helpdeck.app/w.js" data-bot="YOUR_BOT_ID" async></script>\`
  with a Copy button that really copies (fires \`snippet_copy\`). Motion: the code types in at 18ms per character the first time it is in view.

### 8.5 Learn what your docs are missing
- Eyebrow: **Insights**
- H3: **Your "I don't know" list is your docs to-do list.**
- Body: **The Conversations inbox flags every question the bot could not answer, so you know exactly which page to write next.**
- Bullets: **Every chat saved** · **Low-confidence answers flagged** · **Handoffs marked**
- Visual: the Conversations list with amber "Low confidence" badges. Motion: badges fade in with stagger.

## 9. How it works (dark band)
- H2: **Three steps. About ten minutes.**
- Steps in a row (vertical on mobile), each with a big number in \`--ink-700\` outline style:
  1. **Paste your URL.** Helpdeck reads your docs and help pages.
  2. **Test it.** Ask your hardest customer questions in the test panel.
  3. **Add one line to your site.** The bubble goes live. Unsure questions land in your inbox.
- Button: **Start free trial**
- Motion: a thin white line connects the steps and draws left to right as you scroll through the section (scroll-linked \`scaleX\`). Reduced motion: line fully drawn.

## 10. Comparison table
- H2: **Built for small teams, not support departments.**
- Columns: **Helpdeck**, **Intercom (Fin)**, **Zendesk AI**, **Chatbase**, **Crisp**.

| | Helpdeck | Intercom (Fin) | Zendesk AI | Chatbase | Crisp |
|---|---|---|---|---|---|
| Live from a URL in minutes | Yes | No, needs workspace setup | No, needs help centre setup | Yes | Partly |
| Source link on every answer | Yes | Yes | Yes | Optional | [verify] |
| Says "not sure" and hands off by email | Yes | Yes, to agents in Intercom | Yes, to agents in Zendesk | [verify] | Yes |
| Needs a full helpdesk to work | No | Yes | Yes | No | No |
| Pricing | $49/month flat | Seat price + per resolution [verify] | Seat price + AI add-on [verify] | [verify] | [verify] |

- Before you publish, fill every [verify] cell from each competitor's current pricing page and add a footnote: **Checked [Month Year]. Tell us if anything here is out of date.**
- Only claim what each competitor's own site shows. If unsure, write "Varies" or drop the row.
- Mobile: horizontal scroll with sticky first column, Helpdeck column tinted \`--brand-soft\` equivalent (\`rgba(59, 91, 219, 0.08)\`).
- Motion: rows fade in with 50ms stagger.

## 11. Testimonials slot
- H2: **Teams that got their inbox back**
- Three cards: avatar, quote, name, role, company, and one bold result line (e.g. **42% of chats answered without a human**).
- Hidden behind \`SHOW_TESTIMONIALS=false\` until you have real ones. Never publish invented quotes. Ask your first 5 customers: "What did Helpdeck change in your first month?" and pull the numbers from their Conversations page with their permission.
- Motion: stagger in. Mobile: swipe carousel.

## 12. Pricing
- Anchor: \`#pricing\`
- H2: **One price. No per-resolution fees.**
- Subhead: **Every plan starts with a 7-day free trial.**
- Toggle: **Monthly** / **Yearly · 2 months free**. Pill slides 220ms, prices cross-fade 180ms.

### Plan cards
**Starter**
- Price: **$49/month** or **$490/year**
- Line: **For one product and one website.**
- Includes: **1 bot · Up to 200 pages · 2,000 answers a month · Email handoff · Conversations inbox · Brand colour**
- Button: **Start free trial**

**Growth** (badge: **For busy support inboxes**)
- Price: **$129/month** or **$1,290/year**
- Includes: **Everything in Starter · 3 bots · Up to 1,000 pages per bot · 10,000 answers a month · Remove "Powered by Helpdeck" · Weekly "what your docs are missing" email**
- Button: **Start free trial**

- Under the cards: **Need more answers? We will never cut your bot off mid-month. If you pass your limit, we email you and switch the bot to "email us" mode until you upgrade or the month resets.**
- Stripe price IDs in env: \`STRIPE_PRICE_STARTER_MONTHLY\`, \`STRIPE_PRICE_STARTER_YEARLY\`, \`STRIPE_PRICE_GROWTH_MONTHLY\`, \`STRIPE_PRICE_GROWTH_YEARLY\`.
- Motion: cards rise with stagger. Growth card has a 1px animated gradient border (slow 8s rotation). Reduced motion: static border.

## 13. FAQ
- Anchor: \`#faq\`
- H2: **Questions founders ask us**
- Accordion, one open at a time, chevron rotates 180 degrees in 200ms.

1. **What can Helpdeck learn from?**
   Any public web pages: docs, help centre, pricing, FAQ, blog. Paste one URL and it follows the links on that site. PDF and Notion uploads are coming later.
2. **Will it make things up?**
   It is told to answer only from your pages and to say when it is not sure. Every answer links to its source, and questions your pages do not cover are handed to you instead of guessed.
3. **Which AI model does it use?**
   Answers are written by Claude from Anthropic. Your pages are searched with Voyage AI embeddings stored in our database.
4. **Is my data used to train AI models?**
   No. Your pages and chats are used only to answer your customers. Anthropic does not train on API data by default.
5. **How long until it is live?**
   Most sites are read in under five minutes. Add one line to your site and the bubble appears.
6. **Does it work on Webflow, WordPress and Shopify?**
   Yes, and on anything else that lets you add a script tag. The install page has step-by-step instructions for each.
7. **What happens when my docs change?**
   Click Re-crawl. Helpdeck only re-learns pages that changed, so it takes seconds.
8. **Can someone put my widget on their site?**
   No. The bot only answers on the domains you list in Settings.
9. **What counts as an answer?**
   One reply from the bot. A chat with three questions uses three answers. Handoffs are free.
10. **What languages does it speak?**
    It replies in the language the customer writes in, even if your docs are in English.
11. **What happens after the trial?**
    Pick a plan at checkout. If you do not, the bubble switches to "email us" mode and your pages and chats stay safe.
12. **Can I cancel any time?**
    Yes, from Settings → Billing. You keep access until the end of the period you paid for.

- Motion: height auto animation 240ms. Reduced motion: instant.
- FAQPage JSON-LD with all 12 questions.

## 14. Final CTA (dark)
- H2: **Your docs already have the answers. Let them talk.**
- Subhead: **Start a 7-day free trial and have a bot live on your site today.**
- Primary button: **Start free trial**
- Secondary button: **Try it on your site** (scrolls to \`#try\`)
- Visual: three small chat bubbles drift up behind the text at low opacity (20%), each a real question: "Where is my invoice?", "Can I change my plan?", "Do you have an API?".
- Motion: bubbles rise 40px over 6s and fade out, staggered, loop. Reduced motion: static bubbles.

## 15. Footer
- Columns: **Product** (Features, Pricing, Live demo, Changelog), **Install guides** (Webflow, WordPress, Shopify, Framer, HTML), **Resources** (Docs, Status, Contact), **Legal** (Privacy, Terms, Data processing).
- Bottom row: wordmark, **© 2026 Helpdeck**, line **Support answers from your own docs.**
- Install guide pages (\`/install/webflow\` etc.) are short SEO pages with screenshots. Build them after launch.

## 16. SEO
- Title (max 60 characters): **Helpdeck: AI support chat trained on your docs**
- Meta description (max 155 characters): **Paste your website and get an AI chat widget that answers customers from your docs with sources, and emails you when unsure. $49/month, 7 days free.**
- Canonical: \`https://helpdeck.app/\`
- One H1 (hero). H2 per section. Install guides target "add AI chatbot to webflow" style searches.
- JSON-LD: \`SoftwareApplication\` with both plans as offers in USD, plus \`FAQPage\`.
- Alt text on every visual, e.g. "Helpdeck chat widget answering a question about exporting invoices with a source link".

### OG image
- 1200 x 630 PNG via \`next/og\` at \`app/opengraph-image.tsx\`.
- Background \`--ink-900\` with the \`--glow\` circle bottom right.
- Left: **Support answers from your own docs.** in 64px Inter 600 white. Under it: **Trained on your site · Sources on every answer · $49/month** in 26px at 70% white.
- Right: a chat panel with one question, one answer and one source chip.
- Bottom left: Helpdeck wordmark in white.

## 17. Analytics events
DataFast or PostHog, same names. One \`track(name, props)\` helper.

| Event | When | Properties |
|---|---|---|
| \`page_view\` | Automatic | path, referrer, utm_source, utm_campaign |
| \`cta_click\` | Any Start free trial | location: nav, hero, how_it_works, pricing_starter, pricing_growth, final_cta, demo |
| \`demo_submit\` | Train my demo bot clicked | domain |
| \`demo_ready\` | Demo bot finished | pages, seconds |
| \`demo_question\` | Visitor asks the demo bot a question | confident |
| \`demo_keep_click\` | Keep this bot clicked | none |
| \`video_play\` | Demo video starts | autoplay |
| \`snippet_copy\` | Install snippet copied on the landing page | none |
| \`pricing_toggle\` | Monthly/Yearly switched | interval |
| \`faq_open\` | FAQ item opened | question_index |
| \`signup_complete\` | Server side after signup | from_demo: true or false |

- Weekly funnel: page_view → demo_submit → demo_ready → cta_click → signup_complete → trial started → widget seen live.
- Most important ratio: demo_ready → signup_complete. If it is under 15%, rewrite the demo results state first.

## 18. Responsive checklist
- Test at 360, 390, 768, 1024, 1280, 1440 px wide.
- Hero H1 fits in 4 lines at 360px.
- No horizontal scroll except inside the comparison table.
- Code blocks wrap on mobile (\`white-space: pre-wrap\`) so the snippet never overflows.
- \`scroll-margin-top: 80px\` on every section so anchors clear the sticky nav.

## 19. Performance and accessibility
- Lighthouse mobile: Performance 90+, Accessibility 100, SEO 100.
- Hero visual is HTML and CSS. Video and demo ChatPanel load lazily below the fold.
- The real Helpdeck widget on the page loads with \`async\` after the page is interactive.
- Total JavaScript on \`/\` under 150kb gzipped (excluding the widget iframe).
- Focus rings: 2px \`--accent\` outline with 2px offset. Colour contrast 4.5:1 on all text, including white on \`--ink-900\`.

## 20. Build order for Claude Code
1. Nav, section shells with anchors, dark and light backgrounds.
2. Hero with the browser mockup and the scripted conversation.
3. Problem, features, how it works with scroll reveals.
4. Live demo section wired to the hd-demo edge function (with its caps).
5. Comparison table, pricing with toggle and Checkout, FAQ with JSON-LD.
6. Final CTA, footer, SEO metadata, OG image, analytics events.
7. Install your own widget on the page, then screenshot at 390px and 1440px and fix anything that overflows.
`
