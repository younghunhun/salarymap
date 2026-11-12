import { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useT } from '../lib/i18n';
import { track } from '../lib/track';

/* 11/19 호치민 매칭위크 참가 기업 공고 모음 — 후보자에게 공유하는 링크(엠마 요청 2026-11-12).
   참가 공고는 jobs.raw_payload.ktc.is_matching_week 플래그로 고른다(메인 카드 배지와 같은 기준).
   현장 워크인을 막기 위해 '서류 통과자만 초대' 문구를 꼭 둔다. */

const EVENT_AT = new Date('2026-11-19T00:00:00+07:00');

export async function getStaticProps() {
  let jobs = [];
  try {
    const { fetchKtcJobs } = await import('../lib/ktcJobs');
    jobs = (await fetchKtcJobs()).filter((j) => j.isMatchingWeek).map((j) => ({
      id: j.id, title: j.title || '', company: j.company || '', logo: j.companyLogo || null,
      location: j.location || null, experience: j.experience || null, group: j.group,
    }));
  } catch (e) {
    console.error('matching-week: ktc jobs', e);
  }
  // 회사별로 묶고, 공고 많은 회사 먼저. 같은 회사가 'D3'·'D3 Company'처럼 표기가 갈려 있어 뒤의 Company 는 떼고 묶는다
  const byCo = new Map();
  for (const j of jobs) {
    const key = j.company.replace(/\s+company$/i, '').toLowerCase();
    const g = byCo.get(key) || { name: j.company, logo: null, jobs: [] };
    g.jobs.push(j);
    if (j.company.length > g.name.length) g.name = j.company;
    if (!g.logo && j.logo) g.logo = j.logo;
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
  const [filter, setFilter] = useState('all');
  const [open, setOpen] = useState(null); // 공고 팝업을 띄운 회사(필터 적용된 공고만 들고 있다)

  // 팝업이 떠 있는 동안 뒤 페이지 스크롤 잠금 + Esc 로 닫기
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => { if (e.key === 'Escape') setOpen(null); };
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey); };
  }, [open]);

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
        <header className="mw-hero">
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

        <div className="mw-wrap">
          <section className="mw-how">
            <h2 className="mw-h2">{t('mw.howTitle')}</h2>
            <ol className="mw-steps">
              {[1, 2, 3].map((n) => (
                <li key={n}>
                  <span className="mw-step-n">{n}</span>
                  <b>{t(`mw.step${n}.title`)}</b>
                  <p>{t(`mw.step${n}.desc`)}</p>
                </li>
              ))}
            </ol>
            <p className="mw-note">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" /></svg>
              <span>{t('mw.note')}</span>
            </p>
          </section>

          {/* 공고를 전부 펼치면 스크롤이 너무 길어 회사 카드만 보여 주고, 누르면 그 회사 공고를 팝업으로 띄운다 */}
          <section id="companies" className="mw-companies">
            <div className="mw-sec-head">
              <h2 className="mw-h2">{t('mw.companiesTitle')} <span>{shown.length}</span></h2>
              <div className="mw-filters" role="tablist">
                {FILTERS.map((f) => (
                  <button key={f} role="tab" aria-selected={filter === f} className={'mw-filter' + (filter === f ? ' on' : '')}
                    onClick={() => { setFilter(f); track('mw_filter_click', { meta: { filter: f }, page: '/matching-week' }); }}>
                    {f === 'all' ? t('mw.filter.all') : f} <em>{count(f)}</em>
                  </button>
                ))}
              </div>
            </div>
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
          </section>
        </div>
      </div>

      {open && (
        <div className="mw-modal" onClick={() => setOpen(null)}>
          <div className="mw-sheet" role="dialog" aria-modal="true" aria-label={open.name} onClick={(e) => e.stopPropagation()}>
            <div className="mw-sheet-head">
              <Logo c={open} size={48} />
              <div className="mw-sheet-title">
                <h2>{open.name}</h2>
                <span>{t('main.companies.count', { n: open.jobs.length })}</span>
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

      <style jsx global>{`
        .mw { background: #fff; color: #171717; min-height: 100%; }
        .mw-h2 { margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.3px; }
        .mw-h2 span { color: #ff6000; }

        /* 히어로 — 사진을 넉넉히 보이고, 아래쪽 어두운 영역에 문구(왼쪽)와 행사 정보 패널(오른쪽) */
        .mw-hero { min-height: 600px; display: flex; align-items: flex-end; background: linear-gradient(180deg, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.3) 45%, rgba(0,0,0,0.85) 100%), url(/main/matching-week.jpg) center 35%/cover; color: #fff; }
        .mw-hero-in { width: 90%; max-width: 1200px; margin: 0 auto; padding: 140px 0 56px; display: flex; align-items: flex-end; justify-content: space-between; gap: 40px; }
        .mw-hero-l { flex: 1; min-width: 0; max-width: 640px; }
        .mw-chips { display: flex; gap: 8px; flex-wrap: wrap; }
        .mw-chip { display: inline-flex; align-items: center; height: 28px; padding: 0 12px; border-radius: 999px; background: #ff6000; font-size: 13px; font-weight: 800; letter-spacing: 0.3px; }
        .mw-chip-ghost { background: rgba(255,255,255,0.16); -webkit-backdrop-filter: blur(8px); backdrop-filter: blur(8px); font-weight: 600; }
        .mw-hero h1 { margin: 18px 0 0; font-size: 52px; font-weight: 800; line-height: 1.12; letter-spacing: -1px; text-shadow: 0 2px 20px rgba(0,0,0,0.3); }
        .mw-sub { margin: 16px 0 0; font-size: 18px; line-height: 1.55; opacity: 0.92; }
        .mw-ctas { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 28px; }
        .mw-btn { display: inline-flex; align-items: center; justify-content: center; height: 52px; padding: 0 26px; border-radius: 14px; font: inherit; font-size: 16px; font-weight: 700; text-decoration: none; cursor: pointer; transition: background .15s, transform .15s; }
        .mw-btn:hover { transform: translateY(-1px); }
        .mw-btn-primary { background: #ff6000; color: #fff; border: 0; box-shadow: 0 8px 24px rgba(255,96,0,0.4); }
        .mw-btn-primary:hover { background: #e85600; }
        .mw-btn-ghost { background: rgba(255,255,255,0.14); color: #fff; border: 1px solid rgba(255,255,255,0.35); -webkit-backdrop-filter: blur(8px); backdrop-filter: blur(8px); }
        .mw-btn-ghost:hover { background: rgba(255,255,255,0.24); }
        .mw-panel { flex: none; width: 340px; margin: 0; padding: 22px 24px; border-radius: 20px; background: rgba(20,20,20,0.45); border: 1px solid rgba(255,255,255,0.18); -webkit-backdrop-filter: blur(14px); backdrop-filter: blur(14px); display: grid; grid-template-columns: 1fr 1fr; gap: 0 16px; }
        .mw-stat { padding-bottom: 16px; margin-bottom: 6px; border-bottom: 1px solid rgba(255,255,255,0.15); }
        .mw-stat dt { font-size: 13px; opacity: 0.75; }
        .mw-stat dd { margin: 2px 0 0; font-size: 40px; font-weight: 800; line-height: 1.1; color: #ff8a3d; }
        .mw-row { grid-column: 1 / -1; display: flex; justify-content: space-between; gap: 16px; padding: 10px 0; font-size: 14px; }
        .mw-row + .mw-row { border-top: 1px solid rgba(255,255,255,0.1); }
        .mw-row dt { opacity: 0.7; flex: none; }
        .mw-row dd { margin: 0; font-weight: 600; text-align: right; }

        .mw-wrap { width: 90%; max-width: 1200px; margin: 0 auto; padding: 56px 0 72px; }

        /* 참여 방법 — 연결선 있는 3단계 타임라인 */
        .mw-steps { list-style: none; padding: 0; margin: 24px 0 0; display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; position: relative; }
        .mw-steps::before { content: ''; position: absolute; top: 20px; left: 20px; right: calc(33.33% - 4px); height: 2px; background: repeating-linear-gradient(90deg, #ffc49e 0 8px, transparent 8px 14px); }
        .mw-steps li { position: relative; }
        .mw-step-n { position: relative; z-index: 1; display: flex; align-items: center; justify-content: center; width: 40px; height: 40px; border-radius: 50%; background: #ff6000; color: #fff; font-weight: 800; font-size: 17px; box-shadow: 0 0 0 6px #fff; }
        .mw-steps b { display: block; margin-top: 16px; font-size: 17px; }
        .mw-steps p { margin: 6px 0 0; font-size: 14.5px; color: #52525b; line-height: 1.55; }
        .mw-note { display: flex; gap: 10px; align-items: flex-start; margin: 28px 0 0; padding: 14px 18px; border-radius: 12px; background: #fff7f0; border: 1px solid #ffdcc2; color: #9a3a00; font-size: 14px; line-height: 1.55; }
        .mw-note svg { flex: none; margin-top: 1px; }

        /* 참가 기업 */
        .mw-companies { margin-top: 64px; scroll-margin-top: 80px; }
        .mw-sec-head { display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
        .mw-filters { display: flex; gap: 6px; }
        .mw-filter { height: 38px; padding: 0 16px; border-radius: 999px; border: 1px solid #e4e4e7; background: #fff; color: #3f3f46; font: inherit; font-size: 14px; font-weight: 600; cursor: pointer; transition: all .15s; }
        .mw-filter em { font-style: normal; color: #a1a1aa; margin-left: 2px; }
        .mw-filter:hover { border-color: #d4d4d8; }
        .mw-filter.on { background: #171717; border-color: #171717; color: #fff; }
        .mw-filter.on em { color: #ff8a3d; }
        .mw-cos { margin-top: 20px; display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 16px; }
        .mw-co { display: flex; flex-direction: column; text-align: left; min-width: 0; padding: 0; border-radius: 18px; background: #fff; border: 1px solid #e4e4e7; overflow: hidden; font: inherit; color: inherit; cursor: pointer; transition: border-color .2s, transform .2s, box-shadow .2s; }
        .mw-co:hover { border-color: #ffb27f; box-shadow: 0 12px 28px rgba(0,0,0,0.08); transform: translateY(-3px); }
        .mw-co-top { height: 108px; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #fafafa, #f2f2f4); border-bottom: 1px solid #f0f0f2; }
        .mw-co:hover .mw-co-top { background: linear-gradient(135deg, #fff8f3, #ffeee2); }
        .mw-co-body { flex: 1; display: flex; flex-direction: column; padding: 16px 18px 16px; }
        .mw-co-name { font-size: 16.5px; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .mw-co-jobs { list-style: none; padding: 0; margin: 10px 0 0; display: flex; flex-direction: column; gap: 4px; min-height: 62px; }
        .mw-co-jobs li { font-size: 13px; color: #52525b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .mw-co-jobs li::before { content: '·'; margin-right: 6px; color: #a1a1aa; }
        .mw-co-jobs .mw-more { color: #a1a1aa; }
        .mw-co-jobs .mw-more::before { content: none; }
        .mw-co-foot { margin-top: auto; padding-top: 14px; display: flex; align-items: center; justify-content: space-between; font-size: 13.5px; font-weight: 700; color: #e85600; }
        .mw-co-foot svg { transition: transform .2s; }
        .mw-co:hover .mw-co-foot svg { transform: translateX(3px); }
        .mw-logo { border-radius: 14px; border: 1px solid #ececef; background: #fff; display: flex; align-items: center; justify-content: center; overflow: hidden; flex: none; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
        .mw-logo img { width: 100%; height: 100%; object-fit: contain; padding: 7px; }
        .mw-logo span { color: #52525b; font-weight: 800; font-size: 20px; }
        .mw-empty { color: #71717a; font-size: 14px; margin-top: 24px; }

        /* 회사 공고 팝업 — 모바일은 하단 시트 */
        .mw-modal { position: fixed; inset: 0; z-index: 1000; background: rgba(10,10,10,0.55); -webkit-backdrop-filter: blur(3px); backdrop-filter: blur(3px); display: flex; align-items: center; justify-content: center; padding: 24px; animation: mw-fade .18s ease; }
        .mw-sheet { width: 100%; max-width: 600px; max-height: 82vh; display: flex; flex-direction: column; background: #fff; border-radius: 22px; overflow: hidden; box-shadow: 0 24px 70px rgba(0,0,0,0.3); animation: mw-pop .22s cubic-bezier(.2,.8,.2,1); }
        .mw-sheet-head { display: flex; align-items: center; gap: 14px; padding: 22px 22px 18px; border-bottom: 1px solid #f0f0f2; }
        .mw-sheet-title { flex: 1; min-width: 0; display: flex; flex-direction: column; }
        .mw-sheet-title h2 { margin: 0; font-size: 20px; font-weight: 800; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .mw-sheet-title span { margin-top: 2px; font-size: 13.5px; font-weight: 600; color: #e85600; }
        .mw-x { flex: none; width: 38px; height: 38px; border-radius: 50%; border: 0; background: #f4f4f5; color: #3f3f46; display: flex; align-items: center; justify-content: center; cursor: pointer; }
        .mw-x:hover { background: #e4e4e7; }
        .mw-sheet-body { overflow-y: auto; padding: 8px 10px 14px; }
        .mw-job { display: flex; align-items: center; gap: 16px; padding: 16px 12px; border-radius: 14px; text-decoration: none; color: inherit; transition: background .15s; }
        .mw-job + .mw-job { border-top: 1px solid #f4f4f5; }
        .mw-job:hover { background: #fff7f0; }
        .mw-job-main { flex: 1; min-width: 0; }
        .mw-job-t { font-size: 16px; font-weight: 700; line-height: 1.4; }
        .mw-job-tags { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
        .mw-job-tags span { padding: 3px 9px; border-radius: 6px; background: #f4f4f5; color: #52525b; font-size: 12.5px; font-weight: 500; }
        .mw-job-go { flex: none; display: inline-flex; align-items: center; gap: 2px; font-size: 13.5px; font-weight: 700; color: #e85600; }
        @keyframes mw-fade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes mw-pop { from { opacity: 0; transform: translateY(16px) scale(0.98); } to { opacity: 1; transform: none; } }
        @media (prefers-reduced-motion: reduce) { .mw-modal, .mw-sheet { animation: none; } }

        @media (max-width: 1024px) {
          .mw-hero-in { flex-direction: column; align-items: stretch; }
          .mw-panel { width: auto; max-width: 520px; }
          .mw-cos { grid-template-columns: repeat(3, minmax(0, 1fr)); }
        }
        @media (max-width: 760px) {
          .mw-steps { grid-template-columns: 1fr; gap: 20px; }
          .mw-steps::before { top: 20px; bottom: 20px; left: 19px; right: auto; width: 2px; height: auto; background: repeating-linear-gradient(180deg, #ffc49e 0 8px, transparent 8px 14px); }
          .mw-steps li { padding-left: 56px; min-height: 40px; }
          .mw-step-n { position: absolute; left: 0; top: 0; }
          .mw-steps b { margin-top: 8px; }
        }
        @media (max-width: 640px) {
          .mw-hero { min-height: 0; }
          .mw-hero-in { padding: 180px 0 28px; gap: 24px; }
          .mw-hero h1 { font-size: 32px; letter-spacing: -0.5px; }
          .mw-sub { font-size: 15.5px; }
          .mw-btn { flex: 1; height: 48px; padding: 0 16px; font-size: 15px; }
          .mw-panel { padding: 18px 18px; }
          .mw-stat dd { font-size: 32px; }
          .mw-wrap { padding-top: 40px; }
          .mw-h2 { font-size: 20px; }
          .mw-companies { margin-top: 48px; }
          .mw-cos { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
          .mw-co-top { height: 84px; }
          .mw-co-top .mw-logo { width: 52px !important; height: 52px !important; }
          .mw-co-body { padding: 12px 14px 14px; }
          .mw-co-name { font-size: 15px; }
          .mw-co-jobs { min-height: 0; }
          .mw-co-jobs li:nth-child(2), .mw-co-jobs .mw-more { display: none; } /* 2열 카드는 좁아 대표 공고 1줄만 */
          .mw-modal { align-items: flex-end; padding: 0; }
          .mw-sheet { max-width: none; max-height: 86vh; border-radius: 22px 22px 0 0; padding-bottom: env(safe-area-inset-bottom); animation-name: mw-up; }
          .mw-job-go { font-size: 0; gap: 0; } /* 모바일은 화살표만 */
          @keyframes mw-up { from { transform: translateY(100%); } to { transform: none; } }
        }
      `}</style>
    </>
  );
}
