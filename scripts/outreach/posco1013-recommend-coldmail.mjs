// POSCO DX VIETNAM(V187) Java Developer recommend 2차 — 9/19 112 + 9/29 6 발송·지원 70 후 "3명 더 필요" 요청(10/13), 10/13 발송.
// JD: Java + Spring(Boot) 3년+ · HTML/CSS/JS(ES6+) · React or Vue · REST API · MySQL/PostgreSQL · 영어 또는 한국어 기본 소통 · onsite Quận 7(Cobi Tower I) · 급여 협의.
// 10/13 실측(scripts/tmp/posco1013-java-pool-measure.mjs): V187 기발송·기지원 제외 Java/Spring 키워드 839 → 원 게이트(24m+ × HCMC권/미기재) 잔여 19(대부분 9/19 이후 신규 가입) + 타지역(HN/ĐN/기타) 24m+ 100 = 119. 1~2년 HCMC(77)는 JD 미달로 제외.
// 게이트(유저 지시 10/13 "더 보내봐 일단 호치민 이주랑 19명 정도"): Java/Spring 키워드 × 24m+ × 전지역(타지역은 Quận 7 온사이트 명시로 자기선별) · 당일 타 공고 기수신자 제외 = 하루 1통. 정렬: HCMC 우선 + Spring/FE/KO 가점.
// 표준: 1인1통 · unsub/블랙리스트 전역 제외 · 공개/비공개 프레임 · 발송 전 coldmailTemplates 등록.
//
//   node scripts/outreach/posco1013-recommend-coldmail.mjs                 # dry-run
//   node scripts/outreach/posco1013-recommend-coldmail.mjs --send           # 119
import { Resend } from 'resend'
import { sb, env, fetchAll, fetchBlacklist } from './lib.mjs'
import { makeToken } from '../../lib/campaignToken.js'

