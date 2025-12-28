import { NextResponse } from 'next/server';
import { getCurrentOrganization } from '@/lib/organization';
import { prisma } from '@/lib/prisma';

// プロフィール更新
export async function PUT(request: Request) {
  const org = await getCurrentOrganization();

  if (!org) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
  }

  try {
    const { name } = await request.json();

    if (!name || name.trim().length === 0) {
      return NextResponse.json({ error: '名前を入力してください' }, { status: 400 });
    }

    // 自分のプロフィールを更新
    await prisma.user.update({
      where: { id: org.userId },
      data: { name: name.trim() },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to update profile:', error);
    return NextResponse.json({ error: 'プロフィールの更新に失敗しました' }, { status: 500 });
  }
}

