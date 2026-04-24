import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentOrganization } from '@/lib/organization';

// 指定患者の「直近の報告書」を返す（前回コピー用）
export async function GET(request: Request) {
  const org = await getCurrentOrganization();
  if (!org) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const patientId = searchParams.get('patientId');
  const excludeId = searchParams.get('excludeId');

  if (!patientId) {
    return NextResponse.json({ error: 'patientIdが必要です' }, { status: 400 });
  }

  const where: Record<string, unknown> = { patientId };
  if (!org.isSuperAdmin) {
    where.organizationId = org.organizationId;
  }
  if (excludeId) {
    where.NOT = { id: excludeId };
  }

  const report = await prisma.visitReport.findFirst({
    where,
    orderBy: { visitDate: 'desc' },
  });

  return NextResponse.json(report);
}
