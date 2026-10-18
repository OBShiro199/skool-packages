// Tally single migration, pasted into the Supabase SQL editor once on a fresh project.

export const sql = `-- =====================================================================
-- Tally: full database migration
-- Paste this whole file into Supabase > SQL Editor > New query > Run.
-- Run it ONCE on a fresh project. Order: extensions, enums, tables,
-- helper functions, money triggers, worker functions, guard triggers,
-- RLS policies, views, storage, realtime, schedules.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. EXTENSIONS
-- ELI5: extensions are add-ons for the database. pgcrypto gives us
-- secure random bytes and SHA-256 hashing for invite tokens.
-- ---------------------------------------------------------------------
create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------
-- 1. ENUMS
-- ELI5: an enum is a fixed list of allowed words for a column. An
-- invoice can be 'sent' or 'paid', never 'banana'.
-- ---------------------------------------------------------------------
create type public.workspace_role as enum ('owner', 'admin', 'member');
create type public.invoice_status as enum ('draft', 'scheduled', 'sent', 'viewed', 'partially_paid', 'paid',
  'void', 'uncollectible');
create type public.invoice_kind as enum ('standard', 'deposit', 'recurring');
create type public.line_kind as enum ('item', 'late_fee', 'deposit_credit');
create type public.sequence_state as enum ('active', 'paused_reply', 'paused_promise', 'paused_manual',
  'paused_dispute', 'paused_bounce', 'completed', 'stopped');
create type public.payment_status as enum ('pending', 'processing', 'succeeded', 'failed', 'expired',
  'refunded', 'partially_refunded');
create type public.payment_method as enum ('card', 'us_bank_account', 'sepa_debit', 'bacs_debit',
  'customer_balance', 'bank_transfer', 'cheque', 'cash', 'other', 'unknown');
create type public.payment_source as enum ('stripe', 'manual');
create type public.reminder_tone as enum ('heads_up', 'friendly', 'nudge', 'firm', 'final');
create type public.reminder_send_status as enum ('scheduled', 'sent', 'skipped', 'cancelled');
create type public.reply_intent as enum ('promise_to_pay', 'paid_already', 'dispute', 'question',
  'out_of_office', 'other', 'unread');
create type public.domain_status as enum ('not_started', 'pending', 'verified', 'failed', 'temporary_failure');
create type public.recurring_frequency as enum ('weekly', 'monthly', 'quarterly', 'yearly');
create type public.recurring_status as enum ('active', 'paused', 'ended');
create type public.late_fee_kind as enum ('fixed', 'percent');
create type public.late_fee_repeat as enum ('once', 'monthly');
create type public.job_kind as enum ('render_pdf', 'send_invoice_email', 'send_reminder', 'send_receipt',
  'forward_reply', 'classify_reply', 'import_clients', 'build_export', 'run_recurring', 'refresh_fx',
  'send_digest');
create type public.job_status as enum ('queued', 'running', 'done', 'dead');
create type public.usage_kind as enum ('invoices_sent', 'replies_read', 'rewrites');
create type public.import_status as enum ('uploaded', 'queued', 'running', 'done', 'failed');
create type public.export_kind as enum ('accountant_csv', 'xero_csv', 'quickbooks_csv');
create type public.export_status as enum ('queued', 'running', 'ready', 'failed');
create type public.integration_status as enum ('onboarding', 'active', 'disconnected', 'error');

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
  timezone text not null default 'Europe/London',
  current_workspace_id uuid,
  utm jsonb,
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
-- ELI5: a workspace is the business. Members are the people in it. The
-- owner's subscription pays for everyone in the workspace.
-- ---------------------------------------------------------------------
create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 80),
  slug text not null unique check (slug ~ '^[a-z0-9-]{3,40}$'),
  owner_id uuid not null references auth.users (id) on delete cascade,
  base_currency text not null default 'usd' check (base_currency ~ '^[a-z]{3}$'),
  timezone text not null default 'Europe/London',
  country text not null default 'US' check (country ~ '^[A-Z]{2}$'),
  default_terms_days integer not null default 14 check (default_terms_days between 0 and 120),
  invoice_prefix text not null default 'INV-' check (char_length(invoice_prefix) <= 12),
  paper_size text not null default 'a4' check (paper_size in ('a4', 'letter')),
  allow_shared_sender boolean not null default true,
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
-- ELI5: these are the bouncers. "Is this person in this business?" and
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
-- 6. BUSINESS PROFILE, SENDING DOMAINS, TAXES, SAVED ITEMS, LATE FEES
-- ELI5: what prints on the invoice (logo, address, tax id), which email
-- domain it is sent from, the tax rates you use, and your late fee rules.
-- ---------------------------------------------------------------------
create table public.business_profiles (
  workspace_id uuid primary key references public.workspaces (id) on delete cascade,
  legal_name text not null default '',
  address text not null default '' check (char_length(address) <= 500),
  tax_id text not null default '' check (char_length(tax_id) <= 60),
  logo_path text,
  accent_hex text not null default '#3f9a90' check (accent_hex ~ '^#[0-9A-Fa-f]{6}$'),
  footer_text text not null default '' check (char_length(footer_text) <= 500),
  payment_instructions text not null default '' check (char_length(payment_instructions) <= 1000),
  reply_to_email text check (reply_to_email is null or position('@' in reply_to_email) > 1),
  sender_name text not null default '',
  show_tally_footer boolean not null default true,
  updated_at timestamptz not null default now()
);
create trigger business_profiles_updated_at before update on public.business_profiles
  for each row execute function public.set_updated_at();

create table public.sending_domains (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  domain text not null check (domain ~ '^[a-z0-9.-]+\\.[a-z]{2,}$' and char_length(domain) <= 253),
  resend_domain_id text unique,
  status public.domain_status not null default 'not_started',
  records jsonb not null default '[]'::jsonb,
  from_local text not null default 'accounts' check (from_local ~ '^[a-z0-9._-]{1,40}$'),
  from_name text not null default '',
  is_default boolean not null default true,
  verified_at timestamptz,
  last_checked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index sending_domains_domain_idx on public.sending_domains (lower(domain));
create index sending_domains_ws_idx on public.sending_domains (workspace_id);
create trigger sending_domains_updated_at before update on public.sending_domains
  for each row execute function public.set_updated_at();

create table public.tax_rates (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 40),
  pct numeric(6, 3) not null check (pct between 0 and 100),
  is_default boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index tax_rates_ws_idx on public.tax_rates (workspace_id);

create table public.saved_items (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  description text not null check (char_length(description) between 1 and 500),
  unit_price_cents bigint not null check (unit_price_cents >= 0),
  currency text not null check (currency ~ '^[a-z]{3}$'),
  tax_rate_id uuid references public.tax_rates (id) on delete set null,
  created_at timestamptz not null default now()
);
create index saved_items_ws_idx on public.saved_items (workspace_id);
create index saved_items_tax_idx on public.saved_items (tax_rate_id);

create table public.late_fee_policies (
  workspace_id uuid primary key references public.workspaces (id) on delete cascade,
  enabled boolean not null default false,
  kind public.late_fee_kind not null default 'fixed',
  amount_cents bigint not null default 2500 check (amount_cents >= 0),
  pct numeric(5, 2) not null default 2 check (pct between 0 and 25),
  after_days integer not null default 15 check (after_days between 1 and 120),
  repeat public.late_fee_repeat not null default 'once',
  max_applications integer not null default 3 check (max_applications between 1 and 12),
  max_total_pct numeric(5, 2) not null default 10 check (max_total_pct between 0 and 50),
  updated_at timestamptz not null default now()
);
create trigger late_fee_policies_updated_at before update on public.late_fee_policies
  for each row execute function public.set_updated_at();

-- Gapless invoice numbers: one counter per workspace, locked while used.
create table public.invoice_counters (
  workspace_id uuid primary key references public.workspaces (id) on delete cascade,
  next_value integer not null default 1 check (next_value >= 1)
);

-- ---------------------------------------------------------------------
-- 7. EXCHANGE RATES (shared reference data, no workspace)
-- ELI5: one row per currency per day, how many of that currency one euro
-- buys (the ECB publishes them). Used only for dashboard totals.
-- ---------------------------------------------------------------------
create table public.fx_rates (
  rate_date date not null,
  quote text not null check (quote ~ '^[A-Z]{3}$'),
  rate numeric(18, 8) not null check (rate > 0),
  primary key (rate_date, quote)
);
create index fx_rates_quote_idx on public.fx_rates (quote, rate_date desc);

-- Rate to turn 1 unit of p_from into p_to, using the latest rate on or
-- before p_on. Returns null when a currency has no ECB rate.
create or replace function public.fx_rate(p_from text, p_to text, p_on date)
returns numeric language sql stable set search_path = '' as $$
  select case
    when upper(p_from) = upper(p_to) then 1::numeric
    else
      (case when upper(p_to) = 'EUR' then 1::numeric
            else (select r.rate from public.fx_rates r
                  where r.quote = upper(p_to) and r.rate_date <= p_on
                  order by r.rate_date desc limit 1) end)
      / nullif((case when upper(p_from) = 'EUR' then 1::numeric
                     else (select r.rate from public.fx_rates r
                           where r.quote = upper(p_from) and r.rate_date <= p_on
                           order by r.rate_date desc limit 1) end), 0)
  end;
$$;

-- ---------------------------------------------------------------------
-- 8. CLIENTS
-- ELI5: the people and companies you invoice. Each client remembers its
-- currency, payment terms, tax and reminder preferences.
-- ---------------------------------------------------------------------
create table public.reminder_sequences (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index reminder_sequences_ws_idx on public.reminder_sequences (workspace_id);
create unique index reminder_sequences_one_default_idx
  on public.reminder_sequences (workspace_id) where is_default;
create trigger reminder_sequences_updated_at before update on public.reminder_sequences
  for each row execute function public.set_updated_at();

create table public.reminder_steps (
  id uuid primary key default gen_random_uuid(),
  sequence_id uuid not null references public.reminder_sequences (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  position integer not null default 0,
  offset_days integer not null check (offset_days between -30 and 90),
  tone public.reminder_tone not null default 'friendly',
  subject text not null check (char_length(subject) between 1 and 150),
  body text not null check (char_length(body) between 1 and 3000),
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index reminder_steps_sequence_idx on public.reminder_steps (sequence_id, offset_days);
create index reminder_steps_ws_idx on public.reminder_steps (workspace_id);
create trigger reminder_steps_updated_at before update on public.reminder_steps
  for each row execute function public.set_updated_at();

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  company text not null default '' check (char_length(company) <= 120),
  email text not null check (position('@' in email) > 1 and char_length(email) <= 254),
  cc_emails text[] not null default '{}' check (cardinality(cc_emails) <= 5),
  currency text not null default 'usd' check (currency ~ '^[a-z]{3}$'),
  terms_days integer check (terms_days between 0 and 120),
  tax_rate_id uuid references public.tax_rates (id) on delete set null,
  address text not null default '' check (char_length(address) <= 500),
  notes text not null default '' check (char_length(notes) <= 2000),
  reminders_enabled boolean not null default true,
  reminder_sequence_id uuid references public.reminder_sequences (id) on delete set null,
  late_fees_enabled boolean not null default true,
  archived_at timestamptz,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index clients_ws_idx on public.clients (workspace_id);
create unique index clients_ws_email_idx on public.clients (workspace_id, lower(email)) where archived_at is null;
create index clients_tax_idx on public.clients (tax_rate_id);
create index clients_sequence_idx on public.clients (reminder_sequence_id);
create index clients_created_by_idx on public.clients (created_by);
create trigger clients_updated_at before update on public.clients
  for each row execute function public.set_updated_at();

-- The client's Stripe Customer lives on the freelancer's CONNECTED account.
create table public.client_stripe_customers (
  client_id uuid not null references public.clients (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  stripe_account_id text not null,
  stripe_customer_id text not null,
  created_at timestamptz not null default now(),
  primary key (client_id, stripe_account_id)
);
create index client_stripe_customers_ws_idx on public.client_stripe_customers (workspace_id);

-- ---------------------------------------------------------------------
-- 9. RECURRING PROFILES
-- ELI5: a recipe for an invoice that repeats ("Retainer, $2,000, on the
-- 1st of every month"). The scheduler cooks a new invoice from it.
-- ---------------------------------------------------------------------
create table public.recurring_profiles (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  client_id uuid not null references public.clients (id) on delete cascade,
  currency text not null check (currency ~ '^[a-z]{3}$'),
  lines jsonb not null default '[]'::jsonb check (jsonb_typeof(lines) = 'array'),
  notes text not null default '',
  terms text not null default '',
  frequency public.recurring_frequency not null default 'monthly',
  interval_count integer not null default 1 check (interval_count between 1 and 12),
  anchor_day integer check (anchor_day between 1 and 31),
  next_run_on date not null,
  ends_on date,
  max_runs integer check (max_runs between 1 and 500),
  run_count integer not null default 0,
  auto_send boolean not null default false,
  status public.recurring_status not null default 'active',
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index recurring_profiles_ws_idx on public.recurring_profiles (workspace_id);
create index recurring_profiles_client_idx on public.recurring_profiles (client_id);
create index recurring_profiles_due_idx on public.recurring_profiles (status, next_run_on);
create index recurring_profiles_created_by_idx on public.recurring_profiles (created_by);
create trigger recurring_profiles_updated_at before update on public.recurring_profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- 10. INVOICES, LINES, EVENTS
-- ELI5: an invoice is the bill. Lines are the rows on it. Events are the
-- diary of everything that happened to it (sent, viewed, reminded, paid).
-- Totals are worked out by the database, never sent in by the browser.
-- ---------------------------------------------------------------------
create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  client_id uuid not null references public.clients (id) on delete restrict,
  number text,
  kind public.invoice_kind not null default 'standard',
  status public.invoice_status not null default 'draft',
  currency text not null check (currency ~ '^[a-z]{3}$'),
  issue_date date,
  due_date date,
  subtotal_cents bigint not null default 0,
  discount_cents bigint not null default 0 check (discount_cents >= 0),
  tax_cents bigint not null default 0,
  late_fee_cents bigint not null default 0,
  deposit_credit_cents bigint not null default 0,
  total_cents bigint not null default 0,
  amount_paid_cents bigint not null default 0,
  amount_due_cents bigint not null default 0,
  allow_partial boolean not null default false,
  min_partial_cents bigint not null default 0 check (min_partial_cents >= 0),
  allow_card boolean not null default true,
  allow_bank boolean not null default true,
  reminders_enabled boolean not null default true,
  reminder_sequence_id uuid references public.reminder_sequences (id) on delete set null,
  sequence_state public.sequence_state not null default 'stopped',
  paused_until date,
  pause_reason text,
  revision integer not null default 0,
  has_unsent_changes boolean not null default false,
  pdf_path text,
  public_token_hash text unique,
  reply_token_hash text unique,
  pay_token_enc text,
  reply_token_enc text,
  deposit_for_invoice_id uuid references public.invoices (id) on delete set null,
  recurring_profile_id uuid references public.recurring_profiles (id) on delete set null,
  scheduled_send_at timestamptz,
  sent_at timestamptz,
  first_viewed_at timestamptz,
  paid_at timestamptz,
  voided_at timestamptz,
  notes text not null default '' check (char_length(notes) <= 2000),
  terms text not null default '' check (char_length(terms) <= 2000),
  fx_rate_to_base numeric(18, 8),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, number)
);
create index invoices_ws_status_idx on public.invoices (workspace_id, status);
create index invoices_client_idx on public.invoices (client_id);
create index invoices_due_idx on public.invoices (workspace_id, due_date);
create index invoices_sequence_idx on public.invoices (reminder_sequence_id);
create index invoices_deposit_for_idx on public.invoices (deposit_for_invoice_id);
create index invoices_recurring_idx on public.invoices (recurring_profile_id);
create index invoices_created_by_idx on public.invoices (created_by);
create index invoices_scheduled_idx on public.invoices (status, scheduled_send_at);
create trigger invoices_updated_at before update on public.invoices
  for each row execute function public.set_updated_at();

create table public.invoice_lines (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  position integer not null default 0,
  kind public.line_kind not null default 'item',
  description text not null check (char_length(description) between 1 and 500),
  quantity numeric(12, 3) not null default 1 check (quantity >= 0),
  unit_price_cents bigint not null default 0,
  tax_rate_id uuid references public.tax_rates (id) on delete set null,
  tax_pct numeric(6, 3) not null default 0 check (tax_pct between 0 and 100),
  line_subtotal_cents bigint not null default 0,
  line_tax_cents bigint not null default 0,
  application_no integer,
  source_invoice_id uuid references public.invoices (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (kind <> 'item' or unit_price_cents >= 0)
);
create index invoice_lines_invoice_idx on public.invoice_lines (invoice_id, position);
create index invoice_lines_ws_idx on public.invoice_lines (workspace_id);
create index invoice_lines_tax_idx on public.invoice_lines (tax_rate_id);
create index invoice_lines_source_idx on public.invoice_lines (source_invoice_id);
create unique index invoice_lines_late_fee_idx on public.invoice_lines (invoice_id, application_no)
  where kind = 'late_fee';
create unique index invoice_lines_deposit_idx on public.invoice_lines (invoice_id, source_invoice_id)
  where kind = 'deposit_credit';
create trigger invoice_lines_updated_at before update on public.invoice_lines
  for each row execute function public.set_updated_at();

create table public.invoice_events (
  id bigint generated always as identity primary key,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  invoice_id uuid not null references public.invoices (id) on delete cascade,
  kind text not null,
  data jsonb not null default '{}'::jsonb,
  actor uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
create index invoice_events_invoice_idx on public.invoice_events (invoice_id, created_at);
create index invoice_events_ws_idx on public.invoice_events (workspace_id, created_at desc);
create index invoice_events_actor_idx on public.invoice_events (actor);

-- ---------------------------------------------------------------------
-- 11. PAYMENTS
-- ELI5: every time money comes in (Stripe or by hand) a row lands here.
-- The invoice's "paid so far" is always the sum of these rows.
-- ---------------------------------------------------------------------
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  invoice_id uuid not null references public.invoices (id) on delete cascade,
  amount_cents bigint not null check (amount_cents > 0),
  refunded_cents bigint not null default 0 check (refunded_cents >= 0),
  currency text not null check (currency ~ '^[a-z]{3}$'),
  method public.payment_method not null default 'unknown',
  status public.payment_status not null default 'pending',
  source public.payment_source not null,
  stripe_account_id text,
  checkout_session_id text unique,
  payment_intent_id text unique,
  received_at timestamptz,
  note text not null default '' check (char_length(note) <= 500),
  recorded_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (refunded_cents <= amount_cents)
);
create index payments_invoice_idx on public.payments (invoice_id);
create index payments_ws_idx on public.payments (workspace_id, received_at desc);
create index payments_recorded_by_idx on public.payments (recorded_by);
create trigger payments_updated_at before update on public.payments
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- 12. REMINDER SCHEDULE AND INBOUND REPLIES
-- ELI5: reminder_sends is the calendar of reminders for each invoice.
-- inbound_messages holds replies from clients, with what the AI thinks
-- they mean ("will pay Friday").
-- ---------------------------------------------------------------------
create table public.reminder_sends (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  invoice_id uuid not null references public.invoices (id) on delete cascade,
  step_id uuid references public.reminder_steps (id) on delete set null,
  revision integer not null default 0,
  offset_days integer not null,
  send_on date not null,
  status public.reminder_send_status not null default 'scheduled',
  skip_reason text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  unique (invoice_id, step_id, revision)
);
create index reminder_sends_due_idx on public.reminder_sends (status, send_on);
create index reminder_sends_ws_idx on public.reminder_sends (workspace_id);
create index reminder_sends_step_idx on public.reminder_sends (step_id);

create table public.inbound_messages (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  invoice_id uuid not null references public.invoices (id) on delete cascade,
  resend_email_id text not null unique,
  from_email text not null,
  subject text not null default '',
  text_excerpt text check (char_length(text_excerpt) <= 8000),
  intent public.reply_intent not null default 'unread',
  promised_date date,
  confidence numeric(3, 2),
  summary text,
  needs_reply boolean not null default true,
  handled_at timestamptz,
  received_at timestamptz not null default now(),
  classified_at timestamptz,
  forwarded_at timestamptz
);
create index inbound_messages_invoice_idx on public.inbound_messages (invoice_id, received_at desc);
create index inbound_messages_ws_idx on public.inbound_messages (workspace_id, received_at desc);

-- ---------------------------------------------------------------------
-- 13. IMPORTS AND EXPORTS
-- ELI5: a CSV of clients goes in, a CSV for your accountant comes out.
-- Both run in the background and report progress here.
-- ---------------------------------------------------------------------
create table public.imports (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  file_path text not null,
  mapping jsonb not null default '{}'::jsonb,
  status public.import_status not null default 'uploaded',
  total_rows integer not null default 0,
  ok_rows integer not null default 0,
  error_rows integer not null default 0,
  errors jsonb not null default '[]'::jsonb,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index imports_ws_idx on public.imports (workspace_id, created_at desc);
create index imports_created_by_idx on public.imports (created_by);
create trigger imports_updated_at before update on public.imports
  for each row execute function public.set_updated_at();

create table public.exports (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  kind public.export_kind not null,
  from_date date not null,
  to_date date not null,
  status public.export_status not null default 'queued',
  file_path text,
  row_count integer,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (to_date >= from_date)
);
create index exports_ws_idx on public.exports (workspace_id, created_at desc);
create index exports_created_by_idx on public.exports (created_by);
create trigger exports_updated_at before update on public.exports
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- 14. INTEGRATIONS (the freelancer's connected Stripe account)
-- ELI5: which Stripe account clients pay into, and which payment methods
-- Stripe has switched on for it. No secret tokens live here.
-- ---------------------------------------------------------------------
create table public.integrations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  provider text not null default 'stripe' check (provider = 'stripe'),
  external_account_id text not null unique,
  display_name text not null default '',
  country text,
  default_currency text,
  charges_enabled boolean not null default false,
  capabilities jsonb not null default '{}'::jsonb,
  status public.integration_status not null default 'onboarding',
  connected_by uuid references auth.users (id) on delete set null,
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, provider)
);
create index integrations_connected_by_idx on public.integrations (connected_by);
create trigger integrations_updated_at before update on public.integrations
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- 15. JOBS QUEUE, USAGE LEDGER, EMAIL LOG, RATE LIMITS
-- ELI5: jobs is the to-do list the background worker works through.
-- usage_ledger is the meter: every metered action writes a line here so
-- nobody can go past their plan. email_log stops double sends.
-- ---------------------------------------------------------------------
create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces (id) on delete cascade,
  kind public.job_kind not null,
  ref_id uuid,
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
  invoice_id uuid references public.invoices (id) on delete cascade,
  kind text not null,
  dedupe_key text not null unique,
  to_email text not null,
  is_client boolean not null default false,
  resend_id text unique,
  status text not null default 'queued',
  created_at timestamptz not null default now()
);
create index email_log_ws_idx on public.email_log (workspace_id, created_at desc);
create index email_log_invoice_idx on public.email_log (invoice_id);

create table public.email_suppressions (
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  email text not null,
  reason text not null check (reason in ('bounced', 'complained')),
  created_at timestamptz not null default now(),
  primary key (workspace_id, email)
);

create table public.notification_prefs (
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  on_paid boolean not null default true,
  on_reply boolean not null default true,
  on_overdue boolean not null default true,
  weekly_digest boolean not null default true,
  primary key (workspace_id, user_id)
);
create index notification_prefs_user_idx on public.notification_prefs (user_id);

create table public.rate_limits (
  key text not null,
  window_start timestamptz not null,
  hits integer not null default 0,
  primary key (key, window_start)
);

create table public.webhook_receipts (
  id text primary key,
  source text not null,
  received_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 16. BILLING (written only by Stripe webhooks with the secret key)
-- ELI5: Stripe tells us who paid for Tally. We copy that here. The
-- browser can read its own row but never write it, so nobody fakes "paid".
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
  invoices_sent integer,
  replies_read integer,
  rewrites integer,
  seats integer,
  domains integer
);

-- ---------------------------------------------------------------------
-- 17. ACCESS AND LIMIT FUNCTIONS
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

create or replace function public.plan_limits(ws uuid)
returns table (plan text, seats integer, invoices_sent integer, replies_read integer, rewrites integer,
               domains integer, sequences integer, remove_footer boolean)
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
    plan := 'agency'; seats := 10; invoices_sent := 750; replies_read := 1500; rewrites := 60;
    domains := 3; sequences := 1000; remove_footer := true;
  elsif v_plan = 'studio' then
    plan := 'studio'; seats := 3; invoices_sent := 250; replies_read := 500; rewrites := 30;
    domains := 1; sequences := 5; remove_footer := true;
  else
    plan := 'solo'; seats := 1; invoices_sent := 50; replies_read := 100; rewrites := 10;
    domains := 1; sequences := 1; remove_footer := false;
  end if;

  -- A 7 day trial can send at most 10 invoices and run 3 rewrites.
  if v_status = 'trialing' then
    invoices_sent := least(invoices_sent, 10);
    rewrites := least(rewrites, 3);
  end if;

  select * into o from public.workspace_limit_overrides where workspace_id = ws;
  if found then
    invoices_sent := coalesce(o.invoices_sent, invoices_sent);
    replies_read := coalesce(o.replies_read, replies_read);
    rewrites := coalesce(o.rewrites, rewrites);
    seats := coalesce(o.seats, seats);
    domains := coalesce(o.domains, domains);
  end if;
  return next;
end;
$$;

create or replace function public.usage_this_month(ws uuid, k public.usage_kind)
returns numeric language sql stable security definer set search_path = '' as $$
  select coalesce(sum(quantity), 0) from public.usage_ledger
  where workspace_id = ws and kind = k and created_at >= date_trunc('month', now());
$$;

-- One call for the sidebar meter and the Billing page.
create or replace function public.usage_summary(ws uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  l record;
begin
  if not public.is_workspace_member(ws) then raise exception 'not a member'; end if;
  select * into l from public.plan_limits(ws);
  return jsonb_build_object(
    'plan', l.plan,
    'invoices_sent', jsonb_build_object('used', public.usage_this_month(ws, 'invoices_sent'), 'limit', l.invoices_sent),
    'replies_read', jsonb_build_object('used', public.usage_this_month(ws, 'replies_read'), 'limit', l.replies_read),
    'rewrites', jsonb_build_object('used', public.usage_this_month(ws, 'rewrites'), 'limit', l.rewrites),
    'seats', jsonb_build_object('used', (select count(*) from public.workspace_members where workspace_id = ws), 'limit', l.seats),
    'domains', jsonb_build_object('used', (select count(*) from public.sending_domains where workspace_id = ws), 'limit', l.domains),
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
  return v_hits <= p_max;
end;
$$;

-- "Today" in the workspace's own timezone (reminders and due dates use it).
create or replace function public.workspace_today(ws uuid)
returns date language sql stable security definer set search_path = '' as $$
  select (now() at time zone w.timezone)::date from public.workspaces w where w.id = ws;
$$;

-- ---------------------------------------------------------------------
-- 18. WORKSPACE AND INVITE FUNCTIONS (called from the app)
-- ELI5: creating a business sets up everything it needs in one step:
-- membership, profile, counters, the default reminder sequence and the
-- (switched off) late fee rules. Joining checks seats inside the database.
-- ---------------------------------------------------------------------
create or replace function public.create_workspace(p_name text, p_base_currency text, p_timezone text,
  p_country text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_ws uuid;
  v_seq uuid;
  v_slug text;
begin
  if v_uid is null then raise exception 'not signed in'; end if;
  if exists (select 1 from public.workspaces where owner_id = v_uid) then
    raise exception 'you already own a workspace';
  end if;
  v_slug := left(trim(both '-' from regexp_replace(lower(p_name), '[^a-z0-9]+', '-', 'g')), 30);
  if char_length(v_slug) < 3 then v_slug := 'biz'; end if;
  v_slug := v_slug || '-' || substr(encode(extensions.gen_random_bytes(3), 'hex'), 1, 5);

  insert into public.workspaces (name, slug, owner_id, base_currency, timezone, country)
  values (p_name, v_slug, v_uid, lower(coalesce(p_base_currency, 'usd')),
          coalesce(nullif(p_timezone, ''), 'Europe/London'), upper(coalesce(nullif(p_country, ''), 'US')))
  returning id into v_ws;

  insert into public.workspace_members (workspace_id, user_id, role) values (v_ws, v_uid, 'owner');
  insert into public.business_profiles (workspace_id, legal_name, sender_name) values (v_ws, p_name, p_name);
  insert into public.invoice_counters (workspace_id) values (v_ws);
  insert into public.late_fee_policies (workspace_id) values (v_ws);
  insert into public.notification_prefs (workspace_id, user_id) values (v_ws, v_uid);

  insert into public.reminder_sequences (workspace_id, name, is_default)
  values (v_ws, 'Default', true) returning id into v_seq;

  insert into public.reminder_steps (sequence_id, workspace_id, position, offset_days, tone, subject, body) values
  (v_seq, v_ws, 1, -3, 'heads_up', 'Invoice {{invoice_number}} is due on {{due_date}}',
   'Hi {{client_first_name}},

A quick heads-up that invoice {{invoice_number}} for {{amount_due}} is due on {{due_date}}.
You can view it and pay here: {{pay_link}}

Thanks,
{{sender_name}}'),
  (v_seq, v_ws, 2, 0, 'friendly', 'Invoice {{invoice_number}} is due today',
   'Hi {{client_first_name}},

Invoice {{invoice_number}} for {{amount_due}} is due today. Here is the link if it helps: {{pay_link}}
If it is already on its way, thank you, and please ignore this.

{{sender_name}}'),
  (v_seq, v_ws, 3, 3, 'nudge', 'Quick reminder: {{invoice_number}} for {{amount_due}}',
   'Hi {{client_first_name}},

I have not seen payment for invoice {{invoice_number}} ({{amount_due}}, due {{due_date}}) yet.
Could you take a look when you have a minute? {{pay_link}}
If there is a problem with the invoice, reply to this email and I will sort it out.

{{sender_name}}'),
  (v_seq, v_ws, 4, 7, 'firm', '{{invoice_number}} is now 7 days overdue',
   'Hi {{client_first_name}},

Invoice {{invoice_number}} for {{amount_due}} is now {{days_overdue}} days overdue.
Please pay it this week: {{pay_link}}
If you need to split it into two payments, reply and let me know the dates.

{{sender_name}}'),
  (v_seq, v_ws, 5, 14, 'final', 'Final reminder: {{invoice_number}} ({{amount_due}})',
   'Hi {{client_first_name}},

This is my final reminder about invoice {{invoice_number}} for {{amount_due}}, which was due on {{due_date}}.
{{late_fee_line}}Please pay today using this link: {{pay_link}}
If I have missed something, reply to this email so we can resolve it.

{{sender_name}}');

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
-- 19. MONEY: line maths and invoice totals
-- ELI5: every time a line or a payment changes, the database adds the
-- invoice up again. The browser can show a preview, but the database's
-- number is the real one. Money is whole cents, rounded half away from 0.
-- ---------------------------------------------------------------------
create or replace function public.compute_line()
returns trigger language plpgsql set search_path = '' as $$
declare
  v_pct numeric;
begin
  if new.tax_rate_id is not null
     and (tg_op = 'INSERT' or new.tax_rate_id is distinct from old.tax_rate_id) then
    select t.pct into v_pct from public.tax_rates t
    where t.id = new.tax_rate_id and t.workspace_id = new.workspace_id;
    if v_pct is null then raise exception 'unknown tax rate'; end if;
    new.tax_pct := v_pct;
  end if;
  if new.kind <> 'item' then new.tax_pct := 0; end if;
  new.line_subtotal_cents := round(new.quantity * new.unit_price_cents);
  new.line_tax_cents := round(new.line_subtotal_cents * new.tax_pct / 100.0);
  return new;
end;
$$;

-- Adds the invoice up from its lines and payments, then sets the status.
create or replace function public.refresh_invoice(p_invoice uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  inv public.invoices;
  v_sub bigint; v_tax bigint; v_late bigint; v_dep bigint; v_disc bigint;
  v_total bigint; v_paid bigint; v_status public.invoice_status;
begin
  select * into inv from public.invoices where id = p_invoice for update;
  if not found then return; end if;

  select coalesce(sum(line_subtotal_cents) filter (where kind = 'item'), 0),
         coalesce(sum(line_tax_cents) filter (where kind = 'item'), 0),
         coalesce(sum(line_subtotal_cents) filter (where kind = 'late_fee'), 0),
         coalesce(sum(line_subtotal_cents) filter (where kind = 'deposit_credit'), 0)
    into v_sub, v_tax, v_late, v_dep
  from public.invoice_lines where invoice_id = p_invoice;

  v_disc := least(inv.discount_cents, v_sub);
  if v_sub > 0 and v_disc > 0 then
    v_tax := round(v_tax * (v_sub - v_disc)::numeric / v_sub);
  end if;
  v_total := greatest(v_sub - v_disc + v_tax + v_late + v_dep, 0);

  select coalesce(sum(amount_cents - refunded_cents), 0) into v_paid
  from public.payments
  where invoice_id = p_invoice and status in ('succeeded', 'refunded', 'partially_refunded');

  v_status := inv.status;
  if inv.status not in ('draft', 'scheduled', 'void', 'uncollectible') then
    if v_total > 0 and v_paid >= v_total then
      v_status := 'paid';
    elsif v_paid > 0 then
      v_status := 'partially_paid';
    elsif inv.status in ('paid', 'partially_paid') then
      v_status := case when inv.first_viewed_at is not null then 'viewed'::public.invoice_status
                       else 'sent'::public.invoice_status end;
    end if;
  end if;

  update public.invoices set
    subtotal_cents = v_sub, tax_cents = v_tax, late_fee_cents = v_late, deposit_credit_cents = v_dep,
    total_cents = v_total, amount_paid_cents = v_paid, amount_due_cents = greatest(v_total - v_paid, 0),
    status = v_status,
    paid_at = case when v_status = 'paid' then coalesce(inv.paid_at, now()) else null end,
    sequence_state = case when v_status = 'paid' then 'stopped'::public.sequence_state else inv.sequence_state end
  where id = p_invoice;

  if v_status = 'paid' and inv.status <> 'paid' then
    update public.reminder_sends set status = 'cancelled', skip_reason = 'paid'
    where invoice_id = p_invoice and status = 'scheduled';
    insert into public.invoice_events (workspace_id, invoice_id, kind, data)
    values (inv.workspace_id, p_invoice, 'paid', jsonb_build_object('amount_paid_cents', v_paid));
    -- A paid deposit becomes a credit line on the invoice it belongs to.
    if inv.kind = 'deposit' and inv.deposit_for_invoice_id is not null then
      insert into public.invoice_lines (invoice_id, workspace_id, position, kind, description, quantity,
        unit_price_cents, source_invoice_id)
      values (inv.deposit_for_invoice_id, inv.workspace_id, 900, 'deposit_credit',
        'Deposit paid (' || coalesce(inv.number, 'deposit') || ')', 1, -v_paid, p_invoice)
      on conflict do nothing;
    end if;
  end if;
end;
$$;
revoke execute on function public.refresh_invoice(uuid) from public, anon, authenticated;

create or replace function public.on_line_change()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid := coalesce(new.invoice_id, old.invoice_id);
begin
  perform public.refresh_invoice(v_id);
  update public.invoices set has_unsent_changes = true
  where id = v_id and status not in ('draft', 'scheduled') and not has_unsent_changes
    and (new.kind = 'item' or old.kind = 'item');
  return null;
end;
$$;

create or replace function public.on_payment_change()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform public.refresh_invoice(coalesce(new.invoice_id, old.invoice_id));
  return null;
end;
$$;

create or replace function public.on_discount_change()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform public.refresh_invoice(new.id);
  return null;
end;
$$;

-- ---------------------------------------------------------------------
-- 20. WORKER FUNCTIONS (edge functions only, secret key)
-- ELI5: claim_jobs hands the worker a few to-dos and marks them "mine"
-- so two workers never grab the same one. issue_invoice gives a draft its
-- number and reminder calendar in one go.
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

-- Writes (or rewrites) the reminder calendar for one invoice.
create or replace function public.write_reminder_schedule(p_invoice uuid)
returns integer language plpgsql security definer set search_path = '' as $$
declare
  inv public.invoices;
  cl public.clients;
  v_seq uuid;
  v_today date;
  v_count integer;
begin
  select * into inv from public.invoices where id = p_invoice;
  select * into cl from public.clients where id = inv.client_id;
  delete from public.reminder_sends
  where invoice_id = p_invoice and status = 'scheduled';
  if not inv.reminders_enabled or not cl.reminders_enabled or inv.due_date is null then
    update public.invoices set sequence_state = 'stopped' where id = p_invoice;
    return 0;
  end if;
  v_seq := coalesce(inv.reminder_sequence_id, cl.reminder_sequence_id,
    (select id from public.reminder_sequences where workspace_id = inv.workspace_id and is_default));
  v_today := public.workspace_today(inv.workspace_id);

  insert into public.reminder_sends (workspace_id, invoice_id, step_id, revision, offset_days, send_on)
  select distinct on (inv.due_date + s.offset_days)
         inv.workspace_id, p_invoice, s.id, inv.revision, s.offset_days, inv.due_date + s.offset_days
  from public.reminder_steps s
  where s.sequence_id = v_seq and s.enabled
    and inv.due_date + s.offset_days >= greatest(coalesce(inv.issue_date, v_today), v_today)
  order by inv.due_date + s.offset_days, s.offset_days desc
  on conflict (invoice_id, step_id, revision) do nothing;
  get diagnostics v_count = row_count;

  update public.invoices set sequence_state = case when v_count > 0 then 'active'::public.sequence_state
    else 'completed'::public.sequence_state end
  where id = p_invoice and sequence_state not in ('paused_reply', 'paused_promise', 'paused_manual',
    'paused_dispute', 'paused_bounce');
  return v_count;
end;
$$;

-- Gives a draft its number, dates and token hashes, and books reminders.
create or replace function public.issue_invoice(p_invoice uuid, p_pay_hash text, p_reply_hash text,
  p_pay_enc text, p_reply_enc text, p_send_at timestamptz)
returns text language plpgsql security definer set search_path = '' as $$
declare
  inv public.invoices;
  w public.workspaces;
  v_n integer;
  v_number text;
  v_issue date;
  v_due date;
  v_terms integer;
begin
  select * into inv from public.invoices where id = p_invoice for update;
  if not found then raise exception 'not_found'; end if;
  if inv.status <> 'draft' then raise exception 'wrong_state'; end if;
  select * into w from public.workspaces where id = inv.workspace_id;

  update public.invoice_counters set next_value = next_value + 1
  where workspace_id = inv.workspace_id returning next_value - 1 into v_n;
  v_number := w.invoice_prefix || lpad(v_n::text, 4, '0');

  select coalesce(c.terms_days, w.default_terms_days) into v_terms from public.clients c where c.id = inv.client_id;
  v_issue := coalesce(inv.issue_date, public.workspace_today(w.id));
  v_due := coalesce(inv.due_date, v_issue + v_terms);

  update public.invoices set
    number = v_number, issue_date = v_issue, due_date = v_due,
    public_token_hash = p_pay_hash, reply_token_hash = p_reply_hash,
    pay_token_enc = p_pay_enc, reply_token_enc = p_reply_enc,
    fx_rate_to_base = public.fx_rate(inv.currency, w.base_currency, v_issue),
    status = 'scheduled', scheduled_send_at = coalesce(p_send_at, now()),
    has_unsent_changes = false
  where id = p_invoice;

  perform public.write_reminder_schedule(p_invoice);
  insert into public.invoice_events (workspace_id, invoice_id, kind, data)
  values (inv.workspace_id, p_invoice, 'issued', jsonb_build_object('number', v_number, 'send_at', coalesce(p_send_at, now())));
  return v_number;
end;
$$;

-- "Edit and resend": new revision, new reminder calendar.
create or replace function public.bump_revision(p_invoice uuid)
returns integer language plpgsql security definer set search_path = '' as $$
declare v_rev integer;
begin
  update public.invoices set revision = revision + 1, has_unsent_changes = false
  where id = p_invoice and amount_paid_cents = 0 and status in ('sent', 'viewed')
  returning revision into v_rev;
  if v_rev is null then raise exception 'has_payments_or_wrong_state'; end if;
  perform public.write_reminder_schedule(p_invoice);
  return v_rev;
end;
$$;

-- Called by the Connect webhook when Stripe says the money arrived.
create or replace function public.record_stripe_payment(p_payment uuid, p_amount bigint, p_intent text,
  p_method public.payment_method)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_invoice uuid;
begin
  update public.payments set status = 'succeeded', amount_cents = p_amount, payment_intent_id = p_intent,
    method = p_method, received_at = coalesce(received_at, now())
  where id = p_payment and status in ('pending', 'processing', 'expired')
  returning invoice_id into v_invoice;
  if v_invoice is not null then
    insert into public.invoice_events (workspace_id, invoice_id, kind, data)
    select workspace_id, invoice_id, 'payment_succeeded',
           jsonb_build_object('amount_cents', p_amount, 'method', p_method)
    from public.payments where id = p_payment;
  end if;
  return v_invoice;
end;
$$;

-- Adds one late fee line (once per application number).
create or replace function public.apply_late_fee(p_invoice uuid, p_application_no integer, p_amount bigint,
  p_label text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  inv public.invoices;
  v_rows integer;
begin
  select * into inv from public.invoices where id = p_invoice for update;
  if inv.status not in ('sent', 'viewed', 'partially_paid') or inv.sequence_state = 'paused_dispute' then
    return false;
  end if;
  insert into public.invoice_lines (invoice_id, workspace_id, position, kind, description, quantity,
    unit_price_cents, application_no)
  values (p_invoice, inv.workspace_id, 800 + p_application_no, 'late_fee', p_label, 1, p_amount, p_application_no)
  on conflict do nothing;
  get diagnostics v_rows = row_count;
  if v_rows = 0 then return false; end if;
  update public.invoices set revision = revision + 1 where id = p_invoice;
  insert into public.invoice_events (workspace_id, invoice_id, kind, data)
  values (inv.workspace_id, p_invoice, 'late_fee_applied', jsonb_build_object('amount_cents', p_amount,
    'application_no', p_application_no));
  return true;
end;
$$;

-- "Apply to open invoices" on the Reminders page (owner or admin only).
create or replace function public.rewrite_open_schedules(p_sequence uuid)
returns integer language plpgsql security definer set search_path = '' as $$
declare
  v_ws uuid;
  v_count integer := 0;
  r record;
begin
  select workspace_id into v_ws from public.reminder_sequences where id = p_sequence;
  if v_ws is null or not public.has_workspace_role(v_ws, array['owner', 'admin']::public.workspace_role[]) then
    raise exception 'only owners and admins can do this';
  end if;
  for r in
    select i.id from public.invoices i
    join public.clients c on c.id = i.client_id
    where i.workspace_id = v_ws and i.status in ('sent', 'viewed', 'partially_paid')
      and coalesce(i.reminder_sequence_id, c.reminder_sequence_id,
        (select q.id from public.reminder_sequences q where q.workspace_id = v_ws and q.is_default)) = p_sequence
  loop
    perform public.write_reminder_schedule(r.id);
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

-- Workers and webhooks only. The browser can never call these.
revoke execute on function public.claim_jobs(integer) from public, anon, authenticated;
revoke execute on function public.release_stuck_jobs() from public, anon, authenticated;
revoke execute on function public.write_reminder_schedule(uuid) from public, anon, authenticated;
revoke execute on function public.issue_invoice(uuid, text, text, text, text, timestamptz) from public, anon, authenticated;
revoke execute on function public.bump_revision(uuid) from public, anon, authenticated;
revoke execute on function public.record_stripe_payment(uuid, bigint, text, public.payment_method)
  from public, anon, authenticated;
revoke execute on function public.apply_late_fee(uuid, integer, bigint, text) from public, anon, authenticated;
revoke execute on function public.try_rate_limit(text, integer, integer) from public, anon, authenticated;
revoke execute on function public.create_workspace(text, text, text, text) from public, anon;
revoke execute on function public.create_invite(uuid, text, public.workspace_role) from public, anon;
revoke execute on function public.accept_invite(text) from public, anon;
revoke execute on function public.usage_summary(uuid) from public, anon;
revoke execute on function public.rewrite_open_schedules(uuid) from public, anon;

-- ---------------------------------------------------------------------
-- 21. GUARD TRIGGERS (the rules the browser cannot break)
-- ELI5: RLS decides WHICH rows you can touch. These triggers decide
-- WHICH COLUMNS and WHICH CHANGES. A team member can edit a draft, but
-- nobody can type in a total, mark an invoice paid, or edit a paid one.
-- Edge functions use the secret key, so these rules do not slow them.
-- ---------------------------------------------------------------------
create or replace function public.guard_invoice()
returns trigger language plpgsql set search_path = '' as $$
begin
  if current_user not in ('authenticated', 'anon') then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.status <> 'draft' or new.kind = 'recurring' or new.number is not null
       or new.public_token_hash is not null or new.reply_token_hash is not null
       or new.pay_token_enc is not null or new.reply_token_enc is not null
       or new.sent_at is not null or new.paid_at is not null or new.recurring_profile_id is not null then
      raise exception 'new invoices start as drafts';
    end if;
    if not exists (select 1 from public.clients c where c.id = new.client_id and c.workspace_id = new.workspace_id) then
      raise exception 'client is not in this workspace';
    end if;
    new.subtotal_cents := 0; new.tax_cents := 0; new.late_fee_cents := 0; new.deposit_credit_cents := 0;
    new.total_cents := 0; new.amount_paid_cents := 0; new.amount_due_cents := 0; new.revision := 0;
    new.sequence_state := 'stopped'; new.paused_until := null; new.pdf_path := null;
    new.created_by := (select auth.uid());
    return new;
  end if;

  -- UPDATE from the browser
  if new.workspace_id is distinct from old.workspace_id
     or new.number is distinct from old.number
     or new.kind is distinct from old.kind
     or new.subtotal_cents is distinct from old.subtotal_cents
     or new.tax_cents is distinct from old.tax_cents
     or new.late_fee_cents is distinct from old.late_fee_cents
     or new.deposit_credit_cents is distinct from old.deposit_credit_cents
     or new.total_cents is distinct from old.total_cents
     or new.amount_paid_cents is distinct from old.amount_paid_cents
     or new.amount_due_cents is distinct from old.amount_due_cents
     or new.public_token_hash is distinct from old.public_token_hash
     or new.reply_token_hash is distinct from old.reply_token_hash
     or new.pay_token_enc is distinct from old.pay_token_enc
     or new.reply_token_enc is distinct from old.reply_token_enc
     or new.sent_at is distinct from old.sent_at
     or new.first_viewed_at is distinct from old.first_viewed_at
     or new.paid_at is distinct from old.paid_at
     or new.revision is distinct from old.revision
     or new.pdf_path is distinct from old.pdf_path
     or new.fx_rate_to_base is distinct from old.fx_rate_to_base
     or new.recurring_profile_id is distinct from old.recurring_profile_id
     or new.scheduled_send_at is distinct from old.scheduled_send_at
     or new.created_by is distinct from old.created_by then
    raise exception 'these invoice fields are set by Tally';
  end if;

  if old.status in ('paid', 'void') and (new.status is not distinct from old.status) then
    if new.client_id is distinct from old.client_id or new.currency is distinct from old.currency
       or new.discount_cents is distinct from old.discount_cents or new.due_date is distinct from old.due_date then
      raise exception 'paid and void invoices cannot be changed';
    end if;
  end if;

  if old.status <> 'draft' and (new.client_id is distinct from old.client_id
     or new.currency is distinct from old.currency) then
    raise exception 'client and currency are fixed once an invoice is sent';
  end if;

  if old.amount_paid_cents > 0 and (new.discount_cents is distinct from old.discount_cents
     or new.due_date is distinct from old.due_date or new.issue_date is distinct from old.issue_date) then
    raise exception 'amounts and dates are locked once a payment exists';
  end if;

  -- Allowed status changes: void (no payments yet) and uncollectible.
  if new.status is distinct from old.status then
    if new.status = 'void' and old.status in ('scheduled', 'sent', 'viewed') and old.amount_paid_cents = 0 then
      new.voided_at := now();
      new.sequence_state := 'stopped';
    elsif new.status = 'uncollectible' and old.status in ('sent', 'viewed', 'partially_paid') then
      new.sequence_state := 'stopped';
    else
      raise exception 'status changes happen through Send and payments';
    end if;
  end if;

  -- Allowed sequence changes: pause by hand, or resume any pause.
  if new.sequence_state is distinct from old.sequence_state and new.status = old.status then
    if new.sequence_state = 'paused_manual' and old.sequence_state = 'active' then
      new.pause_reason := coalesce(new.pause_reason, 'Paused by you');
    elsif new.sequence_state = 'active' and old.sequence_state in ('paused_reply', 'paused_promise',
          'paused_manual', 'paused_dispute', 'paused_bounce')
          and old.status in ('scheduled', 'sent', 'viewed', 'partially_paid') then
      new.paused_until := null;
      new.pause_reason := null;
    else
      raise exception 'that reminder change is not allowed';
    end if;
  elsif new.paused_until is distinct from old.paused_until then
    raise exception 'pause dates are set by Tally';
  end if;
  return new;
end;
$$;
create trigger invoices_guard before insert or update on public.invoices
  for each row execute function public.guard_invoice();
create trigger invoices_discount_refresh after update of discount_cents on public.invoices
  for each row execute function public.on_discount_change();

-- Drafts can be deleted; anything with a number cannot.
create or replace function public.guard_invoice_delete()
returns trigger language plpgsql set search_path = '' as $$
begin
  if current_user in ('authenticated', 'anon') and (old.status <> 'draft' or old.number is not null) then
    raise exception 'only drafts can be deleted; void it instead';
  end if;
  return old;
end;
$$;
create trigger invoices_guard_delete before delete on public.invoices
  for each row execute function public.guard_invoice_delete();

create or replace function public.guard_invoice_lines()
returns trigger language plpgsql set search_path = '' as $$
declare
  v_inv record;
  v_id uuid := coalesce(new.invoice_id, old.invoice_id);
begin
  if current_user not in ('authenticated', 'anon') then
    return coalesce(new, old);
  end if;
  select status, amount_paid_cents, workspace_id into v_inv from public.invoices where id = v_id;
  -- Parent already gone (a draft being deleted): let the cascade finish.
  if not found then return coalesce(new, old); end if;
  if v_inv.amount_paid_cents > 0 or v_inv.status in ('partially_paid', 'paid', 'void', 'uncollectible') then
    raise exception 'lines are locked once a payment exists';
  end if;
  if tg_op = 'DELETE' then
    if old.kind <> 'item' then raise exception 'only Tally removes late fees and deposit credits'; end if;
    return old;
  end if;
  if new.kind <> 'item' or new.application_no is not null or new.source_invoice_id is not null then
    raise exception 'only Tally adds late fees and deposit credits';
  end if;
  if new.workspace_id <> v_inv.workspace_id then raise exception 'workspace mismatch'; end if;
  if tg_op = 'UPDATE' and (new.invoice_id <> old.invoice_id or old.kind <> 'item') then
    raise exception 'this line cannot be moved or changed';
  end if;
  return new;
end;
$$;
create trigger invoice_lines_a_guard before insert or update or delete on public.invoice_lines
  for each row execute function public.guard_invoice_lines();
create trigger invoice_lines_b_compute before insert or update on public.invoice_lines
  for each row execute function public.compute_line();
create trigger invoice_lines_c_refresh after insert or update or delete on public.invoice_lines
  for each row execute function public.on_line_change();

-- Members may only record manual payments, on sent invoices in their workspace.
create or replace function public.guard_payment()
returns trigger language plpgsql set search_path = '' as $$
declare
  v_inv record;
begin
  if current_user not in ('authenticated', 'anon') then
    return coalesce(new, old);
  end if;
  if tg_op = 'UPDATE' then
    if new.note is distinct from old.note and row(new.amount_cents, new.status, new.method, new.source,
       new.refunded_cents, new.invoice_id) is not distinct from row(old.amount_cents, old.status, old.method,
       old.source, old.refunded_cents, old.invoice_id) then
      return new;
    end if;
    raise exception 'only the note on a payment can be changed';
  end if;
  if tg_op = 'DELETE' then
    if old.source <> 'manual' then raise exception 'Stripe payments are refunded in Stripe'; end if;
    return old;
  end if;
  select workspace_id, currency, status into v_inv from public.invoices where id = new.invoice_id;
  if not found or v_inv.workspace_id <> new.workspace_id then raise exception 'invoice not in this workspace'; end if;
  if v_inv.status not in ('sent', 'viewed', 'partially_paid') then
    raise exception 'payments can only be recorded on sent invoices';
  end if;
  if new.source <> 'manual' or new.status <> 'succeeded' or new.refunded_cents <> 0
     or new.method not in ('bank_transfer', 'cheque', 'cash', 'other')
     or new.checkout_session_id is not null or new.payment_intent_id is not null then
    raise exception 'members can only record manual payments';
  end if;
  new.currency := v_inv.currency;
  new.recorded_by := (select auth.uid());
  new.received_at := coalesce(new.received_at, now());
  return new;
end;
$$;
create trigger payments_a_guard before insert or update or delete on public.payments
  for each row execute function public.guard_payment();
create trigger payments_b_refresh after insert or update or delete on public.payments
  for each row execute function public.on_payment_change();

-- Plan cap on reminder sequences (Solo 1, Studio 5).
create or replace function public.guard_sequence_count()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_max integer;
begin
  select l.sequences into v_max from public.plan_limits(new.workspace_id) l;
  if (select count(*) from public.reminder_sequences where workspace_id = new.workspace_id) >= v_max then
    raise exception 'sequence_limit_reached';
  end if;
  return new;
end;
$$;
create trigger reminder_sequences_cap before insert on public.reminder_sequences
  for each row execute function public.guard_sequence_count();

-- Steps must belong to a sequence in the same workspace.
create or replace function public.guard_step()
returns trigger language plpgsql set search_path = '' as $$
begin
  if not exists (select 1 from public.reminder_sequences s
                 where s.id = new.sequence_id and s.workspace_id = new.workspace_id) then
    raise exception 'sequence is not in this workspace';
  end if;
  return new;
end;
$$;
create trigger reminder_steps_guard before insert or update on public.reminder_steps
  for each row execute function public.guard_step();

-- Imports: the browser creates the row; the worker moves it along.
create or replace function public.guard_import()
returns trigger language plpgsql set search_path = '' as $$
begin
  if current_user in ('authenticated', 'anon') then
    if tg_op = 'INSERT' then
      new.status := 'uploaded'; new.ok_rows := 0; new.error_rows := 0; new.errors := '[]'::jsonb;
      new.created_by := (select auth.uid());
      if new.file_path not like new.workspace_id::text || '/%' then
        raise exception 'import file must be in your workspace folder';
      end if;
    elsif old.status <> 'uploaded' or new.status is distinct from old.status
          or new.file_path is distinct from old.file_path then
      raise exception 'only the column mapping can change before the import starts';
    end if;
  end if;
  return new;
end;
$$;
create trigger imports_guard before insert or update on public.imports
  for each row execute function public.guard_import();

-- The owner of a workspace can only change through a support action.
create or replace function public.guard_workspace_owner()
returns trigger language plpgsql set search_path = '' as $$
begin
  if current_user in ('authenticated', 'anon')
     and (new.owner_id is distinct from old.owner_id or new.slug is distinct from old.slug) then
    raise exception 'workspace owner and slug cannot be changed here';
  end if;
  return new;
end;
$$;
create trigger workspaces_guard before update on public.workspaces
  for each row execute function public.guard_workspace_owner();

-- Nobody hands themselves the owner role.
create or replace function public.guard_member_role()
returns trigger language plpgsql set search_path = '' as $$
begin
  if current_user in ('authenticated', 'anon') and (new.role = 'owner' or old.role = 'owner') then
    raise exception 'the owner role cannot be changed here';
  end if;
  return new;
end;
$$;
create trigger workspace_members_guard before update on public.workspace_members
  for each row execute function public.guard_member_role();

-- ---------------------------------------------------------------------
-- 22. ROW LEVEL SECURITY: switch it on for every table
-- ELI5: with RLS on and no policy, a table is a locked room. Policies
-- are the keys. Tables with no policies below are server-only.
-- ---------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.workspace_invites enable row level security;
alter table public.business_profiles enable row level security;
alter table public.sending_domains enable row level security;
alter table public.tax_rates enable row level security;
alter table public.saved_items enable row level security;
alter table public.late_fee_policies enable row level security;
alter table public.invoice_counters enable row level security;
alter table public.fx_rates enable row level security;
alter table public.reminder_sequences enable row level security;
alter table public.reminder_steps enable row level security;
alter table public.clients enable row level security;
alter table public.client_stripe_customers enable row level security;
alter table public.recurring_profiles enable row level security;
alter table public.invoices enable row level security;
alter table public.invoice_lines enable row level security;
alter table public.invoice_events enable row level security;
alter table public.payments enable row level security;
alter table public.reminder_sends enable row level security;
alter table public.inbound_messages enable row level security;
alter table public.imports enable row level security;
alter table public.exports enable row level security;
alter table public.integrations enable row level security;
alter table public.jobs enable row level security;
alter table public.usage_ledger enable row level security;
alter table public.email_log enable row level security;
alter table public.email_suppressions enable row level security;
alter table public.notification_prefs enable row level security;
alter table public.rate_limits enable row level security;
alter table public.webhook_receipts enable row level security;
alter table public.subscriptions enable row level security;
alter table public.stripe_events enable row level security;
alter table public.connect_events enable row level security;
alter table public.plan_prices enable row level security;
alter table public.workspace_limit_overrides enable row level security;

-- Profiles: you, and people you share a workspace with (names on invoices).
create policy "profiles select own or teammate" on public.profiles for select to authenticated
  using (id = (select auth.uid()) or public.shares_workspace_with(id));
create policy "profiles update own" on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- Workspaces: members read, owner/admin edit settings, owner deletes.
create policy "workspaces select member" on public.workspaces for select to authenticated
  using (public.is_workspace_member(id));
create policy "workspaces update admin" on public.workspaces for update to authenticated
  using (public.has_workspace_role(id, array['owner', 'admin']::public.workspace_role[]))
  with check (public.has_workspace_role(id, array['owner', 'admin']::public.workspace_role[]));
create policy "workspaces delete owner" on public.workspaces for delete to authenticated
  using (owner_id = (select auth.uid()));

-- Members: everyone sees the team; owner changes roles; owner/admin remove
-- people (never the owner); anyone can leave.
create policy "members select member" on public.workspace_members for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy "members update owner" on public.workspace_members for update to authenticated
  using (public.has_workspace_role(workspace_id, array['owner']::public.workspace_role[]))
  with check (public.has_workspace_role(workspace_id, array['owner']::public.workspace_role[]));
create policy "members delete admin or self" on public.workspace_members for delete to authenticated
  using (role <> 'owner' and (user_id = (select auth.uid())
    or public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[])));

-- Invites: owner/admin see and revoke. Created through create_invite().
create policy "invites select admin" on public.workspace_invites for select to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]));
create policy "invites delete admin" on public.workspace_invites for delete to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]));

-- Business profile: members read, owner/admin edit.
create policy "business select member" on public.business_profiles for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy "business update admin" on public.business_profiles for update to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]))
  with check (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]));

-- Sending domains: members read. Only tl-domains (secret key) writes.
create policy "domains select member" on public.sending_domains for select to authenticated
  using (public.is_workspace_member(workspace_id));

-- Tax rates: members read, owner/admin manage.
create policy "tax select member" on public.tax_rates for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy "tax insert admin" on public.tax_rates for insert to authenticated
  with check (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]));
create policy "tax update admin" on public.tax_rates for update to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]))
  with check (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]));
create policy "tax delete admin" on public.tax_rates for delete to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]));

-- Saved items: the whole team.
create policy "items select member" on public.saved_items for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy "items insert member" on public.saved_items for insert to authenticated
  with check (public.is_workspace_member(workspace_id));
create policy "items update member" on public.saved_items for update to authenticated
  using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id));
create policy "items delete member" on public.saved_items for delete to authenticated
  using (public.is_workspace_member(workspace_id));

-- Late fees: members read, owner/admin edit.
create policy "late fees select member" on public.late_fee_policies for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy "late fees update admin" on public.late_fee_policies for update to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]))
  with check (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]));

-- Exchange rates are public reference data for signed-in users.
create policy "fx select signed in" on public.fx_rates for select to authenticated using (true);

-- Reminder sequences and steps: members read, owner/admin manage.
create policy "sequences select member" on public.reminder_sequences for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy "sequences insert admin" on public.reminder_sequences for insert to authenticated
  with check (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]));
create policy "sequences update admin" on public.reminder_sequences for update to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]))
  with check (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]));
create policy "sequences delete admin" on public.reminder_sequences for delete to authenticated
  using (not is_default and public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]));

create policy "steps select member" on public.reminder_steps for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy "steps insert admin" on public.reminder_steps for insert to authenticated
  with check (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]));
create policy "steps update admin" on public.reminder_steps for update to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]))
  with check (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]));
create policy "steps delete admin" on public.reminder_steps for delete to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]));

-- Clients: the team manages them, owner/admin delete.
create policy "clients select member" on public.clients for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy "clients insert member" on public.clients for insert to authenticated
  with check (public.is_workspace_member(workspace_id));
create policy "clients update member" on public.clients for update to authenticated
  using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id));
create policy "clients delete admin" on public.clients for delete to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]));

create policy "client customers select member" on public.client_stripe_customers for select to authenticated
  using (public.is_workspace_member(workspace_id));

-- Recurring profiles: the team.
create policy "recurring select member" on public.recurring_profiles for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy "recurring insert member" on public.recurring_profiles for insert to authenticated
  with check (public.is_workspace_member(workspace_id));
create policy "recurring update member" on public.recurring_profiles for update to authenticated
  using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id));
create policy "recurring delete member" on public.recurring_profiles for delete to authenticated
  using (public.is_workspace_member(workspace_id));

-- Invoices: the team. Guard triggers decide which changes are allowed.
create policy "invoices select member" on public.invoices for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy "invoices insert member" on public.invoices for insert to authenticated
  with check (public.is_workspace_member(workspace_id));
create policy "invoices update member" on public.invoices for update to authenticated
  using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id));
create policy "invoices delete member draft" on public.invoices for delete to authenticated
  using (status = 'draft' and public.is_workspace_member(workspace_id));

create policy "lines select member" on public.invoice_lines for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy "lines insert member" on public.invoice_lines for insert to authenticated
  with check (public.is_workspace_member(workspace_id));
create policy "lines update member" on public.invoice_lines for update to authenticated
  using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id));
create policy "lines delete member" on public.invoice_lines for delete to authenticated
  using (public.is_workspace_member(workspace_id));

create policy "events select member" on public.invoice_events for select to authenticated
  using (public.is_workspace_member(workspace_id));

-- Payments: the team sees them and records manual ones; owner/admin
-- delete a manual payment entered by mistake.
create policy "payments select member" on public.payments for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy "payments insert member manual" on public.payments for insert to authenticated
  with check (source = 'manual' and public.is_workspace_member(workspace_id));
create policy "payments update member note" on public.payments for update to authenticated
  using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id));
create policy "payments delete admin manual" on public.payments for delete to authenticated
  using (source = 'manual' and public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]));

-- Read-only to the team (written by edge functions).
create policy "reminder sends select member" on public.reminder_sends for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy "inbound select member" on public.inbound_messages for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy "integrations select member" on public.integrations for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy "jobs select member" on public.jobs for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy "usage select member" on public.usage_ledger for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy "email log select member" on public.email_log for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy "exports select member" on public.exports for select to authenticated
  using (public.is_workspace_member(workspace_id));

-- Imports: the team creates them and edits the mapping before start.
create policy "imports select member" on public.imports for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy "imports insert member" on public.imports for insert to authenticated
  with check (public.is_workspace_member(workspace_id));
create policy "imports update member" on public.imports for update to authenticated
  using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id));

-- Suppressions: the team sees them; owner/admin clear one after fixing it.
create policy "suppressions select member" on public.email_suppressions for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy "suppressions delete admin" on public.email_suppressions for delete to authenticated
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

-- No policies on purpose (server only): invoice_counters, rate_limits,
-- webhook_receipts, stripe_events, connect_events, workspace_limit_overrides.

-- ---------------------------------------------------------------------
-- 23. VIEWS FOR THE DASHBOARD (obey the caller's RLS)
-- ELI5: ready-made tables for the dashboard. security_invoker means they
-- only show rows you are allowed to see. "Overdue" is worked out here
-- from the due date and your own timezone, so it is never out of date.
-- ---------------------------------------------------------------------
create or replace view public.invoice_overview with (security_invoker = true) as
select
  i.id, i.workspace_id, i.client_id, i.number, i.kind, i.status, i.currency, i.issue_date, i.due_date,
  i.total_cents, i.amount_paid_cents, i.amount_due_cents, i.sequence_state, i.paused_until, i.sent_at,
  i.first_viewed_at, i.paid_at, i.fx_rate_to_base, i.created_by,
  c.name as client_name, c.company as client_company,
  w.base_currency,
  (i.status in ('sent', 'viewed', 'partially_paid')
     and i.due_date < (now() at time zone w.timezone)::date) as is_overdue,
  greatest((now() at time zone w.timezone)::date - i.due_date, 0) as days_overdue,
  extract(epoch from (i.paid_at - i.sent_at)) / 86400.0 as days_to_pay,
  (i.paid_at at time zone w.timezone)::date - i.due_date as days_late_when_paid,
  (select min(rs.send_on) from public.reminder_sends rs
     where rs.invoice_id = i.id and rs.status = 'scheduled') as next_reminder_on
from public.invoices i
join public.clients c on c.id = i.client_id
join public.workspaces w on w.id = i.workspace_id;

create or replace view public.client_payment_stats with (security_invoker = true) as
select
  c.id as client_id, c.workspace_id,
  count(i.id) filter (where i.status = 'paid') as paid_count,
  avg(extract(epoch from (i.paid_at - i.sent_at)) / 86400.0) filter (where i.status = 'paid') as avg_days_to_pay,
  avg(((i.paid_at at time zone w.timezone)::date - i.due_date)) filter (where i.status = 'paid') as avg_days_late,
  coalesce(sum(i.amount_due_cents) filter (where i.status in ('sent', 'viewed', 'partially_paid')), 0) as outstanding_cents
from public.clients c
join public.workspaces w on w.id = c.workspace_id
left join public.invoices i on i.client_id = c.id and i.paid_at > now() - interval '365 days'
  or (i.client_id = c.id and i.status in ('sent', 'viewed', 'partially_paid'))
group by c.id, c.workspace_id;

-- ---------------------------------------------------------------------
-- 24. STORAGE BUCKETS + POLICIES
-- ELI5: four private folders. brand-assets holds logos, invoice-pdfs the
-- rendered invoices, imports the CSVs you upload, exports the CSVs for
-- your accountant. Files sit under a folder named after the workspace
-- id, and only members get in. Only edge functions write PDFs and exports.
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('brand-assets', 'brand-assets', false, 2097152, array['image/png', 'image/jpeg', 'image/webp']),
  ('invoice-pdfs', 'invoice-pdfs', false, 5242880, array['application/pdf']),
  ('imports', 'imports', false, 5242880, array['text/csv', 'application/vnd.ms-excel', 'text/plain']),
  ('exports', 'exports', false, 52428800, array['text/csv'])
on conflict (id) do nothing;

create policy "brand assets select member" on storage.objects for select to authenticated
  using (bucket_id = 'brand-assets' and public.is_workspace_member_text((storage.foldername(name))[1]));
create policy "brand assets insert member" on storage.objects for insert to authenticated
  with check (bucket_id = 'brand-assets' and public.is_workspace_member_text((storage.foldername(name))[1]));
create policy "brand assets update member" on storage.objects for update to authenticated
  using (bucket_id = 'brand-assets' and public.is_workspace_member_text((storage.foldername(name))[1]))
  with check (bucket_id = 'brand-assets' and public.is_workspace_member_text((storage.foldername(name))[1]));
create policy "brand assets delete member" on storage.objects for delete to authenticated
  using (bucket_id = 'brand-assets' and public.is_workspace_member_text((storage.foldername(name))[1]));

create policy "invoice pdfs select member" on storage.objects for select to authenticated
  using (bucket_id = 'invoice-pdfs' and public.is_workspace_member_text((storage.foldername(name))[1]));

create policy "imports select member" on storage.objects for select to authenticated
  using (bucket_id = 'imports' and public.is_workspace_member_text((storage.foldername(name))[1]));
create policy "imports insert member" on storage.objects for insert to authenticated
  with check (bucket_id = 'imports' and public.is_workspace_member_text((storage.foldername(name))[1]));
create policy "imports delete member" on storage.objects for delete to authenticated
  using (bucket_id = 'imports' and public.is_workspace_member_text((storage.foldername(name))[1]));

create policy "exports select member" on storage.objects for select to authenticated
  using (bucket_id = 'exports' and public.is_workspace_member_text((storage.foldername(name))[1]));

-- ---------------------------------------------------------------------
-- 25. REALTIME
-- ELI5: lets the dashboard and invoice pages update live when a payment
-- or a reply arrives, and the import page show progress, with no refresh.
-- ---------------------------------------------------------------------
alter publication supabase_realtime add table public.invoices;
alter publication supabase_realtime add table public.payments;
alter publication supabase_realtime add table public.inbound_messages;
alter publication supabase_realtime add table public.imports;
alter publication supabase_realtime add table public.exports;

-- ---------------------------------------------------------------------
-- 26. SCHEDULES (run later, after your edge functions are deployed)
-- ELI5: pg_cron is an alarm clock inside the database. pg_net lets the
-- alarm clock call a URL. Every minute it pokes the worker, every 15
-- minutes the scheduler (reminders, late fees, recurring, FX, digests).
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
-- select cron.schedule('tl-worker',    '* * * * *',    $$ select public.invoke_edge('tl-worker') $$);
-- select cron.schedule('tl-scheduler', '*/15 * * * *', $$ select public.invoke_edge('tl-scheduler') $$);
--
-- Check it ran: select * from cron.job_run_details order by start_time desc limit 20;
`
