import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'
import { toFyiJob } from '../../../lib/ktcJobsSync.js'

// ktc-support 가 기업 등록 직후 부르는 KTC 공고 자동 게재 창구 (2026-11 등록→게재 자동화).
// 받은 JD(ktc-support jd_definitions + 기업이 낸 채용 요청 원문)로 /ktc 공고 4블록을 만들어
// FYI jobs 에 source='ktc', source_id=JD코드 로 바로 게재(live)한다. 검수는 게재 뒤 VN팀이 어드민에서.
//
// 문안 틀은 하드코딩하지 않고 최근 KTC 공고(raw_payload.ktc) 몇 건을 예시로 넘겨 같은 언어·구성을 따르게 한다.
// 같은 코드가 이미 게재돼 있으면 새로 만들지 않고 그 공고를 돌려준다(재시도·중복 호출 안전).
//
// 인증: x-api-key == KTC_JOB_WEBHOOK_SECRET
// 요청: { code, company, companyEn?, category(Remote|VN|KR), location?, positionType?, position, hires?,
//        experience?, salary?, responsibilities?, qualifications?, preferred?, request? }
// 응답: { ok, created, id, url }

export const config = { maxDuration: 60 }

const JOB_BASE = process.env.KTC_JOB_BASE_URL || 'https://salary-fyi.com/ktc/jobs'
const MODEL = process.env.KTC_JOB_MODEL || 'gpt-4o'
const KTC_CATEGORIES = ['IT', 'Designer', 'Marketing', 'HR', 'Business']

const fyi = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})
let _openai
const openai = () => (_openai ??= new OpenAI({ apiKey: process.env.OPENAI_API_KEY }))

const s = (v) => (typeof v === 'string' ? v.trim() : '')

async function examples(db) {
  const { data } = await db
    .from('jobs')
    .select('title, location, raw_payload')
    .eq('source', 'ktc')
    .not('raw_payload->ktc->>responsibilities', 'is', null)
    .order('created_at', { ascending: false })
    .limit(10)
  // 한국어가 섞인 공고를 예시로 주면 새 공고도 한국어로 따라 쓴다(2026-11 K25→R252·R253 연쇄) — 베트남어 공고만 예시로
  return (data || []).filter((j) => !HANGUL.test(JSON.stringify(j.raw_payload.ktc))).slice(0, 3).map((j) => {
    const k = j.raw_payload.ktc
    return {
      title: j.title, location: j.location, category: k.category, work_type: k.work_type, experience: k.experience,
      description: k.description, responsibilities: k.responsibilities, requirements: k.requirements, benefits: k.benefits,
    }
  })
}

async function generate(input, shots, retry) {
  const sys = [
    'You write job postings for K-Tech College (KTC): Korean companies hiring Vietnamese talent, posted on the FYI job board.',
    'job_family in the input (Dev, Sales, etc.) is an internal category, not part of the title — never put it in the title.',
    'Write EVERY field in Vietnamese, whatever language the input or the examples are in — translate Korean and English input into natural Vietnamese (the title may stay in English). Keep product names, company names and tech terms (React, OOH, API…) as they are. No Hangul anywhere in the output, including the title.',
    'Follow the tone, section structure and formatting of the example postings.',
    'Use ONLY facts from the input. Never invent salary numbers, benefits, office addresses, tech stacks or company facts.',
    'Keep EVERY responsibility, qualification and preferred item from the input — translate them one by one; never summarize, merge or drop items.',
    'If a section has no facts, return an empty string for it.',
    'Required qualifications go to requirements; anything marked optional/preferred (우대, ưu tiên, preferred) goes to the end of requirements under a separate "**Ưu tiên**" heading.',
    'Return a JSON object only.',
  ].join(' ')
  const user = `Example postings (format reference only — do not copy their facts):
${JSON.stringify(shots, null, 1)}

New position input (may be Korean or English; write the posting in Vietnamese):
${JSON.stringify(input, null, 1)}

Return JSON:
{"title":"position title as shown on the board — a natural job title like \\"Backend Developer\\"; never prefix it with job_family (Dev / Sales / etc.)",
 "location":"work location (e.g. Remote, TP.HCM, Hà Nội, Seoul) — infer from input category/location only",
 "category":"one of ${KTC_CATEGORIES.join(' | ')}",
 "work_type":"Remote | Hybrid | Onsite (input category Remote means Remote)",
 "experience":"like \\"2+ year\\" or \\"1-3 year\\", empty if unknown",
 "description":"company / position introduction",
 "responsibilities":"...", "requirements":"...", "benefits":"salary range text, working conditions, benefits"}`
  const messages = [{ role: 'system', content: sys }, { role: 'user', content: user }]
  if (retry) {
    messages.push({ role: 'assistant', content: JSON.stringify(retry.prev) })
    messages.push({ role: 'user', content: `Fix these problems and return the full JSON again: ${retry.problems.join(' / ')}` })
  }
  const r = await openai().chat.completions.create({
    model: MODEL, temperature: 0.2, max_tokens: 3500,
    response_format: { type: 'json_object' },
    messages,
  })
  return JSON.parse(r.choices[0].message.content || '{}')
}

