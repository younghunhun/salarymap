// VKU "K-Tech College Job Matching Weekend 2026"(9/30) 참가자 중 CV 미제출자 → FYI 가입 유도 콜드메일(베트남어).
// 대상 = QR 출석 명단(VKU 2.xlsx) 중 면접 신청자(별도 CV 클레임 캠페인 coldmail-ktc-cv-vku1001) 제외 + 이름매칭 불확실 이메일 제외
//        → data/vku0930-nocv.csv (email,name,ten,major,khoa,booth,group=booth|fair). 첫 문장·푸터만 부스 체크인/미체크인으로 분기(introLine/footReason).
// 훅(유저 10/1 확정): VKU 캠퍼스 사무실·재학생 원격근무 실재 → 행사 참여 감사 → VKU 학생에게 한국 기업 오퍼 우선·초기 경력 기회 → VKU 구글 계정으로 가입.
// CTA = /api/ktc/r(클릭 기록) → /api/auth/google?return=/profile&login_hint=<email> : 메일에서 바로 구글 로그인(vku.udn.vn = Google Workspace).
// 가입 귀속은 콜백의 coldmail_public_convert(lead 해시, 캠페인 무관)로 잡힌다. CV 임포트 없음(캠페인명이 coldmail-ktc-cv 로 시작하지 않음 — 의도).
//
//   node scripts/outreach/vku1001-signup-coldmail.mjs                        # dry-run
//   node scripts/outreach/vku1001-signup-coldmail.mjs --test a@x.com [--lang ko] [--group booth|fair]
//   node scripts/outreach/vku1001-signup-coldmail.mjs --send [--max N] [--group booth|fair]
import { readFileSync, writeFileSync } from 'node:fs'
import { resolveMx } from 'node:dns/promises'
import { sb, env, fetchAll, fetchBlacklist } from './lib.mjs'
import { makeToken, leadId } from '../../lib/ktcMailToken.js'

const CAMPAIGN = 'coldmail-vku-signup-1001'
const SITE = (env.NEXT_PUBLIC_SITE_URL || 'https://salary-fyi.com').replace(/\/$/, '')
const RESEND_FROM = env.RESEND_FROM || 'FYI <hello@salary-fyi.com>'
const LEADS = new URL('../../data/vku0930-nocv.csv', import.meta.url)

const args = process.argv.slice(2)
const flag = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? (args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true) : d }
const doSend = args.includes('--send')
const testTo = flag('test', null)
const onlyGroup = flag('group', null)
const max = parseInt(flag('max', '0')) || 0
const lang = flag('lang', 'vi') === 'ko' ? 'ko' : 'vi' // ko 는 문구 검토용 테스트 전용
const TEMPLATE = new URL(`../vku-signup-coldmail-${lang}.html`, import.meta.url)
const sleep = (ms) => new Promise(r => setTimeout(r, ms))
const esc = (s) => String(s || '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
const csvCell = (v) => { const s = String(v ?? ''); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s }

function parseCsv(text) {
  if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1)
  const rows = []; let row = [], cur = '', q = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (q) { if (c === '"') { if (text[i + 1] === '"') { cur += '"'; i++ } else q = false } else cur += c }
    else if (c === '"') q = true
    else if (c === ',') { row.push(cur); cur = '' }
    else if (c === '\n') { row.push(cur); rows.push(row); row = []; cur = '' }
    else if (c !== '\r') cur += c
  }
  if (cur || row.length) { row.push(cur); rows.push(row) }
  const head = rows.shift()
  return rows.filter(r => r.length > 1).map(r => Object.fromEntries(head.map((h, i) => [h, (r[i] || '').trim()])))
}

// 행사 다음날 발송이면 "어제", 늦어지면 날짜 명시
const dayWord = new Date().toISOString().slice(0, 10) === '2026-10-01'
  ? { vi: 'Hôm qua', ko: '어제' }[lang] : { vi: 'Hôm 30/9', ko: '지난 9월 30일' }[lang]
