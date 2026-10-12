// STS 10/9 Kế toán Nội bộ(V221) recommend — Len 게재(10/9), 10/12 발송. 공고 표기 그대로: TP.HCM 온사이트 · 회계/감사/재무 전공 · 내부회계/지급/총계정 1~2년 "우대" · Excel·회계SW · 급여 협의.
// 10/12 실측(scripts/tmp/sts1009-pool-measure.mjs): 회계 시그널(직군 Finance / 경력 직함 / 전공) × HCMC권/미기재 130 → 12m+ 코어 97(A1 직함 48 + A2 직군·전공 49) · 신입 확장층 32 · 타지역 86 제외.
// 게이트(유저 지시 10/12 "코어 97"): 지역 = HCMC권 명시 or 미기재 · 경력 12m+ · 회계 시그널 = 경력 직함 or 직군 Finance/회계 or 전공 회계. 텍스트만 매치(40)·신입(32) 제외. 빈도 게이트 없음.
// 공고 status 는 draft 지만 KTC 공고 전부 draft+active 로 운영 중(10/12 확인) — 상태 변경 불필요.
// 표준: 1인1통 · unsub/블랙리스트 전역 제외 · 공개/비공개 프레임 · 발송 전 coldmailTemplates 등록.
//
//   node scripts/outreach/sts1009-recommend-coldmail.mjs                 # dry-run
//   node scripts/outreach/sts1009-recommend-coldmail.mjs --send           # 97
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

// ── 대상 선정 헬퍼 (sts1009-pool-measure 와 동일) ──
const expTitles = (p) => (Array.isArray(p.experiences) ? p.experiences.map((e) => `${e.title || e.position || ''}`).join(' | ') : '')
const exp = (p) => (Array.isArray(p.experiences) ? p.experiences.map((e) => `${e.title || e.position || ''} ${e.company || ''} ${e.description || ''}`).join(' ') : '')
const txt = (p) => (JSON.stringify(p.skills || '') + ' ' + String(p.position || '') + ' ' + String(p.headline || '') + ' ' + JSON.stringify(p.desired_roles || '') + ' ' + JSON.stringify(p.resume_summary || '') + ' ' + exp(p) + ' ' + String(p.major || '')).toLowerCase()
const roles = (p) => [p.position, ...(p.desired_roles || [])].filter(Boolean)
const y = (p) => p.yoe_months ?? 0
const hcmOk = (p) => { const l = String(p.location || ''); return !l.trim() || /(h[ồo]\s*ch[íi]\s*minh|hcm|sài gòn|sai gon|saigon|thủ đức|thu duc|bình thạnh|bình dương|binh duong|đồng nai|dong nai|biên hòa|long an|호치민|호찌민|hóc môn|gò vấp|tân bình|tân phú|bình tân|phú nhuận|củ chi|nhà bè|bình chánh|quận \d|district \d|tphcm|tp\.?\s*hcm)/i.test(l) }
const enOk = (p) => !!String(p.english_cert || '').trim() && !/^(none|no|없음|-|n\/a)$/i.test(String(p.english_cert).trim())
const koOk = (p) => (!!String(p.korean_cert || '').trim() && !/^(none|no|없음|-|n\/a)$/i.test(String(p.korean_cert).trim())) || /(korean|tiếng hàn|topik|한국어)/i.test(p.__t)
const acctRe = /(kế toán|ke toan|accountant|accounting|kiểm toán|kiem toan|auditor|\baudit\b|bookkeep|tài chính|tai chinh|finance|financial)/i
const acctTitle = (p) => acctRe.test(expTitles(p))
const acctMajor = (p) => acctRe.test(String(p.major || ''))
const acctRole = (p) => roles(p).includes('Finance') || acctRe.test(roles(p).join(' '))
const internalSig = (p) => /(kế toán nội bộ|ke toan noi bo|kế toán thanh toán|kế toán tổng hợp|general accountant|internal account|accounts payable|accounts receivable|công nợ|thu.?chi|đối chiếu|reconcil)/i.test(p.__t)
const sw = (p) => /(misa|fast accounting|\bfast\b|bravo|sap\b|oracle|quickbooks|xero|amis|excel)/i.test(p.__t)

