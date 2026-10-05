// user_profiles 연봉 3칼럼(salary_min/salary_max/current_salary) 단위 오염 정리.
// 규약: raw VND/월. 유효 범위 3,000,000 ~ 300,000,000 (위저드 3~300 triệu와 동일).
//   ≥1e12          → ÷1e6 (유저가 VND 전액 입력 → 폼이 ×1e6)
//   1e9 ≤ v < 1e12 → ÷1e3 (천 단위 입력 추정)
//   0 < v < 1e3    → ×1e6 (앱이 triệu 그대로 저장)
//   정규화 후 범위 밖이면 null (판독 불가), 0·null은 건드리지 않음.
//   node scripts/tmp/profile-salary-unit-backfill.mjs            (dry-run)
//   node scripts/tmp/profile-salary-unit-backfill.mjs --apply    (백업 JSON 저장 후 적용)
import fs from 'node:fs'
import { sb, fetchAll } from '/Users/wiseungju/salarymap/scripts/outreach/lib.mjs'

const APPLY = process.argv.includes('--apply')
const FIELDS = ['salary_min', 'salary_max', 'current_salary']
const LO = 3e6, HI = 3e8

export function normalizeVnd(v) {
  if (v == null) return { value: v, rule: null }
  const n = Number(v)
  if (!Number.isFinite(n) || n <= 0) return { value: v, rule: null }
  let out = n, rule = null
  if (n >= 1e12) { out = n / 1e6; rule = '÷1e6' }
  else if (n >= 1e9) { out = n / 1e3; rule = '÷1e3' }
  else if (n < 1e3) { out = n * 1e6; rule = '×1e6' }
  if (!rule) return { value: v, rule: null }
  if (out < LO || out > HI) return { value: null, rule: rule + '→null' }
  return { value: Math.round(out), rule }
}

const rows = await fetchAll(() => sb.from('user_profiles').select('id,salary_min,salary_max,current_salary').order('created_at'))
const changes = []
const ruleCount = {}
for (const r of rows) {
  const patch = {}
  for (const f of FIELDS) {
    const { value, rule } = normalizeVnd(r[f])
    if (rule) { patch[f] = value; ruleCount[`${f} ${rule}`] = (ruleCount[`${f} ${rule}`] || 0) + 1 }
  }
  if (Object.keys(patch).length) changes.push({ id: r.id, before: { salary_min: r.salary_min, salary_max: r.salary_max, current_salary: r.current_salary }, patch })
}
console.log(`대상 프로필 ${changes.length} / 전체 ${rows.length}`)
console.log(ruleCount)
console.log('샘플', changes.slice(0, 8).map(c => [c.id.slice(0, 8), JSON.stringify(c.before), '→', JSON.stringify(c.patch)]).join('\n'))

if (!APPLY) { console.log('\n(dry-run) --apply 로 적용'); process.exit(0) }

const backup = `/Users/wiseungju/salarymap/scripts/tmp/profile-salary-backup-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.json`
fs.writeFileSync(backup, JSON.stringify(changes, null, 1))
console.log('백업:', backup)
let ok = 0, fail = 0
for (const c of changes) {
  const { error } = await sb.from('user_profiles').update(c.patch).eq('id', c.id)
  if (error) { fail++; console.error(c.id, error.message) } else ok++
}
console.log(`적용 완료 ok=${ok} fail=${fail}`)
