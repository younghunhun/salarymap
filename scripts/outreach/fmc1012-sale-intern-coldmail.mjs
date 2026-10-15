// First Marketing Company 10/12 Thực tập sinh Sale(V222) recommend — Len 게재 당일 소싱. 공고 표기 그대로: HCMC 온사이트(19N Nguyễn Hữu Cảnh) · 인턴 3개월(풀/파트) · 3~4학년 or 신졸 · 경영/마케팅/관광/외국어 전공 · CS/세일즈 경험 우대 · 영어 기본 · 한국어 큰 우대(필수 아님, 기업 원문 10/12 확인) · 지원금+보너스 · 정규직 전환 검토.
// 10/12 실측(scripts/tmp/fmc1012-sale-intern-pool-measure.mjs): HCMC권/미기재 × 24m 미만 × 세일즈/CS 시그널 640 → 12m 미만 신입 코어 417(S1 직군/직함 157 + S2 인접직군×전공 260) · 12~24m 212 제외.
// 게이트(유저 지시 10/12 "417명"): 지역 = HCMC권 명시 or 미기재 · 경력 12m 미만 · (세일즈 직군 or CS/세일즈 경력 직함) or (인접 직군 × JD 전공). 한국어는 게이트 아님(가점 3). 빈도 게이트 없음.
// 표준: 1인1통 · unsub/블랙리스트 전역 제외 · 공개/비공개 프레임 · 발송 전 coldmailTemplates 등록.
//
//   node scripts/outreach/fmc1012-sale-intern-coldmail.mjs            # dry-run
//   node scripts/outreach/fmc1012-sale-intern-coldmail.mjs --send     # 417
// 10/15 추가(유저 지시 "남은 224명도 보내봐"): sale-mid(12~24m 동일 게이트)·major-norole(직군 미기재 × JD 전공 × 12m 미만) 그룹 추가, V222 Trevity / V223 Gayogayo 번갈아 배정. 캠페인 fmc1015-sale-intern-<gkey>-<V코드>-<frame>. Emma 10/15 "push more CV for sales intern".
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

// ── 대상 선정 헬퍼 (fmc1012-sale-intern-pool-measure 와 동일) ──
const expTitles = (p) => (Array.isArray(p.experiences) ? p.experiences.map((e) => `${e.title || e.position || ''}`).join(' | ') : '')
const exp = (p) => (Array.isArray(p.experiences) ? p.experiences.map((e) => `${e.title || e.position || ''} ${e.company || ''} ${e.description || ''}`).join(' ') : '')
const txt = (p) => (JSON.stringify(p.skills || '') + ' ' + String(p.position || '') + ' ' + String(p.headline || '') + ' ' + JSON.stringify(p.desired_roles || '') + ' ' + JSON.stringify(p.resume_summary || '') + ' ' + exp(p) + ' ' + String(p.major || '')).toLowerCase()
const roles = (p) => [p.position, ...(p.desired_roles || [])].filter(Boolean)
const y = (p) => p.yoe_months ?? 0
const hcmOk = (p) => { const l = String(p.location || ''); return !l.trim() || /(h[ồo]\s*ch[íi]\s*minh|hcm|sài gòn|sai gon|saigon|thủ đức|thu duc|bình thạnh|bình dương|binh duong|đồng nai|dong nai|biên hòa|long an|호치민|호찌민|hóc môn|gò vấp|tân bình|tân phú|bình tân|phú nhuận|củ chi|nhà bè|bình chánh|quận \d|district \d|tphcm|tp\.?\s*hcm)/i.test(l) }
const enOk = (p) => !!String(p.english_cert || '').trim() && !/^(none|no|없음|-|n\/a)$/i.test(String(p.english_cert).trim())
const koOk = (p) => (!!String(p.korean_cert || '').trim() && !/^(none|no|없음|-|n\/a)$/i.test(String(p.korean_cert).trim())) || /(korean|tiếng hàn|topik|한국어)/i.test(p.__t)
const salesRole = (p) => roles(p).some((r) => /(sales|business dev|sales admin|merchandiser|telesale)/i.test(String(r)))
const adjRole = (p) => roles(p).some((r) => /(marketing|non-it|interpreter|operations|hr|other|customer|content|pr\b)/i.test(String(r)))
const csSalesRe = /(sale\b|sales|bán hàng|ban hang|telesale|chăm sóc khách hàng|cham soc khach hang|cskh|customer service|customer care|customer support|tư vấn|tu van|consultant|account executive|business development|kinh doanh|cộng tác viên kinh doanh|receptionist|lễ tân|le tan)/i
const csSalesTitle = (p) => csSalesRe.test(expTitles(p))
const majorRe = /(kinh doanh|business|quản trị|quan tri|marketing|du lịch|du lich|tourism|hospitality|ngoại ngữ|ngoai ngu|ngôn ngữ|ngon ngu|language|english|tiếng anh|tiếng hàn|korean|hàn quốc|han quoc|commerce|thương mại|thuong mai|economics|kinh tế|kinh te)/i
const majorOk = (p) => majorRe.test(String(p.major || ''))
const student = (p) => (p.graduation_year && Number(p.graduation_year) >= 2026) || /(sinh viên|student|năm 3|năm 4|thực tập|intern)/i.test(String(p.headline || '') + ' ' + String(p.position || ''))
const office = (p) => /(excel|word|google sheets|crm|microsoft office|tin học văn phòng)/i.test(p.__t)

