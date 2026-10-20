// cv_tags 기준 콜드메일 풀 산정 공용 모듈 — cv-pool.mjs(조회)와 recommend-send.mjs(발송)가 같은 플래그·같은 기준 풀을 쓴다.
// 기준 풀 = recommend 표준: 이력서+이메일 보유 · unsub/블랙리스트/likelion 제외 · 이메일 중복 최신 1건.
//
// 공통 플래그(parseFilters):
//   --roles A,B        세부 직군(cv_tags.role_detail / role_secondary, 본인 입력 position 포함) 중 하나라도
//   --main A,B         주직무(cv_tags.role_detail)만 — 희망직무로 '영업' 적은 CS·운영이 섞이지 않게 할 때
//   --group k          대분류 키(it data pm design marketing sales hr finance manufacturing logistics office)
//   --ko / --en LEVEL  basic | intermediate | business | native 이상
//   --yoe MIN-MAX      총 경력 개월 범위(한쪽 생략 가능: "24-", "-12")
//   --region R         HCM | HN | DN (출근권, 쉼표 구분) · 거주지 미기재는 --strict 없으면 포함
//   --age MIN-MAX      출생연도로 계산한 나이 범위 · 미상은 포함
//   --gender m|f       성별(기재 우선, 없으면 추정 confidence ≥ .8)
//   --industry "a,b"   cv_tags.industries 중 하나라도(부분 일치)
//   --kw REGEX         이력서 본문(스킬·헤드라인·경력·전공·키워드·자격) 정규식, 소문자 비교 · --kw-not REGEX 제외
//   --kco              한국기업 경력자만 · --factory 공장 근무 경험자만 · --active N 최근 N일 내 프로필 갱신자만(updated_at)
//   --job CODE         KTC 공고 코드(V258 등) — 그 공고 기수신·기지원자를 제외하고 수를 따로 찍는다(발송 스크립트는 필수)
import { sb, fetchAll, fetchBlacklist } from './lib.mjs'
import { rolesOf, roleGroupsOf, langAtLeast, yoeMonthsOf, provinceOf, regionOf, langLevel } from '../../lib/cvTagsMatch.js'

export const PROFILE_COLS = 'id,email,full_name,position,desired_roles,headline,major,yoe_months,location,korean_cert,english_cert,is_resume_public,skills,experiences,cv_tags,updated_at'
export const T = (p) => p.cv_tags || {}
export const yoe = (p) => yoeMonthsOf(p) ?? 0
export const gender = (p) => T(p).gender_stated || ((T(p).gender_inferred_confidence ?? 0) >= 0.8 ? T(p).gender_inferred : null)
export const resumeText = (p) => [JSON.stringify(p.skills || ''), p.headline, p.position, p.major, T(p).major_raw, ...(T(p).industry_keywords || []), ...(T(p).certifications || []),
  ...(Array.isArray(p.experiences) ? p.experiences.map((e) => `${e.company || ''} ${e.title || e.position || ''} ${e.description || ''}`) : [])].join(' ').toLowerCase()
export const expSummary = (p, n = 2) => (Array.isArray(p.experiences) ? p.experiences.slice(0, n).map((e) => `${e.company || ''}:${e.title || e.position || ''}`).join(' | ') : '')

export function parseFilters(args) {
  const flag = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? (args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true) : d }
  const list = (v) => (typeof v === 'string' ? v.split(',').map((s) => s.trim()).filter(Boolean) : [])
  const range = (v) => String(v ?? '-').split('-').map((s) => (s === '' ? null : Number(s)))
  const [YMIN, YMAX] = range(flag('yoe')), [AMIN, AMAX] = range(flag('age'))
  return {
    flag,
    roles: list(flag('roles')), main: list(flag('main')), groups: list(flag('group')), ko: flag('ko'), en: flag('en'), region: list(flag('region')),
    ymin: YMIN, ymax: YMAX, amin: AMIN, amax: AMAX,
    gender: { m: 'male', f: 'female', male: 'male', female: 'female' }[flag('gender')] || null,
    industry: list(flag('industry')).map((s) => s.toLowerCase()),
    kw: flag('kw') && flag('kw') !== true ? new RegExp(flag('kw'), 'i') : null,
    kwNot: flag('kw-not') && flag('kw-not') !== true ? new RegExp(flag('kw-not'), 'i') : null,
    kco: flag('kco', false) === true, factory: flag('factory', false) === true, strict: flag('strict', false) === true,
    active: flag('active') ? Number(flag('active')) : null,
    job: flag('job') && flag('job') !== true ? String(flag('job')).toUpperCase() : null,
  }
}

