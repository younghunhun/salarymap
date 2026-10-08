// 사이트 주요 지표 — 2026-04-20(서비스 시작) 이후 전체 + 월별 (읽기 전용). 벤치마크 리포트 입력용.
import { sb, fetchAll } from '../outreach/lib.mjs'
import { isExcludedSignup, isExcludedApplication, isExcludedSubmission } from '../../lib/admin-metrics.js'
const SINCE = '2026-04-20'
const months = ['2026-04', '2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10']
const ym = (iso) => String(iso).slice(0, 7)
const cnt = (arr, key = (r) => ym(r.created_at)) => { const d = {}; for (const r of arr) { const k = key(r); if (k) d[k] = (d[k] || 0) + 1 } return d }
const uniq = (arr, by) => { const d = {}; for (const r of arr) { const v = by(r); if (!v) continue; (d[ym(r.created_at)] ||= new Set()).add(v) } return Object.fromEntries(Object.entries(d).map(([k, s]) => [k, s.size])) }
const out = { since: SINCE, asof: new Date().toISOString().slice(0, 10), months, series: {}, scalars: {}, dist: {} }
const S = (k, byM) => { out.series[k] = months.map((m) => byM[m] || 0) }

const users = []
for (let page = 1; ; page++) { const { data } = await sb.auth.admin.listUsers({ page, perPage: 1000 }); const u = data?.users || []; users.push(...u); if (u.length < 1000) break }
const real = users.filter((u) => !isExcludedSignup(u)); const since = real.filter((u) => u.created_at >= SINCE)
const days = Math.round((Date.now() - new Date(SINCE)) / 86400000)
const d30 = new Date(Date.now() - 30 * 86400000).toISOString(), d7 = new Date(Date.now() - 7 * 86400000).toISOString()
Object.assign(out.scalars, { auth_total: users.length, signups_real_total: real.length, signups_since: since.length, days, signups_per_day: +(since.length / days).toFixed(1), signups_30d: since.filter((u) => u.created_at >= d30).length, signups_7d: since.filter((u) => u.created_at >= d7).length })
out.dist.provider = cnt(since, (u) => u.app_metadata?.provider || '?')
S('signups', cnt(since))
// 주별 가입 (최근 12주)
const wk = {}; for (const u of since) { const d = new Date(u.created_at); const w = new Date(d); w.setUTCDate(d.getUTCDate() - d.getUTCDay()); const k = w.toISOString().slice(0, 10); wk[k] = (wk[k] || 0) + 1 }
out.dist.signups_weekly = wk

const profs = await fetchAll(() => sb.from('user_profiles').select('id,email,created_at,resume_url,is_resume_public,position,utm_source').order('created_at'))
const pReal = profs.filter((p) => !/likelion\.net|dummy\.local|system\.local/i.test(p.email || '')); const cv = pReal.filter((p) => p.resume_url)
Object.assign(out.scalars, { profiles: pReal.length, cv_total: cv.length, cv_public: cv.filter((p) => p.is_resume_public).length })
S('cv_profiles', cnt(cv.filter((p) => p.created_at >= SINCE)))
out.dist.cv_roles = cnt(cv, (p) => p.position || '미입력')
out.dist.signup_utm = cnt(pReal.filter((p) => p.created_at >= SINCE), (p) => (p.utm_source || '').toLowerCase() || '(none)')

const EV = ['session_start', 'app_open', 'view_jobs_page', 'view_job_detail', 'click_apply_button', 'submit_application', 'resume_registered', 'recommend_click', 'coldmail_job_apply', 'coldmail_public_sent', 'push_sent', 'view_community', 'ktc_view']
const ev = await fetchAll(() => sb.from('events').select('event,created_at,user_id,client_id,meta').gte('created_at', SINCE).in('event', EV).order('id'))
const by = (n) => ev.filter((e) => e.event === n); const ss = by('session_start')
S('sessions', cnt(ss)); S('unique_visitors', uniq(ss, (e) => e.client_id)); S('logged_sessions', cnt(ss.filter((e) => e.user_id))); S('unique_logged_users', uniq(ss, (e) => e.user_id))
S('paid_sessions', cnt(ss.filter((e) => /^(meta|mt|google|tiktok|fb|facebook)$/i.test(String(e.meta?.utm_source || '')))))
S('app_sessions', cnt(ss.filter((e) => e.meta?.platform === 'app'))); S('app_open', cnt(by('app_open')))
S('view_jobs_page', cnt(by('view_jobs_page'))); S('view_job_detail', cnt(by('view_job_detail'))); S('click_apply', cnt(by('click_apply_button'))); S('submit_application_ev', cnt(by('submit_application')))
S('ktc_view', cnt(by('ktc_view'))); S('view_community', cnt(by('view_community'))); S('resume_registered_ev', cnt(by('resume_registered')))
out.scalars.unique_visitors_total = new Set(ss.map((e) => e.client_id).filter(Boolean)).size
out.scalars.unique_logged_users_total = new Set(ss.map((e) => e.user_id).filter(Boolean)).size
out.dist.session_source = cnt(ss, (e) => String(e.meta?.utm_source || (e.meta?.referrer || '').replace(/^https?:\/\/(www\.|m\.|l\.|lm\.)?/, '').split('/')[0] || 'direct').toLowerCase())

