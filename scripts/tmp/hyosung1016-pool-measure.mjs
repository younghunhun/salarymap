// HS Hyosung V249~V254 (10/16 Len 등록, Nhơn Trạch 5 IZ Đồng Nai 온사이트 · HCM(7군/Thủ Đức/Văn Thánh)·BR-VT·ĐN 셔틀 · 기숙사) 발송 풀 실측 (읽기 전용)
// V249 한국어 직원(경력 2y+ 내부감사/프로세스/리스크 · 한국어 능숙) · V250 한국어 직원(신입 · 한국어/한국학 전공) · V251 생산 엔지니어(화학/재료/기계/자동화/산업경영)
// V252 생산 엔지니어-IP(생산/산업/제조/기계공학) · V253 수입 담당(경제/무역/물류 · 영어) · V254 영업(중국어 · 대만/중국 시장 · 영어+중국어)
import { sb, fetchAll, fetchBlacklist } from '../outreach/lib.mjs'
const today = new Date().toISOString().slice(0, 10)
const expTitles = (p) => (Array.isArray(p.experiences) ? p.experiences.map((e) => `${e.title || e.position || ''}`).join(' | ') : '')
const exp = (p) => (Array.isArray(p.experiences) ? p.experiences.map((e) => `${e.title || e.position || ''} ${e.company || ''} ${e.description || ''}`).join(' ') : '')
const txt = (p) => (JSON.stringify(p.skills || '') + ' ' + String(p.position || '') + ' ' + String(p.headline || '') + ' ' + JSON.stringify(p.desired_roles || '') + ' ' + JSON.stringify(p.resume_summary || '') + ' ' + exp(p) + ' ' + String(p.major || '') + ' ' + JSON.stringify(p.certs || '') + ' ' + JSON.stringify(p.projects || '')).toLowerCase()
const roles = (p) => [p.position, ...(p.desired_roles || [])].filter(Boolean)
const y = (p) => p.yoe_months ?? 0
const hcmRe = /(h[ồo]\s*ch[íi]\s*minh|hcm|sài gòn|sai gon|saigon|thủ đức|thu duc|bình thạnh|bình dương|binh duong|đồng nai|dong nai|biên hòa|bien hoa|nhơn trạch|nhon trach|long an|vũng tàu|vung tau|bà rịa|ba ria|호치민|호찌민|동나이|hóc môn|gò vấp|go vap|tân bình|tân phú|bình tân|phú nhuận|củ chi|nhà bè|bình chánh|quận \d|district \d|tphcm|tp\.?\s*hcm)/i
const dnRe = /(đồng nai|dong nai|biên hòa|bien hoa|nhơn trạch|nhon trach|vũng tàu|vung tau|bà rịa|ba ria|동나이)/i
const city = (p) => { const l = String(p.location || ''); if (!l.trim()) return '미기재'; if (dnRe.test(l)) return 'ĐN/BRVT'; if (hcmRe.test(l)) return 'HCM권'; return '기타' }
const locOk = (p) => city(p) !== '기타'
const koCert = (p) => String(p.korean_cert || '').trim()
const hasCert = (c) => !!c && !/^(none|no|không|없음|-|n\/a)$/i.test(c)
const koMajor = (p) => /(hàn quốc|korean|korea|ngôn ngữ hàn|đông phương|oriental|한국어|한국학)/i.test(String(p.major || ''))
const koOk = (p) => hasCert(koCert(p)) || koMajor(p) || /(topik|tiếng hàn|korean|한국어)/i.test(p.__t)
const topik4 = (p) => /topik\s*(4|5|6)|(4|5|6)\s*급|level\s*[456]|cấp\s*[456]|topik\s*ii/i.test(koCert(p)) || koMajor(p)
const enOk = (p) => hasCert(String(p.english_cert || '').trim()) || /(ielts|toeic|toefl|english|tiếng anh)/i.test(p.__t)
const zhOk = (p) => /(hsk|tiếng trung|tieng trung|chinese|mandarin|中文|汉语|华语|tocfl|trung quốc|중국어)/i.test(p.__t)
const auditRe = /(internal audit|kiểm toán|kiem toan|audit|internal control|kiểm soát nội bộ|risk management|quản trị rủi ro|compliance|tuân thủ|process (improvement|review|management)|quy trình|sap\b|erp|finance|tài chính|accounting|kế toán|ke toan)/i
const auditRole = (p) => roles(p).some((r) => /(finance|accounting|audit|kế toán|compliance|risk|operations|admin|hr|interpreter|office)/i.test(r)) || auditRe.test(expTitles(p))
const engMajorRe = /(cơ khí|co khi|mechanical|chemical|hóa học|hoa hoc|hóa|vật liệu|vat lieu|material|tự động|tu dong|automation|electrical|điện|dien\b|mechatronic|cơ điện tử|industrial|công nghiệp|cong nghiep|manufacturing|sản xuất|san xuat|production|quản lý công nghiệp|dệt|textile|polymer|kỹ thuật|ky thuat|engineering)/i
const itMajorRe = /(software|phần mềm|computer|máy tính|information|thông tin|công nghệ thông tin|cntt|data|khoa học máy tính|ai\b|telecom|viễn thông|electronics and telecom)/i
const engMajor = (p) => engMajorRe.test(String(p.major || '')) && !itMajorRe.test(String(p.major || ''))
const prodRole = (p) => roles(p).some((r) => /(production|process|manufactur|mechanical|quality|qa\/qc|qc\b|maintenance|industrial|engineer(?!.*(software|frontend|backend|data|ai|devops|qa engineer|test)))/i.test(r)) || /(production|sản xuất|process engineer|kỹ sư|quality|qc\b|maintenance|bảo trì|nhà máy|factory|plant)/i.test(expTitles(p))
const itRole = (p) => roles(p).some((r) => /(developer|software|frontend|backend|fullstack|mobile|data|devops|tester|qa engineer|ai|designer|ux|game|marketing|sales|content)/i.test(r))
const impexRe = /(import|export|xuất nhập khẩu|xuat nhap khau|xnk|logistics|supply chain|chuỗi cung ứng|forwarder|forwarding|shipping|chứng từ|documentation|l\/c|hải quan|customs|purchasing|thu mua|procurement|merchandiser|ngoại thương|foreign trade|kinh tế đối ngoại|thương mại quốc tế|international business|kinh doanh quốc tế)/i
const impexRole = (p) => roles(p).some((r) => /(logistics|supply|import|export|purchasing|procurement|merchandis|operations|admin|warehouse)/i.test(r)) || impexRe.test(expTitles(p))
const bizMajor = (p) => /(kinh tế|economics|ngoại thương|foreign trade|thương mại|commerce|business|quản trị kinh doanh|logistics|xuất nhập khẩu|international|quốc tế|tiếng anh|english|ngôn ngữ anh)/i.test(String(p.major || ''))
const salesRole = (p) => roles(p).some((r) => /(sales|business development|account|kinh doanh|customer|merchandis|trade)/i.test(r)) || /(sales|kinh doanh|business development|account manager|customer)/i.test(expTitles(p))

