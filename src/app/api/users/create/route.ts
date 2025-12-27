import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
  const session = await auth();

  if (!session || session.user?.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { name, email, password, role } = await request.json();

    // 入力バリデーション
    if (!name || !email || !password) {
      return NextResponse.json(
        { message: '名前、メールアドレス、パスワードは必須です' },
        { status: 400 }
      );
    }

    // パスワードの最小長チェック
    if (password.length < 8) {
      return NextResponse.json(
        { message: 'パスワードは8文字以上で設定してください' },
        { status: 400 }
      );
    }

    // 既存ユーザーのチェック
    const existing = await prisma.user.findUnique({
      where: { email },
    });

    if (existing) {
      return NextResponse.json(
        { message: 'このメールアドレスは既に使用されています' },
        { status: 400 }
      );
    }

    // パスワードをハッシュ化
    const hashedPassword = await bcrypt.hash(password, 12);

    // ユーザー作成
    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash: hashedPassword,
        role: role || 'staff',
      },
    });

    return NextResponse.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    });
  } catch (error) {
    console.error('Failed to create user:', error);
    return NextResponse.json(
      { message: 'ユーザーの作成に失敗しました' },
      { status: 500 }
    );
  }
}

