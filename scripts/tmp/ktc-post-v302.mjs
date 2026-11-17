// V302 Yellow Dr. FYI 게재 — 웹훅(ktc-job)이 항목 수 오탐으로 막아 같은 로직으로 수동 게재(2026-11-17). 슬랙 알림 없음
import { createClient } from '@supabase/supabase-js';
import { generate, problemsOf, examples, toFyiJob, KTC_CATEGORIES } from '../../_tmp_ktcjob.mjs';
const k = createClient(process.env.KTC_SUPABASE_URL, process.env.KTC_SUPABASE_SERVICE_ROLE_KEY);
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const code = 'V302';
const { data: dup } = await db.from('jobs').select('id').eq('source','ktc').eq('source_id',code).maybeSingle();
if (dup) { console.log('already', dup.id); process.exit(0); }
const { data: r } = await k.from('jd_definitions').select('*').eq('code', code).single();
const { data: co } = await k.from('client_companies').select('category, location').eq('id', r.company_id).maybeSingle();
const s = (v) => (typeof v === 'string' ? v.trim() : '');
const input = { company: s(r.company_en) || s(r.company), company_ko: s(r.company), ktc_category: s(co?.category), location: s(co?.location),
  position: s(r.position) || s(r.position_type), job_family: s(r.position_type), headcount: Number(r.hires) || 1,
  experience: s(r.experience), salary: s(r.salary), responsibilities: s(r.responsibilities), qualifications: s(r.qualifications), preferred: s(r.preferred), original_request: '' };
console.log('input', input.company, input.ktc_category, input.location, input.position);
const shots = await examples(db);
let g = await generate(input, shots); let p = problemsOf(input, g);
if (p.length) { g = await generate(input, shots, { prev: g, problems: p }); p = problemsOf(input, g); }
if (p.length) { console.log('FAIL', p, '\n'+g.responsibilities); process.exit(1); }
const row = { ...toFyiJob({ ...g, category: KTC_CATEGORIES.includes(g.category) ? g.category : null, company_name: input.company, job_id: code, headcount: input.headcount, is_active: true }, code), status: 'live' };
const { data, error } = await db.from('jobs').insert(row).select('id').single();
if (error) throw error;
const url = `https://salary-fyi.com/ktc/jobs/${data.id}`;
await k.from('jd_definitions').update({ fyi_url: url }).eq('code', code);
console.log('POSTED', url, '|', g.title, '|', g.location, '|', g.work_type);
