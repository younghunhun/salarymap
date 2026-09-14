// Zest(ZE3502 Nhân viên thiết kế kiến trúc & CAD) 단일 공고 추천 콜드메일 — mpnx 패턴.
// 배경: 9/11 소싱 보드 R188(대분류 PM 오기)=이 공고로 확인. 7/31 게재 후 발송 0·지원 11 방치 상태.
// JD: 친환경 건축(그린빌딩 인증·에너지 시뮬레이션) 컨설팅, 신입~3y, AutoCAD 필수·Revit/ArchiCAD 우대,
//     온사이트 HCM/ĐN/HN, 10–14M ₫.
// 선정: 하드 CAD/건축툴 보유 × ≤4y(급여 밴드) × 비개발 직군 × 기계설계 전용 제외.
//   9/11 실측: 적격 4명(건설감리·HSE/HVAC·QS/QC·생산관리) — FYI 풀이 IT 편중이라 건축 풀 극소.
//   EXCLUDE_IDS = 손선별 오탐 제외(그래픽 SketchUp·IT Support 문맥 히트).
//
//   node scripts/outreach/zest-cad-recommend-coldmail.mjs --test wsj@likelion.net  # 테스트 1통(스탬프 안 함)
//   node scripts/outreach/zest-cad-recommend-coldmail.mjs                          # dry-run: 대상 목록
//   node scripts/outreach/zest-cad-recommend-coldmail.mjs --send [--max N]         # 실발송 + 로깅
import { Resend } from 'resend'
import { sb, env, fetchAll } from './lib.mjs'
import { makeToken } from '../../lib/campaignToken.js'

const JOB_SOURCE_ID = 'ZE3502'

