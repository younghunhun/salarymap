import { google } from 'googleapis'
import { env } from '/Users/wiseungju/salarymap/scripts/outreach/lib.mjs'
const auth = new google.auth.GoogleAuth({
  credentials: { client_email: env.GOOGLE_SERVICE_ACCOUNT_EMAIL, private_key: (env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n') },
  scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
})
const sheets = google.sheets({ version: 'v4', auth })
const res = await sheets.spreadsheets.values.get({ spreadsheetId: '1opr9KoR7KRZ31CJDNGM63xbA2rPZjPuNaG6eeLPTXjM', range: "'Matching Status'!A12:BB14" })
const rows = res.data.values || []
const L = (n) => { let s = ''; n++; while (n > 0) { s = String.fromCharCode(65 + ((n - 1) % 26)) + s; n = Math.floor((n - 1) / 26) } return s }
for (let i = 0; i < Math.max(...rows.map((r) => r.length)); i++) {
  const vals = rows.map((r) => String(r[i] || '').replace(/\n/g, '␤').slice(0, 40))
  if (vals.some(Boolean)) console.log(L(i).padEnd(3), vals.join(' | '))
}
