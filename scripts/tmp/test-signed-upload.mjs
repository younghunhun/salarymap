// 서명 업로드 URL(upsert) 지원 확인 — 테스트 파일은 끝에 지운다
import { sb } from '../outreach/lib.mjs'
const path = 'zz-signed-upload-test.pdf'
const { data, error } = await sb.storage.from('resumes').createSignedUploadUrl(path, { upsert: true })
console.log('sign', error || { path: data.path, hasToken: !!data.token })
const buf = Buffer.from('%PDF-1.4 test')
const up = await sb.storage.from('resumes').uploadToSignedUrl(data.path, data.token, buf, { contentType: 'application/pdf', upsert: true })
console.log('upload', up.error || up.data)
const up2 = await sb.storage.from('resumes').uploadToSignedUrl(data.path, data.token, buf, { contentType: 'application/pdf', upsert: true })
console.log('re-upload same token (expect error, one-shot)', up2.error?.message || up2.data)
const { data: s2 } = await sb.storage.from('resumes').createSignedUploadUrl(path, { upsert: true })
const up3 = await sb.storage.from('resumes').uploadToSignedUrl(s2.path, s2.token, buf, { contentType: 'application/pdf', upsert: true })
console.log('overwrite with new token', up3.error || 'ok')
console.log('cleanup', (await sb.storage.from('resumes').remove([path])).error || 'ok')
