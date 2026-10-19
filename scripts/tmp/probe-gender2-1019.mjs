import { sb, fetchAll } from '../outreach/lib.mjs'
const jobs = await fetchAll(() => sb.from('jobs').select('source_id,title,company,requirements,preferred,description,summary,raw_payload,is_active').eq('source','ktc').gte('created_at','2026-07-01').order('created_at'))
const fem = /(giới tính\s*:?\s*nữ|ưu tiên\s+nữ|chỉ\s+tuyển\s+nữ|\bnữ\b(?!\s*(trang|sinh viên))|female|여성|여자|women|woman|lao động nữ)/i
const mal = /(giới tính\s*:?\s*nam\b|ưu tiên\s+nam\b|chỉ\s+tuyển\s+nam\b|\bnam\b(?=\s*(,|\/|giới|tuổi|từ|\d|$|\)|hoặc|ưu))|(?<!việt\s)(?<!viet\s)\bnam\s*(giới|nữ)|\bmale\b|남성|남자)/i
const gen = /(giới tính|gioi tinh|성별|gender)/i
let n=0; const ex=[]
for (const j of jobs) { const t=[j.title,j.requirements,j.preferred,j.description,j.summary].join(' ').replace(/việt\s*nam/gi,'VN').replace(/nam\s*á/gi,'xx').replace(/miền\s*nam/gi,'xx'); const g=gen.test(t), f=fem.test(t), m=mal.test(t); if (g||f||m) { n++; const mm=t.match(/.{0,50}(giới tính|nữ|nam\b|female|male|여성|남성|gender).{0,50}/i); ex.push(`${j.source_id}\t${j.company.slice(0,14)}\t${j.title.slice(0,30)}\t${f?'여':''}${m?'남':''}${g?'(성별명시)':''}\t${j.is_active?'Y':'N'}\t${(mm?.[0]||'').replace(/\s+/g,' ')}`) } }
console.log(`7월 이후 KTC 공고 ${jobs.length} | 성별 조건/언급 ${n}`); ex.forEach(l=>console.log(' ',l))
