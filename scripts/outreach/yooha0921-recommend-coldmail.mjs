// Yooha(V188) Nhân viên Off-line Sales recommend — 9/21 Len FYI 등록 당일 발송.
// JD: 한국 수입 소비재(화장품·음료·홍삼·샴푸·농산물) 오프라인 영업 · WinMart/Co.opmart 등 대형 리테일 + 개인 슈퍼 + 도매/온라인 채널 개척.
//     필수 ① 영업 경력 1년+ ② 온라인 마케팅/이커머스 판매 경험. 우대: 식품·화장품 도메인, Q7 20분 거리 거주. 외국어 요건 없음.
//     Q7(SECC 인근) onsite · 월~금 08-17시 · 9–13M gross + 개인 커미션 3~30% · 수습 중 100% 지급.
// 9/21 실측 (HCM권 × 1y+ × 비개발): T1 영업×온라인 30 · T2 영업만 117 · T3 영업텍스트만 5. 지친 풀 1명뿐(영업 풀은 최근 소진 없음).
// 유저 결정 "100명": T1 30 전원 + T2 상위 70. T2 포함 근거 = 온라인 판매 경험은 영업 이력서에 미기재가 흔함(하이퍼스타 SNS·위펀 MD 교훈)
//   → 카피에 "온라인 판매/이커머스 경험 필수" 명시해 자기선별. 10y 초과 23명은 급여 밴드(9-13M) 미스매치라 하드 제외(PI·로멘 교훈).
// 신선도 하드게이트(최근 7일 recommend 3통+ 제외) · 1인1통 · unsub 전역 제외 · 공개/비공개 프레임.
//
//   node scripts/outreach/yooha0921-recommend-coldmail.mjs                       # dry-run
//   node scripts/outreach/yooha0921-recommend-coldmail.mjs --send [--group t1|t2] [--total N] [--max N] [--gap-hours N]
import { Resend } from 'resend'
import { sb, env, fetchAll } from './lib.mjs'
import { makeToken } from '../../lib/campaignToken.js'

const args = process.argv.slice(2)
const flag = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? (args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true) : d }
const doSend = args.includes('--send')
const onlyGroup = flag('group', null)
const TOTAL = flag('total', null) ? parseInt(flag('total'), 10) : 100
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

// ── 대상 선정 — HCM권 × 경력 1y~10y × 영업(직군 or 텍스트) × 온라인/이커머스(T1 필수) ──
const exp = (p) => (Array.isArray(p.experiences) ? p.experiences.map((e) => `${e.title || e.position || ''} ${e.company || ''} ${e.description || ''}`).join(' ') : '')
const txt = (p) => (JSON.stringify(p.skills || '') + ' ' + String(p.position || '') + ' ' + String(p.resume_summary || '') + ' ' + exp(p)).toLowerCase()
const roles = (p) => [p.position, ...(p.desired_roles || [])].filter(Boolean)
const y = (p) => p.yoe_months ?? 0
const inHcm = (p) => /(h[ồo]\s*ch[íi]\s*minh|hcm|sài gòn|sai gon|saigon|thủ đức|thu duc|bình thạnh|binh thanh|nhà bè|nha be|quận 7|quan 7|district 7|phú mỹ hưng|phu my hung|bình chánh|binh chanh|quận 4|quận 8)/i.test(String(p.location || ''))
const q7 = (p) => /(quận 7|quan 7|district 7|phú mỹ hưng|phu my hung|nhà bè|nha be|quận 4|quận 8|bình chánh)/i.test(String(p.location || ''))
const DEV = /(backend|frontend|fullstack|mobile|web|embedded|cloud|devops|qa|data|ai|ml|game|design|security|sysadmin|network)/i
const devOnly = (p) => roles(p).length > 0 && roles(p).every((r) => DEV.test(String(r)))
const salesCore = (p) => roles(p).some((r) => /^(sales|business dev|sales admin|sales manager|sales engineer|sales director)$/i.test(String(r)))
const salesAdj = (p) => roles(p).some((r) => /^(marketing|digital marketing|non-it|other|operations)$/i.test(String(r)))
const salesTxt = (p) => /(sales|kinh doanh|bán hàng|business development|account executive|\bb2b\b|đại lý|nhà phân phối|distributor|phát triển thị trường)/i.test(p.__t)
const isSales = (p) => salesCore(p) || (salesAdj(p) && salesTxt(p))
const ecom = (p) => /(e-?commerce|thương mại điện tử|shopee|lazada|tiki|tiktok shop|sendo|online sales|bán hàng online|marketing online|online marketing|sàn thương mại|livestream|đăng sản phẩm|product listing|facebook ads|content marketing)/i.test(p.__t)
const fmcg = (p) => /(mỹ phẩm|cosmetic|beauty|thực phẩm|f&b|đồ uống|beverage|nhân sâm|ginseng|fmcg|siêu thị|winmart|co\.?opmart|bách hóa|retail|bán lẻ|phân phối|distribution)/i.test(p.__t)
// 급여 밴드 9-13M ↔ 10y 초과 미스매치 컷(PI·로멘 교훈)
const base = (p) => inHcm(p) && !devOnly(p) && y(p) >= 12 && y(p) <= 120
// 가점: 식품·화장품 도메인 > 온라인/이커머스 > Q7 근거리 > 영업 직군 정합
const score = (p) => (fmcg(p) ? 2 : 0) + (ecom(p) ? 2 : 0) + (q7(p) ? 1 : 0) + (salesCore(p) ? 1 : 0)

