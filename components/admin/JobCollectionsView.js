import { useState } from 'react'
import { ActionButton, IconButton, TextField, TabGroup, ChipGroup, Tag, Toggle, Text } from '@likelion-design/ui'
import { RiAddLine, RiCloseLine, RiFileCopyLine, RiCheckLine, RiExternalLinkLine, RiArrowLeftLine, RiSearchLine } from '@remixicon/react'
import { useAdmin } from '../../lib/adminSwr'

// 캠페인 링크(공고 묶음) 관리 — 광고(Meta 등)에 쓸 짧은 공개 링크 /l/<slug> 를 만든다.
// 기본 흐름은 "공고 선택 → 플랫폼 선택 → 링크 만들기" 한 번. 제목·slug·설명·utm 은 자동으로 채우고,
// 바꾸고 싶을 때만 목록의 '수정'(상세 폼)으로 들어간다. 데이터: /api/admin/job-collections
// UI 는 LIKELION Design System(@likelion-design/ui) 컴포넌트 — 버튼 높이·간격을 손으로 맞추지 않는다.
// 주의(v1.0.32 실측): ActionButton 은 secondary+outline/ghost, primary+weak 조합의 스타일이 없어 테두리 없는 글자로 뜬다.
//   → 보조 버튼은 neutral+outline, 약한 버튼은 neutral+ghost 만 쓴다. IconButton 은 weak 가 없다(solid/outline 만).
//   Tag outline 은 :where() 규칙이라 패키지 자체 preflight(border-width:0)에 져서 테두리가 안 보인다 → weak 만 쓴다.

const SITE = 'https://salary-fyi.com'
const SITE_SHORT = 'salary-fyi.com'

// 광고/게시 플랫폼 → utm. 값은 분석 대시보드의 분류 규칙에 맞춘다:
//   revenue-metrics / admin-metrics 는 utm_source=meta 또는 medium=paid 를 유료 메타로,
//   signup-paths 는 meta·facebook·instagram 을 meta_ad, google·tiktok 을 other_ad, threads 를 threads 로 본다.
//   facebook/instagram 은 '오가닉 게시물' 전용 — 유료 메타 광고에 쓰면 오가닉으로 잡힌다.
const PLATFORMS = [
  { key: 'meta', label: ['Meta 광고', 'Meta Ads', 'Meta Ads'], utm_source: 'meta', utm_medium: 'paid' },
  { key: 'tiktok', label: ['TikTok 광고', 'TikTok Ads', 'TikTok Ads'], utm_source: 'tiktok', utm_medium: 'paid' },
  { key: 'google', label: ['Google 광고', 'Google Ads', 'Google Ads'], utm_source: 'google', utm_medium: 'paid' },
  { key: 'facebook', label: ['Facebook 게시물', 'Facebook post', 'Bài Facebook'], utm_source: 'facebook', utm_medium: 'social' },
  { key: 'instagram', label: ['Instagram 게시물', 'Instagram post', 'Bài Instagram'], utm_source: 'instagram', utm_medium: 'social' },
  { key: 'threads', label: ['Threads 게시물', 'Threads post', 'Bài Threads'], utm_source: 'threads', utm_medium: 'social' },
  { key: 'zalo', label: ['Zalo', 'Zalo', 'Zalo'], utm_source: 'zalo', utm_medium: 'social' },
]
const platformOf = (c) => PLATFORMS.find(p => p.utm_source === (c.utm_source || '').toLowerCase() && p.utm_medium === (c.utm_medium || '').toLowerCase())

const EMPTY = {
  title: '', slug: '', description: '', og_image_url: '',
  utm_source: 'meta', utm_medium: 'paid', utm_campaign: '',
  job_ids: [], is_active: true,
}

// 레이아웃 간격은 4의 배수 한 벌만 쓴다 — 요소 사이 8, 묶음 사이 16, 카드 사이 12, 섹션 사이 24.
const G = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 }
const C = {
  border: 'var(--color-gray-200, #E5E7EA)', sub: 'var(--color-gray-600, #6B7583)', faint: 'var(--color-gray-500, #8A95A0)',
  text: 'var(--color-gray-900, #191F28)', bg: 'var(--color-gray-50, #F9FAFB)',
}
const card = { background: '#fff', border: `1px solid ${C.border}`, borderRadius: 12, padding: 20 }
const mono = { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 13 }
const ellipsis = { minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }

