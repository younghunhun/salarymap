import { google } from 'googleapis'
import { env } from '/Users/wiseungju/salarymap/scripts/outreach/lib.mjs'
const auth = new google.auth.GoogleAuth({
  credentials: { client_email: env.GOOGLE_SERVICE_ACCOUNT_EMAIL, private_key: (env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n') },
  scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
})
const sheets = google.sheets({ version: 'v4', auth })
const meta = await sheets.spreadsheets.get({ spreadsheetId: '1mR1_-a3LmjxAbbox3tTKBu6WYwDbfBYKmPB6TP9EnKI' })
for (const s of meta.data.sheets) {
  console.log(`- "${s.properties.title}" (rows=${s.properties.gridProperties.rowCount}, cols=${s.properties.gridProperties.columnCount}, hidden=${!!s.properties.hidden})`)
}
