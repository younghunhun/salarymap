import { sb, fetchAll } from '../outreach/lib.mjs'
const JOB='78e17892-ca73-4bb3-8e6e-191d4691b631'
const recs = await fetchAll(() => sb.from('job_recommendations').select('user_id, created_at, kind').eq('job_id', JOB).order('created_at'))
console.log('추천 행', recs.length, '| 유니크 수신', new Set(recs.map(r=>r.user_id)).size, '| kind:', JSON.stringify(recs.reduce((a,r)=>{a[r.kind||'-']=(a[r.kind||'-']||0)+1;return a},{})))
const apps = await fetchAll(() => sb.from('job_applications').select('user_id, created_at, status, application_source').eq('job_id', JOB).order('created_at'))
const by = {}; for (const a of apps) by[a.application_source||'direct'] = (by[a.source_id||'direct']||0)+1
const sentSet = new Set(recs.map(r=>r.user_id)); const appSet = new Set(apps.map(a=>a.user_id))
console.log('지원', apps.length, 'application_source별:', JSON.stringify(by), '| 추천 수신자 중 지원', apps.filter(a=>sentSet.has(a.user_id)).length)
const profs = await fetchAll(() => sb.from('user_profiles').select('id,email,position,desired_roles,skills,resume_summary,experiences,major,location,yoe_months,english_cert,korean_cert,resume_url,created_at').not('resume_url','is',null).order('created_at'))
const roles = (p) => [p.position, ...(p.desired_roles||[])].filter(Boolean)
const exp = (p) => Array.isArray(p.experiences) ? p.experiences.map(e=>`${e.title||e.position||''} ${e.company||''} ${e.description||''}`).join(' ') : ''
const txt = (p) => (JSON.stringify(p.skills||'')+' '+String(p.position||'')+' '+String(p.resume_summary||'')+' '+exp(p)+' '+String(p.major||'')).toLowerCase()
const inHcm = (p) => /(h[ồo]\s*ch[íi]\s*minh|hcm|sài gòn|sai gon|saigon|thủ đức|thu duc|bình thạnh|bình dương|binh duong|đồng nai|dong nai|biên hòa|bien hoa)/i.test(String(p.location||''))
const MKT=/^(marketing|content producer|pr|digital marketing|social media|brand)/i, DEV=/(backend|frontend|fullstack|mobile|web|embedded|cloud|devops|qa|data|ai|ml|game|security|sysadmin|network)/i
const mkt = (p) => roles(p).some(r=>MKT.test(String(r)))
const devOnly = (p) => roles(p).length>0 && roles(p).every(r=>DEV.test(String(r))) && !MKT.test(String(p.position||''))
const infl = (p) => /(influencer|kol|koc|seeding|booking)/i.test(p.__t)
const certEn = (p) => /(ielts\s*[6-9]|toeic\s*[6-9]\d\d|toefl|b2|c1|c2|fluent|advanced|proficien)/i.test(String(p.english_cert||''))
const certKo = (p) => /(topik\s*(ii\s*)?(level\s*)?[3-6]|topik\s*[3-6]|intermediate|advanced|고급|중급|native)/i.test(String(p.korean_cert||''))
const langHi = (p) => certEn(p)||certKo(p)
const langAny = (p) => !!p.english_cert||!!p.korean_cert||/(ielts|toeic|toefl|topik|english|tiếng anh|tiếng hàn|korean)/i.test(p.__t)
const y = (p) => p.yoe_months ?? 0
for (const p of profs) p.__t = txt(p)
const fresh = profs.filter(p => !sentSet.has(p.id) && !appSet.has(p.id) && inHcm(p) && !devOnly(p))
const c = (f) => fresh.filter(f).length
console.log('--- 미발송·미지원 × HCM × 비개발 전체', fresh.length)
console.log('기존 티어 신규(T1~T6 합, 스크립트 dry-run과 대조용):', c(p=>y(p)<=24 && ((infl(p)&&langAny(p)) || (mkt(p)&&langAny(p)))))
console.log('T7 마케팅 × ≤2y × 언어시그널 없음:', c(p=>y(p)<=24 && mkt(p) && !langAny(p)))
console.log('T8 비마케팅 × ≤2y × 상급인증:', c(p=>y(p)<=24 && !mkt(p) && langHi(p)), '| 그중 인플루언서/SNS 텍스트:', c(p=>y(p)<=24 && !mkt(p) && langHi(p) && /(influencer|kol|koc|seeding|tiktok|instagram|youtube|social media)/i.test(p.__t)))
console.log('경력 완화 2~4y × 인플루언서 직접경험 × 언어 any:', c(p=>y(p)>24 && y(p)<=48 && infl(p) && langAny(p)), '| 2~4y × 마케팅 × 상급인증:', c(p=>y(p)>24 && y(p)<=48 && mkt(p) && langHi(p)))
console.log('인플루언서 직접경험 전체(경력·언어 무관):', c(p=>infl(p)))
