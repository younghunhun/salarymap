import { useState, useEffect, useRef, Fragment } from 'react'
import Head from 'next/head'
import dynamic from 'next/dynamic'
import { supabase } from '../../lib/supabaseClient'
import { useAdmin, prefetchAdmin } from '../../lib/adminSwr'
import { useT } from '../../lib/i18n'
import { useRouter } from 'next/router'
import AdminLayout from '../../components/admin/AdminLayout'
import DateRangePicker from '../../components/admin/DateRangePicker'
import Icon from '../../components/Icon'
import MainFunnelView from '../../components/admin/MainFunnelView'
import TalentView from '../../components/admin/TalentView'
import VerificationsView from '../../components/admin/VerificationsView'
import CommunityView from '../../components/admin/CommunityView'
import BlacklistView from '../../components/admin/BlacklistView'
import GoalMetricsView, { ColdmailView } from '../../components/admin/GoalMetricsView'
import { TabGroup, ChipGroup, Toggle } from '@likelion-design/ui'
import {
  G, C, num, PrimaryButton, SecondaryButton, GhostButton, Field, TextArea, FilterTabs, StatusTag,
  Card, SectionTitle, StatGrid, StatTile, State, T as TS,
} from '../../components/admin/ui'
import { T, METRICS_BASE, EXP_COLORS, COLORS } from '../../constants/dashboard'
import { aggregateDaily, vnDate } from '../../utils/dashboard'

const MetricChart = dynamic(() => import('../../components/DashboardCharts'), { ssr: false })

function cellPct(cur, prev) {
  if (cur === null || cur === undefined || prev === null || prev === undefined) return null
  if (prev === 0) return cur > 0 ? 100 : 0
  return Math.round(((cur - prev) / prev) * 100)
}

// 선택 가능한 통계 타일 — kit StatTile 에는 onClick 이 없어 한 겹 감싼다. 선택 표시는 주황 1px 테두리뿐.
function PickTile({ active, onClick, ...p }) {
  return (
    <div onClick={onClick} style={{ minWidth: 0, cursor: onClick ? 'pointer' : 'default' }}>
      <StatTile {...p} style={{ height: '100%', boxSizing: 'border-box', border: `1px solid ${active ? C.primary : C.border}`, transition: 'border-color 0.12s ease' }} />
    </div>
  )
}

// 퍼포먼스 대시보드 섹션 구분
const SECTION_LABELS = {
  basic: { ko: '기본 정보', en: 'Basics', vi: 'Thông tin cơ bản' },
  talent: { ko: '인재 채용 지표', en: 'Talent funnel', vi: 'Phễu ứng viên' },
  company: { ko: '기업 채용 지표', en: 'Company funnel', vi: 'Phễu doanh nghiệp' },
}
const TIER_LABELS = {
  primary: { ko: '주요 지표', en: 'Key metrics', vi: 'Chỉ số chính' },
  secondary: { ko: '보조 지표', en: 'Sub metrics', vi: 'Chỉ số phụ' },
}
// 기업 채용 섹션 카드 (요약 숫자 — 일별 차트 미연동)
const B2B_CARDS = [
  { key: 'forClicks', summaryKey: 'totalForCompaniesClicks', ko: '홈→기업채용 클릭', en: 'Home→For-companies click', vi: 'Click Trang chủ→Nhà tuyển dụng', tier: 'primary' },
  { key: 'contactClicks', summaryKey: 'totalContactOwnerClicks', ko: '담당자 대화 버튼 클릭', en: 'Contact button clicks', vi: 'Click nút liên hệ', tier: 'primary' },
  { key: 'postJobClicks', summaryKey: 'totalPostJobClicks', ko: '공고 올리기 버튼 클릭', en: 'Post-job button clicks', vi: 'Click nút đăng tin', tier: 'primary' },
  { key: 'companySignups', summaryKey: 'totalCompanySignups', ko: '기업 회원 가입', en: 'Company sign-ups', vi: 'Doanh nghiệp đăng ký', tier: 'primary' },
  { key: 'pendingJobs', summaryKey: 'pendingJobs', ko: '기업 공고 승인 대기', en: 'Jobs pending approval', vi: 'Tin chờ duyệt', tier: 'primary' },
]

