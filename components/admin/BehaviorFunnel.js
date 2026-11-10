import { useState, useMemo, Fragment } from 'react'
import { IconButton, ChipGroup } from '@likelion-design/ui'
import { RiCloseLine, RiArrowLeftRightLine, RiAddLine } from '@remixicon/react'
import { useAdmin } from '../../lib/adminSwr'
import { G, C, num, ellipsis, Card, SectionTitle, FilterTabs, StatusTag, SecondaryButton, GhostButton, SearchField, StatGrid, StatTile, T, TableCard } from './ui'
import { Dropdown, BTN, POP, LINE, INK, ARROW, useClickOutside } from './FormControls'

// 행동 퍼널 (Amplitude 의미론) — 계산은 Postgres RPC(funnel), 여기는 표시만.
// · 단계 목록은 서버 list_events 가 채운다 (하드코딩 아님). ko 라벨·그룹은 표시용 오버레이.
// · 단계 선택은 검색 + 카테고리 그룹 팝오버. 자주 보는 퍼널은 프리셋 칩으로 한 번에.
// · 전환 윈도우(t0 기준 누적)와 순서 모드(this/any/exact)는 평이한 말로 표시.
// · API 가 같은 조건의 순서무관(any) 결과를 함께 주면, 순서 때문에 잘린 단계를 경고하고 순서 교체 버튼을 띄운다.
// · 차트 이탈 블록·표 이탈 숫자 클릭 → 이탈 유저 목록(funnel-users) 모달.

const KO_LABELS = {
  session_start: '웹 진입(전체)', landing: '홈 랜딩', page_view: '광고 페이지뷰', hero_cta_click: '히어로 CTA',
  view_open_in_browser: '브라우저로 열기 안내', oauth_inapp_blocked: '인앱 OAuth 차단',
  wizard_cat_click: '위저드 직군 클릭', wizard_step_1: '연봉 위저드 시작', wizard_step_2: '연봉 위저드 2 (경력)',
  wizard_step_3: '연봉 위저드 3 (연봉 입력)', wizard_step_4: '연봉 제출(위저드 완료)',
  result_gate_view: '결과 게이트 노출', result_company_card_click: '결과 회사카드 클릭', search_company: '회사 검색',
  company_gate_click: '회사 게이트 클릭', company_gate_login_success: '게이트 로그인',
  view_jobs_page: '공고 목록 뷰', click_job_card: '공고 카드 클릭', view_job_detail: '공고 상세 뷰',
  click_apply_button: '지원 버튼 클릭', submit_application: '공고 지원 제출', cancel_application: '지원 취소',
  save_job: '공고 저장', unsave_job: '공고 저장 해제', view_similar_jobs_modal: '유사공고 모달', apply_similar_job: '유사공고 지원',
  click_jobs_cta: '공고 CTA 클릭', ktc_view: 'KTC 랜딩 뷰', ktc_hero_cta: 'KTC 히어로 CTA', ktc_jobs_view: 'KTC 공고 목록 뷰',
  ktc_job_click: 'KTC 공고 클릭', click_ktc_nav: 'KTC 메뉴 클릭',
  view_login_page: '로그인 페이지 뷰', click_login: '로그인 버튼 클릭', sign_up: '가입(sign_up)', one_tap_success: 'One Tap 가입',
  profile_view: '프로필 뷰', profile_edit_start: '프로필 편집 시작', profile_save_success: '프로필 저장 완료',
  profile_ai_parse_start: 'AI 이력서 파싱 시작', profile_ai_parse_done: 'AI 이력서 파싱 완료',
  resume_upload: '이력서 업로드', resume_registered: '이력서 등록 완료',
  view_community: '커뮤니티 뷰', view_community_post: '커뮤니티 글 뷰', click_app_download: '앱 다운로드 클릭',
  view_app_promo_modal: '앱 유도 모달 노출', app_open: '앱 실행', app_session_duration: '앱 체류시간',
  recommend_sent: '추천메일 발송', recommend_click: '추천메일 클릭', push_sent: '푸시 발송', push_click: '푸시 클릭',
  jobs_autoboost_on: '공고 자동부스트', coldmail_job_apply: '콜드메일 공고 지원',
}
const label = (ev) => KO_LABELS[ev] || ev

// 단계 선택 팝오버의 그룹 — 위에서부터 첫 매칭. 시스템(서버 자동 발송)은 유저 행동이 아니라 맨 아래.
const GROUPS = [
  ['system', ['시스템 자동 발송 — 유저 행동 아님', 'System (not user actions)', 'Hệ thống (không phải hành vi)'], e => /_sent$|^cron_|^jobs_autoboost_on$/.test(e)],
  ['email', ['이메일 클릭 (콜드메일·추천메일)', 'Email clicks', 'Nhấp email'], e => /^coldmail_|^recommend_click$/.test(e)],
  ['entry', ['진입', 'Entry', 'Vào trang'], e => ['session_start', 'landing', 'page_view', 'hero_cta_click', 'click_salary_hero', 'view_open_in_browser', 'oauth_inapp_blocked', 'ktc_view', 'ktc_hero_cta', 'click_for_companies'].includes(e)],
  ['auth', ['로그인·가입', 'Login · sign-up', 'Đăng nhập · đăng ký'], e => /login|sign_up|one_tap|claim_/.test(e)],
  ['salary', ['연봉 위저드·결과', 'Salary wizard · result', 'Wizard lương · kết quả'], e => /^wizard_|^result_|^company_gate_|^search_company$|^submit_salary$/.test(e)],
  ['profile', ['프로필·이력서', 'Profile · resume', 'Hồ sơ · CV'], e => /^profile_|^resume_|cv_|^photo_claim/.test(e)],
  ['community', ['커뮤니티', 'Community', 'Cộng đồng'], e => /community/.test(e)],
  ['app', ['앱·푸시', 'App · push', 'Ứng dụng · push'], e => /^app_|app_download|app_promo|^push_click$|notification/.test(e)],
  ['jobs', ['공고·지원', 'Jobs · apply', 'Việc làm · ứng tuyển'], e => /job|apply|application|ktc_nav|follow_company|contact_owner/.test(e)],
]
const OTHER = ['기타', 'Other', 'Khác']
const GROUP_ORDER = ['entry', 'salary', 'jobs', 'auth', 'profile', 'community', 'app', 'email', 'other', 'system']

