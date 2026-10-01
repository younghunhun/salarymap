-- 가입 시점 utm_content 저장 (FB 그룹·게시글 단위 귀속용). 대시보드 SQL 에디터에서 수동 적용.
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS utm_content text;
COMMENT ON COLUMN user_profiles.utm_content IS '가입 랜딩 URL의 utm_content (게시글/그룹 식별, pages/auth/callback.js)';
