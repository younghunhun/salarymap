// OpenGraph Labs Data Operator(V215) 10/5 recommend — 영훈 지시(TO 20, 1기처럼 IT 학과·AI 관심·성실한 남학생) → Len 게재.
// JD: 남성 · IT 전공 학생 or AI 관심 · 10/19(월)~10/30(금) 평일 8:30~17:30 전일 참석 필수(중도 이탈 절대 불가) · 19~20 이론교육·21~30 현장 데이터 수집 ·
//     공장/창고에서 장비 착용 작업 · HCMC · 완주 시 3.5M(영훈 메시지는 3.0M — 불일치 확인 필요) · 점심/교통 자비.
// 10/5 실측(scripts/tmp/opengraph-dataop-pool-measure.mjs): 기지원 20건(10/3 Threads/FB 유입) 제외.
//   student = 재학생(졸업 2027+ or 학생 헤드라인×2026+) × HCMC권/미기재 × IT/AI 전공 or 개발·AI 직군 → 159
//   grad    = 2025~2026 졸업 × 경력 ≤12m × IT/AI × HCMC권/미기재(학기 중 수업 충돌 없음) → 558   합 717(유저 10/5 결정)
// 검증 불가 요건(남성·전일 참석·현장 장비 착용·자비)은 메일 상단 체크리스트로 자기선별. 캐스케이드 student → grad. 1인1통·unsub 전역 제외·공개/비공개.
//
//   node scripts/outreach/opengraph1005-recommend-coldmail.mjs                       # dry-run
//   node scripts/outreach/opengraph1005-recommend-coldmail.mjs --send [--group <gkey>] [--max N]
import { Resend } from 'resend'
import { sb, env, fetchAll } from './lib.mjs'
import { makeToken } from '../../lib/campaignToken.js'

