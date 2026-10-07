-- Supabase Security Advisor 지적 2건 정리 (재실행 안전)
-- 2026-10-07
--
-- 1) cron_locks: RLS 미설정 (rls_disabled_in_public)
--    레포 마이그레이션에 create 가 없는 대시보드 수제 테이블. 쓰는 곳은
--    supabase/functions/daily-summary 의 acquireSendLock 한 곳이고 service role
--    (RLS 우회)이라 RLS 만 켜고 정책은 두지 않는다 → anon/authenticated 접근 전부 차단.
--
-- 2) recruiter_jobs 뷰: SECURITY DEFINER (security_definer_view)
--    20260518 에서 drop 했는데 DB 에는 남아 있다(대시보드에서 재생성된 듯). 코드 참조 0건,
--    docs/ATS_STATUS.md 에 "관리 편의용 조회 뷰 - 유지"로 기록돼 있어 삭제 대신
--    security_invoker 로 바꿔 jobs / recruiter_companies 의 RLS 가 조회자 기준으로 적용되게 한다.

ALTER TABLE public.cron_locks ENABLE ROW LEVEL SECURITY;

ALTER VIEW public.recruiter_jobs SET (security_invoker = on);
