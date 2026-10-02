// Cyber Logitec 10/2 신규 5공고 recommend — Emma 게재 당일 소싱. 전부 HCM 온사이트.
//   V210 Java Developer (Oracle)            Java 3y+ · Spring/Oracle SQL · 영어 읽기/쓰기(회화 우대)
//   V211 RPA Developer (Middle)             3y+ · Automation Anywhere 필수 · RPA 프로젝트 완주 · 영어 채팅 · 한국 공휴일 캘린더
//   V212 IT Solution Sales (Korean)         한국어 유창 4기능 필수 · 영업 주니어/미들 · 빈즈엉/롱안 출장 · 영업/B2B 경험은 우대
//   V213 Service Desk (Fresher/Junior)      영어 읽기/쓰기 · 오피스 · 3교대(06-14/14-22/22-06)·주말·뗏 근무 · 물류/회계/ERP·IT/SQL 우대
//   V214 System Security Engineer (Senior)  4y+ · IAM · EDR/방화벽/VPN · 모니터링/IR (Security+/CEH/CISSP·SIEM·클라우드 우대)
// 10/2 실측(scripts/tmp/cyberlogitec-pool-must.mjs, 필수만·HCM 명시): Java 24~52 · RPA 0(AA)/3(타 툴) · Sales 26(TOPIK5+)/47(TOPIK4+) · SDesk 537 · Sec 2(3영역)/8(2영역).
// 게이트 = 필수 요건만, 우대는 가점. 빈도/신선도 게이트 없음(10/2 유저 지시). 재학생 제외(졸업 2027+ 또는 student 헤드라인, intern 헤드라인은 안 씀).
// 캐스케이드(1인1통) = 희소 순: Sec → RPA → Sales → Java → Service Desk. 지역 = HCM권 명시 or 미기재(미기재는 가점 0).
// 표준: 1인1통 · unsub 전역 제외 · 공개/비공개 프레임 · 발송 전 coldmailTemplates 등록.
//
//   node scripts/outreach/cyberlogitec1002-recommend-coldmail.mjs                       # dry-run
//   node scripts/outreach/cyberlogitec1002-recommend-coldmail.mjs --send [--group <gkey>] [--max N]
import { Resend } from 'resend'
import { sb, env, fetchAll } from './lib.mjs'
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

// ── 대상 선정 헬퍼 (cyberlogitec-pool-must 와 동일) ──
const norm = (v) => (Array.isArray(v) ? v.join(' ') : String(v || ''))
const txt = (p) => {
  const exp = Array.isArray(p.experiences) ? p.experiences.map((e) => `${e.title || e.position || ''} ${e.company || ''} ${e.description || ''}`).join(' ') : ''
  return [p.position, p.headline, norm(p.desired_roles), JSON.stringify(p.skills || ''), exp, JSON.stringify(p.resume_summary || ''), p.major].join(' ').toLowerCase()
}
const roles = (p) => [p.position, ...(p.desired_roles || [])].filter(Boolean).map((r) => String(r).toLowerCase())
const y = (p) => p.yoe_months ?? 0
const loc = (p) => String(p.location || '')
const hcmA = (p) => /(h[ồo]\s*ch[íi]\s*minh|hcm|sài gòn|sai gon|saigon|thủ đức|thu duc|bình thạnh|bình dương|binh duong|đồng nai|dong nai|biên hòa|bien hoa)/i.test(loc(p))
const hcmOk = (p) => hcmA(p) || !loc(p).trim()
const locA = (p) => (hcmA(p) ? 1 : 0)
const enHi = (p) => /(ielts\s*[6-9]|toeic\s*[6-9]\d\d|toefl|b2|c1|c2|fluent|advanced|proficien)/i.test(String(p.english_cert || ''))
const enAny = (p) => !!p.english_cert || /(ielts|toeic|toefl|english|tiếng anh)/i.test(p.__t)
const koFluent = (p) => /(topik\s*(ii\s*)?(level\s*)?[5-6]|topik\s*[5-6]|advanced|고급|native|fluent|c1|c2)/i.test(String(p.korean_cert || ''))
const koHi = (p) => koFluent(p) || /(topik\s*(ii\s*)?(level\s*)?4|topik\s*4)/i.test(String(p.korean_cert || ''))
const student = (p) => (parseInt(p.graduation_year) || 0) >= 2027 || (/(student|sinh viên|đang học)/i.test(String(p.headline || '')) && (parseInt(p.graduation_year) || 0) >= 2026)
const devOnly = (p) => roles(p).length > 0 && roles(p).every((r) => /(backend|frontend|fullstack|full-stack|mobile|developer|devops|qa|data|ai|ml|game|embedded)/.test(r))
const devRole = (p) => roles(p).some((r) => /(backend|fullstack|full-stack|java|software|developer|engineer)/.test(r))

