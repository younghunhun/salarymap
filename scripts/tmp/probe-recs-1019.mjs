import { sb } from '../outreach/lib.mjs'
const { data } = await sb.from('job_recommendations').select('*').order('id',{ascending:false}).limit(2)
console.log(Object.keys(data?.[0]||{}).join(', ')); console.log(JSON.stringify(data?.[0]).slice(0,800))
const { count } = await sb.from('job_recommendations').select('id',{count:'exact',head:true}); console.log('total recs', count)
const { data: a } = await sb.from('job_applications').select('application_source').gte('created_at','2026-09-01')
const d={}; for (const r of a||[]) d[r.application_source||'(null)']=(d[r.application_source||'(null)']||0)+1; console.log('app sources since 9/1', JSON.stringify(d))
