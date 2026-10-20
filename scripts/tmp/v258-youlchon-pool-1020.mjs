// 읽기 전용: V258 YOUL CHON VINA 시장개발 영업(HCM · B2B 플라스틱/포장 2년+ · 22~40세) 발송 가능 풀 — 2026-10-20
import { sb, fetchAll, fetchBlacklist } from '../outreach/lib.mjs'
import { rolesOf, roleGroupsOf, yoeMonthsOf, regionOf, provinceOf, langLevel } from '../../lib/cvTagsMatch.js'
const NEW = 'b4ec933b-d023-469e-8ad9-6a42bbb53cff', OLD = '138fd376-c864-4e60-965d-875a5328171d'
const [profs, unsubs, bl, recs7, recOld, appOld, appNew] = await Promise.all([
  fetchAll(() => sb.from('user_profiles').select('id,email,full_name,position,desired_roles,yoe_months,location,skills,headline,experiences,cv_tags,updated_at,resume_url').not('email', 'is', null).not('resume_url', 'is', null).order('created_at', { ascending: false })),
  fetchAll(() => sb.from('events').select('user_id').eq('event', 'coldmail_unsub').not('user_id', 'is', null).order('id')),
  fetchBlacklist(),
  fetchAll(() => sb.from('job_recommendations').select('user_id').gte('created_at', new Date(Date.now() - 7 * 86400e3).toISOString()).order('id')),
  fetchAll(() => sb.from('job_recommendations').select('user_id').eq('job_id', OLD).order('id')),
  fetchAll(() => sb.from('job_applications').select('user_id').eq('job_id', OLD).order('id')),
  fetchAll(() => sb.from('job_applications').select('user_id').eq('job_id', NEW).order('id')),
])
const unsub = new Set(unsubs.map((u) => u.user_id)), seen = new Set()
const base = profs.filter((p) => { if (/likelion/i.test(p.email) || unsub.has(p.id) || bl.has(p)) return false; const e = p.email.toLowerCase(); if (seen.has(e)) return false; seen.add(e); return true })
const cool = new Set(recs7.map((r) => r.user_id)), gotOld = new Set(recOld.map((r) => r.user_id)), appliedOld = new Set(appOld.map((a) => a.user_id)), appliedNew = new Set(appNew.map((a) => a.user_id))
const t = (p) => p.cv_tags || {}
const txt = (p) => [JSON.stringify(p.skills || ''), p.headline, p.position, ...(t(p).industry_keywords || []), ...(Array.isArray(p.experiences) ? p.experiences.map((e) => `${e.company || ''} ${e.title || e.position || ''} ${e.description || ''}`) : [])].join(' ').toLowerCase()
const SALES = new Set(['Sales (B2B)', 'Sales (B2C / Retail)', 'Business Development', 'Sales', 'Telesales'])
const B2B = new Set(['Sales (B2B)', 'Business Development'])
const pkgRe = /(nhựa|plastic|bao bì|packaging|carton|hạt nhựa|ép nhựa|polymer)/
const mfgInd = new Set(['Manufacturing', 'Chemical / Materials', 'Electronics', 'Textile / Garment / Footwear', 'F&B / Food'])
const ageOk = (p) => t(p).birth_year == null || (t(p).birth_year >= 1986 && t(p).birth_year <= 2004)
const hcm = (p) => { const r = regionOf(p); return r == null || r === 'HCM' }
const yoe = (p) => yoeMonthsOf(p) ?? 0
const isSales = (p) => [...rolesOf(p)].some((r) => SALES.has(r))
const mainB2B = (p) => B2B.has(t(p).role_detail)
const tier = (p) => {
  if (!isSales(p)) return null
  if (pkgRe.test(txt(p)) && (mainB2B(p) || SALES.has(t(p).role_detail))) return 'T1 플라스틱/포장 영업'
  if (mainB2B(p) && (t(p).industries || []).some((i) => mfgInd.has(i))) return 'T2 제조업 B2B 영업'
  if (mainB2B(p)) return 'T3 B2B 영업(타산업)'
  return 'T4 영업 일반(B2C/세컨더리)'
}
const rows = []
for (const p of base) {
  const tr = tier(p); if (!tr) continue
  if (yoe(p) < 24 || !hcm(p) || !ageOk(p)) continue
  const flag = appliedNew.has(p.id) ? '지원(V258)' : appliedOld.has(p.id) ? '지원(V177)' : cool.has(p.id) ? '7일쿨다운' : gotOld.has(p.id) ? 'V177수신(미지원)' : '발송가능'
  rows.push({ p, tr, flag })
}
const cnt = (arr, f) => { const m = {}; for (const r of arr) { const k = f(r) ?? '(없음)'; m[k] = (m[k] || 0) + 1 } return m }
console.log(`기준 풀 ${base.length} · 영업 직군 ${base.filter(isSales).length} · +2년/HCM/22~40세 ${rows.length}`)
console.log('\n티어\t전체\t발송가능\t7일쿨다운\tV177수신(미지원)\t지원(V177)')
for (const tr of ['T1 플라스틱/포장 영업', 'T2 제조업 B2B 영업', 'T3 B2B 영업(타산업)', 'T4 영업 일반(B2C/세컨더리)']) {
  const a = rows.filter((r) => r.tr === tr), c = cnt(a, (r) => r.flag)
  console.log([tr, a.length, c['발송가능'] || 0, c['7일쿨다운'] || 0, c['V177수신(미지원)'] || 0, c['지원(V177)'] || 0].join('\t'))
}
const ok = rows.filter((r) => r.flag === '발송가능')
console.log(`\n발송가능 합계 ${ok.length}`)
const dist = (arr, f, n = 8) => Object.entries(cnt(arr, f)).sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, v]) => `${k} ${v}`).join(' · ')
console.log('  거주지:', dist(ok, (r) => provinceOf(r.p)))
console.log('  경력:', dist(ok, (r) => { const m = yoe(r.p); return m < 36 ? '2-3y' : m < 60 ? '3-5y' : m < 96 ? '5-8y' : '8y+' }))
console.log('  직군:', dist(ok, (r) => t(r.p).role_detail))
console.log('  산업:', dist(ok, (r) => (t(r.p).industries || [])[0]))
console.log('  나이:', dist(ok, (r) => t(r.p).birth_year == null ? '미상' : t(r.p).birth_year >= 1996 ? '22-30' : '31-40'))
console.log('  한국어:', dist(ok, (r) => langLevel(r.p, 'korean')), '| 영어:', dist(ok, (r) => langLevel(r.p, 'english')))
console.log('  한국기업 경력', ok.filter((r) => t(r.p).korean_company_exp).length, '· 최근 90일 갱신', ok.filter((r) => Date.now() - new Date(r.p.updated_at || 0) <= 90 * 86400e3).length)
console.log('\n--- T1/T2 발송가능 상세')
for (const r of ok.filter((r) => /^T[12]/.test(r.tr))) console.log([r.tr.slice(0, 2), r.p.full_name, t(r.p).role_detail, yoe(r.p) + 'm', t(r.p).birth_year, provinceOf(r.p), (t(r.p).industries || []).slice(0, 2).join('/'), (t(r.p).industry_keywords || []).slice(0, 4).join(','), (Array.isArray(r.p.experiences) ? r.p.experiences.slice(0, 2).map((e) => `${e.company || ''}:${e.title || e.position || ''}`).join(' | ') : '').slice(0, 90)].join('\t'))
// V177 결과
console.log(`\nV177(9/16 동일 공고): recommend ${gotOld.size} → 지원 ${appliedOld.size} (recommend 경유 ${[...appliedOld].filter((u) => gotOld.has(u)).length})`)
// 쿨다운 묶인 T1~T3 가 어느 공고/날짜 recommend 를 받았는지
const coolIds = rows.filter((r) => r.flag === '7일쿨다운' && /^T[123]/.test(r.tr)).map((r) => r.p.id)
const recsDetail = await fetchAll(() => sb.from('job_recommendations').select('user_id,job_title,job_company,created_at').in('user_id', coolIds).gte('created_at', new Date(Date.now() - 7 * 86400e3).toISOString()).order('id'))
console.log('\n--- T1~T3 쿨다운', coolIds.length, '명이 최근 7일 받은 recommend:', dist(recsDetail, (r) => `${r.created_at.slice(5, 10)} ${r.job_company} · ${r.job_title}`.slice(0, 70), 12))
const lastBy = {}; for (const r of recsDetail) lastBy[r.user_id] = r.created_at.slice(0, 10) > (lastBy[r.user_id] || '') ? r.created_at.slice(0, 10) : lastBy[r.user_id]
console.log('    마지막 수신일:', dist(Object.values(lastBy).map((d) => ({ d })), (r) => r.d))
// 쿨다운 제외 없이: 지원자(V177/V258)만 뺀 발송 가능 풀
console.log('\n=== 쿨다운 미적용 ===')
const ok2 = rows.filter((r) => !/^지원/.test(r.flag))
console.log('티어\t발송가능\t(그중 V177 수신·미지원)')
for (const tr of ['T1 플라스틱/포장 영업', 'T2 제조업 B2B 영업', 'T3 B2B 영업(타산업)', 'T4 영업 일반(B2C/세컨더리)']) { const a = ok2.filter((r) => r.tr === tr); console.log([tr, a.length, a.filter((r) => gotOld.has(r.p.id)).length].join('\t')) }
const core = ok2.filter((r) => /^T[123]/.test(r.tr))
console.log(`T1~T3 합계 ${core.length} · T4 포함 ${ok2.length}`)
console.log('  경력:', dist(core, (r) => { const m = yoe(r.p); return m < 36 ? '2-3y' : m < 60 ? '3-5y' : m < 96 ? '5-8y' : '8y+' }))
console.log('  직군:', dist(core, (r) => t(r.p).role_detail))
console.log('  산업:', dist(core, (r) => (t(r.p).industries || [])[0]))
console.log('  나이:', dist(core, (r) => t(r.p).birth_year == null ? '미상' : t(r.p).birth_year >= 1996 ? '22-30' : '31-40'), '| 영어:', dist(core, (r) => langLevel(r.p, 'english')))
console.log('\n--- T1 상세')
for (const r of ok2.filter((r) => /^T1/.test(r.tr))) console.log([r.p.full_name, t(r.p).role_detail, yoe(r.p) + 'm', t(r.p).birth_year, (t(r.p).industry_keywords || []).slice(0, 4).join(','), (Array.isArray(r.p.experiences) ? r.p.experiences.slice(0, 2).map((e) => `${e.company || ''}:${e.title || e.position || ''}`).join(' | ') : '').slice(0, 90)].join('\t'))
