// R203 공고에 ★졸업생·풀타임·즉시근무 필수 + 중요 역량(인플루언서/SNS 감각·커뮤니케이션) 추가 (10/2 호현 지시)
import { sb } from '../outreach/lib.mjs'
const ID = '78e17892-ca73-4bb3-8e6e-191d4691b631'
const { data: j, error } = await sb.from('jobs').select('description').eq('id', ID).single(); if (error) throw error
const anchor = 'Kinh nghiệm: Fresher/ Junior'
if (!j.description.includes(anchor)) throw new Error('anchor 없음')
if (j.description.includes('★ YÊU CẦU BẮT BUỘC')) { console.log('이미 적용됨'); process.exit(0) }
const block = `★ YÊU CẦU BẮT BUỘC ★
- ĐÃ TỐT NGHIỆP (không nhận sinh viên còn đang đi học hoặc đang làm khóa luận)
- Làm FULL-TIME từ thứ Hai đến thứ Sáu tại văn phòng
- Có thể BẮT ĐẦU NGAY

Điều Hyperstar coi trọng nhất: cảm nhận về influencer/SNS (kinh nghiệm, trải nghiệm hoặc quan tâm thực sự với công việc influencer) và kỹ năng giao tiếp. Kỹ năng AI không phải yếu tố quyết định.

${anchor}`
const d = j.description.replace(anchor, block)
const { error: e2 } = await sb.from('jobs').update({ description: d }).eq('id', ID); if (e2) throw e2
console.log('✅ 공고 수정 완료')
