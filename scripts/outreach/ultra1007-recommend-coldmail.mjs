// Ultra Fashion 10/7 Be.F(AI 캐릭터 컴패니언) 2공고 recommend — Len 게재 당일 소싱. 공고 표기 그대로: HCM·ĐN·HN · 1년+ · 18-25M · 한국 팀과 온라인 협업.
//   R218 UX/UI Designer  Figma UX/UI Web·Mobile · User Flow·인터랙션·디자인시스템 · AI 툴 적극 활용 · AI/캐릭터챗/게임/커뮤니티 경험 우대 · 영어 or 한국어 우대 · TO 1
//   R217 Developer       웹서비스 개발 경험 · FE or BE · API/DB/인증/서버 구조 · 채팅·실시간·LLM API 연동 우대 · AI 코딩툴 적극 활용 · MVP 실행력
// 10/7 실측(scripts/tmp/ultra1007-pool-measure.mjs, 지역 게이트 전 기준): R218 Figma×UX/UI 131(AI툴 18 + 미기재 113) · R217 웹스택 998(LLM/실시간 381 · AI툴 66 · 일반 551).
// 게이트(유저 지시 10/7 "공고 내용대로"): 지역 = 공고 3도시(HCM/ĐN/HN) or 미기재 · 경력 12m+ · 요건 완전 매치(des: Figma AND UX/UI 텍스트 · dev: 웹스택).
// 캐스케이드(1인1통) = des(R218) → dev(R217). 빈도 게이트 없음(10/2 지시).
// 표준: 1인1통 · unsub/블랙리스트 전역 제외 · 공개/비공개 프레임 · 발송 전 coldmailTemplates 등록.
//
//   node scripts/outreach/ultra1007-recommend-coldmail.mjs                       # dry-run
//   node scripts/outreach/ultra1007-recommend-coldmail.mjs --send --group des                 # 117
//   node scripts/outreach/ultra1007-recommend-coldmail.mjs --send --group dev --max 300       # 점수 상위 300 (10/7 지시)
import { Resend } from 'resend'
import { sb, env, fetchAll, fetchBlacklist } from './lib.mjs'
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

// ── 대상 선정 헬퍼 (ultra1007-pool-measure 와 동일) ──
const exp = (p) => (Array.isArray(p.experiences) ? p.experiences.map((e) => `${e.title || e.position || ''} ${e.company || ''} ${e.description || ''}`).join(' ') : '')
const txt = (p) => (JSON.stringify(p.skills || '') + ' ' + String(p.position || '') + ' ' + String(p.headline || '') + ' ' + JSON.stringify(p.desired_roles || '') + ' ' + JSON.stringify(p.resume_summary || '') + ' ' + exp(p)).toLowerCase()
const roles = (p) => [p.position, ...(p.desired_roles || [])].filter(Boolean)
const y = (p) => p.yoe_months ?? 0
const city = (p) => { const l = String(p.location || ''); return /(h[ồo]\s*ch[íi]\s*minh|hcm|sài gòn|saigon|thủ đức|bình thạnh|bình dương|đồng nai|호치민|호찌민|tân bình|gò vấp|quận \d)/i.test(l) ? 'HCM' : /(hà nội|ha noi|hanoi|hà đông|하노이)/i.test(l) ? 'HN' : /(đà nẵng|da nang|danang|다낭)/i.test(l) ? 'ĐN' : !l.trim() ? '미기재' : '기타' }
const regionOk = (p) => city(p) !== '기타' // 공고 표기 3도시 or 미기재
const enOk = (p) => !!String(p.english_cert || '').trim() && !/^(none|no|없음|-|n\/a)$/i.test(String(p.english_cert).trim())
const koOk = (p) => (!!String(p.korean_cert || '').trim() && !/^(none|no|없음|-|n\/a)$/i.test(String(p.korean_cert).trim())) || /(korean|tiếng hàn|topik|한국어)/i.test(p.__t)
const aiTool = (p) => /(chatgpt|claude|cursor|copilot|midjourney|gen ?ai|generative ai|ai tool|công cụ ai|stable diffusion|dall-?e|gemini|v0\b|lovable|bolt\.new)/i.test(p.__t)
const hasPortfolio = (p) => !!p.portfolio_url || /(portfolio|behance|dribbble|github\.com)/i.test(p.__t)
// R218
const designRole = (p) => roles(p).includes('Design') || /(ui\/?ux|ux\/?ui|product designer|ui designer|ux designer)/i.test(String(p.position || '') + ' ' + JSON.stringify(p.desired_roles || ''))
const figma = (p) => /figma/i.test(p.__t)
const uiux = (p) => /(ui\/?ux|ux\/?ui|user experience|user interface|product design|wireframe|prototyp|user flow|design system|interaction design|usability)/i.test(p.__t)
const domainD = (p) => /(game|chatbot|character|ai service|ai product|community|cộng đồng|entertainment|giải trí|social app|dating)/i.test(p.__t)
// R217
const devRole = (p) => roles(p).some((r) => /(frontend|front-end|backend|back-end|fullstack|full-stack|full stack|web|software|developer|engineer|mobile|node|react|java|python|\.net|php)/i.test(String(r))) && !roles(p).every((r) => /(qa|tester|data|embedded|devops|security|game|blockchain|bi\b|analyst)/i.test(String(r)))
const webStack = (p) => /(react|next\.?js|vue|nuxt|angular|svelte|node\.?js|express|nest\.?js|django|flask|fastapi|spring|laravel|rails|asp\.net|\.net core|php|typescript|rest api|restful|graphql|postgres|mysql|mongodb|redis|supabase|firebase)/i.test(p.__t)
const llmSig = (p) => /(openai api|llm|gpt-?4|gpt api|langchain|llamaindex|rag\b|vector db|pinecone|embedding|chatbot|ai chat|prompt engineering|gemini api|anthropic|hugging ?face|ollama)/i.test(p.__t)
const realtime = (p) => /(websocket|socket\.io|real-?time|realtime|webrtc|chat app|messaging|pub\/sub|kafka|mqtt|signalr)/i.test(p.__t)
const authDb = (p) => /(oauth|jwt|authentication|authorization|đăng nhập|login|session|sql|database|db design|schema)/i.test(p.__t)

