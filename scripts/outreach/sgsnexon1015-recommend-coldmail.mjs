// SGS Vietnam V241 Sales Executive(TOPIK 4+) · NEXON DEV VINA V242 UA Graphic Designer — 10/14 Len 등록, 10/15 발송. 둘 다 HCM 온사이트.
// 10/15 실측(scripts/tmp 없이 scratch 카운트): SGS = TOPIK4+×영업 8 · TOPIK4+×비개발 1y+ 41 · 한국어 any×영업 2y+ 4 = 53 / NEXON 코어 = 디자인×배너·그래픽·포토샵 시그널 459 · 디자인 직군 76 = 535 (마케팅×포토샵 확장 183 은 미발송).
// 게이트(유저 지시 10/15 "53명이랑 코어 535명 발송해봐"): 당일 타 공고 기수신자 제외 안 함 — 유저가 "중복 상관 없이" 결정(10/15 vn1015 등 586통 발송 후 2통째 허용).
// 표준: 1인1통(이 스크립트 내) · unsub/블랙리스트 전역 제외 · 공개/비공개 프레임 · 발송 전 coldmailTemplates 등록.
//
//   node scripts/outreach/sgsnexon1015-recommend-coldmail.mjs                 # dry-run
//   node scripts/outreach/sgsnexon1015-recommend-coldmail.mjs --send [--group <gkey>] [--max N]
import { Resend } from 'resend'
import { sb, env, fetchAll, fetchBlacklist } from './lib.mjs'
import { makeToken } from '../../lib/campaignToken.js'

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

const expTitles = (p) => (Array.isArray(p.experiences) ? p.experiences.map((e) => `${e.title || e.position || ''}`).join(' | ') : '')
const exp = (p) => (Array.isArray(p.experiences) ? p.experiences.map((e) => `${e.title || e.position || ''} ${e.company || ''} ${e.description || ''}`).join(' ') : '')
const txt = (p) => (JSON.stringify(p.skills || '') + ' ' + String(p.position || '') + ' ' + String(p.headline || '') + ' ' + JSON.stringify(p.desired_roles || '') + ' ' + JSON.stringify(p.resume_summary || '') + ' ' + exp(p) + ' ' + String(p.major || '') + ' ' + JSON.stringify(p.certs || '')).toLowerCase()
const roles = (p) => [p.position, ...(p.desired_roles || [])].filter(Boolean)
const y = (p) => p.yoe_months ?? 0
const hcmRe = /(h[ồo]\s*ch[íi]\s*minh|hcm|sài gòn|sai gon|saigon|thủ đức|thu duc|bình thạnh|bình dương|binh duong|đồng nai|dong nai|biên hòa|long an|호치민|호찌민|hóc môn|gò vấp|go vap|tân bình|tân phú|bình tân|phú nhuận|củ chi|nhà bè|bình chánh|quận \d|district \d|tphcm|tp\.?\s*hcm)/i
const hcmOk = (p) => { const l = String(p.location || ''); return !l.trim() || hcmRe.test(l) }
const hcmA = (p) => (hcmRe.test(String(p.location || '')) ? 2 : 0)
const koCert = (p) => String(p.korean_cert || '').trim()
const koHi = (p) => /topik\s*[4-6]|topik\s*(ii|2)\b.*[4-6]|level\s*[4-6]|cấp\s*[4-6]|[4-6]급|native|bản ngữ|fluent|advanced|c1|c2/i.test(koCert(p)) || /topik\s*[4-6]/i.test(p.__t)
const koAny = (p) => (!!koCert(p) && !/^(none|no|không|없음|-|n\/a)$/i.test(koCert(p))) || /(korean|tiếng hàn|topik|한국어)/i.test(p.__t)
const dev = (p) => roles(p).some((r) => /(developer|engineer|frontend|backend|fullstack|mobile|devops|qa|tester|embedded|ai|data|sysadmin)/i.test(r))
const salesSig = (p) => roles(p).some((r) => /sales|business dev|bd/i.test(r)) || /(sales|kinh doanh|bán hàng|business development|account executive|account manager)/i.test(expTitles(p))
const design = (p) => roles(p).some((r) => /design/i.test(r)) || /(designer|thiết kế|graphic|đồ họa)/i.test(expTitles(p))
const bannerSig = (p) => /(banner|graphic|đồ họa|photoshop|illustrator|key visual|ads creative|ua\b|game art|motion)/i.test(p.__t)
const gameSig = (p) => /(game|gaming|mobile game|unity|ua marketing|user acquisition)/i.test(p.__t)

