import { sb } from '../outreach/lib.mjs'
import { readFileSync } from 'node:fs'
const A=JSON.parse(readFileSync('/private/tmp/claude-501/-Users-seungjuwi-Documents-GitHub-salarymap/a90ee903-8fc4-4bbe-a8c4-51476f49d541/scratchpad/sample100-mini.json','utf8')).results, B=Object.fromEntries(JSON.parse(readFileSync('/private/tmp/claude-501/-Users-seungjuwi-Documents-GitHub-salarymap/a90ee903-8fc4-4bbe-a8c4-51476f49d541/scratchpad/sample100-4o.json','utf8')).results.map(r=>[r.id,r]))
const dis=A.filter(r=>B[r.id]&&r.tags.role_detail!==B[r.id].tags.role_detail)
const { data } = await sb.from('user_profiles').select('id,position,headline,experiences,major').in('id', dis.map(r=>r.id))
for (const r of dis) { const p=data.find(x=>x.id===r.id)||{}; console.log('\n'+(r.name||'?')+'  mini='+r.tags.role_detail+' | 4o='+B[r.id].tags.role_detail+' | 기존 position='+p.position); console.log('   headline:', p.headline, '| major:', p.major); for (const e of (p.experiences||[]).slice(0,3)) console.log('   -', e.title||e.role, '@', e.company, e.months?e.months+'m':'') }
