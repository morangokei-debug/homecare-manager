import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const start = searchParams.get('start');
  const end = searchParams.get('end');

  const events = await prisma.event.findMany({
    where: {
      date: {
        gte: start ? new Date(start) : undefined,
        lte: end ? new Date(end) : undefined,
      },
    },
    include: {
      patient: {
        include: { facility: true },
      },
      assignee: {
        select: { id: true, name: true },
      },
    },
    orderBy: [{ date: 'asc' }, { time: 'asc' }],
  });

  const formattedEvents = events.map((event) => ({
    id: event.id,
    type: event.type,
    date: event.date.toISOString().split('T')[0],
    time: event.time ? event.time.toISOString().split('T')[1].slice(0, 5) : null,
    patientId: event.patientId,
    patientName: event.patient.name,
    facilityName: event.patient.facility?.name || null,
    displayMode: event.patient.facility?.displayMode || 'individual',
    assigneeId: event.assignedTo,
    assigneeName: event.assignee?.name || null,
    notes: event.memo,
    isCompleted: event.isCompleted,
  }));

  return NextResponse.json(formattedEvents);
}
