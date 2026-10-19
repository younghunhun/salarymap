import OpenAI from 'openai'
import { SUBMIT_ROLE_VALUES } from '../constants/jobs.js' // 확장자 필수 — plain node 스크립트에서도 import된다

/* 이력서 원문 → user_profiles.cv_tags (jsonb) — 매칭용 세부 태그.

   기존 파서(parseResume.js)는 카드에 보여줄 것(학교·연차·주요이력)을 뽑고, 여기는 공고 조건과
   맞춰 볼 것(세부 직군·산업·한국어 등급·전공 분류·거주 성·성별·출생연도·툴·한국기업 경력)을
   enum 으로 뽑는다. 둘을 한 프롬프트로 합치지 않은 이유: 기존 파서 출력은 화면과 preserveUserEntered
   가 의존하는 shape 이라 흔들면 안 되고, 태그는 enum 강제(json_schema strict)가 필요해서다.

   스키마 설계 근거: 7~10월 KTC 공고 241건 자격요건 언급 빈도(scripts/tmp/probe-jd-attrs-1019.mjs).
   모델: gpt-4o-mini — 같은 100명을 gpt-4o 와 비교해 직군 대분류 91%·한국어 등급 98% 일치, 비용 1/17
   (2026-10-19, scripts/backfill-cv-tags.mjs). 백필(5,778명)과 신규 업로드(parseResumeBuffer)가 공유.
   _v 는 스키마 버전 — 필드를 바꾸면 올리고, 백필은 _v 가 낮은 행을 다시 돈다. */

export const CV_TAGS_VERSION = 1
export const CV_TAGS_MODEL = 'gpt-4o-mini'

const E = (...v) => ({ type: 'string', enum: v })
const NE = (...v) => ({ type: ['string', 'null'], enum: [...v, null] })
const NS = { type: ['string', 'null'] }, NI = { type: ['integer', 'null'] }, NB = { type: ['boolean', 'null'] }
const ARR = (items) => ({ type: 'array', items })
export const CV_ROLE_VALUES = [...SUBMIT_ROLE_VALUES, 'Teacher / Education']
export const CV_INDUSTRIES = ['Manufacturing', 'Electronics', 'Textile / Garment / Footwear', 'Chemical / Materials', 'Agriculture / Livestock / Feed', 'F&B / Food', 'Logistics / Import-Export', 'Construction / Real Estate', 'Retail / E-commerce', 'IT Services / Software', 'Game', 'Fintech / Banking / Insurance', 'Media / Advertising / Agency', 'Education', 'Healthcare / Pharma / Beauty', 'Hospitality / Tourism', 'Consulting / Professional Services', 'Government / NGO', 'Other']
export const CV_MAJORS = ['Korean Language / Korean Studies', 'Other Foreign Language', 'Business / Trade / Economics', 'Accounting / Finance', 'Marketing / Communications', 'Law', 'IT / Computer Science', 'Mechanical / Electrical / Automation', 'Chemical / Materials / Environment', 'Civil / Architecture', 'Design / Arts', 'Education', 'Agriculture / Veterinary / Biology', 'Medical / Pharmacy', 'Other', 'Unknown']
export const CV_LEVELS = ['none', 'basic', 'intermediate', 'business', 'native']
export const LEVEL_RANK = Object.fromEntries(CV_LEVELS.map((l, i) => [l, i]))

