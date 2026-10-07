// First Marketing Company 10/5 그래픽 디자이너 2공고 recommend — Len 게재 당일 소싱. HCMC 온사이트(19N Nguyễn Hữu Cảnh).
//   V217 Thiết kế đồ họa (Korean Speaking)  한국어 TOPIK4 우대(필수 아님) · PS/AI/InDesign · 포트폴리오 필수 · 경력 무관 · 10~16tr
//   V218 Thiết kế đồ họa                     동일, 한국어 요건 없음
// 10/5 실측(scripts/tmp/fmc-graphic-pool-measure.mjs): 그래픽 시그널 × HCMC권/미기재 코어 561(Design 직군 227 + 텍스트만 334).
//   한국어 시그널 25(Design 직군 4, TOPIK4+ 9=전원 비Design) → V217 전원 / Design 직군 × 한국어 없음 223 → V218 코어.
//   텍스트만 매치 313은 확장층(미발송, 유저 결정 대기).
// 캐스케이드(1인1통) = ko(V217) → gen(V218). 지역 = HCM권 명시 or 미기재. 빈도 게이트 없음(10/2 지시).
// 10/7 2차(ko만): 10/5 이후 신규 가입 + 지역 정규식 누락 보정 + FORCE_KO 수동 1명 → --group ko 로 V217 추가 발송.
// 표준: 1인1통 · unsub 전역 제외 · 공개/비공개 프레임 · 발송 전 coldmailTemplates 등록.
//
//   node scripts/outreach/fmc1005-recommend-coldmail.mjs                       # dry-run
//   node scripts/outreach/fmc1005-recommend-coldmail.mjs --send [--group <gkey>] [--max N]
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

// ── 대상 선정 헬퍼 (fmc-graphic-pool-measure 와 동일) ──
const norm = (v) => (Array.isArray(v) ? v.join(' ') : String(v || ''))
const txt = (p) => {
  const exp = Array.isArray(p.experiences) ? p.experiences.map((e) => `${e.title || e.position || ''} ${e.company || ''} ${e.description || ''}`).join(' ') : ''
  return [p.position, p.headline, norm(p.desired_roles), JSON.stringify(p.skills || ''), exp, JSON.stringify(p.resume_summary || ''), p.major].join(' ').toLowerCase()
}
const roles = (p) => [p.position, ...(p.desired_roles || [])].filter(Boolean)
const y = (p) => p.yoe_months ?? 0
const isDesign = (p) => roles(p).includes('Design')
// 엄격: "thiết kế"(디자인 일반)·"ai"(베트남어 단어) 과대매칭 제외
const graphicRe = /(graphic design|graphic designer|graphic\b|đồ họa|do hoa|thiết kế đồ họa|visual design|brand design|print design|key visual|illustrat)/i
const adobeRe = /(photoshop|illustrator|indesign|adobe)/i
const psRe = /photoshop/i, aiRe = /illustrator/i, idRe = /indesign/i
const koRe = /(korean|tiếng hàn|topik|한국어)/i
const koSig = (p) => !!p.korean_cert || koRe.test(p.__t)
const topik4 = (p) => /(topik\s*(ii\s*)?(level\s*)?[4-6]|topik\s*[4-6]|[4-6]\s*급|advanced|고급|fluent|c1|c2)/i.test(String(p.korean_cert || ''))
// 10/7 보정: 한글 표기(호치민/호찌민)·외곽 구(Hóc Môn, Gò Vấp, Tân Bình…)·'Quận N' 누락으로 한국어 가능자 26명이 타지역 처리되던 것 수정
const hcmA = (p) => /(h[ồo]\s*ch[íi]\s*minh|hcm|sài gòn|sai gon|saigon|thủ đức|thu duc|bình thạnh|bình dương|binh duong|đồng nai|dong nai|biên hòa|bien hoa|long an|호치민|호찌민|hóc môn|hoc mon|gò vấp|go vap|tân bình|tan binh|tân phú|tan phu|bình tân|binh tan|phú nhuận|phu nhuan|củ chi|cu chi|nhà bè|nha be|bình chánh|binh chanh|quận \d|district \d)/i.test(String(p.location || ''))
const hcmOk = (p) => hcmA(p) || !String(p.location || '').trim()
const hasPortfolio = (p) => !!p.portfolio_url || /(portfolio|behance|dribbble)/i.test(p.__t)
const graphic = (p) => graphicRe.test(p.__t) || adobeRe.test(p.__t)
const core = (p) => hcmOk(p) && (isDesign(p) || graphic(p))
const tools = (p) => (psRe.test(p.__t) ? 1 : 0) + (aiRe.test(p.__t) ? 1 : 0) + (idRe.test(p.__t) ? 1 : 0)

