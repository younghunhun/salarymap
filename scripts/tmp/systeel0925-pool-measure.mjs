// SY STEEL VINA 6공고(9/25 Len 게재) 발송 풀 실측 (읽기 전용)
//   V196 Kế toán thanh toán(회계, 동나이 Nhơn Trạch, 무경력 OK·회계 전공·Excel·영어 기본)
//   V197 Nhân viên kho(창고, 동나이, 입출고 재고관리 경험·영어 기본)
//   V199 Salesman(하노이, 대졸·경제/무역/마케팅/경영 우대·신입 OK·영어 회화)
//   V200 Sales Manager(하노이, 3y+·철강/판넬/건자재 업계 우대·영어)
//   V201 QC(동나이, 전문대+·무경력 OK·남성 우대·영어 기본)
//   V202 R&D(동나이, 전문대+·무경력 OK·남성 우대·영어 기본)
import { sb, fetchAll } from '/Users/wiseungju/salarymap/scripts/outreach/lib.mjs'

const today = new Date().toISOString().slice(0, 10)
const norm = (v) => (Array.isArray(v) ? v.join(' ') : String(v || ''))
const txt = (p) => {
  const exp = Array.isArray(p.experiences) ? p.experiences.map((e) => `${e.title || e.position || ''} ${e.company || ''} ${e.description || ''}`).join(' ') : ''
  return [p.position, p.headline, norm(p.desired_roles), JSON.stringify(p.skills || ''), exp, JSON.stringify(p.resume_summary || ''), p.major, p.university].join(' ').toLowerCase()
}
const expTxt = (p) => (Array.isArray(p.experiences) ? p.experiences.map((e) => `${e.title || e.position || ''} ${e.company || ''}`).join(' ') : '').toLowerCase()
const roles = (p) => [p.position, ...(p.desired_roles || [])].filter(Boolean)
const has = (p, r) => roles(p).includes(r)
const y = (p) => p.yoe_months ?? 0
const majorTxt = (p) => String(p.major || '').toLowerCase()

const loc = (p) => String(p.location || '')
const noLoc = (p) => !loc(p).trim()
const inDongNai = (p) => /(đồng nai|dong nai|nhơn trạch|nhon trach|biên hòa|bien hoa|long thành|long thanh)/i.test(loc(p))
const inSouth = (p) => inDongNai(p) || /(h[ồo]\s*ch[íi]\s*minh|hcm|sài gòn|sai gon|saigon|thủ đức|thu duc|bình dương|binh duong|vũng tàu|vung tau|bà rịa|ba ria|long an)/i.test(loc(p))
const inHanoi = (p) => /(hà nội|ha noi|hanoi|bắc ninh|bac ninh|hưng yên|hung yen|vĩnh phúc|vinh phuc|hà đông|ha dong)/i.test(loc(p))

const enRe = /(english|tiếng anh|ielts|toefl|toeic)/i
const enSig = (p) => !!p.english_cert || enRe.test(p.__t)

// 직무 시그널
const acctRe = /(kế toán|ke toan|accountant|accounting|thanh toán|công nợ|kiểm toán|auditor|tài chính kế toán)/i
const acctMajor = /(kế toán|ke toan|accounting|accountancy|tài chính|finance|kiểm toán|auditing)/i
const whRe = /(warehouse|(?:^|\s)kho(?=[\s,.;:)\/]|$)|thủ kho|kho vận|nhập kho|xuất kho|inventory|xuất nhập tồn|logistics|supply chain)/i
const salesRe = /(sales|kinh doanh|bán hàng|business development|account executive|account manager)/i
const salesMajor = /(kinh tế|economics|ngoại thương|foreign trade|marketing|quản trị kinh doanh|business admin|thương mại|commerce|international business)/i
const steelRe = /(thép|steel|tôn|panel|vlxd|vật liệu xây dựng|construction material|building material|cửa|door|thiết bị công nghiệp|industrial equipment)/i
const qcRe = /(\bqc\b|quality control|kiểm tra chất lượng|kiểm soát chất lượng|\bqa\/qc\b|quality inspector|\bkcs\b)/i
const rdRe = /(r&d|r & d|research and development|research & development|nghiên cứu và phát triển|nghiên cứu phát triển|lab technician|laboratory|phòng thí nghiệm|material engineer|kỹ sư vật liệu)/i
const techMajor = /(hóa học|hoá học|hóa hữu cơ|hóa dầu|chemistry|chemical|vật liệu|material|cơ khí|mechanical|luyện kim|metallurg|polymer|vật lý|physics|điện tử|electronic|điện|electrical|tự động|automation|thực phẩm|food tech|sinh học|biotech|công nghiệp|industrial|môi trường|environment|xây dựng|civil)/i
const softwareMajor = /(software|phần mềm|information technology|công nghệ thông tin|computer science|khoa học máy tính|multimedia|đa phương tiện|design|thiết kế|marketing|business|kinh doanh|game)/i

