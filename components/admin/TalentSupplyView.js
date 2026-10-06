import { useState } from 'react'
import { RiDownloadLine, RiArrowDownSLine, RiArrowRightSLine } from '@remixicon/react'
import { useAdmin } from '../../lib/adminSwr'
import { G, C, num, Card, SectionTitle, TableCard, T, StatusTag, SecondaryButton, GhostButton, State } from './ui'

// 인재 공급(Talent supply) — FYI 인재풀을 포지션(직군)으로 분해한 스냅샷.
// 기업 고객의 수요 포지션 대비 우리 공급이 어디에 몰려 있고 어디가 비었는지 매일 확인.
// 데이터: /api/admin/talent-supply (전체 프로필 → 이력서 → 활성, 직군별).

const GROUP_LABEL = {
  tech: { ko: '개발 직군', en: 'Tech', vi: 'Khối kỹ thuật' },
  product: { ko: '개발 직군', en: 'Tech', vi: 'Khối kỹ thuật' },
  nontech: { ko: '비개발 직군', en: 'Non-tech', vi: 'Khối phi kỹ thuật' },
  other: { ko: '미분류', en: 'Other', vi: 'Chưa phân loại' },
}
// 개발/비개발/미분류 색 — 공급 편중을 한눈에.
const GROUP_COLOR = { tech: '#2563EB', product: '#2563EB', nontech: '#0D9488', other: '#94A3B8' }

