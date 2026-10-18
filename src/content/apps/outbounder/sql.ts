// Outbounder single migration, pasted into the Supabase SQL editor.

export const sql = `-- =====================================================================
-- Outbounder: full database migration
-- Paste this whole file into Supabase > SQL Editor > New query > Run.
-- Safe order: types, tables, functions, triggers, RLS, views, realtime.
-- =====================================================================

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

create type public.message_direction as enum ('outbound', 'inbound');

create type public.message_status as enum
  ('queued', 'sending', 'sent', 'delivered', 'bounced', 'failed', 'cancelled', 'received');

create type public.reply_class as enum ('interested', 'not_now', 'unsubscribe', 'ooo', 'other');

create type public.domain_status as enum ('pending_dns', 'verifying', 'verified', 'failed');

create type public.inbox_status as enum ('warming', 'active', 'paused', 'disabled');

create type public.suppression_reason as enum
  ('unsubscribe', 'bounce', 'complaint', 'manual', 'replied_no');

-- ---------------------------------------------------------------------
-- 2. PROFILES
-- ELI5: one row per person who signs up. A trigger creates it the
-- moment Supabase Auth creates the user, so it always exists.
-- ---------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  company_name text,
  website_domain text,
  sender_name text,
  signature text,
  physical_address text,
  timezone text not null default 'Europe/London',
  icp jsonb not null default '{}'::jsonb,
  onboarded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Secrets the browser must never read back (the user's Apollo key).
-- ELI5: a locked drawer. No policies means only the server key opens it.
create table public.user_secrets (
  user_id uuid primary key references auth.users (id) on delete cascade,
  apollo_key_encrypted text,
  apollo_key_last4 text,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 3. SENDING DOMAINS AND INBOXES
-- ELI5: a sending domain is the separate web address you send from
-- (tryacme.com). Inboxes are the email addresses on it (olly@tryacme.com).
-- AgentMail hosts both; we keep their ids here.
-- ---------------------------------------------------------------------
create table public.sending_domains (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  domain text not null,
  agentmail_domain_id text unique,
  status public.domain_status not null default 'pending_dns',
  dns_records jsonb not null default '[]'::jsonb,
  last_checked_at timestamptz,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, domain)
);

create table public.inboxes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  domain_id uuid not null references public.sending_domains (id) on delete cascade,
  agentmail_inbox_id text unique,
  email text not null unique,
  display_name text not null,
  daily_cap int not null default 20 check (daily_cap between 1 and 30),
  sent_today int not null default 0,
  sent_today_date date not null default current_date,
  status public.inbox_status not null default 'warming',
  paused_until timestamptz,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 4. CAMPAIGNS, SEQUENCES, STEPS
-- ELI5: a campaign is "who to email" + "what to say" + "from where".
-- The sequence is the list of up to 3 emails sent days apart.
-- ---------------------------------------------------------------------
create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  status public.campaign_status not null default 'draft',
  icp jsonb not null default '{}'::jsonb,
  target_lead_count int not null default 25,
  send_days int[] not null default '{1,2,3,4}',          -- 1 = Monday
  send_window_start time not null default '08:00',
  send_window_end time not null default '11:30',
  fallback_timezone text not null default 'Europe/London',
  finding_locked_at timestamptz,
  paused_reason text,
  launched_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
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
  created_at timestamptz not null default now()
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
  unique (sequence_id, step_number)
);

-- ---------------------------------------------------------------------
-- 5. LEADS AND ENRICHMENT
-- ELI5: a lead is one person you might email. Enrichment is what we
-- learned from their website and what Claude wrote for them.
-- ---------------------------------------------------------------------
create table public.leads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  email text not null,
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
  apollo_person_id text,
  verify_result text,
  current_step int not null default 0,
  next_send_at timestamptz,
  assigned_inbox_id uuid references public.inboxes (id) on delete set null,
  attempts int not null default 0,
  last_error text,
  locked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- One person once per user, across every campaign.
create unique index leads_user_email_uniq on public.leads (user_id, lower(email));
create index leads_campaign_status_idx on public.leads (campaign_id, status);
create index leads_status_locked_idx on public.leads (status, locked_at);

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
  personalised_at timestamptz
);

-- ---------------------------------------------------------------------
-- 6. MESSAGES
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
  agentmail_message_id text unique,
  agentmail_thread_id text,
  in_reply_to text,
  classification public.reply_class,
  classification_confidence numeric(3,2),
  classification_summary text,
  read_at timestamptz,
  error text,
  created_at timestamptz not null default now()
);

create index messages_due_idx on public.messages (scheduled_for) where status = 'queued';
create index messages_thread_idx on public.messages (agentmail_thread_id);
create index messages_lead_idx on public.messages (lead_id, created_at);
create index messages_inbox_class_idx on public.messages (user_id, direction, classification, created_at desc);

-- ---------------------------------------------------------------------
-- 7. SUPPRESSION, UNSUBSCRIBE TOKENS, EVENTS, USAGE
-- ELI5: the suppression list is the "never email again" list. It is
-- checked before every single send.
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
create unique index suppression_user_email_uniq on public.suppression_list (user_id, lower(email)) where email is not null;
create unique index suppression_user_domain_uniq on public.suppression_list (user_id, lower(domain)) where domain is not null;

create table public.unsubscribe_tokens (
  token_hash text primary key,                 -- sha256 of the random token
  user_id uuid not null references auth.users (id) on delete cascade,
  lead_id uuid not null references public.leads (id) on delete cascade,
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
create index events_user_type_idx on public.events (user_id, type, created_at desc);
-- Webhook idempotency: the same AgentMail delivery id can only land once.
create unique index events_svix_uniq on public.events ((data ->> 'svix_id'))
  where type = 'agentmail_webhook';

create table public.usage_monthly (
  user_id uuid not null references auth.users (id) on delete cascade,
  month date not null,                         -- first day of the month
  leads_found int not null default 0,
  emails_personalised int not null default 0,
  emails_sent int not null default 0,
  primary key (user_id, month)
);

-- ---------------------------------------------------------------------
-- 8. BILLING (written only by the Stripe webhook with the secret key)
-- ELI5: Stripe tells us who paid. We copy that here. The browser can
-- read its own row but can never write it, so nobody can fake "paid".
-- ---------------------------------------------------------------------
create table public.subscriptions (
  user_id uuid primary key references auth.users (id) on delete cascade,
  stripe_customer_id text unique not null,
  stripe_subscription_id text unique,
  status text not null,                        -- trialing, active, past_due, canceled...
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
-- 9. FUNCTIONS
-- ELI5: small programs that live in the database. has_active_access is
-- the bouncer: trialing or active gets in, everyone else waits outside.
-- ---------------------------------------------------------------------
create or replace function public.has_active_access(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.subscriptions s
    where s.user_id = uid and s.status in ('trialing', 'active')
  );
$$;

create or replace function public.plan_limits(uid uuid)
returns table (leads_found int, emails_personalised int, emails_sent int,
               domains int, inboxes int, active_campaigns int)
language sql
stable
security definer
set search_path = ''
as $$
  select case when s.status = 'active' then 1500 else 100 end,
         case when s.status = 'active' then 1500 else 100 end,
         case when s.status = 'active' then 6000 else 300 end,
         case when s.status = 'active' then 3 else 1 end,
         case when s.status = 'active' then 9 else 2 end,
         case when s.status = 'active' then 10 else 1 end
  from (select coalesce((select status from public.subscriptions where user_id = uid), 'none') as status) s;
$$;

-- Claim a batch of leads for one pipeline stage without two workers
-- grabbing the same rows (for update skip locked).
create or replace function public.claim_leads(p_from public.lead_status, p_to public.lead_status, p_limit int)
returns setof public.leads
language sql
security definer
set search_path = ''
as $$
  update public.leads l
     set status = p_to, locked_at = now(), updated_at = now()
   where l.id in (
     select id from public.leads
      where status = p_from
      order by created_at
      limit p_limit
      for update skip locked)
  returning l.*;
$$;

-- Put leads stuck in a working state back, or fail them after 3 tries.
create or replace function public.release_stuck_leads()
returns int
language plpgsql
security definer
set search_path = ''
as $$
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
         last_error = coalesce(last_error, 'timed out'),
         locked_at = null
   where status in ('verifying', 'enriching', 'personalising')
     and locked_at < now() - interval '15 minutes';
  get diagnostics n = row_count;
  return n;
end;
$$;

create or replace function public.claim_due_messages(p_limit int)
returns setof public.messages
language sql
security definer
set search_path = ''
as $$
  update public.messages m
     set status = 'sending'
   where m.id in (
     select id from public.messages
      where status = 'queued' and direction = 'outbound' and scheduled_for <= now()
      order by scheduled_for
      limit p_limit
      for update skip locked)
  returning m.*;
$$;

create or replace function public.increment_usage(uid uuid, field text, n int)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare m date := date_trunc('month', now())::date;
begin
  insert into public.usage_monthly (user_id, month) values (uid, m)
  on conflict (user_id, month) do nothing;
  if field = 'leads_found' then
    update public.usage_monthly set leads_found = leads_found + n where user_id = uid and month = m;
  elsif field = 'emails_personalised' then
    update public.usage_monthly set emails_personalised = emails_personalised + n where user_id = uid and month = m;
  elsif field = 'emails_sent' then
    update public.usage_monthly set emails_sent = emails_sent + n where user_id = uid and month = m;
  end if;
end;
$$;

-- Pipeline helpers are for the server only.
revoke execute on function public.claim_leads(public.lead_status, public.lead_status, int) from public, anon, authenticated;
revoke execute on function public.release_stuck_leads() from public, anon, authenticated;
revoke execute on function public.claim_due_messages(int) from public, anon, authenticated;
revoke execute on function public.increment_usage(uuid, text, int) from public, anon, authenticated;
grant execute on function public.claim_leads(public.lead_status, public.lead_status, int) to service_role;
grant execute on function public.release_stuck_leads() to service_role;
grant execute on function public.claim_due_messages(int) to service_role;
grant execute on function public.increment_usage(uuid, text, int) to service_role;

-- Browser users may only approve, reject or un-approve. Every other
-- status change belongs to the edge functions (service_role).
create or replace function public.guard_lead_status()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (select auth.role()) = 'authenticated' and new.status is distinct from old.status then
    if not (old.status in ('ready', 'needs_review', 'approved')
            and new.status in ('approved', 'rejected', 'ready')) then
      raise exception 'Not allowed to move lead from % to %', old.status, new.status;
    end if;
  end if;
  if (select auth.role()) = 'authenticated' and (new.user_id <> old.user_id or new.campaign_id <> old.campaign_id) then
    raise exception 'Not allowed to move a lead to another owner or campaign';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger leads_guard_status
  before update on public.leads
  for each row execute function public.guard_lead_status();

-- ---------------------------------------------------------------------
-- 10. ROW LEVEL SECURITY
-- ELI5: RLS is a guard on every table that checks "is this your row?"
-- on every read and write. (select auth.uid()) is the signed-in user.
-- One policy per action. No 'for all'.
-- ---------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.user_secrets enable row level security;
alter table public.sending_domains enable row level security;
alter table public.inboxes enable row level security;
alter table public.campaigns enable row level security;
alter table public.campaign_inboxes enable row level security;
alter table public.sequences enable row level security;
alter table public.sequence_steps enable row level security;
alter table public.leads enable row level security;
alter table public.lead_enrichment enable row level security;
alter table public.messages enable row level security;
alter table public.suppression_list enable row level security;
alter table public.unsubscribe_tokens enable row level security;
alter table public.events enable row level security;
alter table public.usage_monthly enable row level security;
alter table public.subscriptions enable row level security;
alter table public.stripe_events enable row level security;

-- profiles (id is the user id)
create policy profiles_select_own on public.profiles for select to authenticated
  using ((select auth.uid()) = id);
create policy profiles_update_own on public.profiles for update to authenticated
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

-- user_secrets, unsubscribe_tokens, stripe_events: no policies at all.
-- Only the secret key (edge functions, webhook) can touch them.

-- Read-only to the user, written by the server:
create policy usage_select_own on public.usage_monthly for select to authenticated
  using ((select auth.uid()) = user_id);
create policy subscriptions_select_own on public.subscriptions for select to authenticated
  using ((select auth.uid()) = user_id);
create policy events_select_own on public.events for select to authenticated
  using ((select auth.uid()) = user_id);

-- Domains and inboxes: user can read and rename/pause; creation goes
-- through setup-domain so AgentMail and the database stay in sync.
create policy domains_select_own on public.sending_domains for select to authenticated
  using ((select auth.uid()) = user_id);
create policy domains_delete_own on public.sending_domains for delete to authenticated
  using ((select auth.uid()) = user_id);
create policy inboxes_select_own on public.inboxes for select to authenticated
  using ((select auth.uid()) = user_id);
create policy inboxes_update_own on public.inboxes for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- Full CRUD for the user's own campaign data.
create policy campaigns_select_own on public.campaigns for select to authenticated
  using ((select auth.uid()) = user_id);
create policy campaigns_insert_own on public.campaigns for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy campaigns_update_own on public.campaigns for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy campaigns_delete_own on public.campaigns for delete to authenticated
  using ((select auth.uid()) = user_id);

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
  with check ((select auth.uid()) = user_id);
create policy sequences_update_own on public.sequences for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy sequences_delete_own on public.sequences for delete to authenticated
  using ((select auth.uid()) = user_id);

create policy steps_select_own on public.sequence_steps for select to authenticated
  using ((select auth.uid()) = user_id);
create policy steps_insert_own on public.sequence_steps for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy steps_update_own on public.sequence_steps for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy steps_delete_own on public.sequence_steps for delete to authenticated
  using ((select auth.uid()) = user_id);

create policy leads_select_own on public.leads for select to authenticated
  using ((select auth.uid()) = user_id);
create policy leads_insert_own on public.leads for insert to authenticated
  with check ((select auth.uid()) = user_id and status = 'found');   -- CSV upload
create policy leads_update_own on public.leads for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy leads_delete_own on public.leads for delete to authenticated
  using ((select auth.uid()) = user_id);

create policy enrichment_select_own on public.lead_enrichment for select to authenticated
  using ((select auth.uid()) = user_id);
create policy enrichment_update_own on public.lead_enrichment for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy messages_select_own on public.messages for select to authenticated
  using ((select auth.uid()) = user_id);
-- Manual replies from the unified inbox: queued outbound only.
create policy messages_insert_own on public.messages for insert to authenticated
  with check ((select auth.uid()) = user_id and direction = 'outbound'
              and status = 'queued' and is_manual = true);
create policy messages_update_own on public.messages for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy suppression_select_own on public.suppression_list for select to authenticated
  using ((select auth.uid()) = user_id);
create policy suppression_insert_own on public.suppression_list for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy suppression_delete_own on public.suppression_list for delete to authenticated
  using ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------
-- 11. VIEWS (security_invoker = the view obeys the caller's RLS)
-- ELI5: a view is a saved query. security_invoker means it shows you
-- only your own rows, same as the tables underneath.
-- ---------------------------------------------------------------------
create view public.campaign_stats with (security_invoker = true) as
select c.id as campaign_id,
       c.user_id,
       count(distinct l.id) as leads,
       count(distinct l.id) filter (where l.status in ('ready', 'needs_review')) as to_review,
       count(distinct l.id) filter (where l.status = 'approved') as approved,
       count(m.id) filter (where m.direction = 'outbound' and m.status in ('sent', 'delivered')) as sent,
       count(m.id) filter (where m.status = 'bounced') as bounced,
       count(m.id) filter (where m.direction = 'inbound') as replies,
       count(m.id) filter (where m.classification = 'interested') as interested
from public.campaigns c
left join public.leads l on l.campaign_id = c.id
left join public.messages m on m.lead_id = l.id
group by c.id, c.user_id;

create view public.inbox_health with (security_invoker = true) as
select i.id as inbox_id,
       i.user_id,
       i.email,
       i.daily_cap,
       i.sent_today,
       count(m.id) filter (where m.sent_at > now() - interval '30 days') as sent_30d,
       count(m.id) filter (where m.status = 'bounced' and m.created_at > now() - interval '30 days') as bounced_30d
from public.inboxes i
left join public.messages m on m.inbox_id = i.id and m.direction = 'outbound'
group by i.id, i.user_id, i.email, i.daily_cap, i.sent_today;

-- ---------------------------------------------------------------------
-- 12. REALTIME
-- ELI5: lets the leads table and inbox update live without refresh.
-- ---------------------------------------------------------------------
alter publication supabase_realtime add table public.leads;
alter publication supabase_realtime add table public.messages;

-- ---------------------------------------------------------------------
-- 13. SCHEDULES (run later, after your edge functions are deployed)
-- ELI5: pg_cron is an alarm clock inside the database. pg_net lets the
-- alarm clock call a URL. Every few minutes it pokes your functions.
--
-- How to enable: Supabase > Database > Extensions > search "pg_cron" >
-- Enable. Then search "pg_net" > Enable.
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
-- select cron.schedule('verify-emails',   '*/2 * * * *', $$ select public.invoke_edge('verify-emails') $$);
-- select cron.schedule('enrich-leads',    '*/2 * * * *', $$ select public.invoke_edge('enrich-leads') $$);
-- select cron.schedule('personalise',     '*/2 * * * *', $$ select public.invoke_edge('personalise') $$);
-- select cron.schedule('send-due-emails', '*/5 * * * *', $$ select public.invoke_edge('send-due-emails') $$);
--
-- Check it ran: select * from cron.job_run_details order by start_time desc limit 20;
`
