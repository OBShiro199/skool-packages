// Dossier single migration, pasted into the Supabase SQL editor once on a fresh project.
// Tested on Postgres 16 with pgvector (halfvec needs pgvector 0.7+, which Supabase ships).

export const sql = `-- =====================================================================
-- Dossier: full database migration
-- Paste this whole file into Supabase > SQL Editor > New query > Run.
-- Run it ONCE on a fresh project. Order: extensions, enums, tables,
-- helper functions, triggers, RLS policies, storage, realtime, schedules.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. EXTENSIONS
-- ELI5: extensions are add-ons for the database. pgcrypto makes random
-- tokens and SHA-256 fingerprints. vector (pgvector) stores the "meaning
-- numbers" (embeddings) that let us find passages that mean the same
-- thing as a question, even with different words.
-- ---------------------------------------------------------------------
create extension if not exists pgcrypto with schema extensions;
create extension if not exists vector with schema extensions;

-- ---------------------------------------------------------------------
-- 1. ENUMS
-- ELI5: an enum is a fixed list of allowed words for a column. A
-- question can be 'drafted' or 'approved', never 'banana'.
-- ---------------------------------------------------------------------
create type public.workspace_role as enum ('owner', 'admin', 'reviewer', 'contributor', 'viewer');
create type public.document_kind as enum ('policy', 'soc2', 'questionnaire', 'product', 'other');
create type public.document_status as enum ('uploading', 'queued', 'extracting', 'embedding', 'ready', 'failed', 'archived');
create type public.questionnaire_file as enum ('xlsx', 'docx', 'pdf', 'paste');
create type public.questionnaire_status as enum ('uploading', 'parsing', 'mapping', 'ready', 'drafting',
  'in_review', 'approved', 'exported', 'failed');
create type public.question_status as enum ('new', 'queued', 'drafting', 'drafted', 'needs_review',
  'approved', 'skipped', 'failed');
create type public.answer_kind as enum ('text', 'yes_no', 'yes_no_detail');
create type public.library_status as enum ('draft', 'approved', 'archived');
create type public.export_format as enum ('xlsx', 'docx', 'pdf_form', 'answers_xlsx', 'answers_docx', 'csv');
create type public.export_status as enum ('queued', 'running', 'done', 'failed');
create type public.job_kind as enum ('extract_source', 'embed_source', 'parse_questionnaire', 'detect_structure',
  'extract_questions', 'draft_batch', 'embed_library', 'import_library', 'export_questionnaire');
create type public.job_status as enum ('queued', 'running', 'done', 'dead');
create type public.usage_kind as enum ('questions', 'pages', 'embed_tokens', 'rerank_tokens', 'claude_usd', 'llamaparse_usd');

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
-- next to it, created automatically the moment someone signs up.
-- ---------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  job_title text not null default '',
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
-- 4. WORKSPACES, MEMBERS, INVITES, SETTINGS
-- ELI5: a workspace is one company. Members are its people, each with a
-- role. The owner's subscription pays for everyone in the workspace.
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
  role public.workspace_role not null default 'contributor',
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);
create index workspace_members_user_idx on public.workspace_members (user_id);

create table public.workspace_invites (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  email text not null check (position('@' in email) > 1),
  role public.workspace_role not null default 'contributor' check (role <> 'owner'),
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

-- Company facts go into every draft so the AI never guesses them.
create table public.workspace_settings (
  workspace_id uuid primary key references public.workspaces (id) on delete cascade,
  company_facts jsonb not null default '{}'::jsonb,
  confidence_threshold integer not null default 70 check (confidence_threshold between 50 and 90),
  default_review_days integer not null default 180 check (default_review_days in (90, 180, 365)),
  answer_style jsonb not null default '{"tone": "plain", "length": "standard", "person": "we"}'::jsonb,
  two_step_approval boolean not null default false,
  updated_at timestamptz not null default now()
);
create trigger workspace_settings_updated_at before update on public.workspace_settings
  for each row execute function public.set_updated_at();

create table public.notification_prefs (
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  on_assign boolean not null default true,
  on_mention boolean not null default true,
  on_review_due boolean not null default true,
  daily_digest boolean not null default false,
  primary key (workspace_id, user_id)
);
create index notification_prefs_user_idx on public.notification_prefs (user_id);

-- ---------------------------------------------------------------------
-- 5. MEMBERSHIP HELPERS (used by every policy below)
-- ELI5: these are the bouncers. "Is this person in this company?" and
-- "Does this person have one of these roles here?". security definer
-- lets them read the members table without tripping over its own RLS.
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

-- Same checks from a Storage folder name (text). Never casts, so a junk
-- folder name returns false instead of an error.
create or replace function public.is_workspace_member_text(ws text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.workspace_members m
    where m.workspace_id::text = ws and m.user_id = (select auth.uid())
  );
$$;

create or replace function public.has_workspace_role_text(ws text, roles public.workspace_role[])
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.workspace_members m
    where m.workspace_id::text = ws and m.user_id = (select auth.uid()) and m.role = any (roles)
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
-- 6. QUESTION NORMALISER (for exact library matches)
-- ELI5: "1.2 Do you encrypt data at rest?" and "Do you encrypt data at
-- rest" are the same question. This strips numbering, case and
-- punctuation, then makes a fingerprint, so both get the same one.
-- ---------------------------------------------------------------------
create or replace function public.normalize_question(p text)
returns text language sql immutable set search_path = '' as $$
  select trim(regexp_replace(
           regexp_replace(
             regexp_replace(
               regexp_replace(lower(normalize(coalesce(p, ''), NFKC)),
                 '^[[:space:]]*(q|question)?[[:space:]]*[0-9]+([.][0-9]+)*[.):]?[[:space:]]+', ''),
               '^[[:space:]]*[a-z][.)][[:space:]]+', ''),
             '[^[:alnum:]%/ ]+', ' ', 'g'),
           '[[:space:]]+', ' ', 'g'));
$$;

create or replace function public.question_hash(p text)
returns text language sql immutable set search_path = '' as $$
  select encode(extensions.digest(public.normalize_question(p), 'sha256'), 'hex');
$$;

create or replace function public.set_normalized_hash()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.normalized_hash = public.question_hash(new.question);
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- 7. SOURCE DOCUMENTS AND CHUNKS
-- ELI5: sources are your own documents (policies, SOC 2 summary, past
-- questionnaires). Each one is cut into short passages ("chunks"). Each
-- chunk gets an embedding for meaning search and a word index (fts) for
-- exact terms like "AES-256".
-- ---------------------------------------------------------------------
create table public.source_documents (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  kind public.document_kind not null default 'policy',
  file_type text not null check (file_type in ('pdf', 'docx', 'xlsx', 'md', 'txt')),
  storage_path text not null,
  size_bytes bigint not null default 0 check (size_bytes >= 0),
  sha256 text,
  pages integer not null default 0,
  status public.document_status not null default 'uploading',
  error text,
  effective_date date,
  uploaded_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index source_documents_ws_idx on public.source_documents (workspace_id, status);
create index source_documents_uploaded_by_idx on public.source_documents (uploaded_by);
create unique index source_documents_sha_idx on public.source_documents (workspace_id, sha256)
  where sha256 is not null and status <> 'archived';
create trigger source_documents_updated_at before update on public.source_documents
  for each row execute function public.set_updated_at();

create table public.source_chunks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  document_id uuid not null references public.source_documents (id) on delete cascade,
  ordinal integer not null,
  page integer,
  heading text not null default '',
  content text not null,
  token_count integer not null default 0,
  embedding extensions.halfvec(1024),
  fts tsvector generated always as (to_tsvector('english', heading || ' ' || content)) stored,
  created_at timestamptz not null default now(),
  unique (document_id, ordinal)
);
create index source_chunks_ws_idx on public.source_chunks (workspace_id, document_id);
create index source_chunks_fts_idx on public.source_chunks using gin (fts);
create index source_chunks_embedding_idx on public.source_chunks
  using hnsw (embedding extensions.halfvec_cosine_ops) with (m = 16, ef_construction = 64);

-- ---------------------------------------------------------------------
-- 8. QUESTIONNAIRES, SHEETS, QUESTIONS, CITATIONS, COMMENTS
-- ELI5: a questionnaire is the buyer's file. Sheets hold "which column
-- is the question, which column gets the answer". Each question row
-- remembers exactly where its answer goes back in the file (locator).
-- ---------------------------------------------------------------------
create table public.questionnaires (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 200),
  buyer_name text not null default '',
  file_type public.questionnaire_file not null,
  storage_path text,
  size_bytes bigint not null default 0,
  status public.questionnaire_status not null default 'uploading',
  due_at date,
  owner_id uuid references auth.users (id) on delete set null,
  created_by uuid references auth.users (id) on delete set null,
  mapping_version integer not null default 0,
  question_count integer not null default 0,
  approved_count integer not null default 0,
  low_count integer not null default 0,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index questionnaires_ws_idx on public.questionnaires (workspace_id, created_at desc);
create index questionnaires_owner_idx on public.questionnaires (owner_id);
create index questionnaires_created_by_idx on public.questionnaires (created_by);
create trigger questionnaires_updated_at before update on public.questionnaires
  for each row execute function public.set_updated_at();

create table public.questionnaire_sheets (
  id uuid primary key default gen_random_uuid(),
  questionnaire_id uuid not null references public.questionnaires (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  sheet_name text not null,
  sheet_index integer not null,
  header_row integer,
  question_col text,
  answer_col text,
  detail_col text,
  section_col text,
  include boolean not null default true,
  guess_reason text not null default '',
  weak_guess boolean not null default false,
  preview jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  unique (questionnaire_id, sheet_index)
);
create index questionnaire_sheets_ws_idx on public.questionnaire_sheets (workspace_id);
create trigger questionnaire_sheets_updated_at before update on public.questionnaire_sheets
  for each row execute function public.set_updated_at();

create table public.questions (
  id uuid primary key default gen_random_uuid(),
  questionnaire_id uuid not null references public.questionnaires (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  ordinal integer not null,
  section text not null default '',
  text text not null check (char_length(text) between 1 and 4000),
  normalized_hash text not null default '',
  answer_kind public.answer_kind not null default 'text',
  locator jsonb not null default '{}'::jsonb,
  answer_short text not null default '' check (answer_short in ('', 'Yes', 'No', 'Partial', 'N/A')),
  answer_text text not null default '' check (char_length(answer_text) <= 8000),
  model_note text not null default '',
  status public.question_status not null default 'new',
  confidence integer check (confidence between 0 and 100),
  flags text[] not null default '{}',
  assignee_id uuid references auth.users (id) on delete set null,
  due_at date,
  library_answer_id uuid,
  last_edited_by uuid references auth.users (id) on delete set null,
  drafted_at timestamptz,
  approved_by uuid references auth.users (id) on delete set null,
  approved_at timestamptz,
  skip_reason text,
  draft_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (questionnaire_id, ordinal)
);
create index questions_q_status_idx on public.questions (questionnaire_id, status);
create index questions_ws_idx on public.questions (workspace_id);
create index questions_assignee_idx on public.questions (assignee_id, due_at);
create index questions_hash_idx on public.questions (workspace_id, normalized_hash);
create index questions_library_idx on public.questions (library_answer_id);
create index questions_last_edited_idx on public.questions (last_edited_by);
create index questions_approved_by_idx on public.questions (approved_by);
create trigger questions_updated_at before update on public.questions
  for each row execute function public.set_updated_at();

create or replace function public.set_question_hash()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.normalized_hash = public.question_hash(new.text);
  return new;
end;
$$;
create trigger questions_hash before insert or update of text on public.questions
  for each row execute function public.set_question_hash();

create table public.question_comments (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  author_id uuid not null references auth.users (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 4000),
  mentions uuid[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index question_comments_q_idx on public.question_comments (question_id, created_at);
create index question_comments_ws_idx on public.question_comments (workspace_id);
create index question_comments_author_idx on public.question_comments (author_id);
create trigger question_comments_updated_at before update on public.question_comments
  for each row execute function public.set_updated_at();

-- Auto-assign rules (Business and Scale): questions whose section
-- contains the pattern go to this person when the file is read.
create table public.assign_rules (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  section_pattern text not null check (char_length(section_pattern) between 2 and 100),
  assignee_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
create index assign_rules_ws_idx on public.assign_rules (workspace_id);
create index assign_rules_assignee_idx on public.assign_rules (assignee_id);

-- ---------------------------------------------------------------------
-- 9. ANSWER LIBRARY
-- ELI5: approved answers you want to reuse. Each has an owner (who
-- keeps it true) and a review date (when it must be checked again).
-- Variants are other ways buyers ask the same question.
-- ---------------------------------------------------------------------
create table public.library_answers (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  question text not null check (char_length(question) between 3 and 4000),
  answer_short text not null default '' check (answer_short in ('', 'Yes', 'No', 'Partial', 'N/A')),
  answer_text text not null check (char_length(answer_text) between 1 and 8000),
  owner_id uuid references auth.users (id) on delete set null,
  status public.library_status not null default 'draft',
  review_by date not null default (current_date + 180),
  tags text[] not null default '{}',
  normalized_hash text not null default '',
  embedding extensions.halfvec(1024),
  times_used integer not null default 0,
  last_used_at timestamptz,
  source_question_id uuid references public.questions (id) on delete set null,
  source_document_id uuid references public.source_documents (id) on delete set null,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index library_answers_ws_idx on public.library_answers (workspace_id, status);
create index library_answers_hash_idx on public.library_answers (workspace_id, normalized_hash);
create index library_answers_owner_idx on public.library_answers (owner_id);
create index library_answers_review_idx on public.library_answers (workspace_id, review_by);
create index library_answers_source_q_idx on public.library_answers (source_question_id);
create index library_answers_source_doc_idx on public.library_answers (source_document_id);
create index library_answers_created_by_idx on public.library_answers (created_by);
create index library_answers_embedding_idx on public.library_answers
  using hnsw (embedding extensions.halfvec_cosine_ops);
create trigger library_answers_updated_at before update on public.library_answers
  for each row execute function public.set_updated_at();
create trigger library_answers_hash before insert or update of question on public.library_answers
  for each row execute function public.set_normalized_hash();

alter table public.questions
  add constraint questions_library_fk foreign key (library_answer_id)
  references public.library_answers (id) on delete set null;

create table public.library_variants (
  id uuid primary key default gen_random_uuid(),
  library_answer_id uuid not null references public.library_answers (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  question text not null check (char_length(question) between 3 and 4000),
  normalized_hash text not null default '',
  embedding extensions.halfvec(1024),
  created_at timestamptz not null default now()
);
create index library_variants_answer_idx on public.library_variants (library_answer_id);
create index library_variants_hash_idx on public.library_variants (workspace_id, normalized_hash);
create unique index library_variants_unique_idx on public.library_variants (library_answer_id, normalized_hash);
create index library_variants_embedding_idx on public.library_variants
  using hnsw (embedding extensions.halfvec_cosine_ops);
create trigger library_variants_hash before insert or update of question on public.library_variants
  for each row execute function public.set_normalized_hash();

create table public.answer_citations (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  chunk_id uuid references public.source_chunks (id) on delete set null,
  library_answer_id uuid references public.library_answers (id) on delete set null,
  ref text not null,
  quote text not null default '' check (char_length(quote) <= 400),
  score numeric not null default 0,
  created_at timestamptz not null default now()
);
create index answer_citations_q_idx on public.answer_citations (question_id);
create index answer_citations_ws_idx on public.answer_citations (workspace_id);
create index answer_citations_chunk_idx on public.answer_citations (chunk_id);
create index answer_citations_library_idx on public.answer_citations (library_answer_id);

-- ---------------------------------------------------------------------
-- 10. EXPORTS
-- ELI5: each export is one file you downloaded. Inserting a row here
-- puts a job on the to-do list; the file runner builds the file.
-- ---------------------------------------------------------------------
create table public.exports (
  id uuid primary key default gen_random_uuid(),
  questionnaire_id uuid not null references public.questionnaires (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  format public.export_format not null,
  only_approved boolean not null default true,
  status public.export_status not null default 'queued',
  storage_path text,
  answer_count integer not null default 0,
  size_bytes bigint not null default 0,
  error text,
  requested_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index exports_q_idx on public.exports (questionnaire_id, created_at desc);
create index exports_ws_idx on public.exports (workspace_id);
create index exports_requested_by_idx on public.exports (requested_by);
create trigger exports_updated_at before update on public.exports
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- 11. JOBS QUEUE, USAGE LEDGER, EMAIL LOG, RATE LIMITS
-- ELI5: jobs is the to-do list for the two background workers. "edge"
-- jobs (AI work) run in a Supabase function, "node" jobs (files) run on
-- Vercel. usage_ledger is the meter: every question drafted and every
-- paid API call writes a line, so nobody passes their plan.
-- ---------------------------------------------------------------------
create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  kind public.job_kind not null,
  runner text generated always as (
    case when kind in ('extract_source', 'parse_questionnaire', 'extract_questions', 'import_library',
                       'export_questionnaire') then 'node' else 'edge' end) stored,
  ref_id uuid not null,
  status public.job_status not null default 'queued',
  attempts integer not null default 0,
  run_after timestamptz not null default now(),
  locked_at timestamptz,
  idempotency_key text not null unique,
  payload jsonb not null default '{}'::jsonb,
  requested_by uuid references auth.users (id) on delete set null,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index jobs_queue_idx on public.jobs (runner, status, run_after);
create index jobs_ws_idx on public.jobs (workspace_id);
create index jobs_ref_idx on public.jobs (ref_id);
create index jobs_requested_by_idx on public.jobs (requested_by);
create trigger jobs_updated_at before update on public.jobs
  for each row execute function public.set_updated_at();

create table public.usage_ledger (
  id bigint generated always as identity primary key,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null,
  kind public.usage_kind not null,
  quantity numeric not null,
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
  kind text not null,
  dedupe_key text unique,
  to_email text not null,
  resend_id text,
  status text not null default 'queued',
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
-- 12. AUDIT LOG (append-only)
-- ELI5: a diary of who did what. Rows can be added but never changed
-- or deleted from the app. Only the nightly clean-up may remove rows
-- older than the plan keeps them.
-- ---------------------------------------------------------------------
create table public.audit_events (
  id bigint generated always as identity primary key,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  actor_id uuid references auth.users (id) on delete set null,
  action text not null,
  entity text not null,
  entity_id uuid,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index audit_events_ws_idx on public.audit_events (workspace_id, created_at desc);
create index audit_events_actor_idx on public.audit_events (actor_id);

create or replace function public.audit_immutable()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'DELETE' and coalesce(current_setting('dossier.purge', true), '') = 'on' then
    return old;
  end if;
  if tg_op = 'DELETE' and pg_trigger_depth() > 1 then
    return old; -- cascades when a whole workspace is deleted
  end if;
  raise exception 'audit_events is append-only';
end;
$$;
create trigger audit_events_no_update before update on public.audit_events
  for each row execute function public.audit_immutable();
create trigger audit_events_no_delete before delete on public.audit_events
  for each row execute function public.audit_immutable();

create or replace function public.log_audit(p_ws uuid, p_action text, p_entity text, p_id uuid, p_detail jsonb)
returns void language sql security definer set search_path = '' as $$
  insert into public.audit_events (workspace_id, actor_id, action, entity, entity_id, detail)
  values (p_ws, (select auth.uid()), p_action, p_entity, p_id, coalesce(p_detail, '{}'::jsonb));
$$;

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

-- Which Stripe price is which plan. After you create prices in Stripe:
-- insert into public.plan_prices values ('price_...', 'team'), ...
create table public.plan_prices (
  price_id text primary key,
  plan text not null check (plan in ('team', 'business', 'scale'))
);

-- Test-only limit overrides. No policies: only you, in the SQL editor.
create table public.workspace_limit_overrides (
  workspace_id uuid primary key references public.workspaces (id) on delete cascade,
  questions integer,
  pages integer,
  seats integer
);

-- ---------------------------------------------------------------------
-- 14. ACCESS AND LIMIT FUNCTIONS
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
returns table (plan text, trialing boolean, questions integer, pages integer, seats integer, documents integer,
               storage_mb integer, audit_days integer, auto_assign boolean, two_step boolean, audit_export boolean)
language plpgsql stable security definer set search_path = '' as $$
declare
  v_plan text;
  v_status text;
  o record;
begin
  select coalesce(pp.plan, 'team'), s.status into v_plan, v_status
  from public.workspaces w
  left join public.subscriptions s on s.user_id = w.owner_id
  left join public.plan_prices pp on pp.price_id = s.price_id
  where w.id = ws;
  if v_plan is null then v_plan := 'team'; end if;

  plan := v_plan;
  trialing := coalesce(v_status = 'trialing', false);
  if v_plan = 'scale' then
    questions := 10000; pages := 30000; seats := 40; documents := 5000; storage_mb := 51200;
    audit_days := 1095; auto_assign := true; two_step := true; audit_export := true;
  elsif v_plan = 'business' then
    questions := 4000; pages := 10000; seats := 15; documents := 1500; storage_mb := 10240;
    audit_days := 365; auto_assign := true; two_step := true; audit_export := true;
  else
    questions := 1000; pages := 3000; seats := 5; documents := 300; storage_mb := 2048;
    audit_days := 90; auto_assign := false; two_step := false; audit_export := false;
  end if;

  -- A 7 day trial gets 150 questions, 300 pages and 3 seats.
  if trialing then
    questions := least(questions, 150); pages := least(pages, 300); seats := least(seats, 3);
  end if;

  select * into o from public.workspace_limit_overrides where workspace_id = ws;
  if found then
    questions := coalesce(o.questions, questions);
    pages := coalesce(o.pages, pages);
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

-- What the sidebar meter and the Billing page show. Members only.
create or replace function public.usage_summary(ws uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  l record;
begin
  if not public.is_workspace_member(ws) then raise exception 'not_a_member'; end if;
  select * into l from public.plan_limits(ws);
  return jsonb_build_object(
    'plan', l.plan, 'trialing', l.trialing,
    'questions_used', public.usage_this_month(ws, 'questions'), 'questions_limit', l.questions,
    'pages_used', public.usage_this_month(ws, 'pages'), 'pages_limit', l.pages,
    'seats_used', (select count(*) from public.workspace_members where workspace_id = ws), 'seats_limit', l.seats,
    'documents_used', (select count(*) from public.source_documents where workspace_id = ws and status <> 'archived'),
    'documents_limit', l.documents,
    'storage_mb_used', round(((select coalesce(sum(size_bytes), 0) from public.source_documents where workspace_id = ws)
                    + (select coalesce(sum(size_bytes), 0) from public.questionnaires where workspace_id = ws))
                    / 1048576.0, 1),
    'storage_mb_limit', l.storage_mb,
    'resets_on', (date_trunc('month', now()) + interval '1 month')::date);
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
  delete from public.rate_limits where window_start < now() - interval '1 day';
  return v_hits <= p_max;
end;
$$;

-- ---------------------------------------------------------------------
-- 15. WORKSPACE, TEAM AND INVITE FUNCTIONS (called from the app)
-- ELI5: creating a workspace and joining one happen inside the database
-- in one step, so seats and roles can never be skipped.
-- ---------------------------------------------------------------------
create or replace function public.create_workspace(p_name text, p_facts jsonb default '{}'::jsonb)
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
  insert into public.workspace_settings (workspace_id, company_facts) values (v_ws, coalesce(p_facts, '{}'::jsonb));
  insert into public.notification_prefs (workspace_id, user_id) values (v_ws, v_uid);
  update public.profiles set current_workspace_id = v_ws where id = v_uid;
  perform public.log_audit(v_ws, 'workspace.created', 'workspace', v_ws, jsonb_build_object('name', p_name));
  return v_ws;
end;
$$;

-- Returns the raw token once. The edge function emails it. Only the hash is kept.
create or replace function public.create_invite(p_ws uuid, p_email text, p_role public.workspace_role,
                                                p_actor uuid default null)
returns text language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid := coalesce((select auth.uid()), p_actor);
  v_token text;
  v_seats integer;
  v_used integer;
begin
  if not exists (select 1 from public.workspace_members
                 where workspace_id = p_ws and user_id = v_actor and role in ('owner', 'admin')) then
    raise exception 'only owners and admins can invite';
  end if;
  if p_role = 'owner' then raise exception 'cannot invite an owner'; end if;
  if exists (select 1 from public.workspace_members m join auth.users u on u.id = m.user_id
             where m.workspace_id = p_ws and lower(u.email) = lower(trim(p_email))) then
    raise exception 'already_member';
  end if;
  select l.seats into v_seats from public.plan_limits(p_ws) l;
  select (select count(*) from public.workspace_members where workspace_id = p_ws)
       + (select count(*) from public.workspace_invites
          where workspace_id = p_ws and accepted_at is null and expires_at > now())
    into v_used;
  if v_used >= v_seats then raise exception 'seat_limit_reached'; end if;
  v_token := translate(encode(extensions.gen_random_bytes(32), 'base64'), '+/=', '-_');
  insert into public.workspace_invites (workspace_id, email, role, token_hash, invited_by)
  values (p_ws, lower(trim(p_email)), p_role, encode(extensions.digest(v_token, 'sha256'), 'hex'), v_actor);
  insert into public.audit_events (workspace_id, actor_id, action, entity, detail)
  values (p_ws, v_actor, 'member.invited', 'invite', jsonb_build_object('email', lower(trim(p_email)), 'role', p_role));
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
  perform public.log_audit(v_inv.workspace_id, 'member.joined', 'member', v_uid,
                           jsonb_build_object('role', v_inv.role));
  return v_inv.workspace_id;
end;
$$;

create or replace function public.set_member_role(p_ws uuid, p_user uuid, p_role public.workspace_role)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.has_workspace_role(p_ws, array['owner']::public.workspace_role[]) then
    raise exception 'only the owner can change roles';
  end if;
  if p_role = 'owner' then raise exception 'ownership transfer is a support action'; end if;
  update public.workspace_members set role = p_role
  where workspace_id = p_ws and user_id = p_user and role <> 'owner';
  if not found then raise exception 'member_not_found'; end if;
  perform public.log_audit(p_ws, 'member.role_changed', 'member', p_user, jsonb_build_object('role', p_role));
end;
$$;

-- ---------------------------------------------------------------------
-- 16. REVIEW FUNCTIONS (called from the review workspace)
-- ELI5: approving, assigning and skipping go through these, so the role
-- rules and the audit log can never be skipped by a clever browser.
-- ---------------------------------------------------------------------
create or replace function public.refresh_questionnaire(p_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_q public.questionnaires;
  v_total integer; v_done integer; v_low integer; v_busy integer; v_drafted integer;
  v_threshold integer;
  v_status public.questionnaire_status;
begin
  select * into v_q from public.questionnaires where id = p_id for update;
  if not found then return; end if;
  select confidence_threshold into v_threshold from public.workspace_settings where workspace_id = v_q.workspace_id;
  select count(*),
         count(*) filter (where status in ('approved', 'skipped')),
         count(*) filter (where status = 'needs_review' or (status = 'drafted' and confidence < coalesce(v_threshold, 70))),
         count(*) filter (where status in ('queued', 'drafting')),
         count(*) filter (where status in ('drafted', 'needs_review', 'approved', 'skipped'))
    into v_total, v_done, v_low, v_busy, v_drafted
  from public.questions where questionnaire_id = p_id;

  v_status := v_q.status;
  if v_q.status not in ('uploading', 'parsing', 'mapping', 'failed') then
    if v_busy > 0 then v_status := 'drafting';
    elsif v_total > 0 and v_done = v_total then
      v_status := case when v_q.status = 'exported' then 'exported'::public.questionnaire_status
                       else 'approved'::public.questionnaire_status end;
    elsif v_drafted > 0 then v_status := 'in_review';
    else v_status := 'ready';
    end if;
  end if;
  update public.questionnaires
  set question_count = v_total, approved_count = v_done, low_count = v_low, status = v_status
  where id = p_id;
end;
$$;

create or replace function public.questions_refresh_trigger()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform public.refresh_questionnaire(new.questionnaire_id);
  return null;
end;
$$;
create trigger questions_refresh after update of status on public.questions
  for each row when (old.status is distinct from new.status)
  execute function public.questions_refresh_trigger();

create or replace function public.approve_questions(p_ids uuid[], p_save_to_library boolean default true,
                                                    p_update_library boolean default false)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  r public.questions;
  v_lib public.library_answers;
  v_new uuid;
  v_days integer;
  v_two_step boolean;
  v_approved integer := 0;
  v_skipped integer := 0;
begin
  if coalesce(array_length(p_ids, 1), 0) > 1000 then raise exception 'too_many'; end if;
  for r in select * from public.questions where id = any (p_ids) for update loop
    if not public.has_workspace_role(r.workspace_id, array['owner', 'admin', 'reviewer']::public.workspace_role[]) then
      raise exception 'only reviewers can approve';
    end if;
    select s.default_review_days, (s.two_step_approval and l.two_step) into v_days, v_two_step
    from public.workspace_settings s, public.plan_limits(r.workspace_id) l where s.workspace_id = r.workspace_id;
    -- Two-step approval: you cannot approve an answer you edited last.
    if r.status not in ('drafted', 'needs_review') or trim(r.answer_text) = ''
       or (coalesce(v_two_step, false) and r.last_edited_by = v_uid) then
      v_skipped := v_skipped + 1;
      continue;
    end if;

    if p_save_to_library then
      v_lib := null;
      if r.library_answer_id is not null then
        select * into v_lib from public.library_answers where id = r.library_answer_id;
      end if;
      if v_lib.id is not null and v_lib.answer_text = r.answer_text then
        update public.library_answers set times_used = times_used + 1, last_used_at = now() where id = v_lib.id;
        v_new := v_lib.id;
      elsif v_lib.id is not null and p_update_library then
        perform public.log_audit(r.workspace_id, 'library.updated', 'library_answer', v_lib.id,
          jsonb_build_object('previous_answer', v_lib.answer_text));
        update public.library_answers
        set answer_text = r.answer_text, answer_short = r.answer_short, status = 'approved',
            review_by = current_date + coalesce(v_days, 180), times_used = times_used + 1, last_used_at = now()
        where id = v_lib.id;
        v_new := v_lib.id;
      else
        insert into public.library_answers (workspace_id, question, answer_short, answer_text, owner_id, status,
          review_by, source_question_id, created_by, times_used, last_used_at)
        values (r.workspace_id, r.text, r.answer_short, r.answer_text, v_uid, 'approved',
          current_date + coalesce(v_days, 180), r.id, v_uid, 1, now())
        returning id into v_new;  -- the library_answers_reembed trigger queues its embedding
      end if;
      -- Remember this wording as another way to ask the same question.
      insert into public.library_variants (library_answer_id, workspace_id, question)
      select v_new, r.workspace_id, r.text
      where public.question_hash(r.text) <> (select normalized_hash from public.library_answers where id = v_new)
      on conflict (library_answer_id, normalized_hash) do nothing;
    else
      v_new := r.library_answer_id;
    end if;

    update public.questions
    set status = 'approved', approved_by = v_uid, approved_at = now(), library_answer_id = v_new
    where id = r.id;
    perform public.log_audit(r.workspace_id, 'answer.approved', 'question', r.id,
      jsonb_build_object('questionnaire_id', r.questionnaire_id, 'saved_to_library', p_save_to_library));
    v_approved := v_approved + 1;
  end loop;
  return jsonb_build_object('approved', v_approved, 'skipped', v_skipped);
end;
$$;

create or replace function public.assign_questions(p_ids uuid[], p_assignee uuid, p_due_at date default null)
returns integer language plpgsql security definer set search_path = '' as $$
declare
  v_ws uuid;
  v_count integer;
begin
  select distinct workspace_id into v_ws from public.questions where id = any (p_ids);
  if v_ws is null then raise exception 'not_found'; end if;
  if (select count(distinct workspace_id) from public.questions where id = any (p_ids)) > 1 then
    raise exception 'mixed_workspaces';
  end if;
  if not public.has_workspace_role(v_ws, array['owner', 'admin', 'reviewer']::public.workspace_role[]) then
    raise exception 'only reviewers can assign';
  end if;
  if p_assignee is not null and not exists (
    select 1 from public.workspace_members where workspace_id = v_ws and user_id = p_assignee) then
    raise exception 'assignee_not_member';
  end if;
  update public.questions set assignee_id = p_assignee, due_at = p_due_at where id = any (p_ids);
  get diagnostics v_count = row_count;
  perform public.log_audit(v_ws, 'questions.assigned', 'question', null,
    jsonb_build_object('count', v_count, 'assignee', p_assignee, 'due_at', p_due_at));
  return v_count;
end;
$$;

create or replace function public.skip_questions(p_ids uuid[], p_reason text default 'Not applicable')
returns integer language plpgsql security definer set search_path = '' as $$
declare
  v_ws uuid;
  v_count integer;
begin
  select min(workspace_id::text)::uuid into v_ws from public.questions where id = any (p_ids);
  if (select count(distinct workspace_id) from public.questions where id = any (p_ids)) <> 1
     or not public.has_workspace_role(v_ws, array['owner', 'admin', 'reviewer']::public.workspace_role[]) then
    raise exception 'only reviewers can skip';
  end if;
  update public.questions
  set status = 'skipped', skip_reason = left(coalesce(p_reason, ''), 200), approved_by = (select auth.uid()),
      approved_at = now()
  where id = any (p_ids) and status not in ('queued', 'drafting');
  get diagnostics v_count = row_count;
  perform public.log_audit(v_ws, 'questions.skipped', 'question', null, jsonb_build_object('count', v_count));
  return v_count;
end;
$$;

create or replace function public.set_library_owner(p_id uuid, p_owner uuid, p_review_by date)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_ws uuid;
begin
  select workspace_id into v_ws from public.library_answers where id = p_id;
  if v_ws is null or not public.has_workspace_role(v_ws, array['owner', 'admin', 'reviewer']::public.workspace_role[]) then
    raise exception 'only reviewers can change owners';
  end if;
  if p_owner is not null and not exists (select 1 from public.workspace_members where workspace_id = v_ws and user_id = p_owner) then
    raise exception 'owner_not_member';
  end if;
  update public.library_answers set owner_id = p_owner, review_by = p_review_by where id = p_id;
  perform public.log_audit(v_ws, 'library.owner_changed', 'library_answer', p_id,
    jsonb_build_object('owner', p_owner, 'review_by', p_review_by));
end;
$$;

-- Exports: inserting a row (reviewer+) queues the file job.
create or replace function public.enqueue_export()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.jobs (workspace_id, kind, ref_id, idempotency_key, requested_by)
  values (new.workspace_id, 'export_questionnaire', new.id, 'export:' || new.id, new.requested_by)
  on conflict (idempotency_key) do nothing;
  perform public.log_audit(new.workspace_id, 'questionnaire.export_requested', 'export', new.id,
    jsonb_build_object('format', new.format, 'questionnaire_id', new.questionnaire_id));
  return new;
end;
$$;
create trigger exports_enqueue after insert on public.exports
  for each row execute function public.enqueue_export();

-- ---------------------------------------------------------------------
-- 17. WORKER FUNCTIONS (edge functions and the file runner, secret key)
-- ELI5: claim_jobs hands a worker a few to-dos and marks them "mine" so
-- two workers never grab the same one. reserve_questions takes questions
-- off this month's allowance BEFORE any AI call, inside a lock, so two
-- browser tabs can never both squeeze past the cap. match_chunks is the
-- search: meaning (vectors) plus exact words, inside one workspace only.
-- ---------------------------------------------------------------------
create or replace function public.claim_jobs(p_runner text, p_limit integer)
returns setof public.jobs language sql security definer set search_path = '' as $$
  update public.jobs j set status = 'running', locked_at = now()
  where j.id in (
    select id from public.jobs
    where runner = p_runner and status = 'queued' and run_after <= now()
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

create or replace function public.reserve_questions(p_ws uuid, p_run uuid, p_user uuid, p_n integer,
                                                    p_allow_partial boolean default false)
returns integer language plpgsql security definer set search_path = '' as $$
declare
  v_limit integer;
  v_used numeric;
  v_grant integer;
begin
  perform 1 from public.workspaces where id = p_ws for update;  -- one reservation at a time per workspace
  select l.questions into v_limit from public.plan_limits(p_ws) l;
  v_used := public.usage_this_month(p_ws, 'questions');
  v_grant := greatest(0, least(p_n, v_limit - v_used::integer));
  if v_grant = 0 then return 0; end if;
  if v_grant < p_n and not p_allow_partial then return -(v_limit - v_used::integer); end if;
  insert into public.usage_ledger (workspace_id, user_id, kind, quantity, ref_id, idempotency_key)
  values (p_ws, p_user, 'questions', v_grant, p_run, 'run:' || p_run)
  on conflict (idempotency_key) do nothing;
  return v_grant;
end;
$$;

-- Hybrid search over one workspace's ready sources (reciprocal rank fusion).
create or replace function public.match_chunks(p_ws uuid, p_embedding extensions.halfvec(1024), p_query text,
                                               p_k integer default 40)
returns table (chunk_id uuid, document_id uuid, title text, page integer, heading text, content text,
               effective_date date, score double precision)
language sql stable security definer set search_path = '' as $$
  with vec as (
    select c.id, row_number() over (order by c.embedding operator(extensions.<=>) p_embedding) as rnk
    from public.source_chunks c
    join public.source_documents d on d.id = c.document_id
    where c.workspace_id = p_ws and d.status = 'ready' and c.embedding is not null
    order by c.embedding operator(extensions.<=>) p_embedding
    limit p_k
  ),
  txt as (
    select c.id, row_number() over (order by ts_rank_cd(c.fts, q) desc) as rnk
    from public.source_chunks c
    join public.source_documents d on d.id = c.document_id,
         websearch_to_tsquery('english', p_query) q
    where c.workspace_id = p_ws and d.status = 'ready' and c.fts @@ q
    order by ts_rank_cd(c.fts, q) desc
    limit p_k
  )
  select c.id, c.document_id, d.title, c.page, c.heading, c.content, d.effective_date,
         coalesce(1.0 / (60 + vec.rnk), 0) + coalesce(1.0 / (60 + txt.rnk), 0) as score
  from vec
  full outer join txt on txt.id = vec.id
  join public.source_chunks c on c.id = coalesce(vec.id, txt.id)
  join public.source_documents d on d.id = c.document_id
  order by score desc
  limit p_k;
$$;

-- Approved library answers closest in meaning (main wording or a variant).
create or replace function public.match_library(p_ws uuid, p_embedding extensions.halfvec(1024), p_k integer default 5)
returns table (library_answer_id uuid, question text, answer_short text, answer_text text, owner_id uuid,
               review_by date, stale boolean, similarity double precision)
language sql stable security definer set search_path = '' as $$
  with hits as (
    select a.id, 1 - (a.embedding operator(extensions.<=>) p_embedding) as sim
    from public.library_answers a
    where a.workspace_id = p_ws and a.status = 'approved' and a.embedding is not null
    union all
    select v.library_answer_id, 1 - (v.embedding operator(extensions.<=>) p_embedding)
    from public.library_variants v
    join public.library_answers a on a.id = v.library_answer_id
    where v.workspace_id = p_ws and a.status = 'approved' and v.embedding is not null
  ),
  best as (select id, max(sim) as sim from hits group by id)
  select a.id, a.question, a.answer_short, a.answer_text, a.owner_id, a.review_by,
         a.review_by < current_date, b.sim
  from best b join public.library_answers a on a.id = b.id
  order by b.sim desc
  limit p_k;
$$;

-- Nightly: drop audit rows older than the plan keeps them.
create or replace function public.purge_old_audit()
returns integer language plpgsql security definer set search_path = '' as $$
declare v_count integer;
begin
  perform set_config('dossier.purge', 'on', true);
  delete from public.audit_events e
  using public.workspaces w
  where w.id = e.workspace_id
    and e.created_at < now() - make_interval(days => (select l.audit_days from public.plan_limits(w.id) l));
  get diagnostics v_count = row_count;
  perform set_config('dossier.purge', 'off', true);
  return v_count;
end;
$$;

-- Workers and webhooks only. The browser can never call these.
revoke execute on function public.claim_jobs(text, integer) from public, anon, authenticated;
revoke execute on function public.release_stuck_jobs() from public, anon, authenticated;
revoke execute on function public.reserve_questions(uuid, uuid, uuid, integer, boolean) from public, anon, authenticated;
revoke execute on function public.match_chunks(uuid, extensions.halfvec, text, integer) from public, anon, authenticated;
revoke execute on function public.match_library(uuid, extensions.halfvec, integer) from public, anon, authenticated;
revoke execute on function public.purge_old_audit() from public, anon, authenticated;
revoke execute on function public.try_rate_limit(text, integer, integer) from public, anon, authenticated;
revoke execute on function public.create_invite(uuid, text, public.workspace_role, uuid) from public, anon, authenticated;
revoke execute on function public.log_audit(uuid, text, text, uuid, jsonb) from public, anon, authenticated;
revoke execute on function public.refresh_questionnaire(uuid) from public, anon, authenticated;
revoke execute on function public.plan_limits(uuid) from public, anon;
revoke execute on function public.create_workspace(text, jsonb) from public, anon;
revoke execute on function public.accept_invite(text) from public, anon;
revoke execute on function public.approve_questions(uuid[], boolean, boolean) from public, anon;
revoke execute on function public.assign_questions(uuid[], uuid, date) from public, anon;
revoke execute on function public.skip_questions(uuid[], text) from public, anon;
revoke execute on function public.set_library_owner(uuid, uuid, date) from public, anon;
revoke execute on function public.set_member_role(uuid, uuid, public.workspace_role) from public, anon;
revoke execute on function public.usage_summary(uuid) from public, anon;

-- ---------------------------------------------------------------------
-- 18. GUARD TRIGGERS (the rules the browser cannot break)
-- ELI5: RLS decides WHICH rows you can touch. These triggers decide
-- WHICH COLUMNS. A contributor can type an answer but cannot set its
-- confidence, approve it, or move it to another questionnaire.
-- ---------------------------------------------------------------------
create or replace function public.guard_question_columns()
returns trigger language plpgsql set search_path = '' as $$
begin
  if current_user not in ('authenticated', 'anon') then return new; end if;
  if new.id <> old.id or new.questionnaire_id <> old.questionnaire_id or new.workspace_id <> old.workspace_id
     or new.ordinal <> old.ordinal or new.text <> old.text or new.locator <> old.locator
     or new.answer_kind <> old.answer_kind or new.section <> old.section
     or new.confidence is distinct from old.confidence or new.flags <> old.flags
     or new.model_note <> old.model_note
     or new.assignee_id is distinct from old.assignee_id or new.due_at is distinct from old.due_at
     or new.library_answer_id is distinct from old.library_answer_id
     or new.approved_by is distinct from old.approved_by or new.approved_at is distinct from old.approved_at
     or new.drafted_at is distinct from old.drafted_at or new.draft_count <> old.draft_count
     or new.skip_reason is distinct from old.skip_reason then
    raise exception 'only the answer can be edited here';
  end if;
  if new.status <> old.status then
    raise exception 'status changes go through approve_questions, skip_questions or a redraft';
  end if;
  if new.answer_text <> old.answer_text or new.answer_short <> old.answer_short then
    if old.status in ('queued', 'drafting') then raise exception 'wait for the draft to finish'; end if;
    new.last_edited_by := (select auth.uid());
    -- Editing an approved answer means it needs approving again.
    if old.status in ('approved', 'new', 'failed', 'skipped') then
      new.status := 'drafted';
      new.approved_by := null;
      new.approved_at := null;
    end if;
  end if;
  return new;
end;
$$;
create trigger questions_guard before update on public.questions
  for each row execute function public.guard_question_columns();

create or replace function public.guard_document_columns()
returns trigger language plpgsql set search_path = '' as $$
begin
  if current_user not in ('authenticated', 'anon') then return new; end if;
  if tg_op = 'INSERT' then
    if new.status <> 'uploading' or new.sha256 is not null or new.pages <> 0 then
      raise exception 'new documents start as uploading';
    end if;
    if split_part(new.storage_path, '/', 1) <> new.workspace_id::text then
      raise exception 'storage path must start with the workspace id';
    end if;
    new.uploaded_by := (select auth.uid());
    return new;
  end if;
  if new.storage_path <> old.storage_path or new.sha256 is distinct from old.sha256 or new.pages <> old.pages
     or new.workspace_id <> old.workspace_id or new.error is distinct from old.error
     or new.size_bytes <> old.size_bytes or new.uploaded_by is distinct from old.uploaded_by then
    raise exception 'only title, kind, effective date and archive can be changed here';
  end if;
  if new.status <> old.status and not (new.status = 'archived' and old.status in ('ready', 'failed'))
     and not (new.status = 'ready' and old.status = 'archived') then
    raise exception 'status changes are made by the worker';
  end if;
  return new;
end;
$$;
create trigger source_documents_guard before insert or update on public.source_documents
  for each row execute function public.guard_document_columns();

create or replace function public.guard_questionnaire_columns()
returns trigger language plpgsql set search_path = '' as $$
begin
  if current_user not in ('authenticated', 'anon') then return new; end if;
  if tg_op = 'INSERT' then
    if new.status <> 'uploading' or new.question_count <> 0 or new.approved_count <> 0 then
      raise exception 'new questionnaires start as uploading';
    end if;
    if new.storage_path is not null and split_part(new.storage_path, '/', 1) <> new.workspace_id::text then
      raise exception 'storage path must start with the workspace id';
    end if;
    new.created_by := (select auth.uid());
    new.owner_id := coalesce(new.owner_id, new.created_by);
    return new;
  end if;
  if new.status <> old.status or new.storage_path is distinct from old.storage_path
     or new.workspace_id <> old.workspace_id or new.question_count <> old.question_count
     or new.approved_count <> old.approved_count or new.low_count <> old.low_count
     or new.mapping_version <> old.mapping_version or new.error is distinct from old.error
     or new.file_type <> old.file_type or new.size_bytes <> old.size_bytes then
    raise exception 'only name, buyer, due date and owner can be changed here';
  end if;
  return new;
end;
$$;
create trigger questionnaires_guard before insert or update on public.questionnaires
  for each row execute function public.guard_questionnaire_columns();

create or replace function public.guard_sheet_columns()
returns trigger language plpgsql set search_path = '' as $$
begin
  if current_user not in ('authenticated', 'anon') then return new; end if;
  if new.sheet_name <> old.sheet_name or new.sheet_index <> old.sheet_index or new.preview <> old.preview
     or new.questionnaire_id <> old.questionnaire_id or new.workspace_id <> old.workspace_id then
    raise exception 'only the column mapping can be changed here';
  end if;
  if (select status from public.questionnaires where id = new.questionnaire_id) <> 'mapping' then
    raise exception 'the mapping is locked once questions are created';
  end if;
  return new;
end;
$$;
create trigger questionnaire_sheets_guard before update on public.questionnaire_sheets
  for each row execute function public.guard_sheet_columns();

create or replace function public.guard_library_columns()
returns trigger language plpgsql set search_path = '' as $$
begin
  if current_user not in ('authenticated', 'anon') then return new; end if;
  if tg_op = 'INSERT' then
    new.created_by := (select auth.uid());
    new.owner_id := coalesce(new.owner_id, new.created_by);
    new.times_used := 0; new.last_used_at := null; new.embedding := null;
    return new;
  end if;
  if new.workspace_id <> old.workspace_id or new.times_used <> old.times_used
     or new.embedding is distinct from old.embedding or new.created_by is distinct from old.created_by
     or new.source_question_id is distinct from old.source_question_id then
    raise exception 'these library fields are set by Dossier';
  end if;
  return new;
end;
$$;
create trigger library_answers_guard before insert or update on public.library_answers
  for each row execute function public.guard_library_columns();

-- Re-embed a library answer when its question wording changes.
create or replace function public.library_reembed()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.jobs (workspace_id, kind, ref_id, idempotency_key)
  values (new.workspace_id, 'embed_library', new.id,
          'embedlib:' || new.id || ':' || extract(epoch from new.updated_at)::bigint)
  on conflict (idempotency_key) do nothing;
  return new;
end;
$$;
create trigger library_answers_reembed after insert or update of question on public.library_answers
  for each row when (new.status <> 'archived')
  execute function public.library_reembed();

create or replace function public.guard_export_insert()
returns trigger language plpgsql set search_path = '' as $$
begin
  if current_user not in ('authenticated', 'anon') then return new; end if;
  if new.status <> 'queued' or new.storage_path is not null then raise exception 'exports start queued'; end if;
  if (select workspace_id from public.questionnaires where id = new.questionnaire_id) <> new.workspace_id then
    raise exception 'questionnaire not in this workspace';
  end if;
  new.requested_by := (select auth.uid());
  return new;
end;
$$;
create trigger exports_guard before insert on public.exports
  for each row execute function public.guard_export_insert();

-- Audit triggers on the tables people care about.
create or replace function public.audit_row()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_row jsonb := to_jsonb(coalesce(new, old));
begin
  insert into public.audit_events (workspace_id, actor_id, action, entity, entity_id, detail)
  values ((v_row ->> 'workspace_id')::uuid, (select auth.uid()),
          tg_table_name || '.' || lower(tg_op), tg_table_name, (v_row ->> 'id')::uuid,
          case tg_table_name
            when 'source_documents' then jsonb_build_object('title', v_row ->> 'title', 'status', v_row ->> 'status')
            when 'questionnaires' then jsonb_build_object('name', v_row ->> 'name', 'status', v_row ->> 'status')
            when 'library_answers' then jsonb_build_object('question', left(v_row ->> 'question', 200), 'status', v_row ->> 'status')
            else '{}'::jsonb end);
  return null;
end;
$$;
create trigger source_documents_audit after insert or delete or update of title, kind, status on public.source_documents
  for each row execute function public.audit_row();
create trigger questionnaires_audit after insert or delete on public.questionnaires
  for each row execute function public.audit_row();
create trigger library_answers_audit after insert or delete or update of answer_text, status on public.library_answers
  for each row execute function public.audit_row();

create or replace function public.audit_member()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'DELETE' and exists (select 1 from public.workspaces where id = old.workspace_id) then
    insert into public.audit_events (workspace_id, actor_id, action, entity, entity_id, detail)
    values (old.workspace_id, (select auth.uid()), 'member.removed', 'member', old.user_id,
            jsonb_build_object('role', old.role));
  end if;
  return null;
end;
$$;
create trigger workspace_members_audit after delete on public.workspace_members
  for each row execute function public.audit_member();

-- ---------------------------------------------------------------------
-- 19. ROW LEVEL SECURITY: switch it on for every table
-- ELI5: with RLS on and no policy, a table is a locked room. Policies
-- are the keys. Tables with no policies below are server-only.
-- ---------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.workspace_invites enable row level security;
alter table public.workspace_settings enable row level security;
alter table public.notification_prefs enable row level security;
alter table public.source_documents enable row level security;
alter table public.source_chunks enable row level security;
alter table public.questionnaires enable row level security;
alter table public.questionnaire_sheets enable row level security;
alter table public.questions enable row level security;
alter table public.question_comments enable row level security;
alter table public.assign_rules enable row level security;
alter table public.library_answers enable row level security;
alter table public.library_variants enable row level security;
alter table public.answer_citations enable row level security;
alter table public.exports enable row level security;
alter table public.jobs enable row level security;
alter table public.usage_ledger enable row level security;
alter table public.email_log enable row level security;
alter table public.rate_limits enable row level security;
alter table public.audit_events enable row level security;
alter table public.subscriptions enable row level security;
alter table public.stripe_events enable row level security;
alter table public.plan_prices enable row level security;
alter table public.workspace_limit_overrides enable row level security;

-- Belt and braces: anonymous visitors get no table access at all.
revoke all on all tables in schema public from anon;

-- Profiles: yourself, and teammates' names for "assigned to" columns.
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

-- Members: everyone sees the team. Roles change through set_member_role().
-- Owner/admin remove people; anyone can leave; nobody removes the owner.
create policy "members select member" on public.workspace_members for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy "members delete admin or self" on public.workspace_members for delete to authenticated
  using (role <> 'owner' and (
    public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[])
    or user_id = (select auth.uid())));

-- Invites: created through ds-invite-member; owner/admin can see and revoke.
create policy "invites select admin" on public.workspace_invites for select to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]));
create policy "invites delete admin" on public.workspace_invites for delete to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]));

-- Settings: everyone reads, owner/admin edit.
create policy "settings select member" on public.workspace_settings for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy "settings update admin" on public.workspace_settings for update to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]))
  with check (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]));

create policy "prefs select self" on public.notification_prefs for select to authenticated
  using (user_id = (select auth.uid()));
create policy "prefs update self" on public.notification_prefs for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Sources: everyone reads; owner/admin upload, edit and delete.
create policy "documents select member" on public.source_documents for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy "documents insert admin" on public.source_documents for insert to authenticated
  with check (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]));
create policy "documents update admin" on public.source_documents for update to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]))
  with check (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]));
create policy "documents delete admin" on public.source_documents for delete to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]));

-- Chunks: read only (the evidence panel shows them). Written by workers.
create policy "chunks select member" on public.source_chunks for select to authenticated
  using (public.is_workspace_member(workspace_id));

-- Questionnaires: everyone reads; reviewers and up create and edit; admins delete.
create policy "questionnaires select member" on public.questionnaires for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy "questionnaires insert reviewer" on public.questionnaires for insert to authenticated
  with check (public.has_workspace_role(workspace_id, array['owner', 'admin', 'reviewer']::public.workspace_role[]));
create policy "questionnaires update reviewer" on public.questionnaires for update to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'admin', 'reviewer']::public.workspace_role[]))
  with check (public.has_workspace_role(workspace_id, array['owner', 'admin', 'reviewer']::public.workspace_role[]));
create policy "questionnaires delete admin" on public.questionnaires for delete to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]));

create policy "sheets select member" on public.questionnaire_sheets for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy "sheets update reviewer" on public.questionnaire_sheets for update to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'admin', 'reviewer']::public.workspace_role[]))
  with check (public.has_workspace_role(workspace_id, array['owner', 'admin', 'reviewer']::public.workspace_role[]));

-- Questions: everyone reads. Reviewers edit any answer; contributors only
-- answers assigned to them. Rows are created and removed by the system.
create policy "questions select member" on public.questions for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy "questions update reviewer or assignee" on public.questions for update to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'admin', 'reviewer']::public.workspace_role[])
         or (assignee_id = (select auth.uid())
             and public.has_workspace_role(workspace_id, array['contributor']::public.workspace_role[])))
  with check (public.is_workspace_member(workspace_id));

-- Comments: members except viewers write; authors edit; authors or admins delete.
create policy "comments select member" on public.question_comments for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy "comments insert writer" on public.question_comments for insert to authenticated
  with check (author_id = (select auth.uid())
              and public.has_workspace_role(workspace_id, array['owner', 'admin', 'reviewer', 'contributor']::public.workspace_role[])
              and exists (select 1 from public.questions q where q.id = question_id and q.workspace_id = question_comments.workspace_id));
create policy "comments update author" on public.question_comments for update to authenticated
  using (author_id = (select auth.uid())) with check (author_id = (select auth.uid()));
create policy "comments delete author or admin" on public.question_comments for delete to authenticated
  using (author_id = (select auth.uid())
         or public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]));

-- Auto-assign rules: admins manage, everyone reads.
create policy "rules select member" on public.assign_rules for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy "rules insert admin" on public.assign_rules for insert to authenticated
  with check (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]));
create policy "rules update admin" on public.assign_rules for update to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]))
  with check (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]));
create policy "rules delete admin" on public.assign_rules for delete to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]));

-- Library: everyone reads; reviewers and up write; admins delete.
create policy "library select member" on public.library_answers for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy "library insert reviewer" on public.library_answers for insert to authenticated
  with check (public.has_workspace_role(workspace_id, array['owner', 'admin', 'reviewer']::public.workspace_role[]));
create policy "library update reviewer" on public.library_answers for update to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'admin', 'reviewer']::public.workspace_role[]))
  with check (public.has_workspace_role(workspace_id, array['owner', 'admin', 'reviewer']::public.workspace_role[]));
create policy "library delete admin" on public.library_answers for delete to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]));

create policy "variants select member" on public.library_variants for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy "variants delete reviewer" on public.library_variants for delete to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'admin', 'reviewer']::public.workspace_role[]));

create policy "citations select member" on public.answer_citations for select to authenticated
  using (public.is_workspace_member(workspace_id));

-- Exports: everyone sees the history; reviewers and up request one.
create policy "exports select member" on public.exports for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy "exports insert reviewer" on public.exports for insert to authenticated
  with check (public.has_workspace_role(workspace_id, array['owner', 'admin', 'reviewer']::public.workspace_role[]));

-- Usage: owner and admins can read the raw meter (the sidebar uses usage_summary()).
create policy "usage select admin" on public.usage_ledger for select to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]));

-- Audit: every member reads. Nobody writes from the app.
create policy "audit select member" on public.audit_events for select to authenticated
  using (public.is_workspace_member(workspace_id));

-- Billing: you can read your own subscription row.
create policy "subscriptions select self" on public.subscriptions for select to authenticated
  using (user_id = (select auth.uid()));

-- jobs, email_log, rate_limits, stripe_events, plan_prices and
-- workspace_limit_overrides have RLS on and no policies: server only.

-- ---------------------------------------------------------------------
-- 20. STORAGE BUCKETS + POLICIES
-- ELI5: three private folders. sources holds your documents,
-- questionnaires holds the buyers' original files, exports holds the
-- filled-in files. Every file sits under a folder named after the
-- workspace id, and only members of that workspace get in.
-- Free plan caps each upload at 50 MB, which matches our limit.
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('sources', 'sources', false, 52428800,
    array['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/markdown', 'text/plain']),
  ('questionnaires', 'questionnaires', false, 52428800,
    array['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']),
  ('exports', 'exports', false, 104857600, null)
on conflict (id) do nothing;

create policy "sources select member" on storage.objects for select to authenticated
  using (bucket_id = 'sources' and public.is_workspace_member_text((storage.foldername(name))[1]));
create policy "sources insert admin" on storage.objects for insert to authenticated
  with check (bucket_id = 'sources'
              and public.has_workspace_role_text((storage.foldername(name))[1], array['owner', 'admin']::public.workspace_role[]));
create policy "sources update admin" on storage.objects for update to authenticated
  using (bucket_id = 'sources'
         and public.has_workspace_role_text((storage.foldername(name))[1], array['owner', 'admin']::public.workspace_role[]))
  with check (bucket_id = 'sources'
              and public.has_workspace_role_text((storage.foldername(name))[1], array['owner', 'admin']::public.workspace_role[]));
create policy "sources delete admin" on storage.objects for delete to authenticated
  using (bucket_id = 'sources'
         and public.has_workspace_role_text((storage.foldername(name))[1], array['owner', 'admin']::public.workspace_role[]));

create policy "questionnaires select member" on storage.objects for select to authenticated
  using (bucket_id = 'questionnaires' and public.is_workspace_member_text((storage.foldername(name))[1]));
create policy "questionnaires insert reviewer" on storage.objects for insert to authenticated
  with check (bucket_id = 'questionnaires'
              and public.has_workspace_role_text((storage.foldername(name))[1], array['owner', 'admin', 'reviewer']::public.workspace_role[]));
create policy "questionnaires update reviewer" on storage.objects for update to authenticated
  using (bucket_id = 'questionnaires'
         and public.has_workspace_role_text((storage.foldername(name))[1], array['owner', 'admin', 'reviewer']::public.workspace_role[]))
  with check (bucket_id = 'questionnaires'
              and public.has_workspace_role_text((storage.foldername(name))[1], array['owner', 'admin', 'reviewer']::public.workspace_role[]));
create policy "questionnaires delete admin" on storage.objects for delete to authenticated
  using (bucket_id = 'questionnaires'
         and public.has_workspace_role_text((storage.foldername(name))[1], array['owner', 'admin']::public.workspace_role[]));

-- Exports: members can download (through 60 second signed URLs). Only the
-- file runner (secret key) writes them.
create policy "exports select member" on storage.objects for select to authenticated
  using (bucket_id = 'exports' and public.is_workspace_member_text((storage.foldername(name))[1]));

-- ---------------------------------------------------------------------
-- 21. REALTIME
-- ELI5: lets the review workspace show each answer the moment the
-- worker writes it, and the sources list flip to Ready, with no refresh.
-- ---------------------------------------------------------------------
alter publication supabase_realtime add table public.questions;
alter publication supabase_realtime add table public.questionnaires;
alter publication supabase_realtime add table public.source_documents;
alter publication supabase_realtime add table public.exports;

-- ---------------------------------------------------------------------
-- 22. SCHEDULES (run later, after your edge functions and Vercel are deployed)
-- ELI5: pg_cron is an alarm clock inside the database. pg_net lets the
-- alarm clock call a URL. Every minute it pokes both workers.
--
-- Enable: Supabase > Database > Extensions > "pg_cron" > Enable, then "pg_net" > Enable.
-- Store the cron secret in Vault (same value as the CRON_SECRET secret):
--   select vault.create_secret('PASTE_YOUR_CRON_SECRET', 'cron_secret');
-- Then replace YOUR_PROJECT_REF and YOUR_DOMAIN below, remove the leading "-- " and run.
-- ---------------------------------------------------------------------
-- create or replace function public.invoke_url(p_url text)
-- returns bigint language sql security definer set search_path = '' as $fn$
--   select net.http_post(
--     url := p_url,
--     headers := jsonb_build_object(
--       'Content-Type', 'application/json',
--       'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')),
--     body := '{}'::jsonb,
--     timeout_milliseconds := 5000);
-- $fn$;
-- revoke execute on function public.invoke_url(text) from public, anon, authenticated;
--
-- select cron.schedule('ds-ai-worker', '* * * * *',
--   $$ select public.invoke_url('https://YOUR_PROJECT_REF.supabase.co/functions/v1/ds-ai-worker') $$);
-- select cron.schedule('ds-file-runner', '* * * * *',
--   $$ select public.invoke_url('https://YOUR_DOMAIN/api/jobs/run') $$);
-- select cron.schedule('ds-notify', '*/15 * * * *',
--   $$ select public.invoke_url('https://YOUR_PROJECT_REF.supabase.co/functions/v1/ds-notify') $$);
-- select cron.schedule('ds-purge-audit', '17 3 * * *', $$ select public.purge_old_audit() $$);
--
-- Check it ran: select * from cron.job_run_details order by start_time desc limit 20;
`
