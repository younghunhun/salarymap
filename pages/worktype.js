import { useState } from 'react'
import Head from 'next/head'
import supabaseAdmin from '../lib/supabaseAdmin'
import { verifyToken } from '../lib/campaignToken'

/* 근무 가능 조건 콜드메일 착지 페이지 — 로그인 없이 원탭으로 확정한다.
   /worktype?t=<token(user_id)>&cta=onsite|all|remote

   /salary-update 와 같은 설계: 수신자는 전원 로그아웃 상태로 메일에서 들어오므로
   /profile 로 보내면 구글 로그인 한 단계에서 대부분 빠진다. 토큰이 이미 누구인지 담고 있다.

   cta 는 메일에서 누른 버튼이다. 값을 바로 저장하지 않고 화면만 미리 맞춰준다(/lang 과 동일) —
   메일 보안 스캐너가 링크를 긁는 것과 사람이 누른 것을 구분할 수 없어서, 저장은 반드시
   이 화면의 확인 버튼을 거친다.

   저장 단위는 프로필 폼과 동일 — user_profiles.work_type 의 'All' / 'On-site' / 'Remote'
   세 값을 그대로 쓴다. 새 값 체계를 만들지 않는 이유: 이미 답한 466명과 뜻이 달라지면
   인재풀 필터(TalentPoolView workFilter)가 두 집단을 한 칸에 못 세운다.

   출근 가능 도시는 묻지 않는다 — 발송 대상 3,189명 중 2,814명(88%)이 location 을 갖고 있고
   그중 86%가 HCM/하노이/다낭으로 정규화된다. 온사이트 가능자는 자기 도시에서 출근하는 것이
   기본이라 한 문항을 더 붙이면 "버튼 하나만"이라는 메일 카피와 어긋난다. */

export async function getServerSideProps({ query }) {
  const claim = verifyToken(query.t)
  if (!claim?.userId) return { props: { valid: false, uiLang: normLang(query.lang) } }

  const { data: prof } = await supabaseAdmin
    .from('user_profiles').select('id, full_name, work_type').eq('id', claim.userId).maybeSingle()
  if (!prof) return { props: { valid: false, uiLang: normLang(query.lang) } }

  // 도달=클릭으로 센다 — 프리페치와 사람이 구분 안 되지만 기존 콜드메일 지표와 같은 조건.
  try {
    await supabaseAdmin.from('events').insert({
      event: 'coldmail_worktype_click',
      user_id: prof.id,
      meta: { campaign: claim.campaign, cta: query.cta || null },
    })
  } catch {}

  return {
    props: {
      valid: true,
      token: query.t,
      cta: CTA_VALUE[query.cta] || null,
      uiLang: normLang(query.lang),
      name: prof.full_name || '',
      initialType: prof.work_type || null,
    },
  }
}

const LANGS = ['vi', 'ko', 'en']
const normLang = (v) => (LANGS.includes(String(v || '')) ? String(v) : 'vi')

// 메일 버튼(cta) → work_type 값. 발송 스크립트 BUTTONS 와 짝이며 어긋나면 프리셀렉트가 죽는다.
const CTA_VALUE = { onsite: 'On-site', all: 'All', remote: 'Remote' }
const TYPES = ['On-site', 'All', 'Remote']

