// CodeBailey R220 AI Agent Developer (10/12 Len 등록) 발송 풀 실측 (읽기 전용)
// JD: HCM/HN/ĐN 온사이트 · 2명 · AI 지식 · Python/Java 코딩 · 경력·영어 무관(주니어 OK, 코딩 테스트) · 우대 LLM/RAG/AI Agent
// 지역 게이트 = HCM·HN·ĐN권 명시 or 미기재(베트남 3대 도시 → 사실상 타지역만 제외) · 경력 게이트 없음 · AI 시그널 = 직군 AI/ML/DS or 경력 직함 or 텍스트(LLM/RAG/agent/ML/DL 등) · 언어 = Python or Java
import { sb, fetchAll, fetchBlacklist } from '../outreach/lib.mjs'

const R220 = '65a157f3-0677-4819-af4c-ba6fdbd7a84d'
const today = new Date().toISOString().slice(0, 10)
const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString()

const expTitles = (p) => (Array.isArray(p.experiences) ? p.experiences.map((e) => `${e.title || e.position || ''}`).join(' | ') : '')
const exp = (p) => (Array.isArray(p.experiences) ? p.experiences.map((e) => `${e.title || e.position || ''} ${e.company || ''} ${e.description || ''}`).join(' ') : '')
const txt = (p) => (JSON.stringify(p.skills || '') + ' ' + String(p.position || '') + ' ' + String(p.headline || '') + ' ' + JSON.stringify(p.desired_roles || '') + ' ' + JSON.stringify(p.resume_summary || '') + ' ' + exp(p) + ' ' + String(p.major || '')).toLowerCase()
const roles = (p) => [p.position, ...(p.desired_roles || [])].filter(Boolean)
const y = (p) => p.yoe_months ?? 0
const cityOk = (p) => { const l = String(p.location || ''); return !l.trim() || /(h[ồo]\s*ch[íi]\s*minh|hcm|sài gòn|sai gon|saigon|thủ đức|thu duc|bình thạnh|bình dương|binh duong|đồng nai|dong nai|biên hòa|long an|호치민|호찌민|hóc môn|gò vấp|tân bình|tân phú|bình tân|phú nhuận|củ chi|nhà bè|bình chánh|quận \d|district \d|tphcm|tp\.?\s*hcm|hà nội|ha noi|hanoi|hn\b|하노이|cầu giấy|đống đa|hai bà trưng|thanh xuân|hoàng mai|long biên|nam từ liêm|bắc từ liêm|đà nẵng|da nang|danang|다낭|hải châu|thanh khê|sơn trà|liên chiểu|cẩm lệ|ngũ hành sơn)/i.test(l) }
const city = (p) => { const l = String(p.location || ''); if (!l.trim()) return '미기재'; if (/(hà nội|ha noi|hanoi|hn\b|하노이|cầu giấy|đống đa|hai bà trưng|thanh xuân|hoàng mai|long biên|từ liêm)/i.test(l)) return 'HN'; if (/(đà nẵng|da nang|danang|다낭|hải châu|thanh khê|sơn trà|liên chiểu|cẩm lệ|ngũ hành sơn)/i.test(l)) return 'ĐN'; return cityOk(p) ? 'HCM' : '타지역' }
const enOk = (p) => !!String(p.english_cert || '').trim() && !/^(none|no|없음|-|n\/a)$/i.test(String(p.english_cert).trim())
const koOk = (p) => (!!String(p.korean_cert || '').trim() && !/^(none|no|없음|-|n\/a)$/i.test(String(p.korean_cert).trim())) || /(korean|tiếng hàn|topik|한국어)/i.test(p.__t)

