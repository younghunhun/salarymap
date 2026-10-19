import { createClient } from '@supabase/supabase-js'
import { env } from '../outreach/lib.mjs'
const k = createClient(env.KTC_SUPABASE_URL, env.KTC_SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const { data: one, error } = await k.from('jobs').select('*').limit(1); if (error) console.error(error.message)
console.log('ktc jobs cols:', Object.keys(one?.[0]||{}).join(', '))
const CODES = ['V247','V246','V239','V231','V230','V229','V233','V228','V234','V236','V227','V235','V226','V237','V238','V223','V222','V218','V217','V32']
const codeCol = Object.keys(one?.[0]||{}).find(c => /^(code|job_code|source_id)$/.test(c)) || 'code'
const { data, error: e2 } = await k.from('jobs').select('*').in(codeCol, CODES); if (e2) console.error(e2.message)
for (const j of data||[]) { const hc = Object.entries(j).filter(([c]) => /headcount|quantity|slot|count|num|số|인원/i.test(c)); console.log(j[codeCol], (j.title||j.position||'').slice(0,34), JSON.stringify(Object.fromEntries(hc))) }
