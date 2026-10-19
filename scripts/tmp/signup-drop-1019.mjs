// 읽기 전용: 2026-08-17 ~ 10-15 주별 가입 / 세션 / 채널 / 랜딩별 전환 — 홍보비 ↑ 지표 ↓ 원인 진단
import { sb, fetchAll } from '../outreach/lib.mjs'
import { isExcludedSignup } from '../../lib/admin-metrics.js'
const SINCE = '2026-08-17', UNTIL = '2026-10-20'
const vn = (iso) => new Date(new Date(iso).getTime() + 7*36e5)
const vnDay = (iso) => vn(iso).toISOString().slice(0,10)
const wk = (iso) => { const d = vn(iso); const dow = (d.getUTCDay()+6)%7; d.setUTCDate(d.getUTCDate()-dow); return d.toISOString().slice(5,10) } // 월요일 시작 주(MM-DD)
const entryType = (p) => { if (!p) return '(none)'; p = p.split('?')[0]
  if (p === '/') return '/ 홈(연봉)'; if (p.startsWith('/l/')) return '/l/* 공고모음'; if (/^\/ktc\/jobs\//.test(p)) return '/ktc/jobs/[id]'; if (p.startsWith('/ktc')) return '/ktc*'
  if (/^\/jobs\/[^/]+/.test(p)) return '/jobs/[id]'; if (p.startsWith('/jobs')) return '/jobs'; if (/^\/(korean-cv|kcv|hongik)/.test(p)) return '/korean-cv'; if (p.startsWith('/community')) return '/community'; if (p.startsWith('/auth')) return '/auth'
  return p.split('/').slice(0,2).join('/') }
const chan = (s, ref) => { s = (s||'').toLowerCase(); if (s==='meta') return 'meta_paid'; if (['fb-group','facebook','fb','instagram','ig','threads','zalo','linkedin'].includes(s)) return 'organic_social:'+s; if (s) return 'utm:'+s
  const h = (ref||'').toLowerCase(); if (!h) return 'direct'; if (/facebook|instagram|threads|zalo|linkedin|t\.co/.test(h)) return 'ref_social'; if (/google|bing/.test(h)) return 'search'; if (/salary|localhost|vercel/.test(h)) return 'internal'; return 'ref_other' }
const inc = (o, k, n=1) => { o[k] = (o[k]||0)+n }
const tbl = (title, rows) => { console.log('\n## '+title); const cols = [...new Set(rows.flatMap(r=>Object.keys(r)))]; console.log(cols.join('\t')); for (const r of rows) console.log(cols.map(c=>r[c]??'').join('\t')) }

// 1. 가입자 (auth.users)
const users = []
for (let p=1;;p++) { const { data, error } = await sb.auth.admin.listUsers({ page:p, perPage:1000 }); if (error) throw error; users.push(...(data?.users||[])); if ((data?.users||[]).length<1000) break }
const signups = users.filter(u => u.created_at >= new Date(new Date(SINCE).getTime()-7*36e5).toISOString() && vnDay(u.created_at) < UNTIL && !isExcludedSignup(u))
const uid = new Set(signups.map(u=>u.id))

// 2. 이벤트
const EV = ['session_start','sign_up','company_gate_login_success','click_login','view_login_page','result_gate_view','click_apply_button','submit_application','landing']
const ev = await fetchAll(() => sb.from('events').select('id,event,created_at,user_id,client_id,page,meta').gte('created_at', new Date(new Date(SINCE).getTime()-7*36e5).toISOString()).lt('created_at', new Date(new Date(UNTIL).getTime()-7*36e5).toISOString()).in('event', EV).order('id'))
console.log('users', users.length, 'signups', signups.length, 'events', ev.length)

// 3. 프로필 utm
const profs = {}
for (let i=0;i<signups.length;i+=200) { const { data } = await sb.from('user_profiles').select('id,utm_source,utm_medium,utm_campaign,utm_content').in('id', signups.slice(i,i+200).map(u=>u.id)); for (const p of data||[]) profs[p.id]=p }

// 4. client_id 타임라인 & user→client 매핑
const byCid = new Map(); const cidOfUser = new Map()
for (const e of ev) { if (e.client_id) { (byCid.get(e.client_id) || byCid.set(e.client_id, []).get(e.client_id)).push(e); if (e.user_id && !cidOfUser.has(e.user_id)) cidOfUser.set(e.user_id, e.client_id) } }
// 유저별 첫 이벤트
const firstEv = new Map(); for (const e of ev) if (e.user_id && !firstEv.has(e.user_id)) firstEv.set(e.user_id, e)

// ---- A. 주별 가입 (web/app) + 연봉제출(submit) + 지원(submit_application)
const weeks = {}
for (const u of signups) { const w = wk(u.created_at); weeks[w] ||= { week:w, signups:0, app:0 }; weeks[w].signups++; if (firstEv.get(u.id)?.meta?.platform==='app') weeks[w].app++ }
for (const e of ev) { const w = wk(e.created_at); weeks[w] ||= { week:w, signups:0, app:0 }; if (e.event==='session_start') { inc(weeks[w],'sessions'); if (e.meta?.utm_source==='meta') inc(weeks[w],'meta_sessions') } if (e.event==='sign_up') inc(weeks[w],'sign_up_ev'); if (e.event==='submit_application') inc(weeks[w],'applications'); if (e.event==='company_gate_login_success') inc(weeks[w],'gate_login') }
tbl('A. 주별 (월요일 시작, VN 기준) 가입·세션', Object.values(weeks).sort((a,b)=>a.week<b.week?-1:1))

// ---- B. 주별 세션 채널 (distinct client_id)
const sessW = {}
for (const e of ev) if (e.event==='session_start') { const w = wk(e.created_at); sessW[w] ||= { week:w, _c:{} }; const c = chan(e.meta?.utm_source, e.meta?.referrer); (sessW[w]._c[c] ||= new Set()).add(e.client_id||e.id) }
tbl('B. 주별 세션 채널 (고유 client)', Object.values(sessW).sort((a,b)=>a.week<b.week?-1:1).map(r => { const o={week:r.week}; for (const [k,v] of Object.entries(r._c).sort((a,b)=>b[1].size-a[1].size)) o[k]=v.size; return o }))

// ---- C. 메타 유료 세션: 주별 랜딩 유형 / 캠페인
const metaW = {}, metaCamp = {}
for (const e of ev) if (e.event==='session_start' && e.meta?.utm_source==='meta') { const w = wk(e.created_at); metaW[w] ||= { week:w }; inc(metaW[w], entryType(e.meta?.entry_path||e.page)); metaCamp[w] ||= { week:w }; inc(metaCamp[w], (e.meta?.utm_campaign||'(none)')+'|'+(e.meta?.utm_medium||'')) }
tbl('C1. 메타 유료 세션 → 랜딩 유형 (주별)', Object.values(metaW).sort((a,b)=>a.week<b.week?-1:1))
tbl('C2. 메타 유료 세션 → 캠페인|medium (주별, 상위)', Object.values(metaCamp).sort((a,b)=>a.week<b.week?-1:1).map(r=>{ const o={week:r.week}; Object.entries(r).filter(([k])=>k!=='week').sort((a,b)=>b[1]-a[1]).slice(0,8).forEach(([k,v])=>o[k]=v); return o }))

// ---- D. 가입 귀속 (profile utm > 첫 이벤트 utm > 해당 client 의 직전 session_start)
const attrW = {}, attrEntryW = {}
for (const u of signups) { const w = wk(u.created_at); const p = profs[u.id]; const fe = firstEv.get(u.id); let src = p?.utm_source || fe?.meta?.utm_source || null, ref = fe?.meta?.referrer || null, entry = null
  const cid = cidOfUser.get(u.id); if (cid) { const tl = byCid.get(cid)||[]; let last=null; for (const e of tl) { if (e.event==='session_start' && e.created_at <= u.created_at) last = e } if (last) { src ||= last.meta?.utm_source; ref ||= last.meta?.referrer; entry = entryType(last.meta?.entry_path||last.page) } }
  attrW[w] ||= { week:w }; inc(attrW[w], chan(src, ref)); attrEntryW[w] ||= { week:w }; inc(attrEntryW[w], entry || (fe ? 'first:'+entryType(fe.page) : '(no event)')) }
tbl('D1. 주별 가입 귀속 채널', Object.values(attrW).sort((a,b)=>a.week<b.week?-1:1))
tbl('D2. 주별 가입 → 진입 랜딩 유형', Object.values(attrEntryW).sort((a,b)=>a.week<b.week?-1:1))

// ---- E. 메타 유료 랜딩 유형별 전환 (client 기준: 세션 후 7일 내 sign_up or company_gate_login_success or click_apply_button)
const CONV = new Set(['sign_up','company_gate_login_success']); const INTENT = new Set(['click_login','view_login_page','result_gate_view','click_apply_button'])
const funnel = {}
for (const [cid, tl] of byCid) { const first = tl.find(e=>e.event==='session_start' && e.meta?.utm_source==='meta'); if (!first) continue
  const w = wk(first.created_at), t = entryType(first.meta?.entry_path||first.page); const key = w+' '+t; funnel[key] ||= { week:w, landing:t, clients:0, intent:0, signup:0, applied:0 }
  funnel[key].clients++; let intent=false, conv=false, app=false
  for (const e of tl) { if (e.created_at < first.created_at) continue; if (INTENT.has(e.event)) intent=true; if (CONV.has(e.event)) conv=true; if (e.event==='submit_application') app=true; if (e.user_id && uid.has(e.user_id)) conv=true }
  if (intent) funnel[key].intent++; if (conv) funnel[key].signup++; if (app) funnel[key].applied++ }
tbl('E. 메타 유료 클릭 → 랜딩 유형별 전환 (client 기준)', Object.values(funnel).filter(r=>r.clients>=20).sort((a,b)=> a.week===b.week ? b.clients-a.clients : (a.week<b.week?-1:1)).map(r=>({ ...r, signup_pct: (100*r.signup/r.clients).toFixed(1), intent_pct:(100*r.intent/r.clients).toFixed(1) })))

// ---- F. 최근 3주 일별 (가입 / 메타세션 / 전체세션)
const days = {}
for (const u of signups) { const d = vnDay(u.created_at); if (d >= '2026-09-29') { days[d] ||= { day:d, signups:0 }; days[d].signups++ } }
for (const e of ev) if (e.event==='session_start') { const d = vnDay(e.created_at); if (d >= '2026-09-29') { days[d] ||= { day:d, signups:0 }; inc(days[d],'sessions'); if (e.meta?.utm_source==='meta') inc(days[d],'meta_sess') } }
tbl('F. 최근 일별', Object.values(days).sort((a,b)=>a.day<b.day?-1:1))
