// HANKUK CARBON VIETNAM V225 철도 복합재 설계 엔지니어 + V240 QA (10/14 Len 등록) 발송 풀 실측 (읽기 전용)
// V225: Chơn Thành(구 Bình Phước, 현 Đồng Nai) 온사이트 · 기계/제품 설계 3y+ · CATIA 필수 · GFRP/CFRP 복합재 우대 · 한국인 우대(베트남인 가능) · 급여 협의
// V240: HCM VINA 온사이트 · 항공우주 복합재 품질관리 · AS9100 유지 · 고객 감사 대응 · 공학 전공 3y+ · NADCAP 우대
// 지역 게이트 = HCMC권(HCM·Bình Dương·Đồng Nai·Bình Phước) 명시 or 미기재 · 경력 게이트 36m+ (완화층 12~36m)
import { sb, fetchAll, fetchBlacklist } from '../outreach/lib.mjs'

const V225 = 'b7430b94-0434-4267-bb43-98cf467c9cfd'
const V240 = 'a35f49a7-c0a2-4c4c-a1e5-aaa228fa0f50'
const today = new Date().toISOString().slice(0, 10)
const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString()

const expTitles = (p) => (Array.isArray(p.experiences) ? p.experiences.map((e) => `${e.title || e.position || ''}`).join(' | ') : '')
const exp = (p) => (Array.isArray(p.experiences) ? p.experiences.map((e) => `${e.title || e.position || ''} ${e.company || ''} ${e.description || ''}`).join(' ') : '')
const txt = (p) => (JSON.stringify(p.skills || '') + ' ' + String(p.position || '') + ' ' + String(p.headline || '') + ' ' + JSON.stringify(p.desired_roles || '') + ' ' + JSON.stringify(p.resume_summary || '') + ' ' + exp(p) + ' ' + String(p.major || '') + ' ' + JSON.stringify(p.certs || '')).toLowerCase()
const roles = (p) => [p.position, ...(p.desired_roles || [])].filter(Boolean)
const y = (p) => p.yoe_months ?? 0
const hcmRe = /(h[ồo]\s*ch[íi]\s*minh|hcm|sài gòn|sai gon|saigon|thủ đức|thu duc|bình thạnh|binh thanh|bình dương|binh duong|đồng nai|dong nai|biên hòa|bien hoa|bình phước|binh phuoc|chơn thành|long an|호치민|호찌민|hóc môn|gò vấp|tân bình|tân phú|bình tân|phú nhuận|củ chi|nhà bè|bình chánh|quận \d|district \d|tphcm|tp\.?\s*hcm)/i
const hcmOk = (p) => { const l = String(p.location || ''); return !l.trim() || hcmRe.test(l) }
const city = (p) => { const l = String(p.location || ''); if (!l.trim()) return '미기재'; if (/(bình dương|binh duong|đồng nai|dong nai|biên hòa|bien hoa|bình phước|binh phuoc|chơn thành)/i.test(l)) return 'BD/ĐN/BP'; if (hcmRe.test(l)) return 'HCM'; if (/(hà nội|ha noi|hanoi|hn\b|하노이)/i.test(l)) return 'HN'; if (/(đà nẵng|da nang|danang|다낭)/i.test(l)) return 'ĐN'; return '기타' }
const koOk = (p) => (!!String(p.korean_cert || '').trim() && !/^(none|no|없음|-|n\/a)$/i.test(String(p.korean_cert).trim())) || /(korean|tiếng hàn|topik|한국어)/i.test(p.__t)
const enOk = (p) => !!String(p.english_cert || '').trim() && !/^(none|no|없음|-|n\/a)$/i.test(String(p.english_cert).trim())
const isKorean = (p) => /(korea|한국|kr\b|hàn quốc)/i.test(String(p.nationality || '')) || /[가-힣]{2,4}/.test(String(p.full_name || ''))

