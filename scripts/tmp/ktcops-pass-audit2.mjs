// 읽기 전용 — 합격자 수 기준 SLA 감사 v2
// 서류합격 정본 = ktc_candidates. 신규 9월 공고는 job_code가 비어 있어 회사명(applied_company)으로 연결.
// 회사 매칭 시 지원일 >= 리드일 필터로 과거 라운드 오염 방지. 코드 매칭(KYN 등)은 전체.
import { google } from 'googleapis'
import { sb, env, fetchAll } from '/Users/wiseungju/salarymap/scripts/outreach/lib.mjs'

const auth = new google.auth.GoogleAuth({
  credentials: { client_email: env.GOOGLE_SERVICE_ACCOUNT_EMAIL, private_key: (env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n') },
  scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
})
const sheets = google.sheets({ version: 'v4', auth })
const OPS_ID = '1opr9KoR7KRZ31CJDNGM63xbA2rPZjPuNaG6eeLPTXjM'

const [opsRes, cands] = await Promise.all([
  sheets.spreadsheets.values.get({ spreadsheetId: OPS_ID, range: "'Matching Status'!A14:BB" }),
  fetchAll(() => sb.from('ktc_candidates').select('job_code,applied_company,applied_at,pipeline_status').order('id')),
])

const col = (row, l) => { let n = 0; for (const ch of l) n = n * 26 + (ch.charCodeAt(0) - 64); return String(row[n - 1] || '').trim() }
const norm = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').normalize('NFC')
  .replace(/주식회사|\(주\)|co\.?,?\s*ltd\.?|company|corp\.?|\.|\s+/g, '').trim()

const ALIAS = {
  '코망': 'komang', '러엔': 'luen', '오버레이': 'overlay', '언틸': 'until',
  '에스2이테크': 's2e', '유피드': 'ufeed', '모티브픽쳐스': 'motivepictures',
  '픽케어': 'pickcare', '어뮤징랩': 'amusinglab', '코스모스소프트': 'cosmossoft',
  '제스트': 'zest', '엠피엔엑스': 'mpnx', '바다핀테크': 'badafintech',
  '킨도프': 'kyndof', '로테아': 'rothea', '웬컴퍼니': 'wen', '오픈그래프랩스': 'opengraph',
}

const PASS = new Set(['passed', 'ready_to_forward', 'sent_to_company', 'interviewing', 'final_passed'])

const parseDate = (s) => {
  if (!s) return null
  let m = s.match(/(\d{4})-(\d{1,2})-(\d{1,2})/)
  if (m) return new Date(+m[1], +m[2] - 1, +m[3])
  m = s.match(/^(\d{1,2})\/(\d{1,2})$/)
  if (m) return new Date(2026, +m[1] - 1, +m[2])
  return null
}
const TODAY = new Date(2026, 8, 14)
const bizDaysSince = (d) => {
  if (!d) return null
  let cur = new Date(d), n = 0
  while (cur < TODAY) {
    cur = new Date(cur.getTime() + 86400000)
    const dow = cur.getDay()
    if (dow !== 0 && dow !== 6) n++
  }
  return n
}
const fmt = (d) => d ? `${d.getMonth() + 1}/${d.getDate()}` : '?'

// ops 진행중 JD → 회사 그룹
const rows = (opsRes.data.values || []).filter(r => col(r, 'A') === '진행중' && col(r, 'F') && col(r, 'F') !== '테스트')
const byCode = {}
for (const r of rows) {
  const k = col(r, 'F')
  byCode[k] ||= {
    code: k, execCode: '', category: col(r, 'B'), company: col(r, 'I'),
    dLead: null, dIntDone: null, toCount: 0, stages: new Set(),
  }
  const x = byCode[k]
  x.toCount++
  x.stages.add(col(r, 'E').replace(/\n/g, ' '))
  if (!x.execCode && col(r, 'H')) x.execCode = col(r, 'H').toUpperCase()
  if (!x.dLead) x.dLead = parseDate(col(r, 'AS'))
  if (!x.dIntDone) x.dIntDone = parseDate(col(r, 'AW'))
}

const groups = {}
for (const x of Object.values(byCode)) {
  const gk = x.category + '|' + norm(x.company)
  groups[gk] ||= { category: x.category, company: x.company, jds: [], execCodes: new Set() }
  groups[gk].jds.push(x)
  if (x.execCode) groups[gk].execCodes.add(x.execCode)
}

// 후보 집계
const candByCode = {}
for (const c of cands) {
  const k = (c.job_code || '').toUpperCase()
  if (!k) continue
  ;(candByCode[k] ||= []).push(c)
}
const candByComp = {}
for (const c of cands) {
  const k = norm(c.applied_company)
  if (!k) continue
  ;(candByComp[k] ||= []).push(c)
}
const compKeys = Object.keys(candByComp)

for (const g of Object.values(groups)) {
  const opsN = ALIAS[norm(g.company)] || ALIAS[g.company] || norm(g.company)
  let pool = []
  let via = ''
  if (g.execCodes.size) {
    for (const ec of g.execCodes) pool.push(...(candByCode[ec] || []))
    if (pool.length) via = '코드(' + [...g.execCodes].join('+') + ')'
  }
  if (!pool.length && opsN.length >= 3) {
    const hits = compKeys.filter(k => k === opsN || k.startsWith(opsN) || opsN.startsWith(k))
    for (const h of hits) pool.push(...candByComp[h])
    if (pool.length) via = '회사명(' + hits.join(',') + ')'
  }
  const lead = g.jds.map(j => j.dLead).filter(Boolean).sort((a, b) => a - b)[0] || null
  // 회사명 매칭은 리드일 이후 지원만 (과거 라운드 오염 방지)
  if (via.startsWith('회사명') && lead) pool = pool.filter(c => (c.applied_at || '') >= lead.toISOString().slice(0, 10))
  g.via = via || '후보DB 기록 없음'
  g.lead = lead
  g.bd = bizDaysSince(lead)
  g.apps = pool.length
  g.pass = pool.filter(c => PASS.has(c.pipeline_status)).length
  g.interviewing = pool.filter(c => c.pipeline_status === 'interviewing').length
  g.finalPassed = pool.filter(c => c.pipeline_status === 'final_passed').length
  g.sheetIntDone = g.jds.some(j => j.dIntDone)
  g.codes = g.jds.map(j => j.code).sort()
  g.toTotal = g.jds.reduce((s, j) => s + j.toCount, 0)
}

const line = (g) => [
  g.company.slice(0, 22).padEnd(24),
  `JD ${g.jds.length}개(TO ${g.toTotal})`.padEnd(13),
  `리드 ${fmt(g.lead)}(${g.bd ?? '?'}영업일)`.padEnd(17),
  `지원 ${g.apps}`.padEnd(8), `합격 ${g.pass}`.padEnd(8),
  `면접중 ${g.interviewing}/최종 ${g.finalPassed}`.padEnd(14),
  g.via,
].join(' ')

for (const cat of ['VN', 'KR', 'Remote']) {
  const pool = Object.values(groups).filter(g => g.category === cat).sort((a, b) => (b.bd ?? 999) - (a.bd ?? 999))
  console.log(`\n########## ${cat} ##########`)
  console.log('\n[A] 소싱 위반 — 리드 3영업일 초과 & 서류합격자 0명:')
  for (const g of pool) if ((g.bd === null || g.bd > 3) && g.pass === 0) console.log('  ' + line(g) + '  | ' + g.codes.join(','))
  console.log('\n[B] 인터뷰 위반 — 합격자는 있는데 리드 5영업일 초과 & 인터뷰 완료 없음:')
  for (const g of pool) if (g.bd !== null && g.bd > 5 && g.pass > 0 && !g.sheetIntDone && g.finalPassed === 0) console.log('  ' + line(g) + '  | ' + g.codes.join(','))
  console.log('\n[OK] 기한 내 or 합격 확보 or 인터뷰 완료:')
  for (const g of pool) {
    const aViol = (g.bd === null || g.bd > 3) && g.pass === 0
    const bViol = g.bd !== null && g.bd > 5 && g.pass > 0 && !g.sheetIntDone && g.finalPassed === 0
    if (!aViol && !bViol) console.log('  ' + line(g))
  }
}
