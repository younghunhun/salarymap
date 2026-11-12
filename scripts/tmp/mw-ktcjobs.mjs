import { createClient } from '@supabase/supabase-js';
const c = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const { data, error } = await c.from('jobs').select('id,source_id,title,company,location,is_active,status,raw_payload,created_at').eq('source','ktc').order('company');
if (error) throw error;
for (const j of data) console.log([j.is_active?'A':'-', j.status, j.source_id, j.company, (j.title||'').slice(0,50), (j.location||'').replace(/\s+/g,' ').slice(0,30), j.raw_payload?.ktc?.is_matching_week?'MW':''].join(' | '));
