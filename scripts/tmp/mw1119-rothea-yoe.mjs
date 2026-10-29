// R228 JD EXECUTION 행 전체(YOE·특이요건). 읽기 전용.
import { google } from 'googleapis'
import { env } from '../outreach/lib.mjs'
const auth = new google.auth.GoogleAuth({ credentials: { client_email: env.GOOGLE_SERVICE_ACCOUNT_EMAIL, private_key: (env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n') }, scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'] })
const v = (await google.sheets({ version: 'v4', auth }).spreadsheets.values.get({ spreadsheetId: '1mR1_-a3LmjxAbbox3tTKBu6WYwDbfBYKmPB6TP9EnKI', range: `'JD EXECUTION'!A1:AB800` })).data.values || []
const h = v[2]; for (const r of v) if (r[0] === 'R228') h.forEach((k, i) => r[i] && console.log(`${k}: ${r[i]}`))
