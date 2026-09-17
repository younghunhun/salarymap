// Burning Bros 9/17 신규 3공고 recommend — Len FYI 등록 당일 발송 (V183 BA · V184 FE · V185 QA, 전부 onsite HCM).
//   V184 Frontend Developer (1y+ Web production · 영어 Upper-Int · 10-20M)
//   V185 QA/QC Engineer     (1-2y testing manual/automated · 8-15M)
//   V183 Business Analyst   (Fresher/Junior · 영어 필수 · 8-15M)
// 대상 = 풀봇 코어 기준 그대로(9/17 실측 FE 94 · QA 57 · BA 46): 직군 exact 매치 × JD 하드컷
//   FE: role Frontend × yoe 12m+ × english_cert 有 / QA: role QA × yoe 12m+ / BA: role Business Analyst × english_cert 有
// 유저 결정 "코어 다 발송" — HCM 하드게이트 없음(onsite라 카피에 TP.HCM 명시해 자기선별), 티어링 없음.
// 캐스케이드 = 희소 풀 순(BA→QA→FE), 1인 1통. 표준: 당일 recommend 기수신 제외 · unsub 전역 제외 · 공개/비공개 프레임.
//
//   node scripts/outreach/burningbros0917-recommend-coldmail.mjs                       # dry-run
//   node scripts/outreach/burningbros0917-recommend-coldmail.mjs --send [--group ba|qa|fe] [--max N] [--gap-hours N]
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

// ── 대상 선정 — 풀봇(lib/poolEstimator.js) 코어와 동일: 직군 exact 매치 + JD 하드컷 ──
const roleSet = (p) => new Set([p.position, ...(p.desired_roles || [])].filter(Boolean))
const hasRole = (p, r) => roleSet(p).has(r)
const y = (p) => p.yoe_months ?? 0
// HCM 가점(하드게이트 아님) — onsite HCM 공고라 발송 우선순위·정렬용
const hcmA = (p) => (/(h[ồo]\s*ch[íi]\s*minh|hcm|sài gòn|sai gon|saigon|thủ đức|thu duc|bình thạnh|binh thanh)/i.test(String(p.location || '')) ? 2 : 0)

// 캐스케이드 순서 = 희소 풀 순 (BA 46 < QA 57 < FE 94)
const GROUPS = [
  {
    gkey: 'ba', camp: 'burningbros0917-recommend-ba', jobKey: 'V183',
    label: { vi: 'Business Analyst', ko: 'BA (직군 매치 × 영어인증)' },
    pick: (p) => (hasRole(p, 'Business Analyst') && p.english_cert ? 1 + hcmA(p) + (p.korean_cert ? 1 : 0) : null),
  },
  {
    gkey: 'qa', camp: 'burningbros0917-recommend-qa', jobKey: 'V185',
    label: { vi: 'QA/QC Engineer', ko: 'QA (직군 매치 × 1y+)' },
    pick: (p) => (hasRole(p, 'QA') && y(p) >= 12 ? 1 + hcmA(p) + (p.english_cert ? 1 : 0) : null),
  },
  {
    gkey: 'fe', camp: 'burningbros0917-recommend-fe', jobKey: 'V184',
    label: { vi: 'Frontend Developer', ko: 'FE (직군 매치 × 1y+ × 영어인증)' },
    pick: (p) => (hasRole(p, 'Frontend') && y(p) >= 12 && p.english_cert ? 1 + hcmA(p) : null),
  },
]

