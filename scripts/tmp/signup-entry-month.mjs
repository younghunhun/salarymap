import { sb, fetchAll } from '../outreach/lib.mjs'
const SINCE='2026-04-20'
const norm=(p)=>{if(!p)return'(none)';p=p.split('?')[0];if(p==='/')return'/';if(/^\/jobs\/[^/]+/.test(p))return'/jobs/[id]';if(p.startsWith('/jobs'))return'/jobs';if(/^\/ktc/.test(p))return'/ktc';if(/^\/(cv|resume)/.test(p))return'/cv';return p.split('/').slice(0,2).join('/')}
const ev=await fetchAll(()=>sb.from('events').select('event,created_at,client_id,page,meta').gte('created_at',SINCE).in('event',['session_start','sign_up']).order('created_at'))
const su=ev.filter(e=>e.event==='sign_up'); console.log('sign_up first',su[0]?.created_at,'n',su.length)
const suCid=new Set(su.map(s=>s.client_id).filter(Boolean))
const out={}
for(const e of ev){ if(e.event!=='session_start'||!e.client_id) continue; const m=e.created_at.slice(0,7); const k=norm(e.meta?.entry_path||e.page); ((out[m]||={})[k]||=new Set()).add(e.client_id) }
for(const m of Object.keys(out).sort()){ const row={}; for(const [k,set] of Object.entries(out[m])){ if(set.size<150)continue; let c=0; for(const cid of set) if(suCid.has(cid))c++; row[k]=`${set.size}v/${c}s/${(100*c/set.size).toFixed(1)}%` } console.log(m,row) }
const profs=await fetchAll(()=>sb.from('user_profiles').select('email,created_at,utm_source').gte('created_at',SINCE).order('created_at'))
const um={}; for(const p of profs){ if(/@likelion\.net$/i.test(p.email||''))continue; const m=p.created_at.slice(0,7); const k=(p.utm_source||'(none)').toLowerCase(); (um[m]||={})[k]=((um[m]||{})[k]||0)+1 }
for(const m of Object.keys(um).sort()) console.log(m, Object.fromEntries(Object.entries(um[m]).sort((a,b)=>b[1]-a[1]).slice(0,6)))
