import { createClient } from '@supabase/supabase-js'
import JobsPage from '../jobs'
import { LIST_FIELDS } from '../api/jobs'

// 캠페인 링크 /l/<slug> — 어드민 '캠페인 링크' 탭(job_collections)에서 만든 공고 묶음 랜딩.
// 화면은 /jobs 그대로 재사용하고(지원·상세 패널·북마크 전부 동일), 보이는 공고를 collection.job_ids
// 로 좁히고 제목/OG 만 캠페인 값으로 바꾼다. 메타 크롤러는 JS 를 안 돌리므로 OG 는 SSR 이어야 한다.
// 공고 자체는 /api/jobs(active only)에서 오므로 비활성 공고는 자동으로 빠진다.
export async function getServerSideProps({ params }) {
  const slug = String(params.slug || '').toLowerCase()
  if (!/^[a-z0-9][a-z0-9-]{1,59}$/.test(slug)) return { notFound: true }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
  const { data } = await supabase
    .from('job_collections')
    .select('slug, title, description, job_ids, og_image_url')
    .eq('slug', slug)
    .eq('is_active', true)
    .maybeSingle()
  if (!data) return { notFound: true }

  // 묶은 공고를 SSR 로 같이 내려 첫 화면에 바로 그린다 — 안 그러면 /api/jobs(활성 공고 전체, 1.8MB)를
  // 다 받을 때까지 스켈레톤만 보인다. 필드는 /api/jobs 목록과 동일(LIST_FIELDS), 활성 공고만.
  const { data: jobs } = await supabase
    .from('jobs')
    .select(LIST_FIELDS)
    .in('id', data.job_ids || [])
    .eq('is_active', true)

  return { props: { collection: { ...data, jobs: jobs || [] } } }
}

export default function CollectionPage({ collection }) {
  return <JobsPage collection={collection} />
}
