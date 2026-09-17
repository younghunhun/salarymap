// Hyperstar(R203) Global Influencer Marketing Assistant recommend — 9/17 Len FYI 등록 당일 발송.
// JD: Fresher/Junior · 영어 또는 한국어 · TikTok/Instagram/YouTube 상시 사용 · Excel/Sheets · 6~10M VND · 풀타임 월~금.
// 근무지: 멋사 HCM 사무실 출근 + 한국 Hyperstar 팀과 원격 협업 (9/17 Len 확인, 공고 혜택란에 명시). → HCM 거주 명시자 하드게이트.
// 9/17 풀 실측: HCM 명시 × 0~2y × 마케팅·SNS 매치 = 402. 핏 티어링(유저 결정 "T3까지"):
//   T1 인플루언서/KOL/seeding 직접 경험 × 영어 상급(IELTS6+/TOEIC600+/B2+) 또는 한국어 TOPIK3+ = 9
//   T2 인플루언서/KOL/seeding 직접 경험 × 기타 언어 시그널 = 5
//   T3 SNS 운영 텍스트(TikTok/Instagram/YouTube) × 마케팅 직군 × 영어 상급/한국어 = 91  → 합 105
//   (T4 SNS×기타 언어 71 · 마케팅 직군만 226은 미발송 — 반응 보고 확장)
// 9/17 오후 2차(유저 결정 "52명 보내"): T5 마케팅 직군 × 상급 인증 = 52. SNS 텍스트 요건 제거 —
//   SNS 상시 사용은 개인 생활이라 이력서에 미기재가 정상, T3의 sns() 게이트가 과했음(인증 상위자들이 걸러짐).
//   1차 실측 교훈: 지원자 3명 전부 이 스펙 밴드. 발송은 --group t5 로 한정(1~3차 기수신은 recSet으로 자동 제외).
// 개발직군만 있는 프로필 제외. 1인1통 · 공개/비공개 프레임. 급여 6~10M은 낮은 편 → 카피에 명시해 자기선별 유도.
//
//   node scripts/outreach/hyperstar0917-recommend-coldmail.mjs                       # dry-run
//   node scripts/outreach/hyperstar0917-recommend-coldmail.mjs --send [--group t1|t2|t3|t5] [--max N] [--gap-hours N]
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

const JOB_ID = '78e17892-ca73-4bb3-8e6e-191d4691b631' // Hyperstar Global Influencer Marketing Assistant (R203, HCM)

// ── 대상 선정 — HCM권 명시 × 경력 0~2y × 마케팅·SNS 매치 ──
const exp = (p) => (Array.isArray(p.experiences) ? p.experiences.map((e) => `${e.title || e.position || ''} ${e.company || ''} ${e.description || ''}`).join(' ') : '')
const txt = (p) => (JSON.stringify(p.skills || '') + ' ' + String(p.position || '') + ' ' + String(p.resume_summary || '') + ' ' + exp(p) + ' ' + String(p.major || '')).toLowerCase()
const roles = (p) => [p.position, ...(p.desired_roles || [])].filter(Boolean)
const inHcm = (p) => /(h[ồo]\s*ch[íi]\s*minh|hcm|sài gòn|sai gon|saigon|thủ đức|thu duc|bình thạnh|bình dương|binh duong|đồng nai|dong nai|biên hòa|bien hoa)/i.test(String(p.location || ''))
const MKT_ROLE = /^(marketing|content producer|pr|digital marketing|social media|brand)/i
const DEV = /(backend|frontend|fullstack|mobile|web|embedded|cloud|devops|qa|data|ai|ml|game|security|sysadmin|network)/i
const mktRole = (p) => roles(p).some((r) => MKT_ROLE.test(String(r)))
const inflStrong = (p) => /(influencer|kol|koc|seeding|booking)/i.test(p.__t)          // 인플루언서 직무 직접 경험
const sns = (p) => /(tiktok|instagram|youtube|social media|mạng xã hội)/i.test(p.__t)    // SNS 운영
const devOnly = (p) => roles(p).length > 0 && roles(p).every((r) => DEV.test(String(r))) && !MKT_ROLE.test(String(p.position || ''))
const certEn = (p) => /(ielts\s*[6-9]|toeic\s*[6-9]\d\d|toefl|b2|c1|c2|fluent|advanced|proficien)/i.test(String(p.english_cert || ''))
const certKo = (p) => /(topik\s*(ii\s*)?(level\s*)?[3-6]|topik\s*[3-6]|intermediate|advanced|고급|중급|native)/i.test(String(p.korean_cert || ''))
const langHi = (p) => certEn(p) || certKo(p)
const langAny = (p) => !!p.english_cert || !!p.korean_cert || /(ielts|toeic|toefl|topik|english|tiếng anh|tiếng hàn|korean)/i.test(p.__t)
const beauty = (p) => /(beauty|mỹ phẩm|cosmetic|k-beauty|fashion|thời trang|lifestyle)/i.test(p.__t)
const ecom = (p) => /(tiktok shop|amazon|shopify|shopee|lazada)/i.test(p.__t)
const y = (p) => p.yoe_months ?? 0
const base = (p) => inHcm(p) && y(p) <= 24 && !devOnly(p)
// 가점: 인플루언서 직접 경험 > 언어 상급 > 마케팅 직군 > 뷰티/패션·이커머스(우대)
const score = (p) => (inflStrong(p) ? 2 : 0) + (langHi(p) ? 1 : 0) + (mktRole(p) ? 1 : 0) + (beauty(p) ? 1 : 0) + (ecom(p) ? 1 : 0)

