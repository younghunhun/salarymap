import { sb } from '../outreach/lib.mjs'
const { data, error } = await sb.from('jobs').select('*').eq('source','ktc').or('company.ilike.%gpclub%,company.ilike.%gp club%,title.ilike.%Growth Leader%').order('created_at',{ascending:false}).limit(3)
if (error) console.error(error)
for (const j of data||[]) { const { description, requirements, ...rest } = j; console.log('=====', JSON.stringify(Object.fromEntries(Object.entries(rest).filter(([k,v])=>v!=null && !/url|image|embedding/i.test(k))))); console.log(String(description||'')); if (requirements) console.log('--- req:', String(requirements)) }