const [pool, unsubs, todays, bl] = await Promise.all([
  fetchAll(() => sb.from('user_profiles').select('id,email,full_name,position,desired_roles,yoe_months,location,english_cert,korean_cert,is_resume_public,skills,resume_summary,headline,experiences,major,university,nationality,certs,projects,graduation_year,user_type,created_at').not('email', 'is', null).not('resume_url', 'is', null).order('created_at', { ascending: false })),
  fetchAll(() => sb.from('events').select('user_id').eq('event', 'coldmail_unsub').not('user_id', 'is', null).order('id')),
  fetchAll(() => sb.from('job_recommendations').select('user_id').gte('created_at', today).order('id')),
  fetchBlacklist(),
])
const unsubSet = new Set(unsubs.map((r) => r.user_id)), todaySet = new Set(todays.map((r) => r.user_id))
const seen = new Set(); const base = []
for (const p of pool) { if (!p.email || /likelion/i.test(p.email)) continue; const e = p.email.toLowerCase(); if (seen.has(e) || unsubSet.has(p.id) || bl.has(p)) continue; seen.add(e); p.__t = txt(p); base.push(p) }
const L = base.filter(locOk)
console.log(`베이스 ${base.length}명 · 당일(10/16) 기수신 ${todaySet.size} · 지역 OK(HCM권/ĐN·BRVT/미기재) ${L.length} = HCM권 ${L.filter((p) => city(p) === 'HCM권').length} / ĐN·BRVT ${L.filter((p) => city(p) === 'ĐN/BRVT').length} / 미기재 ${L.filter((p) => city(p) === '미기재').length}`)

