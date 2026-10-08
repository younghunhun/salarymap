import { sb, fetchAll } from '../outreach/lib.mjs'
const norm=(p)=>{if(!p)return'(none)';p=p.split('?')[0];if(p==='/')return'/';if(/^\/jobs\/[^/]+/.test(p))return'/jobs/[id]';if(p.startsWith('/jobs'))return'/jobs';if(/^\/ktc/.test(p))return'/ktc';if(/^\/(cv|resume)/.test(p))return'/cv';return p.split('/').slice(0,2).join('/')}
const paid=(e)=>/^(meta|mt|fb|facebook|fb-group|threads|th)$/.test(String(e.meta?.utm_source||'').toLowerCase())
const ev=await fetchAll(()=>sb.from('events').select('event,created_at,user_id,client_id,page,meta').gte('created_at','2026-07-20').lte('created_at','2026-09-08').in('event',['session_start','sign_up']).order('created_at'))
const last=new Map() // cid -> latest session before signup
const cohort=[] // {user_id, created_at, entry, src}
for(const e of ev){ if(!e.client_id)continue
  if(e.event==='session_start'){last.set(e.client_id,e);continue}
  const s=last.get(e.client_id); if(!s||!e.user_id)continue
  cohort.push({uid:e.user_id,t:e.created_at,entry:norm(s.meta?.entry_path||s.page),src:paid(s)?'paid':'organic'}) }
const ids=cohort.map(c=>c.uid)
const chunk=async(sel)=>{const out=[];for(let i=0;i<ids.length;i+=200){const {data}=await sel(ids.slice(i,i+200));out.push(...(data||[]))}return out}
const apps=await chunk(x=>sb.from('job_applications').select('user_id,created_at').in('user_id',x))
const days=await chunk(x=>sb.from('user_activity_days').select('user_id,day').in('user_id',x))
const prof=await chunk(x=>sb.from('user_profiles').select('id,resume_url').in('id',x))
const appBy={},dayBy={},cvBy={}
for(const a of apps)(appBy[a.user_id]||=[]).push(a.created_at)
for(const d of days)(dayBy[d.user_id]||=new Set()).add(d.day)
for(const p of prof)cvBy[p.id]=!!p.resume_url
const g={}
for(const c of cohort){ if(!['/','/jobs','/ktc','/cv'].includes(c.entry))continue; const k=`${c.entry.padEnd(6)} ${c.src}`; const o=(g[k]||={n:0,applied:0,apps:0,apps30:0,cv:0,ret:0,ret3:0})
  o.n++; const a=appBy[c.uid]||[]; if(a.length){o.applied++;o.apps+=a.length} o.apps30+=a.filter(t=>t>c.t&&(new Date(t)-new Date(c.t))<30*864e5).length
  if(cvBy[c.uid])o.cv++; const d=(dayBy[c.uid]?.size||0); if(d>=2)o.ret++; if(d>=3)o.ret3++ }
console.log('cohort: signups 7/20~9/8 (30일 추적 가능), entry×source')
console.log('entry  src       n   applied%  apps/u  apps30/u  cv%   ret2d%  ret3d%')
for(const k of Object.keys(g).sort()){const o=g[k];if(o.n<50)continue;console.log(k.padEnd(15),String(o.n).padStart(5),(100*o.applied/o.n).toFixed(1).padStart(8),(o.apps/o.n).toFixed(2).padStart(7),(o.apps30/o.n).toFixed(2).padStart(9),(100*o.cv/o.n).toFixed(0).padStart(5),(100*o.ret/o.n).toFixed(0).padStart(7),(100*o.ret3/o.n).toFixed(0).padStart(7))}
