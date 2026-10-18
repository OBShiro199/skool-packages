// Helpdeck single migration, pasted into the Supabase SQL editor once on a fresh project.

export const sql = `-- =====================================================================
-- Helpdeck: full database migration
-- Paste this whole file into Supabase > SQL Editor > New query > Run.
-- Run it ONCE on a fresh project. Order: extensions, enums, shared
-- triggers, tenancy, billing, plan limits, bots and content, the job
-- queue, chat, metering, email, rate limits, demo, search, RLS, grants,
-- storage. Every section starts with an ELI5 note.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. EXTENSIONS
-- ELI5: extensions are add-ons for the database. vector stores the
-- "meaning as numbers" lists (embeddings) for every docs chunk. pgcrypto
-- gives hashing. pg_cron runs jobs on a timer and pg_net lets those jobs
-- call our edge functions.
-- ---------------------------------------------------------------------
create extension if not exists vector with schema extensions;
create extension if not exists pgcrypto with schema extensions;
create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron;

-- ---------------------------------------------------------------------
-- 1. ENUMS
-- ELI5: an enum is a fixed list of allowed words for a column. A crawl
-- can be 'crawling' or 'ready', never 'banana'.
-- ---------------------------------------------------------------------
create type public.workspace_role as enum ('owner', 'admin', 'member');
create type public.bot_status as enum ('empty', 'crawling', 'ready', 'error');
create type public.crawl_status as enum ('queued', 'crawling', 'embedding', 'ready', 'failed', 'cancelled');
create type public.page_status as enum ('pending', 'embedded', 'failed');
create type public.job_kind as enum ('embed_page', 'finish_crawl', 'reconcile_crawl');
create type public.job_status as enum ('queued', 'running', 'done', 'dead');
create type public.conversation_status as enum ('open', 'handed_off', 'closed');
create type public.message_role as enum ('user', 'assistant');
create type public.gap_status as enum ('open', 'fixed', 'ignored');
create type public.usage_kind as enum ('answer', 'crawl_page', 'embed_tokens', 'digest', 'demo_answer');
create type public.demo_status as enum ('crawling', 'ready', 'failed', 'claimed', 'expired');

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
-- 3. PROFILES, WORKSPACES AND MEMBERS
-- ELI5: Supabase keeps logins in auth.users. Each person gets a profile
-- and their own workspace (the "company" box all their bots live in).
-- Everything else hangs off workspace_id, so teams can be added later
-- without moving any data.
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

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'My workspace' check (char_length(name) between 1 and 80),
  owner_id uuid not null references auth.users (id) on delete cascade,
  weekly_digest boolean not null default true,
  usage_alerts boolean not null default true,
  handoff_copy boolean not null default false,
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

-- Signup trigger: profile + workspace + owner membership in one go.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  ws uuid;
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (id) do nothing;

  insert into public.workspaces (name, owner_id)
  values (coalesce(nullif(new.raw_user_meta_data ->> 'company', ''), 'My workspace'), new.id)
  returning id into ws;

  insert into public.workspace_members (workspace_id, user_id, role)
  values (ws, new.id, 'owner');

  update public.profiles set current_workspace_id = ws where id = new.id;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- 4. MEMBERSHIP HELPERS (used by every RLS policy)
-- ELI5: instead of repeating "is this person in this workspace?" in 40
-- rules, we ask one trusted function. security definer means it can look
-- at the members table even though the caller cannot read all of it.
-- search_path = '' stops anyone swapping in a fake table with the same name.
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

-- Storage paths are text, so this version checks the text is a uuid first.
create or replace function public.is_workspace_member_text(ws text)
returns boolean language plpgsql stable security definer set search_path = '' as $$
begin
  if ws is null or ws !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' then
    return false;
  end if;
  return public.is_workspace_member(ws::uuid);
end;
$$;

-- ---------------------------------------------------------------------
-- 5. BILLING (shared with the Stripe webhook in the Payments phase)
-- ELI5: subscriptions says who is paying (one row per login). Only the
-- Stripe webhook writes it. stripe_events remembers every Stripe event id
-- we have handled so a repeated event is ignored. plan_prices maps a
-- Stripe price id to 'starter' or 'growth'.
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
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger subscriptions_updated_at before update on public.subscriptions
  for each row execute function public.set_updated_at();

create table public.stripe_events (
  id text primary key,
  type text not null,
  received_at timestamptz not null default now()
);

create table public.plan_prices (
  price_id text primary key,
  plan text not null check (plan in ('starter', 'growth')),
  billing_interval text not null check (billing_interval in ('month', 'year')),
  created_at timestamptz not null default now()
);

-- Per-workspace overrides: for tests (tiny caps) and for the demo workspace.
create table public.workspace_limit_overrides (
  workspace_id uuid primary key references public.workspaces (id) on delete cascade,
  bots int check (bots >= 0),
  pages_per_bot int check (pages_per_bot >= 0),
  answers_month int check (answers_month >= 0),
  crawl_pages_month int check (crawl_pages_month >= 0),
  note text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 6. PAYWALL AND PLAN LIMITS
-- ELI5: has_active_access is the paywall: the workspace owner's trial or
-- paid plan must be live. plan_limits returns the numbers for the plan
-- (bots, pages, answers). usage_period_start says when "this month"
-- began: the trial start during a trial, otherwise the 1st of the month.
-- ---------------------------------------------------------------------
create or replace function public.has_active_access(ws uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.workspaces w
    join public.subscriptions s on s.user_id = w.owner_id
    where w.id = ws and s.status in ('trialing', 'active')
  );
$$;

create or replace function public.plan_limits(ws uuid)
returns table (
  plan text,
  is_trial boolean,
  bots int,
  pages_per_bot int,
  answers_month int,
  crawl_pages_month int,
  recrawls_per_day int,
  show_branding boolean,
  weekly_digest boolean
)
language sql stable security definer set search_path = '' as $$
  with s as (
    select coalesce(pp.plan, 'starter') as plan, coalesce(sub.status = 'trialing', false) as is_trial
    from public.workspaces w
    left join public.subscriptions sub on sub.user_id = w.owner_id
    left join public.plan_prices pp on pp.price_id = sub.price_id
    where w.id = ws
  )
  select
    s.plan,
    s.is_trial,
    coalesce(o.bots, case when s.plan = 'growth' then 3 else 1 end),
    coalesce(o.pages_per_bot, case when s.plan = 'growth' then 1000 else 200 end),
    coalesce(o.answers_month, case when s.is_trial then 500 when s.plan = 'growth' then 10000 else 2000 end),
    coalesce(o.crawl_pages_month, case when s.is_trial then 400 when s.plan = 'growth' then 6000 else 1000 end),
    3,
    s.plan <> 'growth',
    s.plan = 'growth'
  from s
  left join public.workspace_limit_overrides o on o.workspace_id = ws;
$$;

create or replace function public.usage_period_start(ws uuid)
returns timestamptz language sql stable security definer set search_path = '' as $$
  select coalesce(
    (select greatest(s.trial_end - interval '7 days', date_trunc('month', now() at time zone 'utc') at time zone 'utc')
       from public.workspaces w
       join public.subscriptions s on s.user_id = w.owner_id
      where w.id = ws and s.status = 'trialing' and s.trial_end is not null),
    date_trunc('month', now() at time zone 'utc') at time zone 'utc'
  );
$$;

-- ---------------------------------------------------------------------
-- 7. BOTS
-- ELI5: a bot is one chat widget trained on one website. Starter gets 1,
-- Growth gets 3. The trigger below refuses a 2nd bot on Starter even if
-- someone skips the UI and calls the API directly.
-- ---------------------------------------------------------------------
create table public.bots (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  name text not null default 'Support' check (char_length(name) between 1 and 40),
  brand_colour text not null default '#111214' check (brand_colour ~ '^#[0-9a-fA-F]{6}$'),
  greeting text not null default 'Hi! Ask me anything.' check (char_length(greeting) <= 200),
  avatar_path text,
  suggested_questions text[] not null default '{}' check (cardinality(suggested_questions) <= 3),
  handoff_email text check (handoff_email is null or handoff_email ~* '^[^@ ]+@[^@ ]+[.][^@ ]+$'),
  handoff_message text not null default 'I''m not sure about this one. Want a human to email you?'
    check (char_length(handoff_message) <= 200),
  allowed_domains text[] not null default '{}' check (cardinality(allowed_domains) <= 20),
  start_url text check (start_url is null or char_length(start_url) <= 2048),
  status public.bot_status not null default 'empty',
  page_count int not null default 0,
  chunk_count int not null default 0,
  first_seen_at timestamptz,
  last_seen_host text,
  last_seen_at timestamptz,
  is_demo boolean not null default false,
  paused_by_plan boolean not null default false,
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index bots_workspace_idx on public.bots (workspace_id);
create index bots_created_by_idx on public.bots (created_by);
create trigger bots_updated_at before update on public.bots
  for each row execute function public.set_updated_at();

create or replace function public.enforce_bot_limit()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  cap int;
  used int;
begin
  if new.is_demo then
    return new;
  end if;
  select l.bots into cap from public.plan_limits(new.workspace_id) l;
  select count(*) into used from public.bots b
   where b.workspace_id = new.workspace_id and not b.is_demo and b.id <> new.id;
  if used >= coalesce(cap, 1) then
    raise exception 'bot_limit: your plan allows % bot(s)', coalesce(cap, 1) using errcode = 'P0001';
  end if;
  return new;
end;
$$;
create trigger bots_enforce_limit before insert on public.bots
  for each row execute function public.enforce_bot_limit();

-- ---------------------------------------------------------------------
-- 8. CRAWLS, PAGES AND CHUNKS
-- ELI5: a crawl job is one "go and read the website" run. Each page we
-- read is saved as tidy text (markdown) with a fingerprint (hash). If the
-- fingerprint did not change, we skip re-learning it. Chunks are the
-- bite-size pieces of each page, each with its embedding (1024 numbers).
-- ---------------------------------------------------------------------
create table public.crawl_jobs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  bot_id uuid not null references public.bots (id) on delete cascade,
  firecrawl_id text unique,
  start_url text not null,
  page_limit int not null check (page_limit between 1 and 1000),
  is_recrawl boolean not null default false,
  status public.crawl_status not null default 'queued',
  pages_found int not null default 0,
  pages_changed int not null default 0,
  pages_embedded int not null default 0,
  pages_failed int not null default 0,
  error text,
  created_by uuid references auth.users (id) on delete set null,
  started_at timestamptz not null default now(),
  last_event_at timestamptz not null default now(),
  finished_at timestamptz,
  updated_at timestamptz not null default now()
);
create index crawl_jobs_workspace_idx on public.crawl_jobs (workspace_id);
create index crawl_jobs_bot_idx on public.crawl_jobs (bot_id, started_at desc);
create index crawl_jobs_created_by_idx on public.crawl_jobs (created_by);
create index crawl_jobs_active_idx on public.crawl_jobs (status, last_event_at)
  where status in ('queued', 'crawling', 'embedding');
create trigger crawl_jobs_updated_at before update on public.crawl_jobs
  for each row execute function public.set_updated_at();

create table public.pages (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  bot_id uuid not null references public.bots (id) on delete cascade,
  url text not null check (char_length(url) <= 2048),
  title text not null default '',
  markdown text not null,
  content_hash text not null,
  status public.page_status not null default 'pending',
  excluded boolean not null default false,
  chunk_count int not null default 0,
  last_crawl_id uuid references public.crawl_jobs (id) on delete set null,
  crawled_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (bot_id, url)
);
create index pages_workspace_idx on public.pages (workspace_id);
create index pages_last_crawl_idx on public.pages (last_crawl_id);
create index pages_bot_status_idx on public.pages (bot_id, status);
create trigger pages_updated_at before update on public.pages
  for each row execute function public.set_updated_at();

create table public.chunks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  bot_id uuid not null references public.bots (id) on delete cascade,
  page_id uuid not null references public.pages (id) on delete cascade,
  crawl_id uuid references public.crawl_jobs (id) on delete set null,
  ord int not null,
  heading text not null default '',
  content text not null,
  token_count int not null default 0,
  embedding extensions.vector(1024) not null,
  created_at timestamptz not null default now()
);
-- No HNSW index on purpose: search filters by bot_id first, then measures
-- distance on that bot's few thousand chunks exactly (see PRD 5.2).
create index chunks_bot_idx on public.chunks (bot_id);
create index chunks_page_idx on public.chunks (page_id);
create index chunks_workspace_idx on public.chunks (workspace_id);
create index chunks_crawl_idx on public.chunks (crawl_id);

-- Excluding a page drops its chunks at once. Un-excluding queues a re-learn.
create or replace function public.on_page_excluded()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  n int;
begin
  if new.excluded and not old.excluded then
    delete from public.chunks where page_id = new.id;
    get diagnostics n = row_count;
    update public.bots set chunk_count = greatest(chunk_count - n, 0) where id = new.bot_id;
    new.chunk_count := 0;
  elsif old.excluded and not new.excluded then
    new.status := 'pending';
    insert into public.jobs (workspace_id, kind, ref_id, idempotency_key)
    values (new.workspace_id, 'embed_page', new.id, 'reinclude:' || new.id || ':' || extract(epoch from now())::bigint)
    on conflict (idempotency_key) do nothing;
  end if;
  return new;
end;
$$;

-- Deleting a page keeps the bot's counters right.
create or replace function public.on_page_deleted()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.bots
     set page_count = greatest(page_count - 1, 0),
         chunk_count = greatest(chunk_count - old.chunk_count, 0)
   where id = old.bot_id;
  return old;
end;
$$;
create trigger pages_after_delete after delete on public.pages
  for each row execute function public.on_page_deleted();

-- Recount a bot from scratch (called by the worker when a crawl finishes).
create or replace function public.refresh_bot_counts(p_bot uuid)
returns void language sql security definer set search_path = '' as $$
  update public.bots b set
    page_count = (select count(*) from public.pages p where p.bot_id = p_bot and not p.excluded),
    chunk_count = (select count(*) from public.chunks c where c.bot_id = p_bot)
  where b.id = p_bot;
$$;

-- ---------------------------------------------------------------------
-- 9. JOB QUEUE
-- ELI5: slow work (learning a page) goes on a to-do list. A worker wakes
-- every minute, grabs up to 20 jobs nobody else is holding ("skip
-- locked"), does them, and ticks them off. Failed jobs wait longer each
-- time and give up after 5 tries. idempotency_key stops the same job
-- being added twice.
-- ---------------------------------------------------------------------
create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  kind public.job_kind not null,
  status public.job_status not null default 'queued',
  ref_id uuid not null,
  payload jsonb not null default '{}',
  attempts int not null default 0,
  run_after timestamptz not null default now(),
  locked_at timestamptz,
  last_error text,
  idempotency_key text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index jobs_ready_idx on public.jobs (run_after) where status = 'queued';
create index jobs_workspace_idx on public.jobs (workspace_id);
create index jobs_ref_idx on public.jobs (ref_id, kind);
create trigger jobs_updated_at before update on public.jobs
  for each row execute function public.set_updated_at();

-- The trigger above needs public.jobs, so it is attached now.
create trigger pages_before_update_excluded before update of excluded on public.pages
  for each row execute function public.on_page_excluded();

create or replace function public.claim_jobs(p_limit int default 20)
returns setof public.jobs language sql security definer set search_path = '' as $$
  update public.jobs j
     set status = 'running', locked_at = now()
   where j.id in (
     select q.id from public.jobs q
      where q.status = 'queued' and q.run_after <= now()
      order by q.run_after
      limit least(greatest(p_limit, 1), 100)
      for update skip locked
   )
  returning j.*;
$$;

create or replace function public.release_stuck_jobs()
returns int language plpgsql security definer set search_path = '' as $$
declare
  n int;
begin
  update public.jobs set status = 'queued', locked_at = null
   where status = 'running' and locked_at < now() - interval '10 minutes';
  get diagnostics n = row_count;
  return n;
end;
$$;

-- ---------------------------------------------------------------------
-- 10. CONVERSATIONS, MESSAGES AND DOCS GAPS
-- ELI5: a conversation is one visitor's chat. Messages are each question
-- and answer. When the bot is not sure, the question goes on the "gaps"
-- list, so the owner knows which docs page to write next.
-- ---------------------------------------------------------------------
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  bot_id uuid not null references public.bots (id) on delete cascade,
  visitor_id text not null check (char_length(visitor_id) <= 64),
  ip_hash text,
  host text,
  page_url text check (page_url is null or char_length(page_url) <= 2048),
  status public.conversation_status not null default 'open',
  is_test boolean not null default false,
  first_question text,
  message_count int not null default 0,
  low_confidence_count int not null default 0,
  visitor_email text,
  handoff_note text check (handoff_note is null or char_length(handoff_note) <= 1000),
  handed_off_at timestamptz,
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index conversations_bot_recent_idx on public.conversations (bot_id, last_message_at desc);
create index conversations_bot_visitor_idx on public.conversations (bot_id, visitor_id);
create index conversations_workspace_idx on public.conversations (workspace_id);
create trigger conversations_updated_at before update on public.conversations
  for each row execute function public.set_updated_at();

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  bot_id uuid not null references public.bots (id) on delete cascade,
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  role public.message_role not null,
  content text not null check (char_length(content) <= 8000),
  question text,
  sources jsonb not null default '[]',
  confident boolean,
  reason text check (reason is null or reason in ('answered', 'not_in_docs', 'needs_human', 'off_topic', 'error')),
  top_similarity real,
  input_tokens int,
  output_tokens int,
  latency_ms int,
  created_at timestamptz not null default now()
);
create index messages_conversation_idx on public.messages (conversation_id, created_at);
create index messages_bot_idx on public.messages (bot_id, created_at desc);
create index messages_workspace_idx on public.messages (workspace_id);

create table public.doc_gaps (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  bot_id uuid not null references public.bots (id) on delete cascade,
  question_key text not null,
  sample_question text not null,
  times_asked int not null default 1,
  first_asked_at timestamptz not null default now(),
  last_asked_at timestamptz not null default now(),
  last_conversation_id uuid references public.conversations (id) on delete set null,
  status public.gap_status not null default 'open',
  fixed_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (bot_id, question_key)
);
create index doc_gaps_workspace_idx on public.doc_gaps (workspace_id);
create index doc_gaps_conversation_idx on public.doc_gaps (last_conversation_id);
create index doc_gaps_open_idx on public.doc_gaps (bot_id, status, times_asked desc);
create trigger doc_gaps_updated_at before update on public.doc_gaps
  for each row execute function public.set_updated_at();

-- "How do I EXPORT invoices??" and "how do i export invoices" are the same gap.
create or replace function public.question_key(q text)
returns text language sql immutable set search_path = '' as $$
  select left(trim(regexp_replace(lower(coalesce(q, '')), '[^a-z0-9]+', ' ', 'g')), 120);
$$;

create or replace function public.record_gap(p_bot uuid, p_question text, p_conversation uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  ws uuid;
  k text := public.question_key(p_question);
begin
  if k = '' then
    return;
  end if;
  select workspace_id into ws from public.bots where id = p_bot;
  insert into public.doc_gaps (workspace_id, bot_id, question_key, sample_question, last_conversation_id)
  values (ws, p_bot, k, left(p_question, 300), p_conversation)
  on conflict (bot_id, question_key) do update set
    times_asked = public.doc_gaps.times_asked + 1,
    last_asked_at = now(),
    last_conversation_id = excluded.last_conversation_id,
    status = case when public.doc_gaps.status = 'fixed' then 'open'::public.gap_status else public.doc_gaps.status end;
end;
$$;

-- Stamp fixed_at when the owner marks a gap fixed.
create or replace function public.on_gap_status()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.status = 'fixed' and old.status <> 'fixed' then
    new.fixed_at := now();
  end if;
  return new;
end;
$$;
create trigger doc_gaps_status before update of status on public.doc_gaps
  for each row execute function public.on_gap_status();

-- ---------------------------------------------------------------------
-- 11. USAGE LEDGER (the meter)
-- ELI5: every time we spend money on a vendor (Claude answer, Firecrawl
-- page, Voyage tokens) we write a line here with the cost in millionths of
-- a dollar. try_consume checks the plan cap and writes the line in one
-- locked step, so two browser tabs cannot sneak past the limit.
-- ---------------------------------------------------------------------
create table public.usage_ledger (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  bot_id uuid references public.bots (id) on delete set null,
  kind public.usage_kind not null,
  quantity bigint not null check (quantity >= 0),
  cost_micros bigint not null default 0,
  ref_id uuid,
  idempotency_key text not null unique,
  created_at timestamptz not null default now()
);
create index usage_ledger_ws_kind_idx on public.usage_ledger (workspace_id, kind, created_at);
create index usage_ledger_bot_idx on public.usage_ledger (bot_id);

create or replace function public.usage_used(ws uuid, k public.usage_kind)
returns bigint language sql stable security definer set search_path = '' as $$
  select coalesce(sum(quantity), 0)::bigint from public.usage_ledger
   where workspace_id = ws and kind = k and created_at >= public.usage_period_start(ws);
$$;

create or replace function public.try_consume(
  p_ws uuid,
  p_kind public.usage_kind,
  p_qty bigint,
  p_cap bigint,
  p_key text,
  p_bot uuid default null,
  p_ref uuid default null
)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  used bigint;
begin
  -- One lock per workspace and kind, held until this transaction ends.
  perform pg_advisory_xact_lock(hashtextextended(p_ws::text || ':' || p_kind::text, 0));
  if exists (select 1 from public.usage_ledger where idempotency_key = p_key) then
    return true;
  end if;
  used := public.usage_used(p_ws, p_kind);
  if used + p_qty > p_cap then
    return false;
  end if;
  insert into public.usage_ledger (workspace_id, bot_id, kind, quantity, ref_id, idempotency_key)
  values (p_ws, p_bot, p_kind, p_qty, p_ref, p_key);
  return true;
end;
$$;

-- Meter without a cap (Voyage tokens, digest calls). Same key twice = one line.
create or replace function public.meter(
  p_ws uuid,
  p_kind public.usage_kind,
  p_qty bigint,
  p_cost_micros bigint,
  p_key text,
  p_bot uuid default null,
  p_ref uuid default null
)
returns void language sql security definer set search_path = '' as $$
  insert into public.usage_ledger (workspace_id, bot_id, kind, quantity, cost_micros, ref_id, idempotency_key)
  values (p_ws, p_bot, p_kind, p_qty, p_cost_micros, p_ref, p_key)
  on conflict (idempotency_key) do update set cost_micros = excluded.cost_micros;
$$;

-- What the Overview and Billing meters read. security_invoker = RLS applies.
create view public.workspace_usage_month with (security_invoker = true) as
  select u.workspace_id, u.kind, sum(u.quantity)::bigint as quantity, sum(u.cost_micros)::bigint as cost_micros
    from public.usage_ledger u
   where u.created_at >= public.usage_period_start(u.workspace_id)
   group by u.workspace_id, u.kind;

-- ---------------------------------------------------------------------
-- 12. EMAIL LOG, SUPPRESSIONS AND WEBHOOK DE-DUP
-- ELI5: every email we send gets a line here first, with a dedupe key
-- like 'usage80:<workspace>:2026-10'. If the line already exists, we do
-- not send again. Bounced addresses go on the suppressions list.
-- ---------------------------------------------------------------------
create table public.email_log (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces (id) on delete cascade,
  kind text not null,
  to_email text not null,
  subject text not null,
  dedupe_key text unique,
  resend_id text unique,
  status text not null default 'queued'
    check (status in ('queued', 'sent', 'delivered', 'bounced', 'complained', 'failed', 'suppressed')),
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index email_log_workspace_idx on public.email_log (workspace_id, created_at desc);
create trigger email_log_updated_at before update on public.email_log
  for each row execute function public.set_updated_at();

create table public.email_suppressions (
  email text primary key,
  reason text not null check (reason in ('bounced', 'complained', 'manual')),
  created_at timestamptz not null default now()
);

create table public.webhook_events (
  provider text not null,
  event_id text not null,
  received_at timestamptz not null default now(),
  primary key (provider, event_id)
);

-- ---------------------------------------------------------------------
-- 13. RATE LIMITS
-- ELI5: a counter per key ("visitor:abc", "ip:xyz") per time window. If
-- the counter passes the limit, the request is turned away with 429.
-- ---------------------------------------------------------------------
create table public.rate_limits (
  key text not null,
  window_start timestamptz not null,
  count int not null default 0,
  primary key (key, window_start)
);
create index rate_limits_window_idx on public.rate_limits (window_start);

create or replace function public.try_rate_limit(p_key text, p_limit int, p_window_seconds int)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  w timestamptz := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  c int;
begin
  insert into public.rate_limits (key, window_start, count)
  values (p_key, w, 1)
  on conflict (key, window_start) do update set count = public.rate_limits.count + 1
  returning count into c;
  return c <= p_limit;
end;
$$;

-- ---------------------------------------------------------------------
-- 14. LANDING PAGE DEMO
-- ELI5: when a stranger tries Helpdeck on the landing page, we make a
-- small bot in a hidden demo workspace. If they sign up, claim_demo_bot
-- moves that bot (and everything it learned) into their new workspace.
-- ---------------------------------------------------------------------
create table public.demo_sessions (
  id uuid primary key default gen_random_uuid(),
  ip_hash text not null,
  email text not null,
  start_url text not null,
  host text not null,
  bot_id uuid references public.bots (id) on delete set null,
  crawl_job_id uuid references public.crawl_jobs (id) on delete set null,
  status public.demo_status not null default 'crawling',
  pages int not null default 0,
  questions_used int not null default 0,
  claimed_workspace_id uuid references public.workspaces (id) on delete set null,
  claimed_at timestamptz,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '48 hours'
);
create index demo_sessions_bot_idx on public.demo_sessions (bot_id);
create index demo_sessions_crawl_idx on public.demo_sessions (crawl_job_id);
create index demo_sessions_claimed_idx on public.demo_sessions (claimed_workspace_id);
create index demo_sessions_ip_idx on public.demo_sessions (ip_hash, created_at);
create index demo_sessions_email_idx on public.demo_sessions (email, created_at);

create or replace function public.claim_demo_bot(p_demo uuid, p_user uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  d public.demo_sessions;
  ws uuid;
  cap int;
  used int;
begin
  select * into d from public.demo_sessions
   where id = p_demo and status = 'ready' and expires_at > now() and bot_id is not null
   for update;
  if not found then
    return null;
  end if;
  select w.id into ws from public.workspaces w where w.owner_id = p_user order by w.created_at limit 1;
  if ws is null then
    return null;
  end if;
  select l.bots into cap from public.plan_limits(ws) l;
  select count(*) into used from public.bots where workspace_id = ws and not is_demo;
  if used >= coalesce(cap, 1) then
    return null;
  end if;
  update public.bots set workspace_id = ws, is_demo = false where id = d.bot_id;
  update public.pages set workspace_id = ws where bot_id = d.bot_id;
  update public.chunks set workspace_id = ws where bot_id = d.bot_id;
  update public.crawl_jobs set workspace_id = ws where bot_id = d.bot_id;
  update public.conversations set workspace_id = ws where bot_id = d.bot_id;
  update public.messages set workspace_id = ws where bot_id = d.bot_id;
  update public.doc_gaps set workspace_id = ws where bot_id = d.bot_id;
  update public.demo_sessions set status = 'claimed', claimed_workspace_id = ws, claimed_at = now() where id = p_demo;
  return d.bot_id;
end;
$$;

-- ---------------------------------------------------------------------
-- 15. VECTOR SEARCH
-- ELI5: given the question's 1024 numbers, find the chunks of THIS bot
-- whose numbers point the same way. Similarity 1 is identical, 0 is
-- unrelated. Only edge functions (secret key) may call it.
-- ---------------------------------------------------------------------
create or replace function public.match_chunks(
  p_bot_id uuid,
  p_embedding extensions.vector(1024),
  p_count int default 8
)
returns table (
  id uuid,
  page_id uuid,
  ord int,
  heading text,
  content text,
  url text,
  title text,
  similarity double precision
)
language sql stable security definer set search_path = '' as $$
  select c.id, c.page_id, c.ord, c.heading, c.content, p.url, p.title,
         1 - (c.embedding operator(extensions.<=>) p_embedding) as similarity
    from public.chunks c
    join public.pages p on p.id = c.page_id
   where c.bot_id = p_bot_id and not p.excluded
   order by c.embedding operator(extensions.<=>) p_embedding
   limit least(greatest(p_count, 1), 20);
$$;

-- ---------------------------------------------------------------------
-- 16. ROW LEVEL SECURITY
-- ELI5: RLS is a bouncer on every table. With it on and no rule, nobody
-- gets in. Each rule below lets members see their own workspace's rows.
-- Tables with no rules (jobs, rate_limits, demo_sessions...) are only
-- reachable by edge functions using the secret key.
-- ---------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.subscriptions enable row level security;
alter table public.stripe_events enable row level security;
alter table public.plan_prices enable row level security;
alter table public.workspace_limit_overrides enable row level security;
alter table public.bots enable row level security;
alter table public.crawl_jobs enable row level security;
alter table public.pages enable row level security;
alter table public.chunks enable row level security;
alter table public.jobs enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.doc_gaps enable row level security;
alter table public.usage_ledger enable row level security;
alter table public.email_log enable row level security;
alter table public.email_suppressions enable row level security;
alter table public.webhook_events enable row level security;
alter table public.rate_limits enable row level security;
alter table public.demo_sessions enable row level security;

-- profiles
create policy "profiles select own" on public.profiles for select to authenticated
  using (id = (select auth.uid()));
create policy "profiles update own" on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- workspaces and members
create policy "workspaces select member" on public.workspaces for select to authenticated
  using (public.is_workspace_member(id));
create policy "workspaces update admin" on public.workspaces for update to authenticated
  using (public.has_workspace_role(id, array['owner', 'admin']::public.workspace_role[]))
  with check (public.has_workspace_role(id, array['owner', 'admin']::public.workspace_role[]));
create policy "members select member" on public.workspace_members for select to authenticated
  using (public.is_workspace_member(workspace_id));

-- billing
create policy "subscriptions select own" on public.subscriptions for select to authenticated
  using (user_id = (select auth.uid()));
create policy "plan_prices select all" on public.plan_prices for select to authenticated
  using (true);
create policy "overrides select member" on public.workspace_limit_overrides for select to authenticated
  using (public.is_workspace_member(workspace_id));
-- stripe_events: no policies on purpose.

-- bots
create policy "bots select member" on public.bots for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy "bots insert admin" on public.bots for insert to authenticated
  with check (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]) and not is_demo);
create policy "bots update admin" on public.bots for update to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]))
  with check (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]));
create policy "bots delete admin" on public.bots for delete to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]));

-- crawls, pages, chunks (written by edge functions; owners read, exclude and delete pages)
create policy "crawl_jobs select member" on public.crawl_jobs for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy "pages select member" on public.pages for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy "pages update admin" on public.pages for update to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]))
  with check (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]));
create policy "pages delete admin" on public.pages for delete to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]));
create policy "chunks select member" on public.chunks for select to authenticated
  using (public.is_workspace_member(workspace_id));

-- chat
create policy "conversations select member" on public.conversations for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy "conversations delete admin" on public.conversations for delete to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]));
create policy "messages select member" on public.messages for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy "doc_gaps select member" on public.doc_gaps for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy "doc_gaps update admin" on public.doc_gaps for update to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]))
  with check (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]));

-- metering and email
create policy "usage select member" on public.usage_ledger for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy "email_log select admin" on public.email_log for select to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]));
-- jobs, email_suppressions, webhook_events, rate_limits, demo_sessions: no policies on purpose.

-- ---------------------------------------------------------------------
-- 17. COLUMN GRANTS AND FUNCTION PERMISSIONS
-- ELI5: RLS decides WHICH rows you can touch. Column grants decide WHICH
-- columns. An owner may rename a bot but may not set its page_count or
-- move it to another workspace. Service-only functions are locked so
-- the browser cannot call them.
-- ---------------------------------------------------------------------
revoke insert, update on public.profiles from anon, authenticated;
grant update (full_name, current_workspace_id) on public.profiles to authenticated;

revoke insert, update, delete on public.workspaces from anon, authenticated;
grant update (name, weekly_digest, usage_alerts, handoff_copy) on public.workspaces to authenticated;

revoke insert, update, delete on public.workspace_members from anon, authenticated;

revoke insert, update on public.bots from anon, authenticated;
grant insert (workspace_id, name, brand_colour, greeting, avatar_path, suggested_questions,
  handoff_email, handoff_message, allowed_domains, start_url) on public.bots to authenticated;
grant update (name, brand_colour, greeting, avatar_path, suggested_questions,
  handoff_email, handoff_message, allowed_domains, start_url) on public.bots to authenticated;

revoke insert, update on public.pages from anon, authenticated;
grant update (excluded) on public.pages to authenticated;

revoke insert, update, delete on public.chunks from anon, authenticated;
revoke insert, update, delete on public.crawl_jobs from anon, authenticated;
revoke insert, update on public.conversations from anon, authenticated;
revoke insert, update, delete on public.messages from anon, authenticated;

revoke insert, update, delete on public.doc_gaps from anon, authenticated;
grant update (status) on public.doc_gaps to authenticated;

revoke insert, update, delete on public.usage_ledger from anon, authenticated;
revoke insert, update, delete on public.email_log from anon, authenticated;
revoke insert, update, delete on public.subscriptions from anon, authenticated;
revoke insert, update, delete on public.plan_prices from anon, authenticated;
revoke insert, update, delete on public.workspace_limit_overrides from anon, authenticated;

-- Helpers RLS needs: callable by signed-in users.
revoke execute on function public.is_workspace_member(uuid) from public, anon;
revoke execute on function public.has_workspace_role(uuid, public.workspace_role[]) from public, anon;
revoke execute on function public.is_workspace_member_text(text) from public, anon;
grant execute on function public.is_workspace_member(uuid) to authenticated;
grant execute on function public.has_workspace_role(uuid, public.workspace_role[]) to authenticated;
grant execute on function public.is_workspace_member_text(text) to authenticated;

-- Readable by signed-in users for meters and banners (they only reveal the caller's own plan numbers).
revoke execute on function public.has_active_access(uuid) from public, anon;
revoke execute on function public.plan_limits(uuid) from public, anon;
revoke execute on function public.usage_period_start(uuid) from public, anon;
grant execute on function public.has_active_access(uuid) to authenticated, service_role;
grant execute on function public.plan_limits(uuid) to authenticated, service_role;
grant execute on function public.usage_period_start(uuid) to authenticated, service_role;

-- Service only: the secret key in edge functions and the server.
revoke execute on function public.match_chunks(uuid, extensions.vector, int) from public, anon, authenticated;
revoke execute on function public.try_consume(uuid, public.usage_kind, bigint, bigint, text, uuid, uuid) from public, anon, authenticated;
revoke execute on function public.meter(uuid, public.usage_kind, bigint, bigint, text, uuid, uuid) from public, anon, authenticated;
revoke execute on function public.usage_used(uuid, public.usage_kind) from public, anon, authenticated;
revoke execute on function public.claim_jobs(int) from public, anon, authenticated;
revoke execute on function public.release_stuck_jobs() from public, anon, authenticated;
revoke execute on function public.try_rate_limit(text, int, int) from public, anon, authenticated;
revoke execute on function public.record_gap(uuid, text, uuid) from public, anon, authenticated;
revoke execute on function public.claim_demo_bot(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.refresh_bot_counts(uuid) from public, anon, authenticated;
grant execute on function public.match_chunks(uuid, extensions.vector, int) to service_role;
grant execute on function public.try_consume(uuid, public.usage_kind, bigint, bigint, text, uuid, uuid) to service_role;
grant execute on function public.meter(uuid, public.usage_kind, bigint, bigint, text, uuid, uuid) to service_role;
grant execute on function public.usage_used(uuid, public.usage_kind) to service_role;
grant execute on function public.claim_jobs(int) to service_role;
grant execute on function public.release_stuck_jobs() to service_role;
grant execute on function public.try_rate_limit(text, int, int) to service_role;
grant execute on function public.record_gap(uuid, text, uuid) to service_role;
grant execute on function public.claim_demo_bot(uuid, uuid) to service_role;
grant execute on function public.refresh_bot_counts(uuid) to service_role;

-- Trigger functions are never called directly.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.enforce_bot_limit() from public, anon, authenticated;
revoke execute on function public.on_page_excluded() from public, anon, authenticated;
revoke execute on function public.on_page_deleted() from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- 18. STORAGE
-- ELI5: buckets are folders for files. bot-avatars is public (the widget
-- shows the picture on customer sites). conversation-exports is private:
-- the server writes CSV files there and hands out 10 minute links. The
-- first folder in every path is the workspace id, which is what the
-- rules check.
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('bot-avatars', 'bot-avatars', true, 1048576, array['image/png', 'image/jpeg', 'image/webp']),
  ('conversation-exports', 'conversation-exports', false, 20971520, array['text/csv'])
on conflict (id) do nothing;

create policy "bot-avatars select member" on storage.objects for select to authenticated
  using (bucket_id = 'bot-avatars' and public.is_workspace_member_text((storage.foldername(name))[1]));
create policy "bot-avatars insert member" on storage.objects for insert to authenticated
  with check (bucket_id = 'bot-avatars' and public.is_workspace_member_text((storage.foldername(name))[1]));
create policy "bot-avatars update member" on storage.objects for update to authenticated
  using (bucket_id = 'bot-avatars' and public.is_workspace_member_text((storage.foldername(name))[1]))
  with check (bucket_id = 'bot-avatars' and public.is_workspace_member_text((storage.foldername(name))[1]));
create policy "bot-avatars delete member" on storage.objects for delete to authenticated
  using (bucket_id = 'bot-avatars' and public.is_workspace_member_text((storage.foldername(name))[1]));

create policy "exports select member" on storage.objects for select to authenticated
  using (bucket_id = 'conversation-exports' and public.is_workspace_member_text((storage.foldername(name))[1]));
-- No insert/update/delete policy for exports: only the server (secret key) writes them.

-- ---------------------------------------------------------------------
-- 19. QUICK CHECKS (safe to run again any time)
-- ELI5: these read-only queries prove the migration worked.
-- ---------------------------------------------------------------------
-- Every public table has RLS on (expect no rows):
--   select tablename from pg_tables where schemaname = 'public' and not rowsecurity;
-- The vector extension is installed:
--   select extversion from pg_extension where extname = 'vector';
-- match_chunks is not callable by signed-in users (expect false):
--   select has_function_privilege('authenticated', 'public.match_chunks(uuid, extensions.vector, int)', 'execute');
`
