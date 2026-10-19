// DA-SH V247 Marketing Intern — 10/19 한국어 가능자 2차 발송. 배경: DASH 대표 "다음 주까지 10명 클로즈", Emma "한국어 가능자 필요".
// 10/19 실측(scratch dash-core): 1차 497명 중 한국어 신호 33명 → 지원 6(18%). 지원자 39명 중 JD 코어(TOPIK4+/중급 · 재학 · HCMC)는 6명뿐.
// 그룹(cv_tags 기준, lib/cvTagsMatch langLevel/provinceOf):
//   ko-student — 한국어 중급+ 또는 TOPIK 4+ × HCMC권 × 졸업연도 2026+ (JD 코어) = 44 (1차 기수신 리마인드 27 + 신규 17)
//   ko-grad    — 한국어 중급+ 또는 TOPIK 4+ × HCMC권 × 졸업 2020~2025/연도 미상 (JD 재학 요건 미달이나 남영훈 지시 "한국어 가능자면 적극 전달"). 2019 이전 졸업·한국 거주·동명 중복 계정 제외.
// 게이트: 유저 지시 10/19 "130명 발송" — 당일/주간 발송 상한 미적용(A 30·B 54 가 10/19 KTC 일괄에 걸림). V247 기지원자(취소 제외)만 제외. 1차 기수신자는 리마인드 문장 추가.
// 표준: 1인1통 · unsub/블랙리스트 전역 제외 · 공개/비공개 프레임 · 발송 전 coldmailTemplates 등록.
//
//   node scripts/outreach/dash1019-recommend-coldmail.mjs                 # dry-run
//   node scripts/outreach/dash1019-recommend-coldmail.mjs --send [--group <gkey>] [--max N]
import { Resend } from 'resend'
import { sb, env, fetchAll, fetchBlacklist } from './lib.mjs'
import { makeToken } from '../../lib/campaignToken.js'
import { langLevel, provinceOf } from '../../lib/cvTagsMatch.js'

