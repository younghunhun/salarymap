// 20261110_funnel_person_key.sql 적용 후 1회 실행 — events.person_key 과거 행 백필 (배치 RPC 반복)
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const env = Object.fromEntries(fs.readFileSync('.env.local', 'utf8').split('\n').filter(l => l.includes('=') && !l.startsWith('#')).map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, '')] }))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
let total = 0
for (;;) {
  const t = Date.now()
  const { data, error } = await sb.rpc('_backfill_person_key', { p_limit: Number(process.argv[2] || 5000) })
  if (error) { console.error(error); process.exit(1) }
  total += data
  console.log(`+${data} (${Date.now() - t}ms) total ${total}`)
  if (!data) break
}
