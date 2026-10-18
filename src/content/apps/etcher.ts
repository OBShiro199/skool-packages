// Etcher: a B2B CRM with built-in browser calling (an Attio-style CRM, not bloated).
import type { AppDef } from '../types'
import { backendTasks } from './etcher/backendTasks'
import { buildPrd1 } from './etcher/buildPrd1'
import { buildPrd2 } from './etcher/buildPrd2'
import { designPrd } from './etcher/designPrd'
import { edgeFunctions } from './etcher/edgeFunctions'
import { frontendTasks } from './etcher/frontendTasks'
import { code, eli5, mistakes, p, prompt, steps, task } from './etcher/helpers'
import { landingPrd } from './etcher/landingPrd'
import { inbound, outbound, paid } from './etcher/marketing'
import { securityTasks } from './etcher/securityTasks'
import { sql } from './etcher/sql'

const repoTree = `etcher/
├── app/
│   ├── (marketing)/page.tsx            # landing page (LANDING.md)
│   ├── (marketing)/pricing/page.tsx
│   ├── (marketing)/vs/[competitor]/page.tsx
│   ├── (marketing)/crm-cost-calculator/page.tsx
│   ├── (marketing)/templates/[slug]/page.tsx
│   ├── (auth)/login/page.tsx
│   ├── (auth)/signup/page.tsx
│   ├── invite/[token]/page.tsx
│   ├── onboarding/page.tsx
│   ├── app/layout.tsx                  # sidebar + softphone dock
│   ├── app/page.tsx                    # home + onboarding checklist
│   ├── app/people/page.tsx
│   ├── app/people/[id]/page.tsx
│   ├── app/companies/page.tsx
│   ├── app/companies/[id]/page.tsx
│   ├── app/deals/page.tsx              # kanban + table
│   ├── app/deals/[id]/page.tsx
│   ├── app/tasks/page.tsx
│   ├── app/calls/page.tsx
│   ├── app/reports/page.tsx
│   ├── app/import/page.tsx
│   ├── app/docs/[[...slug]]/page.tsx
│   ├── app/help/page.tsx
│   ├── app/billing/page.tsx
│   ├── app/settings/page.tsx           # tabs: profile, workspace, members, pipelines, fields, calling, numbers, data, audit
│   ├── api/stripe/checkout/route.ts
│   ├── api/stripe/minute-pack/route.ts
│   ├── api/stripe/portal/route.ts
│   └── api/stripe/webhook/route.ts
├── components/
│   ├── shell/Sidebar.tsx
│   ├── shell/WorkspaceSwitcher.tsx
│   ├── softphone/SoftphoneDock.tsx
│   ├── softphone/WrapUpForm.tsx
│   ├── deals/KanbanColumn.tsx
│   ├── deals/DealCard.tsx
│   ├── deals/CloseDealDialog.tsx
│   ├── records/FieldValue.tsx
│   ├── records/Timeline.tsx
│   ├── import/ImportMapper.tsx
│   ├── reports/ReportCard.tsx
│   └── ui/                             # shadcn, restyled to Quiet Precision
├── lib/
│   ├── workspace.ts                    # current workspace, role, access
│   ├── billing.ts
│   ├── softphone.ts                    # @twilio/voice-sdk Device wrapper
│   ├── phone.ts                        # libphonenumber-js helpers
│   ├── supabase/client.ts
│   └── supabase/server.ts
├── content/docs/*.mdx                  # in-app documentation
├── supabase/
│   ├── config.toml                     # verify_jwt = false per function
│   ├── migrations/0001_init.sql        # the Etcher migration
│   └── functions/
│       ├── _shared/                    # admin, auth, http, twilio, crypto, limits, meter, email, log
│       ├── _shared/emails/*.tsx        # React Email templates
│       ├── twilio-token/index.ts
│       ├── twilio-voice/index.ts
│       ├── twilio-status-callback/index.ts
│       ├── twilio-recording-callback/index.ts
│       ├── buy-number/index.ts
│       ├── import-leads/index.ts
│       ├── export-leads/index.ts
│       ├── send-email/index.ts
│       └── invite-member/index.ts
├── PRD.md
├── DESIGN.md
├── DESIGN_SYSTEM.md
├── LANDING.md
├── CLAUDE.md
├── .env.example
└── README.md`

