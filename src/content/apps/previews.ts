// Preview app: Closebook (retired, replaced by Etcher; filtered out in index.ts).
// Shared steps (Claude Code, Supabase, Stripe, GitHub, Vercel, Porkbun, generic security)
// come from the shared phases. These fill only the app-specific content.

import type { AppDef } from '../types'

/* ------------------------------------------------------------------ */
/* CLOSEBOOK                                                           */
/* ------------------------------------------------------------------ */

const cbBuildPrd = `# Closebook: build PRD

## 1. Problem
Agencies and freelancers lose deals because follow-ups live in their head, in a sticky note,
or in a spreadsheet nobody opens. HubSpot and Pipedrive feel like flying a plane to cross the road.
They want one board, one list of people, and a nudge when someone has gone quiet.

## 2. Ideal customer (ICP)
- Solo freelancers (designers, developers, copywriters) with 5 to 40 live conversations.
- Small agencies (2 to 10 people) where the founder still sells.
- They already pay for Notion or a spreadsheet and hate it for sales.
- They will pay $29/month if it wins back one deal a quarter.

## 3. Core job
"Show me every deal, tell me who to chase today, and write the chase email for me."

## 4. Pages
| Route | What it does |
|---|---|
| \`/\` | Marketing landing page with pricing and a "Start free trial" button |
| \`/login\`, \`/signup\` | Supabase email + password auth |
| \`/app\` | Pipeline board: columns Lead, Contacted, Proposal, Negotiating, Won, Lost |
| \`/app/deals/[id]\` | Deal page: value, stage, contact, notes timeline, next follow-up date, AI draft panel |
| \`/app/contacts\` | Searchable contacts table with company, email, last touched |
| \`/app/contacts/[id]\` | Contact page with every deal and note for that person |
| \`/app/today\` | "Chase today" list: every deal whose follow-up date is today or overdue |
| \`/app/settings\` | Name, sending name, reminder time, timezone, billing (Stripe Customer Portal) |

## 5. Main flows
1. Sign up, land on an empty board with three sample deals (deletable).
2. Add a deal: title, value, contact (pick or create), stage, follow-up date.
3. Drag a card between columns. Stage and \`stage_changed_at\` update instantly (optimistic UI).
4. Add a note on a deal ("Called, wants pricing by Friday").
5. Click "Draft follow-up". Claude reads the deal, the contact and the last 10 notes and writes a
   short email. User edits, copies, or opens it in their mail app with a \`mailto:\` link.
6. Every morning at the user's reminder time, they get one email listing today's chases.

## 6. Data model
- \`profiles\`: id (auth.users), full_name, sender_name, timezone, reminder_hour (0 to 23), created_at.
- \`contacts\`: id, user_id, name, email, company, phone, notes, last_touched_at, created_at.
- \`deals\`: id, user_id, contact_id, title, value_cents, currency, stage, position,
  follow_up_on (date), stage_changed_at, closed_at, created_at.
- \`deal_notes\`: id, user_id, deal_id, body, kind ('note' | 'call' | 'email' | 'ai_draft'), created_at.
- \`reminder_log\`: id, user_id, sent_on (date), deal_count. Unique (user_id, sent_on) stops double sends.
- \`subscriptions\`: user_id, stripe_customer_id, stripe_subscription_id, status, price_id,
  current_period_end, trial_end, updated_at.
- \`stripe_events\`: id (Stripe event id), type, received_at. Used to ignore duplicate webhooks.

Stages are a Postgres check constraint, not a table. Keep it simple.

## 7. Edge functions
1. \`cb-draft-followup\`: browser calls it with a deal id. Checks the user with \`getClaims()\`,
   loads the deal, contact and notes with RLS, calls Claude, saves the draft as a \`deal_notes\`
   row with kind \`ai_draft\`, returns the text.
2. \`cb-daily-reminders\`: runs hourly from Supabase Cron. Finds users whose local hour equals
   their \`reminder_hour\`, who have an active or trialing subscription and at least one due deal,
   and who have no \`reminder_log\` row for today. Sends one Resend email each.
3. \`stripe-webhook\`: shared step. Writes \`subscriptions\`.

## 8. Access rules
- Every app page checks \`subscriptions.status in ('trialing','active')\`.
  If not, redirect to \`/app/settings?billing=1\` with a "Pick up where you left off" card.
- Every table is scoped by \`user_id = auth.uid()\` with RLS per operation.
- The AI draft function refuses if the deal does not belong to the caller.

## 9. Claude usage
- Model: \`claude-opus-5-5\`. One call per click. \`max_tokens\` 1200.
- Average draft is about 1,500 input tokens and 250 output tokens. Roughly $0.011 per draft.
- Rate limit: 40 drafts per user per day, counted from \`deal_notes\` where kind = 'ai_draft'.

## 10. Emails (Resend)
- Welcome email on signup.
- Daily "Chase today" digest: subject "3 people to chase today", one line per deal with a link.
- Trial ending email 2 days before \`trial_end\`.

## 11. Out of scope (v1)
- Teams and shared pipelines.
- Sending email from inside the app (we draft, they send).
- Gmail or Outlook inbox sync.
- Custom stages, custom fields, CSV import (v2 candidates).
- Mobile app. The web app must work on a phone, that is enough.

## 12. Milestones
1. **M1, skeleton (2h):** Next.js app, Supabase auth, profiles trigger, protected \`/app\` layout.
2. **M2, board (3h):** deals and contacts CRUD, drag and drop board with dnd-kit, deal page.
3. **M3, notes + today (2h):** notes timeline, \`/app/today\` list, overdue badges on cards.
4. **M4, AI drafts (1.5h):** \`cb-draft-followup\` edge function and the draft panel.
5. **M5, reminders (1.5h):** \`cb-daily-reminders\` plus Supabase Cron schedule plus Resend template.
6. **M6, billing + launch (2h):** Stripe Checkout with 7-day trial, webhook, portal, landing page.

## 13. Definition of done
- A new user can sign up, add a deal, drag it to Proposal, draft a follow-up and pay.
- User A cannot see, edit or draft for User B's deals (tested in the security phase).
- The daily reminder arrives once, at the right local hour, and never twice.
`

