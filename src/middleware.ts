import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;

  // 認証不要なパス
  const publicPaths = [
    '/login',
    '/api/auth',
  ];

  // ICSエンドポイントはトークン認証なので除外
  const icsPath = pathname.startsWith('/api/calendar/') && pathname.endsWith('.ics');
  
  // 公開パスかチェック
  const isPublicPath = publicPaths.some(path => pathname.startsWith(path)) || icsPath;

  // ログインしていない場合
  if (!isLoggedIn && !isPublicPath) {
    // APIリクエストの場合は401を返す
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    // ページリクエストの場合はログインページにリダイレクト
    return NextResponse.redirect(new URL('/login', req.url));
  }

  // ログイン済みでログインページにアクセスした場合はカレンダーにリダイレクト
  if (isLoggedIn && pathname === '/login') {
    return NextResponse.redirect(new URL('/calendar', req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};

