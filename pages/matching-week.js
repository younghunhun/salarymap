import { useEffect, useRef, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useT } from '../lib/i18n';
import { track } from '../lib/track';
import Reveal from '../components/ktc/Reveal';

/* 11/19 호치민 매칭위크 참가 기업 공고 모음 — 후보자에게 공유하는 링크(엠마 요청 2026-11-12).
   참가 공고는 jobs.raw_payload.ktc.is_matching_week 플래그로 고른다(메인 카드 배지와 같은 기준).
   현장 워크인을 막기 위해 '서류 통과자만 초대' 문구를 꼭 둔다. */

const EVENT_AT = new Date('2026-11-19T00:00:00+07:00');

/* 오시는 길 — 행사장은 코비홈(시내에서 멀다), COBI Tower 2 에서 셔틀 운영.
   주소·출발 시각(08:30·13:00)·복귀 방식은 엠마 팀 시트 7번 'Organizer support'(2026-11-12) 원문 그대로.
   지도는 API 키 없는 구글맵 임베드(q=좌표). */
const VENUE = {
  departures: ['08:30', '13:00'],
  mapEmbed: 'https://maps.google.com/maps?q=10.6321154,106.7180673&z=12&hl=vi&output=embed',
  shuttle: { name: 'COBI Tower 2', address: '2-4 Street No. 8, Tan My Ward, Ho Chi Minh City', url: 'https://www.google.com/maps/place/COBI+TOWER+2/@10.7306545,106.7245815,17z/data=!4m6!3m5!1s0x317525f46b232607:0x784e860aec9c7081!8m2!3d10.7306545!4d106.7245815!16s%2Fg%2F11s58_cv1n' },
  venue: { name: 'COBI Home', address: 'Lot DV-4, Central Road, Industrial Park, Can Giuoc, Tay Ninh', url: 'https://www.google.com/maps/place/%EC%BD%94%EB%B9%84%ED%99%88/@10.6321154,106.7180673,15z/data=!4m6!3m5!1s0x317531812261a6cb:0x80259ac04d320ae6!8m2!3d10.6321154!4d106.7180673!16s%2Fg%2F11lfcth5f9' },
};

const Pin = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 21s-7-6.2-7-11.5A7 7 0 0119 9.5C19 14.8 12 21 12 21z" /><circle cx="12" cy="9.5" r="2.5" /></svg>;
const Bus = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="4" y="3" width="16" height="15" rx="3" /><path d="M4 11h16M8 18v2M16 18v2" /><circle cx="8" cy="14.5" r=".8" fill="currentColor" /><circle cx="16" cy="14.5" r=".8" fill="currentColor" /></svg>;

const ORGS = [
  { src: '/ktc/mss.svg', h: 30, alt: 'Ministry of SMEs and Startups' },
  { src: '/ktc/kosme.svg', h: 30, alt: 'KOSME' },
  { src: '/ktc/likelion.svg', h: 30, alt: 'LIKELION' },
  { src: '/ktc/jobkorea.png', h: 18, alt: 'JobKorea' },
];

/* 회사 소개 — 기업이 직접 쓴 KTC 공고 본문의 '회사 소개' 문단에서 회사 설명만 옮겼다(공고 얘기 문장은 뺌).
   MNF 는 원문이 영어라 베트남어로 옮김. pickcare 부터 아래 6곳은 JD 에 소개가 없어 각 공식 사이트 문구를 베트남어로 옮김.
   키는 getStaticProps 의 회사 묶음 키(뒤 Company 뗀 소문자). 없는 회사는 소개 칸을 숨긴다. */
const CO_INTRO = {
  nalda: 'NALDA Co., Ltd. là công ty phát triển sản phẩm công nghệ, hiện đang vận hành Timing - ứng dụng theo dõi và quản lý thời gian theo dạng lưới. Timing hỗ trợ người dùng ghi lại các hoạt động hằng ngày, trực quan hóa cách sử dụng thời gian, theo dõi tỷ lệ tập trung - nghỉ ngơi và nhìn lại thói quen của bản thân.',
  'bada fintech': 'Công ty vận hành nền tảng Fintech tài chính khoản phải thu theo mô hình Supply Chain Finance (SCF), cung cấp giải pháp giải quyết tình trạng chậm thanh toán, chậm quyết toán của hộ kinh doanh, doanh nghiệp và các nền tảng, qua đó hỗ trợ khách hàng nhanh chóng chuyển đổi các khoản phải thu thành nguồn vốn lưu động.',
  papacompany: 'Papa Company là agency marketing của Hàn Quốc, giúp thương hiệu tăng trưởng thông qua content, SNS và performance marketing. Công ty đang mở rộng sang Việt Nam và thị trường nước ngoài.',
  andwise: 'ANDWISE là doanh nghiệp chuyên về web, với nền tảng là giải pháp gửi email hàng loạt và giải pháp quản lý nội dung (CMS). Công ty cung cấp giải pháp, đồng thời thực hiện phát triển và bảo trì cho các cơ quan công quyền và trường đại học.',
  jinosys: 'Jinosys Co., Ltd. là doanh nghiệp đổi mới chuyên về lĩnh vực an toàn, phát triển nền tảng IoT an toàn dựa trên AI độc quyền và các hệ thống quản lý thông minh. Với 18 bằng sáng chế và gần một thập kỷ kinh nghiệm là đối tác an toàn chính cho các tập đoàn hàng đầu thế giới như Samsung Electronics, Jinosys tích hợp cảm biến IoT tiên tiến và dữ liệu lớn (big data) để số hóa an toàn công nghiệp và tạo ra môi trường làm việc an toàn.',
  'camon social': 'Camon Social là nền tảng kết nối xã hội, giúp mọi người kết nối dựa trên những sở thích chung và xây dựng các mối quan hệ thông qua những trải nghiệm trực tiếp ý nghĩa.',
  d3: 'D3 Co., Ltd. là công ty công nghệ Hàn Quốc chuyên phát triển và vận hành LIMZY, nền tảng quảng cáo đa kênh ứng dụng trí tuệ nhân tạo (AI-powered Multi-channel Advertising Platform).',
  solarnix: 'SOLARNIX là doanh nghiệp chuyên về dịch vụ khảo sát địa điểm (site discovery) cho điện mặt trời tại Hàn Quốc, hỗ trợ ra quyết định ở giai đoạn đầu của dự án điện mặt trời bằng dữ liệu.',
  'mnf solution': 'Lấy nền tảng số làm trung tâm, MNF Solution đang xây dựng một hệ sinh thái di chuyển (mobility) mới. Công ty cung cấp giải pháp quản lý toàn diện cho các doanh nghiệp cho thuê xe ô tô, cùng dịch vụ kênh khách hàng để giao tiếp với khách hàng.',
  pickcare: 'PickCare là nền tảng dùng AI và dữ liệu để tổng hợp thông tin về sức khỏe và đời sống của thú cưng, giúp người nuôi đưa ra quyết định tốt hơn. Dịch vụ gồm tư vấn thú cưng bằng AI, bản đồ hơn 14.000 địa điểm dành cho thú cưng (PickSpot), tạp chí và cộng đồng người nuôi.',
  nexacode: 'Nexacode là đội ngũ chuyên phát triển ứng dụng và website tại Seoul, đồng hành cùng khách hàng như một bộ phận IT riêng — từ lên kế hoạch, thiết kế UI/UX đến phát triển, SEO và bảo trì. Đội ngũ từng tự phát triển và vận hành một ứng dụng karaoke đạt 2,5 triệu lượt tải.',
  rothea: 'Rothea là thương hiệu mỹ phẩm Hàn Quốc theo định hướng "Korean Skin Longevity" — chăm sóc da hiệu quả cao giúp hàng rào bảo vệ da khỏe mạnh. Sản phẩm của Rothea được bán trên Amazon Mỹ và cửa hàng chính thức tại Hàn Quốc.',
  'the waves': 'The Waves là công ty nội dung tại Seoul, hoạt động trong ba mảng: sản xuất nội dung (media, giải trí), dự án thương hiệu (brand marketing) và kinh doanh âm nhạc (quản lý nghệ sĩ, phát hành âm nhạc).',
  hyperstar: 'Hyperstar giúp thương hiệu tăng trưởng theo hai cách: phần mềm SaaS dùng AI để tìm kiếm trực tiếp trong hơn 5 triệu influencer, và agency marketing influencer toàn cầu.',
  until: 'Until là doanh nghiệp Hàn Quốc vận hành Bannerting — dịch vụ chia sẻ băng rôn quảng cáo với sứ mệnh "kết nối giá trị cho từng tấm băng rôn".',
};
// 로고 보충 — 매칭위크 공고에 로고가 없던 곳. 각 공식 사이트 로고·파비콘을 정사각형으로 저장(d3 는 흰 로고라 어두운 바탕에 올림)
const CO_LOGO = {
  d3: '/matching-week/logos/d3.png',
  papacompany: '/matching-week/logos/papacompany.png',
  'the waves': '/matching-week/logos/thewaves.png',
  hyperstar: '/matching-week/logos/hyperstar.png',
};
// 웹사이트 보충 — 매칭위크 공고엔 없어 따로 채운 주소. 위 4곳은 같은 회사의 다른 KTC 공고(company_url)·JD 본문,
// 아래는 ktc-ops 기업 담당자 이메일 도메인(사이트 제목이 회사명과 맞는지 확인함), hyperstar·pickcare·rothea·bada·until 은 유저 제공
const CO_SITE = {
  nexacode: 'https://nexacode.co.kr',
  andwise: 'https://www.andwise.com/',
  'camon social': 'https://camon.social/',
  'mnf solution': 'https://www.mnfsolution.com/',
  d3: 'https://d3company.co.kr/',
  papacompany: 'https://papacompany.co.kr/',
  rothea: 'https://rothea.co.kr/',
  'the waves': 'https://www.thewaves.kr/',
  hyperstar: 'https://www.hyper-star.org/',
  pickcare: 'https://pickcare.co.kr/business',
  'bada fintech': 'https://badafintech.ai/',
  until: 'https://bannerting.com/',
};

// 다크 섹션 하단에 흐르는 사진 띠
const MARQUEE = [
  ...[2, 5, 8, 10, 1].map((n) => `/matching-week/sep-${n}.jpg`),
  ...[1, 3, 7].map((n) => `/matching-week/jul-${n}.jpg`),
  ...[3, 5, 9, 1].map((n) => `/matching-week/trip-${n}.jpg`),
  ...[1, 3, 5, 7, 9].map((n) => `/matching-week/may-${n}.jpg`),
  ...[4, 9].map((n) => `/matching-week/kmajor-${n}.jpg`),
];

/* 행사·프로그램 앨범 — 엠마 팀 드라이브 폴더(Matching Month Page 시트 5·6번)에서 받아
   1400px 로 줄여 public/matching-week 에 둔다. photos 가 비어 있으면 카드에 '사진 곧 업데이트'가 뜨고 안 열린다.
   폴더: May 1tEQ1hcgW0H3OfS3ytYKZKLGeuS2voesn · July 1t9hogYQRY5fUkhKBDsiGLWfgD2fqTBlh · Sep 1eYyW41Jj8ciPzx4u8nnSn-TSCWvTVzp5
         K-Major 1C-JzQRTyGko5Ox7XegyRgz_xDFriHWCH · Korean Trip 1Lfi5cPnDkPSpDazM7Fx9K_yDiDxJCNzT */
// 히어로 배경 슬라이드 — 사람이 많이 나온 사진 위주(행사 규모·신뢰감). 드라이브 원본에서 2400px 로 받은 고해상도본.
// 5월 시상 단체 · 서울 Connect Day 단체(Insight Trip) · 9월 VKU 시상 단체 · 9월 VKU 대강당 · 7월 해커톤 우승팀 · 5월 1:1 면접. pos 는 얼굴이 잘 보이는 세로 위치
const HERO_SLIDES = [
  { src: '/matching-week/hero-1.jpg', pos: 'center 72%' },
  { src: '/matching-week/hero-6.jpg', pos: 'center 60%' },
  { src: '/matching-week/hero-5.jpg', pos: 'center 62%' },
  { src: '/matching-week/hero-7.jpg', pos: 'center 55%' },
  { src: '/matching-week/hero-3.jpg', pos: 'center 62%' },
  { src: '/matching-week/hero-4.jpg', pos: 'center 50%' },
];

const range = (prefix, n) => Array.from({ length: n }, (_, i) => `/matching-week/${prefix}-${i + 1}.jpg`);
const EVENTS = [
  { key: 'may', m: '05', cover: '/matching-week/may-4.jpg', photos: range('may', 10) },
  { key: 'jul', m: '07', cover: '/matching-week/jul-2.jpg', photos: range('jul', 8) },
  { key: 'sep', m: '09', cover: '/matching-week/sep-9.jpg', photos: range('sep', 10) },
  // 11월은 아직 열리지 않아 실제 사진 대신 행사장 데모 이미지(드라이브 'Demo event/IMAGE') — '행사 현장 미리보기' 표시를 붙인다(유저: '3D 예상도'는 스캠처럼 보일 수 있어 피함)
  { key: 'nov', m: '11', next: true, demo: true, cover: '/matching-week/nov-1.jpg', photos: range('nov', 10) },
];
const PROGRAMS = [
  { key: 'kmajor', cover: '/matching-week/kmajor-10.jpg', photos: range('kmajor', 10) },
  { key: 'trip', cover: '/matching-week/trip-8.jpg', photos: range('trip', 10) },
];
const ALBUMS = [...EVENTS, ...PROGRAMS].filter((a) => a.photos.length > 0); // 갤러리 탭(사진 있는 앨범만)

/* 매칭위크 구성 — 행사 배너 문구 '1:1 INTERVIEW · MENTORING · HACKATHON · ALL IN ONE WEEK' 기준.
   사진은 지난 매칭위크 앨범에서 장면별로 골랐다(갤러리는 이 묶음끼리 탭으로 넘긴다) */
