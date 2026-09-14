// JD EXECUTION Job Status 어휘 + ktc-support FYI-JD Weekly 탭 구조 확인 (읽기 전용)
import { env } from '../outreach/lib.mjs'
import { google } from 'googleapis'
const auth = new google.auth.GoogleAuth({
  credentials: { client_email: env.GOOGLE_SERVICE_ACCOUNT_EMAIL, private_key: (env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n') },
  scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
})
const sheets = google.sheets({ version: 'v4', auth })

const jd = (await sheets.spreadsheets.values.get({ spreadsheetId: '1mR1_-a3LmjxAbbox3tTKBu6WYwDbfBYKmPB6TP9EnKI', range: "'JD EXECUTION'!A1:L" })).data.values || []
const vocab = new Map()
for (const r of jd) {
  const code = String(r[0] || '').trim()
  if (!/^[A-Z]{1,3}\d{1,4}$/.test(code)) continue
  const st = String(r[10] || '').trim() || '(빈값)'
  vocab.set(st, (vocab.get(st) || 0) + 1)
}
console.log('JD EXECUTION K열(Job Status) 어휘:', JSON.stringify([...vocab.entries()]))

const wk = (await sheets.spreadsheets.values.get({ spreadsheetId: env.GOOGLE_SHEET_ID, range: "'FYI-JD Weekly'!A1:Z8" })).data.values || []
console.log('\nFYI-JD Weekly 상위 8행:')
for (const r of wk) console.log('  ' + JSON.stringify(r))
