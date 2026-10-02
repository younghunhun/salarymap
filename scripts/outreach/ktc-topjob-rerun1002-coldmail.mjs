// 옛 KTC 캠페인(coldmail-ktc ~ 0904) 수신자 중 미가입자 → "내 연차에서 가장 높은 연봉 공고" 1건 추천 콜드메일(베트남어).
// 유저 결정(10/2): 단일 캠페인(직군별 분리 없음) · 한국 근무 공고 포함 · LIKELION VN 자체 공고 포함 ·
//   "3영업일 내 결과 안내"·"현재 지원자 N명" 문구 제외 · 약속 = 가입+지원하면 우선 검토 후 기업에 직접 전달.
// 대상: coldmail-ktc* (sheet/vku 제외) 발송 리드 중 가입 전환·FYI 가입·수신거부·블랙리스트 제외 → ktc_claim_profiles 파싱본으로 직군·연차·지역.
// 공고: is_active 비크롤(ktc/company_self) 중 연봉 있는 건 → Ops Matching Status '진행중'(코드 F/H 또는 회사명) 통과 건만.
//   company_self 는 LIKELION VN 만 허용(기업 자체 검토 공고엔 "우리가 전달" 약속 불가). 마감일 지난 건 제외.
// 배정: 직군(ROLE 맵)·경력(experience_min)·지역(공고 도시 ∋ 본인 도시, 한국 근무는 전원 허용) 적합 중 연봉 최고 1건. 1인 1통.
// 캠페인명이 coldmail-ktc-cv 로 시작해야 가입 콜백이 sent meta.cv_url 로 CV 임포트(프로필 준비 약속 이행).
// CTA: /api/ktc/r(클릭 기록) → /api/auth/google?return=/jobs/<id>&login_hint=<email>. 가입 귀속은 콜백 coldmail_public_convert(lead 해시).
//
//   node scripts/outreach/ktc-topjob-rerun1002-coldmail.mjs                    # dry-run
//   node scripts/outreach/ktc-topjob-rerun1002-coldmail.mjs --test a@x.com [--lang ko]
//   node scripts/outreach/ktc-topjob-rerun1002-coldmail.mjs --send [--max N]
import { readFileSync, writeFileSync } from 'node:fs'
import { resolveMx } from 'node:dns/promises'
import { google } from 'googleapis'
import { sb, env, fetchAll, fetchBlacklist } from './lib.mjs'
import { makeToken, leadId } from '../../lib/ktcMailToken.js'

const CAMPAIGN = 'coldmail-ktc-cv-topjob1002'
const SITE = (env.NEXT_PUBLIC_SITE_URL || 'https://salary-fyi.com').replace(/\/$/, '')
const RESEND_FROM = env.RESEND_FROM || 'FYI <hello@salary-fyi.com>'
const OPS_ID = '1opr9KoR7KRZ31CJDNGM63xbA2rPZjPuNaG6eeLPTXjM'
const SELF_ALLOW = new Set(['likelion vn'])
const VND_PER_USD = 25400

