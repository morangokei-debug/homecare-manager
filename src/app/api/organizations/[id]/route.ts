import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentOrganization } from '@/lib/organization';

// 会社詳細取得
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const org = await getCurrentOrganization();
  if (!org) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
  }

  if (!org.isSuperAdmin) {
    return NextResponse.json({ error: '権限がありません' }, { status: 403 });
  }

  const { id } = await params;

  const organization = await prisma.organization.findUnique({
    where: { id },
    include: {
      users: {
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isActive: true,
        },
      },
      _count: {
        select: {
          patients: true,
          facilities: true,
        },
      },
    },
  });

  if (!organization) {
    return NextResponse.json({ error: '会社が見つかりません' }, { status: 404 });
  }

  return NextResponse.json(organization);
}

// 会社更新
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const org = await getCurrentOrganization();
  if (!org) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
  }

  if (!org.isSuperAdmin) {
    return NextResponse.json({ error: '権限がありません' }, { status: 403 });
  }

  const { id } = await params;

  try {
    const body = await request.json();
    const { name, code, phone, address, isActive } = body;

    if (!name || !code) {
      return NextResponse.json({ error: '会社名と会社コードは必須です' }, { status: 400 });
    }

    // コードの重複チェック（自分以外）
    const existing = await prisma.organization.findFirst({
      where: { code, NOT: { id } },
    });

    if (existing) {
      return NextResponse.json({ error: 'この会社コードは既に使用されています' }, { status: 400 });
    }

    const organization = await prisma.organization.update({
      where: { id },
      data: {
        name,
        code,
        phone: phone || null,
        address: address || null,
        isActive: isActive ?? true,
      },
    });

    return NextResponse.json(organization);
  } catch (error) {
    console.error('Failed to update organization:', error);
    return NextResponse.json({ error: '会社の更新に失敗しました' }, { status: 500 });
  }
}

// 会社削除（論理削除）
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const org = await getCurrentOrganization();
  if (!org) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
  }

  if (!org.isSuperAdmin) {
    return NextResponse.json({ error: '権限がありません' }, { status: 403 });
  }

  const { id } = await params;

  try {
    await prisma.organization.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete organization:', error);
    return NextResponse.json({ error: '会社の削除に失敗しました' }, { status: 500 });
  }
}

