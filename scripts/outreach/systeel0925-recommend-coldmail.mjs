// SY STEEL VINA 9/25 신규 6공고 recommend — Len 게재 당일 소싱(코어만).
//   V196 Kế toán thanh toán (동나이 Nhơn Trạch, 무경력 OK·회계 전공·Excel·영어 기본)
//   V197 Nhân viên kho     (동나이 Nhơn Trạch, 입출고 재고관리 경험·영어 기본)
//   V199 Salesman          (하노이 Mễ Trì, 대졸·경제/무역/마케팅/경영 우대·신입 OK·영어 회화)
//   V200 Sales Manager     (하노이 Mễ Trì, 영업 3y+·철강/판넬/건자재 업계 우대·영어)
//   V201 Nhân viên QC      (동나이 Nhơn Trạch, 전문대+·무경력 OK·영어 기본)
//   V202 Nhân viên R&D     (동나이 Nhơn Trạch, 전문대+·무경력 OK·영어 기본)
// 9/25 실측(scripts/tmp/systeel0925-pool-measure.mjs): 회계 83 · 창고 56 · Salesman 118 · SM 64(=Salesman 부분집합) · QC 17 · R&D 10.
// 배정 캐스케이드(1인1통) = SM(3y+) → Salesman → 회계 → 창고 → QC → R&D. 동나이 거주 전체 37명뿐이라 남부권(HCMC/빈즈엉/BR-VT/롱안)+미기재로 잡음.
// 언어 게이트 없음(영어 "기본"·자기기입값) — 가점만. 신선도 하드게이트: 최근 7일 recommend 3통+ 제외.
// 표준: 1인1통 · unsub 전역 제외 · 공개/비공개 프레임 · 발송 전 coldmailTemplates 등록.
//
//   node scripts/outreach/systeel0925-recommend-coldmail.mjs                       # dry-run
//   node scripts/outreach/systeel0925-recommend-coldmail.mjs --send [--group <gkey>] [--max N] [--gap-hours N]
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

// ── 대상 선정 헬퍼 (systeel0925-pool-measure 와 동일) ──
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
const headTxt = (p) => `${p.position || ''} ${p.headline || ''}`.toLowerCase()
const isDev = (p) => roles(p).some((r) => /fullstack|backend|frontend|mobile|devops|ai engineer|data|web|embedded|game|qa|software|tech lead|cloud|sysadmin|network|dba|security/i.test(String(r)))

const loc = (p) => String(p.location || '')
const noLoc = (p) => !loc(p).trim()
const inDongNai = (p) => /(đồng nai|dong nai|nhơn trạch|nhon trach|biên hòa|bien hoa|long thành|long thanh)/i.test(loc(p))
const inSouth = (p) => inDongNai(p) || /(h[ồo]\s*ch[íi]\s*minh|hcm|sài gòn|sai gon|saigon|thủ đức|thu duc|bình dương|binh duong|vũng tàu|vung tau|bà rịa|ba ria|long an)/i.test(loc(p))
const inHanoi = (p) => /(hà nội|ha noi|hanoi|bắc ninh|bac ninh|hưng yên|hung yen|vĩnh phúc|vinh phuc|hà đông|ha dong)/i.test(loc(p))
const southOk = (p) => inSouth(p) || noLoc(p)
const hanoiOk = (p) => inHanoi(p) || noLoc(p)

const enRe = /(english|tiếng anh|ielts|toefl|toeic)/i
const enA = (p) => (p.english_cert || enRe.test(p.__t) ? 1 : 0)
const locA = (p, fn) => (fn(p) ? 1 : 0)

const acctRe = /(kế toán|ke toan|accountant|accounting|thanh toán|công nợ|kiểm toán|auditor|tài chính kế toán)/i
const acctMajor = /(kế toán|ke toan|accounting|accountancy|tài chính|finance|kiểm toán|auditing)/i
const whRe = /(warehouse|(?:^|\s)kho(?=[\s,.;:)\/]|$)|thủ kho|kho vận|nhập kho|xuất kho|inventory|xuất nhập tồn|logistics|supply chain)/i
const salesRe = /(sales|kinh doanh|bán hàng|business development|account executive|account manager)/i
const steelRe = /(thép|steel|tôn|panel|vlxd|vật liệu xây dựng|construction material|building material|cửa|door|thiết bị công nghiệp|industrial equipment)/i
const qcRe = /(\bqc\b|quality control|kiểm tra chất lượng|kiểm soát chất lượng|\bqa\/qc\b|quality inspector|\bkcs\b)/i
const rdRe = /(r&d|r & d|research and development|research & development|nghiên cứu và phát triển|nghiên cứu phát triển|lab technician|laboratory|phòng thí nghiệm|material engineer|kỹ sư vật liệu)/i

