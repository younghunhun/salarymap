import { sb, fetchAll } from '../outreach/lib.mjs'
import { EXP_BANDS } from '../../constants/salaryMedians.js'
const T = ['Accountant','Financial Analyst','Audit / Tax','Banking','Sales (B2B)','Sales (B2C / Retail)','Telesales','Customer Service','Business Development','HR Generalist','Recruiter','C&B','Admin / GA','Operations','Secretary / Assistant','Legal','Interpreter / Translator']
const rows = await fetchAll(() => sb.from('submissions').select('role,experience,salary,source,company').in('role', T).order('id'))
const med = (a) => { if (!a.length) return '-'; const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)] }
console.log('role\t' + EXP_BANDS.map((e) => `${e} seed/real(실중앙)`).join('\t'))
for (const r of T) {
  const line = EXP_BANDS.map((e) => { const s = rows.filter((x) => x.role === r && x.experience === e); const sd = s.filter((x) => x.source === 'seed'), rl = s.filter((x) => x.source !== 'seed'); return `${sd.length}/${rl.length}(${med(rl.map((x) => Number(x.salary)))})` })
  console.log(`${r}\t${line.join('\t')}`)
}
const odd = rows.filter((x) => x.source === 'seed' && (x.company || !EXP_BANDS.includes(x.experience)))
console.log(`\nseed 총 ${rows.filter((x) => x.source === 'seed').length} · 회사 있거나 밴드 비표준 seed ${odd.length}`)
