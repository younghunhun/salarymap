-- 후보자 블랙리스트 — 면접 당일 노쇼·직전 취소로 기업 일정을 망친 지원자를 지원·추천에서 막는다.
-- 원본은 ops 시트(Qualified Candidates 스프레드시트 'Blacklist' 탭, 이메일 키) → lib/ktcCandidatesSync.syncBlacklist() 가
-- source='sheet' 행을 전량 재적재. 어드민에서 직접 넣은 행은 source='admin' 으로 남아 시트 동기화에 지워지지 않는다.
-- 읽는 곳: /api/job-applications · /api/resume/quick-apply (지원 차단), /api/admin/resumes · talent-recommend · similar-recommend
--          (추천 제외), scripts/outreach/lib.mjs fetchBlacklist() (콜드메일 제외). 관리: 어드민 ?tab=blacklist.
-- 적용: 대시보드 SQL 에디터에서 수동 실행 (db push 금지)
create table if not exists candidate_blacklist (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  user_id uuid,                       -- user_profiles.id 매칭 결과(없으면 null) — 로그인 지원은 이걸로, 익명 지원은 email 로 막는다
  full_name text,
  company text,                       -- 어느 기업 일정을 망쳤나
  position text,
  cv_url text,
  reason text,
  source text not null default 'sheet',  -- 'sheet' | 'admin'
  added_by text,                      -- admin 이메일(source='admin')
  synced_at timestamptz,
  created_at timestamptz default now()
);
create unique index if not exists candidate_blacklist_email_unique on candidate_blacklist (lower(email));
create index if not exists candidate_blacklist_user_id on candidate_blacklist (user_id);
-- 어드민 전용: RLS 활성화 + 정책 없음 → service_role 만 접근 가능
alter table candidate_blacklist enable row level security;
