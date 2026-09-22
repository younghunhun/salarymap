// Yooha(V188) Nhân viên Off-line Sales recommend 2차 — 9/22 타겟 재정의 발송.
// 1차(9/21, yooha0921 100명: 직군 필드 기반 영업 × 1~10y) 결과 클릭 4·지원 3. t1(영업×이커머스 텍스트) 28명 0클릭 — 이커머스 키워드에 걸린 건 마케터였음.
// 재정의(유저 결정 "다 보내"): 급여 밴드 9-13M 에 맞춰 경력 0~4y 로 내리고, 직군 필드 대신 경력 텍스트·행동 시그널로 잡는다.
//   b  = 최근 30일 영업 계열 공고 지원자 or 영업 추천메일 클릭자 (실제 반응 이력, 가장 신뢰) × HCM·미기재 × ≤10y
//   s  = 경력 텍스트에 영업 직함 명시(nhân viên kinh doanh/bán hàng, sales executive, telesales…) × 0~4y
//   f  = FMCG·리테일·유통·화장품 텍스트 × 0~4y
//   e  = 이커머스 판매 텍스트(Shopee/Lazada/TikTok Shop/livestream) × 0~4y
//   캐스케이드 b > s > f > e, 1인 1통. 9/22 실측 합집합 254 (공개 81). "sales 텍스트 어디든" 컷은 Photoshop 오탐 244 라 폐기.
// 1차 기수신 100·지원자 제외 · 당일 겹침 제외 · unsub 전역 제외. 7일 3통+ 게이트는 미적용(유저 결정).
//
//   node scripts/outreach/yooha0922-recommend-coldmail.mjs                       # dry-run
//   node scripts/outreach/yooha0922-recommend-coldmail.mjs --send [--group b|s|f|e] [--max N] [--gap-hours N]
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

const JOB_ID = '9f4c5eee-e42f-4f55-b39e-96f05ddf772a' // Yooha Nhân viên Off-line Sales (V188, Q7 HCM)

// ── 대상 선정 — 텍스트·행동 시그널 기반, 급여 밴드 0~4y ──
const exp = (p) => (Array.isArray(p.experiences) ? p.experiences.map((e) => `${e.title || e.position || ''} ${e.company || ''} ${e.description || ''}`).join(' ') : '')
const txt = (p) => (JSON.stringify(p.skills || '') + ' ' + [p.position, p.headline, p.resume_summary].join(' ') + ' ' + exp(p)).toLowerCase()
const roles = (p) => [p.position, ...(p.desired_roles || [])].filter(Boolean)
const y = (p) => p.yoe_months ?? 0
const inHcm = (p) => /(h[ồo]\s*ch[íi]\s*minh|hcm|sài gòn|sai gon|saigon|thủ đức|thu duc|bình thạnh|binh thanh|nhà bè|nha be|quận|district|phú mỹ hưng|bình chánh|호찌민|호치민)/i.test(String(p.location || ''))
const loc = (p) => inHcm(p) || !String(p.location || '').trim()
const DEV = /(backend|frontend|fullstack|mobile|web|embedded|cloud|devops|qa|data|ai|ml|game|security|sysadmin|network)/i
const devOnly = (p) => roles(p).length > 0 && roles(p).every((r) => DEV.test(String(r)))
const salesTitle = (p) => /(nhân viên kinh doanh|nhân viên bán hàng|sales (executive|representative|staff|associate|consultant)|telesales|tư vấn bán hàng|account executive|business development)/i.test(p.__t)
const fmcg = (p) => /(mỹ phẩm|cosmetic|beauty|skincare|thực phẩm|f&b|đồ uống|beverage|nhân sâm|ginseng|fmcg|siêu thị|winmart|co\.?opmart|bách hóa|retail|bán lẻ|phân phối|distribution|hàng tiêu dùng|consumer goods|k-?beauty|hàn quốc)/i.test(p.__t)
const ecom = (p) => /(e-?commerce|thương mại điện tử|shopee|lazada|tiki|tiktok shop|bán hàng online|livestream)/i.test(p.__t)
const base = (p) => loc(p) && !devOnly(p) && y(p) <= 48
const q7 = (p) => /(quận 7|quan 7|district 7|phú mỹ hưng|phu my hung|nhà bè|nha be|quận 4|quận 8|bình chánh)/i.test(String(p.location || ''))
const score = (p) => (fmcg(p) ? 2 : 0) + (ecom(p) ? 1 : 0) + (salesTitle(p) ? 1 : 0) + (q7(p) ? 1 : 0)
// 행동 시그널 집합은 main 에서 채움
const behav = new Set()