const [pool, unsubs, todays] = await Promise.all([
  fetchAll(() => sb.from('user_profiles')
    .select('id,email,full_name,position,desired_roles,yoe_months,location,english_cert,korean_cert,skills,resume_summary,headline,experiences,university,major,graduation_year,created_at')
    .not('email', 'is', null).not('resume_url', 'is', null).order('created_at', { ascending: false })),
  fetchAll(() => sb.from('events').select('user_id').eq('event', 'coldmail_unsub').not('user_id', 'is', null).order('id')),
  fetchAll(() => sb.from('job_recommendations').select('user_id').gte('created_at', today).order('id')),
])
const unsubSet = new Set(unsubs.map((r) => r.user_id))
const todaySet = new Set(todays.map((r) => r.user_id))
const seen = new Set()
const base = []
for (const p of pool) {
  if (!p.email || /likelion/i.test(p.email)) continue
  const e = p.email.toLowerCase()
  if (seen.has(e) || unsubSet.has(p.id)) continue
  seen.add(e); p.__t = txt(p); p.__e = expTxt(p); base.push(p)
}
console.log(`베이스: ${base.length}명 · 당일(${today}) recommend 기수신 ${todaySet.size}명`)
console.log(`지역 분포 — 남부권(HCMC/동나이/빈즈엉/BR-VT/롱안) ${base.filter(inSouth).length} · 그중 동나이 ${base.filter(inDongNai).length} · 하노이권 ${base.filter(inHanoi).length} · 미기재 ${base.filter(noLoc).length}`)
const isDev = (p) => roles(p).some((r) => /fullstack|backend|frontend|mobile|devops|ai engineer|data|web|embedded|game|qa|software|tech lead|cloud|sysadmin|network|dba|security/i.test(String(r)))

const layer = (label, arr) => {
  const t = arr.filter((p) => todaySet.has(p.id)).length
  console.log(`  ${label}: ${arr.length}명${t ? ` (당일 겹침 ${t})` : ''}`)
  return arr
}
const preview = (arr, n = 8) => {
  for (const p of arr.slice(0, n))
    console.log(`     · ${p.full_name} <${p.email}> · ${p.position || '?'} · ${Math.round(y(p) / 12 * 10) / 10}y · ${String(p.location || '위치?').slice(0, 24)} · 전공=${String(p.major || '-').slice(0, 30)}${p.english_cert ? ' · EN' : ''}`)
}

// ── V196 회계(동나이) ──
console.log(`\n[V196] Kế toán thanh toán — 동나이 Nhơn Trạch · 무경력 OK · 회계 전공 · 영어 기본`)
const acct = base.filter((p) => has(p, 'Finance') || acctRe.test(p.__t) || acctMajor.test(majorTxt(p)))
layer('회계/재무 시그널 전국', acct)
const acctS = acct.filter((p) => inSouth(p) || noLoc(p))
layer('  └ 남부권/미기재', acctS)
const acctCore = layer('    └ 회계 전공 or 회계 직무경험(코어)', acctS.filter((p) => !isDev(p) && (acctMajor.test(majorTxt(p)) || acctRe.test(p.__e))))
layer('      └ 동나이 거주', acctCore.filter(inDongNai))
layer('      └ 영어 시그널', acctCore.filter(enSig))
preview(acctCore)

// ── V197 창고(동나이) ──
console.log(`\n[V197] Nhân viên kho — 동나이 · 입출고 재고관리 경험 · 영어 기본`)
const wh = base.filter((p) => has(p, 'Warehouse') || has(p, 'Logistics') || whRe.test(p.__t))
layer('창고/물류 시그널 전국', wh)
const whS = wh.filter((p) => inSouth(p) || noLoc(p))
layer('  └ 남부권/미기재', whS)
const whCore = layer('    └ 창고/재고 직무경험 명시(코어)', whS.filter((p) => !isDev(p) && (has(p, 'Warehouse') || whRe.test(p.__e))))
layer('      └ 동나이 거주', whCore.filter(inDongNai))
preview(whCore)

