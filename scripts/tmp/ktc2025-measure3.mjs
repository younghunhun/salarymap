import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import { sb, env, fetchAll } from '../outreach/lib.mjs'
import { leadId } from '../../lib/ktcMailToken.js'
const s = readFileSync(new URL('../../data/ktc2025-master.csv', import.meta.url), 'utf8')
const rows = []; let row = [], cur = '', q = false
for (let i = 0; i < s.length; i++) { const c = s[i]
  if (q) { if (c === '"') { if (s[i + 1] === '"') { cur += '"'; i++ } else q = false } else cur += c }
  else if (c === '"') q = true
  else if (c === ',') { row.push(cur); cur = '' }
  else if (c === '\n') { row.push(cur); rows.push(row); row = []; cur = '' }
  else if (c !== '\r') cur += c }
if (cur || row.length) { row.push(cur); rows.push(row) }
const head = rows.shift()
const recs = rows.filter(r => r.length >= head.length - 5).map(r => Object.fromEntries(head.map((h, i) => [h, (r[i] || '').trim()])))
console.log('열', head.length, '| 행', rows.length, '| 정상 행', recs.length, '| 필드수 분포', JSON.stringify(Object.entries(rows.reduce((d, r) => (d[r.length] = (d[r.length] || 0) + 1, d), {})).sort((a, b) => b[1] - a[1]).slice(0, 4)))
const norm = e => String(e || '').trim().toLowerCase(); const valid = e => /^[^@\s]+@[^@\s.]+\.[^@\s]+$/.test(e)
const cnt = (arr, f) => { const d = {}; for (const x of arr) { const k = f(x); d[k] = (d[k] || 0) + 1 } return d }
console.log('Unsubscribed 값 분포', cnt(recs, r => r['Unsubscribed'] || '(빈값)'))
console.log('Email Address not found 분포', cnt(recs, r => r['Email Address not found'] || '(빈값)'))
const people = new Map()
for (const r of recs) {
  const e = norm(r['Email Address']) || norm(r['20. Thông tin liên hệ - Email']); if (!valid(e)) continue
  const p = people.get(e) || { email: e, rows: [] }; p.rows.push(r); people.set(e, p)
}
const pick = (p, k) => p.rows.map(r => r[k]).find(Boolean) || ''
const all = [...people.values()].map(p => ({ email: p.email, unsub: p.rows.some(r => /true|yes|1/i.test(r['Unsubscribed'])), name: pick(p, 'Name_Data') || pick(p, '2.1. Họ tên (Tiếng Việt)'),
  pos: pick(p, 'Position_Data') || pick(p, 'Vị trí/Position'), yoe: pick(p, 'YOE_Data') || pick(p, '12. Years of Experience'), uni: pick(p, '6. Trường đại học bạn theo học'),
  cv: pick(p, 'CV_Data'), form: pick(p, '16. Upload CV'), src: pick(p, 'First Data Source') || pick(p, 'Data Source'), ts: pick(p, 'Timestamp Data Summitted') }))
const type = u => !u ? 'empty' : /drive\.google|docs\.google/.test(u) ? 'drive' : /supabase|utfs\.io/.test(u) ? 'direct' : /ninehire/.test(u) ? 'ninehire' : /topdev/.test(u) ? 'topdev' : /^https?:/.test(u) ? 'other' : 'junk'
const bestCv = p => [p.cv, p.form].find(u => /drive\.google|docs\.google|supabase|utfs\.io/.test(u || '')) || ''
console.log('유니크 이메일', all.length, '| 시트 Unsubscribed', all.filter(p => p.unsub).length)
console.log('CV_Data 유형', cnt(all, p => type(p.cv)), '| 16.Upload CV 유형', cnt(all, p => type(p.form)))
console.log('First Data Source', cnt(all, p => p.src || '?'))
const profs = await fetchAll(() => sb.from('user_profiles').select('email').not('email', 'is', null))
const members = new Set(profs.map(p => norm(p.email)))
const evts = await fetchAll(() => sb.from('events').select('event, meta').in('event', ['coldmail_public_sent', 'coldmail_unsub']))
const touched = new Set(evts.filter(e => e.event === 'coldmail_public_sent' && e.meta?.lead).map(e => e.meta.lead))
const unsub = new Set(evts.filter(e => e.event === 'coldmail_unsub' && e.meta?.lead).map(e => e.meta.lead))
const ktc = createClient(env.KTC_SUPABASE_URL, env.KTC_SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const kc = []; for (let f = 0; ; f += 1000) { const { data } = await ktc.from('candidates').select('email').range(f, f + 999); kc.push(...data); if (data.length < 1000) break }
const in2026 = new Set(kc.map(c => norm(c.email)))
const nonMember = all.filter(p => !members.has(p.email))
const eligible = nonMember.filter(p => !p.unsub && !touched.has(leadId(p.email)) && !unsub.has(leadId(p.email)))
console.log('\nFYI 가입済', all.length - nonMember.length, '| 미가입', nonMember.length, '| 시트 unsub·우리 unsub·기접촉 제외 →', eligible.length, '| 2026 시트 겹침(eligible 중)', eligible.filter(p => in2026.has(p.email)).length)
const withCv = eligible.filter(bestCv)
console.log('eligible CV 유형', cnt(eligible, p => type(bestCv(p)) === 'empty' ? type(p.cv) + '(비임포트)' : type(bestCv(p))))
console.log('임포트 가능 CV 보유', withCv.length, '| 이름 있음', withCv.filter(p => /^[\p{L}\s'’.-]{4,}$/u.test(p.name)).length, '| 직무 있음', withCv.filter(p => p.pos).length, '| 대학 있음', withCv.filter(p => p.uni).length)
console.log('직무 샘플', [...new Set(withCv.map(p => p.pos))].slice(0, 20))
console.log('타임스탬프 월 분포', cnt(withCv, p => (p.ts.match(/^(\d{1,2})\/\d{1,2}\/(\d{4})/) || []).slice(1).reverse().join('-') || '?'))
console.log('샘플', withCv.filter((_, i) => i % Math.ceil(withCv.length / 8) === 0).map(p => `${p.name} | ${p.pos} | ${p.yoe} | ${p.uni} | ${p.src} | ${bestCv(p).slice(0, 50)}`))
