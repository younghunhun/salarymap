// Sunrise Vina(V71) Chuyên viên Sales recommend 2차 — 9/23 면접 당일 취소(타사 오퍼)로 기업이 CV 추가 요청(Emma).
// JD: B2B 영업 — 담당 지역 시장 방문·제품 홍보·핵심 고객 관계 구축·경쟁사 동향·고객 피드백. 경력 1~2y 영업 · 기본 영어 회화
//     · 인쇄·포장(in ấn bao bì) 업계 이해·인맥 우대. HCM / 하노이 / 빈즈엉 · 15–20M · 월~토 오전 · 공장은 요청 시만 · 통근 셔틀 · 연 1회 인상.
// 1차: 9/7 sunrise-recommend2-sales 45(직군 필드 Sales × HCM/HN) + 9/14 sunrise-recommend1-sales 5 → V71 지원 4.
// 9/23 실측(3개 지역+미기재 × 1~8y, V71 기수신 70·지원 4·블랙리스트 제외): 영업 직군 필드 24 + 영업 직함 텍스트 114 = 138.
//   야오하 2차(9/22)와 58명 겹치나 다른 공고·다른 급여대(15-20M vs 9-13M)라 포함(7일 게이트 미적용 방침).
//   인쇄·포장 도메인은 풀에 거의 없어 게이트 대신 가점. 경력 상한 8y = 15-20M 밴드.
// 표준: 1인1통 · 동일인 2계정 1통 · 기수신·지원자·블랙리스트·당일 겹침 제외 · 공개/비공개 프레임.
//
//   node scripts/outreach/sunrise0923-recommend-coldmail.mjs                       # dry-run
//   node scripts/outreach/sunrise0923-recommend-coldmail.mjs --send [--group core|txt] [--max N] [--gap-hours N]
import { Resend } from 'resend'
import { sb, env, fetchAll, fetchBlacklist } from './lib.mjs'
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

const JOB_ID = '48353acf-c8f1-45cc-996d-3261712c8d3b' // Sunrise Vina Chuyên viên Sales (V71, HCM/HN/BD)
const ROLE_VI = 'Chuyên viên Sales'

// ── 대상 선정 — 3개 지역(+미기재) × 1~8y × 영업(직군 필드 | 직함 텍스트) ──
const norm = (v) => (Array.isArray(v) ? v.join(' ') : String(v || ''))
const txt = (p) => [p.position, p.headline, norm(p.desired_roles), norm(p.skills), Array.isArray(p.experiences) ? p.experiences.map((e) => `${e.title || e.position || ''} ${e.company || ''} ${e.description || ''}`).join(' ') : '', JSON.stringify(p.resume_summary || '')].join(' ').toLowerCase()
const roles = (p) => [p.position, ...(p.desired_roles || [])].filter(Boolean).map(String)
const y = (p) => p.yoe_months ?? 0
const city = (p) => { const s = String(p.location || '').toLowerCase(); if (!s.trim()) return 'blank'
  if (/(h[ồo]\s*ch[íi]\s*minh|hcm|sài gòn|saigon|thủ đức|thu duc|bình thạnh|quận|district|호찌민|호치민)/.test(s)) return 'HCM'
  if (/(hà nội|ha noi|hanoi|hn\b|cầu giấy|cau giay|đống đa|thanh xuân|hà đông|ha dong|하노이)/.test(s)) return 'HN'
  if (/(bình dương|binh duong|dĩ an|di an|thuận an|thuan an|thủ dầu một)/.test(s)) return 'BD'; return 'other' }
const salesRole = (p) => roles(p).some((r) => /^(sales|business dev|sales admin|sales manager|sales engineer|sales director)$/i.test(r))
const salesTitle = (p) => /(nhân viên kinh doanh|nhân viên bán hàng|sales (executive|representative|staff|associate|consultant|engineer)|telesales|tư vấn bán hàng|account executive|business development|chuyên viên kinh doanh|kinh doanh b2b|\bb2b\b)/i.test(p.__t)
const domain = (p) => /(in ấn|printing|bao bì|packaging|mực in|\bink\b|keo|adhesive|polymer|nhựa|plastic|hóa chất|chemical|vật liệu|nhà máy|factory|industrial|công nghiệp)/i.test(p.__t)
const base = (p) => city(p) !== 'other' && y(p) >= 12 && y(p) <= 96
// 가점: 인쇄·포장·산업재 도메인 > 영어 cert > 지역 명시 > 1~3y(급여 정합)
const score = (p) => (domain(p) ? 2 : 0) + (p.english_cert ? 1 : 0) + (city(p) !== 'blank' ? 1 : 0) + (y(p) <= 36 ? 1 : 0)
const GROUPS = [
  { gkey: 'core', camp: 'sunrise0923-recommend-core', label: 'core 영업 직군 필드 × 3개 지역 × 1~8y', pick: (p) => (base(p) && salesRole(p) ? score(p) : null) },
  { gkey: 'txt', camp: 'sunrise0923-recommend-txt', label: 'txt 경력 텍스트에 영업 직함 × 3개 지역 × 1~8y', pick: (p) => (base(p) && salesTitle(p) ? score(p) : null) },
]