const isSales = (p) => has(p, 'Sales') || has(p, 'Business Dev') || salesRe.test(p.__e)
const isAcct = (p) => !isDev(p) && (has(p, 'Finance') || acctRe.test(p.__t) || acctMajor.test(majorTxt(p))) && (acctMajor.test(majorTxt(p)) || acctRe.test(p.__e))
const isWh = (p) => !isDev(p) && (has(p, 'Warehouse') || whRe.test(p.__e))
const isQc = (p) => has(p, 'QC') || (!isDev(p) && (qcRe.test(p.__e) || qcRe.test(headTxt(p))))
const isRd = (p) => !isDev(p) && (rdRe.test(p.__e) || rdRe.test(headTxt(p)) || rdRe.test(majorTxt(p)))

// ── 그룹 (캐스케이드 = 위에서부터 1인1통) ──
const GROUPS = [
  {
    gkey: 'sm', camp: 'systeel0925-recommend-sm', jobKey: 'V200',
    label: { vi: 'Sales Manager', ko: '영업 3y+ × 하노이권' },
    pick: (p) => (isSales(p) && y(p) >= 36 && hanoiOk(p) ? 1 + (steelRe.test(p.__t) ? 3 : 0) + locA(p, inHanoi) + enA(p) : null),
  },
  {
    gkey: 'sales', camp: 'systeel0925-recommend-sales', jobKey: 'V199',
    label: { vi: 'Salesman', ko: '영업(신입 OK) × 하노이권' },
    pick: (p) => (isSales(p) && hanoiOk(p) ? 1 + locA(p, inHanoi) + enA(p) : null),
  },
  {
    gkey: 'acct', camp: 'systeel0925-recommend-acct', jobKey: 'V196',
    label: { vi: 'Kế toán thanh toán', ko: '회계 전공/경력 × 남부권' },
    pick: (p) => (isAcct(p) && southOk(p) ? 1 + (acctRe.test(p.__e) ? 2 : 0) + locA(p, inDongNai) * 2 + enA(p) : null),
  },
  {
    gkey: 'wh', camp: 'systeel0925-recommend-wh', jobKey: 'V197',
    label: { vi: 'Nhân viên kho', ko: '창고/재고 경력 × 남부권' },
    pick: (p) => (isWh(p) && southOk(p) ? 1 + (has(p, 'Warehouse') ? 2 : 0) + locA(p, inDongNai) * 2 + enA(p) : null),
  },
  {
    gkey: 'qc', camp: 'systeel0925-recommend-qc', jobKey: 'V201',
    label: { vi: 'Nhân viên QC', ko: '제조 QC 시그널 × 남부권' },
    pick: (p) => (isQc(p) && southOk(p) ? 1 + (has(p, 'QC') ? 2 : 0) + locA(p, inDongNai) * 2 + enA(p) : null),
  },
  {
    gkey: 'rd', camp: 'systeel0925-recommend-rd', jobKey: 'V202',
    label: { vi: 'Nhân viên R&D', ko: 'R&D/실험실 시그널 × 남부권' },
    pick: (p) => (isRd(p) && southOk(p) ? 1 + locA(p, inDongNai) * 2 + enA(p) : null),
  },
]

