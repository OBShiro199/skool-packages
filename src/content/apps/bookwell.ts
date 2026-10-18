// Bookwell: booking pages for local service businesses.
import type { AppDef } from '../types'

/* ------------------------------------------------------------------ */
/* BOOKWELL                                                            */
/* ------------------------------------------------------------------ */

const bwBuildPrd = `# Bookwell: build PRD

## 1. Problem
Barbers, personal trainers, tutors and massage therapists take bookings over Instagram DMs and
WhatsApp. They double book, forget to remind people, and lose 1 in 10 slots to no-shows.
Calendly is built for sales calls, not for a barber who needs a $10 deposit and a text reminder.

## 2. Ideal customer (ICP)
- Solo or 2-chair local service businesses: barbers, PTs, tutors, nail techs, massage, dog groomers.
- Already live in Google Calendar on their phone.
- Lose at least two appointments a month to no-shows.
- Will pay $19/month if it saves one no-show a month.

## 3. Core job
"Give me a link for my Instagram bio. People pick a slot, pay a deposit, get a text reminder,
and it lands in my Google Calendar."

## 4. Pages
| Route | Who | What it does |
|---|---|---|
| \`/\` | public | Landing page |
| \`/login\`, \`/signup\` | public | Supabase auth |
| \`/app\` | owner | Upcoming bookings list, today first |
| \`/app/services\` | owner | Services: name, minutes, price, deposit, buffer |
| \`/app/availability\` | owner | Weekly hours per weekday plus days off |
| \`/app/settings\` | owner | Business name, handle, timezone, Google connect, Stripe payouts, billing |
| \`/b/[handle]\` | public | Booking page: pick service, pick day, pick slot, enter name + phone |
| \`/b/[handle]/done\` | public | Confirmation after deposit is paid |
| \`/b/cancel/[token]\` | public | Customer cancels or reschedules from the SMS link |

## 5. Main flows
### Owner setup
1. Sign up, pick a handle (\`bookwell.app/b/faderoom\`), set timezone.
2. Add services (e.g. "Skin fade, 45 min, $35, $10 deposit").
3. Set weekly hours.
4. Connect Google Calendar (OAuth). Busy times from their calendar block slots.
5. Connect Stripe payouts (Stripe Connect, Standard accounts with direct charges) so deposits go straight to their own Stripe account and bank. Stripe charges the barber its normal card fee on each deposit. Bookwell pays no Connect fees.

### Customer booking
1. Opens \`/b/faderoom\`, picks service, day, slot.
2. Enters name and mobile number. Ticks "Text me a reminder".
3. Pays the deposit with Stripe Checkout on the owner's connected account.
4. Stripe webhook confirms payment, booking becomes \`confirmed\`, event is created in Google Calendar,
   confirmation SMS goes out.
5. 24 hours before, a reminder SMS: "Reminder: Skin fade at Fade Room tomorrow 14:30. Reply C to cancel."

## 6. Slot logic
- Slots = weekly hours for that weekday, minus days off, minus existing bookings (pending or confirmed),
  minus Google Calendar busy blocks (freeBusy API), minus buffer minutes, in 15 minute steps.
- Pending bookings hold a slot for 15 minutes. After that, a job marks them \`expired\`.
- All times stored in UTC. Display in the business timezone.

## 7. Data model
- \`profiles\`: id, full_name, created_at.
- \`businesses\`: id, owner_id, name, handle (unique), timezone, phone, stripe_account_id,
  google_connected, google_calendar_id, created_at.
- \`google_tokens\`: business_id, refresh_token (encrypted at rest by Supabase), scope, updated_at.
  No browser access at all.
- \`services\`: id, business_id, name, minutes, price_cents, deposit_cents, buffer_minutes, active.
- \`availability\`: id, business_id, weekday (0 to 6), start_time, end_time.
- \`days_off\`: id, business_id, day (date), reason.
- \`bookings\`: id, business_id, service_id, starts_at, ends_at, customer_name, customer_phone,
  status ('pending','confirmed','cancelled','expired','completed','no_show'), deposit_cents,
  stripe_checkout_id, google_event_id, cancel_token, reminder_sent_at, created_at.
- \`subscriptions\`, \`stripe_events\`: shared billing tables.

## 8. Edge functions
1. \`bw-public-slots\`: public, no login. Input handle, service id, date. Returns free slots.
   Uses the secret key server-side, never exposes customer data.
2. \`bw-create-booking\`: public. Re-checks the slot is free, inserts a pending booking,
   creates a Stripe Checkout session on the connected account for the deposit, returns the URL.
3. \`bw-reminders\`: Supabase Cron every 15 minutes. Sends SMS for confirmed bookings starting in
   23.5 to 24.5 hours where \`reminder_sent_at\` is null. Also expires stale pending bookings.
- Plus a Next.js route \`/api/google/callback\` for OAuth, and the Stripe webhook which handles both
  subscription events and \`checkout.session.completed\` for deposits (connected account events).

## 9. Access rules
- Owner pages need \`subscriptions.status in ('trialing','active')\`.
- Public booking page only works if the owner's subscription is active or trialing. If not,
  show "Bookings are paused for this business."
- Owners only see their own business rows (RLS via businesses.owner_id).
- Customers never log in. They are identified by the \`cancel_token\` in their SMS link.

## 9b. Plans and limits
- **Solo** $19/month or $190/year: up to 300 texts a month (150 bookings).
- **Studio** $39/month or $390/year: up to 600 texts a month, brand colour and logo on the booking page, no "Booking by Bookwell" footer, no-show report.
- Count texts per business per calendar month from bookings (confirmation + reminder). Past the cap, send the reminder by email instead (ask for an optional email on the booking form) and show an upgrade notice in the owner app.
- Store the plan in \`subscriptions.price_id\` and map it in \`lib/plans.ts\`.

## 10. Out of scope (v1)
- Multiple staff per business, group classes, packages, memberships.
- Outlook or Apple Calendar.
- Two-way SMS chat (only "C" to cancel is parsed).
- Taking the full payment up front (deposit only).
- Reviews.

## 11. Milestones
1. **M1 (2h):** auth, profiles trigger, business onboarding with handle.
2. **M2 (3h):** services, weekly availability, days off screens.
3. **M3 (3h):** public booking page with slot logic (no payment yet).
4. **M4 (3h):** Google Calendar OAuth, freeBusy blocking, event creation.
5. **M5 (2h):** Stripe Connect Standard onboarding (Account Links) and deposit Checkout as a direct charge.
6. **M6 (1.5h):** Twilio confirmation and reminder SMS, cancel link.
7. **M7 (0.5h):** Bookwell subscription billing and landing page.

## 12. Definition of done
- A barber can set up in under 10 minutes and share \`/b/handle\`.
- A customer can book and pay a deposit on a phone in under 60 seconds.
- The booking appears in Google Calendar and a reminder text arrives 24 hours before.
- Two customers cannot book the same slot (tested with two browsers at once).
`

const bwDesignPrd = `# Bookwell: design PRD

## Feel
Warm, friendly, local. Like a good corner shop. The public booking page must feel trustworthy
on a cheap Android phone with one bar of signal.

## Tokens
| Token | Value | Use |
|---|---|---|
| \`--bg\` | #FBF8F3 | Background |
| \`--surface\` | #FFFFFF | Cards |
| \`--ink\` | #221C14 | Text |
| \`--muted\` | #6E6355 | Secondary text |
| \`--line\` | #EAE2D6 | Borders |
| \`--brand\` | #C7801A | Buttons, selected slot |
| \`--brand-ink\` | #3A2608 | Text on brand |
| \`--brand-soft\` | #FBEBD2 | Hover, selected day |
| \`--ok\` | #2F7D4F | Confirmed badge |
| \`--radius\` | 14px | Generous, friendly corners |

Font: "DM Sans" for UI, numbers in tabular figures. Minimum tap target 44px.
Dark mode for the owner app only. The public page stays light (owners screenshot it).

## Public booking page (\`/b/[handle]\`)
1. Header: business name, small avatar/logo, address line.
2. Step 1, Service: big cards with name, duration, price and "Deposit $10".
3. Step 2, Day: horizontal scroll of the next 14 days. Days with no slots are greyed out.
4. Step 3, Time: grid of slot pills (3 per row on mobile). Selected pill fills with \`--brand\`.
5. Step 4, Details: name, mobile (with country code), "Text me a reminder" switch (on by default).
6. Sticky bottom bar: "Pay $10 deposit and book". Below it: "The rest is paid at the appointment."
7. Progress dots at the top, back arrow on each step. No page reloads between steps.

## Confirmation (\`/done\`)
Big tick, "You're booked", service, date and time in the business timezone, "Add to calendar" (.ics),
"Need to change it? Use the link in your text message."

## Owner app
- \`/app\`: "Today" card at the top with each booking (time, name, service, deposit paid badge),
  then "Upcoming" grouped by day. Row actions: mark completed, mark no-show, cancel.
- \`/app/services\`: list + Dialog to add/edit. Deposit is a slider from $0 to the price.
- \`/app/availability\`: seven rows (Mon to Sun) with a toggle and start/end time selects.
  "Add day off" with a Calendar popover.
- \`/app/settings\`: three connection cards with status pills: Google Calendar, Stripe payouts, SMS.
  Each card has one button ("Connect", "Reconnect").
- Share card: the booking link with "Copy" and a QR code (qrcode.react) to print for the shop window.

## Components (shadcn/ui)
Button, Card, Dialog, Input, Switch, Select, Slider, Calendar, Popover, Badge, Tabs, Skeleton, Sonner.

## Motion
- Step transitions: slide 16px + fade, 180ms.
- Slot pill press: scale 0.97.
- \`prefers-reduced-motion\`: fades only.

## Onboarding (owner)
Four-step checklist card on \`/app\` until done: Add a service, Set your hours, Connect Google Calendar,
Connect payouts. Each step ticks itself. When all four are done, show the share card with confetti.

## Auth pages
Centred card, logo, email + password, "Confirm email" off. Line under the button:
"7 days free. Set up your booking page in 10 minutes."

## Empty and error states
- No slots on a day: "Fully booked. Try another day."
- Payment cancelled: back to step 4 with "Your slot is held for 15 minutes."
- Business paused: friendly card with the business phone number to call.
`

