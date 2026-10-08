// 읽기 전용: 가입을 이끈 진입 경로/트리거 분포 (2026-04-20 이후)
import { sb, fetchAll } from '../outreach/lib.mjs'
const SINCE = '2026-04-20'
const EV = ['session_start','sign_up','company_gate_login_success','result_gate_view','click_login','view_login_page','landing',
  'view_jobs_page','kcv_view','cv_view','resume_view','view_community','profile_view','search_company','click_apply_button',
  'submit_application','ktc_claim_login_click','ktc_status_login_click','cv_oauth_start','resume_oauth_start','one_tap_success',
  'wizard_cat_click','result_company_card_click','ktc_claim_done','resume_register_success','cv_register_success']
const norm = (p) => { if (!p) return '(none)'; p = p.split('?')[0]
  if (p === '/') return '/ (홈·연봉)'; if (/^\/jobs\/[^/]+/.test(p)) return '/jobs/[id]'; if (p.startsWith('/jobs')) return '/jobs'
  if (/^\/company\//.test(p)) return '/company/*'; if (/^\/ktc/.test(p)) return '/ktc*'; if (/^\/(korean-cv|hongik|kcv)/.test(p)) return '/korean-cv'
  if (/^\/community/.test(p)) return '/community*'; if (/^\/(cv|resume)/.test(p)) return '/cv'; if (/^\/auth/.test(p)) return '/auth'
  return p.split('/').slice(0,2).join('/') }
const cnt = (arr, f) => { const o = {}; for (const x of arr) { const k = f(x); o[k] = (o[k]||0)+1 } return Object.fromEntries(Object.entries(o).sort((a,b)=>b[1]-a[1])) }
const top = (o, n=12) => Object.fromEntries(Object.entries(o).slice(0,n))

const ev = await fetchAll(() => sb.from('events').select('id,event,created_at,user_id,client_id,page,meta').gte('created_at', SINCE).in('event', EV).order('id'))
const profs = await fetchAll(() => sb.from('user_profiles').select('id,email,created_at,utm_source').gte('created_at', SINCE).order('created_at'))
const real = profs.filter(p => !/@likelion\.net$/i.test(p.email||''))
const out = { rows: ev.length, signups_profiles: real.length }

// 세션 진입 경로 분포 + 월별
const ss = ev.filter(e => e.event === 'session_start')
out.sessions_by_entry = top(cnt(ss, e => norm(e.meta?.entry_path || e.page)))
out.sessions_by_entry_month = {}
for (const e of ss) { const m = e.created_at.slice(0,7); (out.sessions_by_entry_month[m] ||= {}); const k = norm(e.meta?.entry_path||e.page); out.sessions_by_entry_month[m][k]=(out.sessions_by_entry_month[m][k]||0)+1 }

// client_id 기준 타임라인
const byCid = new Map()
for (const e of ev) if (e.client_id) { (byCid.get(e.client_id) || byCid.set(e.client_id, []).get(e.client_id)).push(e) }
for (const a of byCid.values()) a.sort((x,y)=> x.created_at < y.created_at ? -1 : 1)

// sign_up 이벤트 → 직전 세션 진입 경로 / 직전 트리거 이벤트
const su = ev.filter(e => e.event === 'sign_up')
out.sign_up_events = su.length; out.sign_up_first = su[0]?.created_at; out.sign_up_with_cid = su.filter(e=>e.client_id).length
const entryOf = [], trigOf = [], entryMonth = {}
const TRIG = new Set(['result_gate_view','click_login','view_login_page','cv_oauth_start','resume_oauth_start','ktc_claim_login_click','ktc_status_login_click','click_apply_button','kcv_view','view_jobs_page','landing','view_community','wizard_cat_click','search_company'])
for (const s of su) { if (!s.client_id) continue; const tl = byCid.get(s.client_id) || []
  let entry = '(no session)', trig = '(none)'
  for (const e of tl) { if (e.created_at >= s.created_at) break
    if (e.event === 'session_start') entry = norm(e.meta?.entry_path || e.page)
    else if (TRIG.has(e.event)) trig = e.event + '@' + norm(e.page) }
  entryOf.push(entry); trigOf.push(trig); const m = s.created_at.slice(0,7); (entryMonth[m] ||= {})[entry] = ((entryMonth[m]||{})[entry]||0)+1 }
out.signup_by_entry = cnt(entryOf, x=>x); out.signup_by_entry_month = entryMonth; out.signup_by_trigger = top(cnt(trigOf, x=>x), 15)

// 진입 경로별 전환율 = 해당 경로로 진입한 client 수 대비 가입(sign_up) client 수 (sign_up 이벤트 존재 기간만)
const since = out.sign_up_first
const cidEntry = new Map()
for (const e of ss) if (e.client_id && e.created_at >= since) { const k = norm(e.meta?.entry_path||e.page); (cidEntry.get(k) || cidEntry.set(k,new Set()).get(k)).add(e.client_id) }
const suCid = new Set(su.map(s=>s.client_id).filter(Boolean))
out.conv_by_entry = {}
for (const [k, set] of cidEntry) { let c=0; for (const cid of set) if (suCid.has(cid)) c++; if (set.size >= 200) out.conv_by_entry[k] = { visitors: set.size, signups: c, rate_pct: +(100*c/set.size).toFixed(2) } }
out.conv_by_entry = Object.fromEntries(Object.entries(out.conv_by_entry).sort((a,b)=>b[1].signups-a[1].signups))

// 게이트 로그인 성공 소스
out.gate_login_source = cnt(ev.filter(e=>e.event==='company_gate_login_success'), e => String(e.meta?.source||'?'))

// 전체 가입자(프로필) 기준: 가입 직후 첫 로그인 이벤트 페이지 (월별) — sign_up 이벤트 없던 초기 커버
const byUser = new Map()
for (const e of ev) if (e.user_id && e.event !== 'sign_up') { const cur = byUser.get(e.user_id); if (!cur || e.created_at < cur.created_at) byUser.set(e.user_id, e) }
out.first_logged_page_month = {}
let covered = 0
for (const p of real) { const e = byUser.get(p.id); const m = p.created_at.slice(0,7); (out.first_logged_page_month[m] ||= {}); if (!e) { out.first_logged_page_month[m]['(no event)'] = (out.first_logged_page_month[m]['(no event)']||0)+1; continue } covered++
  const k = norm(e.page); out.first_logged_page_month[m][k] = (out.first_logged_page_month[m][k]||0)+1 }
out.first_logged_covered = covered
// 행동 이벤트 볼륨 (월별)
out.engagement_month = {}
for (const e of ev) if (['landing','result_gate_view','view_jobs_page','kcv_view','cv_view','resume_view','view_community','search_company','submit_application','wizard_cat_click'].includes(e.event)) { const m=e.created_at.slice(0,7); (out.engagement_month[m] ||= {})[e.event] = ((out.engagement_month[m]||{})[e.event]||0)+1 }
console.log(JSON.stringify(out, null, 1))
