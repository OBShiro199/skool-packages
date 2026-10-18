// Retain single migration, pasted into the Supabase SQL editor once on a fresh project.

export const sql = `-- =====================================================================
-- Retain: full database migration
-- Paste this whole file into Supabase > SQL Editor > New query > Run.
-- Run it ONCE on a fresh project. Order: extensions, enums, tables,
-- helper functions, scoring, worker functions, RLS, storage, schedules.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. EXTENSIONS
-- ELI5: add-ons for the database. pgcrypto makes secure random keys and
-- hashes. pg_cron runs jobs on a timer. pg_net lets the timer call our
-- edge functions over HTTPS.
-- ---------------------------------------------------------------------
create extension if not exists pgcrypto with schema extensions;
create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

-- ---------------------------------------------------------------------
-- 1. ENUMS
-- ELI5: an enum is a fixed list of allowed words for a column. A risk
-- band can be 'low', 'watch' or 'high', never 'banana'.
-- ---------------------------------------------------------------------
create type public.workspace_role as enum ('owner', 'admin', 'member');
create type public.connection_status as enum ('pending', 'importing', 'active', 'error', 'revoked');
create type public.connection_method as enum ('oauth', 'rak');
create type public.change_kind as enum ('upgrade', 'downgrade', 'seat_up', 'seat_down', 'pause', 'resume',
  'cancel_scheduled', 'cancel_undone', 'canceled', 'reactivated');
create type public.risk_band as enum ('low', 'watch', 'high');
create type public.summary_status as enum ('none', 'queued', 'done', 'needs_review', 'skipped_cap');
create type public.job_kind as enum ('backfill_customers', 'backfill_subscriptions', 'backfill_invoices',
  'apply_event', 'reconcile', 'refresh_token', 'score_workspace', 'send_dunning_step', 'draft_winback',
  'send_winback', 'collect_batch', 'ensure_coupon');
create type public.job_status as enum ('queued', 'running', 'done', 'dead');
create type public.dunning_status as enum ('open', 'recovered', 'lost', 'closed');
create type public.recovered_by as enum ('retry', 'card_update', 'manual');
create type public.offer_kind as enum ('pause', 'discount', 'downgrade');
create type public.session_status as enum ('started', 'reason_given', 'offered', 'applying', 'saved',
  'failed_offer', 'canceled', 'abandoned');
create type public.winback_status as enum ('waiting', 'drafting', 'ready', 'scheduled', 'sending', 'done',
  'won', 'stopped', 'skipped_cap', 'needs_review');
create type public.winback_email_status as enum ('draft', 'scheduled', 'sent', 'skipped', 'failed');
create type public.usage_kind as enum ('risk_summaries', 'winback_drafts', 'exit_tags', 'emails', 'usage_events');
create type public.batch_status as enum ('submitted', 'ended', 'failed');

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
-- next to it, made automatically the moment someone signs up.
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
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- 4. WORKSPACES, MEMBERS, INVITES
-- ELI5: a workspace is one SaaS product. Members are the founder and
-- teammates. The owner's Retain subscription pays for the workspace.
-- ---------------------------------------------------------------------
create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 80),
  slug text not null unique check (slug ~ '^[a-z0-9-]{3,40}$'),
  owner_id uuid not null references auth.users (id) on delete cascade,
  brand_name text not null,
  brand_color text not null default '#8b7fd6' check (brand_color ~ '^#[0-9a-fA-F]{6}$'),
  logo_path text,
  product_url text,
  product_oneliner text not null default '' check (char_length(product_oneliner) <= 200),
  recent_changes text[] not null default '{}',
  support_email text check (support_email is null or position('@' in support_email) > 1),
  timezone text not null default 'Europe/London',
  main_currency text not null default 'usd' check (main_currency ~ '^[a-z]{3}$'),
  publishable_key text not null unique,
  usage_tracking boolean not null default false,
  flags jsonb not null default '{}'::jsonb,
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

-- Secrets the founder's server uses (cancel-flow signing, ingest HMAC).
-- Encrypted by our code. No policies: the browser can never read them.
create table public.workspace_secrets (
  workspace_id uuid primary key references public.workspaces (id) on delete cascade,
  signing_secret_enc text not null,
  ingest_secret_enc text not null,
  rotated_at timestamptz not null default now()
);

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
-- 6. STRIPE CONNECTION (the founder's Stripe account, via the Stripe App)
-- ELI5: when a founder installs the Retain app on Stripe, we get a key
-- that expires every hour plus a refresh key. Members can see that the
-- connection is healthy. Nobody but our server can see the keys, which
-- live in a separate table with no policies at all.
-- ---------------------------------------------------------------------
create table public.oauth_states (
  state_hash text primary key,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  livemode boolean not null default false,
  expires_at timestamptz not null default now() + interval '10 minutes',
  used_at timestamptz,
  created_at timestamptz not null default now()
);
create index oauth_states_ws_idx on public.oauth_states (workspace_id);
create index oauth_states_user_idx on public.oauth_states (user_id);

create table public.stripe_connections (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  account_id text not null check (account_id like 'acct_%'),
  livemode boolean not null,
  method public.connection_method not null default 'oauth',
  status public.connection_status not null default 'pending',
  scope text,
  events_cursor bigint,
  import_progress jsonb not null default '{}'::jsonb,
  consecutive_errors integer not null default 0,
  last_synced_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (account_id, livemode),
  unique (workspace_id, livemode)
);
create index stripe_connections_ws_idx on public.stripe_connections (workspace_id);
create trigger stripe_connections_updated_at before update on public.stripe_connections
  for each row execute function public.set_updated_at();

create table public.stripe_tokens (
  connection_id uuid primary key references public.stripe_connections (id) on delete cascade,
  access_token_enc text,
  access_expires_at timestamptz,
  refresh_token_enc text,
  restricted_key_enc text,
  updated_at timestamptz not null default now()
);
create trigger stripe_tokens_updated_at before update on public.stripe_tokens
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- 7. STRIPE MIRROR: customers, subscriptions, changes, invoices, events
-- ELI5: a copy of the founder's Stripe data, kept fresh by webhooks.
-- Pages read this copy, so they are fast and never hit Stripe limits.
-- Only our server writes here.
-- ---------------------------------------------------------------------
create table public.customers (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  stripe_customer_id text not null,
  email text,
  name text,
  created_at_stripe timestamptz,
  card_brand text,
  card_last4 text,
  card_exp_month smallint check (card_exp_month between 1 and 12),
  card_exp_year smallint,
  external_user_id text,
  deleted boolean not null default false,
  first_seen_usage_at timestamptz,
  last_seen_usage_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, stripe_customer_id)
);
create index customers_ws_email_idx on public.customers (workspace_id, lower(email));
create index customers_ws_external_idx on public.customers (workspace_id, external_user_id);
create trigger customers_updated_at before update on public.customers
  for each row execute function public.set_updated_at();

create table public.subscriptions_mirror (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  customer_id uuid not null references public.customers (id) on delete cascade,
  stripe_subscription_id text not null,
  status text not null check (status in ('incomplete', 'incomplete_expired', 'trialing', 'active',
    'past_due', 'canceled', 'unpaid', 'paused')),
  price_id text,
  product_name text,
  quantity integer not null default 1,
  mrr_cents bigint not null default 0,
  currency text not null default 'usd',
  started_at timestamptz,
  trial_start timestamptz,
  trial_end timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  cancel_at timestamptz,
  paused boolean not null default false,
  pause_resumes_at timestamptz,
  discount_coupon_id text,
  canceled_at timestamptz,
  cancellation_reason text,
  stripe_updated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, stripe_subscription_id)
);
create index subscriptions_mirror_customer_idx on public.subscriptions_mirror (customer_id);
create index subscriptions_mirror_ws_status_idx on public.subscriptions_mirror (workspace_id, status);
create trigger subscriptions_mirror_updated_at before update on public.subscriptions_mirror
  for each row execute function public.set_updated_at();

create table public.subscription_changes (
  id bigint generated always as identity primary key,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  subscription_id uuid not null references public.subscriptions_mirror (id) on delete cascade,
  kind public.change_kind not null,
  mrr_before_cents bigint,
  mrr_after_cents bigint,
  quantity_before integer,
  quantity_after integer,
  price_before text,
  price_after text,
  at timestamptz not null,
  stripe_event_id text unique
);
create index subscription_changes_ws_at_idx on public.subscription_changes (workspace_id, at desc);
create index subscription_changes_sub_idx on public.subscription_changes (subscription_id);

create table public.invoices_mirror (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  customer_id uuid not null references public.customers (id) on delete cascade,
  subscription_id uuid references public.subscriptions_mirror (id) on delete set null,
  stripe_invoice_id text not null,
  status text not null,
  amount_due_cents bigint not null default 0,
  currency text not null default 'usd',
  attempt_count integer not null default 0,
  next_payment_attempt timestamptz,
  hosted_invoice_url text,
  billing_reason text,
  last_failure_code text,
  created_at_stripe timestamptz,
  paid_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (workspace_id, stripe_invoice_id)
);
create index invoices_mirror_customer_idx on public.invoices_mirror (customer_id);
create index invoices_mirror_sub_idx on public.invoices_mirror (subscription_id);
create index invoices_mirror_ws_status_idx on public.invoices_mirror (workspace_id, status);
create trigger invoices_mirror_updated_at before update on public.invoices_mirror
  for each row execute function public.set_updated_at();

-- De-duplication for events from founders' accounts. One row per evt_.
create table public.stripe_events (
  id text primary key,
  workspace_id uuid references public.workspaces (id) on delete cascade,
  account_id text not null,
  type text not null,
  livemode boolean not null,
  created_at_stripe timestamptz,
  received_via text not null default 'webhook' check (received_via in ('webhook', 'reconcile')),
  processed_at timestamptz,
  received_at timestamptz not null default now()
);
create index stripe_events_ws_idx on public.stripe_events (workspace_id, received_at desc);

-- ---------------------------------------------------------------------
-- 8. USAGE EVENTS (optional, from the JS snippet or server webhook)
-- ELI5: raw events are kept 90 days. Every night they are squashed into
-- one row per customer per day, which is all the score needs.
-- ---------------------------------------------------------------------
create table public.usage_events (
  id bigint generated always as identity primary key,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  customer_id uuid references public.customers (id) on delete set null,
  external_user_id text,
  email text,
  stripe_customer_ref text,
  name text not null check (char_length(name) between 1 and 64),
  source text not null check (source in ('browser', 'server')),
  occurred_at timestamptz not null,
  props jsonb not null default '{}'::jsonb check (pg_column_size(props) <= 2048),
  idempotency_key text not null,
  created_at timestamptz not null default now(),
  unique (workspace_id, idempotency_key)
);
create index usage_events_ws_time_idx on public.usage_events (workspace_id, occurred_at desc);
create index usage_events_customer_idx on public.usage_events (customer_id, occurred_at desc);
create index usage_events_unmatched_idx on public.usage_events (workspace_id, lower(email)) where customer_id is null;

create table public.usage_daily (
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  customer_id uuid not null references public.customers (id) on delete cascade,
  day date not null,
  events integer not null default 0,
  active_users integer not null default 0,
  top_events jsonb not null default '{}'::jsonb,
  primary key (customer_id, day)
);
create index usage_daily_ws_day_idx on public.usage_daily (workspace_id, day);

-- ---------------------------------------------------------------------
-- 9. RISK SCORES
-- ELI5: risk_signals is the list of reasons ("card ends this month",
-- 15 points). risk_scores is the total per customer. history keeps one
-- score per day so we can draw a line and check if the score works.
-- ---------------------------------------------------------------------
create table public.risk_scores (
  customer_id uuid primary key references public.customers (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  score integer not null check (score between 0 and 100),
  band public.risk_band not null,
  previous_score integer,
  mrr_cents bigint not null default 0,
  currency text not null default 'usd',
  top_signal text,
  computed_at timestamptz not null default now(),
  summary text,
  summary_action text,
  summary_score integer,
  summary_at timestamptz,
  summary_status public.summary_status not null default 'none'
);
create index risk_scores_ws_score_idx on public.risk_scores (workspace_id, score desc);

create table public.risk_signals (
  id bigint generated always as identity primary key,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  customer_id uuid not null references public.customers (id) on delete cascade,
  code text not null,
  points integer not null,
  detail jsonb not null default '{}'::jsonb,
  plain_text text not null,
  computed_at timestamptz not null default now()
);
create index risk_signals_customer_idx on public.risk_signals (customer_id);
create index risk_signals_ws_code_idx on public.risk_signals (workspace_id, code);

create table public.risk_score_history (
  customer_id uuid not null references public.customers (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  day date not null,
  score integer not null,
  band public.risk_band not null,
  primary key (customer_id, day)
);
create index risk_score_history_ws_day_idx on public.risk_score_history (workspace_id, day);

-- ---------------------------------------------------------------------
-- 10. DUNNING (failed payments) AND UPDATE-CARD LINKS
-- ELI5: a dunning case is one failed invoice we are chasing. Each email
-- in the chase is a step. The update-card link is a long random token;
-- we only keep its fingerprint (hash), never the token itself.
-- ---------------------------------------------------------------------
create table public.dunning_settings (
  workspace_id uuid primary key references public.workspaces (id) on delete cascade,
  enabled boolean not null default false,
  card_expiry_enabled boolean not null default false,
  from_name text,
  reply_to text,
  steps jsonb not null default '[
    {"day":0,"subject":"Your payment to {brand} didn''t go through","body":"Hi {first_name},\\n\\nWe tried to charge your card ending {last4} for {amount} and it was declined. Update your card and we will retry straight away."},
    {"day":3,"subject":"Your {brand} account is at risk","body":"Hi {first_name},\\n\\nYour payment of {amount} is still outstanding. It takes 30 seconds to update your card."},
    {"day":7,"subject":"Last reminder: update your card to keep {brand}","body":"Hi {first_name},\\n\\nThis is the last reminder before your {plan} plan is paused. Update your card to keep everything as it is."}
  ]'::jsonb,
  checklist jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
create trigger dunning_settings_updated_at before update on public.dunning_settings
  for each row execute function public.set_updated_at();

create table public.dunning_cases (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  customer_id uuid not null references public.customers (id) on delete cascade,
  invoice_id uuid not null unique references public.invoices_mirror (id) on delete cascade,
  status public.dunning_status not null default 'open',
  amount_cents bigint not null,
  currency text not null default 'usd',
  step integer not null default 0,
  next_step_at timestamptz,
  emails_paused boolean not null default false,
  opened_at timestamptz not null default now(),
  recovered_at timestamptz,
  recovered_cents bigint,
  recovered_by public.recovered_by,
  closed_reason text,
  updated_at timestamptz not null default now()
);
create index dunning_cases_ws_status_idx on public.dunning_cases (workspace_id, status);
create index dunning_cases_customer_idx on public.dunning_cases (customer_id);
create index dunning_cases_due_idx on public.dunning_cases (next_step_at) where status = 'open';
create trigger dunning_cases_updated_at before update on public.dunning_cases
  for each row execute function public.set_updated_at();

create table public.update_card_tokens (
  token_hash text primary key,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  customer_id uuid not null references public.customers (id) on delete cascade,
  case_id uuid references public.dunning_cases (id) on delete cascade,
  checkout_session_id text,
  checkout_url text,
  checkout_expires_at timestamptz,
  expires_at timestamptz not null default now() + interval '14 days',
  used_at timestamptz,
  created_at timestamptz not null default now()
);
create index update_card_tokens_ws_idx on public.update_card_tokens (workspace_id);
create index update_card_tokens_customer_idx on public.update_card_tokens (customer_id);
create index update_card_tokens_case_idx on public.update_card_tokens (case_id);

-- ---------------------------------------------------------------------
-- 11. CANCEL FLOW: reasons, offers, rules, sessions
-- ELI5: reasons are the answers to "why are you cancelling?". Offers are
-- what we show instead (pause, discount, downgrade). Rules say which
-- offer goes with which reason. A session is one customer's visit.
-- ---------------------------------------------------------------------
create table public.cancel_reasons (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  code text not null check (code ~ '^[a-z_]{2,32}$'),
  label text not null check (char_length(label) between 2 and 60),
  stripe_feedback text not null default 'other' check (stripe_feedback in ('customer_service', 'low_quality',
    'missing_features', 'other', 'switched_service', 'too_complex', 'too_expensive', 'unused')),
  position integer not null default 0,
  asks_followup boolean not null default true,
  active boolean not null default true,
  unique (workspace_id, code)
);
create index cancel_reasons_ws_idx on public.cancel_reasons (workspace_id);

create table public.offers (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  kind public.offer_kind not null,
  label text not null check (char_length(label) between 2 and 80),
  headline text not null check (char_length(headline) between 2 and 120),
  pause_months integer check (pause_months between 1 and 3),
  percent_off integer check (percent_off between 5 and 75),
  duration_months integer check (duration_months between 1 and 12),
  target_price_id text,
  downgrade_timing text not null default 'now' check (downgrade_timing in ('now', 'renewal')),
  coupon_id text,
  variant text check (variant in ('a', 'b')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (kind = 'pause' and pause_months is not null) or
    (kind = 'discount' and percent_off is not null and duration_months is not null) or
    (kind = 'downgrade' and target_price_id is not null)
  )
);
create index offers_ws_idx on public.offers (workspace_id);
create trigger offers_updated_at before update on public.offers
  for each row execute function public.set_updated_at();

create table public.offer_rules (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  reason_id uuid not null references public.cancel_reasons (id) on delete cascade,
  offer_id uuid not null references public.offers (id) on delete cascade,
  price_id text,
  priority integer not null default 0
);
create index offer_rules_ws_idx on public.offer_rules (workspace_id);
create index offer_rules_reason_idx on public.offer_rules (reason_id);
create index offer_rules_offer_idx on public.offer_rules (offer_id);

create table public.cancel_sessions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  customer_id uuid not null references public.customers (id) on delete cascade,
  subscription_id uuid not null references public.subscriptions_mirror (id) on delete cascade,
  session_secret_hash text not null,
  status public.session_status not null default 'started',
  reason_id uuid references public.cancel_reasons (id) on delete set null,
  followup_text text check (char_length(followup_text) <= 500),
  ai_tag text,
  ai_quote text,
  ai_competitor text,
  offer_id uuid references public.offers (id) on delete set null,
  offer_result text check (offer_result in ('accepted', 'declined', 'failed')),
  mrr_cents bigint not null default 0,
  saved_mrr_cents bigint not null default 0,
  currency text not null default 'usd',
  ip_hash text,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  finished_at timestamptz
);
create index cancel_sessions_ws_created_idx on public.cancel_sessions (workspace_id, created_at desc);
create index cancel_sessions_customer_idx on public.cancel_sessions (customer_id);
create index cancel_sessions_sub_idx on public.cancel_sessions (subscription_id);
create index cancel_sessions_reason_idx on public.cancel_sessions (reason_id);
create index cancel_sessions_offer_idx on public.cancel_sessions (offer_id);
create unique index cancel_sessions_one_open_idx on public.cancel_sessions (subscription_id)
  where status in ('started', 'reason_given', 'offered', 'applying');
create trigger cancel_sessions_updated_at before update on public.cancel_sessions
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- 12. WIN-BACK: settings, runs, emails, suppressions
-- ELI5: when a customer cancels, a run starts. Claude drafts 3 emails,
-- the founder approves (or auto-send is on) and they go out on days 3,
-- 10 and 30. Anyone who unsubscribes goes on the suppression list.
-- ---------------------------------------------------------------------
create table public.winback_settings (
  workspace_id uuid primary key references public.workspaces (id) on delete cascade,
  enabled boolean not null default false,
  auto_send boolean not null default false,
  step_days integer[] not null default '{3,10,30}',
  tone text not null default 'friendly' check (tone in ('friendly', 'direct', 'formal')),
  offer_id uuid references public.offers (id) on delete set null,
  signature text not null default '' check (char_length(signature) <= 200),
  updated_at timestamptz not null default now()
);
create index winback_settings_offer_idx on public.winback_settings (offer_id);
create trigger winback_settings_updated_at before update on public.winback_settings
  for each row execute function public.set_updated_at();

create table public.winback_runs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  customer_id uuid not null references public.customers (id) on delete cascade,
  subscription_id uuid not null unique references public.subscriptions_mirror (id) on delete cascade,
  status public.winback_status not null default 'waiting',
  canceled_at timestamptz not null,
  mrr_cents bigint not null default 0,
  won_mrr_cents bigint,
  drafted_at timestamptz,
  approved_by uuid references auth.users (id) on delete set null,
  approved_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index winback_runs_ws_status_idx on public.winback_runs (workspace_id, status);
create index winback_runs_customer_idx on public.winback_runs (customer_id);
create index winback_runs_approved_by_idx on public.winback_runs (approved_by);
create trigger winback_runs_updated_at before update on public.winback_runs
  for each row execute function public.set_updated_at();

create table public.winback_emails (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.winback_runs (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  step integer not null check (step between 1 and 3),
  send_at timestamptz,
  subject text not null check (char_length(subject) <= 70),
  body_text text not null check (char_length(body_text) <= 1200),
  status public.winback_email_status not null default 'draft',
  resend_id text,
  opened_at timestamptz,
  clicked_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (run_id, step)
);
create index winback_emails_ws_idx on public.winback_emails (workspace_id);
create index winback_emails_due_idx on public.winback_emails (send_at) where status = 'scheduled';
create trigger winback_emails_updated_at before update on public.winback_emails
  for each row execute function public.set_updated_at();

create table public.email_suppressions (
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  email text not null,
  reason text not null check (reason in ('unsubscribe', 'bounce', 'complaint', 'manual')),
  created_at timestamptz not null default now(),
  primary key (workspace_id, email)
);

create table public.unsubscribe_tokens (
  token_hash text primary key,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  email text not null,
  created_at timestamptz not null default now()
);
create index unsubscribe_tokens_ws_idx on public.unsubscribe_tokens (workspace_id);

-- ---------------------------------------------------------------------
-- 13. JOBS QUEUE, AI BATCHES, USAGE LEDGER, EMAIL LOG, RATE LIMITS
-- ELI5: jobs is the to-do list the background worker works through.
-- usage_ledger is the meter: every paid AI call and email writes a line
-- here, so nobody can spend more than their plan allows.
-- ---------------------------------------------------------------------
create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces (id) on delete cascade,
  kind public.job_kind not null,
  ref_id text,
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
create index jobs_ws_idx on public.jobs (workspace_id, created_at desc);
create trigger jobs_updated_at before update on public.jobs
  for each row execute function public.set_updated_at();

create table public.ai_batches (
  id uuid primary key default gen_random_uuid(),
  anthropic_batch_id text not null unique,
  kind text not null check (kind in ('risk_summary', 'winback_draft')),
  status public.batch_status not null default 'submitted',
  request_count integer not null default 0,
  submitted_at timestamptz not null default now(),
  ended_at timestamptz
);

create table public.usage_ledger (
  id bigint generated always as identity primary key,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  kind public.usage_kind not null,
  quantity numeric not null check (quantity >= 0),
  cost_usd_micros bigint not null default 0,
  ref_id text,
  idempotency_key text unique,
  created_at timestamptz not null default now()
);
create index usage_ledger_ws_month_idx on public.usage_ledger (workspace_id, kind, created_at);

create table public.email_log (
  id bigint generated always as identity primary key,
  workspace_id uuid references public.workspaces (id) on delete cascade,
  kind text not null,
  dedupe_key text not null unique,
  to_email text not null,
  resend_id text,
  status text not null default 'queued' check (status in ('queued', 'sent', 'failed', 'skipped')),
  created_at timestamptz not null default now()
);
create index email_log_ws_idx on public.email_log (workspace_id, created_at desc);

create table public.rate_limits (
  key text not null,
  window_start timestamptz not null,
  hits integer not null default 0,
  primary key (key, window_start)
);

-- ---------------------------------------------------------------------
-- 14. RETAIN'S OWN BILLING (written only by your billing webhook)
-- ELI5: this is founders paying YOU for Retain, on YOUR Stripe account.
-- It has nothing to do with the mirror tables above.
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

create table public.stripe_billing_events (
  id text primary key,
  type text not null,
  received_at timestamptz not null default now()
);

-- After you create prices in Stripe, run:
-- insert into public.plan_prices values ('price_...', 'starter'), ...
create table public.plan_prices (
  price_id text primary key,
  plan text not null check (plan in ('starter', 'growth', 'scale'))
);

-- Test-only limit overrides. No policies: only you, in the SQL editor.
create table public.workspace_limit_overrides (
  workspace_id uuid primary key references public.workspaces (id) on delete cascade,
  tracked_customers integer,
  risk_summaries integer,
  winback_drafts integer,
  exit_tags integer,
  emails integer,
  usage_events integer
);

-- ---------------------------------------------------------------------
-- 15. ACCESS, LIMIT AND MONEY FUNCTIONS
-- ELI5: has_active_access is the paywall: the owner's trial or paid
-- plan keeps the workspace open. plan_limits returns the numbers from
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

create or replace function public.plan_limits(ws uuid)
returns table (plan text, trialing boolean, mrr_band_cents bigint, tracked_customers integer,
               risk_summaries integer, winback_drafts integer, exit_tags integer, emails integer,
               usage_events integer, seats integer, offers integer, ab_tests boolean, remove_badge boolean)
language plpgsql stable security definer set search_path = '' as $$
declare
  v_plan text;
  v_status text;
  o record;
begin
  select coalesce(pp.plan, 'starter'), s.status into v_plan, v_status
  from public.workspaces w
  left join public.subscriptions s on s.user_id = w.owner_id
  left join public.plan_prices pp on pp.price_id = s.price_id
  where w.id = ws;

  if v_plan is null then v_plan := 'starter'; end if;
  trialing := coalesce(v_status = 'trialing', false);

  if v_plan = 'scale' then
    plan := 'scale'; mrr_band_cents := 10000000; tracked_customers := 6000; risk_summaries := 6000;
    winback_drafts := 400; exit_tags := 800; emails := 6000; usage_events := 3000000; seats := 10;
    offers := 1000; ab_tests := true; remove_badge := true;
  elsif v_plan = 'growth' then
    plan := 'growth'; mrr_band_cents := 4000000; tracked_customers := 2000; risk_summaries := 2000;
    winback_drafts := 200; exit_tags := 400; emails := 2000; usage_events := 1000000; seats := 5;
    offers := 10; ab_tests := true; remove_badge := false;
  else
    plan := 'starter'; mrr_band_cents := 1000000; tracked_customers := 500; risk_summaries := 500;
    winback_drafts := 50; exit_tags := 100; emails := 500; usage_events := 250000; seats := 2;
    offers := 3; ab_tests := false; remove_badge := false;
  end if;

  -- The 7 day trial gets Growth features with small AI and email caps.
  if trialing then
    plan := 'trial'; tracked_customers := 2000; risk_summaries := 100; winback_drafts := 5;
    exit_tags := 50; emails := 100; usage_events := 250000; seats := 5; offers := 10; ab_tests := true;
  end if;

  select * into o from public.workspace_limit_overrides where workspace_id = ws;
  if found then
    tracked_customers := coalesce(o.tracked_customers, tracked_customers);
    risk_summaries := coalesce(o.risk_summaries, risk_summaries);
    winback_drafts := coalesce(o.winback_drafts, winback_drafts);
    exit_tags := coalesce(o.exit_tags, exit_tags);
    emails := coalesce(o.emails, emails);
    usage_events := coalesce(o.usage_events, usage_events);
  end if;
  return next;
end;
$$;

create or replace function public.usage_this_month(ws uuid, k public.usage_kind)
returns numeric language sql stable security definer set search_path = '' as $$
  select coalesce(sum(quantity), 0) from public.usage_ledger
  where workspace_id = ws and kind = k and created_at >= date_trunc('month', now());
$$;

-- What the sidebar meter and Billing page read. Checks membership itself.
create or replace function public.workspace_meters(ws uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  l record;
  v_tracked integer;
begin
  if not public.is_workspace_member(ws) then
    raise exception 'not a member' using errcode = '42501';
  end if;
  select * into l from public.plan_limits(ws);
  select count(*) into v_tracked from public.tracked_customers_all(ws);
  return jsonb_build_object(
    'plan', l.plan,
    'tracked', jsonb_build_object('used', v_tracked, 'cap', l.tracked_customers),
    'risk_summaries', jsonb_build_object('used', public.usage_this_month(ws, 'risk_summaries'), 'cap', l.risk_summaries),
    'winback_drafts', jsonb_build_object('used', public.usage_this_month(ws, 'winback_drafts'), 'cap', l.winback_drafts),
    'exit_tags', jsonb_build_object('used', public.usage_this_month(ws, 'exit_tags'), 'cap', l.exit_tags),
    'emails', jsonb_build_object('used', public.usage_this_month(ws, 'emails'), 'cap', l.emails),
    'usage_events', jsonb_build_object('used', public.usage_this_month(ws, 'usage_events'), 'cap', l.usage_events),
    'seats', jsonb_build_object('used', (select count(*) from public.workspace_members m where m.workspace_id = ws), 'cap', l.seats),
    'mrr_band_cents', l.mrr_band_cents
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
  return v_hits <= p_max;
end;
$$;

-- Money as text for the plain-words signals: 4900, 'usd' -> '$49.00'.
create or replace function public.format_money(cents bigint, cur text)
returns text language sql immutable set search_path = '' as $$
  select case lower(cur) when 'usd' then '$' when 'gbp' then '£' when 'eur' then '€'
           else upper(cur) || ' ' end
         || to_char(coalesce(cents, 0) / 100.0, 'FM999,999,990.00');
$$;

-- "1 time" / "3 times".
create or replace function public.plural(n bigint, one text, many text)
returns text language sql immutable set search_path = '' as $$
  select n::text || ' ' || case when n = 1 then one else many end;
$$;

-- Every customer we track: live subscription, or cancelled in the last
-- 30 days (for win-back). One row per customer, their biggest subscription.
create or replace function public.tracked_customers_all(ws uuid)
returns table (customer_id uuid, subscription_id uuid, mrr_cents bigint, currency text, status text)
language sql stable security definer set search_path = '' as $$
  select distinct on (s.customer_id) s.customer_id, s.id, s.mrr_cents, s.currency, s.status
  from public.subscriptions_mirror s
  join public.customers c on c.id = s.customer_id and not c.deleted
  where s.workspace_id = ws
    and (s.status in ('active', 'trialing', 'past_due', 'unpaid', 'paused')
         or (s.status = 'canceled' and s.canceled_at > now() - interval '30 days'))
  order by s.customer_id, (s.status <> 'canceled') desc, s.mrr_cents desc;
$$;

-- The ones inside the plan cap, biggest MRR first. Over-cap customers
-- are mirrored but not scored or emailed.
create or replace function public.tracked_customers(ws uuid)
returns table (customer_id uuid, subscription_id uuid, mrr_cents bigint, currency text, status text)
language sql stable security definer set search_path = '' as $$
  select t.* from public.tracked_customers_all(ws) t
  order by t.mrr_cents desc, t.customer_id
  limit (select l.tracked_customers from public.plan_limits(ws) l);
$$;

-- ---------------------------------------------------------------------
-- 16. THE CHURN RISK SCORE
-- ELI5: for each tracked customer we add up points for warning signs
-- (failed payment 35, card expiring 15, downgrade 20 ...). Each sign
-- also writes a plain sentence, so the founder sees exactly why. No AI
-- here: same input, same score, every time, for free.
-- ---------------------------------------------------------------------
create or replace function public.compute_risk(ws uuid, p_customer uuid default null)
returns integer language plpgsql security definer set search_path = '' as $$
declare
  v_usage boolean;
  v_count integer;
begin
  select w.usage_tracking into v_usage from public.workspaces w where w.id = ws;

  create temporary table if not exists tmp_tracked (
    customer_id uuid primary key, subscription_id uuid, mrr_cents bigint, currency text, status text
  ) on commit drop;
  truncate tmp_tracked;
  insert into tmp_tracked
  select * from public.tracked_customers(ws) t
  where (p_customer is null or t.customer_id = p_customer);

  delete from public.risk_signals rs
  where rs.workspace_id = ws and rs.customer_id in (select customer_id from tmp_tracked);

  -- payment_failed_open (35)
  insert into public.risk_signals (workspace_id, customer_id, code, points, detail, plain_text)
  select ws, t.customer_id, 'payment_failed_open', 35,
    jsonb_build_object('amount', d.amount_cents, 'attempts', i.attempt_count, 'next', i.next_payment_attempt),
    format('Their last payment of %s failed %s.%s', public.format_money(d.amount_cents, d.currency),
      public.plural(greatest(i.attempt_count, 1), 'time', 'times'),
      case when i.next_payment_attempt is not null
        then ' Next retry ' || to_char(i.next_payment_attempt, 'FMDD Mon') || '.' else ' No retry is scheduled.' end)
  from tmp_tracked t
  join lateral (
    select * from public.dunning_cases dc
    where dc.customer_id = t.customer_id and dc.status = 'open'
    order by dc.opened_at desc limit 1
  ) d on true
  join public.invoices_mirror i on i.id = d.invoice_id;

  -- payment_failed_recent (10): 2+ failures in 90 days, now paid
  insert into public.risk_signals (workspace_id, customer_id, code, points, detail, plain_text)
  select ws, t.customer_id, 'payment_failed_recent', 10, jsonb_build_object('failed', x.n),
    format('Payments failed %s in the last 90 days before going through.', public.plural(x.n, 'time', 'times'))
  from tmp_tracked t
  join lateral (
    select coalesce(sum(greatest(i.attempt_count - 1, 0)), 0)::bigint as n
    from public.invoices_mirror i
    where i.customer_id = t.customer_id and i.status = 'paid' and i.paid_at > now() - interval '90 days'
  ) x on x.n >= 2
  where not exists (select 1 from public.dunning_cases dc where dc.customer_id = t.customer_id and dc.status = 'open');

  -- card_expiring (15, or 25 if the next renewal is after the expiry)
  insert into public.risk_signals (workspace_id, customer_id, code, points, detail, plain_text)
  select ws, t.customer_id, 'card_expiring',
    case when s.current_period_end > e.ends then 25 else 15 end,
    jsonb_build_object('exp_month', c.card_exp_month, 'exp_year', c.card_exp_year),
    format('Their card ends %s.%s', to_char(e.ends, 'FMMonth YYYY'),
      case when s.current_period_end is not null
        then ' Renewal is on ' || to_char(s.current_period_end, 'FMDD Mon') || '.' else '' end)
  from tmp_tracked t
  join public.customers c on c.id = t.customer_id
  join public.subscriptions_mirror s on s.id = t.subscription_id
  cross join lateral (
    select (make_date(c.card_exp_year, c.card_exp_month, 1) + interval '1 month' - interval '1 day')::date as ends
  ) e
  where c.card_exp_year is not null and c.card_exp_month is not null
    and t.status <> 'canceled'
    and e.ends >= current_date
    and e.ends < (date_trunc('month', now()) + interval '2 months')::date;

  -- cancel_scheduled (60)
  insert into public.risk_signals (workspace_id, customer_id, code, points, detail, plain_text)
  select ws, t.customer_id, 'cancel_scheduled', 60, jsonb_build_object('at', coalesce(s.cancel_at, s.current_period_end)),
    format('They have already scheduled a cancel for %s.', to_char(coalesce(s.cancel_at, s.current_period_end), 'FMDD Mon YYYY'))
  from tmp_tracked t
  join public.subscriptions_mirror s on s.id = t.subscription_id
  where s.cancel_at_period_end or (s.cancel_at is not null and s.status <> 'canceled');

  -- downgrade_recent (20)
  insert into public.risk_signals (workspace_id, customer_id, code, points, detail, plain_text)
  select ws, t.customer_id, 'downgrade_recent', 20,
    jsonb_build_object('before', ch.mrr_before_cents, 'after', ch.mrr_after_cents),
    format('Downgraded on %s (%s a month less).', to_char(ch.at, 'FMDD Mon'),
      public.format_money(coalesce(ch.mrr_before_cents, 0) - coalesce(ch.mrr_after_cents, 0), t.currency))
  from tmp_tracked t
  join lateral (
    select * from public.subscription_changes sc
    where sc.subscription_id = t.subscription_id and sc.kind = 'downgrade' and sc.at > now() - interval '60 days'
    order by sc.at desc limit 1
  ) ch on true;

  -- seats_reduced (15): quantity cut by 20% or more
  insert into public.risk_signals (workspace_id, customer_id, code, points, detail, plain_text)
  select ws, t.customer_id, 'seats_reduced', 15,
    jsonb_build_object('before', ch.quantity_before, 'after', ch.quantity_after),
    format('Cut seats from %s to %s on %s.', ch.quantity_before, ch.quantity_after, to_char(ch.at, 'FMDD Mon'))
  from tmp_tracked t
  join lateral (
    select * from public.subscription_changes sc
    where sc.subscription_id = t.subscription_id and sc.kind = 'seat_down' and sc.at > now() - interval '60 days'
      and sc.quantity_before > 0
      and (sc.quantity_before - sc.quantity_after)::numeric / sc.quantity_before >= 0.2
    order by sc.at desc limit 1
  ) ch on true;

  -- trial ending (15 without usage data, 25 if they barely used it)
  insert into public.risk_signals (workspace_id, customer_id, code, points, detail, plain_text)
  select ws, t.customer_id,
    case when v_usage and u.days < 3 then 'trial_ending_inactive' else 'trial_ending' end,
    case when v_usage and u.days < 3 then 25 else 15 end,
    jsonb_build_object('trial_end', s.trial_end, 'active_days', u.days),
    case when v_usage
      then format('Trial ends %s and they used the product on %s.', to_char(s.trial_end, 'FMDD Mon'), public.plural(u.days, 'day', 'days'))
      else format('Trial ends %s.', to_char(s.trial_end, 'FMDD Mon')) end
  from tmp_tracked t
  join public.subscriptions_mirror s on s.id = t.subscription_id
  cross join lateral (
    select count(*)::bigint as days from public.usage_daily ud
    where ud.customer_id = t.customer_id and ud.day >= coalesce(s.trial_start, s.started_at, now() - interval '14 days')::date
  ) u
  where s.status = 'trialing' and s.trial_end between now() and now() + interval '7 days';

  -- paused (10)
  insert into public.risk_signals (workspace_id, customer_id, code, points, detail, plain_text)
  select ws, t.customer_id, 'paused', 10, jsonb_build_object('resumes', s.pause_resumes_at),
    case when s.pause_resumes_at is not null
      then format('Payments paused until %s.', to_char(s.pause_resumes_at, 'FMDD Mon'))
      else 'Payments are paused with no restart date.' end
  from tmp_tracked t
  join public.subscriptions_mirror s on s.id = t.subscription_id
  where s.paused;

  if v_usage then
    -- usage_drop (25, or 35 if down 80%+): last 14 days vs the 28 before, halved
    insert into public.risk_signals (workspace_id, customer_id, code, points, detail, plain_text)
    select ws, t.customer_id, 'usage_drop',
      case when u.pct >= 80 then 35 else 25 end,
      jsonb_build_object('recent_days', u.recent, 'before_days', u.before, 'pct', u.pct),
      format('Used the product on %s in the last 2 weeks, down from %s in the 4 weeks before (-%s%%).',
        public.plural(u.recent, 'day', 'days'), public.plural(u.before, 'day', 'days'), u.pct)
    from tmp_tracked t
    join public.customers c on c.id = t.customer_id
    cross join lateral (
      select r.recent, r.before,
        case when r.before = 0 then 0
          else round(100 * (1 - r.recent::numeric / (r.before::numeric / 2)))::int end as pct
      from (
        select count(*) filter (where ud.day > current_date - 14)::bigint as recent,
               count(*) filter (where ud.day <= current_date - 14 and ud.day > current_date - 42)::bigint as before
        from public.usage_daily ud where ud.customer_id = t.customer_id
      ) r
    ) u
    where t.status <> 'canceled'
      and c.first_seen_usage_at < now() - interval '42 days'
      and u.recent > 0 and u.before >= 4 and u.pct >= 50;

    -- no_usage_14d (30)
    insert into public.risk_signals (workspace_id, customer_id, code, points, detail, plain_text)
    select ws, t.customer_id, 'no_usage_14d', 30, jsonb_build_object('last_seen', c.last_seen_usage_at),
      format('No activity in %s. Last seen %s.',
        public.plural((current_date - c.last_seen_usage_at::date)::bigint, 'day', 'days'), to_char(c.last_seen_usage_at, 'FMDD Mon'))
    from tmp_tracked t
    join public.customers c on c.id = t.customer_id
    where t.status <> 'canceled' and c.last_seen_usage_at is not null
      and c.last_seen_usage_at < now() - interval '14 days';

    -- seat_inactive (10): fewer than half the paid seats active
    insert into public.risk_signals (workspace_id, customer_id, code, points, detail, plain_text)
    select ws, t.customer_id, 'seat_inactive', 10, jsonb_build_object('active', a.n, 'seats', s.quantity),
      format('%s of %s paid seats used the product in the last 2 weeks.', a.n, s.quantity)
    from tmp_tracked t
    join public.subscriptions_mirror s on s.id = t.subscription_id
    join public.customers c on c.id = t.customer_id
    cross join lateral (
      select coalesce(max(ud.active_users), 0) as n from public.usage_daily ud
      where ud.customer_id = t.customer_id and ud.day > current_date - 14
    ) a
    where t.status <> 'canceled' and c.last_seen_usage_at is not null
      and s.quantity >= 2 and a.n * 2 < s.quantity;
  end if;

  -- new_customer (5)
  insert into public.risk_signals (workspace_id, customer_id, code, points, detail, plain_text)
  select ws, t.customer_id, 'new_customer', 5, jsonb_build_object('started', s.started_at),
    format('Joined %s ago. New customers leave most often.', public.plural((current_date - s.started_at::date)::bigint, 'day', 'days'))
  from tmp_tracked t
  join public.subscriptions_mirror s on s.id = t.subscription_id
  where s.status = 'active' and s.started_at > now() - interval '60 days';

  -- long_tenure (-10) only when nothing else fired
  insert into public.risk_signals (workspace_id, customer_id, code, points, detail, plain_text)
  select ws, t.customer_id, 'long_tenure', -10, jsonb_build_object('months', m.months),
    format('Customer for %s months with no warning signs.', m.months)
  from tmp_tracked t
  join public.subscriptions_mirror s on s.id = t.subscription_id
  cross join lateral (
    select (extract(year from age(now(), s.started_at)) * 12 + extract(month from age(now(), s.started_at)))::int as months
  ) m
  where s.status = 'active' and s.started_at < now() - interval '12 months'
    and not exists (select 1 from public.risk_signals rs where rs.customer_id = t.customer_id);

  -- Totals per customer. Cancelled customers keep a row (score 0, low)
  -- so win-back pages can join, but the UI shows them as "Cancelled".
  insert into public.risk_scores (customer_id, workspace_id, score, band, mrr_cents, currency, top_signal, computed_at)
  select t.customer_id, ws, x.score,
    case when x.has_cancel or x.score >= 70 then 'high'::public.risk_band
         when x.score >= 40 then 'watch'::public.risk_band else 'low'::public.risk_band end,
    t.mrr_cents, t.currency, x.top_text, now()
  from tmp_tracked t
  cross join lateral (
    select
      case when t.status = 'canceled' then 0 else least(100, greatest(0, coalesce(sum(rs.points), 0)))::int end as score,
      coalesce(bool_or(rs.code = 'cancel_scheduled'), false) and t.status <> 'canceled' as has_cancel,
      (array_agg(rs.plain_text order by rs.points desc))[1] as top_text
    from public.risk_signals rs where rs.customer_id = t.customer_id
  ) x
  on conflict (customer_id) do update set
    previous_score = public.risk_scores.score,
    score = excluded.score,
    band = excluded.band,
    mrr_cents = excluded.mrr_cents,
    currency = excluded.currency,
    top_signal = excluded.top_signal,
    computed_at = excluded.computed_at;

  insert into public.risk_score_history (customer_id, workspace_id, day, score, band)
  select r.customer_id, ws, current_date, r.score, r.band
  from public.risk_scores r where r.customer_id in (select customer_id from tmp_tracked)
  on conflict (customer_id, day) do update set score = excluded.score, band = excluded.band;

  select count(*) into v_count from tmp_tracked;
  return v_count;
end;
$$;

-- Nightly roll-up of raw usage into usage_daily, then delete raw rows
-- older than 90 days. Called by rt-score before scoring.
create or replace function public.rollup_usage(ws uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  with d as (
    select e.customer_id, e.occurred_at::date as day, count(*)::int as events,
      count(distinct coalesce(e.external_user_id, e.email, e.customer_id::text))::int as active_users
    from public.usage_events e
    where e.workspace_id = ws and e.customer_id is not null and e.occurred_at > now() - interval '3 days'
    group by e.customer_id, e.occurred_at::date
  ), n as (
    select e.customer_id, e.occurred_at::date as day, e.name, count(*) as c,
      row_number() over (partition by e.customer_id, e.occurred_at::date order by count(*) desc) as rn
    from public.usage_events e
    where e.workspace_id = ws and e.customer_id is not null and e.occurred_at > now() - interval '3 days'
    group by e.customer_id, e.occurred_at::date, e.name
  ), t as (
    select n.customer_id, n.day, jsonb_object_agg(n.name, n.c) as top
    from n where n.rn <= 5 group by n.customer_id, n.day
  )
  insert into public.usage_daily (workspace_id, customer_id, day, events, active_users, top_events)
  select ws, d.customer_id, d.day, d.events, d.active_users, coalesce(t.top, '{}'::jsonb)
  from d left join t on t.customer_id = d.customer_id and t.day = d.day
  on conflict (customer_id, day) do update set
    events = excluded.events, active_users = excluded.active_users, top_events = excluded.top_events;

  update public.customers c set
    first_seen_usage_at = least(coalesce(c.first_seen_usage_at, x.first_at), x.first_at),
    last_seen_usage_at = greatest(coalesce(c.last_seen_usage_at, x.last_at), x.last_at)
  from (
    select e.customer_id, min(e.occurred_at) as first_at, max(e.occurred_at) as last_at
    from public.usage_events e
    where e.workspace_id = ws and e.customer_id is not null and e.occurred_at > now() - interval '3 days'
    group by e.customer_id
  ) x
  where c.id = x.customer_id;

  delete from public.usage_events where workspace_id = ws and occurred_at < now() - interval '90 days';
end;
$$;

-- Link events that arrived before we knew the customer, by email.
create or replace function public.match_unmatched_events(ws uuid)
returns integer language plpgsql security definer set search_path = '' as $$
declare v integer;
begin
  update public.usage_events e set customer_id = c.id
  from public.customers c
  where e.workspace_id = ws and e.customer_id is null and c.workspace_id = ws and not c.deleted
    and ((e.stripe_customer_ref is not null and c.stripe_customer_id = e.stripe_customer_ref)
      or (e.email is not null and lower(c.email) = lower(e.email)));
  get diagnostics v = row_count;
  return v;
end;
$$;

-- ---------------------------------------------------------------------
-- 17. WORKER FUNCTIONS (edge functions only, secret key)
-- ELI5: the worker grabs up to N jobs at once. "skip locked" means two
-- workers never grab the same job. Failed jobs wait longer each time.
-- ---------------------------------------------------------------------
create or replace function public.claim_jobs(p_limit integer default 25)
returns setof public.jobs language plpgsql security definer set search_path = '' as $$
begin
  -- Reclaim jobs stuck in running for over 5 minutes (a crashed worker).
  update public.jobs set status = 'queued', locked_at = null
  where status = 'running' and locked_at < now() - interval '5 minutes';

  return query
  with claimed as (
    update public.jobs j set status = 'running', locked_at = now(), attempts = j.attempts + 1
    where j.id in (
      select q.id from public.jobs q
      where q.status = 'queued' and q.run_after <= now()
      order by q.run_after
      for update skip locked
      limit p_limit
    )
    returning j.*
  )
  select * from claimed;
end;
$$;

create or replace function public.finish_job(p_id uuid)
returns void language sql security definer set search_path = '' as $$
  update public.jobs set status = 'done', locked_at = null, last_error = null where id = p_id;
$$;

create or replace function public.fail_job(p_id uuid, p_error text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_attempts integer;
begin
  select attempts into v_attempts from public.jobs where id = p_id;
  update public.jobs set
    status = case when v_attempts >= 6 then 'dead'::public.job_status else 'queued'::public.job_status end,
    locked_at = null,
    last_error = left(p_error, 500),
    run_after = now() + least(interval '1 hour',
      make_interval(secs => (power(2, v_attempts) * 20 + floor(random() * 10))::int))
  where id = p_id;
end;
$$;

-- Delete old housekeeping rows. Called nightly.
create or replace function public.housekeeping()
returns void language sql security definer set search_path = '' as $$
  delete from public.rate_limits where window_start < now() - interval '1 day';
  delete from public.oauth_states where expires_at < now() - interval '1 day';
  delete from public.jobs where status = 'done' and updated_at < now() - interval '14 days';
  update public.cancel_sessions set status = 'abandoned', finished_at = now()
    where status in ('started', 'reason_given', 'offered') and updated_at < now() - interval '30 minutes';
$$;

-- ---------------------------------------------------------------------
-- 18. WORKSPACE AND INVITE FUNCTIONS (called from the app)
-- ELI5: creating a workspace sets up the owner, default cancel reasons
-- and default settings in one step, so nothing is ever half made.
-- ---------------------------------------------------------------------
create or replace function public.create_workspace(p_name text, p_url text default null,
  p_support_email text default null, p_timezone text default 'Europe/London')
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_ws uuid;
  v_slug text;
begin
  if v_uid is null then raise exception 'not signed in' using errcode = '42501'; end if;
  v_slug := left(regexp_replace(lower(p_name), '[^a-z0-9]+', '-', 'g'), 30);
  v_slug := trim(both '-' from v_slug);
  if char_length(v_slug) < 3 then v_slug := 'ws'; end if;
  v_slug := v_slug || '-' || substr(encode(extensions.gen_random_bytes(3), 'hex'), 1, 5);

  insert into public.workspaces (name, slug, owner_id, brand_name, product_url, support_email, timezone, publishable_key)
  values (p_name, v_slug, v_uid, p_name, p_url, p_support_email, coalesce(p_timezone, 'Europe/London'),
          'rt_pub_' || encode(extensions.gen_random_bytes(18), 'hex'))
  returning id into v_ws;

  insert into public.workspace_members (workspace_id, user_id, role) values (v_ws, v_uid, 'owner');
  insert into public.dunning_settings (workspace_id, from_name, reply_to) values (v_ws, p_name, p_support_email);
  insert into public.winback_settings (workspace_id) values (v_ws);
  insert into public.cancel_reasons (workspace_id, code, label, stripe_feedback, position) values
    (v_ws, 'too_expensive', 'Too expensive', 'too_expensive', 1),
    (v_ws, 'not_using', 'Not using it enough', 'unused', 2),
    (v_ws, 'missing_feature', 'Missing a feature I need', 'missing_features', 3),
    (v_ws, 'switching', 'Switching to another tool', 'switched_service', 4),
    (v_ws, 'technical', 'Technical problems', 'low_quality', 5),
    (v_ws, 'other', 'Other', 'other', 6);
  update public.profiles set current_workspace_id = v_ws where id = v_uid;
  return v_ws;
end;
$$;

create or replace function public.create_invite(ws uuid, p_email text, p_role public.workspace_role)
returns text language plpgsql security definer set search_path = '' as $$
declare
  v_token text := encode(extensions.gen_random_bytes(32), 'hex');
  v_seats integer;
begin
  if not public.has_workspace_role(ws, array['owner', 'admin']::public.workspace_role[]) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if p_role = 'owner' then raise exception 'cannot invite an owner'; end if;
  select seats into v_seats from public.plan_limits(ws);
  if (select count(*) from public.workspace_members where workspace_id = ws)
     + (select count(*) from public.workspace_invites where workspace_id = ws and accepted_at is null and expires_at > now())
     >= v_seats then
    raise exception 'seat limit reached' using errcode = 'P0001';
  end if;
  insert into public.workspace_invites (workspace_id, email, role, token_hash, invited_by)
  values (ws, lower(p_email), p_role, encode(extensions.digest(v_token, 'sha256'), 'hex'), (select auth.uid()));
  return v_token;
end;
$$;

create or replace function public.accept_invite(p_token text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  inv record;
  v_uid uuid := (select auth.uid());
begin
  select * into inv from public.workspace_invites
  where token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex')
    and accepted_at is null and expires_at > now()
  for update;
  if not found then raise exception 'invite not found or expired'; end if;
  insert into public.workspace_members (workspace_id, user_id, role)
  values (inv.workspace_id, v_uid, inv.role) on conflict do nothing;
  update public.workspace_invites set accepted_at = now() where id = inv.id;
  update public.profiles set current_workspace_id = inv.workspace_id where id = v_uid;
  return inv.workspace_id;
end;
$$;

-- Safe connection status for the app (no tokens). Checks membership.
create or replace function public.get_stripe_connections(ws uuid)
returns table (id uuid, account_id text, livemode boolean, method public.connection_method,
               status public.connection_status, import_progress jsonb, last_synced_at timestamptz, last_error text)
language sql stable security definer set search_path = '' as $$
  select c.id, c.account_id, c.livemode, c.method, c.status, c.import_progress, c.last_synced_at, c.last_error
  from public.stripe_connections c
  where c.workspace_id = ws and public.is_workspace_member(ws);
$$;

-- Dashboard numbers, computed live from the mirrors (section 19 of the PRD).
-- security invoker: it runs with the caller's RLS, so it only ever sees
-- the caller's own workspace rows.
create or replace function public.dashboard_metrics(ws uuid, p_from timestamptz default date_trunc('month', now()))
returns jsonb language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object(
    'mrr_at_risk_cents', (select coalesce(sum(case when r.band = 'high' then r.mrr_cents
                                                   when r.band = 'watch' then r.mrr_cents / 2 else 0 end), 0)
                          from public.risk_scores r
                          where r.workspace_id = ws
                            and exists (select 1 from public.subscriptions_mirror s
                                        where s.customer_id = r.customer_id and s.status <> 'canceled')),
    'saved_mrr_cents', (select coalesce(sum(cs.saved_mrr_cents), 0) from public.cancel_sessions cs
                        where cs.workspace_id = ws and cs.status = 'saved' and cs.finished_at >= p_from
                          and not exists (select 1 from public.subscriptions_mirror s
                                          where s.id = cs.subscription_id and s.status = 'canceled' and s.canceled_at >= p_from)),
    'recovered_cents', (select coalesce(sum(d.recovered_cents), 0) from public.dunning_cases d
                        where d.workspace_id = ws and d.status = 'recovered' and d.recovered_at >= p_from),
    'recovered_by_card_update_cents', (select coalesce(sum(d.recovered_cents), 0) from public.dunning_cases d
                        where d.workspace_id = ws and d.status = 'recovered' and d.recovered_by = 'card_update' and d.recovered_at >= p_from),
    'won_back_mrr_cents', (select coalesce(sum(w.won_mrr_cents), 0) from public.winback_runs w
                           where w.workspace_id = ws and w.status = 'won' and w.updated_at >= p_from),
    'churned_mrr_cents', (select coalesce(sum(s.mrr_cents), 0) from public.subscriptions_mirror s
                          where s.workspace_id = ws and s.status = 'canceled' and s.canceled_at >= p_from),
    'sessions_saved', (select count(*) from public.cancel_sessions cs where cs.workspace_id = ws and cs.status = 'saved' and cs.finished_at >= p_from),
    'sessions_canceled', (select count(*) from public.cancel_sessions cs where cs.workspace_id = ws and cs.status = 'canceled' and cs.finished_at >= p_from),
    'reasons', (select coalesce(jsonb_agg(x), '[]'::jsonb) from (
                  select cr.label, count(*) as n, sum(cs.mrr_cents) as mrr_cents
                  from public.cancel_sessions cs join public.cancel_reasons cr on cr.id = cs.reason_id
                  where cs.workspace_id = ws and cs.created_at > now() - interval '90 days'
                  group by cr.label order by count(*) desc) x)
  );
$$;

-- ---------------------------------------------------------------------
-- 19. ROW LEVEL SECURITY: switch it on for every table
-- ELI5: with RLS on and no policy, nobody can touch a table from the
-- browser. Then we add exactly the doors we want, one per action.
-- ---------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.workspace_invites enable row level security;
alter table public.workspace_secrets enable row level security;
alter table public.oauth_states enable row level security;
alter table public.stripe_connections enable row level security;
alter table public.stripe_tokens enable row level security;
alter table public.customers enable row level security;
alter table public.subscriptions_mirror enable row level security;
alter table public.subscription_changes enable row level security;
alter table public.invoices_mirror enable row level security;
alter table public.stripe_events enable row level security;
alter table public.usage_events enable row level security;
alter table public.usage_daily enable row level security;
alter table public.risk_scores enable row level security;
alter table public.risk_signals enable row level security;
alter table public.risk_score_history enable row level security;
alter table public.dunning_settings enable row level security;
alter table public.dunning_cases enable row level security;
alter table public.update_card_tokens enable row level security;
alter table public.cancel_reasons enable row level security;
alter table public.offers enable row level security;
alter table public.offer_rules enable row level security;
alter table public.cancel_sessions enable row level security;
alter table public.winback_settings enable row level security;
alter table public.winback_runs enable row level security;
alter table public.winback_emails enable row level security;
alter table public.email_suppressions enable row level security;
alter table public.unsubscribe_tokens enable row level security;
alter table public.jobs enable row level security;
alter table public.ai_batches enable row level security;
alter table public.usage_ledger enable row level security;
alter table public.email_log enable row level security;
alter table public.rate_limits enable row level security;
alter table public.subscriptions enable row level security;
alter table public.stripe_billing_events enable row level security;
alter table public.plan_prices enable row level security;
alter table public.workspace_limit_overrides enable row level security;

-- No policies at all (server only): workspace_secrets, oauth_states,
-- stripe_connections writes, stripe_tokens, stripe_events, usage_events,
-- update_card_tokens, unsubscribe_tokens, jobs, ai_batches, email_log,
-- rate_limits, stripe_billing_events, workspace_limit_overrides.

-- profiles: you see yourself and teammates; you edit only yourself.
create policy profiles_select on public.profiles for select to authenticated
  using (id = (select auth.uid()) or public.shares_workspace_with(id));
create policy profiles_update on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- workspaces: members read; owners and admins edit; created only by
-- create_workspace(); deleted only by the owner.
create policy workspaces_select on public.workspaces for select to authenticated
  using (public.is_workspace_member(id));
create policy workspaces_update on public.workspaces for update to authenticated
  using (public.has_workspace_role(id, array['owner', 'admin']::public.workspace_role[]))
  with check (public.has_workspace_role(id, array['owner', 'admin']::public.workspace_role[]));
create policy workspaces_delete on public.workspaces for delete to authenticated
  using (owner_id = (select auth.uid()));

-- The browser may not change who owns a workspace, its key or its flags.
create or replace function public.guard_workspace_update()
returns trigger language plpgsql set search_path = '' as $$
begin
  if (select auth.role()) = 'authenticated' then
    new.owner_id := old.owner_id;
    new.publishable_key := old.publishable_key;
    new.slug := old.slug;
    new.flags := old.flags;
  end if;
  return new;
end;
$$;
create trigger workspaces_guard before update on public.workspaces
  for each row execute function public.guard_workspace_update();

-- members: members read the list; owners and admins remove people;
-- nobody can remove the owner; roles change only via owners.
create policy members_select on public.workspace_members for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy members_update on public.workspace_members for update to authenticated
  using (public.has_workspace_role(workspace_id, array['owner']::public.workspace_role[]) and role <> 'owner')
  with check (public.has_workspace_role(workspace_id, array['owner']::public.workspace_role[]) and role <> 'owner');
create policy members_delete on public.workspace_members for delete to authenticated
  using (role <> 'owner' and (user_id = (select auth.uid())
    or public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[])));

-- invites: owners and admins see and revoke; created by create_invite().
create policy invites_select on public.workspace_invites for select to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]));
create policy invites_delete on public.workspace_invites for delete to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]));

-- Read-only data for members (written only by edge functions).
create policy customers_select on public.customers for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy subs_mirror_select on public.subscriptions_mirror for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy sub_changes_select on public.subscription_changes for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy invoices_select on public.invoices_mirror for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy usage_daily_select on public.usage_daily for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy risk_scores_select on public.risk_scores for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy risk_signals_select on public.risk_signals for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy risk_history_select on public.risk_score_history for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy dunning_cases_select on public.dunning_cases for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy cancel_sessions_select on public.cancel_sessions for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy winback_runs_select on public.winback_runs for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy usage_ledger_select on public.usage_ledger for select to authenticated
  using (public.is_workspace_member(workspace_id));

-- Approving a win-back run: owners and admins can move ready -> scheduled
-- (and only that; the guard below enforces it).
create policy winback_runs_update on public.winback_runs for update to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]))
  with check (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]));

create or replace function public.guard_winback_run_update()
returns trigger language plpgsql set search_path = '' as $$
begin
  if (select auth.role()) = 'authenticated' then
    if not ((old.status = 'ready' and new.status = 'scheduled') or (new.status = 'stopped' and old.status not in ('won', 'done'))) then
      raise exception 'You can only approve a ready run or stop a run.';
    end if;
    new.workspace_id := old.workspace_id; new.customer_id := old.customer_id;
    new.subscription_id := old.subscription_id; new.mrr_cents := old.mrr_cents;
    new.won_mrr_cents := old.won_mrr_cents; new.canceled_at := old.canceled_at;
    new.approved_by := (select auth.uid()); new.approved_at := now();
  end if;
  return new;
end;
$$;
create trigger winback_runs_guard before update on public.winback_runs
  for each row execute function public.guard_winback_run_update();

-- Win-back emails: members read; owners and admins edit drafts only.
create policy winback_emails_select on public.winback_emails for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy winback_emails_update on public.winback_emails for update to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]) and status = 'draft')
  with check (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]) and status = 'draft');

-- Settings that owners and admins edit (members read).
create policy dunning_settings_select on public.dunning_settings for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy dunning_settings_update on public.dunning_settings for update to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]))
  with check (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]));

create policy winback_settings_select on public.winback_settings for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy winback_settings_update on public.winback_settings for update to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]))
  with check (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]));

create policy reasons_select on public.cancel_reasons for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy reasons_insert on public.cancel_reasons for insert to authenticated
  with check (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]));
create policy reasons_update on public.cancel_reasons for update to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]))
  with check (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]));
create policy reasons_delete on public.cancel_reasons for delete to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]));

create policy offers_select on public.offers for select to authenticated
  using (public.is_workspace_member(workspace_id));
create or replace function public.offer_slots_left(ws uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select (select count(*) from public.offers o where o.workspace_id = ws)
       < (select l.offers from public.plan_limits(ws) l);
$$;

create policy offers_insert on public.offers for insert to authenticated
  with check (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[])
    and public.offer_slots_left(workspace_id));
create policy offers_update on public.offers for update to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]))
  with check (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]));
create policy offers_delete on public.offers for delete to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]));

-- The browser may never set the Stripe coupon id (only our server makes coupons).
create or replace function public.guard_offer_write()
returns trigger language plpgsql set search_path = '' as $$
begin
  if (select auth.role()) = 'authenticated' then
    if tg_op = 'INSERT' then new.coupon_id := null;
    else
      new.coupon_id := case when new.percent_off is distinct from old.percent_off
        or new.duration_months is distinct from old.duration_months then null else old.coupon_id end;
      new.workspace_id := old.workspace_id;
    end if;
  end if;
  return new;
end;
$$;
create trigger offers_guard before insert or update on public.offers
  for each row execute function public.guard_offer_write();

create policy rules_select on public.offer_rules for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy rules_insert on public.offer_rules for insert to authenticated
  with check (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[])
    and exists (select 1 from public.offers o where o.id = offer_rules.offer_id and o.workspace_id = offer_rules.workspace_id)
    and exists (select 1 from public.cancel_reasons r where r.id = offer_rules.reason_id and r.workspace_id = offer_rules.workspace_id));
create policy rules_update on public.offer_rules for update to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]))
  with check (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[])
    and exists (select 1 from public.offers o where o.id = offer_rules.offer_id and o.workspace_id = offer_rules.workspace_id)
    and exists (select 1 from public.cancel_reasons r where r.id = offer_rules.reason_id and r.workspace_id = offer_rules.workspace_id));
create policy rules_delete on public.offer_rules for delete to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]));

create policy suppressions_select on public.email_suppressions for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy suppressions_insert on public.email_suppressions for insert to authenticated
  with check (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]) and reason = 'manual');
create policy suppressions_delete on public.email_suppressions for delete to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]) and reason = 'manual');

-- Stripe connections: members read status (no tokens live here).
create policy connections_select on public.stripe_connections for select to authenticated
  using (public.is_workspace_member(workspace_id));

-- Retain's own billing: you read only your own row.
create policy subscriptions_select on public.subscriptions for select to authenticated
  using (user_id = (select auth.uid()));
create policy plan_prices_select on public.plan_prices for select to authenticated using (true);

-- Lock down functions that only the server should run.
revoke execute on function public.compute_risk(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.rollup_usage(uuid) from public, anon, authenticated;
revoke execute on function public.match_unmatched_events(uuid) from public, anon, authenticated;
revoke execute on function public.claim_jobs(integer) from public, anon, authenticated;
revoke execute on function public.finish_job(uuid) from public, anon, authenticated;
revoke execute on function public.fail_job(uuid, text) from public, anon, authenticated;
revoke execute on function public.housekeeping() from public, anon, authenticated;
revoke execute on function public.try_rate_limit(text, integer, integer) from public, anon, authenticated;
revoke execute on function public.plan_limits(uuid) from public, anon, authenticated;
revoke execute on function public.usage_this_month(uuid, public.usage_kind) from public, anon, authenticated;
revoke execute on function public.tracked_customers(uuid) from public, anon, authenticated;
revoke execute on function public.tracked_customers_all(uuid) from public, anon, authenticated;
revoke execute on function public.has_active_access(uuid) from public, anon;
revoke execute on function public.create_workspace(text, text, text, text) from public, anon;
revoke execute on function public.create_invite(uuid, text, public.workspace_role) from public, anon;
revoke execute on function public.accept_invite(text) from public, anon;
revoke execute on function public.workspace_meters(uuid) from public, anon;
revoke execute on function public.get_stripe_connections(uuid) from public, anon;
revoke execute on function public.dashboard_metrics(uuid, timestamptz) from public, anon;
grant execute on function public.compute_risk(uuid, uuid) to service_role;
grant execute on function public.rollup_usage(uuid) to service_role;
grant execute on function public.match_unmatched_events(uuid) to service_role;
grant execute on function public.claim_jobs(integer) to service_role;
grant execute on function public.finish_job(uuid) to service_role;
grant execute on function public.fail_job(uuid, text) to service_role;
grant execute on function public.housekeeping() to service_role;
grant execute on function public.try_rate_limit(text, integer, integer) to service_role;
grant execute on function public.plan_limits(uuid) to service_role;
grant execute on function public.usage_this_month(uuid, public.usage_kind) to service_role;
grant execute on function public.tracked_customers(uuid) to service_role;
grant execute on function public.tracked_customers_all(uuid) to service_role;

-- ---------------------------------------------------------------------
-- 20. STORAGE: the brand bucket (logos for emails and the cancel page)
-- ELI5: logos must load inside emails, so the bucket is public to read.
-- Only owners and admins can upload, into their own workspace folder:
-- brand/<workspace_id>/logo.png
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('brand', 'brand', true, 1048576, array['image/png', 'image/svg+xml', 'image/jpeg', 'image/webp'])
on conflict (id) do nothing;

create policy brand_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'brand' and public.is_workspace_admin_text((storage.foldername(name))[1]));
create policy brand_update on storage.objects for update to authenticated
  using (bucket_id = 'brand' and public.is_workspace_admin_text((storage.foldername(name))[1]))
  with check (bucket_id = 'brand' and public.is_workspace_admin_text((storage.foldername(name))[1]));
create policy brand_delete on storage.objects for delete to authenticated
  using (bucket_id = 'brand' and public.is_workspace_admin_text((storage.foldername(name))[1]));

-- ---------------------------------------------------------------------
-- 21. REALTIME: live import progress and new cancel sessions
-- ELI5: the browser can listen for changes to these tables and update
-- without a refresh. RLS still decides who hears what.
-- ---------------------------------------------------------------------
alter publication supabase_realtime add table public.stripe_connections;
alter publication supabase_realtime add table public.cancel_sessions;

-- ---------------------------------------------------------------------
-- 22. SCHEDULES (run this block LATER, after your edge functions are
-- deployed and CRON_SECRET is set). Replace <ref> and <CRON_SECRET>.
-- ELI5: these are alarm clocks that call our edge functions.
-- ---------------------------------------------------------------------
-- select cron.schedule('rt-sync-worker', '* * * * *', $c$
--   select net.http_post(url := 'https://<ref>.supabase.co/functions/v1/rt-sync-worker',
--     headers := '{"Content-Type":"application/json","x-cron-secret":"<CRON_SECRET>"}'::jsonb, body := '{}'::jsonb) $c$);
-- select cron.schedule('rt-email-worker', '* * * * *', $c$
--   select net.http_post(url := 'https://<ref>.supabase.co/functions/v1/rt-email-worker',
--     headers := '{"Content-Type":"application/json","x-cron-secret":"<CRON_SECRET>"}'::jsonb, body := '{}'::jsonb) $c$);
-- select cron.schedule('rt-reconcile', '*/15 * * * *', $c$
--   insert into public.jobs (workspace_id, kind, ref_id, idempotency_key)
--   select c.workspace_id, 'reconcile', c.id::text, 'reconcile:' || c.id || ':' || to_char(now(), 'YYYYMMDDHH24MI')
--   from public.stripe_connections c where c.status = 'active' on conflict do nothing $c$);
-- select cron.schedule('rt-score-nightly', '0 2 * * *', $c$
--   select net.http_post(url := 'https://<ref>.supabase.co/functions/v1/rt-score',
--     headers := '{"Content-Type":"application/json","x-cron-secret":"<CRON_SECRET>"}'::jsonb, body := '{}'::jsonb) $c$);
-- select cron.schedule('rt-explain-submit', '30 3 * * *', $c$
--   select net.http_post(url := 'https://<ref>.supabase.co/functions/v1/rt-explain',
--     headers := '{"Content-Type":"application/json","x-cron-secret":"<CRON_SECRET>"}'::jsonb, body := '{"action":"submit"}'::jsonb) $c$);
-- select cron.schedule('rt-explain-collect', '*/10 * * * *', $c$
--   select net.http_post(url := 'https://<ref>.supabase.co/functions/v1/rt-explain',
--     headers := '{"Content-Type":"application/json","x-cron-secret":"<CRON_SECRET>"}'::jsonb, body := '{"action":"collect"}'::jsonb) $c$);
-- select cron.schedule('rt-housekeeping', '15 4 * * *', $c$ select public.housekeeping() $c$);
`
