// POSCO DX V187 Java Developer 추가 발송 풀 실측 (10/13, 읽기 전용) — 9/19 112 + 9/29 6 = 118 기발송 · 지원 70. "3명 더 필요" 요청.
// 원 게이트(posco0919): Java/Spring 키워드 × 24m+ × HCMC권/미기재. 이번: 기발송·기지원 제외 후 같은 게이트 잔여(신규 가입 + 당시 신선도 게이트 탈락) + 완화층.
import { sb, fetchAll, fetchBlacklist } from '../outreach/lib.mjs'

const V187 = 'd2cd358f-69c9-4a9e-8225-40f88f92349f'
const today = new Date().toISOString().slice(0, 10)
const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString()
const SENT_AT = '2026-09-19'

const expTitles = (p) => (Array.isArray(p.experiences) ? p.experiences.map((e) => `${e.title || e.position || ''}`).join(' | ') : '')
const exp = (p) => (Array.isArray(p.experiences) ? p.experiences.map((e) => `${e.title || e.position || ''} ${e.company || ''} ${e.description || ''}`).join(' ') : '')
const txt = (p) => (JSON.stringify(p.skills || '') + ' ' + String(p.position || '') + ' ' + String(p.headline || '') + ' ' + JSON.stringify(p.desired_roles || '') + ' ' + JSON.stringify(p.resume_summary || '') + ' ' + exp(p)).toLowerCase()
const roles = (p) => [p.position, ...(p.desired_roles || [])].filter(Boolean)
const y = (p) => p.yoe_months ?? 0
const javaRe = /\bjava\b|spring ?boot|spring framework|\bspring\b|\bjsp\b|hibernate|mybatis/i
const springRe = /spring ?boot|spring framework|\bspring\b|mybatis|hibernate/i
const feRe = /\breact\b|react\.?js|\bvue\b|vue\.?js|angular/i
const dbRe = /mysql|postgres|oracle|mssql|sql server|mariadb/i
const restRe = /rest ?api|restful|spring mvc|microservice/i
const koOk = (p) => (!!String(p.korean_cert || '').trim() && !/^(none|no|없음|-|n\/a)$/i.test(String(p.korean_cert).trim())) || /(korean|tiếng hàn|topik|한국어)/i.test(p.__t)
const enOk = (p) => !!String(p.english_cert || '').trim() && !/^(none|no|없음|-|n\/a)$/i.test(String(p.english_cert).trim())
const hcmRe = /(h[ồo]\s*ch[íi]\s*minh|hcm|sài gòn|sai gon|saigon|thủ đức|thu duc|bình thạnh|binh thanh|bình dương|binh duong|đồng nai|dong nai|biên hòa|bien hoa|long an|호치민|호찌민|hóc môn|gò vấp|tân bình|tân phú|bình tân|phú nhuận|củ chi|nhà bè|bình chánh|quận \d|district \d|tphcm|tp\.?\s*hcm)/i
const hcmOk = (p) => { const l = String(p.location || ''); return !l.trim() || hcmRe.test(l) }
const city = (p) => { const l = String(p.location || ''); if (!l.trim()) return '미기재'; if (hcmRe.test(l)) return 'HCM'; if (/(hà nội|ha noi|hanoi|hn\b|하노이)/i.test(l)) return 'HN'; if (/(đà nẵng|da nang|danang|다낭)/i.test(l)) return 'ĐN'; return '기타' }
const javaTitle = (p) => /\bjava\b|spring/i.test(expTitles(p))
const javaRole = (p) => /java/i.test(roles(p).join(' '))
const beRole = (p) => roles(p).some((r) => /^(backend|fullstack|java|software)/i.test(r))

const [pool, unsubs, recs, apps, todays, weeks, bl, job] = await Promise.all([
  fetchAll(() => sb.from('user_profiles').select('id,email,full_name,position,desired_roles,yoe_months,location,english_cert,korean_cert,is_resume_public,skills,resume_summary,headline,experiences,major,created_at').not('email', 'is', null).not('resume_url', 'is', null).order('created_at', { ascending: false })),
  fetchAll(() => sb.from('events').select('user_id').eq('event', 'coldmail_unsub').not('user_id', 'is', null).order('id')),
  fetchAll(() => sb.from('job_recommendations').select('user_id').eq('job_id', V187).order('id')),
  fetchAll(() => sb.from('job_applications').select('user_id').eq('job_id', V187).order('id')),
  fetchAll(() => sb.from('job_recommendations').select('user_id').gte('created_at', today).order('id')),
  fetchAll(() => sb.from('job_recommendations').select('user_id').gte('created_at', weekAgo).order('id')),
  fetchBlacklist(),
  sb.from('jobs').select('id,title,company,source_id,is_active,status,location,experience_min').eq('id', V187).single(),
])
const j = job.data; console.log(`공고: ${j.source_id} ${j.company} ${j.title} · active=${j.is_active} · status=${j.status} · ${j.location} · exp ${j.experience_min}y+`)
console.log(`기발송 ${recs.length} · 기지원 ${apps.length}`)
const unsubSet = new Set(unsubs.map((r) => r.user_id)), sent = new Set([...recs, ...apps].map((r) => r.user_id)), todaySet = new Set(todays.map((r) => r.user_id))
const weekCnt = {}; for (const r of weeks) weekCnt[r.user_id] = (weekCnt[r.user_id] || 0) + 1
const stale = (p) => (weekCnt[p.id] || 0) >= 3
const seen = new Set(); const base = []
for (const p of pool) { if (!p.email || /likelion/i.test(p.email)) continue; const e = p.email.toLowerCase(); if (seen.has(e) || unsubSet.has(p.id) || bl.has(p) || sent.has(p.id)) continue; seen.add(e); p.__t = txt(p); base.push(p) }
console.log(`\n베이스(이력서·수신거부/블랙리스트/내부/V187 기발송·기지원 제외) ${base.length}명`)

