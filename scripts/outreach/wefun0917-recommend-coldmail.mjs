// Wefun(R204) Product Manager Curation recommend — 9/17 Len FYI 등록 당일 발송.
// JD: Junior+ · B2B 고객사 간식 큐레이션·정산·라포·소싱 (스낵24) · 12-20M · 영어 우대.
// Remote 가능 포지션 (9/17 김호현 위펀 확인 — DB엔 onsite로 등록돼 있어 수정 요청 중) → 지역 게이트 없음(전국).
// 9/17 실측: PM 직군 39(신선 37) · MD·커머스·CS·운영 시그널 288(신선 261). 지노시스 경영지원 풀 인접(호현 코멘트).
// 유저 결정 "1차 150명": TO 1 → 목표 지원 10건 ÷ 신선 풀 전환 5~8% ≈ 150. 나머지 ~170명은
//   위펀 재구매 고객사(3번째 채용)라 다음 공고용으로 보존. 웨이브 구성:
//   pm  PM/Project Manager 직군 × 신선 = 전원
//   md  MD·큐레이션·소싱 직접 텍스트 × 신선 = 총원 150 맞춰 상위 컷 (CS·운영만인 층은 2차 예비)
// 신선도 하드게이트(하이퍼스타 교훈): 최근 7일 recommend 3통+ 수신자는 제외 — 기수신 통수별 클릭률 17.4% vs 6.9% 실측.
// 표준: 1인1통(당일 recommend 기수신 제외) · unsub 전역 제외 · 공개/비공개 프레임.
//
//   node scripts/outreach/wefun0917-recommend-coldmail.mjs                       # dry-run
//   node scripts/outreach/wefun0917-recommend-coldmail.mjs --send [--group pm|md] [--total N] [--max N] [--gap-hours N]
import { Resend } from 'resend'
import { sb, env, fetchAll } from './lib.mjs'
import { makeToken } from '../../lib/campaignToken.js'

