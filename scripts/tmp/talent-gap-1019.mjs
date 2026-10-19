// 읽기 전용: KTC 공고 세그먼트(직군×한국어×경력×지역)별 수요 vs 콜드메일 발송가능 풀 vs 콜드메일 성과 → 어떤 인재를 모아야 하는지
import { sb, fetchAll, fetchBlacklist } from '../outreach/lib.mjs'
const PASS = new Set(['passed','ready_to_forward','sent_to_company','interviewing','offer','final_passed'])
const koStrong = /(한국어\s*(능숙|가능|필수|우대)|korean[- ]speaking|korean speaker|tiếng hàn|topik\s*[3-6]|comtor|interpreter|phiên dịch|thông dịch|통역|한국어)/i
const med = (a) => { if (!a.length) return 0; const s=[...a].sort((x,y)=>x-y); return s[Math.floor(s.length/2)] }
const pct = (a,b) => b ? (100*a/b).toFixed(0)+'%' : '-'
const tbl = (title, rows) => { console.log('\n## '+title); const cols=[...new Set(rows.flatMap(r=>Object.keys(r)))]; console.log(cols.join('\t')); for (const r of rows) console.log(cols.map(c=>r[c]??'').join('\t')) }
const cat = (s) => { s=String(s||'').toLowerCase(); if (!s) return '(none)'
  if (/(interpreter|translator|comtor|phiên dịch|biên dịch|thông dịch|통역|korean.*staff)/.test(s)) return '통번역/한국어사무'
  if (/(game|unity)/.test(s)) return '게임'
  if (/(backend|frontend|fullstack|full-stack|web|mobile|developer|software|embedded|devops|data|ai|ml|security|cloud|solutions architect|it support|it\b|qa|tester|publisher|development|engineer(?!.*(production|process|electrical|mechanical)))/.test(s)) return 'IT/개발'
  if (/(design|ux|ui|graphic|artist|animator|rigger|modeler|motion|art director)/.test(s)) return '디자인'
  if (/(marketing|content|creator|influencer|growth|sns|media|editor|md\b|merchandis|booking|kol)/.test(s)) return '마케팅'
  if (/(sales|business development|account|kinh doanh|pre-?sales|trade|export|sourcing)/.test(s)) return '영업'
  if (/(hr|admin|office|assistant|secretary|general|operations|administration|hành chính|nhân sự|business$|non-it)/.test(s)) return 'HR/사무/운영'
  if (/(finance|accountant|kế toán|audit|tax|pháp lý|legal)/.test(s)) return '재무/회계'
  if (/(logistic|supply|import|warehouse|kho|purchas|procure|thu mua)/.test(s)) return '물류/구매'
  if (/(production|manufactur|mechanical|process|quality|qc|maintenance|electrical|technician|factory|kỹ sư|kỹ thuật|r&d|bảo trì|sản xuất|supervisor|worker)/.test(s)) return '생산/기술'
  if (/(pm|product|project|analyst|ba\b)/.test(s)) return 'PM/BA'
  return '기타비IT' }
const region = (s) => { s=String(s||'').toLowerCase(); if (!s.trim()) return '미기재'; if (/(hàn quốc|korea|서울|seoul)/.test(s)) return '한국'; if (/remote/.test(s)) return '원격'
  const hcm=/(hồ chí minh|ho chi minh|hcm|sài gòn|saigon|thủ đức|thu duc|district|quận|bình thạnh|tphcm|호치민|bình dương|binh duong)/.test(s), hn=/(hà nội|ha noi|hanoi|hn\b|하노이)/.test(s), dn=/(đà nẵng|da nang|đn\b|다낭)/.test(s)
  if (hcm&&(hn||dn)) return '다지역'; if (hcm) return 'HCM'; if (hn) return 'HN'; if (dn) return 'DN'; return '지방' }
const expBand = (m) => m>=36?'3y+':m>=12?'1-2y':'0'

const [jobs, recs, apps, cands, hiresRes, profs, unsubs, bl] = await Promise.all([
  fetchAll(() => sb.from('jobs').select('id,source_id,title,company,role,location,experience_min,salary_min,salary_text,requirements,preferred,description,summary,is_active,created_at').eq('source','ktc').gte('created_at','2026-08-15').order('created_at')),
  fetchAll(() => sb.from('job_recommendations').select('job_id,user_id,created_at').order('id')),
  fetchAll(() => sb.from('job_applications').select('job_id,user_id,application_source,created_at').order('id')),
  fetchAll(() => sb.from('ktc_candidates').select('job_code,pipeline_status').order('id')),
  sb.from('ktc_hires').select('code'),
  fetchAll(() => sb.from('user_profiles').select('id,email,position,role,desired_roles,yoe_months,korean_cert,major,location,resume_url,created_at,utm_campaign,experiences').not('resume_url','is',null).order('created_at')),
  fetchAll(() => sb.from('events').select('user_id').eq('event','coldmail_unsub').not('user_id','is',null).order('id')),
  fetchBlacklist(),
])
const unsub = new Set(unsubs.map(u=>u.user_id))
const pool = profs.filter(p => p.email && !/likelion/i.test(p.email) && !unsub.has(p.id) && !bl.has(p))
console.log('jobs', jobs.length, 'recs', recs.length, 'apps', apps.length, 'pool(이력서, 발송가능)', pool.length)

