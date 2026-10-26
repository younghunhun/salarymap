// 풀 현재급여 + salary map 제출을 합친 연차별 중앙값 (읽기 전용)
import { sb, fetchAll } from '../outreach/lib.mjs'
const pool = await fetchAll(() => sb.from('user_profiles').select('id,email,yoe_months,current_salary,salary_currency,cv_tags,resume_url,skills,headline,experiences,position,desired_roles').not('email', 'is', null).not('resume_url', 'is', null))
const subsAll = await fetchAll(() => sb.from('submissions').select('role,experience,salary,source').neq('source', 'seed'))
const t = (p) => p.cv_tags || {}
const yoe = (p) => Number.isFinite(t(p).yoe_total_months) ? t(p).yoe_total_months : (p.yoe_months ?? null)
const BANDS = ['<1y', '1-3y', '3-5y', '5-8y', '8y+']
const band = (m) => m == null ? '미상' : m < 12 ? '<1y' : m < 36 ? '1-3y' : m < 60 ? '3-5y' : m < 96 ? '5-8y' : '8y+'
const expBand = (e) => /under/i.test(e) ? '<1y' : /^1/.test(e) ? '1-3y' : /^3/.test(e) ? '3-5y' : /^5/.test(e) ? '5-8y' : /^8/.test(e) ? '8y+' : e
const med = (a) => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)] }
const q = (a, p) => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(p * s.length))] }
const all = (p) => (JSON.stringify(p.skills || '') + ' ' + (p.headline || '') + ' ' + (Array.isArray(p.experiences) ? p.experiences.map((e) => `${e.title || e.position || ''} ${e.description || ''}`).join(' ') : '')).toLowerCase()
const enOk = (p) => /^(business|native)$/.test(t(p).english_level || '')
const MKT = ['Content Marketing', 'Digital Marketing', 'Brand Marketing', 'Performance / Ads']
const pmKw = /(project manag|quản lý dự án|pmp|scrum master|pmo|delivery manag|program manag|project lead|project coordinator)/i
const deKw = /(data engineer|etl|airflow|spark|kafka|hadoop|data pipeline|dbt|snowflake|bigquery|redshift|databricks|data warehouse)/i
const SETS = {
  content: { pool: (p) => MKT.includes(t(p).role_detail), subs: MKT },
  pm: { pool: (p) => (['Project Manager', 'PM', 'PO', 'Business Analyst'].includes(t(p).role_detail) || pmKw.test(all(p))) && enOk(p), subs: ['PM', 'Project Manager', 'PO', 'PM · PO'] },
  de: { pool: (p) => ['Data Engineer', 'Data Analyst', 'Data Scientist', 'AI Engineer'].includes(t(p).role_detail) || deKw.test(all(p)), subs: ['Data Engineer', 'Data · AI', 'Data Analyst', 'Data Scientist'] },
  de_core: { pool: (p) => t(p).role_detail === 'Data Engineer', subs: ['Data Engineer'] },
  da_only: { pool: (p) => t(p).role_detail === 'Data Analyst', subs: ['Data Analyst'] },
}
for (const [k, S] of Object.entries(SETS)) {
  console.log(`\n== ${k}`)
  for (const b of BANDS) {
    const pv = pool.filter((p) => S.pool(p) && band(yoe(p)) === b && p.current_salary != null && (!p.salary_currency || p.salary_currency === 'VND')).map((p) => Number(p.current_salary) / 1e6).filter((v) => v >= 3 && v <= 300)
    const sv = subsAll.filter((s) => S.subs.includes(s.role) && expBand(s.experience) === b).map((s) => Number(s.salary)).filter((v) => v >= 3 && v <= 300)
    const both = [...pv, ...sv]
    console.log(`${b}\t풀 n=${pv.length} 중앙 ${med(pv)}\t제출 n=${sv.length} 중앙 ${med(sv)}\t합산 n=${both.length} p25 ${q(both, .25)} 중앙 ${med(both)} p75 ${q(both, .75)}`)
  }
}
