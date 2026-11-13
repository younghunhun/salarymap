import { JOB_ESSAYS } from './jobEssays.js'

/* 자기소개서 답변 → 구글 시트 미러 (기업·운영팀 공유용).
   jobEssays.js 에 sheet(스프레드시트 ID) 가 있는 공고만. 첫 탭을 통째로 덮어쓴다(시트에서 손으로 고친 내용은 사라짐).
   시트는 서비스 계정(GOOGLE_SERVICE_ACCOUNT_EMAIL)에 편집자로 공유돼 있어야 한다.
   호출: /api/job-essays 제출 직후 + cron/ktc-push(15분, 파이프라인 상태 갱신). sb = supabase 서비스 클라이언트. */
export async function syncEssaySheet(sb, code) {
  const essay = JOB_ESSAYS[code]
  if (!essay?.sheet) return null

  const { data: job } = await sb.from('jobs').select('id').eq('source', 'ktc').eq('source_id', code).maybeSingle()
  if (!job) return null
  const { data: rows } = await sb.from('job_essays').select('email,answers,source,updated_at').eq('job_id', job.id).order('updated_at')
  const { data: cands } = await sb.from('ktc_candidates').select('email,full_name,phone,pipeline_status').eq('job_code', code)
  const cand = Object.fromEntries((cands || []).map((c) => [String(c.email || '').toLowerCase(), c]))

  const head = ['이름', '이메일', '전화', '파이프라인', '경로', '제출(최종수정, VN시간)', ...essay.questions.map((q) => q.label.ko)]
  const lines = (rows || []).map((r) => {
    const c = cand[r.email] || {}
    return [c.full_name || '', r.email, c.phone || '', c.pipeline_status || '', r.source === 'mail' ? '메일' : '지원시',
      new Date(r.updated_at).toLocaleString('ko-KR', { timeZone: 'Asia/Ho_Chi_Minh' }),
      ...essay.questions.map((q) => (q.type === 'yesno' ? (r.answers[q.key] === 'yes' ? '가능' : '불가') : r.answers[q.key] || ''))]
  })

  const { google } = await import('googleapis')
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  })
  const sheets = google.sheets({ version: 'v4', auth })
  const meta = await sheets.spreadsheets.get({ spreadsheetId: essay.sheet, fields: 'sheets.properties.title' })
  const tab = meta.data.sheets[0].properties.title
  await sheets.spreadsheets.values.clear({ spreadsheetId: essay.sheet, range: `'${tab}'` })
  await sheets.spreadsheets.values.update({
    spreadsheetId: essay.sheet,
    range: `'${tab}'!A1`,
    valueInputOption: 'RAW',
    requestBody: { values: [head, ...lines] },
  })
  return lines.length
}

export const essaySheetCodes = () => Object.keys(JOB_ESSAYS).filter((k) => JOB_ESSAYS[k].sheet)
