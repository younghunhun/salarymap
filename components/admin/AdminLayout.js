import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useT } from '../../lib/i18n'
// LIKELION Design System — 어드민 전용으로만 로드(공개 페이지엔 안 실린다). 새 화면은 @likelion-design/ui 컴포넌트로 만든다.
import '@likelion-design/ui/styles.css'

// 관리자 영역 공유 셸 — 좌측 사이드바 네비게이션(App Store Connect 스타일).
// dashboard(15탭)와 jobs(7탭)의 모든 화면을 URL(?tab=)로 묶어 "페이지처럼" 전환한다.
// 각 페이지 내부 컨텐츠/디자인은 건드리지 않고, 상단 탭바만 이 사이드바로 대체.

const ROUTE_DEFAULT = { '/admin/dashboard': 'main', '/admin/jobs': 'jobs' }

function buildNav(lang) {
  const L = (ko, en, vi) => (lang === 'vi' ? (vi ?? en) : lang === 'ko' ? ko : en)
  return [
    {
      label: 'Performance',
      items: [
        { label: L('메인 퍼널', 'Main funnel', 'Phễu chính'), pathname: '/admin/dashboard', tab: 'main' },
        { label: L('추이', 'Trend', 'Xu hướng'), pathname: '/admin/dashboard', tab: 'trend' },
        // 안 보는 탭을 메뉴에서 뺐다(10/6) — 대시보드가 무거워서. 뷰 파일과 API 는 전부 남아 있다(되살리려면 메뉴+dashboard.js 분기만 복구).
        //   1차: 리텐션·지원자·이력서   2차: 광고메일·앱 대시보드·기업·이익 지원·인재 소싱·픽디 크롤링 (URL ?tab= 직접 진입도 막힘)
        //   3차: 승주 작업실·유진 작업실(Personal 그룹). 단 승주 작업실(?tab=goals)은 메뉴에서만 숨겼다 —
        //        실험 알림 크론(lib/experimentAlerts.js ADMIN_URL)의 '실험탭 열기(롤백 스위치)' 버튼이 그 주소로 온다.
        //   상담 문의(/admin/showcasing-inquiries)는 독립 페이지라 메뉴만 뺐다 — 문의 알림(lib/notifyShowcaseInquiry.js)의 링크로는 계속 열린다.
        // 인재풀·인재 퀄리티·인재 공급을 '인재' 한 페이지로 합쳤다(10/6) — 안에서 알약으로 전환.
        { label: L('인재', 'Talent', 'Ứng viên'), pathname: '/admin/dashboard', tab: 'talent' },
        // 승주 작업실 > 콜드메일 하위 탭을 상위로 뺐다(10/2) — 작업실에서 유일하게 매일 보는 표라 두 단계 진입이 낭비.
        { label: L('콜드메일', 'Cold email', 'Email tiếp cận'), pathname: '/admin/dashboard', tab: 'coldmail' },
        // '어학 점수'는 유진 작업실 > 어학 정보 수집 안으로 옮겼다 — 캠페인 카드 바로
        // 아래에서 "그래서 무슨 점수가 들어왔나"를 이어서 보는 흐름이라 여기 두면 끊긴다.
        // /admin/lang-scores URL 은 살아 있다(명단이 길어 전체 화면으로 볼 때).
        { label: L('블랙리스트', 'Blacklist', 'Danh sách đen'), pathname: '/admin/dashboard', tab: 'blacklist' },
        { label: L('연봉 인증', 'Verifications', 'Xác minh lương'), pathname: '/admin/dashboard', tab: 'verifications' },
        { label: L('커뮤니티', 'Community', 'Cộng đồng'), pathname: '/admin/dashboard', tab: 'community' },
      ],
    },
    {
      label: L('공고', 'Jobs', 'Tin tuyển dụng'),
      items: [
        { label: L('공고 등록', 'New job', 'Đăng tin mới'), pathname: '/admin/jobs', tab: 'job-new' },
        { label: L('공고 목록', 'Jobs', 'Tin tuyển dụng'), pathname: '/admin/jobs', tab: 'jobs' },
        { label: L('KTC 랜딩 공고', 'KTC landing jobs', 'Tin landing KTC'), pathname: '/admin/jobs', tab: 'ktc-landing' },
        { label: L('캠페인 링크', 'Campaign links', 'Link chiến dịch'), pathname: '/admin/jobs', tab: 'collections' },
        { label: L('회사', 'Companies', 'Công ty'), pathname: '/admin/jobs', tab: 'companies' },
        { label: L('공고 지표', 'Job KPI', 'KPI tin đăng'), pathname: '/admin/jobs', tab: 'kpi' },
        { label: L('관리자', 'Admins', 'Quản trị viên'), pathname: '/admin/jobs', tab: 'admins' },
      ],
    },
  ]
}

