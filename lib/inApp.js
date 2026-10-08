// 페이스북·인스타그램·스레드·잘로 등 인앱 브라우저(WebView) 감지.
// 구글 OAuth 는 임베디드 웹뷰를 차단하고(403 disallowed_useragent) One Tap 도 뜨지 않는다 —
// 메타 광고로 들어온 사람(세션의 48~90%)이 구글 로그인을 누르면 여기서 막혀 돌아오지 못한다.
// Threads 앱 UA 에는 코드명 "Barcelona" 가 들어간다.
const INAPP_RE = /FBAN|FBAV|FB_IAB|FBIOS|Instagram|Threads|Barcelona|Zalo|Line\/|KAKAOTALK|MicroMessenger|; wv\)/i

export function isInAppUA(ua) {
  return INAPP_RE.test(ua || '')
}

export function isInAppBrowser() {
  return typeof navigator !== 'undefined' && isInAppUA(navigator.userAgent)
}

export function isAndroidUA(ua) {
  return /Android/i.test(ua || '')
}

// Android 인앱 브라우저에서 크롬으로 같은 주소를 여는 intent URL. 크롬이 없으면 fallback 으로 그냥 연다.
export function chromeIntentUrl(url) {
  const u = new URL(url)
  return `intent://${u.host}${u.pathname}${u.search}#Intent;scheme=${u.protocol.replace(':', '')};package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent(url)};end`
}