// 자주 보는 퍼널 — 11/10 기준 실데이터로 단계 순서 검증(순서무관 대비 손실 없음 또는 작음)
const PRESETS = [
  { key: 'salary', label: ['연봉 제출 → 가입', 'Salary → sign-up', 'Lương → đăng ký'], steps: ['landing', 'wizard_step_1', 'wizard_step_4', 'sign_up'] },
  { key: 'apply', label: ['공고 지원', 'Job apply', 'Ứng tuyển'], steps: ['view_jobs_page', 'click_job_card', 'click_apply_button', 'submit_application'] },
  { key: 'ktc', label: ['KTC 공고 지원', 'KTC apply', 'Ứng tuyển KTC'], steps: ['ktc_jobs_view', 'ktc_job_click', 'submit_application'] },
  { key: 'login', label: ['로그인 → 가입', 'Login → sign-up', 'Đăng nhập → đăng ký'], steps: ['view_login_page', 'click_login', 'sign_up'] },
  { key: 'profile', label: ['프로필 편집', 'Profile edit', 'Sửa hồ sơ'], steps: ['profile_view', 'profile_edit_start', 'profile_save_success'] },
]

const WINDOWS = [
  [1800, ['30분 이내', 'Within 30 min', 'Trong 30 phút']], [10800, ['3시간 이내', 'Within 3 h', 'Trong 3 giờ']],
  [86400, ['1일 이내', 'Within 1 day', 'Trong 1 ngày']], [604800, ['7일 이내', 'Within 7 days', 'Trong 7 ngày']],
  [2592000, ['30일 이내', 'Within 30 days', 'Trong 30 ngày']],
]
const ORDERS = [
  ['this', ['순서대로', 'In order', 'Theo thứ tự'], ['단계를 순서대로 거쳐야 합니다. 사이에 다른 행동이 있어도 됩니다.', 'Steps must happen in order; other events in between are allowed.', 'Các bước phải theo thứ tự; cho phép hành động khác ở giữa.']],
  ['any', ['순서 무관', 'Any order', 'Không theo thứ tự'], ['순서와 상관없이 기간 안에 각 단계를 했는지만 봅니다.', 'Only checks each step happened within the window, in any order.', 'Chỉ kiểm tra mỗi bước có xảy ra trong cửa sổ, không cần thứ tự.']],
  ['exact', ['바로 이어서', 'Strict', 'Liên tiếp'], ['단계 사이에 퍼널 밖 이벤트가 하나라도 있으면 이탈로 봅니다. 세션 시작·모달 노출 같은 자동 이벤트도 포함돼 대부분 0에 가깝습니다.', 'Any event outside the funnel between steps (incl. automatic ones) counts as a drop — usually near zero.', 'Bất kỳ sự kiện ngoài phễu giữa các bước (kể cả sự kiện tự động) đều tính là rời bỏ — thường gần bằng 0.']],
]

const LOSS = C.negative

const fmtDur = (sec) => {
  if (sec === null || sec === undefined) return '—'
  if (sec < 60) return `${Math.round(sec)}초`
  if (sec < 3600) return `${(sec / 60).toFixed(1)}분`
  if (sec < 86400) return `${(sec / 3600).toFixed(1)}시간`
  return `${(sec / 86400).toFixed(1)}일`
}
const vnTime = (iso) => (iso ? new Date(new Date(iso).getTime() + 7 * 36e5).toISOString().slice(0, 16).replace('T', ' ') : '—')
const pct = (a, b) => (b > 0 ? `${((a / b) * 100).toFixed(1)}%` : '—')

