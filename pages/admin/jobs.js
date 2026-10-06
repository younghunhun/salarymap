import { useState, useEffect, useRef } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import AdminLayout from '../../components/admin/AdminLayout'
import { useT } from '../../lib/i18n'
import { supabase } from '../../lib/supabaseClient'
import { useAdmin } from '../../lib/adminSwr'
import Icon from '../../components/Icon'
import { ROLE_GROUPS } from '../../constants/jobs'
import { isSalaryNegotiable, NEGOTIABLE_SOURCES } from '../../utils/salary'
import KtcLandingJobsView from '../../components/admin/KtcLandingJobsView'
import JobCollectionsView from '../../components/admin/JobCollectionsView'
import JobPreview from '../../components/jobs/JobPreview'
import { Chips, Dropdown, DatePickerSingle } from '../../components/admin/FormControls'
import { ChipGroup, Toggle, Text } from '@likelion-design/ui'
import { RiCloseLine, RiImageAddLine, RiArrowDownSLine, RiArrowUpSLine } from '@remixicon/react'
import { G, C, mono, PrimaryButton, SecondaryButton, GhostButton, SearchField, Field, TextArea, FilterTabs, StatusTag, Card, SectionTitle, StatGrid, StatTile, T, TableCard, State } from '../../components/admin/ui'

// 근무지 자주 쓰는 값 (실 DB 분포 기준) — 그 외는 드롭다운의 직접 입력으로
const LOCATION_OPTIONS = [
  'Ho Chi Minh City', 'Hanoi', 'Da Nang', 'District 7, HCMC', 'Remote', 'Seoul', 'Overseas',
].map(v => ({ value: v, label: v }))

const EMPTY_JOB = {
  title: '', company: '', company_initials: '', location: '', type: 'remote',
  country: 'korea', role: 'Backend', experience_min: 1, experience_max: 5,
  salary_min: 50000000, salary_max: 80000000, description: '', is_active: true,
  image_url: '', logo_url: '', images: [],
  tech_stack: [], benefits: [], company_size: '', hiring_process: '',
  deadline: '', headcount: '', apply_url: '', is_featured: false, source: 'manual',
  source_id: '',
}

// 어드민에서 고를 수 있는 공고 구분(jobs.source). ktc는 /ktc 랜딩·KTC 지표의 기준값이고,
// company_self·크롤 소스(wanted/topdev…)는 여기서 만드는 값이 아니라 선택지에 없다.
const ADMIN_SOURCES = ['manual', 'ktc']

const COUNTRIES = ['korea','vietnam','global']

