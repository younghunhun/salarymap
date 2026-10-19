// 읽기 전용: 콜드메일 발송(job_recommendations) × 응답(job_applications coldmail_jobs) → 응답률을 가르는 프로필 요인
import { sb, fetchAll } from '../outreach/lib.mjs'
const SINCE='2026-08-15'
const cat = (s) => { s=String(s||'').toLowerCase(); if (!s) return '(none)'
  if (/(interpreter|translator|comtor|phiên dịch|biên dịch|통역)/.test(s)) return '통번역'
  if (/(game|unity)/.test(s)) return '게임'
  if (/(backend|frontend|fullstack|full-stack|web|mobile|developer|software|embedded|devops|data|ai|ml|security|cloud|architect|it support|it\b|qa|tester|publisher|development)/.test(s)) return 'IT'
  if (/(design|ux|ui|graphic|artist|animator|rigger|modeler|motion)/.test(s)) return '디자인'
  if (/(marketing|content|creator|influencer|growth|sns|media|editor|md\b|merchandis|kol)/.test(s)) return '마케팅'
  if (/(sales|business development|account|kinh doanh|pre-?sales|trade|export|sourcing)/.test(s)) return '영업'
  if (/(hr|admin|office|assistant|secretary|operations|administration|hành chính|nhân sự|non-it)/.test(s)) return 'HR/사무'
  if (/(finance|accountant|kế toán|audit|tax|legal)/.test(s)) return '재무'
  if (/(logistic|supply|import|warehouse|purchas|procure)/.test(s)) return '물류'
  if (/(production|manufactur|mechanical|process|quality|qc|maintenance|electrical|technician|factory|kỹ sư|r&d|worker)/.test(s)) return '생산'
  return '기타' }
const region = (s) => { s=String(s||'').toLowerCase(); if (!s.trim()) return '미기재'; if (/(hàn quốc|korea)/.test(s)) return '한국'; if (/remote/.test(s)) return '원격'
  const hcm=/(hồ chí minh|ho chi minh|hcm|sài gòn|saigon|thủ đức|district|quận|bình thạnh|tphcm|bình dương)/.test(s), hn=/(hà nội|ha noi|hanoi|hn\b)/.test(s), dn=/(đà nẵng|da nang|đn\b)/.test(s), prov=/(đồng nai|dong nai|biên hòa|nhơn trạch|long an|vũng tàu|bà rịa|tiền giang|lâm đồng|daklak|bình phước|hải phòng|bắc ninh|hưng yên)/.test(s)
  if (prov&&!hcm&&!hn) return '지방'; if (hcm&&(hn||dn)) return '다지역'; if (hcm) return 'HCM'; if (hn) return 'HN'; if (dn) return 'DN'; return '지방' }
const pct=(a,b)=>b?(100*a/b).toFixed(1)+'%':'-'
const [jobs, recs, apps, profs] = await Promise.all([
  fetchAll(() => sb.from('jobs').select('id,source_id,title,company,role,location,experience_min,salary_min,salary_max,created_at').eq('source','ktc').gte('created_at',SINCE).order('created_at')),
  fetchAll(() => sb.from('job_recommendations').select('job_id,user_id,created_at').gte('created_at',SINCE).order('id')),
  fetchAll(() => sb.from('job_applications').select('job_id,user_id,application_source,created_at').gte('created_at',SINCE).order('id')),
  fetchAll(() => sb.from('user_profiles').select('id,position,role,desired_roles,yoe_months,location,salary_min,salary_max,current_salary,job_signal,work_type,resume_summary,skills,experiences,created_at,updated_at,profile_completed_at,is_resume_public,resume_source,user_type').order('created_at')),
])
const J = Object.fromEntries(jobs.map(j=>[j.id,j])), P = Object.fromEntries(profs.map(p=>[p.id,p]))
const responded = new Set(apps.filter(a=>a.application_source==='coldmail_jobs').map(a=>a.job_id+'|'+a.user_id))
const anyApplied = new Set(apps.map(a=>a.job_id+'|'+a.user_id))
const rows = []
for (const r of recs) { const j=J[r.job_id], p=P[r.user_id]; if (!j||!p) continue
  const jc=cat(j.role+' '+j.title), jr=region(j.location), pr=region(p.location)
  const roles=[p.position,p.role,...(p.desired_roles||[])].filter(Boolean)
  const expTitles=(Array.isArray(p.experiences)?p.experiences.map(e=>e.title||e.position||''):[])
  rows.push({ jc, jr, pr, resp: responded.has(r.job_id+'|'+r.user_id)||anyApplied.has(r.job_id+'|'+r.user_id),
    posMatch: cat(p.position)===jc ? 'position일치' : roles.some(x=>cat(x)===jc) ? 'desired만일치' : expTitles.some(x=>cat(x)===jc) ? '경력직함만일치' : '불일치',
    locMatch: jr==='다지역'||jr==='원격'||jr==='미기재' ? '공고다지역' : pr==='미기재' ? '프로필미기재' : pr===jr ? '일치' : '불일치',
    yoe: (p.yoe_months||0)<12?'<1y':(p.yoe_months||0)<36?'1-3y':'3y+',
    expOk: (p.yoe_months||0) >= (j.experience_min||0)*12 ? '경력충족':'경력미달',
    salOk: !(j.salary_max>0) ? '공고연봉없음' : !(p.salary_min>0) ? '희망연봉없음' : p.salary_min <= j.salary_max ? '연봉OK' : '희망>공고',
    signal: p.job_signal||'(null)', wt: p.work_type||'(null)',
    age: (new Date(r.created_at)-new Date(p.created_at))/864e5 < 30 ? '가입30일내' : (new Date(r.created_at)-new Date(p.created_at))/864e5 < 90 ? '30-90일' : '90일+',
    active: (new Date(r.created_at)-new Date(p.updated_at||p.created_at))/864e5 < 30 ? '최근30일활동' : '30일+비활동',
    summary: p.resume_summary ? '요약있음':'요약없음', nExp: Array.isArray(p.experiences)&&p.experiences.length ? '경력기재':'경력미기재' }) }