// ── 그룹 (캐스케이드 = 위에서부터 1인1통) ──
const GROUPS = [
  {
    gkey: 'des', camp: 'ultra1007-recommend-des', jobKey: 'R218',
    label: { vi: 'UX/UI Designer', ko: '디자인 직군 × 12m+ × Figma × UX/UI 텍스트 × 3도시/미기재' },
    pick: (p) => (regionOk(p) && designRole(p) && y(p) >= 12 && figma(p) && uiux(p) ? 1 + (aiTool(p) ? 3 : 0) + (domainD(p) ? 1 : 0) + (enOk(p) ? 1 : 0) + (koOk(p) ? 1 : 0) + (hasPortfolio(p) ? 1 : 0) : null),
  },
  {
    gkey: 'dev', camp: 'ultra1007-recommend-dev', jobKey: 'R217',
    label: { vi: 'Developer', ko: '개발 직군(FE/BE/Fullstack/Mobile/Web) × 12m+ × 웹스택 × 3도시/미기재' },
    pick: (p) => (regionOk(p) && devRole(p) && y(p) >= 12 && webStack(p) ? 1 + (llmSig(p) ? 3 : 0) + (realtime(p) ? 2 : 0) + (aiTool(p) ? 1 : 0) + (authDb(p) ? 1 : 0) + (enOk(p) ? 1 : 0) + (koOk(p) ? 1 : 0) : null),
  },
]

