// 테크밸리 Cloud Technical Sales / PreSales (9/15 Len 게재) — 발송 가능 풀 실측 (읽기 전용)
// JD: HN/HCMC 온사이트 풀타임 · 미드레벨 2y+ (클라우드 세일즈/프리세일즈 or 클라우드 아키텍처/엔지니어링 핸즈온)
//     · AWS 핸즈온 필수 · VN 로컬 클라우드(CMC/FPT/VNG/Viettel IDC) 실무 · 영어 상급 필수 · 세일즈 오너십
// 티어: 코어=클라우드 시그널 × 세일즈 시그널 / 확장A=클라우드 기술직(프리세일즈 전환 후보) / 확장B=영업직 × IT 텍스트
import { sb, fetchAll } from '../outreach/lib.mjs'

const JOB_ID = '6a6e8a39-bfb2-4e17-95c8-c917920800ad'
const today = new Date().toISOString().slice(0, 10)

const norm = (v) => (Array.isArray(v) ? v.join(' ') : String(v || ''))
const txt = (p) => {
  const exp = Array.isArray(p.experiences) ? p.experiences.map((e) => `${e.title || e.position || ''} ${e.company || ''}`).join(' ') : ''
  return [p.position, p.headline, norm(p.desired_roles), norm(p.skills), exp, JSON.stringify(p.resume_summary || ''), p.university, p.major].join(' ').toLowerCase()
}
const roles = (p) => [p.position, ...(p.desired_roles || [])].filter(Boolean)
const y = (p) => p.yoe_months ?? 0
const inHcmc = (p) => /(h[ồo]\s*ch[íi]\s*minh|hcm|sài gòn|sai gon|thủ đức|thu duc|bình dương|binh duong)/i.test(String(p.location || ''))
const inHanoi = (p) => /(hà nội|ha noi|hanoi|hn\b)/i.test(String(p.location || ''))
const noLoc = (p) => !String(p.location || '').trim()
const enSignal = (p) => !!p.english_cert || /(english|tiếng anh|ielts|toefl|toeic)/i.test(txt(p))

// 클라우드 스킬(tv0909 cloud 룰 + VN 로컬 클라우드)
const CLOUD_KWS = ['aws', 'vpc', 'ec2', '\\bs3\\b', 'rds', '\\biam\\b', '\\belb\\b', 'cloudwatch', 'route ?53', 'cloudfront',
  'azure', '\\bgcp\\b', 'terraform', 'cloudformation', '\\becs\\b', '\\beks\\b', 'kubernetes', 'devops',
  'viettel', 'fpt cloud', 'vng cloud', '\\bcmc\\b', 'data ?center']
  .map((k) => new RegExp(k, 'i'))
const cloudHits = (p) => { const t = txt(p); return CLOUD_KWS.filter((re) => re.test(t)).length }
const awsSig = (p) => /\baws\b|amazon web/i.test(txt(p))
const TECH_ROLES = ['Solutions Architect', 'Cloud', 'SysAdmin', 'DevOps', 'SRE']
const techRole = (p) => roles(p).some((r) => TECH_ROLES.includes(String(r)))
const salesRole = (p) => roles(p).some((r) => /^(sales|business development)/i.test(String(r)))
const salesSig = (p) => /(pre-?sales|presales|technical sales|solution consult|sales engineer|account manager|account executive|business development|\bb2b\b|kinh doanh|bán hàng)/i.test(txt(p))
const itSig = (p) => /(cloud|saas|software|it solution|erp|crm|server|hosting|công nghệ thông tin|phần mềm)/i.test(txt(p))

