import 'dotenv/config'
import { google } from 'googleapis'
const auth = new google.auth.GoogleAuth({ credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON || '{}'), scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'] })
const sheets = google.sheets({ version: 'v4', auth })
const sid = '1jkHaMY6CM4b-Y_VQlqwULVujqdFPsAhISRVl2TSqfNo'
const meta = await sheets.spreadsheets.get({ spreadsheetId: sid })
const tabs = meta.data.sheets.map(s => s.properties.title)
console.log(tabs.filter(t => /MNF|R23[12]/i.test(t)), tabs.length)
for (const t of tabs.filter(t => /MNF|R23[12]/i.test(t))) {
  const r = await sheets.spreadsheets.values.get({ spreadsheetId: sid, range: `'${t}'!A1:Z200` })
  for (const [i, row] of (r.data.values || []).entries()) if (i < 3 || /Nh[aâ]n|Duy Binh|Bao Hien|Minh Ho|pntnoah|Khang/i.test(row.join(' '))) console.log(t, i + 1, row.slice(0, 12).join(' | '))
}
