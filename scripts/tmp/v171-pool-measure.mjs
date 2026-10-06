// V171 Wise Edu — Admin Manager (tiếng Hàn, 꽝7 온사이트) 잔여 발송 풀 실측 (읽기 전용)
// 9/16 발송(cert-hi / kr-major) 이후 미발송 잔여 + 확장 레이어(인증 등급 완화·타지역·한국어 텍스트) 측정
import { sb, fetchAll, fetchBlacklist } from '../outreach/lib.mjs'

const JOB = '5d48e732-d9a8-429b-974b-77e4bb4985a2'
const today = new Date().toISOString().slice(0, 10)
const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString()

const norm = (v) => (Array.isArray(v) ? v.join(' ') : String(v || ''))
const txt = (p) => {
  const exp = Array.isArray(p.experiences) ? p.experiences.map((e) => `${e.title || e.position || ''} ${e.company || ''} ${e.description || ''}`).join(' ') : ''
  return [p.position, p.headline, norm(p.desired_roles), JSON.stringify(p.skills || ''), exp, JSON.stringify(p.resume_summary || ''), p.university, p.major].join(' ').toLowerCase()
}
const roles = (p) => [p.position, ...(p.desired_roles || [])].filter(Boolean)
const inHcmc = (p) => /(h[ồo]\s*ch[íi]\s*minh|hcm|sài gòn|sai gon|saigon|thủ đức|thu duc|bình dương|binh duong|đồng nai|dong nai|biên hòa|bien hoa|long an|호찌민|호치민)/i.test(String(p.location || ''))
const noLoc = (p) => !String(p.location || '').trim()
const geoOk = (p) => inHcmc(p) || noLoc(p)
const cert = (p) => String(p.korean_cert || '').toLowerCase()
const certHi = (p) => /(topik\s*(ii\s*)?(level\s*)?[56]|native|고급|advanced)/i.test(cert(p))
const certMid = (p) => /(topik\s*(ii\s*)?(level\s*)?4|topik\s*4|intermediate|trung cấp|중급|business)/i.test(cert(p))
const certLow = (p) => !!cert(p).trim() && !certHi(p) && !certMid(p)
const krMajor = (p) => /(hàn quốc học|ngôn ngữ hàn|korean (studies|language)|한국어|한국학)/i.test(`${p.major || ''} ${p.university || ''}`)
const krTextStrong = (p) => /(topik\s*[56]|tiếng hàn (thành thạo|lưu loát)|fluent (in )?korean)/i.test(p.__t)
const krTextAny = (p) => /(korean|tiếng hàn|topik|한국어|hàn quốc)/i.test(p.__t)
const adminSig = (p) => roles(p).some((r) => /(non-it|operations|hr|admin|other)/i.test(String(r))) || /(admin|hành chính|văn phòng|trợ lý|assistant|thư ký|secretary|operations|vận hành)/i.test(p.__t)
const eduSig = (p) => /(giáo dục|education|trung tâm|teacher|giáo viên|gia sư|tutor|học sinh|trường)/i.test(p.__t)
const excelSig = (p) => /excel/i.test(p.__t)
const age40ok = (p) => !p.graduation_year || p.graduation_year >= 2008 // 4년제 졸업 2008+ ≈ 40세 이하 근사
const oldGate = (p) => geoOk(p) && (certHi(p) || certMid(p) || krMajor(p) || krTextStrong(p))

const [pool, unsubs, recs, apps, todays, weeks, bl, job] = await Promise.all([
  fetchAll(() => sb.from('user_profiles')
    .select('id,email,full_name,position,desired_roles,yoe_months,location,english_cert,korean_cert,is_resume_public,skills,resume_summary,headline,experiences,university,major,graduation_year,created_at')
    .not('email', 'is', null).not('resume_url', 'is', null).order('created_at', { ascending: false })),
  fetchAll(() => sb.from('events').select('user_id').eq('event', 'coldmail_unsub').not('user_id', 'is', null).order('id')),
  fetchAll(() => sb.from('job_recommendations').select('user_id,created_at,status').eq('job_id', JOB).order('id')),
  fetchAll(() => sb.from('job_applications').select('user_id,created_at,status').eq('job_id', JOB).order('id')),
  fetchAll(() => sb.from('job_recommendations').select('user_id').gte('created_at', today).order('id')),
  fetchAll(() => sb.from('job_recommendations').select('user_id').gte('created_at', weekAgo).order('id')),
  fetchBlacklist(),
  sb.from('jobs').select('id,title,company,location,is_active,source_id,created_at').eq('id', JOB).single(),
])
console.log('공고:', job.data?.title, '·', job.data?.company, '· active=', job.data?.is_active, '· source_id=', job.data?.source_id)
const unsubSet = new Set(unsubs.map((r) => r.user_id))
const recSet = new Set(recs.map((r) => r.user_id))
const appSet = new Set(apps.map((r) => r.user_id))
const todaySet = new Set(todays.map((r) => r.user_id))
const weekCnt = {}
for (const r of weeks) weekCnt[r.user_id] = (weekCnt[r.user_id] || 0) + 1
const stale = (p) => (weekCnt[p.id] || 0) >= 3

