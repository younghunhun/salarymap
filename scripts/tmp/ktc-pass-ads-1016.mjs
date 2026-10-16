import { sb, fetchAll } from '../outreach/lib.mjs'
const CODES = ['V177','V172','V171','V83','V187','V215','V218','V213','V210','V212','V214','V211','V242','V246','V244','V243','V247','V224','R220','V222','V223','V239','V241','V199','V216','V221','V248','V249','V250','V253']
const cands = await fetchAll(() => sb.from('ktc_candidates').select('job_code,pipeline_status').in('job_code', CODES).order('id'))
const { data: hires } = await sb.from('ktc_hires').select('code,company,position1,status,hired_at,interview_month').in('code', CODES)
const per = {}; for (const c of cands) { per[c.job_code] ||= {}; per[c.job_code][c.pipeline_status] = (per[c.job_code][c.pipeline_status] || 0) + 1 }
console.log('code\tnew\tready_to_forward\tsent_to_company\tinterviewing\tpassed\tfinal_passed\trejected+screen_fail\t입사(ktc_hires)')
for (const c of CODES) { const p = per[c] || {}; const h = (hires || []).filter((x) => x.code === c); console.log([c, p.new || 0, p.ready_to_forward || 0, p.sent_to_company || 0, p.interviewing || 0, p.passed || 0, p.final_passed || 0, (p.rejected || 0) + (p.screening_failed || 0), h.length ? h.map((x) => `${x.status || '?'}${x.hired_at ? ' ' + x.hired_at : ''}${x.interview_month ? ' 면접 ' + x.interview_month : ''}`).join('; ') : 0].join('\t')) }
// V-series 전체 vs R-series 전체 파이프라인 분포 비교
const all = await fetchAll(() => sb.from('ktc_candidates').select('job_code,pipeline_status').order('id'))
const agg = { V: {}, R: {}, other: {} }
for (const c of all) { const k = /^V\d/.test(c.job_code || '') ? 'V' : /^R\d/.test(c.job_code || '') ? 'R' : 'other'; agg[k][c.pipeline_status] = (agg[k][c.pipeline_status] || 0) + 1 }
console.log('\n시리즈별 파이프라인 분포:', JSON.stringify(agg))
