// Global8 R219 Kỹ sư SIEM (10/9 등록, 10/13 Len 요청) 발송 풀 실측 (읽기 전용)
// JD: HCM/HN/ĐN 온사이트 · 15~25M VND(협의) · Elastic Stack 구축 경험 필수 · 경보 자동화(Shuffle/SOAR) · Linux/Windows·Apache/Tomcat·네트워크 · 외국어 무관 · 경력 연차 무관(실제 SIEM 구축 경험만 평가)
// 지역 게이트 = HCM·HN·ĐN권 명시 or 미기재 · 경력 게이트 없음 · 코어 = SIEM/Elastic/ELK/Splunk/SOC 도구 키워드 × (보안 직군·직함 or 인프라/DevOps 직군)
import { sb, fetchAll, fetchBlacklist } from '../outreach/lib.mjs'

const R219 = '61eea99a-2a33-4ca6-b3f8-af16e9fd124d'
const today = new Date().toISOString().slice(0, 10)
const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString()

const expTitles = (p) => (Array.isArray(p.experiences) ? p.experiences.map((e) => `${e.title || e.position || ''}`).join(' | ') : '')
const exp = (p) => (Array.isArray(p.experiences) ? p.experiences.map((e) => `${e.title || e.position || ''} ${e.company || ''} ${e.description || ''}`).join(' ') : '')
const txt = (p) => (JSON.stringify(p.skills || '') + ' ' + String(p.position || '') + ' ' + String(p.headline || '') + ' ' + JSON.stringify(p.desired_roles || '') + ' ' + JSON.stringify(p.resume_summary || '') + ' ' + exp(p) + ' ' + String(p.major || '')).toLowerCase()
const roles = (p) => [p.position, ...(p.desired_roles || [])].filter(Boolean)
const y = (p) => p.yoe_months ?? 0
const cityRe = /(h[ồo]\s*ch[íi]\s*minh|hcm|sài gòn|sai gon|saigon|thủ đức|thu duc|bình thạnh|bình dương|binh duong|đồng nai|dong nai|biên hòa|long an|호치민|호찌민|hóc môn|gò vấp|tân bình|tân phú|bình tân|phú nhuận|củ chi|nhà bè|bình chánh|quận \d|district \d|tphcm|tp\.?\s*hcm|hà nội|ha noi|hanoi|hn\b|하노이|cầu giấy|đống đa|hai bà trưng|thanh xuân|hoàng mai|long biên|nam từ liêm|bắc từ liêm|đà nẵng|da nang|danang|다낭|hải châu|thanh khê|sơn trà|liên chiểu|cẩm lệ|ngũ hành sơn)/i
const cityOk = (p) => { const l = String(p.location || ''); return !l.trim() || cityRe.test(l) }
const city = (p) => { const l = String(p.location || ''); if (!l.trim()) return '미기재'; if (/(hà nội|ha noi|hanoi|hn\b|하노이|cầu giấy|đống đa|hai bà trưng|thanh xuân|hoàng mai|long biên|từ liêm)/i.test(l)) return 'HN'; if (/(đà nẵng|da nang|danang|다낭|hải châu|thanh khê|sơn trà|liên chiểu|cẩm lệ|ngũ hành sơn)/i.test(l)) return 'ĐN'; return cityOk(p) ? 'HCM' : '타지역' }
const koOk = (p) => (!!String(p.korean_cert || '').trim() && !/^(none|no|없음|-|n\/a)$/i.test(String(p.korean_cert).trim())) || /(korean|tiếng hàn|topik|한국어)/i.test(p.__t)

