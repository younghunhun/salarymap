import { useState } from 'react'
import { useAdmin, useRefreshAdmin } from '../../lib/adminSwr'
import { RiExternalLinkLine, RiRefreshLine } from '@remixicon/react'
import { G, C, Card, SectionTitle, TableCard, T, StatusTag, PrimaryButton, SecondaryButton, GhostButton, Field, State, Notice } from './ui'

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
    catch (e) { setMsg(e.message === 'already_listed' ? L('이미 등록된 이메일입니다', 'Already listed') : e.message) }
    setBusy('')
  }
  const remove = async (row) => {
    if (!confirm(L(`${row.email} 을(를) 블랙리스트에서 제거하시겠습니까?`, `Remove ${row.email}?`))) return
    setBusy(row.id); setMsg('')
    try { await call('DELETE', { id: row.id }); refresh() }
    catch (e) { setMsg(e.message) }
    setBusy('')
  }

  if (error) return <State kind="error">{L('불러오기 실패', 'Failed to load')} — {error.message}</State>
  if (isLoading || !data) return <State kind="loading">{L('불러오는 중…', 'Loading…')}</State>

  const rows = data.rows || []
  const fmt = (s) => (s ? new Date(s).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—')
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  return (
    <div style={{ paddingBottom: 40 }}>
      <SectionTitle
        sub={L('면접 당일 노쇼·직전 취소자입니다. 등록되면 FYI 지원(모든 경로), 담당자 추천, 유사 공고 자동 추천, 콜드메일 대상에서 제외됩니다. 원본은 ops 시트의 Blacklist 탭이며 하루 2회 자동 동기화됩니다.',
               'No-shows and last-minute cancellations. Listed people cannot apply via FYI and are excluded from all recommendations. Source of truth is the ops sheet Blacklist tab, synced twice daily.')}
        right={<>
          <SecondaryButton prefixIcon={<RiExternalLinkLine size={16} />} label={L('시트 열기', 'Open sheet')} onClick={() => window.open(SHEET_URL, '_blank', 'noopener')} />
          <PrimaryButton prefixIcon={<RiRefreshLine size={16} />} loading={busy === 'sync'} disabled={!!busy} label={L('시트 동기화', 'Sync sheet')} onClick={sync} />
        </>}
      >
        {L('후보자 블랙리스트', 'Candidate blacklist', 'Danh sách đen')} <span style={{ color: C.faint, fontWeight: 500 }}>{rows.length}</span>
      </SectionTitle>

      <Card padding={G.lg} style={{ marginBottom: G.md }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: G.sm, alignItems: 'center' }}>
          <Field width={220} placeholder="email" value={form.email} onChange={set('email')} />
          <Field width={150} placeholder={L('이름', 'Name')} value={form.full_name} onChange={set('full_name')} />
          <Field width={150} placeholder={L('기업', 'Company')} value={form.company} onChange={set('company')} />
          <div style={{ flex: 1, minWidth: 200 }}><Field placeholder={L('사유', 'Reason')} value={form.reason} onChange={set('reason')} /></div>
          <SecondaryButton loading={busy === 'add'} disabled={!!busy || !form.email.includes('@')} label={L('직접 추가', 'Add')} onClick={add} />
        </div>
      </Card>
      <Notice tone={/실패|failed|Error|error/i.test(msg) ? 'error' : 'success'} style={{ marginBottom: G.md }}>{msg}</Notice>

      <TableCard minWidth={860}>
        <thead><tr>
          <th style={T.th}>{L('이름', 'Name')}</th><th style={T.th}>Email</th><th style={T.th}>{L('기업 · 포지션', 'Company · Position')}</th>
          <th style={T.th}>{L('사유', 'Reason')}</th><th style={T.th}>{L('프로필', 'Profile')}</th><th style={T.th}>{L('출처', 'Source')}</th><th style={T.th}>{L('등록', 'Added')}</th><th style={T.th}></th>
        </tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td style={{ ...T.td, fontWeight: 600, whiteSpace: 'nowrap' }}>{r.full_name || '—'}</td>
              <td style={T.td}>{r.email}</td>
              <td style={T.tdSub}>{[r.company, r.position].filter(Boolean).join(' · ') || '—'}</td>
              <td style={{ ...T.tdSub, maxWidth: 300 }}>{r.reason || '—'}{r.cv_url && <> · <a href={r.cv_url} target="_blank" rel="noreferrer" style={{ color: C.sub, textDecoration: 'underline' }}>CV</a></>}</td>
              <td style={T.td}>{r.user_id ? <StatusTag tone="success">{L('매칭', 'Matched')}</StatusTag> : <StatusTag tone="neutral">{L('미가입', 'No account')}</StatusTag>}</td>
              <td style={{ ...T.tdSub, whiteSpace: 'nowrap' }}>{r.source === 'sheet' ? L('시트', 'Sheet') : `${L('어드민', 'Admin')}${r.added_by ? ` · ${r.added_by.split('@')[0]}` : ''}`}</td>
              <td style={{ ...T.tdSub, whiteSpace: 'nowrap' }}>{fmt(r.synced_at || r.created_at)}</td>
              <td style={T.tdAction}>{r.source === 'admin' && <GhostButton size="small" disabled={!!busy} label={L('삭제', 'Remove')} onClick={() => remove(r)} />}</td>
            </tr>
          ))}
          {!rows.length && <tr><td colSpan={8} style={{ ...T.td, textAlign: 'center', color: C.faint, padding: 32 }}>{L('등록된 후보자가 없습니다. "시트 동기화"를 눌러 가져오세요.', 'Empty — press "Sync sheet"')}</td></tr>}
        </tbody>
      </TableCard>
    </div>
  )
}
