// 단건 recommend 콜드메일 공용 발송 — 공고(--job)와 문안(--copy)을 고르고, 대상은 cv-pool 과 같은 플래그로 거른다.
// 표준: unsub/블랙리스트/likelion 제외 · 해당 공고 기수신/기지원 제외 · 당일 recommend 기수신 제외(--ignore-today 로 해제) · 공개/비공개 프레임 · 1통/인.
// 7일 쿨다운은 두지 않는다(유저 정책 2026-10-20). 문안·선정 플래그 정본은 lib/coldmail/recommendJobs.js — 발송 후 거기 flags/desc 에 기록.
//
//   node scripts/outreach/recommend-send.mjs --job V258 --copy youlchon1020 --main "Sales (B2B),Business Development" --yoe 24- --region HCM --age 22-40            # dry-run
//   node scripts/outreach/recommend-send.mjs --job V258 --copy youlchon1020 ... --send [--max N] [--ignore-today] [--exclude-job V177] [--preview <path>]
//   --exclude-job CODE,CODE   다른 공고(이전 동일 공고 등) 기지원자도 제외
//   --resend                  그 공고 기수신자도 다시 보낸다(공고 근무지·조건이 바뀌어 재안내할 때) — 기지원자는 계속 제외
//   --emails PATH             줄마다 이메일 하나인 파일 — 대상을 그 목록으로 한정(공고 간 배분처럼 플래그로 표현 안 되는 선정용)
import { readFileSync, writeFileSync } from 'node:fs'
import { Resend } from 'resend'
import { sb, env, fetchAll } from './lib.mjs'
import { makeToken } from '../../lib/campaignToken.js'
import { RECOMMEND_JOBS } from '../../lib/coldmail/recommendJobs.js'
import { recommendEmailHtml, recommendEmailText, recommendSubject } from '../../lib/coldmail/recommendEmail.js'
import { provinceOf } from '../../lib/cvTagsMatch.js'
import { parseFilters, makePick, loadPool, T, yoe, expSummary, printSummary } from './cvPool.mjs'

const args = process.argv.slice(2)
const f = parseFilters(args)
const doSend = args.includes('--send'), ignoreToday = args.includes('--ignore-today'), resendSent = args.includes('--resend')
const maxN = f.flag('max', null) ? parseInt(f.flag('max'), 10) : null
const previewPath = f.flag('preview', null)
const copyKey = f.flag('copy', null)
const emailsPath = f.flag('emails', null)
const onlyEmails = emailsPath && emailsPath !== true ? new Set(readFileSync(emailsPath, 'utf8').split('\n').map((s) => s.trim().toLowerCase()).filter(Boolean)) : null
const excludeJobs = String(f.flag('exclude-job', '') || '').split(',').map((s) => s.trim().toUpperCase()).filter(Boolean)
if (!f.job || !copyKey || copyKey === true) { console.error('--job CODE 와 --copy KEY 는 필수'); process.exit(1) }
const JD = RECOMMEND_JOBS[copyKey]
if (!JD) { console.error(`문안 없음: ${copyKey} (lib/coldmail/recommendJobs.js 키: ${Object.keys(RECOMMEND_JOBS).join(', ')})`); process.exit(1) }
if (JD.code !== f.job) { console.error(`문안 ${copyKey} 는 ${JD.code} 용인데 --job ${f.job}`); process.exit(1) }
const SITE = String(f.flag('site', env.NEXT_PUBLIC_SITE_URL || 'https://salary-fyi.com')).replace(/\/$/, '')
const RESEND_FROM = env.RESEND_FROM || 'FYI <hello@salary-fyi.com>'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// 메일 본문은 lib/coldmail/recommendEmail.js(어드민 미리보기와 공용)
const SUBJECT = { public: recommendSubject(JD, 'public'), private: recommendSubject(JD, 'private') }
const mailOpts = (name, url, unsubUrl, job, frame) => ({ name, url, unsubUrl, frame, jdUrl: `${SITE}/ktc/jobs/${job.id}`, logoUrl: job.logo_url })
const emailHtml = (...a) => recommendEmailHtml(JD, mailOpts(...a))
const emailText = (...a) => recommendEmailText(JD, mailOpts(...a))

