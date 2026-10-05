import { google } from 'googleapis'
import { env } from '/Users/wiseungju/salarymap/scripts/outreach/lib.mjs'
const sa = new google.auth.GoogleAuth({
  credentials: { client_email: env.GOOGLE_SERVICE_ACCOUNT_EMAIL, private_key: (env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n') },
  scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
})
const sheets = google.sheets({ version: 'v4', auth: sa })
const S2 = '13pvv1vQ8PklkIjOfuILD5sbKZJu0CRkiaXRXxUTOp88'
const m = await sheets.spreadsheets.get({ spreadsheetId: S2, fields: 'sheets.properties' })
for (const s of m.data.sheets) {
  const p = s.properties
  if (/log|FYI-JD/.test(p.title)) continue
  const r = await sheets.spreadsheets.values.get({ spreadsheetId: S2, range: `'${p.title}'!1:2` })
  const h = r.data.values?.[0] || []
  console.log(`\n## ${p.title} (gid ${p.sheetId}, rows ${p.gridProperties?.rowCount})`)
  console.log('H:', h.map((x, i) => `${i}:${x}`).join(' | ').slice(0, 900))
  console.log('R2:', (r.data.values?.[1] || []).map((x, i) => `${i}:${String(x).slice(0, 40)}`).join(' | ').slice(0, 700))
}
