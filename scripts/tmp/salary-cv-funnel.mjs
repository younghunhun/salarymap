import { sb, fetchAll } from '../outreach/lib.mjs'
import { isExcludedSubmission } from '../../lib/admin-metrics.js'
const SINCE='2026-07-01'
const HOME=['landing','hero_cta_click','wizard_cat_click','result_gate_view','company_gate_click','company_gate_login_success','result_company_card_click']
const CV=['cv_view','cv_click_hero_cta','cv_click_cta','cv_open_picker','cv_form_view','cv_attach_file','cv_attach_rejected','cv_oauth_start','cv_oauth_return','cv_register_success','cv_register_error','cv_resume_public_error']
const RS=['resume_view','resume_click_hero_cta','resume_click_cta','resume_attach_file','resume_attach_rejected','resume_oauth_start','resume_oauth_return','resume_register_success','resume_register_error','resume_match_shown']
const PF=['profile_view','profile_edit_start','profile_ai_parse_start','profile_ai_parse_done','profile_ai_parse_error','profile_abandon_dirty','profile_abandon_discard','profile_login_redirect']
const ev=await fetchAll(()=>sb.from('events').select('event,created_at,user_id,client_id,page,meta').gte('created_at',SINCE).in('event',[...HOME,...CV,...RS,...PF,'view_jobs_page','submit_application']).order('created_at'))
const M=(d)=>d.slice(0,7)
const uniq={}
for(const e of ev){const k=e.client_id||e.user_id;if(!k)continue;((uniq[M(e.created_at)]||={})[e.event]||=new Set()).add(k)}
const show=(title,list)=>{console.log('\n## '+title+' (unique client/month)');const months=Object.keys(uniq).sort();console.log('event'.padEnd(28),months.map(m=>m.slice(5).padStart(7)).join(''));for(const n of list)console.log(n.padEnd(28),months.map(m=>String(uniq[m]?.[n]?.size||0).padStart(7)).join(''))}
show('HOME 연봉 플로우',HOME); show('CV 등록 플로우 (/cv)',CV); show('RESUME 플로우 (/resume)',RS); show('PROFILE',PF)
// errors / rejections reasons
console.log('\n## 오류·거절 사유 top')
for(const n of ['cv_attach_rejected','cv_register_error','cv_resume_public_error','resume_attach_rejected','resume_register_error','profile_ai_parse_error','profile_abandon_dirty']){const o={};for(const e of ev)if(e.event===n){const r=JSON.stringify(e.meta||{}).slice(0,90);o[r]=(o[r]||0)+1}const t=Object.entries(o).sort((a,b)=>b[1]-a[1]).slice(0,4);if(t.length)console.log(n,t)}
// submissions
const subs=await fetchAll(()=>sb.from('submissions').select('id,created_at,user_id,email,company,source').gte('created_at','2026-04-20').order('created_at'))
const real=subs.filter(s=>!isExcludedSubmission(s))
const sm={};for(const s of real){const m=M(s.created_at);(sm[m]||={n:0,linked:0});sm[m].n++;if(s.user_id)sm[m].linked++}
console.log('\n## 연봉 제출 (submissions) 월별: n / user_id 연결');for(const m of Object.keys(sm).sort())console.log(m,sm[m])
// 게이트 로그인 성공 유저의 후속 행동
const gate=ev.filter(e=>e.event==='company_gate_login_success'&&e.user_id)
const gids=[...new Set(gate.map(e=>e.user_id))]
const chunk=async(sel)=>{const out=[];for(let i=0;i<gids.length;i+=200){const {data}=await sel(gids.slice(i,i+200));out.push(...(data||[]))}return out}
const prof=await chunk(x=>sb.from('user_profiles').select('id,resume_url,position').in('id',x))
const apps=await chunk(x=>sb.from('job_applications').select('user_id').in('user_id',x))
const appSet=new Set(apps.map(a=>a.user_id)); const cvSet=new Set(prof.filter(p=>p.resume_url).map(p=>p.id))
const jobsAfter=new Set(ev.filter(e=>e.event==='view_jobs_page'&&e.user_id).map(e=>e.user_id))
const n=gids.length; console.log(`\n## 게이트 로그인 유저 ${n}명 후속: /jobs 조회 ${[...jobsAfter].filter(u=>gids.includes(u)).length}, 지원 ${[...appSet].length}, CV 등록 ${cvSet.size}`)
// 연봉 제출자 중 CV 보유
const subUsers=[...new Set(real.filter(s=>s.user_id).map(s=>s.user_id))]
let withCv=0;for(let i=0;i<subUsers.length;i+=200){const {data}=await sb.from('user_profiles').select('id,resume_url').in('id',subUsers.slice(i,i+200));withCv+=(data||[]).filter(p=>p.resume_url).length}
console.log(`## 연봉 제출 연결 유저 ${subUsers.length}명 중 CV 보유 ${withCv} (${(100*withCv/subUsers.length).toFixed(0)}%)`)
