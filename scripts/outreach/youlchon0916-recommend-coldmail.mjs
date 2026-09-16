// YOUL CHON VINA - NV Kinh doanh Phát triển Thị trường(V177) recommend — 9/16 신규 등록 공고.
// JD: 빈탄(362/1 Ung Văn Khiêm, P.Thạnh Mỹ Tây) 온사이트 · 월~금 08:00-17:00 · 10-14M ₫ + 커미션
//     · 남성 22~40세 · 전문대 졸업 이상(경영/마케팅/경영관리 계열) · 동일 직무 경력 1년 초과.
// 게이트(온사이트 영업이라 위치 미기재 제외 — HCMC권 실거주만):
//   sales = 직무/희망직무에 Sales·Kinh doanh·BD·AM/AE 명시 × 경력 12개월+ × HCMC권
//   ※ 성별(남성)·나이(22~40)는 DB에 없다(birthdate 기재 0명). 본문에 하드조건 전부 명시해 자기선별에 맡긴다.
//   ※ 마케팅 단독 직무(169명)는 JD가 오더 클로징 중심이라 이번엔 제외 — 반응률 우선.
// wiseedu0916 패턴: 1인1통(당일 recommend 기수신 제외, --gap-hours 완화) · 공개/비공개 프레임 · unsub 전역 제외.
//
//   node scripts/outreach/youlchon0916-recommend-coldmail.mjs                       # dry-run
//   node scripts/outreach/youlchon0916-recommend-coldmail.mjs --send [--max N] [--gap-hours N]
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
const firstName = (n) => String(n || '').trim().split(/\s+/).slice(-1)[0] || 'bạn'
const strip = (s) => String(s).replace(/<[^>]+>/g, '')

const JOB_ID = '138fd376-c864-4e60-965d-875a5328171d' // YOUL CHON VINA · NV KINH DOANH PHÁT TRIỂN THỊ TRƯỜNG (V177)
const CAMP = 'youlchon0916-recommend-sales'

// ── 대상 선정 ──
const norm = (v) => (Array.isArray(v) ? v.join(' ') : String(v || ''))
const txt = (p) => {
  const exp = Array.isArray(p.experiences) ? p.experiences.map((e) => `${e.title || e.position || ''} ${e.company || ''}`).join(' ') : ''
  return [p.position, p.headline, norm(p.desired_roles), norm(p.skills), exp, JSON.stringify(p.resume_summary || ''), p.university, p.major].join(' ').toLowerCase()
}
const roles = (p) => [p.position, ...(p.desired_roles || [])].filter(Boolean)
const y = (p) => p.yoe_months ?? 0
const inHcmc = (p) => /(h[ồo]\s*ch[íi]\s*minh|hcm|sài gòn|sai gon|thủ đức|thu duc|bình dương|binh duong|bình thạnh|binh thanh|đồng nai|dong nai)/i.test(String(p.location || ''))
// 영업 직무 명시(마케팅 단독 제외)
const salesRole = (p) => roles(p).some((r) => /(sales|sale\b|kinh doanh|business develop|account manager|account executive|영업|세일즈)/i.test(String(r)))
const bizMajor = (p) => /(business|kinh doanh|marketing|quản trị|quan tri|commerce|thương mại|thuong mai|economic|kinh tế|kinh te|ngoại thương|ngoai thuong|international trade)/i.test(String(p.major || ''))
const b2bSig = (p) => /(b2b|đại lý|dai ly|distributor|nhà phân phối|industrial|công nghiệp|bao bì|packaging|nhựa|film)/i.test(txt(p))
const pick = (p) => (salesRole(p) && y(p) >= 12 && inHcmc(p) ? score(p) : null)
// 경력 1~4년이 JD 급여대(10-14M)와 맞물리는 구간 — 상단 배치용 가점
const score = (p) => (bizMajor(p) ? 2 : 0) + (y(p) >= 12 && y(p) <= 48 ? 2 : 0) + (b2bSig(p) ? 1 : 0) + (p.korean_cert ? 1 : 0)

