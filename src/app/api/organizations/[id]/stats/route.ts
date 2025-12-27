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
    // この組織の患者IDを取得
    const patients = await prisma.patient.findMany({
      where: { organizationId: id },
      select: { id: true },
    });
    const patientIds = patients.map(p => p.id);

    // この組織の施設IDを取得
    const facilities = await prisma.facility.findMany({
      where: { organizationId: id },
      select: { id: true },
    });
    const facilityIds = facilities.map(f => f.id);

    // 総イベント数
    const totalEvents = await prisma.event.count({
      where: {
        OR: [
          { patientId: { in: patientIds } },
          { facilityId: { in: facilityIds } },
        ],
      },
    });

    // 今月のイベント数
    const thisMonthEvents = await prisma.event.count({
      where: {
        date: {
          gte: monthStart,
          lte: monthEnd,
        },
        OR: [
          { patientId: { in: patientIds } },
          { facilityId: { in: facilityIds } },
        ],
      },
    });

    // 今後の訪問予定
    const upcomingVisits = await prisma.event.count({
      where: {
        type: 'visit',
        date: { gte: now },
        OR: [
          { patientId: { in: patientIds } },
          { facilityId: { in: facilityIds } },
        ],
      },
    });

    // 今後の処方予定
    const upcomingPrescriptions = await prisma.event.count({
      where: {
        type: 'prescription',
        date: { gte: now },
        OR: [
          { patientId: { in: patientIds } },
          { facilityId: { in: facilityIds } },
        ],
      },
    });

    return NextResponse.json({
      totalEvents,
      thisMonthEvents,
      upcomingVisits,
      upcomingPrescriptions,
    });
  } catch (error) {
    console.error('Failed to fetch organization stats:', error);
    return NextResponse.json({ error: '統計情報の取得に失敗しました' }, { status: 500 });
  }
}

