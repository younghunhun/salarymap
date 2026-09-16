// NEXON DEV VINA 9/16 재게시 5공고 recommend — Slack 게시 알림 당일 소싱.
//   V178 3D Environment Modeler · V179 3D Rigger · V180 2D Pixel Artist · V181 UA Media Creator · V182 Concept Artist
//   전부 TP.HCM 온사이트 · 포트폴리오 필수 · 연차/급여 미기재 (7월·9/1 동일 제목 공고의 재게시).
// 게이트 = 직군이 아니라 이력서 텍스트의 직무 툴·작업 시그널 (5공고 모두 Design 직군이라 직군 컷은 수백 명 오탐).
//   컨셉 아티스트는 "Adobe Illustrator" 툴명이 일반 그래픽 디자이너를 대량 오탐(276명) → illustrator 제외.
// 배정 캐스케이드 = 희소 직무 우선: rig → pix → env → cpt → ua, 1인 1통. 유저 지시 "보낼 수 있는 거 전부".
// 풀 실측(9/16): env 18 · rig 3 · pix 8 · ua 43 · cpt 43 → 유니크 약 100. 과거 아트·영상 직무 서류 통과율 낮음(Overlay 리거 1/17).
// ⚠️ 카피가 "이번 주 명단 전달" 약속 — 발송 후 NEXON DEV VINA(KTC 라인)에 추천 명단 실제 공유할 것.
//
//   node scripts/outreach/nexon0916-recommend-coldmail.mjs                       # dry-run
//   node scripts/outreach/nexon0916-recommend-coldmail.mjs --send [--group <gkey>] [--max N] [--gap-hours N]
import { Resend } from 'resend'
import { sb, env, fetchAll } from './lib.mjs'
import { makeToken } from '../../lib/campaignToken.js'