const [pool, unsubs, recs, apps, todays] = await Promise.all([
  fetchAll(() => sb.from('user_profiles')
    .select('id,email,full_name,position,desired_roles,yoe_months,location,english_cert,skills,resume_summary,headline,experiences,university,major,graduation_year')
    .not('email', 'is', null).not('resume_url', 'is', null).order('created_at', { ascending: false })),
  fetchAll(() => sb.from('events').select('user_id').eq('event', 'coldmail_unsub').not('user_id', 'is', null).order('id')),
  fetchAll(() => sb.from('job_recommendations').select('user_id').eq('job_id', JOB_ID).order('id')),
  fetchAll(() => sb.from('job_applications').select('user_id').eq('job_id', JOB_ID).order('id')),
  fetchAll(() => sb.from('job_recommendations').select('user_id').gte('created_at', today).order('id')),
])
const unsubSet = new Set(unsubs.map((r) => r.user_id))
const sentSet = new Set([...recs.map((r) => r.user_id), ...apps.map((r) => r.user_id)])
const todaySet = new Set(todays.map((r) => r.user_id))

const seen = new Set()
const base = []
for (const p of pool) {
  if (!p.email || /likelion/i.test(p.email)) continue
  const e = p.email.toLowerCase()
  if (seen.has(e) || unsubSet.has(p.id) || sentSet.has(p.id)) continue
  seen.add(e)
  base.push(p)
}
console.log(`베이스(이메일·CV·unsub·본공고 기수신 제외): ${base.length}명 · 당일(${today}) recommend 기수신 ${todaySet.size}명`)

// 공통 하드게이트: 2y+ × 영어 시그널 × HN/HCMC/미기재
const gated = base.filter((p) => y(p) >= 24 && enSignal(p) && (inHcmc(p) || inHanoi(p) || noLoc(p)))
console.log(`공통 게이트(≥2y × 영어 × HN/HCMC/미기재): ${gated.length}명`)

const core = gated.filter((p) => (cloudHits(p) >= 1 || techRole(p)) && (salesRole(p) || salesSig(p)))
const extA = gated.filter((p) => !core.includes(p) && (techRole(p) || cloudHits(p) >= 2))
const extB = gated.filter((p) => !core.includes(p) && !extA.includes(p) && salesRole(p) && itSig(p))

const cnt = (arr, f) => arr.filter(f).length
console.log(`\n[코어 — 클라우드 시그널 × 세일즈 시그널] ${core.length}명 — 당일 겹침 ${cnt(core, (p) => todaySet.has(p.id))}명`)
console.log(`  그중 AWS 직접 언급 ${cnt(core, awsSig)}명 · 영어 인증 ${cnt(core, (p) => p.english_cert)}명 · VN 로컬 클라우드 언급 ${cnt(core, (p) => /viettel|fpt cloud|vng cloud|\bcmc\b/i.test(txt(p)))}명`)
console.log(`\n[확장A — 클라우드 기술직 2y+(SA/Cloud/DevOps/SysAdmin/SRE or 클라우드 키워드 2개+), 프리세일즈 전환 후보] ${extA.length}명 — 당일 겹침 ${cnt(extA, (p) => todaySet.has(p.id))}명`)
console.log(`  그중 AWS 직접 언급 ${cnt(extA, awsSig)}명 · 영어 인증 ${cnt(extA, (p) => p.english_cert)}명`)
console.log(`\n[확장B — 영업 직군 × IT 텍스트 시그널] ${extB.length}명 — 당일 겹침 ${cnt(extB, (p) => todaySet.has(p.id))}명`)

const score = (p) => cloudHits(p) + (salesSig(p) ? 3 : 0) + (salesRole(p) ? 2 : 0) + (awsSig(p) ? 2 : 0) + (p.english_cert ? 1 : 0)
for (const [name, arr] of [['코어', core], ['확장A', extA]]) {
  const top = [...arr].sort((a, b) => score(b) - score(a)).slice(0, 12)
  console.log(`\n[${name} 상위 ${top.length}명]`)
  for (const p of top)
    console.log(`  [${score(p)}${p.english_cert ? '·cert' : ''}] ${p.full_name} <${p.email}> · ${p.position || '?'} · ${Math.round(y(p) / 12 * 10) / 10}y · ${p.location || '위치?'}`)
}
