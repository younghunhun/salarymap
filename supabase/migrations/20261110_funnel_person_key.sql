-- ─────────────────────────────────────────────────────────────────────────────
-- 퍼널 정확도 수정 (2026-11-10) — 붙여넣기 한 번으로 전부 적용
--
-- [A] 사람 키 통합 (person_key)
--   문제: ev.user_key = coalesce(client_id, user_id). 웹 이벤트는 브라우저 ID(client_id)로,
--         앱·서버 이벤트(resume_registered·coldmail_*·app_open·recommend_click 등)는 client_id 가
--         없어 user_id 로 잡혀, 같은 사람이 두 키로 갈라졌다.
--         예) 가입→이력서 등록 퍼널 2명 (실제 가입자 1,467명 중 909명 등록).
--   해결: 브라우저↔회원 매핑(client_identity)을 두고, 이벤트마다 person_key 를 저장한다.
--         · user_id 있음            → user_id
--         · client_id 만, 매핑 있음 → 매핑된 user_id (로그인 전 같은 브라우저 기록도 회원에 합침)
--         · client_id 만, 매핑 없음 → client_id (비회원 방문자)
--         새 이벤트는 트리거가 채우고, 브라우저가 처음 로그인하면 그 브라우저의 익명 기록을 소급 갱신.
--   한 브라우저를 여러 회원이 쓰면 익명 기록은 처음 로그인한 회원에게 붙는다(드묾).
--   과거 행 백필은 이 스크립트가 하지 않는다 — 긴 트랜잭션·행 잠금을 피하려고
--   _backfill_person_key(배치) RPC 를 따로 반복 호출한다 (scripts 쪽에서 실행).
--   백필이 끝나기 전에는 person_key 가 비어 있는 과거 행이 퍼널에서 빠진다(어드민 분석만 영향).
--
-- [B] 순서무관(any) 모드 누적 의미론 — 앞 단계를 모두 거친 사람만 다음 단계로 인정.
--
-- ⚠ 수동 적용: Supabase 대시보드 SQL 에디터에 전체 붙여넣기 (db push 금지 환경).
-- ─────────────────────────────────────────────────────────────────────────────

-- [A1] 브라우저 ↔ 회원 매핑 ------------------------------------------------------
create table if not exists public.client_identity (
  client_id  text primary key,
  user_id    uuid not null,
  first_seen timestamptz not null default now()
);
alter table public.client_identity enable row level security; -- 정책 없음 = service_role 만
revoke all on public.client_identity from anon, authenticated;

insert into public.client_identity (client_id, user_id, first_seen)
select distinct on (client_id) client_id, user_id, created_at
  from public.events
 where client_id is not null and user_id is not null
 order by client_id, created_at asc
on conflict (client_id) do nothing;

-- [A2] person_key 컬럼 + 인덱스 -------------------------------------------------
alter table public.events add column if not exists person_key text;
-- 퍼널 상관 서브쿼리 (person_key = ? and event = ? and ts range) 전용
create index if not exists idx_events_person_event_ts on public.events (person_key, event, created_at);
-- 소급 갱신(client_id = ? and user_id is null) 전용
create index if not exists idx_events_client_anon on public.events (client_id) where user_id is null;

-- [A3] 트리거 --------------------------------------------------------------------
create or replace function public._events_set_person_key() returns trigger
language plpgsql security definer set search_path = public as $$
declare uid uuid;
begin
  if new.user_id is not null then
    new.person_key := new.user_id::text;
  elsif new.client_id is not null then
    select ci.user_id into uid from public.client_identity ci where ci.client_id = new.client_id;
    new.person_key := coalesce(uid::text, new.client_id);
  else
    new.person_key := null;
  end if;
  return new;
end $$;

create or replace function public._events_link_identity() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.client_id is not null and new.user_id is not null then
    insert into public.client_identity (client_id, user_id, first_seen)
    values (new.client_id, new.user_id, new.created_at)
    on conflict (client_id) do nothing;
    if found then -- 이 브라우저의 첫 로그인 → 익명 기록을 회원 키로 소급
      update public.events set person_key = new.user_id::text
       where client_id = new.client_id and user_id is null
         and person_key is distinct from new.user_id::text;
    end if;
  end if;
  return null;
end $$;

drop trigger if exists trg_events_person_key on public.events;
create trigger trg_events_person_key before insert on public.events
  for each row execute function public._events_set_person_key();
drop trigger if exists trg_events_link_identity on public.events;
create trigger trg_events_link_identity after insert on public.events
  for each row execute function public._events_link_identity();

-- [A4] 과거 행 백필 (배치) — 반환값 = 이번에 채운 행 수, 0 이면 끝 ------------------
create or replace function public._backfill_person_key(p_limit int default 50000)
returns int language plpgsql security definer set search_path = public as $$
declare n int;
begin
  with b as (
    select e.ctid as rid
      from public.events e
     where e.person_key is null and (e.user_id is not null or e.client_id is not null)
     limit greatest(1, least(coalesce(p_limit, 50000), 200000))
  )
  update public.events e
     set person_key = coalesce(e.user_id::text,
                               (select ci.user_id::text from public.client_identity ci where ci.client_id = e.client_id),
                               e.client_id)
    from b
   where e.ctid = b.rid;
  get diagnostics n = row_count;
  return n;