// ── 공고·카피 (vi 실발송) — 공고 본문 그대로 요약, 필수/우대/조건 명시 ──
const CO = 'Ultra Fashion'
const UF_INTRO = '<b>Ultra Fashion</b> — doanh nghiệp Hàn Quốc với khoảng 18 năm kinh nghiệm thương mại điện tử thời trang (nền tảng 800.000 thành viên), hiện đang phát triển <b>Be.F (Best Friend)</b> – dịch vụ AI Character Companion cho phép người dùng trò chuyện, xây dựng mối quan hệ và trải nghiệm cá nhân hóa với các nhân vật AI'
const AI_WORK = 'Tích cực sử dụng ChatGPT, Claude, Cursor và các công cụ AI tạo sinh để sản xuất – test – cải thiện nhanh chóng.'
const TERMS = 'Kinh nghiệm từ 1 năm. Lương 18–25 triệu ₫/tháng. Địa điểm: HCM, Đà Nẵng, Hà Nội — phối hợp trực tuyến với đội hoạch định Hàn Quốc. Ưu tiên giao tiếp được bằng tiếng Anh hoặc tiếng Hàn, quan tâm đến AI và nhanh chóng học AI Tool mới.'
const JOBS = {
  R218: {
    id: 'b1d0433a-e0d7-4ebf-b37d-4d44d6ae4ccd', company: CO, initial: 'U', meta: 'HCM · Đà Nẵng · Hà Nội · Từ 1 năm kinh nghiệm · 18–25 triệu ₫',
    intro: `${UF_INTRO} — đang tuyển <b>UX/UI Designer</b> qua FYI. Công việc: thiết kế trải nghiệm và màn hình theo luồng khám phá nhân vật → trò chuyện → hình thành mối quan hệ → quay lại sử dụng; xây dựng UI, prototype, design system bằng Figma và các công cụ AI. ${AI_WORK} <b>Yêu cầu</b>: thiết kế UX/UI Web/Mobile và prototyping bằng <b>Figma</b>; thiết kế User Flow, interaction và design system; dùng ChatGPT, Claude và AI tạo hình ảnh/video để nghiên cứu·hoạch định·thiết kế nhanh; thiết kế UX khiến người dùng muốn tiếp tục sử dụng, không chỉ màn hình đẹp. <b>Ưu tiên</b>: kinh nghiệm dịch vụ AI, character chat, game, cộng đồng hoặc giải trí. ${TERMS}`,
  },
  R217: {
    id: 'b285881d-1727-49a4-8cb6-1c64530a99c9', company: CO, initial: 'U', meta: 'HCM · Đà Nẵng · Hà Nội · Từ 1 năm kinh nghiệm · 18–25 triệu ₫',
    intro: `${UF_INTRO} — đang tuyển <b>Developer</b> tại Việt Nam qua FYI để cùng team Hàn Quốc phát triển các tính năng cốt lõi: AI Character Chat, hội thoại thời gian thực, bộ nhớ người dùng, hệ thống đề xuất, DB/API và các dịch vụ mở rộng (Front-end / Back-end / DB / tích hợp API, vận hành và nâng cấp dịch vụ). ${AI_WORK} <b>Yêu cầu</b>: kinh nghiệm phát triển web service và xây dựng dịch vụ thực tế; năng lực <b>Front-end hoặc Back-end</b>; hiểu API, DB, đăng nhập/thành viên, cấu trúc server; dùng được AI Coding Tool (ChatGPT, Claude, Cursor, Copilot…); khả năng thực thi — nhanh chóng tạo MVP, test – chỉnh sửa – triển khai. <b>Ưu tiên</b>: kinh nghiệm chat, dịch vụ thời gian thực hoặc tích hợp AI/LLM API. ${TERMS}`,
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
const ONETAP = 'Chỉ cần <b>1 chạm</b> — CV đã đăng ký của bạn sẽ được gửi tự động. Nhớ cập nhật link Portfolio hoặc GitHub trong hồ sơ FYI của bạn.'

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

  const [pool, unsubs, recs, apps, bl] = await Promise.all([
    fetchAll(() => sb.from('user_profiles')
      .select('id,email,full_name,position,desired_roles,headline,major,yoe_months,location,english_cert,korean_cert,is_resume_public,skills,resume_summary,experiences,portfolio_url')
      .not('email', 'is', null).not('resume_url', 'is', null).order('created_at', { ascending: false })),
    fetchAll(() => sb.from('events').select('user_id').eq('event', 'coldmail_unsub').not('user_id', 'is', null).order('id')),
    fetchAll(() => sb.from('job_recommendations').select('user_id,job_id').in('job_id', jobIds).order('id')),
    fetchAll(() => sb.from('job_applications').select('user_id,job_id').in('job_id', jobIds).order('id')),
    fetchBlacklist(),
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
    if (seen.has(e) || unsubSet.has(p.id) || bl.has(p)) continue
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
    const top = assigned.filter((r) => r.g.gkey === 'dev').sort((a, b) => b.s - a.s).slice(0, maxN || 300)
    const cut = top.at(-1)?.s
    console.log(`\n── dev 점수 상위 ${top.length} 구성 (컷 점수 ${cut}) ── LLM ${top.filter((r) => llmSig(r.p)).length} · 실시간/채팅 ${top.filter((r) => realtime(r.p)).length} · AI툴 ${top.filter((r) => aiTool(r.p)).length} · EN ${top.filter((r) => enOk(r.p)).length} · 지역 ${['HCM', 'HN', 'ĐN', '미기재'].map((c) => `${c} ${top.filter((r) => city(r.p) === c).length}`).join(' / ')} · 공개 ${top.filter((r) => r.frame === 'public').length} · 동점 경계(컷 점수 인원) ${assigned.filter((r) => r.g.gkey === 'dev' && r.s === cut).length}`)
    console.log('\n(dry-run — 실발송하려면 --send, 그룹 한정 --group <gkey>)')
    return
  }

  // --max 는 점수(JD 우대 매치) 상위부터 자른다 — 가입순 아님. 10/7 유저 지시: dev 는 300명만.
  let targets = [...assigned].sort((a, b) => b.s - a.s)
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
      event: 'recommend_sent', page: '/scripts/ultra1007-recommend-coldmail',
      meta: { campaign: camp, job_ids: [jd.id], frame, group: g.gkey }, user_id: p.id,
    }])
    ok++; okBy[g.jobKey] = (okBy[g.jobKey] || 0) + 1
    if (ok % 25 === 0) console.log(`  …${ok}/${targets.length}`)
    await sleep(400)
  }
  console.log(`\n✅ 발송 완료: ${ok}/${targets.length} (실패 ${fail}) — ${Object.entries(okBy).map(([k, v]) => `${k} ${v}`).join(' · ')}`)
}

main().catch((e) => { console.error(e); process.exit(1) })
