// 이력서 PDF 원문 재파싱 → user_profiles.cv_tags (jsonb) 백필.
// 기존 파서(lib/parseResume.js)가 안 뽑던 매칭 조건(세부 직군·산업·한국어 등급·전공 분류·주소 성/군·
// 성별·출생연도·툴·한국기업 경력·관리 경험 등)을 enum 으로 뽑는다. 기존 컬럼은 건드리지 않는다.
// 스키마 설계 근거: 7~10월 KTC 공고 241건 자격요건 언급 빈도(scripts/tmp/probe-jd-attrs-1019.mjs).
//
//   node scripts/backfill-cv-tags.mjs --sample 100 --model gpt-4o-mini --out /tmp/x.json   # DB 안 씀, 파일만
//   node scripts/backfill-cv-tags.mjs --model gpt-4o-mini --write                           # cv_tags 비어있는 전원
//   node scripts/backfill-cv-tags.mjs --load /tmp/x.json --write                            # 파일 결과를 DB 에 기록
//   --all: cv_tags 있어도 재처리 · --concurrency N (기본 4) · --seed N (sample 고정)
import { sb, fetchAll } from './outreach/lib.mjs' // .env.local → process.env 주입 — cvTags/parseResume 보다 먼저
import { extractResumeText } from '../lib/parseResume.js'
import { tagResume, cvTagsColumns, CV_TAGS_VERSION, CV_TAGS_MODEL } from '../lib/cvTags.js'
import { readFileSync, writeFileSync } from 'node:fs'

const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i === -1 ? d : (process.argv[i + 1] ?? true) }
const MODEL = arg('model', CV_TAGS_MODEL), SAMPLE = Number(arg('sample', 0)), OUT = arg('out'), LOAD = arg('load'), WRITE = arg('write', false) === true
const ALL = arg('all', false) === true, CONC = Number(arg('concurrency', 4)), SEED = Number(arg('seed', 42))

async function tagBuffer(buf) {
  let text = ''
  try { text = await extractResumeText(buf) } catch {}
  return tagResume({ text, buffer: buf, model: MODEL })
}

// 결정적 셔플(seed) — mini/4o 비교 시 같은 100명을 뽑기 위해
const rng = (s) => () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296 }
const shuffle = (a, seed) => { const r = rng(seed), o = [...a]; for (let i = o.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [o[i], o[j]] = [o[j], o[i]] } return o }

async function writeTags(id, tags, model) {
  const { error } = await sb.from('user_profiles').update(cvTagsColumns(tags, model)).eq('id', id)
  if (error) throw new Error('DB: ' + error.message)
}

if (LOAD) {
  const saved = JSON.parse(readFileSync(LOAD, 'utf8'))
  if (!WRITE) { console.log('--load 는 --write 와 함께'); process.exit(1) }
  let n = 0; for (const r of saved.results) if (r.tags) { await writeTags(r.id, r.tags, saved.model); n++ }
  console.log(`기록 ${n}명 (model ${saved.model})`); process.exit(0)
}

// cv_tags 컬럼은 마이그레이션(20261019_cv_tags.sql) 전엔 없다 — 그때는 --write 없이 샘플/파일 출력만 가능
const sel = (cols) => fetchAll(() => sb.from('user_profiles').select(cols).not('resume_url', 'is', null).neq('resume_url', ''))
let rows
try { rows = await sel('id, full_name, resume_url, cv_tags, resume_summary') }
catch (e) { if (e.code !== '42703') throw e; if (WRITE) { console.error('cv_tags 컬럼 없음 — supabase/migrations/20261019_cv_tags.sql 먼저 적용'); process.exit(1) } rows = await sel('id, full_name, resume_url, resume_summary') }
rows = rows.filter(r => !r.resume_summary?.parse_failed && (ALL || !r.cv_tags || (r.cv_tags._v || 0) < CV_TAGS_VERSION))
if (SAMPLE) rows = shuffle(rows, SEED).slice(0, SAMPLE)
console.log(`대상 ${rows.length}명 · model ${MODEL} · write=${WRITE} · out=${OUT || '-'}`)

const results = []; let ok = 0, fail = 0, done = 0, inTok = 0, outTok = 0
async function one(r) {
  try {
    const res = await fetch(r.resume_url); if (!res.ok) throw new Error('download ' + res.status)
    const { tags, usage, via } = await tagBuffer(Buffer.from(await res.arrayBuffer()))
    inTok += usage?.prompt_tokens || 0; outTok += usage?.completion_tokens || 0
    if (WRITE) await writeTags(r.id, tags, MODEL)
    results.push({ id: r.id, name: r.full_name, via, tags }); ok++
  } catch (e) { fail++; results.push({ id: r.id, name: r.full_name, error: String(e.message || e).slice(0, 120) }); if (fail <= 10) console.warn(`  실패 ${r.id}: ${String(e.message || e).slice(0, 100)}`) }
  finally { done++; if (done % 25 === 0 || done === rows.length) console.log(`  ${done}/${rows.length} 성공 ${ok} 실패 ${fail} · 토큰 in ${inTok} out ${outTok}`) }
}
for (let i = 0; i < rows.length; i += CONC) await Promise.all(rows.slice(i, i + CONC).map(one))
if (OUT) writeFileSync(OUT, JSON.stringify({ model: MODEL, schema: CV_TAGS_VERSION, at: new Date().toISOString(), usage: { inTok, outTok }, results }, null, 1))
console.log(`\n완료: 성공 ${ok} / 실패 ${fail} · 토큰 in ${inTok} out ${outTok}`)
