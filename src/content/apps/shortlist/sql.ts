// Shortlist single migration, pasted into the Supabase SQL editor once on a fresh project.

export const sql = `-- =====================================================================
-- Shortlist: full database migration
-- Paste this whole file into Supabase > SQL Editor > New query > Run.
-- Run it ONCE on a fresh project. Order: extensions, enums, tables,
-- helper functions, triggers, RLS policies, storage, realtime, schedules.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. EXTENSIONS
-- ELI5: extensions are add-ons for the database. pgcrypto gives us
-- secure random bytes and SHA-256 hashing for booking and invite links.
-- ---------------------------------------------------------------------
create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------
-- 1. ENUMS
-- ELI5: an enum is a fixed list of allowed words for a column. An
-- application can be in 'interview' or 'offer', never 'maybe'.
-- ---------------------------------------------------------------------
create type public.workspace_role as enum ('owner', 'admin', 'interviewer');
create type public.job_status as enum ('draft', 'open', 'paused', 'closed');
create type public.employment_type as enum ('full_time', 'part_time', 'contract', 'internship', 'temporary');
create type public.workplace_type as enum ('onsite', 'hybrid', 'remote');
create type public.cover_letter_mode as enum ('off', 'optional', 'required');
create type public.question_type as enum ('short_text', 'long_text', 'single_select', 'multi_select', 'yes_no', 'url', 'number');
create type public.criterion_kind as enum ('must', 'nice');
create type public.application_stage as enum ('applied', 'screen', 'interview', 'offer', 'hired', 'rejected');
create type public.application_state as enum ('uploading', 'active', 'closed');
create type public.ai_status as enum ('not_started', 'queued', 'running', 'done', 'failed', 'opted_out', 'paused_cap', 'disabled');
create type public.reject_reason as enum ('skills_mismatch', 'experience_level', 'role_filled', 'withdrew', 'no_response', 'location', 'other');
create type public.recommendation as enum ('strong_no', 'no', 'yes', 'strong_yes');
create type public.queue_status as enum ('queued', 'running', 'done', 'dead');
create type public.interview_mode as enum ('google_meet', 'phone', 'onsite');
create type public.request_status as enum ('pending', 'booked', 'cancelled', 'expired');
create type public.interview_status as enum ('scheduled', 'cancelled', 'completed', 'no_show');
create type public.calendar_status as enum ('active', 'revoked', 'error');
create type public.email_kind as enum (
  'application_received', 'interview_invite', 'interview_confirmed', 'interview_reminder',
  'interview_cancelled', 'rejection', 'privacy_verify', 'privacy_export', 'privacy_deleted',
  'team_invite', 'mention', 'applicant_digest', 'scorecard_due', 'calendar_disconnected',
  'ai_cap_warning', 'retention_upcoming', 'privacy_request_new');
create type public.outbox_status as enum ('queued', 'sending', 'sent', 'cancelled', 'failed', 'suppressed');
create type public.usage_kind as enum ('applications', 'ai_screens');
create type public.privacy_kind as enum ('access', 'delete');
create type public.privacy_status as enum ('unverified', 'open', 'completed', 'no_data', 'expired');
create type public.notification_kind as enum (
  'mention', 'new_applicant', 'scorecard_due', 'interview_booked', 'interview_cancelled',
  'privacy_request', 'calendar_disconnected', 'ai_cap', 'retention_upcoming');

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
-- ELI5: a workspace is the company that is hiring. Members are the
-- people on its hiring team. The owner's subscription pays for everyone.
-- The careers page and privacy settings live on the workspace row.
-- ---------------------------------------------------------------------
create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 80),
  slug text not null unique check (slug ~ '^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$'),
  owner_id uuid not null references auth.users (id) on delete cascade,
  website_url text,
  logo_path text,
  careers_headline text not null default 'Join our team',
  careers_about text not null default '',
  careers_published boolean not null default false,
  sender_name text not null default '',
  reply_to_email text,
  privacy_contact_email text,
  timezone text not null default 'Europe/London',
  -- GDPR: how long we keep a candidate after their application closes.
  retention_days integer not null default 180 check (retention_days in (90, 180, 365)),
  -- Talent pool: only with the candidate's own tick-box consent.
  talent_pool_days integer not null default 365 check (talent_pool_days in (180, 365, 730)),
  -- Rejection emails wait this long so a mis-click can be undone.
  reject_delay_minutes integer not null default 120 check (reject_delay_minutes between 0 and 4320),
  ai_enabled boolean not null default true,
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
  role public.workspace_role not null default 'interviewer',
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);
create index workspace_members_user_idx on public.workspace_members (user_id);

create table public.workspace_invites (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  email text not null check (position('@' in email) > 1),
  role public.workspace_role not null default 'interviewer' check (role <> 'owner'),
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
-- ELI5: these are the bouncers. "Is this person on this hiring team?"
-- and "Is this person an owner or admin here?". security definer lets
-- them read the members table without tripping over its own RLS.
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

create or replace function public.is_workspace_admin_text(ws text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.workspace_members m
    where m.workspace_id::text = ws and m.user_id = (select auth.uid())
      and m.role in ('owner', 'admin')
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
-- 6. JOBS, HIRING TEAM, FORM QUESTIONS, CRITERIA
-- ELI5: a job is one open role. The hiring team is who may see its
-- candidates. Questions are the extra boxes on the application form.
-- Criteria are the rubric: what a good candidate shows on their CV.
-- The AI summarises against these criteria and nothing else.
-- ---------------------------------------------------------------------
create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  title text not null check (char_length(title) between 2 and 120),
  slug text not null check (slug ~ '^[a-z0-9][a-z0-9-]{0,79}$'),
  department text,
  location text not null default '',
  workplace public.workplace_type not null default 'hybrid',
  employment_type public.employment_type not null default 'full_time',
  salary_min integer check (salary_min is null or salary_min >= 0),
  salary_max integer check (salary_max is null or salary_max >= 0),
  salary_currency text not null default 'GBP' check (char_length(salary_currency) = 3),
  salary_period text not null default 'year' check (salary_period in ('year', 'month', 'day', 'hour')),
  salary_visible boolean not null default true,
  description_md text not null default '',
  status public.job_status not null default 'draft',
  criteria_version integer not null default 1,
  ask_phone boolean not null default false,
  ask_linkedin boolean not null default true,
  cover_letter public.cover_letter_mode not null default 'optional',
  published_at timestamptz,
  closed_at timestamptz,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, slug),
  check (salary_min is null or salary_max is null or salary_max >= salary_min)
);
create index jobs_ws_status_idx on public.jobs (workspace_id, status);
create index jobs_created_by_idx on public.jobs (created_by);
create trigger jobs_updated_at before update on public.jobs
  for each row execute function public.set_updated_at();

create table public.job_members (
  job_id uuid not null references public.jobs (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  added_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (job_id, user_id)
);
create index job_members_user_idx on public.job_members (user_id);
create index job_members_ws_idx on public.job_members (workspace_id);
create index job_members_added_by_idx on public.job_members (added_by);

-- Who may see a job's candidates: owners and admins see every job,
-- interviewers only the jobs they were added to.
create or replace function public.can_view_job(j uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.jobs jb
    join public.workspace_members m on m.workspace_id = jb.workspace_id and m.user_id = (select auth.uid())
    where jb.id = j
      and (m.role in ('owner', 'admin')
           or exists (select 1 from public.job_members jm where jm.job_id = jb.id and jm.user_id = m.user_id))
  );
$$;

create or replace function public.can_view_job_text(j text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.jobs jb
    join public.workspace_members m on m.workspace_id = jb.workspace_id and m.user_id = (select auth.uid())
    where jb.id::text = j
      and (m.role in ('owner', 'admin')
           or exists (select 1 from public.job_members jm where jm.job_id = jb.id and jm.user_id = m.user_id))
  );
$$;

create or replace function public.can_manage_job(j uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.jobs jb
    join public.workspace_members m on m.workspace_id = jb.workspace_id and m.user_id = (select auth.uid())
    where jb.id = j and m.role in ('owner', 'admin')
  );
$$;

create table public.job_questions (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  position integer not null default 0,
  label text not null check (char_length(label) between 2 and 200),
  help_text text,
  type public.question_type not null default 'short_text',
  options text[] not null default '{}',
  required boolean not null default false,
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (type not in ('single_select', 'multi_select') or cardinality(options) between 2 and 12)
);
create index job_questions_job_idx on public.job_questions (job_id, position);
create index job_questions_ws_idx on public.job_questions (workspace_id);
create trigger job_questions_updated_at before update on public.job_questions
  for each row execute function public.set_updated_at();

create table public.job_criteria (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  position integer not null default 0,
  label text not null check (char_length(label) between 3 and 140),
  description text not null default '' check (char_length(description) <= 600),
  kind public.criterion_kind not null default 'must',
  weight integer not null default 2 check (weight between 1 and 3),
  -- Filled by the lint trigger below: words that often hide bias.
  lint_warnings text[] not null default '{}',
  -- An admin can keep a flagged criterion, but must say why. Logged.
  override_reason text,
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index job_criteria_job_idx on public.job_criteria (job_id, position);
create index job_criteria_ws_idx on public.job_criteria (workspace_id);
create trigger job_criteria_updated_at before update on public.job_criteria
  for each row execute function public.set_updated_at();

-- Bias lint. ELI5: some words in a job rubric quietly filter people by
-- age, sex, disability or background instead of by skill. This catches
-- the common ones and asks the hirer to rewrite them. It is a nudge,
-- not a wall: an admin may keep a line with a written reason.
create or replace function public.lint_criterion(p_text text)
returns text[] language plpgsql immutable set search_path = '' as $$
declare
  t text := lower(coalesce(p_text, ''));
  w text[] := '{}';
begin
  if t ~ '(young|youthful|recent grad|digital native|fresh blood|early in (their|your) career|up to \\d+ years|no more than \\d+ years|maximum of \\d+ years)'
    then w := array_append(w, 'Age: describe the skill instead of the career stage or a maximum of years.'); end if;
  if t ~ '(native (english|speaker)|mother tongue|first language|no accent)'
    then w := array_append(w, 'Language: ask for the level you need, for example "fluent written English".'); end if;
  if t ~ '(culture fit|fits in|like us|beer test)'
    then w := array_append(w, 'Culture fit: name the behaviour you mean, for example "gives direct feedback".'); end if;
  if t ~ '(no (career |employment )?gaps|continuous employment|stable work history|job hopp)'
    then w := array_append(w, 'Career gaps: gaps often follow illness, caring or parental leave. Remove this.'); end if;
  if t ~ '(\\mhe\\M|\\mshe\\M|\\mhis\\M|\\mher\\M|salesman|chairman|manpower|rockstar|ninja|aggressive)'
    then w := array_append(w, 'Gendered wording: use "they" and plain role words.'); end if;
  if t ~ '(oxbridge|ivy league|russell group|top (tier )?universit|prestigious)'
    then w := array_append(w, 'Prestige: name the knowledge you need, not where it was learned.'); end if;
  if t ~ '(able[- ]bodied|physically fit|clean[- ]shaven|good health|no disabilit)'
    then w := array_append(w, 'Disability: describe the task (for example "lift 15 kg") only if the job truly needs it.'); end if;
  if t ~ '(nationality|citizen of|born in|religio|married|single|pregnan|children|maternity)'
    then w := array_append(w, 'Protected characteristic: remove it. Right to work is checked at offer, not by the AI.'); end if;
  return w;
end;
$$;

create or replace function public.lint_job_criteria()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.lint_warnings := public.lint_criterion(new.label || ' ' || coalesce(new.description, ''));
  return new;
end;
$$;
create trigger job_criteria_lint before insert or update of label, description on public.job_criteria
  for each row execute function public.lint_job_criteria();

-- Any change to the rubric bumps the job's criteria_version, so old AI
-- summaries are marked "based on older criteria" instead of silently
-- mixing two rubrics.
create or replace function public.bump_criteria_version()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_job uuid := coalesce(new.job_id, old.job_id);
begin
  update public.jobs set criteria_version = criteria_version + 1 where id = v_job;
  return null;
end;
$$;
create trigger job_criteria_version after insert or update or delete on public.job_criteria
  for each row execute function public.bump_criteria_version();

-- ---------------------------------------------------------------------
-- 7. CANDIDATES AND APPLICATIONS
-- ELI5: a candidate is a person (one row per email per company). An
-- application is that person applying for one job. The pipeline stage,
-- the CV file and the form answers live on the application.
-- ---------------------------------------------------------------------
create table public.candidates (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  email text not null check (position('@' in email) > 1),
  first_name text not null default '',
  last_name text not null default '',
  phone text,
  location text,
  linkedin_url text,
  talent_pool_until date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index candidates_ws_email_idx on public.candidates (workspace_id, lower(email));
create trigger candidates_updated_at before update on public.candidates
  for each row execute function public.set_updated_at();

create table public.applications (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  job_id uuid not null references public.jobs (id) on delete cascade,
  candidate_id uuid not null references public.candidates (id) on delete cascade,
  state public.application_state not null default 'uploading',
  stage public.application_stage not null default 'applied',
  position double precision not null default extract(epoch from now()),
  source text not null default 'careers_page' check (char_length(source) <= 60),
  answers jsonb not null default '{}'::jsonb,
  cover_letter text check (char_length(cover_letter) <= 8000),
  cv_path text,
  cv_mime text,
  cv_bytes integer,
  cv_sha256 text,
  privacy_ack_at timestamptz,
  ai_opt_out boolean not null default false,
  talent_pool_consent boolean not null default false,
  ai_status public.ai_status not null default 'not_started',
  submit_token_hash text,
  -- Human review evidence: who opened the CV first, and when.
  cv_viewed_at timestamptz,
  cv_viewed_by uuid references auth.users (id) on delete set null,
  reject_reason public.reject_reason,
  rejected_at timestamptz,
  rejected_by uuid references auth.users (id) on delete set null,
  hired_at timestamptz,
  closed_at timestamptz,
  retention_until date,
  ip_hash text,
  applied_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (job_id, candidate_id)
);
create index applications_ws_idx on public.applications (workspace_id);
create index applications_job_stage_idx on public.applications (job_id, stage, position);
create index applications_candidate_idx on public.applications (candidate_id);
create index applications_viewed_by_idx on public.applications (cv_viewed_by);
create index applications_rejected_by_idx on public.applications (rejected_by);
create index applications_retention_idx on public.applications (retention_until) where retention_until is not null;
create trigger applications_updated_at before update on public.applications
  for each row execute function public.set_updated_at();

create or replace function public.can_view_application(a uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.applications ap where ap.id = a and public.can_view_job(ap.job_id));
$$;

create or replace function public.can_view_candidate(c uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.candidates cd
    where cd.id = c
      and (public.has_workspace_role(cd.workspace_id, array['owner', 'admin']::public.workspace_role[])
           or exists (select 1 from public.applications ap
                      where ap.candidate_id = cd.id and public.can_view_job(ap.job_id)))
  );
$$;

create table public.stage_events (
  id bigint generated always as identity primary key,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  job_id uuid not null references public.jobs (id) on delete cascade,
  application_id uuid not null references public.applications (id) on delete cascade,
  from_stage public.application_stage,
  to_stage public.application_stage not null,
  actor_id uuid references auth.users (id) on delete set null,
  reason public.reject_reason,
  ai_summary_seen boolean not null default false,
  created_at timestamptz not null default now()
);
create index stage_events_app_idx on public.stage_events (application_id, created_at);
create index stage_events_job_idx on public.stage_events (job_id, created_at);
create index stage_events_ws_idx on public.stage_events (workspace_id);
create index stage_events_actor_idx on public.stage_events (actor_id);

-- ---------------------------------------------------------------------
-- 8. AI SCREENING (assistive only)
-- ELI5: the AI reads the CV against the criteria and writes a short,
-- quoted summary for a human. It never moves, ranks or rejects anyone.
-- screen_jobs is the to-do list; ai_screens holds the finished summary.
-- ---------------------------------------------------------------------
create table public.screen_jobs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  application_id uuid not null references public.applications (id) on delete cascade,
  criteria_version integer not null,
  status public.queue_status not null default 'queued',
  attempts integer not null default 0,
  run_after timestamptz not null default now(),
  locked_at timestamptz,
  idempotency_key text not null unique,
  requested_by uuid references auth.users (id) on delete set null,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index screen_jobs_queue_idx on public.screen_jobs (status, run_after);
create index screen_jobs_ws_idx on public.screen_jobs (workspace_id);
create index screen_jobs_app_idx on public.screen_jobs (application_id);
create index screen_jobs_requested_by_idx on public.screen_jobs (requested_by);
create trigger screen_jobs_updated_at before update on public.screen_jobs
  for each row execute function public.set_updated_at();

create table public.ai_screens (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  job_id uuid not null references public.jobs (id) on delete cascade,
  application_id uuid not null references public.applications (id) on delete cascade,
  criteria_version integer not null,
  model text not null,
  prompt_version text not null,
  -- [{criterion_id, label, assessment, evidence[], note}]
  results jsonb not null,
  summary text not null,
  strengths text[] not null default '{}',
  probe_questions text[] not null default '{}',
  -- {injection_suspected, unreadable, scanned_pdf, language, quotes_dropped}
  flags jsonb not null default '{}'::jsonb,
  redactions integer not null default 0,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  cost_usd_micros bigint not null default 0,
  created_at timestamptz not null default now(),
  unique (application_id, criteria_version)
);
create index ai_screens_ws_idx on public.ai_screens (workspace_id);
create index ai_screens_job_idx on public.ai_screens (job_id);

-- "This summary is wrong" reports. Reviewed monthly to tune the prompt.
create table public.ai_feedback (
  id bigint generated always as identity primary key,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  screen_id uuid not null references public.ai_screens (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  criterion_id uuid,
  verdict text not null check (verdict in ('accurate', 'wrong', 'missed_evidence', 'unfair')),
  comment text check (char_length(comment) <= 1000),
  created_at timestamptz not null default now()
);
create index ai_feedback_ws_idx on public.ai_feedback (workspace_id);
create index ai_feedback_screen_idx on public.ai_feedback (screen_id);
create index ai_feedback_user_idx on public.ai_feedback (user_id);

-- ---------------------------------------------------------------------
-- 9. COLLABORATION: NOTES, SCORECARDS, NOTIFICATIONS
-- ELI5: notes are the team's comments on a candidate (with @mentions).
-- A scorecard is one interviewer's structured verdict. You only see
-- other people's scorecards after you submit your own, so the first
-- loud opinion does not steer everyone else.
-- ---------------------------------------------------------------------
create table public.notes (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  job_id uuid not null references public.jobs (id) on delete cascade,
  application_id uuid not null references public.applications (id) on delete cascade,
  author_id uuid not null references auth.users (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 5000),
  mentions uuid[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index notes_app_idx on public.notes (application_id, created_at);
create index notes_job_idx on public.notes (job_id);
create index notes_ws_idx on public.notes (workspace_id);
create index notes_author_idx on public.notes (author_id);
create trigger notes_updated_at before update on public.notes
  for each row execute function public.set_updated_at();

create table public.scorecards (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  job_id uuid not null references public.jobs (id) on delete cascade,
  application_id uuid not null references public.applications (id) on delete cascade,
  interviewer_id uuid not null references auth.users (id) on delete cascade,
  -- {"<criterion_id>": 1..4}
  ratings jsonb not null default '{}'::jsonb,
  recommendation public.recommendation,
  notes text check (char_length(notes) <= 8000),
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (application_id, interviewer_id),
  check (submitted_at is null or recommendation is not null)
);
create index scorecards_job_idx on public.scorecards (job_id);
create index scorecards_ws_idx on public.scorecards (workspace_id);
create index scorecards_interviewer_idx on public.scorecards (interviewer_id);
create trigger scorecards_updated_at before update on public.scorecards
  for each row execute function public.set_updated_at();

create or replace function public.has_submitted_scorecard(a uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.scorecards s
    where s.application_id = a and s.interviewer_id = (select auth.uid()) and s.submitted_at is not null
  );
$$;

-- How many scorecards exist on an application (so the UI can say
-- "2 hidden until you submit yours" without revealing their content).
create or replace function public.scorecard_counts(p_app uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.can_view_application(p_app) then raise exception 'not allowed'; end if;
  return (select jsonb_build_object('total', count(*), 'submitted', count(*) filter (where submitted_at is not null))
          from public.scorecards where application_id = p_app);
end;
$$;

create table public.notifications (
  id bigint generated always as identity primary key,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  kind public.notification_kind not null,
  actor_id uuid references auth.users (id) on delete set null,
  job_id uuid references public.jobs (id) on delete cascade,
  application_id uuid references public.applications (id) on delete cascade,
  body text not null default '',
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, read_at, created_at desc);
create index notifications_ws_idx on public.notifications (workspace_id);
create index notifications_actor_idx on public.notifications (actor_id);
create index notifications_job_idx on public.notifications (job_id);
create index notifications_app_idx on public.notifications (application_id);

-- ---------------------------------------------------------------------
-- 10. SCHEDULING: GOOGLE CALENDAR, BOOKING LINKS, INTERVIEWS
-- ELI5: each interviewer connects their Google Calendar so Shortlist
-- can see when they are busy (never what the meetings are). A booking
-- link lets the candidate pick a free slot. The refresh token is
-- encrypted by the edge function and stored in a table nobody but the
-- server can read.
-- ---------------------------------------------------------------------
create table public.calendar_connections (
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  google_email text not null,
  status public.calendar_status not null default 'active',
  scopes text[] not null default '{}',
  timezone text not null default 'Europe/London',
  -- {"mon":[["09:00","17:00"]], "tue":[...], ... "sat":[], "sun":[]}
  working_hours jsonb not null default '{"mon":[["09:00","17:00"]],"tue":[["09:00","17:00"]],"wed":[["09:00","17:00"]],"thu":[["09:00","17:00"]],"fri":[["09:00","17:00"]],"sat":[],"sun":[]}'::jsonb,
  buffer_minutes integer not null default 15 check (buffer_minutes between 0 and 60),
  max_per_day integer not null default 4 check (max_per_day between 1 and 12),
  last_error text,
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);
create index calendar_connections_user_idx on public.calendar_connections (user_id);
create trigger calendar_connections_updated_at before update on public.calendar_connections
  for each row execute function public.set_updated_at();

-- No policies at all: only edge functions (secret key) read or write.
create table public.calendar_tokens (
  workspace_id uuid not null,
  user_id uuid not null,
  refresh_token_cipher text not null,
  access_token_cipher text,
  access_expires_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (workspace_id, user_id),
  foreign key (workspace_id, user_id) references public.calendar_connections (workspace_id, user_id) on delete cascade
);

create table public.interview_requests (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  job_id uuid not null references public.jobs (id) on delete cascade,
  application_id uuid not null references public.applications (id) on delete cascade,
  title text not null default 'Interview' check (char_length(title) between 2 and 80),
  duration_minutes integer not null default 45 check (duration_minutes in (15, 30, 45, 60, 90)),
  mode public.interview_mode not null default 'google_meet',
  location_text text check (char_length(location_text) <= 300),
  organiser_id uuid not null references auth.users (id) on delete cascade,
  interviewer_ids uuid[] not null check (cardinality(interviewer_ids) between 1 and 4),
  window_start date not null,
  window_end date not null,
  min_notice_hours integer not null default 24 check (min_notice_hours between 2 and 168),
  token_hash text not null unique,
  status public.request_status not null default 'pending',
  reschedules integer not null default 0,
  candidate_tz text,
  -- Short mutex so two clicks (or two candidates' tabs) cannot book at once.
  booking_lock_until timestamptz,
  expires_at timestamptz not null,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (window_end >= window_start and window_end <= window_start + 21)
);
create index interview_requests_app_idx on public.interview_requests (application_id);
create index interview_requests_job_idx on public.interview_requests (job_id);
create index interview_requests_ws_idx on public.interview_requests (workspace_id);
create index interview_requests_organiser_idx on public.interview_requests (organiser_id);
create index interview_requests_created_by_idx on public.interview_requests (created_by);
create trigger interview_requests_updated_at before update on public.interview_requests
  for each row execute function public.set_updated_at();

create table public.interviews (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  job_id uuid not null references public.jobs (id) on delete cascade,
  application_id uuid not null references public.applications (id) on delete cascade,
  request_id uuid not null references public.interview_requests (id) on delete cascade,
  organiser_id uuid not null references auth.users (id) on delete cascade,
  interviewer_ids uuid[] not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  google_event_id text,
  meet_url text,
  status public.interview_status not null default 'scheduled',
  reminder_sent_at timestamptz,
  scorecard_nudged_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at)
);
create index interviews_app_idx on public.interviews (application_id);
create index interviews_job_idx on public.interviews (job_id);
create index interviews_ws_starts_idx on public.interviews (workspace_id, starts_at);
create index interviews_request_idx on public.interviews (request_id);
create index interviews_organiser_idx on public.interviews (organiser_id);
create index interviews_interviewers_idx on public.interviews using gin (interviewer_ids);
-- One live interview per booking link, enforced by the database.
create unique index interviews_one_live_per_request_idx on public.interviews (request_id) where status = 'scheduled';
create trigger interviews_updated_at before update on public.interviews
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- 11. EMAIL: TEMPLATES, OUTBOX, LOG, SUPPRESSIONS
-- ELI5: templates are the words. The outbox is the queue of emails
-- waiting to go (a rejection waits 2 hours so you can undo it). The
-- log is what Resend actually sent and whether it bounced.
-- ---------------------------------------------------------------------
create table public.email_templates (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  kind public.email_kind not null,
  subject text not null check (char_length(subject) between 2 and 160),
  body text not null check (char_length(body) between 10 and 6000),
  updated_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, kind),
  check (kind in ('application_received', 'interview_invite', 'interview_confirmed', 'interview_reminder',
                  'interview_cancelled', 'rejection'))
);
create index email_templates_updated_by_idx on public.email_templates (updated_by);
create trigger email_templates_updated_at before update on public.email_templates
  for each row execute function public.set_updated_at();

create table public.email_outbox (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces (id) on delete cascade,
  kind public.email_kind not null,
  to_email text not null,
  application_id uuid references public.applications (id) on delete cascade,
  user_id uuid references auth.users (id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  send_after timestamptz not null default now(),
  status public.outbox_status not null default 'queued',
  attempts integer not null default 0,
  locked_at timestamptz,
  dedupe_key text not null unique,
  last_error text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index email_outbox_queue_idx on public.email_outbox (status, send_after);
create index email_outbox_ws_idx on public.email_outbox (workspace_id);
create index email_outbox_app_idx on public.email_outbox (application_id);
create index email_outbox_user_idx on public.email_outbox (user_id);
create index email_outbox_created_by_idx on public.email_outbox (created_by);
create trigger email_outbox_updated_at before update on public.email_outbox
  for each row execute function public.set_updated_at();

create table public.email_log (
  id bigint generated always as identity primary key,
  workspace_id uuid references public.workspaces (id) on delete cascade,
  outbox_id uuid references public.email_outbox (id) on delete set null,
  application_id uuid references public.applications (id) on delete cascade,
  kind public.email_kind not null,
  to_email text not null,
  resend_id text unique,
  status text not null default 'sent',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index email_log_ws_idx on public.email_log (workspace_id, created_at desc);
create index email_log_outbox_idx on public.email_log (outbox_id);
create index email_log_app_idx on public.email_log (application_id);
create trigger email_log_updated_at before update on public.email_log
  for each row execute function public.set_updated_at();

create table public.email_suppressions (
  email text primary key,
  reason text not null,
  created_at timestamptz not null default now()
);

-- Resend webhook de-dupe (svix-id header).
create table public.resend_events (
  id text primary key,
  type text not null,
  received_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 12. PRIVACY: DATA REQUESTS AND THE DELETION LOG
-- ELI5: a candidate can ask "what do you hold on me?" or "delete me".
-- They prove the email is theirs first. The deletion log proves you
-- deleted it, without keeping the data: it stores a one-way hash only.
-- ---------------------------------------------------------------------
create table public.data_requests (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  email text not null,
  kind public.privacy_kind not null,
  status public.privacy_status not null default 'unverified',
  verify_token_hash text unique,
  verified_at timestamptz,
  due_at timestamptz,
  completed_at timestamptz,
  completed_by uuid references auth.users (id) on delete set null,
  note text check (char_length(note) <= 2000),
  ip_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index data_requests_ws_idx on public.data_requests (workspace_id, status);
create index data_requests_completed_by_idx on public.data_requests (completed_by);
create trigger data_requests_updated_at before update on public.data_requests
  for each row execute function public.set_updated_at();

create table public.deletion_log (
  id bigint generated always as identity primary key,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  email_hash text not null,
  reason text not null check (reason in ('retention', 'request', 'manual')),
  applications_deleted integer not null default 0,
  files_deleted integer not null default 0,
  actor_id uuid references auth.users (id) on delete set null,
  request_id uuid references public.data_requests (id) on delete set null,
  created_at timestamptz not null default now()
);
create index deletion_log_ws_idx on public.deletion_log (workspace_id, created_at desc);
create index deletion_log_actor_idx on public.deletion_log (actor_id);
create index deletion_log_request_idx on public.deletion_log (request_id);

-- ---------------------------------------------------------------------
-- 13. USAGE LEDGER AND RATE LIMITS
-- ELI5: usage_ledger is the meter. Every application received and every
-- AI summary writes a line, so no workspace can pass its plan's cap.
-- ---------------------------------------------------------------------
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

create table public.rate_limits (
  key text not null,
  window_start timestamptz not null,
  hits integer not null default 0,
  primary key (key, window_start)
);

-- ---------------------------------------------------------------------
-- 14. BILLING (written only by the Stripe webhook with the secret key)
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
-- insert into public.plan_prices values ('price_...', 'starter'), ...
create table public.plan_prices (
  price_id text primary key,
  plan text not null check (plan in ('starter', 'team', 'growth'))
);

-- Test-only limit overrides. No policies: only you, in the SQL editor.
create table public.workspace_limit_overrides (
  workspace_id uuid primary key references public.workspaces (id) on delete cascade,
  seats integer,
  open_jobs integer,
  ai_screens integer,
  applications integer
);

-- ---------------------------------------------------------------------
-- 15. ACCESS AND LIMIT FUNCTIONS
-- ELI5: has_active_access is the paywall: the owner's trial or paid
-- plan keeps the whole workspace (and its careers page) open.
-- plan_limits returns the numbers from the PRD.
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
returns table (plan text, seats integer, open_jobs integer, ai_screens integer,
               applications integer, remove_branding boolean, reports boolean)
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

  if v_plan = 'growth' then
    plan := 'growth'; seats := 25; open_jobs := 25; ai_screens := 1500; applications := 4500;
    remove_branding := true; reports := true;
  elsif v_plan = 'team' then
    plan := 'team'; seats := 10; open_jobs := 8; ai_screens := 500; applications := 1500;
    remove_branding := true; reports := true;
  else
    plan := 'starter'; seats := 3; open_jobs := 2; ai_screens := 150; applications := 450;
    remove_branding := false; reports := false;
  end if;

  -- A 7 day trial gets 2 open jobs and 25 AI summaries.
  if v_status = 'trialing' then
    open_jobs := least(open_jobs, 2);
    ai_screens := least(ai_screens, 25);
    applications := least(applications, 150);
  end if;

  select * into o from public.workspace_limit_overrides where workspace_id = ws;
  if found then
    seats := coalesce(o.seats, seats);
    open_jobs := coalesce(o.open_jobs, open_jobs);
    ai_screens := coalesce(o.ai_screens, ai_screens);
    applications := coalesce(o.applications, applications);
  end if;
  return next;
end;
$$;

create or replace function public.usage_this_month(ws uuid, k public.usage_kind)
returns numeric language sql stable security definer set search_path = '' as $$
  select coalesce(sum(quantity), 0) from public.usage_ledger
  where workspace_id = ws and kind = k and created_at >= date_trunc('month', now());
$$;

-- One call for the sidebar meter. Members only.
create or replace function public.usage_summary(ws uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare l record;
begin
  if not public.is_workspace_member(ws) then raise exception 'not a member'; end if;
  select * into l from public.plan_limits(ws);
  return jsonb_build_object(
    'plan', l.plan,
    'ai_screens_used', public.usage_this_month(ws, 'ai_screens'),
    'ai_screens_cap', l.ai_screens,
    'applications_used', public.usage_this_month(ws, 'applications'),
    'applications_cap', l.applications,
    'open_jobs_used', (select count(*) from public.jobs where workspace_id = ws and status = 'open'),
    'open_jobs_cap', l.open_jobs,
    'seats_used', (select count(*) from public.workspace_members where workspace_id = ws),
    'seats_cap', l.seats,
    'resets_at', date_trunc('month', now()) + interval '1 month');
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
-- 16. WORKSPACE, INVITE AND TEMPLATE FUNCTIONS (called from the app)
-- ELI5: creating a workspace and joining one happen inside the
-- database in one step, so seats and roles can never be skipped.
-- ---------------------------------------------------------------------
create or replace function public.seed_email_templates(p_ws uuid)
returns void language sql security definer set search_path = '' as $$
  insert into public.email_templates (workspace_id, kind, subject, body) values
  (p_ws, 'application_received', 'We received your application for {{job_title}}',
   E'Hi {{candidate_first_name}},\\n\\nThank you for applying for {{job_title}} at {{company_name}}. A person on our hiring team reads every application. We will reply within {{reply_days}} working days, whatever the outcome.\\n\\n{{privacy_line}}\\n\\n{{sender_name}}'),
  (p_ws, 'interview_invite', 'Pick a time to talk about {{job_title}}',
   E'Hi {{candidate_first_name}},\\n\\nWe would like to invite you to a {{duration}} minute {{interview_title}} for {{job_title}}. Pick any time that suits you here:\\n\\n{{booking_link}}\\n\\nThe link works until {{expires_on}}. If none of the times work, reply to this email.\\n\\n{{sender_name}}'),
  (p_ws, 'interview_confirmed', 'Confirmed: {{interview_title}} on {{interview_date}}',
   E'Hi {{candidate_first_name}},\\n\\nYou are booked for {{interview_date}} at {{interview_time}} ({{timezone}}), {{duration}} minutes, with {{interviewer_names}}.\\n\\n{{location_line}}\\n\\nNeed to move it? Use this link: {{booking_link}}\\n\\n{{sender_name}}'),
  (p_ws, 'interview_reminder', 'Tomorrow: {{interview_title}} at {{interview_time}}',
   E'Hi {{candidate_first_name}},\\n\\nA reminder that we talk tomorrow at {{interview_time}} ({{timezone}}).\\n\\n{{location_line}}\\n\\n{{sender_name}}'),
  (p_ws, 'interview_cancelled', 'Your interview on {{interview_date}} is cancelled',
   E'Hi {{candidate_first_name}},\\n\\nYour {{interview_title}} on {{interview_date}} has been cancelled. {{cancel_line}}\\n\\n{{sender_name}}'),
  (p_ws, 'rejection', 'Your application for {{job_title}}',
   E'Hi {{candidate_first_name}},\\n\\nThank you for your time and interest in {{job_title}}. After careful review we have decided not to move forward with your application.\\n\\nWe know this is not the news you hoped for, and we wish you well with your search.\\n\\n{{privacy_line}}\\n\\n{{sender_name}}')
  on conflict (workspace_id, kind) do nothing;
$$;

create or replace function public.create_workspace(p_name text, p_slug text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_ws uuid;
begin
  if v_uid is null then raise exception 'not signed in'; end if;
  if exists (select 1 from public.workspaces where owner_id = v_uid) then
    raise exception 'you already own a workspace';
  end if;
  insert into public.workspaces (name, slug, owner_id, sender_name, reply_to_email, privacy_contact_email)
  values (p_name, lower(p_slug), v_uid, p_name,
          (select auth.jwt() ->> 'email'), (select auth.jwt() ->> 'email'))
  returning id into v_ws;
  insert into public.workspace_members (workspace_id, user_id, role) values (v_ws, v_uid, 'owner');
  perform public.seed_email_templates(v_ws);
  update public.profiles set current_workspace_id = v_ws where id = v_uid;
  return v_ws;
end;
$$;

-- Onboarding: is this careers address free? (RLS hides other companies.)
create or replace function public.slug_available(p_slug text)
returns boolean language sql stable security definer set search_path = '' as $$
  select lower(p_slug) ~ '^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$'
     and lower(p_slug) not in ('app', 'admin', 'api', 'www', 'careers', 'privacy', 'book', 'demo', 'help', 'docs')
     and not exists (select 1 from public.workspaces where slug = lower(p_slug));
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
  insert into public.email_outbox (workspace_id, kind, to_email, data, dedupe_key, created_by)
  values (p_ws, 'team_invite', lower(trim(p_email)),
          jsonb_build_object('token', v_token, 'role', p_role),
          'invite:' || encode(extensions.digest(v_token, 'sha256'), 'hex'), (select auth.uid()));
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
  update public.workspace_invites set accepted_at = now() where id = v_inv.id;
  update public.profiles set current_workspace_id = v_inv.workspace_id where id = v_uid;
  return v_inv.workspace_id;
end;
$$;

-- ---------------------------------------------------------------------
-- 17. PIPELINE FUNCTIONS (called from the app)
-- ELI5: moving a card, opening a CV and writing a note all go through
-- these functions, so the rules (only admins move cards, a human must
-- open the CV before rejecting, rejections wait before sending) hold
-- even if someone calls the API by hand.
-- ---------------------------------------------------------------------
create or replace function public.mark_cv_viewed(p_app uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.can_view_application(p_app) then raise exception 'not allowed'; end if;
  update public.applications
  set cv_viewed_at = coalesce(cv_viewed_at, now()),
      cv_viewed_by = coalesce(cv_viewed_by, (select auth.uid()))
  where id = p_app;
end;
$$;

create or replace function public.move_application(
  p_app uuid,
  p_stage public.application_stage,
  p_position double precision default null,
  p_reason public.reject_reason default null,
  p_send_email boolean default true,
  p_ai_seen boolean default false
) returns public.applications language plpgsql security definer set search_path = '' as $$
declare
  v_app public.applications;
  v_ws public.workspaces;
  v_job public.jobs;
  v_cand public.candidates;
  v_uid uuid := (select auth.uid());
  v_from public.application_stage;
begin
  select * into v_app from public.applications where id = p_app for update;
  if not found then raise exception 'not_found'; end if;
  if not public.can_manage_job(v_app.job_id) then raise exception 'only owners and admins move candidates'; end if;
  if not public.has_active_access(v_app.workspace_id) then raise exception 'paused'; end if;
  if v_app.state = 'uploading' then raise exception 'wrong_state'; end if;

  v_from := v_app.stage;
  select * into v_ws from public.workspaces where id = v_app.workspace_id;
  select * into v_job from public.jobs where id = v_app.job_id;
  select * into v_cand from public.candidates where id = v_app.candidate_id;

  if p_stage = 'rejected' and v_from <> 'rejected' then
    -- Human-in-the-loop rule: nobody is rejected unseen.
    if v_app.cv_viewed_at is null then raise exception 'open_cv_first'; end if;
    if p_reason is null then raise exception 'reason_required'; end if;
  end if;

  update public.applications set
    stage = p_stage,
    position = coalesce(p_position, extract(epoch from now())),
    reject_reason = case when p_stage = 'rejected' then p_reason else null end,
    rejected_at = case when p_stage = 'rejected' then coalesce(rejected_at, now()) else null end,
    rejected_by = case when p_stage = 'rejected' then coalesce(rejected_by, v_uid) else null end,
    hired_at = case when p_stage = 'hired' then coalesce(hired_at, now()) else null end,
    state = case when p_stage in ('hired', 'rejected') then 'closed'::public.application_state else 'active'::public.application_state end,
    closed_at = case when p_stage in ('hired', 'rejected') then now() else null end,
    retention_until = case when p_stage in ('hired', 'rejected')
      then (now() + make_interval(days => case when talent_pool_consent then v_ws.talent_pool_days else v_ws.retention_days end))::date
      else null end
  where id = p_app
  returning * into v_app;

  if v_from is distinct from p_stage then
    insert into public.stage_events (workspace_id, job_id, application_id, from_stage, to_stage, actor_id, reason, ai_summary_seen)
    values (v_app.workspace_id, v_app.job_id, p_app, v_from, p_stage, v_uid, p_reason, p_ai_seen);
  end if;

  -- Moving back out of rejected cancels a rejection that has not gone yet (undo).
  if v_from = 'rejected' and p_stage <> 'rejected' then
    update public.email_outbox set status = 'cancelled'
    where application_id = p_app and kind = 'rejection' and status = 'queued';
  end if;

  if p_stage = 'rejected' and v_from <> 'rejected' and p_send_email then
    insert into public.email_outbox (workspace_id, kind, to_email, application_id, data, send_after, dedupe_key, created_by)
    values (v_app.workspace_id, 'rejection', v_cand.email, p_app,
            jsonb_build_object('job_title', v_job.title),
            now() + make_interval(mins => v_ws.reject_delay_minutes),
            'rejection:' || p_app || ':' || extract(epoch from now())::bigint, v_uid)
    on conflict (dedupe_key) do nothing;
  end if;
  return v_app;
end;
$$;

-- Notes with @mentions. Mentions must be teammates who can see the job.
create or replace function public.add_note(p_app uuid, p_body text, p_mentions uuid[] default '{}')
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_app public.applications;
  v_uid uuid := (select auth.uid());
  v_id uuid;
  v_user uuid;
  v_valid uuid[] := '{}';
begin
  select * into v_app from public.applications where id = p_app;
  if not found or not public.can_view_job(v_app.job_id) then raise exception 'not allowed'; end if;
  if not public.try_rate_limit('note:' || v_uid, 60, 3600) then raise exception 'rate_limited'; end if;
  foreach v_user in array coalesce(p_mentions, '{}') loop
    if v_user <> v_uid and exists (
      select 1 from public.workspace_members m
      where m.workspace_id = v_app.workspace_id and m.user_id = v_user
        and (m.role in ('owner', 'admin')
             or exists (select 1 from public.job_members jm where jm.job_id = v_app.job_id and jm.user_id = v_user))
    ) then v_valid := array_append(v_valid, v_user); end if;
  end loop;
  insert into public.notes (workspace_id, job_id, application_id, author_id, body, mentions)
  values (v_app.workspace_id, v_app.job_id, p_app, v_uid, p_body, v_valid) returning id into v_id;
  insert into public.notifications (workspace_id, user_id, kind, actor_id, job_id, application_id, body)
  select v_app.workspace_id, u, 'mention', v_uid, v_app.job_id, p_app, left(p_body, 200)
  from unnest(v_valid) u;
  insert into public.email_outbox (workspace_id, kind, to_email, user_id, application_id, data, dedupe_key, created_by)
  select v_app.workspace_id, 'mention', au.email, u, p_app,
         jsonb_build_object('note_id', v_id), 'mention:' || v_id || ':' || u, v_uid
  from unnest(v_valid) u join auth.users au on au.id = u
  where au.email is not null;
  return v_id;
end;
$$;

-- Queue (or re-queue) an AI summary. Respects opt-out and the plan cap.
create or replace function public.request_screen(p_app uuid)
returns public.ai_status language plpgsql security definer set search_path = '' as $$
declare
  v_app public.applications;
  v_ver integer;
  v_cap integer;
begin
  select * into v_app from public.applications where id = p_app;
  if not found then raise exception 'not_found'; end if;
  if (select auth.uid()) is not null and not public.can_manage_job(v_app.job_id) then raise exception 'not allowed'; end if;
  if v_app.ai_opt_out then
    update public.applications set ai_status = 'opted_out' where id = p_app;
    return 'opted_out';
  end if;
  if not (select ai_enabled from public.workspaces where id = v_app.workspace_id) then
    update public.applications set ai_status = 'disabled' where id = p_app;
    return 'disabled';
  end if;
  select l.ai_screens into v_cap from public.plan_limits(v_app.workspace_id) l;
  if public.usage_this_month(v_app.workspace_id, 'ai_screens') >= v_cap then
    update public.applications set ai_status = 'paused_cap' where id = p_app;
    return 'paused_cap';
  end if;
  select criteria_version into v_ver from public.jobs where id = v_app.job_id;
  insert into public.screen_jobs (workspace_id, application_id, criteria_version, idempotency_key, requested_by)
  values (v_app.workspace_id, p_app, v_ver, 'screen:' || p_app || ':' || v_ver, (select auth.uid()))
  on conflict (idempotency_key) do update set status = 'queued', run_after = now(), attempts = 0
    where public.screen_jobs.status = 'dead';
  update public.applications set ai_status = 'queued' where id = p_app;
  return 'queued';
end;
$$;

-- ---------------------------------------------------------------------
-- 18. PUBLIC CAREERS PAGE FUNCTIONS (safe for the publishable key)
-- ELI5: anonymous visitors never touch the jobs table. These two
-- functions hand back only the public columns of open jobs.
-- ---------------------------------------------------------------------
create or replace function public.get_careers_page(p_slug text)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'company', jsonb_build_object('name', w.name, 'slug', w.slug, 'headline', w.careers_headline,
      'about', w.careers_about, 'website_url', w.website_url, 'logo_path', w.logo_path,
      'show_branding', not (select l.remove_branding from public.plan_limits(w.id) l)),
    'jobs', coalesce((
      select jsonb_agg(jsonb_build_object('title', j.title, 'slug', j.slug, 'department', j.department,
        'location', j.location, 'workplace', j.workplace, 'employment_type', j.employment_type,
        'published_at', j.published_at) order by j.published_at desc)
      from public.jobs j where j.workspace_id = w.id and j.status = 'open'), '[]'::jsonb))
  from public.workspaces w
  where w.slug = lower(p_slug) and w.careers_published and public.has_active_access(w.id);
$$;

create or replace function public.get_public_job(p_slug text, p_job_slug text)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'company', jsonb_build_object('name', w.name, 'slug', w.slug, 'logo_path', w.logo_path,
      'privacy_contact_email', w.privacy_contact_email, 'retention_days', w.retention_days,
      'talent_pool_days', w.talent_pool_days, 'ai_enabled', w.ai_enabled),
    'job', jsonb_build_object('id', j.id, 'title', j.title, 'slug', j.slug, 'department', j.department,
      'location', j.location, 'workplace', j.workplace, 'employment_type', j.employment_type,
      'salary_min', case when j.salary_visible then j.salary_min end,
      'salary_max', case when j.salary_visible then j.salary_max end,
      'salary_currency', j.salary_currency, 'salary_period', j.salary_period,
      'description_md', j.description_md, 'ask_phone', j.ask_phone, 'ask_linkedin', j.ask_linkedin,
      'cover_letter', j.cover_letter, 'published_at', j.published_at, 'status', j.status),
    'criteria', coalesce((select jsonb_agg(jsonb_build_object('label', c.label, 'kind', c.kind) order by c.position)
      from public.job_criteria c where c.job_id = j.id and not c.archived), '[]'::jsonb),
    'questions', coalesce((select jsonb_agg(jsonb_build_object('id', q.id, 'label', q.label,
      'help_text', q.help_text, 'type', q.type, 'options', q.options, 'required', q.required) order by q.position)
      from public.job_questions q where q.job_id = j.id and not q.archived), '[]'::jsonb))
  from public.workspaces w
  join public.jobs j on j.workspace_id = w.id
  where w.slug = lower(p_slug) and j.slug = lower(p_job_slug)
    and j.status in ('open', 'paused') and public.has_active_access(w.id);
$$;

-- ---------------------------------------------------------------------
-- 19. WORKER FUNCTIONS (edge functions only, secret key)
-- ELI5: claim_* hands a worker a few to-dos and marks them "mine" so
-- two workers never grab the same one. release_stuck puts back any
-- to-do a crashed worker was holding for more than 10 minutes.
-- ---------------------------------------------------------------------
create or replace function public.claim_screen_jobs(p_limit integer)
returns setof public.screen_jobs language sql security definer set search_path = '' as $$
  update public.screen_jobs j set status = 'running', locked_at = now(), attempts = j.attempts + 1
  where j.id in (
    select id from public.screen_jobs
    where status = 'queued' and run_after <= now()
    order by run_after
    limit p_limit
    for update skip locked
  )
  returning j.*;
$$;

create or replace function public.claim_outbox(p_limit integer)
returns setof public.email_outbox language sql security definer set search_path = '' as $$
  update public.email_outbox o set status = 'sending', locked_at = now(), attempts = o.attempts + 1
  where o.id in (
    select id from public.email_outbox
    where status = 'queued' and send_after <= now()
    order by send_after
    limit p_limit
    for update skip locked
  )
  returning o.*;
$$;

create or replace function public.release_stuck()
returns integer language plpgsql security definer set search_path = '' as $$
declare v1 integer; v2 integer;
begin
  update public.screen_jobs set status = 'queued', locked_at = null
  where status = 'running' and locked_at < now() - interval '10 minutes';
  get diagnostics v1 = row_count;
  update public.email_outbox set status = 'queued', locked_at = null
  where status = 'sending' and locked_at < now() - interval '10 minutes';
  get diagnostics v2 = row_count;
  return v1 + v2;
end;
$$;

-- Erase one candidate from one workspace. Returns the storage paths the
-- edge function must delete. Used by retention and by delete requests.
create or replace function public.erase_candidate(p_candidate uuid, p_reason text, p_actor uuid, p_request uuid)
returns text[] language plpgsql security definer set search_path = '' as $$
declare
  v_c public.candidates;
  v_paths text[];
  v_apps integer;
begin
  select * into v_c from public.candidates where id = p_candidate for update;
  if not found then return '{}'; end if;
  select coalesce(array_agg(cv_path) filter (where cv_path is not null), '{}'), count(*)
    into v_paths, v_apps
  from public.applications where candidate_id = p_candidate;
  insert into public.deletion_log (workspace_id, email_hash, reason, applications_deleted, files_deleted, actor_id, request_id)
  values (v_c.workspace_id, encode(extensions.digest(v_c.workspace_id::text || lower(v_c.email), 'sha256'), 'hex'),
          p_reason, v_apps, cardinality(v_paths), p_actor, p_request);
  update public.email_outbox set status = 'cancelled'
  where status = 'queued' and lower(to_email) = lower(v_c.email) and workspace_id = v_c.workspace_id
    and kind not in ('privacy_deleted', 'privacy_export');
  -- Cascades remove applications, answers, AI summaries, notes, scorecards,
  -- interview requests and interviews.
  delete from public.candidates where id = p_candidate;
  return v_paths;
end;
$$;

-- Candidates whose every application closed and passed retention_until.
create or replace function public.candidates_due_for_purge(p_limit integer)
returns table (candidate_id uuid, workspace_id uuid)
language sql stable security definer set search_path = '' as $$
  select c.id, c.workspace_id from public.candidates c
  where not exists (
      select 1 from public.applications a
      where a.candidate_id = c.id and (a.state <> 'closed' or a.retention_until is null or a.retention_until >= current_date))
    and exists (select 1 from public.applications a where a.candidate_id = c.id)
    and (c.talent_pool_until is null or c.talent_pool_until < current_date)
  limit p_limit;
$$;

-- Abandoned uploads (never finished) older than a day.
create or replace function public.stale_uploads(p_limit integer)
returns table (application_id uuid, cv_path text)
language sql stable security definer set search_path = '' as $$
  select id, cv_path from public.applications
  where state = 'uploading' and created_at < now() - interval '1 day'
  limit p_limit;
$$;

-- Booking mutex: returns the request only if nobody else holds it.
create or replace function public.claim_booking(p_token_hash text)
returns setof public.interview_requests language sql security definer set search_path = '' as $$
  update public.interview_requests set booking_lock_until = now() + interval '30 seconds'
  where token_hash = p_token_hash
    and status in ('pending', 'booked')
    and (booking_lock_until is null or booking_lock_until < now())
  returning *;
$$;

create or replace function public.release_booking(p_request uuid)
returns void language sql security definer set search_path = '' as $$
  update public.interview_requests set booking_lock_until = null where id = p_request;
$$;

-- Lock worker and privacy functions to the server only.
revoke execute on function public.claim_screen_jobs(integer) from public, anon, authenticated;
revoke execute on function public.claim_outbox(integer) from public, anon, authenticated;
revoke execute on function public.release_stuck() from public, anon, authenticated;
revoke execute on function public.erase_candidate(uuid, text, uuid, uuid) from public, anon, authenticated;
revoke execute on function public.candidates_due_for_purge(integer) from public, anon, authenticated;
revoke execute on function public.stale_uploads(integer) from public, anon, authenticated;
revoke execute on function public.claim_booking(text) from public, anon, authenticated;
revoke execute on function public.release_booking(uuid) from public, anon, authenticated;
revoke execute on function public.seed_email_templates(uuid) from public, anon, authenticated;
revoke execute on function public.try_rate_limit(text, integer, integer) from public, anon;

-- ---------------------------------------------------------------------
-- 20. GUARD TRIGGERS (the rules the browser cannot break)
-- ELI5: even if someone edits a request in their browser, these stop
-- them changing the owner, opening more jobs than the plan allows, or
-- rewriting a submitted scorecard.
-- ---------------------------------------------------------------------
create or replace function public.guard_workspace_columns()
returns trigger language plpgsql set search_path = '' as $$
begin
  if (select auth.uid()) is not null then
    if new.owner_id <> old.owner_id then raise exception 'owner cannot be changed here'; end if;
    if new.slug <> old.slug and not public.has_workspace_role(old.id, array['owner']::public.workspace_role[]) then
      raise exception 'only the owner can change the careers address';
    end if;
  end if;
  return new;
end;
$$;
create trigger workspaces_guard before update on public.workspaces
  for each row execute function public.guard_workspace_columns();

create or replace function public.guard_job_status()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_cap integer; v_open integer;
begin
  if new.status = 'open' and (tg_op = 'INSERT' or old.status <> 'open') then
    if not public.has_active_access(new.workspace_id) then raise exception 'paused'; end if;
    select l.open_jobs into v_cap from public.plan_limits(new.workspace_id) l;
    select count(*) into v_open from public.jobs where workspace_id = new.workspace_id and status = 'open' and id <> new.id;
    if v_open >= v_cap then raise exception 'open_job_limit_reached'; end if;
    if not exists (select 1 from public.job_criteria c where c.job_id = new.id and not c.archived) then
      raise exception 'add_criteria_first';
    end if;
    if exists (select 1 from public.job_criteria c where c.job_id = new.id and not c.archived
               and cardinality(c.lint_warnings) > 0 and c.override_reason is null) then
      raise exception 'fix_flagged_criteria';
    end if;
    new.published_at := coalesce(new.published_at, now());
    new.closed_at := null;
  end if;
  if new.status = 'closed' and tg_op = 'UPDATE' and old.status <> 'closed' then
    new.closed_at := now();
  end if;
  return new;
end;
$$;
create trigger jobs_guard_status before insert or update of status on public.jobs
  for each row execute function public.guard_job_status();

-- Closing a job closes its open applications and starts their retention clock.
create or replace function public.close_job_applications()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'closed' and old.status <> 'closed' then
    update public.applications a set
      state = 'closed', closed_at = coalesce(a.closed_at, now()),
      retention_until = (now() + make_interval(days => case when a.talent_pool_consent then w.talent_pool_days else w.retention_days end))::date
    from public.workspaces w
    where a.job_id = new.id and a.state = 'active' and w.id = a.workspace_id;
  end if;
  return null;
end;
$$;
create trigger jobs_close_applications after update of status on public.jobs
  for each row execute function public.close_job_applications();

create or replace function public.guard_scorecard()
returns trigger language plpgsql set search_path = '' as $$
begin
  if (select auth.uid()) is not null then
    if new.interviewer_id <> (select auth.uid()) then raise exception 'not your scorecard'; end if;
    if tg_op = 'UPDATE' then
      if old.submitted_at is not null and old.submitted_at < now() - interval '24 hours' then
        raise exception 'scorecard locked 24 hours after submitting';
      end if;
      if new.application_id <> old.application_id or new.job_id <> old.job_id or new.workspace_id <> old.workspace_id then
        raise exception 'cannot move a scorecard';
      end if;
    end if;
  end if;
  return new;
end;
$$;
create trigger scorecards_guard before insert or update on public.scorecards
  for each row execute function public.guard_scorecard();

-- Keep job_id and workspace_id on child rows in step with the parent,
-- so a crafted insert cannot attach a row to another company's job.
create or replace function public.fill_job_scope()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  select j.workspace_id into new.workspace_id from public.jobs j where j.id = new.job_id;
  if new.workspace_id is null then raise exception 'job not found'; end if;
  return new;
end;
$$;
create trigger job_members_scope before insert or update on public.job_members
  for each row execute function public.fill_job_scope();
create trigger job_questions_scope before insert or update on public.job_questions
  for each row execute function public.fill_job_scope();
create trigger job_criteria_scope before insert or update on public.job_criteria
  for each row execute function public.fill_job_scope();

create or replace function public.fill_application_scope()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  select a.workspace_id, a.job_id into new.workspace_id, new.job_id
  from public.applications a where a.id = new.application_id;
  if new.job_id is null then raise exception 'application not found'; end if;
  return new;
end;
$$;
create trigger scorecards_scope before insert or update on public.scorecards
  for each row execute function public.fill_application_scope();

create or replace function public.fill_feedback_scope()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  select s.workspace_id into new.workspace_id from public.ai_screens s where s.id = new.screen_id;
  if new.workspace_id is null then raise exception 'summary not found'; end if;
  new.user_id := coalesce((select auth.uid()), new.user_id);
  return new;
end;
$$;
create trigger ai_feedback_scope before insert on public.ai_feedback
  for each row execute function public.fill_feedback_scope();

-- ---------------------------------------------------------------------
-- 21. ROW LEVEL SECURITY: switch it on for every table
-- ELI5: with RLS on, the database refuses every read and write unless a
-- policy below says yes. Tables with no policies (tokens, queues,
-- Stripe events) are server-only: the browser can never touch them.
-- ---------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.workspace_invites enable row level security;
alter table public.jobs enable row level security;
alter table public.job_members enable row level security;
alter table public.job_questions enable row level security;
alter table public.job_criteria enable row level security;
alter table public.candidates enable row level security;
alter table public.applications enable row level security;
alter table public.stage_events enable row level security;
alter table public.screen_jobs enable row level security;
alter table public.ai_screens enable row level security;
alter table public.ai_feedback enable row level security;
alter table public.notes enable row level security;
alter table public.scorecards enable row level security;
alter table public.notifications enable row level security;
alter table public.calendar_connections enable row level security;
alter table public.calendar_tokens enable row level security;
alter table public.interview_requests enable row level security;
alter table public.interviews enable row level security;
alter table public.email_templates enable row level security;
alter table public.email_outbox enable row level security;
alter table public.email_log enable row level security;
alter table public.email_suppressions enable row level security;
alter table public.resend_events enable row level security;
alter table public.data_requests enable row level security;
alter table public.deletion_log enable row level security;
alter table public.usage_ledger enable row level security;
alter table public.rate_limits enable row level security;
alter table public.subscriptions enable row level security;
alter table public.stripe_events enable row level security;
alter table public.plan_prices enable row level security;
alter table public.workspace_limit_overrides enable row level security;

-- profiles: you, and teammates (to show names and avatars).
create policy "profiles select self or teammate" on public.profiles for select to authenticated
  using (id = (select auth.uid()) or public.shares_workspace_with(id));
create policy "profiles update self" on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- workspaces: members read; owners and admins edit; only the owner deletes.
create policy "workspaces select member" on public.workspaces for select to authenticated
  using (public.is_workspace_member(id));
create policy "workspaces update admin" on public.workspaces for update to authenticated
  using (public.has_workspace_role(id, array['owner', 'admin']::public.workspace_role[]))
  with check (public.has_workspace_role(id, array['owner', 'admin']::public.workspace_role[]));
create policy "workspaces delete owner" on public.workspaces for delete to authenticated
  using (owner_id = (select auth.uid()));

-- members: everyone on the team sees the team. The owner changes roles.
-- Owners and admins remove people; anyone but the owner can leave.
create policy "members select member" on public.workspace_members for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy "members update owner" on public.workspace_members for update to authenticated
  using (public.has_workspace_role(workspace_id, array['owner']::public.workspace_role[]) and user_id <> (select auth.uid()))
  with check (public.has_workspace_role(workspace_id, array['owner']::public.workspace_role[]) and role <> 'owner');
create policy "members delete admin or self" on public.workspace_members for delete to authenticated
  using (role <> 'owner' and (user_id = (select auth.uid())
         or public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[])));

create policy "invites select admin" on public.workspace_invites for select to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]));
create policy "invites delete admin" on public.workspace_invites for delete to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]));

-- jobs: hiring team reads; owners and admins create and edit; drafts can be deleted.
-- Uses the row's own columns (not a lookup by id) so insert ... returning works.
create policy "jobs select team" on public.jobs for select to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[])
         or exists (select 1 from public.job_members jm where jm.job_id = jobs.id and jm.user_id = (select auth.uid())));
create policy "jobs insert admin" on public.jobs for insert to authenticated
  with check (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[])
              and created_by = (select auth.uid()));
create policy "jobs update admin" on public.jobs for update to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]))
  with check (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]));
create policy "jobs delete draft admin" on public.jobs for delete to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]) and status = 'draft');

create policy "job members select team" on public.job_members for select to authenticated
  using (public.can_view_job(job_id));
create policy "job members insert admin" on public.job_members for insert to authenticated
  with check (public.can_manage_job(job_id) and exists (
    select 1 from public.workspace_members m
    where m.workspace_id = job_members.workspace_id and m.user_id = job_members.user_id));
create policy "job members delete admin" on public.job_members for delete to authenticated
  using (public.can_manage_job(job_id));

create policy "questions select team" on public.job_questions for select to authenticated
  using (public.can_view_job(job_id));
create policy "questions insert admin" on public.job_questions for insert to authenticated
  with check (public.can_manage_job(job_id));
create policy "questions update admin" on public.job_questions for update to authenticated
  using (public.can_manage_job(job_id)) with check (public.can_manage_job(job_id));
create policy "questions delete admin" on public.job_questions for delete to authenticated
  using (public.can_manage_job(job_id));

create policy "criteria select team" on public.job_criteria for select to authenticated
  using (public.can_view_job(job_id));
create policy "criteria insert admin" on public.job_criteria for insert to authenticated
  with check (public.can_manage_job(job_id));
create policy "criteria update admin" on public.job_criteria for update to authenticated
  using (public.can_manage_job(job_id)) with check (public.can_manage_job(job_id));
create policy "criteria delete admin" on public.job_criteria for delete to authenticated
  using (public.can_manage_job(job_id));

-- candidates and applications: created only by the sl-apply edge function.
-- Stage changes go through move_application(). Admins may fix a typo in a name.
create policy "candidates select team" on public.candidates for select to authenticated
  using (public.can_view_candidate(id));
create policy "candidates update admin" on public.candidates for update to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]))
  with check (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]));

create policy "applications select team" on public.applications for select to authenticated
  using (public.can_view_job(job_id));

create policy "stage events select team" on public.stage_events for select to authenticated
  using (public.can_view_job(job_id));

create policy "screen jobs select admin" on public.screen_jobs for select to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]));

create policy "ai screens select team" on public.ai_screens for select to authenticated
  using (public.can_view_job(job_id));

create policy "ai feedback select own or admin" on public.ai_feedback for select to authenticated
  using (user_id = (select auth.uid())
         or public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]));
create policy "ai feedback insert team" on public.ai_feedback for insert to authenticated
  with check (user_id = (select auth.uid()) and exists (
    select 1 from public.ai_screens s where s.id = ai_feedback.screen_id and public.can_view_job(s.job_id)));

-- notes: written through add_note(). Authors edit their own; admins tidy up.
create policy "notes select team" on public.notes for select to authenticated
  using (public.can_view_job(job_id));
create policy "notes update author" on public.notes for update to authenticated
  using (author_id = (select auth.uid())) with check (author_id = (select auth.uid()));
create policy "notes delete author or admin" on public.notes for delete to authenticated
  using (author_id = (select auth.uid())
         or public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]));

-- scorecards: your own always; other people's only once submitted AND
-- after you submitted yours (owners and admins see submitted ones).
create policy "scorecards select blind" on public.scorecards for select to authenticated
  using (interviewer_id = (select auth.uid())
         or (submitted_at is not null and public.can_view_job(job_id)
             and (public.has_submitted_scorecard(application_id)
                  or public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]))));
create policy "scorecards insert own" on public.scorecards for insert to authenticated
  with check (interviewer_id = (select auth.uid()) and public.can_view_application(application_id));
create policy "scorecards update own" on public.scorecards for update to authenticated
  using (interviewer_id = (select auth.uid())) with check (interviewer_id = (select auth.uid()));
create policy "scorecards delete own draft" on public.scorecards for delete to authenticated
  using (interviewer_id = (select auth.uid()) and submitted_at is null);

create policy "notifications select own" on public.notifications for select to authenticated
  using (user_id = (select auth.uid()));
create policy "notifications update own" on public.notifications for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "notifications delete own" on public.notifications for delete to authenticated
  using (user_id = (select auth.uid()));

-- calendar: the team sees who is connected (never the tokens). You edit
-- your own working hours. Connecting happens in the sl-google-oauth function.
create policy "calendar select member" on public.calendar_connections for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy "calendar update own" on public.calendar_connections for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "calendar delete own" on public.calendar_connections for delete to authenticated
  using (user_id = (select auth.uid()));
-- calendar_tokens: no policies on purpose.

create policy "requests select team" on public.interview_requests for select to authenticated
  using (public.can_view_job(job_id));

create policy "interviews select team or panel" on public.interviews for select to authenticated
  using (public.can_view_job(job_id) or (select auth.uid()) = any (interviewer_ids));
create policy "interviews update admin" on public.interviews for update to authenticated
  using (public.can_manage_job(job_id)) with check (public.can_manage_job(job_id));

create policy "templates select member" on public.email_templates for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy "templates update admin" on public.email_templates for update to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]))
  with check (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]));

create policy "outbox select admin" on public.email_outbox for select to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]));
create policy "email log select admin" on public.email_log for select to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]));

create policy "data requests select admin" on public.data_requests for select to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]));
create policy "deletion log select admin" on public.deletion_log for select to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]));

create policy "usage select member" on public.usage_ledger for select to authenticated
  using (public.is_workspace_member(workspace_id));

create policy "subscriptions select own" on public.subscriptions for select to authenticated
  using (user_id = (select auth.uid()));

-- No policies (server only): calendar_tokens, email_suppressions,
-- resend_events, rate_limits, stripe_events, plan_prices,
-- workspace_limit_overrides.

-- ---------------------------------------------------------------------
-- 22. STORAGE BUCKETS + POLICIES
-- ELI5: cvs is a locked cupboard. Files sit at
-- <workspace_id>/<job_id>/<application_id>/cv.pdf. Only the hiring team
-- for that job can open them. Nobody uploads with their login: the
-- sl-apply function hands the candidate a one-time signed upload link.
-- careers-assets is public (logos on the careers page); only admins
-- change it. exports is server-only (privacy exports).
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('cvs', 'cvs', false, 10485760,
    array['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']),
  ('careers-assets', 'careers-assets', true, 2097152,
    array['image/png', 'image/jpeg', 'image/webp']),
  ('exports', 'exports', false, 52428800, array['application/json', 'application/zip'])
on conflict (id) do nothing;

create policy "cvs select hiring team" on storage.objects for select to authenticated
  using (bucket_id = 'cvs'
         and public.is_workspace_member_text((storage.foldername(name))[1])
         and public.can_view_job_text((storage.foldername(name))[2]));

create policy "careers assets select member" on storage.objects for select to authenticated
  using (bucket_id = 'careers-assets' and public.is_workspace_member_text((storage.foldername(name))[1]));
create policy "careers assets insert admin" on storage.objects for insert to authenticated
  with check (bucket_id = 'careers-assets' and public.is_workspace_admin_text((storage.foldername(name))[1]));
create policy "careers assets update admin" on storage.objects for update to authenticated
  using (bucket_id = 'careers-assets' and public.is_workspace_admin_text((storage.foldername(name))[1]))
  with check (bucket_id = 'careers-assets' and public.is_workspace_admin_text((storage.foldername(name))[1]));
create policy "careers assets delete admin" on storage.objects for delete to authenticated
  using (bucket_id = 'careers-assets' and public.is_workspace_admin_text((storage.foldername(name))[1]));

-- ---------------------------------------------------------------------
-- 23. REALTIME
-- ELI5: lets the pipeline board move a card for everyone at once, show
-- "Summary ready" without a refresh, and light up the bell.
-- Realtime obeys RLS, so people only get events for rows they can read.
-- ---------------------------------------------------------------------
alter publication supabase_realtime add table public.applications;
alter publication supabase_realtime add table public.ai_screens;
alter publication supabase_realtime add table public.notifications;

-- ---------------------------------------------------------------------
-- 24. SCHEDULES (run later, after your edge functions are deployed)
-- ELI5: pg_cron is an alarm clock inside the database. pg_net lets the
-- alarm clock call a URL. It pokes the workers on a timer.
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
-- select cron.schedule('sl-screen-worker', '* * * * *',    $$ select public.invoke_edge('sl-screen-worker') $$);
-- select cron.schedule('sl-email-worker',  '* * * * *',    $$ select public.invoke_edge('sl-email-worker') $$);
-- select cron.schedule('sl-scheduler',     '*/15 * * * *', $$ select public.invoke_edge('sl-scheduler') $$);
-- select cron.schedule('sl-retention',     '10 3 * * *',   $$ select public.invoke_edge('sl-retention') $$);
--
-- Check it ran: select * from cron.job_run_details order by start_time desc limit 20;
`
