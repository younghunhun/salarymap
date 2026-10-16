import { sb } from '../outreach/lib.mjs'
const { data } = await sb.from('events').select('event,page,meta,created_at').eq('event','session_start').gte('created_at','2026-10-14').order('created_at',{ascending:false}).limit(400)
const keys = {}; const src = {}
for (const e of data) { for (const k of Object.keys(e.meta||{})) keys[k]=(keys[k]||0)+1; const s = e.meta?.utm_source||'(none)'; src[s]=(src[s]||0)+1 }
console.log('n',data.length,'\nkeys',keys,'\nutm_source',src)
console.log(JSON.stringify(data.slice(0,3),null,1))
const { data: su } = await sb.from('events').select('event,page,meta,created_at').eq('event','sign_up').gte('created_at','2026-10-10').order('created_at',{ascending:false}).limit(5)
console.log('sign_up sample', JSON.stringify(su,null,1))
