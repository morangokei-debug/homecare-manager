import { NextResponse } from 'next/server';
import { getCurrentOrganization } from '@/lib/organization';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
  const org = await getCurrentOrganization();

  if (!org) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // admin または super_admin のみユーザー作成可能
  if (org.role !== 'admin' && !org.isSuperAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // super_admin は組織に紐付けられないので、直接ユーザー作成は不可
  if (org.isSuperAdmin) {
    return NextResponse.json(
      { message: 'システム管理者は会社管理画面からユーザーを追加してください' },
      { status: 400 }
    );
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
    if (password.length < 6) {
      return NextResponse.json(
        { message: 'パスワードは6文字以上で設定してください' },
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

    // ユーザー作成（自組織に紐付け）
    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash: hashedPassword,
        role: role || 'staff',
        organizationId: org.organizationId!,
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
