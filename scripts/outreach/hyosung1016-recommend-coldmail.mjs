// HS Hyosung V249~V254 — 10/16 Len FYI 게재 당일 발송. KCN Nhơn Trạch 5 (Đồng Nai) 온사이트 · T2–T6 8:00–17:00 · HCM(Văn Thánh/Q.7/Thủ Đức)·BR-VT·ĐN 셔틀 · 기숙사 무료 · 외국어 수당 언어당 0.5~4.5M.
// V249 한국어 직원(경력 2y+ 내부감사/프로세스/리스크·한국어 능숙) · V250 한국어 직원(신입·한국어/한국학/동방학 전공) · V251 생산 엔지니어(화학/재료/기계/자동화/산업경영)
// V252 생산 엔지니어-IP(생산/산업/제조/기계공학) · V253 수입 담당(경제/무역/물류/영어 전공·영어) · V254 영업(중국어·대만/중국 시장·영어+중국어). 전부 신입 가능(V249 제외).
// 10/16 실측(scripts/tmp/hyosung1016-pool-measure.mjs): 베이스 5,630 · 지역 OK 3,807 → 1인1통 배정 ~500 (V249 48 · V250 68 · V254 10 · V253 257 · V251/252 117, 확장 포함, C3 '비공학 전공 × 생산 직함' 참고군 제외).
// 유저 지시 10/16 "확장 포함 발송". 게이트: 지역 = HCM권/ĐN·BRVT/미기재 · 당일 recommend 기수신자 제외(todaySet, 10/16 DA-SH 453) · 1인1통 우선순위 V249 > V250 > V254 > V253 > V252 > V251.
// 표준: 1인1통 · unsub/블랙리스트 전역 제외 · 공개/비공개 프레임 · 발송 전 coldmailTemplates 등록.
//
//   node scripts/outreach/hyosung1016-recommend-coldmail.mjs                 # dry-run
//   node scripts/outreach/hyosung1016-recommend-coldmail.mjs --send [--group <gkey>] [--max N]
import { Resend } from 'resend'
import { sb, env, fetchAll, fetchBlacklist } from './lib.mjs'
import { makeToken } from '../../lib/campaignToken.js'

