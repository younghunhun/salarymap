// R203 Hyperstar 공고 문구 수정 — "인턴 적합" 삭제·풀타임 필수(재학생 불가) 명시. 어드민 PUT 과 동일하게 raw_payload.ktc 스냅샷의 JD 4블록을 걷어낸다.
import { sb } from '../outreach/lib.mjs'
const ID = '78e17892-ca73-4bb3-8e6e-191d4691b631'
const { data: j, error } = await sb.from('jobs').select('description, raw_payload, source').eq('id', ID).single()
if (error) throw error
const swaps = [
  ['- Phù hợp với intern, fresher hoặc ứng viên chưa có nhiều kinh nghiệm nhưng sẵn sàng học hỏi.\n- Có thể đi làm full-time từ thứ Hai đến thứ Sáu.',
   '- Phù hợp với fresher hoặc ứng viên đã tốt nghiệp, chưa có nhiều kinh nghiệm nhưng sẵn sàng học hỏi.\n- Bắt buộc đi làm full-time từ thứ Hai đến thứ Sáu tại văn phòng (không nhận part-time; không phù hợp với sinh viên còn đang đi học).'],
  ['Hình thức: Full-time ', 'Hình thức: Full-time (thứ Hai – thứ Sáu, không part-time) '],
]
let d = j.description
for (const [a, b] of swaps) { if (!d.includes(a)) throw new Error('원문 없음: ' + a.slice(0, 50)); d = d.replace(a, b) }
const rp = j.raw_payload ? { ...j.raw_payload } : null
if (rp?.ktc) { const k = { ...rp.ktc }; delete k.description; delete k.responsibilities; delete k.requirements; delete k.benefits; rp.ktc = k }
const dry = !process.argv.includes('--apply')
console.log(dry ? '[dry-run]' : '[apply]', 'source=', j.source, '| ktc 스냅샷 블록 제거:', !!j.raw_payload?.ktc)
for (const [, b] of swaps) console.log('  →', b.replace(/\n/g, ' / '))
if (!dry) {
  const { error: e2 } = await sb.from('jobs').update({ description: d, ...(rp ? { raw_payload: rp } : {}) }).eq('id', ID)
  if (e2) throw e2
  console.log('✅ 수정 완료')
}
