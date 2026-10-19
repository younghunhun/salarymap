// GPCLUB V256 Senior Accountant · V257 Sales Operations Admin (Korean Speaking) — 10/16 Len FYI 게재, 10/19 발송. HCM Bình Thạnh(27-29 Nguyễn Cửu Vân) 온사이트 · 월~금 8:30–18:00 + 토 오전.
// V256: 22M gross · AP/일반/세무 회계 2~4y · VAT 발행·은행(CitiBank/MBbank)·P&L·해외차입 보고 · 영어 업무 가능.  V257: 15M · 세일즈어드민/백오피스/수출입 1~3y · PO/DO/인보이스 · C/O·C/I·CFS·LOA · 한국 본사 소통(한국어 유창).
// 10/19 실측(scratchpad wk1-4.mjs, HCM권/미기재): V256 회계 직함 2~5y 20 · 5y+ 20 · 1~2y 11 · Finance 직군/전공(직함 없음) 54 / V257 KO×어드민·수출입 1~3y 40 · 3y+ 16 · <1y 23 · KO 기타 사무 55 · 한국어전공 신입 28.
// 7일 내 recommend 기수신 비율 95%+ (E-JUNG/STS/PI Power 회계, Hyosung KO 발송과 중복) — 응답률 낮게 전제. 1인1통 우선순위: V256 직함 코어 > V257 KO 코어 > V256 확장 > V257 확장.
// 표준: 1인1통 · unsub/블랙리스트 전역 제외 · 공개/비공개 프레임 · 당일 recommend 기수신자 제외 · 발송 전 coldmailTemplates 등록.
//
//   node scripts/outreach/gpclub1019-recommend-coldmail.mjs                 # dry-run
//   node scripts/outreach/gpclub1019-recommend-coldmail.mjs --send [--group <gkey>] [--max N] [--ignore-today]
import { Resend } from 'resend'
import { sb, env, fetchAll, fetchBlacklist } from './lib.mjs'
import { makeToken } from '../../lib/campaignToken.js'

const args = process.argv.slice(2)
const flag = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? (args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true) : d }
const doSend = args.includes('--send')
const onlyGroup = flag('group', null)
const maxN = flag('max', null) ? parseInt(flag('max'), 10) : null
const ignoreToday = args.includes('--ignore-today')
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
const hcmRe = /(h[ồo]\s*ch[íi]\s*minh|hcm|sài gòn|sai gon|saigon|thủ đức|thu duc|bình thạnh|bình dương|binh duong|đồng nai|dong nai|biên hòa|long an|호치민|호찌민|hóc môn|gò vấp|go vap|tân bình|tân phú|bình tân|phú nhuận|củ chi|nhà bè|bình chánh|quận \d|district \d|tphcm|tp\.?\s*hcm)/i
const city = (p) => { const l = String(p.location || ''); if (!l.trim()) return '미기재'; if (hcmRe.test(l)) return 'HCM'; return '기타' }
const hcmOk = (p) => city(p) !== '기타'
const hcmA = (p) => (city(p) === 'HCM' ? 2 : 0)
const koCert = (p) => String(p.korean_cert || '').trim()
const hasCert = (c) => !!c && !/^(none|no|không|없음|-|n\/a)$/i.test(c)
const koMajor = (p) => /(hàn quốc|korean|korea|ngôn ngữ hàn|đông phương|oriental|한국어|한국학)/i.test(String(p.major || ''))
const koOk = (p) => hasCert(koCert(p)) || koMajor(p) || /(topik|tiếng hàn|korean|한국어)/i.test(p.__t)
const topik4 = (p) => /topik\s*(4|5|6)|(4|5|6)\s*급|level\s*[456]|cấp\s*[456]|topik\s*ii/i.test(koCert(p)) || koMajor(p)
const enOk = (p) => hasCert(String(p.english_cert || '').trim()) || /(ielts|toeic|toefl|english|tiếng anh)/i.test(p.__t)
const devDesign = (p) => roles(p).some((r) => /(developer|software|frontend|backend|fullstack|mobile|devops|tester|qa engineer|designer|ux|game)/i.test(r))
// V256 회계
const acctRe = /(kế toán|ke toan|accountant|accounting|kiểm toán|kiem toan|auditor|\baudit\b|bookkeep|tài chính|tai chinh|finance|financial)/i
const acctTitle = (p) => acctRe.test(expTitles(p))
const acctMajor = (p) => acctRe.test(String(p.major || ''))
const acctRole = (p) => roles(p).includes('Finance') || acctRe.test(roles(p).join(' '))
const apSig = (p) => /(accounts payable|kế toán thanh toán|kế toán tổng hợp|general accountant|tax accountant|kế toán thuế|vat|hóa đơn|invoice|p&l|báo cáo tài chính|financial report|ngân hàng|banking|citibank|mbbank|misa|fast accounting|bravo)/i.test(p.__t)
const acctBonus = (p) => hcmA(p) + (apSig(p) ? 2 : 0) + (enOk(p) ? 1 : 0) + (acctMajor(p) ? 1 : 0)
// V257 세일즈 어드민(KO)
const adminRe = /(sales admin|sale admin|sales operation|back office|operations admin|order process|đơn hàng|purchase order|\bpo\b|delivery order|import|export|xuất nhập khẩu|xnk|logistics|chứng từ|customs|hải quan|c\/o\b|forwarder|supply chain|merchandis|sales support|admin|trợ lý|assistant|văn phòng|office)/i
const adminRole = (p) => roles(p).some((r) => /(logistics|supply|import|export|purchasing|procurement|merchandis|operations|admin|office|assistant|interpreter|sales|customer)/i.test(r)) || adminRe.test(expTitles(p))
const impexSig = (p) => /(import|export|xuất nhập khẩu|xnk|logistics|chứng từ|customs|hải quan|c\/o\b|forwarder|purchase order|delivery order|b2b)/i.test(p.__t)
const koBonus = (p) => hcmA(p) + (topik4(p) ? 2 : 0) + (impexSig(p) ? 2 : 0) + (enOk(p) ? 1 : 0)

