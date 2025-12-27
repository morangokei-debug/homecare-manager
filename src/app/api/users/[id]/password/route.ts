import { NextResponse } from 'next/server';
import { getCurrentOrganization } from '@/lib/organization';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

// 管理者によるパスワードリセット
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const org = await getCurrentOrganization();
  const { id } = await params;

  if (!org) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // admin または super_admin のみ
  if (org.role !== 'admin' && !org.isSuperAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const newPassword = body.newPassword || body.password;

    // パスワードの最小長チェック
    if (!newPassword || newPassword.length < 6) {
      return NextResponse.json(
        { error: 'パスワードは6文字以上で設定してください' },
        { status: 400 }
      );
    }

    // 対象ユーザーを確認
    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      return NextResponse.json({ error: 'ユーザーが見つかりません' }, { status: 404 });
    }

    // super_admin でない場合、同じ組織のユーザーのみリセット可能
    if (!org.isSuperAdmin && user.organizationId !== org.organizationId) {
      return NextResponse.json({ error: '権限がありません' }, { status: 403 });
    }

    // 新しいパスワードをハッシュ化
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // パスワードを更新
    await prisma.user.update({
      where: { id },
      data: { passwordHash: hashedPassword },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to reset password:', error);
    return NextResponse.json({ error: 'パスワードのリセットに失敗しました' }, { status: 500 });
  }
}
