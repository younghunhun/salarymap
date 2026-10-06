// V219 POSCO DX VIETNAM — Senior Front-end Publishing Developer(HCMC 온사이트) 발송 풀 실측 (읽기 전용)
// JD 하드 요건: FE 개발/웹 퍼블리싱 5y+ · HTML5/CSS3/JS · Vue 또는 React · 리팩토링/컴포넌트화 · 반응형/크로스브라우저 · Git · 영어 업무 소통
// 우대: UX/UI·Figma · 디자인시스템 · TS/SCSS/Vite/Webpack · AI툴 · ERP/MES/스마트팩토리 · 한국어
import { sb, fetchAll, fetchBlacklist } from '../outreach/lib.mjs'

const JOB = '108141fa-a6bc-41ed-92b9-3c32dcc5be53'
const today = new Date().toISOString().slice(0, 10)
const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString()

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

const feRole = (p) => roles(p).some((r) => /frontend|front-end|fullstack/i.test(String(r)))
const feRe = /(front-?end|frontend|web publish|publisher|publishing|html\/css|html5|css3|ui developer|web developer|lập trình web|thiết kế giao diện)/i
const fwRe = /\breact\b|react\.?js|\bvue\b|vue\.?js|nuxt|next\.?js/i
const htmlRe = /\bhtml\b|\bcss\b|javascript|\bjs\b/i
const refacRe = /refactor|tái cấu trúc|clean code|code review|maintainab|reusable|component librar|design system|storybook/i
const respRe = /responsive|cross-?browser|mobile-?first|bootstrap|tailwind/i
const buildRe = /typescript|\bts\b|sass|scss|vite|webpack/i
const uxRe = /figma|adobe xd|\bsketch\b|zeplin|ui\/ux|ux\/ui|uiux/i
const entRe = /\berp\b|\bmes\b|smart factory|nhà máy|manufactur|enterprise/i
const koRe = /(korean|tiếng hàn|topik|한국어)/i
const enRe = /(english|tiếng anh|ielts|toefl|toeic)/i
const koSig = (p) => !!p.korean_cert || koRe.test(p.__t)
const enSig = (p) => !!p.english_cert || enRe.test(p.__t)
const inHcmc = (p) => /(h[ồo]\s*ch[íi]\s*minh|hcm|sài gòn|sai gon|saigon|thủ đức|thu duc|bình dương|binh duong|đồng nai|dong nai|biên hòa|bien hoa|long an|호찌민|호치민)/i.test(String(p.location || ''))
const noLoc = (p) => !String(p.location || '').trim()

const [pool, unsubs, recs, apps, todays, weeks, bl] = await Promise.all([
  fetchAll(() => sb.from('user_profiles')
    .select('id,email,full_name,position,desired_roles,yoe_months,location,english_cert,korean_cert,skills,resume_summary,headline,experiences,university,major,graduation_year,created_at')
    .not('email', 'is', null).not('resume_url', 'is', null).order('created_at', { ascending: false })),
  fetchAll(() => sb.from('events').select('user_id').eq('event', 'coldmail_unsub').not('user_id', 'is', null).order('id')),
  fetchAll(() => sb.from('job_recommendations').select('user_id').eq('job_id', JOB).order('id')),
  fetchAll(() => sb.from('job_applications').select('user_id').eq('job_id', JOB).order('id')),
  fetchAll(() => sb.from('job_recommendations').select('user_id').gte('created_at', today).order('id')),
  fetchAll(() => sb.from('job_recommendations').select('user_id').gte('created_at', weekAgo).order('id')),
  fetchBlacklist(),
])
const unsubSet = new Set(unsubs.map((r) => r.user_id))
const sent = new Set([...recs.map((r) => r.user_id), ...apps.map((r) => r.user_id)])
const todaySet = new Set(todays.map((r) => r.user_id))
const weekCnt = {}
for (const r of weeks) weekCnt[r.user_id] = (weekCnt[r.user_id] || 0) + 1
const stale = (p) => (weekCnt[p.id] || 0) >= 3

const seen = new Set()
const base = []
for (const p of pool) {
  if (!p.email || /likelion/i.test(p.email)) continue
  const e = p.email.toLowerCase()
  if (seen.has(e) || unsubSet.has(p.id) || bl.has(p)) continue
  seen.add(e)
  p.__t = txt(p)
  base.push(p)
}
console.log(`베이스(이력서·이메일·unsub/blacklist/likelion 제외): ${base.length}명 · 이 공고 기발송/기지원 ${sent.size}명 · 당일(${today}) recommend 기수신 ${todaySet.size}명`)

const fresh = base.filter((p) => !sent.has(p.id))
const fe = fresh.filter((p) => feRole(p) || feRe.test(p.__t) || fwRe.test(p.__t))
console.log(`\nFE 시그널(Frontend/Fullstack 직군 or FE/퍼블리싱 텍스트 or React/Vue, 경력·지역 무관): ${fe.length}명 (FE/FS 직군 ${fe.filter(feRole).length} · React/Vue ${fe.filter((p) => fwRe.test(p.__t)).length} · 퍼블리싱/HTML·CSS 텍스트 ${fe.filter((p) => feRe.test(p.__t)).length})`)

