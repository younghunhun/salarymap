// 원탭 스크리닝 질문 정의 — /screen 랜딩, /api/screen, scripts/outreach/screen-*-coldmail.mjs 가 공유한다.
// 이력서에 안 적히는 경험(드론 조립·ERP·납땜 등)을 추천 전에 한 번 묻는 용도. 답은 events(coldmail_screen_answer).meta 에만
// 남기고 프로필 컬럼은 안 만든다 — 질문마다 컬럼을 늘리지 않기 위해서. 집계는 events 를 q 로 필터해 읽는다.
// answers[].value 가 메일 버튼 cta 이자 저장값. 페이지·API·스크립트 셋이 이 표 하나를 보므로 어긋날 수 없다.
export const SCREEN_QUESTIONS = {
  drone: {
    title: {
      vi: 'Bạn đã từng lắp ráp drone (máy bay không người lái) chưa?',
      ko: '드론을 직접 조립해 본 경험이 있으신가요?',
      en: 'Have you ever assembled drones?',
    },
    answers: [
      { value: 'yes2', vi: 'Rồi — từ 2 năm trở lên', ko: '네 — 2년 이상', en: 'Yes — 2+ years' },
      { value: 'yes', vi: 'Rồi — dưới 2 năm hoặc tự làm / sở thích', ko: '네 — 2년 미만 또는 취미·자작', en: 'Yes — under 2 years or hobby' },
      { value: 'no', vi: 'Chưa từng', ko: '아니요', en: 'No' },
    ],
  },
}

export const screenAnswerValues = (q) => (SCREEN_QUESTIONS[q]?.answers || []).map((a) => a.value)
