// OpenGraph Labs Data Operator(V215) 발송 풀 실측 (읽기 전용)
// JD: 남성 · IT 전공 학생 or AI 관심 · 10/19~10/30 2주 풀타임(월~금 8:30~17:30) 전일 참석 필수 · 공장/창고 현장 장비 착용 데이터 수집 · HCMC · 3.5M
import { sb, fetchAll } from '../outreach/lib.mjs'

const JOB = '1badf7ad-60b1-4b25-ba01-56d0e0562ad3'
const today = new Date().toISOString().slice(0, 10)

// 1기 흔적: 유사 공고·지원자
const { data: prior } = await sb.from('jobs').select('id,title,company,source_id,is_active,created_at')
  .or('title.ilike.%data operator%,title.ilike.%physical ai%,title.ilike.%thu thập dữ liệu%,company.ilike.%opengraph%,company.ilike.%open graph%').order('created_at', { ascending: false })
console.log('[유사 공고]'); for (const j of prior || []) console.log(`  ${j.source_id || '-'} · ${j.title} · ${j.company} · active=${j.is_active} · ${j.created_at.slice(0, 10)} · ${j.id}`)
const { data: appsNow } = await sb.from('job_applications').select('user_id,created_at,status').eq('job_id', JOB)
console.log(`[V215 현재 지원] ${appsNow?.length || 0}건`)

const norm = (v) => (Array.isArray(v) ? v.join(' ') : String(v || ''))
const txt = (p) => {
  const exp = Array.isArray(p.experiences) ? p.experiences.map((e) => `${e.title || e.position || ''} ${e.company || ''} ${e.description || ''}`).join(' ') : ''
  return [p.position, p.headline, norm(p.desired_roles), JSON.stringify(p.skills || ''), exp, JSON.stringify(p.resume_summary || ''), p.major, p.university].join(' ').toLowerCase()
}
const roles = (p) => [p.position, ...(p.desired_roles || [])].filter(Boolean)
const y = (p) => p.yoe_months ?? 0
const gy = (p) => parseInt(p.graduation_year) || 0
const itMajorRe = /(computer|software|information technology|công nghệ thông tin|cntt|khoa học máy tính|kỹ thuật phần mềm|hệ thống thông tin|data science|khoa học dữ liệu|artificial intelligence|trí tuệ nhân tạo|\bai\b|machine learning|robotics|mechatronic|cơ điện tử|automation|tự động hóa|electronics|điện tử|embedded|iot|cyber|an toàn thông tin|mạng máy tính|kỹ thuật máy tính)/i
const itMajor = (p) => itMajorRe.test(String(p.major || ''))
const devRole = (p) => roles(p).some((r) => /(backend|frontend|fullstack|full-stack|mobile|developer|devops|\bqa\b|data|ai|ml|software|web|game|embedded|security|sysadmin|it support)/i.test(String(r)))
const aiText = (p) => /(artificial intelligence|machine learning|deep learning|computer vision|\bai\b|trí tuệ nhân tạo|học máy|robot|physical ai|data collection|data labeling|annotation|gán nhãn)/i.test(p.__t)
const student = (p) => gy(p) >= 2027 || (/(student|sinh viên|đang học|năm [1-4]|year [1-4]|undergraduate)/i.test(String(p.headline || '')) && gy(p) >= 2026)
const fresh = (p) => gy(p) >= 2025 && y(p) <= 12
const inHcmc = (p) => /(h[ồo]\s*ch[íi]\s*minh|hcm|sài gòn|sai gon|saigon|thủ đức|thu duc|bình thạnh|bình dương|binh duong|đồng nai|dong nai|biên hòa|bien hoa|long an)/i.test(String(p.location || ''))
const noLoc = (p) => !String(p.location || '').trim()
const south = (p) => inHcmc(p) || noLoc(p)
const hcmUni = (p) => /(hcm|ho chi minh|hồ chí minh|sài gòn|saigon|bách khoa|bach khoa|hutech|uit|ptit|hcmus|khtn|tôn đức thắng|ton duc thang|tdtu|văn lang|van lang|fpt|rmit|hoa sen|nguyễn tất thành|ntt|công nghệ thông tin|sư phạm kỹ thuật|spkt|hcmute|uef|iuh|công nghiệp|gia định|ueh|kinh tế|hufi|hcmut|vnu-hcm|đại học quốc gia)/i.test(String(p.university || ''))

