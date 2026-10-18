// Dossier landing page PRD (LANDING.md).

export const landingPrd = `# Dossier: landing page PRD

Save this file as \`LANDING.md\` in your project root. In Claude Code, say:
"Build the landing page exactly as described in @LANDING.md, using @DESIGN_SYSTEM.md and the accent in @DESIGN.md."

## 0. Page goal

- One job: get a SaaS founder, sales engineer or security lead to click **Start free trial**.
- Secondary job: show a real buyer spreadsheet being answered with sources, in a 60 second demo.
- Audience: technical, sceptical of AI that makes things up, under deadline pressure from a deal. They will look
  for proof that answers are sourced and that their data is not used for training. Reads on a laptop.
- Route: \`/\` (marketing route group). \`/pricing\` reuses the pricing section full width. \`/security\` is linked
  from the nav and the footer.

## 1. Global rules

### 1.1 Base and tokens
The landing page uses \`@DESIGN_SYSTEM.md\` (Quiet Precision) and the Dossier accent from \`@DESIGN.md\`, with the
system's marketing rules: **square corners** (0 radius on boxes and frames; pills keep 4px), a 1180px rail with a
hairline left and right, more expressive type than the app. Buttons stay white with a firm ink edge; no filled or
black buttons, even here.

| Token | Value | Use |
|---|---|---|
| \`--hero-tint\` | #f6fbfb | Hero and final CTA band (the teal accent at about 3%) |
| \`--band\` | #fafafb | Alternate section background (system row hover) |
| \`--chip\` | #eef7f7 | Eyebrow pills (accent soft) with \`--accent-edge\` |
| \`--frame\` | 1px solid #e6e6e9 + system shadow-float | Product shots, pricing boxes |

No dark full-width blocks. Contrast comes from large Geist display type, ink, and the teal used sparingly.

### 1.2 Type scale
Geist only (400, 500, 600).

| Style | Mobile | Desktop | Weight | Tracking |
|---|---|---|---|---|
| Display (hero H1) | 40px / 1.04 | 64px / 1.02 | 500 | -0.045em |
| H2 | 32px / 1.1 | 48px / 1.06 | 500 | -0.04em |
| H3 | 20px / 26px | 24px / 32px | 500 | -0.025em |
| Body | 16px / 26px | 16px / 26px | 400 | -0.011em |
| Eyebrow | 13px / 18px pill, sentence case | same | 500 | -0.014em |

### 1.3 Layout
- 1180px rail with 1px hairlines left and right; side padding 16px mobile, 24px tablet, 32px desktop.
- Section padding 56px mobile, 80px desktop. Sections split by full-width hairlines.
- Section backgrounds alternate white and \`--band\`. Hero and final CTA use \`--hero-tint\`.
- Grid children get \`min-width: 0\` and the page clips sideways overflow.

### 1.4 Motion principles
- System curves: \`cubic-bezier(0.16, 1, 0.3, 1)\` for reveals, the morph curve for anything that changes size.
- Default scroll reveal: opacity 0 to 1 and translateY 12px to 0, 360ms, when 20% of the element is in view, once
  per session (IntersectionObserver).
- Stagger children 80ms, max 6 per group.
- \`prefers-reduced-motion: reduce\`: no translate, no auto-playing loops; fades 150ms only. The demo video shows its
  poster with a play button instead of autoplaying.

## 2. Sticky nav

- 64px high, white at 90% opacity with \`backdrop-filter: blur(10px)\`, hairline bottom border after 8px of scroll.
- Left: the folder mark + wordmark "Dossier".
- Centre (desktop): How it works, Features, Security, Pricing, Compare, FAQ (anchors, smooth scroll, offset 72px;
  Security goes to \`/security\`).
- Right: "Log in" (secondary), "Start free trial" (primary, firm ink edge).
- Mobile: logo + "Start free trial" (small) + menu button opening a sheet with the links.
- Motion: fades in 300ms on load. No reveal on scroll.

## 3. Hero

- Eyebrow chip: "For B2B SaaS teams selling to enterprise"
- H1: "Security questionnaires, answered from your own documents."
- Subhead: "Drop in the buyer's spreadsheet. Dossier drafts every answer from your policies, SOC 2 report and past
  questionnaires, shows the exact passage behind each one, and flags what needs a human. Export the same file back,
  filled in."
- Primary button: "Start free trial" (goes to \`/signup\`)
- Secondary button: "Watch the 60 second demo" (scrolls to section 6 and plays the video)
- Trust line: "7 days free. Your documents are never used to train AI models."
- **Visual (right on desktop, under the copy on mobile):** a layered product shot:
  1. Back layer: the review workspace on "Acme Corp vendor review", question 4.1 "Is customer data encrypted at
     rest?" with an answer, two citation chips and a High 92 badge.
  2. Front left card: an EvidenceCard, "Information Security Policy, p. 7", the quoted line highlighted in teal.
  3. Front right card: RunProgress "Drafting 312 of 388" with a live dot.
  All three in square frames with \`--frame\`.
- Motion: copy reveals with stagger (eyebrow, H1, subhead, buttons, trust line). Product layers rise from 24px at
  0ms, 140ms and 280ms. The RunProgress bar fills from 60% to 80% once (1.6s, morph curve). The quote highlight
  sweeps left to right once (600ms). Reduced motion: final state, no sweep.

## 4. Logo strip

- Line above: "Built for the people who fill in the spreadsheet"
- Six role badges instead of fake customer logos (until you have real ones): Founders, Sales engineers, Solutions
  consultants, Security leads, Compliance managers, RevOps. Muted ink at 60% opacity, full on hover.
- Replace with real customer logos once you have 6 with permission.
- Motion: fade in as one group, 400ms.

## 5. Problem

- Eyebrow: "The deal is waiting on a spreadsheet"
- H2: "Procurement sent 400 questions. The deal is stuck until you answer them."
- Three columns (stacked on mobile), each with a small teal line icon (Lucide, 1.5 stroke):
  1. **"Who answered this last time?"** "Ctrl+F through last quarter's questionnaire, copy one cell at a time, and
     hope the backup policy has not changed since."
  2. **"ChatGPT said yes."** "Confident answers with no source. Nobody can tell which ones were checked, and one
     wrong yes can come back in a contract."
  3. **"The CTO has 40 of these."** "Your most expensive people spend a day a week on homework instead of the
     product."
- Closing line, centred, Geist 500 24px: "A 250-question questionnaire takes 10 to 20 hours. It should take one."
- Motion: columns stagger 80ms.

## 6. Product demo

- Eyebrow: "See it work"
- H2: "388 questions in. A filled spreadsheet out."
- A 16:9 video frame (square, \`--frame\`) with a poster and a large white play button with a firm edge. Video: 60
  seconds, Screen Studio recording, captions burned in: upload an XLSX, confirm the columns, Draft all, open a
  low-confidence answer, read the passage, redraft "say yes and mention SSO", approve and save to library, export,
  open the file in Excel with answers in place.
- Under the video, three timestamp chips that seek: "0:06 Check the columns", "0:24 Read the source", "0:48 Export
  the same file".
- Host the MP4 on Vercel Blob or Supabase public storage, \`preload="none"\`, \`playsinline\`, muted autoplay only when
  in view and reduced motion is off.

## 7. Feature sections

Alternate image left and right on desktop. Each: eyebrow, heading (H2 tag, 36px), body, 3 bullets, a visual.

### 7.1 Answers with receipts
- Eyebrow: "Sourced answers"
- Heading: "Every answer shows the paragraph it came from."
- Body: "Dossier searches your own documents, picks the passages that answer the question, and drafts from those
  alone. Click a citation to see the exact line, the page and the document date."
- Bullets: "Citations to document, page and quote" · "Quotes checked against the source, word for word" · "No
  source found? It says so, instead of guessing"
- Visual: the editor with two citation chips and the EvidenceCard open with the quote highlighted.
- Motion: the chip and the card connect with a 1px teal line that draws in 500ms.

### 7.2 Confidence you can sort by
- Eyebrow: "Know what to check"
- Heading: "Review the 40 that need you, not all 400."
- Body: "Every answer gets a confidence score from how well the evidence matches and how sure the model was.
  Anything below your threshold is marked Needs review, with the reason."
- Bullets: "High, Medium, Low bands you can filter" · "Flags for no source, stale source and conflicting
  documents" · "Set your own threshold per workspace"
- Visual: the question list filtered to Needs review, Low badges and flag chips.

### 7.3 A library that gets better every time
- Eyebrow: "Answer library"
- Heading: "Approve once. Reuse it in every questionnaire after."
- Body: "Approved answers go into your library with an owner and a review date. Next time the same question
  appears, worded differently or not, Dossier reuses the approved answer and says so."
- Bullets: "Exact and meaning-based matching" · "An owner and a review date on every answer" · "Stale answers are
  flagged, never reused blindly"
- Visual: the library table with owners and review dates, one row in warning ink "Review date passed".

### 7.4 Your file, filled in
- Eyebrow: "Export"
- Heading: "Send back the buyer's own spreadsheet."
- Body: "Dossier writes answers into the original cells and leaves everything else alone: sheets, colours,
  dropdowns, formulas. DOCX questionnaires get answers in place. PDFs with form fields come back filled."
- Bullets: "XLSX and DOCX round trip" · "PDF forms filled, plus a clean answers file" · "Only approved answers, if
  you want"
- Visual: an Excel window with the answer column filled, a small "Exported" toast.

### 7.5 Work it as a team
- Eyebrow: "Review workflow"
- Heading: "Assign the hard ones to the person who knows."
- Body: "Assign questions or whole sections with a due date. Comment, mention, approve. Everyone gets one email with
  what is theirs, and every change is in the audit log."
- Bullets: "Roles: admin, reviewer, contributor, viewer" · "Assigned to me inbox" · "Audit log of every edit,
  approval and export"
- Visual: the AssigneePicker open over a question, a comment with an @mention.

### 7.6 Your data stays yours
- Eyebrow: "Data handling"
- Heading: "Your documents are never used to train AI models."
- Body: "Each workspace is isolated at the database level. Files sit in private storage. Drafting runs on
  Anthropic's API, which does not train on API data by default, and every vendor we use is listed on our security
  page."
- Bullets: "Row-level isolation per workspace" · "Private, encrypted storage" · "Audit log you cannot edit"
- Visual: a clean card listing the subprocessors with a ShieldCheck icon.

## 8. How it works

- Eyebrow: "How it works"
- H2: "Three steps, about an hour."
- Steps in a row (stacked on mobile), each a numbered square with a hairline:
  1. **Add your sources.** "Policies, SOC 2 summary, past questionnaires, product docs. Ten minutes, once."
  2. **Drop in the questionnaire.** "XLSX, DOCX, PDF or pasted text. Check the columns, click Draft all."
  3. **Review and export.** "Fix the flagged ones, approve, and download the same file with every answer filled."
- Motion: a hairline connector draws between the steps (600ms, morph curve) when the section enters.

## 9. Comparison table

- Eyebrow: "Compare"
- H2: "Enterprise answer quality without the enterprise contract."
- Table (first column sticky on mobile, horizontal scroll inside the frame):

| | Dossier | Loopio | Responsive | Conveyor | Vanta (questionnaire add-on) | Spreadsheet + ChatGPT |
|---|---|---|---|---|---|---|
| Price | From $249/month | About $20,000+/year [verify] | About $10,000+/year [verify] | Business about $9,600/year [verify] | Add-on about $10,000 to $25,000/year [verify] | $20/month a seat |
| Self-serve trial | 7 days | Demo first | Demo first | Free tier [verify] | Sales-led | n/a |
| Answers cite your documents | Yes, with quote and page | Library-based | Library-based | Yes | Yes [verify] | No |
| Confidence per answer | Yes, with reasons | [verify] | [verify] | Yes [verify] | [verify] | No |
| Fills the original XLSX | Yes, cells only | Yes | Yes | Yes | Yes [verify] | By hand |
| Answer owners and review dates | Yes | Yes | Yes | [verify] | [verify] | No |
| Needs a compliance platform | No | No | No | No | Yes (Vanta) | No |
| Data used for training | Never | [verify] | [verify] | [verify] | [verify] | Depends on plan |

- Footnote: "Competitor prices from public reviews and comparison pages, checked Oct 2026. They change, so we link
  each one." Each competitor name links to its own pricing or product page.
- Motion: rows reveal with a 40ms stagger; the Dossier column has an \`--accent-soft\` fill and \`--accent-edge\` sides.

## 10. Testimonials slot

- Eyebrow: "From early teams"
- H2: "What changes when the spreadsheet stops being the bottleneck."
- Three square cards: quote (16/26), name, role, company, a small metric line ("CAIQ in 2 hours, was 2 days").
- Until you have real quotes, hide this section (feature flag \`SHOW_TESTIMONIALS\`). Never invent quotes.

## 11. Pricing

- Eyebrow: "Pricing"
- H2: "Priced per question answered, not per seat."
- Toggle: Monthly / Annual ("2 months free"). The toggle swaps the numbers in place; cards never move or resize
  (fixed price width, tabular figures).

| | Team | Business | Scale |
|---|---|---|---|
| Monthly | $249 | $599 | $1,299 |
| Annual | $2,490 ($207.50/mo) | $5,990 ($499.17/mo) | $12,990 ($1,082.50/mo) |
| Questions answered a month | 1,000 | 4,000 | 10,000 |
| Seats | 5 | 15 | 40 |
| Source documents | 300 | 1,500 | 5,000 |
| Parsed pages a month | 3,000 | 10,000 | 30,000 |
| Answer library | Unlimited | Unlimited | Unlimited |
| XLSX, DOCX, PDF and CSV export | Yes | Yes | Yes |
| Auto-assign by section, two-step approval | | Yes | Yes |
| Audit log | 90 days | 1 year, CSV export | 3 years, CSV export |

- Card copy: Team "For your first enterprise deals. About 4 questionnaires a month." Business "For teams answering
  every week. About 15 questionnaires a month." Scale "For sales and security teams at volume. About 40 a month."
- Business card is marked "Most teams pick this" with \`--accent-edge\` and an eyebrow pill.
- Buttons: "Start free trial" on each (\`/signup?plan=team&interval=month\` etc.).
- Line under the cards: "7 day free trial with 150 questions. Every draft and redraft counts as one question.
  Answers you reuse by hand from the library are free."
- Motion: cards rise with an 80ms stagger. Toggle crossfades numbers in 160ms.

## 12. FAQ

Accordion, one open at a time, 200ms height morph. FAQPage JSON-LD.

1. **Is my data used to train AI models?** No. Drafting uses Anthropic's commercial API, which does not train on
   API data by default. Search uses Voyage AI with training opt-out on. Our security page lists every vendor.
2. **What file types can I upload?** Questionnaires as XLSX, DOCX, PDF or pasted text. Sources as PDF, DOCX, XLSX,
   Markdown or text, up to 50 MB each.
3. **Will it break my buyer's spreadsheet?** No. Dossier writes only into the answer cells you confirm and leaves
   every other cell, sheet, colour, dropdown and formula alone.
4. **What happens when Dossier does not know?** It says so. Answers with no supporting passage are flagged "No
   source", scored low and never marked ready on their own.
5. **How is confidence worked out?** From how closely the cited passages match the question and how sure the
   model was, with caps for missing, stale or conflicting sources. You set the threshold.
6. **What counts as a question?** Every draft or redraft of one question. A 250-question questionnaire drafted once
   uses 250. Editing and approving are free.
7. **What if we run out of questions mid-month?** Drafting pauses and everything else keeps working. You can draft
   part of a questionnaire or upgrade for the rest of the month.
8. **Can my team work on one questionnaire together?** Yes. Assign questions or sections, comment with @mentions,
   and approve. Roles control who can approve and export.
9. **Do you support SOC 2, ISO 27001, CAIQ and SIG questionnaires?** Yes. They are spreadsheets or documents like
   any other. Dossier answers from whatever evidence you upload.
10. **Can I import our past answers?** Yes. Upload a completed questionnaire as a source and approve its answers
    into the library in bulk.
11. **Is there a contract?** No. Monthly or annual, cancel from the billing page.
12. **Do you fill buyer portals like OneTrust or Whistic?** Not yet. Export to XLSX or CSV and import it there.

## 13. Final CTA

- \`--hero-tint\` band.
- H2: "Answer the next questionnaire in an afternoon."
- Sub: "Add your sources once. Every questionnaire after that starts mostly done."
- Primary "Start free trial", secondary "Read our security page".
- Motion: fade and rise once.

## 14. Footer

- Four columns: Product (Features, Pricing, Compare, Changelog), Security (Security page, Subprocessors, Data
  handling), Resources (Documentation, Questionnaire glossary, Blog), Company (Contact, Privacy, Terms).
- Bottom line: "© 2026 Dossier" and the no-training sentence.

## 15. Responsive notes

- Hero visual stacks under the copy below 960px; the front cards shrink to 80% and overlap less.
- Feature sections stack image above text below 960px.
- Comparison table scrolls sideways inside its frame with the first column sticky; the page never scrolls sideways.
- Pricing cards stack below 900px, Business first.
- Check 320, 375, 430, 768, 1024, 1280 and 1440px.

## 16. SEO

- Title: "Dossier: security questionnaires answered from your own documents"
- Meta description: "Upload a security questionnaire or RFP. Dossier drafts every answer from your policies and
  SOC 2 report with citations and confidence scores, then exports the original file filled in."
- H1 once per page. Canonical \`https://dossier.app/\`.
- JSON-LD: SoftwareApplication (name, applicationCategory BusinessApplication, offers for the three plans) and
  FAQPage.
- Pages for search later: \`/compare/loopio\`, \`/compare/conveyor\`, \`/compare/responsive\`, \`/guides/caiq\`,
  \`/guides/sig-lite\`.

## 17. OG image

- 1200x630, white with a 1px hairline frame, the folder mark top left, H1 text at 56px in ink, and a cropped
  review workspace shot bottom right with one teal citation chip. Built with \`next/og\`.

## 18. Performance

- LCP under 2.0s on mobile, CLS under 0.05. Hero images as AVIF with explicit width and height.
- Video \`preload="none"\`. Fonts: Geist via \`next/font\` with \`display: swap\`.

## 19. Analytics events (PostHog)

| Event | When | Properties |
|---|---|---|
| \`lp_viewed\` | Page load | referrer, utm_* |
| \`lp_cta_clicked\` | Any Start free trial | location (nav, hero, pricing_team, pricing_business, pricing_scale, final) |
| \`lp_demo_played\` | Video play | seconds_watched on pause |
| \`lp_pricing_toggled\` | Toggle | interval |
| \`lp_compare_viewed\` | Comparison in view 50% | |
| \`lp_faq_opened\` | Accordion open | question index |
| \`lp_security_clicked\` | Any security link | location |

## 20. The /security page

Buyers check this page before they trust a security tool with their policies. It uses the same rail, type and
square frames as the landing page, with no animation beyond the default reveal.

- H1: "How Dossier handles your data"
- Intro (2 lines): "Dossier holds some of your most sensitive documents. This page says exactly where they live, who
  can see them and what is never done with them."
- **Section: Never used for training.** The data handling statement from PRD 12.2, word for word, in a framed box
  with a ShieldCheck icon.
- **Section: Isolation.** "Every workspace is separated at the database level with row-level security. Search runs
  inside one workspace only. Files sit in private storage under your workspace's folder."
- **Section: Encryption.** "Encrypted in transit (TLS) and at rest by our database and storage provider."
- **Section: Access and audit.** Roles (admin, reviewer, contributor, viewer), an append-only audit log, and
  "Delete a document, a questionnaire or your whole workspace at any time."
- **Section: Subprocessors.** Table: Vendor, Purpose, Data sent, Location [verify each region], Link. Rows:
  Supabase, Vercel, Anthropic, Voyage AI, LlamaIndex, Resend, Stripe, PostHog. "Data sent" for PostHog reads
  "Product events only, never document or answer text".
- **Section: Contact.** "Security questions or a questionnaire for us? security@dossier.app". Offer: "We will fill
  in your vendor questionnaire with Dossier, from our own policies."
- Footer line: "Last updated <date>." Update it every time a vendor changes.
- SEO: title "Security and data handling | Dossier", meta description "How Dossier stores, isolates and protects
  your documents. Never used to train AI models."

## 21. Mobile sticky CTA

- Below 768px, after the hero scrolls out of view, a 56px white bar with a top hairline slides up from the bottom
  (200ms, out curve): "7 days free" on the left, "Start free trial" (primary) on the right.
- It hides again when the final CTA section is in view, so two CTAs never show at once.
- Reserve its height with bottom padding on the footer so it never covers the last link.
- Reduced motion: it appears without sliding.
`