const launchTasks = [
  task({
    id: 'etc-launch-telephony',
    title: 'Make calling production ready',
    outcome: 'Twilio points at your live functions, calls show as verified, spend is capped, and your own team uses Etcher for every sales call from today.',
    minutes: 45,
    xp: 50,
    blocks: [
      eli5('Why calling needs its own launch check', 'Everything else in Etcher fails quietly: a page shows an error. A phone problem fails loudly in front of a customer: a call that will not connect, or a number shown as "Spam likely". Ten minutes of checks now saves that first awkward demo.'),
      steps(
        'Supabase secrets: set `APP_URL` to your live https URL (`npx supabase secrets set APP_URL=https://yourdomain.com`). The functions build Twilio callback URLs from SUPABASE_URL, so those stay the same.',
        'Twilio Console > your main account > **Trust Hub**: finish the Business Profile and **SHAKEN/STIR** registration, then assign your US numbers to it [verify the current steps for subaccount numbers]. Verified calls are answered more often.',
        'Twilio Console > **Voice** > **Settings** > **Geo permissions**: only the US, Canada and UK are on. **Usage triggers**: an email alert at $50 a day and $500 a month.',
        'Open the subaccount of your own workspace > **TwiML Apps** > Etcher: Voice URL is `https://<ref>.supabase.co/functions/v1/twilio-voice`, fallback set, status callback set.',
        'Make three calls from the live site: outbound to a US mobile, outbound to a UK mobile, inbound from your own mobile. Check each in Calls with duration, outcome and recording.',
        'From now on, make every sales call in this playbook from your own Etcher workspace. You find bugs before customers do, and each call is a demo.',
      ),
      code('etc-launch-telephony-sql', 'launch-check.sql', 'sql', `
select t.status, t.mode, t.twiml_app_sid is not null as has_app, count(n.*) filter (where n.status = 'active') as numbers
from public.workspace_telephony t left join public.phone_numbers n on n.workspace_id = t.workspace_id
group by t.workspace_id, t.status, t.mode, t.twiml_app_sid;
select jobname, active from cron.job where jobname like 'etc-%' order by 1;
`),
      mistakes([
        { mistake: 'Live calls fail but local ones worked.', fix: 'The TwiML App still points at an old or test function URL. Re-run buy-number setup or fix the Voice URL in the subaccount console.' },
        { mistake: 'Recipients see "Spam likely".', fix: 'Finish SHAKEN/STIR in Trust Hub and keep dial volume steady per number (no 300 calls in an hour from a new number).' },
        { mistake: 'Emails link to localhost.', fix: 'APP_URL in Supabase secrets is still http://localhost:3000. Set it to your live URL.' },
      ]),
    ],
    checklist: [
      'Set APP_URL to your live URL in Supabase secrets',
      'Finish Trust Hub and SHAKEN/STIR',
      'Add $50 a day and $500 a month Twilio usage alerts',
      ['Run the launch check SQL', 'copy:etc-launch-telephony-sql'],
      'Make an outbound US, outbound UK and inbound call on live',
    ],
  }),
  task({
    id: 'etc-launch-landing',
    title: 'Build the landing page and open the founding cohort',
    outcome: 'The full landing page, pricing and comparison pages are live, and 10 founding slots are offered to everyone in your pipeline.',
    minutes: 90,
    xp: 60,
    blocks: [
      p('Your landing page has one job: get a head of sales to start a trial or book the free migration. Build it from LANDING.md, then open the founding cohort to the people you have already spoken to.'),
      prompt('etc-launch-landing-prompt', 'Paste into Claude Code', `
Build the marketing landing page at app/(marketing)/page.tsx exactly as specified in @LANDING.md, top to bottom: every section, the exact copy,
the motion specs with reduced-motion fallbacks, responsive notes, SEO metadata, JSON-LD, the OG image and every analytics event.
UI rules: @DESIGN_SYSTEM.md @DESIGN.md (sage accent, white surfaces, no filled buttons).
Wire the pricing toggle to STRIPE_PRICE_MONTHLY / STRIPE_PRICE_ANNUAL through /signup?plan=. Fill the comparison table from data/competitors.json and show the "Prices checked" footnote.
Keep testimonials behind SHOW_TESTIMONIALS=false. Add /privacy and /terms pages linked from the footer.
When done, screenshot at 375px and 1440px and fix anything that overflows or shifts.
`),
      code('etc-launch-founding', 'founding-email.txt', 'txt', `
Subject: 10 founding teams for Etcher

{{firstname}}, Etcher is live: a CRM where your team calls from the browser and every call logs itself, $149 a month for everyone.
I'm taking 10 founding teams: the annual plan at $749 for the first year (normally $949), a free HubSpot migration, and my mobile number for anything that breaks.
{{n}} of the 10 are taken. Want one? Reply "yes" and I'll set your workspace up today.
`),
      steps(
        'Send the founding email to every "not now", every demo you held, and every trial that did not convert.',
        'Post the launch on LinkedIn with a 30 second screen recording of a call logging itself.',
        'Track founding slots in your own Etcher: a "Founding" pipeline with 10 deals.',
      ),
    ],
    checklist: [
      ['Copy the landing page prompt', 'copy:etc-launch-landing-prompt'],
      'Fill competitors.json and publish the page',
      ['Copy the founding cohort email', 'copy:etc-launch-founding'],
      'Send it to everyone in your pipeline',
    ],
  }),
]