const javaSig = (p) => /\bjava\b/.test(p.__t)
const springOracle = (p) => /(spring|oracle)/.test(p.__t)
const aa = (p) => /automation anywhere/.test(p.__t)
const rpa = (p) => /(\brpa\b|uipath|power automate|blue prism|automation anywhere)/.test(p.__t)
const salesSig = (p) => roles(p).some((r) => /(sales|business dev|\bbd\b|account)/.test(r)) || /(sales|kinh doanh|business development|b2b)/.test(p.__t)
const sdPref = (p) => /(service desk|help ?desk|it support|customer support|customer service|technical support|hỗ trợ khách hàng|chăm sóc khách hàng|logistics|shipping|accounting|kế toán|\berp\b|sql)/.test(p.__t)
const secAreas = (p) => ['(iam|identity|active directory|azure ad|okta)', '(edr|antivirus|endpoint|crowdstrike)', '(firewall|fortigate|palo alto|vpn|vlan)', '(incident response|siem|soc|security monitoring|phishing|malware)', '(security|bảo mật|an toàn thông tin)'].filter((r) => new RegExp(r).test(p.__t)).length
const secCert = (p) => /(security\+|ceh|cissp|oscp|comptia)/.test(p.__t)
// 보안 직군·인프라 직군이 아닌 프로필(마케팅·디자인)이 "security"+"vpn" 단어만으로 2영역을 채우는 오탐 → 직군 조건 또는 3영역+
const secRole = (p) => roles(p).some((r) => /(security|sysadmin|system admin|network|devops|it support|infra|cloud|backend)/.test(r)) || /(security engineer|security analyst|soc analyst|pentest|an toàn thông tin|bảo mật)/.test(`${p.position || ''} ${p.headline || ''}`.toLowerCase())

