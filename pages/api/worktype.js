import supabaseAdmin from '../../lib/supabaseAdmin'
import { verifyToken } from '../../lib/campaignToken'

// 근무 가능 조건 착지 페이지(/worktype)의 저장 엔드포인트 — 로그인 없이 동작한다.
// 인증은 메일 링크의 HMAC 토큰(user_id). /api/salary-update 와 같은 최소권한 설계:
//   · 토큰에 든 user_id 의 프로필 1건, work_type 한 칼럼만 쓴다
//   · 응답에 프로필 데이터를 싣지 않는다
// 저장값은 events(coldmail_worktype_fill).meta 에도 남는다 — 프로필이 나중에 무엇에
// 덮여도 응답 원본이 남는 append-only 기록(어학 8/5 유실 사고의 교훈).

const TYPES = ['On-site', 'All', 'Remote']

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { token, cta, work_type: workType } = req.body || {}
  const claim = verifyToken(token)
  if (!claim?.userId) return res.status(401).json({ error: 'invalid_token' })
  if (!TYPES.includes(workType)) return res.status(400).json({ error: 'invalid_work_type' })

  const { data: prof, error: findErr } = await supabaseAdmin
    .from('user_profiles').select('id').eq('id', claim.userId).maybeSingle()
  if (findErr) return res.status(500).json({ error: findErr.message })
  if (!prof) return res.status(404).json({ error: 'profile_not_found' })

  const { error: upErr } = await supabaseAdmin
    .from('user_profiles')
    .update({ work_type: workType, updated_at: new Date().toISOString() })
    .eq('id', prof.id)
  if (upErr) return res.status(500).json({ error: upErr.message })

  await supabaseAdmin.from('events').insert({
    event: 'coldmail_worktype_fill',
    user_id: prof.id,
    meta: { campaign: claim.campaign, cta: cta || null, work_type: workType },
  })

  return res.status(200).json({ ok: true })
}
