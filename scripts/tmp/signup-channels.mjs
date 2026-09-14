import { sb } from '/Users/wiseungju/salarymap/scripts/outreach/lib.mjs'

// signup-paths.js 와 동일 귀속: user_profiles.utm > 첫 이벤트 utm > 첫 이벤트 referrer
const users = []
let page = 1
while (true) {
  const { data: { users: batch }, error } = await sb.auth.admin.listUsers({ page, perPage: 1000 })
  if (error || !batch?.length) break
  users.push(...batch)
  if (batch.length < 1000) break
  page++
}

const excluded = (u) => {
  const e = String(u.email || '').toLowerCase()
  return e.endsWith('@likelion.net') || (u.banned_until && new Date(u.banned_until) > new Date())
}
const ictDate = (iso) => new Date(new Date(iso).getTime() + 7 * 3600 * 1000).toISOString().slice(0, 10)

const cohort = users.filter((u) => !excluded(u)).map((u) => ({ ...u, d: ictDate(u.created_at) }))
  .filter((u) => u.d >= '2026-09-05' && u.d <= '2026-09-13')
const ids = cohort.map((u) => u.id)

const profiles = {}
for (let i = 0; i < ids.length; i += 200) {
  const { data } = await sb.from('user_profiles').select('id, utm_source, utm_campaign').in('id', ids.slice(i, i + 200))
  for (const p of data || []) profiles[p.id] = p
}

const firstEv = {}
for (let i = 0; i < ids.length; i += 50) {
  const { data } = await sb.from('events').select('user_id, meta, created_at').in('user_id', ids.slice(i, i + 50)).order('created_at', { ascending: true })
  for (const e of data || []) if (!(e.user_id in firstEv)) firstEv[e.user_id] = e
}

const refHost = (r) => { if (!r) return null; try { return new URL(r).hostname.replace('www.', '') } catch { return r } }
function classify(source, referrer) {
  const s = (source || '').toLowerCase()
  if (['meta', 'mt', 'facebook', 'fb', 'instagram', 'ig'].includes(s)) return 'meta_ad'
  if (['google', 'tiktok'].includes(s)) return 'other_ad'
  if (s === 'threads') return 'threads'
  if (s) return `utm:${s}`
  const h = refHost(referrer)
  if (!h) return 'direct'
  if (/salary|localhost|vercel/.test(h)) return 'internal'
  if (/google|bing/.test(h)) return 'organic_search'
  if (/facebook|instagram|t\.co|twitter|linkedin|zalo|threads/.test(h)) return 'social'
  return `ref:${h}`
}

const byDay = {}
for (const u of cohort) {
  const p = profiles[u.id]
  const m = firstEv[u.id]?.meta || null
  const source = p?.utm_source || m?.utm_source || m?.source || null
  const referrer = m?.referrer || null
  const ch = firstEv[u.id] ? classify(source, referrer) : (source ? classify(source, null) : 'no_event')
  ;(byDay[u.d] ||= {})[ch] = ((byDay[u.d] ||= {})[ch] || 0) + 1
}

for (const d of Object.keys(byDay).sort()) {
  const total = Object.values(byDay[d]).reduce((a, b) => a + b, 0)
  const parts = Object.entries(byDay[d]).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(' · ')
  console.log(`${d}  총${String(total).padStart(3)}  |  ${parts}`)
}
