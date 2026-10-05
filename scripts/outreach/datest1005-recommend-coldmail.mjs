// DAT EST Electrical Technician(V216) 10/5 recommend — Len 게재 당일 소싱. HCMC 온사이트, 공단 공장 전기안전관리.
// JD(영문): 베트남 남성 · 전기 실무 2y+ · 운전 가능 · 기초 영어. 급여 미기재.
// 10/5 실측(scripts/tmp/datest-electrical-pool-measure.mjs · -wide-measure.mjs): 전기 직접 시그널 전국 99 → 2y+ 40 → 남부권/미기재 19(코어).
//   확장: 타지역 2y+ 21 · 공장 생산/설비 직군 남부권 2y+ 8 → 합 48 = 풀 상한(유저 10/5 결정). 2y 미만 35·인접기술/공학전공 비개발 194는 오탐·무관 다수라 미발송.
// 검증 불가 요건 4개(남성·전기 경력 2y·운전면허·기초 영어)는 성별 컬럼 없음·면허 텍스트 0 → 메일 상단 체크리스트로 자기선별(유저 10/5 지시).
// 캐스케이드(1인1통) = core → factory → region. 표준: unsub 전역 제외 · 공개/비공개 프레임 · 발송 전 coldmailTemplates 등록.
//
//   node scripts/outreach/datest1005-recommend-coldmail.mjs                       # dry-run
//   node scripts/outreach/datest1005-recommend-coldmail.mjs --send [--group <gkey>] [--max N]
import { Resend } from 'resend'
import { sb, env, fetchAll } from './lib.mjs'
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

// ── 대상 선정 헬퍼 (실측 스크립트와 동일) ──
const norm = (v) => (Array.isArray(v) ? v.join(' ') : String(v || ''))
const txt = (p) => {
  const exp = Array.isArray(p.experiences) ? p.experiences.map((e) => `${e.title || e.position || ''} ${e.company || ''} ${e.description || ''}`).join(' ') : ''
  return [p.position, p.headline, norm(p.desired_roles), JSON.stringify(p.skills || ''), exp, JSON.stringify(p.resume_summary || ''), p.major].join(' ').toLowerCase()
}
const roles = (p) => [p.position, ...(p.desired_roles || [])].filter(Boolean)
const y = (p) => p.yoe_months ?? 0
const elecRe = /(electrical|electrician|electric power|power system|kỹ sư điện|kĩ sư điện|điện công nghiệp|hệ thống điện|an toàn điện|thiết bị điện|điện – ?điện tử|điện-điện tử|điện tử công nghiệp|kỹ thuật điện|bảo trì điện|công nhân điện|thợ điện|low voltage|medium voltage|high voltage|switchgear|transformer|máy biến áp|tủ điện|plc\b|scada|m&e\b|mep\b|electrical engineer)/i
const maintRe = /(maintenance|bảo trì|bảo dưỡng|technician|kỹ thuật viên|facility|utility|nhà máy|factory|plant|industrial park|khu công nghiệp|kcn\b)/i
const safetyRe = /(electrical safety|an toàn điện|safety|an toàn lao động|hse\b|ehs\b)/i
const enSig = (p) => !!p.english_cert || /(english|tiếng anh|ielts|toefl|toeic)/i.test(p.__t)
const blueRole = (p) => roles(p).some((r) => /(maintenance|production|qc|technician|mechanical|electrical|energy|facility|operator|worker|manufactur)/i.test(String(r)))
const inHcmc = (p) => /(h[ồo]\s*ch[íi]\s*minh|hcm|sài gòn|sai gon|saigon|thủ đức|thu duc|bình thạnh|bình dương|binh duong|đồng nai|dong nai|biên hòa|bien hoa|long an|bà rịa|vũng tàu|tây ninh)/i.test(String(p.location || ''))
const south = (p) => inHcmc(p) || !String(p.location || '').trim()
const abroad = (p) => /(india|australia|karnataka|usa|united states|korea|japan|singapore|malaysia|thailand|germany|france|canada|\buk\b)/i.test(String(p.location || ''))
const devPos = (p) => /(frontend|backend|fullstack|full-stack|mobile|developer|devops|\bqa\b|software|web|data|ai engineer|ml engineer)/i.test(String(p.position || ''))
const bonus = (p) => (maintRe.test(p.__t) ? 1 : 0) + (safetyRe.test(p.__t) ? 2 : 0) + (enSig(p) ? 1 : 0) + (inHcmc(p) ? 1 : 0) + (blueRole(p) ? 1 : 0)