// 우선순위 순서 = 1인1통 배정 순서
const GROUPS = [
  { gkey: 'acct-core', jobKey: 'V256', label: { vi: 'Accountant / Senior Accountant', ko: '회계/재무 직함 × 2~5y × HCM권/미기재 (코어)' },
    pick: (p) => (hcmOk(p) && acctTitle(p) && y(p) >= 24 && y(p) <= 60 ? 60 + acctBonus(p) : null) },
  { gkey: 'acct-junior', jobKey: 'V256', label: { vi: 'Accountant / Senior Accountant', ko: '회계/재무 직함 × 1~2y (확장 — 경력 미달 자기선별)' },
    pick: (p) => (hcmOk(p) && acctTitle(p) && y(p) >= 12 && y(p) < 24 ? 50 + acctBonus(p) : null) },
  { gkey: 'acct-senior', jobKey: 'V256', label: { vi: 'Accountant / Senior Accountant', ko: '회계/재무 직함 × 5y+ (확장 — 경력 초과)' },
    pick: (p) => (hcmOk(p) && acctTitle(p) && y(p) > 60 ? 45 + acctBonus(p) : null) },
  { gkey: 'ko-admin-core', jobKey: 'V257', label: { vi: 'Sales Operations Admin (Korean Speaking)', ko: 'KO × 어드민/영업지원/수출입/통번역 직군·직함 × 1~3y × HCM권/미기재 (코어)' },
    pick: (p) => (hcmOk(p) && koOk(p) && adminRole(p) && !devDesign(p) && y(p) >= 12 && y(p) <= 36 ? 40 + koBonus(p) : null) },
  { gkey: 'ko-admin-senior', jobKey: 'V257', label: { vi: 'Sales Operations Admin (Korean Speaking)', ko: 'KO × 어드민/영업지원/수출입 직군·직함 × 3y+ (확장)' },
    pick: (p) => (hcmOk(p) && koOk(p) && adminRole(p) && !devDesign(p) && y(p) > 36 ? 35 + koBonus(p) : null) },
  { gkey: 'ko-admin-fresh', jobKey: 'V257', label: { vi: 'Sales Operations Admin (Korean Speaking)', ko: 'KO × 어드민/영업지원 직군·직함 × <1y (확장 — 경력 미달 자기선별)' },
    pick: (p) => (hcmOk(p) && koOk(p) && adminRole(p) && !devDesign(p) && y(p) < 12 ? 30 + koBonus(p) : null) },
  { gkey: 'acct-ext', jobKey: 'V256', label: { vi: 'Accountant / Senior Accountant', ko: 'Finance 직군/회계 전공 × 1y+ × 비개발·비디자인, 회계 직함 없음 (확장)' },
    pick: (p) => (hcmOk(p) && !acctTitle(p) && (acctRole(p) || acctMajor(p)) && !devDesign(p) && y(p) >= 12 ? 20 + acctBonus(p) : null) },
  { gkey: 'ko-ext', jobKey: 'V257', label: { vi: 'Sales Operations Admin (Korean Speaking)', ko: 'KO × 기타 비개발·비디자인 × 1y+, 어드민 직군 없음 (확장)' },
    pick: (p) => (hcmOk(p) && koOk(p) && !adminRole(p) && !devDesign(p) && y(p) >= 12 ? 10 + koBonus(p) : null) },
  { gkey: 'ko-major-fresh', jobKey: 'V257', label: { vi: 'Sales Operations Admin (Korean Speaking)', ko: '한국어/한국학 전공 × <1y × 비개발·비디자인 (확장 — 신입)' },
    pick: (p) => (hcmOk(p) && koMajor(p) && !adminRole(p) && !devDesign(p) && y(p) < 12 ? 5 + koBonus(p) : null) },
]

