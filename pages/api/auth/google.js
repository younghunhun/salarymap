// Initiates Google OAuth.
// - Production (our own domain): route through our /api/auth/google/callback so
//   the Google consent screen shows our domain, not the Supabase URL.
// - Preview (*.vercel.app) / local: Google has no redirect_uri registered for
//   dynamic Vercel domains, so route through Supabase's own OAuth endpoint
//   (its callback IS registered in Google). Supabase then redirects back to our
//   /auth/callback, which is allow-listed in Supabase Redirect URLs.
import supabaseAdmin from '../../../lib/supabaseAdmin';
import { isInAppUA } from '../../../lib/inApp';

export default async function handler(req, res) {
  const proto = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers.host || '';
  const returnTo = typeof req.query.return === 'string' ? req.query.return : '/';

  // 인앱 브라우저(페이스북·인스타·스레드·잘로)에서는 구글이 OAuth 를 차단한다(403 disallowed_useragent).
  // 여기서 보내면 구글 오류 화면에서 끝나므로, 대신 외부 브라우저로 같은 페이지를 열도록 안내한다.
  // 거의 모든 구글 로그인 버튼이 이 경로를 타서 한 곳에서 걸러진다.
  const ua = String(req.headers['user-agent'] || '');
  if (isInAppUA(ua)) {
    const origin = `${proto}://${host}`;
    const referer = typeof req.headers.referer === 'string' ? req.headers.referer : '';
    const back = referer.startsWith(origin) ? referer : `${origin}${returnTo.startsWith('/') ? returnTo : '/'}`;
    try {
      await supabaseAdmin.from('events').insert([{
        event: 'oauth_inapp_blocked',
        page: new URL(back).pathname,
        client_id: req.cookies?.sm_cid || null,
        meta: { ua: ua.slice(0, 300), return: returnTo },
      }]);
    } catch {}
    return res.redirect(`/open-in-browser?u=${encodeURIComponent(back)}`);
  }

  const isPreviewOrLocal = host.endsWith('.vercel.app') || host.startsWith('localhost');

  if (isPreviewOrLocal) {
    const supaUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
    // returnTo는 localStorage에 저장해서 callback에서 읽음 (query string 빼서 Supabase 화이트리스트 정확히 매칭)
    const redirectTo = `${proto}://${host}/auth/callback`;
    if (returnTo && returnTo !== '/') {
      // returnTo는 일단 query로 전달하되 callback에서 다른 경로로 처리 가능
    }
    return res.redirect(
      `${supaUrl}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(redirectTo)}`
    );
  }

  // Production — our own domain is a registered Google redirect_uri.
  const redirectUri = `${proto}://${host}/api/auth/google/callback`;
  const role = req.query.role === 'hr' ? 'hr' : '';
  const state = role ? JSON.stringify({ return: returnTo, role }) : returnTo;

  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'online',
    prompt: 'select_account',
    state,
  });

  // 콜드메일 랜딩(/ktc/claim 등)은 수신자 이메일을 안다 → 구글 계정 선택 화면을 건너뛴다.
  // login_hint 가 있으면 select_account 를 빼야 실제로 건너뛰어진다(가입 마찰 한 단계 제거).
  const loginHint = typeof req.query.login_hint === 'string' ? req.query.login_hint : '';
  if (loginHint) {
    params.set('login_hint', loginHint);
    params.delete('prompt');
  }

  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
}