const template = readFileSync(TEMPLATE, 'utf8')
const subject = (l) => lang === 'ko'
  ? `${l.ten}님, VKU 학생을 위한 한국 기업 채용 우선 기회를 안내드립니다`
  : `${l.ten} ơi, cơ hội ưu tiên nhận lời mời việc làm từ doanh nghiệp Hàn Quốc dành cho sinh viên VKU`
// 첫 문장 분기 — 부스 체크인자만 "우리 행사 참여"로 말한다. QR 미체크인자는 우리 행사에 왔는지 모르므로
// "박람회 참여 감사 + 그날 메인 스폰서였던 K-Tech College(LIKELION) 소개"로 간다(유저 10/1 지시: 참여 안 한 사람에게 참여했다 하면 이상).
const introLine = (l) => l.booth
  ? (lang === 'ko'
    ? `${dayWord} VKU에서 열린 <b>K-Tech College Job Matching Weekend</b>에 참여해 주셔서 감사합니다. <b>${esc(l.booth)}</b> 부스에 들러주신 것도 기억하고 있습니다.`
    : `${dayWord}, cảm ơn bạn đã tham gia <b>K-Tech College Job Matching Weekend</b> tại VKU. Chúng tôi cũng nhớ bạn đã ghé gian hàng <b>${esc(l.booth)}</b>.`)
  : (lang === 'ko'
    ? `${dayWord} VKU 취업박람회에 참여해 주셔서 감사합니다. 저희는 그날 <b>메인 스폰서로 함께했던 K-Tech College(LIKELION)</b>입니다.`
    : `${dayWord}, cảm ơn bạn đã tham gia ngày hội việc làm tại VKU. Chúng tôi là <b>K-Tech College (LIKELION)</b> — nhà tài trợ chính của sự kiện hôm đó.`)
const introText = (l) => introLine(l).replace(/<[^>]+>/g, '')
const footReason = (l) => l.booth
  ? (lang === 'ko' ? '이 메일은 K-Tech College Job Matching Weekend(VKU)에 참여하신 분께 FYI 서비스를 안내하기 위해 발송되었습니다.'
    : 'Email này được gửi đến bạn vì bạn đã tham gia K-Tech College Job Matching Weekend (VKU), nhằm giới thiệu dịch vụ FYI.')
  : (lang === 'ko' ? '이 메일은 VKU 취업박람회(9/30)에 참여하신 분께 메인 스폰서 K-Tech College가 FYI 서비스를 안내하기 위해 발송되었습니다.'
    : 'Email này được gửi đến bạn vì bạn đã tham gia ngày hội việc làm tại VKU (30/9); K-Tech College, nhà tài trợ chính, xin giới thiệu dịch vụ FYI.')
const render = (l, cta, unsub) => template
  .replace(/\{\{name\}\}/g, esc(l.ten))
  .replace(/\{\{introLine\}\}/g, introLine(l))
  .replace(/\{\{footReason\}\}/g, footReason(l))
  .replace(/\{\{email\}\}/g, esc(l.email))
  .replace(/\{\{ctaUrl\}\}/g, cta)
  .replace(/\{\{unsubscribeUrl\}\}/g, unsub)
