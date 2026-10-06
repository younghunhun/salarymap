// R216 Nexacode — AI Growth Marketer (10/6 Len 등록) 발송 풀 실측 (읽기 전용)
// JD: 한국 B2B 고객 확보(리서치·맞춤 제안·리드) · Threads/Instagram/Meta 광고·블로그·SEO/SEM 운영, ROAS 개선 · AI 활용.
//     HCM Q1 사무실이 있으나 필요 시 원격 가능 · 12-20M. 유저 판단(10/6): 리모트 공고라 한국행 채용 아님 →
//     지역 게이트 없음(전국), 한국어 게이트 없음(가점으로만 표시).
// 전작 R205 AI Native Marketer(9/17, nxai0917) 게이트 = HCM × 마케팅직군 × 6m+ × 유료광고 운영. 같은 시그널 정의를 재사용하고
//     지역만 푼다. R205 수신자는 사실상 같은 포지션 재공고라 별도 표시(재발송 여부는 유저 결정).
import { sb, fetchAll, fetchBlacklist } from '../outreach/lib.mjs'

const JOB = '5deaf792-f749-47c2-acc2-f6c55e77ed93' // R216 AI Growth Marketer
const OLD = '146b9902-46c4-41d5-bcd0-a8356009bd5e' // R205 AI Native Marketer (9/17 발송, 현재 비노출)
const today = new Date().toISOString().slice(0, 10)
const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString()

const exp = (p) => (Array.isArray(p.experiences) ? p.experiences.map((e) => `${e.title || e.position || ''} ${e.company || ''} ${e.description || ''}`).join(' ') : '')
const txt = (p) => (JSON.stringify(p.skills || '') + ' ' + String(p.position || '') + ' ' + String(p.headline || '') + ' ' + JSON.stringify(p.resume_summary || '') + ' ' + exp(p)).toLowerCase()
const roles = (p) => [p.position, ...(p.desired_roles || [])].filter(Boolean)
const mktRole = (p) => roles(p).some((r) => /^(marketing|digital marketing|performance marketing|content marketing|social media|brand|growth)/i.test(String(r)))
const inHcm = (p) => /(h[ồo]\s*ch[íi]\s*minh|hcm|sài gòn|sai gon|saigon|thủ đức|thu duc|bình thạnh|binh thanh|bình dương|binh duong|đồng nai|dong nai)/i.test(String(p.location || ''))
const paidAds = (p) => /(meta ads?|google ads?|facebook ads?|tiktok ads?|quảng cáo trả phí|chạy quảng cáo|media buy|performance marketing|ads manager|google adwords|adwords|cpc|roas|ppc)/i.test(p.__t)
const aiTool = (p) => /(chatgpt|midjourney|gen ?ai|generative ai|ai tool|công cụ ai|stable diffusion|dall-?e|copilot|gemini|claude)/i.test(p.__t)
const dataSig = (p) => /(google analytics|ga4|data analysis|phân tích dữ liệu|conversion|chuyển đổi|a\/b test)/i.test(p.__t)
// R216 에서 새로 들어온 업무: SNS·블로그·SEO/SEM 운영, B2B 리드 확보
const snsSeo = (p) => /(seo|sem\b|content marketing|social media|instagram|threads|tiktok|fanpage|blog|copywrit|nội dung|content creator|community)/i.test(p.__t)
const b2bLead = (p) => /(b2b|lead gen|lead generation|tìm kiếm khách hàng|business development|\bbd\b|outreach|cold ?(email|call)|sales|kinh doanh|account executive|telesales)/i.test(p.__t)
const krAny = (p) => !!String(p.korean_cert || '').trim() || /(korean|tiếng hàn|topik|한국어)/i.test(p.__t)
const y = (p) => p.yoe_months ?? 0

const [pool, unsubs, recs, apps, oldRecs, oldApps, todays, weeks, bl, job] = await Promise.all([
  fetchAll(() => sb.from('user_profiles')
    .select('id,email,full_name,position,desired_roles,yoe_months,location,english_cert,korean_cert,is_resume_public,skills,resume_summary,headline,experiences,created_at')
    .not('email', 'is', null).not('resume_url', 'is', null).order('created_at', { ascending: false })),
  fetchAll(() => sb.from('events').select('user_id').eq('event', 'coldmail_unsub').not('user_id', 'is', null).order('id')),
  fetchAll(() => sb.from('job_recommendations').select('user_id,created_at,status').eq('job_id', JOB).order('id')),
  fetchAll(() => sb.from('job_applications').select('user_id,created_at,status').eq('job_id', JOB).order('id')),
  fetchAll(() => sb.from('job_recommendations').select('user_id,created_at').eq('job_id', OLD).order('id')),
  fetchAll(() => sb.from('job_applications').select('user_id,created_at,status').eq('job_id', OLD).order('id')),
  fetchAll(() => sb.from('job_recommendations').select('user_id').gte('created_at', today).order('id')),
  fetchAll(() => sb.from('job_recommendations').select('user_id').gte('created_at', weekAgo).order('id')),
  fetchBlacklist(),
  sb.from('jobs').select('id,title,company,location,type,is_active,source_id,created_at').eq('id', JOB).single(),
])
console.log('공고:', job.data?.title, '·', job.data?.company, '· active=', job.data?.is_active, '· source_id=', job.data?.source_id, '· type=', job.data?.type)
const unsubSet = new Set(unsubs.map((r) => r.user_id))
const recSet = new Set(recs.map((r) => r.user_id))
const appSet = new Set(apps.map((r) => r.user_id))
const oldRecSet = new Set(oldRecs.map((r) => r.user_id))
const oldAppSet = new Set(oldApps.map((r) => r.user_id))
const todaySet = new Set(todays.map((r) => r.user_id))
const weekCnt = {}
for (const r of weeks) weekCnt[r.user_id] = (weekCnt[r.user_id] || 0) + 1
const stale = (p) => (weekCnt[p.id] || 0) >= 3

