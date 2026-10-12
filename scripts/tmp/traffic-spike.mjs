import { sb, fetchAll } from '../outreach/lib.mjs'
const since = new Date(Date.now() - 36*3600e3).toISOString()
const ev = await fetchAll(() => sb.from('events').select('created_at,page,meta,client_id').eq('event','session_start').gte('created_at', since).order('created_at'))
const h = {}; for (const e of ev) { const k = new Date(new Date(e.created_at).getTime()+7*3600e3).toISOString().slice(5,13).replace('T',' '); h[k]=(h[k]||0)+1 }
console.log(Object.entries(h).map(([k,v])=>`${k}h ${String(v).padStart(5)} ${'#'.repeat(Math.min(60,Math.round(v/20)))}`).join('\n'))
const last6 = ev.filter(e => new Date(e.created_at) > Date.now()-6*3600e3)
const cnt=(a,f)=>{const o={};for(const x of a){const k=f(x);o[k]=(o[k]||0)+1}return Object.entries(o).sort((a,b)=>b[1]-a[1]).slice(0,8)}
console.log('last6h entry', cnt(last6, e=>(e.meta?.entry_path||e.page||'').split('?')[0]))
console.log('last6h source', cnt(last6, e=>e.meta?.utm_source||(e.meta?.referrer||'direct').replace(/^https?:\/\/(www\.|l\.|lm\.|m\.)?/,'').split('/')[0]))
console.log('last6h campaign', cnt(last6, e=>e.meta?.utm_campaign||'-'))
console.log('last6h ua', cnt(last6.filter(e=>e.meta?.ua), e=>(e.meta.ua.match(/FBAN|FBAV|FB_IAB|Instagram|Barcelona|Zalo|bot|Bot|spider|crawl/)||['browser'])[0]))
console.log('unique clients last6h', new Set(last6.map(e=>e.client_id)).size, 'sessions', last6.length)
