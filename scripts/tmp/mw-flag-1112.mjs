// 11/19 HCM 매칭위크 참가사(15사 + D3) 활성 KTC 공고에 raw_payload.ktc.is_matching_week=true
import { createClient } from '@supabase/supabase-js';
const c = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const COS = ['Camon Social','Andwise','Jinosys','MNF Solution','Solarnix','The Waves','Bada Fintech','Rothea','NALDA','Papacompany','Answer Labs','Until','Hyperstar','Nexacode','PickCare','D3','D3 Company'];
const dry = !process.argv.includes('--apply');
const { data, error } = await c.from('jobs').select('id,source_id,company,title,raw_payload').eq('source','ktc').eq('is_active',true);
if (error) throw error;
const hit = data.filter(j => COS.includes((j.company||'').trim()));
for (const j of hit) {
  console.log(j.source_id, '|', j.company.trim(), '|', j.title.slice(0,50), j.raw_payload?.ktc?.is_matching_week ? '(already)' : '');
  if (dry) continue;
  const rp = j.raw_payload || {};
  const { error: e } = await c.from('jobs').update({ raw_payload: { ...rp, ktc: { ...(rp.ktc || {}), is_matching_week: true } } }).eq('id', j.id);
  if (e) throw e;
}
console.log(dry ? 'DRY' : 'APPLIED', hit.length, 'companies', new Set(hit.map(j=>j.company.trim())).size);
