import { sb } from '../outreach/lib.mjs'
const { data: cols } = await sb.from('job_collections').select('slug,title,description,job_ids,created_at').in('slug', ['nstage-bus4','nstage-ttj5','nstage-b3we','nstage-47pf','first-marketing-company-jjmn'])
for (const c of cols||[]) { console.log('\n### '+c.slug+' | '+c.title+' | created '+c.created_at.slice(0,10)+' | jobs='+(c.job_ids||[]).length); console.log(' desc:', (c.description||'').slice(0,200))
  const { data: jobs } = await sb.from('jobs').select('id,title,company_name,status,is_active,deadline,expires_at,salary_min,salary_max,location,created_at,experience_level,employment_type').in('id', c.job_ids||[])
  for (const j of jobs||[]) console.log('  -', JSON.stringify(j)) }
