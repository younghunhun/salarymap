import supabaseAdmin from '../../lib/supabaseAdmin'
import { verifyToken } from '../../lib/campaignToken'
import { SCREEN_QUESTIONS, screenAnswerValues } from '../../lib/screenQuestions'

// 원탭 스크리닝 착지 페이지(/screen)의 저장 엔드포인트 — 로그인 없이 동작한다.
// /api/worktype 와 같은 최소권한 설계: 토큰의 user_id 존재만 확인하고 프로필은 건드리지 않는다.
// 답은 events(coldmail_screen_answer) 에만 append 한다 — 같은 사람이 다시 누르면 행이 하나 더 생기고
// 집계는 최신 행을 쓴다. 프로필 컬럼을 안 두는 이유는 lib/screenQuestions.js 참고.

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { token, q, answer } = req.body || {}
  const claim = verifyToken(token)
  if (!claim?.userId) return res.status(401).json({ error: 'invalid_token' })
  if (!SCREEN_QUESTIONS[q]) return res.status(400).json({ error: 'invalid_question' })
  if (!screenAnswerValues(q).includes(answer)) return res.status(400).json({ error: 'invalid_answer' })

  const { data: prof, error: findErr } = await supabaseAdmin
    .from('user_profiles').select('id').eq('id', claim.userId).maybeSingle()
  if (findErr) return res.status(500).json({ error: findErr.message })
  if (!prof) return res.status(404).json({ error: 'profile_not_found' })

  const { error: insErr } = await supabaseAdmin.from('events').insert({
    event: 'coldmail_screen_answer',
    user_id: prof.id,
    meta: { campaign: claim.campaign, q, answer },
  })
  if (insErr) return res.status(500).json({ error: insErr.message })

  return res.status(200).json({ ok: true })
}
