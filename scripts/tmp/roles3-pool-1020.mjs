// Fullstack / Project Manager / 3D Designer 인재풀 + 급여 실측 (읽기 전용) — 2026-10-20 커리어사업팀 2차 요청
import { sb, fetchAll } from '../outreach/lib.mjs'
const pool = await fetchAll(() => sb.from('user_profiles').select('id,email,position,desired_roles,yoe_months,location,salary_min,salary_max,current_salary,salary_currency,skills,headline,experiences,cv_tags,resume_url,created_at').not('email', 'is', null).not('resume_url', 'is', null).order('created_at', { ascending: false }))
const seen = new Set(), base = []
for (const p of pool) { const e = p.email.toLowerCase(); if (seen.has(e) || /likelion/i.test(e)) continue; seen.add(e); base.push(p) }
const t = (p) => p.cv_tags || {}
const titles = (p) => (Array.isArray(p.experiences) ? p.experiences.map((e) => `${e.title || e.position || ''}`).join(' | ') : '')
const expTxt = (p) => (Array.isArray(p.experiences) ? p.experiences.map((e) => `${e.title || e.position || ''} ${e.description || ''}`).join(' ') : '')
const sk = (p) => JSON.stringify(p.skills || '').toLowerCase()
const all = (p) => (sk(p) + ' ' + (p.headline || '') + ' ' + expTxt(p)).toLowerCase()
const self = (p, set) => [p.position, ...(p.desired_roles || [])].some((r) => set.has(r))
const tagMain = (p, set) => set.has(t(p).role_detail), tagSec = (p, set) => (t(p).role_secondary || []).some((r) => set.has(r))
const yoe = (p) => Number.isFinite(t(p).yoe_total_months) ? t(p).yoe_total_months : (p.yoe_months ?? null)
const BANDS = ['<1y', '1-3y', '3-5y', '5-8y', '8y+']
const band = (m) => m == null ? '미상' : m < 12 ? '<1y' : m < 36 ? '1-3y' : m < 60 ? '3-5y' : m < 96 ? '5-8y' : '8y+'
const ok = (v) => Number.isFinite(v) && v >= 3e6 && v <= 300e6
const vnd = (p, k) => p[k] == null || (p.salary_currency && p.salary_currency !== 'VND') ? null : Number(p[k])
const pct = (a, q) => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(q * s.length))] }
const m = (v) => v == null ? '-' : (v / 1e6).toFixed(0) + 'M'

const feRe = /(react|vue|angular|next\.?js|nuxt|svelte|tailwind|html|css|typescript)/, beRe = /(node|nest|express|spring|django|flask|fastapi|laravel|\.net|asp\.net|rails|golang|\bgo\b|php|java\b|kotlin|postgres|mysql|mongodb)/
const pmKw = /(project manag|quản lý dự án|pmp|scrum master|agile|jira|pmo|delivery manag|program manag)/i
const d3Re = /(\b3d\b|blender|maya|3ds ?max|cinema ?4d|c4d|zbrush|substance|houdini|sketchup|rhino|unreal|modeling|modelling|rigging|texturing|dựng hình|mô hình 3d|nhân vật 3d|lumion|v-?ray|keyshot|solidworks|revit)/i
const d3Strong = /(\b3d\b|blender|maya|3ds ?max|cinema ?4d|c4d|zbrush|substance|houdini|mô hình 3d|nhân vật 3d)/i