const GROUPS = [
  { gkey: 'b', camp: 'yooha0922-recommend-b', label: { vi: 'Nhân viên Off-line Sales', ko: 'b 최근 30일 영업 공고 지원/클릭 이력' }, pick: (p) => (loc(p) && y(p) <= 120 && behav.has(p.id) ? 3 + score(p) : null) },
  { gkey: 's', camp: 'yooha0922-recommend-s', label: { vi: 'Nhân viên Off-line Sales', ko: 's 영업 직함 텍스트 × 0~4y' }, pick: (p) => (base(p) && salesTitle(p) ? score(p) : null) },
  { gkey: 'f', camp: 'yooha0922-recommend-f', label: { vi: 'Nhân viên Off-line Sales', ko: 'f FMCG·리테일·유통·화장품 × 0~4y' }, pick: (p) => (base(p) && fmcg(p) ? score(p) : null) },
  { gkey: 'e', camp: 'yooha0922-recommend-e', label: { vi: 'Nhân viên Off-line Sales', ko: 'e 이커머스 판매 텍스트 × 0~4y' }, pick: (p) => (base(p) && ecom(p) ? score(p) : null) },
]

// ── 카피(vi 실발송) — 필수요건 2개·Q7 onsite·급여+커미션 명시해 자기선별 유도 ──
const COMPANY = 'Yooha'
const INITIAL = 'Y'
const META_VI = 'Onsite · Quận 7 (gần SECC), TP.HCM · 9–13 triệu ₫ gross + hoa hồng 3–30%'
const INTRO = '<b>Yooha</b> — công ty kinh doanh hàng tiêu dùng nhập khẩu từ Hàn Quốc (mỹ phẩm, đồ uống, sản phẩm nhân sâm, dầu gội, nông sản…) — đang tuyển <b>Nhân viên Off-line Sales</b> qua FYI. Công việc: phát triển các nhà phân phối bán lẻ lớn tại Việt Nam (WinMart, Co.opmart…), phát triển siêu thị quy mô nhỏ tại TP.HCM, tìm kiếm hệ thống bán buôn &amp; kênh bán hàng online; hỗ trợ marketing/bán hàng online, sản xuất tài liệu quảng cáo online, giao hàng tồn kho &amp; quản lý doanh số. Yêu cầu bắt buộc: <b>tối thiểu 1 năm kinh nghiệm kinh doanh</b> và <b>kinh nghiệm marketing / bán hàng online</b> (làm nội dung marketing online, đăng sản phẩm &amp; bán trên sàn thương mại điện tử hoặc cửa hàng online). Ưu tiên: kinh nghiệm ngành thực phẩm hoặc mỹ phẩm (tinh thần học hỏi quan trọng hơn ngành hàng), sinh sống trong bán kính di chuyển 20 phút tới Quận 7. <b>Không yêu cầu ngoại ngữ.</b> Làm việc T2–T6 08:00–17:00 tại văn phòng gần trung tâm triển lãm SECC, Quận 7. Lương <b>9–13 triệu ₫ gross</b> theo kinh nghiệm + <b>hoa hồng cá nhân 3–30%</b> theo doanh số, thử việc nhận 100% lương. (Công ty không nhận ứng viên đang kinh doanh cá nhân riêng.)'
const SUBJECT = {
  public: (role) => `[FYI] Bạn được chọn vào danh sách đề cử gửi ${COMPANY} — ${role} (Q.7, TP.HCM)`,
  private: (role) => `[FYI] Bạn được chọn vào danh sách đề cử — ${role} tại ${COMPANY} (Q.7, TP.HCM)`,
}
const HOOK = 'Đội ngũ FYI đã xem xét toàn bộ hồ sơ đã đăng ký và <b>chọn bạn vào danh sách đề cử</b> cho vị trí dưới đây — hồ sơ của bạn (kinh nghiệm bán hàng / ngành hàng tiêu dùng tại TP.HCM) phù hợp với yêu cầu của vị trí này.'
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

  const since30 = new Date(Date.now() - 30 * 864e5).toISOString()
  const [pool, unsubs, recs, apps, todays, salesApps, salesClicks, jobs] = await Promise.all([
    fetchAll(() => sb.from('user_profiles')
      .select('id,email,full_name,position,desired_roles,yoe_months,location,is_resume_public,skills,resume_summary,headline,experiences')
      .not('email', 'is', null).not('resume_url', 'is', null).order('created_at', { ascending: false })),
    fetchAll(() => sb.from('events').select('user_id').eq('event', 'coldmail_unsub').not('user_id', 'is', null).order('id')),
    fetchAll(() => sb.from('job_recommendations').select('user_id').eq('job_id', JOB_ID).order('id')),
    fetchAll(() => sb.from('job_applications').select('user_id').eq('job_id', JOB_ID).order('id')),
    fetchAll(() => sb.from('job_recommendations').select('user_id,to_email').gte('created_at', sinceIso).order('id')),
    fetchAll(() => sb.from('job_applications').select('user_id,job_id').gte('created_at', since30).order('id')),
    fetchAll(() => sb.from('events').select('user_id,meta').eq('event', 'recommend_click').gte('created_at', since30).order('id')),
    fetchAll(() => sb.from('jobs').select('id,title,role').order('id')),
  ])
  const salesJob = new Set(jobs.filter((j) => /sales|kinh doanh|bán hàng|business dev|showroom|md\b|merchandis/i.test(j.title) || /^sales/i.test(j.role || '')).map((j) => j.id))
  for (const a of salesApps) if (salesJob.has(a.job_id)) behav.add(a.user_id)
  for (const e of salesClicks) if (/sales|md|showroom|t[1-5]|partner/.test(String(e.meta?.campaign || ''))) behav.add(e.user_id)
  const unsubSet = new Set(unsubs.map((r) => r.user_id))
  const recSet = new Set(recs.map((r) => r.user_id))
  const appliedSet = new Set(apps.map((a) => a.user_id))
  const todayUsers = new Set(todays.map((r) => r.user_id))
  const todayEmails = new Set(todays.map((r) => (r.to_email || '').toLowerCase()).filter(Boolean))

  const seen = new Set()
  const byGroup = { b: [], s: [], f: [], e: [] }
  let skipRec = 0, skipToday = 0
  for (const p of pool) {
    if (!p.email || /likelion/i.test(p.email)) continue
    const e = p.email.toLowerCase()
    if (seen.has(e) || unsubSet.has(p.id)) continue
    p.__t = txt(p)
    for (const g of GROUPS) {
      const s = g.pick(p)
      if (s == null) continue
      seen.add(e)
      if (appliedSet.has(p.id)) break
      if (recSet.has(p.id)) { skipRec++; break }
      if (todayUsers.has(p.id) || todayEmails.has(e)) { skipToday++; break }
      byGroup[g.gkey].push({ p, s, g, frame: p.is_resume_public ? 'public' : 'private' })
      break
    }
  }
  for (const g of GROUPS) byGroup[g.gkey].sort((a, b) => b.s - a.s)
  const assigned = GROUPS.flatMap((g) => byGroup[g.gkey])

  console.log('발송 대상(1인 1통 배정):')
  for (const g of GROUPS) {
    const rows = byGroup[g.gkey]
    const pub = rows.filter((x) => x.frame === 'public').length
    console.log(`  ${g.gkey} (${g.label.ko}): ${rows.length}명 (공개 ${pub} / 비공개 ${rows.length - pub})`)
  }
  console.log(`  ── 합계: ${assigned.length}명 (제외: 1차 기수신 ${skipRec} · 당일 겹침 ${skipToday})`)
  if (!doSend) {
    for (const g of GROUPS) {
      const rows = byGroup[g.gkey].slice().sort((a, b) => b.s - a.s)
      if (!rows.length) continue
      console.log(`\n── ${g.gkey} 상위 10 ──`)
      for (const { p, s, frame } of rows.slice(0, 10))
        console.log(`  [${s}·${frame}] ${p.full_name} <${p.email}> · ${p.position || '?'} · ${Math.round((p.yoe_months || 0) / 12 * 10) / 10}y · ${String(p.location || '위치?').slice(0, 30)}`)
    }
    console.log('\n(dry-run — 실발송하려면 --send)')
    return
  }

  let targets = assigned
  if (onlyGroup) targets = targets.filter((r) => r.g.gkey === onlyGroup)
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
      event: 'recommend_sent', page: '/scripts/yooha0922-recommend-coldmail',
      meta: { campaign: camp, job_ids: [JOB_ID], frame, group: g.gkey }, user_id: p.id,
    }])
    ok++
    if (ok % 25 === 0) console.log(`  …${ok}/${targets.length}`)
    await sleep(400)
  }
  console.log(`\n✅ 발송 완료: ${ok}/${targets.length} (실패 ${fail})`)
}

main().catch((e) => { console.error(e); process.exit(1) })
