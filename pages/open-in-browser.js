import { useEffect, useState } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { useT } from '../lib/i18n'
import { track } from '../lib/track'
import { chromeIntentUrl, isAndroidUA } from '../lib/inApp'

// 인앱 브라우저(페이스북·인스타·스레드·잘로)에서 구글 로그인을 누르면 /api/auth/google 이 여기로 보낸다.
// 구글이 웹뷰 OAuth 를 차단해 로그인이 불가능하므로, 같은 페이지를 외부 브라우저로 열도록 안내한다.
// ?u= 돌아갈 페이지 주소(우리 도메인만 허용).
export default function OpenInBrowser() {
  const router = useRouter()
  const { lang } = useT()
  const L = (ko, en, vi) => (lang === 'vi' ? vi : lang === 'en' ? en : ko)
  const [url, setUrl] = useState('')
  const [android, setAndroid] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!router.isReady) return
    const raw = typeof router.query.u === 'string' ? router.query.u : '/'
    let target = window.location.origin + '/'
    try {
      const parsed = new URL(raw, window.location.origin)
      if (parsed.origin === window.location.origin) target = parsed.toString()
    } catch {}
    setUrl(target)
    const isAndroid = isAndroidUA(navigator.userAgent)
    setAndroid(isAndroid)
    track('view_open_in_browser', { page: '/open-in-browser', meta: { target: new URL(target).pathname, android: isAndroid } })
    // 안드로이드는 크롬 intent 로 바로 시도 — 성공하면 이 화면은 안 보인다.
    if (isAndroid) { try { window.location.href = chromeIntentUrl(target) } catch {} }
  }, [router.isReady, router.query.u])

  const copy = async () => {
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000) } catch {}
  }

  return (
    <>
      <Head><title>{`${L('브라우저에서 열기', 'Open in browser', 'Mở bằng trình duyệt')} · FYI`}</title></Head>
      <div style={{ minHeight: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 20px', fontFamily: "'Be Vietnam Pro',sans-serif" }}>
        <div style={{ maxWidth: 420, width: '100%', textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🔒</div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 10px' }}>
            {L('구글 로그인은 외부 브라우저에서만 됩니다', 'Google sign-in needs your browser', 'Đăng nhập Google cần mở bằng trình duyệt')}
          </h1>
          <p style={{ fontSize: 14, lineHeight: 1.6, color: '#555', margin: '0 0 20px' }}>
            {L(
              '지금 보고 계신 앱(페이스북·인스타그램·스레드 등) 안의 브라우저에서는 구글이 로그인을 막습니다. 아래 방법으로 Chrome 또는 Safari에서 다시 열어 주세요.',
              'Google blocks sign-in inside the Facebook, Instagram or Threads app browser. Please reopen this page in Chrome or Safari.',
              'Google chặn đăng nhập trong trình duyệt bên trong ứng dụng Facebook, Instagram, Threads. Vui lòng mở lại trang này bằng Chrome hoặc Safari.',
            )}
          </p>
          {android ? (
            <a href={url ? chromeIntentUrl(url) : '#'} style={{ display: 'block', background: '#ff4400', color: '#fff', borderRadius: 14, padding: '15px 20px', fontWeight: 800, fontSize: 15, textDecoration: 'none', marginBottom: 12 }}>
              {L('Chrome에서 열기', 'Open in Chrome', 'Mở bằng Chrome')}
            </a>
          ) : (
            <div style={{ background: '#f6f6f6', borderRadius: 14, padding: '14px 16px', fontSize: 14, lineHeight: 1.6, textAlign: 'left', marginBottom: 12 }}>
              {L(
                '화면 오른쪽 위(또는 아래)의 ··· 메뉴를 누르고 "브라우저에서 열기" 또는 "Safari로 열기"를 선택해 주세요.',
                'Tap the ··· menu at the top (or bottom) right and choose "Open in browser" or "Open in Safari".',
                'Nhấn vào menu ··· ở góc trên (hoặc dưới) bên phải và chọn "Mở bằng trình duyệt" hoặc "Mở bằng Safari".',
              )}
            </div>
          )}
          <button onClick={copy} style={{ width: '100%', background: '#fff', border: '1px solid #ddd', borderRadius: 14, padding: '13px 20px', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
            {copied ? L('복사됨 ✓', 'Copied ✓', 'Đã sao chép ✓') : L('링크 복사해서 브라우저에 붙이기', 'Copy link to paste in your browser', 'Sao chép liên kết để dán vào trình duyệt')}
          </button>
          <div style={{ fontSize: 12, color: '#999', marginTop: 14, wordBreak: 'break-all' }}>{url}</div>
        </div>
      </div>
    </>
  )
}
