import { createClient } from '@supabase/supabase-js';
const k = createClient(process.env.KTC_SUPABASE_URL, process.env.KTC_SUPABASE_SERVICE_ROLE_KEY);
const { data: [r] } = await k.from('jd_definitions').select('*').ilike('code','%V302%');
const o = { ...r }; delete o.responsibilities; delete o.qualifications; delete o.preferred;
console.log(JSON.stringify(o, null, 1).slice(0, 3000));
