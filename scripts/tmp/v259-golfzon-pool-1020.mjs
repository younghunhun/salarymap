// 읽기 전용: V259 GOLFZON Sales Manager(HN · 영업 8y+ · 프리미엄/자동차/골프/고가 · 팀관리 · EN) 발송 가능 풀 — 2026-10-20. 쿨다운 미적용(유저 정책).
import { sb, fetchAll, fetchBlacklist } from '../outreach/lib.mjs'
import { rolesOf, yoeMonthsOf, regionOf, provinceOf, langLevel, langAtLeast } from '../../lib/cvTagsMatch.js'
const JOB = '6f249ff4-73c0-4643-8b66-4fe2e77e171d'
const [profs, unsubs, bl, recs, apps] = await Promise.all([
  fetchAll(() => sb.from('user_profiles').select('id,email,full_name,position,desired_roles,yoe_months,location,skills,headline,experiences,cv_tags,updated_at').not('email', 'is', null).not('resume_url', 'is', null).order('created_at', { ascending: false })),
  fetchAll(() => sb.from('events').select('user_id').eq('event', 'coldmail_unsub').not('user_id', 'is', null).order('id')),
  fetchBlacklist(),
  fetchAll(() => sb.from('job_recommendations').select('user_id').eq('job_id', JOB).order('id')),
  fetchAll(() => sb.from('job_applications').select('user_id').eq('job_id', JOB).order('id')),
])
const unsub = new Set(unsubs.map((u) => u.user_id)), seen = new Set(), done = new Set([...recs, ...apps].map((r) => r.user_id))
const base = profs.filter((p) => { if (/likelion/i.test(p.email) || unsub.has(p.id) || bl.has(p) || done.has(p.id)) return false; const e = p.email.toLowerCase(); if (seen.has(e)) return false; seen.add(e); return true })
const t = (p) => p.cv_tags || {}
const txt = (p) => [JSON.stringify(p.skills || ''), p.headline, p.position, ...(t(p).industry_keywords || []), ...(Array.isArray(p.experiences) ? p.experiences.map((e) => `${e.company || ''} ${e.title || e.position || ''} ${e.description || ''}`) : [])].join(' ').toLowerCase()
const SALES = new Set(['Sales (B2B)', 'Sales (B2C / Retail)', 'Business Development', 'Sales', 'Telesales'])
const yoe = (p) => yoeMonthsOf(p) ?? 0
const luxRe = /(golf|luxury|cao cấp|premium|hạng sang|ô tô|oto|automotive|mercedes|bmw|lexus|audi|porsche|vinfast|toyota|honda|ford|hyundai|showroom|real estate|bất động sản|resort|villa|yacht|du thuyền|hnwi|private banking|wealth|jewelry|trang sức|watch|đồng hồ)/
const mgmt = (p) => (t(p).mgmt_team_size || 0) >= 1 || /^(lead|manager|director)$/.test(t(p).seniority || '') || /(sales manager|sales director|head of sales|trưởng phòng kinh doanh|giám đốc kinh doanh|quản lý kinh doanh|team lead|sales lead|regional|country manager)/.test(txt(p))
const tier = (p, minY) => {
  if (![...rolesOf(p)].some((r) => SALES.has(r)) && !/(sales|kinh doanh|business development)/.test(String(p.position || '').toLowerCase())) return null
  if (yoe(p) < minY) return null
  const r = regionOf(p); if (r != null && r !== 'HN') return null
  const salesMain = SALES.has(t(p).role_detail)
  if (!salesMain) return null
  const lux = luxRe.test(txt(p)), m = mgmt(p), en = langAtLeast(p, 'english', 'intermediate')
  if (lux && m) return 'T1 럭셔리/자동차/골프/부동산 × 팀관리'
  if (lux) return 'T2 럭셔리/자동차/골프/부동산 (관리 미확인)'
  if (m) return 'T3 영업 팀관리 (타산업)'
  return 'T4 영업 8y+ 일반'
}
const TIERS = ['T1 럭셔리/자동차/골프/부동산 × 팀관리', 'T2 럭셔리/자동차/골프/부동산 (관리 미확인)', 'T3 영업 팀관리 (타산업)', 'T4 영업 8y+ 일반']
const dist = (arr, f, n = 8) => { const m = {}; for (const x of arr) { const k = f(x) ?? '(없음)'; m[k] = (m[k] || 0) + 1 } return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, v]) => `${k} ${v}`).join(' · ') }
for (const [label, minY] of [['8y+ (공고 요건)', 96], ['5~8y (완화)', 60]]) {
  const rows = base.map((p) => ({ p, tr: tier(p, minY) })).filter((r) => r.tr).filter((r) => minY === 96 || yoe(r.p) < 96)
  console.log(`\n=== ${label}: ${rows.length}명`)
  console.log('티어\t전체\tEN중급+\tEN business+\t거주지 HN 명시')
  for (const tr of TIERS) { const a = rows.filter((r) => r.tr === tr); console.log([tr, a.length, a.filter((r) => langAtLeast(r.p, 'english', 'intermediate')).length, a.filter((r) => langAtLeast(r.p, 'english', 'business')).length, a.filter((r) => regionOf(r.p) === 'HN').length].join('\t')) }
  console.log('  거주지:', dist(rows, (r) => provinceOf(r.p)), '| 영어:', dist(rows, (r) => langLevel(r.p, 'english')))
  console.log('  직군:', dist(rows, (r) => t(r.p).role_detail), '| 산업:', dist(rows, (r) => (t(r.p).industries || [])[0]))
  if (minY === 96) for (const r of rows.filter((r) => /^T[123]/.test(r.tr))) console.log('  ', [r.tr.slice(0, 2), r.p.full_name, Math.round(yoe(r.p) / 12) + 'y', provinceOf(r.p) || '미기재', 'en:' + langLevel(r.p, 'english'), t(r.p).seniority, 'team:' + (t(r.p).mgmt_team_size ?? '-'), (Array.isArray(r.p.experiences) ? r.p.experiences.slice(0, 2).map((e) => `${e.company || ''}:${e.title || e.position || ''}`).join(' | ') : '').slice(0, 95)].join('\t'))
}
console.log(`\n기준 풀 ${base.length} · V259 기수신/기지원 ${done.size}`)
// 보조: 주직무가 영업이 아니어도 HN × 8y+ × 영업 관리 직함(이력) 보유자
const extra = base.filter((p) => { const r = regionOf(p); return (r == null || r === 'HN') && yoe(p) >= 96 && !SALES.has(t(p).role_detail) && /(sales manager|sales director|head of sales|trưởng phòng kinh doanh|giám đốc kinh doanh|business development manager|regional sales)/.test(txt(p)) })
console.log(`\n보조(주직무 비영업 · 영업관리 직함 이력 · HN · 8y+): ${extra.length}명 — 직군: ${dist(extra, (p) => t(p).role_detail)}`)
for (const p of extra.slice(0, 12)) console.log('  ', [p.full_name, Math.round(yoe(p) / 12) + 'y', provinceOf(p) || '미기재', 'en:' + langLevel(p, 'english'), t(p).role_detail, (Array.isArray(p.experiences) ? p.experiences.slice(0, 2).map((e) => `${e.company || ''}:${e.title || e.position || ''}`).join(' | ') : '').slice(0, 90)].join('\t'))
