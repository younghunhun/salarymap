import { ActionButton, TextField, TabGroup, Tag } from '@likelion-design/ui'
import { RiSearchLine } from '@remixicon/react'

// 어드민 공용 UI 부품 — LIKELION Design System(@likelion-design/ui) 위에 얹은 얇은 층.
// 어드민 뷰는 버튼·입력·태그·카드·통계 타일·표를 여기서만 가져다 쓴다. 뷰마다 인라인 스타일로
// 버튼/타일을 새로 그리던 것이 화면별 높이·간격·색 불일치의 원인이었다(10/6 정리).
//
// 규칙
//  - 간격은 G(4·8·12·16·24) 만. 요소 사이 sm, 묶음 사이 lg, 카드 사이 md, 섹션 사이 xl.
//  - 주황(primary)은 화면당 주 행동 1개에만. 나머지 버튼은 Secondary(회색 테두리) / Ghost(글자만).
//  - 숫자는 tabular-nums, 표의 숫자 열은 오른쪽 정렬.
//  - 장식용 이모지는 제목에 쓰지 않는다. 한국어 문구는 '~합니다/~해 주세요'.
//
// DS v1.0.32 실측 주의 — 아래 조합만 스타일이 정의돼 있다(그 외는 테두리 없는 글자로 뜬다):
//   ActionButton: primary(solid·outline·ghost) / neutral(solid·outline·ghost·weak) / secondary(solid·weak)
//   IconButton:   solid·outline 만 (weak 없음)
//   Tag:          weak 만 사용 (outline 은 패키지 자체 preflight 에 져서 테두리가 안 보인다)
// 그래서 버튼은 아래 Primary/Secondary/Ghost 래퍼로만 쓴다.

export const G = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 }
export const C = {
  text: 'var(--color-gray-900, #191F28)',
  body: 'var(--color-gray-700, #4E5967)',
  sub: 'var(--color-gray-600, #6B7583)',
  faint: 'var(--color-gray-500, #8A95A0)',
  border: 'var(--color-gray-200, #E5E7EA)',
  line: 'var(--color-gray-100, #F3F4F6)',
  bg: 'var(--color-gray-50, #F9FAFB)',
  primary: 'var(--color-primary-500, #FF6000)',
  positive: '#1B7A43',
  negative: '#D92D20',
}
export const ellipsis = { minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }
export const mono = { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 13 }
export const num = { fontVariantNumeric: 'tabular-nums' }

// ── 버튼 ─────────────────────────────────────────────────────────────
// size: 'small'(28px, 표·카드 안) | 'medium'(36px, 기본) | 'large'(48px, 폼 제출)
export function PrimaryButton({ size = 'medium', ...p }) { return <ActionButton size={size} color="primary" type="solid" {...p} /> }
export function SecondaryButton({ size = 'medium', ...p }) { return <ActionButton size={size} color="neutral" type="outline" {...p} /> }
export function GhostButton({ size = 'medium', ...p }) { return <ActionButton size={size} color="neutral" type="ghost" {...p} /> }

// ── 입력 ─────────────────────────────────────────────────────────────
// 검색창 — 높이 36px(medium 버튼과 같은 줄에 놓인다)
export function SearchField({ width = 280, ...p }) {
  return <TextField type="input" size="small" width={width} prefixIcon={<RiSearchLine size={16} />} {...p} />
}
// 한 줄 입력 — title(라벨)·description(도움말)·required 는 TextField 그대로
export function Field({ width = '100%', ...p }) { return <TextField type="input" size="small" width={width} {...p} /> }
export function TextArea({ width = '100%', height = 88, ...p }) { return <TextField type="area" size="small" width={width} height={height} {...p} /> }

// ── 필터 탭(알약) ────────────────────────────────────────────────────
// items: [{ value, label, count? }]
export function FilterTabs({ value, onChange, items }) {
  return (
    <TabGroup type="round" size="medium" gap={G.sm} value={value} onChange={onChange}
      items={items.map(it => ({ value: it.value, label: it.count === undefined ? it.label : `${it.label} ${it.count}` }))} />
  )
}

// ── 상태 태그 ────────────────────────────────────────────────────────
// tone: success(초록) | warning(노랑) | error(빨강) | info(파랑) | primary(주황) | neutral(회색)
const TONE = { success: 'success', warning: 'warning', error: 'error', info: 'progressing', primary: 'enabled', neutral: 'enabled' }
export function StatusTag({ tone = 'neutral', size = 'small', children, style }) {
  return <Tag type="weak" size={size} state={TONE[tone] || 'enabled'} className={tone === 'neutral' ? 'tag--color-neutral' : ''} style={{ flexShrink: 0, ...style }} label={children} />
}

