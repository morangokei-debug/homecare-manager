import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const settings = await prisma.reminderSetting.findUnique({
      where: { userId: session.user.id },
    });

    if (!settings) {
      return NextResponse.json({
        visitEnabled: true,
        visitTimings: ['day_before_18', 'same_day_9'],
        rxEnabled: true,
        rxTimings: ['day_before_18'],
      });
    }

    return NextResponse.json({
      visitEnabled: settings.visitEnabled,
      visitTimings: settings.visitTimings as string[],
      rxEnabled: settings.rxEnabled,
      rxTimings: settings.rxTimings as string[],
    });
  } catch (error) {
    console.error('Failed to fetch reminder settings:', error);
    return NextResponse.json({
      visitEnabled: true,
      visitTimings: ['day_before_18', 'same_day_9'],
      rxEnabled: true,
      rxTimings: ['day_before_18'],
    });
  }
}

export async function PUT(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { visitEnabled, visitTimings, rxEnabled, rxTimings } = await request.json();

    await prisma.reminderSetting.upsert({
      where: { userId: session.user.id },
      update: {
        visitEnabled,
        visitTimings,
        rxEnabled,
        rxTimings,
      },
      create: {
        userId: session.user.id,
        visitEnabled,
        visitTimings,
        rxEnabled,
        rxTimings,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to save reminder settings:', error);
    return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 });
  }
}




