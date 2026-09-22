// Labtobottle(R206) AI Digital Marketing Developer recommend — 9/22 FYI 등록 당일 발송.
// JD: 한국 하이테크 양조 스타트업(KAIST 화공 출신). AI 기반 마케팅 자동화(생성형 AI API로 SNS 콘텐츠·광고 카피·이미지·영상 제작 워크플로우),
//     SNS(FB/IG/TikTok/YT) 운영·데이터 분석, 웹/랜딩·SEO·GA, 디지털 콘텐츠 디자인(PS/AI/Canva/Figma/CapCut), 베트남 로컬 마케팅·인플루언서.
//     요건: SNS 마케팅 + AI 활용, 영어 또는 한국어, API 연동·데이터 처리, AI API/LLM 사용, ChatGPT/Claude/Gemini 활용, 풀스택 프로젝트 경험, 마케팅·영업 네트워크.
//     HCM/HN/ĐN onsite · 15–20M ₫. 다음 주 다낭 방문 여부가 이 공고 진행에 걸려 있어(호현) 당일 발송.
// 9/22 실측(3개 도시+미기재 × ≤6y): 하이브리드 U1(마케팅×AI×코드 37 ∪ 개발×LLM×마케팅 17 ∪ 마케팅직군×AI 96 ∪ 개발직군×마케팅텍스트 65) 168
//   + 마케팅직군 × 디지털/SNS 텍스트 × 영어or한국어 cert 367 = U2 464. 유저 결정 "영어 혹은 한국어 정도로 가서 464".
//   개발자×LLM(마케팅 무관) 271은 15-20M 밴드·마케팅 비중 미스매치라 제외.
// 캐스케이드 hybrid(정합 점수순) > mkt. 1인1통 · 동일인 2계정 1통 · unsub 전역 제외 · 당일 겹침 제외 · 공개/비공개 프레임. 7일 게이트 미적용.
//
//   node scripts/outreach/labtobottle0922-recommend-coldmail.mjs                       # dry-run
//   node scripts/outreach/labtobottle0922-recommend-coldmail.mjs --send [--group hybrid|mkt] [--max N] [--gap-hours N]
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
const nameKey = (n) => String(n || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd').toLowerCase().replace(/\s+/g, ' ').trim()
const firstName = (n) => String(n || '').trim().split(/\s+/).slice(-1)[0] || 'bạn'
const strip = (s) => String(s).replace(/<[^>]+>/g, '')

const JOB_ID = '402528b3-7bef-4148-a2cf-78c3cae6221e' // Labtobottle AI Digital Marketing Developer (R206)
const ROLE_VI = 'AI Digital Marketing Developer'

// ── 대상 선정 — 3개 도시(+미기재) × ≤6y × (하이브리드 | 디지털 마케터×언어 cert) ──
const norm = (v) => (Array.isArray(v) ? v.join(' ') : String(v || ''))
const txt = (p) => [p.position, p.headline, norm(p.desired_roles), norm(p.skills), Array.isArray(p.experiences) ? p.experiences.map((e) => `${e.title || e.position || ''} ${e.company || ''} ${e.description || ''}`).join(' ') : '', JSON.stringify(p.resume_summary || '')].join(' ').toLowerCase()
const roles = (p) => [p.position, ...(p.desired_roles || [])].filter(Boolean).map(String)
const y = (p) => p.yoe_months ?? 0
const city = (p) => { const s = String(p.location || '').toLowerCase(); if (!s.trim()) return 'blank'
  if (/(h[ồo]\s*ch[íi]\s*minh|hcm|sài gòn|saigon|thủ đức|thu duc|bình thạnh|quận|district|호찌민|호치민)/.test(s)) return 'HCM'
  if (/(hà nội|ha noi|hanoi|hn\b|cầu giấy|cau giay|đống đa|thanh xuân|하노이)/.test(s)) return 'HN'
  if (/(đà nẵng|da nang|danang|다낭)/.test(s)) return 'DN'; return 'other' }
const mktRole = (p) => roles(p).some((r) => /^(marketing|digital marketing|content|growth|seo|social|brand|pr)/i.test(r))
const devRole = (p) => roles(p).some((r) => /^(fullstack|frontend|backend|web|ai\/data|ai|data|mobile|devops)/i.test(r))
const mktTxt = (p) => /(digital marketing|sns|social media|facebook ads|tiktok|instagram|youtube|content marketing|seo|google analytics|\bga4?\b|landing page|performance marketing|meta ads|influencer|kol|short-?form|capcut|canva)/i.test(p.__t)
const aiTxt = (p) => /(chatgpt|openai|\bllm\b|gpt|claude|gemini|generative ai|gen ai|ai tool|midjourney|stable diffusion|prompt|langchain|automation|n8n|make\.com|zapier|ai api|ai content|ai marketing|ai agent)/i.test(p.__t)
const codeTxt = (p) => /(python|javascript|typescript|react|node\.?js|next\.?js|\bapi\b|rest api|html|css|wordpress|webflow|sql|full-?stack|django|flask|php|laravel)/i.test(p.__t)
const lang = (p) => !!p.english_cert || !!p.korean_cert
const base = (p) => city(p) !== 'other' && y(p) <= 72
// 가점: 마케팅×AI×코드 3축 > 언어 cert > 다낭(다음 주 방문 면접 가능)
const score = (p) => (mktRole(p) || mktTxt(p) ? 1 : 0) + (aiTxt(p) ? 1 : 0) + (codeTxt(p) ? 1 : 0) + (lang(p) ? 1 : 0) + (city(p) === 'DN' ? 1 : 0)
const hybrid = (p) => (mktRole(p) || mktTxt(p)) && aiTxt(p) && codeTxt(p) || mktRole(p) && aiTxt(p) || devRole(p) && mktTxt(p)
const GROUPS = [
  { gkey: 'hybrid', camp: 'labtobottle0922-recommend-hybrid', label: 'U1 하이브리드: 마케팅×AI×코드 ∪ 마케팅직군×AI ∪ 개발직군×마케팅', pick: (p) => (base(p) && hybrid(p) ? score(p) : null) },
  { gkey: 'mkt', camp: 'labtobottle0922-recommend-mkt', label: 'T5 마케팅 직군 × 디지털/SNS 텍스트 × 영어or한국어 cert', pick: (p) => (base(p) && mktRole(p) && mktTxt(p) && lang(p) ? score(p) : null) },
]

// ── 카피(vi 실발송) — AI 활용·API/LLM·영어or한국어·3개 도시 onsite·15-20M 명시해 자기선별 유도 ──
const COMPANY = 'Labtobottle'
const INITIAL = 'L'
const META_VI = 'Onsite · TP.HCM / Hà Nội / Đà Nẵng · 15–20 triệu ₫/tháng'
const INTRO = '<b>Labtobottle</b> — startup công nghệ rượu cao cấp (Hi-tech K-Brewery) của Hàn Quốc, thành lập năm 2022 bởi đội ngũ xuất thân từ ngành Kỹ thuật Hóa học KAIST — đang tuyển <b>AI Digital Marketing Developer</b> qua FYI. Công việc: xây dựng hệ thống marketing dựa trên AI (tự động hóa sản xuất nội dung SNS, copy quảng cáo, hình ảnh &amp; video bằng Generative AI API), vận hành &amp; phân tích các kênh SNS (Facebook, Instagram, TikTok, YouTube), quản lý website/landing page, SEO &amp; Google Analytics, sản xuất nội dung digital (Photoshop, Canva, Figma, CapCut, AI Image/Video Tool), và localize marketing cho thị trường Việt Nam (xu hướng SNS, hợp tác Influencer/Creator). Yêu cầu: kỹ năng SNS marketing &amp; SNS marketing bằng AI, <b>tiếng Anh hoặc tiếng Hàn</b>, kinh nghiệm tích hợp API &amp; xử lý dữ liệu, đã dùng AI API/LLM và các công cụ Generative AI (ChatGPT/Claude/Gemini…), kinh nghiệm dự án full-stack, có network &amp; kinh nghiệm marketing/sales. Làm việc onsite tại <b>TP.HCM, Hà Nội hoặc Đà Nẵng</b>. Lương <b>15–20 triệu ₫/tháng</b>.'
const SUBJECT = {
  public: (role) => `[FYI] Bạn được chọn vào danh sách đề cử gửi ${COMPANY} — ${role}`,
  private: (role) => `[FYI] Bạn được chọn vào danh sách đề cử — ${role} tại ${COMPANY}`,
}
const HOOK = 'Đội ngũ FYI đã xem xét toàn bộ hồ sơ đã đăng ký và <b>chọn bạn vào danh sách đề cử</b> cho vị trí dưới đây — hồ sơ của bạn (digital marketing &amp; ứng dụng AI) phù hợp với yêu cầu của vị trí này.'
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

  const [pool, unsubs, recs, apps, todays] = await Promise.all([
    fetchAll(() => sb.from('user_profiles')
      .select('id,email,full_name,position,desired_roles,yoe_months,location,english_cert,korean_cert,is_resume_public,skills,resume_summary,headline,experiences')
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
  let skipApplied = 0, skipRec = 0, skipToday = 0
  for (const p of pool) {
    if (!p.email || /likelion/i.test(p.email)) continue
    const e = p.email.toLowerCase()
    if (seen.has(e) || unsubSet.has(p.id)) continue
    p.__t = txt(p)
    const g = GROUPS.find((g) => g.pick(p) != null)
    if (!g) continue
    seen.add(e)
    if (appliedSet.has(p.id)) { skipApplied++; continue }
    if (recSet.has(p.id)) { skipRec++; continue }
    if (todayUsers.has(p.id) || todayEmails.has(e)) { skipToday++; continue }
    assigned.push({ p, s: g.pick(p), g, frame: p.is_resume_public ? 'public' : 'private' })
  }
  // hcm 먼저 → remote. 그룹 내 점수순. 동일인 2계정(이메일만 다름)은 이름 정규화 키로 1통, 동점이면 공개 프로필 우선
  const gi = (x) => GROUPS.indexOf(x.g)
  assigned.sort((a, b) => gi(a) - gi(b) || b.s - a.s || (b.frame === 'public') - (a.frame === 'public'))
  const names = new Set()
  const deduped = assigned.filter(({ p }) => { const k = nameKey(p.full_name); if (names.has(k)) return false; names.add(k); return true })
  const skipDup = assigned.length - deduped.length
  assigned.splice(0, assigned.length, ...deduped)

  console.log('발송 대상(1인 1통):')
  for (const g of GROUPS) {
    const rows = assigned.filter((x) => x.g === g), pub = rows.filter((x) => x.frame === 'public').length
    console.log(`  ${g.gkey} (${g.label}): ${rows.length}명 (공개 ${pub} / 비공개 ${rows.length - pub})`)
  }
  console.log(`  ── 합계 ${assigned.length}명 (제외: 지원완료 ${skipApplied} · 기수신 ${skipRec} · 당일 겹침 ${skipToday} · 동일인 2계정 ${skipDup})`)
  if (!doSend) {
    for (const { p, s, g, frame } of assigned)
      console.log(`  [${g.gkey}·${s}·${frame}] ${p.full_name} <${p.email}> · ${p.position || '?'} · ${Math.round((p.yoe_months || 0) / 12 * 10) / 10}y · ${city(p)} · en=${p.english_cert || '-'} kr=${p.korean_cert || '-'}`)
    console.log('\n(dry-run — 실발송하려면 --send)')
    return
  }

  let targets = assigned
  if (onlyGroup) targets = targets.filter((x) => x.g.gkey === onlyGroup)
  if (maxN) targets = targets.slice(0, maxN)
  let ok = 0, fail = 0
  for (const { p, g, frame } of targets) {
    const camp = `${g.camp}-${frame}`
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
      event: 'recommend_sent', page: '/scripts/labtobottle0922-recommend-coldmail',
      meta: { campaign: camp, job_ids: [JOB_ID], frame, group: g.gkey, city: city(p) }, user_id: p.id,
    }])
    ok++
    if (ok % 25 === 0) console.log(`  …${ok}/${targets.length}`)
    await sleep(400)
  }
  console.log(`\n✅ 발송 완료: ${ok}/${targets.length} (실패 ${fail})`)
}

main().catch((e) => { console.error(e); process.exit(1) })