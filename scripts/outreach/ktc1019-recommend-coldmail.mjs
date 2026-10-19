// KTC 10/19 모집중(is_active) × 지원 미달(지원<5) 28공고 일괄 recommend — cv_tags(이력서 원문 태그) 기준 선정.
// 근거: scripts/tmp/active-jobs-remaining-pool-1019.mjs(잔여 풀 실측) · 유저 지시 "다 발송 조져".
// 문안 정본: lib/coldmail/ktc1019Jobs.js (어드민 coldmailTemplates 와 공유). V63 STS 는 제목(가전 영업)과 JD(HVAC 엔지니어)가 달라 제외.
// 표준: 1인1통(희소 공고 우선 캐스케이드) · unsub/블랙리스트 전역 제외 · 해당 공고 기발송/기지원 제외 · 당일 recommend 기수신자 제외 · 공개/비공개 프레임.
//
//   node scripts/outreach/ktc1019-recommend-coldmail.mjs                        # dry-run
//   node scripts/outreach/ktc1019-recommend-coldmail.mjs --send [--job V241] [--max N] [--ignore-today]
import { Resend } from 'resend'
import { sb, env, fetchAll, fetchBlacklist } from './lib.mjs'
import { makeToken } from '../../lib/campaignToken.js'
import { KTC1019_JOBS } from '../../lib/coldmail/ktc1019Jobs.js'
import { rolesOf, roleGroupsOf, langAtLeast, yoeMonthsOf, regionOf, provinceOf } from '../../lib/cvTagsMatch.js'

