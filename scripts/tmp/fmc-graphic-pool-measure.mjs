// First Marketing Company 그래픽 디자이너 V217(한국어 가능) / V218(일반) 발송 풀 실측 (읽기 전용)
// JD: 경력 무관 · Photoshop/Illustrator/InDesign · 포트폴리오 필수 · HCMC 온사이트 · V217은 TOPIK4 우대
import { sb, fetchAll } from '../outreach/lib.mjs'

const V217 = '02c64540-273f-42b2-ac0f-b2c30315673d' // Korean Speaking
const V218 = 'd86744f2-0e7c-4288-9ead-3d1f09fa07fb' // 일반
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
// 엄격: "thiết kế"(디자인 일반)·"ai"(베트남어 단어) 과대매칭 제외
const graphicRe = /(graphic design|graphic designer|graphic\b|đồ họa|do hoa|thiết kế đồ họa|visual design|brand design|print design|key visual|illustrat)/i
const adobeRe = /(photoshop|illustrator|indesign|adobe)/i
const psRe = /photoshop/i, aiRe = /illustrator/i, idRe = /indesign/i
const uiuxOnlyRe = /(ui\/ux|ui\s*ux|uiux|ux\/ui|ux designer|ui designer|product designer)/i
const videoRe = /(video editor|motion graphic|premiere|after effects|editor)/i
const koRe = /(korean|tiếng hàn|topik|한국어)/i
const koSig = (p) => !!p.korean_cert || koRe.test(p.__t)
const topik = (p) => { const m = String(p.korean_cert || '').match(/topik\s*(\d)|(\d)\s*급|level\s*(\d)/i); return m ? Number(m[1] || m[2] || m[3]) : null }
const inHcmc = (p) => /(h[ồo]\s*ch[íi]\s*minh|hcm|sài gòn|sai gon|thủ đức|thu duc|bình dương|binh duong|đồng nai|dong nai|biên hòa|bien hoa|long an)/i.test(String(p.location || ''))
const noLoc = (p) => !String(p.location || '').trim()
const hasPortfolio = (p) => !!(p.portfolio_url || p.website_url) || /(portfolio|behance|dribbble|portfolio_url)/i.test(p.__t)

