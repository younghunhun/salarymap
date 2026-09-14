// 9/14 Sunjin 21 + BlueStar V68 블루잡 드랍 — 사전 실사(dry-run, 읽기 전용)
// 대상: FYI jobs · ops Matching Status · Staffing Master JD EXECUTION · ktc-support 탭 목록
import { sb, env, fetchAll } from '../outreach/lib.mjs'
import { google } from 'googleapis'

const CODES = ['V39','V40','V41','V42','V44','V45','V46','V48','V49','V50','V51','V52','V53','V54','V55','V56','V57','V58','V59','V60','V61','V68']
const KEEP = ['V35','V36','V37','V38','V43','V47','V66'] // 계속 진행 — 오염 감지용

const auth = new google.auth.GoogleAuth({
  credentials: { client_email: env.GOOGLE_SERVICE_ACCOUNT_EMAIL, private_key: (env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n') },
  scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
})
const sheets = google.sheets({ version: 'v4', auth })
const OPS_ID = '1opr9KoR7KRZ31CJDNGM63xbA2rPZjPuNaG6eeLPTXjM'
const MASTER_ID = '1mR1_-a3LmjxAbbox3tTKBu6WYwDbfBYKmPB6TP9EnKI'

// ── 1. FYI jobs ──
console.log('══ 1. FYI jobs (source=ktc) ══')
const jobs = await fetchAll(() => sb.from('jobs').select('id,source_id,company,title,is_active').eq('source', 'ktc').not('source_id', 'is', null).order('created_at'))
const base = s => (String(s || '').match(/^([A-Z]{1,6}\d{1,4})/) || [])[1] || String(s || '')
for (const c of [...CODES, ...KEEP]) {
  const hits = jobs.filter(j => base(j.source_id) === c)
  const tag = CODES.includes(c) ? 'DROP' : 'keep'
  if (!hits.length) { console.log(`  [${tag}] ${c}: ⚠️ FYI에 없음`); continue }
  for (const j of hits) console.log(`  [${tag}] ${c}: ${j.is_active ? 'ACTIVE' : 'inactive'} · ${j.company} · ${j.title} · ${j.id}`)
}

// ── 2. ops Matching Status ──
console.log('\n══ 2. ops Matching Status ══')
const ms = (await sheets.spreadsheets.values.get({ spreadsheetId: OPS_ID, range: "'Matching Status'!A1:T" })).data.values || []
const hIdx = ms.findIndex(r => r.some(c => String(c || '').trim() === 'Code'))
console.log(`  헤더(행${hIdx + 1}): ${JSON.stringify((ms[hIdx] || []).slice(0, 12).map(h => String(h || '').replace(/\n/g, ' ')))}`)
const statusVocab = new Map()
for (const r of ms.slice(hIdx + 1)) {
  const st = String(r[0] || '').trim()
  if (st) statusVocab.set(st, (statusVocab.get(st) || 0) + 1)
}
console.log(`  상태 어휘(A열): ${JSON.stringify([...statusVocab.entries()])}`)
for (let i = hIdx + 1; i < ms.length; i++) {
  const code = String(ms[i][5] || '').trim()
  if (CODES.includes(code) || KEEP.includes(code)) {
    const tag = CODES.includes(code) ? 'DROP' : 'keep'
    console.log(`  [${tag}] 행${i + 1}: ${code} · status="${ms[i][0] || ''}" · company="${ms[i][8] || ''}" · pos="${String(ms[i][19] || ms[i][10] || '').slice(0, 40)}"`)
  }
}

// ── 3. Staffing Master JD EXECUTION ──
console.log('\n══ 3. Staffing Master JD EXECUTION ══')
const jd = (await sheets.spreadsheets.values.get({ spreadsheetId: MASTER_ID, range: "'JD EXECUTION'!A1:AF" })).data.values || []
// 헤더 행 탐색: 'Code' 또는 '(JD)' 포함 행
let jdH = jd.findIndex(r => r.some(c => /Code|status|상태/i.test(String(c || ''))))
console.log(`  헤더 후보(행${jdH + 1}): ${JSON.stringify((jd[jdH] || []).map(h => String(h || '').replace(/\n/g, ' ')))}`)
if (jd[jdH + 1]) console.log(`  다음 행 샘플: ${JSON.stringify((jd[jdH + 1] || []).slice(0, 15))}`)
// 코드가 들어있는 열 자동 탐지
const codeRe = /^[A-Z]{1,3}\d{1,4}$/
const colHits = new Map()
for (const r of jd) r.forEach((c, ci2) => { if (codeRe.test(String(c || '').trim())) colHits.set(ci2, (colHits.get(ci2) || 0) + 1) })
console.log(`  코드형 값 열 분포: ${JSON.stringify([...colHits.entries()])}`)
const codeCol = [...colHits.entries()].sort((a, b) => b[1] - a[1])[0]?.[0]
for (let i = 0; i < jd.length; i++) {
  const code = String((jd[i] || [])[codeCol] || '').trim()
  if (CODES.includes(code) || KEEP.includes(code)) {
    const tag = CODES.includes(code) ? 'DROP' : 'keep'
    console.log(`  [${tag}] 행${i + 1}: ${JSON.stringify((jd[i] || []).slice(0, Math.max(codeCol + 6, 12)))}`)
  }
}

// ── 4. ktc-support 탭 목록 (공고 상태 탭 존재 여부만) ──
console.log('\n══ 4. ktc-support 탭 목록 ══')
const meta = await sheets.spreadsheets.get({ spreadsheetId: env.GOOGLE_SHEET_ID })
console.log('  ' + (meta.data.sheets || []).map(s => s.properties?.title).join(' | '))
