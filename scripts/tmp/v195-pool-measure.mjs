// V195 POSCO DX VIETNAM — Senior UI Designer(HCMC 온사이트) 발송 풀 실측 (읽기 전용)
// JD 하드 요건: UI/UX 디자인 5y+ · Figma/XD/Sketch · 영어 소통(한국어 우대) · HTML/CSS 친숙 · 디자인시스템 경험 우대
import { sb, fetchAll } from '/Users/wiseungju/salarymap/scripts/outreach/lib.mjs'

const JOB = 'b9359735-59c1-4102-9950-7a9940402fd9'
const today = new Date().toISOString().slice(0, 10)

const norm = (v) => (Array.isArray(v) ? v.join(' ') : String(v || ''))
const txt = (p) => {
  const exp = Array.isArray(p.experiences)
    ? p.experiences.map((e) => `${e.title || e.position || ''} ${e.company || ''} ${e.description || ''}`).join(' ')
    : ''
  return [p.position, p.headline, norm(p.desired_roles), JSON.stringify(p.skills || ''), exp,
    JSON.stringify(p.resume_summary || ''), p.major].join(' ').toLowerCase()
}
const roles = (p) => [p.position, ...(p.desired_roles || [])].filter(Boolean)
const y = (p) => p.yoe_months ?? 0

const isDesign = (p) => roles(p).includes('Design')
const uiuxRe = /(ui\/ux|ui\s*ux|uiux|ux\/ui|ux designer|ui designer|product designer|user experience|user interface|interaction design)/i
const toolRe = /figma|adobe xd|\bsketch\b|zeplin|framer/i
const dsRe = /design system|component librar|style guide|ui kit/i
const protoRe = /prototype|wireframe|user flow|usability/i
const feRe = /\bhtml\b|\bcss\b|javascript/i
const koRe = /(korean|tiếng hàn|topik|한국어)/i
const enRe = /(english|tiếng anh|ielts|toefl|toeic)/i
const koSig = (p) => !!p.korean_cert || koRe.test(p.__t)
const enSig = (p) => !!p.english_cert || enRe.test(p.__t)
const inHcmc = (p) => /(h[ồo]\s*ch[íi]\s*minh|hcm|sài gòn|sai gon|thủ đức|thu duc|bình dương|binh duong|đồng nai|dong nai|biên hòa|bien hoa|long an)/i.test(String(p.location || ''))
const noLoc = (p) => !String(p.location || '').trim()

const [pool, unsubs, recs, apps, todays] = await Promise.all([
  fetchAll(() => sb.from('user_profiles')
    .select('id,email,full_name,position,desired_roles,yoe_months,location,english_cert,korean_cert,skills,resume_summary,headline,experiences,university,major,graduation_year,created_at')
    .not('email', 'is', null).not('resume_url', 'is', null).order('created_at', { ascending: false })),
  fetchAll(() => sb.from('events').select('user_id').eq('event', 'coldmail_unsub').not('user_id', 'is', null).order('id')),
  fetchAll(() => sb.from('job_recommendations').select('user_id').eq('job_id', JOB).order('id')),
  fetchAll(() => sb.from('job_applications').select('user_id').eq('job_id', JOB).order('id')),
  fetchAll(() => sb.from('job_recommendations').select('user_id').gte('created_at', today).order('id')),
])
const unsubSet = new Set(unsubs.map((r) => r.user_id))
const sent = new Set([...recs.map((r) => r.user_id), ...apps.map((r) => r.user_id)])
const todaySet = new Set(todays.map((r) => r.user_id))

const seen = new Set()
const base = []
for (const p of pool) {
  if (!p.email || /likelion/i.test(p.email)) continue
  const e = p.email.toLowerCase()
  if (seen.has(e) || unsubSet.has(p.id)) continue
  seen.add(e)
  p.__t = txt(p)
  base.push(p)
}
console.log(`베이스(이력서·이메일·unsub/likelion 제외): ${base.length}명 · 이 공고 기발송/기지원 ${sent.size}명 · 당일(${today}) recommend 기수신 ${todaySet.size}명`)

const fresh = base.filter((p) => !sent.has(p.id))
const design = fresh.filter((p) => isDesign(p) || uiuxRe.test(p.__t))
console.log(`\n디자인 시그널(Design 직군 or UI/UX 텍스트, 경력·지역 무관): ${design.length}명 (Design 직군 ${design.filter(isDesign).length} · UI/UX 텍스트 ${design.filter((p) => uiuxRe.test(p.__t)).length} · Figma/XD/Sketch ${design.filter((p) => toolRe.test(p.__t)).length})`)

