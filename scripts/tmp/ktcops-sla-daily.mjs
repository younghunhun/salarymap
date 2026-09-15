// 읽기 전용 — 리드타임 SLA 일일 점검 (영훈 지표 2종, 9/15 오너십 인수)
//   SLA1: 리드발생(AS) → 3영업일 내 CV 전달(AU=인재 추천 완)
//   SLA2: CV 전달(AU) → 5영업일 내 인터뷰 일정 확정(AV=인터뷰 대기, AW/AX 후속 단계면 충족 간주)
// 정본 = ops Matching Status 단계일자. DB(ktc_candidates)는 시트 지연 검증용 보조 신호.
//   node scripts/tmp/ktcops-sla-daily.mjs
import { google } from 'googleapis'
import { sb, env, fetchAll } from '/Users/wiseungju/salarymap/scripts/outreach/lib.mjs'

const auth = new google.auth.GoogleAuth({
  credentials: { client_email: env.GOOGLE_SERVICE_ACCOUNT_EMAIL, private_key: (env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n') },
  scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
})
const sheets = google.sheets({ version: 'v4', auth })
const OPS_ID = '1opr9KoR7KRZ31CJDNGM63xbA2rPZjPuNaG6eeLPTXjM'

const [opsRes, cands] = await Promise.all([
  sheets.spreadsheets.values.get({ spreadsheetId: OPS_ID, range: "'Matching Status'!A14:BB" }),
  fetchAll(() => sb.from('ktc_candidates').select('job_code,applied_company,applied_at,pipeline_status').order('id')),
])

const col = (row, l) => { let n = 0; for (const ch of l) n = n * 26 + (ch.charCodeAt(0) - 64); return String(row[n - 1] || '').trim() }
const norm = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').normalize('NFC')
  .replace(/주식회사|\(주\)|co\.?,?\s*ltd\.?|company|corp\.?|\.|\s+/g, '').trim()

const parseDate = (s) => {
  if (!s) return null
  let m = s.match(/(\d{4})[-./](\d{1,2})[-./](\d{1,2})/)
  if (m) return new Date(+m[1], +m[2] - 1, +m[3])
  m = s.match(/^(\d{1,2})[\/.](\d{1,2})$/)
  if (m) return new Date(2026, +m[1] - 1, +m[2])
  return null
}
const TODAY = new Date(2026, 8, 15)
const bizDays = (from, to = TODAY) => {
  if (!from) return null
  let cur = new Date(from), n = 0
  while (cur < to) {
    cur = new Date(cur.getTime() + 86400000)
    const dow = cur.getDay()
    if (dow !== 0 && dow !== 6) n++
  }
  return n
}
const fmt = (d) => (d ? `${d.getMonth() + 1}/${d.getDate()}` : '-')

// 진행중 JD (코드 단위, 단계일자는 TO행 중 첫 값)
const rows = (opsRes.data.values || []).filter((r) => col(r, 'A') === '진행중' && col(r, 'F') && col(r, 'F') !== '테스트')
const byCode = {}
for (const r of rows) {
  const k = col(r, 'F')
  byCode[k] ||= { code: k, execCode: '', category: col(r, 'B'), company: col(r, 'I'), position: '', toCount: 0,
    dLead: null, dPosted: null, dCv: null, dIntWait: null, dIntDone: null, dMatch: null }
  const x = byCode[k]
  x.toCount++
  if (!x.execCode && col(r, 'H')) x.execCode = col(r, 'H').toUpperCase()
  if (!x.position) x.position = col(r, 'V') || col(r, 'U')
  if (!x.dLead) x.dLead = parseDate(col(r, 'AS'))
  if (!x.dPosted) x.dPosted = parseDate(col(r, 'AT'))
  if (!x.dCv) x.dCv = parseDate(col(r, 'AU'))
  if (!x.dIntWait) x.dIntWait = parseDate(col(r, 'AV'))
  if (!x.dIntDone) x.dIntDone = parseDate(col(r, 'AW'))
  if (!x.dMatch) x.dMatch = parseDate(col(r, 'AX'))
}
const jds = Object.values(byCode)

// DB 보조 신호 (v2 매칭: 실행코드 직결 > 회사명 NFD, 회사명 매칭은 리드일 이후 지원만)
const PASS = new Set(['passed', 'ready_to_forward', 'sent_to_company', 'interviewing', 'final_passed'])
const candByCode = {}, candByComp = {}
for (const c of cands) {
  const k = (c.job_code || '').toUpperCase()
  if (k) (candByCode[k] ||= []).push(c)
  const ck = norm(c.applied_company)
  if (ck) (candByComp[ck] ||= []).push(c)
}
const compKeys = Object.keys(candByComp)
for (const x of jds) {
  let pool = x.execCode ? (candByCode[x.execCode] || []) : []
  if (!pool.length) {
    const nk = norm(x.company)
    if (nk.length >= 3) {
      const hits = compKeys.filter((k) => k === nk || k.startsWith(nk) || nk.startsWith(k))
      for (const h of hits) pool = pool.concat(candByComp[h])
      if (x.dLead) pool = pool.filter((c) => (c.applied_at || '') >= x.dLead.toISOString().slice(0, 10))
    }
  }
  x.dbPass = pool.filter((c) => PASS.has(c.pipeline_status)).length
  x.dbInt = pool.filter((c) => ['interviewing', 'final_passed'].includes(c.pipeline_status)).length
}

const line = (x) => [
  x.code.padEnd(6), x.company.slice(0, 18).padEnd(20), (x.position || '').slice(0, 20).padEnd(22),
  `리드 ${fmt(x.dLead)}`, `게재 ${fmt(x.dPosted)}`, `CV전달 ${fmt(x.dCv)}`, `면접확정 ${fmt(x.dIntWait)}`,
  `DB합격 ${x.dbPass}`,
].join(' ')

for (const cat of ['VN', 'KR', 'Remote']) {
  const pool = jds.filter((x) => x.category === cat)
  console.log(`\n########## ${cat} — 진행중 ${pool.length} JD ##########`)

  const noLead = pool.filter((x) => !x.dLead)
  console.log(`\n[!] 리드발생일 미기입 ${noLead.length}건 (SLA 판정 불가 — 기입 요청 대상):`)
  for (const x of noLead) console.log('   ' + line(x))

  const s1 = pool.filter((x) => x.dLead && !x.dCv && !x.dIntWait && !x.dIntDone && !x.dMatch && bizDays(x.dLead) > 3)
  console.log(`\n[SLA1 위반] 리드 3영업일 초과·CV 전달(추천 완) 미기록 ${s1.length}건:`)
  for (const x of s1.sort((a, b) => bizDays(b.dLead) - bizDays(a.dLead)))
    console.log(`   ${line(x)}  ← ${bizDays(x.dLead)}영업일 경과${x.dbPass ? ' ⚠️DB엔 합격 ' + x.dbPass + '명(시트 지연?)' : ''}`)

  const s2 = pool.filter((x) => x.dCv && !x.dIntWait && !x.dIntDone && !x.dMatch && bizDays(x.dCv) > 5)
  console.log(`\n[SLA2 위반] CV 전달 후 5영업일 초과·인터뷰 일정 미확정 ${s2.length}건:`)
  for (const x of s2.sort((a, b) => bizDays(b.dCv) - bizDays(a.dCv)))
    console.log(`   ${line(x)}  ← CV 후 ${bizDays(x.dCv)}영업일 경과${x.dbInt ? ' ⚠️DB엔 면접중 ' + x.dbInt + '명(시트 지연?)' : ''}`)

  const s1soon = pool.filter((x) => x.dLead && !x.dCv && !x.dIntWait && !x.dIntDone && !x.dMatch && bizDays(x.dLead) >= 2 && bizDays(x.dLead) <= 3)
  console.log(`\n[임박] 리드 2~3영업일째·CV 미전달 ${s1soon.length}건:`)
  for (const x of s1soon) console.log('   ' + line(x))

  const ok = pool.length - noLead.length - s1.length - s2.length - s1soon.length
  console.log(`\n[OK] ${ok}건`)
}
console.log(`\n기준일 ${fmt(TODAY)} · 진행중 총 ${jds.length} JD (Matching Status 상태열='진행중')`)
