// KTC CANDIDATE DATA 시트 전체(=ktc-support candidates 테이블) 기준 CV 클레임 콜드메일 — 7/28 CSV 리스트 밖까지 확장(10/2).
// 양식·랜딩·콜백은 KTC 4차 클레임(scripts/outreach/ktc-claim-coldmail.mjs)과 동일. 차이는 두 가지:
//   1) 리드 소스가 고정 CSV 가 아니라 ktc-support DB candidates 전량(시트 동기화본) — 미가입 × 우리 메일 접촉 0 인 사람만.
//   2) CV 가 Drive 링크(2,300명+, recruitment@likelion.net 소유·공개 다운로드 불가)인 리드는 --prepare 로
//      Drive API(GDRIVE_REFRESH_TOKEN, drive.readonly)로 받아 우리 resumes 버킷(ktc-claim/sheet1002/<lead해시>.<ext>)에
//      옮기고 같은 자리에서 파싱(ktc_claim_profiles). 가입 콜백 임포트는 *.supabase.co 공개 스토리지 URL 만 허용하므로 필수.
//      KTC 공개 스토리지 직링크(ktc-cvs)인 리드는 옮기지 않고 파싱만 한다.
// 캠페인명은 coldmail-ktc-cv 로 시작해야 콜백 임포트가 동작한다.
//
//   node scripts/outreach/auth.mjs --drive                                   # 1회: GDRIVE_REFRESH_TOKEN 발급 → .env.local
//   node scripts/outreach/ktc-sheet-claim-coldmail.mjs --prepare [--max N] [--workers 4]   # CV 이동+파싱(idempotent)
//   node scripts/outreach/ktc-sheet-claim-coldmail.mjs                       # dry-run
//   node scripts/outreach/ktc-sheet-claim-coldmail.mjs --test a@x.com [--lang ko]
//   node scripts/outreach/ktc-sheet-claim-coldmail.mjs --send [--max N]
import { readFileSync, writeFileSync } from 'node:fs'
import { resolveMx } from 'node:dns/promises'
import { createClient } from '@supabase/supabase-js'
import { google } from 'googleapis'
import { sb, env, fetchAll, fetchBlacklist, OAUTH_REDIRECT } from './lib.mjs'
import { makeToken, leadId } from '../../lib/ktcMailToken.js'

const CAMPAIGN = 'coldmail-ktc-cv-sheet1002'
const SITE = (env.NEXT_PUBLIC_SITE_URL || 'https://salary-fyi.com').replace(/\/$/, '')
const RESEND_FROM = env.RESEND_FROM || 'FYI <hello@salary-fyi.com>'
const BUCKET = 'resumes', PREFIX = 'ktc-claim/sheet1002'
const IMPORTABLE = /^https:\/\/[a-z0-9]+\.supabase\.co\/storage\/v1\/object\/public\//
const DRIVE = /drive\.google\.com|docs\.google\.com/

