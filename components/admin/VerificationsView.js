import { useState } from 'react'
import UserAssetCards from './UserAssetCards'
import { useAdmin } from '../../lib/adminSwr'
import { getSalaryTier, normalizeTrieu } from '../../lib/salaryTiers'
import { RiFileTextLine, RiUserLine } from '@remixicon/react'
import { G, C, ellipsis, num, PrimaryButton, SecondaryButton, Field, FilterTabs, StatusTag, Card, State } from './ui'

const STATUS = {
  pending:  { ko: '검토 대기', en: 'Pending',  vi: 'Chờ duyệt',   tone: 'warning' },
  approved: { ko: '승인됨',   en: 'Approved', vi: 'Đã duyệt',    tone: 'success' },
  rejected: { ko: '반려됨',   en: 'Rejected', vi: 'Đã từ chối',  tone: 'error' },
}

const DOC_LABELS = {
  payslip:    { ko: '급여명세서',      en: 'Payslip',                 vi: 'Phiếu lương' },
  contract:   { ko: '근로계약서',      en: 'Employment contract',     vi: 'Hợp đồng lao động' },
  tax_return: { ko: '원천징수영수증',  en: 'Tax withholding receipt', vi: 'Chứng từ khấu trừ thuế' },
  other:      { ko: '기타',           en: 'Other',                   vi: 'Khác' },
}

