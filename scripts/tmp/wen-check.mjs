import { sb } from '/Users/wiseungju/salarymap/scripts/outreach/lib.mjs'
const { data } = await sb.from('jobs').select('id,title,company,source_id,is_active,created_at')
  .or('company.ilike.%wen%,company.ilike.%웬%').order('created_at', { ascending: false }).limit(10)
for (const j of data || []) console.log(`${j.company} | ${j.title} | active=${j.is_active} sid=${j.source_id} created=${j.created_at?.slice(0, 10)}`)
if (!data?.length) console.log('FYI에 웬컴퍼니 공고 없음')
