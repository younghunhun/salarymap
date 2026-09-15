// 읽기 전용 — SLA1 위반 JD의 후보 pipeline_status 내역 (전달됨 vs 심사만 구분)
import { sb, fetchAll } from '/Users/wiseungju/salarymap/scripts/outreach/lib.mjs'
const cands = await fetchAll(() => sb.from('ktc_candidates').select('job_code,applied_company,applied_at,pipeline_status').order('id'))
const norm = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').normalize('NFC').replace(/주식회사|\(주\)|co\.?,?\s*ltd\.?|company|corp\.?|\.|\s+/g, '').trim()
const TARGETS = [
  ['First Marketing', '2026-08-31'], ['Sunjin', '2026-08-31'], ['QNT', '2026-09-04'], ['SKTax', '2026-09-04'],
  ['HIVELAB', '2026-09-08'], ['모티브픽쳐스', '2026-09-08'], ['유피드', '2026-09-03'], ['코스모스소프트', '2026-09-09'],
  ['코망', '2026-09-03'], ['오버레이', '2026-09-04'], ['웬컴퍼니', '2026-09-09'],
]
for (const [name, since] of TARGETS) {
  const nk = norm(name)
  const pool = cands.filter((c) => {
    const ck = norm(c.applied_company)
    return (ck === nk || ck.startsWith(nk) || nk.startsWith(ck)) && (c.applied_at || '') >= since
  })
  const byStatus = {}
  for (const c of pool) byStatus[c.pipeline_status || 'null'] = (byStatus[c.pipeline_status || 'null'] || 0) + 1
  console.log(`${name} (지원 ${pool.length}): ${JSON.stringify(byStatus)}`)
}
