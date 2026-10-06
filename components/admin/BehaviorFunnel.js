import { useState, Fragment } from 'react'
import { IconButton } from '@likelion-design/ui'
import { RiCloseLine } from '@remixicon/react'
import { useAdmin } from '../../lib/adminSwr'
import { G, C, num, ellipsis, Card, SectionTitle, FilterTabs, StatusTag, SecondaryButton, T, TableCard } from './ui'

// 행동 퍼널 (Amplitude 의미론) — 계산은 Postgres RPC(funnel), 여기는 표시만.
// · 단계 드롭다운은 서버 list_events 가 채운다 (하드코딩 아님). ko 라벨은 표시용 오버레이.
// · 전환 윈도우(t0 기준 누적)와 순서 모드(this/any/exact)가 항상 화면에 보인다.
// · 리본: 두께 ∝ 잔존율, 이탈은 해칭 렌즈 — 클릭하면 이탈 유저 목록(funnel-users) 모달.

const KO_LABELS = {
  session_start: '웹 진입(전체)', landing: '홈 랜딩', hero_cta_click: '히어로 CTA', wizard_step_1: '위저드 시작', wizard_step_2: '위저드 2',
  wizard_step_3: '위저드 3', wizard_step_4: '위저드 완료', submit_application: '제출(연봉·지원 공용)',
  result_gate_view: '게이트 노출', result_company_card_click: '결과 회사카드 클릭', search_company: '회사 검색',
  view_jobs_page: '공고 목록 뷰', click_job_card: '공고 카드 클릭', view_job_detail: '공고 상세 뷰',
  click_apply_button: '지원 버튼 클릭', save_job: '공고 저장', view_similar_jobs_modal: '유사공고 모달',
  cv_view: 'CV 페이지 뷰', cv_click_cta: 'CV CTA 클릭', cv_attach_file: 'CV 파일 첨부',
  cv_oauth_start: 'CV OAuth 시작', cv_register_success: 'CV 등록 완료',
  sign_up: '가입(sign_up)', one_tap_success: 'One Tap 가입', company_gate_login_success: '게이트 로그인',
  view_community: '커뮤니티 뷰', click_app_download: '앱 다운로드 클릭', page_view: '광고 페이지뷰',
}

const WINDOWS = [[1800, '30분'], [10800, '3시간'], [86400, '1일'], [604800, '7일'], [2592000, '30일']]
const ORDERS = [['this', '순차 (this)'], ['any', '순서무관 (any)'], ['exact', '엄격 (exact)']]

const LOSS = C.negative

