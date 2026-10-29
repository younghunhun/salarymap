// KTC 시트에서 11/19 Matching Week 관련 탭·행 찾기. 읽기 전용.
import { google } from 'googleapis'
import { env } from '../outreach/lib.mjs'
const auth = new google.auth.GoogleAuth({ credentials: { client_email: env.GOOGLE_SERVICE_ACCOUNT_EMAIL, private_key: (env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n') }, scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'] })
const sheets = google.sheets({ version: 'v4', auth })
const ID = '1mR1_-a3LmjxAbbox3tTKBu6WYwDbfBYKmPB6TP9EnKI'
const meta = await sheets.spreadsheets.get({ spreadsheetId: ID })
console.log('tabs:', meta.data.sheets.map(s => s.properties.title).join(' / '))
const r = await sheets.spreadsheets.values.get({ spreadsheetId: ID, range: `'JD EXECUTION'!A1:AZ600` }); const v = r.data.values || []
console.log('H2:', (v[2]||[]).map((x,i)=>i+':'+x).join(' | '))
const rows = v.filter(row => /matching|MW|19\/11|11\/19|november|HCM event|offline/i.test(row.join(' ')))
console.log('MW rows', rows.length); for (const row of rows) console.log('  ', row.slice(0, 30).map(x => String(x).slice(0, 30)).join(' | '))