const GROUPS = [
  {
    gkey: 'sale', camp: 'fmc1012-sale-intern', jobKey: 'V222',
    label: { vi: 'Thực tập sinh Sale', ko: '(세일즈 직군 or CS/세일즈 경력 직함) or (인접 직군 × JD 전공) × 12m 미만 × HCMC권/미기재' },
    pick: (p) => (hcmOk(p) && y(p) < 12 && ((salesRole(p) || csSalesTitle(p)) || (adjRole(p) && majorOk(p))) ? 1 + (salesRole(p) ? 2 : 0) + (csSalesTitle(p) ? 3 : 0) + (majorOk(p) ? 1 : 0) + (koOk(p) ? 3 : 0) + (enOk(p) ? 1 : 0) + (office(p) ? 1 : 0) + (student(p) ? 1 : 0) : null),
  },
  // 10/15 추가 — jobKeys: V222/V223 번갈아 배정
  {
    gkey: 'sale-mid', camp: 'fmc1015-sale-intern-sale-mid', jobKeys: ['V222', 'V223'],
    label: { vi: 'Thực tập sinh Sale', ko: '동일 게이트 × 12~24m × HCMC권/미기재 (10/12 제외했던 그룹)' },
    pick: (p) => (hcmOk(p) && y(p) >= 12 && y(p) < 24 && ((salesRole(p) || csSalesTitle(p)) || (adjRole(p) && majorOk(p))) ? 1 + (salesRole(p) ? 2 : 0) + (csSalesTitle(p) ? 3 : 0) + (majorOk(p) ? 1 : 0) + (koOk(p) ? 3 : 0) + (enOk(p) ? 1 : 0) : null),
  },
  {
    gkey: 'major-norole', camp: 'fmc1015-sale-intern-major-norole', jobKeys: ['V222', 'V223'],
    label: { vi: 'Thực tập sinh Sale', ko: '직군 미기재 × JD 전공 × 12m 미만 × HCMC권/미기재' },
    pick: (p) => (hcmOk(p) && y(p) < 12 && roles(p).length === 0 && majorOk(p) ? 1 + (koOk(p) ? 3 : 0) + (enOk(p) ? 1 : 0) : null),
  },
]