const layer = (label, arr) => {
  const t = arr.filter((p) => todaySet.has(p.id)).length
  const s = arr.filter(stale).length
  console.log(`  ${label}: ${arr.length}명 (당일 겹침 ${t} · 7일 3통+ 신선도 제외 ${s} → 오늘 발송가능 ${arr.filter((p) => !todaySet.has(p.id) && !stale(p)).length})`)
  return arr
}

// ── 1) 코어: FE × 5y+ × HCMC권/미기재 × React/Vue 명시
console.log(`\n[1] 코어 — FE × 5y+ (JD 하드) × HCMC권/미기재 × React/Vue`)
const fe5 = fe.filter((p) => y(p) >= 60)
layer('FE 5y+ 전국', fe5)
const core = fe5.filter((p) => inHcmc(p) || noLoc(p))
layer('  └ HCMC권/미기재', core)
const coreFw = core.filter((p) => fwRe.test(p.__t))
layer('    └ React/Vue 명시', coreFw)
const coreLang = coreFw.filter((p) => enSig(p) || koSig(p))
layer('      └ 영어/한국어 시그널 有', coreLang)
console.log(`        구성 — HTML/CSS/JS ${coreFw.filter((p) => htmlRe.test(p.__t)).length} · 리팩토링/컴포넌트/DS ${coreFw.filter((p) => refacRe.test(p.__t)).length} · 반응형/크로스브라우저 ${coreFw.filter((p) => respRe.test(p.__t)).length} · TS/SCSS/Vite/Webpack ${coreFw.filter((p) => buildRe.test(p.__t)).length} · Figma/UX ${coreFw.filter((p) => uxRe.test(p.__t)).length} · ERP/MES ${coreFw.filter((p) => entRe.test(p.__t)).length}`)
console.log(`        영어인증 ${coreFw.filter((p) => p.english_cert).length} · 한국어시그널 ${coreFw.filter(koSig).length} · 위치미기재 ${coreFw.filter(noLoc).length} · Frontend 직군 ${coreFw.filter((p) => roles(p).some((r) => /frontend|front-end/i.test(String(r)))).length} · Fullstack만 ${coreFw.filter((p) => !roles(p).some((r) => /frontend|front-end/i.test(String(r)))).length}`)
const yb = (m) => (m < 84 ? '5-7y' : m < 120 ? '7-10y' : '10y+')
const d = {}
for (const p of coreFw) d[yb(y(p))] = (d[yb(y(p))] || 0) + 1
console.log(`        경력 분포 — ${Object.entries(d).sort().map(([k, v]) => `${k} ${v}`).join(' · ')}`)

// ── 2) 확장 레이어
console.log(`\n[2] 확장 후보(코어 외)`)
layer('a. 5y+ HCMC권 FE인데 React/Vue 텍스트 없음(HTML/CSS/jQuery 퍼블리셔 등)', core.filter((p) => !fwRe.test(p.__t)))
layer('b. 5y+ 타지역(하노이/다낭 — 이주 필요) React/Vue', fe5.filter((p) => !inHcmc(p) && !noLoc(p) && fwRe.test(p.__t)))
const fe3 = fe.filter((p) => y(p) >= 36 && y(p) < 60 && (inHcmc(p) || noLoc(p)) && fwRe.test(p.__t))
layer('c. 3~5y HCMC권 React/Vue (경력 완화층)', fe3)
layer('   └ 영어/한국어 시그널 有', fe3.filter((p) => enSig(p) || koSig(p)))

// ── 3) 코어 미리보기
const score = (p) => (fwRe.test(p.__t) ? 2 : 0) + (htmlRe.test(p.__t) ? 1 : 0) + (refacRe.test(p.__t) ? 2 : 0) + (respRe.test(p.__t) ? 1 : 0) + (buildRe.test(p.__t) ? 1 : 0) + (uxRe.test(p.__t) ? 1 : 0) + (entRe.test(p.__t) ? 1 : 0) + (koSig(p) ? 2 : 0) + (p.english_cert ? 1 : 0) + (roles(p).some((r) => /frontend|front-end/i.test(String(r))) ? 1 : 0)
const top = [...coreFw].sort((a, b) => score(b) - score(a)).slice(0, 30)
console.log(`\n[3] 코어(React/Vue, 언어 무관) 상위 ${top.length}명 미리보기`)
for (const p of top)
  console.log(`  [${score(p)}] ${p.full_name} <${p.email}> · ${roles(p).join('/') || '?'} · ${Math.round(y(p) / 12 * 10) / 10}y · ${p.location || '위치?'}${koSig(p) ? ' · KO' : ''}${p.english_cert ? ' · EN인증' : ''}${refacRe.test(p.__t) ? ' · 리팩토링/DS' : ''}${buildRe.test(p.__t) ? ' · TS/SCSS' : ''}${stale(p) ? ' · ⚠신선도' : ''}`)

console.log(`\n[4] 확장 c(3~5y) 상위 10명 미리보기`)
for (const p of [...fe3].sort((a, b) => score(b) - score(a)).slice(0, 10))
  console.log(`  [${score(p)}] ${p.full_name} <${p.email}> · ${roles(p).join('/') || '?'} · ${Math.round(y(p) / 12 * 10) / 10}y · ${p.location || '위치?'}${koSig(p) ? ' · KO' : ''}${p.english_cert ? ' · EN인증' : ''}`)
