// 후보자 블랙리스트 조회 — candidate_blacklist(supabase/migrations/20260923_candidate_blacklist.sql).
// 지원 차단·추천 제외 지점이 전부 이 두 함수를 쓴다. 키는 user_id 우선, 없으면 이메일(lowercase).
// 테이블이 아직 없는 환경에서는 "없음"으로 통과시킨다 — 블랙리스트 때문에 지원 자체가 죽으면 안 된다.

const norm = (e) => String(e || '').trim().toLowerCase()

// 한 사람 판정 — 지원 API 처럼 요청마다 1건만 볼 때.
export async function isBlacklisted(supabase, { userId, email }) {
  const e = norm(email)
  if (!userId && !e) return false
  const ors = []
  if (userId) ors.push(`user_id.eq.${userId}`)
  if (e) ors.push(`email.ilike.${e.replace(/[%_,()]/g, '')}`)
  const { data, error } = await supabase.from('candidate_blacklist').select('id').or(ors.join(',')).limit(1)
  if (error) { console.error('blacklist check:', error.message); return false }
  return !!(data && data.length)
}

// 전량 로드 — 추천 풀처럼 수백~수천 명을 거를 때. { userIds:Set, emails:Set, has(p) }
export async function fetchBlacklist(supabase) {
  const userIds = new Set(), emails = new Set()
  const { data, error } = await supabase.from('candidate_blacklist').select('user_id, email').range(0, 9999)
  if (error) console.error('blacklist fetch:', error.message)
  for (const r of data || []) { if (r.user_id) userIds.add(r.user_id); if (r.email) emails.add(norm(r.email)) }
  return { userIds, emails, has: ({ id, user_id, email } = {}) => userIds.has(id || user_id) || emails.has(norm(email)) }
}
