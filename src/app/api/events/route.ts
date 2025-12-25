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
    orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
  });

  const formattedEvents = events.map((event) => ({
    id: event.id,
    type: event.type,
    date: event.date.toISOString().split('T')[0],
    startTime: event.startTime,
    endTime: event.endTime,
    patientId: event.patientId,
    patientName: event.patient.name,
    facilityName: event.patient.facility?.name || null,
    displayMode: event.patient.displayMode,
    assigneeId: event.assigneeId,
    assigneeName: event.assignee?.name || null,
    notes: event.notes,
    isCompleted: event.isCompleted,
  }));

  return NextResponse.json(formattedEvents);
}

