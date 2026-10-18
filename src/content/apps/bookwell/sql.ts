// Bookwell database: one migration with tables, the double-booking exclusion constraint, RLS, usage ledger, email log and storage.

export const sql = `-- =====================================================================
-- Bookwell: the whole database in one migration.
-- Paste into Supabase: SQL Editor, New query, paste everything, Run.
-- Run it once on a fresh project. It creates every table, rule and bucket.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. Extensions
-- ELI5: extensions are add-ons for Postgres. btree_gist lets us say
-- "no two bookings may overlap" as a database rule. pg_cron and pg_net
-- let the database call the reminder function every 15 minutes.
-- ---------------------------------------------------------------------
create extension if not exists btree_gist with schema extensions;
create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

-- ---------------------------------------------------------------------
-- 1. Enums
-- ELI5: an enum is a fixed list of allowed words, so a booking can only
-- ever be 'pending', 'confirmed' and so on. Typos become errors.
-- ---------------------------------------------------------------------
create type public.booking_status as enum ('pending','confirmed','cancelled','expired','completed','no_show');
create type public.refund_status as enum ('none','pending','refunded','failed');
create type public.refund_policy as enum ('refund_if_early','always','never');
create type public.google_status as enum ('disconnected','connected','error');
create type public.plan_id as enum ('solo','studio');
create type public.sms_kind as enum ('confirmation','reminder','reschedule','cancellation','reply');
create type public.usage_metric as enum ('sms_segment','email');

-- ---------------------------------------------------------------------
-- 2. Shared trigger: keep updated_at fresh
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- 3. Profiles, created automatically when someone signs up
-- ELI5: Supabase keeps logins in auth.users. We keep our own small
-- profiles table next to it, filled in by a trigger on signup.
-- ---------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  referred_by text,
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
-- 4. Businesses (one per owner in v1)
-- ELI5: this is the shop. Its handle makes the public link
-- bookwell.app/b/<handle>. Connection columns (Stripe, Google) are only
-- ever written by edge functions, never by the browser (see section 12).
-- ---------------------------------------------------------------------
create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 2 and 60),
  handle text not null unique check (handle ~ '^[a-z0-9](?:[a-z0-9-]{1,28})[a-z0-9]$'),
  trade text,
  timezone text not null default 'America/New_York',
  currency text not null default 'usd' check (currency ~ '^[a-z]{3}$'),
  phone text,
  address text,
  logo_path text,
  brand_hex text check (brand_hex is null or brand_hex ~ '^#[0-9a-fA-F]{6}$'),
  hide_footer boolean not null default false,
  min_notice_minutes int not null default 120 check (min_notice_minutes between 0 and 10080),
  max_days_ahead int not null default 60 check (max_days_ahead between 1 and 365),
  slot_step_minutes int not null default 15 check (slot_step_minutes in (15, 30)),
  reminder_hours int not null default 24 check (reminder_hours between 2 and 72),
  cancel_window_hours int not null default 24 check (cancel_window_hours between 0 and 168),
  refund_policy public.refund_policy not null default 'refund_if_early',
  notify_owner_email boolean not null default true,
  stripe_account_id text unique,
  stripe_charges_enabled boolean not null default false,
  google_status public.google_status not null default 'disconnected',
  google_email text,
  google_calendar_id text not null default 'primary',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger businesses_updated_at before update on public.businesses
  for each row execute function public.set_updated_at();

-- Google tokens: secret key only. No policies, so the browser can never read them.
create table public.google_tokens (
  business_id uuid primary key references public.businesses (id) on delete cascade,
  refresh_token text not null,
  access_token text,
  access_token_expires_at timestamptz,
  scope text,
  updated_at timestamptz not null default now()
);
create trigger google_tokens_updated_at before update on public.google_tokens
  for each row execute function public.set_updated_at();

-- 60 second cache of Google freeBusy results, so busy pages do not hit Google's quota.
create table public.busy_cache (
  business_id uuid not null references public.businesses (id) on delete cascade,
  day date not null,
  busy jsonb not null default '[]'::jsonb,
  fetched_at timestamptz not null default now(),
  primary key (business_id, day)
);

-- ---------------------------------------------------------------------
-- 5. Services, weekly hours, days off
-- ---------------------------------------------------------------------
create table public.services (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  name text not null check (char_length(name) between 2 and 60),
  description text check (description is null or char_length(description) <= 140),
  minutes int not null check (minutes between 5 and 480),
  price_cents int not null default 0 check (price_cents >= 0),
  deposit_cents int not null default 0 check (deposit_cents >= 0),
  buffer_minutes int not null default 0 check (buffer_minutes between 0 and 120),
  position int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint deposit_not_above_price check (deposit_cents <= price_cents)
);
create index services_business_idx on public.services (business_id, position);
create trigger services_updated_at before update on public.services
  for each row execute function public.set_updated_at();

-- weekday: 0 = Sunday ... 6 = Saturday. Several rows per day allowed (split shifts).
create table public.availability (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  weekday int not null check (weekday between 0 and 6),
  start_time time not null,
  end_time time not null,
  constraint availability_order check (end_time > start_time)
);
create index availability_business_idx on public.availability (business_id, weekday);

create table public.days_off (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  day date not null,
  reason text check (reason is null or char_length(reason) <= 80),
  unique (business_id, day)
);

-- ---------------------------------------------------------------------
-- 6. Bookings, with the rule that stops double booking
-- ELI5: the "exclude using gist" line is a promise the database keeps:
-- for one business, no two live bookings (pending or confirmed) may
-- overlap in time. If two people tap 14:30 at the same moment, one
-- insert wins and the other gets error 23P01. No code can break this.
-- blocked_until = ends_at + buffer, so buffers are protected too.
-- ---------------------------------------------------------------------
create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  service_id uuid references public.services (id) on delete set null,
  service_name text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  blocked_until timestamptz not null,
  customer_name text not null check (char_length(customer_name) between 1 and 80),
  customer_phone text not null check (customer_phone ~ '^\\+[1-9][0-9]{6,14}$'),
  customer_email text check (customer_email is null or char_length(customer_email) <= 254),
  sms_opt_in boolean not null default true,
  status public.booking_status not null default 'pending',
  hold_expires_at timestamptz,
  deposit_cents int not null default 0 check (deposit_cents >= 0),
  currency text not null default 'usd',
  stripe_checkout_id text unique,
  stripe_payment_intent_id text unique,
  refund_status public.refund_status not null default 'none',
  google_event_id text,
  cancel_token uuid not null default gen_random_uuid() unique,
  cancelled_by text check (cancelled_by is null or cancelled_by in ('customer','owner','system')),
  cancel_reason text,
  reschedule_count int not null default 0,
  reminder_sent_at timestamptz,
  reminder_attempts int not null default 0,
  confirmed_at timestamptz,
  idempotency_key uuid,
  owner_note text check (owner_note is null or char_length(owner_note) <= 280),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint booking_times check (ends_at > starts_at and blocked_until >= ends_at),
  constraint booking_idem unique (business_id, idempotency_key),
  constraint bookings_no_overlap exclude using gist (
    business_id with =,
    tstzrange(starts_at, blocked_until, '[)') with &&
  ) where (status in ('pending','confirmed'))
);
create index bookings_business_time_idx on public.bookings (business_id, starts_at);
create index bookings_service_idx on public.bookings (service_id);
create index bookings_phone_idx on public.bookings (customer_phone, starts_at);
create index bookings_pending_idx on public.bookings (hold_expires_at) where status = 'pending';
create index bookings_reminder_idx on public.bookings (starts_at)
  where status = 'confirmed' and reminder_sent_at is null;
create trigger bookings_updated_at before update on public.bookings
  for each row execute function public.set_updated_at();

-- Audit trail: one row for every change to a booking.
create table public.booking_events (
  id bigint generated always as identity primary key,
  booking_id uuid not null references public.bookings (id) on delete cascade,
  business_id uuid not null references public.businesses (id) on delete cascade,
  type text not null,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index booking_events_booking_idx on public.booking_events (booking_id, created_at);
create index booking_events_business_idx on public.booking_events (business_id, created_at);

-- Owners may only move a booking to completed or no_show from the browser.
-- Everything else (confirm, cancel, reschedule) happens in edge functions
-- with the secret key, which this check lets through.
create or replace function public.guard_booking_update()
returns trigger language plpgsql set search_path = '' as $$
begin
  if (select auth.role()) = 'authenticated' then
    if new.status is distinct from old.status then
      if old.status <> 'confirmed' or new.status not in ('completed','no_show') then
        raise exception 'Owners can only mark confirmed bookings completed or no-show';
      end if;
      if new.status = 'no_show' and old.starts_at > now() then
        raise exception 'A booking can only be marked no-show after it starts';
      end if;
    end if;
  end if;
  return new;
end;
$$;
create trigger bookings_guard before update on public.bookings
  for each row execute function public.guard_booking_update();

-- ---------------------------------------------------------------------
-- 7. Text messages, opt-outs, inbound replies
-- ---------------------------------------------------------------------
create table public.sms_messages (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  booking_id uuid references public.bookings (id) on delete set null,
  kind public.sms_kind not null,
  to_phone text not null,
  body_chars int not null default 0,
  segments int not null default 1,
  twilio_sid text unique,
  status text not null default 'queued',
  error_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index sms_messages_business_idx on public.sms_messages (business_id, created_at);
create index sms_messages_booking_idx on public.sms_messages (booking_id);
create index sms_messages_phone_idx on public.sms_messages (to_phone, created_at);
create trigger sms_messages_updated_at before update on public.sms_messages
  for each row execute function public.set_updated_at();

-- STOP replies. Global, because every shop texts from the Bookwell sender.
create table public.sms_opt_outs (
  phone text primary key,
  source text not null default 'stop_reply',
  opted_out_at timestamptz not null default now()
);

-- Twilio may send the same inbound webhook twice. MessageSid de-duplicates it.
create table public.inbound_sms (
  message_sid text primary key,
  from_phone text not null,
  body text,
  handled_as text,
  booking_id uuid references public.bookings (id) on delete set null,
  created_at timestamptz not null default now()
);
create index inbound_sms_booking_idx on public.inbound_sms (booking_id);
create index inbound_sms_phone_idx on public.inbound_sms (from_phone, created_at);

-- ---------------------------------------------------------------------
-- 8. Usage ledger and email log
-- ELI5: every text costs you money, so every text is written down here
-- with a unique key. The same key twice means "already sent", so a retry
-- never charges twice. The plan cap is checked against this table.
-- ---------------------------------------------------------------------
create table public.usage_ledger (
  id bigint generated always as identity primary key,
  business_id uuid not null references public.businesses (id) on delete cascade,
  metric public.usage_metric not null,
  qty int not null check (qty > 0),
  period_month date not null default (date_trunc('month', now() at time zone 'utc'))::date,
  idempotency_key text not null unique,
  ref_id uuid,
  created_at timestamptz not null default now()
);
create index usage_ledger_period_idx on public.usage_ledger (business_id, metric, period_month);

create table public.email_log (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references public.businesses (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null,
  booking_id uuid references public.bookings (id) on delete set null,
  template text not null,
  to_email text not null,
  idempotency_key text not null unique,
  resend_id text,
  status text not null default 'queued' check (status in ('queued','sent','failed')),
  error text,
  created_at timestamptz not null default now()
);
create index email_log_business_idx on public.email_log (business_id, created_at);
create index email_log_user_idx on public.email_log (user_id);
create index email_log_booking_idx on public.email_log (booking_id);

-- Fixed-window rate limits for public endpoints.
create table public.rate_limits (
  key text not null,
  window_start timestamptz not null,
  hits int not null default 0,
  primary key (key, window_start)
);

-- ---------------------------------------------------------------------
-- 9. Billing (the Bookwell subscription, written only by the Stripe webhook)
-- ---------------------------------------------------------------------
create table public.subscriptions (
  user_id uuid primary key references auth.users (id) on delete cascade,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  status text not null default 'incomplete',
  price_id text,
  plan public.plan_id not null default 'solo',
  current_period_end timestamptz,
  trial_end timestamptz,
  cancel_at_period_end boolean not null default false,
  updated_at timestamptz not null default now()
);
create trigger subscriptions_updated_at before update on public.subscriptions
  for each row execute function public.set_updated_at();

-- Both Stripe webhooks (subscriptions and Connect deposits) de-duplicate here.
create table public.stripe_events (
  id text primary key,
  type text not null,
  account text,
  received_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 10. Helper functions
-- ELI5: "security definer" functions run with the owner's rights so RLS
-- policies can ask simple questions ("is this business mine?") without
-- looping back into RLS. search_path = '' stops anyone swapping tables.
-- ---------------------------------------------------------------------
create or replace function public.owns_business(b uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.businesses where id = b and owner_id = (select auth.uid())
  );
$$;

-- Paywall: true while the user's subscription is trialing or active.
create or replace function public.has_active_access(uid uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.subscriptions
    where user_id = uid and status in ('trialing','active')
  );
$$;

-- Same question for a business (used by the public page and edge functions).
create or replace function public.business_has_access(b uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.businesses bz
    join public.subscriptions s on s.user_id = bz.owner_id
    where bz.id = b and s.status in ('trialing','active')
  );
$$;

create or replace function public.business_plan(b uuid)
returns public.plan_id language sql stable security definer set search_path = '' as $$
  select coalesce(
    (select s.plan from public.businesses bz
       join public.subscriptions s on s.user_id = bz.owner_id
      where bz.id = b),
    'solo'::public.plan_id);
$$;

-- Text cap per calendar month: Solo 300, Studio 600. Emails: 2,000 on both.
create or replace function public.usage_cap(b uuid, m public.usage_metric)
returns int language sql stable security definer set search_path = '' as $$
  select case
    when m = 'email' then 2000
    when public.business_plan(b) = 'studio' then 600
    else 300
  end;
$$;

-- Used this month, for the meters. Owners can only ask about their own business.
create or replace function public.usage_this_month(b uuid)
returns table (metric public.usage_metric, used int, cap int)
language sql stable security definer set search_path = '' as $$
  select m.metric,
         coalesce((select sum(u.qty)::int from public.usage_ledger u
                    where u.business_id = b and u.metric = m.metric
                      and u.period_month = (date_trunc('month', now() at time zone 'utc'))::date), 0),
         public.usage_cap(b, m.metric)
  from (values ('sms_segment'::public.usage_metric), ('email'::public.usage_metric)) as m(metric)
  where public.owns_business(b) or (select auth.role()) = 'service_role';
$$;

-- Atomic "take N from this month's allowance". Locks per business so two
-- parallel sends cannot both take the last text. Same key twice = no-op.
create or replace function public.try_consume_usage(
  b uuid, m public.usage_metric, q int, key text, ref uuid default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_used int;
  v_cap int;
  v_month date := (date_trunc('month', now() at time zone 'utc'))::date;
begin
  perform pg_advisory_xact_lock(hashtext('usage:' || b::text));
  if exists (select 1 from public.usage_ledger where idempotency_key = key) then
    return jsonb_build_object('ok', true, 'duplicate', true);
  end if;
  select coalesce(sum(qty), 0)::int into v_used from public.usage_ledger
   where business_id = b and metric = m and period_month = v_month;
  v_cap := public.usage_cap(b, m);
  if v_used + q > v_cap then
    return jsonb_build_object('ok', false, 'used', v_used, 'cap', v_cap);
  end if;
  insert into public.usage_ledger (business_id, metric, qty, period_month, idempotency_key, ref_id)
  values (b, m, q, v_month, key, ref);
  return jsonb_build_object('ok', true, 'used', v_used + q, 'cap', v_cap);
end;
$$;

-- Give the allowance back when a send fails before reaching Twilio.
create or replace function public.refund_usage(key text)
returns void language sql security definer set search_path = '' as $$
  delete from public.usage_ledger where idempotency_key = key;
$$;

-- Fixed-window rate limit. Returns true when the call is allowed.
create or replace function public.hit_rate_limit(k text, max_hits int, window_seconds int)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  v_window timestamptz := to_timestamp(floor(extract(epoch from now()) / window_seconds) * window_seconds);
  v_hits int;
begin
  insert into public.rate_limits (key, window_start, hits) values (k, v_window, 1)
  on conflict (key, window_start) do update set hits = public.rate_limits.hits + 1
  returning hits into v_hits;
  return v_hits <= max_hits;
end;
$$;

-- Pending holds past their time become expired, which frees the slot.
create or replace function public.expire_stale_holds(b uuid default null)
returns int language plpgsql security definer set search_path = '' as $$
declare
  v_count int;
begin
  with expired as (
    update public.bookings set status = 'expired'
     where status = 'pending' and hold_expires_at < now()
       and (b is null or business_id = b)
    returning id, business_id
  ), logged as (
    insert into public.booking_events (booking_id, business_id, type)
    select id, business_id, 'expired' from expired
    returning 1
  )
  select count(*) into v_count from logged;
  return v_count;
end;
$$;

-- Studio no-show report: phones with 2 or more no-shows. Runs with the
-- caller's rights, so RLS limits it to the caller's own bookings.
create or replace function public.no_show_report(b uuid, since timestamptz default now() - interval '90 days')
returns table (phone_last4 text, last_name_used text, no_shows int, last_no_show timestamptz)
language sql stable security invoker set search_path = '' as $$
  select right(customer_phone, 4),
         (array_agg(customer_name order by starts_at desc))[1],
         count(*)::int,
         max(starts_at)
  from public.bookings
  where business_id = b and status = 'no_show' and starts_at >= since
  group by customer_phone
  having count(*) >= 2
  order by count(*) desc;
$$;

-- Internal functions: only the secret key (service_role) may call them.
revoke execute on function public.try_consume_usage(uuid, public.usage_metric, int, text, uuid) from public, anon, authenticated;
revoke execute on function public.refund_usage(text) from public, anon, authenticated;
revoke execute on function public.hit_rate_limit(text, int, int) from public, anon, authenticated;
revoke execute on function public.expire_stale_holds(uuid) from public, anon, authenticated;
revoke execute on function public.business_has_access(uuid) from public, anon;
grant execute on function public.try_consume_usage(uuid, public.usage_metric, int, text, uuid) to service_role;
grant execute on function public.refund_usage(text) to service_role;
grant execute on function public.hit_rate_limit(text, int, int) to service_role;
grant execute on function public.expire_stale_holds(uuid) to service_role;
grant execute on function public.business_has_access(uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------
-- 11. Row Level Security: every table on, per-operation policies
-- ELI5: RLS is a bouncer on every table. With it on and no policy, nobody
-- gets in except the secret key. Each policy below lets one kind of
-- request through for one kind of user.
-- ---------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.businesses enable row level security;
alter table public.google_tokens enable row level security;
alter table public.busy_cache enable row level security;
alter table public.services enable row level security;
alter table public.availability enable row level security;
alter table public.days_off enable row level security;
alter table public.bookings enable row level security;
alter table public.booking_events enable row level security;
alter table public.sms_messages enable row level security;
alter table public.sms_opt_outs enable row level security;
alter table public.inbound_sms enable row level security;
alter table public.usage_ledger enable row level security;
alter table public.email_log enable row level security;
alter table public.rate_limits enable row level security;
alter table public.subscriptions enable row level security;
alter table public.stripe_events enable row level security;

-- profiles
create policy "profiles select own" on public.profiles for select to authenticated
  using (id = (select auth.uid()));
create policy "profiles update own" on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- businesses
create policy "businesses select own" on public.businesses for select to authenticated
  using (owner_id = (select auth.uid()));
create policy "businesses insert own" on public.businesses for insert to authenticated
  with check (owner_id = (select auth.uid()));
create policy "businesses update own" on public.businesses for update to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "businesses delete own" on public.businesses for delete to authenticated
  using (owner_id = (select auth.uid()));

-- services
create policy "services select own" on public.services for select to authenticated
  using (public.owns_business(business_id));
create policy "services insert own" on public.services for insert to authenticated
  with check (public.owns_business(business_id));
create policy "services update own" on public.services for update to authenticated
  using (public.owns_business(business_id)) with check (public.owns_business(business_id));
create policy "services delete own" on public.services for delete to authenticated
  using (public.owns_business(business_id));

-- availability
create policy "availability select own" on public.availability for select to authenticated
  using (public.owns_business(business_id));
create policy "availability insert own" on public.availability for insert to authenticated
  with check (public.owns_business(business_id));
create policy "availability update own" on public.availability for update to authenticated
  using (public.owns_business(business_id)) with check (public.owns_business(business_id));
create policy "availability delete own" on public.availability for delete to authenticated
  using (public.owns_business(business_id));

-- days_off
create policy "days_off select own" on public.days_off for select to authenticated
  using (public.owns_business(business_id));
create policy "days_off insert own" on public.days_off for insert to authenticated
  with check (public.owns_business(business_id));
create policy "days_off update own" on public.days_off for update to authenticated
  using (public.owns_business(business_id)) with check (public.owns_business(business_id));
create policy "days_off delete own" on public.days_off for delete to authenticated
  using (public.owns_business(business_id));

-- bookings: owners read and update (status/note only). Inserts and
-- deletes happen only in edge functions with the secret key.
create policy "bookings select own" on public.bookings for select to authenticated
  using (public.owns_business(business_id));
create policy "bookings update own" on public.bookings for update to authenticated
  using (public.owns_business(business_id)) with check (public.owns_business(business_id));

-- read-only history and logs for the owner
create policy "booking_events select own" on public.booking_events for select to authenticated
  using (public.owns_business(business_id));
create policy "sms_messages select own" on public.sms_messages for select to authenticated
  using (public.owns_business(business_id));
create policy "usage_ledger select own" on public.usage_ledger for select to authenticated
  using (public.owns_business(business_id));
create policy "email_log select own" on public.email_log for select to authenticated
  using (public.owns_business(business_id));

-- subscriptions: read your own row. Only the webhook (secret key) writes.
create policy "subscriptions select own" on public.subscriptions for select to authenticated
  using (user_id = (select auth.uid()));

-- No policies on purpose (secret key only): google_tokens, busy_cache,
-- sms_opt_outs, inbound_sms, rate_limits, stripe_events.

-- ---------------------------------------------------------------------
-- 12. Column grants: what the browser may write
-- ELI5: RLS decides which rows you can touch. Grants decide which
-- columns. An owner can rename the shop but can never set their own
-- stripe_account_id or mark Google as connected.
-- ---------------------------------------------------------------------
revoke all on all tables in schema public from anon;

revoke insert, update on public.businesses from authenticated;
grant insert (owner_id, name, handle, trade, timezone, currency, phone, address)
  on public.businesses to authenticated;
grant update (name, handle, trade, timezone, currency, phone, address, logo_path, brand_hex, hide_footer,
  min_notice_minutes, max_days_ahead, slot_step_minutes, reminder_hours, cancel_window_hours,
  refund_policy, notify_owner_email, google_calendar_id)
  on public.businesses to authenticated;

revoke insert, update, delete on public.bookings from authenticated;
grant update (status, owner_note) on public.bookings to authenticated;

revoke insert, update, delete on public.booking_events, public.sms_messages, public.usage_ledger,
  public.email_log, public.subscriptions from authenticated;

-- ---------------------------------------------------------------------
-- 13. Realtime: the Bookings page updates live when a booking arrives
-- ---------------------------------------------------------------------
alter publication supabase_realtime add table public.bookings;

-- ---------------------------------------------------------------------
-- 14. Storage: shop logos
-- ELI5: logos show on the public booking page, so the bucket is public
-- to read. Only the owner can upload into their own folder:
-- logos/<business_id>/logo.png
-- ---------------------------------------------------------------------
-- Reads the business id from a storage path like "<business_id>/logo.png".
-- Returns null (not an error) when the first folder is not a uuid.
create or replace function public.path_business(p text)
returns uuid language plpgsql stable set search_path = '' as $$
begin
  return ((storage.foldername(p))[1])::uuid;
exception when others then
  return null;
end;
$$;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('logos', 'logos', true, 1048576, array['image/png','image/jpeg'])
on conflict (id) do nothing;

create policy "logos read" on storage.objects for select to public
  using (bucket_id = 'logos');
create policy "logos insert own" on storage.objects for insert to authenticated
  with check (bucket_id = 'logos'
    and public.owns_business(public.path_business(name)));
create policy "logos update own" on storage.objects for update to authenticated
  using (bucket_id = 'logos'
    and public.owns_business(public.path_business(name)))
  with check (bucket_id = 'logos'
    and public.owns_business(public.path_business(name)));
create policy "logos delete own" on storage.objects for delete to authenticated
  using (bucket_id = 'logos'
    and public.owns_business(public.path_business(name)));

-- Done. Check it worked with:
-- select tablename, rowsecurity from pg_tables where schemaname = 'public' order by 1;
-- Every row should say true.
`