const args = process.argv.slice(2)
const flag = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? (args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true) : d }
const doPrepare = args.includes('--prepare')
const doSend = args.includes('--send')
const testTo = flag('test', null)
const max = parseInt(flag('max', '0')) || 0
const workers = parseInt(flag('workers', '4')) || 4
const lang = flag('lang', 'vi') === 'ko' ? 'ko' : 'vi' // ko 는 문구 검토용 테스트 발송 전용(실발송은 vi)
const TEMPLATE = new URL(`../ktc-claim-coldmail-${lang}.html`, import.meta.url)
const sleep = (ms) => new Promise(r => setTimeout(r, ms))
const esc = (s) => String(s || '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
const csvCell = (v) => { const s = String(v ?? ''); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s }
const norm = (e) => String(e || '').trim().toLowerCase()
const validEmail = (e) => /^[^@\s]+@[^@\s.]+\.[^@\s]+$/.test(e)
const tenOf = (name) => String(name || '').trim().split(/\s+/).pop() || 'bạn'

// ── 메일(원본 클레임 양식 그대로 — ktc-claim-coldmail.mjs 와 동일 렌더) ──
const template = readFileSync(TEMPLATE, 'utf8')
const subject = (l) => lang === 'ko'
  ? `${l.ten}님, 회원님의 ${l.position} 프로필이 FYI에 준비되어 있습니다`
  : `${l.ten} ơi, hồ sơ ${l.position} của bạn đã sẵn sàng trên FYI`
// "얼마 전" 금지 — 5~7월 지원자가 대부분이라 월 명시. 지원일이 없거나 미래(오입력)면 시점 언급 없이.
const monthFrag = (l) => {
  const m = l.appliedMonth
  if (!m) return lang === 'ko' ? '이전에 ' : 'Trước đây, '
  return lang === 'ko' ? `지난 ${m}월, ` : `Hồi tháng ${m}, `
}
const atCompanyHtml = (l) => l.company ? (lang === 'ko' ? ` <b>${esc(l.company)}</b>` : ` tại <b>${esc(l.company)}</b>`) : ''
const cardRowStyle = 'font-size:14px;color:#4E5968;line-height:1.7;'
const cardRows = (l) => {
  const rows = []
  if (l.university) rows.push(`<div style="${cardRowStyle}">🎓 ${esc(l.university)}</div>`)
  const yoe = parseFloat(l.yoe)
  const yoeTail = Number.isFinite(yoe) && yoe >= 1 ? (lang === 'ko' ? ` · 경력 ${yoe}년` : ` · ${yoe} năm kinh nghiệm`) : ''
  rows.push(`<div style="${cardRowStyle}">💼 ${esc(l.position)}${yoeTail}</div>`)
  if (l.skills?.length) rows.push(`<div style="${cardRowStyle}">🛠 ${esc(l.skills.slice(0, 5).join(' · '))}</div>`)
  return rows.join('\n          ')
}
const render = (l, cta, unsub) => template
  .replace(/\{\{name\}\}/g, esc(l.ten))
  .replace(/\{\{fullName\}\}/g, esc(l.name))
  .replace(/\{\{month\}\}/g, monthFrag(l))
  .replace(/\{\{jobTitle\}\}/g, esc(l.job))
  .replace(/\{\{atCompany\}\}/g, atCompanyHtml(l))
  .replace(/\{\{position\}\}/g, esc(l.position))
  .replace(/\{\{cardRows\}\}/g, cardRows(l))
  .replace(/\{\{ctaUrl\}\}/g, cta)
  .replace(/\{\{unsubscribeUrl\}\}/g, unsub)
const text = (l, cta, unsub) => lang === 'ko' ? `안녕하세요 ${l.ten}님,

${monthFrag(l)}K-Tech College를 통해 ${l.company ? `${l.company}의 ` : ''}${l.job} 포지션에 지원해 주셨죠.

그때 제출하신 이력서로, K-Tech College가 만든 채용 플랫폼 FYI에 회원님의 프로필을 미리 만들어 두었습니다.

이력서를 다시 작성하실 필요 없습니다. 구글 로그인 한 번이면 프로필이 바로 등록되고, 새로운 공고에 원클릭으로 지원할 수 있습니다.

맞는 포지션이 열리면 저희가 기업 채용 담당자에게 프로필을 바로 전달해 드립니다.

내 프로필 확인하기:
${cta}

— FYI 팀 · salary-fyi.com
수신 거부: ${unsub}` : `Chào ${l.ten},

${monthFrag(l)}bạn đã ứng tuyển vị trí ${l.job}${l.company ? ` tại ${l.company}` : ''} qua K-Tech College.

Với CV bạn đã nộp khi đó, chúng tôi đã chuẩn bị sẵn hồ sơ của bạn trên FYI — nền tảng tuyển dụng do K-Tech College xây dựng.

Bạn không cần viết lại CV. Chỉ cần đăng nhập Google một lần, hồ sơ sẽ được đăng ký ngay và bạn có thể ứng tuyển các vị trí mới chỉ với một chạm.

Khi có vị trí phù hợp, chúng tôi sẽ gửi hồ sơ của bạn trực tiếp đến nhà tuyển dụng — và bạn sẽ nhận được liên hệ qua email.

Nhận hồ sơ của tôi:
${cta}

— Đội ngũ FYI · salary-fyi.com
Hủy đăng ký: ${unsub}`

const ctaFor = (l) => `${SITE}/api/ktc/r?t=${encodeURIComponent(makeToken(l.email, CAMPAIGN))}&to=%2Fktc%2Fclaim`
const unsubFor = (l) => `${SITE}/api/ktc/unsub?t=${encodeURIComponent(makeToken(l.email, CAMPAIGN))}`

async function fetchAllKtc(client, build) {
  const out = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await build().range(from, from + 999)
    if (error) throw error
    out.push(...(data || [])); if (!data || data.length < 1000) break
  }
  return out
}