// 문구는 이 페이지 전용이라 전역 사전에 넣지 않는다(/salary-update 와 같은 이유).
const T = {
  vi: {
    title: 'Hình thức làm việc | FYI',
    badHead: 'Liên kết đã hết hạn hoặc không hợp lệ',
    badSub: 'Vui lòng bấm lại nút trong email. Nếu vẫn không được, hãy trả lời email này để chúng tôi hỗ trợ.',
    toJobs: 'Xem tin tuyển dụng',
    formHead: (n) => (n ? `${n} ơi, chỉ cần một lần bấm` : 'Chỉ cần một lần bấm'),
    formSub: 'Việc xem xét đề cử của bạn đang chờ xác nhận hình thức làm việc. Chọn một mục — không cần đăng nhập, 10 giây — việc xem xét sẽ được tiếp tục ngay.',
    typeLabel: 'Bạn có thể làm việc theo hình thức nào?',
    type: { 'On-site': 'Đi làm tại văn phòng được', All: 'Hình thức nào cũng được', Remote: 'Chỉ làm từ xa được' },
    save: 'Xác nhận và tiếp tục xem xét',
    saving: 'Đang lưu…',
    fine: 'Thông tin này chỉ dùng để chọn vị trí phù hợp với bạn.',
    doneHead: (n) => (n ? `Đã xác nhận, ${n} ơi` : 'Đã xác nhận'),
    doneSub: 'Việc xem xét đề cử sẽ được tiếp tục. Chúng tôi sẽ chỉ đề cử bạn cho những vị trí phù hợp.',
    doneCta: 'Xem vị trí có thể ứng tuyển ngay',
    toProfile: 'Chỉnh sửa thêm trong hồ sơ',
    errSave: 'Lưu không thành công. Vui lòng thử lại sau.',
  },
  ko: {
    title: '근무 가능 조건 | FYI',
    badHead: '링크가 만료되었거나 올바르지 않아요',
    badSub: '메일의 버튼을 다시 눌러주세요. 계속 안 되면 답장 주시면 도와드릴게요.',
    toJobs: '채용 공고 보러가기',
    formHead: (n) => (n ? `${n}님, 한 번만 눌러주세요` : '한 번만 눌러주세요'),
    formSub: '담당자 추천 검토가 근무 조건 확인 대기 중이에요. 하나만 골라주시면 검토가 바로 재개됩니다 — 로그인 없이 10초.',
    typeLabel: '어떤 형태로 근무 가능하신가요?',
    type: { 'On-site': '사무실 출근 가능', All: '어떤 형태든 괜찮아요', Remote: '원격 근무만 가능' },
    save: '확인하고 검토 재개하기',
    saving: '저장 중…',
    fine: '이 정보는 회원님께 맞는 포지션을 고르는 데만 사용됩니다.',
    doneHead: (n) => (n ? `확인됐습니다, ${n}님` : '확인됐습니다'),
    doneSub: '추천 검토가 재개돼요. 조건이 맞는 포지션에만 추천해 드릴게요.',
    doneCta: '지금 지원할 수 있는 공고 보기',
    toProfile: '내 프로필에서 더 수정하기',
    errSave: '저장에 실패했어요. 잠시 후 다시 시도해 주세요.',
  },
  en: {
    title: 'Your work arrangement | FYI',
    badHead: 'This link has expired or is invalid',
    badSub: 'Please tap the button in the email again. If it still fails, just reply and we will help.',
    toJobs: 'Browse job posts',
    formHead: (n) => (n ? `${n}, just one tap` : 'Just one tap'),
    formSub: 'Your nomination review is waiting on your work arrangement. Pick one — no login, 10 seconds — and the review resumes right away.',
    typeLabel: 'How can you work?',
    type: { 'On-site': 'I can work on-site', All: 'Any arrangement works', Remote: 'Remote only' },
    save: 'Confirm and resume review',
    saving: 'Saving…',
    fine: 'This is only used to pick positions that fit you.',
    doneHead: (n) => (n ? `Confirmed, ${n}` : 'Confirmed'),
    doneSub: 'Your nomination review will resume. We will only put you forward for positions that fit.',
    doneCta: 'See jobs you can apply to now',
    toProfile: 'Edit more in my profile',
    errSave: 'Could not save. Please try again in a moment.',
  },
}

export default function WorktypeLanding({ valid, token, cta, uiLang, name, initialType }) {
  const t = T[uiLang] || T.vi
  const [type, setType] = useState(cta || initialType || null)
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)
  const [err, setErr] = useState('')

  const save = async () => {
    if (!type || saving) return
    setSaving(true); setErr('')
    try {
      const r = await fetch('/api/worktype', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, cta, work_type: type }),
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
    return (
      <Shell t={t}>
        <div className="wt-check">✓</div>
        <h1 className="wt-h">{t.doneHead(name)}</h1>
        <p className="wt-sub">{t.doneSub}</p>
        <a className="wt-btn" href="/jobs">{t.doneCta}</a>
        <a className="wt-link" href="/profile">{t.toProfile}</a>
      </Shell>
    )
  }

  return (
    <Shell t={t}>
      <h1 className="wt-h">{t.formHead(name)}</h1>
      <p className="wt-sub">{t.formSub}</p>

      <p className="wt-label">{t.typeLabel}</p>
      <div className="wt-stack">
        {TYPES.map((v) => (
          <button key={v} className={`wt-opt${type === v ? ' wt-on' : ''}`} onClick={() => setType(v)}>
            {t.type[v]}
          </button>
        ))}
      </div>

      {err && <p className="wt-err">{err}</p>}

      <button className="wt-btn" onClick={save} disabled={!type || saving}>
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
        .wt-link { display: block; text-align: center; margin-top: 14px; font-size: 13.5px; font-weight: 600; color: #8B95A1; text-decoration: none; }
        .wt-fine { font-size: 12px; color: #B0B8C1; text-align: center; margin: 12px 0 0; line-height: 1.5; }
        .wt-err { font-size: 13px; color: #E5484D; margin: 0 0 12px; }
        .wt-check { width: 52px; height: 52px; border-radius: 50%; background: #E7F6EC; color: #16a34a; font-size: 26px; font-weight: 800; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; }
      `}</style>
    </>
  )
}