const starterFiles = [
  {
    path: 'README.md',
    content: `# Etcher

A B2B CRM with calling built in: people, companies, custom fields, CSV import, pipelines with a
kanban and weighted forecast, timeline and tasks, and click-to-call from the browser through
Twilio with recordings stored in Supabase. One price per workspace: $149/month or $949/year,
unlimited seats, 1,000 call minutes a month.

## Stack
Next.js (App Router) + Tailwind + shadcn/ui restyled to Quiet Precision, Supabase (auth, Postgres
with RLS, Storage, Realtime, edge functions, pg_cron), Twilio Voice (JS SDK, subaccounts, TwiML
Apps), Stripe (workspace-level subscriptions), Resend + React Email, PostHog or DataFast.

## Start
1. \`npm install\`
2. Copy \`.env.example\` to \`.env.local\` and fill it in.
3. Run \`supabase/migrations/0001_init.sql\` in the Supabase SQL editor (once, on a fresh project).
4. Set the edge function secrets (see .env.example) and deploy the 9 functions.
5. \`npm run dev\`, sign up, create a workspace, start the trial, set up calling.

## Rules that keep it safe
- Every table has \`workspace_id\` and RLS through \`is_workspace_member()\` / \`has_workspace_role()\`.
- Twilio tokens and keys never reach the browser. Subaccount secrets are AES-GCM encrypted.
- Every Twilio webhook checks \`X-Twilio-Signature\`; repeated callbacks change nothing.
- Long work (imports, exports, recordings, emails) runs as jobs with retries, never in a request.
`,
  },
  {
    path: 'CLAUDE.md',
    content: `# Etcher

B2B CRM with built-in browser calling for sales teams of 2 to 20.
Product context: @PRD.md
UI rules: @DESIGN_SYSTEM.md @DESIGN.md
Landing page: @LANDING.md

## Stack
- Next.js (App Router, TypeScript), Tailwind, shadcn/ui restyled to Quiet Precision (no filled buttons)
- Supabase: auth, Postgres + RLS, Storage, Realtime, edge functions (Deno), pg_cron + pg_net
- Twilio Voice: @twilio/voice-sdk in the browser, one subaccount per workspace
- Stripe (subscriptions keyed by workspace_id), Resend + React Email

## Rules
- Multi-tenant: every query filters workspace_id, and RLS enforces it with is_workspace_member() / has_workspace_role().
- Paywall: has_active_access(workspace_id). A lapsed workspace is read-only, never locked out of export.
- Money is integer cents + ISO currency. Phones are E.164.
- Deal status is derived from the stage kind by a trigger. Never set status from the client.
- Twilio webhooks: validate X-Twilio-Signature (URL built from SUPABASE_URL, token looked up by AccountSid) before anything else.
- Metering: every paid Twilio action writes usage_ledger with an idempotency key. Caps are checked server-side.
- Emails only through the send-email function (dedupe via email_log).
- sb_secret_, Twilio and Stripe secrets only in server code. Server code checks users with supabase.auth.getClaims().
- Plan mode for anything touching billing, telephony, RLS or migrations. Run npm run build before every commit.
`,
  },
  {
    path: '.env.example',
    content: `# Browser-safe
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-REF.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxx
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_POSTHOG_KEY=phc_xxx

# Server only (.env.local and Vercel env)
SUPABASE_SECRET_KEY=sb_secret_xxx
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
STRIPE_PRICE_MONTHLY=price_xxx
STRIPE_PRICE_ANNUAL=price_xxx
STRIPE_PRICE_MINUTE_PACK=price_xxx
RESEND_API_KEY=re_xxx
EMAIL_FROM=Etcher <onboarding@resend.dev>
SUPPORT_EMAIL=support@yourdomain.com
INTERNAL_FN_SECRET=same-value-as-the-supabase-secret

# Supabase secrets (npx supabase secrets set NAME=value), never in the browser
# TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
# TWILIO_AUTH_TOKEN=xxx
# TELEPHONY_ENC_KEY=base64-32-bytes (openssl rand -base64 32)
# INTERNAL_FN_SECRET=xxx
# CRON_SECRET=xxx
# APP_URL=https://yourdomain.com
# RESEND_API_KEY=re_xxx
# EMAIL_FROM=Etcher <hello@yourdomain.com>
`,
  },
  {
    path: 'supabase/config.toml',
    content: `# Add these blocks to the config.toml that "npx supabase init" created.
# Every Etcher function checks auth itself (getClaims, Twilio signature or a secret header),
# so the platform's JWT check is off for all of them.

[functions.twilio-token]
verify_jwt = false

[functions.twilio-voice]
verify_jwt = false

[functions.twilio-status-callback]
verify_jwt = false

[functions.twilio-recording-callback]
verify_jwt = false

[functions.buy-number]
verify_jwt = false

[functions.import-leads]
verify_jwt = false

[functions.export-leads]
verify_jwt = false

[functions.send-email]
verify_jwt = false

[functions.invite-member]
verify_jwt = false
`,
  },
]

