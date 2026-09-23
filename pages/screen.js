import { useState } from 'react'
import Head from 'next/head'
import supabaseAdmin from '../lib/supabaseAdmin'
import { verifyToken } from '../lib/campaignToken'
import { SCREEN_QUESTIONS } from '../lib/screenQuestions'

/* 원탭 스크리닝 콜드메일 착지 페이지 — 로그인 없이 한 번 눌러 답한다.
   /screen?t=<token(user_id)>&q=<질문 키>&cta=<답 값>[&j=<공고 id>]

   j 가 있으면 "예" 계열 답 뒤에 그 공고의 원탭 지원(/api/resume/recommend?t=&j=) 버튼을 바로 띄운다 —
   스크리닝과 지원을 한 흐름으로 잇는다(드론 K23 교훈: 공고가 이미 열려 있으면 답만 받고 끝낼 이유가 없다).

   /worktype 와 같은 설계: cta 는 메일에서 누른 버튼이고 화면만 미리 맞춰준다. 저장은 반드시
   이 화면의 확인 버튼을 거친다 — 메일 보안 스캐너의 링크 프리페치를 사람의 답으로 세지 않기 위해.
   질문·답 정의는 lib/screenQuestions.js 하나를 페이지·API·발송 스크립트가 공유한다. */

export async function getServerSideProps({ query }) {
  const claim = verifyToken(query.t)
  const q = String(query.q || '')
  const def = SCREEN_QUESTIONS[q]
  if (!claim?.userId || !def) return { props: { valid: false, uiLang: normLang(query.lang) } }

  const { data: prof } = await supabaseAdmin
    .from('user_profiles').select('id, full_name').eq('id', claim.userId).maybeSingle()
  if (!prof) return { props: { valid: false, uiLang: normLang(query.lang) } }

  // 도달=클릭으로 센다 — 기존 콜드메일 지표와 같은 조건.
  try {
    await supabaseAdmin.from('events').insert({
      event: 'coldmail_screen_click',
      user_id: prof.id,
      meta: { campaign: claim.campaign, q, cta: query.cta || null },
    })
  } catch {}

  const values = def.answers.map((a) => a.value)
  const j = /^[0-9a-f-]{36}$/i.test(String(query.j || '')) ? String(query.j) : null
  return {
    props: {
      valid: true,
      token: query.t,
      q,
      j,
      cta: values.includes(String(query.cta)) ? String(query.cta) : null,
      uiLang: normLang(query.lang),
      name: prof.full_name || '',
    },
  }
}

const LANGS = ['vi', 'ko', 'en']
const normLang = (v) => (LANGS.includes(String(v || '')) ? String(v) : 'vi')

