// V217 외부/미파싱 확장 풀 실측: (A) KTC candidates DB (B) 이력서 미업로드 가입자 (C) korean_cert 미스캔 디자이너
import { createClient } from '@supabase/supabase-js'
import { sb, env, fetchAll } from '../outreach/lib.mjs'
const V217 = '02c64540-273f-42b2-ac0f-b2c30315673d', V218 = 'd86744f2-0e7c-4288-9ead-3d1f09fa07fb'
const gRe = /(graphic|đồ họa|do hoa|thiết kế|thiet ke|design|photoshop|illustrator|indesign|adobe|mỹ thuật|my thuat|visual|creative)/i
const koRe = /(korean|tiếng hàn|tieng han|topik|한국어|hàn quốc|han quoc)/i
const hcmRe = /(h[ồo]\s*ch[íi]\s*minh|hcm|sài gòn|sai gon|saigon|thủ đức|thu duc|bình thạnh|bình dương|binh duong|đồng nai|dong nai|biên hòa|long an|호치민|호찌민|hóc môn|gò vấp|tân bình|tân phú|bình tân|phú nhuận|quận \d|district \d)/i

// ── (A) KTC
const ktc = createClient(env.KTC_SUPABASE_URL, env.KTC_SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const { data: one } = await ktc.from('candidates').select('*').limit(1)
console.log('[A] KTC candidates 컬럼:', Object.keys(one?.[0] || {}).join(','))
const kc = await fetchAll(() => ktc.from('candidates').select('*').order('created_at'))
console.log(`    rows ${kc.length}`)
const kt = (r) => JSON.stringify(r).toLowerCase()
const kDesign = kc.filter((r) => gRe.test(`${r.position || ''} ${r.applied_job || ''} ${r.major || ''} ${r.desired_position || ''}`))
console.log(`    position/applied_job/major 에 디자인 계열 단어: ${kDesign.length}`)
const posDist = {}; for (const r of kDesign) { const k = String(r.position || r.applied_job || '').slice(0, 40); posDist[k] = (posDist[k] || 0) + 1 }
console.log('    상위 position:', Object.entries(posDist).sort((a, b) => b[1] - a[1]).slice(0, 15).map(([k, v]) => `${k}(${v})`).join(' · '))
const kDesignAll = kc.filter((r) => gRe.test(kt(r)))
console.log(`    전체 행 JSON 에 디자인 단어: ${kDesignAll.length} · 그중 한국어 단어도: ${kDesignAll.filter((r) => koRe.test(kt(r))).length} · 전체 중 한국어 단어: ${kc.filter((r) => koRe.test(kt(r))).length}`)
const srcDist = {}; for (const r of kc) srcDist[r.sheet_source] = (srcDist[r.sheet_source] || 0) + 1
console.log('    sheet_source:', JSON.stringify(srcDist))

// ── 우리 DB
const profs = await fetchAll(() => sb.from('user_profiles').select('id,email,full_name,position,desired_roles,headline,major,university,location,korean_cert,english_cert,skills,resume_summary,experiences,resume_url,portfolio_url,created_at,yoe_months').not('email', 'is', null).order('created_at', { ascending: false }))
const { data: cols } = await sb.from('user_profiles').select('*').limit(1)
console.log('\nuser_profiles 컬럼:', Object.keys(cols?.[0] || {}).join(','))
const emailSet = new Set(profs.map((p) => p.email.toLowerCase()))
const withCv = new Set(profs.filter((p) => p.resume_url).map((p) => p.email.toLowerCase()))
const kNew = kDesignAll.filter((r) => r.email && !emailSet.has(String(r.email).trim().toLowerCase()))
const kNoCv = kDesignAll.filter((r) => r.email && emailSet.has(String(r.email).trim().toLowerCase()) && !withCv.has(String(r.email).trim().toLowerCase()))
console.log(`    KTC 디자인 단어 ${kDesignAll.length} 중 FYI 미가입 ${kNew.length} · 가입했으나 CV 없음 ${kNoCv.length} · cv_url 보유 ${kDesignAll.filter((r) => r.cv_url).length}`)
for (const r of kDesignAll.slice(0, 25)) console.log(`      ${r.full_name} <${r.email}> · pos=${String(r.position || '').slice(0, 40)} · job=${String(r.applied_job || '').slice(0, 40)} · co=${String(r.applied_company || '').slice(0, 20)} · cv=${r.cv_url ? 'Y' : '-'} · FYI=${emailSet.has(String(r.email || '').toLowerCase()) ? (withCv.has(String(r.email || '').toLowerCase()) ? 'cv' : 'nocv') : '미가입'}`)

// ── (B) 이력서 미업로드 가입자
const norm = (v) => (Array.isArray(v) ? v.join(' ') : String(v || ''))
const txt = (p) => [p.position, p.headline, norm(p.desired_roles), JSON.stringify(p.skills || ''), JSON.stringify(p.experiences || ''), JSON.stringify(p.resume_summary || ''), p.major, p.university].join(' ').toLowerCase()
const unsubs = await fetchAll(() => sb.from('events').select('user_id').eq('event', 'coldmail_unsub').not('user_id', 'is', null).order('id'))
const un = new Set(unsubs.map((r) => r.user_id))
const noCv = profs.filter((p) => !p.resume_url && !un.has(p.id) && !/likelion/i.test(p.email))
for (const p of noCv) p.__t = txt(p)
const nDesign = noCv.filter((p) => [p.position, ...(p.desired_roles || [])].includes('Design') || gRe.test(p.__t))
const nKo = noCv.filter((p) => p.korean_cert || koRe.test(p.__t))
console.log(`\n[B] 이력서 미업로드 가입자 ${noCv.length} · 디자인 시그널 ${nDesign.length} · 한국어 시그널 ${nKo.length} · 둘 다 ${nDesign.filter((p) => p.korean_cert || koRe.test(p.__t)).length} · 둘 다 × HCMC/미기재 ${nDesign.filter((p) => (p.korean_cert || koRe.test(p.__t)) && (hcmRe.test(p.location || '') || !p.location)).length}`)
console.log(`    미업로드자 중 position 채움 ${noCv.filter((p) => p.position).length} · 아무 필드도 없음 ${noCv.filter((p) => !p.position && !p.desired_roles?.length && !p.korean_cert && !p.major).length}`)
for (const p of nDesign.filter((p) => p.korean_cert || koRe.test(p.__t)).slice(0, 15)) console.log(`      ${p.full_name} <${p.email}> · ${p.position} · ${p.location || '?'} · ko=${p.korean_cert || '텍스트'} · ${p.created_at.slice(0, 10)}`)

// ── (C) CV 보유 디자이너 중 korean_cert 미스캔
const recs = await fetchAll(() => sb.from('job_recommendations').select('user_id,job_id').in('job_id', [V217, V218]).order('id'))
const s217 = new Set(recs.filter((r) => r.job_id === V217).map((r) => r.user_id)), s218 = new Set(recs.filter((r) => r.job_id === V218).map((r) => r.user_id))
const cv = profs.filter((p) => p.resume_url && !un.has(p.id) && !/likelion/i.test(p.email))
for (const p of cv) p.__t = txt(p)
const isDesign = (p) => [p.position, ...(p.desired_roles || [])].includes('Design')
const graphicRe = /(graphic|đồ họa|do hoa|thiết kế đồ họa|visual design|brand design|print design|key visual|illustrat|photoshop|illustrator|indesign|adobe)/i
const dCore = cv.filter((p) => (isDesign(p) || graphicRe.test(p.__t)) && (hcmRe.test(p.location || '') || !p.location))
const cnt = (arr, f) => arr.filter(f).length
console.log(`\n[C] CV 보유 × 디자인 시그널 × HCMC/미기재 ${dCore.length} — korean_cert null ${cnt(dCore, (p) => p.korean_cert == null)} · 빈문자 ${cnt(dCore, (p) => p.korean_cert === '')} · 'None/없음' 류 ${cnt(dCore, (p) => /^(none|없음|no|n\/a|-)$/i.test(String(p.korean_cert || '').trim()))} · 값 있음 ${cnt(dCore, (p) => p.korean_cert && !/^(none|없음|no|n\/a|-)$/i.test(String(p.korean_cert).trim()))}`)
console.log(`    null 인 사람 중 resume_summary 없음(미파싱) ${cnt(dCore, (p) => p.korean_cert == null && !p.resume_summary)} · english_cert 도 null ${cnt(dCore, (p) => p.korean_cert == null && p.english_cert == null)} · V218 기수신 ${cnt(dCore, (p) => p.korean_cert == null && s218.has(p.id))} · V217 기수신 ${cnt(dCore, (p) => p.korean_cert == null && s217.has(p.id))}`)
const koVals = {}; for (const p of dCore) { const k = String(p.korean_cert ?? 'NULL').slice(0, 20); koVals[k] = (koVals[k] || 0) + 1 }
console.log('    korean_cert 값 분포:', Object.entries(koVals).sort((a, b) => b[1] - a[1]).slice(0, 20).map(([k, v]) => `${k}(${v})`).join(' · '))
