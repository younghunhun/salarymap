import { sb, fetchAll } from '../outreach/lib.mjs'
const norm=(p)=>{if(!p)return'(none)';p=p.split('?')[0];if(p==='/')return'/';if(/^\/jobs\/[^/]+/.test(p))return'/jobs/[id]';if(p.startsWith('/jobs'))return'/jobs';if(/^\/ktc/.test(p))return'/ktc';if(/^\/(cv|resume)/.test(p))return'/cv';return p.split('/').slice(0,2).join('/')}
const paid=(e)=>/^(meta|mt|fb|facebook|fb-group|threads|th)$/.test(String(e.meta?.utm_source||'').toLowerCase())
const org=(e)=>{if(paid(e))return'paid';const r=(e.meta?.referrer||'').toLowerCase();if(!r)return'direct';if(/google|bing|coccoc|yahoo/.test(r))return'search';if(/facebook|threads|instagram|zalo|linkedin/.test(r))return'social-ref';if(/salary-fyi|fyi/.test(r))return'self';return'other'}
const wk=(d)=>{const t=new Date(d);t.setUTCDate(t.getUTCDate()-t.getUTCDay());return t.toISOString().slice(0,10)}
const ev=await fetchAll(()=>sb.from('events').select('event,created_at,client_id,page,meta').gte('created_at','2026-07-20').in('event',['session_start','sign_up']).order('created_at'))
const suCid=new Set(ev.filter(e=>e.event==='sign_up').map(e=>e.client_id).filter(Boolean))
const ss=ev.filter(e=>e.event==='session_start'&&e.client_id)
// 1) 홈 유료 세션 주별 + 캠페인명
const hw={},camp={}
for(const e of ss){const k=norm(e.meta?.entry_path||e.page);if(k!=='/')continue;const w=wk(e.created_at);(hw[w]||={p:0,o:0});paid(e)?hw[w].p++:hw[w].o++;if(paid(e)){const c=e.meta?.utm_campaign||'(none)';camp[c]=(camp[c]||0)+1}}
console.log('home weekly paid/organic:');for(const w of Object.keys(hw).sort())console.log(' ',w,hw[w])
console.log('home paid campaigns:',Object.fromEntries(Object.entries(camp).sort((a,b)=>b[1]-a[1]).slice(0,8)))
// 2) entry × source × month 전환율
const g={}
for(const e of ss){const k=norm(e.meta?.entry_path||e.page);if(!['/','/jobs','/ktc','/cv'].includes(k))continue;const key=`${e.created_at.slice(0,7)} ${k.padEnd(6)} ${org(e)}`;(g[key]||=new Set()).add(e.client_id)}
console.log('month entry source: visitors signups rate')
for(const key of Object.keys(g).sort()){const set=g[key];if(set.size<100)continue;let c=0;for(const cid of set)if(suCid.has(cid))c++;console.log(' ',key.padEnd(26),String(set.size).padStart(6),String(c).padStart(5),(100*c/set.size).toFixed(1)+'%')}