// ── 카피(vi 실발송) — B2B 영업·1~2y·기본 영어·인쇄포장 우대·3개 지역·15-20M·셔틀 명시해 자기선별 ──
const COMPANY = 'Sunrise Vina'
const INITIAL = 'S'
const META_VI = 'Onsite · TP.HCM / Hà Nội / Bình Dương · 15–20 triệu ₫/tháng · Có xe đưa đón'
const INTRO = '<b>Sunrise Vina</b> — doanh nghiệp sản xuất Hàn Quốc — đang tuyển <b>Chuyên viên Sales (B2B)</b> qua FYI. Công việc: đi thị trường &amp; quảng bá sản phẩm của công ty tới khách hàng tại khu vực phụ trách, thiết lập &amp; duy trì quan hệ với khách hàng chính (hiện tại và mới) và người ra quyết định, cập nhật xu hướng thị trường &amp; đối thủ, thu thập phản hồi khách hàng và phối hợp các bộ phận xử lý yêu cầu. Yêu cầu: <b>kinh nghiệm sales 1–2 năm</b>, giao tiếp tiếng Anh căn bản; ưu tiên có hiểu biết &amp; mối quan hệ trong <b>ngành in ấn bao bì</b>. Làm việc tại <b>TP.HCM / Hà Nội / Bình Dương</b>, Thứ 2 đến trưa Thứ 7, môi trường linh hoạt (chỉ đến nhà máy khi quản lý yêu cầu), <b>có xe đưa đón</b>. Lương <b>15–20 triệu ₫</b>, deal theo năng lực, tăng lương hàng năm, có cơ hội thăng tiến.'
const SUBJECT = {
  public: (role) => `[FYI] Bạn được chọn vào danh sách đề cử gửi ${COMPANY} — ${role}`,
  private: (role) => `[FYI] Bạn được chọn vào danh sách đề cử — ${role} tại ${COMPANY}`,
}
const HOOK = 'Đội ngũ FYI đã xem xét toàn bộ hồ sơ đã đăng ký và <b>chọn bạn vào danh sách đề cử</b> cho vị trí dưới đây — hồ sơ của bạn (kinh nghiệm sales) phù hợp với yêu cầu của vị trí này.'
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
      .select('id,email,full_name,position,desired_roles,yoe_months,location,english_cert,is_resume_public,skills,resume_summary,headline,experiences')
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
  let skipApplied = 0, skipRec = 0, skipToday = 0
  for (const p of pool) {
    if (!p.email || /likelion/i.test(p.email)) continue
    const e = p.email.toLowerCase()
    if (seen.has(e) || unsubSet.has(p.id) || bl.has(p)) continue
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
  console.log(`  ── 합계 ${assigned.length}명 (제외: V71 지원완료 ${skipApplied} · V71 기수신 ${skipRec} · 당일 겹침 ${skipToday} · 동일인 2계정 ${skipDup})`)
  if (!doSend) {
    for (const { p, s, g, frame } of assigned)
      console.log(`  [${g.gkey}·${s}·${frame}] ${p.full_name} <${p.email}> · ${city(p)} · en=${p.english_cert || '-'} · ${(p.__t.match(/(in ấn|printing|bao bì|packaging)/i) || [''])[0]}`)
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
      event: 'recommend_sent', page: '/scripts/sunrise0923-recommend-coldmail',
      meta: { campaign: camp, job_ids: [JOB_ID], frame, group: g.gkey, city: city(p) }, user_id: p.id,
    }])
    ok++
    if (ok % 25 === 0) console.log(`  …${ok}/${targets.length}`)
    await sleep(400)
  }
  console.log(`\n✅ 발송 완료: ${ok}/${targets.length} (실패 ${fail})`)
}

main().catch((e) => { console.error(e); process.exit(1) })