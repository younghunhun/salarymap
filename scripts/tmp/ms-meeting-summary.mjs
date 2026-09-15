// 읽기 전용 — KTC Matching Meeting 공유용 집계 (행=TO 단위)
import { google } from 'googleapis'
import { env } from '/Users/wiseungju/salarymap/scripts/outreach/lib.mjs'
const auth = new google.auth.GoogleAuth({
  credentials: { client_email: env.GOOGLE_SERVICE_ACCOUNT_EMAIL, private_key: (env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n') },
  scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
})
const sheets = google.sheets({ version: 'v4', auth })
const res = await sheets.spreadsheets.values.get({ spreadsheetId: '1opr9KoR7KRZ31CJDNGM63xbA2rPZjPuNaG6eeLPTXjM', range: "'Matching Status'!A14:BB" })
const col = (r, l) => { let n = 0; for (const ch of l) n = n * 26 + (ch.charCodeAt(0) - 64); return String(r[n - 1] || '').trim() }
const rows = (res.data.values || []).filter((r) => col(r, 'F') && col(r, 'F') !== '테스트')

for (const cat of ['KR', 'VN', 'Remote']) {
  const all = rows.filter((r) => col(r, 'B') === cat)
  const done = all.filter((r) => col(r, 'A') === '완료')
  const prog = all.filter((r) => col(r, 'A') === '진행중')
  const stage = (n) => prog.filter((r) => (col(r, 'E') || '').replace(/\s/g, '').startsWith(n + '.'))
  const jd = (arr) => new Set(arr.map((r) => col(r, 'F'))).size
  console.log(`\n===== ${cat} =====`)
  console.log(`KPI 달성(완료): ${done.length}건 (JD ${jd(done)}개)`)
  console.log(`매칭 진행 중: ${prog.length}석 (JD ${jd(prog)}개)`)
  for (const [n, label] of [[5, '인터뷰 완료'], [4, '인터뷰 대기'], [3, '인터뷰 대상 심사'], [2, '인재 소싱 중'], [1, '리드 발생(모집 전)']]) {
    const s = stage(n)
    console.log(`  ${n}단계 ${label}: ${s.length}석 (JD ${jd(s)}개)`)
    if (n === 5 || n === 4) for (const r of s) console.log(`     ${col(r, 'F')} ${col(r, 'I').slice(0, 18)} | 예정일(AW)="${col(r, 'AW')}" 완료`, col(r, 'A'))
  }
  // 완료 최근 3건
  const recent = done.map((r) => ({ f: col(r, 'F'), i: col(r, 'I'), d: col(r, 'AX') })).slice(-4)
  if (done.length) console.log(`  완료 최근: ${recent.map((x) => `${x.f} ${x.i.slice(0, 10)}(${x.d.slice(5)})`).join(' · ')}`)
}
