import { sb } from '../outreach/lib.mjs'
const { data: cols } = await sb.from('job_collections').select('slug,job_ids').in('slug', ['nstage-bus4','nstage-ttj5','nstage-b3we','nstage-47pf','first-marketing-company-jjmn'])
const ids = [...new Set(cols.flatMap(c=>c.job_ids||[]))]
const { data: jobs, error } = await sb.from('jobs').select('*').in('id', ids)
if (error) console.log('ERR', error)
const slugOf = (id) => cols.filter(c=>(c.job_ids||[]).includes(id)).map(c=>c.slug).join(',')
for (const j of jobs||[]) { const keep = Object.fromEntries(Object.entries(j).filter(([k,v]) => v!=null && !/description|content|html|requirements|benefits|embedding/i.test(k)).map(([k,v])=>[k, typeof v==='string'? v.slice(0,60): v])); console.log(slugOf(j.id), JSON.stringify(keep)) }
