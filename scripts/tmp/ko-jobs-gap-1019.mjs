// 읽기 전용: (A) KTC 공고 조건별(한국어 요구/경력/연봉표기/직군) 지원·서류합격·입사 비교 → 미달 공고의 공통 조건
//            (B) 가입 경로별(연봉제출 vs 공고) 유저의 직군·경력·한국어 시그널·이력서·지원 전환 비교
import { sb, fetchAll } from '../outreach/lib.mjs'
const PASS = new Set(['passed','ready_to_forward','sent_to_company','interviewing','offer','final_passed'])
const koRe = /(한국어|korean|tiếng hàn|tieng han|topik|comtor|interpreter|phiên dịch|phien dich|biên dịch|thông dịch|통역|번역|한국인)/i
const koStrong = /(한국어\s*(능숙|가능|필수|우대)|korean[- ]speaking|korean speaker|tiếng hàn|topik\s*[3-6]|comtor|interpreter|phiên dịch|thông dịch|통역)/i
const med = (a) => { if (!a.length) return 0; const s=[...a].sort((x,y)=>x-y); return s[Math.floor(s.length/2)] }
const pct = (a,b) => b ? (100*a/b).toFixed(0)+'%' : '-'
const tbl = (title, rows) => { console.log('\n## '+title); const cols=[...new Set(rows.flatMap(r=>Object.keys(r)))]; console.log(cols.join('\t')); for (const r of rows) console.log(cols.map(c=>r[c]??'').join('\t')) }

const jobs = await fetchAll(() => sb.from('jobs').select('id,source_id,title,company,role,location,experience_min,salary_min,salary_max,salary_text,requirements,preferred,description,summary,is_active,created_at,close_date,deadline').eq('source','ktc').gte('created_at','2026-07-01').order('created_at'))
const apps = await fetchAll(() => sb.from('job_applications').select('job_id,user_id,status,utm_source,application_source,created_at').in('job_id', jobs.map(j=>j.id)).order('id'))
const cands = await fetchAll(() => sb.from('ktc_candidates').select('job_code,pipeline_status').order('id'))
const { data: hires } = await sb.from('ktc_hires').select('code')
const profs = await fetchAll(() => sb.from('user_profiles').select('id,email,position,role,desired_roles,yoe_months,korean_cert,english_cert,major,location,resume_url,utm_source,utm_campaign,created_at,current_salary').order('created_at'))
const subs = await fetchAll(() => sb.from('submissions').select('user_id,email,role,experience,salary,created_at,utm_campaign').eq('is_seed',false).not('user_id','is',null).order('id'))
console.log('jobs', jobs.length, 'apps', apps.length, 'cands', cands.length, 'profs', profs.length, 'subs(user)', subs.length)

const P = Object.fromEntries(profs.map(p=>[p.id,p]))
const hasCert = (c) => !!c && !/^(none|no|không|없음|-|n\/a|0)$/i.test(String(c).trim())
const koMajor = (p) => /(hàn quốc|korean|korea|ngôn ngữ hàn|đông phương|oriental|한국어|한국학)/i.test(String(p.major||''))
const koSig = (p) => !!p && (hasCert(p.korean_cert) || koMajor(p))
const topik4 = (p) => !!p && (/topik\s*(4|5|6)|(4|5|6)\s*급|level\s*[456]|cấp\s*[456]|topik\s*ii/i.test(String(p.korean_cert||'')) || koMajor(p))

// ---- A. 공고 조건
const jtxt = (j) => [j.title, j.requirements, j.preferred, j.description, j.summary].join(' ')
const A = {}, C = {}, H = {}
for (const a of apps) (A[a.job_id] ||= []).push(a)
for (const c of cands) if (c.job_code) { C[c.job_code] ||= { n:0, pass:0 }; C[c.job_code].n++; if (PASS.has(c.pipeline_status)) C[c.job_code].pass++ }
for (const h of hires||[]) if (h.code) H[h.code]=(H[h.code]||0)+1
const rows = jobs.map(j => { const t = jtxt(j); const ko = koStrong.test(t) ? 'KO필수' : koRe.test(t) ? 'KO언급' : '없음'; const ap = A[j.id]||[]; const koApp = ap.filter(a=>koSig(P[a.user_id])).length
  return { code:j.source_id, created:j.created_at.slice(5,10), company:j.company.slice(0,14), title:j.title.slice(0,30), role:j.role, ko, exp:j.experience_min||0, sal:(j.salary_min>0||j.salary_text)?'Y':'N', loc:String(j.location||'').slice(0,8), apps:ap.length, koApps:koApp, meta:ap.filter(a=>a.utm_source==='meta').length, ktc:C[j.source_id]?.n||0, pass:C[j.source_id]?.pass||0, hire:H[j.source_id]||0, active:j.is_active?'Y':'N' } })
tbl('A0. 공고별 (7월 이후 KTC)', rows)
const grp = (key, label) => { const g={}; for (const r of rows) (g[key(r)] ||= []).push(r)
  tbl('A. '+label, Object.entries(g).sort((a,b)=>b[1].length-a[1].length).map(([k,v])=>({ 조건:k, 공고:v.length, 지원중위:med(v.map(r=>r.apps)), 지원합:v.reduce((s,r)=>s+r.apps,0), '지원<5':v.filter(r=>r.apps<5).length, '지원0':v.filter(r=>r.apps===0).length, KO시그널지원:v.reduce((s,r)=>s+r.koApps,0), KTC스크리닝:v.reduce((s,r)=>s+r.ktc,0), 서류합격:v.reduce((s,r)=>s+r.pass,0), 합격률:pct(v.reduce((s,r)=>s+r.pass,0), v.reduce((s,r)=>s+r.ktc,0)), 입사:v.reduce((s,r)=>s+r.hire,0) }))) }