const hasCert = (c) => !!c && !/^(none|no|không|없음|-|n\/a|0)$/i.test(String(c).trim())
const koMajor = (p) => /(hàn quốc|korean|korea|ngôn ngữ hàn|đông phương|oriental|한국어|한국학)/i.test(String(p.major||''))
const koSig = (p) => hasCert(p.korean_cert) || koMajor(p)
const pcats = (p) => { const s = new Set([p.position, p.role, ...(p.desired_roles||[]), ...(Array.isArray(p.experiences)?p.experiences.slice(0,3).map(e=>e.title||e.position):[])].filter(Boolean).map(cat)); s.delete('(none)'); return s }
for (const p of pool) { p.__c = pcats(p); p.__r = region(p.location); p.__ko = koSig(p); p.__e = expBand(p.yoe_months||0) }

// 세그먼트별 공급
const supply = {}
for (const p of pool) for (const c of (p.__c.size? [...p.__c] : ['(none)'])) { const k = c; supply[k] ||= { 전체:0, KO:0, '1y+':0, 'KO×1y+':0, HCM:0, HN:0, DN:0, 지방:0, 미기재:0 }; supply[k].전체++; if (p.__ko) supply[k].KO++; if (p.__e!=='0') supply[k]['1y+']++; if (p.__ko&&p.__e!=='0') supply[k]['KO×1y+']++; supply[k][p.__r==='다지역'||p.__r==='한국'||p.__r==='원격'?'미기재':p.__r]++ }
tbl('S. 발송가능 풀 공급 (직군별, 1인 다직군 가능)', Object.entries(supply).sort((a,b)=>b[1].전체-a[1].전체).map(([k,v])=>({ 직군:k, ...v })))
console.log('풀 전체 KO 시그널:', pool.filter(p=>p.__ko).length, '| KO × 1y+:', pool.filter(p=>p.__ko&&p.__e!=='0').length, '| KO × 비IT:', pool.filter(p=>p.__ko&&![...p.__c].every(c=>c==='IT/개발'||c==='게임')).length)

// 공고별 수요·풀·성과
const R = {}, A = {}, AC = {}, C = {}, H = {}
for (const r of recs) R[r.job_id]=(R[r.job_id]||0)+1
for (const a of apps) { A[a.job_id]=(A[a.job_id]||0)+1; if (a.application_source==='coldmail_jobs') AC[a.job_id]=(AC[a.job_id]||0)+1 }
for (const c of cands) if (c.job_code) { C[c.job_code] ||= {n:0,pass:0}; C[c.job_code].n++; if (PASS.has(c.pipeline_status)) C[c.job_code].pass++ }
for (const h of hiresRes.data||[]) if (h.code) H[h.code]=(H[h.code]||0)+1
const rows = jobs.map(j => { const t=[j.title,j.requirements,j.preferred,j.description,j.summary].join(' '); const ko=koStrong.test(t); const c=cat(j.role+' '+j.title); const r=region(j.location); const e=expBand((j.experience_min||0)*12)
  const match = pool.filter(p => (p.__c.has(c)) && (!ko || p.__ko) && (e==='0' || (p.yoe_months||0) >= (j.experience_min||0)*12) && (r==='다지역'||r==='원격'||r==='미기재'||r==='한국'||p.__r==='미기재'||p.__r===r || (r==='지방'&&p.__r==='HCM')))
  return { code:j.source_id, company:j.company.slice(0,12), title:j.title.slice(0,26), cat:c, ko:ko?'KO':'-', exp:e, region:r, pool:match.length, sent:R[j.id]||0, apps:A[j.id]||0, cmApps:AC[j.id]||0, pass:C[j.source_id]?.pass||0, hire:H[j.source_id]||0, active:j.is_active?'Y':'N' } })
const seg = (key, label) => { const g={}; for (const r of rows) (g[key(r)] ||= []).push(r)
  tbl(label, Object.entries(g).sort((a,b)=>b[1].length-a[1].length).map(([k,v])=>({ 세그먼트:k, 공고:v.length, 풀중위:med(v.map(r=>r.pool)), '풀<30':v.filter(r=>r.pool<30).length, 발송중위:med(v.map(r=>r.sent)), 발송합:v.reduce((s,r)=>s+r.sent,0), 콜드메일지원:v.reduce((s,r)=>s+r.cmApps,0), 콜드전환:pct(v.reduce((s,r)=>s+r.cmApps,0), v.reduce((s,r)=>s+r.sent,0)), 지원중위:med(v.map(r=>r.apps)), '지원<5':v.filter(r=>r.apps<5).length, 서류합격:v.reduce((s,r)=>s+r.pass,0), 입사:v.reduce((s,r)=>s+r.hire,0) }))) }
seg(r=>r.cat, 'D1. 직군별 수요 vs 풀')
seg(r=>r.cat+' × '+r.ko, 'D2. 직군 × 한국어')
seg(r=>r.cat+' × exp'+r.exp, 'D3. 직군 × 경력')
seg(r=>r.ko+' × exp'+r.exp, 'D4. 한국어 × 경력')
seg(r=>r.region, 'D5. 지역')
tbl('D6. 풀 < 30명인 공고 (매칭 불가 공고)', rows.filter(r=>r.pool<30).sort((a,b)=>a.pool-b.pool))
