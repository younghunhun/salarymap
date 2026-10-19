import { google } from 'googleapis'
import { env } from '../outreach/lib.mjs'
const auth = new google.auth.GoogleAuth({ credentials: { client_email: env.GOOGLE_SERVICE_ACCOUNT_EMAIL, private_key: (env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n') }, scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'] })
const sheets = google.sheets({ version: 'v4', auth })
const ID = '1mR1_-a3LmjxAbbox3tTKBu6WYwDbfBYKmPB6TP9EnKI'
const meta = await sheets.spreadsheets.get({ spreadsheetId: ID })
const tabs = meta.data.sheets.map(s => s.properties.title); console.log('tabs:', tabs.join(' | '))
// 공고/JD 마스터로 보이는 탭에서 헤더에 TO/인원/Số lượng/headcount 컬럼 찾기
for (const t of tabs) {
  const r = await sheets.spreadsheets.values.get({ spreadsheetId: ID, range: `'${t}'!A1:AZ3` }).catch(() => null); const h = r?.data.values?.[0] || []
  const hit = h.map((x, i) => [x, i]).filter(([x]) => /\bTO\b|인원|số lượng|headcount|quantity|slot|openings|vacanc/i.test(String(x)))
  if (hit.length) console.log(`\n[${t}] headers=${h.length} TO후보 컬럼:`, JSON.stringify(hit), '\n  header:', h.slice(0, 30).join(' | '))
}