// ── 공고·카피 (vi 실발송) — onsite TP.HCM·급여·영어요건 명시해 자기선별 유도 ──
const COMPANY = 'Burning Bros'
const INITIAL = 'B'
const BB_TAIL = ' <b>Burning Bros</b> là công ty phát triển phần mềm tại Việt Nam làm việc với nhiều khách hàng toàn cầu — các thành viên cùng làm việc tại một văn phòng chung (không outsource nhân sự sang công ty khác).'
const JOBS = {
  V184: {
    id: 'dd71bec3-f163-4034-84d4-cedda9ba5383',
    meta: 'Onsite · TP.HCM · 10–20 triệu ₫/tháng · Fresher/Junior',
    intro: '<b>Burning Bros</b> đang tuyển <b>Frontend Developer</b> qua FYI. Công việc: phát triển & bảo trì service theo yêu cầu khách hàng, phối hợp với PM/designer/developer, giao tiếp trực tiếp với khách hàng toàn cầu. Yêu cầu: <b>1+ năm kinh nghiệm production Web Development</b>, quen OOP & design pattern, viết code sạch & tái sử dụng được, <b>tiếng Anh Upper-Intermediate (nói & viết)</b>, nắm cơ bản HTML/CSS/JavaScript. Làm việc onsite tại TP.HCM, lương <b>10–20 triệu ₫/tháng</b>.' + BB_TAIL,
  },
  V185: {
    id: 'f48b0f9f-46f7-474f-809b-a7175bab6ec6',
    meta: 'Onsite · TP.HCM · 8–15 triệu ₫/tháng · 1–2 năm kinh nghiệm',
    intro: '<b>Burning Bros</b> đang tuyển <b>QA/QC Engineer</b> qua FYI. Công việc: xây dựng & thực thi test plan/test case/test script, functional–regression–performance testing, báo cáo kết quả & theo dõi issue cùng team. Yêu cầu: <b>1–2 năm kinh nghiệm software testing (manual/automated)</b>, thành thạo công cụ & phương pháp testing, chú ý chi tiết. Ưu tiên: chứng chỉ ISTQB, tiếng Anh Intermediate, kinh nghiệm Selenium/JIRA. Làm việc onsite tại TP.HCM, lương <b>8–15 triệu ₫/tháng</b>.' + BB_TAIL,
  },
  V183: {
    id: 'f2ce0ad4-a91e-4d05-96d2-24f00c0cbca9',
    meta: 'Onsite · TP.HCM · 8–15 triệu ₫/tháng · Fresher/Junior',
    intro: '<b>Burning Bros</b> đang tuyển <b>Business Analyst</b> qua FYI. Công việc: hỗ trợ Product Manager lên kế hoạch & triển khai product roadmap, tạo wireframe từ yêu cầu, phối hợp với developer để làm rõ requirement & theo dõi tiến độ. Yêu cầu: <b>tiếng Anh xuất sắc (nghe–nói–đọc–viết)</b>, nắm vững business analysis (requirements engineering, phân tích quy trình, tài liệu hóa), hiểu quy trình phát triển phần mềm. Ưu tiên: tiếng Hàn, Agile. <b>Phù hợp fresher/junior</b>. Làm việc onsite tại TP.HCM, lương <b>8–15 triệu ₫/tháng</b>.' + BB_TAIL,
  },
}

const SUBJECT = {
  public: (role) => `[FYI] Bạn được chọn vào danh sách đề cử gửi ${COMPANY} — ${role} (TP.HCM)`,
  private: (role) => `[FYI] Bạn được chọn vào danh sách đề cử — ${role} tại ${COMPANY} (TP.HCM)`,
}
const HOOK = 'Đội ngũ FYI đã xem xét toàn bộ hồ sơ đã đăng ký và <b>chọn bạn vào danh sách đề cử</b> cho vị trí dưới đây — hồ sơ của bạn phù hợp với yêu cầu của vị trí này.'
const BENEFIT = {
  public: `<b>Trong tuần này</b>, FYI sẽ gửi danh sách đề cử trực tiếp cho người phụ trách tuyển dụng của ${COMPANY}. Hồ sơ của bạn đang ở chế độ công khai nên sẽ được gửi kèm danh sách. Nếu bạn ứng tuyển ngay, CV của bạn sẽ được <b>ưu tiên xem xét</b> cùng lời giới thiệu từ FYI.`,
  private: `<b>Trong tuần này</b>, FYI sẽ gửi danh sách đề cử trực tiếp cho người phụ trách tuyển dụng của ${COMPANY}. Hồ sơ của bạn đang ở chế độ riêng tư — nếu bạn ứng tuyển ngay, CV của bạn sẽ được gửi kèm lời giới thiệu từ FYI và được <b>ưu tiên xem xét</b>.`,
}
const ONETAP = 'Chỉ cần <b>1 chạm</b> — CV đã đăng ký của bạn sẽ được gửi tự động.'

function jobCard(jd, job) {
  const logo = job.logo_url
    ? `<img src="${esc(job.logo_url)}" width="44" height="44" alt="" style="width:44px;height:44px;border-radius:10px;object-fit:cover;background:#f0ebe3;display:block">`
    : `<div style="width:44px;height:44px;border-radius:10px;background:#fff0e6;color:#ff6000;font-weight:800;font-size:16px;text-align:center;line-height:44px">${INITIAL}</div>`
  return `<table width="100%" cellpadding="0" cellspacing="0" style="background:#fff;border:1px solid #eee5da;border-radius:14px;margin-bottom:8px"><tr>
    <td width="44" style="padding:14px 0 14px 14px;vertical-align:middle">${logo}</td>
    <td style="padding:14px 14px 14px 12px;vertical-align:middle">
      <div style="font-size:12px;color:#8a8073;margin-bottom:3px">${esc(COMPANY)}</div>
      <div style="font-size:14.5px;font-weight:700;color:#1a1612;line-height:1.35">${esc(job.title.trim())}</div>
      <div style="font-size:12px;color:#b0691a;margin-top:3px">${esc(jd.meta)}</div>
    </td>
  </tr></table>`
}

