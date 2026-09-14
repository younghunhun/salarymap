// 읽기 전용 — 공고(회사)별 풀 퍼널: 발송 → FYI지원 → KTC지원 → 합격/미심사 → 기업전달
import { google } from 'googleapis'
import { sb, env, fetchAll } from '/Users/wiseungju/salarymap/scripts/outreach/lib.mjs'

const auth = new google.auth.GoogleAuth({
  credentials: { client_email: env.GOOGLE_SERVICE_ACCOUNT_EMAIL, private_key: (env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n') },
  scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
})
const sheets = google.sheets({ version: 'v4', auth })
const OPS_ID = '1opr9KoR7KRZ31CJDNGM63xbA2rPZjPuNaG6eeLPTXjM'

const [opsRes, cands, jobs, recs, apps] = await Promise.all([
  sheets.spreadsheets.values.get({ spreadsheetId: OPS_ID, range: "'Matching Status'!A14:BB" }),
  fetchAll(() => sb.from('ktc_candidates').select('job_code,applied_company,applied_at,pipeline_status').order('id')),
  fetchAll(() => sb.from('jobs').select('id,source_id,company,title,is_active').eq('source', 'ktc').order('created_at')),
  fetchAll(() => sb.from('job_recommendations').select('job_id,created_at').eq('kind', 'recommend').order('id')),
  fetchAll(() => sb.from('job_applications').select('job_id,created_at').order('id')),
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
const fmt = (d) => d ? `${d.getMonth() + 1}/${d.getDate()}` : '-'

// ops 진행중 → 회사 그룹 (+ 폴백 3사 수동 추가)
const rows = (opsRes.data.values || []).filter(r => col(r, 'A') === '진행중' && col(r, 'F') && col(r, 'F') !== '테스트')
const byCode = {}
for (const r of rows) {
  const k = col(r, 'F')
  byCode[k] ||= { code: k, execCode: '', category: col(r, 'B'), company: col(r, 'I'), dLead: null }
  if (!byCode[k].execCode && col(r, 'H')) byCode[k].execCode = col(r, 'H').toUpperCase()
  if (!byCode[k].dLead) byCode[k].dLead = parseDate(col(r, 'AS'))
}
const groups = {}
for (const x of Object.values(byCode)) {
  const gk = x.category + '|' + norm(x.company)
  groups[gk] ||= { category: x.category, company: x.company, codes: [], execCodes: new Set(), dLead: null }
  groups[gk].codes.push(x.code)
  if (x.execCode) groups[gk].execCodes.add(x.execCode)
  if (x.dLead && (!groups[gk].dLead || x.dLead < groups[gk].dLead)) groups[gk].dLead = x.dLead
}
// 폴백 (Ops에 행 없음)
groups['FB|gasdna'] = { category: '(Ops없음)', company: 'GasDNA', codes: ['K20'], execCodes: new Set(['K20']), dLead: new Date(2026, 7, 26) }
groups['FB|pi'] = { category: '(Ops없음)', company: 'PI Power Solutions', codes: ['V85'], execCodes: new Set(['V85']), dLead: new Date(2026, 8, 9) }
groups['FB|xanh'] = { category: '(Ops없음)', company: 'The Xanh', codes: ['V87'], execCodes: new Set(['V87']), dLead: new Date(2026, 8, 10) }

// FYI jobs 매핑: source_id → job / 회사명 → jobs
const jobsByCode = {}
const jobsByComp = {}
for (const j of jobs) {
  const c = (j.source_id || '').trim().toUpperCase()
  if (c) (jobsByCode[c] ||= []).push(j)
  const nk = norm(j.company)
  if (nk) (jobsByComp[nk] ||= []).push(j)
}
const recByJob = {}
for (const r of recs) {
  recByJob[r.job_id] ||= { n: 0, first: r.created_at, last: r.created_at }
  recByJob[r.job_id].n++
  if (r.created_at < recByJob[r.job_id].first) recByJob[r.job_id].first = r.created_at
  if (r.created_at > recByJob[r.job_id].last) recByJob[r.job_id].last = r.created_at
}
const appByJob = {}
for (const a of apps) appByJob[a.job_id] = (appByJob[a.job_id] || 0) + 1

// KTC candidates: 코드/회사명
const candByCode = {}
const candByComp = {}
for (const c of cands) {
  const k = (c.job_code || '').toUpperCase()
  if (k) (candByCode[k] ||= []).push(c)
  const ck = norm(c.applied_company)
  if (ck) (candByComp[ck] ||= []).push(c)
}
const compKeys = Object.keys(candByComp)

const out = []
for (const g of Object.values(groups)) {
  // FYI 발송·지원: 코드 매칭 우선, 없으면 회사명
  let fyiJobs = []
  for (const c of g.codes.map(x => x.toUpperCase())) fyiJobs.push(...(jobsByCode[c] || []))
  if (!fyiJobs.length) {
    const nk = ALIAS[norm(g.company)] || ALIAS[g.company] || norm(g.company)
    for (const k of Object.keys(jobsByComp)) if (k === nk || (nk.length >= 3 && (k.startsWith(nk) || nk.startsWith(k)))) fyiJobs.push(...jobsByComp[k])
  }
  const jobIds = [...new Set(fyiJobs.map(j => j.id))]
  let sent = 0, lastSent = '', firstSent = ''
  for (const id of jobIds) {
    const r = recByJob[id]
    if (!r) continue
    sent += r.n
    if (!lastSent || r.last > lastSent) lastSent = r.last
    if (!firstSent || r.first < firstSent) firstSent = r.first
  }
  const fyiApps = jobIds.reduce((s, id) => s + (appByJob[id] || 0), 0)

  // KTC candidates
  let pool = []
  for (const ec of g.execCodes) pool.push(...(candByCode[ec] || []))
  if (!pool.length) {
    const nk = ALIAS[norm(g.company)] || ALIAS[g.company] || norm(g.company)
    if (nk.length >= 3) {
      const hits = compKeys.filter(k => k === nk || k.startsWith(nk) || nk.startsWith(k))
      for (const h of hits) pool.push(...candByComp[h])
      if (g.dLead) {
        const cut = `${g.dLead.getFullYear()}-${String(g.dLead.getMonth() + 1).padStart(2, '0')}-${String(g.dLead.getDate()).padStart(2, '0')}`
        pool = pool.filter(c => (c.applied_at || '') >= cut)
      }
    }
  }
  const passers = pool.filter(c => PASS.has(c.pipeline_status))
    .sort((a, b) => String(a.applied_at).localeCompare(String(b.applied_at)))
  const fifth = passers[4] ? new Date(String(passers[4].applied_at).slice(0, 10)) : null
  out.push({
    cat: g.category, company: g.company, nCodes: g.codes.length, lead: g.dLead, bd: bizDaysSince(g.dLead),
    sent, lastSent: lastSent.slice(5, 10), ktcApps: pool.length,
    newN: pool.filter(c => c.pipeline_status === 'new').length,
    screening: pool.filter(c => ['new'].includes(c.pipeline_status)).length,
    pass: passers.length,
    forwarded: pool.filter(c => ['sent_to_company', 'interviewing', 'final_passed'].includes(c.pipeline_status)).length,
    fyiApps, fifth, fifthBd: bizDaysSince(fifth),
  })
}

out.sort((a, b) => (a.cat + a.company).localeCompare(b.cat + b.company))
console.log(['파트', '회사', '공고수', '리드', '경과', '발송', '최근발송', 'FYI지원', 'KTC지원', '미심사', '합격', '전달', '5호합격일', '그후경과'].join('\t'))
for (const o of out) {
  console.log([o.cat, o.company.slice(0, 16), o.nCodes, fmt(o.lead), o.bd ?? '?', o.sent || '-', o.lastSent || '-',
    o.fyiApps || 0, o.ktcApps, o.newN, o.pass, o.forwarded, fmt(o.fifth), o.fifthBd ?? '-'].join('\t'))
}
