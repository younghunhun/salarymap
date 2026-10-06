import { useState, useEffect, useRef } from 'react'
import { ChipGroup } from '@likelion-design/ui'
import { RiArrowDownSLine, RiArrowLeftSLine, RiArrowRightSLine, RiCheckLine } from '@remixicon/react'
import { G, C } from './ui'

// 어드민 공고 폼 공용 커스텀 컨트롤 — 네이티브 select/date 대신 자체 UI.
// 모양은 디자인 시스템 입력(TextField size="small")에 맞춘다: 높이 36 · 모서리 4 · 1px 테두리 · 글자 15.
// 칩은 DS ChipGroup(outline·primary) 그대로 — 높이 30, 선택 시 주황 테두리 + 옅은 주황 배경.

const LINE = 'var(--color-gray-300, #D1D6DC)' // DS 입력 테두리(TextField 와 같은 값)
const INK = 'var(--color-gray-800, #333D4B)'  // DS 입력 글자색
const TINT = 'rgba(255, 96, 0, 0.08)'         // DS 칩 선택 배경
const LBL = { display: 'block', fontSize: 13, lineHeight: 1.6, marginBottom: G.xs } // DS TextField title 과 같은 크기·줄높이(21px)
const BTN = {
  width: '100%', height: 36, textAlign: 'left', fontSize: 15, padding: `0 ${G.sm}px 0 ${G.md}px`, boxSizing: 'border-box',
  border: `1px solid ${LINE}`, borderRadius: 4, background: '#fff', cursor: 'pointer', color: INK, fontFamily: 'inherit',
  display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: G.sm,
}
const POP = {
  position: 'absolute', top: `calc(100% + ${G.xs}px)`, left: 0, zIndex: 50, minWidth: '100%',
  background: '#fff', border: `1px solid ${C.border}`, borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
  padding: G.xs, maxHeight: 320, overflowY: 'auto',
}
const ARROW = <RiArrowDownSLine size={18} style={{ color: C.faint, flexShrink: 0 }} />

function useClickOutside(open, setOpen) {
  const ref = useRef(null)
  useEffect(() => {
    if (!open) return
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDoc); document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey) }
  }, [open, setOpen])
  return ref
}

// ── 알약 단일선택 (고용형태 등 옵션 2~4개짜리) ──────────────────────────────
export function Chips({ label, value, options, onChange }) {
  return (
    <div>
      {label && <label style={LBL}>{label}</label>}
      <ChipGroup type="outline" variant="primary" size="medium" items={options} value={value ?? ''} onChange={onChange}
        style={{ display: 'flex', flexWrap: 'wrap', gap: G.sm }} />
    </div>
  )
}

