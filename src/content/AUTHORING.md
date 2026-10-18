# Content authoring rules (for whoever writes app/phase content)

Audience: solo founders, mostly non-technical, who want to copy-paste their way to a paid SaaS.
They open Claude Code in a blank folder and follow these steps. Spoon-feed them.

## Voice
- No em dashes (—) or en dashes used as dashes. Use full stops, commas, colons, brackets.
- Banned: "here's the kicker", "here's the thing", "let's dive in", "it's not X, it's Y", "game-changer",
  "unlock", "supercharge", "leverage" (verb), "seamless", "robust", "delve", "at the end of the day",
  "the truth is", "insane", "crazy", "10x", "massive", "literally", "simply", "obviously", "just" as softener.
- No legal or admin fluff: never tell them to set up an LLC, talk to a lawyer, write terms, or
  warn about plan restrictions. Pure build-and-sell steps.
- Every step has an exact click path, exact text to paste, or an exact command. ELI5 callouts
  explain the concept in 2 to 4 short sentences like you're talking to a smart 12 year old.
- British spelling (optimise, colour), US dollar prices.

## Fixed stack (always)
- Claude Code in a blank folder builds everything. Next.js (App Router, TypeScript), Tailwind, shadcn/ui.
- Supabase cloud (supabase.com, never self-hosted): auth, Postgres + RLS, storage, edge functions.
  New key names: publishable key `sb_publishable_...` (browser), secret key `sb_secret_...` (server only).
  Server checks the user with `supabase.auth.getClaims()`. Turn off "Confirm email" for fast signup.
  Supabase MCP: `claude mcp add --scope project --transport http supabase "https://mcp.supabase.com/mcp?project_ref=<ref>"` then `/mcp` to authenticate.
- GitHub: assume they have NO account yet. Sign up, create empty private repo, push from Claude Code.
- Vercel: free account, sign up with GitHub, import repo, add env vars, deploy. Redeploy after env changes.
- Porkbun: buy domain, add to Vercel (A record 76.76.21.21 for apex, CNAME cname.vercel-dns.com for www).
- Resend: transactional email (welcome, trial ending), and Supabase custom SMTP via Resend.
- Stripe: 7-day free trial then monthly at the app's price. Checkout (mode subscription,
  subscription_data.trial_period_days), Customer Portal, webhook into a Supabase edge function or
  Next.js route that verifies the signature on the raw body and writes `public.subscriptions`.
  App access = status in ('trialing','active'). Never grant access from success_url.
- Analytics: DataFast (datafa.st) or PostHog.

## Mechanics
- Content lives in TypeScript template literals. Escape every backtick inside content as \` and
  every `${` as `\${`. Run `npx tsc -p .` from the repo root and fix all errors before finishing.
- Every Task, ChecklistItem and code/prompt/doc block `id` must be unique within an app.
  Prefix ids with the phase or app slug, e.g. `eth-be-sql`.
- Checklist items: 2 to 6 per task, start with a verb, things a user physically does. Use
  `trigger: 'copy:<blockId>'` or `'download:<blockId>'` to auto-tick when they copy/download that block.
- xp: 10 to 80 by effort. minutes: realistic.

## Added in round 2 (mandatory for every kit)
- **Research every third-party API with WebSearch/WebFetch before writing about it**: real signup URL,
  the exact dashboard click path to create a key, key format/prefix, free tier, pricing page numbers
  (with the month checked, e.g. "checked Oct 2026"), the real endpoint names/SDK package, webhook
  signature header. Never invent an endpoint. If docs are unreachable say "[verify]".
- Every API gets its own spoon-fed backend task: sign up click by click, create key, where to paste
  (`.env.local`, `Supabase secrets`, `Vercel env` exact strings), a first test call (curl) and what a
  good response looks like.
- `landingPrd`: a full landing page PRD for the fictional brand (not a small site). Sections top to
  bottom with exact copy for every heading/subhead/button: sticky nav, hero with product visual,
  logo strip, problem, product demo/video, 3 to 6 feature sections with visuals, how it works
  (3 steps), comparison table vs named competitors, testimonials slot, pricing with monthly/annual
  toggle and the real plans, FAQ (8 to 12 Q&As written out), final CTA, footer. Motion specs per
  section (scroll reveals, durations, easing, reduced-motion fallback), responsive notes, SEO title,
  meta description, OG image spec, analytics events. 300 to 600 lines.
- PRDs are downloadable (.md and PDF). Tell users to save them into the project folder root and
  reference them in Claude Code with `@PRD.md`, `@DESIGN.md`, `@LANDING.md`.
- SQL: one giant copy-paste block per kit (the UI truncates it in a scroll box with Copy). Must run
  cleanly once on a fresh Supabase project: extensions, enums, tables, indexes, triggers, functions,
  RLS on every table with per-operation policies, storage buckets + policies, comments explaining
  each section ELI5.
- `costs: CostModel` (see types.ts): every paid tool as a CostLine with real current prices, free
  tier, steps at scale (Supabase Pro $25 from first customer, compute add-ons later, Vercel Pro $20,
  Resend tiers, Twilio per-minute, etc.), plus the usage driver. Stripe fees are computed by the UI
  (2.9% + $0.30 per charge + 0.7% Billing), do not add them as a line. If the user did not give a
  price, compute unit cost per customer from the API costs and set a price with 75%+ gross margin.
- App shell (every kit): simple left sidebar. Top group: logo + core pages. Bottom group, always in
  this order: Documentation, Help, Billing, Settings. One level, no nested menus, about 8 items max.
  Both designPrd (app shell section) and buildPrd (routes) must specify it.
- If WebFetch fails (DNS), research with WebSearch using official pricing/docs pages and mark
  anything unconfirmed as [verify].
