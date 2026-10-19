import { createClient } from '@supabase/supabase-js'
import { env } from '../outreach/lib.mjs'
const k = createClient(env.KTC_LANDING_SUPABASE_URL, env.KTC_LANDING_SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const { data, error } = await k.from('jobs').select('*'); if (error) { console.error(error.message); process.exit(1) }
console.log('cols:', Object.keys(data[0]||{}).join(', '), '| rows', data.length)
const codeCol = ['code','job_code','source_id','ktc_code'].find(c => c in (data[0]||{}))
console.log('codeCol:', codeCol)
const CODES = new Set(['V247','V246','V239','V231','V230','V229','V233','V228','V234','V236','V227','V235','V226','V237','V238','V223','V222','V218','V217','V32'])
const rows = data.filter(j => CODES.has(String(j[codeCol]||'').toUpperCase()) || /da-sh|nstage|the han|first marketing/i.test(j.company_name||''))
for (const j of rows) console.log(j[codeCol], '|', (j.company_name||'').slice(0,12), '|', (j.title||'').slice(0,36), '| headcount', j.headcount, '| active', j.is_active)
console.log('\nheadcount 채워진 비율 전체:', data.filter(j => j.headcount).length, '/', data.length)
