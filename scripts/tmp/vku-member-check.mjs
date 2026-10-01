// VKU Job Matching Weekend(9/30) 명단 → FYI 가입자/기수신/수신거부 대조. 읽기 전용.
import { readFileSync } from 'node:fs'
import { sb, fetchAll } from '../outreach/lib.mjs'
import { leadId } from '../../lib/ktcMailToken.js'

const CSV = '/private/tmp/claude-501/-Users-wiseungju-salarymap/c19f48b7-8789-4e22-96aa-2367b1c9f8e2/scratchpad/vku_emails.csv'
const lines = readFileSync(CSV, 'utf8').split('\n').slice(1).filter(Boolean)
const rows = lines.map(l => {
  const m = l.match(/^([^,]*),("(?:[^"]|"")*"|[^,]*),([^,]*),/)
  return m ? { source: m[1], email: m[3].trim().toLowerCase() } : null
}).filter(r => r && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(r.email))
const bySrc = { interview: new Set(), attend: new Set() }
for (const r of rows) bySrc[r.source].add(r.email)
const all = new Set([...bySrc.interview, ...bySrc.attend])

const profs = await fetchAll(() => sb.from('user_profiles').select('email, created_at, resume_url, position').not('email', 'is', null))
const member = new Map(profs.map(p => [p.email.trim().toLowerCase(), p]))
const evts = await fetchAll(() => sb.from('events').select('event, meta').in('event', ['coldmail_public_sent', 'coldmail_unsub']))
const sent = new Set(evts.filter(e => e.event === 'coldmail_public_sent' && e.meta?.lead).map(e => e.meta.lead))
const unsub = new Set(evts.filter(e => e.event === 'coldmail_unsub' && e.meta?.lead).map(e => e.meta.lead))
const cands = await fetchAll(() => sb.from('ktc_candidates').select('email'))
const ktc = new Set(cands.map(c => (c.email || '').trim().toLowerCase()).filter(Boolean))

const stat = (set, label) => {
  const m = [...set].filter(e => member.has(e))
  const withCv = m.filter(e => member.get(e).resume_url)
  const recent = m.filter(e => member.get(e).created_at >= '2026-09-26')
  const s = [...set].filter(e => sent.has(leadId(e)))
  const u = [...set].filter(e => unsub.has(leadId(e)))
  const k = [...set].filter(e => ktc.has(e))
  const sendable = [...set].filter(e => !member.has(e) && !unsub.has(leadId(e)))
  console.log(`${label}: 총 ${set.size} | FYI 가입 ${m.length}(이력서 有 ${withCv.length}, 9/26 이후 가입 ${recent.length}) | 공개 콜드메일 기수신 ${s.length} | 수신거부 ${u.length} | KTC 지원이력 ${k.length} | 미가입·미거부 = ${sendable.length}`)
}
stat(bySrc.interview, '면접지원(VKU 1)')
stat(bySrc.attend, 'QR출석(VKU 2)')
stat(all, '합계(중복 제거)')
console.log('가입자 샘플:', [...all].filter(e => member.has(e)).slice(0, 10).map(e => `${e}(${member.get(e).created_at.slice(0, 10)})`).join(', '))
