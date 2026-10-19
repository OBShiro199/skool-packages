# PRD: Waitlist page for buildsoftwaresolo.com

**Product:** Build a Profitable $10K p/m App (Skool community)
**Page:** one-page waitlist at `https://buildsoftwaresolo.com`
**Owner:** Olly
**Status:** Ready to build · v1.1 · 19 Oct 2026
**Doors open:** date not announced yet. The page never mentions a date until Olly sets one in config.
**Skool:** https://www.skool.com/build-profitable-software
**Design system:** Quiet Precision v1.0 (attached separately, referred to below as "QP")
**Layout reference:** the Rosewell Archive page (archive.rosewell.dev). Same section rhythm, new name, new offer, QP styling.

> Anything marked **[confirm]** is copy or a decision I could not lock from the brief. Build it as written; Olly changes the text before go-live. Every one of them is listed again in section 13.

---

## 1. Summary

A single, fast, static page that explains the community and collects email addresses before the founding launch. It replaces the "Rosewell Archive" concept: the name "Rosewell" does not appear anywhere on the page, in metadata or in emails.

Visitors arrive mostly from YouTube video descriptions and pinned comments. They should understand the offer in one screen, see proof, see exactly what is inside (including the 40-lesson curriculum), and join with one field.

The page has three phases, set by one value in `content/offer.ts` (not by the clock, because the launch date isn't fixed yet), so the same URL works before, during and after launch:

| Phase | When | Primary action |
| --- | --- | --- |
| `waitlist` | now, until Olly opens the doors | Join the waitlist (email) |
| `open` | the 7-day founding window, or until 100 members join | Join now at $397/year (link to Skool) |
| `closed` | after the founding window | Join at $97/month or $776/year (link to Skool) |

v1 must ship `waitlist`. `open` and `closed` are P1 but cheap: copy and button targets swap from one config file. Switching phase is a one-line change and a redeploy (or an env var, `SITE_PHASE`, so it can be flipped from the Vercel dashboard).

## 2. Goals, non-goals, success metrics

### Goals

1. Collect as many qualified waitlist emails as possible before doors open.
2. Make the founding offer ($397/year, first 100, 7 days) unmistakable.
3. Tag every signup with where it came from (which video, which form on the page).
4. Feel like a calm, expensive product page: QP surfaces, no hype styling, nothing shifts while you use it.

### Non-goals (v1)

- Payments on this site. Checkout happens on Skool.
- Accounts, logins or a member area.
- A blog, CMS or multiple pages beyond `/privacy` and `/terms`.
- Sending the launch emails. The page only puts contacts into the audience they are sent from.

### Success metrics

| Metric | Target | How measured |
| --- | --- | --- |
| Visitor to signup conversion | ≥ 25% from YouTube traffic | analytics `waitlist_success` ÷ unique visitors |
| Waitlist size by doors open | 1,000+ (≈10 waitlisters per founding seat) [confirm target] | Supabase row count |
| Form error rate | < 1% of submits | `waitlist_error` events |
| Core Web Vitals (mobile) | LCP < 2.0s, CLS < 0.02, INP < 200ms | Vercel Speed Insights |
| Lighthouse (mobile) | ≥ 95 performance, 100 accessibility | CI or manual run |

## 3. The offer (single source of truth)

Every number on the page comes from one typed config file (`content/offer.ts`). Never hard-code a price or date in a component.

| Field | Value |
| --- | --- |
| Product name | Build a Profitable $10K p/m App |
| Host | Olly [confirm surname or first name only] |
| Platform | Skool (private community) |
| Doors open | not announced. `doorsOpenAt: null`; while null, no date or countdown appears anywhere. |
| Founding window | 7 days from doors open, or until 100 members join, whichever comes first |
| Join link | `https://www.skool.com/build-profitable-software` (`SKOOL_JOIN_URL`) |
| Founding price | $397/year, first 100 members only |
| Normal price (after launch) | $97/month or $776/year |
| Founding saving vs annual | $379 (49%) · works out at about $33/month |
| Founding price kept while you stay a member | yes, locked for as long as you stay |
| Guarantee | 30-day money-back |
| Credibility line | Built and sold 5 software products, 500+ paying clients across them |

### What founding members get

1. **Watch me build a SaaS to $10K/month**: every cold email, call, sales call, ad and churn save, as it happens. Private.
2. **Daily live calls**, Monday to Friday at 5pm UK, 1 hour each. Group Q&A.
3. **Unlimited Q&A**: every post answered within 24 hours [confirm whether weekends count].
4. **Private DM support** with Olly for your first 30 days (founding members only).
5. **40-lesson course**, from idea to first customers to exit (5 weeks × 8 lessons).
6. **10M+ verified B2B leads**, ready for outreach.
7. **20 profitable apps ready to clone**, each with a launch template.
8. **7 deep-dive tool guides**: Claude Code, Stripe, Supabase, Vercel, Trigger.dev, Resend, your own data API.
9. **Founding-only bonuses**: Olly's real codebases, Claude skills and script packs.

Lead exports: up to 5,000 verified records a month.

Tagline under every form: **No coding experience needed. If you can describe it, Claude can build it.**

### Curriculum (rendered in section 6.8)

| Week | Name | Outcome | Lessons |
| --- | --- | --- | --- |
| 1 | Foundations | A validated idea worth building | 1.1 Welcome · 1.2 Founder Mindset · 1.3 SaaS Money Maths · 1.4 Business Models · 1.5 Finding Ideas · 1.6 Validation · 1.7 Pre-Selling · 1.8 Pick Your Idea |
| 2 | Build | A live, secure product that takes payments | 2.1 AI Build Setup · 2.2 Plan Before Prompting · 2.3 Core Feature · 2.4 Auth, Data & Payments · 2.5 Expensive Design · 2.6 Landing Page · 2.7 Security Basics · 2.8 Deploy & Launch |
| 3 | First Customers | Your first 10 paying customers | 3.1 Ideal Customer · 3.2 Lead Lists · 3.3 Cold Email Setup · 3.4 Cold Email Scripts · 3.5 Social Outreach · 3.6 Cold Calling · 3.7 Demos & Closing · 3.8 First 10 Playbook |
| 4 | Growth | Repeatable acquisition beyond manual outreach | 4.1 Pricing · 4.2 Trials & Freemium · 4.3 Content Engine · 4.4 Reel Farms · 4.5 Paid Ads · 4.6 SEO · 4.7 Referrals & Affiliates · 4.8 Metrics & Funnels |
| 5 | Retain & Scale | Keep customers, grow revenue, build an asset | 5.1 Onboarding · 5.2 Customer Support · 5.3 Beating Churn · 5.4 Expansion Revenue · 5.5 Product-Market Fit · 5.6 Solo Founder Finances · 5.7 Automate & Hire · 5.8 Exit Your SaaS |
| Guides | The stack in depth | | G1 Claude Code in Depth · G2 Stripe for Payments · G3 Supabase for the Backend · G4 Running Your SaaS on Vercel · G5 Background Jobs with Trigger.dev · G6 Resend for Emails · G7 Build Your Own Data API |

Lesson titles are product names and stay in title case as written. All other UI copy is sentence case (QP §09).

## 4. Audience

- **Primary:** Olly's YouTube viewers who want a software income and have not shipped yet, or have shipped and have no paying customers.
- **Secondary:** solo founders with a live product under $10K/month who want the outbound and growth playbook.
- **Their objections:** "I can't code", "is this another course I won't finish", "will I actually get help", "are the leads real", "can I get out if it's not for me". Each one is answered on the page (no-code tagline, live build + daily calls, 24-hour Q&A, sample records, guarantee and cancel).

Copy voice: UK English, plain, first person from Olly, no hype words ("insane", "secret", "crushing it"), numbers over adjectives.

## 5. Tech and architecture

Build it as its own repo and Vercel project (suggested name `buildsoftwaresolo-web`), not inside this repo. It uses the same stack the course teaches, so the page doubles as proof.

| Concern | Choice |
| --- | --- |
| Framework | Next.js, App Router, latest stable, TypeScript strict |
| Styling | Tailwind CSS v4 with QP tokens declared in `@theme` (see §7.1). No other UI kit. |
| Font | Geist via the `geist` package (`next/font`), weights 400, 500, 600 only |
| Icons | Lucide, 16px, 1.5 stroke (content icons only; QP §07) |
| Rendering | Fully static (`export const dynamic = 'force-static'`), revalidated hourly so the phase switch happens without a deploy. The form posts to a server action. |
| Database | Supabase Postgres, table `waitlist_signups` (§5.2). RLS on, no public policies; only the server writes with the service role key. |
| Email | Resend: confirmation email on signup, and contact added to a Resend Audience used for the launch broadcasts |
| Analytics | Vercel Web Analytics + Speed Insights (cookieless, so no cookie banner) |
| Hosting | Vercel. Apex `buildsoftwaresolo.com` is canonical; `www` 308-redirects to apex. |
| OG image | Generated with `next/og` at build time (§10) |

### 5.1 File layout

```
app/
  layout.tsx            fonts, metadata, analytics
  page.tsx              the one page, composed of section components
  privacy/page.tsx
  terms/page.tsx
  opengraph-image.tsx
  actions/join.ts       server action: validate, rate limit, insert, email
components/
  sections/*.tsx        one file per section in §6
  ui/                   Button, Input, Tag, WaitlistForm, Accordion, Carousel, Countdown, DotArt
content/
  offer.ts              prices, dates, phase logic (§3)
  curriculum.ts         weeks, lessons, guides
  reviews.ts            the 15 comments (§6.10)
  faq.ts
lib/
  phase.ts              getPhase(now) -> 'waitlist' | 'open' | 'closed'
  supabase-admin.ts
  resend.ts
emails/
  Confirmation.tsx      React Email template
```

### 5.2 Data model

```sql
create extension if not exists citext;

create table public.waitlist_signups (
  id            uuid primary key default gen_random_uuid(),
  email         citext not null unique,
  first_name    text,
  stage         text check (stage in ('idea', 'building', 'launched')),
  form_location text not null,            -- hero | inside | reviews | pricing | still_deciding | final | mobile_bar
  ref           text,                     -- ?ref= value, e.g. a video slug
  utm_source    text,
  utm_medium    text,
  utm_campaign  text,
  utm_content   text,
  utm_term      text,
  referrer      text,
  country       text,                     -- from the x-vercel-ip-country header
  ip_hash       text not null,            -- sha256(ip + IP_HASH_SALT), never the raw IP
  user_agent    text,
  confirmation_sent_at timestamptz,
  created_at    timestamptz not null default now()
);

create index on public.waitlist_signups (created_at);
create index on public.waitlist_signups (ip_hash, created_at);

alter table public.waitlist_signups enable row level security;
-- no policies: anon and authenticated roles cannot read or write
```

### 5.3 Join flow (server action `join`)

Input: `email`, `form_location`, hidden honeypot field `company`, render timestamp `t`, plus `ref` and UTM values read from the URL on first load and kept in `sessionStorage` (wrapped in try/catch; the form still works without them).

1. **Validate** with zod: email trimmed, lower-cased, max 254 chars, valid format. Invalid returns `{ status: 'invalid' }`.
2. **Bot checks**: honeypot filled, or submitted under 1.5s after render, returns a fake `{ status: 'ok' }` and writes nothing.
3. **Rate limit**: more than 5 inserts from the same `ip_hash` in 10 minutes returns `{ status: 'rate_limited' }`.
4. **Insert** with `on conflict (email) do nothing`. If the row already existed, return `{ status: 'exists' }`; do not send another email.
5. **Email**: send the confirmation via Resend and add the contact to the audience. A Resend failure is logged and does not fail the signup (the row is the source of truth; a nightly job or manual re-run can resend).
6. Return `{ status: 'ok' }`.

A second, optional server action `profile` updates `first_name` and `stage` for the row just created, keyed by a signed token returned from `join` (HMAC of the row id, so nobody can edit other rows).

Environment variables: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `RESEND_AUDIENCE_ID`, `IP_HASH_SALT`, `TOKEN_SECRET`, `SKOOL_JOIN_URL`.

### 5.4 Confirmation email

- From: `Olly <olly@buildsoftwaresolo.com>` [confirm address]; reply-to the same, and replies must reach a real inbox.
- Domain verified in Resend with SPF, DKIM and DMARC (`p=none` to start).
- Subject: `You're on the list`
- Body (plain, one column, no images needed):

> You're on the waitlist for Build a Profitable $10K p/m App.
>
> Founding members pay $397/year instead of $776, and keep that price for as long as they stay. There are only 100 founding spots, for 7 days. I'll email you before doors open and again the moment they do.
>
> Until then, hit reply and tell me what you're building (or want to build). I read every one.
>
> Olly

- Footer: postal address [confirm], one-click unsubscribe (Resend handles the header).

## 6. Page specification

Order of sections, top to bottom. Every section sits inside the 1180px marketing rail with hairlines left and right and a hairline between sections (QP §04), matching the reference layout. Section padding 80px top and bottom on desktop, 56px under 768px.

Every form on the page is the same `WaitlistForm` component with a different `location` prop. In the `open` and `closed` phases it renders as a single join button instead (§6.15).

### 6.0 Announcement bar

- 36px high, full width, white, bottom hairline, 13px centred text.
- `waitlist`: "Founding price: $397/year for the first 100 members. Waitlist gets in first. **Join the waitlist →**". Once `doorsOpenAt` is set, a countdown appears at the end (`13d 04h 22m`, tabular numbers in a fixed-width box so it never changes width). Until then, no date or countdown.
- `open`: "Doors are open. Founding price $397/year for the first 100 members. **Join now →**" (add the end date once known)
- `closed`: hidden.

### 6.1 Navigation

- Sticky, 48px, white with bottom hairline once scrolled (opacity fade 200ms).
- Left: wordmark "Build a Profitable $10K p/m App" in 14px/500 with a 16px dot-matrix mark. Under 640px the wordmark shortens to "$10K p/m App" [confirm short form].
- Centre: What's inside · Curriculum · Reviews · Pricing · FAQ (anchor links, 13px muted, ink on hover). Hidden under 900px.
- Right: primary button "Join the waitlist" (compact, 32px), scrolls to the hero form and focuses its input.

### 6.2 Hero

Two stacked blocks, centred, max text width 720px.

- Status pill (4px radius, blue-soft fill, blue edge, live dot that pulses): "Waitlist open · founding spots limited to 100"
- H1 (display, 48px desktop / 32px mobile, `text-wrap: balance`): **Build and sell a profitable SaaS with AI. Watch me do it live.**
- Sub (16px body, max 60ch): "I've built and sold 5 software products, with 500+ paying clients across them. Now I'm building my next SaaS to $10K/month, in private, and you get to watch every move."
- Form card (square, hairline, 24px padding, max 520px):
  - Label row: "Join the waitlist" left, "100 founding spots" right in faint 13px.
  - One email input + primary large button "Join the waitlist" on one row (stack under 480px).
  - Microcopy under it (13px faint, reserved one line): "No payment now · founding price locked in · no coding experience needed"

**Hero visual** (below the text, full rail width, the "product shot"): a static mock of the member area in QP app style (white, 6px radius, hairlines, 13px text). It shows the promise, not a stock image:

- Window bar: `Live build · day 1` and a live dot.
- Left pane: MRR chart from $0 to the $10,000 target (blue step line, dashed target line in ghost, y-axis labels tabular). Caption: "MRR $0 · target $10,000".
- Right pane: "This week" activity list, rows 48px with tags: `Cold email` "Sent 400 emails to dental clinics" · `Call` "Discovery call booked with Halden & Rowe" · `Ad` "First Meta ad live, $20/day" · `Churn save` "Saved a cancelling customer with an annual offer" · `Lesson` "2.4 Auth, Data & Payments". All fictional, marked with an `aria-hidden` visual and a caption "Illustration of the member area" for screen readers.
- Rows rise once (QP §06) when the panel enters view.

### 6.3 Numbers strip

Four equal cells divided by hairlines, number 32px/500 tabular, label 13px faint:

| 40 | 10M+ | 20 | $397 |
| --- | --- | --- | --- |
| lessons across 5 weeks | verified B2B leads | apps ready to clone | per year, founding members |

### 6.4 From the channel (single-quote carousel)

- Left column: label "From the channel" and "Real comments from my YouTube viewers. The community is the paid, private version of everything they're reacting to."
- Right column: one quote at a time (20px/500 ink), tag above it (e.g. `No fluff`), handle and avatar initial below.
- Controls: previous and next buttons (icon-only, labelled), position `04 / 15` in tabular numbers.
- The quote box has a fixed height equal to the tallest quote at each breakpoint (measure at build time or set a min-height), so arrows never move. Crossfade 200ms, opacity only. No autoplay.
- Uses the same data as §6.10.

### 6.5 What's inside (`#inside`)

- Label "What's inside", H2 32px: **Everything unlocks the day doors open.**
- Sub: "No drip-feed and no upsells. Everything below is there on day one, and the live build adds to it every week."

Grid of cards, each with an index (`01`), a Lucide icon, a title, two lines of body and a small visual. Square cards split by hairlines (no gaps, no shadows), like the reference.

Row 1 (two large cards):

| # | Title | Body | Visual |
| --- | --- | --- | --- |
| 01 | Watch me build to $10K/month | A brand new SaaS, built in private. Every cold email, call, sales call, ad and churn save, as it happens. | MRR step chart (blue line, 12 steps, "MRR $0 → $10,000") |
| 02 | Daily live calls | Monday to Friday at 5pm UK, an hour live with me. Bring your product, your numbers and your questions. | Mon–Fri row of five day cells, today's cell in blue-soft with a live dot, time label "5pm UK · 1 hour" |

Row 2 (two large cards):

| # | Title | Body | Visual |
| --- | --- | --- | --- |
| 03 | The 40-lesson course | Five weeks from idea to first customers to exit. Eight lessons a week. | The five week names as a row: Foundations → Build → First Customers → Growth → Retain & Scale, with "5 weeks · 40 lessons · 7 guides" under it. Links to `#curriculum`. |
| 04 | 10M+ verified B2B leads | Verified contact data, filtered by industry and job title. Export up to 5,000 records a month to CSV. | Mini lead table: filter chips (`Industry: SaaS`, `Title: Founder +1`), a count "148,206 matching" and 5 rows with masked emails (`a.bello@p•••••.io`) and tags `Valid`, `Director`, `C-level`. A small meter under it: "5,000 exports a month". Caption: "Sample view. Members see full records." |

Row 3 (four small cards):

| # | Title | Body |
| --- | --- | --- |
| 05 | Unlimited Q&A | Post any question in the community. Every post answered within 24 hours. |
| 06 | 20 apps ready to clone | Profitable app ideas with the build and a launch template for each. Pick one and ship. |
| 07 | 7 tool guides | Claude Code, Stripe, Supabase, Vercel, Trigger.dev, Resend and your own data API, in depth. |
| 08 | Private DMs with me | Message me directly for your first 30 days. |

Row 4 (one full-width card, blue-edge tag `Founding members only`):

| 09 | Founding bonuses | My real codebases, my Claude skills and my script packs. Only for the first 100 members. |

### 6.6 Mid CTA band

Two columns: left label "Don't miss the doors" + H3 "Waitlist members get in first, at $397/year." Right: `WaitlistForm location="inside"`.

### 6.7 Who it's for

Three columns, hairline-divided, each a short H3 and two lines:

- **You haven't started.** You'll pick a validated idea in week 1 and ship it in week 2. No coding experience needed: if you can describe it, Claude can build it.
- **You've built, nobody's paying.** Week 3 is the outbound system that got me 500+ clients: lead lists, cold email, calls and closing.
- **You're making some money.** Weeks 4 and 5 are growth, pricing, churn and building something you could sell.

### 6.8 Curriculum (`#curriculum`)

- Label "Curriculum", H2: **5 weeks · 40 lessons · 7 guides**
- Desktop (≥ 1024px): five columns, one per week. Column header: `Week 1`, week name (16px/500), outcome (13px muted). Then eight lesson rows (13px, number in faint tabular, title in body ink), each 36px with a row-divider hairline. Columns are equal width and every column has exactly eight rows, so heights match.
- Tablet and mobile: one accordion item per week (header 48px: "Week 1 · Foundations" left, "8 lessons" right in faint). Week 1 open by default. Height morphs over 300ms (QP §06); the header never moves.
- Below: "Guides · the stack in depth" as a 7-item list or two-column grid, `G1` to `G7`.
- Below that, one line (13px faint): "Plus: the live $10K build, daily calls Monday to Friday, unlimited Q&A, 10M+ leads and 20 clone-ready apps."

### 6.9 Mid CTA band (repeat)

Same as 6.6 with H3 "Get in the day doors open." and `location="reviews"`. Placed after the wall in the reference; either position is fine, but keep at most one form between any two content sections.

### 6.10 The wall (`#reviews`)

- Label "Reviews", H2: **What people say after watching, then doing.** Sub: "Unedited comments from my YouTube channel." [confirm channel name/link]
- Masonry, 3 columns desktop / 2 tablet / 1 mobile (CSS columns, `break-inside: avoid`). Each card: square, hairline, 20px padding; avatar initial circle, handle (13px/500), a pastel tag for the theme, then the comment (14px body).
- **No star ratings.** YouTube comments do not have ratings, and showing five stars on them would be a made-up claim (QP §09 "Claims").
- Comments (keep exact wording, typos included; tag in brackets):
  1. @SugSean (Life impact): "Hey Olly, thank you mate. You've helped me a lot with the development of my project. I am about to launch my app. I'm really happy and proud of it."
  2. @ramsyrama (No fluff): "I love how practical your guide is, no fantasy, just the normal, boring, old-school way of achieving success on the internet. Lots of work required, which makes it even more realistic."
  3. @untalked (Already bought): "Bought your guide and already 5-minutes in I am finding very valuable insight on how to scale, retain users and improve product. Well worth it!"
  4. @uv-rayss (Quality): "No one can beat the quality of info you provided, can't be more grateful!"
  5. @SYBIOTE (Quality): "6 views I'm early, I'm trying to build a side hustle myself with your videos, really informative, thanks for all the wisdom you impart"
  6. @osvaldodiasdossantos6625 (Clear teaching): "Helpful and well presented. Easy to watch from start to finish. Thanks."
  7. @Hendrix312002 (Quality): "This model is absolutely insane! I have been getting incredible results as well. Love the content my dude. Keep it coming."
  8. @craigbarber (Clear teaching): "So good! Love how you explain complex stuff so simply : )"
  9. @gobdovan (No fluff): "I like how this is actually a holistic guide for a successful product and happy customers."
  10. @nelsonlecuane (Quality): "bro been watching your content the quality and value is of the highest level, thank you"
  11. @ta-prgmr (Quality): "This was so insightful !! Thanks for sharing man"
  12. @Frank_learns (Already bought): "Very inspiring! Just purchased your course!"
  13. @Dr_Asif_Khan (Trust): "Love this guy and the sound advice here"
  14. @timsh0e03 (Quality): "Absolute genius ideas. Why are you giving these out for free?"
  15. @Hendrix312002 (Consistency): "Super solid as always. Thank you"
- Tag hue mapping (QP tag hues, fixed): Quality → blue · No fluff → teal · Clear teaching → amber · Already bought → green · Life impact → rose · Trust → grey · Consistency → grey.

### 6.11 Reassurance triplet

Three cells, hairline-divided, icon + 13px label + 14px body:

- **Everything on day one.** The course, leads, apps, guides and the live build unlock the moment doors open. Nothing is drip-fed.
- **Cancel anytime.** One click in Skool stops your renewal. No calls, no email chains, no "tell us why you're leaving".
- **30-day guarantee.** Go through everything. If it isn't worth far more than you paid, message me within 30 days for a full refund.

### 6.12 Pricing (`#pricing`)

- Label "Pricing", H2: **One membership. Everything included.** Sub: "Founding members pay $397/year, locked for as long as they stay."
- Two-column card (square, hairline, max 960px, centred):
  - **Left: price.** Label "Founding membership" + tag `First 100 only`. Price `$397` (48px/500 tabular) + "/ year". Under it: "~~$776/year~~ · save $379 · about $33/month". Then "After launch: $97/month or $776/year." One line of body: "The build, the calls, the course, the leads, the apps and the guides. One price, no tiers." Then `WaitlistForm location="pricing"`.
  - **Right: what's included.** The nine items from §3 as a checklist (Lucide `check` in success green, 14px body), founding bonuses last with the `Founding only` tag.
- Strikethrough price uses `<s>` with an `aria-label` "was $776 per year".

### 6.13 FAQ (`#faq`)

- Label "FAQ", H2: **Frequently asked questions.**
- Accordion, one open at a time, first item open by default. Row 56px, question 16px/500, `+` icon that rotates to `×` (transform only). Answer 14px body, max 65ch. Height morphs 300ms.
- `FAQPage` JSON-LD with the same text.

| Question | Answer |
| --- | --- |
| What do I get when doors open? | Everything at once: the live $10K build, daily calls Monday to Friday, unlimited Q&A, private DMs for your first 30 days, the 40-lesson course, 10M+ verified leads, 20 clone-ready apps, 7 tool guides and the founding bonuses. |
| When do doors open, and for how long? | Soon. Waitlist members get the date first, by email. Once doors open, the founding price is available for 7 days or until 100 people have joined, whichever comes first. |
| What happens after I join the waitlist? | You get a confirmation email now, an email with the date before doors open, and another the moment they do. Waitlist members hear first, so founding spots go to them first. |
| Do I need to know how to code? | No. You build with Claude Code. If you can describe what you want, Claude can build it, and week 2 shows you exactly how. |
| How do the daily calls work? | A live group call Monday to Friday at 5pm UK, for an hour. Bring your product and your questions. Calls are recorded for anyone who can't make it [confirm]. |
| How quickly are questions answered? | Every post in the community gets an answer within 24 hours. Founding members can also message me directly for their first 30 days. |
| Are the leads actually usable? | Yes. They're verified B2B contacts you can filter by industry, job title and location and export to CSV for cold email or calling, up to 5,000 verified records a month. Week 3 shows you how to use them. |
| What does it cost after launch? | $97/month or $776/year. Founding members pay $397/year and keep that price for as long as they stay. |
| Can I cancel? What's the guarantee? | Cancel your renewal in one click inside Skool. If it isn't worth far more than you paid, message me within 30 days for a full refund. |
| Is this for people who haven't started yet? | Yes. Week 1 takes you from no idea to a validated one, and week 2 to a live product that takes payments. |
| How often is new material added? | The live build updates every week, and new lessons, apps and guides are added as I make them. |
| Where does it happen? | In a private Skool community. You'll get your invite link by email when you join. |

### 6.14 Still deciding (inline band)

Single row: icon, "Still deciding?" (16px/500), "Join the waitlist. It costs nothing and gets you the founding price first." Form on the right (`location="still_deciding"`).

### 6.15 Final CTA

Two columns.

- Left: H2 **Get on the waitlist. Leave whenever you want.** Body: "First in line when doors open, at $397/year instead of $776, locked for as long as you stay. Cancel anytime, 30-day money-back guarantee." Form (`location="final"`).
- Right: dot-matrix illustration (see §7.6) spelling "build software solo" or the $0 → $10K step, in ghost and faint dots with the final step in blue. `aria-hidden`.

**Phase behaviour for every form** (`WaitlistForm`):

| Phase | Renders |
| --- | --- |
| `waitlist` | email input + "Join the waitlist" |
| `open` | one large primary link button "Join now: $397/year" to `SKOOL_JOIN_URL`, microcopy "Founding price for 7 days · first 100 only" |
| `closed` | primary link button "Join the community" to `SKOOL_JOIN_URL`, microcopy "$97/month or $776/year · cancel anytime" |

The button keeps the same height and minimum width in every phase so the layout is identical.

Do not show a "spots left" counter unless it reads a real number from Skool or a manual config value Olly updates. No fake scarcity.

### 6.16 Mobile sticky CTA

Under 768px, once the hero form scrolls out of view and until the final CTA section is in view, a 56px bar floats 12px above the bottom edge (QP floating shadow): "Founding price $397/year" + compact button "Join". Tapping scrolls to the nearest form below and focuses it. It overlays, never pushes content (QP §01 "Overlays float"). Hidden when the on-screen keyboard is open (input focused).

### 6.17 Footer

- Three columns: brand blurb ("Build a Profitable $10K p/m App: a private community where you watch a SaaS get built to $10K/month and build your own alongside it. Run by Olly."), Community links (What's inside, Curriculum, Pricing, FAQ), Channel (YouTube [link], Skool [link]), Contact (`olly@buildsoftwaresolo.com` [confirm], Support).
- Bottom row: "© 2026 Build Software Solo. All rights reserved." [confirm legal entity] · Privacy · Terms.

## 7. Design: applying Quiet Precision

The reference page and QP disagree in a few places. **QP wins**, because it is the design spec. Deliberate changes from the screenshot:

| Reference page | This build | Why |
| --- | --- | --- |
| Monospace, all-caps bracket labels `[ WHAT YOU GET ]` | 13px Geist, faint ink, sentence case, with a tabular index: `03 · What's inside` | QP §03: no monospace in UI, never all caps |
| Solid black buttons | White button, 1px ink edge, ink text, 500 weight | QP §07: no filled or black buttons; primary = firmer edge |
| ASCII-art globe, waveform and banner | SVG dot-matrix illustrations on a 4px grid | Keeps the texture without monospace; scales cleanly; accessible |
| Five stars on every comment | No stars, theme tag instead | QP §09 claims rule; comments have no ratings |
| "Rosewell" everywhere | Product name and Olly only | Rebrand |

### 7.1 Tokens

Use QP §11 starter tokens unchanged, plus these marketing additions:

```css
:root {
  /* QP §11 tokens go here, unchanged */

  /* marketing additions */
  --rail: 1180px;
  --section-y: 80px;          /* 56px under 768px */
  --display: 500 48px/1.04;   /* 32px under 768px; tracking -0.045em */
  --h2-marketing: 500 32px/1.12; /* 24px under 768px; tracking -0.035em */
  --body-marketing: 400 16px/26px; /* tracking -0.011em */
  --control-large: 46px;
  --announce: 36px;
}
```

- Type scale is QP's only: 12, 13, 14, 16, 20, 24, 32, 48. No other sizes. Display uses 48 (QP lists 52 for display, which is off its own scale; 48 is the documented scale step).
- Tracking tightens with size per QP §03. `font-variant-numeric: tabular-nums` on every price, count, countdown and lesson number.
- Colour: white surfaces, hairlines for all structure. Blue (`#5f86e0`) is reserved for: live dots, the MRR line, the selected/open state (curriculum, FAQ, carousel position) and the `Founding` tags. Nothing else is blue.
- Radius: marketing is square (cards, form card, sections). Inputs and buttons use 6px, tags 4px. The app mocks inside cards (hero panel, lead table) use 6px like the real app.
- Shadow only on floating things: mobile sticky bar, toasts. Cards have none.

### 7.2 Buttons

| Variant | Height | Style |
| --- | --- | --- |
| Primary large | 46px | white, 1px `--ink` edge, ink text 15→16px/500, 20px side padding; hover `--hover` fill and 1px lift; press 98% scale |
| Primary compact | 32px | same, 13px |
| Secondary | 36px | white, 1px `--btn-edge`, body ink |
| Icon | 36px square | secondary style, `aria-label` required |

Loading: label stays in place at 0 opacity under an overlaid spinner, so width never changes (QP §06, §08). Spinner appears after 200ms and stays at least 400ms.

### 7.3 Inputs

46px in forms beside a large button (36px elsewhere), 6px radius, `--btn-edge` border, 16px text (prevents iOS zoom), placeholder `you@example.com` in ghost. Focus: border `--ink` plus 3px ink halo at 8% (no blue outline). Error text sits below in danger ink, 13px, `role="alert"`, in a line that is always reserved so nothing jumps.

### 7.4 Form states (the morph)

The form card never changes width. Its height morphs (300ms, `--ease-morph`) between states and the new content fades up 4px after 60ms.

| State | Content |
| --- | --- |
| Idle | input + button + microcopy |
| Submitting | button shows spinner, input read-only |
| Invalid | input edge danger, message "Enter a full email address, like you@example.com." |
| Rate limited | "Too many tries from this connection. Wait a few minutes and try again." |
| Error | "Could not join the waitlist. Check your connection and try again." |
| Success | ✓ (success green) **You're on the list.** "Check your inbox for a confirmation from Olly. You'll hear first when doors open." Then an optional one-question step: "Where are you right now?" three secondary buttons `No idea yet` · `Building` · `Launched` and an optional first name field. Saving shows "Thanks, that helps me plan the calls." |
| Exists | **You're already on the list.** "I'll email you the moment doors open." |

Only the form the visitor used changes state. All other forms on the page switch to a one-line "You're on the list ✓" (same height as their microcopy row hidden with `visibility: hidden`) so the visitor isn't asked again. Remember this in `localStorage` (try/catch) so it holds on reload.

### 7.5 Motion

All QP §06 rules apply. Specifically on this page:

- Section content and card rows rise once (360ms, 6px, 25ms stagger, capped at 270ms) the first time each region enters view in a session. IntersectionObserver, threshold 0.15.
- The only looping animation is the live dot (1.4s pulse).
- Countdown (only once a date is set) ticks change digits only; no flip or slide.
- `prefers-reduced-motion: reduce`: everything renders in its end state, no transitions.

### 7.6 Dot-matrix illustrations

One `DotArt` component renders an SVG from a small bitmap (array of strings) on a 4px grid with 1.2px dots. Three fills: `--ghost` (background texture), `--faint` (shape), `--blue` (highlight). Uses: the MRR step chart in card 01, the final CTA artwork, and the 16px logo mark. All `aria-hidden="true"`.

## 8. Responsive

Check every breakpoint at 320, 375, 430, 768, 1024, 1180 and 1440px (QP §10). No horizontal scroll at any width; grid children get `min-width: 0`.

| Area | ≥ 1024 | 768–1023 | < 768 |
| --- | --- | --- | --- |
| Nav links | shown | hidden | hidden |
| Hero form | input + button on one row | same | stacked under 480px |
| Hero visual | two panes | two panes | MRR pane only, activity list below |
| Numbers strip | 4 across | 4 across | 2 × 2 |
| Inside cards | 2 / 2 / 4 / 1 | 2 / 2 / 2×2 / 1 | 1 column |
| Curriculum | 5 columns | accordion | accordion |
| Wall | 3 columns | 2 | 1 (show 8, then "Show all 15" button) |
| Pricing card | 2 columns | 2 | stacked, price first |
| Mobile sticky CTA | no | no | yes |

Side gutter 16px under 768px, 24px above. Body copy never wider than 65ch.

## 9. Accessibility

- One `h1`, then `h2` per section, `h3` per card. Landmarks: `header`, `nav`, `main`, `footer`.
- Every input has a visible or `sr-only` `<label>`. Email inputs use `type="email"`, `autocomplete="email"`, `inputmode="email"`.
- Focus visible on everything: 2px outline, 2px offset (QP §10). Skip link to `#main`.
- Carousel: `aria-roledescription="carousel"`, slides labelled "4 of 15", buttons labelled, polite live region for the quote. Left and right arrow keys work when focused.
- Accordions use `button` + `aria-expanded` + `aria-controls`.
- Form result messages are in a polite live region; errors use `role="alert"`.
- Contrast: body and muted text meet 4.5:1 on white; faint (`#8a8f98`) is only for 13px labels next to stronger text, never for essential info like prices or errors.
- Decorative visuals `aria-hidden`; the hero mock has a text alternative.

## 10. SEO, metadata, sharing

- `<title>`: "Build a Profitable $10K p/m App · Waitlist"
- Meta description: "Watch a SaaS get built live to $10K/month, then build your own with AI. 40 lessons, daily calls, 10M+ leads. Founding price $397/year for the first 100."
- Canonical `https://buildsoftwaresolo.com/`. `robots.txt` allows all; `sitemap.xml` lists `/`, `/privacy`, `/terms`.
- OG/Twitter image 1200×630 from `next/og`: white, hairline frame, H1 in Geist 500, "Founding price $397/year · first 100 members" in faint, small dot-matrix MRR step in blue.
- JSON-LD: `Organization` and `FAQPage`. Do not mark up a `Product` with ratings (there are none).
- Favicon: the dot-matrix mark as SVG plus 32px PNG and 180px apple-touch icon.

## 11. Analytics and attribution

Vercel Web Analytics custom events:

| Event | Properties |
| --- | --- |
| `waitlist_submit` | `location` |
| `waitlist_success` | `location`, `status` (`ok` or `exists`), `ref`, `utm_campaign` |
| `waitlist_error` | `location`, `status` |
| `waitlist_profile` | `stage` |
| `cta_click` | `location`, `phase` (open/closed phases) |
| `faq_open` | `question_id` |
| `curriculum_open` | `week` |

Link format for YouTube descriptions and pinned comments, so Supabase shows which video brought each signup:

```
https://buildsoftwaresolo.com/?ref=<video-slug>&utm_source=youtube&utm_medium=description&utm_campaign=founding-launch
```

(e.g. `ref=katana`, `ref=dataimpulse`, `ref=elevenlabs`; use `utm_medium=pinned_comment` for pinned comments).

A saved Supabase SQL snippet gives Olly a daily view: signups per day, per `ref`, per `form_location`, and the `stage` split.

## 12. Legal and privacy

- Under every form (13px faint, part of the microcopy line or directly beneath): "By joining you agree to get emails about the launch. Unsubscribe anytime. Privacy." with a link.
- `/privacy`: what is collected (email, optional name and stage, source and approximate country, a hashed IP for abuse prevention), why (launch emails), processors (Supabase, Resend, Vercel), retention (deleted on request or 12 months after launch if never a member), contact address, UK GDPR rights. [confirm with Olly's legal details]
- `/terms`: short site terms plus a pointer to Skool's terms for the membership itself, and the refund policy wording from §6.11.
- No cookies are set, so no cookie banner.

## 13. Open questions ([confirm] list)

1. Surname or first name only for the host byline ("Olly" used throughout).
2. Short wordmark for small screens ("$10K p/m App"), and whether the footer legal name is "Build Software Solo".
3. Are the daily calls recorded?
4. Does "answered within 24 hours" include weekends?
5. Doors-open date, once decided (set `doorsOpenAt` and the countdown and dates appear).
6. Sender address for emails and the postal address for the email footer.
7. Waitlist target number for success (1,000 suggested).
8. Can Skool report remaining founding spots (for an honest counter)?
9. YouTube channel name and URL for the review attribution and footer.

## 14. Acceptance criteria

The page is done when all of these are true:

- [ ] No mention of "Rosewell" anywhere in the page, metadata, OG image or emails.
- [ ] All prices, dates and counts render from `content/offer.ts`; changing one value there updates every place it appears.
- [ ] A valid email submitted from any of the forms creates exactly one row in `waitlist_signups` with the correct `form_location`, `ref` and UTM values, and sends one confirmation email.
- [ ] Re-submitting the same email (any case, with spaces) creates no new row, sends no email, and shows the "already on the list" state.
- [ ] A filled honeypot or a sub-1.5s submit writes nothing and shows success.
- [ ] The sixth submit from one IP within 10 minutes is rate limited.
- [ ] The Supabase anon key cannot read or insert into `waitlist_signups`.
- [ ] No date, "November" or countdown appears anywhere while `doorsOpenAt` is null.
- [ ] Setting `SITE_PHASE` (or a `?phase=` override available only in preview deployments) to each phase shows the correct bar, CTAs and microcopy, with no layout change in the forms.
- [ ] CLS < 0.02 on mobile: the announcement countdown, carousel, FAQ, curriculum accordion and form states never shift surrounding content.
- [ ] No monospace font, no all-caps text, no filled or black buttons, no type size outside the QP scale (spot-check with a computed-style script).
- [ ] Reduced motion shows end states with no animation.
- [ ] No horizontal scroll at 320px; every breakpoint in §8 matches the table.
- [ ] Keyboard only: every control reachable and visible on focus; carousel and accordions usable; form submits with Enter.
- [ ] Lighthouse mobile ≥ 95 performance, 100 accessibility, 100 best practices, 100 SEO.
- [ ] Confirmation email passes SPF, DKIM and DMARC and lands in a Gmail inbox, not spam or promotions-only [check with mail-tester].
- [ ] `www.buildsoftwaresolo.com` redirects to the apex; HTTPS everywhere.

## 15. Build plan

| Step | Work | Done when |
| --- | --- | --- |
| 1. Skeleton (half day) | Next.js app, Tailwind with QP tokens, Geist, rail layout, nav, footer, `offer.ts`, `phase.ts` | Empty sections render at every breakpoint with hairlines in place |
| 2. Content sections (1–2 days) | Hero + mock, numbers, carousel, inside cards, who it's for, curriculum, wall, reassurance, pricing, FAQ, final CTA, dot-matrix art | Whole page readable with real copy, static forms |
| 3. Waitlist backend (half day) | Supabase table and RLS, `join` and `profile` actions, Resend email and audience, form states | Acceptance items on signups, duplicates, bots and rate limit pass |
| 4. Phases, analytics, SEO (half day) | Config-driven phases (countdown only when a date is set), CTAs, mobile sticky CTA, events, OG image, JSON-LD, privacy and terms | Phase checks pass; OG preview correct on X and iMessage |
| 5. QA and launch (half day) | Lighthouse, CLS, a11y, reduced motion, email deliverability, DNS on buildsoftwaresolo.com | Every box in §14 ticked, link added to this week's video descriptions |

Target: live by Friday 23 October, so every new video from then on can link to it.
