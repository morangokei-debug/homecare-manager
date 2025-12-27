import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentOrganization } from '@/lib/organization';
import bcrypt from 'bcryptjs';

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
      users: {
        where: { role: 'admin' },
        select: {
          id: true,
          email: true,
          name: true,
        },
        take: 1,
      },
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

// 会社作成（super_adminのみ）+ 代表ユーザー作成
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
    const { name, code, phone, address, adminEmail, adminName, adminPassword } = body;

    if (!name || !code) {
      return NextResponse.json({ error: '会社名と会社コードは必須です' }, { status: 400 });
    }

    if (!adminEmail || !adminPassword) {
      return NextResponse.json({ error: '代表者のメールアドレスとパスワードは必須です' }, { status: 400 });
    }

    if (adminPassword.length < 6) {
      return NextResponse.json({ error: 'パスワードは6文字以上で入力してください' }, { status: 400 });
    }

    // コードの重複チェック
    const existingOrg = await prisma.organization.findUnique({
      where: { code },
    });

    if (existingOrg) {
      return NextResponse.json({ error: 'この会社コードは既に使用されています' }, { status: 400 });
    }

    // メールの重複チェック
    const existingUser = await prisma.user.findUnique({
      where: { email: adminEmail },
    });

    if (existingUser) {
      return NextResponse.json({ error: 'このメールアドレスは既に使用されています' }, { status: 400 });
    }

    // トランザクションで会社と代表ユーザーを同時作成
    const result = await prisma.$transaction(async (tx) => {
      // 会社作成
      const organization = await tx.organization.create({
        data: {
          name,
          code,
          phone: phone || null,
          address: address || null,
        },
      });

      // 代表ユーザー作成
      const passwordHash = await bcrypt.hash(adminPassword, 10);
      const adminUser = await tx.user.create({
        data: {
          email: adminEmail,
          passwordHash,
          name: adminName || `${name} 管理者`,
          role: 'admin',
          organizationId: organization.id,
          isActive: true,
        },
      });

      return { organization, adminUser };
    });

    return NextResponse.json({
      ...result.organization,
      adminUser: {
        id: result.adminUser.id,
        email: result.adminUser.email,
        name: result.adminUser.name,
      },
    });
  } catch (error) {
    console.error('Failed to create organization:', error);
    return NextResponse.json({ error: '会社の作成に失敗しました' }, { status: 500 });
  }
}