const GROUPS = [
  {
    gkey: 't1', camp: 'hyperstar0917-recommend-t1',
    label: { vi: 'Global Influencer Marketing Assistant', ko: 'T1 인플루언서 직접 경험 × 영어 상급/한국어' },
    pick: (p) => (base(p) && inflStrong(p) && langHi(p) ? score(p) : null),
  },
  {
    gkey: 't2', camp: 'hyperstar0917-recommend-t2',
    label: { vi: 'Global Influencer Marketing Assistant', ko: 'T2 인플루언서 직접 경험 × 기타 언어 시그널' },
    pick: (p) => (base(p) && inflStrong(p) && langAny(p) ? score(p) : null),
  },
  {
    gkey: 't3', camp: 'hyperstar0917-recommend-t3',
    label: { vi: 'Global Influencer Marketing Assistant', ko: 'T3 SNS 운영 × 마케팅 직군 × 영어 상급/한국어' },
    pick: (p) => (base(p) && sns(p) && mktRole(p) && langHi(p) ? score(p) : null),
  },
  {
    gkey: 't5', camp: 'hyperstar0917-recommend-t5',
    label: { vi: 'Global Influencer Marketing Assistant', ko: 'T5 마케팅 직군 × 상급 인증 (SNS 텍스트 불요, 2차)' },
    pick: (p) => (base(p) && mktRole(p) && langHi(p) ? score(p) : null),
  },
]