const bwSql = `-- Bookwell schema. Paste into Supabase: SQL Editor, New query, Run.

create extension if not exists btree_gist;

-- 1. Profiles + trigger
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
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
create table if not exists public.businesses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references auth.users (id) on delete cascade,
  name text not null,
  handle text not null unique check (handle ~ '^[a-z0-9-]{3,30}$'),
  timezone text not null default 'Europe/London',
  phone text,
  stripe_account_id text,
  google_connected boolean not null default false,
  google_calendar_id text default 'primary',
  created_at timestamptz not null default now()
);

create table if not exists public.google_tokens (
  business_id uuid primary key references public.businesses (id) on delete cascade,
  refresh_token text not null,
  scope text,
  updated_at timestamptz not null default now()
);

create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  name text not null,
  minutes int not null check (minutes between 5 and 480),
  price_cents int not null default 0,
  deposit_cents int not null default 0,
  buffer_minutes int not null default 0,
  active boolean not null default true
);

create table if not exists public.availability (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  weekday int not null check (weekday between 0 and 6),
  start_time time not null,
  end_time time not null check (end_time > start_time)
);

create table if not exists public.days_off (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  day date not null,
  reason text,
  unique (business_id, day)
);

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  service_id uuid references public.services (id) on delete set null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  customer_name text not null,
  customer_phone text not null,
  sms_opt_in boolean not null default true,
  status text not null default 'pending'
    check (status in ('pending','confirmed','cancelled','expired','completed','no_show')),
  deposit_cents int not null default 0,
  stripe_checkout_id text unique,
  google_event_id text,
  cancel_token uuid not null default gen_random_uuid() unique,
  reminder_sent_at timestamptz,
  created_at timestamptz not null default now(),
  -- No two live bookings may overlap for one business. This is what stops double booking.
  constraint bookings_no_overlap exclude using gist (
    business_id with =,
    tstzrange(starts_at, ends_at) with &&
  ) where (status in ('pending','confirmed'))
);
create index if not exists bookings_business_time_idx on public.bookings (business_id, starts_at);

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

-- 4. Helper: is this business mine?
create or replace function public.owns_business(b uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.businesses where id = b and owner_id = (select auth.uid()));
$$;

-- 5. Row Level Security
alter table public.profiles enable row level security;
alter table public.businesses enable row level security;
alter table public.google_tokens enable row level security;
alter table public.services enable row level security;
alter table public.availability enable row level security;
alter table public.days_off enable row level security;
alter table public.bookings enable row level security;
alter table public.subscriptions enable row level security;
alter table public.stripe_events enable row level security;

create policy "profiles select own" on public.profiles for select to authenticated
  using (id = (select auth.uid()));
create policy "profiles update own" on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy "businesses select own" on public.businesses for select to authenticated
  using (owner_id = (select auth.uid()));
create policy "businesses insert own" on public.businesses for insert to authenticated
  with check (owner_id = (select auth.uid()));
create policy "businesses update own" on public.businesses for update to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "businesses delete own" on public.businesses for delete to authenticated
  using (owner_id = (select auth.uid()));

create policy "services select own" on public.services for select to authenticated using (public.owns_business(business_id));
create policy "services insert own" on public.services for insert to authenticated with check (public.owns_business(business_id));
create policy "services update own" on public.services for update to authenticated using (public.owns_business(business_id)) with check (public.owns_business(business_id));
create policy "services delete own" on public.services for delete to authenticated using (public.owns_business(business_id));

create policy "availability select own" on public.availability for select to authenticated using (public.owns_business(business_id));
create policy "availability insert own" on public.availability for insert to authenticated with check (public.owns_business(business_id));
create policy "availability update own" on public.availability for update to authenticated using (public.owns_business(business_id)) with check (public.owns_business(business_id));
create policy "availability delete own" on public.availability for delete to authenticated using (public.owns_business(business_id));

create policy "days_off select own" on public.days_off for select to authenticated using (public.owns_business(business_id));
create policy "days_off insert own" on public.days_off for insert to authenticated with check (public.owns_business(business_id));
create policy "days_off update own" on public.days_off for update to authenticated using (public.owns_business(business_id)) with check (public.owns_business(business_id));
create policy "days_off delete own" on public.days_off for delete to authenticated using (public.owns_business(business_id));

-- Owners read and update bookings. New bookings are inserted only by the bw-create-booking edge function.
create policy "bookings select own" on public.bookings for select to authenticated using (public.owns_business(business_id));
create policy "bookings update own" on public.bookings for update to authenticated using (public.owns_business(business_id)) with check (public.owns_business(business_id));

create policy "subscriptions select own" on public.subscriptions for select to authenticated
  using (user_id = (select auth.uid()));

-- google_tokens and stripe_events have no policies: only the secret key can touch them.
-- Anonymous visitors have no direct table access. The public page goes through edge functions.
`

const bwRepoTree = `bookwell/
├── app/
│   ├── (marketing)/page.tsx
│   ├── (auth)/login/page.tsx
│   ├── (auth)/signup/page.tsx
│   ├── app/page.tsx               # today + upcoming
│   ├── app/services/page.tsx
│   ├── app/availability/page.tsx
│   ├── app/settings/page.tsx
│   ├── b/[handle]/page.tsx        # public booking page
│   ├── b/[handle]/done/page.tsx
│   ├── b/cancel/[token]/page.tsx
│   ├── api/google/connect/route.ts
│   ├── api/google/callback/route.ts
│   ├── api/stripe/connect/route.ts
│   └── api/stripe/checkout/route.ts
├── components/
│   ├── booking/ServiceStep.tsx
│   ├── booking/DayStep.tsx
│   ├── booking/SlotStep.tsx
│   ├── booking/DetailsStep.tsx
│   └── ui/
├── lib/
│   ├── slots.ts                   # pure slot maths, unit tested
│   ├── supabase/client.ts
│   └── supabase/server.ts
├── supabase/
│   ├── migrations/0001_bookwell.sql
│   └── functions/
│       ├── bw-public-slots/index.ts
│       ├── bw-create-booking/index.ts
│       ├── bw-reminders/index.ts
│       └── stripe-webhook/index.ts
├── PRD.md                     # build PRD (download, save here)
├── DESIGN.md                  # design PRD
├── LANDING.md                 # landing page PRD
├── .env.example
└── README.md`

