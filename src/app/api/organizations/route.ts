import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentOrganization } from '@/lib/organization';

// 会社一覧取得（super_adminのみ）
export async function GET() {
  const org = await getCurrentOrganization();
  if (!org) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
  }

  if (!org.isSuperAdmin) {
    return NextResponse.json({ error: '権限がありません' }, { status: 403 });
  }

  const organizations = await prisma.organization.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      _count: {
        select: {
          users: true,
          patients: true,
          facilities: true,
        },
      },
    },
  });

  return NextResponse.json(organizations);
}

// 会社作成（super_adminのみ）
export async function POST(request: Request) {
  const org = await getCurrentOrganization();
  if (!org) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
  }

  if (!org.isSuperAdmin) {
    return NextResponse.json({ error: '権限がありません' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { name, code, phone, address } = body;

    if (!name || !code) {
      return NextResponse.json({ error: '会社名と会社コードは必須です' }, { status: 400 });
    }

    // コードの重複チェック
    const existing = await prisma.organization.findUnique({
      where: { code },
    });

    if (existing) {
      return NextResponse.json({ error: 'この会社コードは既に使用されています' }, { status: 400 });
    }

    const organization = await prisma.organization.create({
      data: {
        name,
        code,
        phone: phone || null,
        address: address || null,
      },
    });

    return NextResponse.json(organization);
  } catch (error) {
    console.error('Failed to create organization:', error);
    return NextResponse.json({ error: '会社の作成に失敗しました' }, { status: 500 });
  }
}

