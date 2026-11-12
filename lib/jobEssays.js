/* 공고별 자기소개서 문항 — 기업이 변별용 자소서를 요청한 KTC 공고만 등록한다.
   키는 공고코드(jobs.source_id). 등록된 공고는
   · /ktc/jobs/[id] 지원 시 문항 작성 후 접수 (components/ktc/KtcApply.js)
   · 기존 지원자는 메일 링크 /ktc/essay?t=…&j=… 로 작성 (scripts/outreach/essay-send.mjs)
   답변은 job_essays 에 (공고, 이메일) 1행으로 저장된다 — 다시 내면 덮어쓴다.

   문항을 raw_payload.ktc 에 안 넣는 이유: KTC 웹훅이 공고를 갱신하면 raw_payload 가 덮인다.

   type: 'text' = 서술형(필수) · 'yesno' = 예/아니오(필수)
   deadline: 메일·착지 페이지에 보여줄 기한 문구(선택) */

export const JOB_ESSAYS = {
  // PickCare 요청(11/12 김호현) — 합격자 변별용 + 11/19 매칭위크 대면면접 참석 확인. 기한 11/16 오전.
  R248: {
    deadline: { vi: 'trước sáng 16/11', ko: '11/16 오전까지', en: 'by the morning of 16/11' },
    questions: [
      {
        key: 'pet',
        type: 'text',
        label: {
          vi: 'Kinh nghiệm nuôi thú cưng và mức độ quan tâm của bạn đến các dịch vụ dành cho thú cưng',
          ko: '반려동물 양육 경험과 반려동물 서비스에 대한 관심도',
          en: 'Your experience raising pets and your interest in pet services',
        },
      },
      {
        key: 'expect',
        type: 'text',
        label: {
          vi: 'Bạn kỳ vọng điều gì khi gia nhập PickCare?',
          ko: '입사를 통해 기대하는 점',
          en: 'What do you expect from joining PickCare?',
        },
      },
      {
        key: 'ai_tools',
        type: 'text',
        label: {
          vi: 'Các công cụ AI bạn đang sử dụng',
          ko: '활용하고 계신 AI 도구',
          en: 'AI tools you currently use',
        },
      },
      {
        key: 'plan_dev',
        type: 'text',
        label: {
          vi: 'Năng lực lên ý tưởng và phát triển — Phần phát triển chính sẽ được trao đổi và thực hiện cùng lập trình viên Backend nội bộ. Sau khi thảo luận ý tưởng, bạn có thể tự phát triển các nội dung như yếu tố gamification giúp tăng retention cho PickCare mà không cần bản thiết kế (design) không?',
          ko: '기획·개발 역량 — 메인 개발은 내부 백엔드 개발자와 논의하여 작업할 예정입니다. 픽케어 리텐션을 위한 게이미피케이션 요소 등의 콘텐츠를 기획 논의 후 디자인 작업 없이 개발할 수 있는지 알려주세요.',
          en: 'Planning & development — Core development will be done together with our in-house backend developer. After discussing the plan, could you build content such as gamification elements for PickCare retention without a design handoff?',
        },
      },
      {
        key: 'interview_1119',
        type: 'yesno',
        label: {
          vi: 'Bạn có thể tham gia phỏng vấn trực tiếp ngày 19/11/2026 tại Cobi Home (TP.HCM) không?',
          ko: '11/19(목) 코비홈(호치민) 대면 면접에 참석할 수 있나요?',
          en: 'Can you attend the in-person interview on 19/11/2026 at Cobi Home (HCMC)?',
        },
      },
    ],
  },
}

// source_id 뒤에 접미사가 붙어 오는 경우가 있어 앞의 공고코드만 본다(lib/ktcJobs.js baseCode 와 같은 규칙)
export const essayFor = (code) => {
  const base = (String(code || '').trim().toUpperCase().match(/^([A-Z]{2,6}\d{3,4}|[RVK]\d{1,4})/) || [])[1]
  return (base && JOB_ESSAYS[base]) || null
}

const MAX_LEN = 4000

/* 답변 검증 — 문항 키만 받고, 전부 필수. 통과하면 정리된 answers, 아니면 { error }. */
export function cleanAnswers(essay, raw) {
  const out = {}
  for (const q of essay.questions) {
    const v = String((raw || {})[q.key] ?? '').trim()
    if (q.type === 'yesno') {
      if (v !== 'yes' && v !== 'no') return { error: `missing:${q.key}` }
      out[q.key] = v
    } else {
      if (!v) return { error: `missing:${q.key}` }
      out[q.key] = v.slice(0, MAX_LEN)
    }
  }
  return { answers: out }
}

/* 서버 지원 경로 공통 차단 — 자소서 공고인데 이 사람 답이 없으면 막고 /ktc 공고 페이지로 보낸다.
   /api/job-applications(일반·유사공고·claim·/ktc) 와 /api/resume/quick-apply(추천메일 원탭) 가 쓴다.
   job: { id, source, source_id } · 반환: null(통과) 또는 { error, redirect } */
export async function essayGate(sb, job, { userId, email }) {
  if (!job || job.source !== 'ktc' || !essayFor(job.source_id)) return null
  const mail = String(email || '').trim().toLowerCase()
  const checks = []
  if (userId) checks.push(sb.from('job_essays').select('id').eq('job_id', job.id).eq('user_id', userId).limit(1))
  if (mail) checks.push(sb.from('job_essays').select('id').eq('job_id', job.id).eq('email', mail).limit(1))
  for (const r of await Promise.all(checks)) if (r.data?.length) return null
  return { error: 'essay_required', redirect: `/ktc/jobs/${job.id}?essay=1` }
}
