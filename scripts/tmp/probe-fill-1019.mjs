import { sb, fetchAll } from '../outreach/lib.mjs'
const P = await fetchAll(() => sb.from('user_profiles').select('position,desired_roles,yoe_months,location,salary_min,work_type,job_signal,experiences,skills,university,major,graduation_year,gpa,korean_cert,english_cert,languages,certs,resume_summary,headline,photo_url,current_company,nationality,birthdate,projects,portfolio_url,intro').not('resume_url','is',null).order('created_at'))
const n=P.length, pct=(k)=>(100*P.filter(k).length/n).toFixed(0)+'%'
const filled=(v)=>v!==null&&v!==undefined&&String(v).trim()!==''&&v!=='[]'&&v!=='{}'
const arr=(v)=>Array.isArray(v)&&v.length>0
const hasCert=(c)=>filled(c)&&!/^(none|no|không|없음|-|n\/a|0)$/i.test(String(c).trim())
console.log('이력서 보유', n)
const rows = {
  'position(직군 1개, 평면 enum)': pct(p=>filled(p.position)), 'position=Other/Non-IT': pct(p=>/^(other|non-it)$/i.test(p.position||'')), 'desired_roles': pct(p=>arr(p.desired_roles)), 'headline': pct(p=>filled(p.headline)),
  'yoe_months(연차)': pct(p=>p.yoe_months!==null&&p.yoe_months!==undefined), 'experiences(회사·직함·기간)': pct(p=>arr(p.experiences)), 'experiences 2건+': pct(p=>arr(p.experiences)&&p.experiences.length>=2), 'current_company': pct(p=>filled(p.current_company)),
  'skills': pct(p=>arr(p.skills)), 'certs': pct(p=>arr(p.certs)||filled(p.certs)), 'projects': pct(p=>arr(p.projects)), 'portfolio_url/링크': pct(p=>filled(p.portfolio_url)||(p.resume_summary?.links||[]).length),
  'university': pct(p=>filled(p.university)), 'major(원문)': pct(p=>filled(p.major)), 'graduation_year': pct(p=>filled(p.graduation_year)), 'gpa': pct(p=>filled(p.gpa)),
  'korean_cert(자유문자열)': pct(p=>hasCert(p.korean_cert)), 'english_cert(자유문자열)': pct(p=>hasCert(p.english_cert)), 'languages': pct(p=>arr(p.languages)||filled(p.languages)),
  'location(도시 한 줄)': pct(p=>filled(p.location)), 'birthdate': pct(p=>filled(p.birthdate)), 'nationality': pct(p=>filled(p.nationality)), 'photo_url': pct(p=>filled(p.photo_url)),
  'salary_min(희망연봉)': pct(p=>p.salary_min>0), 'work_type': pct(p=>filled(p.work_type)), 'job_signal': pct(p=>filled(p.job_signal)), 'intro': pct(p=>filled(p.intro)),
  'resume_summary.bullets(한국어 요약)': pct(p=>(p.resume_summary?.bullets||[]).length), 'resume_summary.degree': pct(p=>filled(p.resume_summary?.degree)),
}
for (const [k,v] of Object.entries(rows)) console.log(v.padStart(5), k)
const ks={}; for (const p of P) { const k=String(p.korean_cert||'').trim().slice(0,20); if (hasCert(k)) ks[k]=(ks[k]||0)+1 } console.log('\nkorean_cert 값 예시:', Object.entries(ks).sort((a,b)=>b[1]-a[1]).slice(0,15).map(([k,v])=>k+'='+v).join(' | '))
const pos={}; for (const p of P) pos[p.position||'(빈)']=(pos[p.position||'(빈)']||0)+1; console.log('position 분포:', Object.entries(pos).sort((a,b)=>b[1]-a[1]).slice(0,20).map(([k,v])=>k+'='+v).join(' | '))
