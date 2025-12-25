import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

// 自分のパスワード変更
export async function PUT(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { currentPassword, newPassword } = await request.json();

    // 現在のユーザーを取得
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user) {
      return NextResponse.json({ message: 'ユーザーが見つかりません' }, { status: 404 });
    }

    // 現在のパスワードを確認
    const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValid) {
      return NextResponse.json({ message: '現在のパスワードが正しくありません' }, { status: 400 });
    }

    // 新しいパスワードをハッシュ化
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // パスワードを更新
    await prisma.user.update({
      where: { id: session.user.id },
      data: { passwordHash: hashedPassword },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to change password:', error);
    return NextResponse.json({ message: 'パスワードの変更に失敗しました' }, { status: 500 });
  }
}

