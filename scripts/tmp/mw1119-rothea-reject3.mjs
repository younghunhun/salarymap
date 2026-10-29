// R228 지원자 프로필(cv_tags) vs JD 요건. 읽기 전용.
import { sb } from '../outreach/lib.mjs'
const { data: job } = await sb.from('jobs').select('id,description').eq('source_id', 'R228').single()
const d = job.description; const i = d.search(/II\.|YÊU CẦU/i); console.log('JD 요건:\n', d.slice(i, i + 1800))
const { data: apps } = await sb.from('job_applications').select('user_id,status,applicant_name,utm_campaign').eq('job_id', job.id)
const idCol = 'id'
for (const a of apps) {
  const { data: p } = await sb.from('user_profiles').select('*').eq(idCol, a.user_id).maybeSingle()
  const t = p?.cv_tags || {}
  console.log(`\n[${a.status}] ${a.applicant_name} (${a.utm_campaign || 'direct'})`)
  console.log('  ', p ? JSON.stringify({ pos: p.position, loc: p.location, cv: t }).slice(0, 1400) : 'NO PROFILE')
}
