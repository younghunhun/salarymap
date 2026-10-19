// 읽기 전용: talent-gap-1019.mjs 의 재산출 — 공고별 매칭 풀을 position/직함 정규식 대신 cv_tags(이력서 원문 태그)로 센다.
// 비교: 구(정규식) 풀 vs 신(cv_tags) 풀 · 미달 공고(지원<5)에서 신풀이 작은 세그먼트 = 실제로 모아야 할 인재.
import { sb, fetchAll, fetchBlacklist } from '../outreach/lib.mjs'
import { rolesOf, roleGroupsOf, roleGroupOf, langAtLeast, yoeMonthsOf, regionOf } from '../../lib/cvTagsMatch.js'
const koStrong = /(한국어\s*(능숙|가능|필수|우대)|korean[- ]speaking|korean speaker|tiếng hàn|topik\s*[3-6]|comtor|interpreter|phiên dịch|thông dịch|통역|한국어)/i
const med = (a) => { if (!a.length) return 0; const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)] }
const tbl = (title, rows) => { console.log('\n## ' + title); const cols = [...new Set(rows.flatMap((r) => Object.keys(r)))]; console.log(cols.join('\t')); for (const r of rows) console.log(cols.map((c) => r[c] ?? '').join('\t')) }

// 공고 → 세그먼트(talent-gap-1019 와 동일 분류) → cv_tags 세부 직군 집합
const cat = (s) => { s = String(s || '').toLowerCase(); if (!s) return '(none)'
  if (/(interpreter|translator|comtor|phiên dịch|biên dịch|thông dịch|통역|korean.*staff)/.test(s)) return '통번역/한국어사무'
  if (/(game|unity)/.test(s)) return '게임'
  if (/(backend|frontend|fullstack|full-stack|web|mobile|developer|software|embedded|devops|data|ai|ml|security|cloud|solutions architect|it support|it\b|qa|tester|publisher|development|engineer(?!.*(production|process|electrical|mechanical)))/.test(s)) return 'IT/개발'
  if (/(design|ux|ui|graphic|artist|animator|rigger|modeler|motion|art director)/.test(s)) return '디자인'
  if (/(marketing|content|creator|influencer|growth|sns|media|editor|md\b|merchandis|booking|kol)/.test(s)) return '마케팅'
  if (/(sales|business development|account|kinh doanh|pre-?sales|trade|export|sourcing)/.test(s)) return '영업'
  if (/(hr|admin|office|assistant|secretary|general|operations|administration|hành chính|nhân sự|business$|non-it)/.test(s)) return 'HR/사무/운영'
  if (/(finance|accountant|kế toán|audit|tax|pháp lý|legal)/.test(s)) return '재무/회계'
  if (/(logistic|supply|import|warehouse|kho|purchas|procure|thu mua)/.test(s)) return '물류/구매'
  if (/(production|manufactur|mechanical|process|quality|qc|maintenance|electrical|technician|factory|kỹ sư|kỹ thuật|r&d|bảo trì|sản xuất|supervisor|worker)/.test(s)) return '생산/기술'
  if (/(pm|product|project|analyst|ba\b)/.test(s)) return 'PM/BA'
  return '기타비IT' }
