// 공고 본문에 11/19 호치민 대면 조건이 들어간 KTC 공고. 읽기 전용.
import { sb, fetchAll } from '../outreach/lib.mjs'
const jobs = await fetchAll(() => sb.from('jobs').select('id,source_id,title,company,is_active,created_at,description,raw_payload').eq('source', 'ktc').order('created_at', { ascending: false }))
const re = /19\/11|11\/19|19 th[aá]ng 11|matching week/i
for (const j of jobs) { const t = (j.description || '') + JSON.stringify(j.raw_payload?.ktc || {}); const m = t.match(new RegExp('.{0,60}(' + re.source + ').{0,60}', 'i')); if (m) console.log(j.source_id, j.is_active ? 'ON' : 'off', j.company, '|', m[0].replace(/\s+/g, ' ')) }
