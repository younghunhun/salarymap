import { createClient } from '@supabase/supabase-js'
import formidable from 'formidable'
import fs from 'fs'
import { bucketFor, storagePathFor, saveProfileFileUrl } from '../../../lib/profileFileSave'

export const config = { api: { bodyParser: false } }

// ⚠️ 서버 경유 업로드 — Vercel 함수 요청 본문 한도(4.5MB) 를 넘는 파일은 여기 닿기 전에
// 413 으로 잘린다(7~9월 "Upload failed" 약 60건, 전부 4.6~4.9MB). 웹은 /api/profile/upload-direct
// (Storage 직접 업로드) 로 옮겼고, 이 엔드포인트는 모바일 앱(salary-fyi) 호환용으로 유지한다.
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

  const form = formidable({ maxFileSize: 10 * 1024 * 1024 })
  const [fields, files] = await form.parse(req)

  const type = fields.type?.[0] // 'photo' or 'resume'
  const file = files.file?.[0]
  if (!file || !type) return res.status(400).json({ error: 'file and type required' })

  const bucket = bucketFor(type)
  const path = storagePathFor(user.id, type, file.originalFilename)

  const fileBuffer = fs.readFileSync(file.filepath)
  const { error: uploadErr } = await supabase.storage.from(bucket).upload(path, fileBuffer, {
    contentType: file.mimetype,
    upsert: true,
  })
  if (uploadErr) return res.status(500).json({ error: uploadErr.message })

  const publicUrl = await saveProfileFileUrl({ supabase, user, type, path, headers: req.headers })
  res.json({ url: publicUrl })
}