export default function VerificationsView({ token, lang }) {
  const vi = lang === 'vi'
  const ko = !vi && lang !== 'en'
  const lk = vi ? 'vi' : ko ? 'ko' : 'en' // {ko,en,vi} 딕셔너리 조회 키
  const L = vi ? {
    needSalary: 'Cần nhập lương tháng (triệu VND) để duyệt.',
    loading: 'Đang tải…', empty: 'Không có yêu cầu', all: 'Tất cả',
    docType: 'Loại giấy tờ', salary: 'Lương tháng', requested: 'Ngày yêu cầu',
    viewDoc: 'Xem giấy tờ chứng minh', salaryPh: 'Lương xác minh', unit: 'triệu VND',
    approve: 'Duyệt', reject: 'Từ chối',
  } : ko ? {
    needSalary: '월급(백만 VND)을 입력해야 승인할 수 있습니다.',
    loading: '불러오는 중…', empty: '요청이 없습니다', all: '전체',
    docType: '서류 종류', salary: '월급', requested: '요청일',
    viewDoc: '증빙 서류 보기', salaryPh: '인증 월급', unit: '백만 VND',
    approve: '승인', reject: '반려',
  } : {
    needSalary: 'Enter the monthly salary (million VND) to approve.',
    loading: 'Loading…', empty: 'No requests', all: 'All',
    docType: 'Document', salary: 'Salary', requested: 'Requested',
    viewDoc: 'View document', salaryPh: 'Verified salary', unit: 'M VND',
    approve: 'Approve', reject: 'Reject',
  }
  const locale = vi ? 'vi-VN' : ko ? 'ko-KR' : 'en-US'
  const [filter, setFilter] = useState('pending')
  const [actionLoading, setActionLoading] = useState(null)
  const [salaryInput, setSalaryInput] = useState({}) // per-id, monthly in 백만 VND (triệu)

  const { data, isLoading: loading, mutate } = useAdmin(
    `/api/salary-verification/admin?status=${filter}`,
    token,
    {
      onSuccess: ({ verifications: list }) => {
        // Prefill the salary input with the user-submitted amount, expected in
        // 백만 VND (triệu). normalizeTrieu coerces a raw-VND amount typed by
        // mistake (e.g. 50000000) back into triệu so the prefill — and any
        // approval taken from it — uses the correct unit.
        setSalaryInput(prev => {
          const next = { ...prev }
          list.forEach(v => {
            if (next[v.id] === undefined && v.salary_amount) next[v.id] = String(normalizeTrieu(v.salary_amount))
          })
          return next
        })
      },
    }
  )
  const verifications = data?.verifications || []

  const handleAction = async (id, status) => {
    // Approval requires an admin-entered monthly salary in 백만 VND (triệu). Sent as-is;
    // stored on the verification row in triệu, converted to VND for the badge tier server-side.
    let salaryTrieu = null
    if (status === 'approved') {
      const trieu = normalizeTrieu(parseInt(salaryInput[id], 10))
      if (!trieu || trieu <= 0) {
        alert(L.needSalary)
        return
      }
      salaryTrieu = trieu
    }
    setActionLoading(id)
    try {
      const res = await fetch('/api/salary-verification/admin', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id, status, admin_note: '', salary_amount: salaryTrieu }),
      })
      if (res.ok) {
        mutate(prev => ({ ...prev, verifications: (prev?.verifications || []).filter(v => v.id !== id) }), false)
      }
    } catch (e) {
      console.error(e)
    }
    setActionLoading(null)
  }

  const FILTERS = [['pending', STATUS.pending[lk]], ['approved', STATUS.approved[lk]], ['rejected', STATUS.rejected[lk]], ['all', L.all]]

  return (
    <div style={{ paddingBottom: 40 }}>
      <UserAssetCards token={token} keys={['verifiedWorkers', 'approvedVerifications']} lang={lang} />

      <div style={{ marginBottom: G.lg }}>
        <FilterTabs value={filter} onChange={setFilter} items={FILTERS.map(([value, label]) => ({ value, label }))} />
      </div>

      {loading ? (
        <State kind="loading">{L.loading}</State>
      ) : verifications.length === 0 ? (
        <State kind="empty" title={L.empty} />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: G.md, alignItems: 'start' }}>
          {verifications.map(v => {
            const st = STATUS[v.status] || STATUS.pending
            return (
            <Card key={v.id}>
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: G.md, marginBottom: G.lg }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: G.sm, minWidth: 0 }}>
                  {v.profile?.photo_url ? (
                    <img src={v.profile.photo_url} style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} alt="" />
                  ) : (
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: C.line, color: C.faint, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <RiUserLine size={16} />
                    </div>
                  )}
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: C.text, lineHeight: 1.4, ...ellipsis }}>{v.profile?.full_name || 'Unknown'}</div>
                    <div style={{ fontSize: 12, color: C.sub, lineHeight: 1.4, ...ellipsis }}>{v.profile?.verified_company_name || '-'}</div>
                  </div>
                </div>
                <StatusTag tone={st.tone}>{st[lk]}</StatusTag>
              </div>

              {/* Details */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: G.sm, marginBottom: G.lg }}>
                {[
                  [L.docType, (DOC_LABELS[v.document_type] && DOC_LABELS[v.document_type][lk]) || v.document_type],
                  [L.salary, v.salary_amount ? `${normalizeTrieu(v.salary_amount).toLocaleString()}M VND` : '-'],
                  [L.requested, new Date(v.created_at).toLocaleDateString(locale)],
                ].map(([label, val]) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: G.sm, fontSize: 13, lineHeight: 1.4 }}>
                    <span style={{ color: C.sub }}>{label}</span>
                    <span style={{ color: C.text, fontWeight: 600, textAlign: 'right', ...num }}>{val}</span>
                  </div>
                ))}
              </div>

              {/* Document Link */}
              <SecondaryButton size="small" prefixIcon={<RiFileTextLine size={14} />} label={L.viewDoc}
                onClick={() => window.open(v.document_url, '_blank', 'noopener,noreferrer')} />

              {/* Admin Actions */}
              {v.status === 'pending' && (() => {
                const trieu = normalizeTrieu(parseInt(salaryInput[v.id], 10))
                const tier = trieu > 0 ? getSalaryTier(trieu * 1000000) : null
                return (
                <div style={{ borderTop: `1px solid ${C.line}`, marginTop: G.lg, paddingTop: G.lg }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: G.sm, marginBottom: G.sm, flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: 120 }}>
                      <Field inputType="number" value={salaryInput[v.id] || ''} onChange={e => setSalaryInput(prev => ({ ...prev, [v.id]: e.target.value }))}
                        placeholder={L.salaryPh} suffixUnit={<span style={{ whiteSpace: 'nowrap', fontSize: 13, color: C.faint }}>{L.unit}</span>} />
                    </div>
                    {tier && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: C.body, whiteSpace: 'nowrap' }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: tier.color, flexShrink: 0 }} />
                        {ko ? tier.defaultLabel : tier.enLabel}
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: G.sm }}>
                    <PrimaryButton label={L.approve} disabled={actionLoading === v.id} style={{ width: '100%' }}
                      onClick={() => handleAction(v.id, 'approved')} />
                    <SecondaryButton label={L.reject} disabled={actionLoading === v.id} style={{ width: '100%' }}
                      onClick={() => handleAction(v.id, 'rejected')} />
                  </div>
                </div>
                )
              })()}

              {/* Reviewer info */}
              {v.status !== 'pending' && v.reviewed_by && (
                <div style={{ fontSize: 12, color: C.faint, marginTop: G.lg, paddingTop: G.md, borderTop: `1px solid ${C.line}`, lineHeight: 1.5 }}>
                  {v.reviewed_by} · {v.reviewed_at ? new Date(v.reviewed_at).toLocaleString(locale) : ''}{v.admin_note && ` · ${v.admin_note}`}
                </div>
              )}
            </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
