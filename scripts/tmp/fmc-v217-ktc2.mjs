import { createClient } from '@supabase/supabase-js'
import { sb, env, fetchAll } from '../outreach/lib.mjs'
const V217 = '02c64540-273f-42b2-ac0f-b2c30315673d', V218 = 'd86744f2-0e7c-4288-9ead-3d1f09fa07fb'
const koRe = /(korean|tiếng hàn|tieng han|topik|한국어|hàn quốc|han quoc|hangul)/i
const hcmRe = /(h[ồo]\s*ch[íi]\s*minh|hcm|sài gòn|sai gon|saigon|thủ đức|thu duc|bình thạnh|bình dương|binh duong|đồng nai|dong nai|biên hòa|long an|호치민|호찌민|hóc môn|gò vấp|tân bình|tân phú|bình tân|phú nhuận|quận \d|district \d)/i
const posRe = /(graphic|đồ họa|do hoa|thiết kế|thiet ke|designer|design\b|mỹ thuật|visual|creative|illustrat|photoshop)/i
const notDesign = /(developer|engineer|software|embedded|fullstack|backend|frontend|qa\b|tester|data|marketing|sales|accountant|hr\b|content)/i

// (1) ktc_claim_profiles
const { data: c1, error: e1 } = await sb.from('ktc_claim_profiles').select('*').limit(1)
if (e1) console.log('ktc_claim_profiles:', e1.message)
else {
  console.log('[1] ktc_claim_profiles 컬럼:', Object.keys(c1?.[0] || {}).join(','))
  const cp = await fetchAll(() => sb.from('ktc_claim_profiles').select('*').order('email'))
  const t = (r) => JSON.stringify(r).toLowerCase()
  const koP = cp.filter((r) => (r.korean_cert && !/^(none|no|없음|-|n\/a)$/i.test(String(r.korean_cert).trim())) || koRe.test(t(r)))
  const dP = cp.filter((r) => /(graphic|đồ họa|photoshop|illustrator|indesign|visual design|designer)/i.test(t(r)))
  console.log(`    rows ${cp.length} · korean_cert 값 있음 ${cp.filter((r) => r.korean_cert).length} · 한국어 시그널 ${koP.length} · 그래픽/Adobe 시그널 ${dP.length} · 둘 다 ${dP.filter((r) => koP.includes(r)).length}`)
  const both = dP.filter((r) => koP.includes(r))
  for (const r of both.slice(0, 20)) console.log(`      ${r.full_name || r.name || '?'} · ${r.email || r.lead_id || ''} · ${r.position || ''} · ${r.location || ''} · ko=${String(r.korean_cert || '텍스트').slice(0, 16)} · ${r.parsed_at?.slice(0, 10)}`)
  const kv = {}; for (const r of cp) { const k = String(r.korean_cert ?? 'NULL').slice(0, 14); kv[k] = (kv[k] || 0) + 1 }
  console.log('    korean_cert 분포:', Object.entries(kv).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([k, v]) => `${k}(${v})`).join(' · '))
}

// (2) KTC candidates 디자인 직무 × 행 어딘가 한국어 단어 104
const ktc = createClient(env.KTC_SUPABASE_URL, env.KTC_SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const kc = await fetchAll(() => ktc.from('candidates').select('*').order('created_at'))
const posTxt = (r) => `${r.position || ''} ${r.applied_job || ''}`
const des = kc.filter((r) => posRe.test(posTxt(r)) && !(notDesign.test(posTxt(r)) && !/graphic|đồ họa|designer/i.test(posTxt(r))))
const profs = await fetchAll(() => sb.from('user_profiles').select('id,email,resume_url,korean_cert').not('email', 'is', null).order('created_at'))
const byEmail = new Map(profs.map((p) => [p.email.toLowerCase(), p]))
const recs = await fetchAll(() => sb.from('job_recommendations').select('user_id,job_id').in('job_id', [V217, V218]).order('id'))
const s217 = new Set(recs.filter((r) => r.job_id === V217).map((r) => r.user_id)), s218 = new Set(recs.filter((r) => r.job_id === V218).map((r) => r.user_id))
const stat = (r) => { const p = byEmail.get(String(r.email || '').trim().toLowerCase()); if (!p) return '미가입'; if (s217.has(p.id)) return 'V217기수신'; if (s218.has(p.id)) return 'V218기수신'; return p.resume_url ? '가입·CV' : '가입·noCV' }
const where = (r) => ['skills', 'llm_summary', 'university', 'phone_interview_note', 'applied_company', 'applied_job', 'position', 'rejection_reason', 'source'].filter((c) => koRe.test(String(r[c] || '')))
const desKo = des.filter((r) => koRe.test(JSON.stringify(r)))
console.log(`\n[2] KTC 디자인 직무 ${des.length} 중 한국어 단어 보유 ${desKo.length}`)
const wd = {}; for (const r of desKo) for (const c of where(r)) wd[c] = (wd[c] || 0) + 1
console.log('    어느 컬럼에:', JSON.stringify(wd))
const real = desKo.filter((r) => where(r).some((c) => ['skills', 'llm_summary', 'university', 'phone_interview_note'].includes(c)))
console.log(`    본인 역량 컬럼(skills/llm_summary/univ/note)에 한국어: ${real.length} · FYI 상태:`, Object.entries(real.reduce((d, r) => (d[stat(r)] = (d[stat(r)] || 0) + 1, d), {})).map(([k, v]) => `${k}(${v})`).join(' · '))
console.log(`    그중 HCMC/미기재 × V217 미수신: ${real.filter((r) => (!r.city || hcmRe.test(r.city)) && stat(r) !== 'V217기수신').length}`)
for (const r of real) {
  const c = where(r)[0]; const s = String(r[c]); const i = s.toLowerCase().search(koRe)
  console.log(`      ${r.full_name} <${r.email}> · ${String(r.position || r.applied_job).slice(0, 34)} · ${r.city || '?'} · src=${r.sheet_source} · ${stat(r)} · cv=${r.cv_url ? 'Y' : '-'} · ${c}: …${s.slice(Math.max(0, i - 50), i + 50).replace(/\s+/g, ' ')}…`)
}
console.log('\n    llm_summary 채워진 비율(디자인):', des.filter((r) => r.llm_summary).length, '/', des.length, '· skills 채워진:', des.filter((r) => r.skills).length)
