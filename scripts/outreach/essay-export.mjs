// 자기소개서 답변 정리 — job_essays + ktc_candidates(이름·파이프라인 상태) 를 묶어 요약/CSV.
//   node scripts/outreach/essay-export.mjs --job R248 [--out path.csv]
import { writeFileSync } from 'node:fs'
import { sb } from './lib.mjs'
import { essayFor } from '../../lib/jobEssays.js'

const args = process.argv.slice(2)
const flag = (k) => { const i = args.indexOf(`--${k}`); return i < 0 ? null : args[i + 1] }
const code = String(flag('job') || '').toUpperCase()
const essay = essayFor(code)
if (!essay) { console.error(`lib/jobEssays.js 에 ${code} 문항 없음`); process.exit(1) }

const { data: job } = await sb.from('jobs').select('id,company,title').eq('source', 'ktc').eq('source_id', code).maybeSingle()
const { data: rows } = await sb.from('job_essays').select('email,answers,source,created_at,updated_at').eq('job_id', job.id).order('updated_at')
const { data: cands } = await sb.from('ktc_candidates').select('email,full_name,phone,pipeline_status').eq('job_code', code)
const cand = Object.fromEntries((cands || []).map((c) => [String(c.email || '').toLowerCase(), c]))

const yesno = essay.questions.filter((q) => q.type === 'yesno')
console.log(`${code} ${job.company} · ${job.title} — 제출 ${rows.length}명`)
for (const q of yesno) {
  const y = rows.filter((r) => r.answers[q.key] === 'yes').length
  console.log(`  ${q.label.ko}: 가능 ${y} · 불가 ${rows.length - y}`)
}

const csvCell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
const head = ['이름', '이메일', '전화', '파이프라인', '경로', '제출(최종수정)', ...essay.questions.map((q) => q.label.ko)]
const lines = rows.map((r) => {
  const c = cand[r.email] || {}
  return [c.full_name, r.email, c.phone, c.pipeline_status, r.source === 'mail' ? '메일' : '지원시', new Date(r.updated_at).toLocaleString('ko-KR', { timeZone: 'Asia/Ho_Chi_Minh' }),
    ...essay.questions.map((q) => (q.type === 'yesno' ? (r.answers[q.key] === 'yes' ? '가능' : '불가') : r.answers[q.key]))]
})
const out = flag('out')
if (out) { writeFileSync(out, '﻿' + [head, ...lines].map((l) => l.map(csvCell).join(',')).join('\n')); console.log(`CSV: ${out}`) }
else for (const l of lines) console.log(`  ${l[0]} <${l[1]}> · ${l[3]} · ${l.slice(-1)[0]}`)