// ── CV 준비: Drive → 스토리지(+직링크는 파싱만) ──
const driveId = (u) => (String(u).match(/[?&]id=([\w-]+)/) || String(u).match(/\/d\/([\w-]+)/) || [])[1]
async function prepare(leads, claimBy) {
  const { parseResumeBuffer } = await import('../../lib/parseResume.js') // env 주입(lib.mjs) 뒤 로드
  // 이미 임포트 가능한 URL 로 파싱본이 있으면 스킵(8월 KTC 파싱본 포함) — 재실행 안전. 직링크(Drive 토큰 불필요)부터 처리.
  const targets = leads.filter(l => !(IMPORTABLE.test(claimBy.get(l.email)?.cv_url || '') && claimBy.get(l.email)?.summary?.full_name))
    .sort((a, b) => Number(IMPORTABLE.test(b.cvUrl)) - Number(IMPORTABLE.test(a.cvUrl)))
  const queue = max ? targets.slice(0, max) : targets
  let drive = null
  if (queue.some(l => !IMPORTABLE.test(l.cvUrl))) {
    if (!env.GDRIVE_REFRESH_TOKEN) throw new Error('GDRIVE_REFRESH_TOKEN 없음 — node scripts/outreach/auth.mjs --drive 먼저')
    const auth = new google.auth.OAuth2(env.GMAIL_CLIENT_ID, env.GMAIL_CLIENT_SECRET, OAUTH_REDIRECT)
    auth.setCredentials({ refresh_token: env.GDRIVE_REFRESH_TOKEN })
    drive = google.drive({ version: 'v3', auth })
  }
  console.log(`준비 대상 ${queue.length}명 (기준비 ${leads.length - targets.length}, 직링크 ${queue.filter(l => IMPORTABLE.test(l.cvUrl)).length} · Drive ${queue.filter(l => !IMPORTABLE.test(l.cvUrl)).length}) | 워커 ${workers}`)
  let ok = 0, done = 0; const fails = []
  const one = async (l) => {
    let buf, cvUrl
    if (IMPORTABLE.test(l.cvUrl)) {
      const r = await fetch(l.cvUrl); if (!r.ok) throw new Error(`fetch ${r.status}`)
      buf = Buffer.from(await r.arrayBuffer()); cvUrl = l.cvUrl
    } else {
      const id = driveId(l.cvUrl); if (!id) throw new Error('drive id 없음')
      const r = await drive.files.get({ fileId: id, alt: 'media', supportsAllDrives: true }, { responseType: 'arraybuffer' })
      buf = Buffer.from(r.data)
      const isPdf = buf.subarray(0, 1024).indexOf('%PDF-') !== -1, isZip = buf.subarray(0, 2).toString('latin1') === 'PK'
      if (!isPdf && !isZip) throw new Error(`CV 아님(${String(r.headers?.['content-type'] || '').slice(0, 40)}, ${buf.length}B)`)
      const ext = isPdf ? 'pdf' : 'docx'
      const type = isPdf ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      const path = `${PREFIX}/${l.lead}.${ext}` // 해시 파일명 — PII 없음
      const { error: upErr } = await sb.storage.from(BUCKET).upload(path, buf, { contentType: type, upsert: true })
      if (upErr) throw new Error(`upload: ${upErr.message}`)
      cvUrl = sb.storage.from(BUCKET).getPublicUrl(path).data.publicUrl
    }
    const summary = await parseResumeBuffer(buf, l.name)
    const { error } = await sb.from('ktc_claim_profiles').upsert({ email: l.email, summary, cv_url: cvUrl, parsed_at: new Date().toISOString() }, { onConflict: 'email' })
    if (error) throw new Error(`db: ${error.message}`)
    return `${summary.full_name} · ${summary.university || '(대학 없음)'} · ${summary.headline || ''}`
  }
  let idx = 0
  await Promise.all(Array.from({ length: workers }, async () => {
    while (idx < queue.length) {
      const l = queue[idx++]
      try { const s = await one(l); ok++; console.log(`  ✓ [${++done}/${queue.length}] ${l.email} | ${s}`) }
      catch (e) { fails.push(`${l.email}: ${e.message}`); console.log(`  ✗ [${++done}/${queue.length}] ${l.email}: ${e.message}`) }
      await sleep(200)
    }
  }))
  console.log(`\n✅ 준비 완료: 성공 ${ok} / 실패 ${fails.length}`)
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  writeFileSync(new URL(`../../data/ktc-sheet-claim-prepare-fails-${stamp}.txt`, import.meta.url), fails.join('\n'))
  if (fails.length) console.log(`  실패 목록: data/ktc-sheet-claim-prepare-fails-${stamp}.txt`)
}

