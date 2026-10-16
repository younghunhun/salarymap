// GPCLUB V248 Senior Growth Leader (B2C) — 10/16 Len FYI 게재 당일 발송. HCM Bình Thạnh(27-29 Nguyễn Cửu Vân) 온사이트 · 월~금 8:30–18:00 + 토 오전 · 15~40M + 매출 성장 % 보너스.
// 이커머스 그로스 4y+ · Shopee/TikTok Shop/Lazada 플랫폼 메커니즘(온사이트 광고·플래시세일) · 데이터 드리븐(GMV/CR/CTR/CIR/ROAS/LTV) · A/B 테스트 · 경쟁사 스크래핑 · 리타게팅 자동화 · CRM/Zalo ZNS · Python/SQL 우대.
// 10/16 실측(scripts/tmp/gpclub1016-pool-measure.mjs): HCM권/미기재 마케팅/그로스 직군 796 중 4y+ 114 → G1 플랫폼명 9 · G2 이커머스 키워드 22 · G3 지표만 14 · G4 3~4y 이커머스 18 · G5 비마케팅×플랫폼명 4 = 67. 유저 지시 10/16 "gpclub 확장 보내" → G1~G5 전부, Design 직군 제외.
// 표준: 1인1통 · unsub/블랙리스트 전역 제외 · 공개/비공개 프레임 · 발송 전 coldmailTemplates 등록.
//
//   node scripts/outreach/gpclub1016-recommend-coldmail.mjs                 # dry-run
//   node scripts/outreach/gpclub1016-recommend-coldmail.mjs --send [--group <gkey>] [--max N] [--ignore-today]
import { Resend } from 'resend'
import { sb, env, fetchAll, fetchBlacklist } from './lib.mjs'
import { makeToken } from '../../lib/campaignToken.js'