// ── V225 설계 시그널 ──
const catiaRe = /catia/i
const mcadRe = /(catia|solidworks|solid works|siemens nx|\bnx\b|unigraphics|creo|pro\/?e\b|pro engineer|inventor|fusion ?360|autocad mechanical|autocad|auto cad|ansys|abaqus|hypermesh|\bfea\b|\bcae\b)/i
const mechRe = /(mechanical design|thiết kế cơ khí|thiet ke co khi|kỹ sư cơ khí|ky su co khi|cơ khí|co khi\b|mechanical engineer|product design engineer|design engineer|kỹ sư thiết kế|ky su thiet ke|kỹ thuật cơ khí|chế tạo máy|che tao may|\bdfm\b|\bbom\b|bản vẽ|ban ve|engineering drawing|2d\/3d|3d model|gd&t|tolerance|automotive engineer|aerospace engineer|kỹ thuật ô tô|hàng không)/i
const compRe = /(composite|vật liệu composite|gfrp|cfrp|carbon fiber|carbon fibre|sợi carbon|fiberglass|sợi thủy tinh|railway|đường sắt|rolling stock|metro|vật liệu|materials engineer|kỹ thuật vật liệu|khoa học vật liệu|polymer)/i
const uxRe = /(ui\/ux|ux\/ui|\bux\b|\bui\b|figma|product designer|graphic design|thiết kế đồ họa|web design)/i
const mechRole = (p) => roles(p).some((r) => /(mechanical|cơ khí|co khi|design engineer|product engineer|r&d|automotive|aerospace|manufactur|production engineer|materials)/i.test(r))
const mechTitle = (p) => /(mechanical|cơ khí|co khi|design engineer|kỹ sư thiết kế|r&d engineer|product engineer|cad)/i.test(expTitles(p))
const mechSig = (p) => (mcadRe.test(p.__t) || mechRe.test(p.__t)) && !(uxRe.test(roles(p).join(' ')) && !mechRole(p))
const majorMech = (p) => /(cơ khí|co khi|mechanical|chế tạo|automotive|ô tô|aerospace|hàng không|vật liệu|materials|cơ điện tử|mechatronic)/i.test(String(p.major || ''))

// ── V240 품질 시그널 ──
const qaRe = /(\bqa\b|\bqc\b|quality|chất lượng|chat luong|qa\/qc|qc\/qa|\bqms\b|iso ?9001|as ?9100|as9100|nadcap|iatf|ts ?16949|\bspc\b|\bppap\b|\bapqp\b|\bfmea\b|\bmsa\b|\b8d\b|\bcapa\b|kiểm tra chất lượng|đảm bảo chất lượng|kiểm soát chất lượng|quality audit|internal audit|đánh giá nội bộ|supplier quality|incoming inspection|\bcmm\b|six sigma|lean)/i
const swQaRe = /(selenium|test case|testcase|manual test|automation test|automated test|kiểm thử|tester|software test|qa engineer.*(software|web|app)|postman|cypress|playwright|jmeter|appium|bug report|test plan|test script|regression test|unit test)/i
const mfgRe = /(manufactur|sản xuất|san xuat|nhà máy|nha may|factory|plant|production|khu công nghiệp|kcn\b|industrial|composite|aerospace|hàng không|automotive|ô tô|materials|vật liệu|mechanical|cơ khí|electronics manufacturing|assembly|\bcnc\b|machining)/i
const aeroRe = /(as ?9100|as9100|nadcap|aerospace|hàng không|composite|vật liệu composite|carbon fiber|cfrp|gfrp|prepreg|autoclave|boeing|airbus)/i
const certQRe = /(iso ?9001|as ?9100|nadcap|iatf|ts ?16949|six sigma|lead auditor|internal auditor|cqe|cqa|asq|iso ?14001|iso ?45001|cmm)/i
const qaRole = (p) => roles(p).some((r) => /(\bqa\b|\bqc\b|quality|chất lượng|qa\/qc|qc\/qa|quality engineer|quality assurance|quality control)/i.test(r))
const qaTitle = (p) => /(\bqa\b|\bqc\b|quality|chất lượng|qa\/qc|qc\/qa)/i.test(expTitles(p))
const swQa = (p) => swQaRe.test(p.__t) && !mfgRe.test(p.__t)
const swRole = (p) => roles(p).some((r) => /(tester|software|qa engineer|automation|developer|frontend|backend|fullstack|mobile)/i.test(r))
const mfgQa = (p) => (qaRole(p) || qaTitle(p) || qaRe.test(p.__t)) && mfgRe.test(p.__t) && !swRole(p) && !swQaRe.test(p.__t)
const mfgQaLoose = (p) => (qaRole(p) || qaTitle(p) || qaRe.test(p.__t)) && mfgRe.test(p.__t) && !swRole(p)

