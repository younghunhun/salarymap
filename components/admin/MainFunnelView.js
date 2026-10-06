import { useState } from 'react'
import { useAdmin } from '../../lib/adminSwr'
import BehaviorFunnel, { AmpChart } from './BehaviorFunnel'
import { G, C, num, Card, SectionTitle, StatTile, T, TableCard, State } from './ui'

// 메인 퍼널 대시보드 — 유입(GA4) → 가입 → 지원 → 합격.
// 단계 카드를 클릭하면 아래에 해당 단계의 세부(채널/유입경로/공고/합격 목록)가 열린다.
// 유입은 /api/admin/ga4, 나머지는 /api/admin/main-funnel 에서 로드 (둘 다 SWR 캐시).

// 색은 절제 — 타일은 전부 kit StatTile 한 가지, 선택된 단계만 주황 1px 테두리.
const STAGES = [
  { key: 'traffic', ko: '유입', en: 'Traffic', vi: 'Lượt truy cập', sub: { ko: 'GA4 방문자', en: 'GA4 users', vi: 'Người dùng GA4' } },
  { key: 'signup', ko: '가입', en: 'Sign-ups', vi: 'Đăng ký', sub: { ko: '신규 가입', en: 'New users', vi: 'Người dùng mới' } },
  { key: 'apply', ko: '지원', en: 'Applies', vi: 'Ứng tuyển', sub: { ko: '지원자 (유니크)', en: 'Applicants (unique)', vi: 'Ứng viên (duy nhất)' } },
  { key: 'accepted', ko: '합격', en: 'Accepted', vi: 'Trúng tuyển', sub: { ko: '합격자', en: 'Accepted users', vi: 'Người trúng tuyển' } },
]


const fmt = (n) => (n === null || n === undefined ? '—' : n.toLocaleString())
const pct = (a, b, digits = 1) => (b > 0 && a !== null && a !== undefined ? ((a / b) * 100).toFixed(digits) : null)
const rateColor = (v) => (v === null ? C.faint : C.text)

// 상세 블록의 소제목(14/600) — 섹션 제목(kit SectionTitle 16/600) 아래 한 단계. right 는 오른쪽 보조 문구.
function SubHead({ children, right, style }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: G.md, flexWrap: 'wrap', marginBottom: G.sm, ...style }}>
      <span style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{children}</span>
      {right && <span style={{ fontSize: 12, color: C.faint }}>{right}</span>}
    </div>
  )
}

// left: 왼쪽 정렬할(글자) 열 번호. 나머지 열은 숫자로 보고 오른쪽 정렬.
function DetailTable({ title, columns, rows, left = [0], style }) {
  return (
    <div style={{ marginBottom: G.xl, minWidth: 0, ...style }}>
      <SubHead>{title}</SubHead>
      <TableCard minWidth={480}>
        <thead>
          <tr>
            {columns.map((c, i) => <th key={c} style={left.includes(i) ? T.th : T.thNum}>{c}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr><td colSpan={columns.length} style={{ ...T.td, color: C.faint }}>—</td></tr>
          )}
          {rows.map((r, ri) => (
            <tr key={ri}>
              {r.map((cell, ci) => <td key={ci} style={ci === 0 ? T.td : { ...(left.includes(ci) ? T.td : T.tdNum), whiteSpace: 'nowrap' }}>{cell}</td>)}
            </tr>
          ))}
        </tbody>
      </TableCard>
    </div>
  )
}

