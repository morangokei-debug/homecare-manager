import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentOrganization } from '@/lib/organization';
import { startOfMonth, endOfMonth } from 'date-fns';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const org = await getCurrentOrganization();
  if (!org) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
  }

  if (!org.isSuperAdmin) {
    return NextResponse.json({ error: '権限がありません' }, { status: 403 });
  }

  const { id } = await params;
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  try {
    // 患者ID・施設ID取得と4つのcountを並列実行
    const [patients, facilities] = await Promise.all([
      prisma.patient.findMany({ where: { organizationId: id }, select: { id: true } }),
      prisma.facility.findMany({ where: { organizationId: id }, select: { id: true } }),
    ]);
    const patientIds = patients.map((p) => p.id);
    const facilityIds = facilities.map((f) => f.id);

    const orgFilter = {
      OR: [
        { patientId: { in: patientIds } },
        { facilityId: { in: facilityIds } },
      ],
    };

    const [totalEvents, thisMonthEvents, upcomingVisits, upcomingPrescriptions] =
      await Promise.all([
        prisma.event.count({ where: orgFilter }),
        prisma.event.count({ where: { date: { gte: monthStart, lte: monthEnd }, ...orgFilter } }),
        prisma.event.count({ where: { type: 'visit', date: { gte: now }, ...orgFilter } }),
        prisma.event.count({ where: { type: 'prescription', date: { gte: now }, ...orgFilter } }),
      ]);

    return NextResponse.json({ totalEvents, thisMonthEvents, upcomingVisits, upcomingPrescriptions });
  } catch (error) {
    console.error('Failed to fetch organization stats:', error);
    return NextResponse.json({ error: '統計情報の取得に失敗しました' }, { status: 500 });
  }
}