function emailHtml(name, url, unsubUrl, jd, job, frame) {
  return `<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;background:#faf9f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1a1612">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#faf9f7"><tr><td align="center" style="padding:28px 16px">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px">
  <tr><td style="padding-bottom:18px"><img src="https://salary-fyi.com/fyi-logo.png" height="24" alt="FYI" style="height:24px;width:auto;display:block"></td></tr>
  <tr><td style="font-size:15px;line-height:1.6;color:#1a1612;padding-bottom:6px">Chào ${esc(firstName(name))},</td></tr>
  <tr><td style="font-size:14px;line-height:1.65;color:#4a443c;padding-bottom:14px">${jd.intro}</td></tr>
  <tr><td style="font-size:14px;line-height:1.65;color:#4a443c;padding-bottom:14px">${HOOK}</td></tr>
  <tr><td style="padding-bottom:10px">${jobCard(jd, job)}</td></tr>
  <tr><td style="font-size:14px;line-height:1.65;color:#4a443c;padding-top:4px">${BENEFIT[frame]} ${ONETAP}</td></tr>
  <tr><td align="center" style="padding:16px 0 6px">
    <a href="${url}" style="display:inline-block;background:#ff6000;color:#fff;font-weight:700;font-size:15px;text-decoration:none;padding:14px 30px;border-radius:12px">Ứng tuyển 1 chạm →</a>
  </td></tr>
  <tr><td align="center" style="font-size:12.5px;padding-bottom:4px"><a href="${SITE}/ktc/jobs/${jd.id}" style="color:#8a8073">Xem mô tả công việc đầy đủ →</a></td></tr>
  <tr><td style="font-size:11.5px;color:#a89f92;text-align:center;line-height:1.5;padding-top:20px">
    Bạn nhận được email này vì đã đăng ký hồ sơ trên FYI.<br>— Đội ngũ FYI · <a href="https://salary-fyi.com/jobs" style="color:#a89f92">salary-fyi.com/jobs</a>
    &nbsp;·&nbsp;<a href="${unsubUrl}" style="color:#a89f92;text-decoration:underline">Hủy đăng ký</a>
  </td></tr>
</table></td></tr></table></body></html>`
}

function emailText(name, url, unsubUrl, jd, job, frame) {
  return `Chào ${firstName(name)},

${strip(jd.intro)}

${strip(HOOK)}

- ${job.title.trim()} (${COMPANY}) — ${jd.meta} — ${SITE}/ktc/jobs/${jd.id}

${strip(BENEFIT[frame])} ${strip(ONETAP)}

${url}

Bạn nhận được email này vì đã đăng ký hồ sơ trên FYI.
— Đội ngũ FYI · salary-fyi.com/jobs
Hủy đăng ký: ${unsubUrl}`
}

