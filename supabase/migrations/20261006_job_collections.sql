-- 공고 묶음(캠페인 랜딩) — 메타 광고 등에서 "회사 채용 링크 대신 우리 공고 N건만" 보여주는
-- 짧은 공개 링크 /l/<slug>. 2026-10-06
--
-- 기존 /jobs?ids=uuid,uuid 딥링크(41ab669)는 URL 이 길고, OG 제목/이미지가 /jobs 기본값이라
-- 광고 미리보기가 캠페인과 무관하게 보였고, 어떤 캠페인에 어떤 공고를 묶었는지 기록이 없었다.
-- 이 표가 그 셋을 해결한다: slug 가 곧 짧은 URL, title/description/og_image_url 이 미리보기,
-- 행 자체가 캠페인 기록. utm_* 는 어드민이 "광고 링크 복사" 할 때 붙여 주는 기본값일 뿐이고
-- 실제 귀속은 방문 URL 의 utm 쿼리(lib/utm.js)로 잡힌다.
--
-- 공개 페이지(/l/[slug])는 SSR 에서 service role 로 읽고, 공고 목록은 /api/jobs(active only)를
-- 그대로 쓰므로 비활성 공고는 자동으로 빠진다. anon 정책은 두지 않는다.

create table if not exists public.job_collections (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text,
  job_ids uuid[] not null default '{}',
  og_image_url text,
  utm_source text not null default 'meta',       -- 유료 메타 광고 분류값 (revenue-metrics·admin-metrics 기준). facebook 은 오가닉 게시물
  utm_medium text not null default 'paid',
  utm_campaign text,
  is_active boolean not null default true,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint job_collections_slug_format check (slug ~ '^[a-z0-9][a-z0-9-]{1,59}$')
);

alter table public.job_collections enable row level security;
-- 정책 없음 = anon/authenticated 접근 불가, service_role 만 사용
