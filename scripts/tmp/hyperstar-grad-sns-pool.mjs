// Hyperstar R203 재실측(10/2 호현·고객 피드백): ★졸업생 × 풀타임 × 즉시근무 필수, 중요=인플루언서/SNS 감각·커뮤니케이션. 미발송·미지원만.
import { sb, fetchAll } from '../outreach/lib.mjs'
const JOB='78e17892-ca73-4bb3-8e6e-191d4691b631'
const recs = await fetchAll(() => sb.from('job_recommendations').select('user_id').eq('job_id', JOB).order('id'))
const apps = await fetchAll(() => sb.from('job_applications').select('user_id').eq('job_id', JOB).order('id'))
const unsubs = await fetchAll(() => sb.from('events').select('user_id').eq('event','coldmail_unsub').not('user_id','is',null).order('id'))
const done = new Set([...recs.map(r=>r.user_id), ...apps.map(a=>a.user_id), ...unsubs.map(u=>u.user_id)])
const profs = await fetchAll(() => sb.from('user_profiles').select('id,email,full_name,position,desired_roles,skills,resume_summary,experiences,major,headline,location,yoe_months,english_cert,korean_cert,graduation_year,resume_url').not('resume_url','is',null).not('email','is',null).order('created_at'))
const roles = (p) => [p.position, ...(p.desired_roles||[])].filter(Boolean).map(r=>String(r).toLowerCase())
const exp = (p) => Array.isArray(p.experiences) ? p.experiences.map(e=>`${e.title||e.position||''} ${e.company||''} ${e.description||''}`).join(' ') : ''
const txt = (p) => (JSON.stringify(p.skills||'')+' '+String(p.position||'')+' '+String(p.headline||'')+' '+String(p.resume_summary||'')+' '+exp(p)+' '+String(p.major||'')).toLowerCase()
const hcm = (p) => /(h[ồo]\s*ch[íi]\s*minh|hcm|sài gòn|sai gon|saigon|thủ đức|thu duc|bình thạnh|bình dương|binh duong|đồng nai|dong nai|biên hòa|bien hoa)/i.test(String(p.location||''))
const y = (p) => p.yoe_months ?? 0
const g = (p) => parseInt(p.graduation_year)||0
const hl = (p) => String(p.headline||'')
const studentHl = (p) => /(student|sinh viên|đang học|final[- ]year|năm (nhất|hai|ba|tư|cuối))/i.test(hl(p))
const grad25 = (p) => g(p) >= 1990 && g(p) <= 2025 && !studentHl(p)          // 확실한 졸업생
const grad26 = (p) => g(p) === 2026 && !studentHl(p)                           // 2026 졸업(논문 중 가능성)
const noGrad = (p) => g(p) < 1990 && !studentHl(p)                             // 졸업연도 미기재
const DEV=/(backend|frontend|fullstack|full-stack|mobile|developer|devops|qa|data|ai|ml|game|embedded)/
const devOnly = (p) => roles(p).length>0 && roles(p).every(r=>DEV.test(r))
const infl = (p) => /(influencer|kol|koc|seeding|booking|creator partnership|affiliate)/i.test(p.__t)
const sns = (p) => /(tiktok|instagram|youtube|facebook ads|social media|mạng xã hội|content creator|fanpage|reels|short video)/i.test(p.__t)
const mkt = (p) => roles(p).some(r=>/^(marketing|content|pr|digital marketing|social media|brand)/.test(r))
const langAny = (p) => !!p.english_cert||!!p.korean_cert||/(ielts|toeic|toefl|topik|english|tiếng anh|tiếng hàn|korean)/i.test(p.__t)
for (const p of profs) p.__t = txt(p)
const base = profs.filter(p => !done.has(p.id) && hcm(p) && !devOnly(p))
console.log('미발송·미지원·미거부 × HCM × 비개발:', base.length)
const row = (label, f) => { const a = base.filter(f); console.log(`${label.padEnd(52)} 졸업≤2025 ${String(a.filter(grad25).length).padStart(4)} | 졸업2026(비학생) ${String(a.filter(grad26).length).padStart(4)} | 졸업연도 미기재 ${String(a.filter(noGrad).length).padStart(4)} | 재학 ${String(a.filter(p=>!grad25(p)&&!grad26(p)&&!noGrad(p)).length).padStart(4)}`) }
console.log('\n■ 티어별 (경력 무관, 언어 시그널 any)')
row('A 인플루언서/KOL/시딩 직접 경험', p=>infl(p)&&langAny(p))
row('B SNS 운영 텍스트 × 마케팅/콘텐츠 직군', p=>!infl(p)&&sns(p)&&mkt(p)&&langAny(p))
row('C SNS 운영 텍스트 × 타직군', p=>!infl(p)&&sns(p)&&!mkt(p)&&langAny(p))
row('D 마케팅 직군 × SNS 텍스트 없음', p=>!infl(p)&&!sns(p)&&mkt(p)&&langAny(p))
console.log('\n■ 같은 티어, 언어 시그널 없음')
row('A\' 인플루언서 직접 경험 × 언어 없음', p=>infl(p)&&!langAny(p))
row('B\' SNS × 마케팅 × 언어 없음', p=>!infl(p)&&sns(p)&&mkt(p)&&!langAny(p))
console.log('\n■ 경력 분포 (A+B, 졸업≤2025+2026)')
const ab = base.filter(p=>(infl(p)||(sns(p)&&mkt(p)))&&langAny(p)&&(grad25(p)||grad26(p)))
console.log('  0~1y', ab.filter(p=>y(p)<12).length, '| 1~2y', ab.filter(p=>y(p)>=12&&y(p)<24).length, '| 2~4y', ab.filter(p=>y(p)>=24&&y(p)<48).length, '| 4y+', ab.filter(p=>y(p)>=48).length)
console.log('\n■ A 표본(졸업≤2025):')
for (const p of base.filter(p=>infl(p)&&langAny(p)&&grad25(p)).slice(0,10)) console.log('  ', (p.full_name||'').slice(0,22).padEnd(22), '| grad', g(p), '| yoe', y(p), '|', (p.position||''), '|', hl(p).slice(0,55))
