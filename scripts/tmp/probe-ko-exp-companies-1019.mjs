import { sb, fetchAll } from '../outreach/lib.mjs'
const profs = await fetchAll(() => sb.from('user_profiles').select('id,position,yoe_months,korean_cert,major,current_company,verified_company_name,experiences,location,resume_url').not('resume_url','is',null).order('created_at'))
const hasCert = (c) => !!c && !/^(none|no|không|없음|-|n\/a|0)$/i.test(String(c).trim())
const koMajor = (p) => /(hàn quốc|korean|korea|ngôn ngữ hàn|đông phương|oriental|한국어|한국학)/i.test(String(p.major||''))
const ko = profs.filter(p => (hasCert(p.korean_cert)||koMajor(p)) && (p.yoe_months||0) >= 12)
const krCo = /(samsung|lg\b|hyundai|kia|posco|hyosung|lotte|cj\b|sk\b|hanwha|doosan|shinhan|woori|kb\b|hana|coupang|naver|kakao|nexon|ncsoft|fpt software korea|vina|korea|korean|hàn quốc|han quoc|hàn|㈜|주식회사|co\.,? ?ltd.*vina|\b[a-z]+ vina\b|vn\b.*korea|kolon|taekwang|changshin|hwaseung|pungkook|youngone|sae-a|hansae|panko|dongjin|seoul|busan|daegu|incheon|megazone|cmc|hwasung|orion|cuckoo|amorepacific|emart|gs25|shinsegae|hansol|ilshin|dongwon|daewoo|kumho|hankook|nongshim|binggrae|woojin|dasan|ktc|likelion|sungshin|daehong|cheil|innocean|kyobo|mirae|samyang|ottogi|paris baguette|tous les jours|bbq|lock&lock|hanssem|kolmar)/i
const comps = (p) => [p.current_company, p.verified_company_name, ...(Array.isArray(p.experiences)?p.experiences.map(e=>e.company):[])].filter(Boolean)
let anyCo=0, kr=0, cur=0, curKr=0; const roles={}; const ex=[]
for (const p of ko) { const cs = comps(p); if (cs.length) anyCo++; if (cs.some(c=>krCo.test(c))) kr++; const c0 = p.current_company || (Array.isArray(p.experiences)&&p.experiences[0]?.company); if (c0) { cur++; if (krCo.test(c0)) curKr++ } const r=String(p.position||'?').slice(0,25); roles[r]=(roles[r]||0)+1; if (ex.length<25 && cs.length) ex.push(`${String(p.position||'').slice(0,22)} | ${Math.round((p.yoe_months||0)/12)}y | ${cs.slice(0,3).join(' / ').slice(0,70)}`) }
console.log(`KO×1y+ 풀 ${ko.length} | 회사 기재 ${anyCo} | 그중 한국계 회사 경력 있음 ${kr} (${(100*kr/anyCo).toFixed(0)}%) | 현재/최근 회사 기재 ${cur} → 한국계 ${curKr} (${(100*curKr/cur).toFixed(0)}%)`)
console.log('직군 상위:', Object.entries(roles).sort((a,b)=>b[1]-a[1]).slice(0,12).map(([k,v])=>k+'='+v).join(' | '))
console.log('\n샘플:'); ex.forEach(l=>console.log(' ', l))
// 비교: 한국어 시그널 없는 경력자 중 한국계 회사 비율
const non = profs.filter(p => !(hasCert(p.korean_cert)||koMajor(p)) && (p.yoe_months||0) >= 12 && comps(p).length)
console.log(`\n비교: KO 없음 × 1y+ × 회사기재 ${non.length} → 한국계 ${non.filter(p=>comps(p).some(c=>krCo.test(c))).length} (${(100*non.filter(p=>comps(p).some(c=>krCo.test(c))).length/non.length).toFixed(0)}%)`)
