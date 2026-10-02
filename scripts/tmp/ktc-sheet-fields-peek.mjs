import { createClient } from '@supabase/supabase-js'
import { env } from '../outreach/lib.mjs'
const ktc = createClient(env.KTC_SUPABASE_URL, env.KTC_SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const rows = []
for (let f = 0; ; f += 1000) { const { data } = await ktc.from('candidates').select('email, full_name, position, applied_date, applied_job, applied_company, sheet_source, created_at, cv_url').order('created_at').range(f, f + 999); rows.push(...data); if (data.length < 1000) break }
const drive = rows.filter(r => /drive\.google/.test(r.cv_url || ''))
const fmt = {}; for (const r of drive) { const d = String(r.applied_date || ''); const k = /^\d{4}-\d{2}-\d{2}/.test(d) ? 'iso' : /^\d{1,2}\/\d{1,2}\/\d{4}/.test(d) ? 'dmy' : d ? 'other:' + d.slice(0, 12) : 'empty'; fmt[k] = (fmt[k] || 0) + 1 }
console.log('applied_date 포맷(drive rows)', fmt)
const src = {}; for (const r of drive) src[r.sheet_source] = (src[r.sheet_source] || 0) + 1; console.log('drive sheet_source', src)
const pos = drive.map(r => r.position || ''); console.log('position 빈값', pos.filter(p => !p).length, '| 코드접두', pos.filter(p => /^[A-Z]{2,6}\d{3,4}/.test(p)).length, '| 40자 초과', pos.filter(p => p.length > 40).length, '/', pos.length)
console.log('position 샘플', [...new Set(pos)].slice(0, 25))
console.log('applied_job 샘플', [...new Set(drive.map(r => r.applied_job))].slice(0, 10))
console.log('company 빈값', drive.filter(r => !r.applied_company).length)
console.log('이름 샘플', drive.map(r => r.full_name).filter((_, i) => i % 150 === 0))
console.log('applied_date 샘플', drive.map(r => r.applied_date).filter((_, i) => i % 300 === 0))
