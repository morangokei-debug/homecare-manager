import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentOrganization } from '@/lib/organization';

export async function GET() {
  const org = await getCurrentOrganization();
  if (!org) return NextResponse.json({ error: '認証が必要です' }, { status: 401 });

  const where = org.isSuperAdmin ? {} : { organizationId: org.organizationId! };
  const careManagers = await prisma.careManager.findMany({
    where: { ...where, isActive: true },
    orderBy: { name: 'asc' },
  });
  return NextResponse.json(careManagers);
}

export async function POST(request: Request) {
  const org = await getCurrentOrganization();
  if (!org) return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
  if (!org.organizationId) return NextResponse.json({ error: '組織に所属していません' }, { status: 403 });
  if (org.role === 'viewer') return NextResponse.json({ error: '権限がありません' }, { status: 403 });

  const body = await request.json();
  const { name, officeName, phone, memo } = body;
  if (!name) {
    return NextResponse.json({ error: 'ケアマネージャー名は必須です' }, { status: 400 });
  }

  const careManager = await prisma.careManager.create({
    data: {
      organizationId: org.organizationId,
      name,
      officeName: officeName || null,
      phone: phone || null,
      memo: memo || null,
    },
  });
  return NextResponse.json(careManager);
}
