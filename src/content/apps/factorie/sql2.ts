// Factorie migration, part 2: pipeline functions, scoring, views, RLS, realtime, storage.

export const sqlPart2 = `
-- ---------------------------------------------------------------------
-- 10. Small helpers
-- ---------------------------------------------------------------------
-- Is this brand mine? Used by RLS policies on child tables.
create or replace function public.owns_brand(p_brand uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.brands b where b.id = p_brand and b.user_id = (select auth.uid()));
$$;

-- Money spent on paid APIs this calendar month (UTC) for one user.
create or replace function public.month_spend(p_user uuid)
returns numeric language sql stable security definer set search_path = '' as $$
  select coalesce(sum(cost_usd), 0) from public.usage_ledger
  where user_id = p_user and created_at >= date_trunc('month', now());
$$;

-- Position weight from PRD section 12.1. 1st = 1.00, 2nd = 0.85 ... floor 0.20.
create or replace function public.position_weight(p_mentioned boolean, p_position int, p_answer_type text, p_recommended boolean)
returns numeric language sql immutable set search_path = '' as $$
  select case
    when not coalesce(p_mentioned, false) then 0::numeric
    when p_answer_type = 'single_pick' and coalesce(p_recommended, false) then 1.0
    when p_position is not null then greatest(0.2, 1 - 0.15 * (p_position - 1))
    else 0.6 end;
$$;

-- ---------------------------------------------------------------------
-- 11. Creating runs
-- ELI5: create_run takes a brand, works out which prompts and engines it
-- is allowed to check, checks the spend cap first, then writes one job
-- row per prompt per engine. If the cap would be passed it pauses the
-- brand instead and spends nothing.
-- ---------------------------------------------------------------------
create or replace function public.create_run(
  p_brand uuid,
  p_kind public.run_kind,
  p_scheduled_for timestamptz default now(),
  p_prompt uuid default null,
  p_pinned_only boolean default false
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_brand public.brands;
  v_limits jsonb;
  v_engines text[];
  v_run uuid;
  v_jobs int;
  v_est numeric;
begin
  select * into v_brand from public.brands where id = p_brand;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'not_found');
  end if;
  if not public.has_active_access(v_brand.user_id) then
    return jsonb_build_object('ok', false, 'code', 'no_access');
  end if;
  v_limits := public.plan_limits(v_brand.user_id);

  select array_agg(e.key order by e.sort) into v_engines
  from public.engines e
  where e.is_enabled
    and e.key = any (v_brand.engines_enabled)
    and e.key in (select jsonb_array_elements_text(v_limits -> 'engines'));
  if v_engines is null then
    return jsonb_build_object('ok', false, 'code', 'no_engines');
  end if;

  select count(*) * (select sum(est_cost_usd) from public.engines where key = any (v_engines))
    into v_est
  from public.tracked_prompts tp
  where tp.brand_id = p_brand and tp.is_active
    and (p_prompt is null or tp.id = p_prompt)
    and (not p_pinned_only or tp.is_pinned);

  if public.month_spend(v_brand.user_id) + coalesce(v_est, 0) > (v_limits ->> 'monthly_cost_cap_usd')::numeric then
    update public.brands set status = 'paused_budget' where id = p_brand and status = 'active';
    return jsonb_build_object('ok', false, 'code', 'budget');
  end if;

  insert into public.check_runs (brand_id, user_id, kind, scheduled_for)
  values (p_brand, v_brand.user_id, p_kind, p_scheduled_for)
  on conflict (brand_id, kind, scheduled_for) do nothing
  returning id into v_run;
  if v_run is null then
    return jsonb_build_object('ok', false, 'code', 'duplicate');
  end if;

  insert into public.check_results (run_id, brand_id, user_id, prompt_id, engine_key, prompt_text_snapshot)
  select v_run, p_brand, v_brand.user_id, tp.id, e.key, tp.text
  from public.tracked_prompts tp
  cross join unnest(v_engines) as e(key)
  where tp.brand_id = p_brand and tp.is_active
    and (p_prompt is null or tp.id = p_prompt)
    and (not p_pinned_only or tp.is_pinned);
  get diagnostics v_jobs = row_count;

  if v_jobs = 0 then
    delete from public.check_runs where id = v_run;
    return jsonb_build_object('ok', false, 'code', 'no_prompts');
  end if;

  update public.check_runs set total_jobs = v_jobs where id = v_run;
  return jsonb_build_object('ok', true, 'run_id', v_run, 'jobs', v_jobs, 'estimate_usd', v_est);
end;
$$;

-- Called every minute by run-checks. Creates runs for brands whose time
-- has come, then moves their next check forward. Safe to call twice.
create or replace function public.schedule_due_runs(p_limit int default 50)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_b record;
  v_res jsonb;
  v_out jsonb := '[]'::jsonb;
begin
  -- New month: un-pause brands that hit last month's cap.
  update public.brands set status = 'active'
  where status = 'paused_budget' and date_trunc('month', updated_at) < date_trunc('month', now());

  for v_b in
    select b.id, b.next_check_at, b.check_dow, b.check_hour, b.check_minute, b.timezone
    from public.brands b
    where b.status = 'active' and b.next_check_at <= now()
    order by b.next_check_at
    limit p_limit
    for update skip locked
  loop
    v_res := public.create_run(v_b.id, 'scheduled', v_b.next_check_at);
    update public.brands
      set next_check_at = public.next_weekly_slot(v_b.check_dow, v_b.check_hour, v_b.check_minute, v_b.timezone)
      where id = v_b.id;
    v_out := v_out || jsonb_build_array(v_res || jsonb_build_object('brand_id', v_b.id, 'type', 'weekly'));
  end loop;

  for v_b in
    select b.id, b.next_daily_at
    from public.brands b
    where b.status = 'active' and b.check_frequency = 'weekly_plus_daily_pinned'
      and b.next_daily_at <= now()
    order by b.next_daily_at
    limit p_limit
    for update skip locked
  loop
    v_res := public.create_run(v_b.id, 'scheduled', v_b.next_daily_at, null, true);
    update public.brands
      set next_daily_at = v_b.next_daily_at
        + (floor(extract(epoch from (now() - v_b.next_daily_at)) / 86400) + 1) * interval '1 day'
      where id = v_b.id;
    v_out := v_out || jsonb_build_array(v_res || jsonb_build_object('brand_id', v_b.id, 'type', 'daily'));
  end loop;

  return v_out;
end;
$$;

-- ---------------------------------------------------------------------
-- 12. The job queue
-- ELI5: claim_check_jobs hands out waiting jobs to workers. "for update
-- skip locked" means two workers grabbing at the same moment never get
-- the same job. Each engine has at most max_in_flight jobs running at
-- once across the whole app, so no provider gets flooded.
-- ---------------------------------------------------------------------
create or replace function public.claim_check_jobs(p_limit int default 40)
returns setof public.check_results language plpgsql security definer set search_path = '' as $$
declare
  v_engine record;
  v_slots int;
  v_got int;
  v_left int := p_limit;
  v_cap numeric;
begin
  if (select value from public.app_settings where key = 'checks_paused') = 'true'::jsonb then
    return;
  end if;
  select (value #>> '{}')::numeric into v_cap from public.app_settings where key = 'global_daily_cap_usd';
  if (select coalesce(sum(cost_usd), 0) from public.usage_ledger where created_at >= date_trunc('day', now())) >= coalesce(v_cap, 50) then
    raise warning 'factorie: global daily cap reached, claiming nothing';
    return;
  end if;

  for v_engine in select e.key, e.max_in_flight from public.engines e where e.is_enabled order by e.sort loop
    exit when v_left <= 0;
    select v_engine.max_in_flight - count(*) into v_slots
      from public.check_results
      where engine_key = v_engine.key and status in ('claimed', 'calling', 'parsing');
    continue when v_slots <= 0;

    return query
    with picked as (
      select r.id
      from public.check_results r
      join public.check_runs cr on cr.id = r.run_id
      where r.status = 'queued' and r.engine_key = v_engine.key
        and r.next_attempt_at <= now()
        and cr.status in ('queued', 'running')
      order by case cr.kind when 'onboarding' then 0 when 'recheck' then 1 else 2 end, r.created_at
      limit least(v_slots, v_left)
      for update of r skip locked
    )
    update public.check_results r
      set status = 'claimed', claimed_at = now()
      from picked
      where r.id = picked.id
      returning r.*;
    get diagnostics v_got = row_count;
    v_left := v_left - v_got;
  end loop;

  update public.check_runs cr set status = 'running', started_at = coalesce(cr.started_at, now())
  where cr.status = 'queued'
    and exists (select 1 from public.check_results j where j.run_id = cr.id and j.status <> 'queued');
end;
$$;

-- Jobs stuck for 10 minutes (a worker crashed) go back in the queue.
create or replace function public.release_stuck_jobs()
returns int language plpgsql security definer set search_path = '' as $$
declare
  v_n int;
begin
  update public.check_results
    set status = case when attempts + 1 >= 3 then 'failed'::public.job_status else 'queued'::public.job_status end,
        attempts = attempts + 1,
        next_attempt_at = now(),
        last_error = coalesce(last_error, 'Stuck for 10 minutes, released')
  where status in ('claimed', 'calling', 'parsing') and updated_at < now() - interval '10 minutes';
  get diagnostics v_n = row_count;
  return v_n;
end;
$$;

-- Runs with no unfinished jobs get their final status. Returns the runs
-- it finished so run-checks can score them and send first-run emails.
create or replace function public.finish_runs()
returns table (run_id uuid, brand_id uuid, user_id uuid, kind public.run_kind, status public.run_status)
language sql security definer set search_path = '' as $$
  with ready as (
    select r.id
    from public.check_runs r
    where r.status in ('queued', 'running')
      and exists (select 1 from public.check_results j where j.run_id = r.id)
      and not exists (
        select 1 from public.check_results j
        where j.run_id = r.id and j.status in ('queued', 'claimed', 'calling', 'parsing'))
    for update skip locked
  ), counts as (
    select j.run_id,
      count(*) as total,
      count(*) filter (where j.status = 'done') as done,
      count(*) filter (where j.status = 'failed') as failed,
      count(*) filter (where j.status = 'skipped_budget') as skipped,
      coalesce(sum(j.cost_usd), 0) as cost
    from public.check_results j
    where j.run_id in (select id from ready)
    group by j.run_id
  )
  update public.check_runs r
    set status = case when c.done = c.total then 'complete'::public.run_status
                      when c.done = 0 then 'failed'::public.run_status
                      else 'partial'::public.run_status end,
        finished_at = now(),
        total_jobs = c.total, done_jobs = c.done, failed_jobs = c.failed, skipped_jobs = c.skipped,
        cost_usd = c.cost
  from counts c
  where r.id = c.run_id
  returning r.id, r.brand_id, r.user_id, r.kind, r.status;
$$;

-- When a brand hits its cap mid-run, the rest of its queued jobs are skipped.
create or replace function public.skip_budget_jobs(p_brand uuid)
returns int language plpgsql security definer set search_path = '' as $$
declare
  v_n int;
begin
  update public.check_results set status = 'skipped_budget', last_error = 'Monthly budget reached'
  where brand_id = p_brand and status = 'queued';
  get diagnostics v_n = row_count;
  update public.brands set status = 'paused_budget' where id = p_brand and status = 'active';
  return v_n;
end;
$$;

-- ---------------------------------------------------------------------
-- 13. Scoring (PRD section 12)
-- ELI5: this turns raw answers into the numbers on the dashboard. It
-- only uses the latest answer per prompt and engine from the last 8 days,
-- deletes that brand and day's scores, and writes them again, so running
-- it twice gives the same result.
-- ---------------------------------------------------------------------
create or replace function public.compute_daily_scores(p_brand uuid, p_day date default current_date)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid;
begin
  select user_id into v_user from public.brands where id = p_brand;
  if v_user is null then
    return;
  end if;

  delete from public.daily_scores where brand_id = p_brand and day = p_day;
  delete from public.competitor_daily where brand_id = p_brand and day = p_day;

  drop table if exists pg_temp.fac_scored;
  create temp table fac_scored on commit drop as
  select distinct on (r.prompt_id, r.engine_key)
    r.prompt_id, r.engine_key,
    coalesce(r.mentioned, false) as mentioned,
    r.position, r.sentiment, r.brand_cited,
    cardinality(r.cited_urls) as n_cited,
    r.competitor_mentions,
    public.position_weight(r.mentioned, r.position, r.answer_type, r.recommended) as w
  from public.check_results r
  join public.tracked_prompts tp on tp.id = r.prompt_id
  where r.brand_id = p_brand and r.status = 'done' and tp.is_active
    and r.prompt_text_snapshot = tp.text
    and r.checked_at >= (p_day - 7) and r.checked_at < (p_day + 1)
  order by r.prompt_id, r.engine_key, r.checked_at desc;

  drop table if exists pg_temp.fac_comp;
  create temp table fac_comp on commit drop as
  select s.engine_key,
    (e ->> 'competitor_id')::uuid as competitor_id,
    coalesce((e ->> 'mentioned')::boolean, false) as mentioned,
    nullif(e ->> 'position', '')::int as position,
    public.position_weight((e ->> 'mentioned')::boolean, nullif(e ->> 'position', '')::int, null, null) as w
  from pg_temp.fac_scored s
  cross join lateral jsonb_array_elements(s.competitor_mentions) e
  where (e ->> 'competitor_id') is not null
    and exists (select 1 from public.competitors c where c.id = (e ->> 'competitor_id')::uuid and c.brand_id = p_brand);

  -- Per engine, brand
  insert into public.daily_scores (brand_id, user_id, day, engine_key, answers, visibility, mention_rate,
    avg_position, sentiment, citation_rate, brand_weight)
  select p_brand, v_user, p_day, s.engine_key, count(*),
    round(avg(100 * s.w), 1),
    round(100.0 * avg(s.mentioned::int), 1),
    round(avg(s.position) filter (where s.mentioned and s.position is not null), 2),
    round(100 * avg(s.sentiment) filter (where s.mentioned), 1),
    round(100.0 * count(*) filter (where s.brand_cited) / nullif(count(*) filter (where s.n_cited > 0), 0), 1),
    coalesce(sum(s.w), 0)
  from pg_temp.fac_scored s
  group by s.engine_key;

  -- Per engine, competitors
  insert into public.competitor_daily (brand_id, user_id, competitor_id, day, engine_key, mentions, weight, avg_position)
  select p_brand, v_user, c.competitor_id, p_day, c.engine_key,
    count(*) filter (where c.mentioned), coalesce(sum(c.w), 0),
    round(avg(c.position) filter (where c.mentioned and c.position is not null), 2)
  from pg_temp.fac_comp c
  group by c.competitor_id, c.engine_key;

  -- All engines, competitors
  insert into public.competitor_daily (brand_id, user_id, competitor_id, day, engine_key, mentions, weight, avg_position)
  select p_brand, v_user, c.competitor_id, p_day, 'all',
    count(*) filter (where c.mentioned), coalesce(sum(c.w), 0),
    round(avg(c.position) filter (where c.mentioned and c.position is not null), 2)
  from pg_temp.fac_comp c
  group by c.competitor_id;

  -- All engines, brand (visibility is the engine-weighted mean, the rest are over all answers)
  insert into public.daily_scores (brand_id, user_id, day, engine_key, answers, visibility, mention_rate,
    avg_position, sentiment, citation_rate, brand_weight)
  select p_brand, v_user, p_day, 'all', count(*),
    (select round(sum(d.visibility * e.weight) / nullif(sum(e.weight), 0), 1)
       from public.daily_scores d join public.engines e on e.key = d.engine_key
       where d.brand_id = p_brand and d.day = p_day),
    round(100.0 * avg(s.mentioned::int), 1),
    round(avg(s.position) filter (where s.mentioned and s.position is not null), 2),
    round(100 * avg(s.sentiment) filter (where s.mentioned), 1),
    round(100.0 * count(*) filter (where s.brand_cited) / nullif(count(*) filter (where s.n_cited > 0), 0), 1),
    coalesce(sum(s.w), 0)
  from pg_temp.fac_scored s
  having count(*) > 0;

  -- Share of voice: brand weight / (brand weight + every tracked competitor's weight)
  update public.daily_scores d
    set share_of_voice = case when d.brand_weight + coalesce(t.cw, 0) > 0
      then round(100 * d.brand_weight / (d.brand_weight + coalesce(t.cw, 0)), 1) end
  from (
    select cd.engine_key, sum(cd.weight) as cw
    from public.competitor_daily cd
    where cd.brand_id = p_brand and cd.day = p_day
    group by cd.engine_key
  ) t
  where d.brand_id = p_brand and d.day = p_day and d.engine_key = t.engine_key;

  update public.daily_scores d
    set share_of_voice = case when d.brand_weight > 0 then 100.0 end
  where d.brand_id = p_brand and d.day = p_day and d.share_of_voice is null
    and not exists (select 1 from public.competitor_daily cd
                    where cd.brand_id = p_brand and cd.day = p_day and cd.engine_key = d.engine_key);

  update public.competitor_daily cd
    set share_of_voice = round(100 * cd.weight / nullif(ds.brand_weight + t.total, 0), 1)
  from public.daily_scores ds,
    (select engine_key, sum(weight) as total from public.competitor_daily
      where brand_id = p_brand and day = p_day group by engine_key) t
  where cd.brand_id = p_brand and cd.day = p_day
    and ds.brand_id = p_brand and ds.day = p_day and ds.engine_key = cd.engine_key
    and t.engine_key = cd.engine_key;

  update public.check_runs set scored_at = now()
  where brand_id = p_brand and status in ('complete', 'partial') and scored_at is null;
end;
$$;

-- Scores every brand that got new answers in the last 2 hours (hourly cron).
create or replace function public.score_recent_brands()
returns int language plpgsql security definer set search_path = '' as $$
declare
  v_brand uuid;
  v_n int := 0;
begin
  for v_brand in
    select distinct r.brand_id from public.check_results r
    where r.status = 'done' and r.checked_at > now() - interval '2 hours'
  loop
    perform public.compute_daily_scores(v_brand, current_date);
    v_n := v_n + 1;
  end loop;
  return v_n;
end;
$$;

-- Keeps the database small: raw answers older than 180 days are cleared,
-- parsed fields stay so charts and history keep working.
create or replace function public.trim_old_answers()
returns int language plpgsql security definer set search_path = '' as $$
declare
  v_n int;
begin
  update public.check_results set answer_text = null, annotations = null
  where checked_at < now() - interval '180 days' and answer_text is not null;
  get diagnostics v_n = row_count;
  return v_n;
end;
$$;

-- Everything generate-recommendations sends to Claude, built by SQL so the
-- model only ever sees real ids and URLs (PRD section 14.3).
create or replace function public.recommendation_inputs(p_brand uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'weak_prompts', (
      select coalesce(jsonb_agg(x), '[]'::jsonb) from (
        select tp.id, tp.text,
          round(avg(100 * public.position_weight(r.mentioned, r.position, r.answer_type, r.recommended)), 1) as visibility,
          (select coalesce(jsonb_agg(distinct e ->> 'name'), '[]'::jsonb)
             from public.check_results r2
             cross join lateral jsonb_array_elements(r2.competitor_mentions) e
             where r2.prompt_id = tp.id and r2.status = 'done'
               and r2.checked_at > now() - interval '14 days'
               and (e ->> 'mentioned')::boolean) as competitors_mentioned,
          (select coalesce(jsonb_agg(z.u), '[]'::jsonb) from (
             select u, count(*) as c
             from public.check_results r3 cross join lateral unnest(r3.cited_urls) as u
             where r3.prompt_id = tp.id and r3.status = 'done' and r3.checked_at > now() - interval '14 days'
             group by u order by c desc limit 5) z) as top_urls
        from public.tracked_prompts tp
        join public.check_results r on r.prompt_id = tp.id and r.status = 'done'
          and r.checked_at > now() - interval '14 days'
        where tp.brand_id = p_brand and tp.is_active
        group by tp.id, tp.text
        order by visibility asc
        limit 10) x),
    'top_domains', (
      select coalesce(jsonb_agg(t), '[]'::jsonb) from (
        select d as domain, count(*) as citations,
          bool_or(coalesce(r.mentioned, false)) as brand_mentioned,
          bool_or(r.brand_cited) as brand_cited
        from public.check_results r cross join lateral unnest(r.cited_domains) as d
        where r.brand_id = p_brand and r.status = 'done' and r.checked_at > now() - interval '14 days'
        group by d order by count(*) desc limit 15) t),
    'own_pages', (
      select coalesce(jsonb_agg(p), '[]'::jsonb) from (
        select url, title, page_type, left(coalesce(markdown, ''), 1500) as excerpt
        from public.site_pages where brand_id = p_brand and status = 'read'
        order by case page_type when 'home' then 0 when 'pricing' then 1 when 'product' then 2 else 3 end
        limit 10) p),
    'open_titles', (
      select coalesce(jsonb_agg(title), '[]'::jsonb)
      from public.recommendations where brand_id = p_brand and status in ('open', 'in_progress'))
  );
$$;

-- ---------------------------------------------------------------------
-- 14. Views for the dashboard (security_invoker = RLS still applies)
-- ELI5: a view is a saved query that looks like a table. Because it runs
-- "as the person asking", people only ever see their own brand's rows.
-- ---------------------------------------------------------------------
create or replace view public.v_latest_positions with (security_invoker = true) as
select distinct on (r.prompt_id, r.engine_key)
  r.brand_id, r.user_id, r.prompt_id, r.engine_key, r.id as result_id,
  r.mentioned, r.in_list, r.position, r.answer_type, r.checked_at
from public.check_results r
where r.status = 'done'
order by r.prompt_id, r.engine_key, r.checked_at desc;

create or replace view public.v_rank_changes with (security_invoker = true) as
with ranked as (
  select r.brand_id, r.user_id, r.prompt_id, r.engine_key, r.mentioned, r.position, r.checked_at,
    row_number() over (partition by r.prompt_id, r.engine_key order by r.checked_at desc) as rn
  from public.check_results r
  where r.status = 'done'
)
select cur.brand_id, cur.user_id, cur.prompt_id, tp.text as prompt_text, tp.is_pinned,
  cur.engine_key, cur.mentioned, cur.position,
  prev.mentioned as prev_mentioned, prev.position as prev_position, cur.checked_at,
  case
    when coalesce(cur.mentioned, false) and not coalesce(prev.mentioned, false) then 'new'
    when not coalesce(cur.mentioned, false) and coalesce(prev.mentioned, false) then 'lost'
    when cur.position is not null and prev.position is not null and cur.position <> prev.position then 'moved'
    else 'same' end as change,
  case when cur.position is not null and prev.position is not null then prev.position - cur.position end as places_gained
from ranked cur
join ranked prev on prev.prompt_id = cur.prompt_id and prev.engine_key = cur.engine_key and prev.rn = 2
join public.tracked_prompts tp on tp.id = cur.prompt_id
where cur.rn = 1;

create or replace view public.v_prompt_scores with (security_invoker = true) as
select tp.id as prompt_id, tp.brand_id, tp.user_id, tp.text, tp.intent, tp.region, tp.is_active, tp.is_pinned,
  (select jsonb_object_agg(lp.engine_key, jsonb_build_object('mentioned', lp.mentioned, 'position', lp.position, 'answer_type', lp.answer_type))
     from public.v_latest_positions lp where lp.prompt_id = tp.id) as latest,
  (select round(avg(100 * public.position_weight(r.mentioned, r.position, r.answer_type, r.recommended)), 1)
     from public.check_results r
     where r.prompt_id = tp.id and r.status = 'done' and r.checked_at > now() - interval '7 days') as visibility_7d,
  (select round(100.0 * avg(coalesce(r.mentioned, false)::int), 1)
     from public.check_results r
     where r.prompt_id = tp.id and r.status = 'done' and r.checked_at > now() - interval '7 days') as mention_rate_7d,
  (select max(r.checked_at) from public.check_results r where r.prompt_id = tp.id and r.status = 'done') as last_checked_at
from public.tracked_prompts tp;

create or replace view public.v_source_domains with (security_invoker = true) as
select r.brand_id, r.user_id, d.domain,
  count(*) as citations,
  count(distinct r.prompt_id) as prompts,
  array_agg(distinct r.engine_key) as engines,
  (d.domain = b.domain or d.domain like '%.' || b.domain) as is_own,
  bool_or(coalesce(r.mentioned, false)) as brand_mentioned,
  (select coalesce(array_agg(distinct e ->> 'name'), '{}')
     from public.check_results r2
     cross join lateral jsonb_array_elements(r2.competitor_mentions) e
     where r2.brand_id = r.brand_id and d.domain = any (r2.cited_domains)
       and r2.status = 'done' and r2.checked_at > now() - interval '14 days'
       and (e ->> 'mentioned')::boolean) as competitors_present
from public.check_results r
join public.brands b on b.id = r.brand_id
cross join lateral unnest(r.cited_domains) as d(domain)
where r.status = 'done' and r.checked_at > now() - interval '14 days'
group by r.brand_id, r.user_id, d.domain, b.domain;

create or replace view public.v_alerts with (security_invoker = true) as
select b.id as brand_id, b.user_id, 'visibility_drop' as kind,
  'Visibility fell ' || round(prev.visibility - cur.visibility, 1) || ' points this week' as message,
  null::text as engine_key
from public.brands b
join public.daily_scores cur on cur.brand_id = b.id and cur.engine_key = 'all' and cur.day = current_date
join public.daily_scores prev on prev.brand_id = b.id and prev.engine_key = 'all' and prev.day = current_date - 7
where b.alert_visibility_drop > 0 and prev.visibility - cur.visibility > b.alert_visibility_drop
union all
select b.id, b.user_id, 'competitor_overtake',
  c.name || ' passed you on ' || en.label, cd.engine_key
from public.brands b
join public.competitor_daily cd on cd.brand_id = b.id and cd.day = current_date and cd.engine_key <> 'all'
join public.competitors c on c.id = cd.competitor_id
join public.engines en on en.key = cd.engine_key
join public.daily_scores ds on ds.brand_id = b.id and ds.day = current_date and ds.engine_key = cd.engine_key
where b.alert_competitor_overtake and cd.share_of_voice > coalesce(ds.share_of_voice, 0)
union all
select b.id, b.user_id, 'lost_top',
  'You lost #1 on a pinned prompt: ' || left(rc.prompt_text, 60), rc.engine_key
from public.brands b
join public.v_rank_changes rc on rc.brand_id = b.id
where b.alert_lost_top and rc.is_pinned and rc.prev_position = 1 and rc.position is distinct from 1
  and rc.checked_at > now() - interval '1 day';

revoke all on public.v_latest_positions, public.v_rank_changes, public.v_prompt_scores,
  public.v_source_domains, public.v_alerts from anon;

-- ---------------------------------------------------------------------
-- 15. Row Level Security
-- ELI5: RLS is a bouncer on every table. Each policy below says who may
-- read or change which rows. Tables with only a select policy can be read
-- by their owner but only written by edge functions using the secret key.
-- ---------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.plans enable row level security;
alter table public.subscriptions enable row level security;
alter table public.stripe_events enable row level security;
alter table public.engines enable row level security;
alter table public.brands enable row level security;
alter table public.site_pages enable row level security;
alter table public.competitors enable row level security;
alter table public.tracked_prompts enable row level security;
alter table public.check_runs enable row level security;
alter table public.check_results enable row level security;
alter table public.daily_scores enable row level security;
alter table public.competitor_daily enable row level security;
alter table public.recommendations enable row level security;
alter table public.usage_ledger enable row level security;
alter table public.email_log enable row level security;
alter table public.recheck_log enable row level security;
alter table public.app_settings enable row level security;
alter table public.audits enable row level security;

-- profiles: read and edit your own
create policy "profiles select own" on public.profiles for select to authenticated
  using (id = (select auth.uid()));
create policy "profiles update own" on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- plans and engines: any signed-in user can read them (pricing and engine list)
create policy "plans select all" on public.plans for select to authenticated using (true);
create policy "engines select all" on public.engines for select to authenticated using (true);

-- subscriptions: read your own; only the Stripe webhook (secret key) writes
create policy "subscriptions select own" on public.subscriptions for select to authenticated
  using (user_id = (select auth.uid()));

-- brands: full control of your own rows (triggers protect server columns)
create policy "brands select own" on public.brands for select to authenticated
  using (user_id = (select auth.uid()));
create policy "brands insert own" on public.brands for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "brands update own" on public.brands for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "brands delete own" on public.brands for delete to authenticated
  using (user_id = (select auth.uid()));

-- competitors and prompts: your own, and only under a brand you own
create policy "competitors select own" on public.competitors for select to authenticated
  using (user_id = (select auth.uid()));
create policy "competitors insert own" on public.competitors for insert to authenticated
  with check (user_id = (select auth.uid()) and public.owns_brand(brand_id));
create policy "competitors update own" on public.competitors for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()) and public.owns_brand(brand_id));
create policy "competitors delete own" on public.competitors for delete to authenticated
  using (user_id = (select auth.uid()));

create policy "prompts select own" on public.tracked_prompts for select to authenticated
  using (user_id = (select auth.uid()));
create policy "prompts insert own" on public.tracked_prompts for insert to authenticated
  with check (user_id = (select auth.uid()) and public.owns_brand(brand_id));
create policy "prompts update own" on public.tracked_prompts for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()) and public.owns_brand(brand_id));
create policy "prompts delete own" on public.tracked_prompts for delete to authenticated
  using (user_id = (select auth.uid()));

-- read-only for the owner; written only by edge functions
create policy "site_pages select own" on public.site_pages for select to authenticated
  using (user_id = (select auth.uid()));
create policy "check_runs select own" on public.check_runs for select to authenticated
  using (user_id = (select auth.uid()));
create policy "check_results select own" on public.check_results for select to authenticated
  using (user_id = (select auth.uid()));
create policy "daily_scores select own" on public.daily_scores for select to authenticated
  using (user_id = (select auth.uid()));
create policy "competitor_daily select own" on public.competitor_daily for select to authenticated
  using (user_id = (select auth.uid()));
create policy "usage_ledger select own" on public.usage_ledger for select to authenticated
  using (user_id = (select auth.uid()));
create policy "email_log select own" on public.email_log for select to authenticated
  using (user_id = (select auth.uid()));
create policy "recheck_log select own" on public.recheck_log for select to authenticated
  using (user_id = (select auth.uid()));

-- recommendations: read your own, change status only (trigger enforces)
create policy "recommendations select own" on public.recommendations for select to authenticated
  using (user_id = (select auth.uid()));
create policy "recommendations update own" on public.recommendations for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- stripe_events, app_settings and audits have RLS on and no policies:
-- nobody but the secret key can read or write them.

-- ---------------------------------------------------------------------
-- 16. Lock internal functions away from the browser
-- ELI5: Supabase lets signed-in users call database functions over the
-- API. These ones move money or queue jobs, so only the secret key may run them.
-- ---------------------------------------------------------------------
revoke execute on function public.current_plan(uuid) from public, anon, authenticated;
revoke execute on function public.month_spend(uuid) from public, anon, authenticated;
revoke execute on function public.create_run(uuid, public.run_kind, timestamptz, uuid, boolean) from public, anon, authenticated;
revoke execute on function public.schedule_due_runs(int) from public, anon, authenticated;
revoke execute on function public.claim_check_jobs(int) from public, anon, authenticated;
revoke execute on function public.release_stuck_jobs() from public, anon, authenticated;
revoke execute on function public.finish_runs() from public, anon, authenticated;
revoke execute on function public.skip_budget_jobs(uuid) from public, anon, authenticated;
revoke execute on function public.compute_daily_scores(uuid, date) from public, anon, authenticated;
revoke execute on function public.score_recent_brands() from public, anon, authenticated;
revoke execute on function public.trim_old_answers() from public, anon, authenticated;
revoke execute on function public.recommendation_inputs(uuid) from public, anon, authenticated;
revoke execute on function public.plan_limits(uuid) from public, anon;
revoke execute on function public.has_active_access(uuid) from public, anon;
grant execute on function public.plan_limits(uuid) to authenticated, service_role;
grant execute on function public.has_active_access(uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------
-- 17. Realtime (live progress bars)
-- ELI5: Realtime pushes new rows to the browser as they are written, so
-- the onboarding scrape list and the run progress bar fill in live.
-- RLS still applies: you only receive your own rows.
-- ---------------------------------------------------------------------
alter publication supabase_realtime add table public.site_pages, public.check_runs, public.check_results;

-- ---------------------------------------------------------------------
-- 18. Storage: CSV exports
-- ELI5: a private bucket where /api/export writes CSV files into a folder
-- named after the user id. Users can download only their own folder.
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('exports', 'exports', false, 10485760, array['text/csv'])
on conflict (id) do nothing;

create policy "exports read own folder" on storage.objects for select to authenticated
  using (bucket_id = 'exports' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "exports delete own folder" on storage.objects for delete to authenticated
  using (bucket_id = 'exports' and (storage.foldername(name))[1] = (select auth.uid())::text);
-- No insert or update policy: only the server (secret key) writes export files.

-- Done. Next: schedule the cron jobs (Backend phase task "Schedule the checks").
`