export const CV_TAGS_SCHEMA = {
  type: 'object', additionalProperties: false,
  properties: {
    // A. 직무
    role_detail: E(...CV_ROLE_VALUES),
    role_secondary: ARR(E(...CV_ROLE_VALUES)),
    seniority: E('intern', 'fresher', 'junior', 'mid', 'senior', 'lead', 'manager', 'director'),
    yoe_total_months: { type: 'integer' },
    yoe_role_months: { type: 'integer' },
    mgmt_team_size: { type: 'integer' },
    industries: ARR(E(...CV_INDUSTRIES)),
    industry_keywords: ARR({ type: 'string' }),
    korean_company_exp: { type: 'boolean' },
    korean_companies: ARR({ type: 'string' }),
    japanese_company_exp: { type: 'boolean' },
    employment_status: E('employed', 'unemployed_under_6m', 'unemployed_over_6m', 'student', 'unknown'),
    last_end: NS,                // "YYYY-MM" | "Present" | null
    avg_tenure_months: NI,
    factory_experience: { type: 'boolean' },
    // B. 언어
    korean_level: E(...CV_LEVELS),
    korean_cert: NS,             // "TOPIK 5" 등 원문
    korean_evidence: ARR(E('cert', 'major', 'work_usage', 'study_in_korea', 'self_described')),
    english_level: E(...CV_LEVELS),
    english_cert: NS,
    chinese_level: E(...CV_LEVELS),
    japanese_level: E(...CV_LEVELS),
    resume_language: E('vi', 'en', 'ko', 'mixed'),
    // C. 학력
    degree: E('high_school', 'vocational', 'associate', 'bachelor', 'master', 'phd', 'unknown'),
    major_category: E(...CV_MAJORS),
    major_raw: NS,
    university: NS,
    graduation_year: NI,
    gpa: NS,
    studied_in_korea: { type: 'boolean' },
    // D. 인적사항
    gender_stated: NE('male', 'female'),
    gender_inferred: NE('male', 'female'),
    gender_inferred_confidence: { type: 'number' },
    birth_year: NI,
    address_province: NS,
    address_district: NS,
    hometown_province: NS,
    nationality: NS,
    // E. 툴·자격
    excel_level: E('none', 'basic', 'advanced', 'vba_macro'),
    erp_tools: ARR({ type: 'string' }),
    design_tools: ARR({ type: 'string' }),
    certifications: ARR({ type: 'string' }),
    driver_license: { type: 'boolean' },
    // F. 매칭 신호
    travel_willing: NB,
    relocate_willing: NB,
    expected_salary_vnd: NI,
    career_objective_roles: ARR({ type: 'string' }),
    cv_quality: { type: 'integer' },   // 1~5
  },
}
CV_TAGS_SCHEMA.required = Object.keys(CV_TAGS_SCHEMA.properties)

