import { createClient } from '@supabase/supabase-js'
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const vnDay = (iso) => new Date(new Date(iso).getTime() + 7 * 36e5).toISOString().slice(0, 10)
const users = []
for (let p = 1; ; p++) { const { data } = await s.auth.admin.listUsers({ page: p, perPage: 1000 }); users.push(...data.users); if (data.users.length < 1000) break }
const ids = users.filter(u => { const d = vnDay(u.created_at); return d >= '2026-09-15' && d <= '2026-09-18' }).map(u => u.id)
const prov = {}; for (const u of users) { const d = vnDay(u.created_at); if (d >= '2026-09-15' && d <= '2026-09-18') { const k = (u.app_metadata?.provider || '?'); prov[k] = (prov[k] || 0) + 1 } }
console.log('provider', prov)
const utm = {}
for (let i = 0; i < ids.length; i += 200) {
  const { data } = await s.from('user_profiles').select('id, utm').in('id', ids.slice(i, i + 200))
  for (const r of data || []) { const k = r.utm?.utm_source || r.utm?.source || (r.utm ? JSON.stringify(r.utm).slice(0, 40) : 'none'); utm[k] = (utm[k] || 0) + 1 }
}
console.log('utm', Object.entries(utm).sort((a, b) => b[1] - a[1]).slice(0, 10))