const GROUPS = [
  { gkey: 'sgs-sales', jobKey: 'V241', label: { vi: 'Sales Executive (TOPIK 4+)', ko: 'TOPIK 4+ × 영업 경력 × HCM권/미기재 × 비개발' },
    pick: (p) => (hcmOk(p) && koHi(p) && salesSig(p) && !dev(p) ? 10 + hcmA(p) + (y(p) >= 24 ? 2 : 0) : null) },
  { gkey: 'sgs-ko', jobKey: 'V241', label: { vi: 'Sales Executive (TOPIK 4+)', ko: 'TOPIK 4+ × 비개발 × 12m+ (영업 경력 없음, 자기선별)' },
    pick: (p) => (hcmOk(p) && koHi(p) && !dev(p) && y(p) >= 12 ? 5 + hcmA(p) + (y(p) >= 24 ? 1 : 0) : null) },
  { gkey: 'sgs-any', jobKey: 'V241', label: { vi: 'Sales Executive (TOPIK 4+)', ko: '한국어 any × 영업 경력 × 24m+ × 비개발 (TOPIK 등급 미확인, 자기선별)' },
    pick: (p) => (hcmOk(p) && koAny(p) && salesSig(p) && !dev(p) && y(p) >= 24 ? 1 + hcmA(p) : null) },
  { gkey: 'nx-core', jobKey: 'V242', label: { vi: 'UA Graphic Designer', ko: '디자인 직군/직함 × 배너·그래픽·포토샵·일러스트 시그널 × HCM권/미기재' },
    pick: (p) => (hcmOk(p) && design(p) && bannerSig(p) ? 5 + hcmA(p) + (gameSig(p) ? 3 : 0) + (/banner|ads creative|key visual/i.test(p.__t) ? 2 : 0) : null) },
  { gkey: 'nx-design', jobKey: 'V242', label: { vi: 'UA Graphic Designer', ko: '디자인 직군/직함 × HCM권/미기재 (시그널 없음)' },
    pick: (p) => (hcmOk(p) && design(p) ? 1 + hcmA(p) + (gameSig(p) ? 3 : 0) : null) },
]