const mw = (list) => list.map((x) => `/matching-week/${x}.jpg`);
const CONTENTS = [
  { key: 'c-interview', icon: 'interview', cover: '/matching-week/sep-7.jpg', photos: mw(['sep-7', 'may-4', 'sep-10', 'may-10', 'sep-1', 'may-3', 'sep-5', 'may-9', 'jul-4']) },
  { key: 'c-hackathon', icon: 'hackathon', cover: '/matching-week/sep-9.jpg', photos: mw(['sep-9', 'sep-6', 'may-8', 'sep-4', 'jul-3', 'jul-8', 'may-7', 'jul-5', 'may-6', 'jul-2', 'jul-6']) }, // 시상식은 해커톤 마지막 순서라 같이 묶음
  { key: 'c-mentoring', icon: 'mentoring', cover: '/matching-week/sep-2.jpg', photos: mw(['sep-2', 'may-1', 'may-2', 'may-5', 'jul-1', 'jul-7', 'sep-8']) },
];
const CONTENT_ICONS = {
  interview: <><circle cx="8" cy="8" r="3" /><circle cx="16" cy="8" r="3" /><path d="M3 20v-1a5 5 0 0110 0v1M11 20v-1a5 5 0 0110 0v1" /></>,
  hackathon: <><path d="M8 9l-3 3 3 3M16 9l3 3-3 3M13.5 6l-3 12" /></>,
  mentoring: <><path d="M3 5h18v11H8l-5 4V5z" /><path d="M8 10h8M8 13h5" /></>,
};

/* ── v2 스킨 — 미아(KTC)가 보낸 무드 이미지 'MAP - NOV NEW.jpg' 기준(2026-11-12).
   하늘색→바이올렛→핑크 그라데이션, 흰 붓터치, 둥근 두꺼운 글꼴(Baloo 2), 파란 사각 라벨, 말풍선 배지.
   이전 시도(워터밤 복제·색종이 스티커·다크 나이트)는 모두 반려됨. ── */
const FX = { blue: '#2d5bff', sky: '#36b0ff', violet: '#8b5cf6', pink: '#ff2e93', ink: '#1c1f5e', cream: '#fdf0b8', mute: '#5b5f8f' };
const FX_BG = `radial-gradient(ellipse at 85% 15%, rgba(255,46,147,0.35), transparent 45%), radial-gradient(ellipse at 10% 90%, rgba(255,46,147,0.25), transparent 45%), linear-gradient(135deg, #a46bff 0%, #6a7bff 40%, #36b0ff 100%)`;
const BRUSH = `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 600 120' preserveAspectRatio='none'><path d='M6 74 C70 34 150 44 228 58 S380 18 462 46 S566 60 594 38 L596 74 C522 98 432 82 352 98 S182 112 102 102 S24 108 4 96 Z' fill='white'/><path d='M40 30 C120 18 200 26 260 22' stroke='white' stroke-width='5' fill='none' stroke-linecap='round' opacity='.7'/><path d='M360 112 C430 104 500 110 570 100' stroke='white' stroke-width='4' fill='none' stroke-linecap='round' opacity='.6'/></svg>`)}")`;
const ROAD = `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='36' height='20' viewBox='0 0 36 20'><path d='M8 5l6 5-6 5M18 5l6 5-6 5' stroke='white' stroke-width='3' fill='none' stroke-linecap='round' stroke-linejoin='round'/></svg>`)}")`;
const FX_FONT = `'Baloo 2', 'Pretendard', sans-serif`;
const FEST_CSS = `
.mw.fest { background: #f4f6ff; color: ${FX.ink}; }
.mw.fest .mw-title, .mw.fest .mw-subtitle, .mw.fest .mw-end h2 { font-family: ${FX_FONT}; font-weight: 800; letter-spacing: -0.5px; color: ${FX.ink}; }
.mw.fest .mw-lead { color: ${FX.mute}; }
.mw.fest .mw-accent { color: ${FX.pink}; }
.mw.fest .mw-eyebrow { padding: 6px 14px; border-radius: 4px; background: ${FX.blue}; color: #fff; letter-spacing: 1.2px; box-shadow: 0 6px 18px rgba(45,91,255,0.3); }
.mw.fest .mw-eyebrow span { border-color: rgba(255,255,255,0.4); }

/* 히어로(포스터형) */
.mw.fest .fx-hero { position: relative; overflow: hidden; background: ${FX_BG}; color: #fff; padding: 118px 0 0; }
.mw.fest .fx-brush { position: absolute; pointer-events: none; background: ${BRUSH} center/100% 100% no-repeat; opacity: 0.95; }
.mw.fest .fx-brush-1 { left: -6%; right: 30%; bottom: 120px; height: 150px; transform: rotate(-6deg); }
.mw.fest .fx-brush-2 { left: 40%; right: -8%; bottom: -10px; height: 170px; transform: rotate(-3deg); }
.mw.fest .fx-hero-in { position: relative; z-index: 1; width: 90%; max-width: 1200px; margin: 0 auto; display: grid; grid-template-columns: 1.05fr 0.95fr; gap: 48px; align-items: center; }
.mw.fest .fx-tags { display: flex; gap: 8px; flex-wrap: wrap; }
.mw.fest .fx-tag { display: inline-flex; align-items: center; height: 32px; padding: 0 14px; border-radius: 4px; background: ${FX.blue}; color: #fff; font-weight: 800; font-size: 14px; letter-spacing: 0.4px; box-shadow: 0 6px 16px rgba(28,31,94,0.25); }
.mw.fest .fx-tag.pink { background: ${FX.pink}; }
.mw.fest .fx-h1 { margin: 22px 0 0; display: flex; flex-direction: column; font-family: ${FX_FONT}; font-weight: 800; line-height: 0.95; text-transform: uppercase; }
.mw.fest .fx-h1 span { font-size: 82px; color: #fff; text-shadow: 3px 3px 0 ${FX.blue}, -3px 3px 0 ${FX.blue}, 3px -3px 0 ${FX.blue}, -3px -3px 0 ${FX.blue}, 0 4px 0 ${FX.blue}, 7px 9px 0 ${FX.pink}; transform: rotate(-3deg); transform-origin: left; }
.mw.fest .fx-h1 span + span { color: ${FX.pink}; text-shadow: 3px 3px 0 #fff, -3px 3px 0 #fff, 3px -3px 0 #fff, -3px -3px 0 #fff, 0 4px 0 #fff, 7px 9px 0 ${FX.blue}; margin-top: 8px; }
.mw.fest .fx-when { margin: 26px 0 0; font-family: ${FX_FONT}; font-weight: 800; font-size: 22px; }
.mw.fest .mw-sub { color: rgba(255,255,255,0.92); margin-top: 14px; }
.mw.fest .fx-hero-r { position: relative; padding: 20px 30px 60px 10px; }
.mw.fest .fx-frame { position: relative; aspect-ratio: 4 / 3.3; border-radius: 32px; overflow: hidden; border: 8px solid #fff; box-shadow: 0 30px 70px rgba(28,31,94,0.35); transform: rotate(2deg); background: #fff; }
.mw.fest .fx-frame .mw-hero-slide { position: absolute; inset: 0; }
.mw.fest .fx-dots { top: auto; bottom: 14px; right: 16px; }
.mw.fest .fx-bubble { position: absolute; z-index: 2; display: inline-flex; align-items: center; gap: 8px; padding: 10px 20px; border-radius: 18px; border: 4px solid #fff; color: #fff; font-family: ${FX_FONT}; font-weight: 800; font-size: 22px; white-space: nowrap; box-shadow: 0 12px 30px rgba(28,31,94,0.3); animation: fx-bob 3.4s ease-in-out infinite; }
.mw.fest .fx-bubble i { font-style: normal; color: #ffc93c; text-shadow: 0 2px 0 #e08a00; }
.mw.fest .fx-bubble::after { content: ''; position: absolute; bottom: -14px; left: 34px; border: 9px solid transparent; border-top-color: #fff; }
.mw.fest .fx-bubble.b1 { background: ${FX.pink}; top: -6px; right: -6px; transform: rotate(4deg); }
.mw.fest .fx-bubble.b2 { background: ${FX.sky}; left: -34px; top: 46%; transform: rotate(-4deg); animation-delay: .6s; }
.mw.fest .fx-bubble.b3 { background: ${FX.violet}; right: 0; bottom: 4px; transform: rotate(3deg); animation-delay: 1.2s; }
@keyframes fx-bob { 0%, 100% { translate: 0 0; } 50% { translate: 0 -8px; } }
.mw.fest .fx-stats { position: relative; z-index: 1; width: 90%; max-width: 1200px; margin: 30px auto 0; padding: 0 0 56px; display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; }
.mw.fest .fx-stats div { padding: 18px 22px; border-radius: 22px; background: #fff; color: ${FX.ink}; box-shadow: 0 14px 34px rgba(28,31,94,0.18); }
.mw.fest .fx-stats dt { font-size: 13px; color: ${FX.mute}; font-weight: 600; }
.mw.fest .fx-stats dd { margin: 4px 0 0; font-family: ${FX_FONT}; font-weight: 800; font-size: 44px; line-height: 1; color: ${FX.pink}; }
.mw.fest .fx-stats div:nth-child(2) dd { color: ${FX.blue}; }
.mw.fest .fx-stats dd.sm { font-size: 19px; line-height: 1.3; margin-top: 8px; color: ${FX.ink}; }
/* 카운트다운 */
.mw.fest .fx-count { display: flex; gap: 10px; margin-top: 18px; }
.mw.fest .fx-count-cell { min-width: 76px; padding: 10px 8px 8px; border-radius: 16px; background: #fff; color: ${FX.ink}; text-align: center; box-shadow: 0 8px 22px rgba(28,31,94,0.2); }
.mw.fest .fx-count-cell b { display: block; font-family: ${FX_FONT}; font-size: 38px; font-weight: 800; line-height: 1; font-variant-numeric: tabular-nums; animation: fx-flip .45s cubic-bezier(.16,1,.3,1); }
.mw.fest .fx-count-cell:last-child b { color: ${FX.pink}; }
.mw.fest .fx-count-cell span { display: block; margin-top: 4px; font-size: 11px; font-weight: 800; letter-spacing: 1.6px; color: ${FX.blue}; }
@keyframes fx-flip { from { opacity: 0; transform: translateY(-40%); } to { opacity: 1; transform: none; } }
/* 버튼 */
.mw.fest .mw-btn { border-radius: 999px; font-family: ${FX_FONT}; font-weight: 800; font-size: 18px; }
.mw.fest .mw-btn-primary { background: ${FX.pink}; border: 3px solid #fff; box-shadow: 0 10px 26px rgba(255,46,147,0.45); }
.mw.fest .mw-btn-primary:hover { background: #ff4aa3; }
.mw.fest .mw-btn-ghost { background: #fff; color: ${FX.blue}; border: 3px solid #fff; box-shadow: 0 10px 26px rgba(28,31,94,0.2); -webkit-backdrop-filter: none; backdrop-filter: none; }
.mw.fest .mw-btn-ghost:hover { background: #fff; }

/* 키네틱 띠 — 흰 바탕, 파란 외곽선 줄 + 핑크→바이올렛 줄 */
.mw.fest .fx-kb { overflow: hidden; padding: 22px 0; background: #fff; }
.mw.fest .fx-kb-row { display: flex; width: max-content; }
.mw.fest .fx-kb-row span { display: flex; }
.mw.fest .fx-kb-row b { display: inline-flex; align-items: center; gap: 30px; padding-right: 30px; font-family: ${FX_FONT}; font-size: 76px; font-weight: 800; line-height: 1.05; white-space: nowrap; text-transform: uppercase; }
.mw.fest .fx-kb-row i { font-style: normal; font-size: 40px; color: #ffc93c; }
.mw.fest .fx-kb-row.outline { animation: mw-marquee 40s linear infinite; }
.mw.fest .fx-kb-row.outline b { color: transparent; -webkit-text-stroke: 2px ${FX.blue}; }
.mw.fest .fx-kb-row.fill { animation: fx-marquee-rev 34s linear infinite; }
.mw.fest .fx-kb-row.fill b { background-image: linear-gradient(90deg, ${FX.pink}, ${FX.violet}, ${FX.sky}); -webkit-background-clip: text; background-clip: text; color: transparent; }
@keyframes fx-marquee-rev { from { transform: translateX(-50%); } to { transform: translateX(0); } }
.mw.fest .mw-orgs { background: #fff; border-top: 1px solid #eceefb; }

/* 섹션 */
.mw.fest .mw-sec { position: relative; }
.mw.fest .mw-dark { background: ${FX_BG}; color: #fff; overflow: hidden; }
.mw.fest .mw-dark::before { content: ''; position: absolute; left: -5%; right: 45%; top: -40px; height: 130px; background: ${BRUSH} center/100% 100% no-repeat; transform: rotate(-3deg); opacity: 0.9; pointer-events: none; }
.mw.fest .mw-dark .mw-title, .mw.fest .mw-dark .mw-subtitle { color: #fff; text-shadow: 0 3px 0 rgba(45,91,255,0.6); }
.mw.fest .mw-dark .mw-lead { color: rgba(255,255,255,0.9); }
.mw.fest .mw-dark .mw-eyebrow { background: #fff; color: ${FX.blue}; }
.mw.fest .mw-dark .mw-eyebrow span { border-color: rgba(45,91,255,0.35); }
.mw.fest .mw-warm { background: linear-gradient(180deg, #eaf4ff, #f4f6ff); }
.mw.fest .mw-gray { background: #fff0f7; }
.mw.fest .mw-sec:not(.mw-dark):not(.mw-warm):not(.mw-gray) { background: #fff; }

/* 앨범·구성 카드 */
.mw.fest .mw-album { border: 5px solid #fff; border-radius: 26px; box-shadow: 0 16px 36px rgba(28,31,94,0.3); background: linear-gradient(160deg, #5b6bff, #8b5cf6); }
.mw.fest .mw-album:not(:disabled):hover { transform: translateY(-6px) rotate(-1deg); border-color: #fff; box-shadow: 0 24px 50px rgba(28,31,94,0.4); }
.mw.fest .mw-album.next { border-color: ${FX.pink}; box-shadow: 0 0 0 4px #fff, 0 20px 50px rgba(255,46,147,0.45); }
.mw.fest .mw-album.next .mw-album-m { color: #fff; }
.mw.fest .mw-album-go { background: ${FX.pink}; }
.mw.fest .mw-album-txt em.live { color: #ffd1e6; }
.mw.fest .mw-album-txt em.live::before { background: ${FX.pink}; }
.mw.fest .mw-content { background: #fff; color: ${FX.ink}; border: 0; border-radius: 26px; box-shadow: 0 16px 36px rgba(28,31,94,0.25); }
.mw.fest .mw-content:hover { background: #fff; transform: translateY(-6px); }
.mw.fest .mw-content-img::after { background: none; }
.mw.fest .mw-content-body { margin-top: 0; padding-top: 18px; }
.mw.fest .mw-content-body b { font-family: ${FX_FONT}; font-size: 22px; }
.mw.fest .mw-content-body small { color: ${FX.mute}; }
.mw.fest .mw-content-body em { color: ${FX.pink}; }
.mw.fest .mw-content-ico { position: absolute; top: -26px; right: 18px; margin: 0; background: ${FX.pink}; border: 3px solid #fff; box-shadow: 0 8px 20px rgba(255,46,147,0.4); }
.mw.fest .mw-content:nth-child(2) .mw-content-ico { background: ${FX.sky}; box-shadow: 0 8px 20px rgba(54,176,255,0.4); }
.mw.fest .mw-content:nth-child(3) .mw-content-ico { background: ${FX.violet}; box-shadow: 0 8px 20px rgba(139,92,246,0.4); }
.mw.fest .mw-marquee-track img { opacity: 1; border: 4px solid #fff; }

/* 오시는 길 — 공식 지도 + 지도색(크림) 경로 카드 + 파란 도로 */
.mw.fest .fx-venue-head { display: grid; grid-template-columns: 1fr 300px; gap: 40px; align-items: center; }
.mw.fest .fx-map { position: relative; display: block; width: 100%; padding: 0; margin: 0; overflow: hidden; border-radius: 24px; border: 5px solid #fff; background: #fff; cursor: zoom-in; box-shadow: 0 24px 60px rgba(28,31,94,0.2); transform: rotate(2deg); transition: transform .35s cubic-bezier(.2,.8,.2,1), box-shadow .35s; }
.mw.fest .fx-map img { display: block; width: 100%; transition: transform .6s cubic-bezier(.2,.8,.2,1); }
.mw.fest .fx-map:hover { transform: rotate(0deg) scale(1.04); box-shadow: 0 30px 70px rgba(28,31,94,0.32); }
.mw.fest .fx-map:hover img { transform: scale(1.06); }
.mw.fest .fx-map-zoom { position: absolute; left: 50%; bottom: 14px; display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; border-radius: 999px; background: ${FX.pink}; color: #fff; font-size: 13px; font-weight: 800; white-space: nowrap; box-shadow: 0 8px 20px rgba(255,46,147,0.45); transform: translate(-50%, 6px); opacity: 0.92; transition: transform .3s, opacity .3s; }
.mw.fest .fx-map:hover .fx-map-zoom { transform: translate(-50%, 0); opacity: 1; }
.fx-map-lb .mw-lb-stage { padding: 0 20px 24px; }
.mw.fest .mw-journey { background: ${FX.cream}; color: ${FX.ink}; border: 6px solid #fff; border-radius: 34px; box-shadow: 0 20px 50px rgba(28,31,94,0.15); }
.mw.fest .mw-jstop { background: #fff; border: 0; box-shadow: 0 10px 26px rgba(28,31,94,0.12); }
.mw.fest .mw-jstop:hover { background: #fff; transform: translateY(-3px); }
.mw.fest .mw-jstop-ico { background: #e6ecff; color: ${FX.blue}; }
.mw.fest .mw-jstop-end .mw-jstop-ico { background: ${FX.blue}; color: #fff; box-shadow: 0 8px 22px rgba(45,91,255,0.4); }
.mw.fest .mw-jstop em { display: inline-block; padding: 3px 10px; border-radius: 4px; background: ${FX.blue}; color: #fff; }
.mw.fest .mw-jstop b { font-family: ${FX_FONT}; font-size: 28px; }
.mw.fest .mw-jstop small { color: ${FX.mute}; }
.mw.fest .mw-jstop-go { color: ${FX.blue}; }
.mw.fest .mw-jstop:hover .mw-jstop-go { color: ${FX.pink}; }
.mw.fest .mw-ride-k { color: ${FX.mute}; }
.mw.fest .mw-ride-times b { background: ${FX.pink}; font-family: ${FX_FONT}; border: 3px solid #fff; box-shadow: 0 8px 20px rgba(255,46,147,0.35); }
.mw.fest .mw-ride-dur { color: ${FX.blue}; font-weight: 800; }
.mw.fest .mw-ride-desc { color: ${FX.ink}; }
.mw.fest .mw-ride-line { height: 30px; border-radius: 999px; background: ${ROAD} center/36px 20px repeat-x, ${FX.blue}; animation: fx-road 1.2s linear infinite; }
.mw.fest .mw-ride-line::before, .mw.fest .mw-ride-line::after { display: none; }
@keyframes fx-road { from { background-position: 0 center, 0 0; } to { background-position: 36px center, 0 0; } }
.mw.fest .mw-ride-bus { color: ${FX.blue}; border: 3px solid ${FX.blue}; margin-top: -17px; }
.mw.fest .mw-video, .mw.fest .mw-map { border: 6px solid #fff; box-shadow: 0 20px 50px rgba(28,31,94,0.18); }
.mw.fest .mw-mute:hover { background: ${FX.pink}; }
.mw.fest .mw-vbar { background: linear-gradient(90deg, ${FX.pink} var(--p), rgba(255,255,255,0.35) var(--p)); }
.mw.fest .mw-vbar::-webkit-slider-thumb { box-shadow: 0 0 0 3px rgba(255,46,147,0.6); }
.mw.fest .mw-vbar::-moz-range-thumb { box-shadow: 0 0 0 3px rgba(255,46,147,0.6); }
.mw.fest .mw-vbtns .mw-vplay, .mw.fest .mw-vbtns .mw-vplay:hover { background: ${FX.pink}; }
.mw.fest .mw-perk { border: 0; box-shadow: 0 10px 26px rgba(28,31,94,0.1); }
.mw.fest .mw-perk-ico { background: #ffe3f1; color: ${FX.pink}; }
.mw.fest .mw-perk:nth-child(2) .mw-perk-ico { background: #e6ecff; color: ${FX.blue}; }

/* 참여 방법·기업·FAQ */
.mw.fest .mw-step { border: 0; border-radius: 26px; background: #f4f6ff; }
.mw.fest .mw-step:hover { border: 0; box-shadow: 0 16px 36px rgba(45,91,255,0.15); }
.mw.fest .mw-step-n { -webkit-text-stroke: 0; color: ${FX.pink}; font-family: ${FX_FONT}; font-weight: 800; }
.mw.fest .mw-steps > div:nth-child(2) .mw-step-n { color: ${FX.blue}; }
.mw.fest .mw-steps > div:nth-child(3) .mw-step-n { color: ${FX.violet}; }
.mw.fest .mw-step b { font-family: ${FX_FONT}; font-size: 21px; }
.mw.fest .mw-note { border-radius: 18px; background: #fff0f7; border-color: #ffc2de; color: #b0145f; }
.mw.fest .mw-co { border: 0; border-radius: 24px; box-shadow: 0 10px 26px rgba(28,31,94,0.08); }
.mw.fest .mw-co:hover { box-shadow: 0 20px 44px rgba(255,46,147,0.18); }
.mw.fest .mw-co-top { background: linear-gradient(135deg, #f0e9ff, #e6f4ff); }
.mw.fest .mw-co-name { font-family: ${FX_FONT}; font-size: 19px; }
.mw.fest .mw-co-foot { color: ${FX.pink}; }
.mw.fest .mw-filters { border: 0; box-shadow: 0 8px 22px rgba(28,31,94,0.1); }
.mw.fest .mw-filter.on { background: ${FX.pink}; }
.mw.fest .mw-filter.on em { color: #fff; }
.mw.fest .mw-q { color: ${FX.pink}; font-family: ${FX_FONT}; }
.mw.fest .mw-faq summary { font-family: ${FX_FONT}; font-size: 19px; }
.mw.fest .mw-faq details[open] summary::after { color: ${FX.pink}; }

/* 마무리 */
.mw.fest .mw-end { background: ${FX_BG}; position: relative; overflow: hidden; }
.mw.fest .mw-end::before { content: ''; position: absolute; left: 20%; right: -10%; bottom: 10px; height: 160px; background: ${BRUSH} center/100% 100% no-repeat; opacity: 0.35; transform: rotate(-4deg); pointer-events: none; }
.mw.fest .mw-end .mw-in { position: relative; }
.mw.fest .mw-end h2 { color: #fff; font-size: 52px; text-shadow: 0 4px 0 ${FX.blue}; }
.mw.fest .mw-end .mw-chip { background: ${FX.pink}; border-radius: 4px; }

/* 팝업·갤러리(페이지 밖 레이어) */
.fx-root .mw-sheet-head { background: radial-gradient(circle at 0% 0%, #ffe3f1, #fff 60%); }
.fx-root .mw-sheet-title > span, .fx-root .mw-job-go { color: #e0157a; }
.fx-root .mw-job:hover { background: #fff2f8; }
.fx-root .mw-gal-slide:hover { border-color: ${FX.pink}; color: #e0157a; }
.fx-root .mw-gal-tabs button.on { color: #e0157a; }
.fx-root .mw-gal-tabs button.on::after { background: ${FX.pink}; }
.fx-root .mw-lb-nav:hover { background: ${FX.pink}; }
.fx-root .mw-lb-thumbs button.on { border-color: ${FX.pink}; }

/* 첫 등장 */
.mw.fest .fx-hero-l > *, .mw.fest .fx-hero-r { opacity: 0; transform: translateY(26px); animation: fx-rise .8s cubic-bezier(.16,1,.3,1) forwards; }
.mw.fest .fx-hero-l > *:nth-child(2) { animation-delay: .1s; }
.mw.fest .fx-hero-l > *:nth-child(3) { animation-delay: .2s; }
.mw.fest .fx-hero-l > *:nth-child(4) { animation-delay: .28s; }
.mw.fest .fx-hero-l > *:nth-child(5) { animation-delay: .36s; }
.mw.fest .fx-hero-l > *:nth-child(6) { animation-delay: .44s; }
.mw.fest .fx-hero-r { animation-delay: .3s; }
@keyframes fx-rise { to { opacity: 1; transform: none; } }
@media (prefers-reduced-motion: reduce) {
  .mw.fest .fx-hero-l > *, .mw.fest .fx-hero-r { animation: none; opacity: 1; transform: none; }
  .mw.fest .fx-kb-row, .mw.fest .fx-bubble, .mw.fest .mw-ride-line { animation: none; }
}

@media (max-width: 1024px) {
  .mw.fest .fx-hero-in { grid-template-columns: 1fr; gap: 36px; }
  .mw.fest .fx-hero-r { max-width: 560px; }
  .mw.fest .fx-stats { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 640px) {
  .mw.fest .fx-hero { padding-top: 92px; }
  .mw.fest .fx-h1 span { font-size: 46px; }
  .mw.fest .fx-when { font-size: 18px; }
  .mw.fest .fx-hero-r { padding: 10px 6px 50px; }
  .mw.fest .fx-bubble { font-size: 15px; padding: 7px 12px; border-width: 3px; }
  .mw.fest .fx-bubble.b2 { left: -6px; }
  .mw.fest .fx-count-cell { min-width: 0; flex: 1; }
  .mw.fest .fx-count-cell b { font-size: 28px; }
  .mw.fest .fx-stats { gap: 10px; padding-bottom: 40px; }
  .mw.fest .fx-stats dd { font-size: 34px; }
  .mw.fest .fx-stats dd.sm { font-size: 15px; }
  .mw.fest .fx-kb-row b { font-size: 40px; gap: 18px; padding-right: 18px; }
  .mw.fest .fx-kb-row i { font-size: 22px; }
  .mw.fest .mw-end h2 { font-size: 32px; }
  .mw.fest .fx-venue-head { grid-template-columns: 1fr; gap: 24px; }
  .mw.fest .fx-map { max-width: 300px; margin: 0 auto; border-radius: 20px; border-width: 4px; }
  .mw.fest .mw-ride-line { width: 30px; height: 64px; margin: 0 auto; background: ${FX.blue}; animation: none; }
}
`;

