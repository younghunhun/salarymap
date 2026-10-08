// Nexacode(R216) AI Growth Marketer — 전작 R205 AI Native Marketer(9/17, nxai0917) 풀 재오픈 안내 (10/8).
// 배경: 10/6 nxgrowth1006 은 유저 결정으로 "미발송 풀만" 발송 → R205 수신·지원자 제외. 10/8 실측(scripts/tmp/nxgrowth1006-pool-measure.mjs):
//   R216 69통 → 지원 6, 신규 풀 소진(T2 4명). R205 지원자 32명(pending 24 · rejected 8) 중 R216 으로 넘어온 사람 0,
//   R205 recommend 수신 46명 중 미지원 40명. 유저 결정(10/8): "전작 다시 물어봐야 — 재오픈 됐다고 하고".
// 그룹(배타): applied = R205 지원자 중 pending(이전 지원서는 R205 공고에 묶여 있어 R216 으로 1탭 재지원 요청) /
//   nominated = R205 recommend 수신 × R205 미지원(재추천 프레임). R205 rejected 8 은 Nexacode 가 이미 검토·탈락시킨 사람이라 제외.
// 공통 제외: R216 기수신·기지원 · unsub · blacklist · 당일 겹침 · 최근 7일 recommend 3통+. 1인1통 · 공개/비공개 프레임.
// 카피: R205 대비 달라진 점(직함 AI Native → AI Growth · 한국 B2B 고객 확보 추가 · 필요 시 원격) 을 명시하고 나머지는 R216 공고 본문 그대로.
//
//   node scripts/outreach/nxreopen1008-coldmail.mjs                        # dry-run
//   node scripts/outreach/nxreopen1008-coldmail.mjs --preview <path>        # 첫 대상 기준 HTML/텍스트 저장
//   node scripts/outreach/nxreopen1008-coldmail.mjs --send [--group applied|nominated] [--max N] [--gap-hours N]
import { Resend } from 'resend'
import { sb, env, fetchAll, fetchBlacklist } from './lib.mjs'
import { makeToken } from '../../lib/campaignToken.js'

