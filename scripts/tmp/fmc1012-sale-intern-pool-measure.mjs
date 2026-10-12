// First Marketing Company V222 Thực tập sinh Sale (10/12 Len 등록) 발송 풀 실측 (읽기 전용)
// JD: HCMC 온사이트(19N Nguyễn Hữu Cảnh) · 인턴 3개월(풀/파트) · 3~4학년 or 신졸 · 경영/마케팅/관광/외국어 전공 · CS/세일즈 경험(알바·인턴·CTV) 우대 · 영어 기본 · 한국어 큰 우대 · Word/Excel
// 지역 게이트 = HCMC권 명시 or 미기재 · 경력 게이트 = 인턴 공고라 24m 미만(12m 미만 코어, 12~24m 확장)
import { sb, fetchAll, fetchBlacklist } from '../outreach/lib.mjs'

const V222 = '34e07af1-38c9-4621-9306-cc977135fbfc'
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

const salesRole = (p) => roles(p).some((r) => /(sales|business dev|sales admin|merchandiser|telesale)/i.test(String(r)))
const adjRole = (p) => roles(p).some((r) => /(marketing|non-it|interpreter|operations|hr|other|customer|content|pr\b)/i.test(String(r)))
const csSalesRe = /(sale\b|sales|bán hàng|ban hang|telesale|chăm sóc khách hàng|cham soc khach hang|cskh|customer service|customer care|customer support|tư vấn|tu van|consultant|account executive|business development|kinh doanh|cộng tác viên kinh doanh|receptionist|lễ tân|le tan)/i
const csSalesTitle = (p) => csSalesRe.test(expTitles(p))
const csSalesText = (p) => csSalesRe.test(p.__t)
const majorRe = /(kinh doanh|business|quản trị|quan tri|marketing|du lịch|du lich|tourism|hospitality|ngoại ngữ|ngoai ngu|ngôn ngữ|ngon ngu|language|english|tiếng anh|tiếng hàn|korean|hàn quốc|han quoc|commerce|thương mại|thuong mai|economics|kinh tế|kinh te)/i
const majorOk = (p) => majorRe.test(String(p.major || ''))
const student = (p) => (p.graduation_year && Number(p.graduation_year) >= 2026) || /(sinh viên|student|năm 3|năm 4|thực tập|intern)/i.test(String(p.headline || '') + ' ' + String(p.position || ''))
const office = (p) => /(excel|word|google sheets|crm|microsoft office|tin học văn phòng)/i.test(p.__t)

const [pool, unsubs, recs, apps, todays, weeks, bl] = await Promise.all([
  fetchAll(() => sb.from('user_profiles').select('id,email,full_name,position,desired_roles,yoe_months,location,english_cert,korean_cert,is_resume_public,skills,resume_summary,headline,experiences,major,university,graduation_year,created_at').not('email', 'is', null).not('resume_url', 'is', null).order('created_at', { ascending: false })),
  fetchAll(() => sb.from('events').select('user_id').eq('event', 'coldmail_unsub').not('user_id', 'is', null).order('id')),
  fetchAll(() => sb.from('job_recommendations').select('user_id').eq('job_id', V222).order('id')),
  fetchAll(() => sb.from('job_applications').select('user_id').eq('job_id', V222).order('id')),
  fetchAll(() => sb.from('job_recommendations').select('user_id').gte('created_at', today).order('id')),
  fetchAll(() => sb.from('job_recommendations').select('user_id').gte('created_at', weekAgo).order('id')),
  fetchBlacklist(),
])
console.log(`기발송 ${recs.length} · 기지원 ${apps.length}`)
const unsubSet = new Set(unsubs.map((r) => r.user_id)), sent = new Set([...recs, ...apps].map((r) => r.user_id)), todaySet = new Set(todays.map((r) => r.user_id))
const weekCnt = {}; for (const r of weeks) weekCnt[r.user_id] = (weekCnt[r.user_id] || 0) + 1
const stale = (p) => (weekCnt[p.id] || 0) >= 3
const seen = new Set(); const base = []
for (const p of pool) { if (!p.email || /likelion/i.test(p.email)) continue; const e = p.email.toLowerCase(); if (seen.has(e) || unsubSet.has(p.id) || bl.has(p) || sent.has(p.id)) continue; seen.add(e); p.__t = txt(p); base.push(p) }
console.log(`\n베이스(이력서·수신거부/블랙리스트/내부/기발송 제외) ${base.length}명`)