export async function getStaticProps() {
  let jobs = [];
  try {
    const { fetchKtcJobs } = await import('../lib/ktcJobs');
    jobs = (await fetchKtcJobs()).filter((j) => j.isMatchingWeek).map((j) => ({
      id: j.id, title: j.title || '', company: j.company || '', logo: j.companyLogo || null,
      location: j.location || null, experience: j.experience || null, group: j.group, website: j.companyWebsite || null,
    }));
  } catch (e) {
    console.error('matching-week: ktc jobs', e);
  }
  // 회사별로 묶고, 공고 많은 회사 먼저. 같은 회사가 'D3'·'D3 Company'처럼 표기가 갈려 있어 뒤의 Company 는 떼고 묶는다
  const byCo = new Map();
  for (const j of jobs) {
    const key = j.company.replace(/\s+company$/i, '').toLowerCase();
    const g = byCo.get(key) || { name: j.company, logo: CO_LOGO[key.trim()] || null, website: CO_SITE[key.trim()] || null, intro: CO_INTRO[key.trim()] || null, jobs: [] };
    g.jobs.push(j);
    if (j.company.length > g.name.length) g.name = j.company;
    if (!g.logo && j.logo) g.logo = j.logo;
    if (!g.website && j.website) g.website = j.website;
    byCo.set(key, g);
  }
  const companies = [...byCo.values()].sort((a, b) => b.jobs.length - a.jobs.length || a.name.localeCompare(b.name));
  // D-day 는 서버에서 계산해 내려 준다(클라이언트에서 다시 재면 하이드레이션이 어긋난다). revalidate 5분이라 날짜는 맞게 넘어간다
  const daysLeft = Math.max(0, Math.ceil((EVENT_AT.getTime() - Date.now()) / 86400000));
  return { props: { companies, total: jobs.length, daysLeft }, revalidate: 300 };
}

const FILTERS = ['all', 'IT', 'Non-IT'];

function Logo({ c, size }) {
  return (
    <div className="mw-logo" style={{ width: size, height: size }}>
      {c.logo ? <img src={c.logo} alt={c.name} loading="lazy" /> : <span>{c.name.trim().charAt(0).toUpperCase()}</span>}
    </div>
  );
}

const Arrow = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 18l6-6-6-6" /></svg>;

function KBand({ words }) {
  const row = (cls) => (
    <div className={'fx-kb-row ' + cls}>
      {[0, 1].map((k) => <span key={k}>{words.map((w) => <b key={w}>{w}<i>✦</i></b>)}</span>)}
    </div>
  );
  return <div className="fx-kb" aria-hidden="true">{row('outline')}{row('fill')}</div>;
}

