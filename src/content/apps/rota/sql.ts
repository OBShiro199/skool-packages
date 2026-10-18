// Rota single migration, pasted into the Supabase SQL editor once on a fresh project.
// Tested on Postgres 16 with Supabase auth/storage stubs (Oct 2026).

export const sql = `-- =====================================================================
-- Rota: full database migration
-- Paste this whole file into Supabase > SQL Editor > New query > Run.
-- Run it ONCE on a fresh project. Order: extensions, enums, tables,
-- helper functions, access and limit functions, rota functions,
-- worker functions, guard triggers, RLS policies, storage, realtime,
-- schedules (commented out, run later).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. EXTENSIONS
-- ELI5: extensions are add-ons for the database. pgcrypto makes secure
-- random invite tokens and hashes them. btree_gist lets the database
-- refuse two published shifts for the same person at the same time.
-- ---------------------------------------------------------------------
create extension if not exists pgcrypto with schema extensions;
create extension if not exists btree_gist with schema extensions;

-- ---------------------------------------------------------------------
-- 1. ENUMS
-- ELI5: an enum is a fixed list of allowed words for a column. A shift
-- can be 'draft' or 'published', never 'banana'.
-- ---------------------------------------------------------------------
create type public.member_role as enum ('owner', 'manager', 'staff');
create type public.staff_status as enum ('invited', 'active', 'archived');
create type public.availability_kind as enum ('available', 'preferred', 'unavailable');
create type public.time_off_status as enum ('pending', 'approved', 'declined', 'cancelled');
create type public.week_status as enum ('draft', 'published');
create type public.shift_status as enum ('draft', 'published', 'cancelled');
create type public.shift_source as enum ('manual', 'template', 'copy', 'ai');
create type public.swap_kind as enum ('swap', 'cover');
create type public.swap_status as enum ('pending_peer', 'pending_manager', 'approved', 'declined', 'cancelled', 'expired');
create type public.claim_status as enum ('pending', 'approved', 'declined', 'withdrawn');
create type public.time_entry_status as enum ('open', 'submitted', 'approved', 'rejected');
create type public.geofence_mode as enum ('off', 'flag', 'require');
create type public.draft_status as enum ('queued', 'running', 'ready', 'applied', 'discarded', 'failed');
create type public.job_kind as enum ('draft_rota');
create type public.job_status as enum ('queued', 'running', 'done', 'dead');
create type public.notif_channel as enum ('sms', 'email');
create type public.notif_kind as enum ('invite', 'rota_published', 'shift_changed', 'shift_cancelled',
  'shift_reminder', 'open_shift', 'swap_request', 'swap_decision', 'claim_decision',
  'time_off_decision', 'cover_needed', 'draft_ready');
create type public.notif_status as enum ('queued', 'sending', 'sent', 'delivered', 'failed', 'skipped');
create type public.usage_kind as enum ('sms_segments', 'ai_drafts', 'emails');
create type public.role_hue as enum ('blue', 'teal', 'green', 'amber', 'coral', 'pink', 'violet', 'grey');

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
-- next to it, made automatically the moment someone signs up. Managers
-- and staff both get one.
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
-- 4. WORKSPACES (the business), MEMBERS, LOCATIONS
-- ELI5: a workspace is the business (one cafe group, one gym brand).
-- Locations are its sites. Members are logins: the owner pays, managers
-- run one or more locations, staff see their own shifts.
-- ---------------------------------------------------------------------
create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 80),
  owner_id uuid not null references auth.users (id) on delete cascade,
  country char(2) not null default 'GB' check (country ~ '^[A-Z]{2}$'),
  currency char(3) not null default 'GBP' check (currency ~ '^[A-Z]{3}$'),
  sms_sender_id text not null default 'Rota'
    check (sms_sender_id ~ '^[A-Za-z0-9 ]{3,11}$' and sms_sender_id ~ '[A-Za-z]'),
  overtime_hours_week numeric(5,2) not null default 48 check (overtime_hours_week between 1 and 100),
  min_rest_hours numeric(4,2) not null default 11 check (min_rest_hours between 0 and 24),
  clock_in_early_minutes integer not null default 15 check (clock_in_early_minutes between 0 and 120),
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
  role public.member_role not null default 'staff',
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);
create index workspace_members_user_idx on public.workspace_members (user_id);

create table public.locations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  name text not null check (char_length(name) between 2 and 80),
  timezone text not null default 'Europe/London',
  address text not null default '',
  lat double precision check (lat between -90 and 90),
  lng double precision check (lng between -180 and 180),
  geofence_mode public.geofence_mode not null default 'off',
  geofence_radius_m integer not null default 150 check (geofence_radius_m between 50 and 2000),
  weekly_budget_cents integer check (weekly_budget_cents >= 0),
  opening_hours jsonb not null default '[]'::jsonb,
  auto_approve_claims boolean not null default false,   -- first eligible open-shift claim is approved
  swaps_need_approval boolean not null default true,    -- false: peer-accepted swaps with no conflicts go straight through
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (geofence_mode = 'off' or (lat is not null and lng is not null))
);
create index locations_ws_idx on public.locations (workspace_id);
create trigger locations_updated_at before update on public.locations
  for each row execute function public.set_updated_at();

-- Which managers run which locations. Owners run every location.
create table public.location_managers (
  location_id uuid not null references public.locations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (location_id, user_id)
);
create index location_managers_user_idx on public.location_managers (user_id);
create index location_managers_ws_idx on public.location_managers (workspace_id);

-- ---------------------------------------------------------------------
-- 5. MEMBERSHIP HELPERS (used by every policy below)
-- ELI5: these are the bouncers. "Is this person in this business?",
-- "Is this person an owner or manager here?", "Do they run this
-- location?". security definer lets them read the members table without
-- tripping over its own RLS. search_path = '' stops anyone swapping in
-- a fake table with the same name.
-- ---------------------------------------------------------------------
create or replace function public.is_workspace_member(ws uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.workspace_members m
    where m.workspace_id = ws and m.user_id = (select auth.uid())
  );
$$;

create or replace function public.has_workspace_role(ws uuid, roles public.member_role[])
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.workspace_members m
    where m.workspace_id = ws and m.user_id = (select auth.uid()) and m.role = any (roles)
  );
$$;

-- Owner of the workspace, or a manager listed for this location.
create or replace function public.can_manage_location(loc uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.locations l
    join public.workspace_members m on m.workspace_id = l.workspace_id
    where l.id = loc and m.user_id = (select auth.uid())
      and (m.role = 'owner'
        or (m.role = 'manager' and exists (
          select 1 from public.location_managers lm
          where lm.location_id = l.id and lm.user_id = m.user_id)))
  );
$$;

-- Same check from a Storage path folder (text). Never casts, so a junk
-- folder name returns false instead of an error.
create or replace function public.is_workspace_manager_text(ws text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.workspace_members m
    where m.workspace_id::text = ws and m.user_id = (select auth.uid())
      and m.role in ('owner', 'manager')
  );
$$;

-- ---------------------------------------------------------------------
-- 6. JOB ROLES AND STAFF
-- ELI5: job roles are "Barista", "Chef", "PT coach". Staff are the
-- people on the rota. A staff row exists before the person has a login,
-- so a manager can rota someone who has not accepted the invite yet.
-- Pay and contact details live in staff_private, which only managers
-- (and the person themselves) can read.
-- ---------------------------------------------------------------------
create table public.job_roles (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  name text not null check (char_length(name) between 2 and 40),
  hue public.role_hue not null default 'blue',
  default_rate_cents integer not null default 0 check (default_rate_cents between 0 and 100000),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  unique (workspace_id, name)
);
create index job_roles_ws_idx on public.job_roles (workspace_id);

create table public.staff (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null,
  full_name text not null check (char_length(full_name) between 1 and 80),
  status public.staff_status not null default 'invited',
  contract_hours_week numeric(5,2) check (contract_hours_week between 0 and 80),
  max_hours_week numeric(5,2) check (max_hours_week between 0 and 100),
  invite_token_hash text unique,
  invite_expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, user_id)
);
create index staff_ws_idx on public.staff (workspace_id);
create index staff_user_idx on public.staff (user_id);
create trigger staff_updated_at before update on public.staff
  for each row execute function public.set_updated_at();

create table public.staff_private (
  staff_id uuid primary key references public.staff (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  email text check (email is null or position('@' in email) > 1),
  phone_e164 text check (phone_e164 is null or phone_e164 ~ '^[+][1-9][0-9]{6,14}$'),
  sms_opt_in boolean not null default false,
  sms_opt_in_at timestamptz,
  sms_opted_out_at timestamptz,
  email_opt_out boolean not null default false,
  hourly_rate_cents integer check (hourly_rate_cents between 0 and 100000),
  payroll_id text check (char_length(payroll_id) <= 40),
  manager_notes text not null default '' check (char_length(manager_notes) <= 1000),
  updated_at timestamptz not null default now()
);
create index staff_private_ws_idx on public.staff_private (workspace_id);
create index staff_private_phone_idx on public.staff_private (phone_e164);
create trigger staff_private_updated_at before update on public.staff_private
  for each row execute function public.set_updated_at();

create table public.staff_locations (
  staff_id uuid not null references public.staff (id) on delete cascade,
  location_id uuid not null references public.locations (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  primary key (staff_id, location_id)
);
create index staff_locations_location_idx on public.staff_locations (location_id);
create index staff_locations_ws_idx on public.staff_locations (workspace_id);

create table public.staff_roles (
  staff_id uuid not null references public.staff (id) on delete cascade,
  role_id uuid not null references public.job_roles (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  primary key (staff_id, role_id)
);
create index staff_roles_role_idx on public.staff_roles (role_id);
create index staff_roles_ws_idx on public.staff_roles (workspace_id);

-- Helpers that need the staff table.
-- my_staff_id: the staff row for the logged-in person in this workspace.
create or replace function public.my_staff_id(ws uuid)
returns uuid language sql stable security definer set search_path = '' as $$
  select s.id from public.staff s
  where s.workspace_id = ws and s.user_id = (select auth.uid()) and s.status = 'active';
$$;

-- Is the logged-in person on the staff list of this location?
create or replace function public.is_location_staff(loc uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.staff_locations sl
    join public.staff s on s.id = sl.staff_id
    where sl.location_id = loc and s.user_id = (select auth.uid()) and s.status = 'active'
  );
$$;

-- Can the logged-in person manage this staff member? (owner, or a
-- manager of any location the staff member works at)
create or replace function public.can_manage_staff(p_staff uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.staff s
    join public.workspace_members m on m.workspace_id = s.workspace_id
    where s.id = p_staff and m.user_id = (select auth.uid())
      and (m.role = 'owner'
        or (m.role = 'manager' and (
          exists (select 1 from public.staff_locations sl
                  join public.location_managers lm on lm.location_id = sl.location_id
                  where sl.staff_id = s.id and lm.user_id = m.user_id)
          or not exists (select 1 from public.staff_locations sl2 where sl2.staff_id = s.id))))
  );
$$;

create or replace function public.is_self_staff(p_staff uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.staff s where s.id = p_staff and s.user_id = (select auth.uid())
  );
$$;

-- ---------------------------------------------------------------------
-- 7. AVAILABILITY AND TIME OFF
-- ELI5: availability is the weekly pattern ("Mondays 9 to 5 yes,
-- Sundays never"). Time off is a one-off request with dates that a
-- manager approves.
-- ---------------------------------------------------------------------
create table public.availability_rules (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references public.staff (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  weekday smallint not null check (weekday between 1 and 7),  -- 1 = Monday, ISO
  start_time time not null,
  end_time time not null,
  kind public.availability_kind not null default 'available',
  effective_from date not null default current_date,
  effective_to date,
  created_at timestamptz not null default now(),
  check (end_time > start_time or end_time = '00:00'),
  check (effective_to is null or effective_to >= effective_from)
);
create index availability_rules_staff_idx on public.availability_rules (staff_id, weekday);
create index availability_rules_ws_idx on public.availability_rules (workspace_id);

create table public.time_off (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references public.staff (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  starts_on date not null,
  ends_on date not null,
  reason text not null default '' check (char_length(reason) <= 300),
  status public.time_off_status not null default 'pending',
  decided_by uuid references auth.users (id) on delete set null,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_on >= starts_on and ends_on - starts_on <= 60)
);
create index time_off_staff_idx on public.time_off (staff_id, starts_on);
create index time_off_ws_idx on public.time_off (workspace_id, status);
create index time_off_decided_by_idx on public.time_off (decided_by);
create trigger time_off_updated_at before update on public.time_off
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- 8. TEMPLATES, ROTA WEEKS AND SHIFTS
-- ELI5: a template is "a normal week" you can stamp onto any week. A
-- rota week is one location's Monday to Sunday. Shifts live inside it.
-- A shift with no staff_id is an open shift anyone eligible can claim.
-- ---------------------------------------------------------------------
create table public.rota_templates (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  location_id uuid not null references public.locations (id) on delete cascade,
  name text not null check (char_length(name) between 2 and 60),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index rota_templates_location_idx on public.rota_templates (location_id);
create index rota_templates_ws_idx on public.rota_templates (workspace_id);
create index rota_templates_created_by_idx on public.rota_templates (created_by);
create trigger rota_templates_updated_at before update on public.rota_templates
  for each row execute function public.set_updated_at();

create table public.template_shifts (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.rota_templates (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  location_id uuid not null references public.locations (id) on delete cascade,
  weekday smallint not null check (weekday between 1 and 7),
  start_time time not null,
  end_time time not null,          -- earlier than start_time means it ends next day
  break_minutes integer not null default 0 check (break_minutes between 0 and 240),
  role_id uuid not null references public.job_roles (id) on delete cascade,
  staff_id uuid references public.staff (id) on delete set null,
  headcount smallint not null default 1 check (headcount between 1 and 20)
);
create index template_shifts_template_idx on public.template_shifts (template_id);
create index template_shifts_ws_idx on public.template_shifts (workspace_id);
create index template_shifts_location_idx on public.template_shifts (location_id);
create index template_shifts_role_idx on public.template_shifts (role_id);
create index template_shifts_staff_idx on public.template_shifts (staff_id);

create table public.rota_weeks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  location_id uuid not null references public.locations (id) on delete cascade,
  week_start date not null check (extract(isodow from week_start) = 1),
  status public.week_status not null default 'draft',
  publish_version integer not null default 0,
  published_at timestamptz,
  published_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (location_id, week_start)
);
create index rota_weeks_ws_idx on public.rota_weeks (workspace_id);
create index rota_weeks_published_by_idx on public.rota_weeks (published_by);
create trigger rota_weeks_updated_at before update on public.rota_weeks
  for each row execute function public.set_updated_at();

create table public.shifts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  location_id uuid not null references public.locations (id) on delete cascade,
  week_id uuid not null references public.rota_weeks (id) on delete cascade,
  staff_id uuid references public.staff (id) on delete set null,
  role_id uuid not null references public.job_roles (id) on delete restrict,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  break_minutes integer not null default 0 check (break_minutes between 0 and 240),
  notes text not null default '' check (char_length(notes) <= 280),
  status public.shift_status not null default 'draft',
  source public.shift_source not null default 'manual',
  -- What staff last saw. publish_rota_week compares against this to send
  -- "your shift changed" messages only for real changes.
  published_snapshot jsonb,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at and ends_at - starts_at <= interval '16 hours'),
  -- The database itself refuses two published shifts for one person that overlap.
  constraint shifts_no_double_booking exclude using gist (
    staff_id with =, tstzrange(starts_at, ends_at) with &&
  ) where (status = 'published' and staff_id is not null)
);
create index shifts_week_idx on public.shifts (week_id);
create index shifts_location_time_idx on public.shifts (location_id, starts_at);
create index shifts_staff_time_idx on public.shifts (staff_id, starts_at);
create index shifts_ws_idx on public.shifts (workspace_id);
create index shifts_role_idx on public.shifts (role_id);
create index shifts_created_by_idx on public.shifts (created_by);
create trigger shifts_updated_at before update on public.shifts
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- 9. SWAPS, COVER AND OPEN SHIFT CLAIMS
-- ELI5: a swap trades two shifts between two people. Cover hands your
-- shift to someone else (or to anyone, as an open shift). A claim is
-- "I'll take that open shift". A manager approves each one. These rows
-- are written only by the rt-swap edge function, so the rules always run.
-- ---------------------------------------------------------------------
create table public.swap_requests (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  location_id uuid not null references public.locations (id) on delete cascade,
  shift_id uuid not null references public.shifts (id) on delete cascade,
  from_staff_id uuid not null references public.staff (id) on delete cascade,
  kind public.swap_kind not null,
  to_staff_id uuid references public.staff (id) on delete cascade,
  to_shift_id uuid references public.shifts (id) on delete cascade,
  message text not null default '' check (char_length(message) <= 280),
  status public.swap_status not null default 'pending_peer',
  peer_responded_at timestamptz,
  decided_by uuid references auth.users (id) on delete set null,
  decided_at timestamptz,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (kind = 'cover' or (to_staff_id is not null and to_shift_id is not null))
);
create index swap_requests_shift_idx on public.swap_requests (shift_id);
create index swap_requests_to_shift_idx on public.swap_requests (to_shift_id);
create index swap_requests_from_idx on public.swap_requests (from_staff_id);
create index swap_requests_to_idx on public.swap_requests (to_staff_id);
create index swap_requests_location_idx on public.swap_requests (location_id, status);
create index swap_requests_ws_idx on public.swap_requests (workspace_id);
create index swap_requests_decided_by_idx on public.swap_requests (decided_by);
-- One live request per shift at a time.
create unique index swap_requests_one_open_idx on public.swap_requests (shift_id)
  where status in ('pending_peer', 'pending_manager');
create trigger swap_requests_updated_at before update on public.swap_requests
  for each row execute function public.set_updated_at();

create table public.open_shift_claims (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  shift_id uuid not null references public.shifts (id) on delete cascade,
  staff_id uuid not null references public.staff (id) on delete cascade,
  status public.claim_status not null default 'pending',
  decided_by uuid references auth.users (id) on delete set null,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  unique (shift_id, staff_id)
);
create index open_shift_claims_staff_idx on public.open_shift_claims (staff_id);
create index open_shift_claims_ws_idx on public.open_shift_claims (workspace_id);
create index open_shift_claims_decided_by_idx on public.open_shift_claims (decided_by);

-- ---------------------------------------------------------------------
-- 10. CLOCK-IN AND TIMESHEETS
-- ELI5: a time entry is one clock-in and clock-out. We save where the
-- phone said it was and how far that is from the venue, so a manager
-- can see "clocked in 40 m away" or "clocked in 3 km away".
-- Written only by the rt-clock edge function.
-- ---------------------------------------------------------------------
create table public.time_entries (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  location_id uuid not null references public.locations (id) on delete cascade,
  staff_id uuid not null references public.staff (id) on delete cascade,
  shift_id uuid references public.shifts (id) on delete set null,
  clock_in_at timestamptz not null,
  clock_out_at timestamptz,
  in_lat double precision, in_lng double precision, in_accuracy_m real, in_distance_m real,
  out_lat double precision, out_lng double precision, out_accuracy_m real, out_distance_m real,
  geofence_flag boolean not null default false,
  break_minutes integer not null default 0 check (break_minutes between 0 and 240),
  status public.time_entry_status not null default 'open',
  approved_by uuid references auth.users (id) on delete set null,
  approved_at timestamptz,
  manager_note text not null default '' check (char_length(manager_note) <= 280),
  idempotency_key text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (clock_out_at is null or clock_out_at > clock_in_at)
);
create index time_entries_staff_idx on public.time_entries (staff_id, clock_in_at desc);
create index time_entries_location_idx on public.time_entries (location_id, clock_in_at);
create index time_entries_shift_idx on public.time_entries (shift_id);
create index time_entries_ws_idx on public.time_entries (workspace_id);
create index time_entries_approved_by_idx on public.time_entries (approved_by);
-- Only one open clock-in per person.
create unique index time_entries_one_open_idx on public.time_entries (staff_id) where clock_out_at is null;
create trigger time_entries_updated_at before update on public.time_entries
  for each row execute function public.set_updated_at();

create table public.timesheet_exports (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  location_id uuid references public.locations (id) on delete cascade,
  period_start date not null,
  period_end date not null,
  storage_path text not null,
  row_count integer not null default 0,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  check (period_end >= period_start and period_end - period_start <= 62)
);
create index timesheet_exports_ws_idx on public.timesheet_exports (workspace_id, created_at desc);
create index timesheet_exports_location_idx on public.timesheet_exports (location_id);
create index timesheet_exports_created_by_idx on public.timesheet_exports (created_by);

-- ---------------------------------------------------------------------
-- 11. AI DRAFTS AND THE JOBS QUEUE
-- ELI5: when a manager clicks "Draft with Claude", we write a draft row
-- and a job. A background worker picks the job up, asks Claude, checks
-- the answer and saves it here. Nothing touches the real rota until the
-- manager clicks Apply.
-- ---------------------------------------------------------------------
create table public.ai_drafts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  location_id uuid not null references public.locations (id) on delete cascade,
  week_id uuid not null references public.rota_weeks (id) on delete cascade,
  status public.draft_status not null default 'queued',
  requested_by uuid references auth.users (id) on delete set null,
  instructions text not null default '' check (char_length(instructions) <= 500),
  result jsonb,               -- { shifts: [...], unfilled: [...], notes: [...] }
  warnings jsonb not null default '[]'::jsonb,
  cost_usd_micros bigint not null default 0,
  error text,
  applied_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index ai_drafts_week_idx on public.ai_drafts (week_id, created_at desc);
create index ai_drafts_location_idx on public.ai_drafts (location_id);
create index ai_drafts_ws_idx on public.ai_drafts (workspace_id);
create index ai_drafts_requested_by_idx on public.ai_drafts (requested_by);
create trigger ai_drafts_updated_at before update on public.ai_drafts
  for each row execute function public.set_updated_at();

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

-- ---------------------------------------------------------------------
-- 12. NOTIFICATIONS (SMS + EMAIL OUTBOX), USAGE LEDGER, RATE LIMITS
-- ELI5: every text and email is first written here as a to-do with a
-- "send after" time and a dedupe key, then the rt-notify worker sends
-- it. The dedupe key means the same reminder can never go out twice.
-- usage_ledger is the meter: every text, email and AI draft writes a
-- line so no business can send more than its plan allows.
-- ---------------------------------------------------------------------
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  location_id uuid references public.locations (id) on delete cascade,
  staff_id uuid references public.staff (id) on delete cascade,
  to_user_id uuid references auth.users (id) on delete cascade,
  shift_id uuid references public.shifts (id) on delete cascade,
  kind public.notif_kind not null,
  channel public.notif_channel not null,
  dedupe_key text not null unique,
  send_after timestamptz not null default now(),
  payload jsonb not null default '{}'::jsonb,
  status public.notif_status not null default 'queued',
  attempts integer not null default 0,
  provider_id text,
  segments integer,
  error_code text,
  error text,
  sent_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index notifications_due_idx on public.notifications (status, send_after);
create index notifications_ws_idx on public.notifications (workspace_id, created_at desc);
create index notifications_location_idx on public.notifications (location_id);
create index notifications_staff_idx on public.notifications (staff_id, created_at desc);
create index notifications_user_idx on public.notifications (to_user_id);
create index notifications_shift_idx on public.notifications (shift_id);
create index notifications_provider_idx on public.notifications (provider_id);
create trigger notifications_updated_at before update on public.notifications
  for each row execute function public.set_updated_at();

-- US/Canada STOP and START replies, kept per phone number.
create table public.sms_opt_events (
  id bigint generated always as identity primary key,
  phone_e164 text not null,
  kind text not null check (kind in ('stop', 'start', 'help')),
  provider_id text unique,
  received_at timestamptz not null default now()
);
create index sms_opt_events_phone_idx on public.sms_opt_events (phone_e164, received_at desc);

create table public.twilio_events (
  id text primary key,          -- MessageSid + ':' + MessageStatus
  received_at timestamptz not null default now()
);

create table public.usage_ledger (
  id bigint generated always as identity primary key,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  location_id uuid references public.locations (id) on delete set null,
  user_id uuid references auth.users (id) on delete set null,
  kind public.usage_kind not null,
  quantity numeric not null check (quantity >= 0),
  cost_usd_micros bigint not null default 0,
  ref_id uuid,
  idempotency_key text unique,
  created_at timestamptz not null default now()
);
create index usage_ledger_ws_month_idx on public.usage_ledger (workspace_id, kind, created_at);
create index usage_ledger_location_idx on public.usage_ledger (location_id);
create index usage_ledger_user_idx on public.usage_ledger (user_id);

create table public.email_log (
  id bigint generated always as identity primary key,
  workspace_id uuid references public.workspaces (id) on delete cascade,
  notification_id uuid references public.notifications (id) on delete set null,
  kind text not null,
  dedupe_key text unique,
  to_email text not null,
  resend_id text,
  status text not null default 'queued',
  created_at timestamptz not null default now()
);
create index email_log_ws_idx on public.email_log (workspace_id, created_at desc);
create index email_log_notification_idx on public.email_log (notification_id);

create table public.rate_limits (
  key text not null,
  window_start timestamptz not null,
  hits integer not null default 0,
  primary key (key, window_start)
);

-- ---------------------------------------------------------------------
-- 13. BILLING (written only by the Stripe webhook with the secret key)
-- ELI5: Stripe tells us who paid and for how many locations (the
-- quantity on the subscription). We copy that here. The browser can read
-- its own row but never write it, so nobody can fake "paid".
-- ---------------------------------------------------------------------
create table public.subscriptions (
  user_id uuid primary key references auth.users (id) on delete cascade,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  status text not null default 'incomplete',
  price_id text,
  quantity integer not null default 1 check (quantity >= 1),
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

-- Which Stripe price is which plan. After you create prices in Stripe,
-- run: insert into public.plan_prices values ('price_...', 'starter'), ...
create table public.plan_prices (
  price_id text primary key,
  plan text not null check (plan in ('starter', 'team', 'pro'))
);

-- Test-only limit overrides. No policies: only you, in the SQL editor.
create table public.workspace_limit_overrides (
  workspace_id uuid primary key references public.workspaces (id) on delete cascade,
  sms_per_location integer,
  drafts_per_location integer,
  staff_per_location integer,
  locations integer
);

-- ---------------------------------------------------------------------
-- 14. ACCESS AND LIMIT FUNCTIONS
-- ELI5: has_active_access is the paywall: the owner's trial or paid
-- plan keeps the whole business open, for managers and staff. plan_limits
-- returns the numbers from the PRD. usage_this_month adds up the meter.
-- ---------------------------------------------------------------------
create or replace function public.has_active_access(ws uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.workspaces w
    join public.subscriptions s on s.user_id = w.owner_id
    where w.id = ws and s.status in ('trialing', 'active')
  );
$$;

-- Limits are per location and pooled across the business.
-- Texts are set at the UK price. US and Canada texts cost about a fifth,
-- so those businesses get four times the allowance (sms_multiplier).
create or replace function public.plan_limits(ws uuid)
returns table (plan text, status text, locations integer, staff_per_location integer,
               sms_per_location integer, drafts_per_location integer, sms_multiplier integer,
               sms_total integer, drafts_total integer, geofence boolean, custom_sender boolean)
language plpgsql stable security definer set search_path = '' as $$
#variable_conflict use_column
declare
  v_plan text;
  v_status text;
  v_qty integer;
  v_country text;
  o record;
begin
  select coalesce(pp.plan, 'starter'), s.status, coalesce(s.quantity, 1), w.country
    into v_plan, v_status, v_qty, v_country
  from public.workspaces w
  left join public.subscriptions s on s.user_id = w.owner_id
  left join public.plan_prices pp on pp.price_id = s.price_id
  where w.id = ws;

  if v_plan is null then v_plan := 'starter'; end if;
  plan := v_plan; status := coalesce(v_status, 'none'); locations := greatest(coalesce(v_qty, 1), 1);
  sms_multiplier := case when v_country in ('US', 'CA') then 4 else 1 end;

  if v_plan = 'pro' then
    staff_per_location := 100; sms_per_location := 400; drafts_per_location := 12;
    geofence := true; custom_sender := true;
  elsif v_plan = 'team' then
    staff_per_location := 40; sms_per_location := 180; drafts_per_location := 10;
    geofence := true; custom_sender := false;
  else
    staff_per_location := 15; sms_per_location := 100; drafts_per_location := 6;
    geofence := false; custom_sender := false;
  end if;

  select * into o from public.workspace_limit_overrides where workspace_id = ws;
  if found then
    sms_per_location := coalesce(o.sms_per_location, sms_per_location);
    drafts_per_location := coalesce(o.drafts_per_location, drafts_per_location);
    staff_per_location := coalesce(o.staff_per_location, staff_per_location);
    locations := coalesce(o.locations, locations);
  end if;

  sms_total := sms_per_location * locations * sms_multiplier;
  drafts_total := drafts_per_location * locations;

  -- A 7 day trial is capped so a trial that never converts costs pennies.
  if v_status = 'trialing' then
    sms_total := least(sms_total, 30 * sms_multiplier);
    drafts_total := least(drafts_total, 2);
  end if;
  return next;
end;
$$;

create or replace function public.usage_this_month(ws uuid, k public.usage_kind)
returns numeric language sql stable security definer set search_path = '' as $$
  select coalesce(sum(quantity), 0) from public.usage_ledger
  where workspace_id = ws and kind = k and created_at >= date_trunc('month', now());
$$;

-- What the sidebar meter and the Billing page show.
create or replace function public.usage_summary(ws uuid)
returns table (plan text, status text, locations_paid integer, locations_used integer,
               sms_used numeric, sms_total integer, drafts_used numeric, drafts_total integer)
language sql stable security definer set search_path = '' as $$
  select l.plan, l.status, l.locations,
    (select count(*)::integer from public.locations x where x.workspace_id = ws and x.archived_at is null),
    public.usage_this_month(ws, 'sms_segments'), l.sms_total,
    public.usage_this_month(ws, 'ai_drafts'), l.drafts_total
  from public.plan_limits(ws) l
  where public.has_workspace_role(ws, array['owner', 'manager']::public.member_role[]);
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

-- ---------------------------------------------------------------------
-- 15. WORKSPACE, LOCATION AND STAFF FUNCTIONS (called from the app)
-- ELI5: creating a business, adding a location, inviting staff and
-- accepting an invite each happen inside the database in one step, so
-- plan limits and roles can never be skipped.
-- ---------------------------------------------------------------------
create or replace function public.create_workspace(p_name text, p_country text, p_currency text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_ws uuid;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  if exists (select 1 from public.workspaces where owner_id = v_uid) then
    raise exception 'already_owner';
  end if;
  insert into public.workspaces (name, owner_id, country, currency,
    overtime_hours_week, min_rest_hours)
  values (trim(p_name), v_uid, upper(p_country), upper(p_currency),
    case when upper(p_country) in ('US', 'CA') then 40 else 48 end,
    case when upper(p_country) in ('US', 'CA') then 8 else 11 end)
  returning id into v_ws;
  insert into public.workspace_members (workspace_id, user_id, role) values (v_ws, v_uid, 'owner');
  update public.profiles set current_workspace_id = v_ws where id = v_uid;
  return v_ws;
end;
$$;

create or replace function public.create_location(p_ws uuid, p_name text, p_timezone text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_loc uuid;
  v_used integer;
  v_paid integer;
begin
  if not public.has_workspace_role(p_ws, array['owner']::public.member_role[]) then
    raise exception 'forbidden';
  end if;
  select count(*) into v_used from public.locations where workspace_id = p_ws and archived_at is null;
  select locations into v_paid from public.plan_limits(p_ws);
  -- The first location is always allowed (onboarding, before checkout).
  if v_used >= 1 and v_used >= v_paid then
    raise exception 'location_limit' using hint = 'Add a location in Billing first.';
  end if;
  if not exists (select 1 from pg_catalog.pg_timezone_names where name = p_timezone) then
    raise exception 'bad_timezone';
  end if;
  insert into public.locations (workspace_id, name, timezone)
  values (p_ws, trim(p_name), p_timezone) returning id into v_loc;
  return v_loc;
end;
$$;

-- Creates the staff row, its private row and its links, and returns the
-- raw invite token once. Only the sha256 of the token is stored.
create or replace function public.invite_staff(p_ws uuid, p_full_name text, p_email text,
  p_phone text, p_location_ids uuid[], p_role_ids uuid[], p_hourly_rate_cents integer)
returns table (staff_id uuid, token text)
language plpgsql security definer set search_path = '' as $$
#variable_conflict use_column
declare
  v_staff uuid;
  v_token text := translate(encode(extensions.gen_random_bytes(32), 'base64'), '+/=', '-_');
  v_loc uuid;
  v_limit integer;
  v_count integer;
begin
  if not public.has_workspace_role(p_ws, array['owner', 'manager']::public.member_role[]) then
    raise exception 'forbidden';
  end if;
  if coalesce(array_length(p_location_ids, 1), 0) = 0 then raise exception 'location_required'; end if;
  select staff_per_location into v_limit from public.plan_limits(p_ws);
  foreach v_loc in array p_location_ids loop
    if not public.can_manage_location(v_loc) then raise exception 'forbidden_location'; end if;
    if not exists (select 1 from public.locations where id = v_loc and workspace_id = p_ws) then
      raise exception 'forbidden_location';
    end if;
    select count(*) into v_count from public.staff_locations sl
      join public.staff s on s.id = sl.staff_id
      where sl.location_id = v_loc and s.status <> 'archived';
    if v_count >= v_limit then
      raise exception 'staff_limit' using hint = 'This location is at its staff limit for your plan.';
    end if;
  end loop;

  insert into public.staff (workspace_id, full_name, status, invite_token_hash, invite_expires_at)
  values (p_ws, trim(p_full_name), 'invited',
    encode(extensions.digest(v_token, 'sha256'), 'hex'), now() + interval '14 days')
  returning id into v_staff;

  insert into public.staff_private (staff_id, workspace_id, email, phone_e164, hourly_rate_cents)
  values (v_staff, p_ws, nullif(lower(trim(p_email)), ''), nullif(p_phone, ''), p_hourly_rate_cents);

  insert into public.staff_locations (staff_id, location_id, workspace_id)
  select v_staff, unnest(p_location_ids), p_ws;

  insert into public.staff_roles (staff_id, role_id, workspace_id)
  select v_staff, r.id, p_ws from public.job_roles r
  where r.workspace_id = p_ws and r.id = any (coalesce(p_role_ids, array[]::uuid[]));

  staff_id := v_staff; token := v_token;
  return next;
end;
$$;

-- Makes a fresh token for an existing invited staff member (resend).
create or replace function public.reissue_staff_invite(p_staff uuid)
returns text language plpgsql security definer set search_path = '' as $$
declare
  v_token text := translate(encode(extensions.gen_random_bytes(32), 'base64'), '+/=', '-_');
begin
  if not public.can_manage_staff(p_staff) then raise exception 'forbidden'; end if;
  update public.staff set invite_token_hash = encode(extensions.digest(v_token, 'sha256'), 'hex'),
    invite_expires_at = now() + interval '14 days'
  where id = p_staff and status = 'invited';
  if not found then raise exception 'not_invited'; end if;
  return v_token;
end;
$$;

-- Called by the staff member after they sign up from the invite link.
create or replace function public.accept_staff_invite(p_token text, p_sms_opt_in boolean)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_staff public.staff;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  select * into v_staff from public.staff
  where invite_token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex')
    and status = 'invited' and invite_expires_at > now()
  for update;
  if not found then raise exception 'invite_invalid'; end if;
  if exists (select 1 from public.staff where workspace_id = v_staff.workspace_id and user_id = v_uid) then
    raise exception 'already_member';
  end if;

  update public.staff set user_id = v_uid, status = 'active', invite_token_hash = null,
    invite_expires_at = null where id = v_staff.id;
  update public.staff_private set
    sms_opt_in = coalesce(p_sms_opt_in, false) and phone_e164 is not null,
    sms_opt_in_at = case when p_sms_opt_in and phone_e164 is not null then now() end
  where staff_id = v_staff.id;
  insert into public.workspace_members (workspace_id, user_id, role)
  values (v_staff.workspace_id, v_uid, 'staff') on conflict do nothing;
  update public.profiles set current_workspace_id = v_staff.workspace_id,
    full_name = case when full_name = '' then v_staff.full_name else full_name end
  where id = v_uid;
  return v_staff.id;
end;
$$;

-- Staff edit their own phone, email and texting choice through this
-- function only. Changing the phone switches texting off until they opt
-- in again for the new number.
create or replace function public.update_my_contact(p_ws uuid, p_phone text, p_email text,
  p_sms_opt_in boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_staff uuid := public.my_staff_id(p_ws);
  v_old text;
begin
  if v_staff is null then raise exception 'forbidden'; end if;
  select phone_e164 into v_old from public.staff_private where staff_id = v_staff;
  update public.staff_private set
    phone_e164 = nullif(p_phone, ''),
    email = nullif(lower(trim(p_email)), ''),
    sms_opt_in = case when nullif(p_phone, '') is null then false
                      when v_old is distinct from nullif(p_phone, '') then coalesce(p_sms_opt_in, false)
                      else coalesce(p_sms_opt_in, sms_opt_in) end,
    sms_opt_in_at = case when coalesce(p_sms_opt_in, false) and nullif(p_phone, '') is not null
                      then now() else sms_opt_in_at end,
    sms_opted_out_at = case when not coalesce(p_sms_opt_in, true) then now() else sms_opted_out_at end
  where staff_id = v_staff;
end;
$$;

-- ---------------------------------------------------------------------
-- 16. ROTA FUNCTIONS: conflicts, labour cost, publish
-- ELI5: rota_conflicts lists every problem on a week (double booked,
-- outside availability, on holiday, not enough rest, over hours, wrong
-- role, nobody assigned). The builder shows them live and Publish
-- refuses hard problems. week_labour_cost adds up wages per day.
-- ---------------------------------------------------------------------
create or replace function public.shift_hours(s public.shifts)
returns numeric language sql immutable set search_path = '' as $$
  select round((extract(epoch from (s.ends_at - s.starts_at)) / 3600.0 - s.break_minutes / 60.0)::numeric, 2);
$$;

create or replace function public.rota_conflicts(p_week uuid)
returns table (shift_id uuid, staff_id uuid, kind text, severity text, detail text)
language plpgsql stable security definer set search_path = '' as $$
#variable_conflict use_column
declare
  v_week public.rota_weeks;
  v_ws public.workspaces;
  v_tz text;
begin
  select * into v_week from public.rota_weeks where id = p_week;
  if not found or not public.can_manage_location(v_week.location_id) then
    raise exception 'forbidden';
  end if;
  select * into v_ws from public.workspaces where id = v_week.workspace_id;
  select timezone into v_tz from public.locations where id = v_week.location_id;

  -- 1. Double booked: overlaps another live shift for the same person (any location).
  return query
  select a.id, a.staff_id, 'overlap', 'block',
    'Overlaps another shift at ' || to_char(b.starts_at at time zone v_tz, 'Dy HH24:MI')
  from public.shifts a
  join public.shifts b on b.staff_id = a.staff_id and b.id <> a.id and b.status <> 'cancelled'
    and tstzrange(a.starts_at, a.ends_at) && tstzrange(b.starts_at, b.ends_at)
  where a.week_id = p_week and a.status <> 'cancelled' and a.staff_id is not null;

  -- 2. Approved time off on that date.
  return query
  select s.id, s.staff_id, 'time_off', 'block', 'On approved time off'
  from public.shifts s
  join public.time_off t on t.staff_id = s.staff_id and t.status = 'approved'
    and (s.starts_at at time zone v_tz)::date between t.starts_on and t.ends_on
  where s.week_id = p_week and s.status <> 'cancelled';

  -- 3. Marked unavailable for that time, or outside every available window.
  return query
  select s.id, s.staff_id, 'availability', 'warn',
    case when exists (
      select 1 from public.availability_rules r
      where r.staff_id = s.staff_id and r.kind = 'unavailable'
        and r.weekday = extract(isodow from s.starts_at at time zone v_tz)
        and (s.starts_at at time zone v_tz)::date >= r.effective_from
        and (r.effective_to is null or (s.starts_at at time zone v_tz)::date <= r.effective_to)
        and (s.starts_at at time zone v_tz)::time < case when r.end_time = '00:00' then time '23:59:59' else r.end_time end
        and (s.ends_at at time zone v_tz)::time > r.start_time)
    then 'Marked unavailable at this time' else 'Outside their availability' end
  from public.shifts s
  where s.week_id = p_week and s.status <> 'cancelled' and s.staff_id is not null
    and (
      exists (
        select 1 from public.availability_rules r
        where r.staff_id = s.staff_id and r.kind = 'unavailable'
          and r.weekday = extract(isodow from s.starts_at at time zone v_tz)
          and (s.starts_at at time zone v_tz)::date >= r.effective_from
          and (r.effective_to is null or (s.starts_at at time zone v_tz)::date <= r.effective_to)
          and (s.starts_at at time zone v_tz)::time < case when r.end_time = '00:00' then time '23:59:59' else r.end_time end
          and (s.ends_at at time zone v_tz)::time > r.start_time)
      or (
        exists (select 1 from public.availability_rules r2
                where r2.staff_id = s.staff_id and r2.kind in ('available', 'preferred'))
        and not exists (
          select 1 from public.availability_rules r
          where r.staff_id = s.staff_id and r.kind in ('available', 'preferred')
            and r.weekday = extract(isodow from s.starts_at at time zone v_tz)
            and (s.starts_at at time zone v_tz)::date >= r.effective_from
            and (r.effective_to is null or (s.starts_at at time zone v_tz)::date <= r.effective_to)
            and (s.starts_at at time zone v_tz)::time >= r.start_time
            and ((s.ends_at at time zone v_tz)::time <= r.end_time or r.end_time = '00:00'))));

  -- 4. Less than the minimum rest between two shifts.
  return query
  select a.id, a.staff_id, 'rest', 'warn',
    'Only ' || round((extract(epoch from (a.starts_at - b.ends_at)) / 3600.0)::numeric, 1)
      || ' h rest after the previous shift'
  from public.shifts a
  join public.shifts b on b.staff_id = a.staff_id and b.id <> a.id and b.status <> 'cancelled'
    and b.ends_at <= a.starts_at
    and a.starts_at - b.ends_at < make_interval(mins => (v_ws.min_rest_hours * 60)::integer)
  where a.week_id = p_week and a.status <> 'cancelled' and a.staff_id is not null;

  -- 5. Weekly hours over the overtime line or the person's own maximum.
  return query
  select null::uuid, x.staff_id, 'hours', 'warn',
    x.hours || ' h this week (limit ' || x.lim || ' h)'
  from (
    select s.staff_id, sum(public.shift_hours(s)) as hours,
      least(v_ws.overtime_hours_week, coalesce(st.max_hours_week, v_ws.overtime_hours_week)) as lim
    from public.shifts s
    join public.staff st on st.id = s.staff_id
    where s.status <> 'cancelled' and s.staff_id is not null
      and s.starts_at >= (v_week.week_start::timestamp at time zone v_tz)
      and s.starts_at < ((v_week.week_start + 7)::timestamp at time zone v_tz)
      and s.staff_id in (select staff_id from public.shifts where week_id = p_week)
    group by s.staff_id, st.max_hours_week
  ) x
  where x.hours > x.lim;

  -- 6. The person does not hold the shift's role.
  return query
  select s.id, s.staff_id, 'role', 'warn', 'Not trained for this role'
  from public.shifts s
  where s.week_id = p_week and s.status <> 'cancelled' and s.staff_id is not null
    and not exists (select 1 from public.staff_roles sr where sr.staff_id = s.staff_id and sr.role_id = s.role_id);

  -- 7. Open shifts (nobody assigned) are fine to publish but worth seeing.
  return query
  select s.id, null::uuid, 'open', 'info', 'Open shift'
  from public.shifts s
  where s.week_id = p_week and s.status <> 'cancelled' and s.staff_id is null;
end;
$$;

-- Wage cost per day of the week, from each person's rate or the role's
-- default rate. Managers only.
create or replace function public.week_labour_cost(p_week uuid)
returns table (day date, hours numeric, cost_cents bigint, budget_cents integer)
language plpgsql stable security definer set search_path = '' as $$
#variable_conflict use_column
declare
  v_week public.rota_weeks;
  v_tz text;
  v_budget integer;
begin
  select * into v_week from public.rota_weeks where id = p_week;
  if not found or not public.can_manage_location(v_week.location_id) then
    raise exception 'forbidden';
  end if;
  select timezone, weekly_budget_cents into v_tz, v_budget from public.locations where id = v_week.location_id;
  return query
  select d.day::date,
    coalesce(sum(public.shift_hours(s)), 0),
    coalesce(sum(round(public.shift_hours(s) * coalesce(sp.hourly_rate_cents, r.default_rate_cents, 0)))::bigint, 0),
    case when v_budget is null then null else (v_budget / 7) end
  from generate_series(v_week.week_start, v_week.week_start + 6, interval '1 day') d(day)
  left join public.shifts s on s.week_id = p_week and s.status <> 'cancelled'
    and (s.starts_at at time zone v_tz)::date = d.day::date
  left join public.staff_private sp on sp.staff_id = s.staff_id
  left join public.job_roles r on r.id = s.role_id
  group by d.day
  order by d.day;
end;
$$;

-- Publish a week: lock in shift statuses, work out what changed since
-- the last publish, and queue one message per person (not per shift).
-- Called only by the rt-publish edge function (secret key).
create or replace function public.publish_rota_week(p_week uuid, p_user uuid)
returns table (staff_notified integer, shifts_published integer, version integer)
language plpgsql security definer set search_path = '' as $$
#variable_conflict use_column
declare
  v_week public.rota_weeks;
  v_version integer;
  v_count integer;
  v_people integer;
begin
  select * into v_week from public.rota_weeks where id = p_week for update;
  if not found then raise exception 'not_found'; end if;
  v_version := v_week.publish_version + 1;

  -- Who is affected, and how: new shifts, changed shifts, cancelled shifts.
  drop table if exists _changes;
  create temporary table _changes on commit drop as
  select s.id as shift_id, s.staff_id,
    case
      when s.status = 'cancelled' and coalesce((s.published_snapshot ->> 'cancelled')::boolean, false) then 'same'
      when s.status = 'cancelled' then 'cancelled'
      when s.published_snapshot is null then 'new'
      when s.published_snapshot ->> 'staff_id' is distinct from s.staff_id::text then 'reassigned'
      when (s.published_snapshot ->> 'starts_at')::timestamptz <> s.starts_at
        or (s.published_snapshot ->> 'ends_at')::timestamptz <> s.ends_at
        or (s.published_snapshot ->> 'role_id') <> s.role_id::text
        or (s.published_snapshot ->> 'break_minutes')::integer <> s.break_minutes then 'changed'
      else 'same'
    end as change,
    (s.published_snapshot ->> 'staff_id')::uuid as old_staff_id
  from public.shifts s
  where s.week_id = p_week and (s.status <> 'cancelled' or s.published_snapshot is not null);

  update public.shifts s set status = 'published',
    published_snapshot = jsonb_build_object('staff_id', s.staff_id, 'starts_at', s.starts_at,
      'ends_at', s.ends_at, 'role_id', s.role_id, 'break_minutes', s.break_minutes,
      'notes', s.notes, 'version', v_version)
  where s.week_id = p_week and s.status = 'draft';
  get diagnostics v_count = row_count;

  update public.shifts s set published_snapshot = jsonb_build_object('staff_id', s.staff_id,
      'starts_at', s.starts_at, 'ends_at', s.ends_at, 'role_id', s.role_id,
      'break_minutes', s.break_minutes, 'notes', s.notes, 'version', v_version)
  where s.week_id = p_week and s.status = 'published' and s.id in (select shift_id from _changes where change <> 'same');

  update public.shifts s set published_snapshot = s.published_snapshot || jsonb_build_object('cancelled', true)
  where s.week_id = p_week and s.status = 'cancelled' and s.published_snapshot is not null;

  update public.rota_weeks set status = 'published', publish_version = v_version,
    published_at = now(), published_by = p_user where id = p_week;

  -- One message per person per channel. First publish: "rota_published".
  -- Re-publish: "shift_changed" only for people whose shifts changed.
  drop table if exists _people;
  create temporary table _people on commit drop as
  select distinct x.staff_id from (
    select staff_id from _changes where change <> 'same' and staff_id is not null
    union select old_staff_id from _changes where change in ('reassigned', 'cancelled') and old_staff_id is not null
  ) x;

  insert into public.notifications (workspace_id, location_id, staff_id, kind, channel, dedupe_key, payload)
  select v_week.workspace_id, v_week.location_id, p.staff_id,
    case when v_version = 1 then 'rota_published'::public.notif_kind else 'shift_changed'::public.notif_kind end,
    ch.channel,
    'publish:' || p_week || ':' || v_version || ':' || p.staff_id || ':' || ch.channel,
    jsonb_build_object('week_id', p_week, 'week_start', v_week.week_start, 'version', v_version)
  from _people p
  join public.staff st on st.id = p.staff_id and st.status = 'active'
  join public.staff_private sp on sp.staff_id = p.staff_id
  cross join (values ('sms'::public.notif_channel), ('email'::public.notif_channel)) ch(channel)
  where (ch.channel = 'sms' and sp.sms_opt_in and sp.phone_e164 is not null)
     or (ch.channel = 'email' and sp.email is not null and not sp.email_opt_out)
  on conflict (dedupe_key) do nothing;

  -- New open shifts: tell eligible staff (right role, this location, active), email only.
  insert into public.notifications (workspace_id, location_id, staff_id, shift_id, kind, channel, dedupe_key, payload)
  select v_week.workspace_id, v_week.location_id, sr.staff_id, c.shift_id, 'open_shift', 'email',
    'open:' || c.shift_id || ':' || sr.staff_id, jsonb_build_object('week_id', p_week)
  from _changes c
  join public.shifts s on s.id = c.shift_id and s.staff_id is null and s.status = 'published'
  join public.staff_roles sr on sr.role_id = s.role_id
  join public.staff_locations sl on sl.staff_id = sr.staff_id and sl.location_id = s.location_id
  join public.staff st on st.id = sr.staff_id and st.status = 'active'
  join public.staff_private sp on sp.staff_id = sr.staff_id and sp.email is not null and not sp.email_opt_out
  where c.change = 'new'
  on conflict (dedupe_key) do nothing;

  select count(*) into v_people from _people;
  staff_notified := v_people; shifts_published := v_count; version := v_version;
  return next;
end;
$$;

-- Copy last week (or a template) into a draft week. Never overwrites
-- shifts that already exist in the target week.
create or replace function public.copy_week(p_from_week uuid, p_to_week uuid)
returns integer language plpgsql security definer set search_path = '' as $$
declare
  v_from public.rota_weeks;
  v_to public.rota_weeks;
  v_count integer;
begin
  select * into v_from from public.rota_weeks where id = p_from_week;
  select * into v_to from public.rota_weeks where id = p_to_week;
  if v_from.id is null or v_to.id is null or v_from.location_id <> v_to.location_id
     or not public.can_manage_location(v_to.location_id) then
    raise exception 'forbidden';
  end if;
  insert into public.shifts (workspace_id, location_id, week_id, staff_id, role_id, starts_at, ends_at,
    break_minutes, notes, status, source, created_by)
  select s.workspace_id, s.location_id, p_to_week, s.staff_id, s.role_id,
    s.starts_at + (v_to.week_start - v_from.week_start) * interval '1 day',
    s.ends_at + (v_to.week_start - v_from.week_start) * interval '1 day',
    s.break_minutes, s.notes, 'draft', 'copy', auth.uid()
  from public.shifts s
  where s.week_id = p_from_week and s.status <> 'cancelled';
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

create or replace function public.apply_template(p_template uuid, p_week uuid)
returns integer language plpgsql security definer set search_path = '' as $$
declare
  v_week public.rota_weeks;
  v_tz text;
  v_count integer;
begin
  select * into v_week from public.rota_weeks where id = p_week;
  if not found or not public.can_manage_location(v_week.location_id)
     or not exists (select 1 from public.rota_templates t where t.id = p_template and t.location_id = v_week.location_id) then
    raise exception 'forbidden';
  end if;
  select timezone into v_tz from public.locations where id = v_week.location_id;
  insert into public.shifts (workspace_id, location_id, week_id, staff_id, role_id, starts_at, ends_at,
    break_minutes, status, source, created_by)
  select v_week.workspace_id, v_week.location_id, p_week,
    case when g.n = 1 then ts.staff_id end, ts.role_id,
    ((v_week.week_start + ts.weekday - 1) + ts.start_time) at time zone v_tz,
    ((v_week.week_start + ts.weekday - 1 + case when ts.end_time <= ts.start_time then 1 else 0 end)
      + ts.end_time) at time zone v_tz,
    ts.break_minutes, 'draft', 'template', auth.uid()
  from public.template_shifts ts
  cross join lateral generate_series(1, ts.headcount) g(n)
  where ts.template_id = p_template;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- Distance in metres between two points (haversine). Good to a few
-- metres at venue scale, no PostGIS needed.
create or replace function public.distance_m(lat1 double precision, lng1 double precision,
  lat2 double precision, lng2 double precision)
returns double precision language sql immutable set search_path = '' as $$
  select 2 * 6371000 * asin(sqrt(
    power(sin(radians(lat2 - lat1) / 2), 2)
    + cos(radians(lat1)) * cos(radians(lat2)) * power(sin(radians(lng2 - lng1) / 2), 2)));
$$;

-- ---------------------------------------------------------------------
-- 17. WORKER FUNCTIONS (edge functions only, secret key)
-- ELI5: claim_jobs and claim_notifications hand the workers a few
-- to-dos and mark them "mine" so two workers never grab the same one.
-- enqueue_shift_reminders writes tomorrow's reminder to-dos; if two
-- hours before falls in the night (22:00 to 07:00) it sends at 21:00
-- the evening before instead.
-- ---------------------------------------------------------------------
create or replace function public.claim_jobs(p_limit integer)
returns setof public.jobs language sql security definer set search_path = '' as $$
  update public.jobs j set status = 'running', locked_at = now(), attempts = j.attempts + 1
  where j.id in (
    select id from public.jobs
    where status = 'queued' and run_after <= now()
    order by run_after
    limit p_limit
    for update skip locked
  )
  returning j.*;
$$;

create or replace function public.claim_notifications(p_limit integer)
returns setof public.notifications language sql security definer set search_path = '' as $$
  update public.notifications n set status = 'sending', attempts = n.attempts + 1
  where n.id in (
    select id from public.notifications
    where status = 'queued' and send_after <= now()
    order by send_after
    limit p_limit
    for update skip locked
  )
  returning n.*;
$$;

create or replace function public.release_stuck_work()
returns integer language plpgsql security definer set search_path = '' as $$
declare v_a integer; v_b integer;
begin
  update public.jobs set status = 'queued', locked_at = null
  where status = 'running' and locked_at < now() - interval '10 minutes';
  get diagnostics v_a = row_count;
  update public.notifications set status = 'queued', send_after = now() + interval '1 minute'
  where status = 'sending' and updated_at < now() - interval '10 minutes' and attempts < 4;
  get diagnostics v_b = row_count;
  return v_a + v_b;
end;
$$;

create or replace function public.enqueue_shift_reminders()
returns integer language plpgsql security definer set search_path = '' as $$
declare v_count integer;
begin
  insert into public.notifications (workspace_id, location_id, staff_id, shift_id, kind, channel,
    dedupe_key, send_after, payload)
  select s.workspace_id, s.location_id, s.staff_id, s.id, 'shift_reminder', ch.channel,
    'reminder:' || s.id || ':' || ch.channel || ':' || extract(epoch from s.starts_at)::bigint,
    case
      when (extract(hour from ((s.starts_at - interval '2 hours') at time zone l.timezone)) >= 22
        or extract(hour from ((s.starts_at - interval '2 hours') at time zone l.timezone)) < 7)
        -- night time: 21:00 the evening before, unless that has already passed
        and ((((s.starts_at - interval '2 hours') at time zone l.timezone)
          - interval '7 hours')::date + time '21:00') at time zone l.timezone > now()
      then ((((s.starts_at - interval '2 hours') at time zone l.timezone)
          - interval '7 hours')::date + time '21:00') at time zone l.timezone
      else s.starts_at - interval '2 hours'
    end,
    jsonb_build_object('starts_at', s.starts_at)
  from public.shifts s
  join public.locations l on l.id = s.location_id
  join public.staff st on st.id = s.staff_id and st.status = 'active'
  join public.staff_private sp on sp.staff_id = s.staff_id
  cross join (values ('sms'::public.notif_channel), ('email'::public.notif_channel)) ch(channel)
  where s.status = 'published' and s.staff_id is not null
    and s.starts_at between now() + interval '30 minutes' and now() + interval '26 hours'
    and ((ch.channel = 'sms' and sp.sms_opt_in and sp.phone_e164 is not null)
      or (ch.channel = 'email' and sp.email is not null and not sp.email_opt_out))
  on conflict (dedupe_key) do nothing;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- Workers and webhooks only. The browser can never call these.
revoke execute on function public.claim_jobs(integer) from public, anon, authenticated;
revoke execute on function public.claim_notifications(integer) from public, anon, authenticated;
revoke execute on function public.release_stuck_work() from public, anon, authenticated;
revoke execute on function public.enqueue_shift_reminders() from public, anon, authenticated;
revoke execute on function public.publish_rota_week(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.try_rate_limit(text, integer, integer) from public, anon, authenticated;
revoke execute on function public.plan_limits(uuid) from public, anon;
revoke execute on function public.has_active_access(uuid) from public, anon;
revoke execute on function public.create_workspace(text, text, text) from public, anon;
revoke execute on function public.create_location(uuid, text, text) from public, anon;
revoke execute on function public.invite_staff(uuid, text, text, text, uuid[], uuid[], integer) from public, anon;
revoke execute on function public.reissue_staff_invite(uuid) from public, anon;
revoke execute on function public.accept_staff_invite(text, boolean) from public, anon;
revoke execute on function public.update_my_contact(uuid, text, text, boolean) from public, anon;
revoke execute on function public.rota_conflicts(uuid) from public, anon;
revoke execute on function public.week_labour_cost(uuid) from public, anon;
revoke execute on function public.copy_week(uuid, uuid) from public, anon;
revoke execute on function public.apply_template(uuid, uuid) from public, anon;
revoke execute on function public.usage_summary(uuid) from public, anon;

-- Say it out loud: logged-in users may call the app functions, and the
-- secret key (service_role) may call everything.
grant execute on function public.create_workspace(text, text, text), public.create_location(uuid, text, text),
  public.invite_staff(uuid, text, text, text, uuid[], uuid[], integer), public.reissue_staff_invite(uuid),
  public.accept_staff_invite(text, boolean), public.update_my_contact(uuid, text, text, boolean),
  public.rota_conflicts(uuid), public.week_labour_cost(uuid), public.copy_week(uuid, uuid),
  public.apply_template(uuid, uuid), public.usage_summary(uuid), public.plan_limits(uuid),
  public.has_active_access(uuid) to authenticated;
grant execute on function public.claim_jobs(integer), public.claim_notifications(integer),
  public.release_stuck_work(), public.enqueue_shift_reminders(), public.publish_rota_week(uuid, uuid),
  public.try_rate_limit(text, integer, integer) to service_role;

-- ---------------------------------------------------------------------
-- 18. GUARD TRIGGERS (the rules the browser cannot break)
-- ELI5: RLS decides WHO can touch a row. These triggers decide WHAT
-- they can change. A staff member can file time off but cannot approve
-- it. A manager cannot move a published shift into the past. Nobody can
-- change which business a row belongs to.
-- ---------------------------------------------------------------------
-- Rows never move between workspaces or locations.
create or replace function public.guard_tenant_columns()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.workspace_id is distinct from old.workspace_id then
    raise exception 'workspace_id cannot change';
  end if;
  return new;
end;
$$;

create trigger staff_guard_tenant before update on public.staff
  for each row execute function public.guard_tenant_columns();
create trigger staff_private_guard_tenant before update on public.staff_private
  for each row execute function public.guard_tenant_columns();
create trigger locations_guard_tenant before update on public.locations
  for each row execute function public.guard_tenant_columns();
create trigger rota_weeks_guard_tenant before update on public.rota_weeks
  for each row execute function public.guard_tenant_columns();
create trigger time_entries_guard_tenant before update on public.time_entries
  for each row execute function public.guard_tenant_columns();
create trigger time_off_guard_tenant before update on public.time_off
  for each row execute function public.guard_tenant_columns();

-- Shifts: location and week must match, and the role and staff must
-- belong to the same business. Browser edits cannot set published state
-- directly (only publish_rota_week, running as the secret key, can).
create or replace function public.guard_shift()
returns trigger language plpgsql set search_path = '' as $$
declare
  v_week public.rota_weeks;
begin
  select * into v_week from public.rota_weeks where id = new.week_id;
  if v_week.location_id <> new.location_id or v_week.workspace_id <> new.workspace_id then
    raise exception 'shift must match its rota week';
  end if;
  if new.starts_at < (v_week.week_start::timestamp - interval '1 day') at time zone 'UTC'
     or new.starts_at >= (v_week.week_start::timestamp + interval '8 days') at time zone 'UTC' then
    raise exception 'shift must start inside its rota week';
  end if;
  if not exists (select 1 from public.job_roles r where r.id = new.role_id and r.workspace_id = new.workspace_id) then
    raise exception 'role belongs to another business';
  end if;
  if new.staff_id is not null and not exists (
       select 1 from public.staff s where s.id = new.staff_id and s.workspace_id = new.workspace_id) then
    raise exception 'staff member belongs to another business';
  end if;
  if (select auth.role()) = 'authenticated' then
    if tg_op = 'INSERT' then
      new.status := 'draft';
      new.published_snapshot := null;
    else
      if new.workspace_id <> old.workspace_id or new.location_id <> old.location_id then
        raise exception 'shift cannot move between locations';
      end if;
      new.published_snapshot := old.published_snapshot;
      -- Editing a published shift turns it back into a pending change until re-published,
      -- except cancelling, which is kept as cancelled.
      if old.status = 'published' and new.status = 'published' and (
         new.starts_at <> old.starts_at or new.ends_at <> old.ends_at
         or new.staff_id is distinct from old.staff_id or new.role_id <> old.role_id
         or new.break_minutes <> old.break_minutes) then
        new.status := 'draft';
      end if;
      if new.status = 'published' and old.status <> 'published' then
        raise exception 'publish through the Publish button';
      end if;
      if old.status = 'published' and old.ends_at < now() - interval '1 day' then
        raise exception 'past shifts are locked; edit the timesheet instead';
      end if;
    end if;
  end if;
  return new;
end;
$$;

create trigger shifts_guard before insert or update on public.shifts
  for each row execute function public.guard_shift();

-- A published shift that is deleted from the builder becomes "cancelled"
-- so the person gets told, instead of the shift silently vanishing.
create or replace function public.soft_cancel_published_shift()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if old.published_snapshot is not null and (select auth.role()) = 'authenticated' then
    update public.shifts set status = 'cancelled' where id = old.id;
    update public.rota_weeks set status = 'draft' where id = old.week_id;
    return null;
  end if;
  return old;
end;
$$;

create trigger shifts_soft_delete before delete on public.shifts
  for each row execute function public.soft_cancel_published_shift();

-- Any browser change to a shift in a published week marks the week as
-- having unpublished changes, so the builder shows "Publish changes".
create or replace function public.mark_week_dirty()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.role()) = 'authenticated' then
    update public.rota_weeks set status = 'draft'
    where id = coalesce(new.week_id, old.week_id) and status = 'published';
  end if;
  return null;
end;
$$;

create trigger shifts_mark_week_dirty after insert or update on public.shifts
  for each row execute function public.mark_week_dirty();

-- Time off: staff can only create pending requests for themselves and
-- cancel their own; only managers decide.
create or replace function public.guard_time_off()
returns trigger language plpgsql set search_path = '' as $$
begin
  if (select auth.role()) <> 'authenticated' then return new; end if;
  if tg_op = 'INSERT' then
    if not public.can_manage_staff(new.staff_id) then
      new.status := 'pending'; new.decided_by := null; new.decided_at := null;
    end if;
    return new;
  end if;
  if new.staff_id <> old.staff_id then raise exception 'staff_id cannot change'; end if;
  if public.can_manage_staff(old.staff_id) then
    if new.status in ('approved', 'declined') and old.status is distinct from new.status then
      new.decided_by := auth.uid(); new.decided_at := now();
    end if;
    return new;
  end if;
  -- Staff member editing their own request: only pending to cancelled.
  if not (old.status = 'pending' and new.status = 'cancelled'
          and new.starts_on = old.starts_on and new.ends_on = old.ends_on) then
    raise exception 'only a manager can change this request';
  end if;
  return new;
end;
$$;

create trigger time_off_guard before insert or update on public.time_off
  for each row execute function public.guard_time_off();

-- Time entries: managers may approve, reject, add a note, fix the break
-- or correct the clock times. They can never edit the GPS evidence.
create or replace function public.guard_time_entry()
returns trigger language plpgsql set search_path = '' as $$
begin
  if (select auth.role()) <> 'authenticated' then return new; end if;
  if new.in_lat is distinct from old.in_lat or new.in_lng is distinct from old.in_lng
     or new.in_distance_m is distinct from old.in_distance_m
     or new.out_lat is distinct from old.out_lat or new.out_lng is distinct from old.out_lng
     or new.out_distance_m is distinct from old.out_distance_m
     or new.geofence_flag is distinct from old.geofence_flag
     or new.staff_id <> old.staff_id or new.location_id <> old.location_id
     or new.idempotency_key <> old.idempotency_key then
    raise exception 'location evidence cannot be edited';
  end if;
  if new.status in ('approved', 'rejected') and old.status is distinct from new.status then
    new.approved_by := auth.uid(); new.approved_at := now();
  end if;
  return new;
end;
$$;

create trigger time_entries_guard before update on public.time_entries
  for each row execute function public.guard_time_entry();

-- Workspace settings: the sender ID can only change on plans that allow it.
create or replace function public.guard_workspace()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.owner_id <> old.owner_id then raise exception 'owner cannot change here'; end if;
  if new.sms_sender_id <> old.sms_sender_id and (select auth.role()) = 'authenticated'
     and not coalesce((select custom_sender from public.plan_limits(new.id)), false) then
    raise exception 'custom sender ID is a Pro feature';
  end if;
  return new;
end;
$$;

create trigger workspaces_guard before update on public.workspaces
  for each row execute function public.guard_workspace();

-- Locations: the geofence needs Team or Pro.
create or replace function public.guard_location()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.geofence_mode <> 'off' and (select auth.role()) = 'authenticated'
     and not coalesce((select geofence from public.plan_limits(new.workspace_id)), false) then
    raise exception 'geofenced clock-in is on Team and Pro';
  end if;
  return new;
end;
$$;

create trigger locations_guard before insert or update on public.locations
  for each row execute function public.guard_location();

-- AI drafts: managers can only discard. Status changes come from the worker.
create or replace function public.guard_ai_draft()
returns trigger language plpgsql set search_path = '' as $$
begin
  if (select auth.role()) <> 'authenticated' then return new; end if;
  if new.status <> old.status and new.status <> 'discarded' then
    raise exception 'drafts can only be discarded here';
  end if;
  if new.result is distinct from old.result or new.cost_usd_micros <> old.cost_usd_micros then
    raise exception 'draft results cannot be edited';
  end if;
  return new;
end;
$$;

create trigger ai_drafts_guard before update on public.ai_drafts
  for each row execute function public.guard_ai_draft();

-- ---------------------------------------------------------------------
-- 19. ROW LEVEL SECURITY: switch it on for every table
-- ELI5: with RLS on and no policy, a table is a locked room. Policies
-- are the keys. Tables with no policies below are server-only.
-- ---------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.locations enable row level security;
alter table public.location_managers enable row level security;
alter table public.job_roles enable row level security;
alter table public.staff enable row level security;
alter table public.staff_private enable row level security;
alter table public.staff_locations enable row level security;
alter table public.staff_roles enable row level security;
alter table public.availability_rules enable row level security;
alter table public.time_off enable row level security;
alter table public.rota_templates enable row level security;
alter table public.template_shifts enable row level security;
alter table public.rota_weeks enable row level security;
alter table public.shifts enable row level security;
alter table public.swap_requests enable row level security;
alter table public.open_shift_claims enable row level security;
alter table public.time_entries enable row level security;
alter table public.timesheet_exports enable row level security;
alter table public.ai_drafts enable row level security;
alter table public.jobs enable row level security;
alter table public.notifications enable row level security;
alter table public.sms_opt_events enable row level security;
alter table public.twilio_events enable row level security;
alter table public.usage_ledger enable row level security;
alter table public.email_log enable row level security;
alter table public.rate_limits enable row level security;
alter table public.subscriptions enable row level security;
alter table public.stripe_events enable row level security;
alter table public.plan_prices enable row level security;
alter table public.workspace_limit_overrides enable row level security;

-- Belt and braces: anonymous visitors get no table access at all.
revoke all on all tables in schema public from anon;

-- profiles: you read and edit your own; colleagues can read your name.
create policy "profiles select self or colleague" on public.profiles for select to authenticated
  using (id = (select auth.uid()) or exists (
    select 1 from public.workspace_members a join public.workspace_members b on b.workspace_id = a.workspace_id
    where a.user_id = (select auth.uid()) and b.user_id = profiles.id));
create policy "profiles update self" on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- workspaces
create policy "workspaces select member" on public.workspaces for select to authenticated
  using (public.is_workspace_member(id));
create policy "workspaces update owner" on public.workspaces for update to authenticated
  using (public.has_workspace_role(id, array['owner']::public.member_role[]))
  with check (public.has_workspace_role(id, array['owner']::public.member_role[]));
create policy "workspaces delete owner" on public.workspaces for delete to authenticated
  using (owner_id = (select auth.uid()));
-- insert: through create_workspace() only.

-- workspace_members: everyone in the business sees who is in it; only the
-- owner changes roles. The owner row can never be edited or removed here.
create policy "members select member" on public.workspace_members for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy "members insert owner" on public.workspace_members for insert to authenticated
  with check (public.has_workspace_role(workspace_id, array['owner']::public.member_role[]) and role <> 'owner');
create policy "members update owner" on public.workspace_members for update to authenticated
  using (public.has_workspace_role(workspace_id, array['owner']::public.member_role[]) and role <> 'owner')
  with check (public.has_workspace_role(workspace_id, array['owner']::public.member_role[]) and role <> 'owner');
create policy "members delete owner or self" on public.workspace_members for delete to authenticated
  using (role <> 'owner' and (public.has_workspace_role(workspace_id, array['owner']::public.member_role[])
    or user_id = (select auth.uid())));

-- locations: members read; owner creates (via create_location) and
-- archives; managers edit the locations they run.
create policy "locations select member" on public.locations for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy "locations update manager" on public.locations for update to authenticated
  using (public.can_manage_location(id)) with check (public.can_manage_location(id));
create policy "locations delete owner" on public.locations for delete to authenticated
  using (public.has_workspace_role(workspace_id, array['owner']::public.member_role[]));

create policy "location managers select member" on public.location_managers for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy "location managers insert owner" on public.location_managers for insert to authenticated
  with check (public.has_workspace_role(workspace_id, array['owner']::public.member_role[])
    and exists (select 1 from public.locations l where l.id = location_id and l.workspace_id = location_managers.workspace_id));
create policy "location managers delete owner" on public.location_managers for delete to authenticated
  using (public.has_workspace_role(workspace_id, array['owner']::public.member_role[]));

-- job roles
create policy "job roles select member" on public.job_roles for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy "job roles insert manager" on public.job_roles for insert to authenticated
  with check (public.has_workspace_role(workspace_id, array['owner', 'manager']::public.member_role[]));
create policy "job roles update manager" on public.job_roles for update to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'manager']::public.member_role[]))
  with check (public.has_workspace_role(workspace_id, array['owner', 'manager']::public.member_role[]));
create policy "job roles delete owner" on public.job_roles for delete to authenticated
  using (public.has_workspace_role(workspace_id, array['owner']::public.member_role[]));

-- staff: names are visible to everyone in the business (needed for the
-- team rota and swaps). Contact details and pay are in staff_private.
create policy "staff select member" on public.staff for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy "staff update manager" on public.staff for update to authenticated
  using (public.can_manage_staff(id)) with check (public.can_manage_staff(id));
create policy "staff delete owner" on public.staff for delete to authenticated
  using (public.has_workspace_role(workspace_id, array['owner']::public.member_role[]));
-- insert: through invite_staff() only.

create policy "staff private select manager or self" on public.staff_private for select to authenticated
  using (public.can_manage_staff(staff_id) or public.is_self_staff(staff_id));
create policy "staff private update manager" on public.staff_private for update to authenticated
  using (public.can_manage_staff(staff_id)) with check (public.can_manage_staff(staff_id));
-- staff edit their own contact through update_my_contact() only.

create policy "staff locations select member" on public.staff_locations for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy "staff locations insert manager" on public.staff_locations for insert to authenticated
  with check (public.can_manage_location(location_id) and exists (
    select 1 from public.staff s where s.id = staff_id and s.workspace_id = staff_locations.workspace_id));
create policy "staff locations delete manager" on public.staff_locations for delete to authenticated
  using (public.can_manage_location(location_id));

create policy "staff roles select member" on public.staff_roles for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy "staff roles insert manager" on public.staff_roles for insert to authenticated
  with check (public.can_manage_staff(staff_id) and exists (
    select 1 from public.job_roles r where r.id = role_id and r.workspace_id = staff_roles.workspace_id));
create policy "staff roles delete manager" on public.staff_roles for delete to authenticated
  using (public.can_manage_staff(staff_id));

-- availability: the person and their managers.
create policy "availability select" on public.availability_rules for select to authenticated
  using (public.is_self_staff(staff_id) or public.can_manage_staff(staff_id));
create policy "availability insert" on public.availability_rules for insert to authenticated
  with check ((public.is_self_staff(staff_id) or public.can_manage_staff(staff_id))
    and exists (select 1 from public.staff s where s.id = staff_id and s.workspace_id = availability_rules.workspace_id));
create policy "availability update" on public.availability_rules for update to authenticated
  using (public.is_self_staff(staff_id) or public.can_manage_staff(staff_id))
  with check (public.is_self_staff(staff_id) or public.can_manage_staff(staff_id));
create policy "availability delete" on public.availability_rules for delete to authenticated
  using (public.is_self_staff(staff_id) or public.can_manage_staff(staff_id));

-- time off: the person files and cancels; managers decide (guard trigger).
create policy "time off select" on public.time_off for select to authenticated
  using (public.is_self_staff(staff_id) or public.can_manage_staff(staff_id));
create policy "time off insert" on public.time_off for insert to authenticated
  with check ((public.is_self_staff(staff_id) or public.can_manage_staff(staff_id))
    and exists (select 1 from public.staff s where s.id = staff_id and s.workspace_id = time_off.workspace_id));
create policy "time off update" on public.time_off for update to authenticated
  using (public.is_self_staff(staff_id) or public.can_manage_staff(staff_id))
  with check (public.is_self_staff(staff_id) or public.can_manage_staff(staff_id));

-- templates
create policy "templates select manager" on public.rota_templates for select to authenticated
  using (public.can_manage_location(location_id));
create policy "templates insert manager" on public.rota_templates for insert to authenticated
  with check (public.can_manage_location(location_id) and exists (
    select 1 from public.locations l where l.id = location_id and l.workspace_id = rota_templates.workspace_id));
create policy "templates update manager" on public.rota_templates for update to authenticated
  using (public.can_manage_location(location_id)) with check (public.can_manage_location(location_id));
create policy "templates delete manager" on public.rota_templates for delete to authenticated
  using (public.can_manage_location(location_id));

create policy "template shifts select manager" on public.template_shifts for select to authenticated
  using (public.can_manage_location(location_id));
create policy "template shifts insert manager" on public.template_shifts for insert to authenticated
  with check (public.can_manage_location(location_id) and exists (
    select 1 from public.rota_templates t where t.id = template_id and t.location_id = template_shifts.location_id
      and t.workspace_id = template_shifts.workspace_id));
create policy "template shifts update manager" on public.template_shifts for update to authenticated
  using (public.can_manage_location(location_id)) with check (public.can_manage_location(location_id));
create policy "template shifts delete manager" on public.template_shifts for delete to authenticated
  using (public.can_manage_location(location_id));

-- rota weeks: staff see published weeks at their locations; managers see all.
create policy "weeks select" on public.rota_weeks for select to authenticated
  using (public.can_manage_location(location_id)
    or (public.is_location_staff(location_id) and publish_version > 0));
create policy "weeks insert manager" on public.rota_weeks for insert to authenticated
  with check (public.can_manage_location(location_id) and status = 'draft' and publish_version = 0
    and exists (select 1 from public.locations l where l.id = location_id and l.workspace_id = rota_weeks.workspace_id));
create policy "weeks delete manager" on public.rota_weeks for delete to authenticated
  using (public.can_manage_location(location_id) and publish_version = 0);
-- update: publish_rota_week() and the dirty-marker trigger only.

-- shifts: staff see what has been published at their locations (their own
-- and the team's, plus open shifts). Drafts are managers only.
create policy "shifts select" on public.shifts for select to authenticated
  using (public.can_manage_location(location_id)
    or (public.is_location_staff(location_id) and published_snapshot is not null));
create policy "shifts insert manager" on public.shifts for insert to authenticated
  with check (public.can_manage_location(location_id));
create policy "shifts update manager" on public.shifts for update to authenticated
  using (public.can_manage_location(location_id)) with check (public.can_manage_location(location_id));
create policy "shifts delete manager" on public.shifts for delete to authenticated
  using (public.can_manage_location(location_id));

-- swaps and claims: read only from the browser; rt-swap writes them.
create policy "swaps select" on public.swap_requests for select to authenticated
  using (public.can_manage_location(location_id) or public.is_self_staff(from_staff_id)
    or (to_staff_id is not null and public.is_self_staff(to_staff_id))
    or (kind = 'cover' and to_staff_id is null and public.is_location_staff(location_id)));
create policy "claims select" on public.open_shift_claims for select to authenticated
  using (public.is_self_staff(staff_id) or exists (
    select 1 from public.shifts s where s.id = shift_id and public.can_manage_location(s.location_id)));

-- time entries: the person sees their own; managers see and approve.
create policy "time entries select" on public.time_entries for select to authenticated
  using (public.is_self_staff(staff_id) or public.can_manage_location(location_id));
create policy "time entries update manager" on public.time_entries for update to authenticated
  using (public.can_manage_location(location_id)) with check (public.can_manage_location(location_id));
-- insert: rt-clock only.

create policy "exports select manager" on public.timesheet_exports for select to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'manager']::public.member_role[])
    and (location_id is null or public.can_manage_location(location_id)));

create policy "drafts select manager" on public.ai_drafts for select to authenticated
  using (public.can_manage_location(location_id));
create policy "drafts update manager" on public.ai_drafts for update to authenticated
  using (public.can_manage_location(location_id)) with check (public.can_manage_location(location_id));

-- notifications: managers see the outbox for their business; staff see
-- their own (the "Messages" list on the phone).
create policy "notifications select" on public.notifications for select to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'manager']::public.member_role[])
    or (staff_id is not null and public.is_self_staff(staff_id))
    or to_user_id = (select auth.uid()));

create policy "usage select manager" on public.usage_ledger for select to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'manager']::public.member_role[]));

create policy "email log select owner" on public.email_log for select to authenticated
  using (public.has_workspace_role(workspace_id, array['owner']::public.member_role[]));

create policy "subscriptions select self" on public.subscriptions for select to authenticated
  using (user_id = (select auth.uid()));

create policy "plan prices select" on public.plan_prices for select to authenticated using (true);

-- No policies on purpose (server-only): jobs, sms_opt_events, twilio_events,
-- rate_limits, stripe_events, workspace_limit_overrides.

-- ---------------------------------------------------------------------
-- 20. STORAGE BUCKET + POLICIES
-- ELI5: one private folder for timesheet CSVs. Files sit under a folder
-- named after the workspace id. Only owners and managers can download,
-- and only the rt-timesheet-export function (secret key) writes files.
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('exports', 'exports', false, 10485760, array['text/csv'])
on conflict (id) do nothing;

create policy "exports select manager" on storage.objects for select to authenticated
  using (bucket_id = 'exports' and public.is_workspace_manager_text((storage.foldername(name))[1]));

-- ---------------------------------------------------------------------
-- 21. REALTIME
-- ELI5: lets the builder, the swap inbox and the staff phone update live
-- when something changes, with no refresh.
-- ---------------------------------------------------------------------
alter publication supabase_realtime add table public.shifts;
alter publication supabase_realtime add table public.ai_drafts;
alter publication supabase_realtime add table public.swap_requests;
alter publication supabase_realtime add table public.time_entries;

-- ---------------------------------------------------------------------
-- 22. SCHEDULES (run later, after your edge functions are deployed)
-- ELI5: pg_cron is an alarm clock inside the database. pg_net lets the
-- alarm clock call a URL. Every minute it pokes the two workers, and
-- every five minutes it writes the next day's shift reminders.
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
-- select cron.schedule('rt-worker',    '* * * * *',   $$ select public.invoke_edge('rt-worker') $$);
-- select cron.schedule('rt-notify',    '* * * * *',   $$ select public.invoke_edge('rt-notify') $$);
-- select cron.schedule('rt-reminders', '*/5 * * * *', $$ select public.enqueue_shift_reminders() $$);
-- select cron.schedule('rt-cleanup',   '17 3 * * *',  $$ select public.release_stuck_work();
--   update public.swap_requests set status = 'expired'
--   where status in ('pending_peer', 'pending_manager') and expires_at < now() $$);
--
-- Check it ran: select * from cron.job_run_details order by start_time desc limit 20;
`