const aiRe = /(\bai\b|artificial intelligence|trí tuệ nhân tạo|machine learning|\bml\b|deep learning|data scien|nlp|computer vision|\bllm\b|\brag\b|langchain|llamaindex|agentic|ai agent|chatbot|generative|genai|gpt|transformer|pytorch|tensorflow|hugging ?face|fine.?tun|lora|embedding|vector db|openai|neural)/i
const aiRole = (p) => roles(p).some((r) => /^(ai|ml|machine|data scien|nlp|computer vision)/i.test(r)) || aiRe.test(roles(p).join(' '))
const aiTitle = (p) => aiRe.test(expTitles(p))
const aiText = (p) => aiRe.test(p.__t)
const llmSig = (p) => /(\bllm\b|\brag\b|langchain|llamaindex|agentic|ai agent|multi.?agent|chatbot|generative|genai|gpt|openai|claude|gemini|fine.?tun|lora|embedding|vector|prompt)/i.test(p.__t)
const pyJava = (p) => /(python|\bjava\b)/i.test(p.__t)
const py = (p) => /python/i.test(p.__t)
const devRole = (p) => roles(p).some((r) => /^(backend|fullstack|frontend|mobile|data|devops|software|ai|ml|machine|qa|game|embedded|cloud|security|data scien|data eng)/i.test(r))
const csMajor = (p) => /(computer|công nghệ thông tin|cong nghe thong tin|khoa học máy tính|khoa hoc may tinh|software|phần mềm|phan mem|information tech|\bit\b|data|trí tuệ nhân tạo|ai\b|điện tử|electronic|toán|math)/i.test(String(p.major || ''))

const [pool, unsubs, recs, apps, todays, weeks, bl, job] = await Promise.all([
  fetchAll(() => sb.from('user_profiles').select('id,email,full_name,position,desired_roles,yoe_months,location,english_cert,korean_cert,is_resume_public,skills,resume_summary,headline,experiences,major,university,created_at').not('email', 'is', null).not('resume_url', 'is', null).order('created_at', { ascending: false })),
  fetchAll(() => sb.from('events').select('user_id').eq('event', 'coldmail_unsub').not('user_id', 'is', null).order('id')),
  fetchAll(() => sb.from('job_recommendations').select('user_id').eq('job_id', R220).order('id')),
  fetchAll(() => sb.from('job_applications').select('user_id').eq('job_id', R220).order('id')),
  fetchAll(() => sb.from('job_recommendations').select('user_id').gte('created_at', today).order('id')),
  fetchAll(() => sb.from('job_recommendations').select('user_id').gte('created_at', weekAgo).order('id')),
  fetchBlacklist(),
  sb.from('jobs').select('id,title,company,source_id,is_active,status,location,type,experience_min,experience_max').eq('id', R220).single(),
])
const j = job.data; console.log(`공고: ${j.source_id} ${j.company} ${j.title} · active=${j.is_active} · status=${j.status} · ${j.location} · ${j.type} · exp ${j.experience_min}-${j.experience_max}y`)
console.log(`기발송 ${recs.length} · 기지원 ${apps.length}`)
const unsubSet = new Set(unsubs.map((r) => r.user_id)), sent = new Set([...recs, ...apps].map((r) => r.user_id)), todaySet = new Set(todays.map((r) => r.user_id))
const weekCnt = {}; for (const r of weeks) weekCnt[r.user_id] = (weekCnt[r.user_id] || 0) + 1
const stale = (p) => (weekCnt[p.id] || 0) >= 3
const seen = new Set(); const base = []
for (const p of pool) { if (!p.email || /likelion/i.test(p.email)) continue; const e = p.email.toLowerCase(); if (seen.has(e) || unsubSet.has(p.id) || bl.has(p) || sent.has(p.id)) continue; seen.add(e); p.__t = txt(p); base.push(p) }
console.log(`\n베이스(이력서·수신거부/블랙리스트/내부/기발송 제외) ${base.length}명`)

const anyAi = (p) => aiRole(p) || aiTitle(p)
console.log(`AI 시그널(직군 or 경력 직함) 전체 ${base.filter(anyAi).length} · 직군 ${base.filter(aiRole).length} · 경력직함 ${base.filter(aiTitle).length} · 텍스트만(개발직군) ${base.filter((p) => !anyAi(p) && aiText(p) && devRole(p)).length} · 텍스트만(비개발직군) ${base.filter((p) => !anyAi(p) && aiText(p) && !devRole(p)).length}`)
const cd = {}; for (const p of base.filter(anyAi)) cd[city(p)] = (cd[city(p)] || 0) + 1
console.log(`  지역(AI 시그널): ${Object.entries(cd).map(([k, v]) => `${k} ${v}`).join(' · ')}`)

