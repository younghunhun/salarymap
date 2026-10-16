// GPCLUB V248 Senior Growth Leader B2C (10/16 Len 등록) 발송 풀 실측 (읽기 전용) — HCM Bình Thạnh 온사이트 · 이커머스 그로스 4y+ · Shopee/TikTok Shop/Lazada 플랫폼 메커니즘 · 데이터 드리븐(GMV/CR/CIR/ROAS/LTV) · Python/SQL/스크래핑 우대 · 15~40M + 매출 성장 % 보너스
import { sb, fetchAll, fetchBlacklist } from '../outreach/lib.mjs'
const today = new Date().toISOString().slice(0, 10)
const expTitles = (p) => (Array.isArray(p.experiences) ? p.experiences.map((e) => `${e.title || e.position || ''}`).join(' | ') : '')
const exp = (p) => (Array.isArray(p.experiences) ? p.experiences.map((e) => `${e.title || e.position || ''} ${e.company || ''} ${e.description || ''}`).join(' ') : '')
const txt = (p) => (JSON.stringify(p.skills || '') + ' ' + String(p.position || '') + ' ' + String(p.headline || '') + ' ' + JSON.stringify(p.desired_roles || '') + ' ' + JSON.stringify(p.resume_summary || '') + ' ' + exp(p) + ' ' + String(p.major || '') + ' ' + JSON.stringify(p.certs || '') + ' ' + JSON.stringify(p.projects || '')).toLowerCase()
const roles = (p) => [p.position, ...(p.desired_roles || [])].filter(Boolean)
const y = (p) => p.yoe_months ?? 0
const hcmRe = /(h[ồo]\s*ch[íi]\s*minh|hcm|sài gòn|sai gon|saigon|thủ đức|thu duc|bình thạnh|bình dương|binh duong|đồng nai|dong nai|biên hòa|long an|호치민|호찌민|hóc môn|gò vấp|go vap|tân bình|tân phú|bình tân|phú nhuận|củ chi|nhà bè|bình chánh|quận \d|district \d|tphcm|tp\.?\s*hcm)/i
const city = (p) => { const l = String(p.location || ''); if (!l.trim()) return '미기재'; if (hcmRe.test(l)) return 'HCM'; return '기타' }
const hcmOk = (p) => city(p) !== '기타'
const mktRole = (p) => roles(p).some((r) => /(marketing|growth|performance|digital|e-?commerce|ecom|brand|trade marketing|product marketing)/i.test(r)) || /(marketing|growth|e-?commerce|ecom|performance|media buy|digital)/i.test(expTitles(p))
const ecomRe = /(shopee|tiktok shop|lazada|tiki|sendo|e-?commerce|ecommerce|thương mại điện tử|tmđt|sàn tmđt|marketplace|gmv|flash sale|mega sale|shop ads|on-?site ads|d2c|dtc|livestream|affiliate)/i
const platformRe = /(shopee|tiktok shop|lazada|tiki|sendo)/i
const metricRe = /(roas|\bcr\b|conversion rate|ctr|cir|ltv|retention|cac|cpa|a\/b test|ab test|gmv|funnel|retarget|crm|zns|zalo oa)/i
const techRe = /(python|sql|scrap|crawl|automation|n8n|zapier|make\.com|apps script|power bi|looker|bigquery|data studio|tableau)/i
const leadRe = /(lead|leader|head|manager|director|trưởng|quản lý|senior|sr\.?)/i
const leadSig = (p) => leadRe.test(expTitles(p)) || leadRe.test(String(p.position || ''))
const [pool, unsubs, todays, bl] = await Promise.all([
  fetchAll(() => sb.from('user_profiles').select('id,email,full_name,position,desired_roles,yoe_months,location,english_cert,korean_cert,is_resume_public,skills,resume_summary,headline,experiences,major,certs,projects,created_at').not('email', 'is', null).not('resume_url', 'is', null).order('created_at', { ascending: false })),
  fetchAll(() => sb.from('events').select('user_id').eq('event', 'coldmail_unsub').not('user_id', 'is', null).order('id')),
  fetchAll(() => sb.from('job_recommendations').select('user_id').gte('created_at', today).order('id')),
  fetchBlacklist(),
])
const unsubSet = new Set(unsubs.map((r) => r.user_id)), todaySet = new Set(todays.map((r) => r.user_id))
const seen = new Set(); const base = []
for (const p of pool) { if (!p.email || /likelion/i.test(p.email)) continue; const e = p.email.toLowerCase(); if (seen.has(e) || unsubSet.has(p.id) || bl.has(p)) continue; seen.add(e); p.__t = txt(p); base.push(p) }
const L = base.filter(hcmOk)
console.log(`베이스 ${base.length}명 · 당일 기수신 ${todaySet.size} · HCM권/미기재 ${L.length} · 그 중 마케팅/그로스/이커머스 직군·직함 ${L.filter(mktRole).length} · 4y+ ${L.filter((p) => mktRole(p) && y(p) >= 48).length}`)
const line = (label, arr) => {
  const ok = arr.filter((p) => !todaySet.has(p.id))
  const yb = {}; for (const p of ok) { const k = y(p) < 24 ? '<2y' : y(p) < 48 ? '2-4y' : y(p) < 84 ? '4-7y' : '7y+'; yb[k] = (yb[k] || 0) + 1 }
  console.log(`  ${label}: ${arr.length}명 → 오늘 발송가능 ${ok.length}${arr.length - ok.length ? ` (당일 겹침 ${arr.length - ok.length})` : ''} · HCM ${ok.filter((p) => city(p) === 'HCM').length}/미기재 ${ok.filter((p) => city(p) === '미기재').length} · 경력 ${Object.entries(yb).map(([k, v]) => `${k} ${v}`).join('/')} · 플랫폼명 ${ok.filter((p) => platformRe.test(p.__t)).length} · 지표 ${ok.filter((p) => metricRe.test(p.__t)).length} · 툴 ${ok.filter((p) => techRe.test(p.__t)).length} · 리드직함 ${ok.filter(leadSig).length} · 공개 ${ok.filter((p) => p.is_resume_public).length}`)
  for (const p of ok.slice(0, 8)) console.log(`    ${p.full_name} · ${roles(p).slice(0, 2).join('/')} · ${Math.round(y(p) / 12 * 10) / 10}y · ${city(p)} · ${expTitles(p).slice(0, 70)}`)
  return ok
}
console.log('\n[V248 GPCLUB Senior Growth Leader] HCM · 이커머스 그로스 4y+')
const G1 = L.filter((p) => mktRole(p) && y(p) >= 48 && platformRe.test(p.__t))
const G2 = L.filter((p) => mktRole(p) && y(p) >= 48 && !platformRe.test(p.__t) && ecomRe.test(p.__t))
const G3 = L.filter((p) => mktRole(p) && y(p) >= 48 && !ecomRe.test(p.__t) && metricRe.test(p.__t))
const G4 = L.filter((p) => mktRole(p) && y(p) >= 36 && y(p) < 48 && ecomRe.test(p.__t))
const G5 = L.filter((p) => !mktRole(p) && y(p) >= 48 && platformRe.test(p.__t) && /(sales|business|operations|product|data|growth|e-?commerce|kinh doanh)/i.test(roles(p).join(' ') + ' ' + expTitles(p)))
line('G1 마케팅/그로스 직군 × 4y+ × Shopee/TikTok Shop/Lazada 명시 (코어)', G1)
line('G2 마케팅/그로스 직군 × 4y+ × 이커머스/D2C/GMV 키워드 (코어-2)', G2)
line('G3 마케팅/그로스 직군 × 4y+ × 퍼포먼스 지표(ROAS/CR/CRM 등)만 (확장 — 플랫폼 경험 미확인)', G3)
line('G4 마케팅/그로스 직군 × 3~4y × 이커머스 키워드 (확장 — 경력 미달 자기선별)', G4)
line('G5 비마케팅 직군(영업/운영/PO/데이터) × 4y+ × 플랫폼명 명시 (확장)', G5)
const all = new Set([...G1, ...G2, ...G3, ...G4, ...G5].filter((p) => !todaySet.has(p.id)).map((p) => p.id))
console.log(`\n1인1통 합계(오늘 발송가능): ${all.size}명 · 코어(G1+G2) ${new Set([...G1, ...G2].filter((p) => !todaySet.has(p.id)).map((p) => p.id)).size}명`)
