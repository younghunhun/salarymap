import { createClient } from '@supabase/supabase-js'
import { env } from '../outreach/lib.mjs'
const k = createClient(env.KTC_SUPABASE_URL, env.KTC_SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const { data: c1, error } = await k.from('candidates').select('*').limit(1)
if (error) console.error('candidates err', error.message)
console.log('candidates cols:', Object.keys(c1?.[0] || {}).join(', '))
const all = []; for (let f = 0; ; f += 1000) { const { data } = await k.from('candidates').select('pipeline_status,applied_job,applied_company,sheet_source,updated_at,screened_at,screening_result,screening_note').range(f, f + 999); if (!data?.length) break; all.push(...data); if (data.length < 1000) break }
console.log('rows', all.length)
const d = {}; for (const r of all) d[r.pipeline_status] = (d[r.pipeline_status] || 0) + 1; console.log('pipeline_status:', JSON.stringify(d))
for (const col of ['screening_result']) if (all[0] && col in all[0]) { const e = {}; for (const r of all) e[r[col]] = (e[r[col]] || 0) + 1; console.log(col, JSON.stringify(e)) }
console.log('updated_at max:', all.reduce((m, r) => (r.updated_at > m ? r.updated_at : m), ''))
// 다른 테이블 탐색
for (const t of ['jobs', 'positions', 'job_postings', 'jd_execution', 'interviews', 'pipeline_events', 'candidate_status_history', 'companies']) { const { data, error } = await k.from(t).select('*').limit(1); if (!error) console.log('table', t, 'cols:', Object.keys(data?.[0] || {}).join(', ')) }