const args = process.argv.slice(2)
const flag = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? (args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true) : d }
const doSend = args.includes('--send')
const onlyGroup = flag('group', null)
const maxN = flag('max', null) ? parseInt(flag('max'), 10) : null
const gapHours = flag('gap-hours', null) ? parseFloat(flag('gap-hours')) : null
const previewPath = flag('preview', null)
const sinceIso = gapHours != null ? new Date(Date.now() - gapHours * 3600 * 1000).toISOString() : new Date().toISOString().slice(0, 10)
const SITE = String(flag('site', env.NEXT_PUBLIC_SITE_URL || 'https://salary-fyi.com')).replace(/\/$/, '')
const RESEND_FROM = env.RESEND_FROM || 'FYI <hello@salary-fyi.com>'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const esc = (s) => String(s || '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
const firstName = (n) => String(n || '').trim().split(/\s+/).slice(-1)[0] || 'bạn'
const strip = (s) => String(s).replace(/<[^>]+>/g, '')

const JOB_ID = '5deaf792-f749-47c2-acc2-f6c55e77ed93' // Nexacode AI Growth Marketer (R216)
const OLD_JOB_ID = '146b9902-46c4-41d5-bcd0-a8356009bd5e' // R205 AI Native Marketer — 대상 풀의 출처

const GROUPS = [
  { gkey: 'applied', camp: 'nxreopen1008-applied', label: { ko: 'R205 지원자(pending) — 새 공고로 재지원 요청' } },
  { gkey: 'nominated', camp: 'nxreopen1008-nominated', label: { ko: 'R205 추천 수신 × 미지원 — 재추천' } },
].filter((g) => !onlyGroup || g.gkey === onlyGroup)

// ── 카피(vi 실발송) — 업무·요건·근무형태는 R216 공고 본문(Len 등록, 10/6) 그대로. "달라진 점" 은 R205 공고와의 실제 차이만 ──
const COMPANY = 'Nexacode'
const INITIAL = 'N'
const ROLE = 'AI Growth Marketer'
const META_VI = 'Văn phòng Quận 1, TP.HCM · Có thể làm việc từ xa khi cần · 12–20 triệu ₫/tháng'
const OPEN = {
  applied: `Tháng trước bạn đã ứng tuyển vị trí <b>AI Native Marketer</b> tại <b>${COMPANY}</b> qua FYI. ${COMPANY} vừa <b>mở lại vị trí này</b> với tên gọi mới <b>${ROLE}</b> và mô tả công việc được cập nhật. Vì đây là tin tuyển dụng mới, hồ sơ bạn đã nộp trước đó <b>không tự động chuyển sang</b> — nếu bạn vẫn quan tâm, chỉ cần 1 chạm để ứng tuyển lại và hồ sơ của bạn sẽ được gửi đến người phụ trách tuyển dụng trong đợt này.`,
  nominated: `Tháng trước FYI đã giới thiệu đến bạn vị trí <b>AI Native Marketer</b> tại <b>${COMPANY}</b>. ${COMPANY} vừa <b>mở lại vị trí này</b> với tên gọi mới <b>${ROLE}</b> và mô tả công việc được cập nhật. FYI đã rà soát lại và <b>tiếp tục chọn bạn vào danh sách đề cử</b> cho đợt tuyển dụng này.`,
}
const CHANGES = `<b>Điểm mới so với tin trước:</b> công việc bổ sung mảng <b>thu hút khách hàng B2B tại Hàn Quốc</b> (nghiên cứu khách hàng có nhu cầu bảo trì và thuê ngoài phần mềm, đề xuất phù hợp theo từng khách hàng, thu hút lead tư vấn) và <b>có thể làm việc từ xa khi cần thiết</b> (văn phòng chi nhánh tại Quận 1, TP.HCM). Các mảng còn lại giữ nguyên: bán nội dung số và SaaS (vận hành Threads, Instagram, quảng cáo Meta, blog và SEO/SEM, cải thiện ROAS) và ứng dụng AI vào nghiên cứu khách hàng, sản xuất creative, phân tích hiệu quả và tự động hóa. Phỏng vấn khoảng 60 phút, trong đó khoảng 30 phút kiểm tra năng lực thực tế qua chia sẻ màn hình (được phép dùng công cụ AI). Thử việc khoảng 2 tháng, sau khi lên chính thức có thưởng theo hiệu suất. Lương <b>12–20 triệu ₫/tháng</b>.`
const SUBJECT = {
  applied: `[FYI] Vị trí bạn đã ứng tuyển tại ${COMPANY} vừa mở lại — ${ROLE}`,
  nominated: `[FYI] ${COMPANY} mở lại vị trí — bạn tiếp tục có tên trong danh sách đề cử (${ROLE})`,
}
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

function emailHtml(name, url, unsubUrl, job, gkey, frame) {
  return `<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;background:#faf9f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1a1612">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#faf9f7"><tr><td align="center" style="padding:28px 16px">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px">
  <tr><td style="padding-bottom:18px"><img src="https://salary-fyi.com/fyi-logo.png" height="24" alt="FYI" style="height:24px;width:auto;display:block"></td></tr>
  <tr><td style="font-size:15px;line-height:1.6;color:#1a1612;padding-bottom:6px">Chào ${esc(firstName(name))},</td></tr>
  <tr><td style="font-size:14px;line-height:1.65;color:#4a443c;padding-bottom:14px">${OPEN[gkey]}</td></tr>
  <tr><td style="padding-bottom:10px">${jobCard(job)}</td></tr>
  <tr><td style="font-size:14px;line-height:1.65;color:#4a443c;padding-bottom:14px">${CHANGES}</td></tr>
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

function emailText(name, url, unsubUrl, job, gkey, frame) {
  return `Chào ${firstName(name)},

${strip(OPEN[gkey])}

- ${job.title.trim()} (${COMPANY}) — ${META_VI} — ${SITE}/ktc/jobs/${JOB_ID}

${strip(CHANGES)}

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
  const [oldRecs, oldApps, recs, apps, unsubs, todays, recent, bl] = await Promise.all([
    fetchAll(() => sb.from('job_recommendations').select('user_id').eq('job_id', OLD_JOB_ID).order('id')),
    fetchAll(() => sb.from('job_applications').select('user_id,status').eq('job_id', OLD_JOB_ID).order('id')),
    fetchAll(() => sb.from('job_recommendations').select('user_id').eq('job_id', JOB_ID).order('id')),
    fetchAll(() => sb.from('job_applications').select('user_id').eq('job_id', JOB_ID).order('id')),
    fetchAll(() => sb.from('events').select('user_id').eq('event', 'coldmail_unsub').not('user_id', 'is', null).order('id')),
    fetchAll(() => sb.from('job_recommendations').select('user_id,to_email').gte('created_at', sinceIso).order('id')),
    fetchAll(() => sb.from('job_recommendations').select('user_id').gte('created_at', weekAgoIso).order('id')),
    fetchBlacklist(),
  ])
  const oldAppStatus = new Map(oldApps.map((a) => [a.user_id, a.status]))
  const oldRecSet = new Set(oldRecs.map((r) => r.user_id))
  const ids = [...new Set([...oldRecSet, ...oldAppStatus.keys()])].filter(Boolean)
  const pool = []
  for (let i = 0; i < ids.length; i += 200) {
    const { data, error } = await sb.from("user_profiles")
      .select('id,email,full_name,position,yoe_months,location,is_resume_public,resume_url')
      .in('id', ids.slice(i, i + 200))
    if (error) { console.error("프로필 조회 실패:", error.message); process.exit(1) }
    pool.push(...(data || []))
  }
  const unsubSet = new Set(unsubs.map((r) => r.user_id))
  const recSet = new Set(recs.map((r) => r.user_id))
  const appliedSet = new Set(apps.map((a) => a.user_id))
  const todayUsers = new Set(todays.map((r) => r.user_id))
  const todayEmails = new Set(todays.map((r) => (r.to_email || '').toLowerCase()).filter(Boolean))
  const cnt7 = {}
  for (const r of recent) cnt7[r.user_id] = (cnt7[r.user_id] || 0) + 1
  const groupOf = (p) => {
    const st = oldAppStatus.get(p.id)
    if (st) return st === 'rejected' ? null : 'applied'
    return oldRecSet.has(p.id) ? 'nominated' : null
  }
  const seen = new Set()
  const assigned = []
  let skipRejected = 0, skipRec = 0, skipApplied = 0, skipToday = 0, skipTired = 0, skipBl = 0, skipNoResume = 0
  for (const p of pool) {
    if (!p.email || /likelion/i.test(p.email)) continue
    const e = p.email.toLowerCase()
    if (seen.has(e) || unsubSet.has(p.id)) continue
    seen.add(e)
    if (bl.has(p)) { skipBl++; continue }
    if (!p.resume_url) { skipNoResume++; continue }
    const gkey = groupOf(p)
    if (!gkey) { skipRejected++; continue }
    const g = GROUPS.find((x) => x.gkey === gkey)
    if (!g) continue
    if (appliedSet.has(p.id)) { skipApplied++; continue }
    if (recSet.has(p.id)) { skipRec++; continue }
    if (todayUsers.has(p.id) || todayEmails.has(e)) { skipToday++; continue }
    if ((cnt7[p.id] || 0) >= 3) { skipTired++; continue }
    assigned.push({ p, g, frame: p.is_resume_public ? 'public' : 'private' })
  }
  console.log('발송 대상(1인 1통 배정):')
  for (const g of GROUPS) {
    const rows = assigned.filter((r) => r.g.gkey === g.gkey)
    const pub = rows.filter((x) => x.frame === 'public').length
    console.log(`  ${g.gkey} (${g.label.ko}): ${rows.length}명 (공개 ${pub} / 비공개 ${rows.length - pub})`)
  }
  console.log(`  ── 합계: ${assigned.length}명 (제외: R205 rejected ${skipRejected} · R216 기지원 ${skipApplied} · R216 기수신 ${skipRec} · 당일 겹침 ${skipToday} · 7일 3통+ ${skipTired} · 블랙리스트 ${skipBl} · 이력서 없음 ${skipNoResume})`)
  if (!doSend) {
    console.log(`\n── 전원 ──`)
    for (const { p, g, frame } of assigned)
      console.log(`  [${g.gkey}·${frame}] ${p.full_name} <${p.email}> · ${p.position || '?'} · ${Math.round((p.yoe_months || 0) / 12 * 10) / 10}y · ${String(p.location || '위치?').slice(0, 28)}`)
    if (previewPath && assigned.length) {
      const fs = await import('node:fs')
      for (const g of GROUPS) {
        const r0 = assigned.find((r) => r.g.gkey === g.gkey) || assigned[0]
        for (const frame of ['public', 'private']) {
          fs.writeFileSync(`${previewPath}-${g.gkey}-${frame}.html`, emailHtml(r0.p.full_name, 'https://example.invalid/apply', 'https://example.invalid/unsub', job, g.gkey, frame))
          fs.writeFileSync(`${previewPath}-${g.gkey}-${frame}.txt`, `SUBJECT: ${SUBJECT[g.gkey]}\n\n` + emailText(r0.p.full_name, 'https://example.invalid/apply', 'https://example.invalid/unsub', job, g.gkey, frame))
        }
      }
      console.log(`\n미리보기 저장: ${previewPath}-{applied,nominated}-{public,private}.{html,txt}`)
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
      from: RESEND_FROM, to: p.email, subject: SUBJECT[g.gkey],
      html: emailHtml(p.full_name, u, un, job, g.gkey, frame), text: emailText(p.full_name, u, un, job, g.gkey, frame),
      headers: { 'List-Unsubscribe': `<${un}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
    })
    if (error) { console.error(`실패 ${p.email}:`, error.message || error); fail++; continue }
    await sb.from('job_recommendations').upsert([{
      user_id: p.id, to_email: p.email, job_id: JOB_ID,
      job_title: job.title, job_company: job.company, sent_by: 'coldmail', kind: 'recommend', status: 'sent',
    }], { onConflict: 'user_id,job_id', ignoreDuplicates: true })
    await sb.from('events').insert([{
      event: 'recommend_sent', page: '/scripts/nxreopen1008-coldmail',
      meta: { campaign: camp, job_ids: [JOB_ID], frame, group: g.gkey, reopen_of: OLD_JOB_ID }, user_id: p.id,
    }])
    ok++
    if (ok % 25 === 0) console.log(`  …${ok}/${targets.length}`)
    await sleep(400)
  }
  console.log(`\n✅ 발송 완료: ${ok}/${targets.length} (실패 ${fail})`)
}
main().catch((e) => { console.error(e); process.exit(1) })