// ── 카피(vi 실발송) — 하드조건(남성·22~40세·전문대 이상·경력 1년+·빈탄 온사이트·10-14M) 전부 명시 ──
const COMPANY = 'YOUL CHON VINA'
const INITIAL = 'Y'
const ROLE_VI = 'Nhân viên Kinh doanh Phát triển Thị trường'
const META_VI = 'Onsite · Bình Thạnh, TP.HCM · 10–14tr ₫/tháng + hoa hồng · T2–T6 08:00–17:00'
const INTRO = `<b>${COMPANY}</b> — công ty Hàn Quốc tại TP.HCM — đang tuyển <b>${ROLE_VI}</b> qua FYI. Công việc: nghiên cứu và xây dựng chiến lược phát triển thị trường, giới thiệu và tư vấn sản phẩm, <b>đàm phán và chốt đơn hàng</b>, chăm sóc khách hàng cũ và tìm kiếm khách hàng mới, báo cáo kết quả kinh doanh và tình hình thị trường định kỳ. Yêu cầu: <b>nam giới, 22–40 tuổi</b>, tốt nghiệp <b>Cao đẳng trở lên</b> các ngành Kinh doanh / Marketing / Quản trị Kinh doanh hoặc ngành liên quan, <b>trên 01 năm kinh nghiệm</b> ở vị trí tương đương. Làm việc <b>Thứ 2–Thứ 6, 08:00–17:00</b>, onsite tại <b>362/1 Ung Văn Khiêm, P. Thạnh Mỹ Tây, TP.HCM (Quận Bình Thạnh cũ)</b>. Lương <b>10–14 triệu ₫/tháng chưa bao gồm hoa hồng</b>, kèm thưởng tháng 13, tăng lương hằng năm, trợ cấp cơm trưa và gửi xe.`
const SUBJECT = {
  public: (role) => `[FYI] Bạn được chọn vào danh sách đề cử gửi ${COMPANY} — ${role}`,
  private: (role) => `[FYI] Bạn được chọn vào danh sách đề cử — ${role} tại ${COMPANY}`,
}
const HOOK = 'Đội ngũ FYI đã xem xét toàn bộ hồ sơ đã đăng ký và <b>chọn bạn vào danh sách đề cử</b> cho vị trí dưới đây — kinh nghiệm kinh doanh tại TP.HCM trong hồ sơ của bạn phù hợp với yêu cầu của vị trí này.'
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
    .select('id,title,company,location,logo_url,is_active,source_id').eq('id', JOB_ID).single()
  if (jobErr || !job || !job.is_active) { console.error('공고 없음/비활성:', jobErr?.message || JOB_ID); process.exit(1) }
  if (!job.source_id) { console.error('source_id(JD 코드) 미기입 — 지원 귀속이 깨지므로 발송 중단. backfill 후 재실행.'); process.exit(1) }

  const resend = new Resend(env.RESEND_API_KEY)
  const url = (userId, camp) => `${SITE}/api/resume/recommend?t=${makeToken(userId, camp)}&j=${JOB_ID}`
  const unsubFor = (userId, camp) => `${SITE}/api/coldmail/unsub?t=${makeToken(userId, camp)}`

  const [pool, unsubs, recs, apps, todays] = await Promise.all([
    fetchAll(() => sb.from('user_profiles')
      .select('id,email,full_name,position,desired_roles,yoe_months,location,english_cert,korean_cert,is_resume_public,skills,resume_summary,headline,experiences,university,major,graduation_year')
      .not('email', 'is', null).not('resume_url', 'is', null).order('created_at', { ascending: false })),
    fetchAll(() => sb.from('events').select('user_id').eq('event', 'coldmail_unsub').not('user_id', 'is', null).order('id')),
    fetchAll(() => sb.from('job_recommendations').select('user_id').eq('job_id', JOB_ID).order('id')),
    fetchAll(() => sb.from('job_applications').select('user_id').eq('job_id', JOB_ID).order('id')),
    fetchAll(() => sb.from('job_recommendations').select('user_id,to_email').gte('created_at', sinceIso).order('id')),
  ])
  const unsubSet = new Set(unsubs.map((r) => r.user_id))
  const recSet = new Set(recs.map((r) => r.user_id))
  const appliedSet = new Set(apps.map((a) => a.user_id))
  const todayUsers = new Set(todays.map((r) => r.user_id))
  const todayEmails = new Set(todays.map((r) => (r.to_email || '').toLowerCase()).filter(Boolean))

  const seen = new Set()
  const assigned = []
  let skipRec = 0, skipToday = 0
  for (const p of pool) {
    if (!p.email || /likelion/i.test(p.email)) continue
    const e = p.email.toLowerCase()
    if (seen.has(e) || unsubSet.has(p.id)) continue
    const s = pick(p)
    if (s == null) continue
    seen.add(e)
    if (appliedSet.has(p.id)) continue
    if (recSet.has(p.id)) { skipRec++; continue }
    if (todayUsers.has(p.id) || todayEmails.has(e)) { skipToday++; continue }
    assigned.push({ p, s, frame: p.is_resume_public ? 'public' : 'private' })
  }

  const pub = assigned.filter((x) => x.frame === 'public').length
  console.log(`발송 대상(영업 직무 명시 × 경력 1년+ × HCMC권): ${assigned.length}명 (공개 ${pub} / 비공개 ${assigned.length - pub})`)
  console.log(`  ── 제외: 본 공고 기수신 ${skipRec} · 당일 발송 겹침 ${skipToday}`)
  if (!doSend) {
    console.log('\n── 전체 목록 (점수 내림차순) ──')
    for (const { p, s, frame } of [...assigned].sort((a, b) => b.s - a.s))
      console.log(`  [${s}·${frame}] ${p.full_name} <${p.email}> · ${p.position || '?'} · ${(y(p) / 12).toFixed(1)}y · 전공:${p.major || '?'} · ${p.location || '위치?'}`)
    console.log('\n(dry-run — 실발송하려면 --send, 인원 제한 --max N)')
    return
  }

  let targets = assigned
  if (maxN) targets = targets.slice(0, maxN)
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
      event: 'recommend_sent', page: '/scripts/youlchon0916-recommend-coldmail',
      meta: { campaign: camp, job_ids: [JOB_ID], frame }, user_id: p.id,
    }])
    ok++
    if (ok % 25 === 0) console.log(`  …${ok}/${targets.length}`)
    await sleep(400)
  }
  console.log(`\n✅ 발송 완료: ${ok}/${targets.length} (실패 ${fail})`)
}

main().catch((e) => { console.error(e); process.exit(1) })