// 오늘 연월이 들어가므로 함수 — employment_status 의 '퇴사 6개월' 기준점
const systemPrompt = () => `You tag Vietnamese candidate resumes for a staffing agency that places people at Korean companies in Vietnam. Return ONLY the JSON object described by the schema. Rules:
- Use only what the resume states. For unknown scalar fields use null (or the enum's 'unknown'/'none' value); for unknown arrays use [].
- role_detail: what the person actually does day to day in their most recent/primary work. "Sales (B2B)" = corporate clients; "Sales (B2C / Retail)" = consumers/stores. Accountants are "Accountant", not "Other". Fresh graduates with no work: use the role their major/objective points to.
- Role disambiguation (common mistakes to avoid): "Account Executive"/"Account Manager" at an agency or sales org is Sales or Marketing, NEVER "Accountant" — "Accountant" is bookkeeping/kế toán only. Marketing interns, content/social/communications/PR/event roles are Marketing (Digital/Content/Brand), not Sales or Telesales; Telesales only for phone-based selling. Receptionist/assistant whose work is Korean interpreting, or Korean Studies graduates doing translation/teaching-assistant work, are "Interpreter / Translator". F&B/hotel/restaurant/store operations managers are "Operations". Bank tellers/credit officers are "Banking". 2D artists/illustrators are "Graphic Designer"; UI/UX only if they design app/web interfaces. Fullstack only when the most recent role clearly covers both frontend and backend; otherwise pick the side they mostly did. ERP/Odoo/SAP developers are "Backend". Students with only school projects: use the role the projects/major point to, never "Other".
- role_secondary: other roles the person has materially done; never repeat role_detail, never 'Other'.
- seniority: intern/fresher (<1y), junior (1-3y), mid (3-6y), senior (6y+ IC), lead/manager/director by title.
- yoe_total_months: sum of professional work; internships count at full length. yoe_role_months: months in role_detail only.
- mgmt_team_size: largest team directly managed; 0 if none.
- industries: from employers' businesses, most recent first. industry_keywords: 2-6 specific domain words (e.g. "livestock feed", "garment export", "hyper-casual game").
- korean_company_exp: any employer that is a Korean company or Korean-owned (Samsung, LG, Hyosung, POSCO, "... Vina", Korean names). List them in korean_companies.
- employment_status: 'employed' if latest job end is Present/current. If ended, under/over 6 months before today (${new Date().toISOString().slice(0, 7)}). 'student' if still studying with no job.
- factory_experience: worked on-site at a plant/factory/warehouse.
- Language levels: 'native' only for mother tongue or stated native; 'business' = can work in it (TOPIK 5-6, IELTS 6.5+, TOEIC 785+, stated fluent/business); 'intermediate' = TOPIK 3-4, IELTS 5-6, TOEIC 600-780, stated intermediate; 'basic' = TOPIK 1-2 or stated basic; 'none' = not mentioned. Vietnamese is NOT one of these fields. korean_evidence: why you set korean_level.
- resume_language: the language most of the body text is written in — 'vi' or 'en' (or 'ko'); use 'mixed' only when roughly half and half.
- degree: highest completed or in progress. major_category from major_raw.
- gender_stated: only if the resume explicitly states Giới tính/Gender/Sex or uses Mr./Ms./Ông/Bà/Anh/Chị about the candidate. gender_inferred: ALWAYS give your best guess from the Vietnamese given name (and photo cues if any) with confidence 0-1; null only if there is no name at all. Never copy gender_inferred into gender_stated.
- birth_year from date of birth or stated age. address_province / address_district from the current address. Province as the bare standard name without 'TP.', 'Thành phố', 'Tỉnh' (e.g. "Hồ Chí Minh", "Hà Nội", "Đồng Nai", "Bình Dương"); district as the bare name (e.g. "Thủ Đức", "Quận 7", "Biên Hòa"). hometown_province from quê quán if separate.
- excel_level: 'advanced' = pivot/VLOOKUP/dashboards; 'vba_macro' = VBA/macros/Power Query. erp_tools: SAP, MISA, Oracle, Odoo, Fast, Bravo etc. design_tools: Photoshop, Illustrator, Figma, Premiere, AutoCAD etc. certifications: non-language certificates (CPA, PMP, driving license class, chief accountant cert...).
- travel_willing / relocate_willing: only if the objective or notes say so; else null. expected_salary_vnd: only if stated, in VND (convert "15 triệu" → 15000000); else null.
- career_objective_roles: roles/directions the candidate says they want, as short strings.
- cv_quality: 1 (bare, no dates/companies) to 5 (complete, dated, quantified achievements).`

