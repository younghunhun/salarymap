import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const env = Object.fromEntries(fs.readFileSync('.env.local', 'utf8').split('\n').filter(l => l.includes('=') && !l.startsWith('#')).map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, '')] }))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const c = async (f) => (await f(sb.from('events').select('id', { count: 'exact', head: true }))).count
console.log('total', await c(q => q))
console.log('person_key null', await c(q => q.is('person_key', null)))
console.log('null but has id', await c(q => q.is('person_key', null).or('user_id.not.is.null,client_id.not.is.null')))
console.log('identity rows', (await sb.from('client_identity').select('client_id', { count: 'exact', head: true })).count)
