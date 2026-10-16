import { sb } from '../outreach/lib.mjs'
const { data, error } = await sb.from('jobs').select('*').eq('source','ktc').or('company.ilike.%hyosung%,title.ilike.%Korean - speaking staff%,title.ilike.%Production Engineer%,title.ilike.%Import Staff%').order('created_at',{ascending:false}).limit(12)
if (error) console.error(error)
for (const j of data||[]) { const { description, requirements, ...rest } = j; console.log('=====', JSON.stringify(Object.fromEntries(Object.entries(rest).filter(([k,v])=>v!=null && !/url|image|embedding/i.test(k))))); console.log(String(description||'').slice(0,2500)); if (requirements) console.log('--- req:', String(requirements).slice(0,1200)) }