// ── 카드 · 섹션 ──────────────────────────────────────────────────────
export function Card({ children, padding = 20, style, className }) {
  return <div className={className} style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 12, padding, ...style }}>{children}</div>
}
// 강조 구역 — 화면에서 가장 먼저 보는 블록 하나(예: 추이 탭의 '오늘 실시간')를 옅은 주황 바탕으로 띄운다.
// 안에는 흰 StatTile(large)을 넣는다. 한 화면에 하나만.
export function EmphasisCard({ children, padding = 20, style, className }) {
  return <div className={className} style={{ background: 'var(--color-primary-50, #FFEFE5)', border: '1px solid var(--color-primary-100, #FFDFCC)', borderRadius: 12, padding, ...style }}>{children}</div>
}
// 섹션 제목 — title(16/600) + 선택 sub(13 회색, 제목 아래) + 선택 right(버튼 등, 오른쪽)
export function SectionTitle({ children, sub, right, style }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: G.md, marginBottom: G.lg, ...style }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 16, fontWeight: 600, color: C.text, lineHeight: 1.4 }}>{children}</div>
        {sub && <div style={{ fontSize: 13, color: C.sub, lineHeight: 1.5, marginTop: 2 }}>{sub}</div>}
      </div>
      {right && <div style={{ display: 'flex', alignItems: 'center', gap: G.sm, flexShrink: 0 }}>{right}</div>}
    </div>
  )
}

// ── 통계 타일 ────────────────────────────────────────────────────────
// 기본 모양 하나: 흰 카드, 라벨(12/600 회색) → 값(24/700) → 보조(12 회색).
// emphasis: 옅은 주황 박스 + 큰 값(28px). 그 화면에서 제일 먼저 봐야 하는 숫자에만(전부 강조하면 강조가 아니다).
// large:    박스 색은 그대로 두고 값만 28px — 강조 구역(EmphasisCard) 안의 흰 타일에 쓴다.
// accent: 값 색(주 지표 1개에만 C.primary). delta: 값 옆 작은 보조 수치(예: '68%').
export function StatGrid({ children, min = 180, style }) {
  return <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fit, minmax(${min}px, 1fr))`, gap: G.md, ...style }}>{children}</div>
}
export function StatTile({ label, value, sub, delta, accent, emphasis = false, large = false, style }) {
  const box = emphasis
    ? { background: 'var(--color-primary-50, #FFEFE5)', border: '1px solid var(--color-primary-100, #FFDFCC)' }
    : { background: '#fff', border: `1px solid ${C.border}` }
  return (
    <div style={{ ...box, borderRadius: 12, padding: `${G.lg}px 20px`, minWidth: 0, ...style }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: emphasis ? 'var(--color-primary-700, #993A00)' : C.sub, ...ellipsis }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 6 }}>
        <span style={{ fontSize: emphasis || large ? 28 : 24, fontWeight: 700, color: accent || C.text, lineHeight: 1.15, letterSpacing: '-0.01em', ...num }}>{value}</span>
        {delta !== undefined && delta !== null && <span style={{ fontSize: 12, fontWeight: 600, color: emphasis ? 'var(--color-primary-600, #CC4D00)' : C.faint, ...num }}>{delta}</span>}
      </div>
      {sub && <div style={{ fontSize: 12, color: emphasis ? 'var(--color-primary-700, #993A00)' : C.faint, marginTop: 4, lineHeight: 1.4 }}>{sub}</div>}
    </div>
  )
}

// ── 표 ───────────────────────────────────────────────────────────────
// <TableCard minWidth={760}><thead><tr><th style={T.th}>…</th><th style={T.thNum}>…</th></tr></thead>
//   <tbody><tr><td style={T.td}>…</td><td style={T.tdNum}>…</td></tr></tbody></TableCard>
export const T = {
  th: { textAlign: 'left', padding: '10px 16px', fontSize: 12, fontWeight: 600, color: C.sub, whiteSpace: 'nowrap', background: C.bg, borderBottom: `1px solid ${C.border}` },
  td: { padding: '12px 16px', fontSize: 13.5, color: C.text, borderBottom: `1px solid ${C.line}`, verticalAlign: 'middle' },
}
T.thNum = { ...T.th, textAlign: 'right' }
T.tdNum = { ...T.td, textAlign: 'right', ...num }
T.tdSub = { ...T.td, color: C.sub }
T.tdAction = { ...T.td, textAlign: 'right', whiteSpace: 'nowrap', width: 1 }
export function TableCard({ children, minWidth = 640, style }) {
  return (
    <div className="adm-m-scroll" style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden', overflowX: 'auto', ...style }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth }}>{children}</table>
    </div>
  )
}

// ── 로딩 · 오류 · 빈 상태 ───────────────────────────────────────────
// kind: 'loading' | 'error' | 'empty'.  empty 는 title + 선택 children(설명) + 선택 action(버튼)
export function State({ kind = 'empty', title, children, action }) {
  if (kind !== 'empty') {
    return <div style={{ textAlign: 'center', padding: 48, fontSize: 14, color: kind === 'error' ? C.negative : C.sub }}>{title || children}</div>
  }
  return (
    <div style={{ border: `1px dashed ${C.border}`, borderRadius: 12, padding: '40px 20px', textAlign: 'center' }}>
      {title && <div style={{ fontSize: 15, fontWeight: 600, color: C.text }}>{title}</div>}
      {children && <div style={{ fontSize: 13, color: C.faint, marginTop: G.xs, lineHeight: 1.5 }}>{children}</div>}
      {action && <div style={{ marginTop: G.lg, display: 'flex', justifyContent: 'center' }}>{action}</div>}
    </div>
  )
}
// 저장/동기화 결과 한 줄 메시지. tone: 'error' | 'success'
export function Notice({ tone = 'error', children, style }) {
  if (!children) return null
  return <div style={{ fontSize: 13, fontWeight: 600, color: tone === 'error' ? C.negative : C.positive, ...style }}>{children}</div>
}
