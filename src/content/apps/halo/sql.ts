// Halo single migration, pasted into the Supabase SQL editor once on a fresh project.

export const sql = `-- =====================================================================
-- Halo: full database migration
-- Paste this whole file into Supabase > SQL Editor > New query > Run.
-- Run it ONCE on a fresh project. Order: extensions, enums, tables,
-- helper functions, triggers, RLS policies, views, storage, realtime,
-- schedules (commented out until your edge functions are deployed).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. EXTENSIONS
-- ELI5: extensions are add-ons for the database. pgcrypto gives us
-- secure random bytes and SHA-256 hashing for links and keys.
-- Vault (already on in every Supabase project) keeps secrets encrypted.
-- ---------------------------------------------------------------------
create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------
-- 1. ENUMS
-- ELI5: an enum is a fixed list of allowed words for a column. A review
-- request can be 'scheduled' or 'sent', never 'banana'.
-- ---------------------------------------------------------------------
create type public.workspace_role as enum ('owner', 'admin', 'member');
create type public.workspace_kind as enum ('business', 'agency');
create type public.google_mode as enum ('link', 'connected');
create type public.sms_sender_status as enum ('draft', 'creating_subaccount', 'number_bought',
  'verification_pending', 'approved', 'rejected', 'released');
create type public.connection_status as enum ('active', 'error', 'disconnected');
create type public.request_source as enum ('manual', 'csv', 'webhook', 'test');
create type public.request_channel as enum ('sms', 'email', 'both');
create type public.request_status as enum ('scheduled', 'sending', 'sent', 'failed', 'skipped', 'cancelled');
create type public.link_kind as enum ('initial', 'reminder');
create type public.message_channel as enum ('sms', 'email');
create type public.feedback_status as enum ('new', 'contacted', 'resolved');
create type public.draft_status as enum ('generating', 'ready', 'posting', 'posted', 'failed', 'discarded');
create type public.draft_source as enum ('ai', 'manual', 'pasted');
create type public.import_status as enum ('uploaded', 'processing', 'done', 'failed');
create type public.job_kind as enum ('draft_reply', 'feedback_alert', 'low_review_alert', 'daily_digest',
  'weekly_report', 'usage_alert', 'import_done_email');
create type public.job_status as enum ('queued', 'running', 'done', 'dead');
create type public.usage_kind as enum ('review_requests', 'sms_segments', 'emails', 'ai_drafts');

-- ---------------------------------------------------------------------
-- 2. SHARED TRIGGER: updated_at
-- ELI5: every time a row changes, this stamps the time on it.
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- 3. PROFILES (one per login) + signup trigger
-- ELI5: Supabase keeps logins in auth.users. We keep a friendly copy in
-- public.profiles, made automatically the moment someone signs up.
-- ---------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text not null default '',
  current_workspace_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, coalesce(new.email, ''), coalesce(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- 4. WORKSPACES, MEMBERS, INVITES
-- ELI5: a workspace is one business (or one agency). People join it as
-- owner, admin or member. The owner's subscription pays for everyone.
-- ---------------------------------------------------------------------
create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 80),
  kind public.workspace_kind not null default 'business',
  business_type text,
  owner_id uuid not null references auth.users (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index workspaces_owner_idx on public.workspaces (owner_id);
create trigger workspaces_updated_at before update on public.workspaces
  for each row execute function public.set_updated_at();

alter table public.profiles
  add constraint profiles_current_workspace_fk foreign key (current_workspace_id)
  references public.workspaces (id) on delete set null;
create index profiles_current_workspace_idx on public.profiles (current_workspace_id);

create table public.workspace_members (
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.workspace_role not null default 'member',
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);
create index workspace_members_user_idx on public.workspace_members (user_id);

create table public.invites (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  email text not null,
  role public.workspace_role not null default 'member' check (role <> 'owner'),
  token_hash text not null unique,
  expires_at timestamptz not null default now() + interval '7 days',
  accepted_at timestamptz,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
create index invites_ws_idx on public.invites (workspace_id);
create index invites_created_by_idx on public.invites (created_by);

-- ---------------------------------------------------------------------
-- 5. MEMBERSHIP HELPERS (used by every policy below)
-- ELI5: one small question the database asks before showing a row:
-- "is this person in that workspace?" Security definer means the check
-- itself can read the members table, and search_path = '' stops anyone
-- sneaking in a fake table with the same name.
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

-- Storage paths start with the workspace id as text. This helper checks
-- it safely (a bad folder name returns false instead of an error).
create or replace function public.is_workspace_member_text(ws text)
returns boolean language plpgsql stable security definer set search_path = '' as $$
begin
  return public.is_workspace_member(ws::uuid);
exception when invalid_text_representation then
  return false;
end;
$$;

create or replace function public.has_workspace_role_text(ws text, roles public.workspace_role[])
returns boolean language plpgsql stable security definer set search_path = '' as $$
begin
  return public.has_workspace_role(ws::uuid, roles);
exception when invalid_text_representation then
  return false;
end;
$$;

-- ---------------------------------------------------------------------
-- 6. BILLING (written only by the Stripe webhook with the secret key)
-- ELI5: Stripe tells us who is paying. The app only ever reads this.
-- plan_prices maps each Stripe price id to a plan name.
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

create table public.plan_prices (
  price_id text primary key,
  plan text not null check (plan in ('solo', 'growth', 'agency')),
  interval text not null check (interval in ('month', 'year'))
);
-- After creating prices in Stripe, run (with your real price ids):
-- insert into public.plan_prices values
--   ('price_SOLO_M', 'solo', 'month'), ('price_SOLO_Y', 'solo', 'year'),
--   ('price_GROWTH_M', 'growth', 'month'), ('price_GROWTH_Y', 'growth', 'year'),
--   ('price_AGENCY_M', 'agency', 'month'), ('price_AGENCY_Y', 'agency', 'year');

create table public.workspace_limit_overrides (
  workspace_id uuid primary key references public.workspaces (id) on delete cascade,
  requests integer,
  ai_drafts integer,
  locations integer,
  seats integer,
  note text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 7. TEXTING SENDERS, GOOGLE CONNECTIONS, LOCATIONS
-- ELI5: a location is one shop or clinic. It points at a texting number
-- (sms_senders, one per business, approved by the phone carriers) and,
-- if connected, a Google Business Profile location. Secrets (Twilio
-- tokens, Google refresh tokens) live in Vault; tables keep only the
-- Vault id, like a cloakroom ticket.
-- ---------------------------------------------------------------------
create table public.sms_senders (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  legal_business_name text not null check (char_length(legal_business_name) between 2 and 120),
  website text not null,
  registration_number text,
  street text,
  city text,
  region text,
  postal_code text,
  country text not null default 'US',
  contact_first_name text,
  contact_last_name text,
  contact_email text,
  contact_phone text,
  opt_in_method text not null default 'at_booking' check (opt_in_method in ('at_booking', 'join_page')),
  monthly_volume text not null default '1000',
  twilio_subaccount_sid text unique,
  auth_token_secret_id uuid,
  phone_number text,
  phone_sid text,
  verification_sid text,
  status public.sms_sender_status not null default 'draft',
  rejection_reason text,
  submitted_at timestamptz,
  approved_at timestamptz,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index sms_senders_ws_idx on public.sms_senders (workspace_id);
create index sms_senders_created_by_idx on public.sms_senders (created_by);
create index sms_senders_status_idx on public.sms_senders (status);
create trigger sms_senders_updated_at before update on public.sms_senders
  for each row execute function public.set_updated_at();

create table public.google_connections (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  google_email text not null,
  refresh_token_secret_id uuid,
  status public.connection_status not null default 'active',
  failures integer not null default 0,
  last_error text,
  connected_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, google_email)
);
create index google_connections_ws_idx on public.google_connections (workspace_id);
create index google_connections_by_idx on public.google_connections (connected_by);
create trigger google_connections_updated_at before update on public.google_connections
  for each row execute function public.set_updated_at();

create table public.locations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  sms_name text not null check (char_length(sms_name) between 1 and 24),
  slug text not null unique check (slug ~ '^[a-z0-9-]{3,60}$'),
  timezone text not null default 'America/New_York',
  address text,
  logo_path text,
  google_mode public.google_mode not null default 'link',
  review_url text check (review_url is null or review_url like 'https://%'),
  google_connection_id uuid references public.google_connections (id) on delete set null,
  google_account text,
  google_location text,
  place_id text,
  last_synced_at timestamptz,
  sms_sender_id uuid references public.sms_senders (id) on delete set null,
  send_delay_minutes integer not null default 120 check (send_delay_minutes between 0 and 4320),
  send_window_start time not null default '09:00',
  send_window_end time not null default '20:00',
  send_on_sundays boolean not null default true,
  reminder_enabled boolean not null default true,
  alert_threshold integer not null default 3 check (alert_threshold between 1 and 5),
  alert_emails text[] not null default '{}',
  report_email text,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (send_window_start < send_window_end)
);
create index locations_ws_idx on public.locations (workspace_id);
create index locations_connection_idx on public.locations (google_connection_id);
create index locations_sender_idx on public.locations (sms_sender_id);
create index locations_sync_idx on public.locations (google_mode, last_synced_at);
create trigger locations_updated_at before update on public.locations
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- 8. INTAKE KEYS (for Zapier and webhooks)
-- ELI5: a key is a password a booking tool uses to say "a visit has
-- finished". We show it once and keep only its fingerprint (sha256).
-- ---------------------------------------------------------------------
create table public.intake_keys (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  location_id uuid not null references public.locations (id) on delete cascade,
  label text not null default 'Zapier',
  key_prefix text not null,
  key_hash text not null unique,
  last_used_at timestamptz,
  revoked_at timestamptz,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
create index intake_keys_ws_idx on public.intake_keys (workspace_id);
create index intake_keys_location_idx on public.intake_keys (location_id);
create index intake_keys_created_by_idx on public.intake_keys (created_by);

-- ---------------------------------------------------------------------
-- 9. CONTACTS AND CSV IMPORTS
-- ELI5: a contact is one customer of one location. sms_consent says the
-- business told us this person agreed to a text. Opt-outs are forever.
-- ---------------------------------------------------------------------
create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  location_id uuid not null references public.locations (id) on delete cascade,
  full_name text not null default '',
  first_name text not null default '',
  phone_e164 text check (phone_e164 is null or phone_e164 ~ '^[+][1-9][0-9]{6,14}$'),
  email text check (email is null or position('@' in email) > 1),
  sms_consent boolean not null default false,
  consent_source text,
  sms_opted_out_at timestamptz,
  email_opted_out_at timestamptz,
  phone_invalid_at timestamptz,
  external_ref text,
  last_requested_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index contacts_location_phone_uidx on public.contacts (location_id, phone_e164) where phone_e164 is not null;
create unique index contacts_location_email_uidx on public.contacts (location_id, email) where email is not null;
create index contacts_ws_idx on public.contacts (workspace_id);
create index contacts_phone_idx on public.contacts (phone_e164);
create trigger contacts_updated_at before update on public.contacts
  for each row execute function public.set_updated_at();

create table public.csv_imports (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  location_id uuid not null references public.locations (id) on delete cascade,
  file_name text not null,
  storage_path text not null,
  status public.import_status not null default 'uploaded',
  rows_total integer not null default 0,
  rows_scheduled integer not null default 0,
  rows_skipped integer not null default 0,
  skipped_by_reason jsonb not null default '{}'::jsonb,
  errors jsonb not null default '[]'::jsonb,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index csv_imports_ws_idx on public.csv_imports (workspace_id, created_at desc);
create index csv_imports_location_idx on public.csv_imports (location_id);
create index csv_imports_created_by_idx on public.csv_imports (created_by);
create trigger csv_imports_updated_at before update on public.csv_imports
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- 10. REVIEW REQUESTS, LINKS, MESSAGE EVENTS
-- ELI5: a review request is "ask Maria how her visit was". Each step it
-- reaches (sent, opened, rated, went to Google) is a time stamp on the
-- row. A link is the short code in the text; we keep only its sha256.
-- ---------------------------------------------------------------------
create table public.review_requests (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  location_id uuid not null references public.locations (id) on delete cascade,
  contact_id uuid not null references public.contacts (id) on delete cascade,
  csv_import_id uuid references public.csv_imports (id) on delete set null,
  source public.request_source not null,
  channel public.request_channel,
  status public.request_status not null default 'scheduled',
  skip_reason text check (skip_reason is null or skip_reason in ('no_channel', 'opted_out', 'asked_recently',
    'invalid_phone', 'suppressed_email', 'limit_reached', 'sms_not_ready', 'stale_visit', 'no_review_link')),
  visit_at timestamptz not null default now(),
  send_at timestamptz not null default now(),
  locked_at timestamptz,
  sent_at timestamptz,
  delivered_at timestamptz,
  reminder_claimed_at timestamptz,
  reminder_sent_at timestamptz,
  opened_at timestamptz,
  rated_at timestamptz,
  rating smallint check (rating is null or rating between 1 and 5),
  google_clicked_at timestamptz,
  feedback_at timestamptz,
  idempotency_key text not null unique,
  attempts integer not null default 0,
  last_error text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((status = 'skipped') = (skip_reason is not null))
);
create index review_requests_ws_idx on public.review_requests (workspace_id, created_at desc);
create index review_requests_location_idx on public.review_requests (location_id, sent_at);
create index review_requests_contact_idx on public.review_requests (contact_id, created_at desc);
create index review_requests_import_idx on public.review_requests (csv_import_id);
create index review_requests_created_by_idx on public.review_requests (created_by);
create index review_requests_due_idx on public.review_requests (send_at) where status = 'scheduled';
create index review_requests_remind_idx on public.review_requests (sent_at)
  where status = 'sent' and opened_at is null and reminder_claimed_at is null;
create trigger review_requests_updated_at before update on public.review_requests
  for each row execute function public.set_updated_at();

create table public.request_links (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  request_id uuid not null references public.review_requests (id) on delete cascade,
  kind public.link_kind not null,
  token_hash text not null unique,
  expires_at timestamptz not null default now() + interval '60 days',
  created_at timestamptz not null default now(),
  unique (request_id, kind)
);
create index request_links_ws_idx on public.request_links (workspace_id);

create table public.message_events (
  id bigint generated always as identity primary key,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  request_id uuid references public.review_requests (id) on delete cascade,
  channel public.message_channel not null,
  provider text not null check (provider in ('twilio', 'resend')),
  provider_message_id text,
  event text not null,
  error_code text,
  dedupe_key text not null unique,
  occurred_at timestamptz not null default now()
);
create index message_events_ws_idx on public.message_events (workspace_id, occurred_at desc);
create index message_events_request_idx on public.message_events (request_id);
create index message_events_provider_idx on public.message_events (provider_message_id);

-- ---------------------------------------------------------------------
-- 11. PRIVATE FEEDBACK
-- ELI5: the private note a customer sends to the team. Only the
-- business sees it. One note per request.
-- ---------------------------------------------------------------------
create table public.feedback (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  location_id uuid not null references public.locations (id) on delete cascade,
  request_id uuid not null unique references public.review_requests (id) on delete cascade,
  rating smallint check (rating is null or rating between 1 and 5),
  body text not null check (char_length(body) between 1 and 2000),
  via text not null default 'page' check (via in ('page', 'sms_reply')),
  wants_reply boolean not null default true,
  status public.feedback_status not null default 'new',
  assigned_to uuid references auth.users (id) on delete set null,
  owner_note text,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index feedback_ws_idx on public.feedback (workspace_id, created_at desc);
create index feedback_location_idx on public.feedback (location_id);
create index feedback_assigned_idx on public.feedback (assigned_to);
create index feedback_status_idx on public.feedback (workspace_id, status);
create trigger feedback_updated_at before update on public.feedback
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- 12. GOOGLE REVIEWS, REPLY DRAFTS, TONE, TEMPLATES, RATING SNAPSHOTS
-- ELI5: google_reviews is our copy of the business's own reviews (from
-- the Business Profile API). reply_drafts are Claude's suggestions that
-- the owner approves. tone_profiles teach Claude how the owner writes.
-- ---------------------------------------------------------------------
create table public.google_reviews (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  location_id uuid not null references public.locations (id) on delete cascade,
  review_name text not null unique,
  star_rating smallint not null check (star_rating between 1 and 5),
  comment text,
  reviewer_name text,
  reviewer_photo_url text,
  is_anonymous boolean not null default false,
  create_time timestamptz not null,
  update_time timestamptz not null,
  reply_comment text,
  reply_update_time timestamptz,
  first_seen_at timestamptz not null default now(),
  removed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index google_reviews_ws_idx on public.google_reviews (workspace_id, create_time desc);
create index google_reviews_location_idx on public.google_reviews (location_id, create_time desc);
create index google_reviews_unreplied_idx on public.google_reviews (location_id) where reply_comment is null and removed_at is null;
create trigger google_reviews_updated_at before update on public.google_reviews
  for each row execute function public.set_updated_at();

create table public.reply_drafts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  location_id uuid not null references public.locations (id) on delete cascade,
  review_id uuid references public.google_reviews (id) on delete cascade,
  source public.draft_source not null default 'ai',
  status public.draft_status not null default 'generating',
  pasted_review text check (pasted_review is null or char_length(pasted_review) <= 4000),
  pasted_stars smallint check (pasted_stars is null or pasted_stars between 1 and 5),
  instruction text check (instruction is null or char_length(instruction) <= 200),
  body text check (body is null or char_length(body) <= 1500),
  needs_attention boolean not null default false,
  attention_reason text,
  check_warnings text[] not null default '{}',
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  cost_micros bigint not null default 0,
  approved_by uuid references auth.users (id) on delete set null,
  approved_at timestamptz,
  posted_at timestamptz,
  error text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (review_id is not null or pasted_review is not null)
);
create index reply_drafts_ws_idx on public.reply_drafts (workspace_id, created_at desc);
create index reply_drafts_location_idx on public.reply_drafts (location_id);
create index reply_drafts_review_idx on public.reply_drafts (review_id);
create index reply_drafts_approved_by_idx on public.reply_drafts (approved_by);
create index reply_drafts_created_by_idx on public.reply_drafts (created_by);
-- Only one draft per review can be on its way to Google at a time.
create unique index reply_drafts_one_posting_uidx on public.reply_drafts (review_id) where status = 'posting';
create trigger reply_drafts_updated_at before update on public.reply_drafts
  for each row execute function public.set_updated_at();

create table public.tone_profiles (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  location_id uuid references public.locations (id) on delete cascade,
  voice_notes text not null default 'Warm, short and professional. Plain words. No exclamation marks in replies to complaints.'
    check (char_length(voice_notes) <= 600),
  sign_off text not null default '' check (char_length(sign_off) <= 80),
  contact_line text not null default '' check (char_length(contact_line) <= 160),
  sample_replies text[] not null default '{}' check (cardinality(sample_replies) <= 5),
  avoid_phrases text[] not null default '{}' check (cardinality(avoid_phrases) <= 12),
  updated_at timestamptz not null default now()
);
create unique index tone_profiles_scope_uidx on public.tone_profiles
  (workspace_id, coalesce(location_id, '00000000-0000-0000-0000-000000000000'::uuid));
create index tone_profiles_location_idx on public.tone_profiles (location_id);
create trigger tone_profiles_updated_at before update on public.tone_profiles
  for each row execute function public.set_updated_at();

create table public.message_templates (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  location_id uuid references public.locations (id) on delete cascade,
  channel public.message_channel not null,
  kind public.link_kind not null,
  subject text check (subject is null or char_length(subject) <= 120),
  body text not null check (char_length(body) between 10 and 1200),
  updated_at timestamptz not null default now()
);
create unique index message_templates_scope_uidx on public.message_templates
  (workspace_id, coalesce(location_id, '00000000-0000-0000-0000-000000000000'::uuid), channel, kind);
create index message_templates_location_idx on public.message_templates (location_id);
create trigger message_templates_updated_at before update on public.message_templates
  for each row execute function public.set_updated_at();

create table public.rating_snapshots (
  id bigint generated always as identity primary key,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  location_id uuid not null references public.locations (id) on delete cascade,
  snapshot_date date not null,
  average_rating numeric(3, 2) not null check (average_rating between 0 and 5),
  total_review_count integer not null check (total_review_count >= 0),
  unique (location_id, snapshot_date)
);
create index rating_snapshots_ws_idx on public.rating_snapshots (workspace_id, snapshot_date);

-- ---------------------------------------------------------------------
-- 13. NOTIFICATIONS, JOBS, USAGE LEDGER, EMAIL LOG, RATE LIMITS
-- ELI5: jobs is the to-do list for background work. usage_ledger is the
-- meter: every text, email and AI draft writes a line here, so nobody
-- can spend more than their plan allows.
-- ---------------------------------------------------------------------
create table public.notification_prefs (
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  on_feedback boolean not null default true,
  on_low_review boolean not null default true,
  daily_digest boolean not null default true,
  weekly_report boolean not null default false,
  primary key (workspace_id, user_id)
);
create index notification_prefs_user_idx on public.notification_prefs (user_id);

create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
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
  request_id uuid references public.review_requests (id) on delete set null,
  kind text not null,
  dedupe_key text unique,
  to_email text not null,
  resend_id text,
  status text not null default 'queued',
  created_at timestamptz not null default now()
);
create index email_log_ws_idx on public.email_log (workspace_id, created_at desc);
create index email_log_request_idx on public.email_log (request_id);
create index email_log_resend_idx on public.email_log (resend_id);

create table public.email_suppressions (
  email text primary key,
  reason text not null,
  created_at timestamptz not null default now()
);

create table public.rate_limits (
  key text not null,
  window_start timestamptz not null,
  hits integer not null default 0,
  primary key (key, window_start)
);

-- ---------------------------------------------------------------------
-- 14. ACCESS AND LIMIT FUNCTIONS
-- ELI5: has_active_access answers "is this workspace paid up (or in its
-- trial)?". plan_limits answers "how much can it send this month?".
-- Edge functions ask both before spending any money.
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
returns table (plan text, locations integer, requests integer, ai_drafts integer, seats integer,
               white_label boolean, weekly_report boolean, trialing boolean)
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
    plan := 'agency'; locations := 10; requests := 1000; ai_drafts := 300; seats := 10;
    white_label := true; weekly_report := true;
  elsif v_plan = 'growth' then
    plan := 'growth'; locations := 3; requests := 500; ai_drafts := 120; seats := 5;
    white_label := false; weekly_report := false;
  else
    plan := 'solo'; locations := 1; requests := 200; ai_drafts := 30; seats := 2;
    white_label := false; weekly_report := false;
  end if;

  -- A 7 day trial can send at most 50 requests and 10 AI drafts.
  trialing := coalesce(v_status = 'trialing', false);
  if trialing then
    requests := least(requests, 50);
    ai_drafts := least(ai_drafts, 10);
  end if;

  select * into o from public.workspace_limit_overrides where workspace_id = ws;
  if found then
    requests := coalesce(o.requests, requests);
    ai_drafts := coalesce(o.ai_drafts, ai_drafts);
    locations := coalesce(o.locations, locations);
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

-- What the Billing page and the sidebar meter read (members only).
create or replace function public.my_usage(ws uuid)
returns table (plan text, requests_used numeric, requests_limit integer, drafts_used numeric,
               drafts_limit integer, locations_used integer, locations_limit integer, trialing boolean)
language plpgsql stable security definer set search_path = '' as $$
declare l record;
begin
  if not public.is_workspace_member(ws) then raise exception 'not_member'; end if;
  select * into l from public.plan_limits(ws);
  plan := l.plan;
  requests_used := public.usage_this_month(ws, 'review_requests');
  requests_limit := l.requests;
  drafts_used := public.usage_this_month(ws, 'ai_drafts');
  drafts_limit := l.ai_drafts;
  select count(*)::integer into locations_used from public.locations
  where workspace_id = ws and archived_at is null;
  locations_limit := l.locations;
  trialing := l.trialing;
  return next;
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
-- 15. WORKSPACE AND INVITE FUNCTIONS (called from the app)
-- ELI5: creating a workspace makes you its owner, adds the default
-- message wording and tone in one go, so nothing is ever half set up.
-- ---------------------------------------------------------------------
create or replace function public.create_workspace(p_name text, p_kind public.workspace_kind, p_business_type text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := (select auth.uid());
  v_ws uuid;
begin
  if v_user is null then raise exception 'not_authenticated'; end if;
  insert into public.workspaces (name, kind, business_type, owner_id)
  values (trim(p_name), coalesce(p_kind, 'business'), p_business_type, v_user)
  returning id into v_ws;
  insert into public.workspace_members (workspace_id, user_id, role) values (v_ws, v_user, 'owner');
  insert into public.notification_prefs (workspace_id, user_id) values (v_ws, v_user);
  insert into public.tone_profiles (workspace_id) values (v_ws);
  insert into public.message_templates (workspace_id, channel, kind, subject, body) values
    (v_ws, 'sms', 'initial', null,
     'Hi {first_name}, thanks for visiting {business} today. How did we do? {link} Reply STOP to opt out'),
    (v_ws, 'sms', 'reminder', null,
     '{business}: a quick 2-tap question about your visit, if you have a moment. {link}'),
    (v_ws, 'email', 'initial', 'How was your visit to {business}?',
     'Hi {first_name}, thank you for choosing {business}. How did we do? It takes two taps. {link}'),
    (v_ws, 'email', 'reminder', 'A quick question from {business}',
     'Hi {first_name}, if you have a moment, we would love to hear how your visit went. {link}');
  update public.profiles set current_workspace_id = v_ws where id = v_user;
  return v_ws;
end;
$$;

create or replace function public.create_invite(p_ws uuid, p_email text, p_role public.workspace_role)
returns text language plpgsql security definer set search_path = '' as $$
declare
  v_token text := encode(extensions.gen_random_bytes(32), 'hex');
  v_seats integer;
  v_used integer;
begin
  if not public.has_workspace_role(p_ws, array['owner', 'admin']::public.workspace_role[]) then
    raise exception 'forbidden';
  end if;
  if p_role = 'owner' then raise exception 'cannot_invite_owner'; end if;
  select seats into v_seats from public.plan_limits(p_ws);
  select count(*) into v_used from public.workspace_members where workspace_id = p_ws;
  select v_used + count(*) into v_used from public.invites
  where workspace_id = p_ws and accepted_at is null and expires_at > now();
  if v_used >= v_seats then raise exception 'seat_limit'; end if;
  insert into public.invites (workspace_id, email, role, token_hash, created_by)
  values (p_ws, lower(trim(p_email)), p_role, encode(extensions.digest(v_token, 'sha256'), 'hex'), (select auth.uid()));
  return v_token; -- shown once, emailed by the app; only the hash is stored
end;
$$;

create or replace function public.accept_invite(p_token text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := (select auth.uid());
  v_inv public.invites;
  v_email text;
  v_seats integer;
  v_used integer;
begin
  if v_user is null then raise exception 'not_authenticated'; end if;
  select * into v_inv from public.invites
  where token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex')
    and accepted_at is null and expires_at > now()
  for update;
  if not found then raise exception 'invalid_invite'; end if;
  select email into v_email from public.profiles where id = v_user;
  if lower(v_email) <> v_inv.email then raise exception 'wrong_email'; end if;
  select seats into v_seats from public.plan_limits(v_inv.workspace_id);
  select count(*) into v_used from public.workspace_members where workspace_id = v_inv.workspace_id;
  if v_used >= v_seats then raise exception 'seat_limit'; end if;
  insert into public.workspace_members (workspace_id, user_id, role)
  values (v_inv.workspace_id, v_user, v_inv.role) on conflict do nothing;
  insert into public.notification_prefs (workspace_id, user_id)
  values (v_inv.workspace_id, v_user) on conflict do nothing;
  update public.invites set accepted_at = now() where id = v_inv.id;
  update public.profiles set current_workspace_id = v_inv.workspace_id where id = v_user;
  return v_inv.workspace_id;
end;
$$;

-- Cancel a scheduled request (the only change members make to requests).
create or replace function public.cancel_request(p_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_ws uuid;
begin
  select workspace_id into v_ws from public.review_requests where id = p_id;
  if v_ws is null or not public.is_workspace_member(v_ws) then raise exception 'not_found'; end if;
  update public.review_requests set status = 'cancelled' where id = p_id and status = 'scheduled';
end;
$$;

-- ---------------------------------------------------------------------
-- 16. INTAKE: SCHEDULING A REVIEW REQUEST
-- ELI5: this is where Google's rule lives in code. Every finished visit
-- gets asked. The ONLY reasons not to ask are facts: no consent and no
-- email, opted out, asked in the last 90 days, a bad number, an old
-- visit, or the plan is full. There is no rating, spend or "happy
-- customer" filter, and there must never be one.
-- ---------------------------------------------------------------------
create or replace function public.compute_send_at(p_location uuid, p_visit timestamptz)
returns timestamptz language plpgsql stable security definer set search_path = '' as $$
declare
  l public.locations;
  v_at timestamptz;
  v_local timestamp;
begin
  select * into l from public.locations where id = p_location;
  v_at := greatest(p_visit + make_interval(mins => l.send_delay_minutes), now());
  v_local := v_at at time zone l.timezone;
  if v_local::time < l.send_window_start then
    v_local := date_trunc('day', v_local) + l.send_window_start;
  elsif v_local::time > l.send_window_end then
    v_local := date_trunc('day', v_local) + interval '1 day' + l.send_window_start;
  end if;
  if not l.send_on_sundays and extract(dow from v_local) = 0 then
    v_local := date_trunc('day', v_local) + interval '1 day' + l.send_window_start;
  end if;
  return v_local at time zone l.timezone;
end;
$$;

create or replace function public.enqueue_review_request(
  p_location uuid, p_first_name text, p_last_name text, p_phone text, p_email text,
  p_sms_consent boolean, p_visit_at timestamptz, p_channel text, p_source public.request_source,
  p_idempotency_key text, p_external_ref text, p_created_by uuid, p_csv_import uuid)
returns table (request_id uuid, status public.request_status, send_at timestamptz, skip_reason text, duplicate boolean)
language plpgsql security definer set search_path = '' as $$
declare
  l public.locations;
  v_sender_ok boolean := false;
  v_contact public.contacts;
  v_phone text := nullif(trim(p_phone), '');
  v_email text := nullif(lower(trim(p_email)), '');
  v_phone_ok boolean;
  v_sms_ok boolean;
  v_email_ok boolean;
  v_channel public.request_channel;
  v_skip text;
  v_id uuid;
  v_send timestamptz;
  v_visit timestamptz := coalesce(p_visit_at, now());
begin
  -- 1. Same idempotency key: return the existing row (webhook retries, double Zaps).
  select r.id, r.status, r.send_at, r.skip_reason into request_id, status, send_at, skip_reason
  from public.review_requests r where r.idempotency_key = p_idempotency_key;
  if found then duplicate := true; return next; return; end if;
  duplicate := false;

  select * into l from public.locations where id = p_location and archived_at is null;
  if not found then raise exception 'location_not_found'; end if;
  select exists (select 1 from public.sms_senders s where s.id = l.sms_sender_id and s.status = 'approved')
    into v_sender_ok;

  -- 2. Upsert the contact (by phone, else by email) for this location.
  if v_phone is not null then
    select * into v_contact from public.contacts c where c.location_id = l.id and c.phone_e164 = v_phone;
  end if;
  if v_contact.id is null and v_email is not null then
    select * into v_contact from public.contacts c where c.location_id = l.id and c.email = v_email;
  end if;
  if v_contact.id is null then
    insert into public.contacts (workspace_id, location_id, full_name, first_name, phone_e164, email,
      sms_consent, consent_source, external_ref)
    values (l.workspace_id, l.id, trim(coalesce(p_first_name, '') || ' ' || coalesce(p_last_name, '')),
      coalesce(p_first_name, ''),
      case when v_phone ~ '^[+][1-9][0-9]{6,14}$' then v_phone end,
      case when position('@' in coalesce(v_email, '')) > 1 then v_email end,
      coalesce(p_sms_consent, false), case when p_sms_consent then p_source::text end, p_external_ref)
    returning * into v_contact;
  else
    update public.contacts c set
      first_name = coalesce(nullif(p_first_name, ''), c.first_name),
      full_name = coalesce(nullif(trim(coalesce(p_first_name, '') || ' ' || coalesce(p_last_name, '')), ''), c.full_name),
      email = coalesce(c.email, case when position('@' in coalesce(v_email, '')) > 1 then v_email end),
      sms_consent = c.sms_consent or coalesce(p_sms_consent, false),
      consent_source = case when not c.sms_consent and p_sms_consent then p_source::text else c.consent_source end
    where c.id = v_contact.id
    returning * into v_contact;
  end if;

  -- 3. Which channels are possible? (facts only)
  v_phone_ok := v_contact.phone_e164 ~ '^[+]1[2-9][0-9]{9}$' and v_contact.phone_invalid_at is null;
  v_sms_ok := coalesce(v_phone_ok, false) and v_contact.sms_consent and v_contact.sms_opted_out_at is null and v_sender_ok;
  v_email_ok := v_contact.email is not null and v_contact.email_opted_out_at is null
    and not exists (select 1 from public.email_suppressions s where s.email = v_contact.email);

  if p_channel = 'sms' then
    v_channel := case when v_sms_ok then 'sms' end;
  elsif p_channel = 'email' then
    v_channel := case when v_email_ok then 'email' end;
  elsif p_channel = 'both' then
    v_channel := case when v_sms_ok and v_email_ok then 'both' when v_sms_ok then 'sms' when v_email_ok then 'email' end;
  else -- auto
    v_channel := case when v_sms_ok then 'sms' when v_email_ok then 'email' end;
  end if;

  -- 4. Factual skip reasons, in a fixed order.
  if l.review_url is null then
    v_skip := 'no_review_link';
  elsif v_visit < now() - interval '7 days' then
    v_skip := 'stale_visit';
  elsif p_source <> 'test' and exists (
    select 1 from public.review_requests r
    where r.contact_id = v_contact.id and r.location_id = l.id
      and r.status in ('scheduled', 'sending', 'sent')
      and r.created_at > now() - interval '90 days'
  ) then
    v_skip := 'asked_recently';
  elsif v_channel is null then
    v_skip := case
      when v_contact.sms_opted_out_at is not null and not v_email_ok then 'opted_out'
      when v_contact.email is not null and not v_email_ok and v_contact.phone_e164 is null then 'suppressed_email'
      when v_phone is not null and not coalesce(v_phone_ok, false) and v_contact.email is null then 'invalid_phone'
      when coalesce(v_phone_ok, false) and v_contact.sms_consent and not v_sender_ok and not v_email_ok then 'sms_not_ready'
      else 'no_channel' end;
  end if;

  -- Test sends (to yourself, from onboarding) go now; real visits wait for the delay and sending hours.
  v_send := case when p_source = 'test' then now() else public.compute_send_at(l.id, v_visit) end;

  insert into public.review_requests (workspace_id, location_id, contact_id, csv_import_id, source, channel,
    status, skip_reason, visit_at, send_at, idempotency_key, created_by)
  values (l.workspace_id, l.id, v_contact.id, p_csv_import, p_source, v_channel,
    case when v_skip is null then 'scheduled' else 'skipped' end::public.request_status,
    v_skip, v_visit, v_send, p_idempotency_key, p_created_by)
  on conflict (idempotency_key) do nothing
  returning id into v_id;

  if v_id is null then
    -- Lost a race with an identical call: return the winner.
    select r.id, r.status, r.send_at, r.skip_reason into request_id, status, send_at, skip_reason
    from public.review_requests r where r.idempotency_key = p_idempotency_key;
    duplicate := true; return next; return;
  end if;

  if v_skip is null then
    update public.contacts set last_requested_at = now() where id = v_contact.id;
  end if;

  request_id := v_id;
  status := case when v_skip is null then 'scheduled' else 'skipped' end::public.request_status;
  send_at := v_send;
  skip_reason := v_skip;
  return next;
end;
$$;

-- ---------------------------------------------------------------------
-- 17. WORKER FUNCTIONS (edge functions only, secret key)
-- ELI5: claim_due_requests hands the send worker a batch and marks them
-- "mine" so two workers never send the same text twice. The reminder
-- claim looks only at "never opened", never at the rating (rule R5).
-- ---------------------------------------------------------------------
create or replace function public.claim_due_requests(p_limit integer)
returns setof public.review_requests language sql security definer set search_path = '' as $$
  update public.review_requests r set status = 'sending', locked_at = now(), attempts = r.attempts + 1
  where r.id in (
    select id from public.review_requests
    where status = 'scheduled' and send_at <= now()
    order by send_at
    limit p_limit
    for update skip locked
  )
  returning r.*;
$$;

create or replace function public.release_stuck_requests()
returns integer language plpgsql security definer set search_path = '' as $$
declare v_count integer;
begin
  update public.review_requests set status = 'scheduled', locked_at = null
  where status = 'sending' and locked_at < now() - interval '10 minutes' and sent_at is null;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

create or replace function public.claim_reminders(p_limit integer)
returns setof public.review_requests language sql security definer set search_path = '' as $$
  update public.review_requests r set reminder_claimed_at = now()
  where r.id in (
    select q.id from public.review_requests q
    join public.locations l on l.id = q.location_id
    where q.status = 'sent'
      and q.sent_at <= now() - interval '48 hours'
      and q.sent_at > now() - interval '7 days'
      and q.opened_at is null
      and q.reminder_claimed_at is null
      and l.reminder_enabled
      and l.archived_at is null
    order by q.sent_at
    limit p_limit
    for update of q skip locked
  )
  returning r.*;
$$;

create or replace function public.claim_jobs(p_kinds public.job_kind[], p_limit integer)
returns setof public.jobs language sql security definer set search_path = '' as $$
  update public.jobs j set status = 'running', locked_at = now(), attempts = j.attempts + 1
  where j.id in (
    select id from public.jobs
    where status = 'queued' and run_after <= now() and kind = any (p_kinds)
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

-- Records private feedback once and says whether the owner must be alerted.
create or replace function public.record_feedback(p_request uuid, p_body text, p_wants_reply boolean, p_via text)
returns table (feedback_id uuid, alert boolean) language plpgsql security definer set search_path = '' as $$
declare
  r public.review_requests;
  v_threshold integer;
begin
  select * into r from public.review_requests where id = p_request for update;
  if not found then raise exception 'not_found'; end if;
  select alert_threshold into v_threshold from public.locations where id = r.location_id;
  insert into public.feedback (workspace_id, location_id, request_id, rating, body, wants_reply, via)
  values (r.workspace_id, r.location_id, r.id, r.rating, left(p_body, 2000), coalesce(p_wants_reply, true),
          coalesce(p_via, 'page'))
  on conflict (request_id) do nothing
  returning id into feedback_id;
  if feedback_id is null then
    alert := false; return next; return;
  end if;
  update public.review_requests set feedback_at = now() where id = r.id;
  alert := r.rating is null or r.rating <= v_threshold;
  if alert then
    insert into public.jobs (workspace_id, kind, ref_id, idempotency_key)
    values (r.workspace_id, 'feedback_alert', feedback_id, 'fb:' || feedback_id)
    on conflict (idempotency_key) do nothing;
  end if;
  return next;
end;
$$;

-- Vault helpers: store a secret and read it back, for edge functions only.
create or replace function public.store_secret(p_name text, p_secret text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  select id into v_id from vault.secrets where name = p_name;
  if v_id is null then
    select vault.create_secret(p_secret, p_name) into v_id;
  else
    perform vault.update_secret(v_id, p_secret);
  end if;
  return v_id;
end;
$$;

create or replace function public.read_secret(p_id uuid)
returns text language sql stable security definer set search_path = '' as $$
  select decrypted_secret from vault.decrypted_secrets where id = p_id;
$$;

-- Saves a Google connection (called by the OAuth callback route with the secret key).
create or replace function public.store_google_connection(p_ws uuid, p_user uuid, p_email text, p_refresh_token text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_conn uuid;
  v_secret uuid;
begin
  insert into public.google_connections (workspace_id, google_email, connected_by, status, failures, last_error)
  values (p_ws, lower(p_email), p_user, 'active', 0, null)
  on conflict (workspace_id, google_email) do update
    set status = 'active', failures = 0, last_error = null, connected_by = excluded.connected_by
  returning id into v_conn;
  v_secret := public.store_secret('google_refresh:' || v_conn::text, p_refresh_token);
  update public.google_connections set refresh_token_secret_id = v_secret where id = v_conn;
  return v_conn;
end;
$$;

-- Workers, webhooks and route handlers only. The browser can never call these.
revoke execute on function public.enqueue_review_request(uuid, text, text, text, text, boolean, timestamptz, text,
  public.request_source, text, text, uuid, uuid) from public, anon, authenticated;
revoke execute on function public.compute_send_at(uuid, timestamptz) from public, anon, authenticated;
revoke execute on function public.claim_due_requests(integer) from public, anon, authenticated;
revoke execute on function public.release_stuck_requests() from public, anon, authenticated;
revoke execute on function public.claim_reminders(integer) from public, anon, authenticated;
revoke execute on function public.claim_jobs(public.job_kind[], integer) from public, anon, authenticated;
revoke execute on function public.release_stuck_jobs() from public, anon, authenticated;
revoke execute on function public.record_feedback(uuid, text, boolean, text) from public, anon, authenticated;
revoke execute on function public.store_secret(text, text) from public, anon, authenticated;
revoke execute on function public.read_secret(uuid) from public, anon, authenticated;
revoke execute on function public.store_google_connection(uuid, uuid, text, text) from public, anon, authenticated;
revoke execute on function public.try_rate_limit(text, integer, integer) from public, anon, authenticated;
revoke execute on function public.plan_limits(uuid) from public, anon, authenticated;
revoke execute on function public.usage_this_month(uuid, public.usage_kind) from public, anon, authenticated;
revoke execute on function public.has_active_access(uuid) from public, anon;
revoke execute on function public.my_usage(uuid) from public, anon;
revoke execute on function public.create_workspace(text, public.workspace_kind, text) from public, anon;
revoke execute on function public.create_invite(uuid, text, public.workspace_role) from public, anon;
revoke execute on function public.accept_invite(text) from public, anon;
revoke execute on function public.cancel_request(uuid) from public, anon;

-- ---------------------------------------------------------------------
-- 18. GUARD TRIGGERS (the rules the browser cannot break)
-- ELI5: even if someone pokes the database directly, these stop them:
-- no incentive wording in messages (Google and FTC rules), every text
-- has the link and the business name and fits in one SMS, and nobody
-- adds more locations or people than the plan allows.
-- ---------------------------------------------------------------------
create or replace function public.check_template()
returns trigger language plpgsql set search_path = '' as $$
declare
  v_text text := lower(coalesce(new.subject, '') || ' ' || new.body);
  v_len integer;
begin
  if position('{link}' in new.body) = 0 then
    raise exception 'template_missing_link' using hint = 'Every message must contain {link}.';
  end if;
  if v_text ~ '[[:<:]](discount|free|gift|voucher|coupon|prize|draw|raffle|win|reward|cash|credit|giveaway)s?[[:>:]]'
     or v_text ~ '[0-9] ?%' or v_text like '%percent off%' then
    raise exception 'template_incentive'
      using hint = 'Templates cannot offer anything in exchange for a review. Google and the FTC do not allow it.';
  end if;
  if new.channel = 'sms' then
    if position('{business}' in new.body) = 0 then
      raise exception 'template_missing_business' using hint = 'Texts must name the business with {business}.';
    end if;
    if new.kind = 'initial' and position('stop' in lower(new.body)) = 0 then
      raise exception 'template_missing_stop' using hint = 'The first text must say how to opt out (Reply STOP to opt out).';
    end if;
    -- Plain characters only (no emoji, no curly quotes) so the text stays in the cheap SMS alphabet.
    if replace(new.body, chr(10), '') ~ '[^ -~]' then
      raise exception 'template_characters' using hint = 'Use plain letters and punctuation only (no emoji or curly quotes).';
    end if;
    -- Worst case length: 24 char business name, 12 char first name, 24 char link.
    v_len := char_length(replace(replace(replace(new.body, '{link}', repeat('x', 24)),
      '{business}', repeat('x', 24)), '{first_name}', repeat('x', 12)));
    if v_len > 160 then
      raise exception 'template_too_long' using hint = 'This text could be 2 SMS segments. Keep it to 160 characters.';
    end if;
  end if;
  return new;
end;
$$;
create trigger message_templates_check before insert or update on public.message_templates
  for each row execute function public.check_template();

create or replace function public.enforce_location_limit()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_limit integer;
  v_used integer;
begin
  select locations into v_limit from public.plan_limits(new.workspace_id);
  select count(*) into v_used from public.locations where workspace_id = new.workspace_id and archived_at is null;
  if v_used >= v_limit then
    raise exception 'location_limit' using hint = 'Your plan allows ' || v_limit || ' locations.';
  end if;
  return new;
end;
$$;
create trigger locations_limit before insert on public.locations
  for each row execute function public.enforce_location_limit();

create or replace function public.enforce_seat_limit()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_limit integer;
  v_used integer;
begin
  select seats into v_limit from public.plan_limits(new.workspace_id);
  select count(*) into v_used from public.workspace_members where workspace_id = new.workspace_id;
  if new.role <> 'owner' and v_used >= v_limit then
    raise exception 'seat_limit';
  end if;
  return new;
end;
$$;
create trigger workspace_members_limit before insert on public.workspace_members
  for each row execute function public.enforce_seat_limit();

-- The owner row can never be demoted or removed by anyone but a support action.
create or replace function public.protect_owner()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  -- Deleting the whole workspace (or the user) cascades here: allow that.
  if tg_op = 'DELETE' and not exists (select 1 from public.workspaces w where w.id = old.workspace_id) then
    return old;
  end if;
  if old.role = 'owner' and (tg_op = 'DELETE' or new.role <> 'owner') then
    raise exception 'cannot_change_owner';
  end if;
  if tg_op = 'UPDATE' and new.role = 'owner' and old.role <> 'owner' then
    raise exception 'cannot_make_owner';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;
create trigger workspace_members_protect_owner before update or delete on public.workspace_members
  for each row execute function public.protect_owner();

-- Feedback: stamp resolved_at when a member resolves it.
create or replace function public.stamp_feedback_resolved()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.status = 'resolved' and old.status <> 'resolved' then new.resolved_at := now(); end if;
  if new.status <> 'resolved' then new.resolved_at := null; end if;
  return new;
end;
$$;
create trigger feedback_resolved before update on public.feedback
  for each row execute function public.stamp_feedback_resolved();

-- Locations: the review link must be a Google link (or empty).
create or replace function public.check_review_url()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.review_url is not null and not (
       new.review_url like 'https://g.page/%'
    or new.review_url like 'https://search.google.com/local/writereview%'
    or new.review_url like 'https://www.google.com/%'
    or new.review_url like 'https://maps.app.goo.gl/%'
    or new.review_url like 'https://g.co/kgs/%') then
    raise exception 'review_url_not_google' using hint = 'Paste the review link from your Google Business Profile.';
  end if;
  return new;
end;
$$;
create trigger locations_review_url before insert or update of review_url on public.locations
  for each row execute function public.check_review_url();

-- ---------------------------------------------------------------------
-- 19. ROW LEVEL SECURITY: switch it on for every table
-- ELI5: RLS is a bouncer on every table. With it on and no policy,
-- nobody gets in from the browser. Each policy below opens exactly one
-- door (select, insert, update or delete) for exactly the right people.
-- Edge functions use the secret key, which skips the bouncer, so they
-- must check membership themselves (they do, in _shared/auth.ts).
-- ---------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.invites enable row level security;
alter table public.subscriptions enable row level security;
alter table public.stripe_events enable row level security;
alter table public.plan_prices enable row level security;
alter table public.workspace_limit_overrides enable row level security;
alter table public.sms_senders enable row level security;
alter table public.google_connections enable row level security;
alter table public.locations enable row level security;
alter table public.intake_keys enable row level security;
alter table public.contacts enable row level security;
alter table public.csv_imports enable row level security;
alter table public.review_requests enable row level security;
alter table public.request_links enable row level security;
alter table public.message_events enable row level security;
alter table public.feedback enable row level security;
alter table public.google_reviews enable row level security;
alter table public.reply_drafts enable row level security;
alter table public.tone_profiles enable row level security;
alter table public.message_templates enable row level security;
alter table public.rating_snapshots enable row level security;
alter table public.notification_prefs enable row level security;
alter table public.jobs enable row level security;
alter table public.usage_ledger enable row level security;
alter table public.email_log enable row level security;
alter table public.email_suppressions enable row level security;
alter table public.rate_limits enable row level security;

-- profiles: you see and edit only yourself (and teammates' names).
create policy "profiles select self or teammate" on public.profiles for select to authenticated
  using (id = (select auth.uid()) or exists (
    select 1 from public.workspace_members a join public.workspace_members b on a.workspace_id = b.workspace_id
    where a.user_id = (select auth.uid()) and b.user_id = profiles.id));
create policy "profiles update self" on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- workspaces: members read; owner/admin rename; owner deletes. Created only by create_workspace().
create policy "workspaces select member" on public.workspaces for select to authenticated
  using (public.is_workspace_member(id));
create policy "workspaces update admin" on public.workspaces for update to authenticated
  using (public.has_workspace_role(id, array['owner', 'admin']::public.workspace_role[]))
  with check (public.has_workspace_role(id, array['owner', 'admin']::public.workspace_role[]));
create policy "workspaces delete owner" on public.workspaces for delete to authenticated
  using (owner_id = (select auth.uid()));

-- members: members read the team; owner changes roles; owner/admin remove; anyone can leave.
create policy "members select member" on public.workspace_members for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy "members update owner" on public.workspace_members for update to authenticated
  using (public.has_workspace_role(workspace_id, array['owner']::public.workspace_role[]))
  with check (public.has_workspace_role(workspace_id, array['owner']::public.workspace_role[]));
create policy "members delete admin or self" on public.workspace_members for delete to authenticated
  using (user_id = (select auth.uid())
    or public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]));

-- invites: owner/admin read and revoke. Created by create_invite().
create policy "invites select admin" on public.invites for select to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]));
create policy "invites delete admin" on public.invites for delete to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]));

-- billing: you read your own subscription. Prices are public to logged-in users.
create policy "subscriptions select own" on public.subscriptions for select to authenticated
  using (user_id = (select auth.uid()));
create policy "plan prices select" on public.plan_prices for select to authenticated using (true);
create policy "limit overrides select member" on public.workspace_limit_overrides for select to authenticated
  using (public.is_workspace_member(workspace_id));
-- stripe_events: no policies on purpose (webhook only).

-- sms_senders: members read; owner/admin create and edit the form fields only (column grants below).
create policy "senders select member" on public.sms_senders for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy "senders insert admin" on public.sms_senders for insert to authenticated
  with check (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[])
    and status = 'draft' and twilio_subaccount_sid is null);
create policy "senders update admin" on public.sms_senders for update to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[])
    and status in ('draft', 'rejected'))
  with check (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]));
create policy "senders delete owner" on public.sms_senders for delete to authenticated
  using (public.has_workspace_role(workspace_id, array['owner']::public.workspace_role[]) and status = 'draft');

-- google_connections: members read (status only matters). Written by the OAuth route.
create policy "google conn select member" on public.google_connections for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy "google conn delete admin" on public.google_connections for delete to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]));

-- locations: members read; owner/admin add and edit; owner deletes.
create policy "locations select member" on public.locations for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy "locations insert admin" on public.locations for insert to authenticated
  with check (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]));
create policy "locations update admin" on public.locations for update to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]))
  with check (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]));
create policy "locations delete owner" on public.locations for delete to authenticated
  using (public.has_workspace_role(workspace_id, array['owner']::public.workspace_role[]));

-- intake_keys: owner/admin read and revoke (via update of revoked_at). Created by the route handler.
create policy "intake keys select admin" on public.intake_keys for select to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]));
create policy "intake keys update admin" on public.intake_keys for update to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]))
  with check (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]));

-- contacts: members read and fix names; owner/admin delete (customer asked to be forgotten).
create policy "contacts select member" on public.contacts for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy "contacts update member" on public.contacts for update to authenticated
  using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id));
create policy "contacts delete admin" on public.contacts for delete to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]));

-- csv_imports: members read and create (then call hl-csv-import).
create policy "imports select member" on public.csv_imports for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy "imports insert member" on public.csv_imports for insert to authenticated
  with check (public.is_workspace_member(workspace_id) and created_by = (select auth.uid()) and status = 'uploaded');

-- review_requests, request_links, message_events: read only for members.
create policy "requests select member" on public.review_requests for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy "links select member" on public.request_links for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy "events select member" on public.message_events for select to authenticated
  using (public.is_workspace_member(workspace_id));

-- feedback: members read and work it; owner deletes on the customer's request.
create policy "feedback select member" on public.feedback for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy "feedback update member" on public.feedback for update to authenticated
  using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id));
create policy "feedback delete owner" on public.feedback for delete to authenticated
  using (public.has_workspace_role(workspace_id, array['owner']::public.workspace_role[]));

-- google_reviews, rating_snapshots: read only.
create policy "reviews select member" on public.google_reviews for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy "snapshots select member" on public.rating_snapshots for select to authenticated
  using (public.is_workspace_member(workspace_id));

-- reply_drafts: members read, write manual drafts, edit text, discard. Posting is the edge function's job.
create policy "drafts select member" on public.reply_drafts for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy "drafts insert member manual" on public.reply_drafts for insert to authenticated
  with check (public.is_workspace_member(workspace_id) and source = 'manual' and status = 'ready'
    and created_by = (select auth.uid()));
create policy "drafts update member" on public.reply_drafts for update to authenticated
  using (public.is_workspace_member(workspace_id) and status in ('ready', 'failed'))
  with check (public.is_workspace_member(workspace_id) and status in ('ready', 'discarded'));

-- tone and templates: members read; owner/admin write.
create policy "tone select member" on public.tone_profiles for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy "tone insert admin" on public.tone_profiles for insert to authenticated
  with check (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]));
create policy "tone update admin" on public.tone_profiles for update to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]))
  with check (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]));
create policy "tone delete admin" on public.tone_profiles for delete to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]) and location_id is not null);

create policy "templates select member" on public.message_templates for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy "templates insert admin" on public.message_templates for insert to authenticated
  with check (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]));
create policy "templates update admin" on public.message_templates for update to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]))
  with check (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]));
create policy "templates delete admin" on public.message_templates for delete to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]) and location_id is not null);

-- notification_prefs: your own row only.
create policy "prefs select own" on public.notification_prefs for select to authenticated
  using (user_id = (select auth.uid()));
create policy "prefs insert own" on public.notification_prefs for insert to authenticated
  with check (user_id = (select auth.uid()) and public.is_workspace_member(workspace_id));
create policy "prefs update own" on public.notification_prefs for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- usage and email log: members read their workspace (Billing page, request timeline).
create policy "usage select member" on public.usage_ledger for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy "email log select admin" on public.email_log for select to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]));
-- jobs, email_suppressions, rate_limits, stripe_events: no policies on purpose (server only).

-- Column grants: the browser may only change these columns, even where a policy allows the row.
revoke update on public.sms_senders from authenticated;
grant update (legal_business_name, website, registration_number, street, city, region, postal_code, country,
  contact_first_name, contact_last_name, contact_email, contact_phone, opt_in_method, monthly_volume)
  on public.sms_senders to authenticated;
revoke update on public.locations from authenticated;
grant update (name, sms_name, timezone, address, logo_path, review_url, google_mode, send_delay_minutes,
  send_window_start, send_window_end, send_on_sundays, reminder_enabled, alert_threshold, alert_emails,
  report_email, sms_sender_id, archived_at) on public.locations to authenticated;
revoke update on public.contacts from authenticated;
grant update (full_name, first_name) on public.contacts to authenticated;
revoke update on public.feedback from authenticated;
grant update (status, owner_note, assigned_to) on public.feedback to authenticated;
revoke update on public.reply_drafts from authenticated;
grant update (body, status) on public.reply_drafts to authenticated;
revoke update on public.intake_keys from authenticated;
grant update (revoked_at, label) on public.intake_keys to authenticated;
revoke update on public.workspace_members from authenticated;
grant update (role) on public.workspace_members to authenticated;
revoke update on public.profiles from authenticated;
grant update (full_name, current_workspace_id) on public.profiles to authenticated;

-- ---------------------------------------------------------------------
-- 20. DASHBOARD VIEWS (obey the caller's RLS)
-- ELI5: views are saved questions. security_invoker means the view runs
-- as the person asking, so they only ever count their own rows.
-- ---------------------------------------------------------------------
create or replace view public.location_daily_stats with (security_invoker = true) as
select
  r.workspace_id,
  r.location_id,
  (r.sent_at at time zone l.timezone)::date as day,
  count(*) as sent,
  count(*) filter (where r.delivered_at is not null) as delivered,
  count(*) filter (where r.opened_at is not null) as opened,
  count(*) filter (where r.rated_at is not null) as rated,
  round(avg(r.rating)::numeric, 2) as avg_private_rating,
  count(*) filter (where r.google_clicked_at is not null) as clicked_google,
  count(*) filter (where r.feedback_at is not null) as feedback,
  count(*) filter (where r.reminder_sent_at is not null) as reminders
from public.review_requests r
join public.locations l on l.id = r.location_id
where r.sent_at is not null
group by r.workspace_id, r.location_id, (r.sent_at at time zone l.timezone)::date;

create or replace view public.review_daily_stats with (security_invoker = true) as
select
  g.workspace_id,
  g.location_id,
  (g.create_time at time zone l.timezone)::date as day,
  count(*) as new_reviews,
  round(avg(g.star_rating)::numeric, 2) as avg_new_rating,
  count(*) filter (where g.reply_comment is not null) as replied
from public.google_reviews g
join public.locations l on l.id = g.location_id
where g.removed_at is null
group by g.workspace_id, g.location_id, (g.create_time at time zone l.timezone)::date;

grant select on public.location_daily_stats to authenticated;
grant select on public.review_daily_stats to authenticated;

-- ---------------------------------------------------------------------
-- 21. STORAGE BUCKETS + POLICIES
-- ELI5: two folders. csv-imports is private (customer lists) and only
-- members of that workspace can touch it. location-logos is public so
-- the rating page can show the logo, but only members can upload.
-- Files sit under a folder named after the workspace id.
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('csv-imports', 'csv-imports', false, 5242880, array['text/csv', 'application/vnd.ms-excel', 'text/plain']),
  ('location-logos', 'location-logos', true, 1048576, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do nothing;

create policy "csv select member" on storage.objects for select to authenticated
  using (bucket_id = 'csv-imports' and public.is_workspace_member_text((storage.foldername(name))[1]));
create policy "csv insert member" on storage.objects for insert to authenticated
  with check (bucket_id = 'csv-imports' and public.is_workspace_member_text((storage.foldername(name))[1]));
create policy "csv update member" on storage.objects for update to authenticated
  using (bucket_id = 'csv-imports' and public.is_workspace_member_text((storage.foldername(name))[1]))
  with check (bucket_id = 'csv-imports' and public.is_workspace_member_text((storage.foldername(name))[1]));
create policy "csv delete admin" on storage.objects for delete to authenticated
  using (bucket_id = 'csv-imports'
    and public.has_workspace_role_text((storage.foldername(name))[1], array['owner', 'admin']::public.workspace_role[]));

-- Public bucket: anyone can read by URL; writes need owner/admin of the folder's workspace.
create policy "logos insert admin" on storage.objects for insert to authenticated
  with check (bucket_id = 'location-logos'
    and public.has_workspace_role_text((storage.foldername(name))[1], array['owner', 'admin']::public.workspace_role[]));
create policy "logos update admin" on storage.objects for update to authenticated
  using (bucket_id = 'location-logos'
    and public.has_workspace_role_text((storage.foldername(name))[1], array['owner', 'admin']::public.workspace_role[]))
  with check (bucket_id = 'location-logos'
    and public.has_workspace_role_text((storage.foldername(name))[1], array['owner', 'admin']::public.workspace_role[]));
create policy "logos delete admin" on storage.objects for delete to authenticated
  using (bucket_id = 'location-logos'
    and public.has_workspace_role_text((storage.foldername(name))[1], array['owner', 'admin']::public.workspace_role[]));

-- ---------------------------------------------------------------------
-- 22. REALTIME
-- ELI5: lets the Feedback inbox, the Requests table and the reply drafts
-- update live, with no refresh. RLS still decides who sees what.
-- ---------------------------------------------------------------------
alter publication supabase_realtime add table public.feedback;
alter publication supabase_realtime add table public.review_requests;
alter publication supabase_realtime add table public.reply_drafts;
alter publication supabase_realtime add table public.sms_senders;

-- ---------------------------------------------------------------------
-- 23. SCHEDULES (run later, after your edge functions are deployed)
-- ELI5: pg_cron is an alarm clock inside the database. pg_net lets the
-- alarm clock call a URL. Every minute it pokes the send worker.
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
-- select cron.schedule('hl-send-worker', '* * * * *',    $$ select public.invoke_edge('hl-send-worker') $$);
-- select cron.schedule('hl-google-sync', '*/15 * * * *', $$ select public.invoke_edge('hl-google-sync') $$);
-- select cron.schedule('hl-sms-setup',   '*/30 * * * *', $$ select public.invoke_edge('hl-sms-setup') $$);
-- select cron.schedule('hl-csv-cleanup', '17 3 * * *', $$ select public.invoke_edge('hl-csv-import') $$);
--   (with the cron secret and no body, hl-csv-import deletes CSV files older than 30 days through the Storage API)
--
-- Check it ran: select * from cron.job_run_details order by start_time desc limit 20;
`