const [pool, unsubs, recs225, apps225, recs240, apps240, todays, weeks, bl, jobs] = await Promise.all([
  fetchAll(() => sb.from('user_profiles').select('id,email,full_name,position,desired_roles,yoe_months,location,english_cert,korean_cert,is_resume_public,skills,resume_summary,headline,experiences,major,university,nationality,certs,created_at').not('email', 'is', null).not('resume_url', 'is', null).order('created_at', { ascending: false })),
  fetchAll(() => sb.from('events').select('user_id').eq('event', 'coldmail_unsub').not('user_id', 'is', null).order('id')),
  fetchAll(() => sb.from('job_recommendations').select('user_id').eq('job_id', V225).order('id')),
  fetchAll(() => sb.from('job_applications').select('user_id').eq('job_id', V225).order('id')),
  fetchAll(() => sb.from('job_recommendations').select('user_id').eq('job_id', V240).order('id')),
  fetchAll(() => sb.from('job_applications').select('user_id').eq('job_id', V240).order('id')),
  fetchAll(() => sb.from('job_recommendations').select('user_id').gte('created_at', today).order('id')),
  fetchAll(() => sb.from('job_recommendations').select('user_id').gte('created_at', weekAgo).order('id')),
  fetchBlacklist(),
  sb.from('jobs').select('id,title,company,source_id,is_active,status,location,type,experience_min').in('id', [V225, V240]),
])
for (const j of jobs.data) console.log(`공고: ${j.source_id} ${j.company} ${j.title} · active=${j.is_active} · status=${j.status} · ${j.location} · ${j.type} · exp ${j.experience_min}y+`)
console.log(`V225 기발송 ${recs225.length} · 기지원 ${apps225.length} / V240 기발송 ${recs240.length} · 기지원 ${apps240.length}`)
const unsubSet = new Set(unsubs.map((r) => r.user_id)), todaySet = new Set(todays.map((r) => r.user_id))
const sent225 = new Set([...recs225, ...apps225].map((r) => r.user_id)), sent240 = new Set([...recs240, ...apps240].map((r) => r.user_id))
const weekCnt = {}; for (const r of weeks) weekCnt[r.user_id] = (weekCnt[r.user_id] || 0) + 1
const stale = (p) => (weekCnt[p.id] || 0) >= 3
const seen = new Set(); const base = []
for (const p of pool) { if (!p.email || /likelion/i.test(p.email)) continue; const e = p.email.toLowerCase(); if (seen.has(e) || unsubSet.has(p.id) || bl.has(p)) continue; seen.add(e); p.__t = txt(p); base.push(p) }
console.log(`\n베이스(이력서·수신거부/블랙리스트/내부 제외) ${base.length}명 · 한국인(국적/한글명) ${base.filter(isKorean).length}`)

