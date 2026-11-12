import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';
import { getStoredUtm, getApplicationSource } from '../../lib/utm';
import { track } from '../../lib/track';
import { ktcAppliedUrl } from '../../lib/applyConversion';
import { useT } from '../../lib/i18n';
import { BRAND, c, s } from './ktcStyles';
import EssayForm, { essayLang } from './EssayForm';

/* /ktc 공고 지원 — FYI 일반 공고(/jobs)와 **같은 로직·같은 테이블**을 쓴다.
   · 이력서는 resumes 버킷에 올리고 URL 만 넘긴다(FormData 는 /api/job-applications 가 JSON 파서만 써서 400)
   · 접수는 POST /api/job-applications → job_applications
   · 중복 지원 방지는 localStorage fyi_applied_jobs (FYI 쪽과 같은 키)
   /ktc 공고가 FYI jobs(source='ktc') 로 합쳐졌기 때문에 job_id 가 그대로 들어간다.

   비로그인은 /login?return=<현재경로> 로 보내고 로그인 후 제자리로 돌아온다(_app.js 와 같은 규약). */
export default function KtcApply({ job, variant = 'panel' }) {
  const { t, lang } = useT();
  const router = useRouter();
  const fileRef = useRef(null);

  const [session, setSession] = useState(null);
  const [profileResumeUrl, setProfileResumeUrl] = useState(null);
  const [resumeFile, setResumeFile] = useState(null);
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);
  // 기업이 자소서를 요청한 공고(lib/jobEssays.js)는 지원 전에 문항 모달을 띄운다
  const [essayOpen, setEssayOpen] = useState(false);
  const [essayErr, setEssayErr] = useState(null);

  useEffect(() => {
    try {
      const aj = JSON.parse(localStorage.getItem('fyi_applied_jobs') || '[]');
      if (aj.includes(job.id)) setApplied(true);
    } catch {}
    supabase.auth.getSession().then(({ data: { session: sn } }) => {
      if (!sn) return;
      setSession(sn);
      // 프로필에 이력서가 있으면 파일 업로드 없이 그걸로 바로 지원한다.
      fetch('/api/profile/talent', { headers: { Authorization: `Bearer ${sn.access_token}` } })
        .then(r => (r.ok ? r.json() : null))
        .then(p => { if (p?.profile?.resume_url) setProfileResumeUrl(p.profile.resume_url); })
        .catch(() => {});
    });
  }, [job.id]);

  /* ?essay=1 — 다른 지원 경로(/jobs·추천 원탭 등)에서 자소서 미작성으로 튕겨 온 경우 모달을 바로 연다.
     패널·하단바 두 인스턴스가 있으므로 panel 쪽만 연다(모달은 portal 이라 모바일에서도 보인다). */
  useEffect(() => {
    if (variant === 'panel' && session && !applied && router.query.essay === '1' && job.essayQuestions?.length) setEssayOpen(true);
  }, [variant, session, applied, router.query.essay, job.essayQuestions]);

  // 모달은 높이 제한·내부 스크롤 없이 통째로 보이고, 길면 바깥 오버레이가 스크롤된다 — 그동안 뒤 페이지는 고정
  useEffect(() => {
    if (!essayOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [essayOpen]);

  const goLogin = () => router.push('/login?return=' + encodeURIComponent(router.asPath));

  const submit = async (essayAnswers) => {
    if (applying || applied) return;
    if (!session) return goLogin();
    if (!resumeFile && !profileResumeUrl) return fileRef.current?.click();
    if (job.essayQuestions?.length && !essayAnswers) { setEssayErr(null); setEssayOpen(true); return; }

    setApplying(true);
    try {
      // 자소서 먼저 저장 — (공고, 이메일) upsert 라 지원이 실패해 다시 내도 중복되지 않는다
      if (essayAnswers) {
        const er = await fetch('/api/job-essays', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify({ jobId: job.id, answers: essayAnswers }),
        });
        if (!er.ok) {
          const err = await er.json().catch(() => ({}));
          setEssayErr(t('jobs.applyError', { error: err.error || 'unknown error' }));
          setApplying(false);
          return;
        }
      }

      let resumeUrl = profileResumeUrl;
      if (resumeFile) {
        const safeName = resumeFile.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const path = `${session.user.id}/${Date.now()}_${safeName}`;
        const { error: upErr } = await supabase.storage.from('resumes').upload(path, resumeFile, {
          cacheControl: '3600', upsert: false,
          contentType: resumeFile.type || 'application/octet-stream',
        });
        if (upErr) { alert(t('jobs.cvUploadError', { error: upErr.message })); setApplying(false); return; }
        resumeUrl = supabase.storage.from('resumes').getPublicUrl(path).data.publicUrl;
      }

      const res = await fetch('/api/job-applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({
          jobId: job.id,
          jobTitle: job.title,
          jobCompany: job.company,
          resumeUrl,
          applicantEmail: session.user.email,
          applicantName: session.user.user_metadata?.full_name || '',
          // 유입 정보는 랜딩 시점에 저장된 값을 쓴다(지원 시점엔 router.query 가 비어 있음)
          ...getStoredUtm(),
          applicationSource: getApplicationSource(),
        }),
      });
      if (!res.ok) {
        // 409 = 다른 기기에서 이미 지원(서버 dedup) — 로컬 상태를 서버에 맞춘다.
        if (res.status === 409) {
          setApplied(true);
          try {
            const aj = JSON.parse(localStorage.getItem('fyi_applied_jobs') || '[]');
            if (!aj.includes(job.id)) localStorage.setItem('fyi_applied_jobs', JSON.stringify([...aj, job.id]));
          } catch {}
          alert(t('jobs.alreadyApplied'));
          setApplying(false);
          return;
        }
        const err = await res.json().catch(() => ({}));
        // 403 not_eligible = 블랙리스트(면접 노쇼 등) — 사유는 안 보여주고 안내만
        alert(err.error === 'not_eligible' ? t('jobs.notEligible') : t('jobs.applyError', { error: err.error || 'unknown error' }));
        setApplying(false);
        return;
      }

      setApplied(true);
      setEssayOpen(false);
      try {
        const aj = JSON.parse(localStorage.getItem('fyi_applied_jobs') || '[]');
        if (!aj.includes(job.id)) localStorage.setItem('fyi_applied_jobs', JSON.stringify([...aj, job.id]));
      } catch {}
      track('submit_application', { meta: { job_id: job.id, title: job.title, company: job.company, source: 'ktc' }, page: `/ktc/jobs/${job.id}` });
      /* KTC 전용 확인 페이지로 실제 이동 — 접수 성공을 눈으로 확인시키고, 그 페이지가
         마운트될 때 전환 이벤트를 쏜다. 여기서 또 쏘면 전환이 두 번 잡히므로 이동만 한다. */
      router.push(ktcAppliedUrl({ jobId: job.id, title: job.title, company: job.company }));
    } catch (e) {
      alert(t('jobs.applyError', { error: e?.message || 'unknown error' }));
    }
    setApplying(false);
  };

  // 지원 취소 — 서버에서 status='canceled' 마킹. 취소하면 새 CV로 재지원할 수 있다.
  const [canceling, setCanceling] = useState(false);
  const cancelApply = async () => {
    if (!session || canceling) return;
    if (!window.confirm(t('jobs.cancelConfirm'))) return;
    setCanceling(true);
    const res = await fetch(`/api/job-applications?jobId=${job.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    setCanceling(false);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(t('jobs.applyError', { error: err.error || 'unknown error' }));
      return;
    }
    track('cancel_application', { meta: { job_id: job.id, title: job.title, company: job.company, source: 'ktc' }, page: `/ktc/jobs/${job.id}` });
    try {
      const aj = JSON.parse(localStorage.getItem('fyi_applied_jobs') || '[]');
      localStorage.setItem('fyi_applied_jobs', JSON.stringify(aj.filter(id => id !== job.id)));
    } catch {}
    setApplied(false);
    setResumeFile(null);
  };

  const label = applied
    ? t('ktc.apply.done')
    : applying
      ? t('ktc.apply.sending')
      : !session
        ? t('ktc.apply.login')
        : (!resumeFile && !profileResumeUrl)
          ? t('ktc.apply.pickCv')
          : t('ktc.jobs.apply');

  const btn = (
    <button
      className="ktc-apply-btn"
      style={{ ...s.btnPrimary, width: '100%', opacity: applied || applying ? 0.55 : 1, cursor: applied ? 'default' : 'pointer' }}
      onClick={() => submit()}
      disabled={applying || applied}
    >
      {label}{!applied && !applying ? ' →' : ''}
    </button>
  );

  // 선택한 파일명 / 프로필 이력서 사용 안내 — 무엇으로 지원되는지 버튼 위에 밝힌다.
  const cvNote = session && !applied && (
    <p style={{ marginTop: 8, fontSize: 12, lineHeight: 1.5, color: c.textFaint, wordBreak: 'break-all' }}>
      {resumeFile
        ? `📎 ${resumeFile.name}`
        : profileResumeUrl
          ? t('ktc.apply.useProfileCv')
          : t('ktc.apply.needCv')}
      {(resumeFile || profileResumeUrl) && (
        <button
          onClick={() => fileRef.current?.click()}
          style={{ marginLeft: 6, background: 'none', border: 'none', padding: 0, color: BRAND, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
        >
          {t('ktc.apply.changeCv')}
        </button>
      )}
    </p>
  );

  // 취소 링크 — 잘못된 CV로 지원한 경우 스스로 물리고 재지원할 수 있게 한다(로그인 지원만).
  const cancelNote = applied && session && (
    <p style={{ marginTop: 8, fontSize: 12, textAlign: 'center' }}>
      <button
        onClick={cancelApply}
        disabled={canceling}
        style={{ background: 'none', border: 'none', padding: 0, color: c.textFaint, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'underline' }}
      >
        {t('jobs.cancelApply')}
      </button>
    </p>
  );

  return (
    <>
      <input
        ref={fileRef}
        type="file"
        accept=".pdf,.doc,.docx"
        style={{ display: 'none' }}
        onChange={(e) => { const f = e.target.files?.[0]; if (f) setResumeFile(f); }}
      />
      {btn}
      {/* body 로 portal — 하단 바(backdrop-filter)·숨겨진 패널(display:none) 안에 두면 fixed 모달이 갇히거나 안 보인다 */}
      {essayOpen && typeof document !== 'undefined' && createPortal(
        <div onClick={() => !applying && setEssayOpen(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,.45)', overflowY: 'auto', padding: '24px 16px', boxSizing: 'border-box', display: 'flex' }}>
          <div onClick={(e) => e.stopPropagation()}
            style={{ width: '100%', maxWidth: 560, margin: 'auto', background: '#fff', borderRadius: 16, padding: '22px 20px', boxSizing: 'border-box', textAlign: 'left' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 6 }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: c.text }}>{ESSAY_HEAD[essayLang(lang)]}</h3>
              <button onClick={() => !applying && setEssayOpen(false)} aria-label="close"
                style={{ background: 'none', border: 'none', fontSize: 22, lineHeight: 1, color: c.textFaint, cursor: 'pointer', padding: 0 }}>×</button>
            </div>
            <p style={{ margin: '0 0 18px', fontSize: 13, lineHeight: 1.5, color: c.textDim }}>{ESSAY_SUB[essayLang(lang)](job.company)}</p>
            <EssayForm questions={job.essayQuestions} lang={lang} busy={applying} error={essayErr}
              submitLabel={applying ? t('ktc.apply.sending') : t('ktc.jobs.apply')}
              onSubmit={(answers) => submit(answers)} />
          </div>
        </div>,
        document.body
      )}
      {variant === 'panel' && cvNote}
      {variant === 'panel' && cancelNote}
    </>
  );
}

// 자소서 모달 문구 — 이 기능 전용이라 전역 사전에 넣지 않는다(pages/lang.js 와 같은 방침)
const ESSAY_HEAD = { vi: 'Bản giới thiệu bản thân', ko: '자기소개서', en: 'Self-introduction' };
const ESSAY_SUB = {
  vi: (co) => `${co} yêu cầu ứng viên trả lời các câu hỏi dưới đây khi ứng tuyển.`,
  ko: (co) => `${co}에서 지원 시 아래 문항 작성을 요청했습니다.`,
  en: (co) => `${co} asks applicants to answer the questions below.`,
};