const apps = await fetchAll(() => sb.from('job_applications').select('id,job_id,user_id,applicant_email,status,created_at,application_source,platform,job_company').gte('created_at', SINCE).order('created_at'))
const aReal = apps.filter((a) => !isExcludedApplication(a))
S('applications', cnt(aReal)); S('unique_applicants', uniq(aReal, (a) => a.user_id)); S('unique_jobs_applied', uniq(aReal, (a) => a.job_id)); S('coldmail_job_apply', cnt(by('coldmail_job_apply')))
const appliers = new Set(aReal.map((a) => a.user_id)).size
Object.assign(out.scalars, { applications_total: aReal.length, applicants_total: appliers, apps_per_applicant: +(aReal.length / appliers).toFixed(2) })
out.dist.app_status = cnt(aReal, (a) => a.status || 'null'); out.dist.app_source = cnt(aReal, (a) => a.application_source || a.platform || 'null'); out.dist.app_top_companies = cnt(aReal, (a) => a.job_company)

const jobs = await fetchAll(() => sb.from('jobs').select('id,source,is_active,created_at').order('created_at'))
const jSince = jobs.filter((j) => j.created_at >= SINCE)
S('jobs_created', cnt(jSince)); S('jobs_ktc', cnt(jSince.filter((j) => j.source === 'ktc'))); S('jobs_company_self', cnt(jSince.filter((j) => j.source === 'company_self')))
out.dist.job_source = cnt(jSince, (j) => j.source || 'null')
const perJob = cnt(aReal, (a) => a.job_id); const ktcJobs = jobs.filter((j) => j.source === 'ktc'); const ktcWith = ktcJobs.filter((j) => perJob[j.id])
Object.assign(out.scalars, { jobs_total: jobs.length, jobs_active: jobs.filter((j) => j.is_active).length, jobs_active_ktc: jobs.filter((j) => j.is_active && j.source === 'ktc').length, ktc_jobs: ktcJobs.length, ktc_jobs_with_apps: ktcWith.length, ktc_apps_total: ktcJobs.reduce((s, j) => s + (perJob[j.id] || 0), 0), ktc_apps_per_job_with_apps: +(ktcJobs.reduce((s, j) => s + (perJob[j.id] || 0), 0) / Math.max(1, ktcWith.length)).toFixed(1) })

const recs = await fetchAll(() => sb.from('job_recommendations').select('id,user_id,job_id,created_at').gte('created_at', SINCE).order('id'))
S('recommend_sent', cnt(recs)); S('recommend_unique', uniq(recs, (r) => r.user_id)); S('recommend_click', cnt(by('recommend_click')))
const pair = new Set(recs.map((r) => `${r.user_id}|${r.job_id}`)); const conv = aReal.filter((a) => pair.has(`${a.user_id}|${a.job_id}`))
S('recommend_conv_apps', cnt(conv)); S('coldmail_public_sent', cnt(by('coldmail_public_sent'))); S('push_sent', cnt(by('push_sent')))
Object.assign(out.scalars, { recommend_total: recs.length, recommend_conv_apps: conv.length, recommend_conv_rate: +(conv.length / recs.length * 100).toFixed(1), recommend_share_of_apps: +(conv.length / aReal.length * 100).toFixed(1) })

const subs = await fetchAll(() => sb.from('submissions').select('id,company,email,source,created_at').gte('created_at', SINCE).order('id'))
S('salary_submissions', cnt(subs.filter((s) => !isExcludedSubmission(s))))
const posts = await fetchAll(() => sb.from('community_posts').select('id,created_at').gte('created_at', SINCE).order('id'))
S('community_posts', cnt(posts))
const { count: pushTokens } = await sb.from('push_tokens').select('*', { count: 'exact', head: true }); out.scalars.push_tokens = pushTokens

import('node:fs').then((fs) => fs.writeFileSync(new URL('../../data/site-kpi-since-0420.json', import.meta.url), JSON.stringify(out, null, 1)))
console.log('scalars', JSON.stringify(out.scalars))
console.log('months', months.join(' '))
for (const [k, v] of Object.entries(out.series)) console.log(k.padEnd(24), v.map((x) => String(x).padStart(6)).join(''), '│', String(v.reduce((a, b) => a + b, 0)).padStart(7))
for (const [k, v] of Object.entries(out.dist)) console.log(k, ':', Object.entries(v).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([a, b]) => `${a} ${b}`).join(' · '))
