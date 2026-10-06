import { useState } from 'react'
import { useAdmin } from '../../lib/adminSwr'

// 캠페인 링크(공고 묶음) 관리 — 광고(Meta 등)에 쓸 짧은 공개 링크 /l/<slug> 를 만들고,
// 포함할 공고를 고르고, utm 이 붙은 광고 링크를 복사한다. 데이터: /api/admin/job-collections
// 공개 페이지는 /jobs 와 같은 화면에 선택한 공고만 보여주고 OG 제목/설명/이미지만 캠페인 값으로 바꾼다.

const SITE = 'https://salary-fyi.com'
const SITE_SHORT = 'salary-fyi.com'

// 광고/게시 플랫폼 → utm. 값은 분석 대시보드의 분류 규칙에 맞춘다:
//   revenue-metrics / admin-metrics 는 utm_source=meta 또는 medium=paid 를 유료 메타로,
//   signup-paths 는 meta·facebook·instagram 을 meta_ad, google·tiktok 을 other_ad, threads 를 threads 로 본다.
//   facebook/instagram 은 '오가닉 게시물' 전용 — 유료 메타 광고에 쓰면 오가닉으로 잡힌다.
const PLATFORMS = [
  { key: 'meta', label: ['Meta 광고 (Facebook·Instagram)', 'Meta Ads (Facebook·Instagram)', 'Meta Ads'], utm_source: 'meta', utm_medium: 'paid' },
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

// 공고 목록 탭과 같은 톤 — 흰 카드, #E5E8EB 테두리, 주황 포인트
const S = {
  input: { width: '100%', fontSize: 13.5, padding: '10px 13px', border: '1px solid #E5E8EB', borderRadius: 10, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', background: '#fff' },
  label: { fontSize: 12, fontWeight: 600, color: '#6B7280', marginBottom: 6, display: 'block' },
  hint: { fontSize: 11.5, color: '#9CA3AF', marginTop: 5, lineHeight: 1.45 },
  card: { background: '#fff', border: '1px solid #EEF0F2', borderRadius: 14, padding: '18px 20px', marginBottom: 12 },
  section: { fontSize: 13, fontWeight: 700, color: '#191F28', marginBottom: 14 },
  btn: { fontSize: 12.5, fontWeight: 600, color: '#4E5968', background: '#fff', border: '1px solid #E5E8EB', padding: '7px 13px', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit' },
  btnP: { fontSize: 13, fontWeight: 700, color: '#fff', background: '#ff4400', border: 'none', padding: '10px 20px', borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit' },
  mono: { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 12.5 },
}

// 공고만 고르면 나머지는 자동 — 제목/설명은 OG 미리보기용, slug 는 회사명 + 짧은 난수.
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

const slugify = (s) => String(s).toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60)

// 광고에 붙여 넣는 최종 URL — utm 은 방문 시 lib/utm.js 가 보관해 가입/지원에 귀속된다.
export function adLink(c) {
  const p = new URLSearchParams()
  if (c.utm_source) p.set('utm_source', c.utm_source)
  if (c.utm_medium) p.set('utm_medium', c.utm_medium)
  p.set('utm_campaign', c.utm_campaign || c.slug)
  return `${SITE}/l/${c.slug}?${p.toString()}`
}

export default function JobCollectionsView({ token, lang }) {
  const ko = lang === 'ko'
  const L = (k, e, v) => (lang === 'vi' ? (v ?? e) : ko ? k : e)
  const { data, error, isLoading, mutate } = useAdmin('/api/admin/job-collections', token)
  // 공고 선택용 — 공고 목록 탭과 같은 키라 SWR 캐시를 공유한다
  const { data: allJobs = [] } = useAdmin('/api/admin/jobs', token)
  const [editing, setEditing] = useState(null) // null | 'new' | collection.id
  const [form, setForm] = useState(EMPTY)
  const [slugTouched, setSlugTouched] = useState(false)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [jobSearch, setJobSearch] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState(null)
  const [copied, setCopied] = useState(null)
  const [picked, setPicked] = useState([])      // 빠른 생성용으로 고른 공고 id
  const [pickSearch, setPickSearch] = useState('')
  const [creating, setCreating] = useState(false)
  const [created, setCreated] = useState(null)  // 방금 만든 링크 — 상단에 복사 버튼과 함께 표시
  const [platform, setPlatform] = useState('meta') // 빠른 생성용 플랫폼

  const collections = data?.collections || []
  const jobById = Object.fromEntries(allJobs.map(j => [j.id, j]))

  const openNew = () => { setForm(EMPTY); setSlugTouched(false); setJobSearch(''); setEditing('new'); setMsg(null) }
  const openEdit = (c) => {
    const f = { ...EMPTY }
    for (const k of Object.keys(EMPTY)) f[k] = c[k] ?? EMPTY[k]
    setForm(f); setSlugTouched(true); setJobSearch(''); setEditing(c.id); setMsg(null)
  }

  const call = async (method, body) => {
    const res = await fetch('/api/admin/job-collections', {
      method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(body),
    })
    const r = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(r.error || `HTTP ${res.status}`)
    return r
  }

  async function save() {
    if (!form.title.trim() || !form.slug.trim()) { setMsg(L('제목과 slug는 필수입니다', 'Title and slug are required', 'Bắt buộc nhập tiêu đề và slug')); return }
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

  // 빠른 생성: 고른 공고로 제목·slug·설명·utm 을 자동 채워 바로 저장. slug 충돌(409)이면 난수만 바꿔 1회 재시도.
  async function quickCreate() {
    const jobs = picked.map(id => jobById[id]).filter(Boolean)
    if (jobs.length === 0) return
    setCreating(true); setMsg(null)
    try {
      let r
      for (let attempt = 0; attempt < 2; attempt++) {
        const auto = autoFields(jobs)
        try {
          const pf = PLATFORMS.find(p => p.key === platform) || PLATFORMS[0]
          r = await call('POST', { ...auto, job_ids: picked, utm_source: pf.utm_source, utm_medium: pf.utm_medium, utm_campaign: auto.slug, is_active: true })
          break
        } catch (e) {
          if (attempt === 1 || !/exists/.test(e.message)) throw e
        }
      }
      setCreated(r.collection); setPicked([]); setPickSearch('')
      mutate()
      copy(r.collection)
    } catch (e) {
      setMsg(L('링크 생성 실패: ', 'Failed to create link: ', 'Tạo link thất bại: ') + e.message)
    } finally {
      setCreating(false)
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

  async function copy(c) {
    try { await navigator.clipboard.writeText(adLink(c)); setCopied(c.id); setTimeout(() => setCopied(null), 1500) }
    catch { prompt(L('아래 링크를 복사해 주세요', 'Copy this link', 'Sao chép liên kết'), adLink(c)) }
  }

  if (error) return <div style={{ textAlign: 'center', padding: 40, color: '#c00' }}>{L('불러오기 실패', 'Failed to load', 'Tải thất bại')} — {error.message}</div>
  if (isLoading || !data) return <div style={{ textAlign: 'center', padding: 40, color: '#666' }}>{L('불러오는 중…', 'Loading…', 'Đang tải…')}</div>
  if (data.error) return <div style={{ textAlign: 'center', padding: 40, color: '#c00' }}>{data.error}</div>

  const field = (key, labelTxt, { hint, placeholder, flex = 1, minWidth = 160 } = {}) => (
    <div style={{ flex, minWidth }}>
      <label style={S.label}>{labelTxt}</label>
      <input style={S.input} value={form[key] ?? ''} placeholder={placeholder || ''}
        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} />
      {hint && <div style={S.hint}>{hint}</div>}
    </div>
  )

  const StatusBadge = ({ on }) => (
    <span style={{ flexShrink: 0, fontSize: 11.5, fontWeight: 700, padding: '4px 10px', borderRadius: 999, background: on ? '#E7F6EC' : '#F1F3F5', color: on ? '#1B7A43' : '#868E96' }}>
      {on ? L('활성', 'Live', 'Hoạt động') : L('비활성', 'Off', 'Tắt')}
    </span>
  )

  // 플랫폼 선택 칩 — 빠른 생성과 상세 폼이 같이 쓴다
  const PlatformChips = ({ value, onChange }) => (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      {PLATFORMS.map(p => {
        const on = value === p.key
        return (
          <button key={p.key} type="button" onClick={() => onChange(p)} style={{
            fontSize: 12.5, fontWeight: 600, cursor: 'pointer', borderRadius: 999, padding: '6px 12px', fontFamily: 'inherit',
            border: '1px solid', borderColor: on ? '#ff4400' : '#E5E8EB',
            background: on ? '#FFF1EC' : '#fff', color: on ? '#ff4400' : '#4E5968',
          }}>{lang === 'vi' ? p.label[2] : ko ? p.label[0] : p.label[1]}</button>
        )
      })}
    </div>
  )

  // ── 등록/수정 폼 ──
  if (editing !== null) {
    const q = jobSearch.trim().toLowerCase()
    const candidates = q
      ? allJobs.filter(j => !form.job_ids.includes(j.id) && [j.title, j.company, j.source_id].some(v => (v || '').toLowerCase().includes(q))).slice(0, 12)
      : []
    const selected = form.job_ids.map(id => jobById[id] || { id, title: id, company: '?', is_active: true })
    const preview = { ...form, slug: form.slug || 'slug' }

    return (
      <div style={{ minHeight: '70vh', paddingBottom: 80 }}>
        <button onClick={() => setEditing(null)} style={{ background: 'none', border: 'none', color: '#6B7280', fontSize: 13, fontWeight: 600, cursor: 'pointer', padding: 0, marginBottom: 14, fontFamily: 'inherit' }}>
          ← {L('목록으로', 'Back to list', 'Về danh sách')}
        </button>
        <h3 style={{ fontSize: 17, fontWeight: 700, margin: '0 0 16px' }}>
          {editing === 'new' ? L('새 캠페인 링크', 'New campaign link', 'Tạo link chiến dịch') : L('캠페인 링크 수정', 'Edit campaign link', 'Sửa link chiến dịch')}
        </h3>

        {/* 1. 기본 정보 */}
        <div style={S.card}>
          <div style={S.section}>{L('기본 정보', 'Basics', 'Thông tin cơ bản')}</div>
          <div style={{ marginBottom: 14 }}>
            <label style={S.label}>{L('제목 *', 'Title *', 'Tiêu đề *')}</label>
            <input style={S.input} value={form.title} placeholder={L('예: ABC 백엔드·프론트엔드 엔지니어 채용', 'e.g. Backend & Frontend Engineers at ABC')}
              onChange={e => setForm(f => ({ ...f, title: e.target.value, slug: slugTouched ? f.slug : slugify(e.target.value) }))} />
            <div style={S.hint}>{L('광고 미리보기 제목과 페이지 상단 제목으로 표시됩니다.', 'Shown as the ad preview title and the page heading.')}</div>
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={S.label}>{L('링크 주소 (slug) *', 'Link address (slug) *', 'Địa chỉ link (slug) *')}</label>
            <div style={{ display: 'flex', alignItems: 'stretch' }}>
              <span style={{ ...S.mono, display: 'flex', alignItems: 'center', padding: '0 12px', border: '1px solid #E5E8EB', borderRight: 'none', borderRadius: '10px 0 0 10px', background: '#F9FAFB', color: '#6B7280', whiteSpace: 'nowrap' }}>{SITE_SHORT}/l/</span>
              <input style={{ ...S.input, ...S.mono, borderRadius: '0 10px 10px 0' }} value={form.slug} placeholder="abc-engineers-oct"
                onChange={e => { setSlugTouched(true); setForm(f => ({ ...f, slug: slugify(e.target.value) || e.target.value.toLowerCase() })) }} />
            </div>
            <div style={S.hint}>{L('소문자, 숫자, 하이픈만 사용할 수 있습니다. 제목을 입력하면 자동으로 채워집니다.', 'Lowercase letters, numbers and hyphens only. Filled in from the title automatically.')}</div>
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={S.label}>{L('설명', 'Description', 'Mô tả')}</label>
            <textarea style={{ ...S.input, minHeight: 72, resize: 'vertical', lineHeight: 1.5 }} value={form.description ?? ''}
              placeholder={L('예: 호치민 근무, 월 25M~40M VND, 한국어 가능자 우대', 'e.g. Ho Chi Minh City, 25–40M VND/month, Korean a plus')}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            <div style={S.hint}>{L('광고 미리보기 문구와 페이지 부제로 표시됩니다.', 'Shown as the ad preview text and the page subtitle.')}</div>
          </div>
          {field('og_image_url', L('미리보기 이미지 URL', 'Preview image URL', 'URL ảnh preview'), {
            placeholder: 'https://…/1200x630.png',
            hint: L('비워두면 기본 OG 이미지를 사용합니다. 1200×630 권장.', 'Default OG image if empty. 1200×630 recommended.'),
          })}
        </div>

        {/* 2. 포함할 공고 */}
        <div style={S.card}>
          <div style={{ ...S.section, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span>{L('포함할 공고 *', 'Jobs *', 'Tin tuyển dụng *')}</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#8B95A1' }}>{L(`${selected.length}건 선택`, `${selected.length} selected`, `Đã chọn ${selected.length}`)}</span>
          </div>
          <div style={{ position: 'relative' }}>
            <input style={S.input} value={jobSearch} onChange={e => setJobSearch(e.target.value)}
              placeholder={L('제목, 회사, JD 코드로 검색  ·  예: ABC, Backend, YD1904', 'Search by title, company or JD code  ·  e.g. ABC, Backend, YD1904')} />
            {q && (
              <div style={{ position: 'absolute', left: 0, right: 0, top: '100%', zIndex: 5, background: '#fff', border: '1px solid #E5E8EB', borderRadius: 10, marginTop: 6, maxHeight: 280, overflowY: 'auto', boxShadow: '0 8px 24px rgba(0,0,0,0.08)' }}>
                {candidates.length === 0 && <div style={{ padding: '12px 14px', fontSize: 12.5, color: '#9CA3AF' }}>{L('검색 결과가 없습니다', 'No matches', 'Không có kết quả')}</div>}
                {candidates.map(j => (
                  <div key={j.id} onClick={() => { setForm(f => ({ ...f, job_ids: [...f.job_ids, j.id] })); setJobSearch('') }}
                    style={{ padding: '9px 14px', cursor: 'pointer', borderBottom: '1px solid #F1F3F5', fontSize: 13, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                    <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      <b style={{ color: '#191F28' }}>{j.company}</b><span style={{ color: '#8B95A1' }}> · </span>{j.title}
                      {j.source_id ? <span style={{ color: '#9CA3AF' }}> · {j.source_id}</span> : null}
                    </span>
                    {!j.is_active && <span style={{ flexShrink: 0, fontSize: 11, color: '#C2410C', fontWeight: 700 }}>{L('비활성', 'inactive')}</span>}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ marginTop: 12 }}>
            {selected.length === 0 && (
              <div style={{ border: '1px dashed #E5E8EB', borderRadius: 10, padding: '18px 14px', textAlign: 'center', fontSize: 12.5, color: '#9CA3AF' }}>
                {L('위 검색창에서 공고를 찾아 클릭하면 여기에 추가됩니다.', 'Search above and click a job to add it here.')}
              </div>
            )}
            {selected.map(j => (
              <div key={j.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, border: '1px solid #E5E8EB', borderRadius: 10, padding: '9px 12px', marginBottom: 6, fontSize: 13 }}>
                <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  <b style={{ color: '#191F28' }}>{j.company}</b><span style={{ color: '#8B95A1' }}> · </span>{j.title}
                  {!j.is_active && <span style={{ color: '#C2410C', fontWeight: 700 }}> · {L('비활성 — 페이지에 표시되지 않습니다', 'inactive — hidden on page')}</span>}
                </span>
                <button onClick={() => setForm(f => ({ ...f, job_ids: f.job_ids.filter(id => id !== j.id) }))} aria-label="remove"
                  style={{ ...S.btn, padding: '3px 9px', flexShrink: 0, color: '#9CA3AF' }}>×</button>
              </div>
            ))}
          </div>
        </div>

        {/* 3. 광고 링크 */}
        <div style={S.card}>
          <div style={S.section}>{L('플랫폼 · 광고 링크 (UTM)', 'Platform · Ad link (UTM)', 'Nền tảng · Link quảng cáo (UTM)')}</div>
          <div style={{ marginBottom: 14 }}>
            <label style={S.label}>{L('어디에 쓰는 링크인가요?', 'Where will this link be used?', 'Link dùng ở đâu?')}</label>
            <PlatformChips value={platformOf(form)?.key || null} onChange={p => setForm(f => ({ ...f, utm_source: p.utm_source, utm_medium: p.utm_medium }))} />
            <div style={S.hint}>{L('선택하면 아래 utm_source / utm_medium이 채워집니다. 목록에 없는 채널은 직접 입력하세요.', 'Fills utm_source / utm_medium below. For other channels, type them in directly.')}</div>
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
            {field('utm_source', 'utm_source', { placeholder: 'facebook' })}
            {field('utm_medium', 'utm_medium', { placeholder: 'paid' })}
            {field('utm_campaign', 'utm_campaign', { placeholder: form.slug || 'slug', hint: L('비워두면 slug를 사용합니다.', 'Defaults to the slug.') })}
          </div>
          <label style={S.label}>{L('광고에 붙여 넣을 최종 링크', 'Final link to paste into the ad', 'Link cuối cùng')}</label>
          <div style={{ ...S.mono, background: '#F9FAFB', border: '1px solid #EEF0F2', borderRadius: 10, padding: '10px 12px', color: '#4E5968', wordBreak: 'break-all' }}>{adLink(preview)}</div>
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5, fontWeight: 600, color: '#191F28', cursor: 'pointer', margin: '4px 0 20px' }}>
          <input type="checkbox" checked={!!form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} />
          {L('링크 활성화', 'Link active', 'Kích hoạt link')}
          <span style={{ fontSize: 12, fontWeight: 500, color: '#9CA3AF' }}>{L('비활성화하면 접속 시 404가 표시됩니다', 'When off, the link returns 404')}</span>
        </label>

        {msg && <div style={{ fontSize: 13, color: '#c00', fontWeight: 600, marginBottom: 12 }}>{msg}</div>}
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={save} disabled={saving} style={{ ...S.btnP, background: saving ? '#E5E8EB' : '#ff4400', color: saving ? '#9CA3AF' : '#fff', cursor: saving ? 'default' : 'pointer' }}>
            {saving ? L('저장 중…', 'Saving…', 'Đang lưu…') : editing === 'new' ? L('링크 만들기', 'Create link', 'Tạo link') : L('저장', 'Save', 'Lưu')}
          </button>
          <button onClick={() => setEditing(null)} style={{ ...S.btn, padding: '10px 18px', fontSize: 13 }}>{L('취소', 'Cancel', 'Huỷ')}</button>
        </div>
      </div>
    )
  }

  // ── 목록 ──
  const q = search.trim().toLowerCase()
  const pickQ = pickSearch.trim().toLowerCase()
  const pickCandidates = pickQ
    ? allJobs.filter(j => !picked.includes(j.id) && [j.title, j.company, j.source_id].some(v => (v || '').toLowerCase().includes(pickQ))).slice(0, 15)
    : []
  const pickedJobs = picked.map(id => jobById[id]).filter(Boolean)
  const searched = q ? collections.filter(c => [c.title, c.slug, c.utm_campaign, c.description].some(v => (v || '').toLowerCase().includes(q))) : collections
  const filtered = searched.filter(c => (filter === 'active' ? c.is_active : filter === 'off' ? !c.is_active : true))
  const activeCount = searched.filter(c => c.is_active).length
  const FILTERS = [
    ['all', L('전체', 'All', 'Tất cả'), searched.length],
    ['active', L('활성', 'Live', 'Hoạt động'), activeCount],
    ['off', L('비활성', 'Off', 'Tắt'), searched.length - activeCount],
  ]

  return (
    <div style={{ minHeight: '70vh' }}>
      {/* 빠른 생성 — 공고만 고르면 링크가 바로 만들어진다. 제목/이미지/UTM 은 아래 목록의 '수정'에서. */}
      <div style={{ ...S.card, borderColor: '#FFD9CC', background: '#FFFBF9', marginBottom: 20 }}>
        <div style={{ ...S.section, marginBottom: 4 }}>{L('공고를 선택하면 광고 링크가 바로 만들어집니다', 'Pick jobs and the ad link is created instantly', 'Chọn tin và link quảng cáo được tạo ngay')}</div>
        <div style={{ fontSize: 12.5, color: '#8B95A1', marginBottom: 14, lineHeight: 1.5 }}>
          {L('제목, 주소, UTM은 자동으로 채워지며 생성과 동시에 링크가 복사됩니다. 필요하면 아래 목록에서 수정할 수 있습니다.',
             'Title, address and UTM are filled in automatically and the link is copied on creation. Edit anything later from the list below.')}
        </div>
        <div style={{ position: 'relative' }}>
          <input style={S.input} value={pickSearch} onChange={e => setPickSearch(e.target.value)}
            placeholder={L('공고 검색  ·  제목 · 회사 · JD 코드', 'Search jobs  ·  title · company · JD code', 'Tìm tin  ·  tiêu đề · công ty · mã')} />
          {pickQ && (
            <div style={{ position: 'absolute', left: 0, right: 0, top: '100%', zIndex: 5, background: '#fff', border: '1px solid #E5E8EB', borderRadius: 10, marginTop: 6, maxHeight: 300, overflowY: 'auto', boxShadow: '0 8px 24px rgba(0,0,0,0.08)' }}>
              {pickCandidates.length === 0 && <div style={{ padding: '12px 14px', fontSize: 12.5, color: '#9CA3AF' }}>{L('검색 결과가 없습니다', 'No matches', 'Không có kết quả')}</div>}
              {pickCandidates.map(j => (
                <div key={j.id} onClick={() => { setPicked(p => [...p, j.id]); setPickSearch('') }}
                  style={{ padding: '9px 14px', cursor: 'pointer', borderBottom: '1px solid #F1F3F5', fontSize: 13, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                  <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <b style={{ color: '#191F28' }}>{j.company}</b><span style={{ color: '#8B95A1' }}> · </span>{j.title}
                    {j.source_id ? <span style={{ color: '#9CA3AF' }}> · {j.source_id}</span> : null}
                  </span>
                  {!j.is_active && <span style={{ flexShrink: 0, fontSize: 11, color: '#C2410C', fontWeight: 700 }}>{L('비활성', 'inactive')}</span>}
                </div>
              ))}
            </div>
          )}
        </div>
        {pickedJobs.length > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
            {pickedJobs.map(j => (
              <span key={j.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 600, color: '#191F28', background: '#fff', border: '1px solid #E5E8EB', borderRadius: 8, padding: '5px 6px 5px 10px', maxWidth: '100%' }}>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{j.company} · {j.title}</span>
                <button onClick={() => setPicked(p => p.filter(id => id !== j.id))} aria-label="remove" style={{ border: 'none', background: 'none', color: '#9CA3AF', cursor: 'pointer', fontSize: 14, lineHeight: 1, padding: '0 2px' }}>×</button>
              </span>
            ))}
          </div>
        )}
        <div style={{ marginTop: 14 }}>
          <label style={S.label}>{L('어디에 쓰는 링크인가요?', 'Where will this link be used?', 'Link dùng ở đâu?')}</label>
          <PlatformChips value={platform} onChange={p => setPlatform(p.key)} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 14, flexWrap: 'wrap' }}>
          <button onClick={quickCreate} disabled={creating || pickedJobs.length === 0}
            style={{ ...S.btnP, background: creating || pickedJobs.length === 0 ? '#E5E8EB' : '#ff4400', color: creating || pickedJobs.length === 0 ? '#9CA3AF' : '#fff', cursor: creating || pickedJobs.length === 0 ? 'default' : 'pointer' }}>
            {creating ? L('만드는 중…', 'Creating…', 'Đang tạo…') : L(`선택한 ${pickedJobs.length}건으로 링크 만들기`, `Create link with ${pickedJobs.length} job${pickedJobs.length === 1 ? '' : 's'}`, `Tạo link với ${pickedJobs.length} tin`)}
          </button>
          <button onClick={openNew} style={{ background: 'none', border: 'none', color: '#6B7280', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}>
            {L('직접 설정해서 만들기', 'Create with custom settings', 'Tạo với cài đặt tuỳ chỉnh')}
          </button>
        </div>
        {msg && <div style={{ fontSize: 13, color: '#c00', fontWeight: 600, marginTop: 12 }}>{msg}</div>}
        {created && (
          <div style={{ marginTop: 14, background: '#fff', border: '1px solid #E5E8EB', borderRadius: 10, padding: '12px 14px' }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: '#1B7A43', marginBottom: 8 }}>{L('링크가 만들어졌습니다. 광고에 이 주소를 붙여 넣으세요.', 'Link created. Paste this address into the ad.', 'Đã tạo link. Dán địa chỉ này vào quảng cáo.')}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <code style={{ ...S.mono, background: '#F9FAFB', border: '1px solid #EEF0F2', borderRadius: 8, padding: '6px 10px', color: '#4E5968', wordBreak: 'break-all' }}>{adLink(created)}</code>
              <button onClick={() => copy(created)} style={{ ...S.btn, color: '#ff4400', borderColor: '#ffd2c2', background: '#FFF8F5' }}>
                {copied === created.id ? L('복사됨 ✓', 'Copied ✓', 'Đã sao chép ✓') : L('복사', 'Copy', 'Sao chép')}
              </button>
              <a href={`/l/${created.slug}`} target="_blank" rel="noreferrer" style={{ ...S.btn, textDecoration: 'none', display: 'inline-block' }}>{L('미리보기 ↗', 'Preview ↗', 'Xem trước ↗')}</a>
            </div>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder={L('만든 링크 검색  ·  제목 · slug · 캠페인', 'Search links  ·  title · slug · campaign', 'Tìm link  ·  tiêu đề · slug · chiến dịch')}
          style={{ ...S.input, maxWidth: 380 }} />
      </div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        {FILTERS.map(([key, labelTxt, n]) => {
          const on = filter === key
          return (
            <button key={key} onClick={() => setFilter(key)} style={{
              fontSize: 13, fontWeight: 600, cursor: 'pointer', borderRadius: 999, padding: '7px 14px', fontFamily: 'inherit',
              border: '1px solid', borderColor: on ? '#ff4400' : '#E5E8EB',
              background: on ? '#FFF1EC' : '#fff', color: on ? '#ff4400' : '#4E5968',
            }}>
              {labelTxt} <span style={{ opacity: on ? 0.7 : 0.5 }}>{n}</span>
            </button>
          )
        })}
      </div>

      {collections.length === 0 && (
        <div style={{ border: '1px dashed #E5E8EB', borderRadius: 14, padding: '40px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#191F28', marginBottom: 6 }}>{L('아직 생성된 캠페인 링크가 없습니다', 'No campaign links yet', 'Chưa có link chiến dịch')}</div>
          <div style={{ fontSize: 13, color: '#8B95A1', lineHeight: 1.6, maxWidth: 440, margin: '0 auto' }}>
            {L('위에서 공고를 선택하고 "링크 만들기"를 누르면 여기에 표시됩니다.', 'Pick jobs above and press "Create link" — it will show up here.', 'Chọn tin ở trên và nhấn "Tạo link".')}
          </div>
        </div>
      )}
      {collections.length > 0 && filtered.length === 0 && <div style={{ color: '#aaa', fontSize: 13, padding: '8px 0' }}>{L('해당 링크가 없습니다', 'No matching links', 'Không có link phù hợp')}</div>}

      {filtered.map(c => {
        const jobs = (c.job_ids || []).map(id => jobById[id]).filter(Boolean)
        const inactive = jobs.filter(j => !j.is_active).length
        return (
          <div key={c.id} style={S.card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#191F28', letterSpacing: '-0.01em' }}>{c.title}</div>
                {c.description && <div style={{ fontSize: 12.5, color: '#6B7280', marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.description}</div>}
              </div>
              <StatusBadge on={c.is_active} />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
              <code style={{ ...S.mono, background: '#F9FAFB', border: '1px solid #EEF0F2', borderRadius: 8, padding: '6px 10px', color: '#4E5968' }}>{SITE_SHORT}/l/{c.slug}</code>
              <button onClick={() => copy(c)} style={{ ...S.btn, color: '#ff4400', borderColor: '#ffd2c2', background: '#FFF8F5' }}>
                {copied === c.id ? L('복사됨 ✓', 'Copied ✓', 'Đã sao chép ✓') : L('광고 링크 복사', 'Copy ad link', 'Sao chép link')}
              </button>
              <a href={`/l/${c.slug}`} target="_blank" rel="noreferrer" style={{ ...S.btn, textDecoration: 'none', display: 'inline-block' }}>{L('미리보기 ↗', 'Preview ↗', 'Xem trước ↗')}</a>
            </div>

            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 12 }}>
              {jobs.map(j => (
                <span key={j.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600, color: j.is_active ? '#4E5968' : '#C2410C', background: j.is_active ? '#F2F4F6' : '#FFF4E5', borderRadius: 8, padding: '4px 9px', maxWidth: '100%' }}>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{j.company} · {j.title}</span>
                </span>
              ))}
              {(c.job_ids || []).length > jobs.length && (
                <span style={{ fontSize: 12, color: '#9CA3AF', alignSelf: 'center' }}>{L(`+ 찾을 수 없는 공고 ${(c.job_ids || []).length - jobs.length}건`, `+ ${(c.job_ids || []).length - jobs.length} not found`)}</span>
              )}
            </div>
            {inactive > 0 && (
              <div style={{ fontSize: 12, color: '#C2410C', fontWeight: 600, marginTop: 8 }}>
                {L(`비활성 공고 ${inactive}건은 페이지에 표시되지 않습니다.`, `${inactive} inactive job(s) are hidden on the page.`)}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginTop: 14, paddingTop: 12, borderTop: '1px solid #F1F3F5', flexWrap: 'wrap' }}>
              <div style={{ fontSize: 12, color: '#9CA3AF', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <span style={{ fontWeight: 600, color: '#6B7280' }}>{(() => { const p = platformOf(c); return p ? (lang === 'vi' ? p.label[2] : ko ? p.label[0] : p.label[1]) : `${c.utm_source || '?'} / ${c.utm_medium || '?'}` })()}</span>
                <span>utm_campaign: {c.utm_campaign || c.slug}</span>
                {c.created_at && <span>{new Date(c.created_at).toLocaleDateString()}</span>}
                {c.created_by && <span>{c.created_by}</span>}
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => openEdit(c)} style={S.btn}>{L('수정', 'Edit', 'Sửa')}</button>
                <button onClick={() => toggleActive(c)} style={{ ...S.btn, color: c.is_active ? '#C2410C' : '#1B7A43' }}>
                  {c.is_active ? L('비활성화', 'Turn off', 'Tắt') : L('활성화', 'Turn on', 'Bật')}
                </button>
                <button onClick={() => remove(c)} style={{ ...S.btn, color: '#9CA3AF' }}>{L('삭제', 'Delete', 'Xoá')}</button>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
