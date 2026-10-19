import { sb } from '../outreach/lib.mjs'
const { data } = await sb.from('jobs').select('source_id,title,headcount,recruit_count,description,requirements,responsibilities,summary,raw_payload,apply_url').eq('source','ktc').in('source_id',['V222','V223'])
for (const j of data) {
  console.log('\n=====', j.source_id, j.title, '| headcount', j.headcount, '| recruit_count', j.recruit_count, '| apply_url', j.apply_url)
  const all = [j.description, j.requirements, j.responsibilities, j.summary, JSON.stringify(j.raw_payload)].join('\n')
  const re = /(số lượng|slots?|headcount|vacanc|tuyển\s*\d|\d+\s*(người|bạn|vị trí|position|명)|모집\s*인원|인원|TO\b|quantity|openings?)/gi
  let m; const seen = new Set(); while ((m = re.exec(all))) { const s = all.slice(Math.max(0, m.index - 60), m.index + 80).replace(/\s+/g, ' '); if (!seen.has(s)) { seen.add(s); console.log('  …', s) } }
  console.log('  raw_payload keys:', Object.keys(j.raw_payload || {}).join(', '))
}