const jv = base.filter((p) => javaRe.test(p.__t))
console.log(`Java/Spring 키워드 ${jv.length} · 그중 Spring 명시 ${jv.filter((p) => springRe.test(p.__t)).length} · Java 직함/직군 ${jv.filter((p) => javaTitle(p) || javaRole(p)).length}`)
const cd = {}; for (const p of jv) cd[city(p)] = (cd[city(p)] || 0) + 1
console.log(`  지역: ${Object.entries(cd).map(([k, v]) => `${k} ${v}`).join(' · ')}`)

const line = (label, arr) => {
  const ok = arr.filter((p) => !todaySet.has(p.id))
  const c = {}; for (const p of ok) c[city(p)] = (c[city(p)] || 0) + 1
  console.log(`  ${label}: ${arr.length}명 → 오늘 발송가능 ${ok.length} (당일 겹침 ${arr.length - ok.length} · 7일 3통+ ${ok.filter(stale).length}) · ${Object.entries(c).map(([k, v]) => `${k} ${v}`).join('/')} · 9/19 이후 가입 ${ok.filter((p) => p.created_at >= SENT_AT).length} · Spring ${ok.filter((p) => springRe.test(p.__t)).length} · React/Vue ${ok.filter((p) => feRe.test(p.__t)).length} · RDBMS ${ok.filter((p) => dbRe.test(p.__t)).length} · Java 직함/직군 ${ok.filter((p) => javaTitle(p) || javaRole(p)).length} · EN ${ok.filter(enOk).length} · KO ${ok.filter(koOk).length} · 공개 ${ok.filter((p) => p.is_resume_public).length}`)
  return ok
}
const yb = (a) => { const d = {}; for (const p of a) { const k = y(p) < 12 ? '<1y' : y(p) < 24 ? '1-2y' : y(p) < 36 ? '2-3y' : y(p) < 60 ? '3-5y' : '5y+'; d[k] = (d[k] || 0) + 1 } return Object.entries(d).map(([k, v]) => `${k} ${v}`).join(' · ') }

const J1 = jv.filter((p) => hcmOk(p) && y(p) >= 36)
const J2 = jv.filter((p) => hcmOk(p) && y(p) >= 24 && y(p) < 36)
const J3 = jv.filter((p) => hcmOk(p) && y(p) >= 12 && y(p) < 24)
const J4 = jv.filter((p) => !hcmOk(p) && y(p) >= 24)
console.log('\n[V187 Java Developer 추가 발송] Java/Spring 키워드')
line('J1 HCMC권/미기재 × 36m+ (JD 3년+ 충족)', J1)
line('J2 HCMC권/미기재 × 24~36m (원 게이트 범위, JD 미달)', J2)
line('J3 HCMC권/미기재 × 12~24m (완화층)', J3)
line('J4 타지역(HN/ĐN/기타) × 24m+ (온사이트 Quận 7 — 참고)', J4)
const core = line('J1+J2 합계(원 게이트 잔여)', [...J1, ...J2])
console.log(`    경력 분포: ${yb(core)}`)
console.log(`    가입 시점: 9/19 이전(당시 신선도 게이트/기타 탈락) ${core.filter((p) => p.created_at < SENT_AT).length} · 9/19 이후 신규 ${core.filter((p) => p.created_at >= SENT_AT).length}`)
const sc = (p) => (springRe.test(p.__t) ? 3 : 0) + (feRe.test(p.__t) ? 2 : 0) + (koOk(p) ? 2 : 0) + (restRe.test(p.__t) ? 1 : 0) + (dbRe.test(p.__t) ? 1 : 0) + (enOk(p) ? 1 : 0) + (javaTitle(p) || javaRole(p) ? 2 : 0)
console.log(`\n[표본] J1+J2 상위 15`); for (const p of [...core].sort((a, b) => sc(b) - sc(a)).slice(0, 15)) console.log(`  [${sc(p)}] ${p.full_name} · ${roles(p).slice(0, 2).join('/')} · ${Math.round(y(p) / 12 * 10) / 10}y · ${city(p)} · 가입 ${p.created_at.slice(0, 10)} · ${expTitles(p).slice(0, 60)}`)
console.log(`\n[표본] J1+J2 하위 10`); for (const p of [...core].sort((a, b) => sc(a) - sc(b)).slice(0, 10)) console.log(`  [${sc(p)}] ${p.full_name} · ${roles(p).slice(0, 2).join('/')} · ${Math.round(y(p) / 12 * 10) / 10}y · ${city(p)} · 가입 ${p.created_at.slice(0, 10)} · ${expTitles(p).slice(0, 60)}`)
const j1sent = recs.length
console.log(`\n참고 — 기발송 118 중 지원 전환: ${apps.length}건 (전환율 참고용, 지원자 일부는 직접 유입)`)
