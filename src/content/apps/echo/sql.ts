// Echo single migration, pasted into the Supabase SQL editor once on a fresh project.

export const sql = `-- =====================================================================
-- Echo: full database migration
-- Paste this whole file into Supabase > SQL Editor > New query > Run.
-- Run it ONCE on a fresh project. Order: extensions, enums, tables,
-- helper functions, triggers, public page functions, RLS policies,
-- storage, realtime, schedules.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. EXTENSIONS
-- ELI5: extensions are add-ons for the database. pgcrypto gives us
-- secure random bytes and hashing for invite tokens.
-- ---------------------------------------------------------------------
create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------
-- 1. ENUMS
-- ELI5: an enum is a fixed list of allowed words for a column. An
-- episode can be 'transcribing' or 'ready', never 'banana'.
-- ---------------------------------------------------------------------
create type public.workspace_role as enum ('owner', 'admin', 'member');
create type public.episode_source as enum ('upload', 'rss');
create type public.episode_status as enum ('uploading', 'imported', 'queued', 'transcribing',
  'transcribed', 'generating', 'ready', 'failed');
create type public.asset_kind as enum ('titles', 'show_notes', 'chapters', 'quotes', 'clip_ideas',
  'newsletter', 'social', 'blog');
create type public.asset_status as enum ('pending', 'ready', 'failed');
create type public.audiogram_status as enum ('queued', 'rendering_audio', 'rendering_video', 'ready', 'failed');
create type public.audiogram_style as enum ('bars', 'line', 'minimal');
create type public.job_kind as enum ('fetch_transcript', 'gen_core', 'gen_distribution', 'gen_blog', 'voice_card');
create type public.job_status as enum ('queued', 'running', 'done', 'dead');
create type public.usage_kind as enum ('audio_minutes', 'generations', 'regenerations', 'audiograms', 'voice_cards');

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
  avatar_url text,
  current_workspace_id uuid,
  email_prefs jsonb not null default '{"episode_ready": true, "new_episode": true, "audiograms_ready": true, "usage": true}'::jsonb,
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
-- ELI5: a workspace is the podcaster's studio or the agency. Members
-- are the people in it. The owner's subscription pays for everyone.
-- ---------------------------------------------------------------------
create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 80),
  owner_id uuid not null references auth.users (id) on delete cascade,
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
-- ELI5: these are the bouncers. "Is this person in this workspace?"
-- and "Is this person an owner or admin here?". security definer lets
-- them read the members table without tripping over its own rules.
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

-- Same check from a Storage folder name (text). Never casts, so a junk
-- folder name returns false instead of an error.
create or replace function public.is_workspace_member_text(ws text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.workspace_members m
    where m.workspace_id::text = ws and m.user_id = (select auth.uid())
  );
$$;

create or replace function public.is_workspace_admin_text(ws text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.workspace_members m
    where m.workspace_id::text = ws and m.user_id = (select auth.uid()) and m.role in ('owner', 'admin')
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
-- 6. SHOWS
-- ELI5: one row per podcast. An agency workspace has many. The RSS
-- columns remember what we last saw in the feed so we only fetch
-- what is new. voice_sample is the host's own writing; voice_card is
-- what Claude learned from it.
-- ---------------------------------------------------------------------
create table public.shows (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  slug text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$'),
  description text check (description is null or char_length(description) <= 4000),
  artwork_path text,
  accent_hex text not null default '#8a6be0' check (accent_hex ~ '^#[0-9a-fA-F]{6}$'),
  default_style public.audiogram_style not null default 'bars',
  links jsonb not null default '{}'::jsonb,
  hide_badge boolean not null default false,
  rss_url text check (rss_url is null or rss_url ~ '^https?://'),
  rss_etag text,
  rss_last_modified text,
  last_polled_at timestamptz,
  poll_error text,
  poll_error_count integer not null default 0,
  auto_process boolean not null default false,
  voice_sample text check (voice_sample is null or char_length(voice_sample) <= 30000),
  voice_card jsonb,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index shows_workspace_idx on public.shows (workspace_id);
create index shows_created_by_idx on public.shows (created_by);
create index shows_poll_idx on public.shows (last_polled_at nulls first) where rss_url is not null;
create trigger shows_updated_at before update on public.shows
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- 7. EPISODES
-- ELI5: one row per episode, uploaded or found in the RSS feed. status
-- is where it is in the pipeline. The browser may only change the
-- title, slug, numbers and the published switch: everything else is
-- set by Echo's server code (see the guard triggers in section 15).
-- ---------------------------------------------------------------------
create table public.episodes (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  show_id uuid not null references public.shows (id) on delete cascade,
  source public.episode_source not null default 'upload',
  status public.episode_status not null default 'uploading',
  title text not null default 'Untitled episode' check (char_length(title) between 1 and 200),
  slug text check (slug is null or slug ~ '^[a-z0-9][a-z0-9-]{0,78}[a-z0-9]$'),
  episode_number integer check (episode_number is null or episode_number >= 0),
  season_number integer check (season_number is null or season_number >= 0),
  feed_description text,
  rss_guid text,
  rss_published_at timestamptz,
  audio_path text,
  enclosure_url text check (enclosure_url is null or enclosure_url ~ '^https?://'),
  reported_duration_sec integer check (reported_duration_sec is null or reported_duration_sec >= 0),
  duration_sec integer check (duration_sec is null or duration_sec >= 0),
  file_size_bytes bigint check (file_size_bytes is null or file_size_bytes >= 0),
  assemblyai_id text unique,
  error text,
  is_published boolean not null default false,
  published_at timestamptz,
  processed_at timestamptz,
  audio_deleted_at timestamptz,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (show_id, rss_guid),
  unique (show_id, slug)
);
create index episodes_workspace_idx on public.episodes (workspace_id, created_at desc);
create index episodes_show_idx on public.episodes (show_id);
create index episodes_created_by_idx on public.episodes (created_by);
create index episodes_status_idx on public.episodes (workspace_id, status);
create index episodes_cleanup_idx on public.episodes (processed_at)
  where source = 'upload' and audio_deleted_at is null;
create trigger episodes_updated_at before update on public.episodes
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- 8. TRANSCRIPTS
-- ELI5: what was said, who said it and when. words holds every word
-- with its time (used for quotes and audiogram captions) and never
-- leaves the server except a 60 second window. speakers maps "A" to
-- "Sam" so a rename shows everywhere at once.
-- ---------------------------------------------------------------------
create table public.transcripts (
  episode_id uuid primary key references public.episodes (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  text text not null,
  utterances jsonb not null default '[]'::jsonb,
  words jsonb not null default '[]'::jsonb,
  density integer[] not null default '{}',
  speakers jsonb not null default '{}'::jsonb,
  language text,
  word_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index transcripts_workspace_idx on public.transcripts (workspace_id);
create trigger transcripts_updated_at before update on public.transcripts
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- 9. ASSETS + HISTORY
-- ELI5: each written thing (titles, show notes, chapters...) is one row
-- per episode. Every change is copied into asset_history so Undo works.
-- We keep the last 10 versions per asset.
-- ---------------------------------------------------------------------
create table public.episode_assets (
  id uuid primary key default gen_random_uuid(),
  episode_id uuid not null references public.episodes (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  kind public.asset_kind not null,
  status public.asset_status not null default 'pending',
  content jsonb,
  version integer not null default 0,
  edited boolean not null default false,
  last_reason text not null default 'generated' check (last_reason in ('generated', 'regenerated', 'edited', 'restored')),
  model text,
  cost_micros bigint not null default 0,
  error text,
  updated_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (episode_id, kind)
);
create index episode_assets_episode_idx on public.episode_assets (episode_id);
create index episode_assets_workspace_idx on public.episode_assets (workspace_id);
create index episode_assets_updated_by_idx on public.episode_assets (updated_by);
create trigger episode_assets_updated_at before update on public.episode_assets
  for each row execute function public.set_updated_at();

create table public.asset_history (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references public.episode_assets (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  version integer not null,
  content jsonb not null,
  reason text not null,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (asset_id, version)
);
create index asset_history_asset_idx on public.asset_history (asset_id);
create index asset_history_workspace_idx on public.asset_history (workspace_id);
create index asset_history_created_by_idx on public.asset_history (created_by);

-- ---------------------------------------------------------------------
-- 10. AUDIOGRAMS
-- ELI5: one row per vertical video clip. Rendering happens on AWS in
-- two steps (cut the audio, then draw the video). The render ids let
-- us match Remotion's "done" messages to the right row.
-- ---------------------------------------------------------------------
create table public.audiograms (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  episode_id uuid not null references public.episodes (id) on delete cascade,
  show_id uuid not null references public.shows (id) on delete cascade,
  status public.audiogram_status not null default 'queued',
  style public.audiogram_style not null default 'bars',
  title text check (title is null or char_length(title) <= 80),
  start_ms integer not null check (start_ms >= 0),
  end_ms integer not null,
  caption_words jsonb not null default '[]'::jsonb,
  audio_render_id text unique,
  video_render_id text unique,
  render_bucket text,
  progress numeric not null default 0 check (progress between 0 and 1),
  output_path text,
  cost_micros bigint not null default 0,
  error text,
  started_at timestamptz,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint audiograms_length check (end_ms - start_ms between 30000 and 60000)
);
create index audiograms_workspace_idx on public.audiograms (workspace_id, created_at desc);
create index audiograms_episode_idx on public.audiograms (episode_id);
create index audiograms_show_idx on public.audiograms (show_id);
create index audiograms_created_by_idx on public.audiograms (created_by);
create index audiograms_stuck_idx on public.audiograms (started_at)
  where status in ('rendering_audio', 'rendering_video');
create trigger audiograms_updated_at before update on public.audiograms
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- 11. JOBS, METER, EMAIL, WEBHOOK DE-DUPLICATION, RATE LIMITS
-- ELI5: jobs is the worker's to-do list. usage_ledger is the meter that
-- every paid API call writes to, and that limits are read from. The
-- unique idempotency keys mean a retry can never count twice.
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
  last_error text,
  idempotency_key text not null unique,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index jobs_queue_idx on public.jobs (run_after) where status = 'queued';
create index jobs_workspace_idx on public.jobs (workspace_id, created_at desc);
create index jobs_ref_idx on public.jobs (ref_id);
create trigger jobs_updated_at before update on public.jobs
  for each row execute function public.set_updated_at();

create table public.usage_ledger (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null,
  kind public.usage_kind not null,
  quantity integer not null check (quantity > 0),
  cost_micros bigint not null default 0,
  ref_id uuid,
  idempotency_key text not null unique,
  created_at timestamptz not null default now()
);
create index usage_ledger_ws_kind_idx on public.usage_ledger (workspace_id, kind, created_at);
create index usage_ledger_user_idx on public.usage_ledger (user_id);

create table public.remotion_events (
  id text primary key,
  audiogram_id uuid references public.audiograms (id) on delete set null,
  type text not null,
  received_at timestamptz not null default now()
);
create index remotion_events_audiogram_idx on public.remotion_events (audiogram_id);

create table public.email_log (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces (id) on delete cascade,
  kind text not null,
  to_email text not null,
  subject text not null,
  dedupe_key text not null unique,
  resend_id text,
  status text not null default 'queued' check (status in ('queued', 'sent', 'failed', 'suppressed')),
  error text,
  created_at timestamptz not null default now()
);
create index email_log_workspace_idx on public.email_log (workspace_id, created_at desc);

create table public.email_suppressions (
  email text primary key,
  reason text not null default 'unsubscribed',
  created_at timestamptz not null default now()
);

create table public.rate_limits (
  key text not null,
  window_start timestamptz not null,
  hits integer not null default 0,
  primary key (key, window_start)
);

-- ---------------------------------------------------------------------
-- 12. BILLING (written only by the Stripe webhook with the secret key)
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

-- Which Stripe price is which plan. After you create prices in Stripe run:
-- insert into public.plan_prices values ('price_...', 'creator'), ...
create table public.plan_prices (
  price_id text primary key,
  plan text not null check (plan in ('creator', 'studio', 'agency'))
);

-- Test and support overrides. No policies: only you, in the SQL editor.
create table public.workspace_limit_overrides (
  workspace_id uuid primary key references public.workspaces (id) on delete cascade,
  audio_minutes integer,
  audiograms integer,
  regenerations integer,
  shows integer,
  seats integer
);

-- ---------------------------------------------------------------------
-- 13. ACCESS AND LIMIT FUNCTIONS
-- ELI5: has_active_access is the paywall: the owner's trial or paid plan
-- keeps the whole workspace open. plan_limits returns the numbers from
-- the PRD. usage_this_month adds up the meter.
-- ---------------------------------------------------------------------
create or replace function public.has_active_access(ws uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.workspaces w
    join public.subscriptions s on s.user_id = w.owner_id
    where w.id = ws and s.status in ('trialing', 'active')
  );
$$;

-- Public pages stay live for 30 days after a subscription ends.
create or replace function public.pages_live(ws uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.has_active_access(ws) or exists (
    select 1 from public.workspaces w
    join public.subscriptions s on s.user_id = w.owner_id
    where w.id = ws and s.updated_at > now() - interval '30 days'
  );
$$;

create or replace function public.plan_limits(ws uuid)
returns table (plan text, seats integer, shows integer, audio_minutes integer, max_episode_minutes integer,
               audiograms integer, regenerations integer, voice_cards integer, remove_badge boolean)
language plpgsql stable security definer set search_path = '' as $$
declare
  v_plan text;
  v_status text;
  o record;
begin
  -- Logged-in callers may only ask about their own workspaces.
  if (select auth.uid()) is not null and not public.is_workspace_member(ws) then
    return;
  end if;

  select coalesce(pp.plan, 'creator'), s.status into v_plan, v_status
  from public.workspaces w
  left join public.subscriptions s on s.user_id = w.owner_id
  left join public.plan_prices pp on pp.price_id = s.price_id
  where w.id = ws;

  if v_plan is null then v_plan := 'creator'; end if;

  if v_plan = 'agency' then
    plan := 'agency'; seats := 10; shows := 25; audio_minutes := 3000; max_episode_minutes := 240;
    audiograms := 150; regenerations := 100; voice_cards := 100; remove_badge := true;
  elsif v_plan = 'studio' then
    plan := 'studio'; seats := 3; shows := 5; audio_minutes := 1200; max_episode_minutes := 180;
    audiograms := 50; regenerations := 50; voice_cards := 25; remove_badge := true;
  else
    plan := 'creator'; seats := 1; shows := 1; audio_minutes := 360; max_episode_minutes := 120;
    audiograms := 20; regenerations := 25; voice_cards := 10; remove_badge := false;
  end if;

  -- The 7 day trial: 2 audio hours, 5 audiograms, 10 regenerations.
  if v_status = 'trialing' then
    audio_minutes := least(audio_minutes, 120);
    audiograms := least(audiograms, 5);
    regenerations := least(regenerations, 10);
  end if;

  select * into o from public.workspace_limit_overrides where workspace_id = ws;
  if found then
    audio_minutes := coalesce(o.audio_minutes, audio_minutes);
    audiograms := coalesce(o.audiograms, audiograms);
    regenerations := coalesce(o.regenerations, regenerations);
    shows := coalesce(o.shows, shows);
    seats := coalesce(o.seats, seats);
  end if;
  return next;
end;
$$;

create or replace function public.usage_this_month(ws uuid, k public.usage_kind)
returns integer language sql stable security definer set search_path = '' as $$
  select coalesce(sum(quantity), 0)::integer from public.usage_ledger
  where workspace_id = ws and kind = k and created_at >= date_trunc('month', now())
    and ((select auth.uid()) is null or public.is_workspace_member(ws));
$$;

-- One call for the sidebar meter and the Billing page.
create or replace function public.workspace_usage(ws uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select case when (select auth.uid()) is not null and not public.is_workspace_member(ws) then null else
    jsonb_build_object(
      'plan', l.plan,
      'audio_minutes', jsonb_build_object('used', public.usage_this_month(ws, 'audio_minutes'), 'limit', l.audio_minutes),
      'audiograms', jsonb_build_object('used', public.usage_this_month(ws, 'audiograms'), 'limit', l.audiograms),
      'regenerations', jsonb_build_object('used', public.usage_this_month(ws, 'regenerations'), 'limit', l.regenerations),
      'shows', jsonb_build_object('used', (select count(*) from public.shows s where s.workspace_id = ws), 'limit', l.shows),
      'seats', jsonb_build_object('used', (select count(*) from public.workspace_members m where m.workspace_id = ws), 'limit', l.seats),
      'max_episode_minutes', l.max_episode_minutes,
      'resets_at', date_trunc('month', now()) + interval '1 month'
    ) end
  from public.plan_limits(ws) l;
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
-- 14. WORKSPACE AND INVITE FUNCTIONS (called from the app)
-- ELI5: creating a workspace and joining one happen inside the database
-- in one step, so seats and roles can never be skipped.
-- ---------------------------------------------------------------------
create or replace function public.create_workspace(p_name text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_ws uuid;
begin
  if v_uid is null then raise exception 'not logged in'; end if;
  if (select count(*) from public.workspaces where owner_id = v_uid) >= 5 then
    raise exception 'You can own up to 5 workspaces';
  end if;
  insert into public.workspaces (name, owner_id) values (trim(p_name), v_uid) returning id into v_ws;
  insert into public.workspace_members (workspace_id, user_id, role) values (v_ws, v_uid, 'owner');
  update public.profiles set current_workspace_id = v_ws where id = v_uid;
  return v_ws;
end;
$$;

create or replace function public.switch_workspace(p_ws uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_workspace_member(p_ws) then raise exception 'not a member of this workspace'; end if;
  update public.profiles set current_workspace_id = p_ws where id = (select auth.uid());
end;
$$;

-- Returns the raw token ONCE (put it in the invite email). Only its hash is stored.
create or replace function public.create_invite(p_ws uuid, p_email text, p_role public.workspace_role)
returns text language plpgsql security definer set search_path = '' as $$
declare
  v_token text := encode(extensions.gen_random_bytes(32), 'hex');
  v_seats integer;
  v_used integer;
begin
  if not public.has_workspace_role(p_ws, array['owner', 'admin']::public.workspace_role[]) then
    raise exception 'only owners and admins can invite';
  end if;
  if p_role = 'owner' then raise exception 'invite as admin or member'; end if;
  select seats into v_seats from public.plan_limits(p_ws);
  select (select count(*) from public.workspace_members where workspace_id = p_ws)
       + (select count(*) from public.workspace_invites
          where workspace_id = p_ws and accepted_at is null and expires_at > now())
    into v_used;
  if v_used >= v_seats then
    raise exception 'All % seats are in use. Upgrade for more.', v_seats;
  end if;
  insert into public.workspace_invites (workspace_id, email, role, token_hash, invited_by)
  values (p_ws, lower(trim(p_email)), p_role, encode(extensions.digest(v_token, 'sha256'), 'hex'), (select auth.uid()));
  return v_token;
end;
$$;

create or replace function public.accept_invite(p_token text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_email text;
  v_inv public.workspace_invites;
  v_seats integer;
begin
  if v_uid is null then raise exception 'not logged in'; end if;
  select email into v_email from auth.users where id = v_uid;
  select * into v_inv from public.workspace_invites
  where token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex')
    and accepted_at is null and expires_at > now()
  for update;
  if not found then raise exception 'This invite has expired or was already used'; end if;
  if lower(v_inv.email) <> lower(v_email) then
    raise exception 'This invite was sent to a different email address';
  end if;
  select seats into v_seats from public.plan_limits(v_inv.workspace_id);
  if (select count(*) from public.workspace_members where workspace_id = v_inv.workspace_id) >= v_seats then
    raise exception 'This workspace has no free seats';
  end if;
  insert into public.workspace_members (workspace_id, user_id, role)
  values (v_inv.workspace_id, v_uid, v_inv.role)
  on conflict (workspace_id, user_id) do nothing;
  update public.workspace_invites set accepted_at = now() where id = v_inv.id;
  update public.profiles set current_workspace_id = v_inv.workspace_id where id = v_uid;
  return v_inv.workspace_id;
end;
$$;

-- ---------------------------------------------------------------------
-- 15. WORKER FUNCTIONS (edge functions only, secret key)
-- ELI5: claim_jobs hands the worker a few to-dos and marks them "mine"
-- so two workers never grab the same one. release_stuck_jobs puts back
-- any job a crashed worker was holding.
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

-- How many episodes this workspace has at AssemblyAI right now (cap is 3).
create or replace function public.transcriptions_in_flight(ws uuid)
returns integer language sql stable security definer set search_path = '' as $$
  select count(*)::integer from public.episodes
  where workspace_id = ws and status in ('queued', 'transcribing');
$$;

-- ---------------------------------------------------------------------
-- 16. GUARD TRIGGERS
-- ELI5: RLS decides WHICH rows you can touch. These triggers decide
-- WHICH COLUMNS. A logged-in browser can rename an episode but cannot
-- mark it "ready", change its duration (which is what we bill on) or
-- move it into someone else's workspace. Server code using the secret
-- key (role service_role) and you in the SQL editor are not blocked.
-- ---------------------------------------------------------------------
create or replace function public.guard_show_write()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_limit integer;
begin
  if (select auth.role()) = 'authenticated' then
    if tg_op = 'INSERT' then
      select shows into v_limit from public.plan_limits(new.workspace_id);
      if (select count(*) from public.shows where workspace_id = new.workspace_id) >= coalesce(v_limit, 1) then
        raise exception 'Your plan includes % show(s). Upgrade to add more.', coalesce(v_limit, 1);
      end if;
      new.created_by := (select auth.uid());
      new.voice_card := null; new.rss_etag := null; new.rss_last_modified := null;
      new.last_polled_at := null; new.poll_error := null; new.poll_error_count := 0;
    else
      if new.workspace_id is distinct from old.workspace_id
        or new.voice_card is distinct from old.voice_card
        or new.rss_etag is distinct from old.rss_etag
        or new.rss_last_modified is distinct from old.rss_last_modified
        or new.last_polled_at is distinct from old.last_polled_at
        or new.created_by is distinct from old.created_by then
        raise exception 'These show fields are set by Echo';
      end if;
      -- A new feed URL starts fresh.
      if new.rss_url is distinct from old.rss_url then
        new.rss_etag := null; new.rss_last_modified := null; new.last_polled_at := null;
        new.poll_error := null; new.poll_error_count := 0;
      end if;
      -- Clearing the error after the user fixed the feed is allowed; setting one is not.
      if new.poll_error is not null and new.poll_error is distinct from old.poll_error then
        raise exception 'These show fields are set by Echo';
      end if;
      if new.poll_error is null then new.poll_error_count := 0; end if;
    end if;
  end if;
  return new;
end;
$$;
create trigger shows_guard before insert or update on public.shows
  for each row execute function public.guard_show_write();

-- When the voice sample changes, queue a job to rebuild the voice card.
create or replace function public.queue_voice_card()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.voice_sample is not null and char_length(new.voice_sample) >= 200
     and (tg_op = 'INSERT' or new.voice_sample is distinct from old.voice_sample) then
    insert into public.jobs (workspace_id, kind, ref_id, idempotency_key)
    values (new.workspace_id, 'voice_card', new.id,
            'voice:' || new.id || ':' || md5(new.voice_sample))
    on conflict (idempotency_key) do nothing;
  end if;
  return new;
end;
$$;
create trigger shows_voice_card after insert or update of voice_sample on public.shows
  for each row execute function public.queue_voice_card();

create or replace function public.guard_episode_insert()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  -- The workspace always comes from the show, so nobody can point an
  -- episode at someone else's show (RLS then rejects the row).
  select s.workspace_id into new.workspace_id from public.shows s where s.id = new.show_id;
  if new.workspace_id is null then raise exception 'show not found'; end if;
  if (select auth.role()) = 'authenticated' then
    new.source := 'upload';
    new.status := 'uploading';
    new.assemblyai_id := null;
    new.duration_sec := null;
    new.error := null;
    new.is_published := false;
    new.published_at := null;
    new.processed_at := null;
    new.audio_deleted_at := null;
    new.enclosure_url := null;
    new.rss_guid := null;
    new.created_by := (select auth.uid());
    if new.audio_path is not null and split_part(new.audio_path, '/', 1) <> new.workspace_id::text then
      raise exception 'audio_path must start with the workspace id';
    end if;
  end if;
  return new;
end;
$$;
create trigger episodes_guard_insert before insert on public.episodes
  for each row execute function public.guard_episode_insert();

create or replace function public.guard_episode_update()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.role()) = 'authenticated' then
    if new.workspace_id is distinct from old.workspace_id
      or new.show_id is distinct from old.show_id
      or new.source is distinct from old.source
      or new.status is distinct from old.status
      or new.audio_path is distinct from old.audio_path
      or new.enclosure_url is distinct from old.enclosure_url
      or new.duration_sec is distinct from old.duration_sec
      or new.assemblyai_id is distinct from old.assemblyai_id
      or new.error is distinct from old.error
      or new.processed_at is distinct from old.processed_at
      or new.audio_deleted_at is distinct from old.audio_deleted_at
      or new.rss_guid is distinct from old.rss_guid
      or new.created_by is distinct from old.created_by then
      raise exception 'These episode fields are set by Echo';
    end if;
    -- The browser may record size and length while still uploading, never after.
    if old.status <> 'uploading' and (new.reported_duration_sec is distinct from old.reported_duration_sec
       or new.file_size_bytes is distinct from old.file_size_bytes) then
      raise exception 'These episode fields are set by Echo';
    end if;
  end if;
  if new.is_published and not old.is_published then
    if new.status <> 'ready' then raise exception 'Only ready episodes can be published'; end if;
    if new.slug is null then raise exception 'Set a page address (slug) before publishing'; end if;
    new.published_at := coalesce(new.published_at, now());
  end if;
  return new;
end;
$$;
create trigger episodes_guard_update before update on public.episodes
  for each row execute function public.guard_episode_update();

create or replace function public.guard_transcript_update()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.role()) = 'authenticated' then
    if new.text is distinct from old.text or new.utterances is distinct from old.utterances
      or new.words is distinct from old.words or new.density is distinct from old.density
      or new.workspace_id is distinct from old.workspace_id
      or new.episode_id is distinct from old.episode_id then
      raise exception 'Only speaker names can be changed';
    end if;
    if jsonb_typeof(new.speakers) <> 'object' or length(new.speakers::text) > 4000 then
      raise exception 'Speaker names are too long';
    end if;
  end if;
  return new;
end;
$$;
create trigger transcripts_guard before update on public.transcripts
  for each row execute function public.guard_transcript_update();

-- Assets: the browser may only change content (an edit). Every content
-- change bumps the version and writes history; old history is pruned.
create or replace function public.track_asset_change()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.role()) = 'authenticated' then
    if new.kind is distinct from old.kind or new.episode_id is distinct from old.episode_id
      or new.workspace_id is distinct from old.workspace_id or new.status is distinct from old.status
      or new.model is distinct from old.model or new.cost_micros is distinct from old.cost_micros
      or new.version is distinct from old.version or new.error is distinct from old.error then
      raise exception 'Only the asset content can be edited';
    end if;
    if old.status <> 'ready' then raise exception 'Wait until this asset is ready'; end if;
    if new.content is null or length(new.content::text) > 200000 then raise exception 'Asset is empty or too long'; end if;
    if new.last_reason <> 'restored' then new.last_reason := 'edited'; end if;
    new.edited := true;
    new.updated_by := (select auth.uid());
  end if;
  if new.content is distinct from old.content and new.content is not null then
    new.version := old.version + 1;
    insert into public.asset_history (asset_id, workspace_id, version, content, reason, created_by)
    values (new.id, new.workspace_id, new.version, new.content, new.last_reason, new.updated_by);
    delete from public.asset_history where asset_id = new.id and version <= new.version - 10;
  end if;
  return new;
end;
$$;
create trigger episode_assets_track before update on public.episode_assets
  for each row execute function public.track_asset_change();

-- The owner of a workspace never changes, and the owner row in members
-- cannot be demoted or removed through the app.
create or replace function public.guard_workspace_owner()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.role()) = 'authenticated' and new.owner_id is distinct from old.owner_id then
    raise exception 'The workspace owner cannot be changed here';
  end if;
  return new;
end;
$$;
create trigger workspaces_guard_owner before update on public.workspaces
  for each row execute function public.guard_workspace_owner();

create or replace function public.guard_member_change()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.role()) = 'authenticated' then
    if tg_op = 'DELETE' then
      -- pg_trigger_depth() > 1 means this delete comes from deleting the
      -- whole workspace (a cascade), which the owner is allowed to do.
      if old.role = 'owner' and pg_trigger_depth() <= 1 then
        raise exception 'The owner cannot be removed';
      end if;
      return old;
    end if;
    if old.role = 'owner' or new.role = 'owner' then raise exception 'Ownership cannot be changed here'; end if;
    if new.user_id is distinct from old.user_id or new.workspace_id is distinct from old.workspace_id then
      raise exception 'Only the role can change';
    end if;
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;
create trigger workspace_members_guard before update or delete on public.workspace_members
  for each row execute function public.guard_member_change();

-- ---------------------------------------------------------------------
-- 17. PUBLIC PAGE FUNCTIONS (the only door for anonymous visitors)
-- ELI5: listeners never read tables. These functions hand back a small,
-- fixed bundle of published data and nothing else: no emails, no costs,
-- no word timings, no unpublished episodes.
-- ---------------------------------------------------------------------
create or replace function public.public_episode_json(p_episode_id uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'id', e.id,
    'title', e.title,
    'slug', e.slug,
    'episode_number', e.episode_number,
    'season_number', e.season_number,
    'published_at', coalesce(e.rss_published_at, e.published_at),
    'duration_sec', e.duration_sec,
    'audio_url', e.enclosure_url,
    'show', jsonb_build_object(
      'name', s.name, 'slug', s.slug, 'artwork_path', s.artwork_path,
      'accent_hex', s.accent_hex, 'links', s.links,
      'badge', not (s.hide_badge and coalesce((select l.remove_badge from public.plan_limits(s.workspace_id) l), false))),
    'show_notes', (select a.content from public.episode_assets a where a.episode_id = e.id and a.kind = 'show_notes' and a.status = 'ready'),
    'chapters', (select a.content from public.episode_assets a where a.episode_id = e.id and a.kind = 'chapters' and a.status = 'ready'),
    'quotes', (select a.content from public.episode_assets a where a.episode_id = e.id and a.kind = 'quotes' and a.status = 'ready'),
    'seo', (select jsonb_build_object('title', a.content ->> 'seo_title', 'description', a.content ->> 'meta_description')
            from public.episode_assets a where a.episode_id = e.id and a.kind = 'blog' and a.status = 'ready'),
    'speakers', t.speakers,
    'utterances', t.utterances
  )
  from public.episodes e
  join public.shows s on s.id = e.show_id
  left join public.transcripts t on t.episode_id = e.id
  where e.id = p_episode_id and e.is_published and e.status = 'ready' and public.pages_live(e.workspace_id);
$$;

create or replace function public.get_public_episode(p_show_slug text, p_episode_slug text)
returns jsonb language sql stable security definer set search_path = '' as $$
  select public.public_episode_json(e.id)
  from public.episodes e join public.shows s on s.id = e.show_id
  where s.slug = p_show_slug and e.slug = p_episode_slug and e.is_published
  limit 1;
$$;

create or replace function public.get_public_episode_by_id(p_episode_id uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select public.public_episode_json(p_episode_id);
$$;

create or replace function public.get_public_show(p_show_slug text)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'name', s.name, 'slug', s.slug, 'description', s.description,
    'artwork_path', s.artwork_path, 'accent_hex', s.accent_hex, 'links', s.links,
    'badge', not (s.hide_badge and coalesce((select l.remove_badge from public.plan_limits(s.workspace_id) l), false)),
    'episodes', coalesce((
      select jsonb_agg(jsonb_build_object(
        'title', e.title, 'slug', e.slug, 'episode_number', e.episode_number,
        'published_at', coalesce(e.rss_published_at, e.published_at), 'duration_sec', e.duration_sec)
        order by coalesce(e.rss_published_at, e.published_at) desc)
      from public.episodes e
      where e.show_id = s.id and e.is_published and e.status = 'ready'), '[]'::jsonb)
  )
  from public.shows s
  where s.slug = p_show_slug and public.pages_live(s.workspace_id);
$$;

-- For sitemap.xml: every published page (show slug, episode slug, updated).
create or replace function public.public_sitemap()
returns table (show_slug text, episode_slug text, updated_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select s.slug, e.slug, e.updated_at
  from public.episodes e join public.shows s on s.id = e.show_id
  where e.is_published and e.status = 'ready' and e.slug is not null and public.pages_live(e.workspace_id)
  order by e.updated_at desc
  limit 45000;
$$;

-- ---------------------------------------------------------------------
-- 18. FUNCTION PERMISSIONS
-- ELI5: Supabase lets everyone run new functions by default. We take
-- that away, then give each function only to who needs it.
-- ---------------------------------------------------------------------
revoke execute on function public.claim_jobs(integer) from public, anon, authenticated;
revoke execute on function public.release_stuck_jobs() from public, anon, authenticated;
revoke execute on function public.try_rate_limit(text, integer, integer) from public, anon, authenticated;
revoke execute on function public.transcriptions_in_flight(uuid) from public, anon, authenticated;
revoke execute on function public.public_episode_json(uuid) from public, anon, authenticated;
revoke execute on function public.has_active_access(uuid) from public, anon;
revoke execute on function public.pages_live(uuid) from public, anon, authenticated;
revoke execute on function public.plan_limits(uuid) from public, anon;
revoke execute on function public.usage_this_month(uuid, public.usage_kind) from public, anon;
revoke execute on function public.workspace_usage(uuid) from public, anon;
revoke execute on function public.create_workspace(text) from public, anon;
revoke execute on function public.switch_workspace(uuid) from public, anon;
revoke execute on function public.create_invite(uuid, text, public.workspace_role) from public, anon;
revoke execute on function public.accept_invite(text) from public, anon;
grant execute on function public.get_public_episode(text, text) to anon, authenticated;
grant execute on function public.get_public_episode_by_id(uuid) to anon, authenticated;
grant execute on function public.get_public_show(text) to anon, authenticated;
grant execute on function public.public_sitemap() to anon, authenticated;

-- ---------------------------------------------------------------------
-- 19. ROW LEVEL SECURITY
-- ELI5: RLS is a filter on every table. Without a matching policy, a
-- query returns nothing. Every table below has RLS on; tables with no
-- policies are server-only (the secret key skips RLS).
-- ---------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.workspace_invites enable row level security;
alter table public.shows enable row level security;
alter table public.episodes enable row level security;
alter table public.transcripts enable row level security;
alter table public.episode_assets enable row level security;
alter table public.asset_history enable row level security;
alter table public.audiograms enable row level security;
alter table public.jobs enable row level security;
alter table public.usage_ledger enable row level security;
alter table public.remotion_events enable row level security;
alter table public.email_log enable row level security;
alter table public.email_suppressions enable row level security;
alter table public.rate_limits enable row level security;
alter table public.subscriptions enable row level security;
alter table public.stripe_events enable row level security;
alter table public.plan_prices enable row level security;
alter table public.workspace_limit_overrides enable row level security;

-- Belt and braces: anonymous visitors get no table access at all.
-- Public pages go through the functions in section 17.
revoke all on all tables in schema public from anon;

-- Profiles: yourself, and teammates' names for "created by" columns.
create policy "profiles select self or teammate" on public.profiles for select to authenticated
  using (id = (select auth.uid()) or public.shares_workspace_with(id));
create policy "profiles update self" on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- Workspaces: created only through create_workspace().
create policy "workspaces select member" on public.workspaces for select to authenticated
  using (public.is_workspace_member(id));
create policy "workspaces update admin" on public.workspaces for update to authenticated
  using (public.has_workspace_role(id, array['owner', 'admin']::public.workspace_role[]))
  with check (public.has_workspace_role(id, array['owner', 'admin']::public.workspace_role[]));
create policy "workspaces delete owner" on public.workspaces for delete to authenticated
  using (owner_id = (select auth.uid()));

-- Members: joined only through accept_invite(). Owners change roles,
-- admins remove members, anyone can leave.
create policy "members select member" on public.workspace_members for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy "members update owner" on public.workspace_members for update to authenticated
  using (public.has_workspace_role(workspace_id, array['owner']::public.workspace_role[]))
  with check (public.has_workspace_role(workspace_id, array['owner']::public.workspace_role[]));
create policy "members delete admin or self" on public.workspace_members for delete to authenticated
  using (user_id = (select auth.uid())
         or public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]));

-- Invites: created through create_invite(); owners and admins see and revoke.
create policy "invites select admin" on public.workspace_invites for select to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]));
create policy "invites delete admin" on public.workspace_invites for delete to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]));

-- Shows: members read, owners and admins write.
create policy "shows select member" on public.shows for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy "shows insert admin" on public.shows for insert to authenticated
  with check (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]));
create policy "shows update admin" on public.shows for update to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]))
  with check (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]));
create policy "shows delete admin" on public.shows for delete to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]));

-- Episodes: members do everything except delete other people's episodes.
create policy "episodes select member" on public.episodes for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy "episodes insert member" on public.episodes for insert to authenticated
  with check (public.is_workspace_member(workspace_id) and public.has_active_access(workspace_id));
create policy "episodes update member" on public.episodes for update to authenticated
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));
create policy "episodes delete creator or admin" on public.episodes for delete to authenticated
  using (created_by = (select auth.uid())
         or public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]));

-- Transcripts: written by the worker; members read and rename speakers.
create policy "transcripts select member" on public.transcripts for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy "transcripts update member" on public.transcripts for update to authenticated
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));

-- Assets: created by the worker; members read and edit content.
create policy "assets select member" on public.episode_assets for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy "assets update member" on public.episode_assets for update to authenticated
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));

create policy "asset history select member" on public.asset_history for select to authenticated
  using (public.is_workspace_member(workspace_id));

-- Audiograms: created by ech-render-audiogram; members read; creator or admin delete.
create policy "audiograms select member" on public.audiograms for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy "audiograms delete creator or admin" on public.audiograms for delete to authenticated
  using (created_by = (select auth.uid())
         or public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]));

-- Jobs and the meter: read-only for members (Help page and usage meters).
create policy "jobs select member" on public.jobs for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy "usage select member" on public.usage_ledger for select to authenticated
  using (public.is_workspace_member(workspace_id));

-- Email log: owners and admins can see what was sent.
create policy "email log select admin" on public.email_log for select to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]));

-- Billing: you can read your own subscription row. Only the webhook writes.
create policy "subscriptions select own" on public.subscriptions for select to authenticated
  using (user_id = (select auth.uid()));
create policy "plan prices select all" on public.plan_prices for select to authenticated
  using (true);

-- No policies on purpose (server only): remotion_events, email_suppressions,
-- rate_limits, stripe_events, workspace_limit_overrides.

-- ---------------------------------------------------------------------
-- 20. LIST VIEW (obeys the caller's RLS)
-- ELI5: one row per episode with the numbers the Episodes table shows.
-- security_invoker means it only shows rows you are allowed to see.
-- ---------------------------------------------------------------------
create or replace view public.episode_list with (security_invoker = true) as
select
  e.id, e.workspace_id, e.show_id, s.name as show_name, s.artwork_path, e.title, e.episode_number,
  e.status, e.is_published, e.source, coalesce(e.duration_sec, e.reported_duration_sec) as length_sec,
  e.error, e.created_at, e.updated_at,
  (select count(*) from public.audiograms a where a.episode_id = e.id and a.status = 'ready') as audiogram_count
from public.episodes e
join public.shows s on s.id = e.show_id;

-- ---------------------------------------------------------------------
-- 21. STORAGE BUCKETS + POLICIES
-- ELI5: three folders. episode-audio holds uploads (private),
-- audiograms holds rendered MP4s (private), show-art holds artwork
-- (public, because artwork is public on every podcast app anyway).
-- Files sit under a folder named after the workspace id.
-- Free plan caps each upload at 50 MB. On Pro, raise the global limit:
-- Storage > Settings > Upload file size limit > 1 GB.
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('episode-audio', 'episode-audio', false, 1073741824,
    array['audio/mpeg', 'audio/mp4', 'audio/x-m4a', 'audio/aac', 'audio/wav', 'audio/x-wav',
          'video/mp4', 'video/quicktime']),
  ('audiograms', 'audiograms', false, 52428800, array['video/mp4', 'application/x-subrip']),
  ('show-art', 'show-art', true, 10485760, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do nothing;

create policy "episode audio select member" on storage.objects for select to authenticated
  using (bucket_id = 'episode-audio' and public.is_workspace_member_text((storage.foldername(name))[1]));
create policy "episode audio insert member" on storage.objects for insert to authenticated
  with check (bucket_id = 'episode-audio' and public.is_workspace_member_text((storage.foldername(name))[1]));
create policy "episode audio update member" on storage.objects for update to authenticated
  using (bucket_id = 'episode-audio' and public.is_workspace_member_text((storage.foldername(name))[1]))
  with check (bucket_id = 'episode-audio' and public.is_workspace_member_text((storage.foldername(name))[1]));
create policy "episode audio delete member" on storage.objects for delete to authenticated
  using (bucket_id = 'episode-audio' and public.is_workspace_member_text((storage.foldername(name))[1]));

-- Audiograms: members download; only edge functions (secret key) upload.
create policy "audiograms files select member" on storage.objects for select to authenticated
  using (bucket_id = 'audiograms' and public.is_workspace_member_text((storage.foldername(name))[1]));
create policy "audiograms files delete admin" on storage.objects for delete to authenticated
  using (bucket_id = 'audiograms' and public.is_workspace_admin_text((storage.foldername(name))[1]));

-- Show art: anyone can view (public bucket); owners and admins upload.
create policy "show art select member" on storage.objects for select to authenticated
  using (bucket_id = 'show-art' and public.is_workspace_member_text((storage.foldername(name))[1]));
create policy "show art insert admin" on storage.objects for insert to authenticated
  with check (bucket_id = 'show-art' and public.is_workspace_admin_text((storage.foldername(name))[1]));
create policy "show art update admin" on storage.objects for update to authenticated
  using (bucket_id = 'show-art' and public.is_workspace_admin_text((storage.foldername(name))[1]))
  with check (bucket_id = 'show-art' and public.is_workspace_admin_text((storage.foldername(name))[1]));
create policy "show art delete admin" on storage.objects for delete to authenticated
  using (bucket_id = 'show-art' and public.is_workspace_admin_text((storage.foldername(name))[1]));

-- ---------------------------------------------------------------------
-- 22. REALTIME
-- ELI5: lets the Episodes page, the episode workspace and the
-- Audiograms panel update live as the worker moves things along.
-- Realtime still obeys RLS, so you only hear about your own rows.
-- ---------------------------------------------------------------------
alter publication supabase_realtime add table public.episodes;
alter publication supabase_realtime add table public.episode_assets;
alter publication supabase_realtime add table public.audiograms;

-- ---------------------------------------------------------------------
-- 23. SCHEDULES (run later, after your edge functions are deployed)
-- ELI5: pg_cron is an alarm clock inside the database. pg_net lets the
-- alarm clock call a URL. Every minute it pokes the worker, every 15
-- minutes it checks RSS feeds.
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
-- select cron.schedule('ech-worker',   '* * * * *',    $$ select public.invoke_edge('ech-worker') $$);
-- select cron.schedule('ech-rss-poll', '*/15 * * * *', $$ select public.invoke_edge('ech-rss-poll') $$);
--
-- Check it ran: select * from cron.job_run_details order by start_time desc limit 20;
`
