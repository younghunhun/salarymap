import { sb, fetchAll } from '../outreach/lib.mjs'
import { roleGroupOf } from '../../lib/cvTagsMatch.js'
const jobs = await fetchAll(() => sb.from('jobs').select('id,role,title,salary_min,salary_max,salary_text,experience_min,is_active,created_at').eq('source', 'ktc').gte('created_at', '2026-05-01').order('created_at'))
const d = {}
for (const j of jobs) { const g = roleGroupOf(j.role) || 'other'; const a = (d[g] ||= { n: 0, sal: 0, exp1: 0, exp1sal: 0, active: 0, activeSal: 0 }); a.n++; const has = !!(j.salary_min || j.salary_max); if (has) a.sal++; if ((j.experience_min || 0) >= 1) { a.exp1++; if (has) a.exp1sal++ } if (j.is_active) { a.active++; if (has) a.activeSal++ } }
console.log('KTC 공고(5월~) 직군별: 전체/급여표기 · 경력1y+/급여표기 · 활성/급여표기')
for (const [g, a] of Object.entries(d).sort((x, y) => y[1].n - x[1].n)) console.log(`  ${g}: ${a.n}/${a.sal} · ${a.exp1}/${a.exp1sal} · ${a.active}/${a.activeSal}`)
