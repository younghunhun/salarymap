// 읽기 전용: 메타 유료 캠페인별 클릭(client) → 가입 전환, 기간 전체 + 최근 3주
import { sb, fetchAll } from '../outreach/lib.mjs'
import { isExcludedSignup } from '../../lib/admin-metrics.js'
const SINCE = '2026-08-16T17:00:00Z', MID = '2026-09-21T17:00:00Z', UNTIL = '2026-10-15T17:00:00Z'
const users = []
for (let p=1;;p++) { const { data } = await sb.auth.admin.listUsers({ page:p, perPage:1000 }); users.push(...(data?.users||[])); if ((data?.users||[]).length<1000) break }
const uid = new Set(users.filter(u=>!isExcludedSignup(u)).map(u=>u.id))
const ev = await fetchAll(() => sb.from('events').select('id,event,created_at,user_id,client_id,page,meta').gte('created_at', SINCE).lt('created_at', UNTIL).in('event', ['session_start','sign_up','company_gate_login_success','click_login','view_login_page','result_gate_view','click_apply_button','submit_application']).order('id'))
const byCid = new Map(); for (const e of ev) if (e.client_id) (byCid.get(e.client_id) || byCid.set(e.client_id, []).get(e.client_id)).push(e)
const lt = (p) => { p=(p||'').split('?')[0]; if (p==='/') return '홈'; if (p.startsWith('/l/')) return p; if (/^\/ktc\/jobs\//.test(p)) return '/ktc/jobs/[id]'; if (p.startsWith('/jobs')) return '/jobs'; return p.split('/').slice(0,2).join('/') }
const agg = {}
for (const [cid, tl] of byCid) { const f = tl.find(e=>e.event==='session_start' && e.meta?.utm_source==='meta'); if (!f) continue
  const period = f.created_at >= MID ? 'B 9/22~10/15' : 'A 8/17~9/21'
  const k = period+'\t'+(f.meta?.utm_campaign||'(none)')+'\t'+lt(f.meta?.entry_path||f.page); agg[k] ||= { clients:0, intent:0, signup:0, applied:0 }; agg[k].clients++
  let i=false,s=false,a=false; for (const e of tl) { if (e.created_at<f.created_at) continue; if (['click_login','view_login_page','result_gate_view','click_apply_button'].includes(e.event)) i=true; if (e.event==='sign_up'||e.event==='company_gate_login_success'||(e.user_id&&uid.has(e.user_id))) s=true; if (e.event==='submit_application') a=true }
  if (i) agg[k].intent++; if (s) agg[k].signup++; if (a) agg[k].applied++ }
console.log('period\tcampaign\tlanding\tclients\tintent%\tsignups\tsignup%\tapplied')
for (const [k,v] of Object.entries(agg).sort((a,b)=> a[0].slice(0,1)===b[0].slice(0,1) ? b[1].clients-a[1].clients : a[0]<b[0]?-1:1)) if (v.clients>=15) console.log(k+'\t'+v.clients+'\t'+(100*v.intent/v.clients).toFixed(1)+'\t'+v.signup+'\t'+(100*v.signup/v.clients).toFixed(1)+'\t'+v.applied)