const line = (label, arr) => {
  const ok = arr.filter((p) => !todaySet.has(p.id))
  const c = {}; for (const p of ok) c[city(p)] = (c[city(p)] || 0) + 1
  console.log(`  ${label}: ${arr.length}명 → 오늘 발송가능 ${ok.length} (당일 겹침 ${arr.length - ok.length} · 7일 3통+ ${ok.filter(stale).length}) · ${Object.entries(c).map(([k, v]) => `${k} ${v}`).join('/')} · 한국인 ${ok.filter(isKorean).length} · EN ${ok.filter(enOk).length} · KO ${ok.filter(koOk).length} · 공개 ${ok.filter((p) => p.is_resume_public).length}`)
  return ok
}
const yb = (a) => { const d = {}; for (const p of a) { const k = y(p) < 12 ? '<1y' : y(p) < 36 ? '1-3y' : y(p) < 60 ? '3-5y' : '5y+'; d[k] = (d[k] || 0) + 1 } return Object.entries(d).map(([k, v]) => `${k} ${v}`).join(' · ') }
const show = (label, arr, sc, n) => { console.log(`\n[표본] ${label}`); for (const p of [...arr].sort((a, b) => sc(b) - sc(a)).slice(0, n)) console.log(`  [${sc(p)}] ${p.full_name} · ${roles(p).slice(0, 2).join('/')} · ${Math.round(y(p) / 12 * 10) / 10}y · ${city(p)} · ${String(p.major || '').slice(0, 25)} · ${expTitles(p).slice(0, 60)}`) }

// ═══ V225 ═══
const b225 = base.filter((p) => !sent225.has(p.id))
const mech = b225.filter(mechSig)
console.log(`\n[V225 설계 엔지니어] 기계설계/CAD 시그널 전체 ${mech.length} · CATIA 명시 ${mech.filter((p) => catiaRe.test(p.__t)).length} · 기계 CAD 툴 ${mech.filter((p) => mcadRe.test(p.__t)).length} · 기계 직군/직함 ${mech.filter((p) => mechRole(p) || mechTitle(p)).length} · 복합재/철도/재료 ${mech.filter((p) => compRe.test(p.__t)).length} · 기계계 전공 ${mech.filter(majorMech).length}`)
const D1 = mech.filter((p) => hcmOk(p) && y(p) >= 36 && catiaRe.test(p.__t))
const D2 = mech.filter((p) => hcmOk(p) && y(p) >= 36 && !catiaRe.test(p.__t) && mcadRe.test(p.__t) && (mechRole(p) || mechTitle(p) || majorMech(p)))
const D3 = mech.filter((p) => hcmOk(p) && y(p) >= 36 && !catiaRe.test(p.__t) && !(mcadRe.test(p.__t) && (mechRole(p) || mechTitle(p) || majorMech(p))) && (mechRole(p) || mechTitle(p)))
const D4 = mech.filter((p) => hcmOk(p) && y(p) >= 12 && y(p) < 36 && (catiaRe.test(p.__t) || (mcadRe.test(p.__t) && (mechRole(p) || mechTitle(p) || majorMech(p)))))
const D5 = mech.filter((p) => !hcmOk(p) && y(p) >= 36 && (catiaRe.test(p.__t) || (mcadRe.test(p.__t) && (mechRole(p) || mechTitle(p) || majorMech(p)))))
const DK = b225.filter((p) => isKorean(p) && (mechSig(p) || compRe.test(p.__t)))
line('D1 CATIA 명시 × 36m+ × HCMC권/미기재 (JD 코어)', D1)
line('D2 기타 기계 CAD(SolidWorks/NX/Creo/Inventor/AutoCAD) × 기계 직군·직함·전공 × 36m+ × HCMC권/미기재 (코어)', D2)
line('D3 기계 직군/직함만(CAD 툴 미기재) × 36m+ × HCMC권/미기재 (확장층)', D3)
line('D4 CATIA/기계 CAD × 12~36m × HCMC권/미기재 (JD 미달 — 참고)', D4)
line('D5 타지역 × CATIA/기계 CAD × 36m+ (온사이트 Chơn Thành — 참고)', D5)
line('DK 한국인 × 기계/복합재 시그널 (연차·지역 무관, 한국인 우대)', DK)
const core225 = line('D1+D2 합계(코어)', [...D1, ...D2])
console.log(`    경력 분포: ${yb(core225)}`)
const ext225 = line('D1+D2+D3 합계(코어+확장)', [...D1, ...D2, ...D3])
console.log(`    경력 분포: ${yb(ext225)}`)
const sc225 = (p) => (catiaRe.test(p.__t) ? 4 : 0) + (mcadRe.test(p.__t) ? 2 : 0) + (compRe.test(p.__t) ? 3 : 0) + (mechRole(p) || mechTitle(p) ? 2 : 0) + (majorMech(p) ? 1 : 0) + (enOk(p) ? 1 : 0) + (koOk(p) ? 1 : 0) + (isKorean(p) ? 2 : 0)
show('V225 코어+확장 상위 15', ext225, sc225, 15)
show('V225 코어+확장 하위 8', ext225, (p) => -sc225(p), 8)
show('V225 D4 완화층 상위 6', D4, sc225, 6)

