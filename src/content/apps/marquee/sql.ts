// Marquee single migration, pasted into the Supabase SQL editor once on a fresh project.

export const sql = `-- =====================================================================
-- Marquee: full database migration
-- Paste this whole file into Supabase > SQL Editor > New query > Run.
-- Run it ONCE on a fresh project. Order: extensions, enums, tables,
-- helper functions, triggers, RLS policies, storage, realtime, schedules.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. EXTENSIONS
-- ELI5: extensions are add-ons for the database. pgcrypto gives us
-- secure random bytes and SHA-256 hashing for invite tokens.
-- ---------------------------------------------------------------------
create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------
-- 1. ENUMS
-- ELI5: an enum is a fixed list of allowed words for a column. A test
-- can be 'running' or 'decided', never 'banana'.
-- ---------------------------------------------------------------------
create type public.workspace_role as enum ('owner', 'admin', 'editor');
create type public.face_status as enum ('uploaded', 'processing', 'ready', 'failed');
create type public.face_expression as enum ('smiling', 'laughing', 'shocked', 'serious', 'thinking',
  'pointing', 'confused', 'excited');
create type public.generation_status as enum ('queued', 'briefing', 'rendering', 'ready', 'partial', 'failed');
create type public.concept_status as enum ('queued', 'submitted', 'rendered', 'stored', 'failed');
create type public.concept_angle as enum ('curiosity', 'bold_claim', 'before_after', 'number', 'emotion',
  'versus', 'warning', 'behind_scenes');
create type public.concept_layout as enum ('face_right_text_left', 'face_left_text_right',
  'face_center_text_top', 'split_versus');
create type public.image_model as enum ('flux', 'ideogram');
create type public.channel_status as enum ('connected', 'needs_reauth', 'disconnected');
create type public.test_status as enum ('draft', 'scheduled', 'running', 'collecting', 'decided',
  'no_winner', 'cancelled', 'failed');
create type public.rotation_status as enum ('pending', 'set', 'failed', 'skipped');
create type public.job_queue as enum ('ai', 'youtube');
create type public.job_kind as enum ('concept_brief', 'render_concept', 'store_concept', 'poll_fal',
  'cutout_face', 'rotate', 'set_thumbnail', 'fetch_reach', 'fetch_video_daily', 'decide', 'sync_videos');
create type public.job_status as enum ('queued', 'running', 'done', 'dead');
create type public.usage_kind as enum ('concepts', 'face_cutouts', 'ai_briefs');

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
-- ELI5: Supabase keeps logins in auth.users. We keep a friendly
-- profile next to it, created automatically the moment someone signs up.
-- ---------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null default '',
  full_name text not null default '',
  timezone text not null default 'Europe/London',
  current_workspace_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, coalesce(new.email, ''), coalesce(new.raw_user_meta_data ->> 'full_name', ''))
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
-- ELI5: a workspace is a channel's team (or an agency). Members are the
-- people in it. The owner's subscription pays for everyone.
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
  role public.workspace_role not null default 'editor',
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);
create index workspace_members_user_idx on public.workspace_members (user_id);

create table public.workspace_invites (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  email text not null check (position('@' in email) > 1),
  role public.workspace_role not null default 'editor' check (role <> 'owner'),
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
-- ELI5: these are the bouncers. "Is this person in this workspace?" and
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

-- Storage paths are text. This turns the first folder into a uuid safely.
create or replace function public.is_workspace_member_text(ws text)
returns boolean language plpgsql stable security definer set search_path = '' as $$
begin
  return public.is_workspace_member(ws::uuid);
exception when invalid_text_representation then
  return false;
end;
$$;

create or replace function public.has_workspace_role_text(ws text, roles public.workspace_role[])
returns boolean language plpgsql stable security definer set search_path = '' as $$
begin
  return public.has_workspace_role(ws::uuid, roles);
exception when invalid_text_representation then
  return false;
end;
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
-- 6. BRAND KIT AND FONTS
-- ELI5: the colours and fonts every thumbnail uses. One kit per
-- workspace, made automatically with the workspace.
-- ---------------------------------------------------------------------
create table public.brand_kits (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null unique references public.workspaces (id) on delete cascade,
  colours jsonb not null default '[]'::jsonb check (jsonb_typeof(colours) = 'array' and jsonb_array_length(colours) <= 6),
  default_font text not null default 'Anton',
  text_presets jsonb not null default '[]'::jsonb check (jsonb_typeof(text_presets) = 'array' and jsonb_array_length(text_presets) <= 12),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger brand_kits_updated_at before update on public.brand_kits
  for each row execute function public.set_updated_at();

create table public.brand_fonts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  family text not null check (char_length(family) between 1 and 80),
  weight integer not null default 400 check (weight between 100 and 900),
  style text not null default 'normal' check (style in ('normal', 'italic')),
  format text not null check (format in ('woff2', 'woff', 'ttf', 'otf')),
  storage_path text not null unique,
  licence_confirmed boolean not null default false check (licence_confirmed),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
create index brand_fonts_ws_idx on public.brand_fonts (workspace_id);
create index brand_fonts_created_by_idx on public.brand_fonts (created_by);

-- ---------------------------------------------------------------------
-- 7. FACE LIBRARY
-- ELI5: people are the faces that appear in thumbnails ("Sam"). Each
-- person has photos. The worker cuts each photo out and tags the
-- expression. The browser can upload and re-tag, nothing else.
-- ---------------------------------------------------------------------
create table public.people (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  consent_confirmed_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index people_ws_idx on public.people (workspace_id);
create index people_created_by_idx on public.people (created_by);
create trigger people_updated_at before update on public.people
  for each row execute function public.set_updated_at();

create table public.face_photos (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  person_id uuid not null references public.people (id) on delete cascade,
  original_path text not null unique,
  cutout_path text,
  status public.face_status not null default 'uploaded',
  expression public.face_expression,
  width integer,
  height integer,
  bbox jsonb,
  attempts integer not null default 0,
  error text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index face_photos_ws_idx on public.face_photos (workspace_id);
create index face_photos_person_idx on public.face_photos (person_id);
create index face_photos_created_by_idx on public.face_photos (created_by);
create trigger face_photos_updated_at before update on public.face_photos
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- 8. YOUTUBE CHANNELS, TOKENS, VIDEOS
-- ELI5: a channel is a connected YouTube account. Its Google tokens
-- live in their own table that NO browser can read, encrypted by the
-- edge function before they get here. Videos are a cached copy of the
-- channel's latest uploads.
-- ---------------------------------------------------------------------
create table public.channels (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  youtube_channel_id text not null,
  title text not null default '',
  avatar_url text,
  subscriber_count bigint,
  uploads_playlist_id text,
  google_email text,
  status public.channel_status not null default 'connected',
  reach_job_id text,
  last_reach_report_at timestamptz,
  last_synced_at timestamptz,
  connected_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, youtube_channel_id)
);
create index channels_ws_idx on public.channels (workspace_id);
create index channels_connected_by_idx on public.channels (connected_by);
create trigger channels_updated_at before update on public.channels
  for each row execute function public.set_updated_at();

create table public.channel_tokens (
  channel_id uuid primary key references public.channels (id) on delete cascade,
  refresh_token_enc text not null,
  access_token_enc text,
  access_expires_at timestamptz,
  scopes text[] not null default '{}',
  updated_at timestamptz not null default now()
);
create trigger channel_tokens_updated_at before update on public.channel_tokens
  for each row execute function public.set_updated_at();

create table public.oauth_states (
  nonce text primary key,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  expires_at timestamptz not null default now() + interval '10 minutes'
);
create index oauth_states_ws_idx on public.oauth_states (workspace_id);
create index oauth_states_user_idx on public.oauth_states (user_id);

create table public.videos (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  channel_id uuid not null references public.channels (id) on delete cascade,
  youtube_video_id text not null,
  title text not null default '',
  published_at timestamptz,
  duration_sec integer,
  privacy_status text,
  thumbnail_url text,
  view_count bigint,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (channel_id, youtube_video_id)
);
create index videos_ws_idx on public.videos (workspace_id);
create index videos_channel_idx on public.videos (channel_id);
create trigger videos_updated_at before update on public.videos
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- 9. PROJECTS, GENERATIONS, CONCEPTS, DESIGNS
-- ELI5: a project is one video's thumbnail work. Each "Generate" click
-- is a generation that makes 6 concepts (AI images plus a brief). A
-- design is what you edit in the canvas and export.
-- ---------------------------------------------------------------------
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 100),
  topic text not null default '' check (char_length(topic) <= 600),
  video_id uuid references public.videos (id) on delete set null,
  person_id uuid references public.people (id) on delete set null,
  style_tags text[] not null default '{}',
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index projects_ws_idx on public.projects (workspace_id);
create index projects_video_idx on public.projects (video_id);
create index projects_person_idx on public.projects (person_id);
create index projects_created_by_idx on public.projects (created_by);
create trigger projects_updated_at before update on public.projects
  for each row execute function public.set_updated_at();

create table public.generations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  status public.generation_status not null default 'queued',
  brief jsonb,
  concept_count integer not null default 6 check (concept_count between 1 and 6),
  cost_micros bigint not null default 0,
  error text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index generations_ws_idx on public.generations (workspace_id);
create index generations_project_idx on public.generations (project_id);
create index generations_created_by_idx on public.generations (created_by);
create trigger generations_updated_at before update on public.generations
  for each row execute function public.set_updated_at();

create table public.concepts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  generation_id uuid not null references public.generations (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  idx integer not null check (idx between 0 and 99),
  angle public.concept_angle,
  headline text,
  subline text,
  layout public.concept_layout,
  expression public.face_expression,
  accent_hex text check (accent_hex is null or accent_hex ~ '^#[0-9a-fA-F]{6}$'),
  why text,
  image_model public.image_model,
  prompt text,
  status public.concept_status not null default 'queued',
  fal_request_id text unique,
  image_path text,
  attempts integer not null default 0,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (generation_id, idx)
);
create index concepts_ws_idx on public.concepts (workspace_id);
create index concepts_project_idx on public.concepts (project_id);
create trigger concepts_updated_at before update on public.concepts
  for each row execute function public.set_updated_at();

create table public.designs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  concept_id uuid references public.concepts (id) on delete set null,
  name text not null default 'Untitled design' check (char_length(name) between 1 and 80),
  doc jsonb not null default '{"version":1,"width":1280,"height":720,"layers":[]}'::jsonb,
  version integer not null default 0,
  export_path text,
  export_bytes integer,
  exported_at timestamptz,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index designs_ws_idx on public.designs (workspace_id);
create index designs_project_idx on public.designs (project_id);
create index designs_concept_idx on public.designs (concept_id);
create index designs_created_by_idx on public.designs (created_by);
create trigger designs_updated_at before update on public.designs
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- 10. A/B TESTS
-- ELI5: a test puts 2 or 3 thumbnails on one video, one per day. Each
-- day has a rotation row made up front, so the schedule never changes.
-- Only edge functions write these tables.
-- ---------------------------------------------------------------------
create table public.tests (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  channel_id uuid not null references public.channels (id) on delete cascade,
  video_id uuid not null references public.videos (id) on delete cascade,
  status public.test_status not null default 'draft',
  days integer not null check (days in (8, 9, 16, 18)),
  start_day date,
  auto_apply boolean not null default true,
  min_impressions integer not null default 1500 check (min_impressions between 200 and 100000),
  winner_variant_id uuid,
  decision jsonb,
  original_backup_path text,
  paused_reason text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index tests_ws_idx on public.tests (workspace_id);
create index tests_channel_idx on public.tests (channel_id);
create index tests_video_idx on public.tests (video_id);
create index tests_created_by_idx on public.tests (created_by);
create index tests_status_idx on public.tests (status);
-- One active test per video.
create unique index tests_one_active_per_video on public.tests (video_id)
  where status in ('scheduled', 'running', 'collecting');
create trigger tests_updated_at before update on public.tests
  for each row execute function public.set_updated_at();

create table public.test_variants (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  test_id uuid not null references public.tests (id) on delete cascade,
  label text not null check (label in ('A', 'B', 'C')),
  design_id uuid references public.designs (id) on delete set null,
  is_original boolean not null default false,
  image_path text not null,
  impressions bigint not null default 0,
  clicks bigint not null default 0,
  views bigint not null default 0,
  watch_minutes numeric not null default 0,
  avg_view_duration_sec numeric,
  p_best numeric,
  updated_at timestamptz not null default now(),
  unique (test_id, label)
);
create index test_variants_ws_idx on public.test_variants (workspace_id);
create index test_variants_design_idx on public.test_variants (design_id);
create trigger test_variants_updated_at before update on public.test_variants
  for each row execute function public.set_updated_at();

alter table public.tests
  add constraint tests_winner_fk foreign key (winner_variant_id)
  references public.test_variants (id) on delete set null;
create index tests_winner_idx on public.tests (winner_variant_id);

create table public.test_rotations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  test_id uuid not null references public.tests (id) on delete cascade,
  variant_id uuid not null references public.test_variants (id) on delete cascade,
  day date not null,
  status public.rotation_status not null default 'pending',
  set_at timestamptz,
  attempts integer not null default 0,
  error text,
  unique (test_id, day)
);
create index test_rotations_ws_idx on public.test_rotations (workspace_id);
create index test_rotations_variant_idx on public.test_rotations (variant_id);
create index test_rotations_day_idx on public.test_rotations (day, status);

-- ---------------------------------------------------------------------
-- 11. YOUTUBE NUMBERS AND QUOTA
-- ELI5: reach_daily is impressions and CTR per video per day from the
-- Reporting API. video_daily is views and watch time from the
-- Analytics API. youtube_quota_days counts the API units we spend each
-- Pacific day so we never run out mid-rotation.
-- ---------------------------------------------------------------------
create table public.reach_daily (
  id bigint generated always as identity primary key,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  channel_id uuid not null references public.channels (id) on delete cascade,
  youtube_video_id text not null,
  day date not null,
  impressions bigint not null default 0,
  ctr numeric not null default 0 check (ctr >= 0 and ctr <= 1),
  fetched_at timestamptz not null default now(),
  unique (channel_id, youtube_video_id, day)
);
create index reach_daily_ws_idx on public.reach_daily (workspace_id);
create index reach_daily_day_idx on public.reach_daily (day);

create table public.video_daily (
  id bigint generated always as identity primary key,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  channel_id uuid not null references public.channels (id) on delete cascade,
  youtube_video_id text not null,
  day date not null,
  views bigint not null default 0,
  watch_minutes numeric not null default 0,
  avg_view_duration_sec numeric not null default 0,
  fetched_at timestamptz not null default now(),
  unique (channel_id, youtube_video_id, day)
);
create index video_daily_ws_idx on public.video_daily (workspace_id);
create index video_daily_day_idx on public.video_daily (day);

create table public.youtube_quota_days (
  day date primary key,
  units_used integer not null default 0
);

-- ---------------------------------------------------------------------
-- 12. JOBS, METER, EMAIL, PREFS, RATE LIMITS, WEBHOOK DE-DUPE
-- ELI5: jobs is the to-do list the workers pick from. usage_ledger is
-- the meter: one row per credit spent (or refunded). email_log makes
-- sure no email goes out twice.
-- ---------------------------------------------------------------------
create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces (id) on delete cascade,
  queue public.job_queue not null,
  kind public.job_kind not null,
  status public.job_status not null default 'queued',
  ref_id uuid,
  payload jsonb not null default '{}'::jsonb,
  idempotency_key text not null unique,
  attempts integer not null default 0,
  run_after timestamptz not null default now(),
  locked_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index jobs_ws_idx on public.jobs (workspace_id);
create index jobs_claim_idx on public.jobs (queue, status, run_after);
create trigger jobs_updated_at before update on public.jobs
  for each row execute function public.set_updated_at();

create table public.usage_ledger (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null,
  kind public.usage_kind not null,
  quantity integer not null,
  cost_micros bigint not null default 0,
  ref_id uuid,
  idempotency_key text not null unique,
  created_at timestamptz not null default now()
);
create index usage_ledger_ws_kind_idx on public.usage_ledger (workspace_id, kind, created_at);
create index usage_ledger_user_idx on public.usage_ledger (user_id);

create table public.email_log (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces (id) on delete cascade,
  kind text not null,
  to_email text not null,
  dedupe_key text not null unique,
  resend_id text,
  status text not null default 'queued',
  created_at timestamptz not null default now()
);
create index email_log_ws_idx on public.email_log (workspace_id);

create table public.notification_prefs (
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  concepts_ready boolean not null default true,
  test_started boolean not null default true,
  test_decided boolean not null default true,
  test_problems boolean not null default true,
  usage_alerts boolean not null default true,
  primary key (workspace_id, user_id)
);
create index notification_prefs_user_idx on public.notification_prefs (user_id);

create table public.rate_limits (
  key text not null,
  window_start timestamptz not null,
  hits integer not null default 0,
  primary key (key, window_start)
);

create table public.fal_events (
  request_id text primary key,
  received_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 13. BILLING (written only by the Stripe webhook with the secret key)
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

-- Which Stripe price is which plan. After you create the 6 prices in
-- Stripe, run for each one:
--   insert into public.plan_prices values ('price_...', 'creator', 'month');
create table public.plan_prices (
  price_id text primary key,
  plan text not null check (plan in ('creator', 'pro', 'agency')),
  billing_interval text not null default 'month' check (billing_interval in ('month', 'year'))
);

-- Test-only limit overrides. No policies: only you, in the SQL editor.
create table public.workspace_limit_overrides (
  workspace_id uuid primary key references public.workspaces (id) on delete cascade,
  concepts integer,
  live_tests integer,
  channels integer,
  seats integer
);

-- ---------------------------------------------------------------------
-- 14. ACCESS AND LIMIT FUNCTIONS
-- ELI5: has_active_access is the paywall: the owner's trial or paid
-- plan keeps the whole workspace open. plan_limits returns the numbers
-- from PRD section 16. usage_this_month adds up the meter (refunds are
-- negative rows, so they give credits back).
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
returns table (plan text, seats integer, channels integer, concepts integer, live_tests integer,
               face_cutouts integer, people integer, fonts integer, storage_mb integer)
language plpgsql stable security definer set search_path = '' as $$
declare
  v_plan text;
  v_status text;
  o record;
begin
  select coalesce(pp.plan, 'creator'), s.status into v_plan, v_status
  from public.workspaces w
  left join public.subscriptions s on s.user_id = w.owner_id
  left join public.plan_prices pp on pp.price_id = s.price_id
  where w.id = ws;

  if v_plan is null then v_plan := 'creator'; end if;

  if v_plan = 'agency' then
    plan := 'agency'; seats := 5; channels := 10; concepts := 420; live_tests := 40;
    face_cutouts := 40; people := 15; fonts := 30; storage_mb := 20480;
  elsif v_plan = 'pro' then
    plan := 'pro'; seats := 2; channels := 3; concepts := 168; live_tests := 10;
    face_cutouts := 20; people := 3; fonts := 10; storage_mb := 5120;
  else
    plan := 'creator'; seats := 1; channels := 1; concepts := 84; live_tests := 3;
    face_cutouts := 10; people := 1; fonts := 4; storage_mb := 2048;
  end if;

  -- The 7 day trial: 12 concepts, 1 live test, 1 channel, 2 fonts.
  if v_status = 'trialing' then
    concepts := least(concepts, 12); live_tests := 1; channels := 1; seats := 1;
    fonts := least(fonts, 2); storage_mb := 500;
  end if;

  select * into o from public.workspace_limit_overrides where workspace_id = ws;
  if found then
    concepts := coalesce(o.concepts, concepts);
    live_tests := coalesce(o.live_tests, live_tests);
    channels := coalesce(o.channels, channels);
    seats := coalesce(o.seats, seats);
  end if;
  return next;
end;
$$;

create or replace function public.usage_this_month(ws uuid, k public.usage_kind)
returns integer language sql stable security definer set search_path = '' as $$
  select coalesce(sum(quantity), 0)::integer from public.usage_ledger
  where workspace_id = ws and kind = k and created_at >= date_trunc('month', now());
$$;

create or replace function public.live_test_count(ws uuid)
returns integer language sql stable security definer set search_path = '' as $$
  select count(*)::integer from public.tests
  where workspace_id = ws and status in ('scheduled', 'running', 'collecting');
$$;

-- One call for the sidebar meter and the billing page.
create or replace function public.workspace_usage(ws uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  l record;
begin
  if not public.is_workspace_member(ws) then raise exception 'not a member'; end if;
  select * into l from public.plan_limits(ws);
  return jsonb_build_object(
    'plan', l.plan,
    'concepts_used', public.usage_this_month(ws, 'concepts'), 'concepts_cap', l.concepts,
    'cutouts_used', public.usage_this_month(ws, 'face_cutouts'), 'cutouts_cap', l.face_cutouts,
    'live_tests', public.live_test_count(ws), 'live_tests_cap', l.live_tests,
    'channels', (select count(*) from public.channels c where c.workspace_id = ws and c.status <> 'disconnected'),
    'channels_cap', l.channels,
    'seats', (select count(*) from public.workspace_members m where m.workspace_id = ws), 'seats_cap', l.seats,
    'resets_on', (date_trunc('month', now()) + interval '1 month')::date
  );
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

-- Spend YouTube Data API units for today's Pacific day. Returns false
-- (and spends nothing) if it would pass the budget.
create or replace function public.spend_youtube_units(p_units integer, p_budget integer default 9500)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  v_day date := (now() at time zone 'America/Los_Angeles')::date;
  v_used integer;
begin
  insert into public.youtube_quota_days (day, units_used) values (v_day, 0)
  on conflict (day) do nothing;
  update public.youtube_quota_days set units_used = units_used + p_units
  where day = v_day and units_used + p_units <= p_budget
  returning units_used into v_used;
  return v_used is not null;
end;
$$;

-- ---------------------------------------------------------------------
-- 15. WORKSPACE, INVITE AND EXPORT FUNCTIONS (called from the app)
-- ELI5: creating a workspace, joining one and marking a design as
-- exported happen inside the database in one step, so seats, roles and
-- the 2 MB rule can never be skipped.
-- ---------------------------------------------------------------------
create or replace function public.create_workspace(p_name text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_ws uuid;
begin
  if v_uid is null then raise exception 'not signed in'; end if;
  if exists (select 1 from public.workspaces where owner_id = v_uid) then
    raise exception 'you already own a workspace';
  end if;
  insert into public.workspaces (name, owner_id) values (p_name, v_uid) returning id into v_ws;
  insert into public.workspace_members (workspace_id, user_id, role) values (v_ws, v_uid, 'owner');
  insert into public.brand_kits (workspace_id) values (v_ws);
  insert into public.notification_prefs (workspace_id, user_id) values (v_ws, v_uid);
  update public.profiles set current_workspace_id = v_ws where id = v_uid;
  return v_ws;
end;
$$;

-- Returns the raw token once. The app emails it. Only the hash is kept.
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

-- The browser uploads the JPEG to exports/<ws>/<design>/<n>.jpg, then
-- calls this. It checks the file really exists, sits in the right
-- folder and is under 2,000,000 bytes, then records the export.
create or replace function public.mark_design_exported(p_design uuid, p_path text)
returns integer language plpgsql security definer set search_path = '' as $$
declare
  v_d public.designs;
  v_size bigint;
begin
  select * into v_d from public.designs where id = p_design for update;
  if not found then raise exception 'not_found'; end if;
  if not public.has_workspace_role(v_d.workspace_id, array['owner', 'admin', 'editor']::public.workspace_role[]) then
    raise exception 'not a member';
  end if;
  if p_path not like v_d.workspace_id::text || '/' || v_d.id::text || '/%' then
    raise exception 'wrong_folder';
  end if;
  select (o.metadata ->> 'size')::bigint into v_size
  from storage.objects o where o.bucket_id = 'exports' and o.name = p_path;
  if v_size is null then raise exception 'file_missing'; end if;
  if v_size > 2000000 then raise exception 'too_big'; end if;
  update public.designs
  set export_path = p_path, export_bytes = v_size, exported_at = now(), version = version + 1
  where id = p_design;
  return v_d.version + 1;
end;
$$;

-- ---------------------------------------------------------------------
-- 16. WORKER FUNCTIONS (edge functions only, secret key)
-- ELI5: claim_jobs hands a worker a few to-dos from its queue and marks
-- them "mine" so two workers never grab the same one.
-- ---------------------------------------------------------------------
create or replace function public.claim_jobs(p_queue public.job_queue, p_limit integer)
returns setof public.jobs language sql security definer set search_path = '' as $$
  update public.jobs j set status = 'running', locked_at = now()
  where j.id in (
    select id from public.jobs
    where queue = p_queue and status = 'queued' and run_after <= now()
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

-- YouTube data is kept only as long as tests need it (120 days).
create or replace function public.purge_old_youtube_data()
returns integer language plpgsql security definer set search_path = '' as $$
declare v_count integer;
begin
  delete from public.reach_daily where day < current_date - 120;
  get diagnostics v_count = row_count;
  delete from public.video_daily where day < current_date - 120;
  delete from public.oauth_states where expires_at < now();
  delete from public.youtube_quota_days where day < current_date - 60;
  return v_count;
end;
$$;

-- Workers and webhooks only. The browser can never call these.
revoke execute on function public.claim_jobs(public.job_queue, integer) from public, anon, authenticated;
revoke execute on function public.release_stuck_jobs() from public, anon, authenticated;
revoke execute on function public.purge_old_youtube_data() from public, anon, authenticated;
revoke execute on function public.try_rate_limit(text, integer, integer) from public, anon, authenticated;
revoke execute on function public.spend_youtube_units(integer, integer) from public, anon, authenticated;
revoke execute on function public.create_workspace(text) from public, anon;
revoke execute on function public.create_invite(uuid, text, public.workspace_role) from public, anon;
revoke execute on function public.accept_invite(text) from public, anon;
revoke execute on function public.mark_design_exported(uuid, text) from public, anon;
revoke execute on function public.workspace_usage(uuid) from public, anon;

-- ---------------------------------------------------------------------
-- 17. GUARD TRIGGERS (the rules the browser cannot break)
-- ELI5: RLS decides WHICH rows you can touch. These triggers decide
-- WHICH COLUMNS. You can re-tag a face photo but not mark it "ready",
-- and you can edit a design but not fake its export size.
-- ---------------------------------------------------------------------
create or replace function public.guard_face_columns()
returns trigger language plpgsql set search_path = '' as $$
begin
  if current_user in ('authenticated', 'anon') then
    if new.status is distinct from old.status
       or new.cutout_path is distinct from old.cutout_path
       or new.original_path is distinct from old.original_path
       or new.bbox is distinct from old.bbox
       or new.attempts is distinct from old.attempts
       or new.error is distinct from old.error
       or new.workspace_id is distinct from old.workspace_id
       or new.person_id is distinct from old.person_id then
      raise exception 'only the expression can be changed here';
    end if;
  end if;
  return new;
end;
$$;
create trigger face_photos_guard before update on public.face_photos
  for each row execute function public.guard_face_columns();

-- New face photos always start as 'uploaded' in the uploader's folder.
create or replace function public.guard_face_insert()
returns trigger language plpgsql set search_path = '' as $$
begin
  if current_user in ('authenticated', 'anon') then
    if new.status <> 'uploaded' or new.cutout_path is not null then
      raise exception 'new photos start as uploaded';
    end if;
    if new.original_path not like new.workspace_id::text || '/' || new.person_id::text || '/%' then
      raise exception 'wrong_folder';
    end if;
    if not exists (select 1 from public.people p where p.id = new.person_id and p.workspace_id = new.workspace_id) then
      raise exception 'person not in this workspace';
    end if;
  end if;
  return new;
end;
$$;
create trigger face_photos_guard_insert before insert on public.face_photos
  for each row execute function public.guard_face_insert();

create or replace function public.guard_design_columns()
returns trigger language plpgsql set search_path = '' as $$
begin
  if current_user in ('authenticated', 'anon') then
    if tg_op = 'INSERT' then
      if new.export_path is not null or new.export_bytes is not null or new.version <> 0 then
        raise exception 'exports are recorded by mark_design_exported';
      end if;
      if not exists (select 1 from public.projects p where p.id = new.project_id and p.workspace_id = new.workspace_id) then
        raise exception 'project not in this workspace';
      end if;
    else
      if new.export_path is distinct from old.export_path
         or new.export_bytes is distinct from old.export_bytes
         or new.exported_at is distinct from old.exported_at
         or new.version is distinct from old.version
         or new.workspace_id is distinct from old.workspace_id
         or new.project_id is distinct from old.project_id then
        raise exception 'exports are recorded by mark_design_exported';
      end if;
    end if;
    if pg_column_size(new.doc) > 200000 then raise exception 'design too large'; end if;
  end if;
  return new;
end;
$$;
create trigger designs_guard before insert or update on public.designs
  for each row execute function public.guard_design_columns();

-- A project's video and person must belong to the same workspace.
create or replace function public.guard_project_refs()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.video_id is not null and not exists (
    select 1 from public.videos v where v.id = new.video_id and v.workspace_id = new.workspace_id) then
    raise exception 'video not in this workspace';
  end if;
  if new.person_id is not null and not exists (
    select 1 from public.people p where p.id = new.person_id and p.workspace_id = new.workspace_id) then
    raise exception 'person not in this workspace';
  end if;
  if tg_op = 'UPDATE' and new.workspace_id is distinct from old.workspace_id then
    raise exception 'projects cannot move workspace';
  end if;
  return new;
end;
$$;
create trigger projects_guard before insert or update on public.projects
  for each row execute function public.guard_project_refs();

-- The owner of a workspace can only change through a support action.
create or replace function public.guard_workspace_owner()
returns trigger language plpgsql set search_path = '' as $$
begin
  if current_user in ('authenticated', 'anon') and new.owner_id is distinct from old.owner_id then
    raise exception 'workspace owner cannot be changed here';
  end if;
  return new;
end;
$$;
create trigger workspaces_guard before update on public.workspaces
  for each row execute function public.guard_workspace_owner();

-- ---------------------------------------------------------------------
-- 18. ROW LEVEL SECURITY: switch it on for every table
-- ELI5: with RLS on and no policy, a table is a locked room. Policies
-- are the keys. Tables with no policies below are server-only.
-- ---------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.workspace_invites enable row level security;
alter table public.brand_kits enable row level security;
alter table public.brand_fonts enable row level security;
alter table public.people enable row level security;
alter table public.face_photos enable row level security;
alter table public.channels enable row level security;
alter table public.channel_tokens enable row level security;
alter table public.oauth_states enable row level security;
alter table public.videos enable row level security;
alter table public.projects enable row level security;
alter table public.generations enable row level security;
alter table public.concepts enable row level security;
alter table public.designs enable row level security;
alter table public.tests enable row level security;
alter table public.test_variants enable row level security;
alter table public.test_rotations enable row level security;
alter table public.reach_daily enable row level security;
alter table public.video_daily enable row level security;
alter table public.youtube_quota_days enable row level security;
alter table public.jobs enable row level security;
alter table public.usage_ledger enable row level security;
alter table public.email_log enable row level security;
alter table public.notification_prefs enable row level security;
alter table public.rate_limits enable row level security;
alter table public.fal_events enable row level security;
alter table public.subscriptions enable row level security;
alter table public.stripe_events enable row level security;
alter table public.plan_prices enable row level security;
alter table public.workspace_limit_overrides enable row level security;

-- Belt and braces: anonymous visitors get no table access at all.
revoke all on all tables in schema public from anon;

-- Profiles: yourself, and teammates' names for "created by" columns.
create policy "profiles select self or teammate" on public.profiles for select to authenticated
  using (id = (select auth.uid()) or public.shares_workspace_with(id));
create policy "profiles update self" on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- Workspaces: created through create_workspace(); renamed by owner/admin; deleted by owner.
create policy "workspaces select member" on public.workspaces for select to authenticated
  using (public.is_workspace_member(id) or owner_id = (select auth.uid()));
create policy "workspaces update admin" on public.workspaces for update to authenticated
  using (public.has_workspace_role(id, array['owner', 'admin']::public.workspace_role[]))
  with check (public.has_workspace_role(id, array['owner', 'admin']::public.workspace_role[]));
create policy "workspaces delete owner" on public.workspaces for delete to authenticated
  using (owner_id = (select auth.uid()));

-- Members: everyone sees the team; the owner changes roles; owner/admin
-- remove people; anyone can leave. Nobody can remove or demote the owner.
create policy "members select member" on public.workspace_members for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy "members update owner" on public.workspace_members for update to authenticated
  using (public.has_workspace_role(workspace_id, array['owner']::public.workspace_role[]) and role <> 'owner')
  with check (role in ('admin', 'editor'));
create policy "members delete admin or self" on public.workspace_members for delete to authenticated
  using (role <> 'owner' and (
    public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[])
    or user_id = (select auth.uid())));

-- Invites: created through create_invite(); owner/admin can see and revoke.
create policy "invites select admin" on public.workspace_invites for select to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]));
create policy "invites delete admin" on public.workspace_invites for delete to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]));

-- Brand kit: everyone reads, owner/admin edit. Created by create_workspace().
create policy "brand select member" on public.brand_kits for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy "brand insert admin" on public.brand_kits for insert to authenticated
  with check (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]));
create policy "brand update admin" on public.brand_kits for update to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]))
  with check (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]));
create policy "brand delete owner" on public.brand_kits for delete to authenticated
  using (public.has_workspace_role(workspace_id, array['owner']::public.workspace_role[]));

-- Fonts: everyone reads, owner/admin add and remove (fonts are not edited).
create policy "fonts select member" on public.brand_fonts for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy "fonts insert admin" on public.brand_fonts for insert to authenticated
  with check (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[])
              and created_by = (select auth.uid())
              and storage_path like workspace_id::text || '/%');
create policy "fonts update admin" on public.brand_fonts for update to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]))
  with check (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]));
create policy "fonts delete admin" on public.brand_fonts for delete to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]));

-- People and face photos: every member reads and adds; owner/admin delete people.
create policy "people select member" on public.people for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy "people insert member" on public.people for insert to authenticated
  with check (public.is_workspace_member(workspace_id) and created_by = (select auth.uid()));
create policy "people update member" on public.people for update to authenticated
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));
create policy "people delete admin" on public.people for delete to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]));

create policy "faces select member" on public.face_photos for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy "faces insert member" on public.face_photos for insert to authenticated
  with check (public.is_workspace_member(workspace_id) and created_by = (select auth.uid()));
create policy "faces update member" on public.face_photos for update to authenticated
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));
create policy "faces delete member" on public.face_photos for delete to authenticated
  using (public.is_workspace_member(workspace_id));

-- Channels and videos: members read. Connecting, syncing and
-- disconnecting go through the mrq-youtube-connect edge function.
create policy "channels select member" on public.channels for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy "videos select member" on public.videos for select to authenticated
  using (public.is_workspace_member(workspace_id));

-- Projects: members create and edit; creator or admin deletes.
create policy "projects select member" on public.projects for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy "projects insert member" on public.projects for insert to authenticated
  with check (public.is_workspace_member(workspace_id) and created_by = (select auth.uid()));
create policy "projects update member" on public.projects for update to authenticated
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));
create policy "projects delete creator or admin" on public.projects for delete to authenticated
  using (created_by = (select auth.uid())
         or public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]));

-- Generations and concepts: read only. Written by mrq-generate and the worker.
create policy "generations select member" on public.generations for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy "concepts select member" on public.concepts for select to authenticated
  using (public.is_workspace_member(workspace_id));

-- Designs: members create, edit and delete; exports via mark_design_exported().
create policy "designs select member" on public.designs for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy "designs insert member" on public.designs for insert to authenticated
  with check (public.is_workspace_member(workspace_id) and created_by = (select auth.uid()));
create policy "designs update member" on public.designs for update to authenticated
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));
create policy "designs delete member" on public.designs for delete to authenticated
  using (public.is_workspace_member(workspace_id));

-- Tests, variants, rotations and YouTube numbers: read only for members.
-- Every change goes through mrq-test-control and the YouTube worker.
create policy "tests select member" on public.tests for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy "variants select member" on public.test_variants for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy "rotations select member" on public.test_rotations for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy "reach select member" on public.reach_daily for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy "video daily select member" on public.video_daily for select to authenticated
  using (public.is_workspace_member(workspace_id));

-- Jobs, usage and emails: members read (for progress and meters).
create policy "jobs select member" on public.jobs for select to authenticated
  using (workspace_id is not null and public.is_workspace_member(workspace_id));
create policy "usage select member" on public.usage_ledger for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy "email log select admin" on public.email_log for select to authenticated
  using (workspace_id is not null
         and public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]));

-- Notification preferences: your own row in workspaces you belong to.
create policy "prefs select own" on public.notification_prefs for select to authenticated
  using (user_id = (select auth.uid()));
create policy "prefs insert own" on public.notification_prefs for insert to authenticated
  with check (user_id = (select auth.uid()) and public.is_workspace_member(workspace_id));
create policy "prefs update own" on public.notification_prefs for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "prefs delete own" on public.notification_prefs for delete to authenticated
  using (user_id = (select auth.uid()));

-- Billing: you read your own subscription. Price ids are not secret.
create policy "subscriptions select own" on public.subscriptions for select to authenticated
  using (user_id = (select auth.uid()));
create policy "plan prices select" on public.plan_prices for select to authenticated
  using (true);

-- No policies on purpose (server only): channel_tokens, oauth_states,
-- youtube_quota_days, rate_limits, fal_events, stripe_events,
-- workspace_limit_overrides.

-- ---------------------------------------------------------------------
-- 19. STORAGE BUCKETS + POLICIES
-- ELI5: seven private folders. Files sit under a folder named after
-- the workspace id, and only members of that workspace get in.
--   faces      original photos and cut-outs (browser uploads originals)
--   brand-fonts uploaded fonts (owner/admin upload)
--   concepts   AI images (only the worker writes)
--   exports    finished 1280x720 JPEGs (browser uploads, 2 MB cap)
--   uploads    extra image layers in the editor
--   tests      frozen copies of each test variant (only edge functions)
--   originals  backups of the thumbnail a video had before a test
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('faces', 'faces', false, 15728640, array['image/jpeg', 'image/png', 'image/webp']),
  ('brand-fonts', 'brand-fonts', false, 2097152,
    array['font/woff2', 'font/woff', 'font/ttf', 'font/otf', 'application/font-woff',
          'application/x-font-ttf', 'application/vnd.ms-opentype', 'application/octet-stream']),
  ('concepts', 'concepts', false, 10485760, array['image/png', 'image/jpeg', 'image/webp']),
  ('exports', 'exports', false, 2000000, array['image/jpeg', 'image/png']),
  ('uploads', 'uploads', false, 10485760, array['image/png', 'image/jpeg', 'image/webp']),
  ('tests', 'tests', false, 2000000, array['image/jpeg', 'image/png']),
  ('originals', 'originals', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- faces: members read, upload, replace and delete in their workspace folder.
create policy "faces bucket select" on storage.objects for select to authenticated
  using (bucket_id = 'faces' and public.is_workspace_member_text((storage.foldername(name))[1]));
create policy "faces bucket insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'faces' and public.is_workspace_member_text((storage.foldername(name))[1]));
create policy "faces bucket update" on storage.objects for update to authenticated
  using (bucket_id = 'faces' and public.is_workspace_member_text((storage.foldername(name))[1]))
  with check (bucket_id = 'faces' and public.is_workspace_member_text((storage.foldername(name))[1]));
create policy "faces bucket delete" on storage.objects for delete to authenticated
  using (bucket_id = 'faces' and public.is_workspace_member_text((storage.foldername(name))[1]));

-- brand-fonts: members read; owner/admin upload and delete.
create policy "fonts bucket select" on storage.objects for select to authenticated
  using (bucket_id = 'brand-fonts' and public.is_workspace_member_text((storage.foldername(name))[1]));
create policy "fonts bucket insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'brand-fonts'
              and public.has_workspace_role_text((storage.foldername(name))[1], array['owner', 'admin']::public.workspace_role[]));
create policy "fonts bucket delete" on storage.objects for delete to authenticated
  using (bucket_id = 'brand-fonts'
         and public.has_workspace_role_text((storage.foldername(name))[1], array['owner', 'admin']::public.workspace_role[]));

-- concepts, tests, originals: members read; only edge functions write.
create policy "concepts bucket select" on storage.objects for select to authenticated
  using (bucket_id = 'concepts' and public.is_workspace_member_text((storage.foldername(name))[1]));
create policy "tests bucket select" on storage.objects for select to authenticated
  using (bucket_id = 'tests' and public.is_workspace_member_text((storage.foldername(name))[1]));
create policy "originals bucket select" on storage.objects for select to authenticated
  using (bucket_id = 'originals' and public.is_workspace_member_text((storage.foldername(name))[1]));

-- exports and uploads: members read, upload, replace and delete.
create policy "exports bucket select" on storage.objects for select to authenticated
  using (bucket_id = 'exports' and public.is_workspace_member_text((storage.foldername(name))[1]));
create policy "exports bucket insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'exports' and public.is_workspace_member_text((storage.foldername(name))[1]));
create policy "exports bucket update" on storage.objects for update to authenticated
  using (bucket_id = 'exports' and public.is_workspace_member_text((storage.foldername(name))[1]))
  with check (bucket_id = 'exports' and public.is_workspace_member_text((storage.foldername(name))[1]));
create policy "exports bucket delete" on storage.objects for delete to authenticated
  using (bucket_id = 'exports' and public.is_workspace_member_text((storage.foldername(name))[1]));

create policy "uploads bucket select" on storage.objects for select to authenticated
  using (bucket_id = 'uploads' and public.is_workspace_member_text((storage.foldername(name))[1]));
create policy "uploads bucket insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'uploads' and public.is_workspace_member_text((storage.foldername(name))[1]));
create policy "uploads bucket delete" on storage.objects for delete to authenticated
  using (bucket_id = 'uploads' and public.is_workspace_member_text((storage.foldername(name))[1]));

-- ---------------------------------------------------------------------
-- 20. REALTIME
-- ELI5: lets the gallery fill in, face tiles turn "Ready" and the test
-- page move to the next day live, with no refresh. RLS still applies.
-- ---------------------------------------------------------------------
alter publication supabase_realtime add table public.generations;
alter publication supabase_realtime add table public.concepts;
alter publication supabase_realtime add table public.face_photos;
alter publication supabase_realtime add table public.tests;
alter publication supabase_realtime add table public.test_rotations;

-- ---------------------------------------------------------------------
-- 21. SCHEDULES (run later, after your edge functions are deployed)
-- ELI5: pg_cron is an alarm clock inside the database. pg_net lets the
-- alarm clock call a URL. Every minute it pokes the two workers, every
-- 15 minutes the scheduler, and once a night the clean-up.
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
--     timeout_milliseconds := 150000);
-- $fn$;
-- revoke execute on function public.invoke_edge(text) from public, anon, authenticated;
--
-- select cron.schedule('mrq-ai-worker',      '* * * * *',    $$ select public.invoke_edge('mrq-ai-worker') $$);
-- select cron.schedule('mrq-youtube-worker', '* * * * *',    $$ select public.invoke_edge('mrq-youtube-worker') $$);
-- select cron.schedule('mrq-scheduler',      '*/15 * * * *', $$ select public.invoke_edge('mrq-scheduler') $$);
-- select cron.schedule('mrq-purge',          '20 9 * * *',   $$ select public.purge_old_youtube_data() $$);
--
-- Check it ran: select * from cron.job_run_details order by start_time desc limit 20;
`