const GROUPS = [
  {
    gkey: 'acct', camp: 'sts1009-recommend-acct', jobKey: 'V221',
    label: { vi: 'Kế toán Nội bộ', ko: '회계 시그널(경력 직함/직군 Finance/전공) × 12m+ × HCMC권/미기재' },
    pick: (p) => (hcmOk(p) && y(p) >= 12 && (acctTitle(p) || acctRole(p) || acctMajor(p)) ? 1 + (acctTitle(p) ? 3 : 0) + (internalSig(p) ? 2 : 0) + (sw(p) ? 1 : 0) + (acctMajor(p) ? 1 : 0) + (y(p) <= 36 ? 1 : 0) + (enOk(p) ? 1 : 0) + (koOk(p) ? 1 : 0) : null),
  },
]

// ── 공고·카피 (vi 실발송) — 공고 본문 그대로 요약 ──
const CO = 'STS'
const JOBS = {
  V221: {
    id: '9aadda06-b0d6-4992-8ee6-b4e3b65aee73', company: CO, initial: 'S', meta: 'TP.HCM · Onsite · Ưu tiên 1–2 năm kinh nghiệm · Lương thỏa thuận',
    intro: `<b>STS</b> (TP.HCM) đang tuyển <b>Kế toán Nội bộ</b> qua FYI. Công việc: theo dõi và kiểm tra thu – chi, tạm ứng, hoàn ứng và thanh toán nội bộ; kiểm tra chứng từ trước khi ghi nhận; theo dõi công nợ phải thu – phải trả và đối chiếu với khách hàng, nhà cung cấp; đối chiếu số dư tiền mặt, ngân hàng; lưu trữ hóa đơn, phiếu thu – chi, hợp đồng; lập báo cáo nội bộ định kỳ (thu – chi, công nợ, doanh thu – chi phí, dòng tiền) và hỗ trợ Kế toán trưởng. <b>Yêu cầu</b>: tốt nghiệp Cao đẳng/Đại học Kế toán, Kiểm toán, Tài chính hoặc liên quan; nắm nguyên tắc kế toán cơ bản và quy trình chứng từ – hóa đơn – thanh toán; sử dụng tốt <b>Excel và phần mềm kế toán</b>; cẩn thận, trung thực, bảo mật thông tin tài chính. <b>Ưu tiên</b>: 1–2 năm kinh nghiệm kế toán nội bộ / kế toán thanh toán / kế toán tổng hợp. Làm việc tại TP.HCM, thứ 2–6 và sáng thứ 7, thử việc 2 tháng, lương theo năng lực và thỏa thuận, BHXH – BHYT – BHTN theo quy định.`,
  },
}

const SUBJECT = {
  public: (company, role) => `[FYI] Bạn được chọn vào danh sách đề cử gửi ${company} — ${role} (TP.HCM)`,
  private: (company, role) => `[FYI] Bạn được chọn vào danh sách đề cử — ${role} tại ${company} (TP.HCM)`,
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

  const [pool, unsubs, recs, apps, bl] = await Promise.all([
    fetchAll(() => sb.from('user_profiles')
      .select('id,email,full_name,position,desired_roles,headline,major,yoe_months,location,english_cert,korean_cert,is_resume_public,skills,resume_summary,experiences')
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
    const rows = [...assigned].sort((a, b) => b.s - a.s)
    console.log(`\n── 상위 15 표본 (총 ${rows.length}) ── 직함 ${rows.filter((r) => acctTitle(r.p)).length} · 내부회계 키워드 ${rows.filter((r) => internalSig(r.p)).length} · 회계SW/Excel ${rows.filter((r) => sw(r.p)).length} · EN ${rows.filter((r) => enOk(r.p)).length} · 1-3y ${rows.filter((r) => y(r.p) <= 36).length}`)
    for (const { p, s, frame } of rows.slice(0, 15))
      console.log(`  [${s}·${frame}] ${p.full_name} <${p.email}> · ${p.position || '?'} · ${Math.round((p.yoe_months || 0) / 12 * 10) / 10}y · ${String(p.location || '위치?').slice(0, 22)} · ${expTitles(p).slice(0, 60)}`)
    console.log('\n(dry-run — 실발송하려면 --send)')
    return
  }

  let targets = [...assigned].sort((a, b) => b.s - a.s)
  if (maxN) targets = targets.slice(0, maxN)
  let ok = 0, fail = 0
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
      event: 'recommend_sent', page: '/scripts/sts1009-recommend-coldmail',
      meta: { campaign: camp, job_ids: [jd.id], frame, group: g.gkey }, user_id: p.id,
    }])
    ok++
    if (ok % 25 === 0) console.log(`  …${ok}/${targets.length}`)
    await sleep(400)
  }
  console.log(`\n✅ 발송 완료: ${ok}/${targets.length} (실패 ${fail})`)
}

main().catch((e) => { console.error(e); process.exit(1) })
