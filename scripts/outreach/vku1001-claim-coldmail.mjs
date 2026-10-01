// VKU "K-Tech College Job Matching Weekend 2026"(9/30, 다낭 VKU) 현장 면접 신청자 72명 → CV 클레임 콜드메일.
// 양식은 KTC 4차 클레임(scripts/ktc-claim-coldmail-vi.html) 그대로, 지원 경로 문구만 "Job Matching Weekend tại VKU"로 교체.
// 캠페인명은 반드시 coldmail-ktc-cv 로 시작해야 한다 — 가입 콜백(/api/auth/google/callback)의 CV 임포트가
// /^coldmail-ktc-cv/ 캠페인의 sent 이벤트 meta.cv_url 만 읽기 때문.
//
// 리드 소스: data/vku0930-interview.csv (VKU 1.xlsx 에서 추출: email,name,ten,company,job,cv_url(Drive),major,applied_at)
// Drive 링크는 콜백이 임포트하지 못하므로(허용 호스트 = *.supabase.co/storage/public) --prepare 로
// 우리 resumes 버킷(ktc-claim/vku0930/<lead해시>.<ext>)에 옮기고, 같은 자리에서 파싱해 ktc_claim_profiles 에 적재한다.
// 랜딩(/ktc/claim) 카드는 ktc_candidates(없음) 대신 이 파싱본으로 뜨므로, 발송은 파싱 성공자에게만 한다.
//
//   node scripts/outreach/vku1001-claim-coldmail.mjs --prepare [--max N]   # Drive CV → 스토리지 + 파싱(idempotent)
//   node scripts/outreach/vku1001-claim-coldmail.mjs                       # dry-run
//   node scripts/outreach/vku1001-claim-coldmail.mjs --test a@x.com        # 테스트 발송(스탬프 안 함)
//   node scripts/outreach/vku1001-claim-coldmail.mjs --send [--max N]
import { readFileSync, writeFileSync } from 'node:fs'
import { resolveMx } from 'node:dns/promises'
import { sb, env, fetchAll, fetchBlacklist } from './lib.mjs'
import { makeToken, leadId } from '../../lib/ktcMailToken.js'

const CAMPAIGN = 'coldmail-ktc-cv-vku1001'
const SITE = (env.NEXT_PUBLIC_SITE_URL || 'https://salary-fyi.com').replace(/\/$/, '')
const RESEND_FROM = env.RESEND_FROM || 'FYI <hello@salary-fyi.com>'
const LEADS = new URL('../../data/vku0930-interview.csv', import.meta.url)
const TEMPLATE = new URL('../ktc-claim-coldmail-vi.html', import.meta.url)
const BUCKET = 'resumes', PREFIX = 'ktc-claim/vku0930'
const IMPORTABLE = /^https:\/\/[a-z0-9]+\.supabase\.co\/storage\/v1\/object\/public\//

