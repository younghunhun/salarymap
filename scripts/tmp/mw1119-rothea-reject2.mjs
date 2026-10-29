// R228 지원자 지원서 상태·사유 + 프로필 cv_tags. 읽기 전용.
import { sb } from '../outreach/lib.mjs'
const { data: job } = await sb.from('jobs').select('id,description').eq('source_id', 'R228').single()
console.log('JD:\n', job.description.slice(0, 2500))
const { data: apps } = await sb.from('job_applications').select('*').eq('job_id', job.id)
console.log('\napp cols:', Object.keys(apps[0]).join(', '))
for (const a of apps) {
  const o = {}; for (const [k, v] of Object.entries(a)) if (v != null && v !== '' && !/cover|resume_url|answers/.test(k)) o[k] = typeof v === 'string' ? v.slice(0, 300) : v
  const { data: p } = await sb.from('profiles').select('*').eq('id', a.user_id).maybeSingle()
  console.log('\n## app', JSON.stringify(o))
  if (p) console.log('   profile:', JSON.stringify({ name: p.full_name || p.name, city: p.city || p.location, headline: p.headline, yoe: p.years_of_experience, cv_tags: p.cv_tags }).slice(0, 900))
}
