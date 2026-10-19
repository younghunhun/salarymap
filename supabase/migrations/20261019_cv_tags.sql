-- 이력서 재파싱 태그(cv_tags) — 2026-10-19
--
-- 기존 파서(lib/parseResume.js)는 직군 1개·연차·학교·어학 자유문자열까지만 뽑아서, 비IT 공고의
-- 콜드메일 대상 산정을 공고마다 손으로 짠 정규식으로 하고 있었다(영업·재무·사무 공고 발송의 61%가
-- 직군 불일치, 응답 3~4%). 공고 자격요건이 실제로 묻는 항목(연차 89%·산업 67%·영어 61%·한국어 43%·
-- 학위/전공 30%·툴 20%·한국기업 경력 11%·거주지 10%·성별/나이 3%)을 enum 으로 다시 뽑아 여기 둔다.
--
-- 기존 컬럼은 건드리지 않는다(사람이 넣은 값 보호 규칙 유지). resume_summary 는 재파싱 시 통째로
-- 덮이므로 거기 넣지 않고 별도 컬럼으로 둔다. 스키마는 scripts/backfill-cv-tags.mjs 의 CV_TAGS_SCHEMA.
alter table public.user_profiles
  add column if not exists cv_tags jsonb,
  add column if not exists cv_tags_at timestamptz,
  add column if not exists cv_tags_model text;

create index if not exists user_profiles_cv_tags_gin on public.user_profiles using gin (cv_tags);
