// KTC CANDIDATE DATA 시트(=ktc-support candidates 테이블) 전체 기준 클레임 가능 풀 실측
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import { sb, env } from '/Users/wiseungju/salarymap/scripts/outreach/lib.mjs'
import { leadId } from '/Users/wiseungju/salarymap/lib/ktcMailToken.js'

const IMPORTABLE = /^https:\/\/[a-z0-9]+\.supabase\.co\/storage\/v1\/object\/public\//
async function fetchAll(client, build) {
  const out = []; const step = 1000
  for (let from = 0; ; from += step) {
    const { data, error } = await build().range(from, from + step - 1)
    if (error) throw error
    out.push(...(data || [])); if (!data || data.length < step) break
  }
  return out
}
const norm = (e) => (e || '').trim().toLowerCase()
const validEmail = (e) => /^[^@\s]+@[^@\s.]+\.[^@\s]+$/.test(e)

const ktc = createClient(env.KTC_SUPABASE_URL, env.KTC_SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const kc = await fetchAll(ktc, () => ktc.from('candidates').select('email, cv_url, created_at, sheet_source').order('created_at', { ascending: true }))
console.log('ktc candidates rows', kc.length)
const bySheet = {}
for (const c of kc) bySheet[c.sheet_source || '?'] = (bySheet[c.sheet_source || '?'] || 0) + 1
console.log('sheet_source 분포', bySheet)

// 사람 단위: 최신 지원일 + importable cv 아무거나
const people = new Map()
for (const c of kc) {
  const e = norm(c.email); if (!validEmail(e)) continue
  const p = people.get(e) || { email: e, last: '', first: '', cv: '' , n: 0 }
  p.n++
  const d = (c.created_at || '').slice(0, 10)
  if (!p.first || d < p.first) p.first = d
  if (d > p.last) p.last = d
  if (!p.cv && IMPORTABLE.test((c.cv_url || '').trim())) p.cv = c.cv_url.trim()
  people.set(e, p)
}
console.log('유니크 이메일', people.size)

const profs = await fetchAll(sb, () => sb.from('user_profiles').select('email').not('email', 'is', null).order('email'))
const members = new Set(profs.map(p => norm(p.email)))
const evts = await fetchAll(sb, () => sb.from('events').select('event, meta, created_at').in('event', ['coldmail_public_sent', 'coldmail_unsub']).order('created_at'))
const unsub = new Set(evts.filter(e => e.event === 'coldmail_unsub' && e.meta?.lead).map(e => e.meta.lead))
const touches = new Map() // lead -> {n, campaigns}
for (const e of evts) {
  if (e.event !== 'coldmail_public_sent' || !e.meta?.lead) continue
  const t = touches.get(e.meta.lead) || { n: 0, cv: 0, last: '' }
  t.n++; if (/^coldmail-ktc-cv/.test(e.meta.campaign || '')) t.cv++
  if (e.created_at > t.last) t.last = e.created_at
  touches.set(e.meta.lead, t)
}

// 7/28 CSV 리스트
const csvText = readFileSync('/Users/wiseungju/salarymap/data/ktc-leads-not-in-fyi.csv', 'utf8')
const csvEmails = new Set(csvText.split('\n').slice(1).map(l => norm(l.split(',')[0])).filter(validEmail))
console.log('7/28 CSV 리스트', csvEmails.size)

const claims = await fetchAll(sb, () => sb.from('ktc_claim_profiles').select('email').order('email'))
const parsed = new Set(claims.map(c => norm(c.email)))

const all = [...people.values()]
const nonMember = all.filter(p => !members.has(p.email))
const notUnsub = nonMember.filter(p => !unsub.has(leadId(p.email)))
const withCv = notUnsub.filter(p => p.cv)
const inCsv = withCv.filter(p => csvEmails.has(p.email))
const outCsv = withCv.filter(p => !csvEmails.has(p.email))
const never = withCv.filter(p => !touches.has(leadId(p.email)))
const neverOut = outCsv.filter(p => !touches.has(leadId(p.email)))
const neverIn = inCsv.filter(p => !touches.has(leadId(p.email)))

console.log('\n== 사람 단위 ==')
console.log('전체', all.length, '| FYI 가입済', all.length - nonMember.length, '| 미가입', nonMember.length)
console.log('수신거부 제외', notUnsub.length, '| 그중 임포트 가능 CV 보유', withCv.length, '| CV 없음/외부링크', notUnsub.length - withCv.length)
console.log('CV 보유 미가입: 7/28 CSV 안', inCsv.length, '/ CSV 밖(신규)', outCsv.length)
console.log('CV 보유 미가입 중 우리 메일 접촉 0:', never.length, '(CSV 안', neverIn.length, '/ 밖', neverOut.length, ')')
console.log('CV 보유 미가입 중 사전파싱済', withCv.filter(p => parsed.has(p.email)).length)

// 접촉 횟수 분포 (CV 보유 미가입)
const dist = {}
for (const p of withCv) { const n = touches.get(leadId(p.email))?.n || 0; const k = n >= 6 ? '6+' : String(n); dist[k] = (dist[k] || 0) + 1 }
console.log('접촉 횟수 분포(CV 보유 미가입)', dist)
// 최근 접촉일 분포
const lastDist = {}
for (const p of withCv) { const l = (touches.get(leadId(p.email))?.last || '').slice(0, 7) || 'none'; lastDist[l] = (lastDist[l] || 0) + 1 }
console.log('마지막 접촉 월', lastDist)

// 신규(CSV 밖) 지원월 분포
const m = {}
for (const p of outCsv) { const k = p.last.slice(0, 7); m[k] = (m[k] || 0) + 1 }
console.log('CSV 밖 CV 보유 미가입: 최근 지원월', m)
// CSV 밖 CV 없음 분포도
const outNoCv = notUnsub.filter(p => !p.cv && !csvEmails.has(p.email))
const m2 = {}
for (const p of outNoCv) { const k = p.last.slice(0, 7); m2[k] = (m2[k] || 0) + 1 }
console.log('CSV 밖 미가입 CV 없음', outNoCv.length, '최근 지원월', m2)
// CV 없음 샘플 url 형태
const sample = kc.filter(c => c.cv_url && !IMPORTABLE.test(c.cv_url.trim())).slice(-5).map(c => c.cv_url.slice(0, 70))
console.log('비임포트 cv_url 샘플', sample)
console.log('cv_url 빈값 행', kc.filter(c => !(c.cv_url || '').trim()).length)