// ── 카피(vi 실발송) — 근무지(멋사 HCM 사무실·한국팀 원격 협업)·급여·언어·풀타임 명시해 자기선별 유도 ──
const COMPANY = 'Hyperstar'
const INITIAL = 'H'
const META_VI = 'Văn phòng LikeLion TP.HCM · Remote với team Hàn Quốc · 6–10 triệu ₫/tháng · Fresher/Junior'
const INTRO = '<b>Hyperstar</b> — startup công nghệ Hàn Quốc phát triển nền tảng tự động hóa <b>Influencer Marketing toàn cầu</b> dựa trên Generative AI (B2B SaaS giúp thương hiệu tìm creator, đề xuất chiến dịch, quản lý outreach và phân tích ROI) — đang tuyển <b>Global Influencer Marketing Assistant</b> qua FYI. Công việc: tìm kiếm &amp; list-up creator trên TikTok/Instagram/YouTube cho thị trường Việt Nam, Đông Nam Á, Mỹ; outreach qua email/DM; theo dõi tiến độ chiến dịch và kiểm tra nội dung đăng tải; tổng hợp dữ liệu &amp; báo cáo hiệu quả. Yêu cầu: <b>giao tiếp được bằng tiếng Anh hoặc tiếng Hàn</b>, thường xuyên dùng TikTok/Instagram/YouTube, thành thạo Excel/Google Sheets, cẩn thận và theo dõi timeline tốt. <b>Không yêu cầu kinh nghiệm</b> — phù hợp fresher/junior. Ưu tiên: yêu thích K-Beauty/fashion/lifestyle, từng làm influencer list-up/outreach/seeding, quan tâm TikTok Shop/Amazon/Shopify. <b>Làm việc full-time (Thứ 2–6) tại văn phòng LikeLion TP.HCM</b>, phối hợp remote với team Hyperstar tại Hàn Quốc. Lương <b>6–10 triệu ₫/tháng</b> (có thể deal theo năng lực), đóng BHXH đầy đủ.'
const SUBJECT = {
  public: (role) => `[FYI] Bạn được chọn vào danh sách đề cử gửi ${COMPANY} — ${role} (TP.HCM)`,
  private: (role) => `[FYI] Bạn được chọn vào danh sách đề cử — ${role} tại ${COMPANY} (TP.HCM)`,
}
const HOOK = 'Đội ngũ FYI đã xem xét toàn bộ hồ sơ đã đăng ký và <b>chọn bạn vào danh sách đề cử</b> cho vị trí dưới đây — hồ sơ của bạn (đang ở TP.HCM, nền tảng marketing / social media phù hợp) khớp với yêu cầu của vị trí này.'
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
      .select('id,email,full_name,position,desired_roles,yoe_months,location,english_cert,korean_cert,is_resume_public,skills,resume_summary,experiences,major')
      .not('email', 'is', null).not('resume_url', 'is', null).order('created_at', { ascending: false })),
    fetchAll(() => sb.from('events').select('user_id').eq('event', 'coldmail_unsub').not('user_id', 'is', null).order('id')),
    fetchAll(() => sb.from('job_recommendations').select('user_id').eq('job_id', JOB_ID).order('id')),
    fetchAll(() => sb.from('job_applications').select('user_id').eq('job_id', JOB_ID).order('id')),
    fetchAll(() => sb.from('job_recommendations').select('user_id,to_email')
      .gte('created_at', sinceIso).order('id')),
  ])
  const unsubSet = new Set(unsubs.map((r) => r.user_id))
  const recSet = new Set(recs.map((r) => r.user_id))
  const appliedSet = new Set(apps.map((a) => a.user_id))
  const todayUsers = new Set(todays.map((r) => r.user_id))
  const todayEmails = new Set(todays.map((r) => (r.to_email || '').toLowerCase()).filter(Boolean))

  const seen = new Set()
  const assigned = []
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
  console.log(`  ── 합계: ${assigned.length}명 (제외: 본 공고 기수신 ${skipRec} · 당일 발송 겹침 ${skipToday})`)
  if (!doSend) {
    for (const g of GROUPS) {
      const rows = assigned.filter((r) => r.g.gkey === g.gkey).sort((a, b) => b.s - a.s)
      if (!rows.length) continue
      console.log(`\n── ${g.gkey} 상위 5 ──`)
      for (const { p, s, frame } of rows.slice(0, 5))
        console.log(`  [${s}·${frame}] ${p.full_name} <${p.email}> · ${p.position || '?'} · ${Math.round((p.yoe_months || 0) / 12 * 10) / 10}y · ${String(p.location || '').slice(0, 30)} · en=${p.english_cert || '-'} ko=${p.korean_cert || '-'}`)
    }
    console.log('\n(dry-run — 실발송하려면 --send, 그룹 한정 --group <gkey>)')
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
      event: 'recommend_sent', page: '/scripts/hyperstar0917-recommend-coldmail',
      meta: { campaign: camp, job_ids: [JOB_ID], frame, group: g.gkey }, user_id: p.id,
    }])
    ok++
    if (ok % 25 === 0) console.log(`  …${ok}/${targets.length}`)
    await sleep(400)
  }
  console.log(`\n✅ 발송 완료: ${ok}/${targets.length} (실패 ${fail})`)
}

main().catch((e) => { console.error(e); process.exit(1) })
