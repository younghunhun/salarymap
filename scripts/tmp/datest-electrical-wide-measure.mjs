// DAT EST V216 확장층 실측 — 전기 직접 시그널 밖(기계·자동화·냉동공조·공장 생산/설비직·공학 전공) 단계별 (읽기 전용)
import { sb, fetchAll } from '../outreach/lib.mjs'

const JOB = 'd631f9b9-4b40-4744-a434-0690e0cefba7'
const norm = (v) => (Array.isArray(v) ? v.join(' ') : String(v || ''))
const txt = (p) => {
  const exp = Array.isArray(p.experiences) ? p.experiences.map((e) => `${e.title || e.position || ''} ${e.company || ''} ${e.description || ''}`).join(' ') : ''
  return [p.position, p.headline, norm(p.desired_roles), JSON.stringify(p.skills || ''), exp, JSON.stringify(p.resume_summary || ''), p.major].join(' ').toLowerCase()
}
const roles = (p) => [p.position, ...(p.desired_roles || [])].filter(Boolean)
const y = (p) => p.yoe_months ?? 0
const elecRe = /(electrical|electrician|electric power|power system|kỹ sư điện|kĩ sư điện|điện công nghiệp|hệ thống điện|an toàn điện|thiết bị điện|điện – ?điện tử|điện-điện tử|điện tử công nghiệp|kỹ thuật điện|bảo trì điện|công nhân điện|thợ điện|low voltage|medium voltage|high voltage|switchgear|transformer|máy biến áp|tủ điện|plc\b|scada|m&e\b|mep\b|electrical engineer)/i
const adjRe = /(mechatronic|cơ điện tử|automation|tự động hóa|điện lạnh|hvac|refrigerat|điện tử|electronic|mechanical engineer|kỹ sư cơ khí|cơ khí|maintenance engineer|bảo trì|bảo dưỡng|kỹ thuật viên|technician|facility|utility|m&e)/i
const factoryRe = /(nhà máy|factory|plant|industrial park|khu công nghiệp|kcn\b|production line|dây chuyền|manufactur|sản xuất)/i
const engMajorRe = /(engineer|kỹ thuật|cơ khí|điện|electr|mechan|automation|tự động|mechatron|công nghệ kỹ thuật|industrial|công nghiệp)/i
const devRole = (p) => roles(p).some((r) => /(backend|frontend|fullstack|full-stack|mobile|developer|devops|\bqa\b|data|ai engineer|ml engineer|software|web|game|embedded|python|java|security engineer)/i.test(String(r)))
const blueRole = (p) => roles(p).some((r) => /(maintenance|production|qc|technician|mechanical|electrical|energy|facility|operator|worker|manufactur)/i.test(String(r)))
const inHcmc = (p) => /(h[ồo]\s*ch[íi]\s*minh|hcm|sài gòn|sai gon|saigon|thủ đức|thu duc|bình thạnh|bình dương|binh duong|đồng nai|dong nai|biên hòa|bien hoa|long an|bà rịa|vũng tàu|tây ninh)/i.test(String(p.location || ''))
const noLoc = (p) => !String(p.location || '').trim()
const south = (p) => inHcmc(p) || noLoc(p)

const [pool, unsubs, recs, apps] = await Promise.all([
  fetchAll(() => sb.from('user_profiles').select('id,email,full_name,position,desired_roles,yoe_months,location,english_cert,skills,resume_summary,headline,experiences,major,graduation_year,created_at').not('email', 'is', null).not('resume_url', 'is', null).order('created_at', { ascending: false })),
  fetchAll(() => sb.from('events').select('user_id').eq('event', 'coldmail_unsub').not('user_id', 'is', null).order('id')),
  fetchAll(() => sb.from('job_recommendations').select('user_id').eq('job_id', JOB).order('id')),
  fetchAll(() => sb.from('job_applications').select('user_id').eq('job_id', JOB).order('id')),
])
const unsubSet = new Set(unsubs.map((r) => r.user_id)), sent = new Set([...recs, ...apps].map((r) => r.user_id))
const seen = new Set(); const base = []
for (const p of pool) {
  if (!p.email || /likelion/i.test(p.email)) continue
  const e = p.email.toLowerCase(); if (seen.has(e) || unsubSet.has(p.id) || sent.has(p.id)) continue
  seen.add(e); p.__t = txt(p); base.push(p)
}
const taken = new Set()
const tier = (label, f) => {
  const arr = base.filter((p) => !taken.has(p.id) && f(p)); arr.forEach((p) => taken.add(p.id))
  const yb = { '<2y': 0, '2y+': 0 }; arr.forEach((p) => yb[y(p) >= 24 ? '2y+' : '<2y']++)
  const pd = {}; arr.forEach((p) => { pd[p.position || '?'] = (pd[p.position || '?'] || 0) + 1 })
  console.log(`${label}: ${arr.length}명 (2y+ ${yb['2y+']} · <2y ${yb['<2y']}) — position: ${Object.entries(pd).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k, v]) => `${k} ${v}`).join(' · ')}`)
  return arr
}
console.log(`베이스 ${base.length}명 (기발송/기지원/unsub/likelion 제외). 누적 티어(위 티어 제외 후 순증):\n`)
tier('T1 코어 — 전기 직접 × 2y+ × 남부권/미기재', (p) => elecRe.test(p.__t) && y(p) >= 24 && south(p))
tier('T2 전기 직접 × <2y × 남부권/미기재', (p) => elecRe.test(p.__t) && y(p) < 24 && south(p))
tier('T3 전기 직접 × 2y+ × 타지역', (p) => elecRe.test(p.__t) && y(p) >= 24 && !south(p))
tier('T4 인접 기술(기계·자동화·냉동공조·전자·설비) × 비개발 직군 × 남부권/미기재', (p) => adjRe.test(p.__t) && !devRole(p) && south(p))
tier('T5 공장/생산/설비 직군(Maintenance·Production·QC·Technician) × 남부권/미기재 (T4 외)', (p) => blueRole(p) && south(p))
tier('T6 공학 전공(전기·기계·자동화 등) × 비개발 직군 × 남부권/미기재 (T4·T5 외)', (p) => engMajorRe.test(String(p.major || '')) && !devRole(p) && south(p))
tier('T7 공장/산업단지 근무 텍스트 × 비개발 × 남부권/미기재 (상위 외)', (p) => factoryRe.test(p.__t) && !devRole(p) && south(p))
tier('T8 인접 기술 × 개발 직군(전공만 공학인 개발자) × 남부권/미기재', (p) => (adjRe.test(p.__t) || engMajorRe.test(String(p.major || ''))) && devRole(p) && south(p))
console.log(`\n누적 합계(T1~T7, 개발자 T8 제외): ${taken.size - base.filter((p) => taken.has(p.id) && (adjRe.test(p.__t) || engMajorRe.test(String(p.major || ''))) && devRole(p) && south(p) && !elecRe.test(p.__t)).length}`)
