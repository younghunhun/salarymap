// Labtobottle — Nhân viên Kinh doanh(HCM/HN/ĐN 온사이트, 18–20M, 9/28 Len 게재) 발송 풀 실측 (읽기 전용)
// JD: 베트남 시장 영업·유통 경험 필수 · 식품/음료/소비재 업계 경험 필수 · 한국 식품/주류 수출입·식품 인허가 경험 우대
//     · 회사: KAIST 출신 K-Brewery(막걸리 등 프리미엄 주류) 스타트업, 한국 F&B 베트남 유통 개척
import { sb, fetchAll, fetchBlacklist } from '../outreach/lib.mjs'

const JOB = '56ddf517-3b9d-42b5-9c82-d086c0ec830f'          // Labtobottle Nhân viên Kinh doanh
const PRIOR_LTB = '402528b3-7bef-4148-a2cf-78c3cae6221e'    // Labtobottle AI Digital Marketing Developer(9/22, 동일 회사)
const today = new Date().toISOString().slice(0, 10)
const weekAgoIso = new Date(Date.now() - 7 * 864e5).toISOString()
const d60Iso = new Date(Date.now() - 60 * 864e5).toISOString()

const norm = (v) => (Array.isArray(v) ? v.join(' ') : String(v || ''))
const txt = (p) => {
  const exp = Array.isArray(p.experiences) ? p.experiences.map((e) => `${e.title || e.position || ''} ${e.company || ''} ${e.description || ''}`).join(' ') : ''
  return [p.position, p.headline, norm(p.desired_roles), JSON.stringify(p.skills || ''), exp, JSON.stringify(p.resume_summary || ''), p.major].join(' ').toLowerCase()
}
const expTxt = (p) => (Array.isArray(p.experiences) ? p.experiences.map((e) => `${e.title || e.position || ''} ${e.company || ''} ${e.description || ''}`).join(' ') : '').toLowerCase()
const roles = (p) => [p.position, ...(p.desired_roles || [])].filter(Boolean)
const has = (p, r) => roles(p).includes(r)
const y = (p) => p.yoe_months ?? 0
const loc = (p) => String(p.location || '')
const noLoc = (p) => !loc(p).trim()
const inHcmc = (p) => /(h[ồo]\s*ch[íi]\s*minh|hcm|sài gòn|sai gon|saigon|thủ đức|thu duc|bình thạnh|binh thanh|bình dương|binh duong|đồng nai|dong nai|biên hòa|bien hoa|long an|호찌민|호치민)/i.test(loc(p))
const inHanoi = (p) => /(hà nội|ha noi|hanoi|bắc ninh|bac ninh|hưng yên|hung yen|하노이)/i.test(loc(p))
const inDanang = (p) => /(đà nẵng|da nang|danang|hội an|hoi an|quảng nam|quang nam|다낭)/i.test(loc(p))
const inCity = (p) => inHcmc(p) || inHanoi(p) || inDanang(p)
const isDev = (p) => roles(p).some((r) => /fullstack|backend|frontend|mobile|devops|ai engineer|data|embedded|game|qa|software|tech lead|cloud|sysadmin|network|dba|security/i.test(String(r)))

