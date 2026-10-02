// KTC CANDIDATE DATA 시트 전체(=ktc-support candidates 테이블) 기준 CV 클레임 콜드메일 — 7/28 CSV 리스트 밖까지 확장(10/2).
// 양식·랜딩·콜백은 KTC 4차 클레임(scripts/outreach/ktc-claim-coldmail.mjs)과 동일. 차이는 두 가지:
//   1) 리드 소스가 고정 CSV 가 아니라 ktc-support DB candidates 전량(시트 동기화본) — 미가입 × 우리 메일 접촉 0 인 사람만.
//   2) CV 가 Drive 링크(2,300명+, recruitment@likelion.net 소유·공개 다운로드 불가)인 리드는 --prepare 로
//      Drive API(GDRIVE_REFRESH_TOKEN, drive.readonly)로 받아 우리 resumes 버킷(ktc-claim/sheet1002/<lead해시>.<ext>)에
//      옮기고 같은 자리에서 파싱(ktc_claim_profiles). 가입 콜백 임포트는 *.supabase.co 공개 스토리지 URL 만 허용하므로 필수.
//      KTC 공개 스토리지 직링크(ktc-cvs)인 리드는 옮기지 않고 파싱만 한다.
// 캠페인명은 coldmail-ktc-cv 로 시작해야 콜백 임포트가 동작한다.
//
//   node scripts/outreach/auth.mjs --drive                                   # 1회: GDRIVE_REFRESH_TOKEN 발급 → .env.local
//   node scripts/outreach/ktc-sheet-claim-coldmail.mjs --prepare [--max N] [--workers 4]   # CV 이동+파싱(idempotent)
//   node scripts/outreach/ktc-sheet-claim-coldmail.mjs                       # dry-run
//   node scripts/outreach/ktc-sheet-claim-coldmail.mjs --test a@x.com [--lang ko]
//   node scripts/outreach/ktc-sheet-claim-coldmail.mjs --send [--max N]
//   위 모든 명령에 --source 2025 를 붙이면 KTC WORKER 2025 마스터시트(data/ktc2025-master.csv) 리드로 동작
//   (캠페인 coldmail-ktc-cv-sheet2025 · 버킷 ktc-claim/sheet2025 · 지원 시점은 연도까지 명시). 2026 먼저 보내면 겹침 121명은 기접촉으로 자동 제외.
import { readFileSync, writeFileSync } from 'node:fs'
import { resolveMx } from 'node:dns/promises'
import { createClient } from '@supabase/supabase-js'
import { google } from 'googleapis'
import { sb, env, fetchAll, fetchBlacklist, OAUTH_REDIRECT } from './lib.mjs'
import { makeToken, leadId } from '../../lib/ktcMailToken.js'

const args = process.argv.slice(2)
const flag = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? (args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true) : d }
// --source 2026(기본, ktc-support candidates DB) | 2025(KTC WORKER 2025 마스터시트 export = data/ktc2025-master.csv,
//   scripts/tmp/ktc2025-export.mjs 로 Drive API export. 1인1행·Unsubscribed 열 존중·CV=CV_Data 또는 16.Upload CV Drive 링크)
const source = flag('source', '2026') === '2025' ? '2025' : '2026'
const CAMPAIGN = source === '2025' ? 'coldmail-ktc-cv-sheet2025' : 'coldmail-ktc-cv-sheet1002'
const SITE = (env.NEXT_PUBLIC_SITE_URL || 'https://salary-fyi.com').replace(/\/$/, '')
const RESEND_FROM = env.RESEND_FROM || 'FYI <hello@salary-fyi.com>'
const BUCKET = 'resumes', PREFIX = source === '2025' ? 'ktc-claim/sheet2025' : 'ktc-claim/sheet1002'
const CSV_2025 = new URL('../../data/ktc2025-master.csv', import.meta.url)
const IMPORTABLE = /^https:\/\/[a-z0-9]+\.supabase\.co\/storage\/v1\/object\/public\//
const DRIVE = /drive\.google\.com|docs\.google\.com/

