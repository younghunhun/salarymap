// STS V221 Kế toán Nội bộ (10/9 Len 등록) 발송 풀 실측 (읽기 전용)
// JD: HCMC 온사이트 · 회계/감사/재무 전공 · 내부회계/지급/총계정 1~2년 "우대" · 기본 회계 원리 · Excel·회계SW · 급여 협의
// 지역 게이트 = HCMC권 명시 or 미기재 · 경력: 12m+ 코어, <12m 회계 전공/직함 보유자는 확장층
import { sb, fetchAll, fetchBlacklist } from '../outreach/lib.mjs'

const V221 = '9aadda06-b0d6-4992-8ee6-b4e3b65aee73'
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

const acctRe = /(kế toán|ke toan|accountant|accounting|kiểm toán|kiem toan|auditor|\baudit\b|bookkeep|tài chính|tai chinh|finance|financial)/i
const acctTitle = (p) => acctRe.test(expTitles(p))
const acctMajor = (p) => acctRe.test(String(p.major || ''))
const acctRole = (p) => roles(p).includes('Finance') || acctRe.test(roles(p).join(' '))
const acctText = (p) => acctRe.test(p.__t)
const internalRe = /(kế toán nội bộ|ke toan noi bo|kế toán thanh toán|kế toán tổng hợp|general accountant|internal account|accounts payable|accounts receivable|công nợ|thu.?chi|đối chiếu|reconcil)/i
const sw = (p) => /(misa|fast accounting|\bfast\b|bravo|sap\b|oracle|quickbooks|xero|amis|excel)/i.test(p.__t)

const [pool, unsubs, recs, apps, todays, weeks, bl, job] = await Promise.all([
  fetchAll(() => sb.from('user_profiles').select('id,email,full_name,position,desired_roles,yoe_months,location,english_cert,korean_cert,is_resume_public,skills,resume_summary,headline,experiences,major,university,created_at').not('email', 'is', null).not('resume_url', 'is', null).order('created_at', { ascending: false })),
  fetchAll(() => sb.from('events').select('user_id').eq('event', 'coldmail_unsub').not('user_id', 'is', null).order('id')),
  fetchAll(() => sb.from('job_recommendations').select('user_id').eq('job_id', V221).order('id')),
  fetchAll(() => sb.from('job_applications').select('user_id').eq('job_id', V221).order('id')),
  fetchAll(() => sb.from('job_recommendations').select('user_id').gte('created_at', today).order('id')),
  fetchAll(() => sb.from('job_recommendations').select('user_id').gte('created_at', weekAgo).order('id')),
  fetchBlacklist(),
  sb.from('jobs').select('id,title,company,source_id,is_active,status,location,type,experience_min,experience_max').eq('id', V221).single(),
])
const j = job.data; console.log(`공고: ${j.source_id} ${j.company} ${j.title} · active=${j.is_active} · status=${j.status} · ${j.location} · ${j.type} · exp ${j.experience_min}-${j.experience_max}y`)
console.log(`기발송 ${recs.length} · 기지원 ${apps.length}`)
const unsubSet = new Set(unsubs.map((r) => r.user_id)), sent = new Set([...recs, ...apps].map((r) => r.user_id)), todaySet = new Set(todays.map((r) => r.user_id))
const weekCnt = {}; for (const r of weeks) weekCnt[r.user_id] = (weekCnt[r.user_id] || 0) + 1
const stale = (p) => (weekCnt[p.id] || 0) >= 3
const seen = new Set(); const base = []
for (const p of pool) { if (!p.email || /likelion/i.test(p.email)) continue; const e = p.email.toLowerCase(); if (seen.has(e) || unsubSet.has(p.id) || bl.has(p) || sent.has(p.id)) continue; seen.add(e); p.__t = txt(p); base.push(p) }
console.log(`\n베이스(이력서·수신거부/블랙리스트/내부/기발송 제외) ${base.length}명`)

