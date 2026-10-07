import { sb, fetchAll } from '../outreach/lib.mjs'
const V217 = '02c64540-273f-42b2-ac0f-b2c30315673d'
const norm = (v) => (Array.isArray(v) ? v.join(' ') : String(v || ''))
const txt = (p) => { const exp = Array.isArray(p.experiences) ? p.experiences.map((e) => `${e.title || e.position || ''} ${e.company || ''} ${e.description || ''}`).join(' ') : ''; return [p.position, p.headline, norm(p.desired_roles), JSON.stringify(p.skills || ''), exp, JSON.stringify(p.resume_summary || ''), p.major].join(' ').toLowerCase() }
const roles = (p) => [p.position, ...(p.desired_roles || [])].filter(Boolean)
const isDesign = (p) => roles(p).includes('Design')
const graphicRe = /(graphic design|graphic designer|graphic\b|đồ họa|do hoa|thiết kế đồ họa|visual design|brand design|print design|key visual|illustrat)/i
const adobeRe = /(photoshop|illustrator|indesign|adobe)/i
const broadTerms = ['thiết kế','thiet ke','design','canva','figma','poster','banner','key visual','layout','typography']
const koRe = /(korean|tiếng hàn|topik|한국어)/i
const koSig = (p) => !!p.korean_cert || koRe.test(p.__t)
const hcmA = (p) => /(h[ồo]\s*ch[íi]\s*minh|hcm|sài gòn|sai gon|saigon|thủ đức|thu duc|bình thạnh|bình dương|binh duong|đồng nai|dong nai|biên hòa|bien hoa|long an)/i.test(String(p.location || ''))
const hcmMissRe = /(호치민|호찌민|hồ chí minh|hochiminh|tphcm|tp\.?\s*hcm|hóc môn|hoc mon|gò vấp|go vap|tân bình|tan binh|tân phú|tan phu|bình tân|binh tan|phú nhuận|phu nhuan|củ chi|cu chi|nhà bè|nha be|quận \d|district \d|q\.?\s*\d|bình chánh|binh chanh|vũng tàu|vung tau)/i
const noLoc = (p) => !String(p.location || '').trim()
const [pool, unsubs, recs] = await Promise.all([
  fetchAll(() => sb.from('user_profiles').select('id,email,full_name,position,desired_roles,headline,major,yoe_months,location,korean_cert,skills,resume_summary,experiences,portfolio_url').not('email', 'is', null).not('resume_url', 'is', null).order('created_at', { ascending: false })),
  fetchAll(() => sb.from('events').select('user_id').eq('event', 'coldmail_unsub').not('user_id', 'is', null).order('id')),
  fetchAll(() => sb.from('job_recommendations').select('user_id').eq('job_id', V217).order('id')),
])
const un = new Set(unsubs.map((r) => r.user_id)), sent = new Set(recs.map((r) => r.user_id))
const seen = new Set(); const fresh = []
for (const p of pool) { if (!p.email || /likelion/i.test(p.email)) continue; const e = p.email.toLowerCase(); if (seen.has(e) || un.has(p.id) || sent.has(p.id)) continue; seen.add(e); p.__t = txt(p); fresh.push(p) }
const ko = fresh.filter(koSig)
console.log('[A] 한국어 시그널 × 타지역 판정 124명 중 location 이 사실상 HCMC권으로 보이는 사람(정규식 누락):')
const miss = ko.filter((p) => !hcmA(p) && !noLoc(p) && hcmMissRe.test(String(p.location)))
for (const p of miss) console.log(`  ${p.full_name} <${p.email}> · ${p.position} · loc="${p.location}" · ko=${p.korean_cert || '텍스트'} · graphic/adobe=${graphicRe.test(p.__t) || adobeRe.test(p.__t)} · Design직군=${isDesign(p)}`)
console.log(`  → ${miss.length}명, 그중 그래픽/Adobe ${miss.filter((p) => graphicRe.test(p.__t) || adobeRe.test(p.__t)).length}`)
const locs = {}
for (const p of ko.filter((p) => !hcmA(p) && !noLoc(p) && !hcmMissRe.test(String(p.location)))) { const k = String(p.location).slice(0, 18); locs[k] = (locs[k] || 0) + 1 }
console.log('  나머지 타지역 location 분포 상위:', Object.entries(locs).sort((a, b) => b[1] - a[1]).slice(0, 15).map(([k, v]) => `${k}(${v})`).join(' · '))

console.log('\n[B] 레이어 b(비Design × 넓은 디자인 텍스트 × HCMC권) 35명 — 어떤 단어에 걸렸나:')
const b = ko.filter((p) => (hcmA(p) || noLoc(p)) && !isDesign(p) && !graphicRe.test(p.__t) && !adobeRe.test(p.__t) && broadTerms.some((t) => p.__t.includes(t)))
for (const p of b) {
  const hits = broadTerms.filter((t) => p.__t.includes(t))
  const i = p.__t.indexOf(hits[0]); const ctx = p.__t.slice(Math.max(0, i - 45), i + 45).replace(/\s+/g, ' ')
  console.log(`  ${p.full_name} · ${p.position} · ko=${p.korean_cert || '텍스트'} · [${hits.join(',')}] …${ctx}…`)
}
