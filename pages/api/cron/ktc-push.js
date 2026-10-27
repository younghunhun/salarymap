// FYI 지원자 → ktc-support 파이프라인 유입 + 스크리닝 트리거 (15분 주기).
// 일일 ktc-sync(07:30·15:00 KST)만으로는 그 사이 게재된 공고의 지원자가 다음 날 아침까지
// ktc-support 에 안 들어가 스크리닝이 멈춘다 (2026-10-27 R225·R226·R227 실사례).
// 시트 FYI 탭 append·시트 동기화 등 무거운 단계는 ktc-sync 에 그대로 두고, 여기선 유입과 스크리닝만.
// Vercel cron이 Authorization: Bearer ${CRON_SECRET} 헤더로 호출 (ktc-sync.js와 동일).
import { pushFyiToKtc, syncKtcJobCodes, triggerFyiScreening } from '../../../lib/ktcCandidatesSync'

export const config = { maxDuration: 120 }

export default async function handler(req, res) {
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    // 코드 백필이 유입보다 먼저 — 코드 없이 들어간 지원 건은 JD 매칭이 안 돼 스크리닝에서 빠진다 (ktc-sync.js 와 같은 순서)
    let jobCodes = null
    if (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL) {
      try { jobCodes = await syncKtcJobCodes() } catch (e) { console.error('syncKtcJobCodes:', e.message) }
    }
    // 증분: 최근 3일 지원 건만 (전체 스캔·누락 보정은 일일 ktc-sync 가 한다)
    const push = await pushFyiToKtc({ since: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString() })
    const screening = await triggerFyiScreening({ since: new Date(Date.now() - 24 * 3600 * 1000).toISOString() })
    res.json({ ok: true, jobCodes: jobCodes ? jobCodes.set : null, fyiPushed: push.pushed, screening })
  } catch (e) {
    console.error('ktc-push:', e)
    res.status(500).json({ error: e.message })
  }
}
