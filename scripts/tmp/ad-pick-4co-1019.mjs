// DA-SH / First MKT(영업) / The Han / Nstage — 공고별 FYI 지원 · KTC 스크리닝 합격 → 광고 대상 선정 (읽기 전용)
import { sb, fetchAll } from '../outreach/lib.mjs'
const PASS = new Set(['passed', 'ready_to_forward', 'sent_to_company', 'interviewing', 'offer', 'final_passed'])
const { data: one } = await sb.from('jobs').select('*').eq('source', 'ktc').limit(1); console.log('jobs columns:', Object.keys(one?.[0] || {}).join(', '))
const jobs = await fetchAll(() => sb.from('jobs').select('id,source_id,title,company,is_active,status,created_at,salary_min,salary_max,location').eq('source', 'ktc')
  .or('company.ilike.%da-sh%,company.ilike.%dash%,company.ilike.%first%mkt%,company.ilike.%first marketing%,company.ilike.%the han%,company.ilike.%thehan%,company.ilike.%nstage%,company.ilike.%n-stage%,company.ilike.%hyosung%').order('created_at', { ascending: false }))
const apps = await fetchAll(() => sb.from('job_applications').select('job_id,status,created_at').in('job_id', jobs.map((j) => j.id)).order('id'))
const A = {}; for (const a of apps) { A[a.job_id] ||= { n: 0, st: {}, last: '' }; A[a.job_id].n++; A[a.job_id].st[a.status || 'null'] = (A[a.job_id].st[a.status || 'null'] || 0) + 1; if (a.created_at > A[a.job_id].last) A[a.job_id].last = a.created_at }
const codes = jobs.map((j) => j.source_id).filter(Boolean)
const cands = await fetchAll(() => sb.from('ktc_candidates').select('job_code,pipeline_status,applied_at,synced_at').in('job_code', codes).order('id'))
const P = {}; let syncMax = ''
for (const c of cands) { const k = c.job_code; P[k] ||= { total: 0, pass: 0, fail: 0, nw: 0, st: {} }; P[k].total++; P[k].st[c.pipeline_status || 'null'] = (P[k].st[c.pipeline_status || 'null'] || 0) + 1; if (PASS.has(c.pipeline_status)) P[k].pass++; else if (c.pipeline_status === 'new') P[k].nw++; else P[k].fail++; if (c.synced_at > syncMax) syncMax = c.synced_at }
console.log('ktc_candidates synced_at max:', syncMax)
const { data: hires } = await sb.from('ktc_hires').select('code,status').in('code', codes)
console.log('\ncode\t등록\t활성\t회사\t공고\tFYI지원\tKTC총\t스크리닝합격\t탈락\t미스크리닝\t입사\tFYI상태분포\tKTC상태분포')
for (const j of jobs) { const a = A[j.id] || { n: 0, st: {} }; const p = P[j.source_id] || { total: 0, pass: 0, fail: 0, nw: 0, st: {} }; const h = (hires || []).filter((x) => x.code === j.source_id).length
  console.log([j.source_id, j.created_at.slice(5, 10), j.is_active ? 'Y' : 'N', j.company.slice(0, 14), j.title.slice(0, 40), a.n, p.total, p.pass, p.fail, p.nw, h, JSON.stringify(a.st), JSON.stringify(p.st)].join('\t')) }
const jc = await fetchAll(() => sb.from('job_collections').select('slug,title,is_active,job_ids,created_at').order('created_at', { ascending: false }))
console.log('\n공고모음(/l/)에 포함된 대상 공고:')
for (const c of jc) { const hit = jobs.filter((j) => (c.job_ids || []).includes(j.id)); if (hit.length) console.log(' ', c.slug, c.is_active ? 'active' : 'inactive', c.created_at.slice(0, 10), '→', hit.map((j) => j.source_id).join(',')) }
const { data: ev } = await sb.from('events').select('*').limit(1); console.log('\nevents columns:', Object.keys(ev?.[0] || {}).join(', '))