export default function AdminDashboard() {
  const [auth, setAuth] = useState('loading')
  const [token, setToken] = useState(null)
  const [selected, setSelected] = useState([])
  const [lastUpdated, setLastUpdated] = useState(null)
  const [expForm, setExpForm] = useState({ title: '', date: '', color: EXP_COLORS[0], metrics: [] })
  const [showExpForm, setShowExpForm] = useState(false)
  const { lang: globalLang } = useT()
  // Admin dashboard ships ko/en/vi; fall back to en for any other global lang
  const lang = globalLang === 'ko' || globalLang === 'vi' ? globalLang : 'en'
  const L = (ko, en, vi) => (lang === 'vi' ? (vi ?? en) : lang === 'ko' ? ko : en)
  const router = useRouter()
  const tab = router.query.tab || 'main'
  // 날짜 범위를 실제로 쓰는 탭에서만 날짜 피커 노출 (이력서/인재풀/연봉인증은 누적 목록이라 무관)
  const showDatePicker = ['main', 'trend', 'community'].includes(tab)
  const [chartMode, setChartMode] = useState('1d')
  const [tableView, setTableView] = useState('daily')
  const [tableSection, setTableSection] = useState('basic')
  // 유진 작업실의 페이지 전환 — 알약은 AdminLayout 타이틀 옆, 본문은 아래라 상태를 여기서 든다.
  const tableScrollRef = useRef(null)
  const [dualAxis, setDualAxis] = useState(true)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const todayStr = vnDate(Date.now())
  // 기본 기간 = 최근 30일(당일 포함). 누적이 길어져 전 기간 기본은 폐기.
  const from30 = vnDate(Date.now() - 29 * 86400000)
  const [dateRange, setDateRange] = useState({ from: from30, to: todayStr })
  // 메인 퍼널만 계측 완비일(7/16) 이전으로 내려가지 않게 클램프. 유저가 피커를
  // 직접 만지면(dateTouched) 그 선택을 모든 탭에서 존중하고 자동 전환을 멈춘다.
  const [dateTouched, setDateTouched] = useState(false)
  useEffect(() => {
    if (dateTouched) return
    setDateRange(r => ({ ...r, from: tab === 'main' && from30 < '2026-07-16' ? '2026-07-16' : from30 }))
  }, [tab, dateTouched]) // eslint-disable-line

  // SWR: 캐시로 탭 전환/페이지 재방문 시 즉시 표시 + 백그라운드 갱신. 키에 날짜/언어 포함.
  // 무거운 데이터는 실제로 쓰는 탭에서만 로드 — data/ga4 는 추이·퍼널, realtime/experiments 는
  // 추이 전용. 다른 탭(기업 등)이 자기 요청만 발사하도록 게이트해 초기 로딩 경쟁을 없앤다.
  const needsCore = ['trend'].includes(tab)
  const { data, isLoading: loading } = useAdmin(
    needsCore ? `/api/admin/dashboard?from=${dateRange.from}&to=${dateRange.to}&lang=${lang}` : null, token
  )
  const { data: ga4 } = useAdmin(needsCore ? `/api/admin/ga4?from=${dateRange.from}&to=${dateRange.to}` : null, token)
  const { data: realtime } = useAdmin(tab === 'trend' ? '/api/admin/realtime' : null, token, {
    refreshInterval: autoRefresh ? 30000 : 0,
  })
  const { data: experiments = [], mutate: mutateExperiments } = useAdmin(tab === 'trend' ? '/api/admin/experiments' : null, token)

  // 마지막 갱신 시각 표시용 — 데이터/실시간 갱신 때마다 기록
  useEffect(() => { if (data || realtime) setLastUpdated(new Date()) }, [data, realtime])

  // 다른 탭 데이터 백그라운드 프리페치 — 인증되면 자주 쓰는 탭의 엔드포인트를 미리
  // 캐시에 채워, 첫 진입 지연(콜드스타트+실데이터 쿼리)을 사용자가 체감하지 않게 한다.
  // 키는 각 View 의 useAdmin URL 과 글자까지 동일해야 적중한다.
  useEffect(() => {
    if (!token) return
    const urls = [
      '/api/admin/resumes',                                            // talent (인재풀)
      `/api/admin/community?from=${dateRange.from}&to=${dateRange.to}`, // community
      '/api/salary-verification/admin?status=pending',                 // verifications(기본 필터)
    ]
    // 활성 탭(추이)의 메인 요청이 먼저 나가도록 살짝 늦춰 경쟁을 피한다.
    const id = setTimeout(() => urls.forEach(u => prefetchAdmin(u, token)), 800)
    return () => clearTimeout(id)
  }, [token, dateRange.from, dateRange.to])

  // 일별 뷰 진입/섹션 변경/데이터 로드 시 최신(맨 아래)로 스크롤
  useEffect(() => {
    if (tableView === 'daily' && tableScrollRef.current) {
      tableScrollRef.current.scrollTop = tableScrollRef.current.scrollHeight
    }
  }, [tableView, tableSection, loading])

  const t = T[lang]
  const METRICS = METRICS_BASE.map(m => ({ ...m, label: t.metrics[m.key] }))

  const headers = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${token}` })

  useEffect(() => {
    // Dev convenience: skip OAuth + admin check locally so admin views can
    // be previewed without redoing login on every browser/profile. Paired
    // with verifyAdminOrDevStub on the API side. Production untouched.
    if (process.env.NODE_ENV === 'development') {
      setAuth('ok')
      setToken('dev-local')
      return
    }
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { setAuth('denied'); return }
      try {
        const res = await fetch(`/api/admin/check?email=${encodeURIComponent(session.user.email)}`)
        const { isAdmin } = await res.json()
        if (!isAdmin) { setAuth('denied'); return }
        setToken(session.access_token)
        setAuth('ok')
      } catch {
        setAuth('denied')
      }
    })
    // 토큰은 만료(기본 1시간)되므로 한 번 잡아둔 값은 곧 죽는다. supabase가
    // 백그라운드에서 갱신할 때(TOKEN_REFRESHED) state도 최신 토큰으로 교체해,
    // 모든 어드민 API 호출이 만료 토큰으로 401 나는 걸 막는다.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.access_token) setToken(session.access_token)
    })
    return () => subscription?.unsubscribe()
  }, [])


  const [editingExp, setEditingExp] = useState(null)

  async function addExperiment() {
    if (!expForm.title || !expForm.date) return
    const res = await fetch('/api/admin/experiments', {
      method: 'POST', headers: headers(), body: JSON.stringify(expForm)
    })
    if (res.ok) {
      setExpForm({ title: '', date: '', color: EXP_COLORS[experiments.length % EXP_COLORS.length], metrics: [] })
      setShowExpForm(false)
      mutateExperiments()
    }
  }

  async function updateExperiment() {
    if (!editingExp || !editingExp.title || !editingExp.date) return
    const res = await fetch('/api/admin/experiments', {
      method: 'PUT', headers: headers(), body: JSON.stringify(editingExp)
    })
    if (res.ok) {
      setEditingExp(null)
      mutateExperiments()
    }
  }

  async function deleteExperiment(id) {
    if (!confirm(t.expDeleteConfirm)) return
    await fetch('/api/admin/experiments', {
      method: 'DELETE', headers: headers(), body: JSON.stringify({ id })
    })
    setEditingExp(null)
    mutateExperiments()
  }

  if (auth === 'loading') return <div style={{ padding: 40, textAlign: 'center' }}>{t.loading}</div>
  if (auth === 'denied') return <div style={{ padding: 40, textAlign: 'center' }}>{t.denied}</div>

  const selectedMetrics = METRICS.filter(m => selected.includes(m.key))
  // 차트는 선택 지표가 속한 최상단 섹션 바로 아래에 붙인다 (기본 지표 선택인데 인재 아래에 뜨지 않게)
  const chartSection = ['basic', 'talent', 'company'].find(s => selectedMetrics.some(m => m.section === s))

  const dailyWithToday = (() => {
    if (!data?.daily) return data?.daily
    // Merge GA4 sessions into daily data
    const ga4Map = {}
    if (ga4?.daily) {
      for (const d of ga4.daily) ga4Map[d.date] = { sessions: d.sessions, totalUsers: d.totalUsers, newUsers: d.newUsers, engagedSessions: d.engagedSessions }
    }
    let merged = data.daily.map(d => ({
      ...d,
      sessions: ga4Map[d.date]?.sessions ?? 0,
      ga4Users: ga4Map[d.date]?.totalUsers ?? 0,
      ga4NewUsers: ga4Map[d.date]?.newUsers ?? 0,
      ga4Engaged: ga4Map[d.date]?.engagedSessions ?? 0,
    }))

    if (!realtime) return merged
    const today = realtime.date
    if (today > dateRange.to && today !== vnDate(Date.now())) return merged
    // 이력서 공개(앱/웹)는 realtime 이벤트가 없고 DB 상태 스냅샷이라 today 행 교체 시
    // API가 준 오늘 값을 그대로 보존한다(교체로 라인이 끊기지 않게).
    const prevToday = merged.find(d => d.date === today)
    const todayData = {
      date: today,
      resumePublic: prevToday?.resumePublic ?? null,
      resumePublicApp: prevToday?.resumePublicApp ?? null,
      resumePublicWeb: prevToday?.resumePublicWeb ?? null,
      sessions: ga4?.today?.sessions ?? 0,
      submissions: realtime.submissions,
      ad: realtime.ad,
      organic: realtime.organic,
      signups: realtime.signups,
      companies: realtime.companies ?? 0,
      jobClicks: realtime.jobClicks,
      cardClicks: realtime.cardClicks,
      jobApps: realtime.jobApps,
      jobAppsCompany: realtime.jobAppsCompany ?? 0,
      cvSuccessApps: realtime.cvSuccessApps ?? 0,
      jobsPageViews: realtime.jobsPageViews ?? 0,
      applyClicks: realtime.applyClicks ?? 0,
      saveClicks: realtime.saveClicks ?? 0,
      resumeUploads: realtime.resumeUploads ?? 0,
      landings: realtime.landings ?? 0,
      forCompaniesClicks: realtime.forCompaniesClicks ?? 0,
      contactClicks: realtime.contactClicks ?? 0,
      postJobClicks: realtime.postJobClicks ?? 0,
      companySignups: realtime.companySignups ?? 0,
    }
    const exists = merged.some(d => d.date === today)
    if (exists) return merged.map(d => d.date === today ? todayData : d)
    return [...merged, todayData]
  })()

  const summary = (() => {
    if (!data?.summary) return data?.summary
    const base = {
      ...data.summary,
      totalSessions: ga4?.totals?.sessions ?? 0,
      ga4TotalUsers: ga4?.totals?.totalUsers ?? 0,
      ga4NewUsers: ga4?.totals?.newUsers ?? 0,
      ga4EngagedSessions: ga4?.totals?.engagedSessions ?? 0,
    }
    if (!realtime) return base
    const today = realtime.date
    const todayInRange = data.daily?.find(d => d.date === today)
    if (!todayInRange && today > dateRange.to) return base
    const diff = (rtKey, dayKey) => (realtime[rtKey] ?? 0) - (todayInRange?.[dayKey ?? rtKey] ?? 0)
    return {
      ...base,
      totalSubmissions: data.summary.totalSubmissions + diff('submissions'),
      adSubmissions: data.summary.adSubmissions + diff('ad'),
      organicSubmissions: data.summary.organicSubmissions + diff('organic'),
      totalSignups: data.summary.totalSignups + diff('signups'),
      totalJobApps: data.summary.totalJobApps + diff('jobApps'),
      totalJobAppsCompany: data.summary.totalJobAppsCompany + diff('jobAppsCompany'),
      totalCvSuccessApps: data.summary.totalCvSuccessApps + diff('cvSuccessApps'),
      totalJobClicks: data.summary.totalJobClicks + diff('jobClicks'),
      totalCardClicks: data.summary.totalCardClicks + diff('cardClicks'),
    }
  })()

  const weeklyTableData = (() => {
    if (!dailyWithToday || tableView !== 'weekly') return null
    const weeks = {}
    for (const d of dailyWithToday) {
      const dt = new Date(d.date + 'T00:00:00')
      const day = dt.getDay()
      const mon = new Date(dt)
      mon.setDate(dt.getDate() - ((day + 6) % 7))
      const key = mon.toISOString().slice(0, 10)
      if (!weeks[key]) weeks[key] = { start: key, end: d.date, days: [] }
      weeks[key].end = d.date
      weeks[key].days.push(d)
    }
    return Object.values(weeks).map(w => {
      const sum = (k) => {
        const vals = w.days.map(d => d[k]).filter(v => v !== null && v !== undefined)
        return vals.length ? vals.reduce((a, b) => a + b, 0) : null
      }
      return {
        label: `${w.start.slice(5)} ~ ${w.end.slice(5)}`,
        sessions: sum('sessions'),
        submissions: sum('submissions') ?? 0,
        ad: sum('ad') ?? 0,
        organic: sum('organic') ?? 0,
        signups: sum('signups') ?? 0,
        companies: sum('companies') ?? 0,
        jobClicks: sum('jobClicks'),
        cardClicks: sum('cardClicks'),
        jobsPageViews: sum('jobsPageViews'),
        applyClicks: sum('applyClicks'),
        saveClicks: sum('saveClicks'),
        resumeUploads: sum('resumeUploads'),
        resumePublic: sum('resumePublic'),
        resumePublicApp: sum('resumePublicApp'),
        resumePublicWeb: sum('resumePublicWeb'),
        jobApps: sum('jobApps') ?? 0,
        forCompaniesClicks: sum('forCompaniesClicks'),
        contactClicks: sum('contactClicks'),
        postJobClicks: sum('postJobClicks'),
        companySignups: sum('companySignups') ?? 0,
      }
    })
  })()

  const monthlyTableData = (() => {
    if (!dailyWithToday || tableView !== 'monthly') return null
    const months = {}
    for (const d of dailyWithToday) {
      const key = d.date.slice(0, 7)
      if (!months[key]) months[key] = { label: key, days: [] }
      months[key].days.push(d)
    }
    return Object.values(months).map(w => {
      const sum = (k) => {
        const vals = w.days.map(d => d[k]).filter(v => v !== null && v !== undefined)
        return vals.length ? vals.reduce((a, b) => a + b, 0) : null
      }
      return {
        label: w.label,
        sessions: sum('sessions'),
        submissions: sum('submissions') ?? 0,
        ad: sum('ad') ?? 0,
        organic: sum('organic') ?? 0,
        signups: sum('signups') ?? 0,
        companies: sum('companies') ?? 0,
        jobClicks: sum('jobClicks'),
        cardClicks: sum('cardClicks'),
        jobsPageViews: sum('jobsPageViews'),
        applyClicks: sum('applyClicks'),
        saveClicks: sum('saveClicks'),
        resumeUploads: sum('resumeUploads'),
        resumePublic: sum('resumePublic'),
        resumePublicApp: sum('resumePublicApp'),
        resumePublicWeb: sum('resumePublicWeb'),
        jobApps: sum('jobApps') ?? 0,
        forCompaniesClicks: sum('forCompaniesClicks'),
        contactClicks: sum('contactClicks'),
        postJobClicks: sum('postJobClicks'),
        companySignups: sum('companySignups') ?? 0,
      }
    })
  })()

  const chartData = aggregateDaily(dailyWithToday, chartMode)

  // 일별/주별/월별 테이블 컬럼 — 섹션 단위로 묶어서 표시 (가로 폭 폭주 방지)
  const tableColumns = tableSection === 'company'
    ? [
        { key: 'forCompaniesClicks', label: L('홈→기업채용 클릭', 'Home→For-companies', 'Click Trang chủ→NTD'), summaryKey: 'totalForCompaniesClicks' },
        { key: 'contactClicks', label: L('담당자 대화 클릭', 'Contact clicks', 'Click liên hệ'), summaryKey: 'totalContactOwnerClicks' },
        { key: 'postJobClicks', label: L('공고 올리기 클릭', 'Post-job clicks', 'Click đăng tin'), summaryKey: 'totalPostJobClicks' },
        { key: 'companySignups', label: L('기업 회원 가입', 'Company sign-ups', 'Doanh nghiệp đăng ký'), summaryKey: 'totalCompanySignups' },
      ]
    : tableSection === 'basic'
    ? (() => {
        const byKey = (k) => METRICS.find(m => m.key === k)
        const subLabel = { ad: L('└ 광고', '└ Ad', '└ Quảng cáo'), organic: L('└ 자연', '└ Organic', '└ Tự nhiên'), companies: L('└ 회사수', '└ Companies', '└ Số công ty') }
        // 퍼널 순서(세션→제출→가입) + 광고/자연/회사수는 '연봉 제출' 바로 옆 하위로
        return ['sessions', 'submissions', 'ad', 'organic', 'companies', 'signups'].map(k => {
          const m = byKey(k)
          const sub = k === 'ad' || k === 'organic' || k === 'companies'
          return { key: m.dataKey, label: sub ? subLabel[k] : m.label, summaryKey: m.summaryKey, sub }
        })
      })()
    : METRICS.filter(m => m.section === tableSection).map(m => ({ key: m.dataKey, label: m.label, summaryKey: m.summaryKey }))
  const visibleExperiments = experiments.filter(e => (!e.status || e.status === 'running') && e.date >= dateRange.from && e.date <= (realtime?.date || dateRange.to) && (!e.metrics?.length || selected.length === 0 || selected.some(k => e.metrics.includes(k))))

  return (
    <>
      <Head><title>FYI {t.title}</title></Head>
      <style>{`
        .adm-dash { max-width: 1200px; margin: 0 auto; padding: 24px 16px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
        .adm-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
        .adm-header-title { display: flex; align-items: center; gap: 12px; }
        .adm-header-controls { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
        .adm-grid-2col { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 24px; }
        @media (max-width: 768px) {
          .adm-dash { padding: 16px 12px 80px 12px; }
          .adm-header { flex-direction: column; align-items: flex-start; gap: 12px; }
          .adm-header-controls { width: 100%; flex-wrap: wrap; }
          .adm-header-controls input[type="date"] { width: 110px; font-size: 12px; }
          .adm-grid-2col { grid-template-columns: 1fr; }
          .adm-metric-cards > div, .adm-realtime-grid > div { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; gap: 8px !important; }
        }
      `}</style>
      <AdminLayout>
      <div className="adm-dash">
        {/* Header — 날짜 피커는 날짜 쓰는 탭에서만 */}
        {showDatePicker && (
          <div className="adm-header">
            <div className="adm-header-controls">
              <DateRangePicker value={dateRange} onChange={(from, to) => { setDateTouched(true); setDateRange({ from, to }) }} />
              {loading && <span style={{ fontSize: 12, color: C.faint }}>{L('불러오는 중…', 'Loading…', 'Đang tải…')}</span>}
            </div>
          </div>
        )}

        {/* Today Realtime — 추이 탭에서만 표시 */}
        {realtime && tab === 'trend' && (
          <Card style={{ marginBottom: G.xl }}>
            <SectionTitle
              right={lastUpdated && (
                <span style={{ fontSize: 12, color: C.faint, ...num }}>
                  {new Date(lastUpdated.getTime() + 7 * 60 * 60 * 1000).toISOString().slice(11, 16)} (VN)
                </span>
              )}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: G.sm, flexWrap: 'wrap' }}>
                <span style={{
                  width: 8, height: 8, borderRadius: '50%', background: C.positive,
                  display: 'inline-block', animation: autoRefresh ? 'pulse 2s infinite' : 'none',
                }} />
                {t.today}
                <span style={{ fontSize: 13, fontWeight: 400, color: C.sub, ...num }}>{realtime.date} · UTC+7</span>
              </span>
            </SectionTitle>
            <div className="adm-realtime-grid">
              <StatGrid>
                {[
                  { label: t.metrics.sessions, value: ga4?.today?.sessions ?? '-' },
                  { label: t.metrics.signups, value: realtime.signups },
                  { label: t.metrics.resumeUploads, value: realtime.resumeUploads },
                  { label: t.metrics.jobApps, value: realtime.jobApps },
                ].map(item => <StatTile key={item.label} label={item.label} value={item.value} />)}
              </StatGrid>
            </div>
          </Card>
        )}

        <style jsx global>{`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.3; }
          }
        `}</style>

        {loading && <State kind="loading">{t.loadingData}</State>}

        {/* Trend Tab */}
        {summary && !loading && tab === 'trend' && (
          <>
            {/* Metric Cards */}
            {selected.length > 1 && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: G.md }}>
                <SecondaryButton label={`${L('선택 초기화', 'Clear selection', 'Bỏ chọn')} (${selected.length})`} onClick={() => setSelected([])} />
              </div>
            )}
            {['basic', 'talent', 'company'].map(sec => {
              const cards = sec === 'company'
                ? B2B_CARDS.map(c => ({ key: c.key, label: c[lang] || c.ko, value: summary[c.summaryKey] ?? '-', tier: c.tier, clickable: false }))
                : METRICS.filter(m => m.section === sec).map(m => {
                    const noTracking = (m.key === 'jobClicks' || m.key === 'cardClicks') && !summary.hasEventTracking
                    return {
                      key: m.key, label: m.label,
                      value: noTracking ? '-' : summary[m.summaryKey],
                      tier: m.tier, clickable: true,
                    }
                  })
              const primary = cards.filter(c => c.tier === 'primary')
              const secondary = cards.filter(c => c.tier !== 'primary')
              const renderCard = (c) => {
                const isActive = c.clickable && selected.includes(c.key)
                return (
                  <PickTile key={c.key} label={c.label} value={c.value} active={isActive}
                    onClick={c.clickable ? () => setSelected(prev => isActive ? prev.filter(k => k !== c.key) : [...prev, c.key]) : undefined} />
                )
              }
              const tierLabel = (text) => (
                <div style={{ fontSize: 12, fontWeight: 600, color: C.faint, marginBottom: G.sm }}>{text}</div>
              )
              return (
                <Fragment key={sec}>
                <div style={{ marginBottom: G.xl }}>
                  <SectionTitle style={{ marginBottom: G.md }}>{SECTION_LABELS[sec][lang]}</SectionTitle>
                  {primary.length > 0 && (
                    <div style={{ marginBottom: secondary.length ? G.lg : 0 }}>
                      {secondary.length > 0 && tierLabel(TIER_LABELS.primary[lang])}
                      <div className="adm-metric-cards"><StatGrid>{primary.map(renderCard)}</StatGrid></div>
                    </div>
                  )}
                  {secondary.length > 0 && (
                    <div>
                      {tierLabel(sec === 'basic' ? L('연봉 제출 구성 (광고·자연·회사수)', 'Submission breakdown', 'Cơ cấu lượt gửi lương') : TIER_LABELS.secondary[lang])}
                      <div className="adm-metric-cards"><StatGrid>{secondary.map(renderCard)}</StatGrid></div>
                    </div>
                  )}
                </div>

                {/* Chart — 선택 지표가 속한 섹션 바로 아래 */}
                {sec === chartSection && selectedMetrics.length > 0 && (
                  <Card style={{ marginBottom: G.xl }}>
                    <SectionTitle style={{ flexWrap: 'wrap' }}
                      right={<>
                        {selectedMetrics.length === 2 && (
                          <Toggle size="small" labelPosition="end" checked={dualAxis} onChange={() => setDualAxis(v => !v)}
                            label={lang === 'ko' ? 'Y축 분리' : 'Dual Y'} />
                        )}
                        <FilterTabs value={chartMode} onChange={setChartMode}
                          items={[
                            { value: '1d', label: t.chart1d },
                            { value: '3d', label: t.chart3d },
                            { value: 'weekly', label: t.chartWeekly },
                            { value: 'monthly', label: t.chartMonthly },
                          ]} />
                      </>}>
                      {selectedMetrics.map(m => m.label).join(' + ')} {t.trend}
                    </SectionTitle>
                    <MetricChart daily={chartData} metrics={selectedMetrics} experiments={chartMode === '1d' ? visibleExperiments : []} avgLabel={t.avg} lang={lang} dualAxis={dualAxis} />

                    {visibleExperiments.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: G.sm, marginTop: G.md, paddingTop: G.md, borderTop: `1px solid ${C.line}` }}>
                        {visibleExperiments.map((exp, i) => (
                          <div key={exp.id} style={{
                            display: 'inline-flex', alignItems: 'center', gap: 6,
                            height: 28, padding: '0 10px 0 6px', borderRadius: 4, fontSize: 12,
                            background: C.bg, border: `1px solid ${C.border}`, color: C.text,
                          }}>
                            <span style={{
                              width: 18, height: 18, borderRadius: '50%', background: exp.color, flexShrink: 0,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              color: '#fff', fontSize: 12, fontWeight: 700, lineHeight: 1, ...num,
                            }}>{i + 1}</span>
                            <span style={{ color: C.faint, ...num }}>{exp.date.slice(5)}</span>
                            {exp.title}
                          </div>
                        ))}
                      </div>
                    )}
                  </Card>
                )}
                </Fragment>
              )
            })}

            {/* Experiments */}
            <Card style={{ marginBottom: G.xl }}>
              <SectionTitle style={{ alignItems: 'center', marginBottom: showExpForm || experiments.length > 0 ? G.lg : 0 }}
                right={<SecondaryButton label={showExpForm ? t.expCancel : t.expAdd} onClick={() => setShowExpForm(!showExpForm)} />}>
                {t.expTitle}
              </SectionTitle>

              {showExpForm && (
                <div style={{ marginBottom: G.lg, padding: G.lg, background: C.bg, borderRadius: 8 }}>
                  <div className="adm-m-wrap" style={{ display: 'flex', gap: G.md, alignItems: 'flex-end' }}>
                    <Field width={168} inputType="date" title={t.expStartDate} value={expForm.date}
                      onChange={e => setExpForm(f => ({ ...f, date: e.target.value }))} />
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <Field value={expForm.title} placeholder={t.expPlaceholder}
                        onChange={e => setExpForm(f => ({ ...f, title: e.target.value }))}
                        onKeyDown={e => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) addExperiment() }} />
                    </div>
                    <div style={{ display: 'flex', gap: G.xs, alignItems: 'center', height: 36 }}>
                      {EXP_COLORS.map(c => (
                        <div key={c} onClick={() => setExpForm(f => ({ ...f, color: c }))}
                          style={{
                            width: 20, height: 20, borderRadius: '50%', background: c, cursor: 'pointer',
                            border: '2px solid #fff', boxShadow: `0 0 0 2px ${expForm.color === c ? C.text : 'transparent'}`,
                          }} />
                      ))}
                    </div>
                    <PrimaryButton label={t.expSave} onClick={addExperiment} />
                  </div>
                  <div style={{ marginTop: G.lg }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: C.sub, marginBottom: G.sm }}>{L('영향 지표', 'Affected Metrics', 'Chỉ số ảnh hưởng')}</div>
                    <ChipGroup multiple type="outline" variant="primary" size="small"
                      items={METRICS_BASE.map(m => ({ value: m.key, label: t.metrics[m.key] || m.key }))}
                      value={expForm.metrics}
                      onChange={k => setExpForm(f => ({ ...f, metrics: f.metrics.includes(k) ? f.metrics.filter(x => x !== k) : [...f.metrics, k] }))} />
                  </div>
                </div>
              )}

              {experiments.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {experiments.map(exp => {
                    const isEditing = editingExp?.id === exp.id
                    if (isEditing) return (
                      <div key={exp.id} style={{ padding: G.lg, margin: `${G.sm}px 0`, borderRadius: 8, background: C.bg, border: `1px solid ${C.border}` }}>
                        <div className="adm-m-wrap" style={{ display: 'flex', gap: G.md, alignItems: 'center', marginBottom: G.md }}>
                          <Field width={168} inputType="date" value={editingExp.date} onChange={e => setEditingExp(f => ({ ...f, date: e.target.value }))} />
                          <div style={{ flex: 1, minWidth: 200 }}>
                            <Field value={editingExp.title} onChange={e => setEditingExp(f => ({ ...f, title: e.target.value }))}
                              onKeyDown={e => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) updateExperiment() }} />
                          </div>
                          <div style={{ display: 'flex', gap: G.xs, alignItems: 'center' }}>
                            {EXP_COLORS.map(c => (
                              <div key={c} onClick={() => setEditingExp(f => ({ ...f, color: c }))}
                                style={{ width: 20, height: 20, borderRadius: '50%', background: c, cursor: 'pointer', border: '2px solid #fff', boxShadow: `0 0 0 2px ${editingExp.color === c ? C.text : 'transparent'}` }} />
                            ))}
                          </div>
                        </div>
                        <ChipGroup multiple type="outline" variant="primary" size="small"
                          items={METRICS_BASE.map(m => ({ value: m.key, label: t.metrics[m.key] || m.key }))}
                          value={editingExp.metrics || []}
                          onChange={k => setEditingExp(f => ({ ...f, metrics: (f.metrics || []).includes(k) ? (f.metrics || []).filter(x => x !== k) : [...(f.metrics || []), k] }))} />
                        {/* Status & Result */}
                        <div style={{ paddingTop: G.md, borderTop: `1px solid ${C.border}`, marginTop: G.md }}>
                          <div className="adm-m-wrap" style={{ display: 'flex', gap: G.sm, alignItems: 'center' }}>
                            <span style={{ fontSize: 12, fontWeight: 600, color: C.sub, minWidth: 32 }}>{t.expStatus}</span>
                            <FilterTabs value={editingExp.status || 'running'}
                              onChange={s => setEditingExp(f => ({ ...f, status: s, ...(s !== 'running' && !f.end_date ? { end_date: new Date().toISOString().slice(0, 10) } : {}) }))}
                              items={[
                                { value: 'running', label: t.expRunning },
                                { value: 'success', label: t.expSuccess },
                                { value: 'failure', label: t.expFailure },
                              ]} />
                            {(editingExp.status === 'success' || editingExp.status === 'failure') && (
                              <label style={{ display: 'flex', alignItems: 'center', gap: G.sm, fontSize: 12, fontWeight: 600, color: C.sub, marginLeft: G.sm }}>
                                {t.expEndDate}
                                <Field width={168} inputType="date" value={editingExp.end_date || ''} onChange={e => setEditingExp(f => ({ ...f, end_date: e.target.value }))} />
                              </label>
                            )}
                          </div>
                          {(editingExp.status === 'success' || editingExp.status === 'failure') && (
                            <div style={{ marginTop: G.md }}>
                              <TextArea height={72} value={editingExp.result_note || ''} onChange={e => setEditingExp(f => ({ ...f, result_note: e.target.value }))}
                                placeholder={t.expResultPlaceholder} />
                            </div>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: G.sm, justifyContent: 'flex-end', marginTop: G.lg }}>
                          <GhostButton label={t.expCancel} onClick={() => setEditingExp(null)} />
                          <SecondaryButton label={t.expDelete} onClick={() => deleteExperiment(exp.id)} />
                          <PrimaryButton label={t.expSave} onClick={updateExperiment} />
                        </div>
                      </div>
                    )
                    const status = exp.status || 'running'
                    return (
                    <div key={exp.id} onClick={() => setEditingExp({ ...exp, metrics: exp.metrics || [] })}
                      style={{ padding: `${G.md}px 0`, borderTop: `1px solid ${C.line}`, cursor: 'pointer' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: G.md }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: G.sm, minWidth: 0, minHeight: 28 }}>
                          <span style={{ width: 10, height: 10, borderRadius: '50%', background: exp.color, flexShrink: 0 }} />
                          <span style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{exp.title}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: G.sm, flexShrink: 0, minHeight: 28 }}>
                          <StatusTag tone={{ running: 'info', success: 'success', failure: 'error' }[status]}>
                            {{ running: t.expRunning, success: t.expSuccess, failure: t.expFailure }[status]}
                          </StatusTag>
                          {(!exp.status || exp.status === 'running') && (
                            <SecondaryButton size="small" label={t.expEnd}
                              onClick={e => { e.stopPropagation(); setEditingExp({ ...exp, metrics: exp.metrics || [], status: 'success', end_date: new Date().toISOString().slice(0, 10) }) }} />
                          )}
                          <Icon name="edit" size={14} color="#8A95A0" />
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: `${G.xs}px ${G.md}px`, flexWrap: 'wrap', marginLeft: 18, marginTop: G.xs }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', minWidth: 0 }}>
                          <span style={{ color: C.faint, fontSize: 12, ...num }}>{exp.date}{exp.end_date ? ` → ${exp.end_date}` : ''}</span>
                          {exp.metrics?.map(mk => (
                            METRICS_BASE.some(x => x.key === mk) ? <StatusTag key={mk}>{t.metrics[mk] || mk}</StatusTag> : null
                          ))}
                        </div>
                        {exp.result_note && (
                          <div style={{ fontSize: 12, color: C.sub, lineHeight: 1.4, maxWidth: 320, textAlign: 'right', marginLeft: 'auto' }}>{exp.result_note}</div>
                        )}
                      </div>
                    </div>
                    )
                  })}
                </div>
              )}

              {experiments.length === 0 && !showExpForm && (
                <div style={{ color: C.faint, fontSize: 13, marginTop: G.sm }}>
                  {t.expEmpty}
                </div>
              )}
            </Card>

            {/* Intent & Top Companies */}
            <div className="adm-grid-2col" style={{ gap: G.md, marginBottom: G.xl }}>
              <Card>
                <SectionTitle>{t.intentTitle}</SectionTitle>
                {data.intent.filter(i => i.value > 0).map((item, i) => {
                  const maxVal = Math.max(...data.intent.filter(x => x.value > 0).map(x => x.value))
                  return (
                    <div key={i} style={{ marginBottom: G.md }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: C.text, marginBottom: G.xs }}>
                        <span>{item.name}</span>
                        <span style={{ fontWeight: 600, ...num }}>{item.value} ({item.pct}%)</span>
                      </div>
                      <div style={{ height: 8, background: C.line, borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${(item.value / maxVal) * 100}%`, background: COLORS[i % COLORS.length], borderRadius: 4 }} />
                      </div>
                    </div>
                  )
                })}
              </Card>

              <Card>
                <SectionTitle>{t.topCompanies} ({summary.uniqueCompanies}{t.countUnit})</SectionTitle>
                <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                  {data.topCompanies.map((c, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: `${G.sm}px 0`, borderBottom: `1px solid ${C.line}`, fontSize: 13, color: C.text }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: G.sm }}>
                        <span style={{ color: C.faint, width: 20, textAlign: 'right', fontSize: 12, ...num }}>{i + 1}</span>
                        {c.name}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: G.sm }}>
                        <div style={{ width: Math.max(4, (c.count / (data.topCompanies[0]?.count || 1)) * 100), height: 16, background: '#4F46E5', borderRadius: 3, opacity: 0.7 }} />
                        <span style={{ fontWeight: 600, minWidth: 24, textAlign: 'right', ...num }}>{c.count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            {/* Daily Detail Table */}
            <div style={{ marginBottom: G.xl }}>
              <SectionTitle style={{ alignItems: 'center', flexWrap: 'wrap', marginBottom: G.sm }}
                right={
                  <FilterTabs value={tableView} onChange={setTableView}
                    items={[
                      { value: 'daily', label: L('일별', 'Daily', 'Theo ngày') },
                      { value: 'weekly', label: L('주별', 'Weekly', 'Theo tuần') },
                      { value: 'monthly', label: L('월별', 'Monthly', 'Theo tháng') },
                    ]} />
                }>
                {tableView === 'weekly' ? t.weeklyDetail : tableView === 'monthly' ? t.monthlyDetail : t.dailyDetail}
                {tableView !== 'daily' && (
                  <span style={{ fontSize: 12, fontWeight: 500, color: C.faint, marginLeft: G.sm }}>
                    {L('변화율', 'Change', 'Biến động')}: {tableView === 'weekly' ? 'WoW' : 'MoM'}
                  </span>
                )}
              </SectionTitle>
              {/* 섹션 선택 — 누른 섹션의 지표들만 열로 (가로 폭주 방지) */}
              <div style={{ marginBottom: G.lg, borderBottom: `1px solid ${C.border}` }}>
                <TabGroup type="text" size="medium" value={tableSection} onChange={setTableSection}
                  items={['basic', 'talent', 'company'].map(s => ({ value: s, label: SECTION_LABELS[s][lang] }))} />
              </div>
              {/* kit TableCard 와 같은 모양 — 스크롤 ref·고정 머리글/합계 행이 필요해 여기서 직접 그린다 */}
              <div ref={tableScrollRef} className="adm-m-scroll" style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 12, maxHeight: 520, overflow: 'auto' }}>
                <table className="adm-m-nowrap" style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
                  <thead>
                    <tr>
                      <th style={{ ...TS.th, position: 'sticky', top: 0, zIndex: 3 }}>{tableView === 'daily' ? L('날짜', 'Date', 'Ngày') : L('기간', 'Period', 'Kỳ')}</th>
                      {tableColumns.map(c => (
                        <th key={c.key} style={{ ...TS.thNum, whiteSpace: 'normal', wordBreak: 'keep-all', fontWeight: c.sub ? 500 : 600, color: c.sub ? C.faint : C.sub, position: 'sticky', top: 0, zIndex: 3 }}>{c.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(tableView === 'weekly' ? weeklyTableData : tableView === 'monthly' ? monthlyTableData : dailyWithToday).map((d, i, arr) => (
                      <tr key={i}>
                        <td style={{ ...TS.td, whiteSpace: 'nowrap', ...num }}>{tableView === 'daily' ? d.date : d.label}</td>
                        {tableColumns.map(col => {
                          const val = d[col.key]
                          const isNull = val === null || val === undefined
                          const prev = (tableView !== 'daily' && i > 0) ? arr[i - 1][col.key] : null
                          const pct = tableView !== 'daily' ? cellPct(val, prev) : null
                          return (
                            <td key={col.key} style={{ ...TS.tdNum, color: isNull ? C.faint : (col.sub ? C.sub : (col.color || C.text)), fontWeight: col.bold ? 600 : undefined }}>
                              <div>{isNull ? '-' : val}</div>
                              {pct !== null && (
                                <div style={{ fontSize: 12, fontWeight: 600, color: pct > 0 ? '#EF4444' : pct < 0 ? '#3B82F6' : C.faint }}>
                                  {pct > 0 ? '+' : ''}{pct}%
                                </div>
                              )}
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                    <tr>
                      <td style={{ ...TS.td, fontWeight: 700, position: 'sticky', bottom: 0, background: C.bg, borderTop: `1px solid ${C.border}`, borderBottom: 'none' }}>{t.total}</td>
                      {tableColumns.map(c => (
                        <td key={c.key} style={{ ...TS.tdNum, fontWeight: 700, color: c.sub ? C.sub : C.text, position: 'sticky', bottom: 0, background: C.bg, borderTop: `1px solid ${C.border}`, borderBottom: 'none' }}>{summary[c.summaryKey] ?? '-'}</td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* Main Funnel Tab — 유입→가입→지원→합격 메인 대시보드 */}
        {tab === 'main' && (
          <MainFunnelView token={token} lang={lang} dateRange={dateRange} />
        )}


        {/* Talent Pool Tab — 이력서 보유 인재 전체 (공개 여부는 뷰 내 필터/뱃지) */}
        {/* 인재 — 명단(인재풀) · 직군 구성(공급) · 퀄리티 분포를 한 페이지로(10/6 통합) */}
        {tab === 'talent' && (
          <TalentView token={token} lang={lang} />
        )}

        {/* Verifications Tab */}
        {tab === 'verifications' && (
          <VerificationsView token={token} lang={lang} />
        )}

        {/* Community Tab */}
        {tab === 'community' && (
          <CommunityView token={token} lang={lang} dateRange={dateRange} />
        )}

        {/* 콜드메일 (광고메일 탭은 10/6 메뉴에서 뺐다 — RecommendView 파일은 남아 있음) */}
        {tab === 'coldmail' && (
          <ColdmailView token={token} lang={lang} />
        )}
        {tab === 'blacklist' && (
          <BlacklistView token={token} lang={lang} />
        )}

        {/* 승주 작업실 — 메뉴에서는 뺐지만(10/6) 분기는 남긴다: 실험 알림(텔레그램)의 '실험탭 열기(롤백 스위치)'
            버튼이 ?tab=goals 로 들어온다(lib/experimentAlerts.js). 메뉴에 없어 페이지 제목은 안 뜬다. */}
        {tab === 'goals' && (
          <GoalMetricsView token={token} lang={lang} />
        )}

      </div>
      </AdminLayout>
    </>
  )
}
