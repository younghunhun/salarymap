// The Han V239 Service Manager(Korean speaking) + NSTAGE V226~V238 13건 (10/14 Len 등록) 발송 풀 실측 (읽기 전용)
// V239: Leonora Hotel(Gò Vấp, HCM) F&B 홀 서비스 총괄 · 한국어 or 영어 · 15~17M · 14:30~23:00 · 월 2회 휴무
// NSTAGE(하노이 Thanh Xuân 온사이트): Unity Dev(V226 2y+/V232 하이퍼캐주얼 2y+/V228 인턴) · Playable Ads Dev(V227 HTML5 엔진 or Unity, 1y+) · Game Designer(V234 3y+/V230 인턴)
//   · 2D Animator&VFX(V233 3y+, Spine 필수) · Creative Team Lead(V231 마케팅/크리에이티브 리드 1y+, AI 영상툴) · UA Marketing(V235 2y+/V236 시니어 5y+, MMP)
//   · IT Comtor(V237 TOPIK 5+ × IT 실무) · Social Media Content Intern(V229) · Game Community Ops Intern(V238, KO 우대)
import { sb, fetchAll, fetchBlacklist } from '../outreach/lib.mjs'

const today = new Date().toISOString().slice(0, 10)
const expTitles = (p) => (Array.isArray(p.experiences) ? p.experiences.map((e) => `${e.title || e.position || ''}`).join(' | ') : '')
const exp = (p) => (Array.isArray(p.experiences) ? p.experiences.map((e) => `${e.title || e.position || ''} ${e.company || ''} ${e.description || ''}`).join(' ') : '')
const txt = (p) => (JSON.stringify(p.skills || '') + ' ' + String(p.position || '') + ' ' + String(p.headline || '') + ' ' + JSON.stringify(p.desired_roles || '') + ' ' + JSON.stringify(p.resume_summary || '') + ' ' + exp(p) + ' ' + String(p.major || '') + ' ' + JSON.stringify(p.certs || '') + ' ' + JSON.stringify(p.projects || '')).toLowerCase()
const roles = (p) => [p.position, ...(p.desired_roles || [])].filter(Boolean)
const y = (p) => p.yoe_months ?? 0
const hcmRe = /(h[ồo]\s*ch[íi]\s*minh|hcm|sài gòn|sai gon|saigon|thủ đức|thu duc|bình thạnh|bình dương|binh duong|đồng nai|dong nai|biên hòa|long an|호치민|호찌민|hóc môn|gò vấp|go vap|tân bình|tân phú|bình tân|phú nhuận|củ chi|nhà bè|bình chánh|quận \d|district \d|tphcm|tp\.?\s*hcm)/i
const hnRe = /(hà nội|ha noi|hanoi|hn\b|하노이|cầu giấy|cau giay|đống đa|dong da|hai bà trưng|thanh xuân|thanh xuan|hoàng mai|long biên|từ liêm|tu liem|ba đình|ba dinh|hoàn kiếm|tây hồ|hà đông|ha dong|bắc ninh|bac ninh|hưng yên|vĩnh phúc)/i
const city = (p) => { const l = String(p.location || ''); if (!l.trim()) return '미기재'; if (hnRe.test(l)) return 'HN'; if (hcmRe.test(l)) return 'HCM'; if (/(đà nẵng|da nang|danang|다낭)/i.test(l)) return 'ĐN'; return '기타' }
const hnOk = (p) => ['HN', '미기재'].includes(city(p))
const hcmOk = (p) => ['HCM', '미기재'].includes(city(p))
const koCert = (p) => String(p.korean_cert || '').trim()
const koOk = (p) => (!!koCert(p) && !/^(none|no|không|없음|-|n\/a)$/i.test(koCert(p))) || /(korean|tiếng hàn|topik|한국어|hàn quốc)/i.test(p.__t)
const topik5 = (p) => /topik\s*(5|6|ii\s*[56])|(5|6)\s*급|level\s*[56]|cấp\s*[56]/i.test(koCert(p)) || /topik\s*(5|6)/i.test(p.__t) || /(korean|tiếng hàn|한국어|hàn)/i.test(String(p.major || ''))
const enOk = (p) => !!String(p.english_cert || '').trim() && !/^(none|no|không|없음|-|n\/a)$/i.test(String(p.english_cert).trim())
const isKorean = (p) => /(korea|한국|hàn quốc)/i.test(String(p.nationality || '')) || /[가-힣]{2,4}/.test(String(p.full_name || ''))

