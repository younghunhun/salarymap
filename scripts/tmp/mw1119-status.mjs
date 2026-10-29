// 11/19 호치민 Matching Week 참가 6사 공고 현황: TO(JD EXECUTION) · FYI 지원 · ktc_candidates 파이프라인 · recommend 발송. 읽기 전용.
import { google } from 'googleapis'
import { sb, fetchAll, env } from '../outreach/lib.mjs'
const CODES = ['R216', 'R225', 'R228', 'R229', 'R230', 'JN301', 'R191']
const jobs = await fetchAll(() => sb.from('jobs').select('id,source_id,title,company,is_active,created_at').eq('source', 'ktc').order('created_at'))
const mw = jobs.filter(j => CODES.some(c => String(j.source_id).startsWith(c)))
const apps = await fetchAll(() => sb.from('job_applications').select('job_id,status,created_at').in('job_id', mw.map(j => j.id)).order('id'))
const cands = await fetchAll(() => sb.from('ktc_candidates').select('job_code,pipeline_status,created_at').order('id'))
const auth = new google.auth.GoogleAuth({ credentials: { client_email: env.GOOGLE_SERVICE_ACCOUNT_EMAIL, private_key: (env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n') }, scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'] })
const v = (await google.sheets({ version: 'v4', auth }).spreadsheets.values.get({ spreadsheetId: '1mR1_-a3LmjxAbbox3tTKBu6WYwDbfBYKmPB6TP9EnKI', range: `'JD EXECUTION'!A1:N800` })).data.values || []
const sheet = {}; for (const r of v) if (CODES.includes(r[0])) sheet[r[0]] = { to: r[7], recv: r[8], status: r[10], meta: r[13] }
const since7 = Date.now() - 7 * 864e5
for (const j of mw) {
  const code = j.source_id
  const a = apps.filter(x => x.job_id === j.id)
  const st = {}; for (const x of a) st[x.status || 'null'] = (st[x.status || 'null'] || 0) + 1
  const c = cands.filter(x => x.job_code === code)
  const ps = {}; for (const x of c) ps[x.pipeline_status] = (ps[x.pipeline_status] || 0) + 1
  console.log(`\n${code} ${j.is_active ? 'ON' : 'off'} ${j.company} | ${j.title.slice(0, 50)} | 등록 ${j.created_at.slice(0, 10)}`)
  console.log('  시트:', JSON.stringify(sheet[code] || 'NOT FOUND'))
  console.log(`  FYI 지원 ${a.length} (최근7일 ${a.filter(x => +new Date(x.created_at) > since7).length}) status`, JSON.stringify(st))
  console.log(`  파이프라인 ${c.length}`, JSON.stringify(ps))
}
const others = Object.keys(sheet).filter(k => !mw.some(j => j.source_id === k)); if (others.length) console.log('\n시트에만:', others.map(k => k + JSON.stringify(sheet[k])).join(' '))
