// NSTAGE 10/14 — V226~V238 13건 (10/14 Len 등록) recommend, 10/14 발송. 하노이 Thanh Xuân 온사이트(Center Building, 85 Vũ Trọng Phụng).
// 10/14 실측(scripts/tmp/nstage-thehan-1014-pool-measure.mjs): 풀 HN권 15%·게임 직군 전국 81(HN 9)·Unity 전국 57(HN 6) → 직무 특화 공고는 0~2명, 범용(IT Comtor·SNS 인턴·크리에이티브 리드)만 5~15.
// 게이트(유저 지시 10/14 "보낼 수 있는 풀들 공고별로 다 보내고"): 지역 HN권/미기재 · 아래 GROUPS 순서로 1인1통 배정 · 당일 타 공고 기수신 제외(한국카본 12 포함).
// 표준: unsub/블랙리스트 전역 제외 · 공개/비공개 프레임 · 발송 전 coldmailTemplates 등록.
//
//   node scripts/outreach/nstage1014-recommend-coldmail.mjs                 # dry-run
//   node scripts/outreach/nstage1014-recommend-coldmail.mjs --send
import { Resend } from 'resend'
import { sb, env, fetchAll, fetchBlacklist } from './lib.mjs'
import { makeToken } from '../../lib/campaignToken.js'

