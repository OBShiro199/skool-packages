// Ethereel: the one migration the user pastes into Supabase > SQL Editor.
// Plain SQL inside a template literal. No backticks inside. No dollar-brace sequences.

export const sql = `-- =====================================================================
-- Ethereel migration 0001: the whole database in one go.
-- Paste ALL of it into Supabase > SQL Editor > New query > Run.
-- Run it once, on a fresh project. Every section starts with an ELI5 note.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. Extensions
-- ELI5: extensions are free add-ons for Postgres.
--   pgcrypto  prints unique IDs (gen_random_uuid) and random tokens.
--   pg_cron   is an alarm clock inside the database (runs jobs on a timer).
--   pg_net    lets the database call a URL (our zernio-sync edge function).
-- ---------------------------------------------------------------------
create extension if not exists pgcrypto with schema extensions;
create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

-- ---------------------------------------------------------------------
-- 1. Enums (fixed lists of allowed words)
-- ELI5: an enum is a drop-down menu for the database. A video can only
-- be in one of these states, so a typo like 'redy' is impossible.
-- The order of video_status follows the pipeline from upload to posted.
-- ---------------------------------------------------------------------
create type public.video_status as enum (
  'uploading',        -- browser is sending the raw clip with TUS
  'awaiting_assets',  -- "Motion graphics" was ticked: waiting for screenshots or Skip
  'queued',           -- waiting for a free processing slot (Gentle = 1, Fast = 2)
  'preparing',        -- ffmpeg: normalise to source.mp4, extract audio
  'transcribing',     -- Groq Whisper: every word with a start and end time
  'cutting',          -- silence map, adaptive threshold, kept segments
  'analysing',        -- face and eye detection (MediaPipe)
  'planning',         -- Claude: cutaways, subtitle; code: follow card cue, layout
  'rendering',        -- Remotion Lambda renders 1080x1920 30 fps
  'mixing',           -- voice rebuild, -14 LUFS, music bed, SFX
  'exporting',        -- final H.264 encode to the TikTok / Instagram spec
  'validating',       -- ffprobe checks the export before anyone sees it
  'ready_for_review', -- waiting for the creator to Pass, Reject or Revise
  'revising',         -- a revision request is being planned and re-rendered
  'approved',         -- passed, has a slot, waiting for handover to Zernio
  'scheduled',        -- handed to Zernio, will post at its slot
  'posted',           -- live on at least one platform
  'rejected',         -- creator rejected it, never posts
  'failed',           -- something broke, see error_code / error_message
  'cancelled'         -- creator deleted it while processing
);

create type public.processing_mode as enum ('gentle', 'fast');
create type public.queue_mode as enum ('manual', 'auto');
create type public.platform as enum ('tiktok', 'instagram');
create type public.render_status as enum ('queued', 'rendering', 'mixing', 'exporting', 'validating', 'ready', 'failed');
create type public.post_status as enum ('queued', 'handing_over', 'scheduled', 'published', 'partial', 'failed', 'cancelled');
create type public.caption_source as enum ('claude', 'rewrite', 'user');
create type public.revision_status as enum ('requested', 'planning', 'rendering', 'applied', 'impossible', 'failed', 'undone');
create type public.ledger_kind as enum ('video', 'render', 'revision', 'caption_rewrite', 'grant', 'refund');
create type public.event_status as enum ('started', 'progress', 'done', 'failed', 'skipped');

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
-- 3. Profiles (one row per person, made automatically on sign up)
-- ELI5: auth.users is Supabase's locked filing cabinet. profiles is our
-- own index card per creator. zernio_profile_id links them to Zernio,
-- the service that posts to TikTok and Instagram for us.
-- ---------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null default '',
  full_name text not null default '',
  onboarding_step text not null default 'brand',   -- brand > socials > first_upload > done
  onboarded_at timestamptz,
  zernio_profile_id text unique,                    -- set by connect-social, never by the browser
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- 4. Creator settings (the brand kit, one row per creator)
-- ELI5: everything that makes a reel look and sound like YOU: series
-- title, handles, hashtags, spelling list, posting times, follow card.
-- The pipeline reads this row at the start of every video.
-- ---------------------------------------------------------------------
create table public.creator_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  -- Opening title
  opening_title_enabled boolean not null default true,
  series_title text not null default '' check (char_length(series_title) <= 48),
  -- Follow card
  follow_card_enabled boolean not null default true,
  follow_cue_line text not null default 'still watching, follow me' check (char_length(follow_cue_line) <= 80),
  avatar_path text,                                    -- assets/<uid>/brand/avatar.png
  -- Handles per platform, plus words Whisper tends to mishear for them
  handle_tiktok text not null default '' check (char_length(handle_tiktok) <= 40),
  handle_instagram text not null default '' check (char_length(handle_instagram) <= 40),
  misheard_handles jsonb not null default '[]'::jsonb,  -- [{"heard":"rose well dev","fix":"@rosewell.dev"}]
  -- Spelling
  vocabulary text[] not null default '{}',             -- primes Whisper: {"rosewell.dev","Supabase"}
  spelling_fixes jsonb not null default '[]'::jsonb,    -- [{"from":"super base","to":"Supabase"}]
  -- Look and sound
  filter_preset_id uuid,                               -- fk added after filter_presets exists
  music_level_lufs numeric(4,1) not null default -39.0 check (music_level_lufs between -60 and -20),
  motion_graphics_default boolean not null default false,
  -- Post captions
  captions_auto boolean not null default true,
  caption_guidance text not null default '' check (char_length(caption_guidance) <= 600),
  hashtag_line text not null default '#buildinpublic' check (char_length(hashtag_line) <= 200),
  -- Posting
  posting_slots text[] not null default array['09:00','11:00','14:00','17:00','19:00'],
  timezone text not null default 'Europe/London',
  queue_mode public.queue_mode not null default 'manual',
  tiktok_privacy_level text not null default 'PUBLIC_TO_EVERYONE',
  tiktok_allow_comment boolean not null default true,
  tiktok_allow_duet boolean not null default false,
  tiktok_allow_stitch boolean not null default false,
  -- Processing
  processing_mode public.processing_mode not null default 'gentle',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint posting_slots_shape check (
    cardinality(posting_slots) between 1 and 8
  )
);

create trigger creator_settings_updated_at before update on public.creator_settings
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
  values (new.id, coalesce(new.email, ''), coalesce(new.raw_user_meta_data ->> 'full_name', ''));
  insert into public.creator_settings (user_id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- 5. Filter presets (colour grade sliders)
-- ELI5: a preset is five numbers. The browser preview and ffmpeg use
-- the exact same maths (PRD section 9.7), so what you see is what posts.
-- Rows with user_id null are built-in presets everyone can read.
-- ---------------------------------------------------------------------
create table public.filter_presets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade,  -- null = built-in
  name text not null check (char_length(name) between 1 and 40),
  warmth numeric(4,3) not null default 0 check (warmth between -1 and 1),
  sharpness numeric(4,3) not null default 0.3 check (sharpness between 0 and 1.5),
  brightness numeric(4,3) not null default 0 check (brightness between -0.2 and 0.2),
  contrast numeric(4,3) not null default 1 check (contrast between 0.5 and 1.5),
  saturation numeric(4,3) not null default 1 check (saturation between 0 and 2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index filter_presets_user_id_idx on public.filter_presets (user_id);
create trigger filter_presets_updated_at before update on public.filter_presets
  for each row execute function public.set_updated_at();

alter table public.creator_settings
  add constraint creator_settings_filter_fk
  foreign key (filter_preset_id) references public.filter_presets (id) on delete set null;

insert into public.filter_presets (user_id, name, warmth, sharpness, brightness, contrast, saturation) values
  (null, 'Natural',    0.000, 0.300,  0.000, 1.000, 1.000),
  (null, 'Warm film',  0.350, 0.400,  0.020, 1.060, 0.920),
  (null, 'Crisp',     -0.050, 0.800,  0.010, 1.100, 1.050),
  (null, 'Moody',     -0.150, 0.500, -0.030, 1.150, 0.850),
  (null, 'Bright',     0.100, 0.400,  0.050, 1.000, 1.080);

-- ---------------------------------------------------------------------
-- 6. Music tracks
-- ELI5: background music. user_id null = the shared library you upload
-- once into music/library/. Creators can add their own into music/<uid>/.
-- loudness_lufs is measured once by the pipeline so the bed sits ~25 dB
-- under the voice without guessing.
-- ---------------------------------------------------------------------
create table public.music_tracks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade,  -- null = library
  title text not null check (char_length(title) between 1 and 80),
  artist text not null default '',
  storage_path text not null unique,                           -- 'library/calm-keys.mp3' or '<uid>/<id>.mp3'
  duration_ms integer not null check (duration_ms > 0),
  loudness_lufs numeric(4,1),
  licence_note text not null default '',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index music_tracks_user_id_idx on public.music_tracks (user_id);

-- ---------------------------------------------------------------------
-- 7. Upload batches and videos
-- ELI5: one upload of up to 10 clips is a batch. Each clip becomes its own
-- video (a project). The video row is the heart of the app: its status
-- column moves along the pipeline and the browser watches it live.
-- ---------------------------------------------------------------------
create table public.upload_batches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  motion_graphics boolean not null default false,
  assets_decision text not null default 'pending' check (assets_decision in ('pending', 'added', 'skipped', 'not_needed')),
  clip_count integer not null default 0 check (clip_count between 0 and 10),
  created_at timestamptz not null default now()
);

create index upload_batches_user_id_idx on public.upload_batches (user_id, created_at desc);

create table public.videos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  batch_id uuid references public.upload_batches (id) on delete set null,
  title text not null default 'Untitled reel' check (char_length(title) <= 120),
  original_filename text not null default '',
  status public.video_status not null default 'uploading',
  motion_graphics boolean not null default false,
  processing_mode public.processing_mode not null default 'gentle',
  raw_path text not null,                                    -- raw-videos/<uid>/<video_id>/raw.<ext>
  raw_size_bytes bigint not null check (raw_size_bytes > 0 and raw_size_bytes <= 2147483648),
  declared_duration_ms integer not null check (declared_duration_ms between 3000 and 180000),
  duration_ms integer,                                       -- real length from ffprobe
  edited_duration_ms integer,                                -- length after silence cuts
  width integer,
  height integer,
  was_hdr boolean,
  seed text not null,                                        -- from the video name, keeps punch-ins stable
  current_edit_version integer not null default 0,
  current_render_id uuid,                                    -- fk added after renders exists
  trigger_run_id text,                                       -- Trigger.dev run of the pipeline
  error_code text,
  error_message text,
  review_decision text check (review_decision in ('pass', 'reject')),
  decided_at timestamptz,
  raw_deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index videos_user_created_idx on public.videos (user_id, created_at desc);
create index videos_user_status_idx on public.videos (user_id, status);
create index videos_batch_id_idx on public.videos (batch_id);
create index videos_status_idx on public.videos (status);
create trigger videos_updated_at before update on public.videos
  for each row execute function public.set_updated_at();

-- Screenshots the creator drops on the "Add assets?" page.
create table public.video_assets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  video_id uuid not null references public.videos (id) on delete cascade,
  storage_path text not null unique,                         -- assets/<uid>/<video_id>/<file>
  filename text not null,                                    -- monday-hero-project-management-for-teams.png
  mime_type text not null check (mime_type in ('image/png', 'image/jpeg', 'image/webp')),
  size_bytes integer not null check (size_bytes > 0 and size_bytes <= 20971520),
  width integer,
  height integer,
  match_tokens text[] not null default '{}',                 -- filled by the pipeline from the filename
  used_in_cutaway text,                                      -- cutaway id, each asset used once
  created_at timestamptz not null default now()
);

create index video_assets_user_id_idx on public.video_assets (user_id);
create index video_assets_video_id_idx on public.video_assets (video_id);

-- ---------------------------------------------------------------------
-- 8. Transcripts
-- ELI5: Whisper hands back a list like "so" at 420 ms, "today" at 610 ms.
-- We keep every word, the silence map and the loudness numbers so the
-- cut list can always be rebuilt the same way.
-- ---------------------------------------------------------------------
create table public.transcripts (
  id uuid primary key default gen_random_uuid(),
  video_id uuid not null unique references public.videos (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  provider text not null default 'groq',
  model text not null default 'whisper-large-v3-turbo',
  language text not null default 'en',
  words jsonb not null default '[]'::jsonb,        -- [{"i":0,"w":"So","s":420,"e":610,"raw":"so"}]
  silences jsonb not null default '[]'::jsonb,     -- [{"s":5120,"e":5840}]
  voice_avg_db numeric(5,1),
  threshold_db numeric(5,1),
  fixes_applied jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index transcripts_user_id_idx on public.transcripts (user_id);

-- ---------------------------------------------------------------------
-- 9. Edits (edit.json) and its history
-- ELI5: edit.json is the one recipe for a video: kept segments, caption
-- fixes, colour preset, music, eye position, cutaways, subtitle. Every
-- render is cooked from it. edits holds the current recipe; edit_revisions
-- keeps every old version so Undo is one click.
-- ---------------------------------------------------------------------
create table public.edits (
  video_id uuid primary key references public.videos (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  version integer not null check (version >= 1),
  edit_json jsonb not null,
  updated_at timestamptz not null default now()
);

create index edits_user_id_idx on public.edits (user_id);
create trigger edits_updated_at before update on public.edits
  for each row execute function public.set_updated_at();

create table public.edit_revisions (
  id uuid primary key default gen_random_uuid(),
  video_id uuid not null references public.videos (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  version integer not null check (version >= 1),
  edit_json jsonb not null,
  reason text not null check (reason in ('initial', 'revision', 'undo', 'caption_fix')),
  revision_request_id uuid,
  created_at timestamptz not null default now(),
  unique (video_id, version)
);

create index edit_revisions_user_id_idx on public.edit_revisions (user_id);
create index edit_revisions_video_idx on public.edit_revisions (video_id, version desc);

-- Plain-language revision notes and what Claude turned them into.
create table public.revision_requests (
  id uuid primary key default gen_random_uuid(),
  video_id uuid not null references public.videos (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  note text not null check (char_length(note) between 3 and 1000),
  status public.revision_status not null default 'requested',
  ops jsonb not null default '[]'::jsonb,
  impossible_reason text,
  what_changed jsonb not null default '[]'::jsonb,   -- ["Caption: 'super base' > 'Supabase' at 0:12"]
  from_version integer,
  to_version integer,
  trigger_run_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index revision_requests_user_id_idx on public.revision_requests (user_id);
create index revision_requests_video_idx on public.revision_requests (video_id, created_at desc);
create trigger revision_requests_updated_at before update on public.revision_requests
  for each row execute function public.set_updated_at();

alter table public.edit_revisions
  add constraint edit_revisions_request_fk
  foreign key (revision_request_id) references public.revision_requests (id) on delete set null;

-- ---------------------------------------------------------------------
-- 10. Cutaway plans (what Claude proposed, what survived the rules)
-- ELI5: Claude suggests diagrams. Code then checks every rule (never in
-- the first 3 s, 6 s apart, max 4...). We keep both lists so you can see
-- why a cutaway was dropped.
-- ---------------------------------------------------------------------
create table public.cutaway_plans (
  id uuid primary key default gen_random_uuid(),
  video_id uuid not null references public.videos (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  edit_version integer not null,
  raw_plan jsonb not null,
  validated_plan jsonb not null default '[]'::jsonb,
  dropped jsonb not null default '[]'::jsonb,        -- [{"id":"c2","reason":"overlaps follow card"}]
  model text not null default 'claude-opus-5-5',
  input_tokens integer,
  output_tokens integer,
  created_at timestamptz not null default now()
);

create index cutaway_plans_user_id_idx on public.cutaway_plans (user_id);
create index cutaway_plans_video_idx on public.cutaway_plans (video_id, created_at desc);

-- ---------------------------------------------------------------------
-- 11. Renders (one row per edit version that was rendered)
-- ELI5: a render is the finished MP4 made from one edit.json version.
-- validation holds the checklist result (codec, bitrate, colour tags...).
-- ---------------------------------------------------------------------
create table public.renders (
  id uuid primary key default gen_random_uuid(),
  video_id uuid not null references public.videos (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  edit_version integer not null,
  status public.render_status not null default 'queued',
  remotion_render_id text,
  remotion_cost_usd numeric(8,4),
  final_path text,                                   -- renders/<uid>/<video_id>/final-v<n>.mp4
  cover_path text,                                   -- renders/<uid>/<video_id>/cover-v<n>.jpg (frame at 3 s)
  duration_ms integer,
  size_bytes bigint,
  validation jsonb not null default '{}'::jsonb,
  timings jsonb not null default '{}'::jsonb,        -- {"remotion_ms":81000,"mix_ms":9000}
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (video_id, edit_version)
);

create index renders_user_id_idx on public.renders (user_id);
create index renders_video_idx on public.renders (video_id, edit_version desc);
create trigger renders_updated_at before update on public.renders
  for each row execute function public.set_updated_at();

alter table public.videos
  add constraint videos_current_render_fk
  foreign key (current_render_id) references public.renders (id) on delete set null;

-- ---------------------------------------------------------------------
-- 12. Post captions (versioned)
-- ELI5: the words under the post. Claude writes version 1 when the render
-- finishes. Rewrite makes a new version. When you type and press Save, the
-- browser inserts a version with source 'user'. Only one is current.
-- ---------------------------------------------------------------------
create table public.post_captions (
  id uuid primary key default gen_random_uuid(),
  video_id uuid not null references public.videos (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  version integer not null check (version >= 1),
  hook text not null default '' check (char_length(hook) <= 150),
  body text not null default '' check (char_length(body) <= 600),
  hashtag_line text not null default '' check (char_length(hashtag_line) <= 200),
  full_text text not null check (char_length(full_text) <= 2200),
  source public.caption_source not null,
  ai_tells_found text[] not null default '{}',
  is_current boolean not null default true,
  created_at timestamptz not null default now(),
  unique (video_id, version)
);

create index post_captions_user_id_idx on public.post_captions (user_id);
create unique index post_captions_one_current on public.post_captions (video_id) where is_current;

-- BEFORE insert so the partial unique index never sees two current rows.
create or replace function public.post_captions_clear_current()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.post_captions set is_current = false
   where video_id = new.video_id and is_current;
  new.is_current = true;
  if new.version is null or new.version < 1 then
    select coalesce(max(version), 0) + 1 into new.version
      from public.post_captions where video_id = new.video_id;
  end if;
  return new;
end;
$$;

create trigger post_captions_before_insert before insert on public.post_captions
  for each row execute function public.post_captions_clear_current();

-- ---------------------------------------------------------------------
-- 13. Social accounts (TikTok and Instagram, connected through Zernio)
-- ELI5: we never see the creator's TikTok or Instagram password. Zernio
-- holds the connection; we only store Zernio's account id and the handle.
-- creator_info keeps TikTok's allowed privacy levels for the Pass dialog.
-- ---------------------------------------------------------------------
create table public.social_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  platform public.platform not null,
  zernio_account_id text not null unique,
  username text not null default '',
  display_name text not null default '',
  avatar_url text,
  status text not null default 'connected' check (status in ('connected', 'disconnected', 'needs_reconnect')),
  creator_info jsonb not null default '{}'::jsonb,
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, platform)
);

create index social_accounts_user_id_idx on public.social_accounts (user_id);
create trigger social_accounts_updated_at before update on public.social_accounts
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- 14. Scheduled posts (the queue)
-- ELI5: Pass puts a video into the next free daily slot (09:00, 11:00,
-- 14:00, 17:00, 19:00 in the creator's time zone). Zernio only keeps
-- uploads for 7 days, so a post waits here and is handed to Zernio when
-- its slot is 6 days away or closer. The unique index means two videos
-- can never grab the same slot.
-- ---------------------------------------------------------------------
create table public.scheduled_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  video_id uuid not null unique references public.videos (id) on delete cascade,
  render_id uuid references public.renders (id) on delete set null,
  slot_at timestamptz not null,
  status public.post_status not null default 'queued',
  zernio_post_id text unique,
  zernio_media_url text,
  media_render_id uuid,                              -- which render Zernio currently holds
  handed_over_at timestamptz,
  platforms jsonb not null default '[]'::jsonb,      -- [{"platform":"tiktok","accountId":"...","status":"scheduled","url":null,"error":null}]
  tiktok_url text,
  instagram_url text,
  tiktok_privacy_level text,
  tiktok_consent_at timestamptz,                     -- creator ticked TikTok's consent box on Pass
  attempts integer not null default 0,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index scheduled_posts_user_slot_idx on public.scheduled_posts (user_id, slot_at);
create index scheduled_posts_due_idx on public.scheduled_posts (status, slot_at);
create unique index scheduled_posts_slot_unique on public.scheduled_posts (user_id, slot_at)
  where status <> 'cancelled' and status <> 'failed';
create trigger scheduled_posts_updated_at before update on public.scheduled_posts
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- 15. Job events (the live pipeline feed)
-- ELI5: every step of the pipeline writes a short line here ("transcribing
-- started", "cutting done: 15 cuts"). Supabase Realtime pushes each new
-- line to the browser so the processing page ticks along live.
-- ---------------------------------------------------------------------
create table public.job_events (
  id bigint generated always as identity primary key,
  video_id uuid not null references public.videos (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  step text not null,
  status public.event_status not null,
  message text not null default '',
  progress numeric(5,2) check (progress between 0 and 100),
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index job_events_user_id_idx on public.job_events (user_id);
create index job_events_video_idx on public.job_events (video_id, id desc);

-- ---------------------------------------------------------------------
-- 16. Usage ledger (what each creator used this month)
-- ELI5: a till receipt. Every started video and every render adds a line.
-- plan_limits() reads it to stop anyone going over their plan.
-- ---------------------------------------------------------------------
create table public.usage_ledger (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  kind public.ledger_kind not null,
  video_id uuid references public.videos (id) on delete set null,
  quantity integer not null default 1,
  seconds integer not null default 0,
  cost_usd numeric(8,4),
  note text not null default '',
  created_at timestamptz not null default now()
);

create index usage_ledger_user_created_idx on public.usage_ledger (user_id, created_at desc);
create index usage_ledger_video_idx on public.usage_ledger (video_id);
-- One 'video' line per video, even if start-pipeline is called twice.
create unique index usage_ledger_one_video_charge on public.usage_ledger (video_id) where kind = 'video';

-- ---------------------------------------------------------------------
-- 17. Subscriptions and webhook dedupe
-- ELI5: only the Stripe webhook writes subscriptions. The app reads it to
-- decide who gets in. stripe_events and inbound_events remember every
-- webhook we already handled so a retry never runs twice.
-- ---------------------------------------------------------------------
create table public.subscriptions (
  user_id uuid primary key references auth.users (id) on delete cascade,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  status text not null default 'incomplete',
  plan text not null default 'creator' check (plan in ('creator', 'pro')),
  billing_interval text not null default 'month' check (billing_interval in ('month', 'year')),
  price_id text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  trial_end timestamptz,
  cancel_at_period_end boolean not null default false,
  updated_at timestamptz not null default now()
);

create trigger subscriptions_updated_at before update on public.subscriptions
  for each row execute function public.set_updated_at();

create table public.stripe_events (
  id text primary key,
  type text not null,
  received_at timestamptz not null default now()
);

create table public.inbound_events (
  source text not null check (source in ('zernio', 'trigger')),
  event_id text not null,
  type text not null default '',
  received_at timestamptz not null default now(),
  primary key (source, event_id)
);

-- ---------------------------------------------------------------------
-- 18. Access and plan limits
-- ELI5: one function answers "is this person paying or trialing?" and one
-- answers "how much may they use?". Edge functions and Trigger.dev tasks
-- call these, so the rules live in one place.
--   Trial:   5 videos in total, clips up to 120 s, Gentle only.
--   Creator: 15 videos a month, clips up to 120 s, Gentle only, 2 revisions each.
--   Pro:     40 videos a month, clips up to 180 s, Fast allowed, 4 revisions each.
-- ---------------------------------------------------------------------
create or replace function public.has_active_access(p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.subscriptions s
     where s.user_id = p_user and s.status in ('trialing', 'active')
  );
$$;

create or replace function public.plan_limits(p_user uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_status text;
  v_plan text;
  v_period_start timestamptz;
begin
  select status, plan, current_period_start into v_status, v_plan, v_period_start
    from public.subscriptions where user_id = p_user;

  if v_status is null or v_status not in ('trialing', 'active') then
    return jsonb_build_object('access', false, 'videos_per_period', 0, 'max_clip_seconds', 0,
      'max_file_mb', 0, 'fast_allowed', false, 'revisions_per_video', 0, 'max_batch', 0,
      'caption_rewrites_per_video', 0, 'period_start', null);
  end if;

  if v_status = 'trialing' then
    return jsonb_build_object('access', true, 'tier', 'trial', 'videos_per_period', 5,
      'max_clip_seconds', 120, 'max_file_mb', 2048, 'fast_allowed', false,
      'revisions_per_video', 2, 'max_batch', 5, 'caption_rewrites_per_video', 5,
      'period_start', '1970-01-01T00:00:00Z');
  end if;

  if v_plan = 'pro' then
    return jsonb_build_object('access', true, 'tier', 'pro', 'videos_per_period', 40,
      'max_clip_seconds', 180, 'max_file_mb', 2048, 'fast_allowed', true,
      'revisions_per_video', 4, 'max_batch', 10, 'caption_rewrites_per_video', 10,
      'period_start', coalesce(v_period_start, date_trunc('month', now())));
  end if;

  return jsonb_build_object('access', true, 'tier', 'creator', 'videos_per_period', 15,
    'max_clip_seconds', 120, 'max_file_mb', 2048, 'fast_allowed', false,
    'revisions_per_video', 2, 'max_batch', 5, 'caption_rewrites_per_video', 5,
    'period_start', coalesce(v_period_start, date_trunc('month', now())));
end;
$$;

-- How many videos has this person started in the current period?
create or replace function public.videos_used(p_user uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(sum(l.quantity), 0)::integer
    from public.usage_ledger l
   where l.user_id = p_user
     and l.kind in ('video', 'refund')
     and l.created_at >= ((public.plan_limits(p_user) ->> 'period_start')::timestamptz);
$$;

-- The gate create-upload calls before a single byte is uploaded.
create or replace function public.can_start_video(p_user uuid, p_duration_ms integer, p_size_bytes bigint, p_batch_count integer default 1)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_limits jsonb := public.plan_limits(p_user);
  v_used integer := public.videos_used(p_user);
begin
  if not (v_limits ->> 'access')::boolean then
    return jsonb_build_object('ok', false, 'code', 'no_access');
  end if;
  if p_duration_ms > (v_limits ->> 'max_clip_seconds')::integer * 1000 then
    return jsonb_build_object('ok', false, 'code', 'clip_too_long', 'limit', v_limits -> 'max_clip_seconds');
  end if;
  if p_size_bytes > (v_limits ->> 'max_file_mb')::bigint * 1024 * 1024 then
    return jsonb_build_object('ok', false, 'code', 'file_too_big', 'limit', v_limits -> 'max_file_mb');
  end if;
  if p_batch_count > (v_limits ->> 'max_batch')::integer then
    return jsonb_build_object('ok', false, 'code', 'batch_too_big', 'limit', v_limits -> 'max_batch');
  end if;
  if v_used + p_batch_count > (v_limits ->> 'videos_per_period')::integer then
    return jsonb_build_object('ok', false, 'code', 'limit_reached', 'used', v_used, 'limit', v_limits -> 'videos_per_period');
  end if;
  return jsonb_build_object('ok', true, 'used', v_used, 'limits', v_limits);
end;
$$;

-- ---------------------------------------------------------------------
-- 19. Queue slots
-- ELI5: next_free_slot walks forward day by day through the creator's
-- posting times (in their time zone) and returns the first one nobody has.
-- assign_slot does that under a lock so two Pass clicks never collide.
-- Only the service role (edge functions) may call assign_slot.
-- ---------------------------------------------------------------------
create or replace function public.next_free_slot(p_user uuid, p_after timestamptz)
returns timestamptz
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_tz text;
  v_slots text[];
  v_sorted text[];
  v_slot text;
  v_day date;
  v_at timestamptz;
  i integer;
begin
  select cs.timezone, cs.posting_slots into v_tz, v_slots
    from public.creator_settings cs where cs.user_id = p_user;
  v_tz := coalesce(v_tz, 'Europe/London');
  v_slots := coalesce(v_slots, array['09:00','11:00','14:00','17:00','19:00']);
  select array_agg(s order by s) into v_sorted from unnest(v_slots) as s;

  for i in 0..120 loop
    v_day := (p_after at time zone v_tz)::date + i;
    foreach v_slot in array v_sorted loop
      v_at := ((v_day::text || ' ' || v_slot || ':00')::timestamp) at time zone v_tz;
      if v_at > p_after and not exists (
        select 1 from public.scheduled_posts sp
         where sp.user_id = p_user and sp.slot_at = v_at
           and sp.status <> 'cancelled' and sp.status <> 'failed'
      ) then
        return v_at;
      end if;
    end loop;
  end loop;
  return null;
end;
$$;

create or replace function public.assign_slot(p_video uuid, p_render uuid, p_privacy text, p_consent boolean)
returns public.scheduled_posts
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid;
  v_at timestamptz;
  v_row public.scheduled_posts;
begin
  select user_id into v_user from public.videos where id = p_video;
  if v_user is null then
    raise exception 'video_not_found';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(v_user::text, 0));
  -- 30 minutes of breathing room so a post never lands in the past.
  v_at := public.next_free_slot(v_user, now() + interval '30 minutes');
  if v_at is null then
    raise exception 'no_free_slot';
  end if;
  insert into public.scheduled_posts (user_id, video_id, render_id, slot_at, tiktok_privacy_level, tiktok_consent_at)
  values (v_user, p_video, p_render, v_at, p_privacy, case when p_consent then now() else null end)
  on conflict (video_id) do update
     set render_id = excluded.render_id,
         status = case when public.scheduled_posts.status = 'cancelled' then 'queued'::public.post_status else public.scheduled_posts.status end,
         slot_at = case when public.scheduled_posts.status = 'cancelled' then excluded.slot_at else public.scheduled_posts.slot_at end
  returning * into v_row;
  update public.videos set status = 'approved', review_decision = 'pass', decided_at = now() where id = p_video;
  return v_row;
end;
$$;

revoke execute on function public.assign_slot(uuid, uuid, text, boolean) from public, anon, authenticated;
grant execute on function public.assign_slot(uuid, uuid, text, boolean) to service_role;
revoke execute on function public.can_start_video(uuid, integer, bigint, integer) from public, anon;
grant execute on function public.can_start_video(uuid, integer, bigint, integer) to authenticated, service_role;

-- Posts that Zernio should get now: approved, slot within 6 days, not handed over.
create or replace function public.due_for_handover(p_limit integer default 20)
returns setof public.scheduled_posts
language sql
stable
security definer
set search_path = ''
as $$
  select * from public.scheduled_posts
   where status = 'queued'
     and slot_at <= now() + interval '6 days'
     and slot_at > now() + interval '10 minutes'
     and attempts < 5
   order by slot_at
   limit p_limit;
$$;

revoke execute on function public.due_for_handover(integer) from public, anon, authenticated;
grant execute on function public.due_for_handover(integer) to service_role;

-- ---------------------------------------------------------------------
-- 20. Views (security_invoker = true so RLS still applies)
-- ELI5: a view is a saved query. security_invoker means it runs with the
-- reader's own permissions, so nobody sees another creator's rows.
-- ---------------------------------------------------------------------
create view public.video_cards with (security_invoker = true) as
select
  v.id, v.user_id, v.title, v.status, v.created_at, v.updated_at,
  v.duration_ms, v.edited_duration_ms, v.error_code, v.error_message,
  r.id as render_id, r.final_path, r.cover_path, r.edit_version,
  pc.full_text as caption_text,
  sp.slot_at, sp.status as post_status, sp.tiktok_url, sp.instagram_url
from public.videos v
left join public.renders r on r.id = v.current_render_id
left join public.post_captions pc on pc.video_id = v.id and pc.is_current
left join public.scheduled_posts sp on sp.video_id = v.id;

create view public.usage_this_period with (security_invoker = true) as
select
  l.user_id,
  count(*) filter (where l.kind = 'video') as videos,
  count(*) filter (where l.kind = 'render') as renders,
  count(*) filter (where l.kind = 'revision') as revisions,
  coalesce(sum(l.seconds) filter (where l.kind = 'video'), 0) as raw_seconds
from public.usage_ledger l
where l.created_at >= date_trunc('month', now())
group by l.user_id;

-- ---------------------------------------------------------------------
-- 21. Row Level Security
-- ELI5: RLS is a bouncer on every table. The browser key can only touch
-- rows where user_id is the logged-in person. One policy per action
-- (select, insert, update, delete). Pipeline tables have NO insert,
-- update or delete policies: only the server (secret key, which skips
-- RLS) writes them, so nobody can fake a render or a transcript.
-- ---------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.creator_settings enable row level security;
alter table public.filter_presets enable row level security;
alter table public.music_tracks enable row level security;
alter table public.upload_batches enable row level security;
alter table public.videos enable row level security;
alter table public.video_assets enable row level security;
alter table public.transcripts enable row level security;
alter table public.edits enable row level security;
alter table public.edit_revisions enable row level security;
alter table public.revision_requests enable row level security;
alter table public.cutaway_plans enable row level security;
alter table public.renders enable row level security;
alter table public.post_captions enable row level security;
alter table public.social_accounts enable row level security;
alter table public.scheduled_posts enable row level security;
alter table public.job_events enable row level security;
alter table public.usage_ledger enable row level security;
alter table public.subscriptions enable row level security;
alter table public.stripe_events enable row level security;
alter table public.inbound_events enable row level security;

-- profiles: read and edit your own card (zernio_profile_id is protected below).
create policy profiles_select_own on public.profiles for select to authenticated
  using ((select auth.uid()) = id);
create policy profiles_update_own on public.profiles for update to authenticated
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

-- creator_settings: read, create and edit your own brand kit.
create policy creator_settings_select_own on public.creator_settings for select to authenticated
  using ((select auth.uid()) = user_id);
create policy creator_settings_insert_own on public.creator_settings for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy creator_settings_update_own on public.creator_settings for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- filter_presets: read built-ins plus your own; full control of your own only.
create policy filter_presets_select on public.filter_presets for select to authenticated
  using (user_id is null or (select auth.uid()) = user_id);
create policy filter_presets_insert_own on public.filter_presets for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy filter_presets_update_own on public.filter_presets for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy filter_presets_delete_own on public.filter_presets for delete to authenticated
  using ((select auth.uid()) = user_id);

-- music_tracks: read the library plus your own; manage your own.
create policy music_tracks_select on public.music_tracks for select to authenticated
  using (user_id is null or (select auth.uid()) = user_id);
create policy music_tracks_insert_own on public.music_tracks for insert to authenticated
  with check ((select auth.uid()) = user_id and storage_path like ((select auth.uid())::text || '/%'));
create policy music_tracks_update_own on public.music_tracks for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy music_tracks_delete_own on public.music_tracks for delete to authenticated
  using ((select auth.uid()) = user_id);

-- upload_batches: create and read your own; update the assets decision.
create policy upload_batches_select_own on public.upload_batches for select to authenticated
  using ((select auth.uid()) = user_id);
create policy upload_batches_insert_own on public.upload_batches for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy upload_batches_update_own on public.upload_batches for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- videos: rows are created by the create-upload edge function. The browser may
-- read its own and rename them (column grant below), nothing else.
create policy videos_select_own on public.videos for select to authenticated
  using ((select auth.uid()) = user_id);
create policy videos_update_own on public.videos for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- video_assets: add, read and remove screenshots on your own videos.
create policy video_assets_select_own on public.video_assets for select to authenticated
  using ((select auth.uid()) = user_id);
create policy video_assets_insert_own on public.video_assets for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (select 1 from public.videos v where v.id = video_id and v.user_id = (select auth.uid()))
    and storage_path like ((select auth.uid())::text || '/' || video_id::text || '/%')
  );
create policy video_assets_delete_own on public.video_assets for delete to authenticated
  using ((select auth.uid()) = user_id);

-- Pipeline tables: read your own, never write.
create policy transcripts_select_own on public.transcripts for select to authenticated
  using ((select auth.uid()) = user_id);
create policy edits_select_own on public.edits for select to authenticated
  using ((select auth.uid()) = user_id);
create policy edit_revisions_select_own on public.edit_revisions for select to authenticated
  using ((select auth.uid()) = user_id);
create policy revision_requests_select_own on public.revision_requests for select to authenticated
  using ((select auth.uid()) = user_id);
create policy cutaway_plans_select_own on public.cutaway_plans for select to authenticated
  using ((select auth.uid()) = user_id);
create policy renders_select_own on public.renders for select to authenticated
  using ((select auth.uid()) = user_id);
create policy social_accounts_select_own on public.social_accounts for select to authenticated
  using ((select auth.uid()) = user_id);
create policy scheduled_posts_select_own on public.scheduled_posts for select to authenticated
  using ((select auth.uid()) = user_id);
create policy job_events_select_own on public.job_events for select to authenticated
  using ((select auth.uid()) = user_id);
create policy usage_ledger_select_own on public.usage_ledger for select to authenticated
  using ((select auth.uid()) = user_id);
create policy subscriptions_select_own on public.subscriptions for select to authenticated
  using ((select auth.uid()) = user_id);

-- post_captions: read your own; Save inserts a new 'user' version.
create policy post_captions_select_own on public.post_captions for select to authenticated
  using ((select auth.uid()) = user_id);
create policy post_captions_insert_own on public.post_captions for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and source = 'user'
    and exists (select 1 from public.videos v where v.id = video_id and v.user_id = (select auth.uid()))
  );

-- stripe_events and inbound_events: RLS on with no policies = server only.

-- Column-level locks. RLS decides WHICH rows; these grants decide WHICH
-- columns the browser may change. Everything else is server only.
revoke update on public.videos from authenticated;
grant update (title) on public.videos to authenticated;
revoke update on public.profiles from authenticated;
grant update (full_name, onboarding_step, onboarded_at) on public.profiles to authenticated;
revoke insert, update, delete on public.subscriptions from anon, authenticated;
revoke insert, update, delete on public.usage_ledger from anon, authenticated;
revoke all on public.stripe_events from anon, authenticated;
revoke all on public.inbound_events from anon, authenticated;

-- ---------------------------------------------------------------------
-- 22. Realtime
-- ELI5: switch on live updates for the tables the processing page and
-- review page watch. RLS still applies to what each browser receives.
-- ---------------------------------------------------------------------
alter publication supabase_realtime add table public.job_events;
alter publication supabase_realtime add table public.videos;
alter publication supabase_realtime add table public.renders;
alter publication supabase_realtime add table public.scheduled_posts;

-- ---------------------------------------------------------------------
-- 23. Storage buckets
-- ELI5: buckets are folders in the cloud. All four are private. Files
-- always live under a folder named after the owner's user id, so the
-- policies below can say "only the owner of this folder".
--   raw-videos  the original iPhone clips (up to 2 GB, resumable TUS upload)
--   assets      screenshots for Image cutaways and the follow-card avatar
--   renders     everything the pipeline makes (server writes, owner reads)
--   music       the shared library (music/library/...) plus own tracks
-- Note: on the Free plan Supabase caps every upload at 50 MB. Test with
-- short clips until you move to Pro, then raise the global limit in
-- Storage > Settings.
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('raw-videos', 'raw-videos', false, 2147483648, array['video/quicktime', 'video/mp4', 'video/x-m4v']),
  ('assets',     'assets',     false, 20971520,   array['image/png', 'image/jpeg', 'image/webp']),
  ('renders',    'renders',    false, 1073741824, array['video/mp4', 'image/jpeg', 'audio/wav', 'audio/mp4', 'application/json']),
  ('music',      'music',      false, 52428800,   array['audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/x-wav'])
on conflict (id) do nothing;

-- raw-videos: owner uploads (TUS uses insert + update), reads and deletes.
create policy raw_videos_insert_own on storage.objects for insert to authenticated
  with check (bucket_id = 'raw-videos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy raw_videos_update_own on storage.objects for update to authenticated
  using (bucket_id = 'raw-videos' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'raw-videos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy raw_videos_select_own on storage.objects for select to authenticated
  using (bucket_id = 'raw-videos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy raw_videos_delete_own on storage.objects for delete to authenticated
  using (bucket_id = 'raw-videos' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- assets: owner uploads, reads and deletes screenshots and the avatar.
create policy assets_insert_own on storage.objects for insert to authenticated
  with check (bucket_id = 'assets' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy assets_select_own on storage.objects for select to authenticated
  using (bucket_id = 'assets' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy assets_update_own on storage.objects for update to authenticated
  using (bucket_id = 'assets' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'assets' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy assets_delete_own on storage.objects for delete to authenticated
  using (bucket_id = 'assets' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- renders: owner may only READ. Trigger.dev tasks write with the secret key.
create policy renders_select_own on storage.objects for select to authenticated
  using (bucket_id = 'renders' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- music: everyone signed in reads the library; owners manage their own folder.
create policy music_select on storage.objects for select to authenticated
  using (bucket_id = 'music' and ((storage.foldername(name))[1] = 'library' or (storage.foldername(name))[1] = (select auth.uid())::text));
create policy music_insert_own on storage.objects for insert to authenticated
  with check (bucket_id = 'music' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy music_delete_own on storage.objects for delete to authenticated
  using (bucket_id = 'music' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- ---------------------------------------------------------------------
-- 24. Scheduled job: Zernio sync every 10 minutes
-- ELI5: pg_cron rings every 10 minutes and pg_net calls our zernio-sync
-- edge function. The URL and the shared secret live in Supabase Vault
-- (an encrypted safe), never in this file. Create the two secrets in the
-- "Edge function: zernio-sync" task BEFORE this job first fires; until
-- then it fails quietly and tries again 10 minutes later.
--   select vault.create_secret('https://<project-ref>.supabase.co', 'project_url');
--   select vault.create_secret('<the same CRON_SECRET you set for edge functions>', 'cron_secret');
-- ---------------------------------------------------------------------
select cron.schedule(
  'ethereel-zernio-sync',
  '*/10 * * * *',
  $cron$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/zernio-sync',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
    ),
    body := jsonb_build_object('source', 'pg_cron'),
    timeout_milliseconds := 20000
  );
  $cron$
);

-- Housekeeping: keep job_events lean (older than 30 days are not needed).
select cron.schedule(
  'ethereel-trim-job-events',
  '17 3 * * *',
  $cron$ delete from public.job_events where created_at < now() - interval '30 days'; $cron$
);

-- =====================================================================
-- Done. Check: Table Editor shows 21 tables, Storage shows 4 buckets,
-- Integrations > Cron shows 2 jobs, and Advisors > Security shows no
-- "RLS disabled" errors.
-- =====================================================================
`
