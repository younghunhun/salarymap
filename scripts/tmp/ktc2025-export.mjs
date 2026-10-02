// KTC WORKER 2025 마스터시트를 Drive API(drive.readonly)로 CSV export → data/ktc2025-master.csv (gitignore)
import { writeFileSync } from 'node:fs'
import { google } from 'googleapis'
import { env, OAUTH_REDIRECT } from '../outreach/lib.mjs'
const token = env.GDRIVE_REFRESH_TOKEN || process.env.GDRIVE_REFRESH_TOKEN
if (!token) throw new Error('GDRIVE_REFRESH_TOKEN 없음')
const auth = new google.auth.OAuth2(env.GMAIL_CLIENT_ID, env.GMAIL_CLIENT_SECRET, OAUTH_REDIRECT)
auth.setCredentials({ refresh_token: token })
const drive = google.drive({ version: 'v3', auth })
const id = '1tSgcxhJDwNpY9vR_uKFkijMfMLmPWHfpcAhyQ5-rWKs'
const meta = await drive.files.get({ fileId: id, fields: 'name,owners,modifiedTime', supportsAllDrives: true })
console.log('file', meta.data.name, '|', meta.data.modifiedTime)
const r = await drive.files.export({ fileId: id, mimeType: 'text/csv' }, { responseType: 'arraybuffer' })
const csv = Buffer.from(r.data).toString('utf8')
writeFileSync(new URL('../../data/ktc2025-master.csv', import.meta.url), csv)
console.log('bytes', csv.length, '| header:', csv.split('\n')[0].slice(0, 200))