export default function TalentSupplyView({ token, lang }) {
  const ko = lang === 'ko'
  const L = (k, e, v) => (lang === 'vi' ? (v ?? e) : ko ? k : e)
  // API의 직군 항목(r.ko/r.en/r.vi) 표시 — vi 누락 시 en 폴백
  const catName = (r) => (lang === 'vi' ? (r.vi ?? r.en) : ko ? r.ko : r.en)
  const { data, isLoading } = useAdmin('/api/admin/talent-supply', token)
  const [showUncat, setShowUncat] = useState(false)

  if (isLoading || !data) return <State kind="loading">{L('불러오는 중…', 'Loading…', 'Đang tải…')}</State>
  if (data.error) return <State kind="error">{data.error}</State>

  const { totals, categories, unknown, split, uncategorized, language } = data
  const rows = [...categories]
  if (unknown.all > 0) rows.push({ key: '_unknown', ko: '포지션 미입력', en: 'No position', vi: 'Chưa nhập vị trí', group: 'other', ...unknown })
  const maxAll = Math.max(1, ...rows.map(r => r.all))
  const pct = (n, d) => (d > 0 ? Math.round((n / d) * 100) : 0)

  function downloadCsv() {
    const headers = ['Category', 'Group', 'All', 'Resume', 'Resume public', 'Korean', 'English', 'Active(resume)']
    const body = rows.map(r => [catName(r), GROUP_LABEL[r.group][lang], r.all, r.resume, r.resumePublic ?? '', r.korean ?? '', r.english ?? '', r.active])
    const csv = [headers, ...body].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `talent-supply-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  // 개발/비개발 공급 비중 (미분류 제외한 분모)
  const classified = split.tech.all + split.nontech.all
  const techPct = pct(split.tech.all, classified)
  const nontechPct = pct(split.nontech.all, classified)

  // 숫자 0 은 흐리게 — 빈 칸이 한눈에 보이도록
  const numCell = (n, on) => ({ ...T.tdNum, color: n > 0 ? (on || C.text) : C.faint })
  const segLabel = { color: '#fff', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', whiteSpace: 'nowrap', ...num }
  const legendDot = (color) => <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: color, marginRight: 6 }} />

  return (
    <div style={{ paddingBottom: 40 }}>
      {/* 개발 vs 비개발 공급 비중 — 수요·공급 갭 핵심 신호.
          제목·퍼널 타일(프로필→이력서→활성)은 TalentView 요약 줄로 올라갔고, 한국어/영어 타일은 퀄리티 분포와
          급간 기준이 달라 혼선을 줘서 뺐다(10/6 통합). 직군별 KO/EN 열은 유지. */}
      <Card style={{ marginBottom: G.xl }}>
        <SectionTitle
          sub={L('포지션을 입력한 인재 기준입니다.', 'Among members who declared a position.', 'Tính trên ứng viên đã khai vị trí.')}
          right={
            <span style={{ display: 'flex', alignItems: 'center', gap: G.md, fontSize: 13, color: C.sub, ...num }}>
              <span>{legendDot(GROUP_COLOR.tech)}{L('개발', 'Tech', 'Kỹ thuật')} <b style={{ color: C.text, fontWeight: 600 }}>{split.tech.all.toLocaleString()}</b></span>
              <span>{legendDot(GROUP_COLOR.nontech)}{L('비개발', 'Non-tech', 'Phi kỹ thuật')} <b style={{ color: C.text, fontWeight: 600 }}>{split.nontech.all.toLocaleString()}</b></span>
              <span>{legendDot(GROUP_COLOR.other)}{L('미분류', 'Other', 'Chưa phân loại')} <b style={{ color: C.text, fontWeight: 600 }}>{split.other.all.toLocaleString()}</b></span>
            </span>
          }
        >
          {L('공급 편중', 'Supply skew', 'Độ lệch cung')}
        </SectionTitle>
        <div style={{ display: 'flex', height: 24, borderRadius: 6, overflow: 'hidden', background: C.line }}>
          <div style={{ ...segLabel, width: `${techPct}%`, background: GROUP_COLOR.tech }}>{techPct >= 8 ? `${L('개발', 'Tech', 'Kỹ thuật')} ${techPct}%` : ''}</div>
          <div style={{ ...segLabel, width: `${nontechPct}%`, background: GROUP_COLOR.nontech }}>{nontechPct >= 8 ? `${L('비개발', 'Non-tech', 'Phi KT')} ${nontechPct}%` : ''}</div>
        </div>
        <div style={{ fontSize: 13, color: C.sub, marginTop: G.md, lineHeight: 1.5 }}>
          {L(
            `비개발 직군 공급은 전체의 ${nontechPct}%뿐입니다. 기업 수요가 비개발(예: HR·영업·마케팅) 포지션이면 해당 직군 인재 확보(메타 타겟팅)가 필요합니다.`,
            `Non-tech roles are only ${nontechPct}% of declared supply. If client demand is non-tech (e.g. HR/Sales/Marketing), acquire that segment (Meta targeting).`,
            `Nhóm phi kỹ thuật chỉ chiếm ${nontechPct}% nguồn cung. Nếu doanh nghiệp cần vị trí phi kỹ thuật (HR/Sales/Marketing), cần thu hút thêm nhóm này (Meta targeting).`
          )}
        </div>
      </Card>

      {/* 직군별 퍼널 테이블 */}
      <SectionTitle style={{ alignItems: 'center', marginBottom: G.md }}
        right={<SecondaryButton prefixIcon={<RiDownloadLine size={16} />} label={L('CSV 다운로드', 'Download CSV', 'Tải CSV')} onClick={downloadCsv} />}
      >
        {L('직군별 인재 수', 'Talent by role', 'Ứng viên theo nhóm ngành')}
      </SectionTitle>
      <TableCard minWidth={760}>
        <thead>
          <tr>
            <th style={T.th}>{L('직군', 'Role', 'Nhóm ngành')}</th>
            <th style={T.thNum}>{L('전체', 'All', 'Tổng')}</th>
            <th style={{ ...T.th, width: '32%' }}>{L('비중', 'Share', 'Tỷ trọng')}</th>
            <th style={T.thNum}>{L('이력서', 'Resume', 'CV')}</th>
            <th style={T.thNum}>{L('한국어', 'KO', 'T.Hàn')}</th>
            <th style={T.thNum}>{L('영어', 'EN', 'T.Anh')}</th>
            <th style={T.thNum}>{L('활성', 'Active', 'Hoạt động')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.key}>
              <td style={T.td}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: G.sm, whiteSpace: 'nowrap' }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: GROUP_COLOR[r.group], flexShrink: 0 }} />
                  <span style={{ fontWeight: 600 }}>{catName(r)}</span>
                  <span style={{ fontSize: 12, color: C.faint }}>{GROUP_LABEL[r.group][lang]}</span>
                </span>
              </td>
              <td style={{ ...T.tdNum, fontWeight: 600 }}>{r.all}</td>
              <td style={T.td}>
                <div style={{ display: 'flex', alignItems: 'center', gap: G.sm }}>
                  <div style={{ flex: 1, height: 8, background: C.line, borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ width: `${(r.all / maxAll) * 100}%`, height: '100%', background: GROUP_COLOR[r.group], borderRadius: 4 }} />
                  </div>
                  <span style={{ fontSize: 12, color: C.sub, width: 36, textAlign: 'right', flexShrink: 0, ...num }}>{pct(r.all, totals.profiles)}%</span>
                </div>
              </td>
              <td style={numCell(r.resume)}>{r.resume}</td>
              <td style={numCell(r.korean || 0)}>{r.korean || 0}</td>
              <td style={numCell(r.english || 0)}>{r.english || 0}</td>
              <td style={{ ...numCell(r.active, C.primary), fontWeight: 600 }}>{r.active}</td>
            </tr>
          ))}
        </tbody>
      </TableCard>

      {/* 미분류 원본 값 검수 */}
      {uncategorized.length > 0 && (
        <div style={{ marginTop: G.md }}>
          <GhostButton size="small" prefixIcon={showUncat ? <RiArrowDownSLine size={16} /> : <RiArrowRightSLine size={16} />}
            label={ko ? `미분류 원본 값 ${uncategorized.length}종` : `${uncategorized.length} ${L('', 'uncategorized raw values', 'giá trị gốc chưa phân loại')}`}
            onClick={() => setShowUncat(v => !v)} />
          {showUncat && (
            <div style={{ marginTop: G.sm, display: 'flex', flexWrap: 'wrap', gap: G.sm }}>
              {uncategorized.map(u => (
                <StatusTag key={u.value} tone="neutral">{u.value} <b style={{ color: C.text, fontWeight: 600, ...num }}>{u.count}</b></StatusTag>
              ))}
            </div>
          )}
        </div>
      )}

      <div style={{ fontSize: 12, color: C.faint, marginTop: G.lg, lineHeight: 1.6 }}>
        {L(
          '활성 = 최근 7일 방문 · 채용 지원 · 반복 방문(2일+) 중 하나(로그인 식별 이벤트 기준). 포지션 값은 자유입력이 섞여 휴리스틱으로 표준 직군에 매핑됩니다.',
          'Active = 7-day visit, job application, or repeat visit (2+ days), based on login-identified events. Position values are heuristically mapped to standard roles.',
          'Hoạt động = truy cập 7 ngày gần nhất · ứng tuyển · quay lại (2+ ngày), theo sự kiện đăng nhập. Giá trị vị trí được ánh xạ heuristic về nhóm ngành chuẩn.'
        )}
        {language && <> {L(
          `한국어/영어 = 이력서 AI 스캔(비공개 포함)·프로필 입력에서 해당 언어가 언급된 인원. 이력서에 안 쓴 능력은 못 잡습니다. 언어 스캔 완료 ${language.scanned}/${totals.resumeHolders} — 잔여는 대부분 이미지 PDF.`,
          `Korean/English = candidates whose resume scan (incl. private) or profile mentions the language; unstated skills are not captured. Scanned ${language.scanned}/${totals.resumeHolders} resumes — the rest are mostly image PDFs.`,
          `Tiếng Hàn/Anh = ứng viên có đề cập ngôn ngữ trong CV (kể cả CV riêng tư) hoặc hồ sơ; kỹ năng không ghi sẽ không được tính. Đã quét ${language.scanned}/${totals.resumeHolders} CV — phần còn lại chủ yếu là PDF dạng ảnh.`
        )}</>}
      </div>
    </div>
  )
}
