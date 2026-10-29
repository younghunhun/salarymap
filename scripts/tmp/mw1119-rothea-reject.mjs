// R228 Rothea 지원자 탈락 사유 확인. 읽기 전용.
import { sb } from '../outreach/lib.mjs'
const { data: one } = await sb.from('ktc_candidates').select('*').eq('job_code', 'R228').limit(1)
console.log('cols:', Object.keys(one?.[0] || {}).join(', '))
const { data } = await sb.from('ktc_candidates').select('*').eq('job_code', 'R228')
for (const c of data) { const o = {}; for (const [k, v] of Object.entries(c)) if (v != null && v !== '' && !/^(id|email|phone|cv_url|resume|created_at|updated_at)$/.test(k)) o[k] = typeof v === 'string' ? v.slice(0, 400) : v; console.log('\n', JSON.stringify(o)) }
