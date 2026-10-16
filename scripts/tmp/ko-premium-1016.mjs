// 읽기 전용: 한국어 가능자 급여 프리미엄 — (A) submissions(연봉 제출, user_id 있는 건) × user_profiles.korean_cert, (B) user_profiles.current_salary. 중위값 비교, 직군·경력 밴드별.
import { sb, fetchAll } from '../outreach/lib.mjs'
const { isExcludedSubmission } = await import('../../lib/admin-metrics.js').catch(() => ({}))
const profs = await fetchAll(() => sb.from('user_profiles').select('id,email,position,role,yoe_months,korean_cert,english_cert,major,current_salary,salary_currency,location').order('created_at'))
const subs = await fetchAll(() => sb.from('submissions').select('user_id,email,role,experience,salary,company,source,is_seed,created_at').eq('is_seed', false).order('id'))
const hasCert = (c) => !!c && !/^(none|no|không|없음|-|n\/a|0)$/i.test(String(c).trim())
const koLv = (p) => { const c = String(p.korean_cert || ''); if (/topik\s*(5|6)|(5|6)\s*급|level\s*[56]|cấp\s*[56]/i.test(c)) return 'TOPIK5-6'; if (/topik\s*(3|4)|(3|4)\s*급|level\s*[34]|cấp\s*[34]|topik\s*ii/i.test(c)) return 'TOPIK3-4'; if (hasCert(c) || /(hàn quốc|korean|ngôn ngữ hàn|한국어|한국학)/i.test(p.major || '')) return 'KO-other'; return 'none' }
const med = (a) => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)] }
const fmt = (v) => v == null ? '-' : (v >= 1e6 ? (v / 1e6).toFixed(1) + 'M' : String(v))
const band = (m) => m < 12 ? '<1y' : m < 36 ? '1-3y' : m < 72 ? '3-6y' : '6y+'
const byId = Object.fromEntries(profs.map((p) => [p.id, p])), byEmail = {}
for (const p of profs) if (p.email) byEmail[p.email.toLowerCase()] = p
// (A) submissions — salary 단위 확인
const sal = subs.map((s) => Number(s.salary)).filter((v) => v > 0)
console.log('submissions(non-seed)', subs.length, '| salary 중위', fmt(med(sal)), '| 분위 p10/p90', fmt(med(sal.filter((v) => v <= med(sal) * 0.5))), fmt(med(sal.filter((v) => v >= med(sal) * 1.5))))
const rowsA = []
for (const s of subs) { const p = (s.user_id && byId[s.user_id]) || (s.email && byEmail[s.email.toLowerCase()]); if (!p) continue; const v = Number(s.salary); if (!(v > 0)) continue; rowsA.push({ v, ko: koLv(p), band: band(Number(s.experience) * 12 || p.yoe_months || 0), role: s.role || p.role || p.position || '?' }) }
console.log('A) 연봉 제출 × 프로필 매칭:', rowsA.length, '건')
const grp = (rows, keyf) => { const g = {}; for (const r of rows) (g[keyf(r)] ||= []).push(r.v); return g }
const show = (title, rows) => { const g = grp(rows, (r) => r.ko); console.log(title); for (const k of ['none', 'KO-other', 'TOPIK3-4', 'TOPIK5-6']) if (g[k]) console.log(`   ${k.padEnd(9)} n=${String(g[k].length).padStart(4)} 중위 ${fmt(med(g[k]))}`) }
show(' 전체', rowsA)
for (const b of ['<1y', '1-3y', '3-6y', '6y+']) show(` 경력 ${b}`, rowsA.filter((r) => r.band === b))
const isDev = (r) => /(dev|engineer|software|frontend|backend|data|qa|devops|it\b)/i.test(r.role)
show(' 비개발 직군', rowsA.filter((r) => !isDev(r)))
show(' 비개발 × 1-6y', rowsA.filter((r) => !isDev(r) && ['1-3y', '3-6y'].includes(r.band)))
show(' 개발 직군', rowsA.filter(isDev))
// (B) user_profiles.current_salary
const rowsB = profs.filter((p) => Number(p.current_salary) > 0).map((p) => ({ v: Number(p.current_salary), ko: koLv(p), band: band(p.yoe_months || 0), role: p.position || p.role || '?', cur: p.salary_currency }))
console.log('\nB) 프로필 current_salary:', rowsB.length, '건 | 통화 분포', JSON.stringify(rowsB.reduce((o, r) => { o[r.cur || '?'] = (o[r.cur || '?'] || 0) + 1; return o }, {})), '| 중위', fmt(med(rowsB.map((r) => r.v))))
const vnd = rowsB.filter((r) => !r.cur || /vnd/i.test(r.cur)).filter((r) => r.v >= 3e6 && r.v <= 200e6)
show(' 전체(VND 3M~200M)', vnd)
for (const b of ['<1y', '1-3y', '3-6y', '6y+']) show(` 경력 ${b}`, vnd.filter((r) => r.band === b))
show(' 비개발 × 1-6y', vnd.filter((r) => !isDev(r) && ['1-3y', '3-6y'].includes(r.band)))
// 통역/사무 직군 내부 비교
show(' 통역/사무/HR/회계 직군', vnd.filter((r) => /(interpreter|admin|hr|account|office|non-it|operations|sales|marketing)/i.test(r.role)))
