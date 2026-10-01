// Read the attribution captured when the visitor first landed, so it survives the
// client-side navigation between landing → /jobs → opening a job → applying.
//
// jobs.js persists UTM params + the original referrer to sessionStorage and a 30-day
// cookie on landing. By apply time the live URL (router.query) is usually empty, so
// reading only the query loses the source on almost every application. We resolve in
// priority order: live query → sessionStorage → cookie.
const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content']

// Persist UTM params (+ the external referrer) from the current URL on first landing,
// whichever page the visitor entered on. /jobs, /, /cv do this themselves, but
// /ktc/jobs/[id] (the main KTC landing) never did — so signups from KTC links lost
// their utm. Called once per session from _app.js. Same keys/cookie as the page code.
export function persistUtmFromUrl() {
  if (typeof window === 'undefined') return
  try {
    const params = new URLSearchParams(window.location.search)
    const expires = new Date(Date.now() + 30 * 86400000).toUTCString()
    for (const k of UTM_KEYS) {
      const v = params.get(k)
      if (!v) continue
      sessionStorage.setItem(k, v)
      document.cookie = `${k}=${encodeURIComponent(v)};path=/;expires=${expires};SameSite=Lax`
    }
    const ref = document.referrer
    if (ref && !ref.includes(window.location.host) && !sessionStorage.getItem('fyi_referrer')) {
      sessionStorage.setItem('fyi_referrer', ref)
      document.cookie = `fyi_referrer=${encodeURIComponent(ref)};path=/;expires=${expires};SameSite=Lax`
    }
  } catch {}
}

function readCookie(key) {
  const m = document.cookie.match(new RegExp('(?:^|; )' + key + '=([^;]*)'))
  return m ? decodeURIComponent(m[1]) : null
}

// Returns { utmSource, utmMedium, utmCampaign, utmContent, referrer } — camelCase to
// match the /api/job-applications payload. Missing values are null.
export function getStoredUtm() {
  if (typeof window === 'undefined') {
    return { utmSource: null, utmMedium: null, utmCampaign: null, utmContent: null, referrer: null }
  }
  const params = new URLSearchParams(window.location.search)
  const read = (key) => {
    const fromQuery = params.get(key)
    if (fromQuery) return fromQuery
    try {
      const fromSession = sessionStorage.getItem(key)
      if (fromSession) return fromSession
    } catch {}
    return readCookie(key)
  }
  const [utmSource, utmMedium, utmCampaign, utmContent] = UTM_KEYS.map(read)
  // Prefer the landing referrer persisted on first visit; fall back to live referrer.
  let referrer = null
  try { referrer = sessionStorage.getItem('fyi_referrer') } catch {}
  if (!referrer) referrer = readCookie('fyi_referrer') || document.referrer || null
  return { utmSource, utmMedium, utmCampaign, utmContent, referrer }
}

// Funnel source for a job application: 'salary' if the visitor reached /jobs via a
// post-salary-submission CTA (marked with ?from=salary, persisted to sessionStorage
// for the visit), otherwise 'direct'. Never returns null so the DB column is explicit.
export function getApplicationSource() {
  if (typeof window === 'undefined') return 'direct'
  const fromQuery = new URLSearchParams(window.location.search).get('from')
  if (fromQuery === 'salary') return 'salary'
  try {
    if (sessionStorage.getItem('fyi_apply_source') === 'salary') return 'salary'
  } catch {}
  return 'direct'
}