// 공고 분류 — 회사가 고른 role 컬럼이 있으면 그걸 믿고(Non-IT/Other 는 제목으로), 없을 때만 제목 정규식.
// talent-gap-1019 는 role+제목 문자열에 /it\b/ 를 걸어 'Non-IT' 공고 33건이 전부 IT/개발로 들어갔다(Sunjin 축산·법무 등) — 여기서 고친다.
const GROUP_CAT = { it: 'IT/개발', data: 'IT/개발', design: '디자인', marketing: '마케팅', sales: '영업', hr: 'HR/사무/운영', office: 'HR/사무/운영', finance: '재무/회계', logistics: '물류/구매', manufacturing: '생산/기술', pm: 'PM/BA' }
const jcat = (j) => {
  const title = String(j.title || '')
  if (/(interpreter|translator|comtor|phiên dịch|biên dịch|thông dịch|통역|korean.?speaking|tiếng hàn)/i.test(title) || j.role === 'Interpreter') return '통번역/한국어사무'
  if (/(game|unity|playable)/i.test(title) || j.role === 'Game') return '게임'
  if (/(accountant|kế toán|audit|tax|pháp lý|legal)/i.test(title)) return '재무/회계'
  // Sunjin·BlueStar 축산·수의·사료 — 직군이 아니라 산업/전공으로 세야 하는 공고(아래 CAT_PRED)
  if (/(thú y|heo|gia cầm|thức ăn chăn nuôi|con giống|dinh dưỡng|sinh học|trại|chăn nuôi|veterinar|livestock|feed)/i.test(title)) return '축산/수의/사료'
  if (j.role && !/^(non-it|other)$/i.test(j.role)) return GROUP_CAT[roleGroupOf(j.role)] || cat(title)
  return cat(title.replace(/non-?it/gi, ''))
}
const CAT_GROUPS = { 'IT/개발': ['it', 'data'], '게임': ['it', 'design'], '디자인': ['design'], '마케팅': ['marketing'], '영업': ['sales'], 'HR/사무/운영': ['hr', 'office'], '재무/회계': ['finance'], '물류/구매': ['logistics'], '생산/기술': ['manufacturing'], 'PM/BA': ['pm'], '통번역/한국어사무': ['office', 'hr', 'sales'], '기타비IT': ['hr', 'office'], '축산/수의/사료': [] }
const CAT_ROLES = { '게임': ['Game'], '통번역/한국어사무': ['Interpreter / Translator', 'Secretary / Assistant', 'Admin / GA'] }
// 직군 대신 산업·전공으로 매칭하는 세그먼트
const CAT_PRED = { '축산/수의/사료': (p) => (p.cv_tags?.industries || []).includes('Agriculture / Livestock / Feed') || p.cv_tags?.major_category === 'Agriculture / Veterinary / Biology' }
const jobRegion = (s) => { s = String(s || '').toLowerCase(); if (!s.trim()) return '미기재'; if (/(hàn quốc|korea|서울|seoul)/.test(s)) return '한국'; if (/remote/.test(s)) return '원격'
  const hcm = /(hồ chí minh|ho chi minh|hcm|sài gòn|saigon|thủ đức|thu duc|district|quận|bình thạnh|tphcm|호치민|bình dương|binh duong|đồng nai|dong nai|long an)/.test(s), hn = /(hà nội|ha noi|hanoi|hn\b|하노이|bắc ninh|bac ninh|hưng yên|hung yen|hải phòng|hai phong)/.test(s), dn = /(đà nẵng|da nang|đn\b|다낭)/.test(s)
  if ([hcm, hn, dn].filter(Boolean).length > 1) return '다지역'; if (hcm) return 'HCM'; if (hn) return 'HN'; if (dn) return 'DN'; return '지방' }
const expBand = (m) => (m >= 36 ? '3y+' : m >= 12 ? '1-2y' : '0')

// 구 로직(talent-gap-1019): position/role/desired_roles/경력 직함 정규식 + korean_cert/전공 + location 정규식
const hasCert = (c) => !!c && !/^(none|no|không|없음|-|n\/a|0)$/i.test(String(c).trim())
const koMajor = (p) => /(hàn quốc|korean|korea|ngôn ngữ hàn|đông phương|oriental|한국어|한국학)/i.test(String(p.major || ''))
const oldKo = (p) => hasCert(p.korean_cert) || koMajor(p)
const oldCats = (p) => { const s = new Set([p.position, p.role, ...(p.desired_roles || []), ...(Array.isArray(p.experiences) ? p.experiences.slice(0, 3).map((e) => e.title || e.position) : [])].filter(Boolean).map(cat)); s.delete('(none)'); return s }
const oldRegion = (s) => { s = String(s || '').toLowerCase(); if (!s.trim()) return null; if (/(hồ chí minh|ho chi minh|hcm|sài gòn|saigon|thủ đức|thu duc|district|quận|bình thạnh|tphcm|bình dương|binh duong)/.test(s)) return 'HCM'; if (/(hà nội|ha noi|hanoi|hn\b)/.test(s)) return 'HN'; if (/(đà nẵng|da nang)/.test(s)) return 'DN'; return '기타' }

