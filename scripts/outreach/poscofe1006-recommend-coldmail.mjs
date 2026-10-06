// POSCO DX VIETNAM(V219) Senior Front-end Publishing Developer recommend — 10/5 Len FYI 등록, 10/6 발송.
// JD 하드요건: FE 개발/웹 퍼블리싱 5년+ · HTML5/CSS3/JS · Vue 또는 React · 기존 코드 리팩토링/폴더구조 표준화 · 재사용 컴포넌트
//   · 반응형/크로스브라우저 · Git · 영어 업무 소통 · onsite Quận 7(Cobi Tower I) · 급여 협의.
//   우대: UX/UI·Figma 리뷰 · 디자인시스템 · AI 생성 코드 리팩토링 · TS/SCSS/Vite/Webpack · ERP/MES · 한국어.
// 10/6 실측(scripts/tmp/v219-pool-measure.mjs): FE 시그널 1750 → 5y+ 225 → HCMC권/미기재 123 → React/Vue 명시 103(코어).
//   언어는 게이트에서 제외(V187/V195 교훈) — 정렬 가점만. 확장 a(React/Vue 미명시 퍼블리셔 20)·c(3~5y 97)는 1차 제외.
// 신선도 하드게이트: 최근 7일 recommend 3통+ 제외. 당일 겹침은 --gap-hours 로 다음 날 소화.
// 표준: 1인1통 · unsub·blacklist 전역 제외 · 공개/비공개 프레임.
//
//   node scripts/outreach/poscofe1006-recommend-coldmail.mjs                # dry-run
//   node scripts/outreach/poscofe1006-recommend-coldmail.mjs --send [--max N] [--gap-hours N]
import { Resend } from 'resend'
import { sb, env, fetchAll, fetchBlacklist } from './lib.mjs'
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

const JOB_ID = '108141fa-a6bc-41ed-92b9-3c32dcc5be53' // POSCO DX VIETNAM Senior Front-end Publishing Developer (V219, onsite D7 HCMC)

// ── 대상 선정 — (Frontend/Fullstack 직군 or FE/퍼블리싱 텍스트 or React/Vue) × 5y+ × HCMC권/미기재 × React/Vue 명시 ──
const norm = (v) => (Array.isArray(v) ? v.join(' ') : String(v || ''))
const exp = (p) => (Array.isArray(p.experiences) ? p.experiences.map((e) => `${e.title || e.position || ''} ${e.company || ''} ${e.description || ''}`).join(' ') : '')
const txt = (p) => [p.position, p.headline, norm(p.desired_roles), JSON.stringify(p.skills || ''), exp(p), JSON.stringify(p.resume_summary || ''), p.major].join(' ').toLowerCase()
const roles = (p) => [p.position, ...(p.desired_roles || [])].filter(Boolean)
const feRole = (p) => roles(p).some((r) => /frontend|front-end|fullstack/i.test(String(r)))
const feTitle = (p) => roles(p).some((r) => /frontend|front-end/i.test(String(r)))
const feRe = /(front-?end|frontend|web publish|publisher|publishing|html\/css|html5|css3|ui developer|web developer|lập trình web|thiết kế giao diện)/i
const fwRe = /\breact\b|react\.?js|\bvue\b|vue\.?js|nuxt|next\.?js/i
const htmlRe = /\bhtml\b|\bcss\b|javascript|\bjs\b/i
const refacRe = /refactor|tái cấu trúc|clean code|code review|maintainab|reusable|component librar|design system|storybook/i
const respRe = /responsive|cross-?browser|mobile-?first|bootstrap|tailwind/i
const buildRe = /typescript|\bts\b|sass|scss|vite|webpack/i
const uxRe = /figma|adobe xd|\bsketch\b|zeplin|ui\/ux|ux\/ui|uiux/i
const entRe = /\berp\b|\bmes\b|smart factory|nhà máy|manufactur|enterprise/i
const koRe = /(korean|tiếng hàn|topik|한국어)/i
const inHcmc = (p) => /(h[ồo]\s*ch[íi]\s*minh|hcm|sài gòn|sai gon|saigon|thủ đức|thu duc|bình thạnh|binh thanh|bình dương|binh duong|đồng nai|dong nai|biên hòa|bien hoa|long an|호찌민|호치민)/i.test(String(p.location || ''))
const noLoc = (p) => !String(p.location || '').trim()
const y = (p) => p.yoe_months ?? 0
const base = (p) => (feRole(p) || feRe.test(p.__t) || fwRe.test(p.__t)) && y(p) >= 60 && (inHcmc(p) || noLoc(p)) && fwRe.test(p.__t)
// 가점: 리팩토링/컴포넌트/DS = 한국어 > React/Vue > HTML/CSS = 반응형 = 빌드툴 = UX = ERP = Frontend 직함 = 영어 기입
const score = (p) => (fwRe.test(p.__t) ? 2 : 0) + (refacRe.test(p.__t) ? 2 : 0) + (p.korean_cert || koRe.test(p.__t) ? 2 : 0)
  + (htmlRe.test(p.__t) ? 1 : 0) + (respRe.test(p.__t) ? 1 : 0) + (buildRe.test(p.__t) ? 1 : 0) + (uxRe.test(p.__t) ? 1 : 0)
  + (entRe.test(p.__t) ? 1 : 0) + (feTitle(p) ? 1 : 0) + (p.english_cert ? 1 : 0)

