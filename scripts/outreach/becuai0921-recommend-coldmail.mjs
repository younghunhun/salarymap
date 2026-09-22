// BECUAI VIETNAM(V189) Nhân viên Xử lý Dữ liệu (Data Labels) recommend — 9/21 FYI 재등록 당일 발송.
// JD: AI용 한국 뉴스 데이터 입력·저장·관리(교육 제공, 무경력 가능) · 대졸 · 한국어 독해/회화(최소 TOPIK 3-4) · 한국어 면접 + 타이핑 테스트.
//     Q3(P. Bàn Cờ) onsite · 15:00~00:00 야간(수당) · 일~금 · gross 12M(수습 2개월 85%) · 기숙사 도보 3분 · 인턴 확인 도장 지원.
// 동일 포지션 V22 를 9/14 ktc0914(becuai-recommend1-data)로 29명 발송 → V22 지원 18건. 이번은 "신규만": V22 기수신·V22 지원자 전원 제외.
// 9/21 실측: HCM(명시+빈값) × korean_cert TOPIK3+/중급 이상 → 발송가능 47 (신규 30 / V22 기수신 17). 유저 결정 "신규 발송".
//   cert 는 등급 판별(9/14 컷은 Basic·Beginner·TOPIK1·None 까지 통과시켰음 — JD 최소 TOPIK 3-4 와 불일치).
//   경력 ≤10y(12M 밴드 미스매치 컷) — 신입 포지션이나 12M·야간·주6일을 카피에 명시해 자기선별.
//   dry-run 보정: Pre-Intermediate 오탐 1 · 10y 초과 2 · 동일인 2계정 2 제외 → 실발송 25.
// 신선도 하드게이트(최근 7일 recommend 3통+ 제외) · 1인1통 · unsub 전역 제외 · 공개/비공개 프레임.
//
//   node scripts/outreach/becuai0921-recommend-coldmail.mjs                       # dry-run
//   node scripts/outreach/becuai0921-recommend-coldmail.mjs --send [--max N] [--gap-hours N]
import { Resend } from 'resend'
import { sb, env, fetchAll } from './lib.mjs'
import { makeToken } from '../../lib/campaignToken.js'

const args = process.argv.slice(2)
const flag = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? (args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true) : d }
const doSend = args.includes('--send')
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

const JOB_ID = 'c958edd2-5ca5-4600-af20-61d2080ff343' // BECUAI Data Labels (V189, Q3 HCM)
const OLD_JOB_ID = '750069bb-878d-4065-8859-71668d36076c' // 동일 포지션 V22 (9/14 발송분) — 기수신·지원자 제외용
const CAMP = 'becuai0921-recommend'
const ROLE_VI = 'Nhân viên Xử lý Dữ liệu (tiếng Hàn)'

// ── 대상 선정 — HCM(명시+빈값) × 한국어 인증 TOPIK 3+/중급 이상 ──
// HCMC 게이트: A=명시(+가점) / B=빈값(허용) / X=타지역(제외) — ktc0914 와 동일
const hcmBucket = (loc) => {
  const s = String(loc || '').toLowerCase().trim()
  if (!s) return 'B'
  return /(hồ chí minh|ho chi minh|hochiminh|hcmc|\bhcm\b|tp\.?hcm|sài gòn|saigon|thủ đức|thu duc|bình thạnh|binh thanh)/.test(s) ? 'A' : 'X'
}
const cert = (p) => String(p.korean_cert || '')
// 'Pre-Intermediate' 는 intermediate 에 오탐되므로 선제 컷
const certOk = (p) => !/pre-?\s*intermediate/i.test(cert(p)) && /(topik\s*(ii\s*)?(level\s*)?[3-6]|intermediate|trung cấp|중급|advanced|cao cấp|고급|native|business|fluent)/i.test(cert(p))
const certHi = (p) => /(topik\s*(ii\s*)?(level\s*)?[56]|advanced|cao cấp|고급|native|fluent)/i.test(cert(p))
const y = (p) => p.yoe_months ?? 0
// 급여 12M ↔ 10y 초과 미스매치 컷(PI·로멘 교훈). 가점: HCM 명시 > 신입~3y(포지션 정합) > 상급 인증
const pick = (p) => (hcmBucket(p.location) !== 'X' && certOk(p) && y(p) <= 120
  ? (hcmBucket(p.location) === 'A' ? 2 : 0) + (y(p) <= 36 ? 2 : 0) + (certHi(p) ? 1 : 0) : null)

