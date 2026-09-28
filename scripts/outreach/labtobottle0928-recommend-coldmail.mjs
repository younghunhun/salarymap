// Labtobottle Nhân viên Kinh doanh recommend — 9/28 Len FYI 등록, 9/28 발송.
// JD: 베트남 시장 영업·유통 경험 필수 · 식품/음료/소비재 업계 경험 필수 · 한국 F&B 수출입·식품 인허가 경험 우대
//   · onsite HCM/HN/ĐN · 18–20M · KAIST 출신 K-Brewery(프리미엄 주류) 스타트업, 한국 F&B 베트남 유통 개척.
// 9/28 실측(scripts/tmp/labtobottle0928-pool-measure.mjs): 영업 시그널 비개발 425 → 3도시/미기재 376 → ≥1y 286
//   → F&B/FMCG 명시 34 + 유통/리테일 20 + 수출입/인허가 18 → 신선도 제외 후 67(시나리오 B). 0~1y 90은 JD 경력 요건·급여 밴드 상 보류.
// 같은 회사 마케팅 공고(9/22, 456통)와 겹침 소수 — 회사 소개는 짧게.
// 신선도 하드게이트: 최근 7일 recommend 3통+ 제외. 당일 겹침은 --gap-hours 로 다음 날 소화.
// 표준: 1인1통 · unsub·blacklist 전역 제외 · 공개/비공개 프레임.
//
//   node scripts/outreach/labtobottle0928-recommend-coldmail.mjs                # dry-run
//   node scripts/outreach/labtobottle0928-recommend-coldmail.mjs --send [--max N] [--gap-hours N]
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

const JOB_ID = '56ddf517-3b9d-42b5-9c82-d086c0ec830f' // Labtobottle Nhân viên Kinh doanh (onsite HCM/HN/ĐN)

// ── 대상 선정 — (Sales/BizDev 직군 or 영업 경력 텍스트) × 비개발 × ≥1y × HCM/HN/ĐN권/미기재 × (F&B·FMCG or 유통/리테일 or 수출입/인허가 텍스트) ──
const norm = (v) => (Array.isArray(v) ? v.join(' ') : String(v || ''))
const exp = (p) => (Array.isArray(p.experiences) ? p.experiences.map((e) => `${e.title || e.position || ''} ${e.company || ''} ${e.description || ''}`).join(' ') : '')
const txt = (p) => [p.position, p.headline, norm(p.desired_roles), JSON.stringify(p.skills || ''), exp(p), JSON.stringify(p.resume_summary || ''), p.major].join(' ').toLowerCase()
const roles = (p) => [p.position, ...(p.desired_roles || [])].filter(Boolean)
const has = (p, r) => roles(p).includes(r)
const isDev = (p) => roles(p).some((r) => /fullstack|backend|frontend|mobile|devops|ai engineer|data|embedded|game|qa|software|tech lead|cloud|sysadmin|network|dba|security/i.test(String(r)))
const salesRe = /(sales|kinh doanh|bán hàng|business development|account executive|account manager|key account|trade marketing|phát triển thị trường|phát triển kênh|nhà phân phối|đại lý|horeca|telesales|tư vấn bán hàng)/i
const salesTitleRe = /(nhân viên kinh doanh|chuyên viên kinh doanh|nhân viên bán hàng|sales (executive|representative|staff|associate|consultant|manager|supervisor|leader|admin|engineer)|business development|account (executive|manager)|key account|trưởng nhóm kinh doanh|giám sát bán hàng|quản lý kinh doanh)/i
const fnbRe = /(thực phẩm|food|f&b|đồ uống|beverage|nước giải khát|bia|beer|rượu|wine|spirits|liquor|soju|makgeolli|nông sản|fmcg|hàng tiêu dùng|consumer goods|horeca|k-?food|nhân sâm|ginseng|kimchi|snack|bánh kẹo|sữa|dairy|cà phê|coffee)/i
const distRe = /(phân phối|distribut|nhà phân phối|đại lý|kênh gt|kênh mt|general trade|modern trade|siêu thị|supermarket|bán lẻ|retail|wholesale|bán buôn|bán sỉ|horeca)/i
const imexRe = /(xuất nhập khẩu|xuat nhap khau|nhập khẩu|xuất khẩu|import|export|imex|hải quan|customs|logistics|forwarder|thủ tục|giấy phép|công bố sản phẩm|an toàn thực phẩm|food safety|vệ sinh an toàn|đăng ký sản phẩm|product registration|cấp phép|licens)/i
const koRe = /(korean|tiếng hàn|topik|한국어|hàn quốc|korea)/i
const inHcmc = (p) => /(h[ồo]\s*ch[íi]\s*minh|hcm|sài gòn|sai gon|saigon|thủ đức|thu duc|bình thạnh|binh thanh|bình dương|binh duong|đồng nai|dong nai|biên hòa|bien hoa|long an|호찌민|호치민)/i.test(String(p.location || ''))
const inHanoi = (p) => /(hà nội|ha noi|hanoi|bắc ninh|bac ninh|hưng yên|hung yen|하노이)/i.test(String(p.location || ''))
const inDanang = (p) => /(đà nẵng|da nang|danang|hội an|hoi an|quảng nam|quang nam|다낭)/i.test(String(p.location || ''))
const noLoc = (p) => !String(p.location || '').trim()
const y = (p) => p.yoe_months ?? 0
const base = (p) => !isDev(p) && (has(p, 'Sales') || has(p, 'Business Dev') || salesRe.test(p.__e)) && y(p) >= 12
  && (inHcmc(p) || inHanoi(p) || inDanang(p) || noLoc(p)) && (fnbRe.test(p.__t) || distRe.test(p.__t) || imexRe.test(p.__t))
