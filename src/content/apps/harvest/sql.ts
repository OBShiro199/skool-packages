// Harvest single migration, pasted into the Supabase SQL editor once on a fresh project.
// Tested on Postgres 16 with Supabase auth, storage and realtime stubs (Oct 2026).

export const sql = `-- =====================================================================
-- Harvest: full database migration
-- Paste this whole file into Supabase > SQL Editor > New query > Run.
-- Run it ONCE on a fresh project. Order: extensions, enums, tables,
-- helper functions, triggers, RLS policies, views, storage, realtime,
-- schedules (commented out, run later).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. EXTENSIONS
-- ELI5: extensions are add-ons for the database. pgcrypto gives us
-- secure random bytes and SHA-256 hashing for invite and unsubscribe
-- tokens.
-- ---------------------------------------------------------------------
create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------
-- 1. ENUMS
-- ELI5: an enum is a fixed list of allowed words for a column. A lead
-- can be 'hot' or 'warm', never 'banana'.
-- ---------------------------------------------------------------------
create type public.workspace_role as enum ('owner', 'admin', 'member');
create type public.source_kind as enum ('post', 'creator');
create type public.source_relation as enum ('mine', 'competitor', 'influencer');
create type public.source_status as enum ('active', 'paused', 'error');
create type public.post_status as enum ('tracking', 'done', 'unavailable');
create type public.run_status as enum ('scheduled', 'collecting', 'processing', 'ready', 'sent', 'skipped', 'failed');
create type public.apify_kind as enum ('posts', 'reactions', 'comments');
create type public.apify_status as enum ('running', 'succeeded', 'failed', 'ingested');
create type public.engagement_kind as enum ('reaction', 'comment');
create type public.enrich_status as enum ('new', 'prefiltered_out', 'queued', 'enriched', 'no_match', 'failed');
create type public.email_status as enum ('none', 'ok', 'catch_all', 'unknown', 'invalid');
create type public.lead_tier as enum ('hot', 'warm', 'cold');
create type public.lead_status as enum ('new', 'saved', 'dismissed', 'customer', 'pushed');
create type public.suppression_kind as enum ('email', 'domain', 'linkedin');
create type public.suppression_source as enum ('csv', 'manual', 'customer', 'forget', 'crm');
create type public.integration_provider as enum ('hubspot', 'pipedrive', 'webhook');
create type public.integration_status as enum ('active', 'error', 'disconnected');
create type public.push_status as enum ('queued', 'done', 'failed');
create type public.import_kind as enum ('suppression_csv', 'engagers_csv');
create type public.import_status as enum ('uploaded', 'processing', 'done', 'failed');
create type public.job_kind as enum ('discover_posts', 'collect_post', 'ingest_run', 'prefilter', 'enrich',
  'score', 'push', 'import_csv');
create type public.job_status as enum ('queued', 'running', 'done', 'dead');
create type public.usage_kind as enum ('engagements', 'enrichments', 'verifications', 'ai_prefilter', 'ai_score');

-- ---------------------------------------------------------------------
-- 2. SHARED TRIGGER: updated_at
-- ELI5: every time a row changes, this stamps the time on it.
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- 3. PROFILES (one per login) + signup trigger
-- ELI5: Supabase keeps logins in auth.users. We keep a friendly copy
-- (name, current workspace) in public.profiles, made automatically.
-- ---------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text,
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
  values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'))
  on conflict (id) do nothing;
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- 4. WORKSPACES, MEMBERS, INVITES
-- ELI5: a workspace is one company's account. Everything Harvest finds
-- belongs to a workspace, and people join it as owner, admin or member.
-- collect_hour and digest_hour are in the workspace's own timezone.
-- ---------------------------------------------------------------------
create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 80),
  owner_id uuid not null references auth.users (id) on delete cascade,
  timezone text not null default 'Europe/London',
  collect_hour smallint not null default 3 check (collect_hour between 0 and 23),
  digest_hour smallint not null default 7 check (digest_hour between 0 and 23),
  sender_company text check (char_length(sender_company) <= 120),
  sender_offer text check (char_length(sender_offer) <= 300),
  collect_now_used_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index workspaces_owner_idx on public.workspaces (owner_id);
create trigger workspaces_updated_at before update on public.workspaces
  for each row execute function public.set_updated_at();

alter table public.profiles add constraint profiles_current_ws_fkey
  foreign key (current_workspace_id) references public.workspaces (id) on delete set null;
create index profiles_current_ws_idx on public.profiles (current_workspace_id);

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
  email text not null,
  role public.workspace_role not null default 'member' check (role <> 'owner'),
  token_hash text not null unique,
  invited_by uuid references auth.users (id) on delete set null,
  expires_at timestamptz not null default now() + interval '7 days',
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);
create index workspace_invites_ws_idx on public.workspace_invites (workspace_id);
create index workspace_invites_invited_by_idx on public.workspace_invites (invited_by);

-- ---------------------------------------------------------------------
-- 5. MEMBERSHIP HELPERS (used by every policy below)
-- ELI5: one question asked everywhere: "is the logged-in person a
-- member of this workspace?" Security definer means the function can
-- look at the members table even though RLS protects it.
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

create or replace function public.is_workspace_member_text(ws text)
returns boolean language plpgsql stable security definer set search_path = '' as $$
begin
  return public.is_workspace_member(ws::uuid);
exception when others then
  return false;
end;
$$;

-- ---------------------------------------------------------------------
-- 6. IDEAL CUSTOMER PROFILES
-- ELI5: the ICP is the description of who you want to sell to. Every
-- engager is scored against one ICP. The plan decides how many you get.
-- ---------------------------------------------------------------------
create table public.icps (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  description text not null default '' check (char_length(description) <= 1000),
  titles_include text[] not null default '{}',
  titles_exclude text[] not null default '{}',
  seniorities text[] not null default '{}',
  company_size_min integer check (company_size_min > 0),
  company_size_max integer check (company_size_max > 0),
  industries text[] not null default '{}',
  countries text[] not null default '{}',
  keywords_exclude text[] not null default '{student,"open to work",intern}',
  prefilter_threshold smallint not null default 55 check (prefilter_threshold between 0 and 100),
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index icps_ws_idx on public.icps (workspace_id);
create unique index icps_one_default on public.icps (workspace_id) where is_default;
create trigger icps_updated_at before update on public.icps
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- 7. SOURCES AND POSTS
-- ELI5: a source is something you asked Harvest to watch: one post, or
-- a creator whose new posts are watched automatically. Each post is
-- collected in up to three "passes" (24 hours, 72 hours, 7 days old).
-- ---------------------------------------------------------------------
create table public.sources (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  icp_id uuid references public.icps (id) on delete set null,
  kind public.source_kind not null,
  relation public.source_relation not null default 'mine',
  url text not null check (char_length(url) <= 600),
  url_key text not null check (char_length(url_key) <= 200),
  label text check (char_length(label) <= 120),
  status public.source_status not null default 'active',
  last_error text,
  failures_in_row smallint not null default 0,
  last_checked_at timestamptz,
  posts_found integer not null default 0,
  engagers_collected integer not null default 0,
  leads_produced integer not null default 0,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, url_key)
);
create index sources_icp_idx on public.sources (icp_id);
create index sources_created_by_idx on public.sources (created_by);
create index sources_ws_status_idx on public.sources (workspace_id, status);
create trigger sources_updated_at before update on public.sources
  for each row execute function public.set_updated_at();

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  source_id uuid not null references public.sources (id) on delete cascade,
  post_url text not null,
  url_key text not null,
  author_name text,
  author_url text,
  posted_at timestamptz,
  text_excerpt text check (char_length(text_excerpt) <= 500),
  reaction_count integer not null default 0,
  comment_count integer not null default 0,
  collected_reactions integer not null default 0,
  collected_comments integer not null default 0,
  reactions_at_last_pass integer not null default 0,
  passes_done smallint not null default 0,
  not_found_count smallint not null default 0,
  next_pass_at timestamptz,
  status public.post_status not null default 'tracking',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, url_key)
);
create index posts_source_idx on public.posts (source_id);
create index posts_due_idx on public.posts (workspace_id, next_pass_at) where status = 'tracking';
create trigger posts_updated_at before update on public.posts
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- 8. DAILY RUNS AND APIFY RUNS
-- ELI5: a daily run is "this morning's harvest" for one workspace. The
-- unique (workspace_id, run_date) rule means the scheduler can never
-- start two harvests on the same day. apify_runs remembers every job we
-- handed to Apify so a webhook can be matched to it.
-- ---------------------------------------------------------------------
create table public.daily_runs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  run_date date not null,
  status public.run_status not null default 'scheduled',
  counters jsonb not null default '{}'::jsonb,
  is_manual boolean not null default false,
  started_at timestamptz,
  ready_at timestamptz,
  digest_sent_at timestamptz,
  last_progress_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (workspace_id, run_date, is_manual)
);
create index daily_runs_status_idx on public.daily_runs (status, run_date);

create table public.apify_runs (
  id text primary key,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  daily_run_id uuid references public.daily_runs (id) on delete set null,
  kind public.apify_kind not null,
  actor_id text not null,
  post_ids uuid[] not null default '{}',
  source_ids uuid[] not null default '{}',
  status public.apify_status not null default 'running',
  dataset_id text,
  max_items integer,
  items_count integer not null default 0,
  charged_usd numeric(10, 4),
  retry_of text,
  started_at timestamptz not null default now(),
  webhook_at timestamptz,
  ingested_at timestamptz
);
create index apify_runs_ws_idx on public.apify_runs (workspace_id);
create index apify_runs_daily_idx on public.apify_runs (daily_run_id);
create index apify_runs_running_idx on public.apify_runs (started_at) where status = 'running';

-- ---------------------------------------------------------------------
-- 9. PEOPLE, ENGAGEMENTS, LEADS
-- ELI5: a person is someone who reacted or commented, once per
-- workspace (person_key is the bit after linkedin.com/in/). An
-- engagement is one reaction or comment on one post. A lead is a person
-- Harvest has scored, with an opener. One lead per person per
-- workspace, so the same person never shows up twice.
-- ---------------------------------------------------------------------
create table public.people (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  person_key text not null check (char_length(person_key) <= 200),
  linkedin_url text not null,
  full_name text,
  headline text check (char_length(headline) <= 400),
  location text,
  first_seen_at timestamptz not null default now(),
  last_engaged_at timestamptz,
  engagement_count integer not null default 0,
  prefilter_score smallint check (prefilter_score between 0 and 100),
  prefilter_reason text,
  enrich_status public.enrich_status not null default 'new',
  enrich_attempts smallint not null default 0,
  enriched_at timestamptz,
  title text,
  seniority text,
  company_name text,
  company_domain text,
  company_linkedin text,
  company_size integer,
  company_industry text,
  company_country text,
  email text,
  email_status public.email_status not null default 'none',
  email_verified_at timestamptz,
  suppressed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, person_key)
);
create index people_enrich_queue_idx on public.people (workspace_id, enrich_status, prefilter_score desc);
create index people_domain_idx on public.people (workspace_id, company_domain);
create index people_email_idx on public.people (workspace_id, lower(email));
create trigger people_updated_at before update on public.people
  for each row execute function public.set_updated_at();

create table public.engagements (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  person_id uuid not null references public.people (id) on delete cascade,
  post_id uuid not null references public.posts (id) on delete cascade,
  kind public.engagement_kind not null,
  reaction_type text,
  comment_id text not null default '',
  comment_excerpt text check (char_length(comment_excerpt) <= 500),
  engaged_at timestamptz,
  collected_at timestamptz not null default now(),
  unique (post_id, person_id, kind, comment_id)
);
create index engagements_ws_idx on public.engagements (workspace_id, collected_at desc);
create index engagements_person_idx on public.engagements (person_id);

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  person_id uuid not null references public.people (id) on delete cascade,
  icp_id uuid references public.icps (id) on delete set null,
  daily_run_id uuid references public.daily_runs (id) on delete set null,
  last_engagement_id uuid references public.engagements (id) on delete set null,
  score smallint not null check (score between 0 and 100),
  tier public.lead_tier not null,
  reasons jsonb not null default '[]'::jsonb,
  disqualifiers jsonb not null default '[]'::jsonb,
  opener text check (char_length(opener) <= 400),
  opener_basis text,
  opener_edited boolean not null default false,
  status public.lead_status not null default 'new',
  first_scored_at timestamptz not null default now(),
  scored_at timestamptz not null default now(),
  surfaced_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (workspace_id, person_id)
);
create index leads_person_idx on public.leads (person_id);
create index leads_icp_idx on public.leads (icp_id);
create index leads_run_idx on public.leads (daily_run_id);
create index leads_last_eng_idx on public.leads (last_engagement_id);
create index leads_ws_score_idx on public.leads (workspace_id, status, score desc);
create index leads_digest_idx on public.leads (workspace_id, score desc) where surfaced_at is null;
create trigger leads_updated_at before update on public.leads
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- 10. LISTS
-- ELI5: a list is a folder of leads you want to export or push together.
-- ---------------------------------------------------------------------
create table public.lists (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  created_by uuid references auth.users (id) on delete set null,
  last_exported_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index lists_ws_idx on public.lists (workspace_id);
create index lists_created_by_idx on public.lists (created_by);
create trigger lists_updated_at before update on public.lists
  for each row execute function public.set_updated_at();

create table public.list_items (
  list_id uuid not null references public.lists (id) on delete cascade,
  lead_id uuid not null references public.leads (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  added_at timestamptz not null default now(),
  primary key (list_id, lead_id)
);
create index list_items_lead_idx on public.list_items (lead_id);
create index list_items_ws_idx on public.list_items (workspace_id);

-- ---------------------------------------------------------------------
-- 11. SUPPRESSIONS AND IMPORTS
-- ELI5: the suppression list is "never show me these people": your
-- customers, your own team, anyone you clicked Forget on. Values are
-- stored lower-case so 'Acme.com' and 'acme.com' match.
-- ---------------------------------------------------------------------
create table public.suppressions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  kind public.suppression_kind not null,
  value text not null check (value = lower(value) and char_length(value) between 1 and 320),
  source public.suppression_source not null default 'manual',
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (workspace_id, kind, value)
);
create index suppressions_created_by_idx on public.suppressions (created_by);

create table public.imports (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  kind public.import_kind not null,
  storage_path text not null,
  status public.import_status not null default 'uploaded',
  rows_total integer not null default 0,
  rows_ok integer not null default 0,
  error text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
create index imports_ws_idx on public.imports (workspace_id);
create index imports_created_by_idx on public.imports (created_by);

-- ---------------------------------------------------------------------
-- 12. INTEGRATIONS AND PUSHES
-- ELI5: an integration is a place Harvest sends leads: HubSpot,
-- Pipedrive or any webhook URL. The customer's token is stored
-- encrypted, and the browser is never allowed to read that column.
-- ---------------------------------------------------------------------
create table public.integrations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  provider public.integration_provider not null,
  name text not null default '' check (char_length(name) <= 80),
  status public.integration_status not null default 'active',
  config jsonb not null default '{}'::jsonb,
  secret_ciphertext text,
  secret_last4 text,
  last_error text,
  last_used_at timestamptz,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index integrations_ws_idx on public.integrations (workspace_id);
create index integrations_created_by_idx on public.integrations (created_by);
create trigger integrations_updated_at before update on public.integrations
  for each row execute function public.set_updated_at();

create table public.pushes (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  lead_id uuid not null references public.leads (id) on delete cascade,
  integration_id uuid not null references public.integrations (id) on delete cascade,
  status public.push_status not null default 'queued',
  external_id text,
  error text,
  idempotency_key text not null unique,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index pushes_ws_idx on public.pushes (workspace_id, created_at desc);
create index pushes_lead_idx on public.pushes (lead_id);
create index pushes_integration_idx on public.pushes (integration_id);
create index pushes_created_by_idx on public.pushes (created_by);
create trigger pushes_updated_at before update on public.pushes
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- 13. JOBS QUEUE, USAGE LEDGER, WEBHOOK EVENTS, EMAIL LOG, RATE LIMITS
-- ELI5: jobs is the to-do list the workers chew through. usage_ledger
-- is the till receipt: every paid API call writes one line, and the
-- plan caps are checked against it. idempotency_key means the same
-- receipt can never be written twice, even if a worker retries.
-- ---------------------------------------------------------------------
create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces (id) on delete cascade,
  daily_run_id uuid references public.daily_runs (id) on delete cascade,
  kind public.job_kind not null,
  payload jsonb not null default '{}'::jsonb,
  status public.job_status not null default 'queued',
  attempts smallint not null default 0,
  max_attempts smallint not null default 5,
  run_after timestamptz not null default now(),
  locked_at timestamptz,
  last_error text,
  idempotency_key text unique,
  created_at timestamptz not null default now(),
  finished_at timestamptz
);
create index jobs_claim_idx on public.jobs (kind, run_after) where status = 'queued';
create index jobs_ws_idx on public.jobs (workspace_id);
create index jobs_run_idx on public.jobs (daily_run_id, status);

create table public.usage_ledger (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  kind public.usage_kind not null,
  quantity integer not null check (quantity >= 0),
  cost_micros bigint not null default 0,
  ref_id text,
  idempotency_key text not null unique,
  created_at timestamptz not null default now()
);
create index usage_ledger_ws_kind_idx on public.usage_ledger (workspace_id, kind, created_at);

create table public.webhook_events (
  id text primary key,
  provider text not null,
  received_at timestamptz not null default now()
);

create table public.email_log (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null,
  kind text not null,
  to_email text not null,
  subject text,
  dedupe_key text not null unique,
  resend_id text,
  status text not null default 'queued',
  error text,
  created_at timestamptz not null default now()
);
create index email_log_ws_idx on public.email_log (workspace_id);
create index email_log_user_idx on public.email_log (user_id);

create table public.notification_prefs (
  user_id uuid not null references auth.users (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  digest_enabled boolean not null default true,
  digest_min_tier public.lead_tier not null default 'warm',
  weekly_summary boolean not null default true,
  updated_at timestamptz not null default now(),
  primary key (user_id, workspace_id)
);
create index notification_prefs_ws_idx on public.notification_prefs (workspace_id);
create trigger notification_prefs_updated_at before update on public.notification_prefs
  for each row execute function public.set_updated_at();

create table public.rate_limits (
  key text not null,
  window_start timestamptz not null,
  count integer not null default 0,
  primary key (key, window_start)
);

-- ---------------------------------------------------------------------
-- 14. BILLING (written only by the Stripe webhook with the secret key)
-- ELI5: subscriptions says who has paid. The browser can read its own
-- row but never write it. plan_prices maps Stripe price ids to plans.
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

create table public.plan_prices (
  price_id text primary key,
  plan text not null check (plan in ('solo', 'growth', 'agency')),
  interval text not null default 'month' check (interval in ('month', 'year'))
);

create table public.workspace_limit_overrides (
  workspace_id uuid primary key references public.workspaces (id) on delete cascade,
  sources integer,
  engagements integer,
  enrichments integer,
  note text,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 15. ACCESS AND LIMIT FUNCTIONS
-- ELI5: has_active_access is the paywall: the workspace owner must be
-- trialing or active. plan_limits is the one place the caps live.
-- usage_this_period adds up the till receipts since the billing period
-- started, and remaining_* says how much is left.
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
returns table (plan text, status text, seats integer, sources integer, engagements integer,
               enrichments integer, icps integer, recipients integer, crm_push boolean)
language plpgsql stable security definer set search_path = '' as $$
declare
  v_plan text;
  v_status text;
  o record;
begin
  select coalesce(pp.plan, 'solo'), s.status into v_plan, v_status
  from public.workspaces w
  left join public.subscriptions s on s.user_id = w.owner_id
  left join public.plan_prices pp on pp.price_id = s.price_id
  where w.id = ws;

  if v_plan is null then v_plan := 'solo'; end if;
  plan := v_plan;
  status := coalesce(v_status, 'none');

  if v_plan = 'agency' then
    seats := 10; sources := 150; engagements := 10000; enrichments := 950; icps := 10; recipients := 10; crm_push := true;
  elsif v_plan = 'growth' then
    seats := 3; sources := 50; engagements := 4000; enrichments := 600; icps := 3; recipients := 3; crm_push := true;
  else
    seats := 1; sources := 15; engagements := 1500; enrichments := 300; icps := 1; recipients := 1; crm_push := false;
  end if;

  -- A 7 day trial gets Growth features with small caps, so a trial that
  -- never converts costs about $1.60 at most.
  if v_status = 'trialing' then
    seats := 3; sources := 5; engagements := 300; enrichments := 40; icps := 3; recipients := 3; crm_push := true;
  end if;

  select * into o from public.workspace_limit_overrides where workspace_id = ws;
  if found then
    sources := coalesce(o.sources, sources);
    engagements := coalesce(o.engagements, engagements);
    enrichments := coalesce(o.enrichments, enrichments);
  end if;

  return next;
end;
$$;

-- Start of the current billing period: Stripe's period start, or the
-- first of the month if there is none yet.
create or replace function public.period_start(ws uuid)
returns timestamptz language sql stable security definer set search_path = '' as $$
  select coalesce(
    (select s.current_period_start from public.workspaces w
       join public.subscriptions s on s.user_id = w.owner_id where w.id = ws),
    date_trunc('month', now())
  );
$$;

create or replace function public.usage_this_period(ws uuid, k public.usage_kind)
returns integer language sql stable security definer set search_path = '' as $$
  select coalesce(sum(u.quantity), 0)::integer from public.usage_ledger u
  where u.workspace_id = ws and u.kind = k and u.created_at >= public.period_start(ws);
$$;

create or replace function public.remaining_engagements(ws uuid)
returns integer language sql stable security definer set search_path = '' as $$
  select greatest(0, (select l.engagements from public.plan_limits(ws) l)
                     - public.usage_this_period(ws, 'engagements'));
$$;

create or replace function public.remaining_enrichments(ws uuid)
returns integer language sql stable security definer set search_path = '' as $$
  select greatest(0, (select l.enrichments from public.plan_limits(ws) l)
                     - public.usage_this_period(ws, 'enrichments'));
$$;

-- What the Billing page and the sidebar meter show. Members only.
create or replace function public.usage_summary(ws uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  l record;
begin
  if not public.is_workspace_member(ws) then
    raise exception 'not a member' using errcode = '42501';
  end if;
  select * into l from public.plan_limits(ws);
  return jsonb_build_object(
    'plan', l.plan, 'status', l.status,
    'period_start', public.period_start(ws),
    'engagements_used', public.usage_this_period(ws, 'engagements'), 'engagements_cap', l.engagements,
    'enrichments_used', public.usage_this_period(ws, 'enrichments'), 'enrichments_cap', l.enrichments,
    'sources_used', (select count(*) from public.sources s where s.workspace_id = ws), 'sources_cap', l.sources,
    'seats', l.seats, 'icps', l.icps, 'crm_push', l.crm_push);
end;
$$;

-- Fixed-window rate limiter. Returns false when the key is over p_max.
create or replace function public.try_rate_limit(p_key text, p_max integer, p_window_seconds integer)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  v_window timestamptz := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  v_count integer;
begin
  insert into public.rate_limits as r (key, window_start, count) values (p_key, v_window, 1)
  on conflict (key, window_start) do update set count = r.count + 1
  returning count into v_count;
  return v_count <= p_max;
end;
$$;

-- ---------------------------------------------------------------------
-- 16. WORKSPACE AND INVITE FUNCTIONS (called from the app)
-- ELI5: creating a workspace touches several tables at once (workspace,
-- owner membership, default ICP, notification prefs), so it happens in
-- one function instead of several inserts from the browser.
-- ---------------------------------------------------------------------
create or replace function public.create_workspace(p_name text, p_timezone text default 'Europe/London')
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_ws uuid;
begin
  if v_uid is null then raise exception 'not signed in' using errcode = '42501'; end if;
  if (select count(*) from public.workspaces where owner_id = v_uid) >= 5 then
    raise exception 'workspace limit reached' using errcode = 'P0001';
  end if;
  insert into public.workspaces (name, owner_id, timezone)
  values (trim(p_name), v_uid, coalesce(nullif(p_timezone, ''), 'Europe/London'))
  returning id into v_ws;
  insert into public.workspace_members (workspace_id, user_id, role) values (v_ws, v_uid, 'owner');
  insert into public.icps (workspace_id, name, is_default) values (v_ws, 'My buyer', true);
  insert into public.notification_prefs (user_id, workspace_id) values (v_uid, v_ws);
  update public.profiles set current_workspace_id = v_ws where id = v_uid;
  return v_ws;
end;
$$;

create or replace function public.create_invite(p_ws uuid, p_email text, p_role public.workspace_role)
returns text language plpgsql security definer set search_path = '' as $$
declare
  v_token text := encode(extensions.gen_random_bytes(32), 'hex');
  v_seats integer;
  v_used integer;
begin
  if not public.has_workspace_role(p_ws, array['owner', 'admin']::public.workspace_role[]) then
    raise exception 'only owners and admins can invite' using errcode = '42501';
  end if;
  if p_role = 'owner' then raise exception 'cannot invite an owner' using errcode = 'P0001'; end if;
  select l.seats into v_seats from public.plan_limits(p_ws) l;
  select (select count(*) from public.workspace_members where workspace_id = p_ws)
       + (select count(*) from public.workspace_invites
          where workspace_id = p_ws and accepted_at is null and expires_at > now())
    into v_used;
  if v_used >= v_seats then raise exception 'seat limit reached' using errcode = 'P0001'; end if;
  insert into public.workspace_invites (workspace_id, email, role, token_hash, invited_by)
  values (p_ws, lower(trim(p_email)), p_role, encode(extensions.digest(v_token, 'sha256'), 'hex'), auth.uid());
  return v_token;
end;
$$;

create or replace function public.accept_invite(p_token text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_inv public.workspace_invites;
  v_uid uuid := auth.uid();
  v_email text;
begin
  if v_uid is null then raise exception 'not signed in' using errcode = '42501'; end if;
  select * into v_inv from public.workspace_invites
  where token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex')
    and accepted_at is null and expires_at > now()
  for update;
  if not found then raise exception 'invite not found or expired' using errcode = 'P0002'; end if;
  select lower(email) into v_email from auth.users where id = v_uid;
  if v_email is distinct from v_inv.email then
    raise exception 'this invite was sent to a different email' using errcode = '42501';
  end if;
  insert into public.workspace_members (workspace_id, user_id, role)
  values (v_inv.workspace_id, v_uid, v_inv.role) on conflict do nothing;
  insert into public.notification_prefs (user_id, workspace_id)
  values (v_uid, v_inv.workspace_id) on conflict do nothing;
  update public.workspace_invites set accepted_at = now() where id = v_inv.id;
  update public.profiles set current_workspace_id = v_inv.workspace_id where id = v_uid;
  return v_inv.workspace_id;
end;
$$;

-- ---------------------------------------------------------------------
-- 17. LEAD ACTIONS (called from the app)
-- ELI5: "Mark customer" and "Forget this person" change several tables
-- at once, so they are functions. Forget deletes the person (their
-- engagements and lead go with them) and remembers their LinkedIn URL
-- on the suppression list so they are never collected again here.
-- ---------------------------------------------------------------------
create or replace function public.mark_customer(p_lead uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_lead public.leads;
  v_person public.people;
begin
  select * into v_lead from public.leads where id = p_lead;
  if not found or not public.is_workspace_member(v_lead.workspace_id) then
    raise exception 'lead not found' using errcode = 'P0002';
  end if;
  select * into v_person from public.people where id = v_lead.person_id;
  update public.leads set status = 'customer' where id = p_lead;
  update public.people set suppressed = true where id = v_person.id;
  insert into public.suppressions (workspace_id, kind, value, source, created_by)
  values (v_lead.workspace_id, 'linkedin', lower(v_person.person_key), 'customer', auth.uid())
  on conflict do nothing;
  if v_person.email is not null then
    insert into public.suppressions (workspace_id, kind, value, source, created_by)
    values (v_lead.workspace_id, 'email', lower(v_person.email), 'customer', auth.uid())
    on conflict do nothing;
  end if;
end;
$$;

create or replace function public.forget_person(p_person uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_person public.people;
begin
  select * into v_person from public.people where id = p_person;
  if not found or not public.is_workspace_member(v_person.workspace_id) then
    raise exception 'person not found' using errcode = 'P0002';
  end if;
  insert into public.suppressions (workspace_id, kind, value, source, created_by)
  values (v_person.workspace_id, 'linkedin', lower(v_person.person_key), 'forget', auth.uid())
  on conflict do nothing;
  if v_person.email is not null then
    insert into public.suppressions (workspace_id, kind, value, source, created_by)
    values (v_person.workspace_id, 'email', lower(v_person.email), 'forget', auth.uid())
    on conflict do nothing;
  end if;
  delete from public.people where id = p_person;
end;
$$;

-- When a suppression is added (CSV, manual), hide matching people and
-- their leads straight away.
create or replace function public.apply_suppression()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.kind = 'linkedin' then
    update public.people set suppressed = true
    where workspace_id = new.workspace_id and lower(person_key) = new.value;
  elsif new.kind = 'email' then
    update public.people set suppressed = true
    where workspace_id = new.workspace_id and lower(email) = new.value;
  elsif new.kind = 'domain' then
    update public.people set suppressed = true
    where workspace_id = new.workspace_id and lower(company_domain) = new.value;
  end if;
  update public.leads l set status = 'customer'
  from public.people p
  where p.id = l.person_id and p.workspace_id = new.workspace_id and p.suppressed
    and l.status in ('new', 'saved');
  return new;
end;
$$;
create trigger suppressions_apply after insert on public.suppressions
  for each row execute function public.apply_suppression();

-- Is this person suppressed? Workers call it before paying for anything.
create or replace function public.is_suppressed(ws uuid, p_linkedin text, p_email text, p_domain text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.suppressions s
    where s.workspace_id = ws and (
      (s.kind = 'linkedin' and s.value = lower(p_linkedin)) or
      (s.kind = 'email' and s.value = lower(p_email)) or
      (s.kind = 'domain' and s.value = lower(p_domain))
    )
  );
$$;

-- ---------------------------------------------------------------------
-- 18. WORKER FUNCTIONS (edge functions only, secret key)
-- ELI5: claim_jobs hands a worker a few to-dos of the kinds it handles
-- and marks them "mine" so two workers never grab the same one.
-- enqueue_job adds a to-do once (the idempotency key stops duplicates).
-- finish_job and fail_job close it, with a growing wait between retries.
-- ---------------------------------------------------------------------
create or replace function public.claim_jobs(p_kinds public.job_kind[], p_limit integer)
returns setof public.jobs language sql security definer set search_path = '' as $$
  update public.jobs j set status = 'running', locked_at = now(), attempts = j.attempts + 1
  where j.id in (
    select id from public.jobs
    where status = 'queued' and run_after <= now() and kind = any (p_kinds)
    order by run_after
    limit p_limit
    for update skip locked
  )
  returning j.*;
$$;

create or replace function public.enqueue_job(p_ws uuid, p_run uuid, p_kind public.job_kind, p_payload jsonb,
                                              p_key text, p_delay_seconds integer default 0)
returns uuid language sql security definer set search_path = '' as $$
  insert into public.jobs (workspace_id, daily_run_id, kind, payload, idempotency_key, run_after)
  values (p_ws, p_run, p_kind, coalesce(p_payload, '{}'::jsonb), p_key, now() + make_interval(secs => p_delay_seconds))
  on conflict (idempotency_key) do nothing
  returning id;
$$;

create or replace function public.finish_job(p_job uuid)
returns void language sql security definer set search_path = '' as $$
  update public.jobs set status = 'done', finished_at = now(), locked_at = null where id = p_job;
$$;

create or replace function public.fail_job(p_job uuid, p_error text)
returns public.job_status language plpgsql security definer set search_path = '' as $$
declare
  v_job public.jobs;
begin
  select * into v_job from public.jobs where id = p_job for update;
  if v_job.attempts >= v_job.max_attempts then
    update public.jobs set status = 'dead', last_error = left(p_error, 1000), locked_at = null, finished_at = now()
    where id = p_job;
    return 'dead';
  end if;
  update public.jobs set status = 'queued', last_error = left(p_error, 1000), locked_at = null,
    run_after = now() + make_interval(secs => (power(2, v_job.attempts) * 60)::integer + floor(random() * 30)::integer)
  where id = p_job;
  return 'queued';
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

-- Write one till receipt. Returns false if this key was already used.
create or replace function public.meter(p_ws uuid, p_kind public.usage_kind, p_qty integer, p_cost_micros bigint,
                                        p_ref text, p_key text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  insert into public.usage_ledger (workspace_id, kind, quantity, cost_micros, ref_id, idempotency_key)
  values (p_ws, p_kind, p_qty, p_cost_micros, p_ref, p_key)
  on conflict (idempotency_key) do nothing
  returning id into v_id;
  return v_id is not null;
end;
$$;

-- Mark daily runs ready when none of their jobs are still waiting.
create or replace function public.ready_finished_runs()
returns integer language plpgsql security definer set search_path = '' as $$
declare v_count integer;
begin
  update public.daily_runs r set status = 'ready', ready_at = now()
  where r.status in ('collecting', 'processing')
    and not exists (select 1 from public.jobs j where j.daily_run_id = r.id and j.status in ('queued', 'running'))
    and not exists (select 1 from public.apify_runs a where a.daily_run_id = r.id and a.status in ('running', 'succeeded'));
  get diagnostics v_count = row_count;
  update public.daily_runs set status = 'failed'
  where status in ('scheduled', 'collecting', 'processing') and last_progress_at < now() - interval '3 hours';
  return v_count;
end;
$$;

-- Nightly clean-up: old engagements (90 days), people who never became
-- a lead (180 days), finished jobs (30 days), webhook ids (30 days),
-- rate-limit windows (2 days).
create or replace function public.purge_old_data()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_eng integer; v_people integer; v_jobs integer;
begin
  delete from public.engagements e where e.collected_at < now() - interval '90 days'
    and not exists (select 1 from public.leads l where l.last_engagement_id = e.id);
  get diagnostics v_eng = row_count;
  delete from public.people p where p.last_engaged_at < now() - interval '180 days'
    and not exists (select 1 from public.leads l where l.person_id = p.id);
  get diagnostics v_people = row_count;
  delete from public.jobs where status in ('done', 'dead') and finished_at < now() - interval '30 days';
  get diagnostics v_jobs = row_count;
  delete from public.webhook_events where received_at < now() - interval '30 days';
  delete from public.rate_limits where window_start < now() - interval '2 days';
  return jsonb_build_object('engagements', v_eng, 'people', v_people, 'jobs', v_jobs);
end;
$$;

-- Only the server (secret key) may call worker functions.
revoke execute on function public.claim_jobs(public.job_kind[], integer) from public, anon, authenticated;
revoke execute on function public.enqueue_job(uuid, uuid, public.job_kind, jsonb, text, integer) from public, anon, authenticated;
revoke execute on function public.finish_job(uuid) from public, anon, authenticated;
revoke execute on function public.fail_job(uuid, text) from public, anon, authenticated;
revoke execute on function public.release_stuck_jobs() from public, anon, authenticated;
revoke execute on function public.meter(uuid, public.usage_kind, integer, bigint, text, text) from public, anon, authenticated;
revoke execute on function public.ready_finished_runs() from public, anon, authenticated;
revoke execute on function public.purge_old_data() from public, anon, authenticated;
revoke execute on function public.try_rate_limit(text, integer, integer) from public, anon, authenticated;
revoke execute on function public.is_suppressed(uuid, text, text, text) from public, anon, authenticated;
revoke execute on function public.remaining_engagements(uuid) from public, anon, authenticated;
revoke execute on function public.remaining_enrichments(uuid) from public, anon, authenticated;
revoke execute on function public.plan_limits(uuid) from public, anon, authenticated;
revoke execute on function public.has_active_access(uuid) from public, anon;
grant execute on function public.claim_jobs(public.job_kind[], integer) to service_role;
grant execute on function public.enqueue_job(uuid, uuid, public.job_kind, jsonb, text, integer) to service_role;
grant execute on function public.finish_job(uuid) to service_role;
grant execute on function public.fail_job(uuid, text) to service_role;
grant execute on function public.release_stuck_jobs() to service_role;
grant execute on function public.meter(uuid, public.usage_kind, integer, bigint, text, text) to service_role;
grant execute on function public.ready_finished_runs() to service_role;
grant execute on function public.purge_old_data() to service_role;
grant execute on function public.try_rate_limit(text, integer, integer) to service_role;
grant execute on function public.is_suppressed(uuid, text, text, text) to service_role;
grant execute on function public.remaining_engagements(uuid) to service_role;
grant execute on function public.remaining_enrichments(uuid) to service_role;
grant execute on function public.plan_limits(uuid) to service_role;

-- ---------------------------------------------------------------------
-- 19. GUARD TRIGGERS (the rules the browser cannot break)
-- ELI5: RLS decides WHICH rows you can touch. These triggers decide
-- WHICH COLUMNS. A member may change a lead's status or opener, but
-- never its score. Edge functions (secret key) skip the guard.
-- ---------------------------------------------------------------------
create or replace function public.is_server()
returns boolean language sql stable set search_path = '' as $$
  select coalesce(current_setting('request.jwt.claim.role', true), '') = 'service_role'
      or coalesce((nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role'), '') = 'service_role'
      or current_user in ('postgres', 'service_role', 'supabase_admin');
$$;

create or replace function public.guard_lead_columns()
returns trigger language plpgsql set search_path = '' as $$
begin
  if public.is_server() then return new; end if;
  if new.workspace_id <> old.workspace_id or new.person_id <> old.person_id or new.score <> old.score
     or new.tier <> old.tier or new.reasons <> old.reasons or new.disqualifiers <> old.disqualifiers
     or new.scored_at <> old.scored_at or new.first_scored_at <> old.first_scored_at
     or new.surfaced_at is distinct from old.surfaced_at then
    raise exception 'only status and opener can be changed from the app' using errcode = '42501';
  end if;
  if new.status = 'customer' and old.status <> 'customer' then
    raise exception 'use mark_customer() to mark a customer' using errcode = '42501';
  end if;
  if new.opener is distinct from old.opener then new.opener_edited := true; end if;
  return new;
end;
$$;
create trigger leads_guard before update on public.leads
  for each row execute function public.guard_lead_columns();

create or replace function public.guard_source_columns()
returns trigger language plpgsql set search_path = '' as $$
begin
  if public.is_server() then return new; end if;
  if new.workspace_id <> old.workspace_id or new.kind <> old.kind or new.url <> old.url
     or new.url_key <> old.url_key or new.posts_found <> old.posts_found
     or new.engagers_collected <> old.engagers_collected or new.leads_produced <> old.leads_produced
     or new.last_checked_at is distinct from old.last_checked_at then
    raise exception 'only label, relation, ICP and status can be changed from the app' using errcode = '42501';
  end if;
  if new.status = 'error' and old.status <> 'error' then
    raise exception 'status error is set by the system' using errcode = '42501';
  end if;
  if old.status = 'error' and new.status = 'active' then
    new.failures_in_row := 0; new.last_error := null;
  end if;
  return new;
end;
$$;
create trigger sources_guard before update on public.sources
  for each row execute function public.guard_source_columns();

create or replace function public.guard_workspace_columns()
returns trigger language plpgsql set search_path = '' as $$
begin
  if public.is_server() then return new; end if;
  if new.owner_id <> old.owner_id or new.collect_now_used_at is distinct from old.collect_now_used_at then
    raise exception 'owner and collect-now are managed by the system' using errcode = '42501';
  end if;
  return new;
end;
$$;
create trigger workspaces_guard before update on public.workspaces
  for each row execute function public.guard_workspace_columns();

create or replace function public.guard_people_columns()
returns trigger language plpgsql set search_path = '' as $$
begin
  if public.is_server() then return new; end if;
  raise exception 'people are updated by Harvest only' using errcode = '42501';
end;
$$;
create trigger people_guard before update on public.people
  for each row execute function public.guard_people_columns();

-- List items must point at a lead in the same workspace as the list.
create or replace function public.guard_list_item()
returns trigger language plpgsql set search_path = '' as $$
begin
  if not exists (select 1 from public.lists l where l.id = new.list_id and l.workspace_id = new.workspace_id)
     or not exists (select 1 from public.leads d where d.id = new.lead_id and d.workspace_id = new.workspace_id) then
    raise exception 'list and lead must be in the same workspace' using errcode = '42501';
  end if;
  return new;
end;
$$;
create trigger list_items_guard before insert or update on public.list_items
  for each row execute function public.guard_list_item();

-- Sources can only point at an ICP from the same workspace.
create or replace function public.guard_source_icp()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.icp_id is not null and not exists (
    select 1 from public.icps i where i.id = new.icp_id and i.workspace_id = new.workspace_id) then
    raise exception 'ICP belongs to another workspace' using errcode = '42501';
  end if;
  return new;
end;
$$;
create trigger sources_icp_guard before insert or update of icp_id on public.sources
  for each row execute function public.guard_source_icp();

-- The ICP count is capped by plan.
create or replace function public.guard_icp_insert()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_cap integer;
begin
  if public.is_server() then return new; end if;
  select l.icps into v_cap from public.plan_limits(new.workspace_id) l;
  if (select count(*) from public.icps where workspace_id = new.workspace_id) >= v_cap then
    raise exception 'Your plan includes % ICP(s). Upgrade to add more.', v_cap using errcode = 'P0001';
  end if;
  return new;
end;
$$;
create trigger icps_insert_guard before insert on public.icps
  for each row execute function public.guard_icp_insert();

-- ---------------------------------------------------------------------
-- 20. ROW LEVEL SECURITY: switch it on for every table
-- ELI5: with RLS on and no policy, a table is a locked room. Policies
-- are the keys. Tables with no policies below are server-only.
-- ---------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.workspace_invites enable row level security;
alter table public.icps enable row level security;
alter table public.sources enable row level security;
alter table public.posts enable row level security;
alter table public.daily_runs enable row level security;
alter table public.apify_runs enable row level security;
alter table public.people enable row level security;
alter table public.engagements enable row level security;
alter table public.leads enable row level security;
alter table public.lists enable row level security;
alter table public.list_items enable row level security;
alter table public.suppressions enable row level security;
alter table public.imports enable row level security;
alter table public.integrations enable row level security;
alter table public.pushes enable row level security;
alter table public.jobs enable row level security;
alter table public.usage_ledger enable row level security;
alter table public.webhook_events enable row level security;
alter table public.email_log enable row level security;
alter table public.notification_prefs enable row level security;
alter table public.rate_limits enable row level security;
alter table public.subscriptions enable row level security;
alter table public.stripe_events enable row level security;
alter table public.plan_prices enable row level security;
alter table public.workspace_limit_overrides enable row level security;

-- Belt and braces: anonymous visitors get no table access at all.
revoke all on all tables in schema public from anon;

-- profiles: you see yourself and people who share a workspace with you.
create policy "profiles select self or teammate" on public.profiles for select to authenticated
  using (id = (select auth.uid()) or exists (
    select 1 from public.workspace_members a join public.workspace_members b on a.workspace_id = b.workspace_id
    where a.user_id = (select auth.uid()) and b.user_id = profiles.id));
create policy "profiles update self" on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- workspaces: members read; owners and admins update; created via create_workspace().
create policy "workspaces select member" on public.workspaces for select to authenticated
  using (public.is_workspace_member(id));
create policy "workspaces update admin" on public.workspaces for update to authenticated
  using (public.has_workspace_role(id, array['owner', 'admin']::public.workspace_role[]))
  with check (public.has_workspace_role(id, array['owner', 'admin']::public.workspace_role[]));
create policy "workspaces delete owner" on public.workspaces for delete to authenticated
  using (owner_id = (select auth.uid()));

-- members: everyone in the workspace sees the team; admins remove members (not the owner).
create policy "members select member" on public.workspace_members for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy "members update admin" on public.workspace_members for update to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]) and role <> 'owner')
  with check (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]) and role <> 'owner');
create policy "members delete admin or self" on public.workspace_members for delete to authenticated
  using (role <> 'owner' and (user_id = (select auth.uid())
    or public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[])));

-- invites: admins see and revoke; created via create_invite().
create policy "invites select admin" on public.workspace_invites for select to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]));
create policy "invites delete admin" on public.workspace_invites for delete to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]));

-- icps: members read; owners and admins write.
create policy "icps select member" on public.icps for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy "icps insert admin" on public.icps for insert to authenticated
  with check (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]));
create policy "icps update admin" on public.icps for update to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]))
  with check (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]));
create policy "icps delete admin" on public.icps for delete to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]) and not is_default);

-- sources: members read and edit label/relation/status (guard trigger); created by hv-add-source.
create policy "sources select member" on public.sources for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy "sources update member" on public.sources for update to authenticated
  using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id));
create policy "sources delete member" on public.sources for delete to authenticated
  using (public.is_workspace_member(workspace_id));

-- posts, daily_runs, apify_runs, people, engagements: members read only.
create policy "posts select member" on public.posts for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy "daily runs select member" on public.daily_runs for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy "apify runs select member" on public.apify_runs for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy "people select member" on public.people for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy "engagements select member" on public.engagements for select to authenticated
  using (public.is_workspace_member(workspace_id));

-- leads: members read and change status/opener (guard trigger decides the columns).
create policy "leads select member" on public.leads for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy "leads update member" on public.leads for update to authenticated
  using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id));

-- lists and items: members do everything.
create policy "lists select member" on public.lists for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy "lists insert member" on public.lists for insert to authenticated
  with check (public.is_workspace_member(workspace_id) and created_by = (select auth.uid()));
create policy "lists update member" on public.lists for update to authenticated
  using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id));
create policy "lists delete member" on public.lists for delete to authenticated
  using (public.is_workspace_member(workspace_id));
create policy "list items select member" on public.list_items for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy "list items insert member" on public.list_items for insert to authenticated
  with check (public.is_workspace_member(workspace_id));
create policy "list items delete member" on public.list_items for delete to authenticated
  using (public.is_workspace_member(workspace_id));

-- suppressions: members read and add; admins remove.
create policy "suppressions select member" on public.suppressions for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy "suppressions insert member" on public.suppressions for insert to authenticated
  with check (public.is_workspace_member(workspace_id) and source in ('manual', 'csv')
              and created_by = (select auth.uid()));
create policy "suppressions delete admin" on public.suppressions for delete to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]));

-- imports: members create (after uploading the file) and read.
create policy "imports select member" on public.imports for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy "imports insert member" on public.imports for insert to authenticated
  with check (public.is_workspace_member(workspace_id) and status = 'uploaded'
              and created_by = (select auth.uid())
              and storage_path like workspace_id::text || '/%');

-- integrations: members read the safe columns; writes go through hv-push (encrypts the token).
create policy "integrations select member" on public.integrations for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy "integrations delete admin" on public.integrations for delete to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]));
revoke select on public.integrations from authenticated;
grant select (id, workspace_id, provider, name, status, config, secret_last4, last_error, last_used_at,
              created_by, created_at, updated_at) on public.integrations to authenticated;

-- pushes: members read history.
create policy "pushes select member" on public.pushes for select to authenticated
  using (public.is_workspace_member(workspace_id));

-- usage: members read their workspace's receipts (meters).
create policy "usage select member" on public.usage_ledger for select to authenticated
  using (public.is_workspace_member(workspace_id));

-- notification prefs: your own row only.
create policy "prefs select self" on public.notification_prefs for select to authenticated
  using (user_id = (select auth.uid()));
create policy "prefs update self" on public.notification_prefs for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- subscriptions: read your own row. No insert/update/delete policies: only the webhook writes.
create policy "subscriptions select self" on public.subscriptions for select to authenticated
  using (user_id = (select auth.uid()));
-- plan prices are public knowledge for logged-in users (pricing page uses lib/plans.ts).
create policy "plan prices select" on public.plan_prices for select to authenticated using (true);

-- jobs, webhook_events, email_log, rate_limits, stripe_events,
-- workspace_limit_overrides: no policies on purpose. Server only.

-- ---------------------------------------------------------------------
-- 21. VIEW FOR THE LEADS TABLE (obeys the caller's RLS)
-- ELI5: one tidy row per lead with the person and the post they last
-- engaged with, so the Leads and Today pages need a single query.
-- security_invoker means the view uses the reader's permissions.
-- ---------------------------------------------------------------------
create view public.lead_rows with (security_invoker = true) as
select
  l.id, l.workspace_id, l.icp_id, l.daily_run_id, l.score, l.tier, l.status, l.reasons, l.disqualifiers,
  l.opener, l.opener_basis, l.scored_at, l.surfaced_at, l.first_scored_at,
  p.id as person_id, p.full_name, p.headline, p.title, p.seniority, p.linkedin_url, p.location,
  p.company_name, p.company_domain, p.company_size, p.company_industry, p.company_country,
  case when p.email_status in ('ok', 'catch_all') then p.email end as email, p.email_status,
  p.engagement_count, p.last_engaged_at,
  e.kind as engagement_kind, e.reaction_type, e.comment_excerpt,
  po.id as post_id, po.post_url, po.author_name as post_author, po.text_excerpt as post_excerpt,
  s.id as source_id, s.relation as source_relation, s.label as source_label
from public.leads l
join public.people p on p.id = l.person_id
left join public.engagements e on e.id = l.last_engagement_id
left join public.posts po on po.id = e.post_id
left join public.sources s on s.id = po.source_id;

grant select on public.lead_rows to authenticated;
revoke all on public.lead_rows from anon;

-- ---------------------------------------------------------------------
-- 22. STORAGE BUCKETS + POLICIES
-- ELI5: two private folders. imports holds CSVs people upload
-- (suppression lists, engager lists). exports holds CSVs Harvest made.
-- Files sit under a folder named after the workspace id, and only
-- members of that workspace get in.
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('imports', 'imports', false, 10485760, array['text/csv', 'application/vnd.ms-excel', 'text/plain']),
  ('exports', 'exports', false, 52428800, array['text/csv'])
on conflict (id) do nothing;

create policy "imports objects select member" on storage.objects for select to authenticated
  using (bucket_id = 'imports' and public.is_workspace_member_text((storage.foldername(name))[1]));
create policy "imports objects insert member" on storage.objects for insert to authenticated
  with check (bucket_id = 'imports' and public.is_workspace_member_text((storage.foldername(name))[1]));
create policy "imports objects update member" on storage.objects for update to authenticated
  using (bucket_id = 'imports' and public.is_workspace_member_text((storage.foldername(name))[1]))
  with check (bucket_id = 'imports' and public.is_workspace_member_text((storage.foldername(name))[1]));
create policy "imports objects delete member" on storage.objects for delete to authenticated
  using (bucket_id = 'imports' and public.is_workspace_member_text((storage.foldername(name))[1]));

-- Exports: members can download; only the server writes them.
create policy "exports objects select member" on storage.objects for select to authenticated
  using (bucket_id = 'exports' and public.is_workspace_member_text((storage.foldername(name))[1]));

-- ---------------------------------------------------------------------
-- 23. REALTIME
-- ELI5: lets Today update live ("Processing 64%") and new leads appear
-- without a refresh. RLS still applies to what each person receives.
-- ---------------------------------------------------------------------
alter publication supabase_realtime add table public.daily_runs;
alter publication supabase_realtime add table public.leads;

-- ---------------------------------------------------------------------
-- 24. SCHEDULES (run later, after your edge functions are deployed)
-- ELI5: pg_cron is an alarm clock inside the database. pg_net lets the
-- alarm clock call a URL. Workers are poked every minute, the scheduler
-- and the digest every 15 minutes.
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
-- select cron.schedule('hv-scheduler', '*/15 * * * *', $$ select public.invoke_edge('hv-scheduler') $$);
-- select cron.schedule('hv-collect',   '* * * * *',    $$ select public.invoke_edge('hv-collect') $$);
-- select cron.schedule('hv-ingest',    '* * * * *',    $$ select public.invoke_edge('hv-ingest') $$);
-- select cron.schedule('hv-enrich',    '* * * * *',    $$ select public.invoke_edge('hv-enrich') $$);
-- select cron.schedule('hv-score',     '* * * * *',    $$ select public.invoke_edge('hv-score') $$);
-- select cron.schedule('hv-digest',    '*/15 * * * *', $$ select public.invoke_edge('hv-digest') $$);
-- select cron.schedule('hv-push',      '* * * * *',    $$ select public.invoke_edge('hv-push') $$);
--
-- Check it ran: select * from cron.job_run_details order by start_time desc limit 20;
`