// 10/7 수동 ko 편입: korean_cert 빈칸이지만 KTC CV 요약(llm_summary)에 '한국어 우대 요건 충족' — V218 지원자, V217 미수신
const FORCE_KO = new Set(['nhuhuynhnguyen29@gmail.com'])

// ── 그룹 (캐스케이드 = 위에서부터 1인1통) ──
const GROUPS = [
  {
    gkey: 'ko', camp: 'fmc1005-recommend-ko', jobKey: 'V217',
    label: { vi: 'Thiết kế đồ họa (Korean Speaking)', ko: '그래픽/디자인 시그널 × HCMC권 × 한국어 시그널(인증 or 텍스트)' },
    pick: (p) => (core(p) && (koSig(p) || FORCE_KO.has(String(p.email || '').toLowerCase())) ? 1 + (topik4(p) ? 3 : p.korean_cert ? 1 : 0) + (isDesign(p) ? 2 : 0) + tools(p) + (hasPortfolio(p) ? 1 : 0) + (hcmA(p) ? 1 : 0) : null),
  },
  {
    gkey: 'gen', camp: 'fmc1005-recommend-gen', jobKey: 'V218',
    label: { vi: 'Thiết kế đồ họa', ko: 'Design 직군 × HCMC권 (한국어 시그널 없음) — 텍스트만 매치 313은 확장층 미발송' },
    // Design 직군이어도 그래픽/Adobe 텍스트 없는 UI/UX·영상 전업(39)은 제외 — 10/5 보고 기준 223
    pick: (p) => (core(p) && isDesign(p) && graphic(p) ? 1 + tools(p) + (hasPortfolio(p) ? 1 : 0) + (hcmA(p) ? 1 : 0) : null),
  },
]

// ── 공고·카피 (vi 실발송) — 필수/우대/근무 조건 전부 명시해 자기선별 유도 ──
const CO = 'First Marketing Company'
const FMC_INTRO = '<b>First Marketing Company</b> — doanh nghiệp Hàn Quốc về Digital Marketing, Influencer Marketing &amp; Brand Communication cho các thương hiệu Hàn Quốc và quốc tế (văn phòng 19N Nguyễn Hữu Cảnh, TP.HCM)'
const WORK = 'Công việc: thiết kế đồ họa theo từng dự án, từ thông tin sản phẩm &amp; Design Brief xây dựng concept và layout, thiết kế hình ảnh theo mục đích từng dự án, tiếp nhận feedback – chỉnh sửa – gửi file final đúng hạn.'
const MUST = 'Thành thạo <b>Adobe Photoshop, Illustrator và InDesign</b>, nắm vững Color Theory, Typography, Layout &amp; Composition, có tư duy thẩm mỹ và ý tưởng sáng tạo riêng, <b>bắt buộc có Portfolio</b>. Không yêu cầu số năm kinh nghiệm.'
const TERMS = 'Lương 10–16 triệu ₫/tháng. Giờ làm: 8h–17h thứ 2–6 và 8h–12h thứ 7 (nghỉ chiều thứ 7, chủ nhật, lễ Tết). Quyền lợi: BHXH/BHYT/BHTN đầy đủ, lương tháng 13 &amp; thưởng lễ Tết, du lịch 1–2 lần/năm, ngày phép sinh nhật, văn phòng có cà phê &amp; đồ ăn nhẹ.'
const JOBS = {
  V217: {
    id: '02c64540-273f-42b2-ac0f-b2c30315673d', company: CO, initial: 'F', meta: 'Onsite · Nguyễn Hữu Cảnh, TP.HCM · Không yêu cầu kinh nghiệm · 10–16 triệu ₫ · Ưu tiên tiếng Hàn',
    intro: `${FMC_INTRO} — đang tuyển <b>Thiết kế đồ họa (Korean Speaking)</b> qua FYI. ${WORK} <b>Yêu cầu</b>: ${MUST} <b>Ưu tiên</b>: biết tiếng Hàn, đọc hiểu và trao đổi được nội dung cơ bản liên quan công việc (tối thiểu TOPIK 4). ${TERMS}`,
  },
  V218: {
    id: 'd86744f2-0e7c-4288-9ead-3d1f09fa07fb', company: CO, initial: 'F', meta: 'Onsite · Nguyễn Hữu Cảnh, TP.HCM · Không yêu cầu kinh nghiệm · 10–16 triệu ₫',
    intro: `${FMC_INTRO} — đang tuyển <b>Thiết kế đồ họa</b> qua FYI. ${WORK} <b>Yêu cầu</b>: ${MUST} ${TERMS}`,
  },
}

