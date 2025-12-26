import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import crypto from 'crypto';

// トークン生成（64文字のランダム文字列）
function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// GET: 現在のトークンを取得
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const icsToken = await prisma.icsToken.findUnique({
    where: { userId: session.user.id },
  });

  return NextResponse.json({
    token: icsToken?.token || null,
    isActive: icsToken?.isActive ?? false,
    createdAt: icsToken?.createdAt || null,
  });
}

// POST: 新規トークンを発行（または再発行）
export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const newToken = generateToken();

  // 既存のトークンを削除して新規作成（upsert）
  const icsToken = await prisma.icsToken.upsert({
    where: { userId: session.user.id },
    update: {
      token: newToken,
      isActive: true,
      updatedAt: new Date(),
    },
    create: {
      userId: session.user.id,
      token: newToken,
      isActive: true,
    },
  });

  return NextResponse.json({
    token: icsToken.token,
    isActive: icsToken.isActive,
    createdAt: icsToken.createdAt,
  });
}

// DELETE: トークンを無効化
export async function DELETE() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await prisma.icsToken.updateMany({
    where: { userId: session.user.id },
    data: { isActive: false },
  });

  return NextResponse.json({ success: true });
}