const doPrepare = args.includes('--prepare')
const doSend = args.includes('--send')
const testTo = flag('test', null)
const max = parseInt(flag('max', '0')) || 0
const workers = parseInt(flag('workers', '4')) || 4
const lang = flag('lang', 'vi') === 'ko' ? 'ko' : 'vi' // ko 는 문구 검토용 테스트 발송 전용(실발송은 vi)
const TEMPLATE = new URL(`../ktc-claim-coldmail-${lang}.html`, import.meta.url)
const sleep = (ms) => new Promise(r => setTimeout(r, ms))
const esc = (s) => String(s || '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
const csvCell = (v) => { const s = String(v ?? ''); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s }
const norm = (e) => String(e || '').trim().toLowerCase()
const validEmail = (e) => /^[^@\s]+@[^@\s.]+\.[^@\s]+$/.test(e)
// 호칭(tên) — 시트 이름은 "Họ Tên"(기본)과 서양식 "Tên Họ"(ITviec 등)가 섞여 있다. 마지막 토큰이 흔한 성(姓)이고
// 첫 토큰은 아니면 서양식으로 보고 첫 토큰을 쓴다. 괄호 영문명 제거, 전부 대문자면 첫 글자만 대문자로.
const SURNAMES = new Set(['nguyen', 'nguyễn', 'tran', 'trần', 'le', 'lê', 'pham', 'phạm', 'hoang', 'hoàng', 'huynh', 'huỳnh', 'phan', 'vu', 'vũ', 'vo', 'võ', 'dang', 'đặng', 'bui', 'bùi', 'do', 'đỗ', 'ho', 'hồ', 'ngo', 'ngô', 'duong', 'dương', 'ly', 'lý', 'dinh', 'đinh', 'truong', 'trương', 'mai', 'cao', 'luu', 'lưu', 'ta', 'tạ', 'trinh', 'trịnh', 'lam', 'lâm', 'to', 'tô'])
const tenOf = (name) => {
  const toks = String(name || '').replace(/\(.*?\)/g, '').trim().split(/\s+/).filter(Boolean)
  if (!toks.length) return 'bạn'
  const isSur = (t) => SURNAMES.has(t.toLowerCase())
  const n = toks.length
  let t
  if (n === 1 || isSur(toks[0])) t = toks[n - 1]                 // Họ Tên(기본) → 마지막
  else if (isSur(toks[n - 1])) t = n >= 3 ? toks[n - 2] : toks[0] // "Phu Thinh Nguyen" → Thinh / "Quyen Nguyen" → Quyen
  else if (toks.slice(1, -1).some(isSur)) t = toks[0]            // "Linh Tran Khanh" → Linh (성이 가운데)
  else t = toks[n - 1]
  return t === t.toUpperCase() ? t[0] + t.slice(1).toLowerCase() : t
}
// 시트 이름이 이메일 아이디·"Test …"·한 단어면 이름이 아니다 → 파싱본 full_name 으로 대체, 그래도 없으면 미발송
const looksName = (s) => /^[\p{L}\s'’.-]+$/u.test(s) && s.trim().split(/\s+/).length >= 2 && !/^test\b/i.test(s)
const cleanUni = (s) => { const u = String(s || '').replace(/^[-–\s]+/, '').trim(); return u.length >= 3 && u.length <= 60 ? u : '' }
const titleIfCaps = (s) => s && s === s.toUpperCase() ? s.toLowerCase().replace(/(^|[\s/&-])(\p{L})/gu, (m, a, b) => a + b.toUpperCase()) : s
// 시트 position/applied_job 은 "FPT401- Embedded Software Developer (Java, C++, Python)" 꼴 — 코드 접두어·괄호·#id 를 벗긴다.
const stripCode = (s) => String(s || '').replace(/^(?:[A-Z]{2,6}\d{3,4}|[RVK]\d{1,4})(#\d+)?\s*[-–:_]?\s*/, '').replace(/\s*\(#\d+\)\s*$/, '').trim()
const shortPos = (s) => stripCode(s).replace(/\s*\(.*$/, '').trim()
// applied_date 포맷 혼재: "dd-mm-yyyy HH:mm"(ITviec) · "dd/mm/yyyy HH:mm" · "mm/dd/yyyy"(시각 없음, JobsGO 등) · "d/m/yy" — 월만 쓴다.
const appliedMonthOf = (raw, createdAt) => {
  const s = String(raw || '')
  let m = null, y = null
  let x = s.match(/(\d{4})-(\d{2})-(\d{2})/)
  if (x) { y = +x[1]; m = +x[2] }
  else if ((x = s.match(/(\d{1,2})-(\d{1,2})-(\d{4})/))) { y = +x[3]; m = +x[2] }
  else if ((x = s.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/))) {
    const a = +x[1], b = +x[2]; y = +x[3] < 100 ? 2000 + +x[3] : +x[3]
    const hasTime = /\d{1,2}:\d{2}/.test(s)
    m = a > 12 ? b : b > 12 ? a : hasTime ? b : a // 시각 동반=dd/mm(시트 수기), 날짜만=mm/dd(잡보드 export)
  }
  if (!m && createdAt) { y = +createdAt.slice(0, 4); m = +createdAt.slice(5, 7) }
  if (!m || m < 1 || m > 12) return null
  const now = new Date()
  if (y > now.getFullYear() || (y === now.getFullYear() && m > now.getMonth() + 1)) return null // 미래(오입력)
  return m
}

// ── 메일: 원본 클레임 양식에서 "맞는 포지션이 생기면 전달" 문단만 교체(10/2 유저 확정) ──
// 훅 = "가입자는 1주 평균 3.2건의 오퍼"(이력서 등록 캠페인과 같은 실측 확정치) + "이력서가 이미 등록돼 있어
// 합격 가능성 높은 공고를 우선 골라 추천"(KTC 추천 콜드메일이 T1/T2 적합도 순으로 골라 보내는 실제 프로세스).
// 치환 실패 = 원문 변경 → 옛 카피가 나가는 사고라 throw 로 발송을 막는다.
const swap = (tpl, pairs) => pairs.reduce((t, [a, b]) => {
  if (!t.includes(a)) throw new Error(`템플릿 치환 실패(원문 변경됨?): ${a.slice(0, 40)}…`)
  return t.replace(a, b)
}, tpl)
const OFFER_KO = 'FYI에 가입한 분들은 <b style="color:#191F28;">1주일 평균 3.2건의 오퍼</b>를 받고 있습니다. 회원님은 이력서가 이미 등록되어 있어,\n      프로필과 잘 맞아 합격 가능성이 높은 공고가 올라오면 저희가 먼저 골라 추천해 드립니다 — 추천은 이메일로 받아보실 수 있습니다.'
const OFFER_VI = 'Thành viên FYI nhận trung bình <b style="color:#191F28;">3,2 lời mời mỗi tuần</b>. Vì hồ sơ của bạn đã được đăng ký sẵn,\n      khi có vị trí phù hợp với hồ sơ và có khả năng trúng tuyển cao, chúng tôi sẽ ưu tiên chọn và gợi ý cho bạn trước — bạn sẽ nhận được gợi ý qua email.'
const template = swap(readFileSync(TEMPLATE, 'utf8'), lang === 'ko' ? [
  ['그리고 회원님께 맞는 포지션이 열리면, 저희가 <b style="color:#191F28;">기업 채용 담당자에게 프로필을 바로 전달</b>해\n      드립니다 — 담당자의 연락은 이메일로 받아보실 수 있습니다.', OFFER_KO],
] : [
  ['Khi có vị trí phù hợp, chúng tôi sẽ gửi hồ sơ của bạn <b style="color:#191F28;">trực tiếp đến nhà tuyển dụng</b>\n      — và bạn sẽ nhận được liên hệ qua email.', OFFER_VI],
])
const subject = (l) => lang === 'ko'
  ? `${l.ten}님, 회원님의 ${l.position} 프로필이 FYI에 준비되어 있습니다`
  : `${l.ten} ơi, hồ sơ ${l.position} của bạn đã sẵn sàng trên FYI`
// "얼마 전" 금지 — 5~7월 지원자가 대부분이라 월 명시. 지원일이 없거나 미래(오입력)면 시점 언급 없이.
// 작년(2025 시트) 지원자는 연도까지 — "지난 6월"이 올해로 읽히면 거짓이 된다.
const monthFrag = (l) => {
  const m = l.appliedMonth, y = l.appliedYear
  if (!m) return lang === 'ko' ? '이전에 ' : 'Trước đây, '
  if (y && y < new Date().getFullYear()) return lang === 'ko' ? `지난 ${y}년 ${m}월, ` : `Hồi tháng ${m} năm ${y}, `
  return lang === 'ko' ? `지난 ${m}월, ` : `Hồi tháng ${m}, `
}
const atCompanyHtml = (l) => l.company ? (lang === 'ko' ? ` <b>${esc(l.company)}</b>` : ` tại <b>${esc(l.company)}</b>`) : ''
const cardRowStyle = 'font-size:14px;color:#4E5968;line-height:1.7;'
const cardRows = (l) => {
  const rows = []
  if (l.university) rows.push(`<div style="${cardRowStyle}">🎓 ${esc(l.university)}</div>`)
  const yoe = parseFloat(l.yoe)
  const yoeTail = Number.isFinite(yoe) && yoe >= 1 ? (lang === 'ko' ? ` · 경력 ${yoe}년` : ` · ${yoe} năm kinh nghiệm`) : ''
  rows.push(`<div style="${cardRowStyle}">💼 ${esc(l.position)}${yoeTail}</div>`)
  if (l.skills?.length) rows.push(`<div style="${cardRowStyle}">🛠 ${esc(l.skills.slice(0, 5).join(' · '))}</div>`)
  return rows.join('\n          ')
}
const render = (l, cta, unsub) => template
  .replace(/\{\{name\}\}/g, esc(l.ten))
  .replace(/\{\{fullName\}\}/g, esc(l.name))
  .replace(/\{\{month\}\}/g, monthFrag(l))
  .replace(/\{\{jobTitle\}\}/g, esc(l.job))
  .replace(/\{\{atCompany\}\}/g, atCompanyHtml(l))
  .replace(/\{\{position\}\}/g, esc(l.position))
  .replace(/\{\{cardRows\}\}/g, cardRows(l))
  .replace(/\{\{ctaUrl\}\}/g, cta)
  .replace(/\{\{unsubscribeUrl\}\}/g, unsub)
const text = (l, cta, unsub) => lang === 'ko' ? `안녕하세요 ${l.ten}님,

${monthFrag(l)}K-Tech College를 통해 ${l.company ? `${l.company}의 ` : ''}${l.job} 포지션에 지원해 주셨죠.

그때 제출하신 이력서로, K-Tech College가 만든 채용 플랫폼 FYI에 회원님의 프로필을 미리 만들어 두었습니다.

이력서를 다시 작성하실 필요 없습니다. 구글 로그인 한 번이면 프로필이 바로 등록되고, 새로운 공고에 원클릭으로 지원할 수 있습니다.

FYI에 가입한 분들은 1주일 평균 3.2건의 오퍼를 받고 있습니다. 회원님은 이력서가 이미 등록되어 있어, 프로필과 잘 맞아 합격 가능성이 높은 공고가 올라오면 저희가 먼저 골라 추천해 드립니다. 추천은 이메일로 받아보실 수 있습니다.

내 프로필 확인하기:
${cta}

— FYI 팀 · salary-fyi.com
수신 거부: ${unsub}` : `Chào ${l.ten},

${monthFrag(l)}bạn đã ứng tuyển vị trí ${l.job}${l.company ? ` tại ${l.company}` : ''} qua K-Tech College.

Với CV bạn đã nộp khi đó, chúng tôi đã chuẩn bị sẵn hồ sơ của bạn trên FYI — nền tảng tuyển dụng do K-Tech College xây dựng.

Bạn không cần viết lại CV. Chỉ cần đăng nhập Google một lần, hồ sơ sẽ được đăng ký ngay và bạn có thể ứng tuyển các vị trí mới chỉ với một chạm.

Thành viên FYI nhận trung bình 3,2 lời mời mỗi tuần. Vì hồ sơ của bạn đã được đăng ký sẵn, khi có vị trí phù hợp với hồ sơ và có khả năng trúng tuyển cao, chúng tôi sẽ ưu tiên chọn và gợi ý cho bạn trước — bạn sẽ nhận được gợi ý qua email.

Nhận hồ sơ của tôi:
${cta}

— Đội ngũ FYI · salary-fyi.com
Hủy đăng ký: ${unsub}`

const ctaFor = (l) => `${SITE}/api/ktc/r?t=${encodeURIComponent(makeToken(l.email, CAMPAIGN))}&to=%2Fktc%2Fclaim`
const unsubFor = (l) => `${SITE}/api/ktc/unsub?t=${encodeURIComponent(makeToken(l.email, CAMPAIGN))}`

function parseCsv(text) {
  if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1)
  const rows = []; let row = [], cur = '', q = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (q) { if (c === '"') { if (text[i + 1] === '"') { cur += '"'; i++ } else q = false } else cur += c }
    else if (c === '"') q = true
    else if (c === ',') { row.push(cur); cur = '' }
    else if (c === '\n') { row.push(cur); rows.push(row); row = []; cur = '' }
    else if (c !== '\r') cur += c
  }
  if (cur || row.length) { row.push(cur); rows.push(row) }
  const head = rows.shift()
  return rows.filter(r => r.length > 5).map(r => Object.fromEntries(head.map((h, i) => [h, (r[i] || '').trim()])))
}
// 2025 마스터시트 → 리드. 직무는 TopDev 공고명("[Remote/Onsite Korea] BackEnd Developer (#2036580)")이나
// 복수값("Back End Developer, Full Stack Developer")이라 접두 괄호·#id 제거 후 첫 항목만. 경력은 "4 năm 10 tháng"/"2"/"12" 혼재 →
// "N năm" 또는 10 이하 숫자만 연차로 인정(12 같은 큰 수는 개월일 수 있어 표기 안 함).
function leads2025() {
  const rows = parseCsv(readFileSync(CSV_2025, 'utf8'))
  const out = [], seen = new Set()
  let nUnsub = 0
  for (const r of rows) {
    const email = norm(r['Email Address']) || norm(r['20. Thông tin liên hệ - Email'])
    if (!validEmail(email) || seen.has(email)) continue
    seen.add(email)
    if (/unsub/i.test(r['Unsubscribed'] || '')) { nUnsub++; continue }
    const cvs = [r['CV_Data'], r['16. Upload CV']].map(s => (s || '').trim())
    const cvUrl = cvs.find(u => IMPORTABLE.test(u)) || cvs.find(u => DRIVE.test(u)) || ''
    const posRaw = (r['Position_Data'] || r['Vị trí/Position'] || '').replace(/^\[[^\]]*\]\s*/, '').split(/,|\+|\//)[0]
    const yoeRaw = r['YOE_Data'] || r['12. Years of Experience'] || ''
    const yoeM = yoeRaw.match(/(\d+(?:[.,]\d+)?)\s*năm/i) || (/^\s*\d{1,2}\s*$/.test(yoeRaw) && +yoeRaw <= 10 ? [null, yoeRaw.trim()] : null)
    const ts = (r['Timestamp Data Summitted'] || '').match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/)
    out.push({
      email, lead: leadId(email), cvUrl,
      name: (r['Name_Data'] || r['2.1. Họ tên (Tiếng Việt)'] || '').replace(/\(.*?\)/g, '').trim(),
      company: '', job: shortPos(posRaw), sheetPos: shortPos(posRaw),
      university: cleanUni((r['6. Trường đại học bạn theo học'] || '').split(/\s+-\s+\d{1,2}\/\d{4}/)[0]),
      yoe: yoeM ? yoeM[1].replace(',', '.') : '',
      appliedMonth: ts ? +ts[1] : null, appliedYear: ts ? +ts[3] : 2025,
    })
  }
  console.log(`[2025] 시트 ${rows.length}행 → 유니크 ${out.length + nUnsub} | 시트 Unsubscribed 제외 ${nUnsub}`)
  return out
}
async function fetchAllKtc(client, build) {
  const out = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await build().range(from, from + 999)
    if (error) throw error
    out.push(...(data || [])); if (!data || data.length < 1000) break
  }
  return out
}