const JOB = { id: 'd631f9b9-4b40-4744-a434-0690e0cefba7', code: 'V216', company: 'DAT EST', initial: 'D', meta: 'Onsite · TP.HCM &amp; các KCN lân cận · 2 năm+ kinh nghiệm điện · Nam · Có bằng lái xe' }
const GROUPS = [
  { gkey: 'core', camp: 'datest1005-recommend-core', label: { vi: 'Electrical Technician', ko: '전기 직접 시그널 × 2y+ × 남부권/미기재(실측 19)' },
    pick: (p) => (elecRe.test(p.__t) && y(p) >= 24 && south(p) ? 10 + bonus(p) : null) },
  { gkey: 'factory', camp: 'datest1005-recommend-factory', label: { vi: 'Electrical Technician', ko: '공장 생산/설비 직군(Maintenance·Production·QC·Technician) × 2y+ × 남부권/미기재, 전기 무언급(실측 8)' },
    pick: (p) => (blueRole(p) && !devPos(p) && y(p) >= 24 && south(p) ? 5 + bonus(p) : null) },
  { gkey: 'region', camp: 'datest1005-recommend-region', label: { vi: 'Electrical Technician', ko: '전기 직접 시그널 × 2y+ × 타지역(하노이·다낭 등, HCMC 근무 명시로 자기선별, 실측 21)' },
    pick: (p) => (elecRe.test(p.__t) && y(p) >= 24 && !south(p) && !abroad(p) ? 1 + bonus(p) : null) },
]

