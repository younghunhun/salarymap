// Ultra Fashion R217 Developer / R218 UX/UI Designer (10/7 Len 등록) 발송 풀 실측 (읽기 전용)
// JD 공통: Be.F AI 캐릭터 컴패니언 · 한국 팀과 온라인 협업 · HCM/ĐN/HN(슬랙 표기 Remote) · 1년+ · 18-25M · 영어 or 한국어 우대 · AI 툴(ChatGPT/Claude/Cursor) 적극 활용
//   R218: Figma UX/UI Web·Mobile · User Flow·인터랙션·디자인시스템 · AI/캐릭터챗/게임/커뮤니티 경험 우대
//   R217: 웹서비스 개발 경험 · FE or BE · API/DB/인증/서버 구조 · 채팅·실시간·LLM API 연동 우대 · MVP 실행력
// 지역 게이트 없음(3도시+Remote) · 경력 게이트 12m+ (JD experience_min 1) · 1인1통 캐스케이드 = R218 → R217
import { sb, fetchAll, fetchBlacklist } from '../outreach/lib.mjs'

const R218 = 'b1d0433a-e0d7-4ebf-b37d-4d44d6ae4ccd', R217 = 'b285881d-1727-49a4-8cb6-1c64530a99c9'
const today = new Date().toISOString().slice(0, 10)
const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString()

const exp = (p) => (Array.isArray(p.experiences) ? p.experiences.map((e) => `${e.title || e.position || ''} ${e.company || ''} ${e.description || ''}`).join(' ') : '')
const txt = (p) => (JSON.stringify(p.skills || '') + ' ' + String(p.position || '') + ' ' + String(p.headline || '') + ' ' + JSON.stringify(p.desired_roles || '') + ' ' + JSON.stringify(p.resume_summary || '') + ' ' + exp(p)).toLowerCase()
const roles = (p) => [p.position, ...(p.desired_roles || [])].filter(Boolean)
const y = (p) => p.yoe_months ?? 0
const city = (p) => { const l = String(p.location || ''); return /(h[ồo]\s*ch[íi]\s*minh|hcm|sài gòn|saigon|thủ đức|bình thạnh|bình dương|đồng nai|호치민|호찌민|tân bình|gò vấp|quận \d)/i.test(l) ? 'HCM' : /(hà nội|ha noi|hanoi|hà đông|하노이)/i.test(l) ? 'HN' : /(đà nẵng|da nang|danang|다낭)/i.test(l) ? 'ĐN' : !l.trim() ? '미기재' : '기타' }
const enOk = (p) => !!String(p.english_cert || '').trim() && !/^(none|no|없음|-|n\/a)$/i.test(String(p.english_cert).trim())
const koOk = (p) => (!!String(p.korean_cert || '').trim() && !/^(none|no|없음|-|n\/a)$/i.test(String(p.korean_cert).trim())) || /(korean|tiếng hàn|topik|한국어)/i.test(p.__t)
const aiTool = (p) => /(chatgpt|claude|cursor|copilot|midjourney|gen ?ai|generative ai|ai tool|công cụ ai|stable diffusion|dall-?e|gemini|v0\b|lovable|bolt\.new)/i.test(p.__t)

// ── R218 Designer 시그널
const designRole = (p) => roles(p).includes('Design') || /(ui\/?ux|ux\/?ui|product designer|ui designer|ux designer)/i.test(String(p.position || '') + ' ' + JSON.stringify(p.desired_roles || ''))
const figma = (p) => /figma/i.test(p.__t)
const uiux = (p) => /(ui\/?ux|ux\/?ui|user experience|user interface|product design|wireframe|prototyp|user flow|design system|interaction design|usability)/i.test(p.__t)
const mobileWeb = (p) => /(mobile app|ứng dụng|app design|web design|website|responsive|ios|android)/i.test(p.__t)
const domainD = (p) => /(game|chatbot|character|ai service|ai product|community|cộng đồng|entertainment|giải trí|social app|dating)/i.test(p.__t)

// ── R217 Developer 시그널
const devRole = (p) => roles(p).some((r) => /(frontend|front-end|backend|back-end|fullstack|full-stack|full stack|web|software|developer|engineer|mobile|node|react|java|python|\.net|php)/i.test(String(r))) && !roles(p).every((r) => /(qa|tester|data|embedded|devops|security|game|blockchain|bi\b|analyst)/i.test(String(r)))
const webStack = (p) => /(react|next\.?js|vue|nuxt|angular|svelte|node\.?js|express|nest\.?js|django|flask|fastapi|spring|laravel|rails|asp\.net|\.net core|php|typescript|rest api|restful|graphql|postgres|mysql|mongodb|redis|supabase|firebase)/i.test(p.__t)
const feSig = (p) => /(react|next\.?js|vue|nuxt|angular|svelte|tailwind|html|css|frontend|front-end)/i.test(p.__t)
const beSig = (p) => /(node\.?js|express|nest\.?js|django|flask|fastapi|spring|laravel|rails|asp\.net|\.net|golang|\bgo\b|postgres|mysql|mongodb|redis|rest api|backend|back-end|microservice)/i.test(p.__t)
const llmSig = (p) => /(openai api|llm|gpt-?4|gpt api|langchain|llamaindex|rag\b|vector db|pinecone|embedding|chatbot|ai chat|prompt engineering|gemini api|anthropic|hugging ?face|ollama)/i.test(p.__t)
const realtime = (p) => /(websocket|socket\.io|real-?time|realtime|webrtc|chat app|messaging|pub\/sub|kafka|mqtt|signalr)/i.test(p.__t)
const authDb = (p) => /(oauth|jwt|authentication|authorization|đăng nhập|login|session|sql|database|db design|schema)/i.test(p.__t)

