// Factorie: the single Supabase migration, part 1 (extensions, tables, limits). Joined with part 2 below.
// No backticks and no dollar-brace inside, so the template literal needs no escapes.
import { sqlPart2 } from './sql2'

export const sqlPart1 = `-- =====================================================================
-- FACTORIE: full database migration (v1.0, Oct 2026)
-- Paste into Supabase > SQL Editor > + New query > Run. Run it once on a
-- fresh project. It creates every table, security rule, function, view,
-- trigger, seed row and storage bucket Factorie needs.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. Extensions
-- ELI5: extensions are add-ons for Postgres. pg_cron is an alarm clock
-- inside the database. pg_net lets the database make web requests, so the
-- alarm clock can wake up your edge functions.
-- ---------------------------------------------------------------------
create extension if not exists pgcrypto with schema extensions;
create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

-- ---------------------------------------------------------------------
-- 1. Enums (fixed lists of allowed values)
-- ELI5: an enum is a drop-down menu for a column. The database refuses
-- any value that is not on the list, so typos cannot sneak in.
-- ---------------------------------------------------------------------
create type public.brand_status as enum ('scraping', 'draft', 'active', 'paused', 'paused_budget');
create type public.run_kind as enum ('onboarding', 'scheduled', 'recheck');
create type public.run_status as enum ('queued', 'running', 'complete', 'partial', 'failed', 'cancelled');
create type public.job_status as enum ('queued', 'claimed', 'calling', 'parsing', 'done', 'failed', 'skipped_budget');
create type public.prompt_intent as enum ('best_of', 'alternatives', 'problem', 'comparison', 'use_case', 'custom');
create type public.rec_kind as enum ('new_page', 'improve_page', 'third_party', 'technical');
create type public.rec_status as enum ('open', 'in_progress', 'done', 'dismissed');
create type public.audit_status as enum ('queued', 'running', 'done', 'failed');

-- ---------------------------------------------------------------------
-- 2. Shared helper: keep updated_at fresh on every update
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- 3. Profiles (one row per user, made automatically on signup)
-- ELI5: Supabase keeps logins in a private auth.users table. We keep our
-- own profiles table next to it for settings like digest time. A trigger
-- creates the profile the moment someone signs up.
-- ---------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  timezone text not null default 'UTC',
  digest_enabled boolean not null default true,
  digest_hour smallint not null default 8 check (digest_hour between 0 and 23),
  digest_recipients text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, full_name, timezone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(nullif(new.raw_user_meta_data ->> 'timezone', ''), 'UTC')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- 4. Plans and billing
-- ELI5: plans holds every limit (prompts, engines, spend cap) in one place.
-- subscriptions is written only by the Stripe webhook. stripe_events
-- remembers every Stripe event id so a repeated webhook is ignored.
-- ---------------------------------------------------------------------
create table public.plans (
  id text primary key check (id in ('trial', 'starter', 'growth')),
  name text not null,
  brands int not null,
  prompts int not null,
  pinned_prompts int not null,
  engines text[] not null,
  competitors_per_brand int not null,
  rechecks_per_day int not null,
  recs_on_demand_per_day int not null,
  digest_recipients int not null,
  csv_export boolean not null,
  daily_checks boolean not null,
  monthly_cost_cap_usd numeric(10,2) not null
);

insert into public.plans values
  ('trial',   'Trial',   1, 25, 0,  array['chatgpt','perplexity','gemini','claude','deepseek'],        5, 3,  0, 1, false, false, 4.00),
  ('starter', 'Starter', 1, 25, 0,  array['chatgpt','perplexity','gemini','claude','deepseek'],        5, 5,  0, 1, true,  false, 15.00),
  ('growth',  'Growth',  3, 60, 10, array['chatgpt','perplexity','gemini','claude','deepseek','grok'], 50, 10, 1, 5, true,  true,  40.00)
on conflict (id) do nothing;

create table public.subscriptions (
  user_id uuid primary key references auth.users (id) on delete cascade,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  status text not null default 'incomplete',
  plan text not null default 'starter' check (plan in ('starter', 'growth')),
  price_id text,
  billing_interval text check (billing_interval in ('month', 'year')),
  current_period_end timestamptz,
  trial_end timestamptz,
  cancel_at_period_end boolean not null default false,
  updated_at timestamptz not null default now()
);
create trigger subscriptions_updated_at before update on public.subscriptions
  for each row execute function public.set_updated_at();

create table public.stripe_events (
  id text primary key,
  type text not null,
  received_at timestamptz not null default now()
);

-- Paywall: true only while Stripe says trialing or active.
create or replace function public.has_active_access(p_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.subscriptions s
    where s.user_id = coalesce(auth.uid(), p_user) -- a signed-in user can only ask about themselves
      and s.status in ('trialing', 'active')
  );
$$;

-- Which plan row applies right now: trial while trialing, else the paid plan.
create or replace function public.current_plan(p_user uuid)
returns text language sql stable security definer set search_path = '' as $$
  select case
    when s.status = 'trialing' then 'trial'
    when s.status = 'active' then s.plan
    else null end
  from public.subscriptions s where s.user_id = p_user;
$$;

-- Every limit for one user as JSON. Edge functions and the UI both read this.
create or replace function public.plan_limits(p_user uuid default auth.uid())
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_plan text;
  v_row jsonb;
begin
  if auth.uid() is not null and p_user is distinct from auth.uid() then
    raise exception 'You can only read your own limits';
  end if;
  v_plan := public.current_plan(p_user);
  if v_plan is null then
    -- No subscription yet (still in onboarding): allow setting up one brand and
    -- choosing prompts, but nothing that spends money.
    select to_jsonb(p) - 'id' - 'name' || jsonb_build_object('plan', 'none', 'plan_name', 'No plan',
      'rechecks_per_day', 0, 'recs_on_demand_per_day', 0, 'monthly_cost_cap_usd', 0, 'csv_export', false)
      into v_row from public.plans p where p.id = 'trial';
    return v_row;
  end if;
  select to_jsonb(p) - 'id' - 'name' || jsonb_build_object('plan', p.id, 'plan_name', p.name)
    into v_row from public.plans p where p.id = v_plan;
  return v_row;
end;
$$;

-- ---------------------------------------------------------------------
-- 5. Engines (seeded with OpenRouter model slugs)
-- ELI5: one row per AI assistant Factorie asks. The model slug lives here,
-- not in code, so when OpenRouter renames a model you change one row.
-- Check every slug on openrouter.ai before running (they change often).
-- ---------------------------------------------------------------------
create table public.engines (
  key text primary key,
  label text not null,
  openrouter_model text not null,
  web_mode text not null check (web_mode in ('native', 'builtin', 'exa', 'none')),
  max_results int not null default 3,
  est_cost_usd numeric(10,5) not null,
  prompt_price_per_m numeric(10,4) not null default 0,
  completion_price_per_m numeric(10,4) not null default 0,
  weight numeric(4,3) not null,
  min_plan text not null check (min_plan in ('starter', 'growth')),
  max_in_flight int not null default 3,
  is_enabled boolean not null default true,
  sort smallint not null default 0
);

insert into public.engines (key, label, openrouter_model, web_mode, max_results, est_cost_usd, prompt_price_per_m, completion_price_per_m, weight, min_plan, sort) values
  ('chatgpt',    'ChatGPT',    'openai/gpt-5-mini',            'native',  3, 0.012, 0.25, 2.00, 0.32, 'starter', 1),
  ('perplexity', 'Perplexity', 'perplexity/sonar',             'builtin', 3, 0.006, 1.00, 1.00, 0.16, 'starter', 2),
  ('gemini',     'Gemini',     'google/gemini-2.5-flash',      'exa',     3, 0.015, 0.30, 2.50, 0.22, 'starter', 3),
  ('claude',     'Claude',     'anthropic/claude-haiku-5.5',   'native',  3, 0.011, 0.10, 0.50, 0.12, 'starter', 4),
  ('deepseek',   'DeepSeek',   'deepseek/deepseek-v4.1-flash', 'none',    0, 0.001, 0.15, 0.60, 0.09, 'starter', 5),
  ('grok',       'Grok',       'x-ai/grok-4.1-fast',           'native',  3, 0.015, 0.20, 0.50, 0.09, 'growth',  6)
on conflict (key) do nothing;

-- ---------------------------------------------------------------------
-- 6. Brands, scraped pages, competitors, tracked prompts
-- ELI5: a brand is the company being tracked. Every row below a brand
-- also stores user_id, so each security rule is one short line.
-- ---------------------------------------------------------------------
create table public.brands (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  domain text not null check (domain ~ '^[a-z0-9.-]+\\.[a-z]{2,}$'),
  website_url text not null,
  aliases text[] not null default '{}',
  category text not null default '',
  one_liner text not null default '',
  icp text not null default '',
  problem text not null default '',
  key_features text[] not null default '{}',
  pricing_model text not null default 'unknown',
  regions text[] not null default '{}',
  language text not null default 'en',
  summary jsonb not null default '{}'::jsonb,
  timezone text not null default 'UTC',
  check_frequency text not null default 'weekly' check (check_frequency in ('weekly', 'weekly_plus_daily_pinned')),
  check_dow smallint not null default 1 check (check_dow between 0 and 6),
  check_hour smallint not null default 6 check (check_hour between 0 and 23),
  check_minute smallint not null default (floor(random() * 60))::smallint check (check_minute between 0 and 59),
  engines_enabled text[] not null default array['chatgpt','perplexity','gemini','claude','deepseek'],
  alert_visibility_drop smallint not null default 5 check (alert_visibility_drop between 0 and 30),
  alert_competitor_overtake boolean not null default true,
  alert_lost_top boolean not null default true,
  alerts_email boolean not null default true,
  onboarding_step smallint not null default 1 check (onboarding_step between 1 and 7),
  status public.brand_status not null default 'scraping',
  next_check_at timestamptz,
  next_daily_at timestamptz,
  last_checked_at timestamptz,
  scrape_error text,
  recs_refreshed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, domain)
);
create index brands_user_idx on public.brands (user_id);
create index brands_due_idx on public.brands (next_check_at) where status = 'active';
create trigger brands_updated_at before update on public.brands
  for each row execute function public.set_updated_at();

create table public.site_pages (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  url text not null,
  title text not null default '',
  page_type text not null default 'other' check (page_type in ('home', 'pricing', 'product', 'about', 'blog', 'docs', 'comparison', 'other')),
  markdown text check (char_length(markdown) <= 20000),
  status text not null default 'found' check (status in ('found', 'reading', 'read', 'failed')),
  scraped_at timestamptz,
  created_at timestamptz not null default now(),
  unique (brand_id, url)
);
create index site_pages_brand_idx on public.site_pages (brand_id);
create index site_pages_user_idx on public.site_pages (user_id);

create table public.competitors (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  domain text not null default '',
  aliases text[] not null default '{}',
  source text not null default 'user' check (source in ('suggested', 'user', 'discovered')),
  reason text not null default '',
  sort smallint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (brand_id, name)
);
create index competitors_brand_idx on public.competitors (brand_id);
create index competitors_user_idx on public.competitors (user_id);
create trigger competitors_updated_at before update on public.competitors
  for each row execute function public.set_updated_at();

create table public.tracked_prompts (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  text text not null check (char_length(text) between 8 and 300),
  intent public.prompt_intent not null default 'custom',
  region text,
  why text not null default '',
  is_active boolean not null default false,
  is_pinned boolean not null default false,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index tracked_prompts_brand_idx on public.tracked_prompts (brand_id);
create index tracked_prompts_user_idx on public.tracked_prompts (user_id);
create index tracked_prompts_active_idx on public.tracked_prompts (user_id) where is_active;
create trigger tracked_prompts_updated_at before update on public.tracked_prompts
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- 7. Runs and results (the job queue)
-- ELI5: a run is one batch of checks for a brand. Each check_results row
-- is one prompt asked to one engine. The same row is the job (status,
-- attempts) and the answer (text, position, sources). Only edge functions
-- with the secret key write here.
-- ---------------------------------------------------------------------
create table public.check_runs (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  kind public.run_kind not null,
  status public.run_status not null default 'queued',
  scheduled_for timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz,
  scored_at timestamptz,
  total_jobs int not null default 0,
  done_jobs int not null default 0,
  failed_jobs int not null default 0,
  skipped_jobs int not null default 0,
  cost_usd numeric(12,6) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (brand_id, kind, scheduled_for)
);
create index check_runs_brand_idx on public.check_runs (brand_id, created_at desc);
create index check_runs_user_idx on public.check_runs (user_id);
create index check_runs_open_idx on public.check_runs (status) where status in ('queued', 'running');
create trigger check_runs_updated_at before update on public.check_runs
  for each row execute function public.set_updated_at();

create table public.check_results (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.check_runs (id) on delete cascade,
  brand_id uuid not null references public.brands (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  prompt_id uuid not null references public.tracked_prompts (id) on delete cascade,
  engine_key text not null references public.engines (key),
  status public.job_status not null default 'queued',
  attempts smallint not null default 0,
  next_attempt_at timestamptz not null default now(),
  claimed_at timestamptz,
  last_error text,
  prompt_text_snapshot text not null,
  -- raw answer (trimmed to null after 180 days by trim_old_answers)
  answer_text text,
  annotations jsonb,
  model_used text,
  openrouter_id text,
  prompt_tokens int,
  completion_tokens int,
  cost_usd numeric(12,6) not null default 0,
  cost_estimated boolean not null default false,
  -- parsed fields (kept forever)
  mentioned boolean,
  in_list boolean,
  position smallint,
  list_length smallint,
  sentiment smallint check (sentiment between -1 and 1),
  recommended boolean,
  descriptor text,
  answer_type text check (answer_type in ('ranked_list', 'unranked_list', 'single_pick', 'comparison', 'explanation', 'refusal')),
  cited_urls text[] not null default '{}',
  cited_domains text[] not null default '{}',
  brand_cited boolean not null default false,
  competitor_mentions jsonb not null default '[]'::jsonb,
  other_brands text[] not null default '{}',
  highlights jsonb not null default '[]'::jsonb,
  parse_mode text check (parse_mode in ('full', 'regex_only')),
  checked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (run_id, prompt_id, engine_key)
);
create index check_results_run_idx on public.check_results (run_id, status);
create index check_results_prompt_idx on public.check_results (prompt_id, engine_key, checked_at desc);
create index check_results_brand_idx on public.check_results (brand_id, checked_at desc);
create index check_results_user_idx on public.check_results (user_id);
create index check_results_engine_idx on public.check_results (engine_key);
create index check_results_queue_idx on public.check_results (next_attempt_at) where status = 'queued';
create index check_results_inflight_idx on public.check_results (engine_key, updated_at) where status in ('claimed', 'calling', 'parsing');
create trigger check_results_updated_at before update on public.check_results
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- 8. Scores, recommendations, logs, money
-- ---------------------------------------------------------------------
create table public.daily_scores (
  id bigint generated always as identity primary key,
  brand_id uuid not null references public.brands (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null,
  engine_key text not null, -- an engines.key or 'all'
  answers int not null default 0,
  visibility numeric(5,1),
  share_of_voice numeric(5,1),
  avg_position numeric(5,2),
  mention_rate numeric(5,1),
  sentiment numeric(5,1),
  citation_rate numeric(5,1),
  brand_weight numeric(10,3) not null default 0,
  unique (brand_id, day, engine_key)
);
create index daily_scores_user_idx on public.daily_scores (user_id);

create table public.competitor_daily (
  id bigint generated always as identity primary key,
  brand_id uuid not null references public.brands (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  competitor_id uuid not null references public.competitors (id) on delete cascade,
  day date not null,
  engine_key text not null,
  mentions int not null default 0,
  weight numeric(10,3) not null default 0,
  share_of_voice numeric(5,1),
  avg_position numeric(5,2),
  unique (competitor_id, day, engine_key)
);
create index competitor_daily_brand_idx on public.competitor_daily (brand_id, day);
create index competitor_daily_user_idx on public.competitor_daily (user_id);

create table public.recommendations (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  kind public.rec_kind not null,
  title text not null check (char_length(title) <= 120),
  why text not null default '',
  target_prompt_ids uuid[] not null default '{}',
  source_urls text[] not null default '{}',
  outline text[] not null default '{}',
  effort text not null check (effort in ('small', 'medium', 'large')),
  impact smallint not null check (impact between 1 and 5),
  priority smallint not null default 0,
  status public.rec_status not null default 'open',
  done_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index recommendations_brand_idx on public.recommendations (brand_id, status, priority desc);
create index recommendations_user_idx on public.recommendations (user_id);
create trigger recommendations_updated_at before update on public.recommendations
  for each row execute function public.set_updated_at();

-- ELI5: every paid API call writes one row here with what it cost.
-- (ref, operation) is unique, so the same job can never be charged twice.
create table public.usage_ledger (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users (id) on delete set null,
  brand_id uuid references public.brands (id) on delete set null,
  vendor text not null check (vendor in ('openrouter', 'anthropic', 'firecrawl', 'resend')),
  operation text not null,
  units numeric(14,2) not null default 0,
  cost_usd numeric(12,6) not null default 0,
  ref text not null,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (ref, operation)
);
create index usage_ledger_user_month_idx on public.usage_ledger (user_id, created_at);
create index usage_ledger_brand_idx on public.usage_ledger (brand_id);
create index usage_ledger_day_idx on public.usage_ledger (created_at);

create table public.email_log (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users (id) on delete cascade,
  kind text not null,
  ref text not null, -- user id, audit id or brand id: whatever makes one email unique
  day date not null default current_date,
  to_email text not null,
  resend_id text,
  created_at timestamptz not null default now(),
  unique (kind, ref, day)
);
create index email_log_user_idx on public.email_log (user_id);

create table public.recheck_log (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  brand_id uuid not null references public.brands (id) on delete cascade,
  prompt_id uuid references public.tracked_prompts (id) on delete cascade,
  created_at timestamptz not null default now()
);
create index recheck_log_user_idx on public.recheck_log (user_id, created_at);
create index recheck_log_brand_idx on public.recheck_log (brand_id);
create index recheck_log_prompt_idx on public.recheck_log (prompt_id, created_at);

create table public.app_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);
insert into public.app_settings (key, value) values
  ('global_daily_cap_usd', '50'::jsonb),
  ('checks_paused', 'false'::jsonb),
  ('audit_daily_cap', '40'::jsonb)
on conflict (key) do nothing;

-- Free audit lead magnet. No browser access at all: only free-audit touches it.
create table public.audits (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  domain text not null,
  brand_name text not null,
  category text not null,
  status public.audit_status not null default 'queued',
  token text not null unique default encode(extensions.gen_random_bytes(16), 'hex'),
  ip_hash text not null,
  prompts jsonb not null default '[]'::jsonb,
  results jsonb not null default '[]'::jsonb,
  score numeric(5,1),
  error text,
  created_at timestamptz not null default now(),
  finished_at timestamptz
);
create index audits_domain_idx on public.audits (domain, created_at desc);
create index audits_ip_idx on public.audits (ip_hash, created_at desc);
create index audits_queue_idx on public.audits (created_at) where status = 'queued';

-- ---------------------------------------------------------------------
-- 9. Limit triggers (the server-side wall)
-- ELI5: the browser can show "18 of 25 prompts", but these triggers are
-- the real bouncer. Even a hand-written API call cannot add a 26th prompt.
-- ---------------------------------------------------------------------
create or replace function public.enforce_brand_limit()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_limits jsonb := public.plan_limits(new.user_id);
  v_count int;
begin
  select count(*) into v_count from public.brands where user_id = new.user_id;
  if v_count >= coalesce((v_limits ->> 'brands')::int, 1) then
    raise exception 'Brand limit reached (% on your plan)', coalesce((v_limits ->> 'brands')::int, 1)
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;
create trigger brands_limit before insert on public.brands
  for each row execute function public.enforce_brand_limit();

create or replace function public.enforce_prompt_limit()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_limits jsonb := public.plan_limits(new.user_id);
  v_active int;
  v_pinned int;
begin
  if new.is_active and (tg_op = 'INSERT' or not old.is_active) then
    select count(*) into v_active from public.tracked_prompts
      where user_id = new.user_id and is_active and id <> new.id;
    if v_active >= (v_limits ->> 'prompts')::int then
      raise exception 'Prompt limit reached (% on your plan)', (v_limits ->> 'prompts')::int
        using errcode = 'P0001';
    end if;
  end if;
  if new.is_pinned and (tg_op = 'INSERT' or not old.is_pinned) then
    select count(*) into v_pinned from public.tracked_prompts
      where user_id = new.user_id and is_pinned and id <> new.id;
    if v_pinned >= (v_limits ->> 'pinned_prompts')::int then
      raise exception 'Pinned prompt limit reached (% on your plan)', (v_limits ->> 'pinned_prompts')::int
        using errcode = 'P0001';
    end if;
  end if;
  return new;
end;
$$;
create trigger tracked_prompts_limit before insert or update on public.tracked_prompts
  for each row execute function public.enforce_prompt_limit();

create or replace function public.enforce_competitor_limit()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_limits jsonb := public.plan_limits(new.user_id);
  v_count int;
begin
  select count(*) into v_count from public.competitors where brand_id = new.brand_id;
  if v_count >= coalesce((v_limits ->> 'competitors_per_brand')::int, 5) then
    raise exception 'Competitor limit reached (% per brand on your plan)', coalesce((v_limits ->> 'competitors_per_brand')::int, 5)
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;
create trigger competitors_limit before insert on public.competitors
  for each row execute function public.enforce_competitor_limit();

-- Next weekly slot in the brand's timezone, returned in UTC.
create or replace function public.next_weekly_slot(p_dow int, p_hour int, p_minute int, p_tz text)
returns timestamptz language plpgsql stable set search_path = '' as $$
declare
  v_local timestamp := now() at time zone p_tz;
  v_candidate timestamp;
begin
  v_candidate := date_trunc('day', v_local)
    + (((p_dow - extract(dow from v_local)::int) + 7) % 7) * interval '1 day'
    + p_hour * interval '1 hour' + p_minute * interval '1 minute';
  if v_candidate <= v_local then
    v_candidate := v_candidate + interval '7 days';
  end if;
  return v_candidate at time zone p_tz;
end;
$$;

-- Users may edit their brand settings, but never the columns the server
-- owns (status, schedule times, scrape results). Engines are filtered to
-- what the plan allows. The secret key (auth.uid() is null) skips this.
create or replace function public.protect_brand_columns()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_allowed text[];
begin
  if auth.uid() is null then
    return new;
  end if;
  new.user_id := old.user_id;
  new.status := case when old.status = 'paused_budget' then old.status
                     when new.status in ('active', 'paused') and old.status in ('active', 'paused') then new.status
                     else old.status end;
  new.last_checked_at := old.last_checked_at;
  new.scrape_error := old.scrape_error;
  new.recs_refreshed_at := old.recs_refreshed_at;
  new.check_minute := old.check_minute;
  select coalesce(array_agg(x), '{}') into v_allowed
    from jsonb_array_elements_text(public.plan_limits(old.user_id) -> 'engines') x;
  new.engines_enabled := array(select e from unnest(new.engines_enabled) e where e = any (v_allowed));
  if (public.plan_limits(old.user_id) ->> 'daily_checks')::boolean is not true then
    new.check_frequency := 'weekly';
  end if;
  if new.check_dow is distinct from old.check_dow or new.check_hour is distinct from old.check_hour
     or new.timezone is distinct from old.timezone then
    new.next_check_at := public.next_weekly_slot(new.check_dow, new.check_hour, new.check_minute, new.timezone);
  else
    new.next_check_at := old.next_check_at;
  end if;
  if new.check_frequency = 'weekly_plus_daily_pinned' and old.check_frequency <> 'weekly_plus_daily_pinned' then
    new.next_daily_at := (date_trunc('day', now() at time zone new.timezone) + interval '1 day'
      + new.check_hour * interval '1 hour' + new.check_minute * interval '1 minute') at time zone new.timezone;
  elsif new.check_frequency = 'weekly' then
    new.next_daily_at := null;
  else
    new.next_daily_at := old.next_daily_at;
  end if;
  return new;
end;
$$;
create trigger brands_protect before update on public.brands
  for each row execute function public.protect_brand_columns();

-- Users may only change a recommendation's status (and done_at follows it).
create or replace function public.protect_recommendation_columns()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_status public.rec_status := new.status;
begin
  if auth.uid() is null then
    return new;
  end if;
  new := old;
  new.status := v_status;
  new.done_at := case when v_status = 'done' then coalesce(old.done_at, now()) else null end;
  new.updated_at := now();
  return new;
end;
$$;
create trigger recommendations_protect before update on public.recommendations
  for each row execute function public.protect_recommendation_columns();
`

export const sql = sqlPart1 + sqlPart2
