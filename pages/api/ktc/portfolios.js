import supabaseAdmin from '../../../lib/supabaseAdmin';

/* ktc-ops 가 인재 카드의 포폴 O/X·추천 메일 '포트폴리오 보기'에 쓸 포트폴리오 주소를 가져가는 곳.
   photos.js 와 같은 방식이다. ktc-ops 인재의 이력서 주소에서 뽑은 사용자 id 목록을 받아
   user_profiles 의 포트폴리오 주소 하나만 돌려준다.
   - portfolio_url(프로필에 직접 넣은 주소)이 있으면 그것
   - 없으면 projects 안의 첫 https 링크(url 또는 link)
   호출: POST { ids: [uuid, ...] }  헤더 Authorization: Bearer ${KTC_PHOTO_SECRET} */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_IDS = 200;   // id 목록이 조회 주소에 들어가 너무 길면 거절된다
const isLink = (v) => /^https?:\/\/\S+\.\S+/i.test(String(v || '').trim());

function pickPortfolio(row) {
  if (isLink(row.portfolio_url)) return row.portfolio_url.trim();
  const projects = Array.isArray(row.projects) ? row.projects : [];
  for (const p of projects) {
    const lk = String(p?.url || p?.link || '').trim();
    if (isLink(lk)) return lk;
  }
  return '';
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const secret = (process.env.KTC_PHOTO_SECRET || '').trim();
  if (!secret || req.headers.authorization !== `Bearer ${secret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const ids = [...new Set((Array.isArray(req.body?.ids) ? req.body.ids : [])
    .map((v) => String(v || '').trim().toLowerCase())
    .filter((v) => UUID.test(v)))];
  if (ids.length > MAX_IDS) return res.status(400).json({ error: `ids up to ${MAX_IDS}` });
  if (!ids.length) return res.json({ portfolios: {} });

  const { data, error } = await supabaseAdmin
    .from('user_profiles')
    .select('id, portfolio_url, projects')
    .in('id', ids);
  if (error) {
    console.error('ktc/portfolios:', error.message);
    return res.status(500).json({ error: 'Failed to load portfolios' });
  }
  const portfolios = {};
  for (const r of data || []) {
    const lk = pickPortfolio(r);
    if (lk) portfolios[r.id] = lk;
  }
  res.setHeader('Cache-Control', 'no-store');
  return res.json({ portfolios });
}
