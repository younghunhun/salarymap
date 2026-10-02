// 가입했는데 이력서 미등록 + 우리 메일(콜드메일·추천·리마인드 등 user_id 귀속 발송)을 한 번도 안 받은 회원 수
import { sb, fetchAll } from '../outreach/lib.mjs'
const profs = await fetchAll(() => sb.from('user_profiles').select('id,email,created_at,resume_url').not('email','is',null).order('created_at'))
const noCv = profs.filter(p => !p.resume_url)
const mailed = new Set()
// 1) events 중 발송 마커(*_sent) user_id
const evs = await fetchAll(() => sb.from('events').select('user_id, event').like('event','%_sent').neq('event','push_sent').not('user_id','is',null).order('id'))
for (const e of evs) mailed.add(e.user_id)
const evNames = [...new Set(evs.map(e=>e.event))]
// 2) job_recommendations(추천 메일)
const recs = await fetchAll(() => sb.from('job_recommendations').select('user_id').not('user_id','is',null).order('id'))
for (const r of recs) mailed.add(r.user_id)
// 3) 공개 콜드메일(비회원 시절 lead 해시) → 가입 전환 이벤트로 user_id 연결
const conv = await fetchAll(() => sb.from('events').select('meta').eq('event','coldmail_public_convert').order('id'))
for (const c of conv) if (c.meta?.converted_user) mailed.add(c.meta.converted_user)
const never = noCv.filter(p => !mailed.has(p.id))
const likelion = never.filter(p => /@likelion\.net$/i.test(p.email)).length
const d = (iso) => iso.slice(0,10)
const byMonth = {}; for (const p of never) { const m = p.created_at.slice(0,7); byMonth[m]=(byMonth[m]||0)+1 }
console.log('회원 전체', profs.length, '| 이력서 미등록', noCv.length, '| 그중 메일 수신 이력 0 =', never.length, `(likelion.net ${likelion} 포함)`)
console.log('발송 마커 이벤트 종류:', evNames.join(', '))
console.log('미등록·미수신 가입월 분포:', JSON.stringify(byMonth))
console.log('도메인 top:', JSON.stringify(Object.entries(never.reduce((a,p)=>{const k=p.email.split('@')[1];a[k]=(a[k]||0)+1;return a},{})).sort((a,b)=>b[1]-a[1]).slice(0,6)))
