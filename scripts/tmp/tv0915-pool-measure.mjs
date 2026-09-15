// 테크밸리 9/15 — 신규 Research Intern + V83 컴토 증원 재발송 풀 실측 (읽기 전용)
// RESEARCH(4fb83b6e): Market & IT Business Research Intern · HN/HCMC · Hybrid/Remote 협의 · 2개월 400만동
//   요건: 영어(필수, 영문 CV) × 인턴 연령대 × 경영/경제/정보시스템 전공 or BA/리서치 시그널
// COMTOR(34ebad6c V83): tv0909 게이트 동일(한국어 시그널 × ≤1y × HCMC권/미기재), 기발송 44·지원 4 제외 후 잔여
import { sb, fetchAll } from '../outreach/lib.mjs'

const RESEARCH = '4fb83b6e-32c7-4954-b0f6-cbdec4b749fe'
const COMTOR = '34ebad6c-a992-4978-9b00-137cf3850120'
const today = new Date().toISOString().slice(0, 10)

const norm = (v) => (Array.isArray(v) ? v.join(' ') : String(v || ''))
const txt = (p) => {
  const exp = Array.isArray(p.experiences) ? p.experiences.map((e) => `${e.title || e.position || ''} ${e.company || ''}`).join(' ') : ''
  return [p.position, p.headline, norm(p.desired_roles), norm(p.skills), exp, JSON.stringify(p.resume_summary || ''), p.university, p.major].join(' ').toLowerCase()
}
const roles = (p) => [p.position, ...(p.desired_roles || [])].filter(Boolean)
const y = (p) => p.yoe_months ?? 0
const gy = (p) => Number(p.graduation_year) || 0
const inHcmc = (p) => /(h[ồo]\s*ch[íi]\s*minh|hcm|sài gòn|sai gon|thủ đức|thu duc|bình dương|binh duong)/i.test(String(p.location || ''))
const inHanoi = (p) => /(hà nội|ha noi|hanoi|hn\b)/i.test(String(p.location || ''))
const noLoc = (p) => !String(p.location || '').trim()
const koSignal = (p) => !!p.korean_cert || /(korean|tiếng hàn|topik|한국어)/i.test(txt(p))
const enSignal = (p) => !!p.english_cert || /(english|tiếng anh|ielts|toefl|toeic)/i.test(txt(p))
// 인턴 연령대(tv0909 동일): 재학(2026+ 졸업예정) or 갓졸업(2024~25 × ≤1y) or 졸업연도 미기재 × ≤1y
const internAge = (p) => gy(p) >= 2026 || ((gy(p) === 0 || (gy(p) >= 2024 && gy(p) <= 2025)) && y(p) <= 12)
// RESEARCH 전공/직무 시그널
const bizMajorRe = /(business administration|quản trị kinh doanh|economics|kinh tế|international business|kinh doanh quốc tế|information system|hệ thống thông tin|commerce|thương mại|finance|tài chính)/i
const baRoleRe = /(business analyst|\bba\b|analyst|research|consult)/i
const baTextRe = /(market research|business analy|nghiên cứu thị trường|data analy|excel|powerpoint|power point)/i
const baRole = (p) => roles(p).some((r) => baRoleRe.test(String(r)))

const [pool, unsubs, recsC, appsC, recsR, appsR, todays] = await Promise.all([
  fetchAll(() => sb.from('user_profiles')
    .select('id,email,full_name,position,desired_roles,yoe_months,location,english_cert,korean_cert,skills,resume_summary,headline,experiences,university,major,graduation_year,created_at')
    .not('email', 'is', null).not('resume_url', 'is', null).order('created_at', { ascending: false })),
  fetchAll(() => sb.from('events').select('user_id').eq('event', 'coldmail_unsub').not('user_id', 'is', null).order('id')),
  fetchAll(() => sb.from('job_recommendations').select('user_id').eq('job_id', COMTOR).order('id')),
  fetchAll(() => sb.from('job_applications').select('user_id').eq('job_id', COMTOR).order('id')),
  fetchAll(() => sb.from('job_recommendations').select('user_id').eq('job_id', RESEARCH).order('id')),
  fetchAll(() => sb.from('job_applications').select('user_id').eq('job_id', RESEARCH).order('id')),
  fetchAll(() => sb.from('job_recommendations').select('user_id').gte('created_at', today).order('id')),
])
const unsubSet = new Set(unsubs.map((r) => r.user_id))
const sentC = new Set([...recsC.map((r) => r.user_id), ...appsC.map((r) => r.user_id)])
const sentR = new Set([...recsR.map((r) => r.user_id), ...appsR.map((r) => r.user_id)])
const todaySet = new Set(todays.map((r) => r.user_id))

