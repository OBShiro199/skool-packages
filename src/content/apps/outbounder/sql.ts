// Outbounder single migration, pasted into the Supabase SQL editor.

export const sql = `-- =====================================================================
-- Outbounder: full database migration (run once on a fresh project)
-- Paste this whole file into Supabase > SQL Editor > New query > Run.
-- Order: extensions, enums, tables, indexes, functions, triggers,
-- grants, RLS policies, views, storage, realtime, scheduler helper.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. EXTENSIONS
-- ELI5: extensions are add-ons for Postgres. pg_cron is an alarm clock
-- inside the database, pg_net lets that alarm clock call a URL, and
-- pgcrypto gives us hashing for unsubscribe tokens.
-- ---------------------------------------------------------------------
create extension if not exists pgcrypto with schema extensions;
create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

-- ---------------------------------------------------------------------
-- 1. ENUMS
-- ELI5: an enum is a fixed list of allowed words for a column.
-- A lead can be 'ready' or 'replied', but never 'banana'.
-- ---------------------------------------------------------------------
create type public.campaign_status as enum
  ('draft', 'building', 'reviewing', 'active', 'paused', 'completed', 'archived');

create type public.lead_status as enum
  ('found', 'verifying', 'verified', 'enriching', 'enriched', 'personalising',
   'ready', 'needs_review', 'approved', 'rejected', 'sending', 'completed',
   'replied', 'bounced', 'unsubscribed', 'failed');

create type public.job_status as enum ('queued', 'running', 'succeeded', 'failed', 'cancelled');

create type public.message_direction as enum ('outbound', 'inbound');

create type public.message_status as enum
  ('queued', 'sending', 'sent', 'delivered', 'bounced', 'failed', 'cancelled', 'received');

create type public.reply_class as enum ('interested', 'not_now', 'unsubscribe', 'ooo', 'other');

create type public.domain_status as enum ('pending_dns', 'verifying', 'verified', 'failed');

create type public.inbox_status as enum ('active', 'paused', 'disabled');

create type public.suppression_reason as enum
  ('unsubscribe', 'bounce', 'complaint', 'manual', 'replied_no');

-- What one paid API call was spent on. Every row in usage_ledger has one.
create type public.usage_kind as enum
  ('lead_found', 'email_verified', 'page_scraped', 'ai_write', 'ai_classify', 'email_sent');

-- ---------------------------------------------------------------------
-- 2. PLANS (the limits table)
-- ELI5: one row per plan with its monthly limits. Edge functions read
-- this before every paid call, so changing a number here changes the
-- limit everywhere. Prices live in Stripe, limits live here.
-- ---------------------------------------------------------------------
create table public.plans (
  id text primary key,                         -- 'none', 'trial', 'starter', 'growth'
  name text not null,
  leads int not null,                          -- new leads per month (found or imported)
  ai_writes int not null,                      -- Claude personalisations incl. regenerations
  sends int not null,                          -- cold emails sent per month
  domains int not null,
  inboxes int not null,
  active_campaigns int not null,
  regenerations_per_lead int not null
);

insert into public.plans (id, name, leads, ai_writes, sends, domains, inboxes, active_campaigns, regenerations_per_lead) values
  ('none',    'No plan',   0,   0,    0,    0, 0, 0,  0),
  ('trial',   'Trial',     50,  75,   100,  1, 2, 1,  3),
  ('starter', 'Starter',   350, 525,  1000, 2, 3, 3,  3),
  ('growth',  'Growth',    900, 1350, 2700, 3, 6, 10, 5);

-- ---------------------------------------------------------------------
-- 3. PROFILES
-- ELI5: one row per person who signs up. A trigger creates it the
-- moment Supabase Auth creates the user, so it always exists.
-- agentmail_pod_id is that user's private "folder" inside AgentMail.
-- ---------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  company_name text,
  website_domain text,
  sender_name text,
  signature text,
  physical_address text,
  offer text,
  proof text,
  timezone text not null default 'Europe/London',
  icp jsonb not null default '{}'::jsonb,
  agentmail_pod_id text unique,
  onboarded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 4. SENDING DOMAINS AND INBOXES
-- ELI5: a sending domain is the separate web address you send from
-- (tryacme.com). Inboxes are the email addresses on it (olly@tryacme.com).
-- AgentMail hosts both; we keep their ids here.
-- ---------------------------------------------------------------------
create table public.sending_domains (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  domain text not null check (domain ~ '^[a-z0-9.-]+\\.[a-z]{2,}$'),
  agentmail_domain_id text unique,
  status public.domain_status not null default 'pending_dns',
  status_reason text,
  dns_records jsonb not null default '[]'::jsonb,
  last_checked_at timestamptz,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, domain)
);

-- daily_cap is the user's ceiling (max 30). The real cap each day comes
-- from inbox_effective_cap(): 20 a day to start, ramping up.
create table public.inboxes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  domain_id uuid not null references public.sending_domains (id) on delete cascade,
  agentmail_inbox_id text unique,
  email text not null unique,
  display_name text not null,
  daily_cap int not null default 30 check (daily_cap between 5 and 30),
  sent_today int not null default 0,
  sent_today_date date not null default current_date,
  status public.inbox_status not null default 'active',
  paused_until timestamptz,
  paused_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 5. CAMPAIGNS, SEQUENCES, STEPS
-- ELI5: a campaign is "who to email" + "what to say" + "from where".
-- The sequence is the list of up to 3 emails sent days apart.
-- ---------------------------------------------------------------------
create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  status public.campaign_status not null default 'draft',
  icp jsonb not null default '{}'::jsonb,
  target_lead_count int not null default 25 check (target_lead_count between 1 and 500),
  send_days int[] not null default '{1,2,3,4}',          -- 1 = Monday ... 7 = Sunday
  send_window_start time not null default '08:00',
  send_window_end time not null default '11:30',
  fallback_timezone text not null default 'Europe/London',
  paused_reason text,                                    -- null, 'user', 'bounce_rate', 'complaint', 'no_access'
  launched_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (send_window_end > send_window_start)
);

create table public.campaign_inboxes (
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  inbox_id uuid not null references public.inboxes (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  primary key (campaign_id, inbox_id)
);

create table public.sequences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  campaign_id uuid not null unique references public.campaigns (id) on delete cascade,
  name text not null default 'Main sequence',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.sequence_steps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  sequence_id uuid not null references public.sequences (id) on delete cascade,
  step_number int not null check (step_number between 1 and 3),
  delay_days int not null default 3 check (delay_days between 0 and 30),
  subject_template text not null default '',
  body_template text not null default '',
  new_thread boolean not null default false,
  updated_at timestamptz not null default now(),
  unique (sequence_id, step_number)
);

-- ---------------------------------------------------------------------
-- 6. LEAD JOBS
-- ELI5: finding 250 leads takes minutes, so it never runs inside one
-- web request. The button writes a job row; a background worker picks
-- it up, pulls one page of results at a time, and updates progress.
-- The idempotency key stops a double-click from starting two jobs.
-- ---------------------------------------------------------------------
create table public.lead_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  status public.job_status not null default 'queued',
  requested int not null check (requested between 1 and 250),
  inserted int not null default 0,
  skipped_duplicates int not null default 0,
  skipped_no_email int not null default 0,
  next_page int not null default 1,
  pages_done int not null default 0,
  idempotency_key text not null,
  attempts int not null default 0,
  next_attempt_at timestamptz not null default now(),
  locked_at timestamptz,
  last_error text,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, idempotency_key)
);

-- ---------------------------------------------------------------------
-- 7. LEADS AND ENRICHMENT
-- ELI5: a lead is one person you might email. Enrichment is what we
-- learned from their website and what Claude wrote for them.
-- status is the lead's place in the pipeline (see PRD section 9).
-- ---------------------------------------------------------------------
create table public.leads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  job_id uuid references public.lead_jobs (id) on delete set null,
  source text not null default 'prospeo' check (source in ('prospeo', 'csv')),
  email text not null check (position('@' in email) > 1),
  first_name text,
  last_name text,
  title text,
  company_name text,
  company_domain text,
  linkedin_url text,
  city text,
  country text,
  timezone text,
  status public.lead_status not null default 'found',
  prospeo_person_id text,
  verify_result text,
  current_step int not null default 0,
  assigned_inbox_id uuid references public.inboxes (id) on delete set null,
  attempts int not null default 0,
  next_attempt_at timestamptz not null default now(),
  last_error text,
  locked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.lead_enrichment (
  lead_id uuid primary key references public.leads (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  source_urls text[] not null default '{}',
  site_markdown text,
  site_summary text,
  ai_subject text,
  ai_first_line text,
  ai_pain text,
  ai_body text,
  ai_signal text,
  ai_confidence numeric(3,2),
  ai_skip_reason text,
  final_subject text,
  final_body text,
  edited boolean not null default false,
  regenerations int not null default 0,
  model text,
  prompt_version text,
  scraped_at timestamptz,
  personalised_at timestamptz,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 8. MESSAGES
-- ELI5: every email, both the ones we send (outbound) and the replies
-- we get back (inbound). The scheduler reads 'queued' rows.
-- ---------------------------------------------------------------------
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  campaign_id uuid references public.campaigns (id) on delete cascade,
  lead_id uuid references public.leads (id) on delete cascade,
  inbox_id uuid references public.inboxes (id) on delete set null,
  direction public.message_direction not null,
  status public.message_status not null,
  step_number int,
  is_manual boolean not null default false,
  subject text,
  body_text text,
  from_email text,
  to_email text,
  scheduled_for timestamptz,
  sent_at timestamptz,
  received_at timestamptz,
  attempts int not null default 0,
  agentmail_message_id text unique,
  agentmail_thread_id text,
  in_reply_to text,
  classification public.reply_class,
  classification_confidence numeric(3,2),
  classification_summary text,
  follow_up_date date,
  read_at timestamptz,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 9. SUPPRESSION, UNSUBSCRIBE TOKENS, EVENTS
-- ELI5: the suppression list is the "never email again" list. It is
-- checked before every single send, in every campaign.
-- ---------------------------------------------------------------------
create table public.suppression_list (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  email text,
  domain text,
  reason public.suppression_reason not null,
  source text,
  created_at timestamptz not null default now(),
  check (email is not null or domain is not null)
);

-- One token per sent email. We store only the SHA-256 hash, so a leaked
-- database cannot be used to unsubscribe people.
create table public.unsubscribe_tokens (
  token_hash text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  lead_id uuid not null references public.leads (id) on delete cascade,
  message_id uuid references public.messages (id) on delete set null,
  email text not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.events (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users (id) on delete cascade,
  campaign_id uuid references public.campaigns (id) on delete cascade,
  lead_id uuid references public.leads (id) on delete set null,
  type text not null,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 10. USAGE LEDGER, EMAIL LOG, WEBHOOK EVENTS
-- ELI5: usage_ledger is a receipt book. Every paid API call (Prospeo,
-- MillionVerifier, Firecrawl, Claude, AgentMail) writes one line with
-- what it cost. Limits are checked against it BEFORE the call, so one
-- user can never run up your bill. Refunds are negative lines.
-- ---------------------------------------------------------------------
create table public.usage_ledger (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  kind public.usage_kind not null,
  quantity int not null,                       -- negative = refund
  unit_cost_usd numeric(10,5) not null default 0,
  period_start date not null default date_trunc('month', now())::date,
  ref_id uuid,                                 -- lead, message or job id
  idempotency_key text not null unique,
  created_at timestamptz not null default now()
);

-- Every app email Resend sends (welcome, alerts, digests). dedupe_key
-- stops the same alert going out twice when a webhook retries.
create table public.email_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade,
  kind text not null,                          -- welcome, interested_reply, digest, paused, trial_ending...
  to_email text not null,
  resend_id text,
  status text not null default 'queued' check (status in ('queued', 'sent', 'failed')),
  error text,
  dedupe_key text not null unique,
  created_at timestamptz not null default now()
);

-- AgentMail (and any future provider) webhook ids we already handled.
create table public.webhook_events (
  provider text not null,
  event_id text not null,
  type text not null,
  received_at timestamptz not null default now(),
  primary key (provider, event_id)
);

-- ---------------------------------------------------------------------
-- 11. BILLING (written only by the Stripe webhook with the secret key)
-- ELI5: Stripe tells us who paid and for which plan. We copy that here.
-- The browser can read its own row but never write it.
-- ---------------------------------------------------------------------
create table public.subscriptions (
  user_id uuid primary key references auth.users (id) on delete cascade,
  stripe_customer_id text unique not null,
  stripe_subscription_id text unique,
  status text not null,                        -- trialing, active, past_due, canceled...
  plan text not null default 'starter' check (plan in ('starter', 'growth')),
  billing_interval text not null default 'month' check (billing_interval in ('month', 'year')),
  price_id text,
  trial_end timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  updated_at timestamptz not null default now()
);

create table public.stripe_events (
  id text primary key,                         -- evt_...
  type text not null,
  received_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 12. INDEXES
-- ELI5: an index is the alphabetical tab in a filing cabinet. Every
-- foreign key gets one so joins and RLS checks stay fast at 1,000 users.
-- ---------------------------------------------------------------------
create index sending_domains_user_idx on public.sending_domains (user_id);
create index inboxes_user_idx on public.inboxes (user_id);
create index inboxes_domain_idx on public.inboxes (domain_id);
create index campaigns_user_status_idx on public.campaigns (user_id, status);
create index campaign_inboxes_inbox_idx on public.campaign_inboxes (inbox_id);
create index campaign_inboxes_user_idx on public.campaign_inboxes (user_id);
create index sequences_user_idx on public.sequences (user_id);
create index sequence_steps_user_idx on public.sequence_steps (user_id);
create index lead_jobs_user_idx on public.lead_jobs (user_id);
create index lead_jobs_campaign_idx on public.lead_jobs (campaign_id);
create index lead_jobs_due_idx on public.lead_jobs (next_attempt_at) where status in ('queued', 'running');
-- One person once per user, across every campaign.
create unique index leads_user_email_uniq on public.leads (user_id, lower(email));
create index leads_campaign_status_idx on public.leads (campaign_id, status);
create index leads_job_idx on public.leads (job_id);
create index leads_inbox_idx on public.leads (assigned_inbox_id);
create index leads_pipeline_idx on public.leads (status, next_attempt_at);
create index leads_company_domain_idx on public.leads (user_id, company_domain);
create index lead_enrichment_user_idx on public.lead_enrichment (user_id);
create index messages_user_idx on public.messages (user_id, created_at desc);
create index messages_campaign_idx on public.messages (campaign_id);
create index messages_lead_idx on public.messages (lead_id, created_at);
create index messages_inbox_idx on public.messages (inbox_id, sent_at desc);
create index messages_due_idx on public.messages (scheduled_for) where status = 'queued';
create index messages_thread_idx on public.messages (agentmail_thread_id);
create index messages_inbound_idx on public.messages (user_id, direction, classification, created_at desc);
create unique index suppression_user_email_uniq on public.suppression_list (user_id, lower(email)) where email is not null;
create unique index suppression_user_domain_uniq on public.suppression_list (user_id, lower(domain)) where domain is not null;
create index suppression_user_idx on public.suppression_list (user_id);
create index unsubscribe_tokens_user_idx on public.unsubscribe_tokens (user_id);
create index unsubscribe_tokens_lead_idx on public.unsubscribe_tokens (lead_id);
create index unsubscribe_tokens_message_idx on public.unsubscribe_tokens (message_id);
create index events_user_type_idx on public.events (user_id, type, created_at desc);
create index events_campaign_idx on public.events (campaign_id);
create index events_lead_idx on public.events (lead_id);
create index usage_ledger_user_period_idx on public.usage_ledger (user_id, period_start, kind);
create index email_log_user_idx on public.email_log (user_id, created_at desc);

-- ---------------------------------------------------------------------
-- 13. FUNCTIONS
-- ELI5: small programs that live in the database. They all use
-- security definer + an empty search_path, which means they run with
-- fixed permissions and cannot be tricked into using a fake table.
-- ---------------------------------------------------------------------

-- 13.1 updated_at stamp, used by triggers on every table that has it.
create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- 13.2 New user: create the profile row.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''));
  return new;
end;
$$;

-- 13.3 The paywall. Trialing or active gets in, everyone else waits outside.
create or replace function public.has_active_access(uid uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.subscriptions s
    where s.user_id = uid and s.status in ('trialing', 'active')
  );
$$;

-- 13.4 Which plan row applies right now: trial limits while trialing.
create or replace function public.current_plan(uid uuid)
returns text language sql stable security definer set search_path = '' as $$
  select coalesce((
    select case when s.status = 'trialing' then 'trial'
                when s.status = 'active' then s.plan
                else 'none' end
    from public.subscriptions s where s.user_id = uid), 'none');
$$;

create or replace function public.plan_limits(uid uuid)
returns setof public.plans language sql stable security definer set search_path = '' as $$
  select p.* from public.plans p where p.id = public.current_plan(uid);
$$;

-- 13.5 Metering. Call BEFORE every paid API call. Returns false when the
-- call would go over the plan limit for this month, and writes nothing.
-- The advisory lock makes two parallel workers queue up, so a user can
-- never squeeze past the limit with simultaneous requests.
-- Same idempotency key twice = returns true and writes nothing new.
create or replace function public.reserve_usage(
  p_user uuid, p_kind public.usage_kind, p_qty int, p_unit_cost numeric,
  p_idem text, p_ref uuid default null)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  v_limit int;
  v_used int;
  v_period date := date_trunc('month', now())::date;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_user::text || ':' || p_kind::text, 0));
  if exists (select 1 from public.usage_ledger where idempotency_key = p_idem) then
    return true;
  end if;
  if p_qty > 0 then
    select case p_kind
             when 'lead_found' then l.leads
             when 'ai_write' then l.ai_writes
             when 'email_sent' then l.sends
             else null end
      into v_limit
      from public.plan_limits(p_user) l;
    if p_kind in ('lead_found', 'ai_write', 'email_sent') then
      select coalesce(sum(quantity), 0) into v_used
        from public.usage_ledger
       where user_id = p_user and kind = p_kind and period_start = v_period;
      if v_used + p_qty > coalesce(v_limit, 0) then
        return false;
      end if;
    end if;
  end if;
  insert into public.usage_ledger (user_id, kind, quantity, unit_cost_usd, period_start, ref_id, idempotency_key)
  values (p_user, p_kind, p_qty, p_unit_cost, v_period, p_ref, p_idem);
  return true;
end;
$$;

-- 13.6 Claim a batch of leads for one pipeline stage without two workers
-- grabbing the same rows (for update skip locked). Respects backoff.
create or replace function public.claim_leads(p_from public.lead_status, p_to public.lead_status, p_limit int)
returns setof public.leads language sql security definer set search_path = '' as $$
  update public.leads l
     set status = p_to, locked_at = now(), updated_at = now()
   where l.id in (
     select id from public.leads
      where status = p_from and next_attempt_at <= now()
      order by created_at
      limit p_limit
      for update skip locked)
  returning l.*;
$$;

-- 13.7 Put leads stuck in a working state back with exponential backoff
-- (2, 4, 8 minutes), or fail them after 3 tries.
create or replace function public.release_stuck_leads()
returns int language plpgsql security definer set search_path = '' as $$
declare n int;
begin
  update public.leads
     set status = case
                    when attempts + 1 >= 3 then 'failed'::public.lead_status
                    when status = 'verifying' then 'found'::public.lead_status
                    when status = 'enriching' then 'verified'::public.lead_status
                    else 'enriched'::public.lead_status
                  end,
         attempts = attempts + 1,
         next_attempt_at = now() + make_interval(mins => power(2, attempts + 1)::int),
         last_error = coalesce(last_error, 'timed out'),
         locked_at = null
   where status in ('verifying', 'enriching', 'personalising')
     and locked_at < now() - interval '15 minutes';
  get diagnostics n = row_count;
  return n;
end;
$$;

-- 13.8 Claim one lead job for the find-leads worker.
create or replace function public.claim_lead_job()
returns setof public.lead_jobs language sql security definer set search_path = '' as $$
  update public.lead_jobs j
     set status = 'running', locked_at = now(), started_at = coalesce(started_at, now()), updated_at = now()
   where j.id = (
     select id from public.lead_jobs
      where (status = 'queued' or (status = 'running' and locked_at < now() - interval '5 minutes'))
        and next_attempt_at <= now()
      order by created_at
      limit 1
      for update skip locked)
  returning j.*;
$$;

-- 13.9 Claim due outbound messages for send-due-emails.
create or replace function public.claim_due_messages(p_limit int)
returns setof public.messages language sql security definer set search_path = '' as $$
  update public.messages m
     set status = 'sending', updated_at = now()
   where m.id in (
     select id from public.messages
      where status = 'queued' and direction = 'outbound' and scheduled_for <= now()
      order by scheduled_for
      limit p_limit
      for update skip locked)
  returning m.*;
$$;

-- 13.10 How many cold emails this inbox may send today.
-- Ramp: 20 a day for the first 14 days, 25 for days 14 to 27, then up
-- to daily_cap (max 30). Held at 20 if the last 200 sends bounced over
-- 2% or there was any complaint in 14 days.
create or replace function public.inbox_effective_cap(p_inbox uuid)
returns int language plpgsql stable security definer set search_path = '' as $$
declare
  v_inbox public.inboxes;
  v_age int;
  v_ramp int;
  v_sent int;
  v_bounced int;
  v_complaints int;
begin
  select * into v_inbox from public.inboxes where id = p_inbox;
  if not found or v_inbox.status <> 'active' then return 0; end if;
  v_age := (current_date - v_inbox.created_at::date);
  v_ramp := case when v_age < 14 then 20 when v_age < 28 then 25 else 30 end;

  select count(*), count(*) filter (where status = 'bounced')
    into v_sent, v_bounced
    from (select status from public.messages
           where inbox_id = p_inbox and direction = 'outbound' and sent_at is not null
           order by sent_at desc limit 200) recent;
  select count(*) into v_complaints
    from public.suppression_list s
    join public.messages m on lower(m.to_email) = lower(s.email) and m.inbox_id = p_inbox
   where s.reason = 'complaint' and s.created_at > now() - interval '14 days';

  if v_complaints > 0 or (v_sent >= 50 and v_bounced::numeric / v_sent > 0.02) then
    v_ramp := 20;
  end if;
  return least(v_inbox.daily_cap, v_ramp);
end;
$$;

-- 13.11 Launch: checks everything, then queues step 1 for approved leads.
-- Called from the browser with the user's own token.
create or replace function public.launch_campaign(p_campaign uuid)
returns int language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_c public.campaigns;
  v_n int;
begin
  select * into v_c from public.campaigns where id = p_campaign and user_id = v_uid;
  if not found then raise exception 'campaign not found'; end if;
  if not public.has_active_access(v_uid) then raise exception 'no_access'; end if;
  if not exists (select 1 from public.campaign_inboxes ci
                   join public.inboxes i on i.id = ci.inbox_id
                   join public.sending_domains d on d.id = i.domain_id
                  where ci.campaign_id = p_campaign and i.status = 'active' and d.status = 'verified') then
    raise exception 'no_verified_inbox';
  end if;
  if (select count(*) from public.leads where campaign_id = p_campaign and status = 'approved') < 10 then
    raise exception 'need_10_approved';
  end if;
  if exists (select 1 from public.profiles where id = v_uid and (coalesce(physical_address, '') = '' or coalesce(sender_name, '') = '')) then
    raise exception 'missing_sender_details';
  end if;
  if (select count(*) from public.campaigns where user_id = v_uid and status = 'active') >=
     (select active_campaigns from public.plan_limits(v_uid)) then
    raise exception 'campaign_limit';
  end if;

  -- Tell the guard triggers this change comes from a checked function.
  perform set_config('outbounder.trusted', 'on', true);
  insert into public.messages (user_id, campaign_id, lead_id, direction, status, step_number, subject, body_text, to_email, scheduled_for)
  select l.user_id, l.campaign_id, l.id, 'outbound', 'queued', 1, e.final_subject, e.final_body, l.email, now()
    from public.leads l join public.lead_enrichment e on e.lead_id = l.id
   where l.campaign_id = p_campaign and l.status = 'approved'
     and not exists (select 1 from public.messages m where m.lead_id = l.id and m.step_number = 1);
  get diagnostics v_n = row_count;

  update public.campaigns set status = 'active', launched_at = coalesce(launched_at, now()), paused_reason = null
   where id = p_campaign;
  insert into public.events (user_id, campaign_id, type, data)
  values (v_uid, p_campaign, 'campaign_launched', jsonb_build_object('queued', v_n));
  return v_n;
end;
$$;

-- 13.12 Relabel a reply from the unified inbox. Unsubscribe also
-- suppresses the email and stops every queued message to it.
create or replace function public.relabel_reply(p_message uuid, p_label public.reply_class)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_m public.messages;
begin
  select * into v_m from public.messages where id = p_message and user_id = v_uid and direction = 'inbound';
  if not found then raise exception 'message not found'; end if;
  perform set_config('outbounder.trusted', 'on', true);
  update public.messages set classification = p_label, classification_confidence = 1 where id = p_message;
  insert into public.events (user_id, campaign_id, lead_id, type, data)
  values (v_uid, v_m.campaign_id, v_m.lead_id, 'reply_relabelled',
          jsonb_build_object('from', v_m.classification, 'to', p_label));
  if p_label = 'unsubscribe' and v_m.from_email is not null then
    insert into public.suppression_list (user_id, email, reason, source)
    values (v_uid, lower(v_m.from_email), 'unsubscribe', 'relabel')
    on conflict do nothing;
    update public.messages set status = 'cancelled'
     where user_id = v_uid and status = 'queued' and lower(to_email) = lower(v_m.from_email);
    update public.leads set status = 'unsubscribed' where id = v_m.lead_id and user_id = v_uid;
  end if;
end;
$$;

-- 13.13 Unsubscribe by token hash. Used by the /u/[token] page and the
-- one-click POST, both on the server with the secret key.
create or replace function public.unsubscribe_by_token(p_hash text)
returns text language plpgsql security definer set search_path = '' as $$
declare v_t public.unsubscribe_tokens;
begin
  select * into v_t from public.unsubscribe_tokens where token_hash = p_hash;
  if not found then return 'not_found'; end if;
  update public.unsubscribe_tokens set used_at = coalesce(used_at, now()) where token_hash = p_hash;
  insert into public.suppression_list (user_id, email, reason, source)
  values (v_t.user_id, lower(v_t.email), 'unsubscribe', 'link')
  on conflict do nothing;
  update public.messages set status = 'cancelled'
   where user_id = v_t.user_id and status = 'queued' and lower(to_email) = lower(v_t.email);
  update public.leads set status = 'unsubscribed'
   where user_id = v_t.user_id and lower(email) = lower(v_t.email)
     and status not in ('replied', 'bounced');
  return 'ok';
end;
$$;

-- 13.14 Browser users may only approve, reject or un-approve leads.
-- Every other status change belongs to the edge functions.
create or replace function public.guard_lead_update()
returns trigger language plpgsql set search_path = '' as $$
begin
  if (select auth.role()) = 'authenticated' and new.status is distinct from old.status
     and coalesce(current_setting('outbounder.trusted', true), '') <> 'on' then
    if not (old.status in ('ready', 'needs_review', 'approved')
            and new.status in ('approved', 'rejected', 'ready')) then
      raise exception 'Not allowed to move lead from % to %', old.status, new.status;
    end if;
  end if;
  return new;
end;
$$;

-- 13.15 Campaign status: users may pause, resume a user pause, or archive.
-- Launch goes through launch_campaign(). Auto pauses need a fix first.
create or replace function public.guard_campaign_update()
returns trigger language plpgsql set search_path = '' as $$
begin
  if (select auth.role()) = 'authenticated' and new.status is distinct from old.status
     and coalesce(current_setting('outbounder.trusted', true), '') <> 'on' then
    if new.status = 'paused' and old.status = 'active' then
      new.paused_reason := 'user';
    elsif new.status = 'active' and old.status = 'paused' and coalesce(old.paused_reason, 'user') = 'user' then
      new.paused_reason := null;
    elsif new.status = 'archived' then
      null;
    elsif new.status = 'building' and old.status = 'draft' then
      null;
    else
      raise exception 'Not allowed to move campaign from % to %', old.status, new.status;
    end if;
  end if;
  return new;
end;
$$;

-- 13.16 CSV imports count against the monthly lead limit, so nobody can
-- dodge the cap (and your verify, scrape and AI bill) by uploading.
create or replace function public.meter_imported_lead()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.role()) = 'authenticated' then
    if not public.has_active_access(new.user_id) then
      raise exception 'no_access';
    end if;
    if not public.reserve_usage(new.user_id, 'lead_found', 1, 0, 'csv:' || new.id::text, new.id) then
      raise exception 'limit_reached: monthly lead limit';
    end if;
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- 14. TRIGGERS
-- ---------------------------------------------------------------------
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create trigger profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger domains_updated_at before update on public.sending_domains for each row execute function public.set_updated_at();
create trigger inboxes_updated_at before update on public.inboxes for each row execute function public.set_updated_at();
create trigger campaigns_updated_at before update on public.campaigns for each row execute function public.set_updated_at();
create trigger sequences_updated_at before update on public.sequences for each row execute function public.set_updated_at();
create trigger steps_updated_at before update on public.sequence_steps for each row execute function public.set_updated_at();
create trigger lead_jobs_updated_at before update on public.lead_jobs for each row execute function public.set_updated_at();
create trigger leads_updated_at before update on public.leads for each row execute function public.set_updated_at();
create trigger enrichment_updated_at before update on public.lead_enrichment for each row execute function public.set_updated_at();
create trigger messages_updated_at before update on public.messages for each row execute function public.set_updated_at();
create trigger subscriptions_updated_at before update on public.subscriptions for each row execute function public.set_updated_at();

create trigger leads_guard before update on public.leads for each row execute function public.guard_lead_update();
create trigger campaigns_guard before update on public.campaigns for each row execute function public.guard_campaign_update();
create trigger leads_meter_csv before insert on public.leads for each row execute function public.meter_imported_lead();

-- ---------------------------------------------------------------------
-- 15. GRANTS
-- ELI5: RLS decides WHICH rows you can touch. Column grants decide
-- WHICH columns. Users can rename an inbox but never reset its
-- sent_today counter, and can edit an email but never its recipient.
-- ---------------------------------------------------------------------
revoke update on public.profiles from authenticated, anon;
grant update (full_name, company_name, website_domain, sender_name, signature, physical_address,
              offer, proof, timezone, icp, onboarded_at) on public.profiles to authenticated;

revoke update on public.inboxes from authenticated, anon;
grant update (display_name, daily_cap, status) on public.inboxes to authenticated;

revoke update on public.campaigns from authenticated, anon;
grant update (name, status, icp, target_lead_count, send_days, send_window_start, send_window_end,
              fallback_timezone) on public.campaigns to authenticated;

revoke update on public.leads from authenticated, anon;
grant update (status) on public.leads to authenticated;

revoke update on public.lead_enrichment from authenticated, anon;
grant update (final_subject, final_body, edited) on public.lead_enrichment to authenticated;

revoke update on public.messages from authenticated, anon;
grant update (read_at) on public.messages to authenticated;

-- Server-only helpers: nobody but the secret key may run them.
revoke execute on function public.reserve_usage(uuid, public.usage_kind, int, numeric, text, uuid) from public, anon, authenticated;
revoke execute on function public.claim_leads(public.lead_status, public.lead_status, int) from public, anon, authenticated;
revoke execute on function public.release_stuck_leads() from public, anon, authenticated;
revoke execute on function public.claim_lead_job() from public, anon, authenticated;
revoke execute on function public.claim_due_messages(int) from public, anon, authenticated;
revoke execute on function public.inbox_effective_cap(uuid) from public, anon;
revoke execute on function public.unsubscribe_by_token(text) from public, anon, authenticated;
revoke execute on function public.plan_limits(uuid) from public, anon;
revoke execute on function public.has_active_access(uuid) from public, anon;
revoke execute on function public.current_plan(uuid) from public, anon;
revoke execute on function public.launch_campaign(uuid) from public, anon;
revoke execute on function public.relabel_reply(uuid, public.reply_class) from public, anon;
grant execute on function public.reserve_usage(uuid, public.usage_kind, int, numeric, text, uuid) to service_role;
grant execute on function public.claim_leads(public.lead_status, public.lead_status, int) to service_role;
grant execute on function public.release_stuck_leads() to service_role;
grant execute on function public.claim_lead_job() to service_role;
grant execute on function public.claim_due_messages(int) to service_role;
grant execute on function public.unsubscribe_by_token(text) to service_role;
grant execute on function public.inbox_effective_cap(uuid) to authenticated, service_role;
grant execute on function public.plan_limits(uuid) to authenticated, service_role;
grant execute on function public.has_active_access(uuid) to authenticated, service_role;
grant execute on function public.current_plan(uuid) to authenticated, service_role;
grant execute on function public.launch_campaign(uuid) to authenticated;
grant execute on function public.relabel_reply(uuid, public.reply_class) to authenticated;

-- ---------------------------------------------------------------------
-- 16. ROW LEVEL SECURITY
-- ELI5: RLS is a guard on every table that checks "is this your row?"
-- on every read and write. (select auth.uid()) is the signed-in user.
-- One policy per action. No 'for all'. Tables with no policy for an
-- action refuse it (only the secret key gets through).
-- ---------------------------------------------------------------------
alter table public.plans enable row level security;
alter table public.profiles enable row level security;
alter table public.sending_domains enable row level security;
alter table public.inboxes enable row level security;
alter table public.campaigns enable row level security;
alter table public.campaign_inboxes enable row level security;
alter table public.sequences enable row level security;
alter table public.sequence_steps enable row level security;
alter table public.lead_jobs enable row level security;
alter table public.leads enable row level security;
alter table public.lead_enrichment enable row level security;
alter table public.messages enable row level security;
alter table public.suppression_list enable row level security;
alter table public.unsubscribe_tokens enable row level security;
alter table public.events enable row level security;
alter table public.usage_ledger enable row level security;
alter table public.email_log enable row level security;
alter table public.webhook_events enable row level security;
alter table public.subscriptions enable row level security;
alter table public.stripe_events enable row level security;

-- plans: anyone signed in can read the limits (the pricing page shows them).
create policy plans_select_all on public.plans for select to authenticated using (true);

-- profiles (id is the user id). Insert happens in the trigger.
create policy profiles_select_own on public.profiles for select to authenticated
  using ((select auth.uid()) = id);
create policy profiles_update_own on public.profiles for update to authenticated
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

-- Read-only to the user, written by the server:
create policy usage_select_own on public.usage_ledger for select to authenticated
  using ((select auth.uid()) = user_id);
create policy email_log_select_own on public.email_log for select to authenticated
  using ((select auth.uid()) = user_id);
create policy subscriptions_select_own on public.subscriptions for select to authenticated
  using ((select auth.uid()) = user_id);
create policy events_select_own on public.events for select to authenticated
  using ((select auth.uid()) = user_id);
create policy lead_jobs_select_own on public.lead_jobs for select to authenticated
  using ((select auth.uid()) = user_id);

-- unsubscribe_tokens, webhook_events, stripe_events: no policies at all.

-- Domains and inboxes: creation goes through setup-domain so AgentMail
-- and the database stay in sync. Users can read, pause and rename.
create policy domains_select_own on public.sending_domains for select to authenticated
  using ((select auth.uid()) = user_id);
create policy domains_delete_own on public.sending_domains for delete to authenticated
  using ((select auth.uid()) = user_id
         and not exists (select 1 from public.inboxes i where i.domain_id = sending_domains.id));
create policy inboxes_select_own on public.inboxes for select to authenticated
  using ((select auth.uid()) = user_id);
create policy inboxes_update_own on public.inboxes for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id and status <> 'disabled');

-- Campaigns and their sequences: full CRUD on your own rows.
create policy campaigns_select_own on public.campaigns for select to authenticated
  using ((select auth.uid()) = user_id);
create policy campaigns_insert_own on public.campaigns for insert to authenticated
  with check ((select auth.uid()) = user_id and status = 'draft');
create policy campaigns_update_own on public.campaigns for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy campaigns_delete_own on public.campaigns for delete to authenticated
  using ((select auth.uid()) = user_id and status in ('draft', 'archived'));

create policy ci_select_own on public.campaign_inboxes for select to authenticated
  using ((select auth.uid()) = user_id);
create policy ci_insert_own on public.campaign_inboxes for insert to authenticated
  with check ((select auth.uid()) = user_id
    and exists (select 1 from public.inboxes i where i.id = inbox_id and i.user_id = (select auth.uid()))
    and exists (select 1 from public.campaigns c where c.id = campaign_id and c.user_id = (select auth.uid())));
create policy ci_delete_own on public.campaign_inboxes for delete to authenticated
  using ((select auth.uid()) = user_id);

create policy sequences_select_own on public.sequences for select to authenticated
  using ((select auth.uid()) = user_id);
create policy sequences_insert_own on public.sequences for insert to authenticated
  with check ((select auth.uid()) = user_id
    and exists (select 1 from public.campaigns c where c.id = campaign_id and c.user_id = (select auth.uid())));
create policy sequences_update_own on public.sequences for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy sequences_delete_own on public.sequences for delete to authenticated
  using ((select auth.uid()) = user_id);

create policy steps_select_own on public.sequence_steps for select to authenticated
  using ((select auth.uid()) = user_id);
create policy steps_insert_own on public.sequence_steps for insert to authenticated
  with check ((select auth.uid()) = user_id
    and exists (select 1 from public.sequences s where s.id = sequence_id and s.user_id = (select auth.uid())));
create policy steps_update_own on public.sequence_steps for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy steps_delete_own on public.sequence_steps for delete to authenticated
  using ((select auth.uid()) = user_id);

-- Leads: read, approve/reject (trigger-guarded), delete, and CSV insert
-- (metered by the leads_meter_csv trigger).
create policy leads_select_own on public.leads for select to authenticated
  using ((select auth.uid()) = user_id);
create policy leads_insert_own on public.leads for insert to authenticated
  with check ((select auth.uid()) = user_id and status = 'found' and source = 'csv'
    and exists (select 1 from public.campaigns c where c.id = campaign_id and c.user_id = (select auth.uid())));
create policy leads_update_own on public.leads for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy leads_delete_own on public.leads for delete to authenticated
  using ((select auth.uid()) = user_id);

create policy enrichment_select_own on public.lead_enrichment for select to authenticated
  using ((select auth.uid()) = user_id);
create policy enrichment_update_own on public.lead_enrichment for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- Messages: read your own; mark as read; insert a manual reply only to a
-- lead of yours who replied, from the inbox that lead was assigned.
create policy messages_select_own on public.messages for select to authenticated
  using ((select auth.uid()) = user_id);
create policy messages_insert_manual on public.messages for insert to authenticated
  with check ((select auth.uid()) = user_id and direction = 'outbound'
              and status = 'queued' and is_manual = true
              and exists (select 1 from public.leads l
                           where l.id = lead_id and l.user_id = (select auth.uid())
                             and l.status = 'replied' and l.assigned_inbox_id = inbox_id));
create policy messages_update_own on public.messages for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy suppression_select_own on public.suppression_list for select to authenticated
  using ((select auth.uid()) = user_id);
create policy suppression_insert_own on public.suppression_list for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy suppression_delete_own on public.suppression_list for delete to authenticated
  using ((select auth.uid()) = user_id and reason in ('manual', 'replied_no'));

-- ---------------------------------------------------------------------
-- 17. VIEWS (security_invoker = the view obeys the caller's RLS)
-- ELI5: a view is a saved query. security_invoker means it shows you
-- only your own rows, same as the tables underneath.
-- ---------------------------------------------------------------------
create view public.campaign_stats with (security_invoker = true) as
select c.id as campaign_id,
       c.user_id,
       (select count(*) from public.leads l where l.campaign_id = c.id) as leads,
       (select count(*) from public.leads l where l.campaign_id = c.id and l.status in ('ready', 'needs_review')) as to_review,
       (select count(*) from public.leads l where l.campaign_id = c.id and l.status = 'approved') as approved,
       count(m.id) filter (where m.direction = 'outbound' and m.status in ('sent', 'delivered', 'bounced')) as sent,
       count(m.id) filter (where m.status = 'bounced') as bounced,
       count(m.id) filter (where m.direction = 'inbound') as replies,
       count(m.id) filter (where m.classification = 'interested') as interested
from public.campaigns c
left join public.messages m on m.campaign_id = c.id
group by c.id, c.user_id;

create view public.inbox_health with (security_invoker = true) as
select i.id as inbox_id,
       i.user_id,
       i.email,
       i.daily_cap,
       i.sent_today,
       count(m.id) filter (where m.sent_at > now() - interval '30 days') as sent_30d,
       count(m.id) filter (where m.status = 'bounced' and m.sent_at > now() - interval '30 days') as bounced_30d
from public.inboxes i
left join public.messages m on m.inbox_id = i.id and m.direction = 'outbound'
group by i.id, i.user_id, i.email, i.daily_cap, i.sent_today;

create view public.usage_this_month with (security_invoker = true) as
select u.user_id, u.kind, sum(u.quantity)::int as used, sum(u.quantity * u.unit_cost_usd)::numeric(10,2) as cost_usd
from public.usage_ledger u
where u.period_start = date_trunc('month', now())::date
group by u.user_id, u.kind;

-- ---------------------------------------------------------------------
-- 18. STORAGE: CSV imports
-- ELI5: a private bucket for lead CSVs. Each user gets a folder named
-- after their user id and can only touch files in that folder.
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('imports', 'imports', false, 5242880, array['text/csv', 'application/vnd.ms-excel'])
on conflict (id) do nothing;

create policy imports_select_own on storage.objects for select to authenticated
  using (bucket_id = 'imports' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy imports_insert_own on storage.objects for insert to authenticated
  with check (bucket_id = 'imports' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy imports_update_own on storage.objects for update to authenticated
  using (bucket_id = 'imports' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'imports' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy imports_delete_own on storage.objects for delete to authenticated
  using (bucket_id = 'imports' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- ---------------------------------------------------------------------
-- 19. REALTIME
-- ELI5: lets the leads table, job progress and inbox update live
-- without anyone pressing refresh. RLS still applies.
-- ---------------------------------------------------------------------
alter publication supabase_realtime add table public.leads;
alter publication supabase_realtime add table public.lead_jobs;
alter publication supabase_realtime add table public.messages;

-- ---------------------------------------------------------------------
-- 20. SCHEDULER HELPER
-- ELI5: invoke_edge(name) calls one of your edge functions with the
-- cron secret. The URL and secret live in Supabase Vault (a locked
-- drawer inside the database). You add them, and the cron.schedule
-- lines, in the backend task "Turn on the pipeline schedules" AFTER the
-- functions are deployed. Until then this function exists but nothing
-- calls it.
-- ---------------------------------------------------------------------
create or replace function public.invoke_edge(fn text)
returns bigint language sql security definer set search_path = '' as $fn$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/' || fn,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')),
    body := '{}'::jsonb,
    timeout_milliseconds := 150000);
$fn$;
revoke execute on function public.invoke_edge(text) from public, anon, authenticated;

-- Done. Check it worked:
--   select id, leads, sends from public.plans;               -- 4 rows
--   select count(*) from pg_policies where schemaname = 'public';   -- 39
`
