import { sb } from '../outreach/lib.mjs'
const { data } = await sb.from('events').select('event,page').gte('created_at','2026-10-05').like('page','/l/%').range(0,4999)
const o = {}; for (const e of data) { const k = e.page.split('?')[0]+' '+e.event; o[k]=(o[k]||0)+1 }
for (const [k,v] of Object.entries(o).sort()) console.log(v+'\t'+k)
const { data: jc } = await sb.from('job_collections').select('slug,title,is_active,job_ids,created_at').order('created_at',{ascending:false}).limit(10)
for (const c of jc||[]) console.log(c.created_at.slice(0,10), c.slug, c.is_active, (c.job_ids||[]).length+'건', c.title)
