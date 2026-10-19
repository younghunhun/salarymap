// 4개사 + 광고 후보 공고 — TO(Số lượng) · FYI 지원 · 스크리닝 합격 한 표에
import { sb, fetchAll } from '../outreach/lib.mjs'
const PASS = new Set(['passed', 'ready_to_forward', 'sent_to_company', 'interviewing', 'offer', 'final_passed'])
const jobs = await fetchAll(() => sb.from('jobs').select('id,source_id,title,company,is_active,description,requirements,summary,headcount,recruit_count').eq('source', 'ktc').eq('is_active', true)
  .or('company.ilike.%da-sh%,company.ilike.%first marketing%,company.ilike.%the han%,company.ilike.%nstage%').order('created_at', { ascending: false }))
const to = (j) => { if (j.headcount || j.recruit_count) return String(j.headcount || j.recruit_count); const t = [j.description, j.requirements, j.summary].join('\n'); const m = t.match(/(?:số lượng|số lượng tuyển|slots?|headcount|quantity|openings?|모집\s*인원|인원)\s*[:：]?\s*(\d+)/i) || t.match(/tuyển\s*(\d+)\s*(?:người|bạn|vị trí|nhân sự)/i) || t.match(/(\d+)\s*(?:người|bạn|vị trí)\b/i); return m ? m[1] : '?' }
const apps = await fetchAll(() => sb.from('job_applications').select('job_id').in('job_id', jobs.map((j) => j.id)).order('id'))
const A = {}; for (const a of apps) A[a.job_id] = (A[a.job_id] || 0) + 1
const cands = await fetchAll(() => sb.from('ktc_candidates').select('job_code,pipeline_status').in('job_code', jobs.map((j) => j.source_id).filter(Boolean)).order('id'))
const P = {}; for (const c of cands) { P[c.job_code] ||= { pass: 0, nw: 0 }; if (PASS.has(c.pipeline_status)) P[c.job_code].pass++; else if (c.pipeline_status === 'new') P[c.job_code].nw++ }
console.log('code\t회사\t공고\tTO\tFYI지원\t합격\t미스크리닝\t합격/TO')
for (const j of jobs) { const p = P[j.source_id] || { pass: 0, nw: 0 }; const t = to(j); console.log([j.source_id, j.company.slice(0, 10), j.title.slice(0, 38), t, A[j.id] || 0, p.pass, p.nw, t === '?' ? '-' : (p.pass / Number(t)).toFixed(1) + 'x'].join('\t')) }
