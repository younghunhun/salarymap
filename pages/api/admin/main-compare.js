import { createClient } from '@supabase/supabase-js'
import { verifyAdminOrDevStub } from './check'
import { isExcludedSignup } from '../../../lib/admin-metrics'
import { runReport } from './ga4'
import { listAllUsers, fetchAll } from './main-funnel'

// 메인 개편 전후 비교 — 연봉 메인(/ = 연봉 위저드) vs 새 포털 메인.
// 새 메인은 2026-11-11 12:07(VN) 배포 → 11/11 은 전환일이라 양쪽 모두에서 뺀다.
//   이전: 11/10 까지 14일 (10/28~11/10) · 이후: 11/12 ~ 오늘(진행 중인 오늘 포함)
// 기간 길이가 달라서 모든 지표를 "일 단위로 센 뒤 합산"한다 — 기간 유니크로 세면 긴 기간 쪽 전환율이 부풀려진다.
//   ① 사이트 전체: Σ신규가입 / Σ일별 GA4 방문자 (메인퍼널 일별 표의 가입률과 같은 정의)
//   ② 메인(/) 진입자: 날짜별 진입자(person_key) 중 그날(VN) 진입 이후 신규 가입한 사람.
//      이전 = 'landing'(page '/'), 이후 = 'main_landing'. 연봉 광고(이후엔 /salary 로 리다이렉트)·localhost·어드민 경유는 제외.

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const BEFORE = { from: '2026-10-28', to: '2026-11-10' }
const AFTER_FROM = '2026-11-12'

const toVN = (iso) => new Date(new Date(iso).getTime() + 7 * 3600000).toISOString().slice(0, 10)
const startOf = (d) => new Date(`${d}T00:00:00+07:00`).toISOString()
const endOf = (d) => new Date(`${d}T23:59:59.999+07:00`).toISOString()
const dayCount = (from, to) => Math.round((new Date(to) - new Date(from)) / 86400000) + 1

// pages/index.js isSalaryAd 와 같은 규칙
const isSalaryAd = (m) => m?.utm_campaign === 'fyi_lead' || /underpaid|salary|luong/i.test(m?.utm_content || '')
const isInternal = (m) => /localhost|\/admin/.test(m?.referrer || '')

async function windowStats({ from, to }, homeEvent, allUsers) {
  const startISO = startOf(from), endISO = endOf(to)

  // GA4 가 실패해도 ② 메인 진입자 지표는 보여 준다 (visitors=null → 화면에 '—')
  const ga4Daily = await runReport({ startDate: from, endDate: to, dimensions: ['date'], metrics: ['totalUsers'] }).catch(() => null)
  const visitors = ga4Daily ? (ga4Daily.rows || []).reduce((s, r) => s + parseInt(r.metricValues[0].value), 0) : null

  const signups = allUsers.filter(u => u.created_at >= startISO && u.created_at <= endISO && !isExcludedSignup(u))
  const signupAt = Object.fromEntries(signups.map(u => [u.id, u.created_at]))

  let q = supabase.from('events').select('person_key, created_at, meta')
    .eq('event', homeEvent).gte('created_at', startISO).lte('created_at', endISO).not('person_key', 'is', null).order('created_at')
  if (homeEvent === 'landing') q = q.eq('page', '/')
  const rows = (await fetchAll(q)).filter(r => !isSalaryAd(r.meta) && !isInternal(r.meta))

  // 날짜별 첫 진입 시각 (person_key 단위)
  const firstByDay = {}
  for (const r of rows) {
    const k = `${toVN(r.created_at)}|${r.person_key}`
    if (!firstByDay[k] || r.created_at < firstByDay[k]) firstByDay[k] = r.created_at
  }
  let homeConverted = 0
  for (const [k, ts] of Object.entries(firstByDay)) {
    const at = signupAt[k.split('|')[1]]
    if (at && at >= ts && toVN(at) === toVN(ts)) homeConverted++
  }

  return { from, to, days: dayCount(from, to), visitors, signups: signups.length, homeEntrants: Object.keys(firstByDay).length, homeConverted }
}

export default async function handler(req, res) {
  const user = await verifyAdminOrDevStub(req)
  if (!user) return res.status(401).json({ error: 'Unauthorized' })

  const today = toVN(Date.now())
  try {
    const allUsers = await listAllUsers()
    const [before, after] = await Promise.all([
      windowStats(BEFORE, 'landing', allUsers),
      today >= AFTER_FROM ? windowStats({ from: AFTER_FROM, to: today }, 'main_landing', allUsers) : null,
    ])
    res.status(200).json({ before, after })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}
