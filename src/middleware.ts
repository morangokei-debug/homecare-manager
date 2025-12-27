import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 認証不要なパス
  const publicPaths = ['/login', '/api/auth'];
  
  // ICSエンドポイントはトークン認証なので除外
  const icsPath = pathname.startsWith('/api/calendar/') && pathname.endsWith('.ics');
  
  // 公開パスかチェック
  const isPublicPath = publicPaths.some(path => pathname.startsWith(path)) || icsPath;

  if (isPublicPath) {
    return NextResponse.next();
  }

  // JWTトークンをチェック（軽量）
  const token = await getToken({ 
    req: request,
    secret: process.env.NEXTAUTH_SECRET 
  });

  // ログインしていない場合
  if (!token) {
    // APIリクエストの場合は401を返す
    if (pathname.startsWith('/api/')) {
      return new NextResponse(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }
    // ページリクエストの場合はログインページにリダイレクト
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // ログイン済みでログインページにアクセスした場合
  if (pathname === '/login') {
    return NextResponse.redirect(new URL('/calendar', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};