const [pool, unsubs, recs, apps, todays] = await Promise.all([
  fetchAll(() => sb.from('user_profiles').select('id,email,full_name,position,desired_roles,yoe_months,location,english_cert,skills,resume_summary,headline,experiences,major,university,graduation_year,created_at').not('email', 'is', null).not('resume_url', 'is', null).order('created_at', { ascending: false })),
  fetchAll(() => sb.from('events').select('user_id').eq('event', 'coldmail_unsub').not('user_id', 'is', null).order('id')),
  fetchAll(() => sb.from('job_recommendations').select('user_id').eq('job_id', JOB).order('id')),
  fetchAll(() => sb.from('job_applications').select('user_id').eq('job_id', JOB).order('id')),
  fetchAll(() => sb.from('job_recommendations').select('user_id').gte('created_at', today).order('id')),
])
const unsubSet = new Set(unsubs.map((r) => r.user_id)), sent = new Set([...recs, ...apps].map((r) => r.user_id)), todaySet = new Set(todays.map((r) => r.user_id))
const seen = new Set(); const base = []
for (const p of pool) {
  if (!p.email || /likelion/i.test(p.email)) continue
  const e = p.email.toLowerCase(); if (seen.has(e) || unsubSet.has(p.id)) continue
  seen.add(e); p.__t = txt(p); base.push(p)
}
console.log(`\n베이스 ${base.length} · 이 공고 기발송/기지원 ${sent.size} · 당일 recommend 기수신 ${todaySet.size}`)
const avail = base.filter((p) => !sent.has(p.id))
const layer = (label, arr) => { const t = arr.filter((p) => todaySet.has(p.id)).length; console.log(`  ${label}: ${arr.length}명${t ? ` (당일 겹침 ${t})` : ''}`); return arr }

console.log(`\n[0] 졸업연도 분포(전체): ${Object.entries(avail.reduce((a, p) => { const k = gy(p) ? (gy(p) >= 2029 ? '2029+' : String(gy(p))) : '미기재'; a[k] = (a[k] || 0) + 1; return a }, {})).sort().map(([k, v]) => `${k} ${v}`).join(' · ')}`)

console.log(`\n[1] 재학생(졸업 2027+ or 학생 헤드라인×2026+)`)
const stu = layer('재학생 전국', avail.filter(student))
const stuS = layer('  └ HCMC권/미기재', stu.filter(south))
const stuIT = layer('    └ IT/AI 전공 or 개발·AI 직군', stuS.filter((p) => itMajor(p) || devRole(p)))
console.log(`        구성 — IT 전공 ${stuIT.filter(itMajor).length} · 개발/AI 직군 ${stuIT.filter(devRole).length} · AI 텍스트 ${stuIT.filter(aiText).length} · HCMC 대학 ${stuIT.filter(hcmUni).length} · 위치미기재 ${stuIT.filter(noLoc).length}`)
console.log(`        졸업연도 — ${Object.entries(stuIT.reduce((a, p) => { a[gy(p) || '?'] = (a[gy(p) || '?'] || 0) + 1; return a }, {})).sort().map(([k, v]) => `${k} ${v}`).join(' · ')}`)
layer('    └ 위치미기재 중 HCMC 대학 재학', stuS.filter((p) => noLoc(p) && hcmUni(p) && (itMajor(p) || devRole(p))))
layer('    └ 비IT 전공 재학생(AI 관심 텍스트만)', stuS.filter((p) => !itMajor(p) && !devRole(p) && aiText(p)))

console.log(`\n[2] 확장`)
layer('a. 2025~2026 졸업 × 경력 ≤1y × IT/AI × HCMC권 (갓 졸업·구직 중)', avail.filter((p) => !student(p) && fresh(p) && (itMajor(p) || devRole(p)) && south(p)))
layer('b. 재학생 × IT/AI × 타지역(하노이·다낭 등)', stu.filter((p) => !south(p) && (itMajor(p) || devRole(p))))
layer('c. 재학생 × 비IT 전공 × HCMC권 (AI 텍스트 없음)', stuS.filter((p) => !itMajor(p) && !devRole(p) && !aiText(p)))

console.log(`\n[3] 코어 표본 20`)
for (const p of stuIT.slice(0, 20))
  console.log(`  ${p.full_name} <${p.email}> · ${p.position || '?'} · 졸업 ${gy(p) || '?'} · ${String(p.university || '-').slice(0, 28)} · ${String(p.major || '-').slice(0, 24)} · ${String(p.location || '위치?').slice(0, 18)}`)
