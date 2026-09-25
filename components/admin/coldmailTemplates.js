// 콜드메일 캠페인 → 발송 당시 메일 양식 스냅샷 (goals탭 캠페인 표의 "메일 보기" 모달 소스).
// 원본은 scripts/outreach/* 발송 스크립트 — 스크립트/템플릿이 나중에 바뀌어도 여기는
// "그 캠페인으로 실제 나간 양식"을 보존한다. 새 캠페인을 발송하면 여기에 항목을 추가할 것.
// {{...}} 는 발송 시 개인화되는 변수를 그대로 노출한 것(양식 보기가 목적이라 치환 안 함).
// 실제 발송 원문은 vi — ko/en은 어드민 열람용 번역본이며, 모달이 언어토글(lang)에 맞춰 고른다.

const pickLang = (o, lang) => o[lang] || o.vi

// ── 공용 셸: 단일 공고 추천 계열(nalda 톤) — intro/카드/혜택 문장만 캠페인별로 갈린다 ──
const SHELL_I18N = {
  vi: {
    greeting: 'Chào {{name}},',
    onetap: 'Chỉ cần <b>1 chạm</b> — CV đã đăng ký của bạn sẽ được gửi tự động.',
    cta: 'Ứng tuyển 1 chạm →',
    footer: 'Bạn nhận được email này vì đã đăng ký hồ sơ trên FYI.<br>— Đội ngũ FYI · salary-fyi.com/jobs',
  },
  ko: {
    greeting: '{{name}}님, 안녕하세요.',
    onetap: '<b>원탭</b>이면 됩니다 — 등록해두신 CV가 자동으로 전달됩니다.',
    cta: '원탭 지원 →',
    footer: 'FYI에 프로필을 등록하신 분께 발송된 메일입니다.<br>— FYI 팀 · salary-fyi.com/jobs',
  },
  en: {
    greeting: 'Hi {{name}},',
    onetap: 'Just <b>1 tap</b> — your registered CV is sent automatically.',
    cta: '1-tap apply →',
    footer: 'You received this email because you registered a profile on FYI.<br>— The FYI team · salary-fyi.com/jobs',
  },
}

const recommendShell = (lang, { intro, initial, company, title, meta, tail }) => {
  const s = pickLang(SHELL_I18N, lang)
  return `<!doctype html><html lang="vi"><head><meta charset="utf-8"></head>
<body style="margin:0;background:#faf9f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1a1612">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#faf9f7"><tr><td align="center" style="padding:28px 16px">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px">
  <tr><td style="font-size:20px;font-weight:800;color:#ff6000;padding-bottom:18px">FYI</td></tr>
  <tr><td style="font-size:15px;line-height:1.6;color:#1a1612;padding-bottom:6px">${s.greeting}</td></tr>
  <tr><td style="font-size:14px;line-height:1.65;color:#4a443c;padding-bottom:18px">${pickLang(intro, lang)}</td></tr>
  <tr><td style="padding-bottom:14px">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#fff;border:1px solid #eee5da;border-radius:14px"><tr>
      <td width="44" style="padding:14px 0 14px 14px;vertical-align:middle"><div style="width:44px;height:44px;border-radius:10px;background:#fff0e6;color:#ff6000;font-weight:800;font-size:16px;text-align:center;line-height:44px">${initial}</div></td>
      <td style="padding:14px 14px 14px 12px;vertical-align:middle">
        <div style="font-size:12px;color:#8a8073;margin-bottom:3px">${company}</div>
        <div style="font-size:14.5px;font-weight:700;color:#1a1612;line-height:1.35">${title}</div>
        <div style="font-size:12px;color:#b0691a;margin-top:3px">${meta}</div>
      </td>
    </tr></table>
  </td></tr>
  <tr><td style="font-size:14px;line-height:1.65;color:#4a443c;padding-bottom:6px">${pickLang(tail, lang)} ${s.onetap}</td></tr>
  <tr><td align="center" style="padding:16px 0 6px">
    <a style="display:inline-block;background:#ff6000;color:#fff;font-weight:700;font-size:15px;text-decoration:none;padding:14px 30px;border-radius:12px">${s.cta}</a>
  </td></tr>
  <tr><td style="font-size:11.5px;color:#a89f92;text-align:center;line-height:1.5;padding-top:20px">${s.footer}</td></tr>
</table></td></tr></table></body></html>`
}

const BENEFIT_PUBLIC = {
  vi: 'Vì đây là lời mời trực tiếp từ nhà tuyển dụng, hồ sơ của bạn sẽ được <b>ưu tiên xem xét</b> khi ứng tuyển.',
  ko: '기업 담당자가 직접 보낸 제안이라, 지원 시 <b>우선 검토</b> 대상이 됩니다.',
  en: 'Because this is a direct invitation from the recruiter, your application will get <b>priority review</b>.',
}
const BENEFIT_PRIVATE = {
  vi: '<b>Trong tuần này</b>, FYI sẽ gửi danh sách đề cử trực tiếp cho nhà tuyển dụng. Nếu bạn ứng tuyển ngay, CV của bạn sẽ được gửi kèm lời giới thiệu từ FYI và được <b>ưu tiên xem xét</b> so với ứng viên thông thường.',
  ko: '<b>이번 주 안에</b> FYI가 추천 명단을 기업 담당자에게 직접 전달합니다. 지금 지원하시면 FYI의 추천과 함께 CV가 전달되어 일반 지원자보다 <b>우선 검토</b>됩니다.',
  en: '<b>This week</b>, FYI will send the nominee list directly to the recruiter. If you apply now, your CV goes with FYI\'s recommendation and gets <b>priority review</b> over regular applicants.',
}

// ── KTC 4차 · CV 클레임 (scripts/ktc-claim-coldmail-vi.html) ──
const KTC_CLAIM_I18N = {
  vi: {
    tagline: 'Nền tảng tuyển dụng do K-Tech College xây dựng',
    h1: 'Hồ sơ của bạn<br /><span style="color:#ff6000;">đã sẵn sàng</span> trên FYI',
    p1: 'Chào <b style="color:#191F28;">{{name}}</b>,<br />{{month}}bạn đã ứng tuyển vị trí <b>{{jobTitle}}</b>{{atCompany}} qua <b>K-Tech College</b>.',
    p2: 'Với CV bạn đã nộp khi đó, chúng tôi đã <b style="color:#191F28;">chuẩn bị sẵn hồ sơ của bạn</b> trên <b>FYI</b> — nền tảng tuyển dụng do K-Tech College xây dựng.',
    cardLabel: 'HỒ SƠ FYI CỦA BẠN',
    cardFoot: '✓ Được tạo từ CV bạn đã nộp qua K-Tech College',
    p3: 'Bạn <b style="color:#191F28;">không cần viết lại CV</b>. Chỉ cần đăng nhập Google một lần, hồ sơ sẽ được đăng ký ngay và bạn có thể ứng tuyển các vị trí mới <b style="color:#191F28;">chỉ với một chạm</b>.',
    p4: 'Khi có vị trí phù hợp, chúng tôi sẽ gửi hồ sơ của bạn <b style="color:#191F28;">trực tiếp đến nhà tuyển dụng</b> — và bạn sẽ nhận được liên hệ qua email.',
    cta: 'Nhận hồ sơ của tôi →',
    foot1: 'Email này được gửi đến bạn vì bạn đã ứng tuyển K-Tech College, nhằm giới thiệu dịch vụ FYI.',
    foot2: 'Nếu không muốn nhận email này nữa, vui lòng nhấn <u>Hủy đăng ký</u>. · FYI · salary-fyi.com',
  },
  ko: {
    tagline: 'K-Tech College가 만든 채용 플랫폼',
    h1: '당신의 프로필이 FYI에<br /><span style="color:#ff6000;">이미 준비돼 있습니다</span>',
    p1: '<b style="color:#191F28;">{{name}}</b>님, 안녕하세요.<br />{{month}}<b>K-Tech College</b>를 통해 <b>{{jobTitle}}</b> 포지션{{atCompany}}에 지원하셨습니다.',
    p2: '그때 제출하신 CV로, K-Tech College가 만든 채용 플랫폼 <b>FYI</b>에 <b style="color:#191F28;">프로필을 미리 만들어 두었습니다</b>.',
    cardLabel: '내 FYI 프로필',
    cardFoot: '✓ K-Tech College 지원 시 제출한 CV로 생성됨',
    p3: 'CV를 <b style="color:#191F28;">다시 쓸 필요가 없습니다</b>. 구글 로그인 한 번이면 프로필이 바로 등록되고, 새 포지션에는 <b style="color:#191F28;">원탭으로</b> 지원할 수 있습니다.',
    p4: '맞는 포지션이 생기면 프로필을 <b style="color:#191F28;">기업 담당자에게 직접 전달</b>하고, 이메일로 연락을 받게 됩니다.',
    cta: '내 프로필 받기 →',
    foot1: 'K-Tech College 지원 이력이 있는 분께 FYI 서비스 소개를 위해 발송된 메일입니다.',
    foot2: '더 이상 수신을 원치 않으시면 <u>수신거부</u>를 눌러주세요. · FYI · salary-fyi.com',
  },
  en: {
    tagline: 'The hiring platform built by K-Tech College',
    h1: 'Your profile is<br /><span style="color:#ff6000;">already ready</span> on FYI',
    p1: 'Hi <b style="color:#191F28;">{{name}}</b>,<br />{{month}}you applied for the <b>{{jobTitle}}</b> position{{atCompany}} through <b>K-Tech College</b>.',
    p2: 'Using the CV you submitted back then, we\'ve <b style="color:#191F28;">prepared your profile</b> on <b>FYI</b> — the hiring platform built by K-Tech College.',
    cardLabel: 'YOUR FYI PROFILE',
    cardFoot: '✓ Built from the CV you submitted via K-Tech College',
    p3: 'You <b style="color:#191F28;">don\'t need to rewrite your CV</b>. Sign in with Google once, your profile is registered instantly, and you can apply to new positions <b style="color:#191F28;">with a single tap</b>.',
    p4: 'When a matching position opens, we\'ll send your profile <b style="color:#191F28;">directly to the recruiter</b> — and you\'ll hear back by email.',
    cta: 'Claim my profile →',
    foot1: 'You received this email because you applied to K-Tech College; it introduces the FYI service.',
    foot2: 'If you no longer wish to receive these emails, click <u>Unsubscribe</u>. · FYI · salary-fyi.com',
  },
}
const ktcClaimHtml = (lang) => {
  const s = pickLang(KTC_CLAIM_I18N, lang)
  return `<!doctype html><html lang="vi"><head><meta charset="utf-8"></head>
<body style="margin:0;padding:24px 0;background:#f2f4f6;">
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;color:#191F28;max-width:560px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #E5E8EB;">
  <div style="padding:22px 32px;border-bottom:1px solid #F2F4F6;">
    <span style="font-size:22px;font-weight:900;letter-spacing:-0.5px;color:#ff6000;">FYI</span>
    <span style="font-size:11px;font-weight:700;color:#8B95A1;letter-spacing:0.5px;margin-left:8px;">${s.tagline}</span>
  </div>
  <div style="padding:32px;">
    <h1 style="margin:0 0 18px;font-size:26px;line-height:1.4;font-weight:800;color:#191F28;letter-spacing:-0.4px;">${s.h1}</h1>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.75;color:#4E5968;">${s.p1}</p>
    <p style="margin:0 0 20px;font-size:15px;line-height:1.75;color:#4E5968;">${s.p2}</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;"><tr>
      <td style="background:#FFF7F3;border:1px solid #FFD9C7;border-radius:12px;padding:20px 22px;">
        <div style="font-size:11px;font-weight:800;color:#ff6000;letter-spacing:0.6px;margin-bottom:8px;">${s.cardLabel}</div>
        <div style="font-size:18px;font-weight:800;color:#191F28;letter-spacing:-0.2px;margin-bottom:10px;">{{fullName}}</div>
        <div style="font-size:13.5px;color:#4E5968;line-height:1.7;">🎓 {{university}}<br/>💼 {{position}} · {{yoe}}</div>
        <div style="font-size:12px;color:#8B95A1;border-top:1px solid #FFE4D6;margin-top:12px;padding-top:10px;line-height:1.5;">${s.cardFoot}</div>
      </td>
    </tr></table>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.75;color:#4E5968;">${s.p3}</p>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.75;color:#4E5968;">${s.p4}</p>
    <div style="text-align:center;margin:28px 0;"><a style="display:inline-block;background:#ff6000;color:#ffffff;font-size:16px;font-weight:800;text-decoration:none;padding:15px 30px;border-radius:12px;">${s.cta}</a></div>
  </div>
  <div style="padding:20px 32px 28px;border-top:1px solid #F2F4F6;">
    <p style="margin:0 0 6px;font-size:12px;line-height:1.65;color:#8B95A1;">${s.foot1}</p>
    <p style="margin:0;font-size:12px;line-height:1.65;color:#8B95A1;">${s.foot2}</p>
  </div>
</div></body></html>`
}

// ── KTC 3차 · 지원현황 (scripts/ktc-coldmail-vi.html) ──
const KTC_STATUS_I18N = {
  vi: {
    tagline: 'Nền tảng tuyển dụng IT tại Việt Nam',
    h1: 'Hồ sơ của bạn<br />đang ở <span style="color:#ff6000;">bước nào?</span>',
    p1: 'Chào <b style="color:#191F28;">{{name}}</b>,<br />Vừa qua bạn đã ứng tuyển vị trí <b>{{position}}</b>{{atCompany}} thông qua <b>K-Tech College</b>. <b style="color:#191F28;">Sau đó bạn có nhận được phản hồi nào không?</b>',
    p2: 'Thành thật mà nói: trước đây chúng tôi <b style="color:#191F28;">chỉ liên hệ với ứng viên trúng tuyển vòng cuối</b>. Nghĩa là phần lớn ứng viên không bao giờ biết hồ sơ của mình đã đi tới đâu.',
    p3: '<b style="color:#191F28;">Từ nay thì khác.</b> Chúng tôi đã xây dựng <b>FYI</b> để bạn không còn phải chờ đợi trong im lặng nữa.',
    statLabel: 'Tin tuyển dụng',
    cta: 'Xem cách theo dõi hồ sơ →',
    foot1: 'Email này được gửi đến bạn vì bạn đã ứng tuyển K-Tech College, nhằm giới thiệu dịch vụ FYI.',
    foot2: 'Nếu không muốn nhận email này nữa, vui lòng nhấn <u>Hủy đăng ký</u>. · FYI · salary-fyi.com',
  },
  ko: {
    tagline: '베트남 IT 채용 플랫폼',
    h1: '내 지원서는 지금<br /><span style="color:#ff6000;">어느 단계</span>에 있을까요?',
    p1: '<b style="color:#191F28;">{{name}}</b>님, 안녕하세요.<br />얼마 전 <b>K-Tech College</b>를 통해 <b>{{position}}</b> 포지션{{atCompany}}에 지원하셨습니다. <b style="color:#191F28;">그 뒤로 회신을 받은 적이 있으신가요?</b>',
    p2: '솔직히 말씀드리면, 지금까지 저희는 <b style="color:#191F28;">최종 합격자에게만 연락</b>했습니다. 대부분의 지원자는 자신의 지원서가 어디까지 갔는지 끝내 알 수 없었다는 뜻입니다.',
    p3: '<b style="color:#191F28;">이제는 다릅니다.</b> 더 이상 조용히 기다리지 않아도 되도록 <b>FYI</b>를 만들었습니다.',
    statLabel: '채용 공고',
    cta: '지원 현황 확인하는 법 보기 →',
    foot1: 'K-Tech College 지원 이력이 있는 분께 FYI 서비스 소개를 위해 발송된 메일입니다.',
    foot2: '더 이상 수신을 원치 않으시면 <u>수신거부</u>를 눌러주세요. · FYI · salary-fyi.com',
  },
  en: {
    tagline: 'The IT hiring platform in Vietnam',
    h1: 'Where is your application<br /><span style="color:#ff6000;">right now?</span>',
    p1: 'Hi <b style="color:#191F28;">{{name}}</b>,<br />You recently applied for the <b>{{position}}</b> position{{atCompany}} through <b>K-Tech College</b>. <b style="color:#191F28;">Have you heard anything back since?</b>',
    p2: 'To be honest: until now, we <b style="color:#191F28;">only contacted candidates who passed the final round</b>. That means most applicants never found out how far their application went.',
    p3: '<b style="color:#191F28;">That changes now.</b> We built <b>FYI</b> so you never have to wait in silence again.',
    statLabel: 'Job postings',
    cta: 'See how to track your application →',
    foot1: 'You received this email because you applied to K-Tech College; it introduces the FYI service.',
    foot2: 'If you no longer wish to receive these emails, click <u>Unsubscribe</u>. · FYI · salary-fyi.com',
  },
}
const ktcStatusHtml = (lang) => {
  const s = pickLang(KTC_STATUS_I18N, lang)
  return `<!doctype html><html lang="vi"><head><meta charset="utf-8"></head>
<body style="margin:0;padding:24px 0;background:#f2f4f6;">
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;color:#191F28;max-width:560px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #E5E8EB;">
  <div style="padding:22px 32px;border-bottom:1px solid #F2F4F6;">
    <span style="font-size:22px;font-weight:900;letter-spacing:-0.5px;color:#ff6000;">FYI</span>
    <span style="font-size:11px;font-weight:700;color:#8B95A1;letter-spacing:0.5px;margin-left:8px;">${s.tagline}</span>
  </div>
  <div style="padding:32px;">
    <h1 style="margin:0 0 18px;font-size:26px;line-height:1.4;font-weight:800;color:#191F28;letter-spacing:-0.4px;">${s.h1}</h1>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.75;color:#4E5968;">${s.p1}</p>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.75;color:#4E5968;">${s.p2}</p>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.75;color:#4E5968;">${s.p3}</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;border-spacing:8px;margin:0 -8px 8px;"><tr>
      <td width="100%" style="background:#F9F9F9;border:1px solid #F2F4F6;border-radius:12px;padding:16px 12px;text-align:center;">
        <div style="font-size:23px;font-weight:900;color:#ff6000;letter-spacing:-0.5px;">983</div>
        <div style="font-size:12px;color:#8B95A1;margin-top:5px;line-height:1.45;">${s.statLabel}</div>
      </td>
    </tr></table>
    <div style="text-align:center;margin:28px 0;"><a style="display:inline-block;background:#ff6000;color:#ffffff;font-size:16px;font-weight:800;text-decoration:none;padding:15px 30px;border-radius:12px;">${s.cta}</a></div>
  </div>
  <div style="padding:20px 32px 28px;border-top:1px solid #F2F4F6;">
    <p style="margin:0 0 6px;font-size:12px;line-height:1.65;color:#8B95A1;">${s.foot1}</p>
    <p style="margin:0;font-size:12px;line-height:1.65;color:#8B95A1;">${s.foot2}</p>
  </div>
</div></body></html>`
}

// ── coldmail1 · 이력서 공개 축하금 (resume-public-coldmail.mjs) ──
const COLDMAIL1_I18N = {
  vi: {
    greeting: 'Chào <b>{{name}}</b>,',
    p1: 'Cảm ơn bạn đã đăng ký CV trên FYI để tham gia <b>sự kiện thưởng 1.000.000₫</b>! 🎉',
    p2: 'Nhưng CV của bạn đang ở chế độ <b style="color:#d92d20">RIÊNG TƯ</b>. Khi còn riêng tư:',
    li1: 'Các công ty <b>không thể xem</b> hồ sơ của bạn',
    li2: 'Bạn <b>chưa đủ điều kiện</b> tham gia sự kiện thưởng',
    p3: 'Chỉ cần 1 chạm để công khai CV và tham gia ngay:',
    cta: 'Công khai CV &amp; tham gia sự kiện →',
    p4: 'Sau khi công khai, các công ty phù hợp sẽ chủ động liên hệ, và bạn đủ điều kiện nhận thưởng 1.000.000₫ khi được tuyển qua FYI.',
    footer: '— Đội ngũ FYI · salary-fyi.com<br>Đây là email tự động. Nếu bạn không muốn công khai, chỉ cần bỏ qua email này.',
  },
  ko: {
    greeting: '<b>{{name}}</b>님, 안녕하세요.',
    p1: '<b>1,000,000₫ 축하금 이벤트</b> 참여를 위해 FYI에 CV를 등록해 주셔서 감사합니다! 🎉',
    p2: '그런데 지금 CV가 <b style="color:#d92d20">비공개</b> 상태입니다. 비공개인 동안에는:',
    li1: '기업이 회원님의 프로필을 <b>볼 수 없습니다</b>',
    li2: '축하금 이벤트 <b>참여 자격이 없습니다</b>',
    p3: '원탭으로 CV를 공개하고 바로 참여하세요:',
    cta: 'CV 공개하고 이벤트 참여 →',
    p4: '공개하면 맞는 기업이 먼저 연락해 오고, FYI를 통해 채용되면 1,000,000₫ 축하금 지급 대상이 됩니다.',
    footer: '— FYI 팀 · salary-fyi.com<br>자동 발송 메일입니다. 공개를 원치 않으시면 이 메일은 무시하셔도 됩니다.',
  },
  en: {
    greeting: 'Hi <b>{{name}}</b>,',
    p1: 'Thanks for registering your CV on FYI to join the <b>1,000,000₫ bonus event</b>! 🎉',
    p2: 'But your CV is currently set to <b style="color:#d92d20">PRIVATE</b>. While it stays private:',
    li1: 'Companies <b>can\'t view</b> your profile',
    li2: 'You\'re <b>not yet eligible</b> for the bonus event',
    p3: 'Just 1 tap to make your CV public and join right away:',
    cta: 'Make CV public &amp; join the event →',
    p4: 'Once public, matching companies will reach out first, and you\'re eligible for the 1,000,000₫ bonus when hired through FYI.',
    footer: '— The FYI team · salary-fyi.com<br>This is an automated email. If you\'d rather stay private, just ignore it.',
  },
}
const coldmail1Html = (lang) => {
  const s = pickLang(COLDMAIL1_I18N, lang)
  return `<!doctype html><html><body style="margin:0;background:#faf9f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:#1a1612">
<div style="max-width:520px;margin:0 auto;padding:32px 20px">
  <div style="font-size:20px;font-weight:800;color:#ff6000;margin-bottom:20px">FYI</div>
  <div style="background:#fff;border:1px solid #eee5da;border-radius:18px;padding:30px 26px">
    <p style="font-size:15px;margin:0 0 14px">${s.greeting}</p>
    <p style="font-size:14.5px;line-height:1.6;margin:0 0 16px">${s.p1}</p>
    <p style="font-size:14.5px;line-height:1.6;margin:0 0 8px">${s.p2}</p>
    <ul style="font-size:14px;line-height:1.7;margin:0 0 18px;padding-left:20px;color:#4a4238">
      <li>${s.li1}</li>
      <li>${s.li2}</li>
    </ul>
    <p style="font-size:14.5px;line-height:1.6;margin:0 0 20px">${s.p3}</p>
    <div style="text-align:center;margin:0 0 22px"><a style="display:inline-block;background:#ff6000;color:#fff;font-weight:700;font-size:15px;text-decoration:none;padding:14px 28px;border-radius:12px">${s.cta}</a></div>
    <p style="font-size:13px;line-height:1.6;color:#8a8073;margin:0">${s.p4}</p>
  </div>
  <p style="font-size:11.5px;color:#a89f92;text-align:center;margin:18px 0 0;line-height:1.5">${s.footer}</p>
</div></body></html>`
}

// ── jobs1 · 올린 CV로 원탭 지원 (resume-public-jobs-coldmail.mjs) ──
const JOBS1_I18N = {
  vi: {
    greeting: 'Chào <b>{{name}}</b>,',
    p1: 'Bạn đã có CV trên FYI — giờ bạn có thể dùng chính CV đó để <b>ứng tuyển ngay, không cần điền lại bất cứ thông tin nào</b>.',
    p2: 'Ngay lúc này có <b>{{N}} vị trí</b> từ các công ty đang tuyển dụng tích cực. Nhấn nút bên dưới để xem danh sách và ứng tuyển từng vị trí <b>chỉ với 1 nút bấm</b> — CV của bạn được gửi tự động.',
    cta: 'Xem việc làm &amp; ứng tuyển ngay →',
    note: 'Lưu ý: khi nhấn nút, CV của bạn sẽ chuyển sang chế độ công khai — nhà tuyển dụng cũng có thể chủ động tìm thấy và liên hệ bạn.',
    footer: '— Đội ngũ FYI · salary-fyi.com<br>Đây là email tự động. Nếu bạn không quan tâm, chỉ cần bỏ qua email này.',
  },
  ko: {
    greeting: '<b>{{name}}</b>님, 안녕하세요.',
    p1: 'FYI에 이미 CV가 있습니다 — 이제 그 CV 그대로 <b>아무 정보도 다시 입력하지 않고 바로 지원</b>할 수 있습니다.',
    p2: '지금 이 순간 활발히 채용 중인 기업의 <b>{{N}}개 포지션</b>이 있습니다. 아래 버튼으로 리스트를 확인하고 <b>버튼 한 번으로</b> 각 포지션에 지원하세요 — CV는 자동으로 전달됩니다.',
    cta: '공고 보고 바로 지원 →',
    note: '참고: 버튼을 누르면 CV가 공개 상태로 전환됩니다 — 기업이 먼저 회원님을 찾아 연락할 수도 있습니다.',
    footer: '— FYI 팀 · salary-fyi.com<br>자동 발송 메일입니다. 관심 없으시면 무시하셔도 됩니다.',
  },
  en: {
    greeting: 'Hi <b>{{name}}</b>,',
    p1: 'You already have a CV on FYI — now you can use that same CV to <b>apply instantly, without re-entering anything</b>.',
    p2: 'Right now there are <b>{{N}} positions</b> from companies actively hiring. Tap the button below to browse the list and apply to each one <b>with a single click</b> — your CV is sent automatically.',
    cta: 'Browse jobs &amp; apply now →',
    note: 'Note: tapping the button switches your CV to public — recruiters may also find and contact you directly.',
    footer: '— The FYI team · salary-fyi.com<br>This is an automated email. Not interested? Just ignore it.',
  },
}
const jobs1Html = (lang) => {
  const s = pickLang(JOBS1_I18N, lang)
  return `<!doctype html><html><body style="margin:0;background:#faf9f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:#1a1612">
<div style="max-width:520px;margin:0 auto;padding:32px 20px">
  <div style="font-size:20px;font-weight:800;color:#ff6000;margin-bottom:20px">FYI</div>
  <div style="background:#fff;border:1px solid #eee5da;border-radius:18px;padding:30px 26px">
    <p style="font-size:15px;margin:0 0 14px">${s.greeting}</p>
    <p style="font-size:14.5px;line-height:1.6;margin:0 0 16px">${s.p1}</p>
    <p style="font-size:14.5px;line-height:1.6;margin:0 0 20px">${s.p2}</p>
    <div style="text-align:center;margin:0 0 18px"><a style="display:inline-block;background:#ff6000;color:#fff;font-weight:700;font-size:15px;text-decoration:none;padding:14px 28px;border-radius:12px">${s.cta}</a></div>
    <p style="font-size:12.5px;line-height:1.6;color:#8a8073;margin:0">${s.note}</p>
  </div>
  <p style="font-size:11.5px;color:#a89f92;text-align:center;margin:18px 0 0;line-height:1.5">${s.footer}</p>
</div></body></html>`
}

// ── recommend1 · 담당자 추천 상위 3공고 (recommend-jobs-coldmail.mjs) ──
const jobCard = (company, title, meta) => `<tr><td style="padding:0 0 10px">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#fff;border:1px solid #eee5da;border-radius:14px"><tr>
    <td width="44" style="padding:14px 0 14px 14px;vertical-align:middle"><div style="width:44px;height:44px;border-radius:10px;background:#fff0e6;color:#ff6000;font-weight:800;font-size:16px;text-align:center;line-height:44px">${company.charAt(0)}</div></td>
    <td style="padding:14px 14px 14px 12px;vertical-align:middle">
      <div style="font-size:12px;color:#8a8073;margin-bottom:3px">${company}</div>
      <div style="font-size:14.5px;font-weight:700;color:#1a1612;line-height:1.35">${title}</div>
      <div style="font-size:12px;color:#b0691a;margin-top:3px">${meta}</div>
    </td>
  </tr></table></td></tr>`
const RECOMMEND1_I18N = {
  vi: {
    greeting: 'Chào {{name}},',
    intro: 'Dựa trên hồ sơ của bạn trên FYI, chúng tôi đã <b>giới thiệu bạn tới một số nhà tuyển dụng đang tuyển</b>. Dưới đây là 3 vị trí phù hợp nhất với kinh nghiệm của bạn — bạn có thể ứng tuyển <b>chỉ với 1 chạm</b>, CV đã đăng ký của bạn sẽ được gửi tự động.',
    cta: 'Xem &amp; ứng tuyển 1 chạm →',
    footer: 'Bạn nhận được email này vì đã đăng ký hồ sơ công khai trên FYI.<br>— Đội ngũ FYI · salary-fyi.com/jobs',
  },
  ko: {
    greeting: '{{name}}님, 안녕하세요.',
    intro: 'FYI에 등록된 프로필을 바탕으로 <b>채용 중인 기업 담당자들에게 회원님을 추천</b>했습니다. 아래는 경력에 가장 잘 맞는 3개 포지션입니다 — <b>원탭</b>으로 지원하면 등록해두신 CV가 자동으로 전달됩니다.',
    cta: '보고 원탭 지원 →',
    footer: 'FYI에 공개 프로필을 등록하신 분께 발송된 메일입니다.<br>— FYI 팀 · salary-fyi.com/jobs',
  },
  en: {
    greeting: 'Hi {{name}},',
    intro: 'Based on your FYI profile, we\'ve <b>introduced you to several recruiters who are hiring</b>. Below are the 3 positions that best match your experience — apply <b>with just 1 tap</b> and your registered CV is sent automatically.',
    cta: 'View &amp; 1-tap apply →',
    footer: 'You received this email because you registered a public profile on FYI.<br>— The FYI team · salary-fyi.com/jobs',
  },
}
const recommend1Html = (lang) => {
  const s = pickLang(RECOMMEND1_I18N, lang)
  return `<!doctype html><html lang="vi"><head><meta charset="utf-8"></head>
<body style="margin:0;background:#faf9f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1a1612">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#faf9f7"><tr><td align="center" style="padding:28px 16px">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px">
  <tr><td style="font-size:20px;font-weight:800;color:#ff6000;padding-bottom:18px">FYI</td></tr>
  <tr><td style="font-size:15px;line-height:1.6;color:#1a1612;padding-bottom:6px">${s.greeting}</td></tr>
  <tr><td style="font-size:14px;line-height:1.65;color:#4a443c;padding-bottom:18px">${s.intro}</td></tr>
  <tr><td><table width="100%" cellpadding="0" cellspacing="0">${jobCard('{{회사1}}', '{{공고 제목1}}', '{{직군 · 지역}}')}${jobCard('{{회사2}}', '{{공고 제목2}}', '{{직군 · 지역}}')}${jobCard('{{회사3}}', '{{공고 제목3}}', '{{직군 · 지역}}')}</table></td></tr>
  <tr><td align="center" style="padding:16px 0 6px"><a style="display:inline-block;background:#ff6000;color:#fff;font-weight:700;font-size:15px;text-decoration:none;padding:14px 30px;border-radius:12px">${s.cta}</a></td></tr>
  <tr><td style="font-size:11.5px;color:#a89f92;text-align:center;line-height:1.5;padding-top:20px">${s.footer}</td></tr>
</table></td></tr></table></body></html>`
}

// ── resume-register · 이력서 등록 유도 (resume-register-coldmail.mjs) ──
const REGISTER_I18N = {
  vi: {
    greeting: 'Chào {{name}},',
    headline: 'Đăng ký CV, nhà tuyển dụng sẽ tìm đến bạn.',
    stat1: 'lời mời mỗi tháng',
    stat2: 'đậu vòng hồ sơ qua FYI',
    statNote: 'Số liệu trung bình của người đã đăng ký CV.',
    body: 'Bạn không cần tìm việc nữa. Chúng tôi chọn những vị trí bạn có khả năng đậu cao và liên hệ trước.',
    cta: 'Đăng ký CV',
    ctaNote: 'Không cần đăng nhập · khoảng 30 giây',
    footer: 'Bạn nhận email này vì đã đăng ký tài khoản FYI.<br>salary-fyi.com',
  },
  ko: {
    greeting: '{{name}}님, 안녕하세요.',
    headline: 'CV를 등록하면, 기업이 먼저 찾아옵니다.',
    stat1: '한 달 평균 받는 제안',
    stat2: 'FYI 통한 서류 통과율',
    statNote: 'CV 등록자 평균 수치입니다.',
    body: '더 이상 일자리를 찾아다닐 필요가 없습니다. 합격 가능성이 높은 포지션을 저희가 골라 먼저 연락드립니다.',
    cta: 'CV 등록하기',
    ctaNote: '로그인 불필요 · 약 30초',
    footer: 'FYI 계정을 등록하신 분께 발송된 메일입니다.<br>salary-fyi.com',
  },
  en: {
    greeting: 'Hi {{name}},',
    headline: 'Register your CV — recruiters will come to you.',
    stat1: 'invitations per month',
    stat2: 'pass resume screening via FYI',
    statNote: 'Average figures for users who registered a CV.',
    body: 'You don\'t need to job-hunt anymore. We pick the positions you\'re most likely to land and reach out first.',
    cta: 'Register CV',
    ctaNote: 'No login needed · about 30 seconds',
    footer: 'You received this email because you have an FYI account.<br>salary-fyi.com',
  },
}
const registerHtml = (lang) => {
  const s = pickLang(REGISTER_I18N, lang)
  return `<!doctype html><html><head><meta charset="utf-8"></head>
<body style="margin:0;background:#f4f2ee;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1a1612">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f2ee"><tr><td align="center" style="padding:32px 16px 40px">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px">
  <tr><td style="font-size:17px;font-weight:800;color:#ff6000;letter-spacing:-0.01em;padding-bottom:14px">FYI</td></tr>
  <tr><td style="background:#ffffff;border-radius:18px;padding:32px 28px 28px">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr><td style="font-size:13.5px;color:#8a8177;padding-bottom:12px">${s.greeting}</td></tr>
      <tr><td style="font-size:20px;font-weight:800;line-height:1.45;padding-bottom:22px">${s.headline}</td></tr>
      <tr><td style="padding-bottom:8px"><table width="100%" cellpadding="0" cellspacing="0">
        <tr><td width="72" style="font-size:30px;font-weight:800;color:#ff6000;line-height:1.15;vertical-align:middle;padding:9px 0">7</td><td style="font-size:14px;font-weight:600;color:#1a1612;vertical-align:middle;padding:9px 0">${s.stat1}</td></tr>
        <tr><td width="72" style="font-size:30px;font-weight:800;color:#ff6000;line-height:1.15;vertical-align:middle;padding:9px 0">85%</td><td style="font-size:14px;font-weight:600;color:#1a1612;vertical-align:middle;padding:9px 0">${s.stat2}</td></tr>
      </table></td></tr>
      <tr><td style="font-size:12px;color:#9a9186;line-height:1.5;padding-bottom:20px">${s.statNote}</td></tr>
      <tr><td style="border-top:1px solid #eeeae4;padding-top:20px;font-size:14px;line-height:1.7;color:#57504a">${s.body}</td></tr>
      <tr><td style="padding-top:22px"><a style="display:block;background:#ff6000;color:#fff;font-weight:700;font-size:15px;text-decoration:none;padding:16px;border-radius:12px;text-align:center">${s.cta}</a></td></tr>
      <tr><td style="font-size:12.5px;color:#9a9186;text-align:center;padding-top:12px">${s.ctaNote}</td></tr>
    </table>
  </td></tr>
  <tr><td style="font-size:11.5px;color:#a8a096;text-align:center;line-height:1.6;padding-top:20px">${s.footer}</td></tr>
</table></td></tr></table></body></html>`
}

// v2(8/5): 조작 수치(월7건·85%) 폐기 → 실측 "주 평균 오퍼 3.2건" 단일 스탯 + 연봉협상 앵글 + 수신거부 푸터.
const REGISTER2_I18N = {
  vi: {
    greeting: 'Chào {{name}},',
    headline: 'Đăng ký CV, nhà tuyển dụng sẽ tìm đến bạn.',
    stat1n: '3,2', stat1: 'lời mời mỗi tuần',
    statNote: 'Số liệu thực tế trung bình của người đã đăng ký CV trên FYI.',
    body: 'Bạn không cần tìm việc nữa. Khi có vị trí phù hợp, chúng tôi sẽ báo ngay cho bạn qua email — và hồ sơ của bạn sẽ được ưu tiên xem xét.',
    body2: 'Chưa có ý định chuyển việc? Không sao — lời mời bạn nhận được chính là lợi thế chắc chắn nhất khi đàm phán tăng lương ở công ty hiện tại.',
    cta: 'Đăng ký CV',
    ctaNote: 'Không cần đăng nhập · khoảng 30 giây',
    footer: 'Bạn nhận email này vì đã đăng ký tài khoản FYI.<br>salary-fyi.com · Hủy đăng ký',
  },
  ko: {
    greeting: '{{name}}님, 안녕하세요.',
    headline: '이력서를 등록해두면 담당자가 먼저 찾아옵니다.',
    stat1n: '3.2', stat1: '1주일 평균 받는 오퍼',
    statNote: '이력서를 등록한 분들이 실제로 받은 평균입니다.',
    body: '공고를 찾아다니지 않으셔도 됩니다. 알맞은 포지션이 열리면 메일로 바로 알려드리고, 회원님의 이력서는 우선 검토 대상이 됩니다.',
    body2: '당장 이직 생각이 없으셔도 괜찮습니다. 받아둔 오퍼는 지금 회사와의 연봉 협상에서 가장 확실한 카드가 됩니다.',
    cta: '이력서 등록하기',
    ctaNote: '로그인 없이 파일만 · 30초',
    footer: 'FYI에 가입하셔서 이 메일을 받으셨습니다.<br>salary-fyi.com · 수신 거부',
  },
  en: {
    greeting: 'Hi {{name}},',
    headline: 'Register your CV — recruiters will come to you.',
    stat1n: '3.2', stat1: 'offers per week on average',
    statNote: 'Actual average for users who registered a CV on FYI.',
    body: 'You don\'t need to job-hunt anymore. When a matching position opens, we\'ll email you right away — and your CV gets priority review.',
    body2: 'Not planning to switch jobs right now? That\'s fine — an offer in hand is your strongest card when negotiating a raise at your current company.',
    cta: 'Register CV',
    ctaNote: 'No login needed · about 30 seconds',
    footer: 'You received this email because you have an FYI account.<br>salary-fyi.com · Unsubscribe',
  },
}
const registerHtml2 = (lang) => {
  const s = pickLang(REGISTER2_I18N, lang)
  return `<!doctype html><html><head><meta charset="utf-8"></head>
<body style="margin:0;background:#f4f2ee;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1a1612">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f2ee"><tr><td align="center" style="padding:32px 16px 40px">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px">
  <tr><td style="padding-bottom:14px"><img src="https://salary-fyi.com/fyi-logo.png" height="24" alt="FYI" style="height:24px;width:auto;display:block"></td></tr>
  <tr><td style="background:#ffffff;border-radius:18px;padding:32px 28px 28px">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr><td style="font-size:13.5px;color:#8a8177;padding-bottom:12px">${s.greeting}</td></tr>
      <tr><td style="font-size:20px;font-weight:800;line-height:1.45;padding-bottom:22px">${s.headline}</td></tr>
      <tr><td style="padding-bottom:8px"><table width="100%" cellpadding="0" cellspacing="0">
        <tr><td width="72" style="font-size:30px;font-weight:800;color:#ff6000;line-height:1.15;vertical-align:middle;padding:9px 0">${s.stat1n}</td><td style="font-size:14px;font-weight:600;color:#1a1612;vertical-align:middle;padding:9px 0">${s.stat1}</td></tr>
      </table></td></tr>
      <tr><td style="font-size:12px;color:#9a9186;line-height:1.5;padding-bottom:20px">${s.statNote}</td></tr>
      <tr><td style="border-top:1px solid #eeeae4;padding-top:20px;font-size:14px;line-height:1.7;color:#57504a">${s.body}</td></tr>
      <tr><td style="padding-top:12px;font-size:14px;line-height:1.7;color:#57504a">${s.body2}</td></tr>
      <tr><td style="padding-top:22px"><a style="display:block;background:#ff6000;color:#fff;font-weight:700;font-size:15px;text-decoration:none;padding:16px;border-radius:12px;text-align:center">${s.cta}</a></td></tr>
      <tr><td style="font-size:12.5px;color:#9a9186;text-align:center;padding-top:12px">${s.ctaNote}</td></tr>
    </table>
  </td></tr>
  <tr><td style="font-size:11.5px;color:#a8a096;text-align:center;line-height:1.6;padding-top:20px">${s.footer}</td></tr>
</table></td></tr></table></body></html>`
}

const KTC_CLAIM_SUBJECT = {
  vi: '{{name}} ơi, hồ sơ {{position}} của bạn đã sẵn sàng trên FYI',
  ko: '{{name}}님, {{position}} 프로필이 FYI에 준비돼 있어요',
  en: '{{name}}, your {{position}} profile is ready on FYI',
}
// ── resume-register-bonus · 축하금 손실 프레임 (resume-register-bonus-coldmail.mjs) ──
// coldmail1에서 검증된 "아직 자격이 없다" 손실 프레임을 미등록자에게 적용.
// 수치는 축하금 금액·실제 지급 조건(/cv cv.how.notice와 동일)만 쓴다.
const REGISTER_BONUS_I18N = {
  vi: {
    greeting: 'Chào {{name}},',
    lead: 'Bạn chưa đủ điều kiện nhận thưởng 1.000.000₫.',
    body: 'Bạn đã có tài khoản FYI nhưng chưa đăng ký CV — vì vậy bạn chưa thể tham gia sự kiện thưởng 1.000.000₫ khi được tuyển qua FYI.',
    stepsIntro: 'Chỉ cần một bước để tham gia:',
    li1: 'Tải lên file CV — khoảng 30 giây, không cần nhập thêm thông tin',
    li2: 'Nhà tuyển dụng phù hợp xem hồ sơ và chủ động liên hệ bạn',
    li3: 'Được tuyển qua FYI → nhận thưởng 1.000.000₫',
    cta: 'Đăng ký CV &amp; tham gia sự kiện →',
    note: 'Không cần đăng nhập · PDF / DOCX · khoảng 30 giây',
    cond: 'Thưởng chỉ áp dụng cho vị trí tại doanh nghiệp Việt Nam, chi trả sau 2 tháng (60 ngày) làm việc.',
    footer: 'Bạn nhận email này vì đã đăng ký tài khoản FYI.<br>salary-fyi.com · Hủy đăng ký',
  },
  ko: {
    greeting: '{{name}}님, 안녕하세요.',
    lead: '아직 1,000,000₫ 축하금 이벤트 대상이 아닙니다.',
    body: 'FYI 계정은 있으신데 아직 CV가 등록되어 있지 않네요 — 그래서 지금은 FYI를 통해 채용될 때 지급되는 1,000,000₫ 취업 축하금 이벤트에 참여하실 수 없습니다.',
    stepsIntro: '참여 방법은 하나뿐입니다:',
    li1: 'CV 파일 업로드 — 약 30초, 추가 입력 없음',
    li2: '맞는 기업이 프로필을 보고 먼저 연락합니다',
    li3: 'FYI를 통해 채용되면 1,000,000₫ 축하금 지급 대상이 됩니다',
    cta: 'CV 올리고 이벤트 참여 →',
    note: '로그인 불필요 · PDF / DOCX · 약 30초',
    cond: '축하금은 베트남 현지 기업 공고에 한해 적용되며, 입사 후 2개월(60일) 근속이 확인된 뒤 지급됩니다.',
    footer: 'FYI에 가입하셔서 이 메일을 받으셨습니다.<br>salary-fyi.com · 수신 거부',
  },
  en: {
    greeting: 'Hi {{name}},',
    lead: 'You\'re not yet eligible for the 1,000,000₫ bonus.',
    body: 'You have an FYI account but no CV registered — so you can\'t yet join the 1,000,000₫ hiring-bonus event for people hired through FYI.',
    stepsIntro: 'Only one step to join:',
    li1: 'Upload your CV file — about 30 seconds, nothing else to fill in',
    li2: 'Matching companies view your profile and reach out first',
    li3: 'Get hired through FYI → receive the 1,000,000₫ bonus',
    cta: 'Register CV &amp; join the event →',
    note: 'No login needed · PDF / DOCX · about 30 seconds',
    cond: 'Applies only to jobs at Vietnam-based companies, paid after 2 months (60 days) of employment.',
    footer: 'You received this email because you have an FYI account.<br>salary-fyi.com · Unsubscribe',
  },
}
const registerBonusHtml = (lang) => {
  const s = pickLang(REGISTER_BONUS_I18N, lang)
  const li = (t) => `<li style="margin:0 0 8px">${t}</li>`
  return `<!doctype html><html><head><meta charset="utf-8"></head>
<body style="margin:0;background:#f4f2ee;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1a1612">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f2ee"><tr><td align="center" style="padding:32px 16px 40px">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px">
  <tr><td style="font-size:17px;font-weight:800;color:#ff6000;letter-spacing:-0.01em;padding-bottom:14px">FYI</td></tr>
  <tr><td style="background:#ffffff;border-radius:18px;padding:32px 28px 28px">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr><td style="font-size:13.5px;color:#8a8177;padding-bottom:12px">${s.greeting}</td></tr>
      <tr><td style="font-size:20px;font-weight:800;line-height:1.45;padding-bottom:16px;word-break:keep-all">${s.lead}</td></tr>
      <tr><td style="font-size:14px;line-height:1.7;color:#57504a;padding-bottom:18px;word-break:keep-all">${s.body}</td></tr>
      <tr><td style="border-top:1px solid #eeeae4;padding-top:18px;font-size:14px;font-weight:700;padding-bottom:10px">${s.stepsIntro}</td></tr>
      <tr><td><ul style="font-size:14px;line-height:1.6;color:#57504a;margin:0 0 20px;padding-left:20px;word-break:keep-all">${li(s.li1)}${li(s.li2)}${li(s.li3)}</ul></td></tr>
      <tr><td><a style="display:block;background:#ff6000;color:#fff;font-weight:700;font-size:15px;text-decoration:none;padding:16px;border-radius:12px;text-align:center">${s.cta}</a></td></tr>
      <tr><td style="font-size:12.5px;color:#9a9186;text-align:center;padding-top:12px">${s.note}</td></tr>
      <tr><td style="font-size:12px;color:#9a9186;line-height:1.6;padding-top:18px;word-break:keep-all">${s.cond}</td></tr>
    </table>
  </td></tr>
  <tr><td style="font-size:11.5px;color:#a8a096;text-align:center;line-height:1.6;padding-top:20px">${s.footer}</td></tr>
</table></td></tr></table></body></html>`
}

const invitedSubject = (company) => ({
  vi: `[FYI] ${company} đã xem hồ sơ của bạn và mời bạn ứng tuyển`,
  ko: `[FYI] ${company}가 회원님의 프로필을 보고 지원을 요청했습니다`,
  en: `[FYI] ${company} viewed your profile and invited you to apply`,
})

// ── MNF Solution AI Engineer (LLM) 추천 (mnf-recommend-coldmail.mjs) — JD 요약 문단은 두 프레임 공통.
//    하단부는 세 문단(하는 일 / 요건·근무조건 / 우선검토·원탭)으로 끊는다 — 한 문단이면 안 읽힘. ──
const MNF_LINE = {
  vi: 'Phát triển AI Agent, chatbot tư vấn du lịch, tính năng dịch đa ngôn ngữ và Voice AI với <b>Python · FastAPI · OpenAI API · Claude API · LangChain</b>.<br><br><b>Không yêu cầu kinh nghiệm</b> — chỉ cần nền tảng Python và tinh thần học hỏi; kinh nghiệm AI/LLM là điểm cộng. Làm việc on-site tại <b>Quận 7, TP.HCM</b>, lương thỏa thuận.',
  ko: 'AI Agent·여행 상담 챗봇·다국어 번역·Voice AI를 <b>Python · FastAPI · OpenAI API · Claude API · LangChain</b>으로 개발합니다.<br><br><b>경력 무관</b> — Python 기초와 배우려는 자세면 충분하고, AI/LLM 경험은 우대입니다. <b>호치민 7군(Q7) 온사이트</b>, 급여 협의.',
  en: 'Build AI Agents, a travel-guide chatbot, multilingual translation and Voice AI with <b>Python · FastAPI · OpenAI API · Claude API · LangChain</b>.<br><br><b>No experience required</b> — Python basics and willingness to learn are enough; AI/LLM experience is a plus. On-site in <b>District 7, HCMC</b>, negotiable salary.',
}
const mnfTail = (benefit) => ({
  vi: `${MNF_LINE.vi}<br><br>${benefit.vi}`, ko: `${MNF_LINE.ko}<br><br>${benefit.ko}`, en: `${MNF_LINE.en}<br><br>${benefit.en}`,
})

// ── OpenMinds Full Stack Developer (openminds-recommend-coldmail.mjs) — 훅(언어요건)+JD 요약, 두 프레임 공통 ──
const OPENMINDS_LINE = {
  vi: 'Vị trí này ưu tiên ứng viên Full Stack <b>giao tiếp tốt tiếng Anh hoặc tiếng Hàn</b> — hồ sơ của bạn đáp ứng đúng cả hai tiêu chí đó.<br><br>Phát triển và bảo trì Web/Mobile Application: Front-end (<b>React · Vue · Angular</b>), Back-end (<b>Node.js · Spring Boot · .NET · Django</b>), xây dựng RESTful API và tham gia triển khai, vận hành hệ thống.<br><br>Yêu cầu <b>3–4 năm kinh nghiệm Full Stack</b> và ít nhất 1 dự án đã triển khai thực tế. <b>Không giới hạn địa điểm làm việc</b>. Lương 18–20 triệu.',
  ko: '이 포지션은 <b>영어 또는 한국어 회화가 가능한</b> 풀스택 개발자를 우선합니다 — 회원님의 이력서가 두 조건 모두에 해당합니다.<br><br>웹/모바일 애플리케이션 개발·유지보수: 프론트엔드(<b>React · Vue · Angular</b>), 백엔드(<b>Node.js · Spring Boot · .NET · Django</b>), RESTful API 구축과 배포·운영 참여.<br><br>요건: <b>풀스택 경력 3–4년</b>, 실서비스 배포 프로젝트 1개 이상. <b>근무지 무관</b>. 급여 18–20백만 동.',
  en: 'This position prioritizes Full Stack developers who <b>communicate well in English or Korean</b> — your profile matches both criteria.<br><br>Develop and maintain Web/Mobile applications: Front-end (<b>React · Vue · Angular</b>), Back-end (<b>Node.js · Spring Boot · .NET · Django</b>), build RESTful APIs and join deployment and operations.<br><br>Requires <b>3–4 years of Full Stack experience</b> and at least 1 project deployed to production. <b>No work-location restriction</b>. Salary 18–20M VND.',
}
const openmindsTail = (benefit) => ({
  vi: `${OPENMINDS_LINE.vi}<br><br>${benefit.vi}`, ko: `${OPENMINDS_LINE.ko}<br><br>${benefit.ko}`, en: `${OPENMINDS_LINE.en}<br><br>${benefit.en}`,
})

// 순서대로 첫 매치 사용 — 접두어가 겹치는 항목(coldmail-ktc*)은 구체적인 것을 앞에 둘 것.
// ── 프로필 사진 등록(photo1): 대기 리스트 미선정(사유: 사진 없음) 프레임 ──
const PHOTO_I18N = {
  vi: {
    greeting: 'Chào <b>{{name}}</b>,',
    p1: 'Gần đây, một nhà tuyển dụng đã đưa hồ sơ của bạn vào <b>danh sách chờ (vòng 1)</b> để gửi offer. Nhưng rất tiếc, bạn đã <b style="color:#d92d20">không được chọn</b> vào danh sách cuối cùng.',
    p2: 'Lý do: hồ sơ của bạn <b>chưa có ảnh đại diện</b>.',
    p3: 'Các nhà tuyển dụng thường loại những hồ sơ không có ảnh khỏi danh sách đề cử. Để không bỏ lỡ cơ hội tiếp theo, hãy thêm ảnh hồ sơ ngay — <b>chưa đến 1 phút</b>, không cần đăng nhập. Hồ sơ có ảnh có khả năng nhận offer cao hơn <b>62%</b>.',
    cta: 'Thêm ảnh trong 1 phút →',
    tail: 'Chọn 1 ảnh chân dung rõ mặt — ảnh sẽ được cập nhật ngay và áp dụng từ danh sách đề cử tiếp theo.',
    footer: '— Đội ngũ FYI · salary-fyi.com · <u>Hủy nhận email</u>',
  },
  ko: {
    greeting: '안녕하세요 <b>{{name}}</b>님,',
    p1: '최근 기업 담당자님이 오퍼 발송을 위해 회원님 프로필을 <b>1차 대기 리스트</b>에 올렸습니다. 그런데 아쉽게 최종 명단에는 <b style="color:#d92d20">선정되지 않았습니다</b>.',
    p2: '사유: 프로필에 <b>사진이 없어서</b>입니다.',
    p3: '기업 담당자들은 사진이 없는 프로필을 추천 명단에서 제외하는 경우가 많습니다. 다음 기회를 놓치지 않게 지금 프로필 사진을 등록해 주세요 — <b>1분도 걸리지 않습니다</b>. 사진이 있는 프로필은 오퍼 확률이 <b>62%</b> 더 높습니다.',
    cta: '1분 만에 사진 추가하기 →',
    tail: '얼굴이 잘 나온 사진 한 장을 고르면 프로필에 바로 반영되고, 다음 추천 명단부터 적용됩니다.',
    footer: '— FYI 팀 · salary-fyi.com · <u>수신거부</u>',
  },
  en: {
    greeting: 'Hi <b>{{name}}</b>,',
    p1: 'Recently, a recruiter put your profile on the <b>round-1 shortlist</b> for an offer. Unfortunately, you were <b style="color:#d92d20">not selected</b> for the final list.',
    p2: 'Reason: your profile has <b>no photo</b>.',
    p3: 'Recruiters often drop photo-less profiles from nominee lists. Don\'t miss the next chance — add a photo now, it takes <b>under a minute</b>, no login needed. Profiles with a photo are <b>62%</b> more likely to receive an offer.',
    cta: 'Add a photo in 1 minute →',
    tail: 'Pick one clear headshot — it updates instantly and applies from the next nominee list.',
    footer: '— The FYI team · salary-fyi.com · <u>Unsubscribe</u>',
  },
}
// ── 프로필 사진 재발송(photo-remind1): "그때 사진 올린 사람들은 3일 내 오퍼 1~2건" 사회적 증거 프레임 ──
const PHOTO_REMIND_I18N = {
  vi: {
    greeting: 'Chào <b>{{name}}</b>,',
    p1: 'Lần trước, chúng tôi đã thông báo rằng hồ sơ của bạn bị loại khỏi danh sách đề cử nhận offer vì <b>chưa có ảnh đại diện</b>.',
    p2: 'Kể từ đó, hầu hết những người đã thêm ảnh hồ sơ đều nhận được <b>1–2 offer</b> từ nhà tuyển dụng <b>chỉ trong vòng 3 ngày</b>.',
    p3: 'Chưa có kế hoạch chuyển việc ngay? Không sao cả. Nhận offer và trải nghiệm phỏng vấn cũng là cơ hội tốt để kiểm tra giá trị của bạn trên thị trường tuyển dụng và phát triển sự nghiệp.',
    p4: 'Thêm ảnh chỉ mất <b>chưa đến 1 phút</b>, không cần đăng nhập:',
    cta: 'Thêm ảnh trong 1 phút →',
    tail: 'Chọn 1 ảnh chân dung rõ mặt — ảnh sẽ được áp dụng ngay từ danh sách đề cử tiếp theo.',
    footer: '— Đội ngũ FYI · salary-fyi.com · <u>Hủy nhận email</u>',
  },
  ko: {
    greeting: '안녕하세요 <b>{{name}}</b>님,',
    p1: '지난번에 프로필에 <b>사진이 없어</b> 오퍼 추천 명단에서 제외되었다는 안내를 드렸습니다.',
    p2: '그 뒤 사진을 추가한 분들 대부분이 <b>3일 이내에</b> 기업 담당자로부터 오퍼 제안을 <b>1~2건</b> 받았습니다.',
    p3: '당장 이직 계획이 없으셔도 괜찮습니다. 오퍼를 받아보고 면접을 경험하는 것만으로도 내 시장가치를 확인하고 커리어를 발전시키는 좋은 기회가 됩니다.',
    p4: '사진 추가는 <b>1분이면 됩니다</b>. 로그인도 필요 없습니다:',
    cta: '1분 만에 사진 추가하기 →',
    tail: '얼굴이 잘 나온 사진 한 장을 고르면 다음 추천 명단부터 바로 반영됩니다.',
    footer: '— FYI 팀 · salary-fyi.com · <u>수신거부</u>',
  },
  en: {
    greeting: 'Hi <b>{{name}}</b>,',
    p1: 'Last time, we let you know your profile was left off an offer nominee list because it had <b>no photo</b>.',
    p2: 'Since then, most people who added a photo received <b>1–2 offers</b> from recruiters <b>within 3 days</b>.',
    p3: 'Not planning to switch jobs right now? That\'s fine — receiving offers and interviewing is a great way to gauge your market value and grow your career.',
    p4: 'Adding a photo takes <b>under a minute</b>, no login needed:',
    cta: 'Add a photo in 1 minute →',
    tail: 'Pick one clear headshot — it applies from the next nominee list.',
    footer: '— The FYI team · salary-fyi.com · <u>Unsubscribe</u>',
  },
}
const photoRemindHtml = (lang) => {
  const s = pickLang(PHOTO_REMIND_I18N, lang)
  return `<!doctype html><html><body style="margin:0;background:#faf9f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:#1a1612">
<div style="max-width:520px;margin:0 auto;padding:32px 20px">
  <div style="font-size:20px;font-weight:800;color:#ff6000;margin-bottom:20px">FYI</div>
  <div style="background:#fff;border:1px solid #eee5da;border-radius:18px;padding:30px 26px">
    <p style="font-size:15px;margin:0 0 14px">${s.greeting}</p>
    <p style="font-size:14.5px;line-height:1.6;margin:0 0 14px">${s.p1}</p>
    <p style="font-size:14.5px;line-height:1.6;margin:0 0 14px">${s.p2}</p>
    <p style="font-size:14.5px;line-height:1.6;margin:0 0 20px">${s.p3}</p>
    <p style="font-size:14.5px;line-height:1.6;margin:0 0 14px">${s.p4}</p>
    <div style="text-align:center;margin:0 0 20px">
      <span style="display:inline-block;background:#ff6000;color:#fff;font-weight:700;font-size:15px;padding:14px 28px;border-radius:12px">${s.cta}</span>
    </div>
    <p style="font-size:13px;line-height:1.6;color:#8a8073;margin:0">${s.tail}</p>
  </div>
  <p style="font-size:11.5px;color:#a89f92;text-align:center;margin:18px 0 0;line-height:1.5">${s.footer}</p>
</div></body></html>`
}

const photoColdmailHtml = (lang) => {
  const s = pickLang(PHOTO_I18N, lang)
  return `<!doctype html><html><body style="margin:0;background:#faf9f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:#1a1612">
<div style="max-width:520px;margin:0 auto;padding:32px 20px">
  <div style="font-size:20px;font-weight:800;color:#ff6000;margin-bottom:20px">FYI</div>
  <div style="background:#fff;border:1px solid #eee5da;border-radius:18px;padding:30px 26px">
    <p style="font-size:15px;margin:0 0 14px">${s.greeting}</p>
    <p style="font-size:14.5px;line-height:1.6;margin:0 0 14px">${s.p1}</p>
    <p style="font-size:14.5px;line-height:1.6;margin:0 0 14px">${s.p2}</p>
    <p style="font-size:14.5px;line-height:1.6;margin:0 0 20px">${s.p3}</p>
    <div style="text-align:center;margin:0 0 20px">
      <span style="display:inline-block;background:#ff6000;color:#fff;font-weight:700;font-size:15px;padding:14px 28px;border-radius:12px">${s.cta}</span>
    </div>
    <p style="font-size:13px;line-height:1.6;color:#8a8073;margin:0">${s.tail}</p>
  </div>
  <p style="font-size:11.5px;color:#a89f92;text-align:center;margin:18px 0 0;line-height:1.5">${s.footer}</p>
</div></body></html>`
}

/* ── PRESTO SOLUTION 로봇/모션제어 SW (presto-recommend-coldmail.mjs) ──
   추천 계열이지만 recommendShell 을 못 쓴다. 셋이 다르다:
   (1) intro 다음에 개인화 후크 문단이 하나 더 붙는다 — 수신자의 이력서가 이 자리와 어디서
       만나는지 지목하는 줄로, 세그먼트(제어/비전/임베디드/GUI/전공/일반) 여섯 벌 중 하나가 나간다.
   (2) 카드 아래에 자격요건·복리후생 줄이 따로 있다(요건이 좁아 본문에서 걸러 주려고).
   (3) 푸터에 수신거부가 있다 — 이 캠페인부터 넣기 시작했다. 기존 recommendShell 을 고치면
       수신거부 없이 나갔던 이전 캠페인의 스냅샷까지 바뀌므로 셸을 따로 둔다. */
const PRESTO_I18N = {
  vi: {
    greeting: 'Chào {{name}},',
    hook: '{{후크 — 세그먼트별 1줄. 예(vision): Vị trí này phát triển phần mềm điều khiển dựa trên hệ thống <b>Laser &amp; Vision</b>, nên kinh nghiệm <b>xử lý ảnh / Computer Vision</b> của bạn dùng được ngay.}}',
    position: 'Thiết kế phần mềm điều khiển robot công nghiệp bằng Motion Controller, phát triển ứng dụng cho thiết bị và module phân tích dữ liệu điều khiển (ứng dụng AI).',
    req: 'Yêu cầu: hiểu biết <b>C/C++ hoặc C# (WinForm, WPF)</b> · tốt nghiệp Khoa học máy tính / Điện tử / Điều khiển · có thể đi công tác nước ngoài và lái xe. <b>Kinh nghiệm 1–5 năm.</b>',
    benefit: 'Lương thỏa thuận theo năng lực · hỗ trợ chi phí visa đi Hàn Quốc · thưởng theo kết quả kinh doanh.',
    onetap: 'Chỉ cần <b>1 chạm</b> — CV đã đăng ký của bạn sẽ được gửi tự động.',
    cta: 'Ứng tuyển 1 chạm →',
    jd: 'Xem mô tả công việc đầy đủ →',
    footer: 'Bạn nhận được email này vì đã đăng ký hồ sơ trên FYI.<br>— Đội ngũ FYI · salary-fyi.com/jobs · <u>Hủy đăng ký</u>',
  },
  ko: {
    greeting: '{{name}}님, 안녕하세요.',
    hook: '{{후크 — 세그먼트별 1줄. 예(비전): 이 포지션은 <b>레이저 및 비전 시스템</b> 기반 제어 소프트웨어를 개발합니다. 회원님의 <b>영상처리 · 컴퓨터 비전</b> 경험을 바로 쓸 수 있습니다.}}',
    position: 'Motion Controller를 활용한 산업용 로봇 제어 소프트웨어 설계, 장비 응용 SW 및 제어 데이터 분석 모듈(AI 응용) 개발.',
    req: '자격요건: <b>C/C++ 또는 C# (WinForm, WPF)</b>에 대한 이해 · 컴퓨터공학 / 전자 / 제어 전공 · 해외 출장 및 운전 가능. <b>경력 1~5년.</b>',
    benefit: '연봉 회사 내규(경력별 상이) · 한국 비자 발급비 지원 · 경영성과급.',
    onetap: '<b>한 번의 클릭</b>이면 등록된 CV가 자동으로 전달됩니다.',
    cta: '원클릭 지원하기 →',
    jd: '채용공고 전문 보기 →',
    footer: 'FYI에 이력서를 등록하셔서 이 메일을 받으셨습니다.<br>— FYI 팀 · salary-fyi.com/jobs · <u>수신 거부</u>',
  },
  en: {
    greeting: 'Hi {{name}},',
    hook: '{{hook — one line per segment. e.g. (vision): This role builds control software on top of <b>Laser &amp; Vision</b> systems, so your <b>image processing / computer vision</b> experience applies directly.}}',
    position: 'Design industrial robot control software using a Motion Controller, build equipment applications and control-data analysis modules (AI applications).',
    req: 'Requirements: understanding of <b>C/C++ or C# (WinForm, WPF)</b> · degree in Computer Science / Electronics / Control · able to travel abroad and drive. <b>1–5 years of experience.</b>',
    benefit: 'Negotiable salary · Korea visa cost support · performance bonus.',
    onetap: 'Just <b>1 tap</b> — your registered CV is sent automatically.',
    cta: '1-tap apply →',
    jd: 'See the full job description →',
    footer: 'You received this email because you registered a profile on FYI.<br>— The FYI team · salary-fyi.com/jobs · <u>Unsubscribe</u>',
  },
}

const prestoShell = (lang, { intro, tail }) => {
  const s = pickLang(PRESTO_I18N, lang)
  return `<!doctype html><html lang="vi"><head><meta charset="utf-8"></head>
<body style="margin:0;background:#faf9f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1a1612">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#faf9f7"><tr><td align="center" style="padding:28px 16px">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px">
  <tr><td style="font-size:20px;font-weight:800;color:#ff6000;padding-bottom:18px">FYI</td></tr>
  <tr><td style="font-size:15px;line-height:1.6;color:#1a1612;padding-bottom:6px">${s.greeting}</td></tr>
  <tr><td style="font-size:14px;line-height:1.65;color:#4a443c;padding-bottom:14px">${pickLang(intro, lang)}</td></tr>
  <tr><td style="font-size:14px;line-height:1.65;color:#4a443c;padding-bottom:18px">${s.hook}</td></tr>
  <tr><td style="padding-bottom:14px">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#fff;border:1px solid #eee5da;border-radius:14px"><tr>
      <td width="44" style="padding:14px 0 14px 14px;vertical-align:middle"><div style="width:44px;height:44px;border-radius:10px;background:#fff0e6;color:#ff6000;font-weight:800;font-size:16px;text-align:center;line-height:44px">P</div></td>
      <td style="padding:14px 14px 14px 12px;vertical-align:middle">
        <div style="font-size:12px;color:#8a8073;margin-bottom:3px">PRESTO SOLUTION</div>
        <div style="font-size:14.5px;font-weight:700;color:#1a1612;line-height:1.35">Software Engineer — Robot &amp; Motion Control</div>
        <div style="font-size:12px;color:#b0691a;margin-top:3px">HCM · Đà Nẵng · Hà Nội · Onsite</div>
      </td>
    </tr></table>
  </td></tr>
  <tr><td style="font-size:14px;line-height:1.65;color:#4a443c;padding-bottom:8px">${s.position}</td></tr>
  <tr><td style="font-size:13.5px;line-height:1.6;color:#6b6357;padding-bottom:6px">${s.req}<br>${s.benefit}</td></tr>
  <tr><td style="font-size:14px;line-height:1.65;color:#4a443c;padding-top:10px">${pickLang(tail, lang)} ${s.onetap}</td></tr>
  <tr><td align="center" style="padding:16px 0 6px">
    <a style="display:inline-block;background:#ff6000;color:#fff;font-weight:700;font-size:15px;text-decoration:none;padding:14px 30px;border-radius:12px">${s.cta}</a>
  </td></tr>
  <tr><td align="center" style="font-size:12.5px;padding-bottom:4px"><a style="color:#8a8073">${s.jd}</a></td></tr>
  <tr><td style="font-size:11.5px;color:#a89f92;text-align:center;line-height:1.5;padding-top:20px">${s.footer}</td></tr>
</table></td></tr></table></body></html>`
}

const PRESTO_INTRO = {
  public: {
    vi: 'Nhà tuyển dụng của <b>PRESTO SOLUTION</b> — công ty Hàn Quốc chuyên giải pháp Motion Control &amp; tự động hóa cho ngành bán dẫn, màn hình và robot công nghiệp — đã xem hồ sơ của bạn trên FYI và <b>gửi cho bạn vị trí này</b>.',
    ko: '반도체·디스플레이·산업용 로봇 분야의 Motion Control 및 자동화 솔루션 기업 <b>PRESTO SOLUTION</b>의 채용 담당자가 FYI에서 회원님의 이력서를 보고 <b>이 포지션을 보내드렸습니다</b>.',
    en: 'A recruiter at <b>PRESTO SOLUTION</b> — a Korean company providing Motion Control and automation solutions for semiconductor, display and industrial robot lines — viewed your CV on FYI and <b>sent you this position</b>.',
  },
  private: {
    vi: '<b>PRESTO SOLUTION</b> — công ty Hàn Quốc chuyên giải pháp Motion Control &amp; tự động hóa cho ngành bán dẫn, màn hình và robot công nghiệp — đang tuyển Software Engineer qua FYI. Đội ngũ FYI đã xem xét toàn bộ hồ sơ đã đăng ký và <b>chọn bạn vào danh sách đề cử</b> gửi cho nhà tuyển dụng.',
    ko: '반도체·디스플레이·산업용 로봇 분야의 Motion Control 및 자동화 솔루션 기업 <b>PRESTO SOLUTION</b>이 FYI를 통해 Software Engineer를 채용합니다. FYI 팀이 등록된 이력서 전체를 검토해 회원님을 <b>추천 후보 명단에 선정</b>했습니다.',
    en: '<b>PRESTO SOLUTION</b> — a Korean company providing Motion Control and automation solutions for semiconductor, display and industrial robot lines — is hiring a Software Engineer through FYI. The FYI team reviewed every registered CV and <b>selected you for the nominee list</b> sent to the recruiter.',
  },
}

// ── D+3 지원미달 3공고 추천 (d3-recommend-coldmail.mjs) — JD 요약 두 문단은 프레임 공통.
const d3Tail = (line1, line2) => (benefit) => ({
  vi: `${line1.vi}<br><br>${line2.vi}<br><br>${benefit.vi}`,
  ko: `${line1.ko}<br><br>${line2.ko}<br><br>${benefit.ko}`,
  en: `${line1.en}<br><br>${line2.en}<br><br>${benefit.en}`,
})
const PRESTO_MOTION_TAIL = d3Tail({
  vi: 'Phát triển và triển khai ứng dụng <b>Laser & Motion Control</b> — lập trình hệ thống điều khiển chuyển động (Servo, EtherCAT, Multi-axis) cho thiết bị tự động hóa.',
  ko: '<b>Laser & Motion Control</b> 애플리케이션 개발 — 자동화 장비의 모션 제어 시스템(Servo·EtherCAT·다축 보간)을 프로그래밍합니다.',
  en: 'Develop and deploy <b>Laser & Motion Control</b> applications — programming motion-control systems (Servo, EtherCAT, multi-axis) for automation equipment.',
}, {
  vi: '<b>Không yêu cầu kinh nghiệm</b> — công ty đào tạo chuyên sâu về Motion Control từ đầu; chỉ cần nền tảng kỹ thuật (tự động hóa, điện – điện tử, cơ điện tử, CNTT) và khả năng đọc tài liệu tiếng Anh. Làm việc <b>onsite tại Hàn Quốc</b>, lương thỏa thuận theo năng lực, hỗ trợ 300.000 điểm PAYCO/tháng.',
  ko: '<b>경력 무관</b> — 모션컨트롤은 입사 후 처음부터 교육하며, 공학 기초(자동화·전기전자·메카트로닉스·CS)와 영어 문서 독해면 충분합니다. <b>한국 온사이트</b>, 급여 협의, 월 PAYCO 30만 포인트 지원.',
  en: '<b>No experience required</b> — the company trains you in Motion Control from scratch; an engineering foundation (automation, electrical/electronics, mechatronics, CS) and reading English documentation are enough. <b>Onsite in Korea</b>, negotiable salary, 300,000 PAYCO points/month.',
})
const PRESTO_SALES_TAIL = d3Tail({
  vi: 'Phụ trách kinh doanh bộ điều khiển chuyển động <b>ACS</b> và các sản phẩm tự động hóa (Servo, I/O) cho khách hàng trong ngành <b>bán dẫn, màn hình (LCD/OLED), pin và robot</b>.',
  ko: '<b>ACS</b> 모션컨트롤러와 자동화 제품(Servo·I/O)을 <b>반도체·디스플레이(LCD/OLED)·배터리·로봇</b> 고객사에 영업합니다.',
  en: 'Sell <b>ACS</b> motion controllers and automation products (Servo, I/O) to customers in <b>semiconductors, displays (LCD/OLED), batteries and robotics</b>.',
}, {
  vi: 'Ưu tiên ứng viên có nền tảng kỹ thuật điện / điện tử / điều khiển / cơ khí hoặc kinh nghiệm bán hàng B2B công nghiệp. Làm việc tại <b>HCM · Đà Nẵng · Hà Nội</b>, lương thỏa thuận theo năng lực, có cơ hội công tác nước ngoài (công ty hỗ trợ chi phí visa đi Hàn Quốc).',
  ko: '전기·전자·제어·기계 배경 또는 산업재 B2B 영업 경험 우대. <b>호치민 · 다낭 · 하노이</b> 근무, 급여 협의, 해외 출장 기회(한국행 비자 비용 지원).',
  en: 'Preference for an electrical / electronics / control / mechanical background or industrial B2B sales experience. Based in <b>HCM · Da Nang · Hanoi</b>, negotiable salary, overseas business trips (Korea visa costs covered).',
})
const LIONROCKET_TAIL = d3Tail({
  vi: 'Sáng tạo nội dung quảng cáo — <b>short-form video, hình ảnh, UGC</b> — cho các kênh <b>Meta · TikTok · Instagram</b>, tìm insight và thử nghiệm nhiều format (Before/After, UGC, reaction).',
  ko: '<b>Meta · TikTok · Instagram</b> 광고 콘텐츠(<b>숏폼 영상·이미지·UGC</b>)를 제작하고, 인사이트 발굴과 포맷 실험(Before/After·UGC·리액션)을 진행합니다.',
  en: 'Create ad content — <b>short-form video, images, UGC</b> — for <b>Meta · TikTok · Instagram</b>, finding insights and testing formats (Before/After, UGC, reaction).',
}, {
  vi: 'Theo dõi CPA/ROAS của chính nội dung mình làm và cải thiện dựa trên dữ liệu. Làm việc tại <b>HCM · Đà Nẵng · Hà Nội</b>, lương <b>20–25 triệu</b>.',
  ko: '본인이 만든 콘텐츠의 CPA/ROAS를 직접 보며 데이터 기반으로 개선합니다. <b>호치민 · 다낭 · 하노이</b> 근무, 급여 <b>20–25 triệu</b>.',
  en: 'Track the CPA/ROAS of your own content and iterate on real data. Based in <b>HCM · Da Nang · Hanoi</b>, salary <b>20–25M VND</b>.',
})
// ── 현/직전연봉 수집 salary1 (scripts/outreach/salary-coldmail.mjs) ──
const SALARY_I18N = {
  vi: {
    hi: 'Chào {{name}},',
    p1: 'FYI đang trực tiếp tiến cử hồ sơ của bạn với các công ty. Khi biết mức lương của bạn, chúng tôi có thể <b>chỉ chọn những công ty có mức lương khiến bạn thực sự hài lòng</b> để tiến cử — mục tiêu của chúng tôi là giúp bạn chuyển việc với mức lương cao hơn.',
    p2: 'Vì vậy, chỉ cần cho chúng tôi biết <b>lương tháng hiện tại (hoặc ở công việc gần nhất)</b> của bạn — một con số, không cần đăng nhập, 30 giây. Thông tin này <b>không hiển thị với công ty</b>, chỉ dùng để chọn công ty xứng đáng với bạn.',
    cta: 'Nhập mức lương (30 giây) →',
    thanks: 'Cảm ơn bạn!<br>— Đội ngũ FYI',
    footer: 'Bạn nhận được email này vì đã đăng ký tài khoản trên FYI.',
  },
  ko: {
    hi: '안녕하세요 {{name}}님,',
    p1: 'FYI는 회원님 프로필을 기업에 직접 추천하고 있어요. 연봉을 알면 <b>정말 만족할 만한 연봉의 기업만 골라서</b> 추천할 수 있습니다 — 저희 목표는 회원님이 더 높은 연봉으로 이직하는 거예요.',
    p2: '그래서 <b>현재(또는 직전 직장) 월급</b> 숫자 하나만 부탁드려요 — 로그인 없이 30초면 됩니다. 이 정보는 <b>기업에 공개되지 않고</b>, 회원님이 만족할 기업을 고르는 데만 사용돼요.',
    cta: '연봉 입력하기 (30초) →',
    thanks: '감사합니다!<br>— FYI 팀 드림',
    footer: 'FYI에 가입하셔서 이 메일을 받으셨습니다.',
  },
  en: {
    hi: 'Hi {{name}},',
    p1: 'FYI is directly recommending your profile to companies. Once we know your salary, we can <b>recommend you only to companies whose pay would truly satisfy you</b> — our goal is to help you move to a higher salary.',
    p2: 'So please just tell us <b>your monthly salary at your current (or most recent) job</b> — one number, no login, 30 seconds. This is <b>never shown to companies</b>; it is only used to pick companies that deserve you.',
    cta: 'Enter my salary (30s) →',
    thanks: 'Thank you!<br>— The FYI team',
    footer: 'You received this email because you signed up on FYI.',
  },
}

// B 프레임(salary-b, 8/13 A/B) — photo1 검증 구조: 후보에 올랐다(기회)+연봉 미확인 보류(손실)+숫자 하나면 재개(복구).
const SALARY_B_I18N = {
  vi: {
    ...SALARY_I18N.vi,
    p1: 'Người phụ trách đã đưa hồ sơ của bạn vào <b>danh sách đề cử cho các công ty</b>. Nhưng vì chưa biết mức lương hiện tại của bạn, chúng tôi không thể xác nhận vị trí có phù hợp mức lương hay không — <b>quá trình xem xét đang bị tạm dừng</b>.',
    p2: 'Chỉ cần cho chúng tôi biết <b>lương tháng hiện tại (hoặc ở công việc gần nhất)</b> — một con số, không cần đăng nhập, 30 giây — <b>việc xem xét sẽ được tiếp tục ngay</b>. Thông tin này <b>không hiển thị với công ty</b>.',
    cta: 'Nhập mức lương để tiếp tục xem xét →',
  },
  ko: {
    ...SALARY_I18N.ko,
    p1: '담당자가 회원님 프로필을 <b>기업 추천 후보</b>에 올렸습니다. 그런데 현재 연봉을 몰라 연봉이 맞는 포지션인지 확인을 못 해 <b>검토가 멈춰 있어요</b>.',
    p2: '<b>현재(또는 직전 직장) 월급</b> 숫자 하나만 알려주시면 <b>검토가 바로 재개됩니다</b> — 로그인 없이 30초. 이 정보는 <b>기업에 공개되지 않아요</b>.',
    cta: '연봉 입력하고 검토 재개하기 →',
  },
  en: {
    ...SALARY_I18N.en,
    p1: 'A manager put your profile on the <b>nomination list for companies</b>. But without your current salary we cannot confirm whether the positions match your pay — <b>the review is on hold</b>.',
    p2: 'Just tell us <b>your monthly salary at your current (or most recent) job</b> — one number, no login, 30 seconds — and <b>the review resumes right away</b>. This is <b>never shown to companies</b>.',
    cta: 'Enter my salary to resume the review →',
  },
}

// C 프레임(salary-c, 8/19 재발송): B의 '보류'보다 강한 손실 — 1차 대기 리스트 등재→연봉 미확인으로
// 최종 명단 탈락→숫자 하나면 다음 명단. 62% 수치는 기업 VOC 실측(유저 확정 8/19).
const SALARY_C_I18N = {
  vi: {
    ...SALARY_I18N.vi,
    p1: 'Gần đây, khi chọn ứng viên để gửi offer cho doanh nghiệp, người phụ trách đã đưa hồ sơ của bạn vào <b>danh sách chờ vòng 1</b>. Nhưng rất tiếc, hồ sơ của bạn <b>không được chọn vào danh sách cuối cùng</b>.<br><br>Lý do: <b>chưa xác nhận được mức lương hiện tại của bạn</b>.',
    p2: 'Khi chưa biết mức lương, chúng tôi không thể xác định vị trí nào có điều kiện khiến bạn hài lòng, nên hồ sơ chưa xác nhận lương thường bị loại khỏi danh sách đề cử. Để không bỏ lỡ cơ hội tiếp theo, chỉ cần cho chúng tôi biết <b>lương tháng hiện tại (hoặc ở công việc gần nhất)</b> — một con số, không cần đăng nhập, 30 giây. <b>Hồ sơ đã xác nhận mức lương có tỷ lệ nhận offer cao hơn 62%.</b> Thông tin này <b>không hiển thị với công ty</b>.',
    cta: 'Nhập mức lương để vào danh sách tiếp theo →',
  },
  ko: {
    ...SALARY_I18N.ko,
    p1: '최근 기업에 보낼 오퍼 후보를 추리면서 담당자가 회원님 프로필을 <b>1차 대기 리스트</b>에 올렸습니다. 그런데 아쉽게도 <b>최종 명단에는 선정되지 못했습니다</b>.<br><br>사유: <b>현재 연봉이 확인되지 않아서</b>입니다.',
    p2: '연봉을 모르면 어떤 포지션이 회원님께 만족스러운 조건인지 판단할 수 없어, 연봉 미확인 프로필은 추천 명단에서 제외되는 경우가 많습니다. 다음 기회를 놓치지 않도록 <b>현재(또는 직전 직장) 월급</b> 숫자 하나만 알려주세요 — 로그인 없이 30초면 됩니다. <b>연봉이 확인된 프로필은 오퍼 확률이 62% 더 높습니다.</b> 이 정보는 <b>기업에 공개되지 않아요</b>.',
    cta: '연봉 입력하고 다음 명단에 오르기 →',
  },
  en: {
    ...SALARY_I18N.en,
    p1: 'Recently, while shortlisting candidates for company offers, a manager put your profile on the <b>round-1 waiting list</b>. Unfortunately, your profile <b>was not selected for the final list</b>.<br><br>Reason: <b>we could not confirm your current salary</b>.',
    p2: 'Without your salary we cannot tell which positions would truly satisfy you, so profiles with unconfirmed salary are often dropped from nomination lists. To not miss the next opportunity, just tell us <b>your monthly salary at your current (or most recent) job</b> — one number, no login, 30 seconds. <b>Profiles with a confirmed salary are 62% more likely to receive an offer.</b> This is <b>never shown to companies</b>.',
    cta: 'Enter my salary to make the next list →',
  },
}

const renderSalaryMail = (i18n) => (lang) => {
  const s = pickLang(i18n, lang)
  return `<!doctype html><html lang="vi"><head><meta charset="utf-8"></head>
<body style="margin:0;background:#faf9f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1a1612">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#faf9f7"><tr><td align="center" style="padding:28px 16px">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px">
  <tr><td style="padding-bottom:18px"><img src="https://salary-fyi.com/fyi-logo.png" height="24" alt="FYI" style="height:24px;width:auto;display:block"></td></tr>
  <tr><td style="font-size:15px;line-height:1.6;color:#1a1612;padding-bottom:6px">${s.hi}</td></tr>
  <tr><td style="font-size:14px;line-height:1.65;color:#4a443c;padding-bottom:14px">${s.p1}</td></tr>
  <tr><td style="font-size:14px;line-height:1.65;color:#4a443c;padding-bottom:6px">${s.p2}</td></tr>
  <tr><td align="center" style="padding:16px 0 6px">
    <a style="display:inline-block;background:#ff6000;color:#fff;font-weight:700;font-size:15px;text-decoration:none;padding:14px 30px;border-radius:12px">${s.cta}</a>
  </td></tr>
  <tr><td style="font-size:14px;line-height:1.65;color:#4a443c;padding-top:14px">${s.thanks}</td></tr>
  <tr><td style="font-size:11.5px;color:#a89f92;text-align:center;line-height:1.5;padding-top:20px">${s.footer}<br>— FYI · salary-fyi.com</td></tr>
</table></td></tr></table></body></html>`
}
const salaryHtml = renderSalaryMail(SALARY_I18N)
const salaryBHtml = renderSalaryMail(SALARY_B_I18N)
const salaryCHtml = renderSalaryMail(SALARY_C_I18N)

// ── KYNDOF·Collective 추천 (8/14, scripts/outreach/kyndof-recommend-coldmail.mjs) ──
// 14개 공고(KYN4001~4014)를 9개 발송 그룹으로 통합(1인 1통 배정), gpt-4o-mini 채점 4점+(ops1만 3점+).
// 통합 그룹 메일은 공고 카드가 최대 2개(대상자가 통과한 공고만 — 1개일 수도 있다). 프레임:
// public=공개 이력서(명단에 프로필 동봉), private=비공개(지원 시 CV 전달) — 둘 다 "이번 주
// 담당자에게 명단 전달"을 약속하므로 발송 후 킨도프 측에 추천 명단 실제 공유 의무.
const KYNDOF_I18N = {
  intro: {
    vi: '<b>KYNDOF</b> — công ty Hàn Quốc vận hành thương hiệu thời trang <b>2000Archives</b>, tổ chức sản xuất trang phục theo yêu cầu <b>2000Atelier</b> và nền tảng marketplace thời trang C2C <b>Collective</b> — đang tuyển dụng đồng thời nhiều vị trí then chốt qua FYI.',
    ko: '패션 브랜드 <b>2000Archives</b>, 맞춤 제작 <b>2000Atelier</b>, C2C 패션 마켓플레이스 <b>Collective</b>를 운영하는 한국 기업 <b>KYNDOF</b>가 FYI를 통해 주요 포지션을 동시 채용 중입니다.',
    en: '<b>KYNDOF</b> — a Korean company running the fashion brand <b>2000Archives</b>, the made-to-order studio <b>2000Atelier</b> and the C2C fashion marketplace <b>Collective</b> — is hiring for multiple key positions at once through FYI.',
  },
  hook: {
    vi: 'Đội ngũ FYI đã xem xét toàn bộ hồ sơ đã đăng ký và <b>chọn bạn vào danh sách đề cử</b> cho vị trí dưới đây — hồ sơ của bạn phù hợp với yêu cầu của vị trí này.',
    ko: 'FYI 팀이 등록된 이력서 전체를 검토해 회원님을 아래 포지션의 <b>추천 명단에 선정</b>했습니다 — 회원님의 이력이 이 포지션 요건에 부합합니다.',
    en: 'The FYI team reviewed every registered CV and <b>selected you for the nominee list</b> for the position below — your experience matches its requirements.',
  },
  benefit: {
    public: {
      vi: '<b>Trong tuần này</b>, FYI sẽ gửi danh sách đề cử trực tiếp cho người phụ trách tuyển dụng của KYNDOF. Hồ sơ của bạn đang ở chế độ công khai nên sẽ được gửi kèm danh sách. Nếu bạn ứng tuyển ngay, CV của bạn sẽ được <b>ưu tiên xem xét</b> cùng lời giới thiệu từ FYI.',
      ko: '<b>이번 주에</b> FYI가 킨도프 채용 담당자에게 추천 명단을 직접 전달합니다. 회원님 이력서는 공개 상태라 명단과 함께 프로필이 전달됩니다. 지금 지원하시면 FYI의 추천과 함께 <b>우선 검토</b>됩니다.',
      en: '<b>This week</b>, FYI will send the nominee list directly to KYNDOF\'s recruiter. Your resume is public, so your profile goes with the list. Apply now and your CV gets <b>priority review</b> with FYI\'s recommendation.',
    },
    private: {
      vi: '<b>Trong tuần này</b>, FYI sẽ gửi danh sách đề cử trực tiếp cho người phụ trách tuyển dụng của KYNDOF. Hồ sơ của bạn đang ở chế độ riêng tư — nếu bạn ứng tuyển ngay, CV của bạn sẽ được gửi kèm lời giới thiệu từ FYI và được <b>ưu tiên xem xét</b>.',
      ko: '<b>이번 주에</b> FYI가 킨도프 채용 담당자에게 추천 명단을 직접 전달합니다. 회원님 이력서는 비공개 상태라, 지금 지원하시면 CV가 FYI의 추천과 함께 전달되어 <b>우선 검토</b>됩니다.',
      en: '<b>This week</b>, FYI will send the nominee list directly to KYNDOF\'s recruiter. Your resume is private — apply now and your CV goes with FYI\'s recommendation and gets <b>priority review</b>.',
    },
  },
}
const KYNDOF_GROUPS = [
  { key: 'tech1', role: { vi: 'Tech Lead / Backend Marketplace', ko: '테크리드·백엔드', en: 'Tech Lead / Backend (Marketplace)' }, jobs: ['Tech Lead / Engineering Manager', 'Backend Marketplace'] },
  { key: 'growth1', role: { vi: 'Growth Marketing & Marketplace Marketing', ko: '그로스 마케팅', en: 'Growth & Marketplace Marketing' }, jobs: ['Growth Marketing & Cộng đồng', 'Growth & Marketplace Marketing Manager'] },
  { key: 'design1', role: { vi: 'Graphic Designer / Product Designer UX·UI', ko: '그래픽·프로덕트 디자이너', en: 'Graphic / Product Designer (UX·UI)' }, jobs: ['Graphic Designer/ Editor', 'Product Designer UX/UI'] },
  { key: 'mobile1', role: { vi: 'Kỹ sư Frontend (Ứng dụng Di động)', ko: '프론트엔드(모바일 앱)', en: 'Frontend Engineer (Mobile App)' }, jobs: ['Kỹ sư Frontend (Ứng dụng Di động)'] },
  { key: 'ops1', role: { vi: 'Vận hành TMĐT & Marketplace', ko: '이커머스·마켓플레이스 운영', en: 'E-commerce & Marketplace Operations' }, jobs: ['Nhân viên Vận hành Thương mại điện tử & Chăm sóc khách hàng', 'Marketplace Operations Manager'] },
  { key: 'data1', role: { vi: 'Kỹ sư Tự động hóa & Vận hành Dữ liệu', ko: '자동화·데이터 운영 엔지니어', en: 'Automation & Data Operations Engineer' }, jobs: ['Kỹ sư Tự động hóa & Vận hành Dữ liệu'] },
  { key: 'atelier1', role: { vi: 'Vận hành Kinh doanh & Dự án Atelier', ko: 'Atelier 사업·프로젝트 운영', en: 'Atelier Business & Project Operations' }, jobs: ['Nhân viên Vận hành Kinh doanh & Dự án Atelier'] },
  { key: 'research1', role: { vi: 'Associate Nghiên cứu & Vận hành', ko: '리서치·운영 Associate', en: 'Research & Operations Associate' }, jobs: ['Associate Nghiên cứu & Vận hành'] },
  { key: 'pm1', role: { vi: 'Product Manager / Hoạch định Dịch vụ', ko: 'PM/서비스기획', en: 'Product Manager / Service Planning' }, jobs: ['Product Manager / Chuyên viên Hoạch định Dịch vụ'] },
]
const kyndofCard = (title) => `<table width="100%" cellpadding="0" cellspacing="0" style="background:#fff;border:1px solid #eee5da;border-radius:14px;margin-bottom:8px"><tr>
  <td width="44" style="padding:14px 0 14px 14px;vertical-align:middle"><div style="width:44px;height:44px;border-radius:10px;background:#fff0e6;color:#ff6000;font-weight:800;font-size:16px;text-align:center;line-height:44px">K</div></td>
  <td style="padding:14px 14px 14px 12px;vertical-align:middle">
    <div style="font-size:12px;color:#8a8073;margin-bottom:3px">KYNDOF · Collective</div>
    <div style="font-size:14.5px;font-weight:700;color:#1a1612;line-height:1.35">${title}</div>
    <div style="font-size:12px;color:#b0691a;margin-top:3px">HCM, ĐN, HN</div>
  </td>
</tr></table>`
const kyndofHtml = (frame, g) => (lang) => {
  const s = pickLang(SHELL_I18N, lang)
  return `<!doctype html><html lang="vi"><head><meta charset="utf-8"></head>
<body style="margin:0;background:#faf9f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1a1612">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#faf9f7"><tr><td align="center" style="padding:28px 16px">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px">
  <tr><td style="padding-bottom:18px"><img src="https://salary-fyi.com/fyi-logo.png" height="24" alt="FYI" style="height:24px;width:auto;display:block"></td></tr>
  <tr><td style="font-size:15px;line-height:1.6;color:#1a1612;padding-bottom:6px">${s.greeting}</td></tr>
  <tr><td style="font-size:14px;line-height:1.65;color:#4a443c;padding-bottom:14px">${pickLang(KYNDOF_I18N.intro, lang)}</td></tr>
  <tr><td style="font-size:14px;line-height:1.65;color:#4a443c;padding-bottom:14px">${pickLang(KYNDOF_I18N.hook, lang)}</td></tr>
  <tr><td style="padding-bottom:10px">${g.jobs.map(kyndofCard).join('')}</td></tr>
  <tr><td style="font-size:14px;line-height:1.65;color:#4a443c;padding-top:4px">${pickLang(KYNDOF_I18N.benefit[frame], lang)} ${s.onetap}</td></tr>
  <tr><td align="center" style="padding:16px 0 6px">
    <a style="display:inline-block;background:#ff6000;color:#fff;font-weight:700;font-size:15px;text-decoration:none;padding:14px 30px;border-radius:12px">${s.cta}</a>
  </td></tr>
  <tr><td style="font-size:11.5px;color:#a89f92;text-align:center;line-height:1.5;padding-top:20px">${s.footer}</td></tr>
</table></td></tr></table></body></html>`
}
const KYNDOF_TEMPLATES = KYNDOF_GROUPS.flatMap((g) => ['public', 'private'].map((frame) => ({
  match: new RegExp(`^kyndof\\d?-${g.key}-${frame}`), // kyndof2-* = 웨이브2(8/18 컷 완화)
  subject: frame === 'public'
    ? {
      vi: `[FYI] Bạn được chọn vào danh sách đề cử gửi KYNDOF — ${g.role.vi}`,
      ko: `[FYI] KYNDOF 추천 명단에 선정되셨습니다 — ${g.role.ko}`,
      en: `[FYI] You're on the nominee list sent to KYNDOF — ${g.role.en}`,
    }
    : {
      vi: `[FYI] Bạn được chọn vào danh sách đề cử — ${g.role.vi} tại KYNDOF·Collective`,
      ko: `[FYI] 추천 후보 명단에 선정되셨습니다 — KYNDOF·Collective ${g.role.ko}`,
      en: `[FYI] You've been selected for the nominee list — ${g.role.en} at KYNDOF·Collective`,
    },
  desc: `킨도프 ${g.role.ko} 추천 · ${frame === 'public' ? '공개' : '비공개'} 프레임 (8/14): 14개 공고→9그룹 통합·1인 1통, gpt-4o-mini 채점 ${g.key === 'ops1' ? '3점+(운영만 완화)' : '4점+'}. 카드는 대상자가 통과한 공고만(1~2개). ⚠️"이번 주 명단 전달" 카피 — 킨도프 측 실제 공유 의무.`,
  source: 'scripts/outreach/kyndof-recommend-coldmail.mjs',
  html: kyndofHtml(frame, g),
})))

// ── 8/18 공고 추천 4종 (moen·andwise·nexacode 세일즈·nexacode 디자이너) + 8/25 nexacode 그래픽(JD 전환 재발송) — kyndof 정직 프레임, 단일 공고 카드 ──
// 스크립트: jic-moen-recommend-coldmail.mjs(moen) / aw-nx-recommend-coldmail.mjs(andwise·nexacode) / nx-designer-recommend-coldmail.mjs(디자이너) / nx-graphic-recommend-coldmail.mjs(그래픽)
const REC0818_GROUPS = [
  {
    key: 'moen', company: 'Moen', initial: 'M',
    title: 'AI-Powered Designer (Thực tập sinh/Trainee)', meta: 'Hồ Chí Minh · Hà Nội · Đà Nẵng',
    role: { vi: 'Brand · AI-Powered Designer (Trainee)', ko: '브랜드 · AI 디자이너 (인턴/트레이니)', en: 'Brand · AI-Powered Designer (Trainee)' },
    source: 'scripts/outreach/jic-moen-recommend-coldmail.mjs',
    note: '모엔 F&B AI 디자이너 인턴 추천 (8/18 77명): 디자인 계열 570명 gpt-4o-mini 채점 3점+.',
    intro: {
      vi: '<b>Moen</b> — thương hiệu F&B Hàn Quốc đang xây dựng hình ảnh trên Instagram, Smart Store và website riêng — đang tuyển <b>Brand · AI-Powered Designer (Thực tập sinh/Trainee)</b> tại Hồ Chí Minh · Hà Nội · Đà Nẵng. <b>Không yêu cầu kinh nghiệm làm việc</b> — chỉ cần portfolio và kinh nghiệm dùng công cụ tạo ảnh AI (Midjourney, Firefly, v.v.), kể cả từ dự án cá nhân.',
      ko: '인스타그램·스마트스토어·자사몰 브랜딩을 하는 한국 F&B 브랜드 <b>Moen</b>이 <b>브랜드 · AI 디자이너 인턴(트레이니)</b>을 호치민·하노이·다낭에서 채용 중입니다. <b>경력 무관</b> — 포트폴리오와 AI 이미지 툴(미드저니·파이어플라이 등) 사용 경험(개인 프로젝트 인정)이면 충분합니다.',
      en: '<b>Moen</b> — a Korean F&B brand building its presence on Instagram, Smart Store and its own website — is hiring a <b>Brand · AI-Powered Designer (Trainee)</b> in HCMC · Hanoi · Da Nang. <b>No work experience required</b> — just a portfolio and hands-on experience with AI image tools (Midjourney, Firefly, etc.), personal projects included.',
    },
  },
  {
    key: 'andwise', company: 'Andwise', initial: 'A',
    title: 'Backend Senior Developer', meta: 'Đà Nẵng',
    role: { vi: 'Backend Senior Developer (Java·Spring)', ko: '백엔드 시니어 개발자 (Java·Spring)', en: 'Backend Senior Developer (Java·Spring)' },
    source: 'scripts/outreach/aw-nx-recommend-coldmail.mjs',
    note: '앤드와이즈 백엔드 시니어 추천 (8/18 57명): Java/백엔드 2.5y+ 249명 채점 3점+(3점=비Java 백엔드 포함). 공고 source_id 없음 — jobs.id 직접 참조.',
    intro: {
      vi: '<b>Andwise</b> đang tuyển vị trí <b>Backend Senior Developer</b> làm việc tại <b>Đà Nẵng</b> — vị trí senior yêu cầu tối thiểu 3 năm kinh nghiệm backend <b>Java·Spring</b>, có kinh nghiệm technical leadership / dẫn dắt dự án; kinh nghiệm Python·AI/ML là lợi thế lớn.',
      ko: '<b>Andwise</b>가 <b>다낭</b> 근무 <b>백엔드 시니어 개발자</b>를 채용 중입니다. <b>Java·Spring</b> 백엔드 3년 이상, 테크니컬 리더십/프로젝트 리딩 경험 필수이며 Python·AI/ML 경험은 큰 우대 요소입니다.',
      en: '<b>Andwise</b> is hiring a <b>Backend Senior Developer</b> based in <b>Da Nang</b> — a senior role requiring 3+ years of <b>Java·Spring</b> backend experience and technical leadership / project leading; Python·AI/ML experience is a big plus.',
    },
  },
  {
    key: 'nexacode', company: 'Nexacode', initial: 'N',
    title: 'B2B Sales & Marketing Executive', meta: 'Remote (HCM · Hà Nội · Đà Nẵng)',
    role: { vi: 'B2B Sales & Marketing Executive', ko: 'B2B 세일즈 & 마케팅 담당자', en: 'B2B Sales & Marketing Executive' },
    source: 'scripts/outreach/aw-nx-recommend-coldmail.mjs',
    note: '넥사코드 B2B 세일즈 추천 (8/18 24명): 세일즈/마케팅 계열 717명 채점 3점+(3점=인접 직군 포함).',
    intro: {
      vi: '<b>Nexacode</b> — công ty phần mềm xây dựng sản phẩm SaaS, ERP và giải pháp chuyển đổi số — đang tuyển <b>B2B Sales & Marketing Executive</b> làm việc <b>hoàn toàn từ xa (remote)</b>. <b>Không yêu cầu kinh nghiệm</b> — chỉ cần quan tâm đến B2B sales/marketing, có khả năng nghiên cứu doanh nghiệp và giao tiếp tốt qua email·văn bản; kinh nghiệm cold email, CRM hay công cụ AI (ChatGPT, v.v.) là lợi thế.',
      ko: 'SaaS·ERP·DX 소프트웨어 회사 <b>Nexacode</b>가 <b>풀리모트</b> <b>B2B 세일즈 & 마케팅 담당자</b>를 채용 중입니다. <b>경력 무관</b> — B2B 세일즈/마케팅에 대한 관심, 기업 리서치, 이메일·문서 커뮤니케이션이면 충분하고 콜드메일·CRM·AI 툴 경험은 우대입니다.',
      en: '<b>Nexacode</b> — a software company building SaaS, ERP and digital-transformation products — is hiring a <b>B2B Sales & Marketing Executive</b>, <b>fully remote</b>. <b>No experience required</b> — an interest in B2B sales/marketing, company research skills and strong written communication are enough; cold email, CRM or AI-tool experience is a plus.',
    },
  },
  {
    key: 'nexacode-designer', company: 'Nexacode', initial: 'N',
    title: 'Web / UI·UX Designer', meta: 'Remote',
    role: { vi: 'Web / UI·UX Designer', ko: '웹/UI·UX 디자이너', en: 'Web / UI·UX Designer' },
    source: 'scripts/outreach/nx-designer-recommend-coldmail.mjs',
    note: '넥사코드 웹/UI·UX 디자이너 추천 (8/18): 디자인 계열 2.5y+ 159명 gpt-4o-mini 채점 3점+(풀 얇아 전원 발송).',
    intro: {
      vi: '<b>Nexacode</b> — công ty phần mềm xây dựng sản phẩm SaaS, ERP và giải pháp chuyển đổi số — đang tuyển <b>Web / UI·UX Designer</b> làm việc <b>hoàn toàn từ xa (remote)</b>. Công việc tập trung vào thiết kế UI/UX web·mobile trên <b>Figma</b> (wireframe·prototype), landing page và website doanh nghiệp, màn hình admin/dashboard cho sản phẩm B2B, cùng các ấn phẩm marketing (banner, SNS) và tài liệu doanh nghiệp (PPT, proposal). Ưu tiên ứng viên có <b>từ 3 năm kinh nghiệm</b> và portfolio; kinh nghiệm làm việc tại công ty toàn cầu là lợi thế.',
      ko: 'SaaS·ERP·DX 소프트웨어 회사 <b>Nexacode</b>가 <b>풀리모트</b> <b>웹/UI·UX 디자이너</b>를 채용 중입니다. <b>Figma</b> 기반 웹·모바일 UI/UX(화면설계·프로토타입), 랜딩페이지·기업 홈페이지, 어드민·대시보드 등 B2B 화면과 배너·SNS 마케팅 디자인, PPT·제안서까지 폭넓게 다루는 포지션으로, <b>경력 3년 이상</b>·포트폴리오 보유자를 우대하며 글로벌 기업 근무 이력은 큰 우대 요소입니다.',
      en: '<b>Nexacode</b> — a software company building SaaS, ERP and digital-transformation products — is hiring a <b>Web / UI·UX Designer</b>, <b>fully remote</b>. The role covers web·mobile UI/UX in <b>Figma</b> (wireframes·prototypes), landing pages and corporate websites, admin/dashboard screens for B2B products, plus marketing assets (banners, social content) and business documents (PPT, proposals). <b>3+ years of experience</b> and a portfolio preferred; experience at a global company is a plus.',
    },
  },
  {
    key: 'nexacode-graphic', company: 'Nexacode', initial: 'N',
    title: 'Web/Graphic Designer', meta: 'Remote',
    role: { vi: 'Web / Graphic Designer', ko: '웹/그래픽 디자이너', en: 'Web / Graphic Designer' },
    source: 'scripts/outreach/nx-graphic-recommend-coldmail.mjs',
    note: '넥사코드 웹/그래픽 디자이너 추천 (8/25): JD가 UI/UX→그래픽 중심으로 수정돼 재발송(같은 공고 ID, 8/18 발송분 제외). 디자인 계열 연차 무관 443명 그래픽 루브릭 재채점 3점+ 96명.',
    intro: {
      vi: '<b>Nexacode</b> — công ty phần mềm xây dựng sản phẩm SaaS, ERP và giải pháp chuyển đổi số — đang tuyển <b>Web / Graphic Designer</b> làm việc <b>hoàn toàn từ xa (remote)</b>. Công việc tập trung vào thiết kế ấn phẩm quảng cáo số·banner, nội dung SNS·thumbnail, landing page·trang khuyến mãi, trang chi tiết sản phẩm·dịch vụ, website doanh nghiệp·brand, cùng tài liệu doanh nghiệp (PPT, proposal); khi cần có thể tham gia thiết kế·cải thiện UI web·mobile. Yêu cầu sử dụng thành thạo <b>Figma</b>, có nền tảng thiết kế thị giác (layout·typography·màu sắc) và portfolio; kinh nghiệm Photoshop·Illustrator là lợi thế.',
      ko: 'SaaS·ERP·DX 소프트웨어 회사 <b>Nexacode</b>가 <b>풀리모트</b> <b>웹/그래픽 디자이너</b>를 채용 중입니다. 디지털 광고 소재·배너, SNS 콘텐츠·썸네일, 랜딩·프로모션·상세페이지, 기업 홈페이지·브랜드 웹페이지, PPT·제안서 등 그래픽·시각 디자인이 중심이고 필요시 웹·앱 UI 디자인·개선도 일부 다룹니다. <b>Figma</b> 활용과 시각 디자인 기본기(레이아웃·타이포·컬러), 포트폴리오가 필요하며 Photoshop·Illustrator 경험은 우대 요소입니다.',
      en: '<b>Nexacode</b> — a software company building SaaS, ERP and digital-transformation products — is hiring a <b>Web / Graphic Designer</b>, <b>fully remote</b>. The role centers on digital ad creatives·banners, SNS content·thumbnails, landing·promotion·detail pages, corporate & brand web pages, and business documents (PPT, proposals), with occasional web·mobile UI design/improvement. Requires <b>Figma</b>, solid visual-design fundamentals (layout·typography·color) and a portfolio; Photoshop·Illustrator experience is a plus.',
    },
  },
]
const rec0818Benefit = (frame, c) => ({
  vi: `<b>Trong tuần này</b>, FYI sẽ gửi danh sách đề cử trực tiếp cho người phụ trách tuyển dụng của ${c}. ` + (frame === 'public'
    ? 'Hồ sơ của bạn đang ở chế độ công khai nên sẽ được gửi kèm danh sách. Nếu bạn ứng tuyển ngay, CV của bạn sẽ được <b>ưu tiên xem xét</b> cùng lời giới thiệu từ FYI.'
    : 'Hồ sơ của bạn đang ở chế độ riêng tư — nếu bạn ứng tuyển ngay, CV của bạn sẽ được gửi kèm lời giới thiệu từ FYI và được <b>ưu tiên xem xét</b>.'),
  ko: `<b>이번 주에</b> FYI가 ${c} 채용 담당자에게 추천 명단을 직접 전달합니다. ` + (frame === 'public'
    ? '회원님 이력서는 공개 상태라 명단과 함께 프로필이 전달됩니다. 지금 지원하시면 FYI의 추천과 함께 <b>우선 검토</b>됩니다.'
    : '회원님 이력서는 비공개 상태라, 지금 지원하시면 CV가 FYI의 추천과 함께 전달되어 <b>우선 검토</b>됩니다.'),
  en: `<b>This week</b>, FYI will send the nominee list directly to ${c}'s recruiter. ` + (frame === 'public'
    ? 'Your profile is public, so it goes along with the list. If you apply now, your CV gets <b>priority review</b> with FYI\'s recommendation.'
    : 'Your profile is private — if you apply now, your CV is delivered with FYI\'s recommendation and gets <b>priority review</b>.'),
})
const REC0818_TEMPLATES = REC0818_GROUPS.flatMap((g) => ['public', 'private'].map((frame) => ({
  match: new RegExp(`^${g.key}-recommend\\d-${frame}`), // recommend2 = 웨이브2(8/18 컷 완화)
  subject: frame === 'public'
    ? {
      vi: `[FYI] Bạn được chọn vào danh sách đề cử gửi ${g.company} — ${g.role.vi}`,
      ko: `[FYI] ${g.company} 추천 명단에 선정되셨습니다 — ${g.role.ko}`,
      en: `[FYI] You're on the nominee list sent to ${g.company} — ${g.role.en}`,
    }
    : {
      vi: `[FYI] Bạn được chọn vào danh sách đề cử — ${g.role.vi} tại ${g.company}`,
      ko: `[FYI] 추천 후보 명단에 선정되셨습니다 — ${g.company} ${g.role.ko}`,
      en: `[FYI] You've been selected for the nominee list — ${g.role.en} at ${g.company}`,
    },
  desc: `${g.note} ${frame === 'public' ? '공개' : '비공개'} 프레임(kyndof 정직 프레임). ⚠️"이번 주 명단 전달" 카피 — 기업 측 실제 공유 의무.`,
  source: g.source,
  html: (lang) => recommendShell(lang, {
    intro: {
      vi: `${g.intro.vi} ${KYNDOF_I18N.hook.vi}`,
      ko: `${g.intro.ko} ${KYNDOF_I18N.hook.ko}`,
      en: `${g.intro.en} ${KYNDOF_I18N.hook.en}`,
    },
    initial: g.initial, company: g.company, title: g.title, meta: g.meta,
    tail: rec0818Benefit(frame, g.company),
  }),
})))

export const COLDMAIL_TEMPLATES = [
  ...REC0818_TEMPLATES,
  ...KYNDOF_TEMPLATES,
  {
    match: /^salary-c/,
    subject: {
      vi: 'Bạn chưa được chọn vào danh sách đề cử lần này — lý do: chưa xác nhận mức lương',
      ko: '회원님이 이번 추천 명단에서 제외되었습니다 — 사유: 연봉 미확인',
      en: 'You were not selected for this nomination list — reason: salary unconfirmed',
    },
    desc: '연봉수집 C 프레임(8/19 재발송 salary-c-0819): B의 \'보류\'보다 강한 손실 — "1차 대기 리스트에 올랐지만 연봉 미확인으로 최종 명단 탈락, 숫자 하나면 다음 명단" (photo 손실 프레임 유저 초안 이식). 62% 수치는 기업 VOC 실측(유저 확정). 대상=기발송 1,622 중 미기입·미수신거부·당일 미접촉(--resend --skip-today).',
    source: 'scripts/outreach/salary-coldmail.mjs --resend --campaign salary-c-0819 --skip-today',
    html: salaryCHtml,
  },
  {
    match: /^salary-b/,
    subject: {
      vi: 'Đề cử của bạn đang bị tạm dừng — vì chưa xác nhận được mức lương',
      ko: '회원님 추천이 보류 중입니다 — 연봉 확인이 안 돼서요',
      en: 'Your nomination is on hold — we could not confirm your salary',
    },
    desc: '연봉수집 B 프레임(8/13): photo1 검증 구조 이식 — "추천 후보에 올랐는데 연봉 미확인으로 검토 보류, 숫자 하나면 재개" 손실 프레임. 랜딩(/salary-update)도 같은 문구로 분기(frameB). salary-b=A/B 200명(1h 클릭 26.5%로 A 3배·photo 동시점 상회), salary-b-full=사인 후 잔여 1,222명 벌크(같은 양식).',
    source: 'scripts/outreach/salary-coldmail.mjs --campaign salary-b',
    html: salaryBHtml,
  },
  {
    match: /^salary/,
    subject: {
      vi: 'FYI đang tiến cử bạn với các công ty — chỉ cần cho chúng tôi 1 con số',
      ko: 'FYI가 회원님을 기업에 추천하고 있어요 — 숫자 하나만 알려주세요',
      en: 'FYI is recommending you to companies — just give us 1 number',
    },
    desc: '현/직전연봉 수집 A 프레임 salary-a(구 salary1, 8/13 200명): "FYI가 너를 기업에 추천하는데, 연봉을 알면 정말 만족할 기업만 골라줄 수 있다(목표=연봉 상승)" 정중한 ask 앵글 + 기업 비공개 강조. 무로그인 토큰 랜딩(/salary-update)에서 현재/직전 토글 + 숫자 한 칸(triệu/월) 입력 → current_salary 저장.',
    source: 'scripts/outreach/salary-coldmail.mjs',
    html: salaryHtml,
  },
  {
    match: /^photo-remind/,
    subject: {
      vi: 'Những người đã thêm ảnh hồ sơ nhận được 1–2 offer chỉ trong 3 ngày',
      ko: '사진을 추가한 분들은 3일 안에 오퍼 1~2건을 받았습니다',
      en: 'People who added a photo received 1–2 offers within 3 days',
    },
    desc: '프로필 사진 재발송 photo-remind1(8/11 photo1·photo2 미전환 코호트): "그때 사진 올린 사람들은 3일 내 오퍼 1~2건 받았다" 사회적 증거 + "당장 이직 생각 없어도 오퍼·면접 = 시장가치 확인" 카운터 앵글(유저 확정 카피). 동일 원클릭 토큰 랜딩(/photo-upload).',
    source: 'scripts/outreach/photo-coldmail.mjs --remind',
    html: photoRemindHtml,
  },
  {
    match: /^photo/,
    subject: {
      vi: 'Bạn đã vào danh sách chờ nhận offer — nhưng chưa được chọn (lý do: thiếu ảnh hồ sơ)',
      ko: '오퍼 대기 리스트에 올랐지만 아쉽게 선정되지 않았습니다 (사유: 프로필 사진 없음)',
      en: 'You were on an offer shortlist — but not selected (reason: no profile photo)',
    },
    desc: '프로필 사진 등록 유도 photo1(8/5 769명)·photo2(8/6 잔여 269명)·photo3(8/11 신규 유입 353명, 동일 양식·코호트만 분리): "담당자가 오퍼 1차 대기 리스트에 올렸으나 사진 없음 사유로 미선정" 프레임 + 사진 있는 프로필 오퍼 확률 62%↑(유저 확정 카피). 원클릭 토큰 랜딩(/photo-upload)에서 로그인 없이 업로드 → vision 인물사진 검증 후 즉시 반영.',
    source: 'scripts/outreach/photo-coldmail.mjs',
    html: photoColdmailHtml,
  },
  {
    match: /^coldmail-ktc-cv-remind1-0805/,
    subject: {
      vi: '{{name}} ơi, những người nhận hồ sơ trước bạn đã có trung bình 2,1 lời mời việc làm',
      ko: '{{name}}님, 프로필을 먼저 받아간 분들은 이미 평균 2.1건의 오퍼를 받았습니다',
      en: '{{name}}, people who claimed before you already have 2.1 job offers on average',
    },
    desc: 'CV 클레임 리마인드 8/5분(8/4 신규 719 코호트 미클릭 607): 제목만 "먼저/이미 받았다" FOMO 강조로 변형 — 8/4 remind1 제목과 코호트별 A/B. 본문은 remind1과 동일.',
    source: 'scripts/outreach/ktc-claim-coldmail.mjs --remind --campaign coldmail-ktc-cv-remind1-0805',
    html: ktcClaimHtml,
  },
  {
    match: /^coldmail-ktc-cv-remind/,
    subject: {
      vi: '{{name}} ơi, những người đã nhận hồ sơ đang có trung bình 2,1 lời mời việc làm',
      ko: '{{name}}님, 프로필을 받아간 분들은 평균 2.1건의 오퍼를 받았습니다',
      en: '{{name}}, people who claimed their profile got 2.1 offers on average',
    },
    desc: 'KTC 4차(CV 클레임) 리마인드 8/4분(8/3 코호트 미클릭 380): 원본 수신 24h+ 미클릭·미가입 리드에게 "받아간 사람들은 평균 오퍼 2.1건"(실측) 사회적 증거 훅. 본문은 클레임 양식에서 헤드라인·앞 두 문단만 교체 — 미리보기는 원양식 기준.',
    source: 'scripts/outreach/ktc-claim-coldmail.mjs --remind',
    html: ktcClaimHtml,
  },
  {
    match: /^coldmail-ktc-cv-revive/,
    subject: KTC_CLAIM_SUBJECT,
    desc: 'KTC 4차(CV 클레임)와 완전히 같은 양식의 재발송 — 1~3차(구 앵글) 수신 후 무반응이었던 리드 대상 (8/4). "이미 한 번 무시한 풀에도 클레임 앵글이 먹히는지" 분리 측정용.',
    source: 'scripts/outreach/ktc-claim-coldmail.mjs --revive',
    html: ktcClaimHtml,
  },
  {
    match: /^coldmail-ktc-cv/,
    subject: KTC_CLAIM_SUBJECT,
    desc: 'KTC 4차 · CV 클레임 (8/3~): "KTC 지원 때 낸 CV로 네 프로필을 미리 만들어뒀다" 소유 프레임. 카드에 본인 실데이터(실명·대학·직무) 표시, 랜딩 /ktc/claim 리치카드 → 가입 즉시 CV 자동 임포트.',
    source: 'scripts/outreach/ktc-claim-coldmail.mjs + scripts/ktc-claim-coldmail-vi.html',
    html: ktcClaimHtml,
  },
  {
    match: /^coldmail-ktc-3/,
    subject: {
      vi: 'K-Tech College - {{직무}} — hồ sơ của bạn đang ở bước nào?',
      ko: 'K-Tech College - {{직무}} — 내 지원서는 지금 어느 단계일까요?',
      en: 'K-Tech College - {{직무}} — where is your application now?',
    },
    desc: 'KTC 3차 · 지원현황 앵글 (7/31): "KTC는 최종 합격자에게만 연락했다 → FYI로 넣는 지원은 단계가 다 보인다". 제목 앵커를 발신자 정체성(K-Tech College)으로 복귀시켜 2차의 미끼-전환 문제를 수정.',
    source: 'scripts/outreach/ktc-coldmail.mjs + scripts/ktc-coldmail-vi.html',
    html: ktcStatusHtml,
  },
  {
    match: /^coldmail-ktc-2/,
    subject: '{{기업명}} - {{직무}} — (기업명 개인화 실험)',
    desc: 'KTC 2차 (7/29): 제목을 지원했던 기업명으로 개인화한 실험. 오픈 38.6%로 멀쩡했지만 열어보니 그 기업이 보낸 메일이 아니어서 클릭 1%로 죽음(미끼-전환). 본문 원문은 git 히스토리에만 남아있음.',
    source: 'scripts/outreach/ktc-coldmail.mjs (당시 버전)',
    html: null,
  },
  {
    match: /^coldmail-ktc/,
    subject: 'KTC - {{직무}} (1차 초기 앵글)',
    desc: 'KTC 1차 (7/28): FYI 소개 일반 안내 톤. 클릭 8%·가입 2.5%. 본문 원문은 git 히스토리에만 남아있음.',
    source: 'scripts/outreach/ktc-coldmail.mjs (당시 버전)',
    html: null,
  },
  {
    match: /^coldmail1/,
    subject: {
      vi: 'CV của bạn đang ẩn — công khai để nhận thưởng 1.000.000₫ 🎁',
      ko: 'CV가 비공개 상태예요 — 공개하고 1,000,000₫ 축하금 받으세요 🎁',
      en: 'Your CV is hidden — make it public to claim 1,000,000₫ 🎁',
    },
    desc: '이력서 공개 전환 1차 (7/14): /cv 축하금 이벤트 등록자 중 비공개 보유자에게 "공개해야 이벤트 참여 자격" 훅. 버튼 = go-public 원클릭 공개 전환.',
    source: 'scripts/outreach/resume-public-coldmail.mjs',
    html: coldmail1Html,
  },
  {
    match: /^jobs1/,
    subject: {
      vi: 'CV của bạn đã sẵn sàng — ứng tuyển {{N}} vị trí đang tuyển gấp chỉ với 1 chạm',
      ko: 'CV가 준비됐어요 — 급히 채용 중인 {{N}}개 포지션에 원탭 지원',
      en: 'Your CV is ready — 1-tap apply to {{N}} urgent openings',
    },
    desc: '공고 원탭 지원 (7/15): 비-cv 미공개 이력서 보유자에게 "이미 올린 CV로 원클릭 지원" 앵글. 버튼 = 공개 전환 + 공고 리스트 랜딩(quick-apply 원탭).',
    source: 'scripts/outreach/resume-public-jobs-coldmail.mjs',
    html: jobs1Html,
  },
  {
    match: /^recommend1/,
    subject: {
      vi: '[FYI] {{회사}} và {{N}} công ty khác muốn xem hồ sơ của bạn',
      ko: '[FYI] {{회사}} 외 {{N}}개 기업이 회원님의 프로필을 보고 싶어 합니다',
      en: '[FYI] {{회사}} and {{N}} other companies want to see your profile',
    },
    desc: '담당자 추천 (7/16): 공개 이력서 풀을 스킬·연차·JD로 활성 공고와 매칭, "담당자가 FYI 추천을 받아 보냈다" 톤으로 상위 3개 공고 카드. 버튼 = 원클릭 랜딩 + 원탭 지원.',
    source: 'scripts/outreach/recommend-jobs-coldmail.mjs',
    html: recommend1Html,
  },
  {
    match: /^nalda-/,
    subject: invitedSubject('NALDA'),
    desc: 'NALDA 단일공고 추천 (7/29): "담당자가 이력서 보고 이 공고를 보냈다 · 우선검토" 톤. React·TypeScript·Firebase 매칭 풀 대상.',
    source: 'scripts/outreach/nalda-recommend-coldmail.mjs',
    html: (lang) => recommendShell(lang, {
      intro: {
        vi: 'Nhà tuyển dụng của <b>NALDA</b> — công ty công nghệ đang vận hành ứng dụng quản lý thời gian <b>Timing</b> — đã xem hồ sơ của bạn trên FYI và <b>gửi cho bạn vị trí này</b> vì kinh nghiệm của bạn phù hợp với yêu cầu (React · TypeScript · Firebase).',
        ko: '시간 관리 앱 <b>Timing</b>을 운영하는 테크 기업 <b>NALDA</b>의 채용 담당자가 FYI에서 회원님의 프로필을 확인하고, 경력이 요구사항(React · TypeScript · Firebase)과 맞아 <b>이 포지션을 직접 보냈습니다</b>.',
        en: 'A recruiter at <b>NALDA</b> — the tech company behind the time-management app <b>Timing</b> — viewed your profile on FYI and <b>sent you this position</b> because your experience matches the requirements (React · TypeScript · Firebase).',
      },
      initial: 'N', company: 'NALDA', title: '{{공고 제목}}', meta: '{{직군 · 지역}}', tail: BENEFIT_PUBLIC,
    }),
  },
  {
    match: /^fmc-.*-private/,
    subject: {
      vi: '[FYI] Bạn được chọn vào danh sách đề cử — {{포지션}} tại First Marketing Company',
      ko: '[FYI] 추천 후보 명단에 선정되셨습니다 — First Marketing Company {{포지션}}',
      en: "[FYI] You've been nominated — {{position}} at First Marketing Company",
    },
    desc: 'FMC 추천 (8/31): 비공개 프레임 — 한국계 디지털 마케팅 에이전시 5공고(AE/KOL부킹/마케팅/HR/세일즈리더), HCMC 온사이트, 직군×연차 룰 선정. 5그룹(ae/kol/mkt/hr/lead).',
    source: 'scripts/outreach/fmc-recommend-coldmail.mjs',
    html: (lang) => recommendShell(lang, {
      intro: {
        vi: '<b>First Marketing Company</b> — doanh nghiệp Hàn Quốc trong lĩnh vực Digital Marketing, Influencer Marketing và Brand Communication — đang tuyển nhiều vị trí qua FYI (làm việc tại Q. Bình Thạnh, TP.HCM). Đội ngũ FYI đã xem xét toàn bộ hồ sơ và <b>chọn bạn vào danh sách đề cử</b> cho vị trí phù hợp nhất với kinh nghiệm của bạn.',
        ko: '디지털 마케팅·인플루언서 마케팅 한국 기업 <b>First Marketing Company</b>가 FYI를 통해 다수 포지션을 채용 중입니다(호치민 빈탄군 온사이트). FYI 팀이 이력서 전체를 검토해 회원님을 <b>추천 명단에 선정</b>했습니다.',
        en: '<b>First Marketing Company</b> — a Korean agency in digital & influencer marketing — is hiring multiple roles via FYI (onsite, Binh Thanh, HCMC). The FYI team reviewed all profiles and <b>nominated you</b> for the best-fit role.',
      },
      initial: 'F', company: 'First Marketing Company', title: '{{공고 제목}}', meta: 'Onsite · Nguyễn Hữu Cảnh, TP.HCM', tail: BENEFIT_PRIVATE,
    }),
  },
  {
    match: /^fmc-/,
    subject: {
      vi: '[FYI] Bạn được chọn vào danh sách đề cử gửi First Marketing Company — {{포지션}}',
      ko: '[FYI] First Marketing Company 추천 명단에 선정되셨습니다 — {{포지션}}',
      en: "[FYI] You've been nominated to First Marketing Company — {{position}}",
    },
    desc: 'FMC 추천 (8/31): 공개 프레임 — FYI 검토 선정·명단에 프로필 동봉·지원 시 우선 검토. 5그룹(ae/kol/mkt/hr/lead).',
    source: 'scripts/outreach/fmc-recommend-coldmail.mjs',
    html: (lang) => recommendShell(lang, {
      intro: {
        vi: '<b>First Marketing Company</b> — doanh nghiệp Hàn Quốc trong lĩnh vực Digital Marketing, Influencer Marketing và Brand Communication — đang tuyển nhiều vị trí qua FYI (làm việc tại Q. Bình Thạnh, TP.HCM). Đội ngũ FYI đã xem xét toàn bộ hồ sơ và <b>chọn bạn vào danh sách đề cử</b> — hồ sơ công khai của bạn sẽ được gửi kèm danh sách cho nhà tuyển dụng trong tuần này.',
        ko: '디지털 마케팅·인플루언서 마케팅 한국 기업 <b>First Marketing Company</b>가 FYI를 통해 다수 포지션을 채용 중입니다. FYI 팀이 이력서 전체를 검토해 회원님을 <b>추천 명단에 선정</b>했으며, 공개 프로필은 이번 주 명단과 함께 담당자에게 전달됩니다.',
        en: '<b>First Marketing Company</b> — a Korean agency in digital & influencer marketing — is hiring via FYI. The FYI team reviewed all profiles and <b>nominated you</b>; your public profile goes to the recruiter with this week\'s list.',
      },
      initial: 'F', company: 'First Marketing Company', title: '{{공고 제목}}', meta: 'Onsite · Nguyễn Hữu Cảnh, TP.HCM', tail: BENEFIT_PUBLIC,
    }),
  },
  {
    match: /^qnt-recommend1-.*-private/,
    subject: {
      vi: '[FYI] Bạn được chọn vào danh sách đề cử — {{포지션}} tại QNT',
      ko: '[FYI] 추천 후보 명단에 선정되셨습니다 — QNT {{포지션}}',
      en: "[FYI] You've been nominated — {{position}} at QNT",
    },
    desc: 'QNT 추천 (9/4): 비공개 프레임 — 다낭 공장 준비 단계 한국계 제조사, 통역·한국어 비서(interp)/인사(hr) 2공고, 다낭 거주 룰 선정(풀 각 7명·1명 실측).',
    source: 'scripts/outreach/ktc0904b-recommend-coldmail.mjs',
    html: (lang) => recommendShell(lang, {
      intro: {
        vi: '<b>QNT</b> — doanh nghiệp sản xuất với Ban giám đốc người Hàn, đang trong giai đoạn chuẩn bị vận hành nhà máy tại Đà Nẵng — đang tuyển nhân sự văn phòng qua FYI, làm việc tại nhà máy (Phú Ninh, Đà Nẵng).',
        ko: '한국인 경영진의 제조 기업 <b>QNT</b>가 다낭 공장 가동을 준비하며 FYI를 통해 사무직을 채용 중입니다(다낭 푸닌 공장 근무).',
        en: '<b>QNT</b> — a manufacturer with Korean management preparing to operate its Đà Nẵng factory — is hiring office staff via FYI (Phú Ninh, Đà Nẵng).',
      },
      initial: 'Q', company: 'QNT', title: '{{공고 제목}}', meta: 'Onsite · Nhà máy, Đà Nẵng', tail: BENEFIT_PRIVATE,
    }),
  },
  {
    match: /^qnt-recommend1-/,
    subject: {
      vi: '[FYI] Bạn được chọn vào danh sách đề cử gửi QNT — {{포지션}}',
      ko: '[FYI] QNT 추천 명단에 선정되셨습니다 — {{포지션}}',
      en: "[FYI] You've been nominated to QNT — {{position}}",
    },
    desc: 'QNT 추천 (9/4): 공개 프레임 — FYI 검토 선정·명단에 프로필 동봉·지원 시 우선 검토. 2그룹(interp/hr).',
    source: 'scripts/outreach/ktc0904b-recommend-coldmail.mjs',
    html: (lang) => recommendShell(lang, {
      intro: {
        vi: '<b>QNT</b> — doanh nghiệp sản xuất với Ban giám đốc người Hàn, đang trong giai đoạn chuẩn bị vận hành nhà máy tại Đà Nẵng — đang tuyển nhân sự văn phòng qua FYI. Đội ngũ FYI đã xem xét toàn bộ hồ sơ và <b>chọn bạn vào danh sách đề cử</b> — hồ sơ công khai của bạn sẽ được gửi kèm danh sách cho nhà tuyển dụng trong tuần này.',
        ko: '한국인 경영진의 제조 기업 <b>QNT</b>가 다낭 공장 가동을 준비하며 FYI를 통해 사무직을 채용 중입니다. FYI 팀이 이력서 전체를 검토해 회원님을 <b>추천 명단에 선정</b>했으며, 공개 프로필은 이번 주 명단과 함께 담당자에게 전달됩니다.',
        en: '<b>QNT</b> — a manufacturer with Korean management preparing its Đà Nẵng factory — is hiring via FYI. The FYI team reviewed all profiles and <b>nominated you</b>; your public profile goes to the recruiter with this week\'s list.',
      },
      initial: 'Q', company: 'QNT', title: '{{공고 제목}}', meta: 'Onsite · Nhà máy, Đà Nẵng', tail: BENEFIT_PUBLIC,
    }),
  },
  {
    match: /^sktax-recommend1-.*-private/,
    subject: {
      vi: '[FYI] Bạn được chọn vào danh sách đề cử — Kế toán dịch vụ tại SKtax',
      ko: '[FYI] 추천 후보 명단에 선정되셨습니다 — SKtax 회계 담당자',
      en: "[FYI] You've been nominated — Service Accountant at SKtax",
    },
    desc: 'SKtax 회계 추천 (9/4): 비공개 프레임 — 회계·세무 서비스사, HCMC An Phú 온사이트 13–15tr, Finance×1y+ 룰 선정. 9/4 당일은 1차 회계 수신자 전원 제외로 0명 — 간격 후 재실행 시 흡수.',
    source: 'scripts/outreach/ktc0904b-recommend-coldmail.mjs',
    html: (lang) => recommendShell(lang, {
      intro: {
        vi: '<b>SKtax</b> — công ty dịch vụ kế toán – thuế — đang tuyển <b>Kế toán dịch vụ</b> qua FYI, làm việc tại An Phú, TP.HCM (Thứ 2 – Thứ 6, 8:00–17:00).',
        ko: '회계·세무 서비스사 <b>SKtax</b>가 FYI를 통해 <b>회계 담당자</b>를 채용 중입니다(호치민 An Phú, 주5일 13–15tr).',
        en: '<b>SKtax</b> — an accounting & tax services firm — is hiring a <b>Service Accountant</b> via FYI (An Phú, HCMC, Mon–Fri, 13–15M VND).',
      },
      initial: 'S', company: 'SKtax', title: 'Kế toán dịch vụ', meta: 'Onsite · An Phú, TP.HCM · 13–15 triệu', tail: BENEFIT_PRIVATE,
    }),
  },
  {
    match: /^sktax-recommend1-/,
    subject: {
      vi: '[FYI] Bạn được chọn vào danh sách đề cử gửi SKtax — Kế toán dịch vụ',
      ko: '[FYI] SKtax 추천 명단에 선정되셨습니다 — 회계 담당자',
      en: "[FYI] You've been nominated to SKtax — Service Accountant",
    },
    desc: 'SKtax 회계 추천 (9/4): 공개 프레임 — FYI 검토 선정·명단에 프로필 동봉·지원 시 우선 검토. 1그룹(acct).',
    source: 'scripts/outreach/ktc0904b-recommend-coldmail.mjs',
    html: (lang) => recommendShell(lang, {
      intro: {
        vi: '<b>SKtax</b> — công ty dịch vụ kế toán – thuế — đang tuyển <b>Kế toán dịch vụ</b> qua FYI, làm việc tại An Phú, TP.HCM. Đội ngũ FYI đã xem xét toàn bộ hồ sơ và <b>chọn bạn vào danh sách đề cử</b> — hồ sơ công khai của bạn sẽ được gửi kèm danh sách cho nhà tuyển dụng trong tuần này.',
        ko: '회계·세무 서비스사 <b>SKtax</b>가 FYI를 통해 <b>회계 담당자</b>를 채용 중입니다. FYI 팀이 이력서 전체를 검토해 회원님을 <b>추천 명단에 선정</b>했으며, 공개 프로필은 이번 주 명단과 함께 담당자에게 전달됩니다.',
        en: '<b>SKtax</b> — an accounting & tax services firm — is hiring via FYI. The FYI team reviewed all profiles and <b>nominated you</b>; your public profile goes to the recruiter with this week\'s list.',
      },
      initial: 'S', company: 'SKtax', title: 'Kế toán dịch vụ', meta: 'Onsite · An Phú, TP.HCM · 13–15 triệu', tail: BENEFIT_PUBLIC,
    }),
  },
  {
    match: /^komang-recommend1-.*-private/,
    subject: {
      vi: '[FYI] Bạn được chọn vào danh sách đề cử — E-commerce Automation Developer tại Komang',
      ko: '[FYI] 추천 후보 명단에 선정되셨습니다 — Komang 이커머스 자동화 개발자',
      en: "[FYI] You've been nominated — E-commerce Automation Developer at Komang",
    },
    desc: 'Komang 개발 추천 (9/4): 비공개 프레임 — 쿠팡/네이버 셀링 한국 이커머스, Python/RPA 자동화 개발자, HCM/다낭/하노이 10–17tr, 개발직군×Python스킬×1y+ 룰 선정.',
    source: 'scripts/outreach/ktc0904b-recommend-coldmail.mjs',
    html: (lang) => recommendShell(lang, {
      intro: {
        vi: '<b>Komang</b> — công ty thương mại điện tử Hàn Quốc, nhập khẩu sản phẩm sourcing từ nước ngoài để bán trên Coupang và Naver — đang tuyển <b>E-commerce Automation Developer (Python / RPA)</b> qua FYI: tự động hóa đăng sản phẩm, nhập kho và quản lý tồn kho bằng Python và các công cụ AI.',
        ko: '쿠팡·네이버에서 소싱 상품을 판매하는 한국 이커머스 기업 <b>Komang</b>이 FYI를 통해 <b>이커머스 자동화 개발자(Python/RPA)</b>를 채용 중입니다 — 상품 등록·입고·재고 관리를 Python과 AI 도구로 자동화.',
        en: '<b>Komang</b> — a Korean e-commerce company selling sourced products on Coupang and Naver — is hiring an <b>E-commerce Automation Developer (Python/RPA)</b> via FYI.',
      },
      initial: 'K', company: 'Komang', title: 'E-commerce Automation Developer (Python / RPA)', meta: 'TP.HCM / Đà Nẵng / Hà Nội · 10–17 triệu', tail: BENEFIT_PRIVATE,
    }),
  },
  {
    match: /^komang-recommend1-/,
    subject: {
      vi: '[FYI] Bạn được chọn vào danh sách đề cử gửi Komang — E-commerce Automation Developer',
      ko: '[FYI] Komang 추천 명단에 선정되셨습니다 — 이커머스 자동화 개발자',
      en: "[FYI] You've been nominated to Komang — E-commerce Automation Developer",
    },
    desc: 'Komang 개발 추천 (9/4): 공개 프레임 — FYI 검토 선정·명단에 프로필 동봉·지원 시 우선 검토. 1그룹(dev).',
    source: 'scripts/outreach/ktc0904b-recommend-coldmail.mjs',
    html: (lang) => recommendShell(lang, {
      intro: {
        vi: '<b>Komang</b> — công ty thương mại điện tử Hàn Quốc bán hàng trên Coupang và Naver — đang tuyển <b>E-commerce Automation Developer (Python / RPA)</b> qua FYI. Đội ngũ FYI đã xem xét toàn bộ hồ sơ và <b>chọn bạn vào danh sách đề cử</b> — hồ sơ công khai của bạn sẽ được gửi kèm danh sách cho nhà tuyển dụng trong tuần này.',
        ko: '쿠팡·네이버 셀링 한국 이커머스 기업 <b>Komang</b>이 FYI를 통해 <b>이커머스 자동화 개발자(Python/RPA)</b>를 채용 중입니다. FYI 팀이 이력서 전체를 검토해 회원님을 <b>추천 명단에 선정</b>했으며, 공개 프로필은 이번 주 명단과 함께 담당자에게 전달됩니다.',
        en: '<b>Komang</b> — a Korean e-commerce company selling on Coupang and Naver — is hiring via FYI. The FYI team reviewed all profiles and <b>nominated you</b>; your public profile goes to the recruiter with this week\'s list.',
      },
      initial: 'K', company: 'Komang', title: 'E-commerce Automation Developer (Python / RPA)', meta: 'TP.HCM / Đà Nẵng / Hà Nội · 10–17 triệu', tail: BENEFIT_PUBLIC,
    }),
  },
  {
    match: /^s2e-edu-.*-private/,
    subject: {
      vi: '[FYI] Bạn được chọn vào danh sách đề cử — Cộng tác viên phát triển đối tác tại s2e',
      ko: '[FYI] 추천 후보 명단에 선정되셨습니다 — s2e 파트너 개발 협력자',
      en: "[FYI] You've been nominated — Partner Development Collaborator at s2e",
    },
    desc: 's2e 재소싱 recommend2 (9/9): 비공개 프레임 — 1차 추천 전원 반려("학원/학교 영업 네트워크 희망") 후 교육업계 앵글 재소싱. 룰=교육 시그널(tuyển sinh·어학원·유학원·edtech)×영업 시그널 하드컷, 기지원만 제외. 공고 우대 문구 동시 수정.',
    source: 'scripts/outreach/s2e-edu-recommend-coldmail.mjs',
    html: (lang) => recommendShell(lang, {
      intro: {
        vi: '<b>s2e</b> — công ty Hàn Quốc trong lĩnh vực thể thao – giáo dục, đang mở rộng thí điểm (POC) ra Việt Nam — đang tuyển <b>Cộng tác viên phát triển đối tác</b> qua FYI (remote, CTV theo dự án). Lần này công ty <b>đặc biệt ưu tiên ứng viên có kinh nghiệm sales/tư vấn tuyển sinh hoặc mạng lưới với học viện, trung tâm, trường học</b> — kinh nghiệm giáo dục của bạn chính là điều họ đang tìm.',
        ko: '스포츠·교육 한국 기업 <b>s2e</b>가 파트너 개발 협력자(리모트 CTV)를 재모집 중입니다. 이번엔 <b>학원·학교 대상 영업/원생모집 경험·네트워크 보유자를 특별 우대</b> — 교육업계 경력 보유자에게 발송.',
        en: '<b>s2e</b> — Korean sports-education company — is re-hiring a Partner Development Collaborator (remote). This round strongly prefers candidates with <b>academy/school sales experience or networks</b>.',
      },
      initial: 'S', company: 's2e', title: 'Cộng tác viên phát triển đối tác Việt Nam', meta: 'Remote · Freelance/CTV theo dự án POC · 7–9 triệu', tail: BENEFIT_PRIVATE,
    }),
  },
  {
    match: /^s2e-edu-/,
    subject: {
      vi: '[FYI] Bạn được chọn vào danh sách đề cử gửi s2e — Cộng tác viên phát triển đối tác',
      ko: '[FYI] s2e 추천 명단에 선정되셨습니다 — 파트너 개발 협력자',
      en: "[FYI] You've been nominated to s2e — Partner Development Collaborator",
    },
    desc: 's2e 재소싱 recommend2 (9/9): 공개 프레임 — 교육업계 앵글(학원·학교 영업 네트워크 우대), FYI 검토 선정·명단 동봉·우선 검토.',
    source: 'scripts/outreach/s2e-edu-recommend-coldmail.mjs',
    html: (lang) => recommendShell(lang, {
      intro: {
        vi: '<b>s2e</b> — công ty Hàn Quốc thể thao – giáo dục, mở rộng POC ra Việt Nam — đang tuyển <b>Cộng tác viên phát triển đối tác</b> qua FYI (remote, CTV theo dự án), <b>đặc biệt ưu tiên kinh nghiệm sales/tuyển sinh hoặc mạng lưới học viện, trung tâm, trường học</b>. Đội ngũ FYI đã xem xét toàn bộ hồ sơ và <b>chọn bạn vào danh sách đề cử</b> — hồ sơ công khai của bạn sẽ được gửi kèm danh sách cho nhà tuyển dụng trong tuần này.',
        ko: '스포츠·교육 한국 기업 <b>s2e</b>가 학원·학교 영업 네트워크 우대 조건으로 파트너 개발 협력자를 재모집 중입니다. FYI 팀이 검토해 회원님을 <b>추천 명단에 선정</b>했습니다.',
        en: '<b>s2e</b> is re-hiring a Partner Development Collaborator (remote), strongly preferring academy/school sales networks. The FYI team reviewed all profiles and <b>nominated you</b>.',
      },
      initial: 'S', company: 's2e', title: 'Cộng tác viên phát triển đối tác Việt Nam', meta: 'Remote · Freelance/CTV theo dự án POC · 7–9 triệu', tail: BENEFIT_PUBLIC,
    }),
  },
  {
    match: /^s2e-recommend\d-.*-private/,
    subject: {
      vi: '[FYI] Bạn được chọn vào danh sách đề cử — Cộng tác viên phát triển đối tác tại s2e',
      ko: '[FYI] 추천 후보 명단에 선정되셨습니다 — s2e 파트너 개발 협력자',
      en: "[FYI] You've been nominated — Partner Development Collaborator at s2e",
    },
    desc: 's2e 파트너개발 추천 (9/4): 비공개 프레임 — 스포츠·교육 한국 기업 베트남 POC 확장, 현지 파트너 소싱 CTV(리모트·프리랜스 7–9tr), Sales 직군 룰 선정(지역 무관).',
    source: 'scripts/outreach/ktc0904b-recommend-coldmail.mjs',
    html: (lang) => recommendShell(lang, {
      intro: {
        vi: '<b>s2e</b> — công ty Hàn Quốc trong lĩnh vực thể thao – giáo dục, đang mở rộng thí điểm (POC) ra thị trường Việt Nam — đang tuyển <b>Cộng tác viên phát triển đối tác</b> qua FYI: tìm kiếm và kết nối các học viện thể thao, trung tâm đào tạo hoặc trường học tại địa phương. Làm việc từ xa, hình thức cộng tác viên theo dự án.',
        ko: '스포츠·교육 분야 한국 기업 <b>s2e</b>가 베트남 POC 확장을 위해 FYI를 통해 <b>파트너 개발 협력자</b>(현지 스포츠 아카데미·학교 소싱, 리모트 CTV)를 모집 중입니다.',
        en: '<b>s2e</b> — a Korean sports-education company expanding its POC to Vietnam — is hiring a <b>Partner Development Collaborator</b> via FYI (remote, freelance).',
      },
      initial: 'S', company: 's2e', title: 'Cộng tác viên phát triển đối tác Việt Nam', meta: 'Remote · Freelance/CTV theo dự án POC · 7–9 triệu', tail: BENEFIT_PRIVATE,
    }),
  },
  {
    match: /^s2e-recommend\d-/,
    subject: {
      vi: '[FYI] Bạn được chọn vào danh sách đề cử gửi s2e — Cộng tác viên phát triển đối tác',
      ko: '[FYI] s2e 추천 명단에 선정되셨습니다 — 파트너 개발 협력자',
      en: "[FYI] You've been nominated to s2e — Partner Development Collaborator",
    },
    desc: 's2e 파트너개발 추천 (9/4): 공개 프레임 — FYI 검토 선정·명단에 프로필 동봉·지원 시 우선 검토. 1그룹(partner).',
    source: 'scripts/outreach/ktc0904b-recommend-coldmail.mjs',
    html: (lang) => recommendShell(lang, {
      intro: {
        vi: '<b>s2e</b> — công ty Hàn Quốc trong lĩnh vực thể thao – giáo dục, đang mở rộng thí điểm (POC) ra thị trường Việt Nam — đang tuyển <b>Cộng tác viên phát triển đối tác</b> qua FYI. Đội ngũ FYI đã xem xét toàn bộ hồ sơ và <b>chọn bạn vào danh sách đề cử</b> — hồ sơ công khai của bạn sẽ được gửi kèm danh sách cho nhà tuyển dụng trong tuần này.',
        ko: '스포츠·교육 분야 한국 기업 <b>s2e</b>가 FYI를 통해 <b>파트너 개발 협력자</b>를 모집 중입니다. FYI 팀이 이력서 전체를 검토해 회원님을 <b>추천 명단에 선정</b>했으며, 공개 프로필은 이번 주 명단과 함께 담당자에게 전달됩니다.',
        en: '<b>s2e</b> — a Korean sports-education company — is hiring via FYI. The FYI team reviewed all profiles and <b>nominated you</b>; your public profile goes to the recruiter with this week\'s list.',
      },
      initial: 'S', company: 's2e', title: 'Cộng tác viên phát triển đối tác Việt Nam', meta: 'Remote · Freelance/CTV theo dự án POC · 7–9 triệu', tail: BENEFIT_PUBLIC,
    }),
  },
  {
    match: /^nexon-recommend1-qa-private/,
    subject: {
      vi: '[FYI] Bạn được chọn vào danh sách đề cử — QA Game Tester tại NEXON DEV VINA',
      ko: '[FYI] 추천 후보 명단에 선정되셨습니다 — NEXON DEV VINA QA 게임 테스터',
      en: "[FYI] You've been nominated — QA Game Tester at NEXON DEV VINA",
    },
    desc: '넥슨데브비나 QA 추천 (9/4): 비공개 프레임 — QA Game Tester(V70) 1공고, HCMC 온사이트, QA·Game 직군 룰 선정(CV에 게임 경험 기재 안내 포함). 8/31 unity 기수신자 제외.',
    source: 'scripts/outreach/ktc0904-recommend-coldmail.mjs',
    html: (lang) => recommendShell(lang, {
      intro: {
        vi: '<b>NEXON DEV VINA</b> — studio phát triển game thuộc NEXON, làm việc trên các dự án game toàn cầu — đang tuyển <b>QA Game Tester</b> qua FYI (UOA Tower, TP.HCM). Lưu ý: hãy mô tả kinh nghiệm chơi game và các tựa game bạn đã chơi ngay trong CV.',
        ko: 'NEXON 산하 게임 개발 스튜디오 <b>NEXON DEV VINA</b>가 FYI를 통해 <b>QA Game Tester</b>를 채용 중입니다(호치민 UOA Tower). CV에 게임 경험·플레이한 타이틀 기재가 필요합니다.',
        en: '<b>NEXON DEV VINA</b> — a NEXON game studio working on global titles — is hiring a <b>QA Game Tester</b> via FYI (UOA Tower, HCMC). Note: describe your gaming experience and played titles in your CV.',
      },
      initial: 'N', company: 'NEXON DEV VINA', title: 'QA Game Tester', meta: 'Onsite · UOA Tower, TP.HCM', tail: BENEFIT_PRIVATE,
    }),
  },
  {
    match: /^nexon-recommend1-qa-/,
    subject: {
      vi: '[FYI] Bạn được chọn vào danh sách đề cử gửi NEXON DEV VINA — QA Game Tester',
      ko: '[FYI] NEXON DEV VINA 추천 명단에 선정되셨습니다 — QA 게임 테스터',
      en: "[FYI] You've been nominated to NEXON DEV VINA — QA Game Tester",
    },
    desc: '넥슨데브비나 QA 추천 (9/4): 공개 프레임 — FYI 검토 선정·명단에 프로필 동봉·지원 시 우선 검토. 1그룹(qa).',
    source: 'scripts/outreach/ktc0904-recommend-coldmail.mjs',
    html: (lang) => recommendShell(lang, {
      intro: {
        vi: '<b>NEXON DEV VINA</b> — studio phát triển game thuộc NEXON — đang tuyển <b>QA Game Tester</b> qua FYI (UOA Tower, TP.HCM). Đội ngũ FYI đã xem xét toàn bộ hồ sơ và <b>chọn bạn vào danh sách đề cử</b> — hồ sơ công khai của bạn sẽ được gửi kèm danh sách cho nhà tuyển dụng trong tuần này.',
        ko: 'NEXON 산하 게임 개발 스튜디오 <b>NEXON DEV VINA</b>가 FYI를 통해 <b>QA Game Tester</b>를 채용 중입니다. FYI 팀이 이력서 전체를 검토해 회원님을 <b>추천 명단에 선정</b>했으며, 공개 프로필은 이번 주 명단과 함께 담당자에게 전달됩니다.',
        en: '<b>NEXON DEV VINA</b> — a NEXON game studio — is hiring a <b>QA Game Tester</b> via FYI. The FYI team reviewed all profiles and <b>nominated you</b>; your public profile goes to the recruiter with this week\'s list.',
      },
      initial: 'N', company: 'NEXON DEV VINA', title: 'QA Game Tester', meta: 'Onsite · UOA Tower, TP.HCM', tail: BENEFIT_PUBLIC,
    }),
  },
  {
    match: /^nexon-.*-private/,
    subject: {
      vi: '[FYI] Bạn được chọn vào danh sách đề cử — Unity Game Developer (C#) tại NEXON DEV VINA',
      ko: '[FYI] 추천 후보 명단에 선정되셨습니다 — NEXON DEV VINA Unity 게임 개발자',
      en: "[FYI] You've been nominated — Unity Game Developer (C#) at NEXON DEV VINA",
    },
    desc: '넥슨데브비나 추천 (8/31): 비공개 프레임 — Unity 게임 개발자(C#) 1공고, HCMC 온사이트, Game 직군·Unity 신호 룰 선정(영문 CV 필수 안내 포함). 1그룹(unity).',
    source: 'scripts/outreach/nexon-recommend-coldmail.mjs',
    html: (lang) => recommendShell(lang, {
      intro: {
        vi: '<b>NEXON DEV VINA</b> — studio phát triển game thuộc NEXON, làm việc trên các dự án game toàn cầu — đang tuyển <b>Unity Game Developer (C#)</b> qua FYI (UOA Tower, TP.HCM). Đội ngũ FYI đã xem xét toàn bộ hồ sơ và <b>chọn bạn vào danh sách đề cử</b>. Lưu ý: công ty chỉ nhận <b>CV bằng tiếng Anh</b>.',
        ko: 'NEXON 산하 게임 개발 스튜디오 <b>NEXON DEV VINA</b>가 FYI를 통해 <b>Unity 게임 개발자(C#)</b>를 채용 중입니다(호치민 UOA Tower). FYI 팀이 이력서 전체를 검토해 회원님을 <b>추천 명단에 선정</b>했습니다. 영문 CV만 접수됩니다.',
        en: '<b>NEXON DEV VINA</b> — a NEXON game studio working on global titles — is hiring a <b>Unity Game Developer (C#)</b> via FYI (UOA Tower, HCMC). The FYI team reviewed all profiles and <b>nominated you</b>. Note: English CVs only.',
      },
      initial: 'N', company: 'NEXON DEV VINA', title: 'Unity Game Developer (C#)', meta: 'Onsite · UOA Tower, TP.HCM · CV tiếng Anh', tail: BENEFIT_PRIVATE,
    }),
  },
  {
    match: /^nexon-/,
    subject: {
      vi: '[FYI] Bạn được chọn vào danh sách đề cử gửi NEXON DEV VINA — Unity Game Developer (C#)',
      ko: '[FYI] NEXON DEV VINA 추천 명단에 선정되셨습니다 — Unity 게임 개발자',
      en: "[FYI] You've been nominated to NEXON DEV VINA — Unity Game Developer (C#)",
    },
    desc: '넥슨데브비나 추천 (8/31): 공개 프레임 — FYI 검토 선정·명단에 프로필 동봉·지원 시 우선 검토. 1그룹(unity).',
    source: 'scripts/outreach/nexon-recommend-coldmail.mjs',
    html: (lang) => recommendShell(lang, {
      intro: {
        vi: '<b>NEXON DEV VINA</b> — studio phát triển game thuộc NEXON, làm việc trên các dự án game toàn cầu — đang tuyển <b>Unity Game Developer (C#)</b> qua FYI (UOA Tower, TP.HCM). Đội ngũ FYI đã xem xét toàn bộ hồ sơ và <b>chọn bạn vào danh sách đề cử</b> — hồ sơ công khai của bạn sẽ được gửi kèm danh sách cho nhà tuyển dụng trong tuần này. Lưu ý: công ty chỉ nhận <b>CV bằng tiếng Anh</b>.',
        ko: 'NEXON 산하 게임 개발 스튜디오 <b>NEXON DEV VINA</b>가 FYI를 통해 <b>Unity 게임 개발자(C#)</b>를 채용 중입니다. FYI 팀이 이력서 전체를 검토해 회원님을 <b>추천 명단에 선정</b>했으며, 공개 프로필은 이번 주 명단과 함께 담당자에게 전달됩니다. 영문 CV만 접수됩니다.',
        en: '<b>NEXON DEV VINA</b> — a NEXON game studio working on global titles — is hiring a <b>Unity Game Developer (C#)</b> via FYI. The FYI team reviewed all profiles and <b>nominated you</b>; your public profile goes to the recruiter with this week\'s list. Note: English CVs only.',
      },
      initial: 'N', company: 'NEXON DEV VINA', title: 'Unity Game Developer (C#)', meta: 'Onsite · UOA Tower, TP.HCM · CV tiếng Anh', tail: BENEFIT_PUBLIC,
    }),
  },
  {
    match: /^daehong-.*-private/,
    subject: {
      vi: '[FYI] Bạn được chọn vào danh sách đề cử — Art Director tại DAEHONG COMMUNICATIONS VIETNAM',
      ko: '[FYI] 추천 후보 명단에 선정되셨습니다 — DAEHONG COMMUNICATIONS VIETNAM Art Director',
      en: "[FYI] You've been nominated — Art Director at DAEHONG COMMUNICATIONS VIETNAM",
    },
    desc: '대홍커뮤니케이션즈 추천 (8/31): 비공개 프레임 — Art Director 1공고(시니어 크리에이티브·포트폴리오 필수), HCMC 온사이트, Design×5y+ 룰 선정. 1그룹(ad).',
    source: 'scripts/outreach/daehong-recommend-coldmail.mjs',
    html: (lang) => recommendShell(lang, {
      intro: {
        vi: '<b>DAEHONG COMMUNICATIONS VIETNAM</b> — công ty quảng cáo & truyền thông tích hợp thuộc tập đoàn Hàn Quốc — đang tuyển <b>Art Director</b> (Creative Solutions Team) qua FYI, làm việc tại Diamond Plaza, TP.HCM. Đội ngũ FYI đã xem xét toàn bộ hồ sơ và <b>chọn bạn vào danh sách đề cử</b>. Vị trí dành cho creative giàu kinh nghiệm; hồ sơ cần kèm <b>Portfolio</b> và tiếng Anh tốt.',
        ko: '한국계 종합 광고·커뮤니케이션 기업 <b>DAEHONG COMMUNICATIONS VIETNAM</b>이 FYI를 통해 <b>Art Director</b>를 채용 중입니다(호치민 Diamond Plaza). FYI 팀이 이력서 전체를 검토해 회원님을 <b>추천 명단에 선정</b>했습니다. 시니어 크리에이티브 대상·포트폴리오 필수.',
        en: '<b>DAEHONG COMMUNICATIONS VIETNAM</b> — a Korean integrated advertising & communications company — is hiring an <b>Art Director</b> via FYI (Diamond Plaza, HCMC). The FYI team reviewed all profiles and <b>nominated you</b>. Senior creatives; portfolio required.',
      },
      initial: 'D', company: 'DAEHONG COMMUNICATIONS VIETNAM', title: 'Art Director', meta: 'Onsite · Diamond Plaza, TP.HCM · Portfolio', tail: BENEFIT_PRIVATE,
    }),
  },
  {
    match: /^daehong-/,
    subject: {
      vi: '[FYI] Bạn được chọn vào danh sách đề cử gửi DAEHONG COMMUNICATIONS VIETNAM — Art Director',
      ko: '[FYI] DAEHONG COMMUNICATIONS VIETNAM 추천 명단에 선정되셨습니다 — Art Director',
      en: "[FYI] You've been nominated to DAEHONG COMMUNICATIONS VIETNAM — Art Director",
    },
    desc: '대홍커뮤니케이션즈 추천 (8/31): 공개 프레임 — FYI 검토 선정·명단에 프로필 동봉·지원 시 우선 검토. 1그룹(ad).',
    source: 'scripts/outreach/daehong-recommend-coldmail.mjs',
    html: (lang) => recommendShell(lang, {
      intro: {
        vi: '<b>DAEHONG COMMUNICATIONS VIETNAM</b> — công ty quảng cáo & truyền thông tích hợp thuộc tập đoàn Hàn Quốc — đang tuyển <b>Art Director</b> (Creative Solutions Team) qua FYI, làm việc tại Diamond Plaza, TP.HCM. Đội ngũ FYI đã xem xét toàn bộ hồ sơ và <b>chọn bạn vào danh sách đề cử</b> — hồ sơ công khai của bạn sẽ được gửi kèm danh sách cho nhà tuyển dụng trong tuần này. Hồ sơ cần kèm <b>Portfolio</b> và tiếng Anh tốt.',
        ko: '한국계 종합 광고·커뮤니케이션 기업 <b>DAEHONG COMMUNICATIONS VIETNAM</b>이 FYI를 통해 <b>Art Director</b>를 채용 중입니다. FYI 팀이 이력서 전체를 검토해 회원님을 <b>추천 명단에 선정</b>했으며, 공개 프로필은 이번 주 명단과 함께 담당자에게 전달됩니다. 포트폴리오 필수.',
        en: '<b>DAEHONG COMMUNICATIONS VIETNAM</b> — a Korean integrated advertising & communications company — is hiring an <b>Art Director</b> via FYI. The FYI team reviewed all profiles and <b>nominated you</b>; your public profile goes to the recruiter with this week\'s list. Portfolio required.',
      },
      initial: 'D', company: 'DAEHONG COMMUNICATIONS VIETNAM', title: 'Art Director', meta: 'Onsite · Diamond Plaza, TP.HCM · Portfolio', tail: BENEFIT_PUBLIC,
    }),
  },
  {
    match: /^luen-.*-private/,
    subject: {
      vi: '[FYI] Bạn được chọn vào danh sách đề cử — {{포지션}} tại LUEN',
      ko: '[FYI] 추천 후보 명단에 선정되셨습니다 — LUEN {{포지션}}',
      en: "[FYI] You've been nominated — {{position}} at LUEN",
    },
    desc: 'LUEN 인턴 추천 (9/4): 비공개 프레임 — AI 숏폼 드라마 콘텐츠 스타트업 인턴 3공고(R145-147: 프로듀서/AI크리에이터/영상편집), 콘텐츠 직군×0-2y 룰 선정, Design→편집·나머지 교차 분배. 3그룹(producer/creator/editor).',
    source: 'scripts/outreach/ktc0904-recommend-coldmail.mjs',
    html: (lang) => recommendShell(lang, {
      intro: {
        vi: '<b>LUEN</b> — startup nội dung Hàn Quốc sản xuất phim ngắn trên YouTube bằng AI tạo sinh — đang tuyển các vị trí <b>Intern</b> về content qua FYI. Không yêu cầu kinh nghiệm; phù hợp với bạn yêu thích sáng tạo nội dung và AI.',
        ko: '생성형 AI로 유튜브 숏폼 드라마를 제작하는 한국 콘텐츠 스타트업 <b>LUEN</b>이 FYI를 통해 콘텐츠 <b>인턴</b>을 채용 중입니다. 경력 무관, 콘텐츠·AI에 관심 있는 분 대상.',
        en: '<b>LUEN</b> — a Korean content startup producing YouTube short-form dramas with generative AI — is hiring content <b>interns</b> via FYI. No experience required.',
      },
      initial: 'L', company: 'LUEN', title: '{{공고 제목}}', meta: 'Intern · Trợ cấp 3–4 triệu/tháng', tail: BENEFIT_PRIVATE,
    }),
  },
  {
    match: /^luen-/,
    subject: {
      vi: '[FYI] Bạn được chọn vào danh sách đề cử gửi LUEN — {{포지션}}',
      ko: '[FYI] LUEN 추천 명단에 선정되셨습니다 — {{포지션}}',
      en: "[FYI] You've been nominated to LUEN — {{position}}",
    },
    desc: 'LUEN 인턴 추천 (9/4): 공개 프레임 — FYI 검토 선정·명단에 프로필 동봉·지원 시 우선 검토. 3그룹(producer/creator/editor).',
    source: 'scripts/outreach/ktc0904-recommend-coldmail.mjs',
    html: (lang) => recommendShell(lang, {
      intro: {
        vi: '<b>LUEN</b> — startup nội dung Hàn Quốc sản xuất phim ngắn trên YouTube bằng AI tạo sinh — đang tuyển các vị trí <b>Intern</b> về content qua FYI. Đội ngũ FYI đã xem xét toàn bộ hồ sơ và <b>chọn bạn vào danh sách đề cử</b> — hồ sơ công khai của bạn sẽ được gửi kèm danh sách cho nhà tuyển dụng trong tuần này.',
        ko: '생성형 AI로 유튜브 숏폼 드라마를 제작하는 한국 콘텐츠 스타트업 <b>LUEN</b>이 FYI를 통해 콘텐츠 <b>인턴</b>을 채용 중입니다. FYI 팀이 이력서 전체를 검토해 회원님을 <b>추천 명단에 선정</b>했으며, 공개 프로필은 이번 주 명단과 함께 담당자에게 전달됩니다.',
        en: '<b>LUEN</b> — a Korean content startup producing YouTube short-form dramas with generative AI — is hiring content <b>interns</b> via FYI. The FYI team reviewed all profiles and <b>nominated you</b>; your public profile goes to the recruiter with this week\'s list.',
      },
      initial: 'L', company: 'LUEN', title: '{{공고 제목}}', meta: 'Intern · Trợ cấp 3–4 triệu/tháng', tail: BENEFIT_PUBLIC,
    }),
  },
  {
    match: /^sunjin-.*-private/,
    subject: {
      vi: '[FYI] Bạn được chọn vào danh sách đề cử — {{포지션}} tại Sunjin Vina',
      ko: '[FYI] 추천 후보 명단에 선정되셨습니다 — Sunjin Vina {{포지션}}',
      en: "[FYI] You've been nominated — {{position}} at Sunjin Vina",
    },
    desc: '선진비나 추천 (9/4): 비공개 프레임 — 한국 축산·사료 기업 HCMC 오피스 8공고(미디어/채용/교육/내부감사/투자연구/구매/데이터리드/가금마케팅), 직군×연차 룰 선정. 8그룹(media/recruit/training/audit/invest/proc/data/mkt).',
    source: 'scripts/outreach/ktc0904-recommend-coldmail.mjs',
    html: (lang) => recommendShell(lang, {
      intro: {
        vi: '<b>Sunjin Vina</b> — công ty thuộc tập đoàn nông nghiệp – chăn nuôi Sunjin (Hàn Quốc) — đang tuyển nhiều vị trí văn phòng qua FYI, làm việc tại tòa nhà ThiSofic, Mai Chí Thọ, TP.HCM.',
        ko: '한국 농축산 그룹 선진 계열 <b>Sunjin Vina</b>가 FYI를 통해 호치민 오피스 다수 포지션을 채용 중입니다(ThiSofic 빌딩, Mai Chí Thọ).',
        en: '<b>Sunjin Vina</b> — part of the Korean agriculture & livestock group Sunjin — is hiring multiple office roles via FYI (ThiSofic Building, Mai Chí Thọ, HCMC).',
      },
      initial: 'S', company: 'Sunjin Vina', title: '{{공고 제목}}', meta: 'Onsite · Mai Chí Thọ, TP.HCM', tail: BENEFIT_PRIVATE,
    }),
  },
  {
    match: /^sunjin-/,
    subject: {
      vi: '[FYI] Bạn được chọn vào danh sách đề cử gửi Sunjin Vina — {{포지션}}',
      ko: '[FYI] Sunjin Vina 추천 명단에 선정되셨습니다 — {{포지션}}',
      en: "[FYI] You've been nominated to Sunjin Vina — {{position}}",
    },
    desc: '선진비나 추천 (9/4): 공개 프레임 — FYI 검토 선정·명단에 프로필 동봉·지원 시 우선 검토. 8그룹(media/recruit/training/audit/invest/proc/data/mkt).',
    source: 'scripts/outreach/ktc0904-recommend-coldmail.mjs',
    html: (lang) => recommendShell(lang, {
      intro: {
        vi: '<b>Sunjin Vina</b> — công ty thuộc tập đoàn nông nghiệp – chăn nuôi Sunjin (Hàn Quốc) — đang tuyển nhiều vị trí văn phòng qua FYI (ThiSofic, Mai Chí Thọ, TP.HCM). Đội ngũ FYI đã xem xét toàn bộ hồ sơ và <b>chọn bạn vào danh sách đề cử</b> — hồ sơ công khai của bạn sẽ được gửi kèm danh sách cho nhà tuyển dụng trong tuần này.',
        ko: '한국 농축산 그룹 선진 계열 <b>Sunjin Vina</b>가 FYI를 통해 호치민 오피스 다수 포지션을 채용 중입니다. FYI 팀이 이력서 전체를 검토해 회원님을 <b>추천 명단에 선정</b>했으며, 공개 프로필은 이번 주 명단과 함께 담당자에게 전달됩니다.',
        en: '<b>Sunjin Vina</b> — part of the Korean agriculture & livestock group Sunjin — is hiring multiple office roles via FYI. The FYI team reviewed all profiles and <b>nominated you</b>; your public profile goes to the recruiter with this week\'s list.',
      },
      initial: 'S', company: 'Sunjin Vina', title: '{{공고 제목}}', meta: 'Onsite · Mai Chí Thọ, TP.HCM', tail: BENEFIT_PUBLIC,
    }),
  },
  {
    match: /^sunrise-.*-private/,
    subject: {
      vi: '[FYI] Bạn được chọn vào danh sách đề cử — Chuyên viên Sales tại Sunrise Vina',
      ko: '[FYI] 추천 후보 명단에 선정되셨습니다 — Sunrise Vina B2B 세일즈',
      en: "[FYI] You've been nominated — Sales Specialist at Sunrise Vina",
    },
    desc: 'Sunrise Vina 추천 (9/4 3차): 비공개 프레임 — B2B 세일즈(V71), HCM/하노이/빈즈엉 복수 근무지, Sales×지역 룰 선정. 하노이 Sales 풀 첫 활용. R&D(V72 화학·하노이)는 풀 0 미발송. 1그룹(sales).',
    source: 'scripts/outreach/ktc0904-recommend-coldmail.mjs',
    html: (lang) => recommendShell(lang, {
      intro: {
        vi: '<b>Sunrise Vina</b> — doanh nghiệp sản xuất đang tuyển dụng qua FYI — tuyển <b>Chuyên viên Sales</b> (B2B, phụ trách và phát triển thị trường khu vực), làm việc tại TP.HCM / Hà Nội / Bình Dương, mức lương 15–20 triệu.',
        ko: '제조기업 <b>Sunrise Vina</b>가 FYI를 통해 <b>B2B 세일즈</b>를 채용 중입니다(호치민/하노이/빈즈엉, 15–20M).',
        en: '<b>Sunrise Vina</b> — a manufacturer hiring via FYI — is looking for a <b>B2B Sales Specialist</b> (HCMC / Hanoi / Binh Duong, 15–20M VND).',
      },
      initial: 'S', company: 'Sunrise Vina', title: 'Chuyên viên Sales', meta: 'Onsite · TP.HCM / Hà Nội / Bình Dương · 15–20 triệu', tail: BENEFIT_PRIVATE,
    }),
  },
  {
    match: /^sunrise-/,
    subject: {
      vi: '[FYI] Bạn được chọn vào danh sách đề cử gửi Sunrise Vina — Chuyên viên Sales',
      ko: '[FYI] Sunrise Vina 추천 명단에 선정되셨습니다 — B2B 세일즈',
      en: "[FYI] You've been nominated to Sunrise Vina — Sales Specialist",
    },
    desc: 'Sunrise Vina 추천 (9/4 3차): 공개 프레임 — FYI 검토 선정·명단에 프로필 동봉·지원 시 우선 검토. 1그룹(sales).',
    source: 'scripts/outreach/ktc0904-recommend-coldmail.mjs',
    html: (lang) => recommendShell(lang, {
      intro: {
        vi: '<b>Sunrise Vina</b> — doanh nghiệp sản xuất đang tuyển dụng qua FYI — tuyển <b>Chuyên viên Sales</b> (B2B, TP.HCM / Hà Nội / Bình Dương, 15–20 triệu). Đội ngũ FYI đã xem xét toàn bộ hồ sơ và <b>chọn bạn vào danh sách đề cử</b> — hồ sơ công khai của bạn sẽ được gửi kèm danh sách cho nhà tuyển dụng trong tuần này.',
        ko: '제조기업 <b>Sunrise Vina</b>가 FYI를 통해 <b>B2B 세일즈</b>를 채용 중입니다. FYI 팀이 이력서 전체를 검토해 회원님을 <b>추천 명단에 선정</b>했으며, 공개 프로필은 이번 주 명단과 함께 담당자에게 전달됩니다.',
        en: '<b>Sunrise Vina</b> — a manufacturer hiring via FYI — is looking for a <b>B2B Sales Specialist</b>. The FYI team reviewed all profiles and <b>nominated you</b>; your public profile goes to the recruiter with this week\'s list.',
      },
      initial: 'S', company: 'Sunrise Vina', title: 'Chuyên viên Sales', meta: 'Onsite · TP.HCM / Hà Nội / Bình Dương · 15–20 triệu', tail: BENEFIT_PUBLIC,
    }),
  },
  {
    match: /^sts-recommend\d-sales-private/,
    subject: {
      vi: '[FYI] Bạn được chọn vào danh sách đề cử — Sale Thiết Bị Gia Dụng tại STS',
      ko: '[FYI] 추천 후보 명단에 선정되셨습니다 — STS 가전·설비 세일즈',
      en: "[FYI] You've been nominated — Home Appliance Sales at STS",
    },
    desc: 'STS 세일즈 추천 (9/4 2차): 비공개 프레임 — 가전 세일즈(V63), KTC 회신(기술 아는 세일즈 필요·JD 유지)으로 보류 해제. Sales×HCMC 룰 선정, 기술/B2B 신호 우선, 카피에 HVAC 기술 이해 우대 명시. 1그룹(sales).',
    source: 'scripts/outreach/ktc0904-recommend-coldmail.mjs',
    html: (lang) => recommendShell(lang, {
      intro: {
        vi: '<b>STS</b> — doanh nghiệp đang tuyển dụng qua FYI, văn phòng tại Quận 7, TP.HCM — đang tuyển <b>Nhân viên Sales Thiết Bị Gia Dụng</b>. Lưu ý: vị trí này <b>ưu tiên ứng viên Sales có hiểu biết kỹ thuật</b> về thiết bị/hệ thống điều hòa (HVAC) — mô tả công việc bao gồm nhiều nội dung kỹ thuật.',
        ko: '<b>STS</b>가 FYI를 통해 <b>가전·설비 세일즈</b>를 채용 중입니다(호치민 7군). 설비/공조(HVAC) <b>기술 이해가 있는 세일즈 우대</b> — JD에 기술 내용이 다수 포함돼 있음을 명시.',
        en: '<b>STS</b> is hiring a <b>Home Appliance Sales</b> role via FYI (District 7, HCMC). Note: sales candidates with <b>technical understanding of appliances/HVAC</b> are preferred — the JD includes substantial technical content.',
      },
      initial: 'S', company: 'STS', title: 'Sale Thiết Bị Gia Dụng', meta: 'Onsite · Quận 7, TP.HCM · Ưu tiên hiểu biết kỹ thuật', tail: BENEFIT_PRIVATE,
    }),
  },
  {
    match: /^sts-recommend\d-sales-/,
    subject: {
      vi: '[FYI] Bạn được chọn vào danh sách đề cử gửi STS — Sale Thiết Bị Gia Dụng',
      ko: '[FYI] STS 추천 명단에 선정되셨습니다 — 가전·설비 세일즈',
      en: "[FYI] You've been nominated to STS — Home Appliance Sales",
    },
    desc: 'STS 세일즈 추천 (9/4 2차): 공개 프레임 — FYI 검토 선정·명단에 프로필 동봉·지원 시 우선 검토. 1그룹(sales).',
    source: 'scripts/outreach/ktc0904-recommend-coldmail.mjs',
    html: (lang) => recommendShell(lang, {
      intro: {
        vi: '<b>STS</b> — doanh nghiệp đang tuyển dụng qua FYI (Quận 7, TP.HCM) — đang tuyển <b>Nhân viên Sales Thiết Bị Gia Dụng</b> (ưu tiên hiểu biết kỹ thuật thiết bị/HVAC). Đội ngũ FYI đã xem xét toàn bộ hồ sơ và <b>chọn bạn vào danh sách đề cử</b> — hồ sơ công khai của bạn sẽ được gửi kèm danh sách cho nhà tuyển dụng trong tuần này.',
        ko: '<b>STS</b>가 FYI를 통해 <b>가전·설비 세일즈</b>(HVAC 기술 이해 우대)를 채용 중입니다. FYI 팀이 이력서 전체를 검토해 회원님을 <b>추천 명단에 선정</b>했으며, 공개 프로필은 이번 주 명단과 함께 담당자에게 전달됩니다.',
        en: '<b>STS</b> is hiring a <b>Home Appliance Sales</b> role (technical/HVAC understanding preferred) via FYI. The FYI team reviewed all profiles and <b>nominated you</b>; your public profile goes to the recruiter with this week\'s list.',
      },
      initial: 'S', company: 'STS', title: 'Sale Thiết Bị Gia Dụng', meta: 'Onsite · Quận 7, TP.HCM · Ưu tiên hiểu biết kỹ thuật', tail: BENEFIT_PUBLIC,
    }),
  },
  {
    match: /^sts-.*-private/,
    subject: {
      vi: '[FYI] Bạn được chọn vào danh sách đề cử — Kế toán Nội bộ tại STS',
      ko: '[FYI] 추천 후보 명단에 선정되셨습니다 — STS 내부회계',
      en: "[FYI] You've been nominated — Internal Accountant at STS",
    },
    desc: 'STS 추천 (9/4): 비공개 프레임 — 내부회계(V62) 1공고, 호치민 7군 온사이트, Finance×1y+ 룰 선정. 세일즈 공고(V63)는 JD 불일치로 보류. 1그룹(acct).',
    source: 'scripts/outreach/ktc0904-recommend-coldmail.mjs',
    html: (lang) => recommendShell(lang, {
      intro: {
        vi: '<b>STS</b> — doanh nghiệp đang tuyển dụng qua FYI, văn phòng tại Quận 7, TP.HCM.',
        ko: '<b>STS</b>가 FYI를 통해 채용 중입니다(호치민 7군 오피스).',
        en: '<b>STS</b> is hiring via FYI (District 7, HCMC office).',
      },
      initial: 'S', company: 'STS', title: 'Kế toán Nội bộ', meta: 'Onsite · Quận 7, TP.HCM', tail: BENEFIT_PRIVATE,
    }),
  },
  {
    match: /^sts-/,
    subject: {
      vi: '[FYI] Bạn được chọn vào danh sách đề cử gửi STS — Kế toán Nội bộ',
      ko: '[FYI] STS 추천 명단에 선정되셨습니다 — 내부회계',
      en: "[FYI] You've been nominated to STS — Internal Accountant",
    },
    desc: 'STS 추천 (9/4): 공개 프레임 — FYI 검토 선정·명단에 프로필 동봉·지원 시 우선 검토. 1그룹(acct).',
    source: 'scripts/outreach/ktc0904-recommend-coldmail.mjs',
    html: (lang) => recommendShell(lang, {
      intro: {
        vi: '<b>STS</b> — doanh nghiệp đang tuyển dụng qua FYI, văn phòng tại Quận 7, TP.HCM. Đội ngũ FYI đã xem xét toàn bộ hồ sơ và <b>chọn bạn vào danh sách đề cử</b> — hồ sơ công khai của bạn sẽ được gửi kèm danh sách cho nhà tuyển dụng trong tuần này.',
        ko: '<b>STS</b>가 FYI를 통해 채용 중입니다(호치민 7군). FYI 팀이 이력서 전체를 검토해 회원님을 <b>추천 명단에 선정</b>했으며, 공개 프로필은 이번 주 명단과 함께 담당자에게 전달됩니다.',
        en: '<b>STS</b> is hiring via FYI (District 7, HCMC). The FYI team reviewed all profiles and <b>nominated you</b>; your public profile goes to the recruiter with this week\'s list.',
      },
      initial: 'S', company: 'STS', title: 'Kế toán Nội bộ', meta: 'Onsite · Quận 7, TP.HCM', tail: BENEFIT_PUBLIC,
    }),
  },
  {
    match: /^bluestar-.*-private/,
    subject: {
      vi: '[FYI] Bạn được chọn vào danh sách đề cử — {{포지션}} tại BlueStar Asia',
      ko: '[FYI] 추천 후보 명단에 선정되셨습니다 — BlueStar Asia {{포지션}}',
      en: "[FYI] You've been nominated — {{position}} at BlueStar Asia",
    },
    desc: '블루스타아시아 추천 (9/4·9/7): 비공개 프레임 — 한국계 급식 F&B 기업, 직군×어학인증 룰 선정. 그룹 assist/hr/proc/acct + 9/7 qaqc(제조 QC 신호) 추가. 영양사는 풀 없음 제외.',
    source: 'scripts/outreach/ktc0904-recommend-coldmail.mjs',
    html: (lang) => recommendShell(lang, {
      intro: {
        vi: '<b>BlueStar Asia</b> — doanh nghiệp Hàn Quốc trong lĩnh vực dịch vụ suất ăn công nghiệp (F&B) — đang tuyển nhiều vị trí qua FYI, làm việc tại Bình Lợi Trung, TP.HCM.',
        ko: '한국계 산업 급식·F&B 기업 <b>BlueStar Asia</b>가 FYI를 통해 다수 포지션을 채용 중입니다(호치민 Bình Lợi Trung 온사이트).',
        en: '<b>BlueStar Asia</b> — a Korean industrial catering (F&B) company — is hiring multiple roles via FYI (Bình Lợi Trung, HCMC).',
      },
      initial: 'B', company: 'BlueStar Asia', title: '{{공고 제목}}', meta: 'Onsite · Bình Lợi Trung, TP.HCM', tail: BENEFIT_PRIVATE,
    }),
  },
  {
    match: /^bluestar-/,
    subject: {
      vi: '[FYI] Bạn được chọn vào danh sách đề cử gửi BlueStar Asia — {{포지션}}',
      ko: '[FYI] BlueStar Asia 추천 명단에 선정되셨습니다 — {{포지션}}',
      en: "[FYI] You've been nominated to BlueStar Asia — {{position}}",
    },
    desc: '블루스타아시아 추천 (9/4·9/7): 공개 프레임 — FYI 검토 선정·명단에 프로필 동봉·지원 시 우선 검토. 그룹 assist/hr/proc/acct + 9/7 qaqc.',
    source: 'scripts/outreach/ktc0904-recommend-coldmail.mjs',
    html: (lang) => recommendShell(lang, {
      intro: {
        vi: '<b>BlueStar Asia</b> — doanh nghiệp Hàn Quốc trong lĩnh vực dịch vụ suất ăn công nghiệp (F&B) — đang tuyển nhiều vị trí qua FYI (Bình Lợi Trung, TP.HCM). Đội ngũ FYI đã xem xét toàn bộ hồ sơ và <b>chọn bạn vào danh sách đề cử</b> — hồ sơ công khai của bạn sẽ được gửi kèm danh sách cho nhà tuyển dụng trong tuần này.',
        ko: '한국계 산업 급식·F&B 기업 <b>BlueStar Asia</b>가 FYI를 통해 다수 포지션을 채용 중입니다. FYI 팀이 이력서 전체를 검토해 회원님을 <b>추천 명단에 선정</b>했으며, 공개 프로필은 이번 주 명단과 함께 담당자에게 전달됩니다.',
        en: '<b>BlueStar Asia</b> — a Korean industrial catering (F&B) company — is hiring via FYI. The FYI team reviewed all profiles and <b>nominated you</b>; your public profile goes to the recruiter with this week\'s list.',
      },
      initial: 'B', company: 'BlueStar Asia', title: '{{공고 제목}}', meta: 'Onsite · Bình Lợi Trung, TP.HCM', tail: BENEFIT_PUBLIC,
    }),
  },
  {
    match: /^overlay-.*-private/,
    subject: {
      vi: '[FYI] Bạn được chọn vào danh sách đề cử — {{포지션}} tại Overlay',
      ko: '[FYI] 추천 후보 명단에 선정되셨습니다 — Overlay {{포지션}}',
      en: "[FYI] You've been nominated — {{position}} at Overlay",
    },
    desc: '오버레이 추천 (8/30): 비공개 프레임 — VTYLE(VRChat 아바타 패션) 3D 아티스트 2공고(R143 의상/R144 리거), 원격·경력무관, 3D툴 룰 선정. 2그룹(cloth/rig).',
    source: 'scripts/outreach/overlay-recommend-coldmail.mjs',
    html: (lang) => recommendShell(lang, {
      intro: {
        vi: '<b>Overlay</b> — công ty Hàn Quốc vận hành <b>VTYLE</b>, nền tảng thời trang cho avatar 3D trên VRChat — đang tuyển 3D Artist qua FYI. Không yêu cầu kinh nghiệm, làm việc từ xa 100%. Đội ngũ FYI đã xem xét toàn bộ hồ sơ và <b>chọn bạn vào danh sách đề cử</b>.',
        ko: 'VRChat 아바타 패션 플랫폼 <b>VTYLE</b>을 운영하는 한국 기업 <b>Overlay</b>가 FYI를 통해 3D 아티스트를 채용 중입니다. 경력 무관·100% 원격. FYI 팀이 이력서 전체를 검토해 회원님을 <b>추천 명단에 선정</b>했습니다.',
        en: '<b>Overlay</b> — the Korean company behind <b>VTYLE</b>, a fashion platform for 3D avatars on VRChat — is hiring 3D artists via FYI. No experience required, 100% remote. The FYI team reviewed all profiles and <b>nominated you</b>.',
      },
      initial: 'O', company: 'Overlay (VTYLE)', title: '{{공고 제목}}', meta: 'Remote 100% · TT 4–5tr / Junior 10–12tr ₫', tail: BENEFIT_PRIVATE,
    }),
  },
  {
    match: /^overlay-/,
    subject: {
      vi: '[FYI] Bạn được chọn vào danh sách đề cử gửi Overlay — {{포지션}}',
      ko: '[FYI] Overlay 추천 명단에 선정되셨습니다 — {{포지션}}',
      en: "[FYI] You've been nominated to Overlay — {{position}}",
    },
    desc: '오버레이 추천 (8/30): 공개 프레임 — FYI 검토 선정·명단에 프로필 동봉·지원 시 우선 검토. 2그룹(cloth/rig).',
    source: 'scripts/outreach/overlay-recommend-coldmail.mjs',
    html: (lang) => recommendShell(lang, {
      intro: {
        vi: '<b>Overlay</b> — công ty Hàn Quốc vận hành <b>VTYLE</b>, nền tảng thời trang cho avatar 3D trên VRChat — đang tuyển 3D Artist qua FYI. Không yêu cầu kinh nghiệm, làm việc từ xa 100%. Đội ngũ FYI đã xem xét toàn bộ hồ sơ và <b>chọn bạn vào danh sách đề cử</b> — hồ sơ công khai của bạn sẽ được gửi kèm danh sách cho nhà tuyển dụng trong tuần này.',
        ko: 'VRChat 아바타 패션 플랫폼 <b>VTYLE</b>을 운영하는 한국 기업 <b>Overlay</b>가 FYI를 통해 3D 아티스트를 채용 중입니다. FYI 팀이 이력서 전체를 검토해 회원님을 <b>추천 명단에 선정</b>했으며, 공개 프로필은 이번 주 명단과 함께 담당자에게 전달됩니다.',
        en: '<b>Overlay</b> — the Korean company behind <b>VTYLE</b>, a fashion platform for 3D avatars on VRChat — is hiring 3D artists via FYI. The FYI team reviewed all profiles and <b>nominated you</b>; your public profile goes to the recruiter with this week\'s list.',
      },
      initial: 'O', company: 'Overlay (VTYLE)', title: '{{공고 제목}}', meta: 'Remote 100% · TT 4–5tr / Junior 10–12tr ₫', tail: BENEFIT_PUBLIC,
    }),
  },
  {
    match: /^exporum-.*-private/,
    subject: {
      vi: '[FYI] Bạn được chọn vào danh sách đề cử — {{포지션}} tại EXPORUM Vietnam',
      ko: '[FYI] 추천 후보 명단에 선정되셨습니다 — EXPORUM Vietnam {{포지션}}',
      en: "[FYI] You've been nominated — {{position}} at EXPORUM Vietnam",
    },
    desc: '엑스포럼 추천 (8/28): 비공개 프레임 — Cafe Show Vietnam 주최사 인턴 2공고(V23 마케팅/V24 프로젝트), 주니어(0-2y)×HCMC권 룰 선정. 2그룹(mkt/prj).',
    source: 'scripts/outreach/exporum-recommend-coldmail.mjs',
    html: (lang) => recommendShell(lang, {
      intro: {
        vi: '<b>EXPORUM Vietnam</b> — đơn vị tổ chức triển lãm quốc tế đến từ Hàn Quốc, chủ trì <b>Cafe Show Vietnam</b> — đang tuyển thực tập sinh (3 tháng, Quận 1, TP.HCM) qua FYI. Không yêu cầu kinh nghiệm. Đội ngũ FYI đã xem xét toàn bộ hồ sơ và <b>chọn bạn vào danh sách đề cử</b>.',
        ko: 'Cafe Show Vietnam을 주최하는 한국계 국제 전시 기업 <b>EXPORUM Vietnam</b>이 FYI를 통해 인턴(3개월, 호치민 1군)을 채용 중입니다. 경력 무관. FYI 팀이 이력서 전체를 검토해 회원님을 <b>추천 명단에 선정</b>했습니다.',
        en: '<b>EXPORUM Vietnam</b> — the Korean international exhibition organizer behind <b>Cafe Show Vietnam</b> — is hiring interns (3 months, District 1, HCMC) via FYI. The FYI team reviewed all profiles and <b>nominated you</b>.',
      },
      initial: 'E', company: 'EXPORUM Vietnam', title: '{{공고 제목}}', meta: 'Thực tập 3 tháng · Quận 1, TP.HCM · Onsite', tail: BENEFIT_PRIVATE,
    }),
  },
  {
    match: /^exporum-/,
    subject: {
      vi: '[FYI] Bạn được chọn vào danh sách đề cử gửi EXPORUM Vietnam — {{포지션}}',
      ko: '[FYI] EXPORUM Vietnam 추천 명단에 선정되셨습니다 — {{포지션}}',
      en: "[FYI] You've been nominated to EXPORUM Vietnam — {{position}}",
    },
    desc: '엑스포럼 추천 (8/28): 공개 프레임 — FYI 검토 선정·명단에 프로필 동봉·지원 시 우선 검토. 2그룹(mkt/prj).',
    source: 'scripts/outreach/exporum-recommend-coldmail.mjs',
    html: (lang) => recommendShell(lang, {
      intro: {
        vi: '<b>EXPORUM Vietnam</b> — đơn vị tổ chức triển lãm quốc tế đến từ Hàn Quốc, chủ trì <b>Cafe Show Vietnam</b> — đang tuyển thực tập sinh (3 tháng, Quận 1, TP.HCM) qua FYI. Đội ngũ FYI đã xem xét toàn bộ hồ sơ và <b>chọn bạn vào danh sách đề cử</b> — hồ sơ công khai của bạn sẽ được gửi kèm danh sách cho nhà tuyển dụng trong tuần này.',
        ko: 'Cafe Show Vietnam을 주최하는 한국계 국제 전시 기업 <b>EXPORUM Vietnam</b>이 FYI를 통해 인턴(3개월, 호치민 1군)을 채용 중입니다. FYI 팀이 이력서 전체를 검토해 회원님을 <b>추천 명단에 선정</b>했으며, 공개 프로필은 이번 주 명단과 함께 담당자에게 전달됩니다.',
        en: '<b>EXPORUM Vietnam</b> — the Korean international exhibition organizer behind <b>Cafe Show Vietnam</b> — is hiring interns (3 months, District 1, HCMC) via FYI. The FYI team reviewed all profiles and <b>nominated you</b>; your public profile goes to the recruiter with this week\'s list.',
      },
      initial: 'E', company: 'EXPORUM Vietnam', title: '{{공고 제목}}', meta: 'Thực tập 3 tháng · Quận 1, TP.HCM · Onsite', tail: BENEFIT_PUBLIC,
    }),
  },
  {
    match: /^megazone-.*-private/,
    subject: {
      vi: '[FYI] Bạn được chọn vào danh sách đề cử — {{포지션}} tại MEGAZONE Vietnam',
      ko: '[FYI] 추천 후보 명단에 선정되셨습니다 — MEGAZONE Vietnam {{포지션}}',
      en: "[FYI] You've been nominated — {{position}} at MEGAZONE Vietnam",
    },
    desc: '메가존 추천 (8/28): 비공개 프레임 — 한국계 클라우드 MSP(AWS) 3공고(V25 AM/V26 CSA/V27 Pre-sales), 30-39M ₫, 하노이·호치민 룰 선정. 3그룹(am/csa/pse).',
    source: 'scripts/outreach/megazone-recommend-coldmail.mjs',
    html: (lang) => recommendShell(lang, {
      intro: {
        vi: '<b>MEGAZONE Vietnam</b> — thành viên của MEGAZONE CLOUD, nhà cung cấp dịch vụ quản lý đám mây (MSP) hàng đầu Hàn Quốc và đối tác cấp cao của AWS — đang tuyển dụng các vị trí chủ chốt tại Việt Nam qua FYI. Đội ngũ FYI đã xem xét toàn bộ hồ sơ và <b>chọn bạn vào danh sách đề cử</b>.',
        ko: '한국 1위 클라우드 MSP <b>메가존클라우드</b>의 베트남 법인 <b>MEGAZONE Vietnam</b>이 FYI를 통해 주요 포지션(AWS)을 채용 중입니다. FYI 팀이 이력서 전체를 검토해 회원님을 <b>추천 명단에 선정</b>했습니다.',
        en: "<b>MEGAZONE Vietnam</b> — part of MEGAZONE CLOUD, Korea's leading cloud MSP and premier AWS partner — is hiring key positions in Vietnam via FYI. The FYI team reviewed all profiles and <b>nominated you</b>.",
      },
      initial: 'M', company: 'MEGAZONE Vietnam', title: '{{공고 제목}}', meta: '30–39 triệu ₫/tháng · {{지역}} · Onsite', tail: BENEFIT_PRIVATE,
    }),
  },
  {
    match: /^megazone-/,
    subject: {
      vi: '[FYI] Bạn được chọn vào danh sách đề cử gửi MEGAZONE Vietnam — {{포지션}}',
      ko: '[FYI] MEGAZONE Vietnam 추천 명단에 선정되셨습니다 — {{포지션}}',
      en: "[FYI] You've been nominated to MEGAZONE Vietnam — {{position}}",
    },
    desc: '메가존 추천 (8/28): 공개 프레임 — FYI 검토 선정·명단에 프로필 동봉·지원 시 우선 검토. 3그룹(am/csa/pse).',
    source: 'scripts/outreach/megazone-recommend-coldmail.mjs',
    html: (lang) => recommendShell(lang, {
      intro: {
        vi: '<b>MEGAZONE Vietnam</b> — thành viên của MEGAZONE CLOUD, nhà cung cấp dịch vụ quản lý đám mây (MSP) hàng đầu Hàn Quốc và đối tác cấp cao của AWS — đang tuyển dụng các vị trí chủ chốt tại Việt Nam qua FYI. Đội ngũ FYI đã xem xét toàn bộ hồ sơ và <b>chọn bạn vào danh sách đề cử</b> — hồ sơ công khai của bạn sẽ được gửi kèm danh sách cho nhà tuyển dụng trong tuần này.',
        ko: '한국 1위 클라우드 MSP <b>메가존클라우드</b>의 베트남 법인 <b>MEGAZONE Vietnam</b>이 FYI를 통해 주요 포지션(AWS)을 채용 중입니다. FYI 팀이 이력서 전체를 검토해 회원님을 <b>추천 명단에 선정</b>했으며, 공개 프로필은 이번 주 명단과 함께 담당자에게 전달됩니다.',
        en: "<b>MEGAZONE Vietnam</b> — part of MEGAZONE CLOUD, Korea's leading cloud MSP and premier AWS partner — is hiring key positions in Vietnam via FYI. The FYI team reviewed all profiles and <b>nominated you</b>; your public profile goes to the recruiter with this week's list.",
      },
      initial: 'M', company: 'MEGAZONE Vietnam', title: '{{공고 제목}}', meta: '30–39 triệu ₫/tháng · {{지역}} · Onsite', tail: BENEFIT_PUBLIC,
    }),
  },
  {
    match: /^atop-.*-private/,
    subject: {
      vi: '[FYI] Bạn được chọn vào danh sách đề cử — Thực tập sinh tiếng Hàn – Dịch thuật & Hành chính văn phòng tại Atop Study Cafe',
      ko: '[FYI] 추천 후보 명단에 선정되셨습니다 — Atop Study Cafe 한국어 통번역·사무 인턴',
      en: "[FYI] You've been nominated — Korean Translation & Office Admin Intern at Atop Study Cafe",
    },
    desc: '아톱 스터디카페 추천 (8/27): 비공개 프레임 — HCMC 7군 통번역·사무 인턴, TOPIK4+×주니어(0-2y)×HCMC권 13명(A10/B3).',
    source: 'scripts/outreach/atop-recommend-coldmail.mjs',
    html: (lang) => recommendShell(lang, {
      intro: {
        vi: '<b>Atop Study Cafe</b> — study cafe phong cách Hàn Quốc tại Quận 7, TP.HCM — đang tuyển thực tập sinh tiếng Hàn (dịch thuật Hàn–Việt &amp; hành chính văn phòng) qua FYI. Không yêu cầu kinh nghiệm, được đào tạo trong công việc. Đội ngũ FYI đã xem xét toàn bộ hồ sơ và <b>chọn bạn vào danh sách đề cử</b>.',
        ko: '호치민 7군의 한국식 스터디카페 <b>Atop Study Cafe</b>가 FYI를 통해 한국어 통번역·사무 인턴을 채용 중입니다. 경력 무관·실무 교육 제공. FYI 팀이 이력서 전체를 검토해 회원님을 <b>추천 명단에 선정</b>했습니다.',
        en: '<b>Atop Study Cafe</b> — a Korean-style study cafe in District 7, HCMC — is hiring a Korean translation & office admin intern via FYI. No experience required. The FYI team reviewed all profiles and <b>nominated you</b>.',
      },
      initial: 'A', company: 'Atop Study Cafe', title: 'Thực tập sinh tiếng Hàn – Dịch thuật & HC văn phòng', meta: 'Thực tập · Quận 7, TP.HCM · Onsite', tail: BENEFIT_PRIVATE,
    }),
  },
  {
    match: /^atop-/,
    subject: {
      vi: '[FYI] Bạn được chọn vào danh sách đề cử gửi Atop Study Cafe — Thực tập sinh tiếng Hàn – Dịch thuật & Hành chính văn phòng',
      ko: '[FYI] Atop Study Cafe 추천 명단에 선정되셨습니다 — 한국어 통번역·사무 인턴',
      en: "[FYI] You've been nominated to Atop Study Cafe — Korean Translation & Office Admin Intern",
    },
    desc: '아톱 스터디카페 추천 (8/27): 공개 프레임 — FYI 검토 선정·명단에 프로필 동봉·지원 시 우선 검토.',
    source: 'scripts/outreach/atop-recommend-coldmail.mjs',
    html: (lang) => recommendShell(lang, {
      intro: {
        vi: '<b>Atop Study Cafe</b> — study cafe phong cách Hàn Quốc tại Quận 7, TP.HCM — đang tuyển thực tập sinh tiếng Hàn (dịch thuật Hàn–Việt &amp; hành chính văn phòng) qua FYI. Không yêu cầu kinh nghiệm, được đào tạo trong công việc. Đội ngũ FYI đã xem xét toàn bộ hồ sơ và <b>chọn bạn vào danh sách đề cử</b> — hồ sơ công khai của bạn sẽ được gửi kèm danh sách cho nhà tuyển dụng trong tuần này.',
        ko: '호치민 7군의 한국식 스터디카페 <b>Atop Study Cafe</b>가 FYI를 통해 한국어 통번역·사무 인턴을 채용 중입니다. FYI 팀이 이력서 전체를 검토해 회원님을 <b>추천 명단에 선정</b>했으며, 공개 프로필은 이번 주 명단과 함께 담당자에게 전달됩니다.',
        en: "<b>Atop Study Cafe</b> — a Korean-style study cafe in District 7, HCMC — is hiring a Korean translation & office admin intern via FYI. The FYI team reviewed all profiles and <b>nominated you</b>; your public profile goes to the recruiter with this week's list.",
      },
      initial: 'A', company: 'Atop Study Cafe', title: 'Thực tập sinh tiếng Hàn – Dịch thuật & HC văn phòng', meta: 'Thực tập · Quận 7, TP.HCM · Onsite', tail: BENEFIT_PUBLIC,
    }),
  },
  {
    match: /^gasdna-.*-private/,
    subject: {
      vi: '[FYI] Bạn được chọn vào danh sách đề cử — Kỹ sư Firmware & Thiết kế Mạch điện tử (làm việc tại Hàn Quốc) tại GasDNA',
      ko: '[FYI] 추천 후보 명단에 선정되셨습니다 — GasDNA 펌웨어·회로설계 엔지니어 (한국 근무)',
      en: "[FYI] You've been nominated — Firmware & Circuit Design Engineer (work in Korea) at GasDNA",
    },
    desc: '가스디엔에이 추천 (8/27): 비공개 프레임 — 한국행 E-7 펌웨어·회로, 룰 스캔 E-7(1y+/석사)×임베디드 16명(A5/B5/C6).',
    source: 'scripts/outreach/gasdna-recommend-coldmail.mjs',
    html: (lang) => recommendShell(lang, {
      intro: {
        vi: '<b>GasDNA</b> — nhà sản xuất máy dò khí hàng đầu Hàn Quốc (Incheon, ISO/CE/ATEX, xuất khẩu 20+ quốc gia) — đang tuyển kỹ sư firmware &amp; mạch điện tử làm việc tại Hàn Quốc (visa E-7) qua FYI. Không yêu cầu tiếng Hàn. Đội ngũ FYI đã xem xét toàn bộ hồ sơ và <b>chọn bạn vào danh sách đề cử</b>.',
        ko: '한국의 가스검지기 전문 제조사 <b>가스디엔에이(GasDNA)</b>가 FYI를 통해 한국 근무(E-7) 펌웨어·회로설계 엔지니어를 채용 중입니다. 한국어 요건은 없습니다. FYI 팀이 이력서 전체를 검토해 회원님을 <b>추천 명단에 선정</b>했습니다.',
        en: "<b>GasDNA</b> — Korea's leading gas detector manufacturer (Incheon, ISO/CE/ATEX, exporting to 20+ countries) — is hiring a firmware & circuit design engineer to work in Korea (E-7 visa) via FYI. The FYI team reviewed all profiles and <b>nominated you</b>.",
      },
      initial: 'G', company: 'GasDNA', title: 'Kỹ sư Firmware & Thiết kế Mạch điện tử', meta: '45–48 triệu ₫/tháng · Hàn Quốc (E-7)', tail: BENEFIT_PRIVATE,
    }),
  },
  {
    match: /^gasdna-/,
    subject: {
      vi: '[FYI] Bạn được chọn vào danh sách đề cử gửi GasDNA — Kỹ sư Firmware & Thiết kế Mạch điện tử (làm việc tại Hàn Quốc)',
      ko: '[FYI] GasDNA 추천 명단에 선정되셨습니다 — 펌웨어·회로설계 엔지니어 (한국 근무)',
      en: "[FYI] You've been nominated to GasDNA — Firmware & Circuit Design Engineer (work in Korea)",
    },
    desc: '가스디엔에이 추천 (8/27): 공개 프레임 — FYI 검토 선정·명단에 프로필 동봉·지원 시 우선 검토.',
    source: 'scripts/outreach/gasdna-recommend-coldmail.mjs',
    html: (lang) => recommendShell(lang, {
      intro: {
        vi: '<b>GasDNA</b> — nhà sản xuất máy dò khí hàng đầu Hàn Quốc (Incheon, ISO/CE/ATEX, xuất khẩu 20+ quốc gia) — đang tuyển kỹ sư firmware &amp; mạch điện tử làm việc tại Hàn Quốc (visa E-7) qua FYI. Không yêu cầu tiếng Hàn. Đội ngũ FYI đã xem xét toàn bộ hồ sơ và <b>chọn bạn vào danh sách đề cử</b> — hồ sơ công khai của bạn sẽ được gửi kèm danh sách cho nhà tuyển dụng trong tuần này.',
        ko: '한국의 가스검지기 전문 제조사 <b>가스디엔에이(GasDNA)</b>가 FYI를 통해 한국 근무(E-7) 펌웨어·회로설계 엔지니어를 채용 중입니다. FYI 팀이 이력서 전체를 검토해 회원님을 <b>추천 명단에 선정</b>했으며, 공개 프로필은 이번 주 명단과 함께 담당자에게 전달됩니다.',
        en: "<b>GasDNA</b> — Korea's leading gas detector manufacturer (Incheon, ISO/CE/ATEX, exporting to 20+ countries) — is hiring a firmware & circuit design engineer to work in Korea (E-7 visa) via FYI. The FYI team reviewed all profiles and <b>nominated you</b>; your public profile goes to the recruiter with this week's list.",
      },
      initial: 'G', company: 'GasDNA', title: 'Kỹ sư Firmware & Thiết kế Mạch điện tử', meta: '45–48 triệu ₫/tháng · Hàn Quốc (E-7)', tail: BENEFIT_PUBLIC,
    }),
  },
  {
    match: /^rothea-.*-private/,
    subject: {
      vi: '[FYI] Bạn được chọn vào danh sách đề cử — Performance Marketer — Amazon US E-commerce tại Rothea',
      ko: '[FYI] 추천 후보 명단에 선정되셨습니다 — Rothea Performance Marketer (Amazon US)',
      en: "[FYI] You've been nominated — Performance Marketer (Amazon US E-commerce) at Rothea",
    },
    desc: '로테아 추천 (8/26): 비공개 프레임 — 북미 아마존/월마트/틱톡샵 운영, CV 원본 스캔 A(아마존 US 접점)+B(글로벌 마켓플레이스 2y+) 30명.',
    source: 'scripts/outreach/rothea-recommend-coldmail.mjs',
    html: (lang) => recommendShell(lang, {
      intro: {
        vi: '<b>Rothea</b> — thương hiệu skincare Hàn Quốc (Resilience Cream) đang vận hành kênh e-commerce Bắc Mỹ (Amazon US/Canada, Walmart, TikTok Shop US) — đang tuyển qua FYI. Làm việc bằng tiếng Anh. Đội ngũ FYI đã xem xét toàn bộ hồ sơ và <b>chọn bạn vào danh sách đề cử</b>.',
        ko: '북미 아마존·월마트·틱톡샵 채널을 운영하는 K뷰티 스킨케어 브랜드 <b>로테아</b>가 FYI를 통해 채용 중입니다. 업무 언어는 영어입니다. FYI 팀이 이력서 전체를 검토해 회원님을 <b>추천 명단에 선정</b>했습니다.',
        en: '<b>Rothea</b> — a Korean skincare brand (Resilience Cream) running North American e-commerce channels (Amazon US/Canada, Walmart, TikTok Shop US) — is hiring via FYI. The FYI team reviewed all profiles and <b>nominated you</b>.',
      },
      initial: 'R', company: 'Rothea', title: 'Performance Marketer', meta: '32–35 triệu ₫/tháng · HCM, ĐN, HN', tail: BENEFIT_PRIVATE,
    }),
  },
  {
    match: /^rothea-/,
    subject: {
      vi: '[FYI] Bạn được chọn vào danh sách đề cử gửi Rothea — Performance Marketer — Amazon US E-commerce',
      ko: '[FYI] Rothea 추천 명단에 선정되셨습니다 — Performance Marketer (Amazon US)',
      en: "[FYI] You've been nominated to Rothea — Performance Marketer (Amazon US E-commerce)",
    },
    desc: '로테아 추천 (8/26): 공개 프레임 — FYI 검토 선정·명단에 프로필 동봉·지원 시 우선 검토.',
    source: 'scripts/outreach/rothea-recommend-coldmail.mjs',
    html: (lang) => recommendShell(lang, {
      intro: {
        vi: '<b>Rothea</b> — thương hiệu skincare Hàn Quốc (Resilience Cream) đang vận hành kênh e-commerce Bắc Mỹ (Amazon US/Canada, Walmart, TikTok Shop US) — đang tuyển qua FYI. Làm việc bằng tiếng Anh. Đội ngũ FYI đã xem xét toàn bộ hồ sơ và <b>chọn bạn vào danh sách đề cử</b> — hồ sơ công khai của bạn sẽ được gửi kèm danh sách cho nhà tuyển dụng trong tuần này.',
        ko: '북미 아마존·월마트·틱톡샵 채널을 운영하는 K뷰티 스킨케어 브랜드 <b>로테아</b>가 FYI를 통해 채용 중입니다. FYI 팀이 이력서 전체를 검토해 회원님을 <b>추천 명단에 선정</b>했으며, 공개 프로필은 이번 주 명단과 함께 담당자에게 전달됩니다.',
        en: '<b>Rothea</b> — a Korean skincare brand (Resilience Cream) running North American e-commerce channels (Amazon US/Canada, Walmart, TikTok Shop US) — is hiring via FYI. The FYI team reviewed all profiles and <b>nominated you</b>; your public profile goes to the recruiter with this week\'s list.',
      },
      initial: 'R', company: 'Rothea', title: 'Performance Marketer', meta: '32–35 triệu ₫/tháng · HCM, ĐN, HN', tail: BENEFIT_PUBLIC,
    }),
  },
  {
    match: /^bada-.*-private/,
    subject: {
      vi: '[FYI] Bạn được chọn vào danh sách đề cử — {{포지션}} tại Bada Fintech',
      ko: '[FYI] 추천 후보 명단에 선정되셨습니다 — Bada Fintech {{포지션}}',
      en: "[FYI] You've been nominated — {{position}} at Bada Fintech",
    },
    desc: '바다핀테크 추천 (8/21): 비공개 프레임 — FYI 검토 선정·이번 주 명단 전달·지원 시 CV+추천 전달. 3그룹(plan/uiux/mkt).',
    source: 'scripts/outreach/bada-recommend-coldmail.mjs',
    html: (lang) => recommendShell(lang, {
      intro: {
        vi: '<b>Bada Fintech</b> — công ty fintech Hàn Quốc chuyên về giải pháp tài chính dựa trên khoản phải thu, kết nối với Ngân hàng Hana tại Hàn Quốc và Việt Nam — đang tuyển dụng các vị trí chủ chốt qua FYI. Đội ngũ FYI đã xem xét toàn bộ hồ sơ và <b>chọn bạn vào danh sách đề cử</b>.',
        ko: '하나은행 한국·베트남과 연계된 매출채권 기반 핀테크 <b>바다핀테크</b>가 FYI를 통해 주요 포지션을 채용 중입니다. FYI 팀이 이력서 전체를 검토해 회원님을 <b>추천 명단에 선정</b>했습니다.',
        en: '<b>Bada Fintech</b> — a Korean fintech in receivables financing working with Hana Bank Korea & Vietnam — is hiring via FYI. The FYI team reviewed all profiles and <b>nominated you</b>.',
      },
      initial: 'B', company: 'Bada Fintech', title: '{{공고 제목}}', meta: '{{급여 · 지역}}', tail: BENEFIT_PRIVATE,
    }),
  },
  {
    match: /^bada-/,
    subject: {
      vi: '[FYI] Bạn được chọn vào danh sách đề cử gửi Bada Fintech — {{포지션}}',
      ko: '[FYI] Bada Fintech 추천 명단에 선정되셨습니다 — {{포지션}}',
      en: "[FYI] You've been nominated to Bada Fintech — {{position}}",
    },
    desc: '바다핀테크 추천 (8/21): 공개 프레임 — FYI 검토 선정·명단에 프로필 동봉·지원 시 우선 검토. 3그룹(plan/uiux/mkt).',
    source: 'scripts/outreach/bada-recommend-coldmail.mjs',
    html: (lang) => recommendShell(lang, {
      intro: {
        vi: '<b>Bada Fintech</b> — công ty fintech Hàn Quốc chuyên về giải pháp tài chính dựa trên khoản phải thu, kết nối với Ngân hàng Hana tại Hàn Quốc và Việt Nam — đang tuyển dụng các vị trí chủ chốt qua FYI. Đội ngũ FYI đã xem xét toàn bộ hồ sơ và <b>chọn bạn vào danh sách đề cử</b> — hồ sơ công khai của bạn sẽ được gửi kèm danh sách cho nhà tuyển dụng trong tuần này.',
        ko: '하나은행 한국·베트남과 연계된 매출채권 기반 핀테크 <b>바다핀테크</b>가 FYI를 통해 주요 포지션을 채용 중입니다. FYI 팀이 이력서 전체를 검토해 회원님을 <b>추천 명단에 선정</b>했으며, 공개 프로필은 이번 주 명단과 함께 담당자에게 전달됩니다.',
        en: '<b>Bada Fintech</b> — a Korean fintech in receivables financing working with Hana Bank Korea & Vietnam — is hiring via FYI. The FYI team reviewed all profiles and <b>nominated you</b>; your public profile goes to the recruiter with this week\'s list.',
      },
      initial: 'B', company: 'Bada Fintech', title: '{{공고 제목}}', meta: '{{급여 · 지역}}', tail: BENEFIT_PUBLIC,
    }),
  },
  {
    match: /^mpnx-.*-private/,
    subject: {
      vi: '[FYI] Bạn được chọn vào danh sách đề cử — Senior Technical IP Analyst tại MPNX',
      ko: '[FYI] 추천 후보 명단에 선정되셨습니다 — MPNX Senior Technical IP Analyst',
      en: "[FYI] You've been nominated — Senior Technical IP Analyst at MPNX",
    },
    desc: 'MPNX 2차 (8/20): 비공개 프로필용 "FYI 검토 후 선정" 정직 프레임 — 지원 시 CV가 FYI 추천과 함께 전달.',
    source: 'scripts/outreach/mpnx-recommend-coldmail.mjs',
    html: (lang) => recommendShell(lang, {
      intro: {
        vi: 'Đội ngũ FYI đã xem xét toàn bộ hồ sơ đã đăng ký và <b>chọn bạn vào danh sách đề cử</b> cho vị trí này tại <b>MPNX</b> — công ty chuyên về thương mại hóa tài sản trí tuệ và cấp phép công nghệ (patent licensing) trên thị trường quốc tế.',
        ko: 'FYI 팀이 등록된 이력서 전체를 검토해 국제 특허 라이선싱 기업 <b>MPNX</b>의 이 포지션 <b>추천 명단에 선정</b>했습니다.',
        en: 'The FYI team reviewed all registered profiles and <b>nominated you</b> for this position at <b>MPNX</b>, an international patent licensing company.',
      },
      initial: 'M', company: 'MPNX', title: '{{공고 제목}}', meta: '{{직군 · 지역}}',
      tail: {
        vi: 'Hồ sơ của bạn đang ở chế độ riêng tư — nếu bạn ứng tuyển ngay, CV của bạn sẽ được gửi kèm lời giới thiệu từ FYI và được <b>ưu tiên xem xét</b>.',
        ko: '이력서가 비공개 상태라, 지금 지원하시면 CV가 FYI의 추천과 함께 전달되어 <b>우선 검토</b>됩니다.',
        en: "Your profile is private — apply now and your CV will be sent with FYI's recommendation for <b>priority review</b>.",
      },
    }),
  },
  {
    match: /^mpnx-/,
    subject: invitedSubject('MPNX'),
    desc: 'MPNX 단일공고 추천 (7/29 공개 프레임 · 8/20 2차 재사용): NALDA와 같은 "담당자가 봤다 · 우선검토" 톤.',
    source: 'scripts/outreach/mpnx-recommend-coldmail.mjs',
    html: (lang) => recommendShell(lang, {
      intro: {
        vi: 'Nhà tuyển dụng của <b>MPNX</b> đã xem hồ sơ của bạn trên FYI và <b>gửi cho bạn vị trí này</b> vì kinh nghiệm của bạn phù hợp với yêu cầu.',
        ko: '<b>MPNX</b>의 채용 담당자가 FYI에서 회원님의 프로필을 확인하고, 경력이 요구사항과 맞아 <b>이 포지션을 직접 보냈습니다</b>.',
        en: 'A recruiter at <b>MPNX</b> viewed your profile on FYI and <b>sent you this position</b> because your experience matches the requirements.',
      },
      initial: 'M', company: 'MPNX', title: '{{공고 제목}}', meta: '{{직군 · 지역}}', tail: BENEFIT_PUBLIC,
    }),
  },
  {
    match: /^manman-/,
    subject: invitedSubject('Man Man Market'),
    desc: 'Man Man Market 단일공고 추천 (7/29): 디자인 풀 대상. 공개="담당자가 봤다" / 비공개="맞는 자리가 열렸다" 두 프레임을 한 캠페인명으로 발송.',
    source: 'scripts/outreach/manman-recommend-coldmail.mjs',
    html: (lang) => recommendShell(lang, {
      intro: {
        vi: 'Nhà tuyển dụng của <b>Man Man Market</b> — doanh nghiệp bán lẻ &amp; thương mại điện tử Hàn Quốc, bán hàng qua kênh KakaoTalk — đã xem hồ sơ của bạn trên FYI và <b>gửi cho bạn vị trí này</b> vì kinh nghiệm thiết kế của bạn phù hợp.',
        ko: '카카오톡 채널로 판매하는 한국 리테일·이커머스 기업 <b>Man Man Market</b>의 채용 담당자가 FYI에서 회원님의 프로필을 확인하고, 디자인 경력이 맞아 <b>이 포지션을 직접 보냈습니다</b>.',
        en: 'A recruiter at <b>Man Man Market</b> — a Korean retail &amp; e-commerce business selling through KakaoTalk channels — viewed your profile on FYI and <b>sent you this position</b> because your design experience fits.',
      },
      initial: 'M', company: 'Man Man Market', title: '{{공고 제목}}', meta: '{{직군 · 지역}}', tail: BENEFIT_PUBLIC,
    }),
  },
  {
    match: /^presto-recommend1-public/,
    subject: invitedSubject('PRESTO SOLUTION'),
    desc: 'PRESTO SOLUTION 로봇·모션제어 SW 추천 · 공개 프레임 (8/7): "담당자가 당신 이력서를 보고 보냈다 · 우선검토". 대상은 C++/C# 보유 + 경력 7년 이하, 이력서에 제어/비전/임베디드/GUI 단서가 있는 순으로 정렬. 본문 둘째 문단이 세그먼트별 후크 6종으로 갈린다(개인화이지 캠페인 분리가 아니다 — 수신자가 적어 더 쪼개면 못 센다). 이 캠페인부터 푸터 수신거부(/api/coldmail/unsub) + List-Unsubscribe 원클릭 헤더.',
    source: 'scripts/outreach/presto-recommend-coldmail.mjs',
    html: (lang) => prestoShell(lang, { intro: PRESTO_INTRO.public, tail: BENEFIT_PUBLIC }),
  },
  {
    match: /^presto-recommend1-private/,
    subject: {
      vi: '[FYI] Bạn được chọn vào danh sách đề cử — Software Engineer (Robot & Motion Control)',
      ko: '[FYI] 추천 후보 명단에 선정되셨습니다 — Software Engineer (Robot & Motion Control)',
      en: '[FYI] You\'ve been selected for the nominee list — Software Engineer (Robot & Motion Control)',
    },
    desc: 'PRESTO SOLUTION 로봇·모션제어 SW 추천 · 비공개 프레임 (8/7): "FYI가 전체 이력서 검토 후 추천 명단에 선정 · 이번 주 담당자 전달 · 우선검토". ⚠️발송 후 실제 명단 공유 의무. 공개 프레임과 대상 선정·후크는 동일하고 인트로/혜택 문장만 다르다.',
    source: 'scripts/outreach/presto-recommend-coldmail.mjs',
    html: (lang) => prestoShell(lang, { intro: PRESTO_INTRO.private, tail: BENEFIT_PRIVATE }),
  },
  {
    match: /^zest-cad-recommend1-public/,
    subject: {
      vi: '[FYI] Zest đã xem hồ sơ của bạn và mời bạn ứng tuyển — Thiết kế kiến trúc & CAD',
      ko: '[FYI] Zest가 회원님의 이력서를 보고 지원을 요청했습니다 — 건축설계·CAD',
      en: '[FYI] Zest viewed your profile and invited you to apply — Architecture & CAD',
    },
    desc: 'Zest 건축설계·CAD(ZE3502) 추천 · 공개 프레임 (9/11): "Zest 담당자가 이력서를 보고 보냈다 · 우선검토". 대상=CAD/건축툴 보유 ≤4y 비개발(9/11 실측 4명 — FYI 풀 IT 편중으로 건축 풀 극소).',
    source: 'scripts/outreach/zest-cad-recommend-coldmail.mjs',
    html: (lang) => recommendShell(lang, {
      intro: {
        vi: 'Nhà tuyển dụng của <b>Zest</b> — công ty Hàn Quốc chuyên về kiến trúc bền vững, tư vấn chứng nhận công trình xanh và mô phỏng năng lượng tòa nhà — đã xem hồ sơ của bạn trên FYI và <b>gửi cho bạn vị trí này</b> vì kỹ năng CAD/kỹ thuật xây dựng của bạn phù hợp với yêu cầu.',
        ko: '지속가능 건축·그린빌딩 인증 컨설팅·건물 에너지 시뮬레이션 기업 <b>Zest</b>의 채용 담당자가 FYI에서 회원님의 프로필을 확인하고, CAD·건축 기술 역량이 요구사항과 맞아 <b>이 포지션을 직접 보냈습니다</b>.',
        en: 'A recruiter at <b>Zest</b> — a Korean company specializing in sustainable architecture, green building certification consulting and building energy simulation — viewed your profile on FYI and <b>sent you this position</b> because your CAD/construction skills match the requirements.',
      },
      initial: 'Z', company: 'Zest', title: 'Nhân viên thiết kế kiến trúc & CAD', meta: 'HCM/ĐN/HN · Fresher–3y · 10–14tr ₫', tail: BENEFIT_PUBLIC,
    }),
  },
  {
    match: /^zest-cad-recommend1-private/,
    subject: {
      vi: '[FYI] Bạn được chọn vào danh sách đề cử — Nhân viên thiết kế kiến trúc & CAD tại Zest',
      ko: '[FYI] Zest 건축설계·CAD 포지션 추천 명단에 선정되셨습니다',
      en: '[FYI] You\'ve been selected for the nominee list — Architecture & CAD at Zest',
    },
    desc: 'Zest 건축설계·CAD(ZE3502) 추천 · 비공개 프레임 (9/11): "FYI가 전체 이력서 검토 후 추천 명단에 선정 · 우선검토"(기한 문구 없음).',
    source: 'scripts/outreach/zest-cad-recommend-coldmail.mjs',
    html: (lang) => recommendShell(lang, {
      intro: {
        vi: 'Đội ngũ FYI đã xem xét toàn bộ hồ sơ đã đăng ký và <b>chọn bạn vào danh sách đề cử</b> cho vị trí này tại <b>Zest</b> — công ty Hàn Quốc chuyên về kiến trúc bền vững, tư vấn chứng nhận công trình xanh và mô phỏng năng lượng tòa nhà.',
        ko: 'FYI 팀이 등록된 이력서 전체를 검토해, 지속가능 건축·그린빌딩 인증 컨설팅 기업 <b>Zest</b>의 이 포지션 <b>추천 명단에 회원님을 선정</b>했습니다.',
        en: 'The FYI team reviewed every registered CV and <b>selected you for the nominee list</b> for this position at <b>Zest</b> — a Korean company specializing in sustainable architecture and green building consulting.',
      },
      initial: 'Z', company: 'Zest', title: 'Nhân viên thiết kế kiến trúc & CAD', meta: 'HCM/ĐN/HN · Fresher–3y · 10–14tr ₫', tail: BENEFIT_PRIVATE,
    }),
  },
  {
    match: /^zest-recommend1-public/,
    subject: invitedSubject('Zest'),
    desc: 'Zest Full-stack 추천 · 공개 프레임 (7/30): "Zest 담당자가 당신 이력서를 보고 보냈다 · 우선검토".',
    source: 'scripts/outreach/zest-recommend-coldmail.mjs',
    html: (lang) => recommendShell(lang, {
      intro: {
        vi: 'Nhà tuyển dụng của <b>Zest</b> — công ty công nghệ Hàn Quốc phát triển nền tảng AI Agent cho quản lý dự án xây dựng — đã xem hồ sơ của bạn trên FYI và <b>gửi cho bạn vị trí này</b> vì kinh nghiệm của bạn phù hợp với yêu cầu (Full-stack · Web · AI Agent).',
        ko: '건설 프로젝트 관리용 AI Agent 플랫폼을 개발하는 한국 테크 기업 <b>Zest</b>의 채용 담당자가 FYI에서 회원님의 프로필을 확인하고, 경력이 요구사항(Full-stack · Web · AI Agent)과 맞아 <b>이 포지션을 직접 보냈습니다</b>.',
        en: 'A recruiter at <b>Zest</b> — a Korean tech company building an AI Agent platform for construction project management — viewed your profile on FYI and <b>sent you this position</b> because your experience matches the requirements (Full-stack · Web · AI Agent).',
      },
      initial: 'Z', company: 'Zest', title: 'FULL-STACK DEVELOPER', meta: '{{지역 · 급여}}', tail: BENEFIT_PUBLIC,
    }),
  },
  {
    match: /^zest-recommend1-private/,
    subject: {
      vi: '[FYI] Bạn được chọn vào danh sách đề cử cho vị trí Full-stack tại Zest',
      ko: '[FYI] Zest Full-stack 포지션 추천 명단에 선정되셨습니다',
      en: '[FYI] You\'ve been selected for the Zest Full-stack nominee list',
    },
    desc: 'Zest Full-stack 추천 · 비공개 프레임 (7/30): "FYI가 전체 이력서 검토 후 추천 명단에 선정 · 이번 주 담당자 전달 · 우선검토" 선정+기한 훅. ⚠️발송 후 실제 명단 공유 의무.',
    source: 'scripts/outreach/zest-recommend-coldmail.mjs',
    html: (lang) => recommendShell(lang, {
      intro: {
        vi: '<b>Zest</b> — công ty công nghệ Hàn Quốc phát triển nền tảng AI Agent cho quản lý dự án xây dựng — đang tuyển Full-stack Developer qua FYI. Đội ngũ FYI đã xem xét toàn bộ hồ sơ đã đăng ký và <b>chọn bạn vào danh sách đề cử</b> gửi cho nhà tuyển dụng.',
        ko: '건설 프로젝트 관리용 AI Agent 플랫폼을 개발하는 한국 테크 기업 <b>Zest</b>가 FYI를 통해 Full-stack Developer를 채용 중입니다. FYI 팀이 등록된 이력서 전체를 검토해 회원님을 <b>기업에 전달할 추천 명단에 선정</b>했습니다.',
        en: '<b>Zest</b> — a Korean tech company building an AI Agent platform for construction project management — is hiring a Full-stack Developer through FYI. The FYI team reviewed every registered CV and <b>selected you for the nominee list</b> sent to the recruiter.',
      },
      initial: 'Z', company: 'Zest', title: 'FULL-STACK DEVELOPER', meta: '{{지역 · 급여}}', tail: BENEFIT_PRIVATE,
    }),
  },
  {
    match: /^wellpod-recommend1/,
    subject: {
      vi: '[FYI] Chúng tôi thấy "{{스펙 — 예: TOPIK 6 · 3 năm biên-phiên dịch}}" trong hồ sơ của bạn — có vị trí đang tìm đúng hồ sơ này',
      ko: '[FYI] 이력서의 "{{스펙 — 예: TOPIK 6급 · 통번역 3년}}"를 보고 연락드립니다 — 이 스펙을 찾는 자리가 났습니다',
      en: '[FYI] We saw "{{spec}}" in your CV — a role is looking for exactly this profile',
    },
    desc: 'Wellpod TikTok Shop & Shopify Executive 추천 (8/6): 한국어 가능 8명 전원 개인화 — 제목·본문에 본인 스펙(TOPIK·경력) 삽입, "스펙이 희소한데 그걸 찾는 자리가 났다·FYI가 CV 직접 전달·합격 가능성 매우 높음" 1:1 스카우트 톤, CTA는 전달 승낙("네, 전달해 주세요"). 명단/선정 언급 없음.',
    source: 'scripts/outreach/wellpod-recommend-coldmail.mjs',
    html: (lang) => {
      const s = pickLang({
        vi: {
          hi: 'Chào {{tên}}, đây là đội ngũ FYI.',
          intro: 'Chúng tôi liên hệ trực tiếp vì thấy điểm nổi bật trong hồ sơ của bạn — <b>{{개인화 — chuyên ngành tiếng Hàn, TOPIK 6 và 3 năm kinh nghiệm biên-phiên dịch}}</b>. Nhân sự có thể làm việc bằng tiếng Hàn rất hiếm trên thị trường tuyển dụng Việt Nam, và vị trí yêu cầu đúng hồ sơ này còn hiếm hơn. Vị trí đó vừa mở.',
          tail: 'Wellpod — công ty thương mại điện tử Hàn Quốc phân phối K-pop album toàn cầu và phát triển thương mại TikTok Shop — đang tìm người kết nối trụ sở Hàn Quốc và đội ngũ Việt Nam bằng <b>tiếng Hàn hoặc tiếng Trung</b>. Vì yêu cầu này rất hiếm, gần như không có nhiều ứng viên có thể ứng tuyển. Vì vậy FYI muốn gửi CV của bạn <b>trực tiếp cho nhà tuyển dụng Wellpod</b> — <b>khả năng trúng tuyển rất cao</b>.<br><br>Nếu bạn đồng ý, chỉ cần một nút — CV đã đăng ký sẽ được gửi kèm lời giới thiệu từ FYI.',
          meta: '15–20 triệu · HCM / Đà Nẵng / Hà Nội · Chào đón fresher', cta: 'Vâng, hãy gửi hồ sơ của tôi →',
        },
        ko: {
          hi: '안녕하세요 {{이름}}님, FYI 팀입니다.',
          intro: '이력서에서 눈에 띄는 게 있어 직접 연락드립니다 — <b>{{개인화 — 예: 한국어 전공에 TOPIK 6급, 통번역 3년 경력}}</b>. 한국어로 업무할 수 있는 인재는 베트남 채용 시장에서 매우 드물고, 이 스펙을 정확히 요구하는 자리는 더 드뭅니다. 마침 그 자리가 열렸습니다.',
          tail: 'K-pop 앨범 글로벌 유통과 TikTok Shop 커머스를 하는 한국 이커머스 기업 <b>Wellpod</b>가 <b>한국어 또는 중국어</b>로 한국 본사와 베트남 팀을 잇는 담당자를 찾습니다. 요구 스펙이 희소해서 지원할 수 있는 사람 자체가 거의 없는 자리입니다. 그래서 FYI가 회원님의 CV를 <b>Wellpod 담당자에게 직접 전달</b>하려고 합니다 — <b>합격 가능성이 매우 높습니다</b>.<br><br>의향이 있으시면 버튼 하나면 됩니다. 등록하신 CV가 FYI의 추천과 함께 바로 전달됩니다.',
          meta: '15–20 triệu · 호치민/다낭/하노이 · 신입 가능', cta: '네, 전달해 주세요 →',
        },
        en: {
          hi: 'Hi {{name}}, this is the FYI team.',
          intro: 'We\'re reaching out because something stood out in your CV — <b>{{personalized line}}</b>. People who can work in Korean are very rare in the Vietnamese job market, and roles requiring exactly this profile are rarer. One just opened.',
          tail: '<b>Wellpod</b> — a Korean e-commerce company distributing K-pop albums globally and building TikTok Shop commerce — is looking for someone to bridge the Korean HQ and the Vietnam team in <b>Korean or Chinese</b>. Because the requirement is so rare, very few candidates can apply at all. So FYI wants to send your CV <b>directly to the Wellpod recruiter</b> — <b>your chances are very high</b>.<br><br>If you\'re in, one tap is all it takes — your registered CV goes out with FYI\'s recommendation.',
          meta: '15–20M VND · HCMC / Da Nang / Hanoi · Freshers welcome', cta: 'Yes, send my CV →',
        },
      }, lang)
      return `<!doctype html><html><body style="margin:0;background:#faf9f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1a1612">
<div style="max-width:520px;margin:0 auto;padding:28px 16px">
  <div style="font-size:20px;font-weight:800;color:#ff6000;padding-bottom:18px">FYI</div>
  <p style="font-size:15px;line-height:1.6;margin:0 0 6px">${s.hi}</p>
  <p style="font-size:14px;line-height:1.65;color:#4a443c;margin:0 0 18px">${s.intro}</p>
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#fff;border:1px solid #eee5da;border-radius:14px;margin-bottom:14px"><tr>
    <td width="44" style="padding:14px 0 14px 14px;vertical-align:middle"><div style="width:44px;height:44px;border-radius:10px;background:#fff0e6;color:#ff6000;font-weight:800;font-size:16px;text-align:center;line-height:44px">W</div></td>
    <td style="padding:14px 14px 14px 12px;vertical-align:middle">
      <div style="font-size:12px;color:#8a8073;margin-bottom:3px">Wellpod</div>
      <div style="font-size:14.5px;font-weight:700;color:#1a1612;line-height:1.35">TikTok Shop &amp; Shopify Management Executive</div>
      <div style="font-size:12px;color:#b0691a;margin-top:3px">${s.meta}</div>
    </td>
  </tr></table>
  <p style="font-size:14px;line-height:1.65;color:#4a443c;margin:0 0 6px">${s.tail}</p>
  <div style="text-align:center;padding:16px 0 6px">
    <span style="display:inline-block;background:#ff6000;color:#fff;font-weight:700;font-size:15px;padding:14px 30px;border-radius:12px">${s.cta}</span>
  </div>
</div></body></html>`
    },
  },
  {
    match: /^mnf-recommend1-public/,
    subject: invitedSubject('MNF Solution'),
    desc: 'MNF Solution AI Engineer (LLM) 추천 · 공개 프레임 (8/6): 호치민 개발/AI 풀(키워드 매칭+gpt-4o-mini 오탐 필터) 대상, "담당자가 봤다 · 우선검토".',
    source: 'scripts/outreach/mnf-recommend-coldmail.mjs',
    html: (lang) => recommendShell(lang, {
      intro: {
        vi: 'Nhà tuyển dụng của <b>MNF Solution</b> — công ty Hàn Quốc xây dựng hệ sinh thái mobility trên nền tảng số, cung cấp giải pháp quản lý cho các công ty cho thuê xe — đã xem hồ sơ của bạn trên FYI và <b>gửi cho bạn vị trí này</b> vì nền tảng lập trình của bạn phù hợp với yêu cầu.',
        ko: '렌터카 관리 솔루션으로 모빌리티 생태계를 만드는 한국 기업 <b>MNF Solution</b>의 채용 담당자가 FYI에서 회원님의 프로필을 확인하고, 개발 역량이 요구사항과 맞아 <b>이 포지션을 직접 보냈습니다</b>.',
        en: 'A recruiter at <b>MNF Solution</b> — a Korean company building a mobility ecosystem on a digital platform, with management solutions for car-rental companies — viewed your profile on FYI and <b>sent you this position</b> because your engineering background fits the requirements.',
      },
      initial: 'M', company: 'MNF Solution', title: 'AI Engineer (LLM)', meta: 'On-site Quận 7 · TP.HCM · Lương thỏa thuận', tail: mnfTail(BENEFIT_PUBLIC),
    }),
  },
  {
    match: /^mnf-recommend1-private/,
    subject: {
      vi: '[FYI] Bạn được chọn vào danh sách đề cử cho vị trí AI Engineer (LLM) tại MNF Solution',
      ko: '[FYI] MNF Solution AI Engineer (LLM) 추천 명단에 선정되셨습니다',
      en: '[FYI] You\'ve been selected for the MNF Solution AI Engineer (LLM) nominee list',
    },
    desc: 'MNF Solution AI Engineer (LLM) 추천 · 비공개 프레임 (8/6): "FYI가 전체 이력서 검토 후 추천 명단에 선정 · 이번 주 담당자 전달 · 우선검토". ⚠️발송 후 실제 명단 공유 의무.',
    source: 'scripts/outreach/mnf-recommend-coldmail.mjs',
    html: (lang) => recommendShell(lang, {
      intro: {
        vi: '<b>MNF Solution</b> — công ty Hàn Quốc xây dựng hệ sinh thái mobility trên nền tảng số, cung cấp giải pháp quản lý cho các công ty cho thuê xe — đang tuyển AI Engineer (LLM) qua FYI. Đội ngũ FYI đã xem xét toàn bộ hồ sơ đã đăng ký và <b>chọn bạn vào danh sách đề cử</b> gửi cho nhà tuyển dụng.',
        ko: '렌터카 관리 솔루션으로 모빌리티 생태계를 만드는 한국 기업 <b>MNF Solution</b>이 FYI를 통해 AI Engineer (LLM)를 채용 중입니다. FYI 팀이 등록된 이력서 전체를 검토해 회원님을 <b>기업에 전달할 추천 명단에 선정</b>했습니다.',
        en: '<b>MNF Solution</b> — a Korean company building a mobility ecosystem on a digital platform — is hiring an AI Engineer (LLM) through FYI. The FYI team reviewed every registered CV and <b>selected you for the nominee list</b> sent to the recruiter.',
      },
      initial: 'M', company: 'MNF Solution', title: 'AI Engineer (LLM)', meta: 'On-site Quận 7 · TP.HCM · Lương thỏa thuận', tail: mnfTail(BENEFIT_PRIVATE),
    }),
  },
  {
    match: /^creatus-recommend1-public/,
    subject: invitedSubject('CREATUS'),
    desc: 'CREATUS Global Content Marketer 추천 · 공개 프레임 (7/30): 전략·어학형(마케팅/브랜드/PR) 풀 배정.',
    source: 'scripts/outreach/marketing-recommend-coldmail.mjs',
    html: (lang) => recommendShell(lang, {
      intro: {
        vi: 'Nhà tuyển dụng của <b>CREATUS</b> — công ty Hàn Quốc trong lĩnh vực Education, Content và Influencer Marketing, đang mở rộng ra thị trường toàn cầu — đã xem hồ sơ của bạn trên FYI và <b>gửi cho bạn vị trí này</b> vì kinh nghiệm marketing của bạn phù hợp với yêu cầu.',
        ko: 'Education·Content·Influencer Marketing 분야에서 글로벌 시장으로 확장 중인 한국 기업 <b>CREATUS</b>의 채용 담당자가 FYI에서 회원님의 프로필을 확인하고, 마케팅 경력이 요구사항과 맞아 <b>이 포지션을 직접 보냈습니다</b>.',
        en: 'A recruiter at <b>CREATUS</b> — a Korean company in Education, Content and Influencer Marketing expanding globally — viewed your profile on FYI and <b>sent you this position</b> because your marketing experience matches the requirements.',
      },
      initial: 'C', company: 'CREATUS', title: 'Global Content Marketer', meta: 'HCM · Hà Nội · 20–25 triệu', tail: BENEFIT_PUBLIC,
    }),
  },
  {
    match: /^creatus-recommend1-private/,
    subject: {
      vi: '[FYI] Bạn được chọn vào danh sách đề cử cho vị trí Global Content Marketer tại CREATUS',
      ko: '[FYI] CREATUS Global Content Marketer 추천 명단에 선정되셨습니다',
      en: '[FYI] You\'ve been selected for the CREATUS Global Content Marketer nominee list',
    },
    desc: 'CREATUS 추천 · 비공개 프레임 (7/30): "명단 선정 + 이번 주 담당자 전달 + 우선검토" 훅.',
    source: 'scripts/outreach/marketing-recommend-coldmail.mjs',
    html: (lang) => recommendShell(lang, {
      intro: {
        vi: '<b>CREATUS</b> — công ty Hàn Quốc trong lĩnh vực Education, Content và Influencer Marketing, đang mở rộng ra thị trường Bắc Mỹ và Nhật Bản — đang tuyển Global Content Marketer qua FYI. Đội ngũ FYI đã xem xét toàn bộ hồ sơ đã đăng ký và <b>chọn bạn vào danh sách đề cử</b> gửi cho nhà tuyển dụng.',
        ko: '북미·일본 시장으로 확장 중인 Education·Content·Influencer Marketing 한국 기업 <b>CREATUS</b>가 FYI를 통해 Global Content Marketer를 채용 중입니다. FYI 팀이 등록된 이력서 전체를 검토해 회원님을 <b>기업에 전달할 추천 명단에 선정</b>했습니다.',
        en: '<b>CREATUS</b> — a Korean company in Education, Content and Influencer Marketing expanding into North America and Japan — is hiring a Global Content Marketer through FYI. The FYI team reviewed every registered CV and <b>selected you for the nominee list</b> sent to the recruiter.',
      },
      initial: 'C', company: 'CREATUS', title: 'Global Content Marketer', meta: 'HCM · Hà Nội · 20–25 triệu', tail: BENEFIT_PRIVATE,
    }),
  },
  {
    match: /^electerior-recommend1-public/,
    subject: invitedSubject('Electerior'),
    desc: 'Electerior AI Content Specialist 추천 · 공개 프레임 (7/30): 제작형(디자인·영상·UI/UX) 풀 배정.',
    source: 'scripts/outreach/marketing-recommend-coldmail.mjs',
    html: (lang) => recommendShell(lang, {
      intro: {
        vi: 'Nhà tuyển dụng của <b>Electerior</b> — công ty Hàn Quốc trong lĩnh vực nội thất và giải pháp không gian, đang xây dựng hệ thống marketing dựa trên AI — đã xem hồ sơ của bạn trên FYI và <b>gửi cho bạn vị trí này</b> vì kinh nghiệm sản xuất nội dung của bạn phù hợp với yêu cầu.',
        ko: '인테리어·공간 솔루션 분야에서 AI 기반 마케팅 시스템을 구축 중인 한국 기업 <b>Electerior</b>의 채용 담당자가 FYI에서 회원님의 프로필을 확인하고, 콘텐츠 제작 경력이 요구사항과 맞아 <b>이 포지션을 직접 보냈습니다</b>.',
        en: 'A recruiter at <b>Electerior</b> — a Korean interior &amp; spatial-solutions company building an AI-driven marketing system — viewed your profile on FYI and <b>sent you this position</b> because your content-production experience matches the requirements.',
      },
      initial: 'E', company: 'Electerior', title: 'AI-based Social Media Content Specialist', meta: 'Hà Nội · HCM · 20–25 triệu', tail: BENEFIT_PUBLIC,
    }),
  },
  {
    match: /^electerior-recommend1-private/,
    subject: {
      vi: '[FYI] Bạn được chọn vào danh sách đề cử cho vị trí AI Content Specialist tại Electerior',
      ko: '[FYI] Electerior AI Content Specialist 추천 명단에 선정되셨습니다',
      en: '[FYI] You\'ve been selected for the Electerior AI Content Specialist nominee list',
    },
    desc: 'Electerior 추천 · 비공개 프레임 (7/30): "명단 선정 + 이번 주 담당자 전달 + 우선검토" 훅.',
    source: 'scripts/outreach/marketing-recommend-coldmail.mjs',
    html: (lang) => recommendShell(lang, {
      intro: {
        vi: '<b>Electerior</b> — công ty Hàn Quốc trong lĩnh vực nội thất và giải pháp không gian, đang xây dựng hệ thống marketing và tự động hóa nội dung bằng AI — đang tuyển AI-based Social Media Content Specialist qua FYI. Đội ngũ FYI đã xem xét toàn bộ hồ sơ đã đăng ký và <b>chọn bạn vào danh sách đề cử</b> gửi cho nhà tuyển dụng.',
        ko: '인테리어·공간 솔루션 분야에서 AI 마케팅·콘텐츠 자동화 시스템을 구축 중인 한국 기업 <b>Electerior</b>가 FYI를 통해 AI-based Social Media Content Specialist를 채용 중입니다. FYI 팀이 등록된 이력서 전체를 검토해 회원님을 <b>기업에 전달할 추천 명단에 선정</b>했습니다.',
        en: '<b>Electerior</b> — a Korean interior &amp; spatial-solutions company building AI-powered marketing and content automation — is hiring an AI-based Social Media Content Specialist through FYI. The FYI team reviewed every registered CV and <b>selected you for the nominee list</b> sent to the recruiter.',
      },
      initial: 'E', company: 'Electerior', title: 'AI-based Social Media Content Specialist', meta: 'Hà Nội · HCM · 20–25 triệu', tail: BENEFIT_PRIVATE,
    }),
  },
  {
    match: /^presto-motion-recommend1-public/,
    subject: {
      vi: '[FYI] PRESTO SOLUTION đã xem hồ sơ của bạn — cơ hội làm việc tại Hàn Quốc',
      ko: '[FYI] PRESTO SOLUTION이 회원님의 프로필을 확인했습니다 — 한국 근무 기회',
      en: '[FYI] PRESTO SOLUTION viewed your profile — a chance to work in Korea',
    },
    desc: 'PRESTO Motion Control SW Engineer(한국 온사이트·경력무관) 추천 · 공개 프레임 (8/10): D+3 지원미달 대응. 임베디드/제어/자동화 A티어 + 공학전공 주니어 gpt-4o-mini 3점↑.',
    source: 'scripts/outreach/d3-recommend-coldmail.mjs',
    html: (lang) => recommendShell(lang, {
      intro: {
        vi: 'Nhà tuyển dụng của <b>PRESTO SOLUTION</b> — công ty Hàn Quốc chuyên về giải pháp Motion Control và tự động hóa cho ngành bán dẫn, màn hình và robot — đã xem hồ sơ của bạn trên FYI và <b>gửi cho bạn vị trí này</b> vì nền tảng kỹ thuật của bạn phù hợp với yêu cầu.',
        ko: '반도체·디스플레이·로봇용 모션컨트롤/자동화 솔루션 한국 기업 <b>PRESTO SOLUTION</b>의 채용 담당자가 FYI에서 회원님의 프로필을 확인하고, 기술 배경이 요구사항과 맞아 <b>이 포지션을 직접 보냈습니다</b>.',
        en: 'A recruiter at <b>PRESTO SOLUTION</b> — a Korean company specializing in Motion Control and automation solutions for semiconductors, displays and robotics — viewed your profile on FYI and <b>sent you this position</b> because your technical background fits the requirements.',
      },
      initial: 'P', company: 'PRESTO SOLUTION', title: 'Motion Control Software Engineer', meta: 'Onsite tại Hàn Quốc · Không yêu cầu kinh nghiệm', tail: PRESTO_MOTION_TAIL(BENEFIT_PUBLIC),
    }),
  },
  {
    match: /^presto-motion-recommend1-private/,
    subject: {
      vi: '[FYI] Bạn được chọn vào danh sách đề cử — Motion Control Engineer tại Hàn Quốc',
      ko: '[FYI] Motion Control Engineer(한국 근무) 추천 명단에 선정되셨습니다',
      en: '[FYI] You\'ve been selected for the nominee list — Motion Control Engineer in Korea',
    },
    desc: 'PRESTO Motion Control 추천 · 비공개 프레임 (8/10): "명단 선정 + 이번 주 담당자 전달 + 우선검토" 훅. ⚠️발송 후 실제 명단 공유 의무.',
    source: 'scripts/outreach/d3-recommend-coldmail.mjs',
    html: (lang) => recommendShell(lang, {
      intro: {
        vi: '<b>PRESTO SOLUTION</b> — công ty Hàn Quốc chuyên về giải pháp Motion Control và tự động hóa cho ngành bán dẫn, màn hình và robot — đang tuyển Motion Control Software Engineer làm việc tại Hàn Quốc qua FYI. Đội ngũ FYI đã xem xét toàn bộ hồ sơ đã đăng ký và <b>chọn bạn vào danh sách đề cử</b> gửi cho nhà tuyển dụng.',
        ko: '반도체·디스플레이·로봇용 모션컨트롤/자동화 솔루션 한국 기업 <b>PRESTO SOLUTION</b>이 FYI를 통해 한국 근무 Motion Control Software Engineer를 채용 중입니다. FYI 팀이 등록된 이력서 전체를 검토해 회원님을 <b>기업에 전달할 추천 명단에 선정</b>했습니다.',
        en: '<b>PRESTO SOLUTION</b> — a Korean company specializing in Motion Control and automation solutions for semiconductors, displays and robotics — is hiring a Korea-based Motion Control Software Engineer through FYI. The FYI team reviewed every registered CV and <b>selected you for the nominee list</b> sent to the recruiter.',
      },
      initial: 'P', company: 'PRESTO SOLUTION', title: 'Motion Control Software Engineer', meta: 'Onsite tại Hàn Quốc · Không yêu cầu kinh nghiệm', tail: PRESTO_MOTION_TAIL(BENEFIT_PRIVATE),
    }),
  },
  {
    match: /^presto-sales-recommend1-public/,
    subject: invitedSubject('PRESTO SOLUTION'),
    desc: 'PRESTO Sales Assistant Manager(기술영업) 추천 · 공개 프레임 (8/10): D+3 지원미달 대응. 영업 헤드라인 풀 전원.',
    source: 'scripts/outreach/d3-recommend-coldmail.mjs',
    html: (lang) => recommendShell(lang, {
      intro: {
        vi: 'Nhà tuyển dụng của <b>PRESTO SOLUTION</b> — công ty Hàn Quốc chuyên về giải pháp Motion Control và tự động hóa cho ngành bán dẫn, màn hình và robot — đã xem hồ sơ của bạn trên FYI và <b>gửi cho bạn vị trí này</b> vì kinh nghiệm kinh doanh của bạn phù hợp với yêu cầu.',
        ko: '반도체·디스플레이·로봇용 모션컨트롤/자동화 솔루션 한국 기업 <b>PRESTO SOLUTION</b>의 채용 담당자가 FYI에서 회원님의 프로필을 확인하고, 영업 경력이 요구사항과 맞아 <b>이 포지션을 직접 보냈습니다</b>.',
        en: 'A recruiter at <b>PRESTO SOLUTION</b> — a Korean company specializing in Motion Control and automation solutions for semiconductors, displays and robotics — viewed your profile on FYI and <b>sent you this position</b> because your sales experience fits the requirements.',
      },
      initial: 'P', company: 'PRESTO SOLUTION', title: 'Sales Assistant Manager', meta: 'HCM · Đà Nẵng · Hà Nội · Lương thỏa thuận', tail: PRESTO_SALES_TAIL(BENEFIT_PUBLIC),
    }),
  },
  {
    match: /^presto-sales-recommend1-private/,
    subject: {
      vi: '[FYI] Bạn được chọn vào danh sách đề cử cho vị trí Sales Assistant Manager tại PRESTO SOLUTION',
      ko: '[FYI] PRESTO SOLUTION Sales Assistant Manager 추천 명단에 선정되셨습니다',
      en: '[FYI] You\'ve been selected for the PRESTO SOLUTION Sales Assistant Manager nominee list',
    },
    desc: 'PRESTO Sales 추천 · 비공개 프레임 (8/10): "명단 선정 + 이번 주 담당자 전달 + 우선검토" 훅. ⚠️발송 후 실제 명단 공유 의무.',
    source: 'scripts/outreach/d3-recommend-coldmail.mjs',
    html: (lang) => recommendShell(lang, {
      intro: {
        vi: '<b>PRESTO SOLUTION</b> — công ty Hàn Quốc chuyên về giải pháp Motion Control và tự động hóa cho ngành bán dẫn, màn hình và robot — đang tuyển Sales Assistant Manager qua FYI. Đội ngũ FYI đã xem xét toàn bộ hồ sơ đã đăng ký và <b>chọn bạn vào danh sách đề cử</b> gửi cho nhà tuyển dụng.',
        ko: '반도체·디스플레이·로봇용 모션컨트롤/자동화 솔루션 한국 기업 <b>PRESTO SOLUTION</b>이 FYI를 통해 Sales Assistant Manager를 채용 중입니다. FYI 팀이 등록된 이력서 전체를 검토해 회원님을 <b>기업에 전달할 추천 명단에 선정</b>했습니다.',
        en: '<b>PRESTO SOLUTION</b> — a Korean company specializing in Motion Control and automation solutions for semiconductors, displays and robotics — is hiring a Sales Assistant Manager through FYI. The FYI team reviewed every registered CV and <b>selected you for the nominee list</b> sent to the recruiter.',
      },
      initial: 'P', company: 'PRESTO SOLUTION', title: 'Sales Assistant Manager', meta: 'HCM · Đà Nẵng · Hà Nội · Lương thỏa thuận', tail: PRESTO_SALES_TAIL(BENEFIT_PRIVATE),
    }),
  },
  {
    match: /^lionrocket-recommend1-public/,
    subject: invitedSubject('LION ROCKET'),
    desc: 'LION ROCKET(Tynt) Content Marketer 추천 · 공개 프레임 (8/10): D+3 지원미달 대응. 숏폼 A티어 + gpt-4o-mini 4점 + (3점·1.5y↑).',
    source: 'scripts/outreach/d3-recommend-coldmail.mjs',
    html: (lang) => recommendShell(lang, {
      intro: {
        vi: 'Nhà tuyển dụng của <b>LION ROCKET</b> — công ty Hàn Quốc vận hành <b>Tynt</b>, dịch vụ AI trong lĩnh vực Beauty & Wellness với hơn 50.000 người dùng — đã xem hồ sơ của bạn trên FYI và <b>gửi cho bạn vị trí này</b> vì kinh nghiệm content của bạn phù hợp với yêu cầu.',
        ko: '5만+ 유저 AI 뷰티·웰니스 서비스 <b>Tynt</b>를 운영하는 한국 기업 <b>LION ROCKET</b>의 채용 담당자가 FYI에서 회원님의 프로필을 확인하고, 콘텐츠 경력이 요구사항과 맞아 <b>이 포지션을 직접 보냈습니다</b>.',
        en: 'A recruiter at <b>LION ROCKET</b> — the Korean company behind <b>Tynt</b>, an AI Beauty & Wellness service with 50,000+ users — viewed your profile on FYI and <b>sent you this position</b> because your content experience matches the requirements.',
      },
      initial: 'L', company: 'LION ROCKET', title: 'Content Marketer', meta: 'HCM · Đà Nẵng · Hà Nội · 20–25 triệu', tail: LIONROCKET_TAIL(BENEFIT_PUBLIC),
    }),
  },
  {
    match: /^lionrocket-recommend1-private/,
    subject: {
      vi: '[FYI] Bạn được chọn vào danh sách đề cử cho vị trí Content Marketer tại LION ROCKET',
      ko: '[FYI] LION ROCKET Content Marketer 추천 명단에 선정되셨습니다',
      en: '[FYI] You\'ve been selected for the LION ROCKET Content Marketer nominee list',
    },
    desc: 'LION ROCKET(Tynt) Content Marketer 추천 · 비공개 프레임 (8/10): "명단 선정 + 이번 주 담당자 전달 + 우선검토" 훅. ⚠️발송 후 실제 명단 공유 의무.',
    source: 'scripts/outreach/d3-recommend-coldmail.mjs',
    html: (lang) => recommendShell(lang, {
      intro: {
        vi: '<b>LION ROCKET</b> — công ty Hàn Quốc vận hành <b>Tynt</b>, dịch vụ AI trong lĩnh vực Beauty & Wellness với hơn 50.000 người dùng — đang tuyển Content Marketer qua FYI. Đội ngũ FYI đã xem xét toàn bộ hồ sơ đã đăng ký và <b>chọn bạn vào danh sách đề cử</b> gửi cho nhà tuyển dụng.',
        ko: '5만+ 유저 AI 뷰티·웰니스 서비스 <b>Tynt</b>를 운영하는 한국 기업 <b>LION ROCKET</b>이 FYI를 통해 Content Marketer를 채용 중입니다. FYI 팀이 등록된 이력서 전체를 검토해 회원님을 <b>기업에 전달할 추천 명단에 선정</b>했습니다.',
        en: '<b>LION ROCKET</b> — the Korean company behind <b>Tynt</b>, an AI Beauty & Wellness service with 50,000+ users — is hiring a Content Marketer through FYI. The FYI team reviewed every registered CV and <b>selected you for the nominee list</b> sent to the recruiter.',
      },
      initial: 'L', company: 'LION ROCKET', title: 'Content Marketer', meta: 'HCM · Đà Nẵng · Hà Nội · 20–25 triệu', tail: LIONROCKET_TAIL(BENEFIT_PRIVATE),
    }),
  },
  {
    match: /^openminds-recommend1-public/,
    subject: {
      vi: '[FYI] OpenMinds đã xem hồ sơ của bạn và mời bạn ứng tuyển — Full Stack Developer',
      ko: '[FYI] OpenMinds가 회원님의 이력서를 보고 지원을 제안했습니다 — Full Stack Developer',
      en: '[FYI] OpenMinds viewed your CV and invited you to apply — Full Stack Developer',
    },
    desc: 'OpenMinds Full Stack Developer(KTC·근무지 무관) 추천 · 공개 프레임 (8/11): KTC 추가모집(영어/한국어 요건) 대응. 풀스택 스택 × 영어 중급+/한국어 × 경력 2~6y, gpt-4o-mini 3점↑.',
    source: 'scripts/outreach/openminds-recommend-coldmail.mjs',
    html: (lang) => recommendShell(lang, {
      intro: {
        vi: 'Nhà tuyển dụng của <b>OpenMinds</b> — công ty công nghệ Hàn Quốc (thành lập 2016) chuyên giải pháp chuyển đổi số trong sản xuất, nhân sự và khu vực công — đã xem hồ sơ của bạn trên FYI và <b>gửi cho bạn vị trí này</b>.',
        ko: '제조·HR·공공 분야 디지털 전환 솔루션을 만드는 한국 기술기업 <b>OpenMinds</b>(2016년 설립)의 채용 담당자가 FYI에서 회원님의 이력서를 보고 <b>이 포지션을 보냈습니다</b>.',
        en: 'A recruiter at <b>OpenMinds</b> — a Korean tech company (founded 2016) building digital-transformation solutions for manufacturing, HR and the public sector — viewed your CV on FYI and <b>sent you this position</b>.',
      },
      initial: 'O', company: 'OpenMinds', title: 'Full Stack Developer', meta: 'Không giới hạn địa điểm làm việc', tail: openmindsTail(BENEFIT_PUBLIC),
    }),
  },
  {
    match: /^openminds-recommend1-private/,
    subject: {
      vi: '[FYI] Bạn được chọn vào danh sách đề cử — Full Stack Developer tại OpenMinds',
      ko: '[FYI] 추천 후보 명단에 선정되셨습니다 — OpenMinds Full Stack Developer',
      en: '[FYI] You\'ve been selected for the nominee list — Full Stack Developer at OpenMinds',
    },
    desc: 'OpenMinds Full Stack Developer 추천 · 비공개 프레임 (8/11): "명단 선정 + 이번 주 담당자 전달 + 우선검토" 훅. ⚠️발송 후 실제 명단 공유 의무(KTC 이정애·Alice).',
    source: 'scripts/outreach/openminds-recommend-coldmail.mjs',
    html: (lang) => recommendShell(lang, {
      intro: {
        vi: '<b>OpenMinds</b> — công ty công nghệ Hàn Quốc (thành lập 2016) chuyên giải pháp chuyển đổi số trong sản xuất, nhân sự và khu vực công — đang tuyển Full Stack Developer qua FYI (dự án K-Tech College 2026). Đội ngũ FYI đã xem xét toàn bộ hồ sơ đã đăng ký và <b>chọn bạn vào danh sách đề cử</b> gửi cho nhà tuyển dụng.',
        ko: '제조·HR·공공 분야 디지털 전환 솔루션을 만드는 한국 기술기업 <b>OpenMinds</b>(2016년 설립)가 FYI를 통해 Full Stack Developer를 채용 중입니다(K-Tech College 2026). FYI 팀이 등록된 이력서 전체를 검토해 회원님을 <b>추천 명단에 선정</b>했습니다.',
        en: '<b>OpenMinds</b> — a Korean tech company (founded 2016) building digital-transformation solutions for manufacturing, HR and the public sector — is hiring a Full Stack Developer through FYI (K-Tech College 2026). The FYI team reviewed every registered CV and <b>selected you for the nominee list</b> sent to the recruiter.',
      },
      initial: 'O', company: 'OpenMinds', title: 'Full Stack Developer', meta: 'Không giới hạn địa điểm làm việc', tail: openmindsTail(BENEFIT_PRIVATE),
    }),
  },
  {
    match: /^ufeed-recommend1-.*-private/,
    subject: {
      vi: '[FYI] Bạn được chọn vào danh sách đề cử — Network & Security Engineer tại Ufeed',
      ko: '[FYI] 추천 후보 명단에 선정되셨습니다 — Ufeed 네트워크·보안 엔지니어',
      en: "[FYI] You've been nominated — Network & Security Engineer at Ufeed",
    },
    desc: '유피드 넷섹 추천 (9/7): 비공개 프레임 — 선박 사이버보안(IACS UR E26), 한국 직접채용·비자/숙소 지원. 룰=넷섹 직군 or 인접(SysAdmin/DevOps/SRE/Cloud)×넷섹스킬, 3y+ 필수. 풀 12명(한국어 인증 0명 실측→우대 가점만).',
    source: 'scripts/outreach/ktc0907b-recommend-coldmail.mjs',
    html: (lang) => recommendShell(lang, {
      intro: {
        vi: '<b>Ufeed</b> — công ty Hàn Quốc trong lĩnh vực an ninh mạng cho tàu biển (chứng nhận IACS UR E26) — đang tuyển <b>Network &amp; Security Engineer</b> (kinh nghiệm 3 năm trở lên) làm việc trực tiếp tại <b>Hàn Quốc</b> qua FYI: lương theo mặt bằng Hàn Quốc, hỗ trợ visa và chỗ ở. Tiếng Hàn/tiếng Anh là lợi thế, không bắt buộc.',
        ko: '선박 사이버보안(IACS UR E26 인증) 분야 한국 기업 <b>Ufeed</b>가 FYI를 통해 <b>네트워크·보안 엔지니어</b>(경력 3년+)를 채용 중입니다 — 한국 직접채용, 한국 수준 급여, 비자·숙소 지원.',
        en: '<b>Ufeed</b> — a Korean company in maritime cybersecurity (IACS UR E26) — is hiring a <b>Network & Security Engineer</b> (3+ yrs) to work in <b>Korea</b> via FYI: Korean-level pay, visa & housing support.',
      },
      initial: 'U', company: 'Ufeed', title: 'Network & Security Engineer', meta: 'Làm việc tại Hàn Quốc · Hỗ trợ visa & chỗ ở', tail: BENEFIT_PRIVATE,
    }),
  },
  {
    match: /^ufeed-recommend1-/,
    subject: {
      vi: '[FYI] Bạn được chọn vào danh sách đề cử gửi Ufeed — Network & Security Engineer',
      ko: '[FYI] Ufeed 추천 명단에 선정되셨습니다 — 네트워크·보안 엔지니어',
      en: "[FYI] You've been nominated to Ufeed — Network & Security Engineer",
    },
    desc: '유피드 넷섹 추천 (9/7): 공개 프레임 — FYI 검토 선정·명단에 프로필 동봉·지원 시 우선 검토.',
    source: 'scripts/outreach/ktc0907b-recommend-coldmail.mjs',
    html: (lang) => recommendShell(lang, {
      intro: {
        vi: '<b>Ufeed</b> — công ty Hàn Quốc trong lĩnh vực an ninh mạng cho tàu biển (IACS UR E26) — đang tuyển <b>Network &amp; Security Engineer</b> (3+ năm) làm việc tại <b>Hàn Quốc</b> qua FYI (hỗ trợ visa &amp; chỗ ở). Đội ngũ FYI đã xem xét toàn bộ hồ sơ và <b>chọn bạn vào danh sách đề cử</b> — hồ sơ công khai của bạn sẽ được gửi kèm danh sách cho nhà tuyển dụng trong tuần này.',
        ko: '선박 사이버보안 한국 기업 <b>Ufeed</b>가 FYI를 통해 <b>네트워크·보안 엔지니어</b>를 채용 중입니다(한국 근무, 비자·숙소 지원). FYI 팀이 이력서 전체를 검토해 회원님을 <b>추천 명단에 선정</b>했습니다.',
        en: '<b>Ufeed</b> — Korean maritime-cybersecurity company — is hiring via FYI (work in Korea, visa & housing). The FYI team reviewed all profiles and <b>nominated you</b>.',
      },
      initial: 'U', company: 'Ufeed', title: 'Network & Security Engineer', meta: 'Làm việc tại Hàn Quốc · Hỗ trợ visa & chỗ ở', tail: BENEFIT_PUBLIC,
    }),
  },
  {
    match: /^robowink-.*-private/,
    subject: {
      vi: '[FYI] Bạn được chọn vào danh sách đề cử — AI/ML Engineer tại Robowink',
      ko: '[FYI] 추천 후보 명단에 선정되셨습니다 — Robowink AI·ML 엔지니어',
      en: "[FYI] You've been nominated — AI/ML Engineer at Robowink",
    },
    desc: '로보윙크 AI/ML 추천 (9/7): 비공개 프레임 — 드론·로봇 AI비전, 다낭 온사이트, ASAP 채용. 룰=AI/ML/DS 코어 → Data직군×Python → 타직군 비전+Python 캐스케이드, 다낭 가점. 풀 167명.',
    source: 'scripts/outreach/ktc0907b-recommend-coldmail.mjs',
    html: (lang) => recommendShell(lang, {
      intro: {
        vi: '<b>Robowink</b> — công ty Hàn Quốc phát triển giải pháp AI vision cho drone &amp; robot — đang tuyển <b>AI/ML Engineer</b> qua FYI, làm việc tại Đà Nẵng. Cần nền tảng Python và hiểu biết cơ bản về AI/computer vision; tiếng Anh là lợi thế, không bắt buộc. Công ty mong muốn tuyển <b>càng sớm càng tốt</b>.',
        ko: '드론·로봇용 AI 비전 솔루션을 만드는 한국 기업 <b>Robowink</b>가 FYI를 통해 <b>AI/ML 엔지니어</b>를 채용 중입니다(다낭 온사이트, Python·컴퓨터비전 기초, ASAP 채용 희망).',
        en: '<b>Robowink</b> — a Korean company building AI vision for drones & robots — is hiring an <b>AI/ML Engineer</b> via FYI (onsite Đà Nẵng, Python & CV basics, hiring ASAP).',
      },
      initial: 'R', company: 'Robowink', title: 'AI/ML Engineer', meta: 'Onsite · Đà Nẵng', tail: BENEFIT_PRIVATE,
    }),
  },
  {
    match: /^robowink-/,
    subject: {
      vi: '[FYI] Bạn được chọn vào danh sách đề cử gửi Robowink — AI/ML Engineer',
      ko: '[FYI] Robowink 추천 명단에 선정되셨습니다 — AI·ML 엔지니어',
      en: "[FYI] You've been nominated to Robowink — AI/ML Engineer",
    },
    desc: '로보윙크 AI/ML 추천 (9/7): 공개 프레임 — FYI 검토 선정·명단에 프로필 동봉·지원 시 우선 검토.',
    source: 'scripts/outreach/ktc0907b-recommend-coldmail.mjs',
    html: (lang) => recommendShell(lang, {
      intro: {
        vi: '<b>Robowink</b> — công ty Hàn Quốc phát triển giải pháp AI vision cho drone &amp; robot — đang tuyển <b>AI/ML Engineer</b> qua FYI, làm việc tại Đà Nẵng. Đội ngũ FYI đã xem xét toàn bộ hồ sơ và <b>chọn bạn vào danh sách đề cử</b> — hồ sơ công khai của bạn sẽ được gửi kèm danh sách cho nhà tuyển dụng trong tuần này.',
        ko: '드론·로봇용 AI 비전 한국 기업 <b>Robowink</b>가 FYI를 통해 <b>AI/ML 엔지니어</b>를 채용 중입니다(다낭). FYI 팀이 이력서 전체를 검토해 회원님을 <b>추천 명단에 선정</b>했습니다.',
        en: '<b>Robowink</b> — Korean AI-vision company for drones & robots — is hiring via FYI (Đà Nẵng). The FYI team reviewed all profiles and <b>nominated you</b>.',
      },
      initial: 'R', company: 'Robowink', title: 'AI/ML Engineer', meta: 'Onsite · Đà Nẵng', tail: BENEFIT_PUBLIC,
    }),
  },
  {
    match: /^bannerting-.*-private/,
    subject: {
      vi: '[FYI] Bạn được chọn vào danh sách đề cử — Thực tập sinh Marketing tại Bannerting',
      ko: '[FYI] 추천 후보 명단에 선정되셨습니다 — Bannerting 마케팅 인턴',
      en: "[FYI] You've been nominated — Marketing Intern at Bannerting",
    },
    desc: '배너팅(언틸) 마케팅 인턴 추천 (9/7): 비공개 프레임 — 현수막/배너 광고 서비스, 한·영·베 3개국어 필수, 하노이 선호(HCM/다낭 가능). 룰=한국어 신호×영어 인증×Design/Marketing 직군, 저연차 가점. 풀 34명.',
    source: 'scripts/outreach/ktc0907b-recommend-coldmail.mjs',
    html: (lang) => recommendShell(lang, {
      intro: {
        vi: '<b>Bannerting</b> — dịch vụ quảng cáo băng rôn/biển hiệu của công ty Hàn Quốc — đang tuyển <b>Thực tập sinh Marketing</b> qua FYI (ưu tiên Hà Nội, chấp nhận TP.HCM/Đà Nẵng). Yêu cầu sử dụng được <b>tiếng Hàn, tiếng Anh và tiếng Việt</b>.',
        ko: '현수막·배너 광고 서비스 한국 기업 <b>Bannerting</b>이 FYI를 통해 <b>마케팅 인턴</b>을 채용 중입니다(하노이 선호·HCM/다낭 가능, 한·영·베 3개국어 필수).',
        en: '<b>Bannerting</b> — a Korean banner-advertising service — is hiring a <b>Marketing Intern</b> via FYI (Hanoi preferred; HCMC/Đà Nẵng OK; Korean, English & Vietnamese required).',
      },
      initial: 'B', company: 'Bannerting', title: 'Marketing Intern', meta: 'Hà Nội / TP.HCM / Đà Nẵng · Thực tập sinh', tail: BENEFIT_PRIVATE,
    }),
  },
  {
    match: /^bannerting-/,
    subject: {
      vi: '[FYI] Bạn được chọn vào danh sách đề cử gửi Bannerting — Thực tập sinh Marketing',
      ko: '[FYI] Bannerting 추천 명단에 선정되셨습니다 — 마케팅 인턴',
      en: "[FYI] You've been nominated to Bannerting — Marketing Intern",
    },
    desc: '배너팅(언틸) 마케팅 인턴 추천 (9/7): 공개 프레임 — FYI 검토 선정·명단에 프로필 동봉·지원 시 우선 검토.',
    source: 'scripts/outreach/ktc0907b-recommend-coldmail.mjs',
    html: (lang) => recommendShell(lang, {
      intro: {
        vi: '<b>Bannerting</b> — dịch vụ quảng cáo băng rôn/biển hiệu của công ty Hàn Quốc — đang tuyển <b>Thực tập sinh Marketing</b> qua FYI (ưu tiên Hà Nội, chấp nhận TP.HCM/Đà Nẵng; yêu cầu tiếng Hàn, tiếng Anh, tiếng Việt). Đội ngũ FYI đã xem xét toàn bộ hồ sơ và <b>chọn bạn vào danh sách đề cử</b> — hồ sơ công khai của bạn sẽ được gửi kèm danh sách cho nhà tuyển dụng trong tuần này.',
        ko: '현수막·배너 광고 한국 기업 <b>Bannerting</b>이 FYI를 통해 <b>마케팅 인턴</b>을 채용 중입니다. FYI 팀이 이력서 전체를 검토해 회원님을 <b>추천 명단에 선정</b>했습니다.',
        en: '<b>Bannerting</b> — Korean banner-advertising service — is hiring a Marketing Intern via FYI. The FYI team reviewed all profiles and <b>nominated you</b>.',
      },
      initial: 'B', company: 'Bannerting', title: 'Marketing Intern', meta: 'Hà Nội / TP.HCM / Đà Nẵng · Thực tập sinh', tail: BENEFIT_PUBLIC,
    }),
  },
  {
    match: /^vnib-.*-private/,
    subject: {
      vi: '[FYI] Bạn được chọn vào danh sách đề cử — Event Marketing Specialist tại VNIB TECH',
      ko: '[FYI] 추천 후보 명단에 선정되셨습니다 — VNIB TECH 이벤트 마케팅',
      en: "[FYI] You've been nominated — Event Marketing Specialist at VNIB TECH",
    },
    desc: 'VNIB TECH 이벤트 마케팅 추천 (9/8): 비공개 프레임 — Camon Social 앱 커뮤니티/이벤트, HCMC Q3 온사이트, 2-4y·영어 필수·영문CV+포트폴리오·뷰티 우대. 룰=Marketing×HCMC×2y+×영어(evtmkt) + 비MKT·비개발×이벤트시그널 확장(evtmkt2). 풀 63명.',
    source: 'scripts/outreach/vnib-recommend-coldmail.mjs',
    html: (lang) => recommendShell(lang, {
      intro: {
        vi: '<b>VNIB TECH</b> — công ty đứng sau app cộng đồng <b>Camon Social</b> — đang tuyển <b>Event Marketing Specialist</b> qua FYI, làm việc tại TP.HCM (tòa nhà Toong, Quận 3). Yêu cầu 2–4 năm kinh nghiệm Community/Event/Influencer Marketing, giao tiếp tiếng Anh tốt; ưu tiên kinh nghiệm event ngành mỹ phẩm/beauty. Lưu ý: cần <b>CV bằng tiếng Anh</b> (kèm link portfolio).',
        ko: '커뮤니티 앱 <b>Camon Social</b>을 운영하는 <b>VNIB TECH</b>가 FYI를 통해 <b>이벤트 마케팅 스페셜리스트</b>를 채용 중입니다(HCMC 3군 온사이트, 2–4년·영어 필수·영문 CV+포트폴리오, 뷰티 이벤트 우대).',
        en: '<b>VNIB TECH</b> — the company behind the <b>Camon Social</b> community app — is hiring an <b>Event Marketing Specialist</b> via FYI (onsite HCMC D3, 2–4 yrs, English required, English CV + portfolio, beauty-event experience a plus).',
      },
      initial: 'V', company: 'VNIB TECH', title: 'Event Marketing Specialist', meta: 'Onsite · TP.HCM (Quận 3) · 2–4 năm', tail: BENEFIT_PRIVATE,
    }),
  },
  {
    match: /^vnib-/,
    subject: {
      vi: '[FYI] Bạn được chọn vào danh sách đề cử gửi VNIB TECH — Event Marketing Specialist',
      ko: '[FYI] VNIB TECH 추천 명단에 선정되셨습니다 — 이벤트 마케팅',
      en: "[FYI] You've been nominated to VNIB TECH — Event Marketing Specialist",
    },
    desc: 'VNIB TECH 이벤트 마케팅 추천 (9/8): 공개 프레임 — FYI 검토 선정·명단에 프로필 동봉·지원 시 우선 검토.',
    source: 'scripts/outreach/vnib-recommend-coldmail.mjs',
    html: (lang) => recommendShell(lang, {
      intro: {
        vi: '<b>VNIB TECH</b> — công ty đứng sau app cộng đồng <b>Camon Social</b> — đang tuyển <b>Event Marketing Specialist</b> qua FYI, làm việc tại TP.HCM (Quận 3). Đội ngũ FYI đã xem xét toàn bộ hồ sơ và <b>chọn bạn vào danh sách đề cử</b> — hồ sơ công khai của bạn sẽ được gửi kèm danh sách cho nhà tuyển dụng trong tuần này.',
        ko: '커뮤니티 앱 <b>Camon Social</b>을 운영하는 <b>VNIB TECH</b>가 FYI를 통해 <b>이벤트 마케팅 스페셜리스트</b>를 채용 중입니다(HCMC 3군). FYI 팀이 이력서 전체를 검토해 회원님을 <b>추천 명단에 선정</b>했습니다.',
        en: '<b>VNIB TECH</b> — the company behind the Camon Social community app — is hiring an Event Marketing Specialist via FYI (HCMC D3). The FYI team reviewed all profiles and <b>nominated you</b>.',
      },
      initial: 'V', company: 'VNIB TECH', title: 'Event Marketing Specialist', meta: 'Onsite · TP.HCM (Quận 3) · 2–4 năm', tail: BENEFIT_PUBLIC,
    }),
  },
  {
    match: /^hivelab-.*-private/,
    subject: {
      vi: '[FYI] Bạn được chọn vào danh sách đề cử — {{포지션}} tại HIVELAB',
      ko: '[FYI] 추천 후보 명단에 선정되셨습니다 — HIVELAB {{포지션}}',
      en: "[FYI] You've been nominated — {{position}} at HIVELAB",
    },
    desc: 'HIVELAB 4공고 추천 (9/8): 비공개 프레임 — 한국 디지털 미디어 에이전시(2012~, UX/UI·게임·웹모바일·브랜딩), 하노이 Taisei Square, 14개월치 연봉 패키지. 4그룹 코어만(admin=TOPIK5+ 14 / bd=Sales×영·한 9 / motion=AE시그널 20 / gfx=Design 3y+ 30, gfx는 Aepick 뷰티 브랜드). 그룹별 요건 한 줄이 인트로에 갈림.',
    source: 'scripts/outreach/hivelab-recommend-coldmail.mjs',
    html: (lang) => recommendShell(lang, {
      intro: {
        vi: '<b>HIVELAB</b> — agency truyền thông số đa nền tảng của Hàn Quốc (thành lập 2012: UX/UI, game, web/mobile, branding &amp; marketing) — đang tuyển qua FYI, làm việc tại Hà Nội (tòa nhà Taisei Square, Khuất Duy Tiến). Đãi ngộ tương đương 14 tháng lương/năm. {{그룹별 포지션·요건 한 줄}}',
        ko: '한국 디지털 미디어 에이전시 <b>HIVELAB</b>(2012년 설립, UX/UI·게임·웹모바일·브랜딩)이 FYI를 통해 하노이 오피스(Taisei Square) 4개 포지션을 채용 중입니다(연 14개월치 급여 패키지). {{그룹별 포지션·요건 한 줄}}',
        en: '<b>HIVELAB</b> — a Korean multi-platform digital media agency (est. 2012: UX/UI, game, web/mobile, branding) — is hiring in Hanoi (Taisei Square) via FYI, ~14 months of salary per year. {{per-group position & requirements line}}',
      },
      initial: 'H', company: 'HIVELAB', title: '{{공고 제목}}', meta: 'Onsite · Hà Nội', tail: BENEFIT_PRIVATE,
    }),
  },
  {
    match: /^hivelab-/,
    subject: {
      vi: '[FYI] Bạn được chọn vào danh sách đề cử gửi HIVELAB — {{포지션}}',
      ko: '[FYI] HIVELAB 추천 명단에 선정되셨습니다 — {{포지션}}',
      en: "[FYI] You've been nominated to HIVELAB — {{position}}",
    },
    desc: 'HIVELAB 4공고 추천 (9/8): 공개 프레임 — FYI 검토 선정·명단에 프로필 동봉·지원 시 우선 검토. 4그룹(admin/bd/motion/gfx).',
    source: 'scripts/outreach/hivelab-recommend-coldmail.mjs',
    html: (lang) => recommendShell(lang, {
      intro: {
        vi: '<b>HIVELAB</b> — agency truyền thông số đa nền tảng của Hàn Quốc (2012~) — đang tuyển qua FYI tại Hà Nội (Taisei Square). {{그룹별 포지션·요건 한 줄}} Đội ngũ FYI đã xem xét toàn bộ hồ sơ và <b>chọn bạn vào danh sách đề cử</b> — hồ sơ công khai của bạn sẽ được gửi kèm danh sách cho nhà tuyển dụng trong tuần này.',
        ko: '한국 디지털 미디어 에이전시 <b>HIVELAB</b>이 FYI를 통해 하노이 4개 포지션을 채용 중입니다. FYI 팀이 이력서 전체를 검토해 회원님을 <b>추천 명단에 선정</b>했으며, 공개 프로필은 이번 주 명단과 함께 담당자에게 전달됩니다.',
        en: '<b>HIVELAB</b> — a Korean digital media agency — is hiring 4 roles in Hanoi via FYI. The FYI team reviewed all profiles and <b>nominated you</b>; your public profile goes to the recruiter with this week\'s list.',
      },
      initial: 'H', company: 'HIVELAB', title: '{{공고 제목}}', meta: 'Onsite · Hà Nội', tail: BENEFIT_PUBLIC,
    }),
  },
  {
    match: /^motive-.*-private/,
    subject: {
      vi: '[FYI] Bạn được chọn vào danh sách đề cử — Project Manager tại Motive Pictures',
      ko: '[FYI] 추천 후보 명단에 선정되셨습니다 — Motive Pictures PM',
      en: "[FYI] You've been nominated — Project Manager at Motive Pictures",
    },
    desc: 'Motive Pictures PM 추천 (9/9): 비공개 프레임 — 한·베 합작 영화 제작 프로젝트 PM(HCM/HN, Junior 15–17tr, 영어 필수·한국어 우대·기업 마케팅 경험). 룰=PM 코어(pm) + Marketing/BD·비개발×영화시그널 확장(pm2). 풀봇 실측 코어 20·확장 62.',
    source: 'scripts/outreach/motive-recommend-coldmail.mjs',
    html: (lang) => recommendShell(lang, {
      intro: {
        vi: '<b>Motive Pictures</b> đang triển khai dự án <b>hợp tác sản xuất phim điện ảnh giữa Hàn Quốc và Việt Nam</b>, và tuyển <b>Project Manager</b> qua FYI (TP.HCM hoặc Hà Nội). Công việc: điều phối dự án phim Hàn–Việt, đầu mối giữa đoàn phim/đối tác/nhà tài trợ, marketing quảng bá phim, phát triển tài trợ/B2B. Yêu cầu: <b>tiếng Anh thành thạo</b> (tiếng Hàn là lợi thế), kinh nghiệm marketing doanh nghiệp.',
        ko: '<b>Motive Pictures</b>가 한·베 합작 영화 제작 프로젝트의 <b>Project Manager</b>를 FYI를 통해 채용 중입니다(HCM/하노이, Junior 15–17tr). 업무: 한·베 영화 프로젝트 조율, 제작진·파트너·스폰서 커뮤니케이션, 영화 마케팅, 스폰서십·B2B. 요건: 영어 필수(한국어 우대), 기업 마케팅 경험.',
        en: '<b>Motive Pictures</b> is hiring a <b>Project Manager</b> for a Korea–Vietnam film co-production via FYI (HCMC/Hanoi, Junior, 15–17M). Coordinate the KR–VN film project, stakeholders and sponsors, run film marketing and B2B sponsorship. Fluent English required (Korean a plus), corporate marketing experience.',
      },
      initial: 'M', company: 'Motive Pictures', title: 'Project Manager', meta: 'TP.HCM hoặc Hà Nội · Junior · 15–17 triệu', tail: BENEFIT_PRIVATE,
    }),
  },
  {
    match: /^motive-/,
    subject: {
      vi: '[FYI] Bạn được chọn vào danh sách đề cử gửi Motive Pictures — Project Manager',
      ko: '[FYI] Motive Pictures 추천 명단에 선정되셨습니다 — PM',
      en: "[FYI] You've been nominated to Motive Pictures — Project Manager",
    },
    desc: 'Motive Pictures PM 추천 (9/9): 공개 프레임 — FYI 검토 선정·명단에 프로필 동봉·지원 시 우선 검토. 2그룹(pm 코어/pm2 확장).',
    source: 'scripts/outreach/motive-recommend-coldmail.mjs',
    html: (lang) => recommendShell(lang, {
      intro: {
        vi: '<b>Motive Pictures</b> đang triển khai dự án <b>hợp tác sản xuất phim điện ảnh giữa Hàn Quốc và Việt Nam</b>, và tuyển <b>Project Manager</b> qua FYI (TP.HCM hoặc Hà Nội). Đội ngũ FYI đã xem xét toàn bộ hồ sơ và <b>chọn bạn vào danh sách đề cử</b> — hồ sơ công khai của bạn sẽ được gửi kèm danh sách cho nhà tuyển dụng trong tuần này.',
        ko: '<b>Motive Pictures</b>가 한·베 합작 영화 제작 프로젝트의 <b>Project Manager</b>를 FYI를 통해 채용 중입니다(HCM/하노이). FYI 팀이 이력서 전체를 검토해 회원님을 <b>추천 명단에 선정</b>했으며, 공개 프로필은 이번 주 명단과 함께 담당자에게 전달됩니다.',
        en: '<b>Motive Pictures</b> is hiring a <b>Project Manager</b> for a Korea–Vietnam film co-production via FYI (HCMC/Hanoi). The FYI team reviewed all profiles and <b>nominated you</b>; your public profile goes to the recruiter with this week\'s list.',
      },
      initial: 'M', company: 'Motive Pictures', title: 'Project Manager', meta: 'TP.HCM hoặc Hà Nội · Junior · 15–17 triệu', tail: BENEFIT_PUBLIC,
    }),
  },
  {
    match: /^resume-register-bonus/,
    subject: {
      vi: '{{name}} ơi, bạn chưa đủ điều kiện nhận thưởng 1.000.000₫',
      ko: '{{name}}님, 아직 1,000,000₫ 이벤트 대상이 아니에요',
      en: '{{name}}, you\'re not yet eligible for the 1,000,000₫ bonus',
    },
    desc: '이력서 등록 유도 축하금 프레임 (8/18): coldmail1에서 검증된 "아직 자격이 없다" 손실 프레임 + 취업 축하금 훅(1,000,000₫ · 베트남 현지 기업 · 입사 60일 근속 후 지급 — /cv 조건과 동일 명시). 수치는 금액·조건만(v1 조작 수치 계열 미사용). 버튼 = /api/resume/upload 토큰 랜딩 축하금 배리언트. -apply=지원버튼 이탈층 / -rest=그 외.',
    source: 'scripts/outreach/resume-register-bonus-coldmail.mjs',
    html: registerBonusHtml,
  },
  {
    match: /^resume-register-(apply2|all2|jobcard|rest)/,
    subject: {
      vi: '{{name}} ơi, người đăng ký CV nhận trung bình 3,2 lời mời mỗi tuần',
      ko: '{{name}}님, 이력서 등록자는 1주일 평균 3.2건의 오퍼를 받습니다',
      en: '{{name}}, CV registrants get 3.2 offers a week on average',
    },
    desc: '이력서 등록 유도 v2 (8/5): 1차의 조작 수치(월7건·85%) 폐기 → 실측 "1주일 평균 오퍼 3.2건" 단일 스탯 + 이름 개인화 제목 + 연봉협상 앵글(당장 이직 안 해도 오퍼=협상 카드) + 수신거부 신설(/api/coldmail/unsub). apply2=지원버튼 이탈층(apply1 미등록 재접촉 포함) / jobcard1=공고카드 클릭층 / rest1=그 외 / all2(9/4)=미등록 전 세그먼트 통합 2차 — 본문을 "메일로 공고 알림 + 우선 검토 대상" 프레임으로 교체.',
    source: 'scripts/outreach/resume-register-coldmail.mjs',
    html: registerHtml2,
  },
  {
    match: /^resume-register/,
    subject: {
      vi: '[FYI] Đăng ký CV — trung bình 7 lời mời mỗi tháng',
      ko: '[FYI] CV 등록 — 월 평균 제안 7건',
      en: '[FYI] Register your CV — 7 invitations a month on average',
    },
    desc: '이력서 등록 유도 1차(7/31, all1·apply1 스냅샷): 가입했지만 이력서가 없는 회원 대상. all1=전체 / apply1=지원 버튼까지 눌렀다 이탈한 회원. ※본문 수치(월 7건·85%)는 이후 근거 문제로 퍼블릭 /cv에서 제거된 카피 — 8/5 v2부터 실측 수치로 교체.',
    source: 'scripts/outreach/resume-register-coldmail.mjs',
    html: registerHtml,
  },
  {
    match: /^dn0909-.*-private/,
    subject: {
      vi: '[FYI] Bạn được chọn vào danh sách đề cử — {{포지션}} tại {{회사}}',
      ko: '[FYI] 추천 후보 명단에 선정되셨습니다 — {{회사}} {{포지션}}',
      en: "[FYI] You've been nominated — {{position}} at {{company}}",
    },
    desc: '다낭 9월 이벤트 recommend (9/9, Mia 요청): 비공개 프레임 — 다낭 거주 후보에게 4개사 7개 JD 재발송(기지원만 제외, 기추천 포함). 그룹=bada-plan(비개발×영어, JD 개편: 다낭→한국 근무)/bada-mkt/bada-uiux/nalda-fs(React+TS)/nx-sales/nx-design/jinosys-mobile(PHP·Android 스택). 그룹별 인트로·잡카드가 갈림. Komang·S2E·Overlay·Andwise는 제외 지시.',
    source: 'scripts/outreach/dn0909-recommend-coldmail.mjs',
    html: (lang) => recommendShell(lang, {
      intro: {
        vi: '{{그룹별 회사·포지션·요건 소개 — 예: Jinosys}} <b>Jinosys</b> — công ty Hàn Quốc chuyên nền tảng IoT an toàn dựa trên AI (18 bằng sáng chế, đối tác an toàn của Samsung Electronics) — đang tuyển <b>Mobile App & Web Service Developer (IoT Platform)</b> qua FYI, làm việc tại <b>Đà Nẵng</b>. Stack chính: PHP · HTML5/CSS3 · JavaScript · Android (Java/Kotlin).',
        ko: '{{그룹별 회사·포지션·요건 소개}} 예: 한국 안전 IoT 플랫폼 기업 <b>Jinosys</b>(삼성전자 안전 파트너)가 FYI를 통해 다낭 근무 모바일·웹 개발자를 채용 중입니다(PHP·HTML/CSS/JS·Android 스택).',
        en: '{{per-group company/position/requirements intro}} e.g. Jinosys — Korean AI safety-IoT platform company — is hiring a Mobile App & Web Developer in Da Nang via FYI.',
      },
      initial: 'J', company: '{{회사}}', title: '{{공고 제목}}', meta: 'Đà Nẵng', tail: BENEFIT_PRIVATE,
    }),
  },
  {
    match: /^dn0909-/,
    subject: {
      vi: '[FYI] Bạn được chọn vào danh sách đề cử gửi {{회사}} — {{포지션}}',
      ko: '[FYI] {{회사}} 추천 명단에 선정되셨습니다 — {{포지션}}',
      en: "[FYI] You've been nominated to {{company}} — {{position}}",
    },
    desc: '다낭 9월 이벤트 recommend (9/9, Mia 요청): 공개 프레임 — FYI 검토 선정·명단에 프로필 동봉·지원 시 우선 검토. 7그룹(bada-plan/bada-mkt/bada-uiux/nalda-fs/nx-sales/nx-design/jinosys-mobile), 전원 다낭 거주.',
    source: 'scripts/outreach/dn0909-recommend-coldmail.mjs',
    html: (lang) => recommendShell(lang, {
      intro: {
        vi: '{{그룹별 회사·포지션·요건 소개}} Đội ngũ FYI đã xem xét toàn bộ hồ sơ và <b>chọn bạn vào danh sách đề cử</b> — hồ sơ công khai của bạn sẽ được gửi kèm danh sách cho nhà tuyển dụng trong tuần này.',
        ko: '{{그룹별 회사·포지션·요건 소개}} FYI 팀이 이력서 전체를 검토해 회원님을 <b>추천 명단에 선정</b>했으며, 공개 프로필은 이번 주 명단과 함께 담당자에게 전달됩니다.',
        en: '{{per-group company/position/requirements intro}} The FYI team reviewed all profiles and <b>nominated you</b>; your public profile goes to the recruiter with this week\'s list.',
      },
      initial: 'J', company: '{{회사}}', title: '{{공고 제목}}', meta: 'Đà Nẵng', tail: BENEFIT_PUBLIC,
    }),
  },
  {
    match: /^until0909-.*-private/,
    subject: {
      vi: '[FYI] Bạn được chọn vào danh sách đề cử — Thực tập sinh Marketing tại Until',
      ko: '[FYI] 추천 후보 명단에 선정되셨습니다 — Until 마케팅 인턴',
      en: "[FYI] You've been nominated — Marketing Intern at Until",
    },
    desc: '언틸 마케팅 인턴 재소싱 recommend (9/9, KTC R151/스레드 R118): 비공개 프레임 — 대학생 수습생 3개월·풀타임 필수로 JD 개편(Len) 후 재발송. 그룹=student(2026+ 졸업예정)/grad(2024~25 졸업 × 경력 1y 이하), 공통 컷=(한국어 시그널 or 영어 인증)×마케팅 시그널. 카피에 풀타임·3개월·지원금 300만 동 명시(자기선별). 9/7 bannerting 기수신·기지원 제외.',
    source: 'scripts/outreach/until0909-recommend-coldmail.mjs',
    html: (lang) => recommendShell(lang, {
      intro: {
        vi: '<b>Until</b> — công ty Hàn Quốc vận hành dịch vụ quảng cáo banner/biển hiệu <b>Bannerting</b> — đang tuyển <b>Thực tập sinh Marketing</b> (chương trình 3 tháng) qua FYI, dành cho <b>sinh viên và bạn mới tốt nghiệp</b>. Yêu cầu: làm việc <b>full-time onsite</b> tại Hà Nội / TP.HCM hoặc Đà Nẵng trong 3 tháng; tiếng Hàn (ưu tiên) hoặc tiếng Anh tốt; biết dùng công cụ AI. Mức hỗ trợ: <b>3.000.000 VND/tháng</b>.',
        ko: '한국 배너 광고 서비스 기업 <b>Until</b>(Bannerting 운영)이 FYI를 통해 <b>마케팅 인턴</b>(3개월 수습, 대학생·갓졸업 신입 대상)을 채용 중입니다. 풀타임 온사이트(하노이/호치민/다낭), 한국어 우대 또는 영어, AI 툴 활용, 지원금 월 300만 동 명시.',
        en: 'Until — Korean banner-ad company (Bannerting) — is hiring a Marketing Intern (3-month, full-time onsite in HN/HCMC/DN, for students and fresh grads) via FYI. Korean preferred or good English; AI tools; 3,000,000 VND/month stipend.',
      },
      initial: 'U', company: 'Until', title: 'Marketing Intern', meta: 'Hà Nội / TP.HCM / Đà Nẵng · Thực tập 3 tháng · Full-time', tail: BENEFIT_PRIVATE,
    }),
  },
  {
    match: /^until0909-/,
    subject: {
      vi: '[FYI] Bạn được chọn vào danh sách đề cử gửi Until — Thực tập sinh Marketing',
      ko: '[FYI] Until 추천 명단에 선정되셨습니다 — 마케팅 인턴',
      en: "[FYI] You've been nominated to Until — Marketing Intern",
    },
    desc: '언틸 마케팅 인턴 재소싱 recommend (9/9): 공개 프레임 — FYI 검토 선정·명단에 프로필 동봉·지원 시 우선 검토. 그룹·컷은 private 항목과 동일.',
    source: 'scripts/outreach/until0909-recommend-coldmail.mjs',
    html: (lang) => recommendShell(lang, {
      intro: {
        vi: '<b>Until</b> — công ty Hàn Quốc vận hành dịch vụ quảng cáo banner/biển hiệu <b>Bannerting</b> — đang tuyển <b>Thực tập sinh Marketing</b> (chương trình 3 tháng) qua FYI, dành cho <b>sinh viên và bạn mới tốt nghiệp</b>. Yêu cầu: làm việc <b>full-time onsite</b> tại Hà Nội / TP.HCM hoặc Đà Nẵng trong 3 tháng; tiếng Hàn (ưu tiên) hoặc tiếng Anh tốt; biết dùng công cụ AI. Mức hỗ trợ: <b>3.000.000 VND/tháng</b>.',
        ko: '한국 배너 광고 서비스 기업 <b>Until</b>(Bannerting 운영)이 FYI를 통해 <b>마케팅 인턴</b>(3개월 수습, 대학생·갓졸업 신입 대상)을 채용 중입니다. 풀타임 온사이트(하노이/호치민/다낭), 한국어 우대 또는 영어, AI 툴 활용, 지원금 월 300만 동 명시.',
        en: 'Until — Korean banner-ad company (Bannerting) — is hiring a Marketing Intern (3-month, full-time onsite in HN/HCMC/DN, for students and fresh grads) via FYI. Korean preferred or good English; AI tools; 3,000,000 VND/month stipend.',
      },
      initial: 'U', company: 'Until', title: 'Marketing Intern', meta: 'Hà Nội / TP.HCM / Đà Nẵng · Thực tập 3 tháng · Full-time', tail: BENEFIT_PUBLIC,
    }),
  },
  {
    match: /^tv0909-.*-private/,
    subject: {
      vi: '[FYI] Bạn được chọn vào danh sách đề cử — {{포지션}} tại TechValley',
      ko: '[FYI] 추천 후보 명단에 선정되셨습니다 — TechValley {{포지션}}',
      en: "[FYI] You've been nominated — {{position}} at TechValley",
    },
    desc: '테크밸리 3공고 recommend (9/9, Mia 게재 알림 당일 발송): 비공개 프레임 — HCMC IT 아웃소싱·클라우드 기업. 그룹=comtor(V83: 한국어×경력 1y 미만×HCMC권, TOPIK5+ 우대·400만 동)/cloud(V82: 영어 인증×≤3y×AWS 스킬 2개+, 영문 CV 필수)/mkt(V84: 마케팅 직군×영어×인턴 연령대×HCMC권, 400만 동). 그룹별 인트로 갈림. 인턴 2건은 HCMC권+미기재 지역 게이트.',
    source: 'scripts/outreach/tv0909-recommend-coldmail.mjs',
    html: (lang) => recommendShell(lang, {
      intro: {
        vi: '{{그룹별 포지션·요건 소개 — 예: comtor}} <b>TechValley Vietnam</b> — công ty Hàn Quốc về IT outsourcing, hạ tầng cloud &amp; tư vấn tại TP.HCM — đang tuyển <b>Thực tập sinh Phiên dịch tiếng Hàn (IT COMTOR)</b> qua FYI: sinh viên/mới tốt nghiệp ngành tiếng Hàn, ưu tiên TOPIK 5+, trợ cấp 4.000.000 VND/tháng, cơ hội thử việc sau 3 tháng.',
        ko: '{{그룹별 포지션·요건 소개}} 예: HCMC 한국계 IT 아웃소싱·클라우드 기업 <b>TechValley</b>가 FYI를 통해 IT컴토 인턴(한국어 전공·TOPIK5+ 우대·지원금 400만 동)을 채용 중입니다.',
        en: '{{per-group position/requirements intro}} e.g. TechValley — Korean IT outsourcing & cloud company in HCMC — is hiring a Korean interpreter intern (TOPIK 5+ preferred, 4M VND stipend) via FYI.',
      },
      initial: 'T', company: 'TechValley', title: '{{공고 제목}}', meta: 'Onsite · TP.HCM', tail: BENEFIT_PRIVATE,
    }),
  },
  {
    match: /^tv0909-/,
    subject: {
      vi: '[FYI] Bạn được chọn vào danh sách đề cử gửi TechValley — {{포지션}}',
      ko: '[FYI] TechValley 추천 명단에 선정되셨습니다 — {{포지션}}',
      en: "[FYI] You've been nominated to TechValley — {{position}}",
    },
    desc: '테크밸리 3공고 recommend (9/9): 공개 프레임 — FYI 검토 선정·명단에 프로필 동봉·지원 시 우선 검토. 그룹·컷은 private 항목과 동일(comtor/cloud/mkt).',
    source: 'scripts/outreach/tv0909-recommend-coldmail.mjs',
    html: (lang) => recommendShell(lang, {
      intro: {
        vi: '{{그룹별 포지션·요건 소개}} Đội ngũ FYI đã xem xét toàn bộ hồ sơ và <b>chọn bạn vào danh sách đề cử</b> — hồ sơ công khai của bạn sẽ được gửi kèm danh sách cho nhà tuyển dụng trong tuần này.',
        ko: '{{그룹별 포지션·요건 소개}} FYI 팀이 이력서 전체를 검토해 회원님을 <b>추천 명단에 선정</b>했으며, 공개 프로필은 이번 주 명단과 함께 담당자에게 전달됩니다.',
        en: '{{per-group position/requirements intro}} The FYI team reviewed all profiles and <b>nominated you</b>; your public profile goes to the recruiter with this week\'s list.',
      },
      initial: 'T', company: 'TechValley', title: '{{공고 제목}}', meta: 'Onsite · TP.HCM', tail: BENEFIT_PUBLIC,
    }),
  },
  {
    match: /^pi0910-.*-private/,
    subject: {
      vi: '[FYI] Bạn được chọn vào danh sách đề cử — Accountant tại PI Power Solutions',
      ko: '[FYI] 추천 후보 명단에 선정되셨습니다 — PI Power Solutions 회계',
      en: "[FYI] You've been nominated — Accountant at PI Power Solutions",
    },
    desc: 'PI 파워솔루션 회계 recommend (9/10, V85 신규 등록 당일): 비공개 프레임 — 클린룸·그린빌딩 조명, HCMC Tân Sơn Nhất 온사이트, 11~15M VND. 컷=회계 직군/스킬 × 경력 1~3.5y(시니어 급여 미스매치 제외) × HCMC권+미기재, 영어 인증은 가점만. 카피에 급여·MISA·다음 주 출근 우선 명시(자기선별). 헤드카운트 1명 소수정예.',
    source: 'scripts/outreach/pi0910-recommend-coldmail.mjs',
    html: (lang) => recommendShell(lang, {
      intro: {
        vi: '<b>PI Power Solutions</b> — công ty chiếu sáng phòng sạch &amp; công trình xanh (Giám đốc người Hàn Quốc) — đang tuyển <b>Accountant</b> qua FYI tại Tân Sơn Nhất, TP.HCM. Yêu cầu 1+ năm kế toán, MISA, tiếng Anh giao tiếp; lương 11–15 triệu, lộ trình lên Kế toán trưởng; ưu tiên đi làm ngay tuần sau.',
        ko: '클린룸·그린빌딩 조명 기업 <b>PI Power Solutions</b>(한국인 대표)가 FYI를 통해 회계 담당자를 채용 중입니다. 회계 1년+·MISA·영어, 월 11~15M VND, 다음 주 출근 가능자 우선.',
        en: 'PI Power Solutions — clean-room & green-building lighting company (Korean director) — is hiring an Accountant in HCMC via FYI. 1+ yr accounting, MISA, English; 11–15M VND; can-start-next-week preferred.',
      },
      initial: 'P', company: 'PI Power Solutions', title: 'ACCOUNTANT', meta: 'Onsite · Tân Sơn Nhất, TP.HCM · 11–15 triệu ₫', tail: BENEFIT_PRIVATE,
    }),
  },
  {
    match: /^pi0910-/,
    subject: {
      vi: '[FYI] Bạn được chọn vào danh sách đề cử gửi PI Power Solutions — Accountant',
      ko: '[FYI] PI Power Solutions 추천 명단에 선정되셨습니다 — 회계',
      en: "[FYI] You've been nominated to PI Power Solutions — Accountant",
    },
    desc: 'PI 파워솔루션 회계 recommend (9/10): 공개 프레임 — FYI 검토 선정·명단에 프로필 동봉·지원 시 우선 검토. 컷은 private 항목과 동일.',
    source: 'scripts/outreach/pi0910-recommend-coldmail.mjs',
    html: (lang) => recommendShell(lang, {
      intro: {
        vi: '<b>PI Power Solutions</b> — công ty chiếu sáng phòng sạch &amp; công trình xanh (Giám đốc người Hàn Quốc) — đang tuyển <b>Accountant</b> qua FYI tại Tân Sơn Nhất, TP.HCM. Đội ngũ FYI đã xem xét toàn bộ hồ sơ và <b>chọn bạn vào danh sách đề cử</b> — hồ sơ công khai của bạn sẽ được gửi kèm danh sách cho nhà tuyển dụng trong tuần này.',
        ko: '클린룸·그린빌딩 조명 기업 <b>PI Power Solutions</b>(한국인 대표)의 회계 포지션 — FYI 팀이 이력서 전체를 검토해 회원님을 <b>추천 명단에 선정</b>했으며, 공개 프로필은 이번 주 명단과 함께 담당자에게 전달됩니다.',
        en: 'PI Power Solutions Accountant — the FYI team reviewed all profiles and <b>nominated you</b>; your public profile goes to the recruiter with this week\'s list.',
      },
      initial: 'P', company: 'PI Power Solutions', title: 'ACCOUNTANT', meta: 'Onsite · Tân Sơn Nhất, TP.HCM · 11–15 triệu ₫', tail: BENEFIT_PUBLIC,
    }),
  },
  {
    match: /^pickcare0910-.*-private/,
    subject: {
      vi: '[FYI] Bạn được chọn vào danh sách đề cử — {{포지션}} tại PickCare',
      ko: '[FYI] 추천 후보 명단에 선정되셨습니다 — PickCare {{포지션}}',
      en: "[FYI] You've been nominated — {{position}} at PickCare",
    },
    desc: '픽케어(R138 UI/UX 디자이너 · R139 디지털 마케터) FRESHER recommend (9/10, 공고 등록 당일): 비공개 프레임 — 한국 펫테크(AI 반려동물 서비스), 온사이트 HN/HCM/ĐN, 10–12M VND, 영문 CV 필수. 컷=재학생(2026+) 또는 ≤2y × (UI/UX 코어 | 마케팅 시그널), 언어는 가점만(JD 언어 조건 없음). 겸업(UI/UX+마케팅)=클라이언트 베스트 요청 → 가점+반대편 공고 링크 동봉+events.meta.dual 기록(추천시트 note 표기용).',
    source: 'scripts/outreach/pickcare0910-recommend-coldmail.mjs',
    html: (lang) => recommendShell(lang, {
      intro: {
        vi: '<b>PickCare</b> — công ty pet-tech Hàn Quốc phát triển dịch vụ thú cưng ứng dụng AI (pickcare.co.kr) — đang tuyển <b>{{Digital Marketer / UI-UX Designer}} (Fresher)</b> qua FYI, onsite Hà Nội / TP.HCM / Đà Nẵng. Lương 10–12 triệu; nộp CV bằng tiếng Anh. {{그룹별 업무·요건 요약}}',
        ko: '한국 펫테크 기업 <b>PickCare</b>(AI 반려동물 서비스)가 FYI를 통해 <b>{{디지털 마케터/UI-UX 디자이너}} (Fresher)</b>를 채용 중입니다. 온사이트 HN/HCM/ĐN, 월 10–12M VND, 영문 CV 필수. 겸업 가능자에겐 반대편 공고 링크도 동봉.',
        en: 'PickCare — Korean pet-tech company building AI pet-care services — is hiring a {{Digital Marketer / UI-UX Designer}} (Fresher) via FYI. Onsite HN/HCM/DN; 10–12M VND; CV in English.',
      },
      initial: 'P', company: 'PickCare', title: '{{공고 제목}}', meta: 'Onsite · HN / TP.HCM / ĐN · 10–12 triệu ₫', tail: BENEFIT_PRIVATE,
    }),
  },
  {
    match: /^pickcare0910-/,
    subject: {
      vi: '[FYI] Bạn được chọn vào danh sách đề cử gửi PickCare — {{포지션}}',
      ko: '[FYI] PickCare 추천 명단에 선정되셨습니다 — {{포지션}}',
      en: "[FYI] You've been nominated to PickCare — {{position}}",
    },
    desc: '픽케어 FRESHER recommend (9/10): 공개 프레임 — FYI 검토 선정·명단에 프로필 동봉·지원 시 우선 검토. 컷·겸업 처리는 private 항목과 동일.',
    source: 'scripts/outreach/pickcare0910-recommend-coldmail.mjs',
    html: (lang) => recommendShell(lang, {
      intro: {
        vi: '<b>PickCare</b> — công ty pet-tech Hàn Quốc phát triển dịch vụ thú cưng ứng dụng AI (pickcare.co.kr) — đang tuyển <b>{{Digital Marketer / UI-UX Designer}} (Fresher)</b> qua FYI. Đội ngũ FYI đã xem xét toàn bộ hồ sơ và <b>chọn bạn vào danh sách đề cử</b> — hồ sơ công khai của bạn sẽ được gửi kèm danh sách cho nhà tuyển dụng trong tuần này.',
        ko: '한국 펫테크 기업 <b>PickCare</b>의 {{디지털 마케터/UI-UX 디자이너}} (Fresher) 포지션 — FYI 팀이 이력서 전체를 검토해 회원님을 <b>추천 명단에 선정</b>했으며, 공개 프로필은 이번 주 명단과 함께 담당자에게 전달됩니다.',
        en: 'PickCare {{Digital Marketer / UI-UX Designer}} (Fresher) — the FYI team reviewed all profiles and <b>nominated you</b>; your public profile goes to the recruiter with this week\'s list.',
      },
      initial: 'P', company: 'PickCare', title: '{{공고 제목}}', meta: 'Onsite · HN / TP.HCM / ĐN · 10–12 triệu ₫', tail: BENEFIT_PUBLIC,
    }),
  },
  {
    match: /^cosmos0911-.*-private/,
    subject: {
      vi: '[FYI] Bạn được chọn vào danh sách đề cử — Full-stack Developer (Junior) tại Cosmos Soft (Hàn Quốc)',
      ko: '[FYI] 추천 후보 명단에 선정되셨습니다 — Cosmos Soft 풀스택 주니어(한국 근무)',
      en: "[FYI] You've been nominated — Full-stack Developer (Junior) at Cosmos Soft (Korea)",
    },
    desc: '코스모스소프트(K22) Full-stack Junior 한국 근무 recommend (9/11, 공고 등록 당일): 비공개 프레임 — 보험사 SI/SM(자사 CRM), Java/Spring+React+SQL, 한국어 필수·영문 CV, 연 23~25M KRW. 컷=FS/BE/FE 직군 × 한국어 인증 × ≤3y. core=Java/Spring 근거 / ext=나머지 한국어 개발자. 풀 실측: 한국어 개발자 16명뿐(개발 922 중).',
    source: 'scripts/outreach/cosmos0911-recommend-coldmail.mjs',
    html: (lang) => recommendShell(lang, {
      intro: {
        vi: '<b>Cosmos Soft</b> — công ty IT Hàn Quốc chuyên SI/SM, xây dựng hệ thống TM, GA, CS, QA cho các công ty bảo hiểm dựa trên giải pháp CRM riêng — đang tuyển <b>Full-stack Developer (Junior)</b> <b>làm việc tại Hàn Quốc</b> qua FYI. Yêu cầu: Java/Spring, HTML/JS/React, SQL (Oracle, MySQL), quản lý version, hiểu biết cloud; <b>giao tiếp được bằng tiếng Hàn</b>. Lương 23–25 triệu KRW/năm. Nộp CV bằng tiếng Anh.',
        ko: '한국 IT기업 <b>Cosmos Soft</b>(보험사 SI/SM, 자사 CRM 솔루션)가 FYI를 통해 <b>풀스택 주니어(한국 근무)</b>를 채용 중. Java/Spring+React+SQL, 한국어 커뮤니케이션 필수, 영문 CV, 연 23~25M KRW.',
        en: 'Cosmos Soft — Korean IT company (insurance SI/SM on its own CRM) — is hiring a Full-stack Developer (Junior) to work in Korea via FYI. Java/Spring, React, SQL; Korean communication required; CV in English; 23–25M KRW/yr.',
      },
      initial: 'C', company: 'Cosmos Soft', title: 'Full-stack - Junior', meta: 'Onsite · Seoul, Hàn Quốc · 23–25 triệu KRW/năm', tail: BENEFIT_PRIVATE,
    }),
  },
  {
    match: /^cosmos0911-/,
    subject: {
      vi: '[FYI] Bạn được chọn vào danh sách đề cử gửi Cosmos Soft — Full-stack Developer (Junior), làm việc tại Hàn Quốc',
      ko: '[FYI] Cosmos Soft 추천 명단에 선정되셨습니다 — 풀스택 주니어(한국 근무)',
      en: "[FYI] You've been nominated to Cosmos Soft — Full-stack Developer (Junior), work in Korea",
    },
    desc: '코스모스소프트(K22) recommend (9/11): 공개 프레임 — FYI 검토 선정·명단에 프로필 동봉·지원 시 우선 검토. 컷은 private 항목과 동일.',
    source: 'scripts/outreach/cosmos0911-recommend-coldmail.mjs',
    html: (lang) => recommendShell(lang, {
      intro: {
        vi: '<b>Cosmos Soft</b> — công ty IT Hàn Quốc chuyên SI/SM cho các công ty bảo hiểm — đang tuyển <b>Full-stack Developer (Junior)</b> làm việc tại Hàn Quốc qua FYI. Đội ngũ FYI đã xem xét toàn bộ hồ sơ và <b>chọn bạn vào danh sách đề cử</b> — hồ sơ công khai của bạn sẽ được gửi kèm danh sách cho nhà tuyển dụng trong tuần này.',
        ko: '한국 IT기업 <b>Cosmos Soft</b>의 풀스택 주니어(한국 근무) 포지션 — FYI 팀이 이력서 전체를 검토해 회원님을 <b>추천 명단에 선정</b>했으며, 공개 프로필은 이번 주 명단과 함께 담당자에게 전달됩니다.',
        en: 'Cosmos Soft Full-stack Developer (Junior, Korea) — the FYI team reviewed all profiles and <b>nominated you</b>; your public profile goes to the recruiter with this week\'s list.',
      },
      initial: 'C', company: 'Cosmos Soft', title: 'Full-stack - Junior', meta: 'Onsite · Seoul, Hàn Quốc · 23–25 triệu KRW/năm', tail: BENEFIT_PUBLIC,
    }),
  },
  {
    match: /^amusing0911-.*-private/,
    subject: {
      vi: '[FYI] Bạn được chọn vào danh sách đề cử — Thực tập sinh Nghiên cứu thị trường tại Amusing Lab',
      ko: '[FYI] 추천 후보 명단에 선정되셨습니다 — Amusing Lab 시장조사 인턴',
      en: "[FYI] You've been nominated — Market Research Intern at Amusing Lab",
    },
    desc: '어뮤징랩(R189) 베트남 시장조사 인턴 recommend (9/11, 공고 등록 당일·성영님 지인 기업 ASAP): 비공개 프레임 — 트렌드 발굴·분석→인사이트, AI 활용 리서치, 수습 5M VND/월, 학력·경력 무관, 영문 CV. 컷=인턴 적합(재학생 2026+/갓졸업 24-25 ≤1y/기타 신입 ≤1y — 경력 1y+ 미스매치 제외) × (BA 코어 | Marketing/Operations×키워드 | 키워드 2+). 언어(영/한)는 JD 우대라 가점만.',
    source: 'scripts/outreach/amusing0911-recommend-coldmail.mjs',
    html: (lang) => recommendShell(lang, {
      intro: {
        vi: '<b>Amusing Lab</b> — công ty Hàn Quốc — đang tuyển <b>Thực tập sinh Nghiên cứu thị trường Việt Nam (Research)</b> qua FYI. Phát hiện & phân tích xu hướng đang “hot” tại Việt Nam thành insight kinh doanh; nghiên cứu đối thủ; dùng AI để nghiên cứu hiệu quả. <b>Không yêu cầu học vấn, kinh nghiệm</b>; thử việc <b>5.000.000 VND/tháng</b>; ưu tiên tiếng Anh hoặc tiếng Hàn; nộp CV bằng tiếng Anh.',
        ko: '한국 기업 <b>Amusing Lab</b>이 FYI를 통해 <b>베트남 시장조사 인턴(리서치)</b>을 채용 중. 트렌드 발굴·분석→인사이트, AI 활용 리서치, 수습 5M VND/월, 학력·경력 무관, 영문 CV.',
        en: 'Amusing Lab — Korean company — is hiring a Vietnam Market Research Intern via FYI. Trend discovery & analysis into business insights, AI-assisted research; no degree/experience required; 5M VND/mo trial; CV in English.',
      },
      initial: 'A', company: 'Amusing Lab', title: 'Thực tập sinh Nghiên cứu thị trường Việt Nam (Research)', meta: 'Thực tập (Research) · TP.HCM · Thử việc 5.000.000 ₫/tháng', tail: BENEFIT_PRIVATE,
    }),
  },
  {
    match: /^amusing0911-/,
    subject: {
      vi: '[FYI] Bạn được chọn vào danh sách đề cử gửi Amusing Lab — Thực tập sinh Nghiên cứu thị trường',
      ko: '[FYI] Amusing Lab 추천 명단에 선정되셨습니다 — 시장조사 인턴',
      en: "[FYI] You've been nominated to Amusing Lab — Market Research Intern",
    },
    desc: '어뮤징랩(R189) 시장조사 인턴 recommend (9/11): 공개 프레임 — FYI 검토 선정·명단에 프로필 동봉·지원 시 우선 검토. 컷은 private 항목과 동일.',
    source: 'scripts/outreach/amusing0911-recommend-coldmail.mjs',
    html: (lang) => recommendShell(lang, {
      intro: {
        vi: '<b>Amusing Lab</b> — công ty Hàn Quốc — đang tuyển <b>Thực tập sinh Nghiên cứu thị trường Việt Nam (Research)</b> qua FYI. Đội ngũ FYI đã xem xét toàn bộ hồ sơ và <b>chọn bạn vào danh sách đề cử</b> — hồ sơ công khai của bạn sẽ được gửi kèm danh sách cho nhà tuyển dụng trong tuần này.',
        ko: '한국 기업 <b>Amusing Lab</b>의 베트남 시장조사 인턴(리서치) 포지션 — FYI 팀이 이력서 전체를 검토해 회원님을 <b>추천 명단에 선정</b>했으며, 공개 프로필은 이번 주 명단과 함께 담당자에게 전달됩니다.',
        en: 'Amusing Lab Vietnam Market Research Intern — the FYI team reviewed all profiles and <b>nominated you</b>; your public profile goes to the recruiter with this week\'s list.',
      },
      initial: 'A', company: 'Amusing Lab', title: 'Thực tập sinh Nghiên cứu thị trường Việt Nam (Research)', meta: 'Thực tập (Research) · TP.HCM · Thử việc 5.000.000 ₫/tháng', tail: BENEFIT_PUBLIC,
    }),
  },
  {
    match: /^jinosys0911-.*-private/,
    subject: {
      vi: '[FYI] Bạn được chọn vào danh sách đề cử — Thực tập sinh AI·IoT·Robot tại Jinosys (Đà Nẵng)',
      ko: '[FYI] 추천 후보 명단에 선정되셨습니다 — Jinosys AI·IoT·로봇 인턴(다낭)',
      en: "[FYI] You've been nominated — AI·IoT·Robotics Intern at Jinosys (Da Nang)",
    },
    desc: 'Jinosys(R191) AI모바일/웹+IoT·로봇 인턴 recommend (9/11, 공고 등록 당일·ASAP): 비공개 프레임 — 온디바이스 AI 화재감지×IoT·로봇 연동(Physical AI), 3명 채용, 지원금 3M VND/월, 다낭 온사이트, 영문 CV. 컷=다낭 거주(호현 지시, VKU 무관) × 인턴 적합(재학생/갓졸업/신입 ≤1y) × (AI Engineer/Mobile/Web 코어 | Embedded/Backend×키워드 | 키워드 2+). 우대(ROS·임베디드·RTSP/WebRTC·영어·VKU)는 가점만.',
    source: 'scripts/outreach/jinosys0911-recommend-coldmail.mjs',
    html: (lang) => recommendShell(lang, {
      intro: {
        vi: '<b>Jinosys</b> — công ty Hàn Quốc phát triển công nghệ phát hiện cháy bằng AI on-device kết hợp IoT & robot (Physical AI) — đang tuyển <b>Thực tập sinh phát triển Mobile/Web AI & tích hợp IoT·Robot</b> (03 người) tại <b>Đà Nẵng</b> qua FYI. Stack: PHP, HTML5/CSS3, JavaScript, Android (Java/Kotlin); ưu tiên ROS, embedded, RTSP/WebRTC, tiếng Anh. Trợ cấp <b>3.000.000 VND/tháng</b>; dự án từ 1 năm, có thể tuyển chính thức sau. Nộp CV bằng tiếng Anh.',
        ko: '한국 기업 <b>Jinosys</b>(온디바이스 AI 화재감지×IoT·로봇, Physical AI)가 FYI를 통해 <b>AI 모바일/웹+IoT·로봇 연동 인턴</b> 3명을 다낭에서 채용 중. PHP/HTML/JS/Android, 지원금 3M VND/월, 1년+ 프로젝트·이후 정식 채용 가능, 영문 CV.',
        en: 'Jinosys — Korean company building on-device AI fire detection with IoT & robotics (Physical AI) — is hiring 3 Mobile/Web AI & IoT·Robot Integration Interns in Da Nang via FYI. PHP/HTML/JS/Android; 3M VND/mo stipend; 1yr+ project with conversion potential; CV in English.',
      },
      initial: 'J', company: 'Jinosys', title: 'AI, IoT, and Robotics Integrated Mobile App & Web Service Intern', meta: 'Thực tập · Onsite Đà Nẵng · Trợ cấp 3.000.000 ₫/tháng', tail: BENEFIT_PRIVATE,
    }),
  },
  {
    match: /^jinosys0911-/,
    subject: {
      vi: '[FYI] Bạn được chọn vào danh sách đề cử gửi Jinosys — Thực tập sinh AI·IoT·Robot (Đà Nẵng)',
      ko: '[FYI] Jinosys 추천 명단에 선정되셨습니다 — AI·IoT·로봇 인턴(다낭)',
      en: "[FYI] You've been nominated to Jinosys — AI·IoT·Robotics Intern (Da Nang)",
    },
    desc: 'Jinosys(R191) 인턴 recommend (9/11): 공개 프레임 — FYI 검토 선정·명단에 프로필 동봉·지원 시 우선 검토. 컷은 private 항목과 동일.',
    source: 'scripts/outreach/jinosys0911-recommend-coldmail.mjs',
    html: (lang) => recommendShell(lang, {
      intro: {
        vi: '<b>Jinosys</b> — công ty Hàn Quốc phát triển công nghệ phát hiện cháy bằng AI on-device kết hợp IoT & robot — đang tuyển <b>Thực tập sinh phát triển Mobile/Web AI & tích hợp IoT·Robot</b> (03 người) tại Đà Nẵng qua FYI. Đội ngũ FYI đã xem xét toàn bộ hồ sơ và <b>chọn bạn vào danh sách đề cử</b> — hồ sơ công khai của bạn sẽ được gửi kèm danh sách cho nhà tuyển dụng trong tuần này.',
        ko: '한국 기업 <b>Jinosys</b>의 AI·IoT·로봇 인턴(다낭) 포지션 — FYI 팀이 이력서 전체를 검토해 회원님을 <b>추천 명단에 선정</b>했으며, 공개 프로필은 이번 주 명단과 함께 담당자에게 전달됩니다.',
        en: 'Jinosys AI·IoT·Robotics Intern (Da Nang) — the FYI team reviewed all profiles and <b>nominated you</b>; your public profile goes to the recruiter with this week\'s list.',
      },
      initial: 'J', company: 'Jinosys', title: 'AI, IoT, and Robotics Integrated Mobile App & Web Service Intern', meta: 'Thực tập · Onsite Đà Nẵng · Trợ cấp 3.000.000 ₫/tháng', tail: BENEFIT_PUBLIC,
    }),
  },
  {
    match: /^thexanh-recommend1-.*-private/,
    subject: {
      vi: '[FYI] Bạn được chọn vào danh sách đề cử — Export & Sourcing Executive tại The Xanh',
      ko: '[FYI] 추천 후보 명단에 선정되셨습니다 — The Xanh 수출·소싱 담당',
      en: "[FYI] You've been nominated — Export & Sourcing Executive at The Xanh",
    },
    desc: 'The Xanh(V87) 한국시장 수출·소싱 담당 recommend (9/14, 보드 전수감사 미착수 공고 일괄): 비공개 프레임 — 베트남 농산물 대한국 수출(건조과일·꿀·견과·향신료·수산·OEM), 공급사 발굴·PO→선적·수출 서류(C/O 등)·QC. 컷=수출입/물류/소싱 시그널 × 2-5y × HCMC × 비인접 직군(개발·디자인 등) 차단.',
    source: 'scripts/outreach/ktc0914-recommend-coldmail.mjs',
    html: (lang) => recommendShell(lang, {
      intro: {
        vi: '<b>THE XANH HOLDINGS</b> — công ty sourcing & xuất khẩu nông sản Việt Nam sang thị trường Hàn Quốc — đang tuyển <b>Export & Sourcing Executive (Korea Market)</b> qua FYI. Công việc: tìm kiếm & đánh giá nhà cung cấp, quản lý PO→shipment, chứng từ xuất khẩu, QC trước xuất hàng, làm việc với khách hàng Hàn Quốc. Yêu cầu 2–5 năm kinh nghiệm XNK/logistics/sourcing. Lương 13–20 triệu ₫/tháng.',
        ko: '베트남 농산물 대한국 수출·소싱 기업 <b>THE XANH HOLDINGS</b>가 FYI를 통해 <b>수출·소싱 담당</b>을 채용 중. 공급사 발굴·PO/선적 관리·수출 서류·QC·한국 바이어 커뮤니케이션, 2-5년 경력, 13-20M VND.',
        en: 'THE XANH HOLDINGS — Vietnamese agri-product sourcing & export company for the Korean market — is hiring an Export & Sourcing Executive via FYI. Supplier sourcing, PO→shipment, export docs, QC; 2–5 yrs; 13–20M VND.',
      },
      initial: 'T', company: 'The Xanh', title: 'Export & Sourcing Executive (Korea Market)', meta: 'Onsite · TP.HCM · 13–20 triệu ₫/tháng', tail: BENEFIT_PRIVATE,
    }),
  },
  {
    match: /^thexanh-recommend1-/,
    subject: {
      vi: '[FYI] Bạn được chọn vào danh sách đề cử gửi The Xanh — Export & Sourcing Executive',
      ko: '[FYI] The Xanh 추천 명단에 선정되셨습니다 — 수출·소싱 담당',
      en: "[FYI] You've been nominated to The Xanh — Export & Sourcing Executive",
    },
    desc: 'The Xanh(V87) 수출·소싱 recommend (9/14): 공개 프레임 — FYI 검토 선정·명단에 프로필 동봉·지원 시 우선 검토. 컷은 private 항목과 동일.',
    source: 'scripts/outreach/ktc0914-recommend-coldmail.mjs',
    html: (lang) => recommendShell(lang, {
      intro: {
        vi: '<b>THE XANH HOLDINGS</b> — công ty sourcing & xuất khẩu nông sản Việt Nam sang thị trường Hàn Quốc — đang tuyển <b>Export & Sourcing Executive (Korea Market)</b> qua FYI. Đội ngũ FYI đã xem xét toàn bộ hồ sơ và <b>chọn bạn vào danh sách đề cử</b> — hồ sơ công khai của bạn sẽ được gửi kèm danh sách cho nhà tuyển dụng trong tuần này.',
        ko: 'The Xanh 수출·소싱 담당 — FYI 팀이 이력서 전체를 검토해 회원님을 <b>추천 명단에 선정</b>했으며, 공개 프로필은 이번 주 명단과 함께 담당자에게 전달됩니다.',
        en: "The Xanh Export & Sourcing Executive — the FYI team reviewed all profiles and <b>nominated you</b>; your public profile goes to the recruiter with this week's list.",
      },
      initial: 'T', company: 'The Xanh', title: 'Export & Sourcing Executive (Korea Market)', meta: 'Onsite · TP.HCM · 13–20 triệu ₫/tháng', tail: BENEFIT_PUBLIC,
    }),
  },
  {
    match: /^yellowdr-recommend1-mgr-.*-private/,
    subject: {
      vi: '[FYI] Bạn được chọn vào danh sách đề cử — Showroom Manager / CEO Assistant tại Yellow Dr.',
      ko: '[FYI] 추천 후보 명단에 선정되셨습니다 — Yellow Dr. 쇼룸 매니저/CEO 어시스턴트',
      en: "[FYI] You've been nominated — Showroom Manager / CEO Assistant at Yellow Dr.",
    },
    desc: 'Yellow Dr.(YD1904) 쇼룸 매니저/CEO 어시스턴트 recommend (9/14): 비공개 프레임 — 한국 풋케어 브랜드, 사무실·쇼룸 운영/신제품 런칭/비용·증빙 관리. 컷=한국어 회화(JD 하드) × 3y+ × 운영/관리 시그널 × HCMC. 뷰티·헬스케어 가점. 풀 7명 실측(한국어×운영 교집합 상한).',
    source: 'scripts/outreach/ktc0914-recommend-coldmail.mjs',
    html: (lang) => recommendShell(lang, {
      intro: {
        vi: '<b>Yellow Dr.</b> — thương hiệu chăm sóc sức khỏe bàn chân đến từ Hàn Quốc — đang tuyển <b>Showroom Manager / CEO Assistant</b> qua FYI. Quản lý & vận hành văn phòng/showroom, chuẩn bị ra mắt sản phẩm mới, quản lý chi phí & chứng từ. Yêu cầu kinh nghiệm quản lý beauty/healthcare, <b>giao tiếp được bằng tiếng Hàn</b>. Lương 20–25 triệu ₫, deal theo năng lực & tiếng Hàn, không mức trần.',
        ko: '한국 풋케어 브랜드 <b>Yellow Dr.</b>가 FYI를 통해 <b>쇼룸 매니저/CEO 어시스턴트</b> 채용 중. 사무실·쇼룸 운영, 신제품 런칭, 비용 관리. 뷰티/헬스케어 관리 경력·<b>한국어 회화 필수</b>, 20-25M VND(상한 없음 협의).',
        en: 'Yellow Dr. — Korean foot-care brand — is hiring a Showroom Manager / CEO Assistant via FYI. Office/showroom ops, new product launch, cost management. Beauty/healthcare management experience, conversational Korean required; 20–25M VND, negotiable.',
      },
      initial: 'Y', company: 'Yellow Dr.', title: 'Showroom Manager / CEO Assistant', meta: 'Onsite · Bình Thạnh, TP.HCM · 20–25 triệu ₫/tháng', tail: BENEFIT_PRIVATE,
    }),
  },
  {
    match: /^yellowdr-recommend1-mgr-/,
    subject: {
      vi: '[FYI] Bạn được chọn vào danh sách đề cử gửi Yellow Dr. — Showroom Manager / CEO Assistant',
      ko: '[FYI] Yellow Dr. 추천 명단에 선정되셨습니다 — 쇼룸 매니저/CEO 어시스턴트',
      en: "[FYI] You've been nominated to Yellow Dr. — Showroom Manager / CEO Assistant",
    },
    desc: 'Yellow Dr.(YD1904) 쇼룸 매니저 recommend (9/14): 공개 프레임. 컷은 private 항목과 동일.',
    source: 'scripts/outreach/ktc0914-recommend-coldmail.mjs',
    html: (lang) => recommendShell(lang, {
      intro: {
        vi: '<b>Yellow Dr.</b> — thương hiệu chăm sóc sức khỏe bàn chân đến từ Hàn Quốc — đang tuyển <b>Showroom Manager / CEO Assistant</b> (yêu cầu giao tiếp tiếng Hàn, kinh nghiệm quản lý beauty/healthcare) qua FYI. Đội ngũ FYI đã xem xét toàn bộ hồ sơ và <b>chọn bạn vào danh sách đề cử</b> — hồ sơ công khai của bạn sẽ được gửi kèm danh sách trong tuần này.',
        ko: 'Yellow Dr. 쇼룸 매니저/CEO 어시스턴트 — FYI 팀이 이력서 전체를 검토해 회원님을 <b>추천 명단에 선정</b>했으며, 공개 프로필은 이번 주 명단과 함께 담당자에게 전달됩니다.',
        en: "Yellow Dr. Showroom Manager / CEO Assistant — the FYI team reviewed all profiles and <b>nominated you</b>; your public profile goes to the recruiter with this week's list.",
      },
      initial: 'Y', company: 'Yellow Dr.', title: 'Showroom Manager / CEO Assistant', meta: 'Onsite · Bình Thạnh, TP.HCM · 20–25 triệu ₫/tháng', tail: BENEFIT_PUBLIC,
    }),
  },
  {
    match: /^yellowdr-recommend1-sales-.*-private/,
    subject: {
      vi: '[FYI] Bạn được chọn vào danh sách đề cử — Sales & Showroom Operations tại Yellow Dr.',
      ko: '[FYI] 추천 후보 명단에 선정되셨습니다 — Yellow Dr. 세일즈·쇼룸 운영',
      en: "[FYI] You've been nominated — Sales & Showroom Operations at Yellow Dr.",
    },
    desc: 'Yellow Dr.(YD1903) 세일즈·쇼룸 운영 recommend (9/14): 비공개 프레임 — 쇼룸 운영·재고, Zalo/웹 CS, 약국·대리점·의료기관 B2B 개척. 컷=세일즈 직군(인접 직군은 세일즈 시그널 필수, Motive 확장룰) × 1y+ × ≤10y(급여 10-18M 미스매치 컷) × HCMC. 헬스케어·뷰티·제약 도메인 가점.',
    source: 'scripts/outreach/ktc0914-recommend-coldmail.mjs',
    html: (lang) => recommendShell(lang, {
      intro: {
        vi: '<b>Yellow Dr.</b> — thương hiệu chăm sóc sức khỏe bàn chân đến từ Hàn Quốc — đang tuyển <b>Sales & Showroom Operations Executive</b> qua FYI. Vận hành showroom & tồn kho, CSKH qua Zalo/website/hotline, phát triển khách hàng <b>B2B</b> (nhà thuốc, đại lý, cơ sở y tế). Yêu cầu tối thiểu 1 năm kinh nghiệm sales (siêu thị/healthcare/mỹ phẩm/dược/thiết bị y tế). Lương 10–18 triệu ₫/tháng.',
        ko: '한국 풋케어 브랜드 <b>Yellow Dr.</b>가 FYI를 통해 <b>세일즈·쇼룸 운영 담당</b> 채용 중. 쇼룸·재고 운영, 온라인 CS, 약국·대리점 B2B 개척. 세일즈 1년+ 경력, 10-18M VND.',
        en: 'Yellow Dr. — Korean foot-care brand — is hiring a Sales & Showroom Operations Executive via FYI. Showroom/inventory ops, online CS, B2B development (pharmacies, agencies, clinics). 1+ yr sales experience; 10–18M VND.',
      },
      initial: 'Y', company: 'Yellow Dr.', title: 'Sales & Showroom Operations Executive', meta: 'Onsite · Bình Thạnh, TP.HCM · 10–18 triệu ₫/tháng', tail: BENEFIT_PRIVATE,
    }),
  },
  {
    match: /^yellowdr-recommend1-sales-/,
    subject: {
      vi: '[FYI] Bạn được chọn vào danh sách đề cử gửi Yellow Dr. — Sales & Showroom Operations',
      ko: '[FYI] Yellow Dr. 추천 명단에 선정되셨습니다 — 세일즈·쇼룸 운영',
      en: "[FYI] You've been nominated to Yellow Dr. — Sales & Showroom Operations",
    },
    desc: 'Yellow Dr.(YD1903) 세일즈·쇼룸 운영 recommend (9/14): 공개 프레임. 컷은 private 항목과 동일.',
    source: 'scripts/outreach/ktc0914-recommend-coldmail.mjs',
    html: (lang) => recommendShell(lang, {
      intro: {
        vi: '<b>Yellow Dr.</b> — thương hiệu chăm sóc sức khỏe bàn chân đến từ Hàn Quốc — đang tuyển <b>Sales & Showroom Operations Executive</b> (B2B nhà thuốc/đại lý/cơ sở y tế, tối thiểu 1 năm sales) qua FYI. Đội ngũ FYI đã xem xét toàn bộ hồ sơ và <b>chọn bạn vào danh sách đề cử</b> — hồ sơ công khai của bạn sẽ được gửi kèm danh sách trong tuần này.',
        ko: 'Yellow Dr. 세일즈·쇼룸 운영 — FYI 팀이 이력서 전체를 검토해 회원님을 <b>추천 명단에 선정</b>했으며, 공개 프로필은 이번 주 명단과 함께 담당자에게 전달됩니다.',
        en: "Yellow Dr. Sales & Showroom Operations — the FYI team reviewed all profiles and <b>nominated you</b>; your public profile goes to the recruiter with this week's list.",
      },
      initial: 'Y', company: 'Yellow Dr.', title: 'Sales & Showroom Operations Executive', meta: 'Onsite · Bình Thạnh, TP.HCM · 10–18 triệu ₫/tháng', tail: BENEFIT_PUBLIC,
    }),
  },
  {
    match: /^wellpod-recommend2-.*-private/,
    subject: {
      vi: '[FYI] Bạn được chọn vào danh sách đề cử — Thực tập sinh Vận hành Quảng cáo TikTok Shop tại Wellpod',
      ko: '[FYI] 추천 후보 명단에 선정되셨습니다 — Wellpod TikTok Shop 광고 운영 인턴',
      en: "[FYI] You've been nominated — TikTok Shop Ads Operations Intern at Wellpod",
    },
    desc: 'Wellpod(R192) TikTok Shop 미국 광고 운영 인턴 recommend (9/14): 비공개 프레임 — 광고 운영·성과 추적, 미국 이커머스 트렌드 리서치, 한-베 커뮤니케이션 지원. 지원금 3-4M VND. 컷=인턴 적합(≤1y) × 마케팅/이커머스(직군 or 시그널) × HCMC. TikTok·한국어/영어 가점. (인플루언서 모집 아님 — JD 명시 그대로 카피에 반영)',
    source: 'scripts/outreach/ktc0914-recommend-coldmail.mjs',
    html: (lang) => recommendShell(lang, {
      intro: {
        vi: '<b>Wellpod</b> — công ty Hàn Quốc vận hành quảng cáo TikTok Shop thị trường Mỹ — đang tuyển <b>Thực tập sinh Vận hành Quảng cáo TikTok Shop</b> qua FYI. Hỗ trợ vận hành & theo dõi hiệu quả quảng cáo, nghiên cứu xu hướng e-commerce Mỹ, hỗ trợ giao tiếp Hàn–Việt. Ưu tiên tiếng Hàn hoặc tiếng Anh tốt, chuyên ngành marketing, biết Excel/Google Sheets & AI tạo sinh. Hỗ trợ 3–4 triệu ₫/tháng.',
        ko: '한국 기업 <b>Wellpod</b>(TikTok Shop 미국 광고 운영)가 FYI를 통해 <b>광고 운영 인턴</b> 채용 중. 광고 운영·성과 추적, 미국 이커머스 리서치, 한-베 커뮤니케이션. 한국어/영어 우대, 지원금 3-4M VND.',
        en: 'Wellpod — Korean company running TikTok Shop US ads — is hiring a TikTok Shop Ads Operations Intern via FYI. Ad ops & performance tracking, US e-commerce research, KR–VN communication support. Korean or English preferred; 3–4M VND stipend.',
      },
      initial: 'W', company: 'Wellpod', title: 'Thực tập sinh Vận hành Quảng cáo TikTok Shop Mỹ', meta: 'Thực tập · TP.HCM · Hỗ trợ 3–4 triệu ₫/tháng', tail: BENEFIT_PRIVATE,
    }),
  },
  {
    match: /^wellpod-recommend2-/,
    subject: {
      vi: '[FYI] Bạn được chọn vào danh sách đề cử gửi Wellpod — Thực tập sinh Vận hành Quảng cáo TikTok Shop',
      ko: '[FYI] Wellpod 추천 명단에 선정되셨습니다 — TikTok Shop 광고 운영 인턴',
      en: "[FYI] You've been nominated to Wellpod — TikTok Shop Ads Operations Intern",
    },
    desc: 'Wellpod(R192) TikTok Shop 광고 운영 인턴 recommend (9/14): 공개 프레임. 컷은 private 항목과 동일.',
    source: 'scripts/outreach/ktc0914-recommend-coldmail.mjs',
    html: (lang) => recommendShell(lang, {
      intro: {
        vi: '<b>Wellpod</b> — công ty Hàn Quốc vận hành quảng cáo TikTok Shop thị trường Mỹ — đang tuyển <b>Thực tập sinh Vận hành Quảng cáo TikTok Shop</b> (hỗ trợ 3–4 triệu ₫/tháng) qua FYI. Đội ngũ FYI đã xem xét toàn bộ hồ sơ và <b>chọn bạn vào danh sách đề cử</b> — hồ sơ công khai của bạn sẽ được gửi kèm danh sách cho nhà tuyển dụng trong tuần này.',
        ko: 'Wellpod TikTok Shop 광고 운영 인턴 — FYI 팀이 이력서 전체를 검토해 회원님을 <b>추천 명단에 선정</b>했으며, 공개 프로필은 이번 주 명단과 함께 담당자에게 전달됩니다.',
        en: "Wellpod TikTok Shop Ads Operations Intern — the FYI team reviewed all profiles and <b>nominated you</b>; your public profile goes to the recruiter with this week's list.",
      },
      initial: 'W', company: 'Wellpod', title: 'Thực tập sinh Vận hành Quảng cáo TikTok Shop Mỹ', meta: 'Thực tập · TP.HCM · Hỗ trợ 3–4 triệu ₫/tháng', tail: BENEFIT_PUBLIC,
    }),
  },
  {
    match: /^becuai-recommend1-.*-private/,
    subject: {
      vi: '[FYI] Bạn được chọn vào danh sách đề cử — Nhân viên Xử lý Dữ liệu (tiếng Hàn) tại BECUAI',
      ko: '[FYI] 추천 후보 명단에 선정되셨습니다 — BECUAI 데이터 처리(한국어)',
      en: "[FYI] You've been nominated — Data Processing Staff (Korean) at BECUAI",
    },
    desc: 'BECUAI(V22) 한국어 뉴스 데이터 처리 recommend (9/14): 비공개 프레임 — AI용 한국 뉴스 데이터 입력·관리(교육 제공, 무경력 가능), gross 12M+야간수당, 기숙사. 컷=한국어 인증/TOPIK 명시(하드 — 넓은 korean 매칭 금지, MISA 오탐 교훈) × ≤3y × HCMC. 야간(15~24시)·주6일(일~금)은 카피에 명시해 자기선별.',
    source: 'scripts/outreach/ktc0914-recommend-coldmail.mjs',
    html: (lang) => recommendShell(lang, {
      intro: {
        vi: '<b>BECUAI VIETNAM</b> đang tuyển <b>Nhân viên Xử lý Dữ liệu (Data Labels)</b> qua FYI — nhập liệu & quản lý dữ liệu báo chí Hàn Quốc cho AI (được đào tạo, <b>không yêu cầu kinh nghiệm</b>). Yêu cầu: tốt nghiệp ĐH, <b>tiếng Hàn đọc hiểu khá (TOPIK 3–4)</b>, phỏng vấn tiếng Hàn + test đánh máy. Giờ làm: <b>15:00–00:00 (phụ cấp đêm), CN–T6</b>. Gross 12 triệu ₫, có KTX gần công ty.',
        ko: '<b>BECUAI VIETNAM</b>이 FYI를 통해 <b>데이터 처리 직원</b> 채용 중. AI용 한국 뉴스 데이터 입력·관리(교육 제공, 무경력 가능). 대졸·TOPIK 3-4, 한국어 면접+타이핑 테스트, 근무 15~24시(야간수당)·일~금, gross 12M VND, 기숙사 제공.',
        en: 'BECUAI VIETNAM is hiring Data Processing Staff via FYI — Korean news data entry & management for AI (training provided, no experience required). University degree, TOPIK 3–4, Korean interview + typing test. Hours 15:00–00:00 (night allowance), Sun–Fri; gross 12M VND; dorm available.',
      },
      initial: 'B', company: 'BECUAI VIETNAM', title: 'Nhân viên Xử lý Dữ liệu (Data Labels)', meta: 'Onsite · Q.3, TP.HCM · Gross 12 triệu ₫ + phụ cấp đêm', tail: BENEFIT_PRIVATE,
    }),
  },
  {
    match: /^becuai-recommend1-/,
    subject: {
      vi: '[FYI] Bạn được chọn vào danh sách đề cử gửi BECUAI — Nhân viên Xử lý Dữ liệu (tiếng Hàn)',
      ko: '[FYI] BECUAI 추천 명단에 선정되셨습니다 — 데이터 처리(한국어)',
      en: "[FYI] You've been nominated to BECUAI — Data Processing Staff (Korean)",
    },
    desc: 'BECUAI(V22) 데이터 처리 recommend (9/14): 공개 프레임. 컷은 private 항목과 동일.',
    source: 'scripts/outreach/ktc0914-recommend-coldmail.mjs',
    html: (lang) => recommendShell(lang, {
      intro: {
        vi: '<b>BECUAI VIETNAM</b> đang tuyển <b>Nhân viên Xử lý Dữ liệu (Data Labels)</b> — nhập liệu dữ liệu báo chí Hàn Quốc cho AI, yêu cầu TOPIK 3–4, giờ làm 15:00–00:00 CN–T6, gross 12 triệu ₫ — qua FYI. Đội ngũ FYI đã xem xét toàn bộ hồ sơ và <b>chọn bạn vào danh sách đề cử</b> — hồ sơ công khai của bạn sẽ được gửi kèm danh sách trong tuần này.',
        ko: 'BECUAI 데이터 처리(한국어) — FYI 팀이 이력서 전체를 검토해 회원님을 <b>추천 명단에 선정</b>했으며, 공개 프로필은 이번 주 명단과 함께 담당자에게 전달됩니다.',
        en: "BECUAI Data Processing Staff (Korean) — the FYI team reviewed all profiles and <b>nominated you</b>; your public profile goes to the recruiter with this week's list.",
      },
      initial: 'B', company: 'BECUAI VIETNAM', title: 'Nhân viên Xử lý Dữ liệu (Data Labels)', meta: 'Onsite · Q.3, TP.HCM · Gross 12 triệu ₫ + phụ cấp đêm', tail: BENEFIT_PUBLIC,
    }),
  },
  {
    match: /^lomen-recommend1-web-.*private/,
    subject: {
      vi: '[FYI] Bạn được chọn vào danh sách đề cử — Web Developer tại Lomen',
      ko: '[FYI] 추천 후보 명단에 선정되셨습니다 — Lomen 웹 개발자',
      en: "[FYI] You've been nominated — Web Developer at Lomen",
    },
    desc: 'Lomen(R194) 웹 개발자 recommend (9/14, Len 게시 당일 소싱): 비공개 프레임 — 한국 소프트웨어·산업디자인 기업(KIDP 인증), 웹/서비스 개발·운영, Intern/Fresher/Junior, 연봉 협의. 컷=Web/Frontend/Backend/Fullstack 직군 × 경력 5y 이하. 근무지 HCM·HN·ĐN(지역 하드게이트 없음).',
    source: 'scripts/outreach/lomen0914-recommend-coldmail.mjs',
    html: (lang) => recommendShell(lang, {
      intro: {
        vi: '<b>LOMEN</b> — công ty Hàn Quốc chuyên phát triển phần mềm & thiết kế công nghiệp tổng hợp (KIDP chứng nhận) — đang tuyển <b>Web Developer (Intern/Fresher/Junior)</b> qua FYI. Công việc: phát triển & vận hành web/dịch vụ, tính năng mới & bảo trì, ứng dụng AI. Yêu cầu: kinh nghiệm web/app hoặc dự án liên quan, Git/GitHub, CV tiếng Anh. Lương thỏa thuận.',
        ko: '한국 소프트웨어·산업디자인 기업 Lomen이 FYI를 통해 <b>웹 개발자(인턴~주니어)</b>를 채용 중. 웹/서비스 개발·운영, Git/GitHub, 영문 CV, 연봉 협의.',
        en: 'LOMEN — Korean software & industrial design company (KIDP-certified) — is hiring a Web Developer (Intern/Fresher/Junior) via FYI. Web/app dev experience, Git/GitHub, English CV; salary negotiable.',
      },
      initial: 'L', company: 'Lomen', title: 'Web Developer', meta: 'TP.HCM · Hà Nội · Đà Nẵng · Intern/Fresher/Junior · Lương thỏa thuận', tail: BENEFIT_PRIVATE,
    }),
  },
  {
    match: /^lomen-recommend1-web-/,
    subject: {
      vi: '[FYI] Bạn được chọn vào danh sách đề cử gửi Lomen — Web Developer',
      ko: '[FYI] Lomen 추천 명단에 선정되셨습니다 — 웹 개발자',
      en: "[FYI] You've been nominated to Lomen — Web Developer",
    },
    desc: 'Lomen(R194) 웹 개발자 recommend (9/14): 공개 프레임 — FYI 검토 선정·명단에 프로필 동봉·지원 시 우선 검토. 컷은 private 항목과 동일.',
    source: 'scripts/outreach/lomen0914-recommend-coldmail.mjs',
    html: (lang) => recommendShell(lang, {
      intro: {
        vi: '<b>LOMEN</b> — công ty Hàn Quốc chuyên phát triển phần mềm & thiết kế công nghiệp tổng hợp — đang tuyển <b>Web Developer (Intern/Fresher/Junior)</b> qua FYI. Đội ngũ FYI đã xem xét toàn bộ hồ sơ và <b>chọn bạn vào danh sách đề cử</b> — hồ sơ công khai của bạn sẽ được gửi kèm danh sách cho nhà tuyển dụng trong tuần này.',
        ko: 'Lomen 웹 개발자 — FYI 팀이 이력서 전체를 검토해 회원님을 <b>추천 명단에 선정</b>했으며, 공개 프로필은 이번 주 명단과 함께 담당자에게 전달됩니다.',
        en: "Lomen Web Developer — the FYI team reviewed all profiles and <b>nominated you</b>; your public profile goes to the recruiter with this week's list.",
      },
      initial: 'L', company: 'Lomen', title: 'Web Developer', meta: 'TP.HCM · Hà Nội · Đà Nẵng · Intern/Fresher/Junior · Lương thỏa thuận', tail: BENEFIT_PUBLIC,
    }),
  },
  {
    match: /^lomen-recommend1-edt-.*private/,
    subject: {
      vi: '[FYI] Bạn được chọn vào danh sách đề cử — Editor (Video) tại Lomen',
      ko: '[FYI] 추천 후보 명단에 선정되셨습니다 — Lomen 영상 에디터',
      en: "[FYI] You've been nominated — Editor (Video) at Lomen",
    },
    desc: 'Lomen(R197) 영상 에디터 recommend (9/14): 비공개 프레임 — YouTube/TikTok/Instagram 영상 제작, 쇼트/롱폼 편집·후반작업, Intern/Fresher/Junior. 컷=영상편집 시그널(Premiere/AE/CapCut 등, Designer 코어 222명 완전 중복이라 스킬로 분리 배정) × 경력 5y 이하 × 비인접 직군 차단.',
    source: 'scripts/outreach/lomen0914-recommend-coldmail.mjs',
    html: (lang) => recommendShell(lang, {
      intro: {
        vi: '<b>LOMEN</b> — công ty Hàn Quốc chuyên phát triển phần mềm & thiết kế công nghiệp tổng hợp (KIDP chứng nhận) — đang tuyển <b>Editor (Video, Intern/Fresher/Junior)</b> qua FYI. Công việc: sản xuất video cho YouTube/TikTok/Instagram, biên tập short-form & long-form, hậu kỳ (phụ đề, BGM, hiệu ứng), ứng dụng công cụ AI. Yêu cầu: kinh nghiệm biên tập video, Premiere Pro/After Effects/CapCut, CV tiếng Anh & portfolio. Lương thỏa thuận.',
        ko: 'Lomen <b>영상 에디터(인턴~주니어)</b> — YouTube/TikTok/Instagram 영상 제작·쇼트/롱폼 편집·후반작업, Premiere/AE/CapCut, 영문 CV+포트폴리오, 연봉 협의.',
        en: 'LOMEN is hiring a Video Editor (Intern/Fresher/Junior) via FYI. YouTube/TikTok/Instagram content, short/long-form editing, post-production; Premiere/AE/CapCut, English CV & portfolio; salary negotiable.',
      },
      initial: 'L', company: 'Lomen', title: 'Editor', meta: 'TP.HCM · Hà Nội · Đà Nẵng · Intern/Fresher/Junior · Lương thỏa thuận', tail: BENEFIT_PRIVATE,
    }),
  },
  {
    match: /^lomen-recommend1-edt-/,
    subject: {
      vi: '[FYI] Bạn được chọn vào danh sách đề cử gửi Lomen — Editor (Video)',
      ko: '[FYI] Lomen 추천 명단에 선정되셨습니다 — 영상 에디터',
      en: "[FYI] You've been nominated to Lomen — Editor (Video)",
    },
    desc: 'Lomen(R197) 영상 에디터 recommend (9/14): 공개 프레임. 컷은 private 항목과 동일.',
    source: 'scripts/outreach/lomen0914-recommend-coldmail.mjs',
    html: (lang) => recommendShell(lang, {
      intro: {
        vi: '<b>LOMEN</b> — công ty Hàn Quốc chuyên phát triển phần mềm & thiết kế công nghiệp tổng hợp — đang tuyển <b>Editor (Video, Intern/Fresher/Junior)</b> qua FYI. Đội ngũ FYI đã xem xét toàn bộ hồ sơ và <b>chọn bạn vào danh sách đề cử</b> — hồ sơ công khai của bạn sẽ được gửi kèm danh sách cho nhà tuyển dụng trong tuần này.',
        ko: 'Lomen 영상 에디터 — FYI 팀이 이력서 전체를 검토해 회원님을 <b>추천 명단에 선정</b>했으며, 공개 프로필은 이번 주 명단과 함께 담당자에게 전달됩니다.',
        en: "Lomen Video Editor — the FYI team reviewed all profiles and <b>nominated you</b>; your public profile goes to the recruiter with this week's list.",
      },
      initial: 'L', company: 'Lomen', title: 'Editor', meta: 'TP.HCM · Hà Nội · Đà Nẵng · Intern/Fresher/Junior · Lương thỏa thuận', tail: BENEFIT_PUBLIC,
    }),
  },
  {
    match: /^lomen-recommend1-dsn-.*private/,
    subject: {
      vi: '[FYI] Bạn được chọn vào danh sách đề cử — Designer tại Lomen',
      ko: '[FYI] 추천 후보 명단에 선정되셨습니다 — Lomen 디자이너',
      en: "[FYI] You've been nominated — Designer at Lomen",
    },
    desc: 'Lomen(R196) 디자이너 recommend (9/14): 비공개 프레임 — 브랜딩·digital 콘텐츠·SNS/마케팅·UI/UX 디자인, Intern/Fresher/Junior. 컷=Design 직군(영상 시그널 있으면 Editor로 선배정) 또는 인접 직군+디자인 툴 시그널 × 경력 5y 이하.',
    source: 'scripts/outreach/lomen0914-recommend-coldmail.mjs',
    html: (lang) => recommendShell(lang, {
      intro: {
        vi: '<b>LOMEN</b> — công ty Hàn Quốc chuyên phát triển phần mềm & thiết kế công nghiệp tổng hợp (KIDP chứng nhận) — đang tuyển <b>Designer (Intern/Fresher/Junior)</b> qua FYI. Công việc: thiết kế thương hiệu & nội dung digital, nội dung SNS/marketing, UI/UX web/mobile, sản xuất hình ảnh bằng công cụ AI. Yêu cầu: kinh nghiệm/dự án thiết kế, Figma/Photoshop/Illustrator, CV tiếng Anh & portfolio. Lương thỏa thuận.',
        ko: 'Lomen <b>디자이너(인턴~주니어)</b> — 브랜딩·digital 콘텐츠·SNS/마케팅·UI/UX 디자인, Figma/PS/AI, 영문 CV+포트폴리오, 연봉 협의.',
        en: 'LOMEN is hiring a Designer (Intern/Fresher/Junior) via FYI. Branding & digital content, SNS/marketing design, UI/UX; Figma/Photoshop/Illustrator, English CV & portfolio; salary negotiable.',
      },
      initial: 'L', company: 'Lomen', title: 'Designer', meta: 'TP.HCM · Hà Nội · Đà Nẵng · Intern/Fresher/Junior · Lương thỏa thuận', tail: BENEFIT_PRIVATE,
    }),
  },
  {
    match: /^lomen-recommend1-dsn-/,
    subject: {
      vi: '[FYI] Bạn được chọn vào danh sách đề cử gửi Lomen — Designer',
      ko: '[FYI] Lomen 추천 명단에 선정되셨습니다 — 디자이너',
      en: "[FYI] You've been nominated to Lomen — Designer",
    },
    desc: 'Lomen(R196) 디자이너 recommend (9/14): 공개 프레임. 컷은 private 항목과 동일.',
    source: 'scripts/outreach/lomen0914-recommend-coldmail.mjs',
    html: (lang) => recommendShell(lang, {
      intro: {
        vi: '<b>LOMEN</b> — công ty Hàn Quốc chuyên phát triển phần mềm & thiết kế công nghiệp tổng hợp — đang tuyển <b>Designer (Intern/Fresher/Junior)</b> qua FYI. Đội ngũ FYI đã xem xét toàn bộ hồ sơ và <b>chọn bạn vào danh sách đề cử</b> — hồ sơ công khai của bạn sẽ được gửi kèm danh sách cho nhà tuyển dụng trong tuần này.',
        ko: 'Lomen 디자이너 — FYI 팀이 이력서 전체를 검토해 회원님을 <b>추천 명단에 선정</b>했으며, 공개 프로필은 이번 주 명단과 함께 담당자에게 전달됩니다.',
        en: "Lomen Designer — the FYI team reviewed all profiles and <b>nominated you</b>; your public profile goes to the recruiter with this week's list.",
      },
      initial: 'L', company: 'Lomen', title: 'Designer', meta: 'TP.HCM · Hà Nội · Đà Nẵng · Intern/Fresher/Junior · Lương thỏa thuận', tail: BENEFIT_PUBLIC,
    }),
  },
  {
    match: /^lomen-recommend1-mkt-.*private/,
    subject: {
      vi: '[FYI] Bạn được chọn vào danh sách đề cử — Marketer tại Lomen',
      ko: '[FYI] 추천 후보 명단에 선정되셨습니다 — Lomen 마케터',
      en: "[FYI] You've been nominated — Marketer at Lomen",
    },
    desc: 'Lomen(R195) 마케터 recommend (9/14): 비공개 프레임 — 국내외 마케팅·콘텐츠, 시장/트렌드 리서치, SNS/digital 운영, 성과 분석, Intern/Fresher/Junior. 컷=Marketing 직군 또는 Sales/BD+마케팅 시그널 × 경력 5y 이하.',
    source: 'scripts/outreach/lomen0914-recommend-coldmail.mjs',
    html: (lang) => recommendShell(lang, {
      intro: {
        vi: '<b>LOMEN</b> — công ty Hàn Quốc chuyên phát triển phần mềm & thiết kế công nghiệp tổng hợp (KIDP chứng nhận) — đang tuyển <b>Marketer (Intern/Fresher/Junior)</b> qua FYI. Công việc: marketing & content trong và ngoài nước, nghiên cứu thị trường & xu hướng, vận hành nội dung SNS/digital, phân tích hiệu quả, ứng dụng AI tạo sinh. Yêu cầu: kinh nghiệm marketing/quảng cáo/content, CV tiếng Anh. Lương thỏa thuận.',
        ko: 'Lomen <b>마케터(인턴~주니어)</b> — 국내외 마케팅·콘텐츠, SNS/digital 운영, 성과 분석, 영문 CV, 연봉 협의.',
        en: 'LOMEN is hiring a Marketer (Intern/Fresher/Junior) via FYI. Marketing & content, SNS/digital ops, performance analysis; English CV; salary negotiable.',
      },
      initial: 'L', company: 'Lomen', title: 'Marketer', meta: 'TP.HCM · Hà Nội · Đà Nẵng · Intern/Fresher/Junior · Lương thỏa thuận', tail: BENEFIT_PRIVATE,
    }),
  },
  {
    match: /^lomen-recommend1-mkt-/,
    subject: {
      vi: '[FYI] Bạn được chọn vào danh sách đề cử gửi Lomen — Marketer',
      ko: '[FYI] Lomen 추천 명단에 선정되셨습니다 — 마케터',
      en: "[FYI] You've been nominated to Lomen — Marketer",
    },
    desc: 'Lomen(R195) 마케터 recommend (9/14): 공개 프레임. 컷은 private 항목과 동일.',
    source: 'scripts/outreach/lomen0914-recommend-coldmail.mjs',
    html: (lang) => recommendShell(lang, {
      intro: {
        vi: '<b>LOMEN</b> — công ty Hàn Quốc chuyên phát triển phần mềm & thiết kế công nghiệp tổng hợp — đang tuyển <b>Marketer (Intern/Fresher/Junior)</b> qua FYI. Đội ngũ FYI đã xem xét toàn bộ hồ sơ và <b>chọn bạn vào danh sách đề cử</b> — hồ sơ công khai của bạn sẽ được gửi kèm danh sách cho nhà tuyển dụng trong tuần này.',
        ko: 'Lomen 마케터 — FYI 팀이 이력서 전체를 검토해 회원님을 <b>추천 명단에 선정</b>했으며, 공개 프로필은 이번 주 명단과 함께 담당자에게 전달됩니다.',
        en: "Lomen Marketer — the FYI team reviewed all profiles and <b>nominated you</b>; your public profile goes to the recruiter with this week's list.",
      },
      initial: 'L', company: 'Lomen', title: 'Marketer', meta: 'TP.HCM · Hà Nội · Đà Nẵng · Intern/Fresher/Junior · Lương thỏa thuận', tail: BENEFIT_PUBLIC,
    }),
  },
  {
    match: /^cosmos0915-.*-private/,
    subject: {
      vi: '[FYI] Bạn được chọn vào danh sách đề cử — Full-stack Developer (Junior) tại Cosmos Soft (Hàn Quốc)',
      ko: '[FYI] 추천 후보 명단에 선정되셨습니다 — Cosmos Soft 풀스택 주니어(한국 근무)',
      en: "[FYI] You've been nominated — Full-stack Developer (Junior) at Cosmos Soft (Korea)",
    },
    desc: '코스모스소프트(K22) Full-stack Junior recommend 2차 (9/15, 한국어→영어 완화): 비공개 프레임 — 면접 영어 진행(한국어 우대)·영문 CV, 연 23~25M KRW. 컷=FS/BE/FE 직군 × 영어 시그널 × ≤3y. core=영어 인증×Java/Spring 215 / ext=나머지 영어 개발자 263. 1차(cosmos0911, 한국어 게이트 15명) 기수신 제외.',
    source: 'scripts/outreach/cosmos0915-recommend-coldmail.mjs',
    html: (lang) => recommendShell(lang, {
      intro: {
        vi: '<b>Cosmos Soft</b> — công ty IT Hàn Quốc chuyên SI/SM, xây dựng hệ thống TM, GA, CS, QA cho các công ty bảo hiểm dựa trên giải pháp CRM riêng — đang tuyển <b>Full-stack Developer (Junior)</b> <b>làm việc tại Hàn Quốc</b> qua FYI. Yêu cầu: Java/Spring, HTML/JS/React, SQL (Oracle, MySQL), quản lý version, hiểu biết cloud. <b>Phỏng vấn bằng tiếng Anh</b> (biết tiếng Hàn là lợi thế, không bắt buộc). Lương 23–25 triệu KRW/năm. Nộp CV bằng tiếng Anh.',
        ko: '한국 IT기업 <b>Cosmos Soft</b>(보험사 SI/SM, 자사 CRM 솔루션)가 FYI를 통해 <b>풀스택 주니어(한국 근무)</b>를 채용 중. Java/Spring+React+SQL, 면접 영어 진행(한국어 우대), 영문 CV, 연 23~25M KRW.',
        en: 'Cosmos Soft — Korean IT company (insurance SI/SM on its own CRM) — is hiring a Full-stack Developer (Junior) to work in Korea via FYI. Java/Spring, React, SQL; interview in English (Korean a plus); CV in English; 23–25M KRW/yr.',
      },
      initial: 'C', company: 'Cosmos Soft', title: 'Full-stack - Junior', meta: 'Onsite · Seoul, Hàn Quốc · 23–25 triệu KRW/năm', tail: BENEFIT_PRIVATE,
    }),
  },
  {
    match: /^cosmos0915-/,
    subject: {
      vi: '[FYI] Bạn được chọn vào danh sách đề cử gửi Cosmos Soft — Full-stack Developer (Junior), làm việc tại Hàn Quốc',
      ko: '[FYI] Cosmos Soft 추천 명단에 선정되셨습니다 — 풀스택 주니어(한국 근무)',
      en: "[FYI] You've been nominated to Cosmos Soft — Full-stack Developer (Junior), work in Korea",
    },
    desc: '코스모스소프트(K22) recommend 2차 (9/15, 영어 완화): 공개 프레임 — FYI 검토 선정·명단에 프로필 동봉·지원 시 우선 검토. 컷은 private 항목과 동일.',
    source: 'scripts/outreach/cosmos0915-recommend-coldmail.mjs',
    html: (lang) => recommendShell(lang, {
      intro: {
        vi: '<b>Cosmos Soft</b> — công ty IT Hàn Quốc chuyên SI/SM cho các công ty bảo hiểm — đang tuyển <b>Full-stack Developer (Junior)</b> làm việc tại Hàn Quốc qua FYI, <b>phỏng vấn bằng tiếng Anh</b>. Đội ngũ FYI đã xem xét toàn bộ hồ sơ và <b>chọn bạn vào danh sách đề cử</b> — hồ sơ công khai của bạn sẽ được gửi kèm danh sách cho nhà tuyển dụng trong tuần này.',
        ko: '한국 IT기업 <b>Cosmos Soft</b>의 풀스택 주니어(한국 근무, 영어 면접) 포지션 — FYI 팀이 이력서 전체를 검토해 회원님을 <b>추천 명단에 선정</b>했으며, 공개 프로필은 이번 주 명단과 함께 담당자에게 전달됩니다.',
        en: "Cosmos Soft Full-stack Developer (Junior, Korea, English interview) — the FYI team reviewed all profiles and <b>nominated you</b>; your public profile goes to the recruiter with this week's list.",
      },
      initial: 'C', company: 'Cosmos Soft', title: 'Full-stack - Junior', meta: 'Onsite · Seoul, Hàn Quốc · 23–25 triệu KRW/năm', tail: BENEFIT_PUBLIC,
    }),
  },
  {
    match: /^tv0915-.*-private/,
    subject: {
      vi: '[FYI] Bạn được chọn vào danh sách đề cử — Market & IT Business Research Intern tại TechValley',
      ko: '[FYI] 추천 후보 명단에 선정되셨습니다 — TechValley 리서치 인턴',
      en: "[FYI] You've been nominated — Market & IT Business Research Intern at TechValley",
    },
    desc: '테크밸리 리서치 인턴(V173) recommend (9/15 신규 게재): 비공개 프레임 — HN/HCMC 하이브리드(리모트 협의)·인턴 2개월·월 400만 동·영어 필수·영문 CV. 컷=인턴 연령대 × 영어 시그널 × HN/HCMC/미기재 × (경영/경제/IS 전공 or BA·리서치 직군) 코어 202명, 확장 미발송.',
    source: 'scripts/outreach/tv0915-recommend-coldmail.mjs',
    html: (lang) => recommendShell(lang, {
      intro: {
        vi: '<b>TechValley</b> — công ty công nghệ Hàn Quốc trong lĩnh vực IT & AI tại Việt Nam — đang tuyển <b>Market & IT Business Research Intern</b> (thực tập 2 tháng, Hà Nội / TP.HCM, Hybrid — có thể thỏa thuận remote) qua FYI. Công việc: nghiên cứu thị trường IT/AI, phân tích đối thủ, viết báo cáo & slide. Yêu cầu: tiếng Việt & tiếng Anh tốt, Excel & PowerPoint, ngành Quản trị Kinh doanh/Kinh tế/Hệ thống thông tin hoặc liên quan. Trợ cấp 4.000.000 ₫/tháng. Nộp CV bằng tiếng Anh.',
        ko: '한국계 IT·AI 기업 <b>TechValley</b>가 FYI를 통해 <b>Market & IT Business Research Intern</b>(2개월, HN/HCMC 하이브리드·리모트 협의)을 채용 중. IT/AI 시장 리서치·경쟁사 분석·보고서 작성, 영어 필수·영문 CV, 경영/경제/정보시스템 계열, 월 400만 동.',
        en: 'TechValley — Korean IT & AI company in Vietnam — is hiring a Market & IT Business Research Intern (2 months, Hanoi/HCMC, hybrid/remote negotiable) via FYI. Market research, competitor analysis, report writing; English required, CV in English; Business/Economics/IS majors; 4M VND/month.',
      },
      initial: 'T', company: 'TechValley', title: 'Market & IT Business Research Intern', meta: 'Hybrid · Hà Nội / TP.HCM · Thực tập 2 tháng · 4tr ₫/tháng', tail: BENEFIT_PRIVATE,
    }),
  },
  {
    match: /^tv0915-/,
    subject: {
      vi: '[FYI] Bạn được chọn vào danh sách đề cử gửi TechValley — Market & IT Business Research Intern',
      ko: '[FYI] TechValley 추천 명단에 선정되셨습니다 — 리서치 인턴',
      en: "[FYI] You've been nominated to TechValley — Market & IT Business Research Intern",
    },
    desc: '테크밸리 리서치 인턴(V173) recommend (9/15): 공개 프레임 — FYI 검토 선정·명단에 프로필 동봉·지원 시 우선 검토. 컷은 private 항목과 동일.',
    source: 'scripts/outreach/tv0915-recommend-coldmail.mjs',
    html: (lang) => recommendShell(lang, {
      intro: {
        vi: '<b>TechValley</b> — công ty công nghệ Hàn Quốc trong lĩnh vực IT & AI — đang tuyển <b>Market & IT Business Research Intern</b> (2 tháng, Hà Nội / TP.HCM, Hybrid) qua FYI. Đội ngũ FYI đã xem xét toàn bộ hồ sơ và <b>chọn bạn vào danh sách đề cử</b> — hồ sơ công khai của bạn sẽ được gửi kèm danh sách cho nhà tuyển dụng trong tuần này.',
        ko: '한국계 IT·AI 기업 <b>TechValley</b>의 리서치 인턴(2개월, HN/HCMC 하이브리드) 포지션 — FYI 팀이 이력서 전체를 검토해 회원님을 <b>추천 명단에 선정</b>했으며, 공개 프로필은 이번 주 명단과 함께 담당자에게 전달됩니다.',
        en: "TechValley Market & IT Business Research Intern (2 months, Hanoi/HCMC, hybrid) — the FYI team reviewed all profiles and <b>nominated you</b>; your public profile goes to the recruiter with this week's list.",
      },
      initial: 'T', company: 'TechValley', title: 'Market & IT Business Research Intern', meta: 'Hybrid · Hà Nội / TP.HCM · Thực tập 2 tháng · 4tr ₫/tháng', tail: BENEFIT_PUBLIC,
    }),
  },
  {
    match: /^nalda0915-.*-private/,
    subject: {
      vi: '[FYI] Bạn được chọn vào danh sách đề cử — UI/UX Intern tại NALDA',
      ko: '[FYI] 추천 후보 명단에 선정되셨습니다 — NALDA UI/UX 인턴',
      en: "[FYI] You've been nominated — UI/UX Intern at NALDA",
    },
    desc: 'NALDA UI/UX 인턴(R201) recommend (9/15 신규 게재, Len 게재→호현님 소싱 요청): 비공개 프레임 — 다낭(리모트 가능)·인턴·월 300~400만 동·Figma 필수·포트폴리오 필수. 컷=Design 직군 코어(poolEstimator 코어 228과 동일), 경력 컷 없음·확장 미발송(유저 "코어만" 지시).',
    source: 'scripts/outreach/nalda0915-recommend-coldmail.mjs',
    html: (lang) => recommendShell(lang, {
      intro: {
        vi: '<b>NALDA</b> — công ty công nghệ Hàn Quốc vận hành ứng dụng quản lý thời gian <b>Timing</b> — đang tuyển <b>UI/UX Intern</b> (Đà Nẵng, có thể remote) qua FYI. Công việc: thiết kế UI/UX cho web/app, UI & prototype bằng Figma, responsive mobile/tablet/PC, cải thiện usability. Yêu cầu: dùng được Figma, năng lực UI/UX cơ bản, nộp kèm portfolio. Trợ cấp 3–4 triệu ₫/tháng.',
        ko: '시간관리 앱 Timing을 운영하는 한국 테크기업 <b>NALDA</b>가 FYI를 통해 <b>UI/UX 인턴</b>(다낭, 리모트 가능)을 채용 중. web/app UI/UX 설계·Figma 프로토타입·반응형 화면·usability 개선, Figma 필수·포트폴리오 필수, 월 300~400만 동.',
        en: 'NALDA — Korean tech company behind the time-management app Timing — is hiring a UI/UX Intern (Da Nang, remote OK) via FYI. Web/app UI/UX, Figma prototyping, responsive screens, usability; Figma and portfolio required; 3–4M VND/month.',
      },
      initial: 'N', company: 'NALDA', title: 'UI/UX Intern', meta: 'Đà Nẵng · Có thể remote · Thực tập · 3–4tr ₫/tháng', tail: BENEFIT_PRIVATE,
    }),
  },
  {
    match: /^nalda0915-/,
    subject: {
      vi: '[FYI] Bạn được chọn vào danh sách đề cử gửi NALDA — UI/UX Intern',
      ko: '[FYI] NALDA 추천 명단에 선정되셨습니다 — UI/UX 인턴',
      en: "[FYI] You've been nominated to NALDA — UI/UX Intern",
    },
    desc: 'NALDA UI/UX 인턴(R201) recommend (9/15): 공개 프레임 — FYI 검토 선정·명단에 프로필 동봉·지원 시 우선 검토. 컷은 private 항목과 동일.',
    source: 'scripts/outreach/nalda0915-recommend-coldmail.mjs',
    html: (lang) => recommendShell(lang, {
      intro: {
        vi: '<b>NALDA</b> — công ty công nghệ Hàn Quốc vận hành ứng dụng quản lý thời gian <b>Timing</b> — đang tuyển <b>UI/UX Intern</b> (Đà Nẵng, có thể remote) qua FYI. Đội ngũ FYI đã xem xét toàn bộ hồ sơ và <b>chọn bạn vào danh sách đề cử</b> — hồ sơ công khai của bạn sẽ được gửi kèm danh sách cho nhà tuyển dụng trong tuần này.',
        ko: '시간관리 앱 Timing을 운영하는 한국 테크기업 <b>NALDA</b>의 UI/UX 인턴(다낭, 리모트 가능) 포지션 — FYI 팀이 이력서 전체를 검토해 회원님을 <b>추천 명단에 선정</b>했으며, 공개 프로필은 이번 주 명단과 함께 담당자에게 전달됩니다.',
        en: "NALDA UI/UX Intern (Da Nang, remote OK) — the FYI team reviewed all profiles and <b>nominated you</b>; your public profile goes to the recruiter with this week's list.",
      },
      initial: 'N', company: 'NALDA', title: 'UI/UX Intern', meta: 'Đà Nẵng · Có thể remote · Thực tập · 3–4tr ₫/tháng', tail: BENEFIT_PUBLIC,
    }),
  },
  {
    match: /^nalda0916-.*-private/,
    subject: {
      vi: '[FYI] Bạn được chọn vào danh sách đề cử — Full-stack Developer Intern tại NALDA',
      ko: '[FYI] 추천 후보 명단에 선정되셨습니다 — NALDA 풀스택 개발 인턴',
      en: "[FYI] You've been nominated — Full-stack Developer Intern at NALDA",
    },
    desc: 'NALDA 풀스택 개발 인턴(R199) recommend (9/16 재게재, Len 재발송 요청): 비공개 프레임 — HCM/HN/ĐN·onsite·인턴·월 300~400만 동·React/TypeScript 필수·Firebase 경험·Git. 컷=개발 직군(Fullstack/Frontend/Backend) + 이력서 React&TS + 경력 12개월 미만(실측 220명). Firebase는 인턴 풀에 13.6%뿐이라 게이트에서 빼고 정렬 가점으로만 사용(유저 지시 "인턴급으로").',
    source: 'scripts/outreach/nalda0916-recommend-coldmail.mjs',
    html: (lang) => recommendShell(lang, {
      intro: {
        vi: '<b>NALDA</b> — công ty công nghệ Hàn Quốc vận hành ứng dụng quản lý thời gian <b>Timing</b> — đang tuyển <b>Full-stack Developer Intern</b> (TP.HCM / Hà Nội / Đà Nẵng) qua FYI. Công việc: phát triển tính năng mới, refactoring, tối ưu hiệu năng và bộ nhớ, xử lý bug. Yêu cầu: thành thạo React, TypeScript, có kinh nghiệm Firebase, dùng thành thạo Git. Ưu tiên: Swift/Kotlin, web app, native app dựa trên webview. Trợ cấp 3–4 triệu ₫/tháng.',
        ko: '시간관리 앱 Timing을 운영하는 한국 테크기업 <b>NALDA</b>가 FYI를 통해 <b>풀스택 개발 인턴</b>(HCM/하노이/다낭)을 채용 중. 신규 기능 개발·리팩토링·메모리 최적화·버그 대응, React/TypeScript 필수·Firebase 경험·Git, 월 300~400만 동.',
        en: 'NALDA — Korean tech company behind the time-management app Timing — is hiring a Full-stack Developer Intern (HCMC/Hanoi/Da Nang) via FYI. New features, refactoring, memory optimization, bug fixing; React/TypeScript required, Firebase experience, Git; 3–4M VND/month.',
      },
      initial: 'N', company: 'NALDA', title: 'Full-stack Developer Intern', meta: 'TP.HCM · Hà Nội · Đà Nẵng · Thực tập · 3–4tr ₫/tháng', tail: BENEFIT_PRIVATE,
    }),
  },
  {
    match: /^nalda0916-/,
    subject: {
      vi: '[FYI] Bạn được chọn vào danh sách đề cử gửi NALDA — Full-stack Developer Intern',
      ko: '[FYI] NALDA 추천 명단에 선정되셨습니다 — 풀스택 개발 인턴',
      en: "[FYI] You've been nominated to NALDA — Full-stack Developer Intern",
    },
    desc: 'NALDA 풀스택 개발 인턴(R199) recommend (9/16): 공개 프레임 — FYI 검토 선정·명단에 프로필 동봉·지원 시 우선 검토. 컷은 private 항목과 동일.',
    source: 'scripts/outreach/nalda0916-recommend-coldmail.mjs',
    html: (lang) => recommendShell(lang, {
      intro: {
        vi: '<b>NALDA</b> — công ty công nghệ Hàn Quốc vận hành ứng dụng quản lý thời gian <b>Timing</b> — đang tuyển <b>Full-stack Developer Intern</b> (TP.HCM / Hà Nội / Đà Nẵng) qua FYI. Đội ngũ FYI đã xem xét toàn bộ hồ sơ và <b>chọn bạn vào danh sách đề cử</b> — hồ sơ công khai của bạn sẽ được gửi kèm danh sách cho nhà tuyển dụng trong tuần này.',
        ko: '시간관리 앱 Timing을 운영하는 한국 테크기업 <b>NALDA</b>의 풀스택 개발 인턴(HCM/하노이/다낭) 포지션 — FYI 팀이 이력서 전체를 검토해 회원님을 <b>추천 명단에 선정</b>했으며, 공개 프로필은 이번 주 명단과 함께 담당자에게 전달됩니다.',
        en: "NALDA Full-stack Developer Intern (HCMC/Hanoi/Da Nang) — the FYI team reviewed all profiles and <b>nominated you</b>; your public profile goes to the recruiter with this week's list.",
      },
      initial: 'N', company: 'NALDA', title: 'Full-stack Developer Intern', meta: 'TP.HCM · Hà Nội · Đà Nẵng · Thực tập · 3–4tr ₫/tháng', tail: BENEFIT_PUBLIC,
    }),
  },
  {
    match: /^nexon0916-recommend-rig-.*private/,
    subject: {
      vi: '[FYI] Bạn được chọn vào danh sách đề cử — 3D Rigger tại NEXON DEV VINA',
      ko: '[FYI] 추천 후보 명단에 선정되셨습니다 — NEXON DEV VINA 3D 리거',
      en: "[FYI] You've been nominated — 3D Rigger at NEXON DEV VINA",
    },
    desc: 'NEXON DEV VINA 3D 리거(V179) recommend (9/16 재게시, KTC 라인 Slack 게시 당일 소싱): 비공개 프레임 — TP.HCM 온사이트·포트폴리오 필수·연차/급여 미기재. 컷=rigging·skinning 명시 또는 Maya/3ds Max+캐릭터 애니메이션. 5공고 1인1통 캐스케이드(rig→pix→env→cpt→ua), 해외 거주자 제외.',
    source: 'scripts/outreach/nexon0916-recommend-coldmail.mjs',
    html: (lang) => recommendShell(lang, {
      intro: {
        vi: '<b>NEXON DEV VINA</b> — thành viên Nexon Group (MapleStory, KartRider, Blue Archive, DAVE THE DIVER…) — đang tuyển <b>3D Rigger</b> (TP.HCM, làm việc tại văn phòng) qua FYI. Công việc & yêu cầu: rigging & skinning trên 3ds Max/Maya, IK retargeting & simulation trên Unreal Engine, chuẩn asset character AAA. Bắt buộc nộp kèm Portfolio.',
        ko: '넥슨 그룹 계열 <b>NEXON DEV VINA</b>가 FYI를 통해 <b>3D 리거</b>(호치민 온사이트)를 채용 중. 포트폴리오 필수.',
        en: 'NEXON DEV VINA (Nexon Group) is hiring a 3D Rigger (HCMC, onsite) via FYI. Portfolio required.',
      },
      initial: 'N', company: 'NEXON DEV VINA', title: '3D Rigger', meta: 'TP.HCM · Làm việc tại văn phòng · Bắt buộc nộp Portfolio', tail: BENEFIT_PRIVATE,
    }),
  },
  {
    match: /^nexon0916-recommend-rig-/,
    subject: {
      vi: '[FYI] Bạn được chọn vào danh sách đề cử gửi NEXON DEV VINA — 3D Rigger',
      ko: '[FYI] NEXON DEV VINA 추천 명단에 선정되셨습니다 — 3D 리거',
      en: "[FYI] You've been nominated to NEXON DEV VINA — 3D Rigger",
    },
    desc: 'NEXON DEV VINA 3D 리거(V179) recommend (9/16 재게시, KTC 라인 Slack 게시 당일 소싱): 공개 프레임 — FYI 검토 선정·명단에 프로필 동봉·지원 시 우선 검토. 컷은 private 항목과 동일.',
    source: 'scripts/outreach/nexon0916-recommend-coldmail.mjs',
    html: (lang) => recommendShell(lang, {
      intro: {
        vi: '<b>NEXON DEV VINA</b> — thành viên Nexon Group (MapleStory, KartRider, Blue Archive, DAVE THE DIVER…) — đang tuyển <b>3D Rigger</b> (TP.HCM, làm việc tại văn phòng) qua FYI. Đội ngũ FYI đã xem xét toàn bộ hồ sơ và <b>chọn bạn vào danh sách đề cử</b> — hồ sơ công khai của bạn sẽ được gửi kèm danh sách cho nhà tuyển dụng trong tuần này.',
        ko: 'NEXON DEV VINA 3D 리거 — FYI 팀이 이력서 전체를 검토해 회원님을 <b>추천 명단에 선정</b>했으며, 공개 프로필은 이번 주 명단과 함께 담당자에게 전달됩니다.',
        en: "NEXON DEV VINA 3D Rigger — the FYI team reviewed all profiles and <b>nominated you</b>; your public profile goes to the recruiter with this week's list.",
      },
      initial: 'N', company: 'NEXON DEV VINA', title: '3D Rigger', meta: 'TP.HCM · Làm việc tại văn phòng · Bắt buộc nộp Portfolio', tail: BENEFIT_PUBLIC,
    }),
  },
  {
    match: /^nexon0916-recommend-pix-.*private/,
    subject: {
      vi: '[FYI] Bạn được chọn vào danh sách đề cử — 2D Pixel Artist (Background/ Character/ Monster) tại NEXON DEV VINA',
      ko: '[FYI] 추천 후보 명단에 선정되셨습니다 — NEXON DEV VINA 2D 픽셀 아티스트',
      en: "[FYI] You've been nominated — 2D Pixel Artist (Background/ Character/ Monster) at NEXON DEV VINA",
    },
    desc: 'NEXON DEV VINA 2D 픽셀 아티스트(V180) recommend (9/16 재게시, KTC 라인 Slack 게시 당일 소싱): 비공개 프레임 — TP.HCM 온사이트·포트폴리오 필수·연차/급여 미기재. 컷=pixel art·Aseprite·Pro Motion·sprite·Spine·game art. 5공고 1인1통 캐스케이드(rig→pix→env→cpt→ua), 해외 거주자 제외.',
    source: 'scripts/outreach/nexon0916-recommend-coldmail.mjs',
    html: (lang) => recommendShell(lang, {
      intro: {
        vi: '<b>NEXON DEV VINA</b> — thành viên Nexon Group (MapleStory, KartRider, Blue Archive, DAVE THE DIVER…) — đang tuyển <b>2D Pixel Artist (Background/ Character/ Monster)</b> (TP.HCM, làm việc tại văn phòng) qua FYI. Công việc & yêu cầu: pixel sprite & animation cho character/background/monster/item, Photoshop/Pro Motion; ưu tiên pixel art trong game, Unity, 2D Spine. Bắt buộc nộp kèm Portfolio.',
        ko: '넥슨 그룹 계열 <b>NEXON DEV VINA</b>가 FYI를 통해 <b>2D 픽셀 아티스트</b>(호치민 온사이트)를 채용 중. 포트폴리오 필수.',
        en: 'NEXON DEV VINA (Nexon Group) is hiring a 2D Pixel Artist (Background/ Character/ Monster) (HCMC, onsite) via FYI. Portfolio required.',
      },
      initial: 'N', company: 'NEXON DEV VINA', title: '2D Pixel Artist (Background/ Character/ Monster)', meta: 'TP.HCM · Làm việc tại văn phòng · Bắt buộc nộp Portfolio', tail: BENEFIT_PRIVATE,
    }),
  },
  {
    match: /^nexon0916-recommend-pix-/,
    subject: {
      vi: '[FYI] Bạn được chọn vào danh sách đề cử gửi NEXON DEV VINA — 2D Pixel Artist (Background/ Character/ Monster)',
      ko: '[FYI] NEXON DEV VINA 추천 명단에 선정되셨습니다 — 2D 픽셀 아티스트',
      en: "[FYI] You've been nominated to NEXON DEV VINA — 2D Pixel Artist (Background/ Character/ Monster)",
    },
    desc: 'NEXON DEV VINA 2D 픽셀 아티스트(V180) recommend (9/16 재게시, KTC 라인 Slack 게시 당일 소싱): 공개 프레임 — FYI 검토 선정·명단에 프로필 동봉·지원 시 우선 검토. 컷은 private 항목과 동일.',
    source: 'scripts/outreach/nexon0916-recommend-coldmail.mjs',
    html: (lang) => recommendShell(lang, {
      intro: {
        vi: '<b>NEXON DEV VINA</b> — thành viên Nexon Group (MapleStory, KartRider, Blue Archive, DAVE THE DIVER…) — đang tuyển <b>2D Pixel Artist (Background/ Character/ Monster)</b> (TP.HCM, làm việc tại văn phòng) qua FYI. Đội ngũ FYI đã xem xét toàn bộ hồ sơ và <b>chọn bạn vào danh sách đề cử</b> — hồ sơ công khai của bạn sẽ được gửi kèm danh sách cho nhà tuyển dụng trong tuần này.',
        ko: 'NEXON DEV VINA 2D 픽셀 아티스트 — FYI 팀이 이력서 전체를 검토해 회원님을 <b>추천 명단에 선정</b>했으며, 공개 프로필은 이번 주 명단과 함께 담당자에게 전달됩니다.',
        en: "NEXON DEV VINA 2D Pixel Artist (Background/ Character/ Monster) — the FYI team reviewed all profiles and <b>nominated you</b>; your public profile goes to the recruiter with this week's list.",
      },
      initial: 'N', company: 'NEXON DEV VINA', title: '2D Pixel Artist (Background/ Character/ Monster)', meta: 'TP.HCM · Làm việc tại văn phòng · Bắt buộc nộp Portfolio', tail: BENEFIT_PUBLIC,
    }),
  },
  {
    match: /^nexon0916-recommend-env-.*private/,
    subject: {
      vi: '[FYI] Bạn được chọn vào danh sách đề cử — 3D Environment Modeler tại NEXON DEV VINA',
      ko: '[FYI] 추천 후보 명단에 선정되셨습니다 — NEXON DEV VINA 3D 환경 모델러',
      en: "[FYI] You've been nominated — 3D Environment Modeler at NEXON DEV VINA",
    },
    desc: 'NEXON DEV VINA 3D 환경 모델러(V178) recommend (9/16 재게시, KTC 라인 Slack 게시 당일 소싱): 비공개 프레임 — TP.HCM 온사이트·포트폴리오 필수·연차/급여 미기재. 컷=Maya·3ds Max·ZBrush·Substance + 게임/환경/모델링 문맥(건축·인테리어 제외). 5공고 1인1통 캐스케이드(rig→pix→env→cpt→ua), 해외 거주자 제외.',
    source: 'scripts/outreach/nexon0916-recommend-coldmail.mjs',
    html: (lang) => recommendShell(lang, {
      intro: {
        vi: '<b>NEXON DEV VINA</b> — thành viên Nexon Group (MapleStory, KartRider, Blue Archive, DAVE THE DIVER…) — đang tuyển <b>3D Environment Modeler</b> (TP.HCM, làm việc tại văn phòng) qua FYI. Công việc & yêu cầu: modeling background/môi trường & asset 3D, level/scene & lighting trong engine, Maya/3Ds Max/ZBrush/Substance Painter; ưu tiên Unity/Unreal. Bắt buộc nộp kèm Portfolio.',
        ko: '넥슨 그룹 계열 <b>NEXON DEV VINA</b>가 FYI를 통해 <b>3D 환경 모델러</b>(호치민 온사이트)를 채용 중. 포트폴리오 필수.',
        en: 'NEXON DEV VINA (Nexon Group) is hiring a 3D Environment Modeler (HCMC, onsite) via FYI. Portfolio required.',
      },
      initial: 'N', company: 'NEXON DEV VINA', title: '3D Environment Modeler', meta: 'TP.HCM · Làm việc tại văn phòng · Bắt buộc nộp Portfolio', tail: BENEFIT_PRIVATE,
    }),
  },
  {
    match: /^nexon0916-recommend-env-/,
    subject: {
      vi: '[FYI] Bạn được chọn vào danh sách đề cử gửi NEXON DEV VINA — 3D Environment Modeler',
      ko: '[FYI] NEXON DEV VINA 추천 명단에 선정되셨습니다 — 3D 환경 모델러',
      en: "[FYI] You've been nominated to NEXON DEV VINA — 3D Environment Modeler",
    },
    desc: 'NEXON DEV VINA 3D 환경 모델러(V178) recommend (9/16 재게시, KTC 라인 Slack 게시 당일 소싱): 공개 프레임 — FYI 검토 선정·명단에 프로필 동봉·지원 시 우선 검토. 컷은 private 항목과 동일.',
    source: 'scripts/outreach/nexon0916-recommend-coldmail.mjs',
    html: (lang) => recommendShell(lang, {
      intro: {
        vi: '<b>NEXON DEV VINA</b> — thành viên Nexon Group (MapleStory, KartRider, Blue Archive, DAVE THE DIVER…) — đang tuyển <b>3D Environment Modeler</b> (TP.HCM, làm việc tại văn phòng) qua FYI. Đội ngũ FYI đã xem xét toàn bộ hồ sơ và <b>chọn bạn vào danh sách đề cử</b> — hồ sơ công khai của bạn sẽ được gửi kèm danh sách cho nhà tuyển dụng trong tuần này.',
        ko: 'NEXON DEV VINA 3D 환경 모델러 — FYI 팀이 이력서 전체를 검토해 회원님을 <b>추천 명단에 선정</b>했으며, 공개 프로필은 이번 주 명단과 함께 담당자에게 전달됩니다.',
        en: "NEXON DEV VINA 3D Environment Modeler — the FYI team reviewed all profiles and <b>nominated you</b>; your public profile goes to the recruiter with this week's list.",
      },
      initial: 'N', company: 'NEXON DEV VINA', title: '3D Environment Modeler', meta: 'TP.HCM · Làm việc tại văn phòng · Bắt buộc nộp Portfolio', tail: BENEFIT_PUBLIC,
    }),
  },
  {
    match: /^nexon0916-recommend-cpt-.*private/,
    subject: {
      vi: '[FYI] Bạn được chọn vào danh sách đề cử — Concept Artist tại NEXON DEV VINA',
      ko: '[FYI] 추천 후보 명단에 선정되셨습니다 — NEXON DEV VINA 컨셉 아티스트',
      en: "[FYI] You've been nominated — Concept Artist at NEXON DEV VINA",
    },
    desc: 'NEXON DEV VINA 컨셉 아티스트(V182) recommend (9/16 재게시, KTC 라인 Slack 게시 당일 소싱): 비공개 프레임 — TP.HCM 온사이트·포트폴리오 필수·연차/급여 미기재. 컷=concept art·character design·digital painting·illustration·2D/game artist (Adobe Illustrator 툴명 오탐 제외). 5공고 1인1통 캐스케이드(rig→pix→env→cpt→ua), 해외 거주자 제외.',
    source: 'scripts/outreach/nexon0916-recommend-coldmail.mjs',
    html: (lang) => recommendShell(lang, {
      intro: {
        vi: '<b>NEXON DEV VINA</b> — thành viên Nexon Group (MapleStory, KartRider, Blue Archive, DAVE THE DIVER…) — đang tuyển <b>Concept Artist</b> (TP.HCM, làm việc tại văn phòng) qua FYI. Công việc & yêu cầu: concept character/costume/monster/NPC & background cho Mabinogi Mobile, vẽ concept 3 mặt cho dựng 3D, drawing/painting, Photoshop; ưu tiên MMORPG. Bắt buộc nộp kèm Portfolio.',
        ko: '넥슨 그룹 계열 <b>NEXON DEV VINA</b>가 FYI를 통해 <b>컨셉 아티스트</b>(호치민 온사이트)를 채용 중. 포트폴리오 필수.',
        en: 'NEXON DEV VINA (Nexon Group) is hiring a Concept Artist (HCMC, onsite) via FYI. Portfolio required.',
      },
      initial: 'N', company: 'NEXON DEV VINA', title: 'Concept Artist', meta: 'TP.HCM · Làm việc tại văn phòng · Bắt buộc nộp Portfolio', tail: BENEFIT_PRIVATE,
    }),
  },
  {
    match: /^nexon0916-recommend-cpt-/,
    subject: {
      vi: '[FYI] Bạn được chọn vào danh sách đề cử gửi NEXON DEV VINA — Concept Artist',
      ko: '[FYI] NEXON DEV VINA 추천 명단에 선정되셨습니다 — 컨셉 아티스트',
      en: "[FYI] You've been nominated to NEXON DEV VINA — Concept Artist",
    },
    desc: 'NEXON DEV VINA 컨셉 아티스트(V182) recommend (9/16 재게시, KTC 라인 Slack 게시 당일 소싱): 공개 프레임 — FYI 검토 선정·명단에 프로필 동봉·지원 시 우선 검토. 컷은 private 항목과 동일.',
    source: 'scripts/outreach/nexon0916-recommend-coldmail.mjs',
    html: (lang) => recommendShell(lang, {
      intro: {
        vi: '<b>NEXON DEV VINA</b> — thành viên Nexon Group (MapleStory, KartRider, Blue Archive, DAVE THE DIVER…) — đang tuyển <b>Concept Artist</b> (TP.HCM, làm việc tại văn phòng) qua FYI. Đội ngũ FYI đã xem xét toàn bộ hồ sơ và <b>chọn bạn vào danh sách đề cử</b> — hồ sơ công khai của bạn sẽ được gửi kèm danh sách cho nhà tuyển dụng trong tuần này.',
        ko: 'NEXON DEV VINA 컨셉 아티스트 — FYI 팀이 이력서 전체를 검토해 회원님을 <b>추천 명단에 선정</b>했으며, 공개 프로필은 이번 주 명단과 함께 담당자에게 전달됩니다.',
        en: "NEXON DEV VINA Concept Artist — the FYI team reviewed all profiles and <b>nominated you</b>; your public profile goes to the recruiter with this week's list.",
      },
      initial: 'N', company: 'NEXON DEV VINA', title: 'Concept Artist', meta: 'TP.HCM · Làm việc tại văn phòng · Bắt buộc nộp Portfolio', tail: BENEFIT_PUBLIC,
    }),
  },
  {
    match: /^nexon0916-recommend-ua-.*private/,
    subject: {
      vi: '[FYI] Bạn được chọn vào danh sách đề cử — UA Media Creator tại NEXON DEV VINA',
      ko: '[FYI] 추천 후보 명단에 선정되셨습니다 — NEXON DEV VINA UA 미디어 크리에이터',
      en: "[FYI] You've been nominated — UA Media Creator at NEXON DEV VINA",
    },
    desc: 'NEXON DEV VINA UA 미디어 크리에이터(V181) recommend (9/16 재게시, KTC 라인 Slack 게시 당일 소싱): 비공개 프레임 — TP.HCM 온사이트·포트폴리오 필수·연차/급여 미기재. 컷=After Effects/Premiere + 영상·모션 문맥. 5공고 1인1통 캐스케이드(rig→pix→env→cpt→ua), 해외 거주자 제외.',
    source: 'scripts/outreach/nexon0916-recommend-coldmail.mjs',
    html: (lang) => recommendShell(lang, {
      intro: {
        vi: '<b>NEXON DEV VINA</b> — thành viên Nexon Group (MapleStory, KartRider, Blue Archive, DAVE THE DIVER…) — đang tuyển <b>UA Media Creator</b> (TP.HCM, làm việc tại văn phòng) qua FYI. Công việc & yêu cầu: sản xuất & biên tập video quảng cáo game cho UA marketing, After Effects/Premiere Pro & Photoshop/Illustrator; ưu tiên agency quảng cáo, UA, game toàn cầu. Bắt buộc nộp kèm Portfolio.',
        ko: '넥슨 그룹 계열 <b>NEXON DEV VINA</b>가 FYI를 통해 <b>UA 미디어 크리에이터</b>(호치민 온사이트)를 채용 중. 포트폴리오 필수.',
        en: 'NEXON DEV VINA (Nexon Group) is hiring a UA Media Creator (HCMC, onsite) via FYI. Portfolio required.',
      },
      initial: 'N', company: 'NEXON DEV VINA', title: 'UA Media Creator', meta: 'TP.HCM · Làm việc tại văn phòng · Bắt buộc nộp Portfolio', tail: BENEFIT_PRIVATE,
    }),
  },
  {
    match: /^nexon0916-recommend-ua-/,
    subject: {
      vi: '[FYI] Bạn được chọn vào danh sách đề cử gửi NEXON DEV VINA — UA Media Creator',
      ko: '[FYI] NEXON DEV VINA 추천 명단에 선정되셨습니다 — UA 미디어 크리에이터',
      en: "[FYI] You've been nominated to NEXON DEV VINA — UA Media Creator",
    },
    desc: 'NEXON DEV VINA UA 미디어 크리에이터(V181) recommend (9/16 재게시, KTC 라인 Slack 게시 당일 소싱): 공개 프레임 — FYI 검토 선정·명단에 프로필 동봉·지원 시 우선 검토. 컷은 private 항목과 동일.',
    source: 'scripts/outreach/nexon0916-recommend-coldmail.mjs',
    html: (lang) => recommendShell(lang, {
      intro: {
        vi: '<b>NEXON DEV VINA</b> — thành viên Nexon Group (MapleStory, KartRider, Blue Archive, DAVE THE DIVER…) — đang tuyển <b>UA Media Creator</b> (TP.HCM, làm việc tại văn phòng) qua FYI. Đội ngũ FYI đã xem xét toàn bộ hồ sơ và <b>chọn bạn vào danh sách đề cử</b> — hồ sơ công khai của bạn sẽ được gửi kèm danh sách cho nhà tuyển dụng trong tuần này.',
        ko: 'NEXON DEV VINA UA 미디어 크리에이터 — FYI 팀이 이력서 전체를 검토해 회원님을 <b>추천 명단에 선정</b>했으며, 공개 프로필은 이번 주 명단과 함께 담당자에게 전달됩니다.',
        en: "NEXON DEV VINA UA Media Creator — the FYI team reviewed all profiles and <b>nominated you</b>; your public profile goes to the recruiter with this week's list.",
      },
      initial: 'N', company: 'NEXON DEV VINA', title: 'UA Media Creator', meta: 'TP.HCM · Làm việc tại văn phòng · Bắt buộc nộp Portfolio', tail: BENEFIT_PUBLIC,
    }),
  },
  {
    match: /^wiseedu0916-.*-private/,
    subject: {
      vi: '[FYI] Bạn được chọn vào danh sách đề cử — Admin Manager (tiếng Hàn) tại Wise Edu',
      ko: '[FYI] 추천 후보 명단에 선정되셨습니다 — Wise Edu 행정 매니저(한국어)',
      en: "[FYI] You've been nominated — Admin Manager (Korean) at Wise Edu",
    },
    desc: 'Wise Edu 행정 매니저(V171) recommend (9/16, 지원 0 공고 전수진단 후 발송): 비공개 프레임 — 꽝7 푸미흥 온사이트·월~금 14-21시·18-26M·TOPIK 6 동급·40세 이하·4년제·Excel 중급. 컷=한국어 인증 상급(TOPIK 5·6) 22 + TOPIK 4·한국어 전공 35 × HCMC권·미기재.',
    source: 'scripts/outreach/wiseedu0916-recommend-coldmail.mjs',
    html: (lang) => recommendShell(lang, {
      intro: {
        vi: '<b>Wise Edu</b> — trung tâm giáo dục Hàn Quốc tại Phú Mỹ Hưng (Quận 7, TP.HCM) — đang tuyển <b>Admin Manager (tiếng Hàn)</b> qua FYI. Công việc: quản lý lịch xe đưa đón học sinh bằng Excel, trao đổi với phụ huynh & giáo viên người Hàn, chấm bài Toán theo đáp án (không giảng dạy), hỗ trợ hành chính. Yêu cầu: TOPIK 6 hoặc tương đương, tốt nghiệp/sắp tốt nghiệp ĐH hệ 4 năm, ≤40 tuổi, Excel trung cấp. T2–T6 14:00–21:00, lương 18–26 triệu ₫, đầy đủ BHXH. CV tiếng Việt hoặc tiếng Hàn.',
        ko: '꽝7 푸미흥의 한국계 교육센터 <b>Wise Edu</b>가 FYI를 통해 <b>행정 매니저(한국어)</b>를 채용 중. 셔틀 스케줄 관리(Excel)·학부모/한국인 교사 소통·수학 채점(비강의)·행정 지원, TOPIK 6 동급·40세 이하·4년제·Excel 중급, 월~금 14-21시, 월 1,800만~2,600만 동.',
        en: 'Wise Edu — Korean education center in Phu My Hung (D7, HCMC) — is hiring an Admin Manager (Korean) via FYI. Shuttle scheduling in Excel, communication with Korean parents/teachers, math grading (no teaching), admin support; TOPIK 6 or equivalent, ≤40, 4-year degree, intermediate Excel; Mon–Fri 2–9pm; 18–26M VND.',
      },
      initial: 'W', company: 'Wise Edu', title: 'Admin manager - Tiếng Hàn', meta: 'Onsite · Phú Mỹ Hưng, Q.7, TP.HCM · 18–26tr ₫/tháng · T2–T6 14:00–21:00', tail: BENEFIT_PRIVATE,
    }),
  },
  {
    match: /^wiseedu0916-/,
    subject: {
      vi: '[FYI] Bạn được chọn vào danh sách đề cử gửi Wise Edu — Admin Manager (tiếng Hàn)',
      ko: '[FYI] Wise Edu 추천 명단에 선정되셨습니다 — 행정 매니저(한국어)',
      en: "[FYI] You've been nominated to Wise Edu — Admin Manager (Korean)",
    },
    desc: 'Wise Edu 행정 매니저(V171) recommend (9/16): 공개 프레임 — FYI 검토 선정·명단에 프로필 동봉·지원 시 우선 검토. 컷은 private 항목과 동일.',
    source: 'scripts/outreach/wiseedu0916-recommend-coldmail.mjs',
    html: (lang) => recommendShell(lang, {
      intro: {
        vi: '<b>Wise Edu</b> — trung tâm giáo dục Hàn Quốc tại Phú Mỹ Hưng (Quận 7, TP.HCM) — đang tuyển <b>Admin Manager (tiếng Hàn)</b> qua FYI. Đội ngũ FYI đã xem xét toàn bộ hồ sơ và <b>chọn bạn vào danh sách đề cử</b> — hồ sơ công khai của bạn sẽ được gửi kèm danh sách cho nhà tuyển dụng trong tuần này.',
        ko: '꽝7 푸미흥의 한국계 교육센터 <b>Wise Edu</b>의 행정 매니저(한국어) 포지션 — FYI 팀이 이력서 전체를 검토해 회원님을 <b>추천 명단에 선정</b>했으며, 공개 프로필은 이번 주 명단과 함께 담당자에게 전달됩니다.',
        en: "Wise Edu Admin Manager (Korean, D7 HCMC) — the FYI team reviewed all profiles and <b>nominated you</b>; your public profile goes to the recruiter with this week's list.",
      },
      initial: 'W', company: 'Wise Edu', title: 'Admin manager - Tiếng Hàn', meta: 'Onsite · Phú Mỹ Hưng, Q.7, TP.HCM · 18–26tr ₫/tháng · T2–T6 14:00–21:00', tail: BENEFIT_PUBLIC,
    }),
  },
  {
    match: /^youlchon0916-.*-private/,
    subject: {
      vi: '[FYI] Bạn được chọn vào danh sách đề cử — Nhân viên Kinh doanh Phát triển Thị trường tại YOUL CHON VINA',
      ko: '[FYI] 추천 후보 명단에 선정되셨습니다 — YOUL CHON VINA 시장개척 영업',
      en: "[FYI] You've been nominated — Market Development Sales at YOUL CHON VINA",
    },
    desc: 'YOUL CHON VINA 시장개척 영업(V177) recommend (9/16 신규 게재, Emma 접수→Len 게재): 비공개 프레임 — 빈탄 온사이트·월~금 08-17시·10-14M(커미션 별도)·남성 22~40세·전문대 이상·경력 1년 초과. 컷=영업 직무 명시 × 경력 12개월+ × HCMC권 실거주(위치 미기재 제외) 48명. 마케팅 단독 직무 169명은 오더 클로징 중심 JD라 제외. 성별·나이는 DB에 없어(birthdate 기재 0명) 본문 하드조건 명시로 자기선별.',
    source: 'scripts/outreach/youlchon0916-recommend-coldmail.mjs',
    html: (lang) => recommendShell(lang, {
      intro: {
        vi: '<b>YOUL CHON VINA</b> — công ty Hàn Quốc tại TP.HCM — đang tuyển <b>Nhân viên Kinh doanh Phát triển Thị trường</b> qua FYI. Công việc: nghiên cứu & xây dựng chiến lược phát triển thị trường, tư vấn sản phẩm, đàm phán và chốt đơn hàng, chăm sóc khách hàng cũ & tìm khách hàng mới, báo cáo định kỳ. Yêu cầu: nam giới 22–40 tuổi, Cao đẳng trở lên ngành Kinh doanh/Marketing/QTKD hoặc liên quan, trên 01 năm kinh nghiệm vị trí tương đương. T2–T6 08:00–17:00, onsite 362/1 Ung Văn Khiêm, P. Thạnh Mỹ Tây (Q. Bình Thạnh cũ). Lương 10–14 triệu ₫/tháng chưa gồm hoa hồng, thưởng tháng 13, tăng lương hằng năm, trợ cấp cơm trưa & gửi xe.',
        ko: '호치민 한국계 기업 <b>YOUL CHON VINA</b>가 FYI를 통해 <b>시장개척 영업사원</b>을 채용 중. 시장 전략 수립·제품 상담·협상 및 수주·기존/신규 고객 관리, 남성 22~40세·전문대 이상(경영/마케팅 계열)·동일 직무 경력 1년 초과, 월~금 08-17시 빈탄 온사이트, 월 1,000만~1,400만 동(커미션 별도)·13개월차 상여.',
        en: 'YOUL CHON VINA — Korean company in HCMC — is hiring a Market Development Sales rep via FYI. Market strategy, product consulting, negotiation and closing, existing/new client care; male 22–40, college degree+ in business/marketing, 1+ year in a similar role; Mon–Fri 8am–5pm onsite in Binh Thanh; 10–14M VND/month excluding commission.',
      },
      initial: 'Y', company: 'YOUL CHON VINA', title: 'NV KINH DOANH PHÁT TRIỂN THỊ TRƯỜNG', meta: 'Onsite · Bình Thạnh, TP.HCM · 10–14tr ₫/tháng + hoa hồng · T2–T6 08:00–17:00', tail: BENEFIT_PRIVATE,
    }),
  },
  {
    match: /^youlchon0916-/,
    subject: {
      vi: '[FYI] Bạn được chọn vào danh sách đề cử gửi YOUL CHON VINA — Nhân viên Kinh doanh Phát triển Thị trường',
      ko: '[FYI] YOUL CHON VINA 추천 명단에 선정되셨습니다 — 시장개척 영업',
      en: "[FYI] You've been nominated to YOUL CHON VINA — Market Development Sales",
    },
    desc: 'YOUL CHON VINA 시장개척 영업(V177) recommend (9/16): 공개 프레임 — FYI 검토 선정·명단에 프로필 동봉·지원 시 우선 검토. 컷은 private 항목과 동일.',
    source: 'scripts/outreach/youlchon0916-recommend-coldmail.mjs',
    html: (lang) => recommendShell(lang, {
      intro: {
        vi: '<b>YOUL CHON VINA</b> — công ty Hàn Quốc tại TP.HCM — đang tuyển <b>Nhân viên Kinh doanh Phát triển Thị trường</b> (onsite Bình Thạnh, 10–14 triệu ₫ + hoa hồng) qua FYI. Đội ngũ FYI đã xem xét toàn bộ hồ sơ và <b>chọn bạn vào danh sách đề cử</b> — hồ sơ công khai của bạn sẽ được gửi kèm danh sách cho nhà tuyển dụng trong tuần này.',
        ko: '호치민 한국계 기업 <b>YOUL CHON VINA</b>의 시장개척 영업(빈탄 온사이트, 월 1,000만~1,400만 동+커미션) 포지션 — FYI 팀이 이력서 전체를 검토해 회원님을 <b>추천 명단에 선정</b>했으며, 공개 프로필은 이번 주 명단과 함께 담당자에게 전달됩니다.',
        en: "YOUL CHON VINA Market Development Sales (onsite Binh Thanh, 10–14M VND + commission) — the FYI team reviewed all profiles and <b>nominated you</b>; your public profile goes to the recruiter with this week's list.",
      },
      initial: 'Y', company: 'YOUL CHON VINA', title: 'NV KINH DOANH PHÁT TRIỂN THỊ TRƯỜNG', meta: 'Onsite · Bình Thạnh, TP.HCM · 10–14tr ₫/tháng + hoa hồng · T2–T6 08:00–17:00', tail: BENEFIT_PUBLIC,
    }),
  },
  {
    match: /^posco0919-.*-private/,
    subject: {
      vi: '[FYI] Bạn được chọn vào danh sách đề cử — Java Developer tại POSCO DX VIETNAM (TP.HCM)',
      ko: '[FYI] 추천 후보 명단에 선정되셨습니다 — POSCO DX VIETNAM Java Developer',
      en: "[FYI] You've been nominated — Java Developer at POSCO DX VIETNAM",
    },
    desc: 'POSCO DX VIETNAM Java Developer(V187) recommend (9/19): 비공개 프레임 — onsite 7군(Cobi Tower I)·T2–T6·급여 협의·Java+Spring(Boot) 2년+ 필수·React/Vue·REST·MySQL/PostgreSQL·영어 or 한국어 기본 소통. 컷=이력서 Java/Spring 시그널 × 경력 24개월+ × HCMC권/위치 미기재(실측 113명, 7일 3통+ 지친 풀 1명 제외하고 112명 발송). 언어는 게이트에서 제외 — english_cert 는 자기기입 수준값(기준 풀 64%만 기입)이라 미기입=불가가 아니고 JD도 인증이 아닌 "기본 소통"만 요구.',
    source: 'scripts/outreach/posco0919-recommend-coldmail.mjs',
    html: (lang) => recommendShell(lang, {
      intro: {
        vi: '<b>POSCO DX VIETNAM</b> — trung tâm phát triển offshore (ODC) làm việc trực tiếp với trụ sở Hàn Quốc của tập đoàn POSCO — đang tuyển <b>Java Developer</b> qua FYI. Công việc: phát triển, kiểm thử và sửa lỗi ứng dụng doanh nghiệp theo tài liệu thiết kế từ HQ Hàn Quốc; phối hợp với PM phía Hàn Quốc và Team Leader tại Việt Nam; dùng GitHub Copilot và Jira. Yêu cầu: tối thiểu 2 năm kinh nghiệm Java &amp; Spring Framework (Spring Boot), HTML5/CSS3/JavaScript (ES6+), React.js hoặc Vue.js, REST API, MySQL/PostgreSQL, Git·Jira·Confluence, giao tiếp cơ bản bằng tiếng Anh hoặc tiếng Hàn. Phúc lợi: thưởng tháng 13, 12 ngày phép, bảo hiểm tai nạn PTI 24/7, cơ hội đào tạo tại Hàn Quốc.',
        ko: 'POSCO 그룹 한국 본사와 직접 협업하는 베트남 오프쇼어 개발센터(ODC) <b>POSCO DX VIETNAM</b>이 FYI를 통해 <b>Java Developer</b>를 채용 중. 한국 본사 설계 문서 기반 개발·테스트·버그 수정, 한국 PM/현지 팀리더와 협업, GitHub Copilot·Jira 활용. Java+Spring(Boot) 2년+ 필수, HTML5/CSS3/JS(ES6+), React 또는 Vue, REST API, MySQL/PostgreSQL, 영어 또는 한국어 기본 소통. 7군 Cobi Tower I 온사이트, 급여 협의, 13개월차 보너스·연차 12일·한국 연수 기회.',
        en: 'POSCO DX VIETNAM — the POSCO group offshore development center (ODC) working directly with Korea HQ — is hiring a Java Developer via FYI. Develop/test/fix enterprise applications from Korea HQ design docs, work with the Korea PM and local team leader, use GitHub Copilot and Jira. Requires 2+ years of Java & Spring Boot, HTML5/CSS3/JS (ES6+), React or Vue, REST API, MySQL/PostgreSQL, and basic working English or Korean. Onsite District 7, salary negotiable, 13th-month bonus, Korea training program.',
      },
      initial: 'P', company: 'POSCO DX VIETNAM', title: 'Java Developer', meta: 'Onsite · Quận 7, TP.HCM · T2–T6 · Lương thỏa thuận', tail: BENEFIT_PRIVATE,
    }),
  },
  {
    match: /^posco0919-/,
    subject: {
      vi: '[FYI] Bạn được chọn vào danh sách đề cử gửi POSCO DX VIETNAM — Java Developer (TP.HCM)',
      ko: '[FYI] POSCO DX VIETNAM 추천 명단에 선정되셨습니다 — Java Developer',
      en: "[FYI] You've been nominated to POSCO DX VIETNAM — Java Developer",
    },
    desc: 'POSCO DX VIETNAM Java Developer(V187) recommend (9/19): 공개 프레임 — FYI 검토 선정·명단에 프로필 동봉·지원 시 우선 검토. 컷은 private 항목과 동일.',
    source: 'scripts/outreach/posco0919-recommend-coldmail.mjs',
    html: (lang) => recommendShell(lang, {
      intro: {
        vi: '<b>POSCO DX VIETNAM</b> — trung tâm phát triển offshore (ODC) làm việc trực tiếp với trụ sở Hàn Quốc của tập đoàn POSCO — đang tuyển <b>Java Developer</b> (onsite Quận 7, TP.HCM) qua FYI. Đội ngũ FYI đã xem xét toàn bộ hồ sơ và <b>chọn bạn vào danh sách đề cử</b> — hồ sơ công khai của bạn sẽ được gửi kèm danh sách cho nhà tuyển dụng trong tuần này.',
        ko: 'POSCO 그룹 한국 본사와 직접 협업하는 베트남 ODC <b>POSCO DX VIETNAM</b>의 Java Developer(7군 온사이트) 포지션 — FYI 팀이 이력서 전체를 검토해 회원님을 <b>추천 명단에 선정</b>했으며, 공개 프로필은 이번 주 명단과 함께 담당자에게 전달됩니다.',
        en: "POSCO DX VIETNAM Java Developer (onsite District 7, HCMC) — the FYI team reviewed all profiles and <b>nominated you</b>; your public profile goes to the recruiter with this week's list.",
      },
      initial: 'P', company: 'POSCO DX VIETNAM', title: 'Java Developer', meta: 'Onsite · Quận 7, TP.HCM · T2–T6 · Lương thỏa thuận', tail: BENEFIT_PUBLIC,
    }),
  },
  {
    match: /^burningbros0917-recommend-fe-private/,
    subject: {
      vi: '[FYI] Bạn được chọn vào danh sách đề cử — Frontend Developer tại Burning Bros (TP.HCM)',
      ko: '[FYI] 추천 후보 명단에 선정되셨습니다 — Burning Bros Frontend Developer',
      en: "[FYI] You've been nominated — Frontend Developer at Burning Bros",
    },
    desc: 'Burning Bros Frontend Developer(V184) recommend (9/17 Len 등록 당일): 직군 exact 매치 Frontend × 경력 12개월+ × english_cert 보유(JD Upper-Intermediate) = 92명 발송(공개 32/비공개 60). 풀봇 코어 94 대비 차이는 당일 발송 겹침·1인1통 캐스케이드(BA→QA→FE). onsite HCM이지만 지역 하드게이트 없이 카피에 명시해 자기선별. 비공개 프레임.',
    source: 'scripts/outreach/burningbros0917-recommend-coldmail.mjs',
    html: (lang) => recommendShell(lang, {
      intro: {
        vi: 'Burning Bros đang tuyển <b>Frontend Developer</b> qua FYI. Công việc: phát triển &amp; bảo trì service theo yêu cầu khách hàng, phối hợp với PM/designer/developer, giao tiếp trực tiếp với khách hàng toàn cầu. Yêu cầu: <b>1+ năm kinh nghiệm production Web Development</b>, quen OOP &amp; design pattern, viết code sạch, <b>tiếng Anh Upper-Intermediate</b>, nắm cơ bản HTML/CSS/JavaScript. Onsite TP.HCM, lương <b>10–20 triệu ₫/tháng</b>. <b>Burning Bros</b> là công ty phát triển phần mềm tại Việt Nam làm việc với nhiều khách hàng toàn cầu — các thành viên cùng làm việc tại một văn phòng chung (không outsource nhân sự sang công ty khác).',
        ko: '베트남 소프트웨어 개발사 <b>Burning Bros</b>가 FYI를 통해 <b>Frontend Developer</b>를 채용 중. 글로벌 고객사 서비스 개발·유지보수, 웹 개발 실무 1년+·OOP/디자인패턴·영어 Upper-Intermediate 필수. 호치민 온사이트, 월 1,000만~2,000만 동.',
        en: "Burning Bros — a Vietnam-based software company serving global clients — is hiring a Frontend Developer via FYI. 1+ year of production web development, OOP &amp; design patterns, upper-intermediate English. Onsite HCMC, 10–20M VND/month.",
      },
      initial: 'B', company: 'Burning Bros', title: 'Frontend Developer', meta: 'Onsite · TP.HCM · 10–20 triệu ₫/tháng · Fresher/Junior', tail: BENEFIT_PRIVATE,
    }),
  },
  {
    match: /^burningbros0917-recommend-fe-public/,
    subject: {
      vi: '[FYI] Bạn được chọn vào danh sách đề cử gửi Burning Bros — Frontend Developer (TP.HCM)',
      ko: '[FYI] Burning Bros 추천 명단에 선정되셨습니다 — Frontend Developer',
      en: "[FYI] You've been nominated to Burning Bros — Frontend Developer",
    },
    desc: 'Burning Bros Frontend Developer(9/17) recommend: 공개 프레임 — FYI 검토 선정·명단에 프로필 동봉·지원 시 우선 검토. 컷은 private 항목과 동일.',
    source: 'scripts/outreach/burningbros0917-recommend-coldmail.mjs',
    html: (lang) => recommendShell(lang, {
      intro: {
        vi: 'Burning Bros đang tuyển <b>Frontend Developer</b> qua FYI. Công việc: phát triển &amp; bảo trì service theo yêu cầu khách hàng, phối hợp với PM/designer/developer, giao tiếp trực tiếp với khách hàng toàn cầu. Yêu cầu: <b>1+ năm kinh nghiệm production Web Development</b>, quen OOP &amp; design pattern, viết code sạch, <b>tiếng Anh Upper-Intermediate</b>, nắm cơ bản HTML/CSS/JavaScript. Onsite TP.HCM, lương <b>10–20 triệu ₫/tháng</b>. <b>Burning Bros</b> là công ty phát triển phần mềm tại Việt Nam làm việc với nhiều khách hàng toàn cầu — các thành viên cùng làm việc tại một văn phòng chung (không outsource nhân sự sang công ty khác).',
        ko: '베트남 소프트웨어 개발사 <b>Burning Bros</b>가 FYI를 통해 <b>Frontend Developer</b>를 채용 중. 글로벌 고객사 서비스 개발·유지보수, 웹 개발 실무 1년+·OOP/디자인패턴·영어 Upper-Intermediate 필수. 호치민 온사이트, 월 1,000만~2,000만 동.',
        en: "Burning Bros — a Vietnam-based software company serving global clients — is hiring a Frontend Developer via FYI. 1+ year of production web development, OOP &amp; design patterns, upper-intermediate English. Onsite HCMC, 10–20M VND/month.",
      },
      initial: 'B', company: 'Burning Bros', title: 'Frontend Developer', meta: 'Onsite · TP.HCM · 10–20 triệu ₫/tháng · Fresher/Junior', tail: BENEFIT_PUBLIC,
    }),
  },
  {
    match: /^burningbros0917-recommend-qa-private/,
    subject: {
      vi: '[FYI] Bạn được chọn vào danh sách đề cử — QA/QC Engineer tại Burning Bros (TP.HCM)',
      ko: '[FYI] 추천 후보 명단에 선정되셨습니다 — Burning Bros QA/QC Engineer',
      en: "[FYI] You've been nominated — QA/QC Engineer at Burning Bros",
    },
    desc: 'Burning Bros QA/QC Engineer(V185) recommend (9/17): 직군 exact 매치 QA × 경력 12개월+ = 57명 발송(공개 31/비공개 26). 인접 직군 확장 여지 없음(확장해도 60). 코어에 5y+ 26명이 섞여 JD(1–2y) 대비 오버스펙 — 이후 캠페인부터 "요구 연차 +2y" 상한 검토 과제로 남김. 비공개 프레임.',
    source: 'scripts/outreach/burningbros0917-recommend-coldmail.mjs',
    html: (lang) => recommendShell(lang, {
      intro: {
        vi: 'Burning Bros đang tuyển <b>QA/QC Engineer</b> qua FYI. Công việc: xây dựng &amp; thực thi test plan/test case/test script, functional–regression–performance testing, báo cáo kết quả &amp; theo dõi issue. Yêu cầu: <b>1–2 năm kinh nghiệm software testing (manual/automated)</b>, thành thạo công cụ testing, chú ý chi tiết. Ưu tiên ISTQB, tiếng Anh Intermediate, Selenium/JIRA. Onsite TP.HCM, lương <b>8–15 triệu ₫/tháng</b>. <b>Burning Bros</b> là công ty phát triển phần mềm tại Việt Nam làm việc với nhiều khách hàng toàn cầu — các thành viên cùng làm việc tại một văn phòng chung (không outsource nhân sự sang công ty khác).',
        ko: '<b>Burning Bros</b>가 FYI를 통해 <b>QA/QC Engineer</b>를 채용 중. 테스트 계획·케이스 설계 및 실행, 기능/회귀/성능 테스트, 이슈 추적. 소프트웨어 테스팅 1~2년 경력 필수, ISTQB·Selenium·JIRA 우대. 호치민 온사이트, 월 800만~1,500만 동.',
        en: "Burning Bros is hiring a QA/QC Engineer via FYI. Test planning and execution, functional/regression/performance testing, issue tracking. 1–2 years of software testing required; ISTQB, Selenium, JIRA preferred. Onsite HCMC, 8–15M VND/month.",
      },
      initial: 'B', company: 'Burning Bros', title: 'QA/QC Engineer', meta: 'Onsite · TP.HCM · 8–15 triệu ₫/tháng · 1–2 năm kinh nghiệm', tail: BENEFIT_PRIVATE,
    }),
  },
  {
    match: /^burningbros0917-recommend-qa-public/,
    subject: {
      vi: '[FYI] Bạn được chọn vào danh sách đề cử gửi Burning Bros — QA/QC Engineer (TP.HCM)',
      ko: '[FYI] Burning Bros 추천 명단에 선정되셨습니다 — QA/QC Engineer',
      en: "[FYI] You've been nominated to Burning Bros — QA/QC Engineer",
    },
    desc: 'Burning Bros QA/QC Engineer(9/17) recommend: 공개 프레임 — FYI 검토 선정·명단에 프로필 동봉·지원 시 우선 검토. 컷은 private 항목과 동일.',
    source: 'scripts/outreach/burningbros0917-recommend-coldmail.mjs',
    html: (lang) => recommendShell(lang, {
      intro: {
        vi: 'Burning Bros đang tuyển <b>QA/QC Engineer</b> qua FYI. Công việc: xây dựng &amp; thực thi test plan/test case/test script, functional–regression–performance testing, báo cáo kết quả &amp; theo dõi issue. Yêu cầu: <b>1–2 năm kinh nghiệm software testing (manual/automated)</b>, thành thạo công cụ testing, chú ý chi tiết. Ưu tiên ISTQB, tiếng Anh Intermediate, Selenium/JIRA. Onsite TP.HCM, lương <b>8–15 triệu ₫/tháng</b>. <b>Burning Bros</b> là công ty phát triển phần mềm tại Việt Nam làm việc với nhiều khách hàng toàn cầu — các thành viên cùng làm việc tại một văn phòng chung (không outsource nhân sự sang công ty khác).',
        ko: '<b>Burning Bros</b>가 FYI를 통해 <b>QA/QC Engineer</b>를 채용 중. 테스트 계획·케이스 설계 및 실행, 기능/회귀/성능 테스트, 이슈 추적. 소프트웨어 테스팅 1~2년 경력 필수, ISTQB·Selenium·JIRA 우대. 호치민 온사이트, 월 800만~1,500만 동.',
        en: "Burning Bros is hiring a QA/QC Engineer via FYI. Test planning and execution, functional/regression/performance testing, issue tracking. 1–2 years of software testing required; ISTQB, Selenium, JIRA preferred. Onsite HCMC, 8–15M VND/month.",
      },
      initial: 'B', company: 'Burning Bros', title: 'QA/QC Engineer', meta: 'Onsite · TP.HCM · 8–15 triệu ₫/tháng · 1–2 năm kinh nghiệm', tail: BENEFIT_PUBLIC,
    }),
  },
  {
    match: /^burningbros0917-recommend-ba-private/,
    subject: {
      vi: '[FYI] Bạn được chọn vào danh sách đề cử — Business Analyst tại Burning Bros (TP.HCM)',
      ko: '[FYI] 추천 후보 명단에 선정되셨습니다 — Burning Bros Business Analyst',
      en: "[FYI] You've been nominated — Business Analyst at Burning Bros",
    },
    desc: 'Burning Bros Business Analyst(V183) recommend (9/17): 직군 exact 매치 Business Analyst × english_cert 보유(JD 영어 필수) = 44명 발송(공개 22/비공개 22). 세 공고 중 가장 작은 풀(코어 46). Fresher/Junior 공고라 1y 미만 21명이 주축, 한국어는 우대라 게이트 제외. 비공개 프레임.',
    source: 'scripts/outreach/burningbros0917-recommend-coldmail.mjs',
    html: (lang) => recommendShell(lang, {
      intro: {
        vi: 'Burning Bros đang tuyển <b>Business Analyst</b> qua FYI. Công việc: hỗ trợ Product Manager lên kế hoạch &amp; triển khai product roadmap, tạo wireframe từ yêu cầu, phối hợp với developer để làm rõ requirement &amp; theo dõi tiến độ. Yêu cầu: <b>tiếng Anh xuất sắc (nghe–nói–đọc–viết)</b>, nắm vững business analysis, hiểu quy trình phát triển phần mềm. Ưu tiên tiếng Hàn, Agile. <b>Phù hợp fresher/junior</b>. Onsite TP.HCM, lương <b>8–15 triệu ₫/tháng</b>. <b>Burning Bros</b> là công ty phát triển phần mềm tại Việt Nam làm việc với nhiều khách hàng toàn cầu — các thành viên cùng làm việc tại một văn phòng chung (không outsource nhân sự sang công ty khác).',
        ko: '<b>Burning Bros</b>가 FYI를 통해 <b>Business Analyst</b>를 채용 중. PM 로드맵 지원·와이어프레임 작성·개발자와 요구사항 정합. 영어 우수 필수(4스킬), 한국어·Agile 우대, 신입~주니어 대상. 호치민 온사이트, 월 800만~1,500만 동.',
        en: "Burning Bros is hiring a Business Analyst via FYI. Support PM roadmaps, create wireframes, align requirements with developers. Excellent English required; Korean and Agile preferred; open to fresher/junior. Onsite HCMC, 8–15M VND/month.",
      },
      initial: 'B', company: 'Burning Bros', title: 'Business Analyst', meta: 'Onsite · TP.HCM · 8–15 triệu ₫/tháng · Fresher/Junior', tail: BENEFIT_PRIVATE,
    }),
  },
  {
    match: /^burningbros0917-recommend-ba-public/,
    subject: {
      vi: '[FYI] Bạn được chọn vào danh sách đề cử gửi Burning Bros — Business Analyst (TP.HCM)',
      ko: '[FYI] Burning Bros 추천 명단에 선정되셨습니다 — Business Analyst',
      en: "[FYI] You've been nominated to Burning Bros — Business Analyst",
    },
    desc: 'Burning Bros Business Analyst(9/17) recommend: 공개 프레임 — FYI 검토 선정·명단에 프로필 동봉·지원 시 우선 검토. 컷은 private 항목과 동일.',
    source: 'scripts/outreach/burningbros0917-recommend-coldmail.mjs',
    html: (lang) => recommendShell(lang, {
      intro: {
        vi: 'Burning Bros đang tuyển <b>Business Analyst</b> qua FYI. Công việc: hỗ trợ Product Manager lên kế hoạch &amp; triển khai product roadmap, tạo wireframe từ yêu cầu, phối hợp với developer để làm rõ requirement &amp; theo dõi tiến độ. Yêu cầu: <b>tiếng Anh xuất sắc (nghe–nói–đọc–viết)</b>, nắm vững business analysis, hiểu quy trình phát triển phần mềm. Ưu tiên tiếng Hàn, Agile. <b>Phù hợp fresher/junior</b>. Onsite TP.HCM, lương <b>8–15 triệu ₫/tháng</b>. <b>Burning Bros</b> là công ty phát triển phần mềm tại Việt Nam làm việc với nhiều khách hàng toàn cầu — các thành viên cùng làm việc tại một văn phòng chung (không outsource nhân sự sang công ty khác).',
        ko: '<b>Burning Bros</b>가 FYI를 통해 <b>Business Analyst</b>를 채용 중. PM 로드맵 지원·와이어프레임 작성·개발자와 요구사항 정합. 영어 우수 필수(4스킬), 한국어·Agile 우대, 신입~주니어 대상. 호치민 온사이트, 월 800만~1,500만 동.',
        en: "Burning Bros is hiring a Business Analyst via FYI. Support PM roadmaps, create wireframes, align requirements with developers. Excellent English required; Korean and Agile preferred; open to fresher/junior. Onsite HCMC, 8–15M VND/month.",
      },
      initial: 'B', company: 'Burning Bros', title: 'Business Analyst', meta: 'Onsite · TP.HCM · 8–15 triệu ₫/tháng · Fresher/Junior', tail: BENEFIT_PUBLIC,
    }),
  },
  {
    match: /^hyperstar0917-.*-private/,
    subject: {
      vi: '[FYI] Bạn được chọn vào danh sách đề cử — Global Influencer Marketing Assistant tại Hyperstar (TP.HCM)',
      ko: '[FYI] 추천 후보 명단에 선정되셨습니다 — Hyperstar Global Influencer Marketing Assistant',
      en: "[FYI] You've been nominated — Global Influencer Marketing Assistant at Hyperstar",
    },
    desc: 'Hyperstar(R203) Global Influencer Marketing Assistant recommend (9/17 등록 당일~9/21, 누적 151명): 비공개 프레임 — HCM 거주 명시 × 0~2y × 비개발 하드게이트 위에 티어링. 1차 T1 인플루언서 경험×상급언어 9 · T2 인플루언서×기타언어 5 · T3 SNS텍스트×마케팅직군×상급언어 94. 2차 T5 40 = SNS 텍스트 게이트 제거(SNS 상시 사용은 개인 생활이라 이력서 미기재가 정상 → T3가 인증 상위자를 걸러냄). 3차 잔여 13. 1차 부진 원인 실측: T3 수신자 96%가 최근 7일 recommend 기수신(인당 평균 7.4통)이라 클릭 자체가 안 나옴 — 이후 캠페인에 신선도 게이트 도입 계기.',
    source: 'scripts/outreach/hyperstar0917-recommend-coldmail.mjs',
    html: (lang) => recommendShell(lang, {
      intro: {
        vi: '<b>Hyperstar</b> — startup công nghệ Hàn Quốc phát triển nền tảng tự động hóa <b>Influencer Marketing toàn cầu</b> dựa trên Generative AI — đang tuyển <b>Global Influencer Marketing Assistant</b> qua FYI. Công việc: tìm kiếm &amp; list-up creator trên TikTok/Instagram/YouTube cho thị trường Việt Nam, Đông Nam Á, Mỹ; outreach qua email/DM; theo dõi tiến độ chiến dịch; tổng hợp dữ liệu &amp; báo cáo. Yêu cầu: <b>giao tiếp được bằng tiếng Anh hoặc tiếng Hàn</b>, thường xuyên dùng TikTok/Instagram/YouTube, thành thạo Excel/Google Sheets. <b>Không yêu cầu kinh nghiệm</b>. Full-time (T2–T6) tại văn phòng LikeLion TP.HCM, phối hợp remote với team Hyperstar tại Hàn Quốc. Lương <b>6–10 triệu ₫/tháng</b>, đóng BHXH đầy đủ.',
        ko: '생성형 AI 기반 글로벌 인플루언서 마케팅 자동화 플랫폼을 만드는 한국 스타트업 <b>Hyperstar</b>가 FYI를 통해 <b>Global Influencer Marketing Assistant</b>를 채용 중. TikTok/Instagram/YouTube 크리에이터 리스트업·아웃리치·캠페인 진행 관리·데이터 리포트. 경력 무관, 영어 또는 한국어 소통 가능·엑셀 필수. 멋사 HCM 사무실 출근 + 한국팀 원격 협업, 월 600만~1,000만 동.',
        en: "Hyperstar — a Korean startup building a generative-AI platform for global influencer marketing — is hiring a Global Influencer Marketing Assistant via FYI. Creator list-up and outreach across TikTok/Instagram/YouTube, campaign tracking, reporting. No experience required; working English or Korean and Excel needed. Based at the LikeLion HCMC office with remote collaboration with the Korea team; 6–10M VND/month.",
      },
      initial: 'H', company: 'Hyperstar', title: 'Global Influencer Marketing Assistant', meta: 'Văn phòng LikeLion TP.HCM · Remote với team Hàn Quốc · 6–10 triệu ₫/tháng · Fresher/Junior', tail: BENEFIT_PRIVATE,
    }),
  },
  {
    match: /^hyperstar0917-/,
    subject: {
      vi: '[FYI] Bạn được chọn vào danh sách đề cử gửi Hyperstar — Global Influencer Marketing Assistant (TP.HCM)',
      ko: '[FYI] Hyperstar 추천 명단에 선정되셨습니다 — Global Influencer Marketing Assistant',
      en: "[FYI] You've been nominated to Hyperstar — Global Influencer Marketing Assistant",
    },
    desc: 'Hyperstar(R203) recommend (9/17~9/21): 공개 프레임 — FYI 검토 선정·명단에 프로필 동봉·지원 시 우선 검토. 컷은 private 항목과 동일.',
    source: 'scripts/outreach/hyperstar0917-recommend-coldmail.mjs',
    html: (lang) => recommendShell(lang, {
      intro: {
        vi: '<b>Hyperstar</b> — startup công nghệ Hàn Quốc phát triển nền tảng tự động hóa <b>Influencer Marketing toàn cầu</b> dựa trên Generative AI — đang tuyển <b>Global Influencer Marketing Assistant</b> qua FYI. Công việc: tìm kiếm &amp; list-up creator trên TikTok/Instagram/YouTube cho thị trường Việt Nam, Đông Nam Á, Mỹ; outreach qua email/DM; theo dõi tiến độ chiến dịch; tổng hợp dữ liệu &amp; báo cáo. Yêu cầu: <b>giao tiếp được bằng tiếng Anh hoặc tiếng Hàn</b>, thường xuyên dùng TikTok/Instagram/YouTube, thành thạo Excel/Google Sheets. <b>Không yêu cầu kinh nghiệm</b>. Full-time (T2–T6) tại văn phòng LikeLion TP.HCM, phối hợp remote với team Hyperstar tại Hàn Quốc. Lương <b>6–10 triệu ₫/tháng</b>, đóng BHXH đầy đủ.',
        ko: '생성형 AI 기반 글로벌 인플루언서 마케팅 자동화 플랫폼을 만드는 한국 스타트업 <b>Hyperstar</b>가 FYI를 통해 <b>Global Influencer Marketing Assistant</b>를 채용 중. TikTok/Instagram/YouTube 크리에이터 리스트업·아웃리치·캠페인 진행 관리·데이터 리포트. 경력 무관, 영어 또는 한국어 소통 가능·엑셀 필수. 멋사 HCM 사무실 출근 + 한국팀 원격 협업, 월 600만~1,000만 동.',
        en: "Hyperstar — a Korean startup building a generative-AI platform for global influencer marketing — is hiring a Global Influencer Marketing Assistant via FYI. Creator list-up and outreach across TikTok/Instagram/YouTube, campaign tracking, reporting. No experience required; working English or Korean and Excel needed. Based at the LikeLion HCMC office with remote collaboration with the Korea team; 6–10M VND/month.",
      },
      initial: 'H', company: 'Hyperstar', title: 'Global Influencer Marketing Assistant', meta: 'Văn phòng LikeLion TP.HCM · Remote với team Hàn Quốc · 6–10 triệu ₫/tháng · Fresher/Junior', tail: BENEFIT_PUBLIC,
    }),
  },
  {
    match: /^wefun0917-.*-private/,
    subject: {
      vi: '[FYI] Bạn được chọn vào danh sách đề cử — Product Manager Curation tại Wefun (Remote)',
      ko: '[FYI] 추천 후보 명단에 선정되셨습니다 — Wefun Product Manager Curation',
      en: "[FYI] You've been nominated — Product Manager Curation at Wefun",
    },
    desc: 'Wefun(R204) Product Manager Curation / 스낵24 간식 큐레이션 recommend (9/17~9/18, 누적 214명): 비공개 프레임 — 호현 확인(9/17) 리모트 가능 포지션이라 지역 게이트 없이 전국(DB엔 onsite로 등록돼 있어 Len에게 수정 요청 필요). 컷=경력 6m+ × 비개발 × (PM 직군 | MD·큐레이션·소싱 텍스트). 1차 150명(PM 35 + MD 115, TO 1이라 목표 지원 10건 역산) · 2차 잔여 64명. F&amp;B·이커머스 도메인 가점순 발송. 신선도 하드게이트(최근 7일 recommend 3통+ 제외) 첫 적용 캠페인.',
    source: 'scripts/outreach/wefun0917-recommend-coldmail.mjs',
    html: (lang) => recommendShell(lang, {
      intro: {
        vi: '<b>WEFUN</b> — công ty công nghệ B2B Hàn Quốc cung cấp giải pháp vận hành văn phòng &amp; phúc lợi nhân viên (snack, cà phê, bữa sáng văn phòng, quà tặng doanh nghiệp theo mô hình subscription) — đang tuyển <b>Product Manager Curation</b> cho dịch vụ Snack24 qua FYI. Công việc: xây dựng &amp; đề xuất curation sản phẩm phù hợp nhu cầu khách hàng B2B; quản lý quyết toán sản phẩm chính xác (Excel); xây dựng quan hệ với khách hàng doanh nghiệp; sourcing sản phẩm. Phù hợp nếu bạn có kinh nghiệm <b>customer service / MD / curation / thu mua</b>, đặc biệt MD ngành thực phẩm tại công ty phân phối. Ưu tiên giao tiếp được tiếng Anh. <b>Làm việc remote</b>, lương <b>12–20 triệu ₫/tháng</b>.',
        ko: '오피스 운영·임직원 복지 솔루션(간식·커피·조식·기업 선물 구독)을 제공하는 한국 B2B 테크 기업 <b>WEFUN</b>이 FYI를 통해 스낵24 <b>간식 큐레이션 PM</b>을 채용 중. B2B 고객사 맞춤 상품 큐레이션·정산 관리(엑셀)·고객 라포·소싱. CS/MD/큐레이션/구매 경험자 적합(식품 유통 MD 우대), 영어 가능자 우대. 리모트 근무, 월 1,200만~2,000만 동.',
        en: "WEFUN — a Korean B2B tech company providing office operations and employee benefit subscriptions (snacks, coffee, office breakfast, corporate gifts) — is hiring a Product Manager Curation for Snack24 via FYI. Product curation for B2B clients, settlement management in Excel, client rapport, product sourcing. Suits customer service / MD / curation / purchasing backgrounds; English a plus. Remote, 12–20M VND/month.",
      },
      initial: 'W', company: 'Wefun', title: 'Product Manager Curation', meta: 'Remote (làm việc từ xa) · 12–20 triệu ₫/tháng · Junior trở lên', tail: BENEFIT_PRIVATE,
    }),
  },
  {
    match: /^wefun0917-/,
    subject: {
      vi: '[FYI] Bạn được chọn vào danh sách đề cử gửi Wefun — Product Manager Curation (Remote)',
      ko: '[FYI] Wefun 추천 명단에 선정되셨습니다 — Product Manager Curation',
      en: "[FYI] You've been nominated to Wefun — Product Manager Curation",
    },
    desc: 'Wefun(R204) PM Curation recommend (9/17~9/18): 공개 프레임 — FYI 검토 선정·명단에 프로필 동봉·지원 시 우선 검토. 컷은 private 항목과 동일.',
    source: 'scripts/outreach/wefun0917-recommend-coldmail.mjs',
    html: (lang) => recommendShell(lang, {
      intro: {
        vi: '<b>WEFUN</b> — công ty công nghệ B2B Hàn Quốc cung cấp giải pháp vận hành văn phòng &amp; phúc lợi nhân viên (snack, cà phê, bữa sáng văn phòng, quà tặng doanh nghiệp theo mô hình subscription) — đang tuyển <b>Product Manager Curation</b> cho dịch vụ Snack24 qua FYI. Công việc: xây dựng &amp; đề xuất curation sản phẩm phù hợp nhu cầu khách hàng B2B; quản lý quyết toán sản phẩm chính xác (Excel); xây dựng quan hệ với khách hàng doanh nghiệp; sourcing sản phẩm. Phù hợp nếu bạn có kinh nghiệm <b>customer service / MD / curation / thu mua</b>, đặc biệt MD ngành thực phẩm tại công ty phân phối. Ưu tiên giao tiếp được tiếng Anh. <b>Làm việc remote</b>, lương <b>12–20 triệu ₫/tháng</b>.',
        ko: '오피스 운영·임직원 복지 솔루션(간식·커피·조식·기업 선물 구독)을 제공하는 한국 B2B 테크 기업 <b>WEFUN</b>이 FYI를 통해 스낵24 <b>간식 큐레이션 PM</b>을 채용 중. B2B 고객사 맞춤 상품 큐레이션·정산 관리(엑셀)·고객 라포·소싱. CS/MD/큐레이션/구매 경험자 적합(식품 유통 MD 우대), 영어 가능자 우대. 리모트 근무, 월 1,200만~2,000만 동.',
        en: "WEFUN — a Korean B2B tech company providing office operations and employee benefit subscriptions (snacks, coffee, office breakfast, corporate gifts) — is hiring a Product Manager Curation for Snack24 via FYI. Product curation for B2B clients, settlement management in Excel, client rapport, product sourcing. Suits customer service / MD / curation / purchasing backgrounds; English a plus. Remote, 12–20M VND/month.",
      },
      initial: 'W', company: 'Wefun', title: 'Product Manager Curation', meta: 'Remote (làm việc từ xa) · 12–20 triệu ₫/tháng · Junior trở lên', tail: BENEFIT_PUBLIC,
    }),
  },
  {
    match: /^nxai0917-.*-private/,
    subject: {
      vi: '[FYI] Bạn được chọn vào danh sách đề cử — AI Native Marketer tại Nexacode (TP.HCM)',
      ko: '[FYI] 추천 후보 명단에 선정되셨습니다 — Nexacode AI Native Marketer',
      en: "[FYI] You've been nominated — AI Native Marketer at Nexacode",
    },
    desc: 'Nexacode(R205) AI Native Marketer recommend (9/17~9/21, 누적 46명): 비공개 프레임 — 컷=HCM 명시 × 마케팅 직군 × 6m+ × <b>유료광고 운영 텍스트 필수</b>(Meta/Google Ads·media buy·ROAS 등). T1 광고운영×AI툴 / T2 광고운영(AI툴 이력서 미기재 — 위펀 SNS 게이트 교훈으로 포함). 풀봇 코어는 마케팅 직군 전체 694명이지만 JD 필수요건 반영하면 실핏 43명이라 그 안에서만 발송. T3(마케팅×AI툴만·광고경험 無) 39명은 필수요건 미달로 미발송 — TO 3 미충원 시 요건 완화를 Nexacode에 확인하는 것이 다음 순서.',
    source: 'scripts/outreach/nxai0917-recommend-coldmail.mjs',
    html: (lang) => recommendShell(lang, {
      intro: {
        vi: '<b>Nexacode</b> — công ty phần mềm xây dựng sản phẩm SaaS, ERP và giải pháp chuyển đổi số — đang tuyển <b>AI Native Marketer</b> qua FYI. Công việc: lên chiến lược marketing &amp; ý tưởng quảng cáo ứng dụng AI; sản xuất creative (video, hình ảnh, copy) bằng công cụ AI; <b>vận hành quảng cáo trả phí Meta/Google</b> và test theo creative, target; vận hành nội dung SNS/cộng đồng; phân tích dữ liệu quảng cáo &amp; người dùng. Yêu cầu: <b>có kinh nghiệm vận hành quảng cáo trả phí (Meta, Google Ads)</b>, từng dùng công cụ AI cho nội dung quảng cáo, phân tích được dữ liệu hiệu quả, tư duy test &amp; learn. Ưu tiên: startup/growth, vận hành SNS, thành thạo ChatGPT·Midjourney. Onsite TP.HCM, lương <b>12–20 triệu ₫/tháng</b>.',
        ko: 'SaaS·ERP·DX 소프트웨어 기업 <b>Nexacode</b>가 FYI를 통해 <b>AI Native Marketer</b>를 채용 중. AI 활용 마케팅 전략·광고 크리에이티브(영상/이미지/카피) 제작, <b>Meta·Google 유료광고 운영</b> 및 크리에이티브·타겟 테스트, SNS 콘텐츠 운영, 광고·유저 데이터 분석. 유료광고 운영 경험 필수, ChatGPT·미드저니 등 생성형 AI 툴 숙련 우대. 호치민 온사이트, 월 1,200만~2,000만 동.',
        en: "Nexacode — a SaaS/ERP/DX software company — is hiring an AI Native Marketer via FYI. AI-assisted marketing strategy, ad creative production (video/image/copy), paid Meta/Google ads operation with creative and target testing, SNS content, ad and user data analysis. Paid ads experience required; ChatGPT/Midjourney fluency preferred. Onsite HCMC, 12–20M VND/month.",
      },
      initial: 'N', company: 'Nexacode', title: 'AI Native Marketer', meta: 'Onsite · TP.HCM · 12–20 triệu ₫/tháng', tail: BENEFIT_PRIVATE,
    }),
  },
  {
    match: /^nxai0917-/,
    subject: {
      vi: '[FYI] Bạn được chọn vào danh sách đề cử gửi Nexacode — AI Native Marketer (TP.HCM)',
      ko: '[FYI] Nexacode 추천 명단에 선정되셨습니다 — AI Native Marketer',
      en: "[FYI] You've been nominated to Nexacode — AI Native Marketer",
    },
    desc: 'Nexacode(R205) AI Native Marketer recommend (9/17~9/21): 공개 프레임 — FYI 검토 선정·명단에 프로필 동봉·지원 시 우선 검토. 컷은 private 항목과 동일.',
    source: 'scripts/outreach/nxai0917-recommend-coldmail.mjs',
    html: (lang) => recommendShell(lang, {
      intro: {
        vi: '<b>Nexacode</b> — công ty phần mềm xây dựng sản phẩm SaaS, ERP và giải pháp chuyển đổi số — đang tuyển <b>AI Native Marketer</b> qua FYI. Công việc: lên chiến lược marketing &amp; ý tưởng quảng cáo ứng dụng AI; sản xuất creative (video, hình ảnh, copy) bằng công cụ AI; <b>vận hành quảng cáo trả phí Meta/Google</b> và test theo creative, target; vận hành nội dung SNS/cộng đồng; phân tích dữ liệu quảng cáo &amp; người dùng. Yêu cầu: <b>có kinh nghiệm vận hành quảng cáo trả phí (Meta, Google Ads)</b>, từng dùng công cụ AI cho nội dung quảng cáo, phân tích được dữ liệu hiệu quả, tư duy test &amp; learn. Ưu tiên: startup/growth, vận hành SNS, thành thạo ChatGPT·Midjourney. Onsite TP.HCM, lương <b>12–20 triệu ₫/tháng</b>.',
        ko: 'SaaS·ERP·DX 소프트웨어 기업 <b>Nexacode</b>가 FYI를 통해 <b>AI Native Marketer</b>를 채용 중. AI 활용 마케팅 전략·광고 크리에이티브(영상/이미지/카피) 제작, <b>Meta·Google 유료광고 운영</b> 및 크리에이티브·타겟 테스트, SNS 콘텐츠 운영, 광고·유저 데이터 분석. 유료광고 운영 경험 필수, ChatGPT·미드저니 등 생성형 AI 툴 숙련 우대. 호치민 온사이트, 월 1,200만~2,000만 동.',
        en: "Nexacode — a SaaS/ERP/DX software company — is hiring an AI Native Marketer via FYI. AI-assisted marketing strategy, ad creative production (video/image/copy), paid Meta/Google ads operation with creative and target testing, SNS content, ad and user data analysis. Paid ads experience required; ChatGPT/Midjourney fluency preferred. Onsite HCMC, 12–20M VND/month.",
      },
      initial: 'N', company: 'Nexacode', title: 'AI Native Marketer', meta: 'Onsite · TP.HCM · 12–20 triệu ₫/tháng', tail: BENEFIT_PUBLIC,
    }),
  },
  {
    match: /^datest0917-.*-private/,
    subject: {
      vi: '[FYI] Bạn được chọn vào danh sách đề cử — Nhân viên Hành chính – Văn phòng / Hỗ trợ Kế toán tại DAT EST (Q.7, chỉ tuyển nữ)',
      ko: '[FYI] 추천 후보 명단에 선정되셨습니다 — DAT EST Nhân viên Hành chính – Văn phòng / Hỗ trợ Kế toán',
      en: "[FYI] You've been nominated — Nhân viên Hành chính – Văn phòng / Hỗ trợ Kế toán at DAT EST",
    },
    desc: 'DAT EST(V186) 사무직/회계지원 recommend (9/17, 97명): 비공개 프레임 — 전기안전기술 한국계 기업, Q7 온사이트·TO 1·급여 협의. 컷=HCM 명시 × 행정·회계 매치(지노시스 admin 동일 필터) × 신선도 게이트. 전체 매치 242명 중 당일 지노시스 등 기수신 144명 제외하고 97명 발송, 회계·세무 텍스트 > 한국계 시그널 > 직군 정합 > 영어 가점순. <b>JD가 여성 전용(Nữ)</b>인데 프로필에 성별 필드가 없어 타겟 불가 → 제목·본문·훅 3곳에 "chỉ tuyển ứng viên nữ" 명시해 자기선별(유저 결정 9/17). 급여 미기재라 급여 훅 대신 근무시간(T2–T6 08–16시, 격주 토 오전) 명시.',
    source: 'scripts/outreach/datest0917-recommend-coldmail.mjs',
    html: (lang) => recommendShell(lang, {
      intro: {
        vi: '<b>DAT EST</b> — công ty Hàn Quốc về Kỹ thuật An toàn Điện, cung cấp dịch vụ quản lý an toàn điện &amp; kiểm tra hệ thống điện cho các nhà máy tại Việt Nam — đang tuyển <b>Nhân viên Hành chính – Văn phòng / Hỗ trợ Kế toán</b> qua FYI (<b>theo yêu cầu của công ty, vị trí này chỉ tuyển ứng viên nữ</b> · TO 1 người). Công việc: hành chính – văn phòng, soạn thảo &amp; quản lý hồ sơ, hỗ trợ báo giá/hợp đồng/báo cáo, hỗ trợ hóa đơn &amp; kế toán, liên hệ khách hàng – đối tác. Yêu cầu: Excel/Word cơ bản, cẩn thận – trung thực – có trách nhiệm. Ưu tiên: kế toán/thuế cơ bản, từng làm tại công ty Hàn Quốc, biết tiếng Anh hoặc tiếng Hàn. T2–T6 08:00–16:00, T7 cách tuần 08:00–12:00. Lương <b>thỏa thuận</b>.',
        ko: '전기안전기술 한국계 기업 <b>DAT EST</b>가 FYI를 통해 <b>사무·행정 / 회계지원 직원</b> 1명을 채용 중(<b>회사 요청으로 여성 한정</b>). 행정·문서 관리, 견적·계약·점검보고서 지원, 세금계산서·회계 보조, 고객·파트너 응대. 엑셀·워드 기본, 회계/세무 기초·한국계 근무 경험·영어 또는 한국어 우대. 7군 온사이트, 월~금 08–16시·격주 토 오전, 급여 협의.',
        en: "DAT EST — a Korean electrical-safety engineering company serving factories in Vietnam — is hiring an Office Administration / Accounting Support staff via FYI (the company specifies female applicants only; 1 opening). Office administration, document management, quotation/contract/report support, invoicing and accounting assistance, client contact. Basic Excel/Word required; accounting or tax basics, Korean-company experience, English or Korean preferred. Onsite District 7, negotiable salary.",
      },
      initial: 'D', company: 'DAT EST', title: 'Nhân viên Hành chính – Văn phòng / Hỗ trợ Kế toán', meta: 'Onsite · Quận 7, TP.HCM · Lương thỏa thuận · Chỉ tuyển nữ (theo yêu cầu công ty)', tail: BENEFIT_PRIVATE,
    }),
  },
  {
    match: /^datest0917-/,
    subject: {
      vi: '[FYI] Bạn được chọn vào danh sách đề cử gửi DAT EST — Nhân viên Hành chính – Văn phòng / Hỗ trợ Kế toán (Q.7, chỉ tuyển nữ)',
      ko: '[FYI] DAT EST 추천 명단에 선정되셨습니다 — Nhân viên Hành chính – Văn phòng / Hỗ trợ Kế toán',
      en: "[FYI] You've been nominated to DAT EST — Nhân viên Hành chính – Văn phòng / Hỗ trợ Kế toán",
    },
    desc: 'DAT EST(V186) 사무직/회계지원 recommend (9/17): 공개 프레임 — FYI 검토 선정·명단에 프로필 동봉·지원 시 우선 검토. 컷은 private 항목과 동일(여성 전용 명시 포함).',
    source: 'scripts/outreach/datest0917-recommend-coldmail.mjs',
    html: (lang) => recommendShell(lang, {
      intro: {
        vi: '<b>DAT EST</b> — công ty Hàn Quốc về Kỹ thuật An toàn Điện, cung cấp dịch vụ quản lý an toàn điện &amp; kiểm tra hệ thống điện cho các nhà máy tại Việt Nam — đang tuyển <b>Nhân viên Hành chính – Văn phòng / Hỗ trợ Kế toán</b> qua FYI (<b>theo yêu cầu của công ty, vị trí này chỉ tuyển ứng viên nữ</b> · TO 1 người). Công việc: hành chính – văn phòng, soạn thảo &amp; quản lý hồ sơ, hỗ trợ báo giá/hợp đồng/báo cáo, hỗ trợ hóa đơn &amp; kế toán, liên hệ khách hàng – đối tác. Yêu cầu: Excel/Word cơ bản, cẩn thận – trung thực – có trách nhiệm. Ưu tiên: kế toán/thuế cơ bản, từng làm tại công ty Hàn Quốc, biết tiếng Anh hoặc tiếng Hàn. T2–T6 08:00–16:00, T7 cách tuần 08:00–12:00. Lương <b>thỏa thuận</b>.',
        ko: '전기안전기술 한국계 기업 <b>DAT EST</b>가 FYI를 통해 <b>사무·행정 / 회계지원 직원</b> 1명을 채용 중(<b>회사 요청으로 여성 한정</b>). 행정·문서 관리, 견적·계약·점검보고서 지원, 세금계산서·회계 보조, 고객·파트너 응대. 엑셀·워드 기본, 회계/세무 기초·한국계 근무 경험·영어 또는 한국어 우대. 7군 온사이트, 월~금 08–16시·격주 토 오전, 급여 협의.',
        en: "DAT EST — a Korean electrical-safety engineering company serving factories in Vietnam — is hiring an Office Administration / Accounting Support staff via FYI (the company specifies female applicants only; 1 opening). Office administration, document management, quotation/contract/report support, invoicing and accounting assistance, client contact. Basic Excel/Word required; accounting or tax basics, Korean-company experience, English or Korean preferred. Onsite District 7, negotiable salary.",
      },
      initial: 'D', company: 'DAT EST', title: 'Nhân viên Hành chính – Văn phòng / Hỗ trợ Kế toán', meta: 'Onsite · Quận 7, TP.HCM · Lương thỏa thuận · Chỉ tuyển nữ (theo yêu cầu công ty)', tail: BENEFIT_PUBLIC,
    }),
  },
  {
    match: /^jinosys0917-.*-private/,
    subject: {
      vi: '[FYI] Bạn được chọn vào danh sách đề cử — Nhân viên Hành chính - Quản trị (Junior) tại Jinosys (TP.HCM)',
      ko: '[FYI] 추천 후보 명단에 선정되셨습니다 — Jinosys Nhân viên Hành chính - Quản trị (Junior)',
      en: "[FYI] You've been nominated — Nhân viên Hành chính - Quản trị (Junior) at Jinosys",
    },
    desc: 'Jinosys(R202) 경영지원·행정 Junior recommend (9/17, 113명): 비공개 프레임 — 호현 지시(9/16) "인턴 아님, 1년 안팎 경력, 호치민 거주자, 70명 다 보내주시지요" → 6개월~3년 밴드 전부 발송(exp 1y~3y 69 · junior 6m~1y 44). 컷=HCM권 명시(거주지 미기재 제외, JD 하드조건) × 행정 매치(직군 HR/Admin/Operations/Finance/Sales Admin/Interpreter | 행정 직무 텍스트) × 개발직군 단독 제외. 카피에 "1년 이상" 명시해 6개월대 자기선별.',
    source: 'scripts/outreach/jinosys0917-recommend-coldmail.mjs',
    html: (lang) => recommendShell(lang, {
      intro: {
        vi: '<b>Jinosys</b> — công ty Hàn Quốc chuyên về nền tảng IoT an toàn dựa trên AI (18 bằng sáng chế, đối tác an toàn của Samsung Electronics) — đang tuyển <b>Nhân viên Hành chính - Quản trị (Junior)</b> tại TP.HCM qua FYI. Công việc: hỗ trợ quản trị &amp; hành chính văn phòng, soạn thảo văn bản và quản lý tài liệu, xử lý chi phí và quyết toán, quản lý hợp đồng &amp; giấy tờ, hỗ trợ lịch họp. Yêu cầu: <b>từ 1 năm kinh nghiệm</b> hành chính / tổng vụ / văn phòng, MS Office cơ bản, <b>có thể sử dụng tiếng Anh</b>, <b>đang sinh sống tại TP.HCM</b>. Ưu tiên: kinh nghiệm startup / công ty IT, kế toán / quyết toán. Lương <b>12–15 triệu ₫/tháng</b>.',
        ko: 'AI 기반 안전 IoT 플랫폼 한국 기업 <b>Jinosys</b>(특허 18건, 삼성전자 안전 협력사)가 FYI를 통해 호치민 <b>경영지원·행정 주니어</b>를 채용 중. 사무 행정 지원·문서 작성 및 관리·비용 정산·계약 서류 관리·회의 일정 지원. 행정/총무 1년+ 경력, MS Office, 영어 사용 가능, HCM 거주 필수. 스타트업·IT 경험 및 회계/정산 우대. 월 1,200만~1,500만 동.',
        en: "Jinosys — a Korean AI-based safety IoT platform company (18 patents, a Samsung Electronics safety partner) — is hiring a Junior Administration staff in HCMC via FYI. Office administration, document drafting and management, expense settlement, contract paperwork, meeting scheduling. 1+ year of admin/general affairs experience, MS Office, working English, and HCMC residency required. 12–15M VND/month.",
      },
      initial: 'J', company: 'Jinosys', title: 'Nhân viên Hành chính - Quản trị (Junior)', meta: 'Onsite TP.HCM · 12–15 triệu ₫/tháng · Kinh nghiệm từ 1 năm', tail: BENEFIT_PRIVATE,
    }),
  },
  {
    match: /^jinosys0917-/,
    subject: {
      vi: '[FYI] Bạn được chọn vào danh sách đề cử gửi Jinosys — Nhân viên Hành chính - Quản trị (Junior) (TP.HCM)',
      ko: '[FYI] Jinosys 추천 명단에 선정되셨습니다 — Nhân viên Hành chính - Quản trị (Junior)',
      en: "[FYI] You've been nominated to Jinosys — Nhân viên Hành chính - Quản trị (Junior)",
    },
    desc: 'Jinosys(R202) 경영지원·행정 Junior recommend (9/17): 공개 프레임 — FYI 검토 선정·명단에 프로필 동봉·지원 시 우선 검토. 컷은 private 항목과 동일.',
    source: 'scripts/outreach/jinosys0917-recommend-coldmail.mjs',
    html: (lang) => recommendShell(lang, {
      intro: {
        vi: '<b>Jinosys</b> — công ty Hàn Quốc chuyên về nền tảng IoT an toàn dựa trên AI (18 bằng sáng chế, đối tác an toàn của Samsung Electronics) — đang tuyển <b>Nhân viên Hành chính - Quản trị (Junior)</b> tại TP.HCM qua FYI. Công việc: hỗ trợ quản trị &amp; hành chính văn phòng, soạn thảo văn bản và quản lý tài liệu, xử lý chi phí và quyết toán, quản lý hợp đồng &amp; giấy tờ, hỗ trợ lịch họp. Yêu cầu: <b>từ 1 năm kinh nghiệm</b> hành chính / tổng vụ / văn phòng, MS Office cơ bản, <b>có thể sử dụng tiếng Anh</b>, <b>đang sinh sống tại TP.HCM</b>. Ưu tiên: kinh nghiệm startup / công ty IT, kế toán / quyết toán. Lương <b>12–15 triệu ₫/tháng</b>.',
        ko: 'AI 기반 안전 IoT 플랫폼 한국 기업 <b>Jinosys</b>(특허 18건, 삼성전자 안전 협력사)가 FYI를 통해 호치민 <b>경영지원·행정 주니어</b>를 채용 중. 사무 행정 지원·문서 작성 및 관리·비용 정산·계약 서류 관리·회의 일정 지원. 행정/총무 1년+ 경력, MS Office, 영어 사용 가능, HCM 거주 필수. 스타트업·IT 경험 및 회계/정산 우대. 월 1,200만~1,500만 동.',
        en: "Jinosys — a Korean AI-based safety IoT platform company (18 patents, a Samsung Electronics safety partner) — is hiring a Junior Administration staff in HCMC via FYI. Office administration, document drafting and management, expense settlement, contract paperwork, meeting scheduling. 1+ year of admin/general affairs experience, MS Office, working English, and HCMC residency required. 12–15M VND/month.",
      },
      initial: 'J', company: 'Jinosys', title: 'Nhân viên Hành chính - Quản trị (Junior)', meta: 'Onsite TP.HCM · 12–15 triệu ₫/tháng · Kinh nghiệm từ 1 năm', tail: BENEFIT_PUBLIC,
    }),
  },
  {
    match: /^yooha0921-.*-private/,
    subject: {
      vi: '[FYI] Bạn được chọn vào danh sách đề cử — Nhân viên Off-line Sales tại Yooha (Q.7, TP.HCM)',
      ko: '[FYI] 추천 후보 명단에 선정되셨습니다 — Yooha 오프라인 영업',
      en: "[FYI] You've been nominated — Off-line Sales at Yooha",
    },
    desc: 'Yooha(V188) 오프라인 영업 recommend (9/21 Len 등록 당일, 100명): 비공개 프레임 — 한국 수입 소비재 유통, Q7(SECC 인근) onsite·9-13M gross+커미션 3~30%. 컷=HCM권 × 경력 1y~10y × 비개발 × 영업(직군 | 인접직군×영업텍스트). T1 영업×온라인·이커머스 28(JD 필수 2개 충족) + T2 영업만 72(점수순 상위). 풀봇 코어 95는 온라인 마케팅 필수요건 미반영 수치라 실핏 재산정: T1 30 · T2 117 · T3 5. T2 포함 근거=온라인 판매 경험은 영업 이력서에 미기재가 흔함(하이퍼스타 SNS·위펀 MD 교훈) → 카피에 필수요건 명시해 자기선별. 10y 초과 23명은 급여 밴드 미스매치로 하드 제외. 가점=식품·화장품 도메인 > 온라인 > Q7 근거리 > 영업 직군. t2 상한컷 예비 23명은 2차용 보존.',
    source: 'scripts/outreach/yooha0921-recommend-coldmail.mjs',
    html: (lang) => recommendShell(lang, {
      intro: {
        vi: '<b>Yooha</b> — công ty kinh doanh hàng tiêu dùng nhập khẩu từ Hàn Quốc (mỹ phẩm, đồ uống, sản phẩm nhân sâm, dầu gội, nông sản…) — đang tuyển <b>Nhân viên Off-line Sales</b> qua FYI. Công việc: phát triển nhà phân phối bán lẻ lớn (WinMart, Co.opmart…), siêu thị quy mô nhỏ tại TP.HCM, hệ thống bán buôn &amp; kênh online; hỗ trợ marketing/bán hàng online, quản lý doanh số &amp; tồn kho. Bắt buộc: <b>1 năm kinh nghiệm kinh doanh</b> + <b>kinh nghiệm marketing / bán hàng online</b>. Ưu tiên: ngành thực phẩm hoặc mỹ phẩm, sinh sống trong bán kính 20 phút tới Quận 7. Không yêu cầu ngoại ngữ. T2–T6 08:00–17:00 tại văn phòng gần SECC, Quận 7. Lương <b>9–13 triệu ₫ gross</b> + <b>hoa hồng 3–30%</b>, thử việc nhận 100% lương.',
        ko: '한국 수입 소비재(화장품·음료·홍삼·샴푸·농산물) 유통사 <b>Yooha</b>가 FYI를 통해 <b>오프라인 영업 담당</b>을 채용 중. WinMart·Co.opmart 등 대형 리테일과 개인 슈퍼 개척, 도매·온라인 채널 발굴, 온라인 마케팅·재고/매출 관리. 필수는 영업 경력 1년+ 와 온라인 판매·이커머스 경험, 식품·화장품 도메인 및 7군 20분 거리 거주 우대, 외국어 요건 없음. 7군 SECC 인근 온사이트, 월~금 08–17시, 월 900만~1,300만 동(gross) + 판매 커미션 3~30%.',
        en: "Yooha — a distributor of Korean imported consumer goods (cosmetics, beverages, ginseng products, shampoo, produce) — is hiring an Off-line Sales rep via FYI. Develop large retail distributors (WinMart, Co.opmart), small supermarkets in HCMC, wholesale and online channels; support online marketing, inventory and sales management. Requires 1+ year of sales experience and online marketing/e-commerce selling experience; food or cosmetics background and living within 20 minutes of District 7 preferred; no foreign language required. Onsite near SECC, District 7, Mon–Fri 8–5, 9–13M VND gross plus 3–30% commission.",
      },
      initial: 'Y', company: 'Yooha', title: 'Nhân viên Off-line Sales', meta: 'Onsite · Quận 7 (gần SECC), TP.HCM · 9–13 triệu ₫ gross + hoa hồng 3–30%', tail: BENEFIT_PRIVATE,
    }),
  },
  {
    match: /^yooha0921-/,
    subject: {
      vi: '[FYI] Bạn được chọn vào danh sách đề cử gửi Yooha — Nhân viên Off-line Sales (Q.7, TP.HCM)',
      ko: '[FYI] Yooha 추천 명단에 선정되셨습니다 — 오프라인 영업',
      en: "[FYI] You've been nominated to Yooha — Off-line Sales",
    },
    desc: 'Yooha(V188) 오프라인 영업 recommend (9/21): 공개 프레임 — FYI 검토 선정·명단에 프로필 동봉·지원 시 우선 검토. 컷은 private 항목과 동일.',
    source: 'scripts/outreach/yooha0921-recommend-coldmail.mjs',
    html: (lang) => recommendShell(lang, {
      intro: {
        vi: '<b>Yooha</b> — công ty kinh doanh hàng tiêu dùng nhập khẩu từ Hàn Quốc (mỹ phẩm, đồ uống, sản phẩm nhân sâm, dầu gội, nông sản…) — đang tuyển <b>Nhân viên Off-line Sales</b> qua FYI. Công việc: phát triển nhà phân phối bán lẻ lớn (WinMart, Co.opmart…), siêu thị quy mô nhỏ tại TP.HCM, hệ thống bán buôn &amp; kênh online; hỗ trợ marketing/bán hàng online, quản lý doanh số &amp; tồn kho. Bắt buộc: <b>1 năm kinh nghiệm kinh doanh</b> + <b>kinh nghiệm marketing / bán hàng online</b>. Ưu tiên: ngành thực phẩm hoặc mỹ phẩm, sinh sống trong bán kính 20 phút tới Quận 7. Không yêu cầu ngoại ngữ. T2–T6 08:00–17:00 tại văn phòng gần SECC, Quận 7. Lương <b>9–13 triệu ₫ gross</b> + <b>hoa hồng 3–30%</b>, thử việc nhận 100% lương.',
        ko: '한국 수입 소비재(화장품·음료·홍삼·샴푸·농산물) 유통사 <b>Yooha</b>가 FYI를 통해 <b>오프라인 영업 담당</b>을 채용 중. WinMart·Co.opmart 등 대형 리테일과 개인 슈퍼 개척, 도매·온라인 채널 발굴, 온라인 마케팅·재고/매출 관리. 필수는 영업 경력 1년+ 와 온라인 판매·이커머스 경험, 식품·화장품 도메인 및 7군 20분 거리 거주 우대, 외국어 요건 없음. 7군 SECC 인근 온사이트, 월~금 08–17시, 월 900만~1,300만 동(gross) + 판매 커미션 3~30%.',
        en: "Yooha — a distributor of Korean imported consumer goods (cosmetics, beverages, ginseng products, shampoo, produce) — is hiring an Off-line Sales rep via FYI. Develop large retail distributors (WinMart, Co.opmart), small supermarkets in HCMC, wholesale and online channels; support online marketing, inventory and sales management. Requires 1+ year of sales experience and online marketing/e-commerce selling experience; food or cosmetics background and living within 20 minutes of District 7 preferred; no foreign language required. Onsite near SECC, District 7, Mon–Fri 8–5, 9–13M VND gross plus 3–30% commission.",
      },
      initial: 'Y', company: 'Yooha', title: 'Nhân viên Off-line Sales', meta: 'Onsite · Quận 7 (gần SECC), TP.HCM · 9–13 triệu ₫ gross + hoa hồng 3–30%', tail: BENEFIT_PUBLIC,
    }),
  },
  {
    match: /^becuai0921-.*-private/,
    subject: {
      vi: '[FYI] Bạn được chọn vào danh sách đề cử — Nhân viên Xử lý Dữ liệu (tiếng Hàn) tại BECUAI VIETNAM',
      ko: '[FYI] 추천 후보 명단에 선정되셨습니다 — BECUAI 데이터 처리(한국어)',
      en: "[FYI] You've been nominated — Data Processing Staff (Korean) at BECUAI",
    },
    desc: 'BECUAI(V189) 한국어 뉴스 데이터 처리 recommend (9/21 재등록 당일, 신규만 25명): 비공개 프레임 — V22(9/14, 29명 발송·지원 18)와 동일 포지션 재등록이라 V22 기수신·지원자 전원 제외. 컷=HCM(명시+빈값) × korean_cert TOPIK 3+/중급 이상(9/14 컷은 Basic·Beginner·TOPIK1 까지 통과 → JD 최소 TOPIK 3-4 에 맞춰 등급 판별) × ≤10y(12M 밴드 미스매치 컷). 실측 47(신규 30/기수신 17) → Pre-Intermediate 오탐 1·10y 초과 2·동일인 2계정 2 제외 = 25. 야간(15~24시)·주6일(일~금)·한국어 면접+타이핑 테스트는 카피에 명시해 자기선별. V189 JD 에서 빠진 CV 언어 요건은 카피에서 삭제.',
    source: 'scripts/outreach/becuai0921-recommend-coldmail.mjs',
    html: (lang) => recommendShell(lang, {
      intro: {
        vi: '<b>BECUAI VIETNAM</b> đang tuyển <b>Nhân viên Xử lý Dữ liệu (Data Labels)</b> qua FYI — nhập liệu, lưu trữ &amp; quản lý dữ liệu báo chí/tin tức Hàn Quốc cho AI (được hướng dẫn &amp; đào tạo, <b>không yêu cầu kinh nghiệm</b>). Yêu cầu: tốt nghiệp đại học, <b>tiếng Hàn đọc hiểu, giao tiếp khá (tối thiểu TOPIK 3–4)</b> — phỏng vấn bằng tiếng Hàn &amp; có test đánh máy tiếng Hàn. Lưu ý giờ làm: <b>15:00–00:00 (làm đêm, có phụ cấp), Chủ Nhật đến Thứ 6</b>. Lương gross 12 triệu ₫ (chưa gồm phụ cấp làm đêm; thử việc 2 tháng 85%), sau thử việc đóng BHXH/BHYT/BHTN trên 100% lương. Công ty có phòng ăn &amp; phòng nghỉ riêng, ký túc xá cách công ty 3 phút đi bộ, hỗ trợ mộc thực tập.',
        ko: '<b>BECUAI VIETNAM</b>이 FYI를 통해 <b>데이터 처리 직원(Data Labels)</b> 채용 중. AI용 한국 뉴스·기사 데이터 입력·저장·관리(교육 제공, 무경력 가능). 대졸·한국어 독해/회화(최소 TOPIK 3-4), 한국어 면접+타이핑 테스트. 근무 15~24시(야간수당)·일~금, gross 12M VND(야간수당 별도, 수습 2개월 85%), 수습 후 급여 100% 기준 4대보험, 식당·휴게실, 도보 3분 기숙사, 인턴 확인 도장 지원.',
        en: 'BECUAI VIETNAM is hiring Data Processing Staff (Data Labels) via FYI — entering, storing and managing Korean news data for AI (training provided, no experience required). University degree, Korean reading and conversation (TOPIK 3–4 minimum), Korean interview + typing test. Hours 15:00–00:00 (night allowance), Sun–Fri; gross 12M VND excluding night allowance (85% during 2-month probation), full insurance after probation, canteen and rest room, dorm 3 minutes away, internship stamp supported.',
      },
      initial: 'B', company: 'BECUAI VIETNAM', title: 'NHÂN VIÊN XỬ LÝ DỮ LIỆU (Data Labels)', meta: 'Onsite · Q.3 (P. Bàn Cờ), TP.HCM · Gross 12 triệu ₫/tháng + phụ cấp đêm', tail: BENEFIT_PRIVATE,
    }),
  },
  {
    match: /^becuai0921-/,
    subject: {
      vi: '[FYI] Bạn được chọn vào danh sách đề cử gửi BECUAI VIETNAM — Nhân viên Xử lý Dữ liệu (tiếng Hàn)',
      ko: '[FYI] BECUAI 추천 명단에 선정되셨습니다 — 데이터 처리(한국어)',
      en: "[FYI] You've been nominated to BECUAI — Data Processing Staff (Korean)",
    },
    desc: 'BECUAI(V189) 데이터 처리 recommend (9/21): 공개 프레임 — FYI 검토 선정·명단에 프로필 동봉·지원 시 우선 검토. 컷은 private 항목과 동일.',
    source: 'scripts/outreach/becuai0921-recommend-coldmail.mjs',
    html: (lang) => recommendShell(lang, {
      intro: {
        vi: '<b>BECUAI VIETNAM</b> đang tuyển <b>Nhân viên Xử lý Dữ liệu (Data Labels)</b> qua FYI — nhập liệu, lưu trữ &amp; quản lý dữ liệu báo chí/tin tức Hàn Quốc cho AI (được hướng dẫn &amp; đào tạo, <b>không yêu cầu kinh nghiệm</b>). Yêu cầu: tốt nghiệp đại học, <b>tiếng Hàn đọc hiểu, giao tiếp khá (tối thiểu TOPIK 3–4)</b> — phỏng vấn bằng tiếng Hàn &amp; có test đánh máy tiếng Hàn. Lưu ý giờ làm: <b>15:00–00:00 (làm đêm, có phụ cấp), Chủ Nhật đến Thứ 6</b>. Lương gross 12 triệu ₫ (chưa gồm phụ cấp làm đêm; thử việc 2 tháng 85%), sau thử việc đóng BHXH/BHYT/BHTN trên 100% lương. Công ty có phòng ăn &amp; phòng nghỉ riêng, ký túc xá cách công ty 3 phút đi bộ, hỗ trợ mộc thực tập.',
        ko: '<b>BECUAI VIETNAM</b>이 FYI를 통해 <b>데이터 처리 직원(Data Labels)</b> 채용 중. AI용 한국 뉴스·기사 데이터 입력·저장·관리(교육 제공, 무경력 가능). 대졸·한국어 독해/회화(최소 TOPIK 3-4), 한국어 면접+타이핑 테스트. 근무 15~24시(야간수당)·일~금, gross 12M VND(야간수당 별도, 수습 2개월 85%), 수습 후 급여 100% 기준 4대보험, 식당·휴게실, 도보 3분 기숙사, 인턴 확인 도장 지원.',
        en: 'BECUAI VIETNAM is hiring Data Processing Staff (Data Labels) via FYI — entering, storing and managing Korean news data for AI (training provided, no experience required). University degree, Korean reading and conversation (TOPIK 3–4 minimum), Korean interview + typing test. Hours 15:00–00:00 (night allowance), Sun–Fri; gross 12M VND excluding night allowance (85% during 2-month probation), full insurance after probation, canteen and rest room, dorm 3 minutes away, internship stamp supported.',
      },
      initial: 'B', company: 'BECUAI VIETNAM', title: 'NHÂN VIÊN XỬ LÝ DỮ LIỆU (Data Labels)', meta: 'Onsite · Q.3 (P. Bàn Cờ), TP.HCM · Gross 12 triệu ₫/tháng + phụ cấp đêm', tail: BENEFIT_PUBLIC,
    }),
  },
  {
    match: /^becuai0922-hr-.*-private/,
    subject: {
      vi: '[FYI] Bạn được chọn vào danh sách đề cử — HR Operation (tiếng Hàn) tại BECUAI VIETNAM',
      ko: '[FYI] 추천 후보 명단에 선정되셨습니다 — BECUAI HR Operation(한국어)',
      en: "[FYI] You've been nominated — HR Operation (Korean) at BECUAI",
    },
    desc: 'BECUAI(V190) HR Operation recommend (9/22 Len 등록 당일, 70명): 비공개 프레임 — HR Admin+총무+내부 재무, 대졸 무경력, TOPIK 4+, 20~35세(여성 우대), Q3 onsite 월~금 09-18시, 급여 협의. 컷=korean_cert TOPIK 4+/고급 × ≤10y(나이 20~35 대체). hcm 그룹(HCM 명시+빈값, 한글 표기 호찌민 포함) 35 먼저 → remote 그룹(타지역: 하노이·다낭·한국 등, 온사이트는 카피로 자기선별) 35. HCM 한국어 인증 풀 소진(어제 V189 Data Labels 25통·9/14 V22 29통 겹침, 7일 3통+ 9명 제외)이라 유저 결정으로 D(지역 무관)까지 확장. BECUAI 3공고 지원자 11 제외, V189/V22 기수신은 다른 공고이므로 포함. 가점=HR/사무 시그널 > ≤3y > HCM 명시 > TOPIK 5-6.',
    source: 'scripts/outreach/becuai0922-hr-recommend-coldmail.mjs',
    html: (lang) => recommendShell(lang, {
      intro: {
        vi: '<b>BECUAI VIETNAM</b> đang tuyển <b>HR Operation</b> (HR Admin + Tổng vụ + Tài chính nội bộ) qua FYI — <b>không yêu cầu kinh nghiệm</b>. Công việc: quản lý lương &amp; nghỉ phép năm, khai báo BHXH, lập phiếu lương; thu thập hóa đơn/chứng từ, tổng hợp &amp; báo cáo chi tiêu; soạn thảo &amp; lưu trữ hợp đồng, tiếp nhận yêu cầu nội bộ. Yêu cầu: tốt nghiệp đại học, <b>tiếng Hàn đọc hiểu, giao tiếp khá (tối thiểu TOPIK 4)</b>, tin học văn phòng, tính cách hướng nội &amp; làm việc độc lập; 20–35 tuổi (ưu tiên nữ). <b>Thứ 2–Thứ 6, 09:00–18:00</b> tại Quận 3 (P. Bàn Cờ), nghỉ lễ Hàn Quốc. Lương thỏa thuận khi phỏng vấn.',
        ko: '<b>BECUAI VIETNAM</b>이 FYI를 통해 <b>HR Operation</b>(HR 행정+총무+내부 재무) 채용 중, 무경력 가능. 급여·연차 관리, 사회보험 신고, 급여명세 작성, 비용 증빙 수집·지출 보고, 계약서 작성·관리, 내부 요청 접수. 대졸·한국어 독해/회화(최소 TOPIK 4)·사무 SW, 내향적·독립 근무 성향, 20~35세(여성 우대). 3군 온사이트 월~금 09–18시, 한국 공휴일 휴무, 급여 면접 시 협의.',
        en: 'BECUAI VIETNAM is hiring HR Operation (HR admin + general affairs + internal finance) via FYI — no experience required. Payroll and annual leave, social insurance filing, payslips, expense documentation and reporting, contract drafting and filing, internal requests. University degree, Korean reading and conversation (TOPIK 4 minimum), office software, introverted and independent working style, age 20–35 (female preferred). Onsite District 3, Mon–Fri 9–6, Korean holidays off, salary negotiable at interview.',
      },
      initial: 'B', company: 'BECUAI VIETNAM', title: 'HR Operation', meta: 'Onsite · Q.3 (P. Bàn Cờ), TP.HCM · T2–T6 09:00–18:00 · Lương thỏa thuận', tail: BENEFIT_PRIVATE,
    }),
  },
  {
    match: /^becuai0922-hr-/,
    subject: {
      vi: '[FYI] Bạn được chọn vào danh sách đề cử gửi BECUAI VIETNAM — HR Operation (tiếng Hàn)',
      ko: '[FYI] BECUAI 추천 명단에 선정되셨습니다 — HR Operation(한국어)',
      en: "[FYI] You've been nominated to BECUAI — HR Operation (Korean)",
    },
    desc: 'BECUAI(V190) HR Operation recommend (9/22): 공개 프레임 — FYI 검토 선정·명단에 프로필 동봉·지원 시 우선 검토. 컷은 private 항목과 동일.',
    source: 'scripts/outreach/becuai0922-hr-recommend-coldmail.mjs',
    html: (lang) => recommendShell(lang, {
      intro: {
        vi: '<b>BECUAI VIETNAM</b> đang tuyển <b>HR Operation</b> (HR Admin + Tổng vụ + Tài chính nội bộ) qua FYI — <b>không yêu cầu kinh nghiệm</b>. Công việc: quản lý lương &amp; nghỉ phép năm, khai báo BHXH, lập phiếu lương; thu thập hóa đơn/chứng từ, tổng hợp &amp; báo cáo chi tiêu; soạn thảo &amp; lưu trữ hợp đồng, tiếp nhận yêu cầu nội bộ. Yêu cầu: tốt nghiệp đại học, <b>tiếng Hàn đọc hiểu, giao tiếp khá (tối thiểu TOPIK 4)</b>, tin học văn phòng, tính cách hướng nội &amp; làm việc độc lập; 20–35 tuổi (ưu tiên nữ). <b>Thứ 2–Thứ 6, 09:00–18:00</b> tại Quận 3 (P. Bàn Cờ), nghỉ lễ Hàn Quốc. Lương thỏa thuận khi phỏng vấn.',
        ko: '<b>BECUAI VIETNAM</b>이 FYI를 통해 <b>HR Operation</b>(HR 행정+총무+내부 재무) 채용 중, 무경력 가능. 급여·연차 관리, 사회보험 신고, 급여명세 작성, 비용 증빙 수집·지출 보고, 계약서 작성·관리, 내부 요청 접수. 대졸·한국어 독해/회화(최소 TOPIK 4)·사무 SW, 내향적·독립 근무 성향, 20~35세(여성 우대). 3군 온사이트 월~금 09–18시, 한국 공휴일 휴무, 급여 면접 시 협의.',
        en: 'BECUAI VIETNAM is hiring HR Operation (HR admin + general affairs + internal finance) via FYI — no experience required. Payroll and annual leave, social insurance filing, payslips, expense documentation and reporting, contract drafting and filing, internal requests. University degree, Korean reading and conversation (TOPIK 4 minimum), office software, introverted and independent working style, age 20–35 (female preferred). Onsite District 3, Mon–Fri 9–6, Korean holidays off, salary negotiable at interview.',
      },
      initial: 'B', company: 'BECUAI VIETNAM', title: 'HR Operation', meta: 'Onsite · Q.3 (P. Bàn Cờ), TP.HCM · T2–T6 09:00–18:00 · Lương thỏa thuận', tail: BENEFIT_PUBLIC,
    }),
  },
  {
    match: /^yooha0922-.*-private/,
    subject: {
      vi: '[FYI] Bạn được chọn vào danh sách đề cử — Nhân viên Off-line Sales tại Yooha (Q.7, TP.HCM)',
      ko: '[FYI] 추천 후보 명단에 선정되셨습니다 — Yooha 오프라인 영업',
      en: "[FYI] You've been nominated — Off-line Sales at Yooha",
    },
    desc: 'Yooha(V188) 오프라인 영업 recommend 2차 (9/22 타겟 재정의, 247명): 비공개 프레임 — 한국 수입 소비재 유통, Q7(SECC 인근) onsite·9-13M gross+커미션 3~30%. 1차(9/21, 100명: 직군 필드 영업 × 1~10y) 클릭 4·지원 3 — t1(영업×이커머스 텍스트) 28명 0클릭, 이커머스 키워드에 걸린 건 마케터였음. 재정의: 급여 9-13M 밴드에 맞춰 0~4y 로 내리고 직군 필드 대신 경력 텍스트·행동 시그널. b 최근 30일 영업 공고 지원/클릭 이력 78 > s 영업 직함 텍스트(nhân viên kinh doanh/bán hàng, sales executive…) 60 > f FMCG·리테일·유통·화장품 48 > e 이커머스 판매(Shopee/Lazada/TikTok Shop) 61, 캐스케이드 1인1통. "sales 텍스트 어디든" 컷은 Photoshop 오탐 244 라 폐기. 1차 기수신 55·당일 겹침 7 제외, 7일 3통+ 게이트 미적용(유저 결정 "다 보내")',
    source: 'scripts/outreach/yooha0922-recommend-coldmail.mjs',
    html: (lang) => recommendShell(lang, {
      intro: {
        vi: '<b>Yooha</b> — công ty kinh doanh hàng tiêu dùng nhập khẩu từ Hàn Quốc (mỹ phẩm, đồ uống, sản phẩm nhân sâm, dầu gội, nông sản…) — đang tuyển <b>Nhân viên Off-line Sales</b> qua FYI. Công việc: phát triển nhà phân phối bán lẻ lớn (WinMart, Co.opmart…), siêu thị quy mô nhỏ tại TP.HCM, hệ thống bán buôn &amp; kênh online; hỗ trợ marketing/bán hàng online, quản lý doanh số &amp; tồn kho. Bắt buộc: <b>1 năm kinh nghiệm kinh doanh</b> + <b>kinh nghiệm marketing / bán hàng online</b>. Ưu tiên: ngành thực phẩm hoặc mỹ phẩm, sinh sống trong bán kính 20 phút tới Quận 7. Không yêu cầu ngoại ngữ. T2–T6 08:00–17:00 tại văn phòng gần SECC, Quận 7. Lương <b>9–13 triệu ₫ gross</b> + <b>hoa hồng 3–30%</b>, thử việc nhận 100% lương.',
        ko: '한국 수입 소비재(화장품·음료·홍삼·샴푸·농산물) 유통사 <b>Yooha</b>가 FYI를 통해 <b>오프라인 영업 담당</b>을 채용 중. WinMart·Co.opmart 등 대형 리테일과 개인 슈퍼 개척, 도매·온라인 채널 발굴, 온라인 마케팅·재고/매출 관리. 필수는 영업 경력 1년+ 와 온라인 판매·이커머스 경험, 식품·화장품 도메인 및 7군 20분 거리 거주 우대, 외국어 요건 없음. 7군 SECC 인근 온사이트, 월~금 08–17시, 월 900만~1,300만 동(gross) + 판매 커미션 3~30%.',
        en: "Yooha — a distributor of Korean imported consumer goods (cosmetics, beverages, ginseng products, shampoo, produce) — is hiring an Off-line Sales rep via FYI. Develop large retail distributors (WinMart, Co.opmart), small supermarkets in HCMC, wholesale and online channels; support online marketing, inventory and sales management. Requires 1+ year of sales experience and online marketing/e-commerce selling experience; food or cosmetics background and living within 20 minutes of District 7 preferred; no foreign language required. Onsite near SECC, District 7, Mon–Fri 8–5, 9–13M VND gross plus 3–30% commission.",
      },
      initial: 'Y', company: 'Yooha', title: 'Nhân viên Off-line Sales', meta: 'Onsite · Quận 7 (gần SECC), TP.HCM · 9–13 triệu ₫ gross + hoa hồng 3–30%', tail: BENEFIT_PRIVATE,
    }),
  },
  {
    match: /^yooha0922-/,
    subject: {
      vi: '[FYI] Bạn được chọn vào danh sách đề cử gửi Yooha — Nhân viên Off-line Sales (Q.7, TP.HCM)',
      ko: '[FYI] Yooha 추천 명단에 선정되셨습니다 — 오프라인 영업',
      en: "[FYI] You've been nominated to Yooha — Off-line Sales",
    },
    desc: 'Yooha(V188) 오프라인 영업 recommend 2차 (9/22): 공개 프레임 — FYI 검토 선정·명단에 프로필 동봉·지원 시 우선 검토. 컷은 private 항목과 동일.',
    source: 'scripts/outreach/yooha0922-recommend-coldmail.mjs',
    html: (lang) => recommendShell(lang, {
      intro: {
        vi: '<b>Yooha</b> — công ty kinh doanh hàng tiêu dùng nhập khẩu từ Hàn Quốc (mỹ phẩm, đồ uống, sản phẩm nhân sâm, dầu gội, nông sản…) — đang tuyển <b>Nhân viên Off-line Sales</b> qua FYI. Công việc: phát triển nhà phân phối bán lẻ lớn (WinMart, Co.opmart…), siêu thị quy mô nhỏ tại TP.HCM, hệ thống bán buôn &amp; kênh online; hỗ trợ marketing/bán hàng online, quản lý doanh số &amp; tồn kho. Bắt buộc: <b>1 năm kinh nghiệm kinh doanh</b> + <b>kinh nghiệm marketing / bán hàng online</b>. Ưu tiên: ngành thực phẩm hoặc mỹ phẩm, sinh sống trong bán kính 20 phút tới Quận 7. Không yêu cầu ngoại ngữ. T2–T6 08:00–17:00 tại văn phòng gần SECC, Quận 7. Lương <b>9–13 triệu ₫ gross</b> + <b>hoa hồng 3–30%</b>, thử việc nhận 100% lương.',
        ko: '한국 수입 소비재(화장품·음료·홍삼·샴푸·농산물) 유통사 <b>Yooha</b>가 FYI를 통해 <b>오프라인 영업 담당</b>을 채용 중. WinMart·Co.opmart 등 대형 리테일과 개인 슈퍼 개척, 도매·온라인 채널 발굴, 온라인 마케팅·재고/매출 관리. 필수는 영업 경력 1년+ 와 온라인 판매·이커머스 경험, 식품·화장품 도메인 및 7군 20분 거리 거주 우대, 외국어 요건 없음. 7군 SECC 인근 온사이트, 월~금 08–17시, 월 900만~1,300만 동(gross) + 판매 커미션 3~30%.',
        en: "Yooha — a distributor of Korean imported consumer goods (cosmetics, beverages, ginseng products, shampoo, produce) — is hiring an Off-line Sales rep via FYI. Develop large retail distributors (WinMart, Co.opmart), small supermarkets in HCMC, wholesale and online channels; support online marketing, inventory and sales management. Requires 1+ year of sales experience and online marketing/e-commerce selling experience; food or cosmetics background and living within 20 minutes of District 7 preferred; no foreign language required. Onsite near SECC, District 7, Mon–Fri 8–5, 9–13M VND gross plus 3–30% commission.",
      },
      initial: 'Y', company: 'Yooha', title: 'Nhân viên Off-line Sales', meta: 'Onsite · Quận 7 (gần SECC), TP.HCM · 9–13 triệu ₫ gross + hoa hồng 3–30%', tail: BENEFIT_PUBLIC,
    }),
  },
  {
    match: /^becuai0921-.*-private/,
    subject: {
      vi: '[FYI] Bạn được chọn vào danh sách đề cử — Nhân viên Xử lý Dữ liệu (tiếng Hàn) tại BECUAI VIETNAM',
      ko: '[FYI] 추천 후보 명단에 선정되셨습니다 — BECUAI 데이터 처리(한국어)',
      en: "[FYI] You've been nominated — Data Processing Staff (Korean) at BECUAI",
    },
    desc: 'BECUAI(V189) 한국어 뉴스 데이터 처리 recommend (9/21 재등록 당일, 신규만 25명): 비공개 프레임 — V22(9/14, 29명 발송·지원 18)와 동일 포지션 재등록이라 V22 기수신·지원자 전원 제외. 컷=HCM(명시+빈값) × korean_cert TOPIK 3+/중급 이상(9/14 컷은 Basic·Beginner·TOPIK1 까지 통과 → JD 최소 TOPIK 3-4 에 맞춰 등급 판별) × ≤10y(12M 밴드 미스매치 컷). 실측 47(신규 30/기수신 17) → Pre-Intermediate 오탐 1·10y 초과 2·동일인 2계정 2 제외 = 25. 야간(15~24시)·주6일(일~금)·한국어 면접+타이핑 테스트는 카피에 명시해 자기선별. V189 JD 에서 빠진 CV 언어 요건은 카피에서 삭제.',
    source: 'scripts/outreach/becuai0921-recommend-coldmail.mjs',
    html: (lang) => recommendShell(lang, {
      intro: {
        vi: '<b>BECUAI VIETNAM</b> đang tuyển <b>Nhân viên Xử lý Dữ liệu (Data Labels)</b> qua FYI — nhập liệu, lưu trữ &amp; quản lý dữ liệu báo chí/tin tức Hàn Quốc cho AI (được hướng dẫn &amp; đào tạo, <b>không yêu cầu kinh nghiệm</b>). Yêu cầu: tốt nghiệp đại học, <b>tiếng Hàn đọc hiểu, giao tiếp khá (tối thiểu TOPIK 3–4)</b> — phỏng vấn bằng tiếng Hàn &amp; có test đánh máy tiếng Hàn. Lưu ý giờ làm: <b>15:00–00:00 (làm đêm, có phụ cấp), Chủ Nhật đến Thứ 6</b>. Lương gross 12 triệu ₫ (chưa gồm phụ cấp làm đêm; thử việc 2 tháng 85%), sau thử việc đóng BHXH/BHYT/BHTN trên 100% lương. Công ty có phòng ăn &amp; phòng nghỉ riêng, ký túc xá cách công ty 3 phút đi bộ, hỗ trợ mộc thực tập.',
        ko: '<b>BECUAI VIETNAM</b>이 FYI를 통해 <b>데이터 처리 직원(Data Labels)</b> 채용 중. AI용 한국 뉴스·기사 데이터 입력·저장·관리(교육 제공, 무경력 가능). 대졸·한국어 독해/회화(최소 TOPIK 3-4), 한국어 면접+타이핑 테스트. 근무 15~24시(야간수당)·일~금, gross 12M VND(야간수당 별도, 수습 2개월 85%), 수습 후 급여 100% 기준 4대보험, 식당·휴게실, 도보 3분 기숙사, 인턴 확인 도장 지원.',
        en: 'BECUAI VIETNAM is hiring Data Processing Staff (Data Labels) via FYI — entering, storing and managing Korean news data for AI (training provided, no experience required). University degree, Korean reading and conversation (TOPIK 3–4 minimum), Korean interview + typing test. Hours 15:00–00:00 (night allowance), Sun–Fri; gross 12M VND excluding night allowance (85% during 2-month probation), full insurance after probation, canteen and rest room, dorm 3 minutes away, internship stamp supported.',
      },
      initial: 'B', company: 'BECUAI VIETNAM', title: 'NHÂN VIÊN XỬ LÝ DỮ LIỆU (Data Labels)', meta: 'Onsite · Q.3 (P. Bàn Cờ), TP.HCM · Gross 12 triệu ₫/tháng + phụ cấp đêm', tail: BENEFIT_PRIVATE,
    }),
  },
  {
    match: /^becuai0921-/,
    subject: {
      vi: '[FYI] Bạn được chọn vào danh sách đề cử gửi BECUAI VIETNAM — Nhân viên Xử lý Dữ liệu (tiếng Hàn)',
      ko: '[FYI] BECUAI 추천 명단에 선정되셨습니다 — 데이터 처리(한국어)',
      en: "[FYI] You've been nominated to BECUAI — Data Processing Staff (Korean)",
    },
    desc: 'BECUAI(V189) 데이터 처리 recommend (9/21): 공개 프레임 — FYI 검토 선정·명단에 프로필 동봉·지원 시 우선 검토. 컷은 private 항목과 동일.',
    source: 'scripts/outreach/becuai0921-recommend-coldmail.mjs',
    html: (lang) => recommendShell(lang, {
      intro: {
        vi: '<b>BECUAI VIETNAM</b> đang tuyển <b>Nhân viên Xử lý Dữ liệu (Data Labels)</b> qua FYI — nhập liệu, lưu trữ &amp; quản lý dữ liệu báo chí/tin tức Hàn Quốc cho AI (được hướng dẫn &amp; đào tạo, <b>không yêu cầu kinh nghiệm</b>). Yêu cầu: tốt nghiệp đại học, <b>tiếng Hàn đọc hiểu, giao tiếp khá (tối thiểu TOPIK 3–4)</b> — phỏng vấn bằng tiếng Hàn &amp; có test đánh máy tiếng Hàn. Lưu ý giờ làm: <b>15:00–00:00 (làm đêm, có phụ cấp), Chủ Nhật đến Thứ 6</b>. Lương gross 12 triệu ₫ (chưa gồm phụ cấp làm đêm; thử việc 2 tháng 85%), sau thử việc đóng BHXH/BHYT/BHTN trên 100% lương. Công ty có phòng ăn &amp; phòng nghỉ riêng, ký túc xá cách công ty 3 phút đi bộ, hỗ trợ mộc thực tập.',
        ko: '<b>BECUAI VIETNAM</b>이 FYI를 통해 <b>데이터 처리 직원(Data Labels)</b> 채용 중. AI용 한국 뉴스·기사 데이터 입력·저장·관리(교육 제공, 무경력 가능). 대졸·한국어 독해/회화(최소 TOPIK 3-4), 한국어 면접+타이핑 테스트. 근무 15~24시(야간수당)·일~금, gross 12M VND(야간수당 별도, 수습 2개월 85%), 수습 후 급여 100% 기준 4대보험, 식당·휴게실, 도보 3분 기숙사, 인턴 확인 도장 지원.',
        en: 'BECUAI VIETNAM is hiring Data Processing Staff (Data Labels) via FYI — entering, storing and managing Korean news data for AI (training provided, no experience required). University degree, Korean reading and conversation (TOPIK 3–4 minimum), Korean interview + typing test. Hours 15:00–00:00 (night allowance), Sun–Fri; gross 12M VND excluding night allowance (85% during 2-month probation), full insurance after probation, canteen and rest room, dorm 3 minutes away, internship stamp supported.',
      },
      initial: 'B', company: 'BECUAI VIETNAM', title: 'NHÂN VIÊN XỬ LÝ DỮ LIỆU (Data Labels)', meta: 'Onsite · Q.3 (P. Bàn Cờ), TP.HCM · Gross 12 triệu ₫/tháng + phụ cấp đêm', tail: BENEFIT_PUBLIC,
    }),
  },
  {
    match: /^becuai0922-hr-.*-private/,
    subject: {
      vi: '[FYI] Bạn được chọn vào danh sách đề cử — HR Operation (tiếng Hàn) tại BECUAI VIETNAM',
      ko: '[FYI] 추천 후보 명단에 선정되셨습니다 — BECUAI HR Operation(한국어)',
      en: "[FYI] You've been nominated — HR Operation (Korean) at BECUAI",
    },
    desc: 'BECUAI(V190) HR Operation recommend (9/22 Len 등록 당일, 70명): 비공개 프레임 — HR Admin+총무+내부 재무, 대졸 무경력, TOPIK 4+, 20~35세(여성 우대), Q3 onsite 월~금 09-18시, 급여 협의. 컷=korean_cert TOPIK 4+/고급 × ≤10y(나이 20~35 대체). hcm 그룹(HCM 명시+빈값, 한글 표기 호찌민 포함) 35 먼저 → remote 그룹(타지역: 하노이·다낭·한국 등, 온사이트는 카피로 자기선별) 35. HCM 한국어 인증 풀 소진(어제 V189 Data Labels 25통·9/14 V22 29통 겹침, 7일 3통+ 9명 제외)이라 유저 결정으로 D(지역 무관)까지 확장. BECUAI 3공고 지원자 11 제외, V189/V22 기수신은 다른 공고이므로 포함. 가점=HR/사무 시그널 > ≤3y > HCM 명시 > TOPIK 5-6.',
    source: 'scripts/outreach/becuai0922-hr-recommend-coldmail.mjs',
    html: (lang) => recommendShell(lang, {
      intro: {
        vi: '<b>BECUAI VIETNAM</b> đang tuyển <b>HR Operation</b> (HR Admin + Tổng vụ + Tài chính nội bộ) qua FYI — <b>không yêu cầu kinh nghiệm</b>. Công việc: quản lý lương &amp; nghỉ phép năm, khai báo BHXH, lập phiếu lương; thu thập hóa đơn/chứng từ, tổng hợp &amp; báo cáo chi tiêu; soạn thảo &amp; lưu trữ hợp đồng, tiếp nhận yêu cầu nội bộ. Yêu cầu: tốt nghiệp đại học, <b>tiếng Hàn đọc hiểu, giao tiếp khá (tối thiểu TOPIK 4)</b>, tin học văn phòng, tính cách hướng nội &amp; làm việc độc lập; 20–35 tuổi (ưu tiên nữ). <b>Thứ 2–Thứ 6, 09:00–18:00</b> tại Quận 3 (P. Bàn Cờ), nghỉ lễ Hàn Quốc. Lương thỏa thuận khi phỏng vấn.',
        ko: '<b>BECUAI VIETNAM</b>이 FYI를 통해 <b>HR Operation</b>(HR 행정+총무+내부 재무) 채용 중, 무경력 가능. 급여·연차 관리, 사회보험 신고, 급여명세 작성, 비용 증빙 수집·지출 보고, 계약서 작성·관리, 내부 요청 접수. 대졸·한국어 독해/회화(최소 TOPIK 4)·사무 SW, 내향적·독립 근무 성향, 20~35세(여성 우대). 3군 온사이트 월~금 09–18시, 한국 공휴일 휴무, 급여 면접 시 협의.',
        en: 'BECUAI VIETNAM is hiring HR Operation (HR admin + general affairs + internal finance) via FYI — no experience required. Payroll and annual leave, social insurance filing, payslips, expense documentation and reporting, contract drafting and filing, internal requests. University degree, Korean reading and conversation (TOPIK 4 minimum), office software, introverted and independent working style, age 20–35 (female preferred). Onsite District 3, Mon–Fri 9–6, Korean holidays off, salary negotiable at interview.',
      },
      initial: 'B', company: 'BECUAI VIETNAM', title: 'HR Operation', meta: 'Onsite · Q.3 (P. Bàn Cờ), TP.HCM · T2–T6 09:00–18:00 · Lương thỏa thuận', tail: BENEFIT_PRIVATE,
    }),
  },
  {
    match: /^becuai0922-hr-/,
    subject: {
      vi: '[FYI] Bạn được chọn vào danh sách đề cử gửi BECUAI VIETNAM — HR Operation (tiếng Hàn)',
      ko: '[FYI] BECUAI 추천 명단에 선정되셨습니다 — HR Operation(한국어)',
      en: "[FYI] You've been nominated to BECUAI — HR Operation (Korean)",
    },
    desc: 'BECUAI(V190) HR Operation recommend (9/22): 공개 프레임 — FYI 검토 선정·명단에 프로필 동봉·지원 시 우선 검토. 컷은 private 항목과 동일.',
    source: 'scripts/outreach/becuai0922-hr-recommend-coldmail.mjs',
    html: (lang) => recommendShell(lang, {
      intro: {
        vi: '<b>BECUAI VIETNAM</b> đang tuyển <b>HR Operation</b> (HR Admin + Tổng vụ + Tài chính nội bộ) qua FYI — <b>không yêu cầu kinh nghiệm</b>. Công việc: quản lý lương &amp; nghỉ phép năm, khai báo BHXH, lập phiếu lương; thu thập hóa đơn/chứng từ, tổng hợp &amp; báo cáo chi tiêu; soạn thảo &amp; lưu trữ hợp đồng, tiếp nhận yêu cầu nội bộ. Yêu cầu: tốt nghiệp đại học, <b>tiếng Hàn đọc hiểu, giao tiếp khá (tối thiểu TOPIK 4)</b>, tin học văn phòng, tính cách hướng nội &amp; làm việc độc lập; 20–35 tuổi (ưu tiên nữ). <b>Thứ 2–Thứ 6, 09:00–18:00</b> tại Quận 3 (P. Bàn Cờ), nghỉ lễ Hàn Quốc. Lương thỏa thuận khi phỏng vấn.',
        ko: '<b>BECUAI VIETNAM</b>이 FYI를 통해 <b>HR Operation</b>(HR 행정+총무+내부 재무) 채용 중, 무경력 가능. 급여·연차 관리, 사회보험 신고, 급여명세 작성, 비용 증빙 수집·지출 보고, 계약서 작성·관리, 내부 요청 접수. 대졸·한국어 독해/회화(최소 TOPIK 4)·사무 SW, 내향적·독립 근무 성향, 20~35세(여성 우대). 3군 온사이트 월~금 09–18시, 한국 공휴일 휴무, 급여 면접 시 협의.',
        en: 'BECUAI VIETNAM is hiring HR Operation (HR admin + general affairs + internal finance) via FYI — no experience required. Payroll and annual leave, social insurance filing, payslips, expense documentation and reporting, contract drafting and filing, internal requests. University degree, Korean reading and conversation (TOPIK 4 minimum), office software, introverted and independent working style, age 20–35 (female preferred). Onsite District 3, Mon–Fri 9–6, Korean holidays off, salary negotiable at interview.',
      },
      initial: 'B', company: 'BECUAI VIETNAM', title: 'HR Operation', meta: 'Onsite · Q.3 (P. Bàn Cờ), TP.HCM · T2–T6 09:00–18:00 · Lương thỏa thuận', tail: BENEFIT_PUBLIC,
    }),
  },
  {
    match: /^labtobottle0922-.*-private/,
    subject: {
      vi: '[FYI] Bạn được chọn vào danh sách đề cử — AI Digital Marketing Developer tại Labtobottle',
      ko: '[FYI] 추천 후보 명단에 선정되셨습니다 — Labtobottle AI 디지털 마케팅 개발자',
      en: "[FYI] You've been nominated — AI Digital Marketing Developer at Labtobottle",
    },
    desc: 'Labtobottle(R206) AI Digital Marketing Developer recommend (9/22 등록 당일, 456명): 비공개 프레임 — 한국 하이테크 양조 스타트업(KAIST), 생성형 AI API 기반 마케팅 자동화·SNS 운영·웹/SEO·콘텐츠 디자인·베트남 로컬 마케팅. 영어 or 한국어, API/LLM 경험, 풀스택 프로젝트. HCM/HN/ĐN onsite 15-20M. 다음 주 다낭 방문 결정이 걸려 당일 발송(호현). 컷=3개 도시+미기재 × ≤6y. hybrid 그룹(마케팅×AI×코드 ∪ 마케팅직군×AI 도구 ∪ 개발직군×마케팅 텍스트) 우선 → mkt 그룹(마케팅 직군 × 디지털/SNS 텍스트 × 영어or한국어 cert). 유저 결정 "영어 혹은 한국어 정도로 가서 464". 개발자×LLM(마케팅 무관) 271은 15-20M·마케팅 비중 미스매치라 제외. 당일 겹침 89(야오하 2차 마케터 중복)·동일인 2계정 8 제외, 7일 게이트 미적용. 가점=마케팅·AI·코드 3축 > 언어 cert > 다낭 거주. 이벤트 meta.city 로 도시별 반응 추적.',
    source: 'scripts/outreach/labtobottle0922-recommend-coldmail.mjs',
    html: (lang) => recommendShell(lang, {
      intro: {
        vi: '<b>Labtobottle</b> — startup công nghệ rượu cao cấp (Hi-tech K-Brewery) của Hàn Quốc, thành lập bởi đội ngũ Kỹ thuật Hóa học KAIST — đang tuyển <b>AI Digital Marketing Developer</b> qua FYI. Công việc: xây dựng hệ thống marketing dựa trên AI (tự động hóa nội dung SNS, copy quảng cáo, hình ảnh &amp; video bằng Generative AI API), vận hành &amp; phân tích SNS (Facebook, Instagram, TikTok, YouTube), website/landing page, SEO &amp; GA, nội dung digital (Photoshop, Canva, Figma, CapCut, AI Tool), localize marketing cho Việt Nam. Yêu cầu: SNS marketing &amp; AI, <b>tiếng Anh hoặc tiếng Hàn</b>, tích hợp API &amp; xử lý dữ liệu, đã dùng AI API/LLM &amp; ChatGPT/Claude/Gemini, dự án full-stack, network marketing/sales. Onsite <b>TP.HCM, Hà Nội hoặc Đà Nẵng</b>. Lương <b>15–20 triệu ₫/tháng</b>.',
        ko: 'KAIST 화공 출신이 세운 한국 하이테크 양조 스타트업 <b>Labtobottle</b>이 FYI를 통해 <b>AI 디지털 마케팅 개발자</b>를 채용 중. 생성형 AI API로 SNS 콘텐츠·광고 카피·이미지·영상 제작 자동화, SNS 채널 운영·분석, 웹/랜딩·SEO·GA, 디지털 콘텐츠 디자인, 베트남 로컬 마케팅·인플루언서 협업. 요건은 SNS·AI 마케팅, 영어 또는 한국어, API 연동·데이터 처리, AI API/LLM·ChatGPT 등 활용 경험, 풀스택 프로젝트, 마케팅·영업 네트워크. HCM/하노이/다낭 온사이트, 월 1,500만~2,000만 동.',
        en: 'Labtobottle — a Korean hi-tech K-brewery startup founded by KAIST chemical engineers — is hiring an AI Digital Marketing Developer via FYI. Build AI-driven marketing automation (SNS content, ad copy, image and video via generative AI APIs), run and analyze SNS channels, manage web/landing pages, SEO and GA, produce digital content, and localize marketing for Vietnam. Requires SNS and AI marketing skills, English or Korean, API integration and data handling, hands-on AI API/LLM and ChatGPT/Claude/Gemini use, full-stack project experience, marketing/sales network. Onsite in HCMC, Hanoi or Da Nang, 15–20M VND/month.',
      },
      initial: 'L', company: 'Labtobottle', title: 'AI Digital Marketing Developer', meta: 'Onsite · TP.HCM / Hà Nội / Đà Nẵng · 15–20 triệu ₫/tháng', tail: BENEFIT_PRIVATE,
    }),
  },
  {
    match: /^labtobottle0922-/,
    subject: {
      vi: '[FYI] Bạn được chọn vào danh sách đề cử gửi Labtobottle — AI Digital Marketing Developer',
      ko: '[FYI] Labtobottle 추천 명단에 선정되셨습니다 — AI 디지털 마케팅 개발자',
      en: "[FYI] You've been nominated to Labtobottle — AI Digital Marketing Developer",
    },
    desc: 'Labtobottle(R206) AI Digital Marketing Developer recommend (9/22): 공개 프레임 — FYI 검토 선정·명단에 프로필 동봉·지원 시 우선 검토. 컷은 private 항목과 동일.',
    source: 'scripts/outreach/labtobottle0922-recommend-coldmail.mjs',
    html: (lang) => recommendShell(lang, {
      intro: {
        vi: '<b>Labtobottle</b> — startup công nghệ rượu cao cấp (Hi-tech K-Brewery) của Hàn Quốc, thành lập bởi đội ngũ Kỹ thuật Hóa học KAIST — đang tuyển <b>AI Digital Marketing Developer</b> qua FYI. Công việc: xây dựng hệ thống marketing dựa trên AI (tự động hóa nội dung SNS, copy quảng cáo, hình ảnh &amp; video bằng Generative AI API), vận hành &amp; phân tích SNS (Facebook, Instagram, TikTok, YouTube), website/landing page, SEO &amp; GA, nội dung digital (Photoshop, Canva, Figma, CapCut, AI Tool), localize marketing cho Việt Nam. Yêu cầu: SNS marketing &amp; AI, <b>tiếng Anh hoặc tiếng Hàn</b>, tích hợp API &amp; xử lý dữ liệu, đã dùng AI API/LLM &amp; ChatGPT/Claude/Gemini, dự án full-stack, network marketing/sales. Onsite <b>TP.HCM, Hà Nội hoặc Đà Nẵng</b>. Lương <b>15–20 triệu ₫/tháng</b>.',
        ko: 'KAIST 화공 출신이 세운 한국 하이테크 양조 스타트업 <b>Labtobottle</b>이 FYI를 통해 <b>AI 디지털 마케팅 개발자</b>를 채용 중. 생성형 AI API로 SNS 콘텐츠·광고 카피·이미지·영상 제작 자동화, SNS 채널 운영·분석, 웹/랜딩·SEO·GA, 디지털 콘텐츠 디자인, 베트남 로컬 마케팅·인플루언서 협업. 요건은 SNS·AI 마케팅, 영어 또는 한국어, API 연동·데이터 처리, AI API/LLM·ChatGPT 등 활용 경험, 풀스택 프로젝트, 마케팅·영업 네트워크. HCM/하노이/다낭 온사이트, 월 1,500만~2,000만 동.',
        en: 'Labtobottle — a Korean hi-tech K-brewery startup founded by KAIST chemical engineers — is hiring an AI Digital Marketing Developer via FYI. Build AI-driven marketing automation (SNS content, ad copy, image and video via generative AI APIs), run and analyze SNS channels, manage web/landing pages, SEO and GA, produce digital content, and localize marketing for Vietnam. Requires SNS and AI marketing skills, English or Korean, API integration and data handling, hands-on AI API/LLM and ChatGPT/Claude/Gemini use, full-stack project experience, marketing/sales network. Onsite in HCMC, Hanoi or Da Nang, 15–20M VND/month.',
      },
      initial: 'L', company: 'Labtobottle', title: 'AI Digital Marketing Developer', meta: 'Onsite · TP.HCM / Hà Nội / Đà Nẵng · 15–20 triệu ₫/tháng', tail: BENEFIT_PUBLIC,
    }),
  },
  {
    match: /^becuai0923-hr-.*-private/,
    subject: {
      vi: '[FYI] Bạn được chọn vào danh sách đề cử — Nhân viên bộ phận Operation (tiếng Hàn) tại BECUAI VIETNAM',
      ko: '[FYI] 추천 후보 명단에 선정되셨습니다 — BECUAI 운영부서(한국어)',
      en: "[FYI] You've been nominated — Operation staff (Korean) at BECUAI",
    },
    desc: 'BECUAI(V190) HR Operation recommend 2차 (9/23 JD 개정 반영, 70명): 비공개 프레임 — 개정 JD "한국어 4기술·회화 가능, TOPIK 불요" → 컷을 TOPIK 3급 수준 이상으로 완화. cert TOPIK3/중급 + 등급불명 표기 + cert 없음×한국어 전공/통번역 직군 + 1차에서 7일 게이트로 빠진 TOPIK4+. hcm 42 → remote 28. 초급 cert 22·텍스트 오탐 4 제외. 1차 수신 64·BECUAI 지원자 21·블랙리스트 제외. 카피는 개정 JD(한베 면접, 외부 서비스 처리→진도 관리·보고, 기본 회계·VAT·구매, Excel·AI, 한국어 수당)로 재작성.',
    source: 'scripts/outreach/becuai0923-hr-recommend-coldmail.mjs',
    html: (lang) => recommendShell(lang, {
      intro: {
        vi: '<b>BECUAI VIETNAM</b> đang tuyển <b>Nhân viên bộ phận Operation</b> (HR Operation) qua FYI — <b>không yêu cầu kinh nghiệm</b>, phỏng vấn bằng tiếng Hàn và tiếng Việt. Công việc: theo dõi tiến độ &amp; báo cáo Recruitment, C&amp;B, Payroll, PIT, BHXH, Training, hành chính (công ty dùng dịch vụ riêng xử lý nghiệp vụ); kế toán cơ bản &amp; quản lý quỹ/thu chi; mua sắm thiết bị, văn phòng phẩm; xuất hóa đơn VAT; hỗ trợ Giám đốc; trao đổi với quản lý người Hàn. Yêu cầu: tốt nghiệp đại học, <b>tiếng Hàn tốt 4 kỹ năng, giao tiếp được (không yêu cầu TOPIK)</b>, trầm tĩnh, cẩn thận, làm việc độc lập &amp; báo cáo rõ ràng, thành thạo Excel &amp; công cụ AI. <b>Thứ 2–Thứ 6, 09:00–18:00</b> tại Quận 3. Lương thỏa thuận, thử việc 2 tháng 85%, <b>phụ cấp theo năng lực tiếng Hàn</b>.',
        ko: '<b>BECUAI VIETNAM</b>이 FYI를 통해 <b>운영부서 직원(HR Operation)</b> 채용 중, 무경력 가능, 한국어·베트남어 면접. 채용·C&B·급여·PIT·사회보험·교육·행정은 외부 서비스가 처리하고 진도 관리·보고 위주, 기본 회계·자금 관리, 비품 구매, VAT 발행, 이사 지원, 한국인 관리자와 소통. 대졸·한국어 4기술 회화 가능(TOPIK 불요)·차분하고 독립적인 성향·Excel·AI 도구. 3군 온사이트 월~금 09–18시, 급여 협의, 수습 2개월 85%, 한국어 실력에 따른 수당.',
        en: 'BECUAI VIETNAM is hiring an Operation staff (HR Operation) via FYI — no experience required, interview in Korean and Vietnamese. Track and report recruitment, C&B, payroll, PIT, social insurance, training and admin (an outside service handles the work), basic accounting and cash management, purchasing, VAT invoicing, support the director, communicate with Korean managers. University degree, good Korean in all four skills (no TOPIK required), calm and independent, Excel and AI tools. Onsite District 3, Mon–Fri 9–6, salary negotiable, 2-month probation at 85%, allowance by Korean level.',
      },
      initial: 'B', company: 'BECUAI VIETNAM', title: 'Nhân viên bộ phận Operation (HR Operation)', meta: 'Onsite · Q.3 (P. Bàn Cờ), TP.HCM · T2–T6 09:00–18:00 · Lương thỏa thuận + phụ cấp tiếng Hàn', tail: BENEFIT_PRIVATE,
    }),
  },
  {
    match: /^becuai0923-hr-/,
    subject: {
      vi: '[FYI] Bạn được chọn vào danh sách đề cử gửi BECUAI VIETNAM — Nhân viên bộ phận Operation (tiếng Hàn)',
      ko: '[FYI] BECUAI 추천 명단에 선정되셨습니다 — 운영부서(한국어)',
      en: "[FYI] You've been nominated to BECUAI — Operation staff (Korean)",
    },
    desc: 'BECUAI(V190) HR Operation recommend 2차 (9/23): 공개 프레임 — 컷은 private 항목과 동일.',
    source: 'scripts/outreach/becuai0923-hr-recommend-coldmail.mjs',
    html: (lang) => recommendShell(lang, {
      intro: {
        vi: '<b>BECUAI VIETNAM</b> đang tuyển <b>Nhân viên bộ phận Operation</b> (HR Operation) qua FYI — <b>không yêu cầu kinh nghiệm</b>, phỏng vấn bằng tiếng Hàn và tiếng Việt. Công việc: theo dõi tiến độ &amp; báo cáo Recruitment, C&amp;B, Payroll, PIT, BHXH, Training, hành chính (công ty dùng dịch vụ riêng xử lý nghiệp vụ); kế toán cơ bản &amp; quản lý quỹ/thu chi; mua sắm thiết bị, văn phòng phẩm; xuất hóa đơn VAT; hỗ trợ Giám đốc; trao đổi với quản lý người Hàn. Yêu cầu: tốt nghiệp đại học, <b>tiếng Hàn tốt 4 kỹ năng, giao tiếp được (không yêu cầu TOPIK)</b>, trầm tĩnh, cẩn thận, làm việc độc lập &amp; báo cáo rõ ràng, thành thạo Excel &amp; công cụ AI. <b>Thứ 2–Thứ 6, 09:00–18:00</b> tại Quận 3. Lương thỏa thuận, thử việc 2 tháng 85%, <b>phụ cấp theo năng lực tiếng Hàn</b>.',
        ko: '<b>BECUAI VIETNAM</b>이 FYI를 통해 <b>운영부서 직원(HR Operation)</b> 채용 중, 무경력 가능, 한국어·베트남어 면접. 채용·C&B·급여·PIT·사회보험·교육·행정은 외부 서비스가 처리하고 진도 관리·보고 위주, 기본 회계·자금 관리, 비품 구매, VAT 발행, 이사 지원, 한국인 관리자와 소통. 대졸·한국어 4기술 회화 가능(TOPIK 불요)·차분하고 독립적인 성향·Excel·AI 도구. 3군 온사이트 월~금 09–18시, 급여 협의, 수습 2개월 85%, 한국어 실력에 따른 수당.',
        en: 'BECUAI VIETNAM is hiring an Operation staff (HR Operation) via FYI — no experience required, interview in Korean and Vietnamese. Track and report recruitment, C&B, payroll, PIT, social insurance, training and admin (an outside service handles the work), basic accounting and cash management, purchasing, VAT invoicing, support the director, communicate with Korean managers. University degree, good Korean in all four skills (no TOPIK required), calm and independent, Excel and AI tools. Onsite District 3, Mon–Fri 9–6, salary negotiable, 2-month probation at 85%, allowance by Korean level.',
      },
      initial: 'B', company: 'BECUAI VIETNAM', title: 'Nhân viên bộ phận Operation (HR Operation)', meta: 'Onsite · Q.3 (P. Bàn Cờ), TP.HCM · T2–T6 09:00–18:00 · Lương thỏa thuận + phụ cấp tiếng Hàn', tail: BENEFIT_PUBLIC,
    }),
  },
  {
    match: /^sunrise0923-.*-private/,
    subject: {
      vi: '[FYI] Bạn được chọn vào danh sách đề cử — Chuyên viên Sales tại Sunrise Vina',
      ko: '[FYI] 추천 후보 명단에 선정되셨습니다 — Sunrise Vina B2B 영업',
      en: "[FYI] You've been nominated — Sales Executive at Sunrise Vina",
    },
    desc: 'Sunrise Vina(V71) B2B 영업 recommend 2차 (9/23, 133명): 비공개 프레임 — 9/23 면접 당일 후보자 취소(타사 오퍼)로 기업이 CV 추가 요청. 1차 9/7 45 + 9/14 5 → 지원 4. 컷=HCM/HN/BD+미기재 × 1~8y(15-20M 밴드) × 영업(직군 필드 core 23 → 경력 텍스트 영업 직함 txt 110). 야오하 2차(9/22)와 58명 겹치나 다른 공고·급여대라 포함(7일 게이트 미적용). 인쇄·포장 도메인은 풀에 거의 없어 가점만. V71 기수신·지원자·블랙리스트·당일 겹침 5 제외. 가점=인쇄·포장·산업재 > 영어 cert > 지역 명시 > 1~3y.',
    source: 'scripts/outreach/sunrise0923-recommend-coldmail.mjs',
    html: (lang) => recommendShell(lang, {
      intro: {
        vi: '<b>Sunrise Vina</b> — doanh nghiệp sản xuất Hàn Quốc — đang tuyển <b>Chuyên viên Sales (B2B)</b> qua FYI. Công việc: đi thị trường &amp; quảng bá sản phẩm tới khách hàng khu vực phụ trách, thiết lập &amp; duy trì quan hệ với khách hàng chính và người ra quyết định, cập nhật xu hướng thị trường &amp; đối thủ, thu thập phản hồi khách hàng. Yêu cầu: <b>kinh nghiệm sales 1–2 năm</b>, tiếng Anh căn bản; ưu tiên hiểu biết &amp; quan hệ trong <b>ngành in ấn bao bì</b>. <b>TP.HCM / Hà Nội / Bình Dương</b>, Thứ 2 đến trưa Thứ 7, chỉ đến nhà máy khi được yêu cầu, <b>có xe đưa đón</b>. Lương <b>15–20 triệu ₫</b>, deal theo năng lực, tăng lương hàng năm.',
        ko: '한국계 제조사 <b>Sunrise Vina</b>가 FYI를 통해 <b>B2B 영업 담당</b>을 채용 중. 담당 지역 시장 방문·제품 홍보, 핵심 고객 및 의사결정자 관계 구축, 시장·경쟁사 동향 파악, 고객 피드백 수집. 영업 경력 1~2년, 기본 영어 회화, 인쇄·포장 업계 이해와 인맥 우대. HCM/하노이/빈즈엉, 월~토 오전, 공장은 요청 시만 방문, 통근 셔틀 제공. 월 1,500만~2,000만 동, 능력에 따라 협의, 연 1회 인상.',
        en: 'Sunrise Vina — a Korean manufacturer — is hiring a B2B Sales Executive via FYI. Visit the market and promote products in your territory, build relationships with key accounts and decision makers, track market and competitor trends, collect customer feedback. Requires 1–2 years of sales experience and basic English; printing and packaging industry knowledge and network preferred. HCMC / Hanoi / Binh Duong, Mon to Sat noon, factory visits only on request, shuttle provided. 15–20M VND, negotiable, annual raise.',
      },
      initial: 'S', company: 'Sunrise Vina', title: 'Chuyên viên Sales', meta: 'Onsite · TP.HCM / Hà Nội / Bình Dương · 15–20 triệu ₫/tháng · Có xe đưa đón', tail: BENEFIT_PRIVATE,
    }),
  },
  {
    match: /^sunrise0923-/,
    subject: {
      vi: '[FYI] Bạn được chọn vào danh sách đề cử gửi Sunrise Vina — Chuyên viên Sales',
      ko: '[FYI] Sunrise Vina 추천 명단에 선정되셨습니다 — B2B 영업',
      en: "[FYI] You've been nominated to Sunrise Vina — Sales Executive",
    },
    desc: 'Sunrise Vina(V71) B2B 영업 recommend 2차 (9/23): 공개 프레임 — 컷은 private 항목과 동일.',
    source: 'scripts/outreach/sunrise0923-recommend-coldmail.mjs',
    html: (lang) => recommendShell(lang, {
      intro: {
        vi: '<b>Sunrise Vina</b> — doanh nghiệp sản xuất Hàn Quốc — đang tuyển <b>Chuyên viên Sales (B2B)</b> qua FYI. Công việc: đi thị trường &amp; quảng bá sản phẩm tới khách hàng khu vực phụ trách, thiết lập &amp; duy trì quan hệ với khách hàng chính và người ra quyết định, cập nhật xu hướng thị trường &amp; đối thủ, thu thập phản hồi khách hàng. Yêu cầu: <b>kinh nghiệm sales 1–2 năm</b>, tiếng Anh căn bản; ưu tiên hiểu biết &amp; quan hệ trong <b>ngành in ấn bao bì</b>. <b>TP.HCM / Hà Nội / Bình Dương</b>, Thứ 2 đến trưa Thứ 7, chỉ đến nhà máy khi được yêu cầu, <b>có xe đưa đón</b>. Lương <b>15–20 triệu ₫</b>, deal theo năng lực, tăng lương hàng năm.',
        ko: '한국계 제조사 <b>Sunrise Vina</b>가 FYI를 통해 <b>B2B 영업 담당</b>을 채용 중. 담당 지역 시장 방문·제품 홍보, 핵심 고객 및 의사결정자 관계 구축, 시장·경쟁사 동향 파악, 고객 피드백 수집. 영업 경력 1~2년, 기본 영어 회화, 인쇄·포장 업계 이해와 인맥 우대. HCM/하노이/빈즈엉, 월~토 오전, 공장은 요청 시만 방문, 통근 셔틀 제공. 월 1,500만~2,000만 동, 능력에 따라 협의, 연 1회 인상.',
        en: 'Sunrise Vina — a Korean manufacturer — is hiring a B2B Sales Executive via FYI. Visit the market and promote products in your territory, build relationships with key accounts and decision makers, track market and competitor trends, collect customer feedback. Requires 1–2 years of sales experience and basic English; printing and packaging industry knowledge and network preferred. HCMC / Hanoi / Binh Duong, Mon to Sat noon, factory visits only on request, shuttle provided. 15–20M VND, negotiable, annual raise.',
      },
      initial: 'S', company: 'Sunrise Vina', title: 'Chuyên viên Sales', meta: 'Onsite · TP.HCM / Hà Nội / Bình Dương · 15–20 triệu ₫/tháng · Có xe đưa đón', tail: BENEFIT_PUBLIC,
    }),
  },
  {
    match: /^poscoui0925-.*-private/,
    subject: {
      vi: '[FYI] Bạn được chọn vào danh sách đề cử — Senior UI Designer tại POSCO DX VIETNAM (TP.HCM)',
      ko: '[FYI] 추천 후보 명단에 선정되셨습니다 — POSCO DX VIETNAM Senior UI Designer',
      en: "[FYI] You've been nominated — Senior UI Designer at POSCO DX VIETNAM",
    },
    desc: 'POSCO DX VIETNAM Senior UI Designer(V195) recommend (9/25): 비공개 프레임 — onsite 7군(Cobi Tower I)·급여 협의·UI/UX 디자인 5년+ 필수·Figma/XD/Sketch·와이어프레임/프로토타입·HTML/CSS 친숙·디자인시스템 우대·영어 소통(한국어 우대). 컷=(Design 직군 or UI/UX 텍스트) × 경력 60개월+ × HCMC권/위치 미기재 × (UI/UX 텍스트 or Figma/XD/Sketch 명시) — 실측 33명(그래픽/영상만 16·타지역 22·3~5y 25는 제외). 언어는 게이트 제외(V187 교훈), 정렬 가점만.',
    source: 'scripts/outreach/poscoui0925-recommend-coldmail.mjs',
    html: (lang) => recommendShell(lang, {
      intro: {
        vi: '<b>POSCO DX VIETNAM</b> — trung tâm phát triển offshore (ODC) làm việc trực tiếp với trụ sở Hàn Quốc của tập đoàn POSCO — đang tuyển <b>Senior UI Designer</b> qua FYI. Công việc: phối hợp với PM và đội phát triển để xác định chiến lược UI/UX; thiết kế wireframe, user flow, mockup, prototype và giao diện high-fidelity cho web &amp; mobile; xây dựng Design System, style guide, thư viện UI component; nghiên cứu UX, cải thiện usability. Yêu cầu: tối thiểu 5 năm kinh nghiệm UI/UX, thành thạo Figma/Adobe XD/Sketch, quen HTML/CSS/JS, làm việc Agile với đội phát triển. Ưu tiên: Design System, dùng AI trong thiết kế, dự án enterprise/ERP/MES, tiếng Anh tốt (tiếng Hàn là lợi thế). Phúc lợi: lương thưởng cạnh tranh, bảo hiểm PVI 24/7, cơ hội sang trụ sở POSCO DX Hàn Quốc, hỗ trợ học tiếng Hàn.',
        ko: 'POSCO 그룹 한국 본사와 직접 협업하는 베트남 ODC <b>POSCO DX VIETNAM</b>이 FYI를 통해 <b>Senior UI Designer</b>를 채용 중. PM·개발팀과 UI/UX 전략 수립, 웹·모바일 와이어프레임/유저플로우/프로토타입/하이파이 UI 설계, 디자인시스템·스타일가이드·컴포넌트 라이브러리 구축, UX 리서치. UI/UX 5년+ 필수, Figma/XD/Sketch, HTML/CSS/JS 친숙, Agile 협업. 디자인시스템·AI 활용·엔터프라이즈/ERP/MES 경험 우대, 영어 소통(한국어 우대). 7군 Cobi Tower I 온사이트, 급여 협의, PVI 상해보험·한국 본사 방문 기회·한국어 학습 지원.',
        en: 'POSCO DX VIETNAM — the POSCO group offshore development center (ODC) working directly with Korea HQ — is hiring a Senior UI Designer via FYI. Define UI/UX strategy with PMs and developers, design wireframes/user flows/prototypes/high-fidelity UI for web & mobile, build and maintain design systems and component libraries, run UX research. Requires 5+ years of UI/UX, Figma/Adobe XD/Sketch, HTML/CSS/JS familiarity, Agile collaboration. Design systems, AI-assisted workflows, enterprise/ERP/MES projects and strong English (Korean a plus) preferred. Onsite District 7, salary negotiable, PVI insurance, Korea HQ visits, Korean lessons.',
      },
      initial: 'P', company: 'POSCO DX VIETNAM', title: 'Senior UI Designer', meta: 'Onsite · Quận 7, TP.HCM · Senior (5 năm+) · Lương thỏa thuận', tail: BENEFIT_PRIVATE,
    }),
  },
  {
    match: /^poscoui0925-/,
    subject: {
      vi: '[FYI] Bạn được chọn vào danh sách đề cử gửi POSCO DX VIETNAM — Senior UI Designer (TP.HCM)',
      ko: '[FYI] POSCO DX VIETNAM 추천 명단에 선정되셨습니다 — Senior UI Designer',
      en: "[FYI] You've been nominated to POSCO DX VIETNAM — Senior UI Designer",
    },
    desc: 'POSCO DX VIETNAM Senior UI Designer(V195) recommend (9/25): 공개 프레임 — FYI 검토 선정·명단에 프로필 동봉·지원 시 우선 검토. 컷은 private 항목과 동일.',
    source: 'scripts/outreach/poscoui0925-recommend-coldmail.mjs',
    html: (lang) => recommendShell(lang, {
      intro: {
        vi: '<b>POSCO DX VIETNAM</b> — trung tâm phát triển offshore (ODC) làm việc trực tiếp với trụ sở Hàn Quốc của tập đoàn POSCO — đang tuyển <b>Senior UI Designer</b> (onsite Quận 7, TP.HCM, 5 năm+ UI/UX) qua FYI. Đội ngũ FYI đã xem xét toàn bộ hồ sơ và <b>chọn bạn vào danh sách đề cử</b> — hồ sơ công khai của bạn sẽ được gửi kèm danh sách cho nhà tuyển dụng trong tuần này.',
        ko: 'POSCO 그룹 한국 본사와 직접 협업하는 베트남 ODC <b>POSCO DX VIETNAM</b>의 Senior UI Designer(7군 온사이트, UI/UX 5년+) 포지션 — FYI 팀이 이력서 전체를 검토해 회원님을 <b>추천 명단에 선정</b>했으며, 공개 프로필은 이번 주 명단과 함께 담당자에게 전달됩니다.',
        en: "POSCO DX VIETNAM Senior UI Designer (onsite District 7, HCMC, 5+ years UI/UX) — the FYI team reviewed all profiles and <b>nominated you</b>; your public profile goes to the recruiter with this week's list.",
      },
      initial: 'P', company: 'POSCO DX VIETNAM', title: 'Senior UI Designer', meta: 'Onsite · Quận 7, TP.HCM · Senior (5 năm+) · Lương thỏa thuận', tail: BENEFIT_PUBLIC,
    }),
  },
  {
    match: /^systeel0925-recommend-sm-private/,
    subject: {
      vi: '[FYI] Bạn được chọn vào danh sách đề cử — Sales Manager tại SY STEEL VINA',
      ko: '[FYI] 추천 후보 명단에 선정되셨습니다 — SY STEEL VINA 영업 관리자',
      en: "[FYI] You've been nominated — Sales Manager at SY STEEL VINA",
    },
    desc: 'SY STEEL VINA Sales Manager(V200) recommend (9/25 Len 게재 당일): 비공개 프레임 — 하노이 Mễ Trì 온사이트·영업 3년+·철강/판넬/건자재 업계 우대·영어 회화·KPI 보너스. 컷=영업 직군/경력 × 경력 36개월+ × 하노이권/미기재(캐스케이드 1순위, 실측 62). 언어 게이트 없음(가점만), 6공고 1인1통 캐스케이드 SM→Salesman→회계→창고→QC→R&D.',
    source: 'scripts/outreach/systeel0925-recommend-coldmail.mjs',
    html: (lang) => recommendShell(lang, {
      intro: {
        vi: '<b>SY STEEL VINA</b> — doanh nghiệp sản xuất tôn thép Hàn Quốc — đang tuyển <b>Sales Manager</b> (văn phòng Mễ Trì, Hà Nội) qua FYI. Yêu cầu: đại học ngành Kinh doanh/Marketing, từ 3 năm kinh nghiệm vị trí tương đương, ưu tiên ngành tôn thép/panel/VLXD/cửa/thiết bị công nghiệp, tiếng Anh giao tiếp. Lương &amp; thưởng KPI cạnh tranh, cơ hội thăng tiến nhanh.',
        ko: '한국계 철강 제조사 <b>SY STEEL VINA</b> 하노이 사무소 <b>Sales Manager</b> — 경영/마케팅 대졸, 동일 직무 3년+, 철강/판넬/건자재 업계 우대, 영어 회화. 경쟁력 있는 급여·KPI 보너스, 빠른 승진.',
        en: 'SY STEEL VINA — a Korean steel manufacturer — is hiring a Sales Manager (Me Tri, Hanoi). Business/Marketing degree, 3+ years in a similar role, steel/panel/construction-materials industry preferred, conversational English. Competitive salary and KPI bonus.',
      },
      initial: 'S', company: 'SY STEEL VINA', title: 'Sales Manager', meta: 'Onsite · Mễ Trì, Hà Nội · 3 năm+ · Lương thỏa thuận', tail: BENEFIT_PRIVATE,
    }),
  },
  {
    match: /^systeel0925-recommend-sm-/,
    subject: {
      vi: '[FYI] Bạn được chọn vào danh sách đề cử gửi SY STEEL VINA — Sales Manager',
      ko: '[FYI] SY STEEL VINA 추천 명단에 선정되셨습니다 — 영업 관리자',
      en: "[FYI] You've been nominated to SY STEEL VINA — Sales Manager",
    },
    desc: 'SY STEEL VINA Sales Manager(V200) recommend (9/25): 공개 프레임 — FYI 검토 선정·명단에 프로필 동봉·지원 시 우선 검토. 컷은 private 항목과 동일.',
    source: 'scripts/outreach/systeel0925-recommend-coldmail.mjs',
    html: (lang) => recommendShell(lang, {
      intro: {
        vi: '<b>SY STEEL VINA</b> — doanh nghiệp sản xuất tôn thép Hàn Quốc — đang tuyển <b>Sales Manager</b> (văn phòng Mễ Trì, Hà Nội) qua FYI. Yêu cầu: đại học ngành Kinh doanh/Marketing, từ 3 năm kinh nghiệm vị trí tương đương, ưu tiên ngành tôn thép/panel/VLXD/cửa/thiết bị công nghiệp, tiếng Anh giao tiếp. Lương &amp; thưởng KPI cạnh tranh, cơ hội thăng tiến nhanh.',
        ko: '한국계 철강 제조사 <b>SY STEEL VINA</b> 하노이 사무소 <b>Sales Manager</b> — 경영/마케팅 대졸, 동일 직무 3년+, 철강/판넬/건자재 업계 우대, 영어 회화. 경쟁력 있는 급여·KPI 보너스, 빠른 승진.',
        en: 'SY STEEL VINA — a Korean steel manufacturer — is hiring a Sales Manager (Me Tri, Hanoi). Business/Marketing degree, 3+ years in a similar role, steel/panel/construction-materials industry preferred, conversational English. Competitive salary and KPI bonus.',
      },
      initial: 'S', company: 'SY STEEL VINA', title: 'Sales Manager', meta: 'Onsite · Mễ Trì, Hà Nội · 3 năm+ · Lương thỏa thuận', tail: BENEFIT_PUBLIC,
    }),
  },
  {
    match: /^systeel0925-recommend-sales-private/,
    subject: {
      vi: '[FYI] Bạn được chọn vào danh sách đề cử — Salesman tại SY STEEL VINA',
      ko: '[FYI] 추천 후보 명단에 선정되셨습니다 — SY STEEL VINA 영업(신입 가능)',
      en: "[FYI] You've been nominated — Salesman at SY STEEL VINA",
    },
    desc: 'SY STEEL VINA Salesman(V199) recommend (9/25 Len 게재 당일): 비공개 프레임 — 하노이 Mễ Trì 온사이트·대졸·경제/무역/마케팅/경영 우대·신입 OK(교육 제공)·영어 회화. 컷=영업 직군/경력 × 하노이권/미기재(SM 배정 후 잔여, 실측 54). 언어 게이트 없음(가점만), 6공고 1인1통 캐스케이드 SM→Salesman→회계→창고→QC→R&D.',
    source: 'scripts/outreach/systeel0925-recommend-coldmail.mjs',
    html: (lang) => recommendShell(lang, {
      intro: {
        vi: '<b>SY STEEL VINA</b> — doanh nghiệp sản xuất tôn thép Hàn Quốc — đang tuyển <b>Salesman</b> (văn phòng Mễ Trì, Hà Nội) qua FYI. Yêu cầu: tốt nghiệp đại học, ưu tiên kinh tế/ngoại thương/marketing/QTKD, tiếng Anh giao tiếp; chấp nhận sinh viên mới ra trường, sẽ được đào tạo. Lương thỏa thuận.',
        ko: '한국계 철강 제조사 <b>SY STEEL VINA</b> 하노이 사무소 <b>Salesman</b> — 대졸, 경제/무역/마케팅/경영 우대, 영어 회화, 신입 가능(교육 제공). 급여 협의.',
        en: 'SY STEEL VINA — a Korean steel manufacturer — is hiring a Salesman (Me Tri, Hanoi). University degree, economics/trade/marketing/business preferred, conversational English; fresh graduates accepted and trained. Salary negotiable.',
      },
      initial: 'S', company: 'SY STEEL VINA', title: 'Salesman', meta: 'Onsite · Mễ Trì, Hà Nội · Chấp nhận mới ra trường · Lương thỏa thuận', tail: BENEFIT_PRIVATE,
    }),
  },
  {
    match: /^systeel0925-recommend-sales-/,
    subject: {
      vi: '[FYI] Bạn được chọn vào danh sách đề cử gửi SY STEEL VINA — Salesman',
      ko: '[FYI] SY STEEL VINA 추천 명단에 선정되셨습니다 — 영업(신입 가능)',
      en: "[FYI] You've been nominated to SY STEEL VINA — Salesman",
    },
    desc: 'SY STEEL VINA Salesman(V199) recommend (9/25): 공개 프레임 — FYI 검토 선정·명단에 프로필 동봉·지원 시 우선 검토. 컷은 private 항목과 동일.',
    source: 'scripts/outreach/systeel0925-recommend-coldmail.mjs',
    html: (lang) => recommendShell(lang, {
      intro: {
        vi: '<b>SY STEEL VINA</b> — doanh nghiệp sản xuất tôn thép Hàn Quốc — đang tuyển <b>Salesman</b> (văn phòng Mễ Trì, Hà Nội) qua FYI. Yêu cầu: tốt nghiệp đại học, ưu tiên kinh tế/ngoại thương/marketing/QTKD, tiếng Anh giao tiếp; chấp nhận sinh viên mới ra trường, sẽ được đào tạo. Lương thỏa thuận.',
        ko: '한국계 철강 제조사 <b>SY STEEL VINA</b> 하노이 사무소 <b>Salesman</b> — 대졸, 경제/무역/마케팅/경영 우대, 영어 회화, 신입 가능(교육 제공). 급여 협의.',
        en: 'SY STEEL VINA — a Korean steel manufacturer — is hiring a Salesman (Me Tri, Hanoi). University degree, economics/trade/marketing/business preferred, conversational English; fresh graduates accepted and trained. Salary negotiable.',
      },
      initial: 'S', company: 'SY STEEL VINA', title: 'Salesman', meta: 'Onsite · Mễ Trì, Hà Nội · Chấp nhận mới ra trường · Lương thỏa thuận', tail: BENEFIT_PUBLIC,
    }),
  },
  {
    match: /^systeel0925-recommend-acct-private/,
    subject: {
      vi: '[FYI] Bạn được chọn vào danh sách đề cử — Kế toán thanh toán tại SY STEEL VINA',
      ko: '[FYI] 추천 후보 명단에 선정되셨습니다 — SY STEEL VINA 회계(지급)',
      en: "[FYI] You've been nominated — Kế toán thanh toán at SY STEEL VINA",
    },
    desc: 'SY STEEL VINA Kế toán thanh toán(V196) recommend (9/25 Len 게재 당일): 비공개 프레임 — 동나이 Nhơn Trạch 5공단 온사이트·회계 전공 대졸·Excel/회계 SW·영어 기본·무경력 교육·13개월차. 컷=(Finance 직군 or 회계 텍스트/전공) × 회계 전공 or 회계 직무경력 × 남부권(HCMC/동나이/빈즈엉/BR-VT/롱안)/미기재 × 비개발(실측 80). 언어 게이트 없음(가점만), 6공고 1인1통 캐스케이드 SM→Salesman→회계→창고→QC→R&D.',
    source: 'scripts/outreach/systeel0925-recommend-coldmail.mjs',
    html: (lang) => recommendShell(lang, {
      intro: {
        vi: '<b>SY STEEL VINA</b> — doanh nghiệp sản xuất tôn thép Hàn Quốc — đang tuyển <b>Kế toán thanh toán</b> (KCN Nhơn Trạch 5, Đồng Nai) qua FYI. Công việc: chi/thu tiền, đối chiếu công nợ, lập chứng từ thanh toán, theo dõi công nợ NCC &amp; khách hàng. Yêu cầu: đại học chuyên ngành Kế toán, thành thạo Excel &amp; phần mềm kế toán, tiếng Anh cơ bản, không có kinh nghiệm được đào tạo. Lương thỏa thuận, thưởng lễ Tết &amp; tháng 13, BHXH đầy đủ. Nộp CV tiếng Anh.',
        ko: '한국계 철강 제조사 <b>SY STEEL VINA</b> 동나이 Nhơn Trạch 공장 <b>지급 회계</b> — 지급/수금·채권채무 대사·증빙 작성. 회계 전공 대졸, Excel·회계 SW, 영어 기본, 무경력 교육 제공. 급여 협의, 명절 보너스·13개월차, 4대보험.',
        en: 'SY STEEL VINA — a Korean steel manufacturer — is hiring a Payment Accountant (Nhon Trach 5 IZ, Dong Nai). Payments/receipts, AP/AR reconciliation, vouchers. Accounting degree, Excel and accounting software, basic English, no experience required (training provided). 13th-month bonus, full insurance.',
      },
      initial: 'S', company: 'SY STEEL VINA', title: 'Kế toán thanh toán', meta: 'Onsite · KCN Nhơn Trạch 5, Đồng Nai · Không cần kinh nghiệm · Lương thỏa thuận', tail: BENEFIT_PRIVATE,
    }),
  },
  {
    match: /^systeel0925-recommend-acct-/,
    subject: {
      vi: '[FYI] Bạn được chọn vào danh sách đề cử gửi SY STEEL VINA — Kế toán thanh toán',
      ko: '[FYI] SY STEEL VINA 추천 명단에 선정되셨습니다 — 회계(지급)',
      en: "[FYI] You've been nominated to SY STEEL VINA — Kế toán thanh toán",
    },
    desc: 'SY STEEL VINA Kế toán thanh toán(V196) recommend (9/25): 공개 프레임 — FYI 검토 선정·명단에 프로필 동봉·지원 시 우선 검토. 컷은 private 항목과 동일.',
    source: 'scripts/outreach/systeel0925-recommend-coldmail.mjs',
    html: (lang) => recommendShell(lang, {
      intro: {
        vi: '<b>SY STEEL VINA</b> — doanh nghiệp sản xuất tôn thép Hàn Quốc — đang tuyển <b>Kế toán thanh toán</b> (KCN Nhơn Trạch 5, Đồng Nai) qua FYI. Công việc: chi/thu tiền, đối chiếu công nợ, lập chứng từ thanh toán, theo dõi công nợ NCC &amp; khách hàng. Yêu cầu: đại học chuyên ngành Kế toán, thành thạo Excel &amp; phần mềm kế toán, tiếng Anh cơ bản, không có kinh nghiệm được đào tạo. Lương thỏa thuận, thưởng lễ Tết &amp; tháng 13, BHXH đầy đủ. Nộp CV tiếng Anh.',
        ko: '한국계 철강 제조사 <b>SY STEEL VINA</b> 동나이 Nhơn Trạch 공장 <b>지급 회계</b> — 지급/수금·채권채무 대사·증빙 작성. 회계 전공 대졸, Excel·회계 SW, 영어 기본, 무경력 교육 제공. 급여 협의, 명절 보너스·13개월차, 4대보험.',
        en: 'SY STEEL VINA — a Korean steel manufacturer — is hiring a Payment Accountant (Nhon Trach 5 IZ, Dong Nai). Payments/receipts, AP/AR reconciliation, vouchers. Accounting degree, Excel and accounting software, basic English, no experience required (training provided). 13th-month bonus, full insurance.',
      },
      initial: 'S', company: 'SY STEEL VINA', title: 'Kế toán thanh toán', meta: 'Onsite · KCN Nhơn Trạch 5, Đồng Nai · Không cần kinh nghiệm · Lương thỏa thuận', tail: BENEFIT_PUBLIC,
    }),
  },
  {
    match: /^systeel0925-recommend-wh-private/,
    subject: {
      vi: '[FYI] Bạn được chọn vào danh sách đề cử — Nhân viên kho tại SY STEEL VINA',
      ko: '[FYI] 추천 후보 명단에 선정되셨습니다 — SY STEEL VINA 창고 담당',
      en: "[FYI] You've been nominated — Nhân viên kho at SY STEEL VINA",
    },
    desc: 'SY STEEL VINA Nhân viên kho(V197) recommend (9/25 Len 게재 당일): 비공개 프레임 — 동나이 Nhơn Trạch 5공단 온사이트·원자재 입출고/재고관리 경험·영어 기본. 컷=(Warehouse 직군 or 창고/재고/물류 직무경력 텍스트) × 남부권/미기재 × 비개발(실측 52, 회계 배정 후 잔여). 언어 게이트 없음(가점만), 6공고 1인1통 캐스케이드 SM→Salesman→회계→창고→QC→R&D.',
    source: 'scripts/outreach/systeel0925-recommend-coldmail.mjs',
    html: (lang) => recommendShell(lang, {
      intro: {
        vi: '<b>SY STEEL VINA</b> — doanh nghiệp sản xuất tôn thép Hàn Quốc — đang tuyển <b>Nhân viên kho</b> (KCN Nhơn Trạch 5, Đồng Nai) qua FYI. Yêu cầu: có kinh nghiệm quản lý xuất – nhập – tồn kho nguyên vật liệu, tiếng Anh cơ bản. Lương thỏa thuận.',
        ko: '한국계 철강 제조사 <b>SY STEEL VINA</b> 동나이 Nhơn Trạch 공장 <b>창고 담당</b> — 원자재 입출고·재고관리 경험, 영어 기본. 급여 협의.',
        en: 'SY STEEL VINA — a Korean steel manufacturer — is hiring a Warehouse Staff (Nhon Trach 5 IZ, Dong Nai). Raw-material inbound/outbound and inventory management experience, basic English. Salary negotiable.',
      },
      initial: 'S', company: 'SY STEEL VINA', title: 'Nhân viên kho', meta: 'Onsite · KCN Nhơn Trạch 5, Đồng Nai · Lương thỏa thuận', tail: BENEFIT_PRIVATE,
    }),
  },
  {
    match: /^systeel0925-recommend-wh-/,
    subject: {
      vi: '[FYI] Bạn được chọn vào danh sách đề cử gửi SY STEEL VINA — Nhân viên kho',
      ko: '[FYI] SY STEEL VINA 추천 명단에 선정되셨습니다 — 창고 담당',
      en: "[FYI] You've been nominated to SY STEEL VINA — Nhân viên kho",
    },
    desc: 'SY STEEL VINA Nhân viên kho(V197) recommend (9/25): 공개 프레임 — FYI 검토 선정·명단에 프로필 동봉·지원 시 우선 검토. 컷은 private 항목과 동일.',
    source: 'scripts/outreach/systeel0925-recommend-coldmail.mjs',
    html: (lang) => recommendShell(lang, {
      intro: {
        vi: '<b>SY STEEL VINA</b> — doanh nghiệp sản xuất tôn thép Hàn Quốc — đang tuyển <b>Nhân viên kho</b> (KCN Nhơn Trạch 5, Đồng Nai) qua FYI. Yêu cầu: có kinh nghiệm quản lý xuất – nhập – tồn kho nguyên vật liệu, tiếng Anh cơ bản. Lương thỏa thuận.',
        ko: '한국계 철강 제조사 <b>SY STEEL VINA</b> 동나이 Nhơn Trạch 공장 <b>창고 담당</b> — 원자재 입출고·재고관리 경험, 영어 기본. 급여 협의.',
        en: 'SY STEEL VINA — a Korean steel manufacturer — is hiring a Warehouse Staff (Nhon Trach 5 IZ, Dong Nai). Raw-material inbound/outbound and inventory management experience, basic English. Salary negotiable.',
      },
      initial: 'S', company: 'SY STEEL VINA', title: 'Nhân viên kho', meta: 'Onsite · KCN Nhơn Trạch 5, Đồng Nai · Lương thỏa thuận', tail: BENEFIT_PUBLIC,
    }),
  },
  {
    match: /^systeel0925-recommend-qc-private/,
    subject: {
      vi: '[FYI] Bạn được chọn vào danh sách đề cử — Nhân viên QC tại SY STEEL VINA',
      ko: '[FYI] 추천 후보 명단에 선정되셨습니다 — SY STEEL VINA 품질관리(QC)',
      en: "[FYI] You've been nominated — Nhân viên QC at SY STEEL VINA",
    },
    desc: 'SY STEEL VINA Nhân viên QC(V201) recommend (9/25 Len 게재 당일): 비공개 프레임 — 동나이 Nhơn Trạch 5공단 온사이트·전문대+·무경력 OK(A-Z 교육)·영어 기본·조식/중식 제공. 컷=(QC 직군 or 제조 QC 텍스트[직무경력/헤드라인, 소프트웨어 QA 제외]) × 남부권/미기재 × 비개발(실측 14). 언어 게이트 없음(가점만), 6공고 1인1통 캐스케이드 SM→Salesman→회계→창고→QC→R&D.',
    source: 'scripts/outreach/systeel0925-recommend-coldmail.mjs',
    html: (lang) => recommendShell(lang, {
      intro: {
        vi: '<b>SY STEEL VINA</b> — doanh nghiệp sản xuất tôn thép Hàn Quốc — đang tuyển <b>Nhân viên QC</b> (KCN Nhơn Trạch 5, Đồng Nai) qua FYI — cơ hội cho fresher, đào tạo A-Z. Công việc: kiểm tra chất lượng nguyên vật liệu &amp; sản phẩm, theo dõi chất lượng sản xuất, xử lý vấn đề chất lượng. Yêu cầu: Cao đẳng trở lên, tiếng Anh cơ bản, tỉ mỉ – chính xác. Lương thỏa thuận cao, 2 bữa ăn, BHXH, khám sức khỏe. Nộp CV tiếng Anh.',
        ko: '한국계 철강 제조사 <b>SY STEEL VINA</b> 동나이 Nhơn Trạch 공장 <b>QC</b> — 신입 가능(A-Z 교육), 원자재·제품 품질검사, 생산 품질 모니터링. 전문대+, 영어 기본. 급여 협의, 식사 2식, 4대보험.',
        en: 'SY STEEL VINA — a Korean steel manufacturer — is hiring QC Staff (Nhon Trach 5 IZ, Dong Nai), fresher-friendly with A-Z training. Inspect materials and products, monitor production quality. College degree+, basic English. 2 meals, insurance, health checks.',
      },
      initial: 'S', company: 'SY STEEL VINA', title: 'Nhân viên QC', meta: 'Onsite · KCN Nhơn Trạch 5, Đồng Nai · Fresher · Đào tạo A-Z', tail: BENEFIT_PRIVATE,
    }),
  },
  {
    match: /^systeel0925-recommend-qc-/,
    subject: {
      vi: '[FYI] Bạn được chọn vào danh sách đề cử gửi SY STEEL VINA — Nhân viên QC',
      ko: '[FYI] SY STEEL VINA 추천 명단에 선정되셨습니다 — 품질관리(QC)',
      en: "[FYI] You've been nominated to SY STEEL VINA — Nhân viên QC",
    },
    desc: 'SY STEEL VINA Nhân viên QC(V201) recommend (9/25): 공개 프레임 — FYI 검토 선정·명단에 프로필 동봉·지원 시 우선 검토. 컷은 private 항목과 동일.',
    source: 'scripts/outreach/systeel0925-recommend-coldmail.mjs',
    html: (lang) => recommendShell(lang, {
      intro: {
        vi: '<b>SY STEEL VINA</b> — doanh nghiệp sản xuất tôn thép Hàn Quốc — đang tuyển <b>Nhân viên QC</b> (KCN Nhơn Trạch 5, Đồng Nai) qua FYI — cơ hội cho fresher, đào tạo A-Z. Công việc: kiểm tra chất lượng nguyên vật liệu &amp; sản phẩm, theo dõi chất lượng sản xuất, xử lý vấn đề chất lượng. Yêu cầu: Cao đẳng trở lên, tiếng Anh cơ bản, tỉ mỉ – chính xác. Lương thỏa thuận cao, 2 bữa ăn, BHXH, khám sức khỏe. Nộp CV tiếng Anh.',
        ko: '한국계 철강 제조사 <b>SY STEEL VINA</b> 동나이 Nhơn Trạch 공장 <b>QC</b> — 신입 가능(A-Z 교육), 원자재·제품 품질검사, 생산 품질 모니터링. 전문대+, 영어 기본. 급여 협의, 식사 2식, 4대보험.',
        en: 'SY STEEL VINA — a Korean steel manufacturer — is hiring QC Staff (Nhon Trach 5 IZ, Dong Nai), fresher-friendly with A-Z training. Inspect materials and products, monitor production quality. College degree+, basic English. 2 meals, insurance, health checks.',
      },
      initial: 'S', company: 'SY STEEL VINA', title: 'Nhân viên QC', meta: 'Onsite · KCN Nhơn Trạch 5, Đồng Nai · Fresher · Đào tạo A-Z', tail: BENEFIT_PUBLIC,
    }),
  },
  {
    match: /^systeel0925-recommend-rd-private/,
    subject: {
      vi: '[FYI] Bạn được chọn vào danh sách đề cử — Nhân viên R&D tại SY STEEL VINA',
      ko: '[FYI] 추천 후보 명단에 선정되셨습니다 — SY STEEL VINA 연구개발(R&D)',
      en: "[FYI] You've been nominated — Nhân viên R&D at SY STEEL VINA",
    },
    desc: 'SY STEEL VINA Nhân viên R&D(V202) recommend (9/25 Len 게재 당일): 비공개 프레임 — 동나이 Nhơn Trạch 5공단 온사이트·전문대+·무경력 OK(A-Z 교육)·영어 기본·조식/중식 제공. 컷=R&D/연구/실험실 텍스트(직무경력/헤드라인/전공) × 남부권/미기재 × 비개발(실측 9). 언어 게이트 없음(가점만), 6공고 1인1통 캐스케이드 SM→Salesman→회계→창고→QC→R&D.',
    source: 'scripts/outreach/systeel0925-recommend-coldmail.mjs',
    html: (lang) => recommendShell(lang, {
      intro: {
        vi: '<b>SY STEEL VINA</b> — doanh nghiệp sản xuất tôn thép Hàn Quốc — đang tuyển <b>Nhân viên R&amp;D</b> (KCN Nhơn Trạch 5, Đồng Nai) qua FYI — cơ hội cho fresher, đào tạo A-Z. Công việc: nghiên cứu, phân tích &amp; đánh giá nguyên vật liệu và sản phẩm, thử nghiệm &amp; cải tiến, xử lý vấn đề phát sinh. Yêu cầu: Cao đẳng trở lên, tiếng Anh cơ bản, tỉ mỉ – tư duy logic. Lương thỏa thuận cao, 2 bữa ăn, BHXH, khám sức khỏe. Nộp CV tiếng Anh.',
        ko: '한국계 철강 제조사 <b>SY STEEL VINA</b> 동나이 Nhơn Trạch 공장 <b>R&amp;D</b> — 신입 가능(A-Z 교육), 원자재·제품 연구/분석/평가, 시험·개선. 전문대+, 영어 기본. 급여 협의, 식사 2식, 4대보험.',
        en: 'SY STEEL VINA — a Korean steel manufacturer — is hiring R&D Staff (Nhon Trach 5 IZ, Dong Nai), fresher-friendly with A-Z training. Research, analyze and evaluate materials and products, run tests and improvements. College degree+, basic English. 2 meals, insurance, health checks.',
      },
      initial: 'S', company: 'SY STEEL VINA', title: 'Nhân viên R&D', meta: 'Onsite · KCN Nhơn Trạch 5, Đồng Nai · Fresher · Đào tạo A-Z', tail: BENEFIT_PRIVATE,
    }),
  },
  {
    match: /^systeel0925-recommend-rd-/,
    subject: {
      vi: '[FYI] Bạn được chọn vào danh sách đề cử gửi SY STEEL VINA — Nhân viên R&D',
      ko: '[FYI] SY STEEL VINA 추천 명단에 선정되셨습니다 — 연구개발(R&D)',
      en: "[FYI] You've been nominated to SY STEEL VINA — Nhân viên R&D",
    },
    desc: 'SY STEEL VINA Nhân viên R&D(V202) recommend (9/25): 공개 프레임 — FYI 검토 선정·명단에 프로필 동봉·지원 시 우선 검토. 컷은 private 항목과 동일.',
    source: 'scripts/outreach/systeel0925-recommend-coldmail.mjs',
    html: (lang) => recommendShell(lang, {
      intro: {
        vi: '<b>SY STEEL VINA</b> — doanh nghiệp sản xuất tôn thép Hàn Quốc — đang tuyển <b>Nhân viên R&amp;D</b> (KCN Nhơn Trạch 5, Đồng Nai) qua FYI — cơ hội cho fresher, đào tạo A-Z. Công việc: nghiên cứu, phân tích &amp; đánh giá nguyên vật liệu và sản phẩm, thử nghiệm &amp; cải tiến, xử lý vấn đề phát sinh. Yêu cầu: Cao đẳng trở lên, tiếng Anh cơ bản, tỉ mỉ – tư duy logic. Lương thỏa thuận cao, 2 bữa ăn, BHXH, khám sức khỏe. Nộp CV tiếng Anh.',
        ko: '한국계 철강 제조사 <b>SY STEEL VINA</b> 동나이 Nhơn Trạch 공장 <b>R&amp;D</b> — 신입 가능(A-Z 교육), 원자재·제품 연구/분석/평가, 시험·개선. 전문대+, 영어 기본. 급여 협의, 식사 2식, 4대보험.',
        en: 'SY STEEL VINA — a Korean steel manufacturer — is hiring R&D Staff (Nhon Trach 5 IZ, Dong Nai), fresher-friendly with A-Z training. Research, analyze and evaluate materials and products, run tests and improvements. College degree+, basic English. 2 meals, insurance, health checks.',
      },
      initial: 'S', company: 'SY STEEL VINA', title: 'Nhân viên R&D', meta: 'Onsite · KCN Nhơn Trạch 5, Đồng Nai · Fresher · Đào tạo A-Z', tail: BENEFIT_PUBLIC,
    }),
  },
]

// 발송 전 초안 캠페인 — 이벤트가 없어도 콜드메일 탭 표에 '미발송' 행으로 띄워 양식을 검수한다.
// 발송이 시작되면(같은 이름의 이벤트가 쌓이면) 실측 행이 이 자리를 대체하므로 발송 후 지워도 된다.
export const DRAFT_CAMPAIGNS = [
  { campaign: 'resume-register-bonus1-apply', group: 'register' },
  { campaign: 'wellpod-recommend1', group: 'recommend' },
  { campaign: 'mnf-recommend1-public', group: 'recommend' },
  { campaign: 'mnf-recommend1-private', group: 'recommend' },
  { campaign: 'youlchon0916-recommend-sales-public', group: 'recommend' },
  { campaign: 'youlchon0916-recommend-sales-private', group: 'recommend' },
]

export const templateFor = (name) => COLDMAIL_TEMPLATES.find((t) => t.match.test(name || '')) || null

// 모달 표시용: 토글 언어에 맞춰 subject/html을 풀어준다. vi=발송 원문, ko/en=열람용 번역본.
export const localizeTemplate = (t, lang) => ({
  ...t,
  subject: typeof t.subject === 'string' ? t.subject : pickLang(t.subject, lang),
  html: typeof t.html === 'function' ? t.html(lang) : t.html,
})
