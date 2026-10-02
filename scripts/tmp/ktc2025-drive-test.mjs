import { readFileSync } from 'node:fs'
import { google } from 'googleapis'
import { env, OAUTH_REDIRECT } from '../outreach/lib.mjs'
const s = readFileSync(new URL('../../data/ktc2025-master.csv', import.meta.url), 'utf8')
const ids = [...new Set((s.match(/https:\/\/drive\.google\.com\/[^\s,"]+/g) || []).map(u => (u.match(/[?&]id=([\w-]+)/) || u.match(/\/d\/([\w-]+)/) || [])[1]).filter(Boolean))]
console.log('drive id 유니크', ids.length)
const unsubRows = s.split('\n').filter(l => /,Unsubscribed,/.test(l)).length; console.log('Unsubscribed 표기 행', unsubRows)
const auth = new google.auth.OAuth2(env.GMAIL_CLIENT_ID, env.GMAIL_CLIENT_SECRET, OAUTH_REDIRECT)
auth.setCredentials({ refresh_token: env.GDRIVE_REFRESH_TOKEN })
const drive = google.drive({ version: 'v3', auth })
const step = Math.floor(ids.length / 30); let ok = 0, pdf = 0, fail = 0; const owners = {}, errs = {}
for (const id of ids.filter((_, i) => i % step === 0).slice(0, 30)) {
  try {
    const m = await drive.files.get({ fileId: id, fields: 'mimeType,owners(emailAddress),size', supportsAllDrives: true })
    const o = m.data.owners?.[0]?.emailAddress || '?'; owners[o] = (owners[o] || 0) + 1
    const r = await drive.files.get({ fileId: id, alt: 'media', supportsAllDrives: true }, { responseType: 'arraybuffer' })
    const buf = Buffer.from(r.data); ok++; if (buf.subarray(0, 1024).indexOf('%PDF-') !== -1) pdf++
  } catch (e) { fail++; const k = (e.message || '').slice(0, 40); errs[k] = (errs[k] || 0) + 1 }
}
console.log(`표본 30: 다운로드 ${ok}(pdf ${pdf}) · 실패 ${fail}`, owners, errs)
