import { sb, fetchAll } from '../outreach/lib.mjs'
const jobs = await fetchAll(() => sb.from('jobs').select('source_id,title,requirements,preferred,description').eq('source','ktc').gte('created_at','2026-07-01').order('created_at'))
const T = jobs.map(j => ({ id:j.source_id, t:[j.requirements,j.preferred,j.description].join(' ').replace(/việt\s*nam/gi,'VN') }))
const attrs = {
  '연차(kinh nghiệm N năm)': /(\d+\s*\+?\s*(năm|year|yrs)|\d+년|kinh nghiệm)/i,
  '전공 지정(chuyên ngành)': /(chuyên ngành|major|전공|tốt nghiệp.*(ngành|khoa))/i,
  '학위(ĐH/CĐ/Bachelor)': /(đại học|cao đẳng|bachelor|degree|đh\b|cđ\b|대졸|학사|trung cấp)/i,
  '나이(tuổi)': /(\d{2}\s*[-–~]\s*\d{2}\s*tuổi|tuổi từ|age\s*\d|dưới \d{2} tuổi|sinh năm|\d{2}세)/i,
  '성별': /(giới tính|ưu tiên (nam|nữ)\b|\bnữ\b|gender|여성|남성)/i,
  '한국어': /(tiếng hàn|korean|topik|한국어|hàn ngữ)/i,
  '영어': /(tiếng anh|english|toeic|ielts|영어)/i,
  '중국어': /(tiếng trung|chinese|hsk|中文|중국어|mandarin)/i,
  '일본어': /(tiếng nhật|japanese|jlpt|일본어)/i,
  'MS Office/엑셀': /(excel|ms office|word|powerpoint|tin học văn phòng|office skills)/i,
  'ERP/SAP/회계SW': /(sap\b|erp|misa|fast accounting|oracle)/i,
  '디자인툴': /(photoshop|illustrator|figma|premiere|after effects|canva|adobe)/i,
  '운전면허(bằng lái)': /(bằng lái|driver'?s? licen|driving licen|운전)/i,
  '출장 가능(đi công tác)': /(công tác|business trip|travel|출장)/i,
  '교대/야근(ca)': /(làm ca|ca đêm|shift|tăng ca|overtime|교대)/i,
  '지역 거주/통근(sinh sống, đi lại)': /(sinh sống tại|cư trú|đi lại|commut|gần|khu vực|거주|residing)/i,
  '외모/태도(ngoại hình, nhanh nhẹn)': /(ngoại hình|appearance|nhanh nhẹn|chịu được áp lực|cẩn thận|trung thực|chăm chỉ|hoạt bát)/i,
  '한국 기업 경력 우대': /(công ty hàn|korean compan|한국 기업|한국계|hàn quốc.*(công ty|kinh nghiệm))/i,
  '관리 경험(quản lý team)': /(quản lý (đội|nhóm|team)|team lead|leadership|managing|quản lý \d+ người)/i,
  '산업 도메인(sản xuất/logistics/F&B 등)': /(sản xuất|manufactur|nhà máy|factory|logistics|xuất nhập khẩu|f&b|thực phẩm|chăn nuôi|thú y|dệt may|textile|hóa chất|chemical|game|fintech|e-?commerce|thương mại điện tử|giáo dục|education|bất động sản|real estate)/i,
  '포트폴리오/GitHub': /(portfolio|github|behance|dribbble|작업물)/i,
  '즉시 출근(có thể đi làm ngay)': /(đi làm ngay|start immediately|available|onboard sớm|입사 가능)/i,
  '계약형태(thực tập/full-time)': /(thực tập|intern|full-?time|part-?time|hợp đồng|contract)/i,
  '급여 협의/명시': /(lương|salary|thỏa thuận|negotiable|triệu|vnd|usd|\$)/i,
}
console.log(`7월 이후 KTC 공고 ${jobs.length}개 자격요건·우대·본문에서 언급 빈도\n`)
const rows = Object.entries(attrs).map(([k,re]) => [k, T.filter(x=>re.test(x.t)).length]).sort((a,b)=>b[1]-a[1])
for (const [k,n] of rows) console.log(`${String(n).padStart(4)}  ${(100*n/jobs.length).toFixed(0).padStart(3)}%  ${k}`)
// 나이 조건 샘플
console.log('\n나이 조건 샘플:'); for (const x of T) { const m = x.t.match(/.{0,30}(\d{2}\s*[-–~]\s*\d{2}\s*tuổi|tuổi từ.{0,15}|dưới \d{2} tuổi|sinh năm.{0,12}).{0,10}/i); if (m) console.log(' ', x.id, m[0].replace(/\s+/g,' ')) }
