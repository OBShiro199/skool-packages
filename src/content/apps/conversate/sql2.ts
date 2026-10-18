// Conversate SQL migration, part 2: functions, triggers, RLS, storage, realtime, grants.

export const sql2 = `

-- ---------------------------------------------------------------------
-- 9. Small helpers and triggers
-- ELI5: updated_at stamps the time on every edit. handle_new_user makes a
-- profile the moment someone signs up, so the app never finds a user
-- without one.
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array[
    'profiles', 'workspaces', 'widget_settings', 'kb_sources', 'kb_categories', 'kb_articles',
    'content_gaps', 'conversations', 'canned_replies', 'jobs', 'subscriptions'
  ] loop
    execute format(
      'create trigger %I before update on public.%I for each row execute function public.set_updated_at()',
      t || '_set_updated_at', t
    );
  end loop;
end;
$$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Turns text into a uuid, or null if it is not one. Used by storage policies
-- so a badly named file can never crash a policy check.
create or replace function public.try_uuid(p text)
returns uuid language plpgsql immutable set search_path = '' as $$
begin
  return p::uuid;
exception when others then
  return null;
end;
$$;

-- True when the caller is the service role (edge functions) or a direct
-- database session (SQL editor, migrations), false for browser users.
create or replace function public.is_service_context()
returns boolean language sql stable set search_path = '' as $$
  select case
    when coalesce(current_setting('request.jwt.claims', true), '') = '' then true
    else (current_setting('request.jwt.claims', true)::jsonb ->> 'role') = 'service_role'
  end;
$$;


-- ---------------------------------------------------------------------
-- 10. Membership helpers (security definer)
-- ELI5: one question asked by almost every lock in the building: "is this
-- person on the Acme team?". security definer lets the function peek at the
-- members list even though the caller cannot read it directly, and
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

create or replace function public.shares_workspace_with(other uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.workspace_members a
    join public.workspace_members b on b.workspace_id = a.workspace_id
    where a.user_id = (select auth.uid()) and b.user_id = other
  );
$$;


-- ---------------------------------------------------------------------
-- 11. Paywall, plans and the usage meter
-- ELI5: has_active_access asks "has the owner of this workspace paid, or is
-- the free trial still running?". plan_limits turns the Stripe price into
-- numbers (answers, seats, pages). usage_this_month adds up the meter.
-- Trials get smaller limits so nobody can crawl 5,000 pages for free.
-- ---------------------------------------------------------------------
create or replace function public.has_active_access(ws uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.workspaces w
    join public.subscriptions s on s.user_id = w.owner_id
    where w.id = ws and s.status in ('trialing', 'active')
  );
$$;

create or replace function public.current_plan(ws uuid)
returns text language sql stable security definer set search_path = '' as $$
  select case
    when s.status = 'trialing' then 'trial'
    when s.status = 'active' then coalesce(pp.plan, 'starter')
    else 'none'
  end
  from public.workspaces w
  left join public.subscriptions s on s.user_id = w.owner_id
  left join public.plan_prices pp on pp.price_id = s.price_id
  where w.id = ws;
$$;

create or replace function public.plan_limits(ws uuid)
returns table (
  plan text, ai_answers integer, suggest_replies integer, article_drafts integer,
  pages integer, sources integer, seats integer, remove_branding boolean
)
language sql stable security definer set search_path = '' as $$
  select p.plan, v.ai_answers, v.suggest_replies, v.article_drafts, v.pages, v.sources, v.seats, v.remove_branding
  from (select coalesce(public.current_plan(ws), 'none') as plan) p
  join (values
    ('none',    0,     0,    0,   0,    0,  1,  false),
    ('trial',   300,   100,  40,  150,  1,  3,  false),
    ('starter', 1500,  500,  40,  300,  3,  3,  false),
    ('growth',  5000,  2000, 150, 1500, 10, 10, true),
    ('scale',   15000, 6000, 500, 5000, 25, 25, true)
  ) as v (plan, ai_answers, suggest_replies, article_drafts, pages, sources, seats, remove_branding)
  on v.plan = p.plan;
$$;

create or replace function public.usage_this_month(ws uuid, k public.usage_kind)
returns bigint language sql stable security definer set search_path = '' as $$
  select coalesce(sum(u.quantity), 0)::bigint
  from public.usage_ledger u
  where u.workspace_id = ws and u.kind = k
    and u.created_at >= date_trunc('month', now() at time zone 'utc') at time zone 'utc';
$$;

-- One call for the sidebar meter: used and cap for every metered thing.
create or replace function public.usage_summary(ws uuid)
returns table (kind text, used bigint, cap integer)
language plpgsql stable security definer set search_path = '' as $$
declare l record;
begin
  if not public.is_workspace_member(ws) and not public.is_service_context() then
    raise exception 'not a member' using errcode = '42501';
  end if;
  select * into l from public.plan_limits(ws);
  return query values
    ('ai_answer'::text, public.usage_this_month(ws, 'ai_answer'), l.ai_answers),
    ('suggest_reply'::text, public.usage_this_month(ws, 'suggest_reply'), l.suggest_replies),
    ('article_draft'::text, public.usage_this_month(ws, 'article_draft'), l.article_drafts),
    ('crawl_page'::text, public.usage_this_month(ws, 'crawl_page'), l.pages * 2);
end;
$$;


-- ---------------------------------------------------------------------
-- 12. Workspace lifecycle: create, invite, accept, rotate key
-- ELI5: the browser is not trusted to build a workspace row by row. It calls
-- create_workspace once and the database does every step together: the
-- workspace, you as owner, default widget settings and your own domain on
-- the allowed list. All or nothing.
-- ---------------------------------------------------------------------
create or replace function public.create_workspace(
  p_name text, p_slug text, p_website_url text, p_support_email text
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_ws uuid;
  v_host text;
begin
  if v_uid is null then raise exception 'not signed in' using errcode = '42501'; end if;
  if exists (select 1 from public.workspaces where owner_id = v_uid) then
    raise exception 'You already own a workspace' using errcode = '23505';
  end if;

  insert into public.workspaces (owner_id, name, slug, website_url, support_email)
  values (v_uid, trim(p_name), lower(trim(p_slug)), nullif(trim(p_website_url), ''), lower(nullif(trim(p_support_email), '')))
  returning id into v_ws;

  insert into public.workspace_members (workspace_id, user_id, role) values (v_ws, v_uid, 'owner');
  insert into public.widget_settings (workspace_id) values (v_ws);

  v_host := lower(substring(coalesce(p_website_url, '') from '^https?://(?:www\\.)?([^/:?#]+)'));
  if v_host is not null and v_host ~ '^[a-z0-9.-]+\\.[a-z]{2,}$' then
    insert into public.allowed_domains (workspace_id, domain) values (v_ws, v_host) on conflict do nothing;
    insert into public.allowed_domains (workspace_id, domain) values (v_ws, '*.' || v_host) on conflict do nothing;
  end if;

  update public.profiles set current_workspace_id = v_ws where id = v_uid;
  return v_ws;
end;
$$;

create or replace function public.seats_used(ws uuid)
returns integer language sql stable security definer set search_path = '' as $$
  select (select count(*) from public.workspace_members where workspace_id = ws)::integer
       + (select count(*) from public.invitations where workspace_id = ws and status = 'pending' and expires_at > now())::integer;
$$;

create or replace function public.accept_invitation(p_token text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_email text := lower((select auth.jwt()) ->> 'email');
  v_inv public.invitations;
  v_seats integer;
begin
  if v_uid is null then raise exception 'not signed in' using errcode = '42501'; end if;

  select * into v_inv from public.invitations
  where token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex')
  for update;

  if v_inv.id is null or v_inv.status <> 'pending' then
    raise exception 'This invite link is not valid any more. Ask for a new one.' using errcode = 'P0002';
  end if;
  if v_inv.expires_at < now() then
    update public.invitations set status = 'expired' where id = v_inv.id;
    raise exception 'This invite has expired. Ask for a new one.' using errcode = 'P0002';
  end if;
  if v_inv.email <> v_email then
    raise exception 'This invite was sent to a different email address.' using errcode = '42501';
  end if;

  select seats into v_seats from public.plan_limits(v_inv.workspace_id);
  if (select count(*) from public.workspace_members where workspace_id = v_inv.workspace_id) >= v_seats then
    raise exception 'This workspace has no free seats. Ask the owner to upgrade.' using errcode = 'P0001';
  end if;

  insert into public.workspace_members (workspace_id, user_id, role)
  values (v_inv.workspace_id, v_uid, v_inv.role)
  on conflict (workspace_id, user_id) do nothing;

  update public.invitations set status = 'accepted', accepted_by = v_uid where id = v_inv.id;
  update public.profiles set current_workspace_id = v_inv.workspace_id where id = v_uid;

  insert into public.notifications (workspace_id, user_id, kind, title)
  values (v_inv.workspace_id, v_inv.invited_by, 'invite_accepted', v_email || ' joined your workspace');

  return v_inv.workspace_id;
end;
$$;

create or replace function public.rotate_public_key(ws uuid)
returns text language plpgsql security definer set search_path = '' as $$
declare v_key text := 'cv_pub_' || encode(extensions.gen_random_bytes(12), 'hex');
begin
  if not public.has_workspace_role(ws, array['owner', 'admin']::public.workspace_role[]) then
    raise exception 'Only owners and admins can rotate the key' using errcode = '42501';
  end if;
  perform set_config('conversate.allow_protected', 'on', true);
  update public.workspaces set public_key = v_key where id = ws;
  return v_key;
end;
$$;

-- Guards: browsers may rename a workspace, but never change its owner or key,
-- and nobody can demote or remove the owner from the members list.
create or replace function public.guard_workspace_columns()
returns trigger language plpgsql set search_path = '' as $$
begin
  if public.is_service_context() or current_setting('conversate.allow_protected', true) = 'on' then
    return new;
  end if;
  if new.owner_id is distinct from old.owner_id or new.public_key is distinct from old.public_key
     or new.slug is distinct from old.slug and old.onboarding_step >= 6 then
    raise exception 'owner_id, public_key and (after onboarding) slug cannot be changed here' using errcode = '42501';
  end if;
  return new;
end;
$$;
create trigger workspaces_guard before update on public.workspaces
  for each row execute function public.guard_workspace_columns();

create or replace function public.guard_owner_membership()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if public.is_service_context() then
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;
  if tg_op = 'DELETE' then
    -- Deleting the whole workspace cascades here: allow that.
    if old.role = 'owner' and exists (select 1 from public.workspaces w where w.id = old.workspace_id) then
      raise exception 'The owner cannot be removed' using errcode = '42501';
    end if;
    return old;
  end if;
  if old.role = 'owner' and new.role <> 'owner' then
    raise exception 'The owner cannot be demoted' using errcode = '42501';
  end if;
  if new.role = 'owner' and old.role <> 'owner' then
    raise exception 'Ownership transfer is not supported in the app' using errcode = '42501';
  end if;
  return new;
end;
$$;
create trigger workspace_members_guard before update or delete on public.workspace_members
  for each row execute function public.guard_owner_membership();

-- Agents (not admins) may only edit inbox fields on a conversation.
create or replace function public.guard_conversation_columns()
returns trigger language plpgsql set search_path = '' as $$
begin
  if public.is_service_context() then return new; end if;
  if new.workspace_id is distinct from old.workspace_id
     or new.visitor_id is distinct from old.visitor_id
     or new.realtime_topic is distinct from old.realtime_topic
     or new.reply_token_hash is distinct from old.reply_token_hash
     or new.message_count is distinct from old.message_count
     or new.ai_answer_count is distinct from old.ai_answer_count
     or new.first_response_at is distinct from old.first_response_at then
    raise exception 'That conversation field is managed by the server' using errcode = '42501';
  end if;
  if new.status = 'closed' and old.status <> 'closed' then new.closed_at := now(); end if;
  if new.status <> 'closed' then new.closed_at := null; end if;
  if new.status <> 'snoozed' then new.snoozed_until := null; end if;
  return new;
end;
$$;
create trigger conversations_guard before update on public.conversations
  for each row execute function public.guard_conversation_columns();


-- ---------------------------------------------------------------------
-- 13. Conversation counters and assignment
-- ELI5: every new message nudges its conversation: bump the count, stamp
-- the time, and the first time a human replies, stamp "first response".
-- Analytics reads these stamps instead of re-counting every message.
-- ---------------------------------------------------------------------
create or replace function public.on_message_insert()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.conversations c set
    message_count = c.message_count + 1,
    ai_answer_count = c.ai_answer_count + (case when new.role = 'ai' then 1 else 0 end),
    last_message_at = new.created_at,
    last_visitor_message_at = case when new.role = 'visitor' then new.created_at else c.last_visitor_message_at end,
    first_response_at = case when new.role = 'agent' and c.first_response_at is null then new.created_at else c.first_response_at end,
    status = case when new.role = 'visitor' and c.status in ('closed', 'snoozed', 'pending') then 'open'::public.conversation_status else c.status end,
    mode = case when new.role = 'agent' then 'human'::public.conversation_mode else c.mode end,
    low_confidence = c.low_confidence or (new.role = 'ai' and new.needs_human)
  where c.id = new.conversation_id;
  return new;
end;
$$;
create trigger messages_after_insert after insert on public.messages
  for each row execute function public.on_message_insert();

create or replace function public.assign_conversation(p_conversation uuid, p_assignee uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_ws uuid;
begin
  select workspace_id into v_ws from public.conversations where id = p_conversation;
  if v_ws is null or not public.is_workspace_member(v_ws) then
    raise exception 'Conversation not found' using errcode = 'P0002';
  end if;
  if p_assignee is not null and not exists (
    select 1 from public.workspace_members where workspace_id = v_ws and user_id = p_assignee
  ) then
    raise exception 'That person is not on this team' using errcode = '42501';
  end if;
  update public.conversations set assignee_id = p_assignee where id = p_conversation;
  insert into public.assignments (workspace_id, conversation_id, assignee_id, assigned_by)
  values (v_ws, p_conversation, p_assignee, (select auth.uid()));
  if p_assignee is not null and p_assignee <> (select auth.uid()) then
    insert into public.notifications (workspace_id, user_id, kind, conversation_id, title)
    values (v_ws, p_assignee, 'assigned', p_conversation, 'A conversation was assigned to you');
  end if;
end;
$$;


-- ---------------------------------------------------------------------
-- 14. Vector search
-- ELI5: match_chunks takes the question's embedding and returns the closest
-- chunks for ONE workspace. Only edge functions may call it (service role),
-- so a visitor can never search another company's knowledge.
-- iterative_scan keeps looking past the first neighbourhood when the
-- nearest chunks belong to other workspaces, so small tenants still get 6 hits.
-- ---------------------------------------------------------------------
create or replace function public.match_chunks(
  p_workspace_id uuid,
  p_query_embedding extensions.vector(1024),
  p_match_count integer default 6,
  p_min_similarity double precision default 0.30
)
returns table (id bigint, source_type public.chunk_source, article_id uuid, page_id uuid,
               url text, title text, content text, similarity double precision)
language plpgsql stable security definer set search_path = '' as $$
begin
  perform set_config('hnsw.iterative_scan', 'relaxed_order', true);
  perform set_config('hnsw.ef_search', '100', true);
  return query
  select c.id, c.source_type, c.article_id, c.page_id, c.url, c.title, c.content,
         (1 - (c.embedding operator(extensions.<=>) p_query_embedding))::double precision as similarity
  from public.kb_chunks c
  where c.workspace_id = p_workspace_id
    and (1 - (c.embedding operator(extensions.<=>) p_query_embedding)) >= p_min_similarity
  order by c.embedding operator(extensions.<=>) p_query_embedding
  limit least(greatest(p_match_count, 1), 12);
end;
$$;


-- ---------------------------------------------------------------------
-- 15. Jobs, rate limits and content gaps (service role only)
-- ELI5: claim_jobs hands each worker its own jobs (SKIP LOCKED means two
-- workers never grab the same one). finish_job either ticks it off or
-- schedules a retry: 30s, 1m, 2m, 4m, 8m, then gives up ("dead").
-- try_rate_limit counts hits per key per time window and says yes or no.
-- ---------------------------------------------------------------------
create or replace function public.enqueue_job(
  p_workspace_id uuid, p_kind public.job_kind, p_payload jsonb,
  p_idempotency_key text default null, p_run_after timestamptz default now()
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  insert into public.jobs (workspace_id, kind, payload, idempotency_key, run_after)
  values (p_workspace_id, p_kind, coalesce(p_payload, '{}'), p_idempotency_key, p_run_after)
  on conflict (idempotency_key) do nothing
  returning id into v_id;
  if v_id is null then
    select id into v_id from public.jobs where idempotency_key = p_idempotency_key;
  end if;
  return v_id;
end;
$$;

create or replace function public.claim_jobs(p_kinds public.job_kind[], p_limit integer default 5)
returns setof public.jobs language plpgsql security definer set search_path = '' as $$
begin
  -- Jobs stuck in running for 15 minutes (worker crashed) go back in the queue.
  update public.jobs set status = 'queued', locked_at = null
  where status = 'running' and locked_at < now() - interval '15 minutes';

  return query
  update public.jobs j set status = 'running', locked_at = now(), attempts = j.attempts + 1
  where j.id in (
    select id from public.jobs
    where status = 'queued' and kind = any (p_kinds) and run_after <= now()
    order by run_after
    limit least(greatest(p_limit, 1), 25)
    for update skip locked
  )
  returning j.*;
end;
$$;

create or replace function public.finish_job(p_id uuid, p_ok boolean, p_error text default null, p_result jsonb default null)
returns void language plpgsql security definer set search_path = '' as $$
declare v public.jobs;
begin
  select * into v from public.jobs where id = p_id for update;
  if v.id is null then return; end if;
  if p_ok then
    update public.jobs set status = 'succeeded', result = p_result, locked_at = null, last_error = null where id = p_id;
  elsif v.attempts >= v.max_attempts then
    update public.jobs set status = 'dead', last_error = left(p_error, 2000), locked_at = null where id = p_id;
  else
    update public.jobs set status = 'queued', last_error = left(p_error, 2000), locked_at = null,
      run_after = now() + make_interval(secs => least(30 * power(2, v.attempts - 1), 3600))
    where id = p_id;
  end if;
end;
$$;

create or replace function public.try_rate_limit(p_key text, p_limit integer, p_window_seconds integer)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  v_window timestamptz := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  v_hits integer;
begin
  insert into public.rate_limits (key, window_start, hits) values (p_key, v_window, 1)
  on conflict (key, window_start) do update set hits = public.rate_limits.hits + 1
  returning hits into v_hits;
  return v_hits <= p_limit;
end;
$$;

create or replace function public.record_content_gap(p_workspace_id uuid, p_question text, p_message_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_norm text := regexp_replace(lower(trim(p_question)), '[^a-z0-9 ]', '', 'g');
  v_id uuid;
begin
  insert into public.content_gaps (workspace_id, question, question_hash, example_message_ids)
  values (p_workspace_id, left(trim(p_question), 300), encode(extensions.digest(v_norm, 'sha256'), 'hex'), array[p_message_id])
  on conflict (workspace_id, question_hash) do update set
    times_asked = public.content_gaps.times_asked + 1,
    last_asked_at = now(),
    example_message_ids = (public.content_gaps.example_message_ids || p_message_id)[1:10],
    status = case when public.content_gaps.status = 'resolved' then 'open'::public.gap_status else public.content_gaps.status end
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.article_counter(p_article uuid, p_kind text)
returns void language sql security definer set search_path = '' as $$
  update public.kb_articles set
    views = views + (case when p_kind = 'view' then 1 else 0 end),
    helpful_yes = helpful_yes + (case when p_kind = 'yes' then 1 else 0 end),
    helpful_no = helpful_no + (case when p_kind = 'no' then 1 else 0 end)
  where id = p_article and status = 'published';
$$;

-- Scheduled housekeeping (pg_cron calls this every 5 minutes).
create or replace function public.housekeeping()
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.conversations set status = 'open', snoozed_until = null
  where status = 'snoozed' and snoozed_until <= now();
  delete from public.rate_limits where window_start < now() - interval '1 day';
  update public.invitations set status = 'expired' where status = 'pending' and expires_at < now();
  -- An AI-only conversation quiet for 24h with no handoff counts as resolved by AI.
  update public.conversations set ai_resolved = true, status = 'closed'
  where mode = 'ai' and status = 'open' and handoff_requested_at is null and not flagged
    and ai_answer_count > 0 and last_message_at < now() - interval '24 hours';
  delete from public.jobs where status in ('succeeded', 'dead') and updated_at < now() - interval '30 days';
end;
$$;


-- ---------------------------------------------------------------------
-- 16. Analytics
-- ELI5: one function returns the numbers on the Analytics page for a date
-- range: how many chats, how many the AI solved alone, how fast humans
-- replied (median) and the average happiness score.
-- ---------------------------------------------------------------------
create or replace function public.workspace_stats(ws uuid, p_from timestamptz, p_to timestamptz)
returns table (
  conversations bigint, ai_answers bigint, ai_resolved bigint, ai_resolution_rate numeric,
  handoffs bigint, median_first_response_seconds numeric, csat_avg numeric, csat_count bigint
)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_workspace_member(ws) then
    raise exception 'not a member' using errcode = '42501';
  end if;
  return query
  with c as (
    select cv.* from public.conversations cv
    where cv.workspace_id = ws and cv.created_at >= p_from and cv.created_at < p_to
  )
  select
    (select count(*) from c),
    (select coalesce(sum(c.ai_answer_count), 0)::bigint from c),
    (select count(*) from c where c.ai_resolved),
    (select case when count(*) filter (where c.ai_answer_count > 0) = 0 then 0::numeric
            else round(100.0 * count(*) filter (where c.ai_resolved) / count(*) filter (where c.ai_answer_count > 0), 1) end from c),
    (select count(*) from c where c.handoff_requested_at is not null),
    (select round(extract(epoch from percentile_cont(0.5) within group (
        order by c.first_response_at - coalesce(c.handoff_requested_at, c.created_at)))::numeric, 0)
     from c where c.first_response_at is not null),
    (select round(avg(s.score)::numeric, 2) from public.csat s join c on c.id = s.conversation_id),
    (select count(*) from public.csat s join c on c.id = s.conversation_id);
end;
$$;


-- ---------------------------------------------------------------------
-- 17. Row level security
-- ELI5: RLS is the bouncer on every table. With it on, the public key gets
-- nothing at all. Each policy below says who may read, add, change or
-- delete rows, one operation at a time. Visitors on customer websites never
-- touch tables: everything they do goes through edge functions.
-- ---------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'profiles', 'workspaces', 'workspace_members', 'invitations', 'widget_settings', 'allowed_domains',
    'kb_sources', 'kb_pages', 'kb_categories', 'kb_articles', 'kb_chunks', 'content_gaps',
    'visitors', 'conversations', 'messages', 'notes', 'tags', 'conversation_tags', 'assignments',
    'canned_replies', 'flags', 'notifications', 'csat', 'jobs', 'rate_limits', 'usage_ledger',
    'email_log', 'subscriptions', 'stripe_events', 'plan_prices'
  ] loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end;
$$;

-- Belt and braces: the anonymous role gets no table access at all.
revoke all on all tables in schema public from anon;

-- profiles
create policy "profiles select self or teammate" on public.profiles for select to authenticated
  using (id = (select auth.uid()) or public.shares_workspace_with(id));
create policy "profiles update self" on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- workspaces (insert only through create_workspace)
create policy "workspaces select member" on public.workspaces for select to authenticated
  using (public.is_workspace_member(id));
create policy "workspaces update admin" on public.workspaces for update to authenticated
  using (public.has_workspace_role(id, array['owner', 'admin']::public.workspace_role[]))
  with check (public.has_workspace_role(id, array['owner', 'admin']::public.workspace_role[]));
create policy "workspaces delete owner" on public.workspaces for delete to authenticated
  using (owner_id = (select auth.uid()));

-- workspace_members (insert only through create_workspace / accept_invitation)
create policy "members select teammates" on public.workspace_members for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy "members update admin" on public.workspace_members for update to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]))
  with check (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]) and role <> 'owner');
create policy "members delete admin or self" on public.workspace_members for delete to authenticated
  using (user_id = (select auth.uid()) or public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]));

-- invitations (created by the invite-member edge function)
create policy "invitations select admin" on public.invitations for select to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]));
create policy "invitations update admin" on public.invitations for update to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]))
  with check (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]) and status in ('pending', 'revoked'));
create policy "invitations delete admin" on public.invitations for delete to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]));

-- widget_settings
create policy "widget select member" on public.widget_settings for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy "widget update admin" on public.widget_settings for update to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]))
  with check (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]));

-- allowed_domains
create policy "domains select member" on public.allowed_domains for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy "domains insert admin" on public.allowed_domains for insert to authenticated
  with check (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]));
create policy "domains update admin" on public.allowed_domains for update to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]))
  with check (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]));
create policy "domains delete admin" on public.allowed_domains for delete to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]));

-- kb_sources (created by onboard-crawl; admins may edit paths or delete)
create policy "sources select member" on public.kb_sources for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy "sources update admin" on public.kb_sources for update to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]))
  with check (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]));
create policy "sources delete admin" on public.kb_sources for delete to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]));

-- kb_pages (written by build-knowledge)
create policy "pages select member" on public.kb_pages for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy "pages delete admin" on public.kb_pages for delete to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]));

-- kb_categories and kb_articles: any team member writes, admins delete
create policy "categories select member" on public.kb_categories for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy "categories insert member" on public.kb_categories for insert to authenticated
  with check (public.is_workspace_member(workspace_id));
create policy "categories update member" on public.kb_categories for update to authenticated
  using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id));
create policy "categories delete admin" on public.kb_categories for delete to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]));

create policy "articles select member" on public.kb_articles for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy "articles insert member" on public.kb_articles for insert to authenticated
  with check (public.is_workspace_member(workspace_id) and updated_by = (select auth.uid()));
create policy "articles update member" on public.kb_articles for update to authenticated
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id) and updated_by = (select auth.uid()));
create policy "articles delete admin" on public.kb_articles for delete to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]));

-- kb_chunks: read-only for members (to show sources), written by edge functions
create policy "chunks select member" on public.kb_chunks for select to authenticated
  using (public.is_workspace_member(workspace_id));

-- content_gaps
create policy "gaps select member" on public.content_gaps for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy "gaps update member" on public.content_gaps for update to authenticated
  using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id));

-- visitors
create policy "visitors select member" on public.visitors for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy "visitors update member" on public.visitors for update to authenticated
  using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id));

-- conversations (created by widget-session / widget-message)
create policy "conversations select member" on public.conversations for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy "conversations update member" on public.conversations for update to authenticated
  using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id));
create policy "conversations delete admin" on public.conversations for delete to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]));

-- messages: read by the team; written ONLY by edge functions so the visitor
-- always receives what an agent sends (agent-reply also pushes it live).
create policy "messages select member" on public.messages for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy "messages delete admin" on public.messages for delete to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]));

-- notes: internal, never shown to visitors
create policy "notes select member" on public.notes for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy "notes insert member" on public.notes for insert to authenticated
  with check (public.is_workspace_member(workspace_id) and author_id = (select auth.uid()));
create policy "notes update author" on public.notes for update to authenticated
  using (author_id = (select auth.uid())) with check (author_id = (select auth.uid()) and public.is_workspace_member(workspace_id));
create policy "notes delete author or admin" on public.notes for delete to authenticated
  using (author_id = (select auth.uid()) or public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]));

-- tags and conversation_tags
create policy "tags select member" on public.tags for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy "tags insert member" on public.tags for insert to authenticated
  with check (public.is_workspace_member(workspace_id));
create policy "tags update member" on public.tags for update to authenticated
  using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id));
create policy "tags delete admin" on public.tags for delete to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]));

create policy "conv tags select member" on public.conversation_tags for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy "conv tags insert member" on public.conversation_tags for insert to authenticated
  with check (
    public.is_workspace_member(workspace_id)
    and exists (select 1 from public.conversations c where c.id = conversation_id and c.workspace_id = conversation_tags.workspace_id)
    and exists (select 1 from public.tags t where t.id = tag_id and t.workspace_id = conversation_tags.workspace_id)
  );
create policy "conv tags delete member" on public.conversation_tags for delete to authenticated
  using (public.is_workspace_member(workspace_id));

-- assignments: history, written by assign_conversation()
create policy "assignments select member" on public.assignments for select to authenticated
  using (public.is_workspace_member(workspace_id));

-- canned_replies
create policy "canned select member" on public.canned_replies for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy "canned insert member" on public.canned_replies for insert to authenticated
  with check (public.is_workspace_member(workspace_id) and created_by = (select auth.uid()));
create policy "canned update member" on public.canned_replies for update to authenticated
  using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id));
create policy "canned delete author or admin" on public.canned_replies for delete to authenticated
  using (created_by = (select auth.uid()) or public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]));

-- flags: agents flag by hand; AI and visitor flags come from edge functions
create policy "flags select member" on public.flags for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy "flags insert agent" on public.flags for insert to authenticated
  with check (public.is_workspace_member(workspace_id) and source = 'agent' and flagged_by = (select auth.uid()));
create policy "flags update member" on public.flags for update to authenticated
  using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id));

-- notifications: your own, plus workspace-wide ones (user_id null)
create policy "notifications select own" on public.notifications for select to authenticated
  using (user_id = (select auth.uid()) or (user_id is null and public.is_workspace_member(workspace_id)));
create policy "notifications update own" on public.notifications for update to authenticated
  using (user_id = (select auth.uid()) or (user_id is null and public.is_workspace_member(workspace_id)))
  with check (user_id = (select auth.uid()) or (user_id is null and public.is_workspace_member(workspace_id)));

-- csat, jobs, usage: read-only for the team
create policy "csat select member" on public.csat for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy "jobs select member" on public.jobs for select to authenticated
  using (workspace_id is not null and public.is_workspace_member(workspace_id));
create policy "usage select member" on public.usage_ledger for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy "email log select admin" on public.email_log for select to authenticated
  using (workspace_id is not null and public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]));

-- billing: you see your own subscription row; plan names are public to signed-in users
create policy "subscriptions select own" on public.subscriptions for select to authenticated
  using (user_id = (select auth.uid()));
create policy "plan prices select" on public.plan_prices for select to authenticated
  using (true);
-- rate_limits and stripe_events: no policies at all, service role only.


-- ---------------------------------------------------------------------
-- 18. Function permissions
-- ELI5: by default anyone can call any function. We take that away, then
-- give the browser only the ones it needs. The rest are for edge functions.
-- ---------------------------------------------------------------------
revoke execute on all functions in schema public from public, anon, authenticated;

grant execute on function public.is_workspace_member(uuid) to authenticated;
grant execute on function public.has_workspace_role(uuid, public.workspace_role[]) to authenticated;
grant execute on function public.shares_workspace_with(uuid) to authenticated;
grant execute on function public.has_active_access(uuid) to authenticated;
grant execute on function public.current_plan(uuid) to authenticated;
grant execute on function public.plan_limits(uuid) to authenticated;
grant execute on function public.usage_this_month(uuid, public.usage_kind) to authenticated;
grant execute on function public.usage_summary(uuid) to authenticated;
grant execute on function public.create_workspace(text, text, text, text) to authenticated;
grant execute on function public.seats_used(uuid) to authenticated;
grant execute on function public.accept_invitation(text) to authenticated;
grant execute on function public.rotate_public_key(uuid) to authenticated;
grant execute on function public.assign_conversation(uuid, uuid) to authenticated;
grant execute on function public.workspace_stats(uuid, timestamptz, timestamptz) to authenticated;
-- Used inside RLS policies, triggers and storage checks.
grant execute on function public.try_uuid(text) to authenticated;
grant execute on function public.is_service_context() to authenticated;
grant execute on function public.set_updated_at() to authenticated;
grant execute on function public.guard_workspace_columns() to authenticated;
grant execute on function public.guard_owner_membership() to authenticated;
grant execute on function public.guard_conversation_columns() to authenticated;

-- Edge functions only.
grant execute on all functions in schema public to service_role;


-- ---------------------------------------------------------------------
-- 19. Storage buckets
-- ELI5: widget-assets holds the launcher icon and avatar. It is public so
-- any customer website can show them, but only admins of that workspace can
-- upload, and files live in a folder named after the workspace id.
-- attachments is private: files agents send, opened through short-lived links.
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('widget-assets', 'widget-assets', true, 1048576, array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'])
on conflict (id) do nothing;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('attachments', 'attachments', false, 10485760,
        array['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'application/pdf', 'text/plain', 'text/csv'])
on conflict (id) do nothing;

create policy "widget assets select member" on storage.objects for select to authenticated
  using (bucket_id = 'widget-assets' and public.is_workspace_member(public.try_uuid((storage.foldername(name))[1])));
create policy "widget assets insert admin" on storage.objects for insert to authenticated
  with check (bucket_id = 'widget-assets' and public.has_workspace_role(public.try_uuid((storage.foldername(name))[1]), array['owner', 'admin']::public.workspace_role[]));
create policy "widget assets update admin" on storage.objects for update to authenticated
  using (bucket_id = 'widget-assets' and public.has_workspace_role(public.try_uuid((storage.foldername(name))[1]), array['owner', 'admin']::public.workspace_role[]))
  with check (bucket_id = 'widget-assets' and public.has_workspace_role(public.try_uuid((storage.foldername(name))[1]), array['owner', 'admin']::public.workspace_role[]));
create policy "widget assets delete admin" on storage.objects for delete to authenticated
  using (bucket_id = 'widget-assets' and public.has_workspace_role(public.try_uuid((storage.foldername(name))[1]), array['owner', 'admin']::public.workspace_role[]));

create policy "attachments select member" on storage.objects for select to authenticated
  using (bucket_id = 'attachments' and public.is_workspace_member(public.try_uuid((storage.foldername(name))[1])));
create policy "attachments insert member" on storage.objects for insert to authenticated
  with check (bucket_id = 'attachments' and public.is_workspace_member(public.try_uuid((storage.foldername(name))[1])));
create policy "attachments delete admin" on storage.objects for delete to authenticated
  using (bucket_id = 'attachments' and public.has_workspace_role(public.try_uuid((storage.foldername(name))[1]), array['owner', 'admin']::public.workspace_role[]));


-- ---------------------------------------------------------------------
-- 20. Realtime
-- ELI5: the inbox updates live because these tables broadcast their changes
-- to signed-in agents. RLS still applies: an agent only hears about their own
-- workspace. Visitors do NOT use this; they get agent replies on a private
-- broadcast topic sent by the agent-reply edge function.
-- ---------------------------------------------------------------------
do $$
declare t text;
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
  foreach t in array array['conversations', 'messages', 'notes', 'notifications', 'kb_sources', 'jobs'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end;
$$;

-- Done. Check: Database > Tables shows RLS enabled on every table, and
-- select count(*) from pg_policies where schemaname = 'public'; returns 70 or more.
`
