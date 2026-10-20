// 단건 recommend 콜드메일 공용 발송 — 공고(--job)와 문안(--copy)을 고르고, 대상은 cv-pool 과 같은 플래그로 거른다.
// 표준: unsub/블랙리스트/likelion 제외 · 해당 공고 기수신/기지원 제외 · 당일 recommend 기수신 제외(--ignore-today 로 해제) · 공개/비공개 프레임 · 1통/인.
// 7일 쿨다운은 두지 않는다(유저 정책 2026-10-20). 문안·선정 플래그 정본은 lib/coldmail/recommendJobs.js — 발송 후 거기 flags/desc 에 기록.
//
//   node scripts/outreach/recommend-send.mjs --job V258 --copy youlchon1020 --main "Sales (B2B),Business Development" --yoe 24- --region HCM --age 22-40            # dry-run
//   node scripts/outreach/recommend-send.mjs --job V258 --copy youlchon1020 ... --send [--max N] [--ignore-today] [--exclude-job V177] [--preview <path>]
//   --exclude-job CODE,CODE   다른 공고(이전 동일 공고 등) 기지원자도 제외
import { writeFileSync } from 'node:fs'
import { Resend } from 'resend'
import { sb, env, fetchAll } from './lib.mjs'
import { makeToken } from '../../lib/campaignToken.js'
import { RECOMMEND_JOBS } from '../../lib/coldmail/recommendJobs.js'
import { provinceOf } from '../../lib/cvTagsMatch.js'
import { parseFilters, makePick, loadPool, T, yoe, expSummary, printSummary } from './cvPool.mjs'