// ── 그룹 (캐스케이드 = 위에서부터 1인1통) ──
const GROUPS = [
  {
    gkey: 'sec', camp: 'cyberlogitec1002-recommend-sec', jobKey: 'V214',
    label: { vi: 'System Security Engineer (Senior)', ko: '보안 4y+ × (보안 시그널 3영역+ 또는 2영역×보안/인프라 직군)' },
    pick: (p) => (hcmOk(p) && y(p) >= 48 && (secAreas(p) >= 3 || (secAreas(p) >= 2 && secRole(p))) ? 1 + secAreas(p) + (secCert(p) ? 2 : 0) + locA(p) + (enAny(p) ? 1 : 0) : null),
  },
  {
    gkey: 'rpa', camp: 'cyberlogitec1002-recommend-rpa', jobKey: 'V211',
    label: { vi: 'RPA Developer (Middle)', ko: 'RPA 툴 경험 × 36m+ (AA 보유 가점)' },
    pick: (p) => (hcmOk(p) && y(p) >= 36 && rpa(p) ? 1 + (aa(p) ? 3 : 0) + (/sap|erp/.test(p.__t) ? 1 : 0) + locA(p) + (enAny(p) ? 1 : 0) : null),
  },
  {
    gkey: 'sales', camp: 'cyberlogitec1002-recommend-sales', jobKey: 'V212',
    label: { vi: 'IT Solution Sales (Korean speaking)', ko: '한국어 TOPIK4+ × 비개발 × 비학생 (영업 경험 가점)' },
    pick: (p) => (hcmOk(p) && koHi(p) && !devOnly(p) && !student(p) ? 1 + (koFluent(p) ? 2 : 0) + (salesSig(p) ? 2 : 0) + locA(p) : null),
  },
  {
    gkey: 'java', camp: 'cyberlogitec1002-recommend-java', jobKey: 'V210',
    label: { vi: 'Java Developer (Oracle)', ko: 'Java × 개발 직군 × 36m+ (Spring/Oracle·영어 가점)' },
    pick: (p) => (hcmOk(p) && javaSig(p) && devRole(p) && y(p) >= 36 ? 1 + (springOracle(p) ? 2 : 0) + (enHi(p) ? 2 : enAny(p) ? 1 : 0) + locA(p) : null),
  },
  {
    gkey: 'sdesk', camp: 'cyberlogitec1002-recommend-sdesk', jobKey: 'V213',
    label: { vi: 'Service Desk (Fresher/Junior)', ko: '영어 상급 × 0~24m × 비학생 (고객지원/물류/회계/ERP/SQL 가점)' },
    pick: (p) => (hcmOk(p) && enHi(p) && y(p) <= 24 && !student(p) ? 1 + (sdPref(p) ? 2 : 0) + (!devOnly(p) ? 1 : 0) + locA(p) : null),
  },
]

