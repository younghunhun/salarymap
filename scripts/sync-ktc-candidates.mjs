// ktc-support Supabase candidates → salarymap ktc_candidates 동기화. idempotent (upsert).
// 로직은 lib/ktcCandidatesSync.js 공유 (어드민 KTC 소싱 탭의 동기화 버튼과 동일).
//   node scripts/sync-ktc-candidates.mjs [--sheets]   (--sheets: ktc-support 시트→DB 동기화까지 먼저 실행)
import { readFileSync } from 'node:fs';

// lib 이 모듈 로드 시 process.env 를 읽으므로 먼저 .env.local 주입
for (const line of readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split('\n')) {
  const i = line.indexOf('=');
  if (i > 0 && !line.trim().startsWith('#')) {
    const k = line.slice(0, i).trim();
    if (!(k in process.env)) process.env[k] = line.slice(i + 1).trim().replace(/^"|"$/g, '');
  }
}

const { triggerSheetSync, syncKtcCandidates, syncKtcApplications, syncKtcHires, pushFyiToKtc, appendFyiToSheet, syncKtcJobCodes } = await import('../lib/ktcCandidatesSync.js');

// 새 공고에 코드부터 붙인다 — 코드 없이 유입된 지원 건은 ktc-support 가 JD 매칭을 못 한다 (크론과 동일 순서)
if (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL) {
  const codes = await syncKtcJobCodes();
  console.log(`✓ 공고코드 백필: 신규 ${codes.set}건 (모호 ${codes.ambiguous.length}, 충돌 ${codes.conflicts.length})`);
}

// FYI 지원 건을 ktc-support 파이프라인에 직접 밀어넣고 (지원건 단위), 그다음 당겨온다
const push = await pushFyiToKtc();
console.log(`✓ FYI→파이프라인: 신규 ${push.pushed}건 유입 (기존재 ${push.alreadyInPipeline}, FYI 지원 건 ${push.fyiPeople})`);

// Candidate Data 시트 FYI 탭 보충 (기록 보존용 — DB에만 있고 시트에 없는 지원 건 append)
if (process.env.GOOGLE_SHEET_ID && process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL) {
  const fyiSheet = await appendFyiToSheet();
  console.log(`✓ FYI 탭 append: 누락 ${fyiSheet.appended}건 추가, 빈 JD Code 채움 ${fyiSheet.codeFilled}건 (시트 기존 ${fyiSheet.sheetRows}건)`);
}

if (process.argv.includes('--sheets')) {
  console.log('• ktc-support 시트 동기화 트리거...');
  const ev = await triggerSheetSync();
  console.log('  →', ev ? JSON.stringify(ev) : '완료(요약 이벤트 없음)');
}

const stats = await syncKtcCandidates();
console.log(`✓ 지원자(유니크) 동기화: fetched ${stats.fetched} → upsert ${stats.upserted} (스킵 ${stats.skipped}) | 날짜 파싱 ${stats.dateParsed} | 공고코드 ${stats.jobCoded}`);

if (process.env.GOOGLE_SHEET_ID && process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL) {
  const app = await syncKtcApplications();
  console.log(`✓ 지원 건 동기화: ${app.total}건`, JSON.stringify(app.perTab));
  const hires = await syncKtcHires();
  console.log(`✓ 입사자 동기화: ${hires.total}명 (매출 매칭 ${hires.withRevenue})`);
} else {
  console.log('⚠ GOOGLE_* env 없음 — 지원 건(ktc_applications)·입사자(ktc_hires) 동기화 스킵');
}
