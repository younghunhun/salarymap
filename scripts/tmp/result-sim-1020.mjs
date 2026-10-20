// /api/result 과 같은 코호트 규칙(직무+연차, 캡·IQR)으로 결과 화면 수치 시뮬레이션
import { sb, fetchAll } from '../outreach/lib.mjs'
const CAP = { 'Under 1yr': 40, '1–2 yrs': 60, '3–4 yrs': 80, '5–7 yrs': 120, '8+ yrs': 200 }
const clean = (arr, exp) => { let f = arr.filter((s) => s >= 5 && s <= (CAP[exp] || 200)); if (f.length < 4) return f; const s = [...f].sort((a, b) => a - b); const q1 = s[Math.floor(s.length * .25)], q3 = s[Math.floor(s.length * .75)], i = q3 - q1; return s.filter((x) => x >= q1 - 1.5 * i && x <= q3 + 1.5 * i) }
const med = (a) => { const s = [...a].sort((x, y) => x - y); const m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2) }
const Q = [['Accountant', '3–4 yrs', 15], ['Accountant', '5–7 yrs', 20], ['Sales (B2B)', '1–2 yrs', 14], ['HR Generalist', '3–4 yrs', 15], ['Operations', '5–7 yrs', 22], ['Interpreter / Translator', '1–2 yrs', 18], ['Financial Analyst', '3–4 yrs', 20]]
for (const [role, exp, sal] of Q) {
  const rows = await fetchAll(() => sb.from('submissions').select('salary').eq('role', role).eq('experience', exp).order('id'))
  const c = clean(rows.map((r) => Number(r.salary)), exp); const m = med(c); const below = c.filter((s) => s < sal).length
  console.log(`${role} · ${exp} · 입력 ${sal}M → 코호트 n=${c.length} · 시장 중앙값 ${m}M · 상위 ${100 - Math.round(100 * below / c.length)}%`)
}
