import { readFileSync, writeFileSync } from 'fs'
import { sb } from '../outreach/lib.mjs'
const rows = JSON.parse(readFileSync(process.argv[2])); const dir = process.argv[3]
const { data } = await sb.from('user_profiles').select('email,resume_url').in('email', rows.map(r => r.email))
for (const [i, p] of data.entries()) {
  let url = p.resume_url
  if (!/^https?:/.test(url)) { const { data: s } = await sb.storage.from('resumes').createSignedUrl(url, 600); url = s?.signedUrl }
  try { const r = await fetch(url); writeFileSync(`${dir}/${p.email}.pdf`, Buffer.from(await r.arrayBuffer())); } catch (e) { console.log('fail', p.email, p.resume_url) }
}
console.log(data.length, data.slice(0,2).map(d=>d.resume_url))