// ── 카피(vi 실발송) — TOPIK 3-4·한국어 면접/타이핑 테스트·야간·주6일 명시해 자기선별 유도 (V22 카피 기반, V189 JD 에서 빠진 CV 언어 요건 삭제) ──
const COMPANY = 'BECUAI VIETNAM'
const INITIAL = 'B'
const META_VI = 'Onsite · Q.3 (P. Bàn Cờ), TP.HCM · Gross 12 triệu ₫/tháng + phụ cấp đêm'
const INTRO = '<b>BECUAI VIETNAM</b> đang tuyển <b>Nhân viên Xử lý Dữ liệu (Data Labels)</b> qua FYI — nhập liệu, lưu trữ &amp; quản lý dữ liệu báo chí/tin tức Hàn Quốc cho AI (được hướng dẫn &amp; đào tạo, <b>không yêu cầu kinh nghiệm</b>). Yêu cầu: tốt nghiệp đại học, <b>tiếng Hàn đọc hiểu, giao tiếp khá (tối thiểu TOPIK 3–4)</b> — phỏng vấn bằng tiếng Hàn &amp; có test đánh máy tiếng Hàn. Lưu ý giờ làm: <b>15:00–00:00 (làm đêm, có phụ cấp), Chủ Nhật đến Thứ 6</b>. Lương gross 12 triệu ₫ (chưa gồm phụ cấp làm đêm; thử việc 2 tháng 85%), sau thử việc đóng BHXH/BHYT/BHTN trên 100% lương. Công ty có phòng ăn &amp; phòng nghỉ riêng, ký túc xá cách công ty 3 phút đi bộ, hỗ trợ mộc thực tập.'
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
  const [pool, unsubs, recs, apps, todays, recent] = await Promise.all([
    fetchAll(() => sb.from('user_profiles')
      .select('id,email,full_name,position,yoe_months,location,korean_cert,is_resume_public')
      .not('email', 'is', null).not('resume_url', 'is', null).order('created_at', { ascending: false })),
    fetchAll(() => sb.from('events').select('user_id').eq('event', 'coldmail_unsub').not('user_id', 'is', null).order('id')),
    fetchAll(() => sb.from('job_recommendations').select('user_id').in('job_id', [JOB_ID, OLD_JOB_ID]).order('id')),
    fetchAll(() => sb.from('job_applications').select('user_id').in('job_id', [JOB_ID, OLD_JOB_ID]).order('id')),
    fetchAll(() => sb.from('job_recommendations').select('user_id,to_email').gte('created_at', sinceIso).order('id')),
    fetchAll(() => sb.from('job_recommendations').select('user_id').gte('created_at', weekAgoIso).order('id')),
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
  let skipApplied = 0, skipRec = 0, skipToday = 0, skipTired = 0
  for (const p of pool) {
    if (!p.email || /likelion/i.test(p.email)) continue
    const e = p.email.toLowerCase()
    if (seen.has(e) || unsubSet.has(p.id)) continue
    const s = pick(p)
    if (s == null) continue
    seen.add(e)
    if (appliedSet.has(p.id)) { skipApplied++; continue }
    if (recSet.has(p.id)) { skipRec++; continue } // V22(9/14) 기수신 포함 — 신규만
    if (todayUsers.has(p.id) || todayEmails.has(e)) { skipToday++; continue }
    if ((cnt7[p.id] || 0) >= 3) { skipTired++; continue } // 신선도 하드게이트
    assigned.push({ p, s, frame: p.is_resume_public ? 'public' : 'private' })
  }
  // 동일인 2계정(이메일만 다름) 중복 수신 방지 — 이름 정규화 키로 1통, 동점이면 공개 프로필 우선
  assigned.sort((a, b) => b.s - a.s || (b.frame === 'public') - (a.frame === 'public'))
  const names = new Set()
  const deduped = assigned.filter(({ p }) => { const k = nameKey(p.full_name); if (names.has(k)) return false; names.add(k); return true })
  const skipDup = assigned.length - deduped.length
  assigned.splice(0, assigned.length, ...deduped)

  const pub = assigned.filter((x) => x.frame === 'public').length
  console.log(`발송 대상(1인 1통): ${assigned.length}명 (공개 ${pub} / 비공개 ${assigned.length - pub})`)
  console.log(`  제외: V22·V189 지원완료 ${skipApplied} · V22·V189 기수신 ${skipRec} · 당일 겹침 ${skipToday} · 7일 3통+ 지친 풀 ${skipTired} · 동일인 2계정 ${skipDup}`)
  if (!doSend) {
    for (const { p, s, frame } of assigned)
      console.log(`  [${s}·${frame}] ${p.full_name} <${p.email}> · ${p.position || '?'} · ${Math.round((p.yoe_months || 0) / 12 * 10) / 10}y · ${String(p.location || '위치?').slice(0, 30)} · ${p.korean_cert}`)
    console.log('\n(dry-run — 실발송하려면 --send)')
    return
  }

  const targets = maxN ? assigned.slice(0, maxN) : assigned
  let ok = 0, fail = 0
  for (const { p, frame } of targets) {
    const camp = `${CAMP}-${frame}`
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
      event: 'recommend_sent', page: '/scripts/becuai0921-recommend-coldmail',
      meta: { campaign: camp, job_ids: [JOB_ID], frame }, user_id: p.id,
    }])
    ok++
    if (ok % 25 === 0) console.log(`  …${ok}/${targets.length}`)
    await sleep(400)
  }
  console.log(`\n✅ 발송 완료: ${ok}/${targets.length} (실패 ${fail})`)
}

main().catch((e) => { console.error(e); process.exit(1) })