const text = (l, cta, unsub) => lang === 'ko' ? `안녕하세요 ${l.ten}님,

${introText(l)}

FYI는 K-Tech College가 만든 채용 플랫폼입니다. 저희는 VKU 캠퍼스 안에 사무실을 두고 있고, 그곳에서 VKU 재학생들이 한국 기업의 업무를 원격으로 수행하고 있습니다.

이번 행사에서 VKU 학생분들의 참여와 역량이 인상적이어서, 앞으로 VKU 학생을 대상으로 한국 기업 채용 기회를 우선적으로 열어 재학 중에 초기 경력을 쌓을 수 있는 자리를 먼저 안내드리려고 합니다.

지금 가입해 두시면, 전공과 맞는 포지션이 열릴 때 오퍼를 이메일로 받아보실 수 있습니다. 이력서까지 등록해 두시면 기업 채용 담당자에게 바로 전달됩니다.

VKU 계정(${l.email})으로 가입하고 오퍼 받기:
${cta}

— FYI 팀 · salary-fyi.com
수신 거부: ${unsub}` : `Chào ${l.ten},

${introText(l)}

FYI là nền tảng tuyển dụng do K-Tech College xây dựng. Chúng tôi có văn phòng ngay trong khuôn viên VKU, nơi các bạn sinh viên VKU đang làm việc từ xa cho các doanh nghiệp Hàn Quốc.

Sự tham gia và năng lực của các bạn sinh viên VKU trong sự kiện vừa rồi đã để lại ấn tượng rất tốt, nên sắp tới chúng tôi sẽ ưu tiên mở các cơ hội tuyển dụng từ doanh nghiệp Hàn Quốc cho sinh viên VKU — để các bạn có thể tích lũy kinh nghiệm ngay từ khi còn đi học.

Hãy đăng ký ngay hôm nay — khi có vị trí phù hợp với chuyên ngành của bạn, lời mời sẽ được gửi đến email của bạn. Nếu bạn đăng ký thêm CV, hồ sơ sẽ được gửi trực tiếp đến nhà tuyển dụng.

Đăng ký bằng tài khoản VKU (${l.email}) và nhận lời mời:
${cta}

— Đội ngũ FYI · salary-fyi.com
Hủy đăng ký: ${unsub}`

// 클릭 기록 → 구글 로그인(login_hint=수신 이메일, return=/profile 로 CV 등록까지 잇는다). r.js 는 내부 경로만 허용하므로 1회 인코딩.
const ctaFor = (l) => `${SITE}/api/ktc/r?t=${encodeURIComponent(makeToken(l.email, CAMPAIGN))}&to=${encodeURIComponent(`/api/auth/google?return=${encodeURIComponent('/profile')}&login_hint=${encodeURIComponent(l.email)}`)}`
const unsubFor = (l) => `${SITE}/api/ktc/unsub?t=${encodeURIComponent(makeToken(l.email, CAMPAIGN))}`

