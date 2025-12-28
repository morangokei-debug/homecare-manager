import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentOrganization } from '@/lib/organization';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const org = await getCurrentOrganization();
  if (!org) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
  }

  const { id } = await params;
  
  const facility = await prisma.facility.findUnique({
    where: { id },
    include: {
      patients: {
        where: { isActive: true },
        select: { id: true, name: true },
      },
    },
  });

  if (!facility) {
    return NextResponse.json({ error: 'Facility not found' }, { status: 404 });
  }

  // super_admin以外は自分の組織のデータのみアクセス可能
  if (!org.isSuperAdmin && facility.organizationId !== org.organizationId) {
    return NextResponse.json({ error: 'アクセス権限がありません' }, { status: 403 });
  }

  return NextResponse.json(facility);
}