// 공고만 고르면 나머지는 자동 — 제목/설명은 OG 미리보기용, slug 는 회사명 + 짧은 난수.
const slugify = (s) => String(s).toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60)
const rand4 = () => Math.random().toString(36).slice(2, 6)
function autoFields(jobs) {
  const companies = [...new Set(jobs.map(j => j.company).filter(Boolean))]
  const titles = jobs.map(j => j.title).filter(Boolean)
  const single = companies.length === 1 ? companies[0] : null
  let title = single ? `${single}: ${titles.join(' / ')}` : titles.join(' / ')
  if (title.length > 90) title = title.slice(0, 87).trimEnd() + '…'
  const description = `${jobs.length} open role${jobs.length > 1 ? 's' : ''} at ${companies.join(', ') || 'top companies'} — apply on FYI Salary.`
  const slug = `${slugify(single || 'jobs') || 'jobs'}-${rand4()}`.slice(0, 60)
  return { title, description, slug }
}

// 광고에 붙여 넣는 최종 URL — utm 은 방문 시 lib/utm.js 가 보관해 가입/지원에 귀속된다.
export function adLink(c) {
  const p = new URLSearchParams()
  if (c.utm_source) p.set('utm_source', c.utm_source)
  if (c.utm_medium) p.set('utm_medium', c.utm_medium)
  p.set('utm_campaign', c.utm_campaign || c.slug)
  return `${SITE}/l/${c.slug}?${p.toString()}`
}