const [pool, unsubs, todays, bl] = await Promise.all([
  fetchAll(() => sb.from('user_profiles').select('id,email,full_name,position,desired_roles,yoe_months,location,english_cert,korean_cert,is_resume_public,skills,resume_summary,headline,experiences,major,university,nationality,certs,projects,created_at').not('email', 'is', null).not('resume_url', 'is', null).order('created_at', { ascending: false })),
  fetchAll(() => sb.from('events').select('user_id').eq('event', 'coldmail_unsub').not('user_id', 'is', null).order('id')),
  fetchAll(() => sb.from('job_recommendations').select('user_id').gte('created_at', today).order('id')),
  fetchBlacklist(),
])
const unsubSet = new Set(unsubs.map((r) => r.user_id)), todaySet = new Set(todays.map((r) => r.user_id))
const seen = new Set(); const base = []
for (const p of pool) { if (!p.email || /likelion/i.test(p.email)) continue; const e = p.email.toLowerCase(); if (seen.has(e) || unsubSet.has(p.id) || bl.has(p)) continue; seen.add(e); p.__t = txt(p); base.push(p) }
console.log(`베이스(이력서·수신거부/블랙리스트/내부 제외) ${base.length}명 · 당일 기수신 ${todaySet.size} · HN권 ${base.filter((p) => city(p) === 'HN').length} · HCM권 ${base.filter((p) => city(p) === 'HCM').length} · 미기재 ${base.filter((p) => city(p) === '미기재').length}`)

const line = (label, arr) => {
  const ok = arr.filter((p) => !todaySet.has(p.id))
  const c = {}; for (const p of ok) c[city(p)] = (c[city(p)] || 0) + 1
  const yb = {}; for (const p of ok) { const k = y(p) < 12 ? '<1y' : y(p) < 24 ? '1-2y' : y(p) < 36 ? '2-3y' : y(p) < 60 ? '3-5y' : '5y+'; yb[k] = (yb[k] || 0) + 1 }
  console.log(`  ${label}: ${arr.length}명 → 오늘 발송가능 ${ok.length}${arr.length - ok.length ? ` (당일 겹침 ${arr.length - ok.length})` : ''} · ${Object.entries(c).map(([k, v]) => `${k} ${v}`).join('/')} · 경력 ${Object.entries(yb).map(([k, v]) => `${k} ${v}`).join('/')} · KO ${ok.filter(koOk).length} · EN ${ok.filter(enOk).length} · 공개 ${ok.filter((p) => p.is_resume_public).length}`)
  return ok
}
const show = (label, arr, n = 8) => { console.log(`  [표본] ${label}`); for (const p of arr.slice(0, n)) console.log(`    ${p.full_name} · ${roles(p).slice(0, 2).join('/')} · ${Math.round(y(p) / 12 * 10) / 10}y · ${city(p)} · KO:${koCert(p).slice(0, 12) || '-'} · ${expTitles(p).slice(0, 60)}`) }