const sig = (p) => salesRole(p) || csSalesTitle(p) || (adjRole(p) && majorOk(p))
const hc = base.filter(hcmOk)
console.log(`HCMC권/미기재 ${hc.length} · 그중 24m 미만 ${hc.filter((p) => y(p) < 24).length} · 12m 미만 ${hc.filter((p) => y(p) < 12).length}`)
console.log(`세일즈/CS 시그널(직군 Sales / 경력 직함 CS·세일즈 / 인접 직군×전공) × HCMC: 전체 ${hc.filter(sig).length} · 24m 미만 ${hc.filter((p) => sig(p) && y(p) < 24).length} · 12m 미만 ${hc.filter((p) => sig(p) && y(p) < 12).length}`)

const line = (label, arr) => {
  const ok = arr.filter((p) => !todaySet.has(p.id))
  console.log(`  ${label}: ${arr.length}명 → 오늘 발송가능 ${ok.length} (당일 겹침 ${arr.length - ok.length} · 7일 3통+ ${ok.filter(stale).length}) · 미기재지역 ${ok.filter((p) => !String(p.location || '').trim()).length} · 전공매치 ${ok.filter(majorOk).length} · 학생/신졸 시그널 ${ok.filter(student).length} · 오피스툴 ${ok.filter(office).length} · EN ${ok.filter(enOk).length} · KO ${ok.filter(koOk).length} · 공개 ${ok.filter((p) => p.is_resume_public).length}`)
  return ok
}
const core = hc.filter((p) => y(p) < 24)
const S1 = core.filter((p) => y(p) < 12 && (salesRole(p) || csSalesTitle(p)))
const S2 = core.filter((p) => y(p) < 12 && !(salesRole(p) || csSalesTitle(p)) && adjRole(p) && majorOk(p))
const S3 = core.filter((p) => y(p) >= 12 && (salesRole(p) || csSalesTitle(p)))
const S4 = core.filter((p) => y(p) >= 12 && !(salesRole(p) || csSalesTitle(p)) && adjRole(p) && majorOk(p))
const S5 = core.filter((p) => y(p) < 12 && !sig(p) && csSalesText(p) && majorOk(p))
console.log('\n[V222 Thực tập sinh Sale] HCMC권/미기재 × 24m 미만')
line('S1 세일즈 직군 or CS/세일즈 경력 직함 × 12m 미만 (JD 코어)', S1)
line('S2 인접 직군(마케팅/Non-IT/통역 등) × 경영·마케팅·관광·외국어 전공 × 12m 미만', S2)
line('S3 세일즈 직군 or CS/세일즈 직함 × 12~24m (주니어 확장)', S3)
line('S4 인접 직군 × 전공 × 12~24m', S4)
line('S5 텍스트만 CS/세일즈 × 전공 × 12m 미만 (참고)', S5)
const a = line('S1+S2 합계(신입 코어)', [...S1, ...S2])
const b = line('S1+S2+S3+S4 합계(24m 미만 전체)', [...S1, ...S2, ...S3, ...S4])
console.log(`    참고 — 한국어 시그널 × HCMC × 24m 미만 × 직군 무관: ${hc.filter((p) => y(p) < 24 && koOk(p)).length}명 (그중 세일즈/CS/전공 시그널 ${hc.filter((p) => y(p) < 24 && koOk(p) && sig(p)).length})`)
const vocab = {}; for (const p of b) for (const r of roles(p).slice(0, 1)) vocab[r] = (vocab[r] || 0) + 1
console.log('    position 분포:', Object.entries(vocab).sort((x, z) => z[1] - x[1]).slice(0, 10).map(([k, v]) => `${k}(${v})`).join(' · '))
const sc = (p) => (salesRole(p) ? 2 : 0) + (csSalesTitle(p) ? 3 : 0) + (majorOk(p) ? 1 : 0) + (koOk(p) ? 3 : 0) + (enOk(p) ? 1 : 0) + (office(p) ? 1 : 0) + (student(p) ? 1 : 0)
console.log('\n[표본] 상위 15'); for (const p of [...b].sort((x, z) => sc(z) - sc(x)).slice(0, 15)) console.log(`  [${sc(p)}] ${p.full_name} · ${roles(p).slice(0, 2).join('/')} · ${Math.round(y(p) / 12 * 10) / 10}y · ${p.location || '미기재'} · ${String(p.major || '').slice(0, 25)} · ${expTitles(p).slice(0, 50)}${enOk(p) ? ' · EN' : ''}${koOk(p) ? ' · KO' : ''}`)