const [jobs, apps, profs, unsubs, bl] = await Promise.all([
  fetchAll(() => sb.from('jobs').select('id,source_id,title,company,role,location,experience_min,requirements,preferred,description,summary,is_active,created_at').eq('source', 'ktc').gte('created_at', '2026-08-15').order('created_at')),
  fetchAll(() => sb.from('job_applications').select('job_id,user_id').order('id')),
  fetchAll(() => sb.from('user_profiles').select('id,email,position,role,desired_roles,yoe_months,korean_cert,major,location,resume_url,experiences,cv_tags,updated_at').not('resume_url', 'is', null).order('created_at')),
  fetchAll(() => sb.from('events').select('user_id').eq('event', 'coldmail_unsub').not('user_id', 'is', null).order('id')),
  fetchBlacklist(),
])
const unsub = new Set(unsubs.map((u) => u.user_id))
const pool = profs.filter((p) => p.email && !/likelion/i.test(p.email) && !unsub.has(p.id) && !bl.has(p))
console.log('jobs', jobs.length, 'pool', pool.length, 'cv_tags', pool.filter((p) => p.cv_tags).length)
for (const p of pool) { p.__oc = oldCats(p); p.__or = oldRegion(p.location); p.__ok = oldKo(p); p.__g = roleGroupsOf(p); p.__r = rolesOf(p); p.__reg = regionOf(p); p.__y = yoeMonthsOf(p) ?? 0 }

const A = {}; for (const a of apps) A[a.job_id] = (A[a.job_id] || 0) + 1
const regionOk = (jr, pr) => jr === '다지역' || jr === '원격' || jr === '미기재' || jr === '한국' || !pr || pr === jr || (jr === '지방' && pr === 'HCM')
const rows = jobs.map((j) => {
  const t = [j.title, j.requirements, j.preferred, j.description, j.summary].join(' '); const ko = koStrong.test(t); const c = jcat(j); const r = jobRegion(j.location); const e = expBand((j.experience_min || 0) * 12); const minM = (j.experience_min || 0) * 12
  const oldPool = pool.filter((p) => p.__oc.has(c) && (!ko || p.__ok) && (p.yoe_months || 0) >= minM && regionOk(r, p.__or === '기타' ? '기타' : p.__or))
  const groups = CAT_GROUPS[c] || [], roles = CAT_ROLES[c] || []
  const roleOk = (p) => groups.some((g) => p.__g.has(g)) || roles.some((x) => p.__r.has(x)) || !!CAT_PRED[c]?.(p)
  const newAll = pool.filter((p) => roleOk(p) && (!ko || langAtLeast(p, 'korean', 'intermediate')) && p.__y >= minM && regionOk(r, ['HCM', 'HN', 'DN'].includes(p.__reg) ? p.__reg : p.__reg ? '기타' : null))
  const newBiz = ko ? newAll.filter((p) => langAtLeast(p, 'korean', 'business')) : newAll
  const active = newAll.filter((p) => Date.now() - new Date(p.updated_at || 0) <= 90 * 86400e3)
  return { code: j.source_id, company: j.company.slice(0, 12), title: j.title.slice(0, 28), cat: c, ko: ko ? 'KO' : '-', exp: e, region: r, 구풀: oldPool.length, 신풀: newAll.length, 'KO business': ko ? newBiz.length : '', '신풀 90일갱신': active.length, apps: A[j.id] || 0, active: j.is_active ? 'Y' : 'N' }
})
const unfilled = rows.filter((r) => r.apps < 5)
console.log('미달 공고(지원<5):', unfilled.length, '/', rows.length)
const seg = (key, label, rs) => { const g = {}; for (const r of rs) (g[key(r)] ||= []).push(r)
  tbl(label, Object.entries(g).sort((a, b) => b[1].length - a[1].length).map(([k, v]) => ({ 세그먼트: k, 공고: v.length, 구풀중위: med(v.map((r) => r.구풀)), 신풀중위: med(v.map((r) => r.신풀)), '신풀<30': v.filter((r) => r.신풀 < 30).length, '신풀<10': v.filter((r) => r.신풀 < 10).length, '90일갱신중위': med(v.map((r) => r['신풀 90일갱신'])) }))) }
