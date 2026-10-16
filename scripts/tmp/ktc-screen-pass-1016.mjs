// 서류(스크리닝) 합격 = passed + ready_to_forward + sent_to_company + interviewing + offer + final_passed (ktc-support 7단계 정의, Notion 2026-07-22)
import { sb, fetchAll } from '../outreach/lib.mjs'
const PASS = new Set(['passed', 'ready_to_forward', 'sent_to_company', 'interviewing', 'offer', 'final_passed'])
const jobs = await fetchAll(() => sb.from('jobs').select('id,source_id,title,company,created_at').eq('source', 'ktc').eq('is_active', true).order('created_at', { ascending: false }))
const apps = await fetchAll(() => sb.from('job_applications').select('job_id').in('job_id', jobs.map((j) => j.id)).order('id'))
const A = {}; for (const a of apps) A[a.job_id] = (A[a.job_id] || 0) + 1
const cands = await fetchAll(() => sb.from('ktc_candidates').select('job_code,pipeline_status').order('id'))
const P = {}; for (const c of cands) { const k = c.job_code; if (!k) continue; P[k] ||= { pass: 0, fail: 0, nw: 0 }; if (PASS.has(c.pipeline_status)) P[k].pass++; else if (c.pipeline_status === 'new') P[k].nw++; else P[k].fail++ }
const { data: hires } = await sb.from('ktc_hires').select('code')
const H = {}; for (const h of hires || []) if (h.code) H[h.code] = (H[h.code] || 0) + 1
console.log('code\t등록\t회사\t공고\tFYI지원\t서류합격\t탈락\t미스크리닝\t입사')
for (const j of jobs) { const p = P[j.source_id] || { pass: 0, fail: 0, nw: 0 }; console.log([j.source_id, j.created_at.slice(5, 10), j.company.slice(0, 16), j.title.slice(0, 34), A[j.id] || 0, p.pass, p.fail, p.nw, H[j.source_id] || 0].join('\t')) }
