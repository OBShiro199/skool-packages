// Folio repo tree and starter files for the downloadable zip.

export const repoTree = `folio/
├── app/
│   ├── (marketing)/page.tsx              # landing page from LANDING.md
│   ├── (marketing)/pricing/page.tsx
│   ├── (marketing)/templates/page.tsx
│   ├── (marketing)/templates/[layout]/page.tsx
│   ├── (marketing)/tools/carousel-hook-generator/page.tsx
│   ├── (marketing)/compare/[slug]/page.tsx
│   ├── (auth)/login/page.tsx
│   ├── (auth)/signup/page.tsx
│   ├── onboarding/page.tsx
│   ├── invite/[token]/page.tsx
│   ├── app/create/page.tsx               # source picker + job progress
│   ├── app/carousels/[id]/page.tsx       # editor
│   ├── app/library/page.tsx
│   ├── app/calendar/page.tsx
│   ├── app/brand/page.tsx
│   ├── app/brand/[id]/page.tsx
│   ├── app/brand/[id]/accounts/page.tsx
│   ├── app/billing/page.tsx
│   ├── app/settings/page.tsx
│   ├── app/help/page.tsx
│   ├── docs/[slug]/page.tsx
│   ├── r/[handle]/page.tsx               # referral links
│   ├── api/render/run/route.ts           # Satori + resvg + pdf-lib worker (Node)
│   ├── api/demo/hook/route.ts
│   ├── api/stripe/checkout/route.ts
│   ├── api/stripe/portal/route.ts
│   └── api/stripe/webhook/route.ts
├── components/
│   ├── slides/                           # 8 Satori-safe layouts + SlideFrame
│   │   ├── SlideFrame.tsx
│   │   ├── Hook.tsx  Statement.tsx  Bullets.tsx  Step.tsx
│   │   ├── Quote.tsx Stat.tsx       Compare.tsx  Cta.tsx
│   │   └── index.ts
│   ├── editor/  SlidePreview.tsx SlideRail.tsx Inspector.tsx RewriteMenu.tsx ExportDialog.tsx
│   ├── create/  SourceTabs.tsx VoiceRecorder.tsx JobProgress.tsx
│   ├── schedule/ScheduleDialog.tsx
│   ├── shell/   AppSidebar.tsx BrandSwitcher.tsx UsageMeter.tsx
│   └── ui/                               # shadcn/ui
├── fonts/                                # 12 TTF families for slides (400 + 700)
├── lib/
│   ├── render/  fonts.ts renderSlide.tsx fitText.ts pdf.ts
│   ├── hash.ts                           # same content hash as fol-render-enqueue
│   ├── contrast.ts
│   ├── publisher.ts                      # Zernio today, direct LinkedIn later
│   └── supabase/client.ts server.ts admin.ts
├── supabase/
│   ├── migrations/0001_folio.sql
│   └── functions/
│       ├── _shared/  supabase.ts auth.ts http.ts log.ts retry.ts usage.ts guard.ts schemas.ts prompts.ts
│       ├── fol-ingest/
│       ├── fol-generate/
│       ├── fol-rewrite-slide/
│       ├── fol-render-enqueue/
│       ├── fol-zernio-connect/
│       ├── fol-schedule-post/
│       ├── fol-zernio-webhook/
│       ├── fol-analytics-sync/
│       └── fol-sweeper/
├── scripts/  e2e-check.ts security-tenant.ts
├── PRD.md                                # build PRD (download, save here)
├── DESIGN_SYSTEM.md                      # Quiet Precision, the base design system
├── DESIGN.md                             # Folio accent, components and screens
├── LANDING.md                            # landing page PRD
├── CLAUDE.md
├── .env.example
└── README.md`

