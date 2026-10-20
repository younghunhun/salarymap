// 읽기 전용: 연봉 열람 기능이 타깃(화이트칼라 경력자)에게 보여줄 실데이터 깊이 — role×experience 실제 제출 수, 회사별 표본, 한국계 기업 표본
import { sb, fetchAll } from '../outreach/lib.mjs'
const subs = await fetchAll(() => sb.from('submissions').select('role,experience,salary,company,source,created_at').order('created_at'))
const real = subs.filter((s) => s.source !== 'seed')
console.log(`submissions 전체 ${subs.length} · seed ${subs.length - real.length} · 실제 ${real.length}`)
const G = { 'IT/개발': /^(Backend|Frontend|Fullstack|Mobile|DevOps|QA|Web|Embedded|Game|Cloud|SRE|Security|Blockchain)/, '데이터·AI': /^(Data|AI|ML|BI)/, 'PM·BA': /^(PM|PO|Project Manager|Business Analyst)/, '디자인': /(Design|Motion)/, '마케팅': /(Marketing|Performance|Brand|Content|Digital)/, '영업·BD': /(Sales|Telesales|Business Development|Customer Service)/, 'HR': /(Recruiter|HR|C&B|Admin)/, '재무·회계': /(Accountant|Financial|Audit|Banking|Finance)/, '사무·통번역': /(Secretary|Operations|Legal|Interpreter)/, '제조·물류': /(Production|Process|Maintenance|QC|HSE|Warehouse|Procurement|Import|Supply)/ }
const grp = (r) => Object.entries(G).find(([, re]) => re.test(r || ''))?.[0] || '기타'
const EXP = ['Under 1yr', '1–2 yrs', '3–4 yrs', '5–7 yrs', '8+ yrs']
const normExp = (e) => /under/i.test(e) ? 'Under 1yr' : /^1/.test(e) ? '1–2 yrs' : /^3/.test(e) ? '3–4 yrs' : /^5/.test(e) ? '5–7 yrs' : /^8/.test(e) ? '8+ yrs' : e
console.log('\n[실제 제출 — 직군 × 경력]  (role 단위 n≥5 면 기능이 실데이터로 응답)')
console.log('직군\t' + EXP.join('\t') + '\t합계\t세부 role 수')
for (const g of Object.keys(G).concat('기타')) {
  const rs = real.filter((s) => grp(s.role) === g); if (!rs.length) continue
  const roles = new Set(rs.map((s) => s.role))
  console.log(`${g}\t` + EXP.map((e) => rs.filter((s) => normExp(s.experience) === e).length).join('\t') + `\t${rs.length}\t${roles.size}`)
}
console.log('\n[타깃 직군 세부 role × 경력 — 실제 n]')
for (const g of ['재무·회계', '영업·BD', 'HR', '사무·통번역', 'PM·BA']) {
  const rs = real.filter((s) => grp(s.role) === g); const byRole = {}
  for (const s of rs) (byRole[s.role] ||= {})[normExp(s.experience)] = ((byRole[s.role] || {})[normExp(s.experience)] || 0) + 1
  for (const [r, d] of Object.entries(byRole)) console.log(`  ${g} / ${r}: ` + EXP.map((e) => `${e.replace(' yrs', '').replace('Under 1yr', '<1')} ${d[e] || 0}`).join(' · '))
}
// 회사별 표본 — 타깃 직군에서 회사명 기재 + 회사당 n
const co = {}; for (const s of real) if (s.company && ['재무·회계', '영업·BD', 'HR', '사무·통번역', 'PM·BA', '마케팅'].includes(grp(s.role))) { const k = s.company.trim().toLowerCase(); co[k] = (co[k] || 0) + 1 }
const coArr = Object.entries(co).sort((a, b) => b[1] - a[1])
console.log(`\n[비IT 화이트칼라 제출의 회사 표본] 회사 ${coArr.length}곳 · 3건+ ${coArr.filter((x) => x[1] >= 3).length}곳 · 상위: ` + coArr.slice(0, 15).map(([k, v]) => `${k}(${v})`).join(' · '))
const krRe = /(samsung|lg|hyundai|kia|posco|hyosung|lotte|cj|sk |hanwha|doosan|shinhan|woori|kb |hana|vina\b|korea|korean|hàn quốc|han quoc|hansae|taekwang|changshin|kolon|youngone|hwaseung|pungkook|nexacode|ktc)/i
const kr = real.filter((s) => s.company && krRe.test(s.company))
console.log(`[한국계 기업으로 보이는 제출] ${kr.length}건 · 직군: ` + Object.entries(kr.reduce((d, s) => (d[grp(s.role)] = (d[grp(s.role)] || 0) + 1, d), {})).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(' · '))
console.log('  상위 회사: ' + Object.entries(kr.reduce((d, s) => (d[s.company.trim().toLowerCase()] = (d[s.company.trim().toLowerCase()] || 0) + 1, d), {})).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([k, v]) => `${k}(${v})`).join(' · '))
// 최근 90일 유입 직군
const recent = real.filter((s) => s.created_at >= '2026-07-22')
console.log(`\n[최근 90일 실제 제출 ${recent.length}건 직군]: ` + Object.entries(recent.reduce((d, s) => (d[grp(s.role)] = (d[grp(s.role)] || 0) + 1, d), {})).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(' · '))
// company_kr_stats 존재 여부
const { data: ck, error } = await sb.from('company_kr_stats').select('*').limit(3)
console.log('\ncompany_kr_stats:', error ? error.message : `${ck.length}행 샘플 cols=${ck[0] ? Object.keys(ck[0]).join(',') : '-'}`)
if (!error) { const { count } = await sb.from('company_kr_stats').select('*', { count: 'exact', head: true }); console.log('  총', count, '행') }
