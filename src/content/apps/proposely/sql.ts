// Proposely single migration, pasted into the Supabase SQL editor once on a fresh project.

export const sql = `-- =====================================================================
-- Proposely: full database migration
-- Paste this whole file into Supabase > SQL Editor > New query > Run.
-- Run it ONCE on a fresh project. Order: extensions, enums, tables,
-- helper functions, triggers, RLS policies, views, storage, realtime.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. EXTENSIONS
-- ELI5: extensions are add-ons for the database. pgcrypto gives us
-- secure random bytes and SHA-256 hashing for share tokens.
-- ---------------------------------------------------------------------
create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------
-- 1. ENUMS
-- ELI5: an enum is a fixed list of allowed words for a column. A call
-- can be 'transcribing' or 'drafted', never 'banana'.
-- ---------------------------------------------------------------------
create type public.workspace_role as enum ('owner', 'admin', 'member');
create type public.call_source as enum ('upload', 'browser', 'zoom', 'meet', 'bot');
create type public.call_status as enum ('uploading', 'queued', 'transcribing', 'transcribed',
  'extracting', 'brief_ready', 'drafting', 'drafted', 'failed');
create type public.proposal_status as enum ('draft', 'sent', 'viewed', 'signed', 'paid', 'lost', 'expired');
create type public.section_kind as enum ('exec_summary', 'problem', 'solution', 'scope', 'timeline',
  'pricing', 'terms', 'next_steps', 'custom');
create type public.option_tier as enum ('good', 'better', 'best');
create type public.job_kind as enum ('fetch_transcript', 'extract_brief', 'draft_proposal', 'import_recording');
create type public.job_status as enum ('queued', 'running', 'done', 'dead');
create type public.deposit_status as enum ('pending', 'paid', 'expired', 'refunded');
create type public.integration_provider as enum ('stripe', 'zoom', 'google');
create type public.integration_status as enum ('active', 'disconnected', 'error');
create type public.usage_kind as enum ('call_minutes', 'extractions', 'drafts', 'rewrites', 'bot_minutes');
create type public.service_unit as enum ('project', 'month', 'hour', 'day', 'item');

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
  full_name text not null default '',
  avatar_url text,
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
-- ELI5: a workspace is the agency. Members are the people in it. The
-- owner's subscription pays for everyone in the workspace.
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
-- ELI5: these are the bouncers. "Is this person in this agency?" and
-- "Is this person an owner or admin here?". security definer lets them
-- look at the members table without tripping over its own RLS.
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

create or replace function public.shares_workspace_with(other uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.workspace_members a
    join public.workspace_members b on b.workspace_id = a.workspace_id
    where a.user_id = (select auth.uid()) and b.user_id = other
  );
$$;

-- ---------------------------------------------------------------------
-- 6. BRAND KIT, SERVICE CATALOGUE, PRICING RULES
-- ELI5: the agency's look (logo, colours) and its price list. The AI is
-- only allowed to price proposals from this list.
-- ---------------------------------------------------------------------
create table public.brand_kits (
  workspace_id uuid primary key references public.workspaces (id) on delete cascade,
  logo_path text,
  cover_path text,
  primary_hex text not null default '#B45309' check (primary_hex ~ '^#[0-9A-Fa-f]{6}$'),
  accent_hex text not null default '#FDE7C7' check (accent_hex ~ '^#[0-9A-Fa-f]{6}$'),
  font_pair text not null default 'inter-fraunces',
  sender_name text not null default '',
  footer_text text not null default '',
  voice_notes text not null default '' check (char_length(voice_notes) <= 2000),
  updated_at timestamptz not null default now()
);
create trigger brand_kits_updated_at before update on public.brand_kits
  for each row execute function public.set_updated_at();

create table public.services (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  name text not null check (char_length(name) between 2 and 120),
  description text not null default '' check (char_length(description) <= 1000),
  unit public.service_unit not null default 'project',
  price_cents integer not null check (price_cents >= 0),
  min_qty numeric not null default 1 check (min_qty > 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index services_ws_idx on public.services (workspace_id);
create trigger services_updated_at before update on public.services
  for each row execute function public.set_updated_at();

create table public.pricing_rules (
  workspace_id uuid primary key references public.workspaces (id) on delete cascade,
  currency text not null default 'usd' check (currency ~ '^[a-z]{3}$'),
  min_project_cents integer not null default 0 check (min_project_cents >= 0),
  deposit_pct numeric not null default 30 check (deposit_pct between 0 and 100),
  rush_fee_pct numeric not null default 0 check (rush_fee_pct between 0 and 100),
  annual_discount_pct numeric not null default 0 check (annual_discount_pct between 0 and 100),
  payment_terms_days integer not null default 14 check (payment_terms_days between 0 and 120),
  validity_days integer not null default 30 check (validity_days between 1 and 365),
  tax_note text not null default '',
  extra_rules text not null default '' check (char_length(extra_rules) <= 2000),
  updated_at timestamptz not null default now()
);
create trigger pricing_rules_updated_at before update on public.pricing_rules
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- 7. CALLS, TRANSCRIPTS, BRIEFS
-- ELI5: a call is one recorded sales conversation. The transcript is the
-- words. The brief is what the AI pulled out: goals, pains, budget.
-- ---------------------------------------------------------------------
create table public.calls (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  created_by uuid references auth.users (id) on delete set null,
  title text not null default 'Discovery call',
  client_name text not null default '',
  client_company text not null default '',
  source public.call_source not null default 'upload',
  storage_path text,
  duration_sec integer check (duration_sec >= 0),
  status public.call_status not null default 'uploading',
  assemblyai_id text unique,
  auto_draft boolean not null default true,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index calls_ws_created_idx on public.calls (workspace_id, created_at desc);
create index calls_created_by_idx on public.calls (created_by);
create trigger calls_updated_at before update on public.calls
  for each row execute function public.set_updated_at();

create table public.transcripts (
  call_id uuid primary key references public.calls (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  text text not null,
  utterances jsonb not null default '[]'::jsonb,
  language text,
  word_count integer not null default 0,
  created_at timestamptz not null default now()
);
create index transcripts_ws_idx on public.transcripts (workspace_id);

create table public.call_briefs (
  call_id uuid primary key references public.calls (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  brief jsonb not null,
  confirmed_at timestamptz,
  confirmed_by uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now()
);
create index call_briefs_ws_idx on public.call_briefs (workspace_id);
create index call_briefs_confirmed_by_idx on public.call_briefs (confirmed_by);
create trigger call_briefs_updated_at before update on public.call_briefs
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- 8. TEMPLATES AND PROPOSALS
-- ELI5: a proposal is made of sections (exec summary, scope...) and
-- three price options. Sending freezes a copy (a "version") that the
-- client sees and signs. Frozen copies can never change.
-- ---------------------------------------------------------------------
create table public.templates (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  created_by uuid references auth.users (id) on delete set null,
  name text not null check (char_length(name) between 2 and 120),
  description text not null default '',
  sections jsonb not null default '[]'::jsonb,
  pricing jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index templates_ws_idx on public.templates (workspace_id);
create index templates_created_by_idx on public.templates (created_by);
create trigger templates_updated_at before update on public.templates
  for each row execute function public.set_updated_at();

create table public.proposals (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  call_id uuid references public.calls (id) on delete set null,
  template_id uuid references public.templates (id) on delete set null,
  created_by uuid references auth.users (id) on delete set null,
  title text not null default 'Proposal',
  client_name text not null default '',
  client_email text,
  client_company text not null default '',
  status public.proposal_status not null default 'draft',
  currency text not null default 'usd',
  selected_option public.option_tier,
  value_cents integer not null default 0,
  deposit_cents integer not null default 0,
  follow_up_enabled boolean not null default true,
  has_unsent_changes boolean not null default false,
  first_sent_at timestamptz,
  first_viewed_at timestamptz,
  signed_at timestamptz,
  paid_at timestamptz,
  lost_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index proposals_call_unique_idx on public.proposals (call_id) where call_id is not null;
create index proposals_ws_status_idx on public.proposals (workspace_id, status);
create index proposals_ws_sent_idx on public.proposals (workspace_id, first_sent_at desc);
create index proposals_template_idx on public.proposals (template_id);
create index proposals_created_by_idx on public.proposals (created_by);
create trigger proposals_updated_at before update on public.proposals
  for each row execute function public.set_updated_at();

create table public.proposal_sections (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references public.proposals (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  kind public.section_kind not null,
  position integer not null,
  title text not null default '',
  body jsonb not null default '[]'::jsonb check (jsonb_typeof(body) = 'array'),
  updated_at timestamptz not null default now()
);
create index proposal_sections_proposal_idx on public.proposal_sections (proposal_id, position);
create index proposal_sections_ws_idx on public.proposal_sections (workspace_id);
create trigger proposal_sections_updated_at before update on public.proposal_sections
  for each row execute function public.set_updated_at();

create table public.pricing_options (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references public.proposals (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  tier public.option_tier not null,
  name text not null default '',
  summary text not null default '',
  line_items jsonb not null default '[]'::jsonb check (jsonb_typeof(line_items) = 'array'),
  total_cents integer not null default 0 check (total_cents >= 0),
  recommended boolean not null default false,
  unique (proposal_id, tier)
);
create index pricing_options_ws_idx on public.pricing_options (workspace_id);

create table public.proposal_versions (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references public.proposals (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  version_no integer not null,
  snapshot jsonb not null,
  content_hash text not null check (content_hash ~ '^[0-9a-f]{64}$'),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (proposal_id, version_no)
);
create index proposal_versions_ws_idx on public.proposal_versions (workspace_id);
create index proposal_versions_created_by_idx on public.proposal_versions (created_by);

create table public.share_links (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references public.proposals (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  version_id uuid not null references public.proposal_versions (id) on delete cascade,
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '60 days',
  revoked_at timestamptz
);
create index share_links_proposal_idx on public.share_links (proposal_id);
create index share_links_ws_idx on public.share_links (workspace_id);
create index share_links_version_idx on public.share_links (version_id);

-- ---------------------------------------------------------------------
-- 9. VIEW TRACKING
-- ELI5: when the client opens the link we note the visit, and the page
-- reports how many seconds they spent on each section.
-- ---------------------------------------------------------------------
create table public.proposal_views (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references public.proposals (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  share_link_id uuid references public.share_links (id) on delete set null,
  session_id text not null,
  ip_hash text,
  user_agent text,
  device text,
  started_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  unique (share_link_id, session_id)
);
create index proposal_views_proposal_idx on public.proposal_views (proposal_id, started_at desc);
create index proposal_views_ws_idx on public.proposal_views (workspace_id);

create table public.section_view_events (
  id bigint generated always as identity primary key,
  view_id uuid not null references public.proposal_views (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  section_kind public.section_kind not null,
  seconds integer not null check (seconds between 1 and 120),
  created_at timestamptz not null default now()
);
create index section_view_events_view_idx on public.section_view_events (view_id);
create index section_view_events_ws_idx on public.section_view_events (workspace_id);

-- ---------------------------------------------------------------------
-- 10. SIGNATURES AND DEPOSITS
-- ELI5: a signature row is the evidence: who, when, from which IP, and
-- a fingerprint (hash) of exactly what they signed. If anyone changed
-- one comma later, the fingerprint would not match.
-- ---------------------------------------------------------------------
create table public.signatures (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null unique references public.proposals (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  version_id uuid not null references public.proposal_versions (id) on delete cascade,
  signer_name text not null check (char_length(signer_name) between 2 and 120),
  signer_email text not null check (position('@' in signer_email) > 1),
  signer_title text,
  typed_signature text not null check (char_length(typed_signature) between 2 and 120),
  drawn_path text not null,
  drawn_sha256 text not null check (drawn_sha256 ~ '^[0-9a-f]{64}$'),
  selected_option public.option_tier not null,
  content_hash text not null check (content_hash ~ '^[0-9a-f]{64}$'),
  ip inet,
  user_agent text,
  verify_token_hash text not null unique,
  signed_at timestamptz not null default now()
);
create index signatures_ws_idx on public.signatures (workspace_id);
create index signatures_version_idx on public.signatures (version_id);

create table public.deposits (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null unique references public.proposals (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  amount_cents integer not null check (amount_cents > 0),
  currency text not null,
  stripe_account_id text not null,
  checkout_session_id text unique,
  checkout_created_at timestamptz,
  payment_intent_id text,
  status public.deposit_status not null default 'pending',
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index deposits_ws_idx on public.deposits (workspace_id);
create trigger deposits_updated_at before update on public.deposits
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- 11. INTEGRATIONS (Stripe payouts, Zoom, Google Meet)
-- ELI5: the public half (connected or not) is readable by the team.
-- The secret half (tokens) is in a table nobody but the server can read.
-- ---------------------------------------------------------------------
create table public.integrations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  provider public.integration_provider not null,
  external_account_id text,
  display_name text,
  status public.integration_status not null default 'active',
  connected_by uuid references auth.users (id) on delete set null,
  connected_at timestamptz not null default now(),
  unique (workspace_id, provider)
);
create index integrations_connected_by_idx on public.integrations (connected_by);

create table public.integration_tokens (
  integration_id uuid primary key references public.integrations (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  refresh_token_encrypted text,
  access_token_encrypted text,
  expires_at timestamptz,
  updated_at timestamptz not null default now()
);
create index integration_tokens_ws_idx on public.integration_tokens (workspace_id);

-- ---------------------------------------------------------------------
-- 12. JOBS QUEUE, USAGE LEDGER, EMAIL LOG, RATE LIMITS
-- ELI5: jobs is the to-do list the background worker works through.
-- usage_ledger is the meter: every paid AI call writes a line here so
-- nobody can spend more than their plan allows.
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

create table public.email_log (
  id bigint generated always as identity primary key,
  workspace_id uuid references public.workspaces (id) on delete cascade,
  proposal_id uuid references public.proposals (id) on delete cascade,
  kind text not null,
  dedupe_key text unique,
  to_email text not null,
  resend_id text,
  status text not null default 'queued',
  created_at timestamptz not null default now()
);
create index email_log_ws_idx on public.email_log (workspace_id, created_at desc);
create index email_log_proposal_idx on public.email_log (proposal_id);

create table public.email_suppressions (
  email text primary key,
  reason text not null,
  created_at timestamptz not null default now()
);

create table public.notification_prefs (
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  on_view boolean not null default true,
  on_sign boolean not null default true,
  on_pay boolean not null default true,
  daily_digest boolean not null default false,
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
-- 13. BILLING (written only by Stripe webhooks with the secret key)
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

-- Which Stripe price is which plan. After you create prices in Stripe,
-- run: insert into public.plan_prices values ('price_...', 'solo'), ...
create table public.plan_prices (
  price_id text primary key,
  plan text not null check (plan in ('solo', 'studio', 'agency'))
);

-- Test-only limit overrides. No policies: only you, in the SQL editor.
create table public.workspace_limit_overrides (
  workspace_id uuid primary key references public.workspaces (id) on delete cascade,
  drafts integer,
  call_minutes integer,
  rewrites integer,
  seats integer
);

-- ---------------------------------------------------------------------
-- 14. ACCESS AND LIMIT FUNCTIONS
-- ELI5: has_active_access is the paywall: the owner's trial or paid
-- plan keeps the whole workspace open. plan_limits returns the numbers
-- from the PRD. usage_this_month adds up the meter.
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
returns table (plan text, seats integer, drafts integer, call_minutes integer, max_call_minutes integer,
               rewrites integer, templates integer, bot_minutes integer, imports boolean, remove_footer boolean)
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

  if v_plan = 'agency' then
    plan := 'agency'; seats := 10; drafts := 50; call_minutes := 3000; max_call_minutes := 180;
    rewrites := 500; templates := 1000; bot_minutes := 600; imports := true; remove_footer := true;
  elsif v_plan = 'studio' then
    plan := 'studio'; seats := 3; drafts := 25; call_minutes := 1500; max_call_minutes := 120;
    rewrites := 250; templates := 1000; bot_minutes := 0; imports := true; remove_footer := true;
  else
    plan := 'solo'; seats := 1; drafts := 10; call_minutes := 600; max_call_minutes := 90;
    rewrites := 100; templates := 5; bot_minutes := 0; imports := false; remove_footer := false;
  end if;

  -- A 7 day trial can draft at most 3 proposals from calls.
  if v_status = 'trialing' then drafts := least(drafts, 3); end if;

  select * into o from public.workspace_limit_overrides where workspace_id = ws;
  if found then
    drafts := coalesce(o.drafts, drafts);
    call_minutes := coalesce(o.call_minutes, call_minutes);
    rewrites := coalesce(o.rewrites, rewrites);
    seats := coalesce(o.seats, seats);
  end if;
  return next;
end;
$$;

create or replace function public.usage_this_month(ws uuid, k public.usage_kind)
returns numeric language sql stable security definer set search_path = '' as $$
  select coalesce(sum(quantity), 0) from public.usage_ledger
  where workspace_id = ws and kind = k and created_at >= date_trunc('month', now());
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
-- 15. WORKSPACE AND INVITE FUNCTIONS (called from the app)
-- ELI5: creating a workspace and joining one happen inside the
-- database in one step, so seats and roles can never be skipped.
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
  insert into public.brand_kits (workspace_id, sender_name) values (v_ws, p_name);
  insert into public.pricing_rules (workspace_id) values (v_ws);
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

-- ---------------------------------------------------------------------
-- 16. WORKER FUNCTIONS (edge functions only, secret key)
-- ELI5: claim_jobs hands the worker a few to-dos and marks them "mine"
-- so two workers never grab the same one. record_signature saves a
-- signature and locks the proposal in one go.
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

create or replace function public.record_signature(
  p_proposal uuid, p_version uuid, p_signer_name text, p_signer_email text, p_signer_title text,
  p_typed text, p_drawn_path text, p_drawn_sha256 text, p_option public.option_tier,
  p_content_hash text, p_ip inet, p_user_agent text, p_verify_token_hash text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_prop public.proposals;
  v_hash text;
  v_value integer;
  v_pct numeric;
  v_sig uuid;
begin
  select * into v_prop from public.proposals where id = p_proposal for update;
  if not found then raise exception 'not_found'; end if;
  if v_prop.status not in ('sent', 'viewed') then raise exception 'not_signable'; end if;
  select content_hash into v_hash from public.proposal_versions
  where id = p_version and proposal_id = p_proposal;
  if v_hash is null or v_hash <> p_content_hash then raise exception 'changed'; end if;

  select (o -> 'total_cents')::integer into v_value
  from public.proposal_versions v, jsonb_array_elements(v.snapshot -> 'options') o
  where v.id = p_version and o ->> 'tier' = p_option::text;
  select deposit_pct into v_pct from public.pricing_rules where workspace_id = v_prop.workspace_id;

  insert into public.signatures (proposal_id, workspace_id, version_id, signer_name, signer_email,
    signer_title, typed_signature, drawn_path, drawn_sha256, selected_option, content_hash, ip,
    user_agent, verify_token_hash)
  values (p_proposal, v_prop.workspace_id, p_version, p_signer_name, lower(p_signer_email),
    p_signer_title, p_typed, p_drawn_path, p_drawn_sha256, p_option, p_content_hash, p_ip,
    p_user_agent, p_verify_token_hash)
  returning id into v_sig;

  update public.proposals set status = 'signed', signed_at = now(), selected_option = p_option,
    value_cents = coalesce(v_value, 0),
    deposit_cents = round(coalesce(v_value, 0) * coalesce(v_pct, 0) / 100.0)::integer
  where id = p_proposal;
  return v_sig;
end;
$$;

-- Workers and webhooks only. The browser can never call these.
revoke execute on function public.claim_jobs(integer) from public, anon, authenticated;
revoke execute on function public.release_stuck_jobs() from public, anon, authenticated;
revoke execute on function public.record_signature(uuid, uuid, text, text, text, text, text, text,
  public.option_tier, text, inet, text, text) from public, anon, authenticated;
revoke execute on function public.try_rate_limit(text, integer, integer) from public, anon, authenticated;
revoke execute on function public.create_workspace(text) from public, anon;
revoke execute on function public.create_invite(uuid, text, public.workspace_role) from public, anon;
revoke execute on function public.accept_invite(text) from public, anon;

-- ---------------------------------------------------------------------
-- 17. GUARD TRIGGERS (the rules the browser cannot break)
-- ELI5: RLS decides WHICH rows you can touch. These triggers decide
-- WHICH COLUMNS. A team member can rename a call but cannot mark it
-- transcribed, and nobody can edit a signed proposal.
-- ---------------------------------------------------------------------
create or replace function public.guard_call_columns()
returns trigger language plpgsql set search_path = '' as $$
begin
  if current_user in ('authenticated', 'anon') then
    if new.status is distinct from old.status
       or new.assemblyai_id is distinct from old.assemblyai_id
       or new.duration_sec is distinct from old.duration_sec
       or new.storage_path is distinct from old.storage_path
       or new.workspace_id is distinct from old.workspace_id
       or new.error is distinct from old.error then
      raise exception 'these call fields are set by Proposely';
    end if;
  end if;
  return new;
end;
$$;
create trigger calls_guard before update on public.calls
  for each row execute function public.guard_call_columns();

create or replace function public.guard_proposal_columns()
returns trigger language plpgsql set search_path = '' as $$
begin
  if current_user in ('authenticated', 'anon') then
    if old.status in ('signed', 'paid') then
      raise exception 'signed proposals cannot be changed';
    end if;
    if new.workspace_id is distinct from old.workspace_id
       or new.signed_at is distinct from old.signed_at
       or new.paid_at is distinct from old.paid_at
       or new.first_sent_at is distinct from old.first_sent_at
       or new.first_viewed_at is distinct from old.first_viewed_at
       or new.deposit_cents is distinct from old.deposit_cents
       or new.selected_option is distinct from old.selected_option then
      raise exception 'these proposal fields are set by Proposely';
    end if;
    if new.status is distinct from old.status
       and not (new.status = 'lost' or (old.status = 'lost' and new.status = 'draft')) then
      raise exception 'status changes happen through Send, Sign and Pay';
    end if;
  end if;
  return new;
end;
$$;
create trigger proposals_guard before update on public.proposals
  for each row execute function public.guard_proposal_columns();

-- Members may only create draft proposals.
create or replace function public.guard_proposal_insert()
returns trigger language plpgsql set search_path = '' as $$
begin
  if current_user in ('authenticated', 'anon') and new.status <> 'draft' then
    raise exception 'new proposals start as drafts';
  end if;
  return new;
end;
$$;
create trigger proposals_guard_insert before insert on public.proposals
  for each row execute function public.guard_proposal_insert();

-- Sections and options of a signed proposal are frozen. Editing a sent
-- proposal flags "unsent changes" (the client still sees the sent version).
create or replace function public.lock_signed_children()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_pid uuid := coalesce(new.proposal_id, old.proposal_id);
  v_status public.proposal_status;
begin
  select status into v_status from public.proposals where id = v_pid;
  if v_status in ('signed', 'paid') and current_setting('proposely.allow_delete', true) is distinct from 'on' then
    raise exception 'signed proposals cannot be changed';
  end if;
  if v_status in ('sent', 'viewed') then
    update public.proposals set has_unsent_changes = true where id = v_pid and not has_unsent_changes;
  end if;
  return coalesce(new, old);
end;
$$;
create trigger proposal_sections_lock before insert or update or delete on public.proposal_sections
  for each row execute function public.lock_signed_children();
create trigger pricing_options_lock before insert or update or delete on public.pricing_options
  for each row execute function public.lock_signed_children();

-- Signatures and sent versions can never be edited. Deleting is only
-- possible when you deliberately switch it on for account deletion:
--   set proposely.allow_delete = 'on'; delete from public.workspaces where id = '...';
create or replace function public.block_evidence_changes()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'UPDATE' then
    raise exception '% are immutable', tg_table_name;
  end if;
  if tg_op = 'DELETE' and current_setting('proposely.allow_delete', true) is distinct from 'on' then
    raise exception '% are immutable', tg_table_name;
  end if;
  return old;
end;
$$;
create trigger signatures_immutable before update or delete on public.signatures
  for each row execute function public.block_evidence_changes();
create trigger proposal_versions_immutable before update or delete on public.proposal_versions
  for each row execute function public.block_evidence_changes();

create or replace function public.guard_share_link_columns()
returns trigger language plpgsql set search_path = '' as $$
begin
  if current_user in ('authenticated', 'anon') then
    if new.token_hash is distinct from old.token_hash
       or new.version_id is distinct from old.version_id
       or new.proposal_id is distinct from old.proposal_id
       or new.workspace_id is distinct from old.workspace_id then
      raise exception 'only revoked_at and expires_at can change';
    end if;
  end if;
  return new;
end;
$$;
create trigger share_links_guard before update on public.share_links
  for each row execute function public.guard_share_link_columns();

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
alter table public.services enable row level security;
alter table public.pricing_rules enable row level security;
alter table public.calls enable row level security;
alter table public.transcripts enable row level security;
alter table public.call_briefs enable row level security;
alter table public.templates enable row level security;
alter table public.proposals enable row level security;
alter table public.proposal_sections enable row level security;
alter table public.pricing_options enable row level security;
alter table public.proposal_versions enable row level security;
alter table public.share_links enable row level security;
alter table public.proposal_views enable row level security;
alter table public.section_view_events enable row level security;
alter table public.signatures enable row level security;
alter table public.deposits enable row level security;
alter table public.integrations enable row level security;
alter table public.integration_tokens enable row level security;
alter table public.jobs enable row level security;
alter table public.usage_ledger enable row level security;
alter table public.email_log enable row level security;
alter table public.email_suppressions enable row level security;
alter table public.notification_prefs enable row level security;
alter table public.rate_limits enable row level security;
alter table public.subscriptions enable row level security;
alter table public.stripe_events enable row level security;
alter table public.connect_events enable row level security;
alter table public.plan_prices enable row level security;
alter table public.workspace_limit_overrides enable row level security;

-- Belt and braces: anonymous visitors get no table access at all.
-- The public share page goes through the pr-public-proposal edge function.
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
  with check (role in ('admin', 'member'));
create policy "members delete admin or self" on public.workspace_members for delete to authenticated
  using (role <> 'owner' and (
    public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[])
    or user_id = (select auth.uid())));

-- Invites: created through create_invite(); owner/admin can see and revoke.
create policy "invites select admin" on public.workspace_invites for select to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]));
create policy "invites delete admin" on public.workspace_invites for delete to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]));

-- Brand kit and pricing rules: everyone reads, owner/admin edit.
create policy "brand select member" on public.brand_kits for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy "brand insert admin" on public.brand_kits for insert to authenticated
  with check (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]));
create policy "brand update admin" on public.brand_kits for update to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]))
  with check (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]));
create policy "brand delete owner" on public.brand_kits for delete to authenticated
  using (public.has_workspace_role(workspace_id, array['owner']::public.workspace_role[]));

create policy "rules select member" on public.pricing_rules for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy "rules insert admin" on public.pricing_rules for insert to authenticated
  with check (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]));
create policy "rules update admin" on public.pricing_rules for update to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]))
  with check (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]));
create policy "rules delete owner" on public.pricing_rules for delete to authenticated
  using (public.has_workspace_role(workspace_id, array['owner']::public.workspace_role[]));

create policy "services select member" on public.services for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy "services insert admin" on public.services for insert to authenticated
  with check (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]));
create policy "services update admin" on public.services for update to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]))
  with check (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]));
create policy "services delete admin" on public.services for delete to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]));

-- Calls: members create (as themselves, status uploading) and rename;
-- the guard trigger stops them touching status. Creator or admin deletes.
create policy "calls select member" on public.calls for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy "calls insert member" on public.calls for insert to authenticated
  with check (public.is_workspace_member(workspace_id) and created_by = (select auth.uid())
              and status = 'uploading');
create policy "calls update member" on public.calls for update to authenticated
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));
create policy "calls delete creator or admin" on public.calls for delete to authenticated
  using (created_by = (select auth.uid())
         or public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]));

-- Transcripts: read only. Written by the worker.
create policy "transcripts select member" on public.transcripts for select to authenticated
  using (public.is_workspace_member(workspace_id));

-- Briefs: written by the worker, corrected and confirmed by members.
create policy "briefs select member" on public.call_briefs for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy "briefs update member" on public.call_briefs for update to authenticated
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));

-- Templates.
create policy "templates select member" on public.templates for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy "templates insert member" on public.templates for insert to authenticated
  with check (public.is_workspace_member(workspace_id) and created_by = (select auth.uid()));
create policy "templates update creator or admin" on public.templates for update to authenticated
  using (created_by = (select auth.uid())
         or public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]))
  with check (public.is_workspace_member(workspace_id));
create policy "templates delete creator or admin" on public.templates for delete to authenticated
  using (created_by = (select auth.uid())
         or public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]));

-- Proposals: members create drafts and edit; guard trigger protects status.
create policy "proposals select member" on public.proposals for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy "proposals insert member" on public.proposals for insert to authenticated
  with check (public.is_workspace_member(workspace_id) and created_by = (select auth.uid()));
create policy "proposals update member" on public.proposals for update to authenticated
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));
-- Only never-sent drafts can be deleted. Sent ones are marked lost instead,
-- because their frozen versions are evidence.
create policy "proposals delete creator or admin" on public.proposals for delete to authenticated
  using (status = 'draft' and first_sent_at is null and (created_by = (select auth.uid())
         or public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[])));

create policy "sections select member" on public.proposal_sections for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy "sections insert member" on public.proposal_sections for insert to authenticated
  with check (public.is_workspace_member(workspace_id)
              and exists (select 1 from public.proposals p where p.id = proposal_id and p.workspace_id = proposal_sections.workspace_id));
create policy "sections update member" on public.proposal_sections for update to authenticated
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));
create policy "sections delete member" on public.proposal_sections for delete to authenticated
  using (public.is_workspace_member(workspace_id) and kind <> 'pricing');

create policy "options select member" on public.pricing_options for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy "options insert member" on public.pricing_options for insert to authenticated
  with check (public.is_workspace_member(workspace_id)
              and exists (select 1 from public.proposals p where p.id = proposal_id and p.workspace_id = pricing_options.workspace_id));
create policy "options update member" on public.pricing_options for update to authenticated
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));
create policy "options delete member" on public.pricing_options for delete to authenticated
  using (public.is_workspace_member(workspace_id));

-- Frozen versions, views, signatures, deposits, jobs, usage, emails:
-- members read; only edge functions (secret key) write.
create policy "versions select member" on public.proposal_versions for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy "links select member" on public.share_links for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy "links update member" on public.share_links for update to authenticated
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));
create policy "views select member" on public.proposal_views for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy "section events select member" on public.section_view_events for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy "signatures select member" on public.signatures for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy "deposits select member" on public.deposits for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy "jobs select member" on public.jobs for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy "usage select member" on public.usage_ledger for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy "email log select member" on public.email_log for select to authenticated
  using (public.is_workspace_member(workspace_id));

-- Integrations: team sees status; owner/admin disconnect. Tokens: no policies.
create policy "integrations select member" on public.integrations for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy "integrations delete admin" on public.integrations for delete to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]));

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

-- No policies on purpose (server only): integration_tokens, email_suppressions,
-- rate_limits, stripe_events, connect_events, workspace_limit_overrides.

-- ---------------------------------------------------------------------
-- 19. ANALYTICS VIEW (obeys the caller's RLS)
-- ELI5: one row per proposal with the numbers the Analytics page needs.
-- security_invoker means it only shows rows you are allowed to see.
-- ---------------------------------------------------------------------
create or replace view public.proposal_stats with (security_invoker = true) as
select
  p.id, p.workspace_id, p.created_by, p.status, p.value_cents, p.selected_option,
  p.first_sent_at, p.first_viewed_at, p.signed_at, p.paid_at,
  (p.status in ('signed', 'paid')) as won,
  extract(epoch from (p.signed_at - p.first_sent_at)) / 86400.0 as days_to_sign,
  extract(epoch from (p.first_viewed_at - p.first_sent_at)) / 3600.0 as hours_to_first_view,
  (select count(*) from public.proposal_views v where v.proposal_id = p.id) as view_count
from public.proposals p
where p.first_sent_at is not null;

-- ---------------------------------------------------------------------
-- 20. STORAGE BUCKETS + POLICIES
-- ELI5: three private folders. call-audio holds recordings, brand-assets
-- holds logos, signatures holds signature drawings. Files sit under a
-- folder named after the workspace id, and only members get in.
-- Free plan caps each upload at 50 MB. On Pro, raise the global limit:
-- Storage > Settings > Upload file size limit > 1 GB.
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('call-audio', 'call-audio', false, 1073741824,
    array['audio/mpeg', 'audio/mp4', 'audio/x-m4a', 'audio/wav', 'audio/x-wav', 'audio/webm',
          'audio/ogg', 'video/mp4', 'video/quicktime', 'video/webm']),
  ('brand-assets', 'brand-assets', false, 5242880,
    array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']),
  ('signatures', 'signatures', false, 512000, array['image/png'])
on conflict (id) do nothing;

create policy "call audio select member" on storage.objects for select to authenticated
  using (bucket_id = 'call-audio' and public.is_workspace_member_text((storage.foldername(name))[1]));
create policy "call audio insert member" on storage.objects for insert to authenticated
  with check (bucket_id = 'call-audio' and public.is_workspace_member_text((storage.foldername(name))[1]));
create policy "call audio update member" on storage.objects for update to authenticated
  using (bucket_id = 'call-audio' and public.is_workspace_member_text((storage.foldername(name))[1]))
  with check (bucket_id = 'call-audio' and public.is_workspace_member_text((storage.foldername(name))[1]));
create policy "call audio delete member" on storage.objects for delete to authenticated
  using (bucket_id = 'call-audio' and public.is_workspace_member_text((storage.foldername(name))[1]));

create policy "brand assets select member" on storage.objects for select to authenticated
  using (bucket_id = 'brand-assets' and public.is_workspace_member_text((storage.foldername(name))[1]));
create policy "brand assets insert member" on storage.objects for insert to authenticated
  with check (bucket_id = 'brand-assets' and public.is_workspace_member_text((storage.foldername(name))[1]));
create policy "brand assets update member" on storage.objects for update to authenticated
  using (bucket_id = 'brand-assets' and public.is_workspace_member_text((storage.foldername(name))[1]))
  with check (bucket_id = 'brand-assets' and public.is_workspace_member_text((storage.foldername(name))[1]));
create policy "brand assets delete member" on storage.objects for delete to authenticated
  using (bucket_id = 'brand-assets' and public.is_workspace_member_text((storage.foldername(name))[1]));

-- Signatures: members can view; only edge functions (secret key) upload.
create policy "signatures select member" on storage.objects for select to authenticated
  using (bucket_id = 'signatures' and public.is_workspace_member_text((storage.foldername(name))[1]));

-- ---------------------------------------------------------------------
-- 21. REALTIME
-- ELI5: lets the Calls page and the editor update live as the worker
-- moves a call from "Transcribing" to "Drafted", with no refresh.
-- ---------------------------------------------------------------------
alter publication supabase_realtime add table public.calls;
alter publication supabase_realtime add table public.proposals;

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
-- select cron.schedule('pr-draft-worker', '* * * * *',    $$ select public.invoke_edge('pr-draft-worker') $$);
-- select cron.schedule('pr-reminders',    '*/15 * * * *', $$ select public.invoke_edge('pr-reminders') $$);
--
-- Check it ran: select * from cron.job_run_details order by start_time desc limit 20;
`
