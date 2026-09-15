import { sb, fetchAll } from '/Users/wiseungju/salarymap/scripts/outreach/lib.mjs'
const cands = await fetchAll(() => sb.from('ktc_candidates').select('applied_company,applied_job,job_code,applied_at,pipeline_status').order('id'))
const norm = (s) => (s || '').toLowerCase().replace(/\s+/g, '')
for (const [label, key, since] of [['First Marketing', 'firstmarketing', '2026-08-31'], ['Sunjin', 'sunjin', '2026-08-31']]) {
  const pool = cands.filter((c) => norm(c.applied_company).includes(key) && (c.applied_at || '') >= since)
  console.log(`\n===== ${label} (${pool.length}건) — applied_job×상태 =====`)
  const m = {}
  for (const c of pool) {
    const k = `${c.job_code || '-'} | ${(c.applied_job || '?').slice(0, 50)}`
    m[k] ||= {}
    m[k][c.pipeline_status] = (m[k][c.pipeline_status] || 0) + 1
  }
  for (const [k, v] of Object.entries(m).sort()) console.log(`  ${k}: ${JSON.stringify(v)}`)
}
