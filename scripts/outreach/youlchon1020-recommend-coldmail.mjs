// YOUL CHON VINA(V258) 시장개발 영업(B2B 플라스틱·포장 2y+ · HCM · 22~40세) recommend — 2026-10-20.
// 근거: scripts/tmp/v258-youlchon-pool-1020.mjs(풀 실측: T1 포장업계 영업 2 · T2 제조 B2B 43 · T3 타산업 B2B/BD 34 = 79). 유저 결정 "발송".
// 쿨다운(최근 7일 recommend 수신) 미적용 — 유저 지시. 표준 제외만: unsub/블랙리스트/likelion · V258 기발송/기지원 · V177(9/16 동일 공고) 지원자 · 당일 recommend 기수신.
// V177 recommend 수신 후 미지원자(18)는 포함. 문안 정본: lib/coldmail/youlchon1020Job.js · 메일 셸은 ktc1019-recommend-coldmail.mjs 와 동일.
//
//   node scripts/outreach/youlchon1020-recommend-coldmail.mjs [--preview <path>]      # dry-run
//   node scripts/outreach/youlchon1020-recommend-coldmail.mjs --send [--max N] [--ignore-today]
import { writeFileSync } from 'node:fs'
import { Resend } from 'resend'
import { sb, env, fetchAll, fetchBlacklist } from './lib.mjs'
import { makeToken } from '../../lib/campaignToken.js'
import { YOULCHON1020_JOB as JD } from '../../lib/coldmail/youlchon1020Job.js'
import { rolesOf, yoeMonthsOf, regionOf, provinceOf } from '../../lib/cvTagsMatch.js'