// 단계 선택기 — DS 입력 모양 트리거 + 검색·그룹 팝오버. 이미 고른 이벤트는 비활성.
function StepPicker({ value, events, taken, onPick, placeholder, pickLang, L, width = 220 }) {
  const [open, setOpen] = useState(false)
  const [alignRight, setAlignRight] = useState(false) // 오른쪽 끝 트리거면 팝오버를 오른쪽 정렬
  const [q, setQ] = useState('')
  const ref = useClickOutside(open, setOpen)
  const groups = useMemo(() => {
    const needle = q.trim().toLowerCase()
    const hit = events.filter(e => !needle || e.event_name.toLowerCase().includes(needle) || label(e.event_name).toLowerCase().includes(needle))
    const buckets = [...GROUPS.map(([key, lb]) => ({ key, label: lb, items: [] })), { key: 'other', label: OTHER, items: [] }]
    hit.forEach(e => {
      const gi = GROUPS.findIndex(([, , test]) => test(e.event_name))
      buckets[gi === -1 ? buckets.length - 1 : gi].items.push(e)
    })
    // 매칭 순서와 별개로, 화면에는 퍼널 흐름 순서로 보여주고 시스템은 맨 아래
    return GROUP_ORDER.map(k => buckets.find(b => b.key === k)).filter(b => b.items.length > 0)
  }, [events, q])

  return (
    <div ref={ref} style={{ position: 'relative', width }}>
      <button type="button" onClick={e => {
          setAlignRight(e.currentTarget.getBoundingClientRect().left + 376 > window.innerWidth)
          setOpen(v => !v); setQ('')
        }}
        style={{ ...BTN, fontSize: 14, borderColor: open ? INK : LINE, fontWeight: value ? 600 : 400 }}>
        <span style={{ ...ellipsis, color: value ? INK : C.sub }}>{value ? label(value) : placeholder}</span>
        {ARROW}
      </button>
      {open && (
        <div style={{ ...POP, ...(alignRight ? { left: 'auto', right: 0 } : {}), width: 360, maxWidth: '86vw', maxHeight: 420, padding: 0 }}>
          <div style={{ position: 'sticky', top: 0, background: '#fff', padding: G.sm, borderBottom: `1px solid ${C.line}`, zIndex: 1 }}>
            <SearchField width="100%" value={q} autoFocus onChange={e => setQ(e.target.value)}
              placeholder={L('이벤트 검색 (한글·영문)', 'Search events', 'Tìm sự kiện')} />
          </div>
          <div style={{ padding: G.xs }}>
            {groups.length === 0 && (
              <div style={{ fontSize: 13, color: C.faint, padding: G.md }}>{L('검색 결과가 없습니다.', 'No results.', 'Không có kết quả.')}</div>
            )}
            {groups.map(g => (
              <div key={g.key}>
                <div style={{ fontSize: 12, fontWeight: 600, color: g.key === 'system' ? C.negative : C.faint, padding: `${G.sm}px ${G.md}px ${G.xs}px` }}>{pickLang(g.label)}</div>
                {g.items.map(e => {
                  const on = e.event_name === value
                  const dis = !on && taken.includes(e.event_name)
                  return (
                    <button key={e.event_name} type="button" disabled={dis}
                      onClick={() => { onPick(e.event_name); setOpen(false) }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: G.sm, width: '100%', padding: `${G.sm}px ${G.md}px`,
                        border: 'none', borderRadius: 4, textAlign: 'left', fontFamily: 'inherit', cursor: dis ? 'default' : 'pointer',
                        background: on ? C.bg : 'transparent', opacity: dis ? 0.4 : 1,
                      }}
                      onMouseEnter={ev => { if (!on && !dis) ev.currentTarget.style.background = C.bg }}
                      onMouseLeave={ev => { if (!on) ev.currentTarget.style.background = 'transparent' }}>
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ display: 'block', fontSize: 14, fontWeight: on ? 600 : 500, color: C.text, ...ellipsis }}>{label(e.event_name)}</span>
                        {KO_LABELS[e.event_name] && <span style={{ display: 'block', fontSize: 12, color: C.faint, ...ellipsis }}>{e.event_name}</span>}
                      </span>
                      <span style={{ fontSize: 12, color: C.faint, flexShrink: 0, ...num }}>{Number(e.cnt).toLocaleString()}{L('건', '', '')}</span>
                    </button>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// 암플리튜드식 퍼널 차트 — 스텝별 세로 막대(높이 = 1단계 대비 %), 막대 위에
// 직전 단계와의 차이만큼 빗금 이탈 블록. 이탈 블록 클릭 = 이탈 유저 목록(Microscope).
export function AmpChart({ vals, steps, onLossClick }) {
  const n = vals.length
  const first = vals[0] || 0
  const W = 1000, H = 240, TOP = 34, BOTTOM = 40, AXIS = 40
  const plotH = H - TOP - BOTTOM
  const colW = (W - AXIS) / n
  const barW = Math.min(110, colW * 0.52)
  const hOf = (v) => (first > 0 ? (v / first) * plotH : 0)
  return (
    <div style={{ margin: '16px 0 4px' }}>
      <style>{`
        .bf-col { opacity: 0; animation: bfIn 0.3s ease forwards; }
        @keyframes bfIn { to { opacity: 1; } }
        @media (prefers-reduced-motion: reduce) { .bf-col { opacity: 1; animation: none; } }
        .bf-loss { cursor: pointer; }
        .bf-loss:hover rect { fill-opacity: 0.35; }
      `}</style>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }} role="img">
        <defs>
          <pattern id="bf-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="6" stroke="#B6BFC9" strokeWidth="1.4" />
          </pattern>
        </defs>
        {/* % 그리드 (0~100, 25 간격) */}
        {[0, 25, 50, 75, 100].map(p => {
          const y = TOP + plotH - (p / 100) * plotH
          return (
            <g key={p}>
              <line x1={AXIS} y1={y} x2={W} y2={y} stroke="#EDF0F3" strokeWidth="1" />
              <text x={AXIS - 8} y={y + 3.5} textAnchor="end" fontSize="10.5" fill="#9AA0A6"
                style={{ fontVariantNumeric: 'tabular-nums' }}>{p}%</text>
            </g>
          )
        })}
        {vals.map((v, i) => {
          const cx = AXIS + colW * i + colW / 2
          const bx = cx - barW / 2
          const bh = Math.max(v > 0 ? 2 : 0, hOf(v))
          const by = TOP + plotH - bh
          const ofFirst = first > 0 ? (v / first) * 100 : 0
          const prevV = i > 0 ? vals[i - 1] : null
          const lost = i > 0 ? prevV - v : 0
          const prevH = i > 0 ? Math.max(prevV > 0 ? 2 : 0, hOf(prevV)) : 0
          const lossY = TOP + plotH - prevH
          const lossH = Math.max(0, prevH - bh)
          return (
            <g key={i} className="bf-col" style={{ animationDelay: `${i * 0.1}s` }}>
              {/* 이탈 블록 (직전 단계 높이 ~ 현재 막대 높이) — 클릭 = 유저 목록 */}
              {i > 0 && lossH > 1 && (
                <g className={onLossClick ? 'bf-loss' : undefined} onClick={onLossClick ? () => onLossClick(i, i + 1) : undefined}>
                  <rect x={bx} y={lossY} width={barW} height={lossH}
                    fill="url(#bf-hatch)" fillOpacity="1" stroke="#C9CFD6" strokeWidth="1" strokeDasharray="3 2" />
                  <title>{`${label(steps[i - 1])} → ${label(steps[i])} 이탈 ${lost.toLocaleString()}명${onLossClick ? ' — 클릭하면 유저 목록' : ''}`}</title>
                  {lossH > 16 && (
                    <text x={cx} y={lossY + lossH / 2 + 4} textAnchor="middle" fontSize="11" fontWeight="700"
                      fill="#8B95A1" style={{ pointerEvents: 'none', fontVariantNumeric: 'tabular-nums' }}>
                      −{lost.toLocaleString()}
                    </text>
                  )}
                </g>
              )}
              {/* 잔존 막대 */}
              <rect x={bx} y={by} width={barW} height={bh} rx="3" fill="#2563EB">
                <title>{`${label(steps[i])} · ${v.toLocaleString()}명 (1단계 대비 ${ofFirst.toFixed(1)}%)`}</title>
              </rect>
              {/* 큰 % (1단계 대비) + 인원 */}
              <text x={cx} y={(i > 0 ? Math.min(lossY, by) : by) - 18} textAnchor="middle" fontSize="16" fontWeight="800"
                fill="#191F28" style={{ fontVariantNumeric: 'tabular-nums' }}>{ofFirst.toFixed(1)}%</text>
              <text x={cx} y={(i > 0 ? Math.min(lossY, by) : by) - 5} textAnchor="middle" fontSize="10.5"
                fill="#8B95A1" style={{ fontVariantNumeric: 'tabular-nums' }}>{v.toLocaleString()}</text>
              {/* 하단 스텝 라벨 */}
              <text x={cx} y={H - 22} textAnchor="middle" fontSize="11.5" fontWeight="700" fill="#444">{i + 1}. {label(steps[i])}</text>
              {/* 직전 대비 전환율 (막대 사이) */}
              {i > 0 && (
                <text x={AXIS + colW * i} y={H - 8} textAnchor="middle" fontSize="10" fill="#9AA0A6"
                  style={{ fontVariantNumeric: 'tabular-nums' }}>
                  → {prevV > 0 ? `${((v / prevV) * 100).toFixed(1)}%` : '—'}
                </text>
              )}
            </g>
          )
        })}
      </svg>
    </div>
  )
}

export default function BehaviorFunnel({ token, lang, dateRange }) {
  const L = (ko, en, vi) => (lang === 'vi' ? (vi ?? en) : lang === 'ko' ? ko : en)
  const pickLang = (arr) => L(arr[0], arr[1], arr[2])
  const [steps, setSteps] = useState(PRESETS[1].steps)
  const [mode, setMode] = useState('users')
  const [windowSec, setWindowSec] = useState(86400)
  const [order, setOrder] = useState('this')
  const [drill, setDrill] = useState(null) // { reached, butNot }
  const [timelineKey, setTimelineKey] = useState(null) // 모달에서 펼친 유저

  const base = `from=${dateRange.from}&to=${dateRange.to}`
  const { data: catalog } = useAdmin(`/api/admin/funnel-explore?catalog=1&${base}`, token)
  const url = steps.length >= 2
    ? `/api/admin/funnel-explore?steps=${steps.join(',')}&${base}&mode=${mode}&window=${windowSec}&order=${order}&checkOrder=1`
    : null
  const { data, error } = useAdmin(url, token)
  const drillUrl = drill
    ? `/api/admin/funnel-users?steps=${steps.join(',')}&${base}&window=${windowSec}&order=${order}&reached=${drill.reached}${drill.butNot ? `&butNot=${drill.butNot}` : ''}`
    : null
  const { data: drillData } = useAdmin(drillUrl, token)
  const { data: timeline } = useAdmin(
    timelineKey ? `/api/admin/user-timeline?key=${encodeURIComponent(timelineKey)}&${base}` : null, token)

  const catalogEvents = catalog?.events || []
  // 응답이 현재 단계 구성과 같을 때만 표시 (keepPreviousData 로 이전 퍼널이 잠깐 남는 것 방지)
  const fresh = data?.steps && data.steps.length === steps.length && data.steps.every((s, i) => s.event === steps[i]) && data.mode === mode
  const vals = fresh ? data.steps.map(s => (mode === 'users' ? s.users : s.count) ?? 0) : []
  const first = vals[0] || 0
  const last = vals[vals.length - 1] || 0
  // 최대 이탈 단계 (절대 인원 기준)
  let maxDropIdx = -1, maxDrop = -1
  vals.forEach((v, i) => { if (i > 0 && vals[i - 1] - v > maxDrop) { maxDrop = vals[i - 1] - v; maxDropIdx = i } })
  // 순서 때문에 잘린 단계: 순서무관(any)으로는 도달했는데 현재 순서로는 절반도 못 잡힌 경우
  const orderWarnings = fresh && mode === 'users'
    ? data.steps.map((s, i) => ({ i, s })).filter(({ i, s }) =>
        i > 0 && s.anyUsers != null && s.anyUsers - s.users >= 10 && s.users < s.anyUsers * 0.5)
    : []
  const activePreset = PRESETS.find(p => p.steps.length === steps.length && p.steps.every((s, i) => s === steps[i]))?.key || ''
  const orderInfo = ORDERS.find(o => o[0] === order)

  const swap = (a, b) => setSteps(steps.map((s, i) => (i === a ? steps[b] : i === b ? steps[a] : s)))
  const hint = { color: C.faint, fontSize: 13, padding: `${G.xl}px 0` }
  const fieldLabel = { fontSize: 12, fontWeight: 600, color: C.sub, marginBottom: G.xs }

  const downloadCsv = () => {
    const rows = drillData?.users || []
    const csv = 'user_key,email,entered_at,last_step_at\n'
      + rows.map(u => [u.key, u.email || '', u.entered_at, u.last_step_at].join(',')).join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    a.download = `funnel_dropoff_${dateRange.from}_${dateRange.to}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  return (
    <Card style={{ marginBottom: G.xl }}>
      <SectionTitle
        sub={L(`고른 단계를 거친 사람 수를 셉니다 · 1단계 기준 기간 ${dateRange.from} ~ ${dateRange.to}`,
               `Counts people who went through the steps · step 1 in ${dateRange.from} ~ ${dateRange.to}`,
               `Đếm số người đi qua các bước · bước 1 trong ${dateRange.from} ~ ${dateRange.to}`)}
        right={<FilterTabs value={mode} onChange={setMode}
          items={[{ value: 'users', label: L('사람 수', 'Users', 'Người dùng') }, { value: 'count', label: L('이벤트 건수', 'Events', 'Số sự kiện') }]} />}>
        {L('행동 퍼널', 'Behavior funnel', 'Phễu hành vi')}
      </SectionTitle>

      {/* 자주 보는 퍼널 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: G.md, flexWrap: 'wrap', marginBottom: G.lg }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: C.sub }}>{L('자주 보는 퍼널', 'Presets', 'Phễu mẫu')}</span>
        <ChipGroup type="outline" variant="primary" size="medium" value={activePreset}
          items={PRESETS.map(p => ({ value: p.key, label: pickLang(p.label) }))}
          onChange={v => { const p = PRESETS.find(x => x.key === v); if (p) setSteps(p.steps) }}
          style={{ display: 'flex', flexWrap: 'wrap', gap: G.sm }} />
      </div>

      {/* 구성 패널: 단계 + 전환 기준 */}
      <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: G.lg }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: G.xs }}>
          <div style={{ ...fieldLabel, marginBottom: 0 }}>{L('단계', 'Steps', 'Các bước')}</div>
          {steps.length > 0 && (
            <GhostButton size="small" label={L('모두 지우기', 'Clear', 'Xóa hết')} onClick={() => setSteps([])} />
          )}
        </div>
        <div className="adm-m-wrap" style={{ display: 'flex', flexWrap: 'wrap', gap: G.sm, alignItems: 'center' }}>
          {steps.map((ev, i) => (
            <Fragment key={i}>
              {i > 0 && (
                <span title={L('앞 단계와 순서 바꾸기', 'Swap with previous', 'Đổi chỗ với bước trước')}>
                  <IconButton size="small" type="outline" color="neutral" icon={<RiArrowLeftRightLine size={14} />}
                    aria-label={L('앞 단계와 순서 바꾸기', 'Swap with previous', 'Đổi chỗ với bước trước')} onClick={() => swap(i - 1, i)} />
                </span>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: G.xs, background: '#fff', border: `1px solid ${C.border}`, borderRadius: 8, padding: G.xs }}>
                <span style={{ width: 22, height: 22, borderRadius: 11, background: '#2563EB', color: '#fff', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, ...num }}>{i + 1}</span>
                <StepPicker value={ev} events={catalogEvents} taken={steps} L={L} pickLang={pickLang} width={200}
                  onPick={v => setSteps(steps.map((s, si) => (si === i ? v : s)))} />
                <IconButton size="small" type="outline" color="neutral" icon={<RiCloseLine size={14} />}
                  aria-label={L('단계 삭제', 'Remove step', 'Xóa bước')} onClick={() => setSteps(steps.filter((_, si) => si !== i))} />
              </div>
            </Fragment>
          ))}
          {steps.length < 10 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: G.xs }}>
              <RiAddLine size={16} style={{ color: C.faint }} />
              <StepPicker value="" events={catalogEvents} taken={steps} L={L} pickLang={pickLang} width={160}
                placeholder={L('단계 추가', 'Add step', 'Thêm bước')} onPick={v => setSteps([...steps, v])} />
            </div>
          )}
        </div>

        {mode === 'users' && (
          <>
            <div style={{ ...fieldLabel, marginTop: G.lg }}>{L('전환 기준', 'Conversion rule', 'Quy tắc chuyển đổi')}</div>
            <div className="adm-m-wrap" style={{ display: 'flex', flexWrap: 'wrap', gap: G.sm, alignItems: 'center' }}>
              <span style={{ fontSize: 13, color: C.body }}>{L('1단계 후', 'After step 1,', 'Sau bước 1,')}</span>
              <div style={{ width: 150 }}>
                <Dropdown value={String(windowSec)} onChange={v => setWindowSec(Number(v))}
                  options={WINDOWS.map(([s, lb]) => ({ value: String(s), label: pickLang(lb) }))} />
              </div>
              <div style={{ width: 150 }}>
                <Dropdown value={order} onChange={setOrder}
                  options={ORDERS.map(([o, lb]) => ({ value: o, label: pickLang(lb) }))} />
              </div>
              <span style={{ fontSize: 13, color: C.sub }}>{orderInfo && pickLang(orderInfo[2])}</span>
            </div>
          </>
        )}
      </div>

      {/* 결과 영역 — 최소 높이 고정 (단계 추가/삭제 시 레이아웃 점프 방지) */}
      <div style={{ minHeight: 320, marginTop: G.lg }}>
        {steps.length < 2 && (
          <div style={hint}>{L('단계를 2개 이상 고르거나, 위의 자주 보는 퍼널을 눌러 주세요.', 'Pick 2+ steps or a preset above.', 'Chọn từ 2 bước trở lên hoặc một phễu mẫu ở trên.')}</div>
        )}
        {steps.length >= 2 && error && (
          <div style={{ ...hint, color: C.negative }}>
            {error.status === 501
              ? L('퍼널 RPC가 아직 DB에 없습니다 — supabase/migrations/20260716_funnel_analytics.sql 을 Supabase SQL 에디터에서 실행해 주세요.',
                  'Funnel RPC missing — run supabase/migrations/20260716_funnel_analytics.sql in the SQL editor.',
                  'Thiếu RPC phễu trong DB — hãy chạy supabase/migrations/20260716_funnel_analytics.sql trong SQL editor của Supabase.')
              : L(`불러오기 실패 (${error.status || ''})`, `Failed (${error.status || ''})`, `Tải thất bại (${error.status || ''})`)}
          </div>
        )}
        {steps.length >= 2 && !error && !fresh && (
          <div style={hint}>{L('계산 중입니다…', 'Computing…', 'Đang tính…')}</div>
        )}
        {steps.length >= 2 && fresh && (
          <>
            {orderWarnings.map(({ i, s }) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: G.md, flexWrap: 'wrap', background: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: 8, padding: `${G.md}px ${G.lg}px`, marginBottom: G.md }}>
                <div style={{ fontSize: 13, color: '#9A3412', lineHeight: 1.6, flex: '1 1 360px' }}>
                  <b>{L(`${i + 1}단계 '${label(s.event)}' 순서를 확인해 주세요.`, `Check the order of step ${i + 1} '${s.event}'.`, `Hãy kiểm tra thứ tự bước ${i + 1} '${s.event}'.`)}</b>{' '}
                  {L(`지금 순서로는 ${s.users.toLocaleString()}명이지만, 순서를 무시하면 ${s.anyUsers.toLocaleString()}명이 도달합니다. 이 행동이 앞 단계보다 먼저 일어나는 경우가 많습니다.`,
                     `${s.users} in this order vs ${s.anyUsers} ignoring order — it often happens before the previous step.`,
                     `${s.users} theo thứ tự này, ${s.anyUsers} nếu bỏ qua thứ tự — hành động này thường xảy ra trước bước trước.`)}
                </div>
                <SecondaryButton size="small" label={L(`${i}↔${i + 1}단계 바꾸기`, `Swap ${i}↔${i + 1}`, `Đổi ${i}↔${i + 1}`)} onClick={() => swap(i - 1, i)} />
              </div>
            ))}

            {mode === 'users' && (
              <StatGrid min={140} style={{ marginBottom: G.sm }}>
                <StatTile label={L('1단계 진입', 'Entered', 'Vào phễu')} value={first.toLocaleString()} sub={label(steps[0])} />
                <StatTile label={L('마지막 단계 도달', 'Completed', 'Hoàn thành')} value={last.toLocaleString()} sub={label(steps[steps.length - 1])} />
                <StatTile label={L('전체 전환율', 'Overall conversion', 'Tỷ lệ chuyển đổi')} value={pct(last, first)} accent={C.primary}
                  sub={L(`${steps.length}단계 · ${pickLang(WINDOWS.find(w => w[0] === windowSec)?.[1] || ['', '', ''])}`, `${steps.length} steps`, `${steps.length} bước`)} />
                {maxDropIdx > 0 && (
                  <StatTile label={L('가장 큰 이탈', 'Biggest drop', 'Rời bỏ lớn nhất')}
                    value={pct(maxDrop, vals[maxDropIdx - 1])} accent={C.negative}
                    sub={L(`${maxDropIdx}→${maxDropIdx + 1}단계 · −${maxDrop.toLocaleString()}명`, `Step ${maxDropIdx}→${maxDropIdx + 1} · −${maxDrop}`, `Bước ${maxDropIdx}→${maxDropIdx + 1} · −${maxDrop}`)} />
                )}
              </StatGrid>
            )}

            {mode === 'users' && <AmpChart vals={vals} steps={steps} onLossClick={(reached, butNot) => setDrill({ reached, butNot })} />}
            <TableCard minWidth={560} style={{ marginTop: G.md }}>
              <thead>
                <tr>
                  <th style={T.th}>{L('단계', 'Step', 'Bước')}</th>
                  <th style={T.thNum}>{mode === 'users' ? L('도달(명)', 'Users', 'Người dùng đạt') : L('건수', 'Count', 'Số lượng')}</th>
                  {mode === 'users' && <>
                    <th style={T.thNum}>{L('직전 대비', 'From prev', 'So với bước trước')}</th>
                    <th style={T.thNum}>{L('이탈(명)', 'Drop', 'Rời bỏ')}</th>
                    <th style={T.thNum}>{L('1단계 대비', 'Of step 1', 'So với bước 1')}</th>
                    <th style={T.thNum}>{L('중앙 소요', 'Median', 'Thời gian trung vị')}</th>
                  </>}
                </tr>
              </thead>
              <tbody>
                {data.steps.map((s, i) => {
                  const v = vals[i]
                  const prev = i > 0 ? vals[i - 1] : null
                  const conv = i > 0 && prev > 0 ? (v / prev) * 100 : null
                  const drop = i > 0 ? prev - v : null
                  const isMaxDrop = mode === 'users' && i === maxDropIdx && drop > 0
                  return (
                    <tr key={i}>
                      <td style={{ ...T.td, fontWeight: 600, whiteSpace: 'nowrap' }}>
                        {i + 1}. {label(s.event)} <span style={{ color: C.faint, fontWeight: 400 }}>{s.event}</span>
                        {isMaxDrop && <StatusTag tone="error" style={{ marginLeft: G.sm }}>{L('최대 이탈', 'Max drop', 'Rời bỏ nhiều nhất')}</StatusTag>}
                      </td>
                      <td style={{ ...T.tdNum, fontWeight: 700 }}>{v.toLocaleString()}</td>
                      {mode === 'users' && <>
                        <td style={{ ...T.tdNum, fontWeight: 700, color: conv === null ? C.faint : conv >= 50 ? C.positive : conv >= 20 ? '#B45309' : C.negative }}>
                          {i === 0 ? '—' : conv === null ? '—' : `${conv.toFixed(1)}%`}
                        </td>
                        <td style={{ ...T.tdNum, color: LOSS }}>
                          {drop === null ? '—' : (
                            <button onClick={() => setDrill({ reached: i, butNot: i + 1 })} title={L('이탈한 사람 목록 보기', 'Show dropped users', 'Xem danh sách')}
                              style={{ border: 'none', background: 'transparent', color: LOSS, cursor: 'pointer', fontSize: 13.5, fontWeight: 600, textDecoration: 'underline', padding: 0, ...num }}>
                              −{drop.toLocaleString()}
                            </button>
                          )}
                        </td>
                        <td style={T.tdNum}>{pct(v, first)}</td>
                        <td style={T.tdNum}>{fmtDur(s.medianSec)}</td>
                      </>}
                    </tr>
                  )
                })}
              </tbody>
            </TableCard>
            <div style={{ fontSize: 12, color: C.faint, marginTop: G.sm, lineHeight: 1.6 }}>
              {mode === 'users'
                ? L('사람 = 회원은 회원 ID(로그인 전 같은 브라우저 기록·앱 이벤트 포함), 비회원은 브라우저 기준입니다. 이탈 숫자나 차트의 빗금을 누르면 이탈한 사람 목록이 열립니다. 순서 무관 모드에서는 중앙 소요를 표시하지 않습니다.',
                   'People = member ID for members (incl. pre-login browser history and app events), browser for anonymous visitors. Click a drop number or hatched block for the user list.',
                   'Người dùng = ID thành viên với thành viên (gồm lịch sử trước khi đăng nhập và sự kiện ứng dụng), trình duyệt với khách ẩn danh. Nhấn số rời bỏ hoặc vùng gạch chéo để xem danh sách.')
                : L('건수 = 순서·사람 무시, 기간 내 이벤트 발생 횟수입니다. 단계 간 연결이 없어 전환율·이탈은 계산하지 않습니다.', 'Raw event counts, order ignored. No conversion/drop — steps are not linked.', 'Số lượng = đếm sự kiện trong khoảng thời gian, bỏ qua thứ tự và người dùng. Các bước không liên kết nên không tính tỷ lệ chuyển đổi/rời bỏ.')}
            </div>
          </>
        )}
      </div>

      {/* 이탈자 목록 모달 (Microscope) */}
      {drill && (
        <div onClick={() => { setDrill(null); setTimelineKey(null) }}
          style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: G.lg }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: '#fff', borderRadius: 12, padding: 20, width: 'min(680px, 100%)', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
            <SectionTitle style={{ alignItems: 'center' }}
              right={<>
                {drillData?.users?.length > 0 && (
                  <SecondaryButton size="small" label="CSV" onClick={downloadCsv} />
                )}
                <IconButton size="small" type="outline" color="neutral" icon={<RiCloseLine size={16} />} aria-label="close"
                  onClick={() => { setDrill(null); setTimelineKey(null) }} />
              </>}>
              {L(`${drill.reached}단계(${label(steps[drill.reached - 1])}) 도달 · ${drill.butNot}단계(${label(steps[drill.butNot - 1] || '')}) 미도달`,
                 `Reached step ${drill.reached}, not step ${drill.butNot}`,
                 `Đạt bước ${drill.reached}, chưa đạt bước ${drill.butNot}`)}
              {drillData && <span style={{ color: C.faint, fontWeight: 500, marginLeft: G.sm, ...num }}>{drillData.users.length}{L('명', '')}{drillData.users.length >= 1000 ? '+' : ''}</span>}
            </SectionTitle>

            {/* 이탈 직후 다음 행동 분포 (Pathfinder-lite) */}
            {drillData?.nextActions && drillData.nextActions.length > 0 && (
              <div style={{ background: C.bg, borderRadius: 8, padding: `${G.md}px ${G.lg}px`, marginBottom: G.md }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: C.sub, marginBottom: G.sm }}>
                  {L('이탈 직후 1시간 내 첫 행동 — "가입 대신 무엇을 했는지"', 'First action within 1h after last step', 'Hành động đầu tiên trong 1 giờ sau bước cuối')}
                </div>
                {(() => {
                  const total = drillData.nextActions.reduce((s, a) => s + a.users, 0)
                  return drillData.nextActions.slice(0, 8).map(a => (
                    <div key={a.event} style={{ display: 'flex', alignItems: 'center', gap: G.sm, marginTop: G.xs }}>
                      <span style={{ fontSize: 12, width: 170, flexShrink: 0, ...ellipsis, color: a.event === '(no further events)' ? C.faint : C.text, fontWeight: 600 }}>
                        {a.event === '(no further events)' ? L('(이탈 — 추가 행동 없음)', '(no further events)', '(không có hành động tiếp theo)') : label(a.event)}
                      </span>
                      <div style={{ flex: 1, height: 12, background: C.border, borderRadius: 6, overflow: 'hidden' }}>
                        <div style={{ width: `${total > 0 ? (a.users / total) * 100 : 0}%`, height: '100%', background: a.event === '(no further events)' ? '#B6BFC9' : '#2563EB', borderRadius: 6 }} />
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 700, width: 80, textAlign: 'right', color: C.text, ...num }}>
                        {a.users.toLocaleString()} · {total > 0 ? ((a.users / total) * 100).toFixed(0) : 0}%
                      </span>
                    </div>
                  ))
                })()}
              </div>
            )}

            <div style={{ overflowY: 'auto', flex: 1, minHeight: 0 }}>
              {!drillData && <div style={{ color: C.faint, fontSize: 13, padding: G.md }}>{L('불러오는 중…', 'Loading…', 'Đang tải…')}</div>}
              {drillData && (
                <TableCard minWidth={480}>
                  <thead>
                    <tr>
                      <th style={T.th}>{L('유저', 'User', 'Người dùng')}</th>
                      <th style={T.thNum}>{L('진입(t0, VN)', 'Entered (VN)', 'Vào phễu (giờ VN)')}</th>
                      <th style={T.thNum}>{L('마지막 도달', 'Last step', 'Bước cuối')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {drillData.users.map((u) => (
                      <Fragment key={u.key}>
                        <tr onClick={() => setTimelineKey(timelineKey === u.key ? null : u.key)}
                          style={{ cursor: 'pointer', background: timelineKey === u.key ? C.bg : 'transparent' }}>
                          <td style={{ ...T.td, maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            <span style={{ color: C.faint, marginRight: 6 }}>{timelineKey === u.key ? '▾' : '▸'}</span>
                            {u.email || <span style={{ color: C.faint }}>{u.key.slice(0, 13)}… {L('(익명)', '(anon)', '(ẩn danh)')}</span>}
                          </td>
                          <td style={{ ...T.tdNum, whiteSpace: 'nowrap' }}>{vnTime(u.entered_at)}</td>
                          <td style={{ ...T.tdNum, whiteSpace: 'nowrap' }}>{vnTime(u.last_step_at)}</td>
                        </tr>
                        {timelineKey === u.key && (
                          <tr>
                            <td colSpan={3} style={{ padding: `${G.sm}px ${G.lg}px ${G.md}px 34px`, background: C.bg, borderBottom: `1px solid ${C.line}` }}>
                              {!timeline && <span style={{ fontSize: 12, color: C.faint }}>{L('타임라인 로딩…', 'Loading timeline…', 'Đang tải dòng thời gian…')}</span>}
                              {timeline && timeline.events.length === 0 && <span style={{ fontSize: 12, color: C.faint }}>{L('기간 내 이벤트 없음', 'No events in range', 'Không có sự kiện trong khoảng thời gian')}</span>}
                              {timeline && timeline.events.map((e, ei) => (
                                <div key={ei} style={{ fontSize: 12, padding: '2px 0', display: 'flex', gap: G.md, ...num }}>
                                  <span style={{ color: C.faint, flexShrink: 0 }}>{vnTime(e.ts)}</span>
                                  <span style={{ fontWeight: 700, color: steps.includes(e.event) ? '#2563EB' : C.text, flexShrink: 0 }}>{label(e.event)}</span>
                                  {e.page && <span style={{ color: C.faint, ...ellipsis }}>{e.page}</span>}
                                </div>
                              ))}
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    ))}
                    {drillData.users.length === 0 && (
                      <tr><td colSpan={3} style={{ ...T.td, color: C.faint }}>{L('해당 유저 없음', 'No users', 'Không có người dùng')}</td></tr>
                    )}
                  </tbody>
                </TableCard>
              )}
            </div>
          </div>
        </div>
      )}
    </Card>
  )
}
