// 읽기 전용: 연봉 관련 보유 데이터 덤프(JSON) → 엑셀 정리용
import { sb, fetchAll } from '../outreach/lib.mjs'
import { roleGroupOf } from '../../lib/cvTagsMatch.js'
import { writeFileSync } from 'node:fs'
const out = process.argv[2]
const G = { 'IT/개발': /^(Backend|Frontend|Fullstack|Mobile|DevOps|QA|Web|Embedded|Game|Cloud|SRE|Security|Blockchain)/, '데이터·AI': /^(Data|AI|ML|BI)/, 'PM·BA': /^(PM|PO|Project Manager|Business Analyst)/, '디자인': /(Design|Motion)/, '마케팅': /(Marketing|Performance|Brand|Content|Digital)/, '영업·BD': /(Sales|Telesales|Business Development|Customer Service)/, 'HR': /(Recruiter|HR|C&B|Admin)/, '재무·회계': /(Accountant|Financial|Audit|Banking|Finance)/, '사무·통번역': /(Secretary|Operations|Legal|Interpreter)/, '제조·물류': /(Production|Process|Maintenance|QC|HSE|Warehouse|Procurement|Import|Supply)/ }
const grp = (r) => Object.entries(G).find(([, re]) => re.test(r || ''))?.[0] || '기타'
const normExp = (e) => /under/i.test(e) ? '1년 미만' : /^1/.test(e) ? '1~2년' : /^3/.test(e) ? '3~4년' : /^5/.test(e) ? '5~7년' : /^8/.test(e) ? '8년+' : String(e)
const krRe = /(samsung|lg|hyundai|kia|posco|hyosung|lotte|cj|sk |hanwha|doosan|shinhan|woori|kb |hana|vina\b|korea|korean|hàn quốc|han quoc|hansae|taekwang|changshin|kolon|youngone|hwaseung|pungkook|nexacode|ktc)/i
const subs = await fetchAll(() => sb.from('submissions').select('id,role,experience,salary,company,source,created_at').neq('source', 'seed').order('id'))
const submissions = subs.map((s) => ({ id: s.id, group: grp(s.role), role: s.role, exp: normExp(s.experience), exp_raw: s.experience, salary_m: Number(s.salary), company: (s.company || '').trim(), company_norm: (s.company || '').trim().toLowerCase(), korean_co: !!(s.company && krRe.test(s.company)), source: s.source || '', created: (s.created_at || '').slice(0, 10) }))
const jobs = await fetchAll(() => sb.from('jobs').select('source_id,company,title,role,location,experience_min,experience_max,salary_min,salary_max,salary_text,is_active,status,created_at').eq('source', 'ktc').gte('created_at', '2026-05-01').order('created_at'))
const ktc = jobs.map((j) => ({ code: j.source_id, group: roleGroupOf(j.role) || 'other', role: j.role, company: j.company, title: j.title, location: j.location, exp_min: j.experience_min, exp_max: j.experience_max, salary_min_m: j.salary_min ? Number(j.salary_min) / 1e6 : null, salary_max_m: j.salary_max ? Number(j.salary_max) / 1e6 : null, salary_text: j.salary_text || '', active: !!j.is_active, status: j.status || '', created: (j.created_at || '').slice(0, 10) }))
const pool = await fetchAll(() => sb.from('user_profiles').select('id,email,position,desired_roles,yoe_months,salary_min,salary_max,current_salary,salary_currency,cv_tags,resume_url').not('email', 'is', null).not('resume_url', 'is', null).order('created_at', { ascending: false }))
const seen = new Set(); const t = (p) => p.cv_tags || {}
const band = (m) => m == null ? '미상' : m < 12 ? '1년 미만' : m < 36 ? '1~2년' : m < 60 ? '3~4년' : m < 96 ? '5~7년' : '8년+'
const vnd = (p, k) => p[k] == null || (p.salary_currency && p.salary_currency !== 'VND') ? null : Number(p[k]) / 1e6
const profiles = []
for (const p of pool) { const e = p.email.toLowerCase(); if (seen.has(e) || /likelion/i.test(e)) continue; seen.add(e); const role = t(p).role_detail || p.position || ''; const y = Number.isFinite(t(p).yoe_total_months) ? t(p).yoe_total_months : (p.yoe_months ?? null); profiles.push({ group: grp(role), role, band: band(y), yoe_m: y, current_m: vnd(p, 'current_salary'), want_min_m: vnd(p, 'salary_min'), want_max_m: vnd(p, 'salary_max'), korean_level: t(p).korean_level || '', korean_co_exp: !!t(p).korean_company_exp, province: t(p).address_province || '' }) }
writeFileSync(out, JSON.stringify({ submissions, ktc, profiles }))
console.log(`submissions ${submissions.length} · ktc jobs ${ktc.length} · profiles ${profiles.length} (급여 기재 ${profiles.filter((p) => p.current_m || p.want_min_m).length})`)
