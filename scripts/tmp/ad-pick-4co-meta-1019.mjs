import { sb } from '../outreach/lib.mjs'
const CODES = ['V247','V239','V246','V231','V230','V229','V233','V228','V234','V236','V227','V235','V226','V237','V238','V232','V222','V223','V32','V218','V217']
const { data } = await sb.from('jobs').select('source_id,company,title,headcount,recruit_count,deadline,close_date,experience_min,experience_max,career_requirement,salary_min,salary_max,salary_text,location,status,is_active').eq('source','ktc').in('source_id', CODES)
for (const j of data||[]) console.log([j.source_id, j.company.slice(0,10), j.title.slice(0,36), 'hc', j.headcount, 'rc', j.recruit_count, 'dl', j.deadline, 'cd', j.close_date, 'exp', j.experience_min+'-'+j.experience_max, j.career_requirement, 'sal', j.salary_min+'-'+j.salary_max, (j.salary_text||'').slice(0,20), (j.location||'').slice(0,18), j.status, j.is_active].join(' | '))
// FYI 지원 최근 7일 추이 (광고 효과 확인용)
const ids = (data||[]).map(j=>j.id)
const { data: jobs2 } = await sb.from('jobs').select('id,source_id').eq('source','ktc').in('source_id', CODES)
const idMap = Object.fromEntries((jobs2||[]).map(j=>[j.id,j.source_id]))
const { data: apps } = await sb.from('job_applications').select('job_id,created_at').in('job_id', Object.keys(idMap)).gte('created_at','2026-10-10').order('created_at')
const d = {}; for (const a of apps||[]) { const k = idMap[a.job_id]; const day = a.created_at.slice(5,10); d[k] ||= {}; d[k][day] = (d[k][day]||0)+1 }
console.log('\n일별 FYI 지원(10/10~):'); for (const [k,v] of Object.entries(d)) console.log(' ', k, JSON.stringify(v))
