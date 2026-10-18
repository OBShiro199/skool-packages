// Etcher single migration, pasted into Supabase > SQL Editor and run once.

export const sql = `-- =====================================================================
-- Etcher: full database migration (0001_init.sql)
-- Paste this whole file into Supabase > SQL Editor > New query > Run.
-- Run it ONCE on a fresh project. Order matters: extensions, enums,
-- tables, helper functions, triggers, RLS policies, views, storage.
--
-- ELI5: Etcher is multi-tenant. One database holds every customer's
-- data. Each row carries a workspace_id (which company it belongs to)
-- and Row Level Security (RLS) checks "is the person asking a member of
-- that workspace?" on every single read and write. If the answer is no,
-- Postgres pretends the row does not exist.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. EXTENSIONS
-- ELI5: extensions are plug-ins for Postgres. pgcrypto gives us hashing
-- (for invite tokens). pg_trgm makes "search as you type" fast.
-- Supabase keeps them in the "extensions" schema.
-- ---------------------------------------------------------------------
create extension if not exists pgcrypto with schema extensions;
create extension if not exists pg_trgm with schema extensions;

-- ---------------------------------------------------------------------
-- 1. ENUMS
-- ELI5: an enum is a fixed list of allowed words for a column. A role
-- can be 'member', 'admin' or 'owner', never 'boss'. The ORDER matters
-- for workspace_role: member < admin < owner, so we can ask
-- "is this person at least an admin?" with a simple >= comparison.
-- ---------------------------------------------------------------------
create type public.workspace_role as enum ('member', 'admin', 'owner');
create type public.record_entity as enum ('person', 'company', 'deal');
create type public.field_type as enum
  ('text', 'long_text', 'number', 'currency', 'date', 'checkbox',
   'select', 'multi_select', 'url', 'email', 'phone', 'user');
create type public.deal_status as enum ('open', 'won', 'lost');
create type public.stage_kind as enum ('open', 'won', 'lost');
create type public.activity_type as enum
  ('note', 'email', 'call', 'meeting', 'stage_change', 'deal_created',
   'deal_won', 'deal_lost', 'task_done', 'import');
create type public.task_status as enum ('open', 'done');
create type public.call_direction as enum ('outbound', 'inbound');
create type public.call_status as enum
  ('queued', 'initiated', 'ringing', 'in-progress', 'completed',
   'busy', 'no-answer', 'failed', 'canceled');
create type public.call_disposition as enum
  ('connected_positive', 'connected_neutral', 'connected_negative',
   'meeting_booked', 'voicemail', 'no_answer', 'gatekeeper',
   'wrong_number', 'callback_requested', 'do_not_call');
create type public.telephony_mode as enum ('etcher_subaccount', 'own_twilio', 'byoc_trunk');
create type public.number_status as enum ('pending', 'active', 'released', 'failed');
create type public.job_status as enum ('queued', 'running', 'completed', 'failed', 'cancelled');

-- ---------------------------------------------------------------------
-- 2. SHARED TRIGGER: updated_at
-- ELI5: every time a row changes, stamp the time. One function, reused.
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- 3. PROFILES (one per login)
-- ELI5: Supabase Auth keeps logins in auth.users (a locked room).
-- profiles is our public copy with the name, timezone and the
-- workspace you last had open. A trigger creates it on signup.
-- ---------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text check (char_length(full_name) <= 120),
  avatar_url text,
  timezone text not null default 'Europe/London',
  current_workspace_id uuid,
  weekly_digest boolean not null default true,
  deal_celebrations boolean not null default true,
  marketing_emails boolean not null default true,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index profiles_current_workspace_idx on public.profiles (current_workspace_id);
create index profiles_last_seen_idx on public.profiles (last_seen_at);
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    coalesce(lower(new.email), ''),
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- 4. WORKSPACES, MEMBERS, INVITATIONS, SUBSCRIPTIONS
-- ELI5: a workspace is one customer company inside Etcher. People join
-- it as owner, admin or member. The subscription (paid or trialing)
-- belongs to the WORKSPACE, not the person, so the whole team gets in.
-- ---------------------------------------------------------------------
create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 80),
  slug text not null unique,
  created_by uuid references auth.users (id) on delete set null,
  team_size text check (team_size in ('1', '2-5', '6-10', '11-20', '21-50', '50+')),
  default_currency text not null default 'USD' check (default_currency ~ '^[A-Z]{3}$'),
  record_calls boolean not null default false,
  play_consent_announcement boolean not null default true,
  consent_announcement text not null default 'This call may be recorded for training and quality.'
    check (char_length(consent_announcement) <= 200),
  onboarding jsonb not null default '{}'::jsonb,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index workspaces_created_by_idx on public.workspaces (created_by);
create trigger workspaces_updated_at before update on public.workspaces
  for each row execute function public.set_updated_at();

alter table public.profiles
  add constraint profiles_current_workspace_fk
  foreign key (current_workspace_id) references public.workspaces (id) on delete set null;

create table public.workspace_members (
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.workspace_role not null default 'member',
  invited_by uuid references auth.users (id) on delete set null,
  joined_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);
create index workspace_members_user_idx on public.workspace_members (user_id);
create index workspace_members_invited_by_idx on public.workspace_members (invited_by);

create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  email text not null check (email = lower(email) and email like '%_@_%._%'),
  role public.workspace_role not null default 'member' check (role <> 'owner'),
  token_hash text not null unique,
  invited_by uuid references auth.users (id) on delete set null,
  expires_at timestamptz not null default now() + interval '7 days',
  accepted_at timestamptz,
  accepted_by uuid references auth.users (id) on delete set null,
  revoked_at timestamptz,
  last_sent_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index invitations_workspace_idx on public.invitations (workspace_id);
create index invitations_invited_by_idx on public.invitations (invited_by);
create index invitations_accepted_by_idx on public.invitations (accepted_by);
-- Only one live invite per email per workspace.
create unique index invitations_one_open_per_email
  on public.invitations (workspace_id, email)
  where accepted_at is null and revoked_at is null;

-- ELI5: only the Stripe webhook (secret key) writes here. The app reads it.
create table public.subscriptions (
  workspace_id uuid primary key references public.workspaces (id) on delete cascade,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  status text not null default 'incomplete' check (status in
    ('trialing', 'active', 'past_due', 'canceled', 'unpaid',
     'incomplete', 'incomplete_expired', 'paused')),
  price_id text,
  plan_interval text check (plan_interval in ('month', 'year')),
  trial_end timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  canceled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index subscriptions_status_idx on public.subscriptions (status);
create trigger subscriptions_updated_at before update on public.subscriptions
  for each row execute function public.set_updated_at();

-- Stripe sends the same event more than once sometimes. We store each id
-- and skip repeats. No policies: only the secret key can touch it.
create table public.stripe_events (
  id text primary key,
  type text not null,
  received_at timestamptz not null default now(),
  processed_at timestamptz
);

-- ---------------------------------------------------------------------
-- 5. SECURITY HELPER FUNCTIONS
-- ELI5: RLS policies call these on every row. "security definer" means
-- the function runs with the owner's rights so it can peek at
-- workspace_members without hitting RLS again (no infinite loop).
-- "set search_path = ''" stops anyone tricking it with a fake table of
-- the same name, which is why every table is written public.xxx.
-- ---------------------------------------------------------------------
create or replace function public.is_workspace_member(ws uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.workspace_members m
    join public.workspaces w on w.id = m.workspace_id
    where m.workspace_id = ws
      and m.user_id = (select auth.uid())
      and w.deleted_at is null
  );
$$;

create or replace function public.has_workspace_role(ws uuid, min_role public.workspace_role)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.workspace_members m
    join public.workspaces w on w.id = m.workspace_id
    where m.workspace_id = ws
      and m.user_id = (select auth.uid())
      and m.role >= min_role
      and w.deleted_at is null
  );
$$;

-- Paywall: true when the workspace has a trialing or active subscription.
create or replace function public.has_active_access(ws uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.subscriptions s
    where s.workspace_id = ws
      and s.status in ('trialing', 'active')
  );
$$;

-- True when the signed-in user shares at least one workspace with "other".
-- Used so teammates can see each other's names and avatars.
create or replace function public.shares_workspace_with(other uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.workspace_members a
    join public.workspace_members b on b.workspace_id = a.workspace_id
    where a.user_id = (select auth.uid())
      and b.user_id = other
  );
$$;

-- Storage helper: the first folder of a file path is the workspace id.
-- Returns null (not an error) if the folder is not a valid uuid.
create or replace function public.path_segment_uuid(p_name text, p_index int)
returns uuid
language sql
immutable
set search_path = ''
as $$
  select case
    when split_part(p_name, '/', p_index) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    then split_part(p_name, '/', p_index)::uuid
    else null
  end;
$$;

-- Generic guard: workspace_id can never change after a row is created.
create or replace function public.lock_workspace_id()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.workspace_id is distinct from old.workspace_id then
    raise exception 'workspace_id cannot be changed' using errcode = '42501';
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- 6. RECORDS: COMPANIES, PEOPLE, CUSTOM FIELDS
-- ELI5: companies and people are the address book. Custom fields let a
-- recruiter add "Notice period" and an agency add "Retainer size" without
-- us changing the database: the definitions live in custom_field_defs and
-- the values live in a jsonb "custom" column on each record.
-- The "unique (workspace_id, id)" lines let other tables point at a row
-- AND prove it is in the same workspace (a composite foreign key).
-- ---------------------------------------------------------------------
create table public.companies (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 200),
  domain text check (domain is null or (domain = lower(domain) and domain !~ '^(https?://|www\\.)')),
  industry text,
  employee_range text,
  linkedin_url text,
  phone text,
  city text,
  country text,
  owner_id uuid references auth.users (id) on delete set null,
  custom jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (workspace_id, id)
);
create index companies_workspace_idx on public.companies (workspace_id) where deleted_at is null;
create index companies_owner_idx on public.companies (owner_id);
create index companies_created_by_idx on public.companies (created_by);
create unique index companies_domain_per_ws
  on public.companies (workspace_id, domain) where domain is not null and deleted_at is null;
create index companies_name_trgm on public.companies using gin (name extensions.gin_trgm_ops);
create index companies_custom_gin on public.companies using gin (custom);

create table public.people (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  company_id uuid,
  first_name text check (char_length(first_name) <= 100),
  last_name text check (char_length(last_name) <= 100),
  email text check (email is null or email = lower(email)),
  phone text check (phone is null or phone ~ '^\\+[1-9][0-9]{6,14}$'),
  job_title text,
  linkedin_url text,
  city text,
  country text,
  lead_source text,
  owner_id uuid references auth.users (id) on delete set null,
  do_not_call boolean not null default false,
  last_contacted_at timestamptz,
  custom jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (workspace_id, id),
  foreign key (workspace_id, company_id)
    references public.companies (workspace_id, id) on delete set null (company_id),
  check (coalesce(first_name, last_name, email) is not null)
);
create index people_workspace_idx on public.people (workspace_id) where deleted_at is null;
create index people_company_idx on public.people (workspace_id, company_id);
create index people_owner_idx on public.people (owner_id);
create index people_created_by_idx on public.people (created_by);
create index people_phone_idx on public.people (workspace_id, phone);
create unique index people_email_per_ws
  on public.people (workspace_id, email) where email is not null and deleted_at is null;
create index people_name_trgm on public.people
  using gin ((coalesce(first_name, '') || ' ' || coalesce(last_name, '') || ' ' || coalesce(email, '')) extensions.gin_trgm_ops);
create index people_custom_gin on public.people using gin (custom);

create table public.custom_field_defs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  entity public.record_entity not null,
  key text not null check (key ~ '^[a-z][a-z0-9_]{0,39}$'),
  label text not null check (char_length(label) between 1 and 60),
  field_type public.field_type not null,
  options jsonb not null default '[]'::jsonb,
  required boolean not null default false,
  position int not null default 0,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  unique (workspace_id, entity, key)
);
create index custom_field_defs_workspace_idx on public.custom_field_defs (workspace_id, entity);

-- ---------------------------------------------------------------------
-- 7. PIPELINES, STAGES, DEALS
-- ELI5: a pipeline is a board. Stages are its columns (Lead, Proposal,
-- Won). A deal is a card. Each stage has a win probability so Etcher can
-- say "you have $40k in the pipe, about $18k of it is likely".
-- ---------------------------------------------------------------------
create table public.pipelines (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  currency text not null default 'USD' check (currency ~ '^[A-Z]{3}$'),
  is_default boolean not null default false,
  position int not null default 0,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, id)
);
create index pipelines_workspace_idx on public.pipelines (workspace_id);
create unique index pipelines_one_default on public.pipelines (workspace_id) where is_default;
create trigger pipelines_updated_at before update on public.pipelines
  for each row execute function public.set_updated_at();

create table public.stages (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  pipeline_id uuid not null,
  name text not null check (char_length(name) between 1 and 40),
  colour text not null default 'grey'
    check (colour in ('grey', 'blue', 'teal', 'green', 'amber', 'orange', 'red', 'pink', 'violet')),
  win_probability int not null default 10 check (win_probability between 0 and 100),
  position int not null default 0,
  kind public.stage_kind not null default 'open',
  created_at timestamptz not null default now(),
  unique (workspace_id, id),
  foreign key (workspace_id, pipeline_id)
    references public.pipelines (workspace_id, id) on delete cascade,
  -- Deferrable so a reorder can swap positions inside one transaction.
  constraint stages_pipeline_position_key unique (pipeline_id, position) deferrable initially deferred
);
create index stages_workspace_idx on public.stages (workspace_id);
create index stages_pipeline_idx on public.stages (workspace_id, pipeline_id);

create table public.deals (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  pipeline_id uuid not null,
  stage_id uuid not null,
  name text not null check (char_length(name) between 1 and 200),
  value_cents bigint not null default 0 check (value_cents >= 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  status public.deal_status not null default 'open',
  person_id uuid,
  company_id uuid,
  owner_id uuid references auth.users (id) on delete set null,
  expected_close_date date,
  close_reason text check (char_length(close_reason) <= 500),
  lost_reason_category text check (lost_reason_category in
    ('price', 'timing', 'competitor', 'no_budget', 'no_decision', 'went_silent', 'bad_fit', 'other')),
  position double precision not null default 0,
  stage_changed_at timestamptz not null default now(),
  closed_at timestamptz,
  custom jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (workspace_id, id),
  foreign key (workspace_id, pipeline_id) references public.pipelines (workspace_id, id) on delete cascade,
  foreign key (workspace_id, stage_id) references public.stages (workspace_id, id),
  foreign key (workspace_id, person_id) references public.people (workspace_id, id) on delete set null (person_id),
  foreign key (workspace_id, company_id) references public.companies (workspace_id, id) on delete set null (company_id)
);
create index deals_workspace_idx on public.deals (workspace_id) where deleted_at is null;
create index deals_pipeline_stage_idx on public.deals (workspace_id, pipeline_id, stage_id, position);
create index deals_stage_idx on public.deals (workspace_id, stage_id);
create index deals_person_idx on public.deals (workspace_id, person_id);
create index deals_company_idx on public.deals (workspace_id, company_id);
create index deals_owner_idx on public.deals (owner_id);
create index deals_created_by_idx on public.deals (created_by);
create index deals_closed_idx on public.deals (workspace_id, status, closed_at);
create index deals_name_trgm on public.deals using gin (name extensions.gin_trgm_ops);

-- ---------------------------------------------------------------------
-- 8. TELEPHONY: TWILIO SETUP, NUMBERS, CALLS, RECORDINGS
-- ELI5: each workspace gets its own Twilio "subaccount" (a little Twilio
-- account inside yours) so one customer's calls, numbers and bills never
-- mix with another's. Non-secret ids live in workspace_telephony.
-- Secret tokens live in workspace_secrets, which has RLS on and NO
-- policies: only edge functions using the secret key can read it.
-- ---------------------------------------------------------------------
create table public.workspace_telephony (
  workspace_id uuid primary key references public.workspaces (id) on delete cascade,
  mode public.telephony_mode not null default 'etcher_subaccount',
  twilio_account_sid text check (twilio_account_sid ~ '^AC[0-9a-f]{32}$'),
  twiml_app_sid text check (twiml_app_sid ~ '^AP[0-9a-f]{32}$'),
  api_key_sid text check (api_key_sid ~ '^SK[0-9a-f]{32}$'),
  byoc_trunk_sid text check (byoc_trunk_sid ~ '^BY[0-9a-f]{32}$'),
  regulatory_bundle_sid text check (regulatory_bundle_sid ~ '^BU[0-9a-f]{32}$'),
  bundle_status text not null default 'none' check (bundle_status in
    ('none', 'draft', 'pending-review', 'in-review', 'twilio-approved', 'twilio-rejected')),
  bundle_rejection_reason text,
  address_sid text check (address_sid ~ '^AD[0-9a-f]{32}$'),
  inbound_fallback text not null default 'voicemail' check (inbound_fallback in ('voicemail', 'ring_all', 'hangup')),
  ring_timeout_seconds int not null default 20 check (ring_timeout_seconds between 10 and 60),
  status text not null default 'not_started' check (status in ('not_started', 'provisioning', 'ready', 'suspended', 'error')),
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index workspace_telephony_account_idx on public.workspace_telephony (twilio_account_sid);
create trigger workspace_telephony_updated_at before update on public.workspace_telephony
  for each row execute function public.set_updated_at();

create table public.workspace_secrets (
  workspace_id uuid primary key references public.workspaces (id) on delete cascade,
  twilio_auth_token_enc text,
  twilio_api_key_secret_enc text,
  updated_at timestamptz not null default now()
);

create table public.phone_numbers (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  twilio_sid text unique check (twilio_sid ~ '^PN[0-9a-f]{32}$'),
  e164 text not null check (e164 ~ '^\\+[1-9][0-9]{6,14}$'),
  friendly_name text,
  country text not null check (country ~ '^[A-Z]{2}$'),
  number_type text not null default 'local' check (number_type in ('local', 'mobile', 'toll_free', 'national')),
  source public.telephony_mode not null default 'etcher_subaccount',
  status public.number_status not null default 'pending',
  assigned_user_id uuid references auth.users (id) on delete set null,
  is_default boolean not null default false,
  monthly_cost_cents int not null default 0,
  purchased_by uuid references auth.users (id) on delete set null,
  -- A double click on "Buy" sends the same key twice; we buy once.
  idempotency_key text unique,
  created_at timestamptz not null default now(),
  released_at timestamptz,
  unique (workspace_id, id)
);
create index phone_numbers_workspace_idx on public.phone_numbers (workspace_id);
create index phone_numbers_assigned_idx on public.phone_numbers (assigned_user_id);
create index phone_numbers_purchased_by_idx on public.phone_numbers (purchased_by);
create unique index phone_numbers_active_e164 on public.phone_numbers (e164) where status = 'active';
create unique index phone_numbers_one_default on public.phone_numbers (workspace_id) where is_default and status = 'active';

create table public.calls (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  twilio_call_sid text not null unique check (twilio_call_sid ~ '^CA[0-9a-f]{32}$'),
  child_call_sid text,
  direction public.call_direction not null,
  status public.call_status not null default 'initiated',
  from_number text,
  to_number text,
  phone_number_id uuid,
  user_id uuid references auth.users (id) on delete set null,
  person_id uuid,
  company_id uuid,
  deal_id uuid,
  started_at timestamptz not null default now(),
  answered_at timestamptz,
  ended_at timestamptz,
  duration_seconds int not null default 0 check (duration_seconds >= 0),
  billable_minutes int not null default 0 check (billable_minutes >= 0),
  disposition public.call_disposition,
  notes text check (char_length(notes) <= 5000),
  recorded boolean not null default false,
  consent_played boolean not null default false,
  last_sequence int not null default -1,
  wrapped_up_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, id),
  foreign key (workspace_id, phone_number_id) references public.phone_numbers (workspace_id, id) on delete set null (phone_number_id),
  foreign key (workspace_id, person_id) references public.people (workspace_id, id) on delete set null (person_id),
  foreign key (workspace_id, company_id) references public.companies (workspace_id, id) on delete set null (company_id),
  foreign key (workspace_id, deal_id) references public.deals (workspace_id, id) on delete set null (deal_id)
);
create index calls_workspace_started_idx on public.calls (workspace_id, started_at desc);
create index calls_user_idx on public.calls (user_id, started_at desc);
create index calls_person_idx on public.calls (workspace_id, person_id);
create index calls_company_idx on public.calls (workspace_id, company_id);
create index calls_deal_idx on public.calls (workspace_id, deal_id);
create index calls_phone_number_idx on public.calls (workspace_id, phone_number_id);
create index calls_child_sid_idx on public.calls (child_call_sid);
create trigger calls_updated_at before update on public.calls
  for each row execute function public.set_updated_at();

create table public.recordings (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  call_id uuid not null,
  twilio_recording_sid text not null unique check (twilio_recording_sid ~ '^RE[0-9a-f]{32}$'),
  storage_path text,
  duration_seconds int not null default 0,
  channels int not null default 1,
  status text not null default 'pending' check (status in ('pending', 'stored', 'failed', 'deleted')),
  -- The recording callback only queues the row. A worker downloads it with
  -- retries: attempts counts tries, next_attempt_at is the backoff clock.
  attempts int not null default 0,
  next_attempt_at timestamptz not null default now(),
  size_bytes bigint,
  twilio_deleted_at timestamptz,
  error text,
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  foreign key (workspace_id, call_id) references public.calls (workspace_id, id) on delete cascade
);
create index recordings_workspace_idx on public.recordings (workspace_id);
create index recordings_call_idx on public.recordings (workspace_id, call_id);
create index recordings_queue_idx on public.recordings (next_attempt_at) where status = 'pending';

-- ---------------------------------------------------------------------
-- 9. ACTIVITY TIMELINE AND TASKS
-- ELI5: the timeline is the diary of a person, company or deal: notes,
-- logged emails, calls and every stage move. Tasks are reminders with a
-- due date and an assignee.
-- ---------------------------------------------------------------------
create table public.activities (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  type public.activity_type not null,
  person_id uuid,
  company_id uuid,
  deal_id uuid,
  call_id uuid,
  body text check (char_length(body) <= 20000),
  meta jsonb not null default '{}'::jsonb,
  actor_id uuid references auth.users (id) on delete set null,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  foreign key (workspace_id, person_id) references public.people (workspace_id, id) on delete cascade,
  foreign key (workspace_id, company_id) references public.companies (workspace_id, id) on delete cascade,
  foreign key (workspace_id, deal_id) references public.deals (workspace_id, id) on delete cascade,
  foreign key (workspace_id, call_id) references public.calls (workspace_id, id) on delete set null (call_id)
);
create index activities_workspace_idx on public.activities (workspace_id, occurred_at desc);
create index activities_person_idx on public.activities (workspace_id, person_id, occurred_at desc);
create index activities_company_idx on public.activities (workspace_id, company_id, occurred_at desc);
create index activities_deal_idx on public.activities (workspace_id, deal_id, occurred_at desc);
create index activities_call_idx on public.activities (workspace_id, call_id);
create index activities_actor_idx on public.activities (actor_id);
-- One "call" timeline entry per call, even if Twilio repeats the callback.
create unique index activities_one_per_call on public.activities (call_id) where type = 'call';
create trigger activities_updated_at before update on public.activities
  for each row execute function public.set_updated_at();

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  notes text check (char_length(notes) <= 5000),
  status public.task_status not null default 'open',
  due_at timestamptz,
  remind_at timestamptz,
  reminded_at timestamptz,
  assignee_id uuid references auth.users (id) on delete set null,
  person_id uuid,
  company_id uuid,
  deal_id uuid,
  completed_at timestamptz,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (workspace_id, person_id) references public.people (workspace_id, id) on delete cascade,
  foreign key (workspace_id, company_id) references public.companies (workspace_id, id) on delete cascade,
  foreign key (workspace_id, deal_id) references public.deals (workspace_id, id) on delete cascade
);
create index tasks_workspace_idx on public.tasks (workspace_id, status, due_at);
create index tasks_assignee_idx on public.tasks (assignee_id, status, due_at);
create index tasks_person_idx on public.tasks (workspace_id, person_id);
create index tasks_company_idx on public.tasks (workspace_id, company_id);
create index tasks_deal_idx on public.tasks (workspace_id, deal_id);
create index tasks_created_by_idx on public.tasks (created_by);
create index tasks_remind_idx on public.tasks (remind_at) where status = 'open' and reminded_at is null;
create trigger tasks_updated_at before update on public.tasks
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- 10. IMPORT AND EXPORT JOBS, AUDIT LOG, EMAIL LOG
-- ELI5: an import job is a to-do ticket: "turn this CSV into people".
-- The edge function updates the counters as it goes so the browser can
-- show a live progress bar. Export jobs do the reverse.
-- The audit log is a tamper-proof diary of who did what (admins read it,
-- nobody can edit it). The email log stops us sending the same
-- "trial ending" email twice.
-- ---------------------------------------------------------------------
create table public.import_jobs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  created_by uuid references auth.users (id) on delete set null,
  entity text not null default 'people' check (entity in ('people', 'companies')),
  file_path text not null,
  file_name text not null,
  mapping jsonb not null default '{}'::jsonb,
  dedupe text not null default 'skip' check (dedupe in ('skip', 'update', 'create')),
  create_companies boolean not null default true,
  owner_id uuid references auth.users (id) on delete set null,
  status public.job_status not null default 'queued',
  total_rows int not null default 0,
  processed_rows int not null default 0,
  inserted_count int not null default 0,
  updated_count int not null default 0,
  skipped_count int not null default 0,
  error_count int not null default 0,
  errors jsonb not null default '[]'::jsonb,
  cursor_row int not null default 0,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index import_jobs_workspace_idx on public.import_jobs (workspace_id, created_at desc);
create index import_jobs_created_by_idx on public.import_jobs (created_by);
create index import_jobs_owner_idx on public.import_jobs (owner_id);
create index import_jobs_status_idx on public.import_jobs (status) where status in ('queued', 'running');
create trigger import_jobs_updated_at before update on public.import_jobs
  for each row execute function public.set_updated_at();

create table public.export_jobs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  created_by uuid references auth.users (id) on delete set null,
  entity text not null check (entity in ('people', 'companies', 'deals', 'calls', 'everything')),
  filters jsonb not null default '{}'::jsonb,
  status public.job_status not null default 'queued',
  row_count int not null default 0,
  file_path text,
  expires_at timestamptz,
  emailed_at timestamptz,
  error text,
  created_at timestamptz not null default now(),
  finished_at timestamptz
);
create index export_jobs_workspace_idx on public.export_jobs (workspace_id, created_at desc);
create index export_jobs_created_by_idx on public.export_jobs (created_by);

create table public.audit_log (
  id bigint generated always as identity primary key,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  actor_id uuid references auth.users (id) on delete set null,
  action text not null,
  entity text not null,
  entity_id text,
  before jsonb,
  after jsonb,
  created_at timestamptz not null default now()
);
create index audit_log_workspace_idx on public.audit_log (workspace_id, created_at desc);
create index audit_log_actor_idx on public.audit_log (actor_id);

create table public.email_log (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null,
  template text not null,
  to_email text not null,
  dedupe_key text not null unique,
  resend_id text,
  status text not null default 'sent' check (status in ('sent', 'failed', 'skipped')),
  error text,
  created_at timestamptz not null default now()
);
create index email_log_workspace_idx on public.email_log (workspace_id, created_at desc);
create index email_log_user_idx on public.email_log (user_id);

-- ---------------------------------------------------------------------
-- 10b. USAGE LEDGER, MINUTE PACKS AND RATE LIMITS
-- ELI5: every paid thing Etcher does for a workspace (a minute on the
-- phone, a phone number rented, a recording stored) is written here as a
-- line, like a till receipt. Adding up this month's lines tells us how
-- many minutes are left before the cap. idempotency_key stops the same
-- call being counted twice when Twilio sends its callback twice.
-- ---------------------------------------------------------------------
create table public.usage_ledger (
  id bigint generated always as identity primary key,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null,
  metric text not null check (metric in
    ('call_minutes', 'number_month', 'recording_minutes', 'minute_pack', 'export', 'import_rows')),
  quantity int not null,
  cost_micros bigint not null default 0,
  ref_id text,
  idempotency_key text not null unique,
  occurred_at timestamptz not null default now()
);
create index usage_ledger_ws_metric_idx on public.usage_ledger (workspace_id, metric, occurred_at desc);
create index usage_ledger_user_idx on public.usage_ledger (user_id);

-- ELI5: a tiny counter per (key, time window). Edge functions call
-- try_rate_limit('token:<user>', 60, 3600) and get false when someone
-- hammers an endpoint. Named api_rate_limits so it never clashes with the
-- generic rate_limits table the security sweep adds.
create table public.api_rate_limits (
  bucket text not null,
  window_start timestamptz not null,
  count int not null default 0,
  primary key (bucket, window_start)
);

-- ---------------------------------------------------------------------
-- 10c. PLAN LIMITS AND USAGE MATHS
-- ELI5: both plans (Monthly $149, Annual $949) have unlimited seats and
-- include 1,000 call minutes per calendar month, 3 phone numbers and
-- 12 months of recordings. Extra minutes come in packs of 1,000 bought
-- from Billing; each pack adds a 'minute_pack' line this month.
-- Workspaces on their own Twilio account or SIP trunk pay Twilio
-- directly, so their cap is effectively unlimited (we still meter).
-- ---------------------------------------------------------------------
create or replace function public.plan_limits(ws uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'included_minutes', 1000,
    'pack_minutes', coalesce((
      select sum(u.quantity) from public.usage_ledger u
      where u.workspace_id = ws and u.metric = 'minute_pack'
        and u.occurred_at >= date_trunc('month', now())
    ), 0),
    'max_numbers', 3,
    'recording_retention_days', 365,
    'max_import_rows', 50000,
    'max_exports_per_day', 10,
    'byo', coalesce((select t.mode <> 'etcher_subaccount' from public.workspace_telephony t where t.workspace_id = ws), false)
  );
$$;

create or replace function public.usage_this_month(ws uuid, p_metric text)
returns bigint
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(sum(u.quantity), 0)::bigint
  from public.usage_ledger u
  where u.workspace_id = ws
    and u.metric = p_metric
    and u.occurred_at >= date_trunc('month', now());
$$;

-- What the Calling page meter shows: used, cap, left. Members only.
create or replace function public.minutes_status(ws uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_limits jsonb;
  v_used bigint;
  v_cap bigint;
begin
  if not public.is_workspace_member(ws) then
    raise exception 'Not a member' using errcode = '42501';
  end if;
  v_limits := public.plan_limits(ws);
  v_used := public.usage_this_month(ws, 'call_minutes');
  v_cap := (v_limits ->> 'included_minutes')::bigint + (v_limits ->> 'pack_minutes')::bigint;
  return jsonb_build_object(
    'used', v_used,
    'cap', case when (v_limits ->> 'byo')::boolean then null else v_cap end,
    'left', case when (v_limits ->> 'byo')::boolean then null else greatest(v_cap - v_used, 0) end,
    'resets_at', (date_trunc('month', now()) + interval '1 month')
  );
end;
$$;

-- Fixed-window rate limiter used by edge functions (secret key only).
create or replace function public.try_rate_limit(p_bucket text, p_max int, p_window_seconds int)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_start timestamptz := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  v_count int;
begin
  insert into public.api_rate_limits (bucket, window_start, count)
  values (p_bucket, v_start, 1)
  on conflict (bucket, window_start) do update set count = public.api_rate_limits.count + 1
  returning count into v_count;
  return v_count <= p_max;
end;
$$;

-- Recording worker queue: claim up to n rows that are due, so two
-- worker runs never download the same file (skip locked). Secret key only.
create or replace function public.claim_recordings(n int default 10)
returns setof public.recordings
language sql
security definer
set search_path = ''
as $$
  update public.recordings r
  set attempts = r.attempts + 1,
      next_attempt_at = now() + interval '5 minutes'
  where r.id in (
    select q.id from public.recordings q
    where q.status = 'pending' and q.next_attempt_at <= now()
    order by q.next_attempt_at
    limit n
    for update skip locked
  )
  returning r.*;
$$;

-- ---------------------------------------------------------------------
-- 11. TRIGGERS THAT KEEP DATA HONEST
-- ---------------------------------------------------------------------

-- 11a. Slug for every new workspace ("acme-recruiting-3f9a2c").
create or replace function public.workspaces_before_insert()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.slug is null or new.slug = '' then
    new.slug := trim(both '-' from regexp_replace(lower(new.name), '[^a-z0-9]+', '-', 'g'))
      || '-' || substr(replace(new.id::text, '-', ''), 1, 6);
  end if;
  return new;
end;
$$;
create trigger workspaces_slug before insert on public.workspaces
  for each row execute function public.workspaces_before_insert();

-- 11b. New workspace bootstrap.
-- ELI5: the moment a workspace is born we make its creator the owner and
-- give it a ready-to-use "Sales" pipeline with six stages, so the first
-- screen is never empty.
create or replace function public.handle_new_workspace()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_pipeline uuid;
begin
  if new.created_by is not null then
    insert into public.workspace_members (workspace_id, user_id, role)
    values (new.id, new.created_by, 'owner')
    on conflict do nothing;

    update public.profiles
    set current_workspace_id = new.id
    where id = new.created_by and current_workspace_id is null;
  end if;

  insert into public.pipelines (workspace_id, name, currency, is_default, position)
  values (new.id, 'Sales', new.default_currency, true, 0)
  returning id into v_pipeline;

  insert into public.stages (workspace_id, pipeline_id, name, colour, win_probability, position, kind) values
    (new.id, v_pipeline, 'Lead',        'grey',   10, 0, 'open'),
    (new.id, v_pipeline, 'Qualified',   'blue',   25, 1, 'open'),
    (new.id, v_pipeline, 'Proposal',    'violet', 50, 2, 'open'),
    (new.id, v_pipeline, 'Negotiation', 'amber',  75, 3, 'open'),
    (new.id, v_pipeline, 'Won',         'green', 100, 4, 'won'),
    (new.id, v_pipeline, 'Lost',        'red',     0, 5, 'lost');

  insert into public.workspace_telephony (workspace_id) values (new.id)
  on conflict do nothing;

  return new;
end;
$$;
create trigger on_workspace_created
  after insert on public.workspaces
  for each row execute function public.handle_new_workspace();

-- 11c. Deals: the stage must belong to the deal's pipeline. Moving into a
-- Won or Lost stage closes the deal; moving out reopens it.
create or replace function public.deals_before_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_stage_pipeline uuid;
  v_stage_ws uuid;
  v_kind public.stage_kind;
  v_moved boolean;
begin
  select s.pipeline_id, s.workspace_id, s.kind
    into v_stage_pipeline, v_stage_ws, v_kind
  from public.stages s where s.id = new.stage_id;

  if v_stage_pipeline is null
     or v_stage_pipeline <> new.pipeline_id
     or v_stage_ws <> new.workspace_id then
    raise exception 'That stage is not part of this pipeline' using errcode = '23514';
  end if;

  if new.currency is null then
    select p.currency into new.currency from public.pipelines p where p.id = new.pipeline_id;
  end if;

  -- Never touch OLD on INSERT: it does not exist yet.
  if tg_op = 'INSERT' then
    v_moved := true;
  else
    v_moved := new.stage_id is distinct from old.stage_id;
  end if;

  if v_moved then
    new.stage_changed_at := now();
    new.status := case v_kind
      when 'won' then 'won'::public.deal_status
      when 'lost' then 'lost'::public.deal_status
      else 'open'::public.deal_status
    end;
    if new.status = 'open' then
      new.closed_at := null;
    else
      new.closed_at := coalesce(new.closed_at, now());
    end if;
  end if;

  if tg_op = 'UPDATE' then
    new.updated_at := now();
  end if;
  return new;
end;
$$;
create trigger deals_before_write before insert or update on public.deals
  for each row execute function public.deals_before_write();

-- 11d. Deals: write the timeline entry for created, stage moves, won, lost.
create or replace function public.deals_after_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_from text;
  v_to text;
begin
  if tg_op = 'INSERT' then
    insert into public.activities (workspace_id, type, deal_id, person_id, company_id, actor_id, meta)
    values (new.workspace_id, 'deal_created', new.id, new.person_id, new.company_id, (select auth.uid()),
            jsonb_build_object('value_cents', new.value_cents, 'currency', new.currency));
    return new;
  end if;

  if new.stage_id is distinct from old.stage_id then
    select name into v_from from public.stages where id = old.stage_id;
    select name into v_to from public.stages where id = new.stage_id;
    insert into public.activities (workspace_id, type, deal_id, person_id, company_id, actor_id, meta)
    values (
      new.workspace_id,
      case new.status when 'won' then 'deal_won'::public.activity_type
                      when 'lost' then 'deal_lost'::public.activity_type
                      else 'stage_change'::public.activity_type end,
      new.id, new.person_id, new.company_id, (select auth.uid()),
      jsonb_build_object('from_stage_id', old.stage_id, 'to_stage_id', new.stage_id,
                         'from', v_from, 'to', v_to, 'value_cents', new.value_cents,
                         'currency', new.currency, 'close_reason', new.close_reason)
    );
  end if;
  return new;
end;
$$;
create trigger deals_after_write after insert or update on public.deals
  for each row execute function public.deals_after_write();

-- 11e. Soft delete guard for companies, people and deals.
-- ELI5: members can bin their own records. Only admins can bin or
-- restore someone else's. workspace_id can never change.
create or replace function public.records_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.workspace_id is distinct from old.workspace_id then
    raise exception 'workspace_id cannot be changed' using errcode = '42501';
  end if;
  if (select auth.uid()) is not null
     and new.deleted_at is distinct from old.deleted_at
     and not public.has_workspace_role(new.workspace_id, 'admin')
     and coalesce(old.owner_id, old.created_by) is distinct from (select auth.uid()) then
    raise exception 'Only an admin or the record owner can delete or restore this' using errcode = '42501';
  end if;
  new.updated_at := now();
  return new;
end;
$$;
create trigger companies_guard before update on public.companies
  for each row execute function public.records_guard();
create trigger people_guard before update on public.people
  for each row execute function public.records_guard();
create trigger deals_guard before update on public.deals
  for each row execute function public.records_guard();

create trigger custom_field_defs_lock before update on public.custom_field_defs
  for each row execute function public.lock_workspace_id();
create trigger pipelines_lock before update on public.pipelines
  for each row execute function public.lock_workspace_id();
create trigger stages_lock before update on public.stages
  for each row execute function public.lock_workspace_id();
create trigger activities_lock before update on public.activities
  for each row execute function public.lock_workspace_id();
create trigger tasks_lock before update on public.tasks
  for each row execute function public.lock_workspace_id();
create trigger calls_lock before update on public.calls
  for each row execute function public.lock_workspace_id();
create trigger phone_numbers_lock before update on public.phone_numbers
  for each row execute function public.lock_workspace_id();
create trigger invitations_lock before update on public.invitations
  for each row execute function public.lock_workspace_id();

-- 11f. Members guard.
-- ELI5: admins can manage members, but only an owner can make or unmake
-- an owner, and a workspace can never lose its last owner.
create or replace function public.workspace_members_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_owners int;
begin
  -- The secret key (edge functions, account deletion) has no uid: allow.
  if v_uid is null then
    return coalesce(new, old);
  end if;
  -- The whole workspace is being deleted (cascade): nothing to protect.
  if tg_op = 'DELETE' and not exists (select 1 from public.workspaces w where w.id = old.workspace_id) then
    return old;
  end if;

  if tg_op = 'UPDATE' then
    if new.workspace_id <> old.workspace_id or new.user_id <> old.user_id then
      raise exception 'A membership cannot be moved' using errcode = '42501';
    end if;
    if (new.role = 'owner' or old.role = 'owner')
       and not public.has_workspace_role(old.workspace_id, 'owner') then
      raise exception 'Only an owner can change owner roles' using errcode = '42501';
    end if;
  end if;

  if tg_op = 'DELETE' and old.role = 'owner' and old.user_id <> v_uid
     and not public.has_workspace_role(old.workspace_id, 'owner') then
    raise exception 'Only an owner can remove an owner' using errcode = '42501';
  end if;

  if (tg_op = 'DELETE' and old.role = 'owner')
     or (tg_op = 'UPDATE' and old.role = 'owner' and new.role <> 'owner') then
    select count(*) into v_owners
    from public.workspace_members
    where workspace_id = old.workspace_id and role = 'owner';
    if v_owners <= 1 then
      raise exception 'A workspace needs at least one owner. Make someone else owner first.' using errcode = '23514';
    end if;
  end if;

  return coalesce(new, old);
end;
$$;
create trigger workspace_members_guard before update or delete on public.workspace_members
  for each row execute function public.workspace_members_guard();

-- 11g. Audit log writer, reused on sensitive tables.
create or replace function public.write_audit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row jsonb := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  v_action text;
begin
  -- Skip when the whole workspace is being purged (nothing left to audit).
  if not exists (select 1 from public.workspaces w where w.id = (v_row ->> 'workspace_id')::uuid) then
    return null;
  end if;
  v_action := lower(tg_op);
  if tg_op = 'UPDATE' and (v_row ? 'deleted_at')
     and (to_jsonb(old) ->> 'deleted_at') is null and (v_row ->> 'deleted_at') is not null then
    v_action := 'soft_delete';
  end if;

  insert into public.audit_log (workspace_id, actor_id, action, entity, entity_id, before, after)
  values (
    (v_row ->> 'workspace_id')::uuid,
    (select auth.uid()),
    v_action,
    tg_table_name,
    coalesce(v_row ->> 'id', v_row ->> 'user_id'),
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) else null end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) else null end
  );
  return null;
end;
$$;

create trigger audit_workspace_members after insert or update or delete on public.workspace_members
  for each row execute function public.write_audit();
create trigger audit_invitations after insert or update on public.invitations
  for each row execute function public.write_audit();
create trigger audit_pipelines after insert or update or delete on public.pipelines
  for each row execute function public.write_audit();
create trigger audit_stages after insert or update or delete on public.stages
  for each row execute function public.write_audit();
create trigger audit_custom_fields after insert or update or delete on public.custom_field_defs
  for each row execute function public.write_audit();
create trigger audit_phone_numbers after insert or update or delete on public.phone_numbers
  for each row execute function public.write_audit();
create trigger audit_export_jobs after insert on public.export_jobs
  for each row execute function public.write_audit();
create trigger audit_import_jobs after insert on public.import_jobs
  for each row execute function public.write_audit();
-- Deals: only log the moves that matter, not every drag inside a column.
create trigger audit_deals_insert_delete after insert or delete on public.deals
  for each row execute function public.write_audit();
create trigger audit_deals_update after update on public.deals
  for each row
  when (old.status is distinct from new.status
        or old.deleted_at is distinct from new.deleted_at
        or old.value_cents is distinct from new.value_cents
        or old.owner_id is distinct from new.owner_id)
  execute function public.write_audit();
create trigger audit_people_delete after update on public.people
  for each row when (old.deleted_at is distinct from new.deleted_at)
  execute function public.write_audit();
create trigger audit_companies_delete after update on public.companies
  for each row when (old.deleted_at is distinct from new.deleted_at)
  execute function public.write_audit();

-- ---------------------------------------------------------------------
-- 12. RPC FUNCTIONS THE APP CALLS
-- ELI5: an RPC is a function the browser can call by name, like
-- supabase.rpc('create_workspace', { p_name: 'Acme' }). Each one checks
-- who is asking before it does anything.
-- ---------------------------------------------------------------------

-- 12a. Create a workspace (the trigger in 11b does the rest).
create or replace function public.create_workspace(p_name text, p_team_size text default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_id uuid;
  v_count int;
begin
  if v_uid is null then
    raise exception 'Not signed in' using errcode = '28000';
  end if;
  if char_length(trim(coalesce(p_name, ''))) < 2 then
    raise exception 'Workspace name must be at least 2 characters' using errcode = '22023';
  end if;
  select count(*) into v_count
  from public.workspaces where created_by = v_uid and deleted_at is null;
  if v_count >= 5 then
    raise exception 'You can create up to 5 workspaces' using errcode = '54000';
  end if;

  insert into public.workspaces (name, team_size, created_by)
  values (trim(p_name), p_team_size, v_uid)
  returning id into v_id;

  update public.profiles set current_workspace_id = v_id where id = v_uid;
  return v_id;
end;
$$;

-- 12b. Switch workspace (the switcher in the sidebar calls this).
create or replace function public.switch_workspace(p_workspace_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_workspace_member(p_workspace_id) then
    raise exception 'Not a member of that workspace' using errcode = '42501';
  end if;
  update public.profiles set current_workspace_id = p_workspace_id where id = (select auth.uid());
end;
$$;

-- 12c. Accept an invitation with the token from the email link.
-- The email you are logged in with must match the invited email.
create or replace function public.accept_invitation(p_token text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_email text := lower((select auth.jwt()) ->> 'email');
  v_inv public.invitations%rowtype;
begin
  if v_uid is null then
    raise exception 'Not signed in' using errcode = '28000';
  end if;

  select * into v_inv
  from public.invitations
  where token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex')
  for update;

  if v_inv.id is null or v_inv.revoked_at is not null then
    raise exception 'This invite link is not valid' using errcode = 'P0002';
  end if;
  if v_inv.accepted_at is not null then
    if v_inv.accepted_by = v_uid then
      return v_inv.workspace_id;
    end if;
    raise exception 'This invite has already been used' using errcode = 'P0002';
  end if;
  if v_inv.expires_at < now() then
    raise exception 'This invite has expired. Ask for a new one.' using errcode = 'P0002';
  end if;
  if v_inv.email <> v_email then
    raise exception 'This invite was sent to a different email address' using errcode = '42501';
  end if;

  insert into public.workspace_members (workspace_id, user_id, role, invited_by)
  values (v_inv.workspace_id, v_uid, v_inv.role, v_inv.invited_by)
  on conflict (workspace_id, user_id) do nothing;

  update public.invitations
  set accepted_at = now(), accepted_by = v_uid
  where id = v_inv.id;

  update public.profiles set current_workspace_id = v_inv.workspace_id where id = v_uid;
  return v_inv.workspace_id;
end;
$$;

-- 12d. Reorder stages in one go (admin only).
create or replace function public.reorder_stages(p_pipeline_id uuid, p_stage_ids uuid[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ws uuid;
  i int;
begin
  select workspace_id into v_ws from public.pipelines where id = p_pipeline_id;
  if v_ws is null or not public.has_workspace_role(v_ws, 'admin') then
    raise exception 'Only admins can reorder stages' using errcode = '42501';
  end if;
  if (select count(*) from public.stages where pipeline_id = p_pipeline_id)
     <> coalesce(array_length(p_stage_ids, 1), 0) then
    raise exception 'Send every stage of this pipeline exactly once' using errcode = '22023';
  end if;
  for i in 1 .. array_length(p_stage_ids, 1) loop
    update public.stages set position = i - 1
    where id = p_stage_ids[i] and pipeline_id = p_pipeline_id;
    if not found then
      raise exception 'Stage % is not in this pipeline', p_stage_ids[i] using errcode = '22023';
    end if;
  end loop;
end;
$$;

-- 12e. Create a pipeline from a template (onboarding and "New pipeline").
create or replace function public.create_pipeline_from_template(
  p_workspace_id uuid, p_template text, p_name text default null, p_currency text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_names text[];
  v_probs int[];
  v_colours text[] := array['grey', 'blue', 'teal', 'violet', 'amber', 'orange'];
  v_count int;
  i int;
begin
  if not public.has_workspace_role(p_workspace_id, 'admin') then
    raise exception 'Only admins can add pipelines' using errcode = '42501';
  end if;
  if not public.has_active_access(p_workspace_id) then
    raise exception 'Your trial or plan has ended' using errcode = '42501';
  end if;
  select count(*) into v_count from public.pipelines where workspace_id = p_workspace_id and archived_at is null;
  if v_count >= 20 then
    raise exception 'Up to 20 pipelines per workspace' using errcode = '54000';
  end if;

  case p_template
    when 'agency' then
      v_names := array['Enquiry', 'Discovery call', 'Proposal sent', 'Negotiation', 'Contract sent'];
      v_probs := array[10, 25, 50, 70, 90];
    when 'recruiting' then
      v_names := array['Sourced', 'Contacted', 'Screened', 'Submitted to client', 'Interviewing', 'Offer'];
      v_probs := array[5, 10, 25, 40, 60, 85];
    when 'b2b_sales' then
      v_names := array['Lead', 'Qualified', 'Demo booked', 'Proposal', 'Negotiation'];
      v_probs := array[10, 20, 40, 60, 80];
    when 'partnerships' then
      v_names := array['Identified', 'Intro made', 'Call held', 'Terms agreed'];
      v_probs := array[10, 30, 60, 85];
    else
      v_names := array['Lead', 'Qualified', 'Proposal', 'Negotiation'];
      v_probs := array[10, 25, 50, 75];
  end case;

  insert into public.pipelines (workspace_id, name, currency, position)
  values (
    p_workspace_id,
    coalesce(nullif(trim(p_name), ''), initcap(replace(coalesce(p_template, 'New'), '_', ' ')) || ' pipeline'),
    coalesce(p_currency, (select default_currency from public.workspaces where id = p_workspace_id)),
    v_count
  )
  returning id into v_id;

  for i in 1 .. array_length(v_names, 1) loop
    insert into public.stages (workspace_id, pipeline_id, name, colour, win_probability, position, kind)
    values (p_workspace_id, v_id, v_names[i], v_colours[((i - 1) % 6) + 1], v_probs[i], i - 1, 'open');
  end loop;
  insert into public.stages (workspace_id, pipeline_id, name, colour, win_probability, position, kind) values
    (p_workspace_id, v_id, 'Won', 'green', 100, array_length(v_names, 1), 'won'),
    (p_workspace_id, v_id, 'Lost', 'red', 0, array_length(v_names, 1) + 1, 'lost');
  return v_id;
end;
$$;

-- 12f. Mark onboarding steps done: select rpc('complete_onboarding_step', ...)
create or replace function public.complete_onboarding_step(p_workspace_id uuid, p_step text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_out jsonb;
begin
  if not public.is_workspace_member(p_workspace_id) then
    raise exception 'Not a member' using errcode = '42501';
  end if;
  if p_step not in ('workspace', 'team_size', 'import', 'pipeline', 'number', 'invite', 'first_call', 'dismissed') then
    raise exception 'Unknown step' using errcode = '22023';
  end if;
  update public.workspaces
  set onboarding = onboarding || jsonb_build_object(p_step, now())
  where id = p_workspace_id
  returning onboarding into v_out;
  return v_out;
end;
$$;

-- 12g. Keep last_seen_at fresh (for the reactivation email). Throttled.
create or replace function public.touch_last_seen()
returns void
language sql
security definer
set search_path = ''
as $$
  update public.profiles
  set last_seen_at = now()
  where id = (select auth.uid()) and last_seen_at < now() - interval '10 minutes';
$$;

-- 12h. Can I delete my account? Returns null if yes, or the reason if not.
create or replace function public.account_deletion_blocker()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select 'You are the only owner of "' || w.name || '". Make someone else owner or delete the workspace first.'
  from public.workspace_members m
  join public.workspaces w on w.id = m.workspace_id and w.deleted_at is null
  where m.user_id = (select auth.uid())
    and m.role = 'owner'
    and (select count(*) from public.workspace_members o where o.workspace_id = m.workspace_id and o.role = 'owner') = 1
    and (select count(*) from public.workspace_members a where a.workspace_id = m.workspace_id) > 1
  limit 1;
$$;

-- 12i. Owner deletes a workspace (soft delete, purged after 30 days by cron).
create or replace function public.delete_workspace(p_workspace_id uuid, p_confirm_name text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.has_workspace_role(p_workspace_id, 'owner') then
    raise exception 'Only an owner can delete a workspace' using errcode = '42501';
  end if;
  if not exists (select 1 from public.workspaces where id = p_workspace_id and name = p_confirm_name) then
    raise exception 'Type the workspace name exactly to confirm' using errcode = '22023';
  end if;
  update public.workspaces set deleted_at = now() where id = p_workspace_id;
  update public.profiles set current_workspace_id = null where current_workspace_id = p_workspace_id;
end;
$$;

-- Lock RPCs down: anonymous visitors cannot call them at all.
revoke execute on function public.create_workspace(text, text) from public, anon;
revoke execute on function public.switch_workspace(uuid) from public, anon;
revoke execute on function public.accept_invitation(text) from public, anon;
revoke execute on function public.reorder_stages(uuid, uuid[]) from public, anon;
revoke execute on function public.create_pipeline_from_template(uuid, text, text, text) from public, anon;
revoke execute on function public.complete_onboarding_step(uuid, text) from public, anon;
revoke execute on function public.touch_last_seen() from public, anon;
revoke execute on function public.account_deletion_blocker() from public, anon;
revoke execute on function public.delete_workspace(uuid, text) from public, anon;
grant execute on function public.create_workspace(text, text) to authenticated;
grant execute on function public.switch_workspace(uuid) to authenticated;
grant execute on function public.accept_invitation(text) to authenticated;
grant execute on function public.reorder_stages(uuid, uuid[]) to authenticated;
grant execute on function public.create_pipeline_from_template(uuid, text, text, text) to authenticated;
grant execute on function public.complete_onboarding_step(uuid, text) to authenticated;
grant execute on function public.touch_last_seen() to authenticated;
grant execute on function public.account_deletion_blocker() to authenticated;
grant execute on function public.delete_workspace(uuid, text) to authenticated;
revoke execute on function public.minutes_status(uuid) from public, anon;
grant execute on function public.minutes_status(uuid) to authenticated;
-- Only edge functions (secret key) may call these.
revoke execute on function public.try_rate_limit(text, int, int) from public, anon, authenticated;
revoke execute on function public.claim_recordings(int) from public, anon, authenticated;
revoke execute on function public.plan_limits(uuid) from public, anon;
grant execute on function public.plan_limits(uuid) to authenticated;
revoke execute on function public.usage_this_month(uuid, text) from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.handle_new_workspace() from public, anon, authenticated;
revoke execute on function public.write_audit() from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- 13. ROW LEVEL SECURITY: TURN IT ON EVERYWHERE
-- ELI5: once RLS is on, a table returns NOTHING until a policy says
-- who may see what. Tables with no policies at all (workspace_secrets,
-- stripe_events) can only be touched by the secret key.
-- ---------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.invitations enable row level security;
alter table public.subscriptions enable row level security;
alter table public.stripe_events enable row level security;
alter table public.companies enable row level security;
alter table public.people enable row level security;
alter table public.custom_field_defs enable row level security;
alter table public.pipelines enable row level security;
alter table public.stages enable row level security;
alter table public.deals enable row level security;
alter table public.workspace_telephony enable row level security;
alter table public.workspace_secrets enable row level security;
alter table public.phone_numbers enable row level security;
alter table public.calls enable row level security;
alter table public.recordings enable row level security;
alter table public.activities enable row level security;
alter table public.tasks enable row level security;
alter table public.import_jobs enable row level security;
alter table public.export_jobs enable row level security;
alter table public.audit_log enable row level security;
alter table public.email_log enable row level security;
alter table public.usage_ledger enable row level security;
alter table public.api_rate_limits enable row level security;

-- ---------------------------------------------------------------------
-- 14. POLICIES, ONE PER OPERATION
-- Pattern: read = member. Write = member AND the workspace is paid or
-- trialing (so a lapsed workspace becomes read-only, not locked out of
-- its own data). Structure (pipelines, fields, members) = admin.
-- ---------------------------------------------------------------------

-- profiles
create policy profiles_select on public.profiles for select to authenticated
  using (id = (select auth.uid()) or public.shares_workspace_with(id));
create policy profiles_update on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- workspaces
create policy workspaces_select on public.workspaces for select to authenticated
  using (public.is_workspace_member(id) or created_by = (select auth.uid()));
create policy workspaces_insert on public.workspaces for insert to authenticated
  with check (created_by = (select auth.uid()));
create policy workspaces_update on public.workspaces for update to authenticated
  using (public.has_workspace_role(id, 'admin'))
  with check (public.has_workspace_role(id, 'admin'));

-- workspace_members (new members only arrive through accept_invitation)
create policy members_select on public.workspace_members for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy members_update on public.workspace_members for update to authenticated
  using (public.has_workspace_role(workspace_id, 'admin'))
  with check (public.has_workspace_role(workspace_id, 'admin'));
create policy members_delete on public.workspace_members for delete to authenticated
  using (public.has_workspace_role(workspace_id, 'admin') or user_id = (select auth.uid()));

-- invitations
create policy invitations_select on public.invitations for select to authenticated
  using (public.has_workspace_role(workspace_id, 'admin'));
create policy invitations_insert on public.invitations for insert to authenticated
  with check (public.has_workspace_role(workspace_id, 'admin')
              and invited_by = (select auth.uid())
              and role <> 'owner');
create policy invitations_update on public.invitations for update to authenticated
  using (public.has_workspace_role(workspace_id, 'admin'))
  with check (public.has_workspace_role(workspace_id, 'admin') and role <> 'owner');
create policy invitations_delete on public.invitations for delete to authenticated
  using (public.has_workspace_role(workspace_id, 'admin'));

-- subscriptions: members read, nobody writes from the browser
create policy subscriptions_select on public.subscriptions for select to authenticated
  using (public.is_workspace_member(workspace_id));

-- companies
create policy companies_select on public.companies for select to authenticated
  using (public.is_workspace_member(workspace_id)
         and (deleted_at is null or public.has_workspace_role(workspace_id, 'admin')));
create policy companies_insert on public.companies for insert to authenticated
  with check (public.is_workspace_member(workspace_id)
              and public.has_active_access(workspace_id)
              and created_by = (select auth.uid()));
create policy companies_update on public.companies for update to authenticated
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id) and public.has_active_access(workspace_id));
create policy companies_delete on public.companies for delete to authenticated
  using (public.has_workspace_role(workspace_id, 'admin'));

-- people
create policy people_select on public.people for select to authenticated
  using (public.is_workspace_member(workspace_id)
         and (deleted_at is null or public.has_workspace_role(workspace_id, 'admin')));
create policy people_insert on public.people for insert to authenticated
  with check (public.is_workspace_member(workspace_id)
              and public.has_active_access(workspace_id)
              and created_by = (select auth.uid()));
create policy people_update on public.people for update to authenticated
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id) and public.has_active_access(workspace_id));
create policy people_delete on public.people for delete to authenticated
  using (public.has_workspace_role(workspace_id, 'admin'));

-- custom fields: everyone reads, admins change
create policy cfd_select on public.custom_field_defs for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy cfd_insert on public.custom_field_defs for insert to authenticated
  with check (public.has_workspace_role(workspace_id, 'admin') and public.has_active_access(workspace_id));
create policy cfd_update on public.custom_field_defs for update to authenticated
  using (public.has_workspace_role(workspace_id, 'admin'))
  with check (public.has_workspace_role(workspace_id, 'admin'));
create policy cfd_delete on public.custom_field_defs for delete to authenticated
  using (public.has_workspace_role(workspace_id, 'admin'));

-- pipelines
create policy pipelines_select on public.pipelines for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy pipelines_insert on public.pipelines for insert to authenticated
  with check (public.has_workspace_role(workspace_id, 'admin') and public.has_active_access(workspace_id));
create policy pipelines_update on public.pipelines for update to authenticated
  using (public.has_workspace_role(workspace_id, 'admin'))
  with check (public.has_workspace_role(workspace_id, 'admin'));
create policy pipelines_delete on public.pipelines for delete to authenticated
  using (public.has_workspace_role(workspace_id, 'admin'));

-- stages
create policy stages_select on public.stages for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy stages_insert on public.stages for insert to authenticated
  with check (public.has_workspace_role(workspace_id, 'admin') and public.has_active_access(workspace_id));
create policy stages_update on public.stages for update to authenticated
  using (public.has_workspace_role(workspace_id, 'admin'))
  with check (public.has_workspace_role(workspace_id, 'admin'));
create policy stages_delete on public.stages for delete to authenticated
  using (public.has_workspace_role(workspace_id, 'admin'));

-- deals
create policy deals_select on public.deals for select to authenticated
  using (public.is_workspace_member(workspace_id)
         and (deleted_at is null or public.has_workspace_role(workspace_id, 'admin')));
create policy deals_insert on public.deals for insert to authenticated
  with check (public.is_workspace_member(workspace_id)
              and public.has_active_access(workspace_id)
              and created_by = (select auth.uid()));
create policy deals_update on public.deals for update to authenticated
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id) and public.has_active_access(workspace_id));
create policy deals_delete on public.deals for delete to authenticated
  using (public.has_workspace_role(workspace_id, 'admin'));

-- telephony settings: members read the non-secret ids, edge functions write
create policy telephony_select on public.workspace_telephony for select to authenticated
  using (public.is_workspace_member(workspace_id));

-- phone numbers: members read, admins assign. Buying and releasing go
-- through the buy-number edge function (secret key).
create policy numbers_select on public.phone_numbers for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy numbers_update on public.phone_numbers for update to authenticated
  using (public.has_workspace_role(workspace_id, 'admin'))
  with check (public.has_workspace_role(workspace_id, 'admin'));

-- calls: everyone in the workspace sees the call log. You can wrap up
-- (disposition, notes) your own calls; admins can edit any.
create policy calls_select on public.calls for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy calls_update on public.calls for update to authenticated
  using (public.is_workspace_member(workspace_id)
         and (user_id = (select auth.uid()) or public.has_workspace_role(workspace_id, 'admin')))
  with check (public.is_workspace_member(workspace_id)
              and (user_id = (select auth.uid()) or public.has_workspace_role(workspace_id, 'admin')));

-- recordings: only the rep on the call, or an admin
create policy recordings_select on public.recordings for select to authenticated
  using (
    public.has_workspace_role(workspace_id, 'admin')
    or exists (
      select 1 from public.calls c
      where c.id = recordings.call_id
        and c.workspace_id = recordings.workspace_id
        and c.user_id = (select auth.uid())
    )
  );

-- activities
create policy activities_select on public.activities for select to authenticated
  using (public.is_workspace_member(workspace_id) and deleted_at is null);
create policy activities_insert on public.activities for insert to authenticated
  with check (public.is_workspace_member(workspace_id)
              and public.has_active_access(workspace_id)
              and actor_id = (select auth.uid())
              and type in ('note', 'email', 'call', 'meeting'));
create policy activities_update on public.activities for update to authenticated
  using (public.is_workspace_member(workspace_id)
         and (actor_id = (select auth.uid()) or public.has_workspace_role(workspace_id, 'admin')))
  with check (public.is_workspace_member(workspace_id)
              and (actor_id = (select auth.uid()) or public.has_workspace_role(workspace_id, 'admin')));
create policy activities_delete on public.activities for delete to authenticated
  using (public.has_workspace_role(workspace_id, 'admin')
         or (actor_id = (select auth.uid()) and public.is_workspace_member(workspace_id)));

-- tasks
create policy tasks_select on public.tasks for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy tasks_insert on public.tasks for insert to authenticated
  with check (public.is_workspace_member(workspace_id)
              and public.has_active_access(workspace_id)
              and created_by = (select auth.uid()));
create policy tasks_update on public.tasks for update to authenticated
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));
create policy tasks_delete on public.tasks for delete to authenticated
  using (public.is_workspace_member(workspace_id)
         and (created_by = (select auth.uid()) or public.has_workspace_role(workspace_id, 'admin')));

-- imports and exports: admins only (bulk data is sensitive)
create policy imports_select on public.import_jobs for select to authenticated
  using (public.has_workspace_role(workspace_id, 'admin'));
create policy imports_insert on public.import_jobs for insert to authenticated
  with check (public.has_workspace_role(workspace_id, 'admin')
              and public.has_active_access(workspace_id)
              and created_by = (select auth.uid())
              and status = 'queued');
create policy imports_update on public.import_jobs for update to authenticated
  using (public.has_workspace_role(workspace_id, 'admin') and status = 'queued')
  with check (public.has_workspace_role(workspace_id, 'admin') and status in ('queued', 'cancelled'));

create policy exports_select on public.export_jobs for select to authenticated
  using (public.has_workspace_role(workspace_id, 'admin'));
create policy exports_insert on public.export_jobs for insert to authenticated
  with check (public.has_workspace_role(workspace_id, 'admin')
              and created_by = (select auth.uid())
              and status = 'queued');

-- audit log: admins read, nobody edits (triggers write it)
create policy audit_select on public.audit_log for select to authenticated
  using (public.has_workspace_role(workspace_id, 'admin'));

-- email log: you see emails sent to you; admins see the workspace's
create policy email_log_select on public.email_log for select to authenticated
  using (user_id = (select auth.uid())
         or (workspace_id is not null and public.has_workspace_role(workspace_id, 'admin')));

-- usage ledger: members read (the meters), only edge functions write.
-- api_rate_limits has no policies at all: secret key only.
create policy usage_select on public.usage_ledger for select to authenticated
  using (public.is_workspace_member(workspace_id));

-- ---------------------------------------------------------------------
-- 15. VIEWS FOR THE KANBAN HEADERS AND ANALYTICS
-- ELI5: a view is a saved query that looks like a table. security_invoker
-- means it runs as the person asking, so RLS still applies and nobody
-- sees another workspace's totals.
-- ---------------------------------------------------------------------
create view public.pipeline_stage_totals with (security_invoker = true) as
select
  s.workspace_id,
  s.pipeline_id,
  s.id as stage_id,
  s.name as stage_name,
  s.position,
  s.colour,
  s.kind,
  s.win_probability,
  p.currency,
  count(d.id) as deal_count,
  coalesce(sum(d.value_cents), 0)::bigint as value_cents,
  coalesce(sum(d.value_cents * s.win_probability / 100.0), 0)::bigint as weighted_cents
from public.stages s
join public.pipelines p on p.id = s.pipeline_id
left join public.deals d
  on d.stage_id = s.id and d.deleted_at is null and d.currency = p.currency
group by s.id, p.currency;

create view public.pipeline_forecast with (security_invoker = true) as
select
  d.workspace_id,
  d.pipeline_id,
  d.currency,
  date_trunc('month', coalesce(d.expected_close_date::timestamptz, now()))::date as month,
  count(*) as open_deals,
  sum(d.value_cents)::bigint as value_cents,
  sum(d.value_cents * s.win_probability / 100.0)::bigint as weighted_cents
from public.deals d
join public.stages s on s.id = d.stage_id
where d.status = 'open' and d.deleted_at is null
group by 1, 2, 3, 4;

create view public.revenue_closed_monthly with (security_invoker = true) as
select
  d.workspace_id,
  d.pipeline_id,
  d.currency,
  date_trunc('month', d.closed_at)::date as month,
  count(*) as deals_won,
  sum(d.value_cents)::bigint as value_cents
from public.deals d
where d.status = 'won' and d.deleted_at is null and d.closed_at is not null
group by 1, 2, 3, 4;

create view public.pipeline_win_rates with (security_invoker = true) as
select
  d.workspace_id,
  d.pipeline_id,
  count(*) filter (where d.status = 'won') as won,
  count(*) filter (where d.status = 'lost') as lost,
  round(100.0 * count(*) filter (where d.status = 'won')
        / nullif(count(*) filter (where d.status in ('won', 'lost')), 0), 1) as win_rate_pct,
  round((avg(extract(epoch from (d.closed_at - d.created_at)) / 86400.0)
        filter (where d.status = 'won'))::numeric, 1) as avg_cycle_days
from public.deals d
where d.deleted_at is null
  and d.closed_at >= now() - interval '90 days'
group by 1, 2;

create view public.rep_call_stats_daily with (security_invoker = true) as
select
  c.workspace_id,
  c.user_id,
  date_trunc('day', c.started_at)::date as day,
  count(*) as calls,
  count(*) filter (where c.direction = 'outbound') as outbound,
  count(*) filter (where c.direction = 'inbound') as inbound,
  count(*) filter (where c.answered_at is not null) as connected,
  count(*) filter (where c.disposition = 'meeting_booked') as meetings,
  coalesce(sum(c.duration_seconds), 0)::bigint as talk_seconds
from public.calls c
group by 1, 2, 3;

-- custom_field_values: one row per (record, field) with its value.
-- ELI5: values are stored inside each record's "custom" jsonb column (fast
-- to read with the record, no joins). This view unfolds them into rows so
-- filters, exports and reports can treat them like a normal table.
create view public.custom_field_values with (security_invoker = true) as
select p.workspace_id, 'person'::public.record_entity as entity, p.id as record_id,
       f.id as field_id, f.key, f.label, f.field_type, p.custom -> f.key as value
from public.people p
join public.custom_field_defs f
  on f.workspace_id = p.workspace_id and f.entity = 'person' and f.archived_at is null
where p.deleted_at is null and p.custom ? f.key
union all
select c.workspace_id, 'company'::public.record_entity, c.id,
       f.id, f.key, f.label, f.field_type, c.custom -> f.key
from public.companies c
join public.custom_field_defs f
  on f.workspace_id = c.workspace_id and f.entity = 'company' and f.archived_at is null
where c.deleted_at is null and c.custom ? f.key
union all
select d.workspace_id, 'deal'::public.record_entity, d.id,
       f.id, f.key, f.label, f.field_type, d.custom -> f.key
from public.deals d
join public.custom_field_defs f
  on f.workspace_id = d.workspace_id and f.entity = 'deal' and f.archived_at is null
where d.deleted_at is null and d.custom ? f.key;

-- ---------------------------------------------------------------------
-- 15b. HOUSEKEEPING (called daily by pg_cron, see PRD section 15)
-- ELI5: soft-deleted things wait 30 days in a bin so a mistake can be
-- undone, then this function empties the bin for good. It returns the
-- storage paths the cron edge function must also delete from Storage.
-- ---------------------------------------------------------------------
create or replace function public.purge_expired()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ws uuid[];
  v_people int;
  v_companies int;
  v_deals int;
begin
  select coalesce(array_agg(id), '{}') into v_ws
  from public.workspaces where deleted_at < now() - interval '30 days';

  delete from public.deals where deleted_at < now() - interval '30 days';
  get diagnostics v_deals = row_count;
  delete from public.people where deleted_at < now() - interval '30 days';
  get diagnostics v_people = row_count;
  delete from public.companies where deleted_at < now() - interval '30 days';
  get diagnostics v_companies = row_count;

  delete from public.api_rate_limits where window_start < now() - interval '2 days';
  update public.invitations set revoked_at = now()
  where accepted_at is null and revoked_at is null and expires_at < now() - interval '30 days';

  delete from public.workspaces where id = any (v_ws);

  return jsonb_build_object(
    'purged_workspaces', v_ws,
    'people', v_people, 'companies', v_companies, 'deals', v_deals,
    'expired_exports', coalesce((
      select jsonb_agg(e.file_path) from public.export_jobs e
      where e.expires_at < now() and e.file_path is not null
    ), '[]'::jsonb),
    'old_recordings', coalesce((
      select jsonb_agg(r.storage_path) from public.recordings r
      where r.status = 'stored' and r.created_at < now() - interval '365 days'
    ), '[]'::jsonb)
  );
end;
$$;
revoke execute on function public.purge_expired() from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- 16. STORAGE BUCKETS (all private)
-- ELI5: files are stored as <workspace_id>/<something>/<file>. The
-- policies read that first folder and check you are a member. Recordings
-- are <workspace_id>/<call_id>/<recording_sid>.mp3 so we can also check
-- the call was yours. Edge functions upload with the secret key.
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('recordings', 'recordings', false, 104857600, array['audio/mpeg', 'audio/wav', 'audio/x-wav']),
  ('imports', 'imports', false, 26214400, array['text/csv', 'application/vnd.ms-excel', 'text/plain']),
  ('exports', 'exports', false, 209715200, array['text/csv', 'application/zip'])
on conflict (id) do nothing;

create or replace function public.can_access_recording(p_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    public.has_workspace_role(public.path_segment_uuid(p_name, 1), 'admin')
    or exists (
      select 1 from public.calls c
      where c.id = public.path_segment_uuid(p_name, 2)
        and c.workspace_id = public.path_segment_uuid(p_name, 1)
        and c.user_id = (select auth.uid())
    );
$$;

create policy recordings_read on storage.objects for select to authenticated
  using (bucket_id = 'recordings' and public.can_access_recording(name));

create policy imports_read on storage.objects for select to authenticated
  using (bucket_id = 'imports'
         and public.has_workspace_role(public.path_segment_uuid(name, 1), 'admin'));
create policy imports_upload on storage.objects for insert to authenticated
  with check (bucket_id = 'imports'
              and public.has_workspace_role(public.path_segment_uuid(name, 1), 'admin')
              and public.has_active_access(public.path_segment_uuid(name, 1)));
create policy imports_delete on storage.objects for delete to authenticated
  using (bucket_id = 'imports'
         and public.has_workspace_role(public.path_segment_uuid(name, 1), 'admin'));

create policy exports_read on storage.objects for select to authenticated
  using (bucket_id = 'exports'
         and public.has_workspace_role(public.path_segment_uuid(name, 1), 'admin'));

-- ---------------------------------------------------------------------
-- 17. REALTIME
-- ELI5: these tables push changes to open browsers, so a teammate's
-- dragged deal, a live import progress bar and a ringing call update
-- without a refresh. Realtime still respects RLS.
-- ---------------------------------------------------------------------
alter publication supabase_realtime add table public.deals;
alter publication supabase_realtime add table public.calls;
alter publication supabase_realtime add table public.import_jobs;
alter publication supabase_realtime add table public.export_jobs;
alter publication supabase_realtime add table public.activities;

alter publication supabase_realtime add table public.recordings;

-- Done. Check: Table Editor shows 25 tables, each with "RLS enabled".
-- Then run: select public.plan_limits(id) from public.workspaces limit 1;
-- (empty until you create a workspace in the app, that is fine).
`
