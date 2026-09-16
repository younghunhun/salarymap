// 근무 가능 조건(온사이트/원격) 수집 콜드메일 — 이력서 보유·work_type 무응답 회원에게
// /worktype?t=(개인 토큰)&cta=(누른 버튼) 발송. 랜딩은 로그인 없이 원탭으로 확정한다.
// 퍼널: 발송(coldmail_worktype_sent) → 클릭(coldmail_worktype_click) → 입력(coldmail_worktype_fill).
//
// 왜 이걸 먼저 모으나 — KTC 시트 실측(9/16): 파이프라인에서 확인된 불발 사유 1위가
// '온사이트 불가/원격만'(33건)으로 2위 연락두절(10건)·연봉(8건)을 크게 앞선다. 전부 전화
// 스크리닝 노트에서 나왔다 = CV 심사를 통과시키고 전화까지 건 뒤에야 알았다는 뜻이다.
// 인재풀 3,725명 중 온사이트 가부가 확인된 사람은 466명(12.5%)뿐이다.
//
// 대상: 이력서 보유 + work_type 무응답(3,188) − 이메일 없음 − likelion − 수신거부
//       − 기발송(coldmail_worktype_sent, 1인 1회)
//       'All'/'On-site'/'Remote' 중 하나라도 고른 사람은 이미 답이 있으므로 제외한다.
//
// ⚠️ 발송 전 선행: /worktype 랜딩 배포뿐. 마이그레이션 없음 — work_type 은 프로필 폼이 쓰는
//    기존 컬럼에 같은 3값을 그대로 넣으므로 인재풀 필터·TalentPoolView 가 즉시 값을 읽는다.
//
//   node scripts/outreach/worktype-coldmail.mjs --test wsj@likelion.net  # 검수용 한국어 1통, 이벤트 기록 없음
//   node scripts/outreach/worktype-coldmail.mjs                          # dry-run: 대상 집계
//   node scripts/outreach/worktype-coldmail.mjs --send [--max N]         # 실발송 + coldmail_worktype_sent 기록
//   node scripts/outreach/worktype-coldmail.mjs --send --segment active  # 1차 = 구직중(active+open) 1,184명
//   재발송은 --campaign worktype-b-MMDD 로 캠페인명 분리(-MMDD 표준).
//
// 프레임: B 고정. salary A/B 실측(같은 200명)에서 A(정중한 ask) 4.5% vs B(보류→재개 손실) 42.5%로
//   9.4배 갈렸고, 더 센 C(이미 탈락) 는 11.9%로 오히려 죽었다. 되돌릴 수 있는 손실이 가장 강하다.
//   같은 이유로 A/C 변형은 만들지 않는다 — 이미 판정된 A/B 를 다시 태울 이유가 없다.
import { Resend } from 'resend'
import { sb, env, fetchAll } from './lib.mjs'
import { makeToken } from '../../lib/campaignToken.js'
import { leadId } from '../../lib/ktcMailToken.js'

