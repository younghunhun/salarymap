import { sb, fetchAll } from '../outreach/lib.mjs'
for (const t of ['salaries','salary_submissions','submissions']) { const { data, error } = await sb.from(t).select('*').limit(1); if (!error) console.log(t, 'cols:', Object.keys(data?.[0]||{}).join(', ')) }
const { data: p1 } = await sb.from('user_profiles').select('*').not('current_salary','is',null).limit(1)
console.log('user_profiles cols w/ salary:', Object.keys(p1?.[0]||{}).filter(k=>/salary|korean|english|yoe|position|role|location/i.test(k)).join(', '))
const { count } = await sb.from('user_profiles').select('id',{count:'exact',head:true}).not('current_salary','is',null)
console.log('profiles with current_salary:', count)
