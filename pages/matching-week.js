import { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useT } from '../lib/i18n';
import { track } from '../lib/track';
import Reveal from '../components/ktc/Reveal';

/* 11/19 호치민 매칭위크 참가 기업 공고 모음 — 후보자에게 공유하는 링크(엠마 요청 2026-11-12).
   참가 공고는 jobs.raw_payload.ktc.is_matching_week 플래그로 고른다(메인 카드 배지와 같은 기준).
   현장 워크인을 막기 위해 '서류 통과자만 초대' 문구를 꼭 둔다. */

const EVENT_AT = new Date('2026-11-19T00:00:00+07:00');

/* 오시는 길 — 행사장은 코비홈(시내에서 멀다), COBI Tower 2 에서 셔틀 운영.
   주소·출발 시각(08:30·13:00)·복귀 방식은 엠마 팀 시트 7번 'Organizer support'(2026-11-12) 원문 그대로.
   지도는 API 키 없는 구글맵 임베드(q=좌표). */
const VENUE = {
  videoUrl: 'https://www.facebook.com/share/r/1ELuypGcCw/',
  departures: ['08:30', '13:00'],
  mapEmbed: 'https://maps.google.com/maps?q=10.6321154,106.7180673&z=12&hl=vi&output=embed',
  shuttle: { name: 'COBI Tower 2', address: '2-4 Street No. 8, Tan My Ward, Ho Chi Minh City', url: 'https://www.google.com/maps/place/COBI+TOWER+2/@10.7306545,106.7245815,17z/data=!4m6!3m5!1s0x317525f46b232607:0x784e860aec9c7081!8m2!3d10.7306545!4d106.7245815!16s%2Fg%2F11s58_cv1n' },
  venue: { name: 'COBI Home', address: 'Lot DV-4, Central Road, Industrial Park, Can Giuoc, Tay Ninh', url: 'https://www.google.com/maps/place/%EC%BD%94%EB%B9%84%ED%99%88/@10.6321154,106.7180673,15z/data=!4m6!3m5!1s0x317531812261a6cb:0x80259ac04d320ae6!8m2!3d10.6321154!4d106.7180673!16s%2Fg%2F11lfcth5f9' },
};

const Pin = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 21s-7-6.2-7-11.5A7 7 0 0119 9.5C19 14.8 12 21 12 21z" /><circle cx="12" cy="9.5" r="2.5" /></svg>;
const Bus = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="4" y="3" width="16" height="15" rx="3" /><path d="M4 11h16M8 18v2M16 18v2" /><circle cx="8" cy="14.5" r=".8" fill="currentColor" /><circle cx="16" cy="14.5" r=".8" fill="currentColor" /></svg>;

const ORGS = [
  { src: '/ktc/mss.svg', h: 30, alt: 'Ministry of SMEs and Startups' },
  { src: '/ktc/kosme.svg', h: 30, alt: 'KOSME' },
  { src: '/ktc/likelion.svg', h: 30, alt: 'LIKELION' },
  { src: '/ktc/jobkorea.png', h: 18, alt: 'JobKorea' },
];

// 다크 섹션 하단에 흐르는 사진 띠
const MARQUEE = [
  ...[2, 5, 8, 10, 1].map((n) => `/matching-week/sep-${n}.jpg`),
  ...[1, 3, 7].map((n) => `/matching-week/jul-${n}.jpg`),
  ...[3, 5, 9, 1].map((n) => `/matching-week/trip-${n}.jpg`),
  ...[1, 3, 5, 7, 9].map((n) => `/matching-week/may-${n}.jpg`),
  ...[4, 9].map((n) => `/matching-week/kmajor-${n}.jpg`),
];

/* 행사·프로그램 앨범 — 엠마 팀 드라이브 폴더(Matching Month Page 시트 5·6번)에서 받아
   1400px 로 줄여 public/matching-week 에 둔다. photos 가 비어 있으면 카드에 '사진 곧 업데이트'가 뜨고 안 열린다.
   폴더: May 1tEQ1hcgW0H3OfS3ytYKZKLGeuS2voesn · July 1t9hogYQRY5fUkhKBDsiGLWfgD2fqTBlh · Sep 1eYyW41Jj8ciPzx4u8nnSn-TSCWvTVzp5
         K-Major 1C-JzQRTyGko5Ox7XegyRgz_xDFriHWCH · Korean Trip 1Lfi5cPnDkPSpDazM7Fx9K_yDiDxJCNzT */
// 히어로 배경 슬라이드 — 사람이 많이 나온 사진 위주(행사 규모·신뢰감). 드라이브 원본에서 2400px 로 받은 고해상도본.
// 5월 시상 단체 · 서울 Connect Day 단체(Insight Trip) · 9월 VKU 시상 단체 · 9월 VKU 대강당 · 7월 해커톤 우승팀 · 5월 1:1 면접. pos 는 얼굴이 잘 보이는 세로 위치
const HERO_SLIDES = [
  { src: '/matching-week/hero-1.jpg', pos: 'center 72%' },
  { src: '/matching-week/hero-6.jpg', pos: 'center 60%' },
  { src: '/matching-week/hero-5.jpg', pos: 'center 62%' },
  { src: '/matching-week/hero-7.jpg', pos: 'center 55%' },
  { src: '/matching-week/hero-3.jpg', pos: 'center 62%' },
  { src: '/matching-week/hero-4.jpg', pos: 'center 50%' },
];

const range = (prefix, n) => Array.from({ length: n }, (_, i) => `/matching-week/${prefix}-${i + 1}.jpg`);
const EVENTS = [
  { key: 'may', m: '05', cover: '/matching-week/may-4.jpg', photos: range('may', 10) },
  { key: 'jul', m: '07', cover: '/matching-week/jul-2.jpg', photos: range('jul', 8) },
  { key: 'sep', m: '09', cover: '/matching-week/sep-9.jpg', photos: range('sep', 10) },
  { key: 'nov', m: '11', next: true, photos: [] },
];
const PROGRAMS = [
  { key: 'kmajor', cover: '/matching-week/kmajor-10.jpg', photos: range('kmajor', 10) },
  { key: 'trip', cover: '/matching-week/trip-8.jpg', photos: range('trip', 10) },
];
const ALBUMS = [...EVENTS, ...PROGRAMS].filter((a) => a.photos.length > 0); // 갤러리 탭(사진 있는 앨범만)

export async function getStaticProps() {
  let jobs = [];
  try {
    const { fetchKtcJobs } = await import('../lib/ktcJobs');
    jobs = (await fetchKtcJobs()).filter((j) => j.isMatchingWeek).map((j) => ({
      id: j.id, title: j.title || '', company: j.company || '', logo: j.companyLogo || null,
      location: j.location || null, experience: j.experience || null, group: j.group, website: j.companyWebsite || null,
    }));
  } catch (e) {
    console.error('matching-week: ktc jobs', e);
  }
  // 회사별로 묶고, 공고 많은 회사 먼저. 같은 회사가 'D3'·'D3 Company'처럼 표기가 갈려 있어 뒤의 Company 는 떼고 묶는다
  const byCo = new Map();
  for (const j of jobs) {
    const key = j.company.replace(/\s+company$/i, '').toLowerCase();
    const g = byCo.get(key) || { name: j.company, logo: null, website: null, jobs: [] };
    g.jobs.push(j);
    if (j.company.length > g.name.length) g.name = j.company;
    if (!g.logo && j.logo) g.logo = j.logo;
    if (!g.website && j.website) g.website = j.website;
    byCo.set(key, g);
  }
  const companies = [...byCo.values()].sort((a, b) => b.jobs.length - a.jobs.length || a.name.localeCompare(b.name));
  // D-day 는 서버에서 계산해 내려 준다(클라이언트에서 다시 재면 하이드레이션이 어긋난다). revalidate 5분이라 날짜는 맞게 넘어간다
  const daysLeft = Math.max(0, Math.ceil((EVENT_AT.getTime() - Date.now()) / 86400000));
  return { props: { companies, total: jobs.length, daysLeft }, revalidate: 300 };
}