// ── 공고·카피 (vi 실발송) — 필수/우대/근무 조건 전부 명시해 자기선별 유도 ──
const CO = 'Cyber Logitec'
const CL_INTRO = '<b>Cyber Logitec Vietnam</b> — công ty IT Hàn Quốc phát triển giải pháp logistics &amp; vận tải container toàn cầu (Global Delivery Center tại TP.HCM)'
const BENEFITS = 'Quyền lợi: lương theo năng lực, xét tăng lương mỗi 6 tháng (nếu lương cơ bản dưới 30 triệu), lương tháng 13 &amp; thưởng lễ, bảo hiểm PVI, team building hàng tháng, company trip, cơ hội đào tạo tại nước ngoài.'
const JOBS = {
  V210: {
    id: '75cc1ee0-2739-41d4-b5c8-34a7fca1675e', company: CO, initial: 'C', meta: 'Onsite · TP.HCM · Junior/Middle · 3 năm+ Java',
    intro: `${CL_INTRO} — đang tuyển <b>Java Developer (Oracle)</b> qua FYI. Công việc: phát triển &amp; bảo trì hệ thống nghiệp vụ logistics/container shipping (sẽ được đào tạo nghiệp vụ), full-stack (front-end, back-end &amp; SQL), làm việc với khách hàng để lấy &amp; phân tích yêu cầu. <b>Yêu cầu bắt buộc</b>: từ <b>3 năm kinh nghiệm Java</b>, nắm vững OOP &amp; nguyên lý thiết kế, thực hành <b>Java Spring, Oracle SQL</b>, JavaScript/HTML/CSS, <b>đọc – viết tiếng Anh tốt</b>. <b>Ưu tiên</b>: nghe – nói tiếng Anh lưu loát. ${BENEFITS}`,
  },
  V211: {
    id: 'f7eb6991-fbec-4941-a723-d184d3cbc3cf', company: CO, initial: 'C', meta: 'Onsite · TP.HCM · Middle · 3 năm+ RPA · Lịch nghỉ lễ Hàn Quốc',
    intro: `${CL_INTRO} — đang tuyển <b>RPA Developer (Middle)</b> qua FYI cho dự án tự động hóa doanh nghiệp (kết nối ERP nội bộ với SAP) của một tập đoàn Hàn Quốc. Công việc: thiết kế &amp; phát triển bot unattended/attended trên Automation Anywhere, xử lý ngoại lệ &amp; retry, tự động hóa nhập liệu giữa ERP và SAP, làm việc với khách hàng bằng tiếng Anh. <b>Yêu cầu bắt buộc</b>: <b>3 năm+ phát triển phần mềm/RPA</b>, <b>thành thạo Automation Anywhere</b> (nền tảng chính), đã hoàn thành ít nhất 1 dự án RPA end-to-end, giao tiếp tiếng Anh qua chat ở mức công việc. <b>Ưu tiên</b>: Power Automate, tích hợp SAP/ERP, tự động hóa ứng dụng Windows desktop. <b>Lưu ý</b>: vị trí này <b>theo lịch nghỉ lễ Hàn Quốc</b>, không theo lịch nghỉ lễ Việt Nam. ${BENEFITS}`,
  },
  V212: {
    id: 'be6c9652-445b-4fde-a3c2-b3a9bc31d40a', company: CO, initial: 'C', meta: 'Onsite · TP.HCM · Junior/Middle · Tiếng Hàn lưu loát · Có đi công tác tỉnh',
    intro: `${CL_INTRO} — đang tuyển <b>IT Solution Sales (Korean speaking)</b> qua FYI. Đây là vị trí <b>sales thuần</b> (phát triển kinh doanh &amp; quan hệ khách hàng, không làm admin/sales support): phát triển quan hệ với khách hàng &amp; đối tác nói tiếng Hàn, tìm cơ hội kinh doanh mới, gặp khách hàng &amp; thuyết trình, đề xuất giải pháp, đạt chỉ tiêu doanh số. <b>Yêu cầu bắt buộc</b>: <b>tiếng Hàn lưu loát cả 4 kỹ năng</b> (nghe – nói – đọc – viết), sẵn sàng <b>đi công tác ngoài TP.HCM</b> (Bình Dương, Long An và các tỉnh lân cận), chủ động, định hướng kết quả. <b>Ưu tiên</b>: kinh nghiệm sales junior/mid, từng làm với khách hàng Hàn Quốc hoặc trong môi trường doanh nghiệp Hàn, nền tảng B2B sales/business development. ${BENEFITS}`,
  },
  V213: {
    id: '1d4dba9d-9409-43ff-8bae-b346910a7bd0', company: CO, initial: 'C', meta: 'Onsite · TP.HCM · Fresher/Junior · Làm 3 ca xoay (có ca đêm, cuối tuần, Tết)',
    intro: `${CL_INTRO} — đang tuyển <b>Service Desk (Fresher/Junior)</b> qua FYI. Công việc: tiếp nhận yêu cầu từ khách hàng toàn cầu (Mỹ, Hàn, Nhật, Singapore, Ấn Độ, Trung Quốc, Thổ Nhĩ Kỳ…) qua email/website/điện thoại và hỗ trợ xử lý sự cố khi dùng hệ thống của công ty. <b>Yêu cầu bắt buộc</b>: <b>tiếng Anh đọc – viết tốt</b>, tư duy phân tích &amp; logic, dùng được Word/Excel/Outlook. <b>Lưu ý quan trọng về giờ làm</b>: làm <b>5 ngày/tuần theo 3 ca xoay</b> — Ca 1: 6h–14h, Ca 2: 14h–22h, <b>Ca 3: 22h–6h</b> — <b>bao gồm cuối tuần, ngày lễ và Tết</b> theo sắp xếp của công ty. <b>Ưu tiên</b>: kinh nghiệm Shipping/Logistics, Kế toán, ERP; hiểu biết IT/SQL/Database; định hướng làm việc lâu dài. ${BENEFITS}`,
  },
  V214: {
    id: '820fe7f4-9a47-4d59-a1d6-38ad5ddefaf3', company: CO, initial: 'C', meta: 'Onsite · TP.HCM · Middle/Senior · 4 năm+ Security',
    intro: `${CL_INTRO} — đang tuyển <b>System Security Engineer (Senior)</b> qua FYI. Công việc: quản trị IAM theo nguyên tắc least privilege (Google Workspace, Microsoft 365, VPN, Slack…), vận hành EDR/Antivirus, quản lý mật khẩu doanh nghiệp, firewall/VPN/Wi-Fi/VLAN, phân tích log bảo mật &amp; xử lý sự cố (phishing, ransomware, malware, rò rỉ dữ liệu), đào tạo nhận thức bảo mật &amp; phối hợp tuân thủ. <b>Yêu cầu bắt buộc</b>: <b>4 năm+ Information Security / IT Security / System Administration</b>, thực hành IAM (Active Directory, Google Workspace, M365…), triển khai &amp; vận hành EDR, firewall, VPN, kinh nghiệm giám sát &amp; điều tra sự cố bảo mật, nền tảng vững về network security/access control/vulnerability management. <b>Ưu tiên</b>: Security+/CEH/CISSP, SIEM (Sentinel, Splunk, QRadar), cloud security (Azure/AWS/GCP), ISO 27001/CIS/NIST. ${BENEFITS}`,
  },
}