const T = {
  vi: {
    title: 'Một câu hỏi nhỏ | FYI',
    badHead: 'Liên kết đã hết hạn hoặc không hợp lệ',
    badSub: 'Vui lòng bấm lại nút trong email. Nếu vẫn không được, hãy trả lời email này để chúng tôi hỗ trợ.',
    toJobs: 'Xem tin tuyển dụng',
    formHead: (n) => (n ? `${n} ơi, chỉ cần một lần bấm` : 'Chỉ cần một lần bấm'),
    formSub: 'FYI đang cân nhắc đề cử bạn cho một vị trí, nhưng CV của bạn chưa nói rõ điểm này. Chọn một mục — không cần đăng nhập, 10 giây.',
    save: 'Xác nhận',
    saving: 'Đang lưu…',
    fine: 'Câu trả lời chỉ dùng để quyết định có đề cử bạn cho vị trí này hay không.',
    doneHead: (n) => (n ? `Cảm ơn ${n}!` : 'Cảm ơn bạn!'),
    doneYes: 'Nếu bạn phù hợp, FYI sẽ gửi thông tin vị trí và link ứng tuyển 1 chạm trong 1–2 ngày tới.',
    doneYesJob: 'Vị trí đang mở. CV đã đăng ký của bạn sẽ được gửi kèm — chỉ cần 1 chạm nữa.',
    applyCta: 'Ứng tuyển 1 chạm →',
    jdLink: 'Xem mô tả công việc đầy đủ',
    doneNo: 'Đã ghi nhận. Chúng tôi sẽ chỉ đề cử bạn cho những vị trí phù hợp.',
    doneCta: 'Xem vị trí có thể ứng tuyển ngay',
    errSave: 'Lưu không thành công. Vui lòng thử lại sau.',
  },
  ko: {
    title: '질문 하나 | FYI',
    badHead: '링크가 만료되었거나 올바르지 않아요',
    badSub: '메일의 버튼을 다시 눌러주세요. 계속 안 되면 답장 주시면 도와드릴게요.',
    toJobs: '채용 공고 보러가기',
    formHead: (n) => (n ? `${n}님, 한 번만 눌러주세요` : '한 번만 눌러주세요'),
    formSub: 'FYI가 회원님을 한 포지션에 추천하려는데, 이력서에 이 부분이 없어서요. 하나만 골라주세요 — 로그인 없이 10초.',
    save: '확인',
    saving: '저장 중…',
    fine: '답변은 이 포지션 추천 여부를 정하는 데만 사용됩니다.',
    doneHead: (n) => (n ? `감사합니다, ${n}님` : '감사합니다'),
    doneYes: '조건이 맞으면 1~2일 안에 포지션 정보와 원탭 지원 링크를 보내드릴게요.',
    doneYesJob: '포지션이 열려 있어요. 등록된 이력서가 함께 전달됩니다 — 한 번만 더 누르면 지원 완료.',
    applyCta: '원탭 지원하기 →',
    jdLink: '공고 전체 보기',
    doneNo: '확인했습니다. 조건이 맞는 포지션에만 추천해 드릴게요.',
    doneCta: '지금 지원할 수 있는 공고 보기',
    errSave: '저장에 실패했어요. 잠시 후 다시 시도해 주세요.',
  },
  en: {
    title: 'One quick question | FYI',
    badHead: 'This link has expired or is invalid',
    badSub: 'Please tap the button in the email again. If it still fails, just reply and we will help.',
    toJobs: 'Browse job posts',
    formHead: (n) => (n ? `${n}, just one tap` : 'Just one tap'),
    formSub: 'FYI is considering you for a position, but your CV does not say. Pick one — no login, 10 seconds.',
    save: 'Confirm',
    saving: 'Saving…',
    fine: 'Your answer is only used to decide whether to nominate you for this position.',
    doneHead: (n) => (n ? `Thanks, ${n}!` : 'Thank you!'),
    doneYes: 'If you fit, FYI will send the position details and a one-tap apply link within 1–2 days.',
    doneYesJob: 'The position is open. Your registered CV goes with it — one more tap to apply.',
    applyCta: 'Apply in one tap →',
    jdLink: 'See the full job description',
    doneNo: 'Noted. We will only put you forward for positions that fit.',
    doneCta: 'See jobs you can apply to now',
    errSave: 'Could not save. Please try again in a moment.',
  },
}

