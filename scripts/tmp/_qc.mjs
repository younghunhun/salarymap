import { google } from 'googleapis'
import { env } from '../outreach/lib.mjs'
const auth = new google.auth.GoogleAuth({ credentials: { client_email: env.GOOGLE_SERVICE_ACCOUNT_EMAIL, private_key: (env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n') }, scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'] })
const sheets = google.sheets({ version: 'v4', auth })
const ID = '1jkHaMY6CM4b-Y_VQlqwULVujqdFPsAhISRVl2TSqfNo'
const meta = await sheets.spreadsheets.get({ spreadsheetId: ID })
const tabs = meta.data.sheets.map(s => s.properties.title)
console.log('tabs:', tabs.join(' | '))
for (const t of tabs.filter(t => /papa|R22[67]/i.test(t)).concat(tabs.slice(0, 2))) {
  const r = await sheets.spreadsheets.values.get({ spreadsheetId: ID, range: `'${t}'!A1:Z40` }); const v = r.data.values || []
  console.log(`\n### ${t} rows=${v.length}`); for (const row of v.slice(0, 8)) console.log('  ', row.map(x => String(x).slice(0, 40)).join(' | '))
}