export default function MainFunnelView({ token, lang, dateRange }) {
  const L = (ko, en, vi) => (lang === 'vi' ? (vi ?? en) : lang === 'ko' ? ko : en)
  const [stage, setStage] = useState('traffic')

  const qs = `from=${dateRange.from}&to=${dateRange.to}`
  const { data: ga4, error: ga4Error } = useAdmin(`/api/admin/ga4?${qs}`, token)
  const { data: funnel, isLoading } = useAdmin(`/api/admin/main-funnel?${qs}`, token)

  if (isLoading && !funnel) {
    return <State kind="loading">{L('불러오는 중…', 'Loading…', 'Đang tải…')}</State>
  }
  if (!funnel) return null

  // 단계별 대표 숫자 (전환율은 이 숫자 기준: 방문자→가입자→지원자→합격자)
  const visitors = ga4?.totals?.totalUsers ?? null
  const signups = funnel.signups.total
  const applicants = funnel.applications.uniqueUsers
  const acceptedUsers = funnel.accepted.uniqueUsers
  const values = { traffic: visitors, signup: signups, apply: applicants, accepted: acceptedUsers }
  const secondary = {
    traffic: ga4 ? L(`세션 ${fmt(ga4.totals.sessions)}`, `${fmt(ga4.totals.sessions)} sessions`, `${fmt(ga4.totals.sessions)} phiên`) : (ga4Error ? L('GA4 로드 실패', 'GA4 failed', 'Lỗi tải GA4') : L('GA4 로딩…', 'GA4 loading…', 'Đang tải GA4…')),
    signup: null,
    apply: L(
      `지원 ${fmt(funnel.applications.total)}건 · 실공고 ${fmt(funnel.applications.realFake?.real.count)}건`,
      `${fmt(funnel.applications.total)} applies · ${fmt(funnel.applications.realFake?.real.count)} real`,
      `${fmt(funnel.applications.total)} lượt ứng tuyển · ${fmt(funnel.applications.realFake?.real.count)} tin thật`,
    ),
    accepted: L(`합격 ${fmt(funnel.accepted.total)}건`, `${fmt(funnel.accepted.total)} accepted`, `${fmt(funnel.accepted.total)} trúng tuyển`),
  }
  const overall = pct(acceptedUsers, visitors, 2)

  // ── 일별 테이블 데이터: GA4 일별 + 가입/지원/합격 일별을 날짜로 병합 ──
  const ga4Daily = Object.fromEntries((ga4?.daily || []).map(d => [d.date, d]))
  const allDates = [...new Set([
    ...Object.keys(ga4Daily),
    ...Object.keys(funnel.signups.daily),
    ...Object.keys(funnel.applications.daily),
    ...Object.keys(funnel.accepted.daily),
  ])].sort().reverse()

  const detailTitle = {
    traffic: L('유입 상세 — 채널·랜딩 페이지 (GA4)', 'Traffic detail — channels & landing pages (GA4)', 'Chi tiết truy cập — kênh & trang đích (GA4)'),
    signup: L('가입 상세 — 이탈 지도 · 유입 경로', 'Sign-up detail — drop-off map & source', 'Chi tiết đăng ký — điểm rời bỏ & nguồn'),
    apply: L('지원 상세', 'Apply detail', 'Chi tiết ứng tuyển'),
    accepted: L('합격 상세', 'Accepted detail', 'Chi tiết trúng tuyển'),
  }

  const stickyTh = { position: 'sticky', top: 0, zIndex: 1, borderBottom: 'none', boxShadow: `inset 0 -1px 0 ${C.border}` }

  return (
    <>
      {/* ── 퍼널 스트립: 4단계 카드 + 단계간 전환율 ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: G.md, flexWrap: 'wrap', marginBottom: G.md }}>
        <span style={{ fontSize: 13, color: C.sub, ...num }}>
          {dateRange.from} ~ {dateRange.to} · {L('기간 내 발생 기준 (코호트 아님)', 'Period-based, not cohort', 'Theo phát sinh trong kỳ (không phải cohort)')}
        </span>
        <span style={{ fontSize: 13, color: C.sub }}>
          {L('전체 전환', 'Overall', 'Tỷ lệ chuyển đổi tổng')} {L('유입→합격', 'traffic→accepted', 'truy cập→trúng tuyển')}:{' '}
          <b style={{ fontSize: 16, color: C.text, ...num }}>{overall === null ? '—' : `${overall}%`}</b>
        </span>
      </div>
      {/* kit StatGrid 는 className 을 못 받아(모바일 2열 유틸 adm-m-2col 유지) 같은 간격의 그리드를 직접 둔다 */}
      <div className="adm-m-2col" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: G.md, marginBottom: G.xl }}>
        {STAGES.map((s, i) => {
          const val = values[s.key]
          const prevVal = i > 0 ? values[STAGES[i - 1].key] : null
          const conv = i > 0 ? pct(val, prevVal, val !== null && prevVal > 0 && (val / prevVal) < 0.1 ? 2 : 1) : null
          const active = stage === s.key
          return (
            <div key={s.key} onClick={() => setStage(s.key)} style={{ cursor: 'pointer', minWidth: 0 }}>
              <StatTile
                label={`${i + 1}. ${L(s.ko, s.en, s.vi)}`}
                value={fmt(val)}
                delta={i > 0 ? `← ${conv === null ? '—' : `${conv}%`}` : undefined}
                sub={`${L(s.sub.ko, s.sub.en, s.sub.vi)}${secondary[s.key] ? ` · ${secondary[s.key]}` : ''}`}
                style={{ height: '100%', boxSizing: 'border-box', border: `1px solid ${active ? C.primary : C.border}`, transition: 'border-color 0.15s' }} />
            </div>
          )
        })}
      </div>

      {/* ── 일별 퍼널 (매일 보는 메인 표 — 단계 상세보다 위) ── */}
      <div style={{ marginBottom: G.xl }}>
        <SectionTitle sub={L('가입률 = 가입/유입 · 지원자 단위 지표는 지원 카드에서 볼 수 있습니다', 'Signup% = signups/users', 'Tỷ lệ đăng ký = đăng ký/truy cập')}>
          {L('일별 퍼널 (최신순)', 'Daily funnel (latest first)', 'Phễu theo ngày (mới nhất trước)')}
        </SectionTitle>
        <TableCard minWidth={640} style={{ maxHeight: 520, overflowY: 'auto' }}>
          <thead>
            <tr>
              <th style={{ ...T.th, ...stickyTh }}>{L('날짜', 'Date', 'Ngày')}</th>
              <th style={{ ...T.thNum, ...stickyTh }}>{L('유입', 'Users', 'Truy cập')}</th>
              <th style={{ ...T.thNum, ...stickyTh }}>{L('가입', 'Sign-ups', 'Đăng ký')}</th>
              <th style={{ ...T.thNum, ...stickyTh }}>{L('가입률', 'Signup %', 'Tỷ lệ ĐK')}</th>
              <th style={{ ...T.thNum, ...stickyTh }}>{L('지원 건', 'Applies', 'Lượt ứng tuyển')}</th>
              <th style={{ ...T.thNum, ...stickyTh }}>{L('실공고 건', 'Real jobs', 'Tin thật')}</th>
              <th style={{ ...T.thNum, ...stickyTh }}>{L('합격', 'Accepted', 'Trúng tuyển')}</th>
            </tr>
          </thead>
          <tbody>
            {allDates.map(d => {
              const u = ga4Daily[d]?.totalUsers ?? null
              const sg = funnel.signups.daily[d] || 0
              const ap = funnel.applications.daily[d] || { count: 0, real: 0, users: 0 }
              const ac = funnel.accepted.daily[d] || 0
              const signupRate = pct(sg, u)
              return (
                <tr key={d}>
                  <td style={{ ...T.td, fontWeight: 600, whiteSpace: 'nowrap', ...num }}>{d}</td>
                  <td style={T.tdNum}>{fmt(u)}</td>
                  <td style={T.tdNum}>{sg || '·'}</td>
                  <td style={{ ...T.tdNum, color: rateColor(signupRate), fontWeight: 600 }}>{signupRate === null ? '—' : `${signupRate}%`}</td>
                  <td style={T.tdNum}>{ap.count || '·'}</td>
                  <td style={{ ...T.tdNum, color: C.positive, fontWeight: ap.real ? 600 : 400 }}>{ap.real || '·'}</td>
                  <td style={{ ...T.tdNum, fontWeight: ac ? 700 : 400, color: ac ? C.positive : C.text }}>{ac || '·'}</td>
                </tr>
              )
            })}
          </tbody>
        </TableCard>
      </div>

      {/* ── 선택 단계 드릴다운 ── */}
      <SectionTitle>{detailTitle[stage]}</SectionTitle>

      {stage === 'traffic' && (ga4 ? (
        <>
          <DetailTable
            title={L('채널별', 'By channel', 'Theo kênh')}
            columns={[L('채널', 'Channel', 'Kênh'), L('세션', 'Sessions', 'Phiên'), L('방문자', 'Users', 'Người dùng'), L('신규 방문자', 'New users', 'Người dùng mới'), L('참여 세션', 'Engaged', 'Phiên tương tác'), L('이탈률', 'Bounce', 'Tỷ lệ thoát')]}
            rows={(ga4.channels || []).map(c => [
              c.channel, fmt(c.sessions), fmt(c.totalUsers), fmt(c.newUsers), fmt(c.engagedSessions), `${(c.bounceRate * 100).toFixed(0)}%`,
            ])}
          />
          <DetailTable
            title={L('랜딩 페이지 Top 10', 'Top 10 landing pages', 'Top 10 trang đích')}
            columns={[L('페이지', 'Page', 'Trang'), L('세션', 'Sessions', 'Phiên'), L('방문자', 'Users', 'Người dùng'), L('이탈률', 'Bounce', 'Tỷ lệ thoát')]}
            rows={(ga4.landingPages || []).filter(p => !String(p.page).startsWith('/admin')).slice(0, 10).map(p => [
              p.page, fmt(p.sessions), fmt(p.totalUsers), `${(p.bounceRate * 100).toFixed(0)}%`,
            ])}
          />
        </>
      ) : (
        <Card padding={0} style={{ marginBottom: G.xl }}>
          <State kind={ga4Error ? 'error' : 'loading'}>{ga4Error ? L('GA4 데이터를 불러오지 못했습니다.', 'Failed to load GA4 data.', 'Không tải được dữ liệu GA4.') : L('GA4 로딩 중…', 'Loading GA4…', 'Đang tải GA4…')}</State>
        </Card>
      ))}

      {stage === 'signup' && (
        <>
          {/* 단계별 이탈 플로우 — 어디서 가장 많이 새는지 (계측 신뢰 플로우만) */}
          {funnel.flows && (
            <Card style={{ marginBottom: G.xl }}>
              <SubHead style={{ marginBottom: G.lg }}
                right={<>{L('총 가입', 'Sign-ups', 'Tổng đăng ký')} <b style={{ color: C.text, ...num }}>{fmt(signups)}</b></>}>
                {L('단계별 이탈 플로우 — 어디에서 이탈하는지', 'Step-by-step drop-off — where users leak', 'Luồng rời bỏ theo bước — rò rỉ ở đâu')}
              </SubHead>
              {['wizard', 'cv'].map(k => funnel.flows[k] && (
                <div key={k} style={{ marginBottom: G.md }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.body }}>{L(...funnel.flows[k].title)}</div>
                  <AmpChart vals={funnel.flows[k].steps.map(s => s.users)} steps={funnel.flows[k].steps.map(s => L(...s.label))} />
                </div>
              ))}
              <div style={{ fontSize: 12, color: C.faint, lineHeight: 1.7, paddingTop: G.md, borderTop: `1px solid ${C.line}` }}>
                {L('각 단계 = 직전 단계 도달 유저 중 다음 단계까지 간 유저(순차·유저 단위·전체 기간 윈도우). 빨강 = 가장 크게 새는 지점. 마지막은 실제 신규 가입 — 위저드는 sign_up 이벤트, CV는 등록완료 도달자 중 신규 auth 계정만(CV는 클라이언트 OAuth라 sign_up 이벤트가 안 잡혀 계정 생성으로 집계). ',
                   'Each step = users from the previous reaching the next (sequential, per-user). Red = biggest leak. Final step = actual new signups (wizard: sign_up event; CV: new auth accounts among registrants). ',
                   'Mỗi bước = số người dùng từ bước trước đi tiếp đến bước sau (tuần tự, theo người dùng). Đỏ = điểm rò rỉ lớn nhất. Bước cuối = đăng ký mới thực tế (wizard: sự kiện sign_up; CV: tài khoản auth mới trong số người hoàn tất đăng ký). ')}
                <b style={{ color: C.negative }}>{L('공고·앱 플로우는 제외', 'Jobs/app excluded', 'Không gồm luồng tin tuyển dụng/app')}</b>
                {L(': 공고 목록·카드·지원버튼 이벤트의 ~60%, 앱 이벤트의 ~51%가 client_id 없이(익명) 찍혀 순차 스티칭이 불가 → 계측을 먼저 고쳐야 신뢰할 수 있습니다. CV는 sign_up 이벤트가 웹 콜백 전용이라 등록완료(cv_register_success)를 종료 단계로 봅니다.',
                   ': top-of-funnel events for jobs (~60%) and app (~51%) fire without client_id, so sequential stitching is unreliable — fix instrumentation first.',
                   ': ~60% sự kiện đầu phễu của tin tuyển dụng và ~51% của app không có client_id nên không ghép tuần tự được — cần sửa đo lường trước.')}
              </div>
            </Card>
          )}
          <DetailTable
            title={L('가입 유입 경로 (utm_source / campaign, 미기록=organic/direct)', 'Signup source (utm_source / campaign)', 'Nguồn đăng ký (utm_source / campaign)')}
            columns={[L('경로', 'Source', 'Nguồn'), L('가입자', 'Sign-ups', 'Đăng ký'), L('비중', 'Share', 'Tỷ trọng')]}
            rows={funnel.signups.bySource.map(r => [r.key, fmt(r.count), `${pct(r.count, signups) ?? 0}%`])}
          />
        </>
      )}

      {stage === 'apply' && (
        <>
          {/* 실 공고(기업등록+KTC) 건당 지원 — 누적(기간 무관) */}
          {funnel.realJobs && (
            <div style={{ marginBottom: G.md }}>
              <SubHead right={L('기간 무관 · 테스트 지원 제외', 'All-time · test excluded', 'Toàn thời gian · loại trừ test')}>
                {L('실 공고 건당 지원 (기업등록 + KTC · 누적)', 'Real jobs — applications per posting (all-time)', 'Tin thật — lượt ứng tuyển mỗi tin (toàn thời gian)')}
              </SubHead>
              <div className="adm-m-2col" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: G.md }}>
                {[
                  { label: L('실 공고 (활성)', 'Real postings (active)', 'Tin thật (đang hoạt động)'), value: fmt(funnel.realJobs.activePostings),
                    sub: L(`전체 ${fmt(funnel.realJobs.totalPostings)}건`, `${fmt(funnel.realJobs.totalPostings)} total`, `Tổng ${fmt(funnel.realJobs.totalPostings)} tin`) },
                  { label: L('누적 실 지원', 'Total real applies', 'Tổng ứng tuyển thật'), value: fmt(funnel.realJobs.totalApps),
                    sub: L(`지원 받은 공고 ${fmt(funnel.realJobs.postingsWithApps)}건`, `${fmt(funnel.realJobs.postingsWithApps)} with applies`, `${fmt(funnel.realJobs.postingsWithApps)} tin có ứng tuyển`) },
                  { label: L('공고당 평균 지원', 'Avg applies / posting', 'TB ứng tuyển / tin'), value: funnel.realJobs.avgPerActive === null ? '—' : funnel.realJobs.avgPerActive.toFixed(1),
                    sub: L(`지원받은 공고당 ${funnel.realJobs.avgPerWithApps === null ? '—' : funnel.realJobs.avgPerWithApps.toFixed(1)}건`, `${funnel.realJobs.avgPerWithApps === null ? '—' : funnel.realJobs.avgPerWithApps.toFixed(1)} per applied`, `${funnel.realJobs.avgPerWithApps === null ? '—' : funnel.realJobs.avgPerWithApps.toFixed(1)} / tin có ứng tuyển`) },
                ].map((c, i) => <StatTile key={i} label={c.label} value={c.value} sub={c.sub} />)}
              </div>
            </div>
          )}
          {/* real(기업등록+KTC) vs fake(크롤/수동) 공고 지원 분리 */}
          {funnel.applications.realFake && (
            <div className="adm-m-1col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: G.md, marginBottom: G.xl }}>
              {[
                { k: 'real', label: L('실공고 지원 (기업등록 + KTC)', 'Real jobs (company + KTC)', 'Tin thật (công ty đăng + KTC)') },
                { k: 'fake', label: L('크롤 공고 지원 (wanted/topdev 등)', 'Crawled jobs (wanted/topdev …)', 'Tin crawl (wanted/topdev …)') },
              ].map(({ k, label }) => {
                const v = funnel.applications.realFake[k]
                return (
                  <StatTile key={k} label={label}
                    value={`${fmt(v.count)}${L('건', '')}`}
                    delta={`${v.users}${L('명', ' users', ' người')} · ${pct(v.count, funnel.applications.total) ?? 0}%`} />
                )
              })}
            </div>
          )}
          <Card style={{ marginBottom: G.xl }}>
            <SubHead style={{ marginBottom: G.lg }}
              right={<>{L('인당 평균', 'Avg per user', 'TB mỗi người')} <b style={{ color: C.text, ...num }}>{applicants > 0 ? (funnel.applications.total / applicants).toFixed(1) : '—'}</b>{L('회', '')}</>}>
              {L('지원 횟수 분포 — n회 지원한 사람 수', 'Applies per user — distribution', 'Phân bố số lần ứng tuyển mỗi người')}
            </SubHead>
            {(() => {
              const dist = funnel.applications.applyDist || []
              const maxUsers = Math.max(...dist.map(d => d.users), 1)
              const BAR_H = 120
              return (
                <div className="adm-m-scroll">
                <div style={{ display: 'flex', gap: G.sm, alignItems: 'flex-end', minWidth: 440 }}>
                  {dist.map(d => (
                    <div key={d.bucket} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: C.text, marginBottom: G.xs, ...num }}>{d.users}</div>
                      <div style={{ width: '60%', height: Math.max(4, (d.users / maxUsers) * BAR_H), background: '#0D9488', borderRadius: '4px 4px 0 0' }} />
                      <div style={{ fontSize: 12, fontWeight: 600, color: C.body, marginTop: 6 }}>{d.bucket}{L('회', 'x')}</div>
                      <div style={{ fontSize: 12, color: C.faint, ...num }}>{pct(d.users, applicants) ?? 0}%</div>
                    </div>
                  ))}
                </div>
                </div>
              )
            })()}
          </Card>
          <div className="adm-m-1col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: G.md }}>
            <DetailTable
              title={L('지원 경로', 'By source', 'Theo nguồn')}
              columns={[L('경로', 'Source', 'Nguồn'), L('건수', 'Count', 'Số lượt'), L('비중', 'Share', 'Tỷ trọng')]}
              rows={funnel.applications.bySource.map(r => [r.key, fmt(r.count), `${pct(r.count, funnel.applications.total) ?? 0}%`])}
            />
            <DetailTable
              title={L('지원 상태', 'By status', 'Theo trạng thái')}
              columns={[L('상태', 'Status', 'Trạng thái'), L('건수', 'Count', 'Số lượt'), L('비중', 'Share', 'Tỷ trọng')]}
              rows={funnel.applications.byStatus.map(r => [r.key, fmt(r.count), `${pct(r.count, funnel.applications.total) ?? 0}%`])}
            />
          </div>
          <DetailTable
            title={L('공고 출처별 지원 (real = company_self·ktc)', 'Applies by job source (real = company_self·ktc)', 'Ứng tuyển theo nguồn tin (real = company_self·ktc)')}
            columns={[L('공고 출처', 'Job source', 'Nguồn tin'), L('건수', 'Count', 'Số lượt'), L('비중', 'Share', 'Tỷ trọng')]}
            rows={(funnel.applications.byJobSource || []).map(r => [
              ['company_self', 'ktc'].includes(r.key) ? `${r.key} ✓real` : r.key,
              fmt(r.count), `${pct(r.count, funnel.applications.total) ?? 0}%`,
            ])}
          />
          <DetailTable
            left={[0, 1]}
            title={L('지원 많은 공고 Top 15', 'Top 15 jobs by applications', 'Top 15 tin có nhiều ứng tuyển')}
            columns={[L('회사 · 공고', 'Company · Job', 'Công ty · Tin tuyển dụng'), L('구분', 'Type', 'Loại'), L('지원', 'Applies', 'Ứng tuyển'), L('합격', 'Accepted', 'Trúng tuyển')]}
            rows={funnel.applications.topJobs.map(j => [
              `${j.company} · ${j.title}`,
              ['company_self', 'ktc'].includes(j.source) ? `✓ real (${j.source})` : j.source,
              fmt(j.count), fmt(j.accepted),
            ])}
          />
        </>
      )}

      {stage === 'accepted' && (
        <DetailTable
          left={[0, 1, 2, 3]}
          title={L('합격 목록 (기간 내 지원 중 accepted)', 'Accepted list (applications in range)', 'Danh sách trúng tuyển (ứng tuyển trong kỳ)')}
          columns={[L('지원일', 'Applied', 'Ngày ứng tuyển'), L('회사', 'Company', 'Công ty'), L('공고', 'Job', 'Tin tuyển dụng'), L('지원 경로', 'Source', 'Nguồn')]}
          rows={funnel.accepted.items.map(a => [a.date, a.company, a.title, a.source])}
        />
      )}

      {/* ── 행동 퍼널 (암플리튜드식 단계 선택) ── */}
      <BehaviorFunnel token={token} lang={lang} dateRange={dateRange} />
    </>
  )
}