// ── 카피 (vi 실발송) — 검증 불가 요건 4개를 상단 체크리스트로 명시 ──
const INTRO = '<b>DAT EST</b> (Electrical Safety Engineering) — công ty Hàn Quốc cung cấp dịch vụ quản lý an toàn điện, kiểm định hệ thống điện và kỹ thuật điện cho các nhà máy tại Việt Nam — đang tuyển <b>Electrical Technician</b> qua FYI. Công việc: quản lý an toàn điện cho các nhà máy trong khu công nghiệp (khu vực TP.HCM và lân cận). Công ty tìm người chăm chỉ, trung thực, có trách nhiệm và muốn gắn bó lâu dài.'
const CHECKLIST = `<div style="background:#fff7f0;border:1px solid #ffd9bf;border-radius:12px;padding:14px 16px;margin:4px 0 14px">
  <div style="font-size:13.5px;font-weight:700;color:#b0691a;margin-bottom:8px">Vị trí này có các điều kiện bắt buộc mà FYI không thể kiểm tra qua hồ sơ. Vui lòng chỉ ứng tuyển khi bạn đáp ứng đủ cả 4 điều kiện sau:</div>
  <ul style="margin:0;padding-left:20px;font-size:14px;line-height:1.7;color:#4a443c">
    <li>Nam, quốc tịch Việt Nam</li>
    <li>Ít nhất <b>2 năm kinh nghiệm làm việc thực tế về điện</b> (bảo trì, lắp đặt, hệ thống điện nhà máy)</li>
    <li>Có <b>bằng lái xe ô tô</b> và có thể lái xe đi làm tại các khu công nghiệp</li>
    <li>Giao tiếp tiếng Anh cơ bản</li>
  </ul>
  <div style="font-size:13px;color:#8a8073;margin-top:8px">Nếu thiếu một trong các điều kiện trên, hồ sơ sẽ không được xét.</div>
</div>`
const CHECKLIST_TXT = `Vị trí này có các điều kiện bắt buộc mà FYI không thể kiểm tra qua hồ sơ. Vui lòng chỉ ứng tuyển khi bạn đáp ứng đủ cả 4 điều kiện sau:
- Nam, quốc tịch Việt Nam
- Ít nhất 2 năm kinh nghiệm làm việc thực tế về điện (bảo trì, lắp đặt, hệ thống điện nhà máy)
- Có bằng lái xe ô tô và có thể lái xe đi làm tại các khu công nghiệp
- Giao tiếp tiếng Anh cơ bản
Nếu thiếu một trong các điều kiện trên, hồ sơ sẽ không được xét.`
const REGION_NOTE = '<b>Lưu ý</b>: vị trí làm việc tại <b>TP.HCM và các khu công nghiệp lân cận</b> — nếu bạn đang ở tỉnh khác, chỉ ứng tuyển khi sẵn sàng chuyển đến TP.HCM.'
const SUBJECT = {
  public: `[FYI] Bạn được chọn vào danh sách đề cử gửi DAT EST — Electrical Technician (TP.HCM)`,
  private: `[FYI] Bạn được chọn vào danh sách đề cử — Electrical Technician tại DAT EST (TP.HCM)`,
}
const HOOK = 'Đội ngũ FYI đã xem xét toàn bộ hồ sơ đã đăng ký và <b>chọn bạn vào danh sách đề cử</b> cho vị trí dưới đây — hồ sơ của bạn có nền tảng về điện / kỹ thuật nhà máy phù hợp với vị trí này.'
const BENEFIT = {
  public: `<b>Trong tuần này</b>, FYI sẽ gửi danh sách đề cử trực tiếp cho người phụ trách tuyển dụng của DAT EST. Hồ sơ của bạn đang ở chế độ công khai nên sẽ được gửi kèm danh sách. Nếu bạn ứng tuyển ngay, CV của bạn sẽ được <b>ưu tiên xem xét</b> cùng lời giới thiệu từ FYI.`,
  private: `<b>Trong tuần này</b>, FYI sẽ gửi danh sách đề cử trực tiếp cho người phụ trách tuyển dụng của DAT EST. Hồ sơ của bạn đang ở chế độ riêng tư — nếu bạn ứng tuyển ngay, CV của bạn sẽ được gửi kèm lời giới thiệu từ FYI và được <b>ưu tiên xem xét</b>.`,
}
const ONETAP = 'Chỉ cần <b>1 chạm</b> — CV đã đăng ký của bạn sẽ được gửi tự động.'

function jobCard(job) {
  const logo = job.logo_url
    ? `<img src="${esc(job.logo_url)}" width="44" height="44" alt="" style="width:44px;height:44px;border-radius:10px;object-fit:cover;background:#f0ebe3;display:block">`
    : `<div style="width:44px;height:44px;border-radius:10px;background:#fff0e6;color:#ff6000;font-weight:800;font-size:16px;text-align:center;line-height:44px">${JOB.initial}</div>`
  return `<table width="100%" cellpadding="0" cellspacing="0" style="background:#fff;border:1px solid #eee5da;border-radius:14px;margin-bottom:8px"><tr>
    <td width="44" style="padding:14px 0 14px 14px;vertical-align:middle">${logo}</td>
    <td style="padding:14px 14px 14px 12px;vertical-align:middle">
      <div style="font-size:12px;color:#8a8073;margin-bottom:3px">${esc(JOB.company)}</div>
      <div style="font-size:14.5px;font-weight:700;color:#1a1612;line-height:1.35">${esc(job.title.trim())}</div>
      <div style="font-size:12px;color:#b0691a;margin-top:3px">${JOB.meta}</div>
    </td>
  </tr></table>`
}