async function main() {
  const { base, job, sent, applied } = await loadPool(f)
  if (!job.is_active) { console.error(`공고 비활성: ${job.source_id}`); process.exit(1) }
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)
  const todayRecs = await fetchAll(() => sb.from('job_recommendations').select('user_id').gte('created_at', todayStart.toISOString()).order('id'))
  // --resend 는 기존 job_recommendations 행을 덮지 않으므로(ignoreDuplicates) 오늘 재발송분은 events 로 잡는다
  const todayEvents = await fetchAll(() => sb.from('events').select('user_id').eq('event', 'recommend_sent').gte('created_at', todayStart.toISOString()).order('id'))
  const todaySet = new Set([...todayRecs, ...todayEvents].map((r) => r.user_id))
  const exApplied = new Set()
  if (excludeJobs.length) {
    const { data: ex } = await sb.from('jobs').select('id,source_id').eq('source', 'ktc').in('source_id', excludeJobs)
    for (const j of ex || []) for (const a of await fetchAll(() => sb.from('job_applications').select('user_id').eq('job_id', j.id).order('id'))) exApplied.add(a.user_id)
  }
  const pick = makePick(f)
  const hit = base.filter((p) => pick(p) && (!onlyEmails || onlyEmails.has((p.email || '').toLowerCase())))
  let skipSent = 0, skipApp = 0, skipEx = 0, skipToday = 0
  const targets = []
  for (const p of hit) {
    if (sent.has(p.id) && !resendSent) { skipSent++; continue }
    if (applied.has(p.id)) { skipApp++; continue }
    if (exApplied.has(p.id)) { skipEx++; continue }
    if (!ignoreToday && todaySet.has(p.id)) { skipToday++; continue }
    targets.push({ p, s: (Date.now() - new Date(p.updated_at || 0) <= 90 * 86400e3 ? 3 : 0) + (T(p).cv_quality || 0), frame: p.is_resume_public ? 'public' : 'private' })
  }
  targets.sort((a, b) => b.s - a.s)
  console.log(`공고 ${job.source_id} ${job.company} · ${job.title} — 문안 ${copyKey} · 조건 일치 ${hit.length} → 발송 대상 ${targets.length}명 (공개 ${targets.filter((r) => r.frame === 'public').length}) — 제외: 기수신 ${skipSent} · 기지원 ${skipApp}${excludeJobs.length ? ` · ${excludeJobs.join('/')} 기지원 ${skipEx}` : ''} · 당일 기수신 ${skipToday}`)
  if (!doSend) {
    printSummary(targets.map((r) => r.p), '발송 대상')
    for (const { p, frame } of targets.slice(0, 15)) console.log(`  [${frame}] ${p.full_name} · ${T(p).role_detail} · ${Math.round(yoe(p) / 12 * 10) / 10}y · ${provinceOf(p) || '미기재'} · ${expSummary(p).slice(0, 70)}`)
    if (previewPath && targets[0]) { const { p, frame } = targets[0], camp = `${copyKey}-recommend-${frame}`; const u = `${SITE}/api/resume/recommend?t=${makeToken(p.id, camp)}&j=${job.id}`, un = `${SITE}/api/coldmail/unsub?t=${makeToken(p.id, camp)}`; writeFileSync(previewPath, emailHtml(p.full_name, u, un, job, frame)); writeFileSync(previewPath.replace(/\.html?$/, '') + '.txt', emailText(p.full_name, u, un, job, frame)); console.log(`미리보기 저장: ${previewPath}`) }
    console.log('\n(dry-run — 실발송하려면 --send)'); return
  }
  const resend = new Resend(env.RESEND_API_KEY)
  const list = maxN ? targets.slice(0, maxN) : targets
  let ok = 0, fail = 0
  for (const { p, frame } of list) {
    const camp = `${copyKey}-recommend-${frame}`, u = `${SITE}/api/resume/recommend?t=${makeToken(p.id, camp)}&j=${job.id}`, un = `${SITE}/api/coldmail/unsub?t=${makeToken(p.id, camp)}`
    const { error } = await resend.emails.send({ from: RESEND_FROM, to: p.email, subject: SUBJECT[frame], html: emailHtml(p.full_name, u, un, job, frame), text: emailText(p.full_name, u, un, job, frame), headers: { 'List-Unsubscribe': `<${un}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' } })
    if (error) { console.error(`실패 ${p.email}:`, error.message || error); fail++; continue }
    await sb.from('job_recommendations').upsert([{ user_id: p.id, to_email: p.email, job_id: job.id, job_title: job.title, job_company: job.company, sent_by: 'coldmail', kind: 'recommend', status: 'sent' }], { onConflict: 'user_id,job_id', ignoreDuplicates: true })
    await sb.from('events').insert([{ event: 'recommend_sent', page: '/scripts/recommend-send', meta: { campaign: camp, job_ids: [job.id], frame, flags: args.filter((a) => a !== '--send').join(' ') }, user_id: p.id }])
    ok++; if (ok % 25 === 0) console.log(`  …${ok}/${list.length}`); await sleep(400)
  }
  console.log(`\n✅ 발송 완료: ${ok}/${list.length} (실패 ${fail}) — 캠페인 ${copyKey}-recommend-*`)
}
main().catch((e) => { console.error(e); process.exit(1) })