export function makePick(f) {
  const thisYear = new Date().getFullYear()
  return (p) => {
    const t = T(p)
    if (f.roles.length && ![...rolesOf(p)].some((r) => f.roles.includes(r))) return false
    if (f.main.length && !f.main.includes(t.role_detail)) return false
    if (f.groups.length && ![...roleGroupsOf(p)].some((g) => f.groups.includes(g))) return false
    if (f.ko && f.ko !== true && !langAtLeast(p, 'korean', f.ko)) return false
    if (f.en && f.en !== true && !langAtLeast(p, 'english', f.en)) return false
    const y = yoe(p)
    if (f.ymin != null && y < f.ymin) return false
    if (f.ymax != null && y > f.ymax) return false
    if (f.region.length) { const r = regionOf(p); if (r ? !f.region.includes(r) : f.strict) return false }
    if ((f.amin != null || f.amax != null) && t.birth_year != null) { const a = thisYear - t.birth_year; if ((f.amin != null && a < f.amin) || (f.amax != null && a > f.amax)) return false }
    if (f.gender && gender(p) !== f.gender) return false
    if (f.industry.length && !(t.industries || []).some((i) => f.industry.some((q) => i.toLowerCase().includes(q)))) return false
    if (f.kw || f.kwNot) { const tx = resumeText(p); if (f.kw && !f.kw.test(tx)) return false; if (f.kwNot && f.kwNot.test(tx)) return false }
    if (f.kco && !t.korean_company_exp) return false
    if (f.factory && !t.factory_experience) return false
    if (f.active && Date.now() - new Date(p.updated_at || 0) > f.active * 86400e3) return false
    return true
  }
}

// 기준 풀 + (--job 이면) 공고·기수신·기지원 집합
export async function loadPool(f) {
  const [rows, unsubs, bl] = await Promise.all([
    fetchAll(() => sb.from('user_profiles').select(PROFILE_COLS).not('email', 'is', null).not('resume_url', 'is', null).order('created_at', { ascending: false })),
    fetchAll(() => sb.from('events').select('user_id').eq('event', 'coldmail_unsub').not('user_id', 'is', null).order('id')),
    fetchBlacklist(),
  ])
  const unsub = new Set(unsubs.map((u) => u.user_id)), seen = new Set()
  const base = rows.filter((p) => { if (!p.email || /likelion/i.test(p.email) || unsub.has(p.id) || bl.has(p)) return false; const e = p.email.toLowerCase(); if (seen.has(e)) return false; seen.add(e); return true })
  let job = null, sent = new Set(), applied = new Set()
  if (f.job) {
    const { data, error } = await sb.from('jobs').select('id,title,company,location,logo_url,is_active,source_id,experience_min').eq('source', 'ktc').eq('source_id', f.job).maybeSingle()
    if (error) throw error
    if (!data) throw new Error(`공고 없음: ${f.job}`)
    job = data
    const [recs, apps] = await Promise.all([
      fetchAll(() => sb.from('job_recommendations').select('user_id').eq('job_id', job.id).order('id')),
      fetchAll(() => sb.from('job_applications').select('user_id').eq('job_id', job.id).order('id')),
    ])
    sent = new Set(recs.map((r) => r.user_id)); applied = new Set(apps.map((a) => a.user_id))
  }
  return { base, job, sent, applied }
}

// 조건 일치자를 발송가능/기수신/기지원으로 나눠 돌려준다
export function splitHits(base, pick, sent, applied) {
  const hit = base.filter(pick)
  return { hit, ok: hit.filter((p) => !sent.has(p.id) && !applied.has(p.id)), sentN: hit.filter((p) => sent.has(p.id)).length, appliedN: hit.filter((p) => applied.has(p.id)).length }
}

const dist = (arr, fn, n = 8) => { const m = {}; for (const p of arr) { const k = fn(p) ?? '(없음)'; m[k] = (m[k] || 0) + 1 } return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, v]) => `${k} ${v}`).join(' · ') }
const yb = (m) => (m == null ? '미상' : m < 12 ? '<1y' : m < 36 ? '1-3y' : m < 60 ? '3-5y' : m < 96 ? '5-8y' : '8y+')
export function printSummary(arr, label = '조건 일치') {
  console.log(`${label} ${arr.length}명`)
  if (!arr.length) return
  console.log(`  거주권: ${dist(arr, regionOf)} / 경력: ${dist(arr, (p) => yb(yoeMonthsOf(p)))}`)
  console.log(`  한국어: ${dist(arr, (p) => langLevel(p, 'korean'))} / 영어: ${dist(arr, (p) => langLevel(p, 'english'), 5)}`)
  console.log(`  직군:   ${dist(arr, (p) => T(p).role_detail || p.position)}`)
  console.log(`  산업:   ${dist(arr, (p) => (T(p).industries || [])[0])}`)
  console.log(`  성별:   ${dist(arr, gender)} / 재직: ${dist(arr, (p) => T(p).employment_status)}`)
  console.log(`  공개 이력서 ${arr.filter((p) => p.is_resume_public).length} · 한국기업 경력 ${arr.filter((p) => T(p).korean_company_exp).length} · 최근 30일 갱신 ${arr.filter((p) => Date.now() - new Date(p.updated_at || 0) <= 30 * 86400e3).length}`)
}
export function printList(arr, n = arr.length) {
  console.log('\nid\temail\tname\trole\tyoe\tprovince\tko\ten\texp')
  for (const p of arr.slice(0, n)) console.log([p.id, p.email, p.full_name, T(p).role_detail || p.position, yoeMonthsOf(p), provinceOf(p), langLevel(p, 'korean'), langLevel(p, 'english'), expSummary(p).slice(0, 80)].join('\t'))
}
