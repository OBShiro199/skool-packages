// Folio landing page PRD: every section top to bottom with copy, motion, SEO and events.

export const landingPrd = `# Folio: landing page PRD

Save this file as \`LANDING.md\` in your project root. In Claude Code, say:
"Build the landing page exactly as described in @LANDING.md, using the tokens in @DESIGN.md."

## 0. Page goal
- One job: get a founder, coach or agency owner to click **Start free trial**.
- Second job: let them try the core trick on the page. Paste a blog URL into the hero and see a real hook
  slide in their colours (rate limited demo, section 3.3).
- Audience reads on a laptop between meetings or on a phone in LinkedIn's in-app browser. Both matter.
- Route: \`/\` in the \`(marketing)\` route group. \`/pricing\` and \`/templates\` reuse nav and footer.

## 1. Global rules
### 1.1 Tokens
Use @DESIGN.md tokens. The landing page adds:
| Token | Value | Use |
|---|---|---|
| \`--hero-bg\` | radial-gradient(1200px 600px at 70% 10%, #EEE9FF 0%, #F8F7FC 60%) | Hero and final CTA |
| \`--chip\` | #EEE9FF | Eyebrow pills, small labels |
| \`--shadow-slide\` | 0 24px 60px rgba(45,30,120,0.16) | Floating slide mockups |
| \`--ink-soft\` | #3F3A5A | Body copy |

### 1.2 Type scale
| Style | Mobile | Desktop | Font / weight |
|---|---|---|---|
| Display (H1) | 42px / 1.05 | 68px / 1.02 | Bricolage Grotesque 700 |
| H2 | 32px / 1.12 | 46px / 1.08 | Bricolage Grotesque 700 |
| H3 | 21px / 1.3 | 24px / 1.3 | Inter 650 |
| Body | 17px / 1.6 | 18px / 1.6 | Inter 400 |
| Small | 14px / 1.5 | 14px / 1.5 | Inter 500 |

### 1.3 Layout
- Container 1180px max, side padding 16px mobile, 24px tablet, 32px desktop.
- Section padding 72px mobile, 120px desktop. Every section has \`scroll-margin-top: 84px\`.
- Alternate backgrounds: \`--bg\`, \`--surface\`. Hero and final CTA use \`--hero-bg\`.

### 1.4 Motion principles
- Easing \`cubic-bezier(0.22, 1, 0.36, 1)\`. Default reveal: opacity 0 to 1 and translateY 18px to 0, 560ms,
  when 20% in view, once. Stagger children 70ms, max 6 per group.
- Framer Motion (\`motion\` package), \`whileInView\`, \`viewport={{ once: true, amount: 0.2 }}\`.
- Only animate \`transform\` and \`opacity\`.
- \`prefers-reduced-motion: reduce\`: reveals become instant opacity changes, loops stop, auto-advancing slide
  decks stay on slide 1 with arrows, the demo video shows its poster with a play button.

### 1.5 Buttons
- Primary: \`--brand\` (#6D4AFF), white text, 52px tall mobile, 48px desktop, 12px radius, 600 weight.
- Secondary: white with 1.5px \`--line\` border, \`--ink\` text.
- Hover lifts 2px with \`--shadow-2\`, 160ms. Press scale 0.98.
- Every **Start free trial** goes to \`/signup\` and fires \`cta_click\` with \`location\`.

## 2. Sticky nav
- 64px tall. Background \`--bg\` at 85% with \`backdrop-filter: blur(12px)\`. Bottom border appears after 8px scroll.
- Left: logo (stacked cards mark in \`--brand\`) + "Folio".
- Centre (desktop): **How it works**, **Templates**, **Pricing**, **FAQ** (smooth scroll; Templates goes to \`/templates\`).
- Right: **Log in** text link, **Start free trial** primary.
- Mobile: logo, small **Start free trial** (40px), menu button opening a full-width Sheet with links and Log in.
- Motion: slides down on load 400ms. Hides on scroll down after 400px, shows on scroll up (240ms).

## 3. Hero
### 3.1 Copy
- Eyebrow pill: **For founders, coaches and agencies who post on LinkedIn**
- H1: **Your best ideas, as carousels, in your brand.**
- Subhead: **Paste a blog post, a YouTube video, a rough idea or a voice note. Folio writes the hook, the
  slides and the call to action, designs them in your colours and fonts, and schedules the PDF to LinkedIn.**
- Primary: **Start free trial**
- Secondary: **See it make one** (scrolls to the demo, section 6)
- Microcopy: **7 days free · First carousel in 5 minutes · From $39/month**

### 3.2 Product visual
- Desktop right column (45%), below the copy on mobile.
- A fanned stack of 5 slides (CSS, real template components rendered at 0.36 scale): hook "40% of your trials
  never see the product", bullets, stat "87%", step "03", CTA with headshot. Each slide rotated -8, -4, 0, 4, 8
  degrees with \`--shadow-slide\`.
- Floating chip 1 (top left): source chip "blog.yoursite.com/onboarding" with a link icon.
- Floating chip 2 (bottom right): calendar chip "Tue 08:30 · LinkedIn · Scheduled" in \`--info-soft\`.
- Floating chip 3 (desktop, right edge): "PDF ready · 9 slides" in \`--ok-soft\`.

### 3.3 Live hero demo (optional, ship after launch week)
- Under the buttons: input "Paste a blog URL to see your hook slide" with an arrow button.
- Calls \`/api/demo/hook\` (Next.js route): Cloudflare Turnstile token required, 3 demos per IP per day,
  Firecrawl scrape, \`claude-haiku-5-5\` writes only the hook, rendered client-side with the Violet preset.
  Cost about $0.005 per demo. Hard daily cap of 300 demos in total, then the input hides.
- Result replaces slide 1 in the stack with a flip animation and a chip "Want the other 8 slides? Start free".

### 3.4 Motion
- Copy staggers in at 70ms. The stack fans out from a single pile: each slide rotates from 0 to its angle and
  moves out, 700ms, 90ms apart, starting 200ms after load.
- Chips pop in (scale 0.92 to 1, fade) 120ms apart after the stack.
- Idle: the stack gently breathes (each slide translateY 3px over 6s, offset). Stops with reduced motion.

### 3.5 Responsive
- Mobile: copy, buttons, then the stack at 88% width with 3 slides only and chips 1 and 2.
- Tablet: stack centred at 60% width.
- Desktop: 55/45 split.

## 4. Logo strip (social proof slot)
- Heading (Small, \`--muted\`, centred): **Made for people who post every week**
- Until you have customers: 6 role badges with line icons: **SaaS founders · Business coaches · Career coaches ·
  Ghostwriters · Social media agencies · Consultants**.
- After 10 customers: swap to their names as greyscale text wordmarks, with permission.
- Motion: marquee at 30px/s on mobile (pauses on touch), static wrapped row on desktop with stagger.
  Reduced motion: wrapped row.

## 5. Problem
- H2: **Carousels work. Making them takes your whole morning.**
- Intro: **You already have the ideas: blog posts, videos, voice memos. Turning one into 9 good-looking slides
  means a blank Canva file, a lot of copy and paste, and a PDF export that breaks your fonts.**
- Three pain cards:
  1. **90 minutes per carousel.** Write the hook, cut the post into slides, fix the spacing, export, convert, upload.
  2. **Generic templates.** AI tools give you the same slides everyone else posts. Your brand disappears.
  3. **No idea what worked.** Posts go out from three different tools and nobody checks which ones performed.
- Stat box (\`--chip\`): **3 carousels a week at 90 minutes each is 19 hours a month.** Link: **Work out yours** (opens
  a small inline calculator: carousels per week x minutes each = hours per month, and the cost at your hourly rate).
- Motion: cards stagger. "19 hours" counts up from 0 over 900ms in view (reduced motion: static).

## 6. Product demo
- H2: **From link to scheduled post in under 3 minutes.**
- Subhead: **This is a real recording. No cuts except the waiting.**
- Video: 45 seconds, silent, 16:10 screen recording (Screen Studio): paste a blog URL, progress steps, editor opens,
  rewrite the hook with "Punchier", drag slide 5 to slide 2, export, schedule for Tuesday 08:30.
  MP4 H.264 under 4 MB plus WebM, \`autoplay muted loop playsinline\`, poster = the editor with the hook selected.
- Captions burned in: "Paste a link", "Slides written in your brand", "Rewrite any slide", "Drag to reorder",
  "Export PDF + PNGs", "Schedule to LinkedIn".
- Button below: **Start free trial**.
- Motion: plays only when 50% in view, pauses out of view. Reduced motion: poster and a play button.

## 7. Feature sections
Five alternating rows (visual left/right swaps on desktop, visual above copy on mobile). Each: eyebrow, H3,
body, 3 ticks.

### 7.1 Four ways in
- Eyebrow: **Any source**
- H3: **Blog post, YouTube video, idea or voice note.**
- Body: **Paste a link and Folio reads the article or pulls the video transcript. Got a thought on a walk?
  Record a voice note on your phone and turn it into slides when you get back.**
- Ticks: **Blog and article URLs** · **YouTube videos and Shorts** · **Voice notes up to 10 minutes**
- Visual: the 4 source tabs with the voice recorder active and a live waveform. Motion: waveform bars animate
  in a loop (static bars with reduced motion).

### 7.2 Your brand, every time
- Eyebrow: **Brand kit**
- H3: **Set your look once. Every slide follows it.**
- Body: **Logo, colours, fonts, headshot and handle. Folio checks your colours are readable and puts your face
  and handle on every slide so people know who made it.**
- Ticks: **12 fonts or your own** · **Contrast checked** · **Several brands for agencies**
- Visual: the same slide shown in 3 brand kits, cross-fading every 2.5s.

### 7.3 Slides that read well
- Eyebrow: **Writing**
- H3: **A hook that earns the swipe. A CTA that gets the comment.**
- Body: **Claude writes one hook slide, 6 to 9 body slides and a call to action, choosing a layout for each one:
  lists, steps, stats, quotes, before and after. Numbers and names come from your source, never made up.**
- Ticks: **8 layouts** · **Lengths checked for every slide** · **LinkedIn caption written too**
- Visual: the 8 layout mini diagrams in a grid, one highlighted at a time.

### 7.4 Edit like a designer, without being one
- Eyebrow: **Editor**
- H3: **Change anything. Ask AI to fix the rest.**
- Body: **Click any text to edit it. Ask for "punchier", "shorter" or "add an example" on one slide and undo if you
  prefer the old one. Drag slides into a new order.**
- Ticks: **AI rewrite per slide** · **Drag to reorder** · **Undo on everything**
- Visual: the editor rail with a slide being dragged and the AI popover open. Motion: the dragged slide moves
  from position 5 to 2 when in view, 900ms.

### 7.5 Export, schedule, learn
- Eyebrow: **Publish**
- H3: **PDF for LinkedIn, PNGs for Instagram, on your calendar.**
- Body: **Export a LinkedIn document PDF and Instagram-ready PNGs in one click. Schedule them to your profile,
  your company page or Instagram, and see impressions and reactions for every carousel in your library.**
- Ticks: **LinkedIn profile and page** · **Instagram carousels** · **Analytics per carousel (Pro)**
- Visual: a month calendar with chips, one turning green with "Published · 4,812 impressions" (sample data label
  "Example data" in Small under the visual).

## 8. How it works
- H2: **Three steps. Five minutes the first time, two after that.**
- Steps (row on desktop, vertical timeline on mobile with a 2px \`--line\` connector):
  1. **Set up your brand kit.** Logo, colours, fonts, headshot, handle.
  2. **Paste a source.** A blog URL, a YouTube link, an idea, or a voice note.
  3. **Edit, export, schedule.** Tweak any slide, download the PDF or schedule it to LinkedIn.
- Button: **Start free trial**
- Motion: the connector draws with scroll (scaleX desktop, scaleY mobile), numbers pop when reached.
  Reduced motion: drawn.

## 9. Comparison table
- H2: **The carousel tool that does the whole job.**
- Subhead: **Most tools design slides or schedule posts. Folio writes, designs, exports and schedules in one place.**
- Columns: **Folio**, **Taplio**, **Contentdrips**, **PostNitro**, **aiCarousels**, **Canva**.

| | Folio | Taplio | Contentdrips | PostNitro | aiCarousels | Canva |
|---|---|---|---|---|---|---|
| Blog URL to carousel | Yes | [verify] | Yes [verify] | Yes [verify] | Yes [verify] | No |
| YouTube video to carousel | Yes | [verify] | [verify] | [verify] | [verify] | No |
| Voice note to carousel | Yes | No [verify] | No [verify] | No [verify] | No [verify] | No |
| Brand kit on every slide | Yes | Limited [verify] | Yes | Yes | Yes | Yes |
| AI rewrite per slide | Yes | [verify] | [verify] | Yes [verify] | [verify] | Limited |
| Schedules to LinkedIn | Yes | Yes | [verify] | Yes [verify] | No [verify] | Yes [verify] |
| Instagram carousels | Yes | No [verify] | Yes [verify] | Yes [verify] | Yes [verify] | Yes |
| Analytics per carousel | Pro | Yes [verify] | No [verify] | [verify] | No [verify] | Limited |
| Starting price | $39/month | about $39 to $65 [verify] | about $15 [verify] | about $15 [verify] | [verify] | about $15 [verify] |

- Before publishing, check every [verify] cell on each competitor's live pricing and feature pages and add a
  footnote: **Prices and features checked [Month Year]. Tell us if something changed.**
- Never claim a competitor lacks a feature unless their site shows it. If unsure, write "Limited" or remove the row.
- Mobile: horizontal scroll, first column sticky, Folio column on \`--brand-soft\`, "Swipe to compare" hint
  fades after first scroll.
- Motion: Folio column header glows once in view (reduced motion: none).

## 10. Testimonials slot
- H2: **People who post more since Folio**
- 3 cards: photo (56px circle), quote, name, role, and a result line in bold (e.g. **From 1 to 3 carousels a week**).
- Hidden behind \`SHOW_TESTIMONIALS=false\` until you have real quotes. Never publish invented quotes.
  Ask your first 10 users: "What changed in your first two weeks with Folio?"
- Motion: stagger in. Mobile: swipeable with dots.

## 11. Pricing
- Anchor \`#pricing\`. H2: **Simple plans. Cancel any time.** Subhead: **Every plan starts with a 7-day free trial.**
- Toggle: **Monthly** / **Yearly · 2 months free**, default Monthly. Pill slides 220ms, prices cross-fade 180ms.

**Creator**
- **$39/month** or **$390/year**
- Line: **For one person posting a few times a week.**
- Includes: **15 carousels a month · 100 AI slide rewrites · 60 exports (PDF + PNGs) · 30 voice minutes ·
  1 brand kit · 1 connected account · Remove the Folio mark**
- Button: **Start free trial**

**Pro** (badge **Most popular**)
- **$79/month** or **$790/year**
- Line: **For creators who post every day and want to know what works.**
- Includes: **Everything in Creator · 50 carousels a month · 400 rewrites · 200 exports · 120 voice minutes ·
  3 brand kits · 3 connected accounts · 2 seats · Analytics per carousel · Upload your own fonts**
- Button: **Start free trial**

**Agency**
- **$249/month** or **$2,490/year**
- Line: **For agencies running carousels for clients.**
- Includes: **Everything in Pro · 150 carousels a month · 1,000 rewrites · 1,000 exports · 400 voice minutes ·
  10 brand kits · 10 connected accounts · 5 seats · All-brand calendar**
- Button: **Start free trial**

- Under the cards: **Trial includes 5 carousels so you can try every feature. Limits reset on the 1st of each month.
  You always see what you have left before you press a button.**
- Motion: cards rise with stagger. Pro sits 8px higher with \`--shadow-2\` on desktop.
- Yearly toggle uses the yearly Stripe price ids (\`STRIPE_PRICE_*_YEARLY\`).

## 12. FAQ
- Anchor \`#faq\`. H2: **Questions people ask before they start**. shadcn Accordion, one open at a time, first open.
1. **What sources can I use?**
   A blog or article URL, a YouTube video or Short, a typed idea, or a voice note up to 10 minutes.
2. **Will the slides look like my brand?**
   Yes. You set your logo, colours, fonts, headshot and handle once, and every slide uses them. Agencies can keep one brand kit per client.
3. **Who writes the slides?**
   Claude, Anthropic's AI model, writes a hook, 6 to 9 body slides and a call to action from your source, and a LinkedIn caption. You can edit every word.
4. **Does it make things up?**
   It is told to use only numbers, names and claims from your source. Always read your carousel before you post it, as you would with any writer.
5. **Can it post to LinkedIn for me?**
   Yes. Connect your LinkedIn profile or company page and schedule the PDF document post. You can also download the PDF and post it yourself.
6. **Does it work for Instagram?**
   Yes. Export PNG slides in 4:5 or square, or schedule them as an Instagram carousel on a professional account.
7. **What counts as a carousel, a rewrite and an export?**
   A carousel is one generation from a source. A rewrite is one AI change to one slide. An export is one render of the PNGs and the PDF. Exporting again with no changes is free.
8. **What happens when I hit my limit?**
   Buttons show what is left. At the limit you can still edit and download existing exports. Upgrade any time and the new limit applies straight away.
9. **Can my team use it?**
   Pro includes 2 seats and Agency 5. Team members can edit and schedule. Only the owner sees billing.
10. **What happens after the trial?**
    You choose a plan at checkout and are billed when the 7 days end. Cancel before then and you pay nothing. Your carousels stay saved either way.
11. **Can I cancel any time?**
    Yes, from Billing in two clicks. You keep access to the end of the period you paid for.
- Add FAQPage JSON-LD with these 11 questions.

## 13. Final CTA
- \`--hero-bg\`, centred.
- H2: **Your next 10 posts are already written. They are in your blog.**
- Subhead: **Turn one into a carousel in the next 5 minutes.**
- Primary: **Start free trial**. Microcopy: **7 days free · Cancel any time**
- Visual: a row of 3 small slides that slide in from the right, then the stack idles. Reduced motion: static.

## 14. Footer
- Columns (accordion groups on mobile):
  - **Product**: Features, Templates, Pricing, Changelog
  - **Use cases**: For founders, For coaches, For agencies, Blog to carousel, YouTube to carousel
  - **Resources**: Documentation, Free hook generator, Compare (Taplio, Contentdrips, PostNitro alternatives)
  - **Company**: About, Contact, Privacy, Terms
- Bottom row: logo, **© 2026 Folio**, **Made for people who post every week.**
- Use-case pages (\`/for/founders\`, \`/for/coaches\`, \`/for/agencies\`) reuse this page with a swapped H1, hero
  slides and FAQ. Build after launch.

## 15. SEO
- Title (max 60 chars): **Folio: LinkedIn and Instagram carousel generator**
- Meta description (max 155): **Turn blog posts, YouTube videos, ideas and voice notes into on-brand LinkedIn and Instagram carousels. Edit, export PDF and schedule. 7 days free.**
- Canonical \`https://getfolio.app/\` (swap for your domain). One H1. H2 per section.
- JSON-LD: \`SoftwareApplication\` (applicationCategory "BusinessApplication", offers for the 3 plans in USD) and \`FAQPage\`.
- Alt text example: "Five Folio carousel slides fanned out: hook, list, stat, step and call to action".
- \`sitemap.ts\`, \`robots.ts\`, \`/llms.txt\` listing product, pricing, templates and docs pages.

### 15.1 OG image
- 1200 x 630 via \`next/og\` at \`app/opengraph-image.tsx\` (this is Satori too, same rules as the slides).
- \`--hero-bg\` colours. Left: H1 **Your best ideas, as carousels, in your brand.** 60px Bricolage 700. Under it:
  **Blog · YouTube · Idea · Voice note → LinkedIn PDF** 26px \`--ink-soft\`.
- Right: 3 fanned slides. Bottom left: logo. Same image for Twitter \`summary_large_image\`.

## 16. Analytics events
| Event | When | Properties |
|---|---|---|
| \`page_view\` | Automatic | path, referrer, utm_source, utm_campaign |
| \`cta_click\` | Any Start free trial | location: nav, hero, demo, how_it_works, pricing_creator, pricing_pro, pricing_agency, final_cta |
| \`demo_video_play\` | Video starts in view | autoplay |
| \`hero_demo_submit\` | Hero URL demo used | ok, ms |
| \`calculator_used\` | Problem calculator changed | carousels_per_week |
| \`pricing_toggle\` | Toggle changed | interval |
| \`compare_scroll\` | Table scrolled on mobile | none |
| \`faq_open\` | Item opened | index |
| \`signup_complete\` | Server, after signup | plan_interest (cookie from last pricing click), ref |
- Weekly funnel: page_view → cta_click → signup_complete → checkout_started → trial started → export_done.
- Keep \`ref\` and UTM params in a cookie for 30 days, save to \`profiles.referred_by\` on signup.

## 17. Responsive checklist
- Test 360, 390, 768, 1024, 1440. No horizontal scroll except the comparison table.
- H1 fits in 4 lines at 360px. Buttons full width under 420px. Tap targets 44px.
- The hero stack never overlaps the copy; on phones it sits below.

## 18. Performance and accessibility
- Lighthouse mobile: Performance 90+, Accessibility 100, SEO 100.
- Hero slides are HTML, not images, so they paint instantly. Video loads lazily.
- Preload Bricolage 700 and Inter 400 only. JS on \`/\` under 130 KB gzipped.
- Contrast 4.5:1, focus rings visible, every animation respects reduced motion.

## 19. Build order for Claude Code
1. Section shells with anchors, sticky nav.
2. Hero with the fanned slide stack using the real template components.
3. Problem with calculator, demo video, features, how it works.
4. Comparison and pricing with toggle and Checkout wiring for 6 price ids.
5. FAQ with JSON-LD, final CTA, footer.
6. SEO metadata, OG image, analytics helper and events.
7. Screenshot at 390px and 1440px, fix overflow.

## 20. Copy rules for this page
- Speak to one person ("you"), name the source they already have (blog, video, voice note), and the outcome
  (a carousel in their brand on their calendar).
- Every number on the page must be true for the product today: limits, prices, trial length, slide counts.
- No invented customer counts, logos or quotes. The testimonials slot stays hidden until real ones exist.
- British spelling, US dollar prices. No em dashes.
- Keep every H2 under 10 words and every feature body under 45 words.

## 21. Hero demo route (\`/api/demo/hook\`)
- POST \`{ url, turnstileToken }\`. Verify Turnstile server side, then rate limit by IP (3 per day) and globally
  (300 per day) using a \`demo_requests\` table written with the secret key.
- Same URL checks as fol-ingest (https, public hostname). Firecrawl scrape with a 15 s timeout.
- \`claude-haiku-5-5\` with the hook-only schema \`{ kicker, headline, subline }\` and the same prompt-injection
  guard as PRD 11.1. Returns JSON, the browser renders it with the hook template and the Violet preset.
- On any failure show "Could not read that page. Start a free trial to try any source."
`