// cap: t2 는 TOTAL 에서 t1 배정분을 뺀 잔여만큼 점수순 컷
const GROUPS = [
  {
    gkey: 't1', camp: 'yooha0921-recommend-t1', cap: null,
    label: { vi: 'Nhân viên Off-line Sales', ko: 'T1 영업 × 온라인·이커머스 (JD 필수 2개 충족)' },
    pick: (p) => (base(p) && isSales(p) && ecom(p) ? score(p) : null),
  },
  {
    gkey: 't2', camp: 'yooha0921-recommend-t2', cap: 'rest',
    label: { vi: 'Nhân viên Off-line Sales', ko: 'T2 영업 (온라인 경험 이력서 미기재)' },
    pick: (p) => (base(p) && isSales(p) ? score(p) : null),
  },
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
const HOOK = 'Đội ngũ FYI đã xem xét toàn bộ hồ sơ đã đăng ký và <b>chọn bạn vào danh sách đề cử</b> cho vị trí dưới đây — hồ sơ của bạn (kinh nghiệm kinh doanh tại TP.HCM) phù hợp với yêu cầu của vị trí này.'
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
  const [pool, unsubs, recs, apps, todays, recent] = await Promise.all([
    fetchAll(() => sb.from('user_profiles')
      .select('id,email,full_name,position,desired_roles,yoe_months,location,english_cert,korean_cert,is_resume_public,skills,resume_summary,experiences')
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
  const byGroup = { t1: [], t2: [] }
  let skipRec = 0, skipToday = 0, skipTired = 0
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
      if ((cnt7[p.id] || 0) >= 3) { skipTired++; break } // 신선도 하드게이트
      byGroup[g.gkey].push({ p, s, g, frame: p.is_resume_public ? 'public' : 'private' })
      break
    }
  }
  // t2 는 TOTAL 잔여만큼 점수순 컷 (넘친 인원은 2차 예비로 보존)
  byGroup.t2.sort((a, b) => b.s - a.s)
  const cap = Math.max(0, TOTAL - byGroup.t1.length)
  const spare = Math.max(0, byGroup.t2.length - cap)
  byGroup.t2 = byGroup.t2.slice(0, cap)
  const assigned = [...byGroup.t1, ...byGroup.t2]

  console.log(`발송 대상(1인 1통 배정, --total ${TOTAL}):`)
  for (const g of GROUPS) {
    const rows = byGroup[g.gkey]
    const pub = rows.filter((x) => x.frame === 'public').length
    console.log(`  ${g.gkey} (${g.label.ko}): ${rows.length}명 (공개 ${pub} / 비공개 ${rows.length - pub})`)
  }
  console.log(`  ── 합계: ${assigned.length}명 (제외: 기수신 ${skipRec} · 당일 겹침 ${skipToday} · 7일 3통+ 지친 풀 ${skipTired} · t2 상한컷 예비 ${spare})`)
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
      event: 'recommend_sent', page: '/scripts/yooha0921-recommend-coldmail',
      meta: { campaign: camp, job_ids: [JOB_ID], frame, group: g.gkey }, user_id: p.id,
    }])
    ok++
    if (ok % 25 === 0) console.log(`  …${ok}/${targets.length}`)
    await sleep(400)
  }
  console.log(`\n✅ 발송 완료: ${ok}/${targets.length} (실패 ${fail})`)
}

main().catch((e) => { console.error(e); process.exit(1) })