// ═══ The Han V239 ═══
const fnbRe = /(f&b|f\s*&\s*b|restaurant|nhà hàng|nha hang|hotel|khách sạn|khach san|hospitality|resort|cafe|coffee|quán|bar\b|barista|waiter|waitress|phục vụ|phuc vu|lễ tân|le tan|receptionist|front office|housekeeping|buồng phòng|bếp|chef|ẩm thực|catering|banquet|steward|hostess|quản lý nhà hàng|cửa hàng trưởng|store manager|shift leader|trưởng ca)/i
const fnbRole = (p) => roles(p).some((r) => /(f&b|hospitality|restaurant|hotel|service|customer service|cskh|retail|store|operations)/i.test(r)) || /(f&b|restaurant|nhà hàng|hotel|khách sạn|hospitality|resort|quản lý cửa hàng|store manager|cửa hàng trưởng|trưởng ca|shift|supervisor.*(nhà hàng|f&b|hotel))/i.test(expTitles(p))
const csRe = /(customer service|chăm sóc khách hàng|cskh|cs\b|guest relation|guest service|vip|complaint|khiếu nại|sales|bán hàng|tư vấn|tiếp tân|tổng đài)/i
const svcRole = (p) => roles(p).some((r) => /(customer service|cskh|sales|service|cs\b|retail|operations)/i.test(r))
console.log('\n[V239 The Han Service Manager (Korean speaking)] Gò Vấp HCM 온사이트 · KO or EN · 15–17M')
const H1 = base.filter((p) => hcmOk(p) && fnbRole(p) && koOk(p))
const H2 = base.filter((p) => hcmOk(p) && fnbRole(p) && !koOk(p) && enOk(p))
const H3 = base.filter((p) => hcmOk(p) && !fnbRole(p) && fnbRe.test(p.__t) && koOk(p))
const H4 = base.filter((p) => hcmOk(p) && !fnbRole(p) && !fnbRe.test(p.__t) && (svcRole(p) || csRe.test(expTitles(p))) && koOk(p))
const H5 = base.filter((p) => !hcmOk(p) && fnbRole(p) && koOk(p))
line('H1 F&B/호텔/매장 직군·직함 × KO × HCM/미기재 (코어)', H1); show('H1', H1)
line('H2 F&B/호텔/매장 직군·직함 × EN만 × HCM/미기재 (코어 — 영어 가능)', H2); show('H2', H2, 6)
line('H3 F&B 키워드만(직군·직함 아님) × KO × HCM/미기재 (확장)', H3); show('H3', H3, 6)
line('H4 CS/영업/서비스 직군·직함 × KO × HCM/미기재 (확장 — 홀 경험 없음)', H4); show('H4', H4, 6)
line('H5 타지역 × F&B 직군·직함 × KO (참고)', H5)
console.log(`  참고 — 한국인(국적/한글명) × F&B/CS 시그널: ${base.filter((p) => isKorean(p) && (fnbRole(p) || fnbRe.test(p.__t) || svcRole(p))).length}명`)

