import { createClient } from '@supabase/supabase-js'
import { sb, env, fetchAll } from '../outreach/lib.mjs'
const V217 = '02c64540-273f-42b2-ac0f-b2c30315673d', V218 = 'd86744f2-0e7c-4288-9ead-3d1f09fa07fb'
const emails = ['hoailinhn1997@gmail.com', 'nhuhuynhnguyen29@gmail.com', 'linhchia12@gmail.com', 'dotuananh.19092001@gmail.com', 'vyle16052000@gmail.com', 'doc5.st2thuyettrinh3.1@gmail.com', 'ngocthienhuong.art@gmail.com', 'lehoangtuyetngan10a2@gmail.com', 'annnx245@gmail.com']
const { data: ps } = await sb.from('user_profiles').select('id,email,full_name,position,location,korean_cert,yoe_months,portfolio_url,skills').in('email', emails)
const ids = ps.map((p) => p.id)
const [{ data: apps }, { data: recs }] = await Promise.all([
  sb.from('job_applications').select('user_id,job_id,created_at,status').in('user_id', ids).in('job_id', [V217, V218]),
  sb.from('job_recommendations').select('user_id,job_id,created_at').in('user_id', ids).in('job_id', [V217, V218]),
])
const J = (j) => (j === V217 ? 'V217' : 'V218')
for (const p of ps) {
  const a = (apps || []).filter((x) => x.user_id === p.id).map((x) => `지원 ${J(x.job_id)} ${x.created_at.slice(0, 10)}${x.status ? '/' + x.status : ''}`)
  const r = (recs || []).filter((x) => x.user_id === p.id).map((x) => `추천 ${J(x.job_id)} ${x.created_at.slice(0, 10)}`)
  console.log(`${p.full_name} <${p.email}> · ${p.position} · ${p.location || '?'} · ko=${p.korean_cert || '-'} · ${Math.round((p.yoe_months || 0) / 12 * 10) / 10}y · 포폴=${p.portfolio_url ? 'Y' : '-'} · ${[...a, ...r].join(' · ') || '접점 없음'} · skills=${JSON.stringify(p.skills || '').slice(0, 90)}`)
}
// KTC 미가입 디자이너 234 city 세부
const ktc = createClient(env.KTC_SUPABASE_URL, env.KTC_SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const kc = await fetchAll(() => ktc.from('candidates').select('email,full_name,position,applied_job,city,sheet_source,cv_url,applied_date').order('created_at'))
const posRe = /(graphic|đồ họa|do hoa|thiết kế|thiet ke|designer|design\b|mỹ thuật|visual|creative|illustrat|photoshop)/i
const notDesign = /(developer|engineer|software|embedded|fullstack|backend|frontend|qa\b|tester|data|marketing|sales|accountant|hr\b|content)/i
const posTxt = (r) => `${r.position || ''} ${r.applied_job || ''}`
const des = kc.filter((r) => posRe.test(posTxt(r)) && !(notDesign.test(posTxt(r)) && !/graphic|đồ họa|designer/i.test(posTxt(r))))
const profs = await fetchAll(() => sb.from('user_profiles').select('email').not('email', 'is', null).order('created_at'))
const es = new Set(profs.map((p) => p.email.toLowerCase()))
const seen = new Set()
const newD = des.filter((r) => { const e = String(r.email || '').trim().toLowerCase(); if (!e || es.has(e) || seen.has(e)) return false; seen.add(e); return true })
const hcm = /(h[ồo]\s*ch[íi]\s*minh|hcm|sài gòn|thủ đức|bình thạnh|bình dương|đồng nai|quận \d)/i
console.log(`\nKTC 미가입 디자이너(이메일 유니크) ${newD.length} · HCMC 명시 ${newD.filter((r) => hcm.test(r.city || '')).length} · 미기재 ${newD.filter((r) => !r.city).length} · 타지역 ${newD.filter((r) => r.city && !hcm.test(r.city)).length} · cv ${newD.filter((r) => r.cv_url).length}`)
const g = newD.filter((r) => /graphic|đồ họa|thiết kế đồ họa/i.test(posTxt(r)))
console.log(`  그래픽 직무 명시 ${g.length} (HCMC/미기재 ${g.filter((r) => !r.city || hcm.test(r.city)).length}) · 직무 상위:`, Object.entries(newD.reduce((d, r) => { const k = posTxt(r).trim().slice(0, 30); d[k] = (d[k] || 0) + 1; return d }, {})).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([k, v]) => `${k}(${v})`).join(' · '))
console.log('  source:', JSON.stringify(newD.reduce((d, r) => (d[r.sheet_source] = (d[r.sheet_source] || 0) + 1, d), {})))