// ── 커스텀 드롭다운 (그룹 지원 + 직접 입력) ─────────────────────────────────
export function Dropdown({ label, value, options = [], groups = null, onChange, allowCustom = false, placeholder = '—', customLabel = '직접 입력…' }) {
  const [open, setOpen] = useState(false)
  const [customMode, setCustomMode] = useState(false)
  const ref = useClickOutside(open, setOpen)
  const customRef = useRef(null)
  useEffect(() => { if (customMode) customRef.current?.focus() }, [customMode])

  const flat = groups ? groups.flatMap(g => g.options) : options
  const current = flat.find(o => o.value === value)
  // 목록에 없는 값(직접 입력됐던 값)도 라벨로 표시
  const display = current ? current.label : (value || '')

  const item = (o) => {
    const on = o.value === value
    return (
      <button key={o.value} type="button" onClick={() => { onChange(o.value); setOpen(false) }} style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%',
        gap: G.sm, fontSize: 14, padding: `${G.sm}px ${G.md}px`, border: 'none', borderRadius: 4, cursor: 'pointer', textAlign: 'left',
        background: on ? C.bg : 'transparent', color: C.text, fontWeight: on ? 600 : 400, fontFamily: 'inherit',
      }}
        onMouseEnter={e => { if (!on) e.currentTarget.style.background = C.bg }}
        onMouseLeave={e => { if (!on) e.currentTarget.style.background = 'transparent' }}
      >
        {o.label}{on && <RiCheckLine size={16} style={{ color: C.primary, flexShrink: 0 }} />}
      </button>
    )
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {label && <label style={LBL}>{label}</label>}
      {customMode ? (
        <input
          ref={customRef}
          defaultValue={value || ''}
          onBlur={e => { onChange(e.target.value.trim()); setCustomMode(false) }}
          onKeyDown={e => { if (e.key === 'Enter') { onChange(e.target.value.trim()); setCustomMode(false) } }}
          style={{ width: '100%', height: 36, fontSize: 15, padding: `0 ${G.md}px`, boxSizing: 'border-box', border: `1px solid ${INK}`, borderRadius: 4, outline: 'none', color: INK, fontFamily: 'inherit' }}
        />
      ) : (
        <button type="button" onClick={() => setOpen(v => !v)} style={{ ...BTN, borderColor: open ? INK : LINE }}>
          <span style={{ color: display ? INK : C.faint, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{display || placeholder}</span>
          {ARROW}
        </button>
      )}
      {open && (
        <div style={POP}>
          {groups
            ? groups.map(g => (
                <div key={g.key || g.label}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: C.faint, padding: `${G.sm}px ${G.md}px ${G.xs}px` }}>{g.label}</div>
                  {g.options.map(item)}
                </div>
              ))
            : options.map(item)}
          {allowCustom && (
            <button type="button" onClick={() => { setOpen(false); setCustomMode(true) }} style={{
              display: 'block', width: '100%', fontSize: 14, padding: `${G.sm}px ${G.md}px`, border: 'none', borderTop: `1px solid ${C.line}`,
              borderRadius: 0, cursor: 'pointer', textAlign: 'left', background: 'transparent', color: C.sub, fontWeight: 400, marginTop: G.xs, fontFamily: 'inherit',
            }}>
              {customLabel}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ── 단일 날짜 피커 (마감일 등) — 달력 팝오버 + 프리셋 ───────────────────────
const MONTHS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const WD = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
const pad = (n) => String(n).padStart(2, '0')
const fmt = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

export function DatePickerSingle({ label, value, onChange, emptyLabel = '상시 채용', presets = [7, 14, 30] }) {
  const [open, setOpen] = useState(false)
  const ref = useClickOutside(open, setOpen)
  const today = new Date()
  const anchor = value ? new Date(value) : today
  const [viewY, setViewY] = useState(anchor.getFullYear())
  const [viewM, setViewM] = useState(anchor.getMonth())
  useEffect(() => {
    if (!open) return
    const a = value ? new Date(value) : new Date()
    setViewY(a.getFullYear()); setViewM(a.getMonth())
  }, [open]) // eslint-disable-line

  const first = new Date(viewY, viewM, 1)
  const startPad = (first.getDay() + 6) % 7
  const daysInMonth = new Date(viewY, viewM + 1, 0).getDate()
  const cells = [...Array(startPad).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)]
  const todayS = fmt(today)

  const navBtn = { width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, border: 'none', background: 'transparent', cursor: 'pointer', color: C.body, borderRadius: 4 }
  const presetBtn = { height: 28, fontSize: 13, cursor: 'pointer', borderRadius: 999, padding: `0 ${G.md}px`, border: `1px solid ${LINE}`, background: '#fff', color: INK, fontFamily: 'inherit' }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {label && <label style={LBL}>{label}</label>}
      <button type="button" onClick={() => setOpen(v => !v)} style={{ ...BTN, borderColor: open ? INK : LINE }}>
        <span style={{ color: value ? INK : C.faint }}>{value || emptyLabel}</span>
        {ARROW}
      </button>
      {open && (
        <div style={{ ...POP, left: 'auto', right: 0, minWidth: 0, width: 264, padding: G.md }}>
          <div style={{ display: 'flex', gap: G.xs, flexWrap: 'wrap', marginBottom: G.md }}>
            <button type="button" style={{ ...presetBtn, ...(value ? {} : { borderColor: C.primary, background: TINT, color: C.primary }) }} onClick={() => { onChange(''); setOpen(false) }}>{emptyLabel}</button>
            {presets.map(d => (
              <button key={d} type="button" style={presetBtn} onClick={() => {
                const t = new Date(); t.setDate(t.getDate() + d); onChange(fmt(t)); setOpen(false)
              }}>+{d}d</button>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: G.xs }}>
            <button type="button" style={navBtn} onClick={() => { const m = viewM - 1; setViewM((m + 12) % 12); if (m < 0) setViewY(viewY - 1) }}><RiArrowLeftSLine size={18} /></button>
            <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{MONTHS_EN[viewM]} {viewY}</div>
            <button type="button" style={navBtn} onClick={() => { const m = viewM + 1; setViewM(m % 12); if (m > 11) setViewY(viewY + 1) }}><RiArrowRightSLine size={18} /></button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
            {WD.map((w, i) => <div key={i} style={{ fontSize: 12, fontWeight: 600, color: C.faint, textAlign: 'center', padding: `${G.xs}px 0` }}>{w}</div>)}
            {cells.map((d, i) => {
              if (!d) return <div key={i} />
              const s = `${viewY}-${pad(viewM + 1)}-${pad(d)}`
              const sel = s === value
              const isToday = s === todayS
              return (
                <button key={i} type="button" onClick={() => { onChange(s); setOpen(false) }} style={{
                  width: '100%', aspectRatio: '1', padding: 0, border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 13, fontFamily: 'inherit',
                  fontWeight: sel || isToday ? 600 : 400, fontVariantNumeric: 'tabular-nums',
                  background: sel ? C.primary : 'transparent',
                  color: sel ? '#fff' : isToday ? C.primary : C.text,
                }}
                  onMouseEnter={e => { if (!sel) e.currentTarget.style.background = C.bg }}
                  onMouseLeave={e => { if (!sel) e.currentTarget.style.background = 'transparent' }}
                >{d}</button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