/* variant='fest'(기본) — 축제(포스터) 스킨. 'classic' 은 초안 디자인. /matching-week-v2 는 같은 화면을 page 만 바꿔 렌더(계측 구분·noindex). */
export default function MatchingWeek({ companies, total, daysLeft, variant = 'fest', page = '/matching-week' }) {
  const { t } = useT();
  const fest = variant === 'fest';
  const PAGE = page; // 이벤트 계측 페이지 구분
  const [copied, setCopied] = useState(false);
  const [slide, setSlide] = useState(0);
  const [left, setLeft] = useState(null); // v2 카운트다운(마운트 후에만 — 서버/클라 시간이 달라 하이드레이션 어긋남 방지)
  useEffect(() => {
    if (!fest) return;
    const tick = () => {
      const ms = Math.max(0, EVENT_AT.getTime() - Date.now());
      setLeft({ d: Math.floor(ms / 864e5), h: Math.floor(ms / 36e5) % 24, m: Math.floor(ms / 6e4) % 60, s: Math.floor(ms / 1e3) % 60 });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [fest]);
  const videoBox = useRef(null);
  const videoRef = useRef(null);
  const [muted, setMuted] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [vt, setVt] = useState({ cur: 0, dur: 0 }); // 재생 위치·길이(초)
  const userPaused = useRef(false); // 직접 멈췄으면 스크롤로 다시 자동재생하지 않는다

  // 안내 영상: 절반 이상 보이면 재생, 벗어나면 정지(브라우저 자동재생 정책상 음소거 상태로 시작)
  useEffect(() => {
    const box = videoBox.current; const v = videoRef.current;
    if (!box || !v || !('IntersectionObserver' in window)) return;
    let played = false;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        if (userPaused.current) return;
        v.play().catch(() => {});
        if (!played) { played = true; track('mw_video_play', { page: PAGE }); }
      } else v.pause();
    }, { threshold: 0.5 });
    io.observe(box);
    return () => io.disconnect();
  }, []);
  const togglePlay = () => {
    const v = videoRef.current; if (!v) return;
    if (v.paused) { userPaused.current = false; v.play().catch(() => {}); }
    else { userPaused.current = true; v.pause(); }
  };
  const seek = (sec) => {
    const v = videoRef.current; if (!v || !v.duration) return;
    v.currentTime = Math.min(Math.max(sec, 0), v.duration - 0.1);
    setVt({ cur: v.currentTime, dur: v.duration });
  };
  const fmt = (x) => `${Math.floor(x / 60)}:${String(Math.floor(x % 60)).padStart(2, '0')}`;
  const toggleMute = () => {
    const v = videoRef.current; if (!v) return;
    v.muted = !muted; setMuted(!muted);
    if (muted) { v.play().catch(() => {}); track('mw_video_unmute', { page: PAGE }); }
  };

  // 히어로 사진 5초마다 교차 페이드(모션 줄이기 설정이면 첫 장 고정)
  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const id = setInterval(() => setSlide((i) => (i + 1) % HERO_SLIDES.length), 5000);
    return () => clearInterval(id);
  }, []);
  const [filter, setFilter] = useState('all');
  const [open, setOpen] = useState(null); // 공고 팝업을 띄운 회사(필터 적용된 공고만 들고 있다)
  // 사진 갤러리(숙소 예약 사이트식): 탭 + 3열 그리드 모달 → 사진을 누르면 크게 보기(view = 현재 탭 사진 인덱스)
  const [gallery, setGallery] = useState(null); // 선택된 탭 key('all' | 앨범 key)
  const [view, setView] = useState(null);
  const [mapOpen, setMapOpen] = useState(false); // v2 공식 지도 크게 보기

  // 팝업·라이트박스가 떠 있는 동안 뒤 페이지 스크롤 잠금 + Esc 로 닫기(라이트박스는 ←/→ 로 넘김)
  useEffect(() => {
    if (!open && !gallery && !mapOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => {
      if (e.key === 'Escape') { if (view !== null) setView(null); else { setOpen(null); setGallery(null); setMapOpen(false); } }
      if (view !== null && e.key === 'ArrowRight') step(1);
      if (view !== null && e.key === 'ArrowLeft') step(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, gallery, view, mapOpen]);

  const albumTitle = (a) => (a.m ? t(`mw.past.${a.key}`) : t(`mw.prog.${a.key}.title`)) + (a.demo ? ` · ${t('mw.album.demo')}` : '');
  // 갤러리 탭 묶음 — 구성(해커톤 등) 카드로 열면 구성끼리, 앨범 카드로 열면 앨범끼리(+전체)
  const isContent = !!gallery && gallery.startsWith('c-');
  const group = isContent ? CONTENTS : ALBUMS;
  const groupTitle = (a) => (isContent ? t(`mw.content.${a.icon}.title`) : albumTitle(a));
  const tabPhotos = !gallery ? [] : gallery === 'all' ? ALBUMS.flatMap((a) => a.photos) : (group.find((a) => a.key === gallery)?.photos || []);
  const tabTitle = !gallery ? '' : gallery === 'all' ? t('mw.album.all') : groupTitle(group.find((a) => a.key === gallery) || {});
  const galleryTabs = isContent
    ? CONTENTS.map((a) => ({ key: a.key, title: groupTitle(a), n: a.photos.length }))
    : [{ key: 'all', title: t('mw.album.all'), n: ALBUMS.reduce((n, a) => n + a.photos.length, 0) }, ...ALBUMS.map((a) => ({ key: a.key, title: albumTitle(a), n: a.photos.length }))];
  const step = (d) => setView((i) => (i === null ? i : (i + d + tabPhotos.length) % tabPhotos.length));
  const openAlbum = (a) => {
    if (!a.photos.length) return;
    setGallery(a.key); setView(null);
    track('mw_album_open', { meta: { album: a.key }, page: PAGE });
  };

  // 앨범 카드 — 사진이 있으면 표지 + 장수, 없으면 월 숫자 플레이스홀더
  const AlbumCard = ({ a, title, desc, big }) => {
    const has = a.photos.length > 0;
    const status = a.next ? t('mw.past.upcoming') : has ? t('mw.album.count', { n: a.photos.length }) : t('mw.album.soon');
    return (
      <button type="button" className={'mw-album' + (big ? ' wide' : '') + (a.next ? ' next' : '') + (has ? '' : ' empty')} onClick={() => openAlbum(a)} disabled={!has} aria-label={title}>
        {has && <span className="mw-album-bg" style={{ backgroundImage: `url(${a.cover || a.photos[0]})` }} aria-hidden="true" />}
        {a.m && <span className="mw-album-m" aria-hidden="true">{a.m}</span>}
        <span className="mw-album-txt">
          <b>{title}</b>
          {desc && <small>{desc}</small>}
          <em className={a.next ? 'live' : has ? 'done' : ''}>{status}</em>
        </span>
        {has && <span className="mw-album-go" aria-hidden="true"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="3" /><circle cx="9" cy="9" r="2" /><path d="M21 15l-5-5L5 21" /></svg></span>}
      </button>
    );
  };

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    track('page_view', { page: PAGE, meta: { utm_source: q.get('utm_source'), utm_medium: q.get('utm_medium'), utm_campaign: q.get('utm_campaign'), referrer: document.referrer || null } });
  }, []);

  // 친구에게 공유 — 모바일은 공유 시트, 아니면 링크 복사
  const share = async () => {
    const url = 'https://salary-fyi.com/matching-week';
    track('mw_share_click', { page: PAGE });
    try {
      if (navigator.share) { await navigator.share({ title: t('mw.metaTitle'), url }); return; }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const shown = companies
    .map((c) => ({ ...c, jobs: filter === 'all' ? c.jobs : c.jobs.filter((j) => j.group === filter) }))
    .filter((c) => c.jobs.length > 0);
  const count = (f) => (f === 'all' ? total : companies.reduce((n, c) => n + c.jobs.filter((j) => j.group === f).length, 0));

  const Eyebrow = ({ n, children }) => <div className="mw-eyebrow"><span>{n}</span>{children}</div>;

  return (
    <>
      <Head>
        <title>{t('mw.metaTitle')}</title>
        <meta name="description" content={t('mw.metaDesc')} />
        <meta property="og:title" content={t('mw.metaTitle')} />
        <meta property="og:description" content={t('mw.metaDesc')} />
        <meta property="og:image" content="https://salary-fyi.com/main/matching-week.jpg" />
        <meta property="og:url" content="https://salary-fyi.com/matching-week" />
        <link rel="canonical" href="https://salary-fyi.com/matching-week" />
        {/* v2 는 직접 링크로만 들어오는 시안 — 검색 노출 막음 */}
        {PAGE !== '/matching-week' && <meta name="robots" content="noindex, nofollow" />}
        {fest && <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@700;800&display=swap" />}
      </Head>

      <div className={'mw' + (fest ? ' fest' : '')}>
        {/* ── 히어로(v2 포스터형) — 미아 무드 이미지 'MAP - NOV NEW' 톤: 하늘·바이올렛·핑크 그라데이션, 흰 붓터치, 말풍선 ── */}
        {fest && (
          <header className="fx-hero">
            <span className="fx-brush fx-brush-1" aria-hidden="true" />
            <span className="fx-brush fx-brush-2" aria-hidden="true" />
            <div className="fx-hero-in">
              <div className="fx-hero-l">
                <div className="fx-tags">
                  <span className="fx-tag">K-Tech College 2026</span>
                  <span className="fx-tag pink">{daysLeft > 0 ? `D-${daysLeft}` : 'D-DAY'}</span>
                </div>
                <h1 className="fx-h1"><span>November</span><span>Matching Week</span></h1>
                <p className="fx-when">19.11.2026 · COBI Home, TP.HCM</p>
                <div className="fx-count" aria-label="countdown">
                  {[['d', 'DAYS'], ['h', 'HRS'], ['m', 'MIN'], ['s', 'SEC']].map(([k, label]) => (
                    <div key={k} className="fx-count-cell">
                      <b key={left ? left[k] : '-'}>{left ? String(left[k]).padStart(2, '0') : '--'}</b>
                      <span>{label}</span>
                    </div>
                  ))}
                </div>
                <p className="mw-sub">{t('mw.sub', { companies: companies.length, jobs: total })}</p>
                <div className="mw-ctas">
                  <a href="#companies" className="mw-btn mw-btn-primary" onClick={() => track('mw_cta_click', { page: PAGE })}>{t('mw.cta')}</a>
                  <button className="mw-btn mw-btn-ghost" onClick={share}>{copied ? t('mw.copied') : t('mw.share')}</button>
                </div>
              </div>
              <div className="fx-hero-r">
                <div className="fx-frame">
                  {HERO_SLIDES.map((h, i) => (
                    <span key={h.src} className={'mw-hero-slide' + (i === slide ? ' on' : '')} style={{ backgroundImage: `url(${h.src})`, backgroundPosition: h.pos }} aria-hidden="true" />
                  ))}
                  <div className="mw-hero-dots fx-dots">
                    {HERO_SLIDES.map((h, i) => <button key={h.src} className={i === slide ? 'on' : ''} aria-label={`${i + 1}`} onClick={() => setSlide(i)} />)}
                  </div>
                </div>
                <span className="fx-bubble b1">1:1 Interview <i>★</i></span>
                <span className="fx-bubble b2"><i>★</i> AI Hackathon</span>
                <span className="fx-bubble b3">Mentoring <i>★</i></span>
              </div>
            </div>
            <dl className="fx-stats">
              <div><dt>{t('mw.stat.companies')}</dt><dd>{companies.length}</dd></div>
              <div><dt>{t('mw.stat.jobs')}</dt><dd>{total}</dd></div>
              <div><dt>{t('mw.fact.dateLabel')}</dt><dd className="sm">{t('mw.fact.date')}</dd></div>
              <div><dt>{t('mw.fact.formatLabel')}</dt><dd className="sm">{t('mw.fact.format')}</dd></div>
            </dl>
          </header>
        )}
        {/* ── 히어로 ── */}
        {!fest && (
        <header className="mw-hero">
          <div className="mw-hero-slides" aria-hidden="true">
            {HERO_SLIDES.map((h, i) => (
              <span key={h.src} className={'mw-hero-slide' + (i === slide ? ' on' : '')} style={{ backgroundImage: `url(${h.src})`, backgroundPosition: h.pos }} />
            ))}
          </div>
          <div className="mw-hero-dots">
            {HERO_SLIDES.map((h, i) => <button key={h.src} className={i === slide ? 'on' : ''} aria-label={`${i + 1}`} onClick={() => setSlide(i)} />)}
          </div>
          <div className="mw-hero-in">
            <div className="mw-hero-l">
              <div className="mw-chips">
                <span className="mw-chip">{daysLeft > 0 ? `D-${daysLeft}` : 'D-DAY'}</span>
                <span className="mw-chip mw-chip-ghost">Matching Week · 19.11.2026</span>
              </div>
              <h1>{t('mw.title')}</h1>
              <p className="mw-sub">{t('mw.sub', { companies: companies.length, jobs: total })}</p>
              <div className="mw-ctas">
                <a href="#companies" className="mw-btn mw-btn-primary" onClick={() => track('mw_cta_click', { page: PAGE })}>{t('mw.cta')}</a>
                <button className="mw-btn mw-btn-ghost" onClick={share}>{copied ? t('mw.copied') : t('mw.share')}</button>
              </div>
            </div>
            <dl className="mw-panel">
              <div className="mw-stat"><dt>{t('mw.stat.companies')}</dt><dd>{companies.length}</dd></div>
              <div className="mw-stat"><dt>{t('mw.stat.jobs')}</dt><dd>{total}</dd></div>
              <div className="mw-row"><dt>{t('mw.fact.dateLabel')}</dt><dd>{t('mw.fact.date')}</dd></div>
              <div className="mw-row"><dt>{t('mw.fact.placeLabel')}</dt><dd>{t('mw.fact.place')}</dd></div>
              <div className="mw-row"><dt>{t('mw.fact.formatLabel')}</dt><dd>{t('mw.fact.format')}</dd></div>
            </dl>
          </div>
        </header>
        )}

        {/* v2: 대형 키네틱 타이포 띠 — 외곽선 줄과 그라데이션 줄이 서로 반대로 흐른다 */}
        {fest && <KBand words={['MATCHING WEEK', '19.11.2026', 'HO CHI MINH', '1:1 INTERVIEW', 'HACKATHON', 'MENTORING']} />}

        {/* ── 주최·후원 ── */}
        <div className="mw-orgs">
          <div className="mw-in mw-orgs-in">
            <p>{t('mw.orgs')}</p>
            <div className="mw-orgs-logos">
              {ORGS.map((o) => <img key={o.src} src={o.src} alt={o.alt} style={{ height: o.h }} />)}
            </div>
          </div>
        </div>

        {/* ── 01 신뢰: 처음 하는 행사가 아니다(다크) ── */}
        <section className="mw-sec mw-dark">
          <div className="mw-in">
            <Reveal>
              <Eyebrow n="01">Track record</Eyebrow>
              <h2 className="mw-title">{t('mw.past.title')}</h2>
              <p className="mw-lead">{t('mw.past.sub')}</p>
            </Reveal>
            <Reveal delay={100}>
              <div className="mw-albums">
                {EVENTS.map((e) => <AlbumCard key={e.key} a={e} title={t(`mw.past.${e.key}`)} desc={e.demo ? t('mw.album.demoDesc') : undefined} />)}
              </div>
            </Reveal>
            {/* 매칭위크에서 하는 것 — 구성별 카드, 누르면 그 장면 사진 갤러리 */}
            <Reveal delay={120}>
              <h3 className="mw-subtitle">{t('mw.content.title')}</h3>
              <p className="mw-lead mw-lead-sm">{t('mw.content.sub')}</p>
              <div className="mw-contents">
                {CONTENTS.map((c, i) => (
                  <button key={c.key} type="button" className="mw-content" onClick={() => openAlbum(c)}>
                    <span className="mw-content-img" style={{ backgroundImage: `url(${c.cover})` }} aria-hidden="true">
                      <span className="mw-content-n">0{i + 1}</span>
                    </span>
                    <span className="mw-content-body">
                      <span className="mw-content-ico"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{CONTENT_ICONS[c.icon]}</svg></span>
                      <b>{t(`mw.content.${c.icon}.title`)}</b>
                      <small>{t(`mw.content.${c.icon}.desc`)}</small>
                      <em>{t('mw.album.count', { n: c.photos.length })} →</em>
                    </span>
                  </button>
                ))}
              </div>
            </Reveal>
            <Reveal delay={150}>
              <h3 className="mw-subtitle">{t('mw.programs.title')}</h3>
              <p className="mw-lead mw-lead-sm">{t('mw.programs.sub')}</p>
              <div className="mw-albums mw-albums-2">
                {PROGRAMS.map((p) => <AlbumCard key={p.key} a={p} big title={t(`mw.prog.${p.key}.title`)} desc={t(`mw.prog.${p.key}.desc`)} />)}
              </div>
            </Reveal>
          </div>
          {/* 현장 분위기 — 사진이 끝없이 흐르는 띠 */}
          <div className="mw-marquee" aria-hidden="true">
            <div className="mw-marquee-track">
              {[...MARQUEE, ...MARQUEE].map((src, i) => <img key={i} src={src} alt="" loading="lazy" />)}
            </div>
          </div>
        </section>

        {/* ── 02 오시는 길 — 위: 탑승지→행사장 이동 경로(다크) / 아래: 안내 영상 · 지도 · 알아두세요 ── */}
        <section className="mw-sec mw-warm">
          <div className="mw-in">
            {/* v2 는 제목 오른쪽에 공식 지도 이미지를 나란히(한 줄을 통째로 차지하지 않게) */}
            <div className={fest ? 'fx-venue-head' : undefined}>
              <Reveal>
                <Eyebrow n="02">Getting there</Eyebrow>
                <h2 className="mw-title">{t('mw.venue.title')}</h2>
                <p className="mw-lead">{t('mw.venue.sub')}</p>
              </Reveal>
              {fest && (
                <Reveal delay={60}>
                  <button type="button" className="fx-map" onClick={() => { setMapOpen(true); track('mw_venue_map_open', { page: PAGE }); }} aria-label={t('mw.venue.mapZoom')}>
                    <img src="/matching-week/venue-map.jpg" alt="Venue map — November Matching Week" loading="lazy" />
                    <span className="fx-map-zoom">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3M11 8v6M8 11h6" /></svg>
                      {t('mw.venue.mapZoom')}
                    </span>
                  </button>
                </Reveal>
              )}
            </div>
            <Reveal delay={80}>
              <div className="mw-journey">
                <a href={VENUE.shuttle.url} target="_blank" rel="noopener noreferrer" className="mw-jstop" onClick={() => track('mw_map_click', { meta: { to: 'shuttle' }, page: PAGE })}>
                  <span className="mw-jstop-ico"><Bus /></span>
                  <em>{t('mw.venue.shuttleLabel')}</em>
                  <b>{VENUE.shuttle.name}</b>
                  <small>{VENUE.shuttle.address}</small>
                  <span className="mw-jstop-go">Google Maps ↗</span>
                </a>
                <div className="mw-ride">
                  <div className="mw-ride-go">
                    <span className="mw-ride-k">{t('mw.venue.go')}</span>
                    <span className="mw-ride-times">{VENUE.departures.map((d) => <b key={d}>{d}</b>)}</span>
                    <span className="mw-ride-dur">{t('mw.venue.duration')}</span>
                  </div>
                  <div className="mw-ride-line" aria-hidden="true"><span className="mw-ride-bus"><Bus /></span></div>
                  <div className="mw-ride-back">
                    <span className="mw-ride-k">{t('mw.venue.back')}</span>
                    <span className="mw-ride-desc">{t('mw.venue.backDesc')}</span>
                  </div>
                </div>
                <a href={VENUE.venue.url} target="_blank" rel="noopener noreferrer" className="mw-jstop mw-jstop-end" onClick={() => track('mw_map_click', { meta: { to: 'venue' }, page: PAGE })}>
                  <span className="mw-jstop-ico"><Pin /></span>
                  <em>{t('mw.venue.venueLabel')}</em>
                  <b>{VENUE.venue.name}</b>
                  <small>{VENUE.venue.address}</small>
                  <span className="mw-jstop-go">Google Maps ↗</span>
                </a>
              </div>
            </Reveal>
            <Reveal delay={140}>
              <div className="mw-venue-grid">
                {/* 오시는 길 안내 영상(드라이브 'EVENT - HD.mp4' 를 576px·8.5MB 로 압축) — 화면에 보이면 음소거 자동재생, 벗어나면 정지 */}
                <div className="mw-video" ref={videoBox}>
                  <video ref={videoRef} src="/matching-week/event.mp4" poster="/matching-week/event-poster.jpg" muted={muted} loop playsInline preload="metadata"
                    onClick={togglePlay}
                    onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)}
                    onLoadedMetadata={(e) => setVt({ cur: e.currentTarget.currentTime, dur: e.currentTarget.duration })}
                    onTimeUpdate={(e) => setVt({ cur: e.currentTarget.currentTime, dur: e.currentTarget.duration })} />
                  <button type="button" className="mw-mute" onClick={toggleMute} aria-label={muted ? 'unmute' : 'mute'}>
                    {muted
                      ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M11 5L6 9H2v6h4l5 4V5z" /><path d="M23 9l-6 6M17 9l6 6" /></svg>
                      : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M11 5L6 9H2v6h4l5 4V5z" /><path d="M15.5 8.5a5 5 0 010 7M19 5a10 10 0 010 14" /></svg>}
                    <span>{muted ? t('mw.venue.soundOn') : t('mw.venue.soundOff')}</span>
                  </button>
                  <span className="mw-video-txt">
                    <b>{t('mw.venue.videoTitle')}</b>
                    <span>{t('mw.venue.videoDesc')}</span>
                  </span>
                  {/* 재생 컨트롤 — 놓친 구간을 다시 볼 수 있게 10초 이동 + 드래그 진행 바 */}
                  <div className="mw-vctl">
                    <input type="range" className="mw-vbar" min={0} max={vt.dur || 0} step={0.1} value={vt.cur}
                      style={{ '--p': vt.dur ? `${(vt.cur / vt.dur) * 100}%` : '0%' }}
                      onChange={(e) => seek(Number(e.target.value))} aria-label="seek" />
                    <div className="mw-vbtns">
                      <button type="button" onClick={() => seek(vt.cur - 10)} aria-label="-10s">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 103-6.7L3 8" /><path d="M3 3v5h5" /></svg><small>10</small>
                      </button>
                      <button type="button" className="mw-vplay" onClick={togglePlay} aria-label={playing ? 'pause' : 'play'}>
                        {playing
                          ? <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>
                          : <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>}
                      </button>
                      <button type="button" onClick={() => seek(vt.cur + 10)} aria-label="+10s">
                        <small>10</small><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 12a9 9 0 11-3-6.7L21 8" /><path d="M21 3v5h-5" /></svg>
                      </button>
                      <span className="mw-vtime">{fmt(vt.cur)} / {fmt(vt.dur)}</span>
                    </div>
                  </div>
                </div>
                <div className="mw-venue-side">
                  <div className="mw-map"><iframe src={VENUE.mapEmbed} title="COBI Home map" loading="lazy" referrerPolicy="no-referrer-when-downgrade" /></div>
                  <div className="mw-perks">
                    <div className="mw-perk">
                      <span className="mw-perk-ico"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="8" width="18" height="13" rx="2" /><path d="M12 8v13M3 12h18M12 8S10.5 3 8 3a2.5 2.5 0 000 5M12 8s1.5-5 4-5a2.5 2.5 0 010 5" /></svg></span>
                      <span><b>{t('mw.venue.perk1.title')}</b><small>{t('mw.venue.perk1.desc')}</small></span>
                    </div>
                    <div className="mw-perk">
                      <span className="mw-perk-ico"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="17" rx="2" /><path d="M16 2v4M8 2v4M3 10h18M9 15l2 2 4-4" /></svg></span>
                      <span><b>{t('mw.venue.perk2.title')}</b><small>{t('mw.venue.perk2.desc')}</small></span>
                    </div>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ── 03 참여 방법 ── */}
        <section className="mw-sec">
          <div className="mw-in">
            <Reveal>
              <Eyebrow n="03">How it works</Eyebrow>
              <h2 className="mw-title">{t('mw.howTitle')}</h2>
            </Reveal>
            <div className="mw-steps">
              {[1, 2, 3].map((n) => (
                <Reveal key={n} delay={n * 90} style={{ height: '100%' }}>
                  <div className="mw-step">
                    <span className="mw-step-n">0{n}</span>
                    <b>{t(`mw.step${n}.title`)}</b>
                    <p>{t(`mw.step${n}.desc`)}</p>
                  </div>
                </Reveal>
              ))}
            </div>
            <p className="mw-note">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" /></svg>
              <span>{t('mw.note')}</span>
            </p>
          </div>
        </section>

        {/* ── 04 참가 기업 — 공고를 다 펼치면 길어 회사 카드만, 누르면 팝업 ── */}
        <section id="companies" className="mw-sec mw-gray">
          <div className="mw-in">
            <Reveal>
              <Eyebrow n="04">Companies</Eyebrow>
              <div className="mw-sec-head">
                <h2 className="mw-title">{t('mw.companiesTitle')} <span className="mw-accent">{shown.length}</span></h2>
                <div className="mw-filters" role="tablist">
                  {FILTERS.map((f) => (
                    <button key={f} role="tab" aria-selected={filter === f} className={'mw-filter' + (filter === f ? ' on' : '')}
                      onClick={() => { setFilter(f); track('mw_filter_click', { meta: { filter: f }, page: PAGE }); }}>
                      {f === 'all' ? t('mw.filter.all') : f} <em>{count(f)}</em>
                    </button>
                  ))}
                </div>
              </div>
            </Reveal>
            {shown.length === 0 ? <p className="mw-empty">{t('main.empty')}</p> : (
              <div className="mw-cos">
                {shown.map((c) => (
                  <button key={c.name} className="mw-co" onClick={() => { setOpen(c); track('mw_company_click', { meta: { company: c.name }, page: PAGE }); }}>
                    <div className="mw-co-top"><Logo c={c} size={64} /></div>
                    <div className="mw-co-body">
                      <div className="mw-co-name">{c.name}</div>
                      <ul className="mw-co-jobs">
                        {c.jobs.slice(0, 2).map((j) => <li key={j.id}>{j.title}</li>)}
                        {c.jobs.length > 2 && <li className="mw-more">{t('mw.more', { n: c.jobs.length - 2 })}</li>}
                      </ul>
                      <div className="mw-co-foot">
                        <span>{t('main.companies.count', { n: c.jobs.length })}</span>
                        <Arrow />
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* ── 05 FAQ ── */}
        <section className="mw-sec">
          <div className="mw-in mw-faq">
            <Reveal>
              <Eyebrow n="05">FAQ</Eyebrow>
              <h2 className="mw-title">{t('mw.faq.title')}</h2>
            </Reveal>
            <div className="mw-faq-list">
              {[1, 2, 3, 4, 5].map((n) => (
                <details key={n} onToggle={(e) => e.currentTarget.open && track('mw_faq_open', { meta: { n }, page: PAGE })}>
                  <summary><span className="mw-q">Q</span>{t(`mw.faq.${n}.q`)}</summary>
                  <p>{t(`mw.faq.${n}.a`)}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {fest && <KBand words={[`${companies.length} COMPANIES`, `${total} POSITIONS`, 'ONE DAY', 'SEE YOU AT COBI HOME']} />}

        {/* ── 마무리 CTA ── */}
        <section className="mw-end">
          <div className="mw-in">
            <Reveal>
              <span className="mw-chip">{daysLeft > 0 ? `D-${daysLeft}` : 'D-DAY'}</span>
              <h2>{t('mw.end.title')}</h2>
              <p>{t('mw.end.sub')}</p>
              <div className="mw-ctas">
                <a href="#companies" className="mw-btn mw-btn-primary" onClick={() => track('mw_cta_click', { meta: { at: 'end' }, page: PAGE })}>{t('mw.cta')}</a>
                <button className="mw-btn mw-btn-ghost" onClick={share}>{copied ? t('mw.copied') : t('mw.share')}</button>
              </div>
            </Reveal>
          </div>
        </section>
      </div>

      <div className={fest ? 'fx-root' : undefined}>
      {open && (
        <div className="mw-modal" onClick={() => setOpen(null)}>
          <div className="mw-sheet" role="dialog" aria-modal="true" aria-label={open.name} onClick={(e) => e.stopPropagation()}>
            <div className="mw-sheet-head">
              <Logo c={open} size={48} />
              <div className="mw-sheet-title">
                <h2>{open.name}</h2>
                <span>
                  {t('main.companies.count', { n: open.jobs.length })}
                  {open.website && <> · <a href={/^https?:/.test(open.website) ? open.website : `https://${open.website}`} target="_blank" rel="noopener noreferrer" className="mw-web">{t('mw.website')} ↗</a></>}
                </span>
              </div>
              <button className="mw-x" aria-label="close" onClick={() => setOpen(null)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="mw-sheet-body">
              {open.intro && <p className="mw-co-intro">{open.intro}</p>}
              {open.jobs.map((j) => (
                <Link key={j.id} href={`/jobs/${j.id}`} className="mw-job"
                  onClick={() => track('click_job_card', { meta: { jobId: j.id, title: j.title, company: j.company, via: 'matching_week' }, page: PAGE })}>
                  <div className="mw-job-main">
                    <div className="mw-job-t">{j.title}</div>
                    <div className="mw-job-tags">
                      {[j.location, j.experience].filter(Boolean).map((v) => <span key={v}>{v}</span>)}
                    </div>
                  </div>
                  <span className="mw-job-go">{t('mw.viewJd')} <Arrow /></span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {gallery && (
        <div className="mw-gal" onClick={() => setGallery(null)}>
          <div className="mw-gal-box" role="dialog" aria-modal="true" aria-label={tabTitle} onClick={(e) => e.stopPropagation()}>
            <div className="mw-gal-head">
              <button className="mw-gal-slide" onClick={() => setView(0)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M10 9l5 3-5 3z" fill="currentColor" /></svg>
                {t('mw.album.slideshow')}
              </button>
              <button className="mw-x" aria-label="close" onClick={() => setGallery(null)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="mw-gal-tabs" role="tablist">
              {galleryTabs.map((tab) => (
                <button key={tab.key} role="tab" aria-selected={gallery === tab.key} className={gallery === tab.key ? 'on' : ''}
                  onClick={() => { setGallery(tab.key); setView(null); }}>
                  {tab.title}<em>({tab.n})</em>
                </button>
              ))}
            </div>
            <div className="mw-gal-grid">
              {tabPhotos.map((src, i) => (
                <button key={src} onClick={() => setView(i)} aria-label={`${tabTitle} ${i + 1}`}>
                  <img src={src} alt="" loading="lazy" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {gallery && view !== null && (
        <div className="mw-lb" onClick={() => setView(null)}>
          <div className="mw-lb-top">
            <b>{tabTitle}</b>
            <span>{view + 1} / {tabPhotos.length}</span>
            <button className="mw-lb-x" aria-label="close" onClick={() => setView(null)}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12" /></svg>
            </button>
          </div>
          <div className="mw-lb-stage">
            <button className="mw-lb-nav prev" aria-label="prev" onClick={(e) => { e.stopPropagation(); step(-1); }}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6" /></svg></button>
            <img key={view} src={tabPhotos[view]} alt={`${tabTitle} ${view + 1}`} onClick={(e) => e.stopPropagation()} />
            <button className="mw-lb-nav next" aria-label="next" onClick={(e) => { e.stopPropagation(); step(1); }}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 18l6-6-6-6" /></svg></button>
          </div>
          <div className="mw-lb-thumbs" onClick={(e) => e.stopPropagation()}>
            {tabPhotos.map((src, i) => (
              <button key={src} className={i === view ? 'on' : ''} onClick={() => setView(i)} aria-label={`${i + 1}`}>
                <img src={src} alt="" loading="lazy" />
              </button>
            ))}
          </div>
        </div>
      )}

      {mapOpen && (
        <div className="mw-lb fx-map-lb" onClick={() => setMapOpen(false)}>
          <div className="mw-lb-top">
            <b>Venue map · November Matching Week</b>
            <button className="mw-lb-x" aria-label="close" onClick={() => setMapOpen(false)}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12" /></svg>
            </button>
          </div>
          <div className="mw-lb-stage">
            <img src="/matching-week/venue-map.jpg" alt="Venue map — November Matching Week" onClick={(e) => e.stopPropagation()} />
          </div>
        </div>
      )}
      </div>

      {fest && <style dangerouslySetInnerHTML={{ __html: FEST_CSS }} />}
      <style jsx global>{`
        .mw { background: #fff; color: #171717; min-height: 100%; overflow-x: hidden; }
        .mw-in { width: 90%; max-width: 1200px; margin: 0 auto; }
        .mw-sec { padding: 112px 0; position: relative; }
        .mw-dark { background: #0c0c0b; color: #fff; padding-bottom: 72px; }
        .mw-warm { background: linear-gradient(180deg, #fff8f2 0%, #fff 100%); }
        .mw-gray { background: #f7f7f8; }
        .mw-eyebrow { display: inline-flex; align-items: center; gap: 10px; font-size: 13px; font-weight: 700; letter-spacing: 1.6px; text-transform: uppercase; color: #ff6000; }
        .mw-eyebrow span { font-variant-numeric: tabular-nums; padding-right: 10px; border-right: 1px solid currentColor; opacity: 0.85; }
        .mw-title { margin: 14px 0 0; font-size: 44px; font-weight: 800; line-height: 1.18; letter-spacing: -1.2px; }
        .mw-accent { color: #ff6000; }
        .mw-lead { margin: 16px 0 0; font-size: 17px; color: #52525b; line-height: 1.7; max-width: 680px; }
        .mw-dark .mw-lead { color: rgba(255,255,255,0.68); }

        /* 히어로 */
        .mw-hero { position: relative; overflow: hidden; min-height: max(680px, 78vh); display: flex; align-items: flex-end; background: #0c0c0b; color: #fff; }
        .mw-hero-slides { position: absolute; inset: 0; }
        .mw-hero-slide { position: absolute; inset: 0; background-size: cover; opacity: 0; transform: scale(1.08); transition: opacity 1.4s ease, transform 7s linear; }
        .mw-hero-slide.on { opacity: 1; transform: scale(1); } /* 켜지는 동안 천천히 줌아웃(켄 번즈) */
        .mw-hero::after { content: ''; position: absolute; inset: 0; pointer-events: none; background: linear-gradient(180deg, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.05) 25%, rgba(0,0,0,0.05) 50%, rgba(0,0,0,0.55) 75%, rgba(12,12,11,0.95) 100%); }
        .mw-hero-dots { position: absolute; z-index: 2; top: 24px; right: max(5%, calc((100% - 1200px) / 2)); display: flex; gap: 6px; }
        .mw-hero-dots button { width: 8px; height: 8px; padding: 0; border: 0; border-radius: 999px; background: rgba(255,255,255,0.45); cursor: pointer; transition: width .3s, background .3s; }
        .mw-hero-dots button.on { width: 24px; background: #fff; }
        @media (prefers-reduced-motion: reduce) { .mw-hero-slide { transition: none; } }
        .mw-hero-in { position: relative; z-index: 1; width: 90%; max-width: 1200px; margin: 0 auto; padding: 160px 0 64px; display: flex; align-items: flex-end; justify-content: space-between; gap: 48px; }
        .mw-hero-l { flex: 1; min-width: 0; max-width: 660px; }
        .mw-chips { display: flex; gap: 8px; flex-wrap: wrap; }
        .mw-chip { display: inline-flex; align-items: center; height: 30px; padding: 0 13px; border-radius: 999px; background: #ff6000; color: #fff; font-size: 13px; font-weight: 800; letter-spacing: 0.4px; }
        .mw-chip-ghost { background: rgba(255,255,255,0.14); border: 1px solid rgba(255,255,255,0.22); -webkit-backdrop-filter: blur(8px); backdrop-filter: blur(8px); font-weight: 600; }
        .mw-hero h1 { margin: 20px 0 0; font-size: 60px; font-weight: 800; line-height: 1.08; letter-spacing: -1.8px; text-shadow: 0 2px 24px rgba(0,0,0,0.3); }
        .mw-sub { margin: 18px 0 0; font-size: 18px; line-height: 1.6; color: rgba(255,255,255,0.85); }
        .mw-ctas { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 32px; }
        .mw-btn { display: inline-flex; align-items: center; justify-content: center; height: 54px; padding: 0 28px; border-radius: 14px; font: inherit; font-size: 16px; font-weight: 700; text-decoration: none; cursor: pointer; transition: background .15s, transform .15s, box-shadow .15s; }
        .mw-btn:hover { transform: translateY(-2px); }
        .mw-btn-primary { background: #ff6000; color: #fff; border: 0; box-shadow: 0 10px 30px rgba(255,96,0,0.42); }
        .mw-btn-primary:hover { background: #ff6f17; box-shadow: 0 14px 36px rgba(255,96,0,0.55); }
        .mw-btn-ghost { background: rgba(255,255,255,0.1); color: #fff; border: 1px solid rgba(255,255,255,0.3); -webkit-backdrop-filter: blur(8px); backdrop-filter: blur(8px); }
        .mw-btn-ghost:hover { background: rgba(255,255,255,0.2); }
        .mw-panel { flex: none; width: 350px; margin: 0; padding: 24px 26px; border-radius: 22px; background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.16); -webkit-backdrop-filter: blur(18px); backdrop-filter: blur(18px); display: grid; grid-template-columns: 1fr 1fr; gap: 0 16px; box-shadow: 0 20px 60px rgba(0,0,0,0.3); }
        .mw-stat { padding-bottom: 18px; margin-bottom: 6px; border-bottom: 1px solid rgba(255,255,255,0.14); }
        .mw-stat dt { font-size: 13px; color: rgba(255,255,255,0.65); }
        .mw-stat dd { margin: 4px 0 0; font-size: 46px; font-weight: 800; line-height: 1; letter-spacing: -1px; background: linear-gradient(180deg, #ffb27f, #ff6000); -webkit-background-clip: text; background-clip: text; color: transparent; }
        .mw-row { grid-column: 1 / -1; display: flex; justify-content: space-between; gap: 16px; padding: 11px 0; font-size: 14px; }
        .mw-row + .mw-row { border-top: 1px solid rgba(255,255,255,0.1); }
        .mw-row dt { color: rgba(255,255,255,0.6); flex: none; }
        .mw-row dd { margin: 0; font-weight: 600; text-align: right; }

        /* 주최 띠 — 히어로 다크와 이어지게 */
        .mw-orgs { background: #fff; border-bottom: 1px solid #f0f0f2; }
        .mw-orgs-in { padding: 26px 0; display: flex; align-items: center; justify-content: space-between; gap: 16px 40px; flex-wrap: wrap; }
        .mw-orgs-in p { margin: 0; font-size: 15px; font-weight: 600; color: #3f3f46; max-width: 420px; line-height: 1.5; }
        .mw-orgs-logos { display: flex; align-items: center; gap: 36px; flex-wrap: wrap; }
        .mw-orgs-logos img { width: auto; display: block; }

        /* 01 트랙레코드 */
        @keyframes mw-pulse { 0%, 100% { box-shadow: 0 0 0 0 rgba(255,96,0,0.7); } 50% { box-shadow: 0 0 0 6px rgba(255,96,0,0); } }
        /* 앨범 카드 */
        .mw-albums { margin-top: 44px; display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; }
        .mw-albums-2 { margin-top: 24px; grid-template-columns: repeat(2, 1fr); }
        .mw-album { position: relative; aspect-ratio: 3 / 4; padding: 0; border: 1px solid rgba(255,255,255,0.1); border-radius: 22px; overflow: hidden; background: linear-gradient(160deg, #1d1d1b, #121211); color: #fff; font: inherit; text-align: left; cursor: pointer; display: flex; align-items: flex-end; transition: transform .25s, border-color .25s, box-shadow .25s; }
        .mw-album.wide { aspect-ratio: 16 / 9; }
        .mw-album:not(:disabled):hover { transform: translateY(-4px); border-color: rgba(255,138,61,0.6); box-shadow: 0 20px 50px rgba(0,0,0,0.5); }
        .mw-album:disabled { cursor: default; }
        .mw-album.empty { background: repeating-linear-gradient(135deg, #171716 0 14px, #1b1b1a 14px 28px); }
        .mw-album.next { background: radial-gradient(circle at 30% 0%, rgba(255,96,0,0.55), transparent 60%), linear-gradient(160deg, #2a1608, #120a05); border-color: rgba(255,96,0,0.6); box-shadow: 0 0 50px rgba(255,96,0,0.18); }
        .mw-album-bg { position: absolute; inset: 0; background-size: cover; background-position: center; transition: transform .8s cubic-bezier(.2,.8,.2,1); }
        .mw-album-bg::after { content: ''; position: absolute; inset: 0; background: linear-gradient(180deg, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0) 35%, rgba(0,0,0,0.85) 100%); }
        .mw-album:not(:disabled):hover .mw-album-bg { transform: scale(1.07); }
        .mw-album-m { position: absolute; top: 14px; left: 18px; font-size: 64px; font-weight: 800; letter-spacing: -3px; line-height: 1; color: rgba(255,255,255,0.14); font-variant-numeric: tabular-nums; }
        .mw-album .mw-album-bg ~ .mw-album-m { color: rgba(255,255,255,0.9); text-shadow: 0 2px 16px rgba(0,0,0,0.4); }
        .mw-album.next .mw-album-m { color: #ff6000; }
        .mw-album-txt { position: relative; display: flex; flex-direction: column; gap: 4px; padding: 20px; width: 100%; }
        .mw-album-txt b { font-size: 18px; line-height: 1.3; }
        .mw-album-txt small { font-size: 13.5px; color: rgba(255,255,255,0.75); line-height: 1.45; }
        .mw-album-txt em { display: inline-flex; align-items: center; gap: 6px; margin-top: 4px; font-style: normal; font-size: 13px; color: rgba(255,255,255,0.5); }
        .mw-album-txt em.done { color: rgba(255,255,255,0.85); }
        .mw-album-txt em.done::before { content: '✓'; color: #4ade80; font-weight: 800; }
        .mw-album-txt em.live { color: #ff8a3d; font-weight: 700; }
        .mw-album-txt em.live::before { content: ''; width: 8px; height: 8px; border-radius: 50%; background: #ff6000; animation: mw-pulse 1.6s ease-in-out infinite; }
        .mw-album-go { position: absolute; top: 16px; right: 16px; width: 40px; height: 40px; border-radius: 50%; background: rgba(255,255,255,0.16); -webkit-backdrop-filter: blur(8px); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; transition: background .2s; }
        .mw-album:hover .mw-album-go { background: #ff6000; }
        .mw-subtitle { margin: 64px 0 0; font-size: 26px; font-weight: 800; letter-spacing: -0.6px; }
        /* 매칭위크 구성 카드 */
        .mw-contents { margin-top: 24px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
        .mw-content { display: flex; flex-direction: column; padding: 0; border-radius: 22px; overflow: hidden; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1); color: #fff; font: inherit; text-align: left; cursor: pointer; transition: transform .25s, border-color .25s, background .25s; }
        .mw-content:hover { transform: translateY(-4px); border-color: rgba(255,138,61,0.6); background: rgba(255,255,255,0.07); }
        .mw-content-img { position: relative; display: block; aspect-ratio: 4 / 3; background-size: cover; background-position: center; transition: transform .7s cubic-bezier(.2,.8,.2,1); }
        .mw-content-img::after { content: ''; position: absolute; inset: 0; background: linear-gradient(180deg, transparent 50%, rgba(20,20,19,0.9)); }
        .mw-content-n { position: absolute; z-index: 1; top: 12px; left: 14px; font-size: 13px; font-weight: 800; letter-spacing: 1px; padding: 4px 9px; border-radius: 999px; background: rgba(0,0,0,0.45); -webkit-backdrop-filter: blur(6px); backdrop-filter: blur(6px); }
        .mw-content-body { position: relative; display: flex; flex-direction: column; gap: 6px; padding: 0 20px 20px; margin-top: -22px; flex: 1; }
        .mw-content-ico { width: 44px; height: 44px; border-radius: 14px; background: #ff6000; color: #fff; display: flex; align-items: center; justify-content: center; box-shadow: 0 8px 22px rgba(255,96,0,0.4); margin-bottom: 6px; }
        .mw-content-body b { font-size: 18px; }
        .mw-content-body small { font-size: 13.5px; color: rgba(255,255,255,0.68); line-height: 1.55; }
        .mw-content-body em { margin-top: auto; padding-top: 10px; font-style: normal; font-size: 13px; font-weight: 700; color: #ff8a3d; }
        .mw-lead-sm { margin-top: 8px; font-size: 15.5px; }
        /* 사진 갤러리 모달 — 탭 + 3열 그리드 스크롤 */
        .mw-gal { position: fixed; inset: 0; z-index: 1050; background: rgba(10,10,10,0.6); -webkit-backdrop-filter: blur(4px); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; padding: 40px; animation: mw-fade .18s ease; }
        .mw-gal-box { width: 100%; max-width: 1240px; height: 100%; max-height: 920px; display: flex; flex-direction: column; background: #fff; border-radius: 20px; overflow: hidden; box-shadow: 0 30px 80px rgba(0,0,0,0.35); animation: mw-pop .24s cubic-bezier(.2,.8,.2,1); }
        .mw-gal-head { display: flex; align-items: center; justify-content: space-between; padding: 18px 22px 8px; }
        .mw-gal-slide { display: inline-flex; align-items: center; gap: 7px; height: 38px; padding: 0 16px; border-radius: 999px; border: 1px solid #e4e4e7; background: #fff; color: #171717; font: inherit; font-size: 14px; font-weight: 600; cursor: pointer; }
        .mw-gal-slide:hover { border-color: #ff6000; color: #e85600; }
        .mw-gal-tabs { display: flex; gap: 4px; padding: 0 14px; border-bottom: 1px solid #ececef; overflow-x: auto; scrollbar-width: none; }
        .mw-gal-tabs::-webkit-scrollbar { display: none; }
        .mw-gal-tabs button { flex: none; position: relative; height: 48px; padding: 0 14px; border: 0; background: none; font: inherit; font-size: 14.5px; font-weight: 600; color: #52525b; cursor: pointer; }
        .mw-gal-tabs button em { font-style: normal; margin-left: 3px; }
        .mw-gal-tabs button:hover { color: #171717; }
        .mw-gal-tabs button.on { color: #e85600; font-weight: 800; }
        .mw-gal-tabs button.on::after { content: ''; position: absolute; left: 10px; right: 10px; bottom: -1px; height: 3px; border-radius: 3px 3px 0 0; background: #ff6000; }
        .mw-gal-grid { flex: 1; min-height: 0; overflow-y: auto; padding: 14px; display: grid; grid-template-columns: repeat(3, 1fr); grid-auto-rows: max-content; gap: 10px; }
        .mw-gal-grid button { padding: 0; border: 0; border-radius: 10px; overflow: hidden; aspect-ratio: 3 / 2; background: #f0f0f2; cursor: zoom-in; }
        .mw-gal-grid img { width: 100%; height: 100%; object-fit: cover; display: block; transition: transform .4s cubic-bezier(.2,.8,.2,1), filter .2s; }
        .mw-gal-grid button:hover img { transform: scale(1.04); filter: brightness(1.05); }
        /* 사진 크게 보기 */
        .mw-lb { position: fixed; inset: 0; z-index: 1100; background: rgba(8,8,8,0.94); display: flex; flex-direction: column; animation: mw-fade .18s ease; }
        .mw-lb-top { display: flex; align-items: center; gap: 14px; padding: 16px 20px; color: #fff; }
        .mw-lb-top b { font-size: 16px; }
        .mw-lb-top span { font-size: 13.5px; color: rgba(255,255,255,0.55); font-variant-numeric: tabular-nums; }
        .mw-lb-x { margin-left: auto; width: 42px; height: 42px; border-radius: 50%; border: 0; background: rgba(255,255,255,0.1); color: #fff; display: flex; align-items: center; justify-content: center; cursor: pointer; }
        .mw-lb-x:hover { background: rgba(255,255,255,0.2); }
        .mw-lb-stage { flex: 1; min-height: 0; position: relative; display: flex; align-items: center; justify-content: center; padding: 0 76px; }
        .mw-lb-stage img { max-width: 100%; max-height: 100%; object-fit: contain; border-radius: 10px; animation: mw-fade .25s ease; }
        .mw-lb-nav { position: absolute; top: 50%; transform: translateY(-50%); width: 52px; height: 52px; border-radius: 50%; border: 0; background: rgba(255,255,255,0.1); color: #fff; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: background .15s; }
        .mw-lb-nav:hover { background: #ff6000; }
        .mw-lb-nav.prev { left: 14px; }
        .mw-lb-nav.next { right: 14px; }
        .mw-lb-thumbs { display: flex; gap: 8px; justify-content: center; padding: 16px 20px 22px; overflow-x: auto; scrollbar-width: none; }
        .mw-lb-thumbs::-webkit-scrollbar { display: none; }
        .mw-lb-thumbs button { flex: none; width: 72px; height: 52px; padding: 0; border: 2px solid transparent; border-radius: 8px; overflow: hidden; background: none; cursor: pointer; opacity: 0.45; transition: opacity .15s, border-color .15s; }
        .mw-lb-thumbs button.on { opacity: 1; border-color: #ff6000; }
        .mw-lb-thumbs button:hover { opacity: 0.9; }
        .mw-lb-thumbs img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .mw-marquee { margin-top: 56px; overflow: hidden; -webkit-mask-image: linear-gradient(90deg, transparent, #000 10%, #000 90%, transparent); mask-image: linear-gradient(90deg, transparent, #000 10%, #000 90%, transparent); }
        .mw-marquee-track { display: flex; gap: 12px; width: max-content; animation: mw-marquee 60s linear infinite; }
        .mw-marquee-track img { height: 150px; width: auto; border-radius: 12px; object-fit: cover; opacity: 0.75; }
        @keyframes mw-marquee { to { transform: translateX(-50%); } }

        /* 02 오시는 길 */
        /* 이동 경로 카드 */
        .mw-journey { margin-top: 40px; display: grid; grid-template-columns: 1fr 1.25fr 1fr; align-items: stretch; gap: 0; padding: 14px; border-radius: 28px; background: radial-gradient(ellipse at 50% 0%, rgba(255,96,0,0.22), transparent 60%), #141413; box-shadow: 0 30px 70px rgba(0,0,0,0.18); color: #fff; }
        .mw-jstop { position: relative; display: flex; flex-direction: column; align-items: flex-start; padding: 24px; border-radius: 20px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); text-decoration: none; color: inherit; transition: background .2s, border-color .2s; }
        .mw-jstop:hover { background: rgba(255,255,255,0.09); border-color: rgba(255,138,61,0.5); }
        .mw-jstop-ico { width: 46px; height: 46px; border-radius: 14px; background: rgba(255,96,0,0.15); color: #ff8a3d; display: flex; align-items: center; justify-content: center; }
        .mw-jstop-end .mw-jstop-ico { background: #ff6000; color: #fff; box-shadow: 0 8px 24px rgba(255,96,0,0.45); }
        .mw-jstop em { margin-top: 18px; font-style: normal; font-size: 12px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; color: #ff8a3d; }
        .mw-jstop b { margin-top: 4px; font-size: 24px; font-weight: 800; letter-spacing: -0.5px; }
        .mw-jstop small { margin-top: 6px; font-size: 13.5px; color: rgba(255,255,255,0.6); line-height: 1.5; }
        .mw-jstop-go { margin-top: auto; padding-top: 16px; font-size: 13px; font-weight: 700; color: rgba(255,255,255,0.5); transition: color .2s; }
        .mw-jstop:hover .mw-jstop-go { color: #ff8a3d; }
        .mw-ride { display: flex; flex-direction: column; justify-content: center; gap: 14px; padding: 18px 28px; }
        .mw-ride-go, .mw-ride-back { display: flex; flex-direction: column; align-items: center; text-align: center; gap: 8px; }
        .mw-ride-k { font-size: 12.5px; font-weight: 700; letter-spacing: 0.4px; color: rgba(255,255,255,0.55); }
        .mw-ride-times { display: flex; gap: 8px; }
        .mw-ride-times b { padding: 8px 16px; border-radius: 12px; background: #ff6000; font-size: 22px; font-weight: 800; letter-spacing: 0.5px; font-variant-numeric: tabular-nums; box-shadow: 0 8px 24px rgba(255,96,0,0.35); }
        .mw-ride-desc { font-size: 13.5px; color: rgba(255,255,255,0.8); line-height: 1.5; max-width: 300px; }
        .mw-ride-line { position: relative; height: 34px; }
        /* 점선·화살촉 모두 세로 중앙(50%)에 정확히 맞춘다 — 선은 2px 띠를 -1px 끌어올려 중심을 50%에, 화살촉 끝이 선 끝과 만나게 */
        .mw-ride-line::before { content: ''; position: absolute; left: 0; right: 3px; top: 50%; height: 2px; margin-top: -1px; background: repeating-linear-gradient(90deg, rgba(255,138,61,0.6) 0 7px, transparent 7px 12px); }
        .mw-ride-line::after { content: ''; position: absolute; right: 2px; top: 50%; width: 10px; height: 10px; margin-top: -5px; border-top: 2px solid #ff8a3d; border-right: 2px solid #ff8a3d; box-sizing: border-box; transform: rotate(45deg); }
        .mw-ride-bus { position: absolute; top: 50%; left: 0; width: 34px; height: 34px; margin-top: -17px; border-radius: 50%; background: #fff; color: #ff6000; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 14px rgba(0,0,0,0.35); animation: mw-bus 5s ease-in-out infinite; }
        @keyframes mw-bus { 0% { left: 0; } 50% { left: calc(100% - 34px); } 100% { left: 0; } }
        @media (prefers-reduced-motion: reduce) { .mw-ride-bus { animation: none; left: calc(50% - 17px); } }
        /* 영상 · 지도 · 알아두세요 */
        .mw-venue-grid { margin-top: 16px; display: grid; grid-template-columns: minmax(0, 380px) 1fr; gap: 16px; align-items: stretch; }
        .mw-video { position: relative; aspect-ratio: 9 / 16; border-radius: 28px; overflow: hidden; background: #000; box-shadow: 0 24px 60px rgba(0,0,0,0.2); }
        .mw-video video { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; display: block; }
        .mw-video::after { content: ''; position: absolute; inset: auto 0 0 0; height: 48%; background: linear-gradient(180deg, transparent, rgba(0,0,0,0.78)); pointer-events: none; }
        .mw-mute { position: absolute; z-index: 2; top: 16px; right: 16px; display: inline-flex; align-items: center; gap: 6px; height: 36px; padding: 0 14px 0 12px; border-radius: 999px; border: 0; background: rgba(0,0,0,0.5); -webkit-backdrop-filter: blur(8px); backdrop-filter: blur(8px); color: #fff; font: inherit; font-size: 13px; font-weight: 700; cursor: pointer; transition: background .15s; }
        .mw-mute:hover { background: #ff6000; }
        .mw-video-txt { position: absolute; z-index: 1; left: 22px; right: 22px; bottom: 96px; display: flex; flex-direction: column; gap: 4px; color: #fff; pointer-events: none; }
        .mw-video-txt b { font-size: 19px; }
        .mw-video-txt span { font-size: 13.5px; color: rgba(255,255,255,0.8); line-height: 1.5; }
        .mw-video video { cursor: pointer; }
        .mw-vctl { position: absolute; z-index: 2; left: 16px; right: 16px; bottom: 14px; display: flex; flex-direction: column; gap: 8px; }
        .mw-vbar { -webkit-appearance: none; appearance: none; width: 100%; height: 4px; margin: 0; border-radius: 999px; background: linear-gradient(90deg, #ff6000 var(--p), rgba(255,255,255,0.3) var(--p)); cursor: pointer; }
        .mw-vbar::-webkit-slider-thumb { -webkit-appearance: none; width: 14px; height: 14px; border-radius: 50%; background: #fff; box-shadow: 0 0 0 3px rgba(255,96,0,0.6); }
        .mw-vbar::-moz-range-thumb { width: 14px; height: 14px; border: 0; border-radius: 50%; background: #fff; box-shadow: 0 0 0 3px rgba(255,96,0,0.6); }
        .mw-vbtns { display: flex; align-items: center; gap: 6px; }
        .mw-vbtns button { display: inline-flex; align-items: center; justify-content: center; gap: 2px; height: 38px; min-width: 38px; padding: 0 8px; border-radius: 999px; border: 0; background: rgba(0,0,0,0.45); -webkit-backdrop-filter: blur(8px); backdrop-filter: blur(8px); color: #fff; font: inherit; cursor: pointer; transition: background .15s; }
        .mw-vbtns button:hover { background: rgba(255,255,255,0.22); }
        .mw-vbtns small { font-size: 11px; font-weight: 800; }
        .mw-vbtns .mw-vplay { width: 44px; height: 44px; padding: 0; background: #ff6000; }
        .mw-vbtns .mw-vplay:hover { background: #ff7a26; }
        .mw-vtime { margin-left: auto; font-size: 12.5px; font-weight: 600; color: rgba(255,255,255,0.85); font-variant-numeric: tabular-nums; }
        .mw-ride-dur { font-size: 13px; font-weight: 700; color: #ffb27f; }
        .mw-venue-side { display: flex; flex-direction: column; gap: 16px; min-width: 0; }
        .mw-map { flex: 1; min-height: 280px; border-radius: 28px; overflow: hidden; border: 1px solid #ececef; background: #f4f4f5; }
        .mw-map iframe { width: 100%; height: 100%; min-height: 280px; border: 0; display: block; }
        .mw-perks { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .mw-perk { display: flex; gap: 14px; align-items: flex-start; padding: 20px; border-radius: 22px; background: #fff; border: 1px solid #f0e2d6; box-shadow: 0 6px 20px rgba(255,96,0,0.06); }
        .mw-perk-ico { flex: none; width: 42px; height: 42px; border-radius: 13px; background: #fff1e6; color: #ff6000; display: flex; align-items: center; justify-content: center; }
        .mw-perk b { display: block; font-size: 15.5px; }
        .mw-perk small { display: block; margin-top: 3px; font-size: 13px; color: #71717a; line-height: 1.5; }

        /* 03 참여 방법 */
        .mw-steps { margin: 44px 0 0; display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
        .mw-step { height: 100%; box-sizing: border-box; padding: 30px 28px; border-radius: 22px; background: #fff; border: 1px solid #ececef; box-shadow: 0 1px 2px rgba(0,0,0,0.03); transition: transform .2s, box-shadow .2s, border-color .2s; }
        .mw-step:hover { transform: translateY(-3px); box-shadow: 0 16px 36px rgba(0,0,0,0.07); border-color: #ffd2b3; }
        .mw-step-n { display: block; font-size: 54px; font-weight: 800; line-height: 1; letter-spacing: -2px; color: transparent; -webkit-text-stroke: 1.5px #ff6000; }
        .mw-step b { display: block; margin-top: 22px; font-size: 19px; }
        .mw-step p { margin: 8px 0 0; font-size: 15px; color: #52525b; line-height: 1.6; }
        .mw-note { display: flex; gap: 10px; align-items: flex-start; margin: 20px 0 0; padding: 16px 20px; border-radius: 14px; background: #fff7f0; border: 1px solid #ffdcc2; color: #9a3a00; font-size: 14.5px; line-height: 1.55; }
        .mw-note svg { flex: none; margin-top: 1px; }

        /* 04 참가 기업 */
        .mw-sec-head { display: flex; flex-direction: column; align-items: flex-start; gap: 20px; } /* 필터는 항상 제목 아래 줄 — 같은 줄에 두면 제목 숫자(16→9) 길이에 따라 줄바꿈되며 위치가 튀었다 */
        .mw-filters { align-self: flex-start; }
        .mw-filters { display: flex; gap: 6px; padding: 5px; border-radius: 999px; background: #fff; border: 1px solid #e4e4e7; }
        .mw-filter { height: 38px; padding: 0 18px; border-radius: 999px; border: 0; background: transparent; color: #52525b; font: inherit; font-size: 14px; font-weight: 600; cursor: pointer; transition: all .15s; }
        .mw-filter em { font-style: normal; color: #a1a1aa; margin-left: 3px; }
        .mw-filter:hover { color: #171717; }
        .mw-filter.on { background: #171717; color: #fff; }
        .mw-filter.on em { color: #ff8a3d; }
        .mw-cos { margin-top: 36px; display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 16px; }
        .mw-co { display: flex; flex-direction: column; text-align: left; min-width: 0; padding: 0; border-radius: 20px; background: #fff; border: 1px solid #ececef; overflow: hidden; font: inherit; color: inherit; cursor: pointer; transition: border-color .2s, transform .2s, box-shadow .2s; }
        .mw-co:hover { border-color: #ffb27f; box-shadow: 0 18px 40px rgba(0,0,0,0.09); transform: translateY(-4px); }
        .mw-co-top { height: 116px; display: flex; align-items: center; justify-content: center; background: radial-gradient(circle at 50% 120%, #ffeadb 0%, #fafafa 60%); border-bottom: 1px solid #f2f2f4; }
        .mw-co-body { flex: 1; display: flex; flex-direction: column; padding: 18px 20px; }
        .mw-co-name { font-size: 17px; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .mw-co-jobs { list-style: none; padding: 0; margin: 10px 0 0; display: flex; flex-direction: column; gap: 5px; min-height: 64px; }
        .mw-co-jobs li { font-size: 13px; color: #52525b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .mw-co-jobs li::before { content: '·'; margin-right: 6px; color: #a1a1aa; }
        .mw-co-jobs .mw-more { color: #a1a1aa; }
        .mw-co-jobs .mw-more::before { content: none; }
        .mw-co-foot { margin-top: auto; padding-top: 14px; border-top: 1px dashed #ececef; display: flex; align-items: center; justify-content: space-between; font-size: 13.5px; font-weight: 700; color: #e85600; }
        .mw-co-foot svg { transition: transform .2s; }
        .mw-co:hover .mw-co-foot svg { transform: translateX(4px); }
        .mw-logo { border-radius: 16px; border: 1px solid #ececef; background: #fff; display: flex; align-items: center; justify-content: center; overflow: hidden; flex: none; box-shadow: 0 4px 14px rgba(0,0,0,0.06); }
        .mw-logo img { width: 100%; height: 100%; object-fit: contain; padding: 7px; }
        .mw-logo span { color: #52525b; font-weight: 800; font-size: 20px; }
        .mw-empty { color: #71717a; font-size: 14px; margin-top: 24px; }

        /* 05 FAQ */
        .mw-faq { display: grid; grid-template-columns: 1fr 1.6fr; gap: 56px; align-items: start; }
        .mw-faq-list { border-top: 1px solid #e4e4e7; }
        .mw-faq details { border-bottom: 1px solid #e4e4e7; }
        .mw-faq summary { list-style: none; cursor: pointer; display: flex; gap: 14px; align-items: baseline; padding: 24px 44px 24px 0; font-size: 17px; font-weight: 700; position: relative; }
        .mw-faq summary::-webkit-details-marker { display: none; }
        .mw-q { flex: none; color: #ff6000; font-weight: 800; }
        .mw-faq summary::after { content: '+'; position: absolute; right: 6px; top: 50%; transform: translateY(-50%); font-size: 26px; font-weight: 300; color: #a1a1aa; transition: transform .25s, color .25s; }
        .mw-faq details[open] summary::after { transform: translateY(-50%) rotate(45deg); color: #ff6000; }
        .mw-faq details p { margin: -6px 0 24px 30px; font-size: 15px; color: #52525b; line-height: 1.7; }

        /* 마무리 */
        .mw-end { padding: 120px 0; text-align: center; color: #fff; background: radial-gradient(ellipse at 50% 120%, rgba(255,96,0,0.45), transparent 60%), linear-gradient(180deg, rgba(12,12,11,0.88), rgba(12,12,11,0.94)), url(/main/may-matching-week.jpg) center/cover; }
        .mw-end h2 { margin: 20px auto 0; font-size: 44px; font-weight: 800; letter-spacing: -1.2px; line-height: 1.2; max-width: 760px; }
        .mw-end p { margin: 16px auto 0; font-size: 17px; color: rgba(255,255,255,0.75); max-width: 560px; line-height: 1.6; }
        .mw-end .mw-ctas { justify-content: center; }

        /* 공고 팝업 — 모바일은 하단 시트 */
        .mw-modal { position: fixed; inset: 0; z-index: 1000; background: rgba(10,10,10,0.55); -webkit-backdrop-filter: blur(4px); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; padding: 24px; animation: mw-fade .18s ease; }
        .mw-sheet { width: 100%; max-width: 620px; max-height: 82vh; display: flex; flex-direction: column; background: #fff; border-radius: 24px; overflow: hidden; box-shadow: 0 24px 70px rgba(0,0,0,0.3); animation: mw-pop .24s cubic-bezier(.2,.8,.2,1); }
        .mw-sheet-head { display: flex; align-items: center; gap: 14px; padding: 22px 22px 18px; border-bottom: 1px solid #f0f0f2; background: radial-gradient(circle at 0% 0%, #fff1e6, #fff 60%); }
        .mw-sheet-title { flex: 1; min-width: 0; display: flex; flex-direction: column; }
        .mw-sheet-title h2 { margin: 0; font-size: 21px; font-weight: 800; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .mw-sheet-title > span { margin-top: 2px; font-size: 13.5px; font-weight: 600; color: #e85600; }
        .mw-web { color: #52525b; font-weight: 600; text-decoration: none; }
        .mw-web:hover { color: #171717; text-decoration: underline; }
        .mw-x { flex: none; width: 38px; height: 38px; border-radius: 50%; border: 0; background: #f4f4f5; color: #3f3f46; display: flex; align-items: center; justify-content: center; cursor: pointer; }
        .mw-x:hover { background: #e4e4e7; }
        .mw-sheet-body { overflow-y: auto; padding: 8px 10px 14px; }
        .mw-co-intro { margin: 8px 12px 10px; font-size: 14px; line-height: 1.65; color: #3f3f46; }
        .mw-job { display: flex; align-items: center; gap: 16px; padding: 18px 12px; border-radius: 14px; text-decoration: none; color: inherit; transition: background .15s; }
        .mw-job + .mw-job { border-top: 1px solid #f4f4f5; }
        .mw-job:hover { background: #fff7f0; }
        .mw-job-main { flex: 1; min-width: 0; }
        .mw-job-t { font-size: 16px; font-weight: 700; line-height: 1.4; }
        .mw-job-tags { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
        .mw-job-tags span { padding: 3px 9px; border-radius: 6px; background: #f4f4f5; color: #52525b; font-size: 12.5px; font-weight: 500; }
        .mw-job-go { flex: none; display: inline-flex; align-items: center; gap: 2px; font-size: 13.5px; font-weight: 700; color: #e85600; }
        @keyframes mw-fade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes mw-pop { from { opacity: 0; transform: translateY(16px) scale(0.98); } to { opacity: 1; transform: none; } }
        @media (prefers-reduced-motion: reduce) { .mw-modal, .mw-sheet, .mw-marquee-track { animation: none; } }

        @media (max-width: 1024px) {
          .mw-hero-in { flex-direction: column; align-items: stretch; }
          .mw-panel { width: auto; max-width: 520px; }
          .mw-cos { grid-template-columns: repeat(3, minmax(0, 1fr)); }
          .mw-faq { grid-template-columns: 1fr; gap: 32px; }
          .mw-journey { grid-template-columns: 1fr; }
          .mw-ride-line { width: 34px; height: 64px; margin: 0 auto; }
          .mw-ride-line::before { left: 50%; right: auto; top: 0; bottom: 3px; width: 2px; height: auto; margin: 0 0 0 -1px; background: repeating-linear-gradient(180deg, rgba(255,138,61,0.6) 0 7px, transparent 7px 12px); }
          .mw-ride-line::after { right: auto; left: 50%; top: auto; bottom: 2px; margin: 0 0 0 -5px; transform: rotate(135deg); }
          .mw-ride-bus { left: 0 !important; top: 0; margin-top: 0; animation-name: mw-bus-v; }
          @keyframes mw-bus-v { 0% { top: 0; } 50% { top: calc(100% - 34px); } 100% { top: 0; } }
          .mw-venue-grid { grid-template-columns: 1fr; }
          .mw-albums { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 760px) {
          .mw-steps { grid-template-columns: 1fr; }
          .mw-albums-2 { grid-template-columns: 1fr; }
        }
        @media (max-width: 640px) {
          .mw-sec { padding: 72px 0; }
          .mw-dark { padding-bottom: 48px; }
          .mw-title { font-size: 30px; letter-spacing: -0.8px; }
          .mw-lead { font-size: 15.5px; }
          .mw-hero { min-height: max(580px, 84vh); }
          .mw-hero-in { padding: 220px 0 32px; gap: 24px; }
          .mw-hero h1 { font-size: 36px; letter-spacing: -1px; }
          .mw-sub { font-size: 15.5px; }
          .mw-btn { flex: 1; height: 50px; padding: 0 16px; font-size: 15px; }
          .mw-panel { padding: 20px; }
          .mw-stat dd { font-size: 36px; }
          .mw-orgs-logos { gap: 20px; }
          .mw-orgs-logos img { transform: scale(0.8); transform-origin: left center; }
          .mw-albums { margin-top: 32px; gap: 10px; }
          .mw-album { border-radius: 18px; }
          .mw-album-m { font-size: 44px; top: 10px; left: 14px; }
          .mw-album-txt { padding: 14px; }
          .mw-album-txt b { font-size: 15px; }
          .mw-album-go { width: 34px; height: 34px; top: 10px; right: 10px; }
          .mw-subtitle { margin-top: 44px; font-size: 21px; }
          .mw-contents { grid-template-columns: 1fr; gap: 12px; }
          .mw-content-img { aspect-ratio: 16 / 9; }
          .mw-content-body { padding: 0 14px 14px; }
          .mw-content-body b { font-size: 15.5px; }
          .mw-content-body small { font-size: 12.5px; }
          .mw-content-ico { width: 38px; height: 38px; }
          .mw-gal { padding: 0; }
          .mw-gal-box { max-height: none; border-radius: 0; }
          .mw-gal-head { padding: 12px 14px 4px; }
          .mw-gal-tabs { padding: 0 6px; }
          .mw-gal-tabs button { padding: 0 10px; font-size: 13.5px; }
          .mw-gal-grid { grid-template-columns: repeat(2, 1fr); gap: 6px; padding: 8px; }
          .mw-lb-stage { padding: 0 8px; }
          .mw-lb-nav { width: 42px; height: 42px; background: rgba(0,0,0,0.45); }
          .mw-lb-nav.prev { left: 12px; }
          .mw-lb-nav.next { right: 12px; }
          .mw-lb-thumbs { justify-content: flex-start; }
          .mw-lb-thumbs button { width: 56px; height: 42px; }
          .mw-marquee { margin-top: 36px; }
          .mw-marquee-track img { height: 100px; }
          .mw-journey { margin-top: 28px; padding: 10px; border-radius: 22px; }
          .mw-jstop { padding: 18px; }
          .mw-jstop b { font-size: 20px; }
          .mw-ride { padding: 16px 8px; }
          .mw-video { border-radius: 22px; max-height: 78vh; margin: 0 auto; width: 100%; }
          .mw-map { border-radius: 22px; }
          .mw-perks { grid-template-columns: 1fr; gap: 10px; }
          .mw-perk { padding: 16px; }
          .mw-step { padding: 24px 22px; }
          .mw-step-n { font-size: 44px; }
          .mw-cos { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
          .mw-filters { width: 100%; box-sizing: border-box; }
          .mw-filter { flex: 1; padding: 0 8px; }
          .mw-co-top { height: 84px; }
          .mw-co-top .mw-logo { width: 52px !important; height: 52px !important; }
          .mw-co-body { padding: 14px; }
          .mw-co-name { font-size: 15px; }
          .mw-co-jobs { min-height: 0; }
          .mw-co-jobs li:nth-child(2), .mw-co-jobs .mw-more { display: none; } /* 2열 카드는 좁아 대표 공고 1줄만 */
          .mw-faq summary { font-size: 15.5px; padding: 20px 40px 20px 0; }
          .mw-end { padding: 80px 0; }
          .mw-end h2 { font-size: 28px; }
          .mw-modal { align-items: flex-end; padding: 0; }
          .mw-sheet { max-width: none; max-height: 86vh; border-radius: 24px 24px 0 0; padding-bottom: env(safe-area-inset-bottom); animation-name: mw-up; }
          .mw-job-go { font-size: 0; gap: 0; } /* 모바일은 화살표만 */
          @keyframes mw-up { from { transform: translateY(100%); } to { transform: none; } }
        }
      `}</style>
    </>
  );
}