const JOBS = {
  V256: {
    company: 'GPCLUB', initial: 'G', meta: 'Onsite · 27-29 Nguyễn Cửu Vân, P. Gia Định (Bình Thạnh), TP.HCM · 22.000.000 VND gross/tháng · 2–4 năm kế toán',
    intro: `<b>GPCLUB</b> (gpclub.vn) — thương hiệu mỹ phẩm Hàn Quốc kinh doanh B2C/B2B tại Việt Nam — đang tuyển <b>Accountant / Senior Accountant</b> qua FYI, làm việc tại 27-29 Nguyễn Cửu Vân, Bình Thạnh, TP.HCM. Công việc: tiếp nhận, kiểm tra và xử lý đề nghị thanh toán, theo dõi giao dịch ngân hàng hằng ngày; <b>xuất hóa đơn VAT</b> và rà soát chứng từ kế toán, nghĩa vụ thuế; làm việc trực tiếp với ngân hàng (CitiBank, MBbank) về hồ sơ doanh nghiệp và tài khoản hệ thống; tổng hợp số liệu và lập <b>báo cáo tuần, tháng, P&amp;L</b>; nghiên cứu quy định và chuẩn bị hồ sơ <b>báo cáo khoản vay nước ngoài</b>. Yêu cầu: tốt nghiệp Cao đẳng/Đại học Kế toán, Tài chính, Kiểm toán hoặc liên quan; <b>2–4 năm kinh nghiệm kế toán thanh toán, kế toán tổng hợp hoặc kế toán thuế</b>; thành thạo xuất hóa đơn VAT và kiểm tra chứng từ; từng dùng internet banking doanh nghiệp; Excel tốt để tổng hợp dữ liệu và lập P&amp;L; <b>tiếng Anh giao tiếp và đọc hiểu công việc</b> (làm việc với ngân hàng và hồ sơ vay nước ngoài); cẩn thận, chính xác, đúng hạn báo cáo. Lương <b>22.000.000 VND gross/tháng</b>. Thứ 2 – Thứ 6 8:30–18:00, Thứ 7 8:30–12:30.`,
  },
  V257: {
    company: 'GPCLUB', initial: 'G', meta: 'Onsite · 27-29 Nguyễn Cửu Vân, P. Gia Định (Bình Thạnh), TP.HCM · 15.000.000 VND/tháng · Tiếng Hàn thành thạo · 1–3 năm',
    intro: `<b>GPCLUB</b> (gpclub.vn) — thương hiệu mỹ phẩm Hàn Quốc kinh doanh B2C/B2B tại Việt Nam — đang tuyển <b>Back Office / Sales Operations Admin (tiếng Hàn)</b> qua FYI, làm việc tại 27-29 Nguyễn Cửu Vân, Bình Thạnh, TP.HCM. Công việc: tiếp nhận và xác nhận <b>đơn hàng B2B</b> từ khách hàng và chuỗi bán lẻ (AEON, THAO NGO, MKVN, AHH BEAUTY…), tạo booking, xuất Delivery Order, gửi yêu cầu xuất hóa đơn cho Kế toán; cập nhật và đối chiếu <b>vòng quay tồn kho</b> và dữ liệu bán hàng hằng tháng; đối chiếu SKU với <b>C/O, C/I</b> để khai báo hải quan, theo dõi hiệu lực <b>CFS, LOA</b> từ trụ sở Hàn Quốc, phối hợp forwarder chuẩn bị chứng từ nhập khẩu; là <b>đầu mối báo cáo bằng tiếng Hàn với trụ sở (HQ)</b>, phối hợp luật sư (ApexLaw) và Cục Quản lý Dược (DAV) về hồ sơ kiểm tra và công bố mỹ phẩm. Yêu cầu: tốt nghiệp Cao đẳng/Đại học Ngôn ngữ Hàn, QTKD, Thương mại/Ngoại thương hoặc liên quan; <b>tiếng Hàn thành thạo</b> (nói và viết ở mức công việc); <b>1–3 năm kinh nghiệm Sales Admin, Back Office, Operations Admin hoặc Xuất nhập khẩu</b>; biết quy trình PO – DO – hóa đơn và chứng từ XNK (C/O, C/I, Packing List, CFS, LOA); Excel tốt; cẩn thận khi đối chiếu SKU và dữ liệu thương mại. Lương <b>15.000.000 VND/tháng</b>. Thứ 2 – Thứ 6 8:30–18:00, Thứ 7 8:30–12:30.`,
  },
}
const SUBJECT = {
  public: (co, role) => `[FYI] Bạn được chọn vào danh sách đề cử gửi ${co} — ${role} (TP.HCM)`,
  private: (co, role) => `[FYI] Bạn được chọn vào danh sách đề cử — ${role} tại ${co} (TP.HCM)`,
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
    fetchAll(() => sb.from('user_profiles').select('id,email,full_name,position,desired_roles,headline,major,yoe_months,location,english_cert,korean_cert,is_resume_public,skills,resume_summary,experiences,certs,projects').not('email', 'is', null).not('resume_url', 'is', null).order('created_at', { ascending: false })),
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
    if (!ignoreToday && todaySet.has(p.id)) { skipToday++; continue }
    p.__t = txt(p)
    for (const g of GROUPS) {
      const s = g.pick(p); if (s == null) continue
      const jobId = JOBS[g.jobKey].id
      if (appliedSet.has(`${p.id}|${jobId}`) || recSet.has(`${p.id}|${jobId}`)) { skipRec++; continue }
      seen.add(e); assigned.push({ p, s, g, frame: p.is_resume_public ? 'public' : 'private' }); break
    }
  }
  console.log(`발송 대상(1인 1통 배정${ignoreToday ? '' : ' · 당일 recommend 기수신자 제외'}):`)
  for (const g of GROUPS) { const rows = assigned.filter((r) => r.g.gkey === g.gkey); console.log(`  ${g.gkey} → ${g.jobKey}: ${rows.length}명 (공개 ${rows.filter((x) => x.frame === 'public').length}) — ${g.label.ko}`) }
  console.log(`  ── 합계: ${assigned.length}명 (제외: 당일 기수신 ${skipToday} · 해당 공고 기수신/기지원 ${skipRec})`)
  if (!doSend) {
    for (const g of GROUPS) {
      const rows = assigned.filter((r) => r.g.gkey === g.gkey).sort((a, b) => b.s - a.s)
      console.log(`\n── ${g.gkey} 상위 8 (총 ${rows.length}) ──`)
      for (const { p, s, frame } of rows.slice(0, 8)) console.log(`  [${s}·${frame}] ${p.full_name} · ${p.position || '?'} · ${Math.round(y(p) / 12 * 10) / 10}y · ${city(p)} · ${expTitles(p).slice(0, 60)}`)
    }
    console.log('\n(dry-run — 실발송하려면 --send, 그룹 한정 --group <gkey>)'); return
  }
  let targets = [...assigned].sort((a, b) => b.s - a.s)
  if (onlyGroup) targets = targets.filter((r) => r.g.gkey === onlyGroup)
  if (maxN) targets = targets.slice(0, maxN)
  let ok = 0, fail = 0; const okBy = {}
  for (const { p, g, frame } of targets) {
    const jd = JOBS[g.jobKey], job = jobById[jd.id], camp = `gpclub1019-recommend-${g.gkey}-${frame}`
    const u = url(p.id, camp, jd.id), un = unsubFor(p.id, camp)
    const { error } = await resend.emails.send({ from: RESEND_FROM, to: p.email, subject: SUBJECT[frame](jd.company, g.label.vi), html: emailHtml(p.full_name, u, un, jd, job, frame), text: emailText(p.full_name, u, un, jd, job, frame), headers: { 'List-Unsubscribe': `<${un}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' } })
    if (error) { console.error(`실패 ${p.email}:`, error.message || error); fail++; continue }
    await sb.from('job_recommendations').upsert([{ user_id: p.id, to_email: p.email, job_id: jd.id, job_title: job.title, job_company: job.company, sent_by: 'coldmail', kind: 'recommend', status: 'sent' }], { onConflict: 'user_id,job_id', ignoreDuplicates: true })
    await sb.from('events').insert([{ event: 'recommend_sent', page: '/scripts/gpclub1019-recommend-coldmail', meta: { campaign: camp, job_ids: [jd.id], frame, group: g.gkey }, user_id: p.id }])
    ok++; okBy[g.gkey] = (okBy[g.gkey] || 0) + 1; if (ok % 50 === 0) console.log(`  …${ok}/${targets.length}`); await sleep(400)
  }
  console.log(`\n✅ 발송 완료: ${ok}/${targets.length} (실패 ${fail}) — ${Object.entries(okBy).map(([k, v]) => `${k} ${v}`).join(' · ')}`)
}
main().catch((e) => { console.error(e); process.exit(1) })
