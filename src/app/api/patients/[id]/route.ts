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
  
  const patient = await prisma.patient.findUnique({
    where: { id },
    include: { 
      facility: true,
      summary: {
        include: {
          recentChangesUpdater: {
            select: { name: true },
          },
          updater: {
            select: { name: true },
          },
        },
      },
    },
  });

  if (!patient) {
    return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
  }

  // super_admin以外は自分の組織のデータのみアクセス可能
  if (!org.isSuperAdmin && patient.organizationId !== org.organizationId) {
    return NextResponse.json({ error: 'アクセス権限がありません' }, { status: 403 });
  }

  return NextResponse.json(patient);
}

