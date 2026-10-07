import { createClient } from '@supabase/supabase-js'
import { sb, env, fetchAll } from '../outreach/lib.mjs'
const V217 = '02c64540-273f-42b2-ac0f-b2c30315673d', V218 = 'd86744f2-0e7c-4288-9ead-3d1f09fa07fb'
const ktc = createClient(env.KTC_SUPABASE_URL, env.KTC_SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const { data: one } = await ktc.from('candidates').select('*').limit(1)
console.log('KTC 컬럼 전체:', Object.keys(one[0]).join(','))
const kc = await fetchAll(() => ktc.from('candidates').select('*').order('created_at'))
const posRe = /(graphic|đồ họa|do hoa|thiết kế|thiet ke|designer|design\b|mỹ thuật|visual|creative|illustrat|photoshop)/i
const notDesign = /(developer|engineer|software|embedded|fullstack|backend|frontend|qa\b|tester|data|marketing|sales|accountant|hr\b|content)/i
const koRe = /(korean|tiếng hàn|tieng han|topik|한국어|hàn quốc|han quoc|hangul)/i
const hcmRe = /(h[ồo]\s*ch[íi]\s*minh|hcm|sài gòn|sai gon|saigon|thủ đức|thu duc|bình thạnh|bình dương|binh duong|đồng nai|dong nai|biên hòa|long an|호치민|호찌민|hóc môn|gò vấp|tân bình|tân phú|bình tân|phú nhuận|quận \d|district \d)/i
const posTxt = (r) => `${r.position || ''} ${r.applied_job || ''}`
const des = kc.filter((r) => posRe.test(posTxt(r)) && !(notDesign.test(posTxt(r)) && !/graphic|đồ họa|designer/i.test(posTxt(r))))
console.log(`\n디자인 직무(position/applied_job) ${des.length}`)
const by = (arr, f) => { const d = {}; for (const r of arr) { const k = String(f(r) ?? 'null').slice(0, 30); d[k] = (d[k] || 0) + 1 } return Object.entries(d).sort((a, b) => b[1] - a[1]) }
console.log('  source:', by(des, (r) => r.sheet_source).map(([k, v]) => `${k}(${v})`).join(' · '))
console.log('  position 상위:', by(des, (r) => r.position || r.applied_job).slice(0, 20).map(([k, v]) => `${k}(${v})`).join(' · '))
const koCols = Object.keys(one[0]).filter((k) => /kor|topik|lang|hàn/i.test(k))
console.log('  한국어 관련 컬럼:', koCols.join(',') || '없음')
const rowTxt = (r) => JSON.stringify(r).toLowerCase()
const koSig = (r) => koCols.some((c) => r[c] && !/^(none|no|없음|-|n\/a|0)$/i.test(String(r[c]).trim())) || koRe.test(`${r.skills || ''} ${r.notes || ''} ${r.university || ''} ${r.major || ''} ${r.phone_interview_note || ''} ${r.korean_level || ''}`)
const desKo = des.filter(koSig)
console.log(`  디자인 × 한국어 시그널 ${desKo.length} · 디자인 × 행JSON 어디든 한국어 단어 ${des.filter((r) => koRe.test(rowTxt(r))).length}`)
console.log('  city 분포(디자인):', by(des, (r) => r.city).slice(0, 10).map(([k, v]) => `${k}(${v})`).join(' · '))

const profs = await fetchAll(() => sb.from('user_profiles').select('id,email,resume_url').not('email', 'is', null).order('created_at'))
const byEmail = new Map(profs.map((p) => [p.email.toLowerCase(), p]))
const recs = await fetchAll(() => sb.from('job_recommendations').select('user_id,job_id').in('job_id', [V217, V218]).order('id'))
const s217 = new Set(recs.filter((r) => r.job_id === V217).map((r) => r.user_id)), s218 = new Set(recs.filter((r) => r.job_id === V218).map((r) => r.user_id))
const stat = (r) => { const p = byEmail.get(String(r.email || '').trim().toLowerCase()); if (!p) return '미가입'; if (s217.has(p.id)) return 'V217기수신'; if (s218.has(p.id)) return 'V218기수신'; return p.resume_url ? '가입·CV' : '가입·noCV' }
console.log('\n디자인 전체 FYI 상태:', by(des, stat).map(([k, v]) => `${k}(${v})`).join(' · '))
console.log('디자인×한국어 FYI 상태:', by(desKo, stat).map(([k, v]) => `${k}(${v})`).join(' · '))
console.log('디자인×한국어×HCMC/미기재:', desKo.filter((r) => !r.city || hcmRe.test(r.city)).length, '· 그중 미가입/V217미수신:', desKo.filter((r) => (!r.city || hcmRe.test(r.city)) && stat(r) !== 'V217기수신').length)
console.log('\n디자인×한국어 표본 30:')
for (const r of desKo.slice(0, 30)) console.log(`  ${r.full_name} <${r.email}> · ${String(r.position || r.applied_job).slice(0, 38)} · ${r.city || '?'} · src=${r.sheet_source} · ${koCols.map((c) => `${c}=${String(r[c] ?? '').slice(0, 14)}`).join(' ')} · cv=${r.cv_url ? 'Y' : '-'} · ${stat(r)} · ${String(r.applied_date || r.created_at).slice(0, 10)}`)
console.log('\n디자인 전체 미가입 × HCMC/미기재 × 한국어 없음 (V218 후보 겸 V217 2차):', des.filter((r) => stat(r) === '미가입' && (!r.city || hcmRe.test(r.city)) && !koSig(r)).length)
