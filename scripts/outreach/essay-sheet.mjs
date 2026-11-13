// 자소서 시트 미러 수동 실행 — node scripts/outreach/essay-sheet.mjs [--job R248]
import { sb } from './lib.mjs'
import { syncEssaySheet, essaySheetCodes } from '../../lib/essaySheet.js'

const i = process.argv.indexOf('--job')
const codes = i > 0 ? [process.argv[i + 1].toUpperCase()] : essaySheetCodes()
for (const code of codes) console.log(code, await syncEssaySheet(sb, code))