const cbDesignPrd = `# Closebook: design PRD

## Feel
Calm, tidy, a little bit warm. Like a clean desk with a green plant on it.
Nothing flashy. The board is the hero.

## Tokens
| Token | Value | Use |
|---|---|---|
| \`--bg\` | #F7F8F5 | App background |
| \`--surface\` | #FFFFFF | Cards, panels |
| \`--ink\` | #17201A | Main text |
| \`--muted\` | #5E6B62 | Secondary text |
| \`--line\` | #E2E6DF | Borders |
| \`--brand\` | #1F7A4D | Buttons, active column, links |
| \`--brand-soft\` | #E3F2E9 | Selected states, Won column tint |
| \`--warn\` | #B5571B | Overdue badge |
| \`--radius\` | 10px | Cards and inputs |

Font: Inter for everything. Numbers on cards use \`font-variant-numeric: tabular-nums\`.
Dark mode: bg #0F1411, surface #161D18, ink #E8EEE9, brand #3FB27A.

## Screens
### Pipeline board (\`/app\`)
- Top bar: logo, "Today (4)" pill, search, "New deal" button.
- Six columns, each with name, deal count and total value (e.g. "Proposal · 3 · $8,400").
- Cards: title, contact name, value, follow-up date. Overdue date shows in \`--warn\` with a dot.
- Drag a card: it lifts with a 2px shadow and tilts 1 degree. Drop target column gets \`--brand-soft\`.
- Empty column: dashed outline and the text "Drag a deal here".

### Deal page
- Left (2/3): title, value, stage select, follow-up date picker, notes timeline (newest first).
- Right (1/3): contact card, then the "Draft follow-up" panel.
- Draft panel: tone select (Friendly, Direct, Short), "Draft" button, editable textarea,
  buttons "Copy" and "Open in mail app". Show a skeleton shimmer while Claude writes.

### Today
- One list, sorted by most overdue. Each row: contact, deal, days overdue, "Draft" button.
- Zero state: a small green tick illustration and "Nobody to chase today. Nice."

### Contacts
- shadcn Table with search. Click a row to open the contact page.

## Components (shadcn/ui)
Button, Card, Dialog (new deal), Input, Textarea, Select, Popover + Calendar (date picker),
Table, Badge, Skeleton, Sonner toasts, DropdownMenu (card actions: edit, move, delete).

## Motion
- Card drag: transform only, 150ms ease-out on drop.
- Toasts: "Deal moved to Won. Nice one." when a deal hits Won, with a small confetti burst (canvas-confetti, 60 particles).
- Respect \`prefers-reduced-motion\`: no tilt, no confetti.

## Onboarding
1. After signup: one-screen modal "What do you sell?" with three choices
   (Design, Development, Marketing, Other). Used to seed three sample deals.
2. Coach mark on the first card: "Drag me to Proposal."
3. Coach mark on the Draft button the first time they open a deal.

## Auth pages
- Centred card on \`--bg\`, logo above, max width 400px.
- Signup asks for email and password only. "Confirm email" is off, so they land on the board.
- Below the form: "7 days free. No card needed to look around." (card is collected at Checkout).

## Landing page
- Hero: "The CRM that tells you who to chase today." Subline: "Pipeline board, contacts and
  AI follow-up drafts for freelancers and small agencies. $29/month."
- Screenshot of the board, three feature rows, pricing card, FAQ (4 questions), footer.

## Accessibility
- Every drag action also has a keyboard path: card menu, "Move to...".
- Colour is never the only signal: overdue also shows the word "Overdue".
- Contrast at least 4.5:1 on text.
`

