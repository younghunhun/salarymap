// AUTONSI V224 HR & Admin Specialist (10/12 Len 등록) 발송 풀 실측 (읽기 전용)
// JD: HCMC 온사이트 · 경영/외국어 등 전공 학사 · HR/Admin 1~5년 · Business English or Korean · 노동법/Work Permit·TRC·비자 지식
// 지역 게이트 = HCMC권 명시 or 미기재 · 경력 12m+ 코어 · HR/Admin 시그널 = 직군 HR or 경력 직함 or (전공 경영/외국어 × 직군 Admin)
import { sb, fetchAll, fetchBlacklist } from '../outreach/lib.mjs'

const V224 = '8c1f5d5c-ca2d-4d2b-829a-82bd335075d4'
const today = new Date().toISOString().slice(0, 10)
const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString()

const expTitles = (p) => (Array.isArray(p.experiences) ? p.experiences.map((e) => `${e.title || e.position || ''}`).join(' | ') : '')
const exp = (p) => (Array.isArray(p.experiences) ? p.experiences.map((e) => `${e.title || e.position || ''} ${e.company || ''} ${e.description || ''}`).join(' ') : '')
const txt = (p) => (JSON.stringify(p.skills || '') + ' ' + String(p.position || '') + ' ' + String(p.headline || '') + ' ' + JSON.stringify(p.desired_roles || '') + ' ' + JSON.stringify(p.resume_summary || '') + ' ' + exp(p) + ' ' + String(p.major || '')).toLowerCase()
const roles = (p) => [p.position, ...(p.desired_roles || [])].filter(Boolean)
const y = (p) => p.yoe_months ?? 0
const hcmOk = (p) => { const l = String(p.location || ''); return !l.trim() || /(h[ồo]\s*ch[íi]\s*minh|hcm|sài gòn|sai gon|saigon|thủ đức|thu duc|bình thạnh|bình dương|binh duong|đồng nai|dong nai|biên hòa|long an|호치민|호찌민|hóc môn|gò vấp|tân bình|tân phú|bình tân|phú nhuận|củ chi|nhà bè|bình chánh|quận \d|district \d|tphcm|tp\.?\s*hcm)/i.test(l) }
const enOk = (p) => !!String(p.english_cert || '').trim() && !/^(none|no|없음|-|n\/a)$/i.test(String(p.english_cert).trim())
const koOk = (p) => (!!String(p.korean_cert || '').trim() && !/^(none|no|없음|-|n\/a)$/i.test(String(p.korean_cert).trim())) || /(korean|tiếng hàn|topik|한국어)/i.test(p.__t)

const hrRe = /(\bhr\b|human resource|nhân sự|nhan su|hành chính|hanh chinh|\badmin(istrat\w*)?\b|c&b|compensation|payroll|tuyển dụng|tuyen dung|recruit|talent acquisition|office manager|văn phòng|van phong|general affairs|\bga\b|tổng vụ|총무|인사)/i
const hrTitle = (p) => hrRe.test(expTitles(p))
const hrRole = (p) => roles(p).some((r) => /^(hr|human|admin)/i.test(r)) || hrRe.test(roles(p).join(' '))
const hrText = (p) => hrRe.test(p.__t)
const majorOk = (p) => /(business admin|quản trị kinh doanh|quan tri kinh doanh|ngôn ngữ|ngon ngu|language|english|korean|tiếng hàn|hàn quốc|nhân sự|human resource|luật|\blaw\b|kinh tế|economic|quản trị nhân lực)/i.test(String(p.major || ''))
const expatRe = /(work permit|giấy phép lao động|temporary residence|thẻ tạm trú|\btrc\b|visa|expat|bhxh|bảo hiểm xã hội|social insurance|labor law|luật lao động|onboarding|hóa đơn|vat)/i
const kcoRe = /(korea|hàn quốc|han quoc|한국|samsung|lg\b|hyundai|lotte|cj\b|sk\b|posco)/i

