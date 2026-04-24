import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentOrganization } from '@/lib/organization';

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

  const plan = await prisma.visitPlan.findFirst({
    where,
    orderBy: { planMonth: 'desc' },
  });

  return NextResponse.json(plan);
}
