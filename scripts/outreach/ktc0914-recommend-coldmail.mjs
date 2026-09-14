// KTC 9/14 미착수 5공고 recommend — 보드 전수감사에서 콜드메일 발송 0건으로 확인된 공고 일괄 소싱.
//   V87  The Xanh   Export & Sourcing Executive (2-5y, HCMC, 13-20M) — 수출입·소싱 시그널
//   YD1904 Yellow Dr. Showroom manager/CEO assistant (3y+, HCMC, 20-25M) — 한국어 회화 필수(JD)
//   YD1903 Yellow Dr. Sales & Showroom Operations (1y+, HCMC, 10-18M) — 세일즈·B2B
//   R192 Wellpod    TikTok Shop 광고 운영 인턴 (HCMC, 지원금 3-4M) — 마케팅·이커머스 인턴
//   V22  BECUAI     Data Labels 데이터 처리 (신입, HCMC 3군, 11-12M) — TOPIK 3-4·야간(15~24시)·주6일(일~금) 명시
// 캐스케이드 순서 = 배정 우선순위(희소 풀 순), 1인 1통. 코드 정본 = ops JD EXECUTION 시트 대조 완료(9/14).
// 표준: 1인1통(당일 recommend 기수신 제외) · unsub 전역 제외 · 공개/비공개 프레임 · 발송 전 coldmailTemplates 등록.
//
//   node scripts/outreach/ktc0914-recommend-coldmail.mjs                       # dry-run
//   node scripts/outreach/ktc0914-recommend-coldmail.mjs --send [--group <gkey>] [--max N] [--gap-hours N]
import { Resend } from 'resend'
import { sb, env, fetchAll } from './lib.mjs'
import { makeToken } from '../../lib/campaignToken.js'