const anyAcct = (p) => acctRole(p) || acctTitle(p) || acctMajor(p)
console.log(`회계 시그널(직군 Finance/회계 or 경력 직함 or 전공) 전체 ${base.filter(anyAcct).length} · 직군 ${base.filter(acctRole).length} · 경력직함 ${base.filter(acctTitle).length} · 전공 ${base.filter(acctMajor).length} · 텍스트만 ${base.filter((p) => !anyAcct(p) && acctText(p)).length}`)
console.log(`  지역: HCMC/미기재 ${base.filter((p) => anyAcct(p) && hcmOk(p)).length} · 타지역 ${base.filter((p) => anyAcct(p) && !hcmOk(p)).length}`)

const line = (label, arr) => {
  const ok = arr.filter((p) => !todaySet.has(p.id))
  console.log(`  ${label}: ${arr.length}명 → 오늘 발송가능 ${ok.length} (당일 겹침 ${arr.length - ok.length} · 7일 3통+ ${ok.filter(stale).length}) · 미기재지역 ${ok.filter((p) => !String(p.location || '').trim()).length} · 내부회계/공계 키워드 ${ok.filter((p) => internalRe.test(p.__t)).length} · 회계SW/Excel ${ok.filter(sw).length} · EN ${ok.filter(enOk).length} · KO ${ok.filter(koOk).length} · 공개 ${ok.filter((p) => p.is_resume_public).length}`)
  return ok
}
const yb = (a) => { const d = {}; for (const p of a) { const k = y(p) < 12 ? '<1y' : y(p) < 36 ? '1-3y' : y(p) < 60 ? '3-5y' : '5y+'; d[k] = (d[k] || 0) + 1 } return Object.entries(d).map(([k, v]) => `${k} ${v}`).join(' · ') }

const core = base.filter((p) => anyAcct(p) && hcmOk(p))
const A1 = core.filter((p) => acctTitle(p) && y(p) >= 12)
const A2 = core.filter((p) => !acctTitle(p) && (acctRole(p) || acctMajor(p)) && y(p) >= 12)
const A3 = core.filter((p) => y(p) < 12 && (acctTitle(p) || acctMajor(p)))
const A4 = core.filter((p) => y(p) < 12 && !acctTitle(p) && !acctMajor(p))
console.log('\n[V221 Kế toán Nội bộ] HCMC권/미기재 × 회계 시그널')
line('A1 회계 경력 직함 × 12m+ (JD 코어)', A1)
line('A2 직군/전공만 회계 × 12m+ (경력 직함은 비회계)', A2)
line('A3 회계 직함/전공 × 12m 미만 (신입·확장층)', A3)
line('A4 직군만 Finance × 12m 미만 — 기본 제외', A4)
const send = line('A1+A2 합계(코어)', [...A1, ...A2])
console.log(`    경력 분포: ${yb(send)}`)
const sendX = line('A1+A2+A3 합계(확장 포함)', [...A1, ...A2, ...A3])
console.log(`    참고 — 타지역 × 회계직함 × 12m+: ${base.filter((p) => !hcmOk(p) && acctTitle(p) && y(p) >= 12).length}명 · 텍스트만 매치 × HCMC × 12m+: ${base.filter((p) => !anyAcct(p) && acctText(p) && hcmOk(p) && y(p) >= 12).length}명`)
const vocab = {}; for (const p of send) for (const r of roles(p).slice(0, 1)) vocab[r] = (vocab[r] || 0) + 1
console.log('    코어 position 분포:', Object.entries(vocab).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([k, v]) => `${k}(${v})`).join(' · '))
const sc = (p) => (acctTitle(p) ? 3 : 0) + (internalRe.test(p.__t) ? 2 : 0) + (sw(p) ? 1 : 0) + (acctMajor(p) ? 1 : 0) + (y(p) >= 12 && y(p) <= 36 ? 1 : 0) + (enOk(p) ? 1 : 0) + (koOk(p) ? 1 : 0)
console.log(`\n[표본] 상위 15`); for (const p of [...send].sort((a, b) => sc(b) - sc(a)).slice(0, 15)) console.log(`  [${sc(p)}] ${p.full_name} · ${roles(p).slice(0, 2).join('/')} · ${Math.round(y(p) / 12 * 10) / 10}y · ${p.location || '미기재'} · ${expTitles(p).slice(0, 70)}${enOk(p) ? ' · EN' : ''}${koOk(p) ? ' · KO' : ''}`)
