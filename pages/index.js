import { useEffect, useRef, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import supabaseClient from '../lib/supabaseClient';
import { useT } from '../lib/i18n';
import { track } from '../lib/track';

/* 새 메인(2026-11-10 개편). 연봉 후킹이 더는 먹히지 않아 연봉 기능(위저드·회사별 연봉)은
   /salary 탭으로 옮기고, 메인은 서비스 입구(포털)로 바꿨다 — 원티드 메인 구성 참고.
   가입 전환은 한국 기업(KTC) 공고가 로컬 공고보다 높아(10/10~11/10 비로그인 클릭→7일 내 가입
   9.9% vs 5.9%) 공고 영역은 KTC 공고만 보여 준다. */

const MW_END = new Date('2026-11-19T23:59:59+07:00'); // 11월 매칭위크(호치민) — 지나면 소식 배너·공고 배지 자동 숨김

// 연봉 광고(메타 fyi_lead / underpaid 소재)는 연봉 탭으로 바로 보낸다 — 광고 문구와 착지가 맞아야 한다.
const isSalaryAd = (q) => q.get('utm_campaign') === 'fyi_lead' || /underpaid|salary|luong/i.test(q.get('utm_content') || '');

export async function getStaticProps() {
  let jobs = [];
  try {
    const { fetchKtcJobs } = await import('../lib/ktcJobs');
    jobs = (await fetchKtcJobs()).map((j) => ({
      id: j.id, title: j.title || '', company: j.company || '', logo: j.companyLogo || null,
      location: j.location || null, workType: j.workType || null, isMatchingWeek: !!j.isMatchingWeek,
      experience: j.experience || null,
    }));
  } catch (e) {
    console.error('home: ktc jobs', e);
  }
  const byCo = new Map();
  for (const j of jobs) {
    if (!j.company) continue;
    const c = byCo.get(j.company) || { name: j.company, logo: null, count: 0 };
    c.count += 1;
    if (!c.logo && j.logo) c.logo = j.logo;
    byCo.set(j.company, c);
  }
  const companies = [...byCo.values()].sort((a, b) => (b.count - a.count) || (!!b.logo - !!a.logo)).slice(0, 15);
  // 매칭위크 노출 여부는 서버에서 정해 내려 준다(클라이언트에서 날짜를 다시 재면 하이드레이션이 어긋난다)
  return { props: { jobs: jobs.filter((j) => j.logo).slice(0, 10), /* 로고 있는 공고만(기본 사무실 사진 카드는 뺀다), created_at 최신순 유지 */ companies, mwOn: Date.now() <= MW_END.getTime() }, revalidate: 300 };
}

const ICONS = {
  jobs: <path d="M3 8a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V8zM8 6V5a2 2 0 012-2h4a2 2 0 012 2v1" />,
  kcompany: <><path d="M3 21h18M5 21V8l7-4 7 4v13" /><path d="M9 21v-5h6v5M9 11h.01M15 11h.01" /></>,
  cv: <><path d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8l-5-5z" /><path d="M14 3v5h5M9 13h6M9 17h4" /></>,
  applications: <><path d="M9 11l3 3 8-8" /><path d="M20 12v7a2 2 0 01-2 2H6a2 2 0 01-2-2V5a2 2 0 012-2h9" /></>,
  saved: <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2v16z" />,
  salary: <><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></>,
  community: <path d="M21 11.5a8.4 8.4 0 01-9 8.5 8.4 8.4 0 01-3.8-.9L3 21l1.9-5.2A8.4 8.4 0 0112 3a8.4 8.4 0 019 8.5z" />,
  forCompanies: <><circle cx="9" cy="8" r="4" /><path d="M2 21v-1a6 6 0 0112 0v1M16 3.1a4 4 0 010 7.8M22 21v-1a6 6 0 00-4-5.7" /></>,
  app: <><rect x="6" y="2" width="12" height="20" rx="2.5" /><path d="M11 18h2" /></>,
};

// 각 아이콘 타일 색 — 흰 배경에서 서비스별로 구분되도록 채도 있는 톤으로
const QUICK = [
  { key: 'jobs', href: '/jobs', color: '#3b82f6' },
  { key: 'kcompany', href: '/ktc', color: '#ff6000' },
  { key: 'cv', href: '/profile', color: '#22c55e', login: true },
  { key: 'applications', href: '/my-applications', color: '#a855f7', login: true },
  { key: 'saved', href: '/saved-jobs', color: '#eab308', login: true },
  { key: 'salary', href: '/salary', color: '#14b8a6' },
  { key: 'community', href: '/community', color: '#ec4899' },
  { key: 'forCompanies', href: '/for-companies', color: '#64748b' },
  { key: 'app', href: '/app', color: '#f97316' },
];

function Logo({ src, name, size }) {
  return (
    <div className="mh-logo" style={{ width: size, height: size }}>
      {src ? <img src={src} alt={name} loading="lazy" /> : <span>{(name || '?').trim().charAt(0).toUpperCase()}</span>}
    </div>
  );
}

function Rail({ title, seeAll, children }) {
  const ref = useRef(null);
  const [edge, setEdge] = useState({ start: true, end: false });
  const scroll = (dir) => ref.current?.scrollBy({ left: dir * ref.current.clientWidth * 0.9, behavior: 'smooth' });
  // 양 끝에 닿으면 해당 방향 화살표를 흐리게 — 더 넘길 게 없다는 걸 보여 준다
  const onScroll = () => {
    const el = ref.current; if (!el) return;
    setEdge({ start: el.scrollLeft <= 2, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 2 });
  };
  useEffect(() => { onScroll(); }, []);
  const chev = (d) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>;
  return (
    <section className="mh-sec">
      <div className="mh-sec-head">
        <h2>{title}</h2>
        <div className="mh-sec-tools">
          {seeAll}
          <button className="mh-arrow" aria-label="prev" disabled={edge.start} onClick={() => scroll(-1)}>{chev('M15 18l-6-6 6-6')}</button>
          <button className="mh-arrow" aria-label="next" disabled={edge.end} onClick={() => scroll(1)}>{chev('M9 18l6-6-6-6')}</button>
        </div>
      </div>
      <div className="mh-rail" ref={ref} onScroll={onScroll}>{children}</div>
    </section>
  );
}

export default function Home({ jobs, companies, mwOn }) {
  const { t } = useT();
  const router = useRouter();

  // 상단 롤링 배너 — 한 문구만 두면 눈에 안 띄어 이력서 관련 문구를 번갈아 보여 준다(아이콘·링크는 하나, 마우스 올리면 멈춤).
  // 모두 실제 기능: AI 파싱(api/profile/parse-resume) · 저장 이력서로 원탭 지원(QuickApplyJobList·KtcApply) · 등록자 대상 공고 추천 메일
  const pills = ['cv', 'cvApply', 'cvRecommend'];
  const [loggedIn, setLoggedIn] = useState(false);
  const [pillIdx, setPillIdx] = useState(0);
  const [pillPaused, setPillPaused] = useState(false);
  useEffect(() => {
    if (pillPaused || pills.length < 2) return;
    const id = setInterval(() => setPillIdx((i) => (i + 1) % pills.length), 3500);
    return () => clearInterval(id);
  }, [pillPaused, pills.length]);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    if (isSalaryAd(q)) { router.replace('/salary' + window.location.search); return; }

    // 유입 계측. 'landing' 은 연봉 퍼널(어드민 main-funnel: 홈 진입→위저드) 첫 단계라 /salary 에만 남기고,
    // 새 메인은 별도 이벤트로 쏜다 — 섞으면 위저드 시작률이 메인 방문자 기준으로 떨어져 보인다.
    const meta = {
      utm_source: q.get('utm_source'), utm_medium: q.get('utm_medium'),
      utm_campaign: q.get('utm_campaign'), utm_content: q.get('utm_content'),
      referrer: document.referrer || null,
    };
    track('main_landing', { page: '/', meta });
    if (meta.utm_source) track('page_view', { page: '/', meta });

    // OAuth 콜백 기본 착지(/?login=success) 정리 + 제공자가 복귀 경로를 잃고 홈으로 떨군 경우 되돌리기
    if (q.get('login') === 'success') window.history.replaceState({}, '', '/');
    const { data: { subscription } } = supabaseClient.auth.onAuthStateChange((event, session) => {
      setLoggedIn(!!session); // INITIAL_SESSION 포함 — 공고 둘째 줄 잠금 여부
      if (event !== 'SIGNED_IN') return;
      const ret = localStorage.getItem('fyi_login_return');
      if (ret && ret.split('?')[0].split('#')[0] !== '/') {
        localStorage.removeItem('fyi_login_return');
        window.location.href = ret;
      }
    });
    return () => subscription.unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 로그인이 필요한 메뉴는 비로그인이면 로그인부터 — 해당 페이지들은 세션이 없으면 홈으로 튕긴다.
  const onQuick = async (e, item) => {
    track('main_quick_click', { meta: { key: item.key }, page: '/' });
    if (!item.login) return;
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (session) return;
    e.preventDefault();
    try { localStorage.setItem('fyi_login_return', item.href); } catch {}
    router.push('/login?return=' + encodeURIComponent(item.href));
  };

  const news = [
    mwOn && { key: 'mw', href: '/matching-week', upcoming: true, bg: 'linear-gradient(180deg, rgba(0,0,0,0) 35%, rgba(0,0,0,0.72) 100%), url(/main/matching-week.jpg) center/cover' }, // 사진: 매칭위크 1:1 현장 면접 장면(아래쪽 어둡게 깔아 글자 대비 확보)
    { key: 'office', href: '/ktc#about', bg: 'linear-gradient(180deg, rgba(0,0,0,0) 35%, rgba(0,0,0,0.72) 100%), url(/main/ktc-office.jpg) center/cover' }, // 사진: KTC 오피스(COBI work) 내부
    // 지난 행사 소식 — 넘어갈 페이지가 없어 링크 없이 hover 모션만 준다
    { key: 'connect', bg: 'linear-gradient(180deg, rgba(0,0,0,0) 35%, rgba(0,0,0,0.72) 100%), url(/main/connect-day.jpg) center/cover' },
    { key: 'mayHack', bg: 'linear-gradient(180deg, rgba(0,0,0,0) 35%, rgba(0,0,0,0.72) 100%), url(/main/may-matching-week.jpg) center/cover' }, // 5월 매칭위크 현장 사진(MCW 1905 5)
  ].filter(Boolean);

  return (
    <>
      <Head>
        <title>{t('main.metaTitle')}</title>
        <meta name="description" content={t('main.metaDesc')} />
        <meta property="og:title" content={t('main.metaTitle')} />
        <meta property="og:description" content={t('main.metaDesc')} />
        <meta property="og:url" content="https://salary-fyi.com" />
        <link rel="canonical" href="https://salary-fyi.com" />
      </Head>

      <div className="mh">
        <div className="mh-wrap">
          <div className="mh-pill-row">
            {/* ai_cv 실제 기능 = 이력서 업로드 → AI 파싱으로 프로필 자동 완성(api/profile/parse-resume). 문장 첨삭 기능은 없으니 '다듬기'로 쓰지 말 것 */}
            <Link href="/profile" className="mh-pill"
              onMouseEnter={() => setPillPaused(true)} onMouseLeave={() => setPillPaused(false)}
              onClick={(e) => { track('main_pill_click', { meta: { kind: 'ai_cv', copy: pills[pillIdx] }, page: '/' }); onQuick(e, { key: 'pill_cv', href: '/profile', login: true }); }}>
              <img className="mh-pill-ico" src="/korean-cv/upload.png" alt="" aria-hidden="true" />
              {/* 문구를 한 칸에 겹쳐 두고 현재 것만 보이게 — 버튼 폭이 가장 긴 문구에 맞춰 고정돼 문구가 바뀌어도 출렁이지 않는다 */}
              <span className="mh-pill-stack">
                {pills.map((k, i) => (
                  <span key={i === pillIdx ? 'on' + pillIdx : k} className={'mh-pill-text' + (i === pillIdx ? ' on' : '')} aria-hidden={i !== pillIdx}>{t('main.pill.' + k)}</span>
                ))}
              </span>
            </Link>
          </div>

          <nav className="mh-quick">
            {QUICK.map((it) => (
              <Link key={it.key} href={it.href} className="mh-q" onClick={(e) => onQuick(e, it)}>
                <span className="mh-q-ico" style={{ background: it.color + '1a', color: it.color }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{ICONS[it.key]}</svg>
                </span>
                <span className="mh-q-label">{t('main.q.' + it.key)}</span>
              </Link>
            ))}
          </nav>

          {companies.length > 0 && (
            <Rail title={t('main.companies.title')} seeAll={<Link href="/ktc#jobs" className="mh-all">{t('main.seeAll')}</Link>}>
              {companies.map((c) => (
                <Link key={c.name} href={`/jobs?company=${encodeURIComponent(c.name)}`} className="mh-co"
                  onClick={() => track('main_company_click', { meta: { company: c.name }, page: '/' })}>
                  <Logo src={c.logo} name={c.name} size={52} />
                  <div className="mh-co-name">{c.name}</div>
                  <div className="mh-co-count">{t('main.companies.count', { n: c.count })}</div>
                </Link>
              ))}
            </Rail>
          )}

          <Rail title={t('main.news.title')}>
            {news.map((n) => (
              n.href ? (
                <Link key={n.key} href={n.href} className="mh-news"
                  onClick={() => track('main_news_click', { meta: { key: n.key }, page: '/' })}>
                  <span className="mh-news-bg" style={{ background: n.bg }} aria-hidden="true" />
                  <div className="mh-news-title">{t(`main.news.${n.key}.title`)}{n.upcoming && <span className="mh-news-chip">Upcoming</span>}</div>
                  <div className="mh-news-sub">{t(`main.news.${n.key}.sub`)}</div>
                </Link>
              ) : (
                <div key={n.key} className="mh-news">
                  <span className="mh-news-bg" style={{ background: n.bg }} aria-hidden="true" />
                  <div className="mh-news-title">{t(`main.news.${n.key}.title`)}{n.upcoming && <span className="mh-news-chip">Upcoming</span>}</div>
                  <div className="mh-news-sub">{t(`main.news.${n.key}.sub`)}</div>
                </div>
              )
            ))}
          </Rail>

          <section className="mh-sec">
            <div className="mh-sec-head">
              <h2>{t('main.jobs.title')}</h2>
              <Link href="/ktc#jobs" className="mh-all">{t('main.seeAll')}</Link>
            </div>
            {jobs.length === 0 ? <p className="mh-empty">{t('main.empty')}</p> : (() => {
              /* /jobs 공고 카드(JobCard)와 같은 디자인 — 썸네일(로고 60%) + 제목·회사·경력·지역(메인은 연봉 미노출) */
              const card = (j, locked) => (
                <Link key={j.id} href={`/jobs/${j.id}`} className="mjc" tabIndex={locked ? -1 : undefined}
                  onClick={() => track('click_job_card', { meta: { jobId: j.id, title: j.title, company: j.company, via: 'main' }, page: '/' })}>
                  <div className="mjc-img">
                    <div className="mjc-img-in" style={{ background: `#fff url(${j.logo}) center/60% no-repeat` }}>
                      {j.isMatchingWeek && mwOn && <div className="mjc-badge">Matching Week</div>}
                    </div>
                  </div>
                  <div className="mjc-t">{j.title}</div>
                  <div className="mjc-co">{j.company}</div>
                  <div className="mjc-m">{[j.experience, j.location].filter(Boolean).join(' · ')}</div>
                </Link>
              );
              if (loggedIn || jobs.length <= 5) return <div className="mh-jobs">{jobs.map((j) => card(j))}</div>;
              // 비로그인: 첫 줄만 보여 주고 둘째 줄은 블러 + 로그인 유도(원티드 '요즘 뜨는 포지션' 참고)
              return (
                <>
                  <div className="mh-jobs mh-jobs-open">{jobs.slice(0, 5).map((j) => card(j))}</div>
                  <div className="mh-lock">
                    <div className="mh-jobs mh-lock-blur" aria-hidden="true">{jobs.slice(5).map((j) => card(j, true))}</div>
                    <div className="mh-lock-cta">
                      <div className="mh-lock-title">{t('main.lock.title')}</div>
                      <div className="mh-lock-sub">{t('main.lock.sub')}</div>
                      <Link href="/login?return=%2F" className="mh-lock-btn"
                        onClick={() => { track('main_jobs_lock_click', { page: '/' }); try { localStorage.setItem('fyi_login_return', '/'); } catch {} }}>
                        {t('main.lock.cta')}
                      </Link>
                    </div>
                  </div>
                </>
              );
            })()}
          </section>
        </div>
      </div>

      <style jsx global>{`
        .mh { background: #ffffff; color: #171717; min-height: 100%; } /* 글꼴은 body(ko·en Pretendard, vi Be Vietnam Pro)를 따른다 — Barlow 는 이 페이지에서 로드되지 않아 베트남어 성조가 깨졌다 */
        .mh-wrap { width: 90%; max-width: 1400px; margin: 0 auto; padding: 64px 0 24px; } /* /jobs(.jw)와 같은 폭 */
        .mh-pill-row { display: flex; justify-content: center; }
        .mh-pill { display: inline-flex; align-items: center; gap: 14px; max-width: 100%; overflow: hidden; padding: 12px 22px 12px 16px; border-radius: 20px; border: 1px solid #ffd2b3; background: #fff4ec; color: #171717; font-weight: 600; font-size: 16px; line-height: 1.4; text-decoration: none; transition: background .15s; }
        .mh-pill:hover { background: #ffe8d9; }
        .mh-pill-stack { display: grid; min-width: 0; }
        .mh-pill-text { grid-area: 1 / 1; visibility: hidden; }
        .mh-pill-text.on { visibility: visible; animation: mh-roll .45s cubic-bezier(.2,.8,.2,1); } /* 문구가 바뀔 때마다 아래에서 올라온다 */
        @keyframes mh-roll { from { opacity: 0; transform: translateY(60%); } to { opacity: 1; transform: none; } }
        @media (prefers-reduced-motion: reduce) { .mh-pill-text.on { animation: none; } }
        .mh-pill-ico { width: 52px; height: 52px; object-fit: contain; flex: none; } /* 이력서 업로드 3D 아이콘(korean-cv 랜딩 에셋 재사용) */
        .mh-quick { display: grid; grid-template-columns: repeat(9, 1fr); gap: 4px; max-width: 1000px; margin: 52px auto 16px; } /* 1400 폭에 9칸을 펴면 간격이 벌어져 보여 가운데로 모은다 */
        .mh-q { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 10px 4px; border-radius: 16px; text-decoration: none; color: #52525b; transition: color .15s; }
        .mh-q:hover { color: #171717; }
        .mh-q-ico { width: 64px; height: 64px; border-radius: 20px; display: flex; align-items: center; justify-content: center; transition: transform .15s; }
        .mh-q:hover .mh-q-ico { transform: translateY(-2px); }
        .mh-q-ico svg { width: 30px; height: 30px; }
        .mh-q-label { font-size: 14px; font-weight: 600; text-align: center; line-height: 1.25; word-break: keep-all; }
        .mh-sec { margin-top: 44px; }
        .mh-sec-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 16px; }
        .mh-sec-head h2 { font-size: 21px; font-weight: 700; margin: 0; letter-spacing: -0.2px; }
        .mh-sec-tools { display: flex; align-items: center; gap: 8px; }
        .mh-all { font-size: 13px; color: #71717a; text-decoration: none; margin-right: 6px; white-space: nowrap; }
        .mh-all:hover { color: #171717; }
        .mh-arrow { width: 36px; height: 36px; border-radius: 50%; border: 1px solid #e4e4e7; background: #fff; color: #27272a; display: inline-flex; align-items: center; justify-content: center; padding: 0; cursor: pointer; box-shadow: 0 1px 3px rgba(0,0,0,0.06); transition: background .15s, border-color .15s, color .15s; }
        .mh-arrow:hover:not(:disabled) { background: #f4f4f5; border-color: #d4d4d8; }
        .mh-arrow:disabled { color: #c4c4cc; box-shadow: none; cursor: default; }
        .mh-rail { display: flex; gap: 14px; overflow-x: auto; scroll-snap-type: x mandatory; scrollbar-width: none; padding: 6px 0 20px; margin: -6px 0 -18px; } /* 가로 스크롤 영역은 세로로 넘친 부분도 잘라서, hover 시 위로 뜨는 카드 윗선·그림자가 가려진다 → 여유를 주고 같은 만큼 margin 으로 상쇄 */
        .mh-rail::-webkit-scrollbar { display: none; }
        .mh-co { flex: 0 0 calc((100% - 56px) / 5); scroll-snap-align: start; min-width: 0; padding: 20px 18px; border-radius: 16px; background: #fff; border: 1px solid #e4e4e7; box-shadow: 0 1px 2px rgba(0,0,0,0.04); text-decoration: none; color: inherit; transition: border-color .15s, transform .15s, box-shadow .15s; }
        .mh-co:hover { border-color: #ffb27f; box-shadow: 0 6px 18px rgba(0,0,0,0.07); transform: translateY(-2px); }
        .mh-logo { border-radius: 12px; background: #fff; border: 1px solid #ececef; display: flex; align-items: center; justify-content: center; overflow: hidden; flex: none; }
        .mh-logo img { width: 100%; height: 100%; object-fit: contain; padding: 6px; }
        .mh-logo span { color: #52525b; font-weight: 800; font-size: 18px; }
        .mh-co-name { margin-top: 14px; font-size: 15px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .mh-co-count { margin-top: 4px; font-size: 13px; color: #e85600; font-weight: 500; }
        .mh-news { flex: 0 0 calc((100% - 28px) / 3); scroll-snap-align: start; min-width: 0; aspect-ratio: 3 / 2; border-radius: 18px; padding: 24px; display: flex; flex-direction: column; justify-content: flex-end; text-decoration: none; color: #fff; position: relative; overflow: hidden; transition: transform .15s; }
        .mh-news:hover { transform: translateY(-2px); }
        /* 배경을 안쪽 레이어로 분리해 hover 시 사진만 천천히 확대(카드 테두리는 그대로) */
        .mh-news-bg { position: absolute; inset: 0; transition: transform .6s cubic-bezier(.2,.8,.2,1); }
        .mh-news:hover .mh-news-bg { transform: scale(1.06); }
        /* 앞으로 열릴 행사 표시(제목 옆) — 지난 행사 카드와 한눈에 구분되게 진한 주황 */
        .mh-news-chip { display: inline-block; margin-left: 8px; vertical-align: 4px; padding: 2px 7px; border-radius: 5px; background: #ff6000; color: #fff; font-size: 10px; font-weight: 800; line-height: 1.4; letter-spacing: 0.5px; text-shadow: none; text-transform: uppercase; box-shadow: 0 2px 8px rgba(255,96,0,0.45); animation: mh-chip 2.2s ease-in-out infinite; }
        @keyframes mh-chip { 0%, 100% { box-shadow: 0 2px 8px rgba(255,96,0,0.45); } 50% { box-shadow: 0 2px 14px rgba(255,96,0,0.85); } }
        @media (prefers-reduced-motion: reduce) { .mh-news-chip { animation: none; } }
        .mh-news-title { font-size: 21px; font-weight: 700; line-height: 1.3; }
        .mh-news-sub { margin-top: 6px; font-size: 14px; opacity: 0.92; }
        .mh-news-title, .mh-news-sub { position: relative; text-shadow: 0 1px 2px rgba(0,0,0,0.35), 0 2px 14px rgba(0,0,0,0.28); } /* 사진·그라디언트 위 흰 글자 가독성 */
        /* 공고 카드 — pages/jobs.js .jg/.jc 와 같은 값 */
        .mh-jobs { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 24px; }
        @media (max-width: 900px) { .mh-jobs { grid-template-columns: repeat(2, minmax(0, 1fr)); } } /* 공고 10개를 항상 꽉 채우도록 5열 → 2열만 쓴다 */
        .mh-jobs-open { margin-bottom: 56px; } /* 공개 줄과 블러 줄 사이를 띄워 잠금 영역이 따로 읽히게 */
        .mh-lock { position: relative; }
        .mh-lock-blur { filter: blur(9px); opacity: 0.7; pointer-events: none; user-select: none; -webkit-mask-image: radial-gradient(ellipse 70% 90% at 50% 40%, #000 30%, transparent 85%); mask-image: radial-gradient(ellipse 70% 90% at 50% 40%, #000 30%, transparent 85%); }
        .mh-lock::after { content: ''; position: absolute; inset: -8px -8px -2px; pointer-events: none; background: linear-gradient(180deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.7) 45%, #fff 85%); } /* 아래로 갈수록 흰색으로 덮는다 */
        .mh-lock-cta { position: absolute; inset: 0; z-index: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 0 16px; }
        .mh-lock-title { font-size: 20px; font-weight: 700; color: #171717; }
        .mh-lock-sub { margin-top: 6px; font-size: 14px; color: #52525b; }
        .mh-lock-btn { margin-top: 22px; display: inline-flex; align-items: center; justify-content: center; min-width: 220px; height: 48px; padding: 0 28px; border-radius: 12px; background: #ff6000; color: #fff; font-size: 15px; font-weight: 700; text-decoration: none; box-shadow: 0 6px 18px rgba(255,96,0,0.28); transition: background .15s; }
        .mh-lock-btn:hover { background: #e85600; }
        @media (max-width: 900px) { .mh-jobs-open .mjc:nth-child(5) { display: none; } .mh-lock-blur .mjc:nth-child(n+3) { display: none; } } /* 2열에선 2줄 공개 + 1줄 블러 */
        .mjc { display: flex; flex-direction: column; min-width: 0; text-decoration: none; color: inherit; }
        .mjc-img { border-radius: 8px; overflow: hidden; position: relative; padding-top: 56%; margin-bottom: 9px; background: #f0f0f0; border: 1px solid rgba(0,0,0,0.06); }
        .mjc-img-in { position: absolute; inset: 0; transition: transform .25s ease; }
        .mjc:hover .mjc-img-in { transform: scale(1.04); }
        .mjc-badge { position: absolute; top: 10px; left: 10px; background: #ff4400; color: #fff; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 4px; }
        .mjc-t { font-size: 16px; font-weight: 600; color: #111; margin-bottom: 3px; line-height: 1.35; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; min-height: 2.7em; } /* 제목이 1줄이어도 2줄 높이를 잡아 회사명·지역 줄이 카드끼리 맞는다 */
        .mjc-co { font-size: 13.5px; color: #777; margin-bottom: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .mjc-m { margin-top: 5px; font-size: 12px; color: #999; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .mh-empty { color: #71717a; font-size: 14px; }
        @media (max-width: 1024px) {
          .mh-quick { grid-template-columns: repeat(5, 1fr); row-gap: 4px; }
          .mh-co { flex-basis: calc((100% - 28px) / 3); }
          .mh-news { flex-basis: calc((100% - 14px) / 2); }
        }
        @media (max-width: 640px) {
          .mh-wrap { padding-top: 32px; }
          .mh-pill { font-size: 14px; gap: 10px; padding: 10px 14px 10px 12px; border-radius: 16px; }
          .mh-pill-ico { width: 42px; height: 42px; }
          .mh-quick { grid-template-columns: repeat(3, 1fr); margin-top: 32px; }
          .mh-q-ico { width: 56px; height: 56px; border-radius: 18px; }
          .mh-q-ico svg { width: 26px; height: 26px; }
          .mh-q-label { font-size: 13px; }
          .mh-sec { margin-top: 34px; }
          .mh-sec-head h2 { font-size: 18px; }
          .mh-arrow { display: none; }
          .mh-co { flex-basis: 42%; padding: 16px 14px; }
          .mh-news { flex-basis: 82%; padding: 20px; }
          .mh-news-title { font-size: 18px; }
          .mh-jobs { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
        }
      `}</style>
    </>
  );
}