console.log(`\nR216 이력: recommend ${recs.length}통 · 지원 ${apps.length}건`)
console.log(`R205(전작) 이력: recommend ${oldRecs.length}통 · 지원 ${oldApps.length}건 (그중 recommend 수신자 ${oldApps.filter((a) => oldRecSet.has(a.user_id)).length}명)`)

const seen = new Set()
const base = []
for (const p of pool) {
  if (!p.email || /likelion/i.test(p.email)) continue
  const e = p.email.toLowerCase()
  if (seen.has(e) || unsubSet.has(p.id) || bl.has(p)) continue
  seen.add(e)
  p.__t = txt(p)
  base.push(p)
}
const fresh = base.filter((p) => !recSet.has(p.id) && !appSet.has(p.id))
console.log(`\n베이스(이력서 보유·수신거부/블랙리스트/내부 제외) ${base.length}명 · R216 기발송/기지원 제외 후 ${fresh.length}명`)
console.log(`마케팅 직군(position·희망직무) ${fresh.filter(mktRole).length}명 · 그중 6개월+ ${fresh.filter((p) => mktRole(p) && y(p) >= 6).length}명`)

const sendable = (arr) => arr.filter((p) => !todaySet.has(p.id) && !stale(p))
const line = (label, arr) => {
  const ok = sendable(arr)
  const okNew = ok.filter((p) => !oldRecSet.has(p.id) && !oldAppSet.has(p.id))
  console.log(`  ${label}: ${arr.length}명 → 오늘 발송가능 ${ok.length} (당일 겹침 ${arr.filter((p) => todaySet.has(p.id)).length} · 7일 3통+ ${arr.filter(stale).length}) · R205 수신/지원자 빼면 ${okNew.length} · HCM ${ok.filter(inHcm).length} / 그 외 ${ok.filter((p) => !inHcm(p)).length}`)
  return ok
}
const core = (p) => mktRole(p) && y(p) >= 6
const T1 = fresh.filter((p) => core(p) && paidAds(p) && aiTool(p))
const T2 = fresh.filter((p) => core(p) && paidAds(p) && !aiTool(p))
const T3 = fresh.filter((p) => core(p) && !paidAds(p) && snsSeo(p))
const T4 = fresh.filter((p) => core(p) && !paidAds(p) && !snsSeo(p))
console.log(`\n[A] 전국 · 마케팅 직군 × 6개월+ (서로 배타)`)
line('T1 유료광고 운영 × AI 툴 (JD 완전 매치)', T1)
line('T2 유료광고 운영 (AI 툴 미기재)', T2)
line('T3 SNS·콘텐츠·SEO 운영 (유료광고 미기재)', T3)
line('T4 마케팅 직군이나 위 시그널 없음', T4)
line('T1+T2 합계 (전작과 같은 필수요건, 지역만 해제)', [...T1, ...T2])
line('T1+T2+T3 합계', [...T1, ...T2, ...T3])

console.log(`\n[B] 가점 시그널 — T1+T2+T3 오늘 발송가능 인원 중`)
const all = sendable([...T1, ...T2, ...T3])
console.log(`  B2B·리드·세일즈 경험 ${all.filter(b2bLead).length} · 데이터 분석 ${all.filter(dataSig).length} · 한국어 언급/인증 ${all.filter(krAny).length} · 영어 인증 ${all.filter((p) => p.english_cert).length} · 공개 이력서 ${all.filter((p) => p.is_resume_public).length}`)
const yb = (a, lo, hi) => a.filter((p) => y(p) >= lo && y(p) < hi).length
console.log(`  경력 분포: 6m~1y ${yb(all, 6, 12)} · 1~3y ${yb(all, 12, 36)} · 3~5y ${yb(all, 36, 60)} · 5y+ ${yb(all, 60, 9999)}`)

console.log(`\n[C] 확장 후보 — 마케팅 직군 아님 × 6개월+ × 유료광고 운영 시그널 (직군 표기만 다른 사람)`)
line('비마케팅 직군 × 유료광고', fresh.filter((p) => !mktRole(p) && y(p) >= 6 && paidAds(p)))
console.log(`\n[D] 참고 — 마케팅 직군 × 6개월 미만(신입): ${sendable(fresh.filter((p) => mktRole(p) && y(p) < 6)).length}명 (JD 는 실적 설명 가능한 사람을 요구 → 기본 제외)`)

const score = (p) => (paidAds(p) ? 3 : 0) + (aiTool(p) ? 2 : 0) + (snsSeo(p) ? 1 : 0) + (b2bLead(p) ? 1 : 0) + (dataSig(p) ? 1 : 0) + (krAny(p) ? 1 : 0)
const show = (title, arr, n) => {
  console.log(`\n${title} 상위 ${Math.min(n, arr.length)}명`)
  for (const p of [...arr].sort((a, b) => score(b) - score(a)).slice(0, n))
    console.log(`  [${score(p)}] ${p.full_name} · ${roles(p).slice(0, 2).join('/') || '?'} · ${Math.round((y(p) / 12) * 10) / 10}y · ${p.location || '위치?'}${krAny(p) ? ' · KO' : ''}${oldRecSet.has(p.id) ? ' · R205수신' : ''}${p.is_resume_public ? '' : ' · 비공개'}`)
}
show('[E] T1', sendable(T1), 15)
show('[F] T2', sendable(T2), 15)
