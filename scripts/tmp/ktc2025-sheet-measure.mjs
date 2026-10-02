// KTC WORKER 2025 마스터시트(Drive 커넥터 스니펫, 끝부분 잘림) 구조 실측 — 발송 가능 구조인지 확인용
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import { sb, env, fetchAll } from '../outreach/lib.mjs'
import { leadId } from '../../lib/ktcMailToken.js'
const j = JSON.parse(readFileSync(process.argv[2], 'utf8'))
let s = j.contentSnippet; s = s.slice(s.indexOf('``` \n') + 5)
function parseCsv(text) {
  const rows = []; let row = [], cur = '', q = false
  for (let i = 0; i < text.length; i++) { const c = text[i]
    if (q) { if (c === '"') { if (text[i + 1] === '"') { cur += '"'; i++ } else q = false } else cur += c }
    else if (c === '"') q = true
    else if (c === ',') { row.push(cur); cur = '' }
    else if (c === '\n') { row.push(cur); rows.push(row); row = []; cur = '' } else if (c !== '\r') cur += c }
  if (cur || row.length) { row.push(cur); rows.push(row) }
  const head = rows.shift(); return { head, rows: rows.filter(r => r.length > 5).map(r => Object.fromEntries(head.map((h, i) => [h, (r[i] || '').trim()]))) }
}
const { head, rows } = parseCsv(s)
console.log('열 수', head.length, '| 행', rows.length, '| 마지막 ID', rows[rows.length - 1]?.ID)
const norm = e => String(e || '').trim().toLowerCase()
const valid = e => /^[^@\s]+@[^@\s.]+\.[^@\s]+$/.test(e)
const type = u => !u ? 'empty' : /drive\.google|docs\.google/.test(u) ? 'drive' : /supabase/.test(u) ? 'supabase' : /ninehire/.test(u) ? 'ninehire' : /topdev/.test(u) ? 'topdev' : /utfs\.io/.test(u) ? 'utfs' : /^https?:/.test(u) ? 'other' : 'junk'
const people = new Map()
for (const r of rows) {
  const e = norm(r['Email Address'] || r['20. Thông tin liên hệ - Email']); if (!valid(e)) continue
  const p = people.get(e) || { email: e, cv: '', form: '', name: '', pos: '', uni: '', unsub: '', src: '' }
  p.cv = p.cv || r['CV_Data']; p.form = p.form || r['16. Upload CV']; p.name = p.name || r['Name_Data'] || r['2.1. Họ tên (Tiếng Việt)']
  p.pos = p.pos || r['Position_Data'] || r['Vị trí/Position']; p.uni = p.uni || r['6. Trường đại học bạn theo học']; p.unsub = p.unsub || r['Unsubscribed']; p.src = p.src || r['First Data Source']
  people.set(e, p)
}
const all = [...people.values()]
console.log('유니크 이메일', all.length, '| Unsubscribed 표기', all.filter(p => p.unsub && p.unsub !== 'FALSE' && p.unsub !== '0').length)
const cnt = (arr, f) => { const d = {}; for (const x of arr) { const k = f(x); d[k] = (d[k] || 0) + 1 } return d }
console.log('CV_Data 유형', cnt(all, p => type(p.cv)))
console.log('16.Upload CV 유형', cnt(all, p => type(p.form)))
const bestCv = p => [p.form, p.cv].find(u => /drive\.google|supabase|utfs\.io/.test(u || '')) || ''
console.log('임포트 후보(Drive/utfs/supabase 중 하나라도)', all.filter(bestCv).length)
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
const fresh = nonMember.filter(p => !touched.has(leadId(p.email)) && !unsub.has(leadId(p.email)))
console.log('\nFYI 가입済', all.length - nonMember.length, '| 미가입', nonMember.length, '| 그중 우리 메일 접촉 0·미거부', fresh.length, '| 2026 시트와 겹침(미가입 중)', nonMember.filter(p => in2026.has(p.email)).length)
console.log('미가입·미접촉 중 임포트 후보 CV 보유', fresh.filter(bestCv).length, '| 이름 있음', fresh.filter(p => p.name).length, '| 직무 있음', fresh.filter(p => p.pos).length, '| 대학 있음', fresh.filter(p => p.uni).length)
console.log('미가입·미접촉 CV 유형', cnt(fresh, p => type(bestCv(p)) === 'empty' ? type(p.cv) : type(bestCv(p))))
console.log('샘플 Drive 링크', fresh.filter(p => /drive/.test(bestCv(p))).slice(0, 3).map(p => bestCv(p)))
console.log('샘플', fresh.slice(0, 5).map(p => `${p.name} | ${p.pos} | ${p.uni} | ${p.src}`))
