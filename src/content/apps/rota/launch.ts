// Rota launch tasks, repo tree and starter files.
import type { Task } from '../../types'

export const launchTasks: Task[] = [
  {
    id: 'rta-launch-live',
    title: 'Switch texting, Claude and per-location billing to production',
    outcome: 'Real businesses pay per location, real staff get texts from approved senders, and every worker points at your live domain.',
    minutes: 60,
    xp: 55,
    blocks: [
      { type: 'callout', tone: 'eli5', title: 'Test settings do not move over by themselves', text: 'Everything so far used test Stripe prices, a dev Claude key and your laptop\'s address. Going live means making the same settings on the live side and swapping the values in Vercel and Supabase. Miss one and that piece quietly keeps using the test version.' },
      { type: 'steps', items: [
        'Stripe (live mode): create the product "Rota" with six prices: Starter $39/month and $390/year, Team $69/month and $690/year, Pro $149/month and $1,490/year. Each price is "per unit" so quantity = locations. Copy the six live price ids.',
        'Stripe > Settings > Billing > Customer portal: allow switching between the six prices, allow quantity changes, allow cancel at period end. Save.',
        'Add the live webhook (shared phase) and confirm it lists customer.subscription.created, updated, deleted and trial_will_end. Swap STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET and the six STRIPE_PRICE_* values in Vercel env (Production) and Supabase secrets.',
        'Run the SQL below with your live price ids so plan_limits() knows which plan each price is.',
        'Anthropic: create a "rota-prod" key, set the monthly limit to about 2 times your expected spend, and replace ANTHROPIC_API_KEY in Supabase secrets.',
        'Twilio: confirm the account is upgraded, Geo permissions list only your selling countries, the "Rota" alpha sender is in the Messaging Service, and (US) the toll-free verification shows Approved. Set a low-balance alert and turn on auto-recharge with a sensible top-up.',
        'Supabase secrets: APP_URL = https://yourdomain.com. Vercel env: NEXT_PUBLIC_SITE_URL the same. Redeploy Vercel and redeploy every edge function (supabase functions deploy).',
        'Make one real end-to-end week: subscribe yourself to Starter with a real card, add your own phone as staff, publish, receive the text, then refund yourself in Stripe.',
      ] },
      { type: 'code', id: 'rta-launch-live-sql', filename: 'go-live.sql', lang: 'sql', code: `-- Map your LIVE price ids to plans (replace with your live price_ ids):
insert into public.plan_prices (price_id, plan) values
  ('price_live_starter_m', 'starter'), ('price_live_starter_y', 'starter'),
  ('price_live_team_m', 'team'),       ('price_live_team_y', 'team'),
  ('price_live_pro_m', 'pro'),         ('price_live_pro_y', 'pro')
on conflict (price_id) do update set plan = excluded.plan;

-- After your live test week: your subscription, its quantity, and the texts it sent.
select status, price_id, quantity from public.subscriptions;
select * from public.usage_summary((select id from public.workspaces order by created_at desc limit 1));
select channel, status, count(*) from public.notifications
where created_at > now() - interval '1 hour' group by 1, 2;` },
      { type: 'mistakes', items: [
        { mistake: 'Every business acts like Starter in production.', fix: 'plan_prices still holds your test price ids. Insert the live ids with the SQL above.' },
        { mistake: 'Live texts link to localhost.', fix: 'APP_URL in Supabase secrets is still http://localhost:3000. Update it and redeploy rt-notify.' },
        { mistake: 'Adding a second location in production does not raise the limit.', fix: 'The live webhook does not write quantity. Check customer.subscription.updated is subscribed on the live endpoint and that the handler stores items.data[0].quantity.' },
      ] },
    ],
    checklist: [
      { id: 'rta-launch-live-c1', label: 'Create the six live prices and configure the Customer portal' },
      { id: 'rta-launch-live-c2', label: 'Swap live Stripe, Anthropic and APP_URL values and redeploy' },
      { id: 'rta-launch-live-c3', label: 'Confirm Twilio senders, Geo permissions and balance alerts' },
      { id: 'rta-launch-live-c4', label: 'Map live prices and run a real paid week', trigger: 'copy:rta-launch-live-sql' },
    ],
  },
  {
    id: 'rta-launch-landing',
    title: 'Build the landing page and record the 60 second demo',
    outcome: 'Your domain explains Rota in one scroll, shows a week going from blank to texted, and starts trials.',
    minutes: 120,
    xp: 60,
    blocks: [
      { type: 'steps', items: [
        'Record the demo with Screen Studio: an empty week, Draft with Claude with a note, fix one clash, Publish, then cut to a real phone receiving the text and a swap being approved. Cut to 60 seconds with captions.',
        'Export a 1440px still of the builder with ghost shifts and a phone screenshot of the published text for the hero.',
        'Save LANDING.md, DESIGN.md and DESIGN_SYSTEM.md in the project root, then paste the prompt below.',
      ] },
      { type: 'prompt', id: 'rta-launch-landing-prompt', title: 'Paste into Claude Code', code: `Build the marketing landing page at app/(marketing)/page.tsx exactly as specified in @LANDING.md, top to bottom:
every section, the exact copy, the motion specs with reduced-motion fallbacks, the responsive notes, SEO metadata,
SoftwareApplication and FAQPage JSON-LD, the OG image and every analytics event. Follow @DESIGN_SYSTEM.md for
type, buttons (white with a firm edge, never filled), stability and motion, with the Rota teal accent from @DESIGN.md
and square marketing corners. Wire the pricing toggle to the six STRIPE_PRICE_* env vars and carry plan and
interval into /signup. Build /vs/deputy, /vs/7shifts and /vs/homebase from the comparison section with that
competitor's column highlighted. Add /privacy, /terms and /sms-opt-in (a page showing the join screen's texting
switch, used as opt-in proof for Twilio) linked from the footer.
Put the demo at public/demo.mp4 and public/demo.webm with a poster, preload none.
When done, screenshot at 320, 390, 768 and 1440 wide and fix any overflow or layout shift.` },
      { type: 'code', id: 'rta-launch-landing-check', filename: 'landing-check.txt', lang: 'txt', code: `[ ] Hero H1 reads: "Next week's rota, done before your coffee goes cold."
[ ] Every "Start free trial" fires lp_cta_clicked with its location
[ ] Pricing toggle swaps monthly/annual without moving or resizing the cards
[ ] Comparison table scrolls sideways on mobile with the first column sticky
[ ] Every competitor price is checked on their site today, or the [verify] cell is replaced with "See their site"
[ ] FAQ JSON-LD validates in Google's Rich Results Test
[ ] OG image renders when the URL is pasted into WhatsApp, Slack or LinkedIn
[ ] Lighthouse mobile: LCP under 2.0 s, CLS under 0.05` },
    ],
    checklist: [
      { id: 'rta-launch-landing-c1', label: 'Record and cut the 60 second demo' },
      { id: 'rta-launch-landing-c2', label: 'Copy the landing page prompt', trigger: 'copy:rta-launch-landing-prompt' },
      { id: 'rta-launch-landing-c3', label: 'Tick every line of the landing check', trigger: 'copy:rta-launch-landing-check' },
    ],
  },
]

