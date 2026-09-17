-- 이력서 등록(resume_url 최초 세팅) 계측.
-- 이력서가 프로필에 들어오는 경로가 다섯 개(/cv, /profile 업로드, 앱 직접 write, 공고 지원 동기화,
-- KTC 클레임 임포트)인데 클라이언트 이벤트(cv_register_success / resume_upload / ktc_cv_import)는
-- 그중 셋만 남겨서, 공고 지원으로 들어온 이력서가 어드민 추이·슬랙봇 일별 집계에서 통째로 빠졌다.
-- 공개 전환(20260731)과 마찬가지로 전 경로를 한 번에 잡는 지점은 DB 트리거뿐이다.
-- "등록" = 인재풀 진입(null → 값). 파일 교체는 세지 않는다(유저 확정 8/14: 이력서풀 = 파일 등록한 사람 수).
-- 과거분은 scripts/backfill-resume-registered.js 가 유저당 1건씩 채운다 → 이벤트 합 = 인재풀 크기.
-- ⚠️ 수동 적용: Supabase 대시보드 SQL 에디터에서 실행 (db push 금지 — 히스토리 미동기)
--    적용 순서: 이 SQL → 백필 스크립트(--apply) → 코드 배포.

create or replace function log_resume_registered()
returns trigger
language plpgsql
security definer -- 앱은 유저 JWT로 직접 upsert 하므로 정의자 권한이어야 events에 쓸 수 있다
set search_path = public
as $$
begin
  if new.resume_url is null then return new; end if;
  if tg_op = 'UPDATE' and old.resume_url is not null then return new; end if; -- 파일 교체는 제외
  insert into events (event, page, meta, user_id)
  values (
    'resume_registered',
    'db_trigger',
    jsonb_build_object('platform', new.resume_platform, 'source', new.resume_source),
    new.id
  );
  return new;
end;
$$;

drop trigger if exists trg_resume_registered on user_profiles;
create trigger trg_resume_registered
after insert or update of resume_url on user_profiles
for each row
execute function log_resume_registered();
