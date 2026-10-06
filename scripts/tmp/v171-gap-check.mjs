import { sb, fetchAll, fetchBlacklist } from '../outreach/lib.mjs'
const JOB = '5d48e732-d9a8-429b-974b-77e4bb4985a2'
const norm = (v) => (Array.isArray(v) ? v.join(' ') : String(v || ''))
const txt = (p) => [p.position, p.headline, norm(p.desired_roles), JSON.stringify(p.skills || ''), JSON.stringify(p.resume_summary || ''), p.university, p.major].join(' ').toLowerCase()
const wide = (p) => /(h[ồo]\s*ch[íi]\s*minh|hcm|sài gòn|sai gon|saigon|thủ đức|thu duc|bình dương|binh duong|đồng nai|dong nai|biên hòa|bien hoa|long an|호찌민|호치민)/i.test(String(p.location || ''))
const old = (p) => /(h[ồo]\s*ch[íi]\s*minh|hcm|sài gòn|sai gon|thủ đức|thu duc|bình dương|binh duong)/i.test(String(p.location || ''))
const noLoc = (p) => !String(p.location || '').trim()
const cert = (p) => String(p.korean_cert || '').toLowerCase()
const certHi = (p) => /(topik\s*(ii\s*)?(level\s*)?[56]|native|고급|advanced)/i.test(cert(p))
const certMid = (p) => /(topik\s*(ii\s*)?(level\s*)?4|topik\s*4|intermediate|trung cấp|중급|business)/i.test(cert(p))
const krMajor = (p) => /(hàn quốc học|ngôn ngữ hàn|korean (studies|language)|한국어|한국학)/i.test(`${p.major || ''} ${p.university || ''}`)
const krStrong = (p) => /(topik\s*[56]|tiếng hàn (thành thạo|lưu loát)|fluent (in )?korean)/i.test(txt(p))
const gate = (p) => certHi(p) || certMid(p) || krMajor(p) || krStrong(p)
const [pool, recs, apps, unsubs, bl] = await Promise.all([
  fetchAll(() => sb.from('user_profiles').select('id,email,full_name,position,korean_cert,major,university,location,graduation_year,skills,resume_summary,headline,desired_roles').not('email', 'is', null).not('resume_url', 'is', null).order('created_at', { ascending: false })),
  fetchAll(() => sb.from('job_recommendations').select('user_id').eq('job_id', JOB).order('id')),
  fetchAll(() => sb.from('job_applications').select('user_id').eq('job_id', JOB).order('id')),
  fetchAll(() => sb.from('events').select('user_id').eq('event', 'coldmail_unsub').not('user_id', 'is', null).order('id')),
  fetchBlacklist(),
])
const sent = new Set([...recs.map(r => r.user_id), ...apps.map(r => r.user_id)])
const unsub = new Set(unsubs.map(r => r.user_id))
console.log(`이 공고 recommend 누적: ${recs.length}통`)
const seen = new Set(); const miss = []
for (const p of pool) {
  if (!p.email || /likelion/i.test(p.email)) continue
  const e = p.email.toLowerCase(); if (seen.has(e) || unsub.has(p.id) || bl.has(p)) continue; seen.add(e)
  if (sent.has(p.id)) continue
  if ((wide(p) || noLoc(p)) && gate(p)) miss.push(p)
}
console.log(`미발송 잔여(넓은 지역 regex 기준): ${miss.length}명`)
for (const p of miss) console.log(`  ${old(p) ? 'OLD-OK' : noLoc(p) ? 'NOLOC' : 'GEO-MISS'} · ${p.full_name} <${p.email}> · KO:${p.korean_cert || '-'} · 전공:${p.major || '?'} · ${p.location || '위치?'}`)
