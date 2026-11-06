import supabaseAdmin from '../../../lib/supabaseAdmin';

/* ktc-ops 가 인재 카드·추천 메일에 넣을 얼굴 사진 주소를 가져가는 곳.
   ktc-ops 인재의 이력서 주소(resumes/<사용자 id>...)에서 뽑은 사용자 id 목록을 받아
   user_profiles.photo_url 만 돌려준다. user_profiles 는 본인만 읽게 막혀 있어(RLS) ktc-ops 가 직접
   못 읽는다. 관리자 키를 넘기는 대신 여기서 사진 주소 한 칸만 내준다.
   호출: POST { ids: [uuid, ...] }  헤더 Authorization: Bearer ${KTC_PHOTO_SECRET} */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_IDS = 200;   // id 목록이 조회 주소에 들어가 너무 길면 거절된다

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
  if (!ids.length) return res.json({ photos: {} });

  const { data, error } = await supabaseAdmin
    .from('user_profiles')
    .select('id, photo_url')
    .in('id', ids)
    .not('photo_url', 'is', null)
    .neq('photo_url', '');
  if (error) {
    console.error('ktc/photos:', error.message);
    return res.status(500).json({ error: 'Failed to load photos' });
  }
  const photos = {};
  for (const r of data || []) {
    if (/^https:\/\//.test(r.photo_url || '')) photos[r.id] = r.photo_url;
  }
  res.setHeader('Cache-Control', 'no-store');
  return res.json({ photos });
}
