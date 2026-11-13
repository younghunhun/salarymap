// R248 자소서 시트 서식(1회). 값은 essaySheet 가 덮어쓰지만 서식은 열 단위라 유지된다.
import { google } from 'googleapis'
import { readFileSync } from 'node:fs'
for (const l of readFileSync(new URL('../../.env.local', import.meta.url), 'utf8').split('\n')) {
  const m = l.match(/^([A-Z_]+)=(.*)$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, '')
}
const ID = '1g_SGsGmtatwlFxyGXkB0SYTMkVYlzuEnf4EPkWkxYw0'
const auth = new google.auth.GoogleAuth({ credentials: { client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL, private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n') }, scopes: ['https://www.googleapis.com/auth/spreadsheets'] })
const sheets = google.sheets({ version: 'v4', auth })
const meta = await sheets.spreadsheets.get({ spreadsheetId: ID })
const sh = meta.data.sheets[0]; const sid = sh.properties.sheetId
const NCOL = 11
const rgb = (h) => ({ red: parseInt(h.slice(1, 3), 16) / 255, green: parseInt(h.slice(3, 5), 16) / 255, blue: parseInt(h.slice(5, 7), 16) / 255 })
const col = (c, c2 = c + 1) => ({ sheetId: sid, startColumnIndex: c, endColumnIndex: c2, startRowIndex: 1 })
const widths = [130, 220, 115, 135, 70, 150, 340, 340, 260, 400, 120]
const req = [
  { updateSheetProperties: { properties: { sheetId: sid, title: 'R248 응답', gridProperties: { frozenRowCount: 1, frozenColumnCount: 1 } }, fields: 'title,gridProperties.frozenRowCount,gridProperties.frozenColumnCount' } },
  ...widths.map((w, i) => ({ updateDimensionProperties: { range: { sheetId: sid, dimension: 'COLUMNS', startIndex: i, endIndex: i + 1 }, properties: { pixelSize: w }, fields: 'pixelSize' } })),
  { updateDimensionProperties: { range: { sheetId: sid, dimension: 'ROWS', startIndex: 0, endIndex: 1 }, properties: { pixelSize: 48 }, fields: 'pixelSize' } },
  // 본문 기본: 위 정렬, 줄바꿈, 10pt
  { repeatCell: { range: { sheetId: sid, startRowIndex: 1, startColumnIndex: 0, endColumnIndex: NCOL }, cell: { userEnteredFormat: { verticalAlignment: 'TOP', wrapStrategy: 'WRAP', textFormat: { fontFamily: 'Arial', fontSize: 10, foregroundColor: rgb('#1f2937') }, padding: { top: 6, bottom: 6, left: 6, right: 6 } } }, fields: 'userEnteredFormat(verticalAlignment,wrapStrategy,textFormat,padding)' } },
  // 헤더
  { repeatCell: { range: { sheetId: sid, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: NCOL }, cell: { userEnteredFormat: { backgroundColor: rgb('#1e3a5f'), verticalAlignment: 'MIDDLE', horizontalAlignment: 'CENTER', wrapStrategy: 'WRAP', textFormat: { bold: true, fontSize: 10, foregroundColor: rgb('#ffffff') } } }, fields: 'userEnteredFormat(backgroundColor,verticalAlignment,horizontalAlignment,wrapStrategy,textFormat)' } },
  // 이름 굵게, 짧은 열 가운데
  { repeatCell: { range: col(0), cell: { userEnteredFormat: { textFormat: { bold: true, fontSize: 10, foregroundColor: rgb('#111827') } } }, fields: 'userEnteredFormat.textFormat' } },
  ...[2, 3, 4, 5, 10].map((c) => ({ repeatCell: { range: col(c), cell: { userEnteredFormat: { horizontalAlignment: 'CENTER' } }, fields: 'userEnteredFormat.horizontalAlignment' } })),
  // 이메일·전화 회색
  { repeatCell: { range: col(1, 3), cell: { userEnteredFormat: { textFormat: { fontSize: 9, foregroundColor: rgb('#6b7280') } } }, fields: 'userEnteredFormat.textFormat' } },
  // 줄무늬
  { addBanding: { bandedRange: { range: { sheetId: sid, startRowIndex: 0, startColumnIndex: 0, endColumnIndex: NCOL }, rowProperties: { headerColor: rgb('#1e3a5f'), firstBandColor: rgb('#ffffff'), secondBandColor: rgb('#f4f7fb') } } } },
  // 대면면접 가능/불가 배지색
  { addConditionalFormatRule: { index: 0, rule: { ranges: [col(10)], booleanRule: { condition: { type: 'TEXT_EQ', values: [{ userEnteredValue: '가능' }] }, format: { backgroundColor: rgb('#dcfce7'), textFormat: { bold: true, foregroundColor: rgb('#15803d') } } } } } },
  { addConditionalFormatRule: { index: 1, rule: { ranges: [col(10)], booleanRule: { condition: { type: 'TEXT_EQ', values: [{ userEnteredValue: '불가' }] }, format: { backgroundColor: rgb('#fee2e2'), textFormat: { bold: true, foregroundColor: rgb('#b91c1c') } } } } } },
  // 헤더 아래 테두리
  { updateBorders: { range: { sheetId: sid, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: NCOL }, bottom: { style: 'SOLID_MEDIUM', color: rgb('#0f2440') } } },
  // 필터
  { setBasicFilter: { filter: { range: { sheetId: sid, startRowIndex: 0, startColumnIndex: 0, endColumnIndex: NCOL } } } },
]
await sheets.spreadsheets.batchUpdate({ spreadsheetId: ID, requestBody: { requests: req } })
console.log('ok', sh.properties.title, '→ R248 응답')
