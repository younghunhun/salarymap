// 9/14 블루잡 드랍 (Emma 확정): Sunjin V39-42,44-46,48-61 (21건) + BlueStar V68
// 1) FYI jobs.is_active=false  2) ops Matching Status A열 진행중→드랍  3) Staffing Master JD EXECUTION K열 In Progress→Closed - Cancelled
// 기본 dry-run, 실제 적용은 --apply
import { sb, env, fetchAll } from '../outreach/lib.mjs'
import { google } from 'googleapis'

const APPLY = process.argv.includes('--apply')
const CODES = new Set(['V39','V40','V41','V42','V44','V45','V46','V48','V49','V50','V51','V52','V53','V54','V55','V56','V57','V58','V59','V60','V61','V68'])
const COMPANY_RE = /Sunjin Vina|BlueStar Asia/

const auth = new google.auth.GoogleAuth({
  credentials: { client_email: env.GOOGLE_SERVICE_ACCOUNT_EMAIL, private_key: (env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n') },
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
})
const sheets = google.sheets({ version: 'v4', auth })
const OPS_ID = '1opr9KoR7KRZ31CJDNGM63xbA2rPZjPuNaG6eeLPTXjM'
const MASTER_ID = '1mR1_-a3LmjxAbbox3tTKBu6WYwDbfBYKmPB6TP9EnKI'

// ── 1. FYI jobs ──
console.log('══ 1. FYI jobs is_active=false ══')
const jobs = await fetchAll(() => sb.from('jobs').select('id,source_id,company,title,is_active').eq('source', 'ktc').not('source_id', 'is', null).order('created_at'))
const base = s => (String(s || '').match(/^([A-Z]{1,6}\d{1,4})/) || [])[1] || String(s || '')
const targets = jobs.filter(j => CODES.has(base(j.source_id)) && COMPANY_RE.test(j.company))
const stillActive = targets.filter(j => j.is_active)
console.log(`  대상 ${targets.length}건 (기대 22) / 이 중 ACTIVE ${stillActive.length}건`)
if (targets.length !== 22) { console.error('⛔ 대상 22건 아님 — 중단'); process.exit(1) }
if (APPLY && stillActive.length) {
  const { error } = await sb.from('jobs').update({ is_active: false }).in('id', stillActive.map(j => j.id))
  if (error) { console.error('⛔ DB 업데이트 실패: ' + error.message); process.exit(1) }
  console.log(`  ✅ ${stillActive.length}건 비활성화`)
}

// ── 2. ops Matching Status: A열 진행중 → 드랍 ──
console.log('\n══ 2. ops Matching Status ══')
const ms = (await sheets.spreadsheets.values.get({ spreadsheetId: OPS_ID, range: "'Matching Status'!A1:T" })).data.values || []
const msWrites = [], msSkips = []
for (let i = 0; i < ms.length; i++) {
  const code = String((ms[i] || [])[5] || '').trim()
  if (!CODES.has(code)) continue
  const company = String(ms[i][8] || '').trim()
  const st = String(ms[i][0] || '').trim()
  if (!COMPANY_RE.test(company)) { msSkips.push(`행${i + 1} ${code}: 회사 불일치 "${company}"`); continue }
  if (st !== '진행중') { msSkips.push(`행${i + 1} ${code}: 상태 "${st}" (진행중 아님, 건너뜀)`); continue }
  msWrites.push({ range: `'Matching Status'!A${i + 1}`, values: [['드랍']], code })
}
const msPerCode = {}
for (const w of msWrites) msPerCode[w.code] = (msPerCode[w.code] || 0) + 1
console.log(`  변경 대상 ${msWrites.length}행: ${JSON.stringify(msPerCode)}`)
for (const s of msSkips) console.log('  ⚠️ ' + s)
const msCodes = new Set(msWrites.map(w => w.code))
for (const c of CODES) if (!msCodes.has(c)) console.log(`  ⚠️ ${c}: MS에 변경할 행 없음`)
if (APPLY && msWrites.length) {
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: OPS_ID,
    requestBody: { valueInputOption: 'RAW', data: msWrites.map(({ range, values }) => ({ range, values })) },
  })
  console.log(`  ✅ ${msWrites.length}행 드랍 처리`)
}

// ── 3. Staffing Master JD EXECUTION: K열 In Progress → Closed - Cancelled ──
console.log('\n══ 3. JD EXECUTION ══')
const jd = (await sheets.spreadsheets.values.get({ spreadsheetId: MASTER_ID, range: "'JD EXECUTION'!A1:L" })).data.values || []
const jdWrites = [], jdSkips = []
for (let i = 0; i < jd.length; i++) {
  const code = String((jd[i] || [])[0] || '').trim()
  if (!CODES.has(code)) continue
  const company = String(jd[i][2] || '').trim()
  const st = String(jd[i][10] || '').trim()
  if (!COMPANY_RE.test(company)) { jdSkips.push(`행${i + 1} ${code}: 회사 불일치 "${company}"`); continue }
  if (st !== 'In Progress') { jdSkips.push(`행${i + 1} ${code}: 상태 "${st}" (In Progress 아님, 건너뜀)`); continue }
  jdWrites.push({ range: `'JD EXECUTION'!K${i + 1}`, values: [['Closed - Cancelled']], code })
}
console.log(`  변경 대상 ${jdWrites.length}행 (기대 22): ${jdWrites.map(w => w.code).join(',')}`)
for (const s of jdSkips) console.log('  ⚠️ ' + s)
if (APPLY && jdWrites.length) {
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: MASTER_ID,
    requestBody: { valueInputOption: 'RAW', data: jdWrites.map(({ range, values }) => ({ range, values })) },
  })
  console.log(`  ✅ ${jdWrites.length}행 Closed - Cancelled 처리`)
}

console.log(APPLY ? '\n적용 완료' : '\n(dry-run — 적용하려면 --apply)')
