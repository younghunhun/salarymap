// 드론 조립 경험 원탭 스크리닝 콜드메일 — 아르고스다인(K23) 생산팀 소싱 전 단계.
// K23 필수요건 "드론 조립 경력 2년+"를 이력서에 적은 사람은 풀 4,358명 중 0명(9/23 실측). 드론 조립은 이력서에
// 잘 안 쓰는 경험이라(취미·자작·군복무·전 직장 부업무), 인접 풀에 "해봤나"만 한 번 묻고 yes 에게 recommend 를 보낸다.
// 대상: 메카트로닉스·로봇·임베디드·전자·조립/납땜 텍스트 시그널 (174 + 조립 13 + 드론 인접 7, 중복 제거) − likelion − unsub − 기발송.
// 메일 버튼 3개(yes2/yes/no) → /screen?q=drone 랜딩에서 확인 1탭 → events(coldmail_screen_answer). 프로필 컬럼 없음.
// 퍼널: coldmail_screen_sent → coldmail_screen_click → coldmail_screen_answer. 집계는 scripts/outreach/screen-results.mjs.
// 카피는 포지션(한국 근무·한국 기준 급여 ≈ 36M ₫/월)을 앞세운다 — 답할 이유가 있어야 누른다.
//
//   node scripts/outreach/screen-drone0923-coldmail.mjs --test wsj@likelion.net  # 검수용 한국어 1통, 이벤트 기록 없음
//   node scripts/outreach/screen-drone0923-coldmail.mjs                          # dry-run
//   node scripts/outreach/screen-drone0923-coldmail.mjs --send [--max N]
import { Resend } from 'resend'
import { sb, env, fetchAll } from './lib.mjs'
import { makeToken } from '../../lib/campaignToken.js'
import { SCREEN_QUESTIONS } from '../../lib/screenQuestions.js'

