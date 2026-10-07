// FMC V217(그래픽 디자이너 · 한국어 가능) 추가 발송 확장 풀 실측 (읽기 전용)
// 10/5 기준 V217 코어(그래픽 시그널 × HCMC권 × 한국어 시그널) 25명 전원 발송 → 그 밖의 한국어 가능 후보 레이어 측정
import { sb, fetchAll, fetchBlacklist } from '../outreach/lib.mjs'

const V217 = '02c64540-273f-42b2-ac0f-b2c30315673d'
const V218 = 'd86744f2-0e7c-4288-9ead-3d1f09fa07fb'

const norm = (v) => (Array.isArray(v) ? v.join(' ') : String(v || ''))
const txt = (p) => {
  const exp = Array.isArray(p.experiences) ? p.experiences.map((e) => `${e.title || e.position || ''} ${e.company || ''} ${e.description || ''}`).join(' ') : ''
  return [p.position, p.headline, norm(p.desired_roles), JSON.stringify(p.skills || ''), exp, JSON.stringify(p.resume_summary || ''), p.major, p.university].join(' ').toLowerCase()
}
const roles = (p) => [p.position, ...(p.desired_roles || [])].filter(Boolean)
const isDesign = (p) => roles(p).includes('Design')
const isMkt = (p) => roles(p).some((r) => /market/i.test(r))
const graphicRe = /(graphic design|graphic designer|graphic\b|đồ họa|do hoa|thiết kế đồ họa|visual design|brand design|print design|key visual|illustrat)/i
const adobeRe = /(photoshop|illustrator|indesign|adobe)/i
const broadDesignRe = /(thiết kế|thiet ke|\bdesign|canva|figma|poster|banner|key visual|layout|typography)/i
const koRe = /(korean|tiếng hàn|tieng han|topik|한국어|hàn quốc|han quoc|hankuk|korea)/i
const koStrictRe = /(korean|tiếng hàn|topik|한국어)/i
const koSig = (p) => !!p.korean_cert || koStrictRe.test(p.__t)
const koWide = (p) => !!p.korean_cert || koRe.test(p.__t)
const topik = (p) => { const m = String(p.korean_cert || '').match(/topik\s*(?:ii\s*)?(?:level\s*)?(\d)|(\d)\s*급|level\s*(\d)/i); return m ? Number(m[1] || m[2] || m[3]) : null }
const hcmA = (p) => /(h[ồo]\s*ch[íi]\s*minh|hcm|sài gòn|sai gon|saigon|thủ đức|thu duc|bình thạnh|bình dương|binh duong|đồng nai|dong nai|biên hòa|bien hoa|long an)/i.test(String(p.location || ''))
const noLoc = (p) => !String(p.location || '').trim()
const hcmOk = (p) => hcmA(p) || noLoc(p)
const graphic = (p) => graphicRe.test(p.__t) || adobeRe.test(p.__t)
const hasPortfolio = (p) => !!p.portfolio_url || /(portfolio|behance|dribbble)/i.test(p.__t)

const [pool, unsubs, recs217, apps217, recs218, bl, langResp] = await Promise.all([
  fetchAll(() => sb.from('user_profiles')
    .select('id,email,full_name,position,desired_roles,headline,major,university,yoe_months,location,korean_cert,skills,resume_summary,experiences,portfolio_url,created_at')
    .not('email', 'is', null).not('resume_url', 'is', null).order('created_at', { ascending: false })),
  fetchAll(() => sb.from('events').select('user_id').eq('event', 'coldmail_unsub').not('user_id', 'is', null).order('id')),
  fetchAll(() => sb.from('job_recommendations').select('user_id,status,created_at').eq('job_id', V217).order('id')),
  fetchAll(() => sb.from('job_applications').select('user_id,created_at').eq('job_id', V217).order('id')),
  fetchAll(() => sb.from('job_recommendations').select('user_id').eq('job_id', V218).order('id')),
  fetchBlacklist(),
  sb.from('coldmail_lang_responses').select('*').range(0, 4999).then((r) => (r.error ? (console.warn('lang_responses:', r.error.message), []) : r.data || [])),
])
const unsubSet = new Set(unsubs.map((r) => r.user_id))
const sent217 = new Set(recs217.map((r) => r.user_id))
const app217 = new Set(apps217.map((r) => r.user_id))
const sent218 = new Set(recs218.map((r) => r.user_id))

console.log(`V217 현황 — recommend 기발송 ${sent217.size}명 · 지원 ${app217.size}명 (발송자 중 지원 ${[...app217].filter((u) => sent217.has(u)).length})`)
console.log(`V218 현황 — recommend 기발송 ${sent218.size}명`)
if (langResp.length) {
  const cols = Object.keys(langResp[0])
  console.log(`coldmail_lang_responses ${langResp.length}행 · 컬럼: ${cols.join(',')}`)
  const koRows = langResp.filter((r) => /korean|ko|한국|topik/i.test(JSON.stringify(r)))
  console.log(`  한국어 관련 응답 행 ${koRows.length}`)
}

