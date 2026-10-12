// CodeBailey 10/12 AI Agent Developer(R220) recommend — Len 게재(10/12 18:09), 10/12 발송.
// JD: HCM·HN·ĐN 온사이트 · 2명 · AI 지식 · Python/Java 코딩 · 경력·영어 무관(주니어 OK, 코딩 테스트) · 우대 LLM/RAG/AI Agent · 급여 협의.
// 10/12 실측(scripts/tmp/codebailey1012-ai-agent-pool-measure.mjs): AI 시그널(직군 AI/ML/DS or 경력 직함) × 3대 도시권/미기재 × Py|Java 201 → 당일 겹침 1 제외 200(A1 LLM 키워드 113 + A2 88). 확장층 비AI 개발직군×LLM 키워드(167)·Py/Java 미기재(25)·타지역(28) 제외.
// 게이트(유저 지시 10/12 "200명 발송"): 지역 = HCM·HN·ĐN권 명시 or 미기재 · 경력 게이트 없음 · AI 시그널 = 경력 직함 or 직군 AI/ML/DS · Python or Java 텍스트 보유 · 당일 타 공고 기수신자 제외 = 하루 1통.
// 공고 status 는 draft 지만 KTC 공고 전부 draft+active 로 운영 중 — 상태 변경 불필요.
// 표준: 1인1통 · unsub/블랙리스트 전역 제외 · 공개/비공개 프레임 · 발송 전 coldmailTemplates 등록.
//
//   node scripts/outreach/codebailey1012-recommend-coldmail.mjs                 # dry-run
//   node scripts/outreach/codebailey1012-recommend-coldmail.mjs --send           # 200
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

// ── 대상 선정 헬퍼 (codebailey1012-ai-agent-pool-measure 와 동일) ──
const expTitles = (p) => (Array.isArray(p.experiences) ? p.experiences.map((e) => `${e.title || e.position || ''}`).join(' | ') : '')
const exp = (p) => (Array.isArray(p.experiences) ? p.experiences.map((e) => `${e.title || e.position || ''} ${e.company || ''} ${e.description || ''}`).join(' ') : '')
const txt = (p) => (JSON.stringify(p.skills || '') + ' ' + String(p.position || '') + ' ' + String(p.headline || '') + ' ' + JSON.stringify(p.desired_roles || '') + ' ' + JSON.stringify(p.resume_summary || '') + ' ' + exp(p) + ' ' + String(p.major || '')).toLowerCase()
const roles = (p) => [p.position, ...(p.desired_roles || [])].filter(Boolean)
const y = (p) => p.yoe_months ?? 0
const cityOk = (p) => { const l = String(p.location || ''); return !l.trim() || /(h[ồo]\s*ch[íi]\s*minh|hcm|sài gòn|sai gon|saigon|thủ đức|thu duc|bình thạnh|bình dương|binh duong|đồng nai|dong nai|biên hòa|long an|호치민|호찌민|hóc môn|gò vấp|tân bình|tân phú|bình tân|phú nhuận|củ chi|nhà bè|bình chánh|quận \d|district \d|tphcm|tp\.?\s*hcm|hà nội|ha noi|hanoi|hn\b|하노이|cầu giấy|đống đa|hai bà trưng|thanh xuân|hoàng mai|long biên|nam từ liêm|bắc từ liêm|đà nẵng|da nang|danang|다낭|hải châu|thanh khê|sơn trà|liên chiểu|cẩm lệ|ngũ hành sơn)/i.test(l) }
const koOk = (p) => (!!String(p.korean_cert || '').trim() && !/^(none|no|없음|-|n\/a)$/i.test(String(p.korean_cert).trim())) || /(korean|tiếng hàn|topik|한국어)/i.test(p.__t)
const aiRe = /(\bai\b|artificial intelligence|trí tuệ nhân tạo|machine learning|\bml\b|deep learning|data scien|nlp|computer vision|\bllm\b|\brag\b|langchain|llamaindex|agentic|ai agent|chatbot|generative|genai|gpt|transformer|pytorch|tensorflow|hugging ?face|fine.?tun|lora|embedding|vector db|openai|neural)/i
const aiRole = (p) => roles(p).some((r) => /^(ai|ml|machine|data scien|nlp|computer vision)/i.test(r)) || aiRe.test(roles(p).join(' '))
const aiTitle = (p) => aiRe.test(expTitles(p))
const llmSig = (p) => /(\bllm\b|\brag\b|langchain|llamaindex|agentic|ai agent|multi.?agent|chatbot|generative|genai|gpt|openai|claude|gemini|fine.?tun|lora|embedding|vector|prompt)/i.test(p.__t)
const pyJava = (p) => /(python|\bjava\b)/i.test(p.__t)
const py = (p) => /python/i.test(p.__t)
const csMajor = (p) => /(computer|công nghệ thông tin|cong nghe thong tin|khoa học máy tính|khoa hoc may tinh|software|phần mềm|phan mem|information tech|\bit\b|data|trí tuệ nhân tạo|ai\b|điện tử|electronic|toán|math)/i.test(String(p.major || ''))