const SUBJECT = {
  public: (company, role) => `[FYI] Bạn được chọn vào danh sách đề cử gửi ${company} — ${role} (TP.HCM)`,
  private: (company, role) => `[FYI] Bạn được chọn vào danh sách đề cử — ${role} tại ${company} (TP.HCM)`,
}
const HOOK = 'Đội ngũ FYI đã xem xét toàn bộ hồ sơ đã đăng ký và <b>chọn bạn vào danh sách đề cử</b> cho vị trí dưới đây — hồ sơ của bạn phù hợp với yêu cầu của vị trí này.'
const BENEFIT = {
  public: (company) => `<b>Trong tuần này</b>, FYI sẽ gửi danh sách đề cử trực tiếp cho người phụ trách tuyển dụng của ${company}. Hồ sơ của bạn đang ở chế độ công khai nên sẽ được gửi kèm danh sách. Nếu bạn ứng tuyển ngay, CV của bạn sẽ được <b>ưu tiên xem xét</b> cùng lời giới thiệu từ FYI.`,
  private: (company) => `<b>Trong tuần này</b>, FYI sẽ gửi danh sách đề cử trực tiếp cho người phụ trách tuyển dụng của ${company}. Hồ sơ của bạn đang ở chế độ riêng tư — nếu bạn ứng tuyển ngay, CV của bạn sẽ được gửi kèm lời giới thiệu từ FYI và được <b>ưu tiên xem xét</b>.`,
}
const ONETAP = 'Chỉ cần <b>1 chạm</b> — CV đã đăng ký của bạn sẽ được gửi tự động. Nhớ đính kèm link Portfolio trong hồ sơ FYI của bạn.'

function jobCard(jd, job) {
  const logo = job.logo_url
    ? `<img src="${esc(job.logo_url)}" width="44" height="44" alt="" style="width:44px;height:44px;border-radius:10px;object-fit:cover;background:#f0ebe3;display:block">`
    : `<div style="width:44px;height:44px;border-radius:10px;background:#fff0e6;color:#ff6000;font-weight:800;font-size:16px;text-align:center;line-height:44px">${jd.initial}</div>`
  return `<table width="100%" cellpadding="0" cellspacing="0" style="background:#fff;border:1px solid #eee5da;border-radius:14px;margin-bottom:8px"><tr>
    <td width="44" style="padding:14px 0 14px 14px;vertical-align:middle">${logo}</td>
    <td style="padding:14px 14px 14px 12px;vertical-align:middle">
      <div style="font-size:12px;color:#8a8073;margin-bottom:3px">${esc(jd.company)}</div>
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
  <tr><td style="font-size:14px;line-height:1.65;color:#4a443c;padding-top:4px">${BENEFIT[frame](jd.company)} ${ONETAP}</td></tr>
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

- ${job.title.trim()} (${jd.company}) — ${jd.meta} — ${SITE}/ktc/jobs/${jd.id}

${strip(BENEFIT[frame](jd.company))} ${strip(ONETAP)}

${url}

Bạn nhận được email này vì đã đăng ký hồ sơ trên FYI.
— Đội ngũ FYI · salary-fyi.com/jobs
Hủy đăng ký: ${unsubUrl}`
}