const salesRe = /(sales|kinh doanh|bán hàng|business development|account executive|account manager|key account|trade marketing|phát triển thị trường|phát triển kênh|nhà phân phối|đại lý|horeca|telesales|tư vấn bán hàng)/i
const salesTitleRe = /(nhân viên kinh doanh|chuyên viên kinh doanh|nhân viên bán hàng|sales (executive|representative|staff|associate|consultant|manager|supervisor|leader|admin|engineer)|business development|account (executive|manager)|key account|trưởng nhóm kinh doanh|giám sát bán hàng|quản lý kinh doanh)/i
const fnbRe = /(thực phẩm|food|f&b|đồ uống|beverage|nước giải khát|bia|beer|rượu|wine|spirits|liquor|soju|makgeolli|đồ ăn|nông sản|agri|fmcg|hàng tiêu dùng|consumer goods|siêu thị|supermarket|winmart|co\.?opmart|bách hóa|lotte mart|aeon|emart|go!|big c|retail|bán lẻ|phân phối|distribut|horeca|nhà hàng|restaurant|quán|cửa hàng tiện lợi|convenience|circle k|gs25|k-?food|nhân sâm|ginseng|kimchi|mì|snack|bánh kẹo|sữa|dairy|cà phê|coffee|trà|tea)/i
const fnbStrictRe = /(thực phẩm|food|f&b|đồ uống|beverage|nước giải khát|bia|beer|rượu|wine|spirits|liquor|soju|makgeolli|nông sản|fmcg|hàng tiêu dùng|consumer goods|horeca|k-?food|nhân sâm|ginseng|kimchi|snack|bánh kẹo|sữa|dairy|cà phê|coffee)/i
const distRe = /(phân phối|distribut|nhà phân phối|đại lý|kênh gt|kênh mt|general trade|modern trade|siêu thị|supermarket|bán lẻ|retail|wholesale|bán buôn|bán sỉ|horeca)/i
const imexRe = /(xuất nhập khẩu|xuat nhap khau|nhập khẩu|xuất khẩu|import|export|imex|hải quan|customs|logistics|forwarder|thủ tục|giấy phép|công bố sản phẩm|an toàn thực phẩm|food safety|vệ sinh an toàn|đăng ký sản phẩm|product registration|cấp phép|licens)/i
const koRe = /(korean|tiếng hàn|topik|한국어|hàn quốc|korea|hàn)/i
const koSig = (p) => !!p.korean_cert || koRe.test(p.__t)
const enRe = /(english|tiếng anh|ielts|toefl|toeic)/i
const enSig = (p) => !!p.english_cert || enRe.test(p.__t)

const bl = await fetchBlacklist()
const [pool, unsubs, recs, apps, priorRecs, todays, recent, salesApps, salesClicks, jobs] = await Promise.all([
  fetchAll(() => sb.from('user_profiles')
    .select('id,email,full_name,position,desired_roles,yoe_months,location,english_cert,korean_cert,skills,resume_summary,headline,experiences,university,major,graduation_year,is_resume_public,created_at')
    .not('email', 'is', null).not('resume_url', 'is', null).order('created_at', { ascending: false })),
  fetchAll(() => sb.from('events').select('user_id').eq('event', 'coldmail_unsub').not('user_id', 'is', null).order('id')),
  fetchAll(() => sb.from('job_recommendations').select('user_id').eq('job_id', JOB).order('id')),
  fetchAll(() => sb.from('job_applications').select('user_id').eq('job_id', JOB).order('id')),
  fetchAll(() => sb.from('job_recommendations').select('user_id').eq('job_id', PRIOR_LTB).order('id')),
  fetchAll(() => sb.from('job_recommendations').select('user_id').gte('created_at', today).order('id')),
  fetchAll(() => sb.from('job_recommendations').select('user_id').gte('created_at', weekAgoIso).order('id')),
  fetchAll(() => sb.from('job_applications').select('user_id,job_id').gte('created_at', d60Iso).order('id')),
  fetchAll(() => sb.from('events').select('user_id,meta').eq('event', 'recommend_click').gte('created_at', d60Iso).order('id')),
  fetchAll(() => sb.from('jobs').select('id,title,role').order('id')),
])
const unsubSet = new Set(unsubs.map((r) => r.user_id))
const sent = new Set([...recs.map((r) => r.user_id), ...apps.map((r) => r.user_id)])
const priorSet = new Set(priorRecs.map((r) => r.user_id))
const todaySet = new Set(todays.map((r) => r.user_id))
const cnt7 = {}
for (const r of recent) cnt7[r.user_id] = (cnt7[r.user_id] || 0) + 1
const tired = (p) => (cnt7[p.id] || 0) >= 3
const salesJob = new Set(jobs.filter((j) => /sales|kinh doanh|bán hàng|business dev|showroom|md\b|merchandis/i.test(j.title) || /^sales/i.test(j.role || '')).map((j) => j.id))
const behav = new Set()
for (const a of salesApps) if (salesJob.has(a.job_id)) behav.add(a.user_id)
for (const e of salesClicks) if (/sales|showroom|yooha|systeel|kinh-?doanh/i.test(String(e.meta?.campaign || ''))) behav.add(e.user_id)

