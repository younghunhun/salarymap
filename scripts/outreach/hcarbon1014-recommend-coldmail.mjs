// HANKUK CARBON VIETNAM 10/14 — V225 철도 복합재 설계 엔지니어 + V240 QA (10/14 Len 등록, 남영훈 발굴) recommend, 10/14 발송.
// V225 JD: 기계/제품 설계 3y+ · CATIA 필수 · GFRP/CFRP 복합재·철도 우대 · 한국인 우대(베트남인 가능) · Chơn Thành(KCN Becamex-Bình Phước, Đồng Nai) 온사이트 · 급여 협의 · TO 2.
// V240 JD: 항공우주 재료·복합재 부품 품질관리 · AS9100 유지 · 고객 감사 대응 · 공학 전공 3y+ · NADCAP 우대 · HCM VINA 온사이트.
// 10/14 실측(scripts/tmp/hcarbon1014-pool-measure.mjs): CATIA 보유 전체 1(인도 거주, 제외) · 복합재/철도/AS9100 보유 0 · 한국인 20 중 기계 시그널 0.
//   V225 코어+확장(기계 CAD×기계 직군·직함·전공 or 기계 직군·직함 × 36m+ × HCMC권/미기재) 6 · V240 코어+확장(제조 품질 직군·직함 or 품질 키워드 × 제조 문맥 × 비SW × 36m+ × HCMC권/미기재) 16 — 둘 다 노이즈(마케팅·HR·무대연출·개발자) 포함.
// 게이트(유저 지시 10/14 "일단 보내봐 확장으로"): 위 확장층 그대로 + 명백한 비매칭 수동 제외(EXCLUDE) · 1인1통(QA 우선 — 겹침 1명은 QC 직함이라 QA 적합) · 당일 타 공고 기수신 제외.
// 표준: unsub/블랙리스트 전역 제외 · 공개/비공개 프레임 · 발송 전 coldmailTemplates 등록.
//
//   node scripts/outreach/hcarbon1014-recommend-coldmail.mjs                 # dry-run
//   node scripts/outreach/hcarbon1014-recommend-coldmail.mjs --send
import { Resend } from 'resend'
import { sb, env, fetchAll, fetchBlacklist } from './lib.mjs'
import { makeToken } from '../../lib/campaignToken.js'

