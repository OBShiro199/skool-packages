// Outbounder landing page PRD (LANDING.md). Backticks are escaped.

export const landingPrd = `# Outbounder: Landing page PRD

Save this file as \`LANDING.md\` in your project root next to \`PRD.md\` and \`DESIGN.md\`. In Claude Code say: "Read @LANDING.md and @DESIGN.md. Build the landing page at \`app/(marketing)/page.tsx\` section by section. Show me a screenshot after each section at 1440px and 375px."

All tokens, fonts and components come from \`DESIGN.md\`. Every word of copy below is final unless marked [edit]. Prices of competitors are marked [verify]: check each vendor's pricing page the week you launch and update the "Prices checked" date.

## 0. Page goals

- Primary conversion: "Start 7-day free trial" (goes to \`/signup?plan=starter\` or \`/signup?plan=growth\`).
- Secondary conversion: "Try the free first-line generator" (\`/tools/first-line-generator\`), which captures an email after 3 uses.
- Visitor: a founder or agency owner who has tried cold email, knows the words "domain", "warm-up" and "sequence", and is tired of gluing 4 tools together.
- One promise, repeated: describe your buyer, get personalised emails going out from a safe domain this week.

## 1. Sticky nav

- Height 64px, \`--surface\` at 85% opacity with \`backdrop-blur-md\`, bottom border \`--border\` appears only after 8px of scroll.
- Left: logo glyph + wordmark "outbounder".
- Centre links: How it works, Features, Pricing, Free tool, Docs.
- Right: "Log in" (ghost), "Start free trial" (primary, small).
- Mobile (<768px): logo left, "Start free trial" small button and a menu icon right. Menu opens a full-height Sheet with the same links and a large primary button.
- Anchor links scroll smoothly with a 64px offset.

## 2. Hero

Layout: two columns on desktop (text 5/12, visual 7/12), stacked on mobile with the visual under the buttons. Background \`--background\` with a soft radial tint of \`--primary-soft\` behind the visual (no hard edges, no dark block).

- Eyebrow pill (\`--primary-soft\`, \`--primary\` text, 12px/500): "For founders and agencies who do their own outbound"
- H1 (Display 56/60, mobile 40/44): **Cold email that reads like you wrote it.**
- Subhead (Body large, \`--muted-foreground\`, max 520px): "Describe who you sell to. Outbounder finds verified leads, reads each company's website, writes a first line about something real, and sends from safe inboxes on your own outreach domain."
- Primary button (large): "Start 7-day free trial"
- Secondary button (large, secondary style): "Try the free first-line generator"
- Under the buttons, small muted line with three ticks: "7 days free" · "From $79/mo" · "Cancel in two clicks"

Hero visual: an animated product card (built in React, not a video) showing one lead row.
1. Row: avatar initials "SL", "Sarah Lee, Founder, Northpeak Studio", StatusPill "Finding".
2. Pill steps through Verifying, Reading northpeak.studio, Writing (each 700ms).
3. Row expands into an EmailPreview. The first line types in at 40ms per character with the violet AI mark: "Northpeak's case studies are all outdoor brands on Shopify, which is a sharp niche for a 12-person studio."
4. Pill turns "Ready" in \`--primary\`. Pause 3 seconds, then loop with a second lead ("Tom Reid, MD, Fieldwork Recruitment").
- Under the card, a tiny caption in muted 12px: "Real example format. Every first line cites the page it came from."

Utm banner: if the URL has \`utm_source=outbounder\`, show a dismissible \`--success-soft\` bar above the nav: "If one of our emails brought you here: yes, Outbounder wrote that first line. That is the product."

## 3. Logo strip

- Heading (Small, muted, centred): "Built on tools you already trust"
- Monochrome logos at 60% opacity, 28px tall, one row (wraps to two on mobile): Prospeo, MillionVerifier, Firecrawl, Claude, AgentMail, Stripe. Use each vendor's press kit SVG. [edit: swap for customer logos once you have 5]
- No animation beyond the section fade-in.

## 4. Problem

- H2: "Cold email works. The setup is the part that does not."
- Three cards in a row (stacked on mobile), each with a lucide icon in a \`--danger-soft\` circle:
  1. Icon \`Layers\`. Title "Four tools, one campaign". Text: "A lead database, a verifier, a sequencer and ChatGPT. $150 to $300 a month and an afternoon of copy and paste."
  2. Icon \`Clock\`. Title "3 to 5 minutes per first line". Text: "Real personalisation means opening every website. At 100 leads a week that is a full working day."
  3. Icon \`MailWarning\`. Title "One bad week burns a domain". Text: "Too many emails, too fast, from the wrong domain. Then even your invoices land in spam."
- Line under the cards (Body large, centred): "Outbounder does all four jobs, with the safety rules built in."

## 5. Product demo

- H2: "See a campaign go from buyer to inbox in 2 minutes"
- 16:9 video card (radius 16, border, shadow from DESIGN.md), poster image of the review queue. Plays inline with sound off and captions on. Length 1:50 to 2:10.
- Script beats [edit]: 0:00 type the ICP; 0:20 leads stream in; 0:40 open one lead, show the website quote and the first line; 1:00 approve 5 with the A key; 1:15 domain page with green DNS rows; 1:30 inbox with an "Interested" reply; 1:50 "Start your trial".
- Under the video: three small stats in a row (tabular numbers): "About 2 minutes to write 25 first lines" · "20 a day per new inbox" · "0 links in your first email".
- Event: \`landing_video_played\` with \`percent\` at 25, 50, 75, 100.

## 6. Feature sections

Alternating rows (text left / visual right, then swapped). Each visual is a real screenshot in a browser frame with a soft shadow. Max width 1200px.

### 6.1 Leads that match your buyer
- Kicker: "Find"
- H3: "Tell it who you sell to. Get verified people, not a spreadsheet."
- Text: "Pick job titles, countries, company size and industry. Outbounder searches millions of B2B profiles, reveals work emails, then checks every one a second time. Anything risky is dropped before it can bounce."
- Bullets: "Two-step email verification" · "Never the same person twice across campaigns" · "Import your own CSV too"
- Visual: leads table with JobProgress "Finding leads: 64 of 100".

### 6.2 A first line about something real
- Kicker: "Write"
- H3: "Every email starts with a fact from their own website."
- Text: "Outbounder reads each company's homepage and about page, then Claude writes a subject, a first line and a short email in your voice. You see the exact sentence it used, so you can trust it or change it."
- Bullets: "No spintax, no 'I saw that...'" · "Under 90 words, no links in email one" · "Regenerate with a hint in one key press"
- Visual: review queue with the "Why this line" panel open.

### 6.3 Nothing sends until you say so
- Kicker: "Review"
- H3: "Approve 25 emails in the time it takes to drink a coffee."
- Text: "A keyboard-first review queue. A to approve, E to edit, R to regenerate, X to reject. After you have checked 10 by hand, approve the rest above your confidence bar in one click."
- Visual: close-up of the footer KeyboardHint row and an email sliding left.

### 6.4 Safe sending, by default
- Kicker: "Send"
- H3: "Your main domain never sends a cold email."
- Text: "Outbounder sets up a separate outreach domain and inboxes for you, shows you every DNS record to paste into Porkbun, and starts each inbox at 20 emails a day. Sends go out in each lead's morning, in their time zone."
- Four fact chips in a 2x2 grid with icons: "Separate outreach domain" · "20 a day per inbox to start" · "Plain text, no tracking pixels" · "Unsubscribe link and header on every email"
- Background for this row: \`--primary-soft\` band, full width, 64px padding.
- Visual: domain page with DNS rows turning green.

### 6.5 Every reply in one place, already sorted
- Kicker: "Reply"
- H3: "Know who is interested before you finish your coffee."
- Text: "Replies from every inbox land in one view. Claude labels each one interested, not now, unsubscribe or out of office. Any reply stops the sequence. Interested ones also land in your email within minutes."
- Visual: unified inbox with ClassificationBadges.

### 6.6 Built to protect your sender reputation
- Kicker: "Guardrails"
- H3: "The rules good cold emailers follow, written into the code."
- Text as a 6-item checklist with tick icons: "Bounces and unsubscribes are suppressed across every campaign" · "Campaigns pause themselves if bounces pass 5%" · "Any spam complaint pauses that inbox for 48 hours" · "Caps ramp from 20 to 30 a day as an inbox earns trust" · "Sends only Monday to Thursday mornings unless you change it" · "Usage caps shown before you hit them, so no surprise bills"

### 6.7 Inbox capacity mini-calculator

An interactive strip under the feature rows that teaches the ramp and sells the plan size.

- H3: "How many emails can you safely send?"
- Inputs: inboxes (slider 1 to 6, default 3), send days per week (chips Mon to Sun, default Mon to Thu).
- Output (big tabular numbers, update live): "Weeks 1 to 2: 240 a week" · "Weeks 3 to 4: 300 a week" · "From week 5: up to 360 a week".
- Under it: "Starter's 3 inboxes cover about 1,000 emails a month once they have ramped. Growth's 6 cover 2,700."
- Link: "Open the full calculator" to \`/tools/inbox-calculator\`.
- Maths: \`inboxes x cap x days\`, cap 20 then 25 then 30, exactly the rule in PRD section 14.2, imported from \`lib/sending/rules.ts\` so the page and the product never disagree.
- Event: \`calculator_used\` with \`inboxes\`, \`days\`.

## 7. How it works

- H2: "Three steps. About 20 minutes the first time."
- Three numbered columns with a thin connecting line on desktop (vertical list on mobile):
  1. **Describe your buyer.** "Titles, countries, company size and your one-sentence offer. You see a real first line before you pay."
  2. **Connect a domain.** "Buy a lookalike domain on Porkbun, paste the records we show you, create 2 inboxes. Outbounder checks it for you."
  3. **Review and launch.** "Approve the emails you like. Outbounder sends them in each lead's morning and stops the moment anyone replies."
- Button under the steps: "Start 7-day free trial"

## 8. Comparison table

- H2: "What it replaces"
- Sub: "Prices checked [verify: date]. Outbounder includes leads, verification, AI writing and inboxes in one price."
- Table (horizontal scroll inside its own container on mobile, first column sticky):

| | Outbounder Starter | Instantly Growth | Smartlead Basic | Apollo Basic | lemlist |
| --- | --- | --- | --- | --- | --- |
| Price per month | $79 | $47 ($37.60 annual) [verify] | $39 [verify] | $49 to $69 per user [verify] | from about $69 per user [verify] |
| Leads included | 350 verified a month | Separate lead credits [verify] | No | Yes, credit based | Separate credits [verify] |
| Second email verification | Yes, every lead | Extra [verify] | Extra | Built in | Built in [verify] |
| First line from the lead's own website | Yes, with the source shown | AI writer, prompt based [verify] | AI add-ons [verify] | AI assistant [verify] | AI writer [verify] |
| Sending inboxes included | Yes, 3 on your own domain | Bring your own | Bring your own | Bring your own mailbox | Bring your own |
| Warm-up network | No: ramped caps instead | Yes | Yes | No | Yes [verify] |
| Unified inbox with AI labels | Yes | Yes | Yes | Partial [verify] | Yes [verify] |
| Setup time to first send | About 20 minutes | 1 to 3 hours | 1 to 3 hours | 1 hour | 1 to 2 hours |

- Under the table, small muted text: "Honest note: if you already have warmed inboxes and a lead list, Instantly or Smartlead will send more volume for less. Outbounder is for people who want the whole job done in one place."
- Each competitor name links to its \`/vs/\` page.

## 9. Testimonials slot

- H2: "From people sending with it"
- Grid of 3 cards (1 column on mobile). Each: quote (Body large), name, role, company, small avatar, and one number chip ("11 interested replies in week one").
- Until you have 3 real quotes, replace this section with a single card: "We sell Outbounder with Outbounder." Text: "Every trial so far started with a cold email written and sent by this tool. Want the numbers? See our public dashboard." Link to a simple \`/open\` page showing sends, reply rate and interested count from your own account. [edit]
- Never invent a quote.

## 10. Pricing

- H2: "Simple pricing. Leads included."
- Toggle: segmented control "Monthly | Annual", Annual shows a \`--success-soft\` pill "2 months free". Default Monthly. The toggle is keyboard reachable and announces the change with \`aria-live\`.

| | Starter | Growth (Most popular) |
| --- | --- | --- |
| Monthly | $79/mo | $179/mo |
| Annual | $790/yr (= $66/mo) | $1,790/yr (= $149/mo) |
| New verified leads a month | 350 | 900 |
| AI-written emails a month | 525 | 1,350 |
| Cold emails sent a month | 1,000 | 2,700 |
| Sending domains | 2 | 3 |
| Inboxes | 3 | 6 |
| Active campaigns | 3 | 10 |
| Unified inbox with AI labels | Yes | Yes |
| Analytics | Yes | Yes |

Card anatomy (both cards, top to bottom):
1. Plan name (H3) and a one-line who-it-is-for: Starter "For founders sending their own outbound." Growth "For agencies and teams running several offers."
2. Price: Display size number, "/mo" muted. Annual: "$790" with "/yr" and a muted line "= $66/mo, 2 months free".
3. A 4-row "what you get each month" block with icons: leads, AI emails, sends, inboxes.
4. Divider, then the shared list with ticks: verified emails, website-based first lines, unified inbox, AI reply labels, analytics, unsubscribe and suppression built in.
5. Button full width.
Growth card: 2px \`--primary\` border, "Most popular" pill on the top edge, 8px taller on desktop.

- Card buttons: "Start 7-day free trial" on both, linking with \`?plan=\` and \`?interval=\`.
- Under the cards: "Trial limits: 50 leads and 100 sends. Nothing is charged for 7 days. Domains are bought separately on Porkbun (about $11 a year each)."
- Events: \`pricing_toggle\` (\`interval\`), \`pricing_cta_clicked\` (\`plan\`, \`interval\`).

## 11. FAQ

Accordion, one open at a time, first one open. H2: "Questions people ask before they start".

1. **Do I need my own domain?**
   Yes, a separate one. Cold email should never come from the domain your website and invoices use. Buy a close variant like tryyourbrand.com on Porkbun for about $11 a year. Outbounder shows you every DNS record to add and checks them for you.
2. **Where do the leads come from?**
   From Prospeo's B2B database. Outbounder only keeps people with a verified work email, then checks each address again with MillionVerifier before it can be emailed.
3. **Will this land in spam?**
   Nothing can promise the inbox, but Outbounder does what good senders do: a separate authenticated domain, 20 emails a day per new inbox, plain text with no tracking, an unsubscribe link and header on every email, and automatic pauses when bounces or complaints appear.
4. **Can I edit every email?**
   Yes. Nothing sends until you approve it. You can edit, regenerate with a hint or reject any email.
5. **Does it write all three emails?**
   Claude writes the first email for each lead from their website. Follow-ups use your templates with the lead's details, so they stay short and consistent.
6. **Is there a warm-up network?**
   No. New inboxes start at 20 a day and ramp up as they stay healthy. Relevant emails that get replies build reputation better than fake warm-up traffic.
7. **What happens when someone replies?**
   The sequence stops for that person straight away. The reply is labelled and shows in your unified inbox. Interested replies also land in your own email within minutes.
8. **Can I bring my own leads?**
   Yes, upload a CSV. Imported leads count towards your monthly lead limit because they are verified, scraped and written the same way.
9. **What if I hit my limit?**
   You see your usage on every screen. At the limit, finding and sending pause until your next month, or you can upgrade to Growth in two clicks.
10. **Can I use it for my agency's clients?**
   Yes, one account per client brand works today. Team seats and client workspaces are on the roadmap.
11. **What happens after the trial?**
   Your card is charged for the plan you picked. Cancel in the billing page before day 7 and you pay nothing. Your data stays if you come back.
12. **Is cold email legal?**
   B2B cold email is allowed in most places when you identify yourself, include a real address and honour opt-outs. Outbounder adds all three to every email automatically.

## 12. Final CTA

- Full-width card, \`--primary-soft\` background, radius 24, 64px padding, centred.
- H2: "Your next 100 cold emails, written and sent this week."
- Sub: "Describe your buyer. See a real first line in 4 minutes. 7 days free."
- Buttons: "Start 7-day free trial" (primary large), "Try the free first-line generator" (ghost).

## 13. Footer

- Four columns on desktop, accordion on mobile: Product (Pricing, Free first-line generator, Inbox capacity calculator, Docs), Compare (vs Instantly, vs Smartlead, vs Apollo, vs lemlist), Company (About, Contact, Open numbers), Legal (Privacy, Terms, Acceptable use).
- Bottom row: "© 2026 Outbounder" left; right: "We sell Outbounder with Outbounder." in muted 12px.
- Background \`--surface-2\`, top border.

## 14. Motion

| Element | Motion | Duration and easing |
| --- | --- | --- |
| Section reveal | Fade in + translateY 16px to 0 when 20% in view (IntersectionObserver, once) | 400ms, \`cubic-bezier(0.2, 0.8, 0.2, 1)\` |
| Hero card | Status steps, first line types at 40ms per character, loop every 9 s | Steps 700ms each |
| Problem cards | Stagger 80ms between cards | 300ms |
| Feature screenshots | Slight scale 0.98 to 1 with the reveal | 500ms |
| DNS rows (6.4 visual) | Rows tick green one by one when in view | 150ms spring each, 250ms apart |
| Pricing toggle | Price numbers cross-fade, no layout shift (fixed width, tabular numbers) | 200ms |
| FAQ | Height auto animation | 200ms ease-out |
| Buttons | Hover darken 6%, press scale 0.98 | 120ms |

Reduced motion (\`prefers-reduced-motion: reduce\`): no translate or scale, opacity fades only (150ms), hero shows the finished email with no typing, DNS rows already green.

## 15. Responsive notes

- 1440: max content width 1200, hero two columns, features alternate.
- 1024: same with 32px gutters, comparison table fits without scrolling.
- 768: hero stacks, feature rows stack with the visual under the text, pricing cards side by side.
- 375 and 360: everything one column, comparison table scrolls horizontally inside its container with the first column sticky, sticky nav keeps "Start free trial" visible. Tap targets 44px. No horizontal page scroll at 360px.
- Images: \`next/image\` with \`sizes\`, AVIF/WebP, hero visual is code so it is sharp at every size.

## 15b. Mobile sticky CTA

- On screens under 768px, after the hero buttons scroll out of view, a bottom bar slides up (200ms): "7 days free" text left, "Start trial" primary button right, \`--surface\` background with a top border and safe-area padding.
- Hidden again when the pricing section or final CTA is in view, so there are never two identical buttons on screen.

## 15c. Accessibility

- Colour contrast AA for every text and button in both themes; check the muted text on \`--primary-soft\` bands.
- The hero animation has \`aria-hidden="true"\`; a visually hidden paragraph describes it: "Example: Outbounder finds Sarah Lee, reads her studio's website and writes a first line about their outdoor-brand case studies."
- Video has captions and a transcript link under it.
- The comparison table uses \`th scope\`, and the scroll container has \`tabindex="0"\` and a label so keyboard users can scroll it.
- FAQ uses the shadcn Accordion (buttons with \`aria-expanded\`).
- Focus ring 2px \`--ring\` with offset on every link and button. Skip link to main content.

## 16. SEO

- \`<title>\`: "Outbounder: cold email that reads like you wrote it"
- Meta description: "Find verified B2B leads, write a personalised first line from each company's website and send from safe inboxes on your own domain. 7-day free trial, from $79/mo."
- H1 used once. H2 per section as written above.
- Canonical \`https://yourdomain.com/\`. \`robots\`: index, follow. Sitemap includes \`/\`, \`/pricing\`, \`/tools/*\`, \`/vs/*\`, \`/docs/*\`.
- JSON-LD: \`SoftwareApplication\` with \`offers\` for Starter and Growth (monthly prices), and \`FAQPage\` for the 12 FAQs.
- Target keywords: "cold email software", "ai cold email personalisation", "cold email first line generator", "instantly alternative", "cold email tool with leads".

## 17. OG image

- 1200x630 PNG generated with \`next/og\` at \`app/opengraph-image.tsx\`.
- Background \`--background\` with the soft \`--primary-soft\` radial tint. Left: wordmark and the H1 on two lines (64px, Inter Tight 600). Right: a cropped EmailPreview card showing a first line with the violet AI mark.
- Bottom left in muted 24px: "Leads, first lines and safe sending. From $79/mo."
- Twitter card \`summary_large_image\` with the same image.

## 18. Analytics events

| Event | When | Properties |
| --- | --- | --- |
| \`landing_viewed\` | Page load | \`utm_source\`, \`utm_campaign\`, \`from_outbounder_email\` (bool) |
| \`hero_cta_clicked\` | Either hero button | \`button\` (trial, free_tool) |
| \`landing_video_played\` | 25, 50, 75, 100% | \`percent\` |
| \`compare_link_clicked\` | Competitor name in the table | \`competitor\` |
| \`pricing_toggle\` | Toggle change | \`interval\` |
| \`pricing_cta_clicked\` | Plan button | \`plan\`, \`interval\` |
| \`faq_opened\` | Accordion item opened | \`question_index\` |
| \`final_cta_clicked\` | Final card buttons | \`button\` |

Set up a PostHog funnel: \`landing_viewed -> pricing_cta_clicked or hero_cta_clicked -> signed_up -> trial_started\`. Break it down by \`from_outbounder_email\` to see how well your own cold email converts.

## 19a. Hero copy variants to test

Run one test at a time with PostHog feature flags, 50/50, until each variant has 300 visitors. Keep the winner on trial starts, not clicks.

| Variant | H1 | Subhead first sentence |
| --- | --- | --- |
| A (control) | Cold email that reads like you wrote it. | Describe who you sell to. |
| B | 100 personalised cold emails, written and sent this week. | Tell Outbounder who you sell to. |
| C | Stop gluing four cold email tools together. | Leads, verification, AI first lines and safe inboxes in one place. |

## 19b. Build order for Claude Code

Paste these one at a time, check the screenshot, then move on:

1. "Build the sticky nav and hero from @LANDING.md sections 1 and 2. The hero visual is a React component \`components/marketing/HeroLeadCard.tsx\` with the 4-step loop. Respect reduced motion."
2. "Build sections 3 to 5 (logo strip, problem, demo video card) with the reveal motion from section 14."
3. "Build the six feature rows from section 6 plus the mini-calculator in 6.7, importing the ramp from lib/sending/rules.ts."
4. "Build how it works, the comparison table and the testimonials slot (sections 7 to 9)."
5. "Build pricing with the monthly/annual toggle, the FAQ with JSON-LD, the final CTA and the footer (sections 10 to 13)."
6. "Add SEO meta, the OG image, the analytics events from section 18 and the mobile sticky CTA. Run Lighthouse and show me the scores."

## 19. Performance budget

- LCP under 2.0 s on 4G, CLS under 0.05, total JS under 170 KB gzipped on the landing route.
- Fonts: Inter and Inter Tight via \`next/font\` with \`display: swap\`, only the weights used.
- Video loads only when the section is near the viewport (\`preload="none"\` + poster).
- Lighthouse target: 95+ on Performance, Accessibility, Best Practices and SEO.
`
