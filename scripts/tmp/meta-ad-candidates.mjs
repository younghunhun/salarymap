// 진행 중 KTC 공고 전체에서 메타 광고 켤/끌 후보 찾기: TO(JD EXECUTION) 대비 서류 통과 · 최근 7일 지원 · Meta Ad 열. 읽기 전용.
import { google } from 'googleapis'
import { sb, fetchAll, env } from '../outreach/lib.mjs'
const PASS = new Set(['passed', 'ready_to_forward', 'sent_to_company', 'interviewing', 'offer', 'final_passed'])
const auth = new google.auth.GoogleAuth({ credentials: { client_email: env.GOOGLE_SERVICE_ACCOUNT_EMAIL, private_key: (env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n') }, scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'] })
const v = (await google.sheets({ version: 'v4', auth }).spreadsheets.values.get({ spreadsheetId: '1mR1_-a3LmjxAbbox3tTKBu6WYwDbfBYKmPB6TP9EnKI', range: `'JD EXECUTION'!A1:N1500` })).data.values || []
const sheet = {}; for (const r of v.slice(3)) if (r[0]) sheet[r[0]] = { to: parseInt(r[7], 10) || 1, recv: r[8], status: r[10] || '', meta: (r[13] || '').replace(/\n.*/s, '') }
const jobs = await fetchAll(() => sb.from('jobs').select('id,source_id,title,company,location,is_active,created_at').eq('source', 'ktc').eq('is_active', true).order('created_at'))
const apps = await fetchAll(() => sb.from('job_applications').select('job_id,created_at').in('job_id', jobs.map(j => j.id)).order('id'))
const cands = await fetchAll(() => sb.from('ktc_candidates').select('job_code,pipeline_status,created_at').order('id'))
const since7 = Date.now() - 7 * 864e5
const rows = []
for (const j of jobs) {
  const code = j.source_id, s = sheet[code]
  if (!s || !/progress/i.test(s.status)) continue
  const c = cands.filter(x => x.job_code === code)
  const pass = c.filter(x => PASS.has(x.pipeline_status)).length
  const sent = c.filter(x => ['sent_to_company', 'interviewing', 'offer', 'final_passed'].includes(x.pipeline_status)).length
  const a = apps.filter(x => x.job_id === j.id)
  rows.push({ code, co: j.company.slice(0, 22), title: j.title.slice(0, 34), loc: (j.location || '').slice(0, 14), age: Math.round((Date.now() - +new Date(j.created_at)) / 864e5), to: s.to, apps: a.length, a7: a.filter(x => +new Date(x.created_at) > since7).length, pass, sent, ratio: +(pass / s.to).toFixed(1), meta: s.meta })
}
rows.sort((x, y) => x.ratio - y.ratio)
const fmt = r => `${r.code.padEnd(6)} ${r.co.padEnd(22)} ${r.title.padEnd(34)} ${r.loc.padEnd(14)} ${String(r.age).padStart(3)}d TO${r.to} 지원${r.apps}(7d ${r.a7}) 통과${r.pass} 전달${r.sent} ×${r.ratio} ${r.meta ? 'META ' + r.meta : ''}`
console.log(`진행 중 ${rows.length}건\n\n[켤 후보] 통과/TO < 2`); rows.filter(r => r.ratio < 2).forEach(r => console.log(fmt(r)))
console.log('\n[끌 후보] 메타 집행 중 & 통과/TO ≥ 5'); rows.filter(r => r.meta && r.ratio >= 5).forEach(r => console.log(fmt(r)))
console.log('\n[메타 집행 중 전체]'); rows.filter(r => r.meta).forEach(r => console.log(fmt(r)))
