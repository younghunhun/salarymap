// V204 Hello Science — Thực Tập Sinh Marketing(HCMC Q1 온사이트, 9/28 Mia 게재) 발송 풀 실측 (읽기 전용)
// JD: 졸업예정/신입 · 마케팅/커뮤니케이션/경영/디자인 전공 · 베트남어 글쓰기 · SNS 콘텐츠(LinkedIn/FB/IG)
//     · Canva/CapCut/Figma·SNS 운영·영어 우대 · 월 3,000,000đ · Diamond Plaza Q1
import { sb, fetchAll, fetchBlacklist } from '../outreach/lib.mjs'

const JOB = 'cf69b3c3-74c8-4239-a8fb-4995583f4d29'          // V204 Hello Science 마케팅 인턴
const PRIOR_HSE = '62210ec3-525e-4a67-93d9-1c70ea48e8dd'    // HSE1602 Hello Science Edu Marketing & Branding Intern(7/29, 동일 회사·직무)
const today = new Date().toISOString().slice(0, 10)
const weekAgoIso = new Date(Date.now() - 7 * 864e5).toISOString()

const norm = (v) => (Array.isArray(v) ? v.join(' ') : String(v || ''))
const txt = (p) => {
  const exp = Array.isArray(p.experiences) ? p.experiences.map((e) => `${e.title || e.position || ''} ${e.company || ''} ${e.description || ''}`).join(' ') : ''
  return [p.position, p.headline, norm(p.desired_roles), JSON.stringify(p.skills || ''), exp, JSON.stringify(p.resume_summary || ''), p.major].join(' ').toLowerCase()
}
const roles = (p) => [p.position, ...(p.desired_roles || [])].filter(Boolean)
const has = (p, r) => roles(p).includes(r)
const y = (p) => p.yoe_months ?? 0
const majorTxt = (p) => String(p.major || '').toLowerCase()
const loc = (p) => String(p.location || '')
const noLoc = (p) => !loc(p).trim()
const inHcmc = (p) => /(h[ồo]\s*ch[íi]\s*minh|hcm|sài gòn|sai gon|saigon|thủ đức|thu duc|bình thạnh|binh thanh|bình dương|binh duong|đồng nai|dong nai|biên hòa|bien hoa|long an)/i.test(loc(p))
const inHanoi = (p) => /(hà nội|ha noi|hanoi)/i.test(loc(p))

const mktRe = /(marketing|truyền thông|content|social media|brand|pr\b|quan hệ công chúng|digital marketing|copywrit|creative)/i
const mktMajor = /(marketing|truyền thông|communication|media|quan hệ công chúng|public relations|kinh doanh|business|quản trị|thương mại|commerce|kinh tế|economics|thiết kế|design|đồ họa|graphic|báo chí|journalism|ngôn ngữ|language|english|tiếng anh)/i
const toolRe = /(canva|capcut|figma|photoshop|illustrator|premiere|after effects|adobe)/i
const socialRe = /(social media|fanpage|facebook|instagram|tiktok|linkedin|youtube|kênh|channel|content creator|content marketing)/i
const enRe = /(english|tiếng anh|ielts|toefl|toeic)/i
const enSig = (p) => !!p.english_cert || enRe.test(p.__t)
const isDev = (p) => roles(p).some((r) => /fullstack|backend|frontend|mobile|devops|ai engineer|data|embedded|game|qa|software|tech lead|cloud|sysadmin|network|dba|security/i.test(String(r)))

const bl = await fetchBlacklist()
const [pool, unsubs, recs, apps, priorRecs, todays, recent] = await Promise.all([
  fetchAll(() => sb.from('user_profiles')
    .select('id,email,full_name,position,desired_roles,yoe_months,location,english_cert,skills,resume_summary,headline,experiences,university,major,graduation_year,is_resume_public,created_at')
    .not('email', 'is', null).not('resume_url', 'is', null).order('created_at', { ascending: false })),
  fetchAll(() => sb.from('events').select('user_id').eq('event', 'coldmail_unsub').not('user_id', 'is', null).order('id')),
  fetchAll(() => sb.from('job_recommendations').select('user_id').eq('job_id', JOB).order('id')),
  fetchAll(() => sb.from('job_applications').select('user_id').eq('job_id', JOB).order('id')),
  fetchAll(() => sb.from('job_recommendations').select('user_id').eq('job_id', PRIOR_HSE).order('id')),
  fetchAll(() => sb.from('job_recommendations').select('user_id').gte('created_at', today).order('id')),
  fetchAll(() => sb.from('job_recommendations').select('user_id').gte('created_at', weekAgoIso).order('id')),
])
const unsubSet = new Set(unsubs.map((r) => r.user_id))
const sent = new Set([...recs.map((r) => r.user_id), ...apps.map((r) => r.user_id)])
const priorSet = new Set(priorRecs.map((r) => r.user_id))
const todaySet = new Set(todays.map((r) => r.user_id))
const cnt7 = {}
for (const r of recent) cnt7[r.user_id] = (cnt7[r.user_id] || 0) + 1
const tired = (p) => (cnt7[p.id] || 0) >= 3

const seen = new Set()
const base = []
for (const p of pool) {
  if (!p.email || /likelion/i.test(p.email)) continue
  const e = p.email.toLowerCase()
  if (seen.has(e) || unsubSet.has(p.id) || bl.has(p)) continue
  seen.add(e); p.__t = txt(p); base.push(p)
}
console.log(`베이스(이력서·이메일·unsub/blacklist/likelion 제외): ${base.length}명 · 이 공고 기발송/기지원 ${sent.size}명 · 이전 Hello Science 인턴(HSE1602) 기발송 ${priorSet.size}명 · 당일(${today}) recommend 기수신 ${todaySet.size}명`)