const args = process.argv.slice(2)
const f = parseFilters(args)
const doSend = args.includes('--send'), ignoreToday = args.includes('--ignore-today')
const maxN = f.flag('max', null) ? parseInt(f.flag('max'), 10) : null
const previewPath = f.flag('preview', null)
const copyKey = f.flag('copy', null)
const excludeJobs = String(f.flag('exclude-job', '') || '').split(',').map((s) => s.trim().toUpperCase()).filter(Boolean)
if (!f.job || !copyKey || copyKey === true) { console.error('--job CODE 와 --copy KEY 는 필수'); process.exit(1) }
const JD = RECOMMEND_JOBS[copyKey]
if (!JD) { console.error(`문안 없음: ${copyKey} (lib/coldmail/recommendJobs.js 키: ${Object.keys(RECOMMEND_JOBS).join(', ')})`); process.exit(1) }
if (JD.code !== f.job) { console.error(`문안 ${copyKey} 는 ${JD.code} 용인데 --job ${f.job}`); process.exit(1) }
const SITE = String(f.flag('site', env.NEXT_PUBLIC_SITE_URL || 'https://salary-fyi.com')).replace(/\/$/, '')
const RESEND_FROM = env.RESEND_FROM || 'FYI <hello@salary-fyi.com>'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const esc = (s) => String(s || '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
const firstName = (n) => String(n || '').trim().split(/\s+/).slice(-1)[0] || 'bạn'
const strip = (s) => String(s).replace(/<[^>]+>/g, '')

// ── 메일 셸(ktc1019-recommend-coldmail.mjs 와 동일) ──
const HOOK = 'Đội ngũ FYI đã xem xét toàn bộ hồ sơ đã đăng ký và <b>chọn bạn vào danh sách đề cử</b> cho vị trí dưới đây — hồ sơ của bạn phù hợp với yêu cầu của vị trí này.'
const BENEFIT = {
  public: (company) => `<b>Trong tuần này</b>, FYI sẽ gửi danh sách đề cử trực tiếp cho người phụ trách tuyển dụng của ${company}. Hồ sơ của bạn đang ở chế độ công khai nên sẽ được gửi kèm danh sách. Nếu bạn ứng tuyển ngay, CV của bạn sẽ được <b>ưu tiên xem xét</b> cùng lời giới thiệu từ FYI.`,
  private: (company) => `<b>Trong tuần này</b>, FYI sẽ gửi danh sách đề cử trực tiếp cho người phụ trách tuyển dụng của ${company}. Hồ sơ của bạn đang ở chế độ riêng tư — nếu bạn ứng tuyển ngay, CV của bạn sẽ được gửi kèm lời giới thiệu từ FYI và được <b>ưu tiên xem xét</b>.`,
}
const ONETAP = 'Chỉ cần <b>1 chạm</b> — CV đã đăng ký của bạn sẽ được gửi tự động.'
const SUBJECT = {
  public: `[FYI] Bạn được chọn vào danh sách đề cử gửi ${JD.company} — ${JD.title} (${JD.loc})`,
  private: `[FYI] Bạn được chọn vào danh sách đề cử — ${JD.title} tại ${JD.company} (${JD.loc})`,
}
function jobCard(job) {
  const logo = job.logo_url
    ? `<img src="${esc(job.logo_url)}" width="44" height="44" alt="" style="width:44px;height:44px;border-radius:10px;object-fit:cover;background:#f0ebe3;display:block">`
    : `<div style="width:44px;height:44px;border-radius:10px;background:#fff0e6;color:#ff6000;font-weight:800;font-size:16px;text-align:center;line-height:44px">${JD.initial}</div>`
  return `<table width="100%" cellpadding="0" cellspacing="0" style="background:#fff;border:1px solid #eee5da;border-radius:14px;margin-bottom:8px"><tr>
    <td width="44" style="padding:14px 0 14px 14px;vertical-align:middle">${logo}</td>
    <td style="padding:14px 14px 14px 12px;vertical-align:middle">
      <div style="font-size:12px;color:#8a8073;margin-bottom:3px">${esc(JD.company)}</div>
      <div style="font-size:14.5px;font-weight:700;color:#1a1612;line-height:1.35">${esc(JD.title)}</div>
      <div style="font-size:12px;color:#b0691a;margin-top:3px">${esc(JD.meta)}</div>
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
  <tr><td style="font-size:14px;line-height:1.65;color:#4a443c;padding-bottom:14px">${JD.intro}</td></tr>
  <tr><td style="font-size:14px;line-height:1.65;color:#4a443c;padding-bottom:14px">${HOOK}</td></tr>
  <tr><td style="padding-bottom:10px">${jobCard(job)}</td></tr>
  <tr><td style="font-size:14px;line-height:1.65;color:#4a443c;padding-top:4px">${BENEFIT[frame](JD.company)} ${ONETAP}</td></tr>
  <tr><td align="center" style="padding:16px 0 6px">
    <a href="${url}" style="display:inline-block;background:#ff6000;color:#fff;font-weight:700;font-size:15px;text-decoration:none;padding:14px 30px;border-radius:12px">Ứng tuyển 1 chạm →</a>
  </td></tr>
  <tr><td align="center" style="font-size:12.5px;padding-bottom:4px"><a href="${SITE}/ktc/jobs/${job.id}" style="color:#8a8073">Xem mô tả công việc đầy đủ →</a></td></tr>
  <tr><td style="font-size:11.5px;color:#a89f92;text-align:center;line-height:1.5;padding-top:20px">
    Bạn nhận được email này vì đã đăng ký hồ sơ trên FYI.<br>— Đội ngũ FYI · <a href="https://salary-fyi.com/jobs" style="color:#a89f92">salary-fyi.com/jobs</a>
    &nbsp;·&nbsp;<a href="${unsubUrl}" style="color:#a89f92;text-decoration:underline">Hủy đăng ký</a>
  </td></tr>
</table></td></tr></table></body></html>`
}
function emailText(name, url, unsubUrl, job, frame) {
  return `Chào ${firstName(name)},

${strip(JD.intro)}

${strip(HOOK)}

- ${JD.title} (${JD.company}) — ${JD.meta} — ${SITE}/ktc/jobs/${job.id}

${strip(BENEFIT[frame](JD.company))} ${strip(ONETAP)}

${url}

Bạn nhận được email này vì đã đăng ký hồ sơ trên FYI.
— Đội ngũ FYI · salary-fyi.com/jobs
Hủy đăng ký: ${unsubUrl}`
}

async function main() {
  const { base, job, sent, applied } = await loadPool(f)
  if (!job.is_active) { console.error(`공고 비활성: ${job.source_id}`); process.exit(1) }
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)
  const todayRecs = await fetchAll(() => sb.from('job_recommendations').select('user_id').gte('created_at', todayStart.toISOString()).order('id'))
  const todaySet = new Set(todayRecs.map((r) => r.user_id))
  const exApplied = new Set()
  if (excludeJobs.length) {
    const { data: ex } = await sb.from('jobs').select('id,source_id').eq('source', 'ktc').in('source_id', excludeJobs)
    for (const j of ex || []) for (const a of await fetchAll(() => sb.from('job_applications').select('user_id').eq('job_id', j.id).order('id'))) exApplied.add(a.user_id)
  }
  const pick = makePick(f)
  const hit = base.filter(pick)
  let skipSent = 0, skipApp = 0, skipEx = 0, skipToday = 0
  const targets = []
  for (const p of hit) {
    if (sent.has(p.id)) { skipSent++; continue }
    if (applied.has(p.id)) { skipApp++; continue }
    if (exApplied.has(p.id)) { skipEx++; continue }
    if (!ignoreToday && todaySet.has(p.id)) { skipToday++; continue }
    targets.push({ p, s: (Date.now() - new Date(p.updated_at || 0) <= 90 * 86400e3 ? 3 : 0) + (T(p).cv_quality || 0), frame: p.is_resume_public ? 'public' : 'private' })
  }
  targets.sort((a, b) => b.s - a.s)
  console.log(`공고 ${job.source_id} ${job.company} · ${job.title} — 문안 ${copyKey} · 조건 일치 ${hit.length} → 발송 대상 ${targets.length}명 (공개 ${targets.filter((r) => r.frame === 'public').length}) — 제외: 기수신 ${skipSent} · 기지원 ${skipApp}${excludeJobs.length ? ` · ${excludeJobs.join('/')} 기지원 ${skipEx}` : ''} · 당일 기수신 ${skipToday}`)
  if (!doSend) {
    printSummary(targets.map((r) => r.p), '발송 대상')
    for (const { p, frame } of targets.slice(0, 15)) console.log(`  [${frame}] ${p.full_name} · ${T(p).role_detail} · ${Math.round(yoe(p) / 12 * 10) / 10}y · ${provinceOf(p) || '미기재'} · ${expSummary(p).slice(0, 70)}`)
    if (previewPath && targets[0]) { const { p, frame } = targets[0], camp = `${copyKey}-recommend-${frame}`; const u = `${SITE}/api/resume/recommend?t=${makeToken(p.id, camp)}&j=${job.id}`, un = `${SITE}/api/coldmail/unsub?t=${makeToken(p.id, camp)}`; writeFileSync(previewPath, emailHtml(p.full_name, u, un, job, frame)); writeFileSync(previewPath.replace(/\.html?$/, '') + '.txt', emailText(p.full_name, u, un, job, frame)); console.log(`미리보기 저장: ${previewPath}`) }
    console.log('\n(dry-run — 실발송하려면 --send)'); return
  }
  const resend = new Resend(env.RESEND_API_KEY)
  const list = maxN ? targets.slice(0, maxN) : targets
  let ok = 0, fail = 0
  for (const { p, frame } of list) {
    const camp = `${copyKey}-recommend-${frame}`, u = `${SITE}/api/resume/recommend?t=${makeToken(p.id, camp)}&j=${job.id}`, un = `${SITE}/api/coldmail/unsub?t=${makeToken(p.id, camp)}`
    const { error } = await resend.emails.send({ from: RESEND_FROM, to: p.email, subject: SUBJECT[frame], html: emailHtml(p.full_name, u, un, job, frame), text: emailText(p.full_name, u, un, job, frame), headers: { 'List-Unsubscribe': `<${un}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' } })
    if (error) { console.error(`실패 ${p.email}:`, error.message || error); fail++; continue }
    await sb.from('job_recommendations').upsert([{ user_id: p.id, to_email: p.email, job_id: job.id, job_title: job.title, job_company: job.company, sent_by: 'coldmail', kind: 'recommend', status: 'sent' }], { onConflict: 'user_id,job_id', ignoreDuplicates: true })
    await sb.from('events').insert([{ event: 'recommend_sent', page: '/scripts/recommend-send', meta: { campaign: camp, job_ids: [job.id], frame, flags: args.filter((a) => a !== '--send').join(' ') }, user_id: p.id }])
    ok++; if (ok % 25 === 0) console.log(`  …${ok}/${list.length}`); await sleep(400)
  }
  console.log(`\n✅ 발송 완료: ${ok}/${list.length} (실패 ${fail}) — 캠페인 ${copyKey}-recommend-*`)
}
main().catch((e) => { console.error(e); process.exit(1) })
