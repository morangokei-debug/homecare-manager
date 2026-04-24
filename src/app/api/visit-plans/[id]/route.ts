import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentOrganization } from '@/lib/organization';

async function loadPlanWithAuth(id: string) {
  const org = await getCurrentOrganization();
  if (!org) return { error: NextResponse.json({ error: '認証が必要です' }, { status: 401 }) };

  const plan = await prisma.visitPlan.findUnique({
    where: { id },
    include: {
      creator: { select: { name: true } },
      patient: {
        select: {
          id: true,
          name: true,
          nameKana: true,
          organizationId: true,
          facility: { select: { name: true } },
        },
      },
    },
  });
  if (!plan) {
    return { error: NextResponse.json({ error: '計画書が見つかりません' }, { status: 404 }) };
  }
  if (!org.isSuperAdmin && plan.organizationId !== org.organizationId) {
    return { error: NextResponse.json({ error: 'アクセス権限がありません' }, { status: 403 }) };
  }
  return { plan, org };
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const result = await loadPlanWithAuth(id);
  if ('error' in result) return result.error;
  return NextResponse.json(result.plan);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const result = await loadPlanWithAuth(id);
  if ('error' in result) return result.error;
  if (result.org.role === 'viewer') {
    return NextResponse.json({ error: '権限がありません' }, { status: 403 });
  }

  const body = await request.json();
  const updated = await prisma.visitPlan.update({
    where: { id },
    data: {
      planMonth: body.planMonth ?? undefined,
      periodStart: body.periodStart ? new Date(body.periodStart) : undefined,
      periodEnd: body.periodEnd ? new Date(body.periodEnd) : undefined,
      visitFrequency: body.visitFrequency ?? undefined,
      issuesAndGoals: body.issuesAndGoals ?? undefined,
      guidanceDetails: body.guidanceDetails ?? undefined,
      considerations: body.considerations ?? undefined,
      prescribingClinic: body.prescribingClinic ?? undefined,
      prescribingDoctor: body.prescribingDoctor ?? undefined,
    },
  });
  return NextResponse.json(updated);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const result = await loadPlanWithAuth(id);
  if ('error' in result) return result.error;
  if (result.org.role === 'viewer') {
    return NextResponse.json({ error: '権限がありません' }, { status: 403 });
  }

  await prisma.visitPlan.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