const args = process.argv.slice(2)
const flag = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? (args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true) : d }
const doPrepare = args.includes('--prepare')
const doSend = args.includes('--send')
const testTo = flag('test', null)
const max = parseInt(flag('max', '0')) || 0
const sleep = (ms) => new Promise(r => setTimeout(r, ms))
const esc = (s) => String(s || '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
const csvCell = (v) => { const s = String(v ?? ''); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s }

// 제목·카드용 짧은 직무명 — 폼의 공고명이 길어(최대 65자) 제목에 못 들어간다.
const SHORT = [
  [/Robotics Integrated Mobile App/i, 'Mobile App & Web Intern'],
  [/Frontend & UI\/UX/i, 'Frontend & UI/UX'],
  [/Phát triển Thị trường Fintech/i, 'Fintech Market Development'],
  [/TikTok Shop/i, 'TikTok Shop Ads Intern'],
  [/AI Digital Marketing/i, 'AI Digital Marketing Developer'],
  [/Content & Performance/i, 'Content & Performance Marketing'],
]
const shortPos = (job) => (SHORT.find(([re]) => re.test(job || '')) || [])[1] || ''

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

// ── 템플릿: 지원 경로 한 문장만 교체(치환 실패 = 원문 변경 → 발송 차단) ──
const swap = (tpl, pairs) => pairs.reduce((t, [a, b]) => {
  if (!t.includes(a)) throw new Error(`템플릿 치환 실패(원문 변경됨?): ${a.slice(0, 40)}…`)
  return t.replace(a, b)
}, tpl)
const template = swap(readFileSync(TEMPLATE, 'utf8'), [
  ['{{month}}bạn đã ứng tuyển vị trí <b>{{jobTitle}}</b>{{atCompany}} qua <b>K-Tech College</b>.',
   '{{month}}bạn đã đăng ký phỏng vấn vị trí <b>{{jobTitle}}</b>{{atCompany}} tại <b>K-Tech College Job Matching Weekend</b> ở VKU.'],
  ['Email này được gửi đến bạn vì bạn đã ứng tuyển K-Tech College, nhằm giới thiệu dịch vụ FYI.',
   'Email này được gửi đến bạn vì bạn đã đăng ký phỏng vấn tại K-Tech College Job Matching Weekend (VKU), nhằm giới thiệu dịch vụ FYI.'],
])
const subject = (l) => `${l.ten} ơi, hồ sơ ${l.position} của bạn đã sẵn sàng trên FYI`
const cardRowStyle = 'font-size:14px;color:#4E5968;line-height:1.7;'
const cardRows = (l) => {
  const rows = []
  if (l.university) rows.push(`<div style="${cardRowStyle}">🎓 ${esc(l.university)}</div>`)
  rows.push(`<div style="${cardRowStyle}">💼 ${esc(l.position)}</div>`)
  if (l.skills?.length) rows.push(`<div style="${cardRowStyle}">🛠 ${esc(l.skills.slice(0, 5).join(' · '))}</div>`)
  return rows.join('\n          ')
}
const render = (l, cta, unsub) => template
  .replace(/\{\{name\}\}/g, esc(l.ten))
  .replace(/\{\{fullName\}\}/g, esc(l.name))
  .replace(/\{\{month\}\}/g, 'Hồi cuối tháng 9, ')
  .replace(/\{\{jobTitle\}\}/g, esc(l.job))
  .replace(/\{\{atCompany\}\}/g, ` của <b>${esc(l.company)}</b>`)
  .replace(/\{\{position\}\}/g, esc(l.position))
  .replace(/\{\{cardRows\}\}/g, cardRows(l))
  .replace(/\{\{ctaUrl\}\}/g, cta)
  .replace(/\{\{unsubscribeUrl\}\}/g, unsub)
const text = (l, cta, unsub) => `Chào ${l.ten},

Hồi cuối tháng 9, bạn đã đăng ký phỏng vấn vị trí ${l.job} của ${l.company} tại K-Tech College Job Matching Weekend ở VKU.

Với CV bạn đã nộp khi đó, chúng tôi đã chuẩn bị sẵn hồ sơ của bạn trên FYI — nền tảng tuyển dụng do K-Tech College xây dựng.

Bạn không cần viết lại CV. Chỉ cần đăng nhập Google một lần, hồ sơ sẽ được đăng ký ngay và bạn có thể ứng tuyển các vị trí mới chỉ với một chạm.

Khi có vị trí phù hợp, chúng tôi sẽ gửi hồ sơ của bạn trực tiếp đến nhà tuyển dụng — và bạn sẽ nhận được liên hệ qua email.

Nhận hồ sơ của tôi:
${cta}

— Đội ngũ FYI · salary-fyi.com
Hủy đăng ký: ${unsub}`

const ctaFor = (l) => `${SITE}/api/ktc/r?t=${encodeURIComponent(makeToken(l.email, CAMPAIGN))}&to=%2Fktc%2Fclaim`
const unsubFor = (l) => `${SITE}/api/ktc/unsub?t=${encodeURIComponent(makeToken(l.email, CAMPAIGN))}`

// ── Drive CV → 우리 스토리지 + 파싱 ──
const driveId = (u) => (String(u).match(/[?&]id=([\w-]+)/) || String(u).match(/\/d\/([\w-]+)/) || [])[1]
async function prepare(leads, claimBy) {
  const { parseResumeBuffer } = await import('../../lib/parseResume.js') // env 주입(lib.mjs) 뒤 로드
  // 기존 KTC 파싱본이 있어도 VKU 에 낸 최신 CV 로 갈아탄다 — 우리 경로에 이미 올린 사람만 스킵
  const targets = leads.filter(l => !(claimBy.get(l.email)?.cv_url || '').includes(`/${PREFIX}/`))
  console.log(`준비 대상 ${targets.length}명 (기준비 ${leads.length - targets.length})`)
  let ok = 0; const fails = []
  for (const l of (max ? targets.slice(0, max) : targets)) {
    try {
      const id = driveId(l.cv_url); if (!id) throw new Error('drive id 없음')
      const r = await fetch(`https://drive.google.com/uc?export=download&id=${id}`, { redirect: 'follow' })
      if (!r.ok) throw new Error(`download ${r.status}`)
      const buf = Buffer.from(await r.arrayBuffer())
      const isPdf = buf.subarray(0, 1024).indexOf('%PDF-') !== -1, isZip = buf.subarray(0, 2).toString('latin1') === 'PK'
      if (!isPdf && !isZip) throw new Error(`CV 아님(${(r.headers.get('content-type') || '').slice(0, 40)}, ${buf.length}B)`)
      const ext = isPdf ? 'pdf' : 'docx'
      const type = isPdf ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      const path = `${PREFIX}/${l.lead}.${ext}` // 해시 파일명 — PII 없음(KTC 클레임과 동일 규칙)
      const { error: upErr } = await sb.storage.from(BUCKET).upload(path, buf, { contentType: type, upsert: true })
      if (upErr) throw new Error(`upload: ${upErr.message}`)
      const cvUrl = sb.storage.from(BUCKET).getPublicUrl(path).data.publicUrl
      const summary = await parseResumeBuffer(buf, l.name)
      const { error } = await sb.from('ktc_claim_profiles').upsert({ email: l.email, summary, cv_url: cvUrl, parsed_at: new Date().toISOString() }, { onConflict: 'email' })
      if (error) throw new Error(`db: ${error.message}`)
      ok++
      console.log(`  ✓ ${l.email} → ${ext} ${(buf.length / 1024).toFixed(0)}KB | ${summary.full_name} · ${summary.university || '(대학 없음)'} · ${summary.headline || ''}`)
    } catch (e) { fails.push(`${l.email}: ${e.message}`) }
    await sleep(300)
  }
  console.log(`\n✅ 준비 완료: 성공 ${ok} / 실패 ${fails.length}`)
  for (const f of fails) console.log('  ✗', f)
}

;(async () => {
  if (testTo) {
    const { Resend } = await import('resend'); const resend = new Resend(env.RESEND_API_KEY)
    const l = { email: testTo, ten: 'Bảo', name: 'Trần Phạm Quốc Bảo', company: 'Jinosys', job: 'AI, IoT, and Robotics Integrated Mobile App & Web Service Intern',
      position: 'Mobile App & Web Intern', university: 'Đại học CNTT & TT Việt - Hàn (VKU)', skills: ['Flutter', 'React', 'Node.js', 'Python'] }
    const cta = ctaFor(l), unsub = unsubFor(l)
    const r = await resend.emails.send({ from: RESEND_FROM, to: testTo, subject: '[TEST] ' + subject(l), text: text(l, cta, unsub), html: render(l, cta, unsub) })
    if (r.error) throw new Error(r.error.message)
    console.log(`✅ 테스트 발송 → ${testTo} | id=${r.data?.id}\n제목: ${subject(l)}\nCTA: ${cta}`)
    return
  }

  let leads = parseCsv(readFileSync(LEADS, 'utf8')).filter(r => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(r.email))
  for (const l of leads) { l.email = l.email.toLowerCase(); l.lead = leadId(l.email) }
  const total = leads.length

  const profs = await fetchAll(() => sb.from('user_profiles').select('email').not('email', 'is', null))
  const members = new Set(profs.map(p => p.email.trim().toLowerCase()))
  const evts = await fetchAll(() => sb.from('events').select('event, meta').in('event', ['coldmail_public_sent', 'coldmail_unsub']))
  const sent = new Set(evts.filter(e => e.event === 'coldmail_public_sent' && e.meta?.campaign === CAMPAIGN && e.meta?.lead).map(e => e.meta.lead))
  const unsub = new Set(evts.filter(e => e.event === 'coldmail_unsub' && e.meta?.lead).map(e => e.meta.lead))
  const bl = await fetchBlacklist()
  const nMember = leads.filter(l => members.has(l.email)).length
  const nSent = leads.filter(l => sent.has(l.lead)).length
  const nUnsub = leads.filter(l => unsub.has(l.lead) || bl.has(l)).length
  leads = leads.filter(l => !members.has(l.email) && !sent.has(l.lead) && !unsub.has(l.lead) && !bl.has(l))
  const afterDedup = leads.length

  const claims = await fetchAll(() => sb.from('ktc_claim_profiles').select('email, summary, cv_url').in('email', leads.map(l => l.email)))
  const claimBy = new Map(claims.map(c => [c.email, c]))

  if (doPrepare) return prepare(leads, claimBy)

  for (const l of leads) {
    const c = claimBy.get(l.email); const p = c?.summary || {}
    l.cvUrl = c?.cv_url || ''
    l.university = (p.university || '').trim()
    l.skills = Array.isArray(p.skills) ? p.skills : []
    l.position = shortPos(l.job) || (p.headline || '').trim() || l.job
  }
  const ready = leads.filter(l => IMPORTABLE.test(l.cvUrl) && claimBy.get(l.email)?.summary?.full_name)
  console.log(`캠페인: ${CAMPAIGN} | 랜딩: /ktc/claim`)
  console.log(`리스트 ${total}명 | 제외: FYI가입 ${nMember} · 발송済 ${nSent} · 수신거부/블랙 ${nUnsub} → ${afterDedup}명 | CV 준비·파싱 완료 ${ready.length} (미준비 ${afterDedup - ready.length} = --prepare 필요)`)
  const capped = max ? ready.slice(0, max) : ready
  if (!capped.length) { console.log('보낼 대상 없음.'); return }

  const mxOk = new Map()
  for (const d of new Set(capped.map(l => l.email.split('@')[1]))) { try { mxOk.set(d, (await resolveMx(d)).length > 0) } catch { mxOk.set(d, false) } }
  const queue = capped.filter(l => mxOk.get(l.email.split('@')[1]))
  if (queue.length < capped.length) console.log(`MX 없음 제외 ${capped.length - queue.length}`)

  const s = queue[0]
  console.log(`\n이번 발송 ${queue.length}명 | 회사별: ${JSON.stringify(Object.fromEntries([...new Set(queue.map(l => l.company))].map(c => [c, queue.filter(l => l.company === c).length])))}`)
  console.log(`샘플: ${s.email} / ${s.ten} / ${s.position} / ${s.university || '(대학 없음)'} / 스킬 ${s.skills.slice(0, 3).join(',')}`)
  console.log(`제목: ${subject(s)}\nCTA: ${ctaFor(s)}`)
  if (!doSend) { console.log('\n[dry-run] --send 로 실발송.'); return }

  const { Resend } = await import('resend'); const resend = new Resend(env.RESEND_API_KEY)
  const log = [['email', 'ten', 'company', 'position', 'lead', 'resend_id', 'error'].join(',')]
  let ok = 0, fail = 0
  for (const l of queue) {
    const cta = ctaFor(l), unsub = unsubFor(l)
    try {
      const resp = await resend.emails.send({
        from: RESEND_FROM, to: l.email, subject: subject(l), text: text(l, cta, unsub), html: render(l, cta, unsub),
        headers: { 'List-Unsubscribe': `<${unsub}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
      })
      if (resp.error) throw new Error(resp.error.message || 'resend_error')
      await sb.from('events').insert([{ event: 'coldmail_public_sent', page: '/campaign/ktc',
        meta: { campaign: CAMPAIGN, lead: l.lead, lang: 'vi', cv_url: l.cvUrl, resend_id: resp.data?.id || null } }])
      log.push([l.email, l.ten, l.company, l.position, l.lead, resp.data?.id || '', ''].map(csvCell).join(',')); ok++
    } catch (e) { fail++; log.push([l.email, l.ten, l.company, l.position, l.lead, '', e.message].map(csvCell).join(',')); console.error(`  ✗ ${l.email}: ${e.message}`) }
    await sleep(600)
  }
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  writeFileSync(new URL(`../../data/vku1001-claim-sent-${stamp}.csv`, import.meta.url), log.join('\n'))
  console.log(`\n✅ 발송 완료: 성공 ${ok} / 실패 ${fail} | 로그: data/vku1001-claim-sent-${stamp}.csv`)
})().catch(e => { console.error(e); process.exit(1) })
