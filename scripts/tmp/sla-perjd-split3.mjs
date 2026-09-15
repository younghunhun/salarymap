import { sb, fetchAll } from '/Users/wiseungju/salarymap/scripts/outreach/lib.mjs'
const cands = await fetchAll(() => sb.from('ktc_candidates').select('applied_company,applied_job,job_code,applied_at,pipeline_status').order('id'))
const norm = (s) => (s || '').toLowerCase().replace(/\s+/g, '')
for (const [label, key, since] of [['HIVELAB', 'hivelab', '2026-09-08'], ['QNT', 'qnt', '2026-09-04'], ['SKTax', 'sktax', '2026-09-04'], ['유피드/Ufeed', 'ufeed', '2026-09-03'], ['코망/Komang', 'komang', '2026-09-03'], ['Wellpod', 'wellpod', '2026-09-11'], ['Jinosys', 'jinosys', '2026-09-11']]) {
  const pool = cands.filter((c) => norm(c.applied_company).includes(key) && (c.applied_at || '') >= since)
  const m = {}
  for (const c of pool) {
    const k = `${c.job_code || '-'} | ${(c.applied_job || '?').slice(0, 45)}`
    m[k] ||= {}
    m[k][c.pipeline_status] = (m[k][c.pipeline_status] || 0) + 1
  }
  console.log(`\n${label} (${pool.length}건):`)
  for (const [k, v] of Object.entries(m).sort()) console.log(`  ${k}: ${JSON.stringify(v)}`)
}
