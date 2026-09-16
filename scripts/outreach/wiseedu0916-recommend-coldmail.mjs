// Wise Edu Admin manager - Tiếng Hàn(V171) recommend — 9/16 지원 0 공고 전수진단 후 유저 승인 발송.
// JD: 꽝7 푸미흥 온사이트 · 월~금 14:00-21:00 · 18-26M ₫ · TOPIK 6 or 동급 한국어 · 40세 이하
//     · 4년제 졸업(예정 포함) · Excel 중급 · 셔틀 스케줄 관리·학부모/한국인 교사 소통·수학 채점(비강의).
// 게이트(경력 컷 없음·온사이트라 HCMC권/미기재만):
//   cert-hi  = 한국어 인증 TOPIK 5·6/Native/고급 — JD 요건 직접 충족층
//   kr-major = TOPIK 4·중급 인증 or 한국어 계열 전공/유학 시그널 — "동급" 자기선별 기대층
// tv0915 패턴: 1인1통(당일 recommend 기수신 제외, --gap-hours 완화) · 공개/비공개 프레임 · unsub 전역 제외.
//
//   node scripts/outreach/wiseedu0916-recommend-coldmail.mjs                       # dry-run
//   node scripts/outreach/wiseedu0916-recommend-coldmail.mjs --send [--max N] [--gap-hours N] [--group KEY]
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

const JOB_ID = '5d48e732-d9a8-429b-974b-77e4bb4985a2' // Wise Edu Admin manager - Tiếng Hàn (V171)

// ── 대상 선정 ──
const norm = (v) => (Array.isArray(v) ? v.join(' ') : String(v || ''))
const txt = (p) => {
  const exp = Array.isArray(p.experiences) ? p.experiences.map((e) => `${e.title || e.position || ''} ${e.company || ''}`).join(' ') : ''
  return [p.position, p.headline, norm(p.desired_roles), norm(p.skills), exp, JSON.stringify(p.resume_summary || ''), p.university, p.major].join(' ').toLowerCase()
}
const roles = (p) => [p.position, ...(p.desired_roles || [])].filter(Boolean)
const inHcmc = (p) => /(h[ồo]\s*ch[íi]\s*minh|hcm|sài gòn|sai gon|thủ đức|thu duc|bình dương|binh duong)/i.test(String(p.location || ''))
const noLoc = (p) => !String(p.location || '').trim()
const geoOk = (p) => inHcmc(p) || noLoc(p) // 꽝7 온사이트 — 하노이/다낭 제외
const cert = (p) => String(p.korean_cert || '').toLowerCase()
// 인증 등급 판별: TOPIK 5·6/Native/고급 = 상급, TOPIK 4/중급/Intermediate = 중급
const certHi = (p) => /(topik\s*(ii\s*)?(level\s*)?[56]|native|고급|advanced)/i.test(cert(p))
const certMid = (p) => /(topik\s*(ii\s*)?(level\s*)?4|topik\s*4|intermediate|trung cấp|중급|business)/i.test(cert(p))
// 한국어 계열 전공·유학 시그널 (인증 미기입이어도 "동급" 후보)
const krMajor = (p) => /(hàn quốc học|ngôn ngữ hàn|korean (studies|language)|한국어|한국학)/i.test(`${p.major || ''} ${p.university || ''}`)
const krTextStrong = (p) => /(topik\s*[56]|tiếng hàn (thành thạo|lưu loát)|fluent (in )?korean)/i.test(txt(p))
const adminSig = (p) => roles(p).some((r) => /(non-it|operations|hr|admin|other)/i.test(String(r))) || /(admin|hành chính|văn phòng|trợ lý|assistant)/i.test(txt(p))
const excelSig = (p) => /excel/i.test(txt(p))
const score = (p) => (certHi(p) ? 4 : certMid(p) ? 2 : 0) + (krMajor(p) ? 2 : 0) + (adminSig(p) ? 1 : 0) + (excelSig(p) ? 1 : 0) + (inHcmc(p) ? 1 : 0)

const GROUPS = [
  {
    gkey: 'cert-hi', camp: 'wiseedu0916-recommend-admin-hi',
    label: { vi: 'Admin Manager (tiếng Hàn)', ko: '한국어 상급 인증(TOPIK 5·6/Native) × HCMC권·미기재' },
    pick: (p) => (geoOk(p) && certHi(p) ? score(p) : null),
  },
  {
    gkey: 'kr-major', camp: 'wiseedu0916-recommend-admin-mid',
    label: { vi: 'Admin Manager (tiếng Hàn)', ko: 'TOPIK 4·중급 인증 or 한국어 전공/유창 텍스트 × HCMC권·미기재' },
    pick: (p) => (geoOk(p) && (certMid(p) || krMajor(p) || krTextStrong(p)) ? score(p) : null),
  },
]

