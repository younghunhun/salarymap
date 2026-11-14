// 11/19 HCM 매칭위크 VN 리드 참가사(Golfzon·First Marketing·COBI) 공고에 raw_payload.ktc.is_matching_week=true
// 대상 = 엠마 마스터시트 'Company List' 탭 JD 링크의 jobId (2026-11-14)
import { createClient } from '@supabase/supabase-js';
const c = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const IDS = ['6f249ff4-73c0-4643-8b66-4fe2e77e171d','b0b166f3-dff9-47df-b9c0-c30ac482736e',
 '977845b0-ccc5-4700-86c0-e16ca5016dd0','75b1b285-78b0-4ef2-a59e-b314126896f7','aa21a816-8ab2-493d-911f-70322a9793fd','83d88e5e-ef8c-4e31-8934-0541adc49473','943d3779-0e18-4139-8c3a-935428f0724f','34e07af1-38c9-4621-9306-cc977135fbfc','d86744f2-0e7c-4288-9ead-3d1f09fa07fb','02c64540-273f-42b2-ac0f-b2c30315673d','dafcf3ff-48fa-4f0e-a376-f3ede4427f8e',
 '14eeba9a-2e0e-4ee7-88e8-b740f99d5d4b','b4e03e0d-011d-4ed8-9254-9520095f731c','b1aa1b76-6559-47ec-b2c7-427fc1627a27','42085d8b-407a-4d63-82c9-07b312a60c29'];
const dry = !process.argv.includes('--apply');
const { data, error } = await c.from('jobs').select('id,source_id,company,title,is_active,logo_url,company_url,raw_payload').in('id', IDS);
if (error) throw error;
console.log('found', data.length, '/', IDS.length);
for (const j of data) {
  console.log(j.source_id, j.is_active ? 'ACTIVE' : 'OFF', '|', j.company, '|', j.title.slice(0, 50), '| logo', !!(j.logo_url||j.raw_payload?.ktc?.company_logo), '| url', j.company_url || j.raw_payload?.ktc?.company_website || '-', j.raw_payload?.ktc?.is_matching_week ? '(already)' : '');
  if (dry) continue;
  const rp = j.raw_payload || {};
  const { error: e } = await c.from('jobs').update({ raw_payload: { ...rp, ktc: { ...(rp.ktc || {}), is_matching_week: true } } }).eq('id', j.id);
  if (e) throw e;
}
console.log(dry ? 'DRY' : 'APPLIED');