;(async () => {
  if (testTo) {
    const { Resend } = await import('resend'); const resend = new Resend(env.RESEND_API_KEY)
    const l = { email: testTo, ten: 'Tây', name: 'TRƯƠNG ĐỨC NHẬT TÂY', job: 'Full-stack Developer', company: 'NALDA', position: 'Full-stack Developer',
      university: 'Đại học Bách Khoa Hà Nội', yoe: '2', appliedMonth: 6, skills: ['React', 'Node.js', 'TypeScript', 'PostgreSQL', 'Docker'] }
    const cta = ctaFor(l), unsub = unsubFor(l)
    const r = await resend.emails.send({ from: RESEND_FROM, to: testTo, subject: `[TEST/${lang}] ` + subject(l), text: text(l, cta, unsub), html: render(l, cta, unsub) })
    if (r.error) throw new Error(r.error.message)
    console.log(`✅ 테스트 발송 → ${testTo} | id=${r.data?.id}\n제목: ${subject(l)}\nCTA: ${cta}`)
    return
  }

  // ── 리드: ktc-support candidates 전량 → 사람 단위(최신 지원 행이 카드, CV 는 직링크 우선·없으면 Drive) ──
  if (!env.KTC_SUPABASE_URL || !env.KTC_SUPABASE_SERVICE_ROLE_KEY) throw new Error('KTC_SUPABASE_URL / KTC_SUPABASE_SERVICE_ROLE_KEY 필요(.env.local)')
  const ktc = createClient(env.KTC_SUPABASE_URL, env.KTC_SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
  const rows = await fetchAllKtc(ktc, () => ktc.from('candidates')
    .select('email, full_name, university, position, yoe, cv_url, applied_date, applied_job, applied_company, created_at')
    .order('created_at', { ascending: true }))
  const people = new Map()
  for (const r of rows) {
    const email = norm(r.email); if (!validEmail(email)) continue
    const p = people.get(email) || { email, lead: leadId(email), cvDirect: '', cvDrive: '', latest: null }
    const u = (r.cv_url || '').trim()
    if (IMPORTABLE.test(u) && !p.cvDirect) p.cvDirect = u
    if (DRIVE.test(u)) p.cvDrive = u // 최신 행이 덮어씀(가장 최근 CV)
    p.latest = r // created_at 오름차순이라 마지막이 최신
    people.set(email, p)
  }
  const nowYm = new Date().toISOString().slice(0, 7)
  let leads = [...people.values()].map(p => {
    const r = p.latest
    const ap = String(r.applied_date || r.created_at || '').slice(0, 10)
    return {
      email: p.email, lead: p.lead, cvUrl: p.cvDirect || p.cvDrive,
      name: (r.full_name || '').trim(), ten: tenOf(r.full_name),
      company: (r.applied_company || '').trim(), job: (r.applied_job || '').replace(/^(?:[A-Z]{2,6}\d{3,4}|[RVK]\d{1,4})(#\d+)?\s*[-–:]\s*/, '').trim(),
      position: (r.position || '').trim(), university: (r.university || '').trim(), yoe: (r.yoe || '').toString().trim(),
      appliedMonth: ap && ap.slice(0, 7) <= nowYm ? parseInt(ap.slice(5, 7), 10) : null,
    }
  })
  const total = leads.length

  // ── 제외: FYI 가입 · 우리 콜드메일 접촉 이력(coldmail-ktc* 전부 — 미접촉 풀만) · 수신거부 · 블랙리스트 ──
  const profs = await fetchAll(() => sb.from('user_profiles').select('email').not('email', 'is', null))
  const members = new Set(profs.map(p => norm(p.email)))
  const evts = await fetchAll(() => sb.from('events').select('event, meta').in('event', ['coldmail_public_sent', 'coldmail_unsub']))
  const touched = new Set(evts.filter(e => e.event === 'coldmail_public_sent' && /^coldmail-ktc/.test(e.meta?.campaign || '') && e.meta?.lead).map(e => e.meta.lead))
  const unsub = new Set(evts.filter(e => e.event === 'coldmail_unsub' && e.meta?.lead).map(e => e.meta.lead))
  const bl = await fetchBlacklist()
  const nMember = leads.filter(l => members.has(l.email)).length
  leads = leads.filter(l => !members.has(l.email))
  const nTouched = leads.filter(l => touched.has(l.lead)).length
  leads = leads.filter(l => !touched.has(l.lead))
  const nUnsub = leads.filter(l => unsub.has(l.lead) || bl.has(l)).length
  leads = leads.filter(l => !unsub.has(l.lead) && !bl.has(l))
  const nNoCv = leads.filter(l => !l.cvUrl).length
  leads = leads.filter(l => l.cvUrl)
  console.log(`캠페인: ${CAMPAIGN} | 랜딩: /ktc/claim`)
  console.log(`시트 ${total}명 | 제외: FYI가입 ${nMember} · 기접촉 ${nTouched} · 수신거부/블랙 ${nUnsub} · CV 없음/외부 ${nNoCv} → ${leads.length}명 (직링크 ${leads.filter(l => IMPORTABLE.test(l.cvUrl)).length} · Drive ${leads.filter(l => !IMPORTABLE.test(l.cvUrl)).length})`)

  const claims = []
  for (let i = 0; i < leads.length; i += 300) {
    const { data, error } = await sb.from('ktc_claim_profiles').select('email, summary, cv_url').in('email', leads.slice(i, i + 300).map(l => l.email))
    if (error) throw error; claims.push(...(data || []))
  }
  const claimBy = new Map(claims.map(c => [c.email, c]))

  if (doPrepare) return prepare(leads, claimBy)

  // 카드: 시트 값 우선, 비면 파싱본. 발송 조건 = 임포트 가능한 CV(우리 스토리지/ktc-cvs) + 이름.
  for (const l of leads) {
    const c = claimBy.get(l.email); const p = c?.summary || {}
    l.cvUrl = IMPORTABLE.test(c?.cv_url || '') ? c.cv_url : (IMPORTABLE.test(l.cvUrl) ? l.cvUrl : '')
    l.name = l.name || (p.full_name || '').trim(); l.ten = tenOf(l.name)
    l.university = l.university || (p.university || '').trim()
    l.skills = Array.isArray(p.skills) ? p.skills : []
    l.position = l.position || (p.headline || '').trim() || l.job
    l.job = l.job || l.position
    l.parsed = !!p.full_name
  }
  const ready = leads.filter(l => l.cvUrl && l.name && l.position)
  const unprepared = leads.length - ready.length
  console.log(`발송 가능 ${ready.length} (파싱 완료 ${ready.filter(l => l.parsed).length} · 시트 카드만 ${ready.filter(l => !l.parsed).length}) | 미준비 ${unprepared} = --prepare 필요`)
  const capped = max ? ready.slice(0, max) : ready
  if (!capped.length) { console.log('보낼 대상 없음.'); return }

  const mxOk = new Map()
  await Promise.all([...new Set(capped.map(l => l.email.split('@')[1]))].map(async d => { try { mxOk.set(d, (await resolveMx(d)).length > 0) } catch { mxOk.set(d, false) } }))
  const queue = capped.filter(l => mxOk.get(l.email.split('@')[1]))
  if (queue.length < capped.length) console.log(`MX 없음 제외 ${capped.length - queue.length}`)

  const s = queue[0]
  const months = {}; for (const l of queue) months[l.appliedMonth || '없음'] = (months[l.appliedMonth || '없음'] || 0) + 1
  console.log(`\n이번 발송 ${queue.length}명 | 지원월 ${JSON.stringify(months)} | 대학 표기 ${queue.filter(l => l.university).length}`)
  console.log(`샘플: ${s.email} / ${s.ten} / ${s.position} / ${s.university || '(대학 없음)'} / ${s.company} · ${s.job} / 스킬 ${s.skills.slice(0, 3).join(',')}`)
  console.log(`제목: ${subject(s)}\nCTA: ${ctaFor(s)}`)
  if (!doSend) { console.log('\n[dry-run] --send 로 실발송.'); return }
  if (lang !== 'vi') throw new Error('실발송은 vi 고정 — --lang ko 는 --test 전용')

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
      // PII 는 events 에 안 남긴다 — 사람 식별은 lead 해시. cv_url 은 가입 콜백 임포트 소스(해시 파일명 공개 링크).
      await sb.from('events').insert([{ event: 'coldmail_public_sent', page: '/campaign/ktc',
        meta: { campaign: CAMPAIGN, lead: l.lead, lang: 'vi', cv_url: l.cvUrl, resend_id: resp.data?.id || null } }])
      log.push([l.email, l.ten, l.company, l.position, l.lead, resp.data?.id || '', ''].map(csvCell).join(',')); ok++
    } catch (e) { fail++; log.push([l.email, l.ten, l.company, l.position, l.lead, '', e.message].map(csvCell).join(',')); console.error(`  ✗ ${l.email}: ${e.message}`) }
    await sleep(600)
  }
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  writeFileSync(new URL(`../../data/ktc-sheet-claim-sent-${stamp}.csv`, import.meta.url), log.join('\n'))
  console.log(`\n✅ 발송 완료: 성공 ${ok} / 실패 ${fail} | 로그: data/ktc-sheet-claim-sent-${stamp}.csv`)
  if (ready.length > queue.length) console.log(`   남은 ${ready.length - queue.length}명은 같은 명령을 다시 실행하면 이어서 발송됨.`)
})().catch(e => { console.error(e); process.exit(1) })
