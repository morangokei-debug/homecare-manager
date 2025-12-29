import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentOrganization } from '@/lib/organization';

export async function GET(request: Request) {
  const org = await getCurrentOrganization();
  if (!org) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const start = searchParams.get('start');
  const end = searchParams.get('end');

  // 組織フィルタ: super_adminは全て、それ以外は自組織のみ
  const organizationFilter = org.isSuperAdmin
    ? {}
    : {
        OR: [
          { patient: { organizationId: org.organizationId } },
          { facility: { organizationId: org.organizationId } },
        ],
      };

  const events = await prisma.event.findMany({
    where: {
      date: {
        gte: start ? new Date(start) : undefined,
        lte: end ? new Date(end) : undefined,
      },
      ...organizationFilter,
    },
    include: {
      patient: {
        include: { facility: true },
      },
      facility: true,
      assignee: {
        select: { id: true, name: true },
      },
    },
    orderBy: [{ date: 'asc' }, { time: 'asc' }],
  });

  const formattedEvents = events.map((event) => {
    // 施設全体の訪問の場合
    const isFacilityEvent = event.facilityId && !event.patientId;
    
    return {
      id: event.id,
      type: event.type,
      date: event.date.toISOString().split('T')[0],
      time: event.time ? event.time.toISOString().split('T')[1].slice(0, 5) : null,
      patientId: event.patientId,
      patientName: isFacilityEvent 
        ? event.facility?.name || '施設'
        : event.patient?.name || '',
      facilityId: event.facilityId,
      facilityName: isFacilityEvent
        ? event.facility?.name || null
        : event.patient?.facility?.name || null,
      displayMode: isFacilityEvent
        ? 'grouped'
        : event.patient?.facility?.displayMode || 'individual',
      isFacilityEvent,
      // 訪問時注意事項（患者のvisitNotes）
      visitNotes: event.patient?.visitNotes || null,
      assigneeId: event.assignedTo,
      assigneeName: event.assignee?.name || null,
      notes: event.memo,
      status: event.status,
      isCompleted: event.isCompleted,
      isRecurring: event.isRecurring,
      recurringInterval: event.recurringInterval,
      reportDone: event.reportDone,
      planDone: event.planDone,
    };
  });

  return NextResponse.json(formattedEvents);
}
