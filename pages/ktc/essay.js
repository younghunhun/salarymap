import { useState } from 'react';
import Head from 'next/head';
import supabaseAdmin from '../../lib/supabaseAdmin';
import { verifyToken } from '../../lib/ktcMailToken';
import { fetchKtcJob } from '../../lib/ktcJobs';
import { essayFor } from '../../lib/jobEssays';
import { verifyToken as verifyCampaignToken } from '../../lib/campaignToken';
import EssayForm, { essayLang } from '../../components/ktc/EssayForm';
import { BRAND, c } from '../../components/ktc/ktcStyles';

/* 자기소개서 메일 착지 — /ktc/essay?t=<ktcMailToken>&j=<jobId>[&lang=vi|ko|en]
   이미 지원한 사람에게 기업 요청 문항을 받는다(scripts/outreach/essay-send.mjs).
   로그인 없이 토큰 이메일로 저장하고, 전에 낸 답이 있으면 채워서 보여준다(수정 가능). */

export async function getServerSideProps({ query }) {
  const uiLang = essayLang(query.lang);
  const claim = verifyToken(query.t);
  const job = claim?.email && query.j ? await fetchKtcJob(String(query.j)).catch(() => null) : null;
  if (!claim?.email || !job?.essayQuestions) return { props: { valid: false, uiLang } };

  const email = claim.email.toLowerCase();
  const [{ data: prev }, { data: prof }] = await Promise.all([
    supabaseAdmin.from('job_essays').select('answers').eq('job_id', job.id).eq('email', email).maybeSingle(),
    supabaseAdmin.from('user_profiles').select('id, full_name').ilike('email', email).limit(1).maybeSingle(),
  ]);
  try {
    await supabaseAdmin.from('events').insert({
      event: 'job_essay_open', user_id: prof?.id || null,
      meta: { job_id: job.id, code: job.jobId, campaign: claim.campaign },
    });
  } catch {}

  // a= 추천 메일 원탭 토큰 — 있으면 '지원 모드': 자소서 저장 후 /api/resume/quick-apply 로 지원까지 한다
  const applyToken = query.a && verifyCampaignToken(String(query.a)) ? String(query.a) : null;

  return {
    props: {
      valid: true, uiLang, token: String(query.t), applyToken,
      job: { id: job.id, title: job.title, company: job.company, questions: job.essayQuestions, deadline: essayFor(job.jobId)?.deadline?.[uiLang] || null },
      name: prof?.full_name || '',
      initial: prev?.answers || null,
    },
  };
}

const T = {
  vi: {
    bad: 'Liên kết đã hết hạn hoặc không hợp lệ. Vui lòng trả lời email để chúng tôi hỗ trợ.',
    head: (n) => (n ? `${n} ơi, vui lòng điền bản giới thiệu bản thân` : 'Vui lòng điền bản giới thiệu bản thân'),
    sub: (co, title) => `${co} yêu cầu các ứng viên đã qua vòng hồ sơ vị trí ${title} trả lời các câu hỏi dưới đây.`,
    deadline: 'Hạn nộp',
    again: 'Bạn đã nộp trước đó — có thể chỉnh sửa và nộp lại.',
    submit: 'Nộp', sending: 'Đang nộp…',
    done: 'Đã nộp. Cảm ơn bạn! Chúng tôi sẽ gửi cho công ty và liên hệ lại với bạn.',
    err: 'Nộp không thành công. Vui lòng thử lại.',
  },
  ko: {
    bad: '링크가 만료되었거나 올바르지 않습니다. 메일로 답장 주시면 도와드리겠습니다.',
    head: (n) => (n ? `${n}님, 자기소개서를 작성해 주세요` : '자기소개서를 작성해 주세요'),
    sub: (co, title) => `${co}에서 ${title} 서류 합격자분들께 아래 문항 작성을 요청했습니다.`,
    deadline: '기한',
    again: '이미 제출하셨습니다. 수정해서 다시 제출하실 수 있습니다.',
    submit: '제출', sending: '제출 중…',
    done: '제출되었습니다. 감사합니다! 기업에 전달한 뒤 다시 연락드리겠습니다.',
    err: '제출에 실패했습니다. 다시 시도해 주세요.',
  },
  en: {
    bad: 'This link is invalid or expired. Please reply to the email and we will help.',
    head: (n) => (n ? `${n}, please fill in your self-introduction` : 'Please fill in your self-introduction'),
    sub: (co, title) => `${co} asks candidates who passed screening for ${title} to answer the questions below.`,
    deadline: 'Deadline',
    again: 'You already submitted — you can edit and resubmit.',
    submit: 'Submit', sending: 'Submitting…',
    done: 'Submitted. Thank you! We will forward it to the company and get back to you.',
    err: 'Submission failed. Please try again.',
  },
};