const args = process.argv.slice(2)
const flag = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? (args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true) : d }
const doSend = args.includes('--send')
const maxN = flag('max', null) ? parseInt(flag('max'), 10) : null
const ignoreToday = args.includes('--ignore-today')
const previewPath = flag('preview', null)
const SITE = String(flag('site', env.NEXT_PUBLIC_SITE_URL || 'https://salary-fyi.com')).replace(/\/$/, '')
const RESEND_FROM = env.RESEND_FROM || 'FYI <hello@salary-fyi.com>'
const OLD_CODE = 'V177'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const esc = (s) => String(s || '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
const firstName = (n) => String(n || '').trim().split(/\s+/).slice(-1)[0] || 'bạn'
const strip = (s) => String(s).replace(/<[^>]+>/g, '')

// ── 선정(scripts/tmp/v258-youlchon-pool-1020.mjs 와 동일) ──
const T = (p) => p.cv_tags || {}
const y = (p) => yoeMonthsOf(p) ?? 0
const SALES = new Set(['Sales (B2B)', 'Sales (B2C / Retail)', 'Business Development', 'Sales', 'Telesales'])
const B2B = new Set(['Sales (B2B)', 'Business Development'])
const MFG = new Set(['Manufacturing', 'Chemical / Materials', 'Electronics', 'Textile / Garment / Footwear', 'F&B / Food'])
const pkgRe = /(nhựa|plastic|bao bì|packaging|carton|hạt nhựa|ép nhựa|polymer)/
const txt = (p) => [JSON.stringify(p.skills || ''), p.headline, p.position, ...(T(p).industry_keywords || []), ...(Array.isArray(p.experiences) ? p.experiences.map((e) => `${e.company || ''} ${e.title || e.position || ''} ${e.description || ''}`) : [])].join(' ').toLowerCase()
const recent = (p) => (Date.now() - new Date(p.updated_at || 0) <= 90 * 86400e3 ? 3 : 0)
const tier = (p) => {
  if (![...rolesOf(p)].some((r) => SALES.has(r))) return null
  if (y(p) < 24) return null
  const r = regionOf(p); if (r != null && r !== 'HCM') return null
  const b = T(p).birth_year; if (b != null && (b < 1986 || b > 2004)) return null
  const mainB2B = B2B.has(T(p).role_detail)
  if (pkgRe.test(txt(p)) && (mainB2B || SALES.has(T(p).role_detail))) return { t: 'T1', s: 90 }
  if (mainB2B && (T(p).industries || []).some((i) => MFG.has(i))) return { t: 'T2', s: 80 }
  if (mainB2B) return { t: 'T3', s: 70 }
  return null
}

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
  const { data: jobRows, error: jobErr } = await sb.from('jobs').select('id,title,company,logo_url,is_active,source_id').eq('source', 'ktc').in('source_id', [JD.code, OLD_CODE])
  if (jobErr) { console.error('공고 조회 실패:', jobErr.message); process.exit(1) }
  const job = jobRows.find((j) => j.source_id === JD.code), oldJob = jobRows.find((j) => j.source_id === OLD_CODE)
  if (!job || !job.is_active) { console.error(`공고 없음/비활성: ${JD.code}`); process.exit(1) }
  const resend = new Resend(env.RESEND_API_KEY)
  const url = (userId, camp) => `${SITE}/api/resume/recommend?t=${makeToken(userId, camp)}&j=${job.id}`
  const unsubFor = (userId, camp) => `${SITE}/api/coldmail/unsub?t=${makeToken(userId, camp)}`
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)
  const [pool, unsubs, recs, apps, oldApps, todayRecs, bl] = await Promise.all([
    fetchAll(() => sb.from('user_profiles').select('id,email,full_name,position,desired_roles,headline,yoe_months,location,is_resume_public,skills,experiences,cv_tags,updated_at').not('email', 'is', null).not('resume_url', 'is', null).order('created_at', { ascending: false })),
    fetchAll(() => sb.from('events').select('user_id').eq('event', 'coldmail_unsub').not('user_id', 'is', null).order('id')),
    fetchAll(() => sb.from('job_recommendations').select('user_id').eq('job_id', job.id).order('id')),
    fetchAll(() => sb.from('job_applications').select('user_id').eq('job_id', job.id).order('id')),
    oldJob ? fetchAll(() => sb.from('job_applications').select('user_id').eq('job_id', oldJob.id).order('id')) : [],
    fetchAll(() => sb.from('job_recommendations').select('user_id').gte('created_at', todayStart.toISOString()).order('id')),
    fetchBlacklist(),
  ])
  const unsubSet = new Set(unsubs.map((r) => r.user_id)), recSet = new Set(recs.map((r) => r.user_id)), appSet = new Set([...apps, ...oldApps].map((a) => a.user_id)), todaySet = new Set(todayRecs.map((r) => r.user_id))
  const seen = new Set(), targets = []; let skipRec = 0, skipApp = 0, skipToday = 0
  for (const p of pool) {
    if (!p.email || /likelion/i.test(p.email)) continue
    const e = p.email.toLowerCase()
    if (seen.has(e) || unsubSet.has(p.id) || bl.has(p)) continue
    seen.add(e)
    const tr = tier(p); if (!tr) continue
    if (recSet.has(p.id)) { skipRec++; continue }
    if (appSet.has(p.id)) { skipApp++; continue }
    if (!ignoreToday && todaySet.has(p.id)) { skipToday++; continue }
    targets.push({ p, t: tr.t, s: tr.s + recent(p) + (T(p).cv_quality || 0), frame: p.is_resume_public ? 'public' : 'private' })
  }
  targets.sort((a, b) => b.s - a.s)
  const cnt = (t) => targets.filter((r) => r.t === t).length
  console.log(`발송 대상 ${targets.length}명 (T1 포장업계 ${cnt('T1')} · T2 제조 B2B ${cnt('T2')} · T3 B2B/BD ${cnt('T3')} · 공개 ${targets.filter((r) => r.frame === 'public').length}) — 제외: V258 기수신 ${skipRec} · V177/V258 기지원 ${skipApp} · 당일 기수신 ${skipToday}`)
  if (!doSend) {
    for (const { p, t, s, frame } of targets.slice(0, 15)) console.log(`  [${t} ${s}·${frame}] ${p.full_name} · ${T(p).role_detail} · ${Math.round(y(p) / 12 * 10) / 10}y · ${provinceOf(p) || '미기재'} · ${(T(p).industries || [])[0] || '-'} · ${(Array.isArray(p.experiences) ? p.experiences.slice(0, 2).map((e) => `${e.company || ''}:${e.title || e.position || ''}`).join(' | ') : '').slice(0, 70)}`)
    if (previewPath && targets[0]) { const { p, frame } = targets[0], camp = `youlchon1020-recommend-${frame}`; writeFileSync(previewPath, emailHtml(p.full_name, url(p.id, camp), unsubFor(p.id, camp), job, frame)); writeFileSync(previewPath.replace(/\.html?$/, '') + '.txt', emailText(p.full_name, url(p.id, camp), unsubFor(p.id, camp), job, frame)); console.log(`미리보기 저장: ${previewPath}`) }
    console.log('\n(dry-run — 실발송하려면 --send)'); return
  }
  const list = maxN ? targets.slice(0, maxN) : targets
  let ok = 0, fail = 0
  for (const { p, t, frame } of list) {
    const camp = `youlchon1020-recommend-${frame}`, u = url(p.id, camp), un = unsubFor(p.id, camp)
    const { error } = await resend.emails.send({ from: RESEND_FROM, to: p.email, subject: SUBJECT[frame], html: emailHtml(p.full_name, u, un, job, frame), text: emailText(p.full_name, u, un, job, frame), headers: { 'List-Unsubscribe': `<${un}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' } })
    if (error) { console.error(`실패 ${p.email}:`, error.message || error); fail++; continue }
    await sb.from('job_recommendations').upsert([{ user_id: p.id, to_email: p.email, job_id: job.id, job_title: job.title, job_company: job.company, sent_by: 'coldmail', kind: 'recommend', status: 'sent' }], { onConflict: 'user_id,job_id', ignoreDuplicates: true })
    await sb.from('events').insert([{ event: 'recommend_sent', page: '/scripts/youlchon1020-recommend-coldmail', meta: { campaign: camp, job_ids: [job.id], frame, tier: t }, user_id: p.id }])
    ok++; if (ok % 25 === 0) console.log(`  …${ok}/${list.length}`); await sleep(400)
  }
  console.log(`\n✅ 발송 완료: ${ok}/${list.length} (실패 ${fail})`)
}
main().catch((e) => { console.error(e); process.exit(1) })
