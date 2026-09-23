import { useState } from 'react'
import { useAdmin, useRefreshAdmin } from '../../lib/adminSwr'

// 후보자 블랙리스트 — 면접 당일 노쇼·직전 취소자. 원본은 ops 시트 'Blacklist' 탭(Anh Dang 관리, 9/23~),
// 여기서는 동기화 결과 열람 + 직접 추가/삭제. 등록되면 FYI 지원(모든 경로)·담당자 추천·유사공고 추천·콜드메일에서 빠진다.
const SHEET_URL = 'https://docs.google.com/spreadsheets/d/1jkHaMY6CM4b-Y_VQlqwULVujqdFPsAhISRVl2TSqfNo/edit?gid=948980226#gid=948980226'

export default function BlacklistView({ token, lang }) {
  const ko = lang === 'ko'
  const L = (k, e, v) => (lang === 'vi' ? (v ?? e) : ko ? k : e)
  const { data, error, isLoading } = useAdmin('/api/admin/blacklist', token)
  const refresh = useRefreshAdmin()
  const [form, setForm] = useState({ email: '', full_name: '', company: '', reason: '' })
  const [busy, setBusy] = useState('')
  const [msg, setMsg] = useState('')

  const call = async (method, body) => {
    const r = await fetch('/api/admin/blacklist', { method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(body) })
    const j = await r.json().catch(() => ({}))
    if (!r.ok) throw new Error(j.error || r.statusText)
    return j
  }
  const sync = async () => {
    setBusy('sync'); setMsg('')
    try { const r = await call('POST', { action: 'sync' }); setMsg(L(`시트 동기화 완료 — ${r.total}명 (프로필 매칭 ${r.matched})`, `Synced — ${r.total} (matched ${r.matched})`)); refresh() }
    catch (e) { setMsg(`${L('동기화 실패', 'Sync failed')}: ${e.message}`) }
    setBusy('')
  }
  const add = async () => {
    if (!form.email.includes('@')) return
    setBusy('add'); setMsg('')
    try { await call('POST', form); setForm({ email: '', full_name: '', company: '', reason: '' }); refresh() }
    catch (e) { setMsg(e.message === 'already_listed' ? L('이미 등록된 이메일', 'Already listed') : e.message) }
    setBusy('')
  }
  const remove = async (row) => {
    if (!confirm(L(`${row.email} 을 블랙리스트에서 뺄까요?`, `Remove ${row.email}?`))) return
    setBusy(row.id); setMsg('')
    try { await call('DELETE', { id: row.id }); refresh() }
    catch (e) { setMsg(e.message) }
    setBusy('')
  }

  if (error) return <div style={{ textAlign: 'center', padding: 40, color: '#c00' }}>{L('불러오기 실패', 'Failed to load')} — {error.message}</div>
  if (isLoading || !data) return <div style={{ textAlign: 'center', padding: 40, color: '#666' }}>{L('불러오는 중…', 'Loading…')}</div>

  const rows = data.rows || []
  const card = { background: '#fff', border: '1px solid #E5E8EB', borderRadius: 12, padding: '14px 16px' }
  const input = { padding: '8px 10px', border: '1px solid #D1D6DB', borderRadius: 8, fontSize: 13, fontFamily: 'inherit' }
  const btn = (primary) => ({ padding: '8px 14px', borderRadius: 8, border: primary ? 'none' : '1px solid #D1D6DB', background: primary ? '#ff6000' : '#fff', color: primary ? '#fff' : '#374151', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' })
  const th = { textAlign: 'left', padding: '10px 10px', fontWeight: 600, whiteSpace: 'nowrap', fontSize: 12, color: '#6B7280', borderBottom: '1px solid #EEF0F2' }
  const td = { padding: '10px 10px', fontSize: 13, borderBottom: '1px solid #F3F4F6', verticalAlign: 'top' }
  const fmt = (s) => (s ? new Date(s).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—')

  return (
    <div style={{ paddingBottom: 40 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 14 }}>
        <div>
          <h3 style={{ fontSize: 17, fontWeight: 700, margin: '0 0 4px' }}>{L('후보자 블랙리스트', 'Candidate blacklist', 'Danh sách đen')} <span style={{ color: '#9CA3AF', fontWeight: 500 }}>{rows.length}</span></h3>
          <div style={{ fontSize: 12, color: '#6B7280', lineHeight: 1.5 }}>
            {L('면접 당일 노쇼·직전 취소자. 등록되면 FYI 지원(모든 경로)·담당자 추천·유사공고 자동추천·콜드메일 대상에서 빠집니다. 원본은 ops 시트 Blacklist 탭이며 크론이 하루 2회 동기화합니다.',
               'No-shows and last-minute cancellations. Listed people cannot apply via FYI and are excluded from all recommendations. Source of truth is the ops sheet Blacklist tab, synced twice daily.')}
            {' '}<a href={SHEET_URL} target="_blank" rel="noreferrer" style={{ color: '#ff6000' }}>{L('시트 열기 →', 'Open sheet →')}</a>
          </div>
        </div>
        <button style={btn(true)} onClick={sync} disabled={!!busy}>{busy === 'sync' ? L('동기화 중…', 'Syncing…') : L('시트 동기화', 'Sync sheet')}</button>
      </div>

      <div style={{ ...card, marginBottom: 14, display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
        <input style={{ ...input, width: 220 }} placeholder="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <input style={{ ...input, width: 150 }} placeholder={L('이름', 'Name')} value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
        <input style={{ ...input, width: 140 }} placeholder={L('기업', 'Company')} value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
        <input style={{ ...input, flex: 1, minWidth: 200 }} placeholder={L('사유', 'Reason')} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
        <button style={btn(false)} onClick={add} disabled={!!busy || !form.email.includes('@')}>{busy === 'add' ? '…' : L('직접 추가', 'Add')}</button>
      </div>
      {msg && <div style={{ fontSize: 12.5, color: /실패|failed|Error|error/i.test(msg) ? '#c00' : '#16a34a', marginBottom: 10 }}>{msg}</div>}

      <div className="adm-m-scroll" style={{ ...card, padding: 0, overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 760 }}>
          <thead><tr>
            <th style={th}>{L('이름', 'Name')}</th><th style={th}>Email</th><th style={th}>{L('기업 · 포지션', 'Company · Position')}</th>
            <th style={th}>{L('사유', 'Reason')}</th><th style={th}>{L('프로필', 'Profile')}</th><th style={th}>{L('출처', 'Source')}</th><th style={th}>{L('등록', 'Added')}</th><th style={th}></th>
          </tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td style={{ ...td, fontWeight: 600 }}>{r.full_name || '—'}</td>
                <td style={td}>{r.email}</td>
                <td style={td}>{[r.company, r.position].filter(Boolean).join(' · ') || '—'}</td>
                <td style={{ ...td, color: '#4B5563', maxWidth: 280 }}>{r.reason || '—'}{r.cv_url && <> · <a href={r.cv_url} target="_blank" rel="noreferrer" style={{ color: '#6B7280' }}>CV</a></>}</td>
                <td style={td}>{r.user_id ? <span style={{ color: '#16a34a', fontWeight: 600 }}>{L('매칭', 'matched')}</span> : <span style={{ color: '#9CA3AF' }}>{L('미가입(이메일로 차단)', 'no account (email block)')}</span>}</td>
                <td style={td}>{r.source === 'sheet' ? L('시트', 'sheet') : `${L('어드민', 'admin')}${r.added_by ? ` · ${r.added_by.split('@')[0]}` : ''}`}</td>
                <td style={{ ...td, whiteSpace: 'nowrap', color: '#6B7280' }}>{fmt(r.synced_at || r.created_at)}</td>
                <td style={td}>{r.source === 'admin' && <button style={{ ...btn(false), padding: '4px 10px', fontSize: 12 }} onClick={() => remove(r)} disabled={!!busy}>{L('삭제', 'Remove')}</button>}</td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={8} style={{ ...td, textAlign: 'center', color: '#9CA3AF', padding: 30 }}>{L('아직 없음 — "시트 동기화"를 눌러 가져오세요', 'Empty — press "Sync sheet"')}</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}