const args = process.argv.slice(2)
const flag = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? (args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true) : d }
const testTo = flag('test', null)
const doSend = args.includes('--send')
const maxN = flag('max', null) ? parseInt(flag('max'), 10) : null
const Q = 'drone'
const CAMPAIGN = String(flag('campaign', 'screen-drone0923'))
const SITE = String(flag('site', env.NEXT_PUBLIC_SITE_URL || 'https://salary-fyi.com')).replace(/\/$/, '')
const FROM = env.RESEND_FROM || 'FYI <hello@salary-fyi.com>'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const esc = (s) => String(s || '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
const firstName = (n) => String(n || '').trim().split(/\s+/).slice(-1)[0] || 'bạn'
const BUTTONS = SCREEN_QUESTIONS[Q].answers

// ── 대상 선정 — 드론 인접 풀 (직군 무관, 지역 무관: 한국 근무) ──
const norm = (v) => (Array.isArray(v) ? v.join(' ') : String(v || ''))
const txt = (p) => [p.position, p.headline, norm(p.desired_roles), norm(p.skills), Array.isArray(p.experiences) ? p.experiences.map((e) => `${e.title || e.position || ''} ${e.company || ''} ${e.description || ''}`).join(' ') : '', JSON.stringify(p.resume_summary || ''), p.major || ''].join(' ').toLowerCase()
const droneRe = /(drone|uav|máy bay không người lái|flycam|quadcopter|multicopter|\bfpv\b|px4|ardupilot|betaflight|pixhawk|dji|\bmavlink\b|flight controller|brushless motor)/i
const asmRe = /(lắp ráp|soldering|hàn mạch|hàn linh kiện|\bsmt\b|electronics? (assembly|technician)|kỹ thuật viên điện tử|electrical assembly|mechanical design & assembly)/i
const mechRe = /(cơ điện tử|mechatronic|robot|embedded|điện tử|electronic)/i
const pick = (p) => droneRe.test(p.__t) || asmRe.test(p.__t) || mechRe.test(p.__t)

const COPY = {
  subject: {
    vi: 'Bạn đã từng lắp ráp drone chưa? — một vị trí tại Hàn Quốc đang chờ câu trả lời',
    ko: '드론 조립해 보신 적 있나요? — 한국 근무 포지션 하나가 답을 기다립니다',
  },
  hi: { vi: (n) => `Chào ${n},`, ko: (n) => `안녕하세요 ${n}님,` },
  p1: {
    vi: 'FYI đang cân nhắc <b>đề cử bạn</b> cho vị trí <b>Nhân viên dây chuyền sản xuất drone</b> tại <b>Argosdyne</b> — công ty Hàn Quốc phát triển nền tảng drone vận hành tự động bằng Edge AI (drone · trạm · GCS), đối tác Qualcomm duy nhất tại Hàn Quốc, khách hàng là quốc phòng · cảnh sát · cứu hỏa. Công việc: lắp ráp drone, nạp firmware, bay thử, kiểm tra; quản lý chất lượng vật tư và đồ gá trên dây chuyền. <b>Làm việc tại Hàn Quốc, nhân viên chính thức, lương theo mặt bằng Hàn Quốc</b> (khoảng <b>1.990.000 KRW ≈ 36 triệu ₫/tháng</b>). Yêu cầu: tốt nghiệp THPT trở lên, <b>kinh nghiệm lắp ráp drone từ 2 năm</b>. Ưu tiên: biết hàn linh kiện, có chứng chỉ bay drone, dùng được ERP.',
    ko: 'FYI가 회원님을 <b>Argosdyne</b>의 <b>드론 생산라인 팀원</b> 포지션에 <b>추천하려고 검토 중</b>입니다. Argosdyne은 Edge AI 기반 드론 무인 운영 플랫폼(드론·스테이션·GCS)을 개발하는 한국 기업으로 국내 유일 Qualcomm 파트너이며, 국방·경찰·소방이 고객입니다. 업무는 드론 조립·펌웨어·비행·검사와 라인 자재·치공구 품질관리. <b>한국 근무, 정규직, 한국 기준 급여</b>(약 <b>199만원 ≈ 36M ₫/월</b>). 요건은 고졸 이상, <b>드론 조립 경력 2년 이상</b>. 우대는 납땜, 드론 비행자격증, ERP.',
  },
  p2: {
    vi: 'CV của bạn có nền tảng kỹ thuật phù hợp, nhưng <b>chưa nói rõ bạn đã từng lắp ráp drone hay chưa</b> — và đây là điều kiện bắt buộc của công ty. Chỉ cần bấm <b>một nút bên dưới</b> — không cần đăng nhập, 10 giây. Nếu phù hợp, FYI sẽ gửi link ứng tuyển 1 chạm ngay.',
    ko: '회원님 이력서는 기술 배경은 맞는데 <b>드론을 조립해 보셨는지가 없어서요</b> — 회사의 필수 조건입니다. <b>아래 버튼 하나만</b> 눌러주세요 — 로그인 없이 10초. 맞으면 원탭 지원 링크를 바로 보내드립니다.',
  },
  thanks: { vi: 'Cảm ơn bạn!<br>— Đội ngũ FYI', ko: '감사합니다!<br>— FYI 팀 드림' },
  footer: { vi: 'Bạn nhận được email này vì đã đăng ký hồ sơ trên FYI.', ko: 'FYI에 이력서를 등록하셔서 이 메일을 받으셨습니다.' },
  unsub: { vi: 'Hủy nhận email', ko: '수신 거부' },
}

function emailHtml(name, urlFor, unsubUrl, lang) {
  const L = (o) => o[lang] || o.vi
  const btns = BUTTONS.map((b) => `
    <tr><td align="center" style="padding:5px 0">
      <a href="${urlFor(b.value)}" style="display:block;background:#fff;border:1.5px solid #ff6000;color:#ff6000;font-weight:700;font-size:15px;text-decoration:none;padding:13px 20px;border-radius:12px">${b[lang] || b.vi}</a>
    </td></tr>`).join('')
  return `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;background:#faf9f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1a1612">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#faf9f7"><tr><td align="center" style="padding:28px 16px">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px">
  <tr><td style="padding-bottom:18px"><img src="https://salary-fyi.com/fyi-logo.png" height="24" alt="FYI" style="height:24px;width:auto;display:block"></td></tr>
  <tr><td style="font-size:15px;line-height:1.6;color:#1a1612;padding-bottom:6px">${L(COPY.hi)(esc(firstName(name)))}</td></tr>
  <tr><td style="font-size:14px;line-height:1.65;color:#4a443c;padding-bottom:14px">${L(COPY.p1)}</td></tr>
  <tr><td style="font-size:14px;line-height:1.65;color:#4a443c;padding-bottom:6px">${L(COPY.p2)}</td></tr>
  <tr><td style="font-size:13px;font-weight:700;color:#4a443c;padding:10px 0 2px">${SCREEN_QUESTIONS[Q].title[lang] || SCREEN_QUESTIONS[Q].title.vi}</td></tr>
  <tr><td style="padding:6px 0 6px"><table width="100%" cellpadding="0" cellspacing="0">${btns}</table></td></tr>
  <tr><td style="font-size:14px;line-height:1.65;color:#4a443c;padding-top:14px">${L(COPY.thanks)}</td></tr>
  <tr><td style="font-size:11.5px;color:#a89f92;text-align:center;line-height:1.5;padding-top:20px">
    ${L(COPY.footer)}<br>— FYI · <a href="https://salary-fyi.com" style="color:#a89f92">salary-fyi.com</a>
    &nbsp;·&nbsp;<a href="${unsubUrl}" style="color:#a89f92;text-decoration:underline">${L(COPY.unsub)}</a>
  </td></tr>
</table></td></tr></table></body></html>`
}

const strip = (s) => String(s).replace(/<br>/g, '\n').replace(/<[^>]+>/g, '')
function emailText(name, urlFor, unsubUrl, lang) {
  const L = (o) => o[lang] || o.vi
  const btns = BUTTONS.map((b) => `${b[lang] || b.vi}: ${urlFor(b.value)}`).join('\n')
  return `${L(COPY.hi)(firstName(name))}

${strip(L(COPY.p1))}

${strip(L(COPY.p2))}

${SCREEN_QUESTIONS[Q].title[lang] || SCREEN_QUESTIONS[Q].title.vi}
${btns}

${strip(L(COPY.thanks))}

${strip(L(COPY.footer))}
${strip(L(COPY.unsub))}: ${unsubUrl}`
}

async function main() {
  const resend = new Resend(env.RESEND_API_KEY)
  const landingUrl = (userId, cta) => `${SITE}/screen?t=${makeToken(userId, CAMPAIGN)}&q=${Q}&cta=${cta}`
  const unsubFor = (userId) => `${SITE}/api/coldmail/unsub?t=${makeToken(userId, CAMPAIGN)}`

  if (testTo) {
    const uid = '00000000-0000-0000-0000-000000000000'
    await resend.emails.send({ from: FROM, to: testTo, subject: `[TEST] ${COPY.subject.ko}`,
      html: emailHtml('테스트', (c) => landingUrl(uid, c), '#', 'ko'), text: emailText('테스트', (c) => landingUrl(uid, c), '#', 'ko') })
    console.log(`[TEST] 발송 → ${testTo} (이벤트 기록 없음)`)
    return
  }

  const [pool, unsubs, sentEvts] = await Promise.all([
    fetchAll(() => sb.from('user_profiles').select('id,email,full_name,position,desired_roles,yoe_months,location,skills,resume_summary,headline,experiences,major')
      .not('email', 'is', null).not('resume_url', 'is', null).order('created_at', { ascending: false })),
    fetchAll(() => sb.from('events').select('user_id').eq('event', 'coldmail_unsub').not('user_id', 'is', null).order('id')),
    fetchAll(() => sb.from('events').select('user_id,meta').eq('event', 'coldmail_screen_sent').order('id')),
  ])
  const unsub = new Set(unsubs.map((r) => r.user_id))
  const already = new Set(sentEvts.filter((e) => e.meta?.q === Q).map((e) => e.user_id))
  const seen = new Set(); const targets = []
  let skipSent = 0
  for (const p of pool) {
    if (!p.email || /likelion/i.test(p.email)) continue
    const e = p.email.toLowerCase()
    if (seen.has(e) || unsub.has(p.id)) continue
    p.__t = txt(p)
    if (!pick(p)) continue
    seen.add(e)
    if (already.has(p.id)) { skipSent++; continue }
    targets.push(p)
  }
  const list = maxN ? targets.slice(0, maxN) : targets
  console.log(`캠페인  ${CAMPAIGN} · q=${Q}`)
  console.log(`대상    ${list.length}명 (드론 텍스트 ${list.filter((p) => droneRe.test(p.__t)).length} · 조립/납땜 ${list.filter((p) => asmRe.test(p.__t)).length} · 기발송 제외 ${skipSent})`)
  if (!doSend) { console.log('\n(dry-run — 실발송은 --send)'); return }

  let ok = 0, fail = 0
  for (const p of list) {
    const urlFor = (c) => landingUrl(p.id, c)
    const { error } = await resend.emails.send({
      from: FROM, to: p.email, subject: COPY.subject.vi,
      html: emailHtml(p.full_name, urlFor, unsubFor(p.id), 'vi'), text: emailText(p.full_name, urlFor, unsubFor(p.id), 'vi'),
      headers: { 'List-Unsubscribe': `<${unsubFor(p.id)}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
    })
    if (error) { console.error(`실패 ${p.email}:`, error.message || error); fail++; continue }
    await sb.from('events').insert({ event: 'coldmail_screen_sent', user_id: p.id, meta: { campaign: CAMPAIGN, q: Q } })
    ok++
    if (ok % 50 === 0) console.log(`  ${ok}/${list.length}`)
    await sleep(300)
  }
  console.log(`\n✅ 발송 완료 ${ok}/${list.length} (실패 ${fail})`)
}

main().catch((e) => { console.error(e); process.exit(1) })
