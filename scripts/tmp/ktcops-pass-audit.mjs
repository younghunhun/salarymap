// 읽기 전용 — 합격자 수 기준 SLA 감사: 소싱 3영업일(서류합격 0명) / 인터뷰 5영업일
// 서류합격 정본 = ktc_candidates (passed 이상), 지원 수는 참고용
import { google } from 'googleapis'
import { sb, env, fetchAll } from '/Users/wiseungju/salarymap/scripts/outreach/lib.mjs'

const auth = new google.auth.GoogleAuth({
  credentials: { client_email: env.GOOGLE_SERVICE_ACCOUNT_EMAIL, private_key: (env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n') },
  scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
})
const sheets = google.sheets({ version: 'v4', auth })
const OPS_ID = '1opr9KoR7KRZ31CJDNGM63xbA2rPZjPuNaG6eeLPTXjM'
const MASTER_ID = '1mR1_-a3LmjxAbbox3tTKBu6WYwDbfBYKmPB6TP9EnKI'

const [opsRes, jdRes, cands, apps] = await Promise.all([
  sheets.spreadsheets.values.get({ spreadsheetId: OPS_ID, range: "'Matching Status'!A14:BB" }),
  sheets.spreadsheets.values.get({ spreadsheetId: MASTER_ID, range: "'JD EXECUTION'!A4:D" }),
  fetchAll(() => sb.from('ktc_candidates').select('job_code,pipeline_status').order('id')),
  fetchAll(() => sb.from('ktc_applications').select('job_code').order('id')),
])

const col = (row, l) => { let n = 0; for (const ch of l) n = n * 26 + (ch.charCodeAt(0) - 64); return String(row[n - 1] || '').trim() }
const norm = (s) => s.toLowerCase().replace(/주식회사|\(주\)|co\.?,?\s*ltd\.?|company|corp\.?|\s+/g, '').trim()

// 실행코드 → 회사 (JD EXECUTION)
const execCompany = {}
for (const r of (jdRes.data.values || [])) {
  const code = (r[0] || '').trim()
  if (code) execCompany[code.toUpperCase()] = (r[2] || '').trim()
}

// DB 집계: 실행코드별 지원/합격/인터뷰
const PASS = new Set(['passed', 'ready_to_forward', 'sent_to_company', 'interviewing', 'final_passed'])
const INT = new Set(['interviewing', 'final_passed'])
const candAgg = {}
for (const c of cands) {
  const k = (c.job_code || '').toUpperCase()
  if (!k) continue
  candAgg[k] ||= { total: 0, pass: 0, interview: 0 }
  candAgg[k].total++
  if (PASS.has(c.pipeline_status)) candAgg[k].pass++
  if (INT.has(c.pipeline_status)) candAgg[k].interview++
}
const appAgg = {}
for (const a of apps) {
  const k = (a.job_code || '').toUpperCase()
  if (k) appAgg[k] = (appAgg[k] || 0) + 1
}
// 회사명(정규화) → 실행코드들
const execByCompany = {}
for (const [code, comp] of Object.entries(execCompany)) {
  const nk = norm(comp)
  if (!nk) continue
  ;(execByCompany[nk] ||= []).push(code)
}

const parseDate = (s) => {
  if (!s) return null
  let m = s.match(/(\d{4})-(\d{1,2})-(\d{1,2})/)
  if (m) return new Date(+m[1], +m[2] - 1, +m[3])
  m = s.match(/^(\d{1,2})\/(\d{1,2})$/)
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
const fmt = (d) => d ? `${d.getMonth() + 1}/${d.getDate()}` : '-'

// ops 진행중 JD (코드 단위 dedup)
const rows = (opsRes.data.values || []).filter(r => col(r, 'A') === '진행중' && col(r, 'F') && col(r, 'F') !== '테스트')
const byCode = {}
for (const r of rows) {
  const k = col(r, 'F')
  const x = {
    code: k, execCode: col(r, 'H').toUpperCase(), category: col(r, 'B'), company: col(r, 'I'),
    position: col(r, 'V') || col(r, 'U'), funnel: col(r, 'E').replace(/\n/g, ' '),
    dLead: parseDate(col(r, 'AS')), dRecommend: parseDate(col(r, 'AU')), dIntDone: parseDate(col(r, 'AW')),
    toCount: 0,
  }
  if (!byCode[k]) byCode[k] = x
  byCode[k].toCount++
  for (const f of ['execCode', 'company', 'position']) if (!byCode[k][f] && x[f]) byCode[k][f] = x[f]
  for (const f of ['dLead', 'dRecommend', 'dIntDone']) if (!byCode[k][f] && x[f]) byCode[k][f] = x[f]
}
const jds = Object.values(byCode)

// 후보 데이터 연결: H코드 직결 > 회사명 매칭(해당 회사 실행코드 전체 합산)
for (const x of jds) {
  let codes = []
  let via = ''
  if (x.execCode && candAgg[x.execCode]) { codes = [x.execCode]; via = 'H코드' }
  else {
    const nk = norm(x.company)
    const found = execByCompany[nk] || []
    if (found.length) { codes = found; via = '회사명(' + found.join('+') + ')' }
  }
  x.apps = codes.reduce((s, c) => s + (appAgg[c] || 0), 0)
  x.candTotal = codes.reduce((s, c) => s + (candAgg[c]?.total || 0), 0)
  x.pass = codes.reduce((s, c) => s + (candAgg[c]?.pass || 0), 0)
  x.interview = codes.reduce((s, c) => s + (candAgg[c]?.interview || 0), 0)
  x.via = via || '매칭없음'
  x.bd = bizDaysSince(x.dLead)
}

const line = (x) => [
  x.code.padEnd(5), `TO${x.toCount}`.padEnd(4), x.company.slice(0, 18).padEnd(20),
  (x.position || '').slice(0, 22).padEnd(24),
  `리드 ${fmt(x.dLead)}(${x.bd ?? '?'}일)`.padEnd(15),
  `지원 ${x.apps}`.padEnd(7), `합격 ${x.pass}`.padEnd(7), `면접중+ ${x.interview}`.padEnd(8),
  x.funnel.padEnd(13), x.via,
].join(' ')

for (const cat of ['VN', 'KR', 'Remote']) {
  const pool = jds.filter(x => x.category === cat)
  console.log(`\n########## ${cat} (진행중 ${pool.length} JD) ##########`)
  console.log('\n[A] 소싱 SLA 위반: 리드 3영업일 초과 & 서류합격자 0명')
  for (const x of pool.sort((a, b) => (b.bd ?? 999) - (a.bd ?? 999))) {
    if ((x.bd === null || x.bd > 3) && x.pass === 0) console.log('  ' + line(x))
  }
  console.log('\n[a] 리드 3영업일 초과지만 합격자 있음 (소싱은 됨, 참고):')
  for (const x of pool) {
    if (x.bd !== null && x.bd > 3 && x.pass > 0) console.log('  ' + line(x))
  }
  console.log('\n[B] 인터뷰 SLA 위반: 리드 5영업일 초과 & 인터뷰 완료 신호 없음(시트 완료일도 없음)')
  for (const x of pool) {
    if (x.bd !== null && x.bd > 5 && !x.dIntDone && x.interview === 0) console.log('  ' + line(x))
  }
}

// 매칭 커버리지 요약
const noMatch = jds.filter(x => x.via === '매칭없음')
console.log(`\n=== 후보DB 연결 안 된 진행중 JD: ${noMatch.length}/${jds.length} ===`)
for (const x of noMatch) console.log('  ', x.category, x.code, x.company)