grp(r=>r.ko, '한국어 요구 여부')
grp(r=>r.ko==='없음'?'KO없음':'KO' , '한국어 2분류')
grp(r=>(r.ko!=='없음'?'KO':'nonKO')+' × exp'+(r.exp>=3?'3+':r.exp>=1?'1-2':'0'), '한국어 × 경력')
grp(r=>(r.ko!=='없음'?'KO':'nonKO')+' × 연봉표기'+r.sal, '한국어 × 연봉표기')
grp(r=>r.role||'(none)', '직군')
grp(r=>(r.ko!=='없음'?'KO':'nonKO')+' × '+(/(dev|engineer|it|game|data|qa|design)/i.test(r.role||'')?'IT/디자인':'비IT'), '한국어 × IT여부')

// ---- B. 가입 경로별 유저
const subUsers = new Set(subs.map(s=>s.user_id))
const appUsers = new Set(apps.map(a=>a.user_id).filter(Boolean))
const allApps = await fetchAll(() => sb.from('job_applications').select('user_id').not('user_id','is',null).order('id'))
const anyApp = new Set(allApps.map(a=>a.user_id))
const path = (p) => { const c = String(p.utm_campaign||''); if (subUsers.has(p.id) || /fyi_may_lead|salary/i.test(c)) return '연봉제출'; if (/cv_register/i.test(c)) return 'CV등록'; if (/ktc-job|job-page|non-it|first-marketing|nstage|topik|jd|megazone|kyndof/i.test(c) || anyApp.has(p.id)) return '공고/지원'; return '기타' }
const roleOf = (p) => { const r = String(p.position||p.role||(p.desired_roles||[])[0]||'').toLowerCase(); if (!r) return '(미기재)'
  if (/(dev|engineer|software|frontend|backend|fullstack|mobile|data|devops|qa|tester|ai|it\b|game)/.test(r)) return 'IT/개발'; if (/(design|ux|ui|graphic|animator|artist)/.test(r)) return '디자인'; if (/(interpreter|translator|phiên dịch|biên dịch|comtor|통역)/.test(r)) return '통번역'; if (/(marketing|content|sales|business|account|kinh doanh|bd)/.test(r)) return '마케팅/영업'; if (/(hr|admin|office|assistant|operations|secretary|general)/.test(r)) return 'HR/사무'; if (/(finance|account|kế toán|audit|tax)/.test(r)) return '재무/회계'; if (/(logistic|supply|import|export|purchas|procure)/.test(r)) return '물류/구매'; if (/(production|manufactur|mechanical|process|quality|qc|maintenance|electrical)/.test(r)) return '생산/엔지니어'; if (/(teacher|education|tutor)/.test(r)) return '교육'; if (/(student|intern|fresher)/.test(r)) return '학생/인턴'; return '기타' }
const since = profs.filter(p=>p.created_at>='2026-06-01')
const G = {}; for (const p of since) (G[path(p)] ||= []).push(p)
tbl('B1. 가입 경로별 (6월 이후 가입 프로필)', Object.entries(G).map(([k,v])=>({ 경로:k, n:v.length, 직군기재:pct(v.filter(p=>roleOf(p)!=='(미기재)').length,v.length), 이력서:pct(v.filter(p=>p.resume_url).length,v.length), KO시그널:pct(v.filter(koSig).length,v.length), 'TOPIK4+':pct(v.filter(topik4).length,v.length), 공고지원:pct(v.filter(p=>anyApp.has(p.id)).length,v.length), 경력중위월:med(v.map(p=>p.yoe_months||0)), '3y+':pct(v.filter(p=>(p.yoe_months||0)>=36).length,v.length) })))
const roleDist = (label, arr) => { const d={}; for (const p of arr) d[roleOf(p)]=(d[roleOf(p)]||0)+1; return { 경로:label, n:arr.length, ...Object.fromEntries(Object.entries(d).sort((a,b)=>b[1]-a[1]).map(([k,v])=>[k, v+' ('+pct(v,arr.length)+')'])) } }
tbl('B2. 가입 경로별 직군 분포', Object.entries(G).map(([k,v])=>roleDist(k,v)))
// 한국어 시그널 유저는 어디서 왔나
const koU = since.filter(koSig); const d={}; for (const p of koU) d[path(p)]=(d[path(p)]||0)+1
console.log('\n## B3. KO 시그널 보유 유저(6월 이후, n='+koU.length+') 가입 경로:', JSON.stringify(d), '| 이력서 보유', koU.filter(p=>p.resume_url).length, '| 공고 지원', koU.filter(p=>anyApp.has(p.id)).length, '| TOPIK4+', koU.filter(topik4).length)
tbl('B4. KO 시그널 유저 직군', [roleDist('KO시그널', koU), roleDist('TOPIK4+', since.filter(topik4))])
// 연봉 제출 role 원문 상위
const sr={}; for (const s of subs) sr[String(s.role||'?').slice(0,30)]=(sr[String(s.role||'?').slice(0,30)]||0)+1
console.log('\n## B5. submissions.role 상위 20:', Object.entries(sr).sort((a,b)=>b[1]-a[1]).slice(0,20).map(([k,v])=>k+'='+v).join(' | '))
// 전체 프로필 중 KO 시그널 규모
console.log('\n## B6. 전체 프로필', profs.length, '| KO 시그널', profs.filter(koSig).length, '| TOPIK4+', profs.filter(topik4).length, '| KO×이력서', profs.filter(p=>koSig(p)&&p.resume_url).length, '| KO×이력서×비IT', profs.filter(p=>koSig(p)&&p.resume_url&&!['IT/개발'].includes(roleOf(p))).length)
