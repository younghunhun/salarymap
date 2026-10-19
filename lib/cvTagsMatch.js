import { submitRoleCategory, roleGroupKey } from '../constants/jobs.js'
import { LEVEL_RANK, normProvince } from './cvTags.js'

/* 프로필 ↔ 공고 조건을 맞춰 볼 때 쓰는 읽기 함수들. cv_tags(이력서 원문 태그)가 있으면 그걸 보고,
   없으면(태깅 전 신규 가입·다운로드 실패) 예전 컬럼(position/korean_cert/location)으로 내려간다.
   콜드메일 풀 산정(lib/poolEstimator.js), JD 매칭 1차 거름망(lib/jdMatch.js), recommend 스크립트가 공유.

   왜 cv_tags 를 우선하나: 10월 콜드메일 응답 분석에서 약한 카테고리 발송의 61%가 직군 불일치였다.
   position 은 본인 선택(희망 직무)이고 비어 있는 사람이 많아, 실제 하는 일은 이력서 태그가 더 정확하다. */

const tags = (p) => (p && p.cv_tags && typeof p.cv_tags === 'object' ? p.cv_tags : null)

// 사람이 가진 직군 값 전부 — 태그(실제 직무·부직무) + 본인 입력(position·desired_roles). 두 어휘(세부/canonical)가 섞인다.
export function rolesOf(p) {
  const t = tags(p)
  const s = new Set([p.position, ...(p.desired_roles || [])].filter(Boolean))
  if (t) { if (t.role_detail && t.role_detail !== 'Other') s.add(t.role_detail); for (const r of t.role_secondary || []) s.add(r) }
  return s
}

/* 직군 대분류 키 — 세부(SUBMIT: 'Accountant')와 canonical(jobs.role: 'Finance') 양쪽 어휘를 같은 키로 모은다.
   값이 정확히 같지 않아도 "같은 묶음인가"를 볼 수 있어야 공고 role('Finance')로 태그('Accountant')를 찾는다. */
const CANON_GROUP = {
  Sales: 'sales', Marketing: 'marketing', HR: 'hr', Finance: 'finance', Operations: 'office', Interpreter: 'office',
  Procurement: 'logistics', Warehouse: 'logistics', Merchandiser: 'logistics',
  'Production Worker': 'manufacturing', 'Production Manager': 'manufacturing', 'Process Engineer': 'manufacturing', Maintenance: 'manufacturing', HSE: 'manufacturing',
  'Teacher / Education': 'education', 'Non-IT': 'other',
}
const CANON_IT = { software: 'it', infra: 'it', qa: 'it', security: 'it', leadership: 'it', other_tech: 'it', data: 'data', product: 'pm', design: 'design' }
export function roleGroupOf(value) {
  if (!value) return null
  const c = submitRoleCategory(value)
  if (c) return c.key
  if (CANON_GROUP[value]) return CANON_GROUP[value]
  const g = roleGroupKey(value)
  return g ? (CANON_IT[g] || g) : null
}
export const roleGroupsOf = (p) => new Set([...rolesOf(p)].map(roleGroupOf).filter(Boolean))

// 'korean' | 'english' | 'chinese' | 'japanese' 등급. 태그 없으면 자격증 칸으로 추정(있으면 intermediate 취급).
const certFilled = (c) => !!c && !/^(none|no|không|없음|-|n\/a|0)$/i.test(String(c).trim())
export function langLevel(p, lang) {
  const t = tags(p)
  if (t && t[`${lang}_level`]) return t[`${lang}_level`]
  const cert = lang === 'korean' ? p.korean_cert : lang === 'english' ? p.english_cert : null
  return certFilled(cert) ? 'intermediate' : 'none'
}
export const langAtLeast = (p, lang, min) => (LEVEL_RANK[langLevel(p, lang)] ?? 0) >= (LEVEL_RANK[min] ?? 0)

// 총 경력 개월 — 태그가 이력서 날짜로 합산한 값 우선, 없으면 파서/본인 입력 yoe_months
export function yoeMonthsOf(p) {
  const t = tags(p)
  if (t && Number.isFinite(t.yoe_total_months)) return t.yoe_total_months
  return p.yoe_months ?? null
}

// 거주 성(표준 이름) — 태그의 주소 우선, 없으면 자유입력 location 을 같은 정규화로
export function provinceOf(p) {
  const t = tags(p)
  return (t && t.address_province) || normProvince(p.location) || null
}

/* 출근권 — 공고 지역과 사람 거주지를 같은 묶음으로 본다. 동나이·빙즈엉은 HCM 공고 출근권,
   박닌·흥옌·하이퐁은 하노이권 공장 출근권. 목록 밖 성은 그 이름 그대로 한 묶음. */
const REGION_OF = {}
for (const p of ['Hồ Chí Minh', 'Bình Dương', 'Đồng Nai', 'Long An', 'Bà Rịa - Vũng Tàu', 'Tây Ninh']) REGION_OF[p] = 'HCM'
for (const p of ['Hà Nội', 'Bắc Ninh', 'Hưng Yên', 'Hải Phòng', 'Vĩnh Phúc', 'Hải Dương', 'Bắc Giang', 'Thái Nguyên', 'Hà Nam', 'Quảng Ninh']) REGION_OF[p] = 'HN'
for (const p of ['Đà Nẵng', 'Quảng Nam', 'Thừa Thiên Huế']) REGION_OF[p] = 'DN'
export const regionOfProvince = (prov) => (prov ? REGION_OF[prov] || prov : null)
export const regionOf = (p) => regionOfProvince(provinceOf(p))

export const hasCvTags = (p) => !!tags(p)