export const starterFiles: { path: string; content: string }[] = [
  {
    path: 'README.md',
    content: `# Folio

Turn a blog post, a YouTube video, an idea or a voice note into an on-brand LinkedIn and Instagram carousel:
hook slide, 6 to 9 body slides, CTA. Edit, rewrite with AI, reorder, export PNG and PDF, schedule to LinkedIn.

## Stack
Next.js (App Router) + Tailwind + shadcn/ui, Supabase (auth, Postgres + RLS, storage, edge functions, cron),
Claude API (claude-sonnet-5-5, claude-haiku-5-5), Firecrawl, Supadata, Deepgram, Zernio, Satori + resvg +
pdf-lib on a Vercel Node function, Stripe (Creator $39, Pro $79, Agency $249, 7 day trial), Resend.

## Start
1. \`npm install\`
2. Copy \`.env.example\` to \`.env.local\` and fill it in.
3. Run \`supabase/migrations/0001_folio.sql\` in the Supabase SQL editor (once, on a fresh project).
4. \`npm run dev\`, sign up, set your brand kit, paste a link on /app/create.

## Rules that matter
- All metering goes through \`try_consume_usage\`. Never count usage in the browser.
- Slide components in \`components/slides\` follow Satori rules: inline styles, flexbox only, explicit display: flex.
- A scheduled post always uses the render it was scheduled with.
`,
  },
  {
    path: 'CLAUDE.md',
    content: `# Folio

Turns blog posts, YouTube videos, ideas and voice notes into on-brand LinkedIn and Instagram carousels.
Product context: @PRD.md
UI rules: @DESIGN_SYSTEM.md @DESIGN.md
Landing page: @LANDING.md

## Commands
- Dev: \`npm run dev\` · Build: \`npm run build\` (must pass before any commit) · Lint: \`npm run lint\`
- Deploy a function: \`npx supabase functions deploy <name>\`
- Stripe webhooks locally: \`stripe listen --forward-to localhost:3000/api/stripe/webhook\`

## Rules
- Every table has RLS with one policy per operation. No \`for all\`. Isolation is by workspace_id with
  is_workspace_member() and has_workspace_role().
- Server code checks the user with supabase.auth.getClaims(). The secret key never reaches the browser.
- Every paid call (Claude, Firecrawl, Supadata, Deepgram, renders) goes through try_consume_usage first.
- Source text is untrusted: it goes inside <source_material> tags in the user message only.
- Slide components are pure: props in, inline-styled flexbox JSX out, no hooks, no Tailwind.
- Plan first and wait for my OK on anything touching payments, RLS, storage policies or deletes.
`,
  },
  {
    path: '.env.example',
    content: `# Browser-safe
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-REF.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxx
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Server only (.env.local and Vercel env)
SUPABASE_SECRET_KEY=sb_secret_xxx
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
STRIPE_PRICE_CREATOR_MONTHLY=price_xxx
STRIPE_PRICE_CREATOR_YEARLY=price_xxx
STRIPE_PRICE_PRO_MONTHLY=price_xxx
STRIPE_PRICE_PRO_YEARLY=price_xxx
STRIPE_PRICE_AGENCY_MONTHLY=price_xxx
STRIPE_PRICE_AGENCY_YEARLY=price_xxx
RENDER_WORKER_SECRET=make-a-long-random-string
RESEND_API_KEY=re_xxx
EMAIL_FROM=Folio <hello@getfolio.app>

# Supabase secrets (npx supabase secrets set NAME=value)
# ANTHROPIC_API_KEY=sk-ant-api03-xxx
# FIRECRAWL_API_KEY=fc-xxx
# SUPADATA_API_KEY=xxx
# DEEPGRAM_API_KEY=xxx
# ZERNIO_API_KEY=sk_xxx
# ZERNIO_WEBHOOK_SECRET=xxx
# RENDER_WORKER_URL=https://getfolio.app/api/render/run
# RENDER_WORKER_SECRET=same-as-above
# CRON_SECRET=make-a-long-random-string (also in Vault as cron_secret)
# APP_URL=https://getfolio.app
# RESEND_API_KEY / EMAIL_FROM (same as above)
`,
  },
  {
    path: 'components/slides/README.md',
    content: `# Slide templates

Eight layouts: hook, statement, bullets, step, quote, stat, compare, cta. Each file exports one component with
the SlideProps from PRD 10.3. They render in the editor (DOM) and in /api/render/run (Satori), so:

- Inline style objects only. No className, no Tailwind.
- Flexbox only. Every div with more than one child sets display: 'flex'.
- No hooks, no fetch, no Date.now(). Same props, same pixels.
- Images arrive as data URLs. Fonts are the brand kit's heading and body families from /fonts.
`,
  },
]