const bwLandingPrd = `# Bookwell: landing page PRD

Save this file as \`LANDING.md\` in your project root. In Claude Code, say:
"Build the landing page exactly as described in @LANDING.md, using the tokens in @DESIGN.md."

## 0. Page goal
- One job: get a barber, trainer or tutor to click **Start free trial**.
- Secondary job: let them tap through a live demo booking page on their phone.
- Audience reads on a phone, between clients, with one thumb. Design mobile first.
- Route: \`/\` (marketing route group). Every other marketing page reuses the nav and footer.

## 1. Global rules

### 1.1 Tokens
Use the tokens from \`@DESIGN.md\`. The landing page adds:

| Token | Value | Use |
|---|---|---|
| \`--hero-bg\` | #FBF3E6 | Hero and final CTA background |
| \`--ink-soft\` | #4A3F31 | Body copy on light backgrounds |
| \`--chip\` | #F3E4CC | Small pills and labels |
| \`--shadow-card\` | 0 12px 32px rgba(58, 38, 8, 0.10) | Phone mockup, pricing cards |

### 1.2 Type scale
| Style | Mobile | Desktop | Weight |
|---|---|---|---|
| Display (hero H1) | 40px / 1.05 | 64px / 1.02 | 700 |
| H2 | 30px / 1.15 | 44px / 1.1 | 700 |
| H3 | 20px / 1.3 | 24px / 1.3 | 600 |
| Body | 17px / 1.55 | 18px / 1.6 | 400 |
| Small | 14px / 1.5 | 14px / 1.5 | 500 |

Font: DM Sans from Google Fonts (400, 500, 600, 700), \`font-display: swap\`.

### 1.3 Layout
- Container: max width 1160px, side padding 16px mobile, 24px tablet, 32px desktop.
- Section padding: 72px top and bottom on mobile, 112px on desktop.
- Alternate section backgrounds: \`--bg\`, \`--surface\`, \`--bg\`. Hero and final CTA use \`--hero-bg\`.

### 1.4 Motion principles
- Easing for everything: \`cubic-bezier(0.22, 1, 0.36, 1)\` (a soft ease-out).
- Default scroll reveal: fade from 0 to 1 and move up 16px, 520ms, triggered when 20% of the element is in view, runs once.
- Stagger children by 70ms, max 6 children per stagger group.
- Use Framer Motion (\`motion\` package) with \`whileInView\` and \`viewport={{ once: true, amount: 0.2 }}\`.
- Reduced motion: if \`prefers-reduced-motion: reduce\`, every reveal becomes an instant opacity change (no movement), loops stop, the demo video shows its poster frame with a play button.
- Never animate layout properties (width, height, top). Only \`transform\` and \`opacity\`.

### 1.5 Buttons
- Primary: \`--brand\` background, \`--brand-ink\` text, 52px tall on mobile, 48px desktop, 14px radius, 600 weight.
- Secondary: transparent with 1.5px \`--line\` border, \`--ink\` text.
- Hover: lift 2px with \`--shadow-card\`, 160ms. Press: scale 0.98.
- Every primary button goes to \`/signup\` and fires \`cta_click\` with a \`location\` property (see section 16).

## 2. Sticky nav
- Height 64px. Background \`--bg\` at 85% opacity with \`backdrop-filter: blur(12px)\`. Bottom border \`--line\` appears only after scrolling 8px.
- Left: Bookwell wordmark (calendar icon in \`--brand\` plus "Bookwell" in 700).
- Centre (desktop only): links **How it works**, **Features**, **Pricing**, **FAQ**. Each scrolls smoothly to its section anchor.
- Right: text link **Log in** (to \`/login\`) and primary button **Start free trial**.
- Mobile: wordmark left, **Start free trial** small button right (40px tall), hamburger opens a full-width sheet with the four links and **Log in**.
- Motion: nav slides down 100% → 0 on first load, 400ms. Hides on scroll down after 400px, shows on scroll up (translateY, 240ms).

## 3. Hero

### Copy
- Eyebrow pill (\`--chip\`): **For barbers, trainers, tutors and every one-person shop**
- H1: **Stop losing money to no-shows.**
- Subhead: **Put one link in your Instagram bio. Customers pick a time, pay a small deposit and get a text the day before. Every booking lands in your Google Calendar.**
- Primary button: **Start free trial**
- Secondary button: **Try a demo booking** (opens \`/b/demo-fade-room\` in a new tab)
- Microcopy under buttons: **7 days free · Set up in 10 minutes · From $19/month**

### Product visual
- Right side on desktop, below the copy on mobile: a phone mockup (iPhone-style frame drawn in CSS, no image of a real device brand) showing the booking page for "Fade Room" with the Time step open and the 14:30 slot selected.
- Floating card 1 (top left of the phone): green tick, **Deposit paid · $10**.
- Floating card 2 (bottom right): SMS bubble, **Reminder: Skin fade at Fade Room tomorrow 14:30.**
- Floating card 3 (desktop only, top right): Google Calendar-style event block **Skin fade: Jordan · 14:30 to 15:15** (draw it, do not use Google's logo).

### Motion
- On load: copy staggers in (eyebrow, H1, subhead, buttons) at 70ms intervals, 520ms each.
- Phone rises 24px and fades in, 700ms, 150ms delay.
- Floating cards pop in one by one after the phone: scale 0.92 → 1 and fade, 360ms each, 120ms apart.
- Idle loop: floating cards bob 4px up and down over 5s, each offset by 1.2s. Stops with reduced motion.

### Responsive
- Mobile: copy first, then phone at 88% width, floating cards 1 and 2 only.
- Tablet: same as mobile with phone at 60% width, centred.
- Desktop: 55/45 split, copy left.

## 4. Trade strip (logo strip)
- Heading (small, \`--muted\`, centred): **Built for shops that run on appointments**
- Row of 8 trade badges with simple line icons: **Barbers · Personal trainers · Tutors · Nail techs · Massage · Dog groomers · Lash artists · Driving instructors**
- When you have real customers, swap these for their shop names in the same style (text wordmarks, greyscale). Ask permission first.
- Motion: on mobile the row auto-scrolls horizontally as a marquee at 30px per second, pauses on touch. Desktop shows all 8 in a wrapped row with a staggered fade. Reduced motion: no marquee, wrap the row.

## 5. Problem
- H2: **DMs are not a booking system.**
- Intro: **Most small shops still take bookings by Instagram DM, WhatsApp and memory. It works until it does not.**
- Three pain cards in a row (stack on mobile), each with an icon, a bold line and one sentence:
  1. **"See you Tuesday" and then nothing.** No deposit means no reason to turn up. One no-show a week is a whole day's takings gone each month.
  2. **Double booked again.** Your calendar, your DMs and your head never agree.
  3. **Reminding people by hand.** Ten texts every evening that you are not paid for.
- Stat line under the cards in a \`--chip\` box: **A $35 appointment missed four times a month is $1,680 a year.** Link: **Work out your number** (to \`/no-show-calculator\`).
- Motion: cards stagger in. The stat number counts up from $0 to $1,680 over 900ms when in view (reduced motion: show final number).

## 6. Product demo
- H2: **See a booking happen in 20 seconds.**
- Subhead: **This is what your customers see. No app, no account, works on any phone.**
- Video: 20 second silent screen recording of the booking flow on a phone (service, day, time, details, pay, confirmation), MP4 H.264 under 2MB plus WebM, \`autoplay muted loop playsinline\`, poster frame = the Time step.
- Captions burned into the video at each step: "Pick a service", "Pick a time", "Pay a $10 deposit", "Booked. Text reminder on its way."
- Next to it (desktop) or under it (mobile): button **Try the demo yourself** (opens \`/b/demo-fade-room\`).
- Motion: the video only plays when 50% in view (IntersectionObserver) and pauses when out of view. Reduced motion: poster with a play button, no autoplay.

## 7. Feature sections
Five alternating rows: visual on one side, copy on the other, swapping sides each row on desktop. On mobile, the visual sits above the copy. Each row has an eyebrow, H3, body and 3 bullet ticks.

### 7.1 Deposits
- Eyebrow: **Deposits**
- H3: **People turn up when they have paid.**
- Body: **Set a deposit per service, from $0 to the full price. Customers pay by card when they book. The money goes straight to your own Stripe account and your bank.**
- Bullets: **Deposit per service** · **Apple Pay and Google Pay** · **Paid out to your bank by Stripe**
- Visual: the service editor with the deposit slider at $10 of $35. Motion: slider thumb slides from $0 to $10 when in view, 800ms.

### 7.2 Text reminders
- Eyebrow: **Reminders**
- H3: **A text the day before. Sent for you.**
- Body: **Every customer gets a confirmation text and a reminder 24 hours before, with a link to change or cancel. Cancelled slots open up again on your page.**
- Bullets: **Confirmation and reminder texts** · **One-tap cancel link** · **Freed slots go back on sale**
- Visual: two SMS bubbles on a phone lock screen. Motion: bubbles slide in from the right 24px, 120ms apart.

### 7.3 Google Calendar sync
- Eyebrow: **Calendar**
- H3: **Your Google Calendar stays the boss.**
- Body: **Connect Google Calendar once. Anything already in it blocks those times on your booking page, and every new booking appears in it with the customer's name and number.**
- Bullets: **Busy times block slots** · **Bookings added automatically** · **Works on your phone's calendar app**
- Visual: a week view with grey busy blocks and amber Bookwell bookings. Motion: amber blocks drop in from 8px above, staggered.

### 7.4 Your booking link
- Eyebrow: **Your page**
- H3: **One link for your bio, your window and your WhatsApp.**
- Body: **You get bookwell.app/b/yourname plus a QR code to print for the shop window or the mirror.**
- Bullets: **Custom link** · **Printable QR code** · **Looks good on cheap phones**
- Visual: a QR code poster on a shop window. Motion: QR code draws in square by square over 600ms (reduced motion: shown at once).

### 7.5 No double bookings
- Eyebrow: **Peace of mind**
- H3: **Two people can never grab the same slot.**
- Body: **If two customers tap 14:30 at the same moment, only one gets it. The other is offered the next free time. No awkward phone calls.**
- Bullets: **Live availability** · **Buffer time between clients** · **Days off in two taps**
- Visual: two phones side by side, one showing "Booked", the other "That slot was taken a moment ago". Motion: the second phone gives a small 6px shake once.

## 8. How it works
- H2: **Live in 10 minutes.**
- Three numbered steps in a row (vertical timeline on mobile with a 2px \`--line\` connector):
  1. **Add your services.** Name, length, price and deposit. "Skin fade, 45 min, $35, $10 deposit."
  2. **Set your hours and connect your calendar.** Pick your working days, connect Google Calendar and Stripe.
  3. **Share your link.** Put it in your Instagram bio, print the QR code, send it on WhatsApp.
- Button under the steps: **Start free trial**
- Motion: the connector line draws from 0 to 100% as the section scrolls (scroll-linked, \`scaleX\` on desktop, \`scaleY\` on mobile). Step numbers pop in when the line reaches them. Reduced motion: line fully drawn.

## 9. Comparison table
- H2: **Made for one-person shops, priced like it.**
- Subhead: **Big booking apps are built for salons with ten chairs or for sales calls. Bookwell does the five things you need.**
- Table columns: **Bookwell**, **Calendly**, **Square Appointments**, **Fresha**, **Booksy**.
- Rows:

| | Bookwell | Calendly | Square Appointments | Fresha | Booksy |
|---|---|---|---|---|---|
| Built for local service shops | Yes | No, built for meetings | Yes | Yes | Yes |
| Card deposits to your own account | Yes | Paid plans, via Stripe | Yes | Yes | Yes |
| SMS reminders included | Yes | Paid plans | Yes | Paid per message | Yes |
| Google Calendar two-way | Yes | Yes | Limited | Limited | Limited |
| Customer needs an app or account | No | No | No | Often | Often |
| Price for one person | $19/month | [verify] | [verify] | [verify] | [verify] |

- Before you publish, fill every [verify] cell from each competitor's current pricing page and add the month you checked in a footnote: **Prices checked [Month Year]. Competitor features change, tell us if we are out of date.**
- Never claim a competitor lacks a feature unless their own site shows it. When unsure, write "Limited" or leave it out.
- Mobile: the table becomes a horizontal scroll with the first column sticky and Bookwell's column highlighted in \`--brand-soft\`. Show a small "Swipe to compare →" hint that fades after the first scroll.
- Motion: Bookwell column header gets a soft amber glow pulse once when in view (reduced motion: no pulse).

## 10. Testimonials slot
- H2: **Shops that stopped chasing no-shows**
- Three cards: photo (circle, 56px), quote, name, trade and town, and one result line in bold (e.g. **No-shows down from 6 to 1 a month**).
- Until you have real quotes, hide this section with a feature flag \`SHOW_TESTIMONIALS=false\`. Never publish invented quotes. Collect real ones from your first 5 users with the question: "What changed in your first month with Bookwell?"
- Motion: cards stagger in. On mobile they become a swipeable carousel with dots.

## 11. Pricing
- Section anchor: \`#pricing\`
- H2: **Simple pricing. Cancel any time.**
- Subhead: **Every plan starts with a 7-day free trial.**
- Toggle: **Monthly** / **Yearly · 2 months free**. Default Monthly. Toggle animates a pill sliding between the options (220ms). Prices cross-fade (180ms).

### Plan cards
**Solo**
- Price: **$19/month** or **$190/year**
- Line: **For one person with one calendar.**
- Includes: **Unlimited bookings · Up to 300 reminder texts a month (150 bookings) · Card deposits · Google Calendar sync · Booking link and QR code**
- Button: **Start free trial**

**Studio** (badge: **Most room to grow**)
- Price: **$39/month** or **$390/year**
- Line: **For busy shops that book every day.**
- Includes: **Everything in Solo · Up to 600 reminder texts a month (300 bookings) · Your brand colour and logo on the booking page · Remove "Booking by Bookwell" · No-show report**
- Button: **Start free trial**

- Under the cards: **Card fees on deposits are paid to Stripe from the deposit, at Stripe's standard rate. Bookwell never takes a cut of your deposits.**
- Text limits: when a shop passes its monthly texts, reminders switch to email for the rest of the month and the owner gets an in-app notice with an upgrade button.
- Motion: cards rise in with stagger. Studio card sits 8px higher on desktop with \`--shadow-card\`.
- The yearly toggle must create Checkout with the yearly Stripe price ID. Store all four price IDs in env: \`STRIPE_PRICE_SOLO_MONTHLY\`, \`STRIPE_PRICE_SOLO_YEARLY\`, \`STRIPE_PRICE_STUDIO_MONTHLY\`, \`STRIPE_PRICE_STUDIO_YEARLY\`.

## 12. FAQ
- Section anchor: \`#faq\`
- H2: **Questions shops ask us**
- shadcn Accordion, one open at a time, first one open by default. Chevron rotates 180 degrees in 200ms.

1. **Do my customers need to download an app or make an account?**
   No. They open your link, pick a time, enter their name and mobile, and pay the deposit. That is it.
2. **Where does the deposit money go?**
   Straight to your own Stripe account, then to your bank on Stripe's normal payout schedule. Bookwell never holds your money.
3. **What if a customer cancels?**
   They tap the link in their text. If they cancel more than 24 hours before, you choose whether the deposit is refunded. The slot opens up again on your page straight away.
4. **Does it work with my Google Calendar?**
   Yes. Anything already in your Google Calendar blocks those times, and every booking is added to it with the customer's name and number.
5. **I use Apple Calendar or Outlook. Will it work?**
   Not yet. Google Calendar is the only calendar we sync with today. You can still use Bookwell without a connected calendar.
6. **Do the text messages cost extra?**
   No. Solo includes up to 300 texts a month and Studio up to 600. That is two texts per booking: a confirmation and a reminder.
7. **Can I take the full payment up front?**
   Set the deposit to the full price of the service and customers pay it all when they book.
8. **How long does setup take?**
   About 10 minutes: add a service, set your hours, connect Google Calendar and Stripe, share your link.
9. **What happens after the 7-day trial?**
   You pick Solo or Studio at checkout. If you do not, your booking page pauses and shows your phone number instead. Your bookings and settings stay safe.
10. **Can I have more than one staff member?**
    Not yet. Bookwell is built for one person with one calendar. Team accounts are on the roadmap.
11. **Can I cancel any time?**
    Yes. Cancel from Settings → Billing in two clicks. You keep access until the end of the period you paid for.

- Motion: accordion content expands with height auto animation (Framer Motion \`layout\`), 240ms. Reduced motion: instant.
- Add FAQPage JSON-LD with these 11 questions (see section 15).

## 13. Final CTA
- Background \`--hero-bg\`, centred.
- H2: **Your next no-show is already booked. Stop it.**
- Subhead: **Set up Bookwell in 10 minutes and send your link today.**
- Primary button: **Start free trial**
- Microcopy: **7 days free · Cancel any time**
- Visual: small row of three floating chips: **Deposit paid**, **Reminder sent**, **Added to calendar**.
- Motion: chips float in from below with stagger, then bob gently (same as hero). Reduced motion: static.

## 14. Footer
- Four columns on desktop, accordion groups on mobile:
  - **Product**: Features, Pricing, Demo booking page, No-show calculator
  - **For**: Barbers, Personal trainers, Tutors, Nail techs
  - **Company**: About, Contact (mailto), Changelog
  - **Legal**: Privacy, Terms
- Bottom row: wordmark, **© 2026 Bookwell**, small line **Made for shops that run on appointments.**
- Trade landing pages (\`/for/barbers\`, \`/for/personal-trainers\`, \`/for/tutors\`, \`/for/nail-techs\`) reuse this page with a swapped H1 and hero image. Build them after launch.

## 15. SEO
- Title (max 60 characters): **Bookwell: booking link with deposits and SMS reminders**
- Meta description (max 155 characters): **One booking link for barbers, trainers and tutors. Customers pay a deposit, get a text reminder, and every booking lands in Google Calendar. $19/month.**
- Canonical: \`https://bookwell.app/\`
- H1 appears once (the hero). H2 per section.
- JSON-LD: \`SoftwareApplication\` (name, applicationCategory "BusinessApplication", offers with both plans in USD) and \`FAQPage\` from section 12.
- Images: every image has descriptive alt text, e.g. "Bookwell booking page on a phone with the 14:30 slot selected".
- \`sitemap.xml\` and \`robots.txt\` generated with Next.js metadata routes.

### OG image
- 1200 x 630 PNG generated with \`next/og\` at \`app/opengraph-image.tsx\`.
- Background \`--hero-bg\`. Left: H1 text **Stop losing money to no-shows.** in 64px DM Sans 700, \`--ink\`. Under it: **Booking link · Deposits · SMS reminders · $19/month** in 28px \`--ink-soft\`.
- Right: simplified phone with the amber 14:30 slot and the "Deposit paid · $10" card.
- Bottom left: Bookwell wordmark.
- Same image used for Twitter \`summary_large_image\`.

## 16. Analytics events
Use DataFast (or PostHog, same event names). Fire with a small \`track(name, props)\` helper.

| Event | When | Properties |
|---|---|---|
| \`page_view\` | Automatic | path, referrer, utm_source, utm_campaign |
| \`cta_click\` | Any Start free trial button | location: nav, hero, how_it_works, pricing_solo, pricing_studio, final_cta |
| \`demo_open\` | Try a demo booking clicked | location |
| \`video_play\` | Demo video starts playing in view | autoplay: true or false |
| \`pricing_toggle\` | Monthly/Yearly toggled | interval |
| \`faq_open\` | An FAQ item opened | question_index |
| \`compare_scroll\` | Comparison table scrolled on mobile | none |
| \`calculator_click\` | Work out your number clicked | none |
| \`signup_complete\` | Fired on the server after signup | plan_interest (from the last pricing card clicked, stored in a cookie) |

- Funnel to watch weekly: page_view → cta_click → signup_complete → trial started (Stripe) → first booking received.
- Keep a \`ref\` query parameter in a cookie for 30 days and save it on signup (used by the "Booking by Bookwell" footer referral).

## 17. Responsive checklist
- Test at 360, 390, 768, 1024, 1440 px wide.
- No horizontal scroll on any width (except the comparison table's own scroll area).
- Tap targets at least 44px. Buttons full width on mobile under 420px.
- Hero H1 must fit in 3 lines at 360px.
- The sticky nav must never cover a section heading when jumping to an anchor: add \`scroll-margin-top: 80px\` to every section.

## 18. Performance and accessibility
- Lighthouse mobile: Performance 90+, Accessibility 100, SEO 100.
- Hero visual is HTML and CSS, not an image, so it paints instantly. Load the demo video lazily.
- Fonts: preload DM Sans 700 and 400 only.
- Total JavaScript on \`/\` under 120kb gzipped.
- Colour contrast 4.5:1 for text. Focus rings visible (2px \`--brand\` outline with 2px offset).
- Every animation respects \`prefers-reduced-motion\`.

## 19. Build order for Claude Code
1. Section shells with anchors and the sticky nav.
2. Hero with the CSS phone mockup and floating cards.
3. Problem, features and how it works with scroll reveals.
4. Comparison table and pricing with the toggle and Checkout wiring.
5. FAQ with JSON-LD, final CTA, footer.
6. SEO metadata, OG image, analytics helper and events.
7. Screenshot at 390px and 1440px, fix anything that overflows.
`

