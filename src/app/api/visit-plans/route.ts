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

  const where: Record<string, unknown> = {};
  if (!org.isSuperAdmin) {
    where.organizationId = org.organizationId;
  }
  if (patientId) {
    where.patientId = patientId;
  }

  const plans = await prisma.visitPlan.findMany({
    where,
    orderBy: { planMonth: 'desc' },
    include: {
      creator: { select: { name: true } },
      patient: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(plans);
}

export async function POST(request: Request) {
  const org = await getCurrentOrganization();
  if (!org) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
  }
  if (!org.organizationId) {
    return NextResponse.json({ error: '組織に所属していません' }, { status: 403 });
  }
  if (org.role === 'viewer') {
    return NextResponse.json({ error: '権限がありません' }, { status: 403 });
  }

  const body = await request.json();
  const { patientId, planMonth, periodStart, periodEnd, ...fields } = body;

  if (!patientId || !planMonth || !periodStart || !periodEnd) {
    return NextResponse.json(
      { error: '患者・対象月・期間は必須です' },
      { status: 400 }
    );
  }

  const patient = await prisma.patient.findUnique({
    where: { id: patientId },
    select: { organizationId: true },
  });
  if (!patient) {
    return NextResponse.json({ error: '患者が見つかりません' }, { status: 404 });
  }
  if (!org.isSuperAdmin && patient.organizationId !== org.organizationId) {
    return NextResponse.json({ error: 'アクセス権限がありません' }, { status: 403 });
  }

  // 同月の計画書が既にある場合はエラー
  const existing = await prisma.visitPlan.findUnique({
    where: { patientId_planMonth: { patientId, planMonth } },
  });
  if (existing) {
    return NextResponse.json(
      { error: `${planMonth}月の計画書は既に作成済みです` },
      { status: 409 }
    );
  }

  const plan = await prisma.visitPlan.create({
    data: {
      organizationId: patient.organizationId,
      patientId,
      planMonth,
      periodStart: new Date(periodStart),
      periodEnd: new Date(periodEnd),
      visitFrequency: fields.visitFrequency || null,
      issuesAndGoals: fields.issuesAndGoals || null,
      guidanceDetails: fields.guidanceDetails || null,
      considerations: fields.considerations || null,
      prescribingClinic: fields.prescribingClinic || null,
      prescribingDoctor: fields.prescribingDoctor || null,
      createdBy: org.userId!,
    },
  });

  return NextResponse.json(plan);
}
