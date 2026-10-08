import { supabase } from './supabaseClient'

// 웹 이력서/사진 업로드 — 브라우저 → Storage 직접 업로드(서명 URL) → 프로필에 URL 기록.
// 서버 경유(/api/profile/upload)는 Vercel 요청 본문 한도(4.5MB)에 걸려 4.6~4.9MB 이력서가
// "Upload failed" 로 죽었다(7~9월 약 60건). 성공 시 { url }, 실패 시 throw(Error.message 가 사유).
export async function uploadProfileFile({ token, type, file, source }) {
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
  if (source) headers['X-Resume-Source'] = source
  const call = async (body) => {
    const r = await fetch('/api/profile/upload-direct', { method: 'POST', headers, body: JSON.stringify(body) })
    const j = await r.json().catch(() => ({}))
    if (!r.ok) throw new Error(j.error || 'Upload failed')
    return j
  }
  const { bucket, path, token: signed } = await call({ step: 'sign', type, filename: file.name })
  const { error } = await supabase.storage.from(bucket).uploadToSignedUrl(path, signed, file, {
    contentType: file.type || (type === 'photo' ? 'image/jpeg' : 'application/pdf'),
    upsert: true,
  })
  if (error) throw new Error(error.message || 'Upload failed')
  return call({ step: 'done', type, path })
}