const args = process.argv.slice(2)
const flag = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? (args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true) : d }
const doSend = args.includes('--send')
const onlyGroup = flag('group', null)
const maxN = flag('max', null) ? parseInt(flag('max'), 10) : null
const SITE = String(flag('site', env.NEXT_PUBLIC_SITE_URL || 'https://salary-fyi.com')).replace(/\/$/, '')
const RESEND_FROM = env.RESEND_FROM || 'FYI <hello@salary-fyi.com>'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const esc = (s) => String(s || '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
const firstName = (n) => String(n || '').trim().split(/\s+/).slice(-1)[0] || 'bạn'
const strip = (s) => String(s).replace(/<[^>]+>/g, '')

const expTitles = (p) => (Array.isArray(p.experiences) ? p.experiences.map((e) => `${e.title || e.position || ''}`).join(' | ') : '')
const exp = (p) => (Array.isArray(p.experiences) ? p.experiences.map((e) => `${e.title || e.position || ''} ${e.company || ''} ${e.description || ''}`).join(' ') : '')
const txt = (p) => (JSON.stringify(p.skills || '') + ' ' + String(p.position || '') + ' ' + String(p.headline || '') + ' ' + JSON.stringify(p.desired_roles || '') + ' ' + JSON.stringify(p.resume_summary || '') + ' ' + exp(p) + ' ' + String(p.major || '') + ' ' + JSON.stringify(p.certs || '') + ' ' + JSON.stringify(p.projects || '')).toLowerCase()
const roles = (p) => [p.position, ...(p.desired_roles || [])].filter(Boolean)
const y = (p) => p.yoe_months ?? 0
const hcmRe = /(h[ồo]\s*ch[íi]\s*minh|hcm|sài gòn|sai gon|saigon|thủ đức|thu duc|bình thạnh|bình dương|binh duong|đồng nai|dong nai|biên hòa|bien hoa|nhơn trạch|nhon trach|long an|vũng tàu|vung tau|bà rịa|ba ria|호치민|호찌민|동나이|hóc môn|gò vấp|go vap|tân bình|tân phú|bình tân|phú nhuận|củ chi|nhà bè|bình chánh|quận \d|district \d|tphcm|tp\.?\s*hcm)/i
const dnRe = /(đồng nai|dong nai|biên hòa|bien hoa|nhơn trạch|nhon trach|vũng tàu|vung tau|bà rịa|ba ria|동나이)/i
const city = (p) => { const l = String(p.location || ''); if (!l.trim()) return '미기재'; if (dnRe.test(l)) return 'ĐN'; if (hcmRe.test(l)) return 'HCM'; return '기타' }
const locOk = (p) => city(p) !== '기타'
const locA = (p) => (city(p) === 'ĐN' ? 3 : city(p) === 'HCM' ? 2 : 0)
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
const ipMajor = (p) => /(industrial|công nghiệp|manufacturing|sản xuất|production|quản lý công nghiệp|cơ khí|mechanical|mechatronic|cơ điện tử)/i.test(String(p.major || '')) // V252 생산/산업/제조/기계
const prodRole = (p) => roles(p).some((r) => /(production|process|manufactur|mechanical|quality|qa\/qc|qc\b|maintenance|industrial|engineer(?!.*(software|frontend|backend|data|ai|devops|qa engineer|test)))/i.test(r)) || /(production|sản xuất|process engineer|kỹ sư|quality|qc\b|maintenance|bảo trì|nhà máy|factory|plant)/i.test(expTitles(p))
const itRole = (p) => roles(p).some((r) => /(developer|software|frontend|backend|fullstack|mobile|data|devops|tester|qa engineer|ai|designer|ux|game|marketing|sales|content)/i.test(r))
const impexRe = /(import|export|xuất nhập khẩu|xuat nhap khau|xnk|logistics|supply chain|chuỗi cung ứng|forwarder|forwarding|shipping|chứng từ|documentation|l\/c|hải quan|customs|purchasing|thu mua|procurement|merchandiser|ngoại thương|foreign trade|kinh tế đối ngoại|thương mại quốc tế|international business|kinh doanh quốc tế)/i
const impexRole = (p) => roles(p).some((r) => /(logistics|supply|import|export|purchasing|procurement|merchandis|operations|admin|warehouse)/i.test(r)) || impexRe.test(expTitles(p))
const bizMajor = (p) => /(kinh tế|economics|ngoại thương|foreign trade|thương mại|commerce|business|quản trị kinh doanh|logistics|xuất nhập khẩu|international|quốc tế|tiếng anh|english|ngôn ngữ anh)/i.test(String(p.major || ''))
const salesRole = (p) => roles(p).some((r) => /(sales|business development|account|kinh doanh|customer|merchandis|trade)/i.test(r)) || /(sales|kinh doanh|business development|account manager|customer)/i.test(expTitles(p))
const kDesc = (p) => roles(p).some((r) => /(interpreter|translator|phiên dịch|biên dịch|admin|office|hr|assistant)/i.test(r))

// 우선순위 순서 = 1인1통 배정 순서 (V249 > V250 > V254 > V253 > V252 > V251)
const GROUPS = [
  { gkey: 'ko-exp-core', jobKey: 'V249', label: { vi: 'Korean-speaking Staff (Experienced)', ko: 'KO × 2y+ × 재무/회계/감사/운영/사무 직군·직함 × HCM권/ĐN/미기재 (코어)' },
    pick: (p) => (locOk(p) && koOk(p) && y(p) >= 24 && auditRole(p) && !itRole(p) ? 60 + locA(p) + (topik4(p) ? 2 : 0) : null) },
  { gkey: 'ko-exp-ext', jobKey: 'V249', label: { vi: 'Korean-speaking Staff (Experienced)', ko: 'KO × 2y+ × 기타 비IT 직군 (확장 — 사무직 한국어 경력자)' },
    pick: (p) => (locOk(p) && koOk(p) && y(p) >= 24 && !itRole(p) ? 50 + locA(p) + (topik4(p) ? 2 : 0) : null) },
  { gkey: 'ko-fresh-major', jobKey: 'V250', label: { vi: 'Korean-speaking Staff (Fresher)', ko: '한국어/한국학/동방학 전공 × <2y × HCM권/ĐN/미기재 (코어)' },
    pick: (p) => (locOk(p) && koMajor(p) && y(p) < 24 ? 40 + locA(p) + (hasCert(koCert(p)) ? 2 : 0) : null) },
  { gkey: 'ko-fresh-topik', jobKey: 'V250', label: { vi: 'Korean-speaking Staff (Fresher)', ko: '비전공 × TOPIK 4+ × <2y × 비IT (확장)' },
    pick: (p) => (locOk(p) && topik4(p) && y(p) < 24 && !itRole(p) ? 35 + locA(p) : null) },
  { gkey: 'ko-fresh-sig', jobKey: 'V250', label: { vi: 'Korean-speaking Staff (Fresher)', ko: 'KO 시그널 × 통번역/사무 직군 × <2y (확장)' },
    pick: (p) => (locOk(p) && koOk(p) && y(p) < 24 && !itRole(p) && kDesc(p) ? 30 + locA(p) : null) },
  { gkey: 'zh-sales', jobKey: 'V254', label: { vi: 'Sales Staff (Chinese speaking)', ko: '중국어 시그널 × 영업/무역/물류 직군 (코어)' },
    pick: (p) => (locOk(p) && zhOk(p) && (salesRole(p) || impexRole(p)) ? 28 + locA(p) + (enOk(p) ? 1 : 0) : null) },
  { gkey: 'zh-ext', jobKey: 'V254', label: { vi: 'Sales Staff (Chinese speaking)', ko: '중국어 시그널 × 기타 비IT (확장)' },
    pick: (p) => (locOk(p) && zhOk(p) && !itRole(p) ? 25 + locA(p) + (enOk(p) ? 1 : 0) : null) },
  { gkey: 'impex-core', jobKey: 'V253', label: { vi: 'Import Staff', ko: '물류/수출입/구매 직군·직함 × 비IT (코어)' },
    pick: (p) => (locOk(p) && impexRole(p) && !itRole(p) ? 20 + locA(p) + (enOk(p) ? 1 : 0) : null) },
  { gkey: 'impex-kw', jobKey: 'V253', label: { vi: 'Import Staff', ko: '수출입/물류 키워드 보유 × 비IT (확장)' },
    pick: (p) => (locOk(p) && !itRole(p) && impexRe.test(p.__t) ? 15 + locA(p) + (enOk(p) ? 1 : 0) : null) },
  { gkey: 'impex-major', jobKey: 'V253', label: { vi: 'Import Staff', ko: '경제/무역/경영/영어 전공 × <2y × 비IT × 비한국어전공 (확장 — 신입 상경계)' },
    pick: (p) => (locOk(p) && !itRole(p) && bizMajor(p) && y(p) < 24 && !koMajor(p) ? 10 + locA(p) + (enOk(p) ? 1 : 0) : null) },
  { gkey: 'prod-ip', jobKey: 'V252', label: { vi: 'Production Engineer - IP', ko: '생산/산업/제조/기계 전공 × 비IT 직군 (코어+확장)' },
    pick: (p) => (locOk(p) && engMajor(p) && ipMajor(p) && !itRole(p) ? 8 + locA(p) + (prodRole(p) ? 3 : 0) + (enOk(p) ? 1 : 0) : null) },
  { gkey: 'prod-eng', jobKey: 'V251', label: { vi: 'Production Engineer', ko: '화학/재료/자동화/전기 등 공학 전공 × 비IT 직군 (코어+확장)' },
    pick: (p) => (locOk(p) && engMajor(p) && !itRole(p) ? 5 + locA(p) + (prodRole(p) ? 3 : 0) + (enOk(p) ? 1 : 0) : null) },
]

const META = 'Onsite · KCN Nhơn Trạch 5, Đồng Nai · T2–T6 8:00–17:00 · Xe đưa đón từ TP.HCM (Văn Thánh, Q.7, Thủ Đức), BR-VT, Đồng Nai · KTX miễn phí'
const CO = '<b>HS Hyosung</b> — tập đoàn Hàn Quốc, nhà máy ngành dệt/vật liệu tại KCN Nhơn Trạch 5, Đồng Nai —'
const BEN = 'Quyền lợi: lương cạnh tranh, xét tăng lương hằng năm; thưởng cuối năm, thưởng sản xuất và hiệu suất <b>180–250% lương cơ bản</b>; <b>phụ cấp ngoại ngữ 500.000–4.500.000 VND/tháng mỗi ngôn ngữ</b> (Anh/Hàn/Trung/Nhật, tối đa 18.000.000); sổ tiết kiệm tích lũy ~15.800.000 VND mỗi 3 năm; 14 ngày phép (quy đổi tiền nếu không dùng); ăn trưa miễn phí; <b>xe đưa đón miễn phí</b> từ Văn Thánh, Q.7, Thủ Đức, BR-VT, Đồng Nai; <b>ký túc xá miễn phí</b>; BHXH đầy đủ; khóa học Udemy. Làm việc Thứ 2 – Thứ 6, 8:00–17:00.'
const JOBS = {
  V249: { company: 'HS Hyosung', initial: 'H', meta: META + ' · Từ 2 năm kinh nghiệm · Tiếng Hàn thành thạo',
    intro: `${CO} đang tuyển <b>Korean-speaking Staff (Experienced)</b> qua FYI. Công việc: nghiên cứu và nắm các quy trình do Trụ sở chính (Hàn Quốc) xây dựng; rà soát, điều chỉnh quy trình cho phù hợp với vận hành thực tế tại Việt Nam (mua hàng, bán hàng, tuyển dụng, lương, tồn kho, tài sản, thanh toán, vay, đóng sổ cuối tháng…); giám sát việc tuân thủ quy trình chuẩn; cập nhật và báo cáo cho Trụ sở chính. Yêu cầu: tốt nghiệp Đại học Kế toán, Kiểm toán, Tài chính, QTKD, Ngôn ngữ Hàn hoặc liên quan; <b>từ 2 năm kinh nghiệm</b> kiểm toán nội bộ, quản trị rủi ro hoặc vị trí liên quan; <b>tiếng Hàn thành thạo</b>; Word/Excel/SAP. Ưu tiên kinh nghiệm ngành dệt, từng làm việc tại Hyosung/HS Hyosung. ${BEN}` },
  V250: { company: 'HS Hyosung', initial: 'H', meta: META + ' · Fresher · Tiếng Hàn giao tiếp tốt',
    intro: `${CO} đang tuyển <b>Korean-speaking Staff (Fresher)</b> qua FYI. Công việc: biên dịch tài liệu, email, báo cáo Việt – Hàn và ngược lại; phiên dịch trong các cuộc họp, sự kiện; báo cáo cho Quản lý/Giám sát; hỗ trợ các công việc văn phòng khác của bộ phận. Yêu cầu: tốt nghiệp Đại học <b>Ngôn ngữ Hàn, Hàn Quốc học hoặc Đông phương học</b>; <b>chấp nhận sinh viên mới ra trường</b>; giao tiếp tiếng Hàn tốt; Word/Excel/SAP. Ưu tiên kinh nghiệm ngành dệt. ${BEN}` },
  V251: { company: 'HS Hyosung', initial: 'H', meta: META + ' · Fresher · Tiếng Anh cơ bản',
    intro: `${CO} đang tuyển <b>Production Engineer</b> (Kỹ sư quản lý sản xuất) qua FYI. Công việc: sắp xếp, điều phối nhân sự đảm bảo tiến độ sản xuất; đào tạo quy trình và tiêu chuẩn làm việc cho công nhân; quản lý quy trình sản xuất đảm bảo năng suất và chất lượng; phân tích sự cố phát sinh và đề xuất giải pháp; quản lý nguyên vật liệu, lập kế hoạch sản xuất theo đơn hàng; báo cáo tiến độ và vấn đề cho cấp trên. Yêu cầu: tốt nghiệp Đại học <b>Hóa, Vật liệu, Cơ khí, Tự động hóa, Quản lý công nghiệp</b> hoặc liên quan; <b>chấp nhận sinh viên mới ra trường</b>; tiếng Anh giao tiếp cơ bản; Word/Excel/SAP. Ưu tiên kinh nghiệm ngành dệt. ${BEN}` },
  V252: { company: 'HS Hyosung', initial: 'H', meta: META + ' · Fresher · Tiếng Anh giao tiếp tốt',
    intro: `${CO} đang tuyển <b>Production Engineer - IP</b> qua FYI. Công việc: quản lý công đoạn và quy trình đóng gói; theo dõi và quản lý tỷ lệ lỗi bất thường; quản lý sản lượng đóng gói hằng ngày; quản lý thiết bị, máy móc; theo dõi tình trạng xuất hàng hằng ngày; kiểm tra mô phỏng (simulation). Yêu cầu: tốt nghiệp Đại học <b>Kỹ thuật sản xuất, Kỹ thuật công nghiệp, Kỹ thuật chế tạo, Cơ khí, Quản lý công nghiệp</b> hoặc liên quan; <b>chấp nhận sinh viên mới ra trường</b>; tiếng Anh giao tiếp tốt; thành thạo Excel/Word; SAP. Ưu tiên kinh nghiệm ngành dệt. ${BEN}` },
  V253: { company: 'HS Hyosung', initial: 'H', meta: META + ' · Fresher · Tiếng Anh giao tiếp tốt',
    intro: `${CO} đang tuyển <b>Import Staff</b> (Nhân viên nhập khẩu) qua FYI. Công việc: chuẩn bị bộ chứng từ nhập khẩu theo L/C và các điều khoản thanh toán khác; tham gia thủ tục kiểm nghiệm mẫu hàng với cơ quan chức năng; theo dõi lịch tàu, lưu trữ chứng từ và đơn hàng; đàm phán, đặt chỗ với hãng tàu/đại lý vận tải; liên hệ nhà cung cấp và khách hàng về lịch giao nhận hàng; báo cáo hằng tháng cho cấp quản lý. Yêu cầu: tốt nghiệp Đại học <b>Kinh tế, Ngoại thương, Kinh tế quốc tế, Xuất nhập khẩu, QTKD, Ngôn ngữ Anh</b> hoặc liên quan; <b>chấp nhận sinh viên mới ra trường</b>; tiếng Anh giao tiếp tốt; Word/Excel/SAP. Ưu tiên kinh nghiệm ngành dệt. ${BEN}` },
  V254: { company: 'HS Hyosung', initial: 'H', meta: META + ' · Fresher · Tiếng Anh + tiếng Trung',
    intro: `${CO} đang tuyển <b>Sales Staff (Chinese speaking)</b> qua FYI, phụ trách thị trường <b>Đài Loan và Trung Quốc</b>. Công việc: đàm phán với khách hàng về giá, chất lượng, thời gian giao hàng; lập báo giá, kiểm tra tồn kho và sắp xếp lịch giao hàng (phối hợp Logistics); soạn hợp đồng và chứng từ bán hàng theo L/C; báo cáo sản lượng và kế hoạch bán hàng hằng tháng; thăm khách hàng, hỗ trợ đội TSC chăm sóc khách hàng; tổ chức hội thảo, triển lãm quảng bá thương hiệu. Yêu cầu: tốt nghiệp Đại học <b>Kinh tế, Ngoại thương, Kinh tế quốc tế, Xuất nhập khẩu, QTKD, Ngôn ngữ Trung</b> hoặc liên quan; <b>chấp nhận sinh viên mới ra trường</b>; <b>giao tiếp tốt cả tiếng Anh và tiếng Trung</b>; Word/Excel/SAP. Ưu tiên kinh nghiệm ngành dệt. ${BEN}` },
}
const SUBJECT = {
  public: (co, role) => `[FYI] Bạn được chọn vào danh sách đề cử gửi ${co} — ${role} (Đồng Nai)`,
  private: (co, role) => `[FYI] Bạn được chọn vào danh sách đề cử — ${role} tại ${co} (Đồng Nai)`,
}
const HOOK = 'Đội ngũ FYI đã xem xét toàn bộ hồ sơ đã đăng ký và <b>chọn bạn vào danh sách đề cử</b> cho vị trí dưới đây — hồ sơ của bạn phù hợp với yêu cầu của vị trí này.'
const BENEFIT = {
  public: (company) => `<b>Trong tuần này</b>, FYI sẽ gửi danh sách đề cử trực tiếp cho người phụ trách tuyển dụng của ${company}. Hồ sơ của bạn đang ở chế độ công khai nên sẽ được gửi kèm danh sách. Nếu bạn ứng tuyển ngay, CV của bạn sẽ được <b>ưu tiên xem xét</b> cùng lời giới thiệu từ FYI.`,
  private: (company) => `<b>Trong tuần này</b>, FYI sẽ gửi danh sách đề cử trực tiếp cho người phụ trách tuyển dụng của ${company}. Hồ sơ của bạn đang ở chế độ riêng tư — nếu bạn ứng tuyển ngay, CV của bạn sẽ được gửi kèm lời giới thiệu từ FYI và được <b>ưu tiên xem xét</b>.`,
}
const ONETAP = 'Chỉ cần <b>1 chạm</b> — CV đã đăng ký của bạn sẽ được gửi tự động.'

function jobCard(jd, job) {
  const logo = job.logo_url
    ? `<img src="${esc(job.logo_url)}" width="44" height="44" alt="" style="width:44px;height:44px;border-radius:10px;object-fit:cover;background:#f0ebe3;display:block">`
    : `<div style="width:44px;height:44px;border-radius:10px;background:#fff0e6;color:#ff6000;font-weight:800;font-size:16px;text-align:center;line-height:44px">${jd.initial}</div>`
  return `<table width="100%" cellpadding="0" cellspacing="0" style="background:#fff;border:1px solid #eee5da;border-radius:14px;margin-bottom:8px"><tr>
    <td width="44" style="padding:14px 0 14px 14px;vertical-align:middle">${logo}</td>
    <td style="padding:14px 14px 14px 12px;vertical-align:middle">
      <div style="font-size:12px;color:#8a8073;margin-bottom:3px">${esc(jd.company)}</div>
      <div style="font-size:14.5px;font-weight:700;color:#1a1612;line-height:1.35">${esc(job.title.trim())}</div>
      <div style="font-size:12px;color:#b0691a;margin-top:3px">${esc(jd.meta)}</div>
    </td>
  </tr></table>`
}
function emailHtml(name, url, unsubUrl, jd, job, frame) {
  return `<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;background:#faf9f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1a1612">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#faf9f7"><tr><td align="center" style="padding:28px 16px">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px">
  <tr><td style="padding-bottom:18px"><img src="https://salary-fyi.com/fyi-logo.png" height="24" alt="FYI" style="height:24px;width:auto;display:block"></td></tr>
  <tr><td style="font-size:15px;line-height:1.6;color:#1a1612;padding-bottom:6px">Chào ${esc(firstName(name))},</td></tr>
  <tr><td style="font-size:14px;line-height:1.65;color:#4a443c;padding-bottom:14px">${jd.intro}</td></tr>
  <tr><td style="font-size:14px;line-height:1.65;color:#4a443c;padding-bottom:14px">${HOOK}</td></tr>
  <tr><td style="padding-bottom:10px">${jobCard(jd, job)}</td></tr>
  <tr><td style="font-size:14px;line-height:1.65;color:#4a443c;padding-top:4px">${BENEFIT[frame](jd.company)} ${ONETAP}</td></tr>
  <tr><td align="center" style="padding:16px 0 6px">
    <a href="${url}" style="display:inline-block;background:#ff6000;color:#fff;font-weight:700;font-size:15px;text-decoration:none;padding:14px 30px;border-radius:12px">Ứng tuyển 1 chạm →</a>
  </td></tr>
  <tr><td align="center" style="font-size:12.5px;padding-bottom:4px"><a href="${SITE}/ktc/jobs/${jd.id}" style="color:#8a8073">Xem mô tả công việc đầy đủ →</a></td></tr>
  <tr><td style="font-size:11.5px;color:#a89f92;text-align:center;line-height:1.5;padding-top:20px">
    Bạn nhận được email này vì đã đăng ký hồ sơ trên FYI.<br>— Đội ngũ FYI · <a href="https://salary-fyi.com/jobs" style="color:#a89f92">salary-fyi.com/jobs</a>
    &nbsp;·&nbsp;<a href="${unsubUrl}" style="color:#a89f92;text-decoration:underline">Hủy đăng ký</a>
  </td></tr>
</table></td></tr></table></body></html>`
}
function emailText(name, url, unsubUrl, jd, job, frame) {
  return `Chào ${firstName(name)},

${strip(jd.intro)}

${strip(HOOK)}

- ${job.title.trim()} (${jd.company}) — ${jd.meta} — ${SITE}/ktc/jobs/${jd.id}

${strip(BENEFIT[frame](jd.company))} ${strip(ONETAP)}

${url}

Bạn nhận được email này vì đã đăng ký hồ sơ trên FYI.
— Đội ngũ FYI · salary-fyi.com/jobs
Hủy đăng ký: ${unsubUrl}`
}

async function main() {
  const { data: jobRows, error: jobErr } = await sb.from('jobs').select('id,title,company,location,logo_url,is_active,source_id').eq('source', 'ktc').in('source_id', Object.keys(JOBS))
  if (jobErr) { console.error('공고 조회 실패:', jobErr.message); process.exit(1) }
  for (const [k, jd] of Object.entries(JOBS)) {
    const j = (jobRows || []).find((r) => r.source_id === k)
    if (!j || !j.is_active) { console.error(`공고 없음/비활성: ${k}`); process.exit(1) }
    jd.id = j.id
  }
  const jobById = Object.fromEntries(jobRows.map((j) => [j.id, j]))
  const jobIds = Object.values(JOBS).map((j) => j.id)
  const resend = new Resend(env.RESEND_API_KEY)
  const url = (userId, camp, jobId) => `${SITE}/api/resume/recommend?t=${makeToken(userId, camp)}&j=${jobId}`
  const unsubFor = (userId, camp) => `${SITE}/api/coldmail/unsub?t=${makeToken(userId, camp)}`
  const [pool, unsubs, recs, apps, bl] = await Promise.all([
    fetchAll(() => sb.from('user_profiles').select('id,email,full_name,position,desired_roles,headline,major,graduation_year,user_type,yoe_months,location,english_cert,korean_cert,is_resume_public,skills,resume_summary,experiences,certs,projects').not('email', 'is', null).not('resume_url', 'is', null).order('created_at', { ascending: false })),
    fetchAll(() => sb.from('events').select('user_id').eq('event', 'coldmail_unsub').not('user_id', 'is', null).order('id')),
    fetchAll(() => sb.from('job_recommendations').select('user_id,job_id').in('job_id', jobIds).order('id')),
    fetchAll(() => sb.from('job_applications').select('user_id,job_id').in('job_id', jobIds).order('id')),
    fetchBlacklist(),
  ])
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)
  const todayRecs = await fetchAll(() => sb.from('job_recommendations').select('user_id').gte('created_at', todayStart.toISOString()).order('id'))
  const todaySet = new Set(todayRecs.map((r) => r.user_id))
  const unsubSet = new Set(unsubs.map((r) => r.user_id))
  const recSet = new Set(recs.map((r) => `${r.user_id}|${r.job_id}`)), appliedSet = new Set(apps.map((a) => `${a.user_id}|${a.job_id}`))
  const seen = new Set(); const assigned = []; let skipRec = 0, skipToday = 0
  for (const p of pool) {
    if (!p.email || /likelion/i.test(p.email)) continue
    const e = p.email.toLowerCase()
    if (seen.has(e) || unsubSet.has(p.id) || bl.has(p)) continue
    if (todaySet.has(p.id)) { skipToday++; continue }
    p.__t = txt(p)
    for (const g of GROUPS) {
      const s = g.pick(p); if (s == null) continue
      const jobId = JOBS[g.jobKey].id
      if (appliedSet.has(`${p.id}|${jobId}`) || recSet.has(`${p.id}|${jobId}`)) { skipRec++; continue }
      seen.add(e); assigned.push({ p, s, g, frame: p.is_resume_public ? 'public' : 'private' }); break
    }
  }
  console.log('발송 대상(1인 1통 배정 · 당일 recommend 기수신자 제외):')
  for (const g of GROUPS) { const rows = assigned.filter((r) => r.g.gkey === g.gkey); console.log(`  ${g.gkey} → ${g.jobKey}: ${rows.length}명 (공개 ${rows.filter((x) => x.frame === 'public').length}) — ${g.label.ko}`) }
  const byJob = {}; for (const r of assigned) byJob[r.g.jobKey] = (byJob[r.g.jobKey] || 0) + 1
  console.log(`  ── 합계: ${assigned.length}명 (${Object.entries(byJob).map(([k, v]) => `${k} ${v}`).join(' · ')}) (제외: 당일 기수신 ${skipToday} · 해당 공고 기수신/기지원 ${skipRec})`)
  if (!doSend) {
    for (const g of GROUPS) {
      const rows = assigned.filter((r) => r.g.gkey === g.gkey).sort((a, b) => b.s - a.s)
      console.log(`\n── ${g.gkey} 상위 6 (총 ${rows.length}) ──`)
      for (const { p, s, frame } of rows.slice(0, 6)) console.log(`  [${s}·${frame}] ${p.full_name} · ${p.position || '?'} · ${Math.round(y(p) / 12 * 10) / 10}y · ${city(p)} · ${String(p.major || '').slice(0, 22)} · ${expTitles(p).slice(0, 50)}`)
    }
    console.log('\n(dry-run — 실발송하려면 --send, 그룹 한정 --group <gkey>)'); return
  }
  let targets = [...assigned].sort((a, b) => b.s - a.s)
  if (onlyGroup) targets = targets.filter((r) => r.g.gkey === onlyGroup)
  if (maxN) targets = targets.slice(0, maxN)
  let ok = 0, fail = 0; const okBy = {}
  for (const { p, g, frame } of targets) {
    const jd = JOBS[g.jobKey], job = jobById[jd.id], camp = `hyosung1016-recommend-${g.gkey}-${frame}`
    const u = url(p.id, camp, jd.id), un = unsubFor(p.id, camp)
    const { error } = await resend.emails.send({ from: RESEND_FROM, to: p.email, subject: SUBJECT[frame](jd.company, g.label.vi), html: emailHtml(p.full_name, u, un, jd, job, frame), text: emailText(p.full_name, u, un, jd, job, frame), headers: { 'List-Unsubscribe': `<${un}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' } })
    if (error) { console.error(`실패 ${p.email}:`, error.message || error); fail++; continue }
    await sb.from('job_recommendations').upsert([{ user_id: p.id, to_email: p.email, job_id: jd.id, job_title: job.title, job_company: job.company, sent_by: 'coldmail', kind: 'recommend', status: 'sent' }], { onConflict: 'user_id,job_id', ignoreDuplicates: true })
    await sb.from('events').insert([{ event: 'recommend_sent', page: '/scripts/hyosung1016-recommend-coldmail', meta: { campaign: camp, job_ids: [jd.id], frame, group: g.gkey }, user_id: p.id }])
    ok++; okBy[g.jobKey] = (okBy[g.jobKey] || 0) + 1; if (ok % 50 === 0) console.log(`  …${ok}/${targets.length}`); await sleep(400)
  }
  console.log(`\n✅ 발송 완료: ${ok}/${targets.length} (실패 ${fail}) — ${Object.entries(okBy).map(([k, v]) => `${k} ${v}`).join(' · ')}`)
}
main().catch((e) => { console.error(e); process.exit(1) })
