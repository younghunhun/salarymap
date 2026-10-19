import { sb, fetchAll } from '../outreach/lib.mjs'
const { data: jobs } = await sb.from('jobs').select('id,source_id,title,created_at').eq('source','ktc').in('source_id',['V222','V223','V32'])
const { data: ev1 } = await sb.from('events').select('event').in('event',['coldmail_open','coldmail_click','email_open','email_click']).limit(1)
for (const j of jobs) {
  const recs = await fetchAll(() => sb.from('job_recommendations').select('id,user_id,created_at,status,kind,sent_by').eq('job_id', j.id).order('id'))
  const days = {}; for (const r of recs) { const d = r.created_at.slice(5,10); days[d]=(days[d]||0)+1 }
  const st = {}; for (const r of recs) { const k = `${r.kind||'-'}/${r.status||'-'}`; st[k]=(st[k]||0)+1 }
  const opens = recs.length ? await fetchAll(() => sb.from('events').select('event,meta').in('event',['coldmail_open','coldmail_click']).in('user_id', [...new Set(recs.map(r=>r.user_id).filter(Boolean))]).gte('created_at', j.created_at).order('id')) : []
  console.log(`\n${j.source_id} ${j.title} (등록 ${j.created_at.slice(0,10)}) 콜드메일 ${recs.length}건 · 일별 ${JSON.stringify(days)} · kind/status ${JSON.stringify(st)} · 수신자 중 이후 오픈/클릭 이벤트 ${opens.length}`)
}
// 두 공고 수신자 겹침
const [a,b] = await Promise.all(['V222','V223'].map(async c => { const j = jobs.find(x=>x.source_id===c); return new Set((await fetchAll(() => sb.from('job_recommendations').select('user_id').eq('job_id', j.id).order('id'))).map(r=>r.user_id)) }))
console.log('\nV222∩V223 수신자 겹침:', [...a].filter(x=>b.has(x)).length, '| V222만', [...a].filter(x=>!b.has(x)).length, '| V223만', [...b].filter(x=>!a.has(x)).length)