const args = process.argv.slice(2)
const flag = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? (args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true) : d }
const doSend = args.includes('--send')
const maxN = flag('max', null) ? parseInt(flag('max'), 10) : null
const SITE = String(flag('site', env.NEXT_PUBLIC_SITE_URL || 'https://salary-fyi.com')).replace(/\/$/, '')
const RESEND_FROM = env.RESEND_FROM || 'FYI <hello@salary-fyi.com>'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const esc = (s) => String(s || '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
const firstName = (n) => String(n || '').trim().split(/\s+/).slice(-1)[0] || 'bạn'
const strip = (s) => String(s).replace(/<[^>]+>/g, '')

// ── 대상 선정 헬퍼 (posco1013-java-pool-measure 와 동일) ──
const expTitles = (p) => (Array.isArray(p.experiences) ? p.experiences.map((e) => `${e.title || e.position || ''}`).join(' | ') : '')
const exp = (p) => (Array.isArray(p.experiences) ? p.experiences.map((e) => `${e.title || e.position || ''} ${e.company || ''} ${e.description || ''}`).join(' ') : '')
const txt = (p) => (JSON.stringify(p.skills || '') + ' ' + String(p.position || '') + ' ' + String(p.headline || '') + ' ' + JSON.stringify(p.desired_roles || '') + ' ' + JSON.stringify(p.resume_summary || '') + ' ' + exp(p)).toLowerCase()
const roles = (p) => [p.position, ...(p.desired_roles || [])].filter(Boolean)
const y = (p) => p.yoe_months ?? 0
const javaRe = /\bjava\b|spring ?boot|spring framework|\bspring\b|\bjsp\b|hibernate|mybatis/i
const springRe = /spring ?boot|spring framework|\bspring\b|mybatis|hibernate/i
const feRe = /\breact\b|react\.?js|\bvue\b|vue\.?js|angular/i
const dbRe = /mysql|postgres|oracle|mssql|sql server|mariadb/i
const restRe = /rest ?api|restful|spring mvc|microservice/i
const koOk = (p) => (!!String(p.korean_cert || '').trim() && !/^(none|no|없음|-|n\/a)$/i.test(String(p.korean_cert).trim())) || /(korean|tiếng hàn|topik|한국어)/i.test(p.__t)
const enOk = (p) => !!String(p.english_cert || '').trim() && !/^(none|no|없음|-|n\/a)$/i.test(String(p.english_cert).trim())
const hcmRe = /(h[ồo]\s*ch[íi]\s*minh|hcm|sài gòn|sai gon|saigon|thủ đức|thu duc|bình thạnh|binh thanh|bình dương|binh duong|đồng nai|dong nai|biên hòa|bien hoa|long an|호치민|호찌민|hóc môn|gò vấp|tân bình|tân phú|bình tân|phú nhuận|củ chi|nhà bè|bình chánh|quận \d|district \d|tphcm|tp\.?\s*hcm)/i
const hcmOk = (p) => { const l = String(p.location || ''); return !l.trim() || hcmRe.test(l) }
const javaTitle = (p) => /\bjava\b|spring/i.test(expTitles(p)) || /java/i.test(roles(p).join(' '))

const GROUPS = [
  {
    gkey: 'java', camp: 'posco1013-recommend-java', jobKey: 'V187',
    label: { vi: 'Java Developer', ko: 'Java/Spring 키워드 × 24m+ × 전지역(HCMC 잔여 19 + 타지역 100) · V187 기발송·기지원 제외' },
    pick: (p) => (javaRe.test(p.__t) && y(p) >= 24 ? 1 + (hcmOk(p) ? 5 : 0) + (springRe.test(p.__t) ? 3 : 0) + (feRe.test(p.__t) ? 2 : 0) + (koOk(p) ? 2 : 0) + (javaTitle(p) ? 2 : 0) + (restRe.test(p.__t) ? 1 : 0) + (dbRe.test(p.__t) ? 1 : 0) + (enOk(p) ? 1 : 0) + (y(p) >= 36 ? 1 : 0) : null),
  },
]

// ── 공고·카피 (vi 실발송) — 9/19 카피 재사용, 경력 요건은 FYI 공고 표기(3년+)로, 온사이트 Quận 7 명시해 타지역 자기선별 ──
const CO = 'POSCO DX VIETNAM'
const JOBS = {
  V187: {
    id: 'd2cd358f-69c9-4a9e-8225-40f88f92349f', company: CO, initial: 'P', meta: 'Onsite · Quận 7, TP.HCM (Cobi Tower I) · T2–T6 · Lương thỏa thuận',
    intro: `<b>POSCO DX VIETNAM</b> — trung tâm phát triển offshore (ODC) làm việc trực tiếp với trụ sở Hàn Quốc của tập đoàn POSCO — đang tuyển thêm <b>Java Developer</b> qua FYI (làm việc <b>onsite tại Quận 7, TP.HCM</b>). Công việc: phát triển, kiểm thử và sửa lỗi ứng dụng doanh nghiệp theo tài liệu thiết kế từ HQ Hàn Quốc; phối hợp với PM phía Hàn Quốc và Team Leader tại Việt Nam; sử dụng <b>GitHub Copilot</b> và Jira trong quy trình phát triển. Yêu cầu: <b>tối thiểu 3 năm kinh nghiệm Java &amp; Spring Framework (Spring Boot)</b>, thành thạo HTML5/CSS3/JavaScript (ES6+), có kinh nghiệm <b>React.js hoặc Vue.js</b>, thiết kế &amp; tích hợp <b>REST API</b>, làm việc với <b>MySQL/PostgreSQL</b>, quen Git·Jira·Confluence, <b>giao tiếp cơ bản bằng tiếng Anh hoặc tiếng Hàn</b>. Ưu tiên: kinh nghiệm thiết kế hệ thống IT, dùng AI hỗ trợ code (GitHub Copilot), LLM/LangChain/LlamaIndex, biết tiếng Hàn. Phúc lợi: thưởng tháng 13, review lương hàng năm, 12 ngày phép, bảo hiểm tai nạn PTI 24/7, khám sức khỏe định kỳ, <b>cơ hội đào tạo tại Hàn Quốc</b>. Văn phòng: Cobi Tower I, số 5 Hoàng Văn Thái, phường Tân Mỹ, TP.HCM.`,
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
const ONETAP = 'Chỉ cần <b>1 chạm</b> — CV đã đăng ký của bạn sẽ được gửi tự động.'

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
  const { data: jobRows, error: jobErr } = await sb.from('jobs').select('id,title,company,location,logo_url,is_active,source_id').in('id', jobIds)
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

  const [pool, unsubs, recs, apps, bl, todays] = await Promise.all([
    fetchAll(() => sb.from('user_profiles')
      .select('id,email,full_name,position,desired_roles,headline,major,yoe_months,location,english_cert,korean_cert,is_resume_public,skills,resume_summary,experiences')
      .not('email', 'is', null).not('resume_url', 'is', null).order('created_at', { ascending: false })),
    fetchAll(() => sb.from('events').select('user_id').eq('event', 'coldmail_unsub').not('user_id', 'is', null).order('id')),
    fetchAll(() => sb.from('job_recommendations').select('user_id,job_id').in('job_id', jobIds).order('id')),
    fetchAll(() => sb.from('job_applications').select('user_id,job_id').in('job_id', jobIds).order('id')),
    fetchBlacklist(),
    fetchAll(() => sb.from('job_recommendations').select('user_id').gte('created_at', new Date().toISOString().slice(0, 10)).order('id')),
  ])
  const todaySet = new Set(todays.map((r) => r.user_id))
  const unsubSet = new Set(unsubs.map((r) => r.user_id))
  const recSet = new Set(recs.map((r) => `${r.user_id}|${r.job_id}`))
  const appliedSet = new Set(apps.map((a) => `${a.user_id}|${a.job_id}`))

  const seen = new Set()
  const assigned = []
  let skipRec = 0, skipToday = 0
  for (const p of pool) {
    if (!p.email || /likelion/i.test(p.email)) continue
    const e = p.email.toLowerCase()
    if (seen.has(e) || unsubSet.has(p.id) || bl.has(p)) continue
    if (todaySet.has(p.id)) { skipToday++; continue } // 당일 타 공고 기수신자 제외 — 하루 1통
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
  console.log(`  ── 합계: ${assigned.length}명 (제외: 해당 공고 기수신/기지원 ${skipRec} · 당일 타 공고 기수신 ${skipToday})`)
  if (!doSend) {
    const rows = [...assigned].sort((a, b) => b.s - a.s)
    console.log(`\n── 상위 15 표본 (총 ${rows.length}) ── HCMC권/미기재 ${rows.filter((r) => hcmOk(r.p)).length} · 타지역 ${rows.filter((r) => !hcmOk(r.p)).length} · Spring ${rows.filter((r) => springRe.test(r.p.__t)).length} · React/Vue ${rows.filter((r) => feRe.test(r.p.__t)).length} · Java 직함 ${rows.filter((r) => javaTitle(r.p)).length} · 3y+ ${rows.filter((r) => y(r.p) >= 36).length} · KO ${rows.filter((r) => koOk(r.p)).length}`)
    for (const { p, s, frame } of rows.slice(0, 15))
      console.log(`  [${s}·${frame}] ${p.full_name} <${p.email}> · ${p.position || '?'} · ${Math.round((p.yoe_months || 0) / 12 * 10) / 10}y · ${String(p.location || '위치?').slice(0, 22)} · ${expTitles(p).slice(0, 60)}`)
    console.log('\n(dry-run — 실발송하려면 --send)')
    return
  }

  let targets = [...assigned].sort((a, b) => b.s - a.s)
  if (maxN) targets = targets.slice(0, maxN)
  let ok = 0, fail = 0
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
      event: 'recommend_sent', page: '/scripts/posco1013-recommend-coldmail',
      meta: { campaign: camp, job_ids: [jd.id], frame, group: g.gkey }, user_id: p.id,
    }])
    ok++
    if (ok % 25 === 0) console.log(`  …${ok}/${targets.length}`)
    await sleep(400)
  }
  console.log(`\n✅ 발송 완료: ${ok}/${targets.length} (실패 ${fail})`)
}

main().catch((e) => { console.error(e); process.exit(1) })