const [pool, unsubs, recs, apps, todays, weeks, bl, jobs] = await Promise.all([
  fetchAll(() => sb.from('user_profiles')
    .select('id,email,full_name,position,desired_roles,yoe_months,location,english_cert,korean_cert,is_resume_public,skills,resume_summary,headline,experiences,portfolio_url,created_at')
    .not('email', 'is', null).not('resume_url', 'is', null).order('created_at', { ascending: false })),
  fetchAll(() => sb.from('events').select('user_id').eq('event', 'coldmail_unsub').not('user_id', 'is', null).order('id')),
  fetchAll(() => sb.from('job_recommendations').select('user_id,job_id').in('job_id', [R217, R218]).order('id')),
  fetchAll(() => sb.from('job_applications').select('user_id,job_id').in('job_id', [R217, R218]).order('id')),
  fetchAll(() => sb.from('job_recommendations').select('user_id').gte('created_at', today).order('id')),
  fetchAll(() => sb.from('job_recommendations').select('user_id').gte('created_at', weekAgo).order('id')),
  fetchBlacklist(),
  sb.from('jobs').select('id,title,source_id,is_active,status,location,type').in('id', [R217, R218]),
])
for (const j of jobs.data || []) console.log(`공고: ${j.source_id} ${j.title} · active=${j.is_active} · status=${j.status} · ${j.location} · ${j.type}`)
console.log(`기발송 ${recs.length} · 기지원 ${apps.length}`)
const unsubSet = new Set(unsubs.map((r) => r.user_id))
const sent = new Set([...recs, ...apps].map((r) => r.user_id))
const todaySet = new Set(todays.map((r) => r.user_id))
const weekCnt = {}; for (const r of weeks) weekCnt[r.user_id] = (weekCnt[r.user_id] || 0) + 1
const stale = (p) => (weekCnt[p.id] || 0) >= 3

const seen = new Set(); const base = []
for (const p of pool) {
  if (!p.email || /likelion/i.test(p.email)) continue
  const e = p.email.toLowerCase()
  if (seen.has(e) || unsubSet.has(p.id) || bl.has(p) || sent.has(p.id)) continue
  seen.add(e); p.__t = txt(p); base.push(p)
}
console.log(`\n베이스(이력서·수신거부/블랙리스트/내부/기발송 제외) ${base.length}명`)
const vocab = {}; for (const p of base) for (const r of roles(p)) vocab[r] = (vocab[r] || 0) + 1
console.log('직군 어휘 상위:', Object.entries(vocab).sort((a, b) => b[1] - a[1]).slice(0, 30).map(([k, v]) => `${k}(${v})`).join(' · '))

const line = (label, arr) => {
  const ok = arr.filter((p) => !todaySet.has(p.id))
  const c = {}; for (const p of ok) c[city(p)] = (c[city(p)] || 0) + 1
  console.log(`  ${label}: ${arr.length}명 → 오늘 발송가능 ${ok.length} (당일 겹침 ${arr.length - ok.length} · 7일 3통+ ${ok.filter(stale).length}) · 지역 ${Object.entries(c).map(([k, v]) => `${k} ${v}`).join(' / ')} · EN인증 ${ok.filter(enOk).length} · KO ${ok.filter(koOk).length} · AI툴 ${ok.filter(aiTool).length} · 공개 ${ok.filter((p) => p.is_resume_public).length}`)
  return ok
}
const yb = (a) => { const d = {}; for (const p of a) { const k = y(p) < 12 ? '<1y' : y(p) < 36 ? '1-3y' : y(p) < 60 ? '3-5y' : '5y+'; d[k] = (d[k] || 0) + 1 } return Object.entries(d).map(([k, v]) => `${k} ${v}`).join(' · ') }

