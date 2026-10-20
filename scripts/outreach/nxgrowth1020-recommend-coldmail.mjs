// Nexacode(R216) AI Growth Marketer recommend 2차 — 10/20 잔여 풀 발송. 10/6(nxgrowth1006) · 10/8(nxreopen1008) 미발송자만.
// 10/20 실측(scratchpad r216-remaining.mjs): R216 130통 발송·24지원(pending 13) 후, 미발송 마케팅 풀에서
//   T1+T2(유료광고 시그널 × cv_tags role_detail 마케팅) 36 · T3(유료광고 미기재, SNS/SEO/콘텐츠 × B2B/리드 시그널 × role_detail 마케팅 × 1y+) 127.
// 유저 결정(10/20): "추천대로" → 위 두 층을 한 번에 발송. 지역·한국어 게이트 없음(10/6 결정 유지). T3 는 HOOK 문구만 다르다(유료광고 경험을 말하지 않는다).
// 직군은 cv_tags.role_detail(이력서 실제 직무) 기준 — 10/6 처럼 desired_roles 만으로 잡힌 통역·디자이너가 섞이지 않게.
// 신선도 하드게이트: 최근 7일 recommend 3통+ 제외(10/19 KTC 일괄 발송 여파로 당일 제외분은 재실행으로 소화 — 기수신자는 자동 제외).
// 표준: 1인1통 · unsub·blacklist 전역 제외 · 공개/비공개 프레임. camp 접두 nxgrowth1020.
//
//   node scripts/outreach/nxgrowth1020-recommend-coldmail.mjs                       # dry-run
//   node scripts/outreach/nxgrowth1020-recommend-coldmail.mjs --send [--group t12|t3] [--max N] [--gap-hours N]
import { Resend } from 'resend'
import { sb, env, fetchAll, fetchBlacklist } from './lib.mjs'
import { makeToken } from '../../lib/campaignToken.js'
import { roleGroupOf, yoeMonthsOf } from '../../lib/cvTagsMatch.js'

