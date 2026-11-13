import supabaseAdmin from '../../lib/supabaseAdmin'
import { verifyToken } from '../../lib/ktcMailToken'
import { essayFor, essayCode, cleanAnswers } from '../../lib/jobEssays'
import { syncEssaySheet } from '../../lib/essaySheet'

// 자기소개서 저장 — 신원은 둘 중 하나:
//   · Authorization: Bearer <세션>  — /ktc/jobs/[id] 에서 지원하면서 작성
//   · body.token (ktcMailToken)     — 메일 링크 /ktc/essay 에서 작성(로그인 없음)
// 토큰/세션에 든 이메일의 행 하나만 쓴다. 읽어서 돌려주는 것은 없다.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const { jobId, answers: raw, token } = req.body || {}
  if (!jobId) return res.status(400).json({ error: 'jobId required' })

  let email = null, userId = null, source = 'apply', campaign = null
  if (token) {
    const claim = verifyToken(token)
    if (!claim?.email) return res.status(401).json({ error: 'invalid_token' })
    email = claim.email
    campaign = claim.campaign || null
    source = 'mail'
    const { data: p } = await supabaseAdmin.from('user_profiles').select('id').ilike('email', email).limit(1).maybeSingle()
    userId = p?.id || null
  } else {
    const bearer = req.headers.authorization?.replace(/^Bearer\s+/i, '')
    if (!bearer) return res.status(401).json({ error: 'Unauthorized' })
    const { data: { user } } = await supabaseAdmin.auth.getUser(bearer)
    if (!user?.email) return res.status(401).json({ error: 'Unauthorized' })
    email = user.email
    userId = user.id
  }

  const { data: job } = await supabaseAdmin.from('jobs').select('id, source_id').eq('id', jobId).maybeSingle()
  const essay = job && essayFor(job.source_id)
  if (!essay) return res.status(404).json({ error: 'no_essay' })

  const { answers, error: bad } = cleanAnswers(essay, raw)
  if (bad) return res.status(400).json({ error: bad })

  const { error } = await supabaseAdmin.from('job_essays').upsert({
    job_id: job.id,
    email: email.trim().toLowerCase(),
    user_id: userId,
    answers,
    source,
    campaign,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'job_id,email' })
  if (error) return res.status(500).json({ error: error.message })

  await supabaseAdmin.from('events').insert({
    event: 'job_essay_submit',
    user_id: userId,
    meta: { job_id: job.id, code: job.source_id, source, campaign },
  })
  // 시트 미러 실패는 제출 실패가 아니다 — 15분 cron(ktc-push)이 다시 맞춘다
  try { await syncEssaySheet(supabaseAdmin, essayCode(job.source_id)) } catch (e) { console.error('syncEssaySheet:', e.message) }
  return res.status(200).json({ ok: true })
}