const args = process.argv.slice(2)
const flag = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? (args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true) : d }
const doSend = args.includes('--send')
const onlyGroup = flag('group', null)
const maxN = flag('max', null) ? parseInt(flag('max'), 10) : null
const SITE = String(flag('site', env.NEXT_PUBLIC_SITE_URL || 'https://salary-fyi.com')).replace(/\/$/, '')
const RESEND_FROM = env.RESEND_FROM || 'FYI <hello@salary-fyi.com>'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const esc = (s) => String(s || '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
const firstName = (n) => String(n || '').trim().split(/\s+/).slice(-1)[0] || 'bạn'
const strip = (s) => String(s).replace(/<[^>]+>/g, '')

const hcmRe = /(h[ồo]\s*ch[íi]\s*minh|hcm|sài gòn|sai gon|saigon|thủ đức|thu duc|호치민|호찌민|tphcm|tp\.?\s*hcm)/i
const topik = (p) => { const m = /topik\s*(\d)/i.exec(`${p.korean_cert || ''} ${p.cv_tags?.korean_cert || ''}`); return m ? +m[1] : 0 }
const koOk = (p) => topik(p) >= 4 || ['intermediate', 'business', 'native'].includes(langLevel(p, 'korean'))
const hcmc = (p) => /ho chi minh|hồ chí minh|hcm/i.test(provinceOf(p) || '') || hcmRe.test(String(p.location || ''))
const grad = (p) => p.cv_tags?.graduation_year || p.graduation_year || 0
const koScore = (p) => topik(p) * 2 + ({ native: 6, business: 4, intermediate: 2 }[langLevel(p, 'korean')] || 0)
const inKorea = (p) => /(korea|seoul|daejeon|busan|incheon|한국|서울|대전|부산|인천)/i.test(String(p.location || '')) && !hcmRe.test(String(p.location || ''))
const nameKey = (p) => String(p.full_name || '').toLowerCase().normalize('NFC').replace(/[^\p{L}\p{N}]+/gu, '')

const GROUPS = [
  { gkey: 'ko-student', label: { vi: 'Marketing Intern (tiếng Hàn)', ko: '한국어 중급+/TOPIK4+ × HCMC권 × 졸업연도 2026+ (JD 코어)' },
    pick: (p) => (koOk(p) && hcmc(p) && !inKorea(p) && grad(p) >= 2026 ? 20 + koScore(p) : null) },
  { gkey: 'ko-grad', label: { vi: 'Marketing Intern (tiếng Hàn)', ko: '한국어 중급+/TOPIK4+ × HCMC권 × 졸업 2020~2025/연도 미상' },
    pick: (p) => (koOk(p) && hcmc(p) && !inKorea(p) && (!grad(p) || grad(p) >= 2020) ? 1 + koScore(p) : null) },
]

const JD = {
  code: 'V247', company: 'DA-SH', initial: 'D',
  meta: 'Onsite · COBI Tower 2, Tân Mỹ (Q.7), TP.HCM · Thực tập full-time 3 tháng · 15.000.000 VND/kỳ · TOPIK 4+',
  intro: `<b>DA-SH</b> — công ty dịch vụ hướng nghiệp có trụ sở tại Seoul (Hello My Me, nextpath) — đang <b>tuyển gấp Marketing Intern biết tiếng Hàn</b> qua FYI, làm việc full-time 3 tháng tại COBI Tower 2, Tân Mỹ, TP.HCM. Công ty dự kiến chốt tuyển <b>trong tuần tới</b>, và yêu cầu quan trọng nhất là <b>tiếng Hàn từ TOPIK 4</b> — FYI thấy hồ sơ của bạn có tiếng Hàn nên gửi đề cử này. Công việc: nghiên cứu thị trường sinh viên Việt Nam và đối thủ; thu thập thông tin trường đại học, cộng đồng sinh viên, kênh marketing (Google Sheets/Drive); hỗ trợ nội dung social (Facebook, TikTok) và tài liệu quảng bá; localization nội dung Hàn–Việt; báo cáo tiến độ hằng ngày. Thù lao <b>15.000.000 VND cho kỳ thực tập 3 tháng</b>, thanh toán một lần khi hoàn thành. Khi ứng tuyển, nếu có chứng chỉ TOPIK, bạn hãy đảm bảo CV đã ghi rõ.`,
  gradNote: `Vị trí này ưu tiên sinh viên đang học hoặc bảo lưu; nếu bạn mới tốt nghiệp, FYI vẫn đề cử vì DA-SH đang cần gấp người biết tiếng Hàn và sẵn sàng xem xét hồ sơ phù hợp.`,
}
const SUBJECT = {
  public: (co) => `[FYI] ${co} tuyển gấp Marketing Intern biết tiếng Hàn (TOPIK 4+) — bạn được đề cử`,
  private: (co) => `[FYI] Bạn được đề cử — Marketing Intern biết tiếng Hàn (TOPIK 4+) tại ${co}`,
}
const HOOK = 'Đội ngũ FYI đã xem xét toàn bộ hồ sơ đã đăng ký và <b>chọn bạn vào danh sách đề cử</b> cho vị trí dưới đây — hồ sơ của bạn có tiếng Hàn, đúng yêu cầu quan trọng nhất của vị trí này.'
const REMIND = 'FYI đã gửi bạn vị trí này tuần trước; công ty hiện <b>tuyển gấp và chốt trong tuần tới</b>, nên FYI gửi lại một lần để bạn không bỏ lỡ.'
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
const paras = (gkey, remind) => [JD.intro, gkey === 'ko-grad' ? JD.gradNote : null, remind ? REMIND : null, HOOK].filter(Boolean)
function emailHtml(name, url, unsubUrl, jd, job, frame, gkey, remind) {
  return `<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;background:#faf9f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1a1612">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#faf9f7"><tr><td align="center" style="padding:28px 16px">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px">
  <tr><td style="padding-bottom:18px"><img src="https://salary-fyi.com/fyi-logo.png" height="24" alt="FYI" style="height:24px;width:auto;display:block"></td></tr>
  <tr><td style="font-size:15px;line-height:1.6;color:#1a1612;padding-bottom:6px">Chào ${esc(firstName(name))},</td></tr>
  ${paras(gkey, remind).map((t) => `<tr><td style="font-size:14px;line-height:1.65;color:#4a443c;padding-bottom:14px">${t}</td></tr>`).join('\n  ')}
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
function emailText(name, url, unsubUrl, jd, job, frame, gkey, remind) {
  return `Chào ${firstName(name)},

${paras(gkey, remind).map(strip).join('\n\n')}

- ${job.title.trim()} (${jd.company}) — ${jd.meta} — ${SITE}/ktc/jobs/${jd.id}

${strip(BENEFIT[frame](jd.company))} ${strip(ONETAP)}

${url}

Bạn nhận được email này vì đã đăng ký hồ sơ trên FYI.
— Đội ngũ FYI · salary-fyi.com/jobs
Hủy đăng ký: ${unsubUrl}`
}

async function main() {
  const { data: job, error: jobErr } = await sb.from('jobs').select('id,title,company,location,logo_url,is_active,source_id').eq('source', 'ktc').eq('source_id', JD.code).single()
  if (jobErr || !job || !job.is_active) { console.error('공고 없음/비활성:', JD.code, jobErr?.message); process.exit(1) }
  JD.id = job.id
  const resend = new Resend(env.RESEND_API_KEY)
  const url = (userId, camp) => `${SITE}/api/resume/recommend?t=${makeToken(userId, camp)}&j=${JD.id}`
  const unsubFor = (userId, camp) => `${SITE}/api/coldmail/unsub?t=${makeToken(userId, camp)}`
  const [pool, unsubs, recs, apps, bl] = await Promise.all([
    fetchAll(() => sb.from('user_profiles').select('id,email,full_name,korean_cert,cv_tags,location,graduation_year,is_resume_public,major,university').not('email', 'is', null).not('resume_url', 'is', null).order('created_at', { ascending: false })),
    fetchAll(() => sb.from('events').select('user_id').eq('event', 'coldmail_unsub').not('user_id', 'is', null).order('id')),
    fetchAll(() => sb.from('job_recommendations').select('user_id').eq('job_id', JD.id).order('id')),
    fetchAll(() => sb.from('job_applications').select('user_id').eq('job_id', JD.id).neq('status', 'canceled').order('id')),
    fetchBlacklist(),
  ])
  const unsubSet = new Set(unsubs.map((r) => r.user_id)), recSet = new Set(recs.map((r) => r.user_id)), appliedSet = new Set(apps.map((a) => a.user_id))
  const seen = new Set(); const assigned = []; let skipApplied = 0
  for (const p of pool) {
    if (!p.email || /likelion/i.test(p.email)) continue
    const e = p.email.toLowerCase()
    if (seen.has(e) || unsubSet.has(p.id) || bl.has(p)) continue
    if (nameKey(p) && seen.has('n:' + nameKey(p))) continue
    for (const g of GROUPS) {
      const s = g.pick(p); if (s == null) continue
      if (appliedSet.has(p.id)) { skipApplied++; seen.add(e); break }
      seen.add(e); if (nameKey(p)) seen.add('n:' + nameKey(p)); assigned.push({ p, s, g, frame: p.is_resume_public ? 'public' : 'private', remind: recSet.has(p.id) }); break
    }
  }
  console.log('발송 대상(1인 1통 · V247 기지원자만 제외 · 당일/주간 상한 미적용):')
  for (const g of GROUPS) { const rows = assigned.filter((r) => r.g.gkey === g.gkey); console.log(`  ${g.gkey}: ${rows.length}명 (공개 ${rows.filter((x) => x.frame === 'public').length} · 리마인드 ${rows.filter((x) => x.remind).length}) — ${g.label.ko}`) }
  console.log(`  ── 합계: ${assigned.length}명 (제외: 기지원 ${skipApplied})`)
  if (!doSend) {
    for (const g of GROUPS) {
      const rows = assigned.filter((r) => r.g.gkey === g.gkey).sort((a, b) => b.s - a.s)
      console.log(`\n── ${g.gkey} 전체 (${rows.length}) ──`)
      for (const { p, s, frame, remind } of rows) console.log(`  [${s}·${frame}${remind ? '·re' : ''}] ${p.full_name} · TOPIK ${topik(p) || '-'} · ${langLevel(p, 'korean')} · ${grad(p) || '?'} · ${String(p.cv_tags?.major_raw || p.major || '').slice(0, 28)} · ${String(p.location || provinceOf(p) || '').slice(0, 20)}`)
    }
    console.log('\n(dry-run — 실발송하려면 --send, 그룹 한정 --group <gkey>)'); return
  }
  let targets = [...assigned].sort((a, b) => b.s - a.s)
  if (onlyGroup) targets = targets.filter((r) => r.g.gkey === onlyGroup)
  if (maxN) targets = targets.slice(0, maxN)
  let ok = 0, fail = 0; const okBy = {}
  for (const { p, g, frame, remind } of targets) {
    const camp = `dash1019-recommend-${g.gkey}-${frame}`
    const u = url(p.id, camp), un = unsubFor(p.id, camp)
    const { error } = await resend.emails.send({ from: RESEND_FROM, to: p.email, subject: SUBJECT[frame](JD.company), html: emailHtml(p.full_name, u, un, JD, job, frame, g.gkey, remind), text: emailText(p.full_name, u, un, JD, job, frame, g.gkey, remind), headers: { 'List-Unsubscribe': `<${un}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' } })
    if (error) { console.error(`실패 ${p.email}:`, error.message || error); fail++; continue }
    await sb.from('job_recommendations').upsert([{ user_id: p.id, to_email: p.email, job_id: JD.id, job_title: job.title, job_company: job.company, sent_by: 'coldmail', kind: 'recommend', status: 'sent' }], { onConflict: 'user_id,job_id', ignoreDuplicates: true })
    await sb.from('events').insert([{ event: 'recommend_sent', page: '/scripts/dash1019-recommend-coldmail', meta: { campaign: camp, job_ids: [JD.id], frame, group: g.gkey, remind }, user_id: p.id }])
    ok++; okBy[g.gkey] = (okBy[g.gkey] || 0) + 1; if (ok % 50 === 0) console.log(`  …${ok}/${targets.length}`); await sleep(400)
  }
  console.log(`\n✅ 발송 완료: ${ok}/${targets.length} (실패 ${fail}) — ${Object.entries(okBy).map(([k, v]) => `${k} ${v}`).join(' · ')}`)
}
main().catch((e) => { console.error(e); process.exit(1) })
