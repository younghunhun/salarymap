import { createClient } from '@supabase/supabase-js'
import { writeFileSync } from 'fs'
import { sb, env } from '../outreach/lib.mjs'
const ktc = createClient(env.KTC_SUPABASE_URL, env.KTC_SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const { data: ev } = await sb.from('events').select('user_id, meta, created_at').eq('event', 'coldmail_job_apply').like('meta->>campaign', 'mw1119%').order('created_at')
const uids = [...new Set(ev.map(e => e.user_id))], jids = [...new Set(ev.map(e => e.meta.job_id))]
const [{ data: profs }, { data: jobs }] = await Promise.all([
  sb.from('user_profiles').select('id,email,full_name,phone').in('id', uids),
  sb.from('jobs').select('id,title,company,source_id').in('id', jids),
])
const P = Object.fromEntries(profs.map(p => [p.id, p])), J = Object.fromEntries(jobs.map(j => [j.id, j]))
const emails = profs.map(p => p.email?.toLowerCase()).filter(Boolean)
const { data: cands } = await ktc.from('candidates').select('email,phone,jd_code,applied_job,llm_score,pipeline_status,llm_summary,created_at').in('email', emails)
const rows = ev.map(e => {
  const p = P[e.user_id] || {}, j = J[e.meta.job_id] || {}
  const code = (j.source_id || '').toString()
  const cs = (cands || []).filter(c => c.email?.toLowerCase() === p.email?.toLowerCase())
  const codeOf = c => (c.jd_code || (c.applied_job || '').replace(/^"/, '').split(/\s*[-_]\s*/)[0] || '').trim().toUpperCase()
  const c = cs.filter(c => code && codeOf(c) === code.toUpperCase()).sort((a, b) => b.created_at.localeCompare(a.created_at))[0] || null
  const ph = cs.map(c => c.phone).find(Boolean)
  return { name: p.full_name, email: p.email, phone: p.phone || ph || '', code, company: j.company, title: j.title,
    score: c?.llm_score ?? '', status: c?.pipeline_status ?? '', forced: !!c?.llm_summary?.mw_forced_pass, campaign: e.meta.campaign, applied: e.created_at, otherCodes: cs.map(codeOf).join('|') }
})
writeFileSync(process.argv[2], JSON.stringify(rows, null, 1))
for (const r of rows) console.log([r.code, r.name, r.phone, r.score, r.status, r.otherCodes].join(' · '))