const seen = new Set()
const base = []
for (const p of pool) {
  if (!p.email || /likelion/i.test(p.email)) continue
  const e = p.email.toLowerCase()
  if (seen.has(e) || unsubSet.has(p.id) || bl.has(p)) continue
  seen.add(e); p.__t = txt(p); p.__e = expTxt(p); base.push(p)
}
console.log(`베이스(이력서·이메일·unsub/blacklist/likelion 제외): ${base.length}명 · 이 공고 기발송/기지원 ${sent.size}명 · 이전 Labtobottle 마케팅(9/22) 기발송 ${priorSet.size}명 · 당일(${today}) recommend 기수신 ${todaySet.size}명 · 60일 영업공고 지원/클릭 행동시그널 ${behav.size}명`)

const layer = (label, arr) => {
  const t = arr.filter((p) => todaySet.has(p.id)).length
  const tr = arr.filter(tired).length
  const pr = arr.filter((p) => priorSet.has(p.id)).length
  console.log(`  ${label}: ${arr.length}명${t ? ` (당일 겹침 ${t})` : ''}${tr ? ` (7일 3통+ ${tr})` : ''}${pr ? ` (LTB 마케팅 기발송 ${pr})` : ''}`)
  return arr
}
const preview = (arr, n = 10) => {
  for (const p of arr.slice(0, n))
    console.log(`     · ${p.full_name} <${p.email}> · ${p.position || '?'} · ${Math.round(y(p) / 12 * 10) / 10}y · ${String(p.location || '위치?').slice(0, 22)}${fnbStrictRe.test(p.__t) ? ' · F&B' : ''}${distRe.test(p.__t) ? ' · 유통' : ''}${imexRe.test(p.__t) ? ' · 수출입' : ''}${koSig(p) ? ' · KO' : ''}${enSig(p) ? ' · EN' : ''}${behav.has(p.id) ? ' · 행동' : ''}${p.is_resume_public ? ' · 공개' : ''}`)
}
const ready = (arr) => arr.filter((p) => !todaySet.has(p.id) && !tired(p))

const fresh = base.filter((p) => !sent.has(p.id))
const sales = layer('영업 시그널(Sales/BizDev 직군 or 영업 경력 텍스트, 비개발) 전국·경력무관', fresh.filter((p) => !isDev(p) && (has(p, 'Sales') || has(p, 'Business Dev') || salesRe.test(p.__e))))
layer('  └ 지역: HCMC권', sales.filter(inHcmc))
layer('  └ 지역: 하노이권', sales.filter(inHanoi))
layer('  └ 지역: 다낭권', sales.filter(inDanang))
layer('  └ 지역: 미기재', sales.filter(noLoc))
layer('  └ 지역: 그 외(3도시 밖, 제외)', sales.filter((p) => !inCity(p) && !noLoc(p)))
const salesLoc = layer('  └ 3도시/미기재', sales.filter((p) => inCity(p) || noLoc(p)))
layer('    └ 0~1y (JD "경력자" 요구, 참고)', salesLoc.filter((p) => y(p) < 12))
const exp1 = layer('    └ ≥1y (경력 영업)', salesLoc.filter((p) => y(p) >= 12))
const exp2 = layer('    └ ≥2y', salesLoc.filter((p) => y(p) >= 24))
layer('    └ ≥3y', salesLoc.filter((p) => y(p) >= 36))