export const etcher: AppDef = {
  slug: 'etcher',
  name: 'Etcher',
  tagline: 'The CRM your team calls from',
  oneLiner: 'A fast B2B CRM for sales teams of 2 to 20 with pipelines, CSV import and click-to-call from the browser, at one flat price for unlimited seats.',
  category: 'business',
  art: { motif: 'kanban', tone: 'green' },
  price: { monthly: 149, trialDays: 7 },
  difficulty: 3,
  buildHours: 40,
  apis: [
    {
      name: 'Twilio Voice',
      job: 'rings calls from the browser (Voice JS SDK with Access Tokens and a TwiML App), buys US and UK numbers per workspace in its own subaccount, records calls and sends status and recording webhooks',
      signupUrl: 'https://www.twilio.com/try-twilio',
      docsUrl: 'https://www.twilio.com/docs/voice/sdks/javascript',
      pricing: 'Checked Oct 2026 (third-party summaries of twilio.com/en-us/voice/pricing; confirm on Twilio\'s page): US outbound about $0.014/min, inbound to a local number about $0.0085/min, plus about $0.004/min for the browser (SDK) leg, recording about $0.0025/min, US local number about $1.15/month. UK numbers $1.15 to $3.50/month and UK mobile calls about $0.03/min [verify]. Subaccounts and TwiML Apps are free; UK numbers need an approved regulatory bundle. Pay as you go after a trial credit; upgrade the account before real calls.',
      envVars: [
        { name: 'TWILIO_ACCOUNT_SID', where: 'console.twilio.com > Account Info > Account SID (starts with AC)', pasteInto: 'Supabase secrets', secret: false },
        { name: 'TWILIO_AUTH_TOKEN', where: 'console.twilio.com > Account Info > Auth Token (click Show)', pasteInto: 'Supabase secrets', secret: true },
        { name: 'TELEPHONY_ENC_KEY', where: 'Generate it: openssl rand -base64 32 (encrypts each workspace\'s subaccount token)', pasteInto: 'Supabase secrets', secret: true },
      ],
    },
  ],
  idealFor: 'founders who want to sell a higher-ticket B2B tool to recruitment agencies, marketing agencies and small B2B sales teams that live on the phone',
  whyItSells: 'A 6 person recruitment team on a $90 per seat CRM plus a $40 per seat dialer pays $780 a month. Etcher is $149 for the whole team with 1,000 call minutes included, a saving of over $7,500 a year that a head of sales can see in one call.',
  features: [
    'People, companies and deals with custom fields, search, filters and a 30 day bin',
    'CSV import with column mapping, dedupe by email and domain, and a live progress bar',
    'Multiple pipelines from templates with drag-and-drop kanban, win probabilities and a weighted forecast',
    'Click-to-call from the browser with local US and UK numbers bought in-app',
    'Call recording with a consent announcement, saved to the timeline and removed from Twilio',
    'Inbound calls routed to the assigned rep, with voicemail and call-back tasks',
    'Reports: pipeline by stage, win rate, cycle time, calls per rep, revenue by month, weekly digest',
    'Unlimited seats with owner, admin and member roles, audit log, export and account deletion',
  ],
  status: 'full',
  costs: {
    usage: { label: 'Call minutes per workspace per month', unit: 'minutes', default: 600, min: 0, max: 2000, step: 50 },
    plans: [
      { id: 'etc-monthly', name: 'Monthly', price: 149, interval: 'month', includes: 'Unlimited seats, 1,000 call minutes a month, up to 3 numbers, recording, all CRM features, free HubSpot migration' },
      { id: 'etc-annual', name: 'Annual', price: 949, interval: 'year', includes: 'Everything in Monthly, billed yearly ($79/month equivalent)' },
    ],
    lines: [
      { name: 'Call minutes (browser leg + phone leg)', vendor: 'Twilio', kind: 'perUnit', amount: 0.017, note: 'Blended US rate for 80% outbound ($0.004 SDK leg + $0.014 PSTN = $0.018) and 20% inbound ($0.004 + $0.0085 = $0.0125): about $0.017 per minute. Twilio rounds each leg up to the minute. UK mobile calls cost about $0.034/min with the SDK leg [verify]. Checked Oct 2026 from third-party summaries; re-check twilio.com/en-us/voice/pricing/us each quarter.', url: 'https://www.twilio.com/en-us/voice/pricing/us' },
      { name: 'Call recording', vendor: 'Twilio', kind: 'perUnit', amount: 0.0025, note: '$0.0025 per recorded minute, assuming every call is recorded (worst case). Twilio storage ($0.0005/min/month) is avoided because Etcher deletes each recording from Twilio after copying it to Supabase. Checked Oct 2026.', url: 'https://www.twilio.com/en-us/voice/pricing/us' },
      { name: 'Phone numbers', vendor: 'Twilio', kind: 'perCustomer', amount: 2.3, note: 'Average 2 local numbers per workspace at about $1.15/month each (US). UK local numbers may be up to $3.50/month [verify]. Cap is 3 per workspace.', url: 'https://www.twilio.com/en-us/voice/pricing/us' },
      { name: 'Recording storage', vendor: 'Supabase', kind: 'perCustomer', amount: 0.05, note: 'MP3 at about 0.24 MB per minute: 600 minutes a month kept 12 months is about 1.7 GB per workspace, about $0.04/month at $0.021/GB over the 100 GB Pro includes [verify].', url: 'https://supabase.com/pricing' },
      { name: 'Supabase', vendor: 'Supabase', kind: 'fixed', amount: 25, steps: [{ fromCustomers: 0, amount: 0 }, { fromCustomers: 1, amount: 25 }, { fromCustomers: 300, amount: 40 }, { fromCustomers: 1000, amount: 85 }], freeTier: 'Free plan for building (pauses after a week of no use, 2 projects). Upgrade before your first paying customer.', note: 'Pro $25/month includes $10 compute credit. Small compute (+$15) from about 300 workspaces as Realtime and cron workers grow, Medium (+$60) from about 1,000. Checked Oct 2026.', url: 'https://supabase.com/pricing' },
      { name: 'Vercel Pro', vendor: 'Vercel', kind: 'fixed', amount: 20, steps: [{ fromCustomers: 0, amount: 0 }, { fromCustomers: 1, amount: 20 }], freeTier: 'Hobby is free but non-commercial only. Move to Pro before you charge.', note: '$20 per member per month including $20 of usage. One member is enough. Checked Oct 2026.', url: 'https://vercel.com/pricing' },
      { name: 'Transactional email', vendor: 'Resend', kind: 'fixed', amount: 0, steps: [{ fromCustomers: 0, amount: 0 }, { fromCustomers: 40, amount: 20 }, { fromCustomers: 700, amount: 35 }], freeTier: '3,000 emails a month, 100 a day.', note: 'About 70 emails per workspace per month (digests, deal won, task reminders, invites, exports for about 6 members). Free covers about 40 workspaces; Pro $20 for 50,000 covers about 700; then about $35 for 100,000 [verify the tier]. Checked Oct 2026.', url: 'https://resend.com/pricing' },
      { name: 'Product analytics', vendor: 'PostHog', kind: 'fixed', amount: 0, freeTier: '1 million events and 5,000 session replays a month free.', note: 'Free tier covers the first few hundred workspaces. Checked Oct 2026.', url: 'https://posthog.com/pricing' },
      { name: 'Domain', vendor: 'Porkbun', kind: 'fixed', amount: 1, note: 'A .com is about $11 a year, shown as $1 a month. Add about $2/month for two cold email lookalike domains if you run outbound.', url: 'https://porkbun.com' },
    ],
    notes: [
      'Usage is call minutes on Etcher numbers per workspace per month. Workspaces on their own Twilio account or SIP carrier pay their carrier, so their minutes cost you $0.',
      'Variable cost per minute is about $0.0195 (calls $0.017 + recording $0.0025).',
      'Monthly plan at the default 600 minutes: about $11.70 minutes + $2.35 numbers and storage = about $14 against $149, about 87% gross margin after Stripe fees (about $5.60).',
      'Monthly plan at the 1,000 minute cap: about $19.50 + $2.35 = about $22, about 81% gross margin after Stripe fees.',
      'Annual plan is $79/month equivalent: about 78% margin at 600 minutes and about 69% at the 1,000 minute cap. Heavy callers should buy minute packs ($39 per 1,000 minutes, about $19.50 cost, 50% margin) or bring their own Twilio.',
      'UK-heavy teams calling mobiles cost about twice as much per minute [verify]. Watch cost_micros in usage_ledger per workspace and lower the included minutes for UK-only plans if margin falls under 70%.',
      'Stripe fees are added by the calculator, not listed here.',
    ],
  },
  content: {
    buildPrd: buildPrd1 + buildPrd2,
    designPrd,
    landingPrd,
    sql,
    edgeFunctions,
    frontendTasks,
    backendTasks,
    securityTasks,
    marketing: { outbound, inbound, paid },
    launchTasks,
    repoTree,
    starterFiles,
  },
}
