// 11/19 호치민 November Matching Week 참가 공고 찾기. 읽기 전용.
import { sb, fetchAll } from '../outreach/lib.mjs'
const jobs = await fetchAll(() => sb.from('jobs').select('id,source_id,title,company,location,is_active,created_at,description,raw_payload').eq('source', 'ktc').order('created_at', { ascending: false }))
const hit = jobs.filter(j => j.raw_payload?.ktc?.is_matching_week || /matching week|19\/11|11\/19|매칭위크|phỏng vấn trực tiếp/i.test(j.description || '') )
for (const j of hit) console.log([j.source_id, j.created_at.slice(0,10), j.is_active?'ON':'off', j.raw_payload?.ktc?.is_matching_week?'MWflag':'-', j.company, j.title.slice(0,50), (j.location||'').slice(0,20)].join(' | '))
console.log('total ktc', jobs.length, 'hit', hit.length)