const GROUPS = [
  {
    gkey: 'aiagent', camp: 'codebailey1012-recommend-aiagent', jobKey: 'R220',
    label: { vi: 'AI Agent Developer', ko: 'AI 시그널(경력 직함/직군 AI·ML·DS) × Python|Java × HCM·HN·ĐN권/미기재 · 경력 무관' },
    pick: (p) => (cityOk(p) && pyJava(p) && (aiTitle(p) || aiRole(p)) ? 1 + (aiTitle(p) ? 3 : 0) + (aiRole(p) ? 1 : 0) + (llmSig(p) ? 3 : 0) + (py(p) ? 1 : 0) + (csMajor(p) ? 1 : 0) + (koOk(p) ? 1 : 0) : null),
  },
]

// ── 공고·카피 (vi 실발송) — 공고 본문 그대로 요약 ──
const CO = 'CodeBailey'
const JOBS = {
  R220: {
    id: '65a157f3-0677-4819-af4c-ba6fdbd7a84d', company: CO, initial: 'C', meta: 'HCM / HN / Đà Nẵng · Onsite · 2 vị trí · Không yêu cầu số năm kinh nghiệm & tiếng Anh · Lương theo năng lực',
    intro: `<b>CodeBailey</b> — doanh nghiệp chuyên về AI Agent, thiết kế, xây dựng và vận hành các AI Agent "làm việc trên nền dữ liệu" (thu thập dữ liệu từ ERP, DB, tài liệu, web, email → tri thức hóa RAG → multi-agent thao tác hệ thống nội bộ; nền tảng Bailey RAG chạy 100% on-premise) — đang tuyển <b>AI Agent Developer</b> (2 vị trí) qua FYI. Công việc: phát triển AI Agent; tham gia xây dựng các thành phần thu thập dữ liệu, RAG, multi-agent theo định hướng dự án; phát triển, kiểm thử và cải thiện chất lượng chức năng được giao; phối hợp triển khai dự án AI cho khách hàng khu vực công, doanh nghiệp, y tế và nghiên cứu. <b>Yêu cầu</b>: có kiến thức về AI; có kinh nghiệm/kỹ năng lập trình <b>Python, Java</b>; <b>không yêu cầu số năm kinh nghiệm, không yêu cầu giỏi tiếng Anh</b> — điều quan trọng nhất là năng lực phát triển thực sự (có bài test đánh giá năng lực). <b>Ưu tiên</b>: kinh nghiệm hoặc quan tâm đến LLM, RAG, AI Agent; tự học công nghệ mới nhanh, chủ động giải quyết vấn đề. Lương trao đổi theo năng lực (open cho cả Junior), làm việc on-site tại HCM / Hà Nội / Đà Nẵng.`,
  },
}

const SUBJECT = {
  public: (company, role) => `[FYI] Bạn được chọn vào danh sách đề cử gửi ${company} — ${role}`,
  private: (company, role) => `[FYI] Bạn được chọn vào danh sách đề cử — ${role} tại ${company}`,
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
    if (todaySet.has(p.id)) { skipToday++; continue } // 당일 타 공고(STS·FMC 인턴·AUTONSI) 기수신자 제외 — 하루 1통
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
    console.log(`\n── 상위 15 표본 (총 ${rows.length}) ── 직함 ${rows.filter((r) => aiTitle(r.p)).length} · LLM/RAG/Agent ${rows.filter((r) => llmSig(r.p)).length} · Python ${rows.filter((r) => py(r.p)).length} · KO ${rows.filter((r) => koOk(r.p)).length} · <1y ${rows.filter((r) => y(r.p) < 12).length}`)
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
      event: 'recommend_sent', page: '/scripts/codebailey1012-recommend-coldmail',
      meta: { campaign: camp, job_ids: [jd.id], frame, group: g.gkey }, user_id: p.id,
    }])
    ok++
    if (ok % 25 === 0) console.log(`  …${ok}/${targets.length}`)
    await sleep(400)
  }
  console.log(`\n✅ 발송 완료: ${ok}/${targets.length} (실패 ${fail})`)
}

main().catch((e) => { console.error(e); process.exit(1) })