// 베이스: 이메일·CV 보유, unsub/likelion 제외, 이메일 중복 제거
const seen = new Set()
const base = []
for (const p of pool) {
  if (!p.email || /likelion/i.test(p.email)) continue
  const e = p.email.toLowerCase()
  if (seen.has(e) || unsubSet.has(p.id)) continue
  seen.add(e)
  base.push(p)
}
console.log(`베이스(이메일·CV·unsub 제외): ${base.length}명 · 당일(${today}) recommend 기수신 ${todaySet.size}명`)

// ── COMTOR 재발송 풀 ──
const comtorAll = base.filter((p) => koSignal(p) && y(p) <= 12 && (inHcmc(p) || noLoc(p)))
const comtorFresh = comtorAll.filter((p) => !sentC.has(p.id))
const comtorToday = comtorFresh.filter((p) => todaySet.has(p.id))
const newSince = comtorFresh.filter((p) => String(p.created_at) > '2026-09-09')
console.log(`\n[V83 IT컴토 재발송 — tv0909 동일 게이트: 한국어 × ≤1y × HCMC권/미기재]`)
console.log(`  게이트 통과 전체 ${comtorAll.length}명 → 기발송·기지원 제외 ${comtorFresh.length}명`)
console.log(`    그중 9/9 이후 신규 가입 ${newSince.length}명 · 당일 recommend 겹침 ${comtorToday.length}명 (오늘 기본룰 발송 가능 ${comtorFresh.length - comtorToday.length}명)`)
console.log(`  참고(완화안 ≤2y): ${base.filter((p) => koSignal(p) && y(p) <= 24 && (inHcmc(p) || noLoc(p)) && !sentC.has(p.id)).length}명`)

// ── RESEARCH 풀 ──
const rBase = base.filter((p) => !sentR.has(p.id) && internAge(p) && enSignal(p))
const rLoc = rBase.filter((p) => inHcmc(p) || inHanoi(p) || noLoc(p))
const core = rLoc.filter((p) => bizMajorRe.test(String(p.major || '')) || baRole(p))
const ext = rLoc.filter((p) => !core.includes(p) && baTextRe.test(txt(p)))
const rest = rLoc.filter((p) => !core.includes(p) && !ext.includes(p))
console.log(`\n[신규 Research Intern — 인턴 연령대 × 영어 시그널]`)
console.log(`  전국 ${rBase.length}명 → HN/HCMC/미기재 ${rLoc.length}명 (타지역 제외 ${rBase.length - rLoc.length}명, Remote 협의라 포함 여지)`)
console.log(`  코어(경영/경제/정보시스템 전공 or BA/리서치/컨설팅 직군): ${core.length}명 — 당일 겹침 ${core.filter((p) => todaySet.has(p.id)).length}명`)
console.log(`  확장(텍스트 시그널: 리서치/분석/엑셀/PPT 언급): ${ext.length}명 — 당일 겹침 ${ext.filter((p) => todaySet.has(p.id)).length}명`)
console.log(`  나머지(영어×인턴연령만): ${rest.length}명 — 당일 겹침 ${rest.filter((p) => todaySet.has(p.id)).length}명`)
console.log(`  참고 — 코어 중 한국어 시그널 보유(가점 여지): ${core.filter(koSignal).length}명 · 영어 인증 보유: ${core.filter((p) => p.english_cert).length}명`)

// 코어 미리보기
const score = (p) => (bizMajorRe.test(String(p.major || '')) ? 2 : 0) + (baRole(p) ? 2 : 0) + (p.english_cert ? 1 : 0) + (baTextRe.test(txt(p)) ? 1 : 0)
const top = [...core].sort((a, b) => score(b) - score(a)).slice(0, 15)
console.log(`\n[Research 코어 상위 ${top.length}명 미리보기]`)
for (const p of top)
  console.log(`  [${score(p)}] ${p.full_name} <${p.email}> · ${p.position || '?'} · 전공:${p.major || '?'} · 졸업:${p.graduation_year || '?'} · ${p.location || '위치?'}`)