const SUBJECT = {
  public: (company, role) => `[FYI] Bạn được chọn vào danh sách đề cử gửi ${company} — ${role} (TP.HCM)`,
  private: (company, role) => `[FYI] Bạn được chọn vào danh sách đề cử — ${role} tại ${company} (TP.HCM)`,
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
  const jobIds = Object.values(JOBS).map((j) => j.id)
  const { data: jobRows, error: jobErr } = await sb.from('jobs')
    .select('id,title,company,location,logo_url,is_active,source_id').in('id', jobIds)
  if (jobErr) { console.error('공고 조회 실패:', jobErr.message); process.exit(1) }
  const jobById = Object.fromEntries((jobRows || []).map((j) => [j.id, j]))
  for (const [k, jd] of Object.entries(JOBS)) {
    const j = jobById[jd.id]
    if (!j || !j.is_active) { console.error(`공고 없음/비활성: ${k} (${jd.id})`); process.exit(1) }
    if (j.source_id !== k) { console.error(`source_id 불일치: ${k} vs DB ${j.source_id} (${jd.id})`); process.exit(1) }
  }

  const resend = new Resend(env.RESEND_API_KEY)
  const url = (userId, camp, jobId) => `${SITE}/api/resume/recommend?t=${makeToken(userId, camp)}&j=${jobId}`
  const unsubFor = (userId, camp) => `${SITE}/api/coldmail/unsub?t=${makeToken(userId, camp)}`

  const [pool, unsubs, recs, apps] = await Promise.all([
    fetchAll(() => sb.from('user_profiles')
      .select('id,email,full_name,position,desired_roles,headline,major,graduation_year,yoe_months,location,english_cert,korean_cert,is_resume_public,skills,resume_summary,experiences')
      .not('email', 'is', null).not('resume_url', 'is', null).order('created_at', { ascending: false })),
    fetchAll(() => sb.from('events').select('user_id').eq('event', 'coldmail_unsub').not('user_id', 'is', null).order('id')),
    fetchAll(() => sb.from('job_recommendations').select('user_id,job_id').in('job_id', jobIds).order('id')),
    fetchAll(() => sb.from('job_applications').select('user_id,job_id').in('job_id', jobIds).order('id')),
  ])
  const unsubSet = new Set(unsubs.map((r) => r.user_id))
  const recSet = new Set(recs.map((r) => `${r.user_id}|${r.job_id}`))
  const appliedSet = new Set(apps.map((a) => `${a.user_id}|${a.job_id}`))

  const seen = new Set()
  const assigned = []
  let skipRec = 0
  for (const p of pool) {
    if (!p.email || /likelion/i.test(p.email)) continue
    const e = p.email.toLowerCase()
    if (seen.has(e) || unsubSet.has(p.id)) continue
    p.__t = txt(p)
    for (const g of GROUPS) {
      const s = g.pick(p)
      if (s == null) continue
      const jobId = JOBS[g.jobKey].id
      if (appliedSet.has(`${p.id}|${jobId}`) || recSet.has(`${p.id}|${jobId}`)) { skipRec++; continue }
      seen.add(e)
      assigned.push({ p, s, g, frame: p.is_resume_public ? 'public' : 'private' })
      break
    }
  }

  console.log('발송 대상(1인 1통 배정):')
  for (const g of GROUPS) {
    const rows = assigned.filter((r) => r.g.gkey === g.gkey)
    const pub = rows.filter((x) => x.frame === 'public').length
    console.log(`  ${g.gkey} → ${g.jobKey} (${g.label.ko}): ${rows.length}명 (공개 ${pub} / 비공개 ${rows.length - pub})`)
  }
  console.log(`  ── 합계: ${assigned.length}명 (제외: 해당 공고 기수신/기지원 ${skipRec})`)
  if (!doSend) {
    for (const g of GROUPS) {
      const rows = assigned.filter((r) => r.g.gkey === g.gkey).sort((a, b) => b.s - a.s)
      if (!rows.length) continue
      console.log(`\n── ${g.gkey} 상위 10 표본 (총 ${rows.length}) ──`)
      for (const { p, s, frame } of rows.slice(0, 10))
        console.log(`  [${s}·${frame}] ${p.full_name} <${p.email}> · ${p.position || '?'} · ${Math.round((p.yoe_months || 0) / 12 * 10) / 10}y · ${String(p.location || '위치?').slice(0, 22)} · en=${String(p.english_cert || '-').slice(0, 14)} ko=${String(p.korean_cert || '-').slice(0, 12)}`)
    }
    console.log('\n(dry-run — 실발송하려면 --send, 그룹 한정 --group <gkey>)')
    return
  }

  let targets = assigned
  if (onlyGroup) targets = targets.filter((r) => r.g.gkey === onlyGroup)
  if (maxN) targets = targets.slice(0, maxN)
  let ok = 0, fail = 0
  const okBy = {}
  for (const { p, g, frame } of targets) {
    const jd = JOBS[g.jobKey]
    const job = jobById[jd.id]
    const camp = `${g.camp}-${frame}`
    const u = url(p.id, camp, jd.id), un = unsubFor(p.id, camp)
    const { error } = await resend.emails.send({
      from: RESEND_FROM, to: p.email, subject: SUBJECT[frame](jd.company, g.label.vi),
      html: emailHtml(p.full_name, u, un, jd, job, frame), text: emailText(p.full_name, u, un, jd, job, frame),
      headers: { 'List-Unsubscribe': `<${un}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
    })
    if (error) { console.error(`실패 ${p.email}:`, error.message || error); fail++; continue }
    await sb.from('job_recommendations').upsert([{
      user_id: p.id, to_email: p.email, job_id: jd.id,
      job_title: job.title, job_company: job.company, sent_by: 'coldmail', kind: 'recommend', status: 'sent',
    }], { onConflict: 'user_id,job_id', ignoreDuplicates: true })
    await sb.from('events').insert([{
      event: 'recommend_sent', page: '/scripts/cyberlogitec1002-recommend-coldmail',
      meta: { campaign: camp, job_ids: [jd.id], frame, group: g.gkey }, user_id: p.id,
    }])
    ok++; okBy[g.jobKey] = (okBy[g.jobKey] || 0) + 1
    if (ok % 25 === 0) console.log(`  …${ok}/${targets.length}`)
    await sleep(400)
  }
  console.log(`\n✅ 발송 완료: ${ok}/${targets.length} (실패 ${fail}) — ${Object.entries(okBy).map(([k, v]) => `${k} ${v}`).join(' · ')}`)
}

main().catch((e) => { console.error(e); process.exit(1) })