const [pool, unsubs, recs, apps, todays] = await Promise.all([
  fetchAll(() => sb.from('user_profiles')
    .select('id,email,full_name,position,desired_roles,yoe_months,location,english_cert,korean_cert,skills,resume_summary,headline,experiences,university,major,graduation_year,created_at,portfolio_url')
    .not('email', 'is', null).not('resume_url', 'is', null).order('created_at', { ascending: false })),
  fetchAll(() => sb.from('events').select('user_id').eq('event', 'coldmail_unsub').not('user_id', 'is', null).order('id')),
  fetchAll(() => sb.from('job_recommendations').select('user_id,job_id').in('job_id', [V217, V218]).order('id')),
  fetchAll(() => sb.from('job_applications').select('user_id,job_id').in('job_id', [V217, V218]).order('id')),
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
console.log(`베이스(이력서·이메일·unsub/likelion 제외): ${base.length}명 · 두 공고 기발송/기지원 ${sent.size}명 · 당일(${today}) recommend 기수신 ${todaySet.size}명`)

const fresh = base.filter((p) => !sent.has(p.id))
const design = fresh.filter((p) => isDesign(p) || graphicRe.test(p.__t) || adobeRe.test(p.__t))
const layer = (label, arr) => {
  const t = arr.filter((p) => todaySet.has(p.id)).length
  console.log(`  ${label}: ${arr.length}명${t ? ` (당일 겹침 ${t} → 오늘 ${arr.length - t})` : ''}`)
  return arr
}

console.log(`\n[0] 디자인 시그널 전국(Design 직군 or 그래픽/Adobe 텍스트): ${design.length}명`)
console.log(`    Design 직군 ${design.filter(isDesign).length} · 그래픽 텍스트 ${design.filter((p) => graphicRe.test(p.__t)).length} · Adobe(PS/AI/ID) ${design.filter((p) => adobeRe.test(p.__t)).length}`)

console.log(`\n[1] 코어 — 그래픽 시그널 × HCMC권/미기재 (경력 무관)`)
const dHcm = design.filter((p) => inHcmc(p) || noLoc(p))
layer('디자인 시그널 HCMC권/미기재', dHcm)
const core = dHcm.filter((p) => graphicRe.test(p.__t) || adobeRe.test(p.__t))
layer('  └ 그래픽 or Adobe 툴 명시', core)
console.log(`        직군 구성 — Design ${core.filter(isDesign).length} · 비Design(텍스트만 매치) ${core.filter((p) => !isDesign(p)).length}`)
const coreStrict = core.filter((p) => psRe.test(p.__t) || aiRe.test(p.__t) || idRe.test(p.__t))
layer('    └ PS/AI/InDesign 중 1개+ 명시', coreStrict)
console.log(`        PS ${coreStrict.filter((p) => psRe.test(p.__t)).length} · AI ${coreStrict.filter((p) => aiRe.test(p.__t)).length} · InDesign ${coreStrict.filter((p) => idRe.test(p.__t)).length} · 3종 모두 ${coreStrict.filter((p) => psRe.test(p.__t) && aiRe.test(p.__t) && idRe.test(p.__t)).length}`)
console.log(`        포트폴리오 시그널(URL or 텍스트) ${core.filter(hasPortfolio).length} · UI/UX 겸업 ${core.filter((p) => uiuxOnlyRe.test(p.__t)).length} · 영상 겸업 ${core.filter((p) => videoRe.test(p.__t)).length}`)
console.log(`        위치미기재 ${core.filter(noLoc).length} · HCMC명시 ${core.filter(inHcmc).length}`)
const yb = (m) => (m === 0 ? '0y' : m < 12 ? '<1y' : m < 36 ? '1-3y' : m < 60 ? '3-5y' : '5y+')
const dist = {}
for (const p of core) dist[yb(y(p))] = (dist[yb(y(p))] || 0) + 1
console.log(`        경력 분포 — ${Object.entries(dist).map(([k, v]) => `${k} ${v}`).join(' · ')}`)

console.log(`\n[2] 공고 배정 — V217(한국어 가능) vs V218(일반), 코어 ${core.length}명 기준`)
const ko = core.filter(koSig)
layer('V217 후보: 한국어 시그널(인증 or 텍스트)', ko)
console.log(`    korean_cert 有 ${ko.filter((p) => p.korean_cert).length} · TOPIK 4+ 파싱 ${ko.filter((p) => (topik(p) || 0) >= 4).length} · TOPIK 3- ${ko.filter((p) => topik(p) && topik(p) < 4).length} · 텍스트만 ${ko.filter((p) => !p.korean_cert).length}`)
const koCerts = {}
for (const p of ko) { const k = String(p.korean_cert || '텍스트만').slice(0, 30); koCerts[k] = (koCerts[k] || 0) + 1 }
console.log(`    korean_cert 값 분포: ${Object.entries(koCerts).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(' · ')}`)
const gen = core.filter((p) => !koSig(p))
layer('V218 후보: 한국어 시그널 없음', gen)

console.log(`\n[3] 확장 후보(코어 외)`)
layer('a. HCMC권/미기재 Design 직군인데 그래픽/Adobe 텍스트 없음(UI/UX·영상 등)', dHcm.filter((p) => !graphicRe.test(p.__t) && !adobeRe.test(p.__t)))
layer('   └ 그중 한국어 시그널', dHcm.filter((p) => !graphicRe.test(p.__t) && !adobeRe.test(p.__t) && koSig(p)))
layer('b. 타지역(하노이/다낭 등) 그래픽 시그널', design.filter((p) => !inHcmc(p) && !noLoc(p) && (graphicRe.test(p.__t) || adobeRe.test(p.__t))))
layer('   └ 그중 한국어 시그널', design.filter((p) => !inHcmc(p) && !noLoc(p) && (graphicRe.test(p.__t) || adobeRe.test(p.__t)) && koSig(p)))

const score = (p) => (psRe.test(p.__t) ? 1 : 0) + (aiRe.test(p.__t) ? 1 : 0) + (idRe.test(p.__t) ? 2 : 0) + (graphicRe.test(p.__t) ? 2 : 0) + (hasPortfolio(p) ? 1 : 0) + (isDesign(p) ? 1 : 0) + (p.korean_cert ? 2 : koSig(p) ? 1 : 0)
const fmt = (p) => `  [${score(p)}] ${p.full_name} <${p.email}> · ${p.position || '?'} · ${Math.round(y(p) / 12 * 10) / 10}y · ${p.location || '위치?'}${p.korean_cert ? ` · KO:${p.korean_cert}` : koSig(p) ? ' · KO(텍스트)' : ''}${idRe.test(p.__t) ? ' · InDesign' : ''}${hasPortfolio(p) ? ' · 포폴' : ''}`
console.log(`\n[4] V217 후보 전원(${ko.length}명)`)
for (const p of [...ko].sort((a, b) => score(b) - score(a))) console.log(fmt(p))
console.log(`\n[5] V218 후보 상위 20명`)
for (const p of [...gen].sort((a, b) => score(b) - score(a)).slice(0, 20)) console.log(fmt(p))