const seen = new Set(); const base = []
for (const p of pool) {
  if (!p.email || /likelion/i.test(p.email)) continue
  const e = p.email.toLowerCase()
  if (seen.has(e) || unsubSet.has(p.id) || bl.has(p)) continue
  seen.add(e); p.__t = txt(p); base.push(p)
}
const fresh = base.filter((p) => !sent217.has(p.id) && !app217.has(p.id))
console.log(`\n베이스 ${base.length}명 → V217 미발송 ${fresh.length}명`)

const L = (label, arr) => { console.log(`  ${label}: ${arr.length}명 (korean_cert ${arr.filter((p) => p.korean_cert).length} · TOPIK4+ ${arr.filter((p) => (topik(p) || 0) >= 4).length} · V218 기수신 ${arr.filter((p) => sent218.has(p.id)).length} · 포폴 ${arr.filter(hasPortfolio).length})`); return arr }

const ko = fresh.filter(koSig)
console.log(`\n[0] 한국어 시그널(인증 or 텍스트) 전국, V217 미발송: ${ko.length}명 · HCMC권/미기재 ${ko.filter(hcmOk).length} · 타지역 ${ko.filter((p) => !hcmOk(p)).length}`)
const koT4 = ko.filter((p) => (topik(p) || 0) >= 4)
console.log(`    TOPIK4+ 파싱 ${koT4.length} (HCMC권/미기재 ${koT4.filter(hcmOk).length})`)

console.log(`\n[1] 확장 레이어 (HCMC권/미기재 × 한국어 시그널, V217 미발송) — 위에서부터 우선순위`)
const a = L('a. Design 직군이지만 그래픽/Adobe 텍스트 없음(UI/UX·영상 등)', ko.filter((p) => hcmOk(p) && isDesign(p) && !graphic(p)))
const b = L('b. 비Design 직군 × 넓은 디자인 텍스트(thiết kế/design/canva/figma/poster/banner)', ko.filter((p) => hcmOk(p) && !isDesign(p) && !graphic(p) && broadDesignRe.test(p.__t)))
const c = L('c. Marketing 직군 × 한국어 (디자인 텍스트 없음)', ko.filter((p) => hcmOk(p) && !isDesign(p) && !graphic(p) && !broadDesignRe.test(p.__t) && isMkt(p)))
const d = L('d. TOPIK4+ 인증 × 그 외 직군(디자인/마케팅 텍스트 전무)', ko.filter((p) => hcmOk(p) && !isDesign(p) && !graphic(p) && !broadDesignRe.test(p.__t) && !isMkt(p) && (topik(p) || 0) >= 4))
const e = L('e. 타지역(하노이/다낭 등) × 그래픽/Adobe 시그널 × 한국어', ko.filter((p) => !hcmOk(p) && graphic(p)))
const f = L('f. 넓은 한국어 매치만(hàn quốc/korea 등, 엄격 매치 제외) × HCMC권 × 그래픽/Adobe', fresh.filter((p) => !koSig(p) && koWide(p) && hcmOk(p) && graphic(p)))
const g = L('g. 넓은 한국어 매치 × HCMC권 × Design 직군 or 넓은 디자인 텍스트', fresh.filter((p) => !koSig(p) && koWide(p) && hcmOk(p) && !graphic(p) && (isDesign(p) || broadDesignRe.test(p.__t))))

const score = (p) => ((topik(p) || 0) >= 4 ? 3 : p.korean_cert ? 1 : 0) + (isDesign(p) ? 2 : 0) + (graphic(p) ? 2 : broadDesignRe.test(p.__t) ? 1 : 0) + (hasPortfolio(p) ? 1 : 0) + (hcmA(p) ? 1 : 0)
const fmt = (p) => `    [${score(p)}] ${p.full_name} <${p.email}> · ${p.position || '?'}${p.desired_roles?.length ? '/' + p.desired_roles.join(',') : ''} · ${Math.round((p.yoe_months || 0) / 12 * 10) / 10}y · ${String(p.location || '위치?').slice(0, 20)} · ko=${String(p.korean_cert || '텍스트').slice(0, 18)} · ${String(p.major || '').slice(0, 25)}${hasPortfolio(p) ? ' · 포폴' : ''}${sent218.has(p.id) ? ' · V218기수신' : ''}`
for (const [k, arr] of [['a', a], ['b', b], ['c', c], ['d', d], ['e', e], ['f', f], ['g', g]]) {
  if (!arr.length) continue
  console.log(`\n[${k}] 상위 12 표본 (총 ${arr.length})`)
  for (const p of [...arr].sort((x, y2) => score(y2) - score(x)).slice(0, 12)) console.log(fmt(p))
}