const args = process.argv.slice(2)
const flag = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? (args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true) : d }
const doSend = args.includes('--send')
const onlyGroup = flag('group', null)
const maxN = flag('max', null) ? parseInt(flag('max'), 10) : null
const ignoreToday = args.includes('--ignore-today')
const SITE = String(flag('site', env.NEXT_PUBLIC_SITE_URL || 'https://salary-fyi.com')).replace(/\/$/, '')
const RESEND_FROM = env.RESEND_FROM || 'FYI <hello@salary-fyi.com>'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const esc = (s) => String(s || '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
const firstName = (n) => String(n || '').trim().split(/\s+/).slice(-1)[0] || 'bạn'
const strip = (s) => String(s).replace(/<[^>]+>/g, '')

const expTitles = (p) => (Array.isArray(p.experiences) ? p.experiences.map((e) => `${e.title || e.position || ''}`).join(' | ') : '')
const exp = (p) => (Array.isArray(p.experiences) ? p.experiences.map((e) => `${e.title || e.position || ''} ${e.company || ''} ${e.description || ''}`).join(' ') : '')
const txt = (p) => (JSON.stringify(p.skills || '') + ' ' + String(p.position || '') + ' ' + String(p.headline || '') + ' ' + JSON.stringify(p.desired_roles || '') + ' ' + JSON.stringify(p.resume_summary || '') + ' ' + exp(p) + ' ' + String(p.major || '') + ' ' + JSON.stringify(p.certs || '') + ' ' + JSON.stringify(p.projects || '')).toLowerCase()
const roles = (p) => [p.position, ...(p.desired_roles || [])].filter(Boolean)
const y = (p) => p.yoe_months ?? 0
const hcmRe = /(h[ồo]\s*ch[íi]\s*minh|hcm|sài gòn|sai gon|saigon|thủ đức|thu duc|bình thạnh|bình dương|binh duong|đồng nai|dong nai|biên hòa|long an|호치민|호찌민|hóc môn|gò vấp|go vap|tân bình|tân phú|bình tân|phú nhuận|củ chi|nhà bè|bình chánh|quận \d|district \d|tphcm|tp\.?\s*hcm)/i
const city = (p) => { const l = String(p.location || ''); if (!l.trim()) return '미기재'; if (hcmRe.test(l)) return 'HCM'; return '기타' }
const hcmOk = (p) => city(p) !== '기타'
const hcmA = (p) => (city(p) === 'HCM' ? 2 : 0)
const mktRole = (p) => roles(p).some((r) => /(marketing|growth|performance|digital|e-?commerce|ecom|brand|trade marketing|product marketing)/i.test(r)) || /(marketing|growth|e-?commerce|ecom|performance|media buy|digital)/i.test(expTitles(p))
const designRole = (p) => roles(p).some((r) => /(design|ux|ui)/i.test(r)) && !roles(p).some((r) => /(marketing|growth|performance|e-?commerce)/i.test(r))
const ecomRe = /(shopee|tiktok shop|lazada|tiki|sendo|e-?commerce|ecommerce|thương mại điện tử|tmđt|sàn tmđt|marketplace|gmv|flash sale|mega sale|shop ads|on-?site ads|d2c|dtc|livestream|affiliate)/i
const platformRe = /(shopee|tiktok shop|lazada|tiki|sendo)/i
const metricRe = /(roas|\bcr\b|conversion rate|ctr|cir|ltv|retention|cac|cpa|a\/b test|ab test|gmv|funnel|retarget|crm|zns|zalo oa)/i
const techRe = /(python|sql|scrap|crawl|automation|n8n|zapier|make\.com|apps script|power bi|looker|bigquery|data studio|tableau)/i
const leadRe = /(lead|leader|head|manager|director|trưởng|quản lý|senior|sr\.?)/i
const leadSig = (p) => leadRe.test(expTitles(p)) || leadRe.test(String(p.position || ''))
const bonus = (p) => hcmA(p) + (leadSig(p) ? 2 : 0) + (metricRe.test(p.__t) ? 1 : 0) + (techRe.test(p.__t) ? 1 : 0)
const ok4 = (p) => hcmOk(p) && !designRole(p) && y(p) >= 48

const GROUPS = [
  { gkey: 'platform', jobKey: 'V248', label: { vi: 'Senior Growth Leader (B2C)', ko: '마케팅/그로스 직군 × 4y+ × Shopee/TikTok Shop/Lazada 명시 × HCM권/미기재 (코어)' },
    pick: (p) => (ok4(p) && mktRole(p) && platformRe.test(p.__t) ? 40 + bonus(p) : null) },
  { gkey: 'ecom', jobKey: 'V248', label: { vi: 'Senior Growth Leader (B2C)', ko: '마케팅/그로스 직군 × 4y+ × 이커머스/D2C/라이브커머스/GMV 키워드 (코어-2)' },
    pick: (p) => (ok4(p) && mktRole(p) && ecomRe.test(p.__t) ? 30 + bonus(p) : null) },
  { gkey: 'perf', jobKey: 'V248', label: { vi: 'Senior Growth Leader (B2C)', ko: '마케팅/그로스 직군 × 4y+ × 퍼포먼스 지표(ROAS/CR/CRM 등) (확장 — 플랫폼 경험 미확인)' },
    pick: (p) => (ok4(p) && mktRole(p) && metricRe.test(p.__t) ? 20 + bonus(p) : null) },
  { gkey: 'ops-platform', jobKey: 'V248', label: { vi: 'Senior Growth Leader (B2C)', ko: '비마케팅 직군(영업/운영/PO/데이터) × 4y+ × 플랫폼명 명시 (확장)' },
    pick: (p) => (ok4(p) && !mktRole(p) && platformRe.test(p.__t) && /(sales|business|operations|product|data|growth|e-?commerce|kinh doanh)/i.test(roles(p).join(' ') + ' ' + expTitles(p)) ? 10 + bonus(p) : null) },
  { gkey: 'ecom-3y', jobKey: 'V248', label: { vi: 'Senior Growth Leader (B2C)', ko: '마케팅/그로스 직군 × 3~4y × 이커머스 키워드 (확장 — 경력 미달 자기선별)' },
    pick: (p) => (hcmOk(p) && !designRole(p) && mktRole(p) && y(p) >= 36 && y(p) < 48 && ecomRe.test(p.__t) ? 1 + bonus(p) : null) },
]

const JOBS = {
  V248: {
    company: 'GPCLUB', initial: 'G', meta: 'Onsite · 27-29 Nguyễn Cửu Vân, P. Gia Định (Bình Thạnh), TP.HCM · 15–40 triệu/tháng + % bonus tăng trưởng doanh thu · Từ 4 năm E-commerce growth',
    intro: `<b>GPCLUB</b> (gpclub.vn) — thương hiệu B2C bán hàng trên các sàn TMĐT — đang tuyển <b>Senior Growth Leader (B2C)</b> qua FYI, làm việc tại 27-29 Nguyễn Cửu Vân, Bình Thạnh, TP.HCM. Mục tiêu: tăng trưởng GMV kỷ lục trong khi tối ưu nghiêm ngặt CIR (Cost Income Ratio). Công việc: giải mã thuật toán phân phối traffic và điểm chạm hiển thị mới nhất trên <b>Shopee, TikTok Shop, Lazada</b> để đẩy sản phẩm/gian hàng lên Top Search, Top Recommended; tối ưu tỷ lệ chuyển đổi bằng A/B testing liên tục (thumbnail, tiêu đề, Flash Sale, Deal sốc, voucher, minigame); theo dõi đối thủ bằng công cụ scraping (hoặc tự viết script cơ bản) về giá, tồn kho, khuyến mãi theo thời gian thực; thiết kế workflow retargeting tự động Impression → Add to Cart → Checkout; tối đa LTV và retention qua Chat Broadcast, CRM sàn, Zalo ZNS. Yêu cầu: tư duy dữ liệu (GMV, CR, CTR, CIR, ROAS, LTV); am hiểu sâu On-site Ads, Flash Sale và giải pháp marketing của các sàn; tư duy thử nghiệm nhanh; <b>tối thiểu 4 năm kinh nghiệm thực chiến E-commerce growth</b> (D2C, thương hiệu lớn hoặc agency TMĐT là lợi thế lớn); biết Python/SQL hoặc công cụ automation/scraping là điểm cộng lớn. Quyền lợi: lương <b>15–40 triệu/tháng</b> (thỏa thuận theo năng lực) + <b>% bonus trực tiếp trên doanh thu tăng trưởng vượt mục tiêu</b>, không giới hạn; ngân sách thử nghiệm riêng và quyền tự chủ triển khai công cụ mới; môi trường minh bạch, đánh giá theo kết quả thực; BHXH đầy đủ, thưởng lễ Tết, lương tháng 13. Thứ 2 – Thứ 6 8:30–18:00, Thứ 7 8:30–12:30.`,
  },
}
const SUBJECT = {
  public: (co, role) => `[FYI] Bạn được chọn vào danh sách đề cử gửi ${co} — ${role} (TP.HCM)`,
  private: (co, role) => `[FYI] Bạn được chọn vào danh sách đề cử — ${role} tại ${co} (TP.HCM)`,
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
  const { data: jobRows, error: jobErr } = await sb.from('jobs').select('id,title,company,location,logo_url,is_active,source_id').eq('source', 'ktc').in('source_id', Object.keys(JOBS))
  if (jobErr) { console.error('공고 조회 실패:', jobErr.message); process.exit(1) }
  for (const [k, jd] of Object.entries(JOBS)) {
    const j = (jobRows || []).find((r) => r.source_id === k)
    if (!j || !j.is_active) { console.error(`공고 없음/비활성: ${k}`); process.exit(1) }
    jd.id = j.id
  }
  const jobById = Object.fromEntries(jobRows.map((j) => [j.id, j]))
  const jobIds = Object.values(JOBS).map((j) => j.id)
  const resend = new Resend(env.RESEND_API_KEY)
  const url = (userId, camp, jobId) => `${SITE}/api/resume/recommend?t=${makeToken(userId, camp)}&j=${jobId}`
  const unsubFor = (userId, camp) => `${SITE}/api/coldmail/unsub?t=${makeToken(userId, camp)}`
  const [pool, unsubs, recs, apps, bl] = await Promise.all([
    fetchAll(() => sb.from('user_profiles').select('id,email,full_name,position,desired_roles,headline,major,yoe_months,location,english_cert,korean_cert,is_resume_public,skills,resume_summary,experiences,certs,projects').not('email', 'is', null).not('resume_url', 'is', null).order('created_at', { ascending: false })),
    fetchAll(() => sb.from('events').select('user_id').eq('event', 'coldmail_unsub').not('user_id', 'is', null).order('id')),
    fetchAll(() => sb.from('job_recommendations').select('user_id,job_id').in('job_id', jobIds).order('id')),
    fetchAll(() => sb.from('job_applications').select('user_id,job_id').in('job_id', jobIds).order('id')),
    fetchBlacklist(),
  ])
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)
  const todayRecs = await fetchAll(() => sb.from('job_recommendations').select('user_id').gte('created_at', todayStart.toISOString()).order('id'))
  const todaySet = new Set(todayRecs.map((r) => r.user_id))
  const unsubSet = new Set(unsubs.map((r) => r.user_id))
  const recSet = new Set(recs.map((r) => `${r.user_id}|${r.job_id}`)), appliedSet = new Set(apps.map((a) => `${a.user_id}|${a.job_id}`))
  const seen = new Set(); const assigned = []; let skipRec = 0, skipToday = 0
  for (const p of pool) {
    if (!p.email || /likelion/i.test(p.email)) continue
    const e = p.email.toLowerCase()
    if (seen.has(e) || unsubSet.has(p.id) || bl.has(p)) continue
    if (!ignoreToday && todaySet.has(p.id)) { skipToday++; continue }
    p.__t = txt(p)
    for (const g of GROUPS) {
      const s = g.pick(p); if (s == null) continue
      const jobId = JOBS[g.jobKey].id
      if (appliedSet.has(`${p.id}|${jobId}`) || recSet.has(`${p.id}|${jobId}`)) { skipRec++; continue }
      seen.add(e); assigned.push({ p, s, g, frame: p.is_resume_public ? 'public' : 'private' }); break
    }
  }
  console.log(`발송 대상(1인 1통 배정${ignoreToday ? '' : ' · 당일 recommend 기수신자 제외'}):`)
  for (const g of GROUPS) { const rows = assigned.filter((r) => r.g.gkey === g.gkey); console.log(`  ${g.gkey} → ${g.jobKey}: ${rows.length}명 (공개 ${rows.filter((x) => x.frame === 'public').length}) — ${g.label.ko}`) }
  console.log(`  ── 합계: ${assigned.length}명 (제외: 당일 기수신 ${skipToday} · 해당 공고 기수신/기지원 ${skipRec})`)
  if (!doSend) {
    for (const g of GROUPS) {
      const rows = assigned.filter((r) => r.g.gkey === g.gkey).sort((a, b) => b.s - a.s)
      console.log(`\n── ${g.gkey} 상위 8 (총 ${rows.length}) ──`)
      for (const { p, s, frame } of rows.slice(0, 8)) console.log(`  [${s}·${frame}] ${p.full_name} · ${p.position || '?'} · ${Math.round(y(p) / 12 * 10) / 10}y · ${city(p)} · ${expTitles(p).slice(0, 60)}`)
    }
    console.log('\n(dry-run — 실발송하려면 --send, 그룹 한정 --group <gkey>)'); return
  }
  let targets = [...assigned].sort((a, b) => b.s - a.s)
  if (onlyGroup) targets = targets.filter((r) => r.g.gkey === onlyGroup)
  if (maxN) targets = targets.slice(0, maxN)
  let ok = 0, fail = 0; const okBy = {}
  for (const { p, g, frame } of targets) {
    const jd = JOBS[g.jobKey], job = jobById[jd.id], camp = `gpclub1016-recommend-${g.gkey}-${frame}`
    const u = url(p.id, camp, jd.id), un = unsubFor(p.id, camp)
    const { error } = await resend.emails.send({ from: RESEND_FROM, to: p.email, subject: SUBJECT[frame](jd.company, g.label.vi), html: emailHtml(p.full_name, u, un, jd, job, frame), text: emailText(p.full_name, u, un, jd, job, frame), headers: { 'List-Unsubscribe': `<${un}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' } })
    if (error) { console.error(`실패 ${p.email}:`, error.message || error); fail++; continue }
    await sb.from('job_recommendations').upsert([{ user_id: p.id, to_email: p.email, job_id: jd.id, job_title: job.title, job_company: job.company, sent_by: 'coldmail', kind: 'recommend', status: 'sent' }], { onConflict: 'user_id,job_id', ignoreDuplicates: true })
    await sb.from('events').insert([{ event: 'recommend_sent', page: '/scripts/gpclub1016-recommend-coldmail', meta: { campaign: camp, job_ids: [jd.id], frame, group: g.gkey }, user_id: p.id }])
    ok++; okBy[g.gkey] = (okBy[g.gkey] || 0) + 1; if (ok % 50 === 0) console.log(`  …${ok}/${targets.length}`); await sleep(400)
  }
  console.log(`\n✅ 발송 완료: ${ok}/${targets.length} (실패 ${fail}) — ${Object.entries(okBy).map(([k, v]) => `${k} ${v}`).join(' · ')}`)
}
main().catch((e) => { console.error(e); process.exit(1) })
