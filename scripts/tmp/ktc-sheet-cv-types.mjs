// 미가입·CV 비임포트 2,645명의 cv_url 유형 분포 + Drive 링크 공개 다운로드 가능률 샘플 실측
import { createClient } from '@supabase/supabase-js'
import { sb, env } from '../outreach/lib.mjs'
import { leadId } from '../../lib/ktcMailToken.js'

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
const kc = await fetchAll(ktc, () => ktc.from('candidates').select('email, cv_url, created_at').order('created_at', { ascending: true }))
const profs = await fetchAll(sb, () => sb.from('user_profiles').select('email').not('email', 'is', null).order('email'))
const members = new Set(profs.map(p => norm(p.email)))
const evts = await fetchAll(sb, () => sb.from('events').select('event, meta').eq('event', 'coldmail_unsub').order('created_at'))
const unsub = new Set(evts.map(e => e.meta?.lead).filter(Boolean))

const people = new Map()
for (const c of kc) {
  const e = norm(c.email); if (!validEmail(e) || members.has(e) || unsub.has(leadId(e))) continue
  const p = people.get(e) || { email: e, urls: [], last: '' }
  const u = (c.cv_url || '').trim(); if (u) p.urls.push(u)
  const d = (c.created_at || '').slice(0, 10); if (d > p.last) p.last = d
  people.set(e, p)
}
const type = (u) => IMPORTABLE.test(u) ? 'supabase' : /drive\.google\.com|docs\.google\.com/.test(u) ? 'drive' : /^https?:\/\//.test(u) ? 'other-url' : 'junk'
const noImp = [...people.values()].filter(p => !p.urls.some(u => IMPORTABLE.test(u)))
const dist = {}
const driveLeads = []
for (const p of noImp) {
  const ts = new Set(p.urls.map(type)); const k = p.urls.length === 0 ? 'empty' : ts.has('drive') ? 'drive' : ts.has('other-url') ? 'other-url' : 'junk'
  dist[k] = (dist[k] || 0) + 1
  if (k === 'drive') driveLeads.push(p)
}
console.log('비임포트 미가입', noImp.length, dist)
const others = noImp.filter(p => p.urls.length && !p.urls.some(u => type(u) === 'drive')).flatMap(p => p.urls).slice(0, 12)
console.log('other/junk 샘플', others.map(u => u.slice(0, 60)))

// Drive 링크 공개 접근 샘플 60건(최근순)
const fileId = (u) => (u.match(/\/d\/([A-Za-z0-9_-]{20,})/) || u.match(/[?&]id=([A-Za-z0-9_-]{20,})/) || [])[1]
const sample = driveLeads.sort((a, b) => b.last.localeCompare(a.last)).filter((_, i) => i % Math.ceil(driveLeads.length / 60) === 0).slice(0, 60)
let ok = 0, pdf = 0, blocked = 0, noid = 0, gdoc = 0
for (const p of sample) {
  const u = p.urls.find(x => type(x) === 'drive'); const id = fileId(u)
  if (!id) { noid++; continue }
  if (/docs\.google\.com\/document/.test(u)) { gdoc++; continue }
  try {
    const r = await fetch(`https://drive.google.com/uc?export=download&id=${id}`, { redirect: 'follow' })
    const ct = r.headers.get('content-type') || ''
    if (r.ok && !/text\/html/.test(ct)) { ok++; if (/pdf/.test(ct)) pdf++ }
    else if (r.ok && /text\/html/.test(ct)) {
      const body = await r.text()
      if (/download-form|confirm=/.test(body)) { ok++ } // 대용량 확인 페이지 = 공개 파일
      else blocked++
    } else blocked++
  } catch { blocked++ }
}
console.log(`Drive 샘플 ${sample.length}: 공개 다운로드 가능 ${ok}(pdf ${pdf}) · 차단/비공개 ${blocked} · 구글문서 ${gdoc} · id추출실패 ${noid}`)
