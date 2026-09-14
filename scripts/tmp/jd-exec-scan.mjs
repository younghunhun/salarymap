import { google } from 'googleapis'
import { env } from '/Users/wiseungju/salarymap/scripts/outreach/lib.mjs'
const auth = new google.auth.GoogleAuth({
  credentials: { client_email: env.GOOGLE_SERVICE_ACCOUNT_EMAIL, private_key: (env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n') },
  scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
})
const sheets = google.sheets({ version: 'v4', auth })
const r = await sheets.spreadsheets.values.get({ spreadsheetId: '1mR1_-a3LmjxAbbox3tTKBu6WYwDbfBYKmPB6TP9EnKI', range: "'JD EXECUTION'!A1:AF" })
const rows = r.data.values || []
console.log('총 행수:', rows.length)
// 헤더 3행 전체
for (let i = 0; i < 4; i++) console.log(`[헤더 ${i}]`, JSON.stringify(rows[i]))
// 파트/섹션 구분 행 탐색 (베트남, 한국, VN, KR, 퍼널 등 키워드)
for (let i = 0; i < rows.length; i++) {
  const joined = (rows[i] || []).join(' ')
  if (/베트남|한국|퍼널|VIETNAM|KOREA|파트/i.test(joined) && (rows[i] || []).filter(Boolean).length < 6) {
    console.log(`[섹션? 행${i}]`, JSON.stringify(rows[i]))
  }
}
