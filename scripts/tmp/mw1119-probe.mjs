import { sb } from '../outreach/lib.mjs'
const { data } = await sb.from('user_profiles').select('*').not('resume_url','is',null).limit(1)
console.log(Object.keys(data[0]).join(','))
const { data: t } = await sb.from('ktc_claim_profiles').select('*').limit(1); console.log(Object.keys(t[0]).join(','))