const FILTERS = ['all', 'IT', 'Non-IT'];

function Logo({ c, size }) {
  return (
    <div className="mw-logo" style={{ width: size, height: size }}>
      {c.logo ? <img src={c.logo} alt={c.name} loading="lazy" /> : <span>{c.name.trim().charAt(0).toUpperCase()}</span>}
    </div>
  );
}

const Arrow = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 18l6-6-6-6" /></svg>;

export default function MatchingWeek({ companies, total, daysLeft }) {
  const { t } = useT();
  const [copied, setCopied] = useState(false);
  const [slide, setSlide] = useState(0);

  // 히어로 사진 5초마다 교차 페이드(모션 줄이기 설정이면 첫 장 고정)
  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const id = setInterval(() => setSlide((i) => (i + 1) % HERO_SLIDES.length), 5000);
    return () => clearInterval(id);
  }, []);
  const [filter, setFilter] = useState('all');
  const [open, setOpen] = useState(null); // 공고 팝업을 띄운 회사(필터 적용된 공고만 들고 있다)
  // 사진 갤러리(숙소 예약 사이트식): 탭 + 3열 그리드 모달 → 사진을 누르면 크게 보기(view = 현재 탭 사진 인덱스)
  const [gallery, setGallery] = useState(null); // 선택된 탭 key('all' | 앨범 key)
  const [view, setView] = useState(null);

  // 팝업·라이트박스가 떠 있는 동안 뒤 페이지 스크롤 잠금 + Esc 로 닫기(라이트박스는 ←/→ 로 넘김)
  useEffect(() => {
    if (!open && !gallery) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => {
      if (e.key === 'Escape') { if (view !== null) setView(null); else { setOpen(null); setGallery(null); } }
      if (view !== null && e.key === 'ArrowRight') step(1);
      if (view !== null && e.key === 'ArrowLeft') step(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, gallery, view]);

  const albumTitle = (a) => (a.m ? t(`mw.past.${a.key}`) : t(`mw.prog.${a.key}.title`));
  const tabPhotos = !gallery ? [] : gallery === 'all' ? ALBUMS.flatMap((a) => a.photos) : (ALBUMS.find((a) => a.key === gallery)?.photos || []);
  const tabTitle = !gallery ? '' : gallery === 'all' ? t('mw.album.all') : albumTitle(ALBUMS.find((a) => a.key === gallery) || {});
  const step = (d) => setView((i) => (i === null ? i : (i + d + tabPhotos.length) % tabPhotos.length));
  const openAlbum = (a) => {
    if (!a.photos.length) return;
    setGallery(a.key); setView(null);
    track('mw_album_open', { meta: { album: a.key }, page: '/matching-week' });
  };

  // 앨범 카드 — 사진이 있으면 표지 + 장수, 없으면 월 숫자 플레이스홀더
  const AlbumCard = ({ a, title, desc, big }) => {
    const has = a.photos.length > 0;
    const status = a.next ? t('mw.past.upcoming') : has ? t('mw.album.count', { n: a.photos.length }) : t('mw.album.soon');
    return (
      <button type="button" className={'mw-album' + (big ? ' wide' : '') + (a.next ? ' next' : '') + (has ? '' : ' empty')} onClick={() => openAlbum(a)} disabled={!has} aria-label={title}>
        {has && <span className="mw-album-bg" style={{ backgroundImage: `url(${a.cover || a.photos[0]})` }} aria-hidden="true" />}
        {a.m && <span className="mw-album-m" aria-hidden="true">{a.m}</span>}
        <span className="mw-album-txt">
          <b>{title}</b>
          {desc && <small>{desc}</small>}
          <em className={a.next ? 'live' : has ? 'done' : ''}>{status}</em>
        </span>
        {has && <span className="mw-album-go" aria-hidden="true"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="3" /><circle cx="9" cy="9" r="2" /><path d="M21 15l-5-5L5 21" /></svg></span>}
      </button>
    );
  };

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    track('page_view', { page: '/matching-week', meta: { utm_source: q.get('utm_source'), utm_medium: q.get('utm_medium'), utm_campaign: q.get('utm_campaign'), referrer: document.referrer || null } });
  }, []);

  // 친구에게 공유 — 모바일은 공유 시트, 아니면 링크 복사
  const share = async () => {
    const url = 'https://salary-fyi.com/matching-week';
    track('mw_share_click', { page: '/matching-week' });
    try {
      if (navigator.share) { await navigator.share({ title: t('mw.metaTitle'), url }); return; }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const shown = companies
    .map((c) => ({ ...c, jobs: filter === 'all' ? c.jobs : c.jobs.filter((j) => j.group === filter) }))
    .filter((c) => c.jobs.length > 0);
  const count = (f) => (f === 'all' ? total : companies.reduce((n, c) => n + c.jobs.filter((j) => j.group === f).length, 0));

  const Eyebrow = ({ n, children }) => <div className="mw-eyebrow"><span>{n}</span>{children}</div>;

  return (
    <>
      <Head>
        <title>{t('mw.metaTitle')}</title>
        <meta name="description" content={t('mw.metaDesc')} />
        <meta property="og:title" content={t('mw.metaTitle')} />
        <meta property="og:description" content={t('mw.metaDesc')} />
        <meta property="og:image" content="https://salary-fyi.com/main/matching-week.jpg" />
        <meta property="og:url" content="https://salary-fyi.com/matching-week" />
        <link rel="canonical" href="https://salary-fyi.com/matching-week" />
      </Head>

      <div className="mw">
        {/* ── 히어로 ── */}
        <header className="mw-hero">
          <div className="mw-hero-slides" aria-hidden="true">
            {HERO_SLIDES.map((h, i) => (
              <span key={h.src} className={'mw-hero-slide' + (i === slide ? ' on' : '')} style={{ backgroundImage: `url(${h.src})`, backgroundPosition: h.pos }} />
            ))}
          </div>
          <div className="mw-hero-dots">
            {HERO_SLIDES.map((h, i) => <button key={h.src} className={i === slide ? 'on' : ''} aria-label={`${i + 1}`} onClick={() => setSlide(i)} />)}
          </div>
          <div className="mw-hero-in">
            <div className="mw-hero-l">
              <div className="mw-chips">
                <span className="mw-chip">{daysLeft > 0 ? `D-${daysLeft}` : 'D-DAY'}</span>
                <span className="mw-chip mw-chip-ghost">Matching Week · 19.11.2026</span>
              </div>
              <h1>{t('mw.title')}</h1>
              <p className="mw-sub">{t('mw.sub', { companies: companies.length, jobs: total })}</p>
              <div className="mw-ctas">
                <a href="#companies" className="mw-btn mw-btn-primary" onClick={() => track('mw_cta_click', { page: '/matching-week' })}>{t('mw.cta')}</a>
                <button className="mw-btn mw-btn-ghost" onClick={share}>{copied ? t('mw.copied') : t('mw.share')}</button>
              </div>
            </div>
            <dl className="mw-panel">
              <div className="mw-stat"><dt>{t('mw.stat.companies')}</dt><dd>{companies.length}</dd></div>
              <div className="mw-stat"><dt>{t('mw.stat.jobs')}</dt><dd>{total}</dd></div>
              <div className="mw-row"><dt>{t('mw.fact.dateLabel')}</dt><dd>{t('mw.fact.date')}</dd></div>
              <div className="mw-row"><dt>{t('mw.fact.placeLabel')}</dt><dd>{t('mw.fact.place')}</dd></div>
              <div className="mw-row"><dt>{t('mw.fact.formatLabel')}</dt><dd>{t('mw.fact.format')}</dd></div>
            </dl>
          </div>
        </header>

        {/* ── 주최·후원 ── */}
        <div className="mw-orgs">
          <div className="mw-in mw-orgs-in">
            <p>{t('mw.orgs')}</p>
            <div className="mw-orgs-logos">
              {ORGS.map((o) => <img key={o.src} src={o.src} alt={o.alt} style={{ height: o.h }} />)}
            </div>
          </div>
        </div>

        {/* ── 01 신뢰: 처음 하는 행사가 아니다(다크) ── */}
        <section className="mw-sec mw-dark">
          <div className="mw-in">
            <Reveal>
              <Eyebrow n="01">Track record</Eyebrow>
              <h2 className="mw-title">{t('mw.past.title')}</h2>
              <p className="mw-lead">{t('mw.past.sub')}</p>
            </Reveal>
            <Reveal delay={100}>
              <div className="mw-albums">
                {EVENTS.map((e) => <AlbumCard key={e.key} a={e} title={t(`mw.past.${e.key}`)} />)}
              </div>
            </Reveal>
            <Reveal delay={150}>
              <h3 className="mw-subtitle">{t('mw.programs.title')}</h3>
              <p className="mw-lead mw-lead-sm">{t('mw.programs.sub')}</p>
              <div className="mw-albums mw-albums-2">
                {PROGRAMS.map((p) => <AlbumCard key={p.key} a={p} big title={t(`mw.prog.${p.key}.title`)} desc={t(`mw.prog.${p.key}.desc`)} />)}
              </div>
            </Reveal>
          </div>
          {/* 현장 분위기 — 사진이 끝없이 흐르는 띠 */}
          <div className="mw-marquee" aria-hidden="true">
            <div className="mw-marquee-track">
              {[...MARQUEE, ...MARQUEE].map((src, i) => <img key={i} src={src} alt="" loading="lazy" />)}
            </div>
          </div>
        </section>

        {/* ── 02 오시는 길 ── */}
        <section className="mw-sec mw-warm">
          <div className="mw-in mw-venue">
            <Reveal>
              <Eyebrow n="02">Getting there</Eyebrow>
              <h2 className="mw-title">{t('mw.venue.title')}</h2>
              <p className="mw-lead">{t('mw.venue.sub')}</p>
              {/* 셔틀 탑승지 → 행사장 */}
              <div className="mw-route">
                <a href={VENUE.shuttle.url} target="_blank" rel="noopener noreferrer" className="mw-stop" onClick={() => track('mw_map_click', { meta: { to: 'shuttle' }, page: '/matching-week' })}>
                  <span className="mw-stop-ico"><Bus /></span>
                  <span className="mw-stop-txt"><em>{t('mw.venue.shuttleLabel')}</em><b>{VENUE.shuttle.name}</b><small>{VENUE.shuttle.address}</small></span>
                  <span className="mw-stop-go">Google Maps ↗</span>
                </a>
                <div className="mw-route-line"><span>{t('mw.venue.shuttleRide')}</span></div>
                <a href={VENUE.venue.url} target="_blank" rel="noopener noreferrer" className="mw-stop mw-stop-end" onClick={() => track('mw_map_click', { meta: { to: 'venue' }, page: '/matching-week' })}>
                  <span className="mw-stop-ico"><Pin /></span>
                  <span className="mw-stop-txt"><em>{t('mw.venue.venueLabel')}</em><b>{VENUE.venue.name}</b><small>{VENUE.venue.address}</small></span>
                  <span className="mw-stop-go">Google Maps ↗</span>
                </a>
              </div>
              {/* 셔틀 시간표 */}
              <div className="mw-times">
                <div className="mw-times-row">
                  <span className="mw-times-k">{t('mw.venue.go')}<small>COBI Tower 2 → COBI Home</small></span>
                  <span className="mw-times-v">{VENUE.departures.map((d) => <b key={d}>{d}</b>)}</span>
                </div>
                <div className="mw-times-row">
                  <span className="mw-times-k">{t('mw.venue.back')}<small>COBI Home → COBI Tower 2</small></span>
                  <span className="mw-times-v"><i>{t('mw.venue.backDesc')}</i></span>
                </div>
              </div>
              <ul className="mw-checks">
                {[1, 2, 3, 4].map((n) => <li key={n}>{t(`mw.venue.check${n}`)}</li>)}
              </ul>
            </Reveal>
            <Reveal delay={100} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <a href={VENUE.videoUrl} target="_blank" rel="noopener noreferrer" className="mw-video"
                onClick={() => track('mw_video_click', { page: '/matching-week' })}>
                <span className="mw-video-bg" aria-hidden="true" />
                <span className="mw-play" aria-hidden="true"><svg width="30" height="30" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg></span>
                <span className="mw-video-txt">
                  <b>{t('mw.venue.videoTitle')}</b>
                  <span>{t('mw.venue.videoDesc')}</span>
                </span>
              </a>
              <div className="mw-map"><iframe src={VENUE.mapEmbed} title="COBI Home map" loading="lazy" referrerPolicy="no-referrer-when-downgrade" /></div>
            </Reveal>
          </div>
        </section>

        {/* ── 03 참여 방법 ── */}
        <section className="mw-sec">
          <div className="mw-in">
            <Reveal>
              <Eyebrow n="03">How it works</Eyebrow>
              <h2 className="mw-title">{t('mw.howTitle')}</h2>
            </Reveal>
            <div className="mw-steps">
              {[1, 2, 3].map((n) => (
                <Reveal key={n} delay={n * 90} style={{ height: '100%' }}>
                  <div className="mw-step">
                    <span className="mw-step-n">0{n}</span>
                    <b>{t(`mw.step${n}.title`)}</b>
                    <p>{t(`mw.step${n}.desc`)}</p>
                  </div>
                </Reveal>
              ))}
            </div>
            <p className="mw-note">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" /></svg>
              <span>{t('mw.note')}</span>
            </p>
          </div>
        </section>

        {/* ── 04 참가 기업 — 공고를 다 펼치면 길어 회사 카드만, 누르면 팝업 ── */}
        <section id="companies" className="mw-sec mw-gray">
          <div className="mw-in">
            <Reveal>
              <Eyebrow n="04">Companies</Eyebrow>
              <div className="mw-sec-head">
                <h2 className="mw-title">{t('mw.companiesTitle')} <span className="mw-accent">{shown.length}</span></h2>
                <div className="mw-filters" role="tablist">
                  {FILTERS.map((f) => (
                    <button key={f} role="tab" aria-selected={filter === f} className={'mw-filter' + (filter === f ? ' on' : '')}
                      onClick={() => { setFilter(f); track('mw_filter_click', { meta: { filter: f }, page: '/matching-week' }); }}>
                      {f === 'all' ? t('mw.filter.all') : f} <em>{count(f)}</em>
                    </button>
                  ))}
                </div>
              </div>
            </Reveal>
            {shown.length === 0 ? <p className="mw-empty">{t('main.empty')}</p> : (
              <div className="mw-cos">
                {shown.map((c) => (
                  <button key={c.name} className="mw-co" onClick={() => { setOpen(c); track('mw_company_click', { meta: { company: c.name }, page: '/matching-week' }); }}>
                    <div className="mw-co-top"><Logo c={c} size={64} /></div>
                    <div className="mw-co-body">
                      <div className="mw-co-name">{c.name}</div>
                      <ul className="mw-co-jobs">
                        {c.jobs.slice(0, 2).map((j) => <li key={j.id}>{j.title}</li>)}
                        {c.jobs.length > 2 && <li className="mw-more">{t('mw.more', { n: c.jobs.length - 2 })}</li>}
                      </ul>
                      <div className="mw-co-foot">
                        <span>{t('main.companies.count', { n: c.jobs.length })}</span>
                        <Arrow />
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* ── 05 FAQ ── */}
        <section className="mw-sec">
          <div className="mw-in mw-faq">
            <Reveal>
              <Eyebrow n="05">FAQ</Eyebrow>
              <h2 className="mw-title">{t('mw.faq.title')}</h2>
            </Reveal>
            <div className="mw-faq-list">
              {[1, 2, 3, 4, 5].map((n) => (
                <details key={n} onToggle={(e) => e.currentTarget.open && track('mw_faq_open', { meta: { n }, page: '/matching-week' })}>
                  <summary><span className="mw-q">Q</span>{t(`mw.faq.${n}.q`)}</summary>
                  <p>{t(`mw.faq.${n}.a`)}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ── 마무리 CTA ── */}
        <section className="mw-end">
          <div className="mw-in">
            <Reveal>
              <span className="mw-chip">{daysLeft > 0 ? `D-${daysLeft}` : 'D-DAY'}</span>
              <h2>{t('mw.end.title')}</h2>
              <p>{t('mw.end.sub')}</p>
              <div className="mw-ctas">
                <a href="#companies" className="mw-btn mw-btn-primary" onClick={() => track('mw_cta_click', { meta: { at: 'end' }, page: '/matching-week' })}>{t('mw.cta')}</a>
                <button className="mw-btn mw-btn-ghost" onClick={share}>{copied ? t('mw.copied') : t('mw.share')}</button>
              </div>
            </Reveal>
          </div>
        </section>
      </div>

      {open && (
        <div className="mw-modal" onClick={() => setOpen(null)}>
          <div className="mw-sheet" role="dialog" aria-modal="true" aria-label={open.name} onClick={(e) => e.stopPropagation()}>
            <div className="mw-sheet-head">
              <Logo c={open} size={48} />
              <div className="mw-sheet-title">
                <h2>{open.name}</h2>
                <span>
                  {t('main.companies.count', { n: open.jobs.length })}
                  {open.website && <> · <a href={/^https?:/.test(open.website) ? open.website : `https://${open.website}`} target="_blank" rel="noopener noreferrer" className="mw-web">{t('mw.website')} ↗</a></>}
                </span>
              </div>
              <button className="mw-x" aria-label="close" onClick={() => setOpen(null)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="mw-sheet-body">
              {open.jobs.map((j) => (
                <Link key={j.id} href={`/jobs/${j.id}`} className="mw-job"
                  onClick={() => track('click_job_card', { meta: { jobId: j.id, title: j.title, company: j.company, via: 'matching_week' }, page: '/matching-week' })}>
                  <div className="mw-job-main">
                    <div className="mw-job-t">{j.title}</div>
                    <div className="mw-job-tags">
                      {[j.location, j.experience].filter(Boolean).map((v) => <span key={v}>{v}</span>)}
                    </div>
                  </div>
                  <span className="mw-job-go">{t('mw.viewJd')} <Arrow /></span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {gallery && (
        <div className="mw-gal" onClick={() => setGallery(null)}>
          <div className="mw-gal-box" role="dialog" aria-modal="true" aria-label={tabTitle} onClick={(e) => e.stopPropagation()}>
            <div className="mw-gal-head">
              <button className="mw-gal-slide" onClick={() => setView(0)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M10 9l5 3-5 3z" fill="currentColor" /></svg>
                {t('mw.album.slideshow')}
              </button>
              <button className="mw-x" aria-label="close" onClick={() => setGallery(null)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="mw-gal-tabs" role="tablist">
              {[{ key: 'all', title: t('mw.album.all'), n: ALBUMS.reduce((n, a) => n + a.photos.length, 0) }, ...ALBUMS.map((a) => ({ key: a.key, title: albumTitle(a), n: a.photos.length }))].map((tab) => (
                <button key={tab.key} role="tab" aria-selected={gallery === tab.key} className={gallery === tab.key ? 'on' : ''}
                  onClick={() => { setGallery(tab.key); setView(null); }}>
                  {tab.title}<em>({tab.n})</em>
                </button>
              ))}
            </div>
            <div className="mw-gal-grid">
              {tabPhotos.map((src, i) => (
                <button key={src} onClick={() => setView(i)} aria-label={`${tabTitle} ${i + 1}`}>
                  <img src={src} alt="" loading="lazy" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {gallery && view !== null && (
        <div className="mw-lb" onClick={() => setView(null)}>
          <div className="mw-lb-top" onClick={(e) => e.stopPropagation()}>
            <b>{tabTitle}</b>
            <span>{view + 1} / {tabPhotos.length}</span>
            <button className="mw-lb-x" aria-label="close" onClick={() => setView(null)}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12" /></svg>
            </button>
          </div>
          <div className="mw-lb-stage" onClick={(e) => e.stopPropagation()}>
            <button className="mw-lb-nav prev" aria-label="prev" onClick={() => step(-1)}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6" /></svg></button>
            <img key={view} src={tabPhotos[view]} alt={`${tabTitle} ${view + 1}`} />
            <button className="mw-lb-nav next" aria-label="next" onClick={() => step(1)}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 18l6-6-6-6" /></svg></button>
          </div>
          <div className="mw-lb-thumbs" onClick={(e) => e.stopPropagation()}>
            {tabPhotos.map((src, i) => (
              <button key={src} className={i === view ? 'on' : ''} onClick={() => setView(i)} aria-label={`${i + 1}`}>
                <img src={src} alt="" loading="lazy" />
              </button>
            ))}
          </div>
        </div>
      )}

      <style jsx global>{`
        .mw { background: #fff; color: #171717; min-height: 100%; overflow-x: hidden; }
        .mw-in { width: 90%; max-width: 1200px; margin: 0 auto; }
        .mw-sec { padding: 112px 0; position: relative; }
        .mw-dark { background: #0c0c0b; color: #fff; padding-bottom: 72px; }
        .mw-warm { background: linear-gradient(180deg, #fff8f2 0%, #fff 100%); }
        .mw-gray { background: #f7f7f8; }
        .mw-eyebrow { display: inline-flex; align-items: center; gap: 10px; font-size: 13px; font-weight: 700; letter-spacing: 1.6px; text-transform: uppercase; color: #ff6000; }
        .mw-eyebrow span { font-variant-numeric: tabular-nums; padding-right: 10px; border-right: 1px solid currentColor; opacity: 0.85; }
        .mw-title { margin: 14px 0 0; font-size: 44px; font-weight: 800; line-height: 1.18; letter-spacing: -1.2px; }
        .mw-accent { color: #ff6000; }
        .mw-lead { margin: 16px 0 0; font-size: 17px; color: #52525b; line-height: 1.7; max-width: 680px; }
        .mw-dark .mw-lead { color: rgba(255,255,255,0.68); }

        /* 히어로 */
        .mw-hero { position: relative; overflow: hidden; min-height: max(680px, 78vh); display: flex; align-items: flex-end; background: #0c0c0b; color: #fff; }
        .mw-hero-slides { position: absolute; inset: 0; }
        .mw-hero-slide { position: absolute; inset: 0; background-size: cover; opacity: 0; transform: scale(1.08); transition: opacity 1.4s ease, transform 7s linear; }
        .mw-hero-slide.on { opacity: 1; transform: scale(1); } /* 켜지는 동안 천천히 줌아웃(켄 번즈) */
        .mw-hero::after { content: ''; position: absolute; inset: 0; pointer-events: none; background: linear-gradient(180deg, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.05) 25%, rgba(0,0,0,0.05) 50%, rgba(0,0,0,0.55) 75%, rgba(12,12,11,0.95) 100%); }
        .mw-hero-dots { position: absolute; z-index: 2; top: 24px; right: max(5%, calc((100% - 1200px) / 2)); display: flex; gap: 6px; }
        .mw-hero-dots button { width: 8px; height: 8px; padding: 0; border: 0; border-radius: 999px; background: rgba(255,255,255,0.45); cursor: pointer; transition: width .3s, background .3s; }
        .mw-hero-dots button.on { width: 24px; background: #fff; }
        @media (prefers-reduced-motion: reduce) { .mw-hero-slide { transition: none; } }
        .mw-hero-in { position: relative; z-index: 1; width: 90%; max-width: 1200px; margin: 0 auto; padding: 160px 0 64px; display: flex; align-items: flex-end; justify-content: space-between; gap: 48px; }
        .mw-hero-l { flex: 1; min-width: 0; max-width: 660px; }
        .mw-chips { display: flex; gap: 8px; flex-wrap: wrap; }
        .mw-chip { display: inline-flex; align-items: center; height: 30px; padding: 0 13px; border-radius: 999px; background: #ff6000; color: #fff; font-size: 13px; font-weight: 800; letter-spacing: 0.4px; }
        .mw-chip-ghost { background: rgba(255,255,255,0.14); border: 1px solid rgba(255,255,255,0.22); -webkit-backdrop-filter: blur(8px); backdrop-filter: blur(8px); font-weight: 600; }
        .mw-hero h1 { margin: 20px 0 0; font-size: 60px; font-weight: 800; line-height: 1.08; letter-spacing: -1.8px; text-shadow: 0 2px 24px rgba(0,0,0,0.3); }
        .mw-sub { margin: 18px 0 0; font-size: 18px; line-height: 1.6; color: rgba(255,255,255,0.85); }
        .mw-ctas { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 32px; }
        .mw-btn { display: inline-flex; align-items: center; justify-content: center; height: 54px; padding: 0 28px; border-radius: 14px; font: inherit; font-size: 16px; font-weight: 700; text-decoration: none; cursor: pointer; transition: background .15s, transform .15s, box-shadow .15s; }
        .mw-btn:hover { transform: translateY(-2px); }
        .mw-btn-primary { background: #ff6000; color: #fff; border: 0; box-shadow: 0 10px 30px rgba(255,96,0,0.42); }
        .mw-btn-primary:hover { background: #ff6f17; box-shadow: 0 14px 36px rgba(255,96,0,0.55); }
        .mw-btn-ghost { background: rgba(255,255,255,0.1); color: #fff; border: 1px solid rgba(255,255,255,0.3); -webkit-backdrop-filter: blur(8px); backdrop-filter: blur(8px); }
        .mw-btn-ghost:hover { background: rgba(255,255,255,0.2); }
        .mw-panel { flex: none; width: 350px; margin: 0; padding: 24px 26px; border-radius: 22px; background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.16); -webkit-backdrop-filter: blur(18px); backdrop-filter: blur(18px); display: grid; grid-template-columns: 1fr 1fr; gap: 0 16px; box-shadow: 0 20px 60px rgba(0,0,0,0.3); }
        .mw-stat { padding-bottom: 18px; margin-bottom: 6px; border-bottom: 1px solid rgba(255,255,255,0.14); }
        .mw-stat dt { font-size: 13px; color: rgba(255,255,255,0.65); }
        .mw-stat dd { margin: 4px 0 0; font-size: 46px; font-weight: 800; line-height: 1; letter-spacing: -1px; background: linear-gradient(180deg, #ffb27f, #ff6000); -webkit-background-clip: text; background-clip: text; color: transparent; }
        .mw-row { grid-column: 1 / -1; display: flex; justify-content: space-between; gap: 16px; padding: 11px 0; font-size: 14px; }
        .mw-row + .mw-row { border-top: 1px solid rgba(255,255,255,0.1); }
        .mw-row dt { color: rgba(255,255,255,0.6); flex: none; }
        .mw-row dd { margin: 0; font-weight: 600; text-align: right; }

        /* 주최 띠 — 히어로 다크와 이어지게 */
        .mw-orgs { background: #fff; border-bottom: 1px solid #f0f0f2; }
        .mw-orgs-in { padding: 26px 0; display: flex; align-items: center; justify-content: space-between; gap: 16px 40px; flex-wrap: wrap; }
        .mw-orgs-in p { margin: 0; font-size: 15px; font-weight: 600; color: #3f3f46; max-width: 420px; line-height: 1.5; }
        .mw-orgs-logos { display: flex; align-items: center; gap: 36px; flex-wrap: wrap; }
        .mw-orgs-logos img { width: auto; display: block; }

        /* 01 트랙레코드 */
        @keyframes mw-pulse { 0%, 100% { box-shadow: 0 0 0 0 rgba(255,96,0,0.7); } 50% { box-shadow: 0 0 0 6px rgba(255,96,0,0); } }
        /* 앨범 카드 */
        .mw-albums { margin-top: 44px; display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; }
        .mw-albums-2 { margin-top: 24px; grid-template-columns: repeat(2, 1fr); }
        .mw-album { position: relative; aspect-ratio: 3 / 4; padding: 0; border: 1px solid rgba(255,255,255,0.1); border-radius: 22px; overflow: hidden; background: linear-gradient(160deg, #1d1d1b, #121211); color: #fff; font: inherit; text-align: left; cursor: pointer; display: flex; align-items: flex-end; transition: transform .25s, border-color .25s, box-shadow .25s; }
        .mw-album.wide { aspect-ratio: 16 / 9; }
        .mw-album:not(:disabled):hover { transform: translateY(-4px); border-color: rgba(255,138,61,0.6); box-shadow: 0 20px 50px rgba(0,0,0,0.5); }
        .mw-album:disabled { cursor: default; }
        .mw-album.empty { background: repeating-linear-gradient(135deg, #171716 0 14px, #1b1b1a 14px 28px); }
        .mw-album.next { background: radial-gradient(circle at 30% 0%, rgba(255,96,0,0.55), transparent 60%), linear-gradient(160deg, #2a1608, #120a05); border-color: rgba(255,96,0,0.6); box-shadow: 0 0 50px rgba(255,96,0,0.18); }
        .mw-album-bg { position: absolute; inset: 0; background-size: cover; background-position: center; transition: transform .8s cubic-bezier(.2,.8,.2,1); }
        .mw-album-bg::after { content: ''; position: absolute; inset: 0; background: linear-gradient(180deg, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0) 35%, rgba(0,0,0,0.85) 100%); }
        .mw-album:not(:disabled):hover .mw-album-bg { transform: scale(1.07); }
        .mw-album-m { position: absolute; top: 14px; left: 18px; font-size: 64px; font-weight: 800; letter-spacing: -3px; line-height: 1; color: rgba(255,255,255,0.14); font-variant-numeric: tabular-nums; }
        .mw-album .mw-album-bg ~ .mw-album-m { color: rgba(255,255,255,0.9); text-shadow: 0 2px 16px rgba(0,0,0,0.4); }
        .mw-album.next .mw-album-m { color: #ff6000; }
        .mw-album-txt { position: relative; display: flex; flex-direction: column; gap: 4px; padding: 20px; width: 100%; }
        .mw-album-txt b { font-size: 18px; line-height: 1.3; }
        .mw-album-txt small { font-size: 13.5px; color: rgba(255,255,255,0.75); line-height: 1.45; }
        .mw-album-txt em { display: inline-flex; align-items: center; gap: 6px; margin-top: 4px; font-style: normal; font-size: 13px; color: rgba(255,255,255,0.5); }
        .mw-album-txt em.done { color: rgba(255,255,255,0.85); }
        .mw-album-txt em.done::before { content: '✓'; color: #4ade80; font-weight: 800; }
        .mw-album-txt em.live { color: #ff8a3d; font-weight: 700; }
        .mw-album-txt em.live::before { content: ''; width: 8px; height: 8px; border-radius: 50%; background: #ff6000; animation: mw-pulse 1.6s ease-in-out infinite; }
        .mw-album-go { position: absolute; top: 16px; right: 16px; width: 40px; height: 40px; border-radius: 50%; background: rgba(255,255,255,0.16); -webkit-backdrop-filter: blur(8px); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; transition: background .2s; }
        .mw-album:hover .mw-album-go { background: #ff6000; }
        .mw-subtitle { margin: 64px 0 0; font-size: 26px; font-weight: 800; letter-spacing: -0.6px; }
        .mw-lead-sm { margin-top: 8px; font-size: 15.5px; }
        /* 사진 갤러리 모달 — 탭 + 3열 그리드 스크롤 */
        .mw-gal { position: fixed; inset: 0; z-index: 1050; background: rgba(10,10,10,0.6); -webkit-backdrop-filter: blur(4px); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; padding: 40px; animation: mw-fade .18s ease; }
        .mw-gal-box { width: 100%; max-width: 1240px; height: 100%; max-height: 920px; display: flex; flex-direction: column; background: #fff; border-radius: 20px; overflow: hidden; box-shadow: 0 30px 80px rgba(0,0,0,0.35); animation: mw-pop .24s cubic-bezier(.2,.8,.2,1); }
        .mw-gal-head { display: flex; align-items: center; justify-content: space-between; padding: 18px 22px 8px; }
        .mw-gal-slide { display: inline-flex; align-items: center; gap: 7px; height: 38px; padding: 0 16px; border-radius: 999px; border: 1px solid #e4e4e7; background: #fff; color: #171717; font: inherit; font-size: 14px; font-weight: 600; cursor: pointer; }
        .mw-gal-slide:hover { border-color: #ff6000; color: #e85600; }
        .mw-gal-tabs { display: flex; gap: 4px; padding: 0 14px; border-bottom: 1px solid #ececef; overflow-x: auto; scrollbar-width: none; }
        .mw-gal-tabs::-webkit-scrollbar { display: none; }
        .mw-gal-tabs button { flex: none; position: relative; height: 48px; padding: 0 14px; border: 0; background: none; font: inherit; font-size: 14.5px; font-weight: 600; color: #52525b; cursor: pointer; }
        .mw-gal-tabs button em { font-style: normal; margin-left: 3px; }
        .mw-gal-tabs button:hover { color: #171717; }
        .mw-gal-tabs button.on { color: #e85600; font-weight: 800; }
        .mw-gal-tabs button.on::after { content: ''; position: absolute; left: 10px; right: 10px; bottom: -1px; height: 3px; border-radius: 3px 3px 0 0; background: #ff6000; }
        .mw-gal-grid { flex: 1; min-height: 0; overflow-y: auto; padding: 14px; display: grid; grid-template-columns: repeat(3, 1fr); grid-auto-rows: max-content; gap: 10px; }
        .mw-gal-grid button { padding: 0; border: 0; border-radius: 10px; overflow: hidden; aspect-ratio: 3 / 2; background: #f0f0f2; cursor: zoom-in; }
        .mw-gal-grid img { width: 100%; height: 100%; object-fit: cover; display: block; transition: transform .4s cubic-bezier(.2,.8,.2,1), filter .2s; }
        .mw-gal-grid button:hover img { transform: scale(1.04); filter: brightness(1.05); }
        /* 사진 크게 보기 */
        .mw-lb { position: fixed; inset: 0; z-index: 1100; background: rgba(8,8,8,0.94); display: flex; flex-direction: column; animation: mw-fade .18s ease; }
        .mw-lb-top { display: flex; align-items: center; gap: 14px; padding: 16px 20px; color: #fff; }
        .mw-lb-top b { font-size: 16px; }
        .mw-lb-top span { font-size: 13.5px; color: rgba(255,255,255,0.55); font-variant-numeric: tabular-nums; }
        .mw-lb-x { margin-left: auto; width: 42px; height: 42px; border-radius: 50%; border: 0; background: rgba(255,255,255,0.1); color: #fff; display: flex; align-items: center; justify-content: center; cursor: pointer; }
        .mw-lb-x:hover { background: rgba(255,255,255,0.2); }
        .mw-lb-stage { flex: 1; min-height: 0; position: relative; display: flex; align-items: center; justify-content: center; padding: 0 76px; }
        .mw-lb-stage img { max-width: 100%; max-height: 100%; object-fit: contain; border-radius: 10px; animation: mw-fade .25s ease; }
        .mw-lb-nav { position: absolute; top: 50%; transform: translateY(-50%); width: 52px; height: 52px; border-radius: 50%; border: 0; background: rgba(255,255,255,0.1); color: #fff; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: background .15s; }
        .mw-lb-nav:hover { background: #ff6000; }
        .mw-lb-nav.prev { left: 14px; }
        .mw-lb-nav.next { right: 14px; }
        .mw-lb-thumbs { display: flex; gap: 8px; justify-content: center; padding: 16px 20px 22px; overflow-x: auto; scrollbar-width: none; }
        .mw-lb-thumbs::-webkit-scrollbar { display: none; }
        .mw-lb-thumbs button { flex: none; width: 72px; height: 52px; padding: 0; border: 2px solid transparent; border-radius: 8px; overflow: hidden; background: none; cursor: pointer; opacity: 0.45; transition: opacity .15s, border-color .15s; }
        .mw-lb-thumbs button.on { opacity: 1; border-color: #ff6000; }
        .mw-lb-thumbs button:hover { opacity: 0.9; }
        .mw-lb-thumbs img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .mw-marquee { margin-top: 56px; overflow: hidden; -webkit-mask-image: linear-gradient(90deg, transparent, #000 10%, #000 90%, transparent); mask-image: linear-gradient(90deg, transparent, #000 10%, #000 90%, transparent); }
        .mw-marquee-track { display: flex; gap: 12px; width: max-content; animation: mw-marquee 60s linear infinite; }
        .mw-marquee-track img { height: 150px; width: auto; border-radius: 12px; object-fit: cover; opacity: 0.75; }
        @keyframes mw-marquee { to { transform: translateX(-50%); } }

        /* 02 오시는 길 */
        .mw-venue { display: grid; grid-template-columns: 1fr 1.1fr; gap: 56px; align-items: start; }
        .mw-route { margin-top: 28px; display: flex; flex-direction: column; }
        .mw-stop { display: flex; align-items: center; gap: 14px; padding: 16px 18px; border-radius: 18px; background: #fff; border: 1px solid #f0e2d6; box-shadow: 0 6px 20px rgba(255,96,0,0.06); text-decoration: none; color: inherit; transition: border-color .15s, transform .15s; }
        .mw-stop:hover { border-color: #ffb27f; transform: translateY(-2px); }
        .mw-stop-ico { flex: none; width: 44px; height: 44px; border-radius: 14px; background: #fff1e6; color: #ff6000; display: flex; align-items: center; justify-content: center; }
        .mw-stop-end .mw-stop-ico { background: #ff6000; color: #fff; }
        .mw-stop-txt { flex: 1; min-width: 0; display: flex; flex-direction: column; }
        .mw-stop-txt em { font-style: normal; font-size: 12px; font-weight: 700; letter-spacing: 0.6px; text-transform: uppercase; color: #e85600; }
        .mw-stop-txt b { font-size: 17px; margin-top: 1px; }
        .mw-stop-txt small { font-size: 13px; color: #71717a; margin-top: 2px; line-height: 1.45; }
        .mw-stop-go { flex: none; font-size: 12.5px; font-weight: 700; color: #a1a1aa; white-space: nowrap; }
        .mw-stop:hover .mw-stop-go { color: #e85600; }
        .mw-route-line { position: relative; height: 44px; margin-left: 39px; border-left: 2px dashed #ffb27f; }
        .mw-times { margin-top: 18px; border-radius: 18px; background: #171717; color: #fff; padding: 6px 20px; }
        .mw-times-row { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 14px 0; }
        .mw-times-row + .mw-times-row { border-top: 1px solid rgba(255,255,255,0.1); }
        .mw-times-k { display: flex; flex-direction: column; font-size: 15px; font-weight: 700; }
        .mw-times-k small { margin-top: 2px; font-size: 12px; font-weight: 500; color: rgba(255,255,255,0.55); }
        .mw-times-v { display: flex; gap: 8px; flex-wrap: wrap; justify-content: flex-end; text-align: right; }
        .mw-times-v b { padding: 6px 12px; border-radius: 10px; background: #ff6000; font-size: 17px; font-weight: 800; font-variant-numeric: tabular-nums; letter-spacing: 0.3px; }
        .mw-times-v i { font-style: normal; font-size: 13.5px; color: rgba(255,255,255,0.8); line-height: 1.45; max-width: 260px; }
        .mw-route-line span { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); font-size: 12.5px; font-weight: 700; color: #e85600; white-space: nowrap; }
        .mw-checks { list-style: none; padding: 0; margin: 28px 0 0; display: flex; flex-direction: column; gap: 12px; }
        .mw-checks li { display: flex; gap: 12px; align-items: flex-start; font-size: 15.5px; color: #27272a; line-height: 1.5; }
        .mw-checks li::before { content: '✓'; flex: none; width: 24px; height: 24px; border-radius: 50%; background: #ff6000; color: #fff; font-size: 13px; font-weight: 800; display: flex; align-items: center; justify-content: center; margin-top: -1px; }
        .mw-video { position: relative; display: flex; align-items: flex-end; min-height: 340px; padding: 28px; border-radius: 24px; overflow: hidden; text-decoration: none; color: #fff; box-shadow: 0 24px 60px rgba(0,0,0,0.18); }
        .mw-video-bg { position: absolute; inset: 0; background: linear-gradient(180deg, rgba(0,0,0,0.05) 30%, rgba(0,0,0,0.8)), url(/matching-week/video-thumb.jpg) center 52%/cover; transition: transform .7s cubic-bezier(.2,.8,.2,1); }
        .mw-video:hover .mw-video-bg { transform: scale(1.05); }
        .mw-play { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -60%); width: 78px; height: 78px; border-radius: 50%; background: #ff6000; color: #fff; display: flex; align-items: center; justify-content: center; padding-left: 4px; box-shadow: 0 0 0 10px rgba(255,96,0,0.25), 0 12px 30px rgba(0,0,0,0.3); transition: transform .2s; }
        .mw-video:hover .mw-play { transform: translate(-50%, -60%) scale(1.08); }
        .mw-video-txt { position: relative; display: flex; flex-direction: column; gap: 4px; }
        .mw-video-txt b { font-size: 20px; }
        .mw-video-txt span { font-size: 14px; color: rgba(255,255,255,0.8); }
        .mw-map { border-radius: 16px; overflow: hidden; border: 1px solid #e4e4e7; }
        .mw-map iframe { width: 100%; height: 280px; border: 0; display: block; }

        /* 03 참여 방법 */
        .mw-steps { margin: 44px 0 0; display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
        .mw-step { height: 100%; box-sizing: border-box; padding: 30px 28px; border-radius: 22px; background: #fff; border: 1px solid #ececef; box-shadow: 0 1px 2px rgba(0,0,0,0.03); transition: transform .2s, box-shadow .2s, border-color .2s; }
        .mw-step:hover { transform: translateY(-3px); box-shadow: 0 16px 36px rgba(0,0,0,0.07); border-color: #ffd2b3; }
        .mw-step-n { display: block; font-size: 54px; font-weight: 800; line-height: 1; letter-spacing: -2px; color: transparent; -webkit-text-stroke: 1.5px #ff6000; }
        .mw-step b { display: block; margin-top: 22px; font-size: 19px; }
        .mw-step p { margin: 8px 0 0; font-size: 15px; color: #52525b; line-height: 1.6; }
        .mw-note { display: flex; gap: 10px; align-items: flex-start; margin: 20px 0 0; padding: 16px 20px; border-radius: 14px; background: #fff7f0; border: 1px solid #ffdcc2; color: #9a3a00; font-size: 14.5px; line-height: 1.55; }
        .mw-note svg { flex: none; margin-top: 1px; }

        /* 04 참가 기업 */
        .mw-sec-head { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
        .mw-filters { display: flex; gap: 6px; padding: 5px; border-radius: 999px; background: #fff; border: 1px solid #e4e4e7; }
        .mw-filter { height: 38px; padding: 0 18px; border-radius: 999px; border: 0; background: transparent; color: #52525b; font: inherit; font-size: 14px; font-weight: 600; cursor: pointer; transition: all .15s; }
        .mw-filter em { font-style: normal; color: #a1a1aa; margin-left: 3px; }
        .mw-filter:hover { color: #171717; }
        .mw-filter.on { background: #171717; color: #fff; }
        .mw-filter.on em { color: #ff8a3d; }
        .mw-cos { margin-top: 36px; display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 16px; }
        .mw-co { display: flex; flex-direction: column; text-align: left; min-width: 0; padding: 0; border-radius: 20px; background: #fff; border: 1px solid #ececef; overflow: hidden; font: inherit; color: inherit; cursor: pointer; transition: border-color .2s, transform .2s, box-shadow .2s; }
        .mw-co:hover { border-color: #ffb27f; box-shadow: 0 18px 40px rgba(0,0,0,0.09); transform: translateY(-4px); }
        .mw-co-top { height: 116px; display: flex; align-items: center; justify-content: center; background: radial-gradient(circle at 50% 120%, #ffeadb 0%, #fafafa 60%); border-bottom: 1px solid #f2f2f4; }
        .mw-co-body { flex: 1; display: flex; flex-direction: column; padding: 18px 20px; }
        .mw-co-name { font-size: 17px; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .mw-co-jobs { list-style: none; padding: 0; margin: 10px 0 0; display: flex; flex-direction: column; gap: 5px; min-height: 64px; }
        .mw-co-jobs li { font-size: 13px; color: #52525b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .mw-co-jobs li::before { content: '·'; margin-right: 6px; color: #a1a1aa; }
        .mw-co-jobs .mw-more { color: #a1a1aa; }
        .mw-co-jobs .mw-more::before { content: none; }
        .mw-co-foot { margin-top: auto; padding-top: 14px; border-top: 1px dashed #ececef; display: flex; align-items: center; justify-content: space-between; font-size: 13.5px; font-weight: 700; color: #e85600; }
        .mw-co-foot svg { transition: transform .2s; }
        .mw-co:hover .mw-co-foot svg { transform: translateX(4px); }
        .mw-logo { border-radius: 16px; border: 1px solid #ececef; background: #fff; display: flex; align-items: center; justify-content: center; overflow: hidden; flex: none; box-shadow: 0 4px 14px rgba(0,0,0,0.06); }
        .mw-logo img { width: 100%; height: 100%; object-fit: contain; padding: 7px; }
        .mw-logo span { color: #52525b; font-weight: 800; font-size: 20px; }
        .mw-empty { color: #71717a; font-size: 14px; margin-top: 24px; }

        /* 05 FAQ */
        .mw-faq { display: grid; grid-template-columns: 1fr 1.6fr; gap: 56px; align-items: start; }
        .mw-faq-list { border-top: 1px solid #e4e4e7; }
        .mw-faq details { border-bottom: 1px solid #e4e4e7; }
        .mw-faq summary { list-style: none; cursor: pointer; display: flex; gap: 14px; align-items: baseline; padding: 24px 44px 24px 0; font-size: 17px; font-weight: 700; position: relative; }
        .mw-faq summary::-webkit-details-marker { display: none; }
        .mw-q { flex: none; color: #ff6000; font-weight: 800; }
        .mw-faq summary::after { content: '+'; position: absolute; right: 6px; top: 50%; transform: translateY(-50%); font-size: 26px; font-weight: 300; color: #a1a1aa; transition: transform .25s, color .25s; }
        .mw-faq details[open] summary::after { transform: translateY(-50%) rotate(45deg); color: #ff6000; }
        .mw-faq details p { margin: -6px 0 24px 30px; font-size: 15px; color: #52525b; line-height: 1.7; }

        /* 마무리 */
        .mw-end { padding: 120px 0; text-align: center; color: #fff; background: radial-gradient(ellipse at 50% 120%, rgba(255,96,0,0.45), transparent 60%), linear-gradient(180deg, rgba(12,12,11,0.88), rgba(12,12,11,0.94)), url(/main/may-matching-week.jpg) center/cover; }
        .mw-end h2 { margin: 20px auto 0; font-size: 44px; font-weight: 800; letter-spacing: -1.2px; line-height: 1.2; max-width: 760px; }
        .mw-end p { margin: 16px auto 0; font-size: 17px; color: rgba(255,255,255,0.75); max-width: 560px; line-height: 1.6; }
        .mw-end .mw-ctas { justify-content: center; }

        /* 공고 팝업 — 모바일은 하단 시트 */
        .mw-modal { position: fixed; inset: 0; z-index: 1000; background: rgba(10,10,10,0.55); -webkit-backdrop-filter: blur(4px); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; padding: 24px; animation: mw-fade .18s ease; }
        .mw-sheet { width: 100%; max-width: 620px; max-height: 82vh; display: flex; flex-direction: column; background: #fff; border-radius: 24px; overflow: hidden; box-shadow: 0 24px 70px rgba(0,0,0,0.3); animation: mw-pop .24s cubic-bezier(.2,.8,.2,1); }
        .mw-sheet-head { display: flex; align-items: center; gap: 14px; padding: 22px 22px 18px; border-bottom: 1px solid #f0f0f2; background: radial-gradient(circle at 0% 0%, #fff1e6, #fff 60%); }
        .mw-sheet-title { flex: 1; min-width: 0; display: flex; flex-direction: column; }
        .mw-sheet-title h2 { margin: 0; font-size: 21px; font-weight: 800; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .mw-sheet-title > span { margin-top: 2px; font-size: 13.5px; font-weight: 600; color: #e85600; }
        .mw-web { color: #52525b; font-weight: 600; text-decoration: none; }
        .mw-web:hover { color: #171717; text-decoration: underline; }
        .mw-x { flex: none; width: 38px; height: 38px; border-radius: 50%; border: 0; background: #f4f4f5; color: #3f3f46; display: flex; align-items: center; justify-content: center; cursor: pointer; }
        .mw-x:hover { background: #e4e4e7; }
        .mw-sheet-body { overflow-y: auto; padding: 8px 10px 14px; }
        .mw-job { display: flex; align-items: center; gap: 16px; padding: 18px 12px; border-radius: 14px; text-decoration: none; color: inherit; transition: background .15s; }
        .mw-job + .mw-job { border-top: 1px solid #f4f4f5; }
        .mw-job:hover { background: #fff7f0; }
        .mw-job-main { flex: 1; min-width: 0; }
        .mw-job-t { font-size: 16px; font-weight: 700; line-height: 1.4; }
        .mw-job-tags { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
        .mw-job-tags span { padding: 3px 9px; border-radius: 6px; background: #f4f4f5; color: #52525b; font-size: 12.5px; font-weight: 500; }
        .mw-job-go { flex: none; display: inline-flex; align-items: center; gap: 2px; font-size: 13.5px; font-weight: 700; color: #e85600; }
        @keyframes mw-fade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes mw-pop { from { opacity: 0; transform: translateY(16px) scale(0.98); } to { opacity: 1; transform: none; } }
        @media (prefers-reduced-motion: reduce) { .mw-modal, .mw-sheet, .mw-marquee-track { animation: none; } }

        @media (max-width: 1024px) {
          .mw-hero-in { flex-direction: column; align-items: stretch; }
          .mw-panel { width: auto; max-width: 520px; }
          .mw-cos { grid-template-columns: repeat(3, minmax(0, 1fr)); }
          .mw-venue, .mw-faq { grid-template-columns: 1fr; gap: 32px; }
          .mw-albums { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 760px) {
          .mw-steps { grid-template-columns: 1fr; }
          .mw-albums-2 { grid-template-columns: 1fr; }
        }
        @media (max-width: 640px) {
          .mw-sec { padding: 72px 0; }
          .mw-dark { padding-bottom: 48px; }
          .mw-title { font-size: 30px; letter-spacing: -0.8px; }
          .mw-lead { font-size: 15.5px; }
          .mw-hero { min-height: max(580px, 84vh); }
          .mw-hero-in { padding: 220px 0 32px; gap: 24px; }
          .mw-hero h1 { font-size: 36px; letter-spacing: -1px; }
          .mw-sub { font-size: 15.5px; }
          .mw-btn { flex: 1; height: 50px; padding: 0 16px; font-size: 15px; }
          .mw-panel { padding: 20px; }
          .mw-stat dd { font-size: 36px; }
          .mw-orgs-logos { gap: 20px; }
          .mw-orgs-logos img { transform: scale(0.8); transform-origin: left center; }
          .mw-albums { margin-top: 32px; gap: 10px; }
          .mw-album { border-radius: 18px; }
          .mw-album-m { font-size: 44px; top: 10px; left: 14px; }
          .mw-album-txt { padding: 14px; }
          .mw-album-txt b { font-size: 15px; }
          .mw-album-go { width: 34px; height: 34px; top: 10px; right: 10px; }
          .mw-subtitle { margin-top: 44px; font-size: 21px; }
          .mw-gal { padding: 0; }
          .mw-gal-box { max-height: none; border-radius: 0; }
          .mw-gal-head { padding: 12px 14px 4px; }
          .mw-gal-tabs { padding: 0 6px; }
          .mw-gal-tabs button { padding: 0 10px; font-size: 13.5px; }
          .mw-gal-grid { grid-template-columns: repeat(2, 1fr); gap: 6px; padding: 8px; }
          .mw-lb-stage { padding: 0 8px; }
          .mw-lb-nav { width: 42px; height: 42px; background: rgba(0,0,0,0.45); }
          .mw-lb-nav.prev { left: 12px; }
          .mw-lb-nav.next { right: 12px; }
          .mw-lb-thumbs { justify-content: flex-start; }
          .mw-lb-thumbs button { width: 56px; height: 42px; }
          .mw-marquee { margin-top: 36px; }
          .mw-marquee-track img { height: 100px; }
          .mw-video { min-height: 260px; padding: 22px; }
          .mw-stop { padding: 14px; gap: 12px; }
          .mw-stop-go { display: none; }
          .mw-times { padding: 4px 16px; }
          .mw-times-row { flex-direction: column; align-items: flex-start; gap: 8px; }
          .mw-times-v { justify-content: flex-start; text-align: left; }
          .mw-route-line { margin-left: 35px; }
          .mw-play { width: 64px; height: 64px; }
          .mw-step { padding: 24px 22px; }
          .mw-step-n { font-size: 44px; }
          .mw-cos { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
          .mw-filters { width: 100%; }
          .mw-filter { flex: 1; padding: 0 8px; }
          .mw-co-top { height: 84px; }
          .mw-co-top .mw-logo { width: 52px !important; height: 52px !important; }
          .mw-co-body { padding: 14px; }
          .mw-co-name { font-size: 15px; }
          .mw-co-jobs { min-height: 0; }
          .mw-co-jobs li:nth-child(2), .mw-co-jobs .mw-more { display: none; } /* 2열 카드는 좁아 대표 공고 1줄만 */
          .mw-faq summary { font-size: 15.5px; padding: 20px 40px 20px 0; }
          .mw-end { padding: 80px 0; }
          .mw-end h2 { font-size: 28px; }
          .mw-modal { align-items: flex-end; padding: 0; }
          .mw-sheet { max-width: none; max-height: 86vh; border-radius: 24px 24px 0 0; padding-bottom: env(safe-area-inset-bottom); animation-name: mw-up; }
          .mw-job-go { font-size: 0; gap: 0; } /* 모바일은 화살표만 */
          @keyframes mw-up { from { transform: translateY(100%); } to { transform: none; } }
        }
      `}</style>
    </>
  );
}
