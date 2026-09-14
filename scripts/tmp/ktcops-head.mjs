import { google } from 'googleapis'
import { env } from '/Users/wiseungju/salarymap/scripts/outreach/lib.mjs'
const auth = new google.auth.GoogleAuth({
  credentials: { client_email: env.GOOGLE_SERVICE_ACCOUNT_EMAIL, private_key: (env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n') },
  scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
})
const sheets = google.sheets({ version: 'v4', auth })
const ID = '1opr9KoR7KRZ31CJDNGM63xbA2rPZjPuNaG6eeLPTXjM'
const r = await sheets.spreadsheets.values.get({ spreadsheetId: ID, range: "'Matching Status'!A1:BP12" })
const rows = r.data.values || []
const colName = (n) => { let s = ''; n += 1; while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26) } return s }
rows.forEach((row, i) => {
  console.log(`--- 행 ${i + 1} ---`)
  row.forEach((v, c) => { if ((v || '').trim()) console.log(`  ${colName(c)}: ${JSON.stringify(v.slice(0, 80))}`) })
})