// ═══ NSTAGE (하노이) ═══
const unityRe = /(\bunity\b|unity3d|unity engine|c#.*game|game.*c#)/i
const gameRe = /(game|trò chơi|gamedev|mobile game|idle rpg|hyper ?casual|casual game)/i
const gameDevRole = (p) => roles(p).some((r) => /(game|unity)/i.test(r)) || /(game|unity)/i.test(expTitles(p))
const html5Re = /(phaser|pixi\.?js|cocos|three\.?js|playable|html5 game|canvas game|babylon)/i
const gdRe = /(game designer|game design|thiết kế game|level design|game balance|balancing|gdd\b|system design.*game|planner.*game|기획)/i
const spineRe = /(\bspine\b)/i
const anim2dRe = /(2d anim|animator|animation|vfx|visual effect|after effects|hiệu ứng|dragonbones|live2d|particle)/i
const creativeRe = /(creative (team )?lead|creative director|marketing (team )?lead|trưởng nhóm marketing|trưởng nhóm sáng tạo|content lead|video script|kịch bản|kling|seedance|runway|pika|ai video|short-form|mini drama)/i
const uaRe = /(user acquisition|\bua\b|performance marketing|mobile marketing|app marketing|appsflyer|adjust\b|singular|\bmmp\b|applovin|ironsource|unity ads|mintegral|roas|\bcpi\b|media buy|quảng cáo (game|app)|chạy ads|google ads|meta ads|facebook ads|tiktok ads)/i
const uaStrong = (p) => /(user acquisition|\bua\b|appsflyer|adjust\b|singular|\bmmp\b|applovin|ironsource|unity ads|mintegral|roas|\bcpi\b)/i.test(p.__t)
const mktRole = (p) => roles(p).some((r) => /(marketing|growth|performance|digital)/i.test(r)) || /(marketing|growth|performance|media buy|ua\b)/i.test(expTitles(p))
const itRe = /(developer|lập trình|engineer|software|\bit\b|công nghệ thông tin|information technology|tester|\bqa\b|\bqc\b|devops|data|system|hệ thống|phần mềm|frontend|backend|web|mobile)/i
const itBg = (p) => roles(p).some((r) => /(developer|engineer|frontend|backend|fullstack|mobile|qa|tester|devops|data|it\b|software|game|unity|comtor|bridge|ba\b|pm\b)/i.test(r)) || itRe.test(expTitles(p)) || /(công nghệ thông tin|information technology|computer|software|khoa học máy tính|cntt)/i.test(String(p.major || ''))
const comtorRe = /(comtor|bridge|thông dịch|phiên dịch|biên dịch|interpreter|translator|brse|통역|번역)/i
const snsRe = /(social media|sns|tiktok|youtube|facebook|instagram|content creator|kênh cá nhân|short-form|short form|video ngắn|reels|content marketing|sáng tạo nội dung|truyền thông)/i
const communityRe = /(community|cộng đồng|discord|naver|cafe|fan ?page|moderator|game master|\bgm\b|vận hành game|game operation|community manager)/i

console.log('\n[NSTAGE 13건] 하노이 Thanh Xuân 온사이트 · 지역 게이트 HN권/미기재')
const hn = base.filter(hnOk)
console.log(`  HN권/미기재 베이스 ${hn.length} · Unity 키워드 전체(전국) ${base.filter((p) => unityRe.test(p.__t)).length} / HN권 ${hn.filter((p) => unityRe.test(p.__t)).length}`)
const U = hn.filter((p) => unityRe.test(p.__t))
const U1 = U.filter((p) => y(p) >= 24), U2 = U.filter((p) => y(p) >= 12 && y(p) < 24), U3 = U.filter((p) => y(p) < 12)
line('U1 Unity × 24m+ (→ V226 Unity Dev / V232 Hyper Casual)', U1); show('U1', U1)
line('U2 Unity × 12~24m (→ V232 Hyper Casual "경험 적어도 가능")', U2); show('U2', U2, 5)
line('U3 Unity × <12m (→ V228 Unity Dev Intern / V230 Game Designer Intern)', U3); show('U3', U3, 5)
console.log(`    참고 — Unity 직군/직함 명시: ${U.filter(gameDevRole).length} · 타지역 Unity 24m+: ${base.filter((p) => !hnOk(p) && unityRe.test(p.__t) && y(p) >= 24).length}`)
const PA = hn.filter((p) => html5Re.test(p.__t) && !unityRe.test(p.__t) && y(p) >= 12)
line('P1 HTML5 게임엔진(Phaser/Pixi/Cocos/Three) × Unity 아님 × 12m+ (→ V227 Playable Ads, Unity 보유자는 U1에 포함)', PA); show('P1', PA, 5)
const GD = hn.filter((p) => gdRe.test(p.__t) && !unityRe.test(p.__t))
line('G1 Game Design 키워드 × Unity 아님 (→ V234 3y+ / V230 인턴)', GD); show('G1', GD, 5)
console.log(`    그중 36m+ ${GD.filter((p) => y(p) >= 36).length} · <24m ${GD.filter((p) => y(p) < 24).length}`)
const SP = hn.filter((p) => spineRe.test(p.__t))
const AN = hn.filter((p) => !spineRe.test(p.__t) && anim2dRe.test(p.__t) && /(designer|artist|animator|motion|graphic|thiết kế|họa sĩ)/i.test(roles(p).join(' ') + ' ' + expTitles(p)))
line('A1 Spine 명시 (→ V233 2D Animator&VFX, Spine 필수)', SP); show('A1', SP, 5)
line('A2 2D 애니/VFX/After Effects × 디자이너·아티스트 직군 × Spine 미기재 (참고)', AN); show('A2', AN, 5)
const CL = hn.filter((p) => creativeRe.test(p.__t) && mktRole(p) && y(p) >= 12)
line('C1 크리에이티브/마케팅 리드·AI 영상·숏폼 키워드 × 마케팅 직군 × 12m+ (→ V231 Creative Team Lead)', CL); show('C1', CL, 6)
const UA = hn.filter((p) => uaRe.test(p.__t) && mktRole(p))
const UA1 = UA.filter((p) => uaStrong(p) && y(p) >= 60), UA2 = UA.filter((p) => uaStrong(p) && y(p) >= 24 && y(p) < 60), UA3 = UA.filter((p) => !uaStrong(p) && y(p) >= 24)
line('M1 UA/MMP/AppLovin 강시그널 × 마케팅 직군 × 60m+ (→ V236 Senior UA)', UA1); show('M1', UA1, 5)
line('M2 UA/MMP 강시그널 × 24~60m (→ V235 UA Marketing)', UA2); show('M2', UA2, 5)
line('M3 광고 운영(Google/Meta/TikTok Ads) 약시그널 × 24m+ (확장 — 게임/앱 UA 아님)', UA3); show('M3', UA3, 5)
const CT1 = hn.filter((p) => topik5(p) && itBg(p))
const CT2 = hn.filter((p) => !topik5(p) && koOk(p) && itBg(p) && comtorRe.test(p.__t))
const CT3 = hn.filter((p) => !topik5(p) && koOk(p) && itBg(p) && !comtorRe.test(p.__t))
line('K1 TOPIK 5+/한국어 전공 × IT 배경 (→ V237 IT Comtor 코어)', CT1); show('K1', CT1)
line('K2 KO(급수 미상) × IT 배경 × Comtor/통번역 경력 (코어)', CT2); show('K2', CT2, 5)
line('K3 KO(급수 미상) × IT 배경 × 통번역 경력 없음 (확장)', CT3); show('K3', CT3, 5)
console.log(`    참고 — TOPIK 5+ × IT 배경 전국: ${base.filter((p) => topik5(p) && itBg(p)).length} · HCM ${base.filter((p) => topik5(p) && itBg(p) && city(p) === 'HCM').length}`)
const SM = hn.filter((p) => snsRe.test(p.__t) && y(p) < 24 && /(marketing|content|media|truyền thông|creator)/i.test(roles(p).join(' ') + ' ' + expTitles(p)))
line('S1 SNS/콘텐츠/숏폼 키워드 × 마케팅·콘텐츠 직군·직함 × <24m (→ V229 Social Media Content Intern)', SM); show('S1', SM, 5)
console.log(`    그중 KO ${SM.filter(koOk).length} · 게임 키워드 ${SM.filter((p) => gameRe.test(p.__t)).length}`)
const CM = hn.filter((p) => communityRe.test(p.__t) && y(p) < 24 && !unityRe.test(p.__t))
line('O1 커뮤니티/Discord/게임운영 키워드 × <24m (→ V238 Game Community Ops Intern)', CM); show('O1', CM, 5)
console.log(`    그중 KO ${CM.filter(koOk).length} · 게임 키워드 ${CM.filter((p) => gameRe.test(p.__t)).length}`)

const all = new Set([...U, ...PA, ...GD, ...SP, ...CL, ...UA, ...CT1, ...CT2, ...CT3, ...SM, ...CM].map((p) => p.id))
console.log(`\nNSTAGE 13건 합산 유니크 ${all.size}명 (HN권/미기재) · 당일 겹침 ${[...all].filter((id) => todaySet.has(id)).length}`)
