import { writeFileSync } from 'node:fs'
import { sb, fetchAll } from '../outreach/lib.mjs'
import { leadId } from '../../lib/ktcMailToken.js'
const profs = await fetchAll(() => sb.from('user_profiles').select('email, created_at').not('email', 'is', null))
const evts = await fetchAll(() => sb.from('events').select('event, meta').eq('event', 'coldmail_unsub'))
const unsub = new Set(evts.map(e => e.meta?.lead).filter(Boolean))
writeFileSync('/private/tmp/claude-501/-Users-wiseungju-salarymap/c19f48b7-8789-4e22-96aa-2367b1c9f8e2/scratchpad/flags.json', JSON.stringify({
  members: Object.fromEntries(profs.map(p => [p.email.trim().toLowerCase(), p.created_at.slice(0, 10)])),
  unsubLeads: [...unsub],
}))
console.log('ok', profs.length, unsub.size)