async function main() {
  const jobIds = Object.values(JOBS).map((j) => j.id)
  const { data: jobRows, error: jobErr } = await sb.from('jobs')
    .select('id,title,company,location,logo_url,is_active,source_id').in('id', jobIds)
  if (jobErr) { console.error('공고 조회 실패:', jobErr.message); process.exit(1) }
  const jobById = Object.fromEntries((jobRows || []).map((j) => [j.id, j]))
  for (const [k, jd] of Object.entries(JOBS)) {
    const j = jobById[jd.id]
    if (!j || !j.is_active) { console.error(`공고 없음/비활성: ${k} (${jd.id})`); process.exit(1) }
    if (j.source_id !== k) { console.error(`source_id 불일치: ${k} vs DB ${j.source_id} (${jd.id})`); process.exit(1) }
  }

  const resend = new Resend(env.RESEND_API_KEY)
  const url = (userId, camp, jobId) => `${SITE}/api/resume/recommend?t=${makeToken(userId, camp)}&j=${jobId}`
  const unsubFor = (userId, camp) => `${SITE}/api/coldmail/unsub?t=${makeToken(userId, camp)}`

  const [pool, unsubs, recs, apps] = await Promise.all([
    fetchAll(() => sb.from('user_profiles')
      .select('id,email,full_name,position,desired_roles,headline,major,yoe_months,location,english_cert,korean_cert,is_resume_public,skills,resume_summary,experiences,portfolio_url')
      .not('email', 'is', null).not('resume_url', 'is', null).order('created_at', { ascending: false })),
    fetchAll(() => sb.from('events').select('user_id').eq('event', 'coldmail_unsub').not('user_id', 'is', null).order('id')),
    fetchAll(() => sb.from('job_recommendations').select('user_id,job_id').in('job_id', jobIds).order('id')),
    fetchAll(() => sb.from('job_applications').select('user_id,job_id').in('job_id', jobIds).order('id')),
  ])
  const unsubSet = new Set(unsubs.map((r) => r.user_id))
  const recSet = new Set(recs.map((r) => `${r.user_id}|${r.job_id}`))
  const appliedSet = new Set(apps.map((a) => `${a.user_id}|${a.job_id}`))

  const seen = new Set()
  const assigned = []
  let skipRec = 0
  for (const p of pool) {
    if (!p.email || /likelion/i.test(p.email)) continue
    const e = p.email.toLowerCase()
    if (seen.has(e) || unsubSet.has(p.id)) continue
    p.__t = txt(p)
    for (const g of GROUPS) {
      const s = g.pick(p)
      if (s == null) continue
      const jobId = JOBS[g.jobKey].id
      if (appliedSet.has(`${p.id}|${jobId}`) || recSet.has(`${p.id}|${jobId}`)) { skipRec++; continue }
      seen.add(e)
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
  console.log(`  ── 합계: ${assigned.length}명 (제외: 해당 공고 기수신/기지원 ${skipRec})`)
  if (!doSend) {
    for (const g of GROUPS) {
      const rows = assigned.filter((r) => r.g.gkey === g.gkey).sort((a, b) => b.s - a.s)
      if (!rows.length) continue
      console.log(`\n── ${g.gkey} 상위 10 표본 (총 ${rows.length}) ──`)
      for (const { p, s, frame } of rows.slice(0, 10))
        console.log(`  [${s}·${frame}] ${p.full_name} <${p.email}> · ${p.position || '?'} · ${Math.round((p.yoe_months || 0) / 12 * 10) / 10}y · ${String(p.location || '위치?').slice(0, 22)} · ko=${String(p.korean_cert || '-').slice(0, 12)}${hasPortfolio(p) ? ' · 포폴' : ''}`)
    }
    console.log('\n(dry-run — 실발송하려면 --send, 그룹 한정 --group <gkey>)')
    return
  }

  let targets = assigned
  if (onlyGroup) targets = targets.filter((r) => r.g.gkey === onlyGroup)
  if (maxN) targets = targets.slice(0, maxN)
  let ok = 0, fail = 0
  const okBy = {}
  for (const { p, g, frame } of targets) {
    const jd = JOBS[g.jobKey]
    const job = jobById[jd.id]
    const camp = `${g.camp}-${frame}`
    const u = url(p.id, camp, jd.id), un = unsubFor(p.id, camp)
    const { error } = await resend.emails.send({
      from: RESEND_FROM, to: p.email, subject: SUBJECT[frame](jd.company, g.label.vi),
      html: emailHtml(p.full_name, u, un, jd, job, frame), text: emailText(p.full_name, u, un, jd, job, frame),
      headers: { 'List-Unsubscribe': `<${un}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
    })
    if (error) { console.error(`실패 ${p.email}:`, error.message || error); fail++; continue }
    await sb.from('job_recommendations').upsert([{
      user_id: p.id, to_email: p.email, job_id: jd.id,
      job_title: job.title, job_company: job.company, sent_by: 'coldmail', kind: 'recommend', status: 'sent',
    }], { onConflict: 'user_id,job_id', ignoreDuplicates: true })
    await sb.from('events').insert([{
      event: 'recommend_sent', page: '/scripts/fmc1005-recommend-coldmail',
      meta: { campaign: camp, job_ids: [jd.id], frame, group: g.gkey }, user_id: p.id,
    }])
    ok++; okBy[g.jobKey] = (okBy[g.jobKey] || 0) + 1
    if (ok % 25 === 0) console.log(`  …${ok}/${targets.length}`)
    await sleep(400)
  }
  console.log(`\n✅ 발송 완료: ${ok}/${targets.length} (실패 ${fail}) — ${Object.entries(okBy).map(([k, v]) => `${k} ${v}`).join(' · ')}`)
}

main().catch((e) => { console.error(e); process.exit(1) })