const label = (ev) => KO_LABELS[ev] || ev
const fmtDur = (sec) => {
  if (sec === null || sec === undefined) return '—'
  if (sec < 60) return `${Math.round(sec)}초`
  if (sec < 3600) return `${(sec / 60).toFixed(1)}분`
  if (sec < 86400) return `${(sec / 3600).toFixed(1)}시간`
  return `${(sec / 86400).toFixed(1)}일`
}
const vnTime = (iso) => (iso ? new Date(new Date(iso).getTime() + 7 * 36e5).toISOString().slice(0, 16).replace('T', ' ') : '—')

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
  const [steps, setSteps] = useState(['view_jobs_page', 'click_job_card', 'click_apply_button'])
  const [mode, setMode] = useState('users')
  const [windowSec, setWindowSec] = useState(86400)
  const [order, setOrder] = useState('this')
  const [drill, setDrill] = useState(null) // { reached, butNot }
  const [timelineKey, setTimelineKey] = useState(null) // 모달에서 펼친 유저

  const base = `from=${dateRange.from}&to=${dateRange.to}`
  const { data: catalog } = useAdmin(`/api/admin/funnel-explore?catalog=1&${base}`, token)
  const url = steps.length >= 2
    ? `/api/admin/funnel-explore?steps=${steps.join(',')}&${base}&mode=${mode}&window=${windowSec}&order=${order}`
    : null
  const { data, error, isLoading } = useAdmin(url, token)
  const drillUrl = drill
    ? `/api/admin/funnel-users?steps=${steps.join(',')}&${base}&window=${windowSec}&order=${order}&reached=${drill.reached}${drill.butNot ? `&butNot=${drill.butNot}` : ''}`
    : null
  const { data: drillData } = useAdmin(drillUrl, token)
  const { data: timeline } = useAdmin(
    timelineKey ? `/api/admin/user-timeline?key=${encodeURIComponent(timelineKey)}&${base}` : null, token)

  const catalogEvents = catalog?.events || []
  const vals = (data?.steps || []).map(s => (mode === 'users' ? s.users : s.count) ?? 0)
  const first = vals[0] || 0
  // 최대 이탈 단계 (절대 인원 기준) 자동 강조
  let maxDropIdx = -1, maxDrop = -1
  vals.forEach((v, i) => { if (i > 0 && vals[i - 1] - v > maxDrop) { maxDrop = vals[i - 1] - v; maxDropIdx = i } })

  // 네이티브 select — kit 입력창(36px·radius 4·gray-300 테두리)과 같은 모양
  const selStyle = {
    height: 36, padding: '0 8px', borderRadius: 4, border: '1px solid var(--color-semantic-border-normal, #D1D6DC)', background: '#fff',
    fontSize: 13.5, fontWeight: 500, color: C.text, cursor: 'pointer', maxWidth: 200,
  }
  const hint = { color: C.faint, fontSize: 13, paddingTop: G.sm }
  const stepOptions = (exceptIdx) => catalogEvents.map(e => (
    <option key={e.event_name} value={e.event_name}
      disabled={steps.includes(e.event_name) && steps[exceptIdx] !== e.event_name}>
      {label(e.event_name)} ({Number(e.cnt).toLocaleString()})
    </option>
  ))

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
      {/* 헤더 + 항상 보이는 윈도우/순서 컨트롤 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: G.md, marginBottom: G.lg }}>
        <SectionTitle style={{ marginBottom: 0 }}
          sub={L('유저 단위 · t0 기준 누적 윈도우 · 1단계만 기간 내 필수', 'Per-user · window from t0 · only step 1 must be in range', 'Theo người dùng · cửa sổ tính từ t0 · chỉ bước 1 cần nằm trong khoảng thời gian')}>
          {L('행동 퍼널', 'Behavior funnel', 'Phễu hành vi')}
        </SectionTitle>
        <span className="adm-m-wrap" style={{ display: 'flex', gap: G.sm, alignItems: 'center' }}>
          <label style={{ fontSize: 12, color: C.sub, fontWeight: 600 }}>{L('전환 윈도우', 'Window', 'Cửa sổ chuyển đổi')}</label>
          <select value={windowSec} onChange={e => setWindowSec(Number(e.target.value))} style={selStyle}>
            {WINDOWS.map(([s, lb]) => <option key={s} value={s}>{lb}</option>)}
          </select>
          <select value={order} onChange={e => setOrder(e.target.value)} style={selStyle}>
            {ORDERS.map(([o, lb]) => <option key={o} value={o}>{lb}</option>)}
          </select>
          <FilterTabs value={mode} onChange={setMode}
            items={[{ value: 'users', label: L('유저 퍼널', 'Users', 'Người dùng') }, { value: 'count', label: L('건수', 'Events', 'Số sự kiện') }]} />
        </span>
      </div>

      {/* 단계 드롭다운 (서버 카탈로그 기반) */}
      <div className="adm-m-wrap" style={{ display: 'flex', flexWrap: 'wrap', gap: G.sm, alignItems: 'center' }}>
        {steps.map((ev, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: G.xs }}>
            {i > 0 && <span style={{ fontSize: 13, color: C.faint, marginRight: G.xs }}>→</span>}
            <span style={{ fontSize: 13, fontWeight: 600, color: C.sub, ...num }}>{i + 1}.</span>
            <select value={ev} style={selStyle}
              onChange={e => setSteps(steps.map((s, si) => (si === i ? e.target.value : s)))}>
              {!catalogEvents.some(c => c.event_name === ev) && <option value={ev}>{label(ev)}</option>}
              {stepOptions(i)}
            </select>
            <IconButton size="small" type="solid" color="secondary" icon={<RiCloseLine size={16} />} aria-label="remove"
              onClick={() => setSteps(steps.filter((_, si) => si !== i))} />
          </div>
        ))}
        {steps.length < 10 && (
          <select value="" style={{ ...selStyle, color: C.sub }}
            onChange={e => { if (e.target.value) setSteps([...steps, e.target.value]) }}>
            <option value="">{L('+ 단계 추가', '+ Add step', '+ Thêm bước')}</option>
            {stepOptions(-1)}
          </select>
        )}
        {steps.length > 0 && (
          <SecondaryButton label={L('초기화', 'Clear', 'Đặt lại')} onClick={() => setSteps([])} />
        )}
      </div>

      {/* 결과 영역 — 최소 높이 고정 (단계 추가/삭제 시 레이아웃 점프 방지) */}
      <div style={{ minHeight: 320, marginTop: G.lg }}>
        {steps.length < 2 && (
          <div style={hint}>{L('단계를 2개 이상 고르면 퍼널이 그려집니다.', 'Pick 2+ steps.', 'Chọn từ 2 bước trở lên để vẽ phễu.')}</div>
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
        {steps.length >= 2 && !error && isLoading && !data && (
          <div style={hint}>{L('계산 중…', 'Computing…', 'Đang tính…')}</div>
        )}
        {steps.length >= 2 && data && (
          <>
            {mode === 'users' && <AmpChart vals={vals} steps={steps} onLossClick={(reached, butNot) => setDrill({ reached, butNot })} />}
            <TableCard minWidth={560} style={{ marginTop: G.md }}>
              <thead>
                <tr>
                  <th style={T.th}>{L('단계', 'Step', 'Bước')}</th>
                  <th style={T.thNum}>{mode === 'users' ? L('도달(명)', 'Users', 'Người dùng đạt') : L('건수', 'Count', 'Số lượng')}</th>
                  <th style={T.thNum}>{L('전환율', 'Conv', 'Tỷ lệ chuyển đổi')}</th>
                  <th style={T.thNum}>{L('이탈', 'Drop', 'Rời bỏ')}</th>
                  <th style={T.thNum}>{L('1단계 대비', 'Of step 1', 'So với bước 1')}</th>
                  {mode === 'users' && <th style={T.thNum}>{L('중앙 소요', 'Median', 'Thời gian trung vị')}</th>}
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
                      <td style={{ ...T.tdNum, fontWeight: 700, color: conv === null ? C.faint : conv >= 50 ? C.positive : conv >= 20 ? '#B45309' : C.negative }}>
                        {i === 0 ? '100%' : conv === null ? '—' : `${conv.toFixed(1)}%`}
                      </td>
                      <td style={{ ...T.tdNum, color: LOSS }}>
                        {drop === null ? '—' : mode === 'users' ? (
                          <button onClick={() => setDrill({ reached: i, butNot: i + 1 })}
                            style={{ border: 'none', background: 'transparent', color: LOSS, cursor: 'pointer', fontSize: 13.5, fontWeight: 600, textDecoration: 'underline', padding: 0, ...num }}>
                            −{drop.toLocaleString()}
                          </button>
                        ) : `−${drop.toLocaleString()}`}
                      </td>
                      <td style={T.tdNum}>{first > 0 ? `${((v / first) * 100).toFixed(1)}%` : '—'}</td>
                      {mode === 'users' && <td style={T.tdNum}>{fmtDur(s.medianSec)}</td>}
                    </tr>
                  )
                })}
              </tbody>
            </TableCard>
            <div style={{ fontSize: 12, color: C.faint, marginTop: G.sm, lineHeight: 1.6 }}>
              {mode === 'users'
                ? L(`유저 = user_id·client_id 식별 방문자. t0(1단계 최초 발생) 기준 ${WINDOWS.find(w => w[0] === windowSec)?.[1]} 안에 도달해야 카운트됩니다. 이탈 숫자 클릭 → 유저 목록. 공고면 client_id 계측은 7/16 배포부터 — 이전 기간은 과소집계됩니다.`,
                   `Users identified by user_id/client_id; steps must occur within the window from t0. Click drop → user list.`,
                   `Người dùng xác định bằng user_id/client_id; các bước phải xảy ra trong cửa sổ tính từ t0. Nhấn vào số rời bỏ → danh sách người dùng.`)
                : L('건수 = 순서·유저 무시, 기간 내 이벤트 발생 횟수.', 'Raw event counts, order ignored.', 'Số lượng = đếm sự kiện trong khoảng thời gian, bỏ qua thứ tự và người dùng.')}
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
