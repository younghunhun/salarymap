import { google } from 'googleapis'
import { env } from '../outreach/lib.mjs'
const auth = new google.auth.GoogleAuth({ credentials: { client_email: env.GOOGLE_SERVICE_ACCOUNT_EMAIL, private_key: (env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n') }, scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'] })
const sheets = google.sheets({ version: 'v4', auth })
const ID = '1mR1_-a3LmjxAbbox3tTKBu6WYwDbfBYKmPB6TP9EnKI'
for (const t of ['JD EXECUTION', 'JOB BOARD', 'meta-ad-plan']) {
  const r = await sheets.spreadsheets.values.get({ spreadsheetId: ID, range: `'${t}'!A1:AZ400` }); const v = r.data.values || []
  console.log(`\n##### [${t}] rows=${v.length}`); for (let i = 0; i < Math.min(3, v.length); i++) console.log('  H'+i+':', v[i].slice(0, 40).join(' | '))
  const rows = v.filter(row => /da-sh|nstage|the han|first marketing|V2(2[2-9]|3\d|4[67])\b|V32\b/i.test(row.join(' ')))
  console.log('  대상 행', rows.length); for (const row of rows.slice(0, 40)) console.log('   ', row.slice(0, 30).map(x => String(x).slice(0, 28)).join(' | '))
}