// 공고 검색 → 클릭으로 추가. 빠른 생성 카드와 상세 폼이 같이 쓴다.
function JobPicker({ allJobs, jobById, value, onChange, L }) {
  const [q, setQ] = useState('')
  const query = q.trim().toLowerCase()
  const candidates = query
    ? allJobs.filter(j => !value.includes(j.id) && [j.title, j.company, j.source_id].some(v => (v || '').toLowerCase().includes(query))).slice(0, 15)
    : []
  const selected = value.map(id => jobById[id] || { id, title: id, company: '?', is_active: true })

  return (
    <div>
      <div style={{ position: 'relative' }}>
        <TextField type="input" size="small" width="100%" value={q} onChange={e => setQ(e.target.value)}
          prefixIcon={<RiSearchLine size={16} />}
          placeholder={L('공고 검색 — 제목, 회사, JD 코드', 'Search jobs — title, company, JD code', 'Tìm tin — tiêu đề, công ty, mã')} />
        {query && (
          <div style={{ position: 'absolute', left: 0, right: 0, top: '100%', zIndex: 20, marginTop: G.xs, background: '#fff', border: `1px solid ${C.border}`, borderRadius: 8, maxHeight: 296, overflowY: 'auto', boxShadow: '0 8px 24px rgba(0,0,0,0.08)' }}>
            {candidates.length === 0 && <div style={{ padding: `${G.md}px ${G.lg}px` }}><Text variant="body-p4" style={{ color: C.faint }}>{L('검색 결과가 없습니다', 'No matches', 'Không có kết quả')}</Text></div>}
            {candidates.map(j => (
              <button key={j.id} type="button" onClick={() => { onChange([...value, j.id]); setQ('') }}
                style={{ display: 'flex', width: '100%', alignItems: 'center', justifyContent: 'space-between', gap: G.md, padding: `10px ${G.lg}px`, background: 'none', border: 'none', borderBottom: `1px solid ${C.bg}`, cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit', fontSize: 13.5, color: C.text }}>
                <span style={ellipsis}>
                  <b>{j.company}</b><span style={{ color: C.faint }}> · </span>{j.title}
                  {j.source_id ? <span style={{ color: C.faint }}> · {j.source_id}</span> : null}
                </span>
                {!j.is_active && <Tag type="weak" state="warning" size="small" label={L('비활성', 'Inactive', 'Tắt')} />}
              </button>
            ))}
          </div>
        )}
      </div>

      {selected.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: G.sm, marginTop: G.md }}>
          {selected.map(j => (
            <div key={j.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: G.md, height: 44, padding: `0 ${G.sm}px 0 ${G.lg}px`, background: '#fff', border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 13.5, color: C.text }}>
              <span style={ellipsis}><b>{j.company}</b><span style={{ color: C.faint }}> · </span>{j.title}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: G.sm, flexShrink: 0 }}>
                {!j.is_active && <Tag type="weak" state="warning" size="small" label={L('비활성 — 표시 안 됨', 'Inactive — hidden', 'Tắt — ẩn')} />}
                <IconButton size="small" type="solid" color="secondary" icon={<RiCloseLine size={16} />} aria-label="remove"
                  onClick={() => onChange(value.filter(id => id !== j.id))} />
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function JobCollectionsView({ token, lang }) {
  const ko = lang === 'ko'
  const L = (k, e, v) => (lang === 'vi' ? (v ?? e) : ko ? k : e)
  const pl = (p) => (lang === 'vi' ? p.label[2] : ko ? p.label[0] : p.label[1])
  const { data, error, isLoading, mutate } = useAdmin('/api/admin/job-collections', token)
  // 공고 선택용 — 공고 목록 탭과 같은 키라 SWR 캐시를 공유한다
  const { data: allJobs = [] } = useAdmin('/api/admin/jobs', token)
  const [editing, setEditing] = useState(null) // null | 'new' | collection.id
  const [form, setForm] = useState(EMPTY)
  const [slugTouched, setSlugTouched] = useState(false)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState(null)
  const [copied, setCopied] = useState(null)
  const [picked, setPicked] = useState([])       // 빠른 생성용으로 고른 공고 id
  const [platform, setPlatform] = useState('meta')
  const [creating, setCreating] = useState(false)
  const [created, setCreated] = useState(null)   // 방금 만든 링크 — 복사 버튼과 함께 표시

  const collections = data?.collections || []
  const jobById = Object.fromEntries(allJobs.map(j => [j.id, j]))
  const platformItems = PLATFORMS.map(p => ({ value: p.key, label: pl(p) }))

  const openNew = () => { setForm(EMPTY); setSlugTouched(false); setEditing('new'); setMsg(null) }
  const openEdit = (c) => {
    const f = { ...EMPTY }
    for (const k of Object.keys(EMPTY)) f[k] = c[k] ?? EMPTY[k]
    setForm(f); setSlugTouched(true); setEditing(c.id); setMsg(null)
  }

  const call = async (method, body) => {
    const res = await fetch('/api/admin/job-collections', {
      method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(body),
    })
    const r = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(r.error || `HTTP ${res.status}`)
    return r
  }

  async function copy(c) {
    try { await navigator.clipboard.writeText(adLink(c)); setCopied(c.id); setTimeout(() => setCopied(null), 1500) }
    catch { prompt(L('아래 링크를 복사해 주세요', 'Copy this link', 'Sao chép liên kết'), adLink(c)) }
  }

  // 빠른 생성: 고른 공고로 제목·slug·설명·utm 을 자동 채워 바로 저장. slug 충돌(409)이면 난수만 바꿔 1회 재시도.
  async function quickCreate() {
    const jobs = picked.map(id => jobById[id]).filter(Boolean)
    if (jobs.length === 0) return
    const pf = PLATFORMS.find(p => p.key === platform) || PLATFORMS[0]
    setCreating(true); setMsg(null)
    try {
      let r
      for (let attempt = 0; attempt < 2; attempt++) {
        const auto = autoFields(jobs)
        try {
          r = await call('POST', { ...auto, job_ids: picked, utm_source: pf.utm_source, utm_medium: pf.utm_medium, utm_campaign: auto.slug, is_active: true })
          break
        } catch (e) {
          if (attempt === 1 || !/exists/.test(e.message)) throw e
        }
      }
      setCreated(r.collection); setPicked([])
      mutate()
      copy(r.collection)
    } catch (e) {
      setMsg(L('링크 생성 실패: ', 'Failed to create link: ', 'Tạo link thất bại: ') + e.message)
    } finally {
      setCreating(false)
    }
  }

  async function save() {
    if (!form.title.trim() || !form.slug.trim()) { setMsg(L('제목과 링크 주소는 필수입니다', 'Title and link address are required', 'Bắt buộc nhập tiêu đề và địa chỉ')); return }
    if (form.job_ids.length === 0) { setMsg(L('공고를 1건 이상 선택해 주세요', 'Pick at least one job', 'Chọn ít nhất một tin')); return }
    setSaving(true); setMsg(null)
    try {
      const body = { ...form }
      if (editing !== 'new') body.id = editing
      await call(editing === 'new' ? 'POST' : 'PUT', body)
      setEditing(null)
      mutate()
    } catch (e) {
      setMsg(L('저장 실패: ', 'Save failed: ', 'Lưu thất bại: ') + e.message)
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(c) {
    try { await call('PUT', { id: c.id, is_active: !c.is_active }); mutate() }
    catch (e) { alert(L('변경 실패: ', 'Failed: ', 'Thất bại: ') + e.message) }
  }

  async function remove(c) {
    if (!confirm(L(`"${c.title}" 링크를 삭제하시겠습니까? 광고에 사용 중인 링크라면 404가 됩니다.`, `Delete "${c.title}"? Any ad using this link will 404.`))) return
    try { await call('DELETE', { id: c.id }); mutate() }
    catch (e) { alert(L('삭제 실패: ', 'Delete failed: ', 'Xoá thất bại: ') + e.message) }
  }

  const centered = (children, color = C.sub) => <div style={{ textAlign: 'center', padding: 40 }}><Text variant="body-p4" style={{ color }}>{children}</Text></div>
  if (error) return centered(`${L('불러오기 실패', 'Failed to load', 'Tải thất bại')} — ${error.message}`, '#c00')
  if (isLoading || !data) return centered(L('불러오는 중…', 'Loading…', 'Đang tải…'))
  if (data.error) return centered(data.error, '#c00')

  const SectionTitle = ({ children, right }) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: G.md, marginBottom: G.lg }}>
      <Text variant="subtitle-p2" style={{ color: C.text }}>{children}</Text>
      {right}
    </div>
  )
  const FieldLabel = ({ children }) => <Text variant="subtitle-p3" as="div" style={{ color: C.text, marginBottom: G.sm, fontSize: 13 }}>{children}</Text>
  const ErrorMsg = () => (msg ? <Text variant="body-p4" as="div" style={{ color: '#D92D20', fontWeight: 600 }}>{msg}</Text> : null)
  const LinkBox = ({ c }) => (
    <div title={adLink(c)} style={{ ...mono, flex: 1, minWidth: 200, height: 36, lineHeight: '34px', padding: `0 ${G.md}px`, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 4, color: C.sub, ...ellipsis }}>{adLink(c)}</div>
  )
  const CopyButton = ({ c, size = 'medium' }) => (
    <ActionButton size={size} color="primary" type={copied === c.id ? 'outline' : 'solid'}
      prefixIcon={copied === c.id ? <RiCheckLine size={16} /> : <RiFileCopyLine size={16} />}
      label={copied === c.id ? L('복사됨', 'Copied', 'Đã sao chép') : L('링크 복사', 'Copy link', 'Sao chép link')}
      onClick={() => copy(c)} />
  )
  const PreviewButton = ({ slug, size = 'medium' }) => (
    <ActionButton size={size} color="neutral" type="outline" prefixIcon={<RiExternalLinkLine size={16} />}
      label={L('미리보기', 'Preview', 'Xem trước')} onClick={() => window.open(`/l/${slug}`, '_blank', 'noopener')} />
  )

  // ── 상세 폼 (직접 설정 / 수정) ──
  if (editing !== null) {
    const preview = { ...form, slug: form.slug || 'slug' }
    const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))
    return (
      <div style={{ paddingBottom: 80 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: G.sm, marginBottom: G.xl }}>
          <IconButton size="medium" type="outline" color="neutral" icon={<RiArrowLeftLine size={18} />} aria-label="back" onClick={() => setEditing(null)} />
          <Text variant="heading-h6" style={{ color: C.text }}>
            {editing === 'new' ? L('새 캠페인 링크', 'New campaign link', 'Tạo link chiến dịch') : L('캠페인 링크 수정', 'Edit campaign link', 'Sửa link chiến dịch')}
          </Text>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: G.md }}>
          <div style={card}>
            <SectionTitle>{L('포함할 공고', 'Jobs', 'Tin tuyển dụng')}</SectionTitle>
            <JobPicker allJobs={allJobs} jobById={jobById} value={form.job_ids} onChange={ids => setForm(f => ({ ...f, job_ids: ids }))} L={L} />
          </div>

          <div style={card}>
            <SectionTitle>{L('광고 미리보기에 표시되는 내용', 'Shown in the ad preview', 'Hiển thị trong quảng cáo')}</SectionTitle>
            <div style={{ display: 'flex', flexDirection: 'column', gap: G.lg }}>
              <TextField type="input" size="small" width="100%" required title={L('제목', 'Title', 'Tiêu đề')}
                value={form.title} placeholder={L('예: ABC 백엔드·프론트엔드 엔지니어 채용', 'e.g. Backend & Frontend Engineers at ABC')}
                onChange={e => setForm(f => ({ ...f, title: e.target.value, slug: slugTouched ? f.slug : slugify(e.target.value) }))} />
              <TextField type="area" size="small" width="100%" height={88} title={L('설명', 'Description', 'Mô tả')}
                value={form.description ?? ''} onChange={set('description')}
                placeholder={L('예: 호치민 근무, 월 25M~40M VND, 한국어 가능자 우대', 'e.g. Ho Chi Minh City, 25–40M VND/month, Korean a plus')} />
              <TextField type="input" size="small" width="100%" title={L('미리보기 이미지 URL', 'Preview image URL', 'URL ảnh preview')}
                value={form.og_image_url ?? ''} onChange={set('og_image_url')} placeholder="https://…/1200x630.png"
                description={L('비워두면 기본 이미지를 사용합니다. 1200×630 권장.', 'Uses the default image if empty. 1200×630 recommended.')} />
            </div>
          </div>

          <div style={card}>
            <SectionTitle>{L('링크 주소와 플랫폼', 'Link address and platform', 'Địa chỉ link và nền tảng')}</SectionTitle>
            <div style={{ display: 'flex', flexDirection: 'column', gap: G.lg }}>
              <TextField type="input" size="small" width="100%" required title={L('링크 주소', 'Link address', 'Địa chỉ link')}
                value={form.slug} placeholder="abc-engineers-oct"
                onChange={e => { setSlugTouched(true); setForm(f => ({ ...f, slug: slugify(e.target.value) || e.target.value.toLowerCase() })) }}
                description={`${SITE_SHORT}/l/${form.slug || '…'}  ·  ${L('소문자, 숫자, 하이픈만 사용할 수 있습니다.', 'Lowercase letters, numbers and hyphens only.')}`} />
              <div>
                <FieldLabel>{L('어디에 쓰는 링크인가요?', 'Where will this link be used?', 'Link dùng ở đâu?')}</FieldLabel>
                <ChipGroup type="outline" variant="primary" size="medium" items={platformItems} value={platformOf(form)?.key || ''}
                  onChange={v => { const p = PLATFORMS.find(x => x.key === v); if (p) setForm(f => ({ ...f, utm_source: p.utm_source, utm_medium: p.utm_medium })) }}
                  style={{ display: 'flex', flexWrap: 'wrap', gap: G.sm }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: G.md }} className="adm-m-1col">
                <TextField type="input" size="small" width="100%" title="utm_source" value={form.utm_source ?? ''} onChange={set('utm_source')} />
                <TextField type="input" size="small" width="100%" title="utm_medium" value={form.utm_medium ?? ''} onChange={set('utm_medium')} />
                <TextField type="input" size="small" width="100%" title="utm_campaign" value={form.utm_campaign ?? ''} onChange={set('utm_campaign')} placeholder={form.slug || 'slug'} />
              </div>
              <div>
                <FieldLabel>{L('광고에 붙여 넣을 최종 링크', 'Final link to paste into the ad', 'Link cuối cùng')}</FieldLabel>
                <div style={{ display: 'flex' }}><LinkBox c={preview} /></div>
              </div>
              <Toggle size="small" labelPosition="end" checked={!!form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))}
                label={L('링크 활성화', 'Link active', 'Kích hoạt link')}
                description={L('비활성화하면 접속 시 404가 표시됩니다.', 'When off, the link returns 404.')} />
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: G.sm, marginTop: G.xl }}>
          <div style={{ marginRight: 'auto' }}><ErrorMsg /></div>
          <ActionButton size="large" color="neutral" type="outline" label={L('취소', 'Cancel', 'Huỷ')} onClick={() => setEditing(null)} />
          <ActionButton size="large" color="primary" type="solid" loading={saving} disabled={saving}
            label={editing === 'new' ? L('링크 만들기', 'Create link', 'Tạo link') : L('저장', 'Save', 'Lưu')} onClick={save} />
        </div>
      </div>
    )
  }

  // ── 목록 ──
  const q = search.trim().toLowerCase()
  const searched = q ? collections.filter(c => [c.title, c.slug, c.utm_campaign, c.description].some(v => (v || '').toLowerCase().includes(q))) : collections
  const filtered = searched.filter(c => (filter === 'active' ? c.is_active : filter === 'off' ? !c.is_active : true))
  const activeCount = searched.filter(c => c.is_active).length
  const pickedJobs = picked.map(id => jobById[id]).filter(Boolean)

  return (
    <div style={{ paddingBottom: 60 }}>
      {/* 1. 빠른 생성 — 공고 선택 → 플랫폼 → 만들기 */}
      <div style={{ ...card, padding: 24 }}>
        <Text variant="subtitle-p1" as="div" style={{ color: C.text }}>{L('새 캠페인 링크 만들기', 'Create a campaign link', 'Tạo link chiến dịch')}</Text>
        <Text variant="body-p4" as="div" style={{ color: C.sub, marginTop: G.xs, marginBottom: G.xl }}>
          {L('공고를 고르면 제목, 주소, UTM이 자동으로 채워지고 링크가 바로 복사됩니다.', 'Pick jobs — the title, address and UTM are filled in automatically and the link is copied right away.')}
        </Text>

        <div style={{ display: 'flex', flexDirection: 'column', gap: G.xl }}>
          <div>
            <FieldLabel>1. {L('공고 선택', 'Pick jobs', 'Chọn tin')}{pickedJobs.length > 0 ? `  ·  ${L(`${pickedJobs.length}건`, `${pickedJobs.length} selected`, `${pickedJobs.length} tin`)}` : ''}</FieldLabel>
            <JobPicker allJobs={allJobs} jobById={jobById} value={picked} onChange={setPicked} L={L} />
          </div>
          <div>
            <FieldLabel>2. {L('어디에 쓰는 링크인가요?', 'Where will this link be used?', 'Link dùng ở đâu?')}</FieldLabel>
            <ChipGroup type="outline" variant="primary" size="medium" items={platformItems} value={platform} onChange={setPlatform}
              style={{ display: 'flex', flexWrap: 'wrap', gap: G.sm }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: G.sm, flexWrap: 'wrap' }}>
            <ActionButton size="large" color="primary" type="solid" prefixIcon={<RiAddLine size={18} />}
              loading={creating} disabled={creating || pickedJobs.length === 0}
              label={pickedJobs.length > 0 ? L(`${pickedJobs.length}건으로 링크 만들기`, `Create link with ${pickedJobs.length} job${pickedJobs.length === 1 ? '' : 's'}`, `Tạo link với ${pickedJobs.length} tin`) : L('링크 만들기', 'Create link', 'Tạo link')}
              onClick={quickCreate} />
            <ActionButton size="large" color="neutral" type="ghost" label={L('직접 설정해서 만들기', 'Custom settings', 'Tuỳ chỉnh')} onClick={openNew} />
            <ErrorMsg />
          </div>
        </div>

        {created && (
          <div style={{ marginTop: G.xl, paddingTop: G.xl, borderTop: `1px solid ${C.border}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: G.sm, marginBottom: G.md }}>
              <Tag type="weak" state="success" size="small" label={L('생성 완료', 'Created', 'Đã tạo')} />
              <Text variant="body-p4" style={{ color: C.sub }}>{L('광고에 이 주소를 붙여 넣으세요.', 'Paste this address into the ad.', 'Dán địa chỉ này vào quảng cáo.')}</Text>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: G.sm, flexWrap: 'wrap' }}>
              <LinkBox c={created} />
              <CopyButton c={created} />
              <PreviewButton slug={created.slug} />
            </div>
          </div>
        )}
      </div>

      {/* 2. 만든 링크 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: G.md, flexWrap: 'wrap', margin: `${G.xl + G.sm}px 0 ${G.lg}px` }}>
        <TabGroup type="round" size="medium" value={filter} onChange={setFilter} gap={G.sm} items={[
          { value: 'all', label: `${L('전체', 'All', 'Tất cả')} ${searched.length}` },
          { value: 'active', label: `${L('활성', 'Live', 'Hoạt động')} ${activeCount}` },
          { value: 'off', label: `${L('비활성', 'Off', 'Tắt')} ${searched.length - activeCount}` },
        ]} />
        <TextField type="input" size="small" width={280} value={search} onChange={e => setSearch(e.target.value)}
          prefixIcon={<RiSearchLine size={16} />} placeholder={L('만든 링크 검색', 'Search links', 'Tìm link')} />
      </div>

      {collections.length === 0 && (
        <div style={{ border: `1px dashed ${C.border}`, borderRadius: 12, padding: '40px 20px', textAlign: 'center' }}>
          <Text variant="subtitle-p2" as="div" style={{ color: C.text }}>{L('아직 생성된 캠페인 링크가 없습니다', 'No campaign links yet', 'Chưa có link chiến dịch')}</Text>
          <Text variant="body-p4" as="div" style={{ color: C.faint, marginTop: G.xs }}>{L('위에서 공고를 선택해 첫 링크를 만들어 보세요.', 'Pick jobs above to create the first one.', 'Chọn tin ở trên để tạo link đầu tiên.')}</Text>
        </div>
      )}
      {collections.length > 0 && filtered.length === 0 && <Text variant="body-p4" as="div" style={{ color: C.faint }}>{L('해당 링크가 없습니다', 'No matching links', 'Không có link phù hợp')}</Text>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: G.md }}>
        {filtered.map(c => {
          const jobs = (c.job_ids || []).map(id => jobById[id]).filter(Boolean)
          const missing = (c.job_ids || []).length - jobs.length
          const p = platformOf(c)
          return (
            <div key={c.id} style={card}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: G.md }}>
                <div style={{ minWidth: 0 }}>
                  <Text variant="subtitle-p2" as="div" style={{ color: C.text, ...ellipsis }}>{c.title}</Text>
                  <Text variant="body-p4" as="div" style={{ color: C.faint, marginTop: 2, ...ellipsis }}>
                    {[p ? pl(p) : `${c.utm_source || '?'} / ${c.utm_medium || '?'}`, c.created_at ? new Date(c.created_at).toLocaleDateString() : null, c.created_by].filter(Boolean).join('  ·  ')}
                  </Text>
                </div>
                <Tag type="weak" size="small" state={c.is_active ? 'success' : 'enabled'} className={c.is_active ? '' : 'tag--color-neutral'} style={{ flexShrink: 0 }} label={c.is_active ? L('활성', 'Live', 'Hoạt động') : L('비활성', 'Off', 'Tắt')} />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: G.xs, marginTop: G.md }}>
                {jobs.map(j => (
                  <div key={j.id} style={{ display: 'flex', alignItems: 'center', gap: G.sm, fontSize: 13.5, color: C.text }}>
                    <span style={{ width: 4, height: 4, borderRadius: 2, background: C.faint, flexShrink: 0 }} />
                    <span style={ellipsis}>{j.company}<span style={{ color: C.faint }}> · </span>{j.title}</span>
                    {!j.is_active && <Tag type="weak" state="warning" size="small" style={{ flexShrink: 0 }} label={L('비활성 — 표시 안 됨', 'Inactive — hidden', 'Tắt — ẩn')} />}
                  </div>
                ))}
                {missing > 0 && <div><Tag type="weak" state="error" size="small" label={L(`삭제된 공고 ${missing}건`, `${missing} deleted`, `${missing} đã xoá`)} /></div>}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: G.sm, flexWrap: 'wrap', marginTop: G.lg }}>
                <LinkBox c={c} />
                <CopyButton c={c} />
                <PreviewButton slug={c.slug} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: G.sm, marginTop: G.lg, paddingTop: G.lg, borderTop: `1px solid ${C.bg}` }}>
                <ActionButton size="small" color="neutral" type="ghost" label={L('삭제', 'Delete', 'Xoá')} onClick={() => remove(c)} />
                <ActionButton size="small" color="neutral" type="outline" label={c.is_active ? L('비활성화', 'Turn off', 'Tắt') : L('활성화', 'Turn on', 'Bật')} onClick={() => toggleActive(c)} />
                <ActionButton size="small" color="neutral" type="outline" label={L('수정', 'Edit', 'Sửa')} onClick={() => openEdit(c)} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