const layer = (label, arr) => {
  const t = arr.filter((p) => todaySet.has(p.id)).length
  console.log(`  ${label}: ${arr.length}명 (당일 겹침 ${t} → 오늘 발송가능 ${arr.length - t})`)
  return arr
}

// ── 1) 코어: 디자인 × 5y+ × HCMC권/미기재 × 영어/한국어 시그널
console.log(`\n[1] 코어 — 디자인 × 5y+ (JD 하드) × HCMC권/미기재`)
const d5 = design.filter((p) => y(p) >= 60)
layer('디자인 5y+ 전국', d5)
const core = d5.filter((p) => inHcmc(p) || noLoc(p))
layer('  └ HCMC권/미기재', core)
const coreUI = core.filter((p) => uiuxRe.test(p.__t) || toolRe.test(p.__t))
layer('    └ UI/UX 텍스트 or 디자인툴 명시(그래픽/영상 제외)', coreUI)
const coreLang = coreUI.filter((p) => enSig(p) || koSig(p))
layer('      └ 영어/한국어 시그널 有', coreLang)
console.log(`        구성 — Figma/XD/Sketch ${coreLang.filter((p) => toolRe.test(p.__t)).length} · 디자인시스템 ${coreLang.filter((p) => dsRe.test(p.__t)).length} · 프로토타입/와이어프레임 ${coreLang.filter((p) => protoRe.test(p.__t)).length} · HTML/CSS ${coreLang.filter((p) => feRe.test(p.__t)).length}`)
console.log(`        영어인증 ${coreLang.filter((p) => p.english_cert).length} · 한국어시그널 ${coreLang.filter(koSig).length} · 위치미기재 ${coreLang.filter(noLoc).length}`)
const yb = (m) => (m < 84 ? '5-7y' : m < 120 ? '7-10y' : '10y+')
const d = {}
for (const p of coreLang) d[yb(y(p))] = (d[yb(y(p))] || 0) + 1
console.log(`        경력 분포 — ${Object.entries(d).sort().map(([k, v]) => `${k} ${v}`).join(' · ')}`)

// ── 2) 확장 레이어
console.log(`\n[2] 확장 후보(코어 외)`)
const coreSet = new Set(coreLang.map((p) => p.id))
layer('a. 5y+ HCMC권 UI/UX인데 언어 시그널 없음', coreUI.filter((p) => !coreSet.has(p.id)))
layer('b. 5y+ HCMC권 Design 직군인데 UI/UX·툴 텍스트 없음(그래픽/영상 등)', core.filter((p) => !uiuxRe.test(p.__t) && !toolRe.test(p.__t)))
layer('c. 5y+ 타지역(하노이/다낭 — 이주 필요) UI/UX', d5.filter((p) => !inHcmc(p) && !noLoc(p) && (uiuxRe.test(p.__t) || toolRe.test(p.__t))))
const d3 = design.filter((p) => y(p) >= 36 && y(p) < 60 && (inHcmc(p) || noLoc(p)) && (uiuxRe.test(p.__t) || toolRe.test(p.__t)))
layer('d. 3~5y HCMC권 UI/UX (경력 완화층)', d3)
layer('   └ 영어/한국어 시그널 有', d3.filter((p) => enSig(p) || koSig(p)))

// ── 3) 코어 미리보기
const score = (p) => (toolRe.test(p.__t) ? 2 : 0) + (uiuxRe.test(p.__t) ? 2 : 0) + (dsRe.test(p.__t) ? 2 : 0) + (protoRe.test(p.__t) ? 1 : 0) + (feRe.test(p.__t) ? 1 : 0) + (koSig(p) ? 2 : 0) + (p.english_cert ? 1 : 0)
const top = [...coreLang].sort((a, b) => score(b) - score(a)).slice(0, 25)
console.log(`\n[3] 코어 상위 ${top.length}명 미리보기`)
for (const p of top)
  console.log(`  [${score(p)}] ${p.full_name} <${p.email}> · ${p.position || '?'} · ${Math.round(y(p) / 12 * 10) / 10}y · ${p.location || '위치?'}${koSig(p) ? ' · KO' : ''}${p.english_cert ? ' · EN인증' : ''}${dsRe.test(p.__t) ? ' · DS' : ''}`)

console.log(`\n[4] 확장 d(3~5y) 상위 10명 미리보기`)
for (const p of [...d3].sort((a, b) => score(b) - score(a)).slice(0, 10))
  console.log(`  [${score(p)}] ${p.full_name} <${p.email}> · ${p.position || '?'} · ${Math.round(y(p) / 12 * 10) / 10}y · ${p.location || '위치?'}${koSig(p) ? ' · KO' : ''}${p.english_cert ? ' · EN인증' : ''}`)
