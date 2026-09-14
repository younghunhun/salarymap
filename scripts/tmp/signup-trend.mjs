import { sb } from '/Users/wiseungju/salarymap/scripts/outreach/lib.mjs'

// daily-summary 봇과 동일 식: auth.users 전체 페이지네이션 + likelion/밴 제외, ICT(UTC+7) 일자 버킷
const users = []
let page = 1
while (true) {
  const { data: { users: batch }, error } = await sb.auth.admin.listUsers({ page, perPage: 1000 })
  if (error) { console.error('listUsers error:', error.message); break }
  if (!batch || batch.length === 0) break
  users.push(...batch)
  if (batch.length < 1000) break
  page++
}
console.log('total auth users:', users.length)

const excluded = (u) => {
  const e = String(u.email || '').toLowerCase()
  if (e.endsWith('@likelion.net')) return true
  if (u.banned_until && new Date(u.banned_until) > new Date()) return true
  return false
}

const ictDate = (iso) => new Date(new Date(iso).getTime() + 7 * 3600 * 1000).toISOString().slice(0, 10)
const DOW = ['일', '월', '화', '수', '목', '금', '토']

const byDay = {}
for (const u of users) {
  if (excluded(u)) continue
  const d = ictDate(u.created_at)
  if (d >= '2026-08-24') (byDay[d] ||= []).push(u)
}

for (const d of Object.keys(byDay).sort()) {
  const dow = DOW[new Date(d + 'T00:00:00Z').getUTCDay()]
  const bar = '█'.repeat(byDay[d].length)
  console.log(`${d} (${dow})  ${String(byDay[d].length).padStart(3)}  ${bar}`)
}
