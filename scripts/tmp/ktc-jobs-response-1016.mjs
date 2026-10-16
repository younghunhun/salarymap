// 읽기 전용: 활성 KTC 공고별 추천메일 발송 수 vs 지원 수 (최근 등록순) — 추가 광고 후보 선정용
import { sb, fetchAll } from '../outreach/lib.mjs'
const jobs = await fetchAll(() => sb.from('jobs').select('id,source_id,title,company,location,created_at,is_active,status').eq('source', 'ktc').eq('is_active', true).order('created_at', { ascending: false }))
const ids = jobs.map((j) => j.id)
const recs = await fetchAll(() => sb.from('job_recommendations').select('job_id,user_id,created_at').in('job_id', ids).order('id'))
const apps = await fetchAll(() => sb.from('job_applications').select('job_id,user_id,created_at,application_source,utm_source').in('job_id', ids).order('id'))
const R = {}, A = {}, A7 = {}, Aad = {}, Acm = {}
const d7 = new Date(Date.now() - 7 * 864e5).toISOString()
for (const r of recs) R[r.job_id] = (R[r.job_id] || 0) + 1
for (const a of apps) { A[a.job_id] = (A[a.job_id] || 0) + 1; if (a.created_at >= d7) A7[a.job_id] = (A7[a.job_id] || 0) + 1; if (a.utm_source === 'meta') Aad[a.job_id] = (Aad[a.job_id] || 0) + 1; if (/coldmail|recommend|similar/.test(a.application_source || '')) Acm[a.job_id] = (Acm[a.job_id] || 0) + 1 }
console.log('code\t등록일\t회사\t공고\t지역\t추천발송\t지원계\t광고(meta)\t콜드메일\t최근7일')
for (const j of jobs) console.log([j.source_id, j.created_at.slice(5, 10), j.company.slice(0, 18), j.title.slice(0, 40), String(j.location || '').slice(0, 10), R[j.id] || 0, A[j.id] || 0, Aad[j.id] || 0, Acm[j.id] || 0, A7[j.id] || 0].join('\t'))
console.log('\napplication_source 분포(활성 KTC 전체):', JSON.stringify(apps.reduce((o, a) => { const k = a.application_source || '(null)'; o[k] = (o[k] || 0) + 1; return o }, {})))
