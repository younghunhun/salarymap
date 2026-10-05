import { google } from 'googleapis'
import { env } from '/Users/wiseungju/salarymap/scripts/outreach/lib.mjs'
console.log('start', !!env.GOOGLE_SERVICE_ACCOUNT_EMAIL, !!env.GOOGLE_PRIVATE_KEY, !!env.GDRIVE_REFRESH_TOKEN)
const sa = new google.auth.GoogleAuth({
  credentials: { client_email: env.GOOGLE_SERVICE_ACCOUNT_EMAIL, private_key: (env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n') },
  scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
})
const sheets = google.sheets({ version: 'v4', auth: sa })
const t = setTimeout(() => { console.log('TIMEOUT 30s'); process.exit(2) }, 30000)
try {
  const m = await sheets.spreadsheets.get({ spreadsheetId: '13pvv1vQ8PklkIjOfuILD5sbKZJu0CRkiaXRXxUTOp88', fields: 'properties.title,sheets.properties' })
  console.log('S2 SA OK', m.data.properties.title, m.data.sheets.map(s => `${s.properties.sheetId}:${s.properties.title}`).join(' | '))
} catch (e) { console.log('S2 SA FAIL', e.message.slice(0, 200)) }
try {
  const m = await sheets.spreadsheets.get({ spreadsheetId: '1tSgcxhJDwNpY9vR_uKFkijMfMLmPWHfpcAhyQ5-rWKs', fields: 'properties.title,sheets.properties' })
  console.log('S1 SA OK', m.data.properties.title, m.data.sheets.map(s => `${s.properties.sheetId}:${s.properties.title}`).join(' | '))
} catch (e) { console.log('S1 SA FAIL', e.message.slice(0, 200)) }
clearTimeout(t)
