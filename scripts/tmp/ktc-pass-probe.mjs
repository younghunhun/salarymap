import { sb, fetchAll } from '../outreach/lib.mjs'
for (const t of ['ktc_candidates','ktc_sheet_candidates','ktc_hires']) {
  const { data, error } = await sb.from(t).select('*').limit(1)
  if (error) { console.log(t, 'ERR', error.message); continue }
  console.log(t, 'cols:', Object.keys(data?.[0]||{}).join(', '))
  const rows = await fetchAll(() => sb.from(t).select('*').order('id'))
  console.log(t, 'rows', rows.length)
  for (const k of ['pipeline_status','status','sheet_source','interview_month','onboarding','hired_at']) if (rows[0] && k in rows[0]) { const d={}; for (const r of rows) { const v = r[k]==null?'(null)':String(r[k]).slice(0,30); d[v]=(d[v]||0)+1 } console.log(' ', k, JSON.stringify(Object.fromEntries(Object.entries(d).sort((a,b)=>b[1]-a[1]).slice(0,15)))) }
}