// 게재 전 검사 — 한글 잔존, 원문 항목 누락(요약). 문제 목록을 돌려준다(빈 배열 = 통과).
const HANGUL = /[가-힣]/
const FIELDS = ['title', 'description', 'responsibilities', 'requirements', 'benefits']
// 소제목(**…**)·"…:" 안내줄·빈 줄을 뺀 항목 줄 수
const items = (v) => s(v).split('\n').map((l) => l.trim()).filter((l) => l && !/^\*\*.*\*\*$/.test(l) && !/:$/.test(l)).length

function problemsOf(input, g) {
  const out = []
  const ko = FIELDS.filter((f) => HANGUL.test(s(g[f])))
  if (ko.length) out.push(`Hangul remains in ${ko.join(', ')} — translate to Vietnamese`)
  if (input.job_family && s(g.title).toLowerCase().startsWith(`${input.job_family.toLowerCase()} /`)) {
    out.push(`title starts with the internal job_family "${input.job_family} /" — use only the job title`)
  }
  // 원문과 겹치는 우대 항목이 합쳐지는 정도(1줄)는 허용
  const pairs = [
    ['responsibilities', items(input.responsibilities), items(g.responsibilities)],
    ['requirements', items(input.qualifications) + items(input.preferred), items(g.requirements)],
  ]
  for (const [f, want, got] of pairs) if (want && got < want - 1) out.push(`${f} has ${got} items but the input has ${want} — keep every item`)
  return out
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const secret = process.env.KTC_JOB_WEBHOOK_SECRET
  if (!secret || req.headers['x-api-key'] !== secret) return res.status(401).json({ error: 'unauthorized' })

  const b = req.body || {}
  const code = s(b.code).toUpperCase()
  const company = s(b.companyEn) || s(b.company)
  if (!code || !company || !(s(b.position) || s(b.positionType))) {
    return res.status(400).json({ error: 'code, company, position 필요' })
  }

  const db = fyi()
  try {
    const { data: dup } = await db.from('jobs').select('id').eq('source', 'ktc').eq('source_id', code).maybeSingle()
    if (dup) return res.json({ ok: true, created: false, id: dup.id, url: `${JOB_BASE}/${dup.id}` })

    const input = {
      company, company_ko: s(b.company), ktc_category: s(b.category), location: s(b.location),
      // positionType(Dev·Sales·etc.)은 KTC Support 내부 분류 — position 에 붙이면 "etc. / …" 가 제목이 된다
      position: s(b.position) || s(b.positionType), job_family: s(b.positionType), headcount: Number(b.hires) || 1,
      experience: s(b.experience), salary: s(b.salary), responsibilities: s(b.responsibilities),
      qualifications: s(b.qualifications), preferred: s(b.preferred), original_request: s(b.request),
    }
    const shots = await examples(db)
    let g = await generate(input, shots)
    let problems = problemsOf(input, g)
    if (problems.length) {
      g = await generate(input, shots, { prev: g, problems })
      problems = problemsOf(input, g)
    }
    if (!s(g.title) || !(s(g.responsibilities) || s(g.description))) {
      return res.status(422).json({ error: '공고 본문을 만들지 못했습니다', generated: g })
    }
    // 재시도 후에도 한글이 남거나 항목이 빠지면 게재하지 않는다 — ktc-support 가 슬랙에 실패로 알린다
    if (problems.length) {
      return res.status(422).json({ error: `검사 불통과(게재 안 함): ${problems.join(' / ')}`, generated: g })
    }

    const row = {
      ...toFyiJob({
        ...g,
        category: KTC_CATEGORIES.includes(g.category) ? g.category : null,
        company_name: company,
        job_id: code,
        headcount: input.headcount,
        is_active: true,
      }, code),
      status: 'live',
    }
    const { data, error } = await db.from('jobs').insert(row).select('id').single()
    if (error) throw error
    return res.json({ ok: true, created: true, id: data.id, url: `${JOB_BASE}/${data.id}` })
  } catch (e) {
    console.error('webhook/ktc-job:', e)
    return res.status(500).json({ error: e.message })
  }
}