console.log('발송', rows.length, '| 응답', rows.filter(r=>r.resp).length, pct(rows.filter(r=>r.resp).length, rows.length))
const by = (title, key, filter=()=>true) => { const g={}; for (const r of rows.filter(filter)) { g[r[key]] ||= {n:0,y:0}; g[r[key]].n++; if (r.resp) g[r[key]].y++ } console.log('\n## '+title); for (const [k,v] of Object.entries(g).sort((a,b)=>b[1].n-a[1].n)) console.log(`  ${k.padEnd(14)} 발송 ${String(v.n).padStart(5)}  응답 ${String(v.y).padStart(4)}  ${pct(v.y,v.n)}`) }
by('공고 직군별 응답률','jc')
const weak = r => ['영업','재무','HR/사무','물류','생산'].includes(r.jc)
by('[영업·재무·사무·물류·생산 공고] 직군 일치 수준','posMatch',weak); by('[같은 공고군] 지역 일치','locMatch',weak); by('[같은 공고군] 경력 밴드','yoe',weak); by('[같은 공고군] 경력 요건','expOk',weak); by('[같은 공고군] 희망연봉 vs 공고','salOk',weak); by('[같은 공고군] job_signal','signal',weak); by('[같은 공고군] 가입 경과','age',weak); by('[같은 공고군] 최근 활동','active',weak); by('[같은 공고군] 경력 기재','nExp',weak)
by('[비교: IT·마케팅·디자인 공고] 직군 일치 수준','posMatch',r=>['IT','마케팅','디자인'].includes(r.jc)); by('[비교: IT·마케팅·디자인] 지역 일치','locMatch',r=>['IT','마케팅','디자인'].includes(r.jc)); by('[비교] 가입 경과','age',r=>['IT','마케팅','디자인'].includes(r.jc))
by('[지방 공고] 프로필 지역','pr', r=>r.jr==='지방')
// 프로필 필드 채움률 (발송가능 풀 기준)
const pool = profs; const f = (k) => pct(pool.filter(k).length, pool.length)
console.log('\n## 프로필 필드 채움률 (전체', pool.length, ')', '\n  position', f(p=>p.position), '| desired_roles', f(p=>(p.desired_roles||[]).length), '| location', f(p=>p.location), '| salary_min', f(p=>p.salary_min>0), '| job_signal', f(p=>p.job_signal), '| work_type', f(p=>p.work_type), '| experiences', f(p=>Array.isArray(p.experiences)&&p.experiences.length), '| resume_summary', f(p=>p.resume_summary))
const ls={}; for (const p of pool) ls[region(p.location)]=(ls[region(p.location)]||0)+1; console.log('  location 분포', JSON.stringify(ls))
const js={}; for (const p of pool) js[p.job_signal||'(null)']=(js[p.job_signal||'(null)']||0)+1; console.log('  job_signal 분포', JSON.stringify(js))
