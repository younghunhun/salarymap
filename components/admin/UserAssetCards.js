import { useAdmin } from '../../lib/adminSwr'
import { G, SectionTitle, StatGrid, StatTile } from './ui'

// 전체(web+app) 유저 자산·관계 누적 카드. 구 KPI 트래커에서 이관, 결 맞는 탭에 분산 배치.
// keys 로 표시할 지표만 골라 렌더한다.
const METRICS = {
  userFollows: { ko: '유저 팔로우', en: 'User follows', vi: 'Lượt theo dõi người dùng' },
  subscriptions: { ko: '구독 (기업)', en: 'Subscriptions (company)', vi: 'Đăng ký nhận tin (công ty)' },
  verifiedWorkers: { ko: '재직 인증', en: 'Employment verified', vi: 'Xác minh đang làm việc' },
  approvedVerifications: { ko: '승인 완료', en: 'Approved', vi: 'Đã duyệt' },
  resumeHolders: { ko: '이력서 등록', en: 'Resumes registered', vi: 'CV đã đăng ký' },
  resumePublic: { ko: '이력서 공개', en: 'Resumes public', vi: 'CV công khai' },
}

export default function UserAssetCards({ token, keys, title, lang }) {
  const L = (ko, en, vi) => (lang === 'vi' ? (vi ?? en) : lang === 'ko' ? ko : en)
  const { data: assets } = useAdmin('/api/admin/user-assets', token)
  if (!assets) return null
  const heading = title || L('유저 자산 · 관계', 'User assets · relations', 'Tài sản · quan hệ người dùng')
  return (
    <div style={{ marginBottom: G.xl }}>
      <SectionTitle sub={L('전체(web+app) 누적', 'All (web+app) cumulative', 'Lũy kế toàn bộ (web+app)')}>{heading}</SectionTitle>
      <StatGrid>
        {keys.map((k) => {
          const m = METRICS[k]
          const v = assets[k]
          return <StatTile key={k} label={m[lang] || m.ko} value={v != null ? v.toLocaleString() : '-'} />
        })}
      </StatGrid>
    </div>
  )
}
