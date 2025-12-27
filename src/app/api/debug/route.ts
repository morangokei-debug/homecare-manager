import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { getToken } from 'next-auth/jwt';
import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  // セッショントークンの確認
  const token = await getToken({ 
    req: request, 
    secret: process.env.NEXTAUTH_SECRET 
  });
  
  console.log('JWT Token:', token);
  try {
    // 1. データベース接続テスト
    const userCount = await prisma.user.count();
    
    // 2. ユーザー検索
    const user = await prisma.user.findUnique({
      where: { email: 'admin@homecare.local' },
      select: {
        id: true,
        email: true,
        name: true,
        isActive: true,
        passwordHash: true,
      }
    });

    if (!user) {
      return NextResponse.json({
        status: 'error',
        message: 'User not found',
        userCount,
      });
    }

    // 3. パスワード検証テスト
    const isValid = await bcrypt.compare('admin123', user.passwordHash);

    return NextResponse.json({
      status: 'ok',
      sessionToken: token ? { id: token.id, email: token.email, role: token.role } : null,
      userCount,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        isActive: user.isActive,
        passwordHashPrefix: user.passwordHash.substring(0, 20),
      },
      passwordTest: isValid,
      env: {
        hasDbUrl: !!process.env.DATABASE_URL,
        hasSecret: !!process.env.NEXTAUTH_SECRET,
        nextauthUrl: process.env.NEXTAUTH_URL,
      }
    });
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

