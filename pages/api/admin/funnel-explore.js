import { createClient } from '@supabase/supabase-js'
import { verifyAdminOrDevStub } from './check'

// 행동 퍼널 API — 계산은 전부 Postgres RPC(20260716_funnel_analytics.sql).
// 이벤트 행을 서버로 끌어와 JS로 세지 않는다.
//  ?catalog=1&from&to                            → 이벤트 카탈로그 (list_events)
//  ?steps=a,b,c&from&to&window=86400&order=this  → Amplitude 의미론 퍼널 (funnel)
//     window: 전환 윈도우(초, t0 기준 누적), order: this|any|exact
//     &checkOrder=1 → 같은 조건 any 결과를 steps[].anyUsers 로 함께 반환 (순서 경고용)
//  &mode=count                                   → 순서 무시 이벤트 건수만

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const STEP_RE = /^[a-zA-Z0-9_.:-]{2,64}$/
const MISSING_RPC = (e) => e && (e.code === 'PGRST202' || /function .* does not exist|schema cache/i.test(e.message || ''))
const vnToday = () => new Date(Date.now() + 7 * 3600000).toISOString().slice(0, 10)

export default async function handler(req, res) {
  const user = await verifyAdminOrDevStub(req)
  if (!user) return res.status(401).json({ error: 'Unauthorized' })

  const { from, to } = req.query
  const startISO = new Date(`${from || '2026-04-20'}T00:00:00+07:00`).toISOString()
  // to 는 "그 날 포함" 의미라 반열린 [from, to+1day) 로 변환
  const endISO = new Date(new Date(`${to || vnToday()}T00:00:00+07:00`).getTime() + 86400000).toISOString()

  try {
    if (req.query.catalog) {
      const { data, error } = await supabase.rpc('list_events', { p_from: startISO, p_to: endISO })
      if (error) throw error
      return res.status(200).json({ events: data || [] })
    }

    const steps = String(req.query.steps || '').split(',').map(s => s.trim()).filter(Boolean)
    if (steps.length < 2 || steps.length > 10 || !steps.every(s => STEP_RE.test(s))) {
      return res.status(400).json({ error: 'steps must be 2~10 event names' })
    }

    if (req.query.mode === 'count') {
      // 건수 모드는 퍼널이 아니라 단순 카운트 — DB head-count 병렬 쿼리
      const counts = await Promise.all(steps.map(async ev => {
        const { count } = await supabase.from('events')
          .select('id', { count: 'exact', head: true })
          .eq('event', ev).gte('created_at', startISO).lt('created_at', endISO)
        return count || 0
      }))
      return res.status(200).json({ mode: 'count', steps: steps.map((event, i) => ({ event, count: counts[i] })) })
    }

    const windowSec = Math.max(1, Math.min(parseInt(req.query.window, 10) || 86400, 366 * 86400))
    const order = ['this', 'any', 'exact'].includes(req.query.order) ? req.query.order : 'this'

    const runFunnel = (ord) => supabase.rpc('funnel', {
      p_steps: steps.map(event => ({ event })),
      p_from: startISO,
      p_to: endISO,
      p_window: `${windowSec} seconds`,
      p_order: ord,
    })
    // 순서 검증용: 같은 조건을 순서무관(any)으로도 돌려, 순서 때문에 잘린 인원을 UI 가 경고할 수 있게 한다.
    const checkOrder = req.query.checkOrder === '1' && order !== 'any'
    const [main, anyRun] = await Promise.all([runFunnel(order), checkOrder ? runFunnel('any') : null])
    if (main.error) throw main.error

    const byIdx = (d) => (d || []).sort((a, b) => a.step_index - b.step_index)
    const anyRows = anyRun && !anyRun.error ? byIdx(anyRun.data) : null
    return res.status(200).json({
      mode: 'users',
      order,
      windowSec,
      steps: byIdx(main.data).map((r, i) => ({
        event: r.step_name,
        users: Number(r.users),
        // any 모드는 단계 간 순서가 없어 t[i]-t[i-1] 이 음수가 될 수 있다 → 소요시간 미표시
        medianSec: order === 'any' ? null : r.median_sec,
        avgSec: order === 'any' ? null : r.avg_sec,
        anyUsers: anyRows ? Number(anyRows[i]?.users ?? 0) : null,
      })),
    })
  } catch (e) {
    if (MISSING_RPC(e)) {
      return res.status(501).json({ error: 'funnel RPC 미적용 — supabase/migrations/20260716_funnel_analytics.sql 을 SQL 에디터에서 실행하세요' })
    }
    res.status(500).json({ error: e.message })
  }
}