const args = process.argv.slice(2)
const flag = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? (args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true) : d }
const doSend = args.includes('--send')
const onlyGroup = flag('group', null)
const maxN = flag('max', null) ? parseInt(flag('max'), 10) : null
const gapHours = flag('gap-hours', null) ? parseFloat(flag('gap-hours')) : null
const sinceIso = gapHours != null ? new Date(Date.now() - gapHours * 3600 * 1000).toISOString() : new Date().toISOString().slice(0, 10)
const SITE = String(flag('site', env.NEXT_PUBLIC_SITE_URL || 'https://salary-fyi.com')).replace(/\/$/, '')
const RESEND_FROM = env.RESEND_FROM || 'FYI <hello@salary-fyi.com>'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const esc = (s) => String(s || '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
const firstName = (n) => String(n || '').trim().split(/\s+/).slice(-1)[0] || 'bạn'
const strip = (s) => String(s).replace(/<[^>]+>/g, '')

// ── 대상 선정 헬퍼 ──
const norm = (v) => (Array.isArray(v) ? v.join(' ') : String(v || ''))
const txt = (p) => {
  const exp = Array.isArray(p.experiences) ? p.experiences.map((e) => `${e.title || e.position || ''} ${e.company || ''} ${e.description || ''}`).join(' ') : ''
  return [p.position, p.headline, norm(p.desired_roles), JSON.stringify(p.skills || ''), exp, JSON.stringify(p.resume_summary || ''), JSON.stringify(p.projects || ''), p.major].join(' ').toLowerCase()
}
// TP.HCM 온사이트 — 하드게이트는 아니고(거주지 미기재 다수) 정렬 가점
const hcmRe = /(h[ồo]\s*ch[íi]\s*minh|hcm|sài gòn|sai gon|saigon|thủ đức|thu duc|bình thạnh|bình dương|binh duong|đồng nai|dong nai|biên hòa|bien hoa)/i
const hcmA = (p) => (hcmRe.test(String(p.location || '')) ? 1 : 0)
const gameA = (p) => (/(\bgame\b|unity|unreal|trò chơi)/.test(p.__t) ? 1 : 0)
const pfA = (p) => (p.portfolio_url || /(behance|artstation|dribbble|portfolio)/.test(p.__t) ? 1 : 0)
const bonus = (p) => hcmA(p) + gameA(p) + pfA(p)
// 해외 거주 명시자는 제외 — HCM 온사이트라 실지원 불가 (9/16 dry-run: 미국 PA·필리핀·인도 3명)
const abroadRe = /(philippines|india|pakistan|bangladesh|indonesia|malaysia|thailand|singapore|china|japan|korea|united states|\busa\b|canada|australia|nigeria|egypt)/i
const abroad = (p) => { const l = String(p.location || '').trim(); return abroadRe.test(l) || (/, ?[A-Z]{2}$/.test(l) && !/, ?VN$/.test(l)) }

// ── 그룹 (캐스케이드 = 희소 직무 우선 배정) ──
const GROUPS = [
  {
    gkey: 'rig', camp: 'nexon0916-recommend-rig', jobKey: 'V179',
    label: { vi: '3D Rigger', ko: '3D 리거' },
    pick: (p) => {
      const t = p.__t
      const strong = /\b(rigging|rigger|skinning)\b/.test(t)
      return strong || (/\b(maya|3ds ?max)\b/.test(t) && /(3d animat|character animat)/.test(t)) ? (strong ? 2 : 1) + bonus(p) : null
    },
  },
  {
    gkey: 'pix', camp: 'nexon0916-recommend-pix', jobKey: 'V180',
    label: { vi: '2D Pixel Artist', ko: '2D 픽셀 아티스트' },
    pick: (p) => {
      const t = p.__t
      if (!/(pixel art|pixel artist|aseprite|pro motion|sprite|spine 2d|2d spine|game art|2d game)/.test(t)) return null
      return (/(pixel art|pixel artist|aseprite|pro motion)/.test(t) ? 2 : 1) + bonus(p)
    },
  },
  {
    gkey: 'env', camp: 'nexon0916-recommend-env', jobKey: 'V178',
    label: { vi: '3D Environment Modeler', ko: '3D 환경 모델러' },
    pick: (p) => {
      const t = p.__t
      if (!/\b(maya|3ds ?max|zbrush|substance)\b/.test(t)) return null
      if (!/(game|environment|prop|3d model|modeling|modeller|modeler|3d artist|unreal|unity)/.test(t)) return null
      if (/(architect|kiến trúc|interior|nội thất)/.test(t)) return null
      return (/(environment|prop)/.test(t) ? 2 : 1) + bonus(p)
    },
  },
  {
    gkey: 'cpt', camp: 'nexon0916-recommend-cpt', jobKey: 'V182',
    label: { vi: 'Concept Artist', ko: '컨셉 아티스트' },
    pick: (p) => {
      const t = p.__t
      if (!/(concept art|concept artist|character design|digital painting|\billustrations?\b|2d artist|game artist|procreate|clip studio)/.test(t)) return null
      return (/(concept art|concept artist|character design|digital painting)/.test(t) ? 2 : 1) + bonus(p)
    },
  },
  {
    gkey: 'ua', camp: 'nexon0916-recommend-ua', jobKey: 'V181',
    label: { vi: 'UA Media Creator', ko: 'UA 미디어 크리에이터' },
    pick: (p) => {
      const t = p.__t
      if (!/(after effects|premiere)/.test(t) || !/(video|motion|editor|dựng phim|biên tập)/.test(t)) return null
      return (/(game|ads|advertis|quảng cáo|\bua\b)/.test(t) ? 2 : 1) + bonus(p)
    },
  },
]

// ── 공고·카피 (vi 실발송) — HCM 온사이트·포트폴리오 필수·필수 툴 전부 명시해 자기선별 유도 ──
const NX_INTRO = '<b>NEXON DEV VINA</b> — thành viên của <b>Nexon Group</b> (MapleStory, Dungeon & Fighter, KartRider, Blue Archive, DAVE THE DIVER…), công ty game số 1 Hàn Quốc'
const META = 'TP.HCM · Làm việc tại văn phòng · Bắt buộc nộp Portfolio'
const PF = 'Bắt buộc <b>nộp kèm Portfolio</b> khi ứng tuyển.'
const JOBS = {
  V178: {
    id: '98d04eaf-b444-4ec3-b7b7-74f333492723', company: 'NEXON DEV VINA', initial: 'N', meta: META,
    intro: `${NX_INTRO} — đang tuyển <b>3D Environment Modeler</b> (TP.HCM, làm việc tại văn phòng) qua FYI. Công việc: modeling background/môi trường theo art direction của dự án, tạo asset 3D (kiến trúc, địa hình, vật thể), bố trí level & scene trong engine, thiết lập lighting. Yêu cầu: năng lực sản xuất asset môi trường chất lượng cao, am hiểu high/low polygon & tối ưu hóa, sử dụng Maya/3Ds Max/ZBrush/Substance Painter/Photoshop. Ưu tiên: Unity/Unreal, Substance Designer/SpeedTree, kinh nghiệm game thương mại. ${PF}`,
  },
  V179: {
    id: '375ea642-438b-4ccf-87e8-2d55bc6e7bfe', company: 'NEXON DEV VINA', initial: 'N', meta: META,
    intro: `${NX_INTRO} — đang tuyển <b>3D Rigger</b> (TP.HCM, làm việc tại văn phòng) qua FYI. Công việc: rigging & skinning cho character/monster/costume, IK retargeting trên Unreal Engine, thiết lập simulation (cloth, rigid body, secondary motion), rig cho cutscene. Yêu cầu: kinh nghiệm rigging & skinning trên 3ds Max hoặc Maya, hiểu quy trình rigging trong Unreal, năng lực đạt chuẩn asset character game AAA. ${PF}`,
  },
  V180: {
    id: '56f34135-6b11-4d90-b97d-e7a387a1cb05', company: 'NEXON DEV VINA', initial: 'N', meta: META,
    intro: `${NX_INTRO} — đang tuyển <b>2D Pixel Artist (Background/Character/Monster)</b> (TP.HCM, làm việc tại văn phòng) qua FYI. Công việc: thiết kế pixel graphic cho character, background object, item/icon, monster; tạo pixel sprite & animation; hiệu ứng. Yêu cầu: thành thạo sprite & animation dạng pixel, kỹ năng drawing & phối màu, dùng Photoshop/Pro Motion. Ưu tiên: pixel art trong dự án game, Unity, 2D Spine, phong cách kiểu DAVE THE DIVER. ${PF}`,
  },
  V181: {
    id: 'e4076ede-1561-477d-9db6-65b28bdd0b2b', company: 'NEXON DEV VINA', initial: 'N', meta: META,
    intro: `${NX_INTRO} — đang tuyển <b>UA Media Creator</b> (TP.HCM, làm việc tại văn phòng) qua FYI. Công việc: lên kế hoạch, sản xuất & biên tập video quảng cáo game cho UA marketing, video ngắn dùng nội dung 2D/3D, phân tích hiệu quả quảng cáo. Yêu cầu: kinh nghiệm thực tế với After Effects/Premiere Pro và Photoshop/Illustrator, sáng tạo nội dung thể hiện sức hút của game trong thời gian ngắn. Ưu tiên: kinh nghiệm agency quảng cáo, UA marketing, dự án game toàn cầu. ${PF} Hồ sơ không kèm Portfolio sẽ bị xem là không phù hợp.`,
  },
  V182: {
    id: '38bffa01-5b3f-4530-a9f7-32e3127ec29c', company: 'NEXON DEV VINA', initial: 'N', meta: META,
    intro: `${NX_INTRO} — đang tuyển <b>Concept Artist</b> (TP.HCM, làm việc tại văn phòng) cho tựa game <b>Mabinogi Mobile</b> qua FYI. Công việc: concept cho character/costume/equipment/monster/NPC và background (dungeon, thị trấn, field), sản xuất sheet thiết kế dùng cho modeling. Yêu cầu: hiểu phong cách đồ họa Mabinogi Mobile, vẽ concept mặt trước/bên/sau cho dựng 3D, drawing/painting tay, thành thạo Photoshop. Ưu tiên: kinh nghiệm MMORPG, dress-up game. ${PF}`,
  },
}

const SUBJECT = {
  public: (company, role) => `[FYI] Bạn được chọn vào danh sách đề cử gửi ${company} — ${role}`,
  private: (company, role) => `[FYI] Bạn được chọn vào danh sách đề cử — ${role} tại ${company}`,
}
const HOOK = 'Đội ngũ FYI đã xem xét toàn bộ hồ sơ đã đăng ký và <b>chọn bạn vào danh sách đề cử</b> cho vị trí dưới đây — hồ sơ của bạn phù hợp với yêu cầu của vị trí này.'
const BENEFIT = {
  public: (company) => `<b>Trong tuần này</b>, FYI sẽ gửi danh sách đề cử trực tiếp cho người phụ trách tuyển dụng của ${company}. Hồ sơ của bạn đang ở chế độ công khai nên sẽ được gửi kèm danh sách. Nếu bạn ứng tuyển ngay, CV của bạn sẽ được <b>ưu tiên xem xét</b> cùng lời giới thiệu từ FYI.`,
  private: (company) => `<b>Trong tuần này</b>, FYI sẽ gửi danh sách đề cử trực tiếp cho người phụ trách tuyển dụng của ${company}. Hồ sơ của bạn đang ở chế độ riêng tư — nếu bạn ứng tuyển ngay, CV của bạn sẽ được gửi kèm lời giới thiệu từ FYI và được <b>ưu tiên xem xét</b>.`,
}
const ONETAP = 'Chỉ cần <b>1 chạm</b> — CV đã đăng ký của bạn sẽ được gửi tự động.'

function jobCard(jd, job) {
  const logo = job.logo_url
    ? `<img src="${esc(job.logo_url)}" width="44" height="44" alt="" style="width:44px;height:44px;border-radius:10px;object-fit:cover;background:#f0ebe3;display:block">`
    : `<div style="width:44px;height:44px;border-radius:10px;background:#fff0e6;color:#ff6000;font-weight:800;font-size:16px;text-align:center;line-height:44px">${jd.initial}</div>`
  return `<table width="100%" cellpadding="0" cellspacing="0" style="background:#fff;border:1px solid #eee5da;border-radius:14px;margin-bottom:8px"><tr>
    <td width="44" style="padding:14px 0 14px 14px;vertical-align:middle">${logo}</td>
    <td style="padding:14px 14px 14px 12px;vertical-align:middle">
      <div style="font-size:12px;color:#8a8073;margin-bottom:3px">${esc(jd.company)}</div>
      <div style="font-size:14.5px;font-weight:700;color:#1a1612;line-height:1.35">${esc(job.title.trim())}</div>
      <div style="font-size:12px;color:#b0691a;margin-top:3px">${esc(jd.meta)}</div>
    </td>
  </tr></table>`
}

function emailHtml(name, url, unsubUrl, jd, job, frame) {
  return `<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;background:#faf9f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1a1612">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#faf9f7"><tr><td align="center" style="padding:28px 16px">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px">
  <tr><td style="padding-bottom:18px"><img src="https://salary-fyi.com/fyi-logo.png" height="24" alt="FYI" style="height:24px;width:auto;display:block"></td></tr>
  <tr><td style="font-size:15px;line-height:1.6;color:#1a1612;padding-bottom:6px">Chào ${esc(firstName(name))},</td></tr>
  <tr><td style="font-size:14px;line-height:1.65;color:#4a443c;padding-bottom:14px">${jd.intro}</td></tr>
  <tr><td style="font-size:14px;line-height:1.65;color:#4a443c;padding-bottom:14px">${HOOK}</td></tr>
  <tr><td style="padding-bottom:10px">${jobCard(jd, job)}</td></tr>
  <tr><td style="font-size:14px;line-height:1.65;color:#4a443c;padding-top:4px">${BENEFIT[frame](jd.company)} ${ONETAP}</td></tr>
  <tr><td align="center" style="padding:16px 0 6px">
    <a href="${url}" style="display:inline-block;background:#ff6000;color:#fff;font-weight:700;font-size:15px;text-decoration:none;padding:14px 30px;border-radius:12px">Ứng tuyển 1 chạm →</a>
  </td></tr>
  <tr><td align="center" style="font-size:12.5px;padding-bottom:4px"><a href="${SITE}/ktc/jobs/${jd.id}" style="color:#8a8073">Xem mô tả công việc đầy đủ →</a></td></tr>
  <tr><td style="font-size:11.5px;color:#a89f92;text-align:center;line-height:1.5;padding-top:20px">
    Bạn nhận được email này vì đã đăng ký hồ sơ trên FYI.<br>— Đội ngũ FYI · <a href="https://salary-fyi.com/jobs" style="color:#a89f92">salary-fyi.com/jobs</a>
    &nbsp;·&nbsp;<a href="${unsubUrl}" style="color:#a89f92;text-decoration:underline">Hủy đăng ký</a>
  </td></tr>
</table></td></tr></table></body></html>`
}

function emailText(name, url, unsubUrl, jd, job, frame) {
  return `Chào ${firstName(name)},

${strip(jd.intro)}

${strip(HOOK)}

- ${job.title.trim()} (${jd.company}) — ${jd.meta} — ${SITE}/ktc/jobs/${jd.id}

${strip(BENEFIT[frame](jd.company))} ${strip(ONETAP)}

${url}

Bạn nhận được email này vì đã đăng ký hồ sơ trên FYI.
— Đội ngũ FYI · salary-fyi.com/jobs
Hủy đăng ký: ${unsubUrl}`
}

async function main() {
  const jobIds = Object.values(JOBS).map((j) => j.id)
  const { data: jobRows, error: jobErr } = await sb.from('jobs')
    .select('id,title,company,location,logo_url,is_active,source_id').in('id', jobIds)
  if (jobErr) { console.error('공고 조회 실패:', jobErr.message); process.exit(1) }
  const jobById = Object.fromEntries((jobRows || []).map((j) => [j.id, j]))
  for (const [k, jd] of Object.entries(JOBS)) {
    const j = jobById[jd.id]
    if (!j || !j.is_active) { console.error(`공고 없음/비활성: ${k} (${jd.id})`); process.exit(1) }
    if (j.source_id !== k) { console.error(`source_id 불일치: ${k} vs DB ${j.source_id} (${jd.id})`); process.exit(1) }
  }

  const resend = new Resend(env.RESEND_API_KEY)
  const url = (userId, camp, jobId) => `${SITE}/api/resume/recommend?t=${makeToken(userId, camp)}&j=${jobId}`
  const unsubFor = (userId, camp) => `${SITE}/api/coldmail/unsub?t=${makeToken(userId, camp)}`

  const [pool, unsubs, recs, apps, todays] = await Promise.all([
    fetchAll(() => sb.from('user_profiles')
      .select('id,email,full_name,position,desired_roles,yoe_months,location,english_cert,korean_cert,is_resume_public,skills,resume_summary,headline,experiences,projects,major,portfolio_url')
      .not('email', 'is', null).not('resume_url', 'is', null).order('created_at', { ascending: false })),
    fetchAll(() => sb.from('events').select('user_id').eq('event', 'coldmail_unsub').not('user_id', 'is', null).order('id')),
    fetchAll(() => sb.from('job_recommendations').select('user_id,job_id').in('job_id', jobIds).order('id')),
    fetchAll(() => sb.from('job_applications').select('user_id,job_id').in('job_id', jobIds).order('id')),
    fetchAll(() => sb.from('job_recommendations').select('user_id,to_email').gte('created_at', sinceIso).order('id')),
  ])
  const unsubSet = new Set(unsubs.map((r) => r.user_id))
  const recSet = new Set(recs.map((r) => `${r.user_id}|${r.job_id}`))
  const appliedSet = new Set(apps.map((a) => `${a.user_id}|${a.job_id}`))
  const todayUsers = new Set(todays.map((r) => r.user_id))
  const todayEmails = new Set(todays.map((r) => (r.to_email || '').toLowerCase()).filter(Boolean))

  const seen = new Set()
  const assigned = []
  let skipRec = 0, skipToday = 0
  for (const p of pool) {
    if (!p.email || /likelion/i.test(p.email)) continue
    const e = p.email.toLowerCase()
    if (seen.has(e) || unsubSet.has(p.id)) continue
    p.__t = txt(p)
    if (abroad(p)) continue
    for (const g of GROUPS) {
      const s = g.pick(p)
      if (s == null) continue
      const jobId = JOBS[g.jobKey].id
      if (appliedSet.has(`${p.id}|${jobId}`) || recSet.has(`${p.id}|${jobId}`)) { skipRec++; continue }
      seen.add(e)
      if (todayUsers.has(p.id) || todayEmails.has(e)) { skipToday++; break }
      assigned.push({ p, s, g, frame: p.is_resume_public ? 'public' : 'private' })
      break
    }
  }

  console.log('발송 대상(1인 1통 배정):')
  for (const g of GROUPS) {
    const rows = assigned.filter((r) => r.g.gkey === g.gkey)
    const pub = rows.filter((x) => x.frame === 'public').length
    console.log(`  ${g.gkey} → ${g.jobKey} (${g.label.ko}): ${rows.length}명 (공개 ${pub} / 비공개 ${rows.length - pub})`)
  }
  console.log(`  ── 합계: ${assigned.length}명 (제외: 해당 공고 기수신/기지원 ${skipRec} · 당일 발송 겹침 ${skipToday})`)
  if (!doSend) {
    for (const g of GROUPS) {
      const rows = assigned.filter((r) => r.g.gkey === g.gkey).sort((a, b) => b.s - a.s)
      if (!rows.length) continue
      console.log(`\n── ${g.gkey} 상위 15 표본 (총 ${rows.length}) ──`)
      for (const { p, s, frame } of rows.slice(0, 15))
        console.log(`  [${s}·${frame}] ${p.full_name} <${p.email}> · ${p.position || '?'} · ${Math.round((p.yoe_months || 0) / 12 * 10) / 10}y · ${p.location || '위치?'}`)
    }
    console.log('\n(dry-run — 실발송하려면 --send, 그룹 한정 --group <gkey>)')
    return
  }

  let targets = assigned
  if (onlyGroup) targets = targets.filter((r) => r.g.gkey === onlyGroup)
  if (maxN) targets = targets.slice(0, maxN)
  let ok = 0, fail = 0
  for (const { p, g, frame } of targets) {
    const jd = JOBS[g.jobKey]
    const job = jobById[jd.id]
    const camp = `${g.camp}-${frame}`
    const u = url(p.id, camp, jd.id), un = unsubFor(p.id, camp)
    const { error } = await resend.emails.send({
      from: RESEND_FROM, to: p.email, subject: SUBJECT[frame](jd.company, g.label.vi),
      html: emailHtml(p.full_name, u, un, jd, job, frame), text: emailText(p.full_name, u, un, jd, job, frame),
      headers: { 'List-Unsubscribe': `<${un}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
    })
    if (error) { console.error(`실패 ${p.email}:`, error.message || error); fail++; continue }
    await sb.from('job_recommendations').upsert([{
      user_id: p.id, to_email: p.email, job_id: jd.id,
      job_title: job.title, job_company: job.company, sent_by: 'coldmail', kind: 'recommend', status: 'sent',
    }], { onConflict: 'user_id,job_id', ignoreDuplicates: true })
    await sb.from('events').insert([{
      event: 'recommend_sent', page: '/scripts/nexon0916-recommend-coldmail',
      meta: { campaign: camp, job_ids: [jd.id], frame, group: g.gkey }, user_id: p.id,
    }])
    ok++
    if (ok % 25 === 0) console.log(`  …${ok}/${targets.length}`)
    await sleep(400)
  }
  console.log(`\n✅ 발송 완료: ${ok}/${targets.length} (실패 ${fail})`)
}

main().catch((e) => { console.error(e); process.exit(1) })