const args = process.argv.slice(2)
const flag = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? (args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true) : d }
const testTo = flag('test', null)
const doSend = args.includes('--send')
const segment = flag('segment', null)   // active = job_signal active+open 만
const maxN = flag('max', null) ? parseInt(flag('max'), 10) : null
const CAMPAIGN = String(flag('campaign', 'worktype-b'))
const SITE = String(flag('site', env.NEXT_PUBLIC_SITE_URL || 'https://salary-fyi.com')).replace(/\/$/, '')
const FROM = env.RESEND_FROM || 'FYI <hello@salary-fyi.com>'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const esc = (s) => String(s || '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
const firstName = (n) => String(n || '').trim().split(/\s+/).slice(-1)[0] || 'bạn'

/* 원탭 버튼 — 값은 프로필 폼(pages/profile.js)의 work_type 3지선다와 글자까지 같다.
   랜딩이 이 값을 그대로 user_profiles.work_type 에 넣으므로 매핑 표가 따로 없다.
   'All'(Tất cả)은 "전부 가능"이라 온사이트 가능 쪽으로 읽힌다 — 인재풀에서 On-site 와
   같이 묶여 466명을 이룬다. 버튼을 2개(가능/불가)로 줄이지 않는 이유가 이것이다:
   기존 값 체계를 바꾸면 이미 답한 466명과 새로 받는 값이 서로 다른 뜻이 된다. */
const BUTTONS = [
  { cta: 'onsite', value: 'On-site', vi: 'Đi làm tại văn phòng được', ko: '사무실 출근 가능' },
  { cta: 'all', value: 'All', vi: 'Hình thức nào cũng được', ko: '어떤 형태든 괜찮아요' },
  { cta: 'remote', value: 'Remote', vi: 'Chỉ làm từ xa được', ko: '원격 근무만 가능' },
]

// B 프레임 3단: 기회(후보에 올랐다) → 손실(조건 미확인으로 멈췄다) → 복구(한 번 누르면 재개).
// 마찰 제거 4종("한 번만"·"로그인 없이"·"10초"·"기업에 공개 안 됨")은 salary-b 와 같은 위치에 둔다.
const COPY = {
  subject: {
    vi: 'Đề cử của bạn đang bị tạm dừng — vì chưa rõ hình thức làm việc',
    ko: '회원님 추천이 보류 중입니다 — 근무 가능 조건이 확인이 안 돼서요',
  },
  hi: { vi: (n) => `Chào ${n},`, ko: (n) => `안녕하세요 ${n}님,` },
  p1: {
    vi: 'Người phụ trách đã đưa hồ sơ của bạn vào <b>danh sách đề cử cho các công ty</b>. Nhưng vì chưa biết bạn có thể <b>đi làm tại văn phòng</b> hay chỉ làm từ xa, chúng tôi không thể xác định nên đề cử bạn cho vị trí nào — <b>quá trình xem xét đang bị tạm dừng</b>.',
    ko: '담당자가 회원님 프로필을 <b>기업 추천 후보</b>에 올렸습니다. 그런데 <b>사무실 출근이 가능한지</b> 원격만 가능한지를 몰라 어느 포지션에 넣을지 판단을 못 해 <b>검토가 멈춰 있어요</b>.',
  },
  p2: {
    vi: 'Chỉ cần bấm <b>một nút bên dưới</b> — không cần đăng nhập, 10 giây — <b>việc xem xét sẽ được tiếp tục ngay</b>. Thông tin này chỉ dùng để chọn vị trí phù hợp cho bạn.',
    ko: '<b>아래 버튼 하나만</b> 눌러주시면 <b>검토가 바로 재개됩니다</b> — 로그인 없이 10초. 이 정보는 회원님께 맞는 포지션을 고르는 데만 사용돼요.',
  },
  thanks: { vi: 'Cảm ơn bạn!<br>— Đội ngũ FYI', ko: '감사합니다!<br>— FYI 팀 드림' },
  footer: {
    vi: 'Bạn nhận được email này vì đã đăng ký tài khoản trên FYI.',
    ko: 'FYI에 가입하셔서 이 메일을 받으셨습니다.',
  },
  unsub: { vi: 'Hủy nhận email', ko: '수신 거부' },
}

function emailHtml(name, urlFor, unsubUrl, lang) {
  const L = (o) => o[lang] || o.vi
  // 버튼 3개는 세로로 쌓는다 — 가로 배치는 베트남어 문구가 길어 모바일에서 줄이 깨진다.
  const btns = BUTTONS.map((b) => `
    <tr><td align="center" style="padding:5px 0">
      <a href="${urlFor(b.cta)}" style="display:block;background:#fff;border:1.5px solid #ff6000;color:#ff6000;font-weight:700;font-size:15px;text-decoration:none;padding:13px 20px;border-radius:12px">${b[lang] || b.vi}</a>
    </td></tr>`).join('')
  return `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;background:#faf9f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1a1612">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#faf9f7"><tr><td align="center" style="padding:28px 16px">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px">
  <tr><td style="padding-bottom:18px"><img src="https://salary-fyi.com/fyi-logo.png" height="24" alt="FYI" style="height:24px;width:auto;display:block"></td></tr>
  <tr><td style="font-size:15px;line-height:1.6;color:#1a1612;padding-bottom:6px">${L(COPY.hi)(esc(firstName(name)))}</td></tr>
  <tr><td style="font-size:14px;line-height:1.65;color:#4a443c;padding-bottom:14px">${L(COPY.p1)}</td></tr>
  <tr><td style="font-size:14px;line-height:1.65;color:#4a443c;padding-bottom:6px">${L(COPY.p2)}</td></tr>
  <tr><td style="padding:12px 0 6px"><table width="100%" cellpadding="0" cellspacing="0">${btns}</table></td></tr>
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
  const btns = BUTTONS.map((b) => `${b[lang] || b.vi}: ${urlFor(b.cta)}`).join('\n')
  return `${L(COPY.hi)(firstName(name))}

${strip(L(COPY.p1))}

${strip(L(COPY.p2))}

${btns}

${strip(L(COPY.thanks))}

${strip(L(COPY.footer))}
${strip(L(COPY.unsub))}: ${unsubUrl}`
}

async function main() {
  const resend = new Resend(env.RESEND_API_KEY)
  const landingUrl = (userId, cta) => `${SITE}/worktype?t=${makeToken(userId, CAMPAIGN)}&cta=${cta}`
  const unsubFor = (userId) => `${SITE}/api/coldmail/unsub?t=${makeToken(userId, CAMPAIGN)}`

  if (testTo) {
    const html = emailHtml('테스트', (cta) => landingUrl('00000000-0000-0000-0000-000000000000', cta), '#', 'ko')
    const text = emailText('테스트', (cta) => landingUrl('00000000-0000-0000-0000-000000000000', cta), '#', 'ko')
    await resend.emails.send({ from: FROM, to: testTo, subject: `[TEST] ${COPY.subject.ko}`, html, text })
    console.log(`[TEST] 발송 → ${testTo} (이벤트 기록 없음)`)
    return
  }

  const profiles = await fetchAll(() => sb.from('user_profiles')
    .select('id, email, full_name, resume_url, work_type, job_signal'))
  const sentEvts = await fetchAll(() => sb.from('events')
    .select('user_id, meta').eq('event', 'coldmail_worktype_sent'))
  const unsubEvts = await fetchAll(() => sb.from('events')
    .select('meta').eq('event', 'coldmail_unsub'))
  const alreadySent = new Set(sentEvts.map((e) => e.user_id).filter(Boolean))
  const unsub = new Set(unsubEvts.map((e) => e.meta?.lead).filter(Boolean))

  let targets = profiles
    .filter((p) => p.resume_url && p.resume_url !== '')
    .filter((p) => !(p.work_type || '').trim())        // 이미 답한 사람 제외
    .filter((p) => (p.email || '').includes('@'))
    .filter((p) => !/likelion/i.test(p.email))
    .filter((p) => !unsub.has(leadId(p.email)))
    .filter((p) => !alreadySent.has(p.id))
  if (segment === 'active') targets = targets.filter((p) => ['active', 'open'].includes(p.job_signal))
  if (maxN) targets = targets.slice(0, maxN)

  console.log(`캠페인      ${CAMPAIGN}`)
  console.log(`세그먼트    ${segment || '전체'}`)
  console.log(`대상        ${targets.length}명`)
  console.log(`제목        ${COPY.subject.vi}`)
  if (!doSend) { console.log('\n(dry-run — 실발송은 --send)'); return }

  let ok = 0
  for (const p of targets) {
    const urlFor = (cta) => landingUrl(p.id, cta)
    try {
      await resend.emails.send({
        from: FROM, to: p.email, subject: COPY.subject.vi,
        html: emailHtml(p.full_name, urlFor, unsubFor(p.id), 'vi'),
        text: emailText(p.full_name, urlFor, unsubFor(p.id), 'vi'),
      })
      await sb.from('events').insert({
        event: 'coldmail_worktype_sent', user_id: p.id,
        meta: { campaign: CAMPAIGN, lead: leadId(p.email) },
      })
      ok++
      if (ok % 50 === 0) console.log(`  ${ok}/${targets.length}`)
      await sleep(120)
    } catch (e) {
      console.error(`  실패 ${p.email}: ${e.message}`)
    }
  }
  console.log(`\n발송 완료 ${ok}/${targets.length}`)
}

main()
