// Sparring single migration, pasted into the Supabase SQL editor once on a fresh project.

export const sql = `-- =====================================================================
-- Sparring: full database migration
-- Paste this whole file into Supabase > SQL Editor > New query > Run.
-- Run it ONCE on a fresh project. Order: extensions, enums, tables,
-- helper functions, triggers, RLS policies, views, seed personas,
-- storage, realtime, schedules (commented, run later).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. EXTENSIONS
-- ELI5: extensions are add-ons for the database. pgcrypto gives us
-- secure random bytes and SHA-256 hashing for invite tokens.
-- ---------------------------------------------------------------------
create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------
-- 1. ENUMS
-- ELI5: an enum is a fixed list of allowed words for a column. A practice
-- call can be 'live' or 'scored', never 'banana'.
-- ---------------------------------------------------------------------
create type public.workspace_role as enum ('owner', 'manager', 'rep');
create type public.scenario_kind as enum ('cold_call', 'discovery', 'objection_drill');
create type public.difficulty as enum ('easy', 'normal', 'hard');
create type public.session_status as enum ('created', 'live', 'ended', 'scoring', 'scored', 'failed', 'abandoned');
create type public.end_reason as enum ('rep_hung_up', 'persona_hung_up', 'time_cap', 'minute_cap', 'error', 'abandoned');
create type public.turn_role as enum ('rep', 'persona');
create type public.rubric_criterion as enum ('opener', 'permission', 'discovery', 'objections', 'next_step');
create type public.note_kind as enum ('good', 'fix');
create type public.job_kind as enum ('fetch_audio', 'score_session', 'update_stats');
create type public.job_status as enum ('queued', 'running', 'done', 'failed');
create type public.usage_kind as enum ('voice_seconds', 'persona_builds', 'scorings', 'persona_turns');
create type public.reservation_status as enum ('held', 'settled', 'released');
create type public.assignment_status as enum ('active', 'closed');
create type public.build_status as enum ('queued', 'done', 'failed');

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
  timezone text not null default 'Europe/London',
  current_workspace_id uuid,
  mic_checked_at timestamptz,
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
-- 4. WORKSPACES, MEMBERS, INVITES
-- ELI5: a workspace is the sales team (or one founder on their own).
-- Members are the people in it. The owner's subscription pays for
-- everyone. Managers build drills and see the team. Reps practise.
-- ---------------------------------------------------------------------
create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 80),
  owner_id uuid not null references auth.users (id) on delete cascade,
  timezone text not null default 'Europe/London',
  weekly_report boolean not null default true,
  icp_summary text not null default '' check (char_length(icp_summary) <= 4000),
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
  role public.workspace_role not null default 'rep',
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);
create index workspace_members_user_idx on public.workspace_members (user_id);

create table public.workspace_invites (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  email text not null check (position('@' in email) > 1),
  role public.workspace_role not null default 'rep' check (role <> 'owner'),
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
-- ELI5: these are the bouncers. "Is this person on this team?" and
-- "Is this person a manager or owner here?". security definer lets
-- them look at the members table without tripping over its own RLS.
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

create or replace function public.is_workspace_manager_text(ws text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.workspace_members m
    where m.workspace_id::text = ws and m.user_id = (select auth.uid())
      and m.role in ('owner', 'manager')
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
-- 6. PERSONAS AND SCENARIOS
-- ELI5: a persona is WHO picks up the phone (a sceptical CFO). A scenario
-- is WHAT kind of call it is (a cold call, a discovery call, an objection
-- drill). Rows with workspace_id = null are the built-in library every
-- team gets. Rows with a workspace_id are a team's own custom ones.
-- hidden_pains and win_conditions are never shown to the rep before the
-- call: they are what the rep has to dig out.
-- ---------------------------------------------------------------------
create table public.personas (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces (id) on delete cascade,
  slug text,
  name text not null check (char_length(name) between 2 and 60),
  title text not null check (char_length(title) between 2 and 80),
  company text not null default '' check (char_length(company) <= 200),
  summary text not null default '' check (char_length(summary) <= 400),
  personality text not null default '' check (char_length(personality) <= 2000),
  speaking_style text not null default '' check (char_length(speaking_style) <= 1000),
  hidden_pains jsonb not null default '[]'::jsonb,
  objections jsonb not null default '[]'::jsonb,
  win_conditions jsonb not null default '[]'::jsonb,
  voice_id text not null,
  hue smallint not null default 0 check (hue between 0 and 7),
  is_active boolean not null default true,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (jsonb_typeof(hidden_pains) = 'array' and jsonb_typeof(objections) = 'array'
         and jsonb_typeof(win_conditions) = 'array')
);
create unique index personas_system_slug_idx on public.personas (slug) where workspace_id is null;
create index personas_ws_idx on public.personas (workspace_id);
create index personas_created_by_idx on public.personas (created_by);
create trigger personas_updated_at before update on public.personas
  for each row execute function public.set_updated_at();

create table public.scenarios (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces (id) on delete cascade,
  slug text,
  kind public.scenario_kind not null,
  title text not null check (char_length(title) between 2 and 80),
  rep_brief text not null default '' check (char_length(rep_brief) <= 1500),
  persona_setup text not null default '' check (char_length(persona_setup) <= 2000),
  goal text not null default '' check (char_length(goal) <= 300),
  default_minutes smallint not null default 6 check (default_minutes between 2 and 20),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index scenarios_system_slug_idx on public.scenarios (slug) where workspace_id is null;
create index scenarios_ws_idx on public.scenarios (workspace_id);
create index scenarios_created_by_idx on public.scenarios (created_by);
create trigger scenarios_updated_at before update on public.scenarios
  for each row execute function public.set_updated_at();

-- Persona builder runs (manager pastes ICP + real objections, Claude drafts
-- a persona). Written by the spr-build-persona edge function only.
create table public.persona_builds (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  created_by uuid references auth.users (id) on delete set null,
  input jsonb not null,
  output jsonb,
  status public.build_status not null default 'queued',
  persona_id uuid references public.personas (id) on delete set null,
  error text,
  created_at timestamptz not null default now()
);
create index persona_builds_ws_idx on public.persona_builds (workspace_id, created_at desc);
create index persona_builds_created_by_idx on public.persona_builds (created_by);
create index persona_builds_persona_idx on public.persona_builds (persona_id);

-- ---------------------------------------------------------------------
-- 7. ASSIGNMENTS (drills a manager gives the team)
-- ELI5: "Everyone do 3 objection drills against the CFO by Friday and
-- score 70 or more." assignment_reps lists who it was given to.
-- ---------------------------------------------------------------------
create table public.assignments (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  created_by uuid references auth.users (id) on delete set null,
  title text not null check (char_length(title) between 2 and 120),
  note text not null default '' check (char_length(note) <= 1000),
  persona_id uuid not null references public.personas (id) on delete cascade,
  scenario_id uuid not null references public.scenarios (id) on delete cascade,
  difficulty public.difficulty not null default 'normal',
  target_sessions smallint not null default 3 check (target_sessions between 1 and 20),
  pass_score smallint not null default 70 check (pass_score between 0 and 100),
  due_at timestamptz not null,
  status public.assignment_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index assignments_ws_idx on public.assignments (workspace_id, due_at);
create index assignments_created_by_idx on public.assignments (created_by);
create index assignments_persona_idx on public.assignments (persona_id);
create index assignments_scenario_idx on public.assignments (scenario_id);
create trigger assignments_updated_at before update on public.assignments
  for each row execute function public.set_updated_at();

create table public.assignment_reps (
  assignment_id uuid not null references public.assignments (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  passed_sessions smallint not null default 0,
  completed_at timestamptz,
  reminded_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (assignment_id, user_id)
);
create index assignment_reps_ws_idx on public.assignment_reps (workspace_id);
create index assignment_reps_user_idx on public.assignment_reps (user_id);

-- ---------------------------------------------------------------------
-- 8. PRACTICE SESSIONS, TRANSCRIPT, SCORECARD, COACHING NOTES
-- ELI5: a session is one practice call. Its transcript is a list of
-- turns ("rep said X at 0:12"). The scorecard is the marks out of 100.
-- Coaching notes are the margin comments pinned to a moment in the call.
-- The browser never writes any of these: edge functions do, so a rep
-- cannot give themselves 100.
-- ---------------------------------------------------------------------
create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  persona_id uuid not null references public.personas (id) on delete restrict,
  scenario_id uuid not null references public.scenarios (id) on delete restrict,
  assignment_id uuid references public.assignments (id) on delete set null,
  difficulty public.difficulty not null default 'normal',
  status public.session_status not null default 'created',
  end_reason public.end_reason,
  max_seconds integer not null check (max_seconds between 60 and 1200),
  elevenlabs_conversation_id text unique,
  started_at timestamptz,
  ended_at timestamptz,
  duration_seconds integer check (duration_seconds >= 0),
  rep_talk_pct smallint check (rep_talk_pct between 0 and 100),
  recording_path text,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index sessions_ws_created_idx on public.sessions (workspace_id, created_at desc);
create index sessions_user_created_idx on public.sessions (user_id, created_at desc);
create index sessions_persona_idx on public.sessions (persona_id);
create index sessions_scenario_idx on public.sessions (scenario_id);
create index sessions_assignment_idx on public.sessions (assignment_id);
create index sessions_open_idx on public.sessions (status, created_at) where status in ('created', 'live', 'ended', 'scoring');
create trigger sessions_updated_at before update on public.sessions
  for each row execute function public.set_updated_at();

create table public.session_turns (
  id bigint generated always as identity primary key,
  session_id uuid not null references public.sessions (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  idx integer not null,
  role public.turn_role not null,
  text text not null,
  t_seconds integer not null default 0 check (t_seconds >= 0),
  unique (session_id, idx)
);
create index session_turns_ws_idx on public.session_turns (workspace_id);

create table public.scorecards (
  session_id uuid primary key references public.sessions (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  total smallint not null check (total between 0 and 100),
  opener smallint not null check (opener between 0 and 20),
  permission smallint not null check (permission between 0 and 20),
  discovery smallint not null check (discovery between 0 and 20),
  objections smallint not null check (objections between 0 and 20),
  next_step smallint not null check (next_step between 0 and 20),
  outcome text not null default '' check (char_length(outcome) <= 300),
  summary text not null default '' check (char_length(summary) <= 1200),
  top_fix text not null default '' check (char_length(top_fix) <= 400),
  model text not null,
  created_at timestamptz not null default now()
);
create index scorecards_ws_created_idx on public.scorecards (workspace_id, created_at desc);
create index scorecards_user_created_idx on public.scorecards (user_id, created_at desc);

create table public.coaching_notes (
  id bigint generated always as identity primary key,
  session_id uuid not null references public.sessions (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  t_seconds integer not null check (t_seconds >= 0),
  criterion public.rubric_criterion not null,
  kind public.note_kind not null,
  quote text not null default '' check (char_length(quote) <= 400),
  note text not null check (char_length(note) <= 600),
  better_line text not null default '' check (char_length(better_line) <= 400)
);
create index coaching_notes_session_idx on public.coaching_notes (session_id, t_seconds);
create index coaching_notes_ws_idx on public.coaching_notes (workspace_id);

-- Streaks and rolling numbers per rep, refreshed by the worker after
-- each scored call (cheap to read on the leaderboard).
create table public.rep_stats (
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  current_streak integer not null default 0,
  longest_streak integer not null default 0,
  last_practice_date date,
  sessions_total integer not null default 0,
  minutes_total integer not null default 0,
  avg_score_30d numeric(5,1),
  updated_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);
create index rep_stats_user_idx on public.rep_stats (user_id);

-- ---------------------------------------------------------------------
-- 9. METERING: USAGE LEDGER + MINUTE RESERVATIONS
-- ELI5: voice minutes cost real money every second. Before a call starts
-- we "hold" the seconds it is allowed to use, like a hotel holding a
-- deposit on your card. When the call ends, the hold turns into the real
-- number of seconds used and the rest is given back. Two calls started at
-- the same moment can never both spend the last 5 minutes.
-- ---------------------------------------------------------------------
create table public.usage_ledger (
  id bigint generated always as identity primary key,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null,
  kind public.usage_kind not null,
  quantity numeric not null check (quantity >= 0),
  cost_usd_micros bigint not null default 0,
  ref_id uuid,
  idempotency_key text unique,
  created_at timestamptz not null default now()
);
create index usage_ledger_ws_month_idx on public.usage_ledger (workspace_id, kind, created_at);
create index usage_ledger_user_idx on public.usage_ledger (user_id);

create table public.usage_reservations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null,
  session_id uuid not null unique references public.sessions (id) on delete cascade,
  seconds_held integer not null check (seconds_held > 0),
  status public.reservation_status not null default 'held',
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index usage_reservations_ws_idx on public.usage_reservations (workspace_id, status);
create index usage_reservations_user_idx on public.usage_reservations (user_id);

-- ---------------------------------------------------------------------
-- 10. JOBS QUEUE, EMAIL LOG, WEBHOOK EVENTS, RATE LIMITS
-- ELI5: jobs is the to-do list the background worker works through
-- (download the recording, score the call). elevenlabs_events remembers
-- every webhook we already handled, so a retry never double-counts.
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

create table public.elevenlabs_events (
  id text primary key,
  conversation_id text not null,
  type text not null,
  received_at timestamptz not null default now()
);
create index elevenlabs_events_conv_idx on public.elevenlabs_events (conversation_id);

create table public.email_log (
  id bigint generated always as identity primary key,
  workspace_id uuid references public.workspaces (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null,
  kind text not null,
  dedupe_key text unique,
  to_email text not null,
  resend_id text,
  status text not null default 'queued',
  created_at timestamptz not null default now()
);
create index email_log_ws_idx on public.email_log (workspace_id, created_at desc);
create index email_log_user_idx on public.email_log (user_id);

create table public.email_suppressions (
  email text primary key,
  reason text not null,
  created_at timestamptz not null default now()
);

create table public.notification_prefs (
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  on_assignment boolean not null default true,
  on_scored boolean not null default false,
  weekly_report boolean not null default true,
  primary key (workspace_id, user_id)
);
create index notification_prefs_user_idx on public.notification_prefs (user_id);

create table public.rate_limits (
  key text not null,
  window_start timestamptz not null,
  hits integer not null default 0,
  primary key (key, window_start)
);

-- ---------------------------------------------------------------------
-- 11. BILLING (written only by the Stripe webhook with the secret key)
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
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  updated_at timestamptz not null default now()
);

create table public.stripe_events (
  id text primary key,
  type text not null,
  received_at timestamptz not null default now()
);

-- Which Stripe price is which plan. After you create prices in Stripe, run:
-- insert into public.plan_prices values ('price_...', 'solo'), ('price_...', 'team'), ...
create table public.plan_prices (
  price_id text primary key,
  plan text not null check (plan in ('solo', 'team', 'floor'))
);

-- Test-only limit overrides. No policies: only you, in the SQL editor.
create table public.workspace_limit_overrides (
  workspace_id uuid primary key references public.workspaces (id) on delete cascade,
  voice_minutes integer,
  persona_builds integer,
  seats integer
);

-- ---------------------------------------------------------------------
-- 12. ACCESS AND LIMIT FUNCTIONS
-- ELI5: has_active_access is the paywall: the owner's trial or paid plan
-- keeps the whole team in. plan_limits returns the numbers from the PRD.
-- minutes_left is what the meter in the sidebar shows.
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
returns table (plan text, status text, seats integer, voice_minutes integer, max_session_minutes integer,
               persona_builds integer, custom_personas integer, team_features boolean)
language plpgsql stable security definer set search_path = '' as $$
declare
  v_plan text;
  v_status text;
  o record;
begin
  select coalesce(pp.plan, 'solo'), coalesce(s.status, 'none') into v_plan, v_status
  from public.workspaces w
  left join public.subscriptions s on s.user_id = w.owner_id
  left join public.plan_prices pp on pp.price_id = s.price_id
  where w.id = ws;

  if v_plan is null then v_plan := 'solo'; v_status := 'none'; end if;
  plan := v_plan; status := v_status;

  if v_plan = 'floor' then
    seats := 16; voice_minutes := 900; max_session_minutes := 20; persona_builds := 100;
    custom_personas := 500; team_features := true;
  elsif v_plan = 'team' then
    seats := 6; voice_minutes := 360; max_session_minutes := 15; persona_builds := 30;
    custom_personas := 25; team_features := true;
  else
    seats := 1; voice_minutes := 90; max_session_minutes := 10; persona_builds := 5;
    custom_personas := 3; team_features := false;
  end if;

  -- A 7 day trial gets 20 voice minutes and 3 persona builds, whatever the plan.
  if v_status = 'trialing' then
    voice_minutes := least(voice_minutes, 20);
    persona_builds := least(persona_builds, 3);
  end if;

  select * into o from public.workspace_limit_overrides where workspace_id = ws;
  if found then
    voice_minutes := coalesce(o.voice_minutes, voice_minutes);
    persona_builds := coalesce(o.persona_builds, persona_builds);
    seats := coalesce(o.seats, seats);
  end if;
  return next;
end;
$$;

-- The billing month starts on the owner's Stripe period start (or the
-- calendar month when there is none), so minutes reset on renewal day.
create or replace function public.usage_period_start(ws uuid)
returns timestamptz language sql stable security definer set search_path = '' as $$
  select coalesce(
    (select s.current_period_start from public.workspaces w
       join public.subscriptions s on s.user_id = w.owner_id
      where w.id = ws and s.current_period_start <= now()),
    date_trunc('month', now()));
$$;

create or replace function public.usage_this_period(ws uuid, k public.usage_kind)
returns numeric language sql stable security definer set search_path = '' as $$
  select coalesce(sum(quantity), 0) from public.usage_ledger
  where workspace_id = ws and kind = k and created_at >= public.usage_period_start(ws);
$$;

create or replace function public.seconds_held(ws uuid)
returns integer language sql stable security definer set search_path = '' as $$
  select coalesce(sum(seconds_held), 0)::integer from public.usage_reservations
  where workspace_id = ws and status = 'held' and expires_at > now();
$$;

-- For the UI meter. Members of the workspace only.
create or replace function public.minutes_left(ws uuid)
returns table (plan text, status text, voice_minutes integer, used_seconds integer, held_seconds integer,
               left_seconds integer, persona_builds_left integer, seats integer, seats_used integer)
language plpgsql stable security definer set search_path = '' as $$
declare l record;
begin
  if not public.is_workspace_member(ws) then raise exception 'not_member'; end if;
  select * into l from public.plan_limits(ws);
  plan := l.plan; status := l.status; voice_minutes := l.voice_minutes; seats := l.seats;
  used_seconds := public.usage_this_period(ws, 'voice_seconds')::integer;
  held_seconds := public.seconds_held(ws);
  left_seconds := greatest(l.voice_minutes * 60 - used_seconds - held_seconds, 0);
  persona_builds_left := greatest(l.persona_builds - public.usage_this_period(ws, 'persona_builds')::integer, 0);
  select count(*)::integer into seats_used from public.workspace_members where workspace_id = ws;
  return next;
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

-- ---------------------------------------------------------------------
-- 13. WORKSPACE AND INVITE FUNCTIONS (called from the app)
-- ELI5: creating a team and joining one happen inside the database in one
-- step, so seats and roles can never be skipped.
-- ---------------------------------------------------------------------
create or replace function public.create_workspace(p_name text, p_timezone text default 'Europe/London')
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_ws uuid; v_uid uuid := (select auth.uid());
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  if exists (select 1 from public.workspaces where owner_id = v_uid) then
    raise exception 'already_owner';
  end if;
  insert into public.workspaces (name, owner_id, timezone)
  values (trim(p_name), v_uid, coalesce(nullif(p_timezone, ''), 'Europe/London'))
  returning id into v_ws;
  insert into public.workspace_members (workspace_id, user_id, role) values (v_ws, v_uid, 'owner');
  insert into public.notification_prefs (workspace_id, user_id) values (v_ws, v_uid);
  insert into public.rep_stats (workspace_id, user_id) values (v_ws, v_uid);
  update public.profiles set current_workspace_id = v_ws where id = v_uid;
  return v_ws;
end;
$$;

-- Returns the raw token once. The app emails it. Only the hash is kept.
create or replace function public.create_invite(p_ws uuid, p_email text, p_role public.workspace_role)
returns text language plpgsql security definer set search_path = '' as $$
declare
  v_token text := encode(extensions.gen_random_bytes(32), 'hex');
  v_limits record;
  v_used integer;
begin
  if not public.has_workspace_role(p_ws, array['owner', 'manager']::public.workspace_role[]) then
    raise exception 'forbidden';
  end if;
  if p_role = 'owner' then raise exception 'bad_role'; end if;
  if p_role = 'manager' and not public.has_workspace_role(p_ws, array['owner']::public.workspace_role[]) then
    raise exception 'only_owner_invites_managers';
  end if;
  select * into v_limits from public.plan_limits(p_ws);
  if not v_limits.team_features then raise exception 'plan_has_no_team'; end if;
  select (select count(*) from public.workspace_members where workspace_id = p_ws)
       + (select count(*) from public.workspace_invites where workspace_id = p_ws
            and accepted_at is null and expires_at > now())
    into v_used;
  if v_used >= v_limits.seats then raise exception 'seat_limit'; end if;
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
  v_email text;
  v_limits record;
  v_members integer;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  select * into v_inv from public.workspace_invites
  where token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex') for update;
  if not found or v_inv.accepted_at is not null or v_inv.expires_at < now() then
    raise exception 'invite_invalid';
  end if;
  select lower(email) into v_email from auth.users where id = v_uid;
  if v_email is distinct from v_inv.email then raise exception 'invite_wrong_email'; end if;
  select * into v_limits from public.plan_limits(v_inv.workspace_id);
  select count(*) into v_members from public.workspace_members where workspace_id = v_inv.workspace_id;
  if v_members >= v_limits.seats then raise exception 'seat_limit'; end if;

  insert into public.workspace_members (workspace_id, user_id, role)
  values (v_inv.workspace_id, v_uid, v_inv.role) on conflict do nothing;
  insert into public.notification_prefs (workspace_id, user_id)
  values (v_inv.workspace_id, v_uid) on conflict do nothing;
  insert into public.rep_stats (workspace_id, user_id)
  values (v_inv.workspace_id, v_uid) on conflict do nothing;
  update public.workspace_invites set accepted_at = now() where id = v_inv.id;
  update public.profiles set current_workspace_id = v_inv.workspace_id where id = v_uid;
  return v_inv.workspace_id;
end;
$$;

-- The browser saves the ElevenLabs conversation id once startSession()
-- returns it. Only the rep who owns the session, only once.
create or replace function public.attach_conversation(p_session uuid, p_conversation text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_conversation !~ '^[A-Za-z0-9_-]{8,80}$' then raise exception 'bad_conversation_id'; end if;
  update public.sessions
     set elevenlabs_conversation_id = p_conversation, status = 'live', started_at = now()
   where id = p_session and user_id = (select auth.uid())
     and elevenlabs_conversation_id is null and status = 'created';
  if not found then raise exception 'not_attachable'; end if;
end;
$$;

-- ---------------------------------------------------------------------
-- 14. METERING FUNCTIONS (edge functions only, secret key)
-- ELI5: reserve_seconds holds minutes before a call, settle_reservation
-- turns the hold into real usage after it, release_stale_reservations
-- gives back holds from calls that never connected.
-- ---------------------------------------------------------------------
create or replace function public.reserve_seconds(p_ws uuid, p_user uuid, p_session uuid, p_wanted integer)
returns integer language plpgsql security definer set search_path = '' as $$
declare
  v_limits record;
  v_left integer;
  v_grant integer;
begin
  -- Lock the workspace row so two calls starting together queue up here.
  perform 1 from public.workspaces where id = p_ws for update;
  select * into v_limits from public.plan_limits(p_ws);
  v_left := v_limits.voice_minutes * 60
            - public.usage_this_period(p_ws, 'voice_seconds')::integer
            - public.seconds_held(p_ws);
  v_grant := least(p_wanted, v_limits.max_session_minutes * 60, v_left);
  if v_grant < 60 then return 0; end if;
  insert into public.usage_reservations (workspace_id, user_id, session_id, seconds_held, expires_at)
  values (p_ws, p_user, p_session, v_grant, now() + make_interval(secs => v_grant + 900));
  return v_grant;
end;
$$;

create or replace function public.settle_reservation(p_session uuid, p_seconds integer, p_cost_micros bigint)
returns void language plpgsql security definer set search_path = '' as $$
declare v_res public.usage_reservations;
begin
  select * into v_res from public.usage_reservations where session_id = p_session for update;
  if not found then return; end if;
  insert into public.usage_ledger (workspace_id, user_id, kind, quantity, cost_usd_micros, ref_id, idempotency_key)
  values (v_res.workspace_id, v_res.user_id, 'voice_seconds', greatest(p_seconds, 0), p_cost_micros,
          p_session, 'voice:' || p_session::text)
  on conflict (idempotency_key) do nothing;
  update public.usage_reservations set status = 'settled' where id = v_res.id;
end;
$$;

create or replace function public.release_stale_reservations()
returns integer language plpgsql security definer set search_path = '' as $$
declare v_count integer;
begin
  update public.usage_reservations r set status = 'released'
  from public.sessions s
  where s.id = r.session_id and r.status = 'held'
    and (r.expires_at < now() or (s.status = 'created' and s.created_at < now() - interval '10 minutes'));
  get diagnostics v_count = row_count;
  update public.sessions set status = 'abandoned', end_reason = 'abandoned'
  where status = 'created' and created_at < now() - interval '10 minutes';
  return v_count;
end;
$$;

-- ---------------------------------------------------------------------
-- 15. WORKER FUNCTIONS (edge functions only, secret key)
-- ELI5: claim_jobs hands the worker a few to-dos and marks them "mine"
-- so two workers never grab the same one. fail_job puts it back with a
-- growing wait (1, 4, 9, 16 minutes) and gives up after 5 tries.
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

create or replace function public.complete_job(p_job uuid)
returns void language sql security definer set search_path = '' as $$
  update public.jobs set status = 'done', locked_at = null, last_error = null where id = p_job;
$$;

create or replace function public.fail_job(p_job uuid, p_error text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_attempts integer;
begin
  select attempts into v_attempts from public.jobs where id = p_job;
  update public.jobs
     set status = case when v_attempts >= 5 then 'failed'::public.job_status else 'queued'::public.job_status end,
         locked_at = null,
         last_error = left(p_error, 500),
         run_after = now() + make_interval(mins => v_attempts * v_attempts)
   where id = p_job;
end;
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

-- Saves a whole scorecard and its notes in one go (all or nothing).
create or replace function public.save_scorecard(p_session uuid, p_card jsonb, p_notes jsonb, p_model text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_s public.sessions;
begin
  select * into v_s from public.sessions where id = p_session for update;
  if not found then raise exception 'not_found'; end if;
  delete from public.coaching_notes where session_id = p_session;
  insert into public.scorecards (session_id, workspace_id, user_id, total, opener, permission, discovery,
    objections, next_step, outcome, summary, top_fix, model)
  values (p_session, v_s.workspace_id, v_s.user_id,
    (p_card ->> 'opener')::smallint + (p_card ->> 'permission')::smallint + (p_card ->> 'discovery')::smallint
      + (p_card ->> 'objections')::smallint + (p_card ->> 'next_step')::smallint,
    (p_card ->> 'opener')::smallint, (p_card ->> 'permission')::smallint, (p_card ->> 'discovery')::smallint,
    (p_card ->> 'objections')::smallint, (p_card ->> 'next_step')::smallint,
    left(coalesce(p_card ->> 'outcome', ''), 300), left(coalesce(p_card ->> 'summary', ''), 1200),
    left(coalesce(p_card ->> 'top_fix', ''), 400), p_model)
  on conflict (session_id) do update set
    total = excluded.total, opener = excluded.opener, permission = excluded.permission,
    discovery = excluded.discovery, objections = excluded.objections, next_step = excluded.next_step,
    outcome = excluded.outcome, summary = excluded.summary, top_fix = excluded.top_fix,
    model = excluded.model, created_at = now();
  insert into public.coaching_notes (session_id, workspace_id, t_seconds, criterion, kind, quote, note, better_line)
  select p_session, v_s.workspace_id, greatest((n ->> 't_seconds')::integer, 0),
         (n ->> 'criterion')::public.rubric_criterion, (n ->> 'kind')::public.note_kind,
         left(coalesce(n ->> 'quote', ''), 400), left(n ->> 'note', 600), left(coalesce(n ->> 'better_line', ''), 400)
  from jsonb_array_elements(p_notes) n;
  update public.sessions set status = 'scored', error = null where id = p_session;
end;
$$;

-- Streaks: a day counts when the rep finished a call of 2 minutes or more,
-- in the workspace's timezone. Run after every scored call.
create or replace function public.refresh_rep_stats(p_ws uuid, p_user uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_tz text;
  v_days date[];
  v_today date;
  v_streak integer := 0;
  v_longest integer := 0;
  v_run integer := 0;
  v_prev date;
  d date;
begin
  select timezone into v_tz from public.workspaces where id = p_ws;
  v_today := (now() at time zone v_tz)::date;
  select array_agg(distinct (s.ended_at at time zone v_tz)::date order by (s.ended_at at time zone v_tz)::date)
    into v_days
  from public.sessions s
  where s.workspace_id = p_ws and s.user_id = p_user and s.status = 'scored' and s.duration_seconds >= 120;

  if v_days is not null then
    foreach d in array v_days loop
      if v_prev is not null and d = v_prev + 1 then v_run := v_run + 1; else v_run := 1; end if;
      v_longest := greatest(v_longest, v_run);
      v_prev := d;
    end loop;
    -- The streak is alive if the last practice day is today or yesterday.
    if v_prev >= v_today - 1 then v_streak := v_run; end if;
  end if;

  insert into public.rep_stats (workspace_id, user_id, current_streak, longest_streak, last_practice_date,
    sessions_total, minutes_total, avg_score_30d, updated_at)
  select p_ws, p_user, v_streak, v_longest, v_prev,
    (select count(*) from public.sessions where workspace_id = p_ws and user_id = p_user and status = 'scored'),
    (select coalesce(sum(duration_seconds), 0) / 60 from public.sessions
      where workspace_id = p_ws and user_id = p_user and status = 'scored'),
    (select round(avg(total), 1) from public.scorecards
      where workspace_id = p_ws and user_id = p_user and created_at > now() - interval '30 days'),
    now()
  on conflict (workspace_id, user_id) do update set
    current_streak = excluded.current_streak, longest_streak = excluded.longest_streak,
    last_practice_date = excluded.last_practice_date, sessions_total = excluded.sessions_total,
    minutes_total = excluded.minutes_total, avg_score_30d = excluded.avg_score_30d, updated_at = now();

  -- Assignment progress for this rep.
  update public.assignment_reps ar set
    passed_sessions = sub.passed,
    completed_at = case when sub.passed >= a.target_sessions then coalesce(ar.completed_at, now()) else null end
  from public.assignments a,
    lateral (select count(*)::smallint as passed from public.sessions s
             join public.scorecards c on c.session_id = s.id
             where s.assignment_id = a.id and s.user_id = p_user and c.total >= a.pass_score) sub
  where ar.assignment_id = a.id and ar.user_id = p_user and a.workspace_id = p_ws;
end;
$$;

-- Workers and webhooks only. The browser can never call these.
revoke execute on function public.reserve_seconds(uuid, uuid, uuid, integer) from public, anon, authenticated;
revoke execute on function public.settle_reservation(uuid, integer, bigint) from public, anon, authenticated;
revoke execute on function public.release_stale_reservations() from public, anon, authenticated;
revoke execute on function public.claim_jobs(integer) from public, anon, authenticated;
revoke execute on function public.complete_job(uuid) from public, anon, authenticated;
revoke execute on function public.fail_job(uuid, text) from public, anon, authenticated;
revoke execute on function public.release_stuck_jobs() from public, anon, authenticated;
revoke execute on function public.save_scorecard(uuid, jsonb, jsonb, text) from public, anon, authenticated;
revoke execute on function public.refresh_rep_stats(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.try_rate_limit(text, integer, integer) from public, anon, authenticated;
revoke execute on function public.plan_limits(uuid) from public, anon, authenticated;
revoke execute on function public.usage_this_period(uuid, public.usage_kind) from public, anon, authenticated;
revoke execute on function public.seconds_held(uuid) from public, anon, authenticated;
revoke execute on function public.create_workspace(text, text) from public, anon;
revoke execute on function public.create_invite(uuid, text, public.workspace_role) from public, anon;
revoke execute on function public.accept_invite(text) from public, anon;
revoke execute on function public.attach_conversation(uuid, text) from public, anon;
revoke execute on function public.minutes_left(uuid) from public, anon;

-- ---------------------------------------------------------------------
-- 16. GUARD TRIGGERS (the rules the browser cannot break)
-- ELI5: RLS decides WHICH rows you can touch. These triggers decide
-- WHICH COLUMNS. A manager can rename a persona but cannot move it to
-- another team, and nobody can demote the owner from the browser.
-- ---------------------------------------------------------------------
create or replace function public.guard_member_changes()
returns trigger language plpgsql set search_path = '' as $$
begin
  if current_user in ('authenticated', 'anon') then
    if tg_op = 'UPDATE' then
      if old.role = 'owner' or new.role = 'owner' then raise exception 'owner_role_is_fixed'; end if;
      if new.workspace_id <> old.workspace_id or new.user_id <> old.user_id then
        raise exception 'member_keys_are_fixed';
      end if;
    elsif tg_op = 'DELETE' then
      if old.role = 'owner' then raise exception 'owner_cannot_be_removed'; end if;
    end if;
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;
create trigger workspace_members_guard before update or delete on public.workspace_members
  for each row execute function public.guard_member_changes();

create or replace function public.guard_workspace_columns()
returns trigger language plpgsql set search_path = '' as $$
begin
  if current_user in ('authenticated', 'anon') and new.owner_id <> old.owner_id then
    raise exception 'owner_change_needs_support';
  end if;
  return new;
end;
$$;
create trigger workspaces_guard before update on public.workspaces
  for each row execute function public.guard_workspace_columns();

create or replace function public.guard_custom_rows()
returns trigger language plpgsql set search_path = '' as $$
begin
  if current_user in ('authenticated', 'anon') then
    if tg_op = 'INSERT' then
      if new.workspace_id is null then raise exception 'library_rows_are_read_only'; end if;
      new.created_by := (select auth.uid());
      new.slug := null;
    elsif new.workspace_id is distinct from old.workspace_id then
      raise exception 'workspace_is_fixed';
    end if;
  end if;
  return new;
end;
$$;
create trigger personas_guard before insert or update on public.personas
  for each row execute function public.guard_custom_rows();
create trigger scenarios_guard before insert or update on public.scenarios
  for each row execute function public.guard_custom_rows();

-- Assignments may only point at personas and scenarios this team can use.
create or replace function public.guard_assignment()
returns trigger language plpgsql set search_path = '' as $$
begin
  if not exists (select 1 from public.personas p where p.id = new.persona_id
                 and (p.workspace_id is null or p.workspace_id = new.workspace_id)) then
    raise exception 'persona_not_in_workspace';
  end if;
  if not exists (select 1 from public.scenarios s where s.id = new.scenario_id
                 and (s.workspace_id is null or s.workspace_id = new.workspace_id)) then
    raise exception 'scenario_not_in_workspace';
  end if;
  if current_user in ('authenticated', 'anon') then
    if tg_op = 'INSERT' then new.created_by := (select auth.uid()); end if;
    if tg_op = 'UPDATE' and new.workspace_id <> old.workspace_id then raise exception 'workspace_is_fixed'; end if;
  end if;
  return new;
end;
$$;
create trigger assignments_guard before insert or update on public.assignments
  for each row execute function public.guard_assignment();

-- assignment_reps rows must name a member of the same workspace.
create or replace function public.guard_assignment_rep()
returns trigger language plpgsql set search_path = '' as $$
begin
  if not exists (select 1 from public.assignments a where a.id = new.assignment_id
                 and a.workspace_id = new.workspace_id) then
    raise exception 'assignment_not_in_workspace';
  end if;
  if not exists (select 1 from public.workspace_members m where m.workspace_id = new.workspace_id
                 and m.user_id = new.user_id) then
    raise exception 'rep_not_in_workspace';
  end if;
  if current_user in ('authenticated', 'anon') then
    new.passed_sessions := coalesce(old.passed_sessions, 0);
    new.completed_at := old.completed_at;
  end if;
  return new;
end;
$$;
create trigger assignment_reps_guard before insert or update on public.assignment_reps
  for each row execute function public.guard_assignment_rep();

-- ---------------------------------------------------------------------
-- 17. ROW LEVEL SECURITY: switch it on for every table
-- ELI5: with RLS on and no policy, a table is a locked room. Policies
-- below hand out keys, one door (select, insert, update, delete) at a time.
-- ---------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.workspace_invites enable row level security;
alter table public.personas enable row level security;
alter table public.scenarios enable row level security;
alter table public.persona_builds enable row level security;
alter table public.assignments enable row level security;
alter table public.assignment_reps enable row level security;
alter table public.sessions enable row level security;
alter table public.session_turns enable row level security;
alter table public.scorecards enable row level security;
alter table public.coaching_notes enable row level security;
alter table public.rep_stats enable row level security;
alter table public.usage_ledger enable row level security;
alter table public.usage_reservations enable row level security;
alter table public.jobs enable row level security;
alter table public.elevenlabs_events enable row level security;
alter table public.email_log enable row level security;
alter table public.email_suppressions enable row level security;
alter table public.notification_prefs enable row level security;
alter table public.rate_limits enable row level security;
alter table public.subscriptions enable row level security;
alter table public.stripe_events enable row level security;
alter table public.plan_prices enable row level security;
alter table public.workspace_limit_overrides enable row level security;

-- Belt and braces: anonymous visitors get no table access at all.
revoke all on all tables in schema public from anon;

-- Profiles: yourself, and teammates' names for the leaderboard.
create policy "profiles select self or teammate" on public.profiles for select to authenticated
  using (id = (select auth.uid()) or public.shares_workspace_with(id));
create policy "profiles update self" on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- Workspaces: created through create_workspace(); edited by owner/manager; deleted by owner.
create policy "workspaces select member" on public.workspaces for select to authenticated
  using (public.is_workspace_member(id));
create policy "workspaces update manager" on public.workspaces for update to authenticated
  using (public.has_workspace_role(id, array['owner', 'manager']::public.workspace_role[]))
  with check (public.has_workspace_role(id, array['owner', 'manager']::public.workspace_role[]));
create policy "workspaces delete owner" on public.workspaces for delete to authenticated
  using (owner_id = (select auth.uid()));

-- Members: everyone sees the team; the owner changes roles; owner/manager
-- remove reps; anyone can leave (except the owner, see the guard trigger).
create policy "members select member" on public.workspace_members for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy "members update owner" on public.workspace_members for update to authenticated
  using (public.has_workspace_role(workspace_id, array['owner']::public.workspace_role[]))
  with check (public.has_workspace_role(workspace_id, array['owner']::public.workspace_role[]));
create policy "members delete manager or self" on public.workspace_members for delete to authenticated
  using (user_id = (select auth.uid())
         or public.has_workspace_role(workspace_id, array['owner']::public.workspace_role[])
         or (role = 'rep' and public.has_workspace_role(workspace_id, array['manager']::public.workspace_role[])));

-- Invites: created through create_invite(); owner/manager can see and revoke.
create policy "invites select manager" on public.workspace_invites for select to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'manager']::public.workspace_role[]));
create policy "invites delete manager" on public.workspace_invites for delete to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'manager']::public.workspace_role[]));

-- Personas and scenarios: the built-in library is readable by every
-- signed-in user. Custom rows: members read, owner/manager write.
create policy "personas select library or member" on public.personas for select to authenticated
  using (workspace_id is null or public.is_workspace_member(workspace_id));
create policy "personas insert manager" on public.personas for insert to authenticated
  with check (workspace_id is not null
              and public.has_workspace_role(workspace_id, array['owner', 'manager']::public.workspace_role[]));
create policy "personas update manager" on public.personas for update to authenticated
  using (workspace_id is not null
         and public.has_workspace_role(workspace_id, array['owner', 'manager']::public.workspace_role[]))
  with check (workspace_id is not null
              and public.has_workspace_role(workspace_id, array['owner', 'manager']::public.workspace_role[]));
create policy "personas delete manager" on public.personas for delete to authenticated
  using (workspace_id is not null
         and public.has_workspace_role(workspace_id, array['owner', 'manager']::public.workspace_role[]));

create policy "scenarios select library or member" on public.scenarios for select to authenticated
  using (workspace_id is null or public.is_workspace_member(workspace_id));
create policy "scenarios insert manager" on public.scenarios for insert to authenticated
  with check (workspace_id is not null
              and public.has_workspace_role(workspace_id, array['owner', 'manager']::public.workspace_role[]));
create policy "scenarios update manager" on public.scenarios for update to authenticated
  using (workspace_id is not null
         and public.has_workspace_role(workspace_id, array['owner', 'manager']::public.workspace_role[]))
  with check (workspace_id is not null
              and public.has_workspace_role(workspace_id, array['owner', 'manager']::public.workspace_role[]));
create policy "scenarios delete manager" on public.scenarios for delete to authenticated
  using (workspace_id is not null
         and public.has_workspace_role(workspace_id, array['owner', 'manager']::public.workspace_role[]));

-- Persona builds: managers read their team's runs. Written by spr-build-persona only.
create policy "persona builds select manager" on public.persona_builds for select to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'manager']::public.workspace_role[]));

-- Assignments: everyone on the team reads; owner/manager write.
create policy "assignments select member" on public.assignments for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy "assignments insert manager" on public.assignments for insert to authenticated
  with check (public.has_workspace_role(workspace_id, array['owner', 'manager']::public.workspace_role[]));
create policy "assignments update manager" on public.assignments for update to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'manager']::public.workspace_role[]))
  with check (public.has_workspace_role(workspace_id, array['owner', 'manager']::public.workspace_role[]));
create policy "assignments delete manager" on public.assignments for delete to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'manager']::public.workspace_role[]));

-- A rep sees their own assignment rows; managers see and edit all of them.
create policy "assignment reps select own or manager" on public.assignment_reps for select to authenticated
  using (user_id = (select auth.uid())
         or public.has_workspace_role(workspace_id, array['owner', 'manager']::public.workspace_role[]));
create policy "assignment reps insert manager" on public.assignment_reps for insert to authenticated
  with check (public.has_workspace_role(workspace_id, array['owner', 'manager']::public.workspace_role[]));
create policy "assignment reps delete manager" on public.assignment_reps for delete to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'manager']::public.workspace_role[]));

-- Sessions, turns, scorecards, notes: a rep sees their own; owner and
-- managers see the whole team. Nobody writes from the browser (sessions
-- are created by spr-start-session, attached by attach_conversation()).
create policy "sessions select own or manager" on public.sessions for select to authenticated
  using (user_id = (select auth.uid())
         or public.has_workspace_role(workspace_id, array['owner', 'manager']::public.workspace_role[]));

create policy "turns select own or manager" on public.session_turns for select to authenticated
  using (exists (select 1 from public.sessions s where s.id = session_id
                 and (s.user_id = (select auth.uid())
                      or public.has_workspace_role(s.workspace_id, array['owner', 'manager']::public.workspace_role[]))));

-- Scorecard totals are visible to the whole team (the leaderboard needs
-- them). The detailed notes stay with the rep and the managers.
create policy "scorecards select member" on public.scorecards for select to authenticated
  using (public.is_workspace_member(workspace_id));

create policy "notes select own or manager" on public.coaching_notes for select to authenticated
  using (exists (select 1 from public.sessions s where s.id = session_id
                 and (s.user_id = (select auth.uid())
                      or public.has_workspace_role(s.workspace_id, array['owner', 'manager']::public.workspace_role[]))));

create policy "rep stats select member" on public.rep_stats for select to authenticated
  using (public.is_workspace_member(workspace_id));

-- Usage: owner/manager see the meter detail. Everyone else uses minutes_left().
create policy "usage select manager" on public.usage_ledger for select to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'manager']::public.workspace_role[]));

-- Notification preferences: your own row in teams you belong to.
create policy "prefs select self" on public.notification_prefs for select to authenticated
  using (user_id = (select auth.uid()));
create policy "prefs insert self" on public.notification_prefs for insert to authenticated
  with check (user_id = (select auth.uid()) and public.is_workspace_member(workspace_id));
create policy "prefs update self" on public.notification_prefs for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Billing: you read your own subscription. Price ids are not secret.
create policy "subscriptions select self" on public.subscriptions for select to authenticated
  using (user_id = (select auth.uid()));
create policy "plan prices select all" on public.plan_prices for select to authenticated
  using (true);

-- No policies on purpose (server only): usage_reservations, jobs,
-- elevenlabs_events, email_log, email_suppressions, rate_limits,
-- stripe_events, workspace_limit_overrides.

-- ---------------------------------------------------------------------
-- 18. LEADERBOARD AND TREND VIEWS (obey the caller's RLS)
-- ELI5: one row per rep per week with their average and best score.
-- security_invoker means the view only shows what the reader may see.
-- Ranking rule (PRD 10.3): average of the rep's best 5 scored calls of
-- the week, at least 3 calls to be ranked.
-- ---------------------------------------------------------------------
create or replace view public.leaderboard_week with (security_invoker = true) as
with ranked as (
  select c.workspace_id, c.user_id, c.total,
         date_trunc('week', c.created_at at time zone w.timezone)::date as week_start,
         row_number() over (partition by c.workspace_id, c.user_id,
                            date_trunc('week', c.created_at at time zone w.timezone)
                            order by c.total desc) as rn
  from public.scorecards c
  join public.workspaces w on w.id = c.workspace_id
)
select r.workspace_id, r.user_id, r.week_start,
       count(*)::integer as calls,
       round(avg(r.total) filter (where r.rn <= 5), 1) as best5_avg,
       max(r.total) as best,
       (count(*) >= 3) as ranked
from ranked r
group by r.workspace_id, r.user_id, r.week_start;

create or replace view public.rep_trend_weekly with (security_invoker = true) as
select c.workspace_id, c.user_id,
       date_trunc('week', c.created_at at time zone w.timezone)::date as week_start,
       count(*)::integer as calls,
       round(avg(c.total), 1) as avg_total,
       round(avg(c.opener) * 5, 1) as avg_opener,
       round(avg(c.permission) * 5, 1) as avg_permission,
       round(avg(c.discovery) * 5, 1) as avg_discovery,
       round(avg(c.objections) * 5, 1) as avg_objections,
       round(avg(c.next_step) * 5, 1) as avg_next_step
from public.scorecards c
join public.workspaces w on w.id = c.workspace_id
group by c.workspace_id, c.user_id, date_trunc('week', c.created_at at time zone w.timezone);

grant select on public.leaderboard_week to authenticated;
grant select on public.rep_trend_weekly to authenticated;

-- ---------------------------------------------------------------------
-- 19. SEED: THE BUILT-IN LIBRARY (3 personas x 3 scenarios)
-- ELI5: every new team starts with these. voice_id values are ElevenLabs
-- voice ids: replace the placeholders with voices you picked in the
-- ElevenLabs Voice Library (backend task "Set up ElevenLabs").
-- ---------------------------------------------------------------------
insert into public.personas (slug, name, title, company, summary, personality, speaking_style,
  hidden_pains, objections, win_conditions, voice_id, hue) values
('sceptical-cfo', 'Margaret Okafor', 'CFO', 'Northfield Logistics, 420 staff, freight forwarding',
 'Numbers first. Has been burned by software that never paid back.',
 'Polite but cold. Assumes every vendor is wasting her time. Respects people who are brief, specific and honest about what they do not know. Warms up only when the caller quantifies something she cares about. Hangs up on waffle after about 40 seconds.',
 'Short sentences. Asks "what does it cost" and "who else uses it" early. Long pauses. Never says "great question".',
 '["Month-end close takes 9 working days and the board wants 5", "Two finance analysts spend Fridays reconciling carrier invoices by hand", "Last software purchase (a BI tool) went unused after 6 months"]'::jsonb,
 '["Send me an email", "We have no budget until April", "We tried something like this and it failed", "What is the ROI, in numbers"]'::jsonb,
 '["Caller asks permission and states a reason in the first 20 seconds", "Caller uncovers at least one hidden pain with a number attached", "Caller handles one objection without arguing", "Caller proposes a specific time for a 20 minute call"]'::jsonb,
 'VOICE_ID_CFO', 0),
('busy-founder', 'Dev Malhotra', 'Founder and CEO', 'Loopwise, 18 staff, B2B scheduling software',
 'Answers between meetings. Interested in growth, allergic to process.',
 'Friendly, fast, distracted. Interrupts. Will give you 60 seconds if you say something about pipeline or hiring. Likes bold claims but tests them. Ends the call if the caller reads a script.',
 'Talks fast, says "yeah yeah" and "what is the one line version". Mentions he is walking to another meeting.',
 '["Two of three SDRs missed quota last quarter", "Founder still closes every deal himself", "No time to coach new hires on calls"]'::jsonb,
 '["I am slammed, call me next quarter", "We do everything in-house", "How is this different from ChatGPT", "Not a priority right now"]'::jsonb,
 '["Caller gets to the point in one sentence", "Caller asks about the SDR team or quota", "Caller handles the timing objection with a reason to talk now", "Caller books a 15 minute slot this week"]'::jsonb,
 'VOICE_ID_FOUNDER', 3),
('gatekeeper', 'Priya Shah', 'Executive assistant to the CEO', 'Harbour & Vale, 900 staff, property management',
 'Protects the CEO''s diary. Can make or break the call.',
 'Professional and kind, but her job is to stop sales calls. Asks who you are, what it is about and whether the CEO is expecting you. Helps callers who are honest, clear and respectful of her role. Shuts down anyone who pretends to know the CEO.',
 'Warm, measured, exact. "May I ask what it is regarding?" "Is he expecting your call?"',
 '["CEO asked her to find a fix for slow tenant onboarding", "She books his calls on Tuesdays and Thursdays only", "She is judged on protecting his time"]'::jsonb,
 '["He is not available", "Can you send something to the info inbox", "Is he expecting your call", "We do not take sales calls"]'::jsonb,
 '["Caller gives their full name and company straight away", "Caller is honest that it is a cold call", "Caller treats her as a decision influencer and asks for her advice", "Caller gets a booked slot or the CEO''s direct email from her"]'::jsonb,
 'VOICE_ID_GATEKEEPER', 5)
on conflict do nothing;

insert into public.scenarios (slug, kind, title, rep_brief, persona_setup, goal, default_minutes) values
('cold-call', 'cold_call', 'Cold call: book the meeting',
 'You are calling out of the blue. They do not know you. Earn 30 seconds, find one reason to talk, and book a meeting. You sell the product named in your team settings (or "Sparring" if you have not set one).',
 'You were not expecting this call. You are in the middle of something. Answer with your name only. Give the caller one chance to earn 30 seconds. Only agree to a meeting if most win conditions are met.',
 'Book a specific time for a follow-up meeting.', 5),
('discovery', 'discovery', 'Discovery call: find the pain',
 'They agreed to a 15 minute discovery call last week. Ask good questions, find the pain behind the problem, put a number on it, and agree a next step. Talk less than 45% of the time.',
 'You agreed to this call last week but you are not sold. Answer questions honestly but briefly. Reveal a hidden pain only when asked a good, specific follow-up question. Share numbers only if asked twice or asked well.',
 'Uncover 2 pains with numbers and agree a next step with a date.', 12),
('objection-drill', 'objection_drill', 'Objection drill: rapid fire',
 'Short and sharp. They will throw objections at you one after another. Acknowledge, ask a question, answer briefly, and move on. No arguing.',
 'Open with your strongest objection. After the caller responds, raise the next one from your list, whether or not they handled the first well. Score nothing out loud. After 4 objections, either agree to a short follow-up (if most were handled well) or end politely.',
 'Handle 4 objections without arguing or discounting.', 4)
on conflict do nothing;

-- ---------------------------------------------------------------------
-- 20. STORAGE: the recordings bucket
-- ELI5: one private folder per team. Files are named
-- <workspace_id>/<session_id>.mp3. A rep can play their own recordings;
-- owners and managers can play the whole team's. Only the worker
-- (secret key) uploads.
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('recordings', 'recordings', false, 52428800, array['audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/ogg'])
on conflict (id) do nothing;

create policy "recordings select own or manager" on storage.objects for select to authenticated
  using (bucket_id = 'recordings'
         and (public.is_workspace_manager_text((storage.foldername(name))[1])
              or exists (select 1 from public.sessions s
                         where s.recording_path = name and s.user_id = (select auth.uid()))));

-- ---------------------------------------------------------------------
-- 21. REALTIME
-- ELI5: lets the call page flip from "Scoring your call" to the scorecard
-- the second the worker finishes, with no refresh.
-- ---------------------------------------------------------------------
alter publication supabase_realtime add table public.sessions;

-- ---------------------------------------------------------------------
-- 22. SCHEDULES (run later, after your edge functions are deployed)
-- ELI5: pg_cron is an alarm clock inside the database. pg_net lets the
-- alarm clock call a URL. Every minute it pokes the worker.
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
-- select cron.schedule('spr-worker',        '* * * * *',  $$ select public.invoke_edge('spr-worker') $$);
-- select cron.schedule('spr-reconcile',     '*/5 * * * *', $$ select public.invoke_edge('spr-reconcile') $$);
-- select cron.schedule('spr-notify',        '5 * * * *',  $$ select public.invoke_edge('spr-notify') $$);
--
-- Check it ran: select * from cron.job_run_details order by start_time desc limit 20;
`