// 가점: F&B 업계 > 유통 = 수출입 = 영업 직함 > Sales 직군 = 한국 시그널 = 도시 명시
const score = (p) => (fnbRe.test(p.__t) ? 3 : 0) + (distRe.test(p.__t) ? 2 : 0) + (imexRe.test(p.__t) ? 2 : 0) + (salesTitleRe.test(p.__e) ? 2 : 0)
  + (has(p, 'Sales') ? 1 : 0) + (p.korean_cert || koRe.test(p.__t) ? 1 : 0) + (!noLoc(p) ? 1 : 0)

const GROUPS = [
  {
    gkey: 'sales', camp: 'labtobottle0928-recommend-sales',
    label: { vi: 'Nhân viên Kinh doanh', ko: '영업 ≥1y × F&B/유통/수출입 × HCM/HN/ĐN' },
    pick: (p) => (base(p) ? score(p) : null),
  },
]

// ── 카피(vi 실발송) — 필수요건(영업·유통 경험, F&B 업계) · 3도시 온사이트 · 18–20M 명시해 자기선별 유도 ──
const COMPANY = 'Labtobottle'
const INITIAL = 'L'
const META_VI = 'Onsite · TP.HCM / Hà Nội / Đà Nẵng · 18–20 triệu ₫'
const INTRO = '<b>Labtobottle</b> — startup Hàn Quốc về nông nghiệp và công nghệ đồ uống có cồn cao cấp (Hi-tech K-Brewery), thành lập 2022 bởi đội ngũ xuất thân từ ngành Kỹ thuật Hóa học KAIST — đang tuyển <b>Nhân viên Kinh doanh</b> qua FYI để phát triển thị trường Việt Nam cho các sản phẩm thực phẩm và đồ uống Hàn Quốc. Công việc: chủ động tìm kiếm và phát triển đối tác/khách hàng tại Việt Nam; quản lý, chăm sóc khách hàng doanh nghiệp mới và các kênh phân phối hiện có; xây dựng chiến lược kinh doanh và kế hoạch phát triển thị trường; theo dõi và báo cáo doanh thu theo mục tiêu. Yêu cầu bắt buộc: <b>có kinh nghiệm kinh doanh và phân phối tại thị trường Việt Nam</b>, trong lĩnh vực <b>thực phẩm, đồ uống, hàng tiêu dùng</b> hoặc tương tự. Ưu tiên: kinh nghiệm nhập khẩu/xuất khẩu thực phẩm, đồ uống Hàn Quốc sang Việt Nam; kinh nghiệm xử lý thủ tục xin giấy phép liên quan đến thực phẩm, đồ uống. Làm việc onsite tại TP.HCM, Hà Nội hoặc Đà Nẵng. Lương <b>18–20 triệu ₫</b>.'
const SUBJECT = {
  public: (role) => `[FYI] Bạn được chọn vào danh sách đề cử gửi ${COMPANY} — ${role} (HCM/HN/ĐN)`,
  private: (role) => `[FYI] Bạn được chọn vào danh sách đề cử — ${role} tại ${COMPANY} (HCM/HN/ĐN)`,
}
const HOOK = 'Đội ngũ FYI đã xem xét toàn bộ hồ sơ đã đăng ký và <b>chọn bạn vào danh sách đề cử</b> cho vị trí dưới đây — hồ sơ của bạn (kinh nghiệm kinh doanh / phân phối, trong ngành thực phẩm, đồ uống, hàng tiêu dùng hoặc xuất nhập khẩu) phù hợp với yêu cầu của vị trí này.'
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
  const bl = await fetchBlacklist()
  const [pool, unsubs, recs, apps, todays, recent] = await Promise.all([
    fetchAll(() => sb.from('user_profiles')
      .select('id,email,full_name,position,desired_roles,headline,major,yoe_months,location,english_cert,korean_cert,is_resume_public,skills,resume_summary,experiences')
      .not('email', 'is', null).not('resume_url', 'is', null).order('created_at', { ascending: false })),
    fetchAll(() => sb.from('events').select('user_id').eq('event', 'coldmail_unsub').not('user_id', 'is', null).order('id')),
    fetchAll(() => sb.from('job_recommendations').select('user_id').eq('job_id', JOB_ID).order('id')),
    fetchAll(() => sb.from('job_applications').select('user_id').eq('job_id', JOB_ID).order('id')),
    fetchAll(() => sb.from('job_recommendations').select('user_id,to_email').gte('created_at', sinceIso).order('id')),
    fetchAll(() => sb.from('job_recommendations').select('user_id').gte('created_at', weekAgoIso).order('id')),
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
  let skipRec = 0, skipToday = 0, skipTired = 0
  for (const p of pool) {
    if (!p.email || /likelion/i.test(p.email)) continue
    const e = p.email.toLowerCase()
    if (seen.has(e) || unsubSet.has(p.id) || bl.has(p)) continue
    p.__t = txt(p); p.__e = exp(p).toLowerCase()
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
  console.log(`  ── 합계: ${assigned.length}명 (제외: 기수신 ${skipRec} · 당일 겹침 ${skipToday} · 7일 3통+ 지친 풀 ${skipTired})`)
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
      event: 'recommend_sent', page: '/scripts/labtobottle0928-recommend-coldmail',
      meta: { campaign: camp, job_ids: [JOB_ID], frame, group: g.gkey }, user_id: p.id,
    }])
    ok++
    if (ok % 25 === 0) console.log(`  …${ok}/${targets.length}`)
    await sleep(400)
  }
  console.log(`\n✅ 발송 완료: ${ok}/${targets.length} (실패 ${fail})`)
}

main().catch((e) => { console.error(e); process.exit(1) })
