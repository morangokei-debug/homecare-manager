'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth';

export async function createEvent(formData: FormData) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: 'ログインが必要です' };
    }

    const type = formData.get('type') as string;
    const date = formData.get('date') as string;
    const time = formData.get('time') as string;
    const patientId = formData.get('patientId') as string;
    const assigneeId = formData.get('assigneeId') as string;
    const notes = formData.get('notes') as string;

    // 時刻を適切な形式に変換（空の場合はnull）
    let timeValue = null;
    if (time) {
      // PostgreSQLのTIME型に合わせてDateオブジェクトを作成
      timeValue = new Date(`1970-01-01T${time}:00.000Z`);
    }

    await prisma.event.create({
      data: {
        type: type as 'visit' | 'prescription',
        date: new Date(date),
        time: timeValue,
        patientId,
        assignedTo: assigneeId && assigneeId !== 'none' ? assigneeId : null,
        memo: notes || null,
        createdBy: session.user.id,
        isCompleted: false,
      },
    });

    revalidatePath('/calendar');
    return { success: true };
  } catch (error) {
    console.error('Failed to create event:', error);
    return { success: false, error: 'イベントの登録に失敗しました' };
  }
}

export async function updateEvent(formData: FormData) {
  try {
    const id = formData.get('id') as string;
    const type = formData.get('type') as string;
    const date = formData.get('date') as string;
    const time = formData.get('time') as string;
    const patientId = formData.get('patientId') as string;
    const assigneeId = formData.get('assigneeId') as string;
    const notes = formData.get('notes') as string;
    const isCompleted = formData.get('isCompleted') === 'true';

    // 時刻を適切な形式に変換（空の場合はnull）
    let timeValue = null;
    if (time) {
      timeValue = new Date(`1970-01-01T${time}:00.000Z`);
    }

    await prisma.event.update({
      where: { id },
      data: {
        type: type as 'visit' | 'prescription',
        date: new Date(date),
        time: timeValue,
        patientId,
        assignedTo: assigneeId && assigneeId !== 'none' ? assigneeId : null,
        memo: notes || null,
        isCompleted,
      },
    });

    revalidatePath('/calendar');
    return { success: true };
  } catch (error) {
    console.error('Failed to update event:', error);
    return { success: false, error: 'イベントの更新に失敗しました' };
  }
}

export async function deleteEvent(id: string) {
  try {
    await prisma.event.delete({
      where: { id },
    });

    revalidatePath('/calendar');
    return { success: true };
  } catch (error) {
    console.error('Failed to delete event:', error);
    return { success: false, error: 'イベントの削除に失敗しました' };
  }
}