const cbSql = `-- Closebook schema. Paste into Supabase: SQL Editor, New query, Run.

-- 1. Profiles + trigger
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  sender_name text,
  timezone text not null default 'Europe/London',
  reminder_hour int not null default 8 check (reminder_hour between 0 and 23),
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 2. App tables
create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  email text,
  company text,
  phone text,
  notes text,
  last_touched_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists contacts_user_idx on public.contacts (user_id);

create table if not exists public.deals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  contact_id uuid references public.contacts (id) on delete set null,
  title text not null,
  value_cents bigint not null default 0,
  currency text not null default 'usd',
  stage text not null default 'lead'
    check (stage in ('lead','contacted','proposal','negotiating','won','lost')),
  position int not null default 0,
  follow_up_on date,
  stage_changed_at timestamptz not null default now(),
  closed_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists deals_user_stage_idx on public.deals (user_id, stage, position);
create index if not exists deals_follow_up_idx on public.deals (user_id, follow_up_on);

create table if not exists public.deal_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  deal_id uuid not null references public.deals (id) on delete cascade,
  body text not null,
  kind text not null default 'note' check (kind in ('note','call','email','ai_draft')),
  created_at timestamptz not null default now()
);
create index if not exists deal_notes_deal_idx on public.deal_notes (deal_id, created_at desc);

create table if not exists public.reminder_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  sent_on date not null,
  deal_count int not null default 0,
  unique (user_id, sent_on)
);

-- 3. Billing
create table if not exists public.subscriptions (
  user_id uuid primary key references auth.users (id) on delete cascade,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  status text not null default 'incomplete',
  price_id text,
  current_period_end timestamptz,
  trial_end timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.stripe_events (
  id text primary key,
  type text not null,
  received_at timestamptz not null default now()
);

-- 4. Row Level Security
alter table public.profiles enable row level security;
alter table public.contacts enable row level security;
alter table public.deals enable row level security;
alter table public.deal_notes enable row level security;
alter table public.reminder_log enable row level security;
alter table public.subscriptions enable row level security;
alter table public.stripe_events enable row level security;

create policy "profiles select own" on public.profiles for select to authenticated
  using (id = (select auth.uid()));
create policy "profiles update own" on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy "contacts select own" on public.contacts for select to authenticated
  using (user_id = (select auth.uid()));
create policy "contacts insert own" on public.contacts for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "contacts update own" on public.contacts for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "contacts delete own" on public.contacts for delete to authenticated
  using (user_id = (select auth.uid()));

create policy "deals select own" on public.deals for select to authenticated
  using (user_id = (select auth.uid()));
create policy "deals insert own" on public.deals for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "deals update own" on public.deals for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "deals delete own" on public.deals for delete to authenticated
  using (user_id = (select auth.uid()));

create policy "notes select own" on public.deal_notes for select to authenticated
  using (user_id = (select auth.uid()));
create policy "notes insert own" on public.deal_notes for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.deals d where d.id = deal_id and d.user_id = (select auth.uid()))
  );
create policy "notes update own" on public.deal_notes for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "notes delete own" on public.deal_notes for delete to authenticated
  using (user_id = (select auth.uid()));

create policy "reminder_log select own" on public.reminder_log for select to authenticated
  using (user_id = (select auth.uid()));

create policy "subscriptions select own" on public.subscriptions for select to authenticated
  using (user_id = (select auth.uid()));
-- subscriptions and stripe_events are written only by the webhook with the secret key.
-- stripe_events has no policies on purpose: nobody in the browser can read or write it.
`

const cbRepoTree = `closebook/
├── app/
│   ├── (marketing)/page.tsx
│   ├── (auth)/login/page.tsx
│   ├── (auth)/signup/page.tsx
│   ├── app/layout.tsx
│   ├── app/page.tsx              # pipeline board
│   ├── app/today/page.tsx
│   ├── app/deals/[id]/page.tsx
│   ├── app/contacts/page.tsx
│   ├── app/contacts/[id]/page.tsx
│   ├── app/settings/page.tsx
│   └── api/stripe/checkout/route.ts
├── components/
│   ├── board/Board.tsx
│   ├── board/DealCard.tsx
│   ├── deals/DraftPanel.tsx
│   └── ui/                       # shadcn components
├── lib/
│   ├── supabase/client.ts
│   ├── supabase/server.ts
│   └── access.ts                 # hasAccess(status)
├── supabase/
│   ├── migrations/0001_closebook.sql
│   └── functions/
│       ├── cb-draft-followup/index.ts
│       ├── cb-daily-reminders/index.ts
│       └── stripe-webhook/index.ts
├── docs/
│   ├── BUILD_PRD.md
│   └── DESIGN_PRD.md
├── .env.example
└── README.md`

