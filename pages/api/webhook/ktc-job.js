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
    .limit(3)
  return (data || []).map((j) => {
    const k = j.raw_payload.ktc
    return {
      title: j.title, location: j.location, category: k.category, work_type: k.work_type, experience: k.experience,
      description: k.description, responsibilities: k.responsibilities, requirements: k.requirements, benefits: k.benefits,
    }
  })
}

async function generate(input, shots) {
  const sys = [
    'You write job postings for K-Tech College (KTC): Korean companies hiring Vietnamese talent, posted on the FYI job board.',
    'Write EVERY field in Vietnamese, whatever language the input or the examples are in — translate Korean and English input into natural Vietnamese (the title may stay in English). Keep product names, company names and tech terms (React, OOH, API…) as they are. No Hangul anywhere in the output, including the title.',
    'Follow the tone, section structure and formatting of the example postings.',
    'Use ONLY facts from the input. Never invent salary numbers, benefits, office addresses, tech stacks or company facts.',
    'Keep EVERY responsibility, qualification and preferred item from the input — translate them one by one; never summarize, merge or drop items.',
    'If a section has no facts, return an empty string for it.',
    'Required qualifications go to requirements; anything marked optional/preferred (우대, ưu tiên, preferred) goes to the end of requirements under a separate preferred heading in the examples\' language.',
    'Return a JSON object only.',
  ].join(' ')
  const user = `Example postings (format reference only — do not copy their facts):
${JSON.stringify(shots, null, 1)}

New position input (may be Korean or English; write the posting in Vietnamese):
${JSON.stringify(input, null, 1)}

Return JSON:
{"title":"position title as shown on the board",
 "location":"work location (e.g. Remote, TP.HCM, Hà Nội, Seoul) — infer from input category/location only",
 "category":"one of ${KTC_CATEGORIES.join(' | ')}",
 "work_type":"Remote | Hybrid | Onsite (input category Remote means Remote)",
 "experience":"like \\"2+ year\\" or \\"1-3 year\\", empty if unknown",
 "description":"company / position introduction",
 "responsibilities":"...", "requirements":"...", "benefits":"salary range text, working conditions, benefits"}`
  const r = await openai().chat.completions.create({
    model: MODEL, temperature: 0.2, max_tokens: 2500,
    response_format: { type: 'json_object' },
    messages: [{ role: 'system', content: sys }, { role: 'user', content: user }],
  })
  return JSON.parse(r.choices[0].message.content || '{}')
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
      position: [s(b.positionType), s(b.position)].filter(Boolean).join(' / '), headcount: Number(b.hires) || 1,
      experience: s(b.experience), salary: s(b.salary), responsibilities: s(b.responsibilities),
      qualifications: s(b.qualifications), preferred: s(b.preferred), original_request: s(b.request),
    }
    const g = await generate(input, await examples(db))
    if (!s(g.title) || !(s(g.responsibilities) || s(g.description))) {
      return res.status(422).json({ error: '공고 본문을 만들지 못했습니다', generated: g })
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
