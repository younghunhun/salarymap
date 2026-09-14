// 읽기 전용 — KTC Ops 퍼널 SLA 감사: 소싱 3영업일 / 인터뷰 완료 5영업일 (리드발생 기준)
import { google } from 'googleapis'
import { env } from '/Users/wiseungju/salarymap/scripts/outreach/lib.mjs'
const auth = new google.auth.GoogleAuth({
  credentials: { client_email: env.GOOGLE_SERVICE_ACCOUNT_EMAIL, private_key: (env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n') },
  scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
})
const sheets = google.sheets({ version: 'v4', auth })
const ID = '1opr9KoR7KRZ31CJDNGM63xbA2rPZjPuNaG6eeLPTXjM'
const r = await sheets.spreadsheets.values.get({ spreadsheetId: ID, range: "'Matching Status'!A13:BB" })
const rows = (r.data.values || []).slice(1)
const col = (row, letter) => {
  let n = 0
  for (const ch of letter) n = n * 26 + (ch.charCodeAt(0) - 64)
  return String(row[n - 1] || '').trim()
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
function bizDaysSince(d) {
  if (!d) return null
  let cur = new Date(d), count = 0
  while (cur < TODAY) {
    cur = new Date(cur.getTime() + 86400000)
    const dow = cur.getDay()
    if (dow !== 0 && dow !== 6) count++
  }
  return count
}
const fmt = (d) => d ? `${d.getMonth() + 1}/${d.getDate()}` : '-'

const data = rows.map((row, i) => ({
  rowNum: i + 14,
  status: col(row, 'A'), category: col(row, 'B'), funnel: col(row, 'E'),
  code: col(row, 'F'), to: col(row, 'G'), company: col(row, 'I'),
  position: col(row, 'V') || col(row, 'U'),
  dLead: parseDate(col(row, 'AS')), dSourcing: parseDate(col(row, 'AT')),
  dRecommend: parseDate(col(row, 'AU')), dInterviewDone: parseDate(col(row, 'AW')),
})).filter(x => x.code && x.code !== '테스트' && x.status === '진행중')

const stageNum = (f) => parseInt((f.match(/^(\d+)/) || [])[1]) || 0

// JD 코드 단위로 묶기 (TO 행 중복 제거) — 같은 코드는 퍼널/날짜 동일 전제, 최솟값 사용
const byCode = {}
for (const x of data) {
  const k = x.code
  if (!byCode[k]) byCode[k] = { ...x, toCount: 0 }
  byCode[k].toCount++
  // 단계가 더 높은 행이 있으면 그걸 대표로 (날짜도 채워진 쪽 우선)
  if (stageNum(x.funnel) > stageNum(byCode[k].funnel)) byCode[k] = { ...x, toCount: byCode[k].toCount }
  for (const f of ['dLead', 'dSourcing', 'dRecommend', 'dInterviewDone']) if (!byCode[k][f] && x[f]) byCode[k][f] = x[f]
}
const jds = Object.values(byCode)
console.log(`진행중 JD(코드 단위): ${jds.length}건 (행 단위 ${data.length})\n`)

const line = (x, bd) => [
  x.category.padEnd(6), x.code.padEnd(5), `TO${x.toCount}`.padEnd(4),
  x.company.slice(0, 20).padEnd(22), (x.position || '').slice(0, 26).padEnd(28),
  x.funnel.replace(/\n/g, ' ').padEnd(14),
  `리드 ${fmt(x.dLead)}`.padEnd(10), `추천 ${fmt(x.dRecommend)}`.padEnd(10),
  bd === null ? '리드일없음' : `${bd}영업일 경과`,
].join(' ')

for (const cat of ['VN', 'KR', 'Remote']) {
  const pool = jds.filter(x => x.category === cat)
  console.log(`\n########## ${cat} 파트 (진행중 ${pool.length}건) ##########`)

  console.log('\n[A] 소싱 미완(추천 전) + 리드 후 3영업일 초과:')
  for (const x of pool) {
    const sourced = stageNum(x.funnel) >= 3 || x.dRecommend
    if (sourced) continue
    const bd = bizDaysSince(x.dLead)
    if (bd === null || bd > 3) console.log('  ' + line(x, bd))
  }

  console.log('\n[B] 인터뷰 미완 + 리드 후 5영업일 초과 (소싱은 완료된 건 포함):')
  for (const x of pool) {
    const done = stageNum(x.funnel) >= 5 || x.dInterviewDone
    if (done) continue
    const bd = bizDaysSince(x.dLead)
    if (bd !== null && bd > 5) console.log('  ' + line(x, bd))
  }
}
