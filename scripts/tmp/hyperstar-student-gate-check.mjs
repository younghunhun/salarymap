import { sb, fetchAll } from '../outreach/lib.mjs'
const JOB='78e17892-ca73-4bb3-8e6e-191d4691b631'
const recs = await fetchAll(() => sb.from('job_recommendations').select('user_id').eq('job_id', JOB).order('id'))
const apps = await fetchAll(() => sb.from('job_applications').select('user_id').eq('job_id', JOB).order('id'))
const sent = new Set(recs.map(r=>r.user_id)), applied = new Set(apps.map(a=>a.user_id))
const profs = await fetchAll(() => sb.from('user_profiles').select('id,full_name,position,desired_roles,skills,resume_summary,experiences,major,location,yoe_months,english_cert,korean_cert,graduation_year,headline,resume_url').not('resume_url','is',null).order('created_at'))
const roles = (p) => [p.position, ...(p.desired_roles||[])].filter(Boolean)
const exp = (p) => Array.isArray(p.experiences) ? p.experiences.map(e=>`${e.title||e.position||''} ${e.company||''} ${e.description||''}`).join(' ') : ''
const txt = (p) => (JSON.stringify(p.skills||'')+' '+String(p.position||'')+' '+String(p.resume_summary||'')+' '+exp(p)+' '+String(p.major||'')).toLowerCase()
const inHcm = (p) => /(h[ồo]\s*ch[íi]\s*minh|hcm|sài gòn|sai gon|saigon|thủ đức|thu duc|bình thạnh|bình dương|binh duong|đồng nai|dong nai|biên hòa|bien hoa)/i.test(String(p.location||''))
const MKT=/^(marketing|content producer|pr|digital marketing|social media|brand)/i, DEV=/(backend|frontend|fullstack|mobile|web|embedded|cloud|devops|qa|data|ai|ml|game|security|sysadmin|network)/i
const mkt = (p) => roles(p).some(r=>MKT.test(String(r)))
const devOnly = (p) => roles(p).length>0 && roles(p).every(r=>DEV.test(String(r))) && !MKT.test(String(p.position||''))
const infl = (p) => /(influencer|kol|koc|seeding|booking)/i.test(p.__t)
const langAny = (p) => !!p.english_cert||!!p.korean_cert||/(ielts|toeic|toefl|topik|english|tiếng anh|tiếng hàn|korean)/i.test(p.__t)
const y = (p) => p.yoe_months ?? 0
for (const p of profs) p.__t = txt(p)
const pool = profs.filter(p => !sent.has(p.id) && !applied.has(p.id) && inHcm(p) && y(p)<=24 && !devOnly(p) && ((infl(p)&&langAny(p)) || (mkt(p)&&langAny(p))))
const g = (p) => parseInt(p.graduation_year)||0
const hl = (p) => String(p.headline||'')
const byGrad = (p) => g(p) >= 2027
const byHeadStudent = (p) => !byGrad(p) && /(student|sinh viên)/i.test(hl(p)) && g(p) >= 2026
const byHeadIntern = (p) => !byGrad(p) && !byHeadStudent(p) && /(intern|thực tập|năm (nhất|hai|ba|tư|[1-4])|year)/i.test(hl(p)) && g(p) >= 2026
console.log('기존 티어 신규 풀(10/2 발송 19 제외 전):', pool.length)
console.log('  졸업연도 2027 이후(아직 재학 중):', pool.filter(byGrad).length)
console.log('  졸업 2026 + 헤드라인 student/sinh viên:', pool.filter(byHeadStudent).length)
console.log('  졸업 2026 + 헤드라인 intern/year만(졸업자일 수 있음):', pool.filter(byHeadIntern).length)
console.log('  통과:', pool.filter(p=>!byGrad(p)&&!byHeadStudent(p)&&!byHeadIntern(p)).length)
console.log('--- 졸업연도 분포:', JSON.stringify(pool.reduce((a,p)=>{const k=g(p)||'없음';a[k]=(a[k]||0)+1;return a},{})))
console.log('--- 헤드라인 intern 룰로만 빠진 사람 샘플:')
for (const p of pool.filter(byHeadIntern).slice(0,12)) console.log('  ', (p.full_name||'').slice(0,20).padEnd(20), '| grad', g(p), '| yoe', y(p), '|', hl(p).slice(0,70))
