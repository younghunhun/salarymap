// 자기소개서 요청 메일 — 이미 지원한 사람에게 기업 요청 문항(lib/jobEssays.js)을 받는다. 공고 무관 공용.
//   node scripts/outreach/essay-send.mjs --job R248                         # dry-run (대상 수·명단)
//   node scripts/outreach/essay-send.mjs --job R248 --send [--max N]
//   --status a,b   ktc_candidates.pipeline_status (기본 ready_to_forward,sent_to_company = 서류 합격자)
//   --preview PATH 첫 대상 메일 HTML 저장
//   --test EMAIL   그 주소 한 곳에만 발송(첫 대상 이름·링크로) — 실발송 전 확인용
// 이미 제출한 사람, 오늘 이 캠페인 기수신자는 제외. 답은 job_essays, 정리는 essay-export.mjs.
import { writeFileSync } from 'node:fs'
import { Resend } from 'resend'
import { sb, env } from './lib.mjs'
import { makeToken, leadId } from '../../lib/ktcMailToken.js'
import { essayFor } from '../../lib/jobEssays.js'

const args = process.argv.slice(2)
const flag = (k, d = null) => { const i = args.indexOf(`--${k}`); return i < 0 ? d : (args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true) }
const code = String(flag('job', '') || '').toUpperCase()
const statuses = String(flag('status', 'ready_to_forward,sent_to_company')).split(',').map((s) => s.trim())
const doSend = args.includes('--send'), maxN = flag('max') ? parseInt(flag('max'), 10) : null
const testTo = flag('test'), previewPath = flag('preview')
const SITE = String(env.NEXT_PUBLIC_SITE_URL || 'https://salary-fyi.com').replace(/\/$/, '')
const FROM = env.RESEND_FROM || 'FYI <hello@salary-fyi.com>'
const essay = essayFor(code)
if (!essay) { console.error(`lib/jobEssays.js 에 ${code} 문항 없음`); process.exit(1) }

const { data: job } = await sb.from('jobs').select('id,source_id,title,company').eq('source', 'ktc').eq('source_id', code).maybeSingle()
if (!job) { console.error(`공고 없음: ${code}`); process.exit(1) }
const campaign = `essay-${code}`

const { data: cands, error } = await sb.from('ktc_candidates').select('email,full_name,pipeline_status').eq('job_code', code).in('pipeline_status', statuses)
if (error) throw error
const { data: done } = await sb.from('job_essays').select('email').eq('job_id', job.id)
const doneSet = new Set((done || []).map((r) => r.email.toLowerCase()))
const today = new Date(); today.setHours(0, 0, 0, 0)
const { data: sentToday } = await sb.from('events').select('meta').eq('event', 'job_essay_request_sent').gte('created_at', today.toISOString())
const sentSet = new Set((sentToday || []).filter((e) => e.meta?.campaign === campaign).map((e) => e.meta.lead))

const seen = new Set(), targets = []
let skipDone = 0, skipToday = 0
for (const c of cands) {
  const email = String(c.email || '').trim().toLowerCase()
  if (!email || seen.has(email)) continue
  seen.add(email)
  if (doneSet.has(email)) { skipDone++; continue }
  if (sentSet.has(leadId(email))) { skipToday++; continue }
  targets.push({ email, name: c.full_name || '', status: c.pipeline_status })
}
console.log(`${code} ${job.company} · ${job.title} — 상태 ${statuses.join('/')} ${seen.size}명 → 발송 대상 ${targets.length}명 (기제출 ${skipDone} · 오늘 기수신 ${skipToday})`)

const esc = (s) => String(s || '').replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]))
const firstName = (n) => String(n || '').trim().split(/\s+/).slice(-1)[0] || 'bạn'
const subject = `[FYI] ${job.company} đề nghị bạn nộp bản giới thiệu bản thân — ${job.title}`
const deadline = essay.deadline?.vi
const linkOf = (email) => `${SITE}/ktc/essay?t=${makeToken(email, campaign)}&j=${job.id}&lang=vi`
const qList = essay.questions.map((q) => q.label.vi)

