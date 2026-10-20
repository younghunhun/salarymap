// 시드 스크립트(node)가 직접 import하므로 확장자 명시
import { submitRoleCategory } from './jobs.js'

// 직군 × 연차 중위값 (triệu VND/월) — 시드 데이터 생성(scripts/seed-nondev-salaries.mjs)과
// 결과 화면 회사 비교(lib/seedCompanies.js)의 공통 소스. 두 곳이 어긋나면 안 되므로 여기서만 관리.
export const EXP_BANDS = ['Under 1yr', '1–2 yrs', '3–4 yrs', '5–7 yrs', '8+ yrs']

// 비개발 소분류 — CareerViet VietnamSalary 크라우드 + Adecco/Manpower/NIC 2026 연봉가이드 기준(유저 확정표)
// 2026-10-20 재조정(영업·HR·재무·사무·통번역 17개): 실제 제출 중앙값(n≥8 구간) + TopCV 공고 평균(회계 12.5·종합회계 15.5·
// 영업 15·BD 16·인사총무 12·채용 12.5·C&B 13.5·총무 11.5·비서 13) + Adecco 2026 Salary Guide 하한(1~5년/5년+) 블렌드.
// Adecco 는 외국계 기준이라 상한으로만 참고. 시드는 scripts/seed-target-salaries.mjs 로 교체 재생성.
export const NONDEV_MEDIANS = {
  'Sales (B2B)':             [10, 13, 19, 26, 35],
  'Sales (B2C / Retail)':    [8, 11, 15, 21, 29],
  'Telesales':               [8, 10, 12, 15, 19],
  'Customer Service':        [8, 10, 13, 16, 21],
  'Business Development':    [10, 15, 21, 29, 38],
  'Digital Marketing':       [9, 12, 16, 22, 30],
  'Content Marketing':       [8, 11, 14, 18, 25],
  'Performance / Ads':       [9, 13, 17, 23, 32],
  'Brand Marketing':         [9, 12, 16, 23, 33],
  'Recruiter':               [8, 12, 16, 22, 29],
  'HR Generalist':           [9, 12, 16, 22, 30],
  'C&B':                     [9, 13, 17, 23, 31],
  'Admin / GA':              [8, 11, 14, 18, 24],
  'Accountant':              [9, 12, 16, 21, 27],
  'Financial Analyst':       [11, 15, 20, 28, 38],
  'Audit / Tax':             [10, 14, 18, 25, 34],
  'Banking':                 [11, 14, 18, 25, 34],
  'Production Worker':       [7, 8, 9, 10, 12],
  'Production Manager':      [10, 13, 17, 24, 32],
  'Process Engineer':        [10, 13, 17, 24, 34],
  'Maintenance':             [8, 10, 13, 17, 22],
  'QC':                      [8, 10, 13, 17, 23],
  'HSE':                     [9, 11, 14, 19, 25],
  'Warehouse':               [7, 9, 11, 13, 17],
  'Procurement':             [9, 11, 14, 18, 25],
  'Import / Export':         [8, 11, 14, 18, 25],
  'Supply Chain':            [10, 13, 17, 24, 34],
  'Secretary / Assistant':   [9, 11, 14, 18, 23],
  'Operations':              [10, 12, 16, 21, 29],
  'Legal':                   [11, 15, 20, 28, 38],
  'Interpreter / Translator':[12, 16, 21, 28, 36],
}

// IT 계열 — 기존 percentile.js BASE_MEDIANS 그대로(legacy role 값 키)
export const IT_MEDIANS = {
  'Backend':   [25, 40, 75, 110, 140],
  'Frontend':  [22, 36, 68, 100, 130],
  'Mobile':    [24, 38, 72, 105, 135],
  'Data · AI': [28, 45, 80, 115, 145],
  'DevOps':    [26, 42, 78, 112, 138],
  'PM · PO':   [22, 35, 65,  95, 125],
  'Design':    [20, 32, 60,  88, 115],
  'QA':        [18, 28, 50,  72,  95],
}

// 소분류에 자체 표가 없을 때 쓰는 대분류 대표값
const CAT_FALLBACK = {
  it: 'Backend', data: 'Data · AI', pm: 'PM · PO', design: 'Design', other: 'Operations',
}

// role 값 → 해당 연차 중위값. 소분류 표 → IT 표 → 대분류 대표값 순.
export function roleMedian(role, experience) {
  const cat = submitRoleCategory(role)
  const fb = cat && CAT_FALLBACK[cat.key]
  const arr = NONDEV_MEDIANS[role] || IT_MEDIANS[role]
    || (fb && (IT_MEDIANS[fb] || NONDEV_MEDIANS[fb])) || NONDEV_MEDIANS['Operations']
  const i = EXP_BANDS.indexOf(experience)
  return arr[i >= 0 ? i : 2]
}
