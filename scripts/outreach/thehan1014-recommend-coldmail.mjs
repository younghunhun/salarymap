// The Han 10/14 — V239 Service Manager (Korean speaking) (10/14 Len 등록) recommend, 10/14 발송. Leonora Hotel(Gò Vấp, HCM) 한식당 홀 서비스 매니저 · 한국어 or 영어 · 15~17M · 14:30~23:00 · 월 2회 휴무.
// 10/14 실측(scripts/tmp/nstage-thehan-1014-pool-measure.mjs): F&B/호텔/매장 직함 × KO 18(중급+ 11) · F&B 텍스트 × KO 중급+ 11 · F&B 직함 × EN × 12m+ 47(노이즈 포함). 매니저급 한국어 가능자 거의 없음.
// 게이트(유저 지시 10/14 "보낼 수 있는 풀들 공고별로 다 보내고"): HCM권/미기재 × [T1 F&B 직함 × KO] + [T2 F&B 텍스트 × KO 중급+] + [T3 F&B 직함 × EN × 12m+ × 비개발·비디자인 직군] · 당일 타 공고 기수신 제외.
// 표준: 1인1통 · unsub/블랙리스트 전역 제외 · 공개/비공개 프레임 · 발송 전 coldmailTemplates 등록.
//
//   node scripts/outreach/thehan1014-recommend-coldmail.mjs                 # dry-run
//   node scripts/outreach/thehan1014-recommend-coldmail.mjs --send
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

const expTitles = (p) => (Array.isArray(p.experiences) ? p.experiences.map((e) => `${e.title || e.position || ''}`).join(' | ') : '')
const exp = (p) => (Array.isArray(p.experiences) ? p.experiences.map((e) => `${e.title || e.position || ''} ${e.company || ''} ${e.description || ''}`).join(' ') : '')
const txt = (p) => (JSON.stringify(p.skills || '') + ' ' + String(p.position || '') + ' ' + String(p.headline || '') + ' ' + JSON.stringify(p.desired_roles || '') + ' ' + JSON.stringify(p.resume_summary || '') + ' ' + exp(p) + ' ' + String(p.major || '') + ' ' + JSON.stringify(p.certs || '')).toLowerCase()
const roles = (p) => [p.position, ...(p.desired_roles || [])].filter(Boolean)
const y = (p) => p.yoe_months ?? 0
const hcmRe = /(h[ồo]\s*ch[íi]\s*minh|hcm|sài gòn|sai gon|saigon|thủ đức|thu duc|bình thạnh|bình dương|binh duong|đồng nai|dong nai|biên hòa|long an|호치민|호찌민|hóc môn|gò vấp|go vap|tân bình|tân phú|bình tân|phú nhuận|củ chi|nhà bè|bình chánh|quận \d|district \d|tphcm|tp\.?\s*hcm)/i
const hcmOk = (p) => { const l = String(p.location || ''); return !l.trim() || hcmRe.test(l) }
const koCert = (p) => String(p.korean_cert || '').trim()
const koOk = (p) => (!!koCert(p) && !/^(none|no|không|없음|-|n\/a)$/i.test(koCert(p))) || /(korean|tiếng hàn|topik|한국어|hàn quốc)/i.test(p.__t)
const koStrict = (p) => !!koCert(p) && !/^(none|no|không|없음|-|n\/a|basic|beginner|cơ bản|sơ cấp|기본|초급)$/i.test(koCert(p))
const enOk = (p) => !!String(p.english_cert || '').trim() && !/^(none|no|không|없음|-|n\/a)$/i.test(String(p.english_cert).trim())
const fnbTitle = (p) => /(f&b|restaurant|nhà hàng|hotel|khách sạn|hospitality|resort|cafe|coffee|quán|bar\b|barista|waiter|waitress|phục vụ|lễ tân|receptionist|front office|front desk|housekeeping|quản lý cửa hàng|cửa hàng trưởng|store manager|shift leader|trưởng ca|supervisor nhà hàng|f&b supervisor|captain|hostess|steward|banquet|concierge|guest)/i.test(expTitles(p) + ' ' + roles(p).join(' '))
const fnbText = (p) => /(f&b|restaurant|nhà hàng|hotel|khách sạn|hospitality|resort|lotte|cgv|highlands|starbucks|phục vụ|lễ tân|front office|housekeeping)/i.test(p.__t)
const mgr = (p) => /(manager|quản lý|supervisor|giám sát|trưởng|leader|lead\b|coo\b|head)/i.test(expTitles(p))
const techRole = (p) => roles(p).some((r) => /(developer|engineer|frontend|backend|fullstack|mobile|design|designer|data|devops|qa|tester|po\b|pm\b)/i.test(r))

