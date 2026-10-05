// First Marketing Company 그래픽 디자이너 2공고 조회 (읽기 전용)
import { sb } from '../outreach/lib.mjs'

const { data, error } = await sb.from('jobs')
  .select('*')
  .ilike('company', '%dat est%')
  .order('created_at', { ascending: false })
if (error) { console.error(error); process.exit(1) }
for (const j of data) {
  console.log('='.repeat(80))
  const { description, requirements, responsibilities, preferred, ...rest } = j
  console.log(JSON.stringify(rest, null, 1))
  console.log('--- description\n' + String(description || '').slice(0, 2500))
  console.log('--- requirements\n' + JSON.stringify(requirements, null, 1)?.slice(0, 1500))
  console.log('--- preferred\n' + JSON.stringify(preferred, null, 1)?.slice(0, 800))
}
