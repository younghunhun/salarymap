// 11/19 매칭위크: NALDA UI/UX(R201) 추가, 풀스택 2건(NA3401·R199) 페이지에서 제외(엠마 요청 2026-11-16). 공고 활성 상태는 건드리지 않음
import { createClient } from '@supabase/supabase-js';
const c = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const SET = { R201: true, NA3401: false, R199: false };
const { data, error } = await c.from('jobs').select('id,source_id,title,raw_payload').eq('source','ktc').in('source_id', Object.keys(SET)).ilike('company','%nalda%');
if (error) throw error;
for (const j of data) {
  const rp = j.raw_payload || {};
  const { error: e } = await c.from('jobs').update({ raw_payload: { ...rp, ktc: { ...(rp.ktc || {}), is_matching_week: SET[j.source_id] } } }).eq('id', j.id);
  if (e) throw e;
  console.log(j.source_id, j.title, '→', SET[j.source_id]);
}
