// BECUAI VIETNAM(V190) HR Operation recommend 2차 — 9/23 JD 개정(TOPIK 불요, 한국어 4기술·회화) 반영 추가 발송.
// 1차(9/22, becuai0922-hr): TOPIK 4+ 컷 hcm 35 + remote 35 = 70. 개정 JD 는 "한국어 tốt 4 kỹ năng, giao tiếp được (không yêu cầu TOPIK)"
//   → 유저 판단 "TOPIK 3급 수준 이상"으로 컷 완화. 9/23 실측 39: A cert TOPIK3/중급 11 · B cert 등급불명 표기 6(Novice·Sejong 1B 제외)
//   · C cert 없음 × 한국어 전공/통번역 직군 13 · D 1차에서 7일 게이트로 빠진 TOPIK4+ 9(게이트 미적용 방침).
//   초급 cert(TOPIK 1-2/Basic/Beginner) 22 와 cert 없이 텍스트만 걸린 4(한식당·유학원 오탐)는 제외.
// JD 개정 요지: 면접 한·베, 채용·C&B·급여·PIT·사회보험·교육·행정은 외부 서비스가 처리 → 진도 관리·보고 위주, 기본 회계·자금,
//   비품 구매, VAT 발행, 이사 지원, 한국인 관리자와 소통. 차분·독립 근무 성향. Excel·AI 도구. 월~금 09-18. 급여 협의 + 한국어 수당.
// 표준: 1인1통 · 동일인 2계정 1통 · V190 기수신·BECUAI 지원자 제외 · 블랙리스트 제외 · 당일 겹침 제외 · 공개/비공개 프레임.
//
//   node scripts/outreach/becuai0923-hr-recommend-coldmail.mjs                       # dry-run
//   node scripts/outreach/becuai0923-hr-recommend-coldmail.mjs --send [--group hcm|remote] [--max N] [--gap-hours N]
import { Resend } from 'resend'
import { sb, env, fetchAll, fetchBlacklist } from './lib.mjs'
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
const nameKey = (n) => String(n || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd').toLowerCase().replace(/\s+/g, ' ').trim()
const firstName = (n) => String(n || '').trim().split(/\s+/).slice(-1)[0] || 'bạn'
const strip = (s) => String(s).replace(/<[^>]+>/g, '')

const JOB_ID = '3b4b84a3-e0aa-4d2b-bc20-e9f86f4c4e17' // BECUAI HR Operation (V190, Q3 HCM)
const BECUAI_JOBS = [JOB_ID, 'c958edd2-5ca5-4600-af20-61d2080ff343', '750069bb-878d-4065-8859-71668d36076c'] // V190 · V189 · V22 — 지원자 제외용
const ROLE_VI = 'Nhân viên bộ phận Operation (tiếng Hàn)'

// ── 대상 선정 — 한국어 인증 TOPIK 4+ × ≤10y, hcm(명시+빈값) 우선 → remote(타지역) ──
// HCMC 게이트: A=명시(+가점) / B=빈값(허용) / X=타지역(제외) — ktc0914 + 한글 표기(호찌민·호치민) 추가
const hcmBucket = (loc) => {
  const s = String(loc || '').toLowerCase().trim()
  if (!s) return 'B'
  return /(hồ chí minh|ho chi minh|hochiminh|hcmc|\bhcm\b|tp\.?hcm|sài gòn|saigon|thủ đức|thu duc|bình thạnh|binh thanh|호찌민|호치민|胡志明)/.test(s) ? 'A' : 'X'
}
const cert = (p) => String(p.korean_cert || '')
// 'Pre-Intermediate' 는 intermediate 에 오탐되므로 선제 컷
const noPre = (p) => !/pre-?\s*intermediate/i.test(cert(p))
const cert4 = (p) => noPre(p) && /(topik\s*(ii\s*)?(-\s*)?(level\s*)?[4-6]|advanced|cao cấp|고급|native|business|fluent)/i.test(cert(p))
const cert3 = (p) => noPre(p) && /(topik\s*(ii\s*)?(-\s*)?(level\s*)?(cấp\s*)?3|intermediate|trung cấp|중급)/i.test(cert(p))
const certLow = (p) => /(topik\s*(i\s*)?(level\s*)?[12]\b|beginner|sơ cấp|초급|basic|cơ bản|pre-?\s*intermediate|novice|sejong\s*1|none|\bno\b)/i.test(cert(p))
const certOther = (p) => !!cert(p).trim() && !cert4(p) && !cert3(p) && !certLow(p)   // "Tiếng Hàn", "3", "level 4 tương đương" 등 등급 불명 표기
const krMajor = (p) => /(hàn quốc học|ngôn ngữ hàn|korean (studies|language)|한국어|한국학|tiếng hàn)/i.test(`${p.major || ''} ${p.university || ''}`)
const krRole = (p) => /(interpreter|phiên dịch|thông dịch|biên dịch|translator)/i.test(`${p.position || ''} ${(p.desired_roles || []).join(' ')}`)
// TOPIK 3급 수준 이상 근거: cert 4+ | cert 3/중급 | 등급불명 표기 | cert 없음 × 한국어 전공·통번역 직군
const certOk = (p) => cert4(p) || cert3(p) || certOther(p) || (!cert(p).trim() && (krMajor(p) || krRole(p)))
const certHi = (p) => /(topik\s*(ii\s*)?(-\s*)?(level\s*)?[56]|advanced|cao cấp|고급|native|fluent)/i.test(cert(p))
const y = (p) => p.yoe_months ?? 0
// HR/사무 시그널 가점 — JD 직무 정합
const hrSig = (p) => /(\bhr\b|nhân sự|human resource|hành chính|admin|general affairs|tổng vụ|c&b|payroll|kế toán|accounting|office)/i.test(String(p.position || '') + ' ' + JSON.stringify(p.skills || '') + ' ' + String(p.resume_summary || ''))
// 신입 포지션 ↔ 10y 초과 미스매치 컷(나이 20~35 대체). 가점: HR/사무 > 신입~3y > HCM 명시 > 상급 인증
const score = (p) => (hrSig(p) ? 2 : 0) + (y(p) <= 36 ? 2 : 0) + (hcmBucket(p.location) === 'A' ? 1 : 0) + (certHi(p) ? 1 : 0)
const base = (p) => certOk(p) && y(p) <= 120
const GROUPS = [
  { gkey: 'hcm', camp: 'becuai0923-hr-hcm', label: 'A. HCM(명시+빈값) × 한국어 TOPIK3급 수준+ × ≤10y', pick: (p) => (base(p) && hcmBucket(p.location) !== 'X' ? score(p) : null) },
  { gkey: 'remote', camp: 'becuai0923-hr-remote', label: 'D. 타지역 × 한국어 TOPIK3급 수준+ × ≤10y (온사이트 Q3 는 카피로 자기선별)', pick: (p) => (base(p) && hcmBucket(p.location) === 'X' ? score(p) : null) },
]

// ── 카피(vi 실발송) — 개정 JD: TOPIK 불요·한국어 4기술·한베 면접·독립 근무·Q3 onsite·월~금 09-18·급여 협의+한국어 수당 ──
const COMPANY = 'BECUAI VIETNAM'
const INITIAL = 'B'
const META_VI = 'Onsite · Q.3 (P. Bàn Cờ), TP.HCM · T2–T6 09:00–18:00 · Lương thỏa thuận + phụ cấp tiếng Hàn'
const INTRO = '<b>BECUAI VIETNAM</b> đang tuyển <b>Nhân viên bộ phận Operation</b> (HR Operation) qua FYI — <b>không yêu cầu kinh nghiệm</b>, phỏng vấn bằng tiếng Hàn và tiếng Việt. Công việc: theo dõi tiến độ &amp; báo cáo các mảng Recruitment, C&amp;B, Payroll, PIT, BHXH, Training và hành chính (công ty dùng dịch vụ riêng xử lý nghiệp vụ, nên chủ yếu là theo dõi &amp; báo cáo); nghiệp vụ kế toán cơ bản &amp; quản lý quỹ/thu chi; mua sắm trang thiết bị, văn phòng phẩm; xuất hóa đơn VAT; hỗ trợ Giám đốc (việc đơn giản); trao đổi với quản lý người Hàn. Yêu cầu: tốt nghiệp đại học, <b>tiếng Hàn tốt 4 kỹ năng, giao tiếp được (không yêu cầu TOPIK)</b>, tính cách trầm tĩnh, điềm đạm, cẩn thận, làm việc độc lập và báo cáo rõ ràng (vị trí ưu tiên người có thể làm việc độc lập), thành thạo Excel &amp; biết dùng công cụ AI. Làm việc <b>Thứ 2–Thứ 6, 09:00–18:00</b> tại Quận 3 (P. Bàn Cờ). <b>Lương thỏa thuận khi phỏng vấn</b>, thử việc 2 tháng 85%, sau thử việc đóng BHXH/BHYT/BHTN trên 100% lương, <b>phụ cấp theo năng lực tiếng Hàn</b>.'
const SUBJECT = {
  public: (role) => `[FYI] Bạn được chọn vào danh sách đề cử gửi ${COMPANY} — ${role}`,
  private: (role) => `[FYI] Bạn được chọn vào danh sách đề cử — ${role} tại ${COMPANY}`,
}
const HOOK = 'Đội ngũ FYI đã xem xét toàn bộ hồ sơ đã đăng ký và <b>chọn bạn vào danh sách đề cử</b> cho vị trí dưới đây — hồ sơ của bạn (trình độ tiếng Hàn) phù hợp với yêu cầu của vị trí này.'
const BENEFIT = {
  public: `<b>Trong tuần này</b>, FYI sẽ gửi danh sách đề cử trực tiếp cho người phụ trách tuyển dụng của ${COMPANY}. Hồ sơ của bạn đang ở chế độ công khai nên sẽ được gửi kèm danh sách. Nếu bạn ứng tuyển ngay, CV của bạn sẽ được <b>ưu tiên xem xét</b> cùng lời giới thiệu từ FYI.`,
  private: `<b>Trong tuần này</b>, FYI sẽ gửi danh sách đề cử trực tiếp cho người phụ trách tuyển dụng của ${COMPANY}. Hồ sơ của bạn đang ở chế độ riêng tư — nếu bạn ứng tuyển ngay, CV của bạn sẽ được gửi kèm lời giới thiệu từ FYI và được <b>ưu tiên xem xét</b>.`,
}
const ONETAP = 'Chỉ cần <b>1 chạm</b> — CV đã đăng ký của bạn sẽ được gửi tự động.'

function jobCard(job) {
  const logo = job.logo_url
    ? `<img src="${esc(job.logo_url)}" width="44" height="44" alt="" style="width:44px;height:44px;border-radius:10px;object-fit:cover;background:#f0ebe3;display:block">`
    : `<div style="width:44px;height:44px;border-radius:10px;background:#fff0e6;color:#ff6000;font-weight:800;font-size:16px;text-align:center;line-height:44px">${INITIAL}</div>`
  return `<table width="100%" cellpadding="0" cellspacing="0" style="background:#fff;border:1px solid #eee5da;border-radius:14px;margin-bottom:8px"><tr>
    <td width="44" style="padding:14px 0 14px 14px;vertical-align:middle">${logo}</td>
    <td style="padding:14px 14px 14px 12px;vertical-align:middle">
      <div style="font-size:12px;color:#8a8073;margin-bottom:3px">${esc(COMPANY)}</div>
      <div style="font-size:14.5px;font-weight:700;color:#1a1612;line-height:1.35">${esc(job.title.trim())}</div>
      <div style="font-size:12px;color:#b0691a;margin-top:3px">${esc(META_VI)}</div>
    </td>
  </tr></table>`
}

function emailHtml(name, url, unsubUrl, job, frame) {
  return `<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;background:#faf9f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1a1612">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#faf9f7"><tr><td align="center" style="padding:28px 16px">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px">
  <tr><td style="padding-bottom:18px"><img src="https://salary-fyi.com/fyi-logo.png" height="24" alt="FYI" style="height:24px;width:auto;display:block"></td></tr>
  <tr><td style="font-size:15px;line-height:1.6;color:#1a1612;padding-bottom:6px">Chào ${esc(firstName(name))},</td></tr>
  <tr><td style="font-size:14px;line-height:1.65;color:#4a443c;padding-bottom:14px">${INTRO}</td></tr>
  <tr><td style="font-size:14px;line-height:1.65;color:#4a443c;padding-bottom:14px">${HOOK}</td></tr>
  <tr><td style="padding-bottom:10px">${jobCard(job)}</td></tr>
  <tr><td style="font-size:14px;line-height:1.65;color:#4a443c;padding-top:4px">${BENEFIT[frame]} ${ONETAP}</td></tr>
  <tr><td align="center" style="padding:16px 0 6px">
    <a href="${url}" style="display:inline-block;background:#ff6000;color:#fff;font-weight:700;font-size:15px;text-decoration:none;padding:14px 30px;border-radius:12px">Ứng tuyển 1 chạm →</a>
  </td></tr>
  <tr><td align="center" style="font-size:12.5px;padding-bottom:4px"><a href="${SITE}/ktc/jobs/${JOB_ID}" style="color:#8a8073">Xem mô tả công việc đầy đủ →</a></td></tr>
  <tr><td style="font-size:11.5px;color:#a89f92;text-align:center;line-height:1.5;padding-top:20px">
    Bạn nhận được email này vì đã đăng ký hồ sơ trên FYI.<br>— Đội ngũ FYI · <a href="https://salary-fyi.com/jobs" style="color:#a89f92">salary-fyi.com/jobs</a>
    &nbsp;·&nbsp;<a href="${unsubUrl}" style="color:#a89f92;text-decoration:underline">Hủy đăng ký</a>
  </td></tr>
</table></td></tr></table></body></html>`
}

function emailText(name, url, unsubUrl, job, frame) {
  return `Chào ${firstName(name)},

${strip(INTRO)}

${strip(HOOK)}

- ${job.title.trim()} (${COMPANY}) — ${META_VI} — ${SITE}/ktc/jobs/${JOB_ID}

${strip(BENEFIT[frame])} ${strip(ONETAP)}

${url}

Bạn nhận được email này vì đã đăng ký hồ sơ trên FYI.
— Đội ngũ FYI · salary-fyi.com/jobs
Hủy đăng ký: ${unsubUrl}`
}

async function main() {
  const { data: job, error: jobErr } = await sb.from('jobs')
    .select('id,title,company,location,logo_url,is_active').eq('id', JOB_ID).single()
  if (jobErr || !job || !job.is_active) { console.error('공고 없음/비활성:', jobErr?.message || JOB_ID); process.exit(1) }

  const resend = new Resend(env.RESEND_API_KEY)
  const url = (userId, camp) => `${SITE}/api/resume/recommend?t=${makeToken(userId, camp)}&j=${JOB_ID}`
  const unsubFor = (userId, camp) => `${SITE}/api/coldmail/unsub?t=${makeToken(userId, camp)}`

  const weekAgoIso = new Date(Date.now() - 7 * 864e5).toISOString()
  const [pool, unsubs, recs, apps, todays, recent, bl] = await Promise.all([
    fetchAll(() => sb.from('user_profiles')
      .select('id,email,full_name,position,desired_roles,yoe_months,location,korean_cert,is_resume_public,skills,resume_summary,university,major')
      .not('email', 'is', null).not('resume_url', 'is', null).order('created_at', { ascending: false })),
    fetchAll(() => sb.from('events').select('user_id').eq('event', 'coldmail_unsub').not('user_id', 'is', null).order('id')),
    fetchAll(() => sb.from('job_recommendations').select('user_id').eq('job_id', JOB_ID).order('id')),
    fetchAll(() => sb.from('job_applications').select('user_id').in('job_id', BECUAI_JOBS).order('id')),
    fetchAll(() => sb.from('job_recommendations').select('user_id,to_email').gte('created_at', sinceIso).order('id')),
    fetchAll(() => sb.from('job_recommendations').select('user_id').gte('created_at', weekAgoIso).order('id')),
    fetchBlacklist(),
  ])
  const unsubSet = new Set(unsubs.map((r) => r.user_id))
  const recSet = new Set(recs.map((r) => r.user_id))
  const appliedSet = new Set(apps.map((a) => a.user_id))
  const todayUsers = new Set(todays.map((r) => r.user_id))
  const todayEmails = new Set(todays.map((r) => (r.to_email || '').toLowerCase()).filter(Boolean))
  const cnt7 = {}
  for (const r of recent) cnt7[r.user_id] = (cnt7[r.user_id] || 0) + 1

  const seen = new Set()
  const assigned = []
  let skipApplied = 0, skipRec = 0, skipToday = 0
  for (const p of pool) {
    if (!p.email || /likelion/i.test(p.email)) continue
    const e = p.email.toLowerCase()
    if (seen.has(e) || unsubSet.has(p.id) || bl.has(p)) continue
    const g = GROUPS.find((g) => g.pick(p) != null)
    if (!g) continue
    seen.add(e)
    if (appliedSet.has(p.id)) { skipApplied++; continue }
    if (recSet.has(p.id)) { skipRec++; continue }
    if (todayUsers.has(p.id) || todayEmails.has(e)) { skipToday++; continue }
    assigned.push({ p, s: g.pick(p), g, frame: p.is_resume_public ? 'public' : 'private' })
  }
  // hcm 먼저 → remote. 그룹 내 점수순. 동일인 2계정(이메일만 다름)은 이름 정규화 키로 1통, 동점이면 공개 프로필 우선
  const gi = (x) => GROUPS.indexOf(x.g)
  assigned.sort((a, b) => gi(a) - gi(b) || b.s - a.s || (b.frame === 'public') - (a.frame === 'public'))
  const names = new Set()
  const deduped = assigned.filter(({ p }) => { const k = nameKey(p.full_name); if (names.has(k)) return false; names.add(k); return true })
  const skipDup = assigned.length - deduped.length
  assigned.splice(0, assigned.length, ...deduped)

  console.log('발송 대상(1인 1통):')
  for (const g of GROUPS) {
    const rows = assigned.filter((x) => x.g === g), pub = rows.filter((x) => x.frame === 'public').length
    console.log(`  ${g.gkey} (${g.label}): ${rows.length}명 (공개 ${pub} / 비공개 ${rows.length - pub})`)
  }
  console.log(`  ── 합계 ${assigned.length}명 (제외: BECUAI 지원완료 ${skipApplied} · V190 기수신 ${skipRec} · 당일 겹침 ${skipToday} · 동일인 2계정 ${skipDup})`)
  if (!doSend) {
    for (const { p, s, g, frame } of assigned)
      console.log(`  [${g.gkey}·${s}·${frame}] ${p.full_name} <${p.email}> · ${p.position || '?'} · ${Math.round((p.yoe_months || 0) / 12 * 10) / 10}y · ${String(p.location || '위치?').slice(0, 30)} · ${p.korean_cert}`)
    console.log('\n(dry-run — 실발송하려면 --send)')
    return
  }

  let targets = assigned
  if (onlyGroup) targets = targets.filter((x) => x.g.gkey === onlyGroup)
  if (maxN) targets = targets.slice(0, maxN)
  let ok = 0, fail = 0
  for (const { p, g, frame } of targets) {
    const camp = `${g.camp}-${frame}`
    const u = url(p.id, camp), un = unsubFor(p.id, camp)
    const { error } = await resend.emails.send({
      from: RESEND_FROM, to: p.email, subject: SUBJECT[frame](ROLE_VI),
      html: emailHtml(p.full_name, u, un, job, frame), text: emailText(p.full_name, u, un, job, frame),
      headers: { 'List-Unsubscribe': `<${un}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
    })
    if (error) { console.error(`실패 ${p.email}:`, error.message || error); fail++; continue }
    await sb.from('job_recommendations').upsert([{
      user_id: p.id, to_email: p.email, job_id: JOB_ID,
      job_title: job.title, job_company: job.company, sent_by: 'coldmail', kind: 'recommend', status: 'sent',
    }], { onConflict: 'user_id,job_id', ignoreDuplicates: true })
    await sb.from('events').insert([{
      event: 'recommend_sent', page: '/scripts/becuai0923-hr-recommend-coldmail',
      meta: { campaign: camp, job_ids: [JOB_ID], frame, group: g.gkey }, user_id: p.id,
    }])
    ok++
    if (ok % 25 === 0) console.log(`  …${ok}/${targets.length}`)
    await sleep(400)
  }
  console.log(`\n✅ 발송 완료: ${ok}/${targets.length} (실패 ${fail})`)
}

main().catch((e) => { console.error(e); process.exit(1) })