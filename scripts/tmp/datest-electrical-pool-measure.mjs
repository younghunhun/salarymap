// DAT EST Electrical Technician(V216) 발송 풀 실측 (읽기 전용)
// JD: 남성 · 전기 실무 2y+ · 공단 공장 전기안전관리 · 운전 가능 · 기초 영어 · HCMC 온사이트
import { sb, fetchAll } from '../outreach/lib.mjs'

const JOB = 'd631f9b9-4b40-4744-a434-0690e0cefba7'
const today = new Date().toISOString().slice(0, 10)

const norm = (v) => (Array.isArray(v) ? v.join(' ') : String(v || ''))
const txt = (p) => {
  const exp = Array.isArray(p.experiences) ? p.experiences.map((e) => `${e.title || e.position || ''} ${e.company || ''} ${e.description || ''}`).join(' ') : ''
  return [p.position, p.headline, norm(p.desired_roles), JSON.stringify(p.skills || ''), exp, JSON.stringify(p.resume_summary || ''), p.major].join(' ').toLowerCase()
}
const roles = (p) => [p.position, ...(p.desired_roles || [])].filter(Boolean)
const y = (p) => p.yoe_months ?? 0
// 전기 직접 시그널 (베트남어 "điện"은 điện thoại/điện tử/điện lạnh 등 오탐 → 전기 맥락 어휘로 한정)
const elecRe = /(electrical|electrician|electric power|power system|kỹ sư điện|kĩ sư điện|điện công nghiệp|hệ thống điện|an toàn điện|thiết bị điện|điện – ?điện tử|điện-điện tử|điện tử công nghiệp|kỹ thuật điện|bảo trì điện|công nhân điện|thợ điện|low voltage|medium voltage|high voltage|switchgear|transformer|máy biến áp|tủ điện|plc\b|scada|m&e\b|mep\b|electrical engineer)/i
const maintRe = /(maintenance|bảo trì|bảo dưỡng|technician|kỹ thuật viên|facility|utility|nhà máy|factory|plant|industrial park|khu công nghiệp|kcn\b)/i
const safetyRe = /(electrical safety|an toàn điện|safety|an toàn lao động|hse\b|ehs\b)/i
const driveRe = /(driver'?s? licen|driving licen|bằng lái|giấy phép lái xe|bằng b1|bằng b2|hạng b|lái xe ô tô|can drive)/i
const enRe = /(english|tiếng anh|ielts|toefl|toeic)/i
const enSig = (p) => !!p.english_cert || enRe.test(p.__t)
const maleRe = /(^|\b)(male|nam|anh|mr\.?)(\b|$)/i
const inHcmc = (p) => /(h[ồo]\s*ch[íi]\s*minh|hcm|sài gòn|sai gon|saigon|thủ đức|thu duc|bình thạnh|bình dương|binh duong|đồng nai|dong nai|biên hòa|bien hoa|long an|bà rịa|vũng tàu|tây ninh)/i.test(String(p.location || ''))
const noLoc = (p) => !String(p.location || '').trim()
const isMaint = (p) => roles(p).some((r) => /(maintenance|electrical|engineer|technician|mechanical|m&e|production|qc|manufactur)/i.test(String(r)))

const cols = 'id,email,full_name,position,desired_roles,yoe_months,location,english_cert,korean_cert,skills,resume_summary,headline,experiences,university,major,graduation_year,created_at,gender'
let pool
try {
  pool = await fetchAll(() => sb.from('user_profiles').select(cols).not('email', 'is', null).not('resume_url', 'is', null).order('created_at', { ascending: false }))
} catch (e) {
  console.log('(gender 컬럼 없음 → 제외하고 재조회)')
  pool = await fetchAll(() => sb.from('user_profiles').select(cols.replace(',gender', '')).not('email', 'is', null).not('resume_url', 'is', null).order('created_at', { ascending: false }))
}
const [unsubs, recs, apps, todays] = await Promise.all([
  fetchAll(() => sb.from('events').select('user_id').eq('event', 'coldmail_unsub').not('user_id', 'is', null).order('id')),
  fetchAll(() => sb.from('job_recommendations').select('user_id').eq('job_id', JOB).order('id')),
  fetchAll(() => sb.from('job_applications').select('user_id').eq('job_id', JOB).order('id')),
  fetchAll(() => sb.from('job_recommendations').select('user_id').gte('created_at', today).order('id')),
])
const unsubSet = new Set(unsubs.map((r) => r.user_id))
const sent = new Set([...recs.map((r) => r.user_id), ...apps.map((r) => r.user_id)])
const todaySet = new Set(todays.map((r) => r.user_id))

const seen = new Set(); const base = []
for (const p of pool) {
  if (!p.email || /likelion/i.test(p.email)) continue
  const e = p.email.toLowerCase()
  if (seen.has(e) || unsubSet.has(p.id)) continue
  seen.add(e); p.__t = txt(p); base.push(p)
}
console.log(`베이스: ${base.length}명 · 이 공고 기발송/기지원 ${sent.size} · 당일 recommend 기수신 ${todaySet.size} · gender 컬럼 ${'gender' in (base[0] || {}) ? '有' : '無'}`)
const fresh = base.filter((p) => !sent.has(p.id))
const layer = (label, arr) => { const t = arr.filter((p) => todaySet.has(p.id)).length; console.log(`  ${label}: ${arr.length}명${t ? ` (당일 겹침 ${t})` : ''}`); return arr }

const roleDist = {}
for (const p of fresh) for (const r of roles(p)) roleDist[r] = (roleDist[r] || 0) + 1
console.log(`\n[0] 직군값 중 전기/설비 유관 후보: ${Object.entries(roleDist).filter(([k]) => /(maint|electr|engineer|technic|mechan|m&e|production|manufact|qc|facility)/i.test(k)).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(' · ') || '없음'}`)

console.log(`\n[1] 전기 직접 시그널(텍스트) 전국`)
const elec = layer('전기 시그널 전국(경력 무관)', fresh.filter((p) => elecRe.test(p.__t)))
layer('  └ 2y+', elec.filter((p) => y(p) >= 24))
const core = layer('    └ HCMC권/남부/미기재', elec.filter((p) => y(p) >= 24 && (inHcmc(p) || noLoc(p))))
console.log(`        구성 — 설비/공장 텍스트 ${core.filter((p) => maintRe.test(p.__t)).length} · 안전 ${core.filter((p) => safetyRe.test(p.__t)).length} · 운전면허 텍스트 ${core.filter((p) => driveRe.test(p.__t)).length} · 영어 시그널 ${core.filter(enSig).length} · 위치미기재 ${core.filter(noLoc).length}`)
if ('gender' in (base[0] || {})) {
  const g = {}; for (const p of core) g[p.gender || 'null'] = (g[p.gender || 'null'] || 0) + 1
  console.log(`        gender 분포 — ${Object.entries(g).map(([k, v]) => `${k} ${v}`).join(' · ')}`)
}
const pd = {}; for (const p of core) pd[p.position || '?'] = (pd[p.position || '?'] || 0) + 1
console.log(`        position 분포 — ${Object.entries(pd).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([k, v]) => `${k} ${v}`).join(' · ')}`)
const md = {}; for (const p of core) md[(p.major || '?').slice(0, 30)] = (md[(p.major || '?').slice(0, 30)] || 0) + 1
console.log(`        전공 상위 — ${Object.entries(md).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, v]) => `${k} ${v}`).join(' · ')}`)

console.log(`\n[2] 확장`)
layer('a. 전기 시그널 × 2y 미만 × HCMC권', elec.filter((p) => y(p) < 24 && (inHcmc(p) || noLoc(p))))
layer('b. 전기 시그널 × 2y+ × 타지역', elec.filter((p) => y(p) >= 24 && !inHcmc(p) && !noLoc(p)))
layer('c. 전기 무언급 설비/공장 유지보수 텍스트 × 2y+ × HCMC권', fresh.filter((p) => !elecRe.test(p.__t) && maintRe.test(p.__t) && isMaint(p) && y(p) >= 24 && (inHcmc(p) || noLoc(p))))

const score = (p) => (elecRe.test(p.__t) ? 2 : 0) + (maintRe.test(p.__t) ? 1 : 0) + (safetyRe.test(p.__t) ? 2 : 0) + (driveRe.test(p.__t) ? 1 : 0) + (enSig(p) ? 1 : 0) + (inHcmc(p) ? 1 : 0)
console.log(`\n[3] 코어 전원(${core.length}명)`)
for (const p of [...core].sort((a, b) => score(b) - score(a)))
  console.log(`  [${score(p)}] ${p.full_name} <${p.email}> · ${p.position || '?'} · ${Math.round(y(p) / 12 * 10) / 10}y · ${String(p.location || '위치?').slice(0, 24)} · 전공=${String(p.major || '-').slice(0, 24)}${p.gender ? ` · ${p.gender}` : ''}${safetyRe.test(p.__t) ? ' · 안전' : ''}${driveRe.test(p.__t) ? ' · 면허' : ''}${enSig(p) ? ' · EN' : ''}`)