function emailHtml(name, url, unsubUrl, job, frame, g) {
  return `<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;background:#faf9f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1a1612">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#faf9f7"><tr><td align="center" style="padding:28px 16px">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px">
  <tr><td style="padding-bottom:18px"><img src="https://salary-fyi.com/fyi-logo.png" height="24" alt="FYI" style="height:24px;width:auto;display:block"></td></tr>
  <tr><td style="font-size:15px;line-height:1.6;color:#1a1612;padding-bottom:6px">Chào ${esc(firstName(name))},</td></tr>
  <tr><td style="font-size:14px;line-height:1.65;color:#4a443c;padding-bottom:14px">${INTRO}</td></tr>
  <tr><td>${CHECKLIST}</td></tr>
  ${g.gkey === 'region' ? `<tr><td style="font-size:14px;line-height:1.65;color:#4a443c;padding-bottom:14px">${REGION_NOTE}</td></tr>` : ''}
  <tr><td style="font-size:14px;line-height:1.65;color:#4a443c;padding-bottom:14px">${HOOK}</td></tr>
  <tr><td style="padding-bottom:10px">${jobCard(job)}</td></tr>
  <tr><td style="font-size:14px;line-height:1.65;color:#4a443c;padding-top:4px">${BENEFIT[frame]} ${ONETAP}</td></tr>
  <tr><td align="center" style="padding:16px 0 6px">
    <a href="${url}" style="display:inline-block;background:#ff6000;color:#fff;font-weight:700;font-size:15px;text-decoration:none;padding:14px 30px;border-radius:12px">Ứng tuyển 1 chạm →</a>
  </td></tr>
  <tr><td align="center" style="font-size:12.5px;padding-bottom:4px"><a href="${SITE}/ktc/jobs/${JOB.id}" style="color:#8a8073">Xem mô tả công việc đầy đủ →</a></td></tr>
  <tr><td style="font-size:11.5px;color:#a89f92;text-align:center;line-height:1.5;padding-top:20px">
    Bạn nhận được email này vì đã đăng ký hồ sơ trên FYI.<br>— Đội ngũ FYI · <a href="https://salary-fyi.com/jobs" style="color:#a89f92">salary-fyi.com/jobs</a>
    &nbsp;·&nbsp;<a href="${unsubUrl}" style="color:#a89f92;text-decoration:underline">Hủy đăng ký</a>
  </td></tr>
</table></td></tr></table></body></html>`
}

function emailText(name, url, unsubUrl, job, frame, g) {
  return `Chào ${firstName(name)},

${strip(INTRO)}

${CHECKLIST_TXT}
${g.gkey === 'region' ? `\n${strip(REGION_NOTE)}\n` : ''}
${strip(HOOK)}

- ${job.title.trim()} (${JOB.company}) — ${strip(JOB.meta).replace(/&amp;/g, '&')} — ${SITE}/ktc/jobs/${JOB.id}

${strip(BENEFIT[frame])} ${strip(ONETAP)}

${url}

Bạn nhận được email này vì đã đăng ký hồ sơ trên FYI.
— Đội ngũ FYI · salary-fyi.com/jobs
Hủy đăng ký: ${unsubUrl}`
}