export default function AdminJobs() {
  const [auth, setAuth] = useState('loading')
  const [token, setToken] = useState(null)
  const [currentEmail, setCurrentEmail] = useState(null)
  const { lang: globalLang } = useT()
  const L = (ko, en) => (globalLang === 'ko' ? ko : en) // admin은 ko/en 2개
  const router = useRouter()
  const tab = router.query.tab || 'jobs'
  const [jobFilter, setJobFilter] = useState('all')
  const [jobSearch, setJobSearch] = useState('')
  // 공고 6,000건+ 를 한 번에 그리면 검색 한 글자마다 0.5초 안팎이 걸린다 — 60건씩 이어 붙인다.
  // 검색·필터·정렬은 전체 대상 그대로이고 그리는 것만 자른다. 조건이 바뀌면 처음부터.
  const JOBS_PAGE = 60
  const [jobsVisible, setJobsVisible] = useState(JOBS_PAGE)
  useEffect(() => { setJobsVisible(JOBS_PAGE) }, [jobFilter, jobSearch])
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY_JOB)
  const [saving, setSaving] = useState(false)
  const [editLoadingId, setEditLoadingId] = useState(null) // 수정 버튼을 눌러 전체 행을 받아오는 중인 공고 id
  const [msg, setMsg] = useState(null)
  const [newAdminEmail, setNewAdminEmail] = useState('')
  const [imageUploading, setImageUploading] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false) // 공고 폼 '세부 정보' 접기
  const [roleGroupKey, setRoleGroupKey] = useState(null) // 직군 대분류 선택 (null이면 현재 role의 그룹)
  const [acct, setAcct] = useState({ email: '', companyName: '', contactName: '' })
  const [acctIssuing, setAcctIssuing] = useState(false)
  const [acctResult, setAcctResult] = useState(null)
  const imgInputRef = useRef(null)

  // Auth check — DB based
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { setAuth('denied'); return }
      try {
        const res = await fetch(`/api/admin/check?email=${encodeURIComponent(session.user.email)}`)
        const { isAdmin } = await res.json()
        if (!isAdmin) { setAuth('denied'); return }
        setToken(session.access_token)
        setCurrentEmail(session.user.email)
        setAuth('ok')
      } catch {
        setAuth('denied')
      }
    })
    // 자동 갱신된 토큰을 상태에 반영 — 탭을 1시간 이상 열어두면 마운트 시점 토큰이 만료된다
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.access_token) setToken(session.access_token)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  // 쓰기 요청은 매번 fresh 토큰으로 — 만료 토큰이면 저장/삭제가 조용히 401로 실패한다
  const headers = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    return { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token || token}` }
  }

  // SWR: 캐시로 페이지 재방문 즉시 표시. 액션 후엔 해당 목록만 mutate()로 갱신.
  const { data: jobs = [], mutate: mutateJobs } = useAdmin('/api/admin/jobs', token)
  const { data: admins = [], mutate: mutateAdmins } = useAdmin('/api/admin/users', token)
  const { data: companies = [], mutate: mutateCompanies } = useAdmin('/api/admin/companies', token)
  const { data: kpi = null } = useAdmin('/api/admin/company-kpi', token)
  const flash = (text) => { setMsg(text); setTimeout(() => setMsg(null), 3000) }

  const handleSave = async () => {
    setSaving(true)
    // poster_email/account_company는 목록 API가 붙여준 표시용 필드, salary_negotiable은 폼 전용 —
    // jobs 테이블에 없는 컬럼이라 그대로 보내면 저장이 통째로 거절된다.
    const { poster_email, account_company, salary_negotiable, ...jobFields } = form
    const payload = {
      ...jobFields,
      // 협의 가능: 0-0 저장 → 지면에서는 '협의 가능'으로 표시 (utils/salary.js isSalaryNegotiable)
      salary_min: salary_negotiable ? 0 : Number(form.salary_min),
      salary_max: salary_negotiable ? 0 : Number(form.salary_max),
      experience_min: Number(form.experience_min),
      experience_max: Number(form.experience_max),
      image_url: form.image_url || null,
      logo_url: form.logo_url || null,
      images: (form.images && form.images.length > 0) ? form.images : null,
      tech_stack: (form.tech_stack && form.tech_stack.length > 0) ? form.tech_stack : [],
      benefits: (form.benefits && form.benefits.length > 0) ? form.benefits : [],
      company_size: form.company_size || null,
      hiring_process: form.hiring_process || null,
      deadline: form.deadline || null,
      headcount: form.headcount ? Number(form.headcount) : null,
      apply_url: form.apply_url || null,
      // JD 코드 — 빈 문자열로 저장하면 (source, source_id) 유니크 제약에 서로 걸린다
      source_id: (form.source_id || '').trim() || null,
    }
    const res = editing
      ? await fetch('/api/admin/jobs', { method: 'PUT', headers: await headers(), body: JSON.stringify({ id: editing.id, ...payload }) })
      : await fetch('/api/admin/jobs', { method: 'POST', headers: await headers(), body: JSON.stringify(payload) })
    if (!res.ok) {
      const { error } = await res.json().catch(() => ({}))
      setSaving(false); flash(L('저장 실패: ', 'Save failed: ') + (error || res.status)); return
    }
    flash(editing ? L('수정했습니다', 'Updated') : L('등록했습니다', 'Created'))
    setSaving(false); setEditing(null); setForm(EMPTY_JOB); mutateJobs(); router.push({ pathname: '/admin/jobs', query: { tab: 'jobs' } }, undefined, { shallow: true })
  }

  const handleDelete = async (id) => {
    if (!confirm(L('이 공고를 삭제하시겠습니까?', 'Delete this job?'))) return
    await fetch('/api/admin/jobs', { method: 'DELETE', headers: await headers(), body: JSON.stringify({ id }) })
    flash(L('삭제했습니다', 'Deleted')); mutateJobs()
  }

  const handleToggle = async (job) => {
    await fetch('/api/admin/jobs', { method: 'PUT', headers: await headers(), body: JSON.stringify({ id: job.id, is_active: !job.is_active }) })
    mutateJobs()
  }

  const handleToggleVerify = async (c) => {
    await fetch('/api/admin/companies', { method: 'PUT', headers: await headers(), body: JSON.stringify({ id: c.id, verified: !c.verified_at }) })
    flash(c.verified_at ? L('인증을 해제했습니다', 'Verification removed') : L('인증했습니다', 'Verified')); mutateCompanies()
  }

  const handleIssueAccount = async () => {
    if (!acct.email.includes('@') || !acct.companyName.trim()) return
    setAcctIssuing(true); setAcctResult(null)
    try {
      const res = await fetch('/api/admin/companies', { method: 'POST', headers: await headers(), body: JSON.stringify(acct) })
      const data = await res.json()
      if (!res.ok) { flash('❌ ' + (data.error || L('발급 실패', 'Failed to issue'))); return }
      setAcctResult(data)
      setAcct({ email: '', companyName: '', contactName: '' })
      flash(data.reused ? L('기존 계정의 비밀번호를 재설정했습니다', 'Existing account password reset') : L('계정을 발급했습니다', 'Account issued')); mutateCompanies()
    } catch (e) {
      flash('❌ ' + (e.message || L('발급 실패', 'Failed to issue')))
    } finally {
      setAcctIssuing(false)
    }
  }

  const handleToggleFeatured = async (job) => {
    await fetch('/api/admin/jobs', { method: 'PUT', headers: await headers(), body: JSON.stringify({ id: job.id, is_featured: !job.is_featured }) })
    flash(job.is_featured ? L('프리미엄을 해제했습니다', 'Premium removed') : L('프리미엄으로 등록했습니다 — 적극 채용 중 섹션에 노출됩니다', 'Premium enabled — shown in “Actively hiring”'))
    mutateJobs()
  }

  const handleApprove = async (job) => {
    await fetch('/api/admin/jobs', { method: 'PUT', headers: await headers(), body: JSON.stringify({ id: job.id, status: 'live', is_active: true }) })
    // 승인 알림 (기업에게, 베스트에포트)
    try { await fetch('/api/admin/notify-job-approved', { method: 'POST', headers: await headers(), body: JSON.stringify({ jobId: job.id }) }) } catch (_) {}
    flash(L('승인했습니다 — 기업에 알림을 보냈습니다', 'Approved — company notified')); mutateJobs()
  }
  const handleReject = async (job) => {
    if (!confirm(L('이 공고를 반려하시겠습니까?', 'Reject this job posting?'))) return
    await fetch('/api/admin/jobs', { method: 'PUT', headers: await headers(), body: JSON.stringify({ id: job.id, status: 'rejected', is_active: false }) })
    flash(L('반려했습니다', 'Rejected')); mutateJobs()
  }

  const handleAddAdmin = async () => {
    if (!newAdminEmail.includes('@')) return
    const res = await fetch('/api/admin/users', { method: 'POST', headers: await headers(), body: JSON.stringify({ email: newAdminEmail.trim() }) })
    if (res.ok) { flash(L('관리자를 추가했습니다', 'Admin added')); setNewAdminEmail(''); mutateAdmins() }
    else { const d = await res.json(); flash(d.error || L('추가하지 못했습니다', 'Failed')) }
  }

  const handleRemoveAdmin = async (email) => {
    if (!confirm(L(`${email} 계정을 관리자에서 삭제하시겠습니까?`, `Remove ${email} from admin?`))) return
    const res = await fetch('/api/admin/users', { method: 'DELETE', headers: await headers(), body: JSON.stringify({ email }) })
    if (res.ok) { flash(L('삭제했습니다', 'Removed')); mutateAdmins() }
    else { const d = await res.json(); flash(d.error || L('삭제하지 못했습니다', 'Failed')) }
  }

  const uploadFiles = async (files) => {
    if (!files.length) return
    setImageUploading(true)
    const newUrls = []
    for (const file of files) {
      if (file.size > 5 * 1024 * 1024) { flash(L('이미지는 장당 5MB까지 올릴 수 있습니다', 'Max 5MB per image')); continue }
      const ext = file.name?.split('.').pop() || 'png'
      const path = `jobs/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
      const { error } = await supabase.storage.from('job-images').upload(path, file)
      if (!error) {
        const { data } = supabase.storage.from('job-images').getPublicUrl(path)
        newUrls.push(data.publicUrl)
      } else {
        flash(error.message)
      }
    }
    if (newUrls.length) setForm(prev => ({ ...prev, images: [...(prev.images || []), ...newUrls] }))
    setImageUploading(false)
    if (imgInputRef.current) imgInputRef.current.value = ''
  }

  const handleImageUpload = async (e) => {
    await uploadFiles(Array.from(e.target.files || []))
  }

  const handlePaste = async (e) => {
    const items = Array.from(e.clipboardData?.items || [])
    const imageFiles = items
      .filter(item => item.type.startsWith('image/'))
      .map(item => item.getAsFile())
      .filter(Boolean)
    if (imageFiles.length) {
      e.preventDefault()
      await uploadFiles(imageFiles)
    }
  }

  const removeImage = (idx) => {
    setForm(prev => ({ ...prev, images: (prev.images || []).filter((_, i) => i !== idx) }))
  }

  const goTab = (t) => router.push({ pathname: '/admin/jobs', query: { tab: t } }, undefined, { shallow: true })
  // 목록(/api/admin/jobs)은 가벼운 컬럼만 온다 — 수정은 전체 행을 따로 받아서 연다.
  // 받아오지 못하면 폼을 열지 않는다(가벼운 행으로 열면 저장 시 본문이 빈 값으로 덮어써진다).
  const startEdit = async (listJob) => {
    if (editLoadingId) return
    setEditLoadingId(listJob.id)
    try {
      const res = await fetch(`/api/admin/jobs?id=${listJob.id}`, { headers: await headers() })
      if (!res.ok) throw new Error(String(res.status))
      const job = await res.json()
      setEditing(job)
      const negotiable = isSalaryNegotiable(job)
      setForm({
        ...job,
        images: job.images || [],
        // 협의 가능(0-0) 공고는 체크박스만 켜고 입력칸엔 기본값 노출 (체크 해제 시 바로 쓸 수 있게)
        salary_min: negotiable ? EMPTY_JOB.salary_min : job.salary_min,
        salary_max: negotiable ? EMPTY_JOB.salary_max : job.salary_max,
        salary_negotiable: negotiable,
      })
      goTab('job-new')
    } catch (e) {
      flash('❌ ' + L('공고를 불러오지 못했습니다. 다시 시도해 주세요.', 'Failed to load the job. Please try again.'))
    } finally {
      setEditLoadingId(null)
    }
  }
  const startNew = () => { setEditing(null); setForm(EMPTY_JOB); goTab('jobs') }

  if (auth === 'loading') return <div style={S.center}>Loading...</div>
  if (auth === 'denied') return (
    <div style={S.center}>
      <div style={{ marginBottom: 16 }}><Icon name="lock" size={48} color="#1a1a1a" /></div>
      <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Admin access required</div>
      <div style={{ color: '#888', marginBottom: 24 }}>Sign in with an admin account.</div>
      <PrimaryButton label="Sign in with Google" onClick={() => { window.location.href = '/api/auth/google?return=' + encodeURIComponent('/admin/dashboard'); }} />
    </div>
  )

  const count = (n) => <span style={{ color: C.faint, fontWeight: 500 }}>{n}</span>
  const fmtN = (v) => (typeof v === 'number' ? v.toLocaleString() : v)

  return (
    <>
      <Head><title>Admin — Jobs</title></Head>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #f7f7f5; font-family: -apple-system, 'Helvetica Neue', Arial, sans-serif; }
      `}</style>

      <AdminLayout>
      <div style={S.shell}>
        {msg && <div style={S.flash}>{msg}</div>}

        {/* JOBS TAB */}
        {tab === 'job-new' && (() => {
          const sec = { marginBottom: G.xl + G.sm };
          const col = { display: 'flex', flexDirection: 'column', gap: G.lg };
          const row2 = { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: G.md };
          // 라벨·도움말은 DS TextField 의 title/description 과 같은 크기(13px)로 맞춘다
          const lbl = { fontSize: 13, lineHeight: 1.6, marginBottom: G.xs };
          const help = { fontSize: 13, color: C.faint, lineHeight: 1.6, marginTop: G.xs };
          const thumbX = { position: 'absolute', top: -6, right: -6, width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, borderRadius: '50%', background: C.text, color: '#fff', border: 'none', cursor: 'pointer' };
          return (
            // 스플릿 화면: 왼쪽 폼 + 오른쪽은 실사이트 우측 상세 패널(.jd) 그대로 (50vw 고정)
            <div>
            <div style={{ position: 'fixed', top: 0, bottom: 0, left: 232, right: '50vw', overflowY: 'auto', background: '#fff', zIndex: 30, borderRight: `1px solid ${C.border}` }}>
            <div style={{ maxWidth: 680, padding: `${G.xl}px 32px ${G.xl}px` }}>
              <Text variant="heading-h6" as="div" style={{ color: C.text, marginBottom: G.xl }}>
                {editing ? L('공고 수정', 'Edit job') : L('새 공고 등록', 'New job')}
              </Text>

              {/* 공고 구분(source) — KTC로 저장하면 /ktc 랜딩과 KTC 지표에 함께 잡힌다 */}
              <div style={sec}>
                <SectionTitle>{L('공고 구분', 'Job source')}</SectionTitle>
                <Chips value={form.source || 'manual'} onChange={v => setForm({ ...form, source: v })}
                  options={[
                    { value: 'manual', label: L('FYI 직접등록', 'FYI direct') },
                    { value: 'ktc', label: 'KTC' },
                    // 기업 등록·크롤 공고를 수정할 땐 원래 구분을 그대로 보여준다(실수로 바뀌지 않게)
                    ...(form.source && !ADMIN_SOURCES.includes(form.source) ? [{ value: form.source, label: form.source }] : []),
                  ]} />
                {form.source === 'ktc' && (
                  <>
                    <div style={help}>
                      {L('/jobs 와 /ktc 페이지에 함께 노출됩니다.', 'Shown on both /jobs and the /ktc page.')}
                    </div>
                    <div style={{ marginTop: G.lg }}>
                      <Field title={L('JD 코드', 'JD code')} value={form.source_id || ''} onChange={e => setForm({ ...form, source_id: e.target.value.trim() })} placeholder="V173"
                        description={L('ops 시트 JD EXECUTION의 Job ID와 대조해 입력해 주세요. 비워두면 크론이 제목·회사 매칭으로 자동 입력하지만, 매칭에 실패하면 공란으로 남아 지원 귀속이 깨집니다. 재게시는 V173#2 형식으로 입력합니다.',
                           'Match the Job ID in the ops JD EXECUTION sheet. If left empty, the nightly cron fills it by title/company match — a failed match stays empty and breaks application attribution. Reposts use V173#2.')} />
                    </div>
                  </>
                )}
              </div>

              {/* 섹션 순서 = 실제 노출 화면 순서 (사진 → 제목·회사 → 근무조건 → 연봉 → 스택·회사정보 → 설명 → 복지 → 절차 → 지원) */}
              <div style={sec}>
                <SectionTitle sub={L('맨 위 히어로 이미지로 노출됩니다.', 'Shown as the hero image.')}>{L('사진', 'Photos')}</SectionTitle>
                <div>
                  <div style={lbl}>{L('회사 사진', 'Company photos')} <span style={{ color: C.faint }}>{L('캐러셀', 'carousel')}</span></div>
                  {(form.images || []).length > 0 && (
                    <div style={{ display: 'flex', gap: G.md, flexWrap: 'wrap', margin: `${G.sm}px 0 ${G.md}px` }}>
                      {(form.images || []).map((url, i) => (
                        <div key={i} style={{ position: 'relative' }}>
                          <img src={url} alt="" style={{ display: 'block', width: 100, height: 70, objectFit: 'cover', borderRadius: 8, border: `1px solid ${C.border}` }} />
                          <button type="button" aria-label="remove" onClick={() => removeImage(i)} style={thumbX}><RiCloseLine size={12} /></button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div
                    onClick={() => imgInputRef.current?.click()}
                    onPaste={handlePaste}
                    tabIndex={0}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: G.sm, border: `1px dashed ${LINE}`, borderRadius: 8, padding: `${G.lg}px 20px`, background: C.bg, cursor: 'pointer', fontSize: 13, color: C.sub, outline: 'none' }}
                    onFocus={e => e.currentTarget.style.borderColor = C.primary}
                    onBlur={e => e.currentTarget.style.borderColor = LINE}
                  >
                    <RiImageAddLine size={16} style={{ flexShrink: 0 }} />
                    {imageUploading ? L('업로드 중...', 'Uploading…') : L('클릭해서 선택 · 또는 Ctrl+V로 붙여넣기', 'Click to select · or paste with Ctrl+V')}
                  </div>
                  <input ref={imgInputRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={handleImageUpload} />
                </div>
              </div>

              <div style={sec}>
                <SectionTitle>{L('제목 · 회사', 'Title · Company')}</SectionTitle>
                <div style={col}>
                  <F label={L('직무명', 'Job title')} value={form.title} set={v => setForm({ ...form, title: v })} />
                  <F label={L('회사명', 'Company')} value={form.company} set={v => setForm({ ...form, company: v })} />
                </div>
              </div>

              <div style={sec}>
                <SectionTitle sub={L('지역 · 형태 · 경력 · 마감 줄에 표시됩니다.', 'Shown on the location · type · exp · deadline line.')}>{L('근무 조건', 'Work conditions')}</SectionTitle>
                <div style={col}>
                  <div style={row2}>
                    <Dropdown label={L('근무지', 'Location')} value={form.location} options={LOCATION_OPTIONS} allowCustom
                      customLabel={L('직접 입력…', 'Type manually…')} placeholder={L('선택', 'Select')}
                      onChange={v => setForm({ ...form, location: v })} />
                    <DatePickerSingle label={L('마감일', 'Deadline')} value={form.deadline}
                      emptyLabel={L('상시 채용', 'Ongoing')} onChange={v => setForm({ ...form, deadline: v })} />
                  </div>
                  <Chips label={L('고용형태', 'Employment type')} value={form.type} onChange={v => setForm({ ...form, type: v })}
                    options={[{ value: 'onsite', label: 'On-site' }, { value: 'hybrid', label: 'Hybrid' }, { value: 'remote', label: 'Remote' }]} />
                  <div style={row2}>
                    <F label={L('경력 최소 (년)', 'Min experience (yrs)')} value={form.experience_min} type="number" set={v => setForm({ ...form, experience_min: v })} />
                    <F label={L('경력 최대 (년)', 'Max experience (yrs)')} value={form.experience_max} type="number" set={v => setForm({ ...form, experience_max: v })} />
                  </div>
                  {/* 직군 — 드롭다운 대신 칩 2단 (대분류 → 소분류, 전부 노출) */}
                  {(() => {
                    const lk = globalLang === 'ko' ? 'ko' : 'en'
                    const curGroup = ROLE_GROUPS.find(g => g.key === roleGroupKey)
                      || ROLE_GROUPS.find(g => g.roles.some(r => r.value === form.role))
                      || ROLE_GROUPS[0]
                    return (
                      <div>
                        <div style={lbl}>{L('직군 (검색 필터용)', 'Role (for search filters)')}</div>
                        {/* 하나의 컨트롤로 묶는 박스: 상단 = 대분류 탭(대분류가 10개라 줄바꿈되는 자체 탭), 하단 = 소분류 칩 */}
                        <div style={{ border: `1px solid ${C.border}`, borderRadius: 8, overflow: 'hidden' }}>
                          <div style={{ display: 'flex', columnGap: G.md, flexWrap: 'wrap', borderBottom: `1px solid ${C.border}`, background: C.bg, padding: `0 ${G.md}px` }}>
                            {ROLE_GROUPS.map(g => {
                              const on = g.key === curGroup.key
                              return (
                                <button key={g.key} type="button" onClick={() => setRoleGroupKey(g.key)} style={{
                                  padding: `${G.sm}px 2px`, fontSize: 13, fontWeight: on ? 600 : 400, fontFamily: 'inherit',
                                  color: on ? C.text : C.sub, background: 'none', border: 'none',
                                  boxShadow: on ? `inset 0 -2px 0 ${C.text}` : 'none',
                                  cursor: 'pointer', whiteSpace: 'nowrap',
                                }}>
                                  {g.label[lk]}
                                </button>
                              )
                            })}
                          </div>
                          <div style={{ padding: G.md }}>
                            <ChipGroup type="outline" variant="primary" size="medium" value={form.role} onChange={v => setForm({ ...form, role: v })}
                              items={curGroup.roles.map(r => ({ value: r.value, label: r.label[lk] }))}
                              style={{ display: 'flex', flexWrap: 'wrap', gap: G.sm }} />
                          </div>
                        </div>
                      </div>
                    )
                  })()}
                </div>
              </div>

              <div style={sec}>
                <SectionTitle>{L('연봉', 'Salary')}</SectionTitle>
                <div style={row2}>
                  <F label={L('연봉 최소 (VND)', 'Min salary (VND)')} value={form.salary_min} type="number" disabled={!!form.salary_negotiable} set={v => setForm({ ...form, salary_min: v })} />
                  <F label={L('연봉 최대 (VND)', 'Max salary (VND)')} value={form.salary_max} type="number" disabled={!!form.salary_negotiable} set={v => setForm({ ...form, salary_max: v })} />
                </div>
                <div style={{ marginTop: G.lg }}>
                  <Toggle size="small" labelPosition="end" checked={!!form.salary_negotiable} onChange={e => setForm({ ...form, salary_negotiable: e.target.checked })}
                    label={L('급여 협의 가능 (금액 비공개)', 'Salary negotiable (amount hidden)')} />
                </div>
                {form.salary_negotiable && (
                  form.source && !NEGOTIABLE_SOURCES.includes(form.source) ? (
                    <div style={{ ...help, color: C.negative }}>
                      {L(`크롤 수집 공고(${form.source})는 '협의 가능' 대신 추정 연봉이 노출됩니다. 실제 금액을 입력해 주세요.`,
                         `Crawled job (${form.source}) — an estimated range is shown instead of “Negotiable”. Enter the real amount.`)}
                    </div>
                  ) : (
                    <div style={help}>
                      {L("금액 대신 '협의 가능'으로 노출됩니다.", 'Shown as “Negotiable” instead of an amount.')}
                    </div>
                  )
                )}
              </div>

              <div style={sec}>
                <SectionTitle sub={L('쉼표로 구분해 입력해 주세요.', 'Comma-separated.')}>{L('기술 스택', 'Tech stack')}</SectionTitle>
                <Field value={(form.tech_stack || []).join(', ')} onChange={e => setForm({ ...form, tech_stack: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })} placeholder="React, Node.js, PostgreSQL" />
              </div>

              <div style={sec}>
                <SectionTitle>{L('상세 설명', 'About the role')}</SectionTitle>
                <TextArea height={160} value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })} />
              </div>

              <div style={sec}>
                <SectionTitle sub={L('쉼표로 구분해 입력해 주세요.', 'Comma-separated.')}>{L('복지', 'Benefits')}</SectionTitle>
                <Field value={(form.benefits || []).join(', ')} onChange={e => setForm({ ...form, benefits: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })} placeholder={L('유연근무, 4대보험', 'Flexible hours, insurance')} />
              </div>

              <div style={sec}>
                <SectionTitle>{L('채용 절차', 'Hiring process')}</SectionTitle>
                <Field value={form.hiring_process || ''} onChange={e => setForm({ ...form, hiring_process: e.target.value })} placeholder={L('예: 서류 → 1차 인터뷰 → 최종', 'e.g. CV → interview → final')} />
              </div>

              {/* 세부 정보 — 자주 안 쓰는 필드 접기 (입력 부담 축소) */}
              <div style={sec}>
                <button type="button" onClick={() => setShowAdvanced(v => !v)} style={{ display: 'flex', alignItems: 'center', gap: G.xs, background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: 16, fontWeight: 600, lineHeight: 1.4, color: C.text, fontFamily: 'inherit', marginBottom: showAdvanced ? G.lg : 0 }}>
                  {L('세부 정보 (선택)', 'More details (optional)')}
                  {showAdvanced ? <RiArrowUpSLine size={20} style={{ color: C.sub }} /> : <RiArrowDownSLine size={20} style={{ color: C.sub }} />}
                </button>
                {showAdvanced && (
                  <div style={col}>
                    <div style={{ ...row2, gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
                      <F label={L('회사 약자', 'Company initials')} value={form.company_initials} set={v => setForm({ ...form, company_initials: v })} />
                      <F label={L('회사 규모', 'Company size')} value={form.company_size} set={v => setForm({ ...form, company_size: v })} />
                      <F label={L('모집 인원', 'Headcount')} value={form.headcount} type="number" set={v => setForm({ ...form, headcount: v })} />
                    </div>
                    <Chips label={L('국가', 'Country')} value={form.country} onChange={v => setForm({ ...form, country: v })}
                      options={COUNTRIES.map(c => ({ value: c, label: c === 'korea' ? 'Korea' : c === 'vietnam' ? 'Vietnam' : 'Global' }))} />
                    <div style={row2}>
                      <F label={L('썸네일 URL', 'Thumbnail URL')} value={form.image_url} set={v => setForm({ ...form, image_url: v })} />
                      <F label={L('로고 URL', 'Logo URL')} value={form.logo_url} set={v => setForm({ ...form, logo_url: v })} />
                    </div>
                    {(form.logo_url || form.image_url) && (
                      <div style={{ display: 'flex', gap: G.md, alignItems: 'flex-end' }}>
                        {form.logo_url && (
                          <div style={{ position: 'relative', display: 'inline-block' }}>
                            <img src={form.logo_url} alt="logo" style={{ display: 'block', height: 40, borderRadius: 8, objectFit: 'contain', border: `1px solid ${C.border}` }} />
                            <button type="button" aria-label="remove" onClick={() => setForm({ ...form, logo_url: '' })} style={thumbX}><RiCloseLine size={12} /></button>
                          </div>
                        )}
                        {form.image_url && (
                          <div style={{ position: 'relative', display: 'inline-block' }}>
                            <img src={form.image_url} alt="preview" style={{ display: 'block', height: 70, borderRadius: 8, objectFit: 'cover', border: `1px solid ${C.border}` }} />
                            <button type="button" aria-label="remove" onClick={() => setForm({ ...form, image_url: '' })} style={thumbX}><RiCloseLine size={12} /></button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div>
                <SectionTitle>{L('지원 · 노출', 'Apply · Visibility')}</SectionTitle>
                <div style={col}>
                  <F label={L('지원 URL', 'Apply URL')} value={form.apply_url} set={v => setForm({ ...form, apply_url: v })} />
                  <Toggle size="small" labelPosition="end" checked={form.is_featured || false} onChange={e => setForm({ ...form, is_featured: e.target.checked })}
                    label={<>{L('프리미엄 노출', 'Premium placement')}{form.is_featured && L(' · 활성', ' · active')}</>}
                    description={L('“적극 채용 중인 회사” 섹션과 목록 최상단에 노출됩니다.', 'Shown in the “Actively hiring” section and at the top of the list.')} />
                </div>
              </div>
            </div>

            {/* 제출 줄 — 폼이 길어 스크롤 위치와 무관하게 패널 하단에 붙여 둔다 */}
            <div style={{ position: 'sticky', bottom: 0, zIndex: 5, background: '#fff', borderTop: `1px solid ${C.border}`, padding: `${G.md}px 32px` }}>
              <div style={{ maxWidth: 616, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: G.sm }}>
                <div style={{ marginRight: 'auto', minWidth: 0, fontSize: 13, color: C.sub, lineHeight: 1.5 }}>
                  {(!form.title || !form.company) && L('직무명과 회사명을 입력해야 등록할 수 있습니다.', 'Job title and company are required to save.')}
                </div>
                {editing && <SecondaryButton size="large" label={L('취소', 'Cancel')} onClick={startNew} />}
                <PrimaryButton size="large" onClick={handleSave} disabled={saving || !form.title || !form.company}
                  label={saving ? L('저장 중...', 'Saving…') : editing ? L('저장', 'Save') : L('등록', 'Create')} />
              </div>
            </div>
            </div>

            {/* 오른쪽: 실사이트 우측 상세 패널 그대로 (jobs 페이지에서 공고 클릭했을 때와 동일) */}
            <div style={{ position: 'fixed', top: 0, bottom: 0, right: 0, width: '50vw', zIndex: 31, overflowY: 'auto', overscrollBehavior: 'contain', background: '#fafaf8' }}>
              <JobPreview form={form} companyName={form.company} panel />
            </div>
            </div>
          );
        })()}

        {tab === 'jobs' && (
          <div style={{ minHeight: '70vh' }}>
            {(() => {
              const q = jobSearch.trim().toLowerCase();
              const searched = q ? jobs.filter(j => [j.title, j.company, j.location, j.role].some(v => (v || '').toLowerCase().includes(q))) : jobs;
              const pendingCount = searched.filter(j => j.status === 'pending_review').length;
              const companyCount = searched.filter(j => j.source === 'company_self').length;
              const ktcCount = searched.filter(j => j.source === 'ktc').length;
              const filtered = searched.filter(j => {
                if (jobFilter === 'company') return j.source === 'company_self';
                if (jobFilter === 'ktc') return j.source === 'ktc';
                if (jobFilter === 'pending') return j.status === 'pending_review';
                return true;
              });
              const sorted = [...filtered].sort((a, b) => {
                const ap = a.status === 'pending_review' ? 0 : 1;
                const bp = b.status === 'pending_review' ? 0 : 1;
                if (ap !== bp) return ap - bp;
                return new Date(b.created_at || 0) - new Date(a.created_at || 0);
              });
              const fmtDate = (d) => d ? new Date(d).toLocaleDateString() : '-';
              const FILTERS = [['all', L('전체', 'All'), searched.length], ['company', L('기업 등록', 'Company-posted'), companyCount], ['ktc', 'KTC', ktcCount], ['pending', L('승인 대기', 'Pending'), pendingCount]];
              return (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: G.md, flexWrap: 'wrap', marginBottom: G.lg }}>
                    <div className="adm-m-scroll" style={{ minWidth: 0, maxWidth: '100%' }}>
                      <FilterTabs value={jobFilter} onChange={setJobFilter} items={FILTERS.map(([value, label, n]) => ({ value, label, count: n }))} />
                    </div>
                    <SearchField value={jobSearch} onChange={e => setJobSearch(e.target.value)} placeholder={L('직무 · 회사 · 지역 검색', 'Search title · company · location')} />
                  </div>
                  {jobs.length === 0 && (
                    <State title={L('표시할 공고가 없습니다', 'No jobs to show')}>
                      {L('목록을 불러오는 중이라면 잠시 후 표시됩니다.', 'If the list is still loading, it will appear shortly.')}
                    </State>
                  )}
                  {jobs.length > 0 && sorted.length === 0 && <State title={L('해당하는 공고가 없습니다', 'No matching jobs')} />}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: G.md }}>
                  {sorted.slice(0, jobsVisible).map(job => {
                    const st = job.status === 'pending_review'
                      ? { label: L('승인 대기', 'Pending'), tone: 'warning' }
                      : job.status === 'rejected'
                      ? { label: L('반려', 'Rejected'), tone: 'error' }
                      : job.is_active
                      ? { label: L('노출중', 'Live'), tone: 'success' }
                      : { label: L('비노출', 'Hidden'), tone: 'neutral' };
                    return (
                      <Card key={job.id} style={{ contentVisibility: 'auto', containIntrinsicSize: 'auto 190px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: G.md }}>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: 13, color: C.sub, lineHeight: 1.5 }}>{job.company}</div>
                            <a href={`/jobs/${job.id}`} target="_blank" rel="noopener noreferrer" title={L('공고 보기', 'View posting')} style={{ display: 'inline-block', fontSize: 16, fontWeight: 600, lineHeight: 1.4, color: C.text, textDecoration: 'none', cursor: 'pointer' }}>{job.title}</a>
                          </div>
                          <StatusTag tone={st.tone}>{st.label}</StatusTag>
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: G.xs, marginTop: G.md }}>
                          {job.location && <StatusTag>{job.location}</StatusTag>}
                          {job.type && <StatusTag>{job.type}</StatusTag>}
                          <StatusTag>{isSalaryNegotiable(job) ? L('협의 가능', 'Negotiable') : `${Math.round(job.salary_min/1e6)}–${Math.round(job.salary_max/1e6)}M`}</StatusTag>
                          {job.source === 'company_self' && <StatusTag tone="info">{L('기업등록', 'Company')}</StatusTag>}
                          {job.source === 'ktc' && <StatusTag tone="info">KTC</StatusTag>}
                          {job.is_featured && <StatusTag tone="primary">{L('프리미엄', 'Premium')}</StatusTag>}
                        </div>
                        {job.source === 'company_self' && (
                          <div style={{ fontSize: 12, color: C.faint, marginTop: G.sm }}>
                            {job.account_company && <>{L('계정', 'Account')} {job.account_company} · </>}{job.poster_email || L('등록자 미상', 'Unknown poster')} · {fmtDate(job.created_at)}
                          </div>
                        )}
                        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: G.sm, marginTop: G.lg, paddingTop: G.lg, borderTop: `1px solid ${C.line}` }}>
                          {job.status === 'pending_review' && (
                            <>
                              <PrimaryButton size="small" label={L('승인', 'Approve')} onClick={() => handleApprove(job)} />
                              <SecondaryButton size="small" label={L('반려', 'Reject')} onClick={() => handleReject(job)} />
                            </>
                          )}
                          <SecondaryButton size="small" label={L('수정', 'Edit')} loading={editLoadingId === job.id} disabled={!!editLoadingId} onClick={() => startEdit(job)} />
                          {job.status !== 'pending_review' && (
                            <SecondaryButton size="small" onClick={() => handleToggleFeatured(job)} title={L('적극 채용 중 섹션 노출 토글', 'Toggle “Actively hiring” placement')}
                              label={job.is_featured ? L('프리미엄 해제', 'Remove premium') : L('프리미엄', 'Premium')} />
                          )}
                          {job.status !== 'pending_review' && (
                            <SecondaryButton size="small" label={job.is_active ? L('비노출', 'Hide') : L('노출', 'Show')} onClick={() => handleToggle(job)} />
                          )}
                          <div style={{ marginLeft: 'auto' }}>
                            <GhostButton size="small" label={L('삭제', 'Delete')} onClick={() => handleDelete(job.id)} />
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                  </div>
                  {sorted.length > jobsVisible && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: G.sm, marginTop: G.xl }}>
                      <SecondaryButton
                        label={L(`${Math.min(JOBS_PAGE, sorted.length - jobsVisible)}건 더 보기`, `Show ${Math.min(JOBS_PAGE, sorted.length - jobsVisible)} more`)}
                        onClick={() => setJobsVisible(v => v + JOBS_PAGE)} />
                      <span style={{ fontSize: 12, color: C.faint, fontVariantNumeric: 'tabular-nums' }}>{Math.min(jobsVisible, sorted.length).toLocaleString()} / {sorted.length.toLocaleString()}</span>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        )}

        {/* KTC 랜딩 공고 관리 (별도 Supabase 크로스 관리) */}
        {tab === 'ktc-landing' && (
          <KtcLandingJobsView token={token} lang={globalLang === 'ko' || globalLang === 'vi' ? globalLang : 'en'} />
        )}

        {/* 캠페인 링크 — 광고용 공고 묶음 /l/<slug> (job_collections) */}
        {tab === 'collections' && (
          <JobCollectionsView token={token} lang={globalLang === 'ko' || globalLang === 'vi' ? globalLang : 'en'} />
        )}

        {/* KPI TAB (기업/채용 지표 요약) */}
        {tab === 'kpi' && (
          <div>
            <SectionTitle>{L('기업·채용 지표', 'Company & hiring metrics')}</SectionTitle>
            {!kpi && <State kind="loading">{L('불러오는 중...', 'Loading…')}</State>}
            {kpi && (() => {
              const fc = kpi.forCompanies
              return (
                <>
                  <StatGrid style={{ marginBottom: G.xl + G.sm }}>
                    <StatTile label={L('가입 회사', 'Companies')} value={fmtN(kpi.companies)} sub={L(`멤버 ${fmtN(kpi.members)}명`, `${fmtN(kpi.members)} members`)} />
                    <StatTile label={L('기업 등록 공고', 'Company-posted jobs')} value={fmtN(kpi.jobs.companySelf)} sub={L(`크롤 ${fmtN(kpi.jobs.crawled)} · 전체 ${fmtN(kpi.jobs.total)}`, `crawled ${fmtN(kpi.jobs.crawled)} · total ${fmtN(kpi.jobs.total)}`)} />
                    <StatTile label={L('승인 대기', 'Pending')} value={fmtN(kpi.jobs.pending)} sub={L(`노출중 ${fmtN(kpi.jobs.live)}`, `${fmtN(kpi.jobs.live)} live`)} />
                    <StatTile label={L('총 지원', 'Total applications')} value={fmtN(kpi.applications.total)} />
                  </StatGrid>
                  <SectionTitle sub={L('for-companies는 페이지뷰 이벤트를 계측하지 않아 진입은 nav 클릭 기준입니다. 문의 리드는 Slack으로 전송됩니다.', 'for-companies pageviews aren’t tracked — “enter” counts nav clicks. Contact leads are sent to Slack.')}>
                    {L('for-companies 퍼널', 'for-companies funnel')}
                  </SectionTitle>
                  <TableCard minWidth={480}>
                    <thead><tr>
                      <th style={T.th}>{L('단계', 'Step')}</th>
                      <th style={T.thNum}>{L('전체', 'All')}</th>
                      <th style={T.thNum}>{L('30일', '30d')}</th>
                      <th style={T.thNum}>{L('7일', '7d')}</th>
                    </tr></thead>
                    <tbody>
                      {[[L('진입(nav 클릭)', 'Enter (nav click)'), fc.enter], [L('공고 등록 클릭', 'Post-job click'), fc.postJob], [L('문의 클릭', 'Contact click'), fc.contact]].map(([label, m]) => (
                        <tr key={label}>
                          <td style={{ ...T.td, fontWeight: 600 }}>{label}</td>
                          <td style={{ ...T.tdNum, fontWeight: 600 }}>{fmtN(m.all)}</td>
                          <td style={T.tdNum}>{fmtN(m.d30)}</td>
                          <td style={T.tdNum}>{fmtN(m.d7)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </TableCard>
                </>
              )
            })()}
          </div>
        )}

        {/* COMPANIES TAB (가입 회사 계정 + 인증) */}
        {tab === 'companies' && (
          <div>
            <SectionTitle sub={L('공고를 등록할 수 있는 기업 계정입니다. 인증(verified) 상태를 관리합니다.', 'Company accounts that can post jobs. Manage their verified status here.')}>
              {L('가입 회사 계정', 'Company accounts')} {count(companies.length)}
            </SectionTitle>

            {/* 계정 발급 — Google 안 되는 회사용 이메일/비번 로그인 계정 생성 */}
            <Card style={{ marginBottom: G.md }}>
              <SectionTitle sub={L('이메일/비밀번호 로그인 계정을 만들어 자격증명을 고객에게 전달합니다. gmail 등 개인 메일도 가능합니다(계정별 독립 회사).', 'Create an email/password login account and hand the credentials to the customer. Personal emails like gmail are fine (each becomes its own company).')}>
                {L('계정 발급', 'Issue account')}
              </SectionTitle>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: G.sm, alignItems: 'center' }}>
                <div style={{ flex: '1 1 200px', minWidth: 0 }}>
                  <Field inputType="email" placeholder={L('로그인 이메일', 'Login email')} value={acct.email}
                    onChange={e => setAcct({ ...acct, email: e.target.value })} />
                </div>
                <div style={{ flex: '1 1 200px', minWidth: 0 }}>
                  <Field placeholder={L('회사명(표시)', 'Company name (display)')} value={acct.companyName}
                    onChange={e => setAcct({ ...acct, companyName: e.target.value })} />
                </div>
                <div style={{ flex: '1 1 160px', minWidth: 0 }}>
                  <Field placeholder={L('담당자명(선택)', 'Contact name (optional)')} value={acct.contactName}
                    onChange={e => setAcct({ ...acct, contactName: e.target.value })} />
                </div>
                <PrimaryButton onClick={handleIssueAccount}
                  disabled={acctIssuing || !acct.email.includes('@') || !acct.companyName.trim()}
                  label={acctIssuing ? L('발급 중…', 'Issuing…') : L('계정 발급', 'Issue account')} />
              </div>
            </Card>

            {acctResult && (
              <Card style={{ marginBottom: G.md }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: G.sm, flexWrap: 'wrap', marginBottom: G.md }}>
                  <StatusTag tone="success">{acctResult.reused ? L('비밀번호 재설정', 'Password reset') : L('발급 완료', 'Issued')}</StatusTag>
                  <span style={{ fontSize: 13, color: C.sub }}>
                    {acctResult.reused
                      ? L('기존 계정의 비밀번호를 재설정했습니다. 아래 정보를 전달해 주세요.', 'Existing account password reset — share the details below.')
                      : L('아래 정보를 고객에게 전달해 주세요.', 'Hand the details below to the customer.')}
                  </span>
                </div>
                <div style={{ ...mono, lineHeight: 1.7, userSelect: 'all', color: C.text, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 4, padding: `${G.md}px ${G.lg}px`, overflowWrap: 'anywhere' }}>
                  <div>URL: {acctResult.url}</div>
                  <div>{L('이메일', 'Email')}: {acctResult.email}</div>
                  <div>{L('비밀번호', 'Password')}: <b>{acctResult.password}</b></div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: G.sm, flexWrap: 'wrap', marginTop: G.md }}>
                  <SecondaryButton size="small" label={L('복사', 'Copy')}
                    onClick={() => { navigator.clipboard.writeText(`URL: ${acctResult.url}\n${L('이메일', 'Email')}: ${acctResult.email}\n${L('비밀번호', 'Password')}: ${acctResult.password}`); flash(L('복사했습니다', 'Copied')) }} />
                  <GhostButton size="small" label={L('닫기', 'Close')} onClick={() => setAcctResult(null)} />
                  <span style={{ fontSize: 12, color: C.faint }}>{L('비밀번호는 지금만 표시됩니다. 닫으면 다시 볼 수 없습니다.', 'The password is shown only now. Once you close this, it cannot be viewed again.')}</span>
                </div>
              </Card>
            )}

            <TableCard minWidth={720}>
              <thead><tr>
                <th style={T.th}>{L('회사 · 도메인', 'Company · Domain')}</th>
                <th style={T.th}>{L('인증', 'Verified')}</th>
                <th style={T.thNum}>{L('멤버', 'Members')}</th>
                <th style={T.thNum}>{L('공고', 'Jobs')}</th>
                <th style={T.thNum}>{L('노출중', 'Live')}</th>
                <th style={T.th}>{L('가입일', 'Joined')}</th>
                <th style={T.th}></th>
              </tr></thead>
              <tbody>
                {companies.map(c => (
                  <tr key={c.id}>
                    <td style={T.td}>
                      <div style={{ fontWeight: 600 }}>{c.name}</div>
                      <div style={{ fontSize: 12, color: C.sub, marginTop: 2, overflowWrap: 'anywhere' }}>{c.email_domain || L('도메인 없음', 'no domain')}</div>
                    </td>
                    <td style={T.td}>
                      {c.verified_at
                        ? <StatusTag tone="success">{L('인증됨', 'Verified')}</StatusTag>
                        : <StatusTag tone="neutral">{L('미인증', 'Unverified')}</StatusTag>}
                    </td>
                    <td style={T.tdNum}>{c.member_count}</td>
                    <td style={T.tdNum}>{c.job_count}</td>
                    <td style={T.tdNum}>{c.live_count}</td>
                    <td style={{ ...T.tdSub, whiteSpace: 'nowrap' }}>{c.created_at ? new Date(c.created_at).toLocaleDateString() : '-'}</td>
                    <td style={T.tdAction}>
                      <SecondaryButton size="small" label={c.verified_at ? L('인증 해제', 'Unverify') : L('인증하기', 'Verify')} onClick={() => handleToggleVerify(c)} />
                    </td>
                  </tr>
                ))}
                {companies.length === 0 && <tr><td colSpan={7} style={{ ...T.td, textAlign: 'center', color: C.faint, padding: 32 }}>{L('가입한 회사가 없습니다', 'No companies yet')}</td></tr>}
              </tbody>
            </TableCard>
          </div>
        )}

        {/* ADMINS TAB */}
        {tab === 'admins' && (
          <div>
            <SectionTitle sub={L('어드민에 접근할 수 있는 계정입니다.', 'Accounts that can access this admin.')}>
              {L('관리자 계정', 'Admin users')} {count(admins.length)}
            </SectionTitle>

            {/* Add new admin */}
            <Card padding={G.lg} style={{ marginBottom: G.md }}>
              <div style={{ display: 'flex', gap: G.sm, alignItems: 'center' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Field
                    inputType="email"
                    placeholder="email@example.com"
                    value={newAdminEmail}
                    onChange={e => setNewAdminEmail(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) handleAddAdmin() }}
                  />
                </div>
                <PrimaryButton label={L('관리자 추가', 'Add admin')} onClick={handleAddAdmin} disabled={!newAdminEmail.includes('@')} />
              </div>
            </Card>

            {/* Admin list */}
            <TableCard minWidth={560}>
              <thead><tr>
                <th style={T.th}>{L('이메일', 'Email')}</th>
                <th style={T.th}>{L('추가한 사람', 'Added by')}</th>
                <th style={T.th}>{L('추가일', 'Added')}</th>
                <th style={T.th}></th>
              </tr></thead>
              <tbody>
                {admins.map(a => (
                  <tr key={a.id}>
                    <td style={{ ...T.td, fontWeight: 600 }}>{a.email}</td>
                    <td style={T.tdSub}>{a.added_by || L('시스템', 'system')}</td>
                    <td style={{ ...T.tdSub, whiteSpace: 'nowrap' }}>{new Date(a.created_at).toLocaleDateString()}</td>
                    <td style={T.tdAction}>
                      {a.email !== currentEmail ? (
                        <GhostButton size="small" label={L('삭제', 'Remove')} onClick={() => handleRemoveAdmin(a.email)} />
                      ) : (
                        <StatusTag tone="neutral">{L('본인', 'You')}</StatusTag>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </TableCard>
          </div>
        )}
      </div>
      </AdminLayout>
    </>
  )
}

function F({ label, value, set, type = 'text', disabled = false }) {
  return <Field title={label} inputType={type} value={value || ''} onChange={e => set(e.target.value)} disabled={disabled} />
}
const LINE = 'var(--color-gray-300, #D1D6DC)' // DS 입력 테두리 — 업로드 점선 박스를 입력창과 같은 선 색으로
const S = {
  center: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: "-apple-system, 'Helvetica Neue', Arial, sans-serif" },
  shell: { maxWidth: 900, margin: '0 auto', padding: '24px 20px 60px' },
  // 새 공고 탭은 fixed 패널(zIndex 30/31)이 화면을 덮으므로 플래시도 fixed 토스트로 띄운다
  flash: { position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)', zIndex: 200, maxWidth: '80vw', background: C.text, color: '#fff', fontSize: 13, fontWeight: 600, lineHeight: 1.5, padding: `${G.sm}px ${G.lg}px`, borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.16)' },
}