const args = process.argv.slice(2)
const flag = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? (args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true) : d }
const doSend = args.includes('--send')
const onlyJob = flag('job', null)
const maxN = flag('max', null) ? parseInt(flag('max'), 10) : null
const ignoreToday = args.includes('--ignore-today')
const SITE = String(flag('site', env.NEXT_PUBLIC_SITE_URL || 'https://salary-fyi.com')).replace(/\/$/, '')
const RESEND_FROM = env.RESEND_FROM || 'FYI <hello@salary-fyi.com>'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const esc = (s) => String(s || '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
const firstName = (n) => String(n || '').trim().split(/\s+/).slice(-1)[0] || 'bạn'
const strip = (s) => String(s).replace(/<[^>]+>/g, '')

// ── 읽기 헬퍼 (cv_tags 우선, lib/cvTagsMatch) ──
const T = (p) => p.cv_tags || {}
const y = (p) => yoeMonthsOf(p) ?? 0
const grp = (p, ...gs) => gs.some((g) => p.__g.has(g))
const role = (p, ...rs) => rs.some((r) => p.__r.has(r))
const ko = (p, lv = 'intermediate') => langAtLeast(p, 'korean', lv)
const en = (p, lv = 'intermediate') => langAtLeast(p, 'english', lv)
const zh = (p, lv = 'intermediate') => langAtLeast(p, 'chinese', lv)
const reg = (p) => p.__reg // 'HCM' | 'HN' | 'DN' | 기타 성 이름 | null(미기재)
const inReg = (p, ...rs) => rs.includes(reg(p)) || reg(p) == null // 미기재는 포함(표준)
const strictReg = (p, ...rs) => rs.includes(reg(p))
const ind = (p, ...is) => (T(p).industries || []).some((i) => is.includes(i))
const major = (p, ...ms) => ms.includes(T(p).major_category)
const kw = (p, re) => re.test(p.__t)
const fresh = (p) => y(p) < 12
const female = (p) => T(p).gender_stated === 'female' || (T(p).gender_stated == null && T(p).gender_inferred === 'female' && (T(p).gender_inferred_confidence ?? 0) >= 0.8)
const notDev = (p) => !grp(p, 'it', 'data')
const txt = (p) => [JSON.stringify(p.skills || ''), p.headline, p.position, JSON.stringify(p.desired_roles || ''), JSON.stringify(p.resume_summary || ''), p.major,
  ...(Array.isArray(p.experiences) ? p.experiences.map((e) => `${e.title || e.position || ''} ${e.company || ''} ${e.description || e.desc || ''}`) : []),
  ...(T(p).industry_keywords || []), ...(T(p).erp_tools || []), ...(T(p).design_tools || []), ...(T(p).certifications || []), ...(T(p).career_objective_roles || []), T(p).major_raw].join(' ').toLowerCase()
const GAME = (p) => ind(p, 'Game') || kw(p, /\b(unity|unreal|game|gameplay|cocos|phaser|pixi|idle rpg|hyper.?casual)\b/)
// 회계는 주직무가 회계이거나, 부직무 회계 + 이력서에 회계 단어가 있어야 — role_secondary 만으로는 마케터가 '회계 공고'에 걸린다(드라이런 확인)
const acct = (p) => ['Accountant', 'Audit / Tax'].includes(T(p).role_detail) || (role(p, 'Accountant', 'Audit / Tax', 'Financial Analyst') && kw(p, /(kế toán|accountant|accounting|kiểm toán|audit)/))
const recent = (p) => (Date.now() - new Date(p.updated_at || 0) <= 90 * 86400e3 ? 3 : 0)
const q = (p) => (T(p).cv_quality || 0)

/* 캐스케이드 = 1인1통 배정 순서. 희소한 조건(한국어·게임·특수 키워드)부터 잡고, 넓은 풀(영업·생산)은 마지막.
   pick 은 점수(정렬용) 또는 null. 지역: 공고 출근권 + 거주지 미기재 포함(표준), 공장·지방 공고는 strict. */
const GROUPS = [
  { code: 'V237', label: 'KO business+ × HN × IT 실무 또는 통번역', pick: (p) => (ko(p, 'business') && inReg(p, 'HN') && (grp(p, 'it', 'data', 'pm') || role(p, 'Interpreter / Translator')) ? 90 + recent(p) + q(p) : null) },
  { code: 'V241', label: 'KO 중급+ × HCM × 영업/BD/사무 × 2y+', pick: (p) => (ko(p) && inReg(p, 'HCM') && (grp(p, 'sales') || role(p, 'Interpreter / Translator', 'Admin / GA', 'Secretary / Assistant', 'Import / Export')) && y(p) >= 24 ? 88 + recent(p) + q(p) + (ko(p, 'business') ? 3 : 0) : null) },
  { code: 'V249', label: 'KO business+ × HCM권 × 재무/회계/HR/사무 × 2y+', pick: (p) => (ko(p, 'business') && inReg(p, 'HCM') && grp(p, 'finance', 'hr', 'office', 'logistics') && y(p) >= 24 ? 86 + recent(p) + q(p) : null) },
  { code: 'R108', label: 'Amazon/FBA/Seller Central 키워드 × 마케팅/영업/운영', pick: (p) => (kw(p, /(amazon|fba|seller central|walmart|tiktok shop)/) && grp(p, 'marketing', 'sales', 'office', 'pm') && y(p) >= 12 ? 84 + recent(p) + q(p) : null) },
  { code: 'K23', label: 'drone/UAV/firmware/soldering 키워드 × 생산·전자 × 2y+', pick: (p) => (kw(p, /(drone|uav|flight controller|soldering|hàn mạch|firmware|pcb)/) && (grp(p, 'manufacturing') || role(p, 'Embedded', 'Maintenance', 'QC')) && y(p) >= 24 ? 82 + recent(p) + q(p) : null) },
  { code: 'V254', label: '중국어 중급+ × HCM권 × 비개발 (fresher OK)', pick: (p) => (zh(p) && inReg(p, 'HCM') && notDev(p) ? 80 + recent(p) + q(p) + (zh(p, 'business') ? 3 : 0) + (en(p) ? 2 : 0) : null) },
  { code: 'V175', label: '클라우드 × (프리세일즈/SA/기술영업/클라우드 컨설턴트·아키텍트 키워드 또는 B2B 영업·BD 직군) × EN business × 2y+', pick: (p) => (kw(p, /(aws|azure|gcp|google cloud|cloud)/) && en(p, 'business') && y(p) >= 24 && (kw(p, /(presales|pre-sales|pre sales|solution architect|solutions architect|technical sales|cloud consultant|sales engineer)/) || role(p, 'Sales (B2B)', 'Business Development')) ? 78 + recent(p) + q(p) + (kw(p, /(presales|pre-sales|pre sales|technical sales|sales engineer)/) ? 5 : 0) : null) },
  { code: 'V239', label: '(KO 중급+ × 운영/CS/비서/어드민) 또는 (EN business × 호텔·F&B 경력) × HCM × 비개발', pick: (p) => (inReg(p, 'HCM') && notDev(p) && !grp(p, 'design', 'marketing') && (role(p, 'Operations', 'Customer Service', 'Secretary / Assistant', 'Admin / GA') || ind(p, 'Hospitality / Tourism', 'F&B / Food')) && (ko(p) || (en(p, 'business') && (ind(p, 'Hospitality / Tourism', 'F&B / Food') || kw(p, /(restaurant|nhà hàng|hotel|khách sạn|f&b|barista|phục vụ|service manager|front office|receptionist|lễ tân)/)))) ? 76 + recent(p) + q(p) + (ko(p) ? 3 : 0) : null) },
  { code: 'V233', label: '디자인(모션/그래픽) × HN × 3y+ × (Spine/animation/VFX/After Effects)', pick: (p) => (['Motion / Video', 'Graphic Designer'].includes(T(p).role_detail) && inReg(p, 'HN') && y(p) >= 36 && kw(p, /(spine|animation|animator|vfx|after effects|rigging|2d art)/) ? 74 + recent(p) + q(p) + (kw(p, /spine/) ? 5 : 0) : null) },
  { code: 'V226', label: 'IT × HN × 게임/Unity × 1y+', pick: (p) => (grp(p, 'it') && inReg(p, 'HN') && GAME(p) && y(p) >= 12 ? 72 + recent(p) + q(p) + (kw(p, /unity/) ? 4 : 0) : null) },
  { code: 'V227', label: 'IT × HN × (Unity/Phaser/PixiJS/Cocos/Three.js/WebGL/playable) × 1y+', pick: (p) => (grp(p, 'it') && inReg(p, 'HN') && kw(p, /(unity|phaser|pixi|cocos|three\.js|webgl|playable|canvas game|game engine)/) && y(p) >= 12 ? 70 + recent(p) + q(p) : null) },
  { code: 'V234', label: '게임 × HN × 3y+ × 기획/PM/디자인/개발', pick: (p) => (GAME(p) && inReg(p, 'HN') && y(p) >= 36 && grp(p, 'pm', 'design', 'it') ? 68 + recent(p) + q(p) + (kw(p, /(game design|gdd|level design|thiết kế game)/) ? 5 : 0) : null) },
  { code: 'V236', label: '마케팅 × HN × 5y+ × (퍼포먼스/UA/모바일앱)', pick: (p) => (grp(p, 'marketing') && inReg(p, 'HN') && y(p) >= 60 && kw(p, /(performance|ua\b|user acquisition|appsflyer|adjust|mobile app|mobile game|google ads|meta ads|facebook ads|roas)/) ? 66 + recent(p) + q(p) : null) },
  { code: 'V235', label: '마케팅 × HN × 2y+ × (퍼포먼스/UA/광고 플랫폼)', pick: (p) => (grp(p, 'marketing') && inReg(p, 'HN') && y(p) >= 24 && kw(p, /(performance|ua\b|user acquisition|appsflyer|adjust|mobile app|mobile game|google ads|meta ads|facebook ads|roas|applovin|unity ads)/) ? 64 + recent(p) + q(p) + (GAME(p) ? 4 : 0) : null) },
  { code: 'V231', label: '마케팅/디자인 × HN × 3y+ × (video/creative/kịch bản/AI 영상툴)', pick: (p) => (grp(p, 'marketing', 'design') && inReg(p, 'HN') && y(p) >= 36 && kw(p, /(video|creative|kịch bản|script|storyboard|premiere|capcut|kling|midjourney|runway|ai video|short-?form)/) ? 62 + recent(p) + q(p) + ((T(p).mgmt_team_size || 0) >= 2 || /^(lead|manager|director)$/.test(T(p).seniority || '') ? 4 : 0) : null) },
  { code: 'V230', label: '게임/Unity × HN × <1y (학생·신입) × 기획/개발', pick: (p) => (GAME(p) && strictReg(p, 'HN') && fresh(p) && grp(p, 'pm', 'it', 'design') ? 60 + recent(p) + q(p) : null) },
  { code: 'V229', label: '마케팅/콘텐츠 × HN × <1y × (SNS/TikTok/YouTube/short-form)', pick: (p) => (grp(p, 'marketing', 'design') && strictReg(p, 'HN') && fresh(p) && kw(p, /(tiktok|youtube|short|reels|content|sns|social media|kênh)/) ? 58 + recent(p) + q(p) : null) },
  { code: 'V238', label: '게임 × HN × <1y × 커뮤니티/CS/마케팅', pick: (p) => (GAME(p) && strictReg(p, 'HN') && fresh(p) && (grp(p, 'marketing', 'sales', 'office') || kw(p, /(community|discord|cộng đồng)/)) ? 56 + recent(p) + q(p) : null) },
  { code: 'V256', label: '회계(주직무) × HCM × 2~5y', pick: (p) => (acct(p) && inReg(p, 'HCM') && y(p) >= 24 && y(p) <= 66 ? 54 + recent(p) + q(p) + (kw(p, /(vat|hóa đơn|invoice|accounts payable|kế toán thanh toán|kế toán tổng hợp|p&l)/) ? 3 : 0) : null) },
  { code: 'V172', label: '회계(주직무) × HCM × 1~5y', pick: (p) => (acct(p) && inReg(p, 'HCM') && y(p) >= 12 && y(p) <= 60 ? 52 + recent(p) + q(p) + (kw(p, /(thuế|tax|tnds|tncn|gtgt|báo cáo tài chính)/) ? 3 : 0) : null) },
  { code: 'V67', label: '회계(주직무 또는 회계 전공+회계 단어) × HCM × 여성(기재 또는 추정≥.8) × 1995~2005년생 또는 미상', pick: (p) => ((acct(p) || (major(p, 'Accounting / Finance') && kw(p, /(kế toán|accountant|accounting)/))) && inReg(p, 'HCM') && female(p) && (T(p).birth_year == null || (T(p).birth_year >= 1995 && T(p).birth_year <= 2005)) ? 50 + recent(p) + q(p) + (kw(p, /misa/) ? 3 : 0) : null) },
  { code: 'V87', label: '수출입/구매/SCM 또는 B2B 영업 × HCM × 2~6y × 수출 키워드', pick: (p) => ((grp(p, 'logistics') || role(p, 'Sales (B2B)', 'Business Development')) && inReg(p, 'HCM') && y(p) >= 24 && y(p) <= 84 && kw(p, /(export|xuất khẩu|xnk|import|sourcing|forwarder|c\/o|packing list|bill of lading|nông sản|agri)/) ? 48 + recent(p) + q(p) : null) },
  { code: 'V32', label: 'B2B 영업/BD(주직무, 또는 영업 직군+B2B 단어) × HCM × 2y+ (팀 관리 가점)', pick: (p) => ((['Sales (B2B)', 'Business Development'].includes(T(p).role_detail) || (role(p, 'Sales (B2B)', 'Business Development', 'Sales') && kw(p, /(b2b|kinh doanh|sales|account manager|key account)/))) && inReg(p, 'HCM') && y(p) >= 24 ? 46 + recent(p) + q(p) + ((T(p).mgmt_team_size || 0) >= 3 || /^(lead|manager|director)$/.test(T(p).seniority || '') ? 6 : 0) + (ind(p, 'Media / Advertising / Agency') ? 3 : 0) : null) },
  { code: 'V223', label: '영업/마케팅/사무/HR 직군 × HCM(거주 확인) × <1y (KO 가점)', pick: (p) => (strictReg(p, 'HCM') && fresh(p) && notDev(p) && grp(p, 'sales', 'marketing', 'office', 'hr') ? 44 + recent(p) + q(p) + (ko(p, 'basic') ? 4 : 0) : null) },
  { code: 'V199', label: '영업/마케팅/경영·무역 전공 × HN × <2y × EN 중급+', pick: (p) => (strictReg(p, 'HN') && y(p) < 24 && en(p) && notDev(p) && (grp(p, 'sales', 'marketing') || major(p, 'Business / Trade / Economics', 'Marketing / Communications')) ? 42 + recent(p) + q(p) : null) },
  { code: 'V251', label: '생산/공정 또는 화학·기계·자동화 전공 × HCM권 × <3y', pick: (p) => (inReg(p, 'HCM') && y(p) < 36 && (grp(p, 'manufacturing') || major(p, 'Mechanical / Electrical / Automation', 'Chemical / Materials / Environment')) ? 40 + recent(p) + q(p) + (T(p).factory_experience ? 3 : 0) : null) },
  { code: 'V252', label: '생산/공정 또는 기계·산업 전공 × HCM권 × <3y × EN 중급+', pick: (p) => (inReg(p, 'HCM') && y(p) < 36 && en(p) && (grp(p, 'manufacturing') || major(p, 'Mechanical / Electrical / Automation')) ? 38 + recent(p) + q(p) : null) },
  { code: 'V37', label: 'HR/사무 × 2y+ × 거주 Tiền Giang/Long An/Bến Tre/Vĩnh Long/Đồng Tháp × EN', pick: (p) => (grp(p, 'hr', 'office') && y(p) >= 24 && en(p, 'basic') && ['Tiền Giang', 'Long An', 'Bến Tre', 'Vĩnh Long', 'Đồng Tháp'].includes(provinceOf(p)) ? 36 + recent(p) + q(p) : null) },
]
for (const g of GROUPS) if (!KTC1019_JOBS[g.code]) throw new Error(`문안 없음: ${g.code}`)

const HOOK = 'Đội ngũ FYI đã xem xét toàn bộ hồ sơ đã đăng ký và <b>chọn bạn vào danh sách đề cử</b> cho vị trí dưới đây — hồ sơ của bạn phù hợp với yêu cầu của vị trí này.'
const BENEFIT = {
  public: (company) => `<b>Trong tuần này</b>, FYI sẽ gửi danh sách đề cử trực tiếp cho người phụ trách tuyển dụng của ${company}. Hồ sơ của bạn đang ở chế độ công khai nên sẽ được gửi kèm danh sách. Nếu bạn ứng tuyển ngay, CV của bạn sẽ được <b>ưu tiên xem xét</b> cùng lời giới thiệu từ FYI.`,
  private: (company) => `<b>Trong tuần này</b>, FYI sẽ gửi danh sách đề cử trực tiếp cho người phụ trách tuyển dụng của ${company}. Hồ sơ của bạn đang ở chế độ riêng tư — nếu bạn ứng tuyển ngay, CV của bạn sẽ được gửi kèm lời giới thiệu từ FYI và được <b>ưu tiên xem xét</b>.`,
}
const ONETAP = 'Chỉ cần <b>1 chạm</b> — CV đã đăng ký của bạn sẽ được gửi tự động.'
const SUBJECT = {
  public: (jd) => `[FYI] Bạn được chọn vào danh sách đề cử gửi ${jd.company} — ${jd.title} (${jd.loc})`,
  private: (jd) => `[FYI] Bạn được chọn vào danh sách đề cử — ${jd.title} tại ${jd.company} (${jd.loc})`,
}

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
  const codes = GROUPS.map((g) => g.code)
  const { data: jobRows, error: jobErr } = await sb.from('jobs').select('id,title,company,location,logo_url,is_active,source_id').eq('source', 'ktc').in('source_id', codes)
  if (jobErr) { console.error('공고 조회 실패:', jobErr.message); process.exit(1) }
  for (const code of codes) {
    const j = (jobRows || []).find((r) => r.source_id === code)
    if (!j || !j.is_active) { console.error(`공고 없음/비활성: ${code}`); process.exit(1) }
    KTC1019_JOBS[code].id = j.id
  }
  const jobById = Object.fromEntries(jobRows.map((j) => [j.id, j]))
  const jobIds = codes.map((c) => KTC1019_JOBS[c].id)
  const resend = new Resend(env.RESEND_API_KEY)
  const url = (userId, camp, jobId) => `${SITE}/api/resume/recommend?t=${makeToken(userId, camp)}&j=${jobId}`
  const unsubFor = (userId, camp) => `${SITE}/api/coldmail/unsub?t=${makeToken(userId, camp)}`
  const [pool, unsubs, recs, apps, bl] = await Promise.all([
    fetchAll(() => sb.from('user_profiles').select('id,email,full_name,position,desired_roles,headline,major,yoe_months,location,english_cert,korean_cert,is_resume_public,skills,resume_summary,experiences,cv_tags,updated_at').not('email', 'is', null).not('resume_url', 'is', null).order('created_at', { ascending: false })),
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
  const seen = new Set(); const assigned = []; let skipRec = 0, skipToday = 0, noTags = 0
  for (const p of pool) {
    if (!p.email || /likelion/i.test(p.email)) continue
    const e = p.email.toLowerCase()
    if (seen.has(e) || unsubSet.has(p.id) || bl.has(p)) continue
    if (!ignoreToday && todaySet.has(p.id)) { skipToday++; continue }
    if (!p.cv_tags) noTags++
    p.__t = txt(p); p.__g = roleGroupsOf(p); p.__r = rolesOf(p); p.__reg = regionOf(p)
    for (const g of GROUPS) {
      const s = g.pick(p); if (s == null) continue
      const jobId = KTC1019_JOBS[g.code].id
      if (appliedSet.has(`${p.id}|${jobId}`) || recSet.has(`${p.id}|${jobId}`)) { skipRec++; continue }
      seen.add(e); assigned.push({ p, s, g, frame: p.is_resume_public ? 'public' : 'private' }); break
    }
  }
  console.log(`발송 대상(1인 1통 캐스케이드${ignoreToday ? '' : ' · 당일 recommend 기수신자 제외'}) · cv_tags 없는 프로필 ${noTags}:`)
  for (const g of GROUPS) { const rows = assigned.filter((r) => r.g.code === g.code); console.log(`  ${g.code.padEnd(5)} ${String(rows.length).padStart(4)}명 (공개 ${String(rows.filter((x) => x.frame === 'public').length).padStart(3)}) — ${KTC1019_JOBS[g.code].company} ${KTC1019_JOBS[g.code].title} — ${g.label}`) }
  console.log(`  ── 합계: ${assigned.length}명 (제외: 당일 기수신 ${skipToday} · 해당 공고 기수신/기지원 후 다음 공고로 ${skipRec})`)
  if (!doSend) {
    for (const g of GROUPS) {
      const rows = assigned.filter((r) => r.g.code === g.code).sort((a, b) => b.s - a.s)
      if (!rows.length) continue
      console.log(`\n── ${g.code} 상위 5 (총 ${rows.length}) ──`)
      for (const { p, s, frame } of rows.slice(0, 5)) console.log(`  [${s}·${frame}] ${p.full_name} · ${T(p).role_detail || p.position || '?'} · ${Math.round(y(p) / 12 * 10) / 10}y · ${provinceOf(p) || '미기재'} · ko ${T(p).korean_level || '-'} · ${(Array.isArray(p.experiences) ? p.experiences.slice(0, 2).map((e) => e.title || e.position).join(' | ') : '').slice(0, 60)}`)
    }
    console.log('\n(dry-run — 실발송하려면 --send, 공고 한정 --job <code>)'); return
  }
  let targets = [...assigned].sort((a, b) => b.s - a.s)
  if (onlyJob) targets = targets.filter((r) => r.g.code === onlyJob)
  if (maxN) targets = targets.slice(0, maxN)
  let ok = 0, fail = 0; const okBy = {}
  for (const { p, g, frame } of targets) {
    const jd = KTC1019_JOBS[g.code], job = jobById[jd.id], camp = `ktc1019-recommend-${g.code}-${frame}`
    const u = url(p.id, camp, jd.id), un = unsubFor(p.id, camp)
    const { error } = await resend.emails.send({ from: RESEND_FROM, to: p.email, subject: SUBJECT[frame](jd), html: emailHtml(p.full_name, u, un, jd, job, frame), text: emailText(p.full_name, u, un, jd, job, frame), headers: { 'List-Unsubscribe': `<${un}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' } })
    if (error) { console.error(`실패 ${p.email}:`, error.message || error); fail++; continue }
    await sb.from('job_recommendations').upsert([{ user_id: p.id, to_email: p.email, job_id: jd.id, job_title: job.title, job_company: job.company, sent_by: 'coldmail', kind: 'recommend', status: 'sent' }], { onConflict: 'user_id,job_id', ignoreDuplicates: true })
    await sb.from('events').insert([{ event: 'recommend_sent', page: '/scripts/ktc1019-recommend-coldmail', meta: { campaign: camp, job_ids: [jd.id], frame, group: g.code }, user_id: p.id }])
    ok++; okBy[g.code] = (okBy[g.code] || 0) + 1; if (ok % 50 === 0) console.log(`  …${ok}/${targets.length}`); await sleep(400)
  }
  console.log(`\n✅ 발송 완료: ${ok}/${targets.length} (실패 ${fail}) — ${Object.entries(okBy).map(([k, v]) => `${k} ${v}`).join(' · ')}`)
}
main().catch((e) => { console.error(e); process.exit(1) })
