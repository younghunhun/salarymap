// 최근 한달 일별 가입자 수 (auth.users 기준, @likelion.net 등 내부·밴 계정 제외, VN 일자)
import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'
import { isExcludedSignup } from '../../lib/admin-metrics.js'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const vnDay = (iso) => new Date(new Date(iso).getTime() + 7 * 36e5).toISOString().slice(0, 10)

const users = []
for (let p = 1; ; p++) {
  const { data, error } = await supabase.auth.admin.listUsers({ page: p, perPage: 1000 })
  if (error) throw error
  const u = data?.users || []
  users.push(...u)
  if (u.length < 1000) break
}

const since = '2026-09-01'
const byDay = {}
let excluded = 0
for (const u of users) {
  const d = vnDay(u.created_at)
  if (d < since) continue
  if (isExcludedSignup(u)) { excluded++; continue }
  byDay[d] = (byDay[d] || 0) + 1
}
const days = Object.keys(byDay).sort()
let total = 0
for (const d of days) { total += byDay[d]; console.log(d, byDay[d]) }
console.log('TOTAL', total, 'excluded', excluded, 'allUsers', users.length)
