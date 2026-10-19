// 읽기 전용: nstage-* vs first-marketing-company 랜딩 세션의 이벤트 흐름 비교
import { sb, fetchAll } from '../outreach/lib.mjs'
const SINCE = '2026-10-05T17:00:00Z', UNTIL = '2026-10-19T17:00:00Z'
const ev = await fetchAll(() => sb.from('events').select('id,event,created_at,client_id,page,meta').gte('created_at', SINCE).lt('created_at', UNTIL).order('id'))
const byCid = new Map(); for (const e of ev) if (e.client_id) (byCid.get(e.client_id) || byCid.set(e.client_id, []).get(e.client_id)).push(e)
const groups = {}
for (const [cid, tl] of byCid) { const f = tl.find(e=>e.event==='session_start' && e.meta?.utm_source==='meta'); if (!f) continue
  const p = (f.meta?.entry_path||f.page||'').split('?')[0]; if (!p.startsWith('/l/')) continue
  const g = groups[p] ||= { clients:0, ev:{}, pages:{}, days:{}, platform:{} }; g.clients++
  const d = new Date(new Date(f.created_at).getTime()+7*36e5).toISOString().slice(5,10); g.days[d]=(g.days[d]||0)+1
  const pf = f.meta?.platform||f.meta?.device||'?'; g.platform[pf]=(g.platform[pf]||0)+1
  const seen = new Set(); for (const e of tl) { if (e.created_at < f.created_at) continue; if (!seen.has(e.event)) { seen.add(e.event); g.ev[e.event]=(g.ev[e.event]||0)+1 } const pg=(e.page||'').split('?')[0].replace(/\/[0-9a-f-]{36}/,'/[id]'); g.pages[pg]=(g.pages[pg]||0)+1 } }
for (const [p,g] of Object.entries(groups).sort((a,b)=>b[1].clients-a[1].clients)) { console.log('\n### '+p+'  clients='+g.clients)
  console.log(' days:', Object.entries(g.days).sort().map(([k,v])=>k+':'+v).join(' '))
  console.log(' platform:', JSON.stringify(g.platform))
  console.log(' events(clients reaching):', Object.entries(g.ev).sort((a,b)=>b[1]-a[1]).slice(0,12).map(([k,v])=>k+'='+v+'('+(100*v/g.clients).toFixed(0)+'%)').join(' '))
  console.log(' pages:', Object.entries(g.pages).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([k,v])=>k+'='+v).join(' ')) }
// 랜딩 메타 (DB)
const { data: lands } = await sb.from('landings').select('*').in('slug', Object.keys(groups).map(p=>p.slice(3))).limit(20)
console.log('\n### landings rows'); for (const l of lands||[]) console.log(JSON.stringify(l).slice(0,600))
