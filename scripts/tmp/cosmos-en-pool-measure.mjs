// 코스모스소프트 K22 풀스택 주니어 — 한국어→영어 완화 시 추가 소싱 풀 실측 (읽기 전용)
// 9/11 발송분(cosmos0911, 한국어 게이트 15명)은 job_recommendations 로 제외.
// 게이트 후보: 개발직군(FS/BE/FE/web) × ≤3y(Junior) × 영어 시그널(인증 vs 텍스트 언급) 티어별 집계.
import { sb, fetchAll } from '../outreach/lib.mjs'

const JOB_ID = '165b888e-c444-4ceb-9153-6589589a0f2b'

const norm = (v) => (Array.isArray(v) ? v.join(' ') : String(v || ''))
const txt = (p) => {
  const exp = Array.isArray(p.experiences) ? p.experiences.map((e) => `${e.title || e.position || ''} ${e.company || ''}`).join(' ') : ''
  return [p.position, p.headline, norm(p.desired_roles), norm(p.skills), exp, JSON.stringify(p.resume_summary || '')].join(' ').toLowerCase()
}
const y = (p) => p.yoe_months ?? 0
const roles = (p) => [p.position, ...(p.desired_roles || [])].filter(Boolean)
const DEV = ['fullstack', 'full-stack', 'full stack', 'backend', 'frontend', 'web developer']
const devRole = (p) => roles(p).some((r) => DEV.includes(String(r).toLowerCase()))
const koSig = (p) => !!p.korean_cert || /(korean|tiếng hàn|topik|한국어)/i.test(txt(p))
const enCert = (p) => !!p.english_cert
const enText = (p) => /(english|tiếng anh|ielts|toefl|toeic)/i.test(txt(p))
const javaSig = (p) => /\b(java|spring)\b/i.test(txt(p))
const feSig = (p) => /(react|javascript|html)/i.test(txt(p))
const sqlSig = (p) => /(sql|oracle|mysql|postgres|dbms)/i.test(txt(p))

const [pool, unsubs, recs, apps] = await Promise.all([
  fetchAll(() => sb.from('user_profiles')
    .select('id,email,full_name,position,desired_roles,yoe_months,location,english_cert,korean_cert,is_resume_public,skills,resume_summary,headline,experiences')
    .not('email', 'is', null).not('resume_url', 'is', null).order('created_at', { ascending: false })),
  fetchAll(() => sb.from('events').select('user_id').eq('event', 'coldmail_unsub').not('user_id', 'is', null).order('id')),
  fetchAll(() => sb.from('job_recommendations').select('user_id,created_at').eq('job_id', JOB_ID).order('id')),
  fetchAll(() => sb.from('job_applications').select('user_id,created_at,status').eq('job_id', JOB_ID).order('id')),
])
const unsubSet = new Set(unsubs.map((r) => r.user_id))
const recSet = new Set(recs.map((r) => r.user_id))
const appliedSet = new Set(apps.map((a) => a.user_id))

console.log(`K22 공고 현황: 기추천(recommend 발송) ${recSet.size}명 · 지원 ${apps.length}건`)
for (const a of apps) console.log(`  지원: ${a.created_at?.slice(0, 10)} · status=${a.status}`)

const seen = new Set()
const base = [] // devRole × ≤3y, unsub/likelion 제외 (기발송·기지원 포함한 전체)
for (const p of pool) {
  if (!p.email || /likelion/i.test(p.email)) continue
  const e = p.email.toLowerCase()
  if (seen.has(e) || unsubSet.has(p.id)) continue
  seen.add(e)
  if (!devRole(p) || y(p) > 36) continue
  base.push(p)
}
const fresh = base.filter((p) => !recSet.has(p.id) && !appliedSet.has(p.id)) // 추가 발송 가능분

const count = (arr, f) => arr.filter(f).length
console.log(`\n베이스: 개발직군(FS/BE/FE/web) × ≤3y = ${base.length}명 (기발송/기지원 제외 시 ${fresh.length}명)`)
console.log(`\n[추가 발송 가능 ${fresh.length}명의 영어 시그널 티어]`)
console.log(`  영어 인증(english_cert): ${count(fresh, enCert)}명 — 그중 Java/Spring ${count(fresh, (p) => enCert(p) && javaSig(p))}명`)
console.log(`  영어 텍스트 언급(인증 제외): ${count(fresh, (p) => !enCert(p) && enText(p))}명 — 그중 Java/Spring ${count(fresh, (p) => !enCert(p) && enText(p) && javaSig(p))}명`)
console.log(`  영어 시그널 전무: ${count(fresh, (p) => !enCert(p) && !enText(p))}명`)
console.log(`\n[스택 커버리지 — 영어 시그널(인증∪텍스트) 보유 ${count(fresh, (p) => enCert(p) || enText(p))}명 기준]`)
const enPool = fresh.filter((p) => enCert(p) || enText(p))
console.log(`  Java/Spring: ${count(enPool, javaSig)}명 · React/JS: ${count(enPool, feSig)}명 · SQL: ${count(enPool, sqlSig)}명`)
console.log(`  Java/Spring ∩ SQL: ${count(enPool, (p) => javaSig(p) && sqlSig(p))}명 (JD 코어 스택 매치)`)
console.log(`  참고 — 한국어 시그널도 보유: ${count(enPool, koSig)}명`)

// 코어 후보(영어 시그널 × Java/Spring) 상위 미리보기
const score = (p) => (javaSig(p) ? 3 : 0) + (feSig(p) ? 1 : 0) + (sqlSig(p) ? 1 : 0) + (enCert(p) ? 2 : 0)
const top = enPool.filter(javaSig).sort((a, b) => score(b) - score(a)).slice(0, 20)
console.log(`\n[코어 후보 상위 ${top.length}명 미리보기 — 영어 시그널 × Java/Spring]`)
for (const p of top)
  console.log(`  [${score(p)}${enCert(p) ? '·cert' : ''}] ${p.full_name} <${p.email}> · ${p.position || '?'} · ${Math.round(y(p) / 12 * 10) / 10}y · ${p.location || '위치?'}`)
