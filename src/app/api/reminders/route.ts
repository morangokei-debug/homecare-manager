import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { addDays, startOfDay, endOfDay, subDays } from 'date-fns';

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // 今後7日間のイベントを取得してリマインドとして表示
    const startDate = subDays(new Date(), 1);
    const endDate = addDays(new Date(), 7);

    const events = await prisma.event.findMany({
      where: {
        createdBy: session.user.id,
        date: {
          gte: startOfDay(startDate),
          lte: endOfDay(endDate),
        },
      },
      include: {
        patient: {
          include: { facility: true },
        },
        facility: true,
      },
      orderBy: { date: 'asc' },
    });

    // リマインドを作成（実際のリマインドテーブルがない場合の代替）
    const reminders = await prisma.reminder.findMany({
      where: {
        userId: session.user.id,
        scheduledAt: {
          gte: startOfDay(startDate),
          lte: endOfDay(endDate),
        },
      },
      include: {
        event: {
          include: {
            patient: {
              include: { facility: true },
            },
          },
        },
      },
      orderBy: { scheduledAt: 'asc' },
    });

    // 既存のリマインドがない場合は、イベントからリマインドを生成
    if (reminders.length === 0 && events.length > 0) {
      const generatedReminders = events.map((event) => {
        // 名前を決定（患者または施設）
        const targetName = event.patient?.name || event.facility?.name || '不明';
        
        return {
          id: `generated-${event.id}`,
          eventId: event.id,
          scheduledAt: event.date.toISOString(),
          message: event.type === 'visit'
            ? `明日 ${targetName} さんの訪問予定があります`
            : `明日 ${targetName} さんの処方予定があります`,
          isRead: false,
          event: {
            id: event.id,
            type: event.type,
            date: event.date.toISOString().split('T')[0],
            time: event.time ? event.time.toISOString().split('T')[1].slice(0, 5) : null,
            patient: event.patient ? {
              name: event.patient.name,
              facility: event.patient.facility,
            } : null,
            facility: event.facility,
          },
        };
      });
      return NextResponse.json(generatedReminders);
    }

    const formattedReminders = reminders.map((r) => ({
      id: r.id,
      eventId: r.eventId,
      scheduledAt: r.scheduledAt.toISOString(),
      message: r.message,
      isRead: r.isRead,
      event: {
        id: r.event.id,
        type: r.event.type,
        date: r.event.date.toISOString().split('T')[0],
        time: r.event.time ? r.event.time.toISOString().split('T')[1].slice(0, 5) : null,
        patient: r.event.patient ? {
          name: r.event.patient.name,
          facility: r.event.patient.facility,
        } : null,
      },
    }));

    return NextResponse.json(formattedReminders);
  } catch (error) {
    console.error('Failed to fetch reminders:', error);
    return NextResponse.json([]);
  }
}