const line = (label, arr) => {
  const ok = arr.filter((p) => !todaySet.has(p.id))
  const c = {}; for (const p of ok) c[city(p)] = (c[city(p)] || 0) + 1
  const yb = {}; for (const p of ok) { const k = y(p) < 12 ? '<1y' : y(p) < 24 ? '1-2y' : y(p) < 60 ? '2-5y' : '5y+'; yb[k] = (yb[k] || 0) + 1 }
  console.log(`  ${label}: ${arr.length}명 → 오늘 발송가능 ${ok.length}${arr.length - ok.length ? ` (당일 겹침 ${arr.length - ok.length})` : ''} · ${Object.entries(c).map(([k, v]) => `${k} ${v}`).join('/')} · 경력 ${Object.entries(yb).map(([k, v]) => `${k} ${v}`).join('/')} · KO ${ok.filter(koOk).length} · EN ${ok.filter(enOk).length} · 공개 ${ok.filter((p) => p.is_resume_public).length}`)
  return ok
}
const show = (arr, n = 6) => { for (const p of arr.slice(0, n)) console.log(`    ${p.full_name} · ${roles(p).slice(0, 2).join('/')} · ${Math.round(y(p) / 12 * 10) / 10}y · ${city(p)} · ${String(p.major || '').slice(0, 24)} · KO:${koCert(p).slice(0, 10) || '-'} · ${expTitles(p).slice(0, 50)}`) }

console.log('\n[V249 Korean-speaking (Experienced)] 2y+ 내부감사/프로세스/리스크/재무 × 한국어 능숙')
const A1 = L.filter((p) => koOk(p) && y(p) >= 24 && auditRole(p) && !itRole(p))
const A2 = L.filter((p) => koOk(p) && y(p) >= 24 && !auditRole(p) && !itRole(p))
line('A1 KO × 2y+ × 재무/회계/감사/운영/사무 직군·직함 (코어)', A1); show(A1)
line('A2 KO × 2y+ × 기타 비IT 직군 (확장 — 사무직 한국어 경력자)', A2); show(A2, 4)

console.log('\n[V250 Korean-speaking (Fresher)] 한국어/한국학/동방학 전공 × 신입 × 한국어 소통')
const B1 = L.filter((p) => koMajor(p) && y(p) < 24)
const B2 = L.filter((p) => !koMajor(p) && topik4(p) && y(p) < 24 && !itRole(p))
const B3 = L.filter((p) => !koMajor(p) && !topik4(p) && koOk(p) && y(p) < 24 && !itRole(p) && roles(p).some((r) => /(interpreter|translator|phiên dịch|biên dịch|admin|office|hr|assistant)/i.test(r)))
line('B1 한국어/한국학 전공 × <2y (코어)', B1); show(B1)
line('B2 비전공 × TOPIK 4+ 자격 × <2y × 비IT (확장)', B2); show(B2, 4)
line('B3 KO 시그널 × 통번역/사무 직군 × <2y (확장)', B3)