const recDays = {}
for (const r of recs) { const d = r.created_at.slice(0, 10); recDays[d] = (recDays[d] || 0) + 1 }
console.log(`\n이 공고 recommend 발송 이력: 총 ${recs.length}통 — ${Object.entries(recDays).sort().map(([d, n]) => `${d}:${n}`).join(' · ')}`)
console.log(`이 공고 지원: ${apps.length}건 — ${apps.map((a) => `${a.created_at.slice(0, 10)}(${a.status || '-'})`).join(', ') || '없음'}`)
const recApplied = apps.filter((a) => recSet.has(a.user_id)).length
console.log(`  └ 지원자 중 recommend 수신자: ${recApplied}명`)

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
const fresh = base.filter((p) => !recSet.has(p.id) && !appSet.has(p.id))
console.log(`\n베이스 ${base.length}명 · 기발송/기지원 제외 후 ${fresh.length}명`)

const layer = (label, arr) => {
  const t = arr.filter((p) => todaySet.has(p.id)).length
  const s = arr.filter(stale).length
  const ok = arr.filter((p) => !todaySet.has(p.id) && !stale(p))
  console.log(`  ${label}: ${arr.length}명 (당일 겹침 ${t} · 7일 3통+ ${s} → 오늘 발송가능 ${ok.length})`)
  return ok
}

console.log(`\n[0] 9/16 게이트 그대로(HCMC권/미기재 × cert-hi|cert-mid|한국어전공|유창텍스트) 잔여 — 9/16 이후 신규 가입자`)
const oldRemain = layer('기존 게이트 잔여', fresh.filter(oldGate))
console.log(`     └ cert-hi ${oldRemain.filter(certHi).length} · cert-mid ${oldRemain.filter((p) => !certHi(p) && certMid(p)).length} · 전공/텍스트만 ${oldRemain.filter((p) => !certHi(p) && !certMid(p)).length}`)

console.log(`\n[1] 확장 레이어 (기존 게이트 외, 서로 배타 아님)`)
layer('a. HCMC권/미기재 × 한국어 인증 하급(TOPIK 1~3/초급 등 기입)', fresh.filter((p) => geoOk(p) && certLow(p) && !oldGate(p)))
layer('b. HCMC권/미기재 × 인증 無 × 한국어 텍스트 언급(any)', fresh.filter((p) => geoOk(p) && !cert(p).trim() && krTextAny(p) && !oldGate(p)))
layer('c. HCMC권/미기재 × 인증 無 × Admin/운영/교육 시그널 (한국어 無)', fresh.filter((p) => geoOk(p) && !cert(p).trim() && !krTextAny(p) && (adminSig(p) || eduSig(p))))
layer('d. 타지역(하노이/다낭 등) × cert-hi|cert-mid|한국어전공 (이주 필요)', fresh.filter((p) => !geoOk(p) && (certHi(p) || certMid(p) || krMajor(p) || krTextStrong(p))))
console.log(`     └ d 중 cert-hi ${fresh.filter((p) => !geoOk(p) && certHi(p)).length}`)

console.log(`\n[2] 참고 — 기발송자 중 공고 미지원 ${recs.filter((r) => !appSet.has(r.user_id)).length}명 (팔로업 후보)`)

const score = (p) => (certHi(p) ? 4 : certMid(p) ? 2 : certLow(p) ? 1 : 0) + (krMajor(p) ? 2 : 0) + (krTextStrong(p) ? 1 : 0) + (adminSig(p) ? 1 : 0) + (eduSig(p) ? 1 : 0) + (excelSig(p) ? 1 : 0) + (inHcmc(p) ? 1 : 0) + (age40ok(p) ? 0 : -3)
const show = (title, arr, n = 25) => {
  console.log(`\n${title} 상위 ${Math.min(n, arr.length)}명`)
  for (const p of [...arr].sort((a, b) => score(b) - score(a)).slice(0, n))
    console.log(`  [${score(p)}] ${p.full_name} <${p.email}> · ${roles(p).join('/') || '?'} · ${Math.round((p.yoe_months ?? 0) / 12 * 10) / 10}y · KO:${p.korean_cert || '-'} · 전공:${p.major || '?'} · 졸:${p.graduation_year || '?'} · ${p.location || '위치?'} · 가입:${p.created_at.slice(0, 10)}${stale(p) ? ' · ⚠신선도' : ''}${todaySet.has(p.id) ? ' · ⚠당일' : ''}`)
}
show('[3] 기존 게이트 잔여', fresh.filter(oldGate), 40)
show('[4] 확장 a (하급 인증)', fresh.filter((p) => geoOk(p) && certLow(p) && !oldGate(p)), 20)
show('[5] 확장 b (인증無·한국어 텍스트)', fresh.filter((p) => geoOk(p) && !cert(p).trim() && krTextAny(p) && !oldGate(p)), 20)
show('[6] 확장 d (타지역 상·중급)', fresh.filter((p) => !geoOk(p) && (certHi(p) || certMid(p) || krMajor(p) || krTextStrong(p))), 15)