export const repoTree = `rota/
├── CLAUDE.md
├── PRD.md                     # from this kit (build PRD)
├── DESIGN.md                  # from this kit (Rota design)
├── DESIGN_SYSTEM.md           # Quiet Precision base system
├── LANDING.md                 # from this kit (landing page)
├── .env.example
├── app/
│   ├── (marketing)/           # landing, pricing, /vs/*, /tools/*, privacy, terms, sms-opt-in
│   ├── login/  signup/  reset/
│   ├── join/[token]/          # staff invite
│   ├── onboarding/
│   ├── paywall/
│   ├── app/                   # manager shell (sidebar)
│   │   ├── rota/[weekStart]/  rota/templates/
│   │   ├── requests/  staff/  timesheets/
│   │   ├── docs/  help/  billing/  settings/
│   │   └── layout.tsx
│   ├── s/                     # staff phone app (bottom tabs)
│   │   ├── page.tsx  team/  open/  clock/  requests/  me/
│   │   └── layout.tsx
│   └── api/
│       ├── staff/invite/  staff/[id]/resend/
│       ├── billing/checkout/  billing/portal/  billing/locations/
│       └── stripe/webhook/
├── components/
│   ├── rota/                  # WeekGrid, ShiftChip, ShiftPopover, CostFooter, DraftPanel, PublishDialog
│   ├── staff/                 # StaffPanel, InviteDialog
│   ├── availability/          # AvailabilityEditor
│   ├── staffapp/              # NextShiftCard, BottomTabBar, ClockButton
│   └── ui/                    # shadcn/ui restyled with tokens
├── lib/
│   ├── supabase/              # browser + server clients
│   ├── workspace.ts  plans.ts  time.ts  conflicts.ts  staffView.ts  sms.ts
├── emails/                    # React Email templates
├── public/
│   ├── manifest.webmanifest  icons/  demo.mp4  demo.webm
├── scripts/
│   ├── token.ts  sign-twilio.ts  security-*.ts
└── supabase/
    ├── migrations/0001_rota.sql
    └── functions/
        ├── _shared/           # admin, auth, http, log, retry, limits, meter, time, conflicts, sms, twilio, email, claude
        ├── rt-draft/  rt-worker/  rt-publish/  rt-notify/
        ├── rt-twilio-webhook/  rt-swap/  rt-clock/  rt-timesheet-export/`