function html(name, url) {
  return `<!doctype html><html><body style="margin:0;background:#faf9f7;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:28px 14px">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border:1px solid #eee5da;border-radius:14px">
<tr><td style="padding:26px 24px 8px;font-size:15px;line-height:1.65;color:#4a443c">
<p style="margin:0 0 14px;color:#1a1612">Chào ${esc(firstName(name))},</p>
<p style="margin:0 0 14px">Chúc mừng bạn đã <b>vượt qua vòng sàng lọc hồ sơ</b> vị trí <b>${esc(job.title)}</b> tại <b>${esc(job.company)}</b>.</p>
<p style="margin:0 0 14px">Để hiểu rõ hơn về bạn, ${esc(job.company)} đề nghị bạn trả lời các câu hỏi dưới đây${deadline ? ` <b>${esc(deadline)}</b>` : ''}:</p>
<ol style="margin:0 0 16px;padding-left:20px">${qList.map((q) => `<li style="margin:0 0 6px">${esc(q)}</li>`).join('')}</ol>
<p style="margin:0 0 20px">Không cần đăng nhập — bấm nút dưới đây và điền trực tiếp.</p>
</td></tr>
<tr><td align="center" style="padding:0 24px 26px"><a href="${url}" style="display:inline-block;background:#ff6000;color:#fff;text-decoration:none;font-weight:700;font-size:15px;padding:13px 28px;border-radius:10px">Điền bản giới thiệu bản thân →</a></td></tr>
<tr><td style="padding:0 24px 22px;font-size:12.5px;line-height:1.6;color:#8a8073">Nếu có thắc mắc, bạn chỉ cần trả lời email này.<br>FYI · LIKELION</td></tr>
</table></td></tr></table></body></html>`
}
const text = (name, url) => `Chào ${firstName(name)},\n\nChúc mừng bạn đã vượt qua vòng sàng lọc hồ sơ vị trí ${job.title} tại ${job.company}.\n${job.company} đề nghị bạn trả lời các câu hỏi dưới đây${deadline ? ` ${deadline}` : ''}:\n${qList.map((q, i) => `${i + 1}. ${q}`).join('\n')}\n\nĐiền tại: ${url}\n\nFYI · LIKELION`

if (previewPath && targets[0]) { writeFileSync(previewPath, html(targets[0].name, linkOf(targets[0].email))); console.log(`미리보기: ${previewPath}`) }
if (!doSend && !testTo) { for (const t of targets) console.log(`  ${t.status.padEnd(17)} ${t.name} <${t.email}>`); console.log('\n(dry-run — 실발송 --send / 테스트 --test EMAIL)'); process.exit(0) }

const resend = new Resend(env.RESEND_API_KEY)
if (testTo) {
  const t = targets[0] || { name: 'Test', email: testTo }
  const { error: e } = await resend.emails.send({ from: FROM, to: testTo, subject: `[TEST] ${subject}`, html: html(t.name, linkOf(t.email)), text: text(t.name, linkOf(t.email)) })
  console.log(e ? `실패: ${e.message}` : `테스트 발송: ${testTo} (링크는 ${t.email} 기준 — 제출하면 그 사람 답으로 저장되니 주의)`)
  process.exit(0)
}
let ok = 0, fail = 0
for (const t of maxN ? targets.slice(0, maxN) : targets) {
  const url = linkOf(t.email)
  const { error: e } = await resend.emails.send({ from: FROM, to: t.email, subject, html: html(t.name, url), text: text(t.name, url) })
  if (e) { console.error(`실패 ${t.email}: ${e.message}`); fail++; continue }
  await sb.from('events').insert({ event: 'job_essay_request_sent', page: '/scripts/essay-send', meta: { campaign, job_id: job.id, lead: leadId(t.email), status: t.status } })
  ok++
  await new Promise((r) => setTimeout(r, 400))
}
console.log(`\n✅ 발송 ${ok} (실패 ${fail}) — 캠페인 ${campaign}`)