// ── CV 준비: Drive → 스토리지(+직링크는 파싱만) ──
const driveId = (u) => (String(u).match(/[?&]id=([\w-]+)/) || String(u).match(/\/d\/([\w-]+)/) || [])[1]
async function prepare(leads, claimBy) {
  const { parseResumeBuffer } = await import('../../lib/parseResume.js') // env 주입(lib.mjs) 뒤 로드
  // 이미 임포트 가능한 URL 로 파싱본이 있으면 스킵(8월 KTC 파싱본 포함) — 재실행 안전. 직링크(Drive 토큰 불필요)부터 처리.
  const targets = leads.filter(l => !(IMPORTABLE.test(claimBy.get(l.email)?.cv_url || '') && claimBy.get(l.email)?.summary?.full_name))
    .sort((a, b) => Number(IMPORTABLE.test(b.cvUrl)) - Number(IMPORTABLE.test(a.cvUrl)))
  const queue = max ? targets.slice(0, max) : targets
  let drive = null
  if (queue.some(l => !IMPORTABLE.test(l.cvUrl))) {
    const token = env.GDRIVE_REFRESH_TOKEN || process.env.GDRIVE_REFRESH_TOKEN
    if (!token) throw new Error('GDRIVE_REFRESH_TOKEN 없음 — node scripts/outreach/auth.mjs --drive 먼저')
    const auth = new google.auth.OAuth2(env.GMAIL_CLIENT_ID, env.GMAIL_CLIENT_SECRET, OAUTH_REDIRECT)
    auth.setCredentials({ refresh_token: token })
    drive = google.drive({ version: 'v3', auth })
  }
  console.log(`준비 대상 ${queue.length}명 (기준비 ${leads.length - targets.length}, 직링크 ${queue.filter(l => IMPORTABLE.test(l.cvUrl)).length} · Drive ${queue.filter(l => !IMPORTABLE.test(l.cvUrl)).length}) | 워커 ${workers}`)
  let ok = 0, done = 0; const fails = []
  const one = async (l) => {
    let buf, cvUrl
    if (IMPORTABLE.test(l.cvUrl)) {
      const r = await fetch(l.cvUrl); if (!r.ok) throw new Error(`fetch ${r.status}`)
      buf = Buffer.from(await r.arrayBuffer()); cvUrl = l.cvUrl
    } else {
      const id = driveId(l.cvUrl); if (!id) throw new Error('drive id 없음')
      const r = await drive.files.get({ fileId: id, alt: 'media', supportsAllDrives: true }, { responseType: 'arraybuffer' })
      buf = Buffer.from(r.data)
      const isPdf = buf.subarray(0, 1024).indexOf('%PDF-') !== -1, isZip = buf.subarray(0, 2).toString('latin1') === 'PK'
      if (!isPdf && !isZip) throw new Error(`CV 아님(${String(r.headers?.['content-type'] || '').slice(0, 40)}, ${buf.length}B)`)
      const ext = isPdf ? 'pdf' : 'docx'
      const type = isPdf ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      const path = `${PREFIX}/${l.lead}.${ext}` // 해시 파일명 — PII 없음
      const { error: upErr } = await sb.storage.from(BUCKET).upload(path, buf, { contentType: type, upsert: true })
      if (upErr) throw new Error(`upload: ${upErr.message}`)
      cvUrl = sb.storage.from(BUCKET).getPublicUrl(path).data.publicUrl
    }
    const summary = await parseResumeBuffer(buf, l.name)
    const { error } = await sb.from('ktc_claim_profiles').upsert({ email: l.email, summary, cv_url: cvUrl, parsed_at: new Date().toISOString() }, { onConflict: 'email' })
    if (error) throw new Error(`db: ${error.message}`)
    return `${summary.full_name} · ${summary.university || '(대학 없음)'} · ${summary.headline || ''}`
  }
  let idx = 0
  await Promise.all(Array.from({ length: workers }, async () => {
    while (idx < queue.length) {
      const l = queue[idx++]
      try { const s = await one(l); ok++; console.log(`  ✓ [${++done}/${queue.length}] ${l.email} | ${s}`) }
      catch (e) { fails.push(`${l.email}: ${e.message}`); console.log(`  ✗ [${++done}/${queue.length}] ${l.email}: ${e.message}`) }
      await sleep(200)
    }
  }))
  console.log(`\n✅ 준비 완료: 성공 ${ok} / 실패 ${fails.length}`)
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  writeFileSync(new URL(`../../data/ktc-sheet-claim-prepare-fails-${stamp}.txt`, import.meta.url), fails.join('\n'))
  if (fails.length) console.log(`  실패 목록: data/ktc-sheet-claim-prepare-fails-${stamp}.txt`)
}

