// POSCO DX VIETNAM(V195) Senior UI Designer recommend — 9/25 Len FYI 등록, 9/25 발송.
// JD 하드요건: UI/UX 디자인 5년+ (web/mobile) · Figma/Adobe XD/Sketch · UX/UI/IA/인터랙션 디자인 · 와이어프레임/프로토타입
//   · HTML/CSS/JS 친숙 · 디자인시스템/컴포넌트 라이브러리 경험 우대 · 영어 소통(한국어 우대) · onsite Quận 7(Cobi Tower I) · 급여 협의.
// 9/25 실측(scripts/tmp/v195-pool-measure.mjs): 디자인 시그널 479 → 5y+ 79 → HCMC권/미기재 49 → UI/UX 텍스트 or 디자인툴 명시 33.
//   언어는 게이트에서 제외(V187 교훈: english_cert 는 자기기입값, JD도 "우대") — 정렬 가점만.
//   3~5y 완화층 25명은 "Senior 5y 최소"라 1차 제외.
// 신선도 하드게이트: 최근 7일 recommend 3통+ 제외. 당일 겹침은 --gap-hours 로 다음 날 소화.
// 표준: 1인1통 · unsub 전역 제외 · 공개/비공개 프레임.
//
//   node scripts/outreach/poscoui0925-recommend-coldmail.mjs                # dry-run
//   node scripts/outreach/poscoui0925-recommend-coldmail.mjs --send [--max N] [--gap-hours N]
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

const JOB_ID = 'b9359735-59c1-4102-9950-7a9940402fd9' // POSCO DX VIETNAM Senior UI Designer (V195, onsite D7 HCMC)

// ── 대상 선정 — (Design 직군 or UI/UX 텍스트) × 5y+ × HCMC권/미기재 × (UI/UX 텍스트 or Figma/XD/Sketch) ──
const norm = (v) => (Array.isArray(v) ? v.join(' ') : String(v || ''))
const exp = (p) => (Array.isArray(p.experiences) ? p.experiences.map((e) => `${e.title || e.position || ''} ${e.company || ''} ${e.description || ''}`).join(' ') : '')
const txt = (p) => [p.position, p.headline, norm(p.desired_roles), JSON.stringify(p.skills || ''), exp(p), JSON.stringify(p.resume_summary || ''), p.major].join(' ').toLowerCase()
const roles = (p) => [p.position, ...(p.desired_roles || [])].filter(Boolean)
const isDesign = (p) => roles(p).includes('Design')
const uiuxRe = /(ui\/ux|ui\s*ux|uiux|ux\/ui|ux designer|ui designer|product designer|user experience|user interface|interaction design)/i
const toolRe = /figma|adobe xd|\bsketch\b|zeplin|framer/i
const dsRe = /design system|component librar|style guide|ui kit/i
const protoRe = /prototype|wireframe|user flow|usability/i
const feRe = /\bhtml\b|\bcss\b|javascript/i
const koRe = /(korean|tiếng hàn|topik|한국어)/i
const inHcmc = (p) => /(h[ồo]\s*ch[íi]\s*minh|hcm|sài gòn|sai gon|saigon|thủ đức|thu duc|bình thạnh|binh thanh|bình dương|binh duong|đồng nai|dong nai|biên hòa|bien hoa|long an)/i.test(String(p.location || ''))
const noLoc = (p) => !String(p.location || '').trim()
const y = (p) => p.yoe_months ?? 0
const base = (p) => (isDesign(p) || uiuxRe.test(p.__t)) && y(p) >= 60 && (inHcmc(p) || noLoc(p)) && (uiuxRe.test(p.__t) || toolRe.test(p.__t))
// 가점: 디자인툴 = UI/UX 텍스트 = 디자인시스템 > 한국어 > 프로토타입 = HTML/CSS = 영어 기입
const score = (p) => (toolRe.test(p.__t) ? 2 : 0) + (uiuxRe.test(p.__t) ? 2 : 0) + (dsRe.test(p.__t) ? 2 : 0)
  + (p.korean_cert || koRe.test(p.__t) ? 2 : 0) + (protoRe.test(p.__t) ? 1 : 0) + (feRe.test(p.__t) ? 1 : 0) + (p.english_cert ? 1 : 0)

const GROUPS = [
  {
    gkey: 'uiux', camp: 'poscoui0925-recommend-uiux',
    label: { vi: 'Senior UI Designer', ko: 'UI/UX 5y+ × HCMC권' },
    pick: (p) => (base(p) ? score(p) : null),
  },
]

