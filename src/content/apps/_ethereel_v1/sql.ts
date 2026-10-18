// Ethereel: the one migration the user pastes into the Supabase SQL editor.

export const sql = `-- =====================================================================
-- Ethereel migration 001: everything the app needs in one go.
-- Paste the whole file into Supabase > SQL Editor > New query > Run.
-- Safe to read top to bottom: every section has a plain-English note.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. Extensions
-- ELI5: pgcrypto gives us gen_random_uuid(), a machine that prints
-- unique ID numbers so no two rows ever share one.
-- ---------------------------------------------------------------------
create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- 1. Enums (fixed lists of allowed words)
-- ELI5: an enum is a drop-down menu for the database. A project can only
-- ever be in one of these states, so a typo like 'redy' is impossible.
-- ---------------------------------------------------------------------
create type public.project_status as enum (
  'uploading',     -- browser is still sending the file
  'uploaded',      -- file is in storage, waiting for start-transcription
  'transcribing',  -- Deepgram is listening to it
  'planning',      -- Claude is picking the best moments
  'rendering',     -- Shotstack is building the vertical clips
  'ready',         -- clips are done, user has been emailed
  'failed'         -- something broke, see projects.error
);

create type public.clip_status as enum ('planned', 'rendering', 'ready', 'failed');

create type public.render_status as enum ('queued', 'submitted', 'done', 'failed');

-- The three caption looks a user can choose from.
create type public.caption_style as enum ('punch', 'clean', 'karaoke');

-- Every line in the usage ledger is one of these.
create type public.ledger_kind as enum ('upload', 'rerender', 'refund', 'grant');

-- ---------------------------------------------------------------------
-- 2. Helper: keep updated_at fresh
-- ELI5: every time a row changes, this little robot writes the time on it.
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- 3. Profiles (one row per user, created automatically on sign up)
-- ELI5: auth.users is Supabase's locked filing cabinet. profiles is our
-- own card for each person, holding the answers from onboarding.
-- ---------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text,
  niche text,                                   -- onboarding step 1, e.g. 'business coach'
  platforms text[] not null default '{}',       -- onboarding step 2: tiktok, reels, shorts, linkedin
  default_caption_style public.caption_style not null default 'punch',
  brand_colour text not null default '#8B5CF6', -- used for caption highlight and progress bar
  onboarded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- The sign-up trigger. Runs as the table owner (security definer) because
-- a brand new user has no rights yet. search_path = '' stops hijacking.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'full_name', '')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- 4. Projects (one row per uploaded raw video)
-- ELI5: a project is a folder for one talking-head video and everything
-- the robots make from it.
-- ---------------------------------------------------------------------
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null default 'Untitled video',
  status public.project_status not null default 'uploading',
  raw_path text not null,                         -- '<user_id>/<project_id>/source.mp4' in raw-videos
  size_bytes bigint not null check (size_bytes > 0 and size_bytes <= 1073741824),
  declared_duration_s numeric(8,2) not null check (declared_duration_s > 0 and declared_duration_s <= 1800),
  verified_duration_s numeric(8,2),               -- the real length, from Deepgram
  width int,
  height int,
  face_track jsonb not null default '[]'::jsonb,  -- [{t, x, y, w}] sampled in the browser
  clip_count_target int not null default 5 check (clip_count_target between 1 and 8),
  deepgram_request_id text,
  minutes_reserved numeric(8,2) not null default 0,
  error text,
  ready_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index projects_user_id_idx on public.projects (user_id);
create index projects_status_idx on public.projects (status);
create index projects_user_created_idx on public.projects (user_id, created_at desc);

create trigger projects_updated_at before update on public.projects
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- 5. Transcripts (every word with its start and end time)
-- ELI5: Deepgram hands back a list like "so" at 0.42s, "today" at 0.61s.
-- We keep that list so we can cut silences and time captions exactly.
-- ---------------------------------------------------------------------
create table public.transcripts (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null unique references public.projects (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  language text not null default 'en',
  full_text text not null,
  words jsonb not null,               -- [{i, w, pw, s, e, c, filler}]
  duration_s numeric(8,2) not null,
  created_at timestamptz not null default now()
);

create index transcripts_user_id_idx on public.transcripts (user_id);

-- ---------------------------------------------------------------------
-- 6. Clips (the 30 to 60 second vertical videos)
-- ELI5: each row is one finished short. It remembers where it starts and
-- ends in the raw video, its hook title, and the edit plan Claude wrote.
-- ---------------------------------------------------------------------
create table public.clips (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  rank int not null,                              -- 1 = Claude's favourite
  score int not null check (score between 1 and 100),
  start_s numeric(8,2) not null,
  end_s numeric(8,2) not null,
  hook_title text not null check (char_length(hook_title) <= 60),
  reason text not null,
  post_caption text not null default '',          -- suggested caption for the post itself
  hashtags text[] not null default '{}',
  caption_style public.caption_style not null default 'punch',
  show_progress_bar boolean not null default true,
  show_emojis boolean not null default true,
  edit_plan jsonb not null,                       -- Claude's plan plus our computed cuts
  status public.clip_status not null default 'planned',
  version int not null default 1,                 -- bumps on every re-render
  render_path text,                               -- '<user_id>/<project_id>/<clip_id>-v1.mp4' in renders
  poster_path text,
  duration_s numeric(8,2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_s > start_s)
);

create index clips_user_id_idx on public.clips (user_id);
create index clips_project_id_idx on public.clips (project_id, rank);

create trigger clips_updated_at before update on public.clips
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- 7. Render jobs (one row per Shotstack render request)
-- ELI5: when we ask Shotstack to build a clip it gives us a ticket number.
-- This table is the ticket stub, so the callback knows which clip it is.
-- ---------------------------------------------------------------------
create table public.render_jobs (
  id uuid primary key default gen_random_uuid(),
  clip_id uuid not null references public.clips (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  clip_version int not null,
  shotstack_id text unique,
  status public.render_status not null default 'queued',
  attempt int not null default 1,
  error text,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (clip_id, clip_version, attempt)
);

create index render_jobs_user_id_idx on public.render_jobs (user_id);
create index render_jobs_project_id_idx on public.render_jobs (project_id);
create index render_jobs_clip_id_idx on public.render_jobs (clip_id);

-- ---------------------------------------------------------------------
-- 8. Usage ledger (the minutes meter)
-- ELI5: like a bank statement for minutes. Uploading a 6 minute video
-- writes +6. A refund after a failure writes -6. The total is what you used.
-- Only edge functions (secret key) write here. Users can only read.
-- ---------------------------------------------------------------------
create table public.usage_ledger (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  project_id uuid references public.projects (id) on delete set null,
  kind public.ledger_kind not null,
  minutes numeric(8,2) not null,
  note text,
  created_at timestamptz not null default now()
);

create index usage_ledger_user_created_idx on public.usage_ledger (user_id, created_at);

-- ---------------------------------------------------------------------
-- 9. Billing: subscriptions and stripe_events
-- ELI5: Stripe is the till. The webhook writes the receipt here. The app
-- only ever trusts this table to decide who gets in, never the browser.
-- ---------------------------------------------------------------------
create table public.subscriptions (
  user_id uuid primary key references auth.users (id) on delete cascade,
  stripe_customer_id text unique not null,
  stripe_subscription_id text unique,
  status text not null,              -- trialing, active, past_due, canceled, incomplete, unpaid
  price_id text,
  trial_end timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  updated_at timestamptz not null default now()
);

create trigger subscriptions_updated_at before update on public.subscriptions
  for each row execute function public.set_updated_at();

-- Every Stripe event id we have already processed. The primary key makes
-- a duplicate insert fail, which is how we skip repeats (idempotency).
create table public.stripe_events (
  id text primary key,               -- evt_...
  type text not null,
  received_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 10. Row Level Security (RLS): the bouncer on every table
-- ELI5: with RLS on, the database checks "is this your row?" before it
-- shows or changes anything. (select auth.uid()) is "who is asking".
-- No policy = nobody with the publishable key gets in.
-- ---------------------------------------------------------------------
alter table public.profiles      enable row level security;
alter table public.projects      enable row level security;
alter table public.transcripts   enable row level security;
alter table public.clips         enable row level security;
alter table public.render_jobs   enable row level security;
alter table public.usage_ledger  enable row level security;
alter table public.subscriptions enable row level security;
alter table public.stripe_events enable row level security;

-- profiles: read and edit your own card. Inserts come from the trigger.
create policy "profiles_select_own" on public.profiles
  for select to authenticated using ( (select auth.uid()) = id );
create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using ( (select auth.uid()) = id )
  with check ( (select auth.uid()) = id );

-- projects: you can create a project only in the 'uploading' state,
-- read your own, and delete your own.
create policy "projects_select_own" on public.projects
  for select to authenticated using ( (select auth.uid()) = user_id );
create policy "projects_insert_own" on public.projects
  for insert to authenticated
  with check ( (select auth.uid()) = user_id and status = 'uploading' );
create policy "projects_update_own" on public.projects
  for update to authenticated
  using ( (select auth.uid()) = user_id )
  with check ( (select auth.uid()) = user_id );
create policy "projects_delete_own" on public.projects
  for delete to authenticated using ( (select auth.uid()) = user_id );

-- Column guard: even on your own project, the browser may only change
-- these columns. Status, minutes and paths are set by edge functions only.
revoke update on public.projects from authenticated;
grant update (title, clip_count_target, face_track, width, height) on public.projects to authenticated;

-- transcripts: read only.
create policy "transcripts_select_own" on public.transcripts
  for select to authenticated using ( (select auth.uid()) = user_id );

-- clips: read, tweak the editable fields, delete. No inserts from the browser.
create policy "clips_select_own" on public.clips
  for select to authenticated using ( (select auth.uid()) = user_id );
create policy "clips_update_own" on public.clips
  for update to authenticated
  using ( (select auth.uid()) = user_id )
  with check ( (select auth.uid()) = user_id );
create policy "clips_delete_own" on public.clips
  for delete to authenticated using ( (select auth.uid()) = user_id );

revoke update on public.clips from authenticated;
grant update (hook_title, caption_style, show_progress_bar, show_emojis, start_s, end_s, post_caption)
  on public.clips to authenticated;

-- render_jobs and usage_ledger: read only.
create policy "render_jobs_select_own" on public.render_jobs
  for select to authenticated using ( (select auth.uid()) = user_id );
create policy "usage_ledger_select_own" on public.usage_ledger
  for select to authenticated using ( (select auth.uid()) = user_id );

-- subscriptions: read your own. No insert/update/delete policies, so only
-- the Stripe webhook (secret key, which bypasses RLS) can write.
create policy "subscriptions_select_own" on public.subscriptions
  for select to authenticated using ( (select auth.uid()) = user_id );

-- stripe_events: no policies at all. Invisible to the publishable key.

-- ---------------------------------------------------------------------
-- 11. has_active_access(uid): the one question every gate asks
-- ELI5: "Is this person on a trial or paying?" Yes or no. Security definer
-- lets it read subscriptions; the where clause stops people asking about
-- anyone but themselves (edge functions with the secret key can ask about anyone).
-- ---------------------------------------------------------------------
create or replace function public.has_active_access(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.subscriptions s
    where s.user_id = uid
      and s.status in ('trialing', 'active')
      and (
        uid = (select auth.uid())
        or coalesce((select auth.jwt() ->> 'role'), '') = 'service_role'
      )
  );
$$;

revoke execute on function public.has_active_access(uuid) from public, anon;
grant execute on function public.has_active_access(uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------
-- 12. minutes_used_this_period: the meter on the dashboard
-- ELI5: adds up your ledger since your billing period started and shows
-- your limit next to it. security_invoker = true means the view obeys RLS,
-- so you only ever see your own row.
-- Trial: 30 minutes. Paid ($39/mo): 150 minutes.
-- ---------------------------------------------------------------------
create view public.minutes_used_this_period
with (security_invoker = true) as
select
  p.id as user_id,
  b.period_start,
  coalesce((
    select sum(l.minutes)
    from public.usage_ledger l
    where l.user_id = p.id and l.created_at >= b.period_start
  ), 0)::numeric(8,2) as minutes_used,
  case when s.status = 'trialing' then 30 else 150 end as minutes_limit
from public.profiles p
left join public.subscriptions s on s.user_id = p.id
cross join lateral (
  select case
    when s.status = 'trialing' and s.trial_end is not null then s.trial_end - interval '7 days'
    when s.current_period_end is not null then s.current_period_end - interval '1 month'
    else date_trunc('month', now())
  end as period_start
) b;

grant select on public.minutes_used_this_period to authenticated;

-- ---------------------------------------------------------------------
-- 13. reserve_minutes(): check the limit and charge in one locked step
-- ELI5: if someone uploads two videos at the same second, both could
-- sneak under the limit. The advisory lock makes them queue, one at a time.
-- Only the secret key (edge functions) may call this.
-- ---------------------------------------------------------------------
create or replace function public.reserve_minutes(p_user uuid, p_project uuid, p_minutes numeric, p_kind public.ledger_kind)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_used numeric;
  v_limit int;
begin
  perform pg_advisory_xact_lock(hashtext(p_user::text));

  select m.minutes_used, m.minutes_limit into v_used, v_limit
  from public.minutes_used_this_period m
  where m.user_id = p_user;

  if v_used is null or v_used + p_minutes > v_limit then
    return false;
  end if;

  insert into public.usage_ledger (user_id, project_id, kind, minutes, note)
  values (p_user, p_project, p_kind, p_minutes, 'reserved by edge function');
  return true;
end;
$$;

revoke execute on function public.reserve_minutes(uuid, uuid, numeric, public.ledger_kind) from public, anon, authenticated;
grant execute on function public.reserve_minutes(uuid, uuid, numeric, public.ledger_kind) to service_role;

-- ---------------------------------------------------------------------
-- 14. Storage buckets
-- ELI5: buckets are folders in the cloud. Both are private: nobody can
-- open a file without a signed link that expires.
-- raw-videos: the uploads (max 1 GB each, video only).
-- renders: finished clips and poster images (max 200 MB each).
-- Note: the Supabase Free plan caps any upload at 50 MB. On Pro, raise
-- Storage > Settings > Upload file size limit to 1 GB as well.
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('raw-videos', 'raw-videos', false, 1073741824, array['video/mp4', 'video/quicktime', 'video/webm']),
  ('renders', 'renders', false, 209715200, array['video/mp4', 'image/jpeg', 'image/png'])
on conflict (id) do nothing;

-- Files live at '<user_id>/<project_id>/...'. The first folder name must
-- be your own user id, or the bouncer says no.
create policy "raw_videos_select_own" on storage.objects
  for select to authenticated
  using ( bucket_id = 'raw-videos' and (select auth.uid())::text = (storage.foldername(name))[1] );

create policy "raw_videos_insert_own" on storage.objects
  for insert to authenticated
  with check ( bucket_id = 'raw-videos' and (select auth.uid())::text = (storage.foldername(name))[1] );

-- Resumable uploads can resume into the same object, which counts as an update.
create policy "raw_videos_update_own" on storage.objects
  for update to authenticated
  using ( bucket_id = 'raw-videos' and (select auth.uid())::text = (storage.foldername(name))[1] )
  with check ( bucket_id = 'raw-videos' and (select auth.uid())::text = (storage.foldername(name))[1] );

create policy "raw_videos_delete_own" on storage.objects
  for delete to authenticated
  using ( bucket_id = 'raw-videos' and (select auth.uid())::text = (storage.foldername(name))[1] );

-- renders: read your own. Writes come from shotstack-callback (secret key).
create policy "renders_select_own" on storage.objects
  for select to authenticated
  using ( bucket_id = 'renders' and (select auth.uid())::text = (storage.foldername(name))[1] );

create policy "renders_delete_own" on storage.objects
  for delete to authenticated
  using ( bucket_id = 'renders' and (select auth.uid())::text = (storage.foldername(name))[1] );

-- ---------------------------------------------------------------------
-- 15. Realtime: let the processing screen watch progress live
-- ELI5: instead of the page asking "done yet?" every second, the database
-- taps it on the shoulder when a project or clip row changes. RLS still
-- applies, so you only hear about your own rows.
-- ---------------------------------------------------------------------
alter publication supabase_realtime add table public.projects, public.clips;

-- Done. Next: Dashboard > Advisors > Security Advisor should show no RLS errors.
`
