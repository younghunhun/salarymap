import { useState } from 'react'
import { IconButton, Toggle, Text } from '@likelion-design/ui'
import { RiArrowLeftLine } from '@remixicon/react'
import { useAdmin } from '../../lib/adminSwr'
import { G, C, PrimaryButton, SecondaryButton, SearchField, Field, TextArea, FilterTabs, StatusTag, Card, SectionTitle, State, Notice } from './ui'

// KTC 랜딩 공고 관리 — ktc-landing(별도 Supabase)의 jobs를 FYI 어드민에서 목록/등록/수정/노출 토글.
// 저장 즉시 랜딩 사이트(활성 공고만 노출)에 반영된다. 데이터: /api/admin/ktc-landing-jobs

const EMPTY = {
  company_name: '', title: '', job_id: '', location: '', work_type: '', category: '', industry: '',
  experience: '', headcount: '', salary_min: '', salary_max: '', company_website: '', company_logo: '',
  description: '', responsibilities: '', requirements: '', benefits: '',
  is_matching_week: false, is_active: true,
}

export default function KtcLandingJobsView({ token, lang }) {
  const ko = lang === 'ko'
  const L = (k, e, v) => (lang === 'vi' ? (v ?? e) : ko ? k : e)
  const { data, error, isLoading, mutate } = useAdmin('/api/admin/ktc-landing-jobs', token)
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState(null) // null | 'new' | job.id
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState(null)

  const jobs = data?.jobs || []

  const openEdit = (job) => {
    const f = { ...EMPTY }
    for (const k of Object.keys(EMPTY)) f[k] = job[k] ?? EMPTY[k]
    setForm(f); setEditing(job.id); setMsg(null)
  }

  async function save() {
    if (!form.company_name.trim() || !form.title.trim()) {
      setMsg(L('회사명과 공고 제목은 필수입니다', 'Company and title are required', 'Bắt buộc nhập công ty và tiêu đề'))
      return
    }
    setSaving(true); setMsg(null)
    try {
      const body = {
        ...form,
        salary_min: form.salary_min === '' ? null : Number(form.salary_min),
        salary_max: form.salary_max === '' ? null : Number(form.salary_max),
        headcount: form.headcount === '' ? null : Number(form.headcount),
      }
      if (editing !== 'new') body.id = editing
      const res = await fetch('/api/admin/ktc-landing-jobs', {
        method: editing === 'new' ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      })
      const r = await res.json()
      if (!res.ok) throw new Error(r.error || `HTTP ${res.status}`)
      setEditing(null)
      mutate()
    } catch (e) {
      setMsg((L('저장 실패: ', 'Save failed: ', 'Lưu thất bại: ')) + e.message)
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(job) {
    try {
      const res = await fetch('/api/admin/ktc-landing-jobs', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id: job.id, is_active: !job.is_active }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      mutate()
    } catch (e) {
      alert((L('변경 실패: ', 'Failed: ', 'Thất bại: ')) + e.message)
    }
  }

  if (error) return <State kind="error">{L('불러오기 실패', 'Failed to load', 'Tải thất bại')} — {error.message}</State>
  if (isLoading || !data) return <State kind="loading">{L('불러오는 중…', 'Loading…', 'Đang tải…')}</State>
  if (data.error) return <State kind="error">{data.error}</State>

  const q = search.trim().toLowerCase()
  const searched = q ? jobs.filter(j => [j.title, j.company_name, j.job_id, j.category].some(v => (v || '').toLowerCase().includes(q))) : jobs
  const filtered = searched.filter(j => (filter === 'active' ? j.is_active : filter === 'hidden' ? !j.is_active : true))
  const activeCount = searched.filter(j => j.is_active).length

  const field = (key, labelTxt, props = {}) => (
    <Field title={labelTxt} value={form[key] ?? ''} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} {...(props.placeholder ? { placeholder: props.placeholder } : {})} />
  )
  const area = (key, labelTxt) => (
    <TextArea title={labelTxt} height={112} value={form[key] ?? ''} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} placeholder={L('• 항목별로 줄바꿈', '• one item per line', '• mỗi dòng một mục')} />
  )
  const grid = (cols) => ({ display: 'grid', gridTemplateColumns: cols, gap: G.md })

  // ── 등록/수정 폼 ──
  if (editing !== null) {
    return (
      <div style={{ minHeight: '70vh', paddingBottom: 60 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: G.sm, marginBottom: G.xl }}>
          <IconButton size="medium" type="outline" color="neutral" icon={<RiArrowLeftLine size={18} />} aria-label={L('목록으로', 'Back to list', 'Về danh sách')} onClick={() => setEditing(null)} />
          <Text variant="heading-h6" style={{ color: C.text }}>
            {editing === 'new' ? L('KTC 랜딩 공고 등록', 'New landing job', 'Đăng tin landing mới') : L('KTC 랜딩 공고 수정', 'Edit landing job', 'Sửa tin landing')}
          </Text>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: G.md }}>
          <Card>
            <SectionTitle>{L('기본 정보', 'Basic info', 'Thông tin cơ bản')}</SectionTitle>
            <div style={{ display: 'flex', flexDirection: 'column', gap: G.lg }}>
              <div className="adm-m-1col" style={grid('minmax(0, 1fr) minmax(0, 2fr) minmax(0, 1fr)')}>
                {field('company_name', L('회사명 *', 'Company *', 'Công ty *'))}
                {field('title', L('공고 제목 *', 'Title *', 'Tiêu đề *'))}
                {field('job_id', L('공고 코드', 'Job code', 'Mã tin'), { placeholder: 'YD1904' })}
              </div>
              <div className="adm-m-1col" style={grid('repeat(4, minmax(0, 1fr))')}>
                {field('location', L('근무지', 'Location', 'Địa điểm'), { placeholder: 'Ho Chi Minh City' })}
                {field('work_type', L('근무 형태', 'Work type', 'Hình thức'), { placeholder: 'Full-time / Remote' })}
                {field('category', L('직군', 'Category', 'Nhóm ngành'), { placeholder: 'Development / Marketing' })}
                {field('industry', L('산업', 'Industry', 'Ngành'), { placeholder: 'E-commerce' })}
              </div>
              <div className="adm-m-1col" style={grid('repeat(4, minmax(0, 1fr))')}>
                {field('salary_min', L('급여 최소 (VND)', 'Salary min (VND)', 'Lương tối thiểu (VND)'), { placeholder: '15000000' })}
                {field('salary_max', L('급여 최대 (VND)', 'Salary max (VND)', 'Lương tối đa (VND)'), { placeholder: '25000000' })}
                {field('experience', L('경력', 'Experience', 'Kinh nghiệm'), { placeholder: '2+ years' })}
                {field('headcount', L('채용 인원', 'Headcount', 'Số lượng'), { placeholder: '1' })}
              </div>
              <div className="adm-m-1col" style={grid('repeat(2, minmax(0, 1fr))')}>
                {field('company_website', L('회사 웹사이트', 'Company website', 'Website'), { placeholder: 'https://…' })}
                {field('company_logo', L('로고 URL', 'Logo URL', 'URL logo'), { placeholder: 'https://…' })}
              </div>
            </div>
          </Card>

          <Card>
            <SectionTitle>{L('상세 내용', 'Details', 'Nội dung chi tiết')}</SectionTitle>
            <div style={{ display: 'flex', flexDirection: 'column', gap: G.lg }}>
              {area('description', L('회사/포지션 소개', 'Description', 'Giới thiệu'))}
              {area('responsibilities', L('담당 업무', 'Responsibilities', 'Công việc'))}
              {area('requirements', L('자격 요건', 'Requirements', 'Yêu cầu'))}
              {area('benefits', L('복지·혜택', 'Benefits', 'Phúc lợi'))}
            </div>
          </Card>

          <Card>
            <SectionTitle>{L('노출 설정', 'Visibility', 'Hiển thị')}</SectionTitle>
            <div style={{ display: 'flex', gap: G.xl, alignItems: 'center', flexWrap: 'wrap' }}>
              <Toggle size="small" labelPosition="end" checked={!!form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))}
                label={L('랜딩에 노출', 'Visible on landing', 'Hiển thị trên landing')} />
              <Toggle size="small" labelPosition="end" checked={!!form.is_matching_week} onChange={e => setForm(f => ({ ...f, is_matching_week: e.target.checked }))}
                label={L('매칭위크 공고', 'Matching week', 'Matching week')} />
            </div>
          </Card>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: G.sm, marginTop: G.xl }}>
          <div style={{ marginRight: 'auto' }}><Notice>{msg}</Notice></div>
          <PrimaryButton size="large" onClick={save} disabled={saving}
            label={saving ? L('저장 중…', 'Saving…', 'Đang lưu…') : editing === 'new' ? L('등록', 'Create', 'Đăng') : L('저장', 'Save', 'Lưu')} />
        </div>
      </div>
    )
  }

  // ── 목록 ──
  const FILTERS = [
    ['all', L('전체', 'All', 'Tất cả'), searched.length],
    ['active', L('노출중', 'Live', 'Đang hiển thị'), activeCount],
    ['hidden', L('비노출', 'Hidden', 'Đang ẩn'), searched.length - activeCount],
  ]
  const fmtSalary = (j) => {
    if (!j.salary_min && !j.salary_max) return null
    const m = (n) => (n ? `${Math.round(n / 1e6)}M` : '?')
    return `${m(j.salary_min)}–${m(j.salary_max)} VND`
  }

  return (
    <div style={{ minHeight: '70vh' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: G.md, flexWrap: 'wrap', marginBottom: G.lg }}>
        <div className="adm-m-scroll" style={{ minWidth: 0, maxWidth: '100%' }}>
          <FilterTabs value={filter} onChange={setFilter} items={FILTERS.map(([value, label, count]) => ({ value, label, count }))} />
        </div>
        <SearchField value={search} onChange={e => setSearch(e.target.value)} placeholder={L('제목 · 회사 · 코드 검색', 'Search title · company · code', 'Tìm tiêu đề · công ty · mã')} />
      </div>

      {filtered.length === 0 && <State title={L('해당하는 공고가 없습니다', 'No matching jobs', 'Không có tin phù hợp')} />}
      <div style={{ display: 'flex', flexDirection: 'column', gap: G.md }}>
        {filtered.map(job => (
          <Card key={job.id}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: G.md }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, color: C.sub, lineHeight: 1.5 }}>
                  {job.company_name}{job.job_id ? ` · ${job.job_id}` : ''}
                </div>
                <div style={{ fontSize: 16, fontWeight: 600, lineHeight: 1.4, color: C.text }}>{job.title}</div>
              </div>
              <StatusTag tone={job.is_active ? 'success' : 'neutral'}>
                {job.is_active ? L('노출중', 'Live', 'Hiển thị') : L('비노출', 'Hidden', 'Ẩn')}
              </StatusTag>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: G.xs, marginTop: G.md }}>
              {[job.category, job.location, fmtSalary(job)].filter(Boolean).map((t, i) => <StatusTag key={i}>{t}</StatusTag>)}
              {job.created_at && <span style={{ fontSize: 12, color: C.faint, marginLeft: G.xs }}>{new Date(job.created_at).toLocaleDateString()}</span>}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: G.sm, marginTop: G.lg, paddingTop: G.lg, borderTop: `1px solid ${C.line}` }}>
              <SecondaryButton size="small" label={L('수정', 'Edit', 'Sửa')} onClick={() => openEdit(job)} />
              <SecondaryButton size="small" label={job.is_active ? L('내리기', 'Hide', 'Ẩn tin') : L('노출하기', 'Publish', 'Hiển thị')} onClick={() => toggleActive(job)} />
            </div>
          </Card>
        ))}
      </div>

      <div style={{ fontSize: 12, color: C.faint, marginTop: G.lg, lineHeight: 1.5 }}>
        {L(
          'ktc-landing 별도 DB의 공고를 직접 관리합니다. 저장하거나 노출 상태를 바꾸면 랜딩 사이트에 즉시 반영됩니다. 랜딩 지원자는 시트 → ktc-support를 거쳐 KTC 소싱 탭에 집계됩니다.',
          'Manages jobs in the separate ktc-landing DB — changes go live on the landing site immediately. Landing applicants flow into the KTC sources tab via the sheet.',
          'Quản lý tin trong DB riêng của ktc-landing — thay đổi hiển thị ngay trên trang landing. Ứng viên landing được tổng hợp ở tab Nguồn KTC.'
        )}
      </div>
    </div>
  )
}