const secRe = /(security|bảo mật|bao mat|an ninh mạng|an toàn thông tin|an toan thong tin|cyber|pentest|penetration|\bsoc\b|\bsiem\b|infosec|threat|incident response|forensic|vulnerab|red team|blue team|\bciso\b|network engineer|system admin|sysadmin|infrastructure|devops|\bsre\b|linux admin|it operation)/i
const secOnlyRe = /(security|bảo mật|bao mat|an ninh mạng|an toàn thông tin|an toan thong tin|cyber|pentest|penetration|\bsoc\b|\bsiem\b|infosec|threat|incident response|forensic|vulnerab|red team|blue team)/i
const secRole = (p) => roles(p).some((r) => /^(security|cyber|devops|network|system|infra|sre|cloud|it )/i.test(r)) || secRe.test(roles(p).join(' '))
const secTitle = (p) => secRe.test(expTitles(p))
const pureSec = (p) => secOnlyRe.test(roles(p).join(' ') + ' ' + expTitles(p))
const siemRe = /(\bsiem\b|elastic|\belk\b|kibana|logstash|opensearch|splunk|wazuh|qradar|arcsight|sentinel|\bsoar\b|shuffle|graylog|log analysis|phân tích log|security monitoring|giám sát an ninh|\bsoc\b|security operation)/i
const siemSig = (p) => siemRe.test(p.__t)
const elasticSig = (p) => /(elastic|\belk\b|kibana|logstash|opensearch)/i.test(p.__t)
const strongSig = (p) => /(\bsiem\b|splunk|wazuh|qradar|arcsight|\bsoar\b|shuffle|security monitoring|giám sát an ninh|\bsoc\b|security operation)/i.test(p.__t)
const linuxSig = (p) => /(linux|ubuntu|centos|windows server|apache|tomcat|nginx|tcp\/ip|firewall|\bvpn\b)/i.test(p.__t)
const certSig = (p) => /(ceh|comptia|security\+|cissp|oscp|cysa|gcih|ccna|ccnp|lpic|rhce|rhcsa|iso 27001|isms)/i.test(p.__t)

const [pool, unsubs, recs, apps, todays, weeks, bl, job] = await Promise.all([
  fetchAll(() => sb.from('user_profiles').select('id,email,full_name,position,desired_roles,yoe_months,location,english_cert,korean_cert,is_resume_public,skills,resume_summary,headline,experiences,major,university,created_at').not('email', 'is', null).not('resume_url', 'is', null).order('created_at', { ascending: false })),
  fetchAll(() => sb.from('events').select('user_id').eq('event', 'coldmail_unsub').not('user_id', 'is', null).order('id')),
  fetchAll(() => sb.from('job_recommendations').select('user_id').eq('job_id', R219).order('id')),
  fetchAll(() => sb.from('job_applications').select('user_id').eq('job_id', R219).order('id')),
  fetchAll(() => sb.from('job_recommendations').select('user_id').gte('created_at', today).order('id')),
  fetchAll(() => sb.from('job_recommendations').select('user_id').gte('created_at', weekAgo).order('id')),
  fetchBlacklist(),
  sb.from('jobs').select('id,title,company,source_id,is_active,status,location,type,salary_min,salary_max').eq('id', R219).single(),
])
const j = job.data; console.log(`공고: ${j.source_id} ${j.company} ${j.title} · active=${j.is_active} · status=${j.status} · ${j.location} · ${j.type} · ${j.salary_min / 1e6}-${j.salary_max / 1e6}M`)
console.log(`기발송 ${recs.length} · 기지원 ${apps.length}`)
const unsubSet = new Set(unsubs.map((r) => r.user_id)), sent = new Set([...recs, ...apps].map((r) => r.user_id)), todaySet = new Set(todays.map((r) => r.user_id))
const weekCnt = {}; for (const r of weeks) weekCnt[r.user_id] = (weekCnt[r.user_id] || 0) + 1
const stale = (p) => (weekCnt[p.id] || 0) >= 3
const seen = new Set(); const base = []
for (const p of pool) { if (!p.email || /likelion/i.test(p.email)) continue; const e = p.email.toLowerCase(); if (seen.has(e) || unsubSet.has(p.id) || bl.has(p) || sent.has(p.id)) continue; seen.add(e); p.__t = txt(p); base.push(p) }
console.log(`\n베이스(이력서·수신거부/블랙리스트/내부/기발송 제외) ${base.length}명`)

const anySec = (p) => secRole(p) || secTitle(p)
console.log(`보안/인프라 시그널(직군 or 경력 직함) 전체 ${base.filter(anySec).length} · 순수 보안(직군/직함) ${base.filter(pureSec).length} · SIEM/Elastic/SOC 키워드 전체 ${base.filter(siemSig).length} (Elastic/ELK ${base.filter(elasticSig).length} · SIEM/Splunk/SOC 강시그널 ${base.filter(strongSig).length})`)
const cd = {}; for (const p of base.filter((p) => anySec(p) && siemSig(p))) cd[city(p)] = (cd[city(p)] || 0) + 1
console.log(`  지역(보안/인프라 × SIEM 키워드): ${Object.entries(cd).map(([k, v]) => `${k} ${v}`).join(' · ')}`)

