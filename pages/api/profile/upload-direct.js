import { createClient } from '@supabase/supabase-js'
import { bucketFor, storagePathFor, saveProfileFileUrl } from '../../../lib/profileFileSave'

// 웹 이력서/사진 업로드 — 파일이 Vercel 함수를 거치지 않고 브라우저에서 Storage 로 바로 올라간다.
// 서버 경유(/api/profile/upload)는 요청 본문 4.5MB 한도에 걸려 4.6~4.9MB 이력서가 전부 실패했다.
//   step 'sign' : { type, filename } → { bucket, path, token }   (서명 업로드 URL 발급)
//   step 'done' : { type, path }     → { url }                    (업로드 뒤 프로필에 URL 기록)
// 클라이언트는 lib/uploadProfileFile.js 를 쓴다.
const supabase = createClient(
  (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim(),
  (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim(),
)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method not allowed' })

  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) return res.status(401).json({ error: 'unauthorized' })

  const { data: { user }, error: authErr } = await supabase.auth.getUser(token)
  if (authErr || !user) return res.status(401).json({ error: 'unauthorized' })

  const { step, type, filename, path } = req.body || {}
  if (!['photo', 'resume'].includes(type)) return res.status(400).json({ error: 'type required' })
  const bucket = bucketFor(type)

  if (step === 'sign') {
    const target = storagePathFor(user.id, type, filename)
    const { data, error } = await supabase.storage.from(bucket).createSignedUploadUrl(target, { upsert: true })
    if (error) return res.status(500).json({ error: error.message })
    return res.json({ bucket, path: data.path, token: data.token })
  }

  if (step === 'done') {
    // 경로는 서명 단계에서 user.id 로 고정했다 — 남의 경로를 자기 프로필에 꽂지 못하게 다시 확인.
    if (typeof path !== 'string' || !path.startsWith(`${user.id}.`)) return res.status(400).json({ error: 'bad path' })
    const url = await saveProfileFileUrl({ supabase, user, type, path, headers: req.headers })
    return res.json({ url })
  }

  return res.status(400).json({ error: 'step required' })
}
