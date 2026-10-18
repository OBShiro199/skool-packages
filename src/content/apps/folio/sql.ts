// Folio single migration, pasted into the Supabase SQL editor and run once on a fresh project.

export const sql = `-- =====================================================================
-- Folio: full database migration (0001_folio.sql)
-- Paste this whole file into Supabase > SQL Editor > New query > Run.
-- Run it ONCE on a fresh project. Order: extensions, enums, tables,
-- helper functions, triggers, RLS policies, storage, realtime, seed data.
--
-- ELI5: Folio is multi-tenant. One database holds every customer.
-- Each row carries a workspace_id (whose stuff it is), and Row Level
-- Security (RLS) asks "is the person asking a member of that workspace?"
-- on every read and write. If not, Postgres acts as if the row is not there.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. EXTENSIONS
-- ELI5: plug-ins for Postgres. pgcrypto makes random invite tokens.
-- pg_trgm makes "search as you type" on carousel titles fast.
-- pg_cron and pg_net let the database call our edge functions on a timer.
-- ---------------------------------------------------------------------
create extension if not exists pgcrypto with schema extensions;
create extension if not exists pg_trgm with schema extensions;
create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron with schema pg_catalog;

-- ---------------------------------------------------------------------
-- 1. ENUMS
-- ELI5: an enum is a fixed list of allowed words for a column. A job can
-- be 'queued' or 'running', never 'banana'. For workspace_role the ORDER
-- matters: editor < admin < owner, so "at least admin" is a simple >=.
-- ---------------------------------------------------------------------
create type public.workspace_role as enum ('editor', 'admin', 'owner');
create type public.source_kind as enum ('blog_url', 'youtube_url', 'idea', 'voice_note');
create type public.source_status as enum ('pending', 'extracting', 'ready', 'failed');
create type public.carousel_status as enum
  ('draft', 'generating', 'ready', 'rendering', 'rendered', 'scheduled', 'published', 'failed', 'archived');
create type public.carousel_format as enum ('portrait', 'square');
create type public.slide_layout as enum
  ('hook', 'statement', 'bullets', 'step', 'quote', 'stat', 'compare', 'cta');
create type public.revision_reason as enum ('generate', 'manual', 'ai_rewrite', 'layout_change', 'undo');
create type public.job_kind as enum ('ingest', 'generate', 'render', 'publish', 'analytics');
create type public.job_status as enum ('queued', 'running', 'succeeded', 'failed', 'canceled');
create type public.render_status as enum ('queued', 'rendering', 'done', 'failed');
create type public.social_platform as enum ('linkedin', 'linkedin_page', 'instagram');
create type public.account_status as enum ('connected', 'expired', 'disconnected');
create type public.post_status as enum
  ('draft', 'scheduled', 'publishing', 'published', 'failed', 'canceled');
create type public.usage_metric as enum ('carousel', 'rewrite', 'render', 'voice_minutes', 'scrape');

-- ---------------------------------------------------------------------
-- 2. PEOPLE AND WORKSPACES
-- ELI5: a profile is the person. A workspace is the "company account" that
-- pays. Agencies invite teammates into their workspace. Every signup gets
-- their own workspace automatically (trigger in section 6).
-- ---------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  avatar_url text,
  timezone text not null default 'Europe/London',
  referred_by text,
  onboarded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 80),
  owner_id uuid not null references auth.users (id) on delete cascade,
  timezone text not null default 'Europe/London',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index workspaces_owner_idx on public.workspaces (owner_id);

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
create index workspace_invites_workspace_idx on public.workspace_invites (workspace_id);
create index workspace_invites_invited_by_idx on public.workspace_invites (invited_by);

-- ---------------------------------------------------------------------
-- 3. BRAND KITS
-- ELI5: the brand kit is the "look" every slide follows: colours, fonts,
-- logo, headshot, handle. Agencies have one per client. Image files live in
-- Storage; here we only keep the file paths.
-- ---------------------------------------------------------------------
create table public.brands (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  display_name text not null default '' check (char_length(display_name) <= 60),
  handle text not null default '' check (char_length(handle) <= 40),
  logo_path text,
  headshot_path text,
  colors jsonb not null default '{"background":"#F7F4FF","surface":"#FFFFFF","ink":"#1E1838","muted":"#5B5478","accent":"#6D4AFF","accentInk":"#FFFFFF"}'::jsonb,
  font_heading text not null default 'Manrope',
  font_body text not null default 'Manrope',
  custom_font_path text,
  voice_notes text not null default '' check (char_length(voice_notes) <= 600),
  cta_default text not null default '' check (char_length(cta_default) <= 120),
  show_counter boolean not null default true,
  zernio_profile_id text,
  deleted_at timestamptz,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index brands_workspace_idx on public.brands (workspace_id) where deleted_at is null;
create index brands_created_by_idx on public.brands (created_by);

-- ---------------------------------------------------------------------
-- 4. SOURCES, CAROUSELS, SLIDES
-- ELI5: a source is the raw material (a blog post, a video transcript, an
-- idea, a voice note). A carousel is what Claude writes from it. Slides are
-- the pages of the carousel, each with a layout and its text as JSON.
-- ---------------------------------------------------------------------
create table public.sources (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  brand_id uuid not null references public.brands (id) on delete cascade,
  kind public.source_kind not null,
  input_url text check (input_url is null or char_length(input_url) <= 2048),
  idea_text text check (idea_text is null or char_length(idea_text) <= 4000),
  audio_path text,
  title text,
  extracted_text text check (extracted_text is null or char_length(extracted_text) <= 200000),
  word_count integer,
  duration_seconds integer,
  status public.source_status not null default 'pending',
  error text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index sources_workspace_idx on public.sources (workspace_id, created_at desc);
create index sources_brand_idx on public.sources (brand_id);
create index sources_created_by_idx on public.sources (created_by);

create table public.carousels (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  brand_id uuid not null references public.brands (id) on delete cascade,
  source_id uuid references public.sources (id) on delete set null,
  title text not null default 'Untitled carousel' check (char_length(title) <= 120),
  status public.carousel_status not null default 'draft',
  format public.carousel_format not null default 'portrait',
  caption text not null default '' check (char_length(caption) <= 3000),
  hashtags text[] not null default '{}',
  latest_render_id uuid,
  error text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index carousels_workspace_idx on public.carousels (workspace_id, created_at desc);
create index carousels_brand_idx on public.carousels (brand_id);
create index carousels_source_idx on public.carousels (source_id);
create index carousels_created_by_idx on public.carousels (created_by);
create index carousels_title_trgm_idx on public.carousels using gin (title extensions.gin_trgm_ops);

-- The unique (carousel_id, position) rule is checked at the END of each
-- transaction, so reordering can move slide 5 to 2 without a clash midway.
create table public.slides (
  id uuid primary key default gen_random_uuid(),
  carousel_id uuid not null references public.carousels (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  position integer not null check (position between 0 and 19),
  layout public.slide_layout not null,
  content jsonb not null default '{}'::jsonb check (jsonb_typeof(content) = 'object' and pg_column_size(content) < 8000),
  warnings text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint slides_position_unique unique (carousel_id, position) deferrable initially deferred
);
create index slides_workspace_idx on public.slides (workspace_id);

create table public.slide_revisions (
  id uuid primary key default gen_random_uuid(),
  slide_id uuid not null references public.slides (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  layout public.slide_layout not null,
  content jsonb not null,
  reason public.revision_reason not null,
  instruction text check (instruction is null or char_length(instruction) <= 300),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
create index slide_revisions_slide_idx on public.slide_revisions (slide_id, created_at desc);
create index slide_revisions_workspace_idx on public.slide_revisions (workspace_id);
create index slide_revisions_created_by_idx on public.slide_revisions (created_by);

-- ---------------------------------------------------------------------
-- 5. JOBS, RENDERS, ACCOUNTS, POSTS, METRICS
-- ELI5: anything slow (reading a page, writing slides, drawing PNGs,
-- posting) becomes a job row. The job row is a to-do card: status, how many
-- tries, when to try again. The browser watches it to show progress.
-- ---------------------------------------------------------------------
create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  kind public.job_kind not null,
  status public.job_status not null default 'queued',
  attempts integer not null default 0,
  max_attempts integer not null default 3 check (max_attempts between 1 and 10),
  run_after timestamptz not null default now(),
  locked_at timestamptz,
  progress integer not null default 0 check (progress between 0 and 100),
  step text,
  idempotency_key text not null,
  payload jsonb not null default '{}'::jsonb,
  result jsonb,
  error text,
  source_id uuid references public.sources (id) on delete cascade,
  carousel_id uuid references public.carousels (id) on delete cascade,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, idempotency_key)
);
create index jobs_queue_idx on public.jobs (kind, status, run_after) where status in ('queued', 'running');
create index jobs_source_idx on public.jobs (source_id);
create index jobs_carousel_idx on public.jobs (carousel_id);
create index jobs_created_by_idx on public.jobs (created_by, created_at desc);

create table public.renders (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  carousel_id uuid not null references public.carousels (id) on delete cascade,
  job_id uuid references public.jobs (id) on delete set null,
  status public.render_status not null default 'queued',
  format public.carousel_format not null default 'portrait',
  content_hash text not null,
  slide_paths text[] not null default '{}',
  pdf_path text,
  bytes bigint not null default 0,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index renders_carousel_idx on public.renders (carousel_id, created_at desc);
create index renders_workspace_idx on public.renders (workspace_id);
create index renders_job_idx on public.renders (job_id);
create index renders_hash_idx on public.renders (carousel_id, content_hash) where status = 'done';

alter table public.carousels
  add constraint carousels_latest_render_fk
  foreign key (latest_render_id) references public.renders (id) on delete set null;
create index carousels_latest_render_idx on public.carousels (latest_render_id);

create table public.social_accounts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  brand_id uuid not null references public.brands (id) on delete cascade,
  platform public.social_platform not null,
  zernio_account_id text not null,
  display_name text not null default '',
  avatar_url text,
  status public.account_status not null default 'connected',
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, zernio_account_id)
);
create index social_accounts_brand_idx on public.social_accounts (brand_id);

create table public.scheduled_posts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  brand_id uuid not null references public.brands (id) on delete cascade,
  carousel_id uuid not null references public.carousels (id) on delete cascade,
  render_id uuid not null references public.renders (id) on delete restrict,
  social_account_id uuid not null references public.social_accounts (id) on delete cascade,
  platform public.social_platform not null,
  caption text not null check (char_length(caption) between 1 and 3000),
  scheduled_for timestamptz not null,
  status public.post_status not null default 'draft',
  zernio_post_id text unique,
  platform_post_url text,
  error text,
  published_at timestamptz,
  idempotency_key text not null,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, idempotency_key)
);
create index scheduled_posts_calendar_idx on public.scheduled_posts (workspace_id, scheduled_for);
create index scheduled_posts_brand_idx on public.scheduled_posts (brand_id);
create index scheduled_posts_carousel_idx on public.scheduled_posts (carousel_id);
create index scheduled_posts_render_idx on public.scheduled_posts (render_id);
create index scheduled_posts_account_idx on public.scheduled_posts (social_account_id);
create index scheduled_posts_created_by_idx on public.scheduled_posts (created_by);
create index scheduled_posts_due_idx on public.scheduled_posts (status, scheduled_for) where status in ('scheduled', 'publishing');

create table public.post_metrics (
  scheduled_post_id uuid not null references public.scheduled_posts (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  captured_on date not null default (now() at time zone 'utc')::date,
  impressions integer not null default 0,
  reach integer not null default 0,
  reactions integer not null default 0,
  comments integer not null default 0,
  shares integer not null default 0,
  clicks integer not null default 0,
  saves integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (scheduled_post_id, captured_on)
);
create index post_metrics_workspace_idx on public.post_metrics (workspace_id, captured_on desc);

-- Webhook de-duplication: each provider event id is stored once.
create table public.provider_events (
  id text primary key,
  provider text not null,
  type text not null,
  received_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 6. PLANS, USAGE, BILLING, EMAIL, SUPPORT
-- ELI5: plan_limits is the price list in numbers ("Creator gets 15
-- carousels"). usage_ledger is the till receipt: one line for every paid
-- thing someone did. We add up this month's lines to see what is left.
-- ---------------------------------------------------------------------
create table public.plan_limits (
  plan_id text primary key,
  carousels integer not null,
  rewrites integer not null,
  renders integer not null,
  voice_minutes integer not null,
  scrapes integer not null,
  brands integer not null,
  social_accounts integer not null,
  seats integer not null,
  analytics boolean not null default false,
  custom_fonts boolean not null default false,
  remove_mark boolean not null default false
);

-- You fill this with your Stripe price ids (see the backend task).
create table public.plan_prices (
  stripe_price_id text primary key,
  plan_id text not null references public.plan_limits (plan_id) on delete cascade,
  interval text not null check (interval in ('month', 'year'))
);
create index plan_prices_plan_idx on public.plan_prices (plan_id);

create table public.usage_ledger (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null,
  metric public.usage_metric not null,
  quantity integer not null check (quantity <> 0),
  cost_micros bigint not null default 0,
  ref_id uuid,
  idempotency_key text not null unique,
  period_start date not null default date_trunc('month', now() at time zone 'utc')::date,
  created_at timestamptz not null default now()
);
create index usage_ledger_period_idx on public.usage_ledger (workspace_id, metric, period_start);
create index usage_ledger_user_idx on public.usage_ledger (user_id);
create index usage_ledger_ref_idx on public.usage_ledger (ref_id);

create table if not exists public.subscriptions (
  user_id uuid primary key references auth.users (id) on delete cascade,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  status text not null default 'incomplete',
  price_id text,
  current_period_end timestamptz,
  trial_end timestamptz,
  cancel_at_period_end boolean not null default false,
  updated_at timestamptz not null default now()
);

create table if not exists public.stripe_events (
  id text primary key,
  type text not null,
  received_at timestamptz not null default now()
);

create table public.email_log (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null,
  template text not null,
  to_email text not null,
  resend_id text,
  idempotency_key text not null unique,
  created_at timestamptz not null default now()
);
create index email_log_workspace_idx on public.email_log (workspace_id);
create index email_log_user_idx on public.email_log (user_id);

create table public.support_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  subject text not null check (char_length(subject) between 3 and 120),
  body text not null check (char_length(body) between 10 and 4000),
  status text not null default 'open' check (status in ('open', 'closed')),
  created_at timestamptz not null default now()
);
create index support_requests_user_idx on public.support_requests (user_id);
create index support_requests_workspace_idx on public.support_requests (workspace_id);

-- ---------------------------------------------------------------------
-- 7. SECURITY HELPER FUNCTIONS
-- ELI5: RLS policies call these on every row. "security definer" lets the
-- function look at workspace_members without hitting RLS again (no loop).
-- "set search_path = ''" stops anyone tricking it with a fake table of the
-- same name, which is why every table is written as public.something.
-- ---------------------------------------------------------------------
create or replace function public.is_workspace_member(ws uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.workspace_members m
    where m.workspace_id = ws and m.user_id = (select auth.uid())
  );
$$;

create or replace function public.has_workspace_role(ws uuid, min_role public.workspace_role)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.workspace_members m
    where m.workspace_id = ws and m.user_id = (select auth.uid()) and m.role >= min_role
  );
$$;

-- True when the signed-in user shares any workspace with p_user (to show teammates' names).
create or replace function public.shares_workspace(p_user uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.workspace_members a
    join public.workspace_members b on b.workspace_id = a.workspace_id
    where a.user_id = (select auth.uid()) and b.user_id = p_user
  );
$$;

-- Storage paths start with the workspace id: "<workspace_id>/<brand_id>/logo.png".
-- This reads that first folder safely (returns null for anything that is not a uuid).
create or replace function public.path_workspace(p_name text)
returns uuid language sql immutable set search_path = '' as $$
  select case
    when split_part(p_name, '/', 1) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    then split_part(p_name, '/', 1)::uuid
    else null
  end;
$$;

-- ---------------------------------------------------------------------
-- 8. PAYWALL AND PLAN FUNCTIONS
-- ELI5: the workspace owner's Stripe subscription decides access for the
-- whole team. 'trialing' and 'active' get in. Everything else sees /paywall.
-- ---------------------------------------------------------------------
create or replace function public.has_active_access(ws uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.workspaces w
    join public.subscriptions s on s.user_id = w.owner_id
    where w.id = ws and s.status in ('trialing', 'active')
  );
$$;

create or replace function public.workspace_plan(ws uuid)
returns text language sql stable security definer set search_path = '' as $$
  select coalesce((
    select case
      when s.status = 'trialing' then 'trial'
      when s.status = 'active' then coalesce(pp.plan_id, 'creator')
      else 'none'
    end
    from public.workspaces w
    join public.subscriptions s on s.user_id = w.owner_id
    left join public.plan_prices pp on pp.stripe_price_id = s.price_id
    where w.id = ws
  ), 'none');
$$;

create or replace function public.plan_limit(ws uuid, m public.usage_metric)
returns integer language sql stable security definer set search_path = '' as $$
  select case m
    when 'carousel' then l.carousels
    when 'rewrite' then l.rewrites
    when 'render' then l.renders
    when 'voice_minutes' then l.voice_minutes
    when 'scrape' then l.scrapes
  end
  from public.plan_limits l
  where l.plan_id = public.workspace_plan(ws);
$$;

create or replace function public.usage_used(ws uuid, m public.usage_metric)
returns integer language sql stable security definer set search_path = '' as $$
  select coalesce(sum(u.quantity), 0)::integer
  from public.usage_ledger u
  where u.workspace_id = ws
    and u.metric = m
    and u.period_start = date_trunc('month', now() at time zone 'utc')::date;
$$;

-- The ONLY way usage is counted. Locks per workspace and metric so 30
-- parallel requests cannot all squeeze under the limit. A repeat call with
-- the same idempotency key is a no-op that reports success.
create or replace function public.try_consume_usage(
  p_workspace uuid,
  p_user uuid,
  p_metric public.usage_metric,
  p_quantity integer,
  p_key text,
  p_ref uuid default null,
  p_cost_micros bigint default 0
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_used integer;
  v_limit integer;
begin
  if p_quantity is null or p_quantity <= 0 then
    raise exception 'quantity must be positive' using errcode = '22023';
  end if;
  if p_key is null or char_length(p_key) < 8 then
    raise exception 'idempotency key required' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_workspace::text || ':' || p_metric::text, 0));

  if exists (select 1 from public.usage_ledger where idempotency_key = p_key) then
    return jsonb_build_object('ok', true, 'duplicate', true);
  end if;

  v_limit := coalesce(public.plan_limit(p_workspace, p_metric), 0);
  v_used := public.usage_used(p_workspace, p_metric);

  if v_used + p_quantity > v_limit then
    return jsonb_build_object('ok', false, 'code', 'limit_reached',
      'metric', p_metric, 'used', v_used, 'limit', v_limit);
  end if;

  insert into public.usage_ledger (workspace_id, user_id, metric, quantity, cost_micros, ref_id, idempotency_key)
  values (p_workspace, p_user, p_metric, p_quantity, coalesce(p_cost_micros, 0), p_ref, p_key);

  return jsonb_build_object('ok', true, 'duplicate', false,
    'used', v_used + p_quantity, 'limit', v_limit);
end;
$$;

-- Gives the credit back when a job finally fails. Safe to call twice.
create or replace function public.refund_usage(p_key text)
returns void language sql security definer set search_path = '' as $$
  insert into public.usage_ledger (workspace_id, user_id, metric, quantity, cost_micros, ref_id, idempotency_key, period_start)
  select u.workspace_id, u.user_id, u.metric, -u.quantity, 0, u.ref_id, u.idempotency_key || ':refund', u.period_start
  from public.usage_ledger u
  where u.idempotency_key = p_key and u.quantity > 0
  on conflict (idempotency_key) do nothing;
$$;

-- Adds the real token cost to a ledger row after the AI call finishes.
create or replace function public.set_usage_cost(p_key text, p_cost_micros bigint)
returns void language sql security definer set search_path = '' as $$
  update public.usage_ledger set cost_micros = greatest(p_cost_micros, 0) where idempotency_key = p_key;
$$;

-- What the sidebar meter and billing page show. Members only.
create or replace function public.usage_summary(ws uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_plan text;
  v_out jsonb := '{}'::jsonb;
  v_metric public.usage_metric;
begin
  if not public.is_workspace_member(ws) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  v_plan := public.workspace_plan(ws);
  foreach v_metric in array enum_range(null::public.usage_metric) loop
    v_out := v_out || jsonb_build_object(v_metric::text, jsonb_build_object(
      'used', public.usage_used(ws, v_metric),
      'limit', coalesce(public.plan_limit(ws, v_metric), 0)));
  end loop;
  return jsonb_build_object(
    'plan', v_plan,
    'period_start', date_trunc('month', now() at time zone 'utc')::date,
    'resets_on', (date_trunc('month', now() at time zone 'utc') + interval '1 month')::date,
    'metrics', v_out,
    'limits', (select to_jsonb(l) from public.plan_limits l where l.plan_id = v_plan));
end;
$$;

-- ---------------------------------------------------------------------
-- 9. JOB QUEUE FUNCTIONS
-- ELI5: claim_jobs is "give me up to N to-do cards nobody else is holding".
-- FOR UPDATE SKIP LOCKED means two workers never grab the same card.
-- requeue_job puts a failed card back with a growing wait (15 s, 30 s,
-- 60 s ... up to 10 minutes) or marks it failed after the last try.
-- ---------------------------------------------------------------------
create or replace function public.claim_jobs(p_kind public.job_kind, p_limit integer default 4)
returns setof public.jobs language sql security definer set search_path = '' as $$
  update public.jobs j
  set status = 'running', locked_at = now(), attempts = j.attempts + 1, updated_at = now()
  where j.id in (
    select q.id from public.jobs q
    where q.kind = p_kind and q.status = 'queued' and q.run_after <= now()
    order by q.created_at
    for update skip locked
    limit least(greatest(p_limit, 1), 20)
  )
  returning j.*;
$$;

create or replace function public.requeue_job(p_job uuid, p_error text)
returns public.job_status language plpgsql security definer set search_path = '' as $$
declare
  v_job public.jobs;
begin
  select * into v_job from public.jobs where id = p_job for update;
  if not found then
    raise exception 'job not found' using errcode = '22023';
  end if;
  if v_job.attempts >= v_job.max_attempts then
    update public.jobs
    set status = 'failed', error = left(p_error, 500), locked_at = null, updated_at = now()
    where id = p_job;
    return 'failed';
  end if;
  update public.jobs
  set status = 'queued',
      error = left(p_error, 500),
      locked_at = null,
      run_after = now() + least(interval '10 minutes', make_interval(secs => 15 * power(2, v_job.attempts))),
      updated_at = now()
  where id = p_job;
  return 'queued';
end;
$$;

-- Counts a user's jobs of one kind in the last N seconds (rate limiting).
create or replace function public.recent_job_count(p_user uuid, p_kind public.job_kind, p_seconds integer)
returns integer language sql stable security definer set search_path = '' as $$
  select count(*)::integer from public.jobs
  where created_by = p_user and kind = p_kind and created_at > now() - make_interval(secs => p_seconds);
$$;

-- ---------------------------------------------------------------------
-- 10. SLIDE FUNCTIONS
-- ELI5: reorder_slides takes the new order of slide ids and saves it in one
-- go. It refuses if the list is wrong, or if the hook is not first and the
-- CTA not last. replace_slides is used by the AI to write a fresh set.
-- ---------------------------------------------------------------------
create or replace function public.reorder_slides(p_carousel uuid, p_ids uuid[])
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_ws uuid;
  v_count integer;
  v_len integer := coalesce(array_length(p_ids, 1), 0);
begin
  select workspace_id into v_ws from public.carousels where id = p_carousel;
  if v_ws is null or not public.has_workspace_role(v_ws, 'editor') then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  select count(*) into v_count from public.slides where carousel_id = p_carousel;
  if v_count <> v_len
     or (select count(distinct x) from unnest(p_ids) as x) <> v_len
     or exists (
       select 1 from unnest(p_ids) as x(id)
       where not exists (select 1 from public.slides s where s.id = x.id and s.carousel_id = p_carousel)
     ) then
    raise exception 'slide list does not match this carousel' using errcode = '22023';
  end if;

  if (select layout from public.slides where id = p_ids[1]) <> 'hook'
     or (select layout from public.slides where id = p_ids[v_len]) <> 'cta' then
    raise exception 'hook must be first and cta last' using errcode = '22023';
  end if;

  update public.slides s
  set position = (x.ord - 1)::integer, updated_at = now()
  from unnest(p_ids) with ordinality as x(id, ord)
  where s.id = x.id;
end;
$$;

-- p_slides: [{ "layout": "hook", "content": {...}, "warnings": [] }, ...]
create or replace function public.replace_slides(p_carousel uuid, p_slides jsonb)
returns integer language plpgsql security definer set search_path = '' as $$
declare
  v_ws uuid;
  v_n integer;
begin
  select workspace_id into v_ws from public.carousels where id = p_carousel;
  if v_ws is null then
    raise exception 'carousel not found' using errcode = '22023';
  end if;
  if jsonb_typeof(p_slides) <> 'array' or jsonb_array_length(p_slides) not between 3 and 20 then
    raise exception 'slides must be an array of 3 to 20 items' using errcode = '22023';
  end if;

  delete from public.slides where carousel_id = p_carousel;

  insert into public.slides (carousel_id, workspace_id, position, layout, content, warnings)
  select p_carousel, v_ws, (e.ord - 1)::integer,
         (e.value ->> 'layout')::public.slide_layout,
         coalesce(e.value -> 'content', '{}'::jsonb),
         coalesce(array(select jsonb_array_elements_text(coalesce(e.value -> 'warnings', '[]'::jsonb))), '{}')
  from jsonb_array_elements(p_slides) with ordinality as e(value, ord);

  get diagnostics v_n = row_count;
  return v_n;
end;
$$;

-- Copies a carousel and its slides. Not metered (no AI call).
create or replace function public.duplicate_carousel(p_carousel uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_src public.carousels;
  v_new uuid;
begin
  select * into v_src from public.carousels where id = p_carousel;
  if not found or not public.has_workspace_role(v_src.workspace_id, 'editor') then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  insert into public.carousels (workspace_id, brand_id, source_id, title, status, format, caption, hashtags, created_by)
  values (v_src.workspace_id, v_src.brand_id, v_src.source_id, left('Copy of ' || v_src.title, 120), 'ready',
          v_src.format, v_src.caption, v_src.hashtags, (select auth.uid()))
  returning id into v_new;
  insert into public.slides (carousel_id, workspace_id, position, layout, content, warnings)
  select v_new, workspace_id, position, layout, content, warnings
  from public.slides where carousel_id = p_carousel;
  return v_new;
end;
$$;

-- ---------------------------------------------------------------------
-- 11. INVITES
-- ELI5: an admin creates an invite and gets a secret link once. We only keep
-- a fingerprint (hash) of the secret, so a database leak cannot be used to
-- join someone's team. The invitee must sign in with the invited email.
-- ---------------------------------------------------------------------
create or replace function public.create_invite(p_workspace uuid, p_email text, p_role public.workspace_role default 'editor')
returns text language plpgsql security definer set search_path = '' as $$
declare
  v_token text := encode(extensions.gen_random_bytes(24), 'hex');
  v_seats integer;
  v_used integer;
begin
  if not public.has_workspace_role(p_workspace, 'admin') then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if p_role = 'owner' then
    raise exception 'cannot invite an owner' using errcode = '22023';
  end if;
  select l.seats into v_seats from public.plan_limits l where l.plan_id = public.workspace_plan(p_workspace);
  select (select count(*) from public.workspace_members where workspace_id = p_workspace)
       + (select count(*) from public.workspace_invites
          where workspace_id = p_workspace and accepted_at is null and expires_at > now())
    into v_used;
  if v_used >= coalesce(v_seats, 1) then
    raise exception 'seat_limit' using errcode = 'P0001';
  end if;
  insert into public.workspace_invites (workspace_id, email, role, token_hash, invited_by)
  values (p_workspace, lower(trim(p_email)), p_role, encode(sha256(convert_to(v_token, 'UTF8')), 'hex'), (select auth.uid()));
  return v_token;
end;
$$;

create or replace function public.accept_invite(p_token text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_inv public.workspace_invites;
  v_email text;
begin
  select * into v_inv from public.workspace_invites
  where token_hash = encode(sha256(convert_to(p_token, 'UTF8')), 'hex')
    and accepted_at is null and expires_at > now()
  for update;
  if not found then
    raise exception 'invite_invalid' using errcode = '22023';
  end if;
  select email into v_email from auth.users where id = (select auth.uid());
  if v_email is null or lower(v_email) <> lower(v_inv.email) then
    raise exception 'invite_email_mismatch' using errcode = '42501';
  end if;
  insert into public.workspace_members (workspace_id, user_id, role)
  values (v_inv.workspace_id, (select auth.uid()), v_inv.role)
  on conflict (workspace_id, user_id) do nothing;
  update public.workspace_invites set accepted_at = now() where id = v_inv.id;
  return v_inv.workspace_id;
end;
$$;

-- ---------------------------------------------------------------------
-- 12. TRIGGERS
-- ELI5: triggers are "whenever X happens, also do Y" rules that run inside
-- the database, so nobody can skip them from the browser.
-- ---------------------------------------------------------------------

-- 12.1 updated_at on every change
create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger workspaces_updated_at before update on public.workspaces for each row execute function public.set_updated_at();
create trigger brands_updated_at before update on public.brands for each row execute function public.set_updated_at();
create trigger sources_updated_at before update on public.sources for each row execute function public.set_updated_at();
create trigger carousels_updated_at before update on public.carousels for each row execute function public.set_updated_at();
create trigger jobs_updated_at before update on public.jobs for each row execute function public.set_updated_at();
create trigger renders_updated_at before update on public.renders for each row execute function public.set_updated_at();
create trigger social_accounts_updated_at before update on public.social_accounts for each row execute function public.set_updated_at();
create trigger scheduled_posts_updated_at before update on public.scheduled_posts for each row execute function public.set_updated_at();

-- 12.2 New signup: profile + own workspace + owner membership
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_ws uuid;
  v_name text := coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', '');
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (new.id, v_name, new.raw_user_meta_data ->> 'avatar_url')
  on conflict (id) do nothing;

  insert into public.workspaces (name, owner_id)
  values (left(coalesce(nullif(v_name, ''), split_part(coalesce(new.email, 'my'), '@', 1)) || '''s workspace', 80), new.id)
  returning id into v_ws;

  insert into public.workspace_members (workspace_id, user_id, role)
  values (v_ws, new.id, 'owner');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 12.3 Nobody can make themselves owner or remove the owner from the browser.
-- (auth.uid() is null for the secret key, which may do anything.)
create or replace function public.protect_owner()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is null then
    return coalesce(new, old);
  end if;
  -- the workspace itself is being deleted (cascade): allow
  if tg_op = 'DELETE' and not exists (select 1 from public.workspaces w where w.id = old.workspace_id) then
    return old;
  end if;
  if tg_op in ('UPDATE', 'DELETE') and old.role = 'owner' then
    raise exception 'the owner cannot be changed or removed here' using errcode = '42501';
  end if;
  if tg_op in ('INSERT', 'UPDATE') and new.role = 'owner' then
    raise exception 'cannot grant owner' using errcode = '42501';
  end if;
  return coalesce(new, old);
end;
$$;

create trigger workspace_members_protect_owner
  before insert or update or delete on public.workspace_members
  for each row execute function public.protect_owner();

-- 12.4 Brand limits per plan
create or replace function public.enforce_brand_limit()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_limit integer;
  v_count integer;
begin
  select l.brands into v_limit from public.plan_limits l where l.plan_id = public.workspace_plan(new.workspace_id);
  select count(*) into v_count from public.brands where workspace_id = new.workspace_id and deleted_at is null;
  if v_count >= coalesce(v_limit, 1) then
    raise exception 'brand_limit' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger brands_enforce_limit
  before insert on public.brands
  for each row execute function public.enforce_brand_limit();

-- 12.5 A brand used on a row must belong to the same workspace
create or replace function public.ensure_brand_workspace()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if not exists (
    select 1 from public.brands b
    where b.id = new.brand_id and b.workspace_id = new.workspace_id and b.deleted_at is null
  ) then
    raise exception 'brand does not belong to this workspace' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger sources_brand_ws before insert or update of brand_id, workspace_id on public.sources
  for each row execute function public.ensure_brand_workspace();
create trigger carousels_brand_ws before insert or update of brand_id, workspace_id on public.carousels
  for each row execute function public.ensure_brand_workspace();
create trigger social_accounts_brand_ws before insert or update of brand_id, workspace_id on public.social_accounts
  for each row execute function public.ensure_brand_workspace();
create trigger scheduled_posts_brand_ws before insert or update of brand_id, workspace_id on public.scheduled_posts
  for each row execute function public.ensure_brand_workspace();

-- 12.6 Browser edits to a carousel cannot move it to another workspace or fake its status
create or replace function public.guard_carousel_update()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is null then
    return new;
  end if;
  new.workspace_id := old.workspace_id;
  new.source_id := old.source_id;
  new.latest_render_id := old.latest_render_id;
  new.created_by := old.created_by;
  if new.status is distinct from old.status and not (
       new.status = 'archived'
    or (old.status = 'archived' and new.status = 'ready')
    or (old.status = 'rendered' and new.status = 'ready')
  ) then
    raise exception 'status can only be changed by the system' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger carousels_guard_update before update on public.carousels
  for each row execute function public.guard_carousel_update();

-- 12.6b The owner of a workspace can only change through the secret key (support task)
create or replace function public.guard_workspace_update()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is not null then
    new.owner_id := old.owner_id;
  end if;
  return new;
end;
$$;

create trigger workspaces_guard_update before update on public.workspaces
  for each row execute function public.guard_workspace_update();

-- 12.7 Slides always take the workspace of their carousel
create or replace function public.slides_before_write()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'UPDATE' and new.carousel_id <> old.carousel_id then
    raise exception 'slides cannot move between carousels' using errcode = '42501';
  end if;
  select c.workspace_id into new.workspace_id from public.carousels c where c.id = new.carousel_id;
  if new.workspace_id is null then
    raise exception 'carousel not found' using errcode = '22023';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger slides_set_workspace before insert or update on public.slides
  for each row execute function public.slides_before_write();

-- 12.8 Editing slides after an export marks the carousel as needing a new export
create or replace function public.slides_mark_stale()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.carousels
  set status = 'ready'
  where id = coalesce(new.carousel_id, old.carousel_id) and status = 'rendered';
  return null;
end;
$$;

create trigger slides_mark_stale after insert or update or delete on public.slides
  for each row execute function public.slides_mark_stale();

-- 12.9 Revisions take the workspace of their slide
create or replace function public.revisions_before_insert()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  select s.workspace_id into new.workspace_id from public.slides s where s.id = new.slide_id;
  if new.workspace_id is null then
    raise exception 'slide not found' using errcode = '22023';
  end if;
  return new;
end;
$$;

create trigger slide_revisions_set_workspace before insert on public.slide_revisions
  for each row execute function public.revisions_before_insert();

-- ---------------------------------------------------------------------
-- 13. ROW LEVEL SECURITY
-- ELI5: switched on for every table. One policy per action (select,
-- insert, update, delete). Tables with no policy for an action simply
-- refuse that action from the browser. Edge functions use the secret key,
-- which skips RLS, so they can still write jobs, renders and usage.
-- ---------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.workspace_invites enable row level security;
alter table public.brands enable row level security;
alter table public.sources enable row level security;
alter table public.carousels enable row level security;
alter table public.slides enable row level security;
alter table public.slide_revisions enable row level security;
alter table public.jobs enable row level security;
alter table public.renders enable row level security;
alter table public.social_accounts enable row level security;
alter table public.scheduled_posts enable row level security;
alter table public.post_metrics enable row level security;
alter table public.provider_events enable row level security;
alter table public.plan_limits enable row level security;
alter table public.plan_prices enable row level security;
alter table public.usage_ledger enable row level security;
alter table public.subscriptions enable row level security;
alter table public.stripe_events enable row level security;
alter table public.email_log enable row level security;
alter table public.support_requests enable row level security;

-- profiles: see yourself and teammates, edit only yourself
create policy "profiles select self or teammate" on public.profiles for select to authenticated
  using (id = (select auth.uid()) or public.shares_workspace(id));
create policy "profiles update self" on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- workspaces: members read, admins rename, owner deletes. Created only by the signup trigger.
create policy "workspaces select member" on public.workspaces for select to authenticated
  using (public.is_workspace_member(id));
create policy "workspaces update admin" on public.workspaces for update to authenticated
  using (public.has_workspace_role(id, 'admin'))
  with check (public.has_workspace_role(id, 'admin'));
create policy "workspaces delete owner" on public.workspaces for delete to authenticated
  using (owner_id = (select auth.uid()));

-- workspace_members: members see the team, admins change roles and remove people, anyone can leave
create policy "members select member" on public.workspace_members for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy "members update admin" on public.workspace_members for update to authenticated
  using (public.has_workspace_role(workspace_id, 'admin'))
  with check (public.has_workspace_role(workspace_id, 'admin'));
create policy "members delete admin or self" on public.workspace_members for delete to authenticated
  using (public.has_workspace_role(workspace_id, 'admin') or user_id = (select auth.uid()));

-- workspace_invites: admins list and revoke. Created through create_invite().
create policy "invites select admin" on public.workspace_invites for select to authenticated
  using (public.has_workspace_role(workspace_id, 'admin'));
create policy "invites delete admin" on public.workspace_invites for delete to authenticated
  using (public.has_workspace_role(workspace_id, 'admin'));

-- brands: members read, admins create and delete, editors edit
create policy "brands select member" on public.brands for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy "brands insert admin" on public.brands for insert to authenticated
  with check (public.has_workspace_role(workspace_id, 'admin'));
create policy "brands update editor" on public.brands for update to authenticated
  using (public.has_workspace_role(workspace_id, 'editor'))
  with check (public.has_workspace_role(workspace_id, 'editor'));
create policy "brands delete admin" on public.brands for delete to authenticated
  using (public.has_workspace_role(workspace_id, 'admin'));

-- sources: created by fol-ingest only; members read; editors delete
create policy "sources select member" on public.sources for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy "sources delete editor" on public.sources for delete to authenticated
  using (public.has_workspace_role(workspace_id, 'editor'));

-- carousels: created by fol-generate or duplicate_carousel(); editors edit title, caption, archive
create policy "carousels select member" on public.carousels for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy "carousels update editor" on public.carousels for update to authenticated
  using (public.has_workspace_role(workspace_id, 'editor'))
  with check (public.has_workspace_role(workspace_id, 'editor'));
create policy "carousels delete admin" on public.carousels for delete to authenticated
  using (public.has_workspace_role(workspace_id, 'admin'));

-- slides: editors add, edit and delete (workspace_id is set by trigger 12.7 before this check runs)
create policy "slides select member" on public.slides for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy "slides insert editor" on public.slides for insert to authenticated
  with check (public.has_workspace_role(workspace_id, 'editor'));
create policy "slides update editor" on public.slides for update to authenticated
  using (public.has_workspace_role(workspace_id, 'editor'))
  with check (public.has_workspace_role(workspace_id, 'editor'));
create policy "slides delete editor" on public.slides for delete to authenticated
  using (public.has_workspace_role(workspace_id, 'editor'));

-- slide_revisions: append only from the browser (manual edits and undo points)
create policy "revisions select member" on public.slide_revisions for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy "revisions insert editor" on public.slide_revisions for insert to authenticated
  with check (public.has_workspace_role(workspace_id, 'editor') and created_by = (select auth.uid()));

-- read-only from the browser: jobs, renders, social accounts, posts, metrics, usage
create policy "jobs select member" on public.jobs for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy "renders select member" on public.renders for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy "social_accounts select member" on public.social_accounts for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy "scheduled_posts select member" on public.scheduled_posts for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy "post_metrics select member" on public.post_metrics for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy "usage_ledger select member" on public.usage_ledger for select to authenticated
  using (public.is_workspace_member(workspace_id));

-- plan tables are public price lists for signed-in users
create policy "plan_limits select all" on public.plan_limits for select to authenticated using (true);
create policy "plan_prices select all" on public.plan_prices for select to authenticated using (true);

-- billing: you see your own subscription row only. Only the Stripe webhook writes it.
create policy "subscriptions select own" on public.subscriptions for select to authenticated
  using (user_id = (select auth.uid()));

-- support: write and read your own requests
create policy "support insert own" on public.support_requests for insert to authenticated
  with check (user_id = (select auth.uid()) and public.is_workspace_member(workspace_id));
create policy "support select own" on public.support_requests for select to authenticated
  using (user_id = (select auth.uid()));

-- provider_events, stripe_events, email_log: no policies. Secret key only.

-- ---------------------------------------------------------------------
-- 14. FUNCTION PERMISSIONS
-- ELI5: by default anyone can call a database function. We take that away
-- for the ones that touch money, counters or the job queue, and give them
-- only to service_role (the secret key used by edge functions).
-- ---------------------------------------------------------------------
revoke execute on function public.try_consume_usage(uuid, uuid, public.usage_metric, integer, text, uuid, bigint) from public, anon, authenticated;
revoke execute on function public.refund_usage(text) from public, anon, authenticated;
revoke execute on function public.set_usage_cost(text, bigint) from public, anon, authenticated;
revoke execute on function public.claim_jobs(public.job_kind, integer) from public, anon, authenticated;
revoke execute on function public.requeue_job(uuid, text) from public, anon, authenticated;
revoke execute on function public.recent_job_count(uuid, public.job_kind, integer) from public, anon, authenticated;
revoke execute on function public.replace_slides(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.try_consume_usage(uuid, uuid, public.usage_metric, integer, text, uuid, bigint) to service_role;
grant execute on function public.refund_usage(text) to service_role;
grant execute on function public.set_usage_cost(text, bigint) to service_role;
grant execute on function public.claim_jobs(public.job_kind, integer) to service_role;
grant execute on function public.requeue_job(uuid, text) to service_role;
grant execute on function public.recent_job_count(uuid, public.job_kind, integer) to service_role;
grant execute on function public.replace_slides(uuid, jsonb) to service_role;

revoke execute on function public.has_active_access(uuid) from public, anon, authenticated;
revoke execute on function public.workspace_plan(uuid) from public, anon, authenticated;
revoke execute on function public.plan_limit(uuid, public.usage_metric) from public, anon, authenticated;
revoke execute on function public.usage_used(uuid, public.usage_metric) from public, anon, authenticated;
grant execute on function public.has_active_access(uuid) to service_role;
grant execute on function public.workspace_plan(uuid) to service_role;
grant execute on function public.plan_limit(uuid, public.usage_metric) to service_role;
grant execute on function public.usage_used(uuid, public.usage_metric) to service_role;

-- Browser-callable (they check membership inside)
revoke execute on function public.reorder_slides(uuid, uuid[]) from public, anon;
revoke execute on function public.duplicate_carousel(uuid) from public, anon;
revoke execute on function public.usage_summary(uuid) from public, anon;
revoke execute on function public.create_invite(uuid, text, public.workspace_role) from public, anon;
revoke execute on function public.accept_invite(text) from public, anon;
grant execute on function public.reorder_slides(uuid, uuid[]) to authenticated;
grant execute on function public.duplicate_carousel(uuid) to authenticated;
grant execute on function public.usage_summary(uuid) to authenticated;
grant execute on function public.create_invite(uuid, text, public.workspace_role) to authenticated;
grant execute on function public.accept_invite(text) to authenticated;

-- ---------------------------------------------------------------------
-- 15. STORAGE BUCKETS AND POLICIES
-- ELI5: three private folders in the cloud. Every file path starts with the
-- workspace id, and the policies check you are in that workspace.
-- brand-assets: logos, headshots, custom fonts (members upload)
-- voice-notes: recordings (members upload, deleted after 30 days)
-- renders: PNGs and PDFs (only the render worker writes, members download)
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('brand-assets', 'brand-assets', false, 5242880,
    array['image/png', 'image/jpeg', 'image/webp', 'font/ttf', 'font/otf', 'application/x-font-ttf', 'application/x-font-otf', 'application/octet-stream']),
  ('voice-notes', 'voice-notes', false, 26214400,
    array['audio/webm', 'audio/mp4', 'audio/mpeg', 'audio/wav', 'audio/x-m4a', 'audio/ogg']),
  ('renders', 'renders', false, 52428800,
    array['image/png', 'application/pdf'])
on conflict (id) do nothing;

create policy "brand-assets read member" on storage.objects for select to authenticated
  using (bucket_id = 'brand-assets' and public.is_workspace_member(public.path_workspace(name)));
create policy "brand-assets insert editor" on storage.objects for insert to authenticated
  with check (bucket_id = 'brand-assets' and public.has_workspace_role(public.path_workspace(name), 'editor'));
create policy "brand-assets update editor" on storage.objects for update to authenticated
  using (bucket_id = 'brand-assets' and public.has_workspace_role(public.path_workspace(name), 'editor'))
  with check (bucket_id = 'brand-assets' and public.has_workspace_role(public.path_workspace(name), 'editor'));
create policy "brand-assets delete admin" on storage.objects for delete to authenticated
  using (bucket_id = 'brand-assets' and public.has_workspace_role(public.path_workspace(name), 'admin'));

create policy "voice-notes read member" on storage.objects for select to authenticated
  using (bucket_id = 'voice-notes' and public.is_workspace_member(public.path_workspace(name)));
create policy "voice-notes insert editor" on storage.objects for insert to authenticated
  with check (bucket_id = 'voice-notes' and public.has_workspace_role(public.path_workspace(name), 'editor'));
create policy "voice-notes delete editor" on storage.objects for delete to authenticated
  using (bucket_id = 'voice-notes' and public.has_workspace_role(public.path_workspace(name), 'editor'));

create policy "renders read member" on storage.objects for select to authenticated
  using (bucket_id = 'renders' and public.is_workspace_member(public.path_workspace(name)));
-- no insert, update or delete policies on renders: only the secret key writes there

-- ---------------------------------------------------------------------
-- 16. REALTIME
-- ELI5: lets the browser get a push when a job's progress changes, so the
-- progress bar moves without refreshing. RLS still applies to what it sees.
-- ---------------------------------------------------------------------
alter publication supabase_realtime add table public.jobs;
alter publication supabase_realtime add table public.carousels;
alter publication supabase_realtime add table public.renders;
alter publication supabase_realtime add table public.scheduled_posts;

-- ---------------------------------------------------------------------
-- 17. SEED: PLAN LIMITS
-- ELI5: the numbers from the pricing page. 'none' is a signed-up user who
-- has not started a trial: they can set up one brand kit and nothing else.
-- Change these numbers here if you change your pricing.
-- ---------------------------------------------------------------------
insert into public.plan_limits
  (plan_id, carousels, rewrites, renders, voice_minutes, scrapes, brands, social_accounts, seats, analytics, custom_fonts, remove_mark)
values
  ('none',      0,    0,    0,   0,   0,  1,  0, 1, false, false, false),
  ('trial',     5,   30,   15,  10,  15,  1,  1, 1, false, false, false),
  ('creator',  15,  100,   60,  30,  45,  1,  1, 1, false, false, true),
  ('pro',      50,  400,  200, 120, 150,  3,  3, 2, true,  true,  true),
  ('agency',  150, 1000, 1000, 400, 450, 10, 10, 5, true,  true,  true)
on conflict (plan_id) do nothing;

-- After you create your Stripe prices, run (with your real ids):
-- insert into public.plan_prices (stripe_price_id, plan_id, interval) values
--   ('price_creator_month_xxx', 'creator', 'month'), ('price_creator_year_xxx', 'creator', 'year'),
--   ('price_pro_month_xxx', 'pro', 'month'),         ('price_pro_year_xxx', 'pro', 'year'),
--   ('price_agency_month_xxx', 'agency', 'month'),   ('price_agency_year_xxx', 'agency', 'year');

-- ---------------------------------------------------------------------
-- 18. QUICK CHECKS (run after the migration)
-- select tablename, rowsecurity from pg_tables where schemaname = 'public' order by 1;
--   every row should say true
-- select * from public.plan_limits;
--   five rows
-- =====================================================================
`
