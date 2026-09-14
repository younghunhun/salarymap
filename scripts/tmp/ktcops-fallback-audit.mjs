// 읽기 전용 — Staffing-Master 기준 재판정:
// 활성 = Ops(Matching Status) 상태='진행중' ∪ (Ops에 행이 없는 JD EXECUTION 'In Progress')
// 이 스크립트는 폴백 집합(Ops에 없는 활성 공고)을 찾아 SLA 판정한다.
import { google } from 'googleapis'
import { sb, env, fetchAll } from '/Users/wiseungju/salarymap/scripts/outreach/lib.mjs'

const auth = new google.auth.GoogleAuth({
  credentials: { client_email: env.GOOGLE_SERVICE_ACCOUNT_EMAIL, private_key: (env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n') },
  scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
})
const sheets = google.sheets({ version: 'v4', auth })
const OPS_ID = '1opr9KoR7KRZ31CJDNGM63xbA2rPZjPuNaG6eeLPTXjM'
const MASTER_ID = '1mR1_-a3LmjxAbbox3tTKBu6WYwDbfBYKmPB6TP9EnKI'

const [opsRes, jdRes, cands] = await Promise.all([
  sheets.spreadsheets.values.get({ spreadsheetId: OPS_ID, range: "'Matching Status'!A14:BB" }),
  sheets.spreadsheets.values.get({ spreadsheetId: MASTER_ID, range: "'JD EXECUTION'!A4:L" }),
  fetchAll(() => sb.from('ktc_candidates').select('job_code,applied_company,applied_at,pipeline_status').order('id')),
])

const col = (row, l) => { let n = 0; for (const ch of l) n = n * 26 + (ch.charCodeAt(0) - 64); return String(row[n - 1] || '').trim() }
const norm = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').normalize('NFC')
  .replace(/주식회사|\(주\)|co\.?,?\s*ltd\.?|company|corp\.?|\.|\s+/g, '').trim()

// Ops 전 행(상태 무관): 코드/회사 대조용
const opsRows = (opsRes.data.values || []).filter(r => col(r, 'F') && col(r, 'F') !== '테스트')
const opsExecCodes = new Set(opsRows.map(r => col(r, 'H').toUpperCase()).filter(Boolean))
const opsFCodes = new Set(opsRows.map(r => col(r, 'F').toUpperCase()))
const opsCompanies = new Set(opsRows.map(r => norm(col(r, 'I'))).filter(Boolean))

// JD EXECUTION 활성 행
const jdRows = (jdRes.data.values || []).filter(r => (r[0] || '').trim())
const active = jdRows.map(r => ({
  code: r[0].trim().toUpperCase(), company: (r[2] || '').trim(), title: (r[3] || '').trim(),
  dateReceived: (r[8] || '').trim(), status: (r[10] || '').trim(),
})).filter(x => /in progress/i.test(x.status))
console.log(`JD EXECUTION 활성(In Progress): ${active.length}건`)

// Ops 매칭: H실행코드 > F코드(R코드 제외=오조인 방어, V/K는 허용) > 회사명
const isRStyle = (c) => /^R\d+$/.test(c)
const fallback = []
for (const x of active) {
  const hitH = opsExecCodes.has(x.code)
  const hitF = !isRStyle(x.code) && opsFCodes.has(x.code)
  const hitComp = opsCompanies.has(norm(x.company))
  if (!hitH && !hitF && !hitComp) fallback.push(x)
}
console.log(`Ops에 대응 행이 전혀 없는 폴백 공고: ${fallback.length}건\n`)

const parseDate = (s) => {
  if (!s) return null
  let m = s.match(/(\d{4})[.\-\/](\d{1,2})[.\-\/](\d{1,2})/)
  if (m) return new Date(+m[1], +m[2] - 1, +m[3])
  m = s.match(/^(\d{1,2})[\/.](\d{1,2})$/)
  if (m) return new Date(2026, +m[1] - 1, +m[2])
  return null
}
const TODAY = new Date(2026, 8, 14)
const bizDaysSince = (d) => {
  if (!d) return null
  let cur = new Date(d), n = 0
  while (cur < TODAY) {
    cur = new Date(cur.getTime() + 86400000)
    const dow = cur.getDay()
    if (dow !== 0 && dow !== 6) n++
  }
  return n
}

const PASS = new Set(['passed', 'ready_to_forward', 'sent_to_company', 'interviewing', 'final_passed'])
const candByCode = {}
const candByComp = {}
for (const c of cands) {
  const k = (c.job_code || '').toUpperCase()
  if (k) (candByCode[k] ||= []).push(c)
  const ck = norm(c.applied_company)
  if (ck) (candByComp[ck] ||= []).push(c)
}

for (const x of fallback) {
  let pool = candByCode[x.code] || []
  let via = pool.length ? '코드' : ''
  if (!pool.length) {
    const nk = norm(x.company)
    const hits = Object.keys(candByComp).filter(k => k === nk || (nk.length >= 3 && (k.startsWith(nk) || nk.startsWith(k))))
    for (const h of hits) pool = pool.concat(candByComp[h])
    via = pool.length ? '회사명' : '기록없음'
  }
  const pass = pool.filter(c => PASS.has(c.pipeline_status)).length
  const d = parseDate(x.dateReceived)
  const bd = bizDaysSince(d)
  console.log([
    x.code.padEnd(10), x.company.slice(0, 20).padEnd(22), x.title.slice(0, 34).padEnd(36),
    `접수 ${x.dateReceived || '?'}(${bd ?? '?'}영업일)`.padEnd(22),
    `지원 ${pool.length}`.padEnd(8), `합격 ${pass}`.padEnd(8), via,
    (bd === null || bd > 3) && pass === 0 ? '⚠️소싱위반' : '',
  ].join(' '))
}