const GROUPS = [
  {
    gkey: 'fe', camp: 'poscofe1006-recommend-fe',
    label: { vi: 'Senior Front-end Publishing Developer', ko: 'FE/퍼블리싱 5y+ × React/Vue × HCMC권' },
    pick: (p) => (base(p) ? score(p) : null),
  },
]

// ── 카피(vi 실발송) — onsite Q7·5년+·퍼블리싱/리팩토링 중심(UX 디자인보다 우선) 명시해 자기선별 유도 ──
const COMPANY = 'POSCO DX VIETNAM'
const INITIAL = 'P'
const META_VI = 'Onsite · Quận 7, TP.HCM · Senior (5 năm+) · Lương thỏa thuận'
const INTRO = '<b>POSCO DX VIETNAM</b> — trung tâm phát triển offshore (ODC) làm việc trực tiếp với trụ sở Hàn Quốc của tập đoàn POSCO — đang tuyển <b>Senior Front-end Publishing Developer</b> qua FYI. Công việc: phân tích và <b>refactor</b> mã nguồn Front-end (HTML/CSS/JavaScript, Vue.js hoặc React) do AI Agent của công ty sinh ra theo cấu trúc thư mục chuẩn và component tái sử dụng; xây dựng và cải thiện giao diện web; loại bỏ code trùng lặp để tăng khả năng đọc và bảo trì; đối chiếu màn hình đã triển khai với thiết kế UX/UI gốc; kiểm tra responsive và tương thích trình duyệt; xây dựng tiêu chuẩn Front-end và hướng dẫn web publishing. Yêu cầu: <b>tối thiểu 5 năm kinh nghiệm Front-end hoặc web publishing</b>, thành thạo <b>HTML5, CSS3, JavaScript</b>, có kinh nghiệm <b>Vue.js hoặc React</b>, từng refactor mã nguồn và tổ chức lại cấu trúc dự án, phát triển UI component tái sử dụng, responsive/cross-browser, Git, <b>giao tiếp tốt bằng tiếng Anh</b>. Ưu tiên: kinh nghiệm UX/UI hoặc QA giao diện, review thiết kế bằng Figma, Design System/Component Library, review code do AI sinh ra, dùng AI tool (Copilot/ChatGPT/Gemini), TypeScript/Sass/Vite/Webpack, dự án Enterprise/ERP/MES/Smart Factory, biết tiếng Hàn. Lưu ý: vị trí này <b>ưu tiên năng lực Front-end và web publishing hơn kinh nghiệm thiết kế UX/UI</b>. Văn phòng: Cobi Tower I, số 5 Hoàng Văn Thái, phường Tân Mỹ, TP.HCM.'
const SUBJECT = {
  public: (role) => `[FYI] Bạn được chọn vào danh sách đề cử gửi ${COMPANY} — ${role} (TP.HCM)`,
  private: (role) => `[FYI] Bạn được chọn vào danh sách đề cử — ${role} tại ${COMPANY} (TP.HCM)`,
}
const HOOK = 'Đội ngũ FYI đã xem xét toàn bộ hồ sơ đã đăng ký và <b>chọn bạn vào danh sách đề cử</b> cho vị trí dưới đây — hồ sơ của bạn (kinh nghiệm Front-end từ 5 năm trở lên với Vue.js/React, làm việc tại khu vực TP.HCM) phù hợp với yêu cầu của vị trí này.'
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
      .select('id,email,full_name,position,desired_roles,headline,major,yoe_months,location,english_cert,korean_cert,is_resume_public,skills,resume_summary,experiences')
      .not('email', 'is', null).not('resume_url', 'is', null).order('created_at', { ascending: false })),
    fetchAll(() => sb.from('events').select('user_id').eq('event', 'coldmail_unsub').not('user_id', 'is', null).order('id')),
    fetchAll(() => sb.from('job_recommendations').select('user_id').eq('job_id', JOB_ID).order('id')),
    fetchAll(() => sb.from('job_applications').select('user_id').eq('job_id', JOB_ID).order('id')),
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
  let skipRec = 0, skipToday = 0, skipTired = 0, skipBl = 0
  for (const p of pool) {
    if (!p.email || /likelion/i.test(p.email)) continue
    const e = p.email.toLowerCase()
    if (seen.has(e) || unsubSet.has(p.id)) continue
    if (bl.has(p)) { skipBl++; continue }
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
  console.log(`  ── 합계: ${assigned.length}명 (제외: 기수신 ${skipRec} · 당일 겹침 ${skipToday} · 7일 3통+ 지친 풀 ${skipTired} · 블랙리스트 ${skipBl})`)
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
      event: 'recommend_sent', page: '/scripts/poscofe1006-recommend-coldmail',
      meta: { campaign: camp, job_ids: [JOB_ID], frame, group: g.gkey }, user_id: p.id,
    }])
    ok++
    if (ok % 25 === 0) console.log(`  …${ok}/${targets.length}`)
    await sleep(400)
  }
  console.log(`\n✅ 발송 완료: ${ok}/${targets.length} (실패 ${fail})`)
}

main().catch((e) => { console.error(e); process.exit(1) })
