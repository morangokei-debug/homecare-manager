import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentOrganization } from '@/lib/organization';

export async function GET() {
  const org = await getCurrentOrganization();
  if (!org) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
  }

  // 組織フィルタ（super_adminは全て、それ以外は自分の組織のみ）
  const organizationFilter = org.isSuperAdmin
    ? {}
    : { organizationId: org.organizationId };

  const facilities = await prisma.facility.findMany({
    where: { 
      isActive: true,
      ...organizationFilter,
    },
    include: {
      _count: {
        select: { patients: { where: { isActive: true } } },
      },
    },
    orderBy: { name: 'asc' },
  });

  return NextResponse.json(facilities);
}