const JOBS = {
  V241: {
    company: 'SGS Vietnam', initial: 'S', meta: 'Onsite · KCN Tân Bình, TP.HCM · TOPIK 4+ · 2 năm+ kinh nghiệm',
    intro: `<b>SGS Vietnam</b> — tập đoàn kiểm định, thử nghiệm và chứng nhận (TIC) hàng đầu thế giới — đang tuyển <b>Sales Executive (yêu cầu TOPIK 4 trở lên)</b> qua FYI, làm việc tại KCN Tân Bình, TP.HCM. Công việc: tìm kiếm và tiếp cận khách hàng tiềm năng để bán dịch vụ kiểm định, thử nghiệm và đánh giá của SGS; duy trì quan hệ với khách hàng hiện hữu; lập kế hoạch gặp/gọi khách hàng; chuẩn bị tài liệu bán hàng (brochure, sales kit, bảng giá); phối hợp với Customer Service về báo giá và chiết khấu; thu thập thông tin thị trường và đối thủ; cập nhật hồ sơ khách hàng và doanh thu hằng tháng; báo cáo kinh doanh tuần/tháng. Yêu cầu: <b>tiếng Hàn TOPIK 4 trở lên</b>, kinh nghiệm sales/B2B khoảng 2 năm là lợi thế, chủ động và định hướng kết quả.`,
  },
  V242: {
    company: 'NEXON DEV VINA', initial: 'N', meta: 'Onsite · TP.HCM · Photoshop/Illustrator · Kèm portfolio',
    intro: `<b>NEXON DEV VINA</b> — studio phát triển game thuộc tập đoàn NEXON (Hàn Quốc) — đang tuyển <b>UA Graphic Designer</b> qua FYI, làm việc tại TP.HCM. Công việc: thiết kế banner quảng cáo cho game mobile và PC, thực hiện biến thể kích thước (resize) banner theo từng nền tảng, tối ưu và tái sản xuất banner để nâng cao hiệu quả marketing UA. Yêu cầu: kinh nghiệm thực tế với <b>Photoshop, Illustrator</b> hoặc tương đương, hiểu biết về thiết kế quảng cáo số/banner, khả năng sáng tạo để truyền tải điểm hấp dẫn của game bằng hình ảnh, giao tiếp tốt. Ưu tiên: từng làm banner tại công ty quảng cáo/game, xử lý nhanh khối lượng lớn tác vụ resize lặp lại, kinh nghiệm marketing game hoặc quảng cáo UA. Lưu ý: <b>đính kèm portfolio trong CV</b>.`,
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
    fetchAll(() => sb.from('user_profiles').select('id,email,full_name,position,desired_roles,headline,major,yoe_months,location,english_cert,korean_cert,is_resume_public,skills,resume_summary,experiences,certs').not('email', 'is', null).not('resume_url', 'is', null).order('created_at', { ascending: false })),
    fetchAll(() => sb.from('events').select('user_id').eq('event', 'coldmail_unsub').not('user_id', 'is', null).order('id')),
    fetchAll(() => sb.from('job_recommendations').select('user_id,job_id').in('job_id', jobIds).order('id')),
    fetchAll(() => sb.from('job_applications').select('user_id,job_id').in('job_id', jobIds).order('id')),
    fetchBlacklist(),
  ])
  const unsubSet = new Set(unsubs.map((r) => r.user_id))
  const recSet = new Set(recs.map((r) => `${r.user_id}|${r.job_id}`)), appliedSet = new Set(apps.map((a) => `${a.user_id}|${a.job_id}`))
  const seen = new Set(); const assigned = []; let skipRec = 0
  for (const p of pool) {
    if (!p.email || /likelion/i.test(p.email)) continue
    const e = p.email.toLowerCase()
    if (seen.has(e) || unsubSet.has(p.id) || bl.has(p)) continue
    p.__t = txt(p)
    for (const g of GROUPS) {
      const s = g.pick(p); if (s == null) continue
      const jobId = JOBS[g.jobKey].id
      if (appliedSet.has(`${p.id}|${jobId}`) || recSet.has(`${p.id}|${jobId}`)) { skipRec++; continue }
      seen.add(e); assigned.push({ p, s, g, frame: p.is_resume_public ? 'public' : 'private' }); break
    }
  }
  console.log('발송 대상(1인 1통 배정 · 당일 타 공고 기수신 제외 안 함):')
  for (const g of GROUPS) { const rows = assigned.filter((r) => r.g.gkey === g.gkey); console.log(`  ${g.gkey} → ${g.jobKey}: ${rows.length}명 (공개 ${rows.filter((x) => x.frame === 'public').length}) — ${g.label.ko}`) }
  console.log(`  ── 합계: ${assigned.length}명 (제외: 해당 공고 기수신/기지원 ${skipRec})`)
  if (!doSend) {
    for (const g of GROUPS) {
      const rows = assigned.filter((r) => r.g.gkey === g.gkey).sort((a, b) => b.s - a.s)
      console.log(`\n── ${g.gkey} 상위 10 (총 ${rows.length}) ──`)
      for (const { p, s, frame } of rows.slice(0, 10)) console.log(`  [${s}·${frame}] ${p.full_name} · ${p.position || '?'} · ${Math.round(y(p) / 12 * 10) / 10}y · ${String(p.location || '위치?').slice(0, 16)} · KO:${koCert(p).slice(0, 10) || '-'} · ${expTitles(p).slice(0, 60)}`)
    }
    console.log('\n(dry-run — 실발송하려면 --send, 그룹 한정 --group <gkey>)'); return
  }
  let targets = [...assigned].sort((a, b) => b.s - a.s)
  if (onlyGroup) targets = targets.filter((r) => r.g.gkey === onlyGroup)
  if (maxN) targets = targets.slice(0, maxN)
  let ok = 0, fail = 0; const okBy = {}
  for (const { p, g, frame } of targets) {
    const jd = JOBS[g.jobKey], job = jobById[jd.id], camp = `sgsnexon1015-recommend-${g.gkey}-${frame}`
    const u = url(p.id, camp, jd.id), un = unsubFor(p.id, camp)
    const { error } = await resend.emails.send({ from: RESEND_FROM, to: p.email, subject: SUBJECT[frame](jd.company, g.label.vi), html: emailHtml(p.full_name, u, un, jd, job, frame), text: emailText(p.full_name, u, un, jd, job, frame), headers: { 'List-Unsubscribe': `<${un}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' } })
    if (error) { console.error(`실패 ${p.email}:`, error.message || error); fail++; continue }
    await sb.from('job_recommendations').upsert([{ user_id: p.id, to_email: p.email, job_id: jd.id, job_title: job.title, job_company: job.company, sent_by: 'coldmail', kind: 'recommend', status: 'sent' }], { onConflict: 'user_id,job_id', ignoreDuplicates: true })
    await sb.from('events').insert([{ event: 'recommend_sent', page: '/scripts/sgsnexon1015-recommend-coldmail', meta: { campaign: camp, job_ids: [jd.id], frame, group: g.gkey }, user_id: p.id }])
    ok++; okBy[g.jobKey] = (okBy[g.jobKey] || 0) + 1; if (ok % 50 === 0) console.log(`  …${ok}/${targets.length}`); await sleep(400)
  }
  console.log(`\n✅ 발송 완료: ${ok}/${targets.length} (실패 ${fail}) — ${Object.entries(okBy).map(([k, v]) => `${k} ${v}`).join(' · ')}`)
}
main().catch((e) => { console.error(e); process.exit(1) })
