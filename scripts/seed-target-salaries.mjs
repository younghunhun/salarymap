// 타깃 화이트칼라 직무(영업·HR·재무·사무·통번역 17개) 시드 연봉 교체 재생성 — 2026-10-20 연봉 후킹 타깃 전환 후속.
// 배경: 광고 타깃을 경력 화이트칼라로 바꾸면 결과 화면이 이 직무들을 보여주는데, 실제 제출은 직무×연차당 0~20건이라
// 시드가 분포를 좌우한다. 기존 시드(8/5, 밴드당 ~20~36건)는 CareerViet 기준 중위값이 TopCV·Adecco 2026 보다 낮아
// constants/salaryMedians.js 를 재조정했고, 옛 중위값으로 뽑힌 시드를 그대로 두면 새 중위값이 묻히므로 교체한다.
//
// 동작: 대상 role 의 source='seed' 행을 백업(JSON) → 삭제 → 새 중위값으로 재생성 삽입.
//  - 실제 제출(source≠seed)은 건드리지 않는다.
//  - company=null, experience=표준 밴드, source='seed' — seed-nondev-salaries.mjs 와 같은 규칙(랜딩 카운터·어드민 실유입 제외).
//  - 건수는 밴드당 ~70/100/100/70/35 — 실제 제출과 합쳐 결과 화면 코호트 n 이 80~120 이 되게(2026-10-20 CEO 지시: 표본 크게).
//
// 사용: node scripts/seed-target-salaries.mjs            (드라이런: 삭제 예정 건수·생성 요약만)
//       node scripts/seed-target-salaries.mjs --apply    (백업 → 삭제 → 삽입)
import { writeFileSync } from 'node:fs'
import { sb, fetchAll } from './outreach/lib.mjs'
import { NONDEV_MEDIANS, EXP_BANDS } from '../constants/salaryMedians.js'

export const TARGET_ROLES = ['Sales (B2B)', 'Sales (B2C / Retail)', 'Telesales', 'Customer Service', 'Business Development', 'Recruiter', 'HR Generalist', 'C&B', 'Admin / GA', 'Accountant', 'Financial Analyst', 'Audit / Tax', 'Banking', 'Secretary / Assistant', 'Operations', 'Legal', 'Interpreter / Translator']
const BAND_COUNT = [[64, 12], [92, 16], [92, 16], [64, 12], [30, 8]]

const ri = (n) => Math.floor(Math.random() * n)
function sampleSalary(median) {
  const u = (Math.random() + Math.random() + Math.random() - 1.5) / 1.5
  const factor = Math.min(1.5, Math.max(0.7, Math.exp(u * 0.55)))
  return Math.max(6, Math.round(median * factor))
}
function sampleCreatedAt() {
  const d = new Date(Date.now() - ri(60 * 24) * 3600 * 1000)
  d.setHours(8 + ri(15), ri(60), ri(60), 0)
  return d.toISOString()
}

const existing = await fetchAll(() => sb.from('submissions').select('*').eq('source', 'seed').in('role', TARGET_ROLES).order('id'))
console.log(`기존 시드(대상 ${TARGET_ROLES.length}개 role): ${existing.length}건`)

const rows = []
for (const role of TARGET_ROLES) {
  const medians = NONDEV_MEDIANS[role]
  if (!medians) { console.error('중위값 없음:', role); process.exit(1) }
  medians.forEach((median, bi) => {
    const n = BAND_COUNT[bi][0] + ri(BAND_COUNT[bi][1] + 1)
    for (let i = 0; i < n; i++) rows.push({ role, experience: EXP_BANDS[bi], salary: sampleSalary(median), company: null, source: 'seed', created_at: sampleCreatedAt() })
  })
}
console.log('\nrole\t' + EXP_BANDS.map((e) => `${e} n(중앙)`).join('\t'))
for (const role of TARGET_ROLES) {
  console.log(role + '\t' + EXP_BANDS.map((e) => { const s = rows.filter((r) => r.role === role && r.experience === e).map((r) => r.salary).sort((a, b) => a - b); return `${s.length}(${s[Math.floor(s.length / 2)]})` }).join('\t'))
}
console.log(`\n생성 ${rows.length}건 (삭제 ${existing.length} → 순증 ${rows.length - existing.length})`)

if (!process.argv.includes('--apply')) { console.log('\n(dry-run — 적용하려면 --apply)'); process.exit(0) }

const backup = `scripts/tmp/seed-target-backup-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.json`
writeFileSync(backup, JSON.stringify(existing))
console.log('백업:', backup)
const ids = existing.map((r) => r.id)
for (let i = 0; i < ids.length; i += 500) {
  const { error } = await sb.from('submissions').delete().eq('source', 'seed').in('id', ids.slice(i, i + 500))
  if (error) { console.error('delete failed at', i, error.message); process.exit(1) }
}
console.log(`삭제 ${ids.length}건`)
for (let i = 0; i < rows.length; i += 500) {
  const { error } = await sb.from('submissions').insert(rows.slice(i, i + 500))
  if (error) { console.error('insert failed at', i, error.message); process.exit(1) }
  console.log(`inserted ${Math.min(i + 500, rows.length)}/${rows.length}`)
}
console.log('done')
