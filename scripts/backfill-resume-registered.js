// Backfill: resume_registered 이벤트를 이력서 보유 유저당 1건씩 과거 시각으로 채운다.
// 트리거(20260917_resume_registered_events.sql)는 적용 이후 등록만 잡으므로, 그 전 등록자는
// 여기서 "이력서가 처음 들어온 시각"을 가장 신뢰할 수 있는 근거로 재구성한다.
//   1) 레거시 등록 이벤트(cv_register_success / resume_upload / ktc_cv_import / coldmail_resume_upload)
//   2) 이력서를 첨부한 첫 공고 지원(job_applications.resume_url) — 지원 경로는 이벤트가 없어 이걸로 복원
//   3) 둘 다 없으면 가입일(user_profiles.created_at) — 종전 어드민 추이의 근사치와 동일
// 셋 중 가장 이른 시각을 쓴다. 이미 resume_registered 가 있는 유저는 건너뛴다(재실행 안전).
//
// Usage:
//   node scripts/backfill-resume-registered.js          # DRY RUN (no writes)
//   node scripts/backfill-resume-registered.js --apply   # insert events
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://twpxsbnkypocjfnerfmd.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_KEY) { console.error('SUPABASE_SERVICE_ROLE_KEY required'); process.exit(1); }
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const APPLY = process.argv.includes('--apply');
const LEGACY_EVENTS = ['cv_register_success', 'resume_upload', 'ktc_cv_import', 'coldmail_resume_upload'];

async function fetchAll(build) {
  const PAGE = 1000;
  let all = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await build().range(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    all = all.concat(data || []);
    if (!data || data.length < PAGE) break;
  }
  return all;
}

// 유저별 가장 이른 시각만 남긴다.
function earliestByUser(rows, label) {
  const m = {};
  for (const r of rows) {
    if (!r.user_id) continue;
    const cur = m[r.user_id];
    if (!cur || r.created_at < cur.at) m[r.user_id] = { at: r.created_at, source: label(r) };
  }
  return m;
}

async function main() {
  const [profiles, existing, legacy, apps] = await Promise.all([
    fetchAll(() => supabase.from('user_profiles')
      .select('id, created_at, resume_platform, resume_source').not('resume_url', 'is', null).order('id')),
    fetchAll(() => supabase.from('events').select('user_id').eq('event', 'resume_registered').order('id')),
    fetchAll(() => supabase.from('events').select('user_id, event, created_at')
      .in('event', LEGACY_EVENTS).not('user_id', 'is', null).order('id')),
    fetchAll(() => supabase.from('job_applications').select('user_id, created_at')
      .not('user_id', 'is', null).not('resume_url', 'is', null).order('id')),
  ]);

  const done = new Set(existing.map((e) => e.user_id));
  const byLegacy = earliestByUser(legacy, (r) => r.event);
  const byApp = earliestByUser(apps, () => 'application');

  const rows = [];
  const bySource = {};
  for (const p of profiles) {
    if (done.has(p.id)) continue;
    const candidates = [byLegacy[p.id], byApp[p.id]].filter(Boolean);
    const best = candidates.sort((a, b) => a.at.localeCompare(b.at))[0]
      || { at: p.created_at, source: 'signup_approx' };
    bySource[best.source] = (bySource[best.source] || 0) + 1;
    rows.push({
      event: 'resume_registered',
      page: 'backfill',
      user_id: p.id,
      created_at: best.at,
      meta: { platform: p.resume_platform, source: p.resume_source, backfill_from: best.source },
    });
  }

  console.log(`\nResume holders: ${profiles.length}, already have event: ${done.size}, to insert: ${rows.length}`);
  console.log('Timestamp source:', bySource);

  if (!APPLY) {
    console.log('\n[DRY RUN] No writes. Re-run with --apply to insert.');
    return;
  }

  let inserted = 0;
  for (let i = 0; i < rows.length; i += 500) {
    const { error } = await supabase.from('events').insert(rows.slice(i, i + 500));
    if (error) { console.error(`Insert error at ${i}:`, error.message); process.exit(1); }
    inserted += Math.min(500, rows.length - i);
    console.log(`  inserted ${inserted}/${rows.length}`);
  }
  console.log('Done.');
}

main().catch((e) => { console.error(e); process.exit(1); });
