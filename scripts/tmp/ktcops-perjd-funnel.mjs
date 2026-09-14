// 읽기 전용 — 공고(JD) 단위 퍼널: 발송 → 지원 → 합격/미심사 → 기업전달 + 판정
import { google } from 'googleapis'
import { sb, env, fetchAll } from '/Users/wiseungju/salarymap/scripts/outreach/lib.mjs'

const auth = new google.auth.GoogleAuth({
  credentials: { client_email: env.GOOGLE_SERVICE_ACCOUNT_EMAIL, private_key: (env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n') },
  scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
})
const sheets = google.sheets({ version: 'v4', auth })
const OPS_ID = '1opr9KoR7KRZ31CJDNGM63xbA2rPZjPuNaG6eeLPTXjM'

const MASTER_ID = '1mR1_-a3LmjxAbbox3tTKBu6WYwDbfBYKmPB6TP9EnKI'
const [opsRes, jdExecRes, cands, jobs, recs, apps] = await Promise.all([
  sheets.spreadsheets.values.get({ spreadsheetId: OPS_ID, range: "'Matching Status'!A14:BB" }),
  sheets.spreadsheets.values.get({ spreadsheetId: MASTER_ID, range: "'JD EXECUTION'!A4:D" }),
  fetchAll(() => sb.from('ktc_candidates').select('job_code,applied_company,applied_job,position,applied_at,pipeline_status').order('id')),
  fetchAll(() => sb.from('jobs').select('id,source_id,company,title').eq('source', 'ktc').order('created_at')),
  fetchAll(() => sb.from('job_recommendations').select('job_id,created_at').eq('kind', 'recommend').order('id')),
  fetchAll(() => sb.from('job_applications').select('job_id').order('id')),
])

const col = (row, l) => { let n = 0; for (const ch of l) n = n * 26 + (ch.charCodeAt(0) - 64); return String(row[n - 1] || '').trim() }
const norm = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').normalize('NFC')
  .replace(/주식회사|\(주\)|co\.?,?\s*ltd\.?|company|corp\.?|\.|\s+/g, '').trim()
const normTitle = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').normalize('NFC').replace(/[^a-z가-힣0-9]/g, '')
const ALIAS = {
  '코망': 'komang', '러엔': 'luen', '오버레이': 'overlay', '언틸': 'until',
  '에스2이테크': 's2e', '유피드': 'ufeed', '모티브픽쳐스': 'motivepictures',
  '픽케어': 'pickcare', '어뮤징랩': 'amusinglab', '코스모스소프트': 'cosmossoft',
  '제스트': 'zest', '엠피엔엑스': 'mpnx', '바다핀테크': 'badafintech',
  '킨도프': 'kyndof', '로테아': 'rothea', '웬컴퍼니': 'wen', '대홍': 'daehong', '에스티에스': 'sts',
}
const PASS = new Set(['passed', 'ready_to_forward', 'sent_to_company', 'interviewing', 'final_passed'])
const FWD = new Set(['sent_to_company', 'interviewing', 'final_passed'])
const parseDate = (s) => {
  if (!s) return null
  let m = s.match(/(\d{4})[.\-\/](\d{1,2})[.\-\/](\d{1,2})/)
  if (m) return new Date(+m[1], +m[2] - 1, +m[3])
  m = s.match(/^(\d{1,2})[\/.](\d{1,2})$/)
  if (m) return new Date(2026, +m[1] - 1, +m[2])
  return null
}
const TODAY = new Date(2026, 8, 14)
const bizDaysSince = (d) => {
  if (!d) return null
  let cur = new Date(d), n = 0
  while (cur < TODAY) { cur = new Date(cur.getTime() + 86400000); const w = cur.getDay(); if (w !== 0 && w !== 6) n++ }
  return n
}
const fmt = (d) => d ? `${d.getMonth() + 1}/${d.getDate()}` : '?'

// ── 1) Ops 진행중 JD 목록 (+폴백 3)
const rows = (opsRes.data.values || []).filter(r => col(r, 'A') === '진행중' && col(r, 'F') && col(r, 'F') !== '테스트')
const jd = {}
const legacyToOps = {}
for (const r of rows) {
  const code = col(r, 'F').toUpperCase()
  jd[code] ||= {
    code, execCode: '', category: col(r, 'B'), company: col(r, 'I'),
    position: col(r, 'V') || col(r, 'U'), dLead: null, toCount: 0,
  }
  jd[code].toCount++
  if (!jd[code].position) jd[code].position = col(r, 'V') || col(r, 'U')
  if (!jd[code].execCode && col(r, 'H')) jd[code].execCode = col(r, 'H').toUpperCase()
  if (!jd[code].dLead) jd[code].dLead = parseDate(col(r, 'AS'))
}
for (const x of Object.values(jd)) if (x.execCode) legacyToOps[x.execCode] = x.code
jd['K20'] = { code: 'K20', execCode: 'K20', category: '(Ops없음)', company: 'GasDNA', position: 'Firmware Engineer', dLead: new Date(2026, 7, 26), toCount: 1 }
jd['V85'] = { code: 'V85', execCode: 'V85', category: '(Ops없음)', company: 'PI Power Solutions', position: 'Accountant', dLead: new Date(2026, 8, 9), toCount: 1 }
jd['V87'] = { code: 'V87', execCode: 'V87', category: '(Ops없음)', company: 'The Xanh', position: 'Export & Sourcing', dLead: new Date(2026, 8, 10), toCount: 1 }
// 회사 리드일 최솟값 (JD에 리드일 없을 때 폴백)
const compLead = {}
for (const x of Object.values(jd)) {
  const k = norm(x.company)
  if (x.dLead && (!compLead[k] || x.dLead < compLead[k])) compLead[k] = x.dLead
}
// 회사 → 활성 JD들
const jdsByComp = {}
for (const x of Object.values(jd)) (jdsByComp[norm(x.company)] ||= []).push(x)

// 회사명 정규화: 후보 applied_company → ops 회사 norm
const opsCompNorms = Object.keys(jdsByComp)
const aliasInv = {}
for (const [ko, en] of Object.entries(ALIAS)) {
  for (const oc of opsCompNorms) if (oc === ko || oc.includes(ko)) aliasInv[en] = oc
}
const resolveComp = (applied) => {
  const nk = norm(applied)
  if (!nk) return null
  if (jdsByComp[nk]) return nk
  if (aliasInv[nk]) return aliasInv[nk]
  for (const oc of opsCompNorms) {
    if (oc.length >= 3 && (nk.startsWith(oc) || oc.startsWith(nk))) return oc
    const al = Object.entries(ALIAS).find(([ko]) => oc.includes(ko))
    if (al && (nk === al[1] || nk.startsWith(al[1]))) return oc
  }
  return null
}

// ── 2) 후보 → JD 배정
const codeOf = (c) => {
  for (const f of [c.job_code, c.position, c.applied_job]) {
    const s = String(f || '').toUpperCase()
    let m = s.match(/\b([RVK]\d{1,3})\b/)
    if (m) return m[1]
    m = s.match(/\b([A-Z]{2,6}\d{3,4})\b/)
    if (m && !/^\d{4}$/.test(m[1])) return m[1]
  }
  return null
}
// 1차: 코드 파싱 → ops 코드로 변환(레거시는 H맵), 회사 내 제목→코드 사전 구축
const titleMap = {} // compNorm|titleNorm → {code: n}
const assigned = [] // {opsCode|null, compNorm, cand}
for (const c of cands) {
  const compN = resolveComp(c.applied_company)
  if (!compN) continue
  let code = codeOf(c)
  if (code && legacyToOps[code]) code = legacyToOps[code]
  if (code && !jd[code]) code = null // 비활성/타공고 코드는 제목 매칭으로
  const tn = normTitle(c.applied_job || c.position)
  if (code && tn) {
    const k = compN + '|' + tn
    titleMap[k] ||= {}
    titleMap[k][code] = (titleMap[k][code] || 0) + 1
  }
  assigned.push({ code, compN, c, tn })
}
// 2차: 무코드 행 → 제목 사전 / 단일 JD 회사 자동배정
let unassigned = 0
for (const a of assigned) {
  if (a.code) continue
  const tm = titleMap[a.compN + '|' + a.tn]
  if (tm) { a.code = Object.entries(tm).sort((x, y) => y[1] - x[1])[0][0]; continue }
  const actives = jdsByComp[a.compN] || []
  if (actives.length === 1) { a.code = actives[0].code; continue }
  unassigned++
}

// ── 3) JD별 집계
for (const x of Object.values(jd)) Object.assign(x, { ktcApps: 0, newN: 0, pass: 0, fwd: 0, unk: 0 })
const compUnassigned = {}
for (const a of assigned) {
  if (!a.code) { compUnassigned[a.compN] = (compUnassigned[a.compN] || 0) + 1; continue }
  const x = jd[a.code]
  if (!x) continue
  // 리드일 이전 지원 제외 (회사 리드일 - 7일 여유)
  const lead = x.dLead || compLead[norm(x.company)]
  if (lead) {
    const cut = new Date(lead.getTime() - 7 * 86400000)
    const ad = parseDate(String(a.c.applied_at || '').slice(0, 10))
    if (ad && ad < cut) continue
  }
  x.ktcApps++
  if (a.c.pipeline_status === 'new') x.newN++
  if (PASS.has(a.c.pipeline_status)) x.pass++
  if (FWD.has(a.c.pipeline_status)) x.fwd++
}

// ── 4) FYI 발송·지원 (jobs.source_id → ops 코드)
const recByJob = {}
for (const r of recs) recByJob[r.job_id] = (recByJob[r.job_id] || 0) + 1
const appByJob = {}
for (const a of apps) appByJob[a.job_id] = (appByJob[a.job_id] || 0) + 1
for (const j of jobs) {
  let sc = (j.source_id || '').trim().toUpperCase()
  if (legacyToOps[sc]) sc = legacyToOps[sc]
  const x = jd[sc]
  if (!x) continue
  x.sent = (x.sent || 0) + (recByJob[j.id] || 0)
  x.fyiApps = (x.fyiApps || 0) + (appByJob[j.id] || 0)
}

// ── 5) 판정 + 출력
const verdict = (x) => {
  const bd = bizDaysSince(x.dLead || compLead[norm(x.company)])
  if (x.pass >= 5) return x.fwd > 0 ? '전달진행' : '발송가능·전달대기'
  if (bd === null) return '리드일없음'
  if (bd <= 3) return '기한내'
  if (x.ktcApps <= 10) return '인재못구함'
  if (bd > 5) return '심사지연'
  return '심사중(5일내)'
}
// JD EXECUTION 제목으로 'etc.'/빈 포지션 보강
const execTitle = {}
for (const r of (jdExecRes.data.values || [])) {
  const c = (r[0] || '').trim().toUpperCase()
  if (c) execTitle[c] = (r[3] || '').trim()
}
for (const x of Object.values(jd)) {
  if ((!x.position || /^etc\.?$|^ma$|^de$|^dev$|^trans$|^intern$/i.test(x.position)) && execTitle[x.code]) x.position = execTitle[x.code]
}

const order = { VN: 0, KR: 1, Remote: 2, '(Ops없음)': 3 }
const list = Object.values(jd).sort((a, b) =>
  (order[a.category] ?? 9) - (order[b.category] ?? 9) || a.company.localeCompare(b.company) || a.code.localeCompare(b.code))
console.log(['파트', '코드', '회사', '포지션', '리드', '경과', '발송', 'FYI지원', 'KTC지원', '미심사', '합격', '전달', '판정'].join('\t'))
for (const x of list) {
  const lead = x.dLead || compLead[norm(x.company)]
  console.log([x.category, x.code, x.company.slice(0, 14), (x.position || '').slice(0, 34),
    fmt(lead), bizDaysSince(lead) ?? '?', x.sent ?? '-', x.fyiApps ?? '-',
    x.ktcApps, x.newN, x.pass, x.fwd, verdict(x)].join('\t'))
}
console.log('\n코드·제목으로 배정 못한 지원(회사별):', JSON.stringify(compUnassigned))
