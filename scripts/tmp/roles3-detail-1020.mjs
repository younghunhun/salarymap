import { sb, fetchAll } from '../outreach/lib.mjs'
const pool = await fetchAll(() => sb.from('user_profiles').select('id,email,position,desired_roles,yoe_months,skills,headline,experiences,cv_tags,resume_url,created_at').not('email', 'is', null).not('resume_url', 'is', null).order('created_at', { ascending: false }))
const seen = new Set(), base = []
for (const p of pool) { const e = p.email.toLowerCase(); if (seen.has(e) || /likelion/i.test(e)) continue; seen.add(e); base.push(p) }
const t = (p) => p.cv_tags || {}
const titles = (p) => (Array.isArray(p.experiences) ? p.experiences.map((e) => `${e.title || e.position || ''}`).join(' | ') : '')
const sk = (p) => JSON.stringify(p.skills || '').toLowerCase()
const all = (p) => (sk(p) + ' ' + (p.headline || '') + ' ' + titles(p) + ' ' + JSON.stringify(t(p).certifications || '')).toLowerCase()
const self = (p, set) => [p.position, ...(p.desired_roles || [])].some((r) => set.has(r))
const tagAny = (p, set) => set.has(t(p).role_detail) || (t(p).role_secondary || []).some((r) => set.has(r))
const yoe = (p) => Number.isFinite(t(p).yoe_total_months) ? t(p).yoe_total_months : (p.yoe_months ?? null)
const BANDS = ['<1y', '1-3y', '3-5y', '5-8y', '8y+']
const band = (m) => m == null ? '미상' : m < 12 ? '<1y' : m < 36 ? '1-3y' : m < 60 ? '3-5y' : m < 96 ? '5-8y' : '8y+'
const feRe = /(react|vue|angular|next\.?js|nuxt|svelte|tailwind|html|css|typescript)/, beRe = /(node|nest|express|spring|django|flask|fastapi|laravel|\.net|asp\.net|rails|golang|\bgo\b|php|java\b|kotlin|postgres|mysql|mongodb)/
const pmTitle = /(project manag|quản lý dự án|scrum master|pmo|delivery manag|program manag|project lead|project coordinator)/i
const d3Strong = /(\b3d\b|blender|maya|3ds ?max|cinema ?4d|c4d|zbrush|substance|houdini|mô hình 3d|nhân vật 3d)/i
const d3Re = /(\b3d\b|blender|maya|3ds ?max|cinema ?4d|c4d|zbrush|substance|houdini|sketchup|rhino|unreal|modeling|modelling|rigging|texturing|dựng hình|mô hình 3d|nhân vật 3d|lumion|v-?ray|keyshot)/i
const ROLES = {
  fullstack: { minY: 0, L1: (p) => tagAny(p, new Set(['Fullstack'])), L2: (p) => self(p, new Set(['Fullstack'])) || (['Backend', 'Frontend', 'Web', 'Mobile'].includes(t(p).role_detail) && feRe.test(sk(p)) && beRe.test(sk(p))),
    sig: { 'React · Next.js': /(react|next\.?js)/, 'Node.js · NestJS': /(node|nestjs|nest\.js|express)/, 'Java · Spring': /(java\b|spring)/, 'TypeScript': /typescript/, 'Python · Django · FastAPI': /(python|django|fastapi|flask)/, 'Vue · Angular': /(vue|angular)/, '.NET · C#': /(\.net|c#)/, 'PHP · Laravel': /(php|laravel)/, 'Docker · K8s': /(docker|kubernetes|k8s)/, 'AWS · GCP · Azure': /(\baws\b|gcp|azure)/ } },
  pm: { minY: 0, L1: (p) => tagAny(p, new Set(['Project Manager'])) || pmTitle.test(titles(p)), L2: (p) => tagAny(p, new Set(['PM', 'PO', 'Business Analyst'])) || self(p, new Set(['Project Manager', 'PM', 'PO'])),
    sig: { 'Jira · Confluence': /(jira|confluence)/, 'Agile · Scrum': /(agile|scrum|kanban)/, 'PMP · PMI · Prince2': /(pmp|pmi|prince2)/, 'Figma': /figma/, 'SQL · 데이터': /(\bsql\b|mysql|postgres|power ?bi|tableau)/, 'Notion · Trello · Asana': /(notion|trello|asana|clickup|monday)/, 'MS Office · Excel': /(excel|microsoft office|ms office|powerpoint)/, '개발 경력 보유': /(javascript|python|java\b|react|node|\.net|php)/ } },
  d3: { minY: 36, L1: (p) => d3Strong.test(titles(p) + ' ' + (p.headline || '') + ' ' + (p.position || '')) || (['Graphic Designer', 'Motion / Video', 'UI/UX Designer'].includes(t(p).role_detail) && d3Strong.test(sk(p))), L2: (p) => d3Re.test(all(p)) && (['Graphic Designer', 'Motion / Video', 'UI/UX Designer', 'Other'].includes(t(p).role_detail) || /(game|design|art)/i.test(titles(p))),
    sig: { 'Blender': /blender/, 'Maya': /maya/, 'ZBrush': /zbrush/, 'Substance Painter': /substance/, '3ds Max': /3ds ?max/, 'Cinema 4D': /(cinema ?4d|c4d)/, 'Unreal Engine': /unreal/, 'Unity': /unity/, 'Photoshop · Illustrator': /(photoshop|illustrator)/, 'After Effects · Premiere': /(after effects|premiere)/ } },
}
for (const [key, R] of Object.entries(ROLES)) {
  const L1 = base.filter((p) => R.L1(p) && (yoe(p) ?? 0) >= R.minY), ids = new Set(L1.map((p) => p.id))
  const L2 = base.filter((p) => !ids.has(p.id) && R.L2(p) && (yoe(p) ?? 0) >= R.minY)
  const A = [...L1, ...L2]
  console.log(`\n=== ${key}: L1 ${L1.length} · L2 ${L2.length} · 합 ${A.length}`)
  for (const b of BANDS) console.log(`  ${b}\t${L1.filter((p) => band(yoe(p)) === b).length}\t${L2.filter((p) => band(yoe(p)) === b).length}\t${A.filter((p) => band(yoe(p)) === b).length}`)
  const en = A.filter((p) => /^(business|native)$/.test(t(p).english_level || '')).length
  console.log(`  영어 business+: ${en} (${Math.round(100 * en / A.length)}%)`)
  const d = {}; for (const p of A) { const k = t(p).address_province || '미기재'; d[k] = (d[k] || 0) + 1 }
  console.log('  지역:', Object.entries(d).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k, v]) => `${k} ${v}`).join(' · '))
  console.log('  시그널:', Object.entries(R.sig).map(([k, re]) => `${k} ${A.filter((p) => re.test(all(p))).length}`).join(' · '))
}
