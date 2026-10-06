import { createClient } from '@supabase/supabase-js'
import { verifyAdminOrDevStub } from './check'

// 공고 묶음(캠페인 랜딩 /l/<slug>) CRUD — 어드민 '캠페인 링크' 탭. 표: job_collections
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const FIELDS = ['slug', 'title', 'description', 'job_ids', 'og_image_url', 'utm_source', 'utm_medium', 'utm_campaign', 'is_active']
const SLUG_RE = /^[a-z0-9][a-z0-9-]{1,59}$/
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const pickFields = (body) => {
  const out = {}
  for (const f of FIELDS) if (f in body) out[f] = body[f] === '' ? null : body[f]
  if ('slug' in out && out.slug) out.slug = String(out.slug).trim().toLowerCase()
  return out
}

// 저장 전 검증 — slug 형식, job_ids 는 uuid 배열(중복 제거), utm_source/medium 은 비우면 기본값 유지.
function validate(payload) {
  if ('slug' in payload && !SLUG_RE.test(payload.slug || '')) return 'slug: 소문자·숫자·하이픈 2~60자'
  if ('title' in payload && !payload.title) return 'title required'
  if ('job_ids' in payload) {
    if (!Array.isArray(payload.job_ids)) return 'job_ids must be an array'
    const ids = [...new Set(payload.job_ids.map(s => String(s).trim()).filter(Boolean))]
    if (ids.some(id => !UUID_RE.test(id))) return 'job_ids: invalid uuid'
    payload.job_ids = ids
  }
  for (const k of ['utm_source', 'utm_medium']) if (k in payload && payload[k] === null) delete payload[k]
  return null
}

export default async function handler(req, res) {
  const admin = await verifyAdminOrDevStub(req)
  if (!admin) return res.status(401).json({ error: 'Unauthorized' })

  try {
    // 공고 선택용 경량 목록 (?picker=1) — /api/admin/jobs 는 select('*') 라 본문·raw_payload 까지 26MB/6초가 걸려
    // 검색창이 그동안 '결과 없음'으로 보였다(10/6). 검색·표시에 쓰는 5개 필드만 준다.
    if (req.method === 'GET' && req.query.picker === '1') {
      const PAGE = 1000
      let jobs = []
      for (let offset = 0; ; offset += PAGE) {
        const { data: page, error } = await supabase
          .from('jobs')
          .select('id, title, company, source_id, is_active')
          .order('created_at', { ascending: false })
          .order('id', { ascending: false })
          .range(offset, offset + PAGE - 1)
        if (error) throw error
        jobs = jobs.concat(page || [])
        if (!page || page.length < PAGE) break
      }
      return res.json({ jobs })
    }

    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('job_collections')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      return res.json({ collections: data })
    }

    if (req.method === 'POST') {
      const payload = pickFields(req.body || {})
      if (!payload.slug || !payload.title) return res.status(400).json({ error: 'slug and title are required' })
      const bad = validate(payload)
      if (bad) return res.status(400).json({ error: bad })
      payload.created_by = admin.email || null
      const { data, error } = await supabase.from('job_collections').insert(payload).select().single()
      if (error) {
        if (error.code === '23505') return res.status(409).json({ error: 'slug already exists' })
        throw error
      }
      return res.json({ collection: data })
    }

    if (req.method === 'PUT') {
      const { id } = req.body || {}
      if (!id) return res.status(400).json({ error: 'id required' })
      const payload = pickFields(req.body)
      const bad = validate(payload)
      if (bad) return res.status(400).json({ error: bad })
      payload.updated_at = new Date().toISOString()
      const { data, error } = await supabase.from('job_collections').update(payload).eq('id', id).select().single()
      if (error) {
        if (error.code === '23505') return res.status(409).json({ error: 'slug already exists' })
        throw error
      }
      return res.json({ collection: data })
    }

    if (req.method === 'DELETE') {
      const { id } = req.body || {}
      if (!id) return res.status(400).json({ error: 'id required' })
      const { error } = await supabase.from('job_collections').delete().eq('id', id)
      if (error) throw error
      return res.json({ ok: true })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (e) {
    console.error('job-collections:', e)
    res.status(500).json({ error: e.message })
  }
}
