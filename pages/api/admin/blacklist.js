import { createClient } from '@supabase/supabase-js'
import { verifyAdminOrDevStub } from './check'
import { syncBlacklist } from '../../../lib/ktcCandidatesSync'

// 후보자 블랙리스트 관리(어드민 ?tab=blacklist) — candidate_blacklist.
//   GET            목록 (최신순)
//   POST {email, reason, full_name?, company?} 직접 추가 (source='admin'). 같은 이메일이 있으면 409.
//   POST {action:'sync'}  ops 시트 'Blacklist' 탭 → DB 재적재 (크론과 같은 함수)
//   DELETE {id}    삭제 — source='admin' 행만. 시트 행은 시트에서 지워야 다음 동기화에 반영된다(여기서 지워도 되살아남).
// 적용 지점(지원 차단·추천 제외)은 lib/blacklist.js 참고.
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
export const config = { maxDuration: 60 }

export default async function handler(req, res) {
  const admin = await verifyAdminOrDevStub(req)
  if (!admin) return res.status(401).json({ error: 'Unauthorized' })

  try {
    if (req.method === 'GET') {
      const { data, error } = await supabase.from('candidate_blacklist').select('*').order('created_at', { ascending: false }).range(0, 9999)
      if (error) return res.status(500).json({ error: error.message })
      return res.status(200).json({ rows: data || [] })
    }

    if (req.method === 'POST') {
      if (req.body?.action === 'sync') {
        const r = await syncBlacklist()
        return res.status(200).json({ ok: true, ...r })
      }
      const email = String(req.body?.email || '').trim().toLowerCase()
      if (!email.includes('@')) return res.status(400).json({ error: 'email required' })
      const { data: dup } = await supabase.from('candidate_blacklist').select('id').ilike('email', email).limit(1)
      if (dup?.length) return res.status(409).json({ error: 'already_listed' })
      const { data: prof } = await supabase.from('user_profiles').select('id, full_name').ilike('email', email).limit(1).maybeSingle()
      const row = {
        email, user_id: prof?.id || null,
        full_name: String(req.body?.full_name || prof?.full_name || '').trim() || null,
        company: String(req.body?.company || '').trim() || null,
        position: String(req.body?.position || '').trim() || null,
        reason: String(req.body?.reason || '').trim() || null,
        source: 'admin', added_by: admin.email || null,
      }
      const { data, error } = await supabase.from('candidate_blacklist').insert(row).select('*').single()
      if (error) return res.status(500).json({ error: error.message })
      return res.status(201).json({ ok: true, row: data })
    }

    if (req.method === 'DELETE') {
      const id = req.body?.id
      if (!id) return res.status(400).json({ error: 'id required' })
      const { data: row } = await supabase.from('candidate_blacklist').select('id, source').eq('id', id).maybeSingle()
      if (!row) return res.status(404).json({ error: 'not_found' })
      if (row.source === 'sheet') return res.status(400).json({ error: 'sheet_row' })
      const { error } = await supabase.from('candidate_blacklist').delete().eq('id', id)
      if (error) return res.status(500).json({ error: error.message })
      return res.status(200).json({ ok: true })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (e) {
    console.error('admin/blacklist:', e)
    return res.status(500).json({ error: e.message })
  }
}