async function main() {
  const jobIds = Object.values(JOBS).map((j) => j.id)
  const { data: jobRows, error: jobErr } = await sb.from('jobs')
    .select('id,title,company,location,logo_url,is_active').in('id', jobIds)
  if (jobErr) { console.error('공고 조회 실패:', jobErr.message); process.exit(1) }
  const jobById = Object.fromEntries((jobRows || []).map((j) => [j.id, j]))
  for (const [k, jd] of Object.entries(JOBS)) {
    const j = jobById[jd.id]
    if (!j || !j.is_active) { console.error(`공고 없음/비활성: ${k} (${jd.id})`); process.exit(1) }
  }

  const resend = new Resend(env.RESEND_API_KEY)
  const url = (userId, camp, jobId) => `${SITE}/api/resume/recommend?t=${makeToken(userId, camp)}&j=${jobId}`
  const unsubFor = (userId, camp) => `${SITE}/api/coldmail/unsub?t=${makeToken(userId, camp)}`

  const [pool, unsubs, recs, apps, todays] = await Promise.all([
    fetchAll(() => sb.from('user_profiles')
      .select('id,email,full_name,position,desired_roles,yoe_months,location,english_cert,korean_cert,is_resume_public')
      .not('email', 'is', null).not('resume_url', 'is', null).order('created_at', { ascending: false })),
    fetchAll(() => sb.from('events').select('user_id').eq('event', 'coldmail_unsub').not('user_id', 'is', null).order('id')),
    fetchAll(() => sb.from('job_recommendations').select('user_id,job_id').in('job_id', jobIds).order('id')),
    fetchAll(() => sb.from('job_applications').select('user_id,job_id').in('job_id', jobIds).order('id')),
    fetchAll(() => sb.from('job_recommendations').select('user_id,to_email').gte('created_at', sinceIso).order('id')),
  ])
  const unsubSet = new Set(unsubs.map((r) => r.user_id))
  const recSet = new Set(recs.map((r) => `${r.user_id}|${r.job_id}`))
  const appliedSet = new Set(apps.map((a) => `${a.user_id}|${a.job_id}`))
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
      const jobId = JOBS[g.jobKey].id
      if (appliedSet.has(`${p.id}|${jobId}`) || recSet.has(`${p.id}|${jobId}`)) { skipRec++; continue }
      seen.add(e)
      if (todayUsers.has(p.id) || todayEmails.has(e)) { skipToday++; break }
      assigned.push({ p, s, g, frame: p.is_resume_public ? 'public' : 'private' })
      break
    }
  }

  console.log('발송 대상(1인 1통 배정):')
  for (const g of GROUPS) {
    const rows = assigned.filter((r) => r.g.gkey === g.gkey)
    const pub = rows.filter((x) => x.frame === 'public').length
    console.log(`  ${g.gkey} → ${g.jobKey} (${g.label.ko}): ${rows.length}명 (공개 ${pub} / 비공개 ${rows.length - pub})`)
  }
  console.log(`  ── 합계: ${assigned.length}명 (제외: 해당 공고 기수신/기지원 ${skipRec} · 당일 발송 겹침 ${skipToday})`)
  if (!doSend) {
    for (const g of GROUPS) {
      const rows = assigned.filter((r) => r.g.gkey === g.gkey).sort((a, b) => b.s - a.s)
      if (!rows.length) continue
      console.log(`\n── ${g.gkey} 상위 10 ──`)
      for (const { p, s, frame } of rows.slice(0, 10))
        console.log(`  [${s}·${frame}] ${p.full_name} <${p.email}> · ${p.position || '?'} · ${Math.round((p.yoe_months || 0) / 12 * 10) / 10}y · ${String(p.location || '위치?').slice(0, 30)} · en=${p.english_cert || '-'}`)
    }
    console.log('\n(dry-run — 실발송하려면 --send, 그룹 한정 --group <gkey>)')
    return
  }

  let targets = assigned
  if (onlyGroup) targets = targets.filter((r) => r.g.gkey === onlyGroup)
  if (maxN) targets = targets.slice(0, maxN)
  let ok = 0, fail = 0
  for (const { p, g, frame } of targets) {
    const jd = JOBS[g.jobKey]
    const job = jobById[jd.id]
    const camp = `${g.camp}-${frame}`
    const u = url(p.id, camp, jd.id), un = unsubFor(p.id, camp)
    const { error } = await resend.emails.send({
      from: RESEND_FROM, to: p.email, subject: SUBJECT[frame](g.label.vi),
      html: emailHtml(p.full_name, u, un, jd, job, frame), text: emailText(p.full_name, u, un, jd, job, frame),
      headers: { 'List-Unsubscribe': `<${un}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
    })
    if (error) { console.error(`실패 ${p.email}:`, error.message || error); fail++; continue }
    await sb.from('job_recommendations').upsert([{
      user_id: p.id, to_email: p.email, job_id: jd.id,
      job_title: job.title, job_company: job.company, sent_by: 'coldmail', kind: 'recommend', status: 'sent',
    }], { onConflict: 'user_id,job_id', ignoreDuplicates: true })
    await sb.from('events').insert([{
      event: 'recommend_sent', page: '/scripts/burningbros0917-recommend-coldmail',
      meta: { campaign: camp, job_ids: [jd.id], frame, group: g.gkey }, user_id: p.id,
    }])
    ok++
    if (ok % 25 === 0) console.log(`  …${ok}/${targets.length}`)
    await sleep(400)
  }
  console.log(`\n✅ 발송 완료: ${ok}/${targets.length} (실패 ${fail})`)
}

main().catch((e) => { console.error(e); process.exit(1) })