const line = (label, arr) => {
  const ok = arr.filter((p) => !todaySet.has(p.id))
  const c = {}; for (const p of ok) c[city(p)] = (c[city(p)] || 0) + 1
  console.log(`  ${label}: ${arr.length}명 → 오늘 발송가능 ${ok.length} (당일 겹침 ${arr.length - ok.length} · 7일 3통+ ${ok.filter(stale).length}) · ${Object.entries(c).map(([k, v]) => `${k} ${v}`).join('/')} · LLM/RAG/Agent ${ok.filter(llmSig).length} · Python ${ok.filter(py).length} · Py|Java ${ok.filter(pyJava).length} · EN ${ok.filter(enOk).length} · KO ${ok.filter(koOk).length} · 공개 ${ok.filter((p) => p.is_resume_public).length}`)
  return ok
}
const yb = (a) => { const d = {}; for (const p of a) { const k = y(p) < 12 ? '<1y' : y(p) < 36 ? '1-3y' : y(p) < 60 ? '3-5y' : '5y+'; d[k] = (d[k] || 0) + 1 } return Object.entries(d).map(([k, v]) => `${k} ${v}`).join(' · ') }

const core = base.filter((p) => anyAi(p) && cityOk(p) && pyJava(p))
const A1 = core.filter(llmSig)
const A2 = core.filter((p) => !llmSig(p))
const A3 = base.filter((p) => anyAi(p) && cityOk(p) && !pyJava(p))
const A4 = base.filter((p) => !anyAi(p) && cityOk(p) && devRole(p) && llmSig(p) && pyJava(p))
const A5 = base.filter((p) => !anyAi(p) && cityOk(p) && devRole(p) && !llmSig(p) && aiText(p) && pyJava(p))
console.log('\n[R220 AI Agent Developer] HCM/HN/ĐN권/미기재 × AI 시그널')
line('A1 AI 직군/직함 × Py|Java × LLM/RAG/Agent 키워드 (JD 코어 상위)', A1)
line('A2 AI 직군/직함 × Py|Java × LLM 키워드 없음 (코어)', A2)
line('A3 AI 직군/직함 × Py|Java 미기재 (참고)', A3)
line('A4 개발직군(비AI) × LLM/RAG/Agent 키워드 × Py|Java (확장층 — 백엔드 등에서 LLM 경험)', A4)
line('A5 개발직군(비AI) × AI 일반 키워드만 × Py|Java (약한 확장층)', A5)
const send = line('A1+A2 합계(코어)', [...A1, ...A2])
console.log(`    경력 분포: ${yb(send)}`)
const sendX = line('A1+A2+A4 합계(코어+LLM 확장)', [...A1, ...A2, ...A4])
console.log(`    경력 분포: ${yb(sendX)}`)
console.log(`    참고 — 타지역 × AI 직군/직함 × Py|Java: ${base.filter((p) => anyAi(p) && !cityOk(p) && pyJava(p)).length}명`)
const vocab = {}; for (const p of send) for (const r of roles(p).slice(0, 1)) vocab[r] = (vocab[r] || 0) + 1
console.log('    코어 position 분포:', Object.entries(vocab).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([k, v]) => `${k}(${v})`).join(' · '))
const sc = (p) => (aiTitle(p) ? 3 : 0) + (aiRole(p) ? 1 : 0) + (llmSig(p) ? 3 : 0) + (py(p) ? 1 : 0) + (csMajor(p) ? 1 : 0) + (koOk(p) ? 1 : 0)
console.log(`\n[표본] 코어 상위 15`); for (const p of [...send].sort((a, b) => sc(b) - sc(a)).slice(0, 15)) console.log(`  [${sc(p)}] ${p.full_name} · ${roles(p).slice(0, 2).join('/')} · ${Math.round(y(p) / 12 * 10) / 10}y · ${city(p)} · ${expTitles(p).slice(0, 70)}${llmSig(p) ? ' · LLM' : ''}${koOk(p) ? ' · KO' : ''}`)
console.log(`\n[표본] 코어 하위 10`); for (const p of [...send].sort((a, b) => sc(a) - sc(b)).slice(0, 10)) console.log(`  [${sc(p)}] ${p.full_name} · ${roles(p).slice(0, 2).join('/')} · ${Math.round(y(p) / 12 * 10) / 10}y · ${city(p)} · ${expTitles(p).slice(0, 70)}`)
console.log(`\n[표본] A4 확장층 상위 8`); for (const p of [...A4].sort((a, b) => sc(b) - sc(a)).slice(0, 8)) console.log(`  [${sc(p)}] ${p.full_name} · ${roles(p).slice(0, 2).join('/')} · ${Math.round(y(p) / 12 * 10) / 10}y · ${city(p)} · ${expTitles(p).slice(0, 70)}`)