export const starterFiles: { path: string; content: string }[] = [
  {
    path: 'CLAUDE.md',
    content: `# Rota

Staff rotas built in minutes, with shift swaps and reminders by text. Managers (laptop) build and publish
weekly rotas per location; staff (phone, /s) see shifts, swap, claim open shifts and clock in.

Read @PRD.md before every task. UI rules: @DESIGN_SYSTEM.md @DESIGN.md
Landing page: @LANDING.md

## Stack
Next.js (App Router, TypeScript), Tailwind, shadcn/ui, Supabase (auth, Postgres + RLS, storage, edge functions,
pg_cron), Stripe (per-location quantity), Twilio (SMS), Resend (email), Claude API (claude-opus-5-5), PostHog.

## Commands
- npm run dev / npm run build / npm run lint / npm test
- supabase functions deploy <name>  (webhooks and cron functions with --no-verify-jwt)
- supabase functions serve

## Rules
- Times are timestamptz in the database and shown in the LOCATION's time zone. Convert local times only with lib/time.ts.
- Money is integer cents. Weekly labour cost comes from week_labour_cost(); never trust a model's numbers.
- Conflict rules live in lib/conflicts.ts (copied to supabase/functions/_shared/conflicts.ts) and rota_conflicts() in SQL. Change both together.
- Staff screens read shifts through lib/staffView.ts (published_snapshot for edited shifts).
- Browser inserts shifts as draft only; publishing happens through rt-publish and publish_rota_week().
- Every SMS comes from a fixed template, fits one segment, starts with the business name, and goes through checkLimit() and meter().
- SMS only to numbers in the business's own country.
- Twilio webhooks verify X-Twilio-Signature against the public URL; de-duplicate with twilio_events.
- Text from staff or managers reaches Claude only inside tags, as data. No tools. Validate every assignment after.
- staff_private (phone, email, pay) is read with the user's client so RLS applies. Never with the secret key in a page.
- CSV exports use the injection guard.

## Workflow
Plan mode first for schema, RLS, publish, Twilio, clock-in and Stripe. Show me the plan, wait for OK.
`,
  },
  {
    path: '.env.example',
    content: `# Browser-safe
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-REF.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxx
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_POSTHOG_KEY=phc_xxx
NEXT_PUBLIC_SHOW_TESTIMONIALS=false

# Server only (also add to Vercel env)
SUPABASE_SECRET_KEY=sb_secret_xxx
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
STRIPE_PRICE_STARTER_MONTHLY=price_xxx
STRIPE_PRICE_STARTER_YEARLY=price_xxx
STRIPE_PRICE_TEAM_MONTHLY=price_xxx
STRIPE_PRICE_TEAM_YEARLY=price_xxx
STRIPE_PRICE_PRO_MONTHLY=price_xxx
STRIPE_PRICE_PRO_YEARLY=price_xxx
RESEND_API_KEY=re_xxx
EMAIL_FROM=Rota <shifts@yourdomain.com>

# Local scripts only (test-twilio.sh, sign-twilio.ts)
TWILIO_ACCOUNT_SID=ACxxx
TWILIO_API_KEY_SID=SKxxx
TWILIO_API_KEY_SECRET=xxx

# Supabase secrets (Edge Functions > Secrets), never in the browser
# TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_API_KEY_SID / TWILIO_API_KEY_SECRET
# TWILIO_MESSAGING_SERVICE_SID=MGxxx
# ANTHROPIC_API_KEY=sk-ant-xxx
# RESEND_API_KEY / EMAIL_FROM (same as above)
# CRON_SECRET=openssl rand -hex 32 (also stored in Vault as cron_secret)
# APP_URL=https://yourdomain.com
`,
  },
  {
    path: 'lib/plans.ts',
    content: `// Keep in sync with public.plan_limits() in the migration.
export type PlanKey = 'starter' | 'team' | 'pro'

export const PLAN_LIMITS: Record<PlanKey, {
  pricePerLocation: { month: number; year: number }
  staffPerLocation: number; smsPerLocation: number; draftsPerLocation: number
  geofence: boolean; customSender: boolean
}> = {
  starter: { pricePerLocation: { month: 39, year: 390 }, staffPerLocation: 15, smsPerLocation: 100, draftsPerLocation: 6, geofence: false, customSender: false },
  team: { pricePerLocation: { month: 69, year: 690 }, staffPerLocation: 40, smsPerLocation: 180, draftsPerLocation: 10, geofence: true, customSender: false },
  pro: { pricePerLocation: { month: 149, year: 1490 }, staffPerLocation: 100, smsPerLocation: 400, draftsPerLocation: 12, geofence: true, customSender: true },
}

// US and Canada texts cost about a fifth of UK texts, so those businesses get 4x the allowance.
export const smsMultiplier = (country: string) => (country === 'US' || country === 'CA' ? 4 : 1)

export const TRIAL = { sms: 30, drafts: 2 }

export function planForPrice(priceId: string | null | undefined): PlanKey {
  const env = process.env
  if (priceId === env.STRIPE_PRICE_PRO_MONTHLY || priceId === env.STRIPE_PRICE_PRO_YEARLY) return 'pro'
  if (priceId === env.STRIPE_PRICE_TEAM_MONTHLY || priceId === env.STRIPE_PRICE_TEAM_YEARLY) return 'team'
  return 'starter'
}
`,
  },
  {
    path: 'lib/sms.ts',
    content: `// SMS templates. Every one must fit a single GSM-7 segment (160 characters) with a 30 character business name.
// The edge function copy lives in supabase/functions/_shared/sms.ts. Keep both in sync.

export const SMS_TEMPLATES = {
  invite: (biz: string, link: string) => \`\${biz}: join your team rota: \${link} Stop texts any time in the app.\`,
  rota_published: (biz: string, week: string, shifts: string, link: string) => \`\${biz} rota w/c \${week}: \${shifts}. See it: \${link}\`,
  shift_changed: (biz: string, week: string, shifts: string, link: string) => \`\${biz}: your shifts for w/c \${week} changed. Now: \${shifts}. \${link}\`,
  shift_reminder: (biz: string, when: string, range: string, role: string, link: string) => \`\${biz}: you're on \${when} \${range} (\${role}). Clock in: \${link}\`,
  swap_request: (biz: string, name: string, theirs: string, yours: string, link: string) => \`\${biz}: \${name} asks to swap their \${theirs} for your \${yours}. Reply in the app: \${link}\`,
  decision: (biz: string, what: string, result: string, link: string) => \`\${biz}: your \${what} was \${result}. \${link}\`,
} as const

const GSM = '@£$¥èéùìòÇ\\nØø\\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !"#¤%&\\'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà'

export function isGsm(text: string): boolean {
  return [...text].every((c) => GSM.includes(c) || '^{}\\\\[~]|€'.includes(c))
}

export function segments(text: string): number {
  if (isGsm(text)) return text.length <= 160 ? 1 : Math.ceil(text.length / 153)
  const n = [...text].length
  return n <= 70 ? 1 : Math.ceil(n / 67)
}
`,
  },
]
