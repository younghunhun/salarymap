// 읽기 전용: 모집중(is_active) KTC 공고별 — cv_tags 기준 매칭 풀에서 기발송(job_recommendations)·지원자를 뺀 잔여 발송 가능 풀. TO(headcount/recruit_count) 대비 지원·스크리닝 현황 포함.
import { sb, fetchAll, fetchBlacklist } from '../outreach/lib.mjs'
import { rolesOf, roleGroupsOf, roleGroupOf, langAtLeast, yoeMonthsOf, regionOf } from '../../lib/cvTagsMatch.js'
const PASS = new Set(['passed', 'ready_to_forward', 'sent_to_company', 'interviewing', 'offer', 'final_passed'])
const tbl = (title, rows) => { console.log('\n## ' + title); const cols = [...new Set(rows.flatMap((r) => Object.keys(r)))]; console.log(cols.join('\t')); for (const r of rows) console.log(cols.map((c) => r[c] ?? '').join('\t')) }
const koStrong = /(한국어\s*(능숙|가능|필수|우대)|korean[- ]speaking|korean speaker|tiếng hàn|topik\s*[3-6]|comtor|interpreter|phiên dịch|thông dịch|통역|한국어)/i

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

const [jobs, recs, apps, cands, profs, unsubs, bl] = await Promise.all([
  fetchAll(() => sb.from('jobs').select('id,source_id,title,company,role,location,experience_min,headcount,recruit_count,requirements,preferred,description,summary,created_at,deadline,close_date').eq('source', 'ktc').eq('is_active', true).order('created_at')),
  fetchAll(() => sb.from('job_recommendations').select('job_id,user_id,created_at').order('id')),
  fetchAll(() => sb.from('job_applications').select('job_id,user_id').order('id')),
  fetchAll(() => sb.from('ktc_candidates').select('job_code,pipeline_status').order('id')),
  fetchAll(() => sb.from('user_profiles').select('id,email,position,desired_roles,yoe_months,korean_cert,location,resume_url,cv_tags,updated_at').not('resume_url', 'is', null).not('email', 'is', null).order('created_at')),
  fetchAll(() => sb.from('events').select('user_id').eq('event', 'coldmail_unsub').not('user_id', 'is', null).order('id')),
  fetchBlacklist(),
])
const unsub = new Set(unsubs.map((u) => u.user_id)), seen = new Set()
const pool = profs.filter((p) => { if (/likelion/i.test(p.email) || unsub.has(p.id) || bl.has(p)) return false; const e = p.email.toLowerCase(); if (seen.has(e)) return false; seen.add(e); return true })
for (const p of pool) { p.__g = roleGroupsOf(p); p.__r = rolesOf(p); p.__reg = regionOf(p); p.__y = yoeMonthsOf(p) ?? 0; p.__fresh = Date.now() - new Date(p.updated_at || 0) <= 90 * 86400e3 }
const week = Date.now() - 7 * 86400e3
const recByJob = {}, recAny7d = new Set(), appByJob = {}, C = {}
for (const r of recs) { (recByJob[r.job_id] ||= new Set()).add(r.user_id); if (new Date(r.created_at) >= week) recAny7d.add(r.user_id) }
for (const a of apps) (appByJob[a.job_id] ||= new Set()).add(a.user_id)
for (const c of cands) if (c.job_code) { C[c.job_code] ||= { n: 0, pass: 0 }; C[c.job_code].n++; if (PASS.has(c.pipeline_status)) C[c.job_code].pass++ }
const regionOk = (jr, pr) => jr === '다지역' || jr === '원격' || jr === '미기재' || jr === '한국' || !pr || pr === jr || (jr === '지방' && pr === 'HCM')
console.log('모집중 공고', jobs.length, '· 풀', pool.length, '· 최근 7일 recommend 수신자', recAny7d.size)

const rows = jobs.map((j) => {
  const t = [j.title, j.requirements, j.preferred, j.description, j.summary].join(' '); const ko = koStrong.test(t); const c = jcat(j); const r = jobRegion(j.location); const minM = (j.experience_min || 0) * 12
  const groups = CAT_GROUPS[c] || [], roles = CAT_ROLES[c] || []
  const roleOk = (p) => groups.some((g) => p.__g.has(g)) || roles.some((x) => p.__r.has(x)) || !!CAT_PRED[c]?.(p)
  const match = pool.filter((p) => roleOk(p) && (!ko || langAtLeast(p, 'korean', 'intermediate')) && p.__y >= minM && regionOk(r, ['HCM', 'HN', 'DN'].includes(p.__reg) ? p.__reg : p.__reg ? '기타' : null))
  const sent = recByJob[j.id] || new Set(), applied = appByJob[j.id] || new Set()
  const remain = match.filter((p) => !sent.has(p.id) && !applied.has(p.id))
  const remainCool = remain.filter((p) => !recAny7d.has(p.id))
  const to = j.headcount || j.recruit_count || null
  return { code: j.source_id, company: String(j.company).slice(0, 12), title: String(j.title).slice(0, 28), cat: c, ko: ko ? 'KO' : '-', exp: j.experience_min || 0, region: r, TO: to, 지원: applied.size, 스크리닝: C[j.source_id]?.n || 0, 서류합격: C[j.source_id]?.pass || 0, 매칭풀: match.length, 기발송: [...sent].filter((id) => match.some((p) => p.id === id)).length, 잔여: remain.length, '잔여(7일쿨)': remainCool.length, '잔여 90일갱신': remainCool.filter((p) => p.__fresh).length, 게시: j.created_at.slice(5, 10) }
})
// 부족한 공고 = 서류합격 < TO (TO 없으면 지원 < 5)
const short = rows.filter((r) => (r.TO ? r.서류합격 < r.TO : r.지원 < 5))
console.log('TO 미충족(서류합격<TO, TO 없으면 지원<5):', short.length, '/', rows.length)
tbl('A. TO 미충족 공고 중 잔여 발송 풀 ≥ 30 (추가 발송 가능)', short.filter((r) => r['잔여(7일쿨)'] >= 30).sort((a, b) => b['잔여(7일쿨)'] - a['잔여(7일쿨)']))
tbl('B. TO 미충족 공고 중 잔여 < 30 (풀 소진·공백)', short.filter((r) => r['잔여(7일쿨)'] < 30).sort((a, b) => a['잔여(7일쿨)'] - b['잔여(7일쿨)']))
const byCat = {}; for (const r of short) { (byCat[r.cat] ||= { 공고: 0, 잔여합: 0, 잔여30이상: 0 }); byCat[r.cat].공고++; byCat[r.cat].잔여합 += r['잔여(7일쿨)']; if (r['잔여(7일쿨)'] >= 30) byCat[r.cat].잔여30이상++ }
tbl('C. 세그먼트 요약', Object.entries(byCat).sort((a, b) => b[1].공고 - a[1].공고).map(([k, v]) => ({ 세그먼트: k, ...v })))