// ── 공고·카피 (vi 실발송) — 공고 본문 그대로 요약 ──
const CO = 'First Marketing Company'
const JOBS = {
  V222: {
    id: '34e07af1-38c9-4621-9306-cc977135fbfc', company: CO, initial: 'F', meta: 'TP.HCM (19N Nguyễn Hữu Cảnh) · Thực tập 3 tháng · Full-time / Part-time · Phụ cấp + bonus',
    intro: `<b>First Marketing Company</b> (TP.HCM) đang tuyển <b>Thực tập sinh Sale</b> (Trevity Team) qua FYI — hỗ trợ team kinh doanh tiếp cận, tư vấn và chăm sóc khách hàng, đối tác trong môi trường du lịch – dịch vụ. Công việc: trực và trả lời tin nhắn Fanpage Messenger; tìm kiếm, liên hệ khách hàng và đối tác (cửa hàng, nhà hàng, spa, khách sạn…) qua điện thoại, email, mạng xã hội; giới thiệu dịch vụ và gói hợp tác; hỗ trợ soạn báo giá, hợp đồng và theo dõi cơ hội bán hàng; chăm sóc sau bán; cập nhật dữ liệu khách hàng trên CRM / Google Sheets. <b>Yêu cầu</b>: sinh viên năm 3–4 hoặc mới tốt nghiệp ngành Kinh doanh, Marketing, Du lịch, Ngoại ngữ hoặc liên quan; giao tiếp, thuyết phục tốt, phản hồi nhanh và lịch sự; tiếng Anh giao tiếp cơ bản; thành thạo Word, Excel/Google Sheets, email. <b>Ưu tiên</b>: kinh nghiệm chăm sóc khách hàng hoặc bán hàng (part-time, thực tập, CTV đều được); biết tiếng Hàn là lợi thế lớn. <b>Quyền lợi</b>: phụ cấp thực tập và bonus cuối kỳ, hoa hồng theo kết quả (nếu có), được cấp thiết bị làm việc, có người hướng dẫn trực tiếp, xem xét lên nhân viên chính thức, hỗ trợ xác nhận thực tập. Thực tập 3 tháng, toàn thời gian hoặc bán thời gian, tại 19N Nguyễn Hữu Cảnh, TP.HCM.`,
  },
  V223: {
    id: '943d3779-0e18-4139-8c3a-935428f0724f', company: CO, initial: 'F', meta: 'TP.HCM (19N Nguyễn Hữu Cảnh) · Thực tập 3 tháng · Full-time / Part-time · Phụ cấp + bonus',
    intro: `<b>First Marketing Company</b> (TP.HCM) đang tuyển <b>Thực tập sinh Sale</b> (Gayogayo Team) qua FYI — tìm kiếm và kết nối các cơ sở kinh doanh tham gia ứng dụng <b>Gayogayo</b> (chương trình ưu đãi dành cho du khách Hàn Quốc), đồng thời giới thiệu dịch vụ marketing của Trevity. Công việc: tìm kiếm, liên hệ khách hàng và đối tác (cửa hàng, nhà hàng, spa, khách sạn…) qua điện thoại, email, Zalo; giới thiệu app Gayogayo và mời cơ sở tham gia ưu đãi; gửi form đăng ký, hỗ trợ cơ sở hoàn tất nội dung ưu đãi để đưa lên app; phối hợp làm video ngắn giới thiệu cơ sở (YouTube, TikTok, Instagram); chăm sóc cơ sở sau khi tham gia; cập nhật dữ liệu trên Google Sheets; báo cáo ngày/tuần. <b>Yêu cầu</b>: sinh viên năm 3–4 hoặc mới tốt nghiệp ngành Kinh doanh, Marketing, Du lịch, Ngoại ngữ hoặc liên quan; chủ động, không ngại gọi điện và trò chuyện với chủ cơ sở; giao tiếp, thuyết phục tốt, nhắn tin tư vấn rõ ràng, lịch sự. <b>Ưu tiên</b>: kinh nghiệm bán hàng hoặc chăm sóc khách hàng; biết tiếng Hàn là lợi thế. <b>Quyền lợi</b>: phụ cấp thực tập và bonus, có người hướng dẫn trực tiếp, xem xét lên nhân viên chính thức, hỗ trợ xác nhận thực tập. Thực tập 3 tháng, toàn thời gian hoặc bán thời gian, tại 19N Nguyễn Hữu Cảnh, TP.HCM.`,
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
const ONETAP = 'Chỉ cần <b>1 chạm</b> — CV đã đăng ký của bạn sẽ được gửi tự động. Nhớ ghi rõ kinh nghiệm chăm sóc khách hàng / sale (nếu có) trong hồ sơ FYI của bạn.'

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
      .select('id,email,full_name,position,desired_roles,headline,major,graduation_year,yoe_months,location,english_cert,korean_cert,is_resume_public,skills,resume_summary,experiences')
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
  const rr = {}
  for (const p of pool) {
    if (!p.email || /likelion/i.test(p.email)) continue
    const e = p.email.toLowerCase()
    if (seen.has(e) || unsubSet.has(p.id) || bl.has(p)) continue
    p.__t = txt(p)
    for (const g of GROUPS) {
      const s = g.pick(p)
      if (s == null) continue
      const keys = g.jobKeys || [g.jobKey]
      // 두 공고 중 어느 하나라도 기수신/기지원이면 제외(같은 회사·같은 역할 중복 방지)
      if (keys.some((k) => appliedSet.has(`${p.id}|${JOBS[k].id}`) || recSet.has(`${p.id}|${JOBS[k].id}`))) { skipRec++; continue }
      const jobKey = keys[(rr[g.gkey] = (rr[g.gkey] || 0) + 1) % keys.length]
      seen.add(e)
      assigned.push({ p, s, g, jobKey, frame: p.is_resume_public ? 'public' : 'private' })
      break
    }
  }

  console.log('발송 대상(1인 1통 배정):')
  for (const g of GROUPS) {
    const rows = assigned.filter((r) => r.g.gkey === g.gkey)
    const pub = rows.filter((x) => x.frame === 'public').length
    const byJob = rows.reduce((m, r) => ((m[r.jobKey] = (m[r.jobKey] || 0) + 1), m), {})
    console.log(`  ${g.gkey} → ${Object.entries(byJob).map(([k, v]) => `${k} ${v}`).join(' / ') || (g.jobKeys || [g.jobKey]).join('/')} (${g.label.ko}): ${rows.length}명 (공개 ${pub} / 비공개 ${rows.length - pub})`)
  }
  console.log(`  ── 합계: ${assigned.length}명 (제외: 해당 공고 기수신/기지원 ${skipRec})`)
  if (!doSend) {
    const rows = [...assigned].sort((a, b) => b.s - a.s)
    console.log(`\n── 상위 15 표본 (총 ${rows.length}) ── 세일즈직군 ${rows.filter((r) => salesRole(r.p)).length} · CS/세일즈 직함 ${rows.filter((r) => csSalesTitle(r.p)).length} · 전공 ${rows.filter((r) => majorOk(r.p)).length} · KO ${rows.filter((r) => koOk(r.p)).length} · EN ${rows.filter((r) => enOk(r.p)).length}`)
    for (const { p, s, frame } of rows.slice(0, 15))
      console.log(`  [${s}·${frame}] ${p.full_name} <${p.email}> · ${p.position || '?'} · ${Math.round((p.yoe_months || 0) / 12 * 10) / 10}y · ${String(p.location || '위치?').slice(0, 22)} · ${String(p.major || '').slice(0, 22)} · ${expTitles(p).slice(0, 45)}`)
    console.log('\n(dry-run — 실발송하려면 --send)')
    return
  }

  let targets = [...assigned].sort((a, b) => b.s - a.s)
  if (maxN) targets = targets.slice(0, maxN)
  let ok = 0, fail = 0
  const okBy = {}
  for (const { p, g, jobKey, frame } of targets) {
    const jd = JOBS[jobKey]
    const job = jobById[jd.id]
    const camp = g.jobKeys ? `${g.camp}-${jobKey}-${frame}` : `${g.camp}-${frame}`
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
      event: 'recommend_sent', page: '/scripts/fmc1012-sale-intern-coldmail',
      meta: { campaign: camp, job_ids: [jd.id], frame, group: g.gkey }, user_id: p.id,
    }])
    ok++; okBy[jobKey] = (okBy[jobKey] || 0) + 1
    if (ok % 50 === 0) console.log(`  …${ok}/${targets.length}`)
    await sleep(400)
  }
  console.log(`\n✅ 발송 완료: ${ok}/${targets.length} (실패 ${fail}) — ${Object.entries(okBy).map(([k, v]) => `${k} ${v}`).join(' · ')}`)
}

main().catch((e) => { console.error(e); process.exit(1) })