const args = process.argv.slice(2)
const flag = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? (args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true) : d }
const doSend = args.includes('--send')
const testTo = flag('test', null)
const max = parseInt(flag('max', '0')) || 0
const lang = flag('lang', 'vi') === 'ko' ? 'ko' : 'vi'
const TEMPLATE = new URL(`../ktc-topjob-coldmail-${lang}.html`, import.meta.url)
const sleep = (ms) => new Promise(r => setTimeout(r, ms))
const esc = (s) => String(s || '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
const csvCell = (v) => { const s = String(v ?? ''); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s }
const norm = (e) => String(e || '').trim().toLowerCase()
const validEmail = (e) => /^[^@\s]+@[^@\s.]+\.[^@\s]+$/.test(e)

// 호칭(tên) — ktc-sheet-claim-coldmail.mjs 와 동일 휴리스틱
const SURNAMES = new Set(['nguyen', 'nguyễn', 'tran', 'trần', 'le', 'lê', 'pham', 'phạm', 'hoang', 'hoàng', 'huynh', 'huỳnh', 'phan', 'vu', 'vũ', 'vo', 'võ', 'dang', 'đặng', 'bui', 'bùi', 'do', 'đỗ', 'ho', 'hồ', 'ngo', 'ngô', 'duong', 'dương', 'ly', 'lý', 'dinh', 'đinh', 'truong', 'trương', 'mai', 'cao', 'luu', 'lưu', 'ta', 'tạ', 'trinh', 'trịnh', 'lam', 'lâm', 'to', 'tô', 'tong', 'tống', 'trieu', 'triệu'])
const tenOf = (name) => {
  const toks = String(name || '').replace(/\(.*?\)/g, '').trim().split(/\s+/).filter(Boolean)
  if (!toks.length) return 'bạn'
  const isSur = (t) => SURNAMES.has(t.toLowerCase())
  const n = toks.length
  let t
  if (n === 1 || isSur(toks[0])) t = toks[n - 1]
  else if (isSur(toks[n - 1])) t = n >= 3 ? toks[n - 2] : toks[0]
  else if (toks.slice(1, -1).some(isSur)) t = toks[0]
  else t = toks[n - 1]
  return t === t.toUpperCase() ? t[0] + t.slice(1).toLowerCase() : t[0].toUpperCase() + t.slice(1)
}
const looksName = (s) => /^[\p{L}\s'’.-]+$/u.test(s) && s.trim().split(/\s+/).length >= 2 && !/^test\b/i.test(s)

// ── 적합 판정 ──
const yoeOf = (p) => +p.yoe_months || 0
const cityOf = (p) => { const s = String(p.location || '').toLowerCase(); return /h[oồ]\s*ch[ií]|hcm|sài gòn|saigon/.test(s) ? 'HCMC' : /hà nội|ha noi|hanoi/.test(s) ? 'HN' : /đà nẵng|da nang|danang/.test(s) ? 'DN' : s ? 'other' : 'none' }
const CITY_VI = { HCMC: 'TP.HCM', HN: 'Hà Nội', DN: 'Đà Nẵng' }
const CITY_KO = { HCMC: '호찌민', HN: '하노이', DN: '다낭' }
const jobCities = (j) => { const s = String(j.location || '').toLowerCase(); const r = []; if (/h[oồ]\s*ch[ií]|hcm|district/.test(s)) r.push('HCMC'); if (/hà nội|ha noi|hn\b|hanoi/.test(s)) r.push('HN'); if (/đà nẵng|da nang|đn|dn\b/.test(s)) r.push('DN'); if (/korea|hàn quốc/.test(s)) r.push('KR'); return r.length ? r : ['any'] }
const ROLE = { Backend: ['Backend', 'Fullstack'], Fullstack: ['Fullstack', 'Backend', 'Frontend', 'Web'], 'full-stack': ['Fullstack', 'Web'], Development: ['Fullstack', 'Backend'], Web: ['Fullstack', 'Frontend', 'Web'], Frontend: ['Frontend', 'Web', 'Fullstack'], Mobile: ['Mobile', 'Frontend'], QA: ['QA'], 'AI Engineer': ['AI Engineer', 'Data Scientist', 'ML Engineer'], 'ML Engineer': ['AI Engineer', 'Data Scientist', 'ML Engineer'], 'Data Engineer': ['Data Engineer', 'Backend', 'Data Scientist'], Embedded: ['Embedded'], Game: ['Game'], 'Security Engineer': ['Security Engineer', 'DevOps', 'SysAdmin'], SysAdmin: ['SysAdmin', 'DevOps'], DBA: ['DBA', 'Backend'], Marketing: ['Marketing'], Design: ['Design'], Sales: ['Sales', 'Business'], HR: ['HR'], Finance: ['Finance', 'Accounting'], Operations: ['Operations', 'Non-IT'], 'Business Analyst': ['Business Analyst', 'PM'], PM: ['PM', 'Business Analyst'], 'Non-IT': ['Non-IT'], Interpreter: ['Interpreter'], 'Solutions Architect': ['DevOps', 'Backend'] }
const fit = (j, p) => {
  const roles = ROLE[j.role] || [j.role]
  if (!roles.includes(String(p.position || ''))) return false
  if ((+j.experience_min || 0) * 12 > yoeOf(p)) return false
  // 경력 상한(experience_max)이 있으면 +2년까지만 허용 — 9년차를 1~3년 공고에 붙이지 않는다
  if (+j.experience_max > 0 && yoeOf(p) > (+j.experience_max + 2) * 12) return false
  const C = jobCities(j), c = cityOf(p)
  if (C.includes('KR') || C.includes('any') || c === 'none') return true
  return C.includes(c)
}
// 연봉: salary_max 우선(없으면 min). 10만 초과면 VND 월급으로 보고 USD 환산.
const usdOf = (j) => { const v = +j.salary_max || +j.salary_min || 0; if (!v) return 0; return v > 100000 ? Math.round(v / VND_PER_USD) : v }
const fmtInt = (n) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, lang === 'ko' ? ',' : '.')
const salaryOf = (j) => {
  const v = +j.salary_max || +j.salary_min || 0, usd = usdOf(j)
  if (v > 100000) return lang === 'ko' ? `월 ${fmtInt(v)} VND (약 $${fmtInt(usd)})` : `${fmtInt(v)} VND/tháng (≈ $${fmtInt(usd)})`
  return lang === 'ko' ? `월 $${fmtInt(usd)}` : `$${fmtInt(usd)}/tháng`
}
const jobExpOf = (j) => { const n = +j.experience_min || 0; return n >= 1 ? (lang === 'ko' ? `경력 ${n}년 이상` : `Kinh nghiệm từ ${n} năm`) : (lang === 'ko' ? '경력 무관' : 'Không yêu cầu kinh nghiệm') }
const expFragOf = (p) => { const y = Math.floor(yoeOf(p) / 12); return y >= 1 ? (lang === 'ko' ? `경력 ${y}년` : `${y} năm kinh nghiệm`) : (lang === 'ko' ? '경력 1년 미만' : 'dưới 1 năm kinh nghiệm') }
const expShortOf = (p) => { const y = Math.floor(yoeOf(p) / 12); return y >= 1 ? (lang === 'ko' ? `${y}년 경력` : `${y} năm kinh nghiệm`) : (lang === 'ko' ? '신입' : 'người mới') }
const cityFragOf = (p) => { const c = cityOf(p); const m = lang === 'ko' ? CITY_KO : CITY_VI; return m[c] ? `, ${m[c]}` : '' }
// 파싱 position 은 영문 enum(Backend/Non-IT/Web…) — 제목·본문에는 읽히는 직무명으로
const POS_VI = { Backend: 'Backend Developer', Frontend: 'Frontend Developer', Fullstack: 'Full-stack Developer', Web: 'Web Developer', Mobile: 'Mobile Developer', QA: 'QA Engineer', DevOps: 'DevOps', 'AI Engineer': 'AI Engineer', 'Data Scientist': 'Data Scientist', 'Data Engineer': 'Data Engineer', Embedded: 'Embedded Engineer', Game: 'Game Developer', Design: 'Designer', Marketing: 'Marketing', Sales: 'Sales', HR: 'HR', Finance: 'Kế toán / Tài chính', Operations: 'Vận hành', 'Business Analyst': 'Business Analyst', PM: 'Product Manager', 'Non-IT': 'khối văn phòng', Interpreter: 'Phiên dịch' }
const POS_KO = { Backend: '백엔드', Frontend: '프런트엔드', Fullstack: '풀스택', Web: '웹 개발', Mobile: '모바일', QA: 'QA', DevOps: 'DevOps', 'AI Engineer': 'AI 엔지니어', 'Data Scientist': '데이터 사이언티스트', 'Data Engineer': '데이터 엔지니어', Embedded: '임베디드', Game: '게임 개발', Design: '디자인', Marketing: '마케팅', Sales: '영업', HR: '인사', Finance: '회계·재무', Operations: '운영', 'Business Analyst': 'BA', PM: 'PM', 'Non-IT': '사무직', Interpreter: '통번역' }
const posLabel = (p) => (lang === 'ko' ? POS_KO : POS_VI)[p.position] || p.position

// ── 양식 ──
const template = readFileSync(TEMPLATE, 'utf8')
const subject = (l) => lang === 'ko'
  ? `${l.ten}님, ${expShortOf(l.p)} ${posLabel(l.p)} 중 지금 가장 높은 월 $${fmtInt(l.usd)} 공고를 골라두었습니다`
  : `${l.ten} ơi, vị trí ${posLabel(l.p)} lương cao nhất cho ${expShortOf(l.p)} hiện nay: $${fmtInt(l.usd)}/tháng`
const render = (l, cta, unsub) => template
  .replace(/\{\{name\}\}/g, esc(l.ten))
  .replace(/\{\{position\}\}/g, esc(posLabel(l.p)))
  .replace(/\{\{expFrag\}\}/g, esc(expFragOf(l.p)))
  .replace(/\{\{cityFrag\}\}/g, esc(cityFragOf(l.p)))
  .replace(/\{\{company\}\}/g, esc(l.j.company))
  .replace(/\{\{jobTitle\}\}/g, esc(l.j.title))
  .replace(/\{\{salary\}\}/g, esc(salaryOf(l.j)))
  .replace(/\{\{jobLocation\}\}/g, esc(l.j.location))
  .replace(/\{\{jobExp\}\}/g, esc(jobExpOf(l.j)))
  .replace(/\{\{ctaUrl\}\}/g, cta)
  .replace(/\{\{unsubscribeUrl\}\}/g, unsub)
const text = (l, cta, unsub) => lang === 'ko' ? `${l.ten}님, 안녕하세요. FYI입니다.

K-Tech College 지원 때 남겨주신 이력서를 기준으로, 지금 열려 있는 한국 기업 공고 중 회원님의 경력(${posLabel(l.p)}, ${expFragOf(l.p)}${cityFragOf(l.p)})에서 가장 높은 연봉 공고 하나를 골랐습니다.

${l.j.company}
${l.j.title}
${salaryOf(l.j)} · ${l.j.location} · ${jobExpOf(l.j)}

이 공고는 FYI가 채용을 직접 진행합니다. 회원님이 FYI에 가입하고 이 공고에 지원하면, 저희가 지원서를 먼저 검토해서 기업 담당자에게 직접 전달합니다. 공고 페이지에서 기다리는 것이 아니라 저희가 밀어드리는 방식입니다.

이력서는 이미 준비되어 있습니다. 지원 때 제출하신 CV가 프로필에 올라가 있어서, 구글 계정으로 가입만 하면 바로 지원할 수 있습니다.

구글 계정으로 가입하고 지원하기:
${cta}

FYI 드림 · salary-fyi.com
수신 거부: ${unsub}` : `Chào ${l.ten}, FYI đây.

Dựa trên CV bạn đã nộp khi ứng tuyển qua K-Tech College, trong số các vị trí đang mở tại doanh nghiệp Hàn Quốc, chúng tôi đã chọn ra một vị trí có mức lương cao nhất phù hợp với kinh nghiệm của bạn (${posLabel(l.p)}, ${expFragOf(l.p)}${cityFragOf(l.p)}).

${l.j.company}
${l.j.title}
${salaryOf(l.j)} · ${l.j.location} · ${jobExpOf(l.j)}

Vị trí này do FYI trực tiếp phụ trách tuyển dụng. Khi bạn đăng ký FYI và ứng tuyển, chúng tôi sẽ xem xét hồ sơ của bạn trước và chuyển thẳng đến người phụ trách tuyển dụng của doanh nghiệp — không phải chờ trên trang tuyển dụng, mà là chúng tôi chủ động đẩy hồ sơ của bạn.

Hồ sơ của bạn đã sẵn sàng. CV bạn nộp trước đây đã được đưa lên hồ sơ FYI, chỉ cần đăng ký bằng tài khoản Google là có thể ứng tuyển ngay.

Đăng ký bằng Google và ứng tuyển:
${cta}

Đội ngũ FYI · salary-fyi.com
Hủy đăng ký: ${unsub}`

const ctaFor = (l) => `${SITE}/api/ktc/r?t=${encodeURIComponent(makeToken(l.email, CAMPAIGN))}&to=${encodeURIComponent(`/api/auth/google?return=${encodeURIComponent(`/jobs/${l.j.id}`)}&login_hint=${encodeURIComponent(l.email)}`)}`
const unsubFor = (l) => `${SITE}/api/ktc/unsub?t=${encodeURIComponent(makeToken(l.email, CAMPAIGN))}`

// ── Ops Matching Status '진행중' (코드 F/H + 회사명) ──
const normCo = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').normalize('NFC')
  .replace(/주식회사|\(주\)|co\.?,?\s*ltd\.?|company|corp\.?|vietnam|việt nam|vina|\.|\s+/g, '').trim()
async function liveFromOps() {
  const auth = new google.auth.GoogleAuth({
    credentials: { client_email: env.GOOGLE_SERVICE_ACCOUNT_EMAIL, private_key: (env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n') },
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  })
  const sheets = google.sheets({ version: 'v4', auth })
  const r = await sheets.spreadsheets.values.get({ spreadsheetId: OPS_ID, range: "'Matching Status'!A14:BB" })
  const col = (row, l) => { let n = 0; for (const ch of l) n = n * 26 + (ch.charCodeAt(0) - 64); return String(row[n - 1] || '').trim() }
  const codes = new Set(), companies = new Set()
  for (const row of r.data.values || []) {
    if (col(row, 'A') !== '진행중' || !col(row, 'F') || col(row, 'F') === '테스트') continue
    codes.add(col(row, 'F').toUpperCase()); if (col(row, 'H')) codes.add(col(row, 'H').toUpperCase())
    if (col(row, 'I')) companies.add(normCo(col(row, 'I')))
  }
  return { codes, companies }
}

;(async () => {
  if (testTo) {
    const { Resend } = await import('resend'); const resend = new Resend(env.RESEND_API_KEY)
    const l = { email: testTo, ten: 'Minh', p: { position: 'Backend', yoe_months: 30, location: 'Ho Chi Minh City' }, usd: 1378,
      j: { id: 'test', company: 'Global Beauty Star', title: 'Senior Backend Developer (Python / Node.js)', salary_max: 35000000, location: 'HCM', experience_min: 2 } }
    const cta = ctaFor(l), unsub = unsubFor(l)
    const r = await resend.emails.send({ from: RESEND_FROM, to: testTo, subject: `[TEST/${lang}] ` + subject(l), text: text(l, cta, unsub), html: render(l, cta, unsub) })
    if (r.error) throw new Error(r.error.message)
    console.log(`✅ 테스트 발송 → ${testTo} | id=${r.data?.id}\n제목: ${subject(l)}\nCTA: ${cta}`)
    return
  }

  // ── 풀: 옛 KTC 캠페인 수신 리드 중 미가입 ──
  const evts = await fetchAll(() => sb.from('events').select('event, campaign:meta->>campaign, lead:meta->>lead').in('event', ['coldmail_public_sent', 'coldmail_public_convert', 'coldmail_unsub']))
  const isOld = (c) => /^coldmail-ktc/.test(c || '') && !/sheet|vku|topjob/.test(c)
  const oldLeads = new Set(evts.filter(e => e.event === 'coldmail_public_sent' && isOld(e.campaign) && e.lead).map(e => e.lead))
  const already = new Set(evts.filter(e => e.event === 'coldmail_public_sent' && e.campaign === CAMPAIGN && e.lead).map(e => e.lead))
  const converted = new Set(evts.filter(e => e.event === 'coldmail_public_convert' && e.lead).map(e => e.lead))
  const unsub = new Set(evts.filter(e => e.event === 'coldmail_unsub' && e.lead).map(e => e.lead))
  const profs = await fetchAll(() => sb.from('user_profiles').select('email').not('email', 'is', null))
  const members = new Set(profs.map(p => leadId(norm(p.email))))
  const bl = await fetchBlacklist()
  const claims = await fetchAll(() => sb.from('ktc_claim_profiles').select('email, summary, cv_url').order('email'))
  const byLead = {}; for (const c of claims) byLead[leadId(norm(c.email))] = c

  const n0 = oldLeads.size
  let leads = [...oldLeads].filter(l => !converted.has(l) && !members.has(l))
  const nMember = n0 - leads.length
  const nUnsub = leads.filter(l => unsub.has(l)).length; leads = leads.filter(l => !unsub.has(l))
  const nAlready = leads.filter(l => already.has(l)).length; leads = leads.filter(l => !already.has(l))
  let rows = leads.map(l => byLead[l]).filter(c => c && validEmail(norm(c.email)) && !bl.has({ email: c.email }))
  const nNoProf = leads.length - rows.length
  rows = rows.map(c => { const p = c.summary || {}; const name = looksName(String(p.full_name || '')) ? p.full_name : ''; return { email: norm(c.email), lead: leadId(norm(c.email)), name, ten: tenOf(name), p, cvUrl: c.cv_url } })
  const nNoName = rows.filter(r => !r.name || !r.p.position).length
  rows = rows.filter(r => r.name && r.p.position)
  console.log(`캠페인: ${CAMPAIGN}`)
  console.log(`옛 캠페인 수신 ${n0} | 제외: 가입 ${nMember} · 수신거부 ${nUnsub} · 이 캠페인 기발송 ${nAlready} · 파싱본 없음/블랙 ${nNoProf} · 이름/직무 없음 ${nNoName} → ${rows.length}명`)

  // ── 공고: 연봉 있는 비크롤 활성 공고 중 Ops 진행중 ──
  const jobsAll = await fetchAll(() => sb.from('jobs').select('id, source_id, company, title, role, location, experience_min, experience_max, salary_min, salary_max, source, deadline, close_date, created_at').eq('is_active', true).neq('source', 'vietnamworks').order('created_at'))
  const today = new Date().toISOString().slice(0, 10)
  const live = await liveFromOps()
  const isLive = (j) => (j.source_id && live.codes.has(String(j.source_id).toUpperCase())) || live.companies.has(normCo(j.company)) || SELF_ALLOW.has(norm(j.company))
  const jobs = jobsAll.filter(j => usdOf(j) > 0)
    .filter(j => !(j.deadline && j.deadline < today) && !(j.close_date && j.close_date < today))
    .filter(j => j.source !== 'company_self' || SELF_ALLOW.has(norm(j.company)))
    .filter(isLive)
  console.log(`공고: 비크롤 활성 ${jobsAll.length} → 연봉 있음·미마감·자체공고 제외 후 Ops 진행중 통과 ${jobs.length}건 (Ops 진행중 코드 ${live.codes.size})`)

  // ── 배정: 적합 중 연봉 최고 ──
  const assigned = [], none = {}
  for (const r of rows) {
    const fits = jobs.filter(j => fit(j, r.p)).sort((a, b) => usdOf(b) - usdOf(a) || (a.created_at < b.created_at ? 1 : -1))
    if (!fits.length) { const k = `${r.p.position} · ${expShortOf(r.p)} · ${cityOf(r.p)}`; none[k] = (none[k] || 0) + 1; continue }
    assigned.push({ ...r, j: fits[0], usd: usdOf(fits[0]) })
  }
  console.log(`배정 ${assigned.length} / 맞는 공고 없음 ${rows.length - assigned.length}`)
  const byJob = {}; for (const a of assigned) { const k = `$${a.usd} ${a.j.source_id || '-'} ${a.j.company} · ${a.j.title.slice(0, 40)}`; byJob[k] = (byJob[k] || 0) + 1 }
  console.log('공고별 배정:'); for (const [k, v] of Object.entries(byJob).sort((a, b) => b[1] - a[1])) console.log(`  ${String(v).padStart(4)}  ${k}`)
  console.log('미배정 상위:', JSON.stringify(Object.entries(none).sort((a, b) => b[1] - a[1]).slice(0, 8)))

  const capped = max ? assigned.slice(0, max) : assigned
  if (!capped.length) { console.log('보낼 대상 없음.'); return }
  const mxOk = new Map()
  await Promise.all([...new Set(capped.map(l => l.email.split('@')[1]))].map(async d => { try { mxOk.set(d, (await resolveMx(d)).length > 0) } catch { mxOk.set(d, false) } }))
  const queue = capped.filter(l => mxOk.get(l.email.split('@')[1]))
  if (queue.length < capped.length) console.log(`MX 없음 제외 ${capped.length - queue.length}`)

  const s = queue[0]
  console.log(`\n이번 발송 ${queue.length}명 | 샘플: ${s.email} / ${s.ten} / ${s.p.position} ${expFragOf(s.p)}${cityFragOf(s.p)} → ${s.j.company} · ${s.j.title} · ${salaryOf(s.j)}`)
  console.log(`제목: ${subject(s)}\nCTA: ${ctaFor(s)}`)
  if (!doSend) {
    const step = Math.max(1, Math.floor(queue.length / 12))
    for (const l of queue.filter((_, i) => i % step === 0).slice(0, 12)) console.log(`  · ${l.name} → ${l.ten} | ${l.p.position} · ${expShortOf(l.p)} · ${cityOf(l.p)} → ${l.j.source_id || '-'} ${l.j.company} $${l.usd}`)
    console.log('\n[dry-run] --send 로 실발송.'); return
  }
  if (lang !== 'vi') throw new Error('실발송은 vi 고정 — --lang ko 는 --test 전용')

  const { Resend } = await import('resend'); const resend = new Resend(env.RESEND_API_KEY)
  const log = [['email', 'ten', 'position', 'yoe_months', 'job_code', 'company', 'job_title', 'usd', 'lead', 'resend_id', 'error'].join(',')]
  let ok = 0, fail = 0
  for (const l of queue) {
    const cta = ctaFor(l), unsub = unsubFor(l)
    try {
      const resp = await resend.emails.send({
        from: RESEND_FROM, to: l.email, subject: subject(l), text: text(l, cta, unsub), html: render(l, cta, unsub),
        headers: { 'List-Unsubscribe': `<${unsub}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
      })
      if (resp.error) throw new Error(resp.error.message || 'resend_error')
      // PII 는 events 에 안 남긴다. cv_url 은 가입 콜백 CV 임포트 소스. job_id/job_code 는 지원 귀속 조인용.
      await sb.from('events').insert([{ event: 'coldmail_public_sent', page: '/campaign/ktc',
        meta: { campaign: CAMPAIGN, lead: l.lead, lang: 'vi', cv_url: l.cvUrl, job_id: l.j.id, job_code: l.j.source_id || null, resend_id: resp.data?.id || null } }])
      log.push([l.email, l.ten, l.p.position, l.p.yoe_months, l.j.source_id, l.j.company, l.j.title, l.usd, l.lead, resp.data?.id || '', ''].map(csvCell).join(',')); ok++
    } catch (e) { fail++; log.push([l.email, l.ten, l.p.position, l.p.yoe_months, l.j.source_id, l.j.company, l.j.title, l.usd, l.lead, '', e.message].map(csvCell).join(',')); console.error(`  ✗ ${l.email}: ${e.message}`) }
    await sleep(150)
  }
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  writeFileSync(new URL(`../../data/ktc-topjob-sent-${stamp}.csv`, import.meta.url), log.join('\n'))
  console.log(`\n✅ 발송 완료: 성공 ${ok} / 실패 ${fail} | 로그: data/ktc-topjob-sent-${stamp}.csv`)
})().catch(e => { console.error(e); process.exit(1) })