const GROUPS = [
  { gkey: 'service', jobKey: 'V239', label: { vi: 'Service Manager (Korean speaking)', ko: 'HCM권/미기재 × (F&B 직함 × KO) + (F&B 텍스트 × KO 중급+) + (F&B 직함 × EN × 12m+ × 비개발·비디자인)' },
    pick: (p) => {
      if (!hcmOk(p)) return null
      const t1 = fnbTitle(p) && koOk(p), t2 = !fnbTitle(p) && fnbText(p) && koStrict(p), t3 = fnbTitle(p) && !koOk(p) && enOk(p) && y(p) >= 12 && !techRole(p)
      if (!(t1 || t2 || t3)) return null
      return 1 + (t1 ? 4 : 0) + (t2 ? 2 : 0) + (koStrict(p) ? 2 : 0) + (mgr(p) ? 3 : 0) + (y(p) >= 24 ? 1 : 0) + (enOk(p) ? 1 : 0)
    } },
]

const CO = 'The Han'
const JOBS = {
  V239: {
    id: '0fd44567-2e64-4bd5-a3d4-2a352c72865d', initial: 'T', meta: 'Onsite · Leonora Hotel, Gò Vấp, TP.HCM · 14:30–23:00 · 15–17 triệu',
    intro: `<b>The Han</b> — nhà hàng Hàn Quốc sắp khai trương tại <b>Leonora Hotel (37 Nguyễn Văn Dung, Gò Vấp, TP.HCM)</b> — đang tuyển <b>Service Manager (Korean speaking)</b> qua FYI. Công việc: trước khai trương hỗ trợ giám đốc (tìm phương án giảm chi phí F&amp;B, quản lý giấy tờ, nhà cung cấp, so sánh báo giá vật dụng); sau khai trương phụ trách toàn bộ dịch vụ sảnh — kiểm tra mở/đóng ca, vệ sinh, tồn kho và đặt vật tư, quản lý và đào tạo nhân viên sảnh (lịch làm việc, chấm công, thái độ phục vụ), tiếp đón khách và VIP, xử lý khiếu nại, quản lý đặt bàn (bếp do đầu bếp và team bếp phụ trách). Yêu cầu: <b>tiếng Hàn hoặc tiếng Anh</b> đủ để giao tiếp và điều hành công việc; nhạy số, quản lý chi phí và giấy tờ; tinh thần dịch vụ, chăm sóc khách chu đáo; chủ động và có trách nhiệm. Làm việc 14:30–23:00 (8,5 giờ/ngày, nghỉ giữa ca 30 phút), nghỉ 2 ngày/tháng; lương <b>15–17 triệu/tháng</b>, thử việc 1 tháng (80% lương), thưởng KPI sau khi lên chính thức.`,
  },
}
const SUBJECT = {
  public: (role) => `[FYI] Bạn được chọn vào danh sách đề cử gửi The Han — ${role} (Gò Vấp, TP.HCM)`,
  private: (role) => `[FYI] Bạn được chọn vào danh sách đề cử — ${role} tại The Han (Gò Vấp, TP.HCM)`,
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
      <div style="font-size:12px;color:#8a8073;margin-bottom:3px">${esc(CO)}</div>
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
  <tr><td style="font-size:14px;line-height:1.65;color:#4a443c;padding-top:4px">${BENEFIT[frame](CO)} ${ONETAP}</td></tr>
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

- ${job.title.trim()} (${CO}) — ${jd.meta} — ${SITE}/ktc/jobs/${jd.id}

${strip(BENEFIT[frame](CO))} ${strip(ONETAP)}

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
    fetchAll(() => sb.from('user_profiles').select('id,email,full_name,position,desired_roles,headline,major,yoe_months,location,english_cert,korean_cert,is_resume_public,skills,resume_summary,experiences,certs').not('email', 'is', null).not('resume_url', 'is', null).order('created_at', { ascending: false })),
    fetchAll(() => sb.from('events').select('user_id').eq('event', 'coldmail_unsub').not('user_id', 'is', null).order('id')),
    fetchAll(() => sb.from('job_recommendations').select('user_id,job_id').in('job_id', jobIds).order('id')),
    fetchAll(() => sb.from('job_applications').select('user_id,job_id').in('job_id', jobIds).order('id')),
    fetchBlacklist(),
    fetchAll(() => sb.from('job_recommendations').select('user_id').gte('created_at', new Date().toISOString().slice(0, 10)).order('id')),
  ])
  const todaySet = new Set(todays.map((r) => r.user_id)), unsubSet = new Set(unsubs.map((r) => r.user_id))
  const recSet = new Set(recs.map((r) => `${r.user_id}|${r.job_id}`)), appliedSet = new Set(apps.map((a) => `${a.user_id}|${a.job_id}`))
  const seen = new Set(); const assigned = []; let skipRec = 0, skipToday = 0
  for (const p of pool) {
    if (!p.email || /likelion/i.test(p.email)) continue
    const e = p.email.toLowerCase()
    if (seen.has(e) || unsubSet.has(p.id) || bl.has(p)) continue
    if (todaySet.has(p.id)) { skipToday++; continue }
    p.__t = txt(p)
    for (const g of GROUPS) {
      const s = g.pick(p); if (s == null) continue
      const jobId = JOBS[g.jobKey].id
      if (appliedSet.has(`${p.id}|${jobId}`) || recSet.has(`${p.id}|${jobId}`)) { skipRec++; continue }
      seen.add(e); assigned.push({ p, s, g, frame: p.is_resume_public ? 'public' : 'private' }); break
    }
  }
  console.log('발송 대상(1인 1통 배정):')
  for (const g of GROUPS) { const rows = assigned.filter((r) => r.g.gkey === g.gkey); console.log(`  ${g.jobKey} ${g.label.vi}: ${rows.length}명 (공개 ${rows.filter((x) => x.frame === 'public').length}) · KO ${rows.filter((r) => koOk(r.p)).length} · EN만 ${rows.filter((r) => !koOk(r.p)).length} · 매니저 직함 ${rows.filter((r) => mgr(r.p)).length} — ${g.label.ko}`) }
  console.log(`  ── 합계: ${assigned.length}명 (제외: 해당 공고 기수신/기지원 ${skipRec} · 당일 타 공고 기수신 ${skipToday})`)
  if (!doSend) {
    const rows = [...assigned].sort((a, b) => b.s - a.s)
    console.log(`\n── 전체 (${rows.length}) ──`)
    for (const { p, s, frame } of rows) console.log(`  [${s}·${frame}] ${p.full_name} · ${p.position || '?'} · ${Math.round(y(p) / 12 * 10) / 10}y · ${String(p.location || '위치?').slice(0, 16)} · KO:${koCert(p).slice(0, 10) || '-'} · ${expTitles(p).slice(0, 70)}`)
    console.log('\n(dry-run — 실발송하려면 --send)'); return
  }
  let targets = [...assigned].sort((a, b) => b.s - a.s); if (maxN) targets = targets.slice(0, maxN)
  let ok = 0, fail = 0
  for (const { p, g, frame } of targets) {
    const jd = JOBS[g.jobKey], job = jobById[jd.id], camp = `thehan1014-recommend-${g.gkey}-${frame}`
    const u = url(p.id, camp, jd.id), un = unsubFor(p.id, camp)
    const { error } = await resend.emails.send({ from: RESEND_FROM, to: p.email, subject: SUBJECT[frame](g.label.vi), html: emailHtml(p.full_name, u, un, jd, job, frame), text: emailText(p.full_name, u, un, jd, job, frame), headers: { 'List-Unsubscribe': `<${un}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' } })
    if (error) { console.error(`실패 ${p.email}:`, error.message || error); fail++; continue }
    await sb.from('job_recommendations').upsert([{ user_id: p.id, to_email: p.email, job_id: jd.id, job_title: job.title, job_company: job.company, sent_by: 'coldmail', kind: 'recommend', status: 'sent' }], { onConflict: 'user_id,job_id', ignoreDuplicates: true })
    await sb.from('events').insert([{ event: 'recommend_sent', page: '/scripts/thehan1014-recommend-coldmail', meta: { campaign: camp, job_ids: [jd.id], frame, group: g.gkey }, user_id: p.id }])
    ok++; if (ok % 25 === 0) console.log(`  …${ok}/${targets.length}`); await sleep(400)
  }
  console.log(`\n✅ 발송 완료: ${ok}/${targets.length} (실패 ${fail})`)
}
main().catch((e) => { console.error(e); process.exit(1) })
