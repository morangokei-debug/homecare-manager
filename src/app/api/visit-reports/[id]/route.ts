import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentOrganization } from '@/lib/organization';

async function loadReportWithAuth(id: string) {
  const org = await getCurrentOrganization();
  if (!org) return { error: NextResponse.json({ error: '認証が必要です' }, { status: 401 }) };

  const report = await prisma.visitReport.findUnique({
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
  if (!report) {
    return { error: NextResponse.json({ error: '報告書が見つかりません' }, { status: 404 }) };
  }
  if (!org.isSuperAdmin && report.organizationId !== org.organizationId) {
    return { error: NextResponse.json({ error: 'アクセス権限がありません' }, { status: 403 }) };
  }
  return { report, org };
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const result = await loadReportWithAuth(id);
  if ('error' in result) return result.error;
  return NextResponse.json(result.report);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const result = await loadReportWithAuth(id);
  if ('error' in result) return result.error;
  if (result.org.role === 'viewer') {
    return NextResponse.json({ error: '権限がありません' }, { status: 403 });
  }

  const body = await request.json();
  const updated = await prisma.visitReport.update({
    where: { id },
    data: {
      visitDate: body.visitDate ? new Date(body.visitDate) : undefined,
      prescribingClinic: body.prescribingClinic ?? undefined,
      prescribingDoctor: body.prescribingDoctor ?? undefined,
      generalCondition: body.generalCondition ?? undefined,
      medicationStatus: body.medicationStatus ?? undefined,
      sideEffects: body.sideEffects ?? undefined,
      treatmentEffect: body.treatmentEffect ?? undefined,
      understandingLevel: body.understandingLevel ?? undefined,
      livingConditions: body.livingConditions ?? undefined,
      guidanceContent: body.guidanceContent ?? undefined,
      reportToDoctor: body.reportToDoctor ?? undefined,
      nextVisitPlan: body.nextVisitPlan ?? undefined,
      specialNotes: body.specialNotes ?? undefined,
    },
  });
  return NextResponse.json(updated);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const result = await loadReportWithAuth(id);
  if ('error' in result) return result.error;
  if (result.org.role === 'viewer') {
    return NextResponse.json({ error: '権限がありません' }, { status: 403 });
  }

  await prisma.visitReport.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
