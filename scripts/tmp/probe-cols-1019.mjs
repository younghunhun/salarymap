import { sb } from '../outreach/lib.mjs'
for (const t of ['jobs','job_applications','submissions','user_profiles','ktc_candidates','ktc_hires']) { const { data, error } = await sb.from(t).select('*').limit(1); console.log('\n##', t, error?.message||'', Object.keys(data?.[0]||{}).join(', ')) }
const { data: j } = await sb.from('jobs').select('source_id,title,structured_jd,requirements,description,languages,korean_level,language_requirements').eq('source','ktc').eq('source_id','V249').limit(1)
console.log('\nV249 sample:', JSON.stringify(j?.[0]||{}).slice(0,2500))
