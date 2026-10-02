import { createClient } from '@supabase/supabase-js'
import { sb, env } from '../outreach/lib.mjs'
import { leadId } from '../../lib/ktcMailToken.js'
const IMPORTABLE = /^https:\/\/[a-z0-9]+\.supabase\.co\/storage\/v1\/object\/public\//
async function fetchAll(client, build) { const out = []; for (let f = 0; ; f += 1000) { const { data, error } = await build().range(f, f + 999); if (error) throw error; out.push(...(data || [])); if (!data || data.length < 1000) break } return out }
const norm = (e) => (e || '').trim().toLowerCase()
const ktc = createClient(env.KTC_SUPABASE_URL, env.KTC_SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const kc = await fetchAll(ktc, () => ktc.from('candidates').select('email, cv_url, created_at').order('created_at', { ascending: true }))
const profs = await fetchAll(sb, () => sb.from('user_profiles').select('email').not('email', 'is', null).order('email'))
const members = new Set(profs.map(p => norm(p.email)))
const evts = await fetchAll(sb, () => sb.from('events').select('event, meta').in('event', ['coldmail_unsub','coldmail_public_sent']).order('created_at'))
const unsub = new Set(evts.filter(e=>e.event==='coldmail_unsub').map(e => e.meta?.lead).filter(Boolean))
const touched = new Set(evts.filter(e=>e.event==='coldmail_public_sent').map(e => e.meta?.lead).filter(Boolean))
const people = new Map()
for (const c of kc) { const e = norm(c.email); if (!/^[^@\s]+@[^@\s.]+\.[^@\s]+$/.test(e) || members.has(e) || unsub.has(leadId(e))) continue
  const p = people.get(e) || { email: e, urls: [], last: '' }; const u = (c.cv_url||'').trim(); if (u) p.urls.push(u); const d=(c.created_at||'').slice(0,10); if(d>p.last)p.last=d; people.set(e, p) }
const fid = (u) => (u.match(/\/d\/([A-Za-z0-9_-]{20,})/) || u.match(/[?&]id=([A-Za-z0-9_-]{20,})/) || [])[1]
const drive = [...people.values()].filter(p => !p.urls.some(u => IMPORTABLE.test(u)) && p.urls.some(u => /drive\.google\.com|docs\.google\.com/.test(u)))
console.log('drive 리드', drive.length, '| 그중 접촉 0', drive.filter(p=>!touched.has(leadId(p.email))).length, '| id 추출 실패', drive.filter(p=>!p.urls.some(u=>fid(u))).length)
const ids = drive.map(p => p.urls.map(fid).find(Boolean)).filter(Boolean)
const step = Math.floor(ids.length / 24); console.log(JSON.stringify(ids.filter((_, i) => i % step === 0).slice(0, 24)))
