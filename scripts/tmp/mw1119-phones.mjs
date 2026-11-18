import { readFileSync, writeFileSync, readdirSync } from 'fs'
import { createRequire } from 'module'
import { execSync } from 'child_process'
const require = createRequire(import.meta.url)
const pdf = require('pdf-parse')
const [, , json, dir] = process.argv
const rows = JSON.parse(readFileSync(json))
const re = /(?:\+?84|0)[\s.\-()]*(?:\d[\s.\-()]*){8,9}\d?/g
for (const r of rows) {
  const f = `${dir}/${r.email}.pdf`; let text = ''
  try {
    const buf = readFileSync(f)
    if (buf.slice(0, 2).toString() === 'PK') text = execSync(`unzip -p "${f}" word/document.xml | sed -e 's/<[^>]*>/ /g'`).toString()
    else text = (await pdf(buf)).text
  } catch (e) { console.log('ERR', r.email, e.message) }
  const hits = [...new Set((text.match(re) || []).map(s => s.replace(/[^\d+]/g, '')).filter(s => /^(\+?84\d{9}|0\d{9})$/.test(s)))]
  r.cvPhone = hits[0] || ''
  console.log(r.name.padEnd(28), '|', r.phone, '|', hits.join(' '))
}
writeFileSync(json, JSON.stringify(rows, null, 1))