// 지원 모드(추천 메일 원탭에서 넘어온 경우) 문구 — 아직 지원 전이므로 '서류 합격' 표현을 쓰지 않는다
const T_APPLY = {
  vi: {
    head: (n) => (n ? `${n} ơi, trả lời vài câu hỏi để ứng tuyển` : 'Trả lời vài câu hỏi để ứng tuyển'),
    sub: (co, title) => `${co} yêu cầu ứng viên vị trí ${title} trả lời các câu hỏi dưới đây khi ứng tuyển. CV đã đăng ký của bạn sẽ được gửi kèm.`,
    submit: 'Nộp hồ sơ ứng tuyển',
    done: 'Đã ứng tuyển. CV và câu trả lời của bạn đã được gửi.',
  },
  ko: {
    head: (n) => (n ? `${n}님, 지원하려면 문항에 답해 주세요` : '지원하려면 문항에 답해 주세요'),
    sub: (co, title) => `${co}에서 ${title} 지원 시 아래 문항 작성을 요청했습니다. 등록하신 이력서가 함께 제출됩니다.`,
    submit: '지원서 제출',
    done: '지원되었습니다. 이력서와 답변이 함께 제출되었습니다.',
  },
  en: {
    head: (n) => (n ? `${n}, answer a few questions to apply` : 'Answer a few questions to apply'),
    sub: (co, title) => `${co} asks applicants for ${title} to answer the questions below. Your registered CV will be attached.`,
    submit: 'Submit application',
    done: 'Applied. Your CV and answers have been sent.',
  },
};

export default function KtcEssay({ valid, uiLang, token, applyToken, job, name, initial }) {
  const tt = { ...T[uiLang], ...(applyToken ? T_APPLY[uiLang] : {}) };
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState(null);

  const save = async (answers) => {
    setBusy(true); setErr(null);
    try {
      const r = await fetch('/api/job-essays', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, jobId: job.id, answers }),
      });
      if (!r.ok) throw new Error();
      if (applyToken) {
        const a = await fetch('/api/resume/quick-apply', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ t: applyToken, jobId: job.id }),
        });
        if (!a.ok) throw new Error();
      }
      setDone(true);
      window.scrollTo(0, 0);
    } catch { setErr(tt.err); }
    setBusy(false);
  };

  const firstName = String(name || '').trim().split(/\s+/).slice(-1)[0];
  return (
    <div style={{ minHeight: '100vh', background: c.bg, padding: '32px 16px 64px', boxSizing: 'border-box' }}>
      <Head><title>{valid ? `${job.company} · ${T[uiLang].submit}` : 'FYI'}</title><meta name="robots" content="noindex" /></Head>
      <div style={{ maxWidth: 600, margin: '0 auto', background: '#fff', border: `1px solid ${c.line}`, borderRadius: 16, padding: '26px 22px' }}>
        {!valid ? (
          <p style={{ margin: 0, fontSize: 15, lineHeight: 1.6, color: c.textDim }}>{tt.bad}</p>
        ) : done ? (
          <p style={{ margin: 0, fontSize: 16, lineHeight: 1.6, fontWeight: 700, color: c.text }}>✅ {tt.done}</p>
        ) : (
          <>
            <div style={{ fontSize: 12, fontWeight: 700, color: BRAND, marginBottom: 6 }}>{job.company} · {job.title}</div>
            <h1 style={{ margin: '0 0 8px', fontSize: 20, lineHeight: 1.4, color: c.text }}>{tt.head(firstName)}</h1>
            <p style={{ margin: '0 0 6px', fontSize: 14, lineHeight: 1.6, color: c.textDim }}>{tt.sub(job.company, job.title)}</p>
            {!applyToken && job.deadline && <p style={{ margin: '0 0 6px', fontSize: 14, fontWeight: 700, color: c.text }}>⏰ {tt.deadline}: {job.deadline}</p>}
            {initial && <p style={{ margin: '0 0 6px', fontSize: 13, color: c.textFaint }}>{tt.again}</p>}
            <div style={{ height: 14 }} />
            <EssayForm questions={job.questions} lang={uiLang} initial={initial} busy={busy} error={err}
              submitLabel={busy ? tt.sending : tt.submit} onSubmit={save} />
          </>
        )}
      </div>
    </div>
  );
}
