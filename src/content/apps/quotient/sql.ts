// Quotient single migration, pasted into the Supabase SQL editor once on a fresh project.

export const sql = `-- =====================================================================
-- Quotient: full database migration
-- Paste this whole file into Supabase > SQL Editor > New query > Run.
-- Run it ONCE on a fresh project. Order: extensions, enums, tables,
-- helper functions, triggers, RLS policies, views, storage, realtime,
-- schedules (commented out, run later).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. EXTENSIONS
-- ELI5: extensions are add-ons for the database. pgcrypto makes secure
-- random tokens and SHA-256 hashes. btree_gist lets the database refuse
-- two bookings that overlap on the same calendar, even if two customers
-- click "Book" in the same second.
-- ---------------------------------------------------------------------
create extension if not exists pgcrypto with schema extensions;
create extension if not exists btree_gist with schema extensions;

-- ---------------------------------------------------------------------
-- 1. ENUMS
-- ELI5: an enum is a fixed list of allowed words for a column. A lead
-- can be 'quoted' or 'won', never 'banana'.
-- ---------------------------------------------------------------------
create type public.workspace_role as enum ('owner', 'admin', 'member');
create type public.trade as enum ('cleaning', 'landscaping', 'painting', 'removals', 'windows', 'other');
create type public.calculator_status as enum ('draft', 'published', 'archived');
create type public.lead_status as enum ('new', 'quoted', 'booked', 'won', 'lost');
create type public.lead_source as enum ('widget', 'hosted', 'manual');
create type public.ai_status as enum ('none', 'queued', 'running', 'done', 'failed', 'skipped');
create type public.booking_kind as enum ('survey', 'job');
create type public.booking_status as enum ('held', 'confirmed', 'cancelled', 'completed', 'no_show');
create type public.deposit_status as enum ('pending', 'paid', 'expired', 'refunded');
create type public.job_kind as enum ('ai_review');
create type public.job_status as enum ('queued', 'running', 'done', 'dead');
create type public.follow_up_status as enum ('scheduled', 'sent', 'skipped', 'cancelled');
create type public.message_channel as enum ('sms', 'email');
create type public.sms_sender_kind as enum ('toll_free', 'alpha');
create type public.sms_sender_status as enum ('draft', 'in_review', 'approved', 'rejected');
create type public.usage_kind as enum ('quotes', 'sms_credits', 'ai_reviews');

-- ---------------------------------------------------------------------
-- 2. SHARED TRIGGER: updated_at
-- ELI5: every time a row changes, this stamps the time on it.
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- 3. PROFILES (one per login) + signup trigger
-- ELI5: Supabase keeps logins in auth.users. We keep a friendly profile
-- next to it, created automatically the moment someone signs up.
-- ---------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  current_workspace_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- 4. WORKSPACES (= one trades business), MEMBERS, INVITES
-- ELI5: a workspace is one business: "Sparkle Cleaning Ltd". The owner's
-- subscription pays for it. On the Agency plan one owner (the agency)
-- owns up to 10 client businesses and one subscription covers them all.
-- ---------------------------------------------------------------------
create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 80),
  slug text not null unique check (slug ~ '^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$'),
  owner_id uuid not null references auth.users (id) on delete cascade,
  country text not null default 'US' check (country ~ '^[A-Z]{2}$'),
  currency text not null default 'usd' check (currency ~ '^[a-z]{3}$'),
  timezone text not null default 'America/New_York',
  logo_path text,
  brand_hex text not null default '#3fa6a0' check (brand_hex ~ '^#[0-9A-Fa-f]{6}$'),
  contact_email text,
  contact_phone text,
  website text,
  show_badge boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index workspaces_owner_idx on public.workspaces (owner_id);
create trigger workspaces_updated_at before update on public.workspaces
  for each row execute function public.set_updated_at();

alter table public.profiles
  add constraint profiles_current_workspace_fk
  foreign key (current_workspace_id) references public.workspaces (id) on delete set null;
create index profiles_current_workspace_idx on public.profiles (current_workspace_id);

create table public.workspace_members (
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.workspace_role not null default 'member',
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);
create index workspace_members_user_idx on public.workspace_members (user_id);

create table public.workspace_invites (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  email text not null check (position('@' in email) > 1),
  role public.workspace_role not null default 'member' check (role <> 'owner'),
  token_hash text not null unique,
  invited_by uuid references auth.users (id) on delete set null,
  expires_at timestamptz not null default now() + interval '7 days',
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);
create index workspace_invites_ws_idx on public.workspace_invites (workspace_id);
create index workspace_invites_invited_by_idx on public.workspace_invites (invited_by);
create unique index workspace_invites_open_email_idx
  on public.workspace_invites (workspace_id, lower(email)) where accepted_at is null;

-- ---------------------------------------------------------------------
-- 5. MEMBERSHIP HELPERS (used by every policy below)
-- ELI5: these are the bouncers. "Is this person in this business?" and
-- "Is this person an owner or admin here?". security definer lets them
-- read the members table without tripping over its own RLS.
-- ---------------------------------------------------------------------
create or replace function public.is_workspace_member(ws uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.workspace_members m
    where m.workspace_id = ws and m.user_id = (select auth.uid())
  );
$$;

create or replace function public.has_workspace_role(ws uuid, roles public.workspace_role[])
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.workspace_members m
    where m.workspace_id = ws and m.user_id = (select auth.uid()) and m.role = any (roles)
  );
$$;

-- Same check from a Storage path folder (text). Never casts, so a junk
-- folder name returns false instead of an error.
create or replace function public.is_workspace_member_text(ws text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.workspace_members m
    where m.workspace_id::text = ws and m.user_id = (select auth.uid())
  );
$$;

create or replace function public.has_workspace_role_text(ws text, roles public.workspace_role[])
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.workspace_members m
    where m.workspace_id::text = ws and m.user_id = (select auth.uid()) and m.role = any (roles)
  );
$$;

create or replace function public.shares_workspace_with(other uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.workspace_members a
    join public.workspace_members b on b.workspace_id = a.workspace_id
    where a.user_id = (select auth.uid()) and b.user_id = other
  );
$$;

-- ---------------------------------------------------------------------
-- 6. CALENDARS AND AVAILABILITY
-- ELI5: a calendar is one diary that customers can book into: "Survey
-- van" or "Crew A". Availability windows say "Mondays 8:00 to 16:00".
-- Blackouts are holidays. Bookings can never overlap on one calendar.
-- ---------------------------------------------------------------------
create table public.calendars (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  name text not null default 'Main calendar' check (char_length(name) between 1 and 60),
  timezone text not null default 'America/New_York',
  survey_minutes integer not null default 30 check (survey_minutes between 15 and 240),
  job_minutes integer not null default 120 check (job_minutes between 30 and 720),
  buffer_minutes integer not null default 30 check (buffer_minutes between 0 and 240),
  min_notice_hours integer not null default 24 check (min_notice_hours between 0 and 336),
  max_days_ahead integer not null default 45 check (max_days_ahead between 1 and 180),
  ics_token_hash text unique,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index calendars_ws_idx on public.calendars (workspace_id);
create trigger calendars_updated_at before update on public.calendars
  for each row execute function public.set_updated_at();

create table public.availability_windows (
  id uuid primary key default gen_random_uuid(),
  calendar_id uuid not null references public.calendars (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6), -- 0 = Sunday
  start_time time not null,
  end_time time not null,
  kinds public.booking_kind[] not null default array['survey', 'job']::public.booking_kind[],
  check (end_time > start_time)
);
create index availability_windows_calendar_idx on public.availability_windows (calendar_id, weekday);
create index availability_windows_ws_idx on public.availability_windows (workspace_id);

create table public.blackouts (
  id uuid primary key default gen_random_uuid(),
  calendar_id uuid not null references public.calendars (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  reason text not null default '',
  check (ends_at > starts_at)
);
create index blackouts_calendar_idx on public.blackouts (calendar_id, starts_at);
create index blackouts_ws_idx on public.blackouts (workspace_id);

-- ---------------------------------------------------------------------
-- 7. CALCULATORS AND PUBLISHED VERSIONS
-- ELI5: a calculator is the price list plus the questions the customer
-- answers ("How many bedrooms?"). You edit a draft. Publishing freezes a
-- copy (a version). Every quote remembers which version priced it, so
-- an old quote never changes when you raise your prices.
-- The config shape is in PRD section 8.2 and validated by zod in the app
-- and in the edge functions.
-- ---------------------------------------------------------------------
create table public.calculators (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  calendar_id uuid references public.calendars (id) on delete set null,
  created_by uuid references auth.users (id) on delete set null,
  name text not null check (char_length(name) between 2 and 80),
  slug text not null check (slug ~ '^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$'),
  trade public.trade not null default 'other',
  status public.calculator_status not null default 'draft',
  draft_config jsonb not null default '{}'::jsonb check (jsonb_typeof(draft_config) = 'object'),
  published_version_id uuid,
  allowed_origins text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, slug)
);
create index calculators_ws_idx on public.calculators (workspace_id);
create index calculators_calendar_idx on public.calculators (calendar_id);
create index calculators_created_by_idx on public.calculators (created_by);
create trigger calculators_updated_at before update on public.calculators
  for each row execute function public.set_updated_at();

create table public.calculator_versions (
  id uuid primary key default gen_random_uuid(),
  calculator_id uuid not null references public.calculators (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  version_no integer not null,
  config jsonb not null check (jsonb_typeof(config) = 'object'),
  published_by uuid references auth.users (id) on delete set null,
  published_at timestamptz not null default now(),
  unique (calculator_id, version_no)
);
create index calculator_versions_ws_idx on public.calculator_versions (workspace_id);
create index calculator_versions_published_by_idx on public.calculator_versions (published_by);

alter table public.calculators
  add constraint calculators_published_version_fk
  foreign key (published_version_id) references public.calculator_versions (id) on delete set null;
create index calculators_published_version_idx on public.calculators (published_version_id);

-- ---------------------------------------------------------------------
-- 8. LEADS, PHOTOS, TIMELINE, AI REVIEWS
-- ELI5: a lead is one customer asking for a price. It holds their
-- answers, the price range they saw, and where they came from. Photos
-- are files in Storage. The timeline is every thing that happened.
-- The AI review is Claude's note on whether a site visit is needed.
-- It NEVER holds a price.
-- ---------------------------------------------------------------------
create table public.leads (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  calculator_id uuid references public.calculators (id) on delete set null,
  version_id uuid references public.calculator_versions (id) on delete set null,
  public_token_hash text not null unique check (public_token_hash ~ '^[0-9a-f]{64}$'),
  status public.lead_status not null default 'new',
  source public.lead_source not null default 'widget',
  customer_name text not null check (char_length(customer_name) between 1 and 120),
  customer_email text check (customer_email is null or position('@' in customer_email) > 1),
  customer_phone text check (customer_phone is null or customer_phone ~ '^\\+[1-9][0-9]{6,14}$'),
  postcode text not null default '',
  address_line text not null default '',
  answers jsonb not null default '{}'::jsonb,
  customer_notes text not null default '' check (char_length(customer_notes) <= 2000),
  priced boolean not null default false,
  price_low_cents integer check (price_low_cents >= 0),
  price_high_cents integer check (price_high_cents >= 0),
  price_breakdown jsonb not null default '[]'::jsonb,
  currency text not null default 'usd',
  zone_label text,
  needs_site_visit boolean not null default false,
  site_visit_reason text,
  ai_status public.ai_status not null default 'none',
  ai_summary text,
  sms_consent boolean not null default false,
  email_consent boolean not null default true,
  consent_text text not null default '',
  consent_at timestamptz,
  utm_source text, utm_medium text, utm_campaign text,
  referrer_host text,
  landing_url text,
  assigned_to uuid references auth.users (id) on delete set null,
  won_value_cents integer check (won_value_cents >= 0),
  lost_reason text,
  quoted_at timestamptz, booked_at timestamptz, won_at timestamptz, lost_at timestamptz,
  last_customer_activity_at timestamptz,
  follow_ups_paused boolean not null default false,
  ip_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (price_high_cents is null or price_low_cents is null or price_high_cents >= price_low_cents),
  check (customer_email is not null or customer_phone is not null)
);
create index leads_ws_created_idx on public.leads (workspace_id, created_at desc);
create index leads_ws_status_idx on public.leads (workspace_id, status);
create index leads_calculator_idx on public.leads (calculator_id);
create index leads_version_idx on public.leads (version_id);
create index leads_assigned_idx on public.leads (assigned_to);
create index leads_ws_phone_idx on public.leads (workspace_id, customer_phone);
create trigger leads_updated_at before update on public.leads
  for each row execute function public.set_updated_at();

create table public.lead_photos (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  storage_path text not null unique,
  mime text not null check (mime in ('image/jpeg', 'image/png', 'image/webp', 'image/heic')),
  bytes integer not null check (bytes between 1 and 10485760),
  width integer, height integer,
  uploaded boolean not null default false,
  created_at timestamptz not null default now()
);
create index lead_photos_lead_idx on public.lead_photos (lead_id);
create index lead_photos_ws_idx on public.lead_photos (workspace_id);

create table public.lead_events (
  id bigint generated always as identity primary key,
  lead_id uuid not null references public.leads (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  kind text not null,       -- created, status_changed, note, sms_sent, email_sent, booked, deposit_paid ...
  data jsonb not null default '{}'::jsonb,
  actor_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
create index lead_events_lead_idx on public.lead_events (lead_id, created_at desc);
create index lead_events_ws_idx on public.lead_events (workspace_id);
create index lead_events_actor_idx on public.lead_events (actor_id);

create table public.ai_reviews (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  model text not null,
  result jsonb not null,
  needs_site_visit boolean not null,
  confidence numeric not null check (confidence between 0 and 1),
  photo_count integer not null default 0,
  cost_usd_micros bigint not null default 0,
  created_at timestamptz not null default now()
);
create index ai_reviews_lead_idx on public.ai_reviews (lead_id, created_at desc);
create index ai_reviews_ws_idx on public.ai_reviews (workspace_id);

-- ---------------------------------------------------------------------
-- 9. BOOKINGS AND DEPOSITS
-- ELI5: a booking is a slot in a calendar. "held" means a customer is
-- paying the deposit right now (it expires after 35 minutes). The
-- exclusion constraint is the database saying "no two live bookings may
-- overlap on the same calendar". Deposits are paid to the business's
-- own Stripe account, never to yours.
-- ---------------------------------------------------------------------
create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  lead_id uuid not null references public.leads (id) on delete cascade,
  calendar_id uuid not null references public.calendars (id) on delete cascade,
  kind public.booking_kind not null,
  status public.booking_status not null default 'held',
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  hold_expires_at timestamptz,
  deposit_cents integer not null default 0 check (deposit_cents >= 0),
  currency text not null default 'usd',
  manage_token_hash text not null unique check (manage_token_hash ~ '^[0-9a-f]{64}$'),
  customer_note text not null default '' check (char_length(customer_note) <= 1000),
  cancelled_reason text,
  reminder_sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at),
  constraint bookings_no_overlap exclude using gist (
    calendar_id with =,
    tstzrange(starts_at, ends_at, '[)') with &&
  ) where (status in ('held', 'confirmed'))
);
create index bookings_ws_starts_idx on public.bookings (workspace_id, starts_at);
create index bookings_lead_idx on public.bookings (lead_id);
create index bookings_calendar_idx on public.bookings (calendar_id, starts_at);
create index bookings_hold_idx on public.bookings (hold_expires_at) where status = 'held';
create trigger bookings_updated_at before update on public.bookings
  for each row execute function public.set_updated_at();

create table public.deposits (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  booking_id uuid not null unique references public.bookings (id) on delete cascade,
  lead_id uuid not null references public.leads (id) on delete cascade,
  amount_cents integer not null check (amount_cents >= 50),
  currency text not null,
  stripe_account_id text not null,
  checkout_session_id text unique,
  payment_intent_id text,
  status public.deposit_status not null default 'pending',
  paid_at timestamptz,
  refunded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index deposits_ws_idx on public.deposits (workspace_id);
create index deposits_lead_idx on public.deposits (lead_id);
create trigger deposits_updated_at before update on public.deposits
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- 10. INTEGRATIONS: Stripe payouts account and the SMS sender
-- ELI5: integrations remembers which Stripe account belongs to which
-- business. sms_senders is the business's texting identity: a verified
-- toll-free number (US, Canada) or a name like "SparkleCln" (UK).
-- ---------------------------------------------------------------------
create table public.integrations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  provider text not null check (provider in ('stripe')),
  external_account_id text not null,
  display_name text not null default '',
  charges_enabled boolean not null default false,
  details_submitted boolean not null default false,
  status text not null default 'onboarding' check (status in ('onboarding', 'active', 'restricted', 'disconnected')),
  connected_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, provider),
  unique (provider, external_account_id)
);
create index integrations_connected_by_idx on public.integrations (connected_by);
create trigger integrations_updated_at before update on public.integrations
  for each row execute function public.set_updated_at();

create table public.sms_senders (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null unique references public.workspaces (id) on delete cascade,
  country text not null check (country in ('US', 'CA', 'GB')),
  kind public.sms_sender_kind not null,
  twilio_subaccount_sid text unique check (twilio_subaccount_sid is null or twilio_subaccount_sid ~ '^AC[0-9a-f]{32}$'),
  messaging_service_sid text,
  phone_number text,
  alpha_id text check (alpha_id is null or alpha_id ~ '^[A-Za-z0-9 &._-]{2,11}$'),
  verification_sid text,
  status public.sms_sender_status not null default 'draft',
  rejection_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger sms_senders_updated_at before update on public.sms_senders
  for each row execute function public.set_updated_at();

create table public.sms_opt_outs (
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  phone_e164 text not null,
  created_at timestamptz not null default now(),
  primary key (workspace_id, phone_e164)
);

-- ---------------------------------------------------------------------
-- 11. FOLLOW-UPS, MESSAGE LOGS
-- ELI5: follow_up_rules is the owner's plan ("text after 1 day, email
-- after 3 days"). follow_ups is one row per planned message per lead,
-- so the reminder worker can never send the same one twice.
-- sms_log and email_log record every message that actually went out.
-- ---------------------------------------------------------------------
create table public.follow_up_rules (
  workspace_id uuid primary key references public.workspaces (id) on delete cascade,
  enabled boolean not null default true,
  steps jsonb not null default '[
    {"after_hours": 2,  "channel": "sms",   "template": "follow_up_1"},
    {"after_hours": 48, "channel": "email", "template": "follow_up_2"},
    {"after_hours": 120, "channel": "sms",  "template": "follow_up_3"}
  ]'::jsonb check (jsonb_typeof(steps) = 'array' and jsonb_array_length(steps) <= 4),
  quiet_start time not null default '20:00',
  quiet_end time not null default '08:00',
  booking_reminder_hours integer not null default 24 check (booking_reminder_hours between 2 and 72),
  templates jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
create trigger follow_up_rules_updated_at before update on public.follow_up_rules
  for each row execute function public.set_updated_at();

create table public.follow_ups (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  step_no smallint not null check (step_no between 1 and 4),
  channel public.message_channel not null,
  template text not null,
  due_at timestamptz not null,
  status public.follow_up_status not null default 'scheduled',
  sent_at timestamptz,
  skip_reason text,
  created_at timestamptz not null default now(),
  unique (lead_id, step_no)
);
create index follow_ups_due_idx on public.follow_ups (due_at) where status = 'scheduled';
create index follow_ups_ws_idx on public.follow_ups (workspace_id);

create table public.sms_log (
  id bigint generated always as identity primary key,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  lead_id uuid references public.leads (id) on delete set null,
  kind text not null,
  dedupe_key text not null unique,
  to_phone text not null,
  body text not null,
  twilio_sid text unique,
  status text not null default 'queued',
  segments integer not null default 1,
  credits integer not null default 1,
  error_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index sms_log_ws_idx on public.sms_log (workspace_id, created_at desc);
create index sms_log_lead_idx on public.sms_log (lead_id);
create trigger sms_log_updated_at before update on public.sms_log
  for each row execute function public.set_updated_at();

create table public.email_log (
  id bigint generated always as identity primary key,
  workspace_id uuid references public.workspaces (id) on delete cascade,
  lead_id uuid references public.leads (id) on delete set null,
  kind text not null,
  dedupe_key text unique,
  to_email text not null,
  resend_id text,
  status text not null default 'queued',
  created_at timestamptz not null default now()
);
create index email_log_ws_idx on public.email_log (workspace_id, created_at desc);
create index email_log_lead_idx on public.email_log (lead_id);

create table public.email_suppressions (
  email text primary key,
  reason text not null,
  created_at timestamptz not null default now()
);

create table public.notification_prefs (
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  on_new_lead boolean not null default true,
  on_site_visit_flag boolean not null default true,
  on_booking boolean not null default true,
  sms_to_me boolean not null default false,
  my_phone text,
  daily_digest boolean not null default true,
  primary key (workspace_id, user_id)
);
create index notification_prefs_user_idx on public.notification_prefs (user_id);

-- ---------------------------------------------------------------------
-- 12. JOBS QUEUE, USAGE LEDGER, RATE LIMITS
-- ELI5: jobs is the to-do list for the background worker (the AI photo
-- check). usage_ledger is the meter: every quote, text and AI check
-- writes a line here, so nobody can spend more than their plan allows.
-- ---------------------------------------------------------------------
create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  kind public.job_kind not null,
  ref_id uuid not null,
  status public.job_status not null default 'queued',
  attempts integer not null default 0,
  run_after timestamptz not null default now(),
  locked_at timestamptz,
  idempotency_key text not null unique,
  payload jsonb not null default '{}'::jsonb,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index jobs_queue_idx on public.jobs (status, run_after);
create index jobs_ws_idx on public.jobs (workspace_id);
create index jobs_ref_idx on public.jobs (ref_id);
create trigger jobs_updated_at before update on public.jobs
  for each row execute function public.set_updated_at();

create table public.usage_ledger (
  id bigint generated always as identity primary key,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  owner_id uuid not null references auth.users (id) on delete cascade,
  kind public.usage_kind not null,
  quantity numeric not null check (quantity >= 0),
  cost_usd_micros bigint not null default 0,
  ref_id uuid,
  idempotency_key text unique,
  created_at timestamptz not null default now()
);
create index usage_ledger_owner_month_idx on public.usage_ledger (owner_id, kind, created_at);
create index usage_ledger_ws_idx on public.usage_ledger (workspace_id, created_at);

create table public.rate_limits (
  key text not null,
  window_start timestamptz not null,
  hits integer not null default 0,
  primary key (key, window_start)
);

-- ---------------------------------------------------------------------
-- 13. BILLING (written only by webhooks with the secret key)
-- ELI5: Stripe tells us who paid. We copy that here. The browser can
-- read its own row but never write it, so nobody can fake "paid".
-- ---------------------------------------------------------------------
create table public.subscriptions (
  user_id uuid primary key references auth.users (id) on delete cascade,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  status text not null default 'incomplete',
  price_id text,
  trial_end timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  updated_at timestamptz not null default now()
);

create table public.stripe_events (
  id text primary key,
  type text not null,
  received_at timestamptz not null default now()
);

create table public.connect_events (
  id text primary key,
  account text,
  type text not null,
  received_at timestamptz not null default now()
);

-- Twilio has no event id, so we de-duplicate on MessageSid + status.
create table public.twilio_events (
  id text primary key,
  received_at timestamptz not null default now()
);

-- Which Stripe price is which plan. After you create prices in Stripe:
-- insert into public.plan_prices values ('price_...', 'solo'), ...
create table public.plan_prices (
  price_id text primary key,
  plan text not null check (plan in ('solo', 'crew', 'agency'))
);

-- Test-only limit overrides. No policies: only you, in the SQL editor.
create table public.limit_overrides (
  owner_id uuid primary key references auth.users (id) on delete cascade,
  quotes integer,
  sms_credits integer,
  ai_reviews integer,
  seats integer
);

-- ---------------------------------------------------------------------
-- 14. ACCESS AND LIMIT FUNCTIONS
-- ELI5: has_active_access is the paywall: the owner's trial or paid plan
-- keeps the business open (and its quote widget live). plan_limits
-- returns the numbers from PRD section 10. usage_this_month adds up the
-- meter across every business the owner pays for (Agency pools usage).
-- ---------------------------------------------------------------------
create or replace function public.has_active_access(ws uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.workspaces w
    join public.subscriptions s on s.user_id = w.owner_id
    where w.id = ws and s.status in ('trialing', 'active')
  );
$$;

create or replace function public.plan_limits(ws uuid)
returns table (plan text, businesses integer, seats integer, calculators integer, calendars integer,
               quotes integer, sms_credits integer, ai_reviews integer, remove_badge boolean, trialing boolean)
language plpgsql stable security definer set search_path = '' as $$
declare
  v_owner uuid;
  v_plan text;
  v_status text;
  o record;
begin
  select w.owner_id, coalesce(pp.plan, 'solo'), s.status into v_owner, v_plan, v_status
  from public.workspaces w
  left join public.subscriptions s on s.user_id = w.owner_id
  left join public.plan_prices pp on pp.price_id = s.price_id
  where w.id = ws;

  if v_plan is null then v_plan := 'solo'; end if;

  if v_plan = 'agency' then
    plan := 'agency'; businesses := 10; seats := 10; calculators := 30; calendars := 20;
    quotes := 1000; sms_credits := 2000; ai_reviews := 2000; remove_badge := true;
  elsif v_plan = 'crew' then
    plan := 'crew'; businesses := 1; seats := 3; calculators := 5; calendars := 3;
    quotes := 350; sms_credits := 700; ai_reviews := 700; remove_badge := true;
  else
    plan := 'solo'; businesses := 1; seats := 1; calculators := 1; calendars := 1;
    quotes := 120; sms_credits := 240; ai_reviews := 240; remove_badge := false;
  end if;

  -- A 7 day trial: 25 quotes, 30 texts, 50 AI checks.
  trialing := coalesce(v_status = 'trialing', false);
  if trialing then
    quotes := least(quotes, 25); sms_credits := least(sms_credits, 30); ai_reviews := least(ai_reviews, 50);
  end if;

  select * into o from public.limit_overrides where owner_id = v_owner;
  if found then
    quotes := coalesce(o.quotes, quotes);
    sms_credits := coalesce(o.sms_credits, sms_credits);
    ai_reviews := coalesce(o.ai_reviews, ai_reviews);
    seats := coalesce(o.seats, seats);
  end if;
  return next;
end;
$$;

create or replace function public.usage_this_month(ws uuid, k public.usage_kind)
returns numeric language sql stable security definer set search_path = '' as $$
  select coalesce(sum(u.quantity), 0) from public.usage_ledger u
  where u.owner_id = (select w.owner_id from public.workspaces w where w.id = ws)
    and u.kind = k and u.created_at >= date_trunc('month', now());
$$;

-- What the Billing page and the sidebar meter show (members only).
create or replace function public.usage_summary(ws uuid)
returns table (kind text, used numeric, cap integer)
language plpgsql stable security definer set search_path = '' as $$
declare l record;
begin
  if not public.is_workspace_member(ws) then raise exception 'not a member'; end if;
  select * into l from public.plan_limits(ws);
  kind := 'quotes'; used := public.usage_this_month(ws, 'quotes'); cap := l.quotes; return next;
  kind := 'sms_credits'; used := public.usage_this_month(ws, 'sms_credits'); cap := l.sms_credits; return next;
  kind := 'ai_reviews'; used := public.usage_this_month(ws, 'ai_reviews'); cap := l.ai_reviews; return next;
end;
$$;

-- Fixed-window rate limit. Returns true if allowed.
create or replace function public.try_rate_limit(p_key text, p_max integer, p_window_seconds integer)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  v_start timestamptz := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  v_hits integer;
begin
  insert into public.rate_limits (key, window_start, hits) values (p_key, v_start, 1)
  on conflict (key, window_start) do update set hits = public.rate_limits.hits + 1
  returning hits into v_hits;
  delete from public.rate_limits where window_start < now() - interval '1 day';
  return v_hits <= p_max;
end;
$$;

-- Meter + cap in one atomic step. Locks the owner's row so two quotes
-- arriving together cannot both squeeze past the last unit.
-- Returns true when metered, false when the cap would be passed.
create or replace function public.meter_usage(p_ws uuid, p_kind public.usage_kind, p_qty numeric,
  p_cost_micros bigint, p_ref uuid, p_key text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  v_owner uuid;
  v_cap integer;
  v_used numeric;
begin
  select owner_id into v_owner from public.workspaces where id = p_ws;
  if v_owner is null then raise exception 'workspace_not_found'; end if;
  if p_key is not null and exists (select 1 from public.usage_ledger where idempotency_key = p_key) then
    return true;
  end if;
  perform 1 from public.profiles where id = v_owner for update;
  select case p_kind when 'quotes' then l.quotes when 'sms_credits' then l.sms_credits else l.ai_reviews end
    into v_cap from public.plan_limits(p_ws) l;
  v_used := public.usage_this_month(p_ws, p_kind);
  if v_used + p_qty > v_cap then return false; end if;
  insert into public.usage_ledger (workspace_id, owner_id, kind, quantity, cost_usd_micros, ref_id, idempotency_key)
  values (p_ws, v_owner, p_kind, p_qty, p_cost_micros, p_ref, p_key)
  on conflict (idempotency_key) do nothing;
  return true;
end;
$$;

-- ---------------------------------------------------------------------
-- 15. WORKSPACE AND INVITE FUNCTIONS (called from the app)
-- ELI5: creating a business and joining one happen inside the database
-- in one step, so the plan's business and seat limits cannot be skipped.
-- ---------------------------------------------------------------------
create or replace function public.create_workspace(p_name text, p_slug text, p_country text,
  p_currency text, p_timezone text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_ws uuid;
  v_cal uuid;
  v_owned integer;
  v_any uuid;
  v_max integer;
begin
  if v_uid is null then raise exception 'not signed in'; end if;
  select count(*) into v_owned from public.workspaces where owner_id = v_uid;
  if v_owned > 0 then
    select id into v_any from public.workspaces where owner_id = v_uid limit 1;
    select l.businesses into v_max from public.plan_limits(v_any) l;
    if v_owned >= v_max then raise exception 'business_limit_reached'; end if;
  end if;
  insert into public.workspaces (name, slug, owner_id, country, currency, timezone)
  values (p_name, lower(p_slug), v_uid, upper(p_country), lower(p_currency), p_timezone)
  returning id into v_ws;
  insert into public.workspace_members (workspace_id, user_id, role) values (v_ws, v_uid, 'owner');
  insert into public.follow_up_rules (workspace_id) values (v_ws);
  insert into public.notification_prefs (workspace_id, user_id) values (v_ws, v_uid);
  insert into public.calendars (workspace_id, name, timezone) values (v_ws, 'Main calendar', p_timezone)
  returning id into v_cal;
  -- Default hours: Monday to Friday, 08:00 to 17:00.
  insert into public.availability_windows (calendar_id, workspace_id, weekday, start_time, end_time)
  select v_cal, v_ws, d, '08:00', '17:00' from generate_series(1, 5) d;
  update public.profiles set current_workspace_id = v_ws where id = v_uid;
  return v_ws;
end;
$$;

create or replace function public.create_invite(p_ws uuid, p_email text, p_role public.workspace_role)
returns text language plpgsql security definer set search_path = '' as $$
declare
  v_token text;
  v_seats integer;
  v_used integer;
begin
  if not public.has_workspace_role(p_ws, array['owner', 'admin']::public.workspace_role[]) then
    raise exception 'only owners and admins can invite';
  end if;
  if p_role = 'owner' then raise exception 'cannot invite an owner'; end if;
  select l.seats into v_seats from public.plan_limits(p_ws) l;
  select (select count(*) from public.workspace_members where workspace_id = p_ws)
       + (select count(*) from public.workspace_invites
          where workspace_id = p_ws and accepted_at is null and expires_at > now())
    into v_used;
  if v_used >= v_seats then raise exception 'seat_limit_reached'; end if;
  v_token := translate(encode(extensions.gen_random_bytes(32), 'base64'), '+/=', '-_');
  insert into public.workspace_invites (workspace_id, email, role, token_hash, invited_by)
  values (p_ws, lower(trim(p_email)), p_role,
          encode(extensions.digest(v_token, 'sha256'), 'hex'), (select auth.uid()));
  return v_token;
end;
$$;

create or replace function public.accept_invite(p_token text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_inv public.workspace_invites;
  v_uid uuid := (select auth.uid());
  v_email text := lower((select auth.jwt() ->> 'email'));
  v_seats integer;
  v_members integer;
begin
  select * into v_inv from public.workspace_invites
  where token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex')
    and accepted_at is null and expires_at > now();
  if not found then raise exception 'invite_invalid'; end if;
  if v_inv.email <> v_email then raise exception 'invite_wrong_email'; end if;
  select l.seats into v_seats from public.plan_limits(v_inv.workspace_id) l;
  select count(*) into v_members from public.workspace_members where workspace_id = v_inv.workspace_id;
  if v_members >= v_seats then raise exception 'seat_limit_reached'; end if;
  insert into public.workspace_members (workspace_id, user_id, role)
  values (v_inv.workspace_id, v_uid, v_inv.role) on conflict do nothing;
  insert into public.notification_prefs (workspace_id, user_id)
  values (v_inv.workspace_id, v_uid) on conflict do nothing;
  update public.workspace_invites set accepted_at = now() where id = v_inv.id;
  update public.profiles set current_workspace_id = v_inv.workspace_id where id = v_uid;
  return v_inv.workspace_id;
end;
$$;

-- Publishing freezes the draft into a new version and points the
-- calculator at it. Calculator count per plan is checked here.
create or replace function public.publish_calculator(p_calculator uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_calc public.calculators;
  v_no integer;
  v_version uuid;
  v_max integer;
  v_live integer;
begin
  select * into v_calc from public.calculators where id = p_calculator for update;
  if not found then raise exception 'not_found'; end if;
  if not public.has_workspace_role(v_calc.workspace_id, array['owner', 'admin']::public.workspace_role[]) then
    raise exception 'only owners and admins can publish';
  end if;
  if v_calc.status <> 'published' then
    select l.calculators into v_max from public.plan_limits(v_calc.workspace_id) l;
    select count(*) into v_live from public.calculators c
    join public.workspaces w on w.id = c.workspace_id
    where w.owner_id = (select owner_id from public.workspaces where id = v_calc.workspace_id)
      and c.status = 'published';
    if v_live >= v_max then raise exception 'calculator_limit_reached'; end if;
  end if;
  select coalesce(max(version_no), 0) + 1 into v_no from public.calculator_versions where calculator_id = p_calculator;
  insert into public.calculator_versions (calculator_id, workspace_id, version_no, config, published_by)
  values (p_calculator, v_calc.workspace_id, v_no, v_calc.draft_config, (select auth.uid()))
  returning id into v_version;
  update public.calculators set published_version_id = v_version, status = 'published' where id = p_calculator;
  return v_version;
end;
$$;

-- ---------------------------------------------------------------------
-- 16. WORKER AND PUBLIC-FLOW FUNCTIONS (edge functions only, secret key)
-- ELI5: claim_jobs hands the worker a few to-dos and marks them "mine"
-- so two workers never grab the same one. hold_slot reserves a time for
-- a customer; the overlap rule on bookings makes double booking
-- impossible. expire_holds frees slots nobody paid for.
-- ---------------------------------------------------------------------
create or replace function public.claim_jobs(p_limit integer)
returns setof public.jobs language sql security definer set search_path = '' as $$
  update public.jobs j set status = 'running', locked_at = now()
  where j.id in (
    select id from public.jobs
    where status = 'queued' and run_after <= now()
    order by run_after
    limit p_limit
    for update skip locked
  )
  returning j.*;
$$;

create or replace function public.release_stuck_jobs()
returns integer language plpgsql security definer set search_path = '' as $$
declare v_count integer;
begin
  update public.jobs set status = 'queued', locked_at = null
  where status = 'running' and locked_at < now() - interval '10 minutes';
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

create or replace function public.hold_slot(p_lead uuid, p_calendar uuid, p_kind public.booking_kind,
  p_starts timestamptz, p_ends timestamptz, p_deposit_cents integer, p_currency text,
  p_manage_token_hash text, p_note text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_lead public.leads;
  v_booking uuid;
begin
  select * into v_lead from public.leads where id = p_lead for update;
  if not found then raise exception 'lead_not_found'; end if;
  if v_lead.status in ('won', 'lost') then raise exception 'lead_closed'; end if;
  -- One live booking per lead and kind.
  if exists (select 1 from public.bookings where lead_id = p_lead and kind = p_kind
             and status in ('held', 'confirmed')) then
    raise exception 'already_booked';
  end if;
  insert into public.bookings (workspace_id, lead_id, calendar_id, kind, status, starts_at, ends_at,
    hold_expires_at, deposit_cents, currency, manage_token_hash, customer_note)
  values (v_lead.workspace_id, p_lead, p_calendar, p_kind,
    case when p_deposit_cents > 0 then 'held'::public.booking_status else 'confirmed'::public.booking_status end,
    p_starts, p_ends,
    case when p_deposit_cents > 0 then now() + interval '35 minutes' end,
    p_deposit_cents, p_currency, p_manage_token_hash, coalesce(p_note, ''))
  returning id into v_booking;
  if p_deposit_cents = 0 then
    update public.leads set status = 'booked' where id = p_lead and status in ('new', 'quoted');
  end if;
  return v_booking;
exception when exclusion_violation then
  raise exception 'slot_taken';
end;
$$;

create or replace function public.confirm_booking(p_booking uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_lead uuid;
begin
  update public.bookings set status = 'confirmed', hold_expires_at = null
  where id = p_booking and status = 'held' returning lead_id into v_lead;
  if v_lead is not null then
    update public.leads set status = 'booked' where id = v_lead and status in ('new', 'quoted');
  end if;
end;
$$;

create or replace function public.expire_holds()
returns integer language plpgsql security definer set search_path = '' as $$
declare v_count integer;
begin
  update public.bookings set status = 'cancelled', cancelled_reason = 'deposit_not_paid'
  where status = 'held' and hold_expires_at < now();
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- Workers and webhooks only. The browser can never call these.
revoke execute on function public.claim_jobs(integer) from public, anon, authenticated;
revoke execute on function public.release_stuck_jobs() from public, anon, authenticated;
revoke execute on function public.hold_slot(uuid, uuid, public.booking_kind, timestamptz, timestamptz,
  integer, text, text, text) from public, anon, authenticated;
revoke execute on function public.confirm_booking(uuid) from public, anon, authenticated;
revoke execute on function public.expire_holds() from public, anon, authenticated;
revoke execute on function public.try_rate_limit(text, integer, integer) from public, anon, authenticated;
revoke execute on function public.meter_usage(uuid, public.usage_kind, numeric, bigint, uuid, text)
  from public, anon, authenticated;
revoke execute on function public.plan_limits(uuid) from public, anon;
revoke execute on function public.usage_this_month(uuid, public.usage_kind) from public, anon;
revoke execute on function public.usage_summary(uuid) from public, anon;
revoke execute on function public.has_active_access(uuid) from public, anon;
revoke execute on function public.create_workspace(text, text, text, text, text) from public, anon;
revoke execute on function public.create_invite(uuid, text, public.workspace_role) from public, anon;
revoke execute on function public.accept_invite(text) from public, anon;
revoke execute on function public.publish_calculator(uuid) from public, anon;

-- ---------------------------------------------------------------------
-- 17. GUARD TRIGGERS (the rules the browser cannot break)
-- ELI5: RLS decides WHICH rows you can touch. These triggers decide
-- WHICH COLUMNS. A team member can move a lead to "won" and fix a typo
-- in a phone number, but cannot change the price the customer was shown,
-- the AI result, or the consent record.
-- ---------------------------------------------------------------------
create or replace function public.guard_lead_columns()
returns trigger language plpgsql set search_path = '' as $$
begin
  if current_user in ('authenticated', 'anon') then
    if new.workspace_id is distinct from old.workspace_id
       or new.calculator_id is distinct from old.calculator_id
       or new.version_id is distinct from old.version_id
       or new.public_token_hash is distinct from old.public_token_hash
       or new.priced is distinct from old.priced
       or new.price_low_cents is distinct from old.price_low_cents
       or new.price_high_cents is distinct from old.price_high_cents
       or new.price_breakdown is distinct from old.price_breakdown
       or new.answers is distinct from old.answers
       or new.ai_status is distinct from old.ai_status
       or new.ai_summary is distinct from old.ai_summary
       or new.sms_consent is distinct from old.sms_consent
       or new.consent_text is distinct from old.consent_text
       or new.consent_at is distinct from old.consent_at
       or new.source is distinct from old.source
       or new.ip_hash is distinct from old.ip_hash
       or new.created_at is distinct from old.created_at then
      raise exception 'these lead fields are set by Quotient';
    end if;
  end if;
  return new;
end;
$$;
create trigger leads_guard before update on public.leads
  for each row execute function public.guard_lead_columns();

-- Status timestamps, so analytics never depends on the browser.
create or replace function public.stamp_lead_status()
returns trigger language plpgsql set search_path = '' as $$
declare v_changed boolean;
begin
  if tg_op = 'INSERT' then v_changed := true;
  else v_changed := new.status is distinct from old.status;
  end if;
  if v_changed then
    if new.status = 'quoted' and new.quoted_at is null then new.quoted_at := now(); end if;
    if new.status = 'booked' and new.booked_at is null then new.booked_at := now(); end if;
    if new.status = 'won' then new.won_at := coalesce(new.won_at, now()); end if;
    if new.status = 'lost' then new.lost_at := coalesce(new.lost_at, now()); end if;
    if new.status in ('booked', 'won', 'lost') then new.follow_ups_paused := true; end if;
  end if;
  return new;
end;
$$;
create trigger leads_stamp_status before insert or update on public.leads
  for each row execute function public.stamp_lead_status();

-- Log every status change on the timeline.
create or replace function public.log_lead_status()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status is distinct from old.status then
    insert into public.lead_events (lead_id, workspace_id, kind, data, actor_id)
    values (new.id, new.workspace_id, 'status_changed',
            jsonb_build_object('from', old.status, 'to', new.status), (select auth.uid()));
    if new.status in ('booked', 'won', 'lost') then
      update public.follow_ups set status = 'cancelled', skip_reason = 'lead_' || new.status
      where lead_id = new.id and status = 'scheduled';
    end if;
  end if;
  return new;
end;
$$;
create trigger leads_log_status after update on public.leads
  for each row execute function public.log_lead_status();

-- Published versions never change.
create or replace function public.block_version_update()
returns trigger language plpgsql set search_path = '' as $$
begin
  raise exception 'published calculator versions are immutable';
end;
$$;
create trigger calculator_versions_immutable before update on public.calculator_versions
  for each row execute function public.block_version_update();

-- Members may only publish through publish_calculator().
create or replace function public.guard_calculator_columns()
returns trigger language plpgsql set search_path = '' as $$
begin
  if current_user in ('authenticated', 'anon') then
    if new.published_version_id is distinct from old.published_version_id
       or new.workspace_id is distinct from old.workspace_id
       or (new.status is distinct from old.status and new.status = 'published') then
      raise exception 'publish with publish_calculator()';
    end if;
  end if;
  return new;
end;
$$;
create trigger calculators_guard before update on public.calculators
  for each row execute function public.guard_calculator_columns();

-- Owners may cancel or close a booking, never move it or change money.
create or replace function public.guard_booking_columns()
returns trigger language plpgsql set search_path = '' as $$
begin
  if current_user in ('authenticated', 'anon') then
    if new.starts_at is distinct from old.starts_at
       or new.ends_at is distinct from old.ends_at
       or new.calendar_id is distinct from old.calendar_id
       or new.lead_id is distinct from old.lead_id
       or new.deposit_cents is distinct from old.deposit_cents
       or new.manage_token_hash is distinct from old.manage_token_hash
       or new.hold_expires_at is distinct from old.hold_expires_at then
      raise exception 'reschedule from the booking dialog';
    end if;
    if new.status is distinct from old.status
       and new.status not in ('cancelled', 'completed', 'no_show') then
      raise exception 'bookings can only be cancelled, completed or marked no-show here';
    end if;
  end if;
  return new;
end;
$$;
create trigger bookings_guard before update on public.bookings
  for each row execute function public.guard_booking_columns();

-- The workspace owner cannot be changed from the browser.
create or replace function public.guard_workspace_columns()
returns trigger language plpgsql set search_path = '' as $$
begin
  if current_user in ('authenticated', 'anon') then
    if new.owner_id is distinct from old.owner_id then
      raise exception 'ownership transfer is a support action';
    end if;
    if new.show_badge = false and old.show_badge = true
       and not (select l.remove_badge from public.plan_limits(new.id) l) then
      raise exception 'removing the badge needs the Crew plan';
    end if;
  end if;
  return new;
end;
$$;
create trigger workspaces_guard before update on public.workspaces
  for each row execute function public.guard_workspace_columns();

-- ---------------------------------------------------------------------
-- 18. ROW LEVEL SECURITY: switch it on for every table
-- ELI5: RLS is a lock on every table. Without a matching policy below,
-- nobody using the publishable key can read or write a single row.
-- Edge functions use the secret key, which skips RLS on purpose.
-- ---------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.workspace_invites enable row level security;
alter table public.calendars enable row level security;
alter table public.availability_windows enable row level security;
alter table public.blackouts enable row level security;
alter table public.calculators enable row level security;
alter table public.calculator_versions enable row level security;
alter table public.leads enable row level security;
alter table public.lead_photos enable row level security;
alter table public.lead_events enable row level security;
alter table public.ai_reviews enable row level security;
alter table public.bookings enable row level security;
alter table public.deposits enable row level security;
alter table public.integrations enable row level security;
alter table public.sms_senders enable row level security;
alter table public.sms_opt_outs enable row level security;
alter table public.follow_up_rules enable row level security;
alter table public.follow_ups enable row level security;
alter table public.sms_log enable row level security;
alter table public.email_log enable row level security;
alter table public.email_suppressions enable row level security;
alter table public.notification_prefs enable row level security;
alter table public.jobs enable row level security;
alter table public.usage_ledger enable row level security;
alter table public.rate_limits enable row level security;
alter table public.subscriptions enable row level security;
alter table public.stripe_events enable row level security;
alter table public.connect_events enable row level security;
alter table public.twilio_events enable row level security;
alter table public.plan_prices enable row level security;
alter table public.limit_overrides enable row level security;

-- Belt and braces: the anon role (logged-out browsers) gets nothing.
-- The public widget never reads tables; it calls edge functions.
revoke all on all tables in schema public from anon;

-- PROFILES
create policy "profiles select self or teammate" on public.profiles for select to authenticated
  using (id = (select auth.uid()) or public.shares_workspace_with(id));
create policy "profiles update self" on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- WORKSPACES (insert only through create_workspace)
create policy "workspaces select member" on public.workspaces for select to authenticated
  using (public.is_workspace_member(id));
create policy "workspaces update admin" on public.workspaces for update to authenticated
  using (public.has_workspace_role(id, array['owner', 'admin']::public.workspace_role[]))
  with check (public.has_workspace_role(id, array['owner', 'admin']::public.workspace_role[]));
create policy "workspaces delete owner" on public.workspaces for delete to authenticated
  using (owner_id = (select auth.uid()));

-- MEMBERS (insert only through accept_invite / create_workspace)
create policy "members select member" on public.workspace_members for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy "members update owner" on public.workspace_members for update to authenticated
  using (public.has_workspace_role(workspace_id, array['owner']::public.workspace_role[]) and role <> 'owner')
  with check (public.has_workspace_role(workspace_id, array['owner']::public.workspace_role[]) and role <> 'owner');
create policy "members delete admin or self" on public.workspace_members for delete to authenticated
  using (role <> 'owner' and (user_id = (select auth.uid())
    or public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[])));

-- INVITES (insert only through create_invite)
create policy "invites select admin" on public.workspace_invites for select to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]));
create policy "invites delete admin" on public.workspace_invites for delete to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]));

-- CALENDARS, WINDOWS, BLACKOUTS (members read; owners/admins change)
create policy "calendars select member" on public.calendars for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy "calendars insert admin" on public.calendars for insert to authenticated
  with check (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]));
create policy "calendars update admin" on public.calendars for update to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]))
  with check (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]));
create policy "calendars delete admin" on public.calendars for delete to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]));

create policy "windows select member" on public.availability_windows for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy "windows insert admin" on public.availability_windows for insert to authenticated
  with check (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[])
    and exists (select 1 from public.calendars c where c.id = calendar_id and c.workspace_id = availability_windows.workspace_id));
create policy "windows update admin" on public.availability_windows for update to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]))
  with check (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]));
create policy "windows delete admin" on public.availability_windows for delete to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]));

create policy "blackouts select member" on public.blackouts for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy "blackouts insert member" on public.blackouts for insert to authenticated
  with check (public.is_workspace_member(workspace_id)
    and exists (select 1 from public.calendars c where c.id = calendar_id and c.workspace_id = blackouts.workspace_id));
create policy "blackouts update member" on public.blackouts for update to authenticated
  using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id));
create policy "blackouts delete member" on public.blackouts for delete to authenticated
  using (public.is_workspace_member(workspace_id));

-- CALCULATORS (members read; owners/admins edit drafts; publish via function)
create policy "calculators select member" on public.calculators for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy "calculators insert admin" on public.calculators for insert to authenticated
  with check (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[])
    and status = 'draft' and published_version_id is null);
create policy "calculators update admin" on public.calculators for update to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]))
  with check (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]));
create policy "calculators delete admin" on public.calculators for delete to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]));

create policy "versions select member" on public.calculator_versions for select to authenticated
  using (public.is_workspace_member(workspace_id));

-- LEADS (members read and work them; create manual leads; owners/admins delete)
create policy "leads select member" on public.leads for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy "leads insert manual member" on public.leads for insert to authenticated
  with check (public.is_workspace_member(workspace_id) and source = 'manual' and priced = false
    and sms_consent = false and ai_status = 'none');
create policy "leads update member" on public.leads for update to authenticated
  using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id));
create policy "leads delete admin" on public.leads for delete to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]));

create policy "photos select member" on public.lead_photos for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy "photos delete admin" on public.lead_photos for delete to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]));

create policy "events select member" on public.lead_events for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy "events insert note member" on public.lead_events for insert to authenticated
  with check (public.is_workspace_member(workspace_id) and kind = 'note' and actor_id = (select auth.uid())
    and exists (select 1 from public.leads l where l.id = lead_id and l.workspace_id = lead_events.workspace_id));
create policy "events delete own note" on public.lead_events for delete to authenticated
  using (kind = 'note' and actor_id = (select auth.uid()));

create policy "ai reviews select member" on public.ai_reviews for select to authenticated
  using (public.is_workspace_member(workspace_id));

-- BOOKINGS AND DEPOSITS (created only by edge functions)
create policy "bookings select member" on public.bookings for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy "bookings update member" on public.bookings for update to authenticated
  using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id));
create policy "deposits select member" on public.deposits for select to authenticated
  using (public.is_workspace_member(workspace_id));

-- INTEGRATIONS AND SMS SENDER (written only by edge functions)
create policy "integrations select member" on public.integrations for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy "senders select member" on public.sms_senders for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy "opt outs select member" on public.sms_opt_outs for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy "opt outs insert member" on public.sms_opt_outs for insert to authenticated
  with check (public.is_workspace_member(workspace_id));

-- FOLLOW-UPS
create policy "rules select member" on public.follow_up_rules for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy "rules update admin" on public.follow_up_rules for update to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]))
  with check (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]));
create policy "follow ups select member" on public.follow_ups for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy "follow ups update member" on public.follow_ups for update to authenticated
  using (public.is_workspace_member(workspace_id) and status = 'scheduled')
  with check (public.is_workspace_member(workspace_id) and status in ('scheduled', 'cancelled'));

-- LOGS, JOBS, USAGE (read only for members)
create policy "sms log select member" on public.sms_log for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy "email log select member" on public.email_log for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy "jobs select member" on public.jobs for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy "usage select member" on public.usage_ledger for select to authenticated
  using (public.is_workspace_member(workspace_id));

-- NOTIFICATION PREFS (each person their own)
create policy "prefs select own" on public.notification_prefs for select to authenticated
  using (user_id = (select auth.uid()));
create policy "prefs insert own" on public.notification_prefs for insert to authenticated
  with check (user_id = (select auth.uid()) and public.is_workspace_member(workspace_id));
create policy "prefs update own" on public.notification_prefs for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "prefs delete own" on public.notification_prefs for delete to authenticated
  using (user_id = (select auth.uid()));

-- BILLING
create policy "subscriptions select own" on public.subscriptions for select to authenticated
  using (user_id = (select auth.uid()));
create policy "plan prices select" on public.plan_prices for select to authenticated using (true);

-- email_suppressions, rate_limits, stripe_events, connect_events,
-- twilio_events and limit_overrides have RLS on and NO policies:
-- only the secret key (edge functions, webhooks) and you in the SQL
-- editor can touch them.

-- ---------------------------------------------------------------------
-- 19. ANALYTICS VIEW (obeys the caller's RLS)
-- ELI5: one row per lead with the numbers the Analytics page needs.
-- security_invoker means it only shows rows you are allowed to see.
-- ---------------------------------------------------------------------
create or replace view public.lead_stats with (security_invoker = true) as
select
  l.id, l.workspace_id, l.calculator_id, l.status, l.source, l.created_at,
  coalesce(nullif(l.utm_source, ''), nullif(l.referrer_host, ''), l.source::text) as lead_source,
  l.priced, l.quoted_at, l.booked_at, l.won_at, l.lost_at,
  (l.booked_at is not null) as was_booked,
  (l.status = 'won') as won,
  l.won_value_cents,
  case when l.price_low_cents is not null and l.price_high_cents is not null
       then (l.price_low_cents + l.price_high_cents) / 2 end as quoted_mid_cents,
  l.needs_site_visit,
  extract(epoch from (l.booked_at - l.created_at)) / 3600.0 as hours_to_book
from public.leads l;

-- ---------------------------------------------------------------------
-- 20. STORAGE BUCKETS + POLICIES
-- ELI5: two folders. lead-photos is private: customers upload through a
-- one-time signed link the edge function makes, and only team members
-- can view. brand-assets holds logos and is public, because the quote
-- widget on someone's website must show the logo without logging in.
-- Files sit under a folder named after the workspace id.
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('lead-photos', 'lead-photos', false, 10485760,
    array['image/jpeg', 'image/png', 'image/webp', 'image/heic']),
  ('brand-assets', 'brand-assets', true, 2097152,
    array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'])
on conflict (id) do nothing;

-- Lead photos: members view and delete; uploads only via signed URLs.
create policy "lead photos select member" on storage.objects for select to authenticated
  using (bucket_id = 'lead-photos' and public.is_workspace_member_text((storage.foldername(name))[1]));
create policy "lead photos delete admin" on storage.objects for delete to authenticated
  using (bucket_id = 'lead-photos' and public.has_workspace_role_text((storage.foldername(name))[1],
    array['owner', 'admin']::public.workspace_role[]));

-- Brand assets: public read comes from the bucket being public.
-- Owners and admins upload, replace and delete in their own folder.
create policy "brand assets insert admin" on storage.objects for insert to authenticated
  with check (bucket_id = 'brand-assets' and public.has_workspace_role_text((storage.foldername(name))[1],
    array['owner', 'admin']::public.workspace_role[]));
create policy "brand assets update admin" on storage.objects for update to authenticated
  using (bucket_id = 'brand-assets' and public.has_workspace_role_text((storage.foldername(name))[1],
    array['owner', 'admin']::public.workspace_role[]))
  with check (bucket_id = 'brand-assets' and public.has_workspace_role_text((storage.foldername(name))[1],
    array['owner', 'admin']::public.workspace_role[]));
create policy "brand assets delete admin" on storage.objects for delete to authenticated
  using (bucket_id = 'brand-assets' and public.has_workspace_role_text((storage.foldername(name))[1],
    array['owner', 'admin']::public.workspace_role[]));

-- ---------------------------------------------------------------------
-- 21. REALTIME
-- ELI5: lets the Leads inbox and the Calendar update live the moment a
-- customer submits a quote or books, with no refresh.
-- ---------------------------------------------------------------------
alter publication supabase_realtime add table public.leads;
alter publication supabase_realtime add table public.bookings;

-- ---------------------------------------------------------------------
-- 22. SCHEDULES (run later, after your edge functions are deployed)
-- ELI5: pg_cron is an alarm clock inside the database. pg_net lets the
-- alarm clock call a URL. Every minute it pokes the AI worker, every 5
-- minutes the reminder worker.
--
-- Enable: Supabase > Database > Extensions > "pg_cron" > Enable, then "pg_net" > Enable.
-- Store the cron secret in Vault (same value as the CRON_SECRET edge secret):
--   select vault.create_secret('PASTE_YOUR_CRON_SECRET', 'cron_secret');
-- Then replace YOUR_PROJECT_REF below, remove the leading "-- " and run.
-- ---------------------------------------------------------------------
-- create or replace function public.invoke_edge(fn text)
-- returns bigint language sql security definer set search_path = '' as $fn$
--   select net.http_post(
--     url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/' || fn,
--     headers := jsonb_build_object(
--       'Content-Type', 'application/json',
--       'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')),
--     body := '{}'::jsonb,
--     timeout_milliseconds := 60000);
-- $fn$;
-- revoke execute on function public.invoke_edge(text) from public, anon, authenticated;
--
-- select cron.schedule('qt-triage-worker', '* * * * *',   $$ select public.invoke_edge('qt-triage-worker') $$);
-- select cron.schedule('qt-reminders',     '*/5 * * * *', $$ select public.invoke_edge('qt-reminders') $$);
--
-- Check it ran: select * from cron.job_run_details order by start_time desc limit 20;
`
