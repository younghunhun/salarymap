// cv_tags 기준 콜드메일 풀 산정 CLI — 공고 조건을 플래그로 넣으면 발송 가능 인원과 분포를 찍는다. 플래그 목록은 cvPool.mjs 머리말.
//
//   node scripts/outreach/cv-pool.mjs --roles "Accountant,Audit / Tax" --yoe 24-60 --region HCM
//   node scripts/outreach/cv-pool.mjs --job V258 --main "Sales (B2B),Business Development" --yoe 24- --region HCM --age 22-40
//   node scripts/outreach/cv-pool.mjs --job V216 --group manufacturing --kw "điện|electric" --gender m --region HCM --list
//   --list [N]   상위 N명(기본 전부)을 TSV 로 출력 · --job 이 있으면 발송가능자만
import { parseFilters, makePick, loadPool, splitHits, printSummary, printList } from './cvPool.mjs'

const f = parseFilters(process.argv.slice(2))
const { base, job, sent, applied } = await loadPool(f)
const { hit, ok, sentN, appliedN } = splitHits(base, makePick(f), sent, applied)
console.log(`기준 풀 ${base.length} (cv_tags 보유 ${base.filter((p) => p.cv_tags).length})`)
if (job) {
  console.log(`공고 ${job.source_id} ${job.company} · ${job.title} (${job.location}${job.is_active ? '' : ' · 비활성'}) — 기수신 ${sent.size} · 기지원 ${applied.size}`)
  printSummary(ok, `조건 일치 ${hit.length}명 중 발송가능`); console.log(`  (제외: 기수신 ${sentN} · 기지원 ${appliedN})`)
} else printSummary(hit)
const L = f.flag('list', false)
if (L) printList(job ? ok : hit, L === true ? undefined : Number(L))