const args = process.argv.slice(2)
const flag = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? (args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true) : d }
const testTo = flag('test', null)
const doSend = args.includes('--send')
const campaign = flag('campaign', 'zest-cad-recommend1')
const SITE = String(flag('site', env.NEXT_PUBLIC_SITE_URL || 'https://salary-fyi.com')).replace(/\/$/, '')
const RESEND_FROM = env.RESEND_FROM || 'FYI <hello@salary-fyi.com>'
const maxN = flag('max', null) ? parseInt(flag('max'), 10) : null
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const esc = (s) => String(s || '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))

// ── JD 매칭 ──
const hayOf = (p) => [
  ...(Array.isArray(p.skills) ? p.skills : []),
  p.headline, p.position,
  JSON.stringify(p.experiences || []),
  JSON.stringify(p.resume_summary || {}),
].map((s) => String(s || '').toLowerCase()).join(' | ')

const ABROAD = /india|gurugram|delhi|philippin|manila|singapore|malaysia|indonesia|jakarta|myanmar|yangon|korea|japan|china|nepal|kathmandu/i
const DEV_POS = new Set(['Fullstack', 'Backend', 'Frontend', 'Mobile', 'Embedded', 'DevOps', 'AI Engineer', 'QA'])
// ⚠️ 'architecture' 단독 금지: UI/UX의 Information Architecture, 'xây dựng' 단독 금지: xây dựng content 오탐 실측(9/11)
const HARD = /autocad|auto cad|revit|archicad|archi cad|sketchup|sketch up|lumion|enscape|d5 render|civil 3d|etabs|sap2000|energyplus|designbuilder/
const MECH_ONLY = /solidworks|jig|fixture|cnc|cơ khí|co khi|\bmechanical\b/
const DOMAIN = /kiến trúc|kien truc|công trình|cong trinh|nội thất|noi that|interior design|draft(s)?man|civil engineer|hvac|qs\/qc|giám sát|giam sat/
// 손선별 오탐 제외(9/11): 그래픽 SketchUp 나열·IT Support 경력 문맥 히트
const EXCLUDE_IDS = new Set([
  'ecf50f20-e1c6-4e29-8a6a-27881215438e', // Sales/Designer — SketchUp만, 건축 무관
  '3a1c8b5f-27bf-44bb-b670-69ec25844a84', // IT Helpdesk — 경력 문맥 히트, CAD 실무 아님
  'dd34f803-be72-45e0-9f1d-08ed9440f755', // 마케팅 전공 — SketchUp 나열만, 건축 전공 요건 미달
])

function scoreProfile(p) {
  if (EXCLUDE_IDS.has(p.id)) return null
  if ((p.yoe_months ?? 0) > 48) return null // 10–14M 밴드 — 시니어 미스매치 컷(PI 전례)
  if ([p.position, ...(p.desired_roles || [])].filter(Boolean).some((x) => DEV_POS.has(x))) return null
  const hay = hayOf(p)
  if (!HARD.test(hay)) return null
  if (MECH_ONLY.test(hay) && !DOMAIN.test(hay)) return null
  let s = 1
  if (DOMAIN.test(hay)) s += 2
  if (/revit|archicad|archi cad/.test(hay)) s += 2
  if (/autocad|auto cad/.test(hay)) s += 1
  return s
}

const firstName = (n) => String(n || '').trim().split(/\s+/).slice(-1)[0] || 'bạn'
const strip = (s) => String(s).replace(/<[^>]+>/g, '')

const INTRO = {
  public: 'Nhà tuyển dụng của <b>Zest</b> — công ty Hàn Quốc chuyên về kiến trúc bền vững, tư vấn chứng nhận công trình xanh và mô phỏng năng lượng tòa nhà — đã xem hồ sơ của bạn trên FYI và <b>gửi cho bạn vị trí này</b> vì kỹ năng CAD/kỹ thuật xây dựng của bạn phù hợp với yêu cầu.',
  private: 'Đội ngũ FYI đã xem xét toàn bộ hồ sơ đã đăng ký và <b>chọn bạn vào danh sách đề cử</b> cho vị trí này tại <b>Zest</b> — công ty Hàn Quốc chuyên về kiến trúc bền vững, tư vấn chứng nhận công trình xanh và mô phỏng năng lượng tòa nhà — vì kỹ năng CAD/kỹ thuật xây dựng của bạn phù hợp với yêu cầu.',
}
const BLURB = 'Vị trí dành cho ứng viên mới tốt nghiệp hoặc có 1–3 năm kinh nghiệm ngành Kiến trúc/Xây dựng — sử dụng AutoCAD (biết Revit/ArchiCAD là lợi thế), làm việc tại HCM/Đà Nẵng/Hà Nội, lương 10–14 triệu ₫. Bạn sẽ được tham gia các dự án công trình xanh và mô phỏng năng lượng — lĩnh vực đang phát triển nhanh của ngành xây dựng.'
const PRIORITY = {
  public: 'Vì đây là lời mời trực tiếp từ nhà tuyển dụng, hồ sơ của bạn sẽ được <b>ưu tiên xem xét</b> khi ứng tuyển. Chỉ cần <b>1 chạm</b> — CV đã đăng ký của bạn sẽ được gửi tự động.',
  private: 'Hồ sơ của bạn đang ở chế độ riêng tư — nếu bạn ứng tuyển ngay, CV của bạn sẽ được gửi kèm lời giới thiệu từ FYI và được <b>ưu tiên xem xét</b>. Chỉ cần <b>1 chạm</b> — CV đã đăng ký của bạn sẽ được gửi tự động.',
}
const FOOTER = {
  public: 'Bạn nhận được email này vì đã đăng ký hồ sơ công khai trên FYI.',
  private: 'Bạn nhận được email này vì đã đăng ký hồ sơ trên FYI.',
}
const SUBJECT = {
  public: '[FYI] Zest đã xem hồ sơ của bạn và mời bạn ứng tuyển — Thiết kế kiến trúc & CAD',
  private: '[FYI] Bạn được chọn vào danh sách đề cử — Nhân viên thiết kế kiến trúc & CAD tại Zest',
}
const META_VI = 'HCM/Đà Nẵng/Hà Nội · Fresher–3 năm · 10–14tr ₫'

function emailHtml(name, url, job, frame, unsubUrl) {
  const logo = job.logo_url
    ? `<img src="${esc(job.logo_url)}" width="44" height="44" alt="" style="width:44px;height:44px;border-radius:10px;object-fit:cover;background:#f0ebe3;display:block">`
    : `<div style="width:44px;height:44px;border-radius:10px;background:#fff0e6;color:#ff6000;font-weight:800;font-size:16px;text-align:center;line-height:44px">Z</div>`
  return `<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;background:#faf9f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1a1612">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#faf9f7"><tr><td align="center" style="padding:28px 16px">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px">
  <tr><td style="padding-bottom:18px"><img src="https://salary-fyi.com/fyi-logo.png" height="24" alt="FYI" style="height:24px;width:auto;display:block"></td></tr>
  <tr><td style="font-size:15px;line-height:1.6;color:#1a1612;padding-bottom:6px">Chào ${esc(firstName(name))},</td></tr>
  <tr><td style="font-size:14px;line-height:1.65;color:#4a443c;padding-bottom:18px">
    ${INTRO[frame]}
  </td></tr>
  <tr><td style="padding-bottom:14px">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#fff;border:1px solid #eee5da;border-radius:14px"><tr>
      <td width="44" style="padding:14px 0 14px 14px;vertical-align:middle">${logo}</td>
      <td style="padding:14px 14px 14px 12px;vertical-align:middle">
        <div style="font-size:12px;color:#8a8073;margin-bottom:3px">${esc(job.company)}</div>
        <div style="font-size:14.5px;font-weight:700;color:#1a1612;line-height:1.35">${esc(job.title)}</div>
        <div style="font-size:12px;color:#b0691a;margin-top:3px">${esc(META_VI)}</div>
      </td>
    </tr></table>
  </td></tr>
  <tr><td style="font-size:14px;line-height:1.65;color:#4a443c;padding-bottom:6px">
    ${BLURB}
  </td></tr>
  <tr><td style="font-size:14px;line-height:1.65;color:#4a443c;padding-bottom:6px">
    ${PRIORITY[frame]}
  </td></tr>
  <tr><td align="center" style="padding:16px 0 6px">
    <a href="${url}" style="display:inline-block;background:#ff6000;color:#fff;font-weight:700;font-size:15px;text-decoration:none;padding:14px 30px;border-radius:12px">Ứng tuyển 1 chạm →</a>
  </td></tr>
  <tr><td align="center" style="font-size:12.5px;padding-bottom:4px"><a href="${SITE}/ktc/jobs/${job.id}" style="color:#8a8073">Xem mô tả công việc đầy đủ →</a></td></tr>
  <tr><td style="font-size:11.5px;color:#a89f92;text-align:center;line-height:1.5;padding-top:20px">
    ${FOOTER[frame]}<br>— Đội ngũ FYI · <a href="https://salary-fyi.com/jobs" style="color:#a89f92">salary-fyi.com/jobs</a>
    &nbsp;·&nbsp;<a href="${unsubUrl}" style="color:#a89f92;text-decoration:underline">Hủy đăng ký</a>
  </td></tr>
</table></td></tr></table></body></html>`
}

function emailText(name, url, job, frame, unsubUrl) {
  return `Chào ${firstName(name)},

${strip(INTRO[frame])}

${job.title} — ${job.company} (${META_VI})

${strip(BLURB)}

${strip(PRIORITY[frame])}

${url}

Xem mô tả đầy đủ: ${SITE}/ktc/jobs/${job.id}

${strip(FOOTER[frame])}
— Đội ngũ FYI · salary-fyi.com/jobs
Hủy đăng ký: ${unsubUrl}`
}

async function main() {
  const { data: jobRows } = await sb.from('jobs')
    .select('id,title,company,role,location,logo_url,is_active')
    .eq('source_id', JOB_SOURCE_ID).limit(1)
  const job = jobRows?.[0]
  if (!job || !job.is_active) { console.error(`공고 없음/비활성: ${JOB_SOURCE_ID}`); process.exit(1) }
  console.log(`공고: ${job.company} — ${job.title} (${job.id})`)

  const resend = new Resend(env.RESEND_API_KEY)
  const campOf = (frame) => `${campaign}-${frame}`
  const url = (userId, camp) => `${SITE}/api/resume/recommend?t=${makeToken(userId, camp)}&j=${job.id}`
  const unsubFor = (userId, camp) => `${SITE}/api/coldmail/unsub?t=${makeToken(userId, camp)}`

  if (testTo) {
    const { data: rows } = await sb.from('user_profiles').select('id,email,full_name').ilike('email', testTo).limit(1)
    const p = rows?.[0]
    if (!p) { console.error(`프로필 없음: ${testTo}`); process.exit(1) }
    const camp = campOf('public')
    const u = url(p.id, camp), un = unsubFor(p.id, camp)
    console.log('수신:', p.email, '\n랜딩 URL:', u)
    const { data, error } = await resend.emails.send({
      from: RESEND_FROM, to: p.email, subject: SUBJECT.public,
      text: emailText(p.full_name, u, job, 'public', un), html: emailHtml(p.full_name, u, job, 'public', un),
    })
    if (error) { console.error('발송 실패:', error); process.exit(1) }
    console.log('✅ 테스트 발송 완료:', data?.id)
    return
  }

  const [recs, apps, unsubs, todays, pool] = await Promise.all([
    fetchAll(() => sb.from('job_recommendations').select('user_id,to_email').eq('job_id', job.id).order('id')),
    fetchAll(() => sb.from('job_applications').select('user_id').eq('job_id', job.id).order('id')),
    fetchAll(() => sb.from('events').select('user_id').eq('event', 'coldmail_unsub').not('user_id', 'is', null).order('id')),
    fetchAll(() => sb.from('job_recommendations').select('user_id,to_email')
      .gte('created_at', new Date().toISOString().slice(0, 10)).order('id')),
    fetchAll(() => sb.from('user_profiles')
      .select('id,email,full_name,position,desired_roles,headline,skills,yoe_months,location,experiences,resume_summary,resume_url,is_resume_public')
      .not('email', 'is', null).not('resume_url', 'is', null)
      .order('created_at', { ascending: false })),
  ])
  const sentUser = new Set(recs.map((r) => r.user_id).filter(Boolean))
  const sentEmail = new Set(recs.map((r) => (r.to_email || '').toLowerCase()).filter(Boolean))
  const appliedUser = new Set(apps.map((a) => a.user_id).filter(Boolean))
  const unsubSet = new Set(unsubs.map((r) => r.user_id))
  const todayUsers = new Set(todays.map((r) => r.user_id))
  const todayEmails = new Set(todays.map((r) => (r.to_email || '').toLowerCase()).filter(Boolean))

  const seen = new Set()
  const cohort = []
  for (const p of pool) {
    if (!p.resume_url || !p.email || /likelion/i.test(p.email)) continue
    const e = p.email.toLowerCase()
    if (seen.has(e)) continue
    if (sentUser.has(p.id) || sentEmail.has(e) || appliedUser.has(p.id)) continue
    if (unsubSet.has(p.id) || todayUsers.has(p.id) || todayEmails.has(e)) continue
    if (ABROAD.test(String(p.location || ''))) continue
    const score = scoreProfile(p)
    if (score == null) continue
    seen.add(e)
    cohort.push({ p, score, frame: p.is_resume_public ? 'public' : 'private' })
  }
  cohort.sort((a, b) => b.score - a.score)

  const nPub = cohort.filter((x) => x.frame === 'public').length
  console.log(`대상: ${cohort.length}명 (풀 ${pool.length}명 중) — 공개 ${nPub} / 비공개 ${cohort.length - nPub}`)
  for (const { p, score, frame } of cohort) {
    console.log(`  [${score}·${frame}] ${p.full_name} <${p.email}> — ${p.position || '?'} · ${Math.round((p.yoe_months || 0) / 12 * 10) / 10}y · ${p.location || '?'}`)
  }

  if (!doSend) { console.log('\n(dry-run — 실발송하려면 --send)'); return }

  const list = maxN ? cohort.slice(0, maxN) : cohort
  let ok = 0
  for (const { p, frame } of list) {
    const camp = campOf(frame)
    const u = url(p.id, camp), un = unsubFor(p.id, camp)
    const { error } = await resend.emails.send({
      from: RESEND_FROM, to: p.email, subject: SUBJECT[frame],
      text: emailText(p.full_name, u, job, frame, un), html: emailHtml(p.full_name, u, job, frame, un),
      headers: { 'List-Unsubscribe': `<${un}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
    })
    if (error) { console.error(`실패 ${p.email}:`, error.message || error); continue }
    await sb.from('job_recommendations').upsert([{
      user_id: p.id, to_email: p.email, job_id: job.id,
      job_title: job.title, job_company: job.company, sent_by: 'coldmail', kind: 'recommend', status: 'sent',
    }], { onConflict: 'user_id,job_id', ignoreDuplicates: true })
    await sb.from('events').insert([{
      event: 'recommend_sent', page: '/scripts/zest-cad-recommend-coldmail',
      meta: { campaign: camp, job_ids: [job.id], frame }, user_id: p.id,
    }])
    ok++
    await sleep(400)
  }
  console.log(`✅ 발송 완료: ${ok}/${list.length}`)
}

main().catch((e) => { console.error(e); process.exit(1) })