end $$;

-- [A5] 어댑터 뷰 — 이후 모든 퍼널 함수가 person_key 로 사람을 센다 -----------------
-- user_key 는 인덱스 컬럼과 같은 맨 컬럼이어야 플래너가 idx_events_person_event_ts 를 탄다.
create or replace view public.ev with (security_invoker = on) as
select
  e.created_at                              as ts,
  e.event::text                             as event_name,
  e.person_key                              as user_key,
  coalesce(e.meta, '{}'::jsonb)
    || jsonb_build_object('page', e.page)   as props
from public.events e;

-- [B] 순서무관(any) 누적 의미론 ---------------------------------------------------
create or replace function public._funnel_rows(
  p_steps    jsonb,
  p_from     timestamptz,
  p_to       timestamptz,
  p_window   interval default interval '1 day',
  p_order    text     default 'this',
  p_segment  jsonb    default '[]'::jsonb,
  p_group_by text     default null,
  p_exclude  text     default null
) returns table (user_key text, seg text, t timestamptz[], tx timestamptz)
language plpgsql stable as $$
declare
  n int; i int; names text[]; win interval;
  seg_expr text; lower_ref text; exact_cond text;
  arr_elems text := 's1.t1'; laterals text := ''; excl text; q text;
  prev_ok text := 'true';
begin
  n := coalesce(jsonb_array_length(p_steps), 0);
  if n < 1 or n > 10 then raise exception 'p_steps must have 1..10 steps'; end if;
  if p_order not in ('this', 'any', 'exact') then raise exception 'p_order must be this|any|exact'; end if;
  win := greatest(interval '1 second', least(coalesce(p_window, interval '1 day'), interval '366 days'));

  select array_agg(s ->> 'event') into names from jsonb_array_elements(p_steps) s;
  if exists (select 1 from unnest(names) x where x is null or x !~ '^[a-zA-Z0-9_.:-]{1,64}$') then
    raise exception 'bad event name in p_steps';
  end if;
  if p_exclude is not null and p_exclude !~ '^[a-zA-Z0-9_.:-]{1,64}$' then
    raise exception 'bad p_exclude';
  end if;

  seg_expr := case when p_group_by is null then 'null::text'
                   else format('e.props ->> %L', p_group_by) end;

  for i in 2..n loop
    lower_ref := case when p_order = 'any' or i = 2 then 's1.t1' else format('s%s.t', i - 1) end;
    exact_cond := case when p_order = 'exact' then
      format(' and not exists (select 1 from public.ev x where x.user_key = s1.user_key'
             || ' and x.ts > %s and x.ts < e.ts and x.event_name <> all (%L::text[]))',
             case when i = 2 then 's1.t1' else format('s%s.t', i - 1) end, names)
      else '' end;
    laterals := laterals || format(
      ' cross join lateral (select min(e.ts) as t from public.ev e'
      || ' where e.user_key = s1.user_key and e.event_name = %L'
      || ' and e.ts >= %s and e.ts <= s1.t1 + %L::interval%s%s) s%s',
      names[i], lower_ref, win, exact_cond,
      public._funnel_where(p_steps -> (i - 1) -> 'where', 'e'), i);
    if p_order = 'any' then
      -- 누적: 앞 단계를 모두 거친 사람만 이 단계 도달로 인정 (순서는 무관)
      arr_elems := arr_elems || format(', case when %s then s%s.t end', prev_ok, i);
      prev_ok := prev_ok || format(' and s%s.t is not null', i);
    else
      arr_elems := arr_elems || format(', s%s.t', i);
    end if;
  end loop;

  excl := case when p_exclude is null
    then ' left join lateral (select null::timestamptz as tx) ex on true'
    else format(' left join lateral (select min(e.ts) as tx from public.ev e'
                || ' where e.user_key = s1.user_key and e.event_name = %L'
                || ' and e.ts > s1.t1 and e.ts <= s1.t1 + %L::interval) ex on true',
                p_exclude, win) end;

  q := format(
    'with s1 as (select distinct on (e.user_key) e.user_key, e.ts as t1, %s as seg'
    || ' from public.ev e where e.user_key is not null and e.event_name = %L'
    || ' and e.ts >= %L and e.ts < %L%s%s'
    || ' order by e.user_key, e.ts asc)'
    || ' select s1.user_key, s1.seg, array[%s]::timestamptz[] as t, ex.tx from s1%s%s',
    seg_expr, names[1], p_from, p_to,
    public._funnel_where(p_steps -> 0 -> 'where', 'e'),
    public._funnel_where(p_segment, 'e'),
    arr_elems, laterals, excl);

  return query execute q;
end $$;

revoke all on function public._funnel_rows(jsonb, timestamptz, timestamptz, interval, text, jsonb, text, text) from public, anon, authenticated;

-- [권한] -------------------------------------------------------------------------
revoke all on function public._events_set_person_key() from public, anon, authenticated;
revoke all on function public._events_link_identity() from public, anon, authenticated;
revoke all on function public._backfill_person_key(int) from public, anon, authenticated;
