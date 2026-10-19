import { sb, fetchAll } from '../outreach/lib.mjs'
const jobs = await fetchAll(() => sb.from('jobs').select('source_id,title,company,requirements,preferred,description,summary,raw_payload').eq('source','ktc').gte('created_at','2026-07-01').order('created_at'))
const gRe = /(giới tính|gioi tinh|\bnữ\b|\bnam\b(?!\s*(định|việt))|female|male|여성|남성|여자|남자|성별|woman|women)/i
const fem = /(giới tính\s*:?\s*nữ|ưu tiên nữ|\bnữ\b|female|여성|여자|women|woman)/i, mal = /(giới tính\s*:?\s*nam|ưu tiên nam|\bnam\b(?!\s*(định|việt|á))|\bmale\b|남성|남자)/i
let n=0, f=0, m=0; const ex=[]
for (const j of jobs) { const t=[j.title,j.requirements,j.preferred,j.description,j.summary,JSON.stringify(j.raw_payload||'')].join(' '); if (gRe.test(t)) { n++; const isF=fem.test(t), isM=mal.test(t); if (isF) f++; if (isM) m++; const mm = t.match(/.{0,40}(giới tính|nữ|nam|female|male|여성|남성|성별).{0,40}/i); if (ex.length<15) ex.push(`${j.source_id} ${j.company.slice(0,14)} | ${j.title.slice(0,28)} | ${(mm?.[0]||'').replace(/\s+/g,' ')}`) } }
console.log(`7월 이후 KTC 공고 ${jobs.length} | 성별 언급 ${n} (여 ${f} / 남 ${m})`); ex.forEach(l=>console.log(' ',l))
// 풀: 이름 기반 성별 추정 가능 비율 + 파싱 입력 토큰 추정
const profs = await fetchAll(() => sb.from('user_profiles').select('full_name,experiences,skills,resume_summary,major,position,headline,korean_cert,english_cert,yoe_months,location,photo_url').not('resume_url','is',null).order('created_at'))
let thi=0, van=0, photo=0, tok=0
for (const p of profs) { const nm=String(p.full_name||''); if (/\bthị\b/i.test(nm)) thi++; else if (/\bvăn\b/i.test(nm)) van++; if (p.photo_url) photo++
  const input = JSON.stringify({ e:p.experiences, s:p.skills, r:p.resume_summary?.bullets, m:p.major, pos:p.position, h:p.headline, ko:p.korean_cert, en:p.english_cert, y:p.yoe_months, l:p.location }); tok += Math.ceil(input.length/3.2) }
console.log(`\n이력서 보유 ${profs.length} | 이름에 Thị ${thi} (${(100*thi/profs.length).toFixed(0)}%) / Văn ${van} (${(100*van/profs.length).toFixed(0)}%) → 중간이름으로 확정 가능 ${(100*(thi+van)/profs.length).toFixed(0)}% | 사진 있음 ${photo} (${(100*photo/profs.length).toFixed(0)}%)`)
console.log(`구조화 필드 기반 재태깅 입력 토큰 합계 ≈ ${(tok/1e6).toFixed(1)}M (1인 평균 ${Math.round(tok/profs.length)})`)