const args = process.argv.slice(2)
const flag = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? (args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true) : d }
const doSend = args.includes('--send')
const onlyGroup = flag('group', null)
const maxN = flag('max', null) ? parseInt(flag('max'), 10) : null
const SITE = String(flag('site', env.NEXT_PUBLIC_SITE_URL || 'https://salary-fyi.com')).replace(/\/$/, '')
const RESEND_FROM = env.RESEND_FROM || 'FYI <hello@salary-fyi.com>'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const esc = (s) => String(s || '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
const firstName = (n) => String(n || '').trim().split(/\s+/).slice(-1)[0] || 'bạn'
const strip = (s) => String(s).replace(/<[^>]+>/g, '')

// ── 대상 선정 헬퍼 (실측 스크립트와 동일) ──
const norm = (v) => (Array.isArray(v) ? v.join(' ') : String(v || ''))
const txt = (p) => {
  const exp = Array.isArray(p.experiences) ? p.experiences.map((e) => `${e.title || e.position || ''} ${e.company || ''} ${e.description || ''}`).join(' ') : ''
  return [p.position, p.headline, norm(p.desired_roles), JSON.stringify(p.skills || ''), exp, JSON.stringify(p.resume_summary || ''), p.major, p.university].join(' ').toLowerCase()
}
const roles = (p) => [p.position, ...(p.desired_roles || [])].filter(Boolean)
const y = (p) => p.yoe_months ?? 0
const gy = (p) => parseInt(p.graduation_year) || 0
const itMajorRe = /(computer|software|information technology|công nghệ thông tin|cntt|khoa học máy tính|kỹ thuật phần mềm|hệ thống thông tin|data science|khoa học dữ liệu|artificial intelligence|trí tuệ nhân tạo|\bai\b|machine learning|robotics|mechatronic|cơ điện tử|automation|tự động hóa|electronics|điện tử|embedded|iot|cyber|an toàn thông tin|mạng máy tính|kỹ thuật máy tính)/i
const itMajor = (p) => itMajorRe.test(String(p.major || ''))
const devRole = (p) => roles(p).some((r) => /(backend|frontend|fullstack|full-stack|mobile|developer|devops|\bqa\b|data|ai|ml|software|web|game|embedded|security|sysadmin|it support)/i.test(String(r)))
const aiText = (p) => /(artificial intelligence|machine learning|deep learning|computer vision|\bai\b|trí tuệ nhân tạo|học máy|robot|physical ai|data collection|data labeling|annotation|gán nhãn)/i.test(p.__t)
const student = (p) => gy(p) >= 2027 || (/(student|sinh viên|đang học|năm [1-4]|year [1-4]|undergraduate)/i.test(String(p.headline || '')) && gy(p) >= 2026)
const fresh = (p) => gy(p) >= 2025 && y(p) <= 12
const inHcmc = (p) => /(h[ồo]\s*ch[íi]\s*minh|hcm|sài gòn|sai gon|saigon|thủ đức|thu duc|bình thạnh|bình dương|binh duong|đồng nai|dong nai|biên hòa|bien hoa|long an)/i.test(String(p.location || ''))
const south = (p) => inHcmc(p) || !String(p.location || '').trim()
const itAi = (p) => itMajor(p) || devRole(p)
const bonus = (p) => (aiText(p) ? 2 : 0) + (itMajor(p) ? 1 : 0) + (inHcmc(p) ? 1 : 0)

const JOB = { id: '1badf7ad-60b1-4b25-ba01-56d0e0562ad3', code: 'V215', company: 'OpenGraph Labs', initial: 'O', meta: 'Onsite · TP.HCM (nhà máy/kho) · 19/10–30/10 · T2–T6 8:30–17:30 · 3.500.000 ₫ khi hoàn thành · Nam · Sinh viên IT/quan tâm AI' }
const GROUPS = [
  { gkey: 'student', camp: 'opengraph1005-recommend-student', label: { ko: '재학생(졸업 2027+ or 학생 헤드라인×2026+) × HCMC권/미기재 × IT/AI 전공 or 개발·AI 직군(실측 159)' },
    pick: (p) => (student(p) && south(p) && itAi(p) ? 10 + bonus(p) : null) },
  { gkey: 'grad', camp: 'opengraph1005-recommend-grad', label: { ko: '2025~2026 졸업 × 경력 ≤12m × IT/AI × HCMC권/미기재, 학기 충돌 없음(실측 558)' },
    pick: (p) => (!student(p) && fresh(p) && south(p) && itAi(p) ? 1 + bonus(p) : null) },
]

// ── 카피 (vi 실발송) — 검증 불가 요건을 상단 체크리스트로 명시 ──
const INTRO = '<b>OpenGraph Labs</b> — công ty công nghệ Hàn Quốc phát triển dữ liệu cho <b>Physical AI</b> (AI vật lý) — đang tuyển <b>20 bạn Data Operator</b> qua FYI cho dự án thu thập dữ liệu kéo dài 2 tuần tại TP.HCM. Lịch: <b>19/10–20/10</b> đào tạo kiến thức Physical AI do chuyên gia OpenGraph Labs trực tiếp hướng dẫn, <b>21/10–30/10</b> tham gia thu thập dữ liệu thực tế. Công việc chính: <b>đeo thiết bị thu thập dữ liệu và tác nghiệp trực tiếp tại nhà máy / kho</b> (có vận động thể lực). Thứ 2–6, 8:30–17:30 (nghỉ trưa 1 tiếng). <b>Lương 3.500.000 ₫ khi hoàn thành toàn bộ dự án</b>; ăn trưa và đi lại tự túc.'
const CHECKLIST = `<div style="background:#fff7f0;border:1px solid #ffd9bf;border-radius:12px;padding:14px 16px;margin:4px 0 14px">
  <div style="font-size:13.5px;font-weight:700;color:#b0691a;margin-bottom:8px">Các điều kiện bắt buộc FYI không thể kiểm tra qua hồ sơ — vui lòng chỉ ứng tuyển khi bạn đáp ứng đủ cả 4:</div>
  <ul style="margin:0;padding-left:20px;font-size:14px;line-height:1.7;color:#4a443c">
    <li>Nam</li>
    <li>Sinh viên / mới tốt nghiệp ngành IT, hoặc thực sự quan tâm đến AI</li>
    <li><b>Tham gia ĐẦY ĐỦ toàn bộ 10 ngày làm việc từ 19/10 đến 30/10</b> (thứ 2–6, 8:30–17:30) — <b>dự án tuyệt đối không chấp nhận nghỉ giữa chừng hoặc vắng mặt</b></li>
    <li>Sẵn sàng làm việc tại nhà máy / kho, đeo thiết bị thu thập dữ liệu và vận động trong cả ngày</li>
  </ul>
  <div style="font-size:13px;color:#8a8073;margin-top:8px">Nếu bạn đang có lịch học hoặc lịch thi trùng với thời gian trên, vui lòng không ứng tuyển.</div>
</div>`
const CHECKLIST_TXT = `Các điều kiện bắt buộc FYI không thể kiểm tra qua hồ sơ — vui lòng chỉ ứng tuyển khi bạn đáp ứng đủ cả 4:
- Nam
- Sinh viên / mới tốt nghiệp ngành IT, hoặc thực sự quan tâm đến AI
- Tham gia ĐẦY ĐỦ toàn bộ 10 ngày làm việc từ 19/10 đến 30/10 (thứ 2–6, 8:30–17:30) — dự án tuyệt đối không chấp nhận nghỉ giữa chừng hoặc vắng mặt
- Sẵn sàng làm việc tại nhà máy / kho, đeo thiết bị thu thập dữ liệu và vận động trong cả ngày
Nếu bạn đang có lịch học hoặc lịch thi trùng với thời gian trên, vui lòng không ứng tuyển.`
const SUBJECT = {
  public: '[FYI] Bạn được chọn vào danh sách đề cử gửi OpenGraph Labs — Data Operator (Physical AI, 2 tuần, TP.HCM)',
  private: '[FYI] Bạn được chọn vào danh sách đề cử — Data Operator tại OpenGraph Labs (Physical AI, 2 tuần, TP.HCM)',
}
const HOOK = 'Đội ngũ FYI đã xem xét toàn bộ hồ sơ đã đăng ký và <b>chọn bạn vào danh sách đề cử</b> cho vị trí dưới đây — hồ sơ của bạn thuộc nhóm sinh viên / mới tốt nghiệp ngành IT mà dự án đang tìm.'
const BENEFIT = {
  public: `<b>Trong tuần này</b>, FYI sẽ gửi danh sách đề cử trực tiếp cho người phụ trách tuyển dụng của OpenGraph Labs. Hồ sơ của bạn đang ở chế độ công khai nên sẽ được gửi kèm danh sách. Nếu bạn ứng tuyển ngay, CV của bạn sẽ được <b>ưu tiên xem xét</b> cùng lời giới thiệu từ FYI.`,
  private: `<b>Trong tuần này</b>, FYI sẽ gửi danh sách đề cử trực tiếp cho người phụ trách tuyển dụng của OpenGraph Labs. Hồ sơ của bạn đang ở chế độ riêng tư — nếu bạn ứng tuyển ngay, CV của bạn sẽ được gửi kèm lời giới thiệu từ FYI và được <b>ưu tiên xem xét</b>.`,
}
const ONETAP = 'Chỉ cần <b>1 chạm</b> — CV đã đăng ký của bạn sẽ được gửi tự động. Chỉ tiêu 20 bạn, ưu tiên hồ sơ ứng tuyển sớm.'

function jobCard(job) {
  const logo = job.logo_url
    ? `<img src="${esc(job.logo_url)}" width="44" height="44" alt="" style="width:44px;height:44px;border-radius:10px;object-fit:cover;background:#f0ebe3;display:block">`
    : `<div style="width:44px;height:44px;border-radius:10px;background:#fff0e6;color:#ff6000;font-weight:800;font-size:16px;text-align:center;line-height:44px">${JOB.initial}</div>`
  return `<table width="100%" cellpadding="0" cellspacing="0" style="background:#fff;border:1px solid #eee5da;border-radius:14px;margin-bottom:8px"><tr>
    <td width="44" style="padding:14px 0 14px 14px;vertical-align:middle">${logo}</td>
    <td style="padding:14px 14px 14px 12px;vertical-align:middle">
      <div style="font-size:12px;color:#8a8073;margin-bottom:3px">${esc(JOB.company)}</div>
      <div style="font-size:14.5px;font-weight:700;color:#1a1612;line-height:1.35">${esc(job.title.trim())}</div>
      <div style="font-size:12px;color:#b0691a;margin-top:3px">${esc(JOB.meta)}</div>
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
  <tr><td>${CHECKLIST}</td></tr>
  <tr><td style="font-size:14px;line-height:1.65;color:#4a443c;padding-bottom:14px">${HOOK}</td></tr>
  <tr><td style="padding-bottom:10px">${jobCard(job)}</td></tr>
  <tr><td style="font-size:14px;line-height:1.65;color:#4a443c;padding-top:4px">${BENEFIT[frame]} ${ONETAP}</td></tr>
  <tr><td align="center" style="padding:16px 0 6px">
    <a href="${url}" style="display:inline-block;background:#ff6000;color:#fff;font-weight:700;font-size:15px;text-decoration:none;padding:14px 30px;border-radius:12px">Ứng tuyển 1 chạm →</a>
  </td></tr>
  <tr><td align="center" style="font-size:12.5px;padding-bottom:4px"><a href="${SITE}/ktc/jobs/${JOB.id}" style="color:#8a8073">Xem mô tả công việc đầy đủ →</a></td></tr>
  <tr><td style="font-size:11.5px;color:#a89f92;text-align:center;line-height:1.5;padding-top:20px">
    Bạn nhận được email này vì đã đăng ký hồ sơ trên FYI.<br>— Đội ngũ FYI · <a href="https://salary-fyi.com/jobs" style="color:#a89f92">salary-fyi.com/jobs</a>
    &nbsp;·&nbsp;<a href="${unsubUrl}" style="color:#a89f92;text-decoration:underline">Hủy đăng ký</a>
  </td></tr>
</table></td></tr></table></body></html>`
}

function emailText(name, url, unsubUrl, job, frame) {
  return `Chào ${firstName(name)},

${strip(INTRO)}

${CHECKLIST_TXT}

${strip(HOOK)}

- ${job.title.trim()} (${JOB.company}) — ${JOB.meta} — ${SITE}/ktc/jobs/${JOB.id}

${strip(BENEFIT[frame])} ${strip(ONETAP)}

${url}

Bạn nhận được email này vì đã đăng ký hồ sơ trên FYI.
— Đội ngũ FYI · salary-fyi.com/jobs
Hủy đăng ký: ${unsubUrl}`
}

async function main() {
  const { data: job, error: jobErr } = await sb.from('jobs').select('id,title,company,location,logo_url,is_active,source_id').eq('id', JOB.id).single()
  if (jobErr || !job || !job.is_active) { console.error('공고 없음/비활성:', jobErr?.message || JOB.id); process.exit(1) }
  if (job.source_id !== JOB.code) { console.error(`source_id 불일치: ${JOB.code} vs DB ${job.source_id}`); process.exit(1) }

  const resend = new Resend(env.RESEND_API_KEY)
  const url = (userId, camp) => `${SITE}/api/resume/recommend?t=${makeToken(userId, camp)}&j=${JOB.id}`
  const unsubFor = (userId, camp) => `${SITE}/api/coldmail/unsub?t=${makeToken(userId, camp)}`

  const [pool, unsubs, recs, apps] = await Promise.all([
    fetchAll(() => sb.from('user_profiles')
      .select('id,email,full_name,position,desired_roles,headline,major,university,graduation_year,yoe_months,location,is_resume_public,skills,resume_summary,experiences')
      .not('email', 'is', null).not('resume_url', 'is', null).order('created_at', { ascending: false })),
    fetchAll(() => sb.from('events').select('user_id').eq('event', 'coldmail_unsub').not('user_id', 'is', null).order('id')),
    fetchAll(() => sb.from('job_recommendations').select('user_id').eq('job_id', JOB.id).order('id')),
    fetchAll(() => sb.from('job_applications').select('user_id').eq('job_id', JOB.id).order('id')),
  ])
  const unsubSet = new Set(unsubs.map((r) => r.user_id))
  const sentSet = new Set([...recs, ...apps].map((r) => r.user_id))

  const seen = new Set(); const assigned = []; let skipRec = 0
  for (const p of pool) {
    if (!p.email || /likelion/i.test(p.email)) continue
    const e = p.email.toLowerCase()
    if (seen.has(e) || unsubSet.has(p.id)) continue
    p.__t = txt(p)
    for (const g of GROUPS) {
      const s = g.pick(p)
      if (s == null) continue
      if (sentSet.has(p.id)) { skipRec++; break }
      seen.add(e)
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
  console.log(`  ── 합계: ${assigned.length}명 (제외: 기수신/기지원 ${skipRec})`)
  if (!doSend) {
    for (const g of GROUPS) {
      const rows = assigned.filter((r) => r.g.gkey === g.gkey).sort((a, b) => b.s - a.s)
      if (!rows.length) continue
      console.log(`\n── ${g.gkey} 상위 10 표본 (총 ${rows.length}) ──`)
      for (const { p, s, frame } of rows.slice(0, 10))
        console.log(`  [${s}·${frame}] ${p.full_name} <${p.email}> · ${p.position || '?'} · 졸업 ${gy(p) || '?'} · ${Math.round((p.yoe_months || 0) / 12 * 10) / 10}y · ${String(p.major || '-').slice(0, 22)} · ${String(p.location || '위치?').slice(0, 18)}`)
    }
    console.log('\n(dry-run — 실발송하려면 --send, 그룹 한정 --group <gkey>)')
    return
  }

  let targets = assigned
  if (onlyGroup) targets = targets.filter((r) => r.g.gkey === onlyGroup)
  if (maxN) targets = targets.slice(0, maxN)
  let ok = 0, fail = 0; const okBy = {}
  for (const { p, g, frame } of targets) {
    const camp = `${g.camp}-${frame}`
    const u = url(p.id, camp), un = unsubFor(p.id, camp)
    const { error } = await resend.emails.send({
      from: RESEND_FROM, to: p.email, subject: SUBJECT[frame],
      html: emailHtml(p.full_name, u, un, job, frame), text: emailText(p.full_name, u, un, job, frame),
      headers: { 'List-Unsubscribe': `<${un}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
    })
    if (error) { console.error(`실패 ${p.email}:`, error.message || error); fail++; continue }
    await sb.from('job_recommendations').upsert([{
      user_id: p.id, to_email: p.email, job_id: JOB.id,
      job_title: job.title, job_company: job.company, sent_by: 'coldmail', kind: 'recommend', status: 'sent',
    }], { onConflict: 'user_id,job_id', ignoreDuplicates: true })
    const { error: evErr } = await sb.from('events').insert([{
      event: 'recommend_sent', page: '/scripts/opengraph1005-recommend-coldmail',
      meta: { campaign: camp, job_ids: [JOB.id], frame, group: g.gkey }, user_id: p.id,
    }])
    if (evErr) console.error(`이벤트 기록 실패 ${p.email}:`, evErr.message)
    ok++; okBy[g.gkey] = (okBy[g.gkey] || 0) + 1
    if (ok % 50 === 0) console.log(`  …${ok}/${targets.length}`)
    await sleep(400)
  }
  console.log(`\n✅ 발송 완료: ${ok}/${targets.length} (실패 ${fail}) — ${Object.entries(okBy).map(([k, v]) => `${k} ${v}`).join(' · ')}`)
}

main().catch((e) => { console.error(e); process.exit(1) })
