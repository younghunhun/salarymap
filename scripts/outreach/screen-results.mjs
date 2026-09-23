// 원탭 스크리닝 응답 집계 — events(coldmail_screen_sent/click/answer) 를 q·캠페인별 퍼널로 읽는다.
//   node scripts/outreach/screen-results.mjs [--q drone] [--list yes2,yes]   # --list 로 해당 답한 사람 명단
import { sb, fetchAll } from './lib.mjs'
const args = process.argv.slice(2)
const flag = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? (args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true) : d }
const Q = flag('q', 'drone'); const list = flag('list', null)
const ev = await fetchAll(() => sb.from('events').select('event,user_id,created_at,meta').in('event', ['coldmail_screen_sent', 'coldmail_screen_click', 'coldmail_screen_answer']).order('id'))
const rows = ev.filter((e) => e.meta?.q === Q)
const by = {}
for (const e of rows) {
  const c = e.meta.campaign; const b = (by[c] ||= { sent: new Set(), click: new Set(), ans: new Map() })
  if (e.event === 'coldmail_screen_sent') b.sent.add(e.user_id)
  else if (e.event === 'coldmail_screen_click') b.click.add(e.user_id)
  else b.ans.set(e.user_id, e.meta.answer) // 최신 행이 덮어씀
}
for (const [c, b] of Object.entries(by)) {
  const cnt = {}; for (const a of b.ans.values()) cnt[a] = (cnt[a] || 0) + 1
  console.log(`${c} (q=${Q}): 발송 ${b.sent.size} · 클릭 ${b.click.size} (${(b.click.size / (b.sent.size || 1) * 100).toFixed(0)}%) · 응답 ${b.ans.size} · ${JSON.stringify(cnt)}`)
  if (list) {
    const want = new Set(String(list).split(','))
    const ids = [...b.ans].filter(([, a]) => want.has(a)).map(([u]) => u)
    if (!ids.length) continue
    const { data } = await sb.from('user_profiles').select('id,full_name,email,position,yoe_months,location').in('id', ids)
    for (const p of data) console.log(`  [${b.ans.get(p.id)}] ${p.full_name} <${p.email}> · ${p.position} · ${((p.yoe_months || 0) / 12).toFixed(1)}y · ${String(p.location || '?').slice(0, 25)}`)
  }
}