export const closebook: AppDef = {
  slug: 'closebook',
  name: 'Closebook',
  tagline: 'The CRM that chases for you',
  oneLiner: 'A pipeline board, contacts and AI-written follow-ups for freelancers and small agencies.',
  category: 'business',
  art: { motif: 'kanban', tone: 'green' },
  price: { monthly: 29, trialDays: 7 },
  difficulty: 1,
  buildHours: 12,
  apis: [
    {
      name: 'Claude API',
      job: 'writes short follow-up emails from the deal, the contact and the last notes',
      signupUrl: 'https://platform.claude.com',
      docsUrl: 'https://platform.claude.com/docs',
      pricing: 'Pay as you go. claude-opus-5-5 is $4 per million input tokens and $20 per million output tokens, so one draft costs about 1 cent. Add $5 of credit to start.',
      envVars: [
        { name: 'ANTHROPIC_API_KEY', where: 'platform.claude.com → Settings → API keys → Create key', pasteInto: 'Supabase secrets', secret: true },
      ],
    },
  ],
  idealFor: 'Freelancers and small agency owners who sell services and keep losing track of who to follow up with.',
  whyItSells: 'Most freelancers have 5 to 40 open conversations and no system. If Closebook wins back one $1,500 project a year, the $348 annual cost pays for itself four times over.',
  features: [
    'Drag and drop pipeline board with deal values per column',
    'Contacts with every deal and note in one place',
    'Follow-up dates with an overdue "Chase today" list',
    'Daily reminder email at the hour you pick',
    'One-click Claude follow-up drafts in three tones',
    'Notes timeline per deal (calls, emails, notes)',
  ],
  status: 'preview',
  content: {
    buildPrd: cbBuildPrd,
    designPrd: cbDesignPrd,
    sql: cbSql,
    edgeFunctions: [
      {
        name: 'cb-draft-followup',
        purpose: 'Writes a follow-up email draft for one deal with Claude and saves it as a note.',
        trigger: 'Called by the browser when the user clicks "Draft follow-up" on a deal page',
        secrets: ['ANTHROPIC_API_KEY'],
        prompt: `Create a Supabase edge function at \`supabase/functions/cb-draft-followup/index.ts\`.

It receives POST JSON \`{ dealId: string, tone: 'friendly' | 'direct' | 'short' }\` with the user's
Authorization header.

Steps:
1. Create a Supabase client with the SUPABASE_URL, the publishable key and the caller's
   Authorization header, so every query runs under RLS. Call \`supabase.auth.getClaims()\`.
   If there is no user, return 401.
2. Check \`subscriptions.status\` is 'trialing' or 'active' for this user, else return 402.
3. Count \`deal_notes\` rows with kind 'ai_draft' created today for this user. If 40 or more, return 429
   with \`{ error: 'Daily draft limit reached' }\`.
4. Load the deal (title, value_cents, stage, follow_up_on, stage_changed_at), its contact
   (name, company) and the last 10 notes. If the deal is not found, return 404.
5. Call Claude with the official \`@anthropic-ai/sdk\` (import via \`npm:@anthropic-ai/sdk\`),
   model \`claude-opus-5-5\`, max_tokens 1200, output_config effort 'low', and this system prompt:

"You write follow-up emails for freelancers and small agency owners. Write like a busy,
friendly professional, not a salesperson. Rules: under 110 words. One clear ask, usually a
yes/no question or a time to talk. Reference one specific detail from the notes so it is
clearly not a template. No 'checking in', no 'circling back', no 'I hope this finds you well'.
No exclamation marks. Plain text only. Start with 'Subject: ' on the first line, then a blank line,
then the body, then the sender's first name."

   The user message lists: sender name (from profiles.sender_name), tone, contact name and company,
   deal title, value, stage, days since last stage change, and the notes oldest to newest.
6. Read the text block from the response. Insert it into \`deal_notes\` with kind 'ai_draft'.
7. Return \`{ draft }\`. Handle CORS (OPTIONS preflight) for the app origin.

Then deploy it with the Supabase MCP and tell me which secret to set.`,
      },
      {
        name: 'cb-daily-reminders',
        purpose: 'Sends each user one "Chase today" email at their chosen local hour.',
        trigger: 'Supabase Cron, every hour on the hour',
        secrets: ['RESEND_API_KEY', 'CRON_SECRET', 'APP_URL'],
        prompt: `Create a Supabase edge function at \`supabase/functions/cb-daily-reminders/index.ts\`.

It is called hourly by Supabase Cron with header \`x-cron-secret\`. Reject with 401 if it does not
match the CRON_SECRET env var.

Use the Supabase secret key (server only) so it can read every user. Steps:
1. Load profiles with timezone and reminder_hour, joined to subscriptions where status is
   'trialing' or 'active'.
2. For each profile, work out the current hour in their timezone with \`Intl.DateTimeFormat\`.
   Skip if it does not equal reminder_hour.
3. Work out "today" in their timezone. Skip if \`reminder_log\` already has (user_id, today).
4. Load deals where follow_up_on <= today and stage not in ('won','lost'), with contact name.
   Skip if zero.
5. Send one email with Resend from "Closebook <reminders@YOURDOMAIN>". Subject:
   "N people to chase today". Body: a plain HTML list, one line per deal: contact, deal title,
   "X days overdue" if overdue, linking to APP_URL/app/deals/<id>. Footer link to settings.
6. Insert the reminder_log row. Use insert with on conflict do nothing so a retry never double sends.

Then write the SQL to schedule it with pg_cron + pg_net every hour, reading the function URL and
CRON_SECRET from Supabase Vault, and run it with the Supabase MCP.`,
      },
    ],
    frontendTasks: [
      {
        id: 'cb-fe-board',
        title: 'Build the pipeline board',
        outcome: 'A drag and drop board where every deal lives, with totals per column.',
        minutes: 60,
        xp: 50,
        blocks: [
          { type: 'callout', tone: 'eli5', title: 'What is a pipeline board?', text: 'Picture six boxes on a table, labelled Lead to Won. Each deal is a card you slide from box to box as it gets closer to a yes. The board shows you at a glance where your money is stuck.' },
          { type: 'p', text: 'You will ask Claude Code to build the board with **dnd-kit**, a small library that handles dragging. Card moves save to Supabase straight away.' },
          {
            type: 'prompt',
            id: 'cb-fe-board-prompt',
            title: 'Paste into Claude Code',
            code: `Read docs/BUILD_PRD.md and docs/DESIGN_PRD.md.

Build the pipeline board at app/app/page.tsx:
- Six columns from the deals.stage check constraint: lead, contacted, proposal, negotiating, won, lost.
- Each column header shows the name, the count and the total value (format with Intl.NumberFormat, USD).
- Cards show title, contact name, value and follow_up_on. Overdue dates use the --warn token and the word "Overdue".
- Use @dnd-kit/core and @dnd-kit/sortable. On drop, update stage, position and stage_changed_at in Supabase.
  Update the UI first (optimistic), and roll back with a Sonner toast if the update fails.
- When a card lands in "won", set closed_at and show the "Deal moved to Won. Nice one." toast with canvas-confetti
  (skip confetti if prefers-reduced-motion).
- Card DropdownMenu with Edit, Move to..., Delete, so the board works with a keyboard.
- "New deal" Dialog: title, value, contact (combobox that can create a new contact), stage, follow-up date.
Use the browser Supabase client with the publishable key. RLS does the scoping, do not filter by user id in the client only.`,
          },
          { type: 'steps', items: ['Run `npm run dev` in a second terminal tab.', 'Open http://localhost:3000/app and log in.', 'Create two deals and drag one to Proposal.', 'Refresh the page. The card must still be in Proposal.'] },
          { type: 'mistakes', items: [
            { mistake: 'Cards jump back after a refresh.', fix: 'The update is not saving. Ask Claude Code: "Card moves do not persist after refresh. Check the Supabase update call and the RLS update policy on deals."' },
            { mistake: 'Dragging is jittery on a phone.', fix: 'Ask Claude Code to add a TouchSensor with a 150ms delay to the dnd-kit sensors.' },
          ] },
        ],
        checklist: [
          { id: 'cb-fe-board-c1', label: 'Copy the board prompt into Claude Code', trigger: 'copy:cb-fe-board-prompt' },
          { id: 'cb-fe-board-c2', label: 'Create two test deals' },
          { id: 'cb-fe-board-c3', label: 'Drag a deal and refresh to check it saved' },
          { id: 'cb-fe-board-c4', label: 'Move a deal to Won and see the toast' },
        ],
      },
      {
        id: 'cb-fe-deal',
        title: 'Build the deal page and AI draft panel',
        outcome: 'Each deal has notes, a follow-up date and a button that writes the chase email.',
        minutes: 45,
        xp: 40,
        blocks: [
          { type: 'p', text: 'The deal page is where users spend their time after the board. The draft panel calls the `cb-draft-followup` edge function you build in the Backend phase.' },
          {
            type: 'prompt',
            id: 'cb-fe-deal-prompt',
            title: 'Paste into Claude Code',
            code: `Build app/app/deals/[id]/page.tsx and app/app/today/page.tsx from the design PRD.

Deal page:
- Left: editable title, value, stage Select, follow-up date (shadcn Popover + Calendar), notes timeline newest first.
  Add-note form with a kind Select (note, call, email). ai_draft notes show a small "AI draft" Badge.
- Right: contact card, then components/deals/DraftPanel.tsx.
- DraftPanel: tone Select (Friendly, Direct, Short), "Draft follow-up" button that calls
  supabase.functions.invoke('cb-draft-followup', { body: { dealId, tone } }).
  Show a Skeleton while waiting. Put the result in an editable Textarea with "Copy" and
  "Open in mail app" (mailto: link with subject and body split from the first "Subject: " line).
  Show friendly messages for 402 (trial ended), 429 (daily limit) and other errors.

Today page: every open deal with follow_up_on <= today, sorted most overdue first, each row with a Draft button
that opens the deal page with the panel focused. Zero state: "Nobody to chase today. Nice."`,
          },
          { type: 'callout', tone: 'tip', title: 'Test before the backend exists', text: 'Until the edge function is deployed the Draft button will show an error. That is expected. Build the page now and come back after the Backend phase.' },
          { type: 'steps', items: ['Open a deal from the board.', 'Add a note: "Sent proposal, they want it before the 20th."', 'Set the follow-up date to yesterday.', 'Open /app/today and check the deal is listed as overdue.'] },
        ],
        checklist: [
          { id: 'cb-fe-deal-c1', label: 'Copy the deal page prompt into Claude Code', trigger: 'copy:cb-fe-deal-prompt' },
          { id: 'cb-fe-deal-c2', label: 'Add a note to a deal' },
          { id: 'cb-fe-deal-c3', label: 'Check an overdue deal appears on /app/today' },
        ],
      },
    ],
    backendTasks: [
      {
        id: 'cb-be-claude',
        title: 'Get your Claude API key and deploy the draft function',
        outcome: 'The "Draft follow-up" button writes real emails.',
        minutes: 25,
        xp: 40,
        blocks: [
          { type: 'callout', tone: 'eli5', title: 'Why an API key?', text: 'Claude Code is Claude helping you build. The Claude API is Claude working inside your app for your customers. The key is a password that lets your app ask Claude for drafts and get billed for it.' },
          { type: 'steps', items: [
            'Go to platform.claude.com and sign up with your email.',
            'Click Settings → Billing → Add credit, and add $5.',
            'Click Settings → API keys → Create key. Name it "closebook-prod". Copy it now, you only see it once.',
            'In Supabase: Edge Functions → Secrets → Add new secret. Name `ANTHROPIC_API_KEY`, paste the key, Save.',
          ] },
          { type: 'keys', rows: [
            { name: 'ANTHROPIC_API_KEY', where: 'platform.claude.com → Settings → API keys', pasteInto: 'Supabase secrets', secret: true },
            { name: 'CRON_SECRET', where: 'Make one up: run `openssl rand -hex 24` in a terminal', pasteInto: 'Supabase secrets', secret: true },
            { name: 'APP_URL', where: 'Your live URL, e.g. https://closebook.app', pasteInto: 'Supabase secrets', secret: false },
          ] },
          { type: 'prompt', id: 'cb-be-claude-prompt', title: 'Paste into Claude Code', code: `Build and deploy the cb-draft-followup and cb-daily-reminders edge functions exactly as described in docs/BUILD_PRD.md section 7.
Use the Supabase MCP to deploy both, then schedule cb-daily-reminders hourly with pg_cron.
When done, call cb-draft-followup once for one of my deals and show me the draft it returned.` },
          { type: 'links', items: [
            { label: 'Claude Console', url: 'https://platform.claude.com' },
            { label: 'Claude API docs', url: 'https://platform.claude.com/docs' },
          ] },
        ],
        checklist: [
          { id: 'cb-be-claude-c1', label: 'Create a Claude API key and add $5 credit' },
          { id: 'cb-be-claude-c2', label: 'Add ANTHROPIC_API_KEY, CRON_SECRET and APP_URL to Supabase secrets' },
          { id: 'cb-be-claude-c3', label: 'Copy the deploy prompt into Claude Code', trigger: 'copy:cb-be-claude-prompt' },
          { id: 'cb-be-claude-c4', label: 'Click Draft follow-up on a deal and read the result' },
        ],
      },
    ],
    securityTasks: [
      {
        id: 'cb-sec-drafts',
        title: 'Try to draft for someone else\'s deal',
        outcome: 'Proof that one customer can never read or use another customer\'s pipeline.',
        minutes: 20,
        xp: 35,
        blocks: [
          { type: 'callout', tone: 'eli5', title: 'What are we testing?', text: 'Your customers trust you with their client list. We pretend to be a nosy second customer and try to peek at the first one. Every attempt must fail.' },
          { type: 'steps', items: [
            'Sign up as user A in a normal window. Create a deal and copy its id from the URL.',
            'Sign up as user B in a private window.',
            'As user B, open /app/deals/<A\'s deal id>. You must see "Not found".',
            'Paste the prompt below into Claude Code to run the API-level checks.',
          ] },
          { type: 'prompt', id: 'cb-sec-drafts-prompt', title: 'Paste into Claude Code', code: `Write and run a script scripts/security-check.ts that signs in as two test users (A and B) with the publishable key and checks:
1. B selecting A's deals, contacts and deal_notes returns zero rows.
2. B updating A's deal stage affects zero rows.
3. B inserting a deal_note with A's deal_id is rejected by RLS.
4. B calling cb-draft-followup with A's dealId returns 404 and creates no note.
5. Calling cb-daily-reminders without x-cron-secret returns 401.
Print PASS or FAIL for each line. Fix anything that fails and run it again.` },
          { type: 'mistakes', items: [
            { mistake: 'Check 3 passes when it should fail.', fix: 'The notes insert policy is missing the deal ownership check. Re-run the notes insert policy from the SQL migration.' },
          ] },
        ],
        checklist: [
          { id: 'cb-sec-drafts-c1', label: 'Open user A\'s deal URL as user B and see Not found' },
          { id: 'cb-sec-drafts-c2', label: 'Copy the security prompt into Claude Code', trigger: 'copy:cb-sec-drafts-prompt' },
          { id: 'cb-sec-drafts-c3', label: 'See PASS on all five checks' },
        ],
      },
    ],
    marketing: {
      outbound: [
        {
          id: 'cb-mk-out-agencies',
          title: 'Cold email 50 small agencies',
          outcome: 'A list of 50 agency owners and a short email that books trials.',
          minutes: 90,
          xp: 50,
          blocks: [
            { type: 'p', text: 'Agencies with 2 to 10 staff are the sweet spot: the founder still sells and nobody owns the CRM. Find them on Clutch.co and LinkedIn.' },
            { type: 'steps', items: [
              'Go to clutch.co, pick a category (e.g. Web Design), filter by your country and "2 to 9 employees".',
              'Open 50 listings. Copy agency name, founder name and website into a Google Sheet.',
              'Find each founder\'s email with the free tier of Hunter.io or Apollo.',
              'Send 10 emails a day from your own inbox using the template below. Change the first line each time.',
            ] },
            { type: 'code', id: 'cb-mk-out-agencies-email', filename: 'cold-email.txt', lang: 'txt', code: `Subject: who are you chasing this week?

Hi {first_name},

Saw {agency} did the {project they show off}. Lovely work.

Quick one: when a lead goes quiet after a proposal, how do you remember to chase them?
I built Closebook for small agencies: a pipeline board that emails you every morning with
who to follow up, and writes the follow-up for you.

Worth a 7-day free try? I can set your first pipeline up with you on a 10 minute call.

{your_name}` },
            { type: 'callout', tone: 'tip', title: 'Reply rate target', text: 'Aim for 5 to 10 percent replies. Below 3 percent, rewrite the first line, not the offer.' },
          ],
          checklist: [
            { id: 'cb-mk-out-agencies-c1', label: 'Build a sheet of 50 agency founders' },
            { id: 'cb-mk-out-agencies-c2', label: 'Copy the cold email template', trigger: 'copy:cb-mk-out-agencies-email' },
            { id: 'cb-mk-out-agencies-c3', label: 'Send the first 10 emails' },
          ],
        },
        {
          id: 'cb-mk-out-communities',
          title: 'DM freelancers in communities you already belong to',
          outcome: '20 warm conversations with freelancers who match the ICP.',
          minutes: 60,
          xp: 35,
          blocks: [
            { type: 'p', text: 'Freelancers hang out in Slack groups, Discords and Skool communities. Do not spam the feed. Help first, then DM people who post about sales or chasing clients.' },
            { type: 'steps', items: [
              'Search each community for "follow up", "ghosted", "proposal" and "CRM".',
              'Reply helpfully to 5 of those posts with real advice. No link.',
              'DM the people who replied or liked your answer with the message below.',
            ] },
            { type: 'code', id: 'cb-mk-out-communities-dm', filename: 'dm.txt', lang: 'txt', code: `Hey {name}, saw your post about clients going quiet after a proposal. I had the same problem so I built a tiny CRM that emails me every morning with who to chase and drafts the follow-up. Want a free week on it? Happy to hear what is missing.` },
          ],
          checklist: [
            { id: 'cb-mk-out-communities-c1', label: 'Reply helpfully to 5 posts about chasing clients' },
            { id: 'cb-mk-out-communities-c2', label: 'Copy the DM template', trigger: 'copy:cb-mk-out-communities-dm' },
            { id: 'cb-mk-out-communities-c3', label: 'Send 20 DMs' },
          ],
        },
      ],
      inbound: [
        {
          id: 'cb-mk-in-template',
          title: 'Publish a free follow-up email template pack',
          outcome: 'A lead magnet page that collects emails from freelancers searching for follow-up templates.',
          minutes: 60,
          xp: 40,
          blocks: [
            { type: 'p', text: 'People search "follow up email after proposal" thousands of times a month. Give them 10 good templates for free and put Closebook under it.' },
            { type: 'prompt', id: 'cb-mk-in-template-prompt', title: 'Paste into Claude Code', code: `Add a page at app/(marketing)/follow-up-templates/page.tsx titled "10 follow-up emails for freelancers that do not sound desperate".
Write 10 short templates (after proposal, after no reply, after a call, after a price objection, after "not right now", etc.),
each under 90 words with a copy button. Add metadata title and description for SEO.
Under the templates add a Closebook card: "Want these written for you, with the client's details filled in? Try Closebook free for 7 days."` },
            { type: 'steps', items: ['Deploy to Vercel.', 'Share the page in two communities as a free resource.', 'Add the link to your email signature.'] },
          ],
          checklist: [
            { id: 'cb-mk-in-template-c1', label: 'Copy the template page prompt', trigger: 'copy:cb-mk-in-template-prompt' },
            { id: 'cb-mk-in-template-c2', label: 'Deploy the page and open it live' },
            { id: 'cb-mk-in-template-c3', label: 'Share it in two communities' },
          ],
        },
        {
          id: 'cb-mk-in-video',
          title: 'Record a 60 second "who to chase today" demo',
          outcome: 'One short video you can post on LinkedIn, X and YouTube Shorts.',
          minutes: 45,
          xp: 30,
          blocks: [
            { type: 'p', text: 'Show the morning email arriving, click a deal, hit Draft, copy the email. That is the whole pitch.' },
            { type: 'steps', items: [
              'Fill a demo account with 8 realistic deals.',
              'Record your screen with Loom or the macOS screenshot tool (Cmd + Shift + 5).',
              'Script: "Every morning Closebook tells me who to chase. Here is today. One click, and the follow-up is written."',
              'Post it with the caption below.',
            ] },
            { type: 'code', id: 'cb-mk-in-video-caption', filename: 'caption.txt', lang: 'txt', code: `I kept losing freelance projects because I forgot to follow up.
So I built a CRM that emails me who to chase every morning and writes the email.
7 days free: {your_url}` },
          ],
          checklist: [
            { id: 'cb-mk-in-video-c1', label: 'Record the 60 second demo' },
            { id: 'cb-mk-in-video-c2', label: 'Copy the caption', trigger: 'copy:cb-mk-in-video-caption' },
            { id: 'cb-mk-in-video-c3', label: 'Post on two platforms' },
          ],
        },
      ],
      paid: [
        {
          id: 'cb-mk-paid-linkedin',
          title: 'Run a $100 LinkedIn test to agency founders',
          outcome: 'A clear answer on whether paid LinkedIn brings trials at under $30 each.',
          minutes: 45,
          xp: 40,
          blocks: [
            { type: 'callout', tone: 'warn', title: 'Small budget, hard stop', text: 'Set a $100 lifetime budget. If you get zero trials by the end, turn it off and go back to outbound.' },
            { type: 'steps', items: [
              'Go to linkedin.com/campaignmanager and create an account.',
              'Create campaign → Objective: Website visits.',
              'Audience: Job titles "Founder", "Owner", "Managing Director". Industries: Marketing Services, Design Services, IT Services. Company size: 2 to 10.',
              'Format: Single image. Use a screenshot of the board.',
              'Paste the ad copy below. Set a $100 lifetime budget. Launch.',
            ] },
            { type: 'code', id: 'cb-mk-paid-linkedin-copy', filename: 'ad.txt', lang: 'txt', code: `Headline: Know who to chase every morning
Intro: Closebook is a simple CRM for small agencies. Pipeline board, follow-up reminders, and AI-written follow-ups. $29/month after a 7-day free trial.` },
          ],
          checklist: [
            { id: 'cb-mk-paid-linkedin-c1', label: 'Create a LinkedIn Campaign Manager account' },
            { id: 'cb-mk-paid-linkedin-c2', label: 'Copy the ad copy', trigger: 'copy:cb-mk-paid-linkedin-copy' },
            { id: 'cb-mk-paid-linkedin-c3', label: 'Launch with a $100 lifetime budget' },
          ],
        },
      ],
    },
    launchTasks: [
      {
        id: 'cb-launch-landing',
        title: 'Write the Closebook landing page',
        outcome: 'A landing page that explains the app in 5 seconds and starts trials.',
        minutes: 40,
        xp: 40,
        blocks: [
          { type: 'p', text: 'Your landing page has one job: get a freelancer to click "Start free trial". Lead with the pain (forgetting to follow up), show the board, state the price.' },
          { type: 'prompt', id: 'cb-launch-landing-prompt', title: 'Paste into Claude Code', code: `Build app/(marketing)/page.tsx from the landing page section of docs/DESIGN_PRD.md.
Hero: "The CRM that tells you who to chase today." Subline as in the PRD. Primary button "Start free trial" to /signup.
Sections: board screenshot (placeholder image at /public/board.png), three feature rows (Board, Morning reminder, AI drafts),
pricing card ($29/month, 7-day free trial, cancel any time), FAQ with 4 questions (Is my data private? Can I import contacts? Does it send emails for me? What happens after the trial?).
Add metadata, an Open Graph image and the DataFast script tag in the root layout.` },
          { type: 'steps', items: ['Take a screenshot of your board with demo data and save it as public/board.png.', 'Deploy and open the live page on your phone.', 'Ask a friend to explain what Closebook does after 5 seconds.'] },
        ],
        checklist: [
          { id: 'cb-launch-landing-c1', label: 'Copy the landing page prompt', trigger: 'copy:cb-launch-landing-prompt' },
          { id: 'cb-launch-landing-c2', label: 'Add a real board screenshot' },
          { id: 'cb-launch-landing-c3', label: 'Check the page on your phone' },
        ],
      },
    ],
    repoTree: cbRepoTree,
    starterFiles: [
      {
        path: 'README.md',
        content: `# Closebook

A simple CRM for freelancers and small agencies: pipeline board, contacts, deal notes,
daily follow-up reminders and AI-written follow-up drafts.

## Stack
Next.js (App Router) + Tailwind + shadcn/ui, Supabase (auth, Postgres, edge functions),
Stripe (7-day trial, then $29/month), Resend (emails), Claude API (drafts).

## Start
1. \`npm install\`
2. Copy \`.env.example\` to \`.env.local\` and fill it in.
3. Run \`supabase/migrations/0001_closebook.sql\` in the Supabase SQL editor.
4. \`npm run dev\` and open http://localhost:3000

## Docs
- \`docs/BUILD_PRD.md\`: what to build
- \`docs/DESIGN_PRD.md\`: how it looks
`,
      },
      {
        path: '.env.example',
        content: `# Browser-safe
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-REF.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxx
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Server only (never prefix with NEXT_PUBLIC_)
SUPABASE_SECRET_KEY=sb_secret_xxx
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_PRICE_ID=price_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# These live in Supabase secrets, listed here so you do not forget them
# ANTHROPIC_API_KEY=sk-ant-xxx
# RESEND_API_KEY=re_xxx
# CRON_SECRET=make-a-long-random-string
# APP_URL=https://yourdomain.com
`,
      },
    ],
  },
}