seg((r) => r.cat, 'D1. 미달 공고 — 직군별 (구풀 vs 신풀)', unfilled)
seg((r) => r.cat + ' × ' + r.ko, 'D2. 미달 공고 — 직군 × 한국어', unfilled)
seg((r) => r.ko + ' × exp' + r.exp, 'D3. 미달 공고 — 한국어 × 경력', unfilled)
seg((r) => r.region, 'D4. 미달 공고 — 지역', unfilled)
tbl('D5. 미달 공고 중 신풀 < 30 (cv_tags 로도 못 채우는 공고 = 모아야 할 인재)', unfilled.filter((r) => r.신풀 < 30).sort((a, b) => a.신풀 - b.신풀))
tbl('D6. 미달 공고 중 신풀 ≥ 100 (풀은 있는데 못 보낸/안 온 공고 = 선별·발송 문제)', unfilled.filter((r) => r.신풀 >= 100).sort((a, b) => b.신풀 - a.신풀))

// 공급 측: KO 중급+ 인재의 직군/지역/경력 분포 — 어디가 비었나
const koP = pool.filter((p) => langAtLeast(p, 'korean', 'intermediate'))
const d = (arr, fn) => { const m = {}; for (const p of arr) { const k = fn(p) ?? '(없음)'; m[k] = (m[k] || 0) + 1 } return Object.entries(m).sort((a, b) => b[1] - a[1]) }
console.log('\n## S1. 한국어 중급+ 풀', koP.length, '명 (business+', pool.filter((p) => langAtLeast(p, 'korean', 'business')).length, ')')
tbl('S2. 한국어 중급+ × 직군 대분류 × 경력', d(koP, (p) => [...p.__g][0] || '(없음)').map(([g, n]) => { const arr = koP.filter((p) => ([...p.__g][0] || '(없음)') === g); return { 직군: g, 전체: n, '<1y': arr.filter((p) => p.__y < 12).length, '1-2y': arr.filter((p) => p.__y >= 12 && p.__y < 36).length, '3y+': arr.filter((p) => p.__y >= 36).length, HCM: arr.filter((p) => p.__reg === 'HCM').length, HN: arr.filter((p) => p.__reg === 'HN').length, DN: arr.filter((p) => p.__reg === 'DN').length, 'business+': arr.filter((p) => langAtLeast(p, 'korean', 'business')).length } }))
tbl('S3. 전체 풀 × 직군 대분류 × 경력 × 지역', d(pool, (p) => [...p.__g][0] || '(없음)').map(([g, n]) => { const arr = pool.filter((p) => ([...p.__g][0] || '(없음)') === g); return { 직군: g, 전체: n, '1y+': arr.filter((p) => p.__y >= 12).length, '3y+': arr.filter((p) => p.__y >= 36).length, HCM: arr.filter((p) => p.__reg === 'HCM').length, HN: arr.filter((p) => p.__reg === 'HN').length, DN: arr.filter((p) => p.__reg === 'DN').length, 'HN 1y+': arr.filter((p) => p.__reg === 'HN' && p.__y >= 12).length, KO중급: arr.filter((p) => langAtLeast(p, 'korean', 'intermediate')).length } }))