const layer = (label, arr) => {
  const t = arr.filter((p) => todaySet.has(p.id)).length
  const tr = arr.filter(tired).length
  const pr = arr.filter((p) => priorSet.has(p.id)).length
  console.log(`  ${label}: ${arr.length}명${t ? ` (당일 겹침 ${t})` : ''}${tr ? ` (7일 3통+ ${tr})` : ''}${pr ? ` (HSE1602 기발송 ${pr})` : ''}`)
  return arr
}
const preview = (arr, n = 10) => {
  for (const p of arr.slice(0, n))
    console.log(`     · ${p.full_name} <${p.email}> · ${p.position || '?'} · ${Math.round(y(p) / 12 * 10) / 10}y · ${String(p.location || '위치?').slice(0, 22)} · 전공=${String(p.major || '-').slice(0, 28)} · 졸업=${p.graduation_year || '-'}${p.english_cert ? ' · EN' : ''}${toolRe.test(p.__t) ? ' · 툴' : ''}${socialRe.test(p.__t) ? ' · SNS' : ''}${p.is_resume_public ? ' · 공개' : ''}`)
}

const fresh = base.filter((p) => !sent.has(p.id))
const mkt = layer('마케팅 시그널(Marketing 직군 or 마케팅/콘텐츠/SNS/브랜드 텍스트, 비개발) 전국·경력무관', fresh.filter((p) => !isDev(p) && (has(p, 'Marketing') || mktRe.test(p.__t))))
const mktJr = layer('  └ ≤1y (인턴·신입)', mkt.filter((p) => y(p) <= 12))
const mktJr2 = layer('  └ ≤2y (완화)', mkt.filter((p) => y(p) <= 24))
const core = layer('    └ ≤1y × HCMC권/미기재 (코어)', mktJr.filter((p) => inHcmc(p) || noLoc(p)))
layer('      └ HCMC 거주만', core.filter(inHcmc))
layer('      └ 미기재', core.filter(noLoc))
layer('      └ Canva/CapCut/Figma/Adobe 툴 명시', core.filter((p) => toolRe.test(p.__t)))
layer('      └ SNS/채널 운영 텍스트', core.filter((p) => socialRe.test(p.__t)))
layer('      └ 영어 시그널', core.filter(enSig))
layer('      └ 전공 매치(마케팅/커뮤니케이션/경영/디자인/어학)', core.filter((p) => mktMajor.test(majorTxt(p))))
const coreReady = layer('      └ 당일 겹침·7일 3통+ 제외 후 즉시 발송 가능', core.filter((p) => !todaySet.has(p.id) && !tired(p)))
layer('        └ 그중 HSE1602 기발송 제외 시', coreReady.filter((p) => !priorSet.has(p.id)))
const core2 = layer('    └ ≤2y × HCMC권/미기재 (완화)', mktJr2.filter((p) => inHcmc(p) || noLoc(p)))
layer('      └ 즉시 발송 가능', core2.filter((p) => !todaySet.has(p.id) && !tired(p)))
layer('  참고: 하노이 거주 ≤1y 마케팅 (이주 필요, 제외)', mktJr.filter(inHanoi))

const ext = layer('확장: 마케팅 시그널 없는 전공 매치 ≤1y × HCMC권/미기재 (비개발)', fresh.filter((p) => !isDev(p) && !mkt.includes(p) && mktMajor.test(majorTxt(p)) && y(p) <= 12 && (inHcmc(p) || noLoc(p))))
layer('  └ 즉시 발송 가능', ext.filter((p) => !todaySet.has(p.id) && !tired(p)))

console.log('\n코어 미리보기')
preview(core, 15)
console.log('\n확장 미리보기')
preview(ext, 8)

// ── 타이트 게이트: 텍스트 시그널만으로는 느슨(관광·한국학 전공 등 유입) → 직군/전공 기준으로 조임 ──
console.log('\n타이트 게이트')
const mktMajorTight = /(marketing|truyền thông|communication|media|quan hệ công chúng|public relations|thiết kế|design|đồ họa|graphic|báo chí|journalism|quản trị kinh doanh|business admin|kinh doanh|thương mại|commerce)/i
const tight = layer('(Marketing/Design 직군 or 마케팅·커뮤니케이션·디자인·경영 전공) × ≤1y × HCMC권/미기재', core.filter((p) => has(p, 'Marketing') || has(p, 'Design') || mktMajorTight.test(majorTxt(p))))
layer('  └ Marketing 직군', tight.filter((p) => has(p, 'Marketing')))
layer('  └ Design 직군(Marketing 아님)', tight.filter((p) => !has(p, 'Marketing') && has(p, 'Design')))
layer('  └ 전공만 매치(직군은 Non-IT/Other/Sales 등)', tight.filter((p) => !has(p, 'Marketing') && !has(p, 'Design')))
const tight2 = layer('  └ × (툴 명시 or SNS 운영 텍스트)', tight.filter((p) => toolRe.test(p.__t) || socialRe.test(p.__t)))
layer('    └ 즉시 발송 가능(당일·7일 3통+ 제외)', tight2.filter((p) => !todaySet.has(p.id) && !tired(p)))
layer('    └ 그중 공개 이력서', tight2.filter((p) => p.is_resume_public))
layer('  └ 즉시 발송 가능(툴/SNS 조건 없이)', tight.filter((p) => !todaySet.has(p.id) && !tired(p)))
