'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { requireOrganization } from '@/lib/organization';

export async function createEvent(formData: FormData) {
  try {
    const org = await requireOrganization();

    // super_adminは直接イベント作成不可
    if (org.isSuperAdmin) {
      return { success: false, error: 'システム管理者は直接イベントを登録できません' };
    }

    const type = formData.get('type') as string;
    const date = formData.get('date') as string;
    const time = formData.get('time') as string;
    const patientId = formData.get('patientId') as string;
    const facilityId = formData.get('facilityId') as string;
    const assigneeId = formData.get('assigneeId') as string;
    const notes = formData.get('notes') as string;
    const isRecurring = formData.get('isRecurring') === 'true';
    const recurringInterval = formData.get('recurringInterval') as string;
    const reportDone = formData.get('reportDone') === 'true';
    const planDone = formData.get('planDone') === 'true';

    // 患者か施設のどちらかが必須
    if (!patientId && !facilityId) {
      return { success: false, error: '患者または施設を選択してください' };
    }

    // 患者の組織チェック
    if (patientId) {
      const patient = await prisma.patient.findFirst({
        where: { id: patientId, organizationId: org.organizationId },
      });
      if (!patient) {
        return { success: false, error: '患者が見つかりません' };
      }
    }

    // 施設の組織チェック
    if (facilityId) {
      const facility = await prisma.facility.findFirst({
        where: { id: facilityId, organizationId: org.organizationId },
      });
      if (!facility) {
        return { success: false, error: '施設が見つかりません' };
      }
    }

    // 時刻を適切な形式に変換（空の場合はnull）
    let timeValue = null;
    if (time) {
      timeValue = new Date(`1970-01-01T${time}:00.000Z`);
    }

    await prisma.event.create({
      data: {
        type: type as 'visit' | 'prescription' | 'both',
        date: new Date(date),
        time: timeValue,
        patientId: patientId || null,
        facilityId: facilityId || null,
        assignedTo: assigneeId && assigneeId !== 'none' ? assigneeId : null,
        memo: notes || null,
        status: 'confirmed',
        createdBy: org.userId,
        isCompleted: false,
        isRecurring,
        recurringInterval: recurringInterval ? parseInt(recurringInterval) : null,
        reportDone,
        planDone,
      },
    });

    revalidatePath('/calendar');
    revalidatePath('/events');
    return { success: true };
  } catch (error) {
    console.error('Failed to create event:', error);
    return { success: false, error: 'イベントの登録に失敗しました' };
  }
}

export async function updateEvent(formData: FormData) {
  try {
    const org = await requireOrganization();

    const id = formData.get('id') as string;
    const type = formData.get('type') as string;
    const date = formData.get('date') as string;
    const time = formData.get('time') as string;
    const patientId = formData.get('patientId') as string;
    const facilityId = formData.get('facilityId') as string;
    const assigneeId = formData.get('assigneeId') as string;
    const notes = formData.get('notes') as string;
    const isCompleted = formData.get('isCompleted') === 'true';
    const isRecurring = formData.get('isRecurring') === 'true';
    const recurringInterval = formData.get('recurringInterval') as string;
    const reportDone = formData.get('reportDone') === 'true';
    const planDone = formData.get('planDone') === 'true';

    // 患者か施設のどちらかが必須
    if (!patientId && !facilityId) {
      return { success: false, error: '患者または施設を選択してください' };
    }

    // イベントの組織チェック（患者または施設経由）
    if (!org.isSuperAdmin) {
      const event = await prisma.event.findFirst({
        where: { id },
        include: { patient: true, facility: true },
      });
      if (!event) {
        return { success: false, error: 'イベントが見つかりません' };
      }
      const eventOrgId = event.patient?.organizationId || event.facility?.organizationId;
      if (eventOrgId !== org.organizationId) {
        return { success: false, error: 'このイベントを編集する権限がありません' };
      }
    }

    // 時刻を適切な形式に変換（空の場合はnull）
    let timeValue = null;
    if (time) {
      timeValue = new Date(`1970-01-01T${time}:00.000Z`);
    }

    await prisma.event.update({
      where: { id },
      data: {
        type: type as 'visit' | 'prescription' | 'both',
        date: new Date(date),
        time: timeValue,
        patientId: patientId || null,
        facilityId: facilityId || null,
        assignedTo: assigneeId && assigneeId !== 'none' ? assigneeId : null,
        memo: notes || null,
        status: 'confirmed',
        isCompleted,
        isRecurring,
        recurringInterval: recurringInterval ? parseInt(recurringInterval) : null,
        reportDone,
        planDone,
      },
    });

    revalidatePath('/calendar');
    revalidatePath('/events');
    return { success: true };
  } catch (error) {
    console.error('Failed to update event:', error);
    return { success: false, error: 'イベントの更新に失敗しました' };
  }
}

export async function deleteEvent(id: string) {
  try {
    const org = await requireOrganization();

    // イベントの組織チェック（患者または施設経由）
    if (!org.isSuperAdmin) {
      const event = await prisma.event.findFirst({
        where: { id },
        include: { patient: true, facility: true },
      });
      if (!event) {
        return { success: false, error: 'イベントが見つかりません' };
      }
      const eventOrgId = event.patient?.organizationId || event.facility?.organizationId;
      if (eventOrgId !== org.organizationId) {
        return { success: false, error: 'このイベントを削除する権限がありません' };
      }
    }

    await prisma.event.delete({
      where: { id },
    });

    revalidatePath('/calendar');
    revalidatePath('/events');
    return { success: true };
  } catch (error) {
    console.error('Failed to delete event:', error);
    return { success: false, error: 'イベントの削除に失敗しました' };
  }
}

// 一括確定
export async function confirmEvents(eventIds: string[]) {
  try {
    const org = await requireOrganization();

    // super_adminは全て、それ以外は自組織のみ
    if (!org.isSuperAdmin) {
      // 組織チェック
      const events = await prisma.event.findMany({
        where: { id: { in: eventIds } },
        include: { patient: true, facility: true },
      });
      
      for (const event of events) {
        const eventOrgId = event.patient?.organizationId || event.facility?.organizationId;
        if (eventOrgId !== org.organizationId) {
          return { success: false, error: '権限のないイベントが含まれています' };
        }
      }
    }

    await prisma.event.updateMany({
      where: { id: { in: eventIds } },
      data: { status: 'confirmed' },
    });

    revalidatePath('/calendar');
    revalidatePath('/events');
    return { success: true };
  } catch (error) {
    console.error('Failed to confirm events:', error);
    return { success: false, error: '確定に失敗しました' };
  }
}