// ── 카피(vi 실발송) — onsite Q7·5년+ 필수요건 명시해 자기선별 유도 ──
const COMPANY = 'POSCO DX VIETNAM'
const INITIAL = 'P'
const META_VI = 'Onsite · Quận 7, TP.HCM · Senior (5 năm+) · Lương thỏa thuận'
const INTRO = '<b>POSCO DX VIETNAM</b> — trung tâm phát triển offshore (ODC) làm việc trực tiếp với trụ sở Hàn Quốc của tập đoàn POSCO — đang tuyển <b>Senior UI Designer</b> qua FYI. Công việc: phối hợp với PM và đội phát triển để xác định chiến lược UI/UX; thiết kế wireframe, user flow, mockup, prototype và giao diện high-fidelity cho ứng dụng web &amp; mobile; xây dựng và duy trì <b>Design System</b>, style guide, thư viện UI component; nghiên cứu UX và cải thiện usability/accessibility. Yêu cầu: <b>tối thiểu 5 năm kinh nghiệm thiết kế UI/UX</b> cho web/mobile, thành thạo <b>Figma, Adobe XD, Sketch</b> hoặc tương đương, nắm vững UX/UI Design, Information Architecture, Interaction Design, Design Thinking; quen HTML/CSS/JavaScript; từng làm việc với đội phát triển trong môi trường Agile. Ưu tiên: kinh nghiệm Design System, dùng AI (ChatGPT/Copilot/Gemini) trong quy trình thiết kế, dự án enterprise/ERP/MES/Smart Factory, <b>giao tiếp tốt bằng tiếng Anh</b> (biết tiếng Hàn là lợi thế). Phúc lợi: lương &amp; thưởng cạnh tranh, thưởng cuối năm, bảo hiểm tai nạn PVI 24/7, môi trường làm việc tiếng Anh, <b>cơ hội sang trụ sở POSCO DX Hàn Quốc</b>, hỗ trợ học tiếng Hàn. Văn phòng: Cobi Tower I, số 5 Hoàng Văn Thái, phường Tân Mỹ, TP.HCM.'
const SUBJECT = {
  public: (role) => `[FYI] Bạn được chọn vào danh sách đề cử gửi ${COMPANY} — ${role} (TP.HCM)`,
  private: (role) => `[FYI] Bạn được chọn vào danh sách đề cử — ${role} tại ${COMPANY} (TP.HCM)`,
}
const HOOK = 'Đội ngũ FYI đã xem xét toàn bộ hồ sơ đã đăng ký và <b>chọn bạn vào danh sách đề cử</b> cho vị trí dưới đây — hồ sơ của bạn (kinh nghiệm thiết kế UI/UX từ 5 năm trở lên, làm việc tại khu vực TP.HCM) phù hợp với yêu cầu của vị trí này.'
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
      .select('id,email,full_name,position,desired_roles,headline,major,yoe_months,location,english_cert,korean_cert,is_resume_public,skills,resume_summary,experiences')
      .not('email', 'is', null).not('resume_url', 'is', null).order('created_at', { ascending: false })),
    fetchAll(() => sb.from('events').select('user_id').eq('event', 'coldmail_unsub').not('user_id', 'is', null).order('id')),
    fetchAll(() => sb.from('job_recommendations').select('user_id').eq('job_id', JOB_ID).order('id')),
    fetchAll(() => sb.from('job_applications').select('user_id').eq('job_id', JOB_ID).order('id')),
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
  let skipRec = 0, skipToday = 0, skipTired = 0
  for (const p of pool) {
    if (!p.email || /likelion/i.test(p.email)) continue
    const e = p.email.toLowerCase()
    if (seen.has(e) || unsubSet.has(p.id)) continue
    p.__t = txt(p)
    for (const g of GROUPS) {
      const s = g.pick(p)
      if (s == null) continue
      seen.add(e)
      if (appliedSet.has(p.id)) break
      if (recSet.has(p.id)) { skipRec++; break }
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
    console.log(`  ${g.gkey} (${g.label.ko}): ${rows.length}명 (공개 ${pub} / 비공개 ${rows.length - pub})`)
  }
  console.log(`  ── 합계: ${assigned.length}명 (제외: 기수신 ${skipRec} · 당일 겹침 ${skipToday} · 7일 3통+ 지친 풀 ${skipTired})`)
  if (!doSend) {
    const rows = [...assigned].sort((a, b) => b.s - a.s)
    console.log(`\n── 전원 ──`)
    for (const { p, s, frame } of rows)
      console.log(`  [${s}·${frame}] ${p.full_name} <${p.email}> · ${p.position || '?'} · ${Math.round((p.yoe_months || 0) / 12 * 10) / 10}y · ${String(p.location || '위치?').slice(0, 28)} · en=${p.english_cert || '-'}`)
    console.log('\n(dry-run — 실발송하려면 --send)')
    return
  }

  let targets = assigned
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
      event: 'recommend_sent', page: '/scripts/poscoui0925-recommend-coldmail',
      meta: { campaign: camp, job_ids: [JOB_ID], frame, group: g.gkey }, user_id: p.id,
    }])
    ok++
    if (ok % 25 === 0) console.log(`  …${ok}/${targets.length}`)
    await sleep(400)
  }
  console.log(`\n✅ 발송 완료: ${ok}/${targets.length} (실패 ${fail})`)
}

main().catch((e) => { console.error(e); process.exit(1) })
