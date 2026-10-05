import { google } from 'googleapis'
import { env, OAUTH_REDIRECT } from '/Users/wiseungju/salarymap/scripts/outreach/lib.mjs'

const IDS = [
  ['S1', '1tSgcxhJDwNpY9vR_uKFkijMfMLmPWHfpcAhyQ5-rWKs', 0],
  ['S2', '13pvv1vQ8PklkIjOfuILD5sbKZJu0CRkiaXRXxUTOp88', 1583766935],
]
const sa = new google.auth.GoogleAuth({
  credentials: { client_email: env.GOOGLE_SERVICE_ACCOUNT_EMAIL, private_key: (env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n') },
  scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
})
const oa = new google.auth.OAuth2(env.GMAIL_CLIENT_ID, env.GMAIL_CLIENT_SECRET, OAUTH_REDIRECT)
oa.setCredentials({ refresh_token: env.GDRIVE_REFRESH_TOKEN || process.env.GDRIVE_REFRESH_TOKEN })

for (const [label, id, gid] of IDS) {
  for (const [an, auth] of [['SA', sa], ['OAuth', oa]]) {
    try {
      const sheets = google.sheets({ version: 'v4', auth })
      const m = await sheets.spreadsheets.get({ spreadsheetId: id, fields: 'properties.title,sheets.properties' })
      console.log(`[${label}/${an}] ${m.data.properties.title}`)
      const tabs = m.data.sheets.map(s => s.properties)
      for (const t of tabs) console.log(`   tab gid=${t.sheetId} "${t.title}" rows=${t.gridProperties?.rowCount} cols=${t.gridProperties?.columnCount}`)
      const target = tabs.find(t => t.sheetId === gid) || tabs[0]
      const r = await sheets.spreadsheets.values.get({ spreadsheetId: id, range: `'${target.title}'!1:3` })
      console.log(`   target "${target.title}" header:`, JSON.stringify(r.data.values?.[0]?.slice(0, 60)))
      console.log(`   row2:`, JSON.stringify(r.data.values?.[1]?.slice(0, 60)))
      break
    } catch (e) {
      console.log(`[${label}/${an}] FAIL ${e.message.slice(0, 160)}`)
    }
  }
}
