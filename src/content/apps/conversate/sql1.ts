// Conversate SQL migration, part 1: extensions, enums, tables, indexes.
// Joined with sql2.ts in conversate.ts. Must run cleanly once on a fresh Supabase project.

export const sql1 = `-- =====================================================================
-- Conversate: the whole database in one migration.
-- Paste into Supabase: SQL Editor > New query > paste > Run. Run it ONCE on a
-- fresh project. Save the same file as supabase/migrations/0001_conversate.sql.
--
-- ELI5: this file builds every drawer in Conversate's filing cabinet (tables),
-- the labels on the drawers (enums), the locks (row level security) and the
-- little robots that tidy up when something changes (triggers and functions).
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. Extensions
-- ELI5: add-ons for Postgres. vector stores embeddings (lists of numbers that
-- capture meaning) so we can find the help text closest to a question.
-- pgcrypto makes random tokens and hashes. pg_cron runs jobs on a timer and
-- pg_net lets the database call our edge functions over HTTPS.
-- ---------------------------------------------------------------------
create extension if not exists vector with schema extensions;
create extension if not exists pgcrypto with schema extensions;
create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron;


-- ---------------------------------------------------------------------
-- 2. Enums
-- ELI5: fixed lists of allowed words. A conversation can only ever be
-- open, pending, snoozed or closed, so a typo can never sneak in.
-- ---------------------------------------------------------------------
create type public.workspace_role as enum ('owner', 'admin', 'agent');
create type public.invite_status as enum ('pending', 'accepted', 'revoked', 'expired');
create type public.source_kind as enum ('website', 'sitemap', 'single_page');
create type public.source_status as enum ('queued', 'crawling', 'processing', 'ready', 'failed');
create type public.page_status as enum ('new', 'chunked', 'embedded', 'skipped', 'failed');
create type public.article_status as enum ('draft', 'published', 'archived');
create type public.chunk_source as enum ('page', 'article');
create type public.conversation_status as enum ('open', 'pending', 'snoozed', 'closed');
create type public.conversation_mode as enum ('ai', 'human');
create type public.conversation_channel as enum ('widget', 'email');
create type public.message_role as enum ('visitor', 'ai', 'agent', 'system');
create type public.flag_source as enum ('ai', 'visitor', 'agent');
create type public.notification_kind as enum (
  'low_confidence', 'flagged', 'handoff', 'assigned', 'visitor_reply',
  'crawl_done', 'crawl_failed', 'cap_warning', 'cap_reached', 'invite_accepted'
);
create type public.job_kind as enum (
  'crawl_site', 'build_knowledge', 'draft_articles', 'embed_article', 'notify', 'email_fallback'
);
create type public.job_status as enum ('queued', 'running', 'succeeded', 'failed', 'dead');
create type public.email_status as enum ('queued', 'sent', 'failed', 'skipped');
create type public.usage_kind as enum (
  'ai_answer', 'suggest_reply', 'article_draft', 'embedding_tokens', 'crawl_page', 'email'
);
create type public.gap_status as enum ('open', 'drafted', 'resolved', 'dismissed');
create type public.widget_position as enum ('bottom_right', 'bottom_left');
create type public.email_capture as enum ('never', 'on_handoff', 'before_chat');


-- ---------------------------------------------------------------------
-- 3. People and workspaces
-- ELI5: a workspace is one customer company (say "Acme"). Profiles are the
-- people who log in. workspace_members says who belongs to which company and
-- whether they are the owner, an admin or an agent.
-- ---------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  avatar_path text,
  current_workspace_id uuid,
  notify_email boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete restrict,
  name text not null check (char_length(name) between 2 and 80),
  slug text not null unique check (slug ~ '^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$'),
  website_url text,
  support_email text,
  sells text check (char_length(sells) <= 600),
  tone text not null default 'friendly' check (tone in ('friendly', 'professional', 'playful', 'concise')),
  top_questions text[] not null default '{}',
  -- Public key that goes in the script tag. Safe to show: it only identifies the workspace.
  public_key text not null unique default ('cv_pub_' || encode(extensions.gen_random_bytes(12), 'hex')),
  onboarding_step smallint not null default 1 check (onboarding_step between 1 and 6),
  help_centre_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index workspaces_owner_id_idx on public.workspaces (owner_id);

alter table public.profiles
  add constraint profiles_current_workspace_fk
  foreign key (current_workspace_id) references public.workspaces (id) on delete set null;
create index profiles_current_workspace_idx on public.profiles (current_workspace_id);

create table public.workspace_members (
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.workspace_role not null default 'agent',
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);
create index workspace_members_user_id_idx on public.workspace_members (user_id);

-- Invitations: we store only a hash of the invite token, never the token itself.
create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  email text not null check (email = lower(email) and position('@' in email) > 1),
  role public.workspace_role not null default 'agent' check (role <> 'owner'),
  token_hash text not null unique,
  status public.invite_status not null default 'pending',
  invited_by uuid references auth.users (id) on delete set null,
  accepted_by uuid references auth.users (id) on delete set null,
  expires_at timestamptz not null default (now() + interval '7 days'),
  created_at timestamptz not null default now()
);
create index invitations_workspace_id_idx on public.invitations (workspace_id);
create index invitations_invited_by_idx on public.invitations (invited_by);
create index invitations_accepted_by_idx on public.invitations (accepted_by);
create unique index invitations_one_pending_per_email
  on public.invitations (workspace_id, email) where status = 'pending';


-- ---------------------------------------------------------------------
-- 4. Widget settings and allowed domains
-- ELI5: how the chat bubble looks and where it is allowed to work. If a
-- website is not on the allowed list, the widget refuses to answer there.
-- ---------------------------------------------------------------------
create table public.widget_settings (
  workspace_id uuid primary key references public.workspaces (id) on delete cascade,
  brand_hex text not null default '#5f86e0' check (brand_hex ~ '^#[0-9a-fA-F]{6}$'),
  greeting text not null default 'Hi there. Ask me anything about us, I answer from our help centre.'
    check (char_length(greeting) <= 240),
  launcher_label text not null default 'Help' check (char_length(launcher_label) <= 24),
  position public.widget_position not null default 'bottom_right',
  icon_path text,
  avatar_path text,
  bot_name text not null default 'Assistant' check (char_length(bot_name) <= 40),
  suggested_questions text[] not null default '{}',
  email_capture public.email_capture not null default 'on_handoff',
  -- Office hours: {"tz":"Europe/London","days":{"mon":["09:00","17:30"],...}}
  office_hours jsonb not null default '{"tz":"UTC","days":{"mon":["09:00","17:00"],"tue":["09:00","17:00"],"wed":["09:00","17:00"],"thu":["09:00","17:00"],"fri":["09:00","17:00"]}}',
  offline_message text not null default 'We are offline right now. Leave your email and we will reply first thing.'
    check (char_length(offline_message) <= 240),
  confidence_threshold numeric(3,2) not null default 0.55 check (confidence_threshold between 0.30 and 0.90),
  show_branding boolean not null default true,
  updated_at timestamptz not null default now()
);

create table public.allowed_domains (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  -- Stored as a bare host: "acme.com" or "*.acme.com". No scheme, no path.
  domain text not null check (domain ~ '^(\\*\\.)?[a-z0-9.-]+\\.[a-z]{2,}$' or domain = 'localhost'),
  created_at timestamptz not null default now(),
  unique (workspace_id, domain)
);
create index allowed_domains_workspace_id_idx on public.allowed_domains (workspace_id);


-- ---------------------------------------------------------------------
-- 5. Knowledge: sources, pages, categories, articles, chunks
-- ELI5: a source is "crawl acme.com". Pages are what the crawler brought
-- back. Articles are the tidy help-centre pages Claude drafts. Chunks are
-- small bite-sized pieces of pages and articles, each with an embedding,
-- so we can find the 6 pieces closest to a visitor's question.
-- ---------------------------------------------------------------------
create table public.kb_sources (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  kind public.source_kind not null default 'website',
  url text not null check (url ~ '^https?://'),
  include_paths text[] not null default '{}',
  exclude_paths text[] not null default '{}',
  status public.source_status not null default 'queued',
  firecrawl_job_id text unique,
  page_limit integer not null default 150 check (page_limit between 1 and 5000),
  pages_found integer not null default 0,
  pages_done integer not null default 0,
  chunks_count integer not null default 0,
  error text,
  last_crawled_at timestamptz,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index kb_sources_workspace_id_idx on public.kb_sources (workspace_id);
create index kb_sources_created_by_idx on public.kb_sources (created_by);

create table public.kb_pages (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  source_id uuid not null references public.kb_sources (id) on delete cascade,
  url text not null,
  title text,
  markdown text not null default '',
  content_hash text not null,
  status public.page_status not null default 'new',
  token_estimate integer not null default 0,
  crawled_at timestamptz not null default now(),
  unique (source_id, url)
);
create index kb_pages_workspace_id_idx on public.kb_pages (workspace_id);
create index kb_pages_status_idx on public.kb_pages (source_id, status);

create table public.kb_categories (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  slug text not null check (slug ~ '^[a-z0-9-]{1,60}$'),
  description text check (char_length(description) <= 200),
  icon text not null default 'book-open',
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, slug)
);
create index kb_categories_workspace_id_idx on public.kb_categories (workspace_id);

create table public.content_gaps (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  question text not null,
  question_hash text not null,
  example_message_ids uuid[] not null default '{}',
  times_asked integer not null default 1,
  last_asked_at timestamptz not null default now(),
  status public.gap_status not null default 'open',
  article_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, question_hash)
);
create index content_gaps_workspace_status_idx on public.content_gaps (workspace_id, status, times_asked desc);

create table public.kb_articles (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  category_id uuid references public.kb_categories (id) on delete set null,
  title text not null check (char_length(title) between 3 and 140),
  slug text not null check (slug ~ '^[a-z0-9-]{1,90}$'),
  summary text check (char_length(summary) <= 300),
  body_md text not null default '',
  status public.article_status not null default 'draft',
  ai_drafted boolean not null default false,
  source_page_ids uuid[] not null default '{}',
  gap_id uuid references public.content_gaps (id) on delete set null,
  views integer not null default 0,
  helpful_yes integer not null default 0,
  helpful_no integer not null default 0,
  embedded_hash text,
  published_at timestamptz,
  updated_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  search tsvector generated always as (
    setweight(to_tsvector('simple', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(summary, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(body_md, '')), 'C')
  ) stored,
  unique (workspace_id, slug)
);
create index kb_articles_workspace_status_idx on public.kb_articles (workspace_id, status);
create index kb_articles_category_id_idx on public.kb_articles (category_id);
create index kb_articles_gap_id_idx on public.kb_articles (gap_id);
create index kb_articles_updated_by_idx on public.kb_articles (updated_by);
create index kb_articles_search_idx on public.kb_articles using gin (search);

alter table public.content_gaps
  add constraint content_gaps_article_fk
  foreign key (article_id) references public.kb_articles (id) on delete set null;
create index content_gaps_article_id_idx on public.content_gaps (article_id);

-- 1024 numbers per chunk: voyage-3.5 with output_dimension 1024.
create table public.kb_chunks (
  id bigint generated always as identity primary key,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  source_type public.chunk_source not null,
  page_id uuid references public.kb_pages (id) on delete cascade,
  article_id uuid references public.kb_articles (id) on delete cascade,
  url text,
  title text,
  content text not null,
  token_count integer not null default 0,
  embedding extensions.vector(1024) not null,
  created_at timestamptz not null default now(),
  check ((source_type = 'page' and page_id is not null) or (source_type = 'article' and article_id is not null))
);
create index kb_chunks_workspace_id_idx on public.kb_chunks (workspace_id);
create index kb_chunks_page_id_idx on public.kb_chunks (page_id);
create index kb_chunks_article_id_idx on public.kb_chunks (article_id);
-- HNSW: a "map of neighbourhoods" so similar chunks are found without
-- checking every row. Cosine distance matches how Voyage vectors are compared.
create index kb_chunks_embedding_hnsw on public.kb_chunks
  using hnsw (embedding extensions.vector_cosine_ops) with (m = 16, ef_construction = 64);


-- ---------------------------------------------------------------------
-- 6. Visitors, conversations, messages
-- ELI5: a visitor is a person on the customer's website (no login). Each
-- chat thread is a conversation. Every line said in it is a message, from
-- the visitor, the AI, a human agent or the system ("Sam joined").
-- ---------------------------------------------------------------------
create table public.visitors (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  anon_id text not null check (char_length(anon_id) between 16 and 64),
  email text check (email is null or position('@' in email) > 1),
  name text check (char_length(name) <= 80),
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  last_page_url text,
  user_agent text,
  country text,
  unique (workspace_id, anon_id)
);
create index visitors_workspace_email_idx on public.visitors (workspace_id, email);

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  visitor_id uuid not null references public.visitors (id) on delete cascade,
  status public.conversation_status not null default 'open',
  mode public.conversation_mode not null default 'ai',
  channel public.conversation_channel not null default 'widget',
  subject text,
  assignee_id uuid references auth.users (id) on delete set null,
  page_url text,
  -- Realtime topic the widget listens on. Unguessable, only ever given to this visitor.
  realtime_topic text not null unique default ('cv:' || encode(extensions.gen_random_bytes(24), 'hex')),
  -- Hash of the token in reply+<token>@ addresses for email replies.
  reply_token_hash text unique,
  message_count integer not null default 0,
  ai_answer_count integer not null default 0,
  low_confidence boolean not null default false,
  flagged boolean not null default false,
  handoff_requested_at timestamptz,
  ai_resolved boolean,
  first_response_at timestamptz,
  last_message_at timestamptz not null default now(),
  last_visitor_message_at timestamptz,
  snoozed_until timestamptz,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index conversations_workspace_inbox_idx on public.conversations (workspace_id, status, last_message_at desc);
create index conversations_visitor_id_idx on public.conversations (visitor_id);
create index conversations_assignee_id_idx on public.conversations (assignee_id);
create index conversations_snoozed_idx on public.conversations (snoozed_until) where status = 'snoozed';

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  role public.message_role not null,
  author_id uuid references auth.users (id) on delete set null,
  body text not null check (char_length(body) between 1 and 8000),
  -- [{ "chunk_id": 12, "title": "Refunds", "url": "https://..." }]
  sources jsonb not null default '[]',
  confidence numeric(4,3) check (confidence is null or confidence between 0 and 1),
  needs_human boolean not null default false,
  attachments jsonb not null default '[]',
  delivered_via text not null default 'widget' check (delivered_via in ('widget', 'email', 'both')),
  email_message_id text,
  -- Idempotency key from the client so a double-click never posts twice.
  client_msg_id text,
  created_at timestamptz not null default now(),
  unique (conversation_id, client_msg_id)
);
create index messages_conversation_created_idx on public.messages (conversation_id, created_at);
create index messages_workspace_created_idx on public.messages (workspace_id, created_at desc);
create index messages_author_id_idx on public.messages (author_id);

create table public.notes (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  author_id uuid references auth.users (id) on delete set null,
  body text not null check (char_length(body) between 1 and 4000),
  created_at timestamptz not null default now()
);
create index notes_conversation_id_idx on public.notes (conversation_id);
create index notes_workspace_id_idx on public.notes (workspace_id);
create index notes_author_id_idx on public.notes (author_id);

create table public.tags (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 32),
  hue smallint not null default 0 check (hue between 0 and 7),
  created_at timestamptz not null default now()
);
create unique index tags_workspace_name_idx on public.tags (workspace_id, lower(name));

create table public.conversation_tags (
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  tag_id uuid not null references public.tags (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (conversation_id, tag_id)
);
create index conversation_tags_tag_id_idx on public.conversation_tags (tag_id);
create index conversation_tags_workspace_id_idx on public.conversation_tags (workspace_id);

-- History of who was assigned what (the current assignee lives on conversations).
create table public.assignments (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  assignee_id uuid references auth.users (id) on delete set null,
  assigned_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
create index assignments_conversation_id_idx on public.assignments (conversation_id);
create index assignments_workspace_id_idx on public.assignments (workspace_id);
create index assignments_assignee_id_idx on public.assignments (assignee_id);
create index assignments_assigned_by_idx on public.assignments (assigned_by);

create table public.canned_replies (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 80),
  shortcut text not null check (shortcut ~ '^[a-z0-9-]{1,24}$'),
  body text not null check (char_length(body) between 1 and 4000),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, shortcut)
);
create index canned_replies_created_by_idx on public.canned_replies (created_by);

create table public.flags (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  message_id uuid references public.messages (id) on delete cascade,
  source public.flag_source not null,
  reason text not null check (char_length(reason) between 1 and 300),
  flagged_by uuid references auth.users (id) on delete set null,
  resolved_at timestamptz,
  resolved_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
create index flags_conversation_id_idx on public.flags (conversation_id);
create index flags_workspace_open_idx on public.flags (workspace_id) where resolved_at is null;
create index flags_message_id_idx on public.flags (message_id);
create index flags_flagged_by_idx on public.flags (flagged_by);
create index flags_resolved_by_idx on public.flags (resolved_by);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  -- null user_id means "everyone in the workspace with email on".
  user_id uuid references auth.users (id) on delete cascade,
  kind public.notification_kind not null,
  conversation_id uuid references public.conversations (id) on delete cascade,
  title text not null,
  body text,
  read_at timestamptz,
  emailed_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_unread_idx on public.notifications (user_id, created_at desc) where read_at is null;
create index notifications_workspace_id_idx on public.notifications (workspace_id, created_at desc);
create index notifications_conversation_id_idx on public.notifications (conversation_id);

create table public.csat (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  conversation_id uuid not null unique references public.conversations (id) on delete cascade,
  score smallint not null check (score between 1 and 5),
  comment text check (char_length(comment) <= 500),
  created_at timestamptz not null default now()
);
create index csat_workspace_created_idx on public.csat (workspace_id, created_at desc);


-- ---------------------------------------------------------------------
-- 7. Jobs, rate limits, metering and email log
-- ELI5: jobs is the to-do list for slow work (crawling, drafting, emails).
-- A worker picks a job, tries it, and if it fails it waits longer each time
-- before trying again. usage_ledger is the meter: every paid API call writes
-- one line so we can cap each plan and know our costs to the cent.
-- ---------------------------------------------------------------------
create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces (id) on delete cascade,
  kind public.job_kind not null,
  status public.job_status not null default 'queued',
  payload jsonb not null default '{}',
  result jsonb,
  idempotency_key text unique,
  attempts smallint not null default 0,
  max_attempts smallint not null default 5,
  run_after timestamptz not null default now(),
  locked_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index jobs_ready_idx on public.jobs (kind, run_after) where status = 'queued';
create index jobs_workspace_id_idx on public.jobs (workspace_id, created_at desc);

create table public.rate_limits (
  key text not null,
  window_start timestamptz not null,
  hits integer not null default 0,
  primary key (key, window_start)
);
create index rate_limits_window_idx on public.rate_limits (window_start);

create table public.usage_ledger (
  id bigint generated always as identity primary key,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  kind public.usage_kind not null,
  quantity integer not null default 1,
  -- Cost in millionths of a dollar. 675 = $0.000675.
  cost_micros bigint not null default 0,
  ref_id text,
  idempotency_key text unique,
  created_at timestamptz not null default now()
);
create index usage_ledger_workspace_kind_created_idx on public.usage_ledger (workspace_id, kind, created_at desc);

create table public.email_log (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces (id) on delete cascade,
  conversation_id uuid references public.conversations (id) on delete set null,
  to_email text not null,
  kind text not null,
  subject text not null,
  dedupe_key text not null unique,
  resend_id text,
  status public.email_status not null default 'queued',
  error text,
  created_at timestamptz not null default now()
);
create index email_log_workspace_id_idx on public.email_log (workspace_id, created_at desc);
create index email_log_conversation_id_idx on public.email_log (conversation_id);


-- ---------------------------------------------------------------------
-- 8. Billing
-- ELI5: Stripe is the till, this is the receipt drawer. Only the Stripe
-- webhook writes here. The app reads it to decide who gets in.
-- The owner pays; everyone in the owner's workspace gets access.
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

-- Map each Stripe price to a plan. After creating prices in Stripe run:
-- insert into public.plan_prices values ('price_...', 'starter', 'month'), ...;
create table public.plan_prices (
  price_id text primary key,
  plan text not null check (plan in ('starter', 'growth', 'scale')),
  billing_interval text not null check (billing_interval in ('month', 'year'))
);
`