async function main() {
  const { data: job, error: jobErr } = await sb.from('jobs').select('id,title,company,location,logo_url,is_active,source_id').eq('id', JOB.id).single()
  if (jobErr || !job || !job.is_active) { console.error('공고 없음/비활성:', jobErr?.message || JOB.id); process.exit(1) }
  if (job.source_id !== JOB.code) { console.error(`source_id 불일치: ${JOB.code} vs DB ${job.source_id}`); process.exit(1) }

  const resend = new Resend(env.RESEND_API_KEY)
  const url = (userId, camp) => `${SITE}/api/resume/recommend?t=${makeToken(userId, camp)}&j=${JOB.id}`
  const unsubFor = (userId, camp) => `${SITE}/api/coldmail/unsub?t=${makeToken(userId, camp)}`

  const [pool, unsubs, recs, apps] = await Promise.all([
    fetchAll(() => sb.from('user_profiles')
      .select('id,email,full_name,position,desired_roles,headline,major,yoe_months,location,english_cert,is_resume_public,skills,resume_summary,experiences')
      .not('email', 'is', null).not('resume_url', 'is', null).order('created_at', { ascending: false })),
    fetchAll(() => sb.from('events').select('user_id').eq('event', 'coldmail_unsub').not('user_id', 'is', null).order('id')),
    fetchAll(() => sb.from('job_recommendations').select('user_id').eq('job_id', JOB.id).order('id')),
    fetchAll(() => sb.from('job_applications').select('user_id').eq('job_id', JOB.id).order('id')),
  ])
  const unsubSet = new Set(unsubs.map((r) => r.user_id))
  const sentSet = new Set([...recs, ...apps].map((r) => r.user_id))

  const seen = new Set(); const assigned = []; let skipRec = 0
  for (const p of pool) {
    if (!p.email || /likelion/i.test(p.email)) continue
    const e = p.email.toLowerCase()
    if (seen.has(e) || unsubSet.has(p.id)) continue
    p.__t = txt(p)
    for (const g of GROUPS) {
      const s = g.pick(p)
      if (s == null) continue
      if (sentSet.has(p.id)) { skipRec++; break }
      seen.add(e)
      assigned.push({ p, s, g, frame: p.is_resume_public ? 'public' : 'private' })
      break
    }
  }

  console.log('발송 대상(1인 1통 배정):')
  for (const g of GROUPS) {
    const rows = assigned.filter((r) => r.g.gkey === g.gkey)
    const pub = rows.filter((x) => x.frame === 'public').length
    console.log(`  ${g.gkey} (${g.label.ko}): ${rows.length}명 (공개 ${pub} / 비공개 ${rows.length - pub})`)
  }
  console.log(`  ── 합계: ${assigned.length}명 (제외: 기수신/기지원 ${skipRec})`)
  if (!doSend) {
    for (const g of GROUPS) {
      const rows = assigned.filter((r) => r.g.gkey === g.gkey).sort((a, b) => b.s - a.s)
      if (!rows.length) continue
      console.log(`\n── ${g.gkey} 전원 (${rows.length}) ──`)
      for (const { p, s, frame } of rows)
        console.log(`  [${s}·${frame}] ${p.full_name} <${p.email}> · ${p.position || '?'} · ${Math.round((p.yoe_months || 0) / 12 * 10) / 10}y · ${String(p.location || '위치?').slice(0, 24)} · 전공=${String(p.major || '-').slice(0, 24)}`)
    }
    console.log('\n(dry-run — 실발송하려면 --send, 그룹 한정 --group <gkey>)')
    return
  }

  let targets = assigned
  if (onlyGroup) targets = targets.filter((r) => r.g.gkey === onlyGroup)
  if (maxN) targets = targets.slice(0, maxN)
  let ok = 0, fail = 0; const okBy = {}
  for (const { p, g, frame } of targets) {
    const camp = `${g.camp}-${frame}`
    const u = url(p.id, camp), un = unsubFor(p.id, camp)
    const { error } = await resend.emails.send({
      from: RESEND_FROM, to: p.email, subject: SUBJECT[frame],
      html: emailHtml(p.full_name, u, un, job, frame, g), text: emailText(p.full_name, u, un, job, frame, g),
      headers: { 'List-Unsubscribe': `<${un}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
    })
    if (error) { console.error(`실패 ${p.email}:`, error.message || error); fail++; continue }
    await sb.from('job_recommendations').upsert([{
      user_id: p.id, to_email: p.email, job_id: JOB.id,
      job_title: job.title, job_company: job.company, sent_by: 'coldmail', kind: 'recommend', status: 'sent',
    }], { onConflict: 'user_id,job_id', ignoreDuplicates: true })
    await sb.from('events').insert([{
      event: 'recommend_sent', page: '/scripts/datest1005-recommend-coldmail',
      meta: { campaign: camp, job_ids: [JOB.id], frame, group: g.gkey }, user_id: p.id,
    }])
    ok++; okBy[g.gkey] = (okBy[g.gkey] || 0) + 1
    await sleep(400)
  }
  console.log(`\n✅ 발송 완료: ${ok}/${targets.length} (실패 ${fail}) — ${Object.entries(okBy).map(([k, v]) => `${k} ${v}`).join(' · ')}`)
}

main().catch((e) => { console.error(e); process.exit(1) })