console.log('\n코어 게이트 — ≥1y 영업 × 3도시/미기재')
layer('  F&B/소비재/리테일/유통 텍스트(넓게)', exp1.filter((p) => fnbRe.test(p.__t)))
const core = layer('  F&B/FMCG/소비재 업계 텍스트(엄격)', exp1.filter((p) => fnbStrictRe.test(p.__t)))
layer('    └ 유통(NPP/GT·MT/리테일) 텍스트도 있음', core.filter((p) => distRe.test(p.__t)))
layer('    └ 수출입/인허가 텍스트(우대)', core.filter((p) => imexRe.test(p.__t)))
layer('    └ 한국어/한국 시그널', core.filter(koSig))
layer('    └ 영업 직함 명시', core.filter((p) => salesTitleRe.test(p.__e)))
layer('    └ HCMC', core.filter(inHcmc)); layer('    └ 하노이', core.filter(inHanoi)); layer('    └ 다낭', core.filter(inDanang)); layer('    └ 미기재', core.filter(noLoc))
const coreReady = layer('    └ 즉시 발송 가능(당일·7일 3통+ 제외)', ready(core))
layer('      └ 그중 공개 이력서', coreReady.filter((p) => p.is_resume_public))
const dist = layer('  유통/리테일 텍스트(F&B 명시 없음)', exp1.filter((p) => !fnbStrictRe.test(p.__t) && distRe.test(p.__t)))
layer('    └ 즉시 발송 가능', ready(dist))
const imex = layer('  수출입/인허가 텍스트(F&B·유통 명시 없음)', exp1.filter((p) => !fnbStrictRe.test(p.__t) && !distRe.test(p.__t) && imexRe.test(p.__t)))
layer('    └ 즉시 발송 가능', ready(imex))
const rest1 = layer('  나머지 ≥1y 영업(업계 시그널 없음)', exp1.filter((p) => !fnbStrictRe.test(p.__t) && !distRe.test(p.__t) && !imexRe.test(p.__t)))
layer('    └ 영업 직함 명시', rest1.filter((p) => salesTitleRe.test(p.__e)))
layer('    └ 한국어/한국 시그널', rest1.filter(koSig))
layer('    └ 즉시 발송 가능', ready(rest1))

console.log('\n행동 시그널 — 60일 내 영업공고 지원/클릭 × 3도시/미기재 × 비개발')
const bh = layer('  전체', fresh.filter((p) => behav.has(p.id) && !isDev(p) && (inCity(p) || noLoc(p))))
layer('    └ ≥1y', bh.filter((p) => y(p) >= 12))
layer('    └ 영업 시그널 풀과 겹침', bh.filter((p) => sales.includes(p)))
layer('    └ 영업 시그널 풀에 없음(추가분)', bh.filter((p) => !sales.includes(p)))
const bhAdd = bh.filter((p) => !sales.includes(p) && y(p) >= 12)
layer('      └ 그중 ≥1y', bhAdd)

console.log('\n확장 — 0~1y 영업 시그널 × 3도시/미기재 × F&B/유통 텍스트 (JD 경력 요건 미달, 보류 후보)')
const jr = layer('  전체', salesLoc.filter((p) => y(p) < 12 && (fnbStrictRe.test(p.__t) || distRe.test(p.__t))))
layer('    └ 즉시 발송 가능', ready(jr))

console.log('\n요약 — 발송 시나리오(즉시 발송 가능 기준, 중복 제거)')
const uniq = (...arrs) => { const s = new Set(); const out = []; for (const a of arrs) for (const p of a) if (!s.has(p.id)) { s.add(p.id); out.push(p) } return out }
const A = ready(core)
const B = ready(uniq(core, dist, imex))
const C = ready(uniq(core, dist, imex, bhAdd))
const D = ready(uniq(exp1, bhAdd))
console.log(`  A 타이트: ≥1y 영업 × F&B/FMCG 업계 명시 = ${A.length}명`)
console.log(`  B 중간: A + 유통/리테일 or 수출입/인허가 텍스트 = ${B.length}명`)
console.log(`  C 중간+행동: B + 60일 영업공고 지원/클릭 ≥1y(영업텍스트 없음) = ${C.length}명`)
console.log(`  D 넓게: ≥1y 영업 시그널 전체 + 행동 = ${D.length}명`)

console.log('\nA 미리보기'); preview(A, 20)
console.log('\nB-A 미리보기'); preview(B.filter((p) => !A.includes(p)), 12)
console.log('\n행동 추가분 미리보기'); preview(ready(bhAdd), 8)
