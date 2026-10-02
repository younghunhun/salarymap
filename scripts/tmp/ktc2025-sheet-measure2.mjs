import { readFileSync } from 'node:fs'
import { sb, env, fetchAll } from '../outreach/lib.mjs'
import { leadId } from '../../lib/ktcMailToken.js'
const j = JSON.parse(readFileSync(process.argv[2], 'utf8'))
let s = j.contentSnippet; s = s.slice(s.indexOf('``` \n') + 5)
const rows = []; let row = [], cur = '', q = false
for (let i = 0; i < s.length; i++) { const c = s[i]
  if (q) { if (c === '"') { if (s[i + 1] === '"') { cur += '"'; i++ } else q = false } else cur += c }
  else if (c === '"') q = true
  else if (c === ',') { row.push(cur); cur = '' }
  else if (c === '\n') { row.push(cur); rows.push(row); row = []; cur = '' }
  else if (c !== '\r') cur += c }
const head = rows.shift()
console.log('header 길이', head.length, '| 행 필드수 분포', Object.entries(rows.reduce((d, r) => (d[r.length] = (d[r.length] || 0) + 1, d), {})).sort((a, b) => b[1] - a[1]).slice(0, 6))
console.log('header[0..12]', head.slice(0, 12))
console.log('row 샘플[0..12]', rows[5].slice(0, 12), rows[400].slice(0, 12))
const norm = e => String(e || '').trim().toLowerCase(); const valid = e => /^[^@\s]+@[^@\s.]+\.[^@\s]+$/.test(e)
const people = new Map()
for (const r of rows) { if (r.length < 6) continue
  const e = norm(r.find(c => valid(norm(c)))); if (!e) continue
  const links = r.flatMap(c => c.match(/https?:\/\/[^\s,"]+/g) || [])
  const p = people.get(e) || { email: e, name: r[3] || '', yoe: r[4] || '', pos: r[5] || '', cv: '', drive: '', links: [] }
  p.drive = p.drive || links.find(u => /drive\.google|docs\.google\.com\/(document|file)/.test(u)) || ''
  p.cv = p.cv || links.find(u => /supabase|utfs\.io/.test(u)) || ''
  p.links.push(...links.map(u => { try { return new URL(u).hostname } catch { return 'bad' } }))
  people.set(e, p) }
const all = [...people.values()]
const type = p => p.cv ? 'supabase/utfs' : p.drive ? 'drive' : p.links.some(h => /ninehire/.test(h)) ? 'ninehire만' : p.links.some(h => /topdev/.test(h)) ? 'topdev만' : p.links.length ? 'other만' : '링크없음'
const cnt = (arr, f) => { const d = {}; for (const x of arr) { const k = f(x); d[k] = (d[k] || 0) + 1 } return d }
console.log('유니크 이메일', all.length, '| CV 유형', cnt(all, type))
const profs = await fetchAll(() => sb.from('user_profiles').select('email').not('email', 'is', null))
const members = new Set(profs.map(p => norm(p.email)))
const evts = await fetchAll(() => sb.from('events').select('event, meta').in('event', ['coldmail_public_sent', 'coldmail_unsub']))
const touched = new Set(evts.filter(e => e.event === 'coldmail_public_sent' && e.meta?.lead).map(e => e.meta.lead))
const unsub = new Set(evts.filter(e => e.event === 'coldmail_unsub' && e.meta?.lead).map(e => e.meta.lead))
const nonMember = all.filter(p => !members.has(p.email))
const fresh = nonMember.filter(p => !touched.has(leadId(p.email)) && !unsub.has(leadId(p.email)))
console.log('FYI 가입済', all.length - nonMember.length, '| 미가입', nonMember.length, '| 미접촉·미거부', fresh.length)
console.log('미가입·미접촉 CV 유형', cnt(fresh, type), '| 이름 있음', fresh.filter(p => /^[\p{L}\s'’.-]{4,}$/u.test(p.name)).length, '| 직무 있음', fresh.filter(p => p.pos).length)
console.log('직무 샘플', [...new Set(fresh.map(p => p.pos))].slice(0, 15))
console.log('ninehire 샘플', rows.flatMap(r => r.flatMap(c => c.match(/https?:\/\/ktc\.ninehire[^\s,"]+/g) || [])).slice(0, 2))