// titleRight — 페이지 타이틀 오른쪽에 붙는 선택 슬롯 (예: 유진 작업실의 페이지 전환 알약).
export default function AdminLayout({ children, titleRight = null }) {
  const router = useRouter()
  const { lang: globalLang, setLang } = useT()
  const lang = globalLang === 'ko' || globalLang === 'vi' ? globalLang : 'en'
  const [open, setOpen] = useState(false)

  // 라우트/탭 이동 시 모바일 드로워 닫기
  useEffect(() => { setOpen(false) }, [router.asPath])

  const nav = buildNav(lang)
  const curTab = router.query.tab || ROUTE_DEFAULT[router.pathname]
  const isActive = (it) => router.pathname === it.pathname && curTab === it.tab
  const activeItem = nav.flatMap((g) => g.items).find(isActive)
  const contentMax = router.pathname === '/admin/jobs' ? 900 : 1200
  const contentPad = router.pathname === '/admin/jobs' ? 20 : 16

  return (
    <div className={`al-shell${open ? ' open' : ''}`}>
      <style>{`
        /* 디자인 시스템 CSS 가 :root 의 --background/--foreground 를 헥스로 덮어쓴다 — globals.css 의
           shadcn HSL 값으로 되돌려 둔다(body 안 <style> 이라 head 의 스타일시트보다 뒤에 적용). */
        :root { --background: 0 0% 100%; --foreground: 0 0% 7%; }
        .al-shell {
          display: flex; min-height: 100vh;
          font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          background: #fff; color: #1d1d1f;
        }
        .al-sidebar {
          width: 232px; flex-shrink: 0; background: #fbfbfd;
          position: sticky; top: 0; height: 100vh; overflow-y: auto;
          display: flex; flex-direction: column; padding: 18px 12px 24px;
        }
        .al-brand {
          display: flex; align-items: center; gap: 8px; padding: 4px 10px 16px;
          font-size: 16px; font-weight: 700; letter-spacing: -0.01em; color: #1d1d1f;
        }
        .al-brand-dot { width: 9px; height: 9px; border-radius: 50%; background: #ff4400; }
        .al-group { margin-bottom: 2px; }
        .al-group:not(:first-of-type) { margin-top: 16px; padding-top: 16px; border-top: 1px solid #E8E8EA; }
        .al-group-label {
          font-size: 10.5px; font-weight: 800; color: #9AA0A6; text-transform: uppercase;
          letter-spacing: 0.08em; padding: 2px 10px 9px;
        }
        .al-item {
          display: block; padding: 7px 10px; margin: 1px 0; border-radius: 7px;
          font-size: 13.5px; font-weight: 500; color: #1d1d1f; text-decoration: none;
          line-height: 1.3; transition: background 0.12s, color 0.12s; cursor: pointer;
        }
        .al-item:hover { background: #efeff2; }
        .al-item.active { background: #FFF1EC; color: #ff4400; font-weight: 600; }
        .al-main { flex: 1; min-width: 0; }
        .al-pagehead { padding: 40px 0 0; }
        .al-pagehead h1 { margin: 0; font-size: 22px; font-weight: 700; letter-spacing: -0.02em; color: #1d1d1f; }
        .al-titlerow { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
        .al-burger {
          display: none; position: fixed; top: 12px; left: 12px; z-index: 50;
          width: 40px; height: 40px; border-radius: 10px; border: 1px solid #e3e3e6;
          background: #fff; cursor: pointer; align-items: center; justify-content: center;
          box-shadow: 0 1px 4px rgba(0,0,0,0.08);
        }
        .al-burger span { display: block; width: 18px; height: 2px; background: #1d1d1f; position: relative; }
        .al-burger span::before, .al-burger span::after { content: ''; position: absolute; left: 0; width: 18px; height: 2px; background: #1d1d1f; }
        .al-burger span::before { top: -6px; } .al-burger span::after { top: 6px; }
        .al-scrim { display: none; }
        @media (max-width: 900px) {
          .al-sidebar {
            position: fixed; top: 0; left: 0; z-index: 60; transform: translateX(-100%);
            transition: transform 0.22s ease; box-shadow: 2px 0 16px rgba(0,0,0,0.12);
          }
          .al-shell.open .al-sidebar { transform: translateX(0); }
          .al-burger { display: flex; }
          .al-shell.open .al-scrim {
            display: block; position: fixed; inset: 0; z-index: 55; background: rgba(0,0,0,0.35);
          }
          .al-main { width: 100%; padding-top: 52px; }
        }
        /* ── 어드민 뷰 공용 모바일 유틸 (768px). 각 뷰가 className으로 opt-in ── */
        @media (max-width: 768px) {
          /* 그리드 접기 */
          .adm-m-1col { grid-template-columns: 1fr !important; }
          .adm-m-2col { grid-template-columns: repeat(2, 1fr) !important; }
          /* 넓은 표/블록 가로 스크롤 (잘림 방지) */
          .adm-m-scroll { overflow-x: auto !important; -webkit-overflow-scrolling: touch; }
          .adm-m-scroll > table { min-width: max-content; }
          /* 표 컬럼이 좁게 눌리지 않고 자연폭 유지 → 가로 스크롤 */
          .adm-m-nowrap th, .adm-m-nowrap td { white-space: nowrap; }
          /* 플렉스 줄바꿈 / 풀폭 컨트롤 */
          .adm-m-wrap { flex-wrap: wrap !important; }
          .adm-m-full { width: 100% !important; }
          /* 여백 축소 */
          .adm-m-tight { padding-left: 12px !important; padding-right: 12px !important; }
        }
      `}</style>

      <aside className="al-sidebar">
        <div className="al-brand"><span className="al-brand-dot" />FYI Admin</div>
        <nav>
          {nav.map((g) => (
            <div key={g.label} className="al-group">
              <div className="al-group-label">{g.label}</div>
              {g.items.map((it) => (
                <Link
                  key={it.pathname + it.tab}
                  href={{ pathname: it.pathname, query: { tab: it.tab } }}
                  className={`al-item${isActive(it) ? ' active' : ''}`}
                >
                  {it.label}
                </Link>
              ))}
            </div>
          ))}
        </nav>
        <div style={{ marginTop: 'auto', paddingTop: 16 }}>
          <a href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', marginBottom: 8, borderRadius: 8, fontSize: 13, fontWeight: 500, color: '#86868b', textDecoration: 'none', border: '1px solid #E8E8EA' }}>
            <span style={{ fontSize: 15, lineHeight: 1 }}>←</span>{lang === 'ko' ? '사이트로 돌아가기' : lang === 'vi' ? 'Về trang chính' : 'Back to site'}
          </a>
          <div style={{ display: 'flex', gap: 2, background: '#EFEFF2', borderRadius: 9, padding: 3 }}>
            {['ko', 'en', 'vi'].map((l) => (
              <button key={l} onClick={() => setLang(l)} style={{
                flex: 1, padding: '6px 0', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: 'none', whiteSpace: 'nowrap',
                background: lang === l ? '#fff' : 'transparent',
                color: lang === l ? '#1d1d1f' : '#86868b',
                boxShadow: lang === l ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
              }}>{l === 'ko' ? '한국어' : l === 'vi' ? 'VI' : 'EN'}</button>
            ))}
          </div>
        </div>
      </aside>

      <button className="al-burger" aria-label="menu" onClick={() => setOpen((v) => !v)}>
        <span />
      </button>
      <div className="al-scrim" onClick={() => setOpen(false)} />

      <main className="al-main">
        {activeItem && (
          <div className="al-pagehead">
            <div style={{ maxWidth: contentMax, margin: '0 auto', padding: `0 ${contentPad}px` }}>
              <div className="al-titlerow">
                <h1>{activeItem.label}</h1>
                {titleRight}
              </div>
            </div>
          </div>
        )}
        {children}
      </main>
    </div>
  )
}
