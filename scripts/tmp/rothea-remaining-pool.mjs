// 읽기 전용 — Rothea R108 Performance Marketer(아마존 US) 추가 발송 가능 풀 실측 (9/16)
// 1차 발송(8월 말)은 CV 원본 수동검증 30명(A 8 + B 22). 이번엔 텍스트 시그널 티어별 "미발송 잔여"를 센다.
// JD: 미국 아마존 셀러센트럴 3y+ × Amazon Ads × FBA · 32-35M · 영어 문서작성 · Shopee/Lazada만은 불인정
import { sb, fetchAll } from '../outreach/lib.mjs'

const JOB_ID = '65975789-367e-4650-9f2f-a5c440ecdd38'
const FIRST_SCAN = '2026-08-26'

const norm = (v) => (Array.isArray(v) ? v.join(' ') : String(v || ''))
const txt = (p) => {
  const exp = Array.isArray(p.experiences) ? p.experiences.map((e) => `${e.title || e.position || ''} ${e.company || ''}`).join(' ') : ''
  return [p.position, p.headline, norm(p.desired_roles), norm(p.skills), exp, JSON.stringify(p.resume_summary || ''), p.university, p.major].join(' ').toLowerCase()
}
const roles = (p) => [p.position, ...(p.desired_roles || [])].filter(Boolean)
const y = (p) => p.yoe_months ?? 0
const devDesign = (p) => roles(p).some((r) => /(developer|engineer|frontend|backend|fullstack|mobile|devops|designer|design|qa|tester)/i.test(String(r)))

// "amazon" 단독은 AWS(Amazon Web Services) 오탐 — 커머스 문맥만 인정
const amzStrongRe = /(seller ?central|\bfba\b|helium ?10|\bacos\b|sponsored (product|brand)|amazon (ads|seller|store|marketplace|listing|ppc|fba)|\bamz\b)/i
const awsRe = /(amazon web|aws)/i
const amzRe = { test: (t) => amzStrongRe.test(t) || (/amazon/i.test(t) && !awsRe.test(t)) }
const globalMpRe = /(walmart|tiktok ?shop|\bebay\b|\betsy\b|shopify|marketplace|cross-?border|e-?commerce|thương mại điện tử)/i
const adsRe = /(google ads|facebook ads|meta ads|\bppc\b|performance marketing|digital advertis|adwords|quảng cáo)/i
const seaRe = /(shopee|lazada|\btiki\b|sendo)/i

const [pool, unsubs, recs, apps] = await Promise.all([
  fetchAll(() => sb.from('user_profiles')
    .select('id,email,full_name,position,desired_roles,yoe_months,location,english_cert,skills,resume_summary,headline,experiences,created_at')
    .not('email', 'is', null).not('resume_url', 'is', null).order('created_at', { ascending: false })),
  fetchAll(() => sb.from('events').select('user_id').eq('event', 'coldmail_unsub').not('user_id', 'is', null).order('id')),
  fetchAll(() => sb.from('job_recommendations').select('user_id,created_at').eq('job_id', JOB_ID).order('id')),
  fetchAll(() => sb.from('job_applications').select('user_id').eq('job_id', JOB_ID).order('id')),
])
const unsubSet = new Set(unsubs.map((r) => r.user_id))
const recSet = new Set(recs.map((r) => r.user_id))
const appSet = new Set(apps.map((a) => a.user_id))
console.log(`이 공고 발송 이력: ${recs.length}건 · 지원: ${apps.length}건 · 전역 unsub: ${unsubSet.size}명`)

const seen = new Set()
const tiers = { T1: [], T2: [], T3: [], T4: [] }
let alreadySent = 0
for (const p of pool) {
  if (!p.email || /likelion/i.test(p.email)) continue
  const e = p.email.toLowerCase()
  if (seen.has(e)) continue
  seen.add(e)
  if (unsubSet.has(p.id) || appSet.has(p.id)) continue
  const t = txt(p)
  let tier = null
  if (amzRe.test(t) && !devDesign(p)) tier = 'T1'
  else if (globalMpRe.test(t) && y(p) >= 24 && !devDesign(p)) tier = 'T2'
  else if (adsRe.test(t) && y(p) >= 24 && !devDesign(p)) tier = 'T3'
  else if (seaRe.test(t) && !devDesign(p)) tier = 'T4'
  if (!tier) continue
  if (recSet.has(p.id)) { alreadySent++; continue }
  tiers[tier].push(p)
}

const LABEL = {
  T1: '아마존 직접 시그널(amazon/seller central/FBA/ACOS 등)',
  T2: '글로벌 마켓플레이스·이커머스 텍스트 × 2y+ × 비개발·비디자인',
  T3: '광고 운용(구글/페북/PPC/퍼포먼스) × 2y+ × 비개발·비디자인 — 아마존 무경험',
  T4: 'SEA 이커머스만(Shopee/Lazada) — JD 불인정층, 참고용',
}
console.log(`\n기발송 겹침(티어 해당인데 이미 수신): ${alreadySent}명\n`)
for (const k of ['T1', 'T2', 'T3', 'T4']) {
  const arr = tiers[k]
  const fresh = arr.filter((p) => String(p.created_at) >= FIRST_SCAN)
  console.log(`[${k}] ${LABEL[k]}: 잔여 ${arr.length}명 (그중 8/26 이후 신규가입 ${fresh.length}명)`)
  for (const p of arr.slice(0, 8))
    console.log(`   ${String(p.created_at) >= FIRST_SCAN ? '🆕' : '  '} ${p.full_name} <${p.email}> · ${p.position || '?'} · ${(y(p) / 12).toFixed(1)}y · ${(p.location || '위치?').slice(0, 25)}`)
}
