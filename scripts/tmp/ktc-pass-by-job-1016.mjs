import { sb, fetchAll } from '../outreach/lib.mjs'
const cands = await fetchAll(() => sb.from('ktc_candidates').select('job_code,applied_job,applied_company,pipeline_status,sheet_source,synced_at,applied_at').order('id'))
console.log('synced_at max:', cands.reduce((m, r) => (r.synced_at > m ? r.synced_at : m), ''), '| applied_at max:', cands.reduce((m, r) => ((r.applied_at || '') > m ? r.applied_at : m), ''))
const jobs = await fetchAll(() => sb.from('jobs').select('source_id,title,company,is_active,created_at').eq('source', 'ktc').order('created_at', { ascending: false }))
const per = {}
for (const c of cands) { const k = c.job_code || '(none)'; per[k] ||= { total: 0 }; per[k].total++; per[k][c.pipeline_status || '(null)'] = (per[k][c.pipeline_status || '(null)'] || 0) + 1 }
const S = ['passed', 'sent_to_company', 'interviewing', 'final_passed']
console.log('\ncode\t회사\t공고\t활성\tKTC총\t서류통과\t기업전달\t면접중\t최종합격\t탈락')
for (const j of jobs) { const p = per[j.source_id]; if (!p && j.created_at < '2026-09-01') continue; const rej = (p?.rejected || 0) + (p?.screening_failed || 0); console.log([j.source_id, j.company.slice(0, 16), j.title.slice(0, 32), j.is_active ? 'Y' : 'N', p?.total || 0, ...S.map((s) => p?.[s] || 0), rej].join('\t')) }
const { data: hires } = await sb.from('ktc_hires').select('code,company,position1,status,interview_month,hired_at').order('id')
console.log('\nktc_hires (입사/계약) 회사별:'); const h = {}; for (const r of hires || []) { const k = r.company; h[k] ||= { n: 0, ing: 0, codes: new Set() }; h[k].n++; if (r.status === 'Ing') h[k].ing++; if (r.code) h[k].codes.add(r.code) }
for (const [k, v] of Object.entries(h).sort((a, b) => b[1].n - a[1].n)) console.log(' ', k, v.n, '(진행중', v.ing + ')', [...v.codes].slice(0, 6).join(','))