;(async () => {
  if (testTo) {
    const { Resend } = await import('resend'); const resend = new Resend(env.RESEND_API_KEY)
    const l = { email: testTo, ten: 'Hằng', booth: onlyGroup === 'fair' ? '' : 'Bada Fintech' }
    const cta = ctaFor(l), unsub = unsubFor(l)
    const r = await resend.emails.send({ from: RESEND_FROM, to: testTo, subject: '[TEST] ' + subject(l), text: text(l, cta, unsub), html: render(l, cta, unsub) })
    if (r.error) throw new Error(r.error.message)
    console.log(`✅ 테스트 발송(${lang}) → ${testTo} | id=${r.data?.id}\n제목: ${subject(l)}\nCTA: ${cta}`)
    return
  }

  let leads = parseCsv(readFileSync(LEADS, 'utf8')).filter(r => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(r.email))
  for (const l of leads) { l.email = l.email.toLowerCase(); l.lead = leadId(l.email) }
  if (onlyGroup) leads = leads.filter(l => l.group === onlyGroup)
  const total = leads.length

  const profs = await fetchAll(() => sb.from('user_profiles').select('email').not('email', 'is', null))
  const members = new Set(profs.map(p => p.email.trim().toLowerCase()))
  const evts = await fetchAll(() => sb.from('events').select('event, meta, created_at').in('event', ['coldmail_public_sent', 'coldmail_unsub']))
  const sent = new Set(evts.filter(e => e.event === 'coldmail_public_sent' && e.meta?.campaign === CAMPAIGN && e.meta?.lead).map(e => e.meta.lead))
  // 1인1통(시간 간격): 24h 내 다른 공개 콜드메일을 받은 사람은 이번 회차에서 제외
  const dayAgo = Date.now() - 24 * 3600 * 1000
  const recent = new Set(evts.filter(e => e.event === 'coldmail_public_sent' && e.meta?.lead && new Date(e.created_at).getTime() >= dayAgo).map(e => e.meta.lead))
  const unsub = new Set(evts.filter(e => e.event === 'coldmail_unsub' && e.meta?.lead).map(e => e.meta.lead))
  const bl = await fetchBlacklist()
  const n = (f) => leads.filter(f).length
  const nMember = n(l => members.has(l.email)), nSent = n(l => sent.has(l.lead)), nRecent = n(l => !sent.has(l.lead) && recent.has(l.lead)), nUnsub = n(l => unsub.has(l.lead) || bl.has(l))
  leads = leads.filter(l => !members.has(l.email) && !sent.has(l.lead) && !recent.has(l.lead) && !unsub.has(l.lead) && !bl.has(l))

  console.log(`캠페인: ${CAMPAIGN} | CTA: 구글 로그인 직행(return=/profile)`)
  console.log(`리스트 ${total}명${onlyGroup ? `(group=${onlyGroup})` : ''} | 제외: FYI가입 ${nMember} · 발송済 ${nSent} · 24h내 타캠페인 수신 ${nRecent} · 수신거부/블랙 ${nUnsub} → 대상 ${leads.length}명 (부스 ${leads.filter(l => l.group === 'booth').length} · 박람회 ${leads.filter(l => l.group === 'fair').length})`)
  const capped = max ? leads.slice(0, max) : leads
  if (!capped.length) { console.log('보낼 대상 없음.'); return }

  const mxOk = new Map()
  for (const d of new Set(capped.map(l => l.email.split('@')[1]))) { try { mxOk.set(d, (await resolveMx(d)).length > 0) } catch { mxOk.set(d, false) } }
  const queue = capped.filter(l => mxOk.get(l.email.split('@')[1]))
  if (queue.length < capped.length) console.log(`MX 없음 제외 ${capped.length - queue.length}`)

  const s = queue[0]
  console.log(`\n이번 발송 ${queue.length}명 | 샘플: ${s.email} / ${s.ten} / ${s.major} / ${s.booth || '(부스 없음)'}`)
  console.log(`제목: ${subject(s)}\nCTA: ${ctaFor(s)}`)
  if (!doSend) { console.log('\n[dry-run] --send 로 실발송.'); return }
  if (lang !== 'vi') throw new Error('실발송은 vi 고정 — --lang ko 는 --test 전용')

  const { Resend } = await import('resend'); const resend = new Resend(env.RESEND_API_KEY)
  const log = [['email', 'ten', 'group', 'booth', 'major', 'lead', 'resend_id', 'error'].join(',')]
  let ok = 0, fail = 0
  for (const l of queue) {
    const cta = ctaFor(l), unsub = unsubFor(l)
    try {
      const resp = await resend.emails.send({
        from: RESEND_FROM, to: l.email, subject: subject(l), text: text(l, cta, unsub), html: render(l, cta, unsub),
        headers: { 'List-Unsubscribe': `<${unsub}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
      })
      if (resp.error) throw new Error(resp.error.message || 'resend_error')
      await sb.from('events').insert([{ event: 'coldmail_public_sent', page: '/campaign/vku',
        meta: { campaign: CAMPAIGN, lead: l.lead, lang: 'vi', group: l.group, resend_id: resp.data?.id || null } }])
      log.push([l.email, l.ten, l.group, l.booth, l.major, l.lead, resp.data?.id || '', ''].map(csvCell).join(',')); ok++
    } catch (e) { fail++; log.push([l.email, l.ten, l.group, l.booth, l.major, l.lead, '', e.message].map(csvCell).join(',')); console.error(`  ✗ ${l.email}: ${e.message}`) }
    if ((ok + fail) % 100 === 0) console.log(`  ${ok + fail}/${queue.length} (성공 ${ok} / 실패 ${fail})`)
    await sleep(600)
  }
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  writeFileSync(new URL(`../../data/vku1001-signup-sent-${stamp}.csv`, import.meta.url), log.join('\n'))
  console.log(`\n✅ 발송 완료: 성공 ${ok} / 실패 ${fail} | 로그: data/vku1001-signup-sent-${stamp}.csv`)
})().catch(e => { console.error(e); process.exit(1) })