// ── 카피(vi 실발송) — 하드조건(TOPIK 6 동급·40세 이하·4년제·꽝7 온사이트 14-21시) 전부 명시해 자기선별 유도 ──
const COMPANY = 'Wise Edu'
const INITIAL = 'W'
const META_VI = 'Onsite · Phú Mỹ Hưng, Q.7, TP.HCM · 18–26tr ₫/tháng · T2–T6 14:00–21:00'
const INTRO = '<b>Wise Edu</b> — trung tâm giáo dục Hàn Quốc tại Phú Mỹ Hưng (Quận 7, TP.HCM) — đang tuyển <b>Admin Manager (tiếng Hàn)</b> qua FYI. Công việc: quản lý lịch xe đưa đón học sinh bằng Excel, trao đổi với phụ huynh và giáo viên người Hàn khi cần, chấm bài tập Toán theo đáp án có sẵn (không giảng dạy), hỗ trợ hành chính vận hành trung tâm. Yêu cầu: <b>TOPIK 6 hoặc trình độ tiếng Hàn tương đương</b>, tốt nghiệp hoặc sắp tốt nghiệp Đại học hệ 4 năm, không quá 40 tuổi, <b>Excel trung cấp trở lên</b>, cẩn thận và mong muốn làm việc lâu dài. Làm việc <b>Thứ 2–Thứ 6, 14:00–21:00</b>, onsite tại Phú Mỹ Hưng. Lương <b>18–26 triệu ₫/tháng</b>, đầy đủ BHXH/BHYT/BHTN. <b>CV bằng tiếng Việt hoặc tiếng Hàn.</b>'
const SUBJECT = {
  public: (role) => `[FYI] Bạn được chọn vào danh sách đề cử gửi ${COMPANY} — ${role}`,
  private: (role) => `[FYI] Bạn được chọn vào danh sách đề cử — ${role} tại ${COMPANY}`,
}
const HOOK = 'Đội ngũ FYI đã xem xét toàn bộ hồ sơ đã đăng ký và <b>chọn bạn vào danh sách đề cử</b> cho vị trí dưới đây — năng lực tiếng Hàn trong hồ sơ của bạn phù hợp với yêu cầu của vị trí này.'
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
    fetchAll(() => sb.from('job_recommendations').select('user_id,to_email')
      .gte('created_at', sinceIso).order('id')),
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
    for (const g of GROUPS) {
      const s = g.pick(p)
      if (s == null) continue
      seen.add(e)
      if (appliedSet.has(p.id)) break
      if (recSet.has(p.id)) { skipRec++; break }
      if (todayUsers.has(p.id) || todayEmails.has(e)) { skipToday++; break }
      assigned.push({ p, s, g, frame: p.is_resume_public ? 'public' : 'private' })
      break
    }
  }

  console.log('발송 대상(1인 1통 배정):')
  for (const g of GROUPS) {
    const rows = assigned.filter((r) => r.g.gkey === g.gkey)
    const pub = rows.filter((x) => x.frame === 'public').length
    console.log(`  ${g.gkey} (${g.label.ko}): ${rows.length}명 (공개 ${pub} / 비공개 ${rows.length - pub})`)
  }
  console.log(`  ── 합계: ${assigned.length}명 (제외: 본 공고 기수신 ${skipRec} · 당일 발송 겹침 ${skipToday})`)
  if (!doSend) {
    for (const g of GROUPS) {
      const rows = assigned.filter((r) => r.g.gkey === g.gkey).sort((a, b) => b.s - a.s)
      if (!rows.length) continue
      console.log(`\n── ${g.gkey} 상위 30 ──`)
      for (const { p, s, frame } of rows.slice(0, 30))
        console.log(`  [${s}·${frame}] ${p.full_name} <${p.email}> · ${p.position || '?'} · 전공:${p.major || '?'} · 졸업:${p.graduation_year || '?'} · ${p.location || '위치?'}`)
    }
    console.log('\n(dry-run — 실발송하려면 --send, 인원 제한 --max N)')
    return
  }

  let targets = assigned
  if (onlyGroup) targets = targets.filter((r) => r.g.gkey === onlyGroup)
  if (maxN) targets = targets.slice(0, maxN)
  let ok = 0, fail = 0
  for (const { p, g, frame } of targets) {
    const camp = `${g.camp}-${frame}`
    const u = url(p.id, camp), un = unsubFor(p.id, camp)
    const { error } = await resend.emails.send({
      from: RESEND_FROM, to: p.email, subject: SUBJECT[frame](g.label.vi),
      html: emailHtml(p.full_name, u, un, job, frame), text: emailText(p.full_name, u, un, job, frame),
      headers: { 'List-Unsubscribe': `<${un}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
    })
    if (error) { console.error(`실패 ${p.email}:`, error.message || error); fail++; continue }
    await sb.from('job_recommendations').upsert([{
      user_id: p.id, to_email: p.email, job_id: JOB_ID,
      job_title: job.title, job_company: job.company, sent_by: 'coldmail', kind: 'recommend', status: 'sent',
    }], { onConflict: 'user_id,job_id', ignoreDuplicates: true })
    await sb.from('events').insert([{
      event: 'recommend_sent', page: '/scripts/wiseedu0916-recommend-coldmail',
      meta: { campaign: camp, job_ids: [JOB_ID], frame, group: g.gkey }, user_id: p.id,
    }])
    ok++
    if (ok % 25 === 0) console.log(`  …${ok}/${targets.length}`)
    await sleep(400)
  }
  console.log(`\n✅ 발송 완료: ${ok}/${targets.length} (실패 ${fail})`)
}

main().catch((e) => { console.error(e); process.exit(1) })