const args = process.argv.slice(2)
const flag = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? (args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true) : d }
const doSend = args.includes('--send')
const maxN = flag('max', null) ? parseInt(flag('max'), 10) : null
const SITE = String(flag('site', env.NEXT_PUBLIC_SITE_URL || 'https://salary-fyi.com')).replace(/\/$/, '')
const RESEND_FROM = env.RESEND_FROM || 'FYI <hello@salary-fyi.com>'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const esc = (s) => String(s || '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
const firstName = (n) => String(n || '').trim().split(/\s+/).slice(-1)[0] || 'bạn'
const strip = (s) => String(s).replace(/<[^>]+>/g, '')

// ── 대상 선정 헬퍼 (hcarbon1014-pool-measure 와 동일) ──
const expTitles = (p) => (Array.isArray(p.experiences) ? p.experiences.map((e) => `${e.title || e.position || ''}`).join(' | ') : '')
const exp = (p) => (Array.isArray(p.experiences) ? p.experiences.map((e) => `${e.title || e.position || ''} ${e.company || ''} ${e.description || ''}`).join(' ') : '')
const txt = (p) => (JSON.stringify(p.skills || '') + ' ' + String(p.position || '') + ' ' + String(p.headline || '') + ' ' + JSON.stringify(p.desired_roles || '') + ' ' + JSON.stringify(p.resume_summary || '') + ' ' + exp(p) + ' ' + String(p.major || '') + ' ' + JSON.stringify(p.certs || '')).toLowerCase()
const roles = (p) => [p.position, ...(p.desired_roles || [])].filter(Boolean)
const y = (p) => p.yoe_months ?? 0
const hcmRe = /(h[ồo]\s*ch[íi]\s*minh|hcm|sài gòn|sai gon|saigon|thủ đức|thu duc|bình thạnh|binh thanh|bình dương|binh duong|đồng nai|dong nai|biên hòa|bien hoa|bình phước|binh phuoc|chơn thành|long an|호치민|호찌민|hóc môn|gò vấp|tân bình|tân phú|bình tân|phú nhuận|củ chi|nhà bè|bình chánh|quận \d|district \d|tphcm|tp\.?\s*hcm)/i
const hcmOk = (p) => { const l = String(p.location || ''); return !l.trim() || hcmRe.test(l) }
const koOk = (p) => (!!String(p.korean_cert || '').trim() && !/^(none|no|없음|-|n\/a)$/i.test(String(p.korean_cert).trim())) || /(korean|tiếng hàn|topik|한국어)/i.test(p.__t)
const enOk = (p) => !!String(p.english_cert || '').trim() && !/^(none|no|없음|-|n\/a)$/i.test(String(p.english_cert).trim())
// V225
const catiaRe = /catia/i
const mcadRe = /(catia|solidworks|solid works|siemens nx|\bnx\b|unigraphics|creo|pro\/?e\b|pro engineer|inventor|fusion ?360|autocad mechanical|autocad|auto cad|ansys|abaqus|hypermesh|\bfea\b|\bcae\b)/i
const mechRe = /(mechanical design|thiết kế cơ khí|thiet ke co khi|kỹ sư cơ khí|ky su co khi|cơ khí|co khi\b|mechanical engineer|product design engineer|design engineer|kỹ sư thiết kế|ky su thiet ke|kỹ thuật cơ khí|chế tạo máy|che tao may|\bdfm\b|\bbom\b|bản vẽ|ban ve|engineering drawing|2d\/3d|3d model|gd&t|tolerance|automotive engineer|aerospace engineer|kỹ thuật ô tô|hàng không)/i
const compRe = /(composite|vật liệu composite|gfrp|cfrp|carbon fiber|carbon fibre|sợi carbon|fiberglass|sợi thủy tinh|railway|đường sắt|rolling stock|metro|vật liệu|materials engineer|kỹ thuật vật liệu|khoa học vật liệu|polymer)/i
const uxRe = /(ui\/ux|ux\/ui|\bux\b|\bui\b|figma|product designer|graphic design|thiết kế đồ họa|web design)/i
const mechRole = (p) => roles(p).some((r) => /(mechanical|cơ khí|co khi|design engineer|product engineer|r&d|automotive|aerospace|manufactur|production engineer|materials)/i.test(r))
const mechTitle = (p) => /(mechanical|cơ khí|co khi|design engineer|kỹ sư thiết kế|r&d engineer|product engineer|cad)/i.test(expTitles(p))
const mechSig = (p) => (mcadRe.test(p.__t) || mechRe.test(p.__t)) && !(uxRe.test(roles(p).join(' ')) && !mechRole(p))
const majorMech = (p) => /(cơ khí|co khi|mechanical|chế tạo|automotive|ô tô|aerospace|hàng không|vật liệu|materials|cơ điện tử|mechatronic)/i.test(String(p.major || ''))
const designExt = (p) => mechSig(p) && hcmOk(p) && y(p) >= 36 && (catiaRe.test(p.__t) || (mcadRe.test(p.__t) && (mechRole(p) || mechTitle(p) || majorMech(p))) || mechRole(p) || mechTitle(p))
// V240
const qaRe = /(\bqa\b|\bqc\b|quality|chất lượng|chat luong|qa\/qc|qc\/qa|\bqms\b|iso ?9001|as ?9100|as9100|nadcap|iatf|ts ?16949|\bspc\b|\bppap\b|\bapqp\b|\bfmea\b|\bmsa\b|\b8d\b|\bcapa\b|kiểm tra chất lượng|đảm bảo chất lượng|kiểm soát chất lượng|quality audit|internal audit|đánh giá nội bộ|supplier quality|incoming inspection|\bcmm\b|six sigma|lean)/i
const swQaRe = /(selenium|test case|testcase|manual test|automation test|automated test|kiểm thử|tester|software test|qa engineer.*(software|web|app)|postman|cypress|playwright|jmeter|appium|bug report|test plan|test script|regression test|unit test)/i
const mfgRe = /(manufactur|sản xuất|san xuat|nhà máy|nha may|factory|plant|production|khu công nghiệp|kcn\b|industrial|composite|aerospace|hàng không|automotive|ô tô|materials|vật liệu|mechanical|cơ khí|electronics manufacturing|assembly|\bcnc\b|machining)/i
const aeroRe = /(as ?9100|as9100|nadcap|aerospace|hàng không|composite|vật liệu composite|carbon fiber|cfrp|gfrp|prepreg|autoclave|boeing|airbus)/i
const certQRe = /(iso ?9001|as ?9100|nadcap|iatf|ts ?16949|six sigma|lead auditor|internal auditor|cqe|cqa|asq|iso ?14001|iso ?45001|cmm)/i
const qaRole = (p) => roles(p).some((r) => /(\bqa\b|\bqc\b|quality|chất lượng|qa\/qc|qc\/qa|quality engineer|quality assurance|quality control)/i.test(r))
const qaTitle = (p) => /(\bqa\b|\bqc\b|quality|chất lượng|qa\/qc|qc\/qa)/i.test(expTitles(p))
const swRole = (p) => roles(p).some((r) => /(tester|software|qa engineer|automation|developer|frontend|backend|fullstack|mobile)/i.test(r))
const mfgQa = (p) => (qaRole(p) || qaTitle(p) || qaRe.test(p.__t)) && mfgRe.test(p.__t) && !swRole(p) && !swQaRe.test(p.__t)
const qaExt = (p) => mfgQa(p) && hcmOk(p) && y(p) >= 36

// 실측 표본 수동 제외 — 키워드 히트지만 직무 비매칭 (10/14 확인)
const EXCLUDE = new Set([
  '96094e2e-fbc0-4348-a60e-cb9cd86a874a', // Bui Phan Hoang Thai — 물류 총괄, quality 문맥 히트
  '5fd26a97-fb46-407f-9582-cf23520900b1', // PHAM THI MY DUYEN — HR 인재개발
  'bbd2b032-aa1d-4464-86f0-9f10d86a6289', // Đinh Viết Lộc — 에너지/전기 기술 리드, 품질 아님
  '2d32e3ca-be55-4271-8dae-92d3d9c0afc1', // NGUYEN VAN TIEN — HR 매니저
  '22e709ac-6fc4-4fab-9084-dfbeefdcbb1e', // Hồ Văn Cương — 창고/생산계획
  'aa76a793-55d3-461a-a835-25750f9ef4b5', // CHRISTIAN LE — 어학원 원장
  'bbbbe817-87eb-4ca2-876a-2a4950b371d4', // NGUYỄN THỊ NGỌC MAI — 마케팅, inventor 오탐
  '52a9cade-dc83-4340-b4fb-5d89b72ae400', // Le Quang Minh — 풀스택 개발자(기계 전공만)
])

const GROUPS = [
  {
    gkey: 'qa', camp: 'hcarbon1014-recommend-qa', jobKey: 'V240',
    label: { vi: 'Nhân viên QA', ko: '제조 품질 직군·직함 or 품질 키워드 × 제조 문맥 × 비SW × 36m+ × HCMC권/미기재 (코어+확장)' },
    pick: (p) => (qaExt(p) ? 1 + (qaRole(p) ? 2 : 0) + (qaTitle(p) ? 2 : 0) + (aeroRe.test(p.__t) ? 4 : 0) + (certQRe.test(p.__t) ? 2 : 0) + (/(audit|đánh giá|kiểm toán)/i.test(p.__t) ? 1 : 0) + (enOk(p) ? 1 : 0) + (koOk(p) ? 1 : 0) : null),
  },
  {
    gkey: 'design', camp: 'hcarbon1014-recommend-design', jobKey: 'V225',
    label: { vi: 'Kỹ sư phát triển & thiết kế vật liệu đường sắt', ko: 'CATIA or 기계 CAD × 기계 직군·직함·전공 or 기계 직군·직함 × 36m+ × HCMC권/미기재 (코어+확장)' },
    pick: (p) => (designExt(p) ? 1 + (catiaRe.test(p.__t) ? 4 : 0) + (mcadRe.test(p.__t) ? 2 : 0) + (compRe.test(p.__t) ? 3 : 0) + (mechRole(p) || mechTitle(p) ? 2 : 0) + (majorMech(p) ? 1 : 0) + (enOk(p) ? 1 : 0) + (koOk(p) ? 1 : 0) : null),
  },
]

// ── 공고·카피 (vi 실발송) ──
const CO = 'HANKUK CARBON VIETNAM'
const JOBS = {
  V225: {
    id: 'b7430b94-0434-4267-bb43-98cf467c9cfd', company: CO, initial: 'H', city: 'Đồng Nai', meta: 'Onsite · KCN Becamex-Bình Phước, Chơn Thành (Đồng Nai) · 2 vị trí · Lương thỏa thuận',
    intro: `<b>Hankuk Carbon</b> — tập đoàn vật liệu composite Hàn Quốc (niêm yết KOSPI) chuyên cung cấp giải pháp từ vật liệu mới đến linh kiện cho tàu LNG, hàng không vũ trụ và đường sắt — đang tuyển <b>Kỹ sư phát triển &amp; thiết kế sản phẩm composite đường sắt</b> cho nhà máy tại Việt Nam qua FYI (làm việc <b>onsite tại KCN Becamex-Bình Phước, Chơn Thành, Đồng Nai</b>). Công việc: thiết kế và phát triển linh kiện composite nội/ngoại thất tàu đường sắt — dựng bản vẽ 2D/mô hình 3D theo yêu cầu khách hàng, review thiết kế và <b>DFM</b> trên <b>CATIA</b>, hỗ trợ chế tạo mẫu, thử nghiệm, chuyển giao sang sản xuất hàng loạt; quản lý lịch kỹ thuật, thay đổi thiết kế, tài liệu (bản vẽ, BOM, spec); phối hợp giữa đội kỹ thuật tại Hàn Quốc, nhà máy Việt Nam và khách hàng. Yêu cầu: tốt nghiệp Đại học trở lên ngành Cơ khí / Ô tô / Hàng không / Vật liệu-Composite hoặc liên quan; <b>tối thiểu 3 năm kinh nghiệm thiết kế sản phẩm hoặc thiết kế cơ khí</b>; thành thạo <b>CATIA</b> và công cụ CAD 2D/3D; tiếng Anh cơ bản cho tài liệu kỹ thuật. Ưu tiên: kinh nghiệm linh kiện đường sắt, thiết kế sản phẩm <b>GFRP/CFRP/composite</b>, quy trình sản xuất composite, quản lý thay đổi kỹ thuật (ECN), làm việc trực tiếp với khách hàng. Lương thỏa thuận theo năng lực, 2 vị trí.`,
  },
  V240: {
    id: 'a35f49a7-c0a2-4c4c-a1e5-aaa228fa0f50', company: CO, initial: 'H', city: 'HCM VINA', meta: 'Onsite · HCM VINA (Việt Nam) · Lương thỏa thuận',
    intro: `<b>HCM VINA</b> — công ty thành viên của <b>Hankuk Carbon</b> (tập đoàn vật liệu composite Hàn Quốc, niêm yết KOSPI) trong chuỗi cung ứng hàng không vũ trụ toàn cầu — đang tuyển <b>Nhân viên QA</b> qua FYI. Công việc: kiểm soát chất lượng vật liệu hàng không và linh kiện composite; duy trì và quản lý chứng nhận <b>AS9100</b>; đối ứng audit của khách hàng. Yêu cầu: tốt nghiệp Đại học trở lên ngành Kỹ thuật hoặc liên quan; <b>tối thiểu 3 năm kinh nghiệm</b> liên quan (QA/QC trong sản xuất). Ưu tiên: kinh nghiệm kiểm soát chất lượng vật liệu composite, kinh nghiệm duy trì chứng nhận <b>NADCAP</b>, có chứng chỉ về chất lượng (ISO 9001, IATF, Six Sigma…). Môi trường: quality driven · customer focused · continuous improvement — cơ hội làm việc trong chuỗi cung ứng hàng không vũ trụ. Lương thỏa thuận theo năng lực.`,
  },
}

const SUBJECT = {
  public: (company, role, city) => `[FYI] Bạn được chọn vào danh sách đề cử gửi ${company} — ${role} (${city})`,
  private: (company, role, city) => `[FYI] Bạn được chọn vào danh sách đề cử — ${role} tại ${company} (${city})`,
}
const HOOK = 'Đội ngũ FYI đã xem xét toàn bộ hồ sơ đã đăng ký và <b>chọn bạn vào danh sách đề cử</b> cho vị trí dưới đây — hồ sơ của bạn phù hợp với yêu cầu của vị trí này.'
const BENEFIT = {
  public: (company) => `<b>Trong tuần này</b>, FYI sẽ gửi danh sách đề cử trực tiếp cho người phụ trách tuyển dụng của ${company}. Hồ sơ của bạn đang ở chế độ công khai nên sẽ được gửi kèm danh sách. Nếu bạn ứng tuyển ngay, CV của bạn sẽ được <b>ưu tiên xem xét</b> cùng lời giới thiệu từ FYI.`,
  private: (company) => `<b>Trong tuần này</b>, FYI sẽ gửi danh sách đề cử trực tiếp cho người phụ trách tuyển dụng của ${company}. Hồ sơ của bạn đang ở chế độ riêng tư — nếu bạn ứng tuyển ngay, CV của bạn sẽ được gửi kèm lời giới thiệu từ FYI và được <b>ưu tiên xem xét</b>.`,
}
const ONETAP = 'Chỉ cần <b>1 chạm</b> — CV đã đăng ký của bạn sẽ được gửi tự động.'

function jobCard(jd, job) {
  const logo = job.logo_url
    ? `<img src="${esc(job.logo_url)}" width="44" height="44" alt="" style="width:44px;height:44px;border-radius:10px;object-fit:cover;background:#f0ebe3;display:block">`
    : `<div style="width:44px;height:44px;border-radius:10px;background:#fff0e6;color:#ff6000;font-weight:800;font-size:16px;text-align:center;line-height:44px">${jd.initial}</div>`
  return `<table width="100%" cellpadding="0" cellspacing="0" style="background:#fff;border:1px solid #eee5da;border-radius:14px;margin-bottom:8px"><tr>
    <td width="44" style="padding:14px 0 14px 14px;vertical-align:middle">${logo}</td>
    <td style="padding:14px 14px 14px 12px;vertical-align:middle">
      <div style="font-size:12px;color:#8a8073;margin-bottom:3px">${esc(jd.company)}</div>
      <div style="font-size:14.5px;font-weight:700;color:#1a1612;line-height:1.35">${esc(job.title.trim())}</div>
      <div style="font-size:12px;color:#b0691a;margin-top:3px">${esc(jd.meta)}</div>
    </td>
  </tr></table>`
}

function emailHtml(name, url, unsubUrl, jd, job, frame) {
  return `<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;background:#faf9f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1a1612">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#faf9f7"><tr><td align="center" style="padding:28px 16px">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px">
  <tr><td style="padding-bottom:18px"><img src="https://salary-fyi.com/fyi-logo.png" height="24" alt="FYI" style="height:24px;width:auto;display:block"></td></tr>
  <tr><td style="font-size:15px;line-height:1.6;color:#1a1612;padding-bottom:6px">Chào ${esc(firstName(name))},</td></tr>
  <tr><td style="font-size:14px;line-height:1.65;color:#4a443c;padding-bottom:14px">${jd.intro}</td></tr>
  <tr><td style="font-size:14px;line-height:1.65;color:#4a443c;padding-bottom:14px">${HOOK}</td></tr>
  <tr><td style="padding-bottom:10px">${jobCard(jd, job)}</td></tr>
  <tr><td style="font-size:14px;line-height:1.65;color:#4a443c;padding-top:4px">${BENEFIT[frame](jd.company)} ${ONETAP}</td></tr>
  <tr><td align="center" style="padding:16px 0 6px">
    <a href="${url}" style="display:inline-block;background:#ff6000;color:#fff;font-weight:700;font-size:15px;text-decoration:none;padding:14px 30px;border-radius:12px">Ứng tuyển 1 chạm →</a>
  </td></tr>
  <tr><td align="center" style="font-size:12.5px;padding-bottom:4px"><a href="${SITE}/ktc/jobs/${jd.id}" style="color:#8a8073">Xem mô tả công việc đầy đủ →</a></td></tr>
  <tr><td style="font-size:11.5px;color:#a89f92;text-align:center;line-height:1.5;padding-top:20px">
    Bạn nhận được email này vì đã đăng ký hồ sơ trên FYI.<br>— Đội ngũ FYI · <a href="https://salary-fyi.com/jobs" style="color:#a89f92">salary-fyi.com/jobs</a>
    &nbsp;·&nbsp;<a href="${unsubUrl}" style="color:#a89f92;text-decoration:underline">Hủy đăng ký</a>
  </td></tr>
</table></td></tr></table></body></html>`
}

function emailText(name, url, unsubUrl, jd, job, frame) {
  return `Chào ${firstName(name)},

${strip(jd.intro)}

${strip(HOOK)}

- ${job.title.trim()} (${jd.company}) — ${jd.meta} — ${SITE}/ktc/jobs/${jd.id}

${strip(BENEFIT[frame](jd.company))} ${strip(ONETAP)}

${url}

Bạn nhận được email này vì đã đăng ký hồ sơ trên FYI.
— Đội ngũ FYI · salary-fyi.com/jobs
Hủy đăng ký: ${unsubUrl}`
}

async function main() {
  const jobIds = Object.values(JOBS).map((j) => j.id)
  const { data: jobRows, error: jobErr } = await sb.from('jobs').select('id,title,company,location,logo_url,is_active,source_id').in('id', jobIds)
  if (jobErr) { console.error('공고 조회 실패:', jobErr.message); process.exit(1) }
  const jobById = Object.fromEntries((jobRows || []).map((j) => [j.id, j]))
  for (const [k, jd] of Object.entries(JOBS)) {
    const j = jobById[jd.id]
    if (!j || !j.is_active) { console.error(`공고 없음/비활성: ${k} (${jd.id})`); process.exit(1) }
    if (j.source_id !== k) { console.error(`source_id 불일치: ${k} vs DB ${j.source_id} (${jd.id})`); process.exit(1) }
  }

  const resend = new Resend(env.RESEND_API_KEY)
  const url = (userId, camp, jobId) => `${SITE}/api/resume/recommend?t=${makeToken(userId, camp)}&j=${jobId}`
  const unsubFor = (userId, camp) => `${SITE}/api/coldmail/unsub?t=${makeToken(userId, camp)}`

  const [pool, unsubs, recs, apps, bl, todays] = await Promise.all([
    fetchAll(() => sb.from('user_profiles')
      .select('id,email,full_name,position,desired_roles,headline,major,yoe_months,location,english_cert,korean_cert,is_resume_public,skills,resume_summary,experiences,certs')
      .not('email', 'is', null).not('resume_url', 'is', null).order('created_at', { ascending: false })),
    fetchAll(() => sb.from('events').select('user_id').eq('event', 'coldmail_unsub').not('user_id', 'is', null).order('id')),
    fetchAll(() => sb.from('job_recommendations').select('user_id,job_id').in('job_id', jobIds).order('id')),
    fetchAll(() => sb.from('job_applications').select('user_id,job_id').in('job_id', jobIds).order('id')),
    fetchBlacklist(),
    fetchAll(() => sb.from('job_recommendations').select('user_id').gte('created_at', new Date().toISOString().slice(0, 10)).order('id')),
  ])
  const todaySet = new Set(todays.map((r) => r.user_id))
  const unsubSet = new Set(unsubs.map((r) => r.user_id))
  const recSet = new Set(recs.map((r) => `${r.user_id}|${r.job_id}`))
  const appliedSet = new Set(apps.map((a) => `${a.user_id}|${a.job_id}`))

  const seen = new Set()
  const assigned = []
  let skipRec = 0, skipToday = 0, skipEx = 0
  for (const p of pool) {
    if (!p.email || /likelion/i.test(p.email)) continue
    const e = p.email.toLowerCase()
    if (seen.has(e) || unsubSet.has(p.id) || bl.has(p)) continue
    if (EXCLUDE.has(p.id)) { skipEx++; continue }
    if (todaySet.has(p.id)) { skipToday++; continue } // 당일 타 공고 기수신자 제외 — 하루 1통
    p.__t = txt(p)
    for (const g of GROUPS) {
      const s = g.pick(p)
      if (s == null) continue
      const jobId = JOBS[g.jobKey].id
      if (appliedSet.has(`${p.id}|${jobId}`) || recSet.has(`${p.id}|${jobId}`)) { skipRec++; continue }
      seen.add(e)
      assigned.push({ p, s, g, frame: p.is_resume_public ? 'public' : 'private' })
      break
    }
  }

  console.log('발송 대상(1인 1통 배정):')
  for (const g of GROUPS) {
    const rows = assigned.filter((r) => r.g.gkey === g.gkey)
    const pub = rows.filter((x) => x.frame === 'public').length
    console.log(`  ${g.gkey} → ${g.jobKey} (${g.label.ko}): ${rows.length}명 (공개 ${pub} / 비공개 ${rows.length - pub})`)
  }
  console.log(`  ── 합계: ${assigned.length}명 (제외: 해당 공고 기수신/기지원 ${skipRec} · 당일 타 공고 기수신 ${skipToday} · 수동 제외 ${skipEx})`)
  if (!doSend) {
    for (const g of GROUPS) {
      const rows = assigned.filter((r) => r.g.gkey === g.gkey).sort((a, b) => b.s - a.s)
      console.log(`\n── ${g.gkey} 전체 (${rows.length}) ──`)
      for (const { p, s, frame } of rows)
        console.log(`  [${s}·${frame}] ${p.id} ${p.full_name} <${p.email}> · ${p.position || '?'} · ${Math.round((p.yoe_months || 0) / 12 * 10) / 10}y · ${String(p.location || '위치?').slice(0, 22)} · ${String(p.major || '').slice(0, 22)} · ${expTitles(p).slice(0, 70)}`)
    }
    console.log('\n(dry-run — 실발송하려면 --send)')
    return
  }

  let targets = [...assigned].sort((a, b) => b.s - a.s)
  if (maxN) targets = targets.slice(0, maxN)
  let ok = 0, fail = 0
  for (const { p, g, frame } of targets) {
    const jd = JOBS[g.jobKey]
    const job = jobById[jd.id]
    const camp = `${g.camp}-${frame}`
    const u = url(p.id, camp, jd.id), un = unsubFor(p.id, camp)
    const { error } = await resend.emails.send({
      from: RESEND_FROM, to: p.email, subject: SUBJECT[frame](jd.company, g.label.vi, jd.city),
      html: emailHtml(p.full_name, u, un, jd, job, frame), text: emailText(p.full_name, u, un, jd, job, frame),
      headers: { 'List-Unsubscribe': `<${un}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
    })
    if (error) { console.error(`실패 ${p.email}:`, error.message || error); fail++; continue }
    await sb.from('job_recommendations').upsert([{
      user_id: p.id, to_email: p.email, job_id: jd.id,
      job_title: job.title, job_company: job.company, sent_by: 'coldmail', kind: 'recommend', status: 'sent',
    }], { onConflict: 'user_id,job_id', ignoreDuplicates: true })
    await sb.from('events').insert([{
      event: 'recommend_sent', page: '/scripts/hcarbon1014-recommend-coldmail',
      meta: { campaign: camp, job_ids: [jd.id], frame, group: g.gkey }, user_id: p.id,
    }])
    ok++
    await sleep(400)
  }
  console.log(`\n✅ 발송 완료: ${ok}/${targets.length} (실패 ${fail})`)
}

main().catch((e) => { console.error(e); process.exit(1) })
