import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentOrganization } from '@/lib/organization';

// ユーザー削除（無効化）
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  const org = await getCurrentOrganization();
  if (!org) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
  }

  const { id: organizationId, userId } = await params;

  // super_admin または 同じ組織のadmin のみ
  if (!org.isSuperAdmin && org.organizationId !== organizationId) {
    return NextResponse.json({ error: '権限がありません' }, { status: 403 });
  }

  if (!org.isSuperAdmin && org.role !== 'admin') {
    return NextResponse.json({ error: '管理者権限が必要です' }, { status: 403 });
  }

  try {
    // ユーザーの存在確認と組織チェック
    const user = await prisma.user.findFirst({
      where: {
        id: userId,
        organizationId,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'ユーザーが見つかりません' }, { status: 404 });
    }

    // 自分自身は削除できない
    if (user.id === org.userId) {
      return NextResponse.json({ error: '自分自身は削除できません' }, { status: 400 });
    }

    // 論理削除
    await prisma.user.update({
      where: { id: userId },
      data: { isActive: false },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete user:', error);
    return NextResponse.json({ error: 'ユーザーの削除に失敗しました' }, { status: 500 });
  }
}