const [pool, unsubs, recs, apps, todays, weeks, bl, job] = await Promise.all([
  fetchAll(() => sb.from('user_profiles').select('id,email,full_name,position,desired_roles,yoe_months,location,english_cert,korean_cert,is_resume_public,skills,resume_summary,headline,experiences,major,university,created_at').not('email', 'is', null).not('resume_url', 'is', null).order('created_at', { ascending: false })),
  fetchAll(() => sb.from('events').select('user_id').eq('event', 'coldmail_unsub').not('user_id', 'is', null).order('id')),
  fetchAll(() => sb.from('job_recommendations').select('user_id').eq('job_id', V224).order('id')),
  fetchAll(() => sb.from('job_applications').select('user_id').eq('job_id', V224).order('id')),
  fetchAll(() => sb.from('job_recommendations').select('user_id').gte('created_at', today).order('id')),
  fetchAll(() => sb.from('job_recommendations').select('user_id').gte('created_at', weekAgo).order('id')),
  fetchBlacklist(),
  sb.from('jobs').select('id,title,company,source_id,is_active,status,location,type,experience_min,experience_max').eq('id', V224).single(),
])
const j = job.data; console.log(`공고: ${j.source_id} ${j.company} ${j.title} · active=${j.is_active} · status=${j.status} · ${j.location} · ${j.type} · exp ${j.experience_min}-${j.experience_max}y`)
console.log(`기발송 ${recs.length} · 기지원 ${apps.length}`)
const unsubSet = new Set(unsubs.map((r) => r.user_id)), sent = new Set([...recs, ...apps].map((r) => r.user_id)), todaySet = new Set(todays.map((r) => r.user_id))
const weekCnt = {}; for (const r of weeks) weekCnt[r.user_id] = (weekCnt[r.user_id] || 0) + 1
const stale = (p) => (weekCnt[p.id] || 0) >= 3
const seen = new Set(); const base = []
for (const p of pool) { if (!p.email || /likelion/i.test(p.email)) continue; const e = p.email.toLowerCase(); if (seen.has(e) || unsubSet.has(p.id) || bl.has(p) || sent.has(p.id)) continue; seen.add(e); p.__t = txt(p); base.push(p) }
console.log(`\n베이스(이력서·수신거부/블랙리스트/내부/기발송 제외) ${base.length}명`)

const anyHr = (p) => hrRole(p) || hrTitle(p)
console.log(`HR/Admin 시그널(직군 or 경력 직함) 전체 ${base.filter(anyHr).length} · 직군 ${base.filter(hrRole).length} · 경력직함 ${base.filter(hrTitle).length} · 텍스트만 ${base.filter((p) => !anyHr(p) && hrText(p)).length}`)
console.log(`  지역: HCMC/미기재 ${base.filter((p) => anyHr(p) && hcmOk(p)).length} · 타지역 ${base.filter((p) => anyHr(p) && !hcmOk(p)).length}`)

const line = (label, arr) => {
  const ok = arr.filter((p) => !todaySet.has(p.id))
  console.log(`  ${label}: ${arr.length}명 → 오늘 발송가능 ${ok.length} (당일 겹침 ${arr.length - ok.length} · 7일 3통+ ${ok.filter(stale).length}) · 미기재지역 ${ok.filter((p) => !String(p.location || '').trim()).length} · Expat/노동법/BHXH 키워드 ${ok.filter((p) => expatRe.test(p.__t)).length} · 한국계 경력 ${ok.filter((p) => kcoRe.test(exp(p))).length} · EN ${ok.filter(enOk).length} · KO ${ok.filter(koOk).length} · EN|KO ${ok.filter((p) => enOk(p) || koOk(p)).length} · 공개 ${ok.filter((p) => p.is_resume_public).length}`)
  return ok
}
const yb = (a) => { const d = {}; for (const p of a) { const k = y(p) < 12 ? '<1y' : y(p) < 36 ? '1-3y' : y(p) < 60 ? '3-5y' : y(p) < 96 ? '5-8y' : '8y+'; d[k] = (d[k] || 0) + 1 } return Object.entries(d).map(([k, v]) => `${k} ${v}`).join(' · ') }

