// V187 POSCO DX VIETNAM — Java Developer(D7 HCMC 온사이트) 발송 풀 실측 (읽기 전용)
// JD 하드 요건: Java+Spring 2y+ · FE(React/Vue) · RDBMS · 영어 or 한국어 기본 소통
// 풀봇은 english_cert(인증) 하드게이트 + 'java' 키워드 범용 제외로 과소/과대가 섞여 여기서 직접 잰다.
import { sb, fetchAll } from '/Users/wiseungju/salarymap/scripts/outreach/lib.mjs'

const JOB = 'd2cd358f-69c9-4a9e-8225-40f88f92349f'
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

// \bjava\b 는 javascript 에 걸리지 않는다(뒤 문자가 단어문자라 경계 불성립)
const javaRe = /\bjava\b|\bjava(?:\s|,|\/|$)|spring ?boot|spring framework|\bspring\b|\bjsp\b|hibernate|mybatis/i
const springRe = /spring ?boot|spring framework|\bspring\b|mybatis|hibernate/i
const feRe = /\breact\b|react\.?js|\bvue\b|vue\.?js|angular/i
const dbRe = /mysql|postgres|oracle|mssql|sql server|mariadb/i
const restRe = /rest ?api|restful|spring mvc|microservice/i
const koRe = /(korean|tiếng hàn|topik|한국어)/i
const enRe = /(english|tiếng anh|ielts|toefl|toeic)/i
const koSig = (p) => !!p.korean_cert || koRe.test(p.__t)
const enSig = (p) => !!p.english_cert || enRe.test(p.__t)
const inHcmc = (p) => /(h[ồo]\s*ch[íi]\s*minh|hcm|sài gòn|sai gon|thủ đức|thu duc|bình dương|binh duong|đồng nai|dong nai|biên hòa|bien hoa|long an)/i.test(String(p.location || ''))
const noLoc = (p) => !String(p.location || '').trim()
const devRole = (p) => roles(p).some((r) => /backend|fullstack|full stack|software|web|developer|engineer/i.test(String(r)))

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
const java = fresh.filter((p) => javaRe.test(p.__t))
console.log(`\nJava/Spring 시그널 보유(경력·지역 무관): ${java.length}명 (그중 Spring 계열 명시 ${java.filter((p) => springRe.test(p.__t)).length})`)

const layer = (label, arr) => {
  const t = arr.filter((p) => todaySet.has(p.id)).length
  console.log(`  ${label}: ${arr.length}명 (당일 겹침 ${t} → 오늘 발송가능 ${arr.length - t})`)
  return arr
}

// ── 1) 코어: Java/Spring × 2y+ × HCMC권/미기재 × 영어or한국어 시그널
console.log(`\n[1] 코어 — Java/Spring × 2y+ × HCMC권/미기재`)
const j2 = java.filter((p) => y(p) >= 24)
layer('Java 2y+ 전국', j2)
const core = j2.filter((p) => inHcmc(p) || noLoc(p))
layer('  └ HCMC권/미기재', core)
const coreLang = core.filter((p) => enSig(p) || koSig(p))
layer('    └ 영어/한국어 시그널 有 (JD 하드요건)', coreLang)
console.log(`      구성 — Spring 명시 ${coreLang.filter((p) => springRe.test(p.__t)).length} · FE(React/Vue) ${coreLang.filter((p) => feRe.test(p.__t)).length} · RDBMS ${coreLang.filter((p) => dbRe.test(p.__t)).length} · REST ${coreLang.filter((p) => restRe.test(p.__t)).length}`)
console.log(`      영어인증 ${coreLang.filter((p) => p.english_cert).length} · 한국어시그널 ${coreLang.filter(koSig).length} · 위치미기재 ${coreLang.filter(noLoc).length}`)
const yb = (m) => (m < 36 ? '2-3y' : m < 60 ? '3-5y' : m < 96 ? '5-8y' : '8y+')
const d = {}
for (const p of coreLang) d[yb(y(p))] = (d[yb(y(p))] || 0) + 1
console.log(`      경력 분포 — ${Object.entries(d).sort().map(([k, v]) => `${k} ${v}`).join(' · ')}`)

// ── 2) 확장 레이어
console.log(`\n[2] 확장 후보(코어 외)`)
const coreSet = new Set(coreLang.map((p) => p.id))
layer('a. Java 2y+ HCMC권/미기재인데 언어 시그널 없음', core.filter((p) => !coreSet.has(p.id)))
layer('b. Java 2y+ 타지역(하노이/다낭 등 — 이주 필요)', j2.filter((p) => !inHcmc(p) && !noLoc(p)))
layer('c. Java 시그널 × 경력 2y 미만 (HCMC권/미기재)', java.filter((p) => y(p) < 24 && (inHcmc(p) || noLoc(p))))
const nonJava = fresh.filter((p) => !javaRe.test(p.__t) && devRole(p) && y(p) >= 24 && (inHcmc(p) || noLoc(p)) && (feRe.test(p.__t) || dbRe.test(p.__t) || restRe.test(p.__t)))
layer('d. Java 언급 없는 백엔드/웹 2y+ HCMC권 (전환 후보)', nonJava)

// ── 3) 코어 미리보기
const score = (p) => (springRe.test(p.__t) ? 3 : 0) + (feRe.test(p.__t) ? 2 : 0) + (dbRe.test(p.__t) ? 1 : 0) + (restRe.test(p.__t) ? 1 : 0) + (koSig(p) ? 2 : 0) + (p.english_cert ? 1 : 0)
const top = [...coreLang].sort((a, b) => score(b) - score(a)).slice(0, 20)
console.log(`\n[3] 코어 상위 ${top.length}명 미리보기`)
for (const p of top)
  console.log(`  [${score(p)}] ${p.full_name} <${p.email}> · ${p.position || '?'} · ${Math.round(y(p) / 12 * 10) / 10}y · ${p.location || '위치?'}${koSig(p) ? ' · KO' : ''}${p.english_cert ? ' · EN인증' : ''}`)