export const bookwell: AppDef = {
  slug: 'bookwell',
  name: 'Bookwell',
  tagline: 'Bookings, deposits, no no-shows',
  oneLiner: 'Booking pages for barbers, trainers and tutors with Google Calendar sync, deposits and SMS reminders.',
  category: 'productivity',
  art: { motif: 'calendar', tone: 'amber' },
  price: { monthly: 19, trialDays: 7 },
  difficulty: 2,
  buildHours: 15,
  apis: [
    {
      name: 'Google Calendar API',
      job: 'reads the owner\'s busy times so slots never clash, and writes each booking into their calendar',
      signupUrl: 'https://console.cloud.google.com',
      docsUrl: 'https://developers.google.com/workspace/calendar/api/guides/overview',
      pricing: 'Free (checked Oct 2026). Google does not charge for Calendar API calls. You only hit a per-minute quota, which you can see under APIs & Services → Google Calendar API → Quotas.',
      envVars: [
        { name: 'GOOGLE_CLIENT_ID', where: 'Google Cloud Console → Google Auth Platform → Clients → Create client (Web application)', pasteInto: 'Vercel env', secret: false },
        { name: 'GOOGLE_CLIENT_SECRET', where: 'Same OAuth client → Client secret', pasteInto: 'Vercel env', secret: true },
      ],
    },
    {
      name: 'Twilio (SMS)',
      job: 'sends the booking confirmation and the 24 hour reminder text',
      signupUrl: 'https://www.twilio.com/try-twilio',
      docsUrl: 'https://www.twilio.com/docs/messaging',
      pricing: 'Checked Oct 2026: free trial credit (texts only go to numbers you verify). Then pay as you go: $0.0083 per outbound US SMS segment plus carrier pass-through fees of roughly $0.003 to $0.005 per text, a local number at about $1.15/month [verify], and A2P 10DLC registration for US numbers (one-off brand and campaign vetting fees of about $20 in total, then roughly $2 to $10 per campaign per month). UK and EU rates are higher, check twilio.com/en-us/sms/pricing for your country.',
      envVars: [
        { name: 'TWILIO_ACCOUNT_SID', where: 'console.twilio.com → Account Info → Account SID', pasteInto: 'Supabase secrets', secret: false },
        { name: 'TWILIO_AUTH_TOKEN', where: 'console.twilio.com → Account Info → Auth Token', pasteInto: 'Supabase secrets', secret: true },
        { name: 'TWILIO_FROM_NUMBER', where: 'console.twilio.com → Phone Numbers → Active numbers (E.164, e.g. +15551234567)', pasteInto: 'Supabase secrets', secret: false },
      ],
    },
    {
      name: 'Stripe Connect',
      job: 'lets each shop connect its own Stripe account so customer deposits go straight to the shop',
      signupUrl: 'https://dashboard.stripe.com/connect',
      docsUrl: 'https://docs.stripe.com/connect',
      pricing: 'Checked Oct 2026: with Standard accounts and direct charges, the shop pays Stripe\'s normal card fee on each deposit and Bookwell pays no Connect fees. (If you switch to Express accounts where you handle pricing, Stripe charges the platform $2 per monthly active account plus 0.25% + $0.25 per payout.)',
      envVars: [
        { name: 'STRIPE_SECRET_KEY', where: 'Stripe Dashboard → Developers → API keys → Secret key (sk_test_ then sk_live_)', pasteInto: 'Supabase secrets', secret: true },
      ],
    },
  ],
  idealFor: 'People who want a first SaaS with a clear local market: barbers, personal trainers, tutors and other one-person service businesses.',
  whyItSells: 'A barber charging $35 who loses 4 slots a month to no-shows is down $140. Bookwell costs $19 and the $10 deposit plus a reminder text cuts no-shows by more than half.',
  features: [
    'Public booking page at bookwell.app/b/yourname with a QR code',
    'Services with duration, price, deposit and buffer time',
    'Google Calendar two-way: busy times block slots, bookings appear in your calendar',
    'Deposits paid by card straight to the owner\'s bank via Stripe',
    'SMS confirmation and 24 hour reminder with a cancel link',
    'Double booking is impossible, enforced by the database',
    'Mark completed or no-show to see who keeps flaking',
  ],
  status: 'preview',
  costs: {
    usage: { label: 'Bookings per shop per month', unit: 'bookings', default: 60, min: 10, max: 300, step: 10 },
    plans: [
      { id: 'solo-monthly', name: 'Solo', price: 19, interval: 'month', includes: 'Unlimited bookings, up to 300 texts a month (150 bookings with confirmation + reminder), deposits, Google Calendar sync' },
      { id: 'solo-yearly', name: 'Solo (yearly)', price: 190, interval: 'year', includes: 'Same as Solo, 2 months free' },
      { id: 'studio-monthly', name: 'Studio', price: 39, interval: 'month', includes: 'Everything in Solo, up to 600 texts a month (300 bookings), brand colour and logo, no Bookwell footer, no-show report' },
      { id: 'studio-yearly', name: 'Studio (yearly)', price: 390, interval: 'year', includes: 'Same as Studio, 2 months free' },
    ],
    lines: [
      { name: 'SMS (confirmation + reminder)', vendor: 'Twilio', kind: 'perUnit', amount: 0.025, note: 'Two US SMS segments per booking at $0.0083 each plus about $0.004 carrier pass-through each = about $0.025 per booking. Checked Oct 2026. UK and EU texts cost 3 to 5 times more: re-check twilio.com/en-us/sms/pricing for your country before you set prices there.', url: 'https://www.twilio.com/en-us/sms/pricing/us' },
      { name: 'Phone number + A2P 10DLC campaign', vendor: 'Twilio', kind: 'fixed', amount: 3.15, steps: [{ fromCustomers: 0, amount: 0 }, { fromCustomers: 1, amount: 3.15 }, { fromCustomers: 300, amount: 15 }], note: 'One local number (about $1.15/month [verify]) plus one 10DLC campaign (about $2/month). Past roughly 300 shops, add numbers or move to a higher-throughput campaign (budget about $15/month). One-off registration fees of about $20 are not included. Checked Oct 2026.', url: 'https://www.twilio.com/docs/trust-hub/registrations/a2p-10dlc-campaign' },
      { name: 'Supabase', vendor: 'Supabase', kind: 'fixed', amount: 25, steps: [{ fromCustomers: 0, amount: 0 }, { fromCustomers: 1, amount: 25 }, { fromCustomers: 400, amount: 30 }, { fromCustomers: 1500, amount: 75 }], freeTier: 'Free plan for building (projects pause after a week of no use, so upgrade before your first paying customer).', note: 'Pro is $25/month and includes $10 of compute credit (covers Micro). Small compute ($15) from about 400 shops, Medium ($60) from about 1,500. Checked Oct 2026.', url: 'https://supabase.com/pricing' },
      { name: 'Vercel Pro', vendor: 'Vercel', kind: 'fixed', amount: 20, steps: [{ fromCustomers: 0, amount: 0 }, { fromCustomers: 1, amount: 20 }], freeTier: 'Hobby is free but for non-commercial use only, so move to Pro when you charge.', note: '$20 per member per month. One member is enough. Checked Oct 2026.', url: 'https://vercel.com/pricing' },
      { name: 'Transactional email', vendor: 'Resend', kind: 'fixed', amount: 0, steps: [{ fromCustomers: 0, amount: 0 }, { fromCustomers: 300, amount: 20 }], freeTier: '3,000 emails a month, 100 a day.', note: 'Welcome, trial-ending and over-limit emails only (bookings use SMS). Pro is $20/month for 50,000 emails once you pass the free cap. Checked Oct 2026.', url: 'https://resend.com/pricing' },
      { name: 'Google Calendar API', vendor: 'Google', kind: 'fixed', amount: 0, freeTier: 'Free. Only per-minute quotas apply.', note: 'No charge for Calendar API calls. Checked Oct 2026.', url: 'https://developers.google.com/workspace/calendar/api/guides/quota' },
      { name: 'Stripe Connect (deposits)', vendor: 'Stripe', kind: 'perCustomer', amount: 0, note: 'Standard accounts with direct charges: the shop pays Stripe\'s card fee on each deposit and Bookwell pays no Connect fee. If you ever switch to Express with platform pricing, add $2 per active account per month plus 0.25% + $0.25 per payout.', url: 'https://stripe.com/connect/pricing' },
      { name: 'Domain', vendor: 'Porkbun', kind: 'fixed', amount: 1, note: 'A .com is about $11 a year, shown as $1 a month.', url: 'https://porkbun.com' },
    ],
    notes: [
      'Each booking sends two texts: a confirmation and a reminder 24 hours before.',
      'Solo at its 300-text cap costs about $3.75 in SMS plus about $1 in Stripe fees, so gross margin stays at 75% or higher. Above the cap, reminders switch to email.',
      'Studio at its 600-text cap costs about $7.50 in SMS plus about $1.55 in Stripe fees: about 77% margin.',
      'A typical shop does about 60 bookings a month, which is $1.50 of SMS against $19 of revenue (about 87% margin after Stripe fees).',
      'Prices are US rates. Twilio prices outside the US are higher: set a higher price or a lower text cap before you sell in the UK or EU.',
      'Stripe subscription fees are added by the calculator, not listed here.',
    ],
  },
  content: {
    buildPrd: bwBuildPrd,
    designPrd: bwDesignPrd,
    landingPrd: bwLandingPrd,
    sql: bwSql,
    edgeFunctions: [
      {
        name: 'bw-public-slots',
        purpose: 'Returns free time slots for one service on one day for the public booking page.',
        trigger: 'Called by the public booking page (no login) when the customer picks a day',
        secrets: ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'],
        prompt: `Create a Supabase edge function at \`supabase/functions/bw-public-slots/index.ts\`. It is public (deploy with verify_jwt off).

Input: GET query \`handle\`, \`serviceId\`, \`date\` (YYYY-MM-DD in the business timezone).

Steps:
1. Validate inputs with zod. Return 400 on bad input.
2. With the Supabase secret key, load the business by handle. Return 404 if missing.
   Check the owner's subscription is 'trialing' or 'active', else return \`{ paused: true }\`.
3. Load the service (must be active and belong to the business), availability rows for that weekday,
   days_off for that date, and bookings with status pending or confirmed that overlap the day.
4. If google_connected, get a fresh access token from google_tokens.refresh_token
   (POST https://oauth2.googleapis.com/token, grant_type refresh_token) and call the freeBusy API
   for google_calendar_id for that day. If Google fails, log it and carry on without it.
5. Put the slot maths in a pure function \`computeSlots()\` in a shared file so lib/slots.ts can reuse it:
   15 minute steps, slot length = minutes + buffer_minutes, drop anything that overlaps a booking or busy block,
   drop slots in the past and anything less than 2 hours from now.
6. Return \`{ slots: string[] }\` as ISO UTC strings. Never return customer names or phones.
7. Add CORS for the app origin and a 30 second Cache-Control.

Also write 6 unit tests for computeSlots (normal day, day off, overlap, buffer, DST change day, past slots) with vitest and run them.`,
      },
      {
        name: 'bw-create-booking',
        purpose: 'Holds a slot and returns a Stripe Checkout link for the deposit.',
        trigger: 'Called by the public booking page when the customer taps "Pay deposit and book"',
        secrets: ['STRIPE_SECRET_KEY', 'APP_URL'],
        prompt: `Create a Supabase edge function at \`supabase/functions/bw-create-booking/index.ts\`. Public, verify_jwt off.

Input POST JSON: \`{ handle, serviceId, startsAt, name, phone, smsOptIn }\`.

Steps:
1. Validate with zod. Phone must be E.164 (use libphonenumber-js, default country from the business timezone).
2. Rate limit: max 5 pending bookings per phone number per hour.
3. Re-run computeSlots for that day and confirm startsAt is still free.
4. Insert a bookings row with status 'pending', ends_at = startsAt + minutes, deposit_cents from the service.
   If the insert fails with the exclusion constraint error (code 23P01), return 409 "That slot was taken a moment ago."
5. If deposit_cents is 0, mark the booking confirmed and return \`{ url: APP_URL/b/handle/done?b=<id> }\`.
6. Otherwise create a Stripe Checkout Session in mode 'payment' on the business's connected account
   (\`stripeAccount: business.stripe_account_id\`), one line item "Deposit: <service name>",
   metadata booking_id, expires_at 30 minutes from now, success_url APP_URL/b/handle/done?b=<id>,
   cancel_url APP_URL/b/handle?held=<id>. Save stripe_checkout_id on the booking.
7. Return \`{ url }\`.

Then update the stripe-webhook function: for \`checkout.session.completed\` events that come from a connected
account (event.account is set) with metadata.booking_id, set the booking to confirmed, create the Google Calendar
event (summary "<service>: <customer name>", description with phone) and save google_event_id, then send the
confirmation SMS with Twilio if sms_opt_in. Never confirm a booking from success_url.`,
      },
      {
        name: 'bw-reminders',
        purpose: 'Sends 24 hour reminder texts and expires stale pending bookings.',
        trigger: 'Supabase Cron, every 15 minutes',
        secrets: ['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_FROM_NUMBER', 'CRON_SECRET', 'APP_URL'],
        prompt: `Create a Supabase edge function at \`supabase/functions/bw-reminders/index.ts\`, called by Supabase Cron every 15 minutes with header x-cron-secret (401 if wrong).

Using the Supabase secret key:
1. Set status 'expired' on bookings that are 'pending' and older than 30 minutes.
2. Find bookings with status 'confirmed', sms_opt_in true, reminder_sent_at null, and starts_at between now + 23.5h and now + 24.5h.
3. For each, send an SMS with the Twilio REST API (POST https://api.twilio.com/2010-04-01/Accounts/{SID}/Messages.json, basic auth SID:TOKEN, form fields To, From, Body).
   Body, under 160 characters: "Reminder: {service} at {business} {Day} {HH:mm}. Change or cancel: {APP_URL}/b/cancel/{cancel_token}"
   Format the time in the business timezone.
4. Set reminder_sent_at = now() straight after each successful send. Log failures, do not retry in the same run.

Then schedule it with pg_cron + pg_net every 15 minutes (secret from Supabase Vault) using the Supabase MCP.`,
      },
    ],
    frontendTasks: [
      {
        id: 'bw-fe-booking-page',
        title: 'Build the public booking page',
        outcome: 'A mobile-first page customers use to pick a service, a day and a slot.',
        minutes: 75,
        xp: 60,
        blocks: [
          { type: 'callout', tone: 'eli5', title: 'Why is this page special?', text: 'Every other page needs a login. This one is for the barber\'s customers, who never sign up. So it cannot read the database directly. It asks an edge function "what is free on Tuesday?" and gets back only the times, never other people\'s names.' },
          { type: 'prompt', id: 'bw-fe-booking-prompt', title: 'Paste into Claude Code', code: `Read @PRD.md and @DESIGN.md.

Build the public booking flow at app/b/[handle]/page.tsx with the four step components in components/booking/.
- Server component loads the business name and active services through a server-only Supabase client using SUPABASE_SECRET_KEY,
  selecting only public fields (name, handle, timezone, services: id, name, minutes, price_cents, deposit_cents).
- Client steps: Service → Day (next 14 days) → Slot → Details, with progress dots and a back arrow, no page reloads.
- Slots come from supabase.functions.invoke('bw-public-slots') with handle, serviceId and date. Show Skeleton pills while loading.
- Details step: name, mobile with a country code select, "Text me a reminder" Switch on by default.
- Sticky bottom bar "Pay $X deposit and book" calls bw-create-booking and redirects to the returned url.
  On 409, toast "That slot was taken a moment ago" and reload slots.
- If ?held=<id> is in the URL, show "Your slot is held for 15 minutes."
- Build app/b/[handle]/done/page.tsx with the confirmation and an .ics download.
Use the amber tokens from the design PRD. Test at 360px wide.` },
          { type: 'steps', items: ['Open http://localhost:3000/b/your-handle on your phone (use your computer\'s local IP, e.g. http://192.168.1.20:3000).', 'Pick a service and a day.', 'Check the slots match your availability settings.'] },
          { type: 'mistakes', items: [
            { mistake: 'All slots show an hour off.', fix: 'Times are being shown in your laptop\'s timezone. Ask Claude Code: "Format every slot with Intl.DateTimeFormat using the business timezone, not the browser timezone."' },
            { mistake: 'Page shows other customers\' names in the network tab.', fix: 'The edge function is returning whole booking rows. Ask Claude Code to return only an array of ISO start times.' },
          ] },
        ],
        checklist: [
          { id: 'bw-fe-booking-c1', label: 'Copy the booking page prompt into Claude Code', trigger: 'copy:bw-fe-booking-prompt' },
          { id: 'bw-fe-booking-c2', label: 'Open your booking page on a real phone' },
          { id: 'bw-fe-booking-c3', label: 'Check the slots match your hours' },
        ],
      },
      {
        id: 'bw-fe-owner',
        title: 'Build services, hours and the today view',
        outcome: 'Owners can set up their business and see the day\'s bookings.',
        minutes: 50,
        xp: 40,
        blocks: [
          { type: 'prompt', id: 'bw-fe-owner-prompt', title: 'Paste into Claude Code', code: `Build the owner pages from @DESIGN.md:
- app/app/services/page.tsx: list + Dialog (name, minutes, price, deposit Slider from 0 to price, buffer minutes, active Switch).
- app/app/availability/page.tsx: seven weekday rows with a toggle and start/end time Selects in 15 minute steps, plus "Add day off".
- app/app/page.tsx: onboarding checklist card (service, hours, Google, payouts) until all done, then a Today card and Upcoming grouped by day.
  Row actions: Mark completed, Mark no-show, Cancel (cancel also deletes the Google event via a server route).
- Share card with the booking link, Copy button and a QR code from qrcode.react with a "Download PNG" button.
All reads and writes go through the browser Supabase client. RLS scopes them to the owner's business.` },
          { type: 'steps', items: ['Add one service: "Skin fade, 45 min, $35, $10 deposit".', 'Set Monday to Friday 09:00 to 17:00.', 'Download the QR code and scan it with your phone camera.'] },
          { type: 'callout', tone: 'tip', title: 'Seed a fake booking', text: 'Ask Claude Code: "Insert two test bookings for tomorrow for my business using the Supabase MCP" so you can see the Today view without paying a deposit.' },
        ],
        checklist: [
          { id: 'bw-fe-owner-c1', label: 'Copy the owner pages prompt', trigger: 'copy:bw-fe-owner-prompt' },
          { id: 'bw-fe-owner-c2', label: 'Add a service and weekly hours' },
          { id: 'bw-fe-owner-c3', label: 'Scan your QR code with your phone' },
        ],
      },
    ],
    backendTasks: [
      {
        id: 'bw-be-google',
        title: 'Set up the Google Calendar API',
        outcome: 'Owners can click "Connect Google Calendar" and their busy times block slots.',
        minutes: 35,
        xp: 50,
        blocks: [
          { type: 'callout', tone: 'eli5', title: 'Why Google needs a "permission ticket"', text: 'Your Google keys say "this is the Bookwell app". They do not let you see anyone\'s calendar. Each barber clicks "Allow" once, and Google hands you a refresh token: a ticket that lets Bookwell read their busy times and add bookings. You keep that ticket locked in the database.' },
          { type: 'steps', items: [
            'Go to console.cloud.google.com and sign in with your Google account. Top bar → project picker → New project → name "Bookwell" → Create. Make sure the new project is selected.',
            'Left menu → APIs & Services → Library → search "Google Calendar API" → click it → Enable.',
            'Left menu → Google Auth Platform (older consoles call it "OAuth consent screen") → Get started. App name "Bookwell", support email = yours → Audience: External → contact email → Create.',
            'Google Auth Platform → Data access → Add or remove scopes → tick `.../auth/calendar.events` and `.../auth/calendar.freebusy` → Update → Save.',
            'Google Auth Platform → Audience → Test users → Add users → add your own Gmail.',
            'Google Auth Platform → Clients → Create client → Application type: Web application → Name "Bookwell web". Authorised redirect URIs: `http://localhost:3000/api/google/callback` and `https://YOURDOMAIN/api/google/callback` → Create. Copy the Client ID (ends in `.apps.googleusercontent.com`) and Client secret (starts with `GOCSPX-`).',
          ] },
          { type: 'keys', rows: [
            { name: 'GOOGLE_CLIENT_ID', where: 'Google Cloud → Google Auth Platform → Clients → Bookwell web', pasteInto: '.env.local, Vercel env and Supabase secrets', secret: false },
            { name: 'GOOGLE_CLIENT_SECRET', where: 'Same client → Client secret', pasteInto: '.env.local, Vercel env and Supabase secrets', secret: true },
            { name: 'OAUTH_STATE_SECRET', where: 'Make one up: run `openssl rand -hex 32` in a terminal', pasteInto: '.env.local and Vercel env', secret: true },
          ] },
          { type: 'prompt', id: 'bw-be-google-prompt', title: 'Paste into Claude Code', code: `Build Google Calendar connect for Bookwell:
- app/api/google/connect/route.ts: check the user with supabase.auth.getClaims(), then redirect to https://accounts.google.com/o/oauth2/v2/auth
  with access_type=offline, prompt=consent, response_type=code, scopes https://www.googleapis.com/auth/calendar.events and https://www.googleapis.com/auth/calendar.freebusy,
  and a state value signed with OAUTH_STATE_SECRET that contains the business id.
- app/api/google/callback/route.ts: verify state, POST the code to https://oauth2.googleapis.com/token, store refresh_token in google_tokens with the
  SUPABASE_SECRET_KEY client, set businesses.google_connected = true, redirect to /app/settings?google=connected.
- lib/google.ts: getAccessToken(businessId), freeBusy(businessId, timeMin, timeMax) using POST https://www.googleapis.com/calendar/v3/freeBusy,
  and createEvent(businessId, booking) using POST https://www.googleapis.com/calendar/v3/calendars/{calendarId}/events.
Then connect my own Google account and print the freeBusy result for tomorrow.` },
          { type: 'p', text: 'A good freeBusy result looks like this. Each item in `busy` is a block that will hide slots on the booking page.' },
          { type: 'code', id: 'bw-be-google-good', filename: 'freebusy-response.json', lang: 'json', code: `{
  "kind": "calendar#freeBusy",
  "timeMin": "2026-10-19T00:00:00.000Z",
  "timeMax": "2026-10-20T00:00:00.000Z",
  "calendars": {
    "primary": {
      "busy": [
        { "start": "2026-10-19T09:00:00Z", "end": "2026-10-19T10:00:00Z" }
      ]
    }
  }
}` },
          { type: 'links', items: [
            { label: 'Google Cloud Console', url: 'https://console.cloud.google.com' },
            { label: 'Calendar API overview', url: 'https://developers.google.com/workspace/calendar/api/guides/overview' },
            { label: 'freeBusy reference', url: 'https://developers.google.com/workspace/calendar/api/v3/reference/freebusy/query' },
          ] },
        ],
        checklist: [
          { id: 'bw-be-google-c1', label: 'Create the Bookwell project and enable the Calendar API' },
          { id: 'bw-be-google-c2', label: 'Add the two calendar scopes and yourself as a test user' },
          { id: 'bw-be-google-c3', label: 'Create the web client and paste the keys' },
          { id: 'bw-be-google-c4', label: 'Copy the Google connect prompt', trigger: 'copy:bw-be-google-prompt' },
          { id: 'bw-be-google-c5', label: 'See your own busy times in the freeBusy result' },
        ],
      },
      {
        id: 'bw-be-twilio',
        title: 'Set up Twilio for SMS reminders',
        outcome: 'Your app can send confirmation and reminder texts.',
        minutes: 30,
        xp: 45,
        blocks: [
          { type: 'callout', tone: 'eli5', title: 'One number for every shop', text: 'Bookwell sends every reminder from one Twilio number that you own. The text names the shop, so customers know who it is from. You pay Twilio a tiny amount per text, and that cost is built into the $19 price.' },
          { type: 'steps', items: [
            'Go to twilio.com/try-twilio → sign up with email → verify your email and your own mobile number.',
            'Console home → Account Info: copy the Account SID (starts with `AC`) and click to reveal the Auth Token.',
            'Left menu → Phone Numbers → Manage → Buy a number → tick SMS → pick a local number → Buy (about $1.15/month).',
            'US numbers only: Messaging → Regulatory Compliance → A2P 10DLC → register a brand and one campaign (use case "Customer Care" or "Account Notification", sample message = the reminder text below). US texts are blocked until the campaign is approved, often 1 to 3 weeks, so start today.',
            'Trial accounts can only text verified numbers. Upgrade the account (Admin → Billing → Upgrade, add $20) before your first real customer.',
          ] },
          { type: 'keys', rows: [
            { name: 'TWILIO_ACCOUNT_SID', where: 'console.twilio.com → Account Info → Account SID', pasteInto: 'Supabase secrets', secret: false },
            { name: 'TWILIO_AUTH_TOKEN', where: 'console.twilio.com → Account Info → Auth Token', pasteInto: 'Supabase secrets', secret: true },
            { name: 'TWILIO_FROM_NUMBER', where: 'console.twilio.com → Phone Numbers → Active numbers, in +15551234567 format', pasteInto: 'Supabase secrets', secret: false },
          ] },
          { type: 'p', text: 'Send yourself a first test text from the terminal. Replace the three values in capitals.' },
          { type: 'code', id: 'bw-be-twilio-curl', filename: 'test-sms.sh', lang: 'bash', code: `curl -X POST "https://api.twilio.com/2010-04-01/Accounts/YOUR_ACCOUNT_SID/Messages.json" \\
  --data-urlencode "To=+447700900123" \\
  --data-urlencode "From=YOUR_TWILIO_NUMBER" \\
  --data-urlencode "Body=Reminder: Skin fade at Fade Room tomorrow 14:30. Change or cancel: https://bookwell.app/b/cancel/test" \\
  -u "YOUR_ACCOUNT_SID:YOUR_AUTH_TOKEN"` },
          { type: 'p', text: 'A good response is JSON with `"status": "queued"` and a `sid` starting with `SM`. The text lands on your phone a few seconds later.' },
          { type: 'mistakes', items: [
            { mistake: 'Error 21608: "The number is unverified".', fix: 'Trial accounts can only text verified numbers. Verify it under Phone Numbers → Verified Caller IDs, or upgrade the account.' },
            { mistake: 'Error 30034 on US numbers.', fix: 'Your A2P 10DLC campaign is not approved yet. Check Messaging → Regulatory Compliance and wait for approval.' },
          ] },
        ],
        checklist: [
          { id: 'bw-be-twilio-c1', label: 'Sign up for Twilio and buy an SMS number' },
          { id: 'bw-be-twilio-c2', label: 'Paste the three Twilio values into Supabase secrets' },
          { id: 'bw-be-twilio-c3', label: 'Copy the test curl and send yourself a text', trigger: 'copy:bw-be-twilio-curl' },
          { id: 'bw-be-twilio-c4', label: 'Start A2P 10DLC registration if you use a US number' },
        ],
      },
      {
        id: 'bw-be-connect',
        title: 'Turn on Stripe Connect for deposits',
        outcome: 'Each shop connects its own Stripe account and deposits land in its bank.',
        minutes: 35,
        xp: 50,
        blocks: [
          { type: 'callout', tone: 'eli5', title: 'Two kinds of money', text: 'Your $19 subscription goes to you through normal Stripe. The $10 deposits belong to the barber, so they go into the barber\'s own Stripe account. Stripe Connect is the bridge: Bookwell creates the checkout, but the money and the card fee sit with the shop.' },
          { type: 'steps', items: [
            'Stripe Dashboard (test mode on) → search bar → type "Connect" → Get started → choose "Platform or marketplace" → Continue.',
            'When asked who pays fees and who handles disputes, pick the option where connected accounts (the shops) pay Stripe fees and use their own Stripe Dashboard. These are Standard accounts with direct charges, so Bookwell pays no Connect fees.',
            'Connect → Settings → Branding: add the Bookwell name, icon and amber colour #C7801A.',
            'Developers → Webhooks → your existing endpoint → Add events → tick "Listen to events on Connected accounts" and add `checkout.session.completed` and `account.updated`. Copy the new signing secret if Stripe shows a separate one.',
          ] },
          { type: 'prompt', id: 'bw-be-connect-prompt', title: 'Paste into Claude Code', code: `Build Stripe Connect onboarding for Bookwell using the stripe npm package:
- app/api/stripe/connect/route.ts: check the user with supabase.auth.getClaims(). If businesses.stripe_account_id is empty,
  create an account with stripe.accounts.create({ type: 'standard', email }) and save the id. Then create an Account Link
  (stripe.accountLinks.create, type 'account_onboarding', refresh_url and return_url back to /app/settings) and redirect to its url.
- In the stripe-webhook function handle account.updated: when charges_enabled is true, mark payouts connected on the business.
- bw-create-booking must create the deposit Checkout Session as a direct charge with { stripeAccount: business.stripe_account_id }.
Then run through onboarding with Stripe test data and make one $10 test deposit with card 4242 4242 4242 4242.` },
          { type: 'code', id: 'bw-be-connect-curl', filename: 'check-account.sh', lang: 'bash', code: `curl https://api.stripe.com/v1/accounts/acct_YOUR_CONNECTED_ID \\
  -u "sk_test_YOUR_KEY:"` },
          { type: 'p', text: 'A good response shows `"charges_enabled": true` and `"type": "standard"`. If `charges_enabled` is false, the shop has not finished onboarding.' },
        ],
        checklist: [
          { id: 'bw-be-connect-c1', label: 'Turn on Connect in test mode as a platform' },
          { id: 'bw-be-connect-c2', label: 'Add connected-account events to your webhook' },
          { id: 'bw-be-connect-c3', label: 'Copy the Connect prompt into Claude Code', trigger: 'copy:bw-be-connect-prompt' },
          { id: 'bw-be-connect-c4', label: 'Make a $10 test deposit and see it in the connected account' },
        ],
      },
      {
        id: 'bw-be-functions',
        title: 'Deploy the booking edge functions',
        outcome: 'Slots, bookings and reminders run on Supabase.',
        minutes: 30,
        xp: 40,
        blocks: [
          { type: 'p', text: 'With all three services connected, Claude Code builds the three edge functions from the PRD and schedules the reminder job.' },
          { type: 'keys', rows: [
            { name: 'CRON_SECRET', where: 'Make one up: run `openssl rand -hex 24`', pasteInto: 'Supabase secrets', secret: true },
            { name: 'APP_URL', where: 'Your live URL, e.g. https://bookwell.app', pasteInto: 'Supabase secrets', secret: false },
            { name: 'STRIPE_SECRET_KEY', where: 'Stripe → Developers → API keys → Secret key', pasteInto: 'Supabase secrets', secret: true },
          ] },
          { type: 'prompt', id: 'bw-be-functions-prompt', title: 'Paste into Claude Code', code: `Build and deploy bw-public-slots, bw-create-booking and bw-reminders as described in @PRD.md section 8 using the Supabase MCP.
Deploy bw-public-slots and bw-create-booking with verify_jwt false. Schedule bw-reminders every 15 minutes with pg_cron + pg_net, reading CRON_SECRET from Supabase Vault.
Then make a booking for tomorrow at this time on my own booking page and show me the booking row, the Google event id and the confirmation SMS sid.` },
          { type: 'callout', tone: 'tip', title: 'Test the reminder without waiting a day', text: 'Ask Claude Code: "Temporarily change the reminder window to 0 to 2 hours, make a booking for 1 hour from now, run bw-reminders once, then change it back."' },
        ],
        checklist: [
          { id: 'bw-be-functions-c1', label: 'Add CRON_SECRET, APP_URL and STRIPE_SECRET_KEY to Supabase secrets' },
          { id: 'bw-be-functions-c2', label: 'Copy the deploy prompt into Claude Code', trigger: 'copy:bw-be-functions-prompt' },
          { id: 'bw-be-functions-c3', label: 'Get a reminder text for a test booking' },
        ],
      },
    ],
    securityTasks: [
      {
        id: 'bw-sec-booking',
        title: 'Try to double book and peek at customers',
        outcome: 'Proof that slots cannot be double booked and customer phone numbers stay private.',
        minutes: 25,
        xp: 40,
        blocks: [
          { type: 'callout', tone: 'eli5', title: 'Two attacks to try', text: 'First, two people tap the same 2pm slot at the same moment. Only one may win. Second, a stranger tries to read the list of customers and their phone numbers. They must get nothing.' },
          { type: 'steps', items: [
            'Open your booking page in two browsers side by side.',
            'Pick the same service, day and slot in both.',
            'Tap "Pay deposit and book" in both as fast as you can. One must go to Stripe, the other must show "That slot was taken a moment ago."',
          ] },
          { type: 'prompt', id: 'bw-sec-booking-prompt', title: 'Paste into Claude Code', code: `Write and run scripts/security-check.ts that:
1. Fires 10 parallel bw-create-booking calls for the same slot and checks exactly one returns a url and nine return 409.
2. Uses only the publishable key (no login) to select from bookings, google_tokens, businesses and services and checks every result is empty or an error.
3. Signs in as a second owner and checks they see zero bookings from the first owner's business and cannot update them.
4. Calls bw-public-slots and checks the response contains no phone numbers or names.
5. Calls bw-reminders without x-cron-secret and checks it returns 401.
Print PASS or FAIL for each. Fix anything that fails.` },
          { type: 'mistakes', items: [
            { mistake: 'Two bookings got through in test 1.', fix: 'The exclusion constraint is missing. Re-run the bookings table part of the SQL, including btree_gist.' },
          ] },
        ],
        checklist: [
          { id: 'bw-sec-booking-c1', label: 'Try to book the same slot from two browsers' },
          { id: 'bw-sec-booking-c2', label: 'Copy the security prompt into Claude Code', trigger: 'copy:bw-sec-booking-prompt' },
          { id: 'bw-sec-booking-c3', label: 'See PASS on all five checks' },
        ],
      },
    ],
    marketing: {
      outbound: [
        {
          id: 'bw-mk-out-walkin',
          title: 'Walk into 20 local barbers and gyms',
          outcome: '20 face to face pitches and at least 3 trials set up on the spot.',
          minutes: 180,
          xp: 70,
          blocks: [
            { type: 'p', text: 'Local businesses buy from people they have met. Go at a quiet time (Tuesday to Thursday, 10am to 12pm) with your phone ready to set them up in 5 minutes.' },
            { type: 'steps', items: [
              'Make a list of 20 barbers, PTs and salons within 2 miles on Google Maps. Prefer ones whose Instagram bio says "DM to book".',
              'Print 20 small cards with a QR code to your landing page.',
              'Walk in, ask for the owner, use the script below.',
              'If they say yes, sign them up on their phone, add one service and their hours there and then.',
            ] },
            { type: 'code', id: 'bw-mk-out-walkin-script', filename: 'walk-in-script.txt', lang: 'txt', code: `"Hi, quick one, I will be 30 seconds. How many people a month book and do not turn up?
[wait]
I built Bookwell for shops like yours. People book from a link in your Instagram bio, pay a $10 deposit,
and get a text the day before. It goes straight into your Google Calendar.
It is free for 7 days. Can I set it up on your phone now? Takes 5 minutes."` },
            { type: 'callout', tone: 'tip', title: 'Bring proof', text: 'Have your own demo booking page open on your phone, with a fake barber shop, so they can tap through it.' },
          ],
          checklist: [
            { id: 'bw-mk-out-walkin-c1', label: 'List 20 local businesses on Google Maps' },
            { id: 'bw-mk-out-walkin-c2', label: 'Copy the walk-in script', trigger: 'copy:bw-mk-out-walkin-script' },
            { id: 'bw-mk-out-walkin-c3', label: 'Visit all 20 and log each answer' },
          ],
        },
        {
          id: 'bw-mk-out-instadm',
          title: 'DM 50 Instagram businesses that say "DM to book"',
          outcome: '50 targeted DMs to businesses that are booking by hand right now.',
          minutes: 75,
          xp: 45,
          blocks: [
            { type: 'steps', items: [
              'Search Instagram for "barber [your city]", "personal trainer [your city]", "tutor [your city]".',
              'Open profiles with "DM to book" or "WhatsApp to book" in the bio.',
              'Follow, like two recent posts, then send the DM below.',
              'Send 10 a day so the account is not flagged.',
            ] },
            { type: 'code', id: 'bw-mk-out-instadm-dm', filename: 'insta-dm.txt', lang: 'txt', code: `Hey! Love the {recent post detail}. Noticed you take bookings by DM. I made a booking link for barbers/PTs that takes a small deposit and texts people a reminder so they actually turn up. Want me to set one up for you free for a week? I can make it look like your brand.` },
            { type: 'callout', tone: 'tip', title: 'Make it for them first', text: 'For the best 10 prospects, create their booking page yourself before you DM, then send them the live link. Seeing their own name on it converts far better.' },
          ],
          checklist: [
            { id: 'bw-mk-out-instadm-c1', label: 'Find 50 "DM to book" profiles' },
            { id: 'bw-mk-out-instadm-c2', label: 'Copy the DM template', trigger: 'copy:bw-mk-out-instadm-dm' },
            { id: 'bw-mk-out-instadm-c3', label: 'Send 10 DMs today' },
          ],
        },
      ],
      inbound: [
        {
          id: 'bw-mk-in-calculator',
          title: 'Publish a no-show cost calculator',
          outcome: 'A free tool page that ranks for "no show calculator" and starts trials.',
          minutes: 45,
          xp: 40,
          blocks: [
            { type: 'prompt', id: 'bw-mk-in-calculator-prompt', title: 'Paste into Claude Code', code: `Add app/(marketing)/no-show-calculator/page.tsx: "How much are no-shows costing you?"
Inputs: average appointment price, appointments per week, no-shows per month.
Output: money lost per month and per year in big numbers, plus "With a $10 deposit and a reminder text, most shops cut no-shows by half. That is $X back a year."
Under it a Bookwell card with "Start 7-day free trial". Add SEO metadata. Mobile first.` },
            { type: 'steps', items: ['Deploy and open it live.', 'Post it in two local business Facebook groups as a free tool.', 'Add it to your walk-in cards as a second QR code.'] },
            { type: 'callout', tone: 'eli5', title: 'Why a calculator?', text: 'Owners rarely add up what no-shows cost. When they see "$1,680 a year" in big numbers, $19 a month suddenly looks small.' },
          ],
          checklist: [
            { id: 'bw-mk-in-calculator-c1', label: 'Copy the calculator prompt', trigger: 'copy:bw-mk-in-calculator-prompt' },
            { id: 'bw-mk-in-calculator-c2', label: 'Deploy the calculator page' },
            { id: 'bw-mk-in-calculator-c3', label: 'Share it in two local groups' },
          ],
        },
        {
          id: 'bw-mk-in-poweredby',
          title: 'Add a "Powered by Bookwell" link to every booking page',
          outcome: 'Every customer who books becomes a free ad for Bookwell.',
          minutes: 20,
          xp: 25,
          blocks: [
            { type: 'p', text: 'Every booking page is seen by dozens of customers, and some of them run their own small business. A small footer link turns each page into a referral source.' },
            { type: 'prompt', id: 'bw-mk-in-poweredby-prompt', title: 'Paste into Claude Code', code: `On app/b/[handle]/page.tsx and the done page add a small footer: "Booking by Bookwell. Run a business? Get your own booking page." linking to /?ref=<handle>.
Store ref in a cookie on the landing page and save it to profiles on signup as referred_by (add the column with a migration via the Supabase MCP).` },
            { type: 'steps', items: ['Deploy.', 'Make a test booking and click the footer link.', 'Sign up a test account and check referred_by is filled in the Supabase table editor.'] },
          ],
          checklist: [
            { id: 'bw-mk-in-poweredby-c1', label: 'Copy the footer prompt', trigger: 'copy:bw-mk-in-poweredby-prompt' },
            { id: 'bw-mk-in-poweredby-c2', label: 'Check referred_by fills in after a test signup' },
          ],
        },
      ],
      paid: [
        {
          id: 'bw-mk-paid-meta',
          title: 'Run a $100 Meta ads test to local service owners',
          outcome: 'A clear answer on whether Facebook and Instagram ads bring trials under $20 each.',
          minutes: 45,
          xp: 40,
          blocks: [
            { type: 'callout', tone: 'warn', title: 'Hard stop at $100', text: 'Set a lifetime budget. If you get zero trials, stop and put the time into walk-ins instead.' },
            { type: 'steps', items: [
              'Go to business.facebook.com → Ads Manager → Create → Objective: Traffic.',
              'Location: your city plus 25 miles. Detailed targeting: interests "Barber", "Personal trainer", "Small business owner". Age 22 to 50.',
              'Placements: Instagram Feed and Stories, Facebook Feed.',
              'Creative: a 10 second screen recording of someone booking on a phone.',
              'Paste the copy below, set a $100 lifetime budget over 7 days, publish.',
            ] },
            { type: 'code', id: 'bw-mk-paid-meta-copy', filename: 'meta-ad.txt', lang: 'txt', code: `Primary text: Tired of people not turning up? Bookwell gives you a booking link with a $10 deposit and a reminder text. Goes straight into your Google Calendar. 7 days free.
Headline: Stop losing money to no-shows
Button: Learn more` },
          ],
          checklist: [
            { id: 'bw-mk-paid-meta-c1', label: 'Record a 10 second booking video' },
            { id: 'bw-mk-paid-meta-c2', label: 'Copy the ad copy', trigger: 'copy:bw-mk-paid-meta-copy' },
            { id: 'bw-mk-paid-meta-c3', label: 'Publish with a $100 lifetime budget' },
          ],
        },
      ],
    },
    launchTasks: [
      {
        id: 'bw-launch-google-verify',
        title: 'Publish your Google OAuth app and write the landing page',
        outcome: 'Any barber can connect their calendar, and the landing page sells the trial.',
        minutes: 45,
        xp: 45,
        blocks: [
          { type: 'callout', tone: 'eli5', title: 'Why "publish" the Google app?', text: 'While your Google app is in Testing mode, only people you list by email can connect. Publishing it lets anyone click "Allow". Google may ask you to verify the app because calendar access is a sensitive scope.' },
          { type: 'steps', items: [
            'Google Cloud → APIs & Services → OAuth consent screen → add your live domain, a privacy page URL and a home page URL.',
            'Click "Publish app". If Google asks for verification, follow its form and record the short demo video it asks for.',
            'Until approved, add each new customer\'s Gmail as a test user (up to 100).',
          ] },
          { type: 'prompt', id: 'bw-launch-landing-prompt', title: 'Paste into Claude Code', code: `Build the marketing landing page at app/(marketing)/page.tsx exactly as specified in @LANDING.md, top to bottom: every section, the exact copy,
the motion specs with the reduced-motion fallbacks, the responsive notes, SEO metadata, JSON-LD, the OG image and every analytics event.
Use the tokens from @DESIGN.md. Wire the pricing toggle to the four STRIPE_PRICE_* env vars. Add a /privacy page linked from the footer.
When done, take screenshots at 390px and 1440px wide and fix anything that overflows.` },
        ],
        checklist: [
          { id: 'bw-launch-c1', label: 'Add your domain and privacy page to the OAuth consent screen' },
          { id: 'bw-launch-c2', label: 'Click Publish app in Google Cloud' },
          { id: 'bw-launch-c3', label: 'Copy the landing page prompt', trigger: 'copy:bw-launch-landing-prompt' },
        ],
      },
    ],
    repoTree: bwRepoTree,
    starterFiles: [
      {
        path: 'README.md',
        content: `# Bookwell

Booking pages for local service businesses: services, weekly hours, Google Calendar sync,
deposits through Stripe Connect and SMS reminders through Twilio.

## Stack
Next.js (App Router) + Tailwind + shadcn/ui, Supabase (auth, Postgres, edge functions, cron),
Stripe (Bookwell subscription at $19/month + Connect Standard accounts for deposits), Twilio, Google Calendar API, Resend.

## Start
1. \`npm install\`
2. Copy \`.env.example\` to \`.env.local\` and fill it in.
3. Run \`supabase/migrations/0001_bookwell.sql\` in the Supabase SQL editor.
4. \`npm run dev\`, sign up, create your business, open \`/b/your-handle\`.

## Important
- Customers never log in. Public pages use edge functions, never direct table reads.
- Double booking is blocked by the \`bookings_no_overlap\` constraint. Do not remove it.
`,
      },
      {
        path: '.env.example',
        content: `# Browser-safe
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-REF.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxx
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Server only
SUPABASE_SECRET_KEY=sb_secret_xxx
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_PRICE_SOLO_MONTHLY=price_xxx
STRIPE_PRICE_SOLO_YEARLY=price_xxx
STRIPE_PRICE_STUDIO_MONTHLY=price_xxx
STRIPE_PRICE_STUDIO_YEARLY=price_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxx
OAUTH_STATE_SECRET=make-a-long-random-string

# Supabase secrets (set with: Edge Functions → Secrets)
# TWILIO_ACCOUNT_SID=ACxxx
# TWILIO_AUTH_TOKEN=xxx
# TWILIO_FROM_NUMBER=+15551234567
# GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET (same values as above)
# STRIPE_SECRET_KEY (same value as above)
# CRON_SECRET=make-a-long-random-string
# APP_URL=https://yourdomain.com
`,
      },
    ],
  },
}
