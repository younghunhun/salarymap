// 읽기 전용 — KTC 현황 노션 공유용 표 집계 (행=TO 단위, 오늘자)
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

console.log('상태(A) 전체 분포:')
const sm = {}
for (const r of rows) sm[col(r, 'A') || '(공란)'] = (sm[col(r, 'A') || '(공란)'] || 0) + 1
console.log(sm)

const CATS = ['Remote', 'VN', 'KR'] // 표 열 순서: 리모트/베트남/한국 현지
const byCat = (arr) => CATS.map((c) => arr.filter((r) => col(r, 'B') === c).length)
const line = (label, arr) => {
  const n = byCat(arr)
  console.log(`${label}\t${n[0]}\t${n[1]}\t${n[2]}\t${arr.length}`)
}
const stage = (arr, n) => arr.filter((r) => (col(r, 'E') || '').replace(/\s/g, '').startsWith(n + '.'))

const done = rows.filter((r) => col(r, 'A') === '완료')
const prog = rows.filter((r) => col(r, 'A') === '진행중')
const dropped = rows.filter((r) => !['완료', '진행중', ''].includes(col(r, 'A')))

console.log('\n항목\t리모트\t베트남\t한국\t합계')
line('KPI 달성(매칭 완료)', done)
line('매칭 진행 중', prog)
line('인터뷰 완료(5단계)', stage(prog, 5))
line('인터뷰 예정(4단계)', stage(prog, 4))
line('인터뷰 대상 심사(3단계)', stage(prog, 3))
line('지원자 모집 중(2단계)', stage(prog, 2))
line('지원자 모집 전 JD대기(1단계)', stage(prog, 1))
line('이탈(완료·진행중 외)', dropped)

console.log('\n인터뷰 예정일(AW) 원본값 — 4·5단계 진행중 행:')
for (const r of [...stage(prog, 5), ...stage(prog, 4)]) {
  console.log(` ${col(r, 'B')}\t${col(r, 'F')}\t${col(r, 'I').slice(0, 16)}\tAW="${col(r, 'AW')}"\tAV="${col(r, 'AV')}"`)
}