const args = process.argv.slice(2)
const flag = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? (args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true) : d }
const doSend = args.includes('--send')
const onlyGroup = flag('group', null)
const TOTAL = flag('total', null) ? parseInt(flag('total'), 10) : 150
const maxN = flag('max', null) ? parseInt(flag('max'), 10) : null
const gapHours = flag('gap-hours', null) ? parseFloat(flag('gap-hours')) : null
const sinceIso = gapHours != null ? new Date(Date.now() - gapHours * 3600 * 1000).toISOString() : new Date().toISOString().slice(0, 10)
const SITE = String(flag('site', env.NEXT_PUBLIC_SITE_URL || 'https://salary-fyi.com')).replace(/\/$/, '')
const RESEND_FROM = env.RESEND_FROM || 'FYI <hello@salary-fyi.com>'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const esc = (s) => String(s || '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
const firstName = (n) => String(n || '').trim().split(/\s+/).slice(-1)[0] || 'bạn'
const strip = (s) => String(s).replace(/<[^>]+>/g, '')

const JOB_ID = 'a0d65ce8-860b-46ff-9efd-a05453ed7bb6' // Wefun Product Manager Curation (R204)

// ── 대상 선정 — Remote라 지역 무관 × Junior 6m+ × PM 직군 or MD·큐레이션 직접 시그널 ──
const exp = (p) => (Array.isArray(p.experiences) ? p.experiences.map((e) => `${e.title || e.position || ''} ${e.company || ''} ${e.description || ''}`).join(' ') : '')
const txt = (p) => (JSON.stringify(p.skills || '') + ' ' + String(p.position || '') + ' ' + String(p.resume_summary || '') + ' ' + exp(p)).toLowerCase()
const roles = (p) => [p.position, ...(p.desired_roles || [])].filter(Boolean)
const DEV = /(backend|frontend|fullstack|mobile|web|embedded|cloud|devops|qa|data|ai|ml|game|design|security|sysadmin|network)/i
const devOnly = (p) => roles(p).length > 0 && roles(p).every((r) => DEV.test(String(r)))
const pmRole = (p) => roles(p).some((r) => /^(pm|product manager|project manager)$/i.test(String(r)))
const opsRole = (p) => roles(p).some((r) => /^(operations|sales|business dev|non-it|other|admin|hr)$/i.test(String(r)))
const mdTxt = (p) => /(\bmd\b|merchandi[sz]|curation|thu mua|purchasing|procurement|sourcing|f&b|thực phẩm|snack|đồ uống|beverage|fmcg|retail|siêu thị|e-?commerce|shopee|lazada|tiki)/i.test(p.__t)
const csTxt = (p) => /(customer service|chăm sóc khách hàng|\bcskh\b|customer support|client relation|account manag|b2b)/i.test(p.__t)
const fnb = (p) => /(f&b|thực phẩm|snack|đồ uống|beverage|fmcg|siêu thị)/i.test(p.__t)
const y = (p) => p.yoe_months ?? 0
const base = (p) => y(p) >= 6 && !devOnly(p)
// 가점: F&B 도메인 > MD·큐레이션 직접 > B2B/CS > 영어인증
const score = (p) => (fnb(p) ? 2 : 0) + (mdTxt(p) ? 2 : 0) + (csTxt(p) ? 1 : 0) + (p.english_cert ? 1 : 0)

// cap: 그룹별 상한(점수순 컷). null = 무제한. md는 TOTAL에서 pm 배정분을 뺀 잔여로 동적 계산.
const GROUPS = [
  {
    gkey: 'pm', camp: 'wefun0917-recommend-pm', cap: null,
    label: { vi: 'Product Manager Curation', ko: 'PM/Project Manager 직군 × 신선' },
    pick: (p) => (base(p) && pmRole(p) ? score(p) : null),
  },
  {
    gkey: 'md', camp: 'wefun0917-recommend-md', cap: 'rest',
    label: { vi: 'Product Manager Curation', ko: 'MD·큐레이션·소싱 직접 텍스트 × 신선' },
    pick: (p) => (base(p) && !pmRole(p) && (opsRole(p) || mdTxt(p)) && mdTxt(p) ? score(p) : null),
  },
]

// ── 카피(vi 실발송) — Remote·급여 12-20M·Junior+ 명시. 영어는 우대라 하드 요건 표기 없음 ──
const COMPANY = 'Wefun'
const INITIAL = 'W'
const META_VI = 'Remote (làm việc từ xa) · 12–20 triệu ₫/tháng · Junior trở lên'
const INTRO = '<b>WEFUN</b> — công ty công nghệ B2B Hàn Quốc cung cấp giải pháp vận hành văn phòng &amp; phúc lợi nhân viên (snack, cà phê, bữa sáng văn phòng, quà tặng doanh nghiệp theo mô hình subscription) — đang tuyển <b>Product Manager Curation</b> cho dịch vụ Snack24 qua FYI. Công việc: xây dựng &amp; đề xuất curation sản phẩm (snack, đồ uống, thực phẩm tiện lợi) phù hợp nhu cầu khách hàng doanh nghiệp B2B; quản lý quyết toán sản phẩm chính xác, có hệ thống (Excel); xây dựng quan hệ với khách hàng doanh nghiệp phụ trách; sourcing sản phẩm. Phù hợp nếu bạn có kinh nghiệm <b>customer service / MD / curation / thu mua</b> — đặc biệt MD ngành thực phẩm (snack, đồ uống, thực phẩm tiện lợi) tại công ty phân phối, hoặc từng làm linh hoạt nhiều đầu việc tại startup B2B. Ưu tiên giao tiếp được tiếng Anh. <b>Làm việc remote</b>, lương <b>12–20 triệu ₫/tháng</b>.'
const SUBJECT = {
  public: (role) => `[FYI] Bạn được chọn vào danh sách đề cử gửi ${COMPANY} — ${role} (Remote)`,
  private: (role) => `[FYI] Bạn được chọn vào danh sách đề cử — ${role} tại ${COMPANY} (Remote)`,
}
const HOOK = 'Đội ngũ FYI đã xem xét toàn bộ hồ sơ đã đăng ký và <b>chọn bạn vào danh sách đề cử</b> cho vị trí dưới đây — hồ sơ của bạn phù hợp với yêu cầu của vị trí này.'
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
  const byGroup = { pm: [], md: [] }
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
  // 그룹 상한: md 는 TOTAL 잔여만큼 점수순 컷 (넘친 인원은 2차 예비로 보존)
  byGroup.md.sort((a, b) => b.s - a.s)
  const mdCap = Math.max(0, TOTAL - byGroup.pm.length)
  const spare = byGroup.md.length - Math.min(byGroup.md.length, mdCap)
  byGroup.md = byGroup.md.slice(0, mdCap)
  const assigned = [...byGroup.pm, ...byGroup.md]

  console.log(`발송 대상(1인 1통 배정, --total ${TOTAL}):`)
  for (const g of GROUPS) {
    const rows = byGroup[g.gkey]
    const pub = rows.filter((x) => x.frame === 'public').length
    console.log(`  ${g.gkey} (${g.label.ko}): ${rows.length}명 (공개 ${pub} / 비공개 ${rows.length - pub})`)
  }
  console.log(`  ── 합계: ${assigned.length}명 (제외: 기수신 ${skipRec} · 당일 겹침 ${skipToday} · 7일 3통+ 지친 풀 ${skipTired} · md 상한컷 예비 ${spare})`)
  if (!doSend) {
    for (const g of GROUPS) {
      const rows = byGroup[g.gkey].slice().sort((a, b) => b.s - a.s)
      if (!rows.length) continue
      console.log(`\n── ${g.gkey} 상위 10 ──`)
      for (const { p, s, frame } of rows.slice(0, 10))
        console.log(`  [${s}·${frame}] ${p.full_name} <${p.email}> · ${p.position || '?'} · ${Math.round((p.yoe_months || 0) / 12 * 10) / 10}y · ${String(p.location || '위치?').slice(0, 28)} · en=${p.english_cert || '-'}`)
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
      event: 'recommend_sent', page: '/scripts/wefun0917-recommend-coldmail',
      meta: { campaign: camp, job_ids: [JOB_ID], frame, group: g.gkey }, user_id: p.id,
    }])
    ok++
    if (ok % 25 === 0) console.log(`  …${ok}/${targets.length}`)
    await sleep(400)
  }
  console.log(`\n✅ 발송 완료: ${ok}/${targets.length} (실패 ${fail})`)
}

main().catch((e) => { console.error(e); process.exit(1) })
