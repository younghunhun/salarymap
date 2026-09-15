// 읽기 전용 — First Marketing·Sunjin 후보를 공고(V코드)별로 분해
import { sb, fetchAll } from '/Users/wiseungju/salarymap/scripts/outreach/lib.mjs'
const one = await sb.from('ktc_candidates').select('*').limit(1)
console.log('컬럼:', Object.keys(one.data[0]).join(', '))
const cands = await fetchAll(() => sb.from('ktc_candidates').select('*').order('id'))
const norm = (s) => (s || '').toLowerCase().replace(/\s+/g, '')
for (const [label, key, since] of [['First Marketing', 'firstmarketing', '2026-08-31'], ['Sunjin', 'sunjin', '2026-08-31']]) {
  const pool = cands.filter((c) => norm(c.applied_company).includes(key) && (c.applied_at || '') >= since)
  console.log(`\n===== ${label} (${pool.length}건) — 포지션×상태 =====`)
  const m = {}
  for (const c of pool) {
    const pos = (c.applied_position || c.job_title || c.position || '?').slice(0, 45)
    const k = `${c.job_code || '-'} | ${pos}`
    m[k] ||= {}
    m[k][c.pipeline_status] = (m[k][c.pipeline_status] || 0) + 1
  }
  for (const [k, v] of Object.entries(m).sort()) console.log(`  ${k}: ${JSON.stringify(v)}`)
}
