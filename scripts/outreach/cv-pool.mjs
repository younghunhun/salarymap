// cv_tags 기준 콜드메일 풀 산정 CLI — 공고 조건을 플래그로 넣으면 발송 가능 인원과 분포를 찍는다.
// recommend 스크립트마다 정규식으로 직함을 긁던 자리(예: gpclub1019 의 acctRe/adminRe)를 이걸로 대신한다.
// 기준 풀은 recommend 표준과 같다: 이력서+이메일 보유 · unsub/블랙리스트/likelion 제외 · 이메일 중복 최신 1건.
//
//   node scripts/outreach/cv-pool.mjs --roles "Accountant,Audit / Tax" --yoe 24-60 --region HCM
//   node scripts/outreach/cv-pool.mjs --group finance --ko intermediate --region HCM,HN --list
//   node scripts/outreach/cv-pool.mjs --roles "Interpreter / Translator" --ko business --gender female --active 90
//   --roles A,B        세부 직군(cv_tags.role_detail / role_secondary, 본인 입력 position 포함) 중 하나라도
//   --group k          대분류 키(it data pm design marketing sales hr finance manufacturing logistics office)
//   --ko / --en LEVEL  basic | intermediate | business | native 이상
//   --yoe MIN-MAX      총 경력 개월 범위(한쪽 생략 가능: "24-", "-12")
//   --region R         HCM | HN | DN (출근권, 쉼표 구분) · 거주지 미기재는 --strict 없으면 포함
//   --gender m|f       성별(기재 우선, 없으면 추정 confidence ≥ .8)
//   --industry "a,b"   cv_tags.industries 중 하나라도(부분 일치)
//   --kco              한국기업 경력자만 · --factory 공장 근무 경험자만 · --active N 최근 N일 내 프로필 갱신자만(updated_at)
//   --list             id, 이메일, 이름, 직군, 경력, 거주지, 한국어 를 TSV 로 출력
import { sb, fetchAll, fetchBlacklist } from './lib.mjs'
import { rolesOf, roleGroupsOf, langAtLeast, yoeMonthsOf, provinceOf, regionOf, langLevel } from '../../lib/cvTagsMatch.js'

const args = process.argv.slice(2)
const flag = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? (args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true) : d }
const list = (v) => (typeof v === 'string' ? v.split(',').map((s) => s.trim()).filter(Boolean) : [])
const ROLES = list(flag('roles')), GROUPS = list(flag('group')), KO = flag('ko'), EN = flag('en'), REGION = list(flag('region'))
const [YMIN, YMAX] = String(flag('yoe', '-')).split('-').map((s) => (s === '' ? null : Number(s)))
const GENDER = { m: 'male', f: 'female', male: 'male', female: 'female' }[flag('gender')] || null
const INDUSTRY = list(flag('industry')).map((s) => s.toLowerCase())
const KCO = flag('kco', false) === true, FACTORY = flag('factory', false) === true, STRICT = flag('strict', false) === true
const ACTIVE = flag('active') ? Number(flag('active')) : null
const LIST = flag('list', false) === true

const [rows, unsubs, bl] = await Promise.all([
  fetchAll(() => sb.from('user_profiles').select('id,email,full_name,position,desired_roles,yoe_months,location,korean_cert,english_cert,is_resume_public,cv_tags,updated_at').not('email', 'is', null).not('resume_url', 'is', null).order('created_at', { ascending: false })),
  fetchAll(() => sb.from('events').select('user_id').eq('event', 'coldmail_unsub').not('user_id', 'is', null).order('id')),
  fetchBlacklist(),
])
const unsub = new Set(unsubs.map((u) => u.user_id)), seen = new Set()
const base = rows.filter((p) => { if (!p.email || /likelion/i.test(p.email) || unsub.has(p.id) || bl.has(p)) return false; const e = p.email.toLowerCase(); if (seen.has(e)) return false; seen.add(e); return true })

const gender = (p) => { const t = p.cv_tags || {}; return t.gender_stated || ((t.gender_inferred_confidence ?? 0) >= 0.8 ? t.gender_inferred : null) }
const activeAt = (p) => new Date(p.updated_at || 0)
const pick = (p) => {
  const t = p.cv_tags || {}
  if (ROLES.length && ![...rolesOf(p)].some((r) => ROLES.includes(r))) return false
  if (GROUPS.length && ![...roleGroupsOf(p)].some((g) => GROUPS.includes(g))) return false
  if (KO && KO !== true && !langAtLeast(p, 'korean', KO)) return false
  if (EN && EN !== true && !langAtLeast(p, 'english', EN)) return false
  const y = yoeMonthsOf(p) ?? 0
  if (YMIN != null && y < YMIN) return false
  if (YMAX != null && y > YMAX) return false
  if (REGION.length) { const r = regionOf(p); if (r ? !REGION.includes(r) : STRICT) return false }
  if (GENDER && gender(p) !== GENDER) return false
  if (INDUSTRY.length && !(t.industries || []).some((i) => INDUSTRY.some((q) => i.toLowerCase().includes(q)))) return false
  if (KCO && !t.korean_company_exp) return false
  if (FACTORY && !t.factory_experience) return false
  if (ACTIVE && Date.now() - activeAt(p) > ACTIVE * 86400e3) return false
  return true
}
const hit = base.filter(pick)

const dist = (arr, fn, n = 8) => { const m = {}; for (const p of arr) { const k = fn(p) ?? '(없음)'; m[k] = (m[k] || 0) + 1 } return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, v]) => `${k} ${v}`).join(' · ') }
const yb = (m) => (m == null ? '미상' : m < 12 ? '<1y' : m < 36 ? '1-3y' : m < 60 ? '3-5y' : '5y+')
console.log(`기준 풀 ${base.length} (cv_tags 보유 ${base.filter((p) => p.cv_tags).length}) → 조건 일치 ${hit.length}명`)
console.log(`  거주권: ${dist(hit, regionOf)}`)
console.log(`  경력:   ${dist(hit, (p) => yb(yoeMonthsOf(p)))}`)
console.log(`  한국어: ${dist(hit, (p) => langLevel(p, 'korean'))} / 영어: ${dist(hit, (p) => langLevel(p, 'english'), 5)}`)
console.log(`  직군:   ${dist(hit, (p) => p.cv_tags?.role_detail || p.position)}`)
console.log(`  산업:   ${dist(hit, (p) => (p.cv_tags?.industries || [])[0])}`)
console.log(`  성별:   ${dist(hit, gender)} / 재직: ${dist(hit, (p) => p.cv_tags?.employment_status)}`)
console.log(`  공개 이력서 ${hit.filter((p) => p.is_resume_public).length} · 한국기업 경력 ${hit.filter((p) => p.cv_tags?.korean_company_exp).length} · 최근 30일 갱신 ${hit.filter((p) => Date.now() - activeAt(p) <= 30 * 86400e3).length}`)
if (LIST) { console.log('\nid\temail\tname\trole\tyoe\tprovince\tko'); for (const p of hit) console.log([p.id, p.email, p.full_name, p.cv_tags?.role_detail || p.position, yoeMonthsOf(p), provinceOf(p), langLevel(p, 'korean')].join('\t')) }