// ── R218
console.log(`\n[R218 UX/UI Designer] 디자인 직군 ${base.filter(designRole).length}명 · 그중 12m+ ${base.filter((p) => designRole(p) && y(p) >= 12).length}`)
const dCore = base.filter((p) => designRole(p) && y(p) >= 12)
const D1 = dCore.filter((p) => figma(p) && uiux(p) && aiTool(p))
const D2 = dCore.filter((p) => figma(p) && uiux(p) && !aiTool(p))
const D3 = dCore.filter((p) => (figma(p) || uiux(p)) && !(figma(p) && uiux(p)))
const D4 = dCore.filter((p) => !figma(p) && !uiux(p))
line('D1 Figma × UX/UI 텍스트 × AI 툴 (JD 완전 매치)', D1)
line('D2 Figma × UX/UI 텍스트 (AI 툴 미기재)', D2)
line('D3 Figma or UX/UI 중 하나만', D3)
line('D4 디자인 직군이나 Figma·UX/UI 없음(그래픽·영상 등) — 기본 제외', D4)
const dSend = line('D1+D2+D3 합계', [...D1, ...D2, ...D3])
console.log(`    경력 분포: ${yb(dSend)} · 도메인(게임/챗봇/커뮤니티/엔터) ${dSend.filter(domainD).length} · 포폴 URL ${dSend.filter((p) => p.portfolio_url).length}`)
console.log(`    참고 — 디자인 직군 × Figma·UX/UI × 12m 미만(신입): ${base.filter((p) => designRole(p) && y(p) < 12 && (figma(p) || uiux(p))).length}명`)
console.log(`    참고 — 비디자인 직군 × Figma × UX/UI 텍스트 × 12m+: ${base.filter((p) => !designRole(p) && figma(p) && uiux(p) && y(p) >= 12).length}명`)
const dIds = new Set(dSend.map((p) => p.id))

// ── R217 (R218 배정자 제외)
const devBase = base.filter((p) => !dIds.has(p.id))
console.log(`\n[R217 Developer] 개발 직군 ${devBase.filter(devRole).length}명 · 그중 12m+ ${devBase.filter((p) => devRole(p) && y(p) >= 12).length}`)
const vCore = devBase.filter((p) => devRole(p) && y(p) >= 12)
const V1 = vCore.filter((p) => webStack(p) && (llmSig(p) || realtime(p)))
const V2 = vCore.filter((p) => webStack(p) && !(llmSig(p) || realtime(p)) && aiTool(p))
const V3 = vCore.filter((p) => webStack(p) && !(llmSig(p) || realtime(p)) && !aiTool(p))
const V4 = vCore.filter((p) => !webStack(p))
line('V1 웹스택 × (LLM API or 실시간/채팅) (JD 우대 매치)', V1)
line('V2 웹스택 × AI 코딩툴 언급', V2)
line('V3 웹스택만 (FE/BE 일반)', V3)
line('V4 개발 직군이나 웹스택 없음 — 기본 제외', V4)
const vSend = line('V1+V2+V3 합계', [...V1, ...V2, ...V3])
console.log(`    경력 분포: ${yb(vSend)} · FE ${vSend.filter(feSig).length} / BE ${vSend.filter(beSig).length} / 둘 다 ${vSend.filter((p) => feSig(p) && beSig(p)).length} · 인증/DB ${vSend.filter(authDb).length} · LLM ${vSend.filter(llmSig).length} · 실시간 ${vSend.filter(realtime).length}`)
console.log(`    참고 — 개발 직군 × 웹스택 × 12m 미만(신입): ${devBase.filter((p) => devRole(p) && y(p) < 12 && webStack(p)).length}명`)
const vocabV = {}; for (const p of vSend) for (const r of roles(p).slice(0, 1)) vocabV[r] = (vocabV[r] || 0) + 1
console.log('    V 합계 position 분포:', Object.entries(vocabV).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([k, v]) => `${k}(${v})`).join(' · '))

const sD = (p) => (figma(p) ? 2 : 0) + (uiux(p) ? 2 : 0) + (aiTool(p) ? 2 : 0) + (domainD(p) ? 1 : 0) + (enOk(p) ? 1 : 0) + (koOk(p) ? 1 : 0) + (p.portfolio_url ? 1 : 0)
const sV = (p) => (webStack(p) ? 2 : 0) + (llmSig(p) ? 3 : 0) + (realtime(p) ? 2 : 0) + (aiTool(p) ? 1 : 0) + (authDb(p) ? 1 : 0) + (enOk(p) ? 1 : 0) + (koOk(p) ? 1 : 0)
const show = (title, arr, sc, n) => { console.log(`\n${title} 상위 ${Math.min(n, arr.length)}명`); for (const p of [...arr].sort((a, b) => sc(b) - sc(a)).slice(0, n)) console.log(`  [${sc(p)}] ${p.full_name} · ${roles(p).slice(0, 2).join('/')} · ${Math.round(y(p) / 12 * 10) / 10}y · ${city(p)}${enOk(p) ? ' · EN' : ''}${koOk(p) ? ' · KO' : ''}${aiTool(p) ? ' · AI' : ''}${p.is_resume_public ? '' : ' · 비공개'}`) }
show('[R218 표본]', dSend, sD, 15)
show('[R217 표본]', vSend, sV, 15)
