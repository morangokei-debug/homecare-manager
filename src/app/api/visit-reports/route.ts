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

  const reports = await prisma.visitReport.findMany({
    where,
    orderBy: { visitDate: 'desc' },
    include: {
      creator: { select: { name: true } },
      patient: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(reports);
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
  const { patientId, eventId, visitDate, ...fields } = body;

  if (!patientId || !visitDate) {
    return NextResponse.json(
      { error: '患者と訪問日は必須です' },
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

  const report = await prisma.visitReport.create({
    data: {
      organizationId: patient.organizationId,
      patientId,
      eventId: eventId || null,
      visitDate: new Date(visitDate),
      prescribingClinic: fields.prescribingClinic || null,
      prescribingDoctor: fields.prescribingDoctor || null,
      generalCondition: fields.generalCondition || null,
      medicationStatus: fields.medicationStatus || null,
      sideEffects: fields.sideEffects || null,
      treatmentEffect: fields.treatmentEffect || null,
      understandingLevel: fields.understandingLevel || null,
      livingConditions: fields.livingConditions || null,
      guidanceContent: fields.guidanceContent || null,
      reportToDoctor: fields.reportToDoctor || null,
      nextVisitPlan: fields.nextVisitPlan || null,
      specialNotes: fields.specialNotes || null,
      createdBy: org.userId!,
    },
  });

  // 紐づくイベントがあれば reportDone を true にする
  if (eventId) {
    await prisma.event.update({
      where: { id: eventId },
      data: { reportDone: true },
    });
  }

  return NextResponse.json(report);
}