const line = (label, arr) => {
  const ok = arr.filter((p) => !todaySet.has(p.id))
  const c = {}; for (const p of ok) c[city(p)] = (c[city(p)] || 0) + 1
  console.log(`  ${label}: ${arr.length}명 → 오늘 발송가능 ${ok.length} (당일 겹침 ${arr.length - ok.length} · 7일 3통+ ${ok.filter(stale).length}) · ${Object.entries(c).map(([k, v]) => `${k} ${v}`).join('/')} · Elastic/ELK ${ok.filter(elasticSig).length} · SIEM/Splunk/SOC ${ok.filter(strongSig).length} · Linux/서비스/네트워크 ${ok.filter(linuxSig).length} · 자격증 ${ok.filter(certSig).length} · 공개 ${ok.filter((p) => p.is_resume_public).length}`)
  return ok
}
const yb = (a) => { const d = {}; for (const p of a) { const k = y(p) < 12 ? '<1y' : y(p) < 36 ? '1-3y' : y(p) < 60 ? '3-5y' : '5y+'; d[k] = (d[k] || 0) + 1 } return Object.entries(d).map(([k, v]) => `${k} ${v}`).join(' · ') }

const S1 = base.filter((p) => cityOk(p) && pureSec(p) && siemSig(p))
const S2 = base.filter((p) => cityOk(p) && !pureSec(p) && anySec(p) && siemSig(p))
const S3 = base.filter((p) => cityOk(p) && pureSec(p) && !siemSig(p))
const S4 = base.filter((p) => cityOk(p) && !anySec(p) && siemSig(p) && elasticSig(p))
const S5 = base.filter((p) => cityOk(p) && !anySec(p) && siemSig(p) && !elasticSig(p))
console.log('\n[R219 Kỹ sư SIEM] HCM/HN/ĐN권/미기재')
line('S1 순수 보안 직군/직함 × SIEM/Elastic/SOC 키워드 (JD 코어)', S1)
line('S2 인프라/DevOps/네트워크 직군·직함 × SIEM/Elastic/SOC 키워드 (코어 — 로그 파이프라인 경험)', S2)
line('S3 순수 보안 직군/직함 × SIEM 키워드 없음 (확장층 — 보안이지만 도구 미기재)', S3)
line('S4 비보안·비인프라 직군 × Elastic/ELK 키워드 (백엔드 등 검색엔진 경험 — 참고)', S4)
line('S5 비보안·비인프라 직군 × SOC/SIEM 기타 키워드만 (노이즈 가능 — 참고)', S5)
const send = line('S1+S2 합계(코어)', [...S1, ...S2])
console.log(`    경력 분포: ${yb(send)}`)
const sendX = line('S1+S2+S3 합계(코어+보안 확장)', [...S1, ...S2, ...S3])
console.log(`    경력 분포: ${yb(sendX)}`)
console.log(`    참고 — 타지역 × 보안/인프라 × SIEM 키워드: ${base.filter((p) => !cityOk(p) && anySec(p) && siemSig(p)).length}명`)
const vocab = {}; for (const p of send) for (const r of roles(p).slice(0, 1)) vocab[r] = (vocab[r] || 0) + 1
console.log('    코어 position 분포:', Object.entries(vocab).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([k, v]) => `${k}(${v})`).join(' · '))
const sc = (p) => (pureSec(p) ? 2 : 0) + (elasticSig(p) ? 3 : 0) + (strongSig(p) ? 3 : 0) + (linuxSig(p) ? 1 : 0) + (certSig(p) ? 1 : 0) + (y(p) >= 12 ? 1 : 0)
console.log(`\n[표본] 코어 상위 15`); for (const p of [...send].sort((a, b) => sc(b) - sc(a)).slice(0, 15)) console.log(`  [${sc(p)}] ${p.full_name} · ${roles(p).slice(0, 2).join('/')} · ${Math.round(y(p) / 12 * 10) / 10}y · ${city(p)} · ${expTitles(p).slice(0, 60)}${elasticSig(p) ? ' · ELK' : ''}${strongSig(p) ? ' · SIEM' : ''}`)
console.log(`\n[표본] 코어 하위 10`); for (const p of [...send].sort((a, b) => sc(a) - sc(b)).slice(0, 10)) console.log(`  [${sc(p)}] ${p.full_name} · ${roles(p).slice(0, 2).join('/')} · ${Math.round(y(p) / 12 * 10) / 10}y · ${city(p)} · ${expTitles(p).slice(0, 60)}`)
console.log(`\n[표본] S3 확장층 상위 8`); for (const p of [...S3].sort((a, b) => sc(b) - sc(a)).slice(0, 8)) console.log(`  [${sc(p)}] ${p.full_name} · ${roles(p).slice(0, 2).join('/')} · ${Math.round(y(p) / 12 * 10) / 10}y · ${city(p)} · ${expTitles(p).slice(0, 60)}`)
