import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentOrganization } from '@/lib/organization';

export async function GET(request: Request) {
  const org = await getCurrentOrganization();
  if (!org) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const includeFacility = searchParams.get('includeFacility') === 'true';

  // 組織フィルタ
  const organizationFilter = org.isSuperAdmin
    ? {}
    : { organizationId: org.organizationId };

  const patients = await prisma.patient.findMany({
    where: { 
      isActive: true,
      ...organizationFilter,
    },
    orderBy: { nameKana: 'asc' },
    select: {
      id: true,
      name: true,
      facilityId: true,
      visitNotes: true,
      facility: includeFacility ? {
        select: {
          id: true,
          name: true,
        },
      } : false,
    },
  });

  return NextResponse.json(patients);
}
