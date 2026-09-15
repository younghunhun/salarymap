// 읽기 전용 — SLA 지연 JD별 원인 분류용: FYI 공고·발송·FYI 지원·KTC 지원 대조
import { sb, fetchAll } from '/Users/wiseungju/salarymap/scripts/outreach/lib.mjs'
const COMPANIES = ['First Marketing', 'FMC', 'Sunjin', 'QNT', 'SKTax', 'SK Tax', 'HIVELAB', 'Motive', 'ufeed', '유피드', 'Cosmos', 'Komang', 'Overlay', 'Wen', 'Wellpod', 'Jinosys']
const { data: jobs } = await sb.from('jobs').select('id,title,company,source_id,is_active,created_at')
  .or(COMPANIES.map((c) => `company.ilike.%${c}%`).join(',')).order('created_at', { ascending: false })
const ids = jobs.map((j) => j.id)
const [recs, apps] = await Promise.all([
  fetchAll(() => sb.from('job_recommendations').select('job_id,created_at').in('job_id', ids).order('id')),
  fetchAll(() => sb.from('job_applications').select('job_id,created_at').in('job_id', ids).order('id')),
])
const cnt = (arr, id) => arr.filter((x) => x.job_id === id)
for (const j of jobs) {
  const r = cnt(recs, j.id), a = cnt(apps, j.id)
  if (!r.length && !a.length && !j.is_active) continue
  const lastR = r.length ? r[r.length - 1].created_at.slice(5, 10) : '-'
  const lastA = a.length ? a[a.length - 1].created_at.slice(5, 10) : '-'
  console.log(`${(j.source_id || 'sid?').padEnd(8)} ${j.company.slice(0, 22).padEnd(24)} ${j.title.slice(0, 30).padEnd(32)} active=${j.is_active ? 'Y' : 'N'} 발송 ${String(r.length).padStart(4)}(최근 ${lastR}) FYI지원 ${String(a.length).padStart(3)}(최근 ${lastA})`)
}
