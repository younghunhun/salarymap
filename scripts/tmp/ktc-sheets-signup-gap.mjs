// 두 KTC 시트(2026 CANDIDATE DATA 전 탭 + 2025 Master Sheet)의 CV 보유자 중 FYI 미가입 수 실측
import { google } from 'googleapis'
import { sb, env, fetchAll } from '/Users/wiseungju/salarymap/scripts/outreach/lib.mjs'
const sa = new google.auth.GoogleAuth({
  credentials: { client_email: env.GOOGLE_SERVICE_ACCOUNT_EMAIL, private_key: (env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n') },
  scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
})
const sheets = google.sheets({ version: 'v4', auth: sa })
const S26 = '13pvv1vQ8PklkIjOfuILD5sbKZJu0CRkiaXRXxUTOp88'
const S25 = '1tSgcxhJDwNpY9vR_uKFkijMfMLmPWHfpcAhyQ5-rWKs'
const norm = (e) => String(e || '').trim().toLowerCase()
const validEmail = (e) => /^[^@\s]+@[^@\s.]+\.[^@\s]+$/.test(e)
const hasLink = (v) => /https?:\/\/|drive\.google|supabase\.co/i.test(String(v || ''))

// 탭별 이메일/CV 열 (헤더 이름 기반)
const EMAIL_H = /^(email|email address|candidate email)$/i
const CV_H = /^(cv url|link cv|view cv|cv link|link xem cv|upload cv|link|cv_data)$/i

const profs = await fetchAll(() => sb.from('user_profiles').select('email').not('email', 'is', null).order('email'))
const members = new Set(profs.map(p => norm(p.email)))
console.log('FYI 가입 이메일', members.size)

async function readTab(id, title) {
  const r = await sheets.spreadsheets.values.get({ spreadsheetId: id, range: `'${title}'` })
  const rows = r.data.values || []
  const h = rows[0] || []
  const ei = h.findIndex(x => EMAIL_H.test(String(x).trim()))
  const ci = h.findIndex(x => CV_H.test(String(x).trim()))
  return { rows: rows.slice(1), ei, ci, h }
}

const allCv = new Map() // email -> Set(tabs)
const out = []
async function tally(label, id, title, opts = {}) {
  const { rows, ei, ci } = await readTab(id, title)
  if (ei < 0) { console.log(`!! ${label}: email 열 없음`); return }
  const emails = new Set(), cvEmails = new Set()
  let rowsWithEmail = 0, rowsWithCv = 0
  for (const r of rows) {
    const e = norm(r[ei]); if (!validEmail(e)) continue
    rowsWithEmail++; emails.add(e)
    const cv = ci >= 0 ? (opts.cvAny ? !!String(r[ci] || '').trim() : hasLink(r[ci])) : false
    if (cv) { rowsWithCv++; cvEmails.add(e); if (!allCv.has(e)) allCv.set(e, new Set()); allCv.get(e).add(label) }
  }
  const joined = [...cvEmails].filter(e => members.has(e)).length
  const joinedAll = [...emails].filter(e => members.has(e)).length
  out.push({ tab: label, rows: rows.length, uniqEmail: emails.size, joinedAll, cvUniq: cvEmails.size, cvJoined: joined, cvNot: cvEmails.size - joined, cvCol: ci >= 0 ? 'Y' : '-' })
}

const m = await sheets.spreadsheets.get({ spreadsheetId: S26, fields: 'sheets.properties.title' })
for (const s of m.data.sheets) {
  const t = s.properties.title
  if (/^(log|FYI-JD Weekly|FYI)$/.test(t)) continue // FYI 탭=이미 사이트 지원자, 제외
  await tally(`2026/${t}`, S26, t)
}
await tally('2025/Master Sheet', S25, 'Master Sheet', { cvAny: true })

console.table(out)
const tot = [...allCv.keys()]
const totJoined = tot.filter(e => members.has(e)).length
console.log(`\n합계(유니크 이메일, CV 보유): ${tot.length} / 가입 ${totJoined} / 미가입 ${tot.length - totJoined}`)
const only26 = tot.filter(e => [...allCv.get(e)].every(t => t.startsWith('2026/')))
const only25 = tot.filter(e => [...allCv.get(e)].every(t => t.startsWith('2025/')))
const both = tot.length - only26.length - only25.length
console.log(`  2026만 ${only26.length}(미가입 ${only26.filter(e => !members.has(e)).length}) · 2025만 ${only25.length}(미가입 ${only25.filter(e => !members.has(e)).length}) · 양쪽 ${both}`)