const args = process.argv.slice(2)
const flag = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? (args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true) : d }
const doSend = args.includes('--send')
const onlyGroup = flag('group', null)
const maxN = flag('max', null) ? parseInt(flag('max'), 10) : null
const gapHours = flag('gap-hours', null) ? parseFloat(flag('gap-hours')) : null
const sinceIso = gapHours != null ? new Date(Date.now() - gapHours * 3600 * 1000).toISOString() : new Date().toISOString().slice(0, 10)
const SITE = String(flag('site', env.NEXT_PUBLIC_SITE_URL || 'https://salary-fyi.com')).replace(/\/$/, '')
const RESEND_FROM = env.RESEND_FROM || 'FYI <hello@salary-fyi.com>'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const esc = (s) => String(s || '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
const firstName = (n) => String(n || '').trim().split(/\s+/).slice(-1)[0] || 'bạn'
const strip = (s) => String(s).replace(/<[^>]+>/g, '')

// ── 대상 선정 헬퍼 (ktc0907 계열과 동일 패턴) ──
const norm = (v) => (Array.isArray(v) ? v.join(' ') : String(v || ''))
const txt = (p) => {
  const exp = Array.isArray(p.experiences) ? p.experiences.map((e) => `${e.title || e.position || ''} ${e.company || ''}`).join(' ') : ''
  return [p.position, p.headline, norm(p.desired_roles), norm(p.skills), exp, JSON.stringify(p.resume_summary || '')].join(' ').toLowerCase()
}
const y = (p) => p.yoe_months ?? 0
const roles = (p) => [p.position, ...(p.desired_roles || [])].filter(Boolean).map((r) => String(r).toLowerCase())
// HCMC 게이트: A=명시(+가점) / B=빈값(허용) / X=타지역(제외)
const hcmBucket = (loc) => {
  const s = String(loc || '').toLowerCase().trim()
  if (!s) return 'B'
  return /(hồ chí minh|ho chi minh|hochiminh|hcmc|\bhcm\b|tp\.?hcm|sài gòn|saigon|thủ đức|thu duc|bình thạnh|binh thanh)/.test(s) ? 'A' : 'X'
}
const inHCM = (p) => ['A', 'B'].includes(hcmBucket(p.location))
const hcmA = (p) => (hcmBucket(p.location) === 'A' ? 2 : 0)
const koSig = (p) => !!p.korean_cert || /(topik|tiếng hàn|korean language|한국어)/i.test(txt(p))
// BECUAI는 읽기·타이핑 실무라 인증/명시 시그널만 (MISA·IA 오탐 교훈: 넓은 korean 매칭 금지)
const koHard = (p) => !!p.korean_cert || /topik/i.test(txt(p))
const enSig = (p) => !!p.english_cert || /(ielts|toeic|english)/i.test(txt(p))

const expRe = /(export|import|xuất khẩu|nhập khẩu|logistics|supply chain|sourcing|procurement|thu mua|merchandi[sz]|forwarder|chứng từ xuất|customs|hải quan|\bc\/o\b|xuất nhập khẩu|xnk)/i
const mgrRe = /(quản lý|manager|operations|vận hành|hành chính|văn phòng|office manager|trợ lý giám đốc|ceo assistant|chief of staff|hr|admin)/i
const beautyRe = /(mỹ phẩm|my pham|beauty|cosmetic|skincare|dược|pharma|thực phẩm chức năng|healthcare|thiết bị y tế|medical device|nhà thuốc)/i
const salesRe = /(sales|kinh doanh|business development|\bbd\b|b2b|bán hàng|account executive)/i
const SALES_ROLES = ['sales', 'business dev', 'sales director', 'sales engineer', 'sales admin', 'sales manager']
// 텍스트 시그널 오탐 차단(MISA 교훈): 개발·디자인 등 명백한 비인접 직군은 시그널이 있어도 제외
const BLOCK_ROLES = ['backend', 'frontend', 'fullstack', 'full-stack', 'mobile', 'developer', 'devops', 'game', 'data', 'qa', 'design', 'designer', 'it support', 'security', 'embedded', 'ai engineer', 'finance', 'business analyst', 'interpreter', 'warehouse', 'production worker']
const blocked = (p) => roles(p).some((r) => BLOCK_ROLES.some((b) => r.includes(b)))
const MKT_ROLES = ['marketing', 'digital marketing', 'content marketing', 'performance marketing', 'social media', 'e-commerce', 'ecommerce']
const mktRe = /(marketing|quảng cáo|tiktok|e-?commerce|thương mại điện tử|content|social media|digital|shopee|lazada|kol|koc)/i
const tiktokRe = /(tiktok|tik tok)/i

// ── 그룹 (배정 우선순위 = 희소 풀 순) ──
const GROUPS = [
  {
    gkey: 'thexanh', camp: 'thexanh-recommend1-exp', jobKey: 'V87',
    label: { vi: 'Export & Sourcing Executive (Korea Market)', ko: '수출·소싱 담당(2-5y)' },
    // 시트 2-5y 하드컷 × 수출입/소싱/물류 시그널 × HCMC × 비인접 직군 차단
    pick: (p) => (inHCM(p) && !blocked(p) && y(p) >= 24 && y(p) <= 60 && expRe.test(txt(p))
      ? 1 + hcmA(p) + (koSig(p) ? 1 : 0) + (enSig(p) ? 1 : 0) : null),
  },
  {
    gkey: 'ydmgr', camp: 'yellowdr-recommend1-mgr', jobKey: 'YD1904',
    label: { vi: 'Showroom Manager / CEO Assistant', ko: '쇼룸 매니저/CEO 어시스턴트(3y+, 한국어)' },
    // JD 하드컷: 한국어 회화 × 3y+ × 운영/관리 시그널 × HCMC. 뷰티·헬스케어 가점.
    pick: (p) => (inHCM(p) && koSig(p) && y(p) >= 36 && mgrRe.test(txt(p))
      ? 1 + hcmA(p) + (beautyRe.test(txt(p)) ? 2 : 0) : null),
  },
  {
    gkey: 'ydsales', camp: 'yellowdr-recommend1-sales', jobKey: 'YD1903',
    label: { vi: 'Sales & Showroom Operations Executive', ko: '세일즈·쇼룸 운영(1y+)' },
    // 1y+ × HCMC × 급여 밴드 상한(10-18M ↔ 10y 초과 미스매치 컷, PI 교훈)
    // 세일즈 직군은 그대로, 인접 직군(Marketing/Operations/Non-IT/Other)은 세일즈 텍스트 시그널 필수(Motive 확장룰)
    pick: (p) => {
      if (!inHCM(p) || blocked(p) || y(p) < 12 || y(p) > 120) return null
      const isSalesRole = roles(p).some((r) => SALES_ROLES.some((sr) => r.includes(sr) || sr.includes(r)))
      const isAdjacent = roles(p).some((r) => ['marketing', 'operations', 'non-it', 'other', 'hr'].includes(r)) && salesRe.test(txt(p))
      return isSalesRole || isAdjacent ? 1 + hcmA(p) + (beautyRe.test(txt(p)) ? 2 : 0) : null
    },
  },
  {
    gkey: 'wellpod', camp: 'wellpod-recommend2-ads', jobKey: 'R192',
    label: { vi: 'Thực tập sinh Vận hành Quảng cáo TikTok Shop', ko: 'TikTok Shop 광고 운영 인턴' },
    // 인턴 적합(≤1y) × 마케팅/이커머스(직군 or 시그널) × HCMC. TikTok·한국어/영어 가점.
    pick: (p) => (inHCM(p) && y(p) <= 12 && (roles(p).some((r) => MKT_ROLES.some((m) => r.includes(m))) || mktRe.test(txt(p)))
      ? 1 + hcmA(p) + (tiktokRe.test(txt(p)) ? 2 : 0) + (koSig(p) ? 1 : 0) + (enSig(p) ? 1 : 0) : null),
  },
  {
    gkey: 'becuai', camp: 'becuai-recommend1-data', jobKey: 'V22',
    label: { vi: 'Nhân viên Xử lý Dữ liệu (Data Labels)', ko: '데이터 처리(한국어 뉴스, TOPIK 3-4)' },
    // 하드컷: 한국어 인증/TOPIK 명시 × 신입~3y × HCMC. 직군 무관(대졸 신입 대상, 야간·주6일은 카피로 자기선별).
    pick: (p) => (inHCM(p) && koHard(p) && y(p) <= 36 ? 1 + hcmA(p) + (p.korean_cert ? 2 : 0) : null),
  },
]

// ── 공고·카피 (vi 실발송) — 조건 전부 명시해 자기선별 유도 ──
const JOBS = {
  V87: {
    id: '7d8d14dc-7011-403b-b14d-c15f53cdc465', company: 'The Xanh', initial: 'T',
    meta: 'Onsite · TP.HCM (Q.7/Q.1/Bình Thạnh) · 13–20 triệu ₫/tháng',
    intro: '<b>THE XANH HOLDINGS</b> — công ty sourcing & xuất khẩu nông sản Việt Nam sang thị trường Hàn Quốc (trái cây sấy, mật ong, hạt macca/điều, gia vị, thủy sản, OEM…) — đang tuyển <b>Export & Sourcing Executive (Korea Market)</b> qua FYI. Công việc: tìm kiếm & đánh giá nhà cung cấp (có đi thăm nhà máy), đàm phán báo giá, quản lý PO→shipment, chứng từ xuất khẩu (Invoice, Packing List, C/O, Phytosanitary, B/L…), kiểm tra chất lượng trước xuất hàng, làm việc với khách hàng Hàn Quốc. Yêu cầu <b>2–5 năm kinh nghiệm</b> xuất nhập khẩu/logistics/sourcing. Lương 13–20 triệu ₫/tháng.',
  },
  YD1904: {
    id: '90bc06db-843a-44c5-aaf9-7f03b72dffc0', company: 'Yellow Dr.', initial: 'Y',
    meta: 'Onsite · Bình Thạnh, TP.HCM · 20–25 triệu ₫/tháng',
    intro: '<b>Yellow Dr.</b> — thương hiệu chăm sóc sức khỏe bàn chân đến từ Hàn Quốc — đang tuyển <b>Showroom Manager / CEO Assistant</b> qua FYI. Công việc: quản lý & vận hành văn phòng/showroom, chuẩn bị đưa sản phẩm mới ra thị trường, quản lý chi phí & chứng từ. Yêu cầu: kinh nghiệm quản lý trong beauty/mỹ phẩm/thực phẩm chức năng/thiết bị y tế, từng xây dựng hệ thống & quy trình vận hành, <b>giao tiếp được bằng tiếng Hàn</b> (lương deal theo năng lực & trình độ tiếng Hàn, không có mức trần). Làm việc T2–T6 10:00–19:00, T7 10:00–15:00.',
  },
  YD1903: {
    id: 'f3ce96fc-8c2d-4842-81cc-4a645ad64f15', company: 'Yellow Dr.', initial: 'Y',
    meta: 'Onsite · Bình Thạnh, TP.HCM · 10–18 triệu ₫/tháng',
    intro: '<b>Yellow Dr.</b> — thương hiệu chăm sóc sức khỏe bàn chân đến từ Hàn Quốc — đang tuyển <b>Sales & Showroom Operations Executive</b> qua FYI. Công việc: vận hành showroom & quản lý tồn kho, chăm sóc khách hàng qua Zalo/website/hotline, phát triển khách hàng <b>B2B</b> (nhà thuốc, đại lý, cơ sở y tế). Yêu cầu: <b>tối thiểu 1 năm kinh nghiệm sales</b> trong siêu thị/chăm sóc sức khỏe/mỹ phẩm/dược phẩm/thiết bị y tế. Làm việc T2–T6 10:00–19:00, T7 10:00–15:00. Lương 10–18 triệu ₫/tháng.',
  },
  R192: {
    id: 'de7f0cf8-a34f-4152-a360-794cb83fa649', company: 'Wellpod', initial: 'W',
    meta: 'Thực tập · TP.HCM · Hỗ trợ 3–4 triệu ₫/tháng',
    intro: '<b>Wellpod</b> — công ty Hàn Quốc vận hành quảng cáo TikTok Shop thị trường Mỹ — đang tuyển <b>Thực tập sinh Vận hành Quảng cáo TikTok Shop</b> qua FYI. Công việc: hỗ trợ vận hành & theo dõi hiệu quả quảng cáo TikTok Shop Mỹ, nghiên cứu xu hướng e-commerce, hỗ trợ giao tiếp giữa trụ sở Hàn Quốc và văn phòng Việt Nam. Ưu tiên: biết <b>tiếng Hàn hoặc tiếng Anh tốt</b>, chuyên ngành/kinh nghiệm marketing, quan tâm TikTok Shop & e-commerce, dùng được Excel/Google Sheets & AI tạo sinh. Hỗ trợ 3–4 triệu ₫/tháng. (Đây là vị trí vận hành quảng cáo & quản lý dự án, không phải tuyển influencer.)',
  },
  V22: {
    id: '750069bb-878d-4065-8859-71668d36076c', company: 'BECUAI VIETNAM', initial: 'B',
    meta: 'Onsite · Q.3 (P. Bàn Cờ), TP.HCM · Gross 12 triệu ₫/tháng + phụ cấp đêm',
    intro: '<b>BECUAI VIETNAM</b> đang tuyển <b>Nhân viên Xử lý Dữ liệu (Data Labels)</b> qua FYI — nhập liệu, lưu trữ & quản lý dữ liệu báo chí/tin tức Hàn Quốc cho AI (được hướng dẫn & đào tạo, <b>không yêu cầu kinh nghiệm</b>). Yêu cầu: tốt nghiệp đại học, <b>tiếng Hàn đọc hiểu khá (tối thiểu TOPIK 3–4)</b> — phỏng vấn bằng tiếng Hàn & có test đánh máy tiếng Hàn, nộp CV tiếng Hàn/tiếng Anh. Lưu ý giờ làm: <b>15:00–00:00 (làm đêm, có phụ cấp), Chủ Nhật đến Thứ 6</b>. Lương gross 12 triệu ₫ (thử việc 2 tháng 85%), có ký túc xá cách công ty 3 phút đi bộ, hỗ trợ mộc thực tập.',
  },
}

const SUBJECT = {
  public: (company, role) => `[FYI] Bạn được chọn vào danh sách đề cử gửi ${company} — ${role}`,
  private: (company, role) => `[FYI] Bạn được chọn vào danh sách đề cử — ${role} tại ${company}`,
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
    .select('id,title,company,location,logo_url,is_active').in('id', jobIds)
  if (jobErr) { console.error('공고 조회 실패:', jobErr.message); process.exit(1) }
  const jobById = Object.fromEntries((jobRows || []).map((j) => [j.id, j]))
  for (const [k, jd] of Object.entries(JOBS)) {
    const j = jobById[jd.id]
    if (!j || !j.is_active) { console.error(`공고 없음/비활성: ${k} (${jd.id})`); process.exit(1) }
  }

  const resend = new Resend(env.RESEND_API_KEY)
  const url = (userId, camp, jobId) => `${SITE}/api/resume/recommend?t=${makeToken(userId, camp)}&j=${jobId}`
  const unsubFor = (userId, camp) => `${SITE}/api/coldmail/unsub?t=${makeToken(userId, camp)}`

  const [pool, unsubs, recs, apps, todays] = await Promise.all([
    fetchAll(() => sb.from('user_profiles')
      .select('id,email,full_name,position,desired_roles,yoe_months,location,english_cert,korean_cert,is_resume_public,skills,resume_summary,headline,experiences')
      .not('email', 'is', null).not('resume_url', 'is', null).order('created_at', { ascending: false })),
    fetchAll(() => sb.from('events').select('user_id').eq('event', 'coldmail_unsub').not('user_id', 'is', null).order('id')),
    fetchAll(() => sb.from('job_recommendations').select('user_id,job_id').in('job_id', jobIds).order('id')),
    fetchAll(() => sb.from('job_applications').select('user_id,job_id').in('job_id', jobIds).order('id')),
    fetchAll(() => sb.from('job_recommendations').select('user_id,to_email').gte('created_at', sinceIso).order('id')),
  ])
  const unsubSet = new Set(unsubs.map((r) => r.user_id))
  const recSet = new Set(recs.map((r) => `${r.user_id}|${r.job_id}`))
  const appliedSet = new Set(apps.map((a) => `${a.user_id}|${a.job_id}`))
  const todayUsers = new Set(todays.map((r) => r.user_id))
  const todayEmails = new Set(todays.map((r) => (r.to_email || '').toLowerCase()).filter(Boolean))

  const seen = new Set()
  const assigned = []
  let skipRec = 0, skipToday = 0
  for (const p of pool) {
    if (!p.email || /likelion/i.test(p.email)) continue
    const e = p.email.toLowerCase()
    if (seen.has(e) || unsubSet.has(p.id)) continue
    for (const g of GROUPS) {
      const s = g.pick(p)
      if (s == null) continue
      const jobId = JOBS[g.jobKey].id
      if (appliedSet.has(`${p.id}|${jobId}`) || recSet.has(`${p.id}|${jobId}`)) { skipRec++; continue }
      seen.add(e)
      if (todayUsers.has(p.id) || todayEmails.has(e)) { skipToday++; break }
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
  console.log(`  ── 합계: ${assigned.length}명 (제외: 해당 공고 기수신/기지원 ${skipRec} · 당일 발송 겹침 ${skipToday})`)
  if (!doSend) {
    for (const g of GROUPS) {
      const rows = assigned.filter((r) => r.g.gkey === g.gkey).sort((a, b) => b.s - a.s)
      if (!rows.length) continue
      console.log(`\n── ${g.gkey} 전원 ──`)
      for (const { p, s, frame } of rows)
        console.log(`  [${s}·${frame}] ${p.full_name} <${p.email}> · ${p.position || '?'} · ${Math.round((p.yoe_months || 0) / 12 * 10) / 10}y · ${p.location || '위치?'}`)
    }
    console.log('\n(dry-run — 실발송하려면 --send, 그룹 한정 --group <gkey>)')
    return
  }

  let targets = assigned
  if (onlyGroup) targets = targets.filter((r) => r.g.gkey === onlyGroup)
  if (maxN) targets = targets.slice(0, maxN)
  let ok = 0, fail = 0
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
      event: 'recommend_sent', page: '/scripts/ktc0914-recommend-coldmail',
      meta: { campaign: camp, job_ids: [jd.id], frame, group: g.gkey }, user_id: p.id,
    }])
    ok++
    if (ok % 25 === 0) console.log(`  …${ok}/${targets.length}`)
    await sleep(400)
  }
  console.log(`\n✅ 발송 완료: ${ok}/${targets.length} (실패 ${fail})`)
}

main().catch((e) => { console.error(e); process.exit(1) })