const args = process.argv.slice(2)
const flag = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? (args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true) : d }
const doSend = args.includes('--send')
const onlyGroup = flag('group', null)
const maxN = flag('max', null) ? parseInt(flag('max'), 10) : null
const gapHours = flag('gap-hours', null) ? parseFloat(flag('gap-hours')) : null
const previewPath = flag('preview', null) // --preview <path> : 첫 대상 기준 HTML/텍스트를 파일로 저장(dry-run 전용)
const sinceIso = gapHours != null ? new Date(Date.now() - gapHours * 3600 * 1000).toISOString() : new Date().toISOString().slice(0, 10)
const SITE = String(flag('site', env.NEXT_PUBLIC_SITE_URL || 'https://salary-fyi.com')).replace(/\/$/, '')
const RESEND_FROM = env.RESEND_FROM || 'FYI <hello@salary-fyi.com>'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const esc = (s) => String(s || '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
const firstName = (n) => String(n || '').trim().split(/\s+/).slice(-1)[0] || 'bạn'
const strip = (s) => String(s).replace(/<[^>]+>/g, '')

const JOB_ID = '5deaf792-f749-47c2-acc2-f6c55e77ed93' // Nexacode AI Growth Marketer (R216)
const OLD_JOB_ID = '146b9902-46c4-41d5-bcd0-a8356009bd5e' // R205 AI Native Marketer — 수신자·지원자 제외용

// ── 대상 선정 — cv_tags role_detail 마케팅 × 시그널. T12 = 유료광고 운영(6m+) · T3 = 유료광고 미기재 × SNS/SEO/콘텐츠 × B2B/리드 × 1y+ ──
const exp = (p) => (Array.isArray(p.experiences) ? p.experiences.map((e) => `${e.title || e.position || ''} ${e.company || ''} ${e.description || ''}`).join(' ') : '')
const txt = (p) => (JSON.stringify(p.skills || '') + ' ' + String(p.position || '') + ' ' + String(p.headline || '') + ' ' + JSON.stringify(p.resume_summary || '') + ' ' + exp(p) + ' ' + JSON.stringify(p.cv_tags || '')).toLowerCase()
const mktRole = (p) => roleGroupOf(p.cv_tags?.role_detail) === 'marketing'
const paidAds = (p) => /(meta ads?|google ads?|facebook ads?|tiktok ads?|quảng cáo trả phí|chạy quảng cáo|media buy|performance marketing|performance \/ ads|ads manager|google adwords|adwords|cpc|roas|ppc)/i.test(p.__t)
const aiTool = (p) => /(chatgpt|midjourney|gen ?ai|generative ai|ai tool|công cụ ai|stable diffusion|dall-?e|copilot|gemini|claude)/i.test(p.__t)
const dataSig = (p) => /(google analytics|ga4|data analysis|phân tích dữ liệu|conversion|chuyển đổi|a\/b test)/i.test(p.__t)
const snsSeo = (p) => /(seo|sem\b|content marketing|social media|instagram|threads|tiktok|fanpage|blog|copywrit|nội dung|content creator|community)/i.test(p.__t)
const b2bLead = (p) => /(b2b|lead gen|lead generation|tìm kiếm khách hàng|business development|\bbd\b|outreach|cold ?(email|call)|sales|kinh doanh|account executive|telesales)/i.test(p.__t)
const krAny = (p) => !!String(p.korean_cert || '').trim() || /(korean|tiếng hàn|topik|한국어)/i.test(p.__t)
const y = (p) => yoeMonthsOf(p) ?? 0
// 가점: AI 툴 > SNS·SEO = B2B·리드 = 데이터 분석 = 한국어 = 영어인증
const score = (p) => (aiTool(p) ? 2 : 0) + (snsSeo(p) ? 1 : 0) + (b2bLead(p) ? 1 : 0) + (dataSig(p) ? 1 : 0) + (krAny(p) ? 1 : 0) + (p.english_cert ? 1 : 0)

const GROUPS = [
  {
    gkey: 't12', camp: 'nxgrowth1020-recommend-t12',
    label: { vi: 'AI Growth Marketer', ko: 'T1+T2 유료광고 운영 × 6m+ (10/6 잔여)' },
    hook: 'kinh nghiệm vận hành quảng cáo trả phí',
    pick: (p) => (mktRole(p) && y(p) >= 6 && paidAds(p) ? score(p) : null),
  },
  {
    gkey: 't3', camp: 'nxgrowth1020-recommend-t3',
    label: { vi: 'AI Growth Marketer', ko: 'T3 SNS/SEO/콘텐츠 × B2B/리드 × 1y+ (유료광고 미기재)' },
    hook: 'kinh nghiệm vận hành nội dung, mạng xã hội, SEO/SEM và tiếp cận khách hàng B2B',
    pick: (p) => (mktRole(p) && y(p) >= 12 && !paidAds(p) && snsSeo(p) && b2bLead(p) ? score(p) : null),
  },
].filter((g) => !onlyGroup || g.gkey === onlyGroup)

// ── 카피(vi 실발송) — 업무·요건·근무형태는 공고 본문(Len 등록, 10/6) 문장을 그대로 옮긴다. 지역은 제목에 넣지 않는다(전국 발송) ──
const COMPANY = 'Nexacode'
const INITIAL = 'N'
const META_VI = 'Văn phòng Quận 1, TP.HCM · Có thể làm việc từ xa khi cần · 12–20 triệu ₫/tháng'
const INTRO = '<b>Nexacode</b> — công ty phần mềm xây dựng sản phẩm SaaS, ERP và giải pháp chuyển đổi số — đang tuyển <b>AI Growth Marketer</b> qua FYI: người sử dụng AI để tìm ra khách hàng thực tế và kết nối họ đến tư vấn và doanh thu. Công việc chính: <b>thu hút khách hàng B2B tại Hàn Quốc</b> (nghiên cứu khách hàng có nhu cầu bảo trì và thuê ngoài phần mềm, đề xuất phù hợp theo từng khách hàng, thu hút lead tư vấn); <b>bán nội dung số và SaaS</b> (vận hành Threads, Instagram, <b>quảng cáo Meta</b>, blog và SEO/SEM cho website, đồng thời cải thiện ROAS); <b>ứng dụng AI</b> để nghiên cứu khách hàng, sản xuất creative, phân tích hiệu quả và tự động hóa các công việc lặp lại. Nexacode tìm ứng viên có thể giải thích căn cứ lựa chọn khách hàng và phương pháp tiếp cận, đưa ra được kết quả tư vấn/doanh số do chính mình thực hiện, đồng thời biết kiểm chứng kết quả do AI tạo ra và cải thiện dựa trên dữ liệu thực tế. Phỏng vấn khoảng 60 phút, trong đó khoảng 30 phút kiểm tra năng lực thực tế qua chia sẻ màn hình (được phép dùng công cụ AI). Hình thức làm việc: <b>có thể làm việc từ xa khi cần thiết</b>, văn phòng chi nhánh tại Quận 1, TP.HCM; thử việc khoảng 2 tháng, sau khi lên chính thức có thưởng theo hiệu suất. Lương <b>12–20 triệu ₫/tháng</b>.'
const SUBJECT = {
  public: (role) => `[FYI] Bạn được chọn vào danh sách đề cử gửi ${COMPANY} — ${role}`,
  private: (role) => `[FYI] Bạn được chọn vào danh sách đề cử — ${role} tại ${COMPANY}`,
}
const hookOf = (g) => `Đội ngũ FYI đã xem xét toàn bộ hồ sơ đã đăng ký và <b>chọn bạn vào danh sách đề cử</b> cho vị trí dưới đây — hồ sơ của bạn (${g.hook}) phù hợp với yêu cầu của vị trí này.`
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

function emailHtml(name, url, unsubUrl, job, frame, g) {
  return `<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;background:#faf9f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1a1612">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#faf9f7"><tr><td align="center" style="padding:28px 16px">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px">
  <tr><td style="padding-bottom:18px"><img src="https://salary-fyi.com/fyi-logo.png" height="24" alt="FYI" style="height:24px;width:auto;display:block"></td></tr>
  <tr><td style="font-size:15px;line-height:1.6;color:#1a1612;padding-bottom:6px">Chào ${esc(firstName(name))},</td></tr>
  <tr><td style="font-size:14px;line-height:1.65;color:#4a443c;padding-bottom:14px">${INTRO}</td></tr>
  <tr><td style="font-size:14px;line-height:1.65;color:#4a443c;padding-bottom:14px">${hookOf(g)}</td></tr>
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

function emailText(name, url, unsubUrl, job, frame, g) {
  return `Chào ${firstName(name)},

${strip(INTRO)}

${strip(hookOf(g))}

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
  const [pool, unsubs, recs, apps, oldRecs, oldApps, todays, recent, bl] = await Promise.all([
    fetchAll(() => sb.from('user_profiles')
      .select('id,email,full_name,position,desired_roles,headline,yoe_months,location,english_cert,korean_cert,is_resume_public,skills,resume_summary,experiences,cv_tags')
      .not('email', 'is', null).not('resume_url', 'is', null).order('created_at', { ascending: false })),
    fetchAll(() => sb.from('events').select('user_id').eq('event', 'coldmail_unsub').not('user_id', 'is', null).order('id')),
    fetchAll(() => sb.from('job_recommendations').select('user_id').eq('job_id', JOB_ID).order('id')),
    fetchAll(() => sb.from('job_applications').select('user_id').eq('job_id', JOB_ID).order('id')),
    fetchAll(() => sb.from('job_recommendations').select('user_id').eq('job_id', OLD_JOB_ID).order('id')),
    fetchAll(() => sb.from('job_applications').select('user_id').eq('job_id', OLD_JOB_ID).order('id')),
    fetchAll(() => sb.from('job_recommendations').select('user_id,to_email').gte('created_at', sinceIso).order('id')),
    fetchAll(() => sb.from('job_recommendations').select('user_id').gte('created_at', weekAgoIso).order('id')),
    fetchBlacklist(),
  ])
  const unsubSet = new Set(unsubs.map((r) => r.user_id))
  const recSet = new Set(recs.map((r) => r.user_id))
  const appliedSet = new Set(apps.map((a) => a.user_id))
  const oldSet = new Set([...oldRecs.map((r) => r.user_id), ...oldApps.map((a) => a.user_id)]) // 전작(R205) 수신·지원자 — "미발송 풀만"
  const todayUsers = new Set(todays.map((r) => r.user_id))
  const todayEmails = new Set(todays.map((r) => (r.to_email || '').toLowerCase()).filter(Boolean))
  const cnt7 = {}
  for (const r of recent) cnt7[r.user_id] = (cnt7[r.user_id] || 0) + 1

  const seen = new Set()
  const assigned = []
  let skipRec = 0, skipOld = 0, skipToday = 0, skipTired = 0, skipBl = 0
  for (const p of pool) {
    if (!p.email || /likelion/i.test(p.email)) continue
    const e = p.email.toLowerCase()
    if (seen.has(e) || unsubSet.has(p.id)) continue
    if (bl.has(p)) { skipBl++; continue }
    p.__t = txt(p)
    for (const g of GROUPS) {
      const s = g.pick(p)
      if (s == null) continue
      seen.add(e)
      if (appliedSet.has(p.id)) break
      if (recSet.has(p.id)) { skipRec++; break }
      if (oldSet.has(p.id)) { skipOld++; break }
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
  console.log(`  ── 합계: ${assigned.length}명 (제외: 기수신 ${skipRec} · 전작 R205 수신/지원 ${skipOld} · 당일 겹침 ${skipToday} · 7일 3통+ 지친 풀 ${skipTired} · 블랙리스트 ${skipBl})`)
  if (!doSend) {
    const rows = [...assigned].sort((a, b) => b.s - a.s)
    const hcm = (p) => /(h[ồo]\s*ch[íi]\s*minh|hcm|sài gòn|sai gon|saigon|thủ đức|thu duc|bình thạnh|binh thanh|bình dương|binh duong|đồng nai|dong nai)/i.test(String(p.location || ''))
    console.log(`  지역: HCM권 ${rows.filter((r) => hcm(r.p)).length} · 그 외/미기재 ${rows.filter((r) => !hcm(r.p)).length}`)
    console.log(`\n── 전원 ──`)
    for (const { p, s, g, frame } of rows)
      console.log(`  [${g.gkey}·${s}·${frame}] ${p.full_name} <${p.email}> · ${p.cv_tags?.role_detail || p.position || '?'} · ${Math.round(y(p) / 12 * 10) / 10}y · ${String(p.location || '위치?').slice(0, 28)}`)
    if (previewPath && rows.length) {
      const fs = await import('node:fs')
      const r0 = rows[0]
      for (const frame of ['public', 'private']) {
        const camp = `${r0.g.camp}-${frame}`
        fs.writeFileSync(`${previewPath}-${frame}.html`, emailHtml(r0.p.full_name, 'https://example.invalid/apply', 'https://example.invalid/unsub', job, frame, r0.g))
        fs.writeFileSync(`${previewPath}-${frame}.txt`, `SUBJECT: ${SUBJECT[frame](r0.g.label.vi)}\n\n` + emailText(r0.p.full_name, 'https://example.invalid/apply', 'https://example.invalid/unsub', job, frame, r0.g))
      }
      console.log(`\n미리보기 저장: ${previewPath}-{public,private}.{html,txt}`)
    }
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
      html: emailHtml(p.full_name, u, un, job, frame, g), text: emailText(p.full_name, u, un, job, frame, g),
      headers: { 'List-Unsubscribe': `<${un}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
    })
    if (error) { console.error(`실패 ${p.email}:`, error.message || error); fail++; continue }
    await sb.from('job_recommendations').upsert([{
      user_id: p.id, to_email: p.email, job_id: JOB_ID,
      job_title: job.title, job_company: job.company, sent_by: 'coldmail', kind: 'recommend', status: 'sent',
    }], { onConflict: 'user_id,job_id', ignoreDuplicates: true })
    await sb.from('events').insert([{
      event: 'recommend_sent', page: '/scripts/nxgrowth1020-recommend-coldmail',
      meta: { campaign: camp, job_ids: [JOB_ID], frame, group: g.gkey }, user_id: p.id,
    }])
    ok++
    if (ok % 25 === 0) console.log(`  …${ok}/${targets.length}`)
    await sleep(400)
  }
  console.log(`\n✅ 발송 완료: ${ok}/${targets.length} (실패 ${fail})`)
}

main().catch((e) => { console.error(e); process.exit(1) })
