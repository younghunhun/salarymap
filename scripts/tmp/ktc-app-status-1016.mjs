import { sb, fetchAll } from '../outreach/lib.mjs'
const { data: one } = await sb.from('job_applications').select('*').limit(1)
console.log('columns:', Object.keys(one?.[0] || {}).join(', '))
const jobs = await fetchAll(() => sb.from('jobs').select('id,source_id,title,company,is_active').eq('source', 'ktc').order('created_at', { ascending: false }))
const byId = Object.fromEntries(jobs.map((j) => [j.id, j]))
const apps = await fetchAll(() => sb.from('job_applications').select('job_id,status,created_at').in('job_id', jobs.map((j) => j.id)).order('id'))
const st = {}; for (const a of apps) st[a.status || '(null)'] = (st[a.status || '(null)'] || 0) + 1
console.log('status 분포(전체 KTC):', JSON.stringify(st))
const per = {}
for (const a of apps) { const k = a.job_id; per[k] ||= {}; per[k][a.status || '(null)'] = (per[k][a.status || '(null)'] || 0) + 1 }
const CODES = ['V177','V172','V171','V83','V187','V215','V218','V213','V210','V212','V214','V211','V216','V241','V240','V239','V199','V201','V221','V223','V222','V248','V253','V250','V249']
console.log('\n광고 중/후보 공고 상태:')
for (const c of CODES) { const j = jobs.find((x) => x.source_id === c); if (!j) continue; console.log(c, '|', j.company.slice(0, 16), '|', j.title.slice(0, 34), '| active', j.is_active, '|', JSON.stringify(per[j.id] || {})) }