console.log('\n[V251/V252 Production Engineer (+IP)] 화학/재료/기계/자동화/산업/제조 전공 or 생산·공정 직군 × 신입 가능 · 영어 기본')
const C1 = L.filter((p) => engMajor(p) && prodRole(p) && !itRole(p))
const C2 = L.filter((p) => engMajor(p) && !prodRole(p) && !itRole(p))
const C3 = L.filter((p) => !engMajor(p) && prodRole(p) && !itRole(p))
line('C1 공학 전공 × 생산/공정/품질/설비 직군·직함 (코어)', C1); show(C1)
line('C2 공학 전공 × 직군 미기재/비IT (확장 — 신입 공대생)', C2); show(C2, 4)
line('C3 비공학 전공 × 생산/공정 직군·직함 (참고)', C3)
console.log(`  └ 전공 세부(C1+C2, 오늘 가능): 기계/메카 ${[...C1, ...C2].filter((p) => !todaySet.has(p.id) && /(cơ khí|mechanical|mechatronic|cơ điện tử)/i.test(p.major)).length} · 화학/재료/폴리머/섬유 ${[...C1, ...C2].filter((p) => !todaySet.has(p.id) && /(hóa|chemical|vật liệu|material|polymer|dệt|textile)/i.test(p.major)).length} · 자동화/전기 ${[...C1, ...C2].filter((p) => !todaySet.has(p.id) && /(tự động|automation|electrical|điện)/i.test(p.major)).length} · 산업/제조/생산 ${[...C1, ...C2].filter((p) => !todaySet.has(p.id) && /(industrial|công nghiệp|manufacturing|sản xuất|production|quản lý công nghiệp)/i.test(p.major)).length}`)

console.log('\n[V253 Import Staff] 경제/무역/물류/영어 전공 or 수출입·물류 직군 × 영어 × 신입 가능')
const D1 = L.filter((p) => impexRole(p) && !itRole(p))
const D2 = L.filter((p) => !impexRole(p) && !itRole(p) && impexRe.test(p.__t))
const D3 = L.filter((p) => !impexRole(p) && !impexRe.test(p.__t) && !itRole(p) && bizMajor(p) && y(p) < 24 && !koMajor(p))
line('D1 물류/수출입/구매 직군·직함 (코어)', D1); show(D1)
line('D2 수출입/물류 키워드 보유 (확장)', D2); show(D2, 4)
line('D3 경제/무역/경영/영어 전공 × <2y × 직군 비IT (확장 — 신입 상경계)', D3)

console.log('\n[V254 Sales Staff (Chinese speaking)] 중국어 × 영업/무역 × 영어')
const E1 = L.filter((p) => zhOk(p) && (salesRole(p) || impexRole(p)))
const E2 = L.filter((p) => zhOk(p) && !salesRole(p) && !impexRole(p) && !itRole(p))
line('E1 중국어 시그널 × 영업/무역/물류 직군 (코어)', E1); show(E1)
line('E2 중국어 시그널 × 기타 비IT (확장)', E2); show(E2, 4)
console.log(`  └ 지역 무관 중국어 시그널 전체: ${base.filter(zhOk).length}명`)

// 1인 1통 배정 (우선순위 V249 > V250 > V254 > V253 > V252/V251)
const order = [['V249', [...A1, ...A2]], ['V250', [...B1, ...B2, ...B3]], ['V254', [...E1, ...E2]], ['V253', [...D1, ...D2, ...D3]], ['V251/252', [...C1, ...C2, ...C3]]]
const used = new Set(); const assigned = {}
for (const [k, arr] of order) { assigned[k] = 0; for (const p of arr) { if (used.has(p.id) || todaySet.has(p.id)) continue; used.add(p.id); assigned[k]++ } }
console.log(`\n1인1통 배정 합계(오늘 발송가능): ${used.size}명 — ${Object.entries(assigned).map(([k, v]) => `${k} ${v}`).join(' · ')}`)