const core = base.filter((p) => anyHr(p) && hcmOk(p))
const H1 = core.filter((p) => hrTitle(p) && y(p) >= 12 && y(p) <= 72)
const H2 = core.filter((p) => !hrTitle(p) && hrRole(p) && y(p) >= 12 && y(p) <= 72)
const H3 = core.filter((p) => y(p) > 72)
const H4 = core.filter((p) => y(p) < 12)
const H5 = base.filter((p) => !anyHr(p) && hcmOk(p) && hrText(p) && majorOk(p) && y(p) >= 12 && y(p) <= 72)
console.log('\n[V224 HR & Admin Specialist] HCMC권/미기재 × HR/Admin 시그널')
line('H1 HR/Admin 경력 직함 × 1~6y (JD 코어)', H1)
line('H2 직군만 HR/Admin × 1~6y (경력 직함은 타직무)', H2)
line('H3 HR/Admin 시그널 × 6y 초과 (오버스펙)', H3)
line('H4 HR/Admin 시그널 × 12m 미만 (신입)', H4)
line('H5 텍스트 HR 키워드 × 전공 경영/외국어/법 × 1~6y (확장층)', H5)
const send = line('H1+H2 합계(코어)', [...H1, ...H2])
console.log(`    경력 분포: ${yb(send)}`)
line('H1+H2+H5 합계(확장 포함)', [...H1, ...H2, ...H5])
line('H1+H2+H4 합계(신입 포함)', [...H1, ...H2, ...H4])
console.log(`    참고 — 타지역 × HR직함 × 1~6y: ${base.filter((p) => !hcmOk(p) && hrTitle(p) && y(p) >= 12 && y(p) <= 72).length}명`)
const vocab = {}; for (const p of send) for (const r of roles(p).slice(0, 1)) vocab[r] = (vocab[r] || 0) + 1
console.log('    코어 position 분포:', Object.entries(vocab).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([k, v]) => `${k}(${v})`).join(' · '))
const sc = (p) => (hrTitle(p) ? 3 : 0) + (expatRe.test(p.__t) ? 2 : 0) + (kcoRe.test(exp(p)) ? 1 : 0) + (majorOk(p) ? 1 : 0) + (enOk(p) ? 1 : 0) + (koOk(p) ? 2 : 0)
console.log(`\n[표본] 상위 15`); for (const p of [...send].sort((a, b) => sc(b) - sc(a)).slice(0, 15)) console.log(`  [${sc(p)}] ${p.full_name} · ${roles(p).slice(0, 2).join('/')} · ${Math.round(y(p) / 12 * 10) / 10}y · ${p.location || '미기재'} · ${p.major || ''} · ${expTitles(p).slice(0, 70)}${enOk(p) ? ' · EN' : ''}${koOk(p) ? ' · KO' : ''}`)
console.log(`\n[표본] 하위 10`); for (const p of [...send].sort((a, b) => sc(a) - sc(b)).slice(0, 10)) console.log(`  [${sc(p)}] ${p.full_name} · ${roles(p).slice(0, 2).join('/')} · ${Math.round(y(p) / 12 * 10) / 10}y · ${p.location || '미기재'} · ${p.major || ''} · ${expTitles(p).slice(0, 70)}`)

// IT 직군 노이즈(System/Web Admin 등 'admin' 매치) 점검
const itRe = /^(backend|frontend|fullstack|mobile|devops|data|qa|security|ai|game|embedded|cloud|network|system)/i
const noise = send.filter((p) => roles(p).length && roles(p).every((r) => itRe.test(r)))
console.log(`\nIT 직군만 가진 코어(노이즈 후보) ${noise.length}명 → 제외 시 코어 ${send.length - noise.length}명`)
for (const p of noise) console.log(`  ${p.full_name} · ${roles(p).join('/')} · ${expTitles(p).slice(0, 80)}`)
