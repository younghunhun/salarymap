// 읽기 전용 — Matching Status 상태·퍼널 값 분포 탐색
import { google } from 'googleapis'
import { env } from '/Users/wiseungju/salarymap/scripts/outreach/lib.mjs'
const auth = new google.auth.GoogleAuth({
  credentials: { client_email: env.GOOGLE_SERVICE_ACCOUNT_EMAIL, private_key: (env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n') },
  scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
})
const sheets = google.sheets({ version: 'v4', auth })
const res = await sheets.spreadsheets.values.get({ spreadsheetId: '1opr9KoR7KRZ31CJDNGM63xbA2rPZjPuNaG6eeLPTXjM', range: "'Matching Status'!A14:BB" })
const rows = (res.data.values || [])
const col = (r, l) => { let n = 0; for (const ch of l) n = n * 26 + (ch.charCodeAt(0) - 64); return String(r[n - 1] || '').trim() }
const valid = rows.filter((r) => col(r, 'F') && col(r, 'F') !== '테스트')
console.log('총 행(코드 있음):', valid.length)
const dist = (fn) => { const m = {}; for (const r of valid) { const k = fn(r) || '(공란)'; m[k] = (m[k] || 0) + 1 } return m }
console.log('\n상태(A) 분포:', dist((r) => col(r, 'A')))
console.log('\n카테고리(B) 분포:', dist((r) => col(r, 'B')))
console.log('\n진행중 행의 Funnel(E) 분포:')
const prog = valid.filter((r) => col(r, 'A') === '진행중')
const fm = {}
for (const r of prog) { const k = (col(r, 'E') || '(공란)').replace(/\n/g, ' '); fm[`${col(r, 'B')} | ${k}`] = (fm[`${col(r, 'B')} | ${k}`] || 0) + 1 }
for (const [k, v] of Object.entries(fm).sort()) console.log(` ${k}: ${v}`)
console.log('\n인터뷰 대기 단계 행의 AV(일자) 값:')
for (const r of prog) { const e = (col(r, 'E') || '').replace(/\n/g, ' '); if (/인터뷰 대기|4\./.test(e)) console.log(` ${col(r, 'B')} ${col(r, 'F')} ${col(r, 'I').slice(0, 16)} | AV="${col(r, 'AV')}" AW="${col(r, 'AW')}" 비고="${col(r, 'BB').slice(0, 40)}"`) }
console.log('\n완료 행 수(카테고리별):')
const done = valid.filter((r) => col(r, 'A') === '완료')
console.log(dist.call ? '' : '')
const dm = {}
for (const r of done) dm[col(r, 'B')] = (dm[col(r, 'B')] || 0) + 1
console.log(dm, '완료 총', done.length)
console.log('\n완료 행 표본 5 (F/I/AX/BA):')
for (const r of done.slice(0, 5)) console.log(` ${col(r, 'B')} ${col(r, 'F')} ${col(r, 'I').slice(0, 14)} AX="${col(r, 'AX')}" BA="${col(r, 'BA')}"`)
