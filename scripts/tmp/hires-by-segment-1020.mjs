// 읽기 전용: 7월 이후 KTC 공고의 성사(final_passed/offer) 및 서류통과가 어떤 직군·경력·KO·지역에 몰렸는지 + 인재풀 대비
import { sb, fetchAll } from '../outreach/lib.mjs'
import { roleGroupOf } from '../../lib/cvTagsMatch.js'
const HIRE = new Set(['offer', 'final_passed']), PASS = new Set(['passed', 'ready_to_forward', 'sent_to_company', 'interviewing', 'offer', 'final_passed'])
const koStrong = /(한국어\s*(능숙|가능|필수|우대)|korean[- ]speaking|korean speaker|tiếng hàn|topik\s*[3-6]|comtor|interpreter|phiên dịch|thông dịch|통역)/i
const jobs = await fetchAll(() => sb.from('jobs').select('id,source_id,title,company,role,location,experience_min,requirements,preferred,description,created_at').eq('source', 'ktc').gte('created_at', '2026-07-01').order('created_at'))
const cands = await fetchAll(() => sb.from('ktc_candidates').select('job_code,pipeline_status,position,yoe,city').order('id'))
const J = Object.fromEntries(jobs.map((j) => [j.source_id, j]))
const grp = (j) => roleGroupOf(j.role) || 'other'
const city = (l) => /(hà nội|ha noi|hanoi|hn\b)/i.test(l || '') ? 'HN' : /(đà nẵng|da nang)/i.test(l || '') ? 'DN' : /(hồ chí minh|ho chi minh|hcm|sài gòn)/i.test(l || '') ? 'HCM' : '지방/기타'
const ko = (j) => koStrong.test(`${j.title} ${j.requirements || ''} ${j.preferred || ''} ${j.description || ''}`)
const exp = (j) => (j.experience_min || 0) >= 3 ? '3y+' : (j.experience_min || 0) >= 1 ? '1-2y' : '0y'
const agg = {}
for (const c of cands) { const j = J[c.job_code]; if (!j) continue; const k = `${grp(j)}\t${exp(j)}\t${ko(j) ? 'KO' : '-'}\t${city(j.location)}`; const a = (agg[k] ||= { n: 0, pass: 0, hire: 0, jobs: new Set() }); a.n++; a.jobs.add(j.id); if (PASS.has(c.pipeline_status)) a.pass++; if (HIRE.has(c.pipeline_status)) a.hire++ }
const jobsBy = {}; for (const j of jobs) { const k = `${grp(j)}\t${exp(j)}\t${ko(j) ? 'KO' : '-'}\t${city(j.location)}`; jobsBy[k] = (jobsBy[k] || 0) + 1 }
console.log(`KTC 공고 ${jobs.length} · 후보 ${cands.length} · 서류통과+ ${cands.filter((c) => PASS.has(c.pipeline_status)).length} · 성사(offer/final) ${cands.filter((c) => HIRE.has(c.pipeline_status)).length}`)
console.log('\n직군\t경력\tKO\t지역\t공고\t후보\t통과+\t성사')
for (const [k, v] of Object.entries(agg).sort((a, b) => b[1].hire - a[1].hire || b[1].pass - a[1].pass)) console.log(`${k}\t${jobsBy[k] || 0}\t${v.n}\t${v.pass}\t${v.hire}`)
const sum = (f) => { const d = {}; for (const [k, v] of Object.entries(agg)) { const kk = f(k.split('\t')); const a = (d[kk] ||= { jobs: 0, n: 0, pass: 0, hire: 0 }); a.jobs += jobsBy[k] || 0; a.n += v.n; a.pass += v.pass; a.hire += v.hire } return Object.entries(d).sort((a, b) => b[1].hire - a[1].hire).map(([k, v]) => `${k}: 공고 ${v.jobs} · 후보 ${v.n} · 통과+ ${v.pass} · 성사 ${v.hire}`).join('\n  ') }
console.log('\n[직군별]\n  ' + sum((s) => s[0])); console.log('\n[경력별]\n  ' + sum((s) => s[1])); console.log('\n[KO]\n  ' + sum((s) => s[2])); console.log('\n[지역]\n  ' + sum((s) => s[3]))
console.log('\n[KO × 경력]\n  ' + sum((s) => `${s[2]} ${s[1]}`)); console.log('\n[직군 × 경력]\n  ' + sum((s) => `${s[0]} ${s[1]}`))
const ps = {}; for (const c of cands) ps[c.pipeline_status || 'null'] = (ps[c.pipeline_status || 'null'] || 0) + 1; console.log('\npipeline_status:', JSON.stringify(ps))
