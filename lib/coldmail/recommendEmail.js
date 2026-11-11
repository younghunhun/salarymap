// 단건 recommend 콜드메일 메일 본문 — scripts/outreach/recommend-send.mjs(실발송)와
// components/admin/coldmailTemplates.js(어드민 미리보기)가 같은 함수를 써서 미리보기 = 실제 메일이 되게 한다.
// recommendJobs.js 의 intro 한 문단을 '회사 소개 / Công việc / Yêu cầu / Ưu tiên / 조건' 블록으로 쪼개 그린다.

const esc = (s) => String(s || '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
const strip = (s) => String(s).replace(/<[^>]+>/g, '')
const firstName = (n) => String(n || '').trim().split(/\s+/).slice(-1)[0] || 'bạn'

const LABELS = ['Công việc', 'Yêu cầu', 'Ưu tiên']
// '. ' 뒤에 대문자·태그·숫자가 오면 문장 경계로 본다(“v.v.”·“OpenAI…” 같은 문장 안 마침표는 건드리지 않음)
const splitSentences = (s) => s.split(/(?<=\.)\s+(?=<b>|[A-ZÀ-Ỹ0-9])/u).map((x) => x.trim()).filter(Boolean)
const trimDot = (s) => s.trim().replace(/\.$/, '').trim().replace(/^(<b>)?(\p{Ll})/u, (_, b, c) => (b || '') + c.toUpperCase())

// intro → { lead, sections: [{ label, items }], notes: [] }
export function parseIntro(intro) {
  const re = new RegExp(`(${LABELS.join('|')}):\\s*`, 'g')
  const hits = [...intro.matchAll(re)]
  if (!hits.length) return { lead: intro, sections: [], notes: [] }
  const lead = intro.slice(0, hits[0].index).trim()
  const sections = [], notes = []
  hits.forEach((m, i) => {
    const body = intro.slice(m.index + m[0].length, i + 1 < hits.length ? hits[i + 1].index : intro.length).trim()
    // 섹션 본문은 첫 문장까지, 남는 문장(급여·근무형태·면접 등)은 조건 박스로 보낸다
    const [first, ...rest] = splitSentences(body)
    sections.push({ label: m[1], items: first.split(/;\s*/).map(trimDot).filter(Boolean) })
    notes.push(...rest.map(trimDot))
  })
  return { lead, sections, notes }
}

const HOOK = 'Đội ngũ FYI đã xem xét toàn bộ hồ sơ đã đăng ký và <b>chọn bạn vào danh sách đề cử</b> cho vị trí dưới đây — hồ sơ của bạn phù hợp với yêu cầu của vị trí này.'
const BENEFIT = {
  public: (company) => `<b>Trong tuần này</b>, FYI sẽ gửi danh sách đề cử trực tiếp cho người phụ trách tuyển dụng của ${company}. Hồ sơ của bạn đang ở chế độ công khai nên sẽ được gửi kèm danh sách. Nếu bạn ứng tuyển ngay, CV của bạn sẽ được <b>ưu tiên xem xét</b> cùng lời giới thiệu từ FYI.`,
  private: (company) => `<b>Trong tuần này</b>, FYI sẽ gửi danh sách đề cử trực tiếp cho người phụ trách tuyển dụng của ${company}. Hồ sơ của bạn đang ở chế độ riêng tư — nếu bạn ứng tuyển ngay, CV của bạn sẽ được gửi kèm lời giới thiệu từ FYI và được <b>ưu tiên xem xét</b>.`,
}
const ONETAP = 'Chỉ cần <b>1 chạm</b> — CV đã đăng ký của bạn sẽ được gửi tự động.'

export const recommendSubject = (JD, frame) => frame === 'public'
  ? `[FYI] Bạn được chọn vào danh sách đề cử gửi ${JD.company} — ${JD.title} (${JD.loc})`
  : `[FYI] Bạn được chọn vào danh sách đề cử — ${JD.title} tại ${JD.company} (${JD.loc})`

const C = { bg: '#faf9f7', ink: '#1a1612', body: '#4a443c', mute: '#8a8073', faint: '#a89f92', line: '#eee5da', brand: '#ff6000', brandSoft: '#fff4ec', brandInk: '#b0691a' }

const chips = (meta) => String(meta || '').split(/\s+·\s+/).filter(Boolean)
  .map((t) => `<span style="display:inline-block;font-size:11.5px;line-height:1.4;color:${C.brandInk};background:${C.brandSoft};border-radius:999px;padding:3px 9px;margin:0 4px 5px 0">${esc(t)}</span>`).join('')

const bullets = (items) => items.map((t) => `<tr>
      <td width="14" style="vertical-align:top;font-size:14px;line-height:1.6;color:${C.brand};padding:0 0 5px">•</td>
      <td style="font-size:14px;line-height:1.6;color:${C.body};padding:0 0 5px">${t}</td>
    </tr>`).join('')

const section = (label, items) => `<tr><td style="padding:0 0 14px">
    <div style="font-size:12px;font-weight:700;letter-spacing:.3px;color:${C.ink};text-transform:uppercase;padding-bottom:6px">${label}</div>
    <table width="100%" cellpadding="0" cellspacing="0">${bullets(items)}</table>
  </td></tr>`

/**
 * @param JD   recommendJobs.js 항목(company/title/meta/intro/initial)
 * @param o    { name, url, unsubUrl, jdUrl, logoUrl, frame: 'public'|'private' }
 */
export function recommendEmailHtml(JD, { name, url, unsubUrl, jdUrl, logoUrl, frame }) {
  const { lead, sections, notes } = parseIntro(JD.intro)
  const logo = logoUrl
    ? `<img src="${esc(logoUrl)}" width="44" height="44" alt="" style="width:44px;height:44px;border-radius:10px;object-fit:cover;background:#f0ebe3;display:block">`
    : `<div style="width:44px;height:44px;border-radius:10px;background:${C.brandSoft};color:${C.brand};font-weight:800;font-size:16px;text-align:center;line-height:44px">${JD.initial}</div>`
  const href = (u) => (u ? ` href="${u}"` : '')
  return `<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;background:${C.bg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:${C.ink}">
<table width="100%" cellpadding="0" cellspacing="0" style="background:${C.bg}"><tr><td align="center" style="padding:28px 16px">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px">
  <tr><td style="padding-bottom:20px"><img src="https://salary-fyi.com/fyi-logo.png" height="24" alt="FYI" style="height:24px;width:auto;display:block"></td></tr>
  <tr><td style="font-size:15px;line-height:1.6;color:${C.ink};padding-bottom:6px">Chào ${esc(firstName(name))},</td></tr>
  <tr><td style="font-size:14.5px;line-height:1.65;color:${C.body};padding-bottom:18px">${HOOK}</td></tr>

  <tr><td style="padding-bottom:18px">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#fff;border:1px solid ${C.line};border-radius:14px">
    <tr><td style="padding:16px 16px 12px">
      <table width="100%" cellpadding="0" cellspacing="0"><tr>
        <td width="44" style="vertical-align:middle">${logo}</td>
        <td style="padding-left:12px;vertical-align:middle">
          <div style="font-size:12px;color:${C.mute};margin-bottom:2px">${esc(JD.company)}</div>
          <div style="font-size:16px;font-weight:700;color:${C.ink};line-height:1.35">${esc(JD.title)}</div>
        </td>
      </tr></table>
      <div style="padding-top:12px">${chips(JD.meta)}</div>
    </td></tr>
    <tr><td style="padding:0 16px"><div style="border-top:1px solid ${C.line};height:1px;line-height:1px;font-size:0">&nbsp;</div></td></tr>
    <tr><td style="padding:14px 16px 4px;font-size:13.5px;line-height:1.6;color:${C.body}">${lead}</td></tr>
    <tr><td style="padding:10px 16px 2px"><table width="100%" cellpadding="0" cellspacing="0">
      ${sections.map((s) => section(s.label, s.items)).join('')}
    </table></td></tr>
    ${notes.length ? `<tr><td style="padding:0 16px 16px">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:${C.brandSoft};border-radius:10px"><tr><td style="padding:12px 14px 7px">
        <table width="100%" cellpadding="0" cellspacing="0">${bullets(notes)}</table>
      </td></tr></table>
    </td></tr>` : ''}
  </table>
  </td></tr>

  <tr><td style="font-size:14px;line-height:1.65;color:${C.body}">${BENEFIT[frame](esc(JD.company))} ${ONETAP}</td></tr>
  <tr><td align="center" style="padding:20px 0 8px">
    <a${href(url)} style="display:inline-block;background:${C.brand};color:#fff;font-weight:700;font-size:15px;text-decoration:none;padding:14px 32px;border-radius:12px">Ứng tuyển 1 chạm →</a>
  </td></tr>
  <tr><td align="center" style="font-size:12.5px;padding-bottom:4px"><a${href(jdUrl)} style="color:${C.mute}">Xem mô tả công việc đầy đủ →</a></td></tr>
  <tr><td style="font-size:11.5px;color:${C.faint};text-align:center;line-height:1.5;padding-top:24px">
    Bạn nhận được email này vì đã đăng ký hồ sơ trên FYI.<br>— Đội ngũ FYI · <a href="https://salary-fyi.com/jobs" style="color:${C.faint}">salary-fyi.com/jobs</a>
    &nbsp;·&nbsp;<a${href(unsubUrl)} style="color:${C.faint};text-decoration:underline">Hủy đăng ký</a>
  </td></tr>
</table></td></tr></table></body></html>`
}

export function recommendEmailText(JD, { name, url, unsubUrl, jdUrl, frame }) {
  const { lead, sections, notes } = parseIntro(JD.intro)
  return [
    `Chào ${firstName(name)},`,
    strip(HOOK),
    `${JD.title} — ${JD.company}\n${JD.meta}`,
    strip(lead),
    ...sections.map((s) => `${s.label}:\n${s.items.map((t) => `- ${strip(t)}`).join('\n')}`),
    ...(notes.length ? [notes.map((t) => `* ${strip(t)}`).join('\n')] : []),
    `${strip(BENEFIT[frame](JD.company))} ${strip(ONETAP)}`,
    `Ứng tuyển 1 chạm: ${url}\nMô tả công việc: ${jdUrl}`,
    `Bạn nhận được email này vì đã đăng ký hồ sơ trên FYI.\n— Đội ngũ FYI · salary-fyi.com/jobs\nHủy đăng ký: ${unsubUrl}`,
  ].join('\n\n')
}
