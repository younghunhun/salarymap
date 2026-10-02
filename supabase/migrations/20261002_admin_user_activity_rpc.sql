-- 인재 공급 탭(/api/admin/talent-supply) 성능: 로그인 식별 events 19만 행을 1000행씩 193페이지 순차로 받던 것을
-- DB 에서 유저별 요약(최근 N일 방문 여부 · 서로 다른 방문일 수, VN 날짜 기준)으로 집계해 반환.
-- 호출: supabase.rpc('admin_user_activity', { p_since: <7일 전 ISO> })
-- 적용: 대시보드 SQL 에디터에서 수동 실행(db push 금지 규칙). API 는 함수가 없으면 옛 전량 스캔으로 폴백한다.
create or replace function admin_user_activity(p_since timestamptz)
returns table(user_id uuid, recent7d boolean, visit_days integer)
language sql
stable
security definer
set search_path = public
as $$
  select user_id,
         bool_or(created_at >= p_since) as recent7d,
         count(distinct (created_at at time zone 'Asia/Ho_Chi_Minh')::date)::integer as visit_days
  from events
  where user_id is not null
  group by user_id
$$;

revoke all on function admin_user_activity(timestamptz) from public, anon, authenticated;
grant execute on function admin_user_activity(timestamptz) to service_role;
