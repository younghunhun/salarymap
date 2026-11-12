-- 공고별 자기소개서 답변 (문항은 lib/jobEssays.js)
--
-- 기업이 변별용 자소서를 요청한 공고에서, 지원 시(/ktc/jobs/[id]) 또는 메일 링크(/ktc/essay)로 받는다.
-- (공고, 이메일) 당 1행 — 다시 제출하면 덮어쓴다. 메일 링크 지원자는 세션이 없어 이메일이 신원이다.

create table if not exists public.job_essays (
  id          uuid primary key default gen_random_uuid(),
  job_id      uuid not null references public.jobs(id) on delete cascade,
  email       text not null,                 -- 소문자 정규화
  user_id     uuid,                          -- 로그인 지원이면 auth uid, 메일 경로면 프로필 id(없으면 null)
  answers     jsonb not null,                -- { 문항키: 답 }
  source      text not null,                 -- 'apply' = 지원 시 작성 · 'mail' = 메일 링크
  campaign    text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (job_id, email)
);

-- 개인이 쓴 원문이라 클라이언트에 열지 않는다(서비스 롤 전용, 정책 없음).
alter table public.job_essays enable row level security;

comment on table public.job_essays is '공고별 자기소개서 답변. 문항은 lib/jobEssays.js';
