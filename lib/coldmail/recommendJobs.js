// 단건 recommend 콜드메일 문안 레지스트리 — scripts/outreach/recommend-send.mjs(--copy KEY)와 components/admin/coldmailTemplates.js(어드민 양식 자동 등록)가 공유한다.
// 새 공고 발송 = 여기에 항목 하나 추가(키 = 캠페인 접두) → `node scripts/outreach/recommend-send.mjs --job CODE --copy KEY <cv-pool 플래그>`.
// 캠페인명: <KEY>-recommend-<public|private>. 선정 조건은 코드가 아니라 플래그이므로 `flags` 에 적어 두어 재실행·검증이 되게 한다.
// 일괄 캠페인(ktc1019 등)은 별도 모듈(ktc1019Jobs.js)에 있다.
export const RECOMMEND_JOBS = {
  youlchon1020: {
  code: 'V258', company: 'YOUL CHON VINA', initial: 'Y', title: 'NV Kinh doanh Phát triển thị trường (Sales B2B)', loc: 'TP.HCM',
  meta: 'Onsite · TP.HCM · T2–T6 08:00–17:00 · Lương 11–14 triệu + hoa hồng (tổng 11–20 triệu) · Từ 2 năm sale B2B ngành nhựa, bao bì',
  intro: '<b>YOUL CHON VINA</b> — doanh nghiệp Hàn Quốc ngành nhựa, bao bì tại TP.HCM — đang tuyển <b>Nhân viên Kinh doanh Phát triển thị trường</b> qua FYI. Công việc: nghiên cứu và xây dựng chiến lược phát triển thị trường; giới thiệu, tư vấn sản phẩm, đàm phán và chốt đơn hàng với khách hàng doanh nghiệp; chăm sóc khách hàng cũ, tìm kiếm khách hàng mới; khảo sát thị trường và báo cáo kinh doanh định kỳ. Yêu cầu: <b>từ 2 năm kinh nghiệm sale B2B</b>, ưu tiên ngành <b>nhựa, bao bì</b>; tốt nghiệp Cao đẳng trở lên ngành Quản trị Kinh doanh hoặc liên quan; độ tuổi 22–40. Làm việc T2–T6 08:00–17:00. Lương cơ bản <b>11–14 triệu</b> (chưa gồm hoa hồng), tổng thu nhập <b>11–20 triệu/tháng</b>; tăng lương hằng năm, thưởng tháng 13, phụ cấp cơm trưa, gửi xe.',
    flags: '--job V258 --main "Sales (B2B),Business Development" --yoe 24- --region HCM --age 22-40 (+V177 지원자 수동 제외)',
    desc: '10/20 발송 79명 — B2B 영업/BD 주직무 2y+ HCM권 22~40세, 포장업계→제조→타산업 순. 7일 쿨다운 미적용(유저 지시). V177(9/16 동일 공고) 지원자 제외.' },
  golfzon1020: {
  code: 'V259', company: 'GOLFZON', initial: 'G', title: 'Sales Manager – Special Sales / Premium Golf Simulator', loc: 'Hà Nội',
  meta: 'Full-time · 117 Trần Duy Hưng, Yên Hòa, Hà Nội · Từ 8 năm sales (ưu tiên luxury, ô tô, golf, sản phẩm giá trị cao) · Quản lý đội Sales · Tiếng Anh tốt · Lương cạnh tranh + Sales Incentive',
  intro: '<b>GOLFZON Vina</b> (golfzonvietnam.com) — thương hiệu golf simulator số 1 Hàn Quốc — đang tuyển <b>Sales Manager – Special Sales</b> qua FYI tại trụ sở Hà Nội. Công việc: phụ trách mảng Special Sales cho hệ thống golf simulator cao cấp; phát triển khách hàng cá nhân (HNWI), doanh nghiệp, hotel/resort và residential; trực tiếp bán hàng và xây pipeline; <b>tuyển và xây dựng đội Sales trong 2 tháng</b>; quản lý doanh số, hiệu suất và kênh bán mới. Yêu cầu: <b>từ 8 năm kinh nghiệm sales</b>, ưu tiên ngành ô tô cao cấp, luxury, golf hoặc sản phẩm giá trị cao; kinh nghiệm bán hàng trực tiếp và quản lý đội Sales; có network khách hàng cao cấp/doanh nghiệp là lợi thế; <b>tiếng Anh tốt</b>, đàm phán và chốt sales. Quyền lợi: lương cạnh tranh + Sales Incentive, thưởng Tết, bảo hiểm sức khỏe/tai nạn, công tác phí và điện thoại, đào tạo sản phẩm &amp; golf, giờ làm linh hoạt.',
    flags: '--job V259 --main "Sales (B2B),Sales (B2C / Retail),Business Development,Sales,Telesales" --yoe 60- --region HN',
    desc: '10/20 발송 30명 — 하노이권 영업 주직무 5y+(8y+ 23), 럭셔리/자동차/부동산 키워드·팀관리 우선. 풀이 얇아 5~8y 포함(유저 결정).' },
}
