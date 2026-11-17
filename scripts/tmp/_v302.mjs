import { createClient } from '@supabase/supabase-js';
const c = createClient(process.env.KTC_SUPABASE_URL, process.env.KTC_SUPABASE_SERVICE_ROLE_KEY);
let { data, error } = await c.from('jd_definitions').select('*').ilike('code','%V302%');
if (error) { console.log(error.message); ({ data } = await c.from('jd_definitions').select('*').limit(1)); console.log(Object.keys(data[0])); }
for (const r of data||[]) for (const k of ['responsibilities','qualifications','preferred']) console.log('---', k, '\n'+r[k]);