// 성 이름 정규화 — 모델이 "Ho Chi Minh"/"TP. Hồ Chí Minh"/"Hồ Chí Minh" 를 섞어 내서 코드에서 통일한다.
// 프로필 location(자유 입력)에도 그대로 쓸 수 있다.
export const PROVINCES = ['Hồ Chí Minh', 'Hà Nội', 'Đà Nẵng', 'Hải Phòng', 'Cần Thơ', 'Bình Dương', 'Đồng Nai', 'Bắc Ninh', 'Hưng Yên', 'Quảng Ninh', 'Khánh Hòa', 'Thừa Thiên Huế', 'Bà Rịa - Vũng Tàu', 'Long An', 'Tiền Giang', 'Lâm Đồng', 'Đắk Lắk', 'Bình Phước', 'Tây Ninh', 'Bình Thuận', 'Quảng Nam', 'Quảng Ngãi', 'Bình Định', 'Nghệ An', 'Thanh Hóa', 'Hà Tĩnh', 'Nam Định', 'Thái Bình', 'Hải Dương', 'Vĩnh Phúc', 'Thái Nguyên', 'Bắc Giang', 'Phú Thọ', 'Quảng Trị', 'Phú Yên', 'Gia Lai', 'Kon Tum', 'Đắk Nông', 'Ninh Thuận', 'An Giang', 'Kiên Giang', 'Đồng Tháp', 'Vĩnh Long', 'Bến Tre', 'Trà Vinh', 'Sóc Trăng', 'Bạc Liêu', 'Cà Mau', 'Hậu Giang', 'Hà Nam', 'Ninh Bình', 'Hòa Bình', 'Sơn La', 'Lào Cai', 'Yên Bái', 'Tuyên Quang', 'Hà Giang', 'Cao Bằng', 'Lạng Sơn', 'Bắc Kạn', 'Điện Biên', 'Lai Châu', 'Quảng Bình']
const fold = (x) => String(x || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().replace(/[,/\s]*(viet\s*nam|vietnam|vn)\s*$/, '').replace(/^(tp\.?|thanh pho|tinh|t\.)\s*/, '').replace(/\s*city$/, '').replace(/[^a-z0-9]+/g, ' ').trim()
const PROV_IDX = Object.fromEntries(PROVINCES.map((p) => [fold(p), p]))
Object.assign(PROV_IDX, { hcm: 'Hồ Chí Minh', hcmc: 'Hồ Chí Minh', 'sai gon': 'Hồ Chí Minh', saigon: 'Hồ Chí Minh', tphcm: 'Hồ Chí Minh', hanoi: 'Hà Nội', hn: 'Hà Nội', danang: 'Đà Nẵng', hue: 'Thừa Thiên Huế', 'vung tau': 'Bà Rịa - Vũng Tàu', 'ba ria vung tau': 'Bà Rịa - Vũng Tàu', daklak: 'Đắk Lắk' })
export const normProvince = (v) => { if (!v) return null; const f = fold(v); if (/^(viet ?nam|vn)$/.test(f)) return null; return PROV_IDX[f] || v }

export const normCvTags = (t) => ({
  ...t,
  address_province: normProvince(t.address_province),
  hometown_province: normProvince(t.hometown_province),
  role_secondary: (t.role_secondary || []).filter((r) => r !== t.role_detail && r !== 'Other'),
})

/* 이력서 한 건 태깅. text 는 extractResumeText 결과(없거나 50자 미만이면 PDF 를 vision 으로),
   buffer 는 원본 파일. 반환 { tags, usage, via } — tags 는 정규화 완료, _v 는 안 붙인다(cvTagsColumns 가 붙인다). */
export async function tagResume({ text = '', buffer, model = CV_TAGS_MODEL }) {
  let user
  if (text && text.trim().length >= 50) user = `Resume text:\n\n${text.slice(0, 15000)}`
  else if (buffer && buffer.subarray(0, 1024).indexOf('%PDF-') !== -1 && buffer.length < 15 * 1024 * 1024) {
    user = [{ type: 'text', text: 'Tag this resume PDF.' }, { type: 'file', file: { filename: 'resume.pdf', file_data: `data:application/pdf;base64,${buffer.toString('base64')}` } }]
  } else throw new Error('Could not extract text from resume')
  // gpt-5 계열/o-시리즈는 temperature 를 받지 않고 reasoning_effort 로 비용을 조절한다
  const reasoning = /^(gpt-5|o\d)/.test(model)
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  const r = await openai.chat.completions.create({
    model, ...(reasoning ? { reasoning_effort: 'low' } : { temperature: 0 }),
    response_format: { type: 'json_schema', json_schema: { name: 'cv_tags', strict: true, schema: CV_TAGS_SCHEMA } },
    messages: [{ role: 'system', content: systemPrompt() }, { role: 'user', content: user }],
  })
  return { tags: normCvTags(JSON.parse(r.choices[0].message.content)), usage: r.usage, via: typeof user === 'string' ? 'text' : 'vision' }
}

// user_profiles 갱신 객체에 얹는 세 컬럼
export const cvTagsColumns = (tags, model = CV_TAGS_MODEL) => ({
  cv_tags: { ...tags, _v: CV_TAGS_VERSION },
  cv_tags_at: new Date().toISOString(),
  cv_tags_model: model,
})