export default function ScreenLanding({ valid, token, q, j, cta, uiLang, name }) {
  const t = T[uiLang] || T.vi
  const def = SCREEN_QUESTIONS[q]
  const [answer, setAnswer] = useState(cta || null)
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)
  const [err, setErr] = useState('')

  const save = async () => {
    if (!answer || saving) return
    setSaving(true); setErr('')
    try {
      const r = await fetch('/api/screen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, q, answer }),
      })
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || 'failed')
      setDone(true)
    } catch {
      setErr(t.errSave)
    }
    setSaving(false)
  }

  if (!valid) {
    return (
      <Shell t={t}>
        <h1 className="wt-h">{t.badHead}</h1>
        <p className="wt-sub">{t.badSub}</p>
        <a className="wt-btn wt-btn-ghost" href="/jobs">{t.toJobs}</a>
      </Shell>
    )
  }

  if (done) {
    const yesJob = answer !== 'no' && j
    return (
      <Shell t={t}>
        <div className="wt-check">✓</div>
        <h1 className="wt-h">{t.doneHead(name)}</h1>
        <p className="wt-sub">{answer === 'no' ? t.doneNo : yesJob ? t.doneYesJob : t.doneYes}</p>
        {yesJob ? (
          <>
            <a className="wt-btn" href={`/api/resume/recommend?t=${encodeURIComponent(token)}&j=${j}`}>{t.applyCta}</a>
            <a className="wt-link" href={`/ktc/jobs/${j}`}>{t.jdLink}</a>
          </>
        ) : (
          <a className="wt-btn" href="/jobs">{t.doneCta}</a>
        )}
      </Shell>
    )
  }

  return (
    <Shell t={t}>
      <h1 className="wt-h">{t.formHead(name)}</h1>
      <p className="wt-sub">{t.formSub}</p>

      <p className="wt-label">{def.title[uiLang] || def.title.vi}</p>
      <div className="wt-stack">
        {def.answers.map((a) => (
          <button key={a.value} className={`wt-opt${answer === a.value ? ' wt-on' : ''}`} onClick={() => setAnswer(a.value)}>
            {a[uiLang] || a.vi}
          </button>
        ))}
      </div>

      {err && <p className="wt-err">{err}</p>}

      <button className="wt-btn" onClick={save} disabled={!answer || saving}>
        {saving ? t.saving : t.save}
      </button>
      <p className="wt-fine">{t.fine}</p>
    </Shell>
  )
}

function Shell({ children, t }) {
  return (
    <>
      <Head>
        <title>{t?.title || T.vi.title}</title>
        <meta name="robots" content="noindex" />
      </Head>
      <div className="wt-page"><div className="wt-inner">{children}</div></div>
      <style jsx global>{`
        body { margin: 0; background: #f2f4f6; font-family: 'Pretendard', -apple-system, 'Segoe UI', Roboto, Arial, sans-serif; color: #191F28; }
        .wt-page { min-height: 100vh; padding: 40px 16px 64px; }
        .wt-inner { max-width: 520px; margin: 0 auto; background: #fff; border: 1px solid #E5E8EB; border-radius: 16px; padding: 32px 24px 28px; }
        .wt-h { font-size: 22px; font-weight: 800; letter-spacing: -0.5px; line-height: 1.35; margin: 0 0 8px; }
        .wt-sub { font-size: 14px; color: #8B95A1; line-height: 1.6; margin: 0 0 22px; }
        .wt-label { font-size: 13px; font-weight: 700; color: #4E5968; margin: 0 0 10px; }
        .wt-stack { display: flex; flex-direction: column; gap: 8px; margin-bottom: 20px; }
        .wt-opt { width: 100%; padding: 15px 16px; border: 1px solid #D1D6DB; border-radius: 10px; background: #fff; color: #4E5968; font-size: 15px; font-weight: 700; cursor: pointer; font-family: inherit; text-align: left; }
        .wt-on { border-color: #ff6000; color: #ff6000; background: #fff7f2; }
        .wt-btn { display: block; width: 100%; padding: 15px; border: none; border-radius: 10px; background: #ff6000; color: #fff; font-size: 15px; font-weight: 700; cursor: pointer; font-family: inherit; text-align: center; text-decoration: none; box-sizing: border-box; }
        .wt-btn:disabled { opacity: 0.45; cursor: not-allowed; }
        .wt-btn-ghost { background: #fff; color: #4E5968; border: 1px solid #D1D6DB; }
        .wt-fine { font-size: 12px; color: #B0B8C1; text-align: center; margin: 12px 0 0; line-height: 1.5; }
        .wt-err { font-size: 13px; color: #E5484D; margin: 0 0 12px; }
        .wt-check { width: 52px; height: 52px; border-radius: 50%; background: #E7F6EC; color: #16a34a; font-size: 26px; font-weight: 800; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; }
      `}</style>
    </>
  )
}
