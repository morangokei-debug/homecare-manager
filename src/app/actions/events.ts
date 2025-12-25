'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function createEvent(formData: FormData) {
  try {
    const type = formData.get('type') as string;
    const date = formData.get('date') as string;
    const startTime = formData.get('startTime') as string;
    const endTime = formData.get('endTime') as string;
    const patientId = formData.get('patientId') as string;
    const assigneeId = formData.get('assigneeId') as string;
    const notes = formData.get('notes') as string;

    await prisma.event.create({
      data: {
        type,
        date: new Date(date),
        startTime: startTime || null,
        endTime: endTime || null,
        patientId,
        assigneeId: assigneeId && assigneeId !== 'none' ? assigneeId : null,
        notes: notes || null,
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
    const startTime = formData.get('startTime') as string;
    const endTime = formData.get('endTime') as string;
    const patientId = formData.get('patientId') as string;
    const assigneeId = formData.get('assigneeId') as string;
    const notes = formData.get('notes') as string;
    const isCompleted = formData.get('isCompleted') === 'true';

    await prisma.event.update({
      where: { id },
      data: {
        type,
        date: new Date(date),
        startTime: startTime || null,
        endTime: endTime || null,
        patientId,
        assigneeId: assigneeId && assigneeId !== 'none' ? assigneeId : null,
        notes: notes || null,
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