;(async () => {
  if (testTo) {
    const { Resend } = await import('resend'); const resend = new Resend(env.RESEND_API_KEY)
    const l = { email: testTo, ten: 'Tây', name: 'TRƯƠNG ĐỨC NHẬT TÂY', job: 'Full-stack Developer', company: 'NALDA', position: 'Full-stack Developer',
      university: 'Đại học Bách Khoa Hà Nội', yoe: '2', appliedMonth: 6, skills: ['React', 'Node.js', 'TypeScript', 'PostgreSQL', 'Docker'] }
    const cta = ctaFor(l), unsub = unsubFor(l)
    const r = await resend.emails.send({ from: RESEND_FROM, to: testTo, subject: `[TEST/${lang}] ` + subject(l), text: text(l, cta, unsub), html: render(l, cta, unsub) })
    if (r.error) throw new Error(r.error.message)
    console.log(`✅ 테스트 발송 → ${testTo} | id=${r.data?.id}\n제목: ${subject(l)}\nCTA: ${cta}`)
    return
  }

  // ── 리드 ──
  let leads
  if (source === '2025') leads = leads2025()
  else {
    // ktc-support candidates 전량 → 사람 단위(최신 지원 행이 카드, CV 는 직링크 우선·없으면 Drive)
    if (!env.KTC_SUPABASE_URL || !env.KTC_SUPABASE_SERVICE_ROLE_KEY) throw new Error('KTC_SUPABASE_URL / KTC_SUPABASE_SERVICE_ROLE_KEY 필요(.env.local)')
    const ktc = createClient(env.KTC_SUPABASE_URL, env.KTC_SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
    const rows = await fetchAllKtc(ktc, () => ktc.from('candidates')
      .select('email, full_name, university, position, yoe, cv_url, applied_date, applied_job, applied_company, created_at')
      .order('created_at', { ascending: true }))
    const people = new Map()
    for (const r of rows) {
      const email = norm(r.email); if (!validEmail(email)) continue
      const p = people.get(email) || { email, lead: leadId(email), cvDirect: '', cvDrive: '', latest: null }
      const u = (r.cv_url || '').trim()
      if (IMPORTABLE.test(u) && !p.cvDirect) p.cvDirect = u
      if (DRIVE.test(u)) p.cvDrive = u // 최신 행이 덮어씀(가장 최근 CV)
      p.latest = r // created_at 오름차순이라 마지막이 최신
      people.set(email, p)
    }
    leads = [...people.values()].map(p => {
      const r = p.latest
      return {
        email: p.email, lead: p.lead, cvUrl: p.cvDirect || p.cvDrive,
        name: (r.full_name || '').replace(/\(.*?\)/g, '').trim(),
        company: (r.applied_company || '').trim(), job: stripCode(r.applied_job),
        sheetPos: shortPos(r.position), university: cleanUni(r.university), yoe: (r.yoe || '').toString().trim(),
        appliedMonth: appliedMonthOf(r.applied_date, r.created_at), appliedYear: null,
      }
    })
  }
  const total = leads.length

  // ── 제외: FYI 가입 · 우리 콜드메일 접촉 이력(coldmail-ktc* 전부 — 미접촉 풀만) · 수신거부 · 블랙리스트 ──
  const profs = await fetchAll(() => sb.from('user_profiles').select('email').not('email', 'is', null))
  const members = new Set(profs.map(p => norm(p.email)))
  const evts = await fetchAll(() => sb.from('events').select('event, meta').in('event', ['coldmail_public_sent', 'coldmail_unsub']))
  const touched = new Set(evts.filter(e => e.event === 'coldmail_public_sent' && /^coldmail-ktc/.test(e.meta?.campaign || '') && e.meta?.lead).map(e => e.meta.lead))
  const unsub = new Set(evts.filter(e => e.event === 'coldmail_unsub' && e.meta?.lead).map(e => e.meta.lead))
  const bl = await fetchBlacklist()
  const nMember = leads.filter(l => members.has(l.email)).length
  leads = leads.filter(l => !members.has(l.email))
  const nTouched = leads.filter(l => touched.has(l.lead)).length
  leads = leads.filter(l => !touched.has(l.lead))
  const nUnsub = leads.filter(l => unsub.has(l.lead) || bl.has(l)).length
  leads = leads.filter(l => !unsub.has(l.lead) && !bl.has(l))
  const nNoCv = leads.filter(l => !l.cvUrl).length
  leads = leads.filter(l => l.cvUrl)
  console.log(`캠페인: ${CAMPAIGN} | 랜딩: /ktc/claim`)
  console.log(`시트 ${total}명 | 제외: FYI가입 ${nMember} · 기접촉 ${nTouched} · 수신거부/블랙 ${nUnsub} · CV 없음/외부 ${nNoCv} → ${leads.length}명 (직링크 ${leads.filter(l => IMPORTABLE.test(l.cvUrl)).length} · Drive ${leads.filter(l => !IMPORTABLE.test(l.cvUrl)).length})`)

  const claims = []
  for (let i = 0; i < leads.length; i += 300) {
    const { data, error } = await sb.from('ktc_claim_profiles').select('email, summary, cv_url').in('email', leads.slice(i, i + 300).map(l => l.email))
    if (error) throw error; claims.push(...(data || []))
  }
  const claimBy = new Map(claims.map(c => [c.email, c]))

  if (doPrepare) return prepare(leads, claimBy)

  // 카드: 시트 값 우선, 비면 파싱본. 발송 조건 = 임포트 가능한 CV(우리 스토리지/ktc-cvs) + 이름.
  for (const l of leads) {
    const c = claimBy.get(l.email); const p = c?.summary || {}
    l.cvUrl = IMPORTABLE.test(c?.cv_url || '') ? c.cv_url : (IMPORTABLE.test(l.cvUrl) ? l.cvUrl : '')
    const parsedName = (p.full_name || '').replace(/\(.*?\)/g, '').trim()
    l.name = looksName(l.name) ? l.name : (looksName(parsedName) ? parsedName : ''); l.ten = tenOf(l.name)
    // 2025 시트의 대학 열은 자유 입력("sắp tốt nghiệp" 같은 값)이라 파싱본을 우선한다
    l.university = source === '2025' ? (cleanUni(p.university) || l.university) : (l.university || cleanUni(p.university))
    l.skills = Array.isArray(p.skills) ? p.skills : []
    // 제목·카드용 직무: 시트 값(코드·괄호 제거)이 40자 이내면 그대로, 길면 파싱본 직무 → 짧은 공고명 순
    const parsedPos = shortPos(p.position || p.headline || '')
    l.position = titleIfCaps((l.sheetPos && l.sheetPos.length <= 40 ? l.sheetPos : '') || (parsedPos && parsedPos.length <= 40 ? parsedPos : '') || shortPos(l.job) || l.sheetPos || parsedPos)
    l.job = l.job || l.position
    l.parsed = !!p.full_name
  }
  const ready = leads.filter(l => l.cvUrl && l.name && l.position)
  const unprepared = leads.filter(l => !l.cvUrl).length
  console.log(`발송 가능 ${ready.length} (파싱 완료 ${ready.filter(l => l.parsed).length} · 시트 카드만 ${ready.filter(l => !l.parsed).length}) | 미준비 ${unprepared} = --prepare 필요 | 이름/직무 없음 ${leads.length - ready.length - unprepared}`)
  const capped = max ? ready.slice(0, max) : ready
  if (!capped.length) { console.log('보낼 대상 없음.'); return }

  const mxOk = new Map()
  await Promise.all([...new Set(capped.map(l => l.email.split('@')[1]))].map(async d => { try { mxOk.set(d, (await resolveMx(d)).length > 0) } catch { mxOk.set(d, false) } }))
  const queue = capped.filter(l => mxOk.get(l.email.split('@')[1]))
  if (queue.length < capped.length) console.log(`MX 없음 제외 ${capped.length - queue.length}`)

  const s = queue[0]
  const months = {}; for (const l of queue) months[l.appliedMonth || '없음'] = (months[l.appliedMonth || '없음'] || 0) + 1
  console.log(`\n이번 발송 ${queue.length}명 | 지원월 ${JSON.stringify(months)} | 대학 표기 ${queue.filter(l => l.university).length}`)
  console.log(`샘플: ${s.email} / ${s.ten} / ${s.position} / ${s.university || '(대학 없음)'} / ${s.company} · ${s.job} / 스킬 ${s.skills.slice(0, 3).join(',')}`)
  console.log(`제목: ${subject(s)}\nCTA: ${ctaFor(s)}`)
  if (!doSend) {
    const step = Math.max(1, Math.floor(queue.length / 12))
    for (const l of queue.filter((_, i) => i % step === 0).slice(0, 12)) console.log(`  · ${l.name} → ${l.ten} | ${l.position} | ${l.appliedMonth ? l.appliedMonth + '월' : '월없음'} | ${l.company || '(회사없음)'} | ${l.university || '(대학없음)'}`)
    console.log('\n[dry-run] --send 로 실발송.'); return
  }
  if (lang !== 'vi') throw new Error('실발송은 vi 고정 — --lang ko 는 --test 전용')

  const { Resend } = await import('resend'); const resend = new Resend(env.RESEND_API_KEY)
  const log = [['email', 'ten', 'company', 'position', 'lead', 'resend_id', 'error'].join(',')]
  let ok = 0, fail = 0
  for (const l of queue) {
    const cta = ctaFor(l), unsub = unsubFor(l)
    try {
      const resp = await resend.emails.send({
        from: RESEND_FROM, to: l.email, subject: subject(l), text: text(l, cta, unsub), html: render(l, cta, unsub),
        headers: { 'List-Unsubscribe': `<${unsub}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
      })
      if (resp.error) throw new Error(resp.error.message || 'resend_error')
      // PII 는 events 에 안 남긴다 — 사람 식별은 lead 해시. cv_url 은 가입 콜백 임포트 소스(해시 파일명 공개 링크).
      await sb.from('events').insert([{ event: 'coldmail_public_sent', page: '/campaign/ktc',
        meta: { campaign: CAMPAIGN, lead: l.lead, lang: 'vi', cv_url: l.cvUrl, resend_id: resp.data?.id || null } }])
      log.push([l.email, l.ten, l.company, l.position, l.lead, resp.data?.id || '', ''].map(csvCell).join(',')); ok++
    } catch (e) { fail++; log.push([l.email, l.ten, l.company, l.position, l.lead, '', e.message].map(csvCell).join(',')); console.error(`  ✗ ${l.email}: ${e.message}`) }
    // Resend 제한 초당 2건 — API 왕복(~0.4s)+이벤트 기록(~0.2s)이 이미 간격을 벌려 주므로 짧게만 쉰다
    // (0.6s 고정 대기는 분당 50통밖에 안 나왔다, 10/2 2026 발송 실측)
    await sleep(150)
  }
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  writeFileSync(new URL(`../../data/ktc-sheet-claim-sent-${stamp}.csv`, import.meta.url), log.join('\n'))
  console.log(`\n✅ 발송 완료: 성공 ${ok} / 실패 ${fail} | 로그: data/ktc-sheet-claim-sent-${stamp}.csv`)
  if (ready.length > queue.length) console.log(`   남은 ${ready.length - queue.length}명은 같은 명령을 다시 실행하면 이어서 발송됨.`)
})().catch(e => { console.error(e); process.exit(1) })