// ── V199 Salesman(하노이, 신입 OK) ──
console.log(`\n[V199] Salesman — 하노이 · 대졸 · 경제/무역/마케팅/경영 우대 · 신입 OK · 영어 회화`)
const sales = base.filter((p) => has(p, 'Sales') || has(p, 'Business Dev') || salesRe.test(p.__e))
layer('영업 시그널(직군 or 영업 경력) 전국', sales)
const salesHN = layer('  └ 하노이권/미기재', sales.filter((p) => inHanoi(p) || noLoc(p)))
layer('    └ 하노이 거주만', salesHN.filter(inHanoi))
layer('    └ 영어 시그널', salesHN.filter(enSig))
const salesMaj = base.filter((p) => !sales.includes(p) && salesMajor.test(majorTxt(p)) && (inHanoi(p) || noLoc(p)) && y(p) <= 24 && !isDev(p))
layer('  확장: 영업 시그널 없는 경제/무역/마케팅/경영 전공 ≤2y 하노이권/미기재(비개발)', salesMaj)
preview(salesHN)

// ── V200 Sales Manager(하노이, 3y+) ──
console.log(`\n[V200] Sales Manager — 하노이 · 영업 3y+ · 철강/판넬/건자재 업계 우대 · 영어`)
const sm = sales.filter((p) => y(p) >= 36)
layer('영업 시그널 × 3y+ 전국', sm)
const smHN = layer('  └ 하노이권/미기재', sm.filter((p) => inHanoi(p) || noLoc(p)))
layer('    └ 철강/건자재/산업장비 업계 시그널', smHN.filter((p) => steelRe.test(p.__t)))
layer('    └ 영어 시그널', smHN.filter(enSig))
layer('  참고: 3y+ 영업 × 철강/건자재 전국(이주 필요)', sm.filter((p) => steelRe.test(p.__t)))
preview(smHN)

// ── V201 QC(동나이, fresher) ──
console.log(`\n[V201] QC — 동나이 · 전문대+ · 무경력 OK · 남성 우대 · 영어 기본 (제조 QC, 소프트웨어 QA 아님)`)
const qc = base.filter((p) => has(p, 'QC') || (!isDev(p) && (qcRe.test(p.__e) || qcRe.test(String(p.position || '')) || qcRe.test(String(p.headline || '')))))
layer('제조 QC 시그널(직군 QC or QC 텍스트, 개발/QA 직군 제외) 전국', qc)
const qcS = layer('  └ 남부권/미기재', qc.filter((p) => inSouth(p) || noLoc(p)))
layer('    └ 동나이 거주', qcS.filter(inDongNai))
const techFresh = base.filter((p) => !isDev(p) && techMajor.test(majorTxt(p)) && !softwareMajor.test(majorTxt(p)) && y(p) <= 24 && (inSouth(p) || noLoc(p)))
layer('  확장: 공학/화학/재료 전공 ≤2y 남부권/미기재(비개발) — QC·R&D 공용 후보', techFresh)
layer('    └ 동나이 거주', techFresh.filter(inDongNai))
preview(qcS)

// ── V202 R&D(동나이, fresher) ──
console.log(`\n[V202] R&D — 동나이 · 전문대+ · 무경력 OK · 남성 우대 · 영어 기본`)
const rd = base.filter((p) => !isDev(p) && (rdRe.test(p.__e) || rdRe.test(String(p.position || '')) || rdRe.test(String(p.headline || '')) || rdRe.test(majorTxt(p))))
layer('R&D/연구/실험실 시그널(비개발) 전국', rd)
const rdS = layer('  └ 남부권/미기재', rd.filter((p) => inSouth(p) || noLoc(p)))
layer('    └ 동나이 거주', rdS.filter(inDongNai))
layer('  확장: 위 공학/화학/재료 전공 ≤2y 남부권 풀과 동일', techFresh)
preview(rdS)
console.log(`\n  공학/화학/재료 전공 풀 미리보기(QC·R&D 공용)`)
preview(techFresh, 12)

// 겹침
const ids = (a) => new Set(a.map((p) => p.id))
const inter = (a, b) => [...ids(a)].filter((i) => ids(b).has(i)).length
console.log(`\n겹침 — 회계코어∩창고코어 ${inter(acctCore, whCore)} · 영업HN∩SM HN ${inter(salesHN, smHN)}(SM은 영업HN 부분집합) · QC남부∩R&D남부 ${inter(qcS, rdS)} · QC남부∩공학전공 ${inter(qcS, techFresh)} · R&D남부∩공학전공 ${inter(rdS, techFresh)}`)