const args = process.argv.slice(2)
const flag = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? (args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true) : d }
const doSend = args.includes('--send')
const maxN = flag('max', null) ? parseInt(flag('max'), 10) : null
const SITE = String(flag('site', env.NEXT_PUBLIC_SITE_URL || 'https://salary-fyi.com')).replace(/\/$/, '')
const RESEND_FROM = env.RESEND_FROM || 'FYI <hello@salary-fyi.com>'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const esc = (s) => String(s || '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
const firstName = (n) => String(n || '').trim().split(/\s+/).slice(-1)[0] || 'bạn'
const strip = (s) => String(s).replace(/<[^>]+>/g, '')

// ── 대상 선정 헬퍼 (실측과 동일) ──
const expTitles = (p) => (Array.isArray(p.experiences) ? p.experiences.map((e) => `${e.title || e.position || ''}`).join(' | ') : '')
const exp = (p) => (Array.isArray(p.experiences) ? p.experiences.map((e) => `${e.title || e.position || ''} ${e.company || ''} ${e.description || ''}`).join(' ') : '')
const txt = (p) => (JSON.stringify(p.skills || '') + ' ' + String(p.position || '') + ' ' + String(p.headline || '') + ' ' + JSON.stringify(p.desired_roles || '') + ' ' + JSON.stringify(p.resume_summary || '') + ' ' + exp(p) + ' ' + String(p.major || '') + ' ' + JSON.stringify(p.certs || '') + ' ' + JSON.stringify(p.projects || '')).toLowerCase()
const roles = (p) => [p.position, ...(p.desired_roles || [])].filter(Boolean)
const tr = (p) => expTitles(p) + ' ' + roles(p).join(' ')
const y = (p) => p.yoe_months ?? 0
const hnRe = /(hà nội|ha noi|hanoi|hn\b|하노이|cầu giấy|cau giay|đống đa|dong da|hai bà trưng|thanh xuân|thanh xuan|hoàng mai|long biên|từ liêm|tu liem|ba đình|ba dinh|hoàn kiếm|tây hồ|hà đông|ha dong|bắc ninh|bac ninh|hưng yên|vĩnh phúc)/i
const hnOk = (p) => { const l = String(p.location || ''); return !l.trim() || hnRe.test(l) }
const koCert = (p) => String(p.korean_cert || '').trim()
const koOk = (p) => (!!koCert(p) && !/^(none|no|không|없음|-|n\/a)$/i.test(koCert(p))) || /(korean|tiếng hàn|topik|한국어|hàn quốc)/i.test(p.__t)
const koStrict = (p) => !!koCert(p) && !/^(none|no|không|없음|-|n\/a|basic|beginner|cơ bản|sơ cấp|기본|초급)$/i.test(koCert(p))
const topik56 = (p) => /topik\s*(level\s*)?(5|6)|(5|6)\s*급|topik\s*ii\s*(5|6)|cấp\s*(5|6)/i.test(koCert(p)) || /topik\s*(level\s*)?(5|6)\b|topik\s*(5|6)급/i.test(p.__t)
const enOk = (p) => !!String(p.english_cert || '').trim() && !/^(none|no|không|없음|-|n\/a)$/i.test(String(p.english_cert).trim())
const unityRe = /(\bunity\b|unity3d|unity engine)/i
const gameRe = /(game|trò chơi)/i
const devRole = (p) => roles(p).some((r) => /(developer|engineer|frontend|backend|fullstack|mobile|game|unity|embedded|software|cto|architect)/i.test(r)) || /(developer|engineer|programmer|lập trình|game)/i.test(expTitles(p))
const html5Re = /(phaser|pixi\.?js|cocos|three\.?js|playable|html5 game|canvas game|babylon)/i
const gdTitle = (p) => /(game designer|game design|thiết kế game|level designer|game planner)/i.test(tr(p))
const animTitle = (p) => /(2d animat|animator|animation|vfx|after effects|hiệu ứng|live2d|dragonbones|\bspine\b)/i.test(p.__t) && /(animator|motion|vfx|2d artist|game artist|illustrat|concept art|\bspine\b)/i.test(tr(p))
const leadTitle = (p) => /(creative (team )?lead|creative director|marketing (team )?lead|trưởng nhóm marketing|trưởng nhóm sáng tạo|content lead|head of content|art director)/i.test(expTitles(p))
const aiVideo = (p) => /(kling|seedance|runway|pika|veo|sora|ai video|midjourney|capcut|short-form|short form|mini drama|tiktok)/i.test(p.__t)
const mktRole = (p) => /(marketing|growth|performance|media)/i.test(tr(p))
const uaStrong = (p) => /(user acquisition|\bua\b|appsflyer|adjust\b|singular|\bmmp\b|applovin|ironsource|unity ads|mintegral|roas|\bcpi\b|mobile game marketing|app marketing)/i.test(p.__t)
const adsOps = (p) => /(google ads|meta ads|facebook ads|tiktok ads|chạy ads|media buy|performance marketing|digital marketing)/i.test(p.__t)
const itStrict = (p) => roles(p).some((r) => /(developer|engineer|frontend|backend|fullstack|mobile|qa|tester|devops|data|software|game|unity|comtor|bridge|brse|ba\b|pm\b|it\b)/i.test(r)) || /(developer|engineer|lập trình|tester|\bqa\b|\bqc\b|comtor|brse|bridge|it support|it helpdesk|system admin|software)/i.test(expTitles(p)) || /(công nghệ thông tin|information technology|computer science|khoa học máy tính|software|cntt|kỹ thuật phần mềm|hệ thống thông tin)/i.test(String(p.major || ''))
const comtorRe = /(comtor|bridge|brse|thông dịch|phiên dịch|biên dịch|interpreter|translator|통역|번역)/i
const snsTitle = (p) => /(social media|content creator|content marketing|tiktok|kênh cá nhân|sáng tạo nội dung)/i.test(tr(p))
const cmTitle = (p) => /(community|cộng đồng|discord|game operation|vận hành game|game master|moderator)/i.test(tr(p) + ' ' + JSON.stringify(p.skills || ''))

// 배정 우선순위 = 배열 순서 (특화·시니어 먼저, 인턴·범용 나중)
const GROUPS = [
  { gkey: 'comtor', jobKey: 'V237', label: { vi: 'IT Comtor', ko: 'TOPIK 5/6 × IT 직군·직함·전공 or KO 중급+ × IT × Comtor/Bridge 경력' },
    pick: (p) => ((topik56(p) && itStrict(p)) || (koStrict(p) && itStrict(p) && comtorRe.test(p.__t)) ? 1 + (topik56(p) ? 4 : 0) + (comtorRe.test(p.__t) ? 3 : 0) + (/(\bqa\b|tester)/i.test(p.__t) ? 1 : 0) + (gameRe.test(p.__t) ? 1 : 0) + (y(p) >= 24 ? 1 : 0) : null) },
  { gkey: 'srua', jobKey: 'V236', label: { vi: 'Senior UA Marketing', ko: 'UA/MMP 강시그널 × 마케팅 × 60m+' },
    pick: (p) => (uaStrong(p) && mktRole(p) && y(p) >= 60 ? 5 + (enOk(p) ? 1 : 0) : null) },
  { gkey: 'ua', jobKey: 'V235', label: { vi: 'UA Marketing - Game Mobile', ko: 'UA/MMP 강시그널 × 마케팅 × 24m+ (코어) + Google/Meta/TikTok Ads 운영 × 마케팅 × 24m+ (확장)' },
    pick: (p) => (mktRole(p) && y(p) >= 24 && (uaStrong(p) || adsOps(p)) ? 1 + (uaStrong(p) ? 4 : 0) + (gameRe.test(p.__t) ? 2 : 0) + (enOk(p) ? 1 : 0) : null) },
  { gkey: 'creative', jobKey: 'V231', label: { vi: 'Creative Team Lead', ko: '크리에이티브/마케팅/콘텐츠 리드 직함 × 12m+' },
    pick: (p) => (leadTitle(p) && y(p) >= 12 ? 1 + (aiVideo(p) ? 3 : 0) + (gameRe.test(p.__t) ? 2 : 0) + (/playable/i.test(p.__t) ? 2 : 0) : null) },
  { gkey: 'unity', jobKey: 'V226', label: { vi: 'Unity Developer', ko: 'Unity 키워드 × 개발·게임 직군·직함 × 24m+' },
    pick: (p) => (unityRe.test(p.__t) && devRole(p) && y(p) >= 24 ? 1 + (/unity/i.test(tr(p)) ? 3 : 0) + (/(idle|rpg|hyper ?casual)/i.test(p.__t) ? 2 : 0) + (gameRe.test(tr(p)) ? 2 : 0) : null) },
  { gkey: 'hyper', jobKey: 'V232', label: { vi: 'Unity Developer (Hyper Casual)', ko: 'Unity 키워드 × 개발·게임 직군·직함 × 12~24m' },
    pick: (p) => (unityRe.test(p.__t) && devRole(p) && y(p) >= 12 && y(p) < 24 ? 1 + (/unity/i.test(tr(p)) ? 3 : 0) + (gameRe.test(tr(p)) ? 2 : 0) : null) },
  { gkey: 'playable', jobKey: 'V227', label: { vi: 'Playable Ads Developer', ko: 'HTML5 게임엔진(Phaser/Pixi/Cocos/Three/Playable) × 12m+ (Unity 보유자는 unity/hyper 선배정)' },
    pick: (p) => (html5Re.test(p.__t) && y(p) >= 12 ? 1 + (/playable/i.test(p.__t) ? 3 : 0) + (gameRe.test(p.__t) ? 2 : 0) : null) },
  { gkey: 'gd', jobKey: 'V234', label: { vi: 'Game Designer', ko: 'Game Designer 직함/직군 × 36m+' },
    pick: (p) => (gdTitle(p) && y(p) >= 36 ? 3 : null) },
  { gkey: 'anim', jobKey: 'V233', label: { vi: '2D Animator & VFX Artist', ko: 'Spine 명시(HN권 0) + 애니메이터/모션/VFX/2D·게임 아티스트 직함 (확장 — Spine 포트폴리오는 자기선별)' },
    pick: (p) => (animTitle(p) ? 1 + (/\bspine\b/i.test(p.__t) ? 5 : 0) + (gameRe.test(tr(p)) ? 2 : 0) + (/(vfx|after effects|animator|animation)/i.test(tr(p)) ? 2 : 0) + (y(p) >= 36 ? 1 : 0) : null) },
  { gkey: 'unityintern', jobKey: 'V228', label: { vi: 'Unity Developer Intern', ko: 'Unity 키워드 × <12m' },
    pick: (p) => (unityRe.test(p.__t) && y(p) < 12 ? 1 + (/unity/i.test(tr(p)) ? 3 : 0) + (gameRe.test(tr(p)) ? 2 : 0) + (koOk(p) || enOk(p) ? 1 : 0) : null) },
  { gkey: 'gdintern', jobKey: 'V230', label: { vi: 'Game Designer Intern', ko: 'Game Designer 직함/직군 × <36m (Unity 보유자는 unityintern 선배정)' },
    pick: (p) => (gdTitle(p) && y(p) < 36 ? 2 + (unityRe.test(p.__t) ? 2 : 0) : null) },
  { gkey: 'sns', jobKey: 'V229', label: { vi: 'Social Media Content Intern', ko: 'SNS/콘텐츠 직함 × <24m × (KO or 게임 키워드)' },
    pick: (p) => (snsTitle(p) && y(p) < 24 && (koOk(p) || gameRe.test(p.__t)) ? 1 + (koOk(p) ? 2 : 0) + (gameRe.test(p.__t) ? 2 : 0) + (/(tiktok|short-form|short form|video ngắn|reels|youtube)/i.test(p.__t) ? 1 : 0) : null) },
  { gkey: 'community', jobKey: 'V238', label: { vi: 'Game Community Operations Intern', ko: '커뮤니티/Discord/게임운영 직함·스킬 × <24m' },
    pick: (p) => (cmTitle(p) && y(p) < 24 ? 1 + (koOk(p) ? 2 : 0) + (gameRe.test(p.__t) ? 2 : 0) + (/(discord|naver)/i.test(p.__t) ? 1 : 0) : null) },
]

const CO = 'NSTAGE'
const ABOUT = '<b>NSTAGE</b> — công ty game mobile Hàn Quốc vận hành ổn định các game live service, đồng hành cùng hơn 1 triệu người dùng và đã triển khai thành công hơn 45 dự án (từ Hyper casual đến Idle RPG) — văn phòng tại <b>Thanh Xuân, Hà Nội</b>'
const PERK = 'Phúc lợi: làm việc T2–T6, giờ làm linh hoạt, thưởng TET tới 2 tháng lương, cơ hội công tác Hàn Quốc, hỗ trợ học ngoại ngữ, khám sức khỏe.'
const META = 'Onsite · Thanh Xuân, Hà Nội · Lương thỏa thuận'
const METAI = 'Thực tập · Onsite · Thanh Xuân, Hà Nội'
const JOBS = {
  V226: { id: 'e8684fa2-6221-4ca5-9d8d-f91357aa4e9c', meta: META, intro: `${ABOUT} — đang tuyển <b>Unity Developer</b> qua FYI. Công việc: build và phát triển game mobile bằng Unity Engine, phối hợp với Game Designer triển khai tính năng và logic game, fix bug và tối ưu hiệu năng. Yêu cầu: nền tảng vững về <b>C# và Unity Engine</b>; có kinh nghiệm phát hành game trên store (Android/iOS, kể cả dự án cá nhân); hiểu cấu trúc quản lý balance/nội dung dựa trên Data Table; từng triển khai các hệ thống cốt lõi của game <b>Idle RPG</b> (xử lý số lớn, thưởng offline, Save/Load); chủ động dùng công cụ AI (Claude, Gemini…). Ưu tiên: kinh nghiệm phát triển/phát hành Idle RPG. ${PERK}` },
  V232: { id: '1c2034ed-8ec9-4906-b418-aaaffd950cd1', meta: META, intro: `${ABOUT} — đang tuyển <b>Unity Developer (Hyper Casual)</b> qua FYI. Công việc: build và phát triển prototype game mobile bằng Unity Engine, phối hợp với Game Designer, fix bug và tối ưu hiệu năng. Yêu cầu: nền tảng vững về <b>C# và Unity Engine</b>; kinh nghiệm phát hành game trên store (kể cả dự án cá nhân); kinh nghiệm dùng tài nguyên Unity Asset Store; chủ động dùng công cụ AI. <b>Chấp nhận ứng viên chưa có nhiều kinh nghiệm</b>; giao tiếp được tiếng Anh hoặc tiếng Hàn là lợi thế. ${PERK}` },
  V228: { id: '18e7ff1f-9fee-4fa8-83be-2326e4ab9bad', meta: METAI, intro: `${ABOUT} — đang tuyển <b>Unity Developer Intern</b> qua FYI (văn phòng Nguyễn Huy Tưởng, Thanh Xuân). Công việc: build prototype game mobile bằng Unity Engine, phối hợp với Game Designer triển khai tính năng, fix bug. Yêu cầu: kiến thức nền về <b>C# và Unity Engine</b>; từng phát hành game trên store (kể cả dự án cá nhân) hoặc dùng tài nguyên Unity Asset Store; <b>chấp nhận ứng viên mới</b>; giao tiếp được tiếng Anh hoặc tiếng Hàn là lợi thế. ${PERK}` },
  V227: { id: '3e182cb5-0fbd-42fe-be48-b10ced3b5a56', meta: META, intro: `${ABOUT} — đang tuyển <b>Playable Ads Developer</b> qua FYI. Công việc: phân tích core loop và tài nguyên game Unity hiện có để tái cấu trúc thành <b>quảng cáo tương tác HTML5</b> hiệu suất cao; tuân thủ quy chuẩn in-app webview và tương thích các mạng quảng cáo lớn (AppLovin, Unity Ads, ironSource, Mintegral, TikTok, Google…). Yêu cầu: kinh nghiệm phát triển với game engine HTML5 (<b>Phaser, PixiJS, Cocos2d-x, Three.js</b>…) hoặc kinh nghiệm dự án game Unity (C#). ${PERK}` },
  V234: { id: 'e2d5dfaf-d251-4c34-a486-00d3f129a201', meta: META, intro: `${ABOUT} — đang tuyển <b>Game Designer</b> qua FYI. Công việc: thiết kế hệ thống, nội dung và balance cho game mobile (Hyper casual / Idle RPG), phối hợp với Unity Developer để hiện thực hóa ý tưởng thành sản phẩm. Yêu cầu: hiểu biết sâu về game mobile; có kinh nghiệm phát hành game trên store (kể cả dự án cá nhân); tư duy logic tốt; quản lý balance/nội dung bằng Data Table (Spreadsheet, JSON); chủ động dùng công cụ AI. ${PERK}` },
  V230: { id: '2168ceac-4807-41eb-8de8-f6c5d66063ae', meta: METAI, intro: `${ABOUT} — đang tuyển <b>Game Designer Intern</b> qua FYI (văn phòng Nguyễn Huy Tưởng, Thanh Xuân). Công việc: lên ý tưởng và thiết kế nội dung game mobile, phối hợp cùng Unity Developer làm prototype. Yêu cầu: yêu thích và hiểu game mobile; từng phát hành game (kể cả dự án cá nhân) hoặc có kiến thức nền C#/Unity là lợi thế; <b>chấp nhận ứng viên mới</b>. ${PERK}` },
  V233: { id: '92f4eea7-928d-437b-a479-804bac81626d', meta: META, intro: `${ABOUT} — đang tuyển <b>2D Animator &amp; VFX Artist</b> qua FYI. Công việc: sản xuất 2D animation và VFX cho game, làm chủ AI pipeline cùng Unity Engine, tích hợp và quản lý tài nguyên animation/VFX trong Unity. Yêu cầu: <b>3 năm kinh nghiệm 2D Animation cho game</b> hoặc năng lực tương đương qua portfolio; <b>portfolio bắt buộc có character animation bằng Spine</b>. ${PERK}` },
  V231: { id: '7b41b3e0-8b8f-4e09-9723-2c1fdb701b97', meta: META, intro: `${ABOUT} — đang tuyển <b>Creative Team Lead</b> qua FYI. Công việc: dẫn dắt team sáng tạo sản xuất video quảng cáo game, xây dựng kịch bản, ứng dụng công cụ AI để sản xuất video ngắn/mini drama/short-form, phối hợp với team UA. Yêu cầu: <b>tối thiểu 1 năm ở vị trí Marketing/Creative Team Lead</b> hoặc quản lý tương đương; ít nhất 1 năm dùng công cụ AI (Kling, Seedance…) để sản xuất video — <b>bắt buộc nộp video làm bằng chứng</b>; kinh nghiệm xây dựng kịch bản video. Ưu tiên: từng sản xuất Playable Ads, short-form bằng AI. ${PERK}` },
  V235: { id: 'fe87920e-b0a5-41b1-a07b-3b11224bccd7', meta: META, intro: `${ABOUT} — đang tuyển <b>UA Marketing (Game Mobile)</b> qua FYI. Công việc: xây dựng và triển khai chiến lược UA cho thị trường quốc tế, trực tiếp vận hành và tối ưu các kênh quảng cáo lớn (<b>Google, Meta, Unity, AppLovin</b>), phân tích dữ liệu hiệu quả chiến dịch. Yêu cầu: <b>từ 2 năm kinh nghiệm Marketing Mobile Game hoặc App Marketing</b>; kinh nghiệm vận hành/tối ưu nền tảng quảng cáo trên thị trường quốc tế; sử dụng MMP (<b>AppsFlyer, Adjust, Singular</b>…) và phân tích dữ liệu. ${PERK}` },
  V236: { id: 'cdd14b0b-1ad9-4d51-be6b-940c152b0264', meta: META, intro: `${ABOUT} — đang tuyển <b>Senior UA Marketing</b> qua FYI. Công việc: xây dựng chiến lược và triển khai các chiến dịch Global Marketing &amp; UA, theo dõi/phân tích/báo cáo hiệu quả, đề xuất giải pháp tối ưu Performance Marketing. Yêu cầu: <b>từ 5 năm kinh nghiệm Performance Marketing/UA</b>; quản lý và vận hành MMP (AppsFlyer, Adjust, Singular) gồm phối hợp Developer tích hợp SDK, thiết lập kênh và event tracking; ứng dụng AI để tự động hóa quy trình Marketing. Ưu tiên: từng du học/học tập ở nước ngoài. ${PERK}` },
  V237: { id: '029173eb-bfa1-40ec-a678-768fb02555d3', meta: META, intro: `${ABOUT} — đang tuyển <b>IT Comtor</b> qua FYI. Công việc: thông dịch các cuộc họp dự án, hỗ trợ giao tiếp giữa team phát triển và team QA, lập và quản lý kế hoạch tiến độ dự án. Yêu cầu: <b>tiếng Hàn TOPIK 5 trở lên</b>; <b>2 năm kinh nghiệm IT Comtor hoặc có kinh nghiệm thực tế trong lĩnh vực IT</b> (chưa từng làm Comtor vẫn ứng tuyển được nếu có kinh nghiệm IT); giao tiếp tốt. Ưu tiên: kinh nghiệm QA, hiểu biết về game casual, kỹ năng lập kế hoạch. Quy trình: hồ sơ → phỏng vấn online chuyên môn → phỏng vấn online với lãnh đạo (có phí phỏng vấn) → thỏa thuận. ${PERK}` },
  V229: { id: '1836843b-4ac0-4c91-bb13-332937c521b8', meta: METAI, intro: `${ABOUT} — đang tuyển <b>Social Media Content Intern</b> qua FYI (văn phòng Nguyễn Huy Tưởng, Thanh Xuân). Công việc: lên ý tưởng và sản xuất nội dung video short-form / format phim-drama liên quan đến game, vận hành các kênh SNS của game. Yêu cầu: từng tự xây dựng và phát triển kênh cá nhân; kinh nghiệm lên ý tưởng video short-form; vận hành nhiều kênh SNS. <b>Ưu tiên giao tiếp được tiếng Hàn</b>. ${PERK}` },
  V238: { id: '2696da1a-9c40-4091-8774-383670d7c121', meta: METAI, intro: `${ABOUT} — đang tuyển <b>Game Community Operations Intern</b> qua FYI (văn phòng Nguyễn Huy Tưởng, Thanh Xuân). Công việc: vận hành cộng đồng người chơi, lên kế hoạch và tổ chức sự kiện cộng đồng, quản lý kênh Discord/Naver Lounge, tổng hợp phản hồi người chơi. Yêu cầu: kinh nghiệm tổ chức sự kiện cộng đồng; từng hoạt động trên Naver Lounge hoặc Discord; <b>giao tiếp được tiếng Hàn hoặc một ngoại ngữ thứ hai</b>. ${PERK}` },
}

const SUBJECT = {
  public: (role) => `[FYI] Bạn được chọn vào danh sách đề cử gửi NSTAGE — ${role} (Hà Nội)`,
  private: (role) => `[FYI] Bạn được chọn vào danh sách đề cử — ${role} tại NSTAGE (Hà Nội)`,
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
    : `<div style="width:44px;height:44px;border-radius:10px;background:#fff0e6;color:#ff6000;font-weight:800;font-size:16px;text-align:center;line-height:44px">N</div>`
  return `<table width="100%" cellpadding="0" cellspacing="0" style="background:#fff;border:1px solid #eee5da;border-radius:14px;margin-bottom:8px"><tr>
    <td width="44" style="padding:14px 0 14px 14px;vertical-align:middle">${logo}</td>
    <td style="padding:14px 14px 14px 12px;vertical-align:middle">
      <div style="font-size:12px;color:#8a8073;margin-bottom:3px">${esc(CO)}</div>
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
  <tr><td style="font-size:14px;line-height:1.65;color:#4a443c;padding-top:4px">${BENEFIT[frame](CO)} ${ONETAP}</td></tr>
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

- ${job.title.trim()} (${CO}) — ${jd.meta} — ${SITE}/ktc/jobs/${jd.id}

${strip(BENEFIT[frame](CO))} ${strip(ONETAP)}

${url}

Bạn nhận được email này vì đã đăng ký hồ sơ trên FYI.
— Đội ngũ FYI · salary-fyi.com/jobs
Hủy đăng ký: ${unsubUrl}`
}

async function main() {
  const jobIds = Object.values(JOBS).map((j) => j.id)
  const { data: jobRows, error: jobErr } = await sb.from('jobs').select('id,title,company,location,logo_url,is_active,source_id').in('id', jobIds)
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

  const [pool, unsubs, recs, apps, bl, todays] = await Promise.all([
    fetchAll(() => sb.from('user_profiles')
      .select('id,email,full_name,position,desired_roles,headline,major,yoe_months,location,english_cert,korean_cert,is_resume_public,skills,resume_summary,experiences,certs,projects')
      .not('email', 'is', null).not('resume_url', 'is', null).order('created_at', { ascending: false })),
    fetchAll(() => sb.from('events').select('user_id').eq('event', 'coldmail_unsub').not('user_id', 'is', null).order('id')),
    fetchAll(() => sb.from('job_recommendations').select('user_id,job_id').in('job_id', jobIds).order('id')),
    fetchAll(() => sb.from('job_applications').select('user_id,job_id').in('job_id', jobIds).order('id')),
    fetchBlacklist(),
    fetchAll(() => sb.from('job_recommendations').select('user_id').gte('created_at', new Date().toISOString().slice(0, 10)).order('id')),
  ])
  const todaySet = new Set(todays.map((r) => r.user_id)), unsubSet = new Set(unsubs.map((r) => r.user_id))
  const recSet = new Set(recs.map((r) => `${r.user_id}|${r.job_id}`)), appliedSet = new Set(apps.map((a) => `${a.user_id}|${a.job_id}`))

  const seen = new Set(); const assigned = []; let skipRec = 0, skipToday = 0
  for (const p of pool) {
    if (!p.email || /likelion/i.test(p.email)) continue
    const e = p.email.toLowerCase()
    if (seen.has(e) || unsubSet.has(p.id) || bl.has(p) || !hnOk(p)) continue
    if (todaySet.has(p.id)) { skipToday++; continue }
    p.__t = txt(p)
    for (const g of GROUPS) {
      const s = g.pick(p)
      if (s == null) continue
      const jobId = JOBS[g.jobKey].id
      if (appliedSet.has(`${p.id}|${jobId}`) || recSet.has(`${p.id}|${jobId}`)) { skipRec++; continue }
      seen.add(e); assigned.push({ p, s, g, frame: p.is_resume_public ? 'public' : 'private' }); break
    }
  }
  console.log('발송 대상(1인 1통 배정, HN권/미기재):')
  for (const g of GROUPS) {
    const rows = assigned.filter((r) => r.g.gkey === g.gkey)
    console.log(`  ${g.jobKey} ${g.label.vi} [${g.gkey}]: ${rows.length}명 (공개 ${rows.filter((x) => x.frame === 'public').length}) — ${g.label.ko}`)
  }
  console.log(`  ── 합계: ${assigned.length}명 (제외: 해당 공고 기수신/기지원 ${skipRec} · 당일 타 공고 기수신 ${skipToday})`)
  if (!doSend) {
    for (const g of GROUPS) {
      const rows = assigned.filter((r) => r.g.gkey === g.gkey).sort((a, b) => b.s - a.s)
      if (!rows.length) continue
      console.log(`\n── ${g.jobKey} ${g.gkey} (${rows.length}) ──`)
      for (const { p, s, frame } of rows.slice(0, 12)) console.log(`  [${s}·${frame}] ${p.full_name} · ${p.position || '?'} · ${Math.round(y(p) / 12 * 10) / 10}y · ${String(p.location || '위치?').slice(0, 16)} · KO:${koCert(p).slice(0, 10) || '-'} · ${expTitles(p).slice(0, 60)}`)
    }
    console.log('\n(dry-run — 실발송하려면 --send)'); return
  }
  let targets = [...assigned].sort((a, b) => b.s - a.s); if (maxN) targets = targets.slice(0, maxN)
  let ok = 0, fail = 0
  for (const { p, g, frame } of targets) {
    const jd = JOBS[g.jobKey], job = jobById[jd.id], camp = `nstage1014-recommend-${g.gkey}-${frame}`
    const u = url(p.id, camp, jd.id), un = unsubFor(p.id, camp)
    const { error } = await resend.emails.send({
      from: RESEND_FROM, to: p.email, subject: SUBJECT[frame](g.label.vi),
      html: emailHtml(p.full_name, u, un, jd, job, frame), text: emailText(p.full_name, u, un, jd, job, frame),
      headers: { 'List-Unsubscribe': `<${un}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
    })
    if (error) { console.error(`실패 ${p.email}:`, error.message || error); fail++; continue }
    await sb.from('job_recommendations').upsert([{ user_id: p.id, to_email: p.email, job_id: jd.id, job_title: job.title, job_company: job.company, sent_by: 'coldmail', kind: 'recommend', status: 'sent' }], { onConflict: 'user_id,job_id', ignoreDuplicates: true })
    await sb.from('events').insert([{ event: 'recommend_sent', page: '/scripts/nstage1014-recommend-coldmail', meta: { campaign: camp, job_ids: [jd.id], frame, group: g.gkey }, user_id: p.id }])
    ok++; if (ok % 25 === 0) console.log(`  …${ok}/${targets.length}`); await sleep(400)
  }
  console.log(`\n✅ 발송 완료: ${ok}/${targets.length} (실패 ${fail})`)
  const c = {}; for (const { g } of targets) c[g.jobKey] = (c[g.jobKey] || 0) + 1
  console.log(Object.entries(c).map(([k, v]) => `${k} ${v}`).join(' · '))
}
main().catch((e) => { console.error(e); process.exit(1) })
