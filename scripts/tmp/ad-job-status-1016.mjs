import { sb } from '../outreach/lib.mjs'
const { data } = await sb.from('jobs').select('source_id,title,company,is_active,status,created_at').eq('source','ktc').in('source_id',['V177','V172','V171','V83','V187','V215','V218'])
for (const j of data||[]) console.log(j.source_id, '|', j.company, '|', j.title, '| active', j.is_active, '|', j.status, '|', j.created_at.slice(0,10))
const { data: jc } = await sb.from('job_collections').select('slug,title,is_active,job_ids').order('created_at',{ascending:false}).limit(12)
console.log('\n공고모음(/l/):'); for (const c of jc||[]) console.log(' ', c.slug, c.is_active, (c.job_ids||[]).length+'건', c.title.slice(0,60))
