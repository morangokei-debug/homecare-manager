import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentOrganization } from '@/lib/organization';

export async function GET() {
  const org = await getCurrentOrganization();
  if (!org) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
  }

  // 組織フィルタ
  const organizationFilter = org.isSuperAdmin
    ? {}
    : { organizationId: org.organizationId };

  const facilities = await prisma.facility.findMany({
    where: { 
      isActive: true,
      ...organizationFilter,
    },
    orderBy: { name: 'asc' },
  });

  return NextResponse.json(facilities);
}