// ── 공고·카피 (vi 실발송) — 근무지·요건 전부 명시해 자기선별 유도 ──
const CO = 'SY STEEL VINA'
const SY_INTRO = '<b>SY STEEL VINA</b> — doanh nghiệp sản xuất tôn thép Hàn Quốc tại Việt Nam'
const META_DN = 'Onsite · KCN Nhơn Trạch 5, Đồng Nai · Lương thỏa thuận'
const META_HN = 'Onsite · Mễ Trì, Hà Nội · Lương thỏa thuận'
const JOBS = {
  V196: {
    id: '0158c078-5404-4c40-a509-fe31ca14a0d1', company: CO, initial: 'S', meta: META_DN,
    intro: `${SY_INTRO} — đang tuyển <b>Kế toán thanh toán</b> qua FYI. Công việc: thực hiện nghiệp vụ thanh toán (chi tiền, thu tiền, đối chiếu công nợ), lập chứng từ thanh toán, theo dõi công nợ nhà cung cấp &amp; khách hàng, phối hợp các bộ phận đảm bảo chứng từ hợp lệ. Yêu cầu: tốt nghiệp đại học <b>chuyên ngành Kế toán</b>, thành thạo Excel &amp; phần mềm kế toán, tiếng Anh cơ bản; <b>không có kinh nghiệm sẽ được đào tạo</b>. Quyền lợi: lương thỏa thuận theo năng lực, thưởng lễ Tết &amp; lương tháng 13, BHXH/BHYT/BHTN đầy đủ. Địa điểm: <b>Lô C1, KCN Nhơn Trạch 5, Đồng Nai</b>. Nộp <b>CV tiếng Anh</b>.`,
  },
  V197: {
    id: 'dc60c227-0992-4226-ac43-2adef37e86fd', company: CO, initial: 'S', meta: META_DN,
    intro: `${SY_INTRO} — đang tuyển <b>Nhân viên kho</b> qua FYI. Yêu cầu: có kinh nghiệm <b>quản lý xuất – nhập – tồn kho nguyên vật liệu</b>, tiếng Anh cơ bản. Lương thỏa thuận. Địa điểm: <b>Lô C1, KCN Nhơn Trạch 5, Đồng Nai</b>.`,
  },
  V199: {
    id: '2bcf5123-edd2-4a6d-b2af-82d96a1a9471', company: CO, initial: 'S', meta: META_HN,
    intro: `${SY_INTRO} — đang tuyển <b>Salesman</b> tại văn phòng Hà Nội qua FYI. Yêu cầu: tốt nghiệp đại học, ưu tiên các ngành <b>kinh tế, ngoại thương, marketing, quản trị kinh doanh</b>, tiếng Anh giao tiếp; <b>chấp nhận sinh viên mới ra trường, sẽ được đào tạo</b>. Lương thỏa thuận. Địa điểm: <b>Tầng 4, Tòa nhà Sudico, Đường Mễ Trì, Hà Nội</b>.`,
  },
  V200: {
    id: '61dd7888-a90c-41da-8a25-a45b52f35025', company: CO, initial: 'S', meta: META_HN,
    intro: `${SY_INTRO} — đang tuyển <b>Sales Manager</b> tại văn phòng Hà Nội qua FYI. Yêu cầu: tốt nghiệp đại học ngành Kinh doanh/Marketing, <b>từ 3 năm kinh nghiệm</b> ở vị trí tương đương, ưu tiên có kinh nghiệm ngành <b>tôn thép, panel, vật liệu xây dựng, cửa, thiết bị công nghiệp</b>, tiếng Anh giao tiếp, kỹ năng bán hàng &amp; chăm sóc khách hàng tốt. Quyền lợi: lương &amp; thưởng KPI cạnh tranh, cơ hội thăng tiến nhanh. Địa điểm: <b>Tầng 4, Tòa nhà Sudico, Đường Mễ Trì, Hà Nội</b>.`,
  },
  V201: {
    id: 'a767f428-dd6d-4695-8b09-d6431f127033', company: CO, initial: 'S', meta: META_DN,
    intro: `${SY_INTRO} — đang tuyển <b>Nhân viên QC (Quality Control)</b> qua FYI — <b>cơ hội cho fresher, không cần kinh nghiệm, đào tạo A-Z</b>. Công việc: kiểm tra &amp; đánh giá chất lượng nguyên vật liệu và sản phẩm, theo dõi chất lượng trong quá trình sản xuất, xử lý vấn đề chất lượng, báo cáo &amp; phối hợp các bộ phận. Yêu cầu: tốt nghiệp Cao đẳng trở lên, tiếng Anh giao tiếp cơ bản, tỉ mỉ – chính xác – tư duy logic, không ngại môi trường sản xuất. Quyền lợi: lương thỏa thuận cao, 2 bữa sáng – trưa, thưởng sinh nhật/lễ/Tết, BHXH đầy đủ, khám sức khỏe định kỳ. Địa điểm: <b>Lô C1, KCN Nhơn Trạch 5, Đồng Nai</b>. Nộp <b>CV tiếng Anh</b>.`,
  },
  V202: {
    id: '201c0360-db07-4d4b-9cec-2580f80e658c', company: CO, initial: 'S', meta: META_DN,
    intro: `${SY_INTRO} — đang tuyển <b>Nhân viên R&amp;D</b> qua FYI — <b>cơ hội cho fresher, không cần kinh nghiệm, đào tạo A-Z</b>. Công việc: nghiên cứu, phân tích &amp; đánh giá nguyên vật liệu và sản phẩm, tham gia thử nghiệm &amp; cải tiến, phân tích &amp; xử lý vấn đề phát sinh, phối hợp các bộ phận; hướng phát triển R&amp;D / Kỹ thuật. Yêu cầu: tốt nghiệp Cao đẳng trở lên, tiếng Anh giao tiếp cơ bản, tỉ mỉ – chính xác – tư duy logic, không ngại môi trường sản xuất. Quyền lợi: lương thỏa thuận cao, 2 bữa sáng – trưa, thưởng sinh nhật/lễ/Tết, BHXH đầy đủ, khám sức khỏe định kỳ. Địa điểm: <b>Lô C1, KCN Nhơn Trạch 5, Đồng Nai</b>. Nộp <b>CV tiếng Anh</b>.`,
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

  const weekAgoIso = new Date(Date.now() - 7 * 864e5).toISOString()
  const [pool, unsubs, recs, apps, todays, recent] = await Promise.all([
    fetchAll(() => sb.from('user_profiles')
      .select('id,email,full_name,position,desired_roles,headline,major,university,yoe_months,location,english_cert,korean_cert,is_resume_public,skills,resume_summary,experiences')
      .not('email', 'is', null).not('resume_url', 'is', null).order('created_at', { ascending: false })),
    fetchAll(() => sb.from('events').select('user_id').eq('event', 'coldmail_unsub').not('user_id', 'is', null).order('id')),
    fetchAll(() => sb.from('job_recommendations').select('user_id,job_id').in('job_id', jobIds).order('id')),
    fetchAll(() => sb.from('job_applications').select('user_id,job_id').in('job_id', jobIds).order('id')),
    fetchAll(() => sb.from('job_recommendations').select('user_id,to_email').gte('created_at', sinceIso).order('id')),
    fetchAll(() => sb.from('job_recommendations').select('user_id').gte('created_at', weekAgoIso).order('id')),
  ])
  const unsubSet = new Set(unsubs.map((r) => r.user_id))
  const recSet = new Set(recs.map((r) => `${r.user_id}|${r.job_id}`))
  const appliedSet = new Set(apps.map((a) => `${a.user_id}|${a.job_id}`))
  const todayUsers = new Set(todays.map((r) => r.user_id))
  const todayEmails = new Set(todays.map((r) => (r.to_email || '').toLowerCase()).filter(Boolean))
  const cnt7 = {}
  for (const r of recent) cnt7[r.user_id] = (cnt7[r.user_id] || 0) + 1

  const seen = new Set()
  const assigned = []
  let skipRec = 0, skipToday = 0, skipTired = 0
  for (const p of pool) {
    if (!p.email || /likelion/i.test(p.email)) continue
    const e = p.email.toLowerCase()
    if (seen.has(e) || unsubSet.has(p.id)) continue
    p.__t = txt(p); p.__e = expTxt(p)
    for (const g of GROUPS) {
      const s = g.pick(p)
      if (s == null) continue
      const jobId = JOBS[g.jobKey].id
      if (appliedSet.has(`${p.id}|${jobId}`) || recSet.has(`${p.id}|${jobId}`)) { skipRec++; continue }
      seen.add(e)
      if (todayUsers.has(p.id) || todayEmails.has(e)) { skipToday++; break }
      if ((cnt7[p.id] || 0) >= 3) { skipTired++; break } // 신선도 하드게이트
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
  console.log(`  ── 합계: ${assigned.length}명 (제외: 해당 공고 기수신/기지원 ${skipRec} · 당일 발송 겹침 ${skipToday} · 7일 3통+ 지친 풀 ${skipTired})`)
  if (!doSend) {
    for (const g of GROUPS) {
      const rows = assigned.filter((r) => r.g.gkey === g.gkey).sort((a, b) => b.s - a.s)
      if (!rows.length) continue
      console.log(`\n── ${g.gkey} 상위 12 표본 (총 ${rows.length}) ──`)
      for (const { p, s, frame } of rows.slice(0, 12))
        console.log(`  [${s}·${frame}] ${p.full_name} <${p.email}> · ${p.position || '?'} · ${Math.round((p.yoe_months || 0) / 12 * 10) / 10}y · ${String(p.location || '위치?').slice(0, 24)} · 전공=${String(p.major || '-').slice(0, 24)}`)
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
      event: 'recommend_sent', page: '/scripts/systeel0925-recommend-coldmail',
      meta: { campaign: camp, job_ids: [jd.id], frame, group: g.gkey }, user_id: p.id,
    }])
    ok++; okBy[g.jobKey] = (okBy[g.jobKey] || 0) + 1
    if (ok % 25 === 0) console.log(`  …${ok}/${targets.length}`)
    await sleep(400)
  }
  console.log(`\n✅ 발송 완료: ${ok}/${targets.length} (실패 ${fail}) — ${Object.entries(okBy).map(([k, v]) => `${k} ${v}`).join(' · ')}`)
}

main().catch((e) => { console.error(e); process.exit(1) })
