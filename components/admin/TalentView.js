import { useRouter } from 'next/router'
import { TabGroup } from '@likelion-design/ui'
import { useAdmin } from '../../lib/adminSwr'
import TalentPoolView, { topTierOf, isOverseasR } from './TalentPoolView'
import TalentSupplyView from './TalentSupplyView'
import TalentQualityView from './TalentQualityView'

// 인재 — 인재풀(명단)·인재 공급(직군 구성)·인재 퀄리티(분포) 세 탭을 한 페이지로 합친 컨테이너(10/6).
// 위에 공통 요약 한 줄(프로필 → 이력서 → 활성 · 공개 · 명문대 · 해외 · 한국어)을 항상 두고,
// 아래는 알약으로 전환한다. 세 뷰가 각자 찍던 합계 타일은 여기로 올라와 중복이 없다.
// URL ?sub= 로 알약 상태를 보존해 새로고침·공유 시 같은 화면이 뜬다.
//
// 숫자 기준: 프로필·활성은 /api/admin/talent-supply(전체 프로필 기준), 이력서·공개·학교·한국어는
// /api/admin/resumes(블랙리스트·내부 계정 제외 — 명단과 같은 모집단). 명단 건수와 요약이 같아야 해서
// 이력서 수는 resumes 쪽을 쓴다(talent-supply 의 resumeHolders 와 블랙리스트만큼 차이).

const SUBS = [
  { key: 'pool', label: ['명단', 'People', 'Danh sách'] },
  { key: 'supply', label: ['직군 구성', 'Role mix', 'Cơ cấu ngành'] },
  { key: 'quality', label: ['퀄리티 분포', 'Quality', 'Chất lượng'] },
]

export default function TalentView({ token, lang }) {
  const router = useRouter()
  const ko = lang === 'ko'
  const L = (k, e, v) => (lang === 'vi' ? (v ?? e) : ko ? k : e)
  const sub = SUBS.some(s => s.key === router.query.sub) ? router.query.sub : 'pool'
  const setSub = (key) => router.replace({ pathname: router.pathname, query: { ...router.query, sub: key } }, undefined, { shallow: true, scroll: false })

  const { data: resumes } = useAdmin('/api/admin/resumes', token)
  const { data: supply } = useAdmin('/api/admin/talent-supply', token)
  const loaded = Array.isArray(resumes) // 로딩 중엔 0 이 아니라 '–' 로 — 0명/0% 로 읽히지 않게
  const pool = loaded ? resumes : []
  const totals = supply?.totals

  const publicN = pool.filter(r => r.is_resume_public).length
  const topN = pool.filter(topTierOf).length
  const overseasN = pool.filter(isOverseasR).length
  const koreanN = pool.filter(r => (r.korean_cert || '').trim()).length
  const pct = (n, d) => (d > 0 ? Math.round((n / d) * 100) : 0)
  const num = (n) => (n === undefined || n === null ? '–' : n.toLocaleString())
  const poolNum = (n) => (loaded ? num(n) : '–')
  const poolPct = (n) => (loaded ? `${pct(n, pool.length)}%` : null)

  const Stat = ({ label, value, sub: subTxt, strong }) => (
    <div style={{ minWidth: 0 }}>
      <div style={{ fontSize: 11.5, fontWeight: 600, color: '#8B95A1', marginBottom: 2, whiteSpace: 'nowrap' }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 800, color: strong ? '#ff6000' : '#0F172A', lineHeight: 1.1, whiteSpace: 'nowrap' }}>
        {value}{subTxt && <span style={{ fontSize: 12, fontWeight: 600, color: '#9CA3AF', marginLeft: 5 }}>{subTxt}</span>}
      </div>
    </div>
  )
  const Arrow = () => <span style={{ color: '#CBD5E1', fontSize: 16, alignSelf: 'flex-end', paddingBottom: 3 }}>→</span>
  const Sep = () => <span style={{ width: 1, alignSelf: 'stretch', background: '#EEF0F2', margin: '0 4px' }} />

  return (
    <div style={{ paddingBottom: 40 }}>
      {/* 요약 줄 — 세 뷰가 공유하는 합계. 퍼널(프로필→이력서→활성) | 공개 | 학교 | 한국어 */}
      <div className="adm-m-scroll" style={{ background: '#fff', border: '1px solid #EEF0F2', borderRadius: 14, padding: '14px 18px', marginBottom: 16, display: 'flex', alignItems: 'flex-end', gap: 20, flexWrap: 'nowrap', overflowX: 'auto' }}>
        <Stat label={L('전체 프로필', 'Profiles', 'Hồ sơ')} value={num(totals?.profiles)} />
        <Arrow />
        <Stat label={L('이력서 보유', 'Resumes', 'Có CV')} value={poolNum(pool.length)} sub={loaded && totals ? `${pct(pool.length, totals.profiles)}%` : null} />
        <Arrow />
        <Stat label={L('활성 (7일 방문·지원·반복)', 'Active (7d visit · applied · repeat)', 'Hoạt động')} value={num(totals?.activeResume)} sub={totals ? `${pct(totals.activeResume, totals.resumeHolders)}%` : null} strong />
        <Sep />
        <Stat label={L('공개 이력서', 'Public', 'Công khai')} value={poolNum(publicN)} sub={poolPct(publicN)} />
        <Sep />
        <Stat label={L('명문대', 'Top school', 'Trường top')} value={poolNum(topN)} sub={poolPct(topN)} />
        <Stat label={L('해외 학교', 'Overseas', 'Nước ngoài')} value={poolNum(overseasN)} sub={poolPct(overseasN)} />
        <Stat label={L('한국어 기재', 'Korean stated', 'Có T.Hàn')} value={poolNum(koreanN)} sub={poolPct(koreanN)} />
      </div>

      {/* 섹션 전환 — 텍스트 탭(밑줄). 명단 안의 모드 전환이 알약이라 같은 모양이 두 줄 쌓이지 않게 구분한다. */}
      <div style={{ marginBottom: 20, borderBottom: '1px solid #E5E7EA' }}>
        <TabGroup type="text" size="medium" value={sub} onChange={setSub}
          items={SUBS.map(s => ({ value: s.key, label: lang === 'vi' ? s.label[2] : ko ? s.label[0] : s.label[1] }))} />
      </div>

      {sub === 'pool' && <TalentPoolView token={token} lang={lang} />}
      {sub === 'supply' && <TalentSupplyView token={token} lang={lang} />}
      {sub === 'quality' && <TalentQualityView token={token} lang={lang} />}
    </div>
  )
}