// ═══ V240 ═══
const b240 = base.filter((p) => !sent240.has(p.id))
const qAny = b240.filter((p) => qaRole(p) || qaTitle(p) || qaRe.test(p.__t))
console.log(`\n[V240 QA] 품질 키워드 전체 ${qAny.length} · 그중 SW 테스트 성격 ${qAny.filter((p) => swRole(p) || swQa(p)).length} · 제조 품질(비SW) ${b240.filter(mfgQa).length} · 항공/복합재/AS9100 ${b240.filter((p) => aeroRe.test(p.__t)).length} · 품질 자격증 ${b240.filter((p) => certQRe.test(p.__t)).length}`)
const Q1 = b240.filter((p) => hcmOk(p) && y(p) >= 36 && mfgQa(p) && (qaRole(p) || qaTitle(p)))
const Q2 = b240.filter((p) => hcmOk(p) && y(p) >= 36 && mfgQa(p) && !(qaRole(p) || qaTitle(p)))
const Q3 = b240.filter((p) => hcmOk(p) && y(p) >= 12 && y(p) < 36 && mfgQa(p))
const Q4 = b240.filter((p) => hcmOk(p) && y(p) >= 36 && !mfgQa(p) && aeroRe.test(p.__t) && !swRole(p))
const Q5 = b240.filter((p) => !hcmOk(p) && y(p) >= 36 && mfgQa(p))
line('Q1 제조 품질 직군/직함(QA/QC/Quality) × 제조 문맥 × 36m+ × HCMC권/미기재 (JD 코어)', Q1)
line('Q2 품질 키워드만(직군·직함 아님) × 제조 문맥 × 36m+ × HCMC권/미기재 (확장층 — 생산/공정 엔지니어 등)', Q2)
line('Q3 제조 품질 × 12~36m × HCMC권/미기재 (JD 미달 — 참고)', Q3)
line('Q4 품질 아님 × 항공/복합재/AS9100 키워드 × 36m+ (참고)', Q4)
line('Q5 타지역 × 제조 품질 × 36m+ (참고)', Q5)
const core240 = line('Q1 코어', Q1)
console.log(`    경력 분포: ${yb(core240)}`)
const ext240 = line('Q1+Q2 합계(코어+확장)', [...Q1, ...Q2])
console.log(`    경력 분포: ${yb(ext240)}`)
const sc240 = (p) => (qaRole(p) ? 2 : 0) + (qaTitle(p) ? 2 : 0) + (aeroRe.test(p.__t) ? 4 : 0) + (certQRe.test(p.__t) ? 2 : 0) + (/(audit|đánh giá|kiểm toán)/i.test(p.__t) ? 1 : 0) + (enOk(p) ? 1 : 0) + (koOk(p) ? 1 : 0)
show('V240 코어+확장 상위 15', ext240, sc240, 15)
show('V240 코어+확장 하위 8', ext240, (p) => -sc240(p), 8)

const ov = new Set(ext225.map((p) => p.id)); console.log(`\n두 공고 겹침(V225 코어+확장 ∩ V240 코어+확장): ${ext240.filter((p) => ov.has(p.id)).length}명`)
