'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function createFacility(formData: FormData) {
  try {
    const name = formData.get('name') as string;
    const phone = formData.get('phone') as string | null;
    const address = formData.get('address') as string | null;
    const area = formData.get('area') as string | null;
    const notes = formData.get('notes') as string | null;

    await prisma.facility.create({
      data: {
        name,
        phone: phone || null,
        address: address || null,
        area: area || null,
        notes: notes || null,
      },
    });

    revalidatePath('/facilities');
    return { success: true };
  } catch (error) {
    console.error('Failed to create facility:', error);
    return { success: false, error: '施設の登録に失敗しました' };
  }
}

export async function updateFacility(formData: FormData) {
  try {
    const id = formData.get('id') as string;
    const name = formData.get('name') as string;
    const phone = formData.get('phone') as string | null;
    const address = formData.get('address') as string | null;
    const area = formData.get('area') as string | null;
    const notes = formData.get('notes') as string | null;

    await prisma.facility.update({
      where: { id },
      data: {
        name,
        phone: phone || null,
        address: address || null,
        area: area || null,
        notes: notes || null,
      },
    });

    revalidatePath('/facilities');
    return { success: true };
  } catch (error) {
    console.error('Failed to update facility:', error);
    return { success: false, error: '施設の更新に失敗しました' };
  }
}

export async function deleteFacility(id: string) {
  try {
    // 論理削除
    await prisma.facility.update({
      where: { id },
      data: { isActive: false },
    });

    // 所属患者の施設IDをクリア
    await prisma.patient.updateMany({
      where: { facilityId: id },
      data: { facilityId: null },
    });

    revalidatePath('/facilities');
    return { success: true };
  } catch (error) {
    console.error('Failed to delete facility:', error);
    return { success: false, error: '施設の削除に失敗しました' };
  }
}