const ROLES = {
  fullstack: { set: new Set(['Fullstack']), minY: 0,
    core: (p) => tagMain(p, new Set(['Fullstack'])) || tagSec(p, new Set(['Fullstack'])) || self(p, new Set(['Fullstack'])),
    wide: (p) => ['Backend', 'Frontend', 'Web', 'Mobile'].includes(t(p).role_detail) && feRe.test(sk(p)) && beRe.test(sk(p)),
    submitRoles: ['Fullstack'] },
  pm: { set: new Set(['Project Manager']), minY: 0,
    core: (p) => tagMain(p, new Set(['Project Manager'])) || tagSec(p, new Set(['Project Manager'])) || self(p, new Set(['Project Manager'])),
    wide: (p) => (['PM', 'PO', 'Business Analyst'].includes(t(p).role_detail) || pmKw.test(titles(p))) ,
    submitRoles: ['PM', 'Project Manager', 'PO'] },
  d3: { set: new Set(), minY: 36,
    core: (p) => d3Strong.test(titles(p) + ' ' + (p.headline || '') + ' ' + (p.position || '')) || (['Graphic Designer', 'Motion / Video', 'UI/UX Designer'].includes(t(p).role_detail) && d3Strong.test(sk(p))),
    wide: (p) => d3Re.test(all(p)) && (['Graphic Designer', 'Motion / Video', 'UI/UX Designer', 'Other'].includes(t(p).role_detail) || /(game|design|art)/i.test(titles(p))),
    submitRoles: ['Design', 'Graphic Designer', 'Motion / Video', 'UI/UX Designer'] },
}
const subsAll = await fetchAll(() => sb.from('submissions').select('role,experience,salary,source').neq('source', 'seed').order('created_at'))
const expBand = (e) => /under/i.test(e) ? '<1y' : /^1/.test(e) ? '1-3y' : /^3/.test(e) ? '3-5y' : /^5/.test(e) ? '5-8y' : /^8/.test(e) ? '8y+' : e
const rc = {}; for (const s of subsAll) rc[s.role] = (rc[s.role] || 0) + 1
console.log('submissions(비seed) role 분포:', Object.entries(rc).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(' · '))

for (const [key, R] of Object.entries(ROLES)) {
  const core = base.filter((p) => R.core(p) && (yoe(p) ?? 0) >= R.minY)
  const coreIds = new Set(core.map((p) => p.id))
  const wide = base.filter((p) => !coreIds.has(p.id) && R.wide(p) && (yoe(p) ?? 0) >= R.minY)
  const allP = [...core, ...wide]
  console.log(`\n==================== ${key} (minY=${R.minY}m) · 코어 ${core.length} · 확장 ${wide.length} · 합계 ${allP.length}`)
  console.log('연차\t코어\t확장\t합계\t| 현재급여 n\tp25\t중앙\tp75\t| 희망하한 n\t중앙\t| 희망상한 중앙')
  for (const b of BANDS) {
    const c = core.filter((p) => band(yoe(p)) === b), w = wide.filter((p) => band(yoe(p)) === b), s = [...c, ...w]
    const cur = s.map((p) => vnd(p, 'current_salary')).filter(ok), mn = s.map((p) => vnd(p, 'salary_min')).filter(ok), mx = s.map((p) => vnd(p, 'salary_max')).filter(ok)
    console.log(`${b}\t${c.length}\t${w.length}\t${s.length}\t| ${cur.length}\t${m(pct(cur, .25))}\t${m(pct(cur, .5))}\t${m(pct(cur, .75))}\t| ${mn.length}\t${m(pct(mn, .5))}\t| ${m(pct(mx, .5))}`)
  }
  const dist = (f) => { const d = {}; for (const p of allP) { const k = f(p); d[k] = (d[k] || 0) + 1 } return Object.entries(d).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, v]) => `${k} ${v}`).join(' · ') }
  console.log('지역:', dist((p) => t(p).address_province || '미기재'))
  console.log('영어:', dist((p) => t(p).english_level || '미상'), '| 한국어:', dist((p) => t(p).korean_level || '미상'))
  console.log('태그 직무:', dist((p) => t(p).role_detail || '미상'))
  const sd = {}; for (const p of allP) for (const k of (Array.isArray(p.skills) ? p.skills : [])) { const kk = String(k).toLowerCase(); sd[kk] = (sd[kk] || 0) + 1 }
  console.log('스킬 top25:', Object.entries(sd).sort((a, b) => b[1] - a[1]).slice(0, 25).map(([k, v]) => `${k} ${v}`).join(' · '))
  const subs = subsAll.filter((s) => R.submitRoles.includes(s.role))
  console.log(`salary map 제출(${R.submitRoles.join('/')}): ${subs.length}건 · ` + BANDS.map((b) => { const v = subs.filter((s) => expBand(s.experience) === b).map((s) => Number(s.salary)); return v.length ? `${b} n=${v.length} 중앙 ${pct(v, .5)} (p25 ${pct(v, .25)}/p75 ${pct(v, .75)})` : `${b} n=0` }).join(' · '))
  if (key === 'd3') for (const p of allP.slice(0, 40)) console.log(`   ${band(yoe(p))} | ${t(p).role_detail} | ${titles(p).slice(0, 90)} | ${m(vnd(p, 'current_salary'))}/${m(vnd(p, 'salary_min'))}`)
}